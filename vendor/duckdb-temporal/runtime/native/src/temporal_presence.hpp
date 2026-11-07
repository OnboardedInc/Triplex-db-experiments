// SPDX-License-Identifier: MIT
#pragma once
#include <cstdint>
#include <string>

namespace td::presence {

inline std::string activation_hash_sql(const std::string &schema) {
    return "sha256(to_json(struct_pack(kind:='td.schema.presence.activate/1',name:="+schema+
        ".name,version:="+schema+".version,schema_hash:="+schema+".content_hash)))";
}
inline std::string activation_id_sql(const std::string &hash) {
    return "'td.schema.presence.activate/1:'||"+hash;
}
inline std::string activation_receipt_sql(const std::string &schema,const std::string &position) {
    return "CAST(to_json(struct_pack(kind:='td.schema.presence.activate/1',name:="+schema+
        ".name,version:="+schema+".version,schema_hash:="+schema+".content_hash,position:="+position+")) AS VARCHAR)";
}

// Legacy declarations predating the type reservation table remain
// authoritative. The primary key also serializes concurrent first mentions.
inline std::string reserve_type_modes_sql(const std::string &quoted_schema,int64_t version) {
    const auto incoming="SELECT schema_name,entity_type,is_live FROM td_catalog_v1.schema_type_declarations WHERE schema_name="+
        quoted_schema+" AND version="+std::to_string(version);
    const std::string immutable="'TD_E_SCHEMA_PRESENCE: an entity type cannot change its presence policy'";
    return "INSERT INTO td_catalog_v1.schema_type_modes AS stored "
        "SELECT d.schema_name,d.entity_type,CASE WHEN EXISTS(SELECT 1 FROM td_catalog_v1.schema_type_declarations prior "
        "WHERE prior.schema_name=d.schema_name AND prior.entity_type=d.entity_type AND prior.is_live IS DISTINCT FROM d.is_live) "
        "OR (d.is_live AND EXISTS(SELECT 1 FROM td_catalog_v1.entity_owners o "
        "WHERE o.schema_name=d.schema_name AND o.entity_type=d.entity_type) "
        "AND NOT EXISTS(SELECT 1 FROM td_catalog_v1.schema_type_modes m WHERE m.schema_name=d.schema_name "
        "AND m.entity_type=d.entity_type AND m.is_live)) THEN error("+immutable+") ELSE d.is_live END FROM ("+incoming+") d "
        "ON CONFLICT(schema_name,entity_type) DO UPDATE SET is_live=CASE WHEN stored.is_live IS NULL "
        "OR stored.is_live=excluded.is_live THEN excluded.is_live ELSE error("+immutable+") END;";
}

inline std::string edit_metadata_sql(const std::string &alias,const std::string &operation) {
    return "to_json(struct_pack(operation:="+operation+",valid_from:="+alias+".valid_from,valid_to:="+alias+".valid_to))";
}

// Preserve the existing batch member receipt shape. Managed edits are a
// separate canonical list, in the same stable member order.
inline std::string batch_edit_sql(const std::string &member) {
    return "struct_pack(entity_id:="+member+".entity_id,entity_type:="+member+".entity_type,operation:="+
        member+".operation,valid_from:="+member+".valid_from,valid_to:="+member+".valid_to)";
}

// Run once in the private audited snapshot. A surviving assertion must not
// cross an edit which would have closed it. Carried bounds and their exact
// source linkage are independently checked by the canonical history view.
inline std::string audit_sql() {
    const auto hash=activation_hash_sql("s");
    return R"TD_PRESENCE(
WITH tracked_commands AS MATERIALIZED (
 SELECT n.* FROM td_catalog_v1.entity_commands n JOIN td_catalog_v1.schema_type_modes m
 USING(schema_name,entity_type) WHERE m.is_live
), tracked_batches AS MATERIALIZED (
 SELECT b.command_id,list()TD_PRESENCE"+batch_edit_sql("m")+R"TD_PRESENCE( ORDER BY m.ordinal) edits
 FROM td_catalog_v1.entity_batch_members m JOIN td_catalog_v1.entity_batches b USING(command_id)
 JOIN td_catalog_v1.schema_type_modes t ON t.schema_name=b.schema_name AND t.entity_type=m.entity_type
 WHERE t.is_live GROUP BY b.command_id
), tracked_assertions AS MATERIALIZED (
 SELECT a.e,a.valid_from,a.valid_to,a.tx_from,a.tx_to,a.corrected_by
 FROM main.assertions a JOIN td_catalog_v1.entity_owners o ON a.e=o.entity_id
 JOIN td_catalog_v1.schema_type_modes m ON m.schema_name=o.schema_name AND m.entity_type=o.entity_type
 WHERE m.is_live
)
SELECT CASE WHEN EXISTS(
 SELECT 1 FROM td_catalog_v1.schema_type_modes GROUP BY schema_name,entity_type HAVING count(*)<>1
) OR EXISTS(
 SELECT 1 FROM td_catalog_v1.schema_type_declarations d LEFT JOIN td_catalog_v1.schema_type_modes m
 USING(schema_name,entity_type) WHERE d.is_live IS DISTINCT FROM coalesce(m.is_live,FALSE)
) OR EXISTS(
 SELECT 1 FROM td_catalog_v1.schema_type_modes m WHERE NOT EXISTS(
  SELECT 1 FROM td_catalog_v1.schema_type_declarations d WHERE d.schema_name=m.schema_name AND d.entity_type=m.entity_type)
) THEN error('TD_E_OWNER_AUDIT_PRESENCE: invalid entity type presence policy')
 WHEN EXISTS(
  SELECT 1 FROM td_catalog_v1.schema_presence_activations p
  JOIN td_catalog_v1.schemas s ON s.name=p.schema_name AND s.version=p.schema_version
  LEFT JOIN main.commands c ON c.command_id=p.command_id
  LEFT JOIN td_catalog_v1.schema_unique_activations u ON u.schema_name=p.schema_name AND u.schema_version=p.schema_version
  WHERE c.position IS NULL OR c.position<=0 OR c.position>(SELECT position FROM main.clock WHERE singleton)
   OR c.origin IS DISTINCT FROM 'triplex' OR c.transaction_id IS DISTINCT FROM c.command_id
   OR EXISTS(SELECT 1 FROM td_catalog_v1.entity_commands n WHERE n.command_id=p.command_id)
   OR EXISTS(SELECT 1 FROM td_catalog_v1.entity_batches b WHERE b.command_id=p.command_id)
   OR CASE WHEN u.command_id IS NOT NULL THEN u.command_id IS DISTINCT FROM p.command_id
      ELSE c.request_hash IS DISTINCT FROM )TD_PRESENCE"+hash+
        " OR c.command_id IS DISTINCT FROM ("+activation_id_sql(hash)+") "+
        "OR c.receipt IS DISTINCT FROM "+activation_receipt_sql("s","c.position")+R"TD_PRESENCE( END
 ) OR EXISTS(
  SELECT 1 FROM main.commands c WHERE starts_with(c.command_id,'td.schema.presence.activate/1:')
   AND json_extract_string(TRY_CAST(c.receipt AS JSON),'$.kind')='td.schema.presence.activate/1'
   AND NOT EXISTS(SELECT 1 FROM td_catalog_v1.schema_presence_activations p WHERE p.command_id=c.command_id)
 ) THEN error('TD_E_OWNER_AUDIT_PRESENCE: invalid presence activation receipt')
 WHEN EXISTS(
  SELECT 1 FROM td_catalog_v1.entity_presence_edits GROUP BY command_id HAVING count(*)<>1
 ) OR EXISTS(
  SELECT 1 FROM tracked_commands n FULL OUTER JOIN td_catalog_v1.entity_presence_edits e USING(command_id)
  LEFT JOIN main.commands c ON c.command_id=n.command_id
  LEFT JOIN td_catalog_v1.schemas s ON s.name=n.schema_name AND s.version=n.schema_version
  LEFT JOIN td_catalog_v1.entity_owners o ON o.entity_id=n.entity_id
  LEFT JOIN td_catalog_v1.entity_patch_commands patch ON patch.command_id=n.command_id
  LEFT JOIN td_catalog_v1.schema_presence_activations p ON p.schema_name=n.schema_name AND p.schema_version=n.schema_version
  LEFT JOIN main.commands activation ON activation.command_id=p.command_id
  WHERE n.command_id IS NULL OR e.command_id IS NULL OR e.entity_id IS DISTINCT FROM n.entity_id
    OR (activation.position<n.position AND n.position<=(SELECT position FROM main.clock WHERE singleton)) IS NOT TRUE
    OR s.content_hash IS DISTINCT FROM n.schema_hash OR c.request_hash IS NULL
    OR c.position IS DISTINCT FROM n.position OR c.origin IS DISTINCT FROM 'triplex'
    OR o.schema_name IS DISTINCT FROM n.schema_name OR o.entity_type IS DISTINCT FROM n.entity_type
    OR NOT EXISTS(SELECT 1 FROM td_catalog_v1.schema_type_declarations d WHERE d.schema_name=n.schema_name
       AND d.version=n.schema_version AND d.entity_type=n.entity_type AND d.is_live)
    OR (e.valid_from<e.valid_to AND ((e.operation='put' AND patch.command_id IS NULL)
       OR (e.operation='patch' AND e.valid_from=patch.valid_from AND e.valid_to=patch.valid_to))) IS NOT TRUE
    OR json_extract(TRY_CAST(c.receipt AS JSON),'$.presence') IS DISTINCT FROM )TD_PRESENCE"+
        edit_metadata_sql("e","e.operation")+R"TD_PRESENCE(
 ) OR EXISTS(
  SELECT 1 FROM td_catalog_v1.entity_owners o JOIN td_catalog_v1.schema_type_modes m USING(schema_name,entity_type)
  WHERE m.is_live AND NOT EXISTS(SELECT 1 FROM td_catalog_v1.entity_presence_events e WHERE e.entity_id=o.entity_id)
 ) THEN error('TD_E_OWNER_AUDIT_PRESENCE: retained presence edit binding is missing or invalid')
 WHEN EXISTS(
  SELECT 1 FROM td_catalog_v1.entity_batches b JOIN main.commands c USING(command_id)
  LEFT JOIN tracked_batches tracked ON tracked.command_id=b.command_id
  LEFT JOIN td_catalog_v1.schema_presence_activations p ON p.schema_name=b.schema_name AND p.schema_version=b.schema_version
  LEFT JOIN main.commands activation ON activation.command_id=p.command_id
  WHERE (tracked.command_id IS NOT NULL
    AND (activation.position<c.position AND c.position<=(SELECT position FROM main.clock WHERE singleton)) IS NOT TRUE)
    OR json_extract(TRY_CAST(c.receipt AS JSON),'$.presence') IS DISTINCT FROM
       CASE WHEN tracked.command_id IS NOT NULL THEN to_json(tracked.edits) END
 ) THEN error('TD_E_OWNER_AUDIT_PRESENCE: retained batch presence binding is missing or invalid')
 WHEN EXISTS(
  SELECT 1 FROM tracked_assertions a JOIN td_catalog_v1.entity_presence_events e ON e.entity_id=a.e
  WHERE a.tx_from<e.position AND e.position<a.tx_to
   AND (e.operation='put' OR (e.valid_from<a.valid_to AND a.valid_from<e.valid_to))
 ) OR EXISTS(
  SELECT 1 FROM tracked_assertions a
  LEFT JOIN td_catalog_v1.entity_presence_events e ON e.command_id=a.corrected_by AND e.entity_id=a.e
  WHERE a.tx_from>=a.tx_to OR (a.tx_to=9223372036854775807 AND a.corrected_by IS NOT NULL)
   OR (a.tx_to<9223372036854775807 AND
   (e.position=a.tx_to AND (e.operation='put' OR (e.valid_from<a.valid_to AND a.valid_from<e.valid_to))) IS NOT TRUE)
 ) THEN error('TD_E_OWNER_AUDIT_PRESENCE: assertion survived or closed outside its presence edit')
 ELSE 1 END::BIGINT
)TD_PRESENCE";
}
}

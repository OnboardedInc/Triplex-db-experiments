// SPDX-License-Identifier: MIT
#pragma once
#include <string>

namespace td::uniqueness {

inline std::string activation_hash_sql(const std::string &schema) {
    return "sha256(to_json(struct_pack(kind:='td.schema.unique.activate/1',name:="+schema+
        ".name,version:="+schema+".version,schema_hash:="+schema+".content_hash)))";
}

inline std::string activation_id_sql(const std::string &request_hash) {
    return "'td.schema.unique.activate/1:'||"+request_hash;
}

inline std::string activation_receipt_sql(const std::string &schema,const std::string &position) {
    return "CAST(to_json(struct_pack(kind:='td.schema.unique.activate/1',name:="+schema+
        ".name,version:="+schema+".version,schema_hash:="+schema+".content_hash,position:="+position+")) AS VARCHAR)";
}

// Exact typed carriers, including byte equality for text/JSON and blob ID
// equality independently of the rest of the blob descriptor.
inline std::string same_value_sql(const std::string &left,const std::string &right) {
    std::string sql=left+".a="+right+".a AND "+left+".v_tag="+right+".v_tag";
    for(const auto *slot:{"v_s","v_b","v_i","v_f"})
        sql+=" AND "+left+'.'+slot+" IS NOT DISTINCT FROM "+right+'.'+slot;
    return sql;
}

// All proposed assertions begin at the new knowledge cut and stay live.
// Exclude every assertion the transaction closes, including other members
// of an atomic batch. Carries and replacements both enter as new values.
inline std::string write_conflict_sql(const std::string &pending,const std::string &closing,const std::string &position) {
    // The catalog relation is empty outside uniqueness-capable formats. The CASE also
    // prevents a non-unique format from interpreting the subquery result.
    return "CASE WHEN (SELECT version FROM main.store_meta) IN(10,11) THEN "
        "EXISTS (WITH proposed AS MATERIALIZED (SELECT p.* FROM ("+pending+") p "
        "SEMI JOIN td_catalog_v1.unique_domains d ON p.schema_name=d.schema_name AND p.entity_type=d.entity_type "
        "AND p.a=d.attribute AND p.v_tag=d.value_tag AND d.enforced_from<="+position+") "
        "SELECT 1 FROM proposed l JOIN proposed r ON l.schema_name=r.schema_name AND l.entity_type=r.entity_type "
        "AND l.e<r.e AND "+same_value_sql("l","r")+" AND l.valid_from<r.valid_to AND r.valid_from<l.valid_to "
        "UNION ALL SELECT 1 FROM proposed l JOIN td_catalog_v1.entity_owners o ON o.schema_name=l.schema_name "
        "AND o.entity_type=l.entity_type AND o.entity_id<>l.e JOIN main.assertions r ON r.e=o.entity_id "
        "AND "+same_value_sql("l","r")+" AND l.valid_from<r.valid_to AND r.valid_from<l.valid_to "
        "WHERE r.valid_from<r.valid_to AND r.tx_from<r.tx_to AND r.tx_to>"+position+
        " AND NOT EXISTS(SELECT 1 FROM "+closing+" closed WHERE closed.assertion_id=r.assertion_id)) ELSE FALSE END";
}

// Both transaction intervals must survive the enforcement cut, intersect one
// another, and intersect in valid time. Before first activation, also check
// the immediately preceding current cut for newly declared domains.
inline std::string history_conflict_sql(const std::string &activation = {}) {
    const auto enforcement=activation.empty()?"d.enforced_from":"d.enforced_from-1";
    const auto scope=activation.empty()?std::string():
        " AND d.enforced_from=(SELECT position FROM "+activation+" WHERE fresh)";
    return "EXISTS (WITH constrained AS MATERIALIZED (SELECT a.e,a.a,a.v_tag,a.v_s,a.v_b,a.v_i,a.v_f,"
        "a.valid_from,a.valid_to,a.tx_from,a.tx_to,d.schema_name,d.entity_type "
        "FROM td_catalog_v1.unique_domains d JOIN td_catalog_v1.entity_owners o USING(schema_name,entity_type) "
        "JOIN main.assertions a ON a.e=o.entity_id AND a.a=d.attribute AND a.v_tag=d.value_tag "
        "WHERE a.valid_from<a.valid_to AND a.tx_from<a.tx_to AND a.tx_to>"+std::string(enforcement)+scope+") "
        "SELECT 1 FROM constrained l JOIN constrained r ON l.schema_name=r.schema_name AND l.entity_type=r.entity_type "
        "AND l.e<r.e AND "+same_value_sql("l","r")+" AND l.valid_from<r.valid_to AND r.valid_from<l.valid_to "
        "AND l.tx_from<r.tx_to AND r.tx_from<l.tx_to)";
}

inline std::string audit_sql() {
    const auto hash=activation_hash_sql("s");
    return "SELECT CASE WHEN EXISTS(SELECT 1 FROM td_catalog_v1.schema_unique_activations u "
        "JOIN td_catalog_v1.schemas s ON s.name=u.schema_name AND s.version=u.schema_version "
        "LEFT JOIN main.commands c ON c.command_id=u.command_id "
        "WHERE c.position IS NULL OR c.position<=0 OR c.position>(SELECT position FROM main.clock WHERE singleton) "
        "OR c.origin IS DISTINCT FROM 'triplex' OR c.transaction_id IS DISTINCT FROM c.command_id "
        "OR c.request_hash IS DISTINCT FROM "+hash+" OR c.command_id IS DISTINCT FROM ("+activation_id_sql(hash)+") "
        "OR c.receipt IS DISTINCT FROM "+activation_receipt_sql("s","c.position")+
        " OR EXISTS(SELECT 1 FROM td_catalog_v1.entity_commands n WHERE n.command_id=c.command_id) "
        "OR EXISTS(SELECT 1 FROM td_catalog_v1.entity_batches b WHERE b.command_id=c.command_id)) "
        "OR EXISTS(SELECT 1 FROM main.commands c WHERE starts_with(c.command_id,'td.schema.unique.activate/1:') "
        "AND json_extract_string(TRY_CAST(c.receipt AS JSON),'$.kind')='td.schema.unique.activate/1' "
        "AND NOT EXISTS(SELECT 1 FROM td_catalog_v1.schema_unique_activations u WHERE u.command_id=c.command_id)) "
        "THEN error('TD_E_SCHEMA_UNIQUE_AUDIT: invalid uniqueness activation receipt') WHEN "+history_conflict_sql()+
        " THEN error('TD_E_SCHEMA_UNIQUE_AUDIT: unique value overlaps after enforcement') ELSE 1 END::BIGINT";
}

}

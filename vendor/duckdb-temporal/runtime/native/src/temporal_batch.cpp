// SPDX-License-Identifier: MIT
#include "temporal_batch.hpp"
#include "temporal_integrity.hpp"
#include "temporal_presence.hpp"
#include "temporal_sql.hpp"
#include "temporal_uniqueness.hpp"
#include "temporal_value_domain.hpp"

namespace td::batch {
namespace {
void identifier(const std::string &value, size_t limit) {
    detail::validate_typed_text(value);
    if(value.empty() || value.size()>limit)
        throw Error("TD_E_COMMAND_INPUT: batch identifier admission exceeded");
}

std::string migration_sql() {
    // This expansion is used only for an initial batch or its explicit replay.
    // DDL and the later data mutations share the caller's expanded transaction.
    return R"TD_BATCH(
CREATE TEMP TABLE __td_batch_migration AS
 SELECT version,coalesce((SELECT max(revision) FROM td_catalog_v1.catalog_revision),2) revision
 FROM main.store_meta;
DROP TABLE main.store_meta;
CREATE TABLE main.store_meta(version INTEGER PRIMARY KEY CHECK(version IN(5,6,8,9,10,11)));
INSERT INTO main.store_meta SELECT version FROM __td_batch_migration;
DROP TABLE td_catalog_v1.catalog_revision;
CREATE TABLE td_catalog_v1.catalog_revision(
 singleton BOOLEAN PRIMARY KEY CHECK(singleton),revision INTEGER NOT NULL CHECK(revision IN(2,3)));
INSERT INTO td_catalog_v1.catalog_revision SELECT TRUE,revision FROM __td_batch_migration;
DROP TABLE __td_batch_migration;
)TD_BATCH";
}

std::string input_sql(const Request &request) {
    const auto q=sql::literal;
    std::string out="CREATE TEMP TABLE __td_batch_input AS SELECT "+q(request.schema_name)+"::VARCHAR schema_name,"+
        std::to_string(request.schema_version)+"::INTEGER schema_version,"+q(request.command_id)+"::VARCHAR command_id,"+
        q(request.members_json)+"::VARCHAR members_json;";
    out+=R"TD_BATCH(
CREATE TEMP TABLE __td_batch_shape AS SELECT CASE
 WHEN NOT json_valid(members_json) THEN error('TD_E_COMMAND_INPUT: invalid batch JSON')
 WHEN json_type(members_json)<>'ARRAY' OR json_array_length(members_json) NOT BETWEEN 1 AND 32
 THEN error('TD_E_COMMAND_LIMIT: batch requires one to 32 members') ELSE TRUE END ok FROM __td_batch_input;
CREATE TEMP TABLE __td_batch_raw AS SELECT j.value raw,
 json_extract_string(j.value,'$.operation') operation,json_extract_string(j.value,'$.type') entity_type,
 json_extract_string(j.value,'$.entityId') entity_id,json_extract_string(j.value,'$.record') record_text,
 try_cast(json_extract_string(j.value,'$.validFrom') AS BIGINT) valid_from,
 try_cast(json_extract_string(j.value,'$.validTo') AS BIGINT) valid_to
 FROM __td_batch_input,json_each(members_json) j;
CREATE TEMP TABLE __td_batch_member_guard AS SELECT CASE WHEN EXISTS(SELECT 1 FROM __td_batch_raw WHERE (
 json_type(raw)='OBJECT' AND list_sort(json_keys(raw))=['entityId','operation','record','type','validFrom','validTo']
 AND json_type(raw,'$.operation')='VARCHAR' AND operation IN('put','patch')
 AND json_type(raw,'$.type')='VARCHAR' AND octet_length(encode(entity_type)) BETWEEN 1 AND 64
 AND NOT contains(entity_type,chr(0))
 AND json_type(raw,'$.entityId')='VARCHAR' AND octet_length(encode(entity_id)) BETWEEN 1 AND 128
 AND NOT contains(entity_id,chr(0))
 AND json_type(raw,'$.record')='VARCHAR' AND octet_length(encode(record_text)) BETWEEN 1 AND 65536
 AND json_type(raw,'$.validFrom')='VARCHAR' AND json_type(raw,'$.validTo')='VARCHAR'
 AND valid_from IS NOT NULL AND valid_to IS NOT NULL
 AND valid_from::VARCHAR=json_extract_string(raw,'$.validFrom')
 AND valid_to::VARCHAR=json_extract_string(raw,'$.validTo') AND valid_from<valid_to) IS NOT TRUE)
 THEN error('TD_E_COMMAND_INPUT: malformed batch member')
 WHEN (SELECT count(DISTINCT entity_id) FROM __td_batch_raw)<>(SELECT count(*) FROM __td_batch_raw)
 THEN error('TD_E_COMMAND_INPUT: batch entity IDs must be distinct') ELSE TRUE END ok;
CREATE TEMP TABLE __td_batch_plan AS SELECT (row_number() OVER(ORDER BY encode(r.entity_id))-1)::INTEGER member,
 r.operation,r.entity_type,r.entity_id,r.valid_from,r.valid_to,coalesce(t.is_live,FALSE) is_live_type,
 system.main.td_prepare_entity_v2(s.dsl,s.ir,r.entity_type,r.record_text) prepared
 FROM __td_batch_raw r CROSS JOIN __td_batch_input i
 LEFT JOIN td_catalog_v1.schemas s ON s.name=i.schema_name AND s.version=i.schema_version
 LEFT JOIN td_catalog_v1.schema_type_modes t ON t.schema_name=i.schema_name AND t.entity_type=r.entity_type;
CREATE TEMP TABLE __td_batch_ctx AS SELECT i.schema_name,i.schema_version,i.command_id,s.content_hash schema_hash,
 sha256(to_json(struct_pack(kind:='td.entity.batch/1',schema_name:=i.schema_name,
 schema_version:=i.schema_version,schema_hash:=s.content_hash,members:=(SELECT list(struct_pack(
 operation:=operation,entity_type:=entity_type,entity_id:=entity_id,valid_from:=valid_from,valid_to:=valid_to,
 values_ir:=prepared) ORDER BY member) FROM __td_batch_plan)))) request_hash,
 c.request_hash previous_hash,c.command_id IS NOT NULL is_replay,
 CASE WHEN c.command_id IS NOT NULL THEN c.position WHEN k.position>=9223372036854775806
 THEN error('TD_E_COMMAND_LIMIT: commit position exhausted') ELSE k.position+1 END position,
 epoch_ms(current_timestamp)::DOUBLE recorded_at
 FROM __td_batch_input i CROSS JOIN main.clock k
 LEFT JOIN td_catalog_v1.schemas s ON s.name=i.schema_name AND s.version=i.schema_version
 LEFT JOIN main.commands c ON c.command_id=i.command_id WHERE k.singleton;
CREATE TEMP TABLE __td_batch_replay_guard AS SELECT CASE
 WHEN c.is_replay AND (c.previous_hash IS DISTINCT FROM c.request_hash OR NOT EXISTS(
 SELECT 1 FROM td_catalog_v1.entity_batches b WHERE b.command_id=c.command_id))
 THEN error('TD_E_COMMAND_IDEMPOTENCY: command ID is bound to a different request')
 WHEN NOT c.is_replay AND (SELECT coalesce(sum(json_array_length(prepared)),0) FROM __td_batch_plan)>4096
 THEN error('TD_E_COMMAND_LIMIT: batch submitted fact admission exceeded') ELSE TRUE END ok FROM __td_batch_ctx c;
-- Expand projected list vectors without carrying the wide member JSON through
-- a lateral join. Keep each prepared array's original zero-based ordinal.
CREATE TEMP TABLE __td_batch_pending AS
 WITH member_values AS (
  SELECT p.member,p.entity_id,p.entity_type,p.valid_from,p.valid_to,c.command_id,
   json_extract(p.prepared,'$[*]') values_ir
  FROM __td_batch_plan p CROSS JOIN __td_batch_ctx c WHERE NOT c.is_replay
 ), facts AS (
  SELECT member,entity_id,entity_type,valid_from,valid_to,command_id,
   unnest(values_ir) value,generate_subscripts(values_ir,1)-1 ordinal
  FROM member_values
 )
 SELECT p.member,p.ordinal,
 sha256(to_json(struct_pack(kind:='td.entity.batch.value/1',command_id:=p.command_id,
 member:=p.member,ordinal:=p.ordinal))) assertion_id,p.entity_id e,p.entity_type,
 json_extract_string(p.value,'$.a') a,json_extract_string(p.value,'$.tag') tag,
 json_extract_string(p.value,'$.payload') payload,CAST(json_extract(p.value,'$.t') AS UTINYINT) v_tag,
 encode(json_extract_string(p.value,'$.s')) v_s,CAST(json_extract(p.value,'$.b') AS BOOLEAN) v_b,
 CAST(json_extract_string(p.value,'$.i') AS BIGINT) v_i,
 system.main.td_float_from_bits_v1(json_extract_string(p.value,'$.f')) v_f,
 json_extract_string(p.value,'$.extra_json') extra_json,json_extract_string(p.value,'$.reference') reference_type,
 p.valid_from,p.valid_to,
 NULL::VARCHAR source_assertion_id,NULL::VARCHAR validation_command_id,NULL::VARCHAR side
 FROM facts p;
CREATE TEMP TABLE __td_batch_old AS SELECT a.assertion_id,p.member
 FROM main.assertions a JOIN __td_batch_plan p ON p.entity_id=a.e CROSS JOIN __td_batch_ctx c
 WHERE a.tx_to=9223372036854775807 AND NOT c.is_replay
 AND (p.operation='put' OR (a.valid_from<p.valid_to AND a.valid_to>p.valid_from)) LIMIT 4097;
CREATE TEMP TABLE __td_batch_pieces AS SELECT old.member,c.command_id,a.e,a.entity_type,a.a,a.tag,a.payload,
 a.v_tag,a.v_s,a.v_b,a.v_i,a.v_f,a.extra_json,
 CASE WHEN piece.side='left' THEN a.valid_from ELSE p.valid_to END valid_from,
 CASE WHEN piece.side='left' THEN p.valid_from ELSE a.valid_to END valid_to,
 a.assertion_id source_assertion_id,coalesce(s.validation_command_id,a.command_id) validation_command_id,piece.side
 FROM main.assertions a JOIN __td_batch_old old USING(assertion_id) JOIN __td_batch_plan p ON p.member=old.member
 LEFT JOIN td_catalog_v1.entity_assertion_sources s USING(assertion_id)
 CROSS JOIN __td_batch_ctx c CROSS JOIN (VALUES ('left'),('right')) piece(side)
 WHERE p.operation='patch' AND ((piece.side='left' AND a.valid_from<p.valid_from) OR (piece.side='right' AND p.valid_to<a.valid_to));
)TD_BATCH";
    return out;
}

std::string admission_sql(const Request &request) {
    std::string out=R"TD_BATCH(
CREATE TEMP TABLE __td_batch_guard AS SELECT CASE WHEN c.is_replay THEN TRUE
 WHEN EXISTS(SELECT 1 FROM __td_batch_plan p JOIN td_catalog_v1.entity_owners o ON o.entity_id=p.entity_id
   WHERE o.schema_name<>c.schema_name OR o.entity_type<>p.entity_type)
 THEN error('TD_E_COMMAND_OWNERSHIP: batch entity has another schema/type')
 WHEN EXISTS(SELECT 1 FROM main.assertions a JOIN __td_batch_plan p ON p.entity_id=a.e
   WHERE a.tx_to=9223372036854775807 AND NOT EXISTS(SELECT 1 FROM td_catalog_v1.entity_creators n
    WHERE n.command_id=a.command_id AND n.entity_id=a.e AND n.schema_name=c.schema_name AND n.entity_type=p.entity_type))
 THEN error('TD_E_COMMAND_OWNERSHIP: batch entity contains assertions from another API')
 WHEN EXISTS(SELECT 1 FROM __td_batch_pending p WHERE p.reference_type IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM __td_batch_plan target WHERE target.entity_id=decode(p.v_s) AND target.entity_type=p.reference_type)
   AND NOT EXISTS(SELECT 1 FROM td_catalog_v1.entity_identities target WHERE target.entity_id=decode(p.v_s)
    AND target.schema_name=c.schema_name AND target.entity_type=p.reference_type AND target.first_position<=c.position))
 THEN error('TD_E_COMMAND_REFERENCE: batch reference target must be declared in this schema')
 WHEN (SELECT count(*) FROM __td_batch_old)>4096 OR
   (SELECT count(*) FROM __td_batch_pending)+(SELECT count(*) FROM __td_batch_pieces)>8192
 THEN error('TD_E_COMMAND_LIMIT: batch affected or generated assertion admission exceeded')
 WHEN EXISTS(SELECT 1 FROM __td_batch_plan p WHERE
   (SELECT count(*) FROM main.assertions a WHERE a.e=p.entity_id AND a.tx_to=9223372036854775807)
   -(SELECT count(*) FROM __td_batch_old o WHERE o.member=p.member)
   +(SELECT count(*) FROM __td_batch_pending n WHERE n.member=p.member)
   +(SELECT count(*) FROM __td_batch_pieces n WHERE n.member=p.member)>4096)
 THEN error('TD_E_COMMAND_LIMIT: resulting entity assertion admission exceeded')
 WHEN u.retained_count+(SELECT count(*) FROM __td_batch_pending)+(SELECT count(*) FROM __td_batch_pieces)>)TD_BATCH";
    out+=std::to_string(request.max_retained_facts)+R"TD_BATCH( OR u.retained_bytes+
   (SELECT coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+
     coalesce(octet_length(encode(extra_json)),0)),0) FROM __td_batch_pending)+
   (SELECT coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+
     coalesce(octet_length(encode(extra_json)),0)),0) FROM __td_batch_pieces)>)TD_BATCH";
    out+=std::to_string(request.max_retained_bytes)+R"TD_BATCH(
 THEN error('TD_E_COMMAND_LIMIT: batch retained storage admission exceeded')
 WHEN )TD_BATCH";
    out+=td::uniqueness::write_conflict_sql(
        "SELECT p.e,p.a,p.v_tag,p.v_s,p.v_b,p.v_i,p.v_f,p.valid_from,p.valid_to,c.schema_name,p.entity_type "
        "FROM __td_batch_pending p CROSS JOIN __td_batch_ctx c "
        "UNION ALL SELECT p.e,p.a,p.v_tag,p.v_s,p.v_b,p.v_i,p.v_f,p.valid_from,p.valid_to,c.schema_name,p.entity_type "
        "FROM __td_batch_pieces p CROSS JOIN __td_batch_ctx c",
        "__td_batch_old","(SELECT position FROM __td_batch_ctx)");
    out+=R"TD_BATCH(
 THEN error('TD_E_COMMAND_UNIQUE: distinct entities would share a unique value over overlapping intervals')
 ELSE CASE WHEN (SELECT count(*) FROM td_catalog_v1.entity_history h JOIN __td_batch_old o USING(assertion_id))=
   (SELECT count(*) FROM __td_batch_old) THEN TRUE
   ELSE error('TD_E_COMMAND_HISTORY: batch affected assertion binding is missing') END END ok
 FROM __td_batch_ctx c CROSS JOIN main.storage_usage u WHERE u.singleton;
INSERT INTO __td_batch_pending
 SELECT member,4096+row_number() OVER(PARTITION BY member ORDER BY source_assertion_id,side),
 sha256(to_json(struct_pack(kind:='td.entity.batch.fragment/1',command_id:=command_id,entity_id:=e,
 source_assertion_id:=source_assertion_id,side:=side))),e,entity_type,a,tag,payload,v_tag,v_s,v_b,v_i,v_f,extra_json,NULL,
 valid_from,valid_to,source_assertion_id,validation_command_id,side FROM __td_batch_pieces;
)TD_BATCH";
    return out;
}

std::string mutation_sql() {
    return R"TD_BATCH(
INSERT INTO td_catalog_v1.entity_owners SELECT p.entity_id,c.schema_name,p.entity_type
 FROM __td_batch_plan p CROSS JOIN __td_batch_ctx c WHERE NOT c.is_replay ON CONFLICT(entity_id) DO NOTHING;
INSERT INTO main.commands SELECT c.command_id,c.request_hash,c.position,
 CAST(CASE WHEN managed.edits IS NULL THEN receipt.payload
  ELSE json_merge_patch(receipt.payload,to_json(struct_pack(presence:=managed.edits))) END AS VARCHAR),
 c.command_id,c.recorded_at,'triplex'
 FROM __td_batch_ctx c
 CROSS JOIN LATERAL (SELECT to_json(struct_pack(command_id:=c.command_id,position:=c.position,members:=(SELECT list(struct_pack(
  operation:=p.operation,type:=p.entity_type,entityId:=p.entity_id,
  asserted:=coalesce((SELECT list(n.assertion_id ORDER BY n.ordinal) FROM __td_batch_pending n WHERE n.member=p.member),[]::VARCHAR[]),
  retracted:=coalesce((SELECT list(o.assertion_id ORDER BY o.assertion_id) FROM __td_batch_old o WHERE o.member=p.member),[]::VARCHAR[])
 ) ORDER BY p.member) FROM __td_batch_plan p))) payload) receipt
 CROSS JOIN (SELECT list()TD_BATCH"+td::presence::batch_edit_sql("p")+R"TD_BATCH( ORDER BY p.member) edits
  FROM __td_batch_plan p WHERE p.is_live_type) managed
 WHERE NOT c.is_replay;
INSERT INTO td_catalog_v1.entity_batches SELECT c.command_id,c.schema_name,c.schema_version,c.schema_hash,
 (SELECT count(*) FROM __td_batch_plan)::INTEGER FROM __td_batch_ctx c WHERE NOT c.is_replay;
INSERT INTO td_catalog_v1.entity_batch_members SELECT c.command_id,p.entity_id,p.member,p.entity_type,p.operation,p.valid_from,p.valid_to
 FROM __td_batch_plan p CROSS JOIN __td_batch_ctx c WHERE NOT c.is_replay;
INSERT INTO td_catalog_v1.entity_assertion_sources SELECT assertion_id,source_assertion_id,validation_command_id,side
 FROM __td_batch_pending WHERE source_assertion_id IS NOT NULL;
UPDATE main.assertions AS a SET tx_to=c.position,corrected_by=c.command_id,retracted_at=c.recorded_at,retract_transaction_id=c.command_id
 FROM __td_batch_ctx c,__td_batch_old old WHERE a.assertion_id=old.assertion_id;
INSERT INTO main.assertions SELECT p.assertion_id,p.e,p.a,p.tag,p.payload,p.valid_from,p.valid_to,c.position,9223372036854775807,
 c.command_id,NULL,sha256(p.payload),p.v_tag,p.v_s,p.v_b,p.v_i,p.v_f,c.recorded_at,NULL,
 CASE WHEN p.valid_from BETWEEN 0 AND 9007199254740991 THEN p.valid_from::DOUBLE END,
 CASE WHEN p.valid_to BETWEEN 0 AND 9007199254740991 THEN p.valid_to::DOUBLE END,
 NULL,p.entity_type,c.command_id,NULL,p.extra_json,'triplex',
 p.valid_from BETWEEN 0 AND 9007199254740991 AND (p.valid_to=9223372036854775807 OR p.valid_to BETWEEN 0 AND 9007199254740991)
 AND (p.v_tag<>3 OR p.v_i BETWEEN -9007199254740991 AND 9007199254740991)
 FROM __td_batch_pending p CROSS JOIN __td_batch_ctx c;
UPDATE main.storage_usage SET retained_count=retained_count+(SELECT count(*) FROM __td_batch_pending),
 retained_bytes=retained_bytes+(SELECT coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+
   coalesce(octet_length(encode(extra_json)),0)),0) FROM __td_batch_pending) WHERE singleton AND (SELECT NOT is_replay FROM __td_batch_ctx);
UPDATE main.clock SET position=(SELECT position FROM __td_batch_ctx) WHERE singleton AND (SELECT NOT is_replay FROM __td_batch_ctx);
DROP TABLE __td_batch_guard;
DROP TABLE __td_batch_pieces;
DROP TABLE __td_batch_old;
DROP TABLE __td_batch_pending;
DROP TABLE __td_batch_replay_guard;
DROP TABLE __td_batch_ctx;
DROP TABLE __td_batch_plan;
DROP TABLE __td_batch_member_guard;
DROP TABLE __td_batch_raw;
DROP TABLE __td_batch_shape;
DROP TABLE __td_batch_input;
DROP TABLE __td_batch_state;
DROP TABLE __td_batch_format;
)TD_BATCH";
}
}

std::string receipt_sql(const std::string &command_id) {
    identifier(command_id,128);
    return "WITH owner_guard AS MATERIALIZED ("+integrity::owner_check_sql()+") "
        "SELECT CASE WHEN b.command_id IS NULL THEN error('TD_E_COMMAND_KIND: command belongs to another API') "
        "ELSE c.command_id END command_id,c.position,b.schema_name,b.schema_version,b.schema_hash,c.request_hash,"
        "CAST(json_extract(c.receipt,'$.members') AS VARCHAR) members FROM main.commands c "
        "LEFT JOIN td_catalog_v1.entity_batches b USING(command_id) CROSS JOIN owner_guard "
        "WHERE owner_guard.ok AND c.command_id="+sql::literal(command_id)+
        " UNION ALL SELECT NULL,NULL,NULL,NULL,NULL,NULL,NULL FROM owner_guard WHERE NOT ok";
}

std::string execute_sql(const Request &request, bool initialize) {
    identifier(request.schema_name,64);identifier(request.command_id,128);
    if(request.schema_version<1 || request.schema_version>2147483647)
        throw Error("TD_E_SCHEMA_VERSION: invalid batch schema version");
    if(request.members_json.empty() || request.members_json.size()>98304)
        throw Error("TD_E_COMMAND_LIMIT: batch JSON exceeds 96 KiB");
    detail::validate_utf8_text(request.members_json);
    if(request.max_retained_facts<1 || request.max_retained_facts>1000000000 ||
       request.max_retained_bytes<1 || request.max_retained_bytes>1099511627776)
        throw Error("TD_E_COMMAND_LIMIT: invalid retained storage budget");
    std::string out="CREATE TEMP TABLE __td_batch_format AS "+integrity::owner_check_sql()+";";
    out+=R"TD_BATCH(
CREATE TEMP TABLE __td_batch_state AS SELECT CASE
 WHEN (SELECT count(*) FROM main.clock)<>1 OR EXISTS(SELECT 1 FROM main.clock WHERE
   singleton IS DISTINCT FROM TRUE OR position IS NULL OR position<0 OR position=9223372036854775807)
 THEN error('TD_E_COMMAND_FORMAT: invalid native commit clock')
 WHEN (SELECT count(*) FROM main.storage_usage)<>1 OR EXISTS(SELECT 1 FROM main.storage_usage WHERE
   singleton IS DISTINCT FROM TRUE OR retained_count IS NULL OR retained_count<0 OR retained_bytes IS NULL OR retained_bytes<0)
 THEN error('TD_E_COMMAND_FORMAT: invalid native retained usage') ELSE TRUE END ok;
)TD_BATCH";
    if(!initialize)out+="DELETE FROM __td_batch_format WHERE CASE WHEN (SELECT version FROM main.store_meta) IN(9,10,11) "
        "AND (SELECT revision FROM td_catalog_v1.catalog_revision WHERE singleton)=3 THEN FALSE "
        "ELSE error('TD_E_COMMAND_FORMAT: first batch requires td_batch_entities_initial') END;";
    out+=input_sql(request)+admission_sql(request);
    if(initialize)out+=migration_sql()+R"TD_BATCH(
UPDATE main.store_meta SET version=9 WHERE version<9 AND (SELECT NOT is_replay FROM __td_batch_ctx);
UPDATE td_catalog_v1.catalog_revision SET revision=3 WHERE revision<>3 AND (SELECT NOT is_replay FROM __td_batch_ctx);
)TD_BATCH";
    return out+mutation_sql()+receipt_sql(request.command_id);
}
}

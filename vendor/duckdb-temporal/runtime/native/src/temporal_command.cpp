// SPDX-License-Identifier: MIT
#include "temporal_command.hpp"
#include "temporal_sql.hpp"
#include "temporal_value_domain.hpp"
#include "temporal_integrity.hpp"
#include "temporal_uniqueness.hpp"
#include "temporal_presence.hpp"

namespace td::command {
namespace {
std::string owner_cte(){
    return "WITH owner_guard AS MATERIALIZED ("+td::integrity::owner_check_sql()+") ";
}
// The guard has an independent one-row input. It runs even when the
// requested entity/command has no matching rows.
const std::string history_owner_guard=
    " UNION ALL SELECT NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL "
    "FROM owner_guard WHERE NOT ok ";
const std::string four_tag_history=
    " AND CASE WHEN tag IN('str','bool','i64','f64') THEN TRUE "
    "ELSE error('TD_E_QUERY_PROFILE: history requires the expanded value entrypoint') END";
void text(const std::string &value,size_t cap){
    detail::validate_typed_text(value);
    if(value.empty()||value.size()>cap)throw Error("TD_E_COMMAND_INPUT: identifier byte admission exceeded");
}
}
std::string history_sql(const std::string &entity_id,bool expanded){
    text(entity_id,128);
    return owner_cte()+"SELECT h.* FROM td_catalog_v1.entity_history h CROSS JOIN owner_guard WHERE owner_guard.ok AND entity_id="+td::sql::literal(entity_id)+
        (expanded?"":four_tag_history)+history_owner_guard+
        " ORDER BY tx_from,attribute,tag,payload,assertion_id";
}
std::string entity_at_sql(const std::string &entity_id,int64_t known_at,int64_t valid_at,bool expanded){
    text(entity_id,128);
    if(known_at<0||known_at==INT64_MAX||valid_at==INT64_MAX)
        throw Error("TD_E_COMMAND_INTERVAL: invalid temporal query cut");
    return owner_cte()+"SELECT h.* FROM td_catalog_v1.entity_history h CROSS JOIN owner_guard WHERE owner_guard.ok AND entity_id="+td::sql::literal(entity_id)+
        " AND tx_from<="+std::to_string(known_at)+" AND tx_to>"+std::to_string(known_at)+
        " AND valid_from<="+std::to_string(valid_at)+" AND valid_to>"+std::to_string(valid_at)+
        (expanded?"":four_tag_history)+
        " UNION ALL SELECT NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL "
        "FROM main.clock CROSS JOIN owner_guard WHERE owner_guard.ok AND singleton AND CASE WHEN position<"+std::to_string(known_at)+
        " THEN error('TD_E_COMMAND_INTERVAL: knowledge cut exceeds committed clock') ELSE FALSE END "+history_owner_guard+
        "ORDER BY attribute,tag,payload,assertion_id";
}
std::string presence_at_sql(const std::string &entity_id,int64_t known_at,int64_t valid_at){
    text(entity_id,128);
    if(known_at<0||known_at==INT64_MAX||valid_at==INT64_MAX)
        throw Error("TD_E_COMMAND_INTERVAL: invalid temporal query cut");
    const auto k=std::to_string(known_at),v=std::to_string(valid_at);
    return owner_cte()+", edits AS MATERIALIZED (SELECT operation,valid_from,valid_to,position "
        "FROM td_catalog_v1.entity_presence_events "
        "WHERE entity_id="+td::sql::literal(entity_id)+" AND position<="+k+
        "), decision AS (SELECT valid_from<="+v+" AND "+v+"<valid_to present FROM edits "
        "WHERE operation='put' OR (valid_from<="+v+" AND "+v+"<valid_to) ORDER BY position DESC LIMIT 1) "
        "SELECT CASE WHEN NOT owner_guard.ok THEN error('TD_E_OWNER_PROBE_INVALID: owner scope is not audited') "
        "WHEN (SELECT position FROM main.clock WHERE singleton)<"+k+
        " THEN error('TD_E_COMMAND_INTERVAL: knowledge cut exceeds committed clock') "
        "WHEN EXISTS(SELECT 1 FROM edits) THEN coalesce((SELECT present FROM decision),FALSE) ELSE NULL END present "
        "FROM owner_guard";
}
std::string receipt_sql(const std::string &command_id){
    text(command_id,128);
    return owner_cte()+"SELECT CASE WHEN n.command_id IS NULL THEN error('TD_E_COMMAND_KIND: command belongs to another API') ELSE c.command_id END command_id,"
        "c.position,CAST(json_extract(c.receipt,'$.asserted') AS VARCHAR) asserted,"
        "CAST(json_extract(c.receipt,'$.retracted') AS VARCHAR) retracted,"
        "n.schema_name,n.schema_version,n.entity_type,n.entity_id,n.schema_hash,c.request_hash "
        "FROM main.commands c LEFT JOIN td_catalog_v1.entity_commands n ON n.command_id=c.command_id CROSS JOIN owner_guard WHERE owner_guard.ok AND c.command_id="+
        td::sql::literal(command_id)+" UNION ALL SELECT NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL "
        "FROM owner_guard WHERE NOT ok";
}
namespace {
std::string command_input_sql(const EntityPut &request,const std::string &kind,const std::string &value_identity){
    text(request.schema_name,64);text(request.entity_type,64);text(request.entity_id,128);text(request.command_id,128);
    if(request.schema_version<1||request.schema_version>2147483647)throw Error("TD_E_SCHEMA_VERSION: invalid command schema version");
    if(request.valid_from>=request.valid_to)throw Error("TD_E_COMMAND_INTERVAL: valid_from must precede valid_to");
    if(request.record.empty()||request.record.size()>65536)throw Error("TD_E_COMMAND_LIMIT: record byte admission exceeded");
    if(request.max_retained_facts<1||request.max_retained_facts>1000000000||
       request.max_retained_bytes<1||request.max_retained_bytes>1099511627776)
        throw Error("TD_E_COMMAND_LIMIT: invalid retained storage budget");
    const auto q=td::sql::literal;
    std::string out="CREATE TEMP TABLE __td_native_owner_guard AS "+td::integrity::owner_check_sql()+";";
    out+="CREATE TEMP TABLE __td_native_input AS SELECT "+q(request.schema_name)+"::VARCHAR schema_name,"+
        std::to_string(request.schema_version)+"::INTEGER schema_version,"+q(request.entity_type)+"::VARCHAR entity_type,"+
        q(request.entity_id)+"::VARCHAR entity_id,"+q(request.command_id)+"::VARCHAR command_id,"+
        q(request.record)+"::VARCHAR record_text,"+q(std::to_string(request.valid_from))+"::BIGINT valid_from,"+
        q(std::to_string(request.valid_to))+"::BIGINT valid_to FROM __td_native_owner_guard WHERE ok;";
    out+=R"TD_COMMAND(
CREATE TEMP TABLE __td_native_plan AS
 SELECT i.*,s.content_hash schema_hash,coalesce(m.is_live,FALSE) is_live_type,
 system.main.)TD_COMMAND";
    out+=request.expanded_values?"td_prepare_entity_v2":"td_prepare_entity_v1";
    out+=R"TD_COMMAND((s.dsl,s.ir,i.entity_type,i.record_text) prepared,
 epoch_ms(current_timestamp)::DOUBLE recorded_at
 FROM __td_native_input i LEFT JOIN td_catalog_v1.schemas s ON s.name=i.schema_name AND s.version=i.schema_version
 LEFT JOIN td_catalog_v1.schema_type_modes m USING(schema_name,entity_type);
CREATE TEMP TABLE __td_native_ctx AS
 SELECT p.*,sha256(to_json(struct_pack(kind:=)TD_COMMAND";
    out+=q(kind);
    out+=R"TD_COMMAND(,schema_name:=p.schema_name,
 schema_version:=p.schema_version,schema_hash:=p.schema_hash,entity_type:=p.entity_type,entity_id:=p.entity_id,
 valid_from:=p.valid_from,valid_to:=p.valid_to,values_ir:=p.prepared))) request_hash,
 c.request_hash previous_hash,c.command_id IS NOT NULL is_replay,
 CASE WHEN c.command_id IS NOT NULL THEN c.position WHEN k.position>=9223372036854775806
 THEN error('TD_E_COMMAND_LIMIT: commit position exhausted') ELSE k.position+1 END position
 FROM __td_native_plan p CROSS JOIN main.clock k LEFT JOIN main.commands c ON c.command_id=p.command_id WHERE k.singleton;
CREATE TEMP TABLE __td_native_pending AS
 SELECT j.key::BIGINT ordinal,sha256(to_json(struct_pack()TD_COMMAND";
    out+=value_identity;
    out+=R"TD_COMMAND(command_id:=c.command_id,ordinal:=j.key::BIGINT))) assertion_id,
 c.entity_id e,json_extract_string(j.value,'$.a') a,json_extract_string(j.value,'$.tag') tag,
 json_extract_string(j.value,'$.payload') payload,CAST(json_extract(j.value,'$.t') AS UTINYINT) v_tag,
 encode(json_extract_string(j.value,'$.s')) v_s,CAST(json_extract(j.value,'$.b') AS BOOLEAN) v_b,
 CAST(json_extract_string(j.value,'$.i') AS BIGINT) v_i,
 system.main.td_float_from_bits_v1(json_extract_string(j.value,'$.f')) v_f,
 json_extract_string(j.value,'$.reference') reference_type,json_extract_string(j.value,'$.extra_json') extra_json,
 c.valid_from,c.valid_to,NULL::VARCHAR source_assertion_id,NULL::VARCHAR validation_command_id,NULL::VARCHAR side
 FROM __td_native_ctx c CROSS JOIN json_each((SELECT prepared FROM __td_native_ctx WHERE NOT is_replay)) j
 WHERE NOT c.is_replay;
 )TD_COMMAND";
    return out;
}
std::string patch_fragments_sql(const EntityPut &request){
    return R"TD_COMMAND(
CREATE TEMP TABLE __td_native_patch_admission AS
 SELECT CASE WHEN (SELECT is_replay FROM __td_native_ctx) THEN 0
 WHEN (SELECT count(*) FROM td_catalog_v1.catalog_revision WHERE singleton AND revision IN(2,3))<>1
 THEN error('TD_E_COMMAND_FORMAT: interval patches require td_migrate_native_catalog_v2')
 WHEN (SELECT count(*) FROM __td_native_old)>4096
 THEN error('TD_E_COMMAND_LIMIT: affected assertion admission exceeded')
 WHEN (SELECT count(*) FROM main.assertions a,__td_native_ctx c WHERE a.e=c.entity_id AND a.tx_to=9223372036854775807)
   -(SELECT count(*) FROM __td_native_old)+(SELECT count(*) FROM __td_native_pending)
   +(SELECT count(*) FROM main.assertions a JOIN __td_native_old o USING(assertion_id),__td_native_ctx c WHERE a.valid_from<c.valid_from)
   +(SELECT count(*) FROM main.assertions a JOIN __td_native_old o USING(assertion_id),__td_native_ctx c WHERE c.valid_to<a.valid_to)>4096
 THEN error('TD_E_COMMAND_LIMIT: resulting entity assertion admission exceeded')
 ELSE (SELECT count(*) FROM td_catalog_v1.entity_history h JOIN __td_native_old o USING(assertion_id)
 WHERE h.entity_id=)TD_COMMAND"+td::sql::literal(request.entity_id)+R"TD_COMMAND() END checked;
INSERT INTO __td_native_pending
 SELECT 4096+row_number() OVER(ORDER BY source_assertion_id,side),
 sha256(to_json(struct_pack(kind:='td.entity.patch.fragment/1',command_id:=command_id,
 source_assertion_id:=source_assertion_id,side:=side))),
 e,a,tag,payload,v_tag,v_s,v_b,v_i,v_f,NULL,extra_json,valid_from,valid_to,source_assertion_id,validation_command_id,side
 FROM (
 SELECT c.command_id,a.e,a.a,a.tag,a.payload,a.v_tag,a.v_s,a.v_b,a.v_i,a.v_f,a.extra_json,
 CASE WHEN piece.side='left' THEN a.valid_from ELSE c.valid_to END valid_from,
 CASE WHEN piece.side='left' THEN c.valid_from ELSE a.valid_to END valid_to,
 a.assertion_id source_assertion_id,coalesce(s.validation_command_id,a.command_id) validation_command_id,piece.side
 FROM main.assertions a JOIN __td_native_old old USING(assertion_id)
 LEFT JOIN td_catalog_v1.entity_assertion_sources s USING(assertion_id)
 CROSS JOIN __td_native_ctx c CROSS JOIN (VALUES ('left'),('right')) piece(side)
 WHERE (piece.side='left' AND a.valid_from<c.valid_from) OR (piece.side='right' AND c.valid_to<a.valid_to)
 ) pieces;
)TD_COMMAND";
}
std::string command_guard_sql(const EntityPut &request){
    std::string out=R"TD_COMMAND(
CREATE TEMP TABLE __td_native_guard AS
 SELECT CASE
 WHEN c.is_replay AND (c.previous_hash IS DISTINCT FROM c.request_hash OR NOT EXISTS(
   SELECT 1 FROM td_catalog_v1.entity_commands n WHERE n.command_id=c.command_id))
 THEN error('TD_E_COMMAND_IDEMPOTENCY: command ID is bound to a different request')
 WHEN NOT c.is_replay AND EXISTS(SELECT 1 FROM td_catalog_v1.entity_owners o WHERE o.entity_id=c.entity_id
   AND (o.schema_name<>c.schema_name OR o.entity_type<>c.entity_type))
 THEN error('TD_E_COMMAND_OWNERSHIP: entity has another schema/type')
 WHEN NOT c.is_replay AND EXISTS(SELECT 1 FROM main.assertions a WHERE a.e=c.entity_id AND a.tx_to=9223372036854775807
   AND NOT EXISTS(SELECT 1 FROM td_catalog_v1.entity_creators n WHERE n.command_id=a.command_id
     AND n.entity_id=c.entity_id AND n.schema_name=c.schema_name AND n.entity_type=c.entity_type))
 THEN error('TD_E_COMMAND_OWNERSHIP: entity contains assertions from another API')
 WHEN NOT c.is_replay AND EXISTS(SELECT 1 FROM __td_native_pending p WHERE p.reference_type IS NOT NULL
   AND NOT(p.v_tag IN(1,5) AND decode(p.v_s)=c.entity_id AND p.reference_type=c.entity_type)
   AND NOT EXISTS(SELECT 1 FROM td_catalog_v1.entity_identities target WHERE target.entity_id=decode(p.v_s)
     AND target.schema_name=c.schema_name AND target.entity_type=p.reference_type AND target.first_position<=c.position))
 THEN error('TD_E_COMMAND_REFERENCE: target must be a declared native entity of the reference type in this schema')
 WHEN NOT c.is_replay AND ((SELECT count(*) FROM __td_native_old)>4096 OR
   u.retained_count+(SELECT count(*) FROM __td_native_pending)>)TD_COMMAND";
    out+=std::to_string(request.max_retained_facts)+R"TD_COMMAND( OR
   u.retained_bytes+(SELECT coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+
     coalesce(octet_length(encode(extra_json)),0)),0)
     FROM __td_native_pending)>)TD_COMMAND";
    out+=std::to_string(request.max_retained_bytes)+R"TD_COMMAND()
 THEN error('TD_E_COMMAND_LIMIT: retained or per-command admission exceeded')
 WHEN NOT c.is_replay AND )TD_COMMAND";
    out+=td::uniqueness::write_conflict_sql(
        "SELECT p.e,p.a,p.v_tag,p.v_s,p.v_b,p.v_i,p.v_f,p.valid_from,p.valid_to,c.schema_name,c.entity_type "
        "FROM __td_native_pending p CROSS JOIN __td_native_ctx c",
        "__td_native_old","(SELECT position FROM __td_native_ctx)");
    out+=R"TD_COMMAND(
 THEN error('TD_E_COMMAND_UNIQUE: distinct entities would share a unique value over overlapping intervals')
 ELSE TRUE END ok
 FROM __td_native_ctx c CROSS JOIN main.storage_usage u WHERE u.singleton;
 )TD_COMMAND";
    return out;
}
std::string command_header_sql(const char *operation){
    return R"TD_COMMAND(
INSERT INTO td_catalog_v1.entity_owners
 SELECT entity_id,schema_name,entity_type FROM __td_native_ctx WHERE NOT is_replay ON CONFLICT(entity_id) DO NOTHING;
INSERT INTO main.commands
 SELECT c.command_id,c.request_hash,c.position,
 CAST(CASE WHEN c.is_live_type THEN json_merge_patch(receipt.payload,
 to_json(struct_pack(presence:=)TD_COMMAND"+td::presence::edit_metadata_sql("c",operation)+R"TD_COMMAND()))
 ELSE receipt.payload END AS VARCHAR),
 c.command_id,c.recorded_at,'triplex'
 FROM __td_native_ctx c
 CROSS JOIN LATERAL (SELECT to_json(struct_pack(command_id:=c.command_id,position:=c.position,
  asserted:=coalesce((SELECT list(assertion_id ORDER BY ordinal) FROM __td_native_pending),[]::VARCHAR[]),
  retracted:=coalesce((SELECT list(assertion_id ORDER BY assertion_id) FROM __td_native_old),[]::VARCHAR[]))) payload) receipt
 WHERE NOT c.is_replay;
INSERT INTO td_catalog_v1.entity_commands
 SELECT command_id,schema_name,schema_version,entity_type,entity_id,position,schema_hash
 FROM __td_native_ctx WHERE NOT is_replay;
INSERT INTO td_catalog_v1.entity_presence_edits
 SELECT c.command_id,c.entity_id,)TD_COMMAND"+operation+R"TD_COMMAND(,c.valid_from,c.valid_to
 FROM __td_native_ctx c WHERE c.is_live_type AND NOT c.is_replay;
)TD_COMMAND";
}
std::string patch_metadata_sql(){
    return R"TD_COMMAND(
INSERT INTO td_catalog_v1.entity_patch_commands
 SELECT command_id,valid_from,valid_to FROM __td_native_ctx WHERE NOT is_replay;
INSERT INTO td_catalog_v1.entity_assertion_sources
 SELECT assertion_id,source_assertion_id,validation_command_id,side FROM __td_native_pending WHERE source_assertion_id IS NOT NULL;
UPDATE main.store_meta SET version=6 WHERE version=5 AND (SELECT NOT is_replay FROM __td_native_ctx);
)TD_COMMAND";
}
std::string command_commit_sql(){
    return R"TD_COMMAND(
UPDATE main.assertions AS a SET tx_to=c.position,corrected_by=c.command_id,retracted_at=c.recorded_at,retract_transaction_id=c.command_id
 FROM __td_native_ctx c,__td_native_old old WHERE a.assertion_id=old.assertion_id;
INSERT INTO main.assertions
 SELECT p.assertion_id,p.e,p.a,p.tag,p.payload,p.valid_from,p.valid_to,c.position,9223372036854775807,
 c.command_id,NULL,sha256(p.payload),p.v_tag,p.v_s,p.v_b,p.v_i,p.v_f,c.recorded_at,NULL,
 CASE WHEN p.valid_from BETWEEN 0 AND 9007199254740991 THEN p.valid_from::DOUBLE END,
 CASE WHEN p.valid_to BETWEEN 0 AND 9007199254740991 THEN p.valid_to::DOUBLE END,
 NULL,c.entity_type,c.command_id,NULL,p.extra_json,'triplex',
 p.valid_from BETWEEN 0 AND 9007199254740991 AND (p.valid_to=9223372036854775807 OR p.valid_to BETWEEN 0 AND 9007199254740991)
 AND (p.v_tag<>3 OR p.v_i BETWEEN -9007199254740991 AND 9007199254740991)
 FROM __td_native_pending p CROSS JOIN __td_native_ctx c;
UPDATE main.storage_usage SET retained_count=retained_count+(SELECT count(*) FROM __td_native_pending),
 retained_bytes=retained_bytes+(SELECT coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+
 coalesce(octet_length(encode(extra_json)),0)),0)
 FROM __td_native_pending) WHERE singleton AND (SELECT NOT is_replay FROM __td_native_ctx);
UPDATE main.clock SET position=(SELECT position FROM __td_native_ctx) WHERE singleton AND (SELECT NOT is_replay FROM __td_native_ctx);
DROP TABLE __td_native_guard;
)TD_COMMAND";
}
std::string command_cleanup_sql(){
    return R"TD_COMMAND(
DROP TABLE __td_native_old;
DROP TABLE __td_native_pending;
DROP TABLE __td_native_ctx;
DROP TABLE __td_native_plan;
DROP TABLE __td_native_input;
DROP TABLE __td_native_owner_guard;
)TD_COMMAND";
}
}
std::string put_entity_sql(const EntityPut &request){
    std::string out=command_input_sql(request,"td.entity.put/1","");
    out+="CREATE TEMP TABLE __td_native_old AS SELECT a.assertion_id FROM main.assertions a,__td_native_ctx c "
        "WHERE a.e=c.entity_id AND a.tx_to=9223372036854775807 AND NOT c.is_replay;";
    out+=command_guard_sql(request)+command_header_sql("'put'")+command_commit_sql()+command_cleanup_sql();
    return out+receipt_sql(request.command_id);
}
std::string patch_entity_sql(const EntityPut &request){
    std::string out=command_input_sql(request,"td.entity.patch/1","kind:='td.entity.patch.value/1',");
    out+="CREATE TEMP TABLE __td_native_old AS SELECT a.assertion_id FROM main.assertions a,__td_native_ctx c "
        "WHERE a.e=c.entity_id AND a.tx_to=9223372036854775807 AND NOT c.is_replay "
        "AND a.valid_from<c.valid_to AND a.valid_to>c.valid_from;";
    // Every old assertion was selected with e=request.entity_id. Keep that
    // redundant literal visible before the history view's validation joins;
    // the assertion-ID join and every admission/error branch remain intact.
    out+=patch_fragments_sql(request)+command_guard_sql(request)+command_header_sql("'patch'")+patch_metadata_sql()+command_commit_sql();
    out+="DROP TABLE __td_native_patch_admission;";
    return out+command_cleanup_sql()+receipt_sql(request.command_id);
}
}

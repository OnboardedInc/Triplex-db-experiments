// SPDX-License-Identifier: MIT
// Native operations for the existing public Triplex row profile.
#include "temporal_compat.hpp"
#include "temporal_float.hpp"
#include "temporal_integrity.hpp"
#include "temporal_sql.hpp"
#include <algorithm>
#include <cmath>

namespace td::compat {
namespace {
constexpr int64_t max_safe=9007199254740991;
void text(const std::string &value,bool required=false){
    if(value.size()>32768)throw Error("TD_E_COMPAT_LIMIT: mutation argument exceeds 32 KiB");
    if(value.find('\0')!=std::string::npos||(required&&value.empty()))
        throw Error("TD_E_COMPAT_INPUT: invalid experimental text argument");
}
std::string float_sql(double value){
    const auto bits=detail::canonical_float_bits(detail::float_bits(value));
    constexpr char hex[]="0123456789abcdef";std::string out(16,'0');
    for(size_t i=0;i<16;++i)out[i]=hex[(bits>>((15-i)*4))&15];
    return "system.main.td_float_from_bits_v1("+sql::literal(out)+")";
}
std::string format_guard(){
    return "CREATE TEMP TABLE __td_compat_format AS "+integrity::format_check_sql()+";"
        "DELETE FROM __td_compat_format WHERE CASE WHEN (SELECT version FROM main.store_meta)=5 THEN FALSE "
        "ELSE error('TD_E_COMPAT_FORMAT: the public compatibility profile requires format five') END;"
        "DROP TABLE __td_compat_format;";
}
}

DependencyContribution dependency_entry(const DependencyFact &fact,const DependencyCut &cut){
    const auto safe=[](int64_t value){return value>=-max_safe&&value<=max_safe;};
    const auto finite=[](const std::optional<double> &value){return !value||std::isfinite(*value);};
    if(!safe(fact.recorded_position)||(fact.retracted_position&&!safe(*fact.retracted_position)))
        throw Error("TD_E_COMPAT_INPUT: integer cannot be safely exposed to public Number");
    if(!std::isfinite(fact.recorded_at)||!finite(fact.retracted_at)||!finite(fact.valid_from)||!finite(fact.valid_to))
        throw Error("TD_E_COMPAT_INPUT: nonfinite public temporal value");
    if(!std::isfinite(cut.valid_at)||cut.valid_at<0||!finite(cut.recorded_at)||
        (cut.recorded_at&&*cut.recorded_at<0)||
        (cut.recorded_position&&(*cut.recorded_position<0||!safe(*cut.recorded_position))))
        throw Error("TD_E_COMPAT_INPUT: invalid dependency cut");
    if((cut.recorded_at&&fact.recorded_at>*cut.recorded_at)||
        (cut.recorded_position&&fact.recorded_position>*cut.recorded_position))return {};
    const auto retracted_position=fact.retracted_position.value_or(0);
    if(fact.retracted_at&&(!cut.recorded_at||*fact.retracted_at<=*cut.recorded_at)&&
        (!cut.recorded_position||retracted_position<=*cut.recorded_position))
        return {std::max<int64_t>(0,retracted_position),std::nullopt};
    DependencyContribution result{std::max<int64_t>(0,fact.recorded_position),std::nullopt};
    for(const auto boundary:{fact.valid_from,fact.valid_to})
        if(boundary&&*boundary>cut.valid_at&&(!result.next_boundary||*boundary<*result.next_boundary))
            result.next_boundary=boundary;
    return result;
}

bool reserve_usage(int64_t retained_count,int64_t retained_bytes,int64_t added_count,int64_t added_bytes){
    constexpr int64_t max_facts=1000000,max_bytes=268435456;
    if(retained_count>max_safe||retained_count<-max_safe||retained_bytes>max_safe||retained_bytes<-max_safe)
        throw Error("TD_E_COMPAT_INPUT: Integer cannot be safely exposed to public Number");
    if(retained_count<0||retained_bytes<0||added_count<1||added_bytes<0)
        throw Error("TD_E_COMPAT_INPUT: invalid retained storage reservation");
    if(added_count>max_facts||added_bytes>max_bytes||
       retained_count>max_facts-added_count||retained_bytes>max_bytes-added_bytes)
        throw Error("TD_E_COMPAT_LIMIT: Shared retained storage admission exceeded");
    return true;
}

std::string append_sql(const std::string &rows_json){
    text(rows_json,true);
    std::string out=format_guard();
    out+="CREATE TEMP TABLE __td_compat_json AS SELECT "+sql::literal(rows_json)+"::VARCHAR payload;";
    out+=R"TD_COMPAT(
CREATE TEMP TABLE __td_compat_shape AS SELECT CASE
 WHEN NOT json_valid(payload) THEN error('TD_E_COMPAT_INPUT: invalid JSON rows')
 WHEN json_type(payload)<>'ARRAY' OR json_array_length(payload) NOT BETWEEN 1 AND 128
 THEN error('TD_E_COMPAT_LIMIT: append requires one to 128 rows') ELSE TRUE END ok FROM __td_compat_json;
CREATE TEMP TABLE __td_compat_input AS SELECT j.key::BIGINT ordinal,j.value raw,
 json_extract_string(j.value,'$.id') id,json_extract_string(j.value,'$.entity_id') entity_id,
 json_extract_string(j.value,'$.attribute') attribute,json_extract_string(j.value,'$.value_type') value_type,
 json_extract_string(j.value,'$.value_string') value_string,
 try_cast(json_extract(j.value,'$.value_number') AS DOUBLE) value_number,
 try_cast(json_extract(j.value,'$.value_boolean') AS DOUBLE) value_boolean,
 try_cast(json_extract(j.value,'$.value_datetime') AS DOUBLE) value_datetime,
 json_extract_string(j.value,'$.value_json') value_json,
 try_cast(json_extract(j.value,'$.recorded_at') AS DOUBLE) recorded_at,
 try_cast(json_extract(j.value,'$.recorded_position') AS DOUBLE) recorded_position,
 try_cast(json_extract(j.value,'$.valid_from') AS DOUBLE) valid_from,
 try_cast(json_extract(j.value,'$.valid_to') AS DOUBLE) valid_to,
 json_extract_string(j.value,'$.created_by') created_by,json_extract_string(j.value,'$.entity_type') entity_type,
 json_extract_string(j.value,'$.tx_id') tx_id
 FROM __td_compat_json,json_each(payload) j;
CREATE TEMP TABLE __td_compat_input_guard AS SELECT CASE WHEN EXISTS(
 SELECT 1 FROM __td_compat_input WHERE (
 json_type(raw)='OBJECT' AND list_sort(json_keys(raw))=
 ['attribute','created_by','entity_id','entity_type','id','recorded_at','recorded_position','retract_tx_id',
  'retracted_at','retracted_position','schema_version','tx_id','valid_from','valid_to','value_boolean',
  'value_datetime','value_json','value_number','value_string','value_type']
 AND json_type(raw,'$.id')='VARCHAR' AND length(id)>0 AND NOT contains(id,chr(0))
 AND json_type(raw,'$.entity_id')='VARCHAR' AND length(entity_id)>0 AND NOT contains(entity_id,chr(0))
 AND json_type(raw,'$.attribute')='VARCHAR' AND NOT contains(attribute,chr(0))
 AND json_type(raw,'$.value_type')='VARCHAR'
 AND json_type(raw,'$.recorded_at') IN('UBIGINT','BIGINT','DOUBLE') AND isfinite(recorded_at) AND recorded_at>=0
 AND json_type(raw,'$.recorded_position') IN('UBIGINT','BIGINT','DOUBLE')
 AND recorded_position BETWEEN 1 AND 9007199254740991 AND recorded_position=floor(recorded_position)
 AND json_type(raw,'$.schema_version') IN('UBIGINT','BIGINT','DOUBLE') AND json_extract(raw,'$.schema_version')::DOUBLE=1
 AND json_type(raw,'$.valid_from') IN('UBIGINT','BIGINT','DOUBLE') AND isfinite(valid_from) AND valid_from>=0
 AND (json_type(raw,'$.valid_to')='NULL' OR (json_type(raw,'$.valid_to') IN('UBIGINT','BIGINT','DOUBLE') AND isfinite(valid_to) AND valid_to>valid_from))
 AND json_type(raw,'$.retracted_at')='NULL' AND json_type(raw,'$.retracted_position')='NULL' AND json_type(raw,'$.retract_tx_id')='NULL'
 AND (json_type(raw,'$.created_by')='NULL' OR (json_type(raw,'$.created_by')='VARCHAR' AND NOT contains(created_by,chr(0))))
 AND (json_type(raw,'$.entity_type')='NULL' OR (json_type(raw,'$.entity_type')='VARCHAR' AND NOT contains(entity_type,chr(0))))
 AND (json_type(raw,'$.tx_id')='NULL' OR (json_type(raw,'$.tx_id')='VARCHAR' AND length(tx_id)>0 AND NOT contains(tx_id,chr(0))))
 AND CASE value_type
  WHEN 'string' THEN json_type(raw,'$.value_string')='VARCHAR'
  WHEN 'ref' THEN json_type(raw,'$.value_string')='VARCHAR' AND length(value_string)>0
  WHEN 'number' THEN json_type(raw,'$.value_number') IN('UBIGINT','BIGINT','DOUBLE') AND isfinite(value_number)
  WHEN 'boolean' THEN json_type(raw,'$.value_boolean') IN('UBIGINT','BIGINT','DOUBLE') AND value_boolean IN(0,1)
  WHEN 'datetime' THEN json_type(raw,'$.value_datetime') IN('UBIGINT','BIGINT','DOUBLE') AND isfinite(value_datetime)
  WHEN 'json' THEN json_type(raw,'$.value_json')='VARCHAR' AND json_valid(value_json)
  WHEN 'blob' THEN json_type(raw,'$.value_string')='VARCHAR' AND json_type(raw,'$.value_json')='VARCHAR' AND json_valid(value_json)
  ELSE FALSE END
 AND (value_type IN('string','ref','blob') OR json_type(raw,'$.value_string')='NULL')
 AND (value_type='number' OR json_type(raw,'$.value_number')='NULL')
 AND (value_type='boolean' OR json_type(raw,'$.value_boolean')='NULL')
 AND (value_type='datetime' OR json_type(raw,'$.value_datetime')='NULL')
 AND (value_type IN('json','blob') OR json_type(raw,'$.value_json')='NULL')
 ) IS NOT TRUE) THEN error('TD_E_COMPAT_INPUT: malformed public append row')
 WHEN (SELECT count(DISTINCT id) FROM __td_compat_input)<>(SELECT count(*) FROM __td_compat_input)
 THEN error('TD_E_COMPAT_INPUT: duplicate assertion IDs') ELSE TRUE END ok;
CREATE TEMP TABLE __td_compat_rows AS
 WITH encoded AS (SELECT *,
 CASE value_type WHEN 'string' THEN 'str' WHEN 'number' THEN 'f64' WHEN 'boolean' THEN 'bool' ELSE value_type END tag,
 CASE value_type WHEN 'number' THEN system.main.td_float_bits_v1(value_number)
  WHEN 'datetime' THEN system.main.td_float_bits_v1(value_datetime)
  WHEN 'json' THEN value_json ELSE value_string END text_payload
 FROM __td_compat_input)
 SELECT id assertion_id,entity_id e,attribute a,tag,
 CASE WHEN value_type='boolean' THEN CAST(to_json(value_boolean=1) AS VARCHAR)
  ELSE CAST(to_json(text_payload) AS VARCHAR) END payload,
 CASE WHEN valid_from>=9223372036854775808::DOUBLE THEN 9223372036854775807 ELSE ceil(valid_from)::BIGINT END valid_from,
 CASE WHEN valid_to IS NULL OR valid_to>=9223372036854775808::DOUBLE THEN 9223372036854775807 ELSE ceil(valid_to)::BIGINT END valid_to,
 recorded_position::BIGINT tx_from,9223372036854775807::BIGINT tx_to,
 NULL::VARCHAR command_id,NULL::VARCHAR corrected_by,
 sha256(CASE WHEN value_type='boolean' THEN CAST(to_json(value_boolean=1) AS VARCHAR) ELSE CAST(to_json(text_payload) AS VARCHAR) END) payload_hash,
 CASE value_type WHEN 'string' THEN 1 WHEN 'boolean' THEN 2 WHEN 'number' THEN 4 WHEN 'ref' THEN 5
  WHEN 'datetime' THEN 6 WHEN 'json' THEN 7 ELSE 8 END::UTINYINT v_tag,
 CASE WHEN value_type IN('string','ref','json','blob') THEN encode(text_payload) END v_s,
 CASE WHEN value_type='boolean' THEN value_boolean=1 END v_b,NULL::BIGINT v_i,
 CASE WHEN value_type='number' THEN CASE WHEN value_number=0 THEN 0::DOUBLE ELSE value_number END
  WHEN value_type='datetime' THEN CASE WHEN value_datetime=0 THEN 0::DOUBLE ELSE value_datetime END END v_f,
 recorded_at,NULL::DOUBLE retracted_at,encoded.valid_from external_valid_from,encoded.valid_to external_valid_to,
 created_by,entity_type,tx_id transaction_id,NULL::VARCHAR retract_transaction_id,
 CASE WHEN value_type='blob' THEN value_json END extra_json,'triplex'::VARCHAR origin,TRUE interop
 FROM encoded;
)TD_COMPAT";
    out+="CREATE TEMP TABLE __td_compat_guard AS SELECT CASE WHEN EXISTS(SELECT 1 FROM __td_compat_rows WHERE ("+
        std::string(TD_RETAINED_VALIDITY_SQL)+") IS NOT TRUE) THEN error('TD_E_COMPAT_INPUT: invalid physical carrier') ";
    out+=R"TD_COMPAT(
 WHEN (SELECT count(*) FROM main.storage_usage WHERE singleton)<>1
 THEN error('TD_E_COMPAT_INPUT: missing storage usage singleton')
 WHEN (SELECT retained_count FROM main.storage_usage WHERE singleton)+(SELECT count(*) FROM __td_compat_rows)>1000000
 OR (SELECT retained_bytes FROM main.storage_usage WHERE singleton)+(SELECT coalesce(sum(
 octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+coalesce(octet_length(encode(extra_json)),0)),0)
 FROM __td_compat_rows)>268435456
 THEN error('TD_E_COMPAT_LIMIT: retained storage admission exceeded') ELSE TRUE END ok;
INSERT INTO main.assertions SELECT * FROM __td_compat_rows;
UPDATE main.storage_usage SET retained_count=retained_count+(SELECT count(*) FROM __td_compat_rows),
 retained_bytes=retained_bytes+(SELECT coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+
 octet_length(encode(payload))+coalesce(octet_length(encode(extra_json)),0)),0) FROM __td_compat_rows) WHERE singleton;
DROP TABLE __td_compat_guard;
DROP TABLE __td_compat_rows;
DROP TABLE __td_compat_input_guard;
DROP TABLE __td_compat_input;
DROP TABLE __td_compat_shape;
DROP TABLE __td_compat_json;
)TD_COMPAT";
    return out+"SELECT t.* FROM td_triplex_public_v1.triples t JOIN json_each("+sql::literal(rows_json)+
        ") j ON t.id=json_extract_string(j.value,'$.id') ORDER BY j.key::BIGINT";
}

std::string retract_sql(const std::string &id,double timestamp,const std::string &transaction_id,int64_t position){
    text(id,true);text(transaction_id,true);detail::require_float_environment();
    if(!std::isfinite(timestamp)||timestamp<0||position<0||position>max_safe)
        throw Error("TD_E_COMPAT_INPUT: invalid retraction metadata");
    return format_guard()+"UPDATE main.assertions SET retracted_at="+float_sql(timestamp)+",tx_to="+
        std::to_string(position)+",retract_transaction_id="+sql::literal(transaction_id)+
        " WHERE assertion_id="+sql::literal(id)+" AND tx_to=9223372036854775807 RETURNING assertion_id id";
}
}

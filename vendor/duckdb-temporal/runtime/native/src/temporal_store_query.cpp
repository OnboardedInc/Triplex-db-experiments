// SPDX-License-Identifier: MIT
#include "temporal_store_query.hpp"
#include "temporal_plan_ir_v2.hpp"
#include "temporal_sql.hpp"
#include "temporal_scan_plan.hpp"
#include "temporal_join_plan.hpp"
#include "temporal_anti_join_plan.hpp"
#include "temporal_count_plan.hpp"
#include "temporal_integrity.hpp"
#include "temporal_value_domain.hpp"
#include "temporal_current_unique.hpp"
#include <charconv>
#include <set>

namespace td::store_query {
namespace {
std::string literal_scope(const ProgramIRV2 &ir,size_t slot,const char *column,bool binary_text){
    bool unbound=false;std::set<std::string> literals;
    const auto collect=[&](const PlanAtom &atom){
        if(atom.relation!=0)return;
        const auto &term=atom.terms.at(slot).value;
        if(std::holds_alternative<uint32_t>(term))unbound=true;
        else{const auto &v=std::get<Value>(term);if(v.tag()==ValueTag::String)literals.insert(v.as_str());}
    };
    for(const auto &rule:ir.rules){for(const auto &atom:rule.positive_body)collect(atom);for(const auto &atom:rule.negative_body)collect(atom);}
    if(unbound)return "TRUE";
    if(literals.empty())return "FALSE";
    // An explicit binary collation leaves a plain VARCHAR column in DuckDB's
    // binder. The optimizer can move this necessary predicate into its scan.
    const auto term=binary_text?std::string(column)+" COLLATE \"binary\"":"encode("+std::string(column)+")";
    if(binary_text&&literals.size()==1)return term+" = "+td::sql::literal(*literals.begin());
    std::string scope=term+" IN (";
    for(const auto &literal:literals){
        const auto quoted=td::sql::literal(literal);
        scope+=(binary_text?quoted:"encode("+quoted+")")+",";
    }
    scope.back()=')';
    return scope;
}
std::string stored_scope(const ProgramIRV2 &ir,ValueProfile values){
    auto scope=literal_scope(ir,1,"a",values==ValueProfile::AllValues);
    if(values!=ValueProfile::AllValues)return scope;
    // Each predicate is necessary for every EDB match. A variable in any
    // positive or negative atom leaves its entire column unrestricted.
    const auto entities=literal_scope(ir,0,"e",true);
    if(entities!="TRUE")scope+=" AND "+entities;
    return scope;
}
std::string query_prefix(int64_t valid,int64_t known,int64_t control,bool parameter_control){
    const auto n=[](int64_t v){return std::to_string(v);};
    const bool controlled=control>0||parameter_control;
    const auto control_arg=parameter_control?"CAST($1 AS BIGINT)":n(control);
    // Seed cuts from the guard, independently of whether any facts match.
    return "WITH integrity AS MATERIALIZED ("+integrity::owner_check_sql(controlled?control_arg:"")+
        "),cuts AS MATERIALIZED (SELECT "+td::sql::literal(n(valid))+"::BIGINT valid,(SELECT "+
        (known==-1?"position":"CASE WHEN position<"+n(known)+" THEN error('TD_E_QUERY_INPUT: knowledge cut exceeds committed clock') ELSE "+n(known)+" END")+
        " FROM main.clock WHERE singleton)::BIGINT known FROM integrity WHERE ok),";
}
void validate_query(const std::string &program,int64_t valid,int64_t known){
    if(program.empty()||program.size()>65536)throw Error("TD_E_QUERY_INPUT: program must contain 1..65536 bytes");
    if(valid==INT64_MAX||known < -1||known==INT64_MAX)throw Error("TD_E_QUERY_INPUT: invalid temporal cut");
}
std::string text_carrier(ValueProfile values){
    return values==ValueProfile::AllValues?"v_tag IN(1,5,7,8)":"v_tag=1";
}
std::string invalid_profile(ValueProfile values){
    if(values==ValueProfile::FourTag)
        return "v_tag>4 OR octet_length(encode(e))>512 OR octet_length(encode(a))>512 OR (v_tag=1 AND octet_length(v_s)>512)";
    return "v_tag>8 OR octet_length(encode(e))>512 OR octet_length(encode(a))>512 "
        "OR (v_tag IN(1,5,8) AND octet_length(v_s)>512) OR (v_tag=8 AND octet_length(v_s)=0) "
        "OR CASE WHEN v_tag=7 THEN CASE WHEN octet_length(v_s)>4096 THEN TRUE "
        "ELSE system.main.td_validate_json_source_v2(decode(v_s)) IS NOT TRUE END ELSE FALSE END";
}
std::string profile_error(ValueProfile values){
    return values==ValueProfile::FourTag?
        "error('TD_E_QUERY_PROFILE: relevant data exceeds the four-tag/512-byte Datalog profile')":
        "error('TD_E_QUERY_PROFILE: relevant data exceeds the eight-tag Datalog profile (512-byte text/ID and 4096-byte strict JSON)')";
}
std::string point_evaluator(const std::string &program,const std::string &valid,const std::string &known,
        int64_t facts,int64_t rounds,int64_t work,int64_t control){
    return "system.main.td_query_stratified_values_v2("+td::sql::literal(program)+
        ",coalesce(facts.input,[]::STRUCT(e VARCHAR,a VARCHAR,v STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE),"
        "valid_from BIGINT,valid_to BIGINT,tx_from BIGINT,tx_to BIGINT)[]),"+valid+","+known+","+
        std::to_string(facts)+","+std::to_string(rounds)+","+std::to_string(work)+",60000,"+std::to_string(control)+")";
}
std::string point_fact_list(){
    return "SELECT list(struct_pack(e:=e,a:=a,v:=struct_pack(tag:=v_tag,s:=decode(v_s),b:=v_b,i:=v_i,f:=v_f),"
        "valid_from:=CAST('-9223372036854775808' AS BIGINT),valid_to:=9223372036854775807::BIGINT,"
        "tx_from:=0::BIGINT,tx_to:=9223372036854775807::BIGINT)) input";
}
std::string admit_point_answer_wire(const char *limit){
    // Bound JSON construction before UNNEST materializes wire tuples. Six
    // bytes per text byte cover every JSON escape, and the fixed cell charge
    // covers keys, delimiters, numbers, float bits and NULL carriers.
    return "wire_admission AS MATERIALIZED (SELECT CASE WHEN coalesce(sum(len(answer.rows)),0)>100000 "
        "OR coalesce(sum(list_sum(list_transform(answer.rows,lambda terms: 34::HUGEINT+"
        "coalesce(list_sum(list_transform(terms,lambda v: 80::HUGEINT+6*coalesce(octet_length(encode(v.s)),0))),0)))),0)>33554432 "
        "THEN error('"+std::string(limit)+": answer exceeds pre-encoding admission') ELSE TRUE END ok FROM point_answers),";
}
int64_t parse_cut_tick(std::string_view text){
    int64_t value=0;
    const auto parsed=std::from_chars(text.data(),text.data()+text.size(),value);
    if(parsed.ec!=std::errc{}||parsed.ptr!=text.data()+text.size()||std::to_string(value)!=text)
        throw Error("TD_E_QUERY_INPUT: multi-cut ticks must be canonical signed int64");
    return value;
}
}
std::string sql(const std::string &program,int64_t valid,int64_t known,int64_t facts,int64_t rounds,int64_t work,int64_t deadline,
        bool force_native,bool preferred_native,int64_t control,bool parameter_control,ValueProfile values){
    validate_query(program,valid,known);
    if(facts<1||facts>100000||rounds<1||rounds>2000||work<1||work>50000000||deadline<1||deadline>60000)
        throw Error("TD_E_QUERY_LIMIT: invalid native query budget");
    const bool expanded=values==ValueProfile::AllValues;
    const auto ir=compile_program_ir_v2(program,false,values);
    SqlPlanLimits limits;limits.values=values;
    auto scan=force_native?std::nullopt:scan_plan(ir,false,values);
    if(!force_native&&!scan)scan=union_scan_plan(ir,limits);
    if(!force_native&&!scan)scan=join_plan(ir,limits);
    if(!force_native&&!scan)scan=anti_join_plan(ir,limits);
    if(!force_native&&!scan)scan=count_plan(ir,limits);
    const auto scope=stored_scope(ir,values);
    const auto n=[](int64_t v){return std::to_string(v);};
    const bool controlled=control>0||parameter_control;
    const auto control_arg=parameter_control?"CAST($1 AS BIGINT)":n(control);
    auto out=query_prefix(valid,known,control,parameter_control);
    const auto predicate="valid_from<=valid AND valid<valid_to AND tx_from<=known AND known<tx_to AND ("+scope+")";
    const std::string source=" FROM main.assertions CROSS JOIN cuts";
    if(expanded)out+="input_profile AS MATERIALIZED (SELECT CASE WHEN count(*) FILTER(WHERE "+invalid_profile(values)+
        ")>0 THEN "+profile_error(values)+" ELSE TRUE END ok"+source+" CROSS JOIN integrity WHERE integrity.ok AND "+predicate+"),";
    out+="active AS MATERIALIZED (SELECT DISTINCT e,a,v_tag,v_s,v_b,v_i,v_f"+source+
        (expanded?" CROSS JOIN input_profile WHERE input_profile.ok AND ":" WHERE ")+predicate+"),";
    out+="admission AS MATERIALIZED (SELECT CASE WHEN count(*)>100000 "
        "THEN error('TD_E_QUERY_LIMIT: active snapshot exceeds 100000 tuples') ";
    if(!expanded)out+="WHEN count(*) FILTER(WHERE "+invalid_profile(values)+")>0 THEN "+profile_error(values)+" ";
    out+="ELSE TRUE END ok FROM active),";
    const auto native_function=expanded?"system.main.td_query_stratified_values_v2(":
        controlled?"system.main.td_query_stratified_controlled_deadline_v1(":"system.main.td_query_stratified_deadline_v1(";
    const auto native_call="CASE WHEN admission.ok AND integrity.ok THEN "+std::string(native_function)+
        td::sql::literal(program)+",coalesce((SELECT list(struct_pack(e:=e,a:=a,v:=struct_pack(tag:=v_tag,s:=decode(v_s),b:=v_b,i:=v_i,f:=v_f),"
        "valid_from:=CAST('-9223372036854775808' AS BIGINT),valid_to:=9223372036854775807::BIGINT,tx_from:=0::BIGINT,tx_to:=9223372036854775807::BIGINT)) FROM active "+
        (scan?"WHERE (SELECT NOT use_sql FROM mode)":"")+"),"
        "[]::STRUCT(e VARCHAR,a VARCHAR,v STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE),valid_from BIGINT,valid_to BIGINT,tx_from BIGINT,tx_to BIGINT)[]),"
        "valid,known,"+n(facts)+","+n(rounds)+","+n(work)+","+n(deadline)+(controlled||expanded?","+control_arg:"")+") END";
    std::string reason=force_native?(preferred_native?"preferred_native":"forced_native"):"bounded_native_store";
    if(scan){
        // Every bound is fresh DB-owned data, overestimating the native model.
        // Failure selects the unchanged native evaluator, never a budget bypass.
        const auto &b=ir.budget_model;const auto dict="(3*statistics.n+"+std::to_string(scan->constant_count+32)+"+("+scan->dictionary_extra+"))";
        const auto extra="("+scan->extra_bytes+")";
        out+=scan->prefix_ctes;
        out+="statistics AS MATERIALIZED (SELECT count(*) n,coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+"
            "CASE WHEN "+text_carrier(values)+" THEN octet_length(v_s) ELSE 0 END),0) string_bytes,"
            "coalesce(max(octet_length(encode(e))),0) e_bytes,coalesce(max(octet_length(encode(a))),0) a_bytes,"
            "coalesce(max(CASE WHEN "+text_carrier(values)+" THEN octet_length(v_s) ELSE 0 END),0) v_bytes"+scan->statistics_extra+" FROM active),"+scan->proof_ctes+
            "mode AS MATERIALIZED (SELECT admission.ok AND integrity.ok AND ("+scan->proof_guard+") AND ("+scan->facts_bound+")<="+n(facts)+
            " AND 2<="+n(rounds)+" AND ("+scan->work_bound+")<="+n(work)+" AND "+dict+"<="+std::to_string(b.max_dictionary_values)+
            " AND statistics.string_bytes+"+dict+"*"+std::to_string(b.dictionary_entry_bytes)+"+"+std::to_string(scan->constant_bytes)+
            "<="+std::to_string(b.max_dictionary_bytes)+" AND ("+scan->rows_bound+")*("+std::to_string(b.typed_output_row_bytes.at(scan->arity))+"+"+extra+")<="+
            std::to_string(b.max_output_bytes)+" AND ("+scan->rows_bound+")*("+std::to_string(scan->arity*256+128)+"+6*"+extra+")<=16777216 use_sql "
            "FROM "+scan->statistics_source+" CROSS JOIN integrity CROSS JOIN admission),"+scan->answer_ctes+
            "sql_answer AS MATERIALIZED ("+scan->answer_sql+"),"
            "computed AS MATERIALIZED (SELECT known,mode.use_sql,CASE WHEN NOT mode.use_sql THEN "+native_call+
            " END answer FROM cuts CROSS JOIN mode CROSS JOIN integrity CROSS JOIN admission),combined AS ("
            "SELECT known,'sql' route,"+td::sql::literal(scan->reason)+" reason,NULL::BIGINT rounds,NULL::BIGINT derived_facts,NULL::BIGINT work,"
            "CASE WHEN r.present THEN "+scan->tuple_sql+" END tuple_json,row_number() OVER(ORDER BY "+scan->order_sql+") ordinal "
            "FROM computed LEFT JOIN sql_answer r ON TRUE WHERE use_sql UNION ALL ";
        reason=scan->fallback;
    }else out+="computed AS MATERIALIZED (SELECT known,"+native_call+" answer FROM cuts CROSS JOIN integrity CROSS JOIN admission) ";
    out+="SELECT known,'native' route,"+td::sql::literal(reason)+
        " reason,answer.rounds,answer.derived_facts,answer.work,";
    out+=R"TD_QUERY(
 CASE WHEN r.ordinal IS NOT NULL THEN CAST(to_json(list_transform(r.terms,lambda v:
 struct_pack(tag:=v.tag,s:=v.s,b:=v.b,i:=v.i::VARCHAR,f:=CASE WHEN )TD_QUERY"+
        std::string(expanded?"v.tag IN(4,6)":"v.tag=4")+R"TD_QUERY( THEN system.main.td_float_bits_v1(v.f) END))) AS VARCHAR) END tuple_json
)TD_QUERY";
    if(scan)out+=",r.ordinal ";
    out+="FROM computed LEFT JOIN UNNEST(answer.rows) WITH ORDINALITY r(terms,ordinal) ON TRUE ";
    if(scan)out+="WHERE NOT use_sql) SELECT known,route,reason,rounds,derived_facts,work,tuple_json FROM combined ORDER BY ordinal";
    else out+="ORDER BY r.ordinal";
    return out;
}

std::string interval_sql(const std::string &program,int64_t from,int64_t to,int64_t known,
        int64_t segments,int64_t facts,int64_t rounds,int64_t work,int64_t control){
    validate_query(program,from,known);
    if(from>=to||control<0)throw Error("TD_E_QUERY_INPUT: invalid interval window or control");
    if(segments<1||segments>64||facts<1||facts>100000||rounds<1||rounds>2000||work<1||work>50000000)
        throw Error("TD_E_QUERY_TIMELINE_LIMIT: invalid interval query budget");
    const auto values=ValueProfile::AllValues;
    const auto ir=compile_program_ir_v2(program,false,values);
    const auto n=[](int64_t v){return std::to_string(v);};
    const auto end=td::sql::literal(n(to))+"::BIGINT";
    const auto predicate="tx_from<=known AND known<tx_to AND valid_from<"+end+
        " AND valid<valid_to AND ("+stored_scope(ir,values)+")";
    auto out=query_prefix(from,known,control,false);
    // First bound the canonical source before constructing endpoint and fact lists.
    out+="source_stats AS MATERIALIZED (SELECT count(*) n,coalesce(sum(120::HUGEINT+"
        "octet_length(encode(e))+octet_length(encode(a))+coalesce(octet_length(v_s),0)),0) bytes,"
        "count(*) FILTER(WHERE "+invalid_profile(values)+") invalid FROM main.assertions CROSS JOIN cuts WHERE "+predicate+"),"
        "source_admission AS MATERIALIZED (SELECT n,bytes,CASE WHEN invalid>0 THEN "+profile_error(values)+
        " WHEN n>100000 OR bytes>16777216 THEN error('TD_E_QUERY_TIMELINE_LIMIT: interval history exceeds admission')"
        " ELSE TRUE END ok FROM source_stats),"
        "history AS MATERIALIZED (SELECT e,a,v_tag,v_s,v_b,v_i,v_f,valid_from,valid_to "
        "FROM main.assertions CROSS JOIN cuts CROSS JOIN source_admission WHERE source_admission.ok AND "+predicate+"),"
        "endpoints AS MATERIALIZED (SELECT valid edge FROM cuts UNION SELECT "+end+
        " UNION SELECT valid_from FROM history,cuts WHERE valid<valid_from UNION SELECT valid_to FROM history,cuts WHERE valid_to<"+end+"),"
        "segments AS MATERIALIZED (SELECT lo,hi FROM (SELECT edge lo,lead(edge) OVER(ORDER BY edge) hi FROM endpoints) WHERE hi IS NOT NULL),"
        "segment_admission AS MATERIALIZED (SELECT CASE WHEN count(*)>"+n(segments)+
        " OR count(*)*source_admission.n>500000 OR count(*)*source_admission.bytes>67108864"
        " OR count(*)*"+n(work)+">50000000"
        " THEN error('TD_E_QUERY_TIMELINE_LIMIT: interval segments exceed total admission') ELSE TRUE END ok"
        " FROM segments CROSS JOIN source_admission GROUP BY source_admission.n,source_admission.bytes),";
    // All segment evaluators use one committed cut and the caller's control
    // token. Reuse the authoritative point evaluator for each distinct input set.
    out+="point_answers AS MATERIALIZED (SELECT seg.lo,seg.hi,CASE WHEN gate.ok THEN "+
        point_evaluator(program,"seg.lo","cuts.known",facts,rounds,work,control)+" END answer"
        " FROM segments seg CROSS JOIN cuts CROSS JOIN segment_admission gate LEFT JOIN LATERAL ("+point_fact_list()+
        " FROM (SELECT DISTINCT e,a,v_tag,v_s,v_b,v_i,v_f FROM history WHERE gate.ok AND valid_from<=seg.lo AND seg.lo<valid_to)"
        ") facts ON TRUE),";
    out+=admit_point_answer_wire("TD_E_QUERY_TIMELINE_LIMIT");
    out+=R"TD_INTERVAL(
wire AS MATERIALIZED (
    SELECT lo,hi,encode(CAST(to_json(list_transform(r.terms,lambda v:
        struct_pack(tag:=v.tag,s:=v.s,b:=v.b,i:=v.i::VARCHAR,
            f:=CASE WHEN v.tag IN(4,6) THEN system.main.td_float_bits_v1(v.f) END))) AS VARCHAR)) tuple_key
    FROM point_answers CROSS JOIN wire_admission CROSS JOIN UNNEST(
        CASE WHEN wire_admission.ok THEN answer.rows END) r(terms)
),
output_admission AS MATERIALIZED (
    SELECT CASE WHEN count(*)>100000 OR coalesce(sum(32+octet_length(tuple_key)),0)>16777216
        THEN error('TD_E_QUERY_TIMELINE_LIMIT: interval answer exceeds total admission') ELSE TRUE END ok
    FROM wire
),
adjacent AS (
    SELECT *,CASE WHEN lag(hi) OVER(PARTITION BY tuple_key ORDER BY lo)=lo THEN 0 ELSE 1 END separated
    FROM wire,output_admission WHERE ok
),
islands AS (
    SELECT *,sum(separated) OVER(PARTITION BY tuple_key ORDER BY lo ROWS UNBOUNDED PRECEDING) island
    FROM adjacent
),
intervals AS (
    SELECT min(lo) lo,max(hi) hi,tuple_key FROM islands GROUP BY tuple_key,island
)
SELECT cuts.known,lo,hi,decode(tuple_key) tuple_json
FROM cuts CROSS JOIN output_admission LEFT JOIN intervals ON TRUE
WHERE output_admission.ok ORDER BY lo,hi,tuple_key
)TD_INTERVAL";
    return out;
}

std::string multi_cut_sql(const std::string &program,const std::string &packed,
        int64_t facts,int64_t rounds,int64_t work,int64_t control){
    if(packed.empty()||packed.size()>672)throw Error("TD_E_QUERY_INPUT: invalid multi-cut input length");
    if(facts<1||facts>100000||rounds<1||rounds>2000||work<1||work>50000000||control<0)
        throw Error("TD_E_QUERY_MULTI_LIMIT: invalid multi-cut budget");
    std::string requested;
    size_t count=0;
    for(size_t from=0;;){
        if(++count>16)throw Error("TD_E_QUERY_MULTI_LIMIT: multi-cut requires 1..16 cuts");
        const auto next=packed.find(';',from);
        const auto pair=std::string_view(packed).substr(from,next==std::string::npos?next:next-from);
        const auto comma=pair.find(',');
        if(comma==std::string_view::npos)throw Error("TD_E_QUERY_INPUT: invalid multi-cut pair");
        const auto valid=parse_cut_tick(pair.substr(0,comma)),known=parse_cut_tick(pair.substr(comma+1));
        validate_query(program,valid,known);
        if(!requested.empty())requested+=',';
        requested+="("+std::to_string(count-1)+"::BIGINT,"+td::sql::literal(std::to_string(valid))+"::BIGINT,"+
            td::sql::literal(std::to_string(known))+"::BIGINT)";
        if(next==std::string::npos)break;
        from=next+1;
    }
    if(work>50000000/static_cast<int64_t>(count))
        throw Error("TD_E_QUERY_MULTI_LIMIT: declared work exceeds total multi-cut admission");
    const auto values=ValueProfile::AllValues;
    const auto ir=compile_program_ir_v2(program,false,values);
    const auto relevant="("+stored_scope(ir,values)+") AND EXISTS (SELECT 1 FROM cuts c "
        "WHERE valid_from<=c.valid AND c.valid<valid_to AND tx_from<=c.known AND c.known<tx_to)";
    auto out="WITH integrity AS MATERIALIZED ("+integrity::owner_check_sql(control?std::to_string(control):"")+
        "),cuts AS MATERIALIZED (SELECT ordinal,valid,CASE WHEN requested_known=-1 THEN position "
        "WHEN requested_known>position THEN error('TD_E_QUERY_INPUT: knowledge cut exceeds committed clock') ELSE requested_known END known "
        "FROM (VALUES "+requested+") requested(ordinal,valid,requested_known) CROSS JOIN main.clock CROSS JOIN integrity WHERE singleton AND ok),"
        "source_admission AS MATERIALIZED (SELECT CASE WHEN count(*) FILTER(WHERE "+invalid_profile(values)+")>0 THEN "+profile_error(values)+
        " WHEN count(*)>100000 OR count(*)*"+std::to_string(count)+">500000 OR coalesce(sum(120::HUGEINT+"
        "octet_length(encode(e))+octet_length(encode(a))+coalesce(octet_length(v_s),0)),0)*"+std::to_string(count)+">67108864"
        " THEN error('TD_E_QUERY_MULTI_LIMIT: multi-cut input exceeds total admission') ELSE TRUE END ok"
        " FROM main.assertions WHERE "+relevant+"),"
        "history AS MATERIALIZED (SELECT e,a,v_tag,v_s,v_b,v_i,v_f,valid_from,valid_to,tx_from,tx_to "
        "FROM main.assertions,source_admission WHERE ok AND "+relevant+"),"
        "point_answers AS MATERIALIZED (SELECT c.*,CASE WHEN gate.ok THEN "+
        point_evaluator(program,"c.valid","c.known",facts,rounds,work,control)+" END answer"
        " FROM cuts c CROSS JOIN source_admission gate LEFT JOIN LATERAL ("+point_fact_list()+
        " FROM (SELECT DISTINCT e,a,v_tag,v_s,v_b,v_i,v_f FROM history WHERE gate.ok "
        " AND valid_from<=c.valid AND c.valid<valid_to AND tx_from<=c.known AND c.known<tx_to)) facts ON TRUE),";
    out+=admit_point_answer_wire("TD_E_QUERY_MULTI_LIMIT");
    out+=R"TD_MULTI(
wire AS MATERIALIZED (
    SELECT ordinal,valid,known,r.answer_ordinal,
        CASE WHEN r.answer_ordinal IS NOT NULL THEN CAST(to_json(list_transform(r.terms,lambda v:
            struct_pack(tag:=v.tag,s:=v.s,b:=v.b,i:=v.i::VARCHAR,
                f:=CASE WHEN v.tag IN(4,6) THEN system.main.td_float_bits_v1(v.f) END))) AS VARCHAR) END tuple_json
    FROM point_answers CROSS JOIN wire_admission LEFT JOIN UNNEST(
        CASE WHEN wire_admission.ok THEN answer.rows END) WITH ORDINALITY r(terms,answer_ordinal) ON TRUE
),
output_admission AS MATERIALIZED (
    SELECT CASE WHEN count(*)>100000 OR coalesce(sum(32+coalesce(octet_length(encode(tuple_json)),0)),0)>16777216
        THEN error('TD_E_QUERY_MULTI_LIMIT: multi-cut answer exceeds total admission') ELSE TRUE END ok
    FROM wire
)
SELECT ordinal,valid,known,tuple_json FROM wire,output_admission WHERE ok ORDER BY ordinal,answer_ordinal
)TD_MULTI";
    return out;
}

namespace {
std::string scalable_query_ctes(const ProgramIRV2 &ir,const ScanPlan &plan,
        int64_t valid,int64_t known,int64_t input_facts,int64_t intermediate_rows,int64_t intermediate_bytes,
        int64_t output_rows,int64_t output_bytes,int64_t control,bool parameter_control,
        int64_t unique_mask,ValueProfile values){
    const auto n=[](int64_t v){return std::to_string(v);};
    const auto scope=stored_scope(ir,values);
    const auto predicate="valid_from<=valid AND valid<valid_to AND tx_from<=known AND known<tx_to AND ("+scope+")";
    auto out=query_prefix(valid,known,control,parameter_control);
    if(unique_mask)out+="owner_cap AS MATERIALIZED (SELECT system.main.td_owner_probe_uniqueness_check() capabilities),";
    // Inspect the physical source before DISTINCT or any join can allocate an
    // intermediate. These are logical row/carrier limits, not allocator limits.
    out+="input_statistics AS MATERIALIZED (SELECT count(*) n,"
        "count(*) FILTER(WHERE "+invalid_profile(values)+") invalid,"
        "coalesce(sum(120::HUGEINT+octet_length(encode(e))+octet_length(encode(a))+"
        "CASE WHEN "+text_carrier(values)+" THEN octet_length(v_s) ELSE 0 END),0) carrier_bytes "
        "FROM main.assertions CROSS JOIN cuts WHERE "+predicate+"),"
        "admission AS MATERIALIZED (SELECT CASE "
        "WHEN invalid>0 THEN "+profile_error(values)+" "
        "WHEN n>"+n(input_facts)+" OR n>"+n(intermediate_rows)+" OR carrier_bytes>"+n(intermediate_bytes)+
        " THEN error('TD_E_QUERY_SCALE_LIMIT: scalable SQL input exceeds logical budget') ELSE TRUE END ok "
        "FROM input_statistics CROSS JOIN integrity),";
    const auto fields="e,a,v_tag,v_s,v_b,v_i,v_f";
    const auto source=" FROM main.assertions CROSS JOIN cuts CROSS JOIN admission";
    if(plan.streaming_source){
        // Only the certified raw branch is inlined. A failed capability still
        // computes its set once, shared by every statistics/projection use.
        out+="active_dedup AS MATERIALIZED (SELECT DISTINCT "+std::string(fields)+source+" CROSS JOIN owner_cap "
            "WHERE admission.ok AND (owner_cap.capabilities & "+n(unique_mask)+")=0 AND "+predicate+"),"
            "active AS NOT MATERIALIZED (SELECT "+fields+source+" CROSS JOIN owner_cap "
            "WHERE admission.ok AND (owner_cap.capabilities & "+n(unique_mask)+")<>0 AND "+predicate+
            " UNION ALL SELECT "+fields+" FROM active_dedup),";
    }else if(unique_mask){
        out+="active AS MATERIALIZED (SELECT "+std::string(fields)+source+" CROSS JOIN owner_cap "
            "WHERE admission.ok AND (owner_cap.capabilities & "+n(unique_mask)+")<>0 AND "+predicate+
            " UNION ALL SELECT DISTINCT "+fields+source+" CROSS JOIN owner_cap "
            "WHERE admission.ok AND (owner_cap.capabilities & "+n(unique_mask)+")=0 AND "+predicate+"),";
    }else out+="active AS MATERIALIZED (SELECT DISTINCT "+std::string(fields)+source+
        " WHERE admission.ok AND "+predicate+"),";
    out+=plan.prefix_ctes;
    out+="statistics AS MATERIALIZED (SELECT count(*) n,"
        "coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+CASE WHEN "+text_carrier(values)+" THEN octet_length(v_s) ELSE 0 END),0) string_bytes,"
        "coalesce(max(octet_length(encode(e))),0) e_bytes,coalesce(max(octet_length(encode(a))),0) a_bytes,"
        "coalesce(max(CASE WHEN "+text_carrier(values)+" THEN octet_length(v_s) ELSE 0 END),0) v_bytes"+plan.statistics_extra+" FROM active),";
    out+=plan.proof_ctes;
    out+="mode AS MATERIALIZED (SELECT CASE WHEN NOT ("+plan.proof_guard+") "
        "THEN error('TD_E_QUERY_SCALE_LIMIT: scalable SQL intermediate exceeds logical budget') "
        "WHEN NOT ("+plan.domain_guard+") THEN error('TD_E_QUERY_SCALE_UNSUPPORTED: scalable SQL aggregate domain is unproved') "
        "WHEN ("+plan.rows_bound+")>"+n(output_rows)+" OR ("+plan.rows_bound+")*("+
        n(static_cast<int64_t>(plan.arity*256+128))+"+6*("+plan.extra_bytes+"))>"+n(output_bytes)+
        " THEN error('TD_E_QUERY_SCALE_LIMIT: scalable SQL output exceeds logical budget') ELSE TRUE END use_sql "
        "FROM "+plan.statistics_source+" CROSS JOIN admission CROSS JOIN integrity),";
    out+=plan.answer_ctes;
    return out+"sql_answer AS MATERIALIZED ("+plan.answer_sql+")";
}
}
std::string scalable_sql(const std::string &program,int64_t valid,int64_t known,int64_t input_facts,
        int64_t intermediate_rows,int64_t intermediate_bytes,int64_t output_rows,int64_t output_bytes,
        int64_t control,bool parameter_control,ValueProfile values){
    validate_query(program,valid,known);
    if(input_facts<1||input_facts>1000000000||intermediate_rows<1||intermediate_rows>1000000000||
        intermediate_bytes<1||intermediate_bytes>1099511627776LL||output_rows<1||output_rows>100000||
        output_bytes<1||output_bytes>16777216||control<0)
        throw Error("TD_E_QUERY_SCALE_LIMIT: invalid scalable SQL budget");
    const auto ir=compile_program_ir_v2(program,true,values);
    const SqlPlanLimits limits{true,intermediate_rows,intermediate_bytes,intermediate_rows+1,values};
    const bool current_unique=TD_CURRENT_UNIQUE_FAST_PATH&&known==-1;
    const bool all_cut_unique=TD_ALL_CUT_UNIQUE_FAST_PATH;
    const auto unique_mask=(current_unique?1:0)|(all_cut_unique?2:0);
    auto plan=scan_plan(ir,true,values);
    if(plan)plan->rows_bound=plan->matched_rows_bound;
    if(!plan)plan=union_scan_plan(ir,limits);
    if(!plan)plan=join_plan(ir,limits);
    if(!plan)plan=anti_join_plan(ir,limits);
    if(!plan)plan=count_plan(ir,limits,TD_STREAMING_SOURCE_FAST_PATH&&unique_mask);
    if(!plan)throw Error("TD_E_QUERY_SCALE_UNSUPPORTED: scalable SQL requires a supported scan, join, anti join or complete-source aggregate");
    auto out=scalable_query_ctes(ir,*plan,valid,known,input_facts,intermediate_rows,intermediate_bytes,
        output_rows,output_bytes,control,parameter_control,unique_mask,values);
    out+=" SELECT known,'sql' route,";
    const auto reason=plan->reason=="proved_single_atom"?"scalable_single_atom":plan->reason=="proved_edb_join"?"scalable_edb_join":
        plan->reason=="proved_edb_anti_join"?"scalable_anti_join":
        plan->reason=="proved_edb_union"?"scalable_edb_union":plan->reason=="proved_count"?"scalable_count":"scalable_aggregate";
    const auto owned_reason=std::string("owned_")+reason;
    if(unique_mask){
        out+="CASE ";
        if(all_cut_unique)out+="WHEN ((SELECT capabilities FROM owner_cap) & 2)<>0 THEN "+
            td::sql::literal(std::string("owned_allcut_unique_")+reason)+" ";
        if(current_unique)out+="WHEN ((SELECT capabilities FROM owner_cap) & 1)<>0 THEN "+
            td::sql::literal(std::string("owned_unique_")+reason)+" ";
        out+="ELSE "+td::sql::literal(owned_reason)+" END";
    }
    else out+=td::sql::literal(owned_reason);
    out+=" reason,NULL::BIGINT rounds,NULL::BIGINT derived_facts,NULL::BIGINT work,"
        "CASE WHEN r.present THEN "+plan->tuple_sql+" END tuple_json "
        "FROM cuts CROSS JOIN mode LEFT JOIN sql_answer r ON TRUE WHERE use_sql ORDER BY "+plan->order_sql;
    return out;
}
std::string lookup_sql(const std::string &program,const std::string &attribute,
        int64_t valid,int64_t known,int64_t input_facts,int64_t candidates,int64_t control){
    validate_query(program,valid,known);
    if(attribute.empty())throw Error("TD_E_QUERY_INPUT: lookup attribute must be nonempty");
    detail::validate_typed_text(attribute);
    if(input_facts<1||input_facts>10000000||candidates<1||candidates>100000||control<0)
        throw Error("TD_E_QUERY_LOOKUP_LIMIT: invalid temporal lookup budget");
    constexpr auto values=ValueProfile::AllValues;
    constexpr int64_t driver_intermediates=1000000;
    constexpr int64_t driver_bytes=67108864;
    const SqlPlanLimits limits{true,driver_intermediates,driver_bytes,driver_intermediates+1,values};
    const auto ir=compile_program_ir_v2(program,true,values);
    auto plan=scan_plan(ir,true,values);
    if(plan)plan->rows_bound=plan->matched_rows_bound;
    else plan=join_plan(ir,limits);
    if(!plan||plan->arity<3)
        throw Error("TD_E_QUERY_LOOKUP_UNSUPPORTED: temporal lookup requires a positive EAV driver with at least 3 columns");
    const auto n=[](int64_t v){return std::to_string(v);};
    auto out=scalable_query_ctes(ir,*plan,valid,known,input_facts,driver_intermediates,driver_bytes,
        10000,16777216,control,false,0,values);
    std::string payload_bytes="0",typed_select,columns,wire_order,tuple_sql="CAST(to_json([";
    constexpr char suffixes[]="tsbif";
    const auto slots=source_slots(2,"f");
    for(size_t i=3;i<=plan->arity;++i){
        const auto name="h"+std::to_string(i);
        if(i<plan->arity)payload_bytes+="+coalesce(octet_length("+name+"s),0)";
        for(size_t slot=0;slot<5;++slot){
            const auto column=name+suffixes[slot];
            typed_select+=","+(i==plan->arity?slots[slot]+" "+column:"d."+column);
            if(!columns.empty()){columns+=',';wire_order+=',';}
            columns+=column;wire_order+="r."+column;
        }
        if(i>3)tuple_sql+=',';
        tuple_sql+=tuple_cell_sql("r."+name,values);
    }
    tuple_sql+="]) AS VARCHAR)";
    // Any exact driver point lies inside these per-entity envelopes. Use the
    // same necessary half-open predicates for admission and materialization.
    const auto feature_predicate="encode(a)=encode("+td::sql::literal(attribute)+") AND tx_from<=known"
        " AND valid_from<=k.max_valid AND k.min_valid<valid_to"
        " AND tx_from<=k.max_known AND k.min_known<tx_to";
    out+=",driver_domain AS MATERIALIZED (SELECT CASE WHEN count(*) FILTER(WHERE h0t<>1 OR h1t<>3 OR h2t<>3 "
        "OR h1i=9223372036854775807 OR h2i<0 OR h2i>known)>0 "
        "THEN error('TD_E_QUERY_INPUT: temporal lookup requires a text entity and two int64 cuts within outer knowledge') "
        "ELSE TRUE END ok,coalesce(max("+payload_bytes+"),0) payload_bytes FROM sql_answer CROSS JOIN cuts),"
        "driver_keys AS MATERIALIZED (SELECT h0s entity,count(*) drivers,"
        "min(h1i) min_valid,max(h1i) max_valid,min(h2i) min_known,max(h2i) max_known "
        "FROM sql_answer,driver_domain WHERE driver_domain.ok GROUP BY h0s),"
        "feature_counts AS MATERIALIZED (SELECT k.entity,k.drivers,count(*) n,"
        "max(coalesce(octet_length(v_s),0)) value_bytes,"
        "sum(120::HUGEINT+octet_length(encode(e))+octet_length(encode(a))+coalesce(octet_length(v_s),0)) bytes "
        "FROM main.assertions JOIN driver_keys k ON encode(e)=k.entity CROSS JOIN cuts "
        "WHERE "+feature_predicate+" GROUP BY k.entity,k.drivers),"
        "feature_stats AS MATERIALIZED (SELECT coalesce(sum(n),0) n,coalesce(sum(bytes),0) bytes,"
        "coalesce(sum(n::HUGEINT*drivers),0) pairs,coalesce(max(value_bytes),0) value_bytes FROM feature_counts),"
        "feature_admission AS MATERIALIZED (SELECT CASE WHEN feature_stats.n+input_statistics.n>"+n(input_facts)+" OR bytes>67108864 OR pairs>"+n(candidates)+
        " OR pairs*("+n(64+80*(plan->arity-2))+"+6*(value_bytes+payload_bytes))>16777216 "
        "THEN error('TD_E_QUERY_LOOKUP_LIMIT: temporal lookup candidates exceed admission') ELSE TRUE END ok "
        "FROM feature_stats CROSS JOIN input_statistics CROSS JOIN driver_domain WHERE driver_domain.ok),"
        "features AS MATERIALIZED (SELECT encode(e) entity,v_tag,v_s,v_b,v_i,v_f,valid_from,valid_to,tx_from,tx_to,"
        "("+invalid_profile(values)+") invalid FROM main.assertions JOIN driver_keys k ON encode(e)=k.entity "
        "CROSS JOIN cuts CROSS JOIN feature_admission WHERE feature_admission.ok AND "+feature_predicate+"),"
        "candidate_answers AS MATERIALIZED (SELECT f.invalid"+typed_select+" FROM sql_answer d JOIN features f "
        "ON d.h0s=f.entity AND f.valid_from<=d.h1i AND d.h1i<f.valid_to AND f.tx_from<=d.h2i AND d.h2i<f.tx_to),"
        "lookup_domain AS MATERIALIZED (SELECT CASE WHEN count(*) FILTER(WHERE invalid)>0 THEN "+profile_error(values)+
        " ELSE TRUE END ok FROM candidate_answers),"
        "lookup_answer AS MATERIALIZED (SELECT DISTINCT TRUE present,"+columns+
        " FROM candidate_answers CROSS JOIN lookup_domain WHERE lookup_domain.ok) "
        "SELECT known,'sql' route,'owned_temporal_lookup' reason,NULL::BIGINT rounds,NULL::BIGINT derived_facts,NULL::BIGINT work,"
        "CASE WHEN r.present THEN "+tuple_sql+" END tuple_json "
        "FROM cuts CROSS JOIN mode CROSS JOIN feature_admission CROSS JOIN lookup_domain "
        "LEFT JOIN lookup_answer r ON TRUE WHERE use_sql AND feature_admission.ok AND lookup_domain.ok ORDER BY "+wire_order;
    return out;
}

}

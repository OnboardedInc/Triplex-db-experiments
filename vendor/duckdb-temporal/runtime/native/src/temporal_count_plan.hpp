// SPDX-License-Identifier: MIT
// Complete-source aggregates; see native complete_aggregate and the proof docs.
#pragma once
#include "temporal_join_plan.hpp"
#include <set>

// Isolated A/B experiment. Promotion requires paired full-call measurements.
#ifndef TD_IDENTITY_COUNT_FAST_PATH
#define TD_IDENTITY_COUNT_FAST_PATH 0
#endif
#ifndef TD_INJECTIVE_PROJECTION_FAST_PATH
#define TD_INJECTIVE_PROJECTION_FAST_PATH 0
#endif
#ifndef TD_STREAMING_SOURCE_FAST_PATH
#define TD_STREAMING_SOURCE_FAST_PATH 0
#endif

namespace td::store_query {
inline std::optional<std::string> injective_projection_predicate(const PlanRuleV2 &source){
    if(source.positive_body.size()!=1)return std::nullopt;
    const auto &body=source.positive_body[0];
    if(body.relation!=0||body.terms.size()!=3)return std::nullopt;
    std::set<uint32_t> variables,projection;
    std::string predicate="TRUE";
    for(size_t column=0;column<3;++column){
        const auto &term=body.terms[column].value;
        if(const auto variable=std::get_if<uint32_t>(&term)){
            if(!variables.insert(*variable).second)return std::nullopt;
        }else{
            const auto &value=std::get<Value>(term);
            if(column!=1||value.tag()!=ValueTag::String)return std::nullopt;
            predicate="encode(a) IS NOT DISTINCT FROM encode("+td::sql::literal(value.as_str())+")";
        }
    }
    for(const auto &term:source.head.terms){
        const auto variable=std::get_if<uint32_t>(&term.value);
        if(!variable||!projection.insert(*variable).second)return std::nullopt;
    }
    if(projection!=variables)return std::nullopt;
    return predicate;
}

inline std::optional<ScanPlan> count_plan(const ProgramIRV2 &ir,const SqlPlanLimits &limits={},bool streaming_allowed=false){
    const bool expanded=limits.values==ValueProfile::AllValues;
    if(!ir.facts.empty()||(ir.rules.size()!=1&&ir.rules.size()!=2))return std::nullopt;
    const PlanRuleV2 *aggregate=nullptr;
    for(const auto &rule:ir.rules)if(rule.head.relation==ir.answer_relation)aggregate=&rule;
    if(!aggregate||aggregate->head.terms.empty()||aggregate->positive_body.size()!=1||!aggregate->negative_body.empty()||aggregate->filter_count)return std::nullopt;
    const auto *spec=std::get_if<PlanAggregateOutputV2>(&aggregate->head.terms.back().value);
    if(!spec||spec->key_columns.size()+1!=aggregate->head.terms.size())return std::nullopt;
    const bool count=spec->op==PlanAggregateOpV2::Count,sum=spec->op==PlanAggregateOpV2::SumI64;
    PlanRuleV2 source{};const bool direct=spec->source_relation==0;
    if(direct){
        if(ir.rules.size()!=1||ir.relations.size()!=2)return std::nullopt;
        source.positive_body=aggregate->positive_body;
        for(const auto &term:aggregate->positive_body[0].terms){
            if(!std::holds_alternative<uint32_t>(term.value))return std::nullopt;
            source.head.terms.push_back({std::get<uint32_t>(term.value)});
        }
    }else{
        if(ir.rules.size()!=2||ir.relations.size()!=3)return std::nullopt;
        bool found=false;
        for(const auto &rule:ir.rules)if(rule.head.relation==spec->source_relation){source=rule;found=true;}
        if(!found)return std::nullopt;
    }
    const bool joined=source.positive_body.size()>1;
    if(joined&&(!limits.scalable||!expanded||source.filter_count))return std::nullopt;
    const auto injective_predicate=injective_projection_predicate(source);
    const bool deduplicate=!(TD_INJECTIVE_PROJECTION_FAST_PATH&&limits.scalable&&injective_predicate);
    const std::string source_gate="(SELECT source_ok FROM source_gate)";
    auto projected=joined?join_rule_plan(source,limits,source_gate):
        projection_plan(source,source_gate,deduplicate,false,limits.values);
    if(!projected)return std::nullopt;
    const auto identity_predicate=TD_IDENTITY_COUNT_FAST_PATH&&limits.scalable&&count&&spec->key_columns.empty()?
        injective_predicate:std::nullopt;
    if(!count&&(!spec->measure_column||*spec->measure_column>=source.head.terms.size()))return std::nullopt;
    ScanPlan plan;plan.arity=aggregate->head.terms.size();plan.reason=count?"proved_count":"proved_aggregate";
    plan.streaming_source=streaming_allowed&&limits.scalable&&!deduplicate&&!identity_predicate;
    plan.fallback=count?"count_budget_unproved":"aggregate_budget_unproved";
    plan.constant_count=projected->constant_count;plan.constant_bytes=projected->constant_bytes;
    plan.dictionary_extra=count||sum?"statistics.groups_n":"0";plan.rows_bound="statistics.groups_n";
    plan.facts_bound="statistics.n+statistics.groups_n";
    plan.work_bound=count?"statistics.n+statistics.groups_n":"2*statistics.n+2*statistics.groups_n";
    if(!direct){plan.facts_bound+="+statistics.source_n";
        plan.work_bound=count?"statistics.n+statistics.source_n+statistics.groups_n":"statistics.n+2*statistics.source_n+2*statistics.groups_n";}
    const auto maximum_text=[&](size_t column){
        const auto &term=source.head.terms.at(column).value;
        if(std::holds_alternative<Value>(term)){
            return std::to_string(text_bytes(std::get<Value>(term)));
        }
        const auto variable=std::get<uint32_t>(term);
        for(const auto &atom:source.positive_body)
            for(size_t c=0;c<3;++c){const auto &body=atom.terms[c].value;
                if(std::holds_alternative<uint32_t>(body)&&std::get<uint32_t>(body)==variable)
                    return "statistics."+std::string(c==0?"e_bytes":c==1?"a_bytes":"v_bytes");}
        throw Error("TD_E_PLAN: count projection variable has no source");
    };
    const auto source_slots_at=[](size_t column){
        const auto p="c.h"+std::to_string(column);return Slots{p+'t',p+'s',p+'b',p+'i',p+'f'};
    };
    std::string groups="SELECT TRUE present",group_by,group_order;constexpr char suffixes[]="tsbif";
    if(!count)groups+=",count(*) source_rows";
    if(limits.scalable&&!count&&!sum){
        const auto tag=source_slots_at(*spec->measure_column)[0];
        groups+=",min("+tag+") measure_tag_min,max("+tag+") measure_tag_max,bool_or("+tag+"=2) measure_boolean";
        if(expanded)groups+=",bool_or("+tag+"=5) measure_reference,bool_or("+tag+"=7) measure_json,"
            "bool_or("+tag+"=8) measure_blob";
    }
    plan.tuple_sql="CAST(to_json([";plan.extra_bytes="0";
    for(size_t i=0;i<plan.arity;++i){
        Slots slots;
        if(i+1==plan.arity){
            if(count)slots={"3::UTINYINT","NULL::BLOB","NULL::BOOLEAN","count(*)::BIGINT","NULL::DOUBLE"};
            else{
                const auto measure=source_slots_at(*spec->measure_column);
                if(sum)slots={"3::UTINYINT","NULL::BLOB","NULL::BOOLEAN",
                    "try_cast(coalesce(sum("+measure[3]+"::HUGEINT),0::HUGEINT) AS BIGINT)","NULL::DOUBLE"};
                else{
                    const std::string op=spec->op==PlanAggregateOpV2::Min?"min":"max";
                    slots={"coalesce(min("+measure[0]+"),3::UTINYINT)",op+'('+measure[1]+')',"NULL::BOOLEAN",
                        op+'('+measure[3]+')',op+'('+measure[4]+')'};
                    plan.extra_bytes+='+'+maximum_text(*spec->measure_column);
                }
            }
        }
        else{
            const auto column=spec->key_columns.at(i);slots=source_slots_at(column);plan.extra_bytes+='+'+maximum_text(column);
            for(const auto &slot:slots){if(!group_by.empty())group_by+=',';group_by+=slot;}
        }
        const auto prefix="h"+std::to_string(i);
        for(size_t j=0;j<5;++j){const auto name=prefix+suffixes[j];groups+=","+slots[j]+" "+name;
            if(!plan.order_sql.empty())plan.order_sql+=',';plan.order_sql+="r."+name;
            if(i+1<plan.arity){if(!group_order.empty())group_order+=',';group_order+=name;}}
        if(i)plan.tuple_sql+=',';const auto ref="r."+prefix;
        plan.tuple_sql+=tuple_cell_sql(ref,limits.values);
    }
    plan.tuple_sql+="]) AS VARCHAR)";
    groups+=identity_predicate?" FROM active c WHERE (SELECT source_ok FROM source_gate) AND "+*identity_predicate:
        " FROM count_source c";
    if(!group_by.empty())groups+=" GROUP BY "+group_by;
    const auto &budget=ir.budget_model;const auto arity=source.head.terms.size();
    const std::string source_bound=joined?projected->rows_bound:"statistics.n";
    const std::string group_bound=spec->key_columns.empty()?"1":source_bound;
    // Gate projected inputs BEFORE DISTINCT/group construction. In particular,
    // a repeated wide constant must not allocate a large unproved intermediate.
    auto guard="admission.ok AND integrity.ok AND statistics.n*"+std::to_string(5*arity+1)+"<=800000 AND statistics.n*("+
        std::to_string(budget.typed_output_row_bytes.at(arity))+"+("+projected->extra_bytes+"))<=33554432 AND ("+group_bound+")*"+
        std::to_string(5*plan.arity+(count?1:2))+"<=800000 AND ("+group_bound+")*("+std::to_string(budget.typed_output_row_bytes.at(plan.arity)+(count?0:8))+"+("+
        plan.extra_bytes+"))<=33554432";
    if(limits.scalable){
        const auto row_bytes=std::to_string(budget.typed_output_row_bytes.at(arity));
        // An injective projection copies each input carrier at most once. The
        // measured bytes of all active carriers also cover a dropped fixed
        // attribute. Retain the worst-width bound for every other projection.
        const auto projected_bytes=expanded&&injective_predicate?
            "statistics.n::HUGEINT*"+row_bytes+"+statistics.string_bytes":
            source_bound+"*("+row_bytes+"+("+projected->extra_bytes+"))";
        guard="admission.ok AND integrity.ok AND "+source_bound+"<="+std::to_string(limits.intermediate_rows)+
            " AND ("+projected_bytes+")<="+
            std::to_string(limits.intermediate_bytes)+" AND ("+group_bound+")<="+std::to_string(limits.intermediate_rows)+
            " AND ("+group_bound+")*("+std::to_string(budget.typed_output_row_bytes.at(plan.arity)+(count?0:sum?8:32))+"+("+
            plan.extra_bytes+"))<="+std::to_string(limits.intermediate_bytes);
        if(joined)guard+=" AND ("+projected->proof_guard+")";
    }
    std::string measure_ok="TRUE";
    if(!count){
        const auto measure=source_slots_at(*spec->measure_column);
        measure_ok=sum?"coalesce(bool_and("+measure[0]+"=3),TRUE)":
            "coalesce(min("+measure[0]+")=max("+measure[0]+") AND min("+measure[0]+") IN"+
            (expanded?"(1,3,4,6)":"(1,3,4)")+",TRUE)";
        measure_ok="(SELECT "+measure_ok+" FROM count_source c)";
        if(sum){
            const auto range_error="EXISTS(SELECT 1 FROM count_groups WHERE h"+std::to_string(plan.arity-1)+"i IS NULL)";
            if(limits.scalable){
                measure_ok="CASE WHEN NOT "+measure_ok+" THEN error('TD_E_AGG_MEASURE_TAG: sum_i64 requires only int64 measures') "
                    "WHEN "+range_error+" THEN error('TD_E_AGG_SUM_RANGE: final sum_i64 is outside signed int64 range') ELSE TRUE END";
            }else measure_ok+=" AND NOT "+range_error;
        }else if(limits.scalable){
            const auto first_error=std::string("(SELECT CASE WHEN measure_boolean THEN 'boolean' ")+
                (expanded?"WHEN measure_reference THEN 'reference' WHEN measure_json THEN 'json' WHEN measure_blob THEN 'blob' ":"")+
                "ELSE 'mixed' END FROM count_groups WHERE measure_boolean OR "+
                (expanded?"measure_reference OR measure_json OR measure_blob OR ":"")+"measure_tag_min<>measure_tag_max"+
                (group_order.empty()?std::string():" ORDER BY "+group_order)+" LIMIT 1)";
            measure_ok="CASE "+first_error+
                " WHEN 'boolean' THEN error('TD_E_AGG_MEASURE_TAG: min/max do not accept boolean measures') "+
                (expanded?"WHEN 'reference' THEN error('TD_E_AGG_MEASURE_TAG: min/max do not accept reference measures') "
                    "WHEN 'json' THEN error('TD_E_AGG_MEASURE_TAG: min/max do not accept JSON measures') "
                    "WHEN 'blob' THEN error('TD_E_AGG_MEASURE_TAG: min/max do not accept blob measures') ":"")+
                "WHEN 'mixed' THEN error('TD_E_AGG_MIXED_TAGS: min/max group has multiple measure tags') ELSE TRUE END";
        }
    }
    // Gate the materialized atom inputs before the join can generate bindings.
    // The join projects DISTINCT over the full producer tuple before grouping.
    plan.prefix_ctes=projected->prefix_ctes;
    plan.statistics_extra=projected->statistics_extra;
    plan.proof_ctes=projected->proof_ctes+"source_gate AS MATERIALIZED (SELECT "+guard+" source_ok FROM "+
        projected->statistics_source+" CROSS JOIN admission CROSS JOIN integrity),"+projected->answer_ctes;
    if(!identity_predicate)plan.proof_ctes+="count_source AS "+std::string(plan.streaming_source?"NOT MATERIALIZED":"MATERIALIZED")+
        " ("+projected->answer_sql+"),";
    const auto source_count=identity_predicate?"(SELECT h0i FROM count_groups)":"(SELECT count(*) FROM count_source)";
    plan.proof_ctes+="count_groups AS MATERIALIZED ("+groups+"),"
        "count_statistics AS MATERIALIZED (SELECT statistics.*,source_gate.source_ok,"+source_count+" source_n,"
        "(SELECT count(*) FROM count_groups) groups_n,("+measure_ok+") measure_ok FROM "+projected->statistics_source+
        " CROSS JOIN source_gate),";
    plan.statistics_source="count_statistics AS statistics";plan.proof_guard="statistics.source_ok AND statistics.measure_ok";
    if(limits.scalable){plan.proof_guard="statistics.source_ok";plan.domain_guard="statistics.measure_ok";}
    plan.answer_sql="SELECT * FROM count_groups WHERE (SELECT use_sql FROM mode)";
    if(!count&&!sum)plan.answer_sql+=" AND source_rows>0";
    return plan;
}
}

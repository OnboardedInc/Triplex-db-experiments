// SPDX-License-Identifier: MIT
// Whole-program lowering for one ordinary answer rule over one EAV atom.
#pragma once
#include "temporal_plan_ir_v2.hpp"
#include "temporal_sql.hpp"
#include "temporal_float.hpp"
#include <map>

namespace td::store_query {
struct SqlPlanLimits {
    bool scalable=false;
    int64_t intermediate_rows=100000;
    int64_t intermediate_bytes=33554432;
    int64_t saturation=50000001;
    ValueProfile values=ValueProfile::FourTag;
};
struct ScanPlan {
    std::string answer_sql,tuple_sql,order_sql,extra_bytes;
    std::string prefix_ctes,statistics_extra,proof_ctes,answer_ctes;
    std::string statistics_source="statistics",rows_bound="statistics.n",facts_bound="2*statistics.n",work_bound="2*statistics.n+1",proof_guard="TRUE";
    std::string matched_rows_bound;
    std::string domain_guard="TRUE";
    std::string reason="proved_single_atom",fallback="single_atom_budget_unproved";
    std::string dictionary_extra="0";
    size_t arity=0,constant_count=0,constant_bytes=0;
    bool streaming_source=false;
};
using Slots=std::array<std::string,5>;
inline size_t text_bytes(const Value &value){
    return text_carrier_tag(value.tag())?value.carrier_text().size():0;
}
inline std::string tuple_cell_sql(const std::string &ref,ValueProfile values){
    const auto floating=values==ValueProfile::AllValues?" IN(4,6)":"=4";
    return "struct_pack(tag:="+ref+"t,s:=decode("+ref+"s),b:="+ref+"b,i:="+ref+"i::VARCHAR,f:=CASE WHEN "+ref+
        "t"+floating+" THEN system.main.td_float_bits_v1("+ref+"f) END)";
}
inline Slots source_slots(size_t column,const std::string &alias=""){
    const auto p=alias.empty()?"":alias+".";
    if(column<2)return {"1::UTINYINT","encode("+p+(column==0?"e":"a")+")","NULL::BOOLEAN","NULL::BIGINT","NULL::DOUBLE"};
    return {p+"v_tag",p+"v_s",p+"v_b",p+"v_i",p+"v_f"};
}
inline Slots constant_slots(const Value &v){
    Slots out{std::to_string(static_cast<unsigned>(v.tag()))+"::UTINYINT","NULL::BLOB","NULL::BOOLEAN","NULL::BIGINT","NULL::DOUBLE"};
    switch(v.tag()){
    case ValueTag::String: case ValueTag::Reference: case ValueTag::Json: case ValueTag::Blob:
        out[1]="encode("+td::sql::literal(v.carrier_text())+")";break;
    case ValueTag::Boolean:out[2]=v.as_bool()?"TRUE":"FALSE";break;
    case ValueTag::Int64:out[3]=td::sql::literal(std::to_string(v.as_i64()))+"::BIGINT";break;
    case ValueTag::DateTime:
    case ValueTag::Float64:{
        const auto raw=detail::canonical_float_bits(detail::float_bits(v.tag()==ValueTag::DateTime?v.as_datetime():v.as_f64()));
        constexpr char digits[]="0123456789abcdef";std::string bits(16,'0');
        for(size_t i=0;i<16;++i)bits[i]=digits[(raw>>((15-i)*4))&15];
        out[4]="system.main.td_float_from_bits_v1("+td::sql::literal(bits)+")";break;
    }
    }
    return out;
}
inline const char *ordered_comparison_sql(PlanComparisonOpV2 op){
    switch(op){
    case PlanComparisonOpV2::Less:return "<";
    case PlanComparisonOpV2::LessEqual:return "<=";
    case PlanComparisonOpV2::Greater:return ">";
    case PlanComparisonOpV2::GreaterEqual:return ">=";
    default:return nullptr;
    }
}
inline std::optional<ScanPlan> projection_plan(const PlanRuleV2 &rule,const std::string &gate="(SELECT use_sql FROM mode)",
        bool deduplicate=true,bool allow_comparisons=false,ValueProfile values=ValueProfile::FourTag,
        const char *answer_source="active"){
    if(rule.positive_body.size()!=1||!rule.negative_body.empty()||
        (rule.filter_count&&(!allow_comparisons||rule.simple_comparisons.size()!=rule.filter_count)))
        return std::nullopt;
    const auto &body=rule.positive_body[0];
    if(body.relation!=0||body.terms.size()!=3||rule.head.terms.empty())return std::nullopt;
    for(const auto &head:rule.head.terms)if(!head.relational())return std::nullopt;
    ScanPlan plan;plan.arity=rule.head.terms.size();
    std::map<uint32_t,size_t> variables;std::string condition="TRUE";
    const auto equal=[](std::string &predicate,const Slots &a,const Slots &b){
        for(size_t i=0;i<a.size();++i)predicate+=" AND "+a[i]+" IS NOT DISTINCT FROM "+b[i];
    };
    for(size_t i=0;i<3;++i){
        const auto &term=body.terms[i].value;
        if(std::holds_alternative<uint32_t>(term)){
            const auto [found,inserted]=variables.emplace(std::get<uint32_t>(term),i);
            if(!inserted)equal(condition,source_slots(i),source_slots(found->second));
        }else{
            const auto &v=std::get<Value>(term);equal(condition,source_slots(i),constant_slots(v));
            ++plan.constant_count;plan.constant_bytes+=text_bytes(v);
        }
    }
    if(rule.filter_count){
        const auto slots=[&](const PlanTerm &term){
            if(const auto variable=std::get_if<uint32_t>(&term.value))return source_slots(variables.at(*variable));
            return constant_slots(std::get<Value>(term.value));
        };
        std::string predicates,invalid_tags;
        for(const auto &comparison:rule.simple_comparisons){
            const auto left=slots(comparison.left),right=slots(comparison.right);
            if(comparison.op==PlanComparisonOpV2::Equal||comparison.op==PlanComparisonOpV2::NotEqual){
                std::string same="TRUE";
                equal(same,left,right);
                predicates+=comparison.op==PlanComparisonOpV2::Equal?" AND (":" AND NOT (";
                predicates+=same+")";
                continue;
            }
            const auto op=ordered_comparison_sql(comparison.op);
            const auto *left_literal=std::get_if<Value>(&comparison.left.value);
            const auto *right_literal=std::get_if<Value>(&comparison.right.value);
            if(!op||(!left_literal&&!right_literal)||(left_literal&&right_literal))return std::nullopt;
            const auto tag=(left_literal?left_literal:right_literal)->tag();
            if(tag==ValueTag::Json||tag==ValueTag::Blob){
                // These operands cannot have an ordering domain. Every full
                // relational match is an eager type fault, even after false.
                if(!invalid_tags.empty())invalid_tags+=" OR ";
                invalid_tags+="TRUE";
                predicates+=" AND FALSE";
                continue;
            }
            const bool floating=values==ValueProfile::AllValues&&(tag==ValueTag::Float64||tag==ValueTag::DateTime);
            if(tag!=ValueTag::String&&tag!=ValueTag::Int64&&!floating)return std::nullopt;
            const auto &bound=left_literal?right:left;
            const auto slot=floating?4:tag==ValueTag::String?1:3;
            const auto type_ok=bound[0]+" = "+std::to_string(static_cast<unsigned>(tag));
            if(!invalid_tags.empty())invalid_tags+=" OR ";
            invalid_tags+="NOT ("+type_ok+")";
            predicates+=" AND ("+type_ok+" AND "+left[slot]+" "+op+" "+right[slot]+")";
        }
        // Domain checks see all complete relational matches. A false filter
        // or a duplicate projection must not suppress an eager type error.
        if(!invalid_tags.empty()){
            plan.statistics_extra+=",count(*) FILTER(WHERE "+condition+" AND ("+invalid_tags+")) comparison_type_faults";
            plan.domain_guard="CASE WHEN statistics.comparison_type_faults>0 THEN "
                "error('TD_E_EXPR_TYPE: operator is incompatible with operand tags') ELSE TRUE END";
        }
        condition+=predicates;
        plan.statistics_extra+=",count(*) FILTER(WHERE "+condition+") comparison_matches";
        plan.matched_rows_bound="statistics.comparison_matches";
    }
    constexpr char suffixes[]="tsbif";std::string select=deduplicate?"SELECT DISTINCT TRUE present":"SELECT TRUE present";
    plan.tuple_sql="CAST(to_json([";plan.extra_bytes="0";
    for(size_t i=0;i<plan.arity;++i){
        const auto &term=rule.head.terms[i].value;Slots slots;
        if(std::holds_alternative<uint32_t>(term)){
            const auto column=variables.at(std::get<uint32_t>(term));slots=source_slots(column);
            plan.extra_bytes+="+statistics."+std::string(column==0?"e_bytes":column==1?"a_bytes":"v_bytes");
        }else{
            const auto &v=std::get<Value>(term);slots=constant_slots(v);++plan.constant_count;
            const auto bytes=text_bytes(v);plan.constant_bytes+=bytes;
            if(bytes)plan.extra_bytes+='+'+std::to_string(bytes);
        }
        const auto prefix="h"+std::to_string(i);
        for(size_t j=0;j<5;++j){
            const auto name=prefix+suffixes[j];select+=","+slots[j]+" "+name;
            if(!plan.order_sql.empty())plan.order_sql+=',';plan.order_sql+="r."+name;
        }
        if(i)plan.tuple_sql+=',';
        const auto ref="r."+prefix;
        plan.tuple_sql+=tuple_cell_sql(ref,values);
    }
    plan.tuple_sql+="]) AS VARCHAR)";
    if(plan.matched_rows_bound.empty())plan.matched_rows_bound="(SELECT count(*) FROM active WHERE "+condition+")";
    plan.answer_sql=select+" FROM "+answer_source+" WHERE "+gate+" AND "+condition;
    return plan;
}
// The rules have no dependencies on each other. DuckDB unions complete typed
// tuples. Admission counts possible branch outputs before set deduplication.
inline std::optional<ScanPlan> union_scan_plan(const ProgramIRV2 &ir,const SqlPlanLimits &limits={}){
    if(limits.values!=ValueProfile::AllValues||ir.rules.size()<2||ir.rules.size()>4||
        !ir.facts.empty()||ir.relations.size()!=2)return std::nullopt;
    ScanPlan plan;plan.reason="proved_edb_union";plan.fallback="edb_union_budget_unproved";
    plan.rows_bound="(0::BIGINT";plan.extra_bytes="greatest(0";
    for(const auto &rule:ir.rules){
        if(rule.head.relation!=ir.answer_relation)return std::nullopt;
        const auto branch=projection_plan(rule,"(SELECT use_sql FROM mode)",false,false,limits.values);
        if(!branch)return std::nullopt;
        if(plan.answer_sql.empty()){
            plan.arity=branch->arity;plan.tuple_sql=branch->tuple_sql;plan.order_sql=branch->order_sql;
        }else plan.answer_sql+=" UNION ";
        plan.answer_sql+="("+branch->answer_sql+")";
        plan.rows_bound+="+"+branch->matched_rows_bound;
        plan.extra_bytes+=","+branch->extra_bytes;
        plan.constant_count+=branch->constant_count;
        plan.constant_bytes+=branch->constant_bytes;
    }
    plan.rows_bound+=")";plan.extra_bytes+=")";
    plan.facts_bound="statistics.n+"+plan.rows_bound;
    plan.work_bound=std::to_string(2*ir.rules.size())+"*statistics.n+1";
    if(limits.scalable)plan.proof_guard=plan.rows_bound+"<="+std::to_string(limits.intermediate_rows)+
        " AND "+plan.rows_bound+"*(120::HUGEINT+"+std::to_string(plan.arity*40)+"+"+
        plan.extra_bytes+")<="+std::to_string(limits.intermediate_bytes);
    return plan;
}
inline std::optional<ScanPlan> scan_plan(const ProgramIRV2 &ir,bool allow_comparisons=false,ValueProfile values=ValueProfile::FourTag){
    if(ir.rules.size()!=1||!ir.facts.empty()||ir.relations.size()!=2||ir.rules[0].head.relation!=ir.answer_relation)return std::nullopt;
    return projection_plan(ir.rules[0],"(SELECT use_sql FROM mode)",true,allow_comparisons,values);
}
}

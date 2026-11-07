// SPDX-License-Identifier: MIT
// One positive EAV atom minus one exact, positively bound EAV membership.
#pragma once

#include "temporal_join_plan.hpp"

namespace td::store_query {
inline std::optional<ScanPlan> anti_join_plan(const ProgramIRV2 &ir,const SqlPlanLimits &limits={}){
    if(ir.rules.size()!=1||!ir.facts.empty()||ir.relations.size()!=2)return std::nullopt;
    const auto &rule=ir.rules.front();
    if(rule.head.relation!=ir.answer_relation||rule.positive_body.size()!=1||rule.negative_body.size()!=1||
        rule.filter_count)return std::nullopt;
    const auto &positive=rule.positive_body.front(),&negative=rule.negative_body.front();
    if(positive.relation!=0||negative.relation!=0||positive.terms.size()!=3||negative.terms.size()!=3)
        return std::nullopt;

    auto projection=rule;
    projection.negative_body.clear();
    const std::string gate="(SELECT use_sql FROM mode)";
    auto plan=projection_plan(projection,gate,true,false,limits.values,"anti_active");
    if(!plan)return std::nullopt; // Includes computed or aggregate heads.

    std::map<uint32_t,size_t> bindings;
    for(size_t column=0;column<positive.terms.size();++column)
        if(const auto variable=std::get_if<uint32_t>(&positive.terms[column].value))
            bindings.emplace(*variable,column);
    std::string membership="TRUE";
    bool correlated=false;
    for(size_t column=0;column<negative.terms.size();++column){
        const auto &term=negative.terms[column].value;
        const auto target=source_slots(column,"denied");
        if(const auto variable=std::get_if<uint32_t>(&term)){
            const auto bound=bindings.find(*variable);
            if(bound==bindings.end())return std::nullopt;
            membership+=" AND "+slots_equal(target,source_slots(bound->second,"kept"));
            correlated=true;
        }else{
            const auto &literal=std::get<Value>(term);
            membership+=" AND "+slots_equal(target,constant_slots(literal));
            ++plan->constant_count;
            plan->constant_bytes+=text_bytes(literal);
        }
    }

    // Materialize admitted input before building either anti-join side.
    // An anti join emits at most one row per left row, regardless of right
    // multiplicity. A ground negative is a single global membership test.
    plan->answer_ctes="anti_input AS MATERIALIZED (SELECT * FROM active WHERE "+gate+"),"
        "anti_active AS (SELECT kept.* FROM anti_input kept";
    if(correlated)plan->answer_ctes+=" ANTI JOIN anti_input denied ON "+membership+"),";
    else plan->answer_ctes+=" WHERE NOT EXISTS (SELECT 1 FROM anti_input denied WHERE "+membership+")),";

    plan->reason="proved_edb_anti_join";
    plan->fallback="anti_join_budget_unproved";
    plan->rows_bound=plan->matched_rows_bound; // Before exclusion and head deduplication.
    plan->facts_bound="statistics.n+"+plan->rows_bound;
    // The authoritative one-pass evaluator scans at most N positive
    // candidates and charges one exact negative lookup per complete match.
    plan->work_bound="2*statistics.n+1";
    plan->proof_guard="statistics.n*120::HUGEINT+statistics.string_bytes<="+
        std::to_string(limits.scalable?limits.intermediate_bytes:33554432);
    if(limits.scalable)plan->proof_guard+=" AND "+plan->rows_bound+"<="+std::to_string(limits.intermediate_rows)+
        " AND "+plan->rows_bound+"*(120::HUGEINT+"+std::to_string(plan->arity*40)+"+"+
        plan->extra_bytes+")<="+std::to_string(limits.intermediate_bytes);
    return plan;
}
}

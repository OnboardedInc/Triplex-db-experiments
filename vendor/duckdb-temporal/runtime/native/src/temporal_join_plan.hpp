// SPDX-License-Identifier: MIT
// Source-coupled proof: see NATIVE-JOIN-PROOF.md and run_completed/evaluate.
#pragma once
#include "temporal_scan_plan.hpp"
#include <set>

namespace td::store_query {
inline std::string slots_equal(const Slots &a,const Slots &b){
    std::string out="TRUE";for(size_t i=0;i<a.size();++i)out+=" AND "+a[i]+" IS NOT DISTINCT FROM "+b[i];return '('+out+')';
}
inline std::string least(const std::vector<std::string> &args){
    std::string out="LEAST(";bool first=true;for(const auto &a:args){if(!first)out+=',';first=false;out+=a;}return out+')';
}
inline std::string saturated_product(const std::string &a,const std::string &b,const SqlPlanLimits &limits={}){
    if(limits.scalable)return "LEAST("+std::to_string(limits.saturation)+",("+a+")::HUGEINT*("+b+")::HUGEINT)";
    return "LEAST(50000001,("+a+")*("+b+"))";
}
inline size_t bit_count(size_t value){size_t n=0;for(;value;value&=value-1)++n;return n;}
inline std::string frequency(const std::string &relation,size_t column){
    const std::string key=column==0?"encode(e)":column==1?"encode(a)":"v_tag,v_s,v_b,v_i,v_f";
    return "(SELECT coalesce(max(occurrences),0) FROM (SELECT count(*) occurrences FROM "+relation+" GROUP BY "+key+") keys)";
}
inline void specialize_star_proof(ScanPlan &plan,const PlanRuleV2 &rule,const SqlPlanLimits &limits,const std::string &gate){
    const auto k=rule.positive_body.size();const auto &first=rule.positive_body[0].terms[0].value;
    if(!std::holds_alternative<uint32_t>(first))return;
    const auto entity=std::get<uint32_t>(first);std::set<uint32_t> values;std::set<std::string> attributes;
    std::vector<std::string> predicates;
    for(const auto &atom:rule.positive_body){
        const auto &e=atom.terms[0].value,&a=atom.terms[1].value,&v=atom.terms[2].value;
        if(!std::holds_alternative<uint32_t>(e)||std::get<uint32_t>(e)!=entity||!std::holds_alternative<Value>(a)||
            std::get<Value>(a).tag()!=ValueTag::String||!std::holds_alternative<uint32_t>(v))return;
        const auto variable=std::get<uint32_t>(v);const auto &attribute=std::get<Value>(a).as_str();
        if(variable==entity||!values.insert(variable).second||!attributes.insert(attribute).second)return;
        predicates.push_back("encode(a) IS NOT DISTINCT FROM encode("+td::sql::literal(attribute)+")");
    }
    const size_t full=(size_t(1)<<k)-1;
    std::string counts="SELECT count(*) g";
    for(size_t i=0;i<k;++i)counts+=",count(*) FILTER(WHERE "+predicates[i]+") r"+std::to_string(i);
    plan.prefix_ctes="entity_counts AS MATERIALIZED ("+counts+" FROM active GROUP BY encode(e)),";
    plan.statistics_extra.clear();plan.answer_ctes.clear();
    std::string aggregate="SELECT ";std::vector<std::string> roots;std::string work="0";
    for(size_t i=0;i<k;++i){
        if(i)aggregate+=',';aggregate+="coalesce(sum(r"+std::to_string(i)+"),0) n"+std::to_string(i);
        roots.push_back("n"+std::to_string(i));
        plan.answer_ctes+="gated_"+std::to_string(i)+" AS MATERIALIZED (SELECT * FROM active WHERE "+gate+" AND "+predicates[i]+"),";
    }
    for(size_t s=1;s<=full;++s){
        std::string product="1::BIGINT";
        for(size_t i=0;i<k;++i)if(s&(size_t(1)<<i))product=saturated_product(product,"r"+std::to_string(i),limits);
        aggregate+=",coalesce(sum("+product+"),0) m"+std::to_string(s);
        if(s!=full){
            aggregate+=",coalesce(sum("+saturated_product(product,"g",limits)+"),0) w"+std::to_string(s);
            work+="+w"+std::to_string(s);
        }
    }
    plan.proof_ctes="star_counts AS MATERIALIZED ("+aggregate+" FROM entity_counts),"
        "join_bounds AS MATERIALIZED (SELECT statistics.*,star_counts.*,LEAST(50000001,2*("+least(roots)+"+"+work+")+1) w FROM statistics CROSS JOIN star_counts),";
    plan.statistics_source="join_bounds AS statistics";
    plan.rows_bound="statistics.m"+std::to_string(full);plan.facts_bound="statistics.n+"+plan.rows_bound;plan.work_bound="statistics.w";
    // The general subset row/cell/byte guards apply unchanged to these bounds.
}
inline std::optional<ScanPlan> join_rule_plan(const PlanRuleV2 &rule,const SqlPlanLimits &limits,const std::string &gate){
    const auto k=rule.positive_body.size();
    const bool reference_join=limits.scalable&&limits.values==ValueProfile::AllValues&&k==2&&
        rule.filter_count==1&&rule.reference_join.has_value();
    if(k<2||k>4||!rule.negative_body.empty()||
        (rule.filter_count&&!reference_join)||rule.head.terms.empty())return std::nullopt;
    for(const auto &a:rule.positive_body)if(a.relation!=0||a.terms.size()!=3)return std::nullopt;
    for(const auto &h:rule.head.terms)if(!h.relational())return std::nullopt;
    ScanPlan plan;plan.arity=rule.head.terms.size();plan.reason="proved_edb_join";plan.fallback="edb_join_budget_unproved";
    std::map<uint32_t,size_t> variable_atoms;
    for(size_t i=0;i<k;++i)for(const auto &t:rule.positive_body[i].terms)
        if(std::holds_alternative<uint32_t>(t.value))variable_atoms[std::get<uint32_t>(t.value)]|=size_t(1)<<i;
    std::set<size_t> global_frequencies;
    std::map<uint32_t,std::pair<size_t,size_t>> origins;
    std::string joined_condition="TRUE",from;
    for(size_t i=0;i<k;++i){
        const auto name="atom_"+std::to_string(i),alias="a"+std::to_string(i);
        std::map<uint32_t,size_t> local;std::string condition="TRUE";
        for(size_t c=0;c<3;++c){
            const auto &term=rule.positive_body[i].terms[c].value;
            const auto suffix=std::to_string(i)+"_"+std::to_string(c);
            if(std::holds_alternative<Value>(term)){
                const auto &v=std::get<Value>(term);const auto eq=slots_equal(source_slots(c),constant_slots(v));
                condition+=" AND "+eq;plan.statistics_extra+=",(SELECT count(*) FROM active WHERE "+eq+") l"+suffix;
                ++plan.constant_count;plan.constant_bytes+=text_bytes(v);
            }else{
                const auto id=std::get<uint32_t>(term);
                const auto [found,inserted]=local.emplace(id,c);
                if(!inserted)condition+=" AND "+slots_equal(source_slots(c),source_slots(found->second));
                const auto [origin,new_var]=origins.emplace(id,std::make_pair(i,c));
                if(!new_var)joined_condition+=" AND "+slots_equal(source_slots(c,alias),source_slots(origin->second.second,"a"+std::to_string(origin->second.first)));
                if(bit_count(variable_atoms.at(id))>1){
                    global_frequencies.insert(c);plan.statistics_extra+=","+frequency(name,c)+" f"+suffix;
                }
            }
        }
        plan.prefix_ctes+=name+" AS MATERIALIZED (SELECT * FROM active WHERE "+condition+"),";
        plan.statistics_extra+=",(SELECT count(*) FROM "+name+") n"+std::to_string(i);
        const auto gated="gated_"+std::to_string(i);
        plan.answer_ctes+=gated+" AS MATERIALIZED (SELECT * FROM "+name+" WHERE "+gate+"),";
        if(i)from+=" CROSS JOIN ";from+=gated+" "+alias;
    }
    std::vector<std::string> reference_bounds;
    if(reference_join){
        for(const auto &entry:variable_atoms)if(bit_count(entry.second)>1)return std::nullopt;
        const auto reference=origins.at(rule.reference_join->reference_variable);
        const auto entity=origins.at(rule.reference_join->entity_variable);
        if(reference.first==entity.first||reference.second!=2||entity.second!=0)return std::nullopt;
        const auto left=std::to_string(reference.first),right=std::to_string(entity.first);
        // Each atom has local constraints, with no shared body variables.
        // A wrong left tag is a complete match exactly when the right has a row.
        plan.domain_guard="CASE WHEN EXISTS(SELECT 1 FROM atom_"+left+" WHERE v_tag<>5) AND "
            "EXISTS(SELECT 1 FROM atom_"+right+") THEN error('TD_E_EXPR_TYPE: operator is incompatible with operand tags') ELSE TRUE END";
        joined_condition+=" AND a"+left+".v_tag=5 AND a"+left+".v_s=encode(a"+right+".e)";
        plan.statistics_extra+=",(SELECT coalesce(max(n),0) FROM (SELECT count(*) n FROM atom_"+left+
            " WHERE v_tag=5 GROUP BY v_s) keys) reference_frequency,"+frequency("atom_"+right,0)+" entity_frequency";
        reference_bounds={saturated_product("n"+left,"entity_frequency",limits),
            saturated_product("n"+right,"reference_frequency",limits)};
    }
    for(const auto column:global_frequencies)plan.statistics_extra+=","+frequency("active",column)+" g"+std::to_string(column);
    const auto branch=[&](size_t atom,size_t visited,bool scan){
        std::vector<std::string> bounds{scan?"n":"n"+std::to_string(atom)};
        for(size_t c=0;c<3;++c){
            const auto &term=rule.positive_body[atom].terms[c].value;
            const auto suffix=std::to_string(atom)+"_"+std::to_string(c);
            if(std::holds_alternative<Value>(term)){if(scan)bounds.push_back("l"+suffix);}
            else if(variable_atoms.at(std::get<uint32_t>(term))&visited)
                bounds.push_back(scan?"g"+std::to_string(c):"f"+suffix);
        }
        return least(bounds);
    };
    const size_t full=(size_t(1)<<k)-1;
    plan.proof_ctes="bound_0 AS MATERIALIZED (SELECT statistics.*,1::BIGINT m0 FROM statistics),";
    for(size_t s=1;s<=full;++s){
        std::vector<std::string> choices;
        for(size_t i=0;i<k;++i)if(s&(size_t(1)<<i)){
            const auto previous=s^(size_t(1)<<i);
            choices.push_back(saturated_product("m"+std::to_string(previous),branch(i,previous,false),limits));
        }
        if(reference_join&&s==full)choices=reference_bounds;
        plan.proof_ctes+="bound_"+std::to_string(s)+" AS MATERIALIZED (SELECT bound_"+std::to_string(s-1)+".*,"+
            least(choices)+" m"+std::to_string(s)+" FROM bound_"+std::to_string(s-1)+"),";
    }
    std::string work="0";plan.proof_guard="TRUE";
    for(size_t s=0;s<=full;++s){
        const auto m="statistics.m"+std::to_string(s);
        if(s){
            const auto count=std::to_string(bit_count(s));
            if(limits.scalable){
                plan.proof_guard+=" AND "+m+"<"+std::to_string(limits.saturation)+" AND "+m+"<="+std::to_string(limits.intermediate_rows)+
                    " AND "+m+"*"+count+"*(120+statistics.e_bytes+statistics.a_bytes+statistics.v_bytes)<="+std::to_string(limits.intermediate_bytes);
            }else{
                plan.proof_guard+=" AND "+m+"<50000001 AND "+m+"<=100000 AND "+m+"*15*"+count+"<=800000 AND "+m+"*"+count+
                    "*(120+statistics.e_bytes+statistics.a_bytes+statistics.v_bytes)<=33554432";
            }
        }
        if(s==full)continue;
        std::vector<std::string> scans;
        for(size_t i=0;i<k;++i)if(!(s&(size_t(1)<<i)))scans.push_back(branch(i,s,true));
        // Bounds already exist as columns in the final one-row relation.
        work+='+'+saturated_product("m"+std::to_string(s),least(scans),limits);
    }
    plan.proof_ctes+="join_bounds AS MATERIALIZED (SELECT bound_"+std::to_string(full)+".*,LEAST(50000001,2*("+work+")+1) w FROM bound_"+std::to_string(full)+"),";
    plan.statistics_source="join_bounds AS statistics";
    plan.rows_bound="statistics.m"+std::to_string(full);plan.facts_bound="statistics.n+"+plan.rows_bound;plan.work_bound="statistics.w";
    if(!reference_join)specialize_star_proof(plan,rule,limits,gate);
    std::string select="SELECT DISTINCT TRUE present";constexpr char suffixes[]="tsbif";
    plan.extra_bytes="0";plan.tuple_sql="CAST(to_json([";
    for(size_t i=0;i<plan.arity;++i){
        const auto &term=rule.head.terms[i].value;Slots slots;
        if(std::holds_alternative<uint32_t>(term)){
            const auto origin=origins.at(std::get<uint32_t>(term));slots=source_slots(origin.second,"a"+std::to_string(origin.first));
            plan.extra_bytes+="+statistics."+std::string(origin.second==0?"e_bytes":origin.second==1?"a_bytes":"v_bytes");
        }else{
            const auto &v=std::get<Value>(term);slots=constant_slots(v);++plan.constant_count;
            const auto bytes=text_bytes(v);plan.constant_bytes+=bytes;
            if(bytes)plan.extra_bytes+='+'+std::to_string(bytes);
        }
        const auto prefix="h"+std::to_string(i);
        for(size_t c=0;c<5;++c){select+=","+slots[c]+" "+prefix+suffixes[c];if(!plan.order_sql.empty())plan.order_sql+=',';plan.order_sql+="r."+prefix+suffixes[c];}
        if(i)plan.tuple_sql+=',';const auto r="r."+prefix;
        plan.tuple_sql+=tuple_cell_sql(r,limits.values);
    }
    plan.tuple_sql+="]) AS VARCHAR)";
    plan.answer_sql=select+" FROM "+from+" WHERE "+gate+" AND "+joined_condition;
    return plan;
}
inline std::optional<ScanPlan> join_plan(const ProgramIRV2 &ir,const SqlPlanLimits &limits={}){
    if(ir.rules.size()!=1||!ir.facts.empty()||ir.relations.size()!=2||ir.rules[0].head.relation!=ir.answer_relation)
        return std::nullopt;
    return join_rule_plan(ir.rules[0],limits,"(SELECT use_sql FROM mode)");
}
}

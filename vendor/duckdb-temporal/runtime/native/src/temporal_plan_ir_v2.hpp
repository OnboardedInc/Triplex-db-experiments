// SPDX-License-Identifier: MIT
// Compiler-owned inspection data only: no executor, dictionary handles or SQL.
#pragma once
#include "temporal_plan_ir.hpp"
#include <optional>

namespace td {

enum class PlanAggregateOpV2 { Count, Min, Max, SumI64 };
struct PlanAggregateOutputV2 {
    PlanAggregateOpV2 op;
    uint32_t source_relation;
    std::vector<uint32_t> key_columns;
    // count has no measure; zero is a real source column, not an absence tag.
    std::optional<uint32_t> measure_column;
};
struct PlanComputedOutputV2 {
    uint32_t expression_nodes;
};
struct PlanHeadTermV2 {
    // Opaque outputs are separate from relational terms. The core's private
    // placeholder IDs must never be decoded as constants or lowered to SQL.
    std::variant<uint32_t, Value, PlanAggregateOutputV2, PlanComputedOutputV2> value;
    bool relational() const {
        return std::holds_alternative<uint32_t>(value) || std::holds_alternative<Value>(value);
    }
};
struct PlanHeadV2 {
    uint32_t relation;
    std::vector<PlanHeadTermV2> terms;
};
enum class PlanComparisonOpV2 { Equal, NotEqual, Less, LessEqual, Greater, GreaterEqual };
struct PlanComparisonV2 {
    PlanComparisonOpV2 op;
    PlanTerm left, right;
};
struct PlanReferenceJoinV2 {
    uint32_t reference_variable, entity_variable;
};
struct PlanRuleV2 {
    uint32_t id, variable_count;
    PlanHeadV2 head;
    std::vector<PlanAtom> positive_body, negative_body;
    uint32_t filter_count, filter_expression_nodes;
    // Optional compiler-owned leaf comparisons for native SQL lowering.
    // A consumer must admit every filter before using them.
    std::vector<PlanComparisonV2> simple_comparisons;
    std::optional<PlanReferenceJoinV2> reference_join;
};
struct PlanFactV2 {
    uint32_t rule;
    PlanFact fact;
};
enum class PlanDependencyKindV2 { Positive, Negative, Aggregate };
struct PlanDependencyV2 {
    uint32_t rule, atom_index, source_relation, target_relation;
    PlanDependencyKindV2 kind;
};
enum class PlanComponentKindV2 { Base, Ordinary, Aggregate };
struct PlanComponentV2 {
    uint32_t id;
    PlanComponentKindV2 kind;
    std::vector<uint32_t> relations, rules;
};
struct PlanExpressionBudgetV2 {
    uint64_t max_filters, max_rule_nodes, max_program_nodes, max_height, max_nesting;
};
struct ProgramIRV2 {
    std::vector<PlanRelation> relations;
    // Only unconditional ground ordinary rules; rules remains the full view.
    std::vector<PlanFactV2> facts;
    std::vector<PlanRuleV2> rules;
    std::vector<PlanDependencyV2> dependencies;
    std::vector<PlanComponentV2> components;
    // Producer-first component IDs, including base, empty and unused nodes.
    std::vector<uint32_t> schedule;
    uint32_t answer_relation;
    PlanBudgetModel budget_model;
    PlanExpressionBudgetV2 expression_budget;
};

// Parse and validate the whole authoritative stratified core, but never admit
// facts, run rules, evaluate filters/aggregates or touch a connection/catalog.
ProgramIRV2 compile_program_ir_v2(const std::string &program, bool include_simple_comparisons = false,
    ValueProfile profile = ValueProfile::FourTag);

// td.program_ir/2, td.stratified/1. Opaque filter effects, not executable AST.
// Only compiler-produced values are supported; this is not a plan input API.
std::string program_ir_json_v2(const ProgramIRV2 &program);

}

// SPDX-License-Identifier: MIT
// Additive, owned logical compiler boundary; no evaluator or dictionary handles.
#pragma once
#include "temporal_typed_core.hpp"
#include <array>
#include <variant>

namespace td {

struct PlanTerm {
    // A variable is a rule-local structural ID; a constant owns its payload.
    std::variant<uint32_t, Value> value;
};
struct PlanAtom {
    uint32_t relation;
    std::vector<PlanTerm> terms;
};
struct PlanRelation {
    uint32_t id;
    std::string name;
    uint32_t arity;
    bool edb;
};
struct PlanFact {
    uint32_t relation;
    std::vector<Value> values;
};
struct PlanRule {
    uint32_t id;
    uint32_t variable_count;
    PlanAtom head;
    std::vector<PlanAtom> body;
    uint32_t filter_count;
};
struct PlanBudgetModel {
    uint64_t max_program_bytes, max_term_bytes, max_input_rows;
    uint64_t max_rules, max_relations, max_body_atoms, max_variables, max_arity;
    uint64_t max_facts, max_rounds, max_work, max_output_bytes;
    uint64_t max_dictionary_bytes, max_dictionary_values, dictionary_entry_bytes;
    std::array<uint64_t, 9> typed_output_row_bytes;
};
struct ProgramIR {
    std::vector<PlanRelation> relations;
    // Redundant source-order view of the filter-free ground source rules.
    std::vector<PlanFact> facts;
    // ALL source rules, including the rules represented in facts above.
    std::vector<PlanRule> rules;
    uint32_t answer_relation;
    PlanBudgetModel budget_model;
};

// Reuses the authoritative typed parser and static safety validation, without
// running rules or expression filters. Every returned payload is owned.
ProgramIR compile_program_ir_v1(const std::string &program);

// Serializes compiler-produced IR as td.program_ir/1, language td.typed/0.3.
// The row-byte model is native admission accounting, not an observed counter.
std::string program_ir_json_v1(const ProgramIR &program);

}

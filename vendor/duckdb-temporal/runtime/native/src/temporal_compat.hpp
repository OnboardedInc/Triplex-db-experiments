// SPDX-License-Identifier: MIT
#pragma once
#include "temporal_core.hpp"
#include <optional>

namespace td::compat {
struct DependencyFact {
    double recorded_at;
    int64_t recorded_position;
    std::optional<double> retracted_at;
    std::optional<int64_t> retracted_position;
    std::optional<double> valid_from, valid_to;
};
struct DependencyCut {
    double valid_at;
    std::optional<double> recorded_at;
    std::optional<int64_t> recorded_position;
};
struct DependencyContribution {
    int64_t source_position = 0;
    std::optional<double> next_boundary;
};
DependencyContribution dependency_entry(const DependencyFact &fact,const DependencyCut &cut);
bool reserve_usage(int64_t retained_count,int64_t retained_bytes,int64_t added_count,int64_t added_bytes);
std::string append_sql(const std::string &rows_json);
std::string retract_sql(const std::string &id,double timestamp,const std::string &transaction_id,int64_t position);
}

// SPDX-License-Identifier: MIT
#pragma once
#include "temporal_core.hpp"
namespace td::store_query {
std::string sql(const std::string &program,int64_t valid,int64_t known,int64_t facts,int64_t rounds,int64_t work,int64_t deadline,
    bool force_native=false,bool preferred_native=false,int64_t control=0,bool parameter_control=false,ValueProfile values=ValueProfile::FourTag);
std::string interval_sql(const std::string &program,int64_t from,int64_t to,int64_t known,
    int64_t segments,int64_t facts,int64_t rounds,int64_t work,int64_t control);
std::string multi_cut_sql(const std::string &program,const std::string &cuts,
    int64_t facts,int64_t rounds,int64_t work,int64_t control);
std::string lookup_sql(const std::string &program,const std::string &attribute,
    int64_t valid,int64_t known,int64_t input_facts,int64_t candidates,int64_t control);
// SQL-owned logical stage bounds, independent of native evaluator budgets.
std::string scalable_sql(const std::string &program,int64_t valid,int64_t known,int64_t input_facts,
    int64_t intermediate_rows,int64_t intermediate_bytes,int64_t output_rows,int64_t output_bytes,
    int64_t control=0,bool parameter_control=false,ValueProfile values=ValueProfile::FourTag);
}

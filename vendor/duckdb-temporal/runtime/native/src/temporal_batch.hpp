// SPDX-License-Identifier: MIT
#pragma once
#include "temporal_core.hpp"

namespace td::batch {
struct Request {
    std::string schema_name, command_id, members_json;
    int64_t schema_version=0;
    int64_t max_retained_facts=1000000, max_retained_bytes=268435456;
};
std::string execute_sql(const Request &request, bool initialize);
std::string receipt_sql(const std::string &command_id);
}

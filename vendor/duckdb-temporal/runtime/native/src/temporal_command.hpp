// SPDX-License-Identifier: MIT
#pragma once
#include "temporal_core.hpp"

namespace td::command {
struct EntityPut {
    std::string schema_name,entity_type,entity_id,command_id,record;
    int64_t schema_version=0,valid_from=0,valid_to=0;
    int64_t max_retained_facts=1000000,max_retained_bytes=268435456;
    bool expanded_values=false;
};
std::string put_entity_sql(const EntityPut &request);
std::string patch_entity_sql(const EntityPut &request);
std::string receipt_sql(const std::string &command_id);
std::string history_sql(const std::string &entity_id,bool expanded=false);
std::string presence_at_sql(const std::string &entity_id,int64_t known_at,int64_t valid_at);
std::string entity_at_sql(const std::string &entity_id,int64_t known_at,int64_t valid_at,bool expanded=false);
}

// SPDX-License-Identifier: MIT
#pragma once
#include "temporal_typed_core.hpp"
#include <map>
#include <string_view>

namespace td::schema {
inline constexpr size_t max_blob_descriptor_bytes=6*(512+2*16384)+128;
struct Attribute {
    ValueTag tag;
    bool required = false;
    bool many = false;
    std::string reference;
    bool unique = false;
};
struct Entity { std::map<std::string, Attribute> attributes; bool live = false; };
struct Definition {
    std::string name;
    int64_t version = 0;
    std::map<std::string, Entity> entities;
    bool expanded_values = false;
    bool document_values = false;
    bool unique_values = false;
    bool live_entities = false;
};
Definition compile(const std::string &dsl, bool expanded = false);
std::string canonical_json(const Definition &schema);
std::string references_json(const Definition &schema);
std::string registration_sql(const Definition &schema, const std::string &dsl);
void validate_record(const Definition &schema, const std::string &entity, const std::string &record);
std::string prepare_record_json(const Definition &schema, const std::string &entity, const std::string &record);
void validate_attribute(const Definition &schema,const std::string &entity,const std::string &attribute,uint8_t tag);
bool validate_blob_descriptor(std::string_view payload,std::string_view id,std::string_view extra_json);
}

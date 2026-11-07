// SPDX-License-Identifier: MIT
#pragma once
#include "temporal_core.hpp"
#include <variant>

namespace td {

enum class ValueTag : uint8_t {
    String = 1, Boolean = 2, Int64 = 3, Float64 = 4, Reference = 5, DateTime = 6, Json = 7, Blob = 8
};
inline constexpr bool text_carrier_tag(ValueTag tag) noexcept {
    return tag == ValueTag::String || tag == ValueTag::Reference || tag == ValueTag::Json || tag == ValueTag::Blob;
}
namespace detail { struct TypedDomain; }

// Owned, validated values. There are no implicit cross-tag conversions.
class Value {
public:
    static Value str(std::string value);
    static Value boolean(bool value);
    static Value i64(int64_t value);
    static Value f64(double value);
    static Value ref(std::string id);
    static Value datetime(double epoch_millis);
    static Value json(std::string source);
    static Value blob(std::string id);

    ValueTag tag() const noexcept;
    const std::string &as_str() const;
    bool as_bool() const;
    int64_t as_i64() const;
    double as_f64() const;
    const std::string &as_ref() const;
    double as_datetime() const;
    const std::string &as_json() const;
    const std::string &as_blob_id() const;
    const std::string &carrier_text() const;
    bool operator==(const Value &other) const;

private:
    friend struct detail::TypedDomain;
    struct Reference { std::string id; };
    struct DateTime { double epoch_millis; };
    struct Json { std::string source; };
    struct Blob { std::string id; };
    using Payload = std::variant<std::string, bool, int64_t, double, Reference, DateTime, Json, Blob>;
    explicit Value(Payload payload);
    Payload payload_;
};

// Tag rank, then UTF-8 byte / boolean / signed integer / finite numeric order.
int compare_values(const Value &left, const Value &right);

struct TypedResult {
    std::vector<std::vector<Value>> rows;
    uint64_t rounds = 0;
    uint64_t derived_facts = 0;
    uint64_t work = 0;
};

// Execution-local, one-shot state. Returned values own all their payloads.
class TypedEngine {
public:
    TypedEngine(const std::string &program, int64_t valid_at, int64_t known_at,
                Limits limits);
    ~TypedEngine();
    TypedEngine(const TypedEngine &) = delete;
    TypedEngine &operator=(const TypedEngine &) = delete;
    void add_triple(const std::string &e, const std::string &a, const Value &v,
                    int64_t valid_from, int64_t valid_to,
                    int64_t tx_from, int64_t tx_to);
    TypedResult run();

private:
    struct Impl;
    std::unique_ptr<Impl> impl;
};

}

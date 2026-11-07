// SPDX-License-Identifier: MIT
// Private implementation policies; not a stable public interface.
#pragma once
#include "temporal_typed_core.hpp"
#include "temporal_float.hpp"
#include "temporal_json.hpp"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstring>
#include <limits>
#include <unordered_map>

namespace td {
namespace detail {

using ValueId = uint32_t;
constexpr size_t MAX_TERM_BYTES = 16384;
constexpr size_t MAX_DICTIONARY_BYTES = 16 * 1024 * 1024;
constexpr size_t MAX_DICTIONARY_VALUES = 300000;

inline void validate_term_bytes(std::string_view s) {
    if (s.size() > MAX_TERM_BYTES) throw Error("term exceeds 16384 bytes");
}

inline void validate_utf8_text(std::string_view s) {
    size_t pos = 0;
    while (pos < s.size()) {
        const auto first = static_cast<unsigned char>(s[pos++]);
        if (first == 0) throw Error("TD_E_VALUE_TEXT: NUL is not allowed in typed strings");
        if (first < 0x80) continue;
        uint32_t point = 0, minimum = 0;
        size_t remaining = 0;
        if (first >= 0xc2 && first <= 0xdf) {
            point = first & 0x1f; minimum = 0x80; remaining = 1;
        } else if (first >= 0xe0 && first <= 0xef) {
            point = first & 0x0f; minimum = 0x800; remaining = 2;
        } else if (first >= 0xf0 && first <= 0xf4) {
            point = first & 0x07; minimum = 0x10000; remaining = 3;
        } else {
            throw Error("TD_E_VALUE_TEXT: invalid UTF-8 scalar text");
        }
        if (remaining > s.size() - pos)
            throw Error("TD_E_VALUE_TEXT: truncated UTF-8 scalar text");
        for (size_t i = 0; i < remaining; ++i) {
            const auto next = static_cast<unsigned char>(s[pos++]);
            if ((next & 0xc0) != 0x80)
                throw Error("TD_E_VALUE_TEXT: invalid UTF-8 continuation");
            point = (point << 6) | (next & 0x3f);
        }
        if (point < minimum || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff))
            throw Error("TD_E_VALUE_TEXT: invalid UTF-8 scalar text");
    }
}
inline void validate_typed_text(std::string_view s) {
    validate_term_bytes(s);
    validate_utf8_text(s);
}
inline void validate_json_source(std::string_view source) {
    validate_typed_text(source);
    validate_json_syntax(source);
}

struct LegacyDomain {
    static constexpr bool typed = false;
    using Input = std::string;
    using Output = std::string;
    using ResultType = Result;
    std::unordered_map<std::string, ValueId> symbol_ids;
    // Owned map keys survive rehash; this policy never erases keys.
    std::vector<const std::string *> symbols;
    size_t symbol_bytes = 0;

    static void validate_identifier(const std::string &s) { validate_term_bytes(s); }
    static void validate_value(const Input &s) { validate_term_bytes(s); }

    ValueId intern_string(const std::string &s) {
        validate_term_bytes(s);
        ValueId id = static_cast<ValueId>(symbols.size());
        auto entry = symbol_ids.try_emplace(s, id);
        if (!entry.second) return entry.first->second;
        // Retain the legacy admission order and byte accounting exactly.
        if (symbol_bytes + s.size() > MAX_DICTIONARY_BYTES || symbols.size() >= MAX_DICTIONARY_VALUES)
            throw Error("symbol dictionary resource limit exceeded");
        symbol_bytes += s.size();
        symbols.push_back(&entry.first->first);
        return id;
    }
    ValueId intern_value(const Input &s) { return intern_string(s); }
    Output decode(ValueId id) const { return *symbols[id]; }
    size_t output_extra_bytes(ValueId id) const { return symbols[id]->size(); }
    static size_t output_row_bytes(size_t) { return 0; }
    static void sort(ResultType &result, const std::function<void()> &poll) {
        size_t comparisons=0;
        std::sort(result.rows.begin(),result.rows.end(),[&](const auto &left,const auto &right){
            if ((comparisons++ & 1023)==0 && poll) poll();
            return left<right;
        });
    }
};

struct TypedDomain {
    static constexpr bool typed = true;
    using Input = Value;
    using Output = Value;
    using ResultType = TypedResult;
    struct Entry {
        ValueTag tag;
        union Payload {
            const std::string *s;
            bool b;
            int64_t i;
            uint64_t f;
            Payload() : f(0) {}
        } value;
    };
    std::unordered_map<std::string, ValueId> strings;
    std::unordered_map<std::string, ValueId> references;
    std::unordered_map<std::string, ValueId> json_sources;
    std::unordered_map<std::string, ValueId> blobs;
    std::unordered_map<int64_t, ValueId> integers;
    std::unordered_map<uint64_t, ValueId> floats;
    std::unordered_map<uint64_t, ValueId> datetimes;
    static constexpr ValueId NO_ID = std::numeric_limits<ValueId>::max();
    std::array<ValueId, 2> booleans{{NO_ID, NO_ID}};
    std::vector<Entry> entries;
    size_t dictionary_bytes = 0;

    static void validate_identifier(const std::string &s) { validate_typed_text(s); }
    static void validate_value(const Input &v) {
        switch (v.tag()) {
        case ValueTag::String: validate_typed_text(v.as_str()); return;
        case ValueTag::Reference:
            validate_typed_text(v.as_ref());
            if (v.as_ref().empty()) throw Error("TD_E_VALUE_PAYLOAD: reference ID must not be empty");
            return;
        case ValueTag::Boolean: (void)v.as_bool(); return;
        case ValueTag::Int64: (void)v.as_i64(); return;
        case ValueTag::Float64:
            if (!finite_float_bits(float_bits(v.as_f64()))) throw Error("TD_E_VALUE_PAYLOAD: float64 must be finite");
            return;
        case ValueTag::DateTime:
            if (!finite_float_bits(float_bits(v.as_datetime()))) throw Error("TD_E_VALUE_PAYLOAD: datetime must be finite");
            return;
        case ValueTag::Json: case ValueTag::Blob:
            // Construction already validated the owned bytes.
            return;
        }
        throw Error("TD_E_VALUE_TAG: unsupported typed value");
    }
    void check_new(size_t string_bytes = 0) const {
        // Admission units, not a complete allocator census: one reverse Entry
        // per value, plus owned string bytes. Numeric-only input is charged too.
        if (entries.size() >= MAX_DICTIONARY_VALUES ||
            sizeof(Entry) > MAX_DICTIONARY_BYTES - dictionary_bytes ||
            string_bytes > MAX_DICTIONARY_BYTES - dictionary_bytes - sizeof(Entry))
            throw Error("typed dictionary resource limit exceeded");
    }
    ValueId next_id() const { return static_cast<ValueId>(entries.size()); }
    ValueId append(Entry entry, size_t string_bytes = 0) {
        const auto id = next_id();
        entries.push_back(entry);
        dictionary_bytes += sizeof(Entry) + string_bytes;
        return id;
    }
    ValueId intern_text(std::unordered_map<std::string, ValueId> &values, const std::string &s, ValueTag tag) {
        auto found = values.find(s);
        if (found != values.end()) return found->second;
        check_new(s.size());
        auto inserted = values.emplace(s, next_id());
        Entry entry; entry.tag = tag; entry.value.s = &inserted.first->first;
        try { return append(entry, s.size()); }
        catch (...) { values.erase(inserted.first); throw; }
    }
    ValueId intern_string(const std::string &s) {
        validate_typed_text(s);
        return intern_text(strings, s, ValueTag::String);
    }
    ValueId intern_value(const Input &v) {
        validate_value(v);
        switch (v.tag()) {
        case ValueTag::String: return intern_string(v.as_str());
        case ValueTag::Reference: return intern_text(references, v.as_ref(), ValueTag::Reference);
        case ValueTag::Json: return intern_text(json_sources, v.as_json(), ValueTag::Json);
        case ValueTag::Blob: return intern_text(blobs, v.as_blob_id(), ValueTag::Blob);
        case ValueTag::Boolean: {
            const auto b = v.as_bool();
            auto &id = booleans[static_cast<size_t>(b)];
            if (id != NO_ID) return id;
            check_new();
            Entry entry; entry.tag = ValueTag::Boolean; entry.value.b = b;
            id = append(entry); return id;
        }
        case ValueTag::Int64: {
            const auto value = v.as_i64();
            auto found = integers.find(value);
            if (found != integers.end()) return found->second;
            check_new(); const auto inserted = integers.emplace(value, next_id());
            Entry entry; entry.tag = ValueTag::Int64; entry.value.i = value;
            try { return append(entry); }
            catch (...) { integers.erase(inserted.first); throw; }
        }
        case ValueTag::Float64:
        case ValueTag::DateTime: {
            const bool datetime = v.tag() == ValueTag::DateTime;
            auto &values = datetime ? datetimes : floats;
            const auto bits = canonical_float_bits(float_bits(datetime ? v.as_datetime() : v.as_f64()));
            auto found = values.find(bits);
            if (found != values.end()) return found->second;
            check_new(); const auto inserted = values.emplace(bits, next_id());
            Entry entry; entry.tag = v.tag(); entry.value.f = bits;
            try { return append(entry); }
            catch (...) { values.erase(inserted.first); throw; }
        }
        }
        throw Error("TD_E_VALUE_TAG: unsupported typed value");
    }
    Output decode(ValueId id) const {
        const auto &entry = entries[id];
        switch (entry.tag) {
        case ValueTag::String: return Value::str(*entry.value.s);
        case ValueTag::Boolean: return Value::boolean(entry.value.b);
        case ValueTag::Int64: return Value::i64(entry.value.i);
        case ValueTag::Float64: return Value::f64(bits_float(entry.value.f));
        case ValueTag::Reference: return Value::ref(*entry.value.s);
        case ValueTag::DateTime: return Value::datetime(bits_float(entry.value.f));
        case ValueTag::Json: return Value(Value::Payload(Value::Json{*entry.value.s}));
        case ValueTag::Blob: return Value(Value::Payload(Value::Blob{*entry.value.s}));
        }
        throw Error("internal typed dictionary tag invalid");
    }
    size_t output_extra_bytes(ValueId id) const {
        const auto &entry = entries[id];
        return text_carrier_tag(entry.tag) ? entry.value.s->size() : 0;
    }
    static size_t output_row_bytes(size_t arity) {
        // Arity <= 8, so this cannot overflow. Charge owned cells even for nums.
        return sizeof(std::vector<Value>) + arity * sizeof(Value);
    }
    static void sort(ResultType &result, const std::function<void()> &poll) {
        size_t comparisons=0;
        std::sort(result.rows.begin(), result.rows.end(), [&](const auto &left, const auto &right) {
            if ((comparisons++ & 1023)==0 && poll) poll();
            return std::lexicographical_compare(left.begin(), left.end(), right.begin(), right.end(),
                [](const Value &a, const Value &b) { return compare_values(a, b) < 0; });
        });
    }
};

}
}

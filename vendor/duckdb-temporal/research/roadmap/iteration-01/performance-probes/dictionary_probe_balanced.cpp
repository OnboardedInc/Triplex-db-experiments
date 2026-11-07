// SPDX-License-Identifier: MIT
// Isolated representation experiment, not production evaluator implementation.
// Balanced v2: single-buffer numeric formatting and added short/small-key cases.
#include <algorithm>
#include <array>
#include <chrono>
#include <charconv>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <limits>
#include <map>
#include <new>
#include <random>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>
#include <variant>
#include <vector>

static bool count_allocations = false;
static uint64_t allocation_calls = 0, allocation_bytes = 0;

// Count requested new/new[] bytes, not live bytes, usable malloc bytes or RSS.
// Kept deliberately header-free so allocation size classes are not changed.
__attribute__((noinline)) void *operator new(std::size_t n) {
    if (void *p = std::malloc(n ? n : 1)) {
        if (count_allocations) { ++allocation_calls; allocation_bytes += n; }
        return p;
    }
    throw std::bad_alloc();
}
__attribute__((noinline)) void *operator new[](std::size_t n) { return ::operator new(n); }
__attribute__((noinline)) void operator delete(void *p) noexcept { std::free(p); }
__attribute__((noinline)) void operator delete[](void *p) noexcept { std::free(p); }
__attribute__((noinline)) void operator delete(void *p, std::size_t) noexcept { std::free(p); }
__attribute__((noinline)) void operator delete[](void *p, std::size_t) noexcept { std::free(p); }

using Id = uint32_t;
using Value = std::variant<std::string, bool, int64_t, double>;
enum class Tag : uint8_t { String = 0, Bool = 1, Int64 = 2, Float64 = 3 };

uint64_t bits_of(double x) {
    if (!std::isfinite(x)) throw std::runtime_error("probe supports finite doubles only");
    if (x == 0.0) x = 0.0; // canonicalize -0 before hashing and emission
    uint64_t bits; std::memcpy(&bits, &x, sizeof(bits)); return bits;
}
uint64_t bits_of(int64_t x) { uint64_t bits; std::memcpy(&bits, &x, sizeof(bits)); return bits; }
int64_t signed_of(uint64_t x) { int64_t value; std::memcpy(&value, &x, sizeof(value)); return value; }
std::string key_i64(int64_t value) {
    char out[32]; out[0] = 'i'; out[1] = ':';
    const auto converted = std::to_chars(out + 2, out + sizeof(out), value);
    if (converted.ec != std::errc{}) throw std::runtime_error("integer formatting failed");
    return std::string(out, static_cast<size_t>(converted.ptr - out));
}
std::string key_f64(uint64_t bits) {
    char out[18]; out[0] = 'f'; out[1] = ':';
    for (int n = 17; n >= 2; --n) { out[n] = "0123456789abcdef"[bits & 15]; bits >>= 4; }
    return std::string(out, sizeof(out));
}
std::string encode(const Value &v) {
    switch (v.index()) {
    case 0: return "s:" + std::get<0>(v);
    case 1: return std::get<1>(v) ? "b:1" : "b:0";
    case 2: return key_i64(std::get<2>(v));
    case 3: return key_f64(bits_of(std::get<3>(v)));
    }
    throw std::runtime_error("invalid input variant");
}
uint64_t mix64(uint64_t x) {
    x ^= x >> 30; x *= UINT64_C(0xbf58476d1ce4e5b9);
    x ^= x >> 27; x *= UINT64_C(0x94d049bb133111eb);
    return x ^ (x >> 31);
}
struct NumericHash {
    size_t operator()(uint64_t value) const noexcept { return static_cast<size_t>(mix64(value)); }
};
struct VariantHash {
    size_t operator()(const Value &v) const {
        const auto tag = static_cast<uint64_t>(v.index());
        if (tag == 0) return std::hash<std::string>{}(std::get<0>(v));
        uint64_t payload = tag == 1 ? uint64_t(std::get<1>(v))
                         : tag == 2 ? bits_of(std::get<2>(v)) : bits_of(std::get<3>(v));
        return static_cast<size_t>(mix64(payload ^ (tag * UINT64_C(0x9e3779b97f4a7c15))));
    }
};

struct CanonicalStrings {
    std::unordered_map<std::string, Id> ids;
    std::vector<const std::string *> values;
    Id intern(const Value &v) {
        auto entry = ids.try_emplace(encode(v), static_cast<Id>(values.size()));
        if (entry.second) values.push_back(&entry.first->first);
        return entry.first->second;
    }
    std::vector<std::string> emit() const {
        std::vector<std::string> out; out.reserve(values.size());
        for (auto value : values) out.push_back(*value);
        return out;
    }
};

struct VariantDictionary {
    std::unordered_map<Value, Id, VariantHash> ids;
    std::vector<const Value *> values;
    Id intern(const Value &v) {
        // Canonicalize zero without copying string inputs on the lookup path.
        const Value zero = 0.0;
        const Value &key = v.index() == 3 && std::get<3>(v) == 0.0 ? zero : v;
        auto entry = ids.try_emplace(key, static_cast<Id>(values.size()));
        if (entry.second) values.push_back(&entry.first->first);
        return entry.first->second;
    }
    std::vector<std::string> emit() const {
        std::vector<std::string> out; out.reserve(values.size());
        for (auto value : values) out.push_back(encode(*value));
        return out;
    }
};

struct ValueRef {
    Tag tag;
    union { uint64_t bits; const std::string *text; };
    ValueRef(Tag t, uint64_t b) : tag(t), bits(b) {}
    explicit ValueRef(const std::string *s) : tag(Tag::String), text(s) {}
};
struct SplitDictionary {
    std::unordered_map<std::string, Id> strings;
    std::unordered_map<uint64_t, Id, NumericHash> integers, floats;
    std::array<int64_t, 2> booleans{-1, -1};
    std::vector<ValueRef> values;
    Id intern(const Value &v) {
        const auto next = static_cast<Id>(values.size());
        switch (v.index()) {
        case 0: {
            auto entry = strings.try_emplace(std::get<0>(v), next);
            if (entry.second) values.emplace_back(&entry.first->first);
            return entry.first->second;
        }
        case 1: {
            auto b = static_cast<size_t>(std::get<1>(v));
            if (booleans[b] < 0) { booleans[b] = next; values.emplace_back(Tag::Bool, b); }
            return static_cast<Id>(booleans[b]);
        }
        case 2: {
            auto entry = integers.try_emplace(bits_of(std::get<2>(v)), next);
            if (entry.second) values.emplace_back(Tag::Int64, entry.first->first);
            return entry.first->second;
        }
        case 3: {
            auto entry = floats.try_emplace(bits_of(std::get<3>(v)), next);
            if (entry.second) values.emplace_back(Tag::Float64, entry.first->first);
            return entry.first->second;
        }
        }
        throw std::runtime_error("invalid input variant");
    }
    std::vector<std::string> emit() const {
        std::vector<std::string> out; out.reserve(values.size());
        for (const auto &v : values) {
            switch (v.tag) {
            case Tag::String: out.push_back("s:" + *v.text); break;
            case Tag::Bool: out.push_back(v.bits ? "b:1" : "b:0"); break;
            case Tag::Int64: out.push_back(key_i64(signed_of(v.bits))); break;
            case Tag::Float64: out.push_back(key_f64(v.bits)); break;
            }
        }
        return out;
    }
};

using Clock = std::chrono::steady_clock;
uint64_t ns(Clock::time_point start, Clock::time_point end) {
    return static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::nanoseconds>(end-start).count());
}
struct Outcome {
    std::vector<Id> ids;
    std::vector<std::string> outputs;
    uint64_t build_ns, emit_ns, total_ns, calls, bytes;
};
template <class Dictionary> Outcome run(const std::vector<Value> &input) {
    Outcome out;
    allocation_calls = allocation_bytes = 0; count_allocations = true;
    const auto begin = Clock::now();
    {
        Dictionary dictionary;
        out.ids.reserve(input.size());
        for (const auto &value : input) out.ids.push_back(dictionary.intern(value));
        const auto built = Clock::now();
        out.outputs = dictionary.emit();
        const auto emitted = Clock::now();
        out.build_ns = ns(begin, built); out.emit_ns = ns(built, emitted);
    } // include dictionary destruction once in total, leave returned output alive
    out.total_ns = ns(begin, Clock::now());
    count_allocations = false;
    out.calls = allocation_calls; out.bytes = allocation_bytes;
    return out;
}

std::vector<Value> dataset(const std::string &name, size_t count) {
    std::vector<Value> data; data.reserve(count);
    for (size_t i = 0; i < count; ++i) {
        const size_t slot = i % 10, group = i / 10;
        if (name == "strings_repeated") {
            const auto id = i % 6000;
            data.emplace_back("entity-" + std::to_string(id) + std::string(40, char('a' + id % 26)));
        } else if (name == "strings_short") {
            data.emplace_back("n" + std::to_string(i % 6000));
        } else if (name == "mixed_small") {
            if (slot < 5) data.emplace_back("n" + std::to_string((group * 5 + slot) % 6000));
            else if (slot < 7) data.emplace_back(int64_t((group * 2 + slot - 5) % 6000) - 3000);
            else if (slot < 9) data.emplace_back((int64_t((group * 2 + slot - 7) % 6000) - 3000) / 8.0);
            else data.emplace_back(bool(group % 2));
        } else if (name == "mixed_repeated") {
            if (slot < 5) {
                const auto id = (group * 5 + slot) % 6000;
                data.emplace_back("entity-" + std::to_string(id) + std::string(40, char('a' + id % 26)));
            } else if (slot < 7) {
                const auto id = static_cast<int64_t>((group * 2 + slot - 5) % 6000);
                data.emplace_back((id % 2 ? -1 : 1) * (INT64_C(9007199254740993) + id));
            } else if (slot < 9) {
                const auto id = (group * 2 + slot - 7) % 6000;
                data.emplace_back((int64_t(id) - 3000) / 8.0);
            } else data.emplace_back(bool(group % 2));
        } else if (name == "mixed_unique") {
            if (slot < 4) data.emplace_back("entity-" + std::to_string(i) + std::string(40, char('a' + i % 26)));
            else if (slot < 7) data.emplace_back(std::numeric_limits<int64_t>::max() - int64_t(i));
            else if (slot < 9) data.emplace_back((int64_t(i) - int64_t(count/2)) / 8.0);
            else data.emplace_back(bool(group % 2));
        } else throw std::runtime_error("unknown data set");
    }
    // Inject equal zeros and extreme integers without merging different tags.
    if (name != "strings_repeated" && name != "strings_short" && count >= 8) {
        data[0] = int64_t(1); data[1] = double(1); data[2] = true; data[3] = std::string("1");
        data[4] = -0.0; data[5] = 0.0;
        data[6] = std::numeric_limits<int64_t>::min(); data[7] = std::numeric_limits<int64_t>::max();
    }
    std::mt19937 generator(20261030); std::shuffle(data.begin(), data.end(), generator);
    return data;
}
std::pair<std::vector<Id>,std::vector<std::string>> expected(const std::vector<Value> &data) {
    // Independent tree-based oracle; no measurements include this work.
    std::map<std::string, Id> keys;
    std::vector<Id> ids; ids.reserve(data.size());
    std::vector<std::string> values;
    for (const auto &value : data) {
        auto key = encode(value);
        auto entry = keys.emplace(key, static_cast<Id>(values.size()));
        if (entry.second) values.push_back(std::move(key));
        ids.push_back(entry.first->second);
    }
    return {std::move(ids), std::move(values)};
}
Outcome run_engine(size_t engine, const std::vector<Value> &data) {
    if (engine == 0) return run<CanonicalStrings>(data);
    if (engine == 1) return run<VariantDictionary>(data);
    return run<SplitDictionary>(data);
}
int main(int argc, char **argv) {
    const size_t count = argc > 1 ? std::stoull(argv[1]) : 60000;
    const size_t repetitions = argc > 2 ? std::stoull(argv[2]) : 21;
    if (count < 8 || count > 100000 || repetitions > 101) return 2;
    const std::array<const char*,3> names{"canonical_string","variant_key","split_tag_payload"};
    std::cout << "{\"metadata\":{\"inputs\":" << count << ",\"repetitions\":" << repetitions
              << ",\"warmups\":2,\"variant_size\":" << sizeof(Value) << ",\"compact_ref_size\":" << sizeof(ValueRef)
              << ",\"id_size\":" << sizeof(Id) << ",\"compiler\":\"" << __VERSION__ << "\"}}\n";
    for (const auto *scenario : {"strings_repeated","strings_short","mixed_repeated","mixed_small","mixed_unique"}) {
        auto data = dataset(scenario, count);
        auto truth = expected(data);
        const auto check = [&](const Outcome &out) {
            if (out.ids != truth.first || out.outputs != truth.second) throw std::runtime_error("complete output/ID mismatch");
        };
        for (size_t i = 0; i < 2; ++i) for (size_t engine = 0; engine < names.size(); ++engine) check(run_engine(engine, data));
        for (size_t repeat = 0; repeat < repetitions; ++repeat) for (size_t position = 0; position < names.size(); ++position) {
            const size_t engine = (repeat + position) % names.size();
            auto out = run_engine(engine, data); check(out);
            std::cout << "{\"scenario\":\"" << scenario << "\",\"engine\":\"" << names[engine]
                      << "\",\"repeat\":" << repeat << ",\"position\":" << position
                      << ",\"input_count\":" << data.size() << ",\"unique_values\":" << out.outputs.size()
                      << ",\"build_ns\":" << out.build_ns << ",\"emit_ns\":" << out.emit_ns
                      << ",\"total_ns\":" << out.total_ns << ",\"allocation_calls\":" << out.calls
                      << ",\"allocation_request_bytes\":" << out.bytes << ",\"exact_check\":true}\n";
        }
    }
}

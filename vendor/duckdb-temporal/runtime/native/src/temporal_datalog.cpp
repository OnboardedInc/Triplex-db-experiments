// SPDX-License-Identifier: MIT
// Actual unstable DuckDB C API v2; host, generated headers and footer pin v2.0.0.
#define DUCKDB_EXTENSION_NAME temporal_datalog
#define DUCKDB_V2_API_ALLOW_UNSTABLE 1
#define DUCKDB_EXTENSION_API_VERSION_MAJOR 2
#define DUCKDB_EXTENSION_API_VERSION_MINOR 0
#define DUCKDB_EXTENSION_API_VERSION_PATCH 0
#include "duckdb_extension_v2.h"
DUCKDB_EXTENSION_EXTERN
#include "temporal_core.hpp"
#include "temporal_typed_core.hpp"
#include "temporal_stratified_core.hpp"
#include "temporal_plan_ir.hpp"
#include "temporal_plan_ir_v2.hpp"
#include "temporal_float.hpp"
#include "temporal_control.hpp"
#include "temporal_schema.hpp"
#include "temporal_command.hpp"
#include "temporal_batch.hpp"
#include "temporal_compat.hpp"
#include "temporal_store_query.hpp"
#include "temporal_value_domain.hpp"
#include "catalog_sql.hpp"
#include <algorithm>
#include <array>
#include <charconv>
#include <cstring>
#include <limits>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <type_traits>
#include <vector>

// Private A/B build control; the shipped extension always enables reuse.
#ifndef TD_SCHEMA_TEMPLATE_REUSE
#define TD_SCHEMA_TEMPLATE_REUSE 1
#endif
#ifndef TD_SCHEMA_BORROWED_INPUT
#define TD_SCHEMA_BORROWED_INPUT 1
#endif

// Inventory-free admission predicate shared by the owned Python boundary.
// It reads the calling thread's controls, returns a Boolean and changes none.
extern "C" __attribute__((visibility("default"))) int td_require_fp() noexcept {
    try { td::detail::require_float_environment(); return 1; }
    catch (...) { return 0; }
}

namespace {
using Vec = duckdb_v2_vector_handle;
struct ApiError : std::runtime_error {
    DUCKDB_V2_ERROR code;
    ApiError(DUCKDB_V2_ERROR c, const std::string &s) : std::runtime_error(s), code(c) {}
};
struct OwnedError {
    duckdb_v2_error_info_handle value = nullptr;
    ~OwnedError() { if (value) (void)duckdb_v2_error_info_destroy(&value); }
};
template <class F, class... A> void call(F f, A... a) {
    // Fresh owned slot: success is not assumed to clear an existing error.
    OwnedError error;
    const auto code = f(a..., &error.value);
    if (code == DUCKDB_V2_ERROR_NONE) return;
    std::string message = "DuckDB v2 API failure";
    if (error.value) {
        duckdb_v2_str text{};
        if (duckdb_v2_error_info_get_text(error.value, &text) == DUCKDB_V2_ERROR_NONE && text.ptr)
            message.assign(text.ptr, text.len);
    }
    throw ApiError(code, message);
}
void report(duckdb_v2_error_info_handle *slot, const char *text,
            DUCKDB_V2_ERROR code = DUCKDB_V2_ERROR_INPUT_INVALID) noexcept {
    // Live callback slots are borrowed; never replace or destroy them.
    if (!slot || !*slot) return;
    (void)duckdb_v2_error_info_set_code(*slot, code);
    const duckdb_v2_str view{text, std::strlen(text)};
    (void)duckdb_v2_error_info_set_text(*slot, &view);
}
template <bool Typed> void domain_error(duckdb_v2_error_info_handle *slot, const char *text) noexcept {
    if constexpr (!Typed) report(slot, text);
    else {
        try {
            const auto message = std::string("TD_E_EXEC phase=exec: ") + text;
            report(slot, message.c_str());
        } catch (...) {
            report(slot, "TD_E_ALLOCATION phase=exec: diagnostic allocation failed",
                   DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);
        }
    }
}
Vec child(Vec parent, idx_t index) {
    Vec result = nullptr;
    call(duckdb_v2_vector_get_child, parent, index, &result);
    return result;
}
DUCKDB_V2_VECTOR_TYPE kind(Vec vector) {
    DUCKDB_V2_VECTOR_TYPE result{};
    call(duckdb_v2_vector_get_vector_type, vector, &result);
    return result;
}
void container_flat(Vec vector) {
    // Normalize nested carriers before descending, not their primitive leaves.
    if (kind(vector) != DUCKDB_V2_VECTOR_TYPE_FLAT) call(duckdb_v2_vector_flatten, vector);
}
void prepare_leaf(Vec vector) {
    if (kind(vector) == DUCKDB_V2_VECTOR_TYPE_OTHER) call(duckdb_v2_vector_flatten, vector);
    duckdb_v2_vector_view discarded{};
    // Dictionary get_view can flatten a child. Prepare every alias BEFORE
    // capturing persistent borrowed views, then refresh all views below.
    call(duckdb_v2_vector_get_view, vector, &discarded);
}
struct Reader {
    duckdb_v2_vector_view view{};
    DUCKDB_V2_VECTOR_TYPE representation{};
    explicit Reader(Vec vector) : representation(kind(vector)) {
        call(duckdb_v2_vector_get_view, vector, &view);
    }
    idx_t physical(idx_t row) const {
        if (row >= view.count) throw td::Error("native vector row out of bounds");
        // Never index the shared zero selection beyond its own allocation.
        return representation == DUCKDB_V2_VECTOR_TYPE_CONSTANT ? 0 : view.sel ? view.sel[row] : row;
    }
    bool valid(idx_t row) const {
        const auto p = physical(row);
        return !view.validity || (view.validity[p / 64] & (uint64_t(1) << (p % 64)));
    }
    template <class T> T at(idx_t row) const { return static_cast<const T *>(view.data)[physical(row)]; }
    std::string_view text_view(idx_t row, uint32_t max_bytes = 16384) const {
        const auto &v = static_cast<const duckdb_v2_bytes *>(view.data)[physical(row)];
        const auto length = v.value.inlined.length;
        if (length > max_bytes) throw td::Error("string exceeds allowed byte length");
        const char *data = length <= DUCKDB_V2_BYTES_INLINE_LENGTH ? v.value.inlined.inlined : v.value.pointer.ptr;
        return std::string_view(data, length);
    }
    std::string text(idx_t row, uint32_t max_bytes = 16384) const { return std::string(text_view(row,max_bytes)); }
};
template <class T> T *mutable_data(Vec vector) {
    void *result = nullptr;
    call(duckdb_v2_vector_get_data_mutable, vector, &result);
    return static_cast<T *>(result);
}
uint64_t *mutable_mask(Vec vector) {
    uint64_t *result = nullptr;
    call(duckdb_v2_vector_flat_get_validity_mutable, vector, &result);
    return result;
}
void mask_write(uint64_t *mask, idx_t row, bool valid) {
    const auto bit = uint64_t(1) << (row % 64);
    if (valid) mask[row / 64] |= bit; else mask[row / 64] &= ~bit;
}
void all_valid(Vec vector, idx_t count) {
    if (!count) return;
    auto mask = mutable_mask(vector);
    for (idx_t i = 0; i < count; ++i) mask_write(mask, i, true);
}
void size(Vec vector, idx_t count) { call(duckdb_v2_vector_set_size, vector, count); }
void put_text(Vec vector, duckdb_v2_bytes *data, idx_t row, const std::string &text) {
    if (text.size() > std::numeric_limits<uint32_t>::max()) throw td::Error("output string too long");
    duckdb_v2_bytes value{};
    if (text.size() <= DUCKDB_V2_BYTES_INLINE_LENGTH) {
        value.value.inlined.length = static_cast<uint32_t>(text.size());
        std::memcpy(value.value.inlined.inlined, text.data(), text.size());
    } else {
        duckdb_v2_arena_handle arena = nullptr;
        uint8_t *bytes = nullptr;
        // No arena handle/data pointer survives a resize or callback.
        call(duckdb_v2_vector_get_arena, vector, &arena);
        call(duckdb_v2_arena_allocate, arena, static_cast<idx_t>(text.size()), &bytes);
        std::memcpy(bytes, text.data(), text.size());
        value.value.pointer.length = static_cast<uint32_t>(text.size());
        std::memcpy(value.value.pointer.prefix, text.data(), 4);
        value.value.pointer.ptr = reinterpret_cast<char *>(bytes);
    }
    data[row] = value;
}
struct Input {
    std::array<Vec, 7> args{};
    Vec facts = nullptr;
    std::array<Vec, 7> fields{};
    std::array<Vec, 5> payloads{};
    Input(duckdb_v2_scalar_function_exec_info_handle info, bool typed) {
        for (idx_t i = 0; i < args.size(); ++i) call(duckdb_v2_scalar_function_exec_get_arg, info, i, &args[i]);
        container_flat(args[1]); facts = child(args[1], 0); container_flat(facts);
        for (idx_t i = 0; i < fields.size(); ++i) fields[i] = child(facts, i);
        if (typed) {
            container_flat(fields[2]);
            for (idx_t i = 0; i < payloads.size(); ++i) payloads[i] = child(fields[2], i);
        }
        for (idx_t i : {idx_t(0), idx_t(2), idx_t(3), idx_t(4), idx_t(5), idx_t(6)}) prepare_leaf(args[i]);
        for (idx_t i = 0; i < fields.size(); ++i) if (!typed || i != 2) prepare_leaf(fields[i]);
        if (typed) for (auto vector : payloads) prepare_leaf(vector);
    }
};
constexpr uint8_t value_payload_slot(uint8_t tag) noexcept {
    if (td::text_carrier_tag(static_cast<td::ValueTag>(tag))) return 1;
    if (tag == static_cast<uint8_t>(td::ValueTag::DateTime)) return 4;
    return tag;
}
#ifndef TD_LEGACY_ONLY
td::Value typed_value(const std::vector<Reader> &p, idx_t row, td::ValueProfile profile) {
    if (!p[0].valid(row)) throw td::Error("TD_E_VALUE_TAG: value tag must not be NULL");
    const auto tag = p[0].at<uint8_t>(row);
    const auto maximum = static_cast<uint8_t>(profile);
    if (tag < 1 || tag > maximum) throw td::Error("TD_E_VALUE_TAG: unknown value tag");
    const auto slot = value_payload_slot(tag);
    for (idx_t i = 1; i < p.size(); ++i)
        if (p[i].valid(row) != (i == slot))
            throw td::Error("TD_E_VALUE_PAYLOAD: selected payload must be non-NULL and inactive payloads NULL");
    switch (tag) {
    case 1: return td::Value::str(p[1].text(row));
    case 2: return td::Value::boolean(p[2].at<bool>(row));
    case 3: return td::Value::i64(p[3].at<int64_t>(row));
    case 4: return td::Value::f64(p[4].at<double>(row));
    case 5: return td::Value::ref(p[1].text(row));
    case 6: return td::Value::datetime(p[4].at<double>(row));
    case 7: return td::Value::json(p[1].text(row));
    case 8: return td::Value::blob(p[1].text(row));
    default: throw td::Error("TD_E_VALUE_TAG: unreachable tag");
    }
}
#endif
template <bool Typed, class Result> void encode_result(Vec out_rows, idx_t row, const Result &result,
        size_t &row_offset, size_t &value_offset, size_t &output_bytes, const std::function<void()> &poll) {
    constexpr size_t byte_cap = 32 * 1024 * 1024;
    if (result.rows.size() > 100000 - row_offset) throw td::Error("batch output exceeds 100000 tuples");
    size_t cells = 0;
    for (const auto &tuple : result.rows) for (const auto &value : tuple) {
        if ((cells & 1023)==0 && poll) poll();
        if (cells >= 800000 - value_offset) throw td::Error("batch output resource limit exceeded");
        ++cells;
        size_t bytes;
        if constexpr (Typed) {
            bytes = 40;
            if (td::text_carrier_tag(value.tag())) bytes += value.carrier_text().size();
        } else bytes = value.size();
        if (bytes > byte_cap - output_bytes) throw td::Error("batch output resource limit exceeded");
        output_bytes += bytes;
    }
    auto tuples = child(out_rows, 0); size(tuples, row_offset + result.rows.size());
    auto values = child(tuples, 0); size(values, value_offset + cells);
    std::array<Vec, 5> fields{};
    if constexpr (Typed) for (idx_t i = 0; i < fields.size(); ++i) {
        fields[i] = child(values, i); size(fields[i], value_offset + cells);
    }
    // Refresh data/masks only AFTER all possible reserves.
    mutable_data<duckdb_v2_list_entry>(out_rows)[row] = {row_offset, result.rows.size()};
    if (result.rows.empty()) return;
    auto entries = mutable_data<duckdb_v2_list_entry>(tuples);
    auto tuple_mask = mutable_mask(tuples);
    if constexpr (Typed) {
        auto parent_mask = mutable_mask(values);
        std::array<uint64_t *, 5> masks{};
        for (idx_t i = 0; i < fields.size(); ++i) masks[i] = mutable_mask(fields[i]);
        auto tags = mutable_data<uint8_t>(fields[0]);
        auto strings = mutable_data<duckdb_v2_bytes>(fields[1]);
        auto booleans = mutable_data<bool>(fields[2]);
        auto integers = mutable_data<int64_t>(fields[3]);
        auto floats = mutable_data<double>(fields[4]);
        for (const auto &tuple : result.rows) {
            if (poll) poll();
            mask_write(tuple_mask, row_offset, true);
            entries[row_offset++] = {value_offset, tuple.size()};
            for (const auto &value : tuple) {
                const auto tag = static_cast<uint8_t>(value.tag());
                const auto slot = value_payload_slot(tag);
                mask_write(parent_mask, value_offset, true); tags[value_offset] = tag;
                for (idx_t i = 0; i < masks.size(); ++i) mask_write(masks[i], value_offset, i == 0 || i == slot);
                switch (value.tag()) {
                case td::ValueTag::String: case td::ValueTag::Reference:
                case td::ValueTag::Json: case td::ValueTag::Blob:
                    put_text(fields[1], strings, value_offset, value.carrier_text()); break;
                case td::ValueTag::Boolean: booleans[value_offset] = value.as_bool(); break;
                case td::ValueTag::Int64: integers[value_offset] = value.as_i64(); break;
                case td::ValueTag::Float64: floats[value_offset] = value.as_f64(); break;
                case td::ValueTag::DateTime: floats[value_offset] = value.as_datetime(); break;
                }
                ++value_offset;
            }
        }
    } else {
        auto strings = mutable_data<duckdb_v2_bytes>(values); auto mask = mutable_mask(values);
        for (const auto &tuple : result.rows) {
            if (poll) poll();
            mask_write(tuple_mask, row_offset, true);
            entries[row_offset++] = {value_offset, tuple.size()};
            for (const auto &value : tuple) {
                mask_write(mask, value_offset, true); put_text(values, strings, value_offset++, value);
            }
        }
    }
}
template <bool Typed, bool Stratified = false, bool Controlled = false, bool Timed = false, bool Expanded = false>
void query(duckdb_v2_scalar_function_exec_info_handle info,
        duckdb_v2_context_handle, duckdb_v2_error_info_handle *error) noexcept {
    static_assert(!Stratified || Typed, "stratified mode requires exact typed values");
    static_assert(!Expanded || (Typed && Stratified && Controlled && Timed), "expanded profile requires its versioned entrypoint");
    try {
        idx_t count = 0; Vec output = nullptr;
        call(duckdb_v2_scalar_function_exec_get_row_count, info, &count);
        call(duckdb_v2_scalar_function_exec_get_result, info, &output);
        Input input(info, Typed);
        const std::array<Reader, 7> args{Reader(input.args[0]), Reader(input.args[1]), Reader(input.args[2]),
            Reader(input.args[3]), Reader(input.args[4]), Reader(input.args[5]), Reader(input.args[6])};
        const Reader facts(input.facts);
        const std::array<Reader, 7> fields{Reader(input.fields[0]), Reader(input.fields[1]), Reader(input.fields[2]),
            Reader(input.fields[3]), Reader(input.fields[4]), Reader(input.fields[5]), Reader(input.fields[6])};
        std::vector<Reader> payloads;
        if constexpr (Typed) for (auto vector : input.payloads) payloads.emplace_back(vector);
        size(output, count); all_valid(output, count);
        std::array<Vec, 4> out{};
        for (idx_t i = 0; i < out.size(); ++i) { out[i] = child(output, i); size(out[i], count); all_valid(out[i], count); }
        size_t row_offset = 0, value_offset = 0, output_bytes = 0;
        for (idx_t row = 0; row < count; ++row) {
            for (idx_t col : {idx_t(0), idx_t(2), idx_t(3), idx_t(4), idx_t(5), idx_t(6)})
                if (!args[col].valid(row)) throw td::Error("program, snapshot times and limits must not be NULL");
            const auto a = args[4].at<int64_t>(row), b = args[5].at<int64_t>(row), c = args[6].at<int64_t>(row);
            if (a < 1 || b < 1 || c < 1) throw td::Error("limits must be positive");
            td::Limits limits{static_cast<uint64_t>(a), static_cast<uint64_t>(b), static_cast<uint64_t>(c)};
            if constexpr (Expanded) limits.values = td::ValueProfile::AllValues;
#if TD_EVALUATOR_PROFILE
            td::control::EvaluatorCapture capture;
#endif
            if constexpr (Controlled) {
                Vec token_vector = nullptr;
                call(duckdb_v2_scalar_function_exec_get_arg, info, idx_t(Timed?8:7), &token_vector);
                prepare_leaf(token_vector);
                const Reader tokens(token_vector);
                if (!tokens.valid(row)) throw td::Error("TD_E_CONTROL: invocation token must not be NULL");
                const auto token = tokens.at<int64_t>(row);
                if (!Expanded || token != 0) {
                    auto invocation = td::control::acquire(token);
#if TD_EVALUATOR_PROFILE
                    if constexpr (Expanded) capture.claim(invocation);
#endif
                    limits.poll = [invocation] { invocation->poll(); };
                    limits.poll();
                }
            }
            if constexpr (Timed) {
                Vec deadline_vector=nullptr;
                call(duckdb_v2_scalar_function_exec_get_arg,info,idx_t(7),&deadline_vector);
                prepare_leaf(deadline_vector);const Reader deadlines(deadline_vector);
                if(!deadlines.valid(row))throw td::Error("TD_E_QUERY_LIMIT: deadline must not be NULL");
                const auto millis=deadlines.at<int64_t>(row);
                if(millis<1||millis>60000)throw td::Error("TD_E_QUERY_LIMIT: deadline must be 1..60000 milliseconds");
                auto invocation=std::make_shared<td::control::Invocation>(static_cast<uint64_t>(millis));
                const auto prior=limits.poll;
                limits.poll=[invocation,prior]{if(prior)prior();invocation->poll();};limits.poll();
            }
            using Engine = std::conditional_t<Stratified, td::StratifiedEngine,
                std::conditional_t<Typed, td::TypedEngine, td::Engine>>;
#if TD_EVALUATOR_PROFILE
            auto *profile=capture.timing();
            limits.evaluator_timing=profile;
            using ProfileClock=td::evaluator_profile::Clock;
            const auto import_started=profile?ProfileClock::now():ProfileClock::time_point{};
#endif
            Engine engine(args[0].text(row, 65536), args[2].at<int64_t>(row), args[3].at<int64_t>(row), limits);
            if constexpr (Typed) if (!args[1].valid(row)) throw td::Error("typed fact list must not be NULL");
            if (args[1].valid(row)) {
                const auto entry = args[1].at<duckdb_v2_list_entry>(row);
                if (entry.length > 100000) throw td::Error("input exceeds 100000 temporal rows");
                if (entry.offset > facts.view.count || entry.length > facts.view.count - entry.offset)
                    throw td::Error("native fact list offset out of bounds");
#if TD_EVALUATOR_PROFILE
                if (profile) profile->input_rows=entry.length;
#endif
                for (idx_t j = entry.offset; j < entry.offset + entry.length; ++j) {
                    if (limits.poll) limits.poll();
                    if (!facts.valid(j)) throw td::Error("temporal fact must not be NULL");
                    for (const auto &field : fields) if (!field.valid(j)) throw td::Error("temporal fact fields must not be NULL");
                    if constexpr (Typed) {
#ifndef TD_LEGACY_ONLY
                        engine.add_triple(fields[0].text(j), fields[1].text(j), typed_value(payloads, j, limits.values),
                            fields[3].at<int64_t>(j), fields[4].at<int64_t>(j), fields[5].at<int64_t>(j), fields[6].at<int64_t>(j));
#endif
                    } else engine.add_triple(fields[0].text(j), fields[1].text(j), fields[2].text(j),
                        fields[3].at<int64_t>(j), fields[4].at<int64_t>(j), fields[5].at<int64_t>(j), fields[6].at<int64_t>(j));
                }
            }
#if TD_EVALUATOR_PROFILE
            if (profile) profile->build_and_load_ns=td::evaluator_profile::elapsed_ns(import_started);
#endif
            const auto result = engine.run();
            if (limits.poll) limits.poll();
#if TD_EVALUATOR_PROFILE
            const auto encoding_started=profile?ProfileClock::now():ProfileClock::time_point{};
#endif
            encode_result<Typed>(out[0], row, result, row_offset, value_offset, output_bytes, limits.poll);
            mutable_data<int64_t>(out[1])[row] = static_cast<int64_t>(result.rounds);
            mutable_data<int64_t>(out[2])[row] = static_cast<int64_t>(result.derived_facts);
            mutable_data<int64_t>(out[3])[row] = static_cast<int64_t>(result.work);
#if TD_EVALUATOR_PROFILE
            if (profile) {
                profile->encode_result_vector_ns=td::evaluator_profile::elapsed_ns(encoding_started);
                profile->answer_rows=result.rows.size();
                capture.complete();
            }
#endif
        }
    } catch (const ApiError &e) { report(error, e.what(), e.code); }
      catch (const std::bad_alloc &) { report(error, "native temporal Datalog allocation failed; no partial result returned",
            DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY); }
      catch (const std::exception &e) { domain_error<Typed>(error, e.what()); }
      catch (...) { domain_error<Typed>(error, "unexpected native temporal Datalog error"); }
}
#ifndef TD_LEGACY_ONLY
void float_bits_v1(duckdb_v2_scalar_function_exec_info_handle info,
        duckdb_v2_context_handle, duckdb_v2_error_info_handle *error) noexcept {
    try {
        td::detail::require_float_environment();
        idx_t count=0; Vec input=nullptr,output=nullptr;
        call(duckdb_v2_scalar_function_exec_get_row_count,info,&count);
        call(duckdb_v2_scalar_function_exec_get_arg,info,idx_t(0),&input);
        call(duckdb_v2_scalar_function_exec_get_result,info,&output);
        prepare_leaf(input);
        const Reader values(input);
        size(output,count);all_valid(output,count);
        auto strings=mutable_data<duckdb_v2_bytes>(output);
        for(idx_t row=0;row<count;++row){
            if(!values.valid(row))throw td::Error("TD_E_VALUE_FLOAT: bit codec requires a finite DOUBLE");
            auto bits=td::detail::float_bits(values.at<double>(row));
            if(!td::detail::finite_float_bits(bits))throw td::Error("TD_E_VALUE_FLOAT: bit codec requires a finite DOUBLE");
            bits=td::detail::canonical_float_bits(bits);
            std::string encoded(16,'0');
            for(size_t i=0;i<16;++i)encoded[15-i]="0123456789abcdef"[(bits>>(4*i))&15];
            put_text(output,strings,row,encoded);
        }
    } catch(const ApiError &e){report(error,e.what(),e.code);}
      catch(const std::exception &e){domain_error<true>(error,e.what());}
      catch(...){domain_error<true>(error,"native float bit codec failed");}
}
void plan_ir(duckdb_v2_scalar_function_exec_info_handle info,
        duckdb_v2_context_handle, duckdb_v2_error_info_handle *error) noexcept {
    try {
        td::detail::require_float_environment();
        idx_t count = 0; Vec input = nullptr, output = nullptr;
        call(duckdb_v2_scalar_function_exec_get_row_count, info, &count);
        call(duckdb_v2_scalar_function_exec_get_arg, info, idx_t(0), &input);
        call(duckdb_v2_scalar_function_exec_get_result, info, &output);
        prepare_leaf(input);
        const Reader programs(input);
        size(output, count); all_valid(output, count);
        // Only the output arena owns these copied bytes after this callback.
        // No statement execution, borrowed IR or state-permission cache exists.
        auto strings = mutable_data<duckdb_v2_bytes>(output);
        for (idx_t row = 0; row < count; ++row) {
            if (!programs.valid(row)) throw td::Error("program must not be NULL");
            const auto ir = td::compile_program_ir_v1(programs.text(row, 65536));
            put_text(output, strings, row, td::program_ir_json_v1(ir));
        }
        td::detail::require_float_environment();
    } catch (const ApiError &e) { report(error, e.what(), e.code); }
      catch (const std::bad_alloc &) { report(error, "native program IR allocation failed; no partial result returned",
            DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY); }
      catch (const std::exception &e) { domain_error<true>(error, e.what()); }
      catch (...) { domain_error<true>(error, "unexpected native program IR error"); }
}
void plan_ir_v2(duckdb_v2_scalar_function_exec_info_handle info,
        duckdb_v2_context_handle, duckdb_v2_error_info_handle *error) noexcept {
    try {
        td::detail::require_float_environment();
        idx_t count = 0; Vec input = nullptr, output = nullptr;
        call(duckdb_v2_scalar_function_exec_get_row_count, info, &count);
        call(duckdb_v2_scalar_function_exec_get_arg, info, idx_t(0), &input);
        call(duckdb_v2_scalar_function_exec_get_result, info, &output);
        prepare_leaf(input);
        const Reader programs(input);
        size(output, count); all_valid(output, count);
        auto strings = mutable_data<duckdb_v2_bytes>(output);
        size_t output_bytes = 0;
        constexpr size_t byte_cap = 32 * 1024 * 1024;
        for (idx_t row = 0; row < count; ++row) {
            if (!programs.valid(row)) throw td::Error("program must not be NULL");
            const auto ir = td::compile_program_ir_v2(programs.text(row, 65536));
            const auto json = td::program_ir_json_v2(ir);
            if (json.size() > byte_cap - output_bytes)
                throw td::Error("TD_E_PLAN_IR_LIMIT: IR2 batch output exceeds 32MiB; no partial result returned");
            output_bytes += json.size();
            // Compile-only owned IR -> owned string -> DuckDB output arena.
            // No dictionary/vector pointer escapes and no SQL call occurs.
            put_text(output, strings, row, json);
        }
        td::detail::require_float_environment();
    } catch (const ApiError &e) { report(error, e.what(), e.code); }
      catch (const std::bad_alloc &) { report(error, "native stratified program IR allocation failed; no partial result returned",
            DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY); }
      catch (const std::exception &e) { domain_error<true>(error, e.what()); }
      catch (...) { domain_error<true>(error, "unexpected native stratified program IR error"); }
}
#endif
struct Registration {
    duckdb_v2_scalar_function_handle function = nullptr;
    std::vector<duckdb_v2_logical_type_handle> types;
    ~Registration() {
        if (function) (void)duckdb_v2_scalar_function_destroy(&function);
        for (auto &type : types) if (type) (void)duckdb_v2_logical_type_destroy(&type);
    }
    duckdb_v2_logical_type_handle type(duckdb_v2_factory_handle factory, const std::string &text) {
        types.reserve(types.size() + 1); // Reserve before creating an owned handle.
        duckdb_v2_logical_type_handle result = nullptr; const duckdb_v2_str view{text.data(), text.size()};
        call(duckdb_v2_factory_create_type_from_text, factory, &view, &result);
        types.push_back(result); return result;
    }
};
template <bool Typed, bool Stratified = false, bool Controlled = false, bool Timed = false, bool Expanded = false>
void register_query(duckdb_v2_extension_handle extension, duckdb_v2_factory_handle factory) {
    static_assert(!Stratified || Typed, "stratified mode requires exact typed values");
    Registration owned;
    const std::string cell = Typed ? "STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE)" : "VARCHAR";
    auto text = owned.type(factory, "VARCHAR"), integer = owned.type(factory, "BIGINT");
    auto facts = owned.type(factory, "STRUCT(e VARCHAR,a VARCHAR,v " + cell +
        ",valid_from BIGINT,valid_to BIGINT,tx_from BIGINT,tx_to BIGINT)[]");
    auto result = owned.type(factory, "STRUCT(rows " + cell + "[][],rounds BIGINT,derived_facts BIGINT,work BIGINT)");
    call(duckdb_v2_scalar_function_create, factory, &owned.function);
    const char *name = Expanded ? "td_query_stratified_values_v2" :
        Timed&&Controlled ? "td_query_stratified_controlled_deadline_v1" : Timed ? "td_query_stratified_deadline_v1" : Controlled ? "td_query_stratified_controlled_v1" : Stratified ? "td_query_stratified_v1" : Typed ? "td_query_v2" : "td_query";
    const duckdb_v2_identifier_t function_name{name, std::strlen(name)};
    call(duckdb_v2_scalar_function_set_name, owned.function, &function_name);
    duckdb_v2_function_signature_handle signature = nullptr;
    call(duckdb_v2_scalar_function_get_signature, owned.function, &signature);
    const std::array<const char *, 9> names{"program", "facts", "valid_at", "known_at", "max_facts", "max_rounds", "max_work", Timed?"deadline_ms":"control","control"};
    for (idx_t i = 0; i < (Controlled&&Timed?9:Controlled||Timed ? 8 : 7); ++i) {
        const duckdb_v2_identifier_t parameter{names[i], std::strlen(names[i])};
        call(duckdb_v2_function_signature_add_parameter, signature, &parameter,
            i == 0 ? text : i == 1 ? facts : integer, static_cast<duckdb_v2_value_handle>(nullptr),
            DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
    }
    call(duckdb_v2_function_signature_set_return_type, signature, result);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING, DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY, DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING, DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING_IGNORE);
    if constexpr (Stratified) call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_STABILITY, DUCKDB_V2_FUNCTION_PROPERTY_STABILITY_VOLATILE);
    call(duckdb_v2_scalar_function_set_exec_callback, owned.function, query<Typed, Stratified, Controlled, Timed, Expanded>);
    call(duckdb_v2_extension_register_scalar_function, extension, owned.function);
}
#ifndef TD_LEGACY_ONLY
template <int Mode, bool Expanded> void schema_scalar(duckdb_v2_scalar_function_exec_info_handle info,
        duckdb_v2_context_handle,duckdb_v2_error_info_handle *error) noexcept {
    try {
        td::detail::require_float_environment();
        idx_t count=0; Vec output=nullptr;
        call(duckdb_v2_scalar_function_exec_get_row_count,info,&count);
        call(duckdb_v2_scalar_function_exec_get_result,info,&output);
        std::vector<Vec> inputs(Mode==5?2:Mode==4?5:Mode>=2?4:Mode==1?2:1);
        for(idx_t i=0;i<inputs.size();++i){
            call(duckdb_v2_scalar_function_exec_get_arg,info,i,&inputs[i]);prepare_leaf(inputs[i]);
        }
        std::vector<Reader> readers;for(auto input:inputs)readers.emplace_back(input);
        size(output,count);all_valid(output,count);size_t bytes=0;
        // One callback-local template; no input view escapes this callback.
        // All alias normalization is complete before borrowing. Equal immutable
        // DSL/descriptor cells can reuse their structural check; facts and
        // catalog state are still checked on every row.
        std::string previous_dsl,previous_ir;
#if TD_SCHEMA_BORROWED_INPUT
        std::string_view previous_dsl_input,previous_descriptor_input;
        bool descriptor_checked=false;
        const auto same_cell=[](std::string_view a,std::string_view b){return a.data()==b.data()&&a.size()==b.size();};
#endif
        std::optional<td::schema::Definition> previous_definition;
        for(idx_t row=0;row<count;++row){
            for(const auto &reader:readers)if(!reader.valid(row))
                throw td::Error("TD_E_SCHEMA_CATALOG: schema, entity and record must not be NULL");
#if TD_SCHEMA_BORROWED_INPUT
            const auto dsl=readers[0].text_view(row,16384);
#else
            const auto dsl=readers[0].text(row,16384);
#endif
            bool recompile=true;
#if TD_SCHEMA_TEMPLATE_REUSE
#if TD_SCHEMA_BORROWED_INPUT
            recompile=!previous_definition||(!same_cell(dsl,previous_dsl_input)&&dsl!=previous_dsl);
#else
            recompile=!previous_definition||dsl!=previous_dsl;
#endif
#endif
            if(recompile){
                previous_dsl=dsl;
                previous_definition=td::schema::compile(previous_dsl,Expanded);
                previous_ir=td::schema::canonical_json(*previous_definition);
#if TD_SCHEMA_BORROWED_INPUT
                descriptor_checked=false;
#endif
            }
#if TD_SCHEMA_BORROWED_INPUT
            previous_dsl_input=dsl;
#endif
            if constexpr(Mode!=0){
#if TD_SCHEMA_BORROWED_INPUT
                const auto descriptor=readers[1].text_view(row,262144);
                if(!descriptor_checked||!same_cell(descriptor,previous_descriptor_input)){
                    if(descriptor!=previous_ir)
                        throw td::Error("TD_E_SCHEMA_CATALOG: persisted definition differs from its canonical descriptor");
                    previous_descriptor_input=descriptor;descriptor_checked=true;
                }
#else
                if(previous_ir!=readers[1].text(row,262144))
                    throw td::Error("TD_E_SCHEMA_CATALOG: persisted definition differs from its canonical descriptor");
#endif
                if constexpr(Mode==2)
                    td::schema::validate_record(*previous_definition,readers[2].text(row,64),readers[3].text(row,65536));
                if constexpr(Mode==4)
                    td::schema::validate_attribute(*previous_definition,readers[2].text(row,64),readers[3].text(row,128),readers[4].at<uint8_t>(row));
                if constexpr(Mode==3||Mode==5){
                    std::string prepared;
                    if constexpr(Mode==5)prepared=td::schema::references_json(*previous_definition);
                    else prepared=td::schema::prepare_record_json(*previous_definition,readers[2].text(row,64),readers[3].text(row,65536));
                    if(prepared.size()>32*1024*1024-bytes)throw td::Error("TD_E_COMMAND_LIMIT: prepared batch exceeds 32MiB");
                    bytes+=prepared.size();put_text(output,mutable_data<duckdb_v2_bytes>(output),row,prepared);
                }else mutable_data<bool>(output)[row]=true;
            }else{
                const auto &ir=previous_ir;
                if(ir.size()>32*1024*1024-bytes)throw td::Error("TD_E_SCHEMA_LIMIT: schema IR batch exceeds 32MiB");
                bytes+=ir.size();put_text(output,mutable_data<duckdb_v2_bytes>(output),row,ir);
            }
        }
        td::detail::require_float_environment();
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"native schema allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native schema failure");}
}
template<bool Blob> void document_validation(duckdb_v2_scalar_function_exec_info_handle info,
        duckdb_v2_context_handle,duckdb_v2_error_info_handle *error) noexcept {
    try{
        idx_t count=0;Vec output=nullptr;
        call(duckdb_v2_scalar_function_exec_get_row_count,info,&count);
        call(duckdb_v2_scalar_function_exec_get_result,info,&output);
        std::array<Vec,Blob?3:1> inputs{};
        for(idx_t i=0;i<inputs.size();++i){
            call(duckdb_v2_scalar_function_exec_get_arg,info,i,&inputs[i]);prepare_leaf(inputs[i]);
        }
        std::vector<Reader> args;
        for(auto input:inputs)args.emplace_back(input);
        size(output,count);all_valid(output,count);
        auto valid=mutable_data<bool>(output);
        for(idx_t row=0;row<count;++row){
            valid[row]=false;
            if(std::any_of(args.begin(),args.end(),[&](const auto &arg){return !arg.valid(row);}))continue;
            try{
                if constexpr(Blob)valid[row]=td::schema::validate_blob_descriptor(
                    args[0].text_view(row,td::schema::max_blob_descriptor_bytes),args[1].text_view(row,512),
                    args[2].text_view(row,td::schema::max_blob_descriptor_bytes));
                else{td::detail::validate_json_source(args[0].text_view(row));valid[row]=true;}
            }catch(const td::Error &){valid[row]=false;}
        }
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"native document validation allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native document validation failed");}
}
void register_document_validation(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
    for(const bool blob:{false,true}){
        Registration owned;auto text=owned.type(factory,"VARCHAR"),result=owned.type(factory,"BOOLEAN");
        call(duckdb_v2_scalar_function_create,factory,&owned.function);
        const char *name=blob?"td_validate_blob_descriptor_v2":"td_validate_json_source_v2";
        const duckdb_v2_identifier_t id{name,std::strlen(name)};
        call(duckdb_v2_scalar_function_set_name,owned.function,&id);
        duckdb_v2_function_signature_handle signature=nullptr;
        call(duckdb_v2_scalar_function_get_signature,owned.function,&signature);
        constexpr std::array names{"payload","id","extra_json"};
        for(idx_t i=0;i<(blob?3u:1u);++i){
            const duckdb_v2_identifier_t parameter{names[i],std::strlen(names[i])};
            call(duckdb_v2_function_signature_add_parameter,signature,&parameter,text,
                static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
        }
        call(duckdb_v2_function_signature_set_return_type,signature,result);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING,DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING_IGNORE);
        call(duckdb_v2_scalar_function_set_exec_callback,owned.function,blob?document_validation<true>:document_validation<false>);
        call(duckdb_v2_extension_register_scalar_function,extension,owned.function);
    }
}
template<bool Expanded> void define_schema(duckdb_v2_function_bind_info_handle info,
        duckdb_v2_pragma_function_query_info_handle result,duckdb_v2_context_handle,
        duckdb_v2_error_info_handle *error) noexcept {
    struct OwnedValue {duckdb_v2_value_handle value=nullptr;~OwnedValue(){if(value)(void)duckdb_v2_value_destroy(&value);}} owned;
    try{
        call(duckdb_v2_function_bind_get_arg_value,info,idx_t(0),&owned.value);
        bool null=false;call(duckdb_v2_value_is_null,owned.value,&null);
        if(null)throw td::Error("TD_E_SCHEMA_SYNTAX: schema must not be NULL");
        duckdb_v2_str value{};call(duckdb_v2_value_get_varchar,owned.value,&value);
        if(value.len>16384)throw td::Error("TD_E_SCHEMA_LIMIT: schema exceeds 16384 bytes");
        const std::string dsl(value.ptr,value.len);
        const auto sql=td::schema::registration_sql(td::schema::compile(dsl,Expanded),dsl);
        const duckdb_v2_str query{sql.data(),sql.size()};
        call(duckdb_v2_pragma_function_query_set_query,result,&query);
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"native schema registration allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native schema registration failed");}
}
template<bool Expanded> void register_schema_api(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
    constexpr std::array<const char*,6> base_names{"td_schema_ir","td_schema_check","td_validate_entity",
        "td_prepare_entity","td_validate_schema_fact","td_schema_references"};
    for(const int mode:{0,1,2,3,4,5}){
        Registration owned;auto text=owned.type(factory,"VARCHAR");
        auto result=(mode==1||mode==2||mode==4)?owned.type(factory,"BOOLEAN"):text;
        auto tag=mode==4?owned.type(factory,"UTINYINT"):text;
        call(duckdb_v2_scalar_function_create,factory,&owned.function);
        const auto name=std::string(base_names[mode])+(Expanded?"_v2":"_v1");
        const duckdb_v2_identifier_t identifier{name.data(),name.size()};
        call(duckdb_v2_scalar_function_set_name,owned.function,&identifier);
        duckdb_v2_function_signature_handle signature=nullptr;
        call(duckdb_v2_scalar_function_get_signature,owned.function,&signature);
        const std::array<const char*,5> names{"schema","definition","entity",mode==4?"attribute":"record","tag"};
        for(size_t i=0;i<(mode==5?2u:mode==4?5u:mode>=2?4u:mode==1?2u:1u);++i){
            const duckdb_v2_identifier_t parameter{names[i],std::strlen(names[i])};
            call(duckdb_v2_function_signature_add_parameter,signature,&parameter,i==4?tag:text,
                static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
        }
        call(duckdb_v2_function_signature_set_return_type,signature,result);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_STABILITY,DUCKDB_V2_FUNCTION_PROPERTY_STABILITY_VOLATILE);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING,DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING_IGNORE);
        constexpr std::array callbacks{schema_scalar<0,Expanded>,schema_scalar<1,Expanded>,schema_scalar<2,Expanded>,
            schema_scalar<3,Expanded>,schema_scalar<4,Expanded>,schema_scalar<5,Expanded>};
        call(duckdb_v2_scalar_function_set_exec_callback,owned.function,callbacks[mode]);
        call(duckdb_v2_extension_register_scalar_function,extension,owned.function);
    }
    duckdb_v2_pragma_function_handle function=nullptr;
    try{
        call(duckdb_v2_pragma_function_create,factory,&function);
        const auto *name=Expanded?"td_define_schema_v2":"td_define_schema";
        const duckdb_v2_identifier_t identifier{name,std::strlen(name)};
        call(duckdb_v2_pragma_function_set_name,function,&identifier);
        duckdb_v2_function_signature_handle signature=nullptr;call(duckdb_v2_pragma_function_get_signature,function,&signature);
        Registration types;auto text=types.type(factory,"VARCHAR");const duckdb_v2_identifier_t parameter{"schema",6};
        call(duckdb_v2_function_signature_add_parameter,signature,&parameter,text,
            static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
        call(duckdb_v2_pragma_function_set_query_callback,function,define_schema<Expanded>);
        call(duckdb_v2_extension_register_pragma_function,extension,function);
    }catch(...){if(function)(void)duckdb_v2_pragma_function_destroy(&function);throw;}
    (void)duckdb_v2_pragma_function_destroy(&function);
}
void float_from_bits(duckdb_v2_scalar_function_exec_info_handle info,duckdb_v2_context_handle,
        duckdb_v2_error_info_handle *error) noexcept {
    try{
        td::detail::require_float_environment();idx_t count=0;Vec input=nullptr,output=nullptr;
        call(duckdb_v2_scalar_function_exec_get_row_count,info,&count);
        call(duckdb_v2_scalar_function_exec_get_arg,info,idx_t(0),&input);
        call(duckdb_v2_scalar_function_exec_get_result,info,&output);
        prepare_leaf(input);const Reader values(input);size(output,count);all_valid(output,count);
        for(idx_t row=0;row<count;++row){
            if(!values.valid(row)){mask_write(mutable_mask(output),row,false);continue;}
            const auto bits=values.text(row,16);uint64_t raw=0;
            const auto parsed=std::from_chars(bits.data(),bits.data()+bits.size(),raw,16);
            if(bits.size()!=16||parsed.ec!=std::errc{}||parsed.ptr!=bits.data()+bits.size())throw td::Error("TD_E_VALUE_PAYLOAD: invalid float bits");
            mutable_data<double>(output)[row]=td::Value::f64(td::detail::bits_float(raw)).as_f64();
        }
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native float inverse failed");}
}
template<bool Patch,bool Expanded>
void entity_command(duckdb_v2_function_bind_info_handle info,duckdb_v2_pragma_function_query_info_handle result,
        duckdb_v2_context_handle,duckdb_v2_error_info_handle *error) noexcept {
    struct Values{std::vector<duckdb_v2_value_handle> values;~Values(){for(auto &value:values)if(value)(void)duckdb_v2_value_destroy(&value);}} owned;
    try{
        idx_t count=0;call(duckdb_v2_function_bind_get_arg_count,info,&count,nullptr,nullptr,nullptr);
        if(count!=1&&count!=8&&count!=10)throw td::Error("TD_E_COMMAND_INPUT: invalid native command signature");
        owned.values.resize(count,nullptr);
        for(idx_t i=0;i<count;++i){
            call(duckdb_v2_function_bind_get_arg_value,info,i,&owned.values[i]);bool null=false;
            call(duckdb_v2_value_is_null,owned.values[i],&null);
            if(null)throw td::Error("TD_E_COMMAND_INPUT: command arguments must not be NULL");
        }
        const auto text=[&](idx_t index,size_t cap){
            duckdb_v2_str value{};call(duckdb_v2_value_get_varchar,owned.values[index],&value);
            if(value.len>cap)throw td::Error("TD_E_COMMAND_LIMIT: argument byte admission exceeded");
            return std::string(value.ptr,value.len);
        };
        std::string query;
        if(count==1)query=td::command::receipt_sql(text(0,128));
        else{
            td::command::EntityPut request;
            request.expanded_values=Expanded;
            request.schema_name=text(0,64);request.entity_type=text(2,64);request.entity_id=text(3,128);
            request.command_id=text(4,128);request.record=text(5,65536);
            call(duckdb_v2_value_get_bigint,owned.values[1],&request.schema_version);
            call(duckdb_v2_value_get_bigint,owned.values[6],&request.valid_from);
            call(duckdb_v2_value_get_bigint,owned.values[7],&request.valid_to);
            if(count==10){
                call(duckdb_v2_value_get_bigint,owned.values[8],&request.max_retained_facts);
                call(duckdb_v2_value_get_bigint,owned.values[9],&request.max_retained_bytes);
            }
            query=Patch?td::command::patch_entity_sql(request):td::command::put_entity_sql(request);
        }
        const duckdb_v2_str sql{query.data(),query.size()};call(duckdb_v2_pragma_function_query_set_query,result,&sql);
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"native command allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native entity command failed");}
}
void register_entity_commands(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
    {
        Registration owned;auto text=owned.type(factory,"VARCHAR"),floating=owned.type(factory,"DOUBLE");
        call(duckdb_v2_scalar_function_create,factory,&owned.function);
        constexpr char name[]="td_float_from_bits_v1";const duckdb_v2_identifier_t id{name,sizeof(name)-1};
        call(duckdb_v2_scalar_function_set_name,owned.function,&id);duckdb_v2_function_signature_handle sig=nullptr;
        call(duckdb_v2_scalar_function_get_signature,owned.function,&sig);const duckdb_v2_identifier_t arg{"bits",4};
        call(duckdb_v2_function_signature_add_parameter,sig,&arg,text,static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
        call(duckdb_v2_function_signature_set_return_type,sig,floating);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
        call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_STABILITY,DUCKDB_V2_FUNCTION_PROPERTY_STABILITY_VOLATILE);
        call(duckdb_v2_scalar_function_set_exec_callback,owned.function,float_from_bits);
        call(duckdb_v2_extension_register_scalar_function,extension,owned.function);
    }
    for(const bool expanded:{false,true})for(const int mode:{0,1,2,3,4}){
        const bool receipt=mode==1;
        if(receipt&&expanded)continue;
        const bool patch=mode>=3,limits=mode==2||mode==4;
        Registration types;auto text=types.type(factory,"VARCHAR"),integer=types.type(factory,"BIGINT");
        duckdb_v2_pragma_function_handle function=nullptr;
        try{
            call(duckdb_v2_pragma_function_create,factory,&function);
            const auto *base=receipt?"td_entity_receipt":patch?(limits?"td_patch_entity_with_limits":"td_patch_entity"):
                limits?"td_put_entity_with_limits":"td_put_entity";
            const auto name=std::string(base)+(expanded?"_v2":"");
            const duckdb_v2_identifier_t id{name.data(),name.size()};
            call(duckdb_v2_pragma_function_set_name,function,&id);duckdb_v2_function_signature_handle sig=nullptr;
            call(duckdb_v2_pragma_function_get_signature,function,&sig);
            const std::array<const char*,10> names{"schema","version","entity_type","entity_id","command_id","record","valid_from","valid_to","max_retained_facts","max_retained_bytes"};
            for(idx_t i=0;i<(receipt?1:limits?10:8);++i){
                const duckdb_v2_identifier_t arg{receipt?"command_id":names[i],receipt?10:std::strlen(names[i])};
                call(duckdb_v2_function_signature_add_parameter,sig,&arg,(!receipt&&(i==1||i>=6))?integer:text,
                    static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
            }
            const auto callback=expanded?(patch?entity_command<true,true>:entity_command<false,true>):
                (patch?entity_command<true,false>:entity_command<false,false>);
            call(duckdb_v2_pragma_function_set_query_callback,function,callback);
            call(duckdb_v2_extension_register_pragma_function,extension,function);
        }catch(...){if(function)(void)duckdb_v2_pragma_function_destroy(&function);throw;}
        (void)duckdb_v2_pragma_function_destroy(&function);
    }
}
template<bool Initialize=false>
void batch_command(duckdb_v2_function_bind_info_handle info,duckdb_v2_pragma_function_query_info_handle result,
        duckdb_v2_context_handle,duckdb_v2_error_info_handle *error) noexcept {
    struct Values {
        std::vector<duckdb_v2_value_handle> values;
        ~Values(){for(auto &value:values)if(value)(void)duckdb_v2_value_destroy(&value);}
    } owned;
    try {
        idx_t count=0;call(duckdb_v2_function_bind_get_arg_count,info,&count,nullptr,nullptr,nullptr);
        if(count!=1&&count!=4&&count!=6)throw td::Error("TD_E_COMMAND_INPUT: invalid batch command signature");
        owned.values.resize(count,nullptr);
        for(idx_t i=0;i<count;++i){
            call(duckdb_v2_function_bind_get_arg_value,info,i,&owned.values[i]);bool null=false;
            call(duckdb_v2_value_is_null,owned.values[i],&null);
            if(null)throw td::Error("TD_E_COMMAND_INPUT: batch arguments must not be NULL");
        }
        const auto text=[&](idx_t index,size_t limit){
            duckdb_v2_str value{};call(duckdb_v2_value_get_varchar,owned.values[index],&value);
            if(value.len>limit)throw td::Error("TD_E_COMMAND_LIMIT: batch argument byte admission exceeded");
            return std::string(value.ptr,value.len);
        };
        std::string query;
        if(count==1)query=td::batch::receipt_sql(text(0,128));
        else {
            td::batch::Request request;
            request.schema_name=text(0,64);request.command_id=text(2,128);request.members_json=text(3,98304);
            call(duckdb_v2_value_get_bigint,owned.values[1],&request.schema_version);
            if(count==6){
                call(duckdb_v2_value_get_bigint,owned.values[4],&request.max_retained_facts);
                call(duckdb_v2_value_get_bigint,owned.values[5],&request.max_retained_bytes);
            }
            query=td::batch::execute_sql(request,Initialize);
        }
        const duckdb_v2_str sql{query.data(),query.size()};call(duckdb_v2_pragma_function_query_set_query,result,&sql);
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"native batch allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native batch command failed");}
}
void register_batch_commands(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
    for(const int mode:{0,1,2,3,4}){
        const bool receipt=mode==4,initialize=mode==2||mode==3,limits=mode==1||mode==3;
        Registration types;auto text=types.type(factory,"VARCHAR"),integer=types.type(factory,"BIGINT");
        duckdb_v2_pragma_function_handle function=nullptr;
        try {
            call(duckdb_v2_pragma_function_create,factory,&function);
            const char *name=receipt?"td_batch_receipt":initialize?
                (limits?"td_batch_entities_initial_with_limits":"td_batch_entities_initial"):
                (limits?"td_batch_entities_with_limits":"td_batch_entities");
            const duckdb_v2_identifier_t id{name,std::strlen(name)};
            call(duckdb_v2_pragma_function_set_name,function,&id);duckdb_v2_function_signature_handle sig=nullptr;
            call(duckdb_v2_pragma_function_get_signature,function,&sig);
            const std::array<const char*,6> names{"schema","version","command_id","members","max_retained_facts","max_retained_bytes"};
            for(idx_t i=0;i<(receipt?1:limits?6:4);++i){
                const char *name=receipt?"command_id":names[i];const duckdb_v2_identifier_t arg{name,std::strlen(name)};
                call(duckdb_v2_function_signature_add_parameter,sig,&arg,(!receipt&&(i==1||i>=4))?integer:text,
                    static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
            }
            call(duckdb_v2_pragma_function_set_query_callback,function,initialize?batch_command<true>:batch_command<false>);
            call(duckdb_v2_extension_register_pragma_function,extension,function);
        }catch(...){if(function)(void)duckdb_v2_pragma_function_destroy(&function);throw;}
        (void)duckdb_v2_pragma_function_destroy(&function);
    }
}
void dependency_entry(duckdb_v2_scalar_function_exec_info_handle info,
        duckdb_v2_context_handle,duckdb_v2_error_info_handle *error) noexcept {
    try {
        td::detail::require_float_environment();
        idx_t count=0;
        Vec output=nullptr;
        std::array<Vec,9> inputs{};
        call(duckdb_v2_scalar_function_exec_get_row_count,info,&count);
        call(duckdb_v2_scalar_function_exec_get_result,info,&output);
        for(idx_t column=0;column<inputs.size();++column){
            call(duckdb_v2_scalar_function_exec_get_arg,info,column,&inputs[column]);
            prepare_leaf(inputs[column]);
        }
        const std::array args{Reader(inputs[0]),Reader(inputs[1]),Reader(inputs[2]),Reader(inputs[3]),
            Reader(inputs[4]),Reader(inputs[5]),Reader(inputs[6]),Reader(inputs[7]),Reader(inputs[8])};
        size(output,count);all_valid(output,count);
        auto positions=child(output,0),boundaries=child(output,1);
        size(positions,count);all_valid(positions,count);
        size(boundaries,count);
        auto source=mutable_data<int64_t>(positions);
        auto next=mutable_data<double>(boundaries);
        auto boundary_mask=mutable_mask(boundaries);
        for(idx_t row=0;row<count;++row){
            if(!args[0].valid(row)||!args[1].valid(row)||!args[6].valid(row))
                throw td::Error("TD_E_COMPAT_INPUT: recorded metadata and valid cut must not be NULL");
            const auto optional_double=[&](size_t column)->std::optional<double>{
                if(!args[column].valid(row))return std::nullopt;
                return args[column].at<double>(row);
            };
            const auto optional_integer=[&](size_t column)->std::optional<int64_t>{
                if(!args[column].valid(row))return std::nullopt;
                return args[column].at<int64_t>(row);
            };
            const auto result=td::compat::dependency_entry(
                {args[0].at<double>(row),args[1].at<int64_t>(row),optional_double(2),optional_integer(3),
                    optional_double(4),optional_double(5)},
                {args[6].at<double>(row),optional_double(7),optional_integer(8)});
            source[row]=result.source_position;
            mask_write(boundary_mask,row,result.next_boundary.has_value());
            if(result.next_boundary)next[row]=*result.next_boundary;
        }
        td::detail::require_float_environment();
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"native dependency projection allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native dependency projection failed");}
}
void register_dependency_entry(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
    Registration owned;
    auto floating=owned.type(factory,"DOUBLE"),integer=owned.type(factory,"BIGINT");
    auto result=owned.type(factory,"STRUCT(source_position BIGINT,next_boundary DOUBLE)");
    call(duckdb_v2_scalar_function_create,factory,&owned.function);
    constexpr char name[]="td_triplex_dependency_entry_v1";
    const duckdb_v2_identifier_t id{name,sizeof(name)-1};
    call(duckdb_v2_scalar_function_set_name,owned.function,&id);
    duckdb_v2_function_signature_handle signature=nullptr;
    call(duckdb_v2_scalar_function_get_signature,owned.function,&signature);
    constexpr std::array names{"recorded_at","recorded_position","retracted_at","retracted_position",
        "valid_from","valid_to","valid_at","cut_recorded_at","cut_recorded_position"};
    for(idx_t column=0;column<names.size();++column){
        const duckdb_v2_identifier_t parameter{names[column],std::strlen(names[column])};
        call(duckdb_v2_function_signature_add_parameter,signature,&parameter,
            column==1||column==3||column==8?integer:floating,static_cast<duckdb_v2_value_handle>(nullptr),
            DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
    }
    call(duckdb_v2_function_signature_set_return_type,signature,result);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING,
        DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY,
        DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
    call(duckdb_v2_scalar_function_set_exec_callback,owned.function,dependency_entry);
    call(duckdb_v2_extension_register_scalar_function,extension,owned.function);
}
void reserve_usage(duckdb_v2_scalar_function_exec_info_handle info,
        duckdb_v2_context_handle,duckdb_v2_error_info_handle *error) noexcept {
    try {
        idx_t count=0;
        Vec output=nullptr;
        std::array<Vec,4> inputs{};
        call(duckdb_v2_scalar_function_exec_get_row_count,info,&count);
        call(duckdb_v2_scalar_function_exec_get_result,info,&output);
        for(idx_t column=0;column<inputs.size();++column){
            call(duckdb_v2_scalar_function_exec_get_arg,info,column,&inputs[column]);
            prepare_leaf(inputs[column]);
        }
        const std::array args{Reader(inputs[0]),Reader(inputs[1]),Reader(inputs[2]),Reader(inputs[3])};
        size(output,count);all_valid(output,count);
        auto result=mutable_data<bool>(output);
        for(idx_t row=0;row<count;++row){
            if(!args[0].valid(row)||!args[1].valid(row)||!args[2].valid(row)||!args[3].valid(row))
                throw td::Error("TD_E_COMPAT_INPUT: retained reservation arguments must not be NULL");
            result[row]=td::compat::reserve_usage(args[0].at<int64_t>(row),args[1].at<int64_t>(row),
                args[2].at<int64_t>(row),args[3].at<int64_t>(row));
        }
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native retained reservation failed");}
}
void register_reserve_usage(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
    Registration owned;
    auto integer=owned.type(factory,"BIGINT"),boolean=owned.type(factory,"BOOLEAN");
    call(duckdb_v2_scalar_function_create,factory,&owned.function);
    constexpr char name[]="td_triplex_reserve_usage_v1";
    const duckdb_v2_identifier_t id{name,sizeof(name)-1};
    call(duckdb_v2_scalar_function_set_name,owned.function,&id);
    duckdb_v2_function_signature_handle signature=nullptr;
    call(duckdb_v2_scalar_function_get_signature,owned.function,&signature);
    for(const char *parameter_name:{"retained_count","retained_bytes","added_count","added_bytes"}){
        const duckdb_v2_identifier_t parameter{parameter_name,std::strlen(parameter_name)};
        call(duckdb_v2_function_signature_add_parameter,signature,&parameter,integer,
            static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
    }
    call(duckdb_v2_function_signature_set_return_type,signature,boolean);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING,
        DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY,
        DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
    call(duckdb_v2_scalar_function_set_exec_callback,owned.function,reserve_usage);
    call(duckdb_v2_extension_register_scalar_function,extension,owned.function);
}
template<bool Retract>
void compatibility_mutation(duckdb_v2_function_bind_info_handle info,
        duckdb_v2_pragma_function_query_info_handle result,duckdb_v2_context_handle,
        duckdb_v2_error_info_handle *error) noexcept {
    struct Values {
        std::vector<duckdb_v2_value_handle> values;
        ~Values(){for(auto &value:values)if(value)(void)duckdb_v2_value_destroy(&value);}
    } owned;
    try {
        idx_t count=0;
        call(duckdb_v2_function_bind_get_arg_count,info,&count,nullptr,nullptr,nullptr);
        if(count!=(Retract?4:1))throw td::Error("TD_E_COMPAT_INPUT: invalid mutation signature");
        owned.values.resize(count,nullptr);
        for(idx_t i=0;i<count;++i){
            call(duckdb_v2_function_bind_get_arg_value,info,i,&owned.values[i]);
            bool null=false;call(duckdb_v2_value_is_null,owned.values[i],&null);
            if(null)throw td::Error("TD_E_COMPAT_INPUT: mutation arguments must not be NULL");
        }
        const auto text=[&](idx_t index){
            duckdb_v2_str value{};call(duckdb_v2_value_get_varchar,owned.values[index],&value);
            if(value.len>32768)throw td::Error("TD_E_COMPAT_LIMIT: mutation argument exceeds 32 KiB");
            return std::string(value.ptr,value.len);
        };
        std::string query;
        if constexpr(Retract){
            double timestamp=0;int64_t position=0;
            call(duckdb_v2_value_get_double,owned.values[1],&timestamp);
            call(duckdb_v2_value_get_bigint,owned.values[3],&position);
            query=td::compat::retract_sql(text(0),timestamp,text(2),position);
        }else query=td::compat::append_sql(text(0));
        const duckdb_v2_str sql{query.data(),query.size()};
        call(duckdb_v2_pragma_function_query_set_query,result,&sql);
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"compatibility mutation allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"compatibility mutation failed");}
}
void register_compatibility_mutations(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
    for(const bool retract:{false,true}){
        Registration types;
        auto text=types.type(factory,"VARCHAR"),floating=types.type(factory,"DOUBLE"),integer=types.type(factory,"BIGINT");
        duckdb_v2_pragma_function_handle function=nullptr;
        try{
            call(duckdb_v2_pragma_function_create,factory,&function);
            const char *name=retract?"td_compat_retract_v1":"td_compat_append_v1";
            const duckdb_v2_identifier_t id{name,std::strlen(name)};
            call(duckdb_v2_pragma_function_set_name,function,&id);
            duckdb_v2_function_signature_handle sig=nullptr;
            call(duckdb_v2_pragma_function_get_signature,function,&sig);
            const std::array<const char*,4> names{"id","timestamp","transaction_id","position"};
            for(idx_t i=0;i<(retract?4:1);++i){
                const char *arg_name=retract?names[i]:"rows_json";
                const duckdb_v2_identifier_t arg{arg_name,std::strlen(arg_name)};
                call(duckdb_v2_function_signature_add_parameter,sig,&arg,i==1?floating:i==3?integer:text,
                    static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
            }
            call(duckdb_v2_pragma_function_set_query_callback,function,retract?compatibility_mutation<true>:compatibility_mutation<false>);
            call(duckdb_v2_extension_register_pragma_function,extension,function);
        }catch(...){if(function)(void)duckdb_v2_pragma_function_destroy(&function);throw;}
        (void)duckdb_v2_pragma_function_destroy(&function);
    }
}
template<bool Expanded,bool Presence=false> void entity_read(duckdb_v2_function_bind_info_handle info,duckdb_v2_pragma_function_query_info_handle result,
        duckdb_v2_context_handle,duckdb_v2_error_info_handle *error) noexcept {
    struct Values{std::vector<duckdb_v2_value_handle> values;~Values(){for(auto &v:values)if(v)(void)duckdb_v2_value_destroy(&v);}} owned;
    try{
        idx_t count=0;call(duckdb_v2_function_bind_get_arg_count,info,&count,nullptr,nullptr,nullptr);
        if(count!=1&&count!=3)throw td::Error("TD_E_COMMAND_INPUT: invalid native read signature");
        owned.values.resize(count,nullptr);
        for(idx_t i=0;i<count;++i){
            call(duckdb_v2_function_bind_get_arg_value,info,i,&owned.values[i]);bool null=false;
            call(duckdb_v2_value_is_null,owned.values[i],&null);
            if(null)throw td::Error("TD_E_COMMAND_INPUT: read arguments must not be NULL");
        }
        duckdb_v2_str id{};call(duckdb_v2_value_get_varchar,owned.values[0],&id);
        if(id.len>128)throw td::Error("TD_E_COMMAND_LIMIT: entity ID exceeds 128 bytes");
        const std::string entity(id.ptr,id.len);std::string query;
        if(count==1)query=td::command::history_sql(entity,Expanded);
        else{
            int64_t known=0,valid=0;call(duckdb_v2_value_get_bigint,owned.values[1],&known);
            call(duckdb_v2_value_get_bigint,owned.values[2],&valid);
            if constexpr(Presence)query=td::command::presence_at_sql(entity,known,valid);
            else query=td::command::entity_at_sql(entity,known,valid,Expanded);
        }
        const duckdb_v2_str sql{query.data(),query.size()};call(duckdb_v2_pragma_function_query_set_query,result,&sql);
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"native read allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native entity read failed");}
}
void register_entity_reads(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
    for(const int mode:{0,1,2,3,4}){
        const bool presence=mode==4,expanded=mode>=2,history=mode%2==1;
        Registration types;auto text=types.type(factory,"VARCHAR"),integer=types.type(factory,"BIGINT");
        duckdb_v2_pragma_function_handle function=nullptr;
        try{
            call(duckdb_v2_pragma_function_create,factory,&function);
            const auto name=presence?std::string("td_entity_presence_at"):std::string(history?"td_entity_history":"td_entity_at")+(expanded?"_v2":"");
            const duckdb_v2_identifier_t id{name.data(),name.size()};
            call(duckdb_v2_pragma_function_set_name,function,&id);duckdb_v2_function_signature_handle sig=nullptr;
            call(duckdb_v2_pragma_function_get_signature,function,&sig);
            const std::array<const char*,3> names{"entity_id","known_at","valid_at"};
            for(idx_t i=0;i<(history?1:3);++i){
                const duckdb_v2_identifier_t arg{names[i],std::strlen(names[i])};
                call(duckdb_v2_function_signature_add_parameter,sig,&arg,i?integer:text,
                    static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
            }
            call(duckdb_v2_pragma_function_set_query_callback,function,presence?entity_read<true,true>:expanded?entity_read<true>:entity_read<false>);
            call(duckdb_v2_extension_register_pragma_function,extension,function);
        }catch(...){if(function)(void)duckdb_v2_pragma_function_destroy(&function);throw;}
        (void)duckdb_v2_pragma_function_destroy(&function);
    }
}
template<int Mode> void store_query(duckdb_v2_function_bind_info_handle info,duckdb_v2_pragma_function_query_info_handle result,
        duckdb_v2_context_handle,duckdb_v2_error_info_handle *error) noexcept {
    constexpr bool scalable=Mode==4||Mode==7;
    constexpr bool interval=Mode==8;
    constexpr bool multi_cut=Mode==9;
    constexpr bool lookup=Mode==10;
    constexpr auto profile=Mode>=6?td::ValueProfile::AllValues:td::ValueProfile::FourTag;
    struct Values{std::array<duckdb_v2_value_handle,(multi_cut?6:lookup?7:Mode>=3?9:7)> values{};~Values(){for(auto &v:values)if(v)(void)duckdb_v2_value_destroy(&v);}} owned;
    try{
        for(idx_t i=0;i<owned.values.size();++i){
            call(duckdb_v2_function_bind_get_arg_value,info,i,&owned.values[i]);bool null=false;
            call(duckdb_v2_value_is_null,owned.values[i],&null);
            if(null)throw td::Error("TD_E_QUERY_INPUT: query arguments must not be NULL");
        }
        duckdb_v2_str program{};call(duckdb_v2_value_get_varchar,owned.values[0],&program);
        if(program.len<1||program.len>65536)throw td::Error("TD_E_QUERY_INPUT: program must contain 1..65536 bytes");
        std::string query;
        if constexpr(multi_cut||lookup){
            duckdb_v2_str option{};call(duckdb_v2_value_get_varchar,owned.values[1],&option);
            if(option.len<1||option.len>(multi_cut?672:512))
                throw td::Error(multi_cut?"TD_E_QUERY_INPUT: invalid multi-cut input length":"TD_E_QUERY_INPUT: invalid temporal lookup attribute length");
            std::array<int64_t,multi_cut?4:5> args{};
            for(idx_t i=0;i<args.size();++i)call(duckdb_v2_value_get_bigint,owned.values[i+2],&args[i]);
            if constexpr(multi_cut)
                query=td::store_query::multi_cut_sql(std::string(program.ptr,program.len),std::string(option.ptr,option.len),
                    args[0],args[1],args[2],args[3]);
            else
                query=td::store_query::lookup_sql(std::string(program.ptr,program.len),std::string(option.ptr,option.len),
                    args[0],args[1],args[2],args[3],args[4]);
        }else{
            std::array<int64_t,scalable||interval?8:6> args{};
            for(idx_t i=0;i<args.size();++i)call(duckdb_v2_value_get_bigint,owned.values[i+1],&args[i]);
            if constexpr(scalable){
                query=td::store_query::scalable_sql(std::string(program.ptr,program.len),args[0],args[1],args[2],args[3],args[4],args[5],args[6],args[7],false,profile);
            }else if constexpr(interval){
                query=td::store_query::interval_sql(std::string(program.ptr,program.len),args[0],args[1],args[2],
                    args[3],args[4],args[5],args[6],args[7]);
            }else{
                int64_t control=0,route=Mode;
                if constexpr(Mode==3||Mode==6){
                    call(duckdb_v2_value_get_bigint,owned.values[7],&control);call(duckdb_v2_value_get_bigint,owned.values[8],&route);
                    if(control<(Mode==3?1:0)||route<0||route>2)throw td::Error("TD_E_QUERY_INPUT: invalid controlled query token or route");
                }
                query=td::store_query::sql(std::string(program.ptr,program.len),args[0],args[1],args[2],args[3],args[4],args[5],route!=0,route==2,control,false,profile);
            }
        }
        const duckdb_v2_str sql{query.data(),query.size()};call(duckdb_v2_pragma_function_query_set_query,result,&sql);
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"native store query allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native store query failed");}
}
void register_store_query(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
  constexpr std::array names_by_mode{"td_query_store","td_query_store_native","td_query_store_preferred_native",
      "td_query_store_controlled","td_query_store_scalable","td_query_store_owned",
      "td_query_store_values_v2","td_query_store_scalable_v2","td_query_store_intervals_v1","td_query_store_cuts_v1","td_query_store_lookup_v1"};
  constexpr std::array callbacks{store_query<0>,store_query<1>,store_query<2>,store_query<3>,
      store_query<4>,store_query<4>,store_query<6>,store_query<7>,store_query<8>,store_query<9>,store_query<10>};
  for(size_t mode=0;mode<names_by_mode.size();++mode){
    Registration types;auto text=types.type(factory,"VARCHAR"),integer=types.type(factory,"BIGINT");
    duckdb_v2_pragma_function_handle function=nullptr;
    try{
        call(duckdb_v2_pragma_function_create,factory,&function);
        const auto name=names_by_mode[mode];const duckdb_v2_identifier_t id{name,std::strlen(name)};
        call(duckdb_v2_pragma_function_set_name,function,&id);duckdb_v2_function_signature_handle sig=nullptr;
        call(duckdb_v2_pragma_function_get_signature,function,&sig);
        const std::array<const char*,9> names=mode==10?
            std::array<const char*,9>{"program","attribute","valid_at","known_at","max_input_facts","max_candidates","control"}:
            mode==9?
            std::array<const char*,9>{"program","cuts","max_facts","max_rounds","max_work","control"}:
            mode==8?
            std::array<const char*,9>{"program","valid_from","valid_to","known_at","max_segments","max_facts","max_rounds","max_work","control"}:
            (mode==4||mode==5||mode==7)?
            std::array<const char*,9>{"program","valid_at","known_at","max_input_facts","max_intermediate_rows","max_intermediate_bytes","max_output_rows","max_output_bytes","control"}:
            std::array<const char*,9>{"program","valid_at","known_at","max_facts","max_rounds","max_work","deadline_ms","control","route"};
        for(idx_t i=0;i<(mode==9?6u:mode==10?7u:mode>=3?9u:7u);++i){
            const duckdb_v2_identifier_t arg{names[i],std::strlen(names[i])};
            call(duckdb_v2_function_signature_add_parameter,sig,&arg,i==0||(mode>=9&&i==1)?text:integer,
                static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
        }
        call(duckdb_v2_pragma_function_set_query_callback,function,callbacks[mode]);
        call(duckdb_v2_extension_register_pragma_function,extension,function);
    }catch(...){if(function)(void)duckdb_v2_pragma_function_destroy(&function);throw;}
    (void)duckdb_v2_pragma_function_destroy(&function);
  }
}
template<bool Control> void prefer_native(duckdb_v2_scalar_function_exec_info_handle info,duckdb_v2_context_handle,
        duckdb_v2_error_info_handle *error) noexcept {
    try{
        idx_t count=0;Vec input=nullptr,output=nullptr;
        call(duckdb_v2_scalar_function_exec_get_row_count,info,&count);
        call(duckdb_v2_scalar_function_exec_get_arg,info,idx_t(0),&input);
        call(duckdb_v2_scalar_function_exec_get_result,info,&output);prepare_leaf(input);const Reader values(input);
        size(output,count);all_valid(output,count);
        for(idx_t row=0;row<count;++row){
            if constexpr(Control){
                if(!values.valid(row))throw td::Error("TD_E_CONTROL: invocation token must not be NULL");
                td::control::acquire(values.at<int64_t>(row))->poll();mutable_data<bool>(output)[row]=true;
                continue;
            }
            if(!values.valid(row)||values.at<int64_t>(row)<0)throw td::Error("TD_E_QUERY_INPUT: retained cost hint must be nonnegative");
            // Cost only: execution always performs its own real admission.
            mutable_data<bool>(output)[row]=values.at<int64_t>(row)<16384;
        }
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native query cost hint failed");}
}
void register_query_preference(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
  for(const bool control:{false,true}){
    Registration owned;auto integer=owned.type(factory,"BIGINT"),boolean=owned.type(factory,"BOOLEAN");
    call(duckdb_v2_scalar_function_create,factory,&owned.function);
    const char *name=control?"td_control_check_v1":"td_prefer_native_v1";const duckdb_v2_identifier_t id{name,std::strlen(name)};
    call(duckdb_v2_scalar_function_set_name,owned.function,&id);duckdb_v2_function_signature_handle sig=nullptr;
    call(duckdb_v2_scalar_function_get_signature,owned.function,&sig);const duckdb_v2_identifier_t arg{"retained_rows",13};
    call(duckdb_v2_function_signature_add_parameter,sig,&arg,integer,static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
    call(duckdb_v2_function_signature_set_return_type,sig,boolean);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
    if(control)call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_STABILITY,DUCKDB_V2_FUNCTION_PROPERTY_STABILITY_VOLATILE);
    call(duckdb_v2_scalar_function_set_exec_callback,owned.function,control?prefer_native<true>:prefer_native<false>);
    call(duckdb_v2_extension_register_scalar_function,extension,owned.function);
  }
}
template<int Mode> void store_query_template(duckdb_v2_scalar_function_exec_info_handle info,duckdb_v2_context_handle,
        duckdb_v2_error_info_handle *error) noexcept {
    constexpr bool scalable=Mode==1||Mode==3;
    constexpr auto profile=Mode>=2?td::ValueProfile::AllValues:td::ValueProfile::FourTag;
    try{
        td::detail::require_float_environment();idx_t count=0;Vec output=nullptr;
        call(duckdb_v2_scalar_function_exec_get_row_count,info,&count);call(duckdb_v2_scalar_function_exec_get_result,info,&output);
        std::array<Vec,8> inputs{};std::vector<Reader> args;
        for(idx_t i=0;i<inputs.size();++i){call(duckdb_v2_scalar_function_exec_get_arg,info,i,&inputs[i]);prepare_leaf(inputs[i]);}
        for(const auto input:inputs)args.emplace_back(input);
        size(output,count);all_valid(output,count);size_t bytes=0;
        for(idx_t row=0;row<count;++row){
            for(const auto &arg:args)if(!arg.valid(row))throw td::Error("TD_E_QUERY_INPUT: template arguments must not be NULL");
            std::string query;
            if constexpr(scalable){
                query=td::store_query::scalable_sql(args[0].text(row,65536),args[1].at<int64_t>(row),args[2].at<int64_t>(row),
                    args[3].at<int64_t>(row),args[4].at<int64_t>(row),args[5].at<int64_t>(row),args[6].at<int64_t>(row),args[7].at<int64_t>(row),0,true,profile);
            }else{
                const auto route=args[7].at<int64_t>(row);
                if(route<0||route>2)throw td::Error("TD_E_QUERY_INPUT: invalid template route");
                query=td::store_query::sql(args[0].text(row,65536),args[1].at<int64_t>(row),args[2].at<int64_t>(row),
                    args[3].at<int64_t>(row),args[4].at<int64_t>(row),args[5].at<int64_t>(row),args[6].at<int64_t>(row),route!=0,route==2,0,true,profile);
            }
            // NULL means use the original query pragma, never reject a valid
            // program just because expanded SQL exceeds the host wire profile.
            if(query.size()>262144){mask_write(mutable_mask(output),row,false);continue;}
            if(query.size()>32*1024*1024-bytes)throw td::Error("TD_E_QUERY_LIMIT: query template batch exceeds 32MiB");
            bytes+=query.size();put_text(output,mutable_data<duckdb_v2_bytes>(output),row,query);
        }
    }catch(const ApiError &e){report(error,e.what(),e.code);}
     catch(const std::bad_alloc &){report(error,"native query template allocation failed",DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY);}
     catch(const std::exception &e){domain_error<true>(error,e.what());}
     catch(...){domain_error<true>(error,"native query template failed");}
}
void register_query_template(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
  constexpr std::array names_by_mode{"td_query_store_sql_v1","td_query_store_scalable_sql_v1","td_query_store_owned_sql_v1",
      "td_query_store_values_sql_v2","td_query_store_scalable_sql_v2"};
  constexpr std::array callbacks{store_query_template<0>,store_query_template<1>,store_query_template<1>,
      store_query_template<2>,store_query_template<3>};
  for(size_t mode=0;mode<names_by_mode.size();++mode){
    const bool scalable=mode==1||mode==2||mode==4;
    Registration owned;auto text=owned.type(factory,"VARCHAR"),integer=owned.type(factory,"BIGINT");
    call(duckdb_v2_scalar_function_create,factory,&owned.function);
    const auto name=names_by_mode[mode];const duckdb_v2_identifier_t id{name,std::strlen(name)};
    call(duckdb_v2_scalar_function_set_name,owned.function,&id);duckdb_v2_function_signature_handle sig=nullptr;
    call(duckdb_v2_scalar_function_get_signature,owned.function,&sig);
    const std::array<const char*,8> names=scalable?
        std::array<const char*,8>{"program","valid_at","known_at","max_input_facts","max_intermediate_rows","max_intermediate_bytes","max_output_rows","max_output_bytes"}:
        std::array<const char*,8>{"program","valid_at","known_at","max_facts","max_rounds","max_work","deadline_ms","route"};
    for(idx_t i=0;i<names.size();++i){const duckdb_v2_identifier_t arg{names[i],std::strlen(names[i])};
        call(duckdb_v2_function_signature_add_parameter,sig,&arg,i?integer:text,static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);}
    call(duckdb_v2_function_signature_set_return_type,sig,text);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_STABILITY,DUCKDB_V2_FUNCTION_PROPERTY_STABILITY_VOLATILE);
    call(duckdb_v2_scalar_function_set_property,owned.function,DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING,DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING_IGNORE);
    call(duckdb_v2_scalar_function_set_exec_callback,owned.function,callbacks[mode]);
    call(duckdb_v2_extension_register_scalar_function,extension,owned.function);
  }
}
template<bool Migrate=false>
void initialize_catalog(duckdb_v2_function_bind_info_handle,
        duckdb_v2_pragma_function_query_info_handle result,duckdb_v2_context_handle,
        duckdb_v2_error_info_handle *error) noexcept {
    try {
        std::string query;
        if constexpr(Migrate)query=R"TD_MIGRATE(
CREATE TEMP TABLE __td_catalog_upgrade AS
 SELECT CASE WHEN (SELECT count(*) FROM main.store_meta)<>1 OR
   (SELECT min(version) FROM main.store_meta) IS DISTINCT FROM 5 OR
   (SELECT count(*) FROM td_catalog_v1.catalog_revision)<>0 OR
   EXISTS(SELECT 1 FROM td_catalog_v1.entity_patch_commands) OR
   EXISTS(SELECT 1 FROM td_catalog_v1.entity_assertion_sources)
 THEN error('TD_E_COMMAND_FORMAT: catalog migration requires an unmigrated format five store')
 ELSE (SELECT min(version) FROM main.store_meta) END version;
DROP TABLE main.store_meta;
CREATE TABLE main.store_meta(version INTEGER PRIMARY KEY CHECK(version IN(5,6)));
INSERT INTO main.store_meta SELECT version FROM __td_catalog_upgrade;
INSERT INTO td_catalog_v1.catalog_revision VALUES (TRUE,2);
DROP TABLE __td_catalog_upgrade;
)TD_MIGRATE";
        query+=TD_CATALOG_SQL;
        const duckdb_v2_str sql{query.data(),query.size()};
        call(duckdb_v2_pragma_function_query_set_query,result,&sql);
    } catch(const ApiError &e){report(error,e.what(),e.code);}
      catch(const std::exception &e){domain_error<true>(error,e.what());}
      catch(...){domain_error<true>(error,"catalog initialization failed");}
}
void register_catalog(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
  for(const bool migrate:{false,true}){
    duckdb_v2_pragma_function_handle function=nullptr;
    try {
        call(duckdb_v2_pragma_function_create,factory,&function);
        const char *name=migrate?"td_migrate_native_catalog_v2":"td_initialize";
        const duckdb_v2_identifier_t identifier{name,std::strlen(name)};
        call(duckdb_v2_pragma_function_set_name,function,&identifier);
        call(duckdb_v2_pragma_function_set_query_callback,function,migrate?initialize_catalog<true>:initialize_catalog<false>);
        call(duckdb_v2_extension_register_pragma_function,extension,function);
    } catch(...) {
        if(function)(void)duckdb_v2_pragma_function_destroy(&function);
        throw;
    }
    (void)duckdb_v2_pragma_function_destroy(&function);
  }
}
void register_float_bits(duckdb_v2_extension_handle extension,duckdb_v2_factory_handle factory){
    Registration owned;
    auto floating=owned.type(factory,"DOUBLE"),text=owned.type(factory,"VARCHAR");
    call(duckdb_v2_scalar_function_create,factory,&owned.function);
    constexpr char name[]="td_float_bits_v1";
    const duckdb_v2_identifier_t function_name{name,sizeof(name)-1};
    call(duckdb_v2_scalar_function_set_name,owned.function,&function_name);
    duckdb_v2_function_signature_handle signature=nullptr;
    call(duckdb_v2_scalar_function_get_signature,owned.function,&signature);
    const duckdb_v2_identifier_t parameter{"value",5};
    call(duckdb_v2_function_signature_add_parameter,signature,&parameter,floating,
        static_cast<duckdb_v2_value_handle>(nullptr),DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
    call(duckdb_v2_function_signature_set_return_type,signature,text);
    call(duckdb_v2_scalar_function_set_property,owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_STABILITY,DUCKDB_V2_FUNCTION_PROPERTY_STABILITY_VOLATILE);
    call(duckdb_v2_scalar_function_set_property,owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING,DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
    call(duckdb_v2_scalar_function_set_property,owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY,DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
    call(duckdb_v2_scalar_function_set_exec_callback,owned.function,float_bits_v1);
    call(duckdb_v2_extension_register_scalar_function,extension,owned.function);
}
void register_plan_ir(duckdb_v2_extension_handle extension, duckdb_v2_factory_handle factory) {
    Registration owned;
    auto text = owned.type(factory, "VARCHAR");
    call(duckdb_v2_scalar_function_create, factory, &owned.function);
    constexpr char name[] = "td_plan_ir_v1";
    const duckdb_v2_identifier_t function_name{name, sizeof(name) - 1};
    call(duckdb_v2_scalar_function_set_name, owned.function, &function_name);
    duckdb_v2_function_signature_handle signature = nullptr;
    call(duckdb_v2_scalar_function_get_signature, owned.function, &signature);
    const duckdb_v2_identifier_t parameter{"program", 7};
    call(duckdb_v2_function_signature_add_parameter, signature, &parameter, text,
        static_cast<duckdb_v2_value_handle>(nullptr), DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
    call(duckdb_v2_function_signature_set_return_type, signature, text);
    // FP admission is execution-time state, even for a constant program string.
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_STABILITY, DUCKDB_V2_FUNCTION_PROPERTY_STABILITY_VOLATILE);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING, DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY, DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING, DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING_IGNORE);
    call(duckdb_v2_scalar_function_set_exec_callback, owned.function, plan_ir);
    call(duckdb_v2_extension_register_scalar_function, extension, owned.function);
}
void register_plan_ir_v2(duckdb_v2_extension_handle extension, duckdb_v2_factory_handle factory) {
    Registration owned;
    auto text = owned.type(factory, "VARCHAR");
    call(duckdb_v2_scalar_function_create, factory, &owned.function);
    constexpr char name[] = "td_plan_ir_v2";
    const duckdb_v2_identifier_t function_name{name, sizeof(name) - 1};
    call(duckdb_v2_scalar_function_set_name, owned.function, &function_name);
    duckdb_v2_function_signature_handle signature = nullptr;
    call(duckdb_v2_scalar_function_get_signature, owned.function, &signature);
    const duckdb_v2_identifier_t parameter{"program", 7};
    call(duckdb_v2_function_signature_add_parameter, signature, &parameter, text,
        static_cast<duckdb_v2_value_handle>(nullptr), DUCKDB_V2_FUNCTION_PARAMETER_KIND_POSITIONAL_ONLY);
    call(duckdb_v2_function_signature_set_return_type, signature, text);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_STABILITY, DUCKDB_V2_FUNCTION_PROPERTY_STABILITY_VOLATILE);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING, DUCKDB_V2_FUNCTION_PROPERTY_NULL_HANDLING_SPECIAL);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY, DUCKDB_V2_FUNCTION_PROPERTY_FALLIBILITY_FALLIBLE);
    call(duckdb_v2_scalar_function_set_property, owned.function,
        DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING, DUCKDB_V2_FUNCTION_PROPERTY_COLLATION_HANDLING_IGNORE);
    call(duckdb_v2_scalar_function_set_exec_callback, owned.function, plan_ir_v2);
    call(duckdb_v2_extension_register_scalar_function, extension, owned.function);
}
#endif
}
DUCKDB_EXTENSION_ENTRYPOINT(duckdb_v2_extension_handle extension, duckdb_v2_context_handle context,
                           duckdb_v2_error_info_handle *error) {
    try {
        duckdb_v2_factory_handle factory = nullptr; call(duckdb_v2_context_get_factory, context, &factory);
        register_query<false>(extension, factory);
#ifndef TD_LEGACY_ONLY
        register_query<true>(extension, factory);
        register_query<true, true>(extension, factory);
        register_query<true, true, true>(extension, factory);
        register_query<true, true, false,true>(extension, factory);
        register_query<true, true, true,true>(extension, factory);
        register_query<true, true, true, true, true>(extension, factory);
        register_float_bits(extension,factory);
        register_catalog(extension,factory);
        register_schema_api<false>(extension,factory);
        register_schema_api<true>(extension,factory);
        register_document_validation(extension,factory);
        register_entity_commands(extension,factory);
        register_batch_commands(extension,factory);
        register_compatibility_mutations(extension,factory);
        register_dependency_entry(extension,factory);
        register_reserve_usage(extension,factory);
        register_entity_reads(extension,factory);
        register_store_query(extension,factory);
        register_query_preference(extension,factory);
        register_query_template(extension,factory);
        register_plan_ir(extension, factory);
        register_plan_ir_v2(extension, factory);
#endif
    } catch (const ApiError &e) { report(error, e.what(), e.code); }
      catch (const std::bad_alloc &) { report(error, "native temporal Datalog registration allocation failed",
            DUCKDB_V2_ERROR_RESOURCE_OUT_OF_MEMORY); }
      catch (const std::exception &e) { report(error, e.what()); }
      catch (...) { report(error, "native temporal Datalog registration failed"); }
}

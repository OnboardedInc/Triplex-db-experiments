// SPDX-License-Identifier: MIT
// Experimental mutation on the caller's active transaction. No nested SQL or connection.
#include "compat_mutation.hpp"
#include "temporal_float.hpp"
#include "duckdb/catalog/catalog.hpp"
#include "duckdb/catalog/catalog_entry/duck_table_entry.hpp"
#include "duckdb/common/encryption_state.hpp"
#include "duckdb/common/json_document.hpp"
#include "duckdb/common/types/data_chunk.hpp"
#include "duckdb/function/scalar_function.hpp"
#include "duckdb/main/appender.hpp"
#include "duckdb/main/attached_database.hpp"
#include "duckdb/main/client_context.hpp"
#include "duckdb/main/client_context_state.hpp"
#include "duckdb/main/database.hpp"
#include "duckdb/main/database_manager.hpp"
#include "duckdb/main/extension/extension_loader.hpp"
#include "duckdb/main/valid_checker.hpp"
#include "duckdb/planner/binder.hpp"
#include "duckdb/planner/constraints/bound_check_constraint.hpp"
#include "duckdb/storage/data_table.hpp"
#include "duckdb/storage/table_storage_info.hpp"
#include "duckdb/storage/table/scan_state.hpp"
#include "duckdb/storage/table/update_state.hpp"
#include "duckdb/transaction/duck_transaction.hpp"
#include <algorithm>
#include <array>
#include <cmath>
#include <mutex>
#include <unordered_set>

namespace {
using namespace duckdb;
constexpr idx_t max_rows = 4096;
constexpr idx_t max_json_bytes = 2 * 1024 * 1024;
constexpr int64_t max_safe = 9007199254740991;
constexpr int64_t infinity = 9223372036854775807;
constexpr int64_t max_retained_rows = 1000000;
constexpr int64_t max_retained_bytes = 256 * 1024 * 1024;

[[noreturn]] void InputError(const char *message) {
    throw InvalidInputException("TD_E_COMPAT_CPP_INPUT: %s", message);
}
[[noreturn]] void FormatError(const char *message) {
    throw InvalidInputException("TD_E_COMPAT_CPP_FORMAT: %s", message);
}

void CheckJSONBounds(const char *data, idx_t size) {
    if (size == 0 || size > max_json_bytes)
        throw InvalidInputException("TD_E_COMPAT_CPP_LIMIT: JSON envelope exceeds 2 MiB");
    idx_t depth = 0, root_commas = 0;
    bool quoted = false, escaped = false;
    for (idx_t i = 0; i < size; ++i) {
        const auto c = data[i];
        if (quoted) {
            if (escaped) escaped = false;
            else if (c == '\\') escaped = true;
            else if (c == '"') quoted = false;
        } else if (c == '"') quoted = true;
        else if (c == ',' && depth == 1 && ++root_commas >= max_rows)
            throw InvalidInputException("TD_E_COMPAT_CPP_LIMIT: append exceeds 4096 rows");
        else if (c == '{' || c == '[') {
            if (++depth > 64) throw InvalidInputException("TD_E_COMPAT_CPP_LIMIT: JSON depth exceeds 64");
        } else if (c == '}' || c == ']') {
            if (depth == 0) InputError("unbalanced JSON");
            --depth;
        }
    }
}

void CheckJSONNodes(JSONValue value, idx_t &nodes) {
    if (++nodes > 1000000) throw InvalidInputException("TD_E_COMPAT_CPP_LIMIT: JSON node admission exceeded");
    if (value.IsArray()) value.IterateArray([&](JSONValue child) { CheckJSONNodes(child, nodes); });
    else if (value.IsObject()) value.IterateObject([&](const string &, JSONValue child) { CheckJSONNodes(child, nodes); });
    else if (value.IsNumber() && !std::isfinite(value.GetNumber())) InputError("nonfinite JSON number");
}

unique_ptr<JSONDocument> ParseJSON(const char *data, idx_t size) {
    CheckJSONBounds(data, size);
    auto document = JSONDocument::Parse(data, size);
    idx_t nodes = 0;
    CheckJSONNodes(document->GetRoot(), nodes);
    return document;
}

string Text(JSONValue value, bool required = false) {
    if (!value.IsString()) InputError("expected string field");
    auto text = value.GetString();
    if (text.size() > 1048576 || text.find('\0') != string::npos || (required && text.empty()))
        InputError("invalid string field");
    return text;
}
Value OptionalText(JSONValue value, bool required = false) {
    return value.IsNull() ? Value(LogicalType::VARCHAR) : Value(Text(value, required));
}
double Number(JSONValue value, bool nonnegative = false) {
    if (!value.IsNumber()) InputError("expected numeric field");
    const auto number = value.GetNumber();
    if (!std::isfinite(number) || (nonnegative && number < 0)) InputError("invalid numeric field");
    return number == 0 ? 0 : number;
}
string FloatBits(double number) {
    auto bits = td::detail::canonical_float_bits(td::detail::float_bits(number));
    constexpr char hex[] = "0123456789abcdef";
    string result(16, '0');
    for (idx_t i = 0; i < 16; ++i) result[i] = hex[(bits >> ((15 - i) * 4)) & 15];
    return result;
}
string JSONString(const string &text) {
    JSONWriter writer;
    writer.SetRoot(writer.CreateString(text));
    return writer.ToString();
}
int64_t Tick(double value) {
    return value >= 9223372036854775808.0 ? infinity : static_cast<int64_t>(std::ceil(value));
}

const std::array<const char *, 20> fields = {
    "id", "entity_id", "attribute", "value_type", "value_string", "value_number", "value_boolean", "value_datetime",
    "value_json", "recorded_at", "recorded_position", "valid_from", "valid_to", "created_by", "retracted_at",
    "retracted_position", "retract_tx_id", "entity_type", "schema_version", "tx_id"
};

void CheckFields(JSONValue row) {
    if (!row.IsObject()) InputError("expected public row object");
    uint32_t seen = 0;
    row.IterateObject([&](const string &key, JSONValue) {
        const auto found = std::find_if(fields.begin(), fields.end(), [&](const char *field) { return key == field; });
        if (found == fields.end()) InputError("unknown public row field");
        const uint32_t bit = uint32_t(1) << std::distance(fields.begin(), found);
        if (seen & bit) InputError("duplicate public row field");
        seen |= bit;
    });
    if (seen != (uint32_t(1) << fields.size()) - 1) InputError("missing public row field");
}

vector<Value> PhysicalRow(JSONValue row, CryptoHashState &hash, int64_t &charged) {
    CheckFields(row);
    const auto get = [&](const char *key) { return row.GetMember(key); };
    const auto id = Text(get("id"), true), entity = Text(get("entity_id"), true), attribute = Text(get("attribute"));
    const auto type = Text(get("value_type"), true);
    const auto recorded = Number(get("recorded_at"), true), position = Number(get("recorded_position"), true);
    const auto from = Number(get("valid_from"), true);
    const auto to = get("valid_to").IsNull() ? Value(LogicalType::DOUBLE) : Value::DOUBLE(Number(get("valid_to"), true));
    if (position < 1 || position > max_safe || std::floor(position) != position) InputError("invalid commit position");
    if (!to.IsNull() && to.GetValue<double>() <= from) InputError("empty valid interval");
    if (Number(get("schema_version")) != 1) InputError("unsupported public schema version");
    for (const auto *name : {"retracted_at", "retracted_position", "retract_tx_id"})
        if (!get(name).IsNull()) InputError("append requires unretracted row");

    string tag, wire, payload;
    uint8_t value_tag = 0;
    Value text(LogicalType::BLOB), boolean(LogicalType::BOOLEAN), floating(LogicalType::DOUBLE), extra(LogicalType::VARCHAR);
    const char *active = nullptr;
    if (type == "string" || type == "ref" || type == "blob") {
        wire = Text(get("value_string"), type == "ref");
        tag = type == "string" ? "str" : type;
        value_tag = type == "string" ? 1 : type == "ref" ? 5 : 8;
        text = Value::BLOB_RAW(wire);
        active = "value_string";
    } else if (type == "number" || type == "datetime") {
        const auto value = Number(get(type == "number" ? "value_number" : "value_datetime"));
        wire = FloatBits(value);
        tag = type == "number" ? "f64" : "datetime";
        value_tag = type == "number" ? 4 : 6;
        floating = Value::DOUBLE(value);
        active = type == "number" ? "value_number" : "value_datetime";
    } else if (type == "boolean") {
        const auto value = Number(get("value_boolean"));
        if (value != 0 && value != 1) InputError("invalid boolean carrier");
        tag = "bool"; value_tag = 2; boolean = Value::BOOLEAN(value == 1);
        active = "value_boolean";
    } else if (type == "json") {
        wire = Text(get("value_json"));
        ParseJSON(wire.data(), wire.size());
        tag = "json"; value_tag = 7; text = Value::BLOB_RAW(wire); active = "value_json";
    } else InputError("unsupported public value tag");
    if (type == "blob") {
        const auto metadata = Text(get("value_json"));
        ParseJSON(metadata.data(), metadata.size());
        extra = Value(metadata);
    }
    for (const auto *name : {"value_string", "value_number", "value_boolean", "value_datetime", "value_json"}) {
        if (string(name) != active && !(type == "blob" && string(name) == "value_json") && !get(name).IsNull())
            InputError("nonempty inactive value carrier");
    }
    payload = type == "boolean" ? (boolean.GetValue<bool>() ? "true" : "false") : JSONString(wire);
    string digest(64, '0');
    hash.HashHex(const_data_ptr_cast(payload.data()), payload.size(), &digest[0]);
    charged += entity.size() + attribute.size() + payload.size() + (extra.IsNull() ? 0 : extra.GetValue<string>().size());
    return {
        Value(id), Value(entity), Value(attribute), Value(tag), Value(payload), Value::BIGINT(Tick(from)),
        Value::BIGINT(to.IsNull() ? infinity : Tick(to.GetValue<double>())), Value::BIGINT(static_cast<int64_t>(position)),
        Value::BIGINT(infinity), Value(LogicalType::VARCHAR), Value(LogicalType::VARCHAR), Value(digest),
        Value::UTINYINT(value_tag), std::move(text), std::move(boolean), Value(LogicalType::BIGINT), std::move(floating),
        Value::DOUBLE(recorded), Value(LogicalType::DOUBLE), Value::DOUBLE(from), to,
        OptionalText(get("created_by")), OptionalText(get("entity_type")), OptionalText(get("tx_id"), true),
        Value(LogicalType::VARCHAR), std::move(extra), Value("triplex"), Value::BOOLEAN(true)
    };
}

DuckTableEntry &Table(ClientContext &context, const Identifier &catalog, const char *schema, const char *name,
                      const vector<LogicalType> &types, const vector<Identifier> &names) {
    auto &entry = Catalog::GetEntry<TableCatalogEntry>(context, QualifiedName(catalog, Identifier(schema), Identifier(name)));
    auto table = entry.TryGetDuckTableEntry();
    if (!table || table->HasGeneratedColumns() || table->GetTypes() != types) FormatError("unexpected table layout");
    const auto &columns = table->GetColumns();
    if (columns.LogicalColumnCount() != names.size()) FormatError("unexpected table column count");
    for (idx_t i = 0; i < names.size(); ++i)
        if (columns.GetColumn(LogicalIndex(i)).Name() != names[i]) FormatError("unexpected table column name");
    bool primary = false;
    for (const auto &index : table->GetStorageInfo(context).index_info)
        if (index.is_primary && index.column_set.size() == 1 && index.column_set.count(0)) primary = true;
    if (!primary) FormatError("required canonical primary key is missing");
    bool triggers = false;
    table->ScanTriggers(table->ParentCatalog().GetCatalogTransaction(context), [&](CatalogEntry &) { triggers = true; });
    if (triggers) FormatError("custom table triggers are unsupported");
    return *table;
}

vector<vector<Value>> SmallRows(ClientContext &context, DuckTableEntry &table, bool row_id = false) {
    vector<StorageIndex> columns;
    auto types = table.GetTypes();
    for (idx_t i = 0; i < types.size(); ++i) columns.emplace_back(i);
    if (row_id) { columns.emplace_back(COLUMN_IDENTIFIER_ROW_ID); types.push_back(LogicalType::BIGINT); }
    TableScanState state;
    auto &transaction = DuckTransaction::Get(context, table.ParentCatalog());
    table.GetStorage().InitializeScan(context, transaction, state, columns);
    DataChunk chunk; chunk.Initialize(context, types);
    vector<vector<Value>> rows;
    do {
        chunk.Reset();
        table.GetStorage().Scan(transaction, chunk, state);
        for (idx_t row = 0; row < chunk.size(); ++row) {
            if (rows.size() == 2) FormatError("metadata has multiple rows");
            vector<Value> values;
            for (idx_t column = 0; column < types.size(); ++column) values.push_back(chunk.GetValue(column, row));
            rows.push_back(std::move(values));
        }
    } while (chunk.size());
    return rows;
}

const vector<LogicalType> assertion_types = {
    LogicalType::VARCHAR, LogicalType::VARCHAR, LogicalType::VARCHAR, LogicalType::VARCHAR, LogicalType::VARCHAR,
    LogicalType::BIGINT, LogicalType::BIGINT, LogicalType::BIGINT, LogicalType::BIGINT,
    LogicalType::VARCHAR, LogicalType::VARCHAR, LogicalType::VARCHAR, LogicalType::UTINYINT,
    LogicalType::BLOB, LogicalType::BOOLEAN, LogicalType::BIGINT, LogicalType::DOUBLE,
    LogicalType::DOUBLE, LogicalType::DOUBLE, LogicalType::DOUBLE, LogicalType::DOUBLE,
    LogicalType::VARCHAR, LogicalType::VARCHAR, LogicalType::VARCHAR, LogicalType::VARCHAR,
    LogicalType::VARCHAR, LogicalType::VARCHAR, LogicalType::BOOLEAN
};
const vector<Identifier> assertion_names = {
    "assertion_id", "e", "a", "tag", "payload", "valid_from", "valid_to", "tx_from", "tx_to", "command_id", "corrected_by",
    "payload_hash", "v_tag", "v_s", "v_b", "v_i", "v_f", "recorded_at", "retracted_at", "external_valid_from", "external_valid_to",
    "created_by", "entity_type", "transaction_id", "retract_transaction_id", "extra_json", "origin", "interop"
};

void ModifiedDatabase(ClientContext &context, FunctionModifiedDatabasesInput &input) {
    const auto catalog_name = DatabaseManager::GetDefaultDatabase(context);
    auto &catalog = Catalog::GetCatalog(context, catalog_name);
    input.properties.RegisterDBModify(catalog, context, DatabaseModificationType::INSERT_DATA | DatabaseModificationType::UPDATE_DATA);
}

struct AppendQueryState final : ClientContextState {
    std::mutex mutex;
    bool called = false;
    void QueryBegin(ClientContext &) override {
        std::lock_guard<std::mutex> lock(mutex);
        called = false;
    }
    void Claim(ClientContext &context) {
        std::lock_guard<std::mutex> lock(mutex);
        if (called) {
            ValidChecker::Invalidate(context.ActiveTransaction(), "native append invoked repeatedly in one query");
            InputError("standalone append requires one invocation per query");
        }
        called = true;
    }
};

void Append(DataChunk &input, ExpressionState &expression, Vector &result) {
    auto &context = expression.GetContext();
    context.registered_state->GetOrCreate<AppendQueryState>("temporal_compat_append_query")->Claim(context);
    if (input.size() != 1) InputError("standalone invocation requires one row");
    if (context.transaction.IsAutoCommit()) InputError("an explicit caller transaction is required");
    td::detail::require_float_environment();
    UnifiedVectorFormat format;
    input.data[0].ToUnifiedFormat(format);
    const auto index = format.sel->get_index(0);
    if (!format.validity.RowIsValid(index)) InputError("NULL JSON envelope");
    const auto data = UnifiedVectorFormat::GetData<string_t>(format)[index];
    context.BlockingInterruptCheck();
    auto document = ParseJSON(data.GetData(), data.GetSize());
    const auto root = document->GetRoot();
    if (!root.IsArray()) InputError("expected row array");
    const auto catalog = DatabaseManager::GetDefaultDatabase(context);
    idx_t attached = 0;
    for (const auto &database : DatabaseManager::Get(context).GetDatabases(context))
        if (!database->IsSystem() && !database->IsTemporary()) ++attached;
    if (attached != 1) FormatError("extra attachments are unsupported");
    auto &meta = Table(context, catalog, "main", "store_meta", {LogicalType::INTEGER}, {"version"});
    const auto versions = SmallRows(context, meta);
    if (versions.size() != 1 || versions[0][0].IsNull() || versions[0][0].GetValue<int32_t>() != 5)
        FormatError("format five is required");
    auto &revision = Table(context, catalog, "td_catalog_v1", "catalog_revision",
        {LogicalType::BOOLEAN, LogicalType::INTEGER}, {"singleton", "revision"});
    const auto revisions = SmallRows(context, revision);
    if (revisions.size() > 1 || (!revisions.empty() && (revisions[0][0].IsNull() || revisions[0][1].IsNull() ||
        !revisions[0][0].GetValue<bool>() || revisions[0][1].GetValue<int32_t>() != 2))) FormatError("unsupported catalog revision");

    auto hash = context.db->GetMbedTLSUtil(false)->CreateHashState(CryptoHashFunction::SHA256);
    vector<vector<Value>> rows;
    std::unordered_set<string> ids;
    int64_t charged = 0;
    root.IterateArray([&](JSONValue value) {
        context.BlockingInterruptCheck();
        if (rows.size() == max_rows) throw InvalidInputException("TD_E_COMPAT_CPP_LIMIT: append exceeds 4096 rows");
        auto row = PhysicalRow(value, *hash, charged);
        if (!ids.insert(row[0].GetValue<string>()).second) InputError("duplicate assertion IDs");
        rows.push_back(std::move(row));
    });
    if (rows.empty()) InputError("empty append");
    auto &assertions = Table(context, catalog, "main", "assertions", assertion_types, assertion_names);
    auto &usage = Table(context, catalog, "main", "storage_usage",
        {LogicalType::BOOLEAN, LogicalType::BIGINT, LogicalType::BIGINT}, {"singleton", "retained_count", "retained_bytes"});
    const auto usages = SmallRows(context, usage, true);
    if (usages.size() != 1 || usages[0][0].IsNull() || !usages[0][0].GetValue<bool>() ||
        usages[0][1].IsNull() || usages[0][2].IsNull()) FormatError("invalid storage usage singleton");
    const auto old_count = usages[0][1].GetValue<int64_t>(), old_bytes = usages[0][2].GetValue<int64_t>();
    if (old_count < 0 || old_bytes < 0 || old_count > max_retained_rows - static_cast<int64_t>(rows.size()) ||
        old_bytes > max_retained_bytes - charged) throw InvalidInputException("TD_E_COMPAT_CPP_LIMIT: retained storage admission exceeded");
    auto binder = Binder::CreateBinder(context);
    const auto constraints = binder->BindConstraints(usage);
    for (const auto &constraint : constraints) {
        if (constraint->type == ConstraintType::FOREIGN_KEY)
            FormatError("foreign keys on storage usage are unsupported by the direct update");
        if (constraint->type != ConstraintType::CHECK) continue;
        const auto &columns = constraint->Cast<BoundCheckConstraint>().bound_columns;
        const bool changed = columns.count(PhysicalIndex(1)) || columns.count(PhysicalIndex(2));
        if (changed && columns.count(PhysicalIndex(0)))
            FormatError("cross-column usage checks are unsupported by the direct update");
    }
    for (const auto &index : usage.GetStorageInfo(context).index_info)
        if (index.column_set.count(1) || index.column_set.count(2))
            FormatError("indexed usage counters are unsupported by the direct update");
    auto update_state = usage.GetStorage().InitializeUpdate(usage, context, constraints);
    DataChunk update;
    update.Initialize(context, {LogicalType::BIGINT, LogicalType::BIGINT});
    update.data[0].SetValue(0, Value::BIGINT(old_count + rows.size()));
    update.data[1].SetValue(0, Value::BIGINT(old_bytes + charged));
    update.SetChildCardinality(1);
    Vector row_id(usages[0][3], count_t(1));
    InternalAppender appender(context, assertions, max_rows + 1);
    bool mutated = false;
    try {
        DataChunk chunk; chunk.Initialize(context, assertion_types);
        for (idx_t offset = 0; offset < rows.size(); offset += STANDARD_VECTOR_SIZE) {
            context.BlockingInterruptCheck();
            chunk.Reset();
            const auto count = std::min<idx_t>(STANDARD_VECTOR_SIZE, rows.size() - offset);
            for (idx_t row = 0; row < count; ++row)
                for (idx_t column = 0; column < assertion_types.size(); ++column)
                    chunk.data[column].SetValue(row, rows[offset + row][column]);
            chunk.SetChildCardinality(count);
            appender.AppendDataChunk(chunk);
        }
        mutated = true;
        appender.Flush();
        usage.GetStorage().Update(*update_state, context, usage, row_id, {PhysicalIndex(1), PhysicalIndex(2)}, update);
        appender.Close();
        result.SetValue(0, Value::BIGINT(rows.size()));
    } catch (std::exception &error) {
        try { appender.Clear(); } catch (...) {}
        if (mutated) ValidChecker::Invalidate(context.ActiveTransaction(), error.what());
        throw;
    } catch (...) {
        try { appender.Clear(); } catch (...) {}
        if (mutated) ValidChecker::Invalidate(context.ActiveTransaction(), "native append failed after mutation");
        throw;
    }
}
}

void RegisterCompatibilityMutations(duckdb::ExtensionLoader &loader) {
    duckdb::ScalarFunction function(duckdb::Identifier("td_compat_append_cpp_v1"),
        {duckdb::LogicalType::VARCHAR}, duckdb::LogicalType::BIGINT, Append);
    function.SetVolatile();
    function.SetFallible();
    function.SetNullHandling(duckdb::FunctionNullHandling::SPECIAL_HANDLING);
    function.SetModifiedDatabasesCallback(ModifiedDatabase);
    loader.RegisterFunction(std::move(function));
}

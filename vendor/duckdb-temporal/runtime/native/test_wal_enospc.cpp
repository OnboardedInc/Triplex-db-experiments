// SPDX-License-Identifier: MIT
// Test-only fault at the pinned DuckDB WAL filesystem boundary.
#include "duckdb/common/local_file_system.hpp"
#include "duckdb/common/virtual_file_system.hpp"
#include "duckdb/main/config.hpp"
#include "duckdb/main/connection.hpp"
#include "duckdb/main/database.hpp"

#include <cerrno>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <stdexcept>
#include <vector>

namespace {
namespace fs = std::filesystem;
using duckdb::Connection;
using duckdb::Value;
using Rows = std::vector<std::vector<Value>>;

void require(bool condition, const std::string &message) {
    if (!condition) throw std::runtime_error(message);
}

struct Fault {
    std::string wal;
    bool armed = false;
    int hits = 0;
    int64_t requested = 0;
    int64_t written = 0;
};

class WalFileSystem final : public duckdb::LocalFileSystem {
public:
    explicit WalFileSystem(Fault &fault) : fault(fault) {}

    int64_t Write(duckdb::FileHandle &handle, void *buffer, int64_t bytes) override {
        if (!fault.armed || handle.GetPath() != fault.wal) {
            return LocalFileSystem::Write(handle, buffer, bytes);
        }
        fault.armed = false;
        ++fault.hits;
        fault.requested = bytes;
        constexpr int64_t prefix = 17;
        require(bytes > prefix, "fixture did not reach a nontrivial WAL write");
        const auto before = LocalFileSystem::GetFileSize(handle);
        fault.written = LocalFileSystem::Write(handle, buffer, prefix);
        require(fault.written == prefix && LocalFileSystem::GetFileSize(handle) == before + prefix,
                "fixture WAL did not grow by the written prefix");
        throw duckdb::IOException({{"errno", std::to_string(ENOSPC)}},
                                  "Could not write file \"%s\": %s", handle.GetPath(), std::strerror(ENOSPC));
    }

private:
    Fault &fault;
};

std::string literal(const std::string &value) {
    std::string quoted = "'";
    for (const char character : value) {
        if (character == '\'') quoted += '\'';
        quoted += character;
    }
    return quoted + "'";
}

Rows query(Connection &connection, const std::string &sql) {
    auto result = connection.Query(sql);
    result->ThrowIfError("fixture statement " + sql + ": ");
    Rows rows;
    if (result->GetStatementProperties().return_type == duckdb::StatementReturnType::NOTHING) return rows;
    while (auto chunk = result->FetchRaw()) {
        for (duckdb::idx_t row = 0; row < chunk->size(); ++row) {
            auto &values = rows.emplace_back();
            for (duckdb::idx_t column = 0; column < chunk->ColumnCount(); ++column) {
                values.push_back(chunk->GetValue(column, row));
            }
        }
    }
    result->ThrowIfError("fixture statement " + sql + ": ");
    return rows;
}

bool same(const Rows &left, const Rows &right) {
    if (left.size() != right.size()) return false;
    for (size_t row = 0; row < left.size(); ++row) {
        if (left[row].size() != right[row].size()) return false;
        for (size_t column = 0; column < left[row].size(); ++column) {
            const auto &a = left[row][column], &b = right[row][column];
            if (a.type() != b.type() || !Value::NotDistinctFrom(a, b)) return false;
        }
    }
    return true;
}

void configure(duckdb::DBConfig &config) {
    config.SetOptionByName("allow_unsigned_extensions", Value::BOOLEAN(true));
    config.SetOptionByName("threads", Value::BIGINT(1));
    config.SetOptionByName("memory_limit", Value("128MB"));
}

void setup(Connection &connection, const std::string &core, const std::string &owner, bool fresh) {
    query(connection, "PRAGMA disable_checkpoint_on_shutdown");
    query(connection, "PRAGMA wal_autocheckpoint='1TB'");
    query(connection, "LOAD " + literal(core));
    if (fresh) {
        query(connection, "PRAGMA td_initialize");
        query(connection, "PRAGMA td_migrate_native_catalog_v2");
    }
    query(connection, "LOAD " + literal(owner));
    require(same(query(connection, "SELECT system.main.td_owner_probe_enroll()"), {{Value::BOOLEAN(true)}}),
            "owner enrollment was not acknowledged");
    require(same(query(connection, "SELECT system.main.td_owner_probe_activate(0)"), {{Value::BOOLEAN(true)}}),
            "owner audit was not acknowledged");
}

constexpr auto schema = "PRAGMA td_define_schema('schema wal_fault version 1 {entity Item {n:int64 required;}}')";
constexpr auto seed = "PRAGMA td_put_entity('wal_fault',1,'Item','a','seed','{n=1;}',0,10)";
constexpr auto seed_receipt = "PRAGMA td_entity_receipt('seed')";
constexpr auto batch_receipt = "PRAGMA td_batch_receipt('retry')";
constexpr auto metadata = "SELECT version,revision,position,retained_count,retained_bytes,"
    "(SELECT count(*) FROM main.assertions),(SELECT count(*) FROM main.commands),"
    "(SELECT count(*) FROM td_catalog_v1.entity_batches),(SELECT count(*) FROM td_catalog_v1.entity_batch_members),"
    "(SELECT count(*) FROM td_catalog_v1.entity_assertion_sources) "
    "FROM main.store_meta,td_catalog_v1.catalog_revision,main.clock,main.storage_usage";

std::string batch(bool initial) {
    const std::string members = R"JSON([{"operation":"patch","type":"Item","entityId":"a","record":"{n=2;}","validFrom":"2","validTo":"8"},{"operation":"put","type":"Item","entityId":"b","record":"{n=3;}","validFrom":"0","validTo":"10"}])JSON";
    return std::string("PRAGMA td_batch_entities") + (initial ? "_initial" : "") +
           "('wal_fault',1,'retry'," + literal(members) + ")";
}

std::string point_sql(char entity, int known, int valid) {
    return std::string("PRAGMA td_entity_at_v2('") + entity + "'," + std::to_string(known) + "," +
           std::to_string(valid) + ")";
}

void point(Connection &connection, char entity, int known, int valid, const char *expected) {
    const auto rows = query(connection, point_sql(entity, known, valid));
    if (!expected) {
        require(rows.empty(), "expected empty temporal cut");
        return;
    }
    require(rows.size() == 1 && rows[0].size() == 15 &&
                rows[0][3] == Value("i64") && rows[0][4] == Value(expected),
            "temporal cut value differs");
}

std::vector<Rows> snapshot(Connection &connection) {
    return {query(connection, metadata), query(connection, seed_receipt), query(connection, batch_receipt),
            query(connection, "PRAGMA td_entity_history_v2('a')"),
            query(connection, "PRAGMA td_entity_history_v2('b')"),
            query(connection, point_sql('a', 1, 4)), query(connection, point_sql('b', 1, 4))};
}

void require_snapshot(Connection &connection, const std::vector<Rows> &expected, const char *stage) {
    const auto actual = snapshot(connection);
    for (size_t index = 0; index < actual.size(); ++index) {
        require(same(actual[index], expected[index]), std::string(stage) + ": snapshot cell " + std::to_string(index));
    }
}

std::string wal_bytes(const fs::path &path) {
    const auto size = fs::file_size(path);
    require(size > 0 && size <= 1024 * 1024, "fixture WAL must be nonempty and bounded");
    std::ifstream stream(path, std::ios::binary);
    require(bool(stream), "cannot open fixture WAL for comparison");
    std::string bytes{std::istreambuf_iterator<char>(stream), std::istreambuf_iterator<char>()};
    require(bytes.size() == size, "could not read complete fixture WAL");
    return bytes;
}

void check_metadata(Connection &connection, int format, int revision, int position, int assertions, int commands,
                    int batches, int members, int sources) {
    const auto state = query(connection, metadata);
    require(state.size() == 1 && state[0].size() == 10, "invalid metadata shape");
    const auto &r = state[0];
    require(r[0].GetValue<int64_t>() == format && r[1].GetValue<int64_t>() == revision &&
            r[2].GetValue<int64_t>() == position && r[3].GetValue<int64_t>() == assertions &&
            r[4].GetValue<int64_t>() > 0 && r[5].GetValue<int64_t>() == assertions &&
            r[6].GetValue<int64_t>() == commands && r[7].GetValue<int64_t>() == batches &&
            r[8].GetValue<int64_t>() == members && r[9].GetValue<int64_t>() == sources, "invalid metadata state");
}
}

int main(int argc, char **argv) {
    try {
        require(argc == 4, "usage: wal-enospc CORE OWNER FRESH_FIXTURE");
        const fs::path requested = argv[3];
        const auto database = fs::canonical(requested.parent_path()) / requested.filename();
        Fault fault{database.string() + ".wal"};
        require(fs::symlink_status(database).type() == fs::file_type::not_found &&
                fs::symlink_status(fault.wal).type() == fs::file_type::not_found, "fixture must be fresh");

        std::vector<Rows> before;
        Rows staged;
        std::string durable_wal;
        {
            duckdb::DBConfig config;
            configure(config);
            config.file_system = duckdb::make_uniq<duckdb::VirtualFileSystem>(duckdb::make_uniq<WalFileSystem>(fault));
            duckdb::DuckDB instance(database.string(), &config);
            Connection connection(instance);
            setup(connection, argv[1], argv[2], true);
            query(connection, schema);
            const auto acknowledged_seed = query(connection, seed);
            require(acknowledged_seed.size() == 1 && same(acknowledged_seed, query(connection, seed_receipt)),
                    "seed receipt differs");
            check_metadata(connection, 5, 2, 1, 1, 1, 0, 0, 0);
            point(connection, 'a', 1, 4, "\"1\"");
            before = snapshot(connection);
            require(before[2].empty(), "unexpected prior batch receipt");
            durable_wal = wal_bytes(fault.wal);

            query(connection, "BEGIN TRANSACTION");
            staged = query(connection, batch(true));
            require(staged.size() == 1 && staged[0].size() == 7 && staged[0][1].GetValue<int64_t>() == 2 &&
                    same(staged, query(connection, batch_receipt)), "staged receipt differs");
            check_metadata(connection, 9, 3, 2, 5, 2, 1, 2, 2);
            require(wal_bytes(fault.wal) == durable_wal, "staged batch reached the WAL before COMMIT");

            fault.armed = true;
            auto failed = connection.Query("COMMIT");
            require(!fault.armed && fault.hits == 1 && fault.written > 0, "did not intercept one physical WAL write");
            // TransactionContext::Commit wraps recoverable filesystem IO errors in TransactionException.
            require(failed->HasError(), "COMMIT unexpectedly succeeded");
            require(failed->GetErrorType() == duckdb::ExceptionType::TRANSACTION &&
                    failed->GetError().find(std::strerror(ENOSPC)) != std::string::npos,
                    "COMMIT did not surface the injected ENOSPC: " + failed->GetError());
            require_snapshot(connection, before, "after failed COMMIT");
            require(wal_bytes(fault.wal) == durable_wal, "WAL was not restored after ENOSPC");
        }
        require(wal_bytes(fault.wal) == durable_wal, "baseline WAL did not survive close");

        std::vector<Rows> committed;
        for (const bool retry : {true, false}) {
            duckdb::DBConfig config;
            configure(config);
            duckdb::DuckDB instance(database.string(), &config);
            Connection connection(instance);
            setup(connection, argv[1], argv[2], false);
            require_snapshot(connection, retry ? before : committed, retry ? "after reopen" : "after retry reopen");
            if (retry) require(same(query(connection, batch(true)), staged), "healthy retry changed staged receipt");
            require(same(query(connection, batch_receipt), staged), "durable batch receipt differs");
            require(same(query(connection, batch(false)), staged), "canonical replay receipt differs");
            check_metadata(connection, 9, 3, 2, 5, 2, 1, 2, 2);
            point(connection, 'a', 1, 4, "\"1\"");
            point(connection, 'a', 2, 4, "\"2\"");
            point(connection, 'a', 2, 8, "\"1\"");
            point(connection, 'b', 1, 4, nullptr);
            point(connection, 'b', 2, 4, "\"3\"");
            if (retry) committed = snapshot(connection);
        }
        std::cout << "{\"result\":\"PASS\",\"method\":\"partial synthetic WAL write then ENOSPC\","
                  << "\"errno\":" << ENOSPC << ",\"intercepted_writes\":" << fault.hits
                  << ",\"requested_bytes\":" << fault.requested << ",\"partial_bytes\":" << fault.written
                  << ",\"prior_wal_bytes\":" << durable_wal.size() << ",\"prior_position\":1,\"retry_position\":2}\n";
        return 0;
    } catch (const std::exception &error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}

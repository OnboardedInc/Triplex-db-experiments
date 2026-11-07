// SPDX-License-Identifier: MIT
// DuckDB-owned lifecycle and integrity checks for the native store.
#include "duckdb/catalog/catalog.hpp"
#include "duckdb/catalog/catalog_entry/view_catalog_entry.hpp"
#include "duckdb/common/enums/order_type.hpp"
#include "duckdb/common/exception.hpp"
#include "duckdb/common/types/data_chunk.hpp"
#include "duckdb/common/types/value.hpp"
#include "duckdb/function/scalar_function.hpp"
#include "duckdb/main/attached_database.hpp"
#include "duckdb/main/client_context.hpp"
#include "duckdb/main/client_context_state.hpp"
#include "duckdb/main/connection.hpp"
#include "duckdb/main/connection_manager.hpp"
#include "duckdb/main/database.hpp"
#include "duckdb/main/database_manager.hpp"
#include "duckdb/main/extension/extension_loader.hpp"
#include "duckdb/main/query_result.hpp"
#include "duckdb/main/query_parameters.hpp"
#include "duckdb/main/settings.hpp"
#include "duckdb/parser/parser.hpp"
#include "duckdb/parser/parsed_data/create_view_info.hpp"
#include "duckdb/parser/statement/create_statement.hpp"
#include "duckdb/planner/extension_callback.hpp"
#include "duckdb/transaction/duck_transaction_manager.hpp"
#include "duckdb/transaction/meta_transaction.hpp"
#include "temporal_integrity.hpp"
#include "temporal_current_unique.hpp"
#include "temporal_uniqueness.hpp"
#include "temporal_presence.hpp"
#include "native_writer.hpp"
#if TD_COMPAT_MUTATIONS
#include "compat_mutation.hpp"
#endif
#include <chrono>
#include <map>
#include <mutex>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

namespace {
using namespace duckdb;

void CheckOwnerConfiguration(const ClientContext &context) {
    if (!Settings::Get<DefaultCollationSetting>(context).empty() ||
        Settings::Get<DefaultOrderSetting>(context) != OrderType::ASCENDING ||
        Settings::Get<DefaultNullOrderSetting>(context) != DefaultOrderByNullType::NULLS_LAST)
        throw InvalidInputException("TD_E_OWNER_CONFIG: expected binary collation, ascending order and NULLS LAST");
}

unique_ptr<FunctionData> BindOwnerGuard(BindScalarFunctionInput &input) {
    // Reject binding under different comparison semantics even if settings
    // are later restored before a cached statement executes.
    CheckOwnerConfiguration(input.GetClientContext());
    return nullptr;
}

void CheckCatalogViews(ClientContext &context) {
    static const auto canonical = [] {
        auto parser = Parser::GetBuiltinParser();
        parser.ParseQuery(TD_CATALOG_SQL);
        vector<unique_ptr<CreateInfo>> views;
        for (auto &statement : parser.statements) {
            if (statement->type != StatementType::CREATE_STATEMENT) continue;
            auto &info = statement->Cast<CreateStatement>().info;
            if (info->type == CatalogType::VIEW_ENTRY && info->GetQualifiedName().Schema() == Identifier("td_catalog_v1"))
                views.push_back(std::move(info));
        }
        if (views.empty()) throw InternalException("Missing embedded native catalog views");
        return views;
    }();
    context.RunFunctionInTransaction([&] {
        const auto database_name = DatabaseManager::GetDefaultDatabase(context);
        for (const auto &info : canonical) {
            const auto &expected = info->Cast<CreateViewInfo>();
            const auto &name = expected.GetQualifiedName();
            const auto actual = Catalog::GetEntry<ViewCatalogEntry>(context,
                QualifiedName(database_name, name.Schema(), name.Name()), OnEntryNotFound::RETURN_NULL);
            // DuckDB's expression equality ignores aliases in SELECT lists.
            if (!actual || !actual->query || actual->aliases != expected.aliases ||
                actual->security_type != expected.security_type || !actual->query->Equals(*expected.query) ||
                actual->query->ToString() != expected.query->ToString())
                throw InvalidInputException("TD_E_OWNER_AUDIT_CATALOG: native catalog view differs: %s", name.Name());
        }
    });
}

struct ProbeEvent {
    uint64_t sequence;
    std::string kind;
    uint64_t connection;
    uint64_t transaction;
    uint64_t generation;
};

struct ProbeState;
thread_local ProbeState *creating_audit_connection = nullptr;
struct AuditCandidate {
    uint64_t connection;
    uint64_t transaction;
    uint64_t generation;
    bool completed = false;
    bool committed = false;
    bool current_unique = false;
    bool all_cut_unique = false;
};

struct CheckpointCandidate {
    uint64_t connection;
    uint64_t generation;
    std::optional<uint64_t> transaction;
    bool committed = false;
};

struct ProbeState {
    explicit ProbeState(DatabaseInstance &database) : database(database) {}

    DatabaseInstance &database;
    std::mutex mutex;
    std::set<uint64_t> live;
    std::set<uint64_t> enrolled;
    std::set<uint64_t> internal;
    std::map<uint64_t, uint64_t> transactions;
    std::map<uint64_t, uint64_t> enrollment_pending;
    std::set<uint64_t> enrollment_committed;
    std::vector<ProbeEvent> events;
    uint64_t sequence = 0;
    uint64_t generation = 0;
    bool armed = false;
    bool audited = false;
    bool current_unique = false;
    bool all_cut_unique = false;
    bool auditing = false;
    std::optional<AuditCandidate> candidate;
    std::optional<CheckpointCandidate> checkpoint;
    weak_ptr<AttachedDatabase> audited_database;

    void RecordLocked(const char *kind, uint64_t connection, uint64_t transaction = 0) {
        if (events.size() == 256) events.erase(events.begin());
        events.push_back({++sequence, kind, connection, transaction, generation});
    }

    void RejectCheckpointLocked() {
        if (checkpoint->generation != generation) return;
        armed = false;
        audited = false;
        ++generation;
        RecordLocked("checkpoint_rejected", checkpoint->connection);
    }

    bool CheckpointActiveLocked(const shared_ptr<AttachedDatabase> &attached) const {
        // The pinned engine sets this atomic only after creating the checkpoint
        // context and marking its direct transaction read-only. An additional
        // INTERNAL connection revokes the scope, so it cannot borrow this proof.
        return checkpoint && checkpoint->generation == generation && checkpoint->transaction && attached &&
            attached->GetTransactionManager().Cast<DuckTransactionManager>().GetActiveCheckpoint().IsValid();
    }

    void CheckCheckpointLocked(shared_ptr<AttachedDatabase> &attached) {
        if (!checkpoint || checkpoint->committed) return;
        attached = audited_database.lock();
        if (!CheckpointActiveLocked(attached))
            throw InvalidInputException("TD_E_OWNER_PROBE_INVALID: unclassified internal connection is active");
    }

    void ConnectionOpened(uint64_t connection, bool initial, bool audit_connection, bool engine_internal) {
        std::lock_guard<std::mutex> lock(mutex);
        if (audit_connection) {
            internal.insert(connection);
            RecordLocked("audit_connection_open", connection);
            return;
        }
        if (!initial && engine_internal && armed && audited && !checkpoint && !transactions.empty()) {
            checkpoint = CheckpointCandidate{connection, generation, std::nullopt};
            RecordLocked("checkpoint_candidate_open", connection);
            return;
        }
        live.insert(connection);
        if (!initial) {
            armed = false;
            audited = false;
            ++generation;
        }
        RecordLocked(initial ? "initial_connection" : "connection_open", connection);
    }

    void ConnectionClosed(uint64_t connection) {
        std::lock_guard<std::mutex> lock(mutex);
        if (internal.erase(connection)) {
            RecordLocked("audit_connection_close", connection);
            return;
        }
        if (checkpoint && checkpoint->connection == connection) {
            if (!checkpoint->committed) RejectCheckpointLocked();
            RecordLocked(checkpoint->committed ? "checkpoint_close" : "checkpoint_candidate_close", connection);
            checkpoint.reset();
            return;
        }
        live.erase(connection);
        enrolled.erase(connection);
        transactions.erase(connection);
        enrollment_pending.erase(connection);
        enrollment_committed.erase(connection);
        armed = false;
        audited = false;
        ++generation;
        RecordLocked("connection_close", connection);
    }

    void Event(const char *kind, uint64_t connection, uint64_t transaction = 0) {
        std::lock_guard<std::mutex> lock(mutex);
        RecordLocked(kind, connection, transaction);
    }

    void QueryBegin(uint64_t connection) {
        std::lock_guard<std::mutex> lock(mutex);
        RecordLocked("query_begin", connection);
        if (checkpoint && checkpoint->connection == connection) RejectCheckpointLocked();
    }

    void TransactionBegin(uint64_t connection, uint64_t transaction, bool audit_connection) {
        std::lock_guard<std::mutex> lock(mutex);
        RecordLocked("transaction_begin", connection, transaction);
        if (audit_connection) return;
        if (checkpoint && checkpoint->connection == connection) {
            if (checkpoint->transaction) RejectCheckpointLocked();
            else checkpoint->transaction = transaction;
            return;
        }
        transactions[connection] = transaction;
        if (candidate && candidate->connection != connection) {
            armed = false;
            audited = false;
            ++generation;
            RecordLocked("audit_peer_transaction", connection, transaction);
        }
    }

    void TransactionEnd(uint64_t connection, MetaTransaction &transaction, bool committed, bool audit_connection) {
        shared_ptr<AttachedDatabase> attached;
        std::lock_guard<std::mutex> lock(mutex);
        RecordLocked(committed ? "transaction_commit" : "transaction_rollback", connection,
                     transaction.global_transaction_id);
        if (audit_connection) return;
        if (checkpoint && checkpoint->connection == connection) {
            attached = audited_database.lock();
            const auto &opened = transaction.OpenedTransactions();
            checkpoint->committed = checkpoint->generation == generation && committed &&
                checkpoint->transaction == transaction.global_transaction_id &&
                transaction.IsReadOnly() && !transaction.ModifiedDatabase() && attached &&
                opened.size() == 1 && &opened[0].get() == attached.get();
            if (!checkpoint->committed) RejectCheckpointLocked();
            return;
        }
        transactions.erase(connection);
        const auto enrollment = enrollment_pending.find(connection);
        if (enrollment != enrollment_pending.end() && enrollment->second == transaction.global_transaction_id) {
            if (committed && !transaction.ModifiedDatabase()) enrollment_committed.insert(connection);
            else enrollment_pending.erase(enrollment);
        }
        if (candidate && candidate->connection == connection && candidate->transaction == transaction.global_transaction_id) {
            candidate->committed = committed && !transaction.ModifiedDatabase();
            if (!candidate->committed) {
                audited = false;
                armed = false;
                RecordLocked("audit_transaction_rejected", connection, transaction.global_transaction_id);
            }
        }
    }

    void QueryEnd(ClientContext &context, bool failed, bool audit_connection) {
        std::lock_guard<std::mutex> lock(mutex);
        const auto connection = context.GetConnectionId();
        RecordLocked("query_end", connection);
        if (audit_connection) return;
        if (checkpoint && checkpoint->connection == connection) {
            RejectCheckpointLocked();
            return;
        }
        if (enrollment_pending.erase(connection)) {
            if (!failed && !context.IsInterrupted() && enrollment_committed.count(connection)) {
                enrolled.insert(connection);
                RecordLocked("enroll", connection);
            }
            enrollment_committed.erase(connection);
        }
        if (!candidate || candidate->connection != connection) return;
        const bool valid = !failed && !context.IsInterrupted() && candidate->completed && candidate->committed &&
            candidate->generation == generation && live == enrolled && transactions.empty();
        audited = valid;
        current_unique = valid && candidate->current_unique;
        all_cut_unique = valid && candidate->all_cut_unique;
        armed = valid;
        RecordLocked(valid ? "audit_activated" : "audit_discarded", connection, candidate->transaction);
        candidate.reset();
        auditing = false;
    }

    void VerifyInstance(ClientContext &context) {
        if (&DatabaseInstance::GetDatabase(context) != &database)
            throw InvalidInputException("TD_E_OWNER_PROBE_INSTANCE: different database instance");
    }

    void PrepareWriterBootstrap(ClientContext &context) {
        VerifyInstance(context);
        std::lock_guard<std::mutex> lock(mutex);
        if(armed||audited||auditing||candidate||checkpoint||context.GetConnectionType()!=ConnectionType::USER||
           !live.count(context.GetConnectionId())||!context.transaction.IsAutoCommit())
            throw InvalidInputException("TD_E_OWNER_PROBE_CONTEXT: native writer bootstrap requires unarmed factory context");
    }

    bool Enroll(ClientContext &context) {
        VerifyInstance(context);
        std::lock_guard<std::mutex> lock(mutex);
        const auto connection = context.GetConnectionId();
        if (context.GetConnectionType() == ConnectionType::INTERNAL || !live.count(connection))
            throw InvalidInputException("TD_E_OWNER_PROBE_CONTEXT: unknown live context");
        const auto observed = transactions.find(connection);
        if (!context.transaction.IsAutoCommit() || observed == transactions.end() ||
            observed->second != context.ActiveTransaction().global_transaction_id)
            throw InvalidInputException("TD_E_OWNER_PROBE_CONTEXT: enrollment requires a fresh observed autocommit transaction");
        enrollment_pending[connection] = observed->second;
        RecordLocked("enroll_pending", connection);
        return true;
    }

    bool Arm(ClientContext &context) {
        VerifyInstance(context);
        std::lock_guard<std::mutex> lock(mutex);
        if (live.empty() || enrolled != live || checkpoint)
            throw InvalidInputException("TD_E_OWNER_PROBE_ENROLLMENT: every live context must be enrolled");
        armed = true;
        audited = false;
        ++generation;
        RecordLocked("arm", context.GetConnectionId());
        return true;
    }

    bool Check(ClientContext &context, bool require_audit = false) {
        VerifyInstance(context);
        if (require_audit) CheckOwnerConfiguration(context);
        shared_ptr<AttachedDatabase> attached;
        std::lock_guard<std::mutex> lock(mutex);
        RecordLocked("check", context.GetConnectionId());
        if (!armed || !enrolled.count(context.GetConnectionId()) || (require_audit && !audited))
            throw InvalidInputException("TD_E_OWNER_PROBE_INVALID: owner scope is not armed");
        CheckCheckpointLocked(attached);
        return true;
    }

    int64_t UniquenessCapabilities(ClientContext &context) {
        VerifyInstance(context);
        CheckOwnerConfiguration(context);
        shared_ptr<AttachedDatabase> attached;
        std::lock_guard<std::mutex> lock(mutex);
        if (!armed || !audited || !enrolled.count(context.GetConnectionId()))
            throw InvalidInputException("TD_E_OWNER_PROBE_INVALID: owner scope is not audited");
        CheckCheckpointLocked(attached);
        return (current_unique ? 1 : 0) | (all_cut_unique ? 2 : 0);
    }

    bool CurrentUnique(ClientContext &context) {
        return (UniquenessCapabilities(context) & 1) != 0;
    }

    int64_t ReadAuditValue(ClientContext &context, Connection &audit, const std::string &sql) {
        auto result = audit.Submit(sql, QueryParameters{});
        result->ThrowIfError();
        result->Materialize();
        bool executed = false;
        for (;;) {
            try {
                context.BlockingInterruptCheck();
            } catch (...) {
                audit.Interrupt();
                result->Close();
                Event("audit_interrupt_forwarded", context.GetConnectionId());
                throw;
            }
            const auto progress = result->ExecuteTask();
            if (!executed) {
                Event("audit_task_executed", context.GetConnectionId());
                executed = true;
            }
            if (IsTerminal(progress)) break;
            if (progress == QueryResultState::BLOCKED || progress == QueryResultState::NO_TASKS_AVAILABLE)
                std::this_thread::sleep_for(std::chrono::milliseconds(2));
        }
        result->ThrowIfError();
        auto row = result->Fetch();
        if (!row || row->size() != 1 || row->ColumnCount() != 1 || result->Fetch())
            throw InvalidInputException("TD_E_OWNER_AUDIT_RESULT: malformed native integrity result");
        const auto value = row->GetValue(0, 0).GetValue<int64_t>();
        result->Close();
        return value;
    }

    bool Invalidate(ClientContext &context) {
        VerifyInstance(context);
        std::lock_guard<std::mutex> lock(mutex);
        armed = false;
        audited = false;
        ++generation;
        RecordLocked("dispatch_invalidate", context.GetConnectionId());
        return true;
    }

    bool Activate(ClientContext &context, int64_t delay_ms) {
        VerifyInstance(context);
        if (delay_ms < 0 || delay_ms > 1000)
            throw InvalidInputException("TD_E_OWNER_AUDIT_INPUT: audit test delay must be 0..1000ms");
        {
            std::lock_guard<std::mutex> lock(mutex);
            armed = false;
            audited = false;
            if (candidate || checkpoint)
                throw InvalidInputException("TD_E_OWNER_AUDIT_BUSY: another activation or internal connection is pending");
            if (!context.transaction.IsAutoCommit() || context.ActiveTransaction().ModifiedDatabase())
                throw InvalidInputException("TD_E_OWNER_AUDIT_CONTEXT: activation requires a read-only autocommit query");
            if (live.empty() || live != enrolled)
                throw InvalidInputException("TD_E_OWNER_PROBE_ENROLLMENT: every live context must be enrolled");
            for (const auto &entry : transactions) {
                if (entry.first != context.GetConnectionId())
                    throw InvalidInputException("TD_E_OWNER_AUDIT_BUSY: another user transaction is active");
            }
            ++generation;
            candidate = AuditCandidate{context.GetConnectionId(), context.ActiveTransaction().global_transaction_id, generation};
            auditing = true;
            RecordLocked("audit_begin", context.GetConnectionId(), candidate->transaction);
        }
        try {
            bool unique = false;
            bool all_cuts = false;
            shared_ptr<AttachedDatabase> attached;
            CheckOwnerConfiguration(context);
            context.ActiveTransaction().SetReadOnly();
            context.BlockingInterruptCheck();
            {
                // The TLS marker is only for construction. The registered
                // per-context state retains the internal classification.
                struct Marker {
                    ProbeState *previous;
                    explicit Marker(ProbeState *state) : previous(creating_audit_connection) { creating_audit_connection = state; }
                    ~Marker() { creating_audit_connection = previous; }
                } marker(this);
                Connection audit(database);
                creating_audit_connection = marker.previous;
                CheckOwnerConfiguration(*audit.context);
                attached = DatabaseManager::Get(*audit.context).GetDatabase(DatabaseManager::GetDefaultDatabase(*audit.context));
                if (attached && !attached->GetTransactionManager().IsDuckTransactionManager()) attached.reset();
                if (ReadAuditValue(context, audit, td::integrity::user_functions_sql()) != 0)
                    throw InvalidInputException("TD_E_OWNER_AUDIT_HELPERS: user-defined functions are unsupported in the native catalog");
                CheckCatalogViews(*audit.context);
                if (ReadAuditValue(context, audit, td::integrity::audit_sql()) < 0)
                    throw InvalidInputException("TD_E_OWNER_AUDIT_RESULT: malformed native integrity result");
                const auto format = ReadAuditValue(context, audit, "SELECT version::BIGINT FROM main.store_meta");
                if (format >= 10 && ReadAuditValue(context, audit, td::uniqueness::audit_sql()) != 1)
                    throw InvalidInputException("TD_E_OWNER_AUDIT_RESULT: malformed uniqueness constraint result");
                if (format == 11 && ReadAuditValue(context, audit, td::presence::audit_sql()) != 1)
                    throw InvalidInputException("TD_E_OWNER_AUDIT_RESULT: malformed presence constraint result");
                if (TD_CURRENT_UNIQUE_FAST_PATH) {
                    const auto value = ReadAuditValue(context, audit, td::integrity::current_unique_sql());
                    if (value < 0 || value > 1)
                        throw InvalidInputException("TD_E_OWNER_AUDIT_RESULT: malformed uniqueness result");
                    unique = value == 1;
                    Event(unique ? "audit_current_unique" : "audit_current_nonunique", context.GetConnectionId());
                }
                if (TD_ALL_CUT_UNIQUE_FAST_PATH) {
                    const auto value = ReadAuditValue(context, audit, td::integrity::all_cut_unique_sql());
                    if (value < 0 || value > 1)
                        throw InvalidInputException("TD_E_OWNER_AUDIT_RESULT: malformed all-cut uniqueness result");
                    all_cuts = value == 1;
                    Event(all_cuts ? "audit_all_cut_unique" : "audit_all_cut_nonunique", context.GetConnectionId());
                }
            }
            Event("audit_read_complete", context.GetConnectionId());
            const auto until = std::chrono::steady_clock::now() + std::chrono::milliseconds(delay_ms);
            while (std::chrono::steady_clock::now() < until) {
                context.BlockingInterruptCheck();
                std::this_thread::sleep_for(std::chrono::milliseconds(2));
            }
            context.BlockingInterruptCheck();
            CheckOwnerConfiguration(context);
            std::lock_guard<std::mutex> lock(mutex);
            if (!candidate || candidate->generation != generation || live != enrolled)
                throw InvalidInputException("TD_E_OWNER_AUDIT_CHANGED: ownership changed during audit");
            audited_database = attached;
            candidate->completed = true;
            candidate->current_unique = unique;
            candidate->all_cut_unique = all_cuts;
            auditing = false;
            RecordLocked("audit_awaiting_ack", context.GetConnectionId(), candidate->transaction);
            return true;
        } catch (...) {
            std::lock_guard<std::mutex> lock(mutex);
            candidate.reset();
            auditing = false;
            armed = false;
            audited = false;
            RecordLocked("audit_failed", context.GetConnectionId());
            throw;
        }
    }

    std::string Snapshot(ClientContext &context) {
        VerifyInstance(context);
        shared_ptr<AttachedDatabase> attached;
        std::lock_guard<std::mutex> lock(mutex);
        if (checkpoint) attached = audited_database.lock();
        std::ostringstream out;
        out << "{\"connection\":" << context.GetConnectionId()
            << ",\"generation\":" << generation << ",\"armed\":" << (armed ? "true" : "false")
            << ",\"audited\":" << (audited ? "true" : "false") << ",\"auditing\":" << (auditing ? "true" : "false")
            << ",\"checkpointActive\":" << (CheckpointActiveLocked(attached) ? "true" : "false")
            << ",\"currentUnique\":" << (audited && current_unique ? "true" : "false")
            << ",\"allCutUnique\":" << (audited && all_cut_unique ? "true" : "false")
            << ",\"live\":[";
        const auto write_ids = [&](const std::set<uint64_t> &ids) {
            bool first = true;
            for (const auto id : ids) {
                if (!first) out << ',';
                first = false;
                out << id;
            }
        };
        write_ids(live);
        out << "],\"enrolled\":[";
        write_ids(enrolled);
        out << "],\"events\":[";
        bool first = true;
        for (const auto &event : events) {
            if (!first) out << ',';
            first = false;
            out << "{\"sequence\":" << event.sequence << ",\"kind\":\"" << event.kind
                << "\",\"connection\":" << event.connection << ",\"transaction\":" << event.transaction
                << ",\"generation\":" << event.generation << '}';
        }
        out << "]}";
        return out.str();
    }
};

class ProbeContextState final : public ClientContextState {
public:
    ProbeContextState(shared_ptr<ProbeState> state, bool audit_connection)
        : state(std::move(state)), audit_connection(audit_connection) {}
    void QueryBegin(ClientContext &context) override {
        state->QueryBegin(context.GetConnectionId());
    }
    void QueryEnd(ClientContext &context, optional_ptr<ErrorData> error) override {
        state->QueryEnd(context, error && error->HasError(), audit_connection);
    }
    void TransactionBegin(MetaTransaction &transaction, ClientContext &context) override {
        state->TransactionBegin(context.GetConnectionId(), transaction.global_transaction_id, audit_connection);
    }
    void TransactionCommit(MetaTransaction &transaction, ClientContext &context) override {
        state->TransactionEnd(context.GetConnectionId(), transaction, true, audit_connection);
    }
    void TransactionRollback(MetaTransaction &transaction, ClientContext &context, optional_ptr<ErrorData>) override {
        state->TransactionEnd(context.GetConnectionId(), transaction, false, audit_connection);
    }
private:
    shared_ptr<ProbeState> state;
    bool audit_connection;
};

class ProbeCallbacks final : public ExtensionCallback {
public:
    explicit ProbeCallbacks(shared_ptr<ProbeState> state) : state(std::move(state)) {}
    void Attach(ClientContext &context, bool initial) {
        const bool audit_connection = creating_audit_connection == state.get();
        state->ConnectionOpened(context.GetConnectionId(), initial, audit_connection,
                                context.GetConnectionType() == ConnectionType::INTERNAL);
        context.registered_state->GetOrCreate<ProbeContextState>("temporal_owner_probe", state, audit_connection);
    }
    void OnConnectionOpened(ClientContext &context) override { Attach(context, false); }
    void OnConnectionClosed(ClientContext &context) override { state->ConnectionClosed(context.GetConnectionId()); }
private:
    shared_ptr<ProbeState> state;
};

enum class ProbeOperation { Enroll, Arm, Check, Invalidate, Status, Activate, ValidatedCheck, CurrentUnique, UniquenessCapabilities };
void RegisterProbe(ExtensionLoader &loader, shared_ptr<ProbeState> state, const char *name, ProbeOperation operation) {
    const auto type = operation == ProbeOperation::Status ? LogicalType::VARCHAR :
        operation == ProbeOperation::UniquenessCapabilities ? LogicalType::BIGINT : LogicalType::BOOLEAN;
    const auto parameters = operation == ProbeOperation::Activate ? vector<LogicalType>{LogicalType::BIGINT} : vector<LogicalType>{};
    ScalarFunction function(Identifier(name), parameters, type,
        [state, operation](DataChunk &input, ExpressionState &expression, Vector &result) {
            auto &context = expression.GetContext();
            Value value;
            switch (operation) {
            case ProbeOperation::Enroll: value = Value::BOOLEAN(state->Enroll(context)); break;
            case ProbeOperation::Arm: value = Value::BOOLEAN(state->Arm(context)); break;
            case ProbeOperation::Check: value = Value::BOOLEAN(state->Check(context)); break;
            case ProbeOperation::Invalidate: value = Value::BOOLEAN(state->Invalidate(context)); break;
            case ProbeOperation::Status: value = Value(state->Snapshot(context)); break;
            case ProbeOperation::Activate:
                if (input.size() != 1 || input.GetValue(0, 0).IsNull())
                    throw InvalidInputException("TD_E_OWNER_AUDIT_INPUT: activation requires one non-NULL delay");
                value = Value::BOOLEAN(state->Activate(context, input.GetValue(0, 0).GetValue<int64_t>()));
                break;
            case ProbeOperation::ValidatedCheck: value = Value::BOOLEAN(state->Check(context, true)); break;
            case ProbeOperation::CurrentUnique: value = Value::BOOLEAN(state->CurrentUnique(context)); break;
            case ProbeOperation::UniquenessCapabilities: value = Value::BIGINT(state->UniquenessCapabilities(context)); break;
            }
            for (idx_t row = 0; row < input.size(); ++row) result.SetValue(row, value);
        });
    if (operation == ProbeOperation::ValidatedCheck || operation == ProbeOperation::CurrentUnique ||
        operation == ProbeOperation::UniquenessCapabilities)
        function.SetBindCallback(BindOwnerGuard);
    function.SetVolatile();
    function.SetFallible();
    loader.RegisterFunction(std::move(function));
}
}

extern "C" DUCKDB_CPP_EXTENSION_ENTRY(temporal_owner_probe, loader) {
    auto &database = loader.GetDatabaseInstance();
    auto state = duckdb::make_shared_ptr<ProbeState>(database);
    auto callbacks = duckdb::make_shared_ptr<ProbeCallbacks>(state);
    duckdb::ExtensionCallback::Register(database.config, callbacks);
    for (auto &context : database.GetConnectionManager().GetConnectionList()) callbacks->Attach(*context, true);
    RegisterProbe(loader, state, "td_owner_probe_enroll", ProbeOperation::Enroll);
    RegisterProbe(loader, state, "td_owner_probe_arm", ProbeOperation::Arm);
    RegisterProbe(loader, state, "td_owner_probe_check", ProbeOperation::Check);
    RegisterProbe(loader, state, "td_owner_probe_invalidate", ProbeOperation::Invalidate);
    RegisterProbe(loader, state, "td_owner_probe_status", ProbeOperation::Status);
    RegisterProbe(loader, state, "td_owner_probe_activate", ProbeOperation::Activate);
    RegisterProbe(loader, state, "td_owner_probe_validated_check", ProbeOperation::ValidatedCheck);
    RegisterProbe(loader, state, "td_owner_probe_current_unique_check", ProbeOperation::CurrentUnique);
    RegisterProbe(loader, state, "td_owner_probe_uniqueness_check", ProbeOperation::UniquenessCapabilities);
    RegisterNativeWriter(loader,[state](ClientContext &context){state->PrepareWriterBootstrap(context);});
#if TD_COMPAT_MUTATIONS
    RegisterCompatibilityMutations(loader);
#endif
}

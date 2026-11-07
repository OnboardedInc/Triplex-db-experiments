// SPDX-License-Identifier: MIT
#pragma once
#include "catalog_sql.hpp"
#include <string>

namespace td::integrity {
// Embedded support limits belong to the running binary, not a persisted view
// that a newer binary may have replaced before this one opened the database.
inline std::string format_check_sql() {
    return R"TD_FORMAT(SELECT CASE
 WHEN (SELECT count(*) FROM main.store_meta)<>1 OR EXISTS(
   SELECT 1 FROM main.store_meta WHERE version IS NULL OR version NOT IN(5,6,8,9,10,11))
 THEN error('TD_E_COMMAND_FORMAT: unsupported native store format')
 WHEN (SELECT count(*) FROM td_catalog_v1.catalog_revision)>1 OR EXISTS(
   SELECT 1 FROM td_catalog_v1.catalog_revision WHERE singleton IS DISTINCT FROM TRUE OR revision IS NULL OR revision NOT IN(2,3))
 THEN error('TD_E_COMMAND_FORMAT: unsupported native catalog revision')
 WHEN EXISTS(SELECT 1 FROM main.store_meta m WHERE CASE m.version
   WHEN 5 THEN EXISTS(SELECT 1 FROM td_catalog_v1.catalog_revision WHERE revision<>2)
   WHEN 9 THEN (SELECT count(*) FROM td_catalog_v1.catalog_revision)<>1
   WHEN 10 THEN (SELECT count(*) FROM td_catalog_v1.catalog_revision)<>1
   WHEN 11 THEN (SELECT count(*) FROM td_catalog_v1.catalog_revision)<>1
   ELSE (SELECT count(*) FROM td_catalog_v1.catalog_revision WHERE revision=2)<>1 END)
 THEN error('TD_E_COMMAND_FORMAT: native format/catalog revision mismatch')
 ELSE TRUE END ok)TD_FORMAT";
}
inline std::string environment_checks_sql() {
    return "WHEN NOT (SELECT ok FROM ("+format_check_sql()+") native_format) "
        "THEN error('TD_E_COMMAND_FORMAT: unsupported native catalog') "
        "WHEN (SELECT count(*) FROM system.main.pragma_database_list)<>1 "
        "THEN error('TD_E_QUERY_CATALOG: visible extra attachments are unsupported') "
        "WHEN system.main.td_float_from_bits_v1('0000000000000000')<>0 "
        "THEN error('TD_E_QUERY_PROFILE: invalid float codec') ";
}

// All persisted operations use the live audited generation. The scalar is
// volatile and must run in the operation's statement/transaction.
inline std::string owner_check_sql(const std::string &control = {}) {
    std::string sql = "SELECT CASE ";
    if (!control.empty())
        sql += "WHEN NOT system.main.td_control_check_v1(" + control + ") THEN error('TD_E_CONTROL: invalid invocation') ";
    return sql + "WHEN system.main.td_owner_probe_validated_check() IS NOT TRUE "
        "THEN error('TD_E_OWNER_PROBE_INVALID: owner scope is not audited') " +
        environment_checks_sql() + "ELSE TRUE END ok";
}

// A managed store has no user-defined functions or macros. Keep this
// preflight in the system catalog even when a store shadows built-in names.
inline std::string user_functions_sql() {
    return "SELECT CASE WHEN EXISTS(SELECT 1 FROM system.main.duckdb_functions() "
        "WHERE database_name IS DISTINCT FROM 'system') THEN 1 ELSE 0 END::BIGINT";
}

// Only the companion invokes this audit, in its private audit connection.
inline std::string audit_sql() {
    return "WITH retained AS MATERIALIZED (SELECT count(*) retained_count,"
        "coalesce(sum(octet_length(encode(e))::HUGEINT+octet_length(encode(a))+octet_length(encode(payload))"
        "+coalesce(octet_length(encode(extra_json)),0)),0) retained_bytes,"
        "count(*) FILTER (WHERE (" + std::string(TD_RETAINED_VALIDITY_SQL) + ") IS NOT TRUE) invalid "
        "FROM main.assertions) SELECT CASE " + environment_checks_sql() +
        "WHEN NOT (SELECT ok FROM td_catalog_v1.native_catalog_integrity) "
        "THEN error('TD_E_COMMAND_FORMAT: invalid native catalog') "
        "WHEN (SELECT count(*) FROM main.clock WHERE singleton AND position>=0 AND position<9223372036854775807)<>1 "
        "OR (SELECT count(*) FROM main.clock)<>1 "
        "OR (SELECT count(*) FROM main.storage_usage WHERE singleton AND retained_count>=0 AND retained_bytes>=0)<>1 "
        "OR (SELECT count(*) FROM main.storage_usage)<>1 "
        "THEN error('TD_E_COMMAND_FORMAT: invalid native clock or storage usage') "
        "WHEN retained.invalid<>0 THEN error('TD_E_QUERY_CARRIER: persisted carrier or interval is inconsistent') "
        "WHEN retained.retained_count IS DISTINCT FROM (SELECT retained_count FROM main.storage_usage WHERE singleton) "
        "OR retained.retained_bytes IS DISTINCT FROM (SELECT retained_bytes FROM main.storage_usage WHERE singleton) "
        "THEN error('TD_E_OWNER_AUDIT_USAGE: retained storage accounting differs from the stored assertions') "
        "ELSE (SELECT count(*) FROM td_catalog_v1.entity_history) END checked FROM retained";
}
}

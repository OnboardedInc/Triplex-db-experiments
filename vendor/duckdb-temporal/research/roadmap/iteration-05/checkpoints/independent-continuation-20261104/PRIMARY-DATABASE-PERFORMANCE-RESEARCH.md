# Goal5 aggregate execution: primary-source countercheck

4 November 2026. Research only. No source modification, import, execution, dependency acquisition, benchmark or computer inspection was performed. This note does not select a runtime action or reopen any consumed or blocked subject.

## Conclusion

**No distinct remaining aggregate execution slice was identified.** The pinned goal5 record already closes its selected mathematical/native/reference/actual-SQL conformance component. Repeating a SQL-only COUNT/MIN/MAX/checked-i64-SUM consumer would duplicate that evidence rather than advance the remaining public-store acceptance. Performance, generic spill and physical memory guarantees are expressly separate in the selected goal.

The remaining public corrected-history/store action still depends on original public runtime/profile and fresh path admission. The failed prestart pytz acquisition is not cleared by the SQL-only runtime recipe, another goal's timestamp projection, materialization hints, casts, shims or alternate dependencies. No execution workaround is proposed here. No material new source bug was established by this bounded countercheck.

## Verified project basis

- [Pinned goal and acceptance boundaries]([PRIVATE_REFERENCE_REMOVED]): selected actual-SQL route is complete; public-store acceptance remains blocked. The contract-only oracle and completed-relation consumer are not new missing gates.
- [Pinned selected SQL contract]([PRIVATE_REFERENCE_REMOVED]) and [emitter]([PRIVATE_REFERENCE_REMOVED]): whole-program positive-acyclic/filter-free admission, complete-native fallback, typed-slot identity, full-tuple sets, explicit empty handling and wide integer SUM followed by final BIGINT.
- [Runtime reuse guide]([PRIVATE_REFERENCE_REMOVED]) and [project guidance]([PRIVATE_REFERENCE_REMOVED]) were read remotely and pinned after readback. They are absent at the PR20 head, so the current-main versions were read separately, not attributed to PR20. The runtime guide's SQL-only reuse is technical evidence, not public-profile admission.

The findings below preserve design constraints for later authorized changes. They are not extra acceptance requirements and do not establish an observed regression.

## Semantic constraints worth preserving

1. **Full tuples, not distinct measures.** DuckDB's aggregate DISTINCT removes duplicate argument values. MIN/MAX ignore this distinction, whereas COUNT/SUM can change. Consequently, replacing the existing full-relation DISTINCT with COUNT(DISTINCT measure) or SUM(DISTINCT measure) would lose separate witnesses with equal measures. The current emitter deduplicates ordinary complete tuples before aggregation. [Aggregate function semantics](https://duckdb.org/docs/2.0/sql/functions/aggregates)

2. **Empty output is operator-specific.** SQL aggregates normally ignore NULL; all general aggregates except COUNT return NULL on an empty group. The existing emitter already supplies empty global SUM zero, removes empty extrema using HAVING COUNT(*)>0, and leaves keyed empty sources without groups. Coalescing every aggregate or adding an anchor group would change the selected semantics. [Aggregate function semantics](https://duckdb.org/docs/2.0/sql/functions/aggregates)

3. **Final checked i64 is not an arbitrary fold.** The existing SQL source explicitly widens measures to HUGEINT, then narrows the proved-safe final result to BIGINT. Overflowing casts raise errors, and TRY_CAST would turn them into NULL. A floating intermediate, prefix-i64 check, saturation or TRY_CAST is therefore not an equivalent replacement. The current route conservatively falls back for unproved cancellation cases rather than weakening native semantics. [Typecasting and overflow](https://duckdb.org/docs/2.0/sql/data_types/typecasting), [numeric integer ranges](https://duckdb.org/docs/2.0/sql/data_types/numeric)

4. **SQL FILTER is not a downstream language filter.** Aggregate FILTER removes contributions before the aggregate. It does not specify the project's whole-program type/overflow/error ordering. Pushing a false downstream predicate into an aggregate can hide an upstream failure. The current SQL contract deliberately sends opaque filters to the complete native route; official SQL FILTER support is not a reason to remove that boundary. This last application is an inference from the project contract and SQL operator semantics. [FILTER clause](https://duckdb.org/docs/2.0/sql/query_syntax/filter)

## Materialization and physical plans

DuckDB documents default CTE materialization plus conditional inlining and explicit MATERIALIZED/NOT MATERIALIZED hints. It advises letting the optimizer choose in general. A logical completed relation does not itself promise a particular physical temporary table, nor do hints establish native work-counter parity or whole-program error precedence. The existing pre-SQL proof, not the spelling of WITH clauses, supplies those obligations. Repeated-use DAGs are a potential future performance dimension, not an uncovered current correctness gate. [CTE materialization](https://duckdb.org/docs/2.0/sql/query_syntax/with)

DuckDB's grouped aggregation research describes parallel hash tables, local reduction and partitioned combination. Pre-sorted input permits a streaming algorithm in principle, but this does not prove that adding ORDER BY makes the pinned engine select one. Sorting also has a cost. The ICDE paper concerns robust external hash aggregation, not a project-specific spill guarantee. If performance is later in scope, group cardinality, key width, clustering and repeated source use are useful workload dimensions; a plan and measurement must establish the actual behavior. [Parallel grouped aggregation](https://duckdb.org/2022/03/07/aggregate-hashtable), [Robust External Hash Aggregation, ICDE 2024](https://duckdb.org/pdf/ICDE2024-kuiper-boncz-muehleisen-out-of-core.pdf)

No memory-containment conclusion follows from those papers. DuckDB documents possible OOM with multiple blocking operators and limitations on spilling complex states. The project guide separately warns that memory_limit is not a process address-space cap. [Larger-than-memory limitations](https://duckdb.org/docs/2.0/guides/performance/how_to_tune_workloads)

## Safe future measurement design, only if selected later

- Separate end-to-end compilation/proof/binding/execution/full-fetch/canonicalization time from engine-only diagnostics. Keep complete-result correctness checks alongside timing. Define warm-up, repetitions, summary statistic and query-order policy in advance; keep every timing, not only the fastest. DuckDB's benchmark documentation demonstrates separate data preparation, repeated timings and result checks. [Benchmark suite](https://duckdb.org/docs/2.0/dev/benchmark)
- EXPLAIN returns a plan rather than running the subject's physical query pipeline; EXPLAIN ANALYZE runs it and is a new subject execution. EXPLAIN still entails planning, binding and optimization, including constant folding. It is therefore not a general promise of no function calls, callbacks or I/O, and is not an automatic exemption from an action's admission boundary. This caution is an inference from the documented phases and function behavior, not a tested property of this project's binary. Parallel operator times need not sum to wall time. [Profiling queries](https://duckdb.org/docs/2.0/sql/statements/profiling), [engine phases](https://duckdb.org/docs/2.0/internals/overview), [scalar function constant folding](https://duckdb.org/docs/2.0/clients/java/functions), [profiling interpretation](https://duckdb.org/docs/2.0/guides/performance/how_to_tune_workloads)
- Default profiling output can pollute canonical stdout; a profiling file is overwritten on each query. Future diagnostic capture would need its own explicitly reviewed output handling rather than sharing an old result target. [Profiling and pragmas](https://duckdb.org/docs/2.0/configuration/pragmas)
- Keep optimizer-on behavior as the baseline. Selectively disabling optimizers is documented as a debugging tool, not a production recommendation or a correctness repair. Changes to filter pushdown/materialization must preserve the selected whole-program proof and fallback contract. [Optimizer controls](https://duckdb.org/docs/2.0/configuration/pragmas)
- Preserve project-only fixtures, source/input identities, plans, answers, counters and timings. Do not add machine inventories, device/process identities or configuration snapshots for a stronger-looking benchmark report.

## Acceptance boundary

This is a source/research countercheck, not a new run, independent receipt review, loaded-image attestation, performance result or full-goal acceptance. Versioned public documentation supports design reasoning but does not prove behavior of the exact pinned binary. Existing successful, NONPASS, uncertain and blocked outcomes remain unchanged. The next acceptance dependency is still the original public profile/path barrier, owned by the original lane.

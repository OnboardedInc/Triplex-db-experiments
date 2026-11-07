# Temporal store research and experiment wiki

The working objective is three shared engine foundations and five competing
query surfaces, through the TypeScript SDK and Triplex schemas. Native query
facades initially share the same writes/history/receipts. Read concurrency is
primary; steady durable writes remain mandatory. Calibration precedes candidate
performance decisions. All ten goals and target scale remain unfinished.

- [Operational commands and evidence contracts](../qualification/devloop/README.md)
- [Current five-path execution plan](../qualification/devloop/PLAN.md)
- [Goal ledger](goals.md)
- [Current five-path evidence, failures and rolling waves](status.md)
- [Operating decisions](decisions/operating-policy.md)
- [Source and research map](research.md)
- [Recovery and retention problem](problems/recovery.md)
- [DuckDB recursive multiplicity and effective resource bounds](problems/duckdb-recursion.md)
- [Measured DuckDB owner reconciliation and cancellation gap](problems/duckdb-owner-audit.md)
- [Measured writer ACK, visibility and client-pool routes](problems/load-liveness.md)
- [Measured repeated XTDB transaction identity reads](problems/transaction-identity-read-duplication.md)
- [Controller state growth and publication recovery](problems/controller-state-growth.md)
- [Native signed-zero parameters and evidence](problems/native-number-parameters.md)
- [General/native read-basis scope type boundary](problems/read-basis-scope-types.md)
- [Unbundled Core module resolution and private runtime portability](problems/unbundled-core-module-resolution.md)
- [QLever native string ordering (`backend:qlever`, `problem:string-order`, `status:observed`)](problems/qlever-native-string-order.md)
- [QLever wrapper text range domain (`surface:qlever-datalog`, `status:observed`)](problems/qlever-wrapper-string-range.md)
- [Shared public string-order extension (QLever paths failed; other paths unexecuted)](../qualification/extensions/string-order-v1/CONTRACT.md)
- [QLever lexical-comparison and binary-vocabulary hypotheses (`status:source-only`)](research/qlever-string-comparison-mechanisms-v1.md)
- [Initial queued hypotheses](../qualification/devloop/initial-queue.json)

Use `backend:duckdb|xtdb|qlever`, `surface:<queryPath>`, `goal:1..10`,
`problem:<id>`, `mechanism:<name>` and `status:historical|unreproduced|observed|
hypothesis|rejected|qualified|promoted|regressed|superseded`. A solved/qualified
tag must name exact source, semantic scope, population, load/resources and actual
receipt. Research mechanisms are hypotheses, never automatic passes.

The original menu declarations remain preserved. Three untested DuckDB menus
were explicitly deferred before execution after its owner stage was measured;
three competing owner mechanisms replace them, with queued-work withdrawal as a
separate, now narrowly qualified correctness prerequisite. The current queue has fifteen live hypotheses,
three per surface. Menus are unexecuted proposals, not measured priorities. See
[current status](status.md) and the independently verified
[five-path local source checkpoint](checkpoints/functional-source-20261106.md).
Controller tests are separate from native/public correctness and capacity. The durable queue and attempts live
under ignored `.devloop/`; source manifests and compact research stay in Git.

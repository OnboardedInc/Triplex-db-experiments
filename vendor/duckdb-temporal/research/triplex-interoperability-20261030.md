# Triplex interoperability and temporal Datalog / DuckDB research
Research date: 2026-10-30 UTC. Source inspection only; no Triplex package installation, adapter execution, conformance run, production deployment, or benchmark was performed by this researcher.

## Decision
**Build the temporal Datalog engine as an explicitly separate prototype, with a possible Triplex adapter as a later conformance-backed integration.** A matching triple vocabulary or a matching Datalog example is not backend compatibility. A thin TypeScript/Effect adapter over DuckDB is realistic in principle, but the exact transaction, scalar, historical-read, pagination, and provenance contracts below must be preserved.

**The 2026 low-level API premise is partly correct:** DuckDB 2.0 introduced C API v2 and new extensibility, but released documentation explicitly marks C API v2 unstable. The older C extension API dates to 2024/2025. A prototype built and tested against 1.4.3 must say so, rather than claiming the new 2.0 hooks or latest-release support. See [DuckDB release/API chronology](#4-duckdb-releaseapi-chronology--verified).

## 1. Identity, source, packages, and license — verified
The actual https://triplex.build/ site links to **bjacobso/triplex**, Ben Jacobson's WorldVM-incubated embedded TypeScript + Effect fact database. It is not Triplit and not the similarly named 3D editor.

The complete main-branch Git tree inspected resolved to **e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0**. All source conclusions below are pinned to this commit. The repository [LICENSE](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/LICENSE) is MIT, copyright 2026 Ben Jacobson; preserve its notice when copying substantial code or docs.

Manifest versions at this commit (not an independent npm availability audit):
| Public package | Version |
|---|---:|
| @triplex-build/triplex | 0.2.0 |
| @triplex-build/triplex-sql | 0.2.0 |
| @triplex-build/triplex-testkit | 0.2.0 |
| @triplex-build/triplex-sqlite | 0.1.1 |
| @triplex-build/triplex-postgres | 0.1.1 |
| @triplex-build/triplex-http | 0.1.1 |
| @triplex-build/triplex-cli | 0.1.1 |

Cloudflare, FoundationDB, dashboard, and host packages are marked private. The catalog pins **Effect 4.0.3**, and public package engines require **Node >=22**. Some cached rendered docs still mention Effect release candidates; prefer the inspected [catalog](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/pnpm-workspace.yaml) and exact manifests. The inspected tree has no DuckDB-named backend files. This does not establish that no unpublished branch or external integration exists.

The maturity document calls memory KV and SQLite the supported baseline, PostgreSQL a pre-1.0 production candidate, and Cloudflare/FoundationDB experimental. Datomic/XTDB pages are proposed blueprints, not adapters. [Current state](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/current-state.md), [backend blueprints](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/backends.md).

## 2. Actual adapter boundary — verified
Two public paths exist:
- `Runtime.fromKv({ name, backend: Layer<KvBackend> })`: implement ordered byte keys, range scans, and atomic callbacks; Triplex supplies the hexastore and evaluator.
- `Runtime.define({ name, storage: Layer<StorageAdapter>, queries: Layer<QueryExecutor> })`: implement storage and execution separately; Triplex supplies the public service and higher layers.

Grounded composition shape, shortened from the checked custom-runtime guide; declarations are placeholders, not a working DuckDB adapter:
```ts
import { Layer } from "effect";
import { Runtime, DatabaseScope, Capabilities,
         StorageAdapter, QueryExecutor } from "@triplex-build/triplex/runtime";

declare const storage: Layer.Layer<StorageAdapter>;
declare const queries: Layer.Layer<QueryExecutor>;

const DuckDBCandidate = Runtime.define({ name: "duckdb-candidate", storage, queries });
const DatabaseLive = DuckDBCandidate.layer({
  scope: DatabaseScope.test("isolated-duckdb-fixture"),
  capabilities: Capabilities.none,
});
```
[Custom runtimes](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md). This source-derived API example retains MIT attribution through the source/license links above.

### StorageAdapter
The interface requires `withTransaction`, `nextCommitPosition`, `currentCommitPosition`, `claimCommand`, `dependencyState`, insert/batchInsert/retract, ID/entity/entities/pattern/history reads, initialize, and close. SQL-only `rawQuery` is an optional refinement, not the base contract. [Storage interface](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/StorageAdapter.ts).

The callback must atomically commit or roll back:
1. application assertions/retractions;
2. command-id claims;
3. one strictly ordered commit position;
4. transaction metadata and complete causal journal changes;
5. preconditions and opt-in graph constraints.

Rollback covers typed errors, defects, and interruption. A duplicate command must resolve the original transaction identity. A gap-prone sequence outside rollback is not an equivalent replacement for the current transactional counter. A `DatabaseScope` binds cursor identity; it does not partition tenants or authorize them. The builder initializes the adapter but leaves connection cleanup to layer finalizers rather than calling `close()` itself. Start with `Capabilities.none`; default snapshot/emission capabilities require their actual providers. [Correctness/lifecycle contract](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md).

### QueryExecutor
Requires complete execute, paged execute, explain, and paged explain. Inputs must use shared runtime/schema + semantic preflight and preserve result binding types/order. The shared SQL package has a useful minimal `SqlStatementRunner.run(sql, params)` and `makeSqlQueryExecutor[Layer](runner, dialect)`. However, its `SqlDialect.name` union is only sqlite/postgresql/mysql. There is no verified DuckDB dialect. [Query interface](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/QueryExecutor.ts), [SQL runner/executor](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts), [dialect type](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/dialects/types.ts).

The KV path is simpler semantically but a poor first DuckDB performance fit: emulating ordered byte-range lookups discards much of DuckDB's columnar SQL execution. That assessment is an inference, not a measured result.

## 3. Stored and query semantics that compatibility must retain — verified
Each assertion has an independent TripleId, entity/attribute, value tag + typed payload columns, recorded/valid boundaries, assertion/retraction transaction IDs, and recorded/retracted commit positions. Retraction retains the original assertion row. Seven storage tags are string, number, boolean, datetime, ref, JSON, blob. [Triple row](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Triple.ts), [value types](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Value.ts), [SQL schema](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/schema.ts).

Valid periods use inclusive start / exclusive end. Public times are nonnegative finite epoch milliseconds. Omitted valid time resolves once to the runtime clock; omitted recorded time means latest knowledge. Exact page visibility additionally uses commit position, because multiple commits can share a millisecond. With both recordedAt and recordedPosition, a later retraction must not hide an assertion from the earlier cut. Follow the actual adapter predicate, not a simplified timestamp-only filter. [Temporal basis](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Temporal.ts), [SQLite reference predicates](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sqlite/src/SqliteAdapter.ts#L501-L543).

Datalog is structural JSON/TypeScript data, not a Prolog text grammar:
- `find`, `where`; EAV patterns with optional fourth assertion-transaction slot.
- Shared `?variables` join; identities are strings.
- Numeric-only ordered comparisons; family-aware equality/inequality.
- Conjunctive negation, existence-style OR alternatives (no outward bindings), aggregates, optional projections, ordering, logical limit/offset, wrapped filtering, and keyset pagination.
- Public scalar projection merges number/datetime into numbers and string/ref into strings; booleans remain booleans; JSON becomes canonical text and blobs content identity. Typed constants preserve storage-tag intent. Do not cast numeric-looking identity strings into numbers.
- Count is distinct public source values; other numeric aggregates retain duplicate inputs.
- Public pages default to 100, max 1,000; `queryAll` is explicit complete reading. Cursors bind canonical query, scope, full deterministic mixed-family order, temporal basis, and exact commit cut.

[Query schema](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts), [Datalog guide](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/datalog.md), [pagination implementation](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Pagination.ts).

### Recursion is intentionally narrow
Same-name binary definitions union. Every rule needs a nonrecursive base. Cross-rule composition/mutual recursion is rejected. A recursive body must be exactly one EAV pattern followed by a same-name call sharing the intermediate identity. No arbitrary negated/aggregate rule bodies. The shared default maxDepth is 100; base derivation is depth zero. SQL carries a depth column with UNION ALL; KV is explicitly a naive deduplicated fixpoint, not seminaive. Final SQL projection is distinct, but intermediate path duplication can still be enormous. This is an implementation-derived risk, not a measured benchmark. [Semantic validator](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L138-L204), [SQL recursive compiler](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1592-L1735), [KV evaluator](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L189-L307).

Triplex's ordinary query contract selects one bitemporal snapshot. That is **not** the same language as interval-valued DatalogMTL with Always/Sometime/Since/Until. Exact derivation provenance is narrower still: supported structural patterns/predicates/negation; recursive rules, OR, aggregation, pagination, dynamic attributes, and transaction binding are rejected when a complete explanation cannot be retained. [Derivations](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/derivations.md).

### Sync is not automatic query replication
There is dependency discovery and conservative invalidation, plus a topic-filtered WebSocket change-hint hub. The wire types include connected, subscribed, changes, pong, and error. This is not CRDT merge semantics, result-delta propagation, automatic query reevaluation, or guaranteed durable delivery. Catch-up uses the ordered journal and durable consumer checkpoints; emissions are hints. Future valid-time boundaries must trigger host scheduling even without a new write. [Subscription wire types](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/subscriptions/types.ts), [SyncHub](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/subscriptions/SyncHub.ts), [operational contract](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/operational-primitives.md).

## 4. DuckDB release/API chronology — verified
- **2024-09-09 / 1.1.0:** C API extension registration and function/type additions announced. [Official announcement](https://duckdb.org/2024/09/09/announcing-duckdb-110).
- **2025-02-05 / 1.2.0:** explicit `duckdb_extension.h` C extension API introduced, with backward-compatible API intentions. [Official announcement](https://duckdb.org/2025/02/05/announcing-duckdb-120).
- **2026-10-21 / 2.0.0:** revamped **C API v2**, explicitly **not yet stable** in released docs, superseding optimistic language in the August preview. [Release](https://duckdb.org/2026/10/21/announcing-duckdb-200), [C API overview](https://duckdb.org/docs/2.0/clients/c/overview).
- Extensions choose v1 headers or v2 headers, never both. The exact [2.0 extension header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_extension_v2.h) rejects builds without unstable opt-in and states no v2 functions are stabilized; this ties the extension to the exact release.
- **2026-10-26:** new custom window-function support documented through the native C++ `WindowFunction` / `ExtensionLoader` path. That is distinct from a C scalar extension. [Gems of 2.0](https://duckdb.org/2026/10/26/gems-of-duckdb-200).

C API v2 exposes functions/types/casts/table functions, projection/filter-pushdown callbacks, filesystem access, and other primitives. It does **not** currently provide the complete custom storage/catalog, optimizer, physical-operator, or parser extension surfaces. DuckDB maintainer comments also caution against SQL execution inside function callbacks: the active connection is busy; opening another connection loses transaction/context identity. A PRAGMA query callback can instead expand into SQL. This is a candidate bridge, not verified prototype behavior. [Maintainer discussion, 2026-10-20](https://github.com/duckdb/duckdb/discussions/27525), [exact header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_extension_v2.h).

## 5. Feasible architecture — recommendations/inferences
1. **Separate the front end, relational plan, storage protocol, and native kernels.** Accept a documented structural Datalog subset; bind variables/types and reject unsupported constructs before SQL. Keep a pure-SQL baseline for every native kernel.
2. **Use host-owned transaction control.** One DuckDB connection per command, transactional counter + receipt uniqueness + assertion/retraction + journal. Retry an OCC conflict by rerunning the entire command after rollback, never only one statement. DuckDB 1.4 is single-writer-process with concurrent threads, not an automatically multi-process writer. [Pinned concurrency guide](https://duckdb.org/docs/1.4/connect/concurrency).
3. **Do not reuse Triplex DDL blindly.** Its many partial indexes fail on DuckDB 1.4.3: [parser source](https://github.com/duckdb/duckdb/blob/v1.4.3/src/parser/transform/statement/transform_create_index.cpp) explicitly rejects them. Preserve representation semantics but own the migration/index strategy. Bigint-to-JS-number conversion needs safe-integer tests for positions/timestamps.
4. **Push temporal and constant-attribute filters before joins.** Keep typed columns and numeric comparisons visible to the optimizer. Consider dictionary-encoded entity/attribute IDs internally only if boundary round-trips and deterministic public ordering remain exact.
5. **Start with positive linear recursion and seminaive delta evaluation.** Evaluate new rule instances using at least one delta input, anti-join against known tuples, and stop on empty delta. Keep derivation depth as a separate bound, not part of the logical tuple's dedup key. Stratify negation; do not implement recursive negation by arbitrary iteration.
6. **Add binding propagation / restricted magic sets for selective queries.** Bound-source reachability should not compute every source's closure. Prove output equivalence and retain fallback. Soufflé's implementation deliberately excludes dependencies with negation/functors/aggregates; do not claim a general transformation. [Official magic-set design](https://souffle-lang.github.io/magicset).
7. **Native kernel scope:** visibility tests, typed comparisons/hashes, interval intersection/coalescing, or aggregate state are plausible. A registered scalar used by generated SQL is a real extension, but not a native Datalog optimizer, custom scan, storage engine, or complete Triplex backend.

## 6. Optimization references and boundaries
**Recursive SQL:** DuckDB USING KEY exists since 1.3 and offers working-delta and accumulated recurring relations. On 1.4, explicitly control novel tuples/termination; overwriting a key does not by itself implement seminaive set difference. Current 2.0 changes UNION versus UNION ALL behavior and supports aggregate payloads, so never transplant current docs into a 1.4.3 claim. Neither version supports mutually recursive CTEs. [1.4 WITH](https://duckdb.org/docs/1.4/sql/query_syntax/with), [2.0 WITH](https://duckdb.org/docs/2.0/sql/query_syntax/with), [May 2025 design](https://duckdb.org/2025/05/23/using-key).

**Columnar temporal reads:** insertion ordering can improve zonemap pruning. DuckDB 1.4's eligible ART scans are single-column, non-expression equality/IN probes; composite/expression indexes do not reproduce PostgreSQL B-tree range plans. Benchmark sorted layouts before adding many indexes. [Pinned indexing guide](https://duckdb.org/docs/1.4/guides/performance/indexing). Do not transplant Triplex's SQLite/PostgreSQL expression-index speedups into DuckDB claims.

**Temporal joins:** expose two range inequalities for overlap/intersection to let DuckDB choose range-join algorithms. ASOF matches at most one right row and is appropriate for latest preceding event/property lookups, not arbitrary multivalued EAV or interval intersection. [IEJoin](https://duckdb.org/2022/05/27/iejoin), [ASOF](https://duckdb.org/2023/09/15/asof-joins-fuzzy-temporal-lookups).

**Full temporal Datalog:** MeTeoR's paper/code is a primary implementation reference for temporal deltas, interval coalescing, and seminaive reasoning. It explicitly explains why general metric temporal recursion may not reach a finite fixpoint. This argues for a finite interval fragment rather than claiming full DatalogMTL from snapshot filtering. [Paper](https://arxiv.org/html/2208.07100v2), [authors' code](https://github.com/wdimmy/MeTeoR/tree/main/experiments/RR2022).

**Bitemporal resolution:** XTDB's author explains append-only events, reverse-system-time resolution, valid-time coverage, and the importance of access-pattern-specific indices. Useful for future storage research, but XTDB's document-version overwrite semantics are not automatically Triplex's separately identified assertion semantics. [Taxonomy](https://xtdb.com/blog/building-a-bitemp-index-1-taxonomy), [resolution](https://xtdb.com/blog/building-a-bitemp-index-2-resolution). Current XTDB uses SQL/XTQL, not its v1 Datalog API. [Key concepts](https://docs.xtdb.com/concepts/key-concepts.html).

**Logical time versus history:** Dedalus models mutable distributed state and asynchronous communication with logical-time rules; it is not a ready-made bitemporal index or Triplex adapter. Use it only if the prototype later models distributed/event-time behavior. [Berkeley paper](https://db.cs.berkeley.edu/papers/datalog2011-dedalus.pdf).

## 7. Compatibility gates and explicit nonclaims
Before calling an implementation a Triplex backend, run the exact pinned `runtimeConformance` corpus on fresh isolated DuckDB storage, then add:
- same-millisecond commit/retraction and cursor continuation tests;
- typed scalar-family and JSON canonicalization differential tests;
- duplicate command, rollback, interruption, stale retract, and concurrent uniqueness tests;
- valid-start/end exact boundaries and future wake-up behavior;
- cyclic graphs, convergent diamonds, duplicate paths, repeated variables, depth-limit parity;
- database scope and cross-generation cursor rejection;
- restart, migration, crash/lost-acknowledgment, and connection-lifetime checks.

The shared suite does not certify crash durability or production readiness. This research does not claim any adapter exists, any code passed these gates, or any speedup was measured. Browser reference-model demonstrations do not execute a native Linux DuckDB plugin; label them separately.

## Ranked implementation reading order
1. [Triplex custom runtime contract](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md).
2. [StorageAdapter](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/StorageAdapter.ts) and [QueryExecutor](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/QueryExecutor.ts).
3. [SQLite reference adapter](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sqlite/src/SqliteAdapter.ts), [SQL schema](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/schema.ts), [shared SQL runner](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts).
4. [Datalog validation](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts), [SQL compiler](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts), [KV evaluator](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts).
5. [Shared conformance corpus](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts).
6. [Released DuckDB 2.0 API status](https://duckdb.org/docs/2.0/clients/c/overview), [v2 header](https://github.com/duckdb/duckdb/blob/v2.0.0/src/include/duckdb_extension_v2.h), [v2 maintainer limitations](https://github.com/duckdb/duckdb/discussions/27525).
7. [Pinned DuckDB 1.4 recursion](https://duckdb.org/docs/1.4/sql/query_syntax/with), [indexing](https://duckdb.org/docs/1.4/guides/performance/indexing).
8. [Soufflé magic sets](https://souffle-lang.github.io/magicset), [DatalogMTL seminaive paper/code](https://arxiv.org/html/2208.07100v2).
9. [XTDB bitemporal resolution](https://xtdb.com/blog/building-a-bitemp-index-2-resolution).

Research was bounded to public primary sources and an isolated report path. No Codex/cloud task, user-computer action, recovered-worktree overlay change, Git push, Site, or external mutation was performed.


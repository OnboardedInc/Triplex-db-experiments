# C8 read-entry inventory at d9b2dc8

North star: P1 correctness floor. This is a source audit, supplemented by the reviewer probes; it does not certify live concurrency.

| Surface | XTDB route | QLever route | Client capability at read implementation |
| --- | --- | --- | --- |
| Triples get/pull, batched entity pulls, pattern queries and entity pages | `TriplesLive.ts:567-624` → adapter `getById/getByEntity/getByEntities/query` → `XtdbStorageAdapter.ts:111-185,546-561` | Same core routes → `QleverStorageAdapter.ts:108-184,475-487` | **Original writable client**, captured by the storage constructor. These methods issue SELECTs only. |
| Fact history, timeline, transaction lookup/feed and commit-cut lookup | `TriplesLive.ts:630-679,708` → adapter history/query/currentCommitPosition | Same core routes → corresponding adapter methods | **Original writable client**; no submit/update call reachable from the inspected read methods. |
| Dependency state | `TriplesLive.ts:784` → `XtdbStorageAdapter.ts:563-620` | `QleverStorageAdapter.ts:489-508` | **Original writable client**; aggregate SELECTs only. |
| Datalog raw/all queries and wrapped pages | `makeXtdbQueryExecutor` at `XtdbQueryExecutor.ts:288-292` wraps before creating closures | `makeQleverQueryExecutor` at `QleverQueryExecutor.ts:454-458` wraps before creating closures | Read-only facade. Explain/preflight compile without writes. |
| Rule evaluation and integer/domain probes | Executor forwards its `source` to `evaluateRules` and `resolveIntegerVariables`, `XtdbQueryExecutor.ts:166-205` | Executor forwards facade to `evaluateQleverRules`, `QleverQueryExecutor.ts:229` | Facade; no writable fallback. All rule reads share the resolved basis. |
| Cursor pages with counts | `executePage` uses `run`; `compiled.countSql` executes through the same `source`, `XtdbQueryExecutor.ts:226-234` | `executePage` uses `run`; count execution uses the captured facade | Same facade as main query, including errors/cancellation. |
| Transaction-local Datalog reads | `readPathBase(client)` matches storage transaction identity; `clientWithOverlay` wraps the facade, `XtdbQueryExecutor.ts:157-167` | `index.ts:54-66` passes adapter's in-memory `sourceView` to the facade-backed executor | XTDB overlay's submit delegates to the facade and still refuses. Reviewer checked identity and injected SQL sources; no fresh live XTDB transaction test. |
| Native XTQL / SQL, including closures | `makeXtdbNativeQueries`, `native/NativeQueries.ts:232-233`; `select`, `selectSql`, `selectWithReachability`, `selectSqlWithReachability` share `run` | `makeQleverNativeQueries`, `native/NativeQueries.ts:236-240`; `select`, `selectWithRelations` share `run` | Facade. Reachability helper inherits it; source, seed, edge, answer and cleanup/error paths have no writable fallback. No scratch cleanup remains. |
| Temporal `queryIntervals` | `TemporalQueries.ts:231-232` wraps before closure construction | `TemporalQueries.ts:200-204` wraps; nested executor wraps again | Facade. |
| Maintained `query` | `MaintainedQueries.ts:341-345` selects a separately constructed facade-backed closure; cache header/members or direct evaluation | No analogous lane-specific maintained-query factory | Facade. `publish` is a separately constructed explicit write path, not called from query. |
| Resolve uncertain write outcome (read operation) | `Operations.ts:18-45` | `Operations.ts:18-42` | **Original caller client**; fixed SELECT only. |
| Low-level exported clients | `XtdbClient.query/submit` | `QleverClient.query/update/command` | Intentionally writable infrastructure; not a read-only application boundary. |

The literal claim that *every* read entry receives a read-only view is false for storage reads and operation resolution. This is a structural coverage gap, not an observed read mutation. The reviewer exercised all seven storage read methods on each lane with a write-trapping client: 15 SELECT calls, zero write attempts. Existing retries and serialization persistence belong to `withTransaction`/write paths; ordinary storage reads do not enter them. Startup `adapter.initialize()` is a separate runtime acquisition step (`TriplesLive.ts:152`); XTDB creates tables there. This acquisition is excluded from the experiment's read windows.

The facades refuse `submit`/`update`, but they are not general SQL/SPARQL capability sandboxes: XTDB query text and QLever command calls delegate. No current application read path in this inventory supplies mutating text/commands. The fake-upstream counter findings must not be described as a demonstrated live application read mutation.

## Removed mutators and remaining schema

Source search under `packages`, `qualification`, and `lab/bin`, restricted to `.ts/.js/.mjs`, found no remaining caller or export for `materializeNativeReachability`, `materializeRules`, `compileRuleRound`, `materializeQleverNativeRelations`, or `materializeQleverRules`. `xtdb-xtql-reach.ts` is deleted, with only a historical explanatory comment in `xtdb-workloads.ts:273`. Working-outcome error exports are removed; comments naming them remain.

`tx_query_relations` remains in the initializer (`XtdbStorageAdapter.ts:637`), historical recovery/qualification experiment schema lists, and explanatory comments/tests. No production rule evaluator reads or writes it. No active `tx_native_relations`/`tx_native_relation_attempts` or `urn:triplex:derived` write remains. Maintained cache tables still belong to explicit `publish()`.

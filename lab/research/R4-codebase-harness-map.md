# R4: Codebase and test-harness map for the xtdb-native and qlever-native lanes

Date: 2026-11-07. Checkout: `/Users/sam/projects/triplex-db-2` (HEAD `0ddbb5c`).
Author: research agent R4. No engine was started, no Docker call was made, and nothing outside `lab/research/` was written by hand.

**Side effect to know about.** Running `pnpm typecheck` made turbo build `dist/` for 9 workspace packages (cloudflare, core, foundationdb, host, http, postgres, sql, sqlite, testkit) and `.turbo/` caches, because `turbo.json` makes `typecheck` depend on `^build`. All of that is gitignored (`.gitignore` lines `dist/`, `.turbo/`). `packages/xtdb`, `packages/qlever`, `packages/qualification` still have no `dist/`. The only tracked-file change in the tree is the `storeDir` line in `pnpm-workspace.yaml`, which predates this task.

Raw evidence is in `lab/research/R4-test-outputs/` (index at the end of this file).

---

## Contents

1. Schema model
2. Storage adapter contract
3. XtdbStorageAdapter
4. QleverStorageAdapter
5. Tests and how they reach engines; unchanged44 and the native 142 packet
6. Pure test results
7. Homebase coupling and controller reuse
8. How to run each gate in this checkout
9. Replace before running

---

## 1. Schema model

### 1.1 Answer in four lines

- **Runtime shape.** An `EntityType` is a plain object holding `entityType` (PascalCase name), `schema` (a `TypeExpr.Struct` keyed by attribute), `attributes` (per-property handles) and `constraints`. It compiles to a content-addressed `ConfigNode` of kind `"entity-schema"`.
- **Adapters cannot see it.** `StorageAdapterService` has no schema or config parameter. The only schema trace an adapter receives is the optional string `entityType` on each `TripleInput`, plus a constant `schema_version: 1` that both adapters hard-code.
- **The schema lives in the same backend, as facts.** `ConfigStore` writes every config object, type, revision, snapshot and ref as ordinary assertions through `Triples`, in the reserved namespace `_triplex/config/`, with entity types `triplex.config-*`. A native query can therefore read the active release from the same `facts()` relation it uses for data.
- **Neither native layer reads it today.** Native providers take attribute keys (XTDB) or `{key, type}` pairs (QLever) from `Attribute`/`EntityType` handles in the caller's process. Nothing in `packages/xtdb/src/native` or `packages/qlever/src/native` consults `ConfigStore`.

### 1.2 The model, with citations

| Concept | Where | Runtime representation |
| --- | --- | --- |
| Attribute definition | `packages/core/src/config/Attribute.ts:26-37` | `{_tag:"Attribute", key, type: TypeExpr, node: Effect<ConfigNode>, encode}`. Key must match `^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$` (`Attribute.ts:13`, check at `:62-69`). |
| Attribute constructors | `Attribute.ts:93-131` | `text, number, integer, int64, boolean, date, instant, enumOf, ref(key, {entityType})`. `ref` records a `references-entity-type` ref to kind `entity-schema` (`:121-131`). No JSON or blob constructor exists. |
| Attribute use | `Attribute.ts:39-52, 134-140` | `{required=false, cardinality="one", unique=false}`. Requiredness and cardinality belong to the entity's use, not the global attribute. |
| Assertion descriptor | `Attribute.ts:142-155` | `{attribute, value: TripleValue, validFrom?}`. It carries no `entityType`. The caller adds `entityType` when building the `TransactOp`. |
| EntityType | `packages/core/src/config/EntityType.ts:41-61` (type), `:69-154` (`make`) | See 1.3. |
| TypeExpr | `packages/core/src/config/TypeExpr.ts:50-121` | Closed algebra: `Any, Prim(text\|number\|integer\|int64\|boolean\|date\|instant), Enum, Ref(kind), List, Struct(fields{type,optional,fallback}), Union, Constrained(base, constraints)`. Each constructor carries `v: 1`. |
| TypeSchema | `packages/core/src/config/TypeSchema.ts:80-153` (`go`), `:162-163` (`compile`) | Compiles `TypeExpr` to an Effect `Schema.Codec<unknown, unknown>`. `int64` decodes the tagged `IntegerValue` (`:41-42`), not a JS number. |
| ConfigNode | `packages/core/src/config/ConfigNode.ts:65` (interface), `:305` (`walk`) | `{kind, key, attrs, children[{rel,node}], refs[{rel,kind,key}], cid, type?}`. Children are hashed into the parent's `cid`; refs are not. |
| ConfigStore | `packages/core/src/config/ConfigStore.ts:103-136` (service), `:195` (`load`), `:334` (`commit`), `:446` (`setRef`), `:495` (`layer`) | `load()` returns an `InMemoryConfigStore`; `resolveRef(name)` returns a `ConfigSnapshot` whose `root` is the full `ConfigNode` tree (`InMemoryConfigStore.ts:89-98`). |
| Reserved storage names | `ConfigStore.ts:40-61` | Entity types `triplex.config-object/-type/-logical-object/-revision/-snapshot/-ref`. Attributes `:triplex/config-data` (JSON body), `:triplex/content-id`, `:triplex/config-kind`, `:triplex/config-key`, `:triplex/valid-under`, `:triplex/depends-on`, `:triplex/ref-target`. Entity ids prefixed `_triplex/config/`. |
| Existing consumer of the active schema | `packages/core/src/config/EntityValidation.ts:35` (`ENTITY_SCHEMA_KIND = "entity-schema"`), `:474-477` | `config.resolveRef(ref)`, then `ConfigNode.walk(snapshot.root)` filtered by `node.kind === "entity-schema"`. This is the pattern a schema-aware layer should copy. |
| Worked example | `packages/core/test/config/OntologyDsl.test.ts:11-53`, `docs/configuration.md:37-90` | `Employer`, `EmployerSummary`, `Employment` with a shared global attribute and a ref. |
| Load-test schema | `packages/qualification/load/schema.ts:1-50` | `LoadEntity` with 10 attributes, including raw `TypeExpr.any` carriers for JSON and blob because `Attribute` has no such constructors. |

### 1.3 What `EntityType.make` produces

```
EntityType.make("Employer", { attributes: { name: use(EmployerName,{required,unique}) } })

 runtime object (EntityType.ts:144-153)
 +--------------------------------------------------------------------------+
 | entityType : "Employer"                                                  |
 | schema     : Struct{ ":employer/name": required(text) }   (TypeExpr)     |
 | attributes : { name: { key, type, required, cardinality, unique,         |
 |                        definition, assertion(value, {validFrom}) } }     |
 | constraints: [Required, Cardinality(1), Unique, ReferenceTarget ...]     |
 | node       : Effect -> ConfigNode kind "entity-schema" key "Employer"    |
 |                attrs    { entityType, type: schema, attributes: usage }   |
 |                children constraint nodes (rel "constraint")              |
 |                refs     uses-attribute -> kind "attribute" key ":employer/name" |
 | nodes      : Effect -> [attribute nodes..., entity-schema node]          |
 +--------------------------------------------------------------------------+
   committed via ConfigStore.commit({label, objects: Employer.nodes, ref:"live"})
```

Attribute definition nodes have kind `"attribute"`, key = the attribute key, attrs `{key, valueType}` (`Attribute.ts:57-60, 83-89`).

### 1.4 Can an adapter or native layer reach the active schema?

| Route | Works today? | Detail |
| --- | --- | --- |
| Via the `StorageAdapter` interface | No | No config handle in `StorageAdapterService` (`packages/core/src/storage/StorageAdapter.ts:21-89`). The adapter would need a factory option (for example `makeXtdbStorageAdapter(client, scope, {schema})`). `ConfigStore` sits above the adapter and writes through it, so an adapter-internal `ConfigStore.load()` per transaction would be circular and expensive. Passing the in-process `EntityType` objects into the adapter factory avoids both. |
| Via `entityType` on assertions | Yes, as a label only | `TripleInput.entityType` is optional (`packages/core/src/Triple.ts:8-16`). It lands in the indexed `entity_type` column (XTDB `codecs.ts:27`, QLever `rdf.ts:22`). Nothing validates it against a schema at write time. Validation is a separate pass (`EntityValidation.revalidate`). |
| Via a native query reading the config facts | Yes | Select the `facts()` relation with `entity_type = 'triplex.config-snapshot'` (and `-object`, `-type`) and decode `value_json` of `:triplex/config-data`. The ConfigNode tree has to be rebuilt in TypeScript (`ConfigStore.ts:195-300`), so this is practical only for a TypeScript-side loader. |
| Via `ConfigStore` in TypeScript | Yes | `yield* ConfigStore.ConfigStore`, `resolveRef("live")`, `walk(root)`. Needs `Triples` in the layer (`ConfigStore.layer` requires `Triples`). |
| Native helper input | Partial | QLever helpers take `QleverNativeAttribute {key, type: TypeExpr}` (`packages/qlever/src/native/NativeContext.ts:16-19`) and map `type` to a physical payload channel (`physicalType`, `:40-71`). XTDB helpers take only a key string (`packages/xtdb/src/native/Sources.ts:9`). |
| Native query contract types | Caller-supplied | `NativeQueryContract {name, parameters: TypeExpr, row: TypeExpr}` (`packages/core/src/native/NativeQuery.ts:14-19`). `hydrateNativeValue` (`:98-156`) uses the declared `row` type to turn strings and bigints into exact `int64`. |

Design implication for thesis T1 (table-per-type projection): the writer needs the `EntityType` set at transaction time. The cheapest source is the in-process `EntityType` objects passed to the adapter factory, with the committed release checked against them by `cid` at startup.

---

## 2. Storage adapter contract (packages/core)

### 2.1 The interface each backend implements

`StorageAdapterService`, `packages/core/src/storage/StorageAdapter.ts:21-89`:

| Member | Line | Contract |
| --- | --- | --- |
| `supportedValueTypes?` | `:23` | Omitted means the original seven families. Both adapters declare `string, number, integer, boolean, datetime, ref, json, blob`. |
| `validateConstraints?` | `:25-29` | Optional server-side `Constraint.newlyViolated`. XTDB implements it for `inline`/`projection` strategies; QLever does not. |
| `withTransaction(effect, {replaySafe?})` | `:30-33` | Run a callback with staged writes; commit at the end. Nested calls are savepoints. |
| `nextCommitPosition()` | `:35` | Allocate the next ordered position inside the current transaction. |
| `currentCommitPosition()` | `:37` | Latest committed position (or the pending one inside a transaction). |
| `dependencyState(attributes, basis)` | `:39-42` | `{sourcePosition, nextTemporalBoundary?}` for projection freshness. |
| `claimCommand(commandId, txId, ts)` | `:48-52` | Reserve a command id inside the transaction. Returns the original tx id if already reserved, else `null`. |
| `insert`, `batchInsert` | `:53-66` | Stage one or many assertion rows with caller-supplied id, tx id, timestamp and position. |
| `retract(id, ts, txId, position)` | `:67-72` | Stage a retraction. Returns `false` if the id is absent or already retracted. |
| `getById`, `getByEntity`, `getByEntities`, `query(pattern, basis)`, `history(entityId)` | `:73-86` | Reads. `QueryPattern` is `{entityId?, attribute?, entityType?, value?}` (`storage/types.ts:17-22`). |
| `initialize`, `close` | `:87-88` | `initialize` is called by `TriplesLive` on every runtime start (`store/TriplesLive.ts:152`). |

Row shape: `TripleRow` (`packages/core/src/Triple.ts:76-98`), 20 columns, snake_case, numbers as JS numbers, `value_boolean` as 0/1.

### 2.2 How one Triplex `transact` calls the adapter

`TriplesLive.transact`, `packages/core/src/store/TriplesLive.ts:253-523`. The order matters because it fixes what each adapter must support.

```
triples.transact(ops, meta)                              TriplesLive.ts:253
  |  structuredClone(ops, meta)                          :254-273
  v
adapter.withTransaction(effect, {replaySafe:true})       :275, :521
  |  reject unsupported value families / reserved names  :277-292
  |  validatePreconditions (TripleLive must have a matching retract)  :293-300
  |  validate commandId length 1..1024                   :301-307
  |  txId = nextTxId, timestamp = now                    :308-309
  |  adapter.claimCommand(commandId, txId, ts)           :310-325  -> CommandAlreadyCommittedError if non-null
  |  position = adapter.nextCommitPosition()             :326
  |  EntityState preconditions: adapter.getByEntity(id)  :330-346  -> TransactionConflictError on mismatch
  |  meta.enforce: adapter.validateConstraints? else portable Constraint.newlyViolated  :348-410
  |  for each op, in order:
  |     assert*  -> batched into adapter.batchInsert / insert        :209-251 (flushAssertBatch)
  |     retract  -> adapter.getById, adapter.retract; TripleLive precondition -> TransactionConflictError  :432-466
  |     retract-pattern -> adapter.query(pattern), adapter.retract per row  :471-495
  |  journal: for each metadataInputs(): adapter.insert (entityType "_Transaction")  :514-517
  v
adapter commits everything staged in one backend step (XTDB: one XTDB tx; QLever: one SPARQL UPDATE)
```

**Journal rows are ordinary assertions.** `metadataInputs` (`packages/core/src/store/transactionMetadata.ts:29-57`) emits, per Triplex transaction, as `_Transaction` entity `txId`:

| Journal assertion | Attribute (`utils/id.ts:25-39`) | Count |
| --- | --- | --- |
| position | `:_tx/position` (number) | 1 |
| instant | `:_tx/instant` (datetime) | 1 |
| actor, command id, correlation id, causation id, config snapshot | `:_tx/actor` ... `:_tx/config-snapshot` (string) | 1 each, only when set in `meta` |
| changed entity | `:_tx/changed-entity` (ref) | 1 per distinct entity |
| change | `:_tx/change` (json, full change record including the value) | 1 per assert or retract |

Read paths for the journal use `adapter.query({entityType:"_Transaction"})` (`TriplesLive.ts:634-670`), so a native layer reading journals sees the same rows.

### 2.3 CAS and preconditions

- **Position CAS lives in the adapter.** The core never compares positions. Each adapter makes commit conditional on the committed position still equaling the position read at transaction start (`sourceK`). A mismatch raises `XtdbSerializationConflict`/`QleverSerializationConflict`, and `withTransaction` replays the callback up to `maxRetries` (default 12) only when `replaySafe` is true. `TriplesLive` always passes `replaySafe:true` (`:521`), so data-only commands retry automatically.
- **Triplex-level preconditions are read-time checks inside the same transaction.** `TripleLive` fails when `adapter.retract` returns `false` (`TriplesLive.ts:432-466`). `EntityState` compares sorted triple ids from `getByEntity` with the expected set (`:330-346`). Because the position CAS covers the whole scope, a concurrent commit that changes any fact in the scope aborts the stale attempt even when the precondition itself would still hold.
- **Consequence for the 256-client write story.** The CAS is one hot row per scope (XTDB `tx_meta` row, QLever `<urn:triplex:meta>` position triple). Concurrent writers to one scope conflict and retry. An in-process `admissionQueue` semaphore (`XtdbStorageAdapter.ts:85, 422-426`; `QleverStorageAdapter.ts:86, 360-364`) serializes within one process.

### 2.4 How Datalog reaches a backend

`QueryExecutor` service, `packages/core/src/storage/QueryExecutor.ts:115-166`: `execute`, `executePage`, `explain`, `explainPage`. `TriplesLive.queryAll/queryPage` (`TriplesLive.ts:688-740`) resolve the temporal basis (adding `recordedPosition` via `adapter.currentCommitPosition()`), validate the query, then call `executor.execute(query, debug, basis)`.

| Backend | Executor | Strategy |
| --- | --- | --- |
| XTDB | `packages/xtdb/src/XtdbQueryExecutor.ts` (276 lines), `src/query/compiler.ts`, `recursion.ts` | Datalog AST to scoped XTDB SQL. Recursive rules run as server-side rounds into `tx_query_relations` because XTDB 2.2.0 rejects recursive CTEs (`native/Reachability.ts:30-34`). |
| QLever | `packages/qlever/src/QleverQueryExecutor.ts` (446 lines), `compiler.ts` (1013 lines), `recursion.ts` | Datalog AST to SPARQL over the reified graph. Includes optional "plan" profiles (aggregate, negation, source, retirement, scalar order) selected by constructor options (`QleverQueryOptions`). |
| KV (oracle) | `packages/core/src/kv/` | Hexastore scans plus nested-loop joins. `KvTriples.layer` is the in-memory reference runtime. |

Each backend's runtime is `Runtime.define({name, storage, queries})` (`packages/xtdb/src/index.ts:68`, `packages/qlever/src/index.ts:65`). `.layer({scope, capabilities})` binds a `DatabaseScope`. Scope is a JSON tuple `["triplex-scope-v1", env, tenant, database, generation]` (`packages/core/src/runtime/DatabaseScope.ts:22-29`), and `DatabaseScope.test(name)` builds a throwaway one.

---

## 3. XtdbStorageAdapter (packages/xtdb/src)

### 3.1 Physical tables

All tables are created by `initialize` with `CREATE TABLE` DDL inside one XTDB transaction (`XtdbStorageAdapter.ts:622-652`) and by the scratch-table code paths listed below. Every row carries `scope_key`; `_id` embeds the scope so scopes never collide.

| Table | Created at | `_id` | Columns | Role |
| --- | --- | --- | --- | --- |
| `tx_assertions` | `XtdbStorageAdapter.ts:627` | `JSON([scopeKey, row.id])` (`:223`) | `scope_key` + the 20 `assertionColumns` (`codecs.ts:9-30`) + `value_identity` | Canonical ledger. One row per assertion. A retraction re-inserts the same `_id` with `retracted_at/_position/_tx_id` set. `value_identity` = canonical JSON of the typed value (used by constraints). |
| `tx_meta` | `:629` | `scopeKey` | `scope_key, position` | One row per scope holding the committed position. Upserted by every commit. This is the CAS cell. |
| `tx_claims` | `:630-632` | `JSON([scopeKey, commandId])` | `scope_key, command_id, tx_id, recorded_at, position` | Command idempotency claims. |
| `tx_attempts` | `:633-635` | `JSON([scopeKey, operationId])` | `scope_key, operation_id, attempt_id, position` | One marker per commit attempt; the receipt used to resolve unknown outcomes. |
| `tx_query_relations` | `:636-638` | per round | `scope_key, run_id, rule_name, arg1, arg2, depth` | Datalog recursion scratch (`query/recursion.ts:111`). |
| `tx_constraint_graphs`, `tx_constraint_generations` | `:639-642` | per run | graph copy of assertion columns; `run_id, source_k` | Scratch for `inline`/`projection` constraint strategies (`ConstraintValidation.ts:225-245`). |
| `tx_native_relations`, `tx_native_relation_attempts` | `native/Reachability.ts:161-164` | per run | `run_id, relation_name, source, target, depth`; `run_id, attempt_id, phase` | Scratch for `selectSqlWithReachability`; cleaned after each native read. |
| `tx_query_members`, `tx_query_generations` | `MaintainedQueries.ts` | per generation | maintained-result generations | Persisted query results (`makeXtdbMaintainedQueries`). |

`assertionColumns` (20): `id, entity_id, attribute, value_type, value_string, value_number, value_boolean, value_datetime, value_json, recorded_at, recorded_position, valid_from, valid_to, created_by, retracted_at, retracted_position, retract_tx_id, entity_type, schema_version, tx_id`.

### 3.2 One Triplex transact is one XTDB transaction

Measured with a mock `XtdbClient` (`R4-test-outputs/xtdb-statement-trace.mts`, output `xtdb-statement-trace.out.txt`). `XtdbClient.submit` runs `BEGIN READ WRITE`, every statement, `COMMIT SYNC`, then `SHOW AWAIT_TOKEN` (`XtdbClient.ts:226-262`).

```
persist(state)  XtdbStorageAdapter.ts:188-331          one submit() = one XTDB tx

  ASSERT (SELECT COALESCE(MAX(position),0) FROM tx_meta WHERE scope_key=?) = sourceK
         'triplex-cas-conflict'                                              :195
  ASSERT NOT EXISTS (tx_attempts WHERE operation_id=?) 'triplex-operation-duplicate'  :199
  ASSERT NOT EXISTS (tx_claims WHERE command_id=?)  'triplex-command-conflict'   per claim  :203-208
  ASSERT NOT EXISTS (tx_assertions WHERE id IN (new ids)) 'triplex-assertion-identity-conflict'  :209-213
  INSERT INTO tx_assertions ... (200 rows per statement)                      :214-230
  INSERT INTO tx_claims ...                                (only with commandId)  :231-245
  INSERT INTO tx_meta (_id=scopeKey, position=newPosition)                    :246-252
  INSERT INTO tx_attempts (_id=[scope,operationId], attempt_id, position)     :253-267
```

Every INSERT sets `_valid_from = 1970-01-01T00:00:00Z` (`:38`) so a re-insert replaces the whole native valid lifetime. Triplex business time stays in the `valid_from/valid_to` columns; XTDB native valid time is not used. Triplex `recorded_at` is the Triplex clock, not XTDB system time.

Rows inserted into `tx_assertions` per Triplex transaction (observed): 1 assert with no meta gives 5 rows; 1 assert with `commandId` + `actor` gives 7 rows plus 1 `tx_claims` row; 5 asserts on one entity gives 13 rows. Formula: `A (data) + A (change journal) + E (changed-entity journal) + 2 (position, instant) + one per set meta field`, plus 2 fixed rows (`tx_meta`, `tx_attempts`).

### 3.3 Position allocation

- At the outermost `withTransaction`, the adapter reads `SELECT position FROM tx_meta ... WHERE scope_key = ?` once (`committedPosition`, `:92-104`; used at `:386-390`) and keeps it as `sourceK`.
- `nextCommitPosition()` increments an in-memory counter starting at `sourceK` (`:486-496`). It does not touch the database.
- Commit is conditional on `MAX(position) = sourceK` (`:195`). Positions are therefore dense and monotonic per scope, allocated optimistically.
- A transaction with no staged rows, no claims and an unchanged position skips persistence (`:403-404`).

### 3.4 Command-claim uniqueness

- `claimCommand` (`:501-521`) first checks the in-transaction map, then `SELECT tx_id FROM tx_claims WHERE command_id = ? AND position <= sourceK`. A hit returns the original tx id (core turns that into `CommandAlreadyCommittedError`). A miss stages the claim.
- At commit, `ASSERT NOT EXISTS` on the claim and the fixed `_id = [scope, commandId]` row key give two independent barriers (`:203-208`, `:231-245`).
- The error mapping at `:292-298` treats `triplex-cas-conflict` and `triplex-command-conflict` as `XtdbSerializationConflict` (retried when `replaySafe`); the retry then finds the winning claim and reports `CommandAlreadyCommittedError`. `triplex-operation-duplicate` and `triplex-assertion-identity-conflict` become a plain `WriteError`.

### 3.5 CAS preconditions and write isolation

- The Triplex preconditions (section 2.3) execute inside the staged transaction using `queryRows`, which merges committed rows at `sourceK` with the staged overlay (`:111-186`). The position `ASSERT` is the actual serialization point.
- Nested `withTransaction` calls are savepoints with copy-on-enter state; a failed child never mutates the parent; a successful child that finds the parent changed meanwhile raises `XtdbSerializationConflict` (`:343-385`).
- Retry: `retry < maxRetries (12)` and `replaySafe`, sleeping `min(50, retry*2)` ms (`:405-420`).
- `retract` performs a `queryRows` read per id (`:529-545`) and core adds a `getById` before it (`TriplesLive.ts:433`), so each retract costs two reads before the commit.

### 3.6 Codecs

| Concern | Behavior | Where |
| --- | --- | --- |
| int64 | Stored as `value_type = "integer"`, `value_string` = canonical decimal text, never as a number. `packValue` rejects non-canonical text. Decode re-validates (`integer(payload).value !== payload` throws). Native parameters send bigints as `int8` text. | `codecs.ts:83-87, 148-152`; `XtdbClient.ts:148-164`; `native/Sources.ts:19-27` |
| `-0` | JS `-0` is sent as typed `float8` text `"-0.0"` (OID 701). Without this, PostgreSQL text would print `"0"` and XTDB would store integer 0. | `XtdbClient.ts:141-164` |
| Mixed numeric columns | Safe JS integers go as `int8` (OID 20), other numbers as `float8` (OID 701). XTDB is dynamically typed, so `value_number`, `recorded_at`, `valid_from` etc. can hold a union of i64 and f64. Decode uses `Number(...)` and rejects non-finite (`nullableNumber`). | `XtdbClient.ts:148-161`; `codecs.ts:116-122` |
| Instants and times | `datetime` values and all time columns are epoch-millisecond JS numbers (`value_datetime`, `recorded_at`, `valid_from`, `valid_to`). No XTDB `TIMESTAMP` is stored. | `codecs.ts:88-94` |
| boolean | `value_boolean` 1 or 0. | `codecs.ts:95-97` |
| json | `value_json` = `JSON.stringify(value)` (retains key order); the canonical sorted form goes only to `value_identity` and constraint identity. | `codecs.ts:98-101` |
| blob | `value_string` = content id, `value_json` = canonical descriptor `{mimeType,size,filename?}`. | `codecs.ts:102-111` |
| Unicode | Ill-formed UTF-16 (isolated surrogates) is rejected before any parameter is sent. | `XtdbClient.ts:135-140` |

### 3.7 Unknown-outcome handling

`persist` (`:269-331`) separates three cases:

1. **Definitive rejection.** `client.submit` throws `XtdbTransactionRejected` for any failure before `COMMIT`, or for SQLSTATE `P0004` (the observed ASSERT failure) at commit (`XtdbClient.ts:272-277`). The adapter maps it to a conflict or `WriteError`.
2. **Acknowledged.** Submit returns; the adapter then polls `tx_attempts` for the operation marker.
3. **Indeterminate.** Any other error, including a COMMIT timeout, falls through to polling. The adapter queries `SELECT operation_id FROM tx_attempts WHERE operation_id = ?` every 25 ms until `resolutionTimeoutMs` (default 30 s). A found marker means committed. No marker by the deadline throws `TransactionOutcomeUnknown {operationId, attemptId, commandId?}` (`:302-324`).

`resolveXtdbOperation` (`Operations.ts`) lets a caller resolve an unknown operation later by id. The persist step runs under `Effect.uninterruptible` (`:406`).

### 3.8 Native query sources (src/native)

| File | Purpose |
| --- | --- |
| `native/NativeQueries.ts:35-192` | `makeXtdbNativeQueries(client, scope)` returns `select` (XTQL), `selectSql` (XTDB SQL), `selectSqlWithReachability`. Each call: validates contract and limits (`maxRows` 1..100000, `timeoutMs`), reads the source cut from `tx_meta` (`:68-86`), resolves a `NativeReadBasis`, builds the native text through the caller's builder, wraps it as `SELECT * FROM (...) LIMIT maxRows+1`, executes with `parameterSyntax: "postgresql"`, rejects over-limit results with no partial rows, then decodes rows with the contract's `row` type. |
| `native/Sources.ts:44-118` | `makeNativeContext(language, basis)` gives the builder `bind`, `attribute`, `identifier`, and three closed relations: `facts()` (live at the cut and valid at `validAt`), `recordedFacts()` (live at the cut over all business time), `history()` (everything known at the cut). Retraction metadata after the cut is masked with `CASE WHEN knownRetraction THEN col ELSE NULL END` (`:76-80`, `:97`). XTQL is passed as `XTQL ('(fn [triplex_param_1 ...] ...)', $1, ...)` (`:120-126`). |
| `native/ReadOnlySql.ts` | Lexical single-query envelope: rejects `;` second statements, modifying CTEs, and CR/LF comment-boundary escapes. Not a sandbox. |
| `native/Reachability.ts` | Server-resident BFS rounds into `tx_native_relations`; owns cleanup; throws `NativeWorkingOutcomeUnknown` if a working write is unresolved. |

**XTQL coverage in the existing packet is thin.** `packages/qualification/src/native/xtdb-workloads.ts` has exactly one XTQL call site (`stateAt`, `:227`) and 19 `sql(...)` call sites plus 5 `recursive(...)` SQL-with-reachability sites. The `state_at` operation appears in 14 of the 71 cases (11 once family 05 is excluded, because 05 uses a different path at `:239`). The remaining roughly 60 logical tasks have only SQL implementations.

---

## 4. QleverStorageAdapter (packages/qlever/src)

### 4.1 Physical graph layout

One **named graph per scope**: `<urn:triplex:scope:BASE64URL(scopeKey)>` (`rdf.ts:46`). Subjects and predicates (`rdf.ts:46-51`):

| Subject IRI | Predicates | Meaning |
| --- | --- | --- |
| `<urn:triplex:assertion:B64(id)>` | `<urn:triplex:field:COLUMN>` for every non-null column, plus shadows (below) | One reified assertion. |
| `<urn:triplex:claim:B64(commandId)>` | `field:command_id, tx_id, recorded_at, position` (4) | Command claim. |
| `<urn:triplex:operation:B64(operationId)>` | `field:operation_id, attempt_id, position` (3) | Commit receipt marker. |
| `<urn:triplex:meta>` | `field:position, field:position_native` (2) | Scope position CAS cell. Rewritten in place every commit (DELETE old, INSERT new). |

Objects are RDF string literals (lexical channel), except `*_native` shadows, which are native numbers or `xsd:double` literals. Scratch graphs: `<urn:triplex:native:B64(scope):runId>` plus `<urn:triplex:native-receipts:...>` for native reachability (`native/BasisRelations.ts:114-118`) and `urn:triplex:derived:` nodes for Datalog recursion (`recursion.ts:105`).

### 4.2 Triples per assertion

Counts come from the real `rowFields` (`rdf.ts:202-259`) and were confirmed end to end by capturing the SPARQL UPDATE of real `Triples.transact` calls through a stubbed `fetch` (`R4-test-outputs/qlever-triple-count.mts`, output `qlever-triple-count.out.txt`).

Per assertion row:

| Row type | Triples | Composition |
| --- | --- | --- |
| string / ref / json / blob, no `valid_to`, no `created_by` | **27** | 4 summary (`_row` JSON blob, `scalar_family`, `scalar_lexical`, `scalar_order`) + 5 value/identity (`id, entity_id, attribute, value_type, value_string`) + 4 each for `recorded_at, recorded_position, valid_from, schema_version` (value, `_order`, `_exact`, `_native`) + `entity_type` + `tx_id`. |
| number / datetime / boolean | **30** (29 when a `number` is not exactly representable, because `value_number_native` is omitted) | 27 base, with the numeric value column carrying its 4-triple group (value, `_order`, `_exact`, `_native`) instead of 1 triple. |
| int64 ("integer") | **32** | 27 base, plus `value_integer_order, _exact, _sum_hi, _sum_lo, _native`. |
| `created_by` set | +1 | |
| `valid_to` set | +4 | |
| retracted row | +9 | `retracted_at` (4), `retracted_position` (4), `retract_tx_id` (1). The retraction rewrites the same subject through DELETE/INSERT. |

Per Triplex transaction (all inside one UPDATE):

| Item | Triples |
| --- | --- |
| Data assertions | per table above |
| Journal assertions (`_Transaction`) | position 30, instant 30, +27 per meta string set (actor, command id, correlation, causation, config snapshot), +27 per distinct changed entity, +27 per change |
| Operation marker | 3 (kept forever) |
| Command claim | 4 (only with `commandId`) |
| `<urn:triplex:meta>` | 2 (replaced, so net growth 0 after the first commit) |

**Measured** triples in one SPARQL UPDATE (data + journal + claim + operation + meta):

| Transaction | Total | Breakdown |
| --- | --- | --- |
| 1 string assert, no meta | **146** | 141 assertion + 3 operation + 2 meta |
| 1 string assert + `commandId` + `actor` | **205** | 196 assertion + 4 claim + 3 operation + 2 meta |
| 5 string asserts on 1 entity, no meta | **362** | 357 assertion + 3 + 2 |
| 1 number assert, no meta | **149** | 144 assertion + 3 + 2 |

Closed form for string-typed assertions, no meta: `54*A + 27*E + 63` new triples, where `A` is the assertion count and `E` the distinct entities (the `+63` is 60 for position/instant plus 3 for the operation marker). **The journal doubles the data cost.** At the dense load profile (500 assertions and 50 entities per command, from `packages/qualification/load/README.md`) this is 28,413 triples, about 56.8 per fact, so 100 million active facts is roughly **5.7 billion triples**. At the sparse profile (1 fact per entity, 500 entities per command) it is about 81 per fact. Both are computed from the formula, not measured at scale. `lab/PLAN.md` section 2.1 estimates 1.5 to 2 billion; that figure matches the data rows alone and omits the journal.

### 4.3 Writes: one conditional UPDATE, no engine transaction

`persist` (`QleverStorageAdapter.ts:187-278`) builds a single request:

```
DELETE { GRAPH g { ?s ?p ?old } }
INSERT { GRAPH g { ?s ?p ?new } }
WHERE  {
  { SELECT * WHERE {                                           <- guard subquery  :228-229
      OPTIONAL { GRAPH g { meta field:position ?sourcePosition } }
      FILTER(COALESCE(?sourcePosition,"0") = "<sourceK>")                          :217  position CAS
      FILTER NOT EXISTS { GRAPH g { operation:<id> field:operation_id ?x } }       :218  duplicate attempt
      FILTER NOT EXISTS { GRAPH g { claim:<cmd> field:command_id ?x } }  per claim :220-223
      FILTER NOT EXISTS { VALUES ?n {new ids} GRAPH g { ?n field:id ?x } }         :224-227  identity reuse
  } }
  VALUES (?s ?p ?new) { <every triple of every row, claim, operation, meta> }      :194-215, :230
  OPTIONAL { GRAPH g { ?s ?p ?old } }
}
```

If any guard fails the WHERE yields no rows and the UPDATE inserts nothing, so "all or nothing" holds for guard failures. The engine provides no rollback for execution errors: `packages/qlever/README.md` ("`--persist-updates` writes the complete native delta snapshot...") records that source review found unpublished delta mutation before persistence without exception rollback, and that a live counterexample showed a failed multi-operation request retaining its first INSERT. The adapter therefore uses one MODIFY, and failure atomicity stays unqualified.

### 4.4 Positions, claims, outcome reconciliation

| Concern | Mechanism | Lines |
| --- | --- | --- |
| Position read | `SELECT ?position WHERE { GRAPH g { <urn:triplex:meta> field:position ?position } }` at the start of the outermost transaction. | `:93-102, :327-331` |
| Position allocation | In-memory increment from `sourceK`; persisted by the UPDATE. | `:416-426` |
| Claims | Staged in memory; read check filters `xsd:integer(?position) <= sourceK`; barrier is the `FILTER NOT EXISTS` plus the claim subject IRI. | `:429-450, :220-223` |
| Retraction | Reads the row (`queryRows` by id), stages a copy with retraction fields. | `:458-474` |
| Nested savepoints | Same copy-on-enter scheme as XTDB. | `:286-326` |
| Retry | `QleverSerializationConflict`, `replaySafe`, `maxRetries` 12. | `:343-359` |
| Reconcile after UPDATE | Poll `SELECT ?attempt` for the operation marker every 25 ms up to `resolutionTimeoutMs` (30 s). Marker present: committed. Marker absent but UPDATE acknowledged: re-read the position; if it differs from `sourceK` raise `QleverSerializationConflict`, else raise `WriteError` (a claim or identity guard rejected it). UPDATE errored or timed out and no marker by the deadline: `TransactionOutcomeUnknown`. | `:231-277` |
| Resolve later | `resolveQleverOperation` reads the marker by operation id. | `Operations.ts:16-37` |

### 4.5 Managed writer

The "managed writer" is **not wired into the adapter**. It is a private Python experiment in `experiments/qlever-managed-writer/` (`broker.py` 347 lines, `native_worker.py` 212, `native_faults.py` 419, `DESIGN.md`, `NATIVE-PACKET.md`). Its design admits one prepared MODIFY at a time across all scopes under an `fcntl.flock` global lock, keeps an append-only hash-chained intent journal, and after any uncertain response terminates the owned server, fsyncs the persisted snapshot, restarts and verifies the marker. `README.md` states "No native trial has run" and goal 7 (atomic writes and recovery) is open. Offline tests: `python3 experiments/qlever-managed-writer/run_tests.py` (writes to `.qlever/managed-model/`, so not run here).

### 4.6 Restart and persistence

- The server is started with `--persist-updates` (`qlever-start.sh:9`; `compose.qlever.yaml` runs that script). Updates are held in a native delta; with persistence the whole delta snapshot is written to a temporary file and renamed before the next reader snapshot is published (`packages/qlever/README.md`, `--persist-updates` paragraph). Cost per update grows with all retained delta triples. At 146 triples per minimal transaction this is the dominant scale risk.
- First start builds an index from a one-triple bootstrap file (`qlever-start.sh:4-8`). Later starts reuse `.qlever/data/triplex.index.*` plus the persisted updates file.
- Observed in the README: clean restart and recovery after a read-triggered OOM pass narrower checks; power-loss durability and cancellation during an UPDATE are unqualified.
- `compose.qlever.yaml` uses `--no-access-check` and no token. The homebase entry scripts require a token file (section 7), ours does not.

---

## 5. Tests, engines and the native qualification packet

### 5.1 Which tests need a live engine

Without the flag below, live tests are **skipped, not failed**. With the flag and no engine they **fail** (verified, section 6.3).

**packages/xtdb/test (15 files, 104 tests; 20 run offline, 84 are live)**

| File | Offline tests | Live tests (gated by `XTDB_INTEGRATION=1`) |
| --- | --- | --- |
| `client-parameters.test.ts` | 2 | 0 |
| `native-query.test.ts` | 5 (mock client) | 0 |
| `native-reachability.test.ts` | 2 (mock client) | 0 |
| `native-sql-envelope.test.ts` | 4 | 0 |
| `query-compiler.test.ts` | 4 | 0 |
| `adapter.test.ts` | 2 (codecs) | 12 |
| `json-compatibility.test.ts` | 1 (KV control) | 1 |
| `conformance.test.ts` | 0 | 1 (full 44) plus 44 per-case diagnostics (`XTDB_CONFORMANCE_CASES=1`) |
| `constraints.test.ts` | 0 | 8 |
| `integer-query.test.ts` | 0 | 4 |
| `integer-storage.test.ts` | 0 | 3 |
| `intervals.test.ts` | 0 | 3 |
| `maintained.test.ts` | 0 | 2 |
| `computed-query.test.ts` | 0 | 3 |
| `query-integration.test.ts` | 0 | 3 |

**packages/qlever/test (10 files, 46 tests; 25 run offline, 21 are live)**

| File | Offline tests | Live tests (gated by `QLEVER_INTEGRATION=1`) |
| --- | --- | --- |
| `negation.test.ts` | 11 | 0 |
| `native.test.ts` | 5 (mock client) | 0 |
| `native-relations.test.ts` | 2 (mock client) | 0 |
| `aggregate-answers.test.ts` | 4 | 0 |
| `temporal-profile.test.ts` | 1 | 0 |
| `unicode.test.ts` | 1 | 1 |
| `storage.test.ts` | 1 (order-key math) | 7 (includes the 16-way concurrent command test and a conformance subset, `:317`) |
| `query.test.ts` | 0 | 8 |
| `intervals.test.ts` | 0 | 4 |
| `outcomes.test.ts` | 0 | 1 |

### 5.2 Env vars, ports and defaults

| Variable | Used by | Default | Purpose |
| --- | --- | --- | --- |
| `XTDB_INTEGRATION=1` | all live xtdb tests | unset (skip) | Enable live tests. |
| `XTDB_URL` | xtdb tests, `qualification` loader, `xtdb/experiments/native-entry.ts` | `postgres://xtdb:xtdb@localhost:5442/xtdb` (some files use `127.0.0.1`) | PostgreSQL wire URL. `native-entry.ts:64` requires it set. |
| `XTDB_CONFORMANCE_CASES=1` | `xtdb/test/conformance.test.ts:11,34` | unset | Run the 44 cases individually for failure isolation. |
| `QLEVER_INTEGRATION=1` | all live qlever tests | unset (skip) | Enable live tests. |
| `QLEVER_URL` | qlever tests, loader | `http://127.0.0.1:7019` | SPARQL endpoint. |
| `QLEVER_ACCESS_TOKEN` | `qlever/test/query.test.ts:107` | unset | Optional bearer token. |
| `QLEVER_PROBE_PLAN`, `QLEVER_PROBE_DOMAIN_PLAN`, `QLEVER_PROBE_TRACE_DIR`, `QLEVER_PROBE_RUN_ID` | `query.test.ts:21-96` | unset | Optional probe/trace modes. |
| `TRIPLEX_INTEGRATION=1`, `TRIPLEX_CONFORMANCE_CASES=1` | `packages/qualification/test/runtime-conformance.test.ts:9-11` | unset | Generic unchanged-44 against the backend chosen below. |
| `TRIPLEX_BACKEND`, `TRIPLEX_QUERY_PATH` | `packages/qualification/src/index.ts:111-122` | `xtdb`, `<backend>-datalog` | Pick one of `duckdb-datalog, xtdb-datalog, qlever-datalog, xtdb-native, qlever-native`. |
| `QLEVER_ACCESS_TOKEN_FILE` | loader `index.ts:170-183` | unset | Token file; must live under the repo root. |
| `QLEVER_AGGREGATE_ANSWER_PLAN=bounded`, `QLEVER_NEGATION_PLAN=projected\|minus`, `QLEVER_SOURCE_PLAN=persisted`, `QLEVER_RETIREMENT_PLAN=paired`, `QLEVER_SCALAR_ORDER_PLAN=live` | loader `index.ts:184-203` | unset | Explicit QLever experimental query profiles (the "F1" bounded profile in the wiki). |
| `TRIPLEX_RESOURCE_ADMISSION` (+`_SHA256`), `TRIPLEX_RUN_ARTIFACTS`, `TRIPLEX_RUN_DIRECTORY`, `TRIPLEX_DEVLOOP_JOB_ID` | the 142 runner, `foundation-entry.ts`, qlever `native-entry.ts`/`upstream44.ts` | unset | Provided by the homebase controller. See sections 7 and 9. |

**Default ports in this checkout are 5442 (XTDB) and 7019 (QLever)**, matching `compose.xtdb.yaml` (`127.0.0.1:5442:5432`, image `ghcr.io/xtdb/xtdb:2.2.0@sha256:a6a42650...`, `xtdb-config.yaml`) and `compose.qlever.yaml` (`127.0.0.1:7019:7019`, `adfreiburg/qlever:0.6.0@sha256:37d5ede1...`). Both were closed when checked. The homebase tunnels on `127.0.0.1:15442` and `127.0.0.1:17019` (and `18080`) are live ssh listeners on this Mac right now; **no default in the pure or live package tests points at them**, but several experiment scripts hard-code them (section 9).

**Pointing tests at a new endpoint:** `XTDB_INTEGRATION=1 XTDB_URL=postgres://xtdb:xtdb@127.0.0.1:<port>/xtdb pnpm --filter @triplex-build/triplex-xtdb test`, and `QLEVER_INTEGRATION=1 QLEVER_URL=http://127.0.0.1:<port> pnpm --filter @triplex-build/triplex-qlever test`. The vitest aliases (`vitest.workspace-aliases.ts`) map `@triplex-build/*` to `src/`, so these need no build.

### 5.3 The unchanged44 shared conformance suite

- **Definition:** `triplesConformanceCases` (44 cases), `packages/testkit/src/index.ts:82-2863`. Driver functions `makeTriplesConformanceSuite` (`:2865`) and `runtimeConformance(runtime, {scope, capabilities})` (`:2869-2898`).
- **Oracle:** the in-memory KV runtime. `packages/testkit/test/fixtures.test.ts:24-32` runs all 44 cases against `KvTriples.layer`. This passes offline in about 2 s (section 6).
- **XTDB:** `packages/xtdb/test/conformance.test.ts:9-30`, asserts `toHaveLength(44)`, scope `DatabaseScope.test("xtdb-conformance-<uuid>")`, 240 s timeout.
- **QLever:** there is no `conformance.test.ts`. Routes are (a) `packages/qualification/test/runtime-conformance.test.ts` with `TRIPLEX_INTEGRATION=1 TRIPLEX_QUERY_PATH=qlever-datalog`, which needs built `dist/`; (b) `packages/qlever/experiments/upstream44.ts`, which is homebase-coupled (section 9); (c) a subset in `storage.test.ts:317`.
- **Packet-job variant:** `packages/qualification/workloads/foundation-entry.ts` (44 cases, writes `report.json` and `results.json` under `TRIPLEX_RUN_ARTIFACTS`).

### 5.4 The native qualification packet ("71 tasks, 142 executions")

| Piece | Location | Notes |
| --- | --- | --- |
| Task definitions, events and **expected answers** | `qualification/workloads/temporal-workloads.json` | 20 workload families, 71 cases (4,3,3,4,4,4,3,3,3,4,3,4,4,3,3,3,3,5,4,4). Each case: `id, operation, cut{known_at,valid_at}, parameters, expected_rows`. SHA pinned in `qualification/source-manifest.json`. |
| Fixture construction | `qualification/workloads/engine_cases.mjs` (+ `*_cases.mjs` per family) | `eventGroups`, `nativeWrite`, `casePlan`, `schemaFor`. Loads cleanly (`node -e import(...)` OK). |
| **Independent oracle** | `qualification/workloads/event_oracles.py` | Python event-replay oracle. `validate_workloads.py` re-derives all 71 answers from events and checks them against `expected_rows`; ran here: `result: PASS`, `checked_cases: 71`, `unchecked_case_ids: []`. `test_event_oracles.py`: 8 tests OK. |
| Datalog task evaluators | `packages/qualification/workloads/runner.ts:308-721` (`evaluate`) | Existing structured Datalog; used for `*-datalog` surfaces. |
| **Native task evaluators** | `packages/qualification/src/native/xtdb-workloads.ts` (610 lines), `qlever-workloads.ts` (607), `qlever-recursion.ts` (319) | Independently authored XTDB SQL/XTQL and QLever SPARQL, selected by `TRIPLEX_QUERY_PATH` (`packages/qualification/src/index.ts:205-230`). `supportsXtdbNativeWorkload`/`supportsQleverNativeWorkload` list implemented operations per family. |
| Executor and checker | `packages/qualification/workloads/runner.ts` | Per workload: ingest events as atomic transacts (recordedAt = 1000 + knowledge group; valid time = fixture tick + 1,000,000), then run all cases in a **current** runtime, then re-provide a **fresh** runtime on the same scope and run again (**reopened**). Compares sorted-unique `canonicalRows(actual)` to `expected_rows` (`runner.ts:900-912`). Status `PASS_FUNCTIONAL_ONLY` per workload; exit 1 otherwise. `--workloads 01,02` selects families; `--results-output` writes `triplex-public-logical-results/1`. |
| Cross-lane comparison | `qualification/compare.mjs` + `compare.test.mjs` (3 tests pass) | Needs legacy `scripts/xtdb-qualification.mjs` receipts with `sourceSha256Before`. Not suited to our loop; compare `results.json` files and `expected_rows` directly instead. |
| Public-entry gate (13 checks) | `packages/xtdb/experiments/native-entry.ts`, `packages/qlever/experiments/native-entry.ts` | Not the 142. Schema write, typed XTQL/SPARQL reads, half-open boundaries, safe parameters, future-retraction masking, correction history, reopen, read-only refusal, fixed-cut paging, cancellation and reuse. |

Execution path end to end (minimal, without the homebase controller):

```
 pnpm build xtdb + qlever + qualification        (dist/ required: index.ts:128-146)
          |
 start engine (compose.*.yaml, DOCKER_HOST=triplex2)       <- not done here
          |
 TRIPLEX_QUERY_PATH=xtdb-native XTDB_URL=... [admission]    <- section 9
 node packages/qualification/workloads/runner.ts --output O --results-output R
          |   for each of 20 families:
          |     ingest events -> run 3-5 cases (current) -> reopen -> run again
          |     assert canonicalRows(actual) == expected_rows
          v
 report.json (caseExecutions, passedCaseExecutions = 142 on success)
```

---

## 6. Pure tests (no engines)

All runs: Node 22.23.2, pnpm 10.11.0, `XTDB_INTEGRATION`/`QLEVER_INTEGRATION` unset, nothing listening on 5442 or 7019. Raw output: `lab/research/R4-test-outputs/`.

### 6.1 Results

| Command | Result | Time |
| --- | --- | --- |
| `pnpm --filter @triplex-build/triplex test` (core) | **51 files, 733 tests passed**, 0 skipped | 4 s |
| `pnpm --filter @triplex-build/triplex-xtdb test` | **7 files passed, 8 skipped; 20 tests passed, 84 skipped**, 0 failed | 3 s |
| `pnpm --filter @triplex-build/triplex-qlever test` | **7 files passed, 3 skipped; 25 tests passed, 21 skipped**, 0 failed | 4 s |
| `pnpm --filter @triplex-build/triplex-testkit test` | **46 tests passed** (44 conformance cases + full-suite run + fixtures, on the in-memory KV oracle) | 2 s |
| `pnpm typecheck` | **31 of 31 tasks successful** (includes xtdb, qlever, qualification, duckdb); builds 9 dependency `dist/`s as a side effect | 27 s wall (turbo: 22 s) |
| `python3 -B qualification/workloads/validate_workloads.py` | PASS: 20 workloads, 71 cases, 71 event-oracle checks, 31 small-oracle checks, 0 unchecked | under 1 s |
| `python3 -B -m unittest test_event_oracles` (in `qualification/workloads`) | 8 tests OK | under 1 s |
| `node --test qualification/compare.test.mjs` (via `pnpm --filter ...qualification test:comparison`) | 3 pass | under 1 s |

### 6.2 Two pre-existing failures in this checkout (not caused by this task)

1. `pnpm --filter @triplex-build/triplex-qualification test` **exits 1** (`qualification-test.txt`). Vitest globs `*.test.mjs` and `load/*.test.ts` files written for `node:test` and reports 9 "No test suite found" failures, and `test/query-paths.test.ts` fails 1 of 3 because `packages/duckdb/dist/index.js` does not exist (DuckDB is out of scope for us). Use `test:comparison`, or run vitest on `test/query-paths.test.ts -t "registry"` selectively. The root `pnpm test` (turbo) will fail for the same reason.
2. `node --test qualification/workloads/test_engine_cases.mjs` **fails**: `run_three_engines.mjs:18` imports `../adapter/scale-fixture.mjs`, and `qualification/adapter/` is not in this archive. The legacy three-engine harness is dead. `runner.ts` imports only `engine_cases.mjs`, which loads fine.

### 6.3 Live tests without an engine

| Setting | Behavior | Evidence |
| --- | --- | --- |
| Flag unset (default) | Live describes are skipped (`describe.skipIf(!enabled)`). The run reports green: 84 xtdb and 21 qlever tests skip silently. **A green default run says nothing about the engine.** | `xtdb-test-verbose.txt`, `qlever-test-verbose.txt` |
| `XTDB_INTEGRATION=1`, engine absent | **Fails** with `ECONNREFUSED` wrapped as `MigrationError xtdb-baseline: Cannot initialize XTDB tables`. | `xtdb-integration-no-engine.txt` (run against closed `127.0.0.1:1`) |
| `QLEVER_INTEGRATION=1`, engine absent | **Fails**: 5 of 5 tests failed with `fetch failed`. | `qlever-integration-no-engine.txt` |

---

## 7. Homebase coupling and controller reuse

### 7.1 What the homebase assumed

| Assumption | Where it is encoded |
| --- | --- |
| Quota-backed APFS image at the repo root, mount verified by `diskutil`/`hdiutil` | `tools/bootstrap/check-storage.py` (reads `provenance/bounded-storage.json`); called by `with-env.sh:5` and `qualification/devloop/state.mjs:64, 188` |
| Node 24.13.0 at `.local/tools/node-v24.13.0-darwin-arm64`, private `.cache/*`, `PNPM_HOME` | `tools/bootstrap/with-env.sh:6-14`, `tools/bootstrap/pnpm` |
| Private Colima VM `triplex` and `DOCKER_HOST=unix://<repo>/.runtime/colima/triplex/docker.sock` | `with-env.sh:15-19`; `qualification/devloop/executor.mjs:53-73` |
| Engines on ssh tunnels `127.0.0.1:15442` (XTDB) and `127.0.0.1:17019` (QLever), QLever access token at `.runtime/engines/qlever-main/access-token` | see 9.1 |
| Canonical `.devloop` queue, fair three-lane scheduler, 10 GiB / 8 CPU admission pool | `qualification/devloop/{scheduler,state,executor}.mjs`, `policy.json`, `scripts/triplex-devloop.mjs` |
| Resident engine records pointing at the original checkout | `qualification/devloop/residents/{xtdb,qlever}.json` (`/Users/sam/projects/triplex-db/.runtime/engines/...`) |
| Containers named `triplex-xtdb-local`/`triplex-qlever-local`, compose project labels, `.xtdb/data` and `.qlever/data` bind mounts, exact memory caps | `scripts/triplex-resources.mjs:49-130`, `qualification/resource-profile.json` |

The wiki and `AGENTS.md` describe the homebase loop as current policy. `handoffs/claude-native/START-HERE.md` states the opposite for us: use the files as orientation only, never operate the homebase state, tunnels or `with-env.sh`.

### 7.2 Controller pieces, reuse verdict

| Piece | Size | Verdict | Reason |
| --- | --- | --- | --- |
| `scheduler.mjs`, `state.mjs`, `executor.mjs`, `worker.mjs`, `migration.mjs` | 402 + 192 + 215 + 40 + 59 lines | **Too heavy; do not run** | Fair multi-lane admission, v1 to v2 state migration, Mac PID birth identity, Docker owner validators, APFS mount proof. `state.mjs` fails closed without the quota image. |
| `preimages.mjs` | 94 | Idea worth copying, small | Content-addressed copies of source, runner and oracle bytes so a receipt can be re-verified later. |
| `evidence.mjs` (`verifyByteEvidence`) | 53 | Worth reusing | Re-hashes expected versus actual check bytes. |
| `io.mjs` | 100 | Worth reusing | `atomicJson`, `hashFile`, `ownedPath` (path containment). |
| `qualification/compare.mjs` | 250 | Partial | Its check that all 142 `family/case/current-or-reopened` identities are present and bound to the packet hash is the useful part; the receipt format is legacy. |
| `packages/qualification/workloads/runner.ts` | 1008 | **Reuse as the gate runner** after removing the admission block | Already implements ingest, current, reopen, expected-row comparison and `--results-output`. |
| `qualification/workloads/*` oracle and validator | small | **Reuse unchanged** | Pure, offline, independent. |
| `packages/qualification/load/` | model, dispatch, runner | Reuse later for G7 | Public load driver for the 256/512/1024 profile; needs the controller job format replaced. |

---

## 8. How to run each gate in this checkout

Estimates marked "measured" were run here. All others are estimates; the homebase timing receipts are not in this archive. Job time limits in `prepare-native-job.mjs:262` are 15 minutes for both the 44 and 142 jobs.

| Gate | Command (from repo root) | Needs engine? | Duration |
| --- | --- | --- | --- |
| G0a typecheck | `pnpm typecheck` | No | 27 s measured (cold, builds deps) |
| G0b core tests | `pnpm --filter @triplex-build/triplex test` | No | 4 s measured |
| G0c xtdb offline tests | `pnpm --filter @triplex-build/triplex-xtdb test` | No (live ones skip) | 3 s measured |
| G0d qlever offline tests | `pnpm --filter @triplex-build/triplex-qlever test` | No (live ones skip) | 4 s measured |
| G0e KV oracle unchanged44 | `pnpm --filter @triplex-build/triplex-testkit test` | No | 2 s measured |
| G0f packet oracle self-check | `python3 -B qualification/workloads/validate_workloads.py` and `(cd qualification/workloads && python3 -B -m unittest test_event_oracles)` | No | under 1 s measured |
| G0g comparison reader | `pnpm --filter @triplex-build/triplex-qualification test:comparison` | No | under 1 s measured |
| Build for experiments and packet | `pnpm --filter @triplex-build/triplex-xtdb --filter @triplex-build/triplex-qlever --filter @triplex-build/triplex-qualification build` | No | estimate 10 to 30 s, **not run** (writes gitignored `dist/`) |
| G-live-x all xtdb package tests | `XTDB_INTEGRATION=1 XTDB_URL=postgres://xtdb:xtdb@127.0.0.1:<port>/xtdb pnpm --filter @triplex-build/triplex-xtdb test` | **Yes** (XTDB 2.2.0) | estimate 3 to 10 min (conformance alone has a 240 s cap), not run |
| G-live-q all qlever package tests | `QLEVER_INTEGRATION=1 QLEVER_URL=http://127.0.0.1:<port> pnpm --filter @triplex-build/triplex-qlever test` | **Yes** (QLever 0.6.0) | estimate 3 to 10 min, not run |
| G1 unchanged44, XTDB | `XTDB_INTEGRATION=1 XTDB_URL=... pnpm --filter @triplex-build/triplex-xtdb exec vitest run test/conformance.test.ts` | **Yes** | estimate 1 to 4 min (cap 240 s) |
| G1 unchanged44, QLever | `pnpm --filter @triplex-build/triplex-qlever build && pnpm --filter @triplex-build/triplex-qualification build`, then `TRIPLEX_INTEGRATION=1 TRIPLEX_QUERY_PATH=qlever-datalog QLEVER_URL=... pnpm --filter @triplex-build/triplex-qualification exec vitest run test/runtime-conformance.test.ts` | **Yes** | estimate 1 to 4 min. QLever may need the explicit F1 profile env vars (section 5.2) to avoid planner OOM at 2 GiB; see `wiki/problems/qlever-planner-memory.md`. |
| G1 per-case isolation | add `XTDB_CONFORMANCE_CASES=1` or `TRIPLEX_CONFORMANCE_CASES=1` | **Yes** | longer, one scope per case |
| G2 native 142, XTDB (XTQL plus SQL) | `TRIPLEX_QUERY_PATH=xtdb-native XTDB_URL=... node packages/qualification/workloads/runner.ts --output <path under qualification/ or admitted dir> --results-output <path>` after the admission fix in section 9. `--workloads 01,02,...` for a subset. Expect `caseExecutions: 142`, `passedCaseExecutions: 142`. | **Yes** | estimate 5 to 15 min (15 min job cap), not run |
| G2 native 142, QLever | same with `TRIPLEX_QUERY_PATH=qlever-native QLEVER_URL=...` and optional `QLEVER_*_PLAN` profile vars | **Yes** | estimate 5 to 15 min, not run |
| G2 translated 142 (Datalog) | same with `xtdb-datalog` or `qlever-datalog` | **Yes** | same |
| Public native-entry (13 checks), XTDB | `XTDB_URL=... node packages/xtdb/experiments/native-entry.ts --output <path inside repo>.json` (no admission needed; needs `dist/` for core and xtdb) | **Yes** | estimate 1 to 2 min (job cap 120 s) |
| Public native-entry, QLever | **Blocked as written** (hard-coded 17019, token file, admission). Parametrize first (section 9). | **Yes** | estimate 1 to 2 min |
| G3 to G7 (entity suite, semantic counterexamples, write faults, scale, load) | Not present in the repo. `lab/PLAN.md` section 4.4 defines them; `packages/qualification/load/` and `qualification/qlever-live/*.json` are the nearest existing material. | Yes | n/a |

---

## 9. Replace before running

### 9.1 Must change before any live gate

| # | Item | Where | Why it breaks here | Replacement |
| --- | --- | --- | --- | --- |
| 1 | **Resource admission in the 142 runner** | `packages/qualification/workloads/runner.ts:61-110` | Without `TRIPLEX_RESOURCE_ADMISSION` it shells out to `scripts/triplex-resources.mjs --require-server`, which inspects Docker containers named `triplex-xtdb-local`/`triplex-qlever-local`, compose-project labels, bind mounts at `<repo>/.xtdb/data` and `<repo>/.qlever/data`, exact memory/CPU caps from `qualification/resource-profile.json`, and a QLever readiness receipt. With an admission file it demands a live homebase controller pid (`process.kill(pid, 0)`) and `format: triplex-devloop-resource-admission/1`. The `--output` must also sit under the admitted `artifacts/` dir or `qualification/`. | Our own `lab/bin` gate wrapper: skip admission (guard with an explicit `TRIPLEX_ADMISSION=off`), take `--output` anywhere under `lab/runs/`, and record engine image digest, container id, memory and volume bytes in the receipt instead. This is a small edit to `runner.ts`. |
| 2 | **Foundation entry** | `packages/qualification/workloads/foundation-entry.ts:15-18` | Requires `TRIPLEX_RUN_ARTIFACTS` inside the repo, plus `--output` and `--results-output`. | Set `TRIPLEX_RUN_ARTIFACTS=<repo>/lab/runs/<gate>/<id>` and pass both flags. No code change needed. |
| 3 | **QLever native entry and upstream44** | `packages/qlever/experiments/native-entry.ts:22-41`, `upstream44.ts:12-20, 29` | `assert.equal(QLEVER_URL, "http://127.0.0.1:17019")`; reads `.runtime/engines/qlever-main/access-token`; requires a controller admission JSON with `requiredOwnerChecks[foundation-qlever].memoryBytes == 2 GiB`; requires `TRIPLEX_RUN_ARTIFACTS`. | Read `QLEVER_URL` and optional `QLEVER_ACCESS_TOKEN`; drop the admission assertion. |
| 4 | **Other QLever experiment entries with 17019 / token / `.devloop`** | `packages/qlever/experiments/{aggregate-entry,retirement-pair-entry,persisted-source-entry,scalar-order-entry,string-order-probe,native-query-shapes}.ts`; `packages/qualification/experiments/qlever-*.ts` | Same hard-coded endpoint and token. | Same parametrization, only when needed. |
| 5 | **XTDB verify script** | `packages/qlever/experiments/verify-xtdb-entry.ts:17` | Constant `postgresql://xtdb:xtdb@127.0.0.1:15442/xtdb`. | Read `XTDB_URL`. |
| 6 | **Build outputs** | `packages/{xtdb,qlever,qualification}/dist` | The loader imports built artifacts only (`packages/qualification/src/index.ts:128-146`); `native-entry.ts` hashes `dist/` directories and fails if absent. | `pnpm --filter ... build` before packet runs. |
| 7 | **Engine endpoints** | env | Our engines run in colima profile `triplex2`, not on 5442/7019 unless we publish those ports. | Set `XTDB_URL`/`QLEVER_URL` explicitly in every gate; never rely on defaults when another stack is running. Keep `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`. |

### 9.2 Do not run; read-only orientation

- `tools/bootstrap/*` (`with-env.sh`, `pnpm`, `check-storage.py`, `provision-engines.py`, `restore-qlever*.py`, `maintenance-readiness.mjs`, `verify-import.py`, `zip-registry.py`): provision and verify homebase engines at 15442/17019 under the private VM and APFS image.
- `qualification/devloop/*` and `scripts/triplex-devloop.mjs`: the homebase controller and its `.devloop` queue.
- `qualification/devloop/residents/*.json`, `recipes/logical-fixture*.json`, `qualification/qlever-live/*.json`, `qualification/maintenance-jobs/**`, `qualification/extensions/**/prepare*.mjs`: job manifests pinned to `/Users/sam/projects/triplex-db/...`, Node 24.13.0 paths and port 17019.
- Job preparers `packages/qualification/workloads/prepare-native-job.mjs` (writes `XTDB_URL=...15442`, `QLEVER_URL=...17019`, pins `tools/bootstrap/with-env.sh` as a runner input), `packages/xtdb/experiments/prepare-native-entry-job.mjs`, `packages/qualification/load/prepare-job.mjs`: they emit controller manifests only.
- `experiments/qlever-native-*/` (Python and mjs): use `with-env.sh`, `.devloop`, 17019 and `TRIPLEX_RESOURCE_ADMISSION`.
- `experiments/qlever-managed-writer/` offline tests write under `.qlever/managed-model/`; run only deliberately.
- `scripts/triplex-lease.py`, `scripts/qlever-compact-v3-ready.py`, `scripts/xtdb-*.ts` and `scripts/triplex-*.ts` (archived qualification lease and scale scripts).

### 9.3 Safe as written

- All package tests via `pnpm --filter ... test` (vitest aliases to `src/`, defaults 5442/7019).
- `qualification/workloads/validate_workloads.py`, `test_event_oracles.py`, `engine_cases.mjs`.
- `packages/xtdb/experiments/native-entry.ts` (reads only `XTDB_URL`, any output path inside the repo).
- `compose.xtdb.yaml`, `compose.qlever.yaml`, `xtdb-config.yaml`, `qlever-start.sh`: independent, ports 5442/7019, container names match the resource profile. XTDB `mem_limit: 8g` plus QLever `mem_limit: 4g` exceeds the 12 GiB `triplex2` VM when both run, so size them down for our slots (`lab/PLAN.md` section 5 plans about 3 GiB and 2 GiB).

### 9.4 Risks to check on the first live run

1. `XtdbStorageAdapter.initialize` submits 7 `CREATE TABLE` statements in one XTDB transaction on every runtime start (`:622-652`), and the native reachability code does the same (`Reachability.ts:161-164`). Whether XTDB 2.2.0 treats these as no-ops was proven only on the homebase; confirm early (R1 scope).
2. QLever default planner settings OOM at 2 GiB; the wiki's bounded "F1" profile combines server flags with the `QLEVER_*_PLAN` env vars above. The compose file starts QLever with `-j 16 -m 2G -c 256M -e 64M` and no planner budget flag, so the default-run results will not reproduce the homebase F1 results.
3. `pnpm test` at the root fails because of the qualification package (6.2). Do not use it as a gate.

---

## Evidence index (`lab/research/R4-test-outputs/`)

| File | Content |
| --- | --- |
| `run-pure.sh`, `pure.done` | Script that ran the three package suites sequentially. |
| `core-test.txt/.exit`, `xtdb-test.txt/.exit`, `qlever-test.txt/.exit` | Default `pnpm --filter ... test` output and exit codes. |
| `xtdb-test-verbose.txt`, `qlever-test-verbose.txt` | Per-test pass or skip lists (verbose reporter). |
| `xtdb-integration-no-engine.txt`, `qlever-integration-no-engine.txt` | `*_INTEGRATION=1` against a closed port: failures, not skips. |
| `testkit-test.txt/.exit` | KV oracle run of the 44 cases. |
| `qualification-test.txt/.exit` | The failing package test (6.2 item 1). |
| `engine-cases-node-test.txt/.exit` | Missing `qualification/adapter/scale-fixture.mjs` (6.2 item 2). |
| `oracle-validate-workloads.txt`, `oracle-unittest.txt` (+ `.exit`) | Packet oracle validation. |
| `typecheck.txt/.exit` | `pnpm typecheck`, 31 of 31. |
| `qlever-triple-count.mts`, `qlever-triple-count.out.txt` | Stubbed-`fetch` measurement of triples per UPDATE. Run: `cd packages/qlever && pnpm exec tsx ../../lab/research/R4-test-outputs/qlever-triple-count.mts` (needs `packages/core/dist`). |
| `xtdb-statement-trace.mts`, `xtdb-statement-trace.out.txt` | Mock-client trace of the statements in one XTDB transaction. Run from `packages/xtdb` the same way. |

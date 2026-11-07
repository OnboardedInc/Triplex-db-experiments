# R9: Core plumbing for an entity projection and an ORM-style repository

Date: 2026-11-07. Checkout: `/Users/sam/projects/triplex-db-2`. Read-only study. No engine was started, no container was run, no repo source was changed, and `/Users/sam/projects/triplex-db` was not touched. This file is the only thing written.

Evidence tags. `path:line` means read from the checkout. R4 and R3 mean `lab/research/R4-codebase-harness-map.md` and `lab/research/R3-orm-prior-art.md`. "Unverified" means a claim that needs a live engine or a test I did not run.

---

## 0. Answer first

**Hook point for projection writes.** The `persist(state, ...)` step of each adapter. It already receives every row of the transaction (data rows, journal rows, and retractions with their retraction columns applied) and builds one engine submit.

- XTDB: `packages/xtdb/src/XtdbStorageAdapter.ts:188-331` (statement list `:193-267`, single `client.submit` `:290`, called from `:405-406`).
- QLever: `packages/qlever/src/QleverStorageAdapter.ts:187-278` (VALUES list `:194-215`, single SPARQL UPDATE `:230`, called from `:343-344`).
- The projection spec arrives through the runtime options bag that already feeds the adapter factory (`packages/xtdb/src/index.ts:14-22, 45-58`; QLever `index.ts:14-21, 46`).
- Projection needs **zero edits** to `TriplesLive.ts`, `StorageAdapter.ts`, `Runtime.ts`, `KvTriplesLive.ts` or `packages/testkit`.

**Journal finding.** An adapter can serve `transaction`, `transactionByCommand`, `transactions`, `transactionsForEntity` and the receipts without stored `:_tx/change` JSON, because every field of a `TransactionChange` is a column of the ledger row. Two things block a fully native journal and one thing makes a slimmer one safe.

- Adapters never see `TransactionMeta` (actor, correlation, causation, config snapshot), so something must still store one small envelope per transaction.
- `_Transaction` facts are public. Docs promise them to Datalog (`docs/operational-primitives.md:39-51`) and two of the 44 shared cases read them directly (`packages/testkit/src/index.ts:1728` and `:2612`). A fully native journal breaks those two cases.
- Safe first step ("slim journal"): stop writing only the two O(changes) attributes (`:_tx/change`, `:_tx/changed-entity`), keep the O(1) envelope facts. All 44 cases keep passing, and stored rows drop by about half at large transactions.

**Proposed change list.** Details and risk in section 7.

| Order | Change | Touches core `TriplesLive`? |
|---|---|---|
| 1 | `ContentId.Domain.projectionSpec` plus new `./entity` subpath with `ProjectionSpec` and a pure `planProjection` | no |
| 2 | Move `rowToTriple` and export reserved-namespace predicates to the `runtime` subpath | pure refactor |
| 3 | XTDB and QLever: spec option, DDL, plan step before `persist`, extra statements, spec fence | no |
| 4 | Extract `ConfigApi.compile` descriptors and `EntityCodec` from `packages/http` into `./entity` | no |
| 5 | Repository and Writer over `Triples`, plus an optional projection reader per engine | no |
| 6 | Literal-preserving `Attribute.use` and handle types (compile-time only) | no |
| 7 (optional) | `journal?` adapter member, slim journal in `TriplesLive` | yes, behind `adapter.journal !== undefined` |

---

## 1. Write path (question 1)

### 1.1 One `transact`, call by call

```
Triples.transact(ops, meta)                              store/Triples.ts:221-231 (type)
  |  capability wrappers (post-commit only)               StoreCapability.ts:98-112; Capabilities.ts:91-99
  v
TriplesLive.transact                                      store/TriplesLive.ts:253-523          CORE
  structuredClone(ops, meta)                              :264-273
  adapter.withTransaction(effect, {replaySafe:true})      :275 and :521                         ADAPTER opens staged state
  | value-family check (adapter.supportedValueTypes)      :277-288
  | reserved-namespace check                              :289-292   (systemNamespace.ts:80-87)
  | TripleLive precondition must have a retract           :293-300   (transactionMetadata.ts:184-197)
  | commandId length 1..1024                              :301-307
  | txId = nextTxId; timestamp = now                      :308-309   (TripleStoreRuntime.ts:13-19)
  | adapter.claimCommand -> CommandAlreadyCommittedError  :310-325   (XTDB :501-521)
  | position = adapter.nextCommitPosition()               :326       (XTDB :486-496, in-memory increment)
  | EntityState preconditions via adapter.getByEntity     :330-346
  | meta.enforce -> adapter.validateConstraints? or       :348-400   (optional member, StorageAdapter.ts:25-29)
  |   portable Constraint.newlyViolated
  | ops loop, in order:
  |   asserts   -> adapter.insert / batchInsert            :209-251, :409-429, :497-511
  |   retract   -> getById, adapter.retract                :432-470
  |   retract-pattern -> adapter.query, retract each       :471-494
  | journal: metadataInputs -> adapter.insert per input    :513-517  (transactionMetadata.ts:29-57)
  | return TransactionResult {txId, position, instant,     :519
  |   triples, retracted}
  v   effect finished, still inside withTransaction
OUTERMOST withTransaction only:
  no rows, no claims, position unchanged -> skip persist   XTDB :403-404; QLever :342
  persist(state, operationId, attemptId)                   XTDB :405-406; QLever :343-344       <-- HOOK
  on SerializationConflict and replaySafe -> rerun effect  XTDB :409-420; QLever :347-358 (max 12)
```

### 1.2 Who produces what

| Item | Produced by | Where |
|---|---|---|
| Assertion rows (`TripleRow`, 20 columns) | adapter builds the row from core's `TripleInput`, id, txId, timestamp, position | XTDB `insert` `:429-458`; QLever `insert` `:366-` |
| Row ids | core (`nextTripleId`, monotonic ULID) | `TriplesLive.ts:237, 247`; `utils/id.ts:14, 52` |
| Retractions | core decides; adapter rewrites the staged row with `retracted_at/_position/_tx_id` | `TriplesLive.ts:442-447`; XTDB `:529-545`; QLever `retract` (R4 `:458-474`) |
| Preconditions | core, as reads inside the staged transaction | `TriplesLive.ts:293-300, 330-346, 448-455` |
| Command claims | core asks (`claimCommand`), adapter stages the claim and persists it | `TriplesLive.ts:310-325`; XTDB `:501-521`; persisted at `:231-245` |
| Commit position | adapter (in-memory increment from the position read at transaction start; CAS at commit) | XTDB `:386-396, 486-496, 195`; QLever `:327-338, :217` |
| `TransactionResult` (the caller's receipt) | core | `TriplesLive.ts:519` |
| Operation marker (durable receipt for unknown outcomes) | adapter, in the same submit | XTDB `tx_attempts` `:253-267`; QLever operation node `:210-215` |
| `_Transaction` journal assertions | core produces the inputs, adapter stores them as ordinary rows | `transactionMetadata.ts:29-57`; `TriplesLive.ts:513-517` |
| The `changes` list used for the journal | core, built while looping ops | `TriplesLive.ts:403, 423-427, 459-465, 487-489, 506-510` |

The KV runtime is a second, parallel implementation of the same sequence (`packages/core/src/kv/layers/KvTriplesLive.ts:423-646`, journal at `:619-625`). It is the conformance oracle (`packages/testkit/test/fixtures.test.ts:24-32`). Any change to `TriplesLive.transact` semantics must be mirrored there; every change proposed below avoids that by acting only when an adapter opts in.

### 1.3 Where a hook can see the full write set

The adapter's staged state at the moment `persist` runs:

| Field | XTDB (`TransactionContext.ts:10-18`) | QLever (`QleverStorageAdapter.ts:30-36`) |
|---|---|---|
| `rows: Map<id, TripleRow>` | all inserted rows plus retracted rows (full columns, retraction fields applied) | same |
| `claims` | command id to `{txId, timestamp}` | same |
| `position` | the new commit position | same |
| `sourceK` | position read at transaction start (the CAS value) | same |
| `newIds` | ids inserted in this attempt | same |

Rows already contain `entity_id`, `entity_type`, `attribute`, typed value columns, `valid_from`, `valid_to`, `recorded_at`, `recorded_position`, and the retraction columns, so a planner needs nothing else. Data rows and journal rows are mixed in `rows`; journal rows are recognizable by `entity_type === "_Transaction"`. Projection must skip them and every other reserved type (`isReservedEntityType`, `systemNamespace.ts:55-56`, which covers `_Transaction` and `triplex.*`) and reserved ids (`isReservedEntityId`, `:50`).

**Missing from the staged state:** `TransactionMeta` (actor, correlationId, causationId, configSnapshot), the op order, and whether the journal was suppressed (`systemNamespace.ts:18-20`). Projection does not need them. The journal does (section 2).

### 1.4 Three candidate hooks

| Hook | Where | Sees | Atomic with the ledger | Core change | Verdict |
|---|---|---|---|---|---|
| H1 adapter `persist` | XTDB `:188-331`; QLever `:187-278` | all rows, claims, position, sourceK | yes, same `client.submit` or same UPDATE | none | **Use this** |
| H2 `StoreCapability.wrap(transact)` | `StoreCapability.ts:40-45`; examples `ChangeEmissionCapability.ts:32-44`, `EntitySnapshotsCapability.ts:200-259` | ops, `TransactionResult`, journal via `inner.transaction` | **no**, runs after commit; a failure is reported but the source commit stays (`EntitySnapshotsCapability.ts:75-82`) | none | Reject for projection writes |
| H3 new optional `StorageAdapterService` member called by `TriplesLive` | precedent `validateConstraints?` (`StorageAdapter.ts:25-29`, called at `TriplesLive.ts:348-358`) | ops, meta, changes, txId | yes | yes | Only needed if projection must read `TransactionMeta`. It does not. |

Existing "entity projection" code in core is H2 and unusable here. `EntitySnapshots` is post-commit, schema-less (attribute map plus content hash, `snapshots/canonical.ts`), and requires a SQL adapter with `rawQuery` (`SnapshotServiceLive.ts:75, 261`). XTDB and QLever have no `rawQuery`, so the default capability set cannot build on them, which is why every conformance driver passes `Capabilities.none` (`packages/xtdb/test/conformance.test.ts:25`; `packages/qualification/test/runtime-conformance.test.ts:25`).

### 1.5 Shape of the hook inside an adapter

Planning needs the post-transaction live facts of every touched entity, not just the changed rows, because a wide row holds all attributes of the entity.

```
XtdbStorageAdapter.withTransaction, outermost branch
  result = run effect                                      :402
  if nothing staged -> return                               :403-404
  NEW  touched = distinct entity_id in state.rows, minus reserved
  NEW  facts   = queryRows({}, undefined, false, undefined, touched)    existing merge of committed rows
                 (<= sourceK) with the staged overlay                  :111-186
  NEW  plan    = planProjection(spec, facts, {instant, position})       pure, lives in core ./entity
  persist(state, operationId, attemptId, plan)              :405-406
    statements = [ASSERT position CAS, ASSERT operation, ASSERT claims, ASSERT identity,   :193-213
                  INSERT tx_assertions ...,                                               :214-230
                  INSERT tx_claims,                                                       :231-245
                  NEW render(plan): DELETE/INSERT projection rows + projection meta row,
                  NEW ASSERT spec fence,
                  INSERT tx_meta, INSERT tx_attempts]                                     :246-267
```

- The extra read runs inside the replay loop, so it uses the same cut as the CAS. A concurrent commit changes `tx_meta.position`, the first ASSERT fails, and the whole attempt (read, plan, write) reruns.
- Cost: one additional batched read per transaction that touches a projected entity type. `EntityStore.replace` already issues the same read before it writes (`packages/http/src/EntityStore.ts:201`).
- With no spec the new lines are skipped, so the generated statement list is unchanged. R4's mock-client trace (`R4-test-outputs/xtdb-statement-trace.mts`) can pin that.
- QLever: the same plan step sits at `:342-344`; the plan renders into the same `values` array (`:194-215`). The existing `DELETE ... INSERT ... OPTIONAL ?old` form replaces one object per `(subject, predicate)`, so multi-valued attributes need explicit deletes of removed objects. That is for the QLever lane to design. Note R4 section 4.3: failure atomicity inside a QLever UPDATE is unqualified, so a partial apply of ledger plus projection is possible in an engine-fault case. The `projection_position` fence in section 3.4 detects it.

### 1.6 Rules the planner must follow (affect what the hook may do)

1. **The ledger write must never fail because of projection data.** A value whose family does not match the declared type, a second value on a cardinality-one attribute, or an unknown attribute on a projected type sets `_shape_ok = false` on that entity's row (or records it in an overflow column) instead of raising. This keeps the ledger schema-less. The repository falls back to the ledger decode, which raises the same `DataShapeConflictError` `EntityCodec` raises today (`packages/http/src/EntityCodec.ts:186-234`).
2. **Membership rule.** An entity belongs to type X when at least one live fact has `entity_type = X`. This is the same rule `entityPage` uses (`TriplesLive.ts:606`) and `encodeEntity` uses (`EntityCodec.ts:193-201`). Facts without an `entity_type` still contribute values to an entity that is a member by other facts.
3. **Leaving a type.** When the last live type-X fact is retracted, the planner emits a delete for that entity's row in table X.
4. **Valid-time window.** Facts have `valid_from` and `valid_to`. A row computed at the transaction instant `I` is correct only for `validAt` in `[I, B)`, where `B` is the earliest `valid_from > I` or `valid_to > I` among the entity's live facts. Store `_asof = I` and `_until = B` (null when none). See section 4.2 for how readers use them. This mirrors what `Triples.dependencyState` already computes as `nextTemporalBoundary` (`Triples.ts:150-155`).
5. **Position.** Store `_position = state.position` per row and a per-scope `projection_position` that is updated on every commit, including commits that touch no projected entity.
6. **State content id.** The planner can compute `hashCanonical(canonicalize(triplesToAttributeMap(facts)))` (exported from `internal.ts`, `snapshots/canonical.ts`) and store it as `_state_cid`. A verifier can then recompute from the ledger and compare, using the same id `EntitySnapshot.hash` uses today.

---

## 2. Journal (question 2)

### 2.1 How the journal is read back today

| API | Implementation | Rows read |
|---|---|---|
| `transaction(txId)` | `TriplesLive.ts:634-637` | `adapter.query({entityId: txId, entityType: "_Transaction"})`, then `transactionRecordFromTriples` (`transactionMetadata.ts:105-147`) |
| `transactionByCommand(commandId)` | `TriplesLive.ts:639-648` | `adapter.query({attribute: ":_tx/command-id", value})`, first row's entity, then `transaction()` |
| `transactions({after, limit})` | `TriplesLive.ts:650-675` | **every** `_Transaction` row (`query({entityType})`), grouped by tx, sorted by position, then filtered and sliced. O(whole journal) per page. |
| `transactionsForEntity` | `TriplesLive.ts:677-682` calling `store/entityTransactionHistory.ts:26-117` | Datalog over `:_tx/changed-entity` and `:_tx/position` (`:50-57`), then `transaction()` per hit |
| Caller receipt | `TransactionResult` at `TriplesLive.ts:519` | none |
| Durable receipt | claim row plus operation marker | XTDB `tx_claims`, `tx_attempts`; QLever claim and operation nodes |

KV mirrors all of this: `KvTriplesLive.ts:752-813`.

### 2.2 Can the ledger serve it? Field by field

| `TransactionRecord` field (`Triples.ts:108-118`) | Legacy source | Derivable from ledger rows? |
|---|---|---|
| `txId`, `position`, `instant` | `:_tx/position`, `:_tx/instant` facts | `position` yes (`recorded_position` of the rows). `instant` yes (`recorded_at`). `txId` yes (`tx_id`). But see "which transactions are journaled" below. |
| `actor`, `commandId`, `correlationId`, `causationId`, `configSnapshot` | `:_tx/*` string facts | **No.** Claims store only commandId, txId, timestamp, position (XTDB `:231-245`). The rest is never passed to the adapter. |
| `changes[]` with `op: "assert"` | `:_tx/change` JSON from `transactionChangeFromTriple` (`transactionMetadata.ts:9-27`) | **Yes.** Rows with `tx_id = T`: `tripleId=id, entityId, attribute, entityType, value, validFrom, validTo, recordedAt, assertionTxId=tx_id`. All immutable after insert. |
| `changes[]` with `op: "retract"` | same | **Yes.** Rows with `retract_tx_id = T`: same fields plus `retractedAt`, `retractionTxId`. `recordedAt` and `assertionTxId` are the original row's, which matches the legacy record (`transactionMetadata.ts:23-26`). |
| Order of `changes[]` | op order inside the transaction | **No.** Only asserts are ordered (monotonic ULIDs, `utils/id.ts:52`, unless a deterministic id generator is used). Interleaving of retracts and asserts is lost. |
| Which transactions are journaled | presence of `_Transaction` facts | Not from data rows. Unjournaled system writes (`ConsumerCheckpoint.ts:222, 266`, via `systemNamespace.ts:39-48`) still write ledger rows and consume positions. |
| Entity to transaction index | `:_tx/changed-entity` | **Yes.** Positions at which any row of the entity was inserted (`recorded_position`) or retracted (`retracted_position`), intersected with journaled positions. |

So the answer is yes for the O(changes) part and for the lookups, and no for the O(1) envelope. One stored envelope per transaction stays.

### 2.3 Every consumer of the journal

**Reads `_Transaction` facts directly (breaks or changes if the facts go away).**

| Consumer | Evidence |
|---|---|
| Core `TriplesLive` journal reads | `TriplesLive.ts:634-675` |
| Core `entityTransactionHistory` (Datalog over `:_tx/*`) | `entityTransactionHistory.ts:50-57` |
| Core `KvTriplesLive` journal reads | `KvTriplesLive.ts:752-810` |
| `EntitySnapshotsCapability.resolveTxTime` (matches `:_tx/instant`) and its `_tx/` filter | `EntitySnapshotsCapability.ts:30-33, 245-248` |
| Reserved-namespace guard | `systemNamespace.ts:52-56` |
| Shared case 29 "transact records provenance datoms" | `testkit/src/index.ts:1728-1755` (`match({entityId: txId})` expects `:_tx/instant`, `:_tx/actor`) |
| Shared case 39 "transaction journals cannot be retracted through ordinary writes" | `testkit/src/index.ts:2612-2644` (`match` by tx id, `retract(instant.id)`, `retractByPattern({entityType: "_Transaction"})` must fail) |
| Integration tests | `test/integration/test/datalog.test.ts:1086-1088, 1187`; `test/integration/test/triples-sql.test.ts` (3 hits); `packages/core/test/kv/layers/KvTriples.test.ts:66-68` |
| Public docs | `docs/operational-primitives.md:39-51` ("The same facts remain available to Datalog"), `docs/datalog.md:41`, `docs/sqlite.md:85`, `README.md:435`, `ARCHITECTURE.md:71-74` |

**Reads through the `Triples` journal API (unaffected if the API result is identical).**

| Consumer | Evidence |
|---|---|
| Derivations | `derivation/Derivation.ts:273, 336`; `derivation/Materialization.ts:227, 389`; `derivation/Overlay.ts:213` |
| Entity validation | `config/EntityValidation.ts:446-459` (`latestSourcePosition` pages the whole feed) |
| SQL snapshot writer | `snapshots/SnapshotServiceLive.ts:82, 98` |
| Change emission | `store/writeEventUtils.ts:140` (`inner.transaction(result.txId)` builds subscription events) |
| Entity snapshots | `EntitySnapshotsCapability.ts:217` |
| Host protocol | `packages/host/src/Protocol.ts:153-157` |
| CLI | `packages/cli/src/operations.ts:241, 310-315` |
| Dashboard | `packages/dashboard/src/data.ts:355, 738` (it filters `_tx/` ids when it lists facts, `data.ts:109`) |
| Example host | `examples/compliance-host/src/demo.ts:408, 543` |
| http | none (only rejects reserved names, `packages/http/src/ConfigApi.ts:170, 203`) |
| Subscriptions | none read `_tx`; they receive `ChangeEvent` from the capability above |
| Tests | xtdb `adapter.test.ts:401`, `constraints.test.ts:250, 296, 306`; qlever `storage.test.ts:88, 145`; postgres integration `:189, 233, 332, 473`; qualification `load/runner.ts:720`, `workloads/runner.ts:838` |

### 2.4 What changes publicly, by tier

| Tier | What is stored | `_Transaction` facts visible to `match`, `history`, Datalog | Shared cases affected |
|---|---|---|---|
| T0 status quo | envelope facts + `:_tx/change` + `:_tx/changed-entity` | all | none |
| **T1 slim** | envelope facts only (`position`, `instant`, `actor`, `command-id`, `correlation-id`, `causation-id`, `config-snapshot`) | all except `:_tx/change` and `:_tx/changed-entity` | none (cases 29 and 39 read only `:_tx/instant`, `:_tx/actor`, and the entity type) |
| T2 native | one envelope row per transaction in an adapter table, no `_Transaction` facts | none | cases 29 and 39 fail. Also `retractByPattern({entityType: "_Transaction"})` would match zero rows and succeed with `0`, where today it fails with the reserved-namespace error (`TriplesLive.ts:474-483`). A pattern-level reserved check in core would fix that. |

### 2.5 Size effect (formulas from R4 section 2.2 and 4.2; T2 envelope size is an estimate)

`A` assertions, `E` distinct changed entities, `m` set meta fields.

| Backend and profile | T0 | T1 | T2 |
|---|---|---|---|
| XTDB rows per transaction, formula | `A + A + E + 2 + m` | `A + 2 + m` | `A + 1` |
| XTDB, 1 assert, no meta | 5 | 3 | 2 |
| XTDB, A=500, E=50 | 1,052 | 502 | 501 |
| QLever triples, string asserts, no meta | `54A + 27E + 63` (+2 meta) | `27A + 63` (+2 meta) | `27A + ~8 + 3` (+2 meta), estimate |
| QLever, 1 assert (measured 146 by R4) | 146 | 92 | ~40 |
| QLever, A=500, E=50 (R4: 28,413) | 28,413 | 13,563 (-52%) | ~13,510 |

T1 captures nearly all of the large-transaction saving. T2 adds saving mainly for tiny transactions.

### 2.6 Edge cases a derived `changes[]` must handle

1. **Order.** Choose one: (a) canonical order, asserts by id then retracts by `(recorded_at, id)`, or (b) store a compact order string per transaction (`a:<id>,r:<id>,...`, about 30 bytes per change, versus 300+ for the JSON). Consumers that depend on order are order-insensitive between different ids (`Derivation.ts:270-284` maintains a map keyed by triple id; the 44 cases use `some`/`find`/`arrayContaining`). Option (a) is safe, but a retract-first transaction (for example `EntityStore.replace`, `EntityStore.ts:195-200`) yields a different array order than T0. Choose (b) only if byte-identical records are required.
2. **Assert then retract inside one transaction.** Possible (`retract-pattern` sees staged rows, `XtdbStorageAdapter.ts:171-182`). The row has `tx_id = T` and `retract_tx_id = T`, and must yield both changes, assert first.
3. **`-0`.** The legacy journal stores `JSON.stringify(change)`, which turns `-0` into `0`. The ledger keeps `-0` (XTDB typed float8, QLever `numericLexical`, `rdf.ts:63`). A derived record is more faithful than the legacy one, so a byte comparison on a `-0` assertion differs. Unverified whether any test asserts it.
4. **Journal rows in T1 share `tx_id` and `recorded_position` with data rows.** Derivation queries must exclude `entity_type = "_Transaction"`.
5. **Unjournaled transactions.** `transactionsForEntity` must intersect entity positions with envelope positions, or the checkpoint entity would list transactions legacy never shows.
6. **Read cost.** XTDB has no secondary index; position-filtered scans rely on its chunk metadata. QLever has `recorded_position_order` and `retracted_position_order` predicates (`rdf.ts` `rowFields`). Unmeasured.

### 2.7 Core change for T1 (and T2)

Follow the `validateConstraints?` precedent: an optional adapter member, and core branches on `adapter.journal === undefined`.

```ts
// packages/core/src/storage/StorageAdapter.ts, after :29
readonly journal?: {
  /** Ledger rows asserted or retracted at these positions, excluding entity_type "_Transaction". */
  readonly rowsAtPositions: (positions: readonly number[]) => Effect<readonly TripleRow[], ReadError>;
  /** Distinct positions, newest first, at which any row of the entity was asserted or retracted. */
  readonly positionsForEntity: (
    entityId: string,
    range: { readonly atMost: number; readonly before?: number; readonly limit: number },
  ) => Effect<readonly number[], ReadError>;
};
```

Core edits (all gated):

- `TriplesLive.ts:513-517`: pass an "omit changes" flag into `metadataInputs` (`transactionMetadata.ts:29-57`) when `adapter.journal !== undefined`.
- `TriplesLive.ts:634-682` and `transactionMetadata.ts:105-165`: build `changes` from `rowsAtPositions` using the same `rowToTriple` and `transactionChangeFromTriple`, so record construction has one code path. `rowToTriple` is private at `TriplesLive.ts:79-135` and must move to a shared module.
- `entityTransactionHistory.ts:50-57`: use `positionsForEntity` instead of the Datalog query when present.
- `KvTriplesLive.ts`: unchanged.

T2 adds `stage(envelope)` and envelope reads, and gates cases 29 and 39.

---

## 3. Schema at the adapter (question 3)

### 3.1 How definitions exist at runtime

| Form | Where | What it holds |
|---|---|---|
| `Attribute.Definition` | `config/Attribute.ts:26-37, 93-131` | key (`:ns/name`), `TypeExpr`, node `Effect`, encoder |
| `Attribute.Use` | `Attribute.ts:39-52, 134-140` | `required`, `cardinality`, `unique` (widened to `boolean` / `"one" \| "many"`) |
| `EntityType` object | `config/EntityType.ts:41-61` (type), `:69-154` (`make`) | `entityType`, `schema: TypeExpr.Struct` keyed by attribute key, `attributes` handles keyed by TypeScript alias, `constraints`, lazy `node` Effect |
| Released node | `ConfigNode` kind `"entity-schema"`, key = entity type | `attrs.{entityType, type: Struct, attributes: {alias -> {attribute, required, cardinality, unique}}}` (`EntityType.ts:125-141`) plus `kind "attribute"` nodes with `attrs.{key, valueType}` |
| Descriptor compiled from a release | `packages/http/src/ConfigApi.ts:143-380` | `EntityDescriptor {entityType, attributes: {key, alias, type, required, cardinality, unique, storage}}`. It already maps `TypeExpr` to the stored family (`ConfigApi.ts:66-102`: text/date to string, int64 to integer, instant to datetime, ref, List/Struct to json) and cross-checks the Struct against the usage metadata (`:282-294, 310-320`). |
| Parsed schema only | `EntityValidation.parseDefinition` (`EntityValidation.ts:220-235`) | `{entityType, type: TypeExpr}` from `attrs` alone |

Aliases are not identity (ARCHITECTURE.md ontology paragraph, cited in R3 section 2.1). The Struct (`fields[key] = {type, optional, fallback}`, `List` wrapper for cardinality many) already carries keys, types, requiredness and cardinality. Only `unique` lives in the constraint children. A projection spec needs none of the aliases.

### 3.2 Options for giving the adapter a spec

| Option | How | Problem or benefit |
|---|---|---|
| A. Layer option from `EntityType` objects | `makeXtdbRuntime({url, projection: ProjectionSpec.fromEntityTypes([...])})`, flowing into `makeXtdbStorageAdapter(client, scope, {projection})` at `xtdb/src/index.ts:46` | No cycle. Spec is pure data, known at process start, and its content id is computed without I/O. Can drift from the live release. |
| B. Live `ConfigStore` release | adapter reads `resolveRef("live")` | **Circular.** `ConfigStore.layer` requires `Triples` (`ConfigStore.ts:495`), and `Triples` requires the adapter (`Runtime.ts:113-116`). The release commit is itself a transaction through the same adapter, so the very first write has no spec yet. A per-transaction release read costs a Datalog-free scan of config facts. A mutable registry swapped on `setRef` would work but adds ordering hazards. |
| C. Both | A is authoritative for the adapter. At startup and on `setRef`, compute `ProjectionSpec.fromRelease(snapshot)` and compare content ids with A. | Detects drift without feeding the adapter from the store. One extra check. |

**Recommendation: C, built on A.** Precisely: `ProjectionSpec.compile(definitions)` takes `{entityType, schema: Struct}[]`. `EntityType` objects supply `.entityType` and `.schema` directly. A release supplies the same pair via `parseDefinition`, or via the `ConfigApi.compile` descriptors once those live in core (section 5). Both paths hash the same canonical form, so equal content gives equal ids.

Content id inputs (proposal): per entity type sorted by name, per attribute sorted by key: `{key, TypeExpr.canonical(type), required, cardinality}`, hashed with `ContentId.hash("triplex/projection-spec", canonicalJson)`. Reuse `TypeExpr.id/canonical` (`TypeExpr.ts:201-206`) and `CanonicalJson.encodeOrThrow` (`content/CanonicalJson.ts:138`). Add the domain next to the others at `content/ContentId.ts:30-56`. Aliases, `unique` and the attribute-node cids are excluded on purpose, so renaming an alias never changes the id. Whether `unique` should affect the spec is a decision: it has no physical column effect in the first version.

### 3.3 Reserved types

The spec compiler must reject or skip `_Transaction` and `triplex.*` entity types and `:triplex/`, `:_tx/` attributes. `ConfigApi.compile` already refuses them (`ConfigApi.ts:170, 203`). Config and validation writes go through `transactSystem` (`ConfigStore.ts:426, 439, 451`) and carry `triplex.config-*` types, which the planner ignores.

### 3.4 Schema change, projection version, backfill

Releases are immutable snapshots; `live` is a ref moved by compare-and-retract (`ConfigStore.setRef`, `ConfigStore.ts:446`). A new release with a changed entity type yields a different spec id. `InMemoryConfigStore.changesBetween(store, from, to)` (`InMemoryConfigStore.ts:473-525`) gives `ObjectAdded/Removed/Changed` by `(kind, key)`, and `TypeSubsumption.subsumes(from, to)` (`TypeSubsumption.ts:279`) returns `Identical | Widens | Narrows` per type.

| Change | Spec effect | Backfill |
|---|---|---|
| Alias rename, constraint-only change | same id | none |
| New optional attribute | new column | needed only if the ledger already holds facts under that key (facts are schema-less), found by a ledger scan on that attribute |
| Attribute removed | column ignored or dropped | none (ledger keeps facts) |
| `Identical` or `Widens` type change | column kept or widened | none or recompute that column |
| `Narrows` or storage family change | new physical column or table | rebuild affected types |
| New entity type | new table | scan `entity_type = X` |

Fences and procedure (proposal):

1. **Spec fence.** The projection meta row stores `spec_id` and `projection_position`. Every `persist` adds one ASSERT that `spec_id` equals the writer's spec id, so a writer with a stale spec fails closed (typed error) instead of corrupting the projection during a rolling deploy.
2. **Rebuild.** At startup, if the stored `spec_id` differs, build shadow tables at position `P0`: scan the ledger by entity type, write rows. Catch up using the ledger itself, because entities changed since `P0` are `SELECT DISTINCT entity_id ... WHERE recorded_position > P0 OR retracted_position > P0`. No journal is needed. Switch `spec_id` in a single engine transaction guarded by `ASSERT tx_meta.position = P_head`. Retry catch-up on assertion failure.
3. **Dual write** (alternative to catch-up): the option accepts `{active, building}` and writes both while rebuilding. Simpler to reason about, costs double write.
4. Both need a typed admin entry point; both are adapter-package code, not core.

---

## 4. Read path (question 4)

### 4.1 Which API reaches which adapter call

| Public API | Core path | Adapter or executor call | Can a projection serve it unchanged? |
|---|---|---|---|
| `entity(id, basis)` | `TriplesLive.ts:571-576` | `getByEntity` | **No.** Returns `Triple[]` with per-fact id, `recordedAt`, `validFrom`, `validTo`, `createdBy`, `txId`, `retractedAt` (`rowToTriple` `:79-135`). A projection holds values only. |
| `entities(ids, basis)` | `:578-583` | `getByEntities` | No, same reason. |
| `entityPage(request)` | `:585-619` | `query({entityType}, basis)` for ids, then `getByEntities` | Bodies no. The **id discovery** step (`:606-610`) reads every fact of the type, then dedupes, sorts and slices. A projection could serve the id list at the current basis if rows were valid (section 4.2). Optional later optimization. Not exercised by the 44 cases (zero uses in `testkit/src/index.ts`). |
| `match(pattern, basis)` | `:621-626` | `query` | No (`Triple[]`). |
| `history(id)` | `:628-632` | `history` | No (needs retracted facts). |
| Datalog `query/queryPage/queryAll/explain` | `:688-761` | `QueryExecutor.execute` (`storage/QueryExecutor.ts:115-166`) | No. Must stay on the ledger compilers. |
| Journal reads | `:634-682` | `query({entityType:"_Transaction"})` | Section 2. |
| `currentPosition`, `dependencyState` | `:780-786` | `currentCommitPosition`, `dependencyState` | Ledger only. |
| Entity snapshots | `SnapshotService` (SQL tables) | `rawQuery` | Not available on XTDB or QLever (`SnapshotServiceLive.ts:75, 261`). |
| Native queries | `makeXtdbNativeQueries(client, scope)` separate from `Runtime` (`native/NativeQueries.ts:35-192`) | read `tx_meta` cut, run caller SQL or XTQL over `facts()` (`native/Sources.ts:44-118`) | The projection can appear as a new native relation guarded by the row window rules. That is the native lane's work. |

**Conclusion.** No existing `Triples` read can switch to a projection without changing what it returns. The projection serves only new surfaces: `Repository.get/find/count` returning typed documents, and native relations. That is why the 44 cases cannot see it.

### 4.2 When a projection row answers a current-basis read

The repository's "current basis" is `recordedAt` omitted (latest), `recordedPosition` = head, `validAt` = clock now (`Temporal.ts:44-61`; `EntityPage.ts:119-130`).

```
Entity read:  use the row iff
   cut is the head:        projection_position == currentPosition
   AND time in window:     row._asof <= validAt AND (row._until IS NULL OR validAt < row._until)
   AND row._shape_ok
 otherwise fall back to Triples.entity(id, basis) + the same decoder.

Set read (find/count/page ids): use the table iff
   cut is the head AND no row of the type has _until <= validAt
 (one LIMIT 1 probe). Otherwise fall back to the ledger path.
```

Rows whose window has passed ("stale") are re-projected by a temporal refresh that recomputes entities with `_until <= now` from the ledger, in an engine transaction guarded by `ASSERT tx_meta.position = P`. This is a projection-only write, not a Triplex transaction. It is not needed for correctness (the fallback covers it) and is a follow-up for performance. Models with future-dated facts (start dates) will hit the fallback until it exists.

Clock caution: tests with a deterministic clock (`Runtime.ts:68-82`) can read at a `now` earlier than `_asof`. The rule above falls back in that case.

Ordering caution: `entityPage` orders ids with JavaScript's default `sort()` (`TriplesLive.ts:608`), which is UTF-16 code-unit order. A projection ordered by the engine may differ for ids with characters above the BMP. Add a parity test before the repository paginates from a projection.

---

## 5. Repository placement (question 5)

### 5.1 Where

A new core subpath, as R3 section 1.3 D4 recommends, for example `@triplex-build/triplex/entity`.

- Add to `packages/core/package.json` `exports` (`exports` starts at `package.json:34`; `./operational` is the closest template).
- `tsdown.config.ts` builds `src/**/*.ts` unbundled, so new files under `src/entity/` are picked up with no config change.
- `vitest.workspace-aliases.ts` derives aliases from `exports`, so tests resolve the subpath to `src/` with no change.
- `packages/http` already depends on core (`packages/http/package.json` dependencies). `packages/dashboard` depends on core, postgres and sqlite, not http (`packages/dashboard/package.json`), so a core subpath is the only shared home for both.

### 5.2 What to reuse instead of rewriting

| Existing code | Location | Reuse |
|---|---|---|
| Release to descriptor compile, including the stored-family mapping, duplicate and reserved checks, schema-versus-usage cross-check | `packages/http/src/ConfigApi.ts:143-380` | Move to `./entity` as `compileDescriptors(snapshot)`. This is also the best input for `ProjectionSpec`. |
| Facts to typed document, with membership check, mixed-type rejection, decode through `TypeSchema.compile`, cardinality-one violation, missing-required | `packages/http/src/EntityCodec.ts:154-234` (`decodeStoredValue`, `encodeEntity`) | Move. It is the decode the repository's ledger path and the projection fallback must share, so both paths return the same documents and the same shape errors. |
| Input to ops (normalization, closed schema, distinct sorted values) | `EntityCodec.ts:59-152` | Move for the Writer. |
| Effect schemas per entity (`attributesSchema`, `outputSchema`) | `EntityCodec.ts:47-69` | Keep in http or move; core needs only decode. |
| Create, replace, delete as `TransactOp[]` with `EntityState` preconditions and `enforce` from the pinned release | `packages/http/src/EntityStore.ts:100-247` | Template for the Writer (`create` = `assertOperations`, `replace` = retract live facts plus assert, preconditions from `triples.entity`). |
| List through `entityPage` plus decode | `EntityStore.ts:127-152` | The repository's `find` fallback is exactly this. |
| Value to stored-family mapping | `ConfigApi.ts:66-102`; `TypeSchema.compile/normalize` (`TypeSchema.ts:162-185`) | Reuse. |
| Facts to attribute map and content id | `snapshots/canonical.ts` | Use for `_state_cid`. |
| Whole-entity materialization for validation | `EntityValidation.materialize` (`:263-294`) | Different job (lenient, for hashing). Do not use for the repository. |

Extraction detail: `EntityCodec` throws `DataShapeConflictError` and `RequestValidationError`, which are HTTP-API error classes with a `code` field (`packages/http/src/Errors.ts:1-68`). In core define neutral errors (`EntityShapeError {entityId, path, message}`, `EntityInputError {path, message}`) and have `packages/http` map them to its error classes. The two http tests (`packages/http/test/config-api.test.ts`, `integer-codec.test.ts`) guard behavior during the move.

### 5.3 Type-level prerequisite

R3 section 5.1: `Attribute.use` and `EntityType` handles widen `required` and `cardinality` (`Attribute.ts:46-52, 134-140`; `EntityType.ts:24-40`), and `Attribute.ref` forgets its target (`Attribute.ts:121-131`). The typed `Doc`, `Include` and `Input` types need them preserved. This is compile-time only, but it touches types used across 300-entity catalogs, so it must pass `pnpm --filter @triplex-build/triplex bench:config:typecheck` (`packages/core/package.json` scripts, `bench/config/typecheck-budget.mjs`).

### 5.4 Reading the projection from the repository

Engine-neutral first: repository over `Triples` plus the shared decoder. For projection reads, follow the existing precedent for engine-specific read factories that sit beside the runtime and take `(client, scope)`: `makeXtdbNativeQueries` (`xtdb/src/index.ts:90`) and `makeXtdbMaintainedQueries` (`index.ts:84`). A `makeXtdbProjectionReader(client, scope, spec)` plugs into the repository as an optional argument. This needs no change to `Runtime.define`. One consequence: the runtime's `Connection` is private to `makeXtdbRuntime` (`xtdb/src/index.ts:24`), so the reader opens its own client with the same URL and scope, as native queries do today.

---

## 6. Conformance impact (question 6)

The 44 cases are `triplesConformanceCases` (`packages/testkit/src/index.ts:82-2863`). They run serially against one runtime and one scope (`makeTriplesConformanceSuite`, `:2865-2867`), through `runtimeConformance(runtime, {scope, capabilities})` (`:2869-2898`). Drivers: `packages/xtdb/test/conformance.test.ts:9-30` (240 s budget), `packages/qualification/test/runtime-conformance.test.ts:15-34`, KV oracle `packages/testkit/test/fixtures.test.ts:24-32`. All pass `Capabilities.none` and build the runtime with no projection or journal option.

### 6.1 Projection

- Every case uses the `Triples` API only (verified by reading the cases that touch entity types, reads and journal; no case reads engine tables).
- No `Triples` read is served from the projection (section 4.1), so no result can change.
- A runtime with **no spec** must produce byte-identical statements to today. Pin with R4's mock-client traces (`R4-test-outputs/xtdb-statement-trace.mts`, `qlever-triple-count.mts`).
- A runtime **with** a spec that lists the conformance entity types (`Person`, `Robot`, `HistorySubject`, `ConfUser`, `ConfMembership`, `ConfGroup`, `TransactionPerson`, `TransactionRobot`, `Widget`, `ConfConstraintPerson`, `ConfConstraintEmployer`) must still pass all 44. What it can change is timing and conflicts, not results. Watch these cases:
  - 30 "conditional transactions..." (two concurrent command claims, `:1859-1889`)
  - 32 "graph constraints reject..." (position must not move on rejection, `:2036-2060`; one concurrent claimant, `:2144-2182`)
  - 36 "consumer checkpoints..." (concurrent advance, `:2441-2464`)
  - the whole-suite 240 s budget (`xtdb/test/conformance.test.ts:30`)
  The conformance data also writes attributes such as `:age` and `:name` with no declared types on those entity types, which exercises the `_shape_ok` rule in section 1.6.

### 6.2 Journal, by case (numbers are the order in `triplesConformanceCases`)

| # | Case | Line | Observes | T1 | T2 |
|---|---|---|---|---|---|
| 29 | transact records provenance datoms | `:1728` | `_Transaction` facts `:_tx/instant`, `:_tx/actor` | pass | **fails** |
| 39 | transaction journals cannot be retracted through ordinary writes | `:2612` | `_Transaction` facts; reserved error on `retractByPattern({entityType:"_Transaction"})` | pass | **fails** unless pattern-level reserved check added |
| 30 | conditional transactions are atomic and journal their changes | `:1757` | `transaction`, `transactionByCommand`, `transactions`; asserts old value, `recordedAt`, `retractedAt`, `retractionTxId`, `validFrom`, `assertionTxId`, `changes.length === 2` (`:1809-1895`) | must stay identical (derived changes) | same |
| 31 | entity transaction history... | `:1898` | `transactionsForEntity` pages, `snapshotPosition`, `nextBeforePosition`, full causal envelope, dedupe of multi-change commits (`:1950-2014`) | must stay identical | same |
| 32 | graph constraints reject... | `:2018` | `transaction(seeded.txId).configSnapshot` (`:2105-2109`), position unchanged on rejection | identical | identical |
| 34 | derivation materialization uses indexed dependency freshness | `:2248` | `Materialization` calls `transaction()` (`Materialization.ts:389`) and `transactions()` for dynamic dependencies | identical | identical |
| 36 | consumer checkpoints... | `:2393` | `transactions({after})` must return exactly 2 (checkpoint writes are unjournaled, `:2467-2481`) | identical | identical (envelope-only means unjournaled stay absent) |

Cases that touch positions but not the journal (33 dependency state, 35 graph constraints agree) do not change.

### 6.3 What must stay byte-identical

1. Statement text sent to XTDB and SPARQL text sent to QLever when no projection or journal option is set.
2. `tx_assertions` rows (or QLever assertion triples) for data writes, under every option. Projection and journal options add or omit only journal rows and projection objects.
3. `tx_meta`, `tx_claims`, `tx_attempts` content.
4. `TransactionResult` (`Triples.ts:57-63`).
5. `TransactionRecord` JSON for the same transaction under T1 versus T0. Known exceptions to decide: change order and `-0` (section 2.6).
6. KV oracle path: `KvTriplesLive.ts` untouched.
7. Error types and messages for reserved writes (`systemNamespace.ts:64-87`).
8. Other runtimes (sqlite, postgres, cloudflare, duckdb) keep the legacy journal because they define no `journal`.

### 6.4 New tests I would add (none exist today)

- **Journal equivalence.** Randomized transactions (all eight value types, interleaved retract and assert, `retract-pattern`, assert-then-retract in one transaction, `validTo`, `-0`, unjournaled system writes) run on the KV oracle and the adapter, then compare `transaction`, `transactions`, `transactionsForEntity`, `transactionByCommand` outputs deeply. Put it in `packages/testkit` as an additional case group, not inside the 44.
- **Projection oracle.** `planProjection` applied to KV facts must equal the engine's projection rows for random histories, including valid-time boundaries.
- **Statement trace.** Pin no-option output as in 6.3 item 1.
- **Ordering parity** for `find` pagination versus `entityPage` (section 4.2).

---

## 7. Minimal core change surface

### 7.1 Table

Risk column is risk to the shared 44-case suite. "Live" means a running engine is required to test.

| # | Change | Files | Risk to the 44 | Live engine |
|---|---|---|---|---|
| 1 | Add `Domain.projectionSpec = "triplex/projection-spec"` | `packages/core/src/content/ContentId.ts:30-56` | none (additive) | no |
| 2 | New `./entity` subpath: `ProjectionSpec` (compile from `EntityType[]` or descriptors, canonical form, content id, `fromRelease`), pure `planProjection(spec, facts, {instant, position})` (membership, typed row, shape flag, `_asof/_until`, deletes), `_state_cid` | new `packages/core/src/entity/*.ts`; `packages/core/package.json` exports | none (nothing imports it from `TriplesLive`) | no (test against KV facts) |
| 3 | Move `rowToTriple` to a shared module; export `isReservedEntityType`, `isReservedEntityId`, and the row-to-value helper through `runtime/index.ts` | `store/TriplesLive.ts:79-135`, `store/systemNamespace.ts:50-56`, `runtime/index.ts` | none if behavior-preserving; run core tests plus KV conformance | no |
| 4 | XTDB: `projection` option, DDL in `initialize` (`:622-652`), plan step before `persist` (`:402-406`), extra statements before `tx_meta` insert (`:246`), spec fence ASSERT, projection meta row | `xtdb/src/index.ts:14-22, 46`, `XtdbStorageAdapter.ts`, new `Projection.ts` | none when option unset (statement trace) | **yes** |
| 5 | QLever: same hook at `:342-344` and `:194-215`; no DDL | `qlever/src/index.ts`, `QleverStorageAdapter.ts` | none when unset; engine-fault atomicity caveat when set | **yes** |
| 6 | Extract descriptors and codec from http into `./entity`; http re-exports and maps errors | `http/src/ConfigApi.ts`, `EntityCodec.ts`, `Errors.ts`; new core files | none to the 44; http tests guard | no |
| 7 | Repository (`get`, `getMany`, `find`, `count`, `timeline`, `at`) and Writer over `Triples` using the shared decoder and `EntityStore`'s op builders | new `packages/core/src/entity/Repository.ts` | none | no (KV) |
| 8 | Engine projection readers (`makeXtdbProjectionReader`, QLever twin) and fallback rules from section 4.2 | new files in xtdb and qlever | none | **yes** |
| 9 | Literal-preserving `Attribute.use`, `EntityType` handles, `Attribute.ref` target | `config/Attribute.ts`, `config/EntityType.ts` | none at runtime; must pass `bench:config:typecheck` and `pnpm typecheck` | no |
| 10 (optional) | Slim journal: optional `journal?` adapter member; gated edits in `TriplesLive` and `transactionMetadata`; adapter implementations; docs | `StorageAdapter.ts`, `TriplesLive.ts:513-517, 634-682`, `transactionMetadata.ts`, `entityTransactionHistory.ts`, both adapters, `docs/operational-primitives.md` | **moderate**: touches `transact`; cases 30, 31, 32, 34, 36 exercise the derived changes | **yes** |
| 11 (optional) | Native journal (T2): envelope table, `stage`, pattern-level reserved check, gate cases 29 and 39 | as 10 plus `testkit/src/index.ts:1728, 2612` | **breaks 2 cases** unless gated | **yes** |

### 7.2 Landing order

```
 1 -> 2 -> 3 ---------------------------> 4 -> 5 -> 8
              \                              ^
               \-> 6 -> 7 (KV only) ---------'      9 (independent, any time before 7 ships typed API)
                                                    10 -> 11 (separate track, lands last)
```

1. Items 1, 2, 3 first. They are additive or behavior-preserving, run fully offline, and give a pure planner that can be tested against the KV oracle before any engine work. Gate: `pnpm --filter @triplex-build/triplex test` and `pnpm --filter @triplex-build/triplex-testkit test`.
2. Items 6 and 7 next, in parallel with 4 and 5. They need no engine. Gate: http tests, then repository tests on `KvTriples.layer`.
3. Items 4 and 5 once the planner passes its oracle tests. Gate: no-option statement trace, then `XTDB_INTEGRATION=1` unchanged-44, then the same with a spec.
4. Item 8 after 4 and 5.
5. Item 9 whenever the typed repository API is ready to ship. It is independent of the engines.
6. Items 10 and 11 last and separately. They are the only items that edit `TriplesLive.transact`'s neighbors and the only ones with real conformance exposure. Item 10 alone is enough for the size goal.

### 7.3 What does not need to change

- `TriplesLive.transact` body, `StorageAdapterService` (for projection), `Runtime.define`, `Capabilities`, `KvTriplesLive`, `packages/testkit` cases.
- Datalog compilers and `QueryExecutor`.
- ConfigStore and the release format (the spec derives from existing nodes).

---

## 8. Decisions for Sam

| # | Decision | Recommendation | Why it needs a ruling |
|---|---|---|---|
| D1 | Journal tier | T1 slim now, T2 only if the remaining O(1) envelope facts matter | T2 changes a documented public behavior (`_Transaction` facts queryable in Datalog) and fails two shared cases. T1 changes only two attributes. |
| D2 | Order of `changes[]` in derived records | Canonical order unless byte-identical records are required | Exact order needs a stored order string per transaction. |
| D3 | Projection planner failure policy | Data problems set `_shape_ok = false` and never fail the ledger write. Engine statement failures fail the whole transaction. | A projection bug can then block ledger writes. The alternative (skip projection on error) breaks "same atomic step". |
| D4 | Does `unique` participate in the spec id | No for the first version | No physical column effect yet. |
| D5 | Subpath name | `@triplex-build/triplex/entity` | Public API name. |

---

## 9. Not verified

1. No engine ran. All hook and statement claims come from reading source and R4's recorded traces.
2. Whether XTDB 2.2 lets a later statement in one transaction see an earlier INSERT (would allow `INSERT ... SELECT` to compute wide rows in-engine and skip the extra read). Unverified; the plan above does not depend on it.
3. Read cost of position-filtered scans for the derived journal on XTDB and QLever.
4. Whether any test asserts `-0` inside a journal change.
5. QLever partial-apply behavior when ledger and projection triples share one failing UPDATE (R4 section 4.3 records the engine-level caveat).
6. Ordering parity between engine sort and `Array.prototype.sort` for non-BMP entity ids.
7. T2 envelope size (`~8` triples) is an estimate, not a measurement.

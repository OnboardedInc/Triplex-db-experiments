# R15. Presence, deletion and cascade policy options for Triplex

Status: research brief, 2026-11-07, written for RULINGS Q9 (`lab/acceptance/RULINGS.md`). It gives the orchestrator a provisional ruling and gives Sam a decision list. Sam makes the final call.

Method: read the repo files named in section 10, fetched the prior-art pages in section 11, and read code. Nothing was executed (no containers, no tests, no repo source changed). Numbers marked "estimate" are arithmetic on measured figures from R1, R7, R8, not new measurements.

Read first: section 0 (3 minutes). Read before ruling: sections 6 and 7 (5 minutes). Everything else is reference.

---

## 0. Skim layer

**Recommendation.** Adopt Option C (explicit presence, valid-time deletion, per-reference actions), delivered in two stages so the loop can start now.

| | Option A | Option B | Option C (recommended) |
| --- | --- | --- | --- |
| Name | Retraction only | Valid-time deletion on derived presence | Explicit presence with valid-time deletion |
| Presence | derived from any visible typed fact (today) | derived (today) | opt-in per EntityType through a designated boolean carrier fact; derived for types without one |
| "Delete" means | retract the facts visible now (today's REST DELETE) | end valid time from `from` (default now) to `to` (default forever) by clipping | same as B, plus the carrier is clipped |
| Interval-local deletion | refused with a typed error | supported | supported |
| Reference actions | restrict, detach, cascade per reference use | same | same |
| Closes `G9.presence.explicit` non-vacuously | no | no | yes |
| Extra stored facts | 0 | 0 | +1 per entity (+10% of the 100m domain facts at the representative profile) |

**Why C.** It is the only option where the presence obligation has content. Under A and B an entity exists whenever any fact is visible, so toggling `:capacity/present` changes nothing Triplex defines, and closing the obligation would amount to "no presence policy", which ACCEPTANCE B16 forbids. C also matches the imported managed-presence contract (empty records can be present, deletion clips attributes, coverage is by presence union) and PostgreSQL's temporal foreign keys (coverage by union).

**Why staged.** A is a subset of B, and B is a subset of C. Stage 1 builds the shared planner, which is Option B, and starts immediately. Stage 2 adds the presence designation, which turns B into C. Nothing built for A or B is discarded if Sam picks a smaller option.

**Sam must confirm now (4).** Detail and recommended answers are in section 7.

1. Explicit presence for typed entities, opt-in per EntityType (C), at +1 fact per entity.
2. "Delete" defaults to ending valid time from now; today's recorded retraction stays as the REST DELETE contract.
3. A reference use with no declared action defaults to `restrict` (final-state), not Datomic's silent detach.
4. `cascade` means any-parent (SQL semantics) and only on cardinality-one references; "delete when last owner goes" is deferred.

**Defaults the orchestrator can rule on (5).** Clip facts rather than hide them behind presence; atomic refusal at 500 planned operations; physical erasure deferred with crypto-shredding as the stated host-level path; REST DELETE unchanged including its quirks; no new journal change kind.

**Three findings that matter regardless of option.**

1. Today's reference enforcement loads every live row of each source and target type on every enforced command (`packages/core/src/Constraint.ts` `loadRelevantFacts`, `packages/xtdb/src/ConstraintValidation.ts`). It cannot sit on the write path at 10m entities. Restrict at scale needs a touch-set check.
2. No transact operation ends valid time (`TransactOp` is assert, retract, retract-pattern). Valid-time deletion is therefore retract plus re-asserted remnants with new assertion ids.
3. REST DELETE and PUT may fail with `TransactionConflictError` for an entity that has a live but expired fact (section 1, row 5). Unrun, from reading code. It needs a test before the delete contract case set is frozen.

---

## 1. What exists today

| # | Topic | Current behavior | Source |
| --- | --- | --- | --- |
| 1 | Presence | There is no presence concept. An entity exists at a basis when at least one visible fact carries its entity type. REST GET/PUT/DELETE return not found when the visible set is empty or lacks the type. | `packages/http/src/EntityStore.ts:73-74,169,202,233` |
| 2 | Type membership | `entityType` is metadata on every assertion row, not a fact. Mixed membership is rejected by REST and marked partial by the projection planner. The planner defines a type membership as "valid-time intervals during which a live fact tags the entity with this type". | `Triple.ts` (`TransactAssertOp.entityType`); branch `exp/R01-entity-core`, `packages/core/src/entity/Plan.ts` `TypeMembershipPlan`; `lab/experiments/EXP-R01-entity-core/REPORT.md` |
| 3 | Reference check | `ReferenceTarget` accepts a ref when any visible fact has `entityId = value` and the target entity type. It is checked only when the host passes rules in `meta.enforce`, at every valid-time boundary of the post-state, rejecting new or worsened violations. Deleting the last typed fact of a referenced target is therefore an implicit restrict, but only with enforcement on. | `packages/core/src/Constraint.ts` `evaluateFacts`, `newlyViolated`; `docs/configuration.md` "Atomic graph constraints" |
| 4 | Ending valid time | No operation ends valid time. `TransactOp` is `assert`, `retract`, `retract-pattern`. A retraction ends recorded visibility only. `retract-pattern` matches every live-recorded row regardless of valid time. | `packages/core/src/Triple.ts:124-128`; `TriplesLive.ts` `retract-pattern` case; `docs/concepts.md` |
| 5 | REST DELETE | Reads `triples.entity(id)` (visible at valid-now), rejects the entity when a live fact has `validFrom > now`, then retracts those ids with an `EntityState` precondition. History is retained. No incoming references are traversed. Quirk: facts that are live but expired (`validTo <= now`) are not retracted, and an active fact `[10, forever)` loses its past `[10, now)`. Candidate defect (unrun): `EntityState` compares against `getByEntity` with no basis, which returns every live row regardless of valid time (`SqliteAdapter.ts:502-545` `temporalConditions`), so an expired live fact makes the observed set differ and should raise `TransactionConflictError`. | `EntityStore.ts:108-122,219-243`; `TriplesLive.ts:330-346`; `docs/http-api.md` |
| 6 | Enforcement cost | `loadRelevantFacts` queries every live row of each source type and each target type, then projects the command over them. The XTDB pushdown builds `before_graph` from all rows of source subjects and target types. Cost is proportional to type size per enforced command. Not measured; read from code. | `Constraint.ts` `loadRelevantFacts`; `TriplesLive.ts:380-395`; `packages/xtdb/src/ConstraintValidation.ts:40-80` |
| 7 | Journal | Every transact writes `:_tx/position`, `instant`, `actor`, `command-id`, `correlation-id`, `causation-id`, `config-snapshot`, one `:_tx/changed-entity` per touched entity and one `:_tx/change` JSON fact per asserted or retracted fact. `TransactionChange.op` is `assert` or `retract` only. C6 freezes this shape. | `docs/operational-primitives.md`; `store/Triples.ts` `TransactionChange`; `lab/PLAN.md` C6 |
| 8 | Reserved names | Attributes starting `:triplex/` or `:_tx/`, entity ids starting `_triplex/` and types `_Transaction` or `triplex.*` reject writes unless system-authorized. | `packages/core/src/store/systemNamespace.ts` |
| 9 | Fixture convention | `:capacity/present` (boolean, required) and `:capacity/type-version` (integer) are ordinary application facts. Presence off/on is retract plus assert on one entity per 1000. The type-version correction hits one entity per 100. "Triplex does not automatically generate presence, cascade domain retractions or enforce these fixture conventions." | `qualification/capacity/configured-entities-v1/CONTRACT.md`; `packages/qualification/experiments/configured-entities-v1/recipe.mjs` |
| 10 | Three "versions" | (a) `Triple.schemaVersion`, the codec version (the XTDB adapter writes the constant 1). (b) `meta.configSnapshot`, the config release that governed a transaction. (c) the application `:capacity/type-version` fact. They are unrelated. | `XtdbStorageAdapter.ts` insert; `docs/configuration-versioning.md` section 5; R6 section 3.1 |
| 11 | Imported managed presence | Opt-in per type, immutable once declared. Empty records can be present. Latest PUT replaces the presence set, later PATCH intervals add. Coverage design: the source interval must fit the union of target presence at the same cut, evaluated on the final overlay with same-batch forward references, unknown presence never covers. Deletion clips presence, attributes and outgoing references. Cycles are legal and do not seed deletion. The built DuckDB version has no restriction or cascade path. | `vendor/duckdb-temporal/runtime/NATIVE-TEMPORAL-REFERENCES-DESIGN.md`; `RESEARCH-SYNTHESIS.md` "Goals 1, 9 and 10" |
| 12 | QLever write limits | Updates use only `INSERT DATA` and `DELETE DATA` with literal terms (upstream #3172 breaks rebuilds otherwise). Log frames hold pure ADD/DEL quad sets with no read-dependent logic. A cascade must therefore be resolved to concrete quads in TypeScript before the frame is written. | `lab/research/R8-qlever-write-lifecycle.md` risk 2; `R13-log-of-record.md` `COMMIT_GROUP` |
| 13 | XTDB DML limits | SQL over pgwire has `DELETE ... FOR PORTION OF VALID_TIME`, `PATCH`, `ERASE`. XTQL transaction operations exist only in JVM clients. Only `_id` is indexed; other predicates scan at about 0.27 s per million rows. Slices are never coalesced. At most 32,767 parameters per statement. | `lab/research/R1-xtdb-capabilities.md` Q2, Q7 |
| 14 | XTDB reverse references | R7 measured paged posting documents keyed by target id: 2 to 5 ms for ordinary values, 395 to 457 ms for a 1,000,000-posting value, 9 to 49 ms per update. This is the proposed shape for reverse references (H-X-ID, still a hypothesis). | `lab/research/R7-xtdb-indexing-ingest.md` "Scope extension 1 and 2" |
| 15 | Acceptance state | `G9.presence.explicit`, `G9.deletion.entity`, `G9.cascade.restrict-detach-cascade` are `policy-pending` and cannot close until a policy is frozen (B16). | `lab/acceptance/ACCEPTANCE.md:1089-1120,312` |

---

## 2. Prior art

| System | Mechanism | Triplex takes | Triplex does not take |
| --- | --- | --- | --- |
| Datomic `:db/retractEntity` [W1] | Retracts the entity's own datoms, every datom where it appears as a value (inbound references), and component entities recursively. `:db/isComponent` marks a reference attribute whose target is owned by the parent [W3]. An entity exists when it has datoms (general knowledge, not re-verified here). | Whole-entity retraction as one verb. Inbound detach as an available action. | Silent inbound detach as the default. Parent-to-child cascade declared on the forward reference; Triplex stores edges on the child, so the policy sits on the child's reference use. |
| Datomic excision [W2] | `:db/excise` removes datoms from indexes and the log. It runs asynchronously at the next indexing job, is lossy (cannot tell whether a datom existed), leaves an excision record, and also removes components and inbound references. The page advises against excising more than a few thousand datoms at a time on a live system and says it is not for correcting errors. | Excision as a separate administrative act with its own record, not part of ordinary commands. Small-batch limit. | Asynchronous background removal inside the commit path. |
| XTDB 2 `DELETE` [W4] | Valid-time delete. Default range is now to end of time (deliberately differs from SQL:2011, which deletes all valid time). `FOR PORTION OF VALID_TIME FROM a TO b` limits it. `FOR ALL VALID_TIME` removes everything. History stays queryable. | Same default range and same portion syntax for `deleteEntity`. This is also what the XTDB projection writer will run. | None. |
| XTDB 2 `ERASE` [W4] | Removes documents for all valid time and all system time, so earlier system-time queries no longer return them. Documented for GDPR. XTDB 2 documents `ASSERT` for invariants and no foreign keys [W13]. | `ERASE` as the engine mechanism behind a future erasure primitive. Triplex owns referential actions itself. | Using `ERASE` in any ordinary command. |
| XTDB 1 `delete` and `evict` [W5] | `evict` removes a document entirely, historical versions disappear, it is the only operation that changes answers at earlier transaction times, and it is documented for GDPR erasure. | Three-level vocabulary: retract, delete, evict. | None. |
| SQL referential actions (PostgreSQL) [W6] | Per foreign key on the referencing side: `NO ACTION` (default, checkable at end of statement or deferred), `RESTRICT` (immediate, never deferred), `CASCADE`, `SET NULL`, `SET DEFAULT`. Guidance: cascade for components, restrict or no action for independent objects, set null for optional links. Referencing columns are not indexed automatically. | Action declared on the referencing side. Final-state check as the default. Index (or equivalent) on referencing columns. `detach` is Triplex's `SET NULL`. | Immediate `RESTRICT` (a Triplex command is already one atomic batch). `SET DEFAULT`. |
| SQL temporal foreign keys (PostgreSQL) [W7] | `FOREIGN KEY (k, PERIOD p) REFERENCES t (k, PERIOD p)` is satisfied when the union of matching referenced periods covers the referencing period. The page marks `RESTRICT`, `CASCADE`, `SET NULL` and `SET DEFAULT` as unsupported for temporal keys, so only `NO ACTION` remains (inference from the per-action notes). | Coverage by union of presence intervals. Evidence that restrict is the well-defined temporal action. | Nothing to borrow for interval-local detach or cascade. Triplex's definition is original and needs the independent oracle. |
| RDF and SPARQL Update [W8] | `DELETE DATA`, `DELETE WHERE`, `DELETE/INSERT` (WHERE is evaluated once, before the delete part). The specification defines no entity-level deletion and no referential integrity. The usual pattern is two deletes, `<e> ?p ?o` and `?s ?p <e>`, which equals Datomic's retractEntity. | The two-sided pattern as the shape of a plan. | Server-side `DELETE WHERE` (forbidden on QLever by R8). |
| EventStoreDB (Kurrent) [W9] | Soft delete hides the stream, allows recreation by append, and removes events at the next scavenge. Hard delete appends a `$streamDeleted` tombstone, permanently blocks the stream, and the tombstone itself stays. | Soft versus hard maps to valid-time deletion (can be restarted) versus a permanent erased state. | Physical removal at an unscheduled maintenance pass as the legal mechanism. |
| Kafka compaction [W10] | A record with a key and null payload is a tombstone that deletes earlier records with that key. Tombstones are dropped after `delete.retention.ms` (default 24 h). Older values can remain until a cleaning pass runs; the lag bound is not a hard guarantee. | Tombstone as an explicit record. | Retention-timed tombstones. |
| Legal erasure (GDPR Art. 17) [W11] | Erase without undue delay on listed grounds. Exceptions include legal obligation, archiving in the public interest and legal claims. The controller must inform other controllers of public data. | Erasure is a requirement that conflicts with immutable audit logs and needs its own track. | Treating deletion by retraction as legal erasure. |
| Crypto-shredding [W12] | Encrypt sensitive attributes per subject, delete the key on a forget request. Only as strong as key management. Projections that hold decrypted copies are not covered. One cited reading says encrypted personal data is still personal data, so key deletion may not satisfy Art. 17 alone. | Host-level path available with no core change: store ciphertext values, hold keys outside Triplex. | Claiming it is legally sufficient. |

---

## 3. Design space

### 3.1 Vocabulary used in this document

- **Live fact.** Not retracted at the cut. **Visible fact.** Live at (R, P) and valid at V.
- **Edge.** A live reference-valued fact. **Source** is the entity that holds the reference. **Target** is the entity it points to.
- **Carrier.** The designated boolean attribute whose visible `true` value means "present" (Option C only).
- **Remnant.** A new assertion that keeps the part of a clipped fact outside the deletion interval. It has a new assertion id.
- **Cell.** A pair of an entity and a valid-time interval that a plan removes. The budget counts cells and operations.
- **Plan.** The deterministic list of transact operations a delete compiles to.
- **Floor.** `meta.enforce` rules evaluated inside the serialized commit. Enforcement stays the correctness backstop in every option.

### 3.2 Principles that hold in every option

1. **Policies compile to ordinary operations at write time. Reads never evaluate policy.** A deletion is retracts and asserts in the ledger from the moment it commits. This answers "historical schema binding" without new machinery: the command's `meta.configSnapshot` supplies the action policy, the receipt records that snapshot, and moving `live` later cannot reinterpret an old deletion (`docs/configuration-versioning.md` section 5 states the same for rollback).
2. **`Triples.*` low-level contracts do not change.** `history`, `match`, `entity`, `entities` keep the raw assertion-lifetime contract (`G9.history.raw-lifetime-compat`). Presence filtering exists only in the Repository, the native helpers and the projections.
3. **One command is one `transact`, one commit position.** A cascade is part of the command (`docs/agents.md` rule 1). The new Writer verbs plan outside the commit and verify inside it, because enforcement already runs inside the serialized commit and planning inside it would lengthen the global serialization point.
4. **The plan is a pure, deterministic function** of the pre-state, the pinned policy snapshot and explicit inputs: seed entity, `from`, `to`, budget, and the deletion instant resolved once by the Writer clock. Replaying it must reproduce the committed change list byte for byte, which is what the independent oracle checks.
5. **REST DELETE keeps its existing contract.** No traversal of incoming references. With enforcement on, an entity with incoming edges returns the existing constraint conflict.
6. **Nothing is physically removed by an ordinary command.** Erasure is a separate administrative act (section 5).
7. **Cascade is not a standing rule.** It acts on edges that exist when the command is planned. An edge asserted later to a deleted target is a new write and is checked by `restrict`.

### 3.3 Axis (a): where presence comes from

| Question | Derived (A, B, and C for types without a carrier) | Explicit carrier (C) |
| --- | --- | --- |
| Entity exists at a basis when | at least one visible fact carries the type | the carrier has one visible value and it is `true` |
| Empty record | impossible | possible (presence with no domain facts) |
| What ends presence | the last typed fact's interval ends or is retracted, so any correction can end presence by accident | clipping or retracting the carrier, always an explicit act |
| Gaps | presence is the union of all fact intervals, so a name valid `[10,20)` and a phone valid `[30,40)` make a gap `[20,30)` that nobody authored | gaps are authored: facts must lie inside carrier intervals |
| Stale writer after delete | any fact assertion revives the entity with that single attribute | a fact outside carrier intervals violates `Present`; with enforcement off it is hidden and flagged `orphan-facts` |
| Reference target check | any visible typed fact | carrier visible at every boundary the edge is valid |
| Type membership | the `entityType` tag on visible facts | the carrier's `entityType` tag; other facts must agree; mixed membership at one V stays an error; a type change over time is two carriers with disjoint intervals |
| Type-version interaction | none | none (see 3.3.1) |
| Conflicts (C5) | none | true and false visible together is a conflict (`ConflictingValuesError`); equal `true` supports are one value with several supports, so overlapping carrier assertions form a union |
| Storage | 0 | 1 fact per entity, one extra column in the XTDB type table (no extra row when its interval equals the other attributes'), one extra triple per entity in the QLever current graph |

**3.3.1 Type-version.** Presence is independent of all three version notions in row 10 of section 1. The presence mode (derived or carrier) is immutable per EntityType key across releases: a config commit that flips it for an existing type is rejected, as in the imported contract. Correcting the application `:capacity/type-version` fact never touches the carrier. The reader's release decides how attributes decode, not whether the entity exists. Which release governed a presence assertion is readable from that transaction's `configSnapshot`.

**3.3.2 Carrier value rule.** The Writer only ever writes `true`. A raw `false` is treated as not present, so toggling the fixture's `true -> false -> true` still reads correctly, but `Required` alone would accept a `false` carrier as "present for requiredness", so Option C adds a one-rule check (`Present`) that the visible carrier value is `true`.

### 3.4 Axis (b): what "delete" means

| Level | Question it answers | Mechanism | Reads before the command's recorded time | Reads after, in valid time before `from` | Reversible |
| --- | --- | --- | --- | --- | --- |
| Recorded retraction | "We should not have recorded this." | `retract` of live facts | unchanged | facts gone (partly, see REST quirk) | by re-asserting, with new ids |
| Valid-time deletion | "This stopped being true at `from`." | retract plus remnants clipped to end at `from` | unchanged | unchanged (remnants keep the past) | by asserting new facts from `from` |
| Physical erasure | "This must not be stored." | out-of-band administrative operation | gone | gone | no |

Interval-local deletion of `[a, b)` is the same clip applied in the middle.

```
valid time        0         40          60                 100
                  |         |           |                   |
fact F (open)     [==========================================...        before
delete [40, 60)               xxxxxxxxxxx
after             [=========)           [===================...        F retracted
                  F-left remnant         F-right remnant              2 new assertions
history           F (retractedAt = T), F-left (recordedAt = T), F-right (recordedAt = T)
```

A fact that ends at or before `a`, or starts at or after `b`, is untouched. A fact fully inside `[a, b)` is retracted with no remnant. A fact that overlaps one side gets one remnant. A fact that spans the interval gets two.

### 3.5 Axis (c): reference actions, direction and bounds

| Decision | Choice in all options | Reason |
| --- | --- | --- |
| Who owns the edge | The edge is stored on the source. The action is declared on the source's EntityType use of the reference attribute: `Attribute.use(PlacementWorker, { required: true, onTargetDelete: "cascade" })`. | `docs/agents.md` rule 1 says an entity type owns how it uses an attribute. SQL declares `ON DELETE` on the referencing side. |
| Actions | `restrict` (default), `detach`, `cascade`. | Required by `G9.cascade.restrict-detach-cascade`. |
| `restrict` timing | Final-state: reject only if the post-state of the whole command leaves an edge uncovered at some valid-time boundary. | A command is already one atomic batch, so this is SQL `NO ACTION` timing. It matches the imported synthesis ("begin with final-state rejection") and what `ReferenceTarget` does today. |
| `detach` | Clip the edge fact over the removed interval. The source stays. | Triplex's `SET NULL`: absence is the null. |
| `cascade` | The source is removed over (removed interval intersect edge interval). Recursive. | Intervals can only shrink or stay equal along a path, so propagation terminates. |
| Any-parent | A source with two cascade references is removed when either target is removed. | SQL semantics, no reference counting. "Last-owner" garbage-collection semantics are deferred. |
| Cycles | Legal. Each cell is removed once. A cycle never seeds a deletion by itself. | Imported synthesis; automatic under any-parent. |
| Incoherent combinations | `detach` on a `required` use, and `cascade` on a cardinality-many use, are rejected at config commit. | Detach would leave `Required` violated at the first boundary. Cascading on one member of a list would delete the whole source. |
| Default when undeclared | `restrict`. | Keeps today's enforcement result. Avoids Datomic's silent loss of inbound edges. |
| Omitted-when-default | The rule field is omitted from `ReferenceTargetRule` when it is `restrict`. | Existing constraint content ids are unchanged. |
| Bounds | A plan stops at the first overrun of `maxOps` (default 500) or `maxCells` (default 100) and fails with `CascadeBudgetExceededError`. Nothing is written, no position is consumed, the command id is not claimed. | 500 is the frozen maximum domain command width of the configured-entity recipe. The ceiling is the QLever preconstruction bound (C4.3), 10k to 50k triples per update per R8. |
| Deterministic order | Hop-major, then entity id (UTF-16 order, as `entityPage`), then cell start, then attribute, then assertion id. All retracts first, then all remnant asserts. | Receipt equality with the oracle. One assert flush in `transact`. |

Cascade example in the repo's own domain (`docs/concepts.md`):

```
placement:harbor --placement/worker [cascade]--> worker:maria <--certificate/worker [detach]-- certificate:maria
       ^                                              ^
       | timesheet/placement [cascade]                +--payroll/worker [restrict]-- payroll:p9
timesheet:w1
```

`deleteEntity(worker:maria, from = t)` plans in this order:

1. Cell (maria, `[t, forever)`). Clip every live maria fact overlapping it (Option C includes the carrier).
2. Incoming edges of maria, in deterministic order. `certificate:maria` is `detach`, so clip that edge. `placement:harbor` is `cascade`, so enqueue cell (placement:harbor, `[t, forever)` intersect edge interval). `payroll:p9` is `restrict`, so emit nothing.
3. Hop 2 repeats the loop on the placement cell. `timesheet:w1` is enqueued.
4. Apply the plan to the projected state. The floor check finds `payroll:p9` uncovered from `t`, so the whole command fails with `ConstraintViolationError` listing that edge. Nothing is written. The host can add `payroll:p9`'s edge to the command, then retry.

---

## 4. The three options in detail

### 4.1 Moving parts each option adds

| | New parts |
| --- | --- |
| A | Pure planner module (no engine calls, loader callbacks only). Optional `action` field on `ReferenceTargetRule`. `onTargetDelete` on `Attribute.use`. Config-commit coherence check. `Writer.retractEntity`. Typed errors. Oracle extension. |
| B | A, plus interval clipping in the planner, `Writer.deleteEntity({ from, to })`, remnant handling in the projection writers (already generic over assert and retract). |
| C | B, plus `presence` designation on `EntityType.make`, `Present` rule kind, carrier-based coverage in `ReferenceTarget`, carrier-based membership in the projection planner, completeness reasons `orphan-facts` and `presence-conflict`, `Writer.createEntity` asserting the carrier, REST POST asserting the carrier. |

### 4.2 Exact semantics per API

| API | Option A | Option B | Option C |
| --- | --- | --- | --- |
| `Triples.transact` raw operations | No new operation kinds. No traversal, no cascade. Any raw retract is legal. The floor is `meta.enforce`. | same as A | same as A |
| `meta.enforce` rules | `ReferenceTarget` as shipped. The optional `action` field is read by the planner only. | same as A | For types with a carrier, `ReferenceTarget` requires the carrier visible at every boundary where the edge is valid, covered by the union of carrier supports. New `Present` rule rejects domain facts outside carrier intervals and a non-`true` visible carrier. Types without a carrier behave as in A and B. |
| Writer verbs | `retractEntity(id, { budget })`: facts visible at the plan's `validAt` (default now), rejects when a live fact has `validFrom > validAt`, expands per policy, one transact. | A, plus `deleteEntity(id, { from, to, budget })`. Facts starting at or after `from` are retracted without remnants (no scheduled-fact rejection). | B, plus `createEntity` / `restoreEntity` (asserts the carrier). `deleteEntity` also clips the carrier. |
| Entity read at (R, P, V): `get`, `getMany`, `find`, `count`, `at(basis)` | Entity exists iff at least one visible fact has the type. Body is the visible facts. | same as A | Carrier types: exists iff carrier visible and `true`; facts outside carrier intervals are hidden. Other types: as A. |
| Timeline | Segments from facts. Gaps where no fact is visible. | same as A | Carrier intervals plus attribute segments. Empty-record intervals appear. |
| `history`, `match`, `entity` (low level) | Raw and unchanged. Retracted assertions keep complete retirement fields (`retractedAt`, `retractedPosition`, `retractTxId`). | Same, and remnants appear as new assertions with `recordedAt` equal to the deleting transaction. | same as B |
| Journal | One transaction. `retract` changes for every touched fact in plan order, `:_tx/changed-entity` for every touched entity including cascade and detach victims. No new change kind. | Adds `assert` changes for remnants, after all retracts. | same as B |
| Receipts and retries | Existing `commandId` claim. A retry returns the original receipt. A refused plan (budget, restrict) claims nothing and consumes no position. The Writer also returns an in-memory `DeletionReport` (roots, cells, edges detached, entities cascaded, operations planned, policy snapshot id). It is derivable from the ledger and policy and is not persisted. | same as A | same as A |
| REST | `DELETE` unchanged. | same | same, and `POST` asserts the carrier in the same transact. |
| Config | `onTargetDelete` on a reference use. Coherence check at config commit. | same | Also `presence` designation, immutable per EntityType key. |
| New typed errors | `EntityNotPresentError`, `CascadeBudgetExceededError`, `IntervalDeleteUnsupportedError`, `InvalidReferenceActionError` (config commit). | Same without `IntervalDeleteUnsupportedError`. | same as B |
| Deleting an absent entity | `EntityNotPresentError` (REST maps to 404). | Same when nothing is present in `[from, to)`. A partially present range deletes the present part. | same as B |

### 4.3 Worked example: the same command through each option

Entity `worker:maria`. Command recorded at T = 100, deletion from 100.

| Fact | Valid interval |
| --- | --- |
| name | `[10, forever)` |
| phone | `[10, 50)` |
| nickname | `[0, 5)` |
| carrier (Option C only) | `[0, forever)` |

Reads at the latest recorded cut after T:

| V | Option A (`retractEntity`) | Option B (`deleteEntity`) | Option C (`deleteEntity`) |
| --- | --- | --- | --- |
| 3 | exists: nickname | exists: nickname | exists: nickname |
| 7 | not found | not found | exists, empty body |
| 20 | exists: phone only (name was retracted whole) | exists: name, phone | exists: name, phone |
| 60 | not found | exists: name | exists: name |
| 120 | not found | not found | not found |

Reads at a cut recorded before T return the original state in all three: at V = 20 name and phone, at V = 120 name.

Option A leaves a partial past (V = 20 shows the phone but not the name) and no complete record of when Maria was a worker. Options B and C keep the whole past. Only Option C distinguishes "existed with no facts" (V = 7) from "did not exist".

### 4.4 What raw native queries see

| Surface | Option A | Option B | Option C |
| --- | --- | --- | --- |
| XTDB type table `worker`, default valid time (now) | Row exists while at least one fact is visible. After the delete, no row. | same | Row exists while the carrier interval covers now, even with no other columns set. |
| XTDB `FOR VALID_TIME AS OF 20`, after the command | Row built from surviving facts only (phone, no name). | Complete row (name, phone). | Complete row. At `AS OF 7`, a row with `_id` and null columns. |
| XTDB `FOR SYSTEM_TIME AS OF` before the command | Prior state. Equals the ledger cut only at physical commit boundaries (H-X-CUT); interior positions of nested transactions take the exact path. | same | same |
| Engine DML the projection writer issues | Rewrite of the entity's slices (X3b) or `DELETE ... FOR ALL VALID_TIME WHERE _id = ?`. | `DELETE FROM worker FOR PORTION OF VALID_TIME FROM a TO b WHERE _id = ?`, which splits slices itself. Slices are never coalesced, so each interval-local delete adds up to two slices per entity (R1 Q2). | same as B |
| XTDB ledger tables (`tx_assertions`) | Retraction sets retirement columns on the row; the row stays. A plain `SELECT` shows retracted rows too (documented in R3). | Same, plus remnant rows. | same as B |
| QLever current graph, `?s a :Worker` (marker instant) | Triple present iff any current fact. After the delete, the `rdf:type` and attribute triples are removed by `DELETE DATA` enumerated in the broker. | same | Present iff the carrier covers the marker instant. The carrier triple is an ordinary predicate. |
| QLever ledger graph | Assertion nodes updated with retirement fields. | Plus remnant nodes. | same as B |
| QLever future-dated deletion (`from > now`) | Not applicable (A has no `from`). | Ledger changes at once. The current graph changes at the next boundary through C4 maintenance chunks. Reads during `MAINTAINING` take the exact path (C1). Direct SPARQL during maintenance is unqualified (C4.5). | same as B |
| Dangling edges in raw data | Possible when enforcement is off or the edge was written raw. | same | same |

New valid-time boundaries must sit on the XTDB microsecond grid. A fractional `from` outside the grid makes the entity `inexact-coordinate` and ledger-only in the projection (`EXP-R01` `ProjectionSpec`). The Writer defaults `from` to integer-millisecond now.

### 4.5 Interaction with the plan's contracts

| Contract | Interaction | Option C extra |
| --- | --- | --- |
| C1 projection eligibility | Commits are atomic per engine (XTDB: ledger and projection in one engine transaction; QLever: one guarded update per commit group), so a cascade never exposes a half-applied projection. The partial, stale and conflicted sets are unchanged. | New completeness reasons: `orphan-facts` (facts outside carrier intervals, possible only with enforcement off) and `presence-conflict` (C5 on the carrier). Queries that touch such entities take the exact path. |
| C2 QLever commit protocol | Cascade resolution happens before the frame is built, so the frame stays pure ADD/DEL quads. Group validation (C2.2) validates each member against the staged state, so a second delete in the same group sees the first one's effects. The marker guard makes plan-then-apply safe against concurrent commits: a concurrent commit changes the marker and the guarded update applies nothing. | none |
| C4 boundary maintenance | A future-dated cascade creates boundary work for several entities at one instant. All cells from one command that share an instant must land in the same maintenance chunk or the marker stays `MAINTAINING` (reads then go exact). New falsifier needed. | none |
| C5 conflicts | Remnants of equal-valued facts are equal supports. Clipping must clip every support of an entity, not one (mutant `M-DROPPED-SUPPORT`). | Carrier overlap with equal `true` values is a union, not a conflict. |
| C6 journal | No new change kind, so `:_tx/change` and `:_tx/changed-entity` stay byte-identical for existing transactions. Reasons for cascaded removals are recomputed from ledger plus policy (decision 9 in section 7). | none |
| C7 raw dataset | Deleted entities disappear from domain tables and the current graph. Ledger and meta remain. The raw guide gets a "what deleted means" entry. | The guide documents the carrier column. |

### 4.6 Write amplification and scale at 10m entities

Assumptions: the representative profile (10m entities, 100m domain facts, about 10 per entity). The entity in the table has f = 12 live facts (10 domain, type-version, and for Option C the carrier). All facts are open-ended and start before the deletion instant, so each is retracted and (B, C) leaves one remnant. Counts are arithmetic on the transact semantics in section 1 and the journal shape in row 7.

| Per-entity delete, no incoming edges | Option A | Options B and C, open-ended | Options B and C, interior `[a, b)` |
| --- | --- | --- | --- |
| Transact operations | 12 retracts | 24 (12 retracts, 12 remnants) | up to 36 |
| Journal facts (7 envelope, 1 changed-entity, 1 per operation) | 20 | 32 | up to 44 |
| Ledger row versions written (operations plus journal) | 32 | 56 | up to 80 |
| Entities per command at the 500-operation budget | about 41 | about 20 | about 13 |

Derived costs (estimates):

- **Bulk deletion.** Deleting 1% of 10m entities (100k) takes about 2,440 commands in Option A and 5,000 in B and C. At the 25.6 commands per second offered write rate of the 256-client profile (RULINGS Q2), that is about 95 s and about 195 s of the whole offered write rate. Run it as a throttled job so steady writes keep their share.
- **Storage.** Remnants add 12 assertion rows per deleted entity. At 1% deleted per year that is about 1.2m rows on a base above 100m. Negligible.
- **Presence at create (C only).** +1 fact and +1 journal change per entity, so +10m facts on 100m (+10%). QLever pays the same ratio of quads (about 8 per fact in the PC layout, about 7 under H-Q-COMPACT). XTDB adds a column, not a row, when intervals match.
- **Gate instead of clip (rejected variant).** Clipping only the carrier would make a delete 2 operations regardless of f, but facts beyond the deletion stay stored and hidden, stale values return if the carrier is later re-asserted, every reverse lookup must join source presence, and raw ledger relations disagree with entity reads. See decision 5.

Lookup costs for the planner:

| Need | SQLite / PostgreSQL | QLever | XTDB |
| --- | --- | --- | --- |
| Incoming edges of one target for one attribute | `idx_ref_target (attribute, value_string, entity_id)` exists (`packages/sql/src/schema.ts:117`) | OPS permutation lookup | no secondary index. Column scan at about 0.27 s per million rows, so 2.7 s over a 10m-row type table per attribute per hop. With the R7 posting-document layout: 2 to 5 ms (ordinary), about 400 ms (1m postings), 9 to 49 ms per posting update, and every ref write also updates the posting documents. |

The floor is the largest scale risk. A restrict check through today's enforcement loads every live row of the source and target types per enforced command (section 1, row 6). At 10m entities that is tens of millions of rows per command. The G9 load profile therefore needs a touch-set check that evaluates only edges incident to touched ids through the reverse lookup. Until that exists, the Writer's planner (which uses the reverse lookup) is the practical restrict check at scale, and `enforce` is a tiny-profile guard.

### 4.7 Cases that discriminate the options

Answers differ by option.

| ID | Setup | Option A | Option B | Option C |
| --- | --- | --- | --- | --- |
| D1 Empty record | Create an entity with no domain facts. | impossible | impossible | `get` returns the id; `find` and raw `count` include it; XTDB row with only `_id`; SPARQL `?s a :T` matches. |
| D2 Presence gap | Domain fact `[0,20)`, carrier `[0,10)`. Read at V = 15. | present (derived) | present (derived) | enforced write: `Present` violation at boundary 10. Unenforced: not found, entity flagged `orphan-facts`. |
| D3 Stale writer | Delete at t. Later assert one domain fact valid from t + 50, no carrier. | entity reappears with one attribute | same as A | enforced write rejected. Unenforced: hidden. |
| D4 Time axis | Worked example 4.3. | partial past | complete past | complete past plus empty-record interval. |
| D5 Interval-local | Delete `[40, 60)` of an entity with open-ended facts. | `IntervalDeleteUnsupportedError` | three generations in history; reads at V = 30, 50, 70 present, absent, present with remnant values. | same as B. |
| D6 Coverage | Target has typed facts covering `[0,100)` but carrier only `[0,50)`. Source edge `[0,100)`. | accepted | accepted | rejected at boundary 50 with `reference-target`. |
| D7 Scheduled facts | Entity has a fact with `validFrom = 200`. Command at 100. | `retractEntity` rejects (`scheduled_facts`) as REST does | `deleteEntity` retracts it with no remnant | same as B. |
| D8 Interval cascade | Source edge `[0,100)`, target deleted `[40,60)`, cascade. | whole visible source removed | source removed over `[40,60)` only | same as B. |
| D9 Raw count parity | After each case, repository count, XTDB `count(*)` and SPARQL `count(?s)` at the same basis. | counts entities with at least one fact | same | counts carrier-present entities, including empty ones. |

Must pass in every option.

| ID | Setup | Expected |
| --- | --- | --- |
| S1 Atomic refusal | Delete a target with an uncovered `restrict` edge. | `ConstraintViolationError`, no position consumed, no receipt, journal unchanged. |
| S2 Final-state | Same command also clips the edge. | Commits. |
| S3 Detach | Target deleted with `detach` edge. | Edge clipped, source stays, source `history` shows retraction. |
| S4 Cascade chain | Three levels, each `cascade`. | Plan order and change list equal the oracle's. |
| S5 Budget | Chain that needs more than `maxOps`. | `CascadeBudgetExceededError`, no residue, command id still unclaimed. |
| S6 Cycle | Two entities referencing each other, both `cascade`. | Creating the cycle deletes nothing. Deleting one removes both once. |
| S7 Self-reference | `manager` reference with `detach`. | Reports keep existing, lose the edge. |
| S8 Any-parent | One source with two `cascade` references. | Removed when either target is removed. |
| S9 Alternate support | Two equal live supports of one value. | A fact-level retract of one keeps the value. Entity delete clips both. |
| S10 Config coherence | `detach` on a required use, `cascade` on a many use, presence-mode flip across releases. | Rejected at config commit. |
| S11 Release binding | Change a policy between releases. Delete under the old snapshot, then move `live`. | Old deletion unchanged. Receipt shows the old snapshot id. |
| S12 Idempotent retry | Repeat the delete with the same `commandId`. | Original receipt, journal gains nothing. |
| S13 Concurrency | 16 writers: one deletes a target, others add edges to it. | Only serializable outcomes. No dangling edge visible at any cut. |
| S14 History compatibility | `Triples.history` of the deleted entity. | Full retirement fields on retracted rows, remnants distinct (`G9.history.raw-lifetime-compat`). |
| S15 Recorded cuts | Read before, at and after the deleting transaction, including a nested transaction with two positions. | Equals O-REPLAY (`G9.temporal.recorded-cuts`). |
| S16 Journal | `transactionsForEntity` on a cascade victim. | Returns the deleting transaction. `changed-entity` lists every touched entity. |
| S17 Modes | All of the above in current, reopen, engine restart. | Equal. |
| S18 Fault injection | Kill the writer between log fsync and apply (QLever); abort mid-engine-transaction (XTDB). | Replay or retry converges to the oracle state. |
| S19 REST | `DELETE` on entities with expired and with scheduled facts. | Existing contract. Pin the candidate defect (section 1, row 5) as an explicit expected outcome. |

New mutation controls (apply only to the system under test, per B18).

| Mutant | Fault |
| --- | --- |
| M-CLIP-DROPS-TAIL | Left remnant created, right remnant dropped. |
| M-CASCADE-ALL-PARENTS | Source removed only when every cascade target is removed. |
| M-RESTRICT-IMMEDIATE | Reject even when the same command clips the edge. |
| M-DETACH-LEAVES-EDGE | Detach retracts the target's facts but not the edge. |
| M-CYCLE-SEEDS | Mere existence of a cycle triggers deletion. |
| M-BUDGET-PARTIAL | Writes part of the plan before refusing. |
| M-POLICY-AT-READ | Re-applies the latest release's policy when reading an old deletion. |

---

## 5. Physical erasure (all options, separate track)

Ordinary deletion never satisfies a legal erasure duty: the data stays in the ledger, the journal's `:_tx/change` facts, the QLever log of record, checkpoints and off-machine copies.

Recommended stance for the provisional ruling:

1. **Not part of G9 closure.** Nothing in the three G9 obligations requires removal; they require preserved history.
2. **Host-level path today, no core change.** Store sensitive values encrypted under a per-subject key held outside Triplex. Deleting the key makes the stored values unreadable [W12]. Limits to state in the docs: key management quality, decrypted copies in projections or caches, and the contested legal reading that encrypted personal data remains personal data. Needs counsel before it is called compliant.
3. **Engine-level erasure later, as an administrative operation, never a `transact` operation.** Minimum contract: runs through the QLever mutation broker or the XTDB adapter's admin path; removes ledger rows, projection rows, current-graph quads and journal change values for the named entities; leaves one erasure record (count, time, reason code, no values), like Datomic's excision record [W2]; is idempotent. Engine pieces: XTDB `ERASE` over the ledger and projection tables [W4]; SQLite and PostgreSQL row delete plus vacuum; QLever needs redaction of log frames (which breaks the chained CRC32C of C2.1 unless a "rewrite epoch" is defined), regenerated checkpoints, a rebuild from the redacted log, and purging off-machine copies. That is a project of its own and needs a falsifier set. Datomic's guidance to excise only a few thousand datoms at a time is a reasonable first batch bound.

---

## 6. Recommendation

**Adopt Option C in two stages. Rule on it provisionally so work can proceed.**

Why not A: it leaves interval-local deletion unsupported, which contradicts the statement of `G9.deletion.entity`, and its presence is accidental (section 3.3).
Why not stopping at B: the presence obligation would close only by declaring that Triplex has no presence policy (B16), empty records stay impossible, and any stray fact revives a deleted entity.

**Stage 1 (start now, shared by all options).**

1. Planner module, `onTargetDelete`, config coherence check, `retractEntity`, `deleteEntity`, budget, typed errors.
2. Oracle extension (independent Python planner) and the shared cases S1 to S19.
3. XTDB and QLever persist-path changes for retract plus remnant (generic already) and the `DELETE ... FOR PORTION` or slice rewrite.

**Stage 2 (after Sam confirms decision 1).**

1. `presence` designation, `Present` rule, carrier-based coverage and membership, completeness reasons.
2. Cases D1 to D9. Amend the text of `G9.presence.explicit` (it says "toggled true -> false -> true"; under C the toggle is an interval ended and restarted, and the fixture's `:capacity/present` becomes the designated carrier) and add `EP-WRITER` to its entrypoints.

**Stage 3 (separate, deferred).** Erasure (section 5) and the touch-set floor needed before `enforce` runs in the 10m load profile.

**Provisional ruling text for RULINGS Q9 (revisable by Sam; a revision creates a new contract version).**

> Q9 presence, deletion, cascade. Presence is explicit and opt-in per EntityType through a designated boolean carrier (Option C of R15); types without a carrier keep derived presence. Delete means ending valid time from `from` (default now) to `to` (default forever) by retracting live facts and asserting clipped remnants; REST DELETE keeps its recorded-retraction contract. Each reference use declares `restrict` (default, final-state), `detach` or `cascade` (any-parent, cardinality-one only), bound at command time by `meta.configSnapshot`. Plans are deterministic, run outside the commit and are verified by enforcement inside it, with atomic refusal at 500 planned operations. Cycles are legal and never seed deletion. No new journal change kind. Physical erasure is out of scope for G9. Basis: R15.

---

## 7. What Sam must confirm

**Decide now (these change what gets built).**

| # | Question | Recommended | If Sam says no |
| --- | --- | --- | --- |
| 1 | Should typed entities have explicit presence, opt-in per EntityType, at +1 fact per entity (+10% of the 100m domain facts)? | Yes | Build Option B only. Rewrite `G9.presence.explicit` to say presence is derived, and accept that this is a policy, not an omission. |
| 2 | Should "delete" by default mean "stopped being true from now" (valid time), with today's recorded retraction kept only as the REST DELETE contract? | Yes | Build Option A. Interval-local deletion drops out of `G9.deletion.entity`. |
| 3 | What should a reference with no declared action do when its target is deleted? | `restrict` (reject unless the same command fixes the edge) | Datomic-style `detach` default. Silent loss of edges on delete; consider a loud warning in the receipt. |
| 4 | Should `cascade` mean "delete the source when any cascade target goes" (SQL semantics), on cardinality-one references only? | Yes | Add last-owner semantics, which needs reachability bookkeeping and the DRed-style cycle handling noted in the imported synthesis. |

**Defaults the orchestrator may rule on; Sam can revise.**

| # | Default | Alternative and cost |
| --- | --- | --- |
| 5 | Clip facts on delete (O(f) operations). | Gate behind presence (2 operations): stale values reappear on restore and every reverse lookup needs a presence join. |
| 6 | Refuse atomically above 500 planned operations or 100 cells; host slices bigger deletes bottom-up. | Larger budget raises the QLever update size and the serialized commit time. |
| 7 | Physical erasure deferred; crypto-shredding named as the host-level path pending legal review. | Build the administrative erasure operation now: a QLever log-rewrite project. |
| 8 | REST DELETE unchanged, including the expired-fact and spurious-conflict behavior. | Fix REST DELETE to use `deleteEntity` semantics: changes the frozen contract. |
| 9 | No durable per-change "reason" (root, cascade, detach). The reason is recomputed from the ledger and the pinned policy. | Add an optional `reason` field to `:_tx/change` for new transactions: additive, touches C6 and the oracle. |

---

## 8. Risks and unverified claims

**Check before relying on the policy (4).**

1. **Candidate defect, unrun.** REST DELETE and PUT may throw `TransactionConflictError` for an entity with a live expired fact (section 1, row 5). Confirm with a two-line test before freezing `G9.deletion.entity` cases.
2. **Enforcement cost at 10m is read from code, not measured.** Measure `loadRelevantFacts` and the XTDB pushdown at 100k and 1m rows before relying on `enforce` in any profile above tiny.
3. **QLever quad counts are estimates** from R8 (8 triples per fact) and the H-Q-COMPACT target (about 7). Retraction cost per fact has not been measured.
4. **XTDB reverse-reference tables (H-X-ID) are a hypothesis.** Cascade and restrict on XTDB at scale depend on R7's layout surviving the scale rungs; otherwise lookups are column scans.

**Caveats on the research itself (5).**

1. **QLever and physical removal.** I did not verify when `DELETE DATA` quads leave the index files (R8 says `rebuild-index` bakes the delta). The log of record keeps ADD frames regardless, so erasure design must start there.
2. **Prior-art claims from general knowledge, not re-verified in this session:** Datomic entities exist iff they have datoms; Datomic has no referential integrity on plain references. PostgreSQL's "only `NO ACTION` for temporal keys" is my inference from the per-action "not supported" notes. Kafka details come from Confluent's page, not Apache's (the Apache page was a redirect stub).
3. **Typed-error names and the `Present` rule shape are proposals**, not decided API.
4. **Type migration (an entity moving from one type to another over time)** is allowed by the carrier design but has no case here. Add one before Stage 2 closes.
5. **Style review.** The writing-style skill asks for a separate reviewer agent. The task forbade subagents, so this document was checked inline by search for em-dashes and banned words only. Treat it as unreviewed prose.

---

## 9. Files to touch (for Stage 1 and 2 briefs)

| Area | Files |
| --- | --- |
| Rule field and coherence check | `packages/core/src/Constraint.ts` (`ReferenceTargetRule`, `RuleSchema`), `packages/core/src/config/GraphConstraint.ts`, `packages/core/src/config/Attribute.ts` (`UseOptions`), `packages/core/src/config/EntityType.ts` |
| Planner and Writer verbs | new module under `packages/core/src/entity/` on the `exp/R01-entity-core` line (`Plan.ts`, `Repository.ts`) |
| Carrier (Stage 2) | `EntityType.make` options, `Constraint.ts` (`Present` rule), `packages/http/src/EntityStore.ts` (POST) |
| XTDB persist path | `packages/xtdb/src/XtdbStorageAdapter.ts`, `ConstraintValidation.ts`, projection writer (EXP-R02) |
| QLever persist path | `packages/qlever/src/QleverStorageAdapter.ts`, broker validation (C2.2) |
| Oracle and cases | `lab/acceptance/` (`CS-PRESENCE-DELETE`), O-REPLAY planner, O-ERR typed errors |

---

## 10. Repo files read

`wiki/research/presence-reference-deletion-requirements-v1.md`, `wiki/goals.md`, `docs/agents.md`, `docs/concepts.md`, `docs/operational-primitives.md`, `docs/configuration.md`, `docs/configuration-versioning.md`, `docs/http-api.md`, `docs/datomic.md`, `docs/xtdb.md`, `packages/core/src/Constraint.ts`, `packages/core/src/Triple.ts`, `packages/core/src/store/Triples.ts`, `packages/core/src/store/TriplesLive.ts`, `packages/core/src/store/systemNamespace.ts`, `packages/core/src/config/Attribute.ts`, `EntityType.ts`, `GraphConstraint.ts`, `packages/http/src/EntityStore.ts`, `packages/xtdb/src/XtdbStorageAdapter.ts`, `ConstraintValidation.ts`, `packages/sqlite/src/SqliteAdapter.ts`, `packages/sql/src/schema.ts`, `lab/PLAN.md`, `lab/acceptance/ACCEPTANCE.md`, `RULINGS.md`, `lab/STATE.md`, `lab/research/R1`, `R6`, `R7`, `R8`, `R13`, `lab/experiments/EXP-R01-entity-core/REPORT.md` and its branch `Plan.ts`, `qualification/capacity/configured-entities-v1/CONTRACT.md`, `packages/qualification/experiments/configured-entities-v1/recipe.mjs`, `vendor/duckdb-temporal/runtime/NATIVE-TEMPORAL-REFERENCES-DESIGN.md`, `RESEARCH-SYNTHESIS.md`, `references/xtdb/docs/.../sql/txs.md`.

## 11. Web sources

- [W1] Datomic transaction functions (`:db/retractEntity`): https://docs.datomic.com/transactions/transaction-functions.html
- [W2] Datomic excision: https://docs.datomic.com/operation/excision.html
- [W3] Datomic schema reference (`:db/isComponent`, `:db/noHistory`): https://docs.datomic.com/schema/schema-reference.html
- [W4] XTDB 2 SQL transactions (`DELETE`, `ERASE`, `ASSERT`): https://docs.xtdb.com/reference/main/sql/txs.html (pinned local copy under `references/xtdb/docs`)
- [W5] XTDB 1 transactions (`delete`, `evict`): https://v1-docs.xtdb.com/language-reference/datalog-transactions/
- [W6] PostgreSQL constraints and foreign keys: https://www.postgresql.org/docs/current/ddl-constraints.html
- [W7] PostgreSQL `CREATE TABLE` (temporal foreign keys, deferrable constraints): https://www.postgresql.org/docs/current/sql-createtable.html
- [W8] SPARQL 1.1 Update: https://www.w3.org/TR/sparql11-update/
- [W9] Kurrent (EventStoreDB) streams, soft and hard delete: https://docs.kurrent.io/server/v5/streams
- [W10] Kafka log compaction and tombstones (Confluent): https://docs.confluent.io/kafka/design/log_compaction.html
- [W11] GDPR Article 17: https://gdpr-info.eu/art-17-gdpr/
- [W12] Verraes, crypto-shredding in event sourcing: https://verraes.net/2019/05/eventsourcing-patterns-throw-away-the-key/
- [W13] XTDB 2 transactions and consistency: https://docs.xtdb.com/about/txs-in-xtdb.html

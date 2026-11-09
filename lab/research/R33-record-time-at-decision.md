# R33: Record time stamped at decision (design for ruling Q89a)

**Written:** 2026-11-08 by R33 (planner, Opus 5.5, high). Source reading only: no engine, container or test was run. Every behavior
below is a prediction until a test runs it.

**North star:** P1 (a read pinned to a named point in time gives the same answer every time) and P2 (a receipt reports the decided
commit exactly). Correctness floor: `lab/TARGETS.md` section 3, "snapshot reads at a named point in time (valid and record time),
no locks, reproducible"; section 1.1 P1 items 2 and 4.

**Goals and targets:** `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Rulings: Q89a to Q89h in
`lab/acceptance/RULINGS-PENDING.md`. Defect: R31 D-C1 (`lab/research/R31-route-equivalence.md` section 5.1).

**Code read (heads):**

| Area | Where | Head |
| --- | --- | --- |
| core, testkit, XTDB A0, QLever A0, qualification | main checkout | `95db6153` |
| QLever broker | `.claude/worktrees/sql01/packages/qlever/src/broker/` (branch `exp/SQL01-broker-sqlite`) | `4863a8e0` |
| XTDB subject-stamp | `exp/P2X-xtdb-commit-feed` `packages/xtdb/src/XtdbStorageAdapter.ts` | `fb6681a4` |
| Datomic lane D | `.claude/worktrees/da01/packages/datomic/` (branch `exp/DA01-datomic-adapter`) | `e622b3b3` (+ `558a369f` docs) |
| Route-equivalence harness | `.claude/worktrees/rq01/packages/testkit/` (CX-RQ01, in progress, uncommitted) | worktree state on 2026-11-08 |
| O-REPLAY | `lab/oracles/replay/` (the oracles live under `lab/oracles/`; `lab/acceptance/oracle-contract.json` holds their contract entries; there is no `lab/acceptance/oracle/` directory) | main (pinned as 0.4.9 in contract 0.3.11) |

Paths in the tables below are relative to the package named in the row. "P2X" line numbers are from
`git show exp/P2X-xtdb-commit-feed:packages/xtdb/src/XtdbStorageAdapter.ts`.

---

## 0. Answer

1. **One rule for every lane.** Each committed transaction gets one record stamp, an integer number of epoch microseconds, assigned
   under the decider's order as `stamp = max(previous stamp + 1, clock)`. Stamps strictly increase with position across
   transactions in a scope. Every ordinal of one transaction (nested `transact` calls) shares that transaction's stamp. The stamp is
   written into `recorded_at` (new rows), `retracted_at` (rows it retracts), the claim record, the operation receipt and the
   returned `TransactionResult.instant`.
2. **Public values stay epoch milliseconds.** `recordedAt`, `retractedAt` and `instant` become `stamp / 1000`, a JS number that
   carries the microseconds as a fraction (for example `1731100000123.457`). Public types do not change. The map from stamps to
   these numbers is strictly increasing and invertible for every instant before the year 2248, and JS, Java and Python compute it
   identically (IEEE division). Callers that pass integer milliseconds keep working.
3. **Valid time stops borrowing the record stamp.** An omitted `validFrom` and the constraint evaluation instant use `stagedAt`, the
   runtime clock read when the transaction is staged (today's `timestamp`). That keeps read-your-own-write at a client-clock `validAt`
   and keeps constraint checks consistent with the facts they check. `TransactionResult` gains `stagedAt` (additive).
4. **Per lane:**

   | Lane arm | Who decides the stamp | Clock input | Why it is strictly increasing |
   | --- | --- | --- | --- |
   | QLever broker | the broker, per frame member, inside `commitGroup` (single decision loop, writer lock held) | the member's `stagedAt` | members are decided one at a time in position order; `previous` is the broker's last decided stamp, recovered from the log |
   | QLever A0 | the adapter at staging, guarded by the scope CAS | `stagedAt` | the scope guard admits the commit only directly after the source cut whose stamp was read |
   | XTDB A0 (`scope-counter`) | the adapter at staging, guarded by `ASSERT MAX(position) = K` | `stagedAt` | same: the stamp of K is read with K in one query; the CAS admits only K + 1 |
   | XTDB P2X (`subject-stamp`) | XTDB's indexer (`COMMIT_STAMP_SQL`) | engine system time | XTDB 2.2.0 gives each transaction a system time strictly later than the latest completed one (`TxResolver.kt:204-246 @ c6c1962`, probe p1-stamp-order) |
   | Datomic DA01 | the adapter at staging, validated by the gateway, guarded by `:db/cas` on the scope position | `stagedAt` | the CAS admits only the transaction directly after the source cut; the gateway also refuses a stamp not above the scope stamp |

5. **Watermark.** The record-time watermark W of a scope is the stamp of its latest decided transaction. A read whose `recordedAt` T
   has `stampCut(T) > W` names a future record time: it waits for W to reach it up to the basis deadline (2 s, Q58a), then fails with
   a typed `BasisNotAvailable { axis: "recordedAt" }` (Q89c). Because every later stamp is above W, an answer served at T <= W can
   never change. That closes D-C1.
6. **Determinism.** On every lane except P2X the stamp comes from the runtime clock, so deterministic runtimes give deterministic
   stamps: a fixture whose commits have strictly increasing declared clocks gets exactly those clocks as stamps. Commits that share a
   clock get `+1 us` bumps. P2X stamps are engine time; harnesses map fixture instants to receipt instants by order. One golden vector
   (G9-CUT-02, "two commits share one recorded instant") and four O-REPLAY rules must change, so O-REPLAY moves to 0.5.0 and the
   contract to 0.4.0.
7. **For Sam (Q89g).** After this change `recordedAt: receipt.instant` already pins exactly one commit, so a public position or token
   is ergonomics and safety, not a correctness need. Recommended: an opaque, scope-checked `snapshot` token in `TemporalBasis` and on
   receipts (section 5).
8. **Rounds.** Round 1: core protocol, the five lane arms, the watermark gate with typed refusal, O-REPLAY 0.5.0, golden fix, RQ01
   flip, contract 0.4.0. Round 2: seals (so an idle scope can answer a past T after its last commit) and the T-to-position reduction
   that lifts Q89b for H1, Datomic `:f/live` and R24's current store.

---

## 1. Every use of the pre-commit timestamp

`timestamp = yield* now` (`core/src/store/TriplesLive.ts:309`) is taken before the position is allocated (`:326`). `now` is
`Date.now()` (`core/src/store/RuntimeServices.ts:14`) or a fixed value (`RuntimeServices.ts:40-43`, wired from
`deterministic.startTime` at `core/src/runtime/Runtime.ts:78`). The table says, for each use, what it needs after the change:

- **decided**: the decided record stamp (a placeholder until decision on deferred lanes);
- **staged**: only some instant, which stays the staging clock `stagedAt`;
- **reader**: a reader of values written earlier, correct once the writers store decided values.

### 1.1 Core (`packages/core/src`)

| # | Location | Use | Needs | Change |
| --- | --- | --- | --- | --- |
| C1 | `store/TriplesLive.ts:309` | `const timestamp = yield* now` | split | becomes `stagedAt`; the record stamp comes from `adapter.commitStamp` (section 2.3) |
| C2 | `store/TriplesLive.ts:311-315` | `adapter.claimCommand(commandId, txId, timestamp)` | decided | pass the stamp (decided or placeholder) |
| C3 | `store/TriplesLive.ts:351-357` | `adapter.validateConstraints({ instant: timestamp })` | staged | pass `stagedAt` (valid-time evaluation instant) |
| C4 | `store/TriplesLive.ts:376-382`, `Constraint.ts:343, 362-363, 384-388` | portable constraint check: projected staged facts get `recordedAt: instant`, `validFrom: op.validFrom ?? instant` | staged | pass `stagedAt`; it must equal the validFrom default core writes (C5), so the check sees the facts as they will be valid |
| C5 | `store/TriplesLive.ts:207-250` (`flushAssertBatch`, timestamp at `:236`, `:246`) | `insert` / `batchInsert` timestamp: adapter writes `recorded_at` and defaults `valid_from` | decided (recorded_at) and staged (valid_from) | core fills `validFrom: op.validFrom ?? stagedAt` into each `TripleInput` before calling the adapter, and passes the stamp as `timestamp`; adapters' own `?? timestamp` fallback becomes dead for core callers |
| C6 | `store/TriplesLive.ts:416-428, 497-510` | `transactionChangeFromTriple(..., timestamp)` | decided | the change's own instants are omitted from the stored JSON (section 2.10); in memory they carry the stamp |
| C7 | `store/TriplesLive.ts:441-446, 485` | `adapter.retract(id, timestamp, txId, position)`: `retracted_at` | decided | pass the stamp |
| C8 | `store/TriplesLive.ts:459-466, 488` | retract change `retractedAt: timestamp` | decided | as C6 |
| C9 | `store/TriplesLive.ts:513-516`, `store/transactionMetadata.ts:29-56` | journal facts: `:_tx/instant` datetime value (`:44`) and journal rows' `recorded_at` | decided | stop writing `:_tx/instant`; journal rows carry the stamp in `recorded_at` like any row; journal rows' `validFrom` is `stagedAt` |
| C10 | `store/TriplesLive.ts:519` | `return { ..., instant: timestamp }` | decided | `instant: stamp`, plus `stagedAt`; deferred lanes bind the placeholder at decision (section 2.4) |
| C11 | `store/transactionMetadata.ts:9-27` | change JSON carries `recordedAt` and, for retracts, `retractedAt: transactionInstant` | decided | write format v2 without this transaction's own instants; decode fills them from the record (section 2.10) |
| C12 | `store/transactionMetadata.ts:105-131` | `TransactionRecord.instant` read from `:_tx/instant` | reader | read the `:_tx/position` row's `recordedAt`; fall back to `:_tx/instant` for records written before 0.4.0 |
| C13 | `store/Triples.ts:57-63, 108-112` | `TransactionResult.instant`, `TransactionRecord.instant` | decided | doc comment: the decided record instant (`stamp / 1000`); add `TransactionResult.stagedAt` |
| C14 | `snapshots/EntitySnapshotsCapability.ts:20-35, 252` | `resolveTxTime`: first triple's `recordedAt`, else `:_tx/instant` | reader | use `result.instant`; drop the `:_tx/instant` lookup (C9) |
| C15 | `snapshots/SnapshotServiceLive.ts:114-137, 145` | creation and retraction by position, else by `recordedAt` with a txId tie-break | reader | unchanged; the tie-break becomes unreachable for decided scopes |
| C16 | `derivation/Materialization.ts:229`, `derivation/Derivation.ts:275` | `transaction.instant > basis.recordedAt` | reader | unchanged (journal instants are decided) |
| C17 | `Pagination.ts:256-260`, `EntityPage.ts:141-148` | first page binds `recordedAt: requested ?? input.now` (client clock) next to `recordedPosition = currentCommitPosition()` | the head's stamp | bind `?? headStamp`, read with the position in one call (`adapter.currentCut`, section 2.3). With the watermark gate, a client `now` above W would make every first page wait |
| C18 | `store/TriplesLive.ts:573, 580, 587, 623, 692, 707, 783` | read-side `now` | staged | only resolves an omitted `validAt`; unchanged |
| C19 | `store/writeEventUtils.ts:47, 68, 86, 110, 158` | change-event `timestamp` (`recordedAt` or `now`) | staged | notification time only; may use `result.instant` where available, not required |
| C20 | `kv/layers/KvTriplesLive.ts:630` | KV runtime's own `transact` (`instant: now`) | out of scope | the KV runtime is not a lane; it keeps staged stamps and declares `recordTime: "staged"` |
| C21 | `Temporal.ts:34-55` | `validateTemporalInstant` accepts any finite non-negative number | reader | unchanged; fractional milliseconds are already legal |
| C22 | `storage/StorageAdapter.ts:25-72` | interface: `validateConstraints.instant`, `claimCommand`, `insert`, `batchInsert`, `retract` timestamps | interface | add the optional members of section 2.3; document `timestamp` as "the record stamp for this transaction" |

### 1.2 The kernel (`packages/w0`)

The W0 kernel never reads record time. Its basis is `{ tx, validTime }` (`w0/src/kernel.ts:20-26, 95-97`) and "now" is always
`basis.validTime` (`kernel.ts:3`). Facts carry the commit position (`kernel.ts:26`). Nothing in `packages/w0` changes, and O-DOMAIN
is not affected.

### 1.3 QLever broker (`.claude/worktrees/sql01/packages/qlever/src/broker/`)

| # | Location | Use | Needs |
| --- | --- | --- | --- |
| Q1 | `BrokerStorageAdapter.ts:91, 668-681` (`:677`) | staged claim `{ txId, timestamp }` | decided (rewrite at decision) |
| Q2 | `BrokerStorageAdapter.ts:499-523` (`:509`, `:511`) | `recorded_at: timestamp`, `valid_from: input.validFrom ?? timestamp` | decided; valid_from staged (filled by core, C5) |
| Q3 | `BrokerStorageAdapter.ts:690-706` (`:702`) | `retracted_at: timestamp` | decided |
| Q4 | `BrokerStorageAdapter.ts:383-411` | `persist` sends rows and claims to `broker.submit` | carries `stagedAt`; receives the stamp |
| Q5 | `BrokerStorageAdapter.ts:163-185, 488` | `bindPositions` binds only `position` fields | replace by core's `bindCommit` (positions and instant) |
| Q6 | `broker.ts:38-52, 64-78` | `BrokerTransaction`, `BrokerDecision` | add `stagedAt`; add `stamp` to the committed decision |
| Q7 | `broker.ts:408-550` (`commitGroup`), `:571-628` (`finalize`) | positions bound per member; rows rewritten | assign and rewrite the stamp here (section 2.5) |
| Q8 | `broker.ts:442-455` | idempotent re-submit returns the original positions | must return the original stamp too (P2 lost ACK) |
| Q9 | `broker.ts:164-168`, `log.ts:78-82`, `sqlite-worker.ts:62, 126` | operation receipt `{ lsn, epoch, positions }` | add `stamp` |
| Q10 | `frames.ts:14-86` | `MemberClaim.timestamp`; wire format v1 | payload v2 adds the member stamp |
| Q11 | `broker.ts:343-348`, `log.ts:420`, `sqlite-worker.ts:59, 139` | head position and marker | add the head stamp (watermark) |
| Q12 | `BrokerStorageAdapter.ts:122-145, 379` | kernel visibility and sort by `recorded_at` | reader; unchanged |
| Q13 | `BrokerStorageAdapter.ts:239-283, 548-604, 606-617` | basis resolution for pulls, `dependencyState`, the Datalog gate | add the watermark gate (section 3) |
| Q14 | `sqlite-worker.ts:122` | `committed_at` = host `Date.now()` per frame | not record time (diagnostic only); unchanged |
| Q15 | `broker.ts:500-511` | `ackAt`, `watermarkAt` (`performance.now`) | P3 feed-lag instants on the host monotonic clock (TARGETS 1.1 P3 item 1); not record time; unchanged |

### 1.4 QLever A0 (`packages/qlever/src/QleverStorageAdapter.ts`, main)

| # | Location | Use | Needs |
| --- | --- | --- | --- |
| QA1 | `:206` | claim triple `recorded_at: String(claim.timestamp)` | decided |
| QA2 | `:216-230` | guarded update (scope CAS) | also writes and guards the scope stamp (section 2.6) |
| QA3 | `:376`, `:378` | `recorded_at: timestamp`, `valid_from ?? timestamp` | decided; staged |
| QA4 | `:416-427` | `nextCommitPosition`, `currentCommitPosition` | `currentCut` returns the stamp with the position |
| QA5 | `:469` | `retracted_at: timestamp` | decided |

### 1.5 XTDB A0 (`packages/xtdb/src/XtdbStorageAdapter.ts`, main)

| # | Location | Use | Needs |
| --- | --- | --- | --- |
| XA1 | `:92-104` (`committedPosition`) | reads `position` from `tx_meta` | also read `stamp` (same query) |
| XA2 | `:386-398` | transaction state at begin (`sourceK`) | keep the source stamp |
| XA3 | `:430-450` (`:439`, `:441`) | `recorded_at: timestamp`, `valid_from ?? timestamp` | decided; staged |
| XA4 | `:501-525` | `claimCommand` stores the timestamp | decided |
| XA5 | `:527-545` (`:540`) | `retracted_at: timestamp` | decided |
| XA6 | `:187-260` (`persist`): `tx_claims.recorded_at` (`:237-251`), `tx_meta` (`:252-257`), `tx_attempts` | stored claim time; scope head | decided; `tx_meta` and `tx_attempts` gain `stamp` |
| XA7 | `:629` | `CREATE TABLE tx_meta (_id, scope_key, position)` | add `stamp` |
| XA8 | `:111-180` (`queryRows`), `XtdbQueryExecutor.ts:165-185`, `native/Sources.ts:53-90`, `TemporalQueries.ts:85-111`, `MaintainedQueries.ts:85-120`, `:560-610` (`dependencyState`) | filters `recorded_at <= T`, `retracted_at <= T` | reader; add the watermark gate (section 3) |

### 1.6 XTDB P2X (`exp/P2X-xtdb-commit-feed`)

| # | Location | Use | Needs |
| --- | --- | --- | --- |
| XP1 | `:70-71` | `COMMIT_STAMP_SQL`, engine microseconds | the record stamp itself |
| XP2 | `:93-138` (`Stamp`, `stampedInsert`) | stamp forms `position`, `raw`, `number-identity` | add form `instant` for `recorded_at`, `retracted_at`, `tx_claims.recorded_at` |
| XP3 | `:513-530` | assertion cells; only positions are stamped | stamp `recorded_at` of fresh rows and `retracted_at` of retracting rows |
| XP4 | `:603-617` (`:614`) | `tx_claims.recorded_at = claim.timestamp` | stamped |
| XP5 | `:945-967` (`:955`, `:957`) | `recorded_at: timestamp`, `valid_from ?? timestamp` | placeholder; staged |
| XP6 | `:1034-1067` (`:1065`) | claim timestamp | placeholder |
| XP7 | `:1077-1092` (`:1088`) | `retracted_at: timestamp` | placeholder |
| XP8 | `:631-660`, `:674-688` | `tx_feed.stamp`, `tx_attempts.stamp` (raw) | already the stamp: replay receipts can return it |
| XP9 | `:664-670` | `tx_meta.position` blind write; the greatest stamp survives | watermark source (section 3.2) |
| XP10 | `:206-216`, `:1122-1130` | `recorded_at <= ?`, `retracted_at <= ?` filters | reader; add the watermark gate |

### 1.7 Datomic DA01 (`.claude/worktrees/da01/packages/datomic/`)

| # | Location | Use | Needs |
| --- | --- | --- | --- |
| D1 | `src/DatomicStorageAdapter.ts:225-236` | begin: `client.begin(db)` returns `{ handle, position }` (`gateway/.../main.clj:12`) | also return the scope stamp |
| D2 | `src/DatomicStorageAdapter.ts:278-300` (`:288`, `:290`) | `recorded_at: timestamp`, `valid_from ?? timestamp` | decided; staged |
| D3 | `src/DatomicStorageAdapter.ts:336-349` (`:347`) | claim timestamp | decided |
| D4 | `src/DatomicStorageAdapter.ts:357-372` (`:368`) | `retracted_at: timestamp` | decided |
| D5 | `src/DatomicStorageAdapter.ts:95-160` (`:119-127`) | transact payload | add `stampUs` |
| D6 | `gateway/.../storage.clj:62-94` (`:70-73`) | tx metadata `:recorded-at` from the first row, else the first claim, else `(double (System/currentTimeMillis))` | decided; the gateway clock fallback goes |
| D7 | `gateway/.../storage.clj:47-61` (`:51`, `:56`), `:86` | `:f/recorded-at` when it differs from the tx value; `:f/retracted-at` | decided |
| D8 | `gateway/.../storage.clj:76-79` | `:db/cas` on `:triplex.scope/position`; `:triplex.tx/recorded-at` | also set `:triplex.scope/stamp` |
| D9 | `gateway/.../storage.clj:115-118` | `operation` receipt returns position and t | add the stamp (lost ACK) |
| D10 | `gateway/.../storage.clj:158-180, 196-199`, `src/rows.ts:160-169`, `src/DatomicStorageAdapter.ts:390-432` | row decode and visibility by `recorded_at` | reader; add the watermark gate |
| D11 | `gateway/.../schema.clj` | `:f/recorded-at`, `:f/retracted-at`, `:triplex.tx/recorded-at` are `:db.type/double` | unchanged; add `:triplex.scope/stamp` (long, microseconds) |

### 1.8 Oracles, fixtures and workloads

| # | Location | Use | Needs |
| --- | --- | --- | --- |
| O1 | `lab/oracles/replay/run.py:239-244` | `_instant`: receipt instant, else the command's declared `clock` | split: validFrom default from `stagedAt` or `clock`; record cut from the receipt instant |
| O2 | `run.py:261-268` | synthesized instant `float(position)` when no receipt | already strictly increasing in position |
| O3 | `run.py:288-294` | `engine.plan(state, command, instant)`: default validFrom | staged (R-CMD-3 changes) |
| O4 | `run.py:447`, `:489-492`; `RULES.md` R-RCP-7 (line 142) | declared clock must equal the receipt instant; instants need not be non-decreasing | rewritten (section 4.3) |
| O5 | `RULES.md` R-CMD-3 (line 107), R-JNL-5 (line 166) | omitted validFrom = the transaction instant; journal facts valid from the commit instant | staged |
| O6 | `RULES.md` R-CUT-1 (line 149) | known at (P, R) iff position <= P and instant <= R | unchanged |
| O7 | `lab/oracles/replay/selfcheck.py:74-76, 140-142`, `selfcheck_fixtures/`, `tests/` | fixture clocks and receipt instants | regenerate where two commits share an instant or instants decrease |
| O8 | `lab/acceptance/golden/g9-history-cuts.json` G9-CUT-02 | two commits at instant 500 ("P separates them, R cannot") | rewrite (section 4.2); the only golden vector with a shared or decreasing instant (all 49 scanned) |
| O9 | `packages/qualification/workloads/runner.ts:186, 241, 816-817`; `src/native/xtdb-workloads.ts:113`, `qlever-workloads.ts:91`, `qlever-recursion.ts:64` | one transaction per knowledge group at deterministic `startTime = 1000 + group`; reads at `recordedAt = 1000 + known_at` | unchanged on clock-driven lanes (stamps equal the group clocks); P2X needs the receipt-instant map (section 4.2) |
| O10 | `packages/testkit/src/index.ts:1747-1748, 2624-2627` | requires a `:_tx/instant` journal datom; retracts it to test E-RESERVED | use `:_tx/position` |
| O11 | `packages/testkit/src/index.ts:1829` | `assertion.validFrom === committed.instant` (TK-JOURNAL) | `=== committed.stagedAt` |
| O12 | `packages/testkit/src/index.ts:273-290, 1821-1822, 2708` | reads at a returned `recordedAt`; `retractedAt === committed.instant` | unchanged (decided values, T <= W) |
| O13 | `core/test/runtime/runtime.test.ts:59`, `read-basis.test.ts:43`, `dashboard/src/main.test.ts:280` | exact instant expectations | `runtime.test.ts:59` holds for the first commit only; check the others |
| O14 | `.claude/worktrees/rq01/packages/testkit/test/route-equivalence.test.ts:96-120` | D-C1 known-failing case: the history dictates `instant: 1000` at position 2048 after `1001` at 1024 | flips (section 6.3) |

---

## 2. The stamp mechanism

### 2.1 Rules that hold on every lane

| ID | Rule |
| --- | --- |
| S1 resolution | A record stamp is an integer number of epoch microseconds, a safe integer below `2^43 * 1000` (2248-09). Deciders compute, compare and persist stamps as integers. |
| S2 stamp function | `stamp = max(previous + 1, clockUs)`, where `previous` is the stamp of the transaction directly before this one in the scope's position order (0 for a fresh scope) and `clockUs = stampCut(clock)`. |
| S3 decision unit | One stamp per top-level transaction (one outermost `withTransaction` commit: one broker frame member, one XTDB transaction, one Datomic `d/transact`). Every ordinal of that transaction, every row it writes, every row it retracts and every claim it reserves carries that stamp. No two transactions in a scope share a stamp. |
| S4 public value | Every public and row-level record time is `instantOf(stamp) = stamp / 1000` (a JS number of epoch milliseconds). `TripleRow.recorded_at`, `retracted_at`, `Triple.recordedAt`, `retractedAt`, `TransactionResult.instant`, `TransactionRecord.instant`, change `recordedAt` / `retractedAt` all use it. |
| S5 valid time | `stagedAt` (the runtime clock read when `transact` starts, C1) is the default `validFrom` of every row the transaction asserts (including journal rows) and the constraint-evaluation instant. It is reported as `TransactionResult.stagedAt`. Valid time never reads the stamp. |
| S6 clock lead | A decider that receives its clock from another process (broker over HTTP, Datomic gateway) refuses a transaction whose `stagedAt` is more than `maxClockLeadMs` (default 5,000) ahead of its own clock, with a typed `WriteError` (reason `clock-lead`). A clock behind is accepted (the stamp is then `previous + 1`). |
| S7 legacy | An adapter without the new members keeps today's behavior (`instant = stagedAt`, no watermark) and does not declare `recordTime: "decided"`. Only adapters that declare it are held to the record-time obligations. |

**Why microseconds and not milliseconds.** The table compares the two choices that keep stamps strictly increasing.

| Question | Integer milliseconds, `previous + 1 ms` | Integer microseconds, `previous + 1 us` (chosen) |
| --- | --- | --- |
| Public type change | none | none (`stamp / 1000` is a JS number) |
| XTDB P2X | its engine stamp is microseconds; strict milliseconds need an in-transaction read of a scope-wide row (the hot row P2X removed), or else ties across transactions | the engine stamp is already strictly increasing at this resolution: zero extra reads |
| Ties and the watermark | strict, but only if every lane serializes per scope | strict on every lane |
| Drift ahead of the wall clock | starts above 1,000 decisions per second per scope (a bulk import can reach it) | starts above 1,000,000 per second |
| Exactness of the public number | integer | `stamp / 1000` is not a decimal fraction in binary64, but it is the correctly rounded quotient, the map is strictly increasing and invertible below `2^43` ms, and JS, Java and Python give the same bits |

**The numeric helpers** (new module `packages/core/src/storage/RecordStamp.ts`, exported for adapters, oracles' TypeScript fold and the
harness):

| Helper | Definition | Note |
| --- | --- | --- |
| `instantOf(stamp)` | `stamp / 1000` | refuse a non-safe-integer or `stamp >= 2^43 * 1000` |
| `stampOf(instant)` | the integer `u` with `u / 1000 === instant`: `u = Math.round(instant * 1000)`, then check `u / 1000 === instant`, else try `u - 1` and `u + 1`, else `RangeError` | exact inverse; the plain `Math.round` alone is only guaranteed until about 2041 |
| `stampCut(t)` | the largest integer `u` with `u / 1000 <= t`: start at `Math.floor(t * 1000)`, step up while `(u + 1) / 1000 <= t`, step down while `u / 1000 > t` | the record cut of a public `recordedAt`; division by 1000 is monotone, so `recorded_at <= t` iff `stamp <= stampCut(t)` |
| `nextStamp(previous, clock)` | `Math.max(previous + 1, stampCut(clock))` | S2 |
| `STAMP_PLACEHOLDER` | `-(2 ** 52)` | the instant written into staged rows by deferred adapters; negative, so never a decided instant |

Why the map is safe: two stamps differ by at least 1 us, so their quotients differ by at least 0.001 ms, while one ulp of a binary64
near `2^43` ms is `2^-10` ms (0.00098 ms). Each quotient is within half an ulp of the true value, so distinct stamps give distinct,
correctly ordered numbers below `2^43` ms. Python's `/`, Java's `/` on doubles and JS's `/` are all IEEE correctly rounded.

### 2.2 Why this makes a record-time cut a prefix of the log

Let the decided transactions of a scope be `t1, t2, ...` in position order with stamps `s1 < s2 < ...` (S2, S3). A row asserted by
`ti` has `recorded_at = instantOf(si)`; a row retracted by `tj` has `retracted_at = instantOf(sj)`.

1. For a cut `c = stampCut(T)`, the transactions with `s <= c` are exactly `t1 .. tk` for some k: a prefix.
2. The visibility predicate at `(V, T)` (R31 section 1) therefore shows exactly the effects of `t1 .. tk`.
3. If `c <= W` (the stamp of the latest decided transaction, section 3), then `tk` is already decided, and every transaction decided
   later has a stamp above W, so above c. The set `t1 .. tk` can never grow. The answer at T is final.
4. With a named position P as well (TP), visibility conjoins `position <= P`, which keeps a prefix: `t1 .. t(min(k, index of P))`.
   Interior ordinals of one transaction share its stamp, so T includes all of a transaction or none of it; only P cuts inside one.

This is R31's `P* = min(P, pos(T))` result, and it holds for every route that filters rows by both fields (the E\* routes of R31
section 3.1) without any route change.

### 2.3 Core protocol

New optional members of `StorageAdapterService` (`packages/core/src/storage/StorageAdapter.ts`). All are optional so the
inherited adapters keep compiling and behaving as today (S7).

```ts
export interface CommitStamp {
  /** The record instant for every row this transaction writes: decided now, or STAMP_PLACEHOLDER until decision. */
  readonly instant: number;
  readonly decided: boolean;
}
/** The head position and the record-time watermark, read from one snapshot. */
export interface RecordCut {
  readonly position: number;
  /** instantOf(W): the stamp of the latest decided transaction (or seal, round 2). */
  readonly recordedAt: number;
}

export interface StorageAdapterService {
  // ...existing members...
  /** Declares that this adapter stamps record time at decision (R33). Absent: legacy staged stamps. */
  readonly recordTime?: "decided";
  /**
   * Called inside withTransaction, once per outermost transaction; nested transacts get the same value.
   * Serialized adapters return the decided stamp computed from the source cut; deferred adapters return
   * STAMP_PLACEHOLDER and remember stagedAt for their decider.
   */
  readonly commitStamp?: (stagedAt: number) => Effect.Effect<CommitStamp, WriteError>;
  /** Head position and watermark from one snapshot (pagination first pages, the gate). */
  readonly currentCut?: () => Effect.Effect<RecordCut, ReadError>;
}
```

`transact` (`TriplesLive.ts:253-523`) becomes, in order:

1. `txId = nextTxId`; `stagedAt = now` (C1).
2. `stamp = adapter.commitStamp ? commitStamp(stagedAt) : { instant: stagedAt, decided: true }`.
3. `claimCommand(commandId, txId, stamp.instant)` (C2); `position = nextCommitPosition()` (`:326`).
4. Preconditions unchanged. Constraints at `stagedAt` (C3, C4).
5. Every assert input gets `validFrom: op.validFrom ?? stagedAt` before `insert` / `batchInsert`, which receive `stamp.instant` (C5).
   Every `retract` receives `stamp.instant` (C7).
6. Journal facts from `metadataInputs(txId, position, meta, changes)` with no `:_tx/instant` (C9), each with
   `validFrom: stagedAt`, inserted with `stamp.instant`.
7. Return `{ txId, position, instant: stamp.instant, stagedAt, triples, retracted }` (C10).

The read gate is a core helper the adapters call at their basis-resolution points (section 3.3):
`gateRecordedAt(recordedAt, readCut, awaitCut, deadlineMs)`. Core itself calls `currentCut()` for pagination (C17).

### 2.4 Deferred adapters: placeholders and binding

The broker and P2X cannot know the stamp until the decision, exactly as they cannot know positions. They reuse the position pattern.

1. **Placeholder.** `commitStamp` returns `STAMP_PLACEHOLDER`. Staged rows carry it in `recorded_at` (fresh rows) or `retracted_at`
   (retracting rows); staged claims carry it as their timestamp.
2. **Rewrite at decision.** The decider replaces every placeholder with `instantOf(stamp)` (broker `finalize`, P2X stamp cells).
   A fresh row whose `recorded_at` is not the placeholder, or a retracting row whose `retracted_at` is not, is refused
   (`BrokerInvalidTransaction`, as `broker.ts:586-592` does for positions).
3. **Leak check.** A placeholder found anywhere else (a value column, `valid_from`, `valid_to`, or JSON text) is refused with
   "A placeholder commit instant escaped into a fact value", as `broker.ts:596-601` does for positions. The case: a nested
   `transact` returns its result (with the placeholder `instant`) to the outer callback, which writes it into a fact.
4. **Binding the result.** A new core helper `bindCommit(value, { positions, instant })` replaces both adapters' `bindPositions`
   (`BrokerStorageAdapter.ts:163-185`; the P2X copy). It walks plain objects and arrays to depth 4 and rewrites `position` fields
   found in the map, and `instant` and `recordedAt` fields equal to `STAMP_PLACEHOLDER`. Depth 4 covers
   `TransactionResult.triples[i].recordedAt` inside a callback's returned object.
5. **Change JSON.** Section 2.10 keeps the placeholder out of journal values altogether, so no JSON rewrite is needed.

### 2.5 QLever broker (deferred; decided under the writer lock)

Where: `broker.ts` `commitGroup` (`:408-550`) and `finalize` (`:571-628`), on `exp/SQL01-broker-sqlite`.

1. `BrokerTransaction` gains `stagedAt` (from the adapter's transaction state, set by `commitStamp`).
2. In `commitGroup`, `staged` gains `stamp`, initialized to `this.headStamp`. For each member that passes `check`, in queue order:
   refuse it if `txn.stagedAt > Date.now() + maxClockLeadMs` (S6; `BrokerInvalidTransaction`, rejected like an oversized member);
   else `stamp = nextStamp(staged.stamp, txn.stagedAt)`; `finalize(txn, lsn, ordinal, stamp)`; `staged.stamp = stamp`.
3. `finalize` rewrites fresh rows' `recorded_at`, retracting rows' `retracted_at` and claims' `timestamp` to `instantOf(stamp)`
   (section 2.4 items 2 and 3) and sets `member.stamp = stamp`.
4. Durable record: commit-group payload `v: 2` adds the member stamp (wire field `t`, integer microseconds; `frames.ts:38-86`).
   The `operations` receipt (`sqlite-worker.ts:126`) adds `stamp`; the `marker` row (`sqlite-worker.ts:59, 139`) adds the head
   stamp next to `position`. Recovery sets `headStamp` from the marker, cross-checked against the last frame. A scope whose log holds
   `v: 1` frames refuses to start in decided mode (`MigrationError`, "scope predates decided record stamps; re-seed"); lab scopes are
   fresh per run, so no migration code is written.
5. `record(members)` (`broker.ts:343-348`) also advances `headStamp`; `publishWatermark` (`:510`) publishes it with the position.
6. Lost ACK: the replay branch (`broker.ts:442-455`) returns `stamp: previous.stamp` next to the original positions, so a resend
   gets the original instant (TARGETS 1 P2 "the original receipt 100% of the time").
7. `BrokerDecision` `committed` gains `stamp`; the adapter binds `instant = instantOf(stamp)` with `bindCommit`.

**Monotonicity proof.** `pump` runs one `commitGroup` at a time (`this.deciding`, `broker.ts:391-406`), and the lock on
`broker.lock` (Q84a) keeps a second writer process out. Inside a group, members are taken in queue order and get ordinals
`base + ...` in that order (`:425-471`) and stamps from `staged.stamp` in the same order, so stamps and positions rise together.
Across groups, `headStamp` is advanced in `record` after the fsync and before the next group starts. A group that fails its fsync
fails the broker, and none of its stamps was published, so recovery from the durable log restarts from the last published stamp.
A clock that steps backwards cannot lower a stamp, because `previous + 1` wins. Ties are impossible: each member's stamp is at least
the previous member's plus 1.

### 2.6 QLever A0 (serialized; decided at staging)

`QleverStorageAdapter.ts` commits through one guarded SPARQL update that checks the scope's position (`:216-230`). The scope marker
gains a `stamp` field (integer microseconds, written with `integerOrderKey` like other exact integers). At begin the adapter reads
`(position, stamp)`; `commitStamp(stagedAt)` returns `nextStamp(stamp, stagedAt)` as decided; the update guards both old values and
writes both new ones; the claim triple (`:206`), `recorded_at` (`:376`) and `retracted_at` (`:469`) get the stamp. Proof: the guard
admits the update only when the scope is still at the source cut whose stamp was read, so the new stamp is above the previous
transaction's. QLever A0 is a frozen control (Q46b); this is a correctness change with a re-freeze, as Q72d did for the broker
option.

### 2.7 XTDB

**A0, `scope-counter` (serialized; decided at staging).**

1. `committedPosition` (`XtdbStorageAdapter.ts:92-104`) reads `SELECT position, stamp FROM tx_meta ...` in its one query; a scope
   with a position and no stamp is a legacy scope (`MigrationError`).
2. Transaction state keeps `sourceStamp`; `commitStamp(stagedAt)` returns `nextStamp(sourceStamp, stagedAt)`, decided, memoized.
3. `persist` (`:187-260`) writes `tx_meta (_id, scope_key, position, stamp)` and `tx_attempts.stamp`; `tx_claims.recorded_at` gets
   the instant. The CAS assertion checks both `position = K` and `stamp = S`, so that round 2's seals, which move the stamp
   without a position, are serialized by the same guard.
4. Rows carry `recorded_at` and `retracted_at` as JS numbers, as today; XTDB already stores fractional numeric coordinates
   (`native/Sources.ts:84-86`). One test must show that a column holding both integer-valued and fractional values compares correctly
   against a fractional parameter in SQL and XTQL.

**Why A0 does not use `CURRENT_TIMESTAMP`.** Ruling Q89a names the engine stamp for XTDB. For A0 the client stamp is better on every
count the lab measures:

| Question | `CURRENT_TIMESTAMP` on A0 | client stamp under the existing CAS (chosen) |
| --- | --- | --- |
| Extra engine work | needs P2X's stamped-insert projection (`:107-138`), which is not on main | none; one more column in an existing query and write |
| Deterministic fixtures | stamps become engine time; every qualification workload and golden vector needs instant mapping on the default XTDB path | stamps equal the fixture clocks (section 4) |
| Strictness | engine guarantee | CAS guarantee |
| Frozen-control drift (Q46b) | changes A0's statement shapes | changes one column |

Engine stamps stay available to A0 later as a measured option once P2X merges.

**P2X, `subject-stamp` (deferred; decided by the indexer).**

1. Record time is the transaction's own engine stamp: `instantOf(COMMIT_STAMP_SQL)`. `stagedAt` only sets valid-time defaults.
2. A new stamp form `instant` (next to `position`, `raw`, `number-identity`, `:93-138`) fills `recorded_at` of fresh rows,
   `retracted_at` of retracting rows (XP3) and `tx_claims.recorded_at` (XP4).
3. **Probe p9-stamp-ms first.** P2X's probe p0 found `CAST(... AS BIGINT)` unsupported. The builder must find an XTDB 2.2.0 SQL
   expression whose stored value equals JS `stamp / 1000` bit for bit (candidates: `COMMIT_STAMP_SQL / 1000.0`,
   `CAST(COMMIT_STAMP_SQL AS DOUBLE PRECISION) / CAST(1000 AS DOUBLE PRECISION)`), checked over at least 10,000 committed
   transactions against `tx_attempts.stamp` (raw, already stored), plus the comparison of item 4 above. If none passes, both XTDB
   arms store integer microseconds in `recorded_at` and `retracted_at` instead, and the adapter and the native layer convert with
   `instantOf` and `stampCut`; the same unit on both arms keeps raw native queries consistent.
4. Watermark (section 3): `W = POSITION_BASE_US + floor(tx_meta.position / 8)`, exact because a position is
   `(stamp - BASE) * 8 + ordinal` with `ordinal < 8` (`:79-90`).
5. Result: `persistStamped` already resolves to the stamp; bind with `bindCommit(result, { positions, instant: instantOf(stamp) })`.
   Replays read `tx_attempts.stamp` (XP8).

**Monotonicity proof (P2X).** XTDB applies transactions serially in log order and gives each one a system time strictly later than
the latest completed one, bumping by 1 us when the clock has not advanced (`TxResolver.kt:204-246 @ c6c1962`); DML runs with
`currentTime = systemTime`, so every stamp cell in a transaction holds that system time. Probe p1-stamp-order measured 320 concurrent
commits with distinct, strictly increasing stamps in tx-id order. Positions are a strictly increasing function of (stamp, ordinal), so
stamps rise with position. This holds across scopes on one node too.

### 2.8 Datomic DA01 (serialized; decided at staging, validated by the gateway)

1. `begin` (`main.clj:12`, `DatomicStorageAdapter.ts:225-236`) returns `{ handle, position, stamp }`, with `stamp` read from a new
   attribute `:triplex.scope/stamp` (long, microseconds; 0 for a fresh scope) in the held db.
2. `commitStamp(stagedAt)` returns `nextStamp(stamp, stagedAt)` as decided; insert, retract and claims use it (D2 to D4); the commit
   payload carries `stampUs` (D5).
3. Gateway `tx-data` (`storage.clj:62-94`): refuse unless `stampUs > (:triplex.scope/stamp scope)` in the commit's db and
   `stampUs <= gatewayClockUs + maxClockLeadUs` (S6); add `[:db/cas scope :triplex.scope/stamp prev stampUs]` next to the position
   CAS; set `:triplex.tx/recorded-at (/ (double stampUs) 1000.0)`; refuse a fresh row whose `recorded_at`, or a retracting row whose
   `retracted_at`, differs from that value; delete the `System/currentTimeMillis` fallback (`:72`). Fresh rows then always match the
   transaction value, so `:f/recorded-at` (`:51`) is never written.
4. `operation` (`storage.clj:115-118`) returns `stamp` (from `:triplex.tx/recorded-at`) for lost-ACK receipts.

**Why not `:db/txInstant`.** It has millisecond resolution, Datomic only keeps it non-decreasing (two transactions may share one), the
transaction's own rows cannot carry it (they are written in the same transaction), and it ignores the deterministic clock.
**Why not a transaction function.** While DA01 serializes per scope with `:db/cas`, the peer already knows the previous stamp, so a
transactor function adds deployment surface and nothing else. It becomes the mechanism if lane D moves to per-subject CAS: a
classpath function that reads `:triplex.scope/stamp` in the transactor and rewrites placeholder rows, mirroring the broker.

**Monotonicity proof.** The transactor applies transactions serially. `[:db/cas scope :triplex.scope/position sourceK position]`
admits a commit only when the scope is still at the source cut read at begin, and the stamp was computed from that cut's stamp, so it
is above the previous transaction's; the gateway's own check and the second CAS enforce the same fact on the server side. Ties are
impossible.

### 2.9 Inherited adapters and the KV runtime

SQLite, Postgres, DuckDB, Cloudflare, FoundationDB and the KV runtime (`KvTriplesLive.ts:630`) are not lanes (SCOPE 4.3). They keep
staged stamps (S7). The SQLite adapter could adopt the serialized pattern in a few lines later; nothing in this design needs it.

### 2.10 Journal values hold no record instant

Two journal values carry the transaction's own instant today: `:_tx/instant` (`transactionMetadata.ts:44`) and, inside each
`:_tx/change` JSON, `recordedAt` of asserted rows and `retractedAt` of retractions (`:23-24`). On deferred lanes those are
placeholders inside fact values, and on P2X rewriting them would need SQL text building of JS number spellings. The design removes
both instead:

1. `:_tx/instant` is no longer written. `TransactionRecord.instant` is the `recordedAt` of the record's `:_tx/position` row (it is
   written by the same transaction, so it carries the stamp); records without it fall back to `:_tx/instant` (C12).
2. Change JSON format v2 omits `recordedAt` on `assert` changes and `retractedAt` on `retract` changes when they equal the
   transaction's own instant, which after this change is always. `decodeChange` (`:66-103`) fills both from the record's instant.
   `recordedAt` of a retracted older row stays in the JSON (it was decided by an earlier transaction). `TransactionRecord.changes`
   keeps its shape, so R-JNL-1 output is unchanged; the raw `:_tx/change` fact value changes shape (R-JNL-5, section 4.3).

### 2.11 Clock behavior and skew

| Situation | Effect | Acceptable because |
| --- | --- | --- |
| Clock steps back | stamp is `previous + 1`; record time runs a little ahead of the wall clock until it catches up | order and the watermark hold; drift is bounded by the step |
| Many commits in one ms | stamps `c, c + 1 us, c + 2 us, ...` | strictly increasing; drift is microseconds |
| P2X engine clock ahead of the client | `recordedAt` above `stagedAt` by the skew | valid time uses `stagedAt`, so a read at a client-clock `validAt` still sees the commit |
| P2X engine clock behind the client | `validFrom` above `recordedAt` by the skew | a fact valid from a moment after it was recorded is ordinary bitemporal data |
| A remote client far ahead (broker HTTP, Datomic) | refused by S6 | otherwise one client would push the scope's record clock forward for everyone |

---

## 3. The record-time watermark

### 3.1 Definition and the gate

**Watermark.** `W(scope)` is the stamp of the latest decided transaction of the scope (in round 2, of the latest decided transaction
or seal). It is published at the same point the position is published (after the decision is durable and readable, Q31e), never
earlier. By S2 and S3 every transaction decided later has a stamp above W.

**Gate.** A read whose basis names `recordedAt = T`:

1. Let `c = stampCut(T)`. Read the cut `(head, W)` from the route's decider (section 3.2).
2. If `c <= W`: answer. The adapter pins the read to `recordedPosition = min(P, head)` if it has no position, so a read that takes
   several requests uses one cut (this also closes the T-shaped half of D-D1 on Datomic).
3. If `T > wallClock + deadline`: refuse now. Waiting cannot help: a commit decided within the deadline carries a stamp that far
   ahead only if some clock runs ahead by more than the deadline, which S6 refuses on remote-clock deciders.
4. Otherwise wait for W to reach c (the decider's existing wait primitive, woken on publication), up to `basisWaitMs` (default
   2,000 ms, Q58a), then refuse.
5. Refusal is the typed `BasisNotAvailable` (section 3.4). Never an empty result, never an answer from a later cut.

**Why the gate is enough for reproducibility.** On the routes that filter rows by both fields (R31's E and E\* routes), the answer
at `c <= W` is the prefix `t1 .. tk` (section 2.2) and no later transaction can enter it. A position named with T is checked by the
existing future-position rules first.

**Why reading the cut and then the rows is safe.** W only grows, and each lane's later read sees at least what the cut read saw
(broker: `b = head()` at read time is at least the head at gate time; XTDB single node: a later query reads a basis at least as new;
Datomic: the gate and the read run on one db value inside one gateway request). For an XTDB follower (EXP-X05) the read must carry
the leader's token, as X05 already does.

### 3.2 Per lane and route

| Lane | Routes (R31 section 2) | W source | Where the gate goes | Same snapshot as the answer |
| --- | --- | --- | --- | --- |
| QLever broker | Q1 to Q8, Q12 | `broker.headStamp` (memory, durable in the marker) | `queryRows` basis resolution (`BrokerStorageAdapter.ts:239-283`), `dependencyState` (`:548-604`), the Datalog `BasisGate` (`:606-617`), native contexts | decider-side: the broker is the decider; replica lag is then handled by the position machinery (`awaitResolved`, overlay, log) |
| QLever A0 | Q9 to Q11 | scope marker `stamp` | `QleverStorageAdapter` reads, `TemporalQueries.ts:110-122`, native | the marker is returned in the same SPARQL request as the rows (as Q67c already does for position) |
| XTDB A0 | X1, X3 to X7, X10 | `tx_meta.stamp` | `queryRows` (`:111-180`), `XtdbQueryExecutor.ts:165-185` (where the position is resolved once), `native/NativeQueries.ts:66-85`, `TemporalQueries.ts:85-111`, `MaintainedQueries.ts:85-120`, `dependencyState` (`:560-610`) | separate point lookup on `tx_meta` before the answer; safe on one node (3.1) |
| XTDB P2X | X8 and the A0 read routes | `BASE + floor(tx_meta.position / 8)` | same code as A0 (shared adapter) | as A0 |
| Datomic | D1 to D9 | `:triplex.scope/stamp` in the request's db value | gateway `read-rows` and `/q` entry (`storage.clj:152-156` next to `await-position`), so every route inherits it | yes: one db value per request; multi-request Datalog pins the cut once (Q89d) |

The broker's offline outage routes (Q4 H1, Q5 source rows) inherit the gate from `queryRows`. H1 still refuses T-shaped bases
until round 2 (Q89b stands).

### 3.3 The helper

```ts
// packages/core/src/storage/RecordStamp.ts
export const gateRecordedAt: (input: {
  readonly recordedAt: number;
  readonly readCut: () => Promise<RecordCut>;           // the decider's (head, W)
  readonly awaitCut: (stamp: number, deadlineMs: number) => Promise<RecordCut>; // resolves when W >= stamp
  readonly deadlineMs: number;
  readonly surface: string;
}) => Promise<RecordCut>; // or throws BasisNotAvailable({ axis: "recordedAt", ... })
```

Each lane wraps its own wait primitive: the broker's publication waiters (`awaitResolved` style), a poll of `tx_meta` with the
existing 10 ms wait step (Q31d) on XTDB, `await-position`'s refresh loop on Datomic.

### 3.4 Typed refusal (Q89c)

A core tagged error, which Q67h already requires before the broker can become a default:

```ts
export class BasisNotAvailable extends Schema.TaggedError<BasisNotAvailable>()("BasisNotAvailable", {
  axis: Schema.Literals(["recordedPosition", "recordedAt"]),
  required: Schema.Number,      // the position, or the requested recordedAt
  observed: Schema.Number,      // the head position, or instantOf(W)
  waitedMs: Schema.Number,
  surface: Schema.String,       // "repository" | "datalog" | "dependency-state" | "native" | ...
  message: Schema.String,
}) {}
```

The contract's error id is the existing E-BASIS-NOT-AVAILABLE with a new detail `record-time-not-reached`. The QLever broker's
`BasisNotAvailable` (`broker/errors.ts`) becomes a subclass or is replaced; Q72c's reason strings stay. RQ01's allow-list
(`route-equivalence.ts:29-33`) already contains the tag.

### 3.5 What a round-1 gate refuses that it should not

On an idle scope, a read at a past T after the last commit (`W < c <= now`) waits 2 s and is refused, although its answer is
well defined. Who issues such reads:

| Caller | Today | After round 1 |
| --- | --- | --- |
| Pagination first pages (`Pagination.ts:258`, `EntityPage.ts:144`) | bind `recordedAt = client now` | bind `instantOf(W)` from `currentCut` (C17): never refused |
| A read at a receipt instant | n/a | `c <= W` at once on the deciding node: never waits |
| An audit at a past T on a busy scope (GS.12) | answered | answered (`W` is newer than T) |
| An audit at a past T on a scope idle since before T | answered (and could change later: D-C1) | refused after 2 s until round 2 seals |
| `recordedAt: Date.now()` meaning "latest" | answered (not reproducible) | refused after 2 s; callers should omit `recordedAt` (latest) or pin a receipt instant |

No existing core read passes `Date.now()` as `recordedAt` (searched: `core/test/change-emission-capability.test.ts:27` builds a
change event, `core/test/kv/layers/KvTriples.store.test.ts:344` uses the KV runtime).

### 3.6 Round 2: seals

A seal is a decision with no rows and no position that only advances the stamp: `stamp = max(W + 1, deciderClockUs)`. A waiting gate
asks for one when `W < c <= deciderClock`; seals are coalesced (one in flight per scope) and written only when no commit is queued,
because a commit decided after the request already has a stamp at or above the clock.

| Lane | Seal | Cost |
| --- | --- | --- |
| QLever broker | a `STAMP_SEAL` frame kind (no members, no position) in the next group; recovery takes `max` over commit and seal stamps; the feed ignores it | one fsync, only when idle |
| QLever A0 | guarded update of the marker stamp only | one update |
| XTDB A0 | assert `position = K` and `stamp = S`; write `tx_meta (K, s)` | one transaction |
| XTDB P2X | the seal must not change `tx_meta.position`, so P2X adds a `tx_meta.stamp` column (raw form) and derives W from it; a seal writes it with `INSERT ... SELECT` from the current row inside the transaction | one transaction; the engine stamp of any later transaction on the node is also above it |
| Datomic | `[[:db/cas scope :triplex.scope/stamp W s]]` | one transaction |

A seal's stamp must come from the decider's own clock, not a reader's. Deterministic runtimes never seal (their tests must not
depend on it).

### 3.7 Round 2: reduce T to a position and lift Q89b

With every row in a scope stamped by S2, `recorded_at <= T` iff `recorded_position <= pos(c)`, where `pos(c)` is the last position of
the last transaction with stamp `<= c`. Then a position-only store (H1, Datomic `:f/live` as-of, R24's current structure, an XTDB
`current_*` table) answers T and TP exactly as `P* = min(P, pos(c))` (R31 3.2 item 4). Lookups:

| Lane | `pos(c)` |
| --- | --- |
| QLever broker | `tx_stamps(stamp INTEGER PRIMARY KEY, position INTEGER)` in `broker.db`, written in the commit's own SQLite transaction (Q84d pattern); `SELECT position ... WHERE stamp <= ? ORDER BY stamp DESC LIMIT 1` |
| Datomic | `:triplex.tx/recorded-at` with `:db/index true`; `(d/index-range db :triplex.tx/recorded-at nil t)` read backwards, as D-D4's fix seeks positions |
| XTDB | not needed: its routes hold every row version and filter by T directly |

Precondition: a scope-level marker `recordStamps: "decided-v1"` written at scope creation; a store refuses the reduction for a
scope without it. Q89b is lifted per store only when the route-equivalence harness shows HE-1 to HE-5 for T and TP on that store.

---

## 4. Determinism, fixtures and oracles

### 4.1 Deterministic runtimes

`DeterministicRuntimeClockLive` returns one fixed `startTime` (`RuntimeServices.ts:40-43`). Under S2 on a clock-driven lane (every
lane but P2X) the n-th transaction of a fresh scope gets `stamp = stampCut(startTime) + (n - 1)`. Consequences:

| Item | Before | After |
| --- | --- | --- |
| Receipt `instant` in one deterministic runtime | `startTime` for every commit (R-RCP-7) | `startTime`, `startTime + 0.001`, `+ 0.002`, ...: deterministic, distinct |
| `stagedAt` | n/a | `startTime` for every commit |
| Default `validFrom` | `startTime` | `startTime` (unchanged) |
| Runs repeated with the same seed | identical | identical (byte-identical receipts is a gate, section 6) |
| Cross-lane comparison (broker, XTDB A0, QLever A0, Datomic) | identical instants | identical stamps |
| P2X | instants were `startTime` | engine time; compared through the reference-stamp map (4.2) |

A fixture that gives each command its own runtime with a strictly increasing `startTime` (the qualification runner,
`runner.ts:816-817`) gets stamps equal to those clocks, because `previous + 1` never wins.

### 4.2 Fixtures

1. **Reference stamps.** For any fixture with declared clocks `k1, k2, ...` in command order, its reference stamps are
   `r_i = nextStamp(r_(i-1), k_i)`. A clock-driven lane must reproduce them exactly. A fixture read at a declared record time R means
   the cut `stampCut(R)` over the reference stamps. For P2X (engine stamps), the driver maps R to the receipt instant of the last
   command whose reference stamp is `<= stampCut(R)`, so P2X answers the same question. The map is exact because both stamp
   sequences are strictly increasing in command order.
2. **Golden vectors.** All 49 were scanned. Only G9-CUT-02 has two commits at one instant (D1 and D2 at 500, "P separates them, R
   cannot"). Under S3 that history cannot occur. Rewrite it as "R separates commits that share a staged clock": D1 at 500 (reference
   stamp 500.000), D2 staged at 500 (reference stamp 500.001); Q1 at `recordedAt: 500` expects `[B1]` (B1 is not yet retracted);
   a new Q1b at `500.001` expects `[B2]`; Q2 at `499.99999999999994` still expects `[]`; B1.raw's `retractedAt` becomes `500.001`;
   B2's `recordedAt` becomes `500.001`; Q4 (`queryAll` at `recordedAt: 500` with `includeBasis`) expects `[{ ?v: "x" }]` and still echoes the head position `$pos:D2` with `recordedAt: 500`. The killed
   mutants M-CUT-OFF-BY-ONE and M-FUTURE-RETIREMENT still apply. The other 48 vectors use strictly increasing instants and are
   unchanged on clock-driven lanes.
3. **Qualification workloads** (`runner.ts`, `src/native/*-workloads.ts`, `qlever-recursion.ts`): one transaction per knowledge
   group at `startTime = 1000 + group`, strictly increasing, so stamps equal `1000 + group` and the reads at `1000 + known_at`
   are unchanged. The mapping note at `runner.ts:186` gains one sentence. A P2X run of these workloads needs the reference-stamp
   map; record the receipt instant per group next to `actualPosition` (`runner.ts:834-842`).
4. **O-REPLAY fixtures** (`selfcheck_fixtures/`, `tests/`): every case where two committed receipts in one scope share an instant
   or instants decrease with position becomes either a negative case for the new rule R-RCP-9 or is regenerated with reference
   stamps. The builder lists them with a scan like the golden scan above.
5. **RQ01 offline fixtures**: section 6.3.

### 4.3 O-REPLAY changes (0.4.9 to 0.5.0)

| Rule | Today | 0.5.0 |
| --- | --- | --- |
| R-CMD-3 | omitted `validFrom` = the transaction instant | omitted `validFrom` = the receipt's `stagedAt` (or the command's declared `clock`) |
| R-RCP-7 | a declared deterministic `clock` equals the receipt instant; instants need not be non-decreasing | a declared `clock` equals the receipt's `stagedAt`; on a lane declared clock-driven, the receipt instant equals the reference stamp |
| R-RCP-9 (new) | n/a | per scope, committed receipts of distinct transactions have strictly increasing instants in position order; interior ordinals of one transaction share it; a lost-ACK replay has the original instant |
| R-CUT-6 (new) | n/a | when a case records a read's start (head position at read start), an answer at `recordedAt = R` is valid only if every command with instant `<= R` published before the read started; otherwise the expected outcome is E-BASIS-NOT-AVAILABLE. This rule catches D-C1 directly |
| R-JNL-5 | journal facts valid from the commit instant | journal facts valid from `stagedAt`; the raw `:_tx/change` value omits the transaction's own instants (format v2) |
| R-JNL-6 | `:_tx/instant` not modeled | `:_tx/instant` is no longer written; a pattern naming it returns no rows on decided lanes (still X-NOT-MODELED in the oracle) |
| receipt format | `{ txId, position, instant, assertionIds }` | adds `stagedAt` |
| `run.py:239-244, 288-294` | one instant for both purposes | `_instant` (record cut) and `_staged` (valid-time default) |

O-DOMAIN, the W0 kernel, O-TDK1 and O-OBS do not read record time and keep their pins. P3's "commit time" (TARGETS 1.1 P3 item 1) is
the host monotonic publication instant, a different clock, and is unchanged.

### 4.4 Pins and versions that move

| Item | Moves to | Why |
| --- | --- | --- |
| O-REPLAY | 0.5.0, new `lab/acceptance/pins/O-REPLAY-0.5.0-SHA256SUMS` | section 4.3; needs its own independent check before the pin moves (the V-O04 pattern) |
| `lab/acceptance/golden/g9-history-cuts.json` | new hash in `goldenFilesPinned` | G9-CUT-02 rewrite; Q29a keeps the old file as the audit record, so the new vector gets a new id (G9-CUT-02b) and the old one is retired in the contract |
| testkit conformance (G1) | TK-JOURNAL and the `:_tx/instant` cases change; new cases | section 6 |
| pinned qualification sources | only if the P2X map is added to `xtdb-workloads.ts` | contract 0.3.12 notes these change only with a contract version |
| A0 registry (Q46b) | XTDB A0 and QLever A0 re-frozen | correctness change, Q72d precedent |
| Contract | 0.4.0 | changes the meaning of the receipt `instant` and four oracle rules: receipts from before and after are not comparable, so this starts a new comparison series (TARGETS 2.1 item 5 spirit) |
| Frozen writer trace, W0 pin, O-DOMAIN, O-TDK1, O-OBS | unchanged | they do not read record time |

New obligations for the contract:

| Obligation | What it checks |
| --- | --- |
| G7.receipt.decided-instant | every receipt instant equals the `recorded_at` of every row its transaction asserted and the `retracted_at` of every row it retracted, read back; a lost-ACK replay returns the original instant |
| G9.temporal.record-stamp-monotone | R-RCP-9 over every run's receipts, including concurrent disjoint-subject commits |
| G9.temporal.record-watermark | a read at `T <= W` answers at once; at `W < T` it waits and then fails E-BASIS-NOT-AVAILABLE (`record-time-not-reached`) within the deadline; never an empty or later-cut answer |
| G9.temporal.recorded-cuts (existing) | add the D-C1 schedule (section 6.2 T1) as a case |

---

## 5. The public API question for Sam (Q89g)

**The question.** Should the public `TemporalBasis` (`core/src/Temporal.ts:11-14`, today `{ recordedAt?, validAt? }`) gain a way to
name a commit directly, so a caller can pin "the latest committed tx (named exactly)" (TARGETS 2, 80% of reads)? It changes the
public TypeScript API (goal 10), so it is Sam's call.

**What changes the question.** Before R33 the only public pin was `recordedAt`, and it was not reproducible (D-C1). After R33,
`{ recordedAt: receipt.instant }` names exactly one commit's cut on every lane and is final at once on the deciding node. So a new
field is no longer needed for correctness. It is about ergonomics and safety.

| Option | Public shape | Pin a commit you made | Pin "latest" without writing | Main risk |
| --- | --- | --- | --- | --- |
| A. Record time only (no new basis field) | `TemporalBasis` unchanged; add `Triples.currentBasis(): Effect<{ recordedAt: number }>` returning `instantOf(W)` | `{ recordedAt: saved.instant }` | `currentBasis()` then read | an instant from scope A used on scope B is silently a different cut; instants on P2X are engine time, on other lanes client time |
| B. Raw position | `TemporalBasis` gains `recordedPosition?: number` (already in `ResolvedTemporalBasis`, `Temporal.ts:18-23`) | `{ recordedPosition: saved.position }` | `currentCommitPosition()` made public | positions are lane encodings (dense on A0 and Datomic, `lsn * 1024 + ordinal` on the broker, `(stamp - BASE) * 8 + ordinal` on P2X); `P + 1` is not "the next commit"; interior ordinals and cross-scope reuse become public foot-guns |
| C. Opaque snapshot token (recommended) | `TemporalBasis` gains `snapshot?: SnapshotToken`; `TransactionResult.snapshot` and `Triples.currentSnapshot()` return one | `{ snapshot: saved.snapshot }` | `currentSnapshot()` then read | one more versioned format (pagination cursors already have one, `Pagination.ts:43-68`, with a scope fingerprint) |

TypeScript for option C:

```ts
/** Opaque, scope-bound name of one committed cut. Never parse it; compare only for equality. */
export type SnapshotToken = string & Brand.Brand<"SnapshotToken">;

export const TemporalBasis = Schema.Struct({
  recordedAt: Schema.optional(Schema.Number),
  validAt: Schema.optional(Schema.Number),
  snapshot: Schema.optional(SnapshotTokenSchema), // base64url of { v: 1, scope: <fingerprint>, position, stamp }
});

export interface TransactionResult {
  readonly txId: TransactionId;
  readonly position: number;
  readonly instant: number;
  readonly stagedAt: number;
  readonly snapshot: SnapshotToken; // the cut that includes this commit and nothing after it
  readonly triples: readonly Triple[];
  readonly retracted: number;
}

// Triples service
readonly currentSnapshot: () => Effect.Effect<SnapshotToken, ReadError>;
```

Semantics of C: a token decodes to `(scope, position, stamp)`; a read with it is the TP cut `(instantOf(stamp), position)`; a token
from another scope fails with a typed `SnapshotScopeMismatch`; a token above the reader's head waits and then fails
`BasisNotAvailable` (replica lag, a follower); `recordedAt` given with a token must be `<= instantOf(stamp)`, else a typed error;
`validAt` combines freely.

**What each option means for Triplex used like an ORM.**

| ORM pattern | A | B | C |
| --- | --- | --- | --- |
| Save, then render the saved object exactly (read-your-own-write, P2) | `repo.find(id, { basis: { recordedAt: saved.instant } })` | `{ recordedPosition: saved.position }` | `repo.find(id, { at: saved.snapshot })` |
| One request, many queries, one cut (P1 straddle reads) | call `currentBasis()` once, pass the instant everywhere | call the position read once, pass it | call `currentSnapshot()` once, pass the token |
| Keep "the page you saw" in a URL or session | a number that silently means something else on another tenant | same, plus lane-specific meaning | a string that refuses on the wrong tenant |
| Release sweeps (P5) pin one basis for 100k subjects | instant | position | token |
| Audit "what did we know on March 3" | `recordedAt` (unchanged in every option) | same | same |

**Recommendation:** C, with A's `recordedAt` pin documented as equivalent for receipts. C keeps lane encodings private, checks the
scope, and matches the cursor design already in core. If Sam declines any new field, A is correct after R33 and needs only
`currentBasis()`.

---

## 6. Builder brief: migration, tests and gates

**North star:** P1 (named-basis reads reproducible; D-C1 closed) and P2 (receipts report the decided commit exactly, including on
lost ACK). Measured by the gates below; no performance bar moves, and the P2 guard (G6) shows no commit-latency regression.
**Scope:** `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; rulings Q89a, Q89c, Q89f and this file's R33-a to R33-h once ruled.

### 6.1 Rounds and commit order

| # | Round | Branch (worktree) | Commit | Files |
| --- | --- | --- | --- | --- |
| 1 | A | `exp/RT01-record-time` from main, after RQ01 merges | stamp helpers and their property tests | new `core/src/storage/RecordStamp.ts` (2.1, 3.3); `core/test/storage/record-stamp.test.ts` |
| 2 | A | same | core protocol | `StorageAdapter.ts` (2.3), `TriplesLive.ts` (C1 to C10), `transactionMetadata.ts` (C11, C12, 2.10), `Triples.ts` (C13), `EntitySnapshotsCapability.ts` (C14), `Pagination.ts` and `EntityPage.ts` (C17), core `BasisNotAvailable` (3.4), `bindCommit` (2.4) |
| 3 | A | same | testkit conformance | `testkit/src/index.ts` O10, O11 and the new cases T1 to T12 written against the public API with a controllable clock layer |
| 4 | A | same | route-equivalence harness | section 6.3 |
| 5 | A | same | XTDB A0 and QLever A0 | 2.6, 2.7 (A0), 3.2 rows; schema columns; legacy-scope refusal |
| 6 | B | `exp/SQL01-broker-sqlite` (or its successor), after merging main with commits 1 to 5 | broker | 2.5, 3.2; frames v2; marker and receipt stamp |
| 7 | B | `exp/P2X-xtdb-commit-feed`, after merging main | P2X | probe p9 first; 2.7 (P2X); bind; watermark |
| 8 | B | `exp/DA01-datomic-adapter` (DA01 round 3, together with Q89d) | Datomic | 2.8; gateway schema `:triplex.scope/stamp`; read gate |
| 9 | parallel | `exp/O06-oracle-record-time` (a different builder, from section 4.3 only, without reading commits 1 to 8) | O-REPLAY 0.5.0 | `lab/oracles/replay/` rules, run.py, fixtures; independent reviewer before the pin |
| 10 | after 1 to 9 | `contract/0.4.0` | contract | compile Q89a and R33 rulings; O-REPLAY 0.5.0 pin; G9-CUT-02b; new obligations (4.4); A0 re-freeze; RULINGS move from pending |
| 11 | C (later, own brief) | lane branches | seals and the T-to-position reduction | 3.6, 3.7; lifts Q89b per store with harness evidence |

Commits 1 to 5 are backward compatible for every adapter that does not declare `recordTime: "decided"` except for two visible
changes that apply to all adapters: the journal no longer writes `:_tx/instant`, and change JSON v2. Both are covered by commit 3's
conformance updates. Each lane branch picks up the core change by merging main, so no lane branch is blocked by another.

### 6.2 Tests

Each test runs on every decided lane arm it names; live tests run on the lab's slots through `lab/bin/engine.mjs` only; Datomic dev
storage is fine for development gates and DIAGNOSTIC for acceptance (Q88a).

| ID | Test | Lanes | Pass condition |
| --- | --- | --- | --- |
| T1 | **D-C1 reproduction becomes a passing test.** R31 5.1 steps 1 to 6 at the public API: test clock at 1000; fiber A stages one fact on X and waits on a `Deferred`; clock to 1001; fiber B commits on Y; `r1 = entity(X, { recordedAt: B.instant })`; release A; A commits; `r2` the same read; plus the pagination variant (page one before A, page two after) | broker (offline, `ModelReplica` or the SQL01 outage stub), XTDB A0 and P2X, QLever A0, Datomic | `A.instant > B.instant`; `r1` and `r2` are identical; both pages come from one cut. The same test against a fixture adapter that keeps staged stamps must still fail (negative control) |
| T2 | same-millisecond tie: two commits staged in one ms on a scope-wide CAS lane | XTDB A0, QLever A0, Datomic | distinct instants; a read at the first instant excludes the second, before and after the second commits |
| T3 | monotonicity under concurrency: 200 transacts on disjoint subjects, plus 50 on one subject with conflicts and retries | all | per scope, instants strictly increase with position; every asserted row's `recordedAt` and every retracted row's `retractedAt` (read back through `history`) equals its transaction's receipt instant; `transaction(txId).instant` equals it |
| T4 | lost ACK: stop after the decision, before the ACK (the existing fault hooks), resend with the same command | broker, XTDB A0 and P2X, Datomic | the resend returns the original position and instant |
| T5 | watermark: read at `T = instantOf(W)` answers at once; at `T = instantOf(W + 1)` on an idle scope it waits `basisWaitMs` and fails `BasisNotAvailable { axis: "recordedAt" }`; a commit during the wait whose stamp reaches the cut releases it, and the answer includes that commit only if its stamp is `<= stampCut(T)` | all | as stated; never an empty answer, never a later cut |
| T6 | far-future record time (`T > now + deadline`) | all | refused at once |
| T7 | clock behavior: test clock steps back 10 s between commits; a staged clock 6 s ahead | all; lead check on broker and Datomic | stamps still increase; the lead case gets the typed `clock-lead` error |
| T8 | placeholder leak: a nested `transact` result's `instant` is written into a fact value and into `validFrom` | broker, P2X | typed `WriteError`, nothing committed |
| T9 | valid-time default: omitted `validFrom` equals `stagedAt`; a read at `validAt = stagedAt` right after commit sees the fact; on P2X with the client clock 50 ms behind the engine | all | sees own write; `stagedAt !== instant` allowed |
| T10 | determinism: one fixture run twice, and across the four clock-driven arms | broker, XTDB A0, QLever A0, Datomic | byte-identical receipts across runs; identical instants across arms; instants equal the fixture's reference stamps |
| T11 | pagination on an idle scope: first page and cursor pages | all | no wait; the cursor's `recordedAt` equals `instantOf(W)` at page one |
| T12 | journal: `TransactionRecord.changes` keeps `recordedAt` and `retractedAt`; a stored legacy record (v1 JSON with `:_tx/instant`) still decodes | core reference adapter, all lanes | as stated |
| T13 | probe p9-stamp-ms | P2X | the chosen expression's stored bits equal JS `stamp / 1000` for at least 10,000 transactions; mixed integer and fractional comparisons agree in SQL and XTQL |
| T14 | legacy scope refusal | broker (v1 frames), XTDB (`tx_meta` without stamp), Datomic (scope without stamp) | typed `MigrationError`, nothing written |

### 6.3 The route-equivalence harness (EXP-RQ01)

RQ01 (`.claude/worktrees/rq01/packages/testkit/src/route-equivalence.ts`) models commits as `{ position, instant, writes }`
(`:18-22`) and its D-C1 case dictates `instant: 1000` at position 2048 after `1001` at 1024 (`test/route-equivalence.test.ts:96-120`).
After R33 an instant is the system's output, not the history's input. Changes:

1. `RouteCommit` gains `stagedAt`; `instant` becomes optional input and is filled by the fixture's decider with `nextStamp`
   (offline fixtures) or from the receipt (live fixtures). The fold (`foldRouteHistory`) uses the decided instant.
2. The known-failing D-C1 case flips to a passing case: A staged at 1000, decided after B, gets an instant above 1001; the read at
   1001 is the same before and after. Keep a negative control: an offline fixture decider `"staged-stamps"` that copies `stagedAt`
   into `instant` must still produce the HE-5 violation, so the harness keeps detecting the defect class.
3. New rule HE-8: per scope, decided instants strictly increase with position, and ordinals of one commit share one.
4. The basis generator's "wall-clock T after the head stamp" family (R31 4.3) now expects `BasisNotAvailable` with axis
   `recordedAt` on every route (round 1); round 2 changes it to an answer once seals exist. HE-3's allow-list already has the tag.
5. HE-7 (echo) also checks that a T-shaped read echoes `recordedAt` unchanged and the position the gate pinned.
6. Lane D and SQL01 stubs (left by CX-RQ01) get the decider hook so commits 6 and 8 plug in.

### 6.4 Gates

| Gate | Condition |
| --- | --- |
| G1 build and unit | typecheck, build and offline tests for `core`, `testkit`, `xtdb`, `qlever`, `datomic` green; the published `.d.ts` diff of `@triplex-build/triplex` shows only additive changes (`stagedAt`, the optional adapter members, `RecordStamp` exports, `BasisNotAvailable`) |
| G2 conformance | the testkit conformance suite (the "G1 88/88" suite, with the new count after commit 3) passes on every lane arm, option off and on where an option exists (broker default-off; P2X `subject-stamp`) |
| G3 tests | T1 to T14 pass where listed; T1's negative control fails as expected |
| G4 route equivalence | RQ01 HE-1 to HE-8 green on every offline fixture and on each live fixture available; required for every branch here (Q89f) |
| G5 oracle | O-REPLAY 0.5.0 selfcheck and its tests pass; independent review accepted before the pin; the existing O-REPLAY cases that do not involve shared or decreasing instants give byte-identical answers |
| G6 P2 guard | commit latency p50 and p99 for the 5-to-10-fact band on broker, XTDB A0 and P2X, paired against the pre-change commit on the same slot (M01 method): no regression beyond the pair's noise; the design adds no round trip |
| G7 contract | `build_contract.py --verify` byte-identical; `lab/bin/test/claim.test.mjs` and `claim-round2.test.mjs` pass on the contract branch merged with main (Q87) |
| G8 review | an adversarial reviewer (Codex high) checks each branch; prompts follow PROTOCOL section 6 wording ("check that each documented check rejects the inputs it should"; the leak check is "placeholder leak", never "escape") |

### 6.5 Contract version

Contract 0.4.0, built after 0.3.12. It compiles Q89a (as designed here), the record-time half of Q89c, R33-a to R33-h, pins O-REPLAY
0.5.0, adds G9-CUT-02b and retires G9-CUT-02 (Q29a keeps the old file as the record), adds the obligations of section 4.4, and
re-freezes the XTDB A0 and QLever A0 controls. Receipts produced before 0.4.0 are not compared with receipts after it.

---

## 7. Proposed rulings, open items and risks

### 7.1 Proposed rulings

| ID | Ruling | Needs Sam? |
| --- | --- | --- |
| R33-a | S1 to S7 (section 2.1): integer-microsecond stamps, `max(previous + 1, clock)`, one stamp per transaction, public value `stamp / 1000`, valid time from `stagedAt`, clock-lead refusal, legacy adapters exempt | No |
| R33-b | Omitted `validFrom` and the constraint instant use `stagedAt`; `TransactionResult` gains `stagedAt` (additive) | No (additive) |
| R33-c | XTDB A0 stamps on the client under its existing CAS (refines Q89a's "A0 CURRENT_TIMESTAMP"); P2X uses the engine stamp after probe p9, falling back to integer microseconds on both XTDB arms | No |
| R33-d | Datomic stamps on the peer under `:db/cas`, validated by the gateway; not `:db/txInstant`; a transactor function only if lane D adopts per-subject CAS | No |
| R33-e | The record-time watermark gate with typed `BasisNotAvailable { axis: "recordedAt" }` on every route (section 3); seals in round 2 | No |
| R33-f | Journal values never hold the transaction's own record instant: no `:_tx/instant`, change JSON v2 | No |
| R33-g | O-REPLAY 0.5.0 (section 4.3), G9-CUT-02b, contract 0.4.0 as a new comparison series | No |
| R33-h | The T-to-position reduction lifts Q89b per store only with RQ01 evidence for T and TP on that store (round 2) | No |
| Q89g | Public commit pin: options A, B, C (section 5); recommendation C | **Yes** |

### 7.2 Open items and risks

1. **P2X probe p9 may fail.** Then both XTDB arms store integer microseconds and convert in the adapter and native layer. More
   conversion code, no change to the design.
2. **Record time on serialized lanes is the staging clock, bumped.** A transaction that stages for 2 s gets a record time about 2 s
   before its decision. No reader can see the gap (the watermark only covers decided transactions), and order is exact. If Sam wants
   record time to mean the decision's wall time, the broker can switch its clock input to its own clock at decision; A0 and Datomic
   would need engine or transactor stamps. Flag only, no action proposed.
3. **Idle-scope audits are refused in round 1.** A past T after a scope's last commit waits 2 s and fails until seals land. This
   loses availability, never correctness. GS.12 runs with writes continuing and is not affected.
4. **Future writers of the commit's own instant into values.** Erasure markers (`erasedAt`, R-ERA-1, TARGETS 7) and any outbox item
   that records "when" must store a reference to the transaction (txId or position) and resolve the instant at read, or be filled by
   the decider. Core has no `erasedAt` writer today (searched `core/src`), so this is a rule for the erasure work (EXP-O04 follow-ups),
   not a change now.
5. **Mixed numeric types in one XTDB column.** Integer-valued and fractional record times will sit in one column; T13 covers the
   comparisons.
6. **Clock-lead default.** 5 s is a guess. Too small refuses honest clients with skew; too large lets one client push the scope's
   record clock ahead. The orchestrator can tighten it after the first live runs report observed skew.
7. **Cross-scope instants.** Stamps are ordered within a scope. Across scopes they are only wall-clock approximations (P2X stamps are
   also ordered across scopes on one node). Option C of section 5 is the guard against mixing them.

---

## 8. Sources read

- `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` (sections 1, 1.1, 2, 2.1, 3), `lab/PROTOCOL.md`,
  `lab/acceptance/RULINGS-PENDING.md` (Q58, Q67, Q72, Q84, Q88, Q89), `lab/STATE.md` (branch status),
  `lab/research/R31-route-equivalence.md` (all).
- Core: `Temporal.ts`, `store/TriplesLive.ts`, `store/RuntimeServices.ts`, `runtime/Runtime.ts`, `storage/StorageAdapter.ts`,
  `storage/types.ts`, `store/transactionMetadata.ts`, `store/Triples.ts`, `Constraint.ts`, `Pagination.ts`, `EntityPage.ts`,
  `snapshots/SnapshotServiceLive.ts`, `snapshots/EntitySnapshotsCapability.ts`, `store/writeEventUtils.ts`, grep of the rest.
- Kernel: `packages/w0/src/kernel.ts`, grep of `packages/w0/src`.
- Broker: `broker/BrokerStorageAdapter.ts`, `broker/broker.ts`, `broker/frames.ts`, `broker/sqlite-worker.ts`, `broker/log.ts`
  (SQL01 worktree).
- XTDB: main `XtdbStorageAdapter.ts`, `native/Sources.ts`; P2X `XtdbStorageAdapter.ts`.
- QLever A0: `QleverStorageAdapter.ts`, `rdf.ts` (`numericOrderKey` keeps all binary64 bits).
- Datomic: `src/DatomicStorageAdapter.ts`, `src/rows.ts`, `gateway/src/triplex/gateway/storage.clj`, `schema.clj` (DA01 worktree).
- Oracles and fixtures: `lab/oracles/replay/run.py`, `RULES.md`, `selfcheck.py`; `lab/acceptance/golden/` (all 49 vectors scanned
  for shared or decreasing instants); `lab/acceptance/build_contract.py`, `pins/`.
- Workloads: `packages/qualification/workloads/runner.ts`, `src/native/*.ts`; `packages/testkit/src/index.ts`.
- RQ01: `.claude/worktrees/rq01/packages/testkit/src/route-equivalence.ts`, `test/route-equivalence.test.ts`, and the CX-RQ01 prompt.

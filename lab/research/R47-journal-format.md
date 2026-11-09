# R47: the Triplex transaction journal format, bytes per fact and who reads it

Researcher: R47 (Opus 5.5, high). Date: 2026-11-09. Read-only on code; the only file written in the repository is this one. No engine,
Docker, colima or slot was touched. The HS01 10k evidence store was opened read-only (`file:...?mode=ro`); a 10% sample of it was
re-encoded into a throwaway SQLite file in the scratchpad to measure the options (scripts in appendix A; they regenerate every number in
about one minute). Goals and targets come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

**North star:** P5 and P4 (bytes per fact and working set: TARGETS G9 bar for the broker store at the W0 10k rung is <= 300 B per asserted
fact and <= 1.4 GB), with P3 (the ordered feed) and the P1/P2 floors (exact reads at every cut, lost-ACK receipts) as constraints that no
option may weaken.

Evidence labels: **[M]** measured here, **[S]** read in source (path and line), **[D]** derived by arithmetic from [M] and [S], **[E]**
estimate with its method stated.

Code and documents read: `packages/core/src/store/{transactionMetadata.ts, TriplesLive.ts, Triples.ts, entityTransactionHistory.ts,
systemNamespace.ts, RuntimeServices.ts, TripleStoreRuntime.ts, writeEventUtils.ts}`, `packages/core/src/{Branded.ts, utils/id.ts,
derivation/Derivation.ts, derivation/Materialization.ts, config/EntityValidation.ts, snapshots/EntitySnapshotsCapability.ts,
runtime/Runtime.ts}`, `packages/qlever/src/broker/{broker.ts, feed.ts}`, `packages/datomic/gateway/src/triplex/gateway/{schema.clj,
storage.clj}`, `packages/host/src/Protocol.ts`, `docs/{operational-primitives.md, datalog.md, custom-runtimes.md}`; worktrees `hs01`
(`row-codec.ts`, `sqlite-worker.ts`, REPORT), `fd01` (`host/src/feed/Adapters.ts`), `df01` (`gateway/feed.clj`), `rt01` (core diff),
`di01` (`DependencyIndex.ts`), `o06` (O-REPLAY 0.5.0 `RULES.md`, `replay.py`, `views.py`); branch `exp/P2X-xtdb-commit-feed`
(`XtdbStorageAdapter.ts`, `CommitFeed.ts`); `lab/oracles/replay/{SCHEMA.md, RULES.md}`; `lab/acceptance/{RULINGS.md, RULINGS-PENDING.md}`;
R33, R38, R41, R45; EXP-J01 and EXP-HS01 reports.

## 1. Summary

| Question | Answer |
| --- | --- |
| 1. Who reads the journal | Twelve readers (section 3). **None of the P3 feeds read journal rows:** the broker feed and XTDB P2X build entries from fact rows and skip journal rows; FD01's journal adapter is only the A0 control and uses identity fields of `transactions()`. DI01 reads feed entries only. Lost-ACK receipts come from `claims` and `operations`, not the journal. The value-bearing readers are the typed journal API (`transaction`, `transactions`, `transactionByCommand`, `transactionsForEntity`), Datalog and `match` over `:_tx/` facts (documented, and modeled by O-REPLAY R-JNL-5), and two internal couplings: the broker and P2X patch the `:_tx/position` placeholder row, and the broker feed takes a retract-only commit's `txId` from journal rows. |
| 2. Minimal representation | **One record per transaction** holding position, the first journal row id and counts (ids run-encoded), actor, command id, optional strings, and the change list as a run of fact ids with an explicit list only when the run breaks; changed-entity rows, `:_tx/position`, `:_tx/instant` and the change JSON are all derived. Measured on the real 10k store: every transaction's journal ids are consecutive (434,768 of 434,768), the change ids form a run immediately before them in 432,814 (99.55%; the other 1,954 are exactly the transactions with a retraction), and the changed-entity rows equal the distinct entities of the changes in order in 43,502 of 43,502 sampled transactions [M]. That record costs **7.6 B per fact** with a 17-byte id codec (9.5 B with TEXT ids), against **213.7 B** for HS01's journal rows on the same sample [M]. Deriving changes from fact rows by position instead (no stored change list) needs a position index on facts, about 37 B per fact on the broker and a table scan on XTDB, so it is rejected. |
| 3. Is the format public | **The stored rows are public in one place: they are queryable triples.** `docs/operational-primitives.md:37-56` promises an `_Transaction` entity with nine attribute families that "remain available to Datalog", `docs/datalog.md:41` joins `:_tx/actor` from a fact's transaction, the tenant protocol serves `Match` and `Query` (`host/src/Protocol.ts:140-157`), and O-REPLAY R-JNL-5 (accepted in Q33g) compares `:_tx/change` and `:_tx/changed-entity` facts returned by `match`. `TransactionRecord` and `TransactionChange` are exported types (`Triples.ts:92-119`). The physical layout behind those answers is internal. So a broker-internal record that synthesizes byte-identical rows is a lab decision; a core change that stops storing `:_tx/change` and `:_tx/changed-entity` as triples on every lane changes a documented public surface and needs Sam. |
| 4. Ids | The public contract is the shape, not the bytes: `TripleId` is `^[0-9A-Z]{26}$` and `TransactionId` is `^_tx/[0-9A-Z]{26}$` (`Branded.ts:4, 43`). Every such string is a base-36 number below 36^26 < 2^135, so it packs losslessly into **17 bytes**; a canonical Crockford ULID packs into 16. A codec that tries 16 (Crockford), then 17 (base-36), then TEXT, decided by blob length and verified on write, covers the deterministic generator and production ULIDs without touching the generator. Changing the generator instead saves only 1 byte per id more and changes a public runtime option's output. Measured effect on fact rows: **106.7 to 84.2 B per fact** (-21%, with ref values bound as INTEGER instead of REAL) [M]. |
| 5. Recommendation | **Now (lab authority): EXP-HS01 round 2** on the HS01 branch: the 17-byte id codec, INTEGER refs, and the one-record journal synthesized inside the broker worker. Predicted broker store **281 B per fact, 1.25 GB at 10k** (passes G9 by about 6%) and **154 B per fact, 6.9 GB at 100k**. Every answer stays byte-identical; XTDB and Datomic storage are unchanged. **Then (Sam's decision): journal v3 in core**, which removes `:_tx/change` and `:_tx/changed-entity` triples on every lane: about 40% fewer source-log bytes per XTDB command, 45% fewer QLever triples, about half the Datomic fact entities, and 75% smaller broker frames (broker store about 175 B per fact at 10k, 144 at 100k). Builder brief and gates in section 8, the question for Sam in section 9. |

## 2. Evidence

**2.1 The store.** `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01/final-67ab6c55-599b-4c53-917f-9d39f88b1035-w0-10000/store/broker.db`,
HS01 frozen source `13ce4978`, W0 10k: 434,768 commands, 4,468,284 asserted facts (4,466,330 live, 1,954 retracted), 2,274,734,080
logical bytes, 509.08 B per asserted fact. dbstat, read-only [M]:

| Object | Bytes | Cells | B per fact |
| --- | ---: | ---: | ---: |
| `journal` | 629,686,272 | 8,100,092 | 140.92 |
| `journal_id` | 325,496,832 | 8,100,092 | 72.85 |
| `facts` | 300,281,856 | 4,466,330 | 67.20 |
| `facts_id` | 179,478,528 | 4,466,330 | 40.17 |
| `frames` (1,024 retained) | 625,975,296 | 1,771 | 140.10 |
| `ents` and its unique index | 125,493,248 | 3,816,383 | 28.09 |
| `heads`, `claims`, `operations` | 78,417,920 | 1,907,788 | 17.55 |
| `txs` | 8,675,328 | | 1.94 |

**2.2 What a journal row holds today** [M]. Per transaction, in id order: `:_tx/position` (type 8, value derived), `:_tx/instant` (type 9,
derived), `:_tx/actor` (TEXT, 7 bytes, `p5-seed`), `:_tx/command-id` (TEXT, 13.7 bytes average), 4.35 `:_tx/changed-entity` (ref eid,
**stored as REAL**, 8 bytes), 10.28 `:_tx/change` (type 7, value = the referenced fact id as 26-byte TEXT). All 8,100,092 rows have the
same entity type (`_Transaction`), valid-from offset 0, no fallback `x`. Ids are the deterministic generator's base-36 strings
(`01IO9J99` prefix plus an 18-digit counter), all TEXT: 26 bytes in the row and 26 again in `journal_id`. Each journal row costs about
118 B with its index entry, and there are 1.81 journal rows per fact, which is where 213.77 B per fact comes from.

**2.3 Structure checks over every transaction** (`verify.py`, appendix A.1) [M]:

| Check | Result |
| --- | ---: |
| Journal rows in `metadataInputs` order (position, instant, actor, command id, changed entities, changes) | 434,768 / 434,768 |
| Journal row ids consecutive (base-36 successor) with one prefix | 434,768 / 434,768 |
| Change ids form a consecutive run ending immediately before the first journal id | 432,814 / 434,768 |
| Transactions where the run breaks | 1,954, exactly the retraction count |
| Changed-entity values equal the distinct entities of the change targets, in order (10% sample) | 43,502 / 43,502 |
| All headers present (position, instant, actor, command id) | 434,768 / 434,768 |

The run follows from core: `flushAssertBatch` allocates fact ids with `Effect.all(inputs.map(() => nextTripleId))` and the journal loop then
allocates one id per journal row from the same generator (`TriplesLive.ts:220-226, 478-481`). Production's `monotonicFactory` ULIDs
(`utils/id.ts`) increment by one inside a millisecond, so runs hold there too except when the clock ticks mid-transaction; the codec must
verify and fall back, never assume.

**2.4 Prototype on the real data** (`build.py`, appendix A.2; 10% of transactions by tx eid and 10% of fact entities, inserted in commit
order as the broker writes them, 4 KB pages) [M]:

| Table (sample) | Bytes | Per asserted fact | Note |
| --- | ---: | ---: | --- |
| HS01 journal rows plus `journal_id`, copied as stored | 95,592,448 | **213.70** | reproduces the full-store 213.77 |
| Same rows, 17-byte ids, change ref packed, refs INTEGER | 73,134,080 | **163.49** | codec only |
| One record per transaction, TEXT ids, plus id index | 4,259,840 | **9.52** | record only |
| **One record per transaction, 17-byte ids, plus id index** | 3,395,584 | **7.59** | 4.69 table plus 2.90 index; 186 of 43,502 records (0.43%) carry an explicit change list |
| HS01 fact rows plus `facts_id`, copied as stored | 47,464,448 | **106.72** | reproduces the full-store 107.37 |
| Same facts, 17-byte ids, refs INTEGER | 37,466,112 | **84.24** | ratio 0.789 |

**2.5 Frames.** In the last 20 retained frames (11,367,538 payload bytes, 34,688 rows), journal rows are **76.1% of frame bytes** (22,425
rows, 8,647,377 bytes) and fact rows 22.3% [M]. Frames are fixed at 1,024 by G9's `tailFrames`, and the seeder packs 64 commands per frame,
so frames cost 140 B per fact at 10k and about 14 B per fact at 100k.

**2.6 Other lanes** (EXP-J01, one 10-fact command, no actor) [S]: XTDB A0 writes 30,061 source-log bytes, of which the four envelope rows
cost 2,842 and the ten `:_tx/change` rows 11,552 (journal 47.9%); compact 26,397 with 12,554 journal. QLever A0 inserts 663 triples, 384
of them journal (57.9%); compact 447 with 258 journal, and 20,880 of the 32,127 literal object bytes are change JSON. Datomic (DA01) stores
every journal row as an `:f` entity of about ten datoms (`storage.clj:35-61`), 18.63 per W0 command against 10.28 data entities, and
already holds the position, tx id and record time on the native transaction entity (`schema.clj:33-34`, `storage.clj:77`).

## 3. Every reader of the journal and what it needs

| Reader | Where | Reads | Needs from the journal | Values? |
| --- | --- | --- | --- | --- |
| Broker P3 feed (`LogFeed.poll`) | `qlever/src/broker/feed.ts:81-140` | frame rows | Skips journal rows for changes (`if (isJournalRow(row)) continue`). **Takes `txIds` from any own-position row, so a retract-only or empty commit gets its txId only from its journal rows** (a retraction row carries the old `tx_id` and an old `recorded_position`) | no |
| FD01 adapters | `fd01: host/src/feed/Adapters.ts` | broker resolutions, P2X `tx_feed`, `transactions()` | Only `journalChangeFeed`, labelled `arm: "A0-control"` (Q98a), reads the journal: `position`, `txId`, `commandId` and per change `op, entityId, attribute, validFrom, validTo, tripleId`. No value, actor or instant | no |
| XTDB P2X feed | `exp/P2X: XtdbStorageAdapter.ts:473-532`, `CommitFeed.ts:226` | its own `tx_feed` row per transaction | Skips journal rows; patches the `:_tx/position` placeholder value (`:504`). `tx_feed` is already an identity-only one-record-per-transaction journal next to core's | no |
| DF01 Datomic feed | `df01: gateway/feed.clj:14-45` | Datomic log, `:f/asserted-in` and `:f/retracted-in` datoms | Reads the native tx annotation for position, id and stamp. **It does not filter journal facts**, so each core journal row (entity `_tx/...`, attribute `:_tx/change` and the rest) becomes a feed change, unlike the broker and P2X. Finding for the DF01 review, independent of this report | no |
| DI01 dependency index | `di01: host/src/feed/DependencyIndex.ts` | FD01 feed entries, fact rows at a position | Nothing from the journal | no |
| RT01 record-time reads (Q89, Q90 pending) | `rt01: TriplesLive.ts` `journalRows`, `Temporal.ts journalBasis` | journal rows at `{recordedPosition: cut, allValidTime}` | Rows recorded at or before the cut, all valid time; writes no `:_tx/instant` and change JSON v2 (Q90e); journal `validFrom = stagedAt`; `instant` from the position row's `recordedAt` | via `transaction` |
| Typed journal API | `TriplesLive.ts:601-644` | `adapter.query({entityType: "_Transaction"})` and friends | `transaction`: all rows of one tx entity at a basis. `transactions`: **every** `_Transaction` row in the store, filtered by position afterwards. `transactionByCommand`: an attribute-and-value query on `:_tx/command-id`. Output is R-JNL-1's record including each change's full typed value | yes |
| `transactionsForEntity` | `entityTransactionHistory.ts:57-128` | Datalog over `:_tx/changed-entity` and `:_tx/position` at the snapshot, then `transaction` per hit | The changed-entity index and the position fact | via `transaction` |
| Core internals | `Derivation.ts:273`, `Materialization.ts:229`, `EntityValidation.ts:450`, `writeEventUtils.ts:140`, `SnapshotServiceLive.ts:82`, `EntitySnapshotsCapability.ts:31` | `transactions()`, `transaction()`, `match :_tx/instant` | Attribute, op, tripleId, validFrom/validTo, actor, instant, position. The `:_tx/instant` match is replaced in RT01 (R33 C14) | no |
| Datalog and `match` over `:_tx/` | `docs/datalog.md:36-43`, `host/src/Protocol.ts:140-157`, every lane's compiler | stored journal rows as ordinary triples | Header facts joined from a fact's 4th-position tx (`:_tx/actor`); `:_tx/change` and `:_tx/changed-entity` facts by pattern | yes |
| Receipts and lost-ACK | broker `claims`, `operations` (HS01 `sqlite-worker.ts:243-244`); XTDB `tx_claims`, `tx_attempts`; Datomic `:triplex.claim/*` | claim and operation tables | Nothing, except core's `transactionByCommand` (above) which goes through `:_tx/command-id` | no |
| O-REPLAY 0.4.9 and 0.5.0 | `lab/oracles/replay`, `o06` | case and receipts only; compares the SUT's answers | R-JNL-1 to R-JNL-4 and R-JNL-7 on the typed API; **R-JNL-5** `journalFacts` and `match`/`entityTriples`/`valueSupports` over `:_tx/change` and `:_tx/changed-entity` facts, compared by (entityId, attribute, value) with synthetic ids, recorded at the commit's position and instant and valid from `stagedAt` (0.5.0); R-JNL-6 refuses header patterns (X-NOT-MODELED); R-ERA-5 re-renders change facts with erasure markers at read time | yes |
| Erasure (R38, ER01) | R38 2.x tables | journal change values | Every `:_tx/change` is a protected copy holding an envelope (R38 line 223); G-C8 requires journal bytes identical to main for commands without protected values. HS01's derived change rows already hold no value; physical deletion of a referenced fact must keep its identity (HS01 report) | yes |
| Lab oracles of storage | P2Q, SQL01, `sqlite-broker.test.ts`, O-OBS normalizer (Q100g) | all frames, `marker` | Frame rows including journal rows as the independent oracle | yes |

Two consequences shape the options. First, **no P3 path needs journal content**, so the journal only has to serve history and audit reads
exactly. Second, the typed record, the derived journal facts and the feeds can all be computed from **fact rows plus a small per-transaction
record**, because a change on entity E at position P is always either the assertion of a row of E recorded at P or the retraction of a row
of E retracted at P (erasure commits excepted; they list identities, Q49a).

## 4. Representation options

All bytes are for the broker store at W0 10k, from section 2.4 applied to the full-store components of section 2.1 [D]. "Other" is
everything except facts and journal: history 0.05, `ents` 28.09, `txs` 1.94, heads, claims and operations 17.55, frames 140.10, freelist
0.21, together **187.94 B per fact**.

| Option | What is stored | Journal B/fact | Store B/fact (10k) | 10k GB |
| --- | --- | ---: | ---: | ---: |
| H: HS01 as measured | journal rows, derived change values, TEXT ids, REAL refs | 213.77 | 509.08 | 2.275 |
| A: id codec only | same rows, 17-byte ids, INTEGER refs | 163.54 | 436.2 | 1.949 |
| B0: broker record, TEXT ids | one record per tx, rows synthesized | 9.52 | 304.8 | 1.362 |
| **B: broker record plus id codec** | **one record per tx, rows synthesized, 17-byte ids** | **7.6 (+0.3 margin)** | **281** | **1.25** |
| C: journal v3 in core, B's store | one record per tx written by core; no change or changed-entity triples; frames carry the record | about 7.6 | **about 175** | **0.78** |
| D: no change list, derive from facts by position | record without the change list, plus `facts(pos)` and `history(rpos)` indexes | about 45 [E] | about 318 | 1.42 |

**4.1 B, the broker record (R45 5.7 option 1, now with its two open problems solved).** Core is unchanged and keeps calling
`adapter.insert` for every journal row. In the broker's append, before `BEGIN IMMEDIATE`, the codec groups a member's journal rows by
transaction and encodes one record:

```
txs (pos INTEGER PRIMARY KEY, tx INT, at INT,              -- exists in HS01
     j0 BLOB, nj INT, nc INT, f INT,                       -- first journal id (packed), row and change counts, header flags
     vf INT, actor INT, cmd TEXT, ext BLOB, refs BLOB)     -- stagedAt offset, actor sid, command id, rare strings, explicit change ids
+ UNIQUE INDEX txs_j0 ON txs(j0) WHERE j0 IS NOT NULL      -- reads by journal row id
+ INDEX txs_tx ON txs(tx)                                  -- reads by the `_tx/...` entity
```

It then synthesizes the rows back with the same decoder used at read time and compares them with `Object.is` on every own field, exactly as
HS01 does per row; any difference stores that transaction's rows in the existing `journal` table instead (the verbatim path), so
correctness never depends on the record covering a case. The two problems R45 left open: (1) **a read by journal row id** is a range seek on
`txs_j0` (greatest `j0` at or below the id, then `id < j0 + nj`), 2.9 B per fact instead of R45's estimated 51; (2) **a retired journal
row** (HS01 moves it to `history`) sets a flag bit on its record in the same append, and the synthesizer omits that row id; the retired
version lives in `history` as today. Synthesis serves every worker selection: `id`, `entities` (via `txs_tx`), empty, `recent(after)`
(positions above `after` via the `txs` key) and `pull` at a basis. Readers change in one place, the worker's `rows()`; the adapter, core,
frames, feed, replica applier and every public API are untouched. **Every answer is byte-identical** by construction and by the G6 gate in
section 8; O-REPLAY 0.5.0 expectations do not move. XTDB, QLever and Datomic storage do not change.

The derive function must produce both change JSON formats: v1 today and RT01's v2 (Q90e: no own instants, `v: 2`) once RT01 merges,
selected by the stored value's `v` key. Without that, RT01's merge would turn every change row into the verbatim fallback, which G9
catches as a size regression, not a wrong answer.

**4.2 C, journal v3 in core.** Core writes, per journaled transaction, the header facts that Datalog joins on (`:_tx/position`,
`:_tx/actor`, `:_tx/command-id`, and correlation, causation and config snapshot when present) plus one `:_tx/changes` fact whose value is
the ordered change list as references (`[op, tripleId]` per assert or retract, identity-only entries for erase). It no longer writes
`:_tx/change` or `:_tx/changed-entity` (and, with RT01, no `:_tx/instant`). Using a fact for the list keeps every adapter's write path
unchanged; the broker's codec reduces it to B's run, so the broker store matches B and its frames lose 76% of their bytes. Reader changes:

| Reader | Change under C |
| --- | --- |
| `transaction`, `transactions`, `transactionByCommand` | Read the header facts and the list, then hydrate each change by fetching the referenced fact by id (live or retired) and calling the same `transactionChangeFromTriple` core uses at write time today. The referenced row's identity, value and times are immutable; the retraction fields come from this transaction. Erased values render as the marker, as R-ERA-5 already requires. Order is the stored order, so R-JNL-2 holds. Output identical to today. |
| `transactionsForEntity` | Derive from the entity's rows instead of `:_tx/changed-entity`: `(recorded_position, tx_id)` of its assertions and `(retracted_position, retract_tx_id)` of its retractions at or below the snapshot, plus erasure commits naming the entity from the erasure ledger, minus unjournaled positions; then hydrate. Same page contents and order. |
| Broker feed | Take `txIds` from the record (or from `retract_tx_id`) so retract-only and empty commits keep their txId. |
| Broker and P2X position patching | The placeholder rewrite of the `:_tx/position` value stays (the header fact remains). |
| DF01 | Journal facts no longer appear in the Datomic log as `:f` entities except the header and list facts; its journal-fact defect (section 3) shrinks but the filter is still needed. |
| P2Q, SQL01, O-OBS normalizer | Frame members carry fewer rows; harnesses that replay frames as the oracle are regenerated, and the O-OBS normalizer pin moves. |
| Datalog and `match` over `:_tx/change`, `:_tx/changed-entity` | **No longer answered from storage on any lane**, including raw native queries. Either they return nothing (and O-REPLAY R-JNL-5 is amended), or every lane's compiler synthesizes them (four compilers plus the KV and SQL ones, and native XTQL, SPARQL and Datomic Datalog still cannot see them). This is the public surface change in section 9. |
| Erasure | The journal holds no value copies on any lane: one fewer protected copy everywhere (TARGETS 7.3, Q102a's inventory); R38's G-C8 baseline is re-taken in the new format. |

What stays identical: R-JNL-1 to R-JNL-4 and R-JNL-7 outputs (the typed API), R-JNL-6 (header patterns are still X-NOT-MODELED in the
oracle), every fact read, every feed entry except DF01's journal noise. What changes: R-JNL-5's `journalFacts` kind and journal-naming
`match` patterns, Q49a's sentence that an erasure commit has "its own `:_tx/` facts" (it keeps its header facts), and the documented
attribute list in `docs/operational-primitives.md:37-56`.

**4.3 D, no stored change list.** Changes would be derived from "facts asserted at P" and "history retracted at P". That needs a position
index: about 34 B per entry plus slack on the broker [E], against B's run, which is free for 99.55% of transactions. Interleaved
assert/retract order (R-JNL-2) and retract-pattern order would still need a stored list when they occur, and on XTDB a non-`_id` predicate
scans the table (R7). B and C already adopt D's useful half: changed-entity rows and the position and instant values are derived, not
stored.

## 5. Is the journal format a public contract?

| Surface | Public? | Where | Who can change it |
| --- | --- | --- | --- |
| Journal rows as queryable triples (`:_tx/change`, `:_tx/changed-entity`, header facts) | **Yes.** Documented and modeled | `docs/operational-primitives.md:37-56` ("Every successful `transact` persists an `_Transaction` entity with ...", "The same facts remain available to Datalog for application-specific audit queries"); `docs/datalog.md:36-43` (`["?tx", ":_tx/actor", "?actor"]`); tenant protocol `Match`, `Query` (`host/src/Protocol.ts:140-150`); O-REPLAY R-JNL-5 (Q33g, accepted); Q49a | Removing them: **Sam** (SCOPE 1 item 3, raw native queries still make sense; goal 10, public TypeScript integration) |
| Raw `:_tx/change` JSON content | Contract-visible, versioned by the lab | R-JNL-5 compares it; Q90e (pending, orchestrator) already changes it to v2 under contract 0.4.0 and O-REPLAY 0.5.0 | Orchestrator, with a contract version and an O-REPLAY version |
| Typed record (`TransactionRecord`, `TransactionChange`, `transaction`, `transactions`, `transactionByCommand`, `transactionsForEntity`) | **Yes** | exported from `@triplex-build/triplex` (`core/src/index.ts:80-81`, `Triples.ts:92-119, 255-272`); HTTP `Transaction`, `TransactionByCommand`, `Transactions` (`Protocol.ts:152-160`); CLI (`cli/src/operations.ts:241, 310-315`); R-JNL-1 | Unchanged by every option here |
| Receipts | **Yes** | `TransactionResult` (`Triples.ts:58-64`); O-REPLAY receipts bind `txId, position, instant, assertionIds` (SCHEMA 2.2) | Unchanged by every option |
| Feed entry shape | **Yes, pinned** | Q98a (identity-only, never a value or envelope), feed-entry/1 pinned in contract 0.4.1 (Q100g) | Unchanged; no feed reads journal content |
| Physical rows, tables, frames encoding, id bytes | No | broker files unpinned (INT-Q 243 paths, HS01 247 paths, zero pins); Q102a-e pending name the tables only in the protected-copy inventory | Lab, with the Q102a wording amended |

So B is internal: it changes how the broker stores rows that keep their exact answers. C changes what is stored as a triple on every lane,
which is the documented, queryable surface.

## 6. Ids: compact encoding and contract

1. **Contract.** `TripleId` must match `^[0-9A-Z]{26}$` and `TransactionId` `^_tx/[0-9A-Z]{26}$` (`Branded.ts:4, 43`, exported). Ids
   appear in receipts, feed entries (`assertionId`, `txIds`), journal changes and every read; their string form is public, their storage
   form is not. Production uses canonical ULIDs (`utils/id.ts`, `monotonicFactory`). The public `deterministic: {startTime, seed}`
   runtime option (`docs/custom-runtimes.md:173-191`, `runtime/Runtime.ts:65-81`) produces
   `hash.toString(36).padStart(8) + counter.toString(36).padStart(18)` (`RuntimeServices.ts:60-66`), which is inside the public pattern
   but not Crockford (it can contain I, L, O, U and a first character above 7), so HS01's codec stored all 12,568,376 ids as TEXT.
2. **Codec (recommended).** Encode an id as: 16 bytes if it is a canonical Crockford ULID (HS01's `packId`); else 17 bytes of its base-36
   value if it matches `^[0-9A-Z]{26}$` (36^26 < 2^135, so every public id fits); else TEXT. Blob length tells the decoder which; the
   write-time round-trip check already in HS01 catches any slip. A transaction id is stored as the same 16 or 17 bytes of its 26-character
   tail wherever it is stored apart from `ents`. The run test for B uses integer successor on the packed value, which is right for both
   generators (the deterministic counter is the low base-36 digits; `monotonicFactory` increments the 80-bit random part).
3. **Measured effect** [M]: fact rows plus index 106.72 to 84.24 B per fact; journal rows 213.70 to 163.49 if kept as rows; the B record
   9.52 to 7.59. About 18 of the 22 B on facts are the two id copies (row and `facts_id`); the rest is binding interned ref ids as INTEGER
   instead of REAL (1,466,123 ref facts and 1,890,782 changed-entity rows are REAL today, 8 bytes each).
4. **Generator change (rejected).** Making the deterministic generator emit Crockford ULIDs would save 1 more byte per id (16 instead of
   17), but it changes the output of a documented public option, every deterministic fixture's ids and every seed manifest built with it
   (a new comparison series under Q101a's readback rule). The codec gets 95% of the gain with no visible change.

## 7. Recommendation and predictions

**7.1 Do B now, ask Sam about C.** B alone brings the broker under G9 and needs no ruling beyond the HS01 ones. C is worth asking because
the journal is the largest single storage item on the other lanes too, and because it removes the drift risk B carries (B's worker must
copy core's change encoder; C stores no change JSON anywhere).

**7.2 Broker store predictions** (10k: 4,468,284 facts; 100k: 44.68M facts; frames fixed at 1,024 frames of 64 commands, 626 MB today,
about 156 MB under C) [D]:

| Layout | 10k B/fact | 10k GB | 100k B/fact | 100k GB |
| --- | ---: | ---: | ---: | ---: |
| HS01 measured | 509.08 | 2.275 | about 383 | 17.1 |
| A: id codec only | 436 | 1.95 | 310 | 13.9 |
| B0: record, TEXT ids | 305 | 1.36 | 179 | 8.0 |
| **B: record plus id codec (recommended now)** | **281 (band 267 to 295)** | **1.25** | **154** | **6.9** |
| C: journal v3 (after Sam) | about 175 | 0.78 | about 144 | 6.4 |
| R45 round 2 forecast (64 MB tail, 16-byte ids) | 150 to 195 | 0.67 to 0.87 | | 6.7 to 8.7 |

B with R45's 64 MB tail instead of 1,024 frames would be about 155 B per fact, inside R45's forecast band, so the forecast and this
measurement agree once the tail and id assumptions are matched. The remaining large items after B are facts (85, of which 30 is
`facts_id`), the entity dictionary (28, of which the `_tx/...` names are about a quarter) and heads, claims and operations (17.6, all keyed
by TEXT); none is needed to pass G9.

**7.3 Other lanes** [E, method: J01's per-row costs with the rows removed or added as stated]:

| Lane | Today, one 10-fact command | Under B | Under C |
| --- | --- | --- | --- |
| XTDB A0 source log | 30,061 B (journal 14,394) | unchanged | about 18,100 B (-40%): keep position and command id (about 711 B each), drop changed-entity and ten change rows, add one list row (about 980 B) |
| XTDB compact | 26,397 B (journal 12,554) | unchanged | about 15,900 B (-40%) |
| QLever A0 / compact triples | 663 / 447 (journal 384 / 258) | unchanged (the replica still receives core's journal rows through the frames) | about 363 / 246 (-45%); change JSON literals (20,880 B per command) gone |
| Datomic `:f` entities per W0 command | 28.9 (18.63 journal) | unchanged | about 14.3 (-51%), and no JSON value copies; the position header could later come from `:triplex.tx/position` |

Lane X behind the broker (P2B) and lane Q's replica receive their rows from the broker's frames, so only C reduces their engine-side
journal; B reduces only `broker.db`.

**7.4 Disk.** The 10k run needs about 1.25 GB plus the 5 GiB floor; the host has about 11 GiB free today. The 100k run under B needs about
6.9 GB plus the floor, about 12 GiB, which the host does not have now: admit 100k only after space is freed or on the VM pool disk.

## 8. Builder brief: EXP-HS01 round 2, journal record and id codec (Codex medium)

**North star:** P5 and P4 (bytes per fact, working set), with the P2/P1 recovery floor and exact answers as the floor.

**Read first:** `CLAUDE.md`; `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; this file sections 2 to 4 and 6; R45 sections 5 and 6;
`lab/experiments/EXP-HS01/REPORT.md`; `packages/qlever/src/broker/{row-codec.ts, sqlite-worker.ts}` on the HS01 branch;
`packages/core/src/store/{transactionMetadata.ts, TriplesLive.ts}`; RT01's `transactionMetadata.ts` diff (v2 change JSON).

**Base:** the `exp/HS01-host-store-layout` branch at `2f7b42d6`, as a round 2 on the same branch. Do not touch
`/Users/sam/projects/triplex-db`, ports 15442/17019, Docker or colima; heavy commands through `lab/bin/heavy.mjs`. No edits under
`lab/acceptance/` and no core, adapter, frame or public API change.

**Do:**
1. Id codec in `row-codec.ts`: Crockford ULID to 16 bytes, else `^[0-9A-Z]{26}$` base-36 to 17 bytes, else TEXT; decode by length; used for
   `id`, change references and the record's ids. Bind interned ids (refs, changed-entity) as INTEGER.
2. Journal record in `txs` (section 4.1 schema or equivalent): encode per transaction before `BEGIN IMMEDIATE`, synthesize, compare every
   own field with `Object.is`, and store the transaction's rows in `journal` verbatim on any difference. Header flags for absent actor and
   command id and for correlation, causation and config snapshot; `vf` offset for RT01's `stagedAt`; change list as a run with an explicit
   packed list when the run breaks; changed-entity rows derived from the change targets' entities in order.
3. Change derivation for both v1 and v2 JSON, one function for encode and decode, chosen by the stored value's `v` key.
4. Reads: `rows()` synthesizes journal rows for `id`, `entities`, empty, `recent(after)` and `pull` at a basis, then unions the verbatim
   `journal` table. A retired journal row sets its record's flag in the same append and is served from `history`.
5. Keep every op name and result shape; keep frames, CRC chain, positions, retention and recovery exactly as HS01.
6. `[EXP-HS01-R2] Why/Rejected` comments at each non-obvious choice; REPORT with predictions beside measurements (section 7.2) and the
   PASS/receipt audit table; durable evidence in `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01-R2/`; no self-promotion.

**Do not:** change core's journal, the frame payload, the adapter's routing, or any public shape; intern fact values; implement C.

**Gates** (one source-frozen final attempt, receipts bound to source hashes):

| Gate | Pass condition |
| --- | --- |
| G1 build | qlever and core build, typecheck, lint, format, `git diff --check` |
| G2 package and G0 | QLever package and G0 QLever and XTDB pass with HS01's current skip inventories, no unexpected skip |
| G3 SQL01 | 11/11 with the independent event oracle, zero mismatches; checkpoint barriers pass |
| G4 P2Q | offline matrix and storage controls as HS01, default infinite frame retention |
| G5 route harness | 93/93 including the actual H1 driver |
| G6 equivalence (extended) | HS01 v2 worker (retained as a test-only reference) against round 2 on one generated stream with asserts, retractions, replacements, retract-pattern, mixed assert/retract order, absent actor or command id, correlation, causation and config snapshot present, a retired journal row, nested groups, epochs and both change JSON versions; >= 50,000 reads across `pull` at cuts, `recent(after)` with id, entity (`_tx/...` and application), empty selections, journal rows by id, and core's `transaction`, `transactions`, `transactionByCommand`, `transactionsForEntity` through the broker adapter; every answer byte-identical after canonical sort; zero mismatches |
| G7 codec property | >= 100,000 ids and records: canonical ULIDs, deterministic base-36, lowercase, wrong length, non-alphanumeric, leading zeros, ULID runs across a millisecond tick, broken runs; every decode byte-identical; report record fallback and TEXT-id rates |
| G8 retention and recovery | HS01's G8 unchanged, plus kill points during an append that writes records and during a journal-row retirement |
| G9 bytes | W0 10k through the HS01 seed tool, replica detached, `tailFrames` 1,024: **<= 300 B per asserted fact and <= 1.4 GB**; predicted 281 (band 267 to 295); journal component <= 10 B per fact; facts and `facts_id` <= 90; zero TEXT ids; record fallbacks equal to the number of transactions with a retraction; dbstat per object beside section 7.2. 100k only after 10k lands inside the band and the disk check passes (about 12 GiB) |
| G10 diagnostics | commit p50/p99 against HS01 on the same SQL01 schedule; `transactions()` page time against HS01 |
| G11 pack and evaluator | lab pack gate passes; evaluator all-pass on the committed tree |

**Review:** a Codex high reviewer gets the diff and sections 4.1 and 6 of this file, not the builder's report, and is asked first for any
read whose answer differs between HS01 and round 2 and any input the codec or the record decodes differently from what was written.

**Contract:** broker files are unpinned, so round 2 merges with HS01 after review without a contract version. Proposed orchestrator
rulings for the next contract build:

| Proposed | Ruling |
| --- | --- |
| R47-a (amends Q102a, Q102d) | The broker stores each transaction's journal as one record from which its journal rows are synthesized; a record is accepted only when every synthesized row equals the written row field by field, otherwise the rows are stored verbatim. The protected-copy inventory names facts, history, journal records and verbatim journal rows, and the dictionaries. |
| R47-b | Stored ids use a lossless 16- or 17-byte encoding of the public id string, decided by length and verified on write; the public id string is unchanged. |
| R47-c (finding for DF01) | A Datomic feed change is an application change: journal facts (`_Transaction` entities) are excluded, as on the broker and P2X. |

## 9. The question for Sam

**Should the journal stop storing one triple per change?** Today every commit stores, as ordinary queryable facts, one `:_tx/change` fact
per changed fact (a second copy of that fact) and one `:_tx/changed-entity` fact per changed entity. They are 64% of rows on the broker,
48% of XTDB commit bytes, 58% of QLever triples and 64% of Datomic's fact entities. The typed journal API
(`transaction`, `transactions`, `transactionByCommand`, `transactionsForEntity`) and the receipts and feeds do not need them stored.

| Option | What users see | Cost |
| --- | --- | --- |
| **A (recommended)** | The typed journal API returns exactly what it returns today. The per-transaction facts (position, actor, command id, correlation id, causation id, config snapshot) stay queryable, so `["?tx", ":_tx/actor", "?actor"]` still works in Datalog and native queries. `:_tx/change` and `:_tx/changed-entity` are no longer queryable as facts. | Docs and O-REPLAY R-JNL-5 amended; contract version; built after RT01 merges. Gains in section 7.3. |
| B | Same as today: both families stay queryable through Triplex's Datalog and `match`, synthesized on read. Raw native queries (XTQL, SPARQL, Datomic Datalog) no longer see them. | Read-time synthesis in six compilers; larger build and test surface for the same bytes as A. |
| C | No change. | The broker passes G9 with section 8 alone; XTDB, QLever and Datomic keep the journal as their largest storage cost, and the 100k rung on those lanes carries it. |

## 10. Risks and open items

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Production ULIDs break runs when the millisecond ticks inside a transaction | more explicit change lists, a few bytes per fact | G7 measures the rate; core could later allocate one ULID per transaction and increment it (a C-era option) |
| RT01 merges with v2 change JSON before round 2 supports it | every change row stored verbatim | round 2 derives both versions; G9 catches a regression as bytes, never as a wrong answer |
| Synthesis misses a worker selection | a wrong read | G6 covers every selection kind and the typed API through the adapter |
| G9 margin is about 6% and frames are 140 B per fact of it | a seed profile change could fail G9 again | frames are a fixed tail; C removes 76% of frame bytes; R45 5.7 option 2 (frame codec) remains |
| `transactions()` still reads every journal row and filters afterwards | O(total history) on every lane | under B it now synthesizes from records; a position-range adapter method is a cheap follow-up under C |
| Erasure physically deleting a referenced fact | a change cannot be hydrated | R38 keeps identities and writes markers in place; ER01 keeps it that way |
| DF01 emits journal facts as feed changes | P3 audits see `_tx/...` entities | R47-c; filter in `feed.clj` |

## Appendix A. Reproduction

Scratch directory `/private/tmp/claude-501/-Users-sam--claude-spares-spare-aGUQ31/f6cb21a3-65b3-4dbb-938c-068fe085c763/scratchpad/r47/`;
store `S = .../evidence/CX-HS01/final-67ab6c55-599b-4c53-917f-9d39f88b1035-w0-10000/store/broker.db`, always opened `?mode=ro`.
Python 3 stdlib (`python3 -I`), sqlite3 CLI 3.51.0 for dbstat.

**A.1 `verify.py`** (29 s): scans `journal ORDER BY e, id`, groups by transaction, and counts: attribute order against
`{2:0,3:1,4:2,5:3,6:4,7:5}`; `int(id, 36)` consecutive across the group; change references (`v` of attribute 7) consecutive and ending at
the first journal id minus one; for `e % 10 == 0`, the change targets' entities (looked up in `facts`, then `history`) deduplicated in order
against the changed-entity values. Output in section 2.3.

**A.2 `build.py`** (26 s, 261 MB scratch file): creates `bfacts`, `cfacts`, `bjournal`, `cjournal` with HS01's column set and
`PRIMARY KEY(e, id) WITHOUT ROWID` plus a unique id index; copies facts with `e % 10 = 0` ordered by `(pos, id)` as stored (`b`) and with
`int(id, 36).to_bytes(17, "big")` and INTEGER refs (`c`); copies the journal rows of transactions with `tx % 10 = 0` the same two ways; and
writes one record per transaction into `jtx(pos INTEGER PRIMARY KEY, j0 BLOB, nc INT, f INT, actor INT, cmd TEXT, refs BLOB)` with
`UNIQUE INDEX jtx_j0(j0)` (and `jtxt` with TEXT ids), `refs` null when the change run holds. Then:

```sql
SELECT name, sum(pgsize), sum(ncell), sum(unused) FROM dbstat GROUP BY name ORDER BY name;
```

Denominators: 444,768 sampled fact rows; 447,528 sampled changes x (4,468,284 / 4,470,238) = 447,332 asserted facts for the journal tables.
The 10% sample reproduces the full store's journal (213.70 against 213.77) and facts (106.72 against 107.37) within 0.6%.

**A.3 Frames** (`frame2.py`): parses the last 20 commit-group payloads and sums the JSON length of member rows whose entity type is
`_Transaction` against the rest. The scratch files are disposable; the scripts regenerate them in about a minute.

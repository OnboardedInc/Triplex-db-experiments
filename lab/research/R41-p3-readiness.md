# R41: P3 change-feed readiness on lanes X, Q and D

Planner R41 (Opus 5.5, high), 2026-11-08 (lab clock 2026-11-09). Repository /Users/sam/projects/triplex-db-2, main at cd1266d2.
Read-only audit: no engines, no Docker, no product code edited.

North star: P3, "an ordered, resumable change feed, so the runtime knows which subjects to re-run" (`lab/NORTH-STAR.md` item 3).
Measured by `lab/TARGETS.md:19` (bar) and `lab/TARGETS.md:52-62` (section 1.1 P3 semantics), golden scenario 19 (`lab/TARGETS.md:236`),
and contract obligation NS.P3 with thresholds NS-P3-GAPS-MAX, NS-P3-ORDER-VIOLATIONS-MAX, NS-P3-LAG-P99-MS (250),
NS-P3-VISIBLE-DUP-EFFECTS-MAX (`lab/acceptance/obligations.json`, contract 0.3.12).

## Summary

**No lane has a P3 result that can close NS.P3.** Every P3 number in the lab is diagnostic: none ran with 256 readers, none used the
O-DOMAIN affected set, none went through an executing gate, and all predate contract 0.4.0.

| Lane (best existing arm) | Measured | Measured under a weaker condition | Built, unmeasured | Designed | Missing |
| --- | --- | --- | --- | --- | --- |
| X: XTDB native feed (P2X `tx_feed` plus tailer) | 3 (gaps, order, resume) | 1 (lag: 0 readers, p99 2.9 s, fails) | 1 (entry content) | 0 | 0 |
| Q: broker log feed (P2Q plus SQL01) | 3 (gaps, order, resume) | 1 (lag: 0 readers, p99 13.7 to 24.9 ms, passes) | 1 (entry content) | 0 | 0 |
| D: Datomic (core journal route through DA01; native feed designed) | 0 | 0 | 4 (content, gaps, order, resume) | 1 (lag) | 0 |

Across all three lanes three things are missing outright, and each one blocks closure on its own:

1. **The O-DOMAIN affected set.** TARGETS 1.1 P3 item 3 and Q36e/Q40b define "affected subjects" as direct writes plus subjects whose W0
   read set contains a changed fact, through two references (location, jurisdiction). Every consumer built so far records only the
   directly written subjects (`feed.ts` `member.subjects`; `lab/bench/lib/feed.ts:97-105` `affectedOf`; P2X `transacts[].subjects`).
2. **A lag measurement with 256 readers.** P2Q, P2X and N01 all ran at zero readers. N01's receipt labels its zero-reader lag
   "lag p99 ms at L256" (`lab/runs/NS/NS-xtdb-20261108T001701Z-6f67e0.json`, `ns.bars.P3`).
3. **Erase entries.** No feed has an `erase` op; R38 needs one so caches advance their erasure frontier from the feed (R38 3.2).

The shortest path is in section 4. In order: one feed contract and one off-engine consumer store for all lanes (EXP-FD01), the
dependency-index consumer (EXP-DI01, R37 B6), a measurement upgrade to the NS bench (EXP-P3M), then one screening window per lane on an
exclusive slot. Lane Q is closest. Lane X's native feed misses lag by an order of magnitude because the consumer's durable write queues
in XTDB's serial indexer; moving that write off the engine is the fix, and P2B (XTDB behind the broker) inherits lane Q's feed anyway.
Lane D has no feed route at all yet.

## 0. Sources read

| Source | What it gave |
| --- | --- |
| lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md, lab/PROTOCOL.md | P3 definition, semantics, requirement row, rules for briefs and slots |
| lab/research/R13, R18, R23, R25, R29, R33, R37, R38, R39, R40 | log of record, feed prior art and X3, P2B predictions, SQLite threads, Datomic feed design, record stamps, GS readiness, erasure, lane X P2, lane Q P4 |
| lab/acceptance/RULINGS.md, RULINGS-PENDING.md | Q31c, Q31h, Q36a, Q36e, Q38f, Q40b, Q42b, Q51b, Q55d, Q58c, Q58e, Q62a m6, Q67d, Q76e, Q84a-b, Q89, Q90, Q94, Q95, Q96 |
| lab/acceptance/obligations.json (0.3.12) | NS.P3 statement, EP-FEED, M-FEED-GAP, CS-NS P3 cases, NS-P3 thresholds |
| lab/NOTEBOOK.md | P3 learnings 479-481, 666-668, 911-918, 1023, 1111-1113, 1149, 1194, 1534, 1617, 1813 |
| lab/experiments/EXP-P2X-xtdb-commit-feed/REPORT.md (main) and branch exp/P2X-xtdb-commit-feed fb6681a4 | CommitFeed.ts, bench/run.mjs, receipts trace-C-*, crash-*, preload-C-* |
| lab/experiments/EXP-P2Q-qlever-log-broker/REPORT.md (main) and branch exp/P2Q-qlever-log-broker 561410d2 | bench/run.mjs, receipts P2Q-trace-C-*, P2Q-crash-*, REPORT-round10.md |
| branch exp/SQL01-broker-sqlite 4863a8e0; verify/SQL01 73fbe452 | broker/feed.ts on SQLite, REPORT.md, REPORT-round2.md, lab/verify/SQL01/evidence/r2b-kill50.json |
| branch exp/RT01-record-time 506cfaf2 | journal change JSON v2, `instant` from the position row's decided stamp |
| branches exp/DA01-datomic-adapter 89c31355, int/DA01 6e5dde97 | no feed route in packages/datomic; DA00 REPORT:76 (log route returns 404) |
| packages/core/src/store/Triples.ts, TriplesLive.ts, operational/ConsumerCheckpoint.ts; packages/testkit/src/index.ts | the core journal feed route and its conformance cases |
| lab/scenarios/lib/runner.mjs, composition.mjs; branch exp/W02-gs-harness-v2 2e09b37e | the GS feed consumer and its lag definition |
| lab/bench/lib/feed.ts; lab/runs/NS/NS-xtdb-20261108T001701Z-6f67e0.json | the NS P3 consumer and the only NS P3 receipt |
| lab/oracles/domain/cli.py; lab/world/W0/SPEC.md sections 6.3 and 10 | O-DOMAIN `affected`, static read sets |

## 1. The P3 measures against the three lanes

### 1.1 Cell key

| Code | Meaning |
| --- | --- |
| M | measured: a receipt took this measure under the TARGETS condition for it (all such receipts are DIAGNOSTIC today) |
| M- | measured under a weaker condition than TARGETS asks; the condition that is missing is named |
| B | built (code exists on a branch or main) but no receipt measures it |
| D | designed in a research report or ruling; no code |
| X | missing: neither built nor designed |

The TARGETS conditions per measure (`lab/TARGETS.md:19`, `:52-62`):

| Measure | Condition |
| --- | --- |
| Entry content | each entry carries tx, entity, attribute and the valid-time range affected (also TARGETS 3 row 3, `lab/TARGETS.md:122`) |
| Gaps | zero over a run; every committed position accounted (Q55d), aborted offsets listed (Q31c) |
| Per-subject order | zero violations over a run; cursor (epoch, position) |
| Exact resume | at-least-once from the checkpoint; effects keyed by (consumer, position, subject); crashes at three points; zero visible duplicates; replay attempts counted |
| Lag p99 | ≤ 250 ms from the source's publication instant (host monotonic clock) to the consumer's single durable write of the affected-subject set and checkpoint, with P1's 256 readers running |

### 1.2 The table

Each lane's row names the arm audited. Lane X has two arms (R39 open question 2): the native feed P2X, and P2B (XTDB behind the broker).
The A0 rows are the controls every lane already has: core's journal route `transactions({after, limit})`.

| Lane, arm | Entry content | Gaps | Per-subject order | Exact resume | Lag p99 with 256 readers |
| --- | --- | --- | --- | --- | --- |
| **X native: P2X `tx_feed` plus source-log tailer** (exp/P2X-xtdb-commit-feed fb6681a4, unreviewed, about 460 commits behind main per R39) | **B.** `XtdbFeedResolution` carries msgId, epoch, offset, stamp, operationId, transacts with positions and subjects, the attribute set and the valid-time hull (CommitFeed.ts:58-75); exact per-change (op, entity, attribute, validFrom, validTo, ordinal) only with `exact: true` or when METADATA overflows (CommitFeed.ts:49-56, :193, :224-252). The bench ran without `exact` (bench/run.mjs:46), so the per-change tuple was not exercised under load. No per-entry comparison with O-REPLAY | **M.** 0 gaps in every audited run: trace-C-20261107T222624Z-88da3e, trace-C-20261107T224022Z-078ae0, preload-C-20261107T220139Z-ece318 (5,000 commits), 5,313 aborted resolutions listed; Q31c falsifiers F1 to F4 pass (subject-stamp.test.ts 13/13, REPORT.md:24-27). But 63 positions had no publication instant (`feed.missingPublication`, trace-C 88da3e), which Q55d counts as a failed run | **M.** 0 order violations in the same receipts | **M.** 100 crashes per variant at the three points: keyed-atomic, unkeyed-atomic, keyed-split 0 visible duplicates; unkeyed-split control 99 (crash-*-20261107T2230*.json, REPORT.md:59-62) | **M-** (0 readers). Steady p99 2,909.5 ms, burst p99 3,545 ms (trace-C 88da3e); 3,758 ms saturated (preload-C). Consumer write p50 431 ms, p99 2,212 ms; poll p50 11.7 ms, p99 659 ms. Fails by 11x before any reader is added |
| **X P2B: XTDB behind the broker** (Q51b, Q58b; R23 section 6; R39 section 5) | **D.** Inherits the broker feed (lane Q row) | **D** | **D** | **D** | **D.** R23 prediction 2: p99 ≤ 50 ms steady, ≤ 250 ms through the burst (R23-log-of-record-compositions.md:263) |
| X A0 control: core journal | B (TransactionChange carries tx, entity, attribute, validFrom, validTo, and the value; Triples.ts:91-117) | M- (N01: 11 gaps, later traced to positions acknowledged after the consumer stopped, commit 7ed77c65) | M (N01: 0) | M (N01: three crash points resumed exactly, 1 replay attempt) | M- (0 readers: N01 41,626 ms; GS receipts 10 to 39 s at 1 reader, measured from ACK to "seen", not durable record, runner.mjs:531-532) |
| **Q: broker log feed** (exp/P2Q-qlever-log-broker 561410d2 in review round 10; exp/SQL01-broker-sqlite 4863a8e0 accepted default-off; neither merged) | **B.** `FeedChange` (op, entity, attribute, validFrom, validTo, position) and `FeedTransact` (position, positions, operationId, txIds, commandIds, subjects) (SQL01 feed.ts:37-53); frames only up to the durable watermark (feed.ts:98-106); EPOCH_BEGIN resolves to epoch plus aborted LSNs (feed.ts:109-119). **No record stamp in the entry.** No per-entry comparison with O-REPLAY | **M.** 0 gaps: P2Q-trace-C-offline-20261107T222019Z-2591e8 (180 s, 3,414 commits with the 50x burst), P2Q-trace-C-20261107T222347Z-0bccda (dev), P2Q-trace-C-offline-20261108T002425Z-76dc92 (Q62a m6 harness, exits 1 on any gap); Q31c falsifiers pass (P2Q REPORT.md:31); on SQLite, 50 abrupt stops resumed 190 feed positions with none missing (r2b-kill50.json, SQL01 REPORT-round2.md:32) | **M.** 0 in the same receipts | **M.** 100 crashes keyed: 0 visible duplicates, 136 replay attempts; unkeyed split control 129 duplicates (P2Q-crash-*-20261107T2142*.json, P2Q REPORT.md:29-30); SQLite kill-50: 0 duplicates | **M-** (0 readers; hand-rolled log, not SQLite). From source publication (Q55d recompute): p99 13.7 ms offline, 24.9 ms on dev (NOTEBOOK.md:1023); 76dc92 p99 12.1 ms over 33 positions. ACK-based p99 12.8 ms through the burst (2591e8). No run on SQL01's store, none with readers |
| Q A0 control: core journal on QLever A0 | B | B (GS-qlever-20261107T205955Z-c31274 executed zero cases, R37 4.1) | B | B | B |
| **D: core journal route through DA01** (int/DA01 6e5dde97; contract 0.3.13 in review brings it to main) | **B.** Core's TransactionChange (Triples.ts:91-117) served by the Datomic adapter; G1 88/88 includes testkit's resumable-journal case (testkit index.ts:1890-1894) and the checkpoint CAS race (:2467-2480) | **B.** Positions are dense under the scope `:db/cas` (R29 4.3); no gap audit has run | **B** | **B.** ConsumerCheckpoint compare-and-retract (ConsumerCheckpoint.ts:1-8); no crash-point run | **D.** R29:359: `d/tx-range` from the checkpoint t, `tx-report-queue` as wakeup, checkpoint and affected-subject record in one Datomic transaction; gateway route `GET /v1/db/{db}/log?fromT=&limit=&waitMs=` (R29:204) is planned for DA03 and returns 404 today (int/DA01 lab/experiments/EXP-DA00/REPORT.md:76) |

### 1.3 Rows the five measures depend on

These are not separate TARGETS measures, but each of the five cannot close without them.

| Dependency | X native (P2X) | Q broker | D | Why it matters |
| --- | --- | --- | --- | --- |
| Affected set equals O-DOMAIN `affected` (TARGETS 1.1 P3 item 3; Q36e; Q40b two hops) | **X** | **X** | **X** | "Affected subjects known" is the lag end point (item 4). Every consumer uses direct subjects only. N01's "affected-subject set matches = 0" (6f67e0) compares direct subjects with direct subjects. O-DOMAIN has the operation (`lab/oracles/domain/cli.py:8`, W0 SPEC section 10), nothing calls it from a consumer |
| Decided record stamp in the entry (Q90a, Q90c) | **B.** `stamp` is XTDB system time (CommitFeed.ts:64), which Q90c makes the P2X decided stamp after probe p9 | **D.** Frames v2 carry the member stamp (Q90c, R33 1.3 Q6-Q11), but `FeedTransact` has no stamp field | **D.** Peer stamp under `:db/cas` (Q90c); no feed | A consumer that re-runs a subject names a basis; after Q90a `recordedAt: instantOf(stamp)` pins exactly that commit (R33 0 item 7) |
| Entries hold no value or envelope after erasure (TARGETS 7 items 3, 8) | **B.** No value field; METADATA holds ids, attributes, hull; tailer reads only `msg_id, msg_type` (CommitFeed.ts:140) | **B.** No value field (feed.ts:37-44) | **D.** The only route is core's journal, whose `TransactionChange.value` is the full typed value (Triples.ts:98-99). R38 1.4 puts `transactions()` under the marker rule (R38:105), so it returns `ErasedValue` once ER01-C lands; it is erasure-safe by design but never identity-only. The native Datomic feed is not built | See section 2.2. R38 5.3 says "the feed never carried values"; true for the two lane feeds, not for the journal route every harness reads today |
| `erase` entries with assertion id and erasure seq (R38 2.3, 3.2) | **D** | **D** | **D** | Caches advance their erasure frontier from the feed (R38 3.2); `op` is `"assert" \| "retract"` on every feed today |
| Consumer durable state off the engine's write path | **X.** Effects and checkpoint are an XTDB transaction (CommitFeed.ts:284-333), so they queue in the serial indexer | **B.** JSON-lines journal with CRC and fsync (feed.ts:182-302) | **D** (R29:244 puts it in a Datomic transaction) | Section 3: this is the whole of lane X's 2.9 s |
| Feed reads off the main thread | n/a (async pgwire) | **X.** SQL01 keeps the feed utility's synchronous calling surface (SQL01 REPORT.md:17), against Q84b "the main thread never touches broker.db" and R25's `ReadRequest` kind `"feed"` (R25:280) | n/a | A synchronous SQLite read on the event loop delays every other callback in that process, including readers |

### 1.4 What the harnesses measure today

| Harness | Feed route | Lag start | Lag end | Affected set | Readers | Verdict on P3 evidence |
| --- | --- | --- | --- | --- | --- | --- |
| GS runner, main (lab/scenarios/lib/runner.mjs:265-281, :529-532) | core `transactions()` (composition.mjs:105-108) | ACK arrival (`a.doneAt`) | page arrival, not a durable write | entity ids only | 1 (R37 1.2) | not the contracted measurement on start, end or load |
| W02 v2 (branch exp/W02-gs-harness-v2) | core `feedPage` | n/a | n/a | n/a | n/a | the feed consumer is not integrated (`run.ts:96`, "v2 feed consumer, lost-ACK injection and fault executor not integrated") |
| NS bench (lab/bench/lib/feed.ts) | core `transactions()` through `feedPage` | receipt `instant`, the runtime's wall clock (feed.ts:12-13) | durable checkpoint write (feed.ts:190) | direct subjects; shared entities counted by account, not resolved (feed.ts:97-105) | 0 in the only receipt | right end point; wrong start (Q55d asks for the source's publication instant); wrong affected set |
| P2X bench (branch, bench/run.mjs:36-70) | P2X CommitFeed | writer's publication map per operation id | after `recordFeedProgress` (durable XTDB write) | METADATA subjects | 0 | right shape; 63 positions unstamped; consumer in the engine |
| P2Q bench (branch, bench/run.mjs:145-158, :301-320) | broker LogFeed, 5 ms idle poll | `watermarkAt` per LSN (source publication) | consumer's fsynced record | frame subjects | 0 | right shape since Q62a m6; hand-rolled log, no readers |

## 2. How record time at decision (RT01, Q90) and erasure (R38, Q95) change the feed

### 2.1 Record time at decision

RT01 (exp/RT01-record-time 506cfaf2, fix round 2 done, live G2 and G6 queued in the scale window) implements Q90a-g for core, testkit,
the harness and both A0 adapters (round A). Round B moves the broker, P2X and DA01 (Q90g). Each change below has a feed consequence.

| # | Q90 change | What it does to the feed | Lane X P2X | Lane Q broker | Lane D | Core journal (A0 controls) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | One stamp per transaction, `max(previous + 1, clock)` in decision order, strictly increasing with position (Q90a, R33 S2-S3) | Every entry carries its transaction's decided stamp. Position order and stamp order are then the same order, so a per-subject order check can use either | built: `stamp` is XTDB system time (CommitFeed.ts:64) and positions are derived from it (`stampedPosition`, CommitFeed.ts:204), so the two orders are identical by construction | missing in the entry: frames v2 carry the member stamp (Q90c; R33 1.3 Q6, Q10) but `FeedTransact` has no `stamp` (feed.ts:45-53) | missing: no feed; the stamp is decided on the peer under `:db/cas` and validated by the gateway, never `:db/txInstant` (Q90c) | RT01 derives `instant` from the position row's `recordedAt`, the decided stamp, and drops `:_tx/instant` (RT01 diff of packages/core/src/store/transactionMetadata.ts) |
| 2 | Journal values hold no own record instant; change JSON v2 (Q90e) | Journal-route entries get `recordedAt` and `retractedAt` filled at decode. Raw change bytes differ across the v1 to v2 boundary | n/a | n/a | n/a | The NS bench hashes raw `tx.changes` (`changesDigest`, lab/bench/lib/feed.ts:35-38); the hash changes at the boundary. Harmless only because contract 0.4.0 starts a new comparison series (Q90f) |
| 3 | `validFrom` defaults to `stagedAt`, not the stamp (Q90b) | The valid-time range in an entry starts at `stagedAt` when the command omitted `validFrom`; that can be earlier than the stamp | consumers must use the entry's `validFrom`, never the stamp, as the start of the affected range | same | same | same |
| 4 | Record-time watermark: a read at T above W waits up to 2 s, then `BasisNotAvailable {axis: "recordedAt"}` (Q90d) | A consumer that re-runs a subject at the delivered entry's stamp never waits, because a delivered entry is decided. A consumer that re-runs "at now" on the wall clock can wait up to 2 s and adds that to the work after "affected subjects known" | rule needed (R41-d) | rule needed | rule needed | rule needed |
| 5 | Seals in round 2: `STAMP_SEAL` frames with an LSN, no members, no position; "the feed ignores it" (R33:570) | `LogFeed.poll` skips every non-commit frame (feed.ts:121), so the cursor moves over seals. Positions stay dense, but an audit that counts LSNs would report each seal as a gap | n/a (XTDB has no seal frame) | the feed should emit a `seal` resolution so the LSN prefix stays fully accounted (Q31c) | n/a | n/a |
| 6 | Lost-ACK replays return the original stamp (Q90c; R33 1.3 Q8) | A re-sent command produces no new position and no new stamp, so no new feed entry | required case | required case | required case | required case |
| 7 | Per-subject concurrent arms need a decider-side stamp (Q96b) | With concurrent writers a client stamp is not monotone with position, which would break the stamp order the feed reports | engine stamp: safe | broker stamp in `commitGroup`: safe | peer stamp under `:db/cas` on the scope: safe while the scope CAS serializes; a per-subject arm (DA03) needs the gateway to decide the stamp | A0 serializes, so the client stamp is safe only there (Q96b) |
| 8 | Two clocks (R33 1.3 Q14-Q15) | The stamp is decided wall-clock record time. P3 lag starts at the source's publication instant on the host monotonic clock (TARGETS 1.1 P3 item 1). They are different fields on different clocks | the writer's publication map is host monotonic (bench/run.mjs:60): right | `watermarkAt` per LSN (P2Q bench/run.mjs:301): right | not built | the NS bench takes the receipt `instant` as commit time (lab/bench/lib/feed.ts:12-13); after RT01 that is the decided stamp, a wall-clock value, so the bench's lag start is on the wrong clock |

**"Stamps must be decided" holds on both built feeds** for one reason each: the broker returns frames only up to the durable watermark
(feed.ts:98-106), and the P2X tailer stops at the first transaction that is appended but not yet resolved (CommitFeed.ts:179-183). A
Datomic feed built on `tx-range` returns only committed transactions. What is missing is the stamp field itself on lanes Q and D.

### 2.2 Erasure

R38 (Q95a-h; Sam decisions S1-S4 pending as Q95-S) designs erasure as crypto-shredding with sealed values in core.

| # | Requirement | Effect on the feed | State |
| --- | --- | --- | --- |
| 1 | No plaintext after erasure (TARGETS 7 items 3 and 8) | The broker feed and the P2X feed carry identities only (feed.ts:37-44; CommitFeed.ts:49-56; METADATA holds ids, attributes and the valid hull; the tailer selects only `msg_id, msg_type`, CommitFeed.ts:140). They hold no value and no envelope, so erasure changes nothing in them | holds on X and Q by construction |
| 2 | The journal route returns values | Core's `transactions()`, `transaction()`, `transactionByCommand()` and `transactionsForEntity()` return `TransactionChange.value` (Triples.ts:98-99). R38 puts `transactions()` under the marker rule (R38:105), so after ER01-C it returns `ErasedValue` for erased assertions. That is erasure-safe, but it is a value-bearing history route, and every harness uses it as the P3 feed today (runner.mjs:270, composition.mjs:105-108, lab/bench/lib/feed.ts:138, W02 faults.ts:77) | P3 consumers must move to identity-only feeds (R41-a) |
| 3 | Derived copies are protected copies (TARGETS 7 item 3) | W02's `FeedReplica` (faults.ts:66-80) rebuilds a replica from the journal route with values. Any consumer that keeps values from the feed is a protected copy that the inventory must list. Consumers that keep subject ids only are not | inventory entry missing |
| 4 | Erasure is an ordinary commit and the runtime re-runs the subject (R38 5.3; W0 `everify.ssn-erased`, Q36f) | Each feed needs an `erase` op. R38 2.3 names its fields as (entity, attribute, validFrom, validTo, position). R38 3.2 also has every route behind the frontier "wait at most 10 ms for the feed to deliver the missing erase transacts", which needs the assertion id and the ledger `seq` in the entry | not built on any lane; `op` is `"assert" \| "retract"` in feed.ts:38, CommitFeed.ts:50 and Triples.ts:92 |
| 5 | Exact resume across erasure | With identity-only entries a replay after an erasure returns the same bytes as the first delivery. The feed needs no "modulo erasure" relaxation, unlike pulls (TARGETS 7 item 2) | holds on X and Q by construction; rule R41-f states it |
| 6 | Excision on lane D (Q88c, Q95h: excision removes `:f.v/string` value datoms) | Datomic excision removes the excised datoms from the log as well as the indexes (Datomic documentation; to be confirmed against the pinned version in EXP-DF01). A feed entry derived from value datoms would change on replay after excision and break exact resume. Entries must come from identity datoms (`:f/subject`, `:f/attribute`, `:f/valid-from`, `:f/valid-to`, the assertion entity), which excision does not touch | design rule for EXP-DF01; required test: resume across an excision batch is byte-identical |
| 7 | Restore re-applies erasure from the ledger (TARGETS 7 item 5; R38 3.6) | A restore rolls the source back and replays erasures as new commits. Consumers checkpointed beyond the restored head must see an explicit epoch change, never a silent rewind (Q31c). The broker's EPOCH_BEGIN covers restarts (feed.ts:109-119); no lane has a restore epoch | missing; a required case in ER01's restore sub-schedule (R38 5.4 row 3) |
| 8 | GS.16 erases 10k subjects at about 50 commands/s (R38 5.2) | Erase entries are feed positions like any other, so the 250 ms lag bar and the gap and order bars apply to them during the job | GS.16 check to add (W02) |
| 9 | Consumer outputs | Affected-subject sets, work-queue rows and checkpoints hold subject ids and positions only; they need no erasure handling. A consumer that also keeps a world-document cache (R18 6.3) must apply erase entries before answering, under R38 3.2 | rule R41-a |

## 3. Where the lag comes from, and whether 250 ms p99 is reachable

### 3.1 Lane Q: the broker log

```
 writer                                                                   consumer
 ------                                                                   --------
 submit --> decision loop --> group commit (up to 64) --> SQLite COMMIT   idle poll (5 ms sleep, P2Q bench/run.mjs:158)
            (CAS, stamp)                                   fullfsync ~3 ms      |
                                                           marker row           v
                                                           = watermark   read frames <= watermark (SQLite read txn)
                                                              |                 |
                                              t_pub = watermarkAt               v
                                              (host monotonic)           decode commit group, compute affected set
                                                                                |
                                                                                v
                                                                         ONE durable write: effects + affected set
                                                                         + checkpoint (fsync ~3 ms)  = t_known
 lag = t_known - t_pub
```

| Component | Measured or estimated | Source |
| --- | --- | --- |
| idle poll wait | 0 to 5 ms | P2Q bench/run.mjs:158 |
| frame read and decode | under 1 ms per group | P2Q 76dc92: p50 5.1 ms end to end |
| consumer fsync | about 2.8 to 3 ms with F_FULLFSYNC on the host | R13 2.2 |
| end to end, 0 readers | p50 5 to 6 ms, p99 12.1 to 24.9 ms | 76dc92, 2591e8, 0bccda; NOTEBOOK.md:1023 |
| 256 readers | not measured | |

**Reachable: yes, with about ten times headroom.** The risks are on the host, not in QLever, because the 256 readers load QLever in the
VM and H1's reader threads on the host (Q84b, Q97a), while the feed reads `broker.db`:

1. SQL01's feed utility is synchronous on the caller's thread (SQL01 REPORT.md:17). A synchronous SQLite read in a process that also
   serves readers delays them, and their callbacks delay the feed. Move feed reads to R25's reader threads (`ReadRequest` kind
   `"feed"`, R25:280).
2. The consumer's fsync and the broker's commit fsync share the host volume. R13 measured an fsync p99 rising from 13.7 ms to 93 ms with
   a background fsync loop inside the VM's ext4; the host APFS figure under the frozen trace is not measured.
3. EXP-DI01's two-hop lookups add work per entry: a location wage change fans out to about 1,100 workers at the 100k rung (TARGETS
   6.1 item 6). One indexed SQLite read of 1,100 ids is milliseconds, not hundreds.
4. A consumer process that also runs the 256 reader clients (as the NS driver does) shares one event loop with them. The measurement
   must run the consumer in its own process or worker so the lag measures the feed, not the driver.

### 3.2 Lane X native: P2X's tailer

```
 writer                                      tailer and consumer (host)
 ------                                      --------------------------
 COMMIT SYNC --> XTDB serial indexer          poll xt.source_log_msgs (pgwire to VM; 2 ms empty poll, R16)
                 resolves the tx                  |
                     |                            v
     t_pub = writer's host instant          xt.txs WHERE _id IN (...)   [blocked if appended, not resolved]
     when COMMIT SYNC returns                     |
                                                  v
                                            recordFeedProgress = an XTDB transaction
                                            (ASSERT checkpoint, INSERT effects, COMMIT SYNC)
                                                  |
                                                  v   <-- queues in the SAME serial indexer as every writer
                                            t_known
```

| Component (trace-C-20261107T222624Z-88da3e, 0 readers, slot s1, 2 CPU) | p50 | p99 |
| --- | --- | --- |
| consumer durable write (`writeMs`, an XTDB transaction) | 431 ms | 2,212 ms |
| one poll (`pollMs`, two pgwire queries) | 11.7 ms | 659 ms |
| polls blocked on an appended, unresolved transaction | 586 of 4,921 | |
| lag, steady | 928 ms | 2,910 ms |

**The consumer's own XTDB write is about three quarters of the lag** (NOTEBOOK.md:913-916: "the consumer's durable write waits in the same
serial indexer as the writers"). Readers make it worse: X05 measured writer-node service at 77 to 290 ms with 4 to 256 readers (R39 2.1).

**Reachable natively only under two conditions, and only if the writer keeps up with the trace:**

1. The consumer's durable write leaves XTDB for a host SQLite store (about 3 to 6 ms, R23 section 3). P2X's own open question 2 says so
   (REPORT.md:84-85).
2. The 256 readers run on a read follower (X05), so the writer node's two CPUs serve the indexer and the tailer only.
3. Even then the poll p99 was 659 ms in a run where the writer itself was saturated (1.9 commits/s against 55/s offered in the burst).
   R39 found one decider needs about 7 ms service or less for the burst; EXP-P2X2 (running now) decides whether XTDB can do that natively.
   If it cannot (decision D1 in its brief), the tailer falls behind during every burst and native lane X misses the bar however the
   consumer is built.

**Lane X through P2B: reachable**, because the feed is the broker's log and does not wait for the XTDB applier at all. R23 predicted
p99 ≤ 50 ms steady and ≤ 250 ms through the burst (R23:263), falsified if lag moves with replica backlog.

### 3.3 Lane D: Datomic

```
 writer                                                         gateway (VM)                       consumer (host)
 ------                                                         ------------                       ---------------
 d/transact via gateway --> transactor (serial) --> storage     tx-report-queue wakes the          receive entries
 (Postgres, DA04) ack --> tx report pushed to peers             long-poll; d/tx-range from t        |
     |                                                           (log tail in peer memory);          v
     t_pub = host instant when the TS client gets the           project identity datoms;          affected set
     transact result (proposed, R41-c)                          map t to position (Q89d)            |
                                                                 HTTP response                       v
                                                                                                   ONE durable write
                                                                                                   (host SQLite) = t_known
```

Nothing is measured. R29 estimates tens of milliseconds because the log tail is already in peer memory (R29:359). Risks:

1. The gateway peer serves the 256 readers' queries and the long-poll on the same JVM and CPUs (R29 section 6, P1 risk 1).
2. R29:244 puts the consumer checkpoint in a Datomic transaction. That is the P2X mechanism again: the consumer's write queues in the
   transactor behind the writers. The consumer store should be the same host SQLite store as the other lanes (R41-b).
3. Dev storage can lose acknowledged commits (Q88a), so lane D P3 evidence counts only on Postgres storage after EXP-DA04.

**Reachable: probably**, with the consumer store off the transactor; unmeasured.

### 3.4 Summary

| Lane, arm | Where the time goes | 0-reader p99 | Reachable at 256 readers? | What decides it |
| --- | --- | --- | --- | --- |
| Q broker | poll wait, decode, one fsync | 12 to 25 ms | yes, about 10x headroom | feed reads off the main thread; consumer in its own process |
| X native (P2X) | the consumer's XTDB write in the serial indexer | 2,910 ms | only with an off-engine consumer store, readers on a follower, and a writer that keeps up with the burst | EXP-P2X2's D1 decision, then EXP-P3X arm A1 |
| X via P2B | as lane Q | not run (R23 predicts ≤ 50 ms steady) | yes | EXP-P2B, then EXP-P3X arm B |
| D | gateway long-poll, transport, consumer write | not run | probably | EXP-DF01 inside the DA03 round, on Postgres |

## 4. The shortest ordered path to P3 on all three lanes

### 4.1 Principle

P3 needs the same five things on every lane: a feed of identity-only entries with decided stamps, a gap and order audit over positions,
a durable consumer that writes effects, the affected set and its checkpoint in one write, the O-DOMAIN affected set, and a lag
measurement from the source's publication instant with 256 readers. Four of those are lane-independent code. So the path builds them
once, offline, and then spends one exclusive slot window per lane. The engines differ only in the feed adapter and in where the source
publication instant comes from.

```
                      lane-independent (no slot)                              per lane (one exclusive slot window each)
  +---------------------------------------------------------------+
  | EXP-FD01  feed contract (FeedEntry), host SQLite ConsumerStore, |      Q:  P2Q + SQL01 merged --> EXP-P3Q window
  |           adapters, conformance suite in testkit              |---+
  | EXP-DI01  dependency index = O-DOMAIN affected, in ConsumerStore|   |  X:  P2X2 verdict --> EXP-P2B --> EXP-P3X window
  | EXP-P3M   NS bench P3: source publication instants, 256 readers |---+         (arm B: broker feed; arm A1: native)
  | ER01-C    erase entries, journal route markers (amendment)     |   |
  +---------------------------------------------------------------+   +  D:  DA04 --> DA03 + EXP-DF01 --> EXP-P3D window
                                   |
                                   v
                 contract 0.4.0 (RT01, O-REPLAY 0.5.0) + G03 + OBS01 --> acceptance runs, one lane at a time
```

### 4.2 In-flight work and the cells it covers

| Work (state) | Cells it moves | What it does not cover |
| --- | --- | --- |
| P2Q round 11, then the P2Q plus SQL01 integration round (P2Q round 10 FIX-FIRST on read provenance; SQL01 accepted default-off at verify/SQL01 73fbe452) | Q: gaps, order, resume carried onto the SQLite store (kill-50 already shows resume) | Q: stamp in the entry; feed reads off the main thread; lag on SQLite; any reader load |
| RT01 round A (fix round 2 done; live G2 and G6 in the scale-window queue), O-REPLAY 0.5.0 (accepted at fed510e), contract 0.4.0 | the decided stamp in the core journal (A0 controls); the comparison series every closing P3 receipt must belong to (Q90f) | the stamp in the lane feeds (round B) |
| RT01 round B (broker frames v2, P2X engine stamp, DA01 peer stamp; Q90g) | the stamp exists in every source | the feed adapters must expose it (EXP-FD01) |
| EXP-P2X2 (running on xtdb-s1) | decides whether native XTDB keeps up with the burst; with D1, "P2X stays A1 for P3" (lab/experiments/EXP-P2X2/BRIEF.md:68) | no feed measurement |
| EXP-P2B (queued after the P2Q merge; Q51b, Q58b, Q96c) | X via P2B: all five cells, by inheriting the broker feed | lag with XTDB as the replica under 256 readers needs EXP-P3X |
| EXP-DA04 (queued), then EXP-DA03 (R29 build plan step 4: "P3 feed" in the NS smoke) | D: the precondition (Postgres storage, Q88a, Q88b) and the first lane D P3 numbers | the log route itself; EXP-DF01 makes it explicit |
| ER01-C and ER01-S (queued and running), then ER01-X, ER01-Q, ER01-D | erasure-safe journal route (markers, R38:105); GS.16 | the `erase` op in the lane feeds, the restore epoch for consumers (section 2.2 rows 4 and 7) |
| EXP-W02 (GS harness v2, round 2 in review) | GS.05, 06b, 08, 19, 20 checks once its feed consumer is integrated | the feed consumer (`run.ts:96`, not integrated) |
| EXP-G03 and EXP-OBS01 | an executing gate and engine-side evidence, needed to close any NS obligation | nothing P3-specific |
| EXP-QG1 phase 2 | a built QLever base (Q91a), so lane Q's reader load in the P3 window counts | nothing P3-specific |
| EXP-X05 (read follower) | the follower layout for X native arm A1 | |

### 4.3 Missing experiments (briefs)

Every brief cites lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md for goals and targets (SCOPE 5.2). Builders are Codex medium,
reviewers Codex high (PROTOCOL 1). They are listed in dispatch order.

**E1. EXP-FD01: one feed contract, one consumer store, three adapters, one conformance suite (builder; reviewer).**
North star: P3 (TARGETS 1.1 P3 items 2, 4, 5, 6; NS-P3-GAPS-MAX, NS-P3-ORDER-VIOLATIONS-MAX, NS-P3-VISIBLE-DUP-EFFECTS-MAX; exact resume).
Measured by a testkit conformance suite run on each lane's feed adapter.
Build, with no engine changes:
1. `ChangeFeed` and `FeedEntry` in packages/core (shape in R41-a): resolutions `commit | aborted | epoch | seal`; per commit the
   stream, epoch, offset or LSN, positions, txIds, operationId, commandIds, the decided `stamp` (nullable until RT01 round B lands on the
   lane, with a flag), and changes `{op: assert | retract | erase, entity, attribute, validFrom, validTo, position, assertionId,
   erasureSeq?}`. No value, no envelope, no key id.
2. Adapters: broker `LogFeed` (lane Q and X via P2B), reading through R25's reader threads (`ReadRequest` kind `"feed"`), never
   synchronously on the main thread; P2X `CommitFeed` (X native), always loading exact tuples (`exact: true`), with METADATA as a
   pre-filter only; core journal (A0 control only, marked as such in receipts).
3. `ConsumerStore` in a host SQLite file with the Q84a pragmas: effects keyed by (consumer, epoch, position, subject), the affected
   set and the checkpoint in one transaction. It replaces the JSON-lines journals in broker feed.ts:182-302 and lab/bench/lib/feed.ts,
   and P2X's in-engine checkpoint, which stays only as a control arm.
4. The conformance suite in packages/testkit: per position, the entry's changes equal O-REPLAY's assertions and retractions for that
   position (identities); a gap audit over positions with aborted, epoch and seal accounting; per-subject order; three crash points,
   100 crashes each, with the keyed-atomic arm and the unkeyed-split control (the control must show duplicates, or the test is void,
   R18 X3 prediction 3); resume byte-identical to first delivery; a re-sent command produces no new position; the M-FEED-GAP
   mutation control (one entry dropped) must be caught.
Gates: G0; G1 on xtdb and qlever with the option off and on; the conformance suite on the broker feed offline, on P2X against
tx2-xtdb-dev at light load, and on the A0 journal for all three lanes. Prediction: lane Q offline lag p99 ≤ 20 ms with the SQLite
consumer store; consumer write p99 ≤ 10 ms. Slot: none.

**E2. EXP-DI01: the dependency-index consumer (builder after a short design check by a planner; reviewer). This is R37 B6.**
North star: P3 ("so the runtime knows which subjects to re-run"; TARGETS 1.1 P3 items 3 and 4; NS-P3-DOMAIN-AFFECTED-SET).
Measured by equality with O-DOMAIN `affected` at every position.
Inside the E1 `ConsumerStore`, keep each subject's W0 dependencies as of the position before each transaction (W0 SPEC 10 item 1,
"before-only is enough") and a reverse index from (entity, attribute) pairs to subjects, including the two-hop path through
`S.location` and `L.jurisdiction` (Q40b) and the release in force (W0 SPEC 10 item 5, Q44b). Per entry: affected = subjects whose
dependencies hold a written pair; ballast writes affect nobody (SPEC 10 item 3, case C57), so "the subjects written directly" is wrong
both ways. Write the affected set, the index delta and the checkpoint in one transaction. Keep a next-boundary schedule from
`dependencyState.nextTemporalBoundary` for GS.20 (R18 3.4 item 3), reported separately because a boundary is not a feed entry.
Gates: zero misses and zero extras against O-DOMAIN `affected` on every W0 case that uses it (11 case files under lab/world/W0/cases
name `affected`, including C35, C36, C57-C60, C87) and at every position of a 10k-rung W0 trace through EXP-P5's trace mapper (Q92k);
GS.06b's case. Measure the added lag at the 100k rung for the largest location (about 1,100 workers, TARGETS 6.1 item 6). Prediction:
added p99 ≤ 20 ms. Slot: none (offline, O-DOMAIN plus SQLite).

**E3. EXP-P3M: the NS bench measures P3 as contracted (builder; reviewer).**
North star: P3 lag (NS-P3-LAG-P99-MS, Q55d, Q67d) and NS-P3-EVERY-POSITION-ACCOUNTED, NS-P3-SOURCE-PREFIX-ENUMERATED.
Measured by a receipt whose lag start is the source's publication instant per position.
In lab/bench: read the lane feed through E1's adapters, not `transactions()`; take the publication instant per position from the
source per R41-c (broker `watermarkAt`; XTDB writer's host instant at COMMIT SYNC return, with `system_time` beside it; Datomic: the
TS client's host instant at the transact result); enumerate the final published prefix from the source's own record and reconcile ACKs
afterwards (Q67d); fail the run on any position without an instant; run the consumer in its own worker or process, apart from the
reader clients; run 256 closed-loop readers per TARGETS 1.1 P1 on the lane's read composition; report lag pooled over the window
(bursts included) and split steady and burst; label the reader level from the run, not a constant (6f67e0 says "at L256" for a
zero-reader run). Receipts bind the feed route, the consumer store, the reader composition and the slot. Slot: none to build; tested
offline against a fake source with planted delays.

**E4. EXP-P3Q: lane Q P3 screening window (orchestrator runs E3's driver; reviewer reads the receipts).**
North star: P3 on lane Q; measured by NS-P3 bars at 256 readers.
After the P2Q plus SQL01 integration, E1, E3, and QG1 phase 2. On qlever-s1 serving a built base (Q91a), the broker and its SQLite
store on the host, readers per the lane's composition (H1 current pulls, Q97a; QLever for history), the frozen TARGETS 2.1 trace with
at least one burst and one maintenance event per window (TARGETS 1.1 P1 item 3), the three crash points. Three runs. Prediction:
lag p99 ≤ 50 ms steady and ≤ 250 ms through the burst; 0 gaps, 0 order violations, 0 visible duplicates. Falsified if lag p99 > 250
ms or if lag correlates with reader count (abs r > 0.2 across the 64 and 256 levels). Diagnostic until contract 0.4.0 and G03.

**E5. EXP-P3X: lane X P3 window with two arms (builder for arm A1's rebase; orchestrator runs).**
North star: P3 on lane X; measured by NS-P3 bars at 256 readers, arm by arm.
Arm B (the candidate): EXP-P2B's composition, XTDB as replica, the broker feed through E1. Arm A1 (the native comparison): P2X rebased
on main (about 460 commits behind, R39) with V-P2X review first, E1's off-engine `ConsumerStore`, readers on an X05 follower if writer
and follower fit the slot's 3.5 GiB, otherwise readers on the writer node and the receipt says so. Decision rule, written before the
run: if arm A1 meets lag p99 ≤ 250 ms with 256 readers through the burst, lane X has a native P3 and both arms are reported; if not, lane X
P3 is carried by arm B, and the record names the broker as the source of truth (R39 open question 2). If EXP-P2X2 returns D1, arm A1
still runs once, because the lag question is separate from the commit floor, but its burst result is expected to fail.

**E6. EXP-DF01: lane D feed route (folded into the DA03 round, or run as DA03a just before it; builder; reviewer).**
North star: P3 on lane D; measured by E1's conformance suite on the Datomic adapter, then E3's driver.
After EXP-DA04. Build R29's gateway route `GET /v1/db/{db}/log?fromT=&limit=&waitMs=`: a long-poll woken by `tx-report-queue`, reading
`d/tx-range` from the checkpoint t (start inclusive, end exclusive), mapping t to positions through the position-to-t map (Q89d),
projecting identity datoms only (section 2.2 row 6), reading the Triplex stamp from the transaction's annotation, never
`:db/txInstant` (Q90c), and listing transactions that are not Triplex commits as skipped. The consumer store is E1's host SQLite store,
not a Datomic transaction (R41-b; amends R29:244). Required tests: resume across an excision batch is byte-identical; a peer restart
loses the report queue and the route resumes from the log alone (R29:359). Then the lane D window (E7).

**E7. EXP-P3D: lane D P3 screening window.** As E4, on the lane D slot with the Postgres pair (Q88b), after DA03. Diagnostic on dev
storage (Q88a); counts only on Postgres.

**E8. ER01 amendments (no new experiment; add to the ER01-C, ER01-Q, ER01-X and ER01-D briefs).**
North star: Sam's must-have "real erasure or crypto-shredding of PII" with P3 held (GS.16), and P3's exact resume.
Add the `erase` op with assertion id and erasure seq to every lane feed through E1's `FeedEntry`; have the core erased set advance from
the feed (R38 3.2) and test that a route behind the frontier catches up within 10 ms; list feed-built value copies (W02 `FeedReplica`)
in the protected-copy inventory or rebuild them from identity entries plus pulls; add a consumer that resumes across a restore epoch to
the restore sub-schedule (R38 5.4 row 3).

### 4.4 Order and slot plan

One 3.5 GiB exclusive slot at a time. Today's scale-window queue (lab/STATE.md): EXP-P2X2 on xtdb-s1 (running), K01 live, P5 A1,
G03 slot run, RT01 live G2 and G6, W02 live GS on xtdb, then tx2-datomic-dev unparked for EXP-DA04.

| Step | Work | Slot | Unlocks | Depends on |
| --- | --- | --- | --- | --- |
| 0 | Rulings R41-a to R41-j (section 5); Sam's call on R39 open question 2 | none | the contract every brief builds to | nothing |
| 1 | E1 EXP-FD01, E2 EXP-DI01, E3 EXP-P3M in parallel; E8 written into the ER01 briefs | none | entry content, gaps, order, resume and affected-set cells on every lane, offline | E1 before E2's store integration |
| 2 | P2Q round 11, then P2Q plus SQL01 integration; E1's broker adapter lands on it | none | lane Q composition with E1's feed | P2Q review |
| 3 | E4 EXP-P3Q on qlever-s1, about 90 minutes (three runs of a 20-minute trace window with two bursts each, plus crash schedules) | Q exclusive | the first lane Q lag number at 256 readers | step 2, QG1 phase 2 |
| 4 | EXP-P2B; P2X rebase and V-P2X for arm A1 | none to build | lane X arms | P2X2 verdict, P2Q merge |
| 5 | E5 EXP-P3X on xtdb-s1, about 2 hours (two arms, three runs each) | X exclusive | lane X lag at 256 readers; the native-or-broker decision | step 4 |
| 6 | EXP-DA04, then DA03 with E6 EXP-DF01 | D slot (Q88b forecast) | lane D feed route | the scale window's end |
| 7 | E7 EXP-P3D | D exclusive | lane D lag at 256 readers | step 6 |
| 8 | Acceptance: NS.P3 on each lane's chosen composition, three fresh runs, contract 0.4.0 or later, through G03 with OBS01 evidence, at the rung Q94a settles | exclusive, one lane at a time | NS.P3 closure; GS.19 and the P3 halves of GS.03, 05, 06, 08, 09, 16, 20 | contract 0.4.0, G03, W02 |

Steps 3, 5 and 7 each fit inside one window and can be slotted wherever the scale-window queue has a gap; none blocks offline work.
The P3 windows should go after RT01's live run, so the first lane receipts carry decided stamps, but they do not need contract 0.4.0 to
be useful as screening.

**Rung.** The feed reads the log tail, so lag barely depends on the rung, but E2's fanout does (about 1,100 workers per location at
100k). Screening at 10k is enough for E4 and E5; the acceptance rung follows Q94a, and for broker compositions it should be 100k, where
the DI01 fanout is at its designed size.

## 5. Proposed rulings

| Id | Ruling | Basis | Who |
| --- | --- | --- | --- |
| R41-a | **The feed contract.** P3 is measured only on identity-only feeds whose entries carry, per transaction, stream, epoch, offset or LSN, positions, txIds, operationId, commandIds and the decided stamp, and per change op (`assert`, `retract`, `erase`), entity, attribute, validFrom, validTo, position and assertion id, plus the erasure seq on erase changes. Entries never carry a value, an envelope or a key id. Resolutions are `commit`, `aborted`, `epoch` and `seal`. Core's value-bearing journal route (`transactions()` and its siblings) is a history API and serves P3 only as the A0 control. Consumer outputs hold subject ids and positions only | TARGETS 1.1 P3, 3 row 3, 7 items 3 and 8; Q31c; R38 2.3, 3.2, 5.3; R33 3.6 | orchestrator |
| R41-b | **Consumer state off the engine's write path.** A P3 consumer writes its effects, affected set and checkpoint in one transaction of a host SQLite store with the Q84a pragmas. An engine-resident consumer (P2X `tx_feed_checkpoints`, a Datomic consumer entity) is a control arm only. Amends R29:244 and refines R18 3.4 item 5 (the checkpoint shares a transaction with the consumer's own outputs, not with the source) | P2X trace-C 88da3e: consumer write p50 431 ms, p99 2,212 ms in the serial indexer; TARGETS 1.1 P3 item 4 needs one durable write, not the source's store | orchestrator |
| R41-c | **Publication instant per arm.** Broker: `watermarkAt` per LSN. XTDB as source: the host monotonic instant when the writer's COMMIT SYNC returns, recorded per tx id by the writer apart from the ACK, with XTDB `system_time` beside it as a cross-check. Datomic as source: the host monotonic instant when the TS client receives the transact result. Engine clocks are never subtracted from host clocks. A position without an instant fails the run | TARGETS 1.1 P3 item 1; Q55d; Q67d; P2X trace-C 88da3e had 63 positions without one | orchestrator |
| R41-d | **Stamp and publication instant are separate.** The decided stamp is the entry's record time; it never starts a lag interval, and a publication instant is never a record time. A consumer re-runs a subject at the delivered entry's stamp or position, never at the wall clock's "now" | Q90a, Q90d; R33 1.3 Q14-Q15 | orchestrator |
| R41-e | **The gap unit.** Gaps are counted over positions (Q31c coordinates), with every LSN or offset in the read range accounted as a commit, an abort, an epoch boundary or a seal. A seal is never a gap. Positions acknowledged after the consumer stopped are outside the run (the 7ed77c65 fix) and the run's end is the final published prefix (Q67d) | Q31c; R33 3.6; N01 6f67e0's 11 gaps | orchestrator |
| R41-f | **Exact resume is byte-exact for identity-only feeds,** including across an erasure and, on lane D, across an excision; no "modulo erasure" relaxation applies to feed entries. A re-sent or lost-ACK command creates no new position | TARGETS 1.1 P3 item 5, 7 item 2; Q90c; Q95h | orchestrator |
| R41-g | **The affected set for P3 is O-DOMAIN's** (W0 SPEC 10; Q36e; Q40b). A direct-subject affected set is DIAGNOSTIC for NS-P3-DOMAIN-AFFECTED-SET; the N01 bar "affected-subject set matches" and every consumer before EXP-DI01 are diagnostic on it | TARGETS 1.1 P3 item 3; W0 SPEC 10 items 3 and 4 | orchestrator |
| R41-h | **The P3 reader load is real.** A P3 lag receipt counts only with 256 closed-loop readers per TARGETS 1.1 P1 on the lane's read composition, the consumer in its own worker or process, and the reader level taken from the run. Lag is pooled over the whole window, bursts included, and reported split steady and burst | TARGETS 1.1 P3 bar; N01 6f67e0 label defect | orchestrator |
| R41-i | **Every P3 receipt so far is DIAGNOSTIC** (P2X, P2Q, SQL01 kill-50, N01, all GS receipts): none ran with 256 readers, none used the O-DOMAIN affected set, none ran through an executing gate, all predate contract 0.4.0. Their correctness findings (0 gaps, 0 order violations, 0 keyed duplicates over 100 crashes per variant) stay as design evidence | Q90f, Q94e; R41-g, R41-h | orchestrator |
| R41-j | **Lane X P3 arms.** Lane X reports two P3 arms: XTDB behind the broker (the candidate, arm B) and the native feed with an off-engine consumer store (arm A1). Whether arm B counts as "lane X" is Sam's call (R39 open question 2); until he rules, every lane X P3 receipt names its source-of-truth assignment | TARGETS 4.1 item 1; Q51b; Q96c; R39 6 item 2 | orchestrator, then Sam |

## 6. Decisions for Sam

1. **R39 open question 2, restated for P3.** If lane X's change feed comes from the broker's log (P2B), XTDB is a replica and the feed never
   touches it. Does that count as lane X meeting P3, or must lane X's feed come from XTDB itself? The native feed misses the bar today
   (2.9 s p99 at zero readers) and can reach it only with an off-engine consumer store, readers on a follower and a writer that keeps up with
   the burst. Recommended: count P2B as lane X's candidate and report the native arm beside it (R41-j).
2. **Q94a, the acceptance rung.** P3's lag hardly depends on the rung, but the dependency index's fanout does; 100k is the smallest rung where
   the largest location has its designed 1,100 workers.

No other new decision is needed for P3. Q95-S (erasure S1 to S4) changes what reads return after an erasure, not what the feed carries,
because the feed carries no values.

## 7. Files

| Path | Role |
| --- | --- |
| /Users/sam/Claude/Projects/triplex-db-2/R41/R41-p3-readiness.md | this report |
| /Users/sam/projects/triplex-db-2/packages/core/src/store/Triples.ts:91-117, TriplesLive.ts:650-674 | core journal feed route (values, full scan) |
| exp/SQL01-broker-sqlite:packages/qlever/src/broker/feed.ts | lane Q feed and consumer store |
| exp/P2X-xtdb-commit-feed:packages/xtdb/src/CommitFeed.ts | lane X native feed and in-engine consumer |
| exp/P2X-xtdb-commit-feed:lab/experiments/EXP-P2X-xtdb-commit-feed/receipts/trace-C-20261107T222624Z-88da3e.json | lane X lag decomposition |
| exp/P2Q-qlever-log-broker:lab/experiments/EXP-P2Q-qlever-log-broker/receipts/P2Q-trace-C-offline-*.json | lane Q lag receipts |
| verify/SQL01:lab/verify/SQL01/evidence/r2b-kill50.json | lane Q resume on SQLite |
| /Users/sam/projects/triplex-db-2/lab/bench/lib/feed.ts | NS P3 consumer (to upgrade in EXP-P3M) |
| /Users/sam/projects/triplex-db-2/lab/runs/NS/NS-xtdb-20261108T001701Z-6f67e0.json | only NS P3 receipt |
| /Users/sam/projects/triplex-db-2/lab/scenarios/lib/runner.mjs:265-281, :529-532 | GS feed consumer and lag definition |
| /Users/sam/projects/triplex-db-2/lab/world/W0/SPEC.md section 10; lab/oracles/domain/cli.py | the expected affected set |

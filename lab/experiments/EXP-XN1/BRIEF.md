# DRAFT: EXP-XN1, lane X native: cut the Triplex commit path down to the XTDB floor

**Status: DRAFT, written under a pause request (2026-11-09).** Sections 1 and 2 rest on evidence read in full (EXP-P2X2 REPORT and
BRIEF, R39, R19 section 3, EXP-P2X REPORT, RULINGS Q96a-d and Q98a-f). Sections 3 and 4 are first cuts. Items marked **[unverified]**
were not yet checked against XTDB 2.x documentation or our adapter source. The "Still to do" list at the end says what is missing.

**North star:** P2 (commit p50 <= 10 ms, p99 <= 50 ms, offer to ACK, 5-to-10 and 11-to-25 fact bands, with P1's 256 readers; RYOW at the
returned tx with no extra wait; original receipt on every duplicate and lost ACK), measured per lab/TARGETS.md 1.1 "P2 commits" items 1-4.
Secondary: P3 feed lag and P4 flatness (section 3).
**Scope:** lab/SCOPE.md (3.2), lab/NORTH-STAR.md, lab/TARGETS.md 1, 1.1, 2, 2.1. Decision basis: lab/research/SAM-decisions-2026-11-09.md,
afternoon section (lane X = XTDB native; report a near miss plainly). This reopens the native path that Q96d closed under the R39 4.5 rule;
Q96d's numbers stand, its consequence ("lane X P2 goes through P2B") is superseded by Sam's decision.

## 1. Where the 33 ms goes today

Source: EXP-P2X2 F5, P2X `subject-stamp` build fb6681a4, exclusive xtdb-s1 (CPUs 4-5, 3.5 GiB, heap 2 GiB), fresh scope, 1 writer,
10 facts, closed loop, 135 samples. Engine figures are means from metric differences; client figures are p50s.

```
 F5 fresh service p50 = 33.00 ms
 |
 +-- submit p50 23.22 ms  (BEGIN, 8 statements, COMMIT SYNC, each its own round trip)
 |     +-- engine execute mean 9.51 ms
 |     |     +-- source append (incl. fsync #1) est. 3.25 ms
 |     |     +-- await 6.26 ms  (resolve 5.52 ms/commit, replica append + fsync #2, apply, wake)
 |     +-- outside the engine: about 13.7 ms
 |           (about 10 sequential pgwire round trips, per-statement parse, static expansion at
 |            commit, Effect/adapter encoding, thread hand-offs)
 |
 +-- three point reads, sum of p50s 8.70 ms
 |     +-- source-cut read 3.08 ms   (before staging; gives the CAS cut)
 |     +-- claim read      2.69 ms   (idempotency check)
 |     +-- receipt read    2.94 ms   (after COMMIT SYNC; returns the engine stamp)
 |
 +-- remainder about 1 ms (client bookkeeping)
```

### 1.1 What is XTDB's floor and what is ours

| Segment | ms (fresh) | Owner | Evidence |
| --- | ---: | --- | --- |
| Two fsyncs (source and replica log) | 1 to 2 | XTDB 2.2 Local log, fixed (no fsync or linger setting on Local) | R13 0.43 ms median per fsync; R19 3.1, 3.2 |
| Source append incl. queueing | about 3.25 | XTDB, fixed per commit; amortized under concurrency (up to 10 messages per force) | P2X2 F5 engine table; R19 3.1 |
| Resolve, replica append, apply | 2.2 to 4.3 bare; 6.26 Triplex | Mostly XTDB; the Triplex share is our ASSERT and DML cost | P2X2 F3 await 2.16-4.25 vs F5 6.26 |
| Bare 10-fact command, pipelined in one write (F3) | **7.68 pooled p50; 5.78 warm segment** | This is the practical XTDB floor in this VM for our shape | P2X2 F3 |
| Same command, one round trip per statement (F2) | 14.10 | Pipelining alone saves 6.42 ms | P2X2 F2 vs F3 |
| Sequential round trips, parse, adapter | about 13.7 | **Ours** | F5 submit minus engine execute |
| Three point reads | 8.70 | **Ours** | F5 timings |
| Resolve growth with history | 5.52 fresh to 24.67 at 10k history | **Ours** (guards that scan more rows as history grows; P2X uses `_id` lookups for claims but something still scales) **[unverified which statement]** | F5 history-10k: service 60.13, execute 29.02, await 26.24 |

**Conclusion.** XTDB's own floor for a pipelined 10-fact command is about 6 to 8 ms p50 on a quiet pinned 2-CPU slot. About 25 of the 33 ms
is our adapter: sequential statements and three point reads. The bar (10 ms) sits about 2 to 4 ms above the engine floor, so meeting it
needs the adapter path to cost no more than one pipelined write plus at most one round trip. At 10k history the engine resolve alone (24.67 ms)
misses, so the history term must be removed too.

**What the P2 trace adds on top.** 85% of trace commands arrive in 60 s bursts at about 55 commands/s (R39 2.5 item 3). A serial decider
needs service <= about 6.8 ms to hold p99 <= 50 ms at that rate (M/M/1). XTDB resolves serially but pipelines across commits (R19 3.1;
R16 measured 172 commits/s at 16 connections), so per-subject concurrency plus group commit can lift throughput above 1/latency; the
burst p99 then depends on resolve time per commit, not on end-to-end latency.

## 2. Ranked levers for P2

Ranked by expected gain per unit of correctness risk. "Correctness cost" covers atomic, idempotent, lost-ACK resolution and no silent
precision loss.

| # | Lever | Expected effect | Evidence | Correctness cost |
| ---: | --- | --- | --- | --- |
| 1 | **Pipeline the whole transaction in one client write** (BEGIN, all statements, COMMIT SYNC) | -6 to -13 ms on submit | F2 to F3 saved 6.42 ms bare; F5 has about 13.7 ms outside the engine | None. Same transaction, same isolation. Needs the wire encoder to send Parse/Bind/Describe/Execute per statement and one Sync (P2X2 fixed this in its bare encoder) |
| 2 | **Fold the claim read into the guard ASSERT** (duplicate check inside the transaction; read the original receipt only on the duplicate path) | -2.7 ms on the fresh path | F5 claim read 2.69 ms; R39 4.5 D2 plan | None if the ASSERT failure is typed and the duplicate path then returns the stored original receipt. Lost-ACK retry follows the duplicate path |
| 3 | **Take the receipt and stamp from the transaction, not a following read** (pipeline a post-commit status query in the same write, for example `SHOW LATEST_SUBMITTED_TX` or an `xt.txs` lookup by the connection's tx) **[unverified: exact XTDB 2.2 statement and whether it pipelines after COMMIT SYNC]** | -2 to -3 ms | F5 receipt read 2.94 ms | None if the stamp returned equals the stored stamp bit for bit (R33 T13 check) |
| 4 | **Remove the source-cut read from the hot path**: the command carries its expected subject position (TARGETS 2 "optimistic compare-and-set on the subject's last position"); the ASSERT checks it in the transaction | -3 ms | F5 source-cut read 3.08 ms | None for atomicity; a stale expectation becomes a typed conflict. Needs the runtime to hold the subject's last position (it already reads the subject to decide) |
| 5 | **Fewer, cheaper statements**: one ASSERT for CAS plus claim, one multi-row INSERT for ledger rows, feed row in the same statement where possible | -1 ms per statement removed; less resolve time | R19 3.3 (about 1 ms per statement; the CAS ASSERT alone about 5 ms in R16) | None if the guards stay in the same transaction |
| 6 | **Remove the history term from resolve**: every guard is an `_id` point lookup or confined to a current-only head row; no `FOR ALL VALID_TIME` scans on the hot path | Keeps resolve near 5 ms at 10k, 100k, 1m (today 24.67 ms at 10k) | F5 fresh vs 10k; N01 A0 3.8 us per stored row | None, provided the head row is written in the same transaction as the facts |
| 7 | **Per-subject FIFO plus same-subject group commit (up to 8) in the candidate, parallel across subjects** | Burst throughput, not single-command latency; amortizes fsync across up to 10 messages | Q51a; R19 3.1; P2X queue arm 9.96 c/s on a loaded host | None if ordinals and positions stay as P2X built them (Q31c F1-F4 pass) |
| 8 | **Connection reuse and a fixed small pool** (one writer connection per in-flight subject group, prepared statements cached) | -0.5 to -2 ms (parse) **[estimate]** | R19 3.2 parse and expansion 1-3 ms | None |
| 9 | **Readers off the writer's CPUs** (cpuset split or a read node) | Protects p99 under 256 readers (R16: 4-6x service at 4-32 readers) | R16 1.2; X05 | Local-log follower died 9 times in X05; a read node is a separate experiment |
| 10 | **Separate volumes for log and storage** | Protects p99 from block upload and compaction fsyncs | R13 p99 13.7-93 ms when sharing | None |
| - | **Not recommended:** `COMMIT ASYNC`, `InMemory` log, Redpanda write caching | ASYNC gives no outcome, so the ACK needs a status read anyway (R19 3.4); InMemory and write caching drop durability | R19 3.3, 3.4 | Breaks "ACK only after durable" or the typed outcome per command |
| - | **Arrow Flight SQL instead of pgwire** **[unverified for 2.2]** | Unknown; the engine floor (resolve, two fsyncs) stays | none yet | Must keep the same typed outcome per command |

**Predicted result of levers 1 to 6 together:** fresh service p50 9 to 13 ms (engine floor 6 to 8 plus one round trip and adapter work);
p99 at 0 readers 20 to 35 ms; at 10k history within 1.2x of fresh. With 256 readers on the same 2 CPUs, p99 likely misses 50 ms unless
lever 9 is applied (R16, X05).

## 3. Ranked levers for P3 and P4 (first cut)

### 3.1 P3 native feed lag (today about 2.9 s steady p99 against 250 ms)

| # | Lever | Expected effect | Evidence | Correctness cost |
| ---: | --- | --- | --- | --- |
| 1 | **Consumer state off the engine** (effects, affected set and checkpoint in one host SQLite transaction, Q84a pragmas), already ruled Q98b | Removes the cause: the 2.9 s came from the consumer's checkpoint queuing in the same serial indexer (consumer write p50 431 ms, p99 2,212 ms) | P2X REPORT; Q98b | None; keyed effects already give 0 visible duplicates in crash injection |
| 2 | **Wake-driven tail, not a poll**: tail the `tx_feed` rows (or `xt.txs`) with an await token so the tailer wakes on commit | Lag about commit-to-visible plus one read; tens of ms **[estimate]** | R19 3.1 (Local log wakes on state flows) | None; watermark rules (resolved prefix, abort accounting, epoch) stay |
| 3 | **Publication instant stamped by the writer when COMMIT SYNC returns** (Q98c), so lag is measured, not inferred | Correct measurement; P2X had 63 positions without an instant | Q98c | None |
| 4 | **Smaller feed rows** (identity only, Q98a) | Less log bytes per commit (P2X wrote 3.5x A0) | P2X p10 | None |

### 3.2 P4 current pulls (R16: 3.95 / 3.81 / 5.34 ms at depth 1 / 3 / 10, so 1.35x against 1.1x)

| # | Lever | Expected effect | Evidence | Correctness cost |
| ---: | --- | --- | --- | --- |
| 1 | **Current-only head table** written in the same transaction as the facts (one row per subject attribute, overwritten) so current pulls never read superseded versions | Flat with history by construction | R39 6 open question 1; TARGETS 4.1 item 6 | Adds statements to the commit (costs P2); must stay exact at the returned tx |
| 2 | **Query form**: default current valid and system time, `_id` lookups, no `FOR ALL VALID_TIME` | Fewer historical rows touched | **[unverified against R16 query text]** | None |
| 3 | **Compaction state**: measure depth 10 after compaction settles; XTDB 2.x compaction partitions by recency **[unverified]**, so the 1.35x may be live-index or L0 cost | May close the gap with no code change | **[unverified]** | None |

P5 (R34: 200-800 s predicted at 100k) was not analysed in this draft.

## 4. Recommended first experiment for a Sonnet builder: the statement-cut round (levers 1 to 6)

### 4.1 Steps, in order

1. Rebase or port P2X `subject-stamp` (fb6681a4) onto main as a default-off `commitPath` option, keeping RT01's stamp rules (Q90c engine stamp).
2. Write `predictions.json` (section 4.2) and commit it before any slot time.
3. Implement: one pipelined write per commit; one guard ASSERT (subject CAS on the expected position plus claim absence); multi-row INSERTs;
   stamp and receipt returned in the same pipeline; duplicate path reads the stored original receipt.
4. Offline gates (section 4.3), then one exclusive xtdb slot via `lab/bin/engine.mjs` on the triplex2 VM (8 CPU / 20 GiB),
   `--cpuset-cpus` pinned to 2 vCPUs, residents' CPU recorded.
5. Arms, ABAB: A = P2X2 F5 build (fb6681a4), B = XN1 build. Fresh, then 10k history (parameterised `INSERT ... SELECT` preload).
6. Then the frozen TARGETS 2.1 trace (10k subjects, 600 s, one burst) with the per-subject queue, 0 readers, then 64 and 256 readers.

### 4.2 Predictions (commit first)

1. B fresh service p50 9 to 13 ms; falsified high above 15 ms.
2. B fresh p99 <= 35 ms at 0 readers.
3. B at 10k history within 1.2x of B fresh (A is 1.82x: 60.13 / 33.00).
4. Engine resolve per commit at 10k history <= 7 ms on B.
5. Trace, 0 readers: 5-to-10 band p50 <= 12 ms; p99 under 50 ms only if resolve stays under about 7 ms through the burst.
6. 256 readers on the same node: writer p99 at least 2x the 0-reader value (R16, X05).

### 4.3 Gates

| Gate | Pass condition |
| --- | --- |
| G1 xtdb, option on and off | PASS (88/88 on fb6681a4 today) |
| Atomicity | crash injection at three points (before COMMIT, after COMMIT before ACK, after ACK): zero partial transactions; every ASSERT failure leaves no rows |
| Idempotency and lost ACK | every re-send and lost-ACK retry returns the original receipt bytes, including across a client restart |
| RYOW | pull at the returned tx sees the commit 100% with no extra wait |
| O-REPLAY equality | zero mismatches on the trace sample |
| Accounting | zero unaccounted commands (TARGETS 1.1 P2 item 3) |
| Precision | stored stamp equals returned stamp bit for bit (R33 T13); no value kind converted silently |
| Recovery | engine stop and restart mid-trace: resume with no lost ACKed commit and no duplicate position |

### 4.4 Measurement and the A/A rule

- Run A twice before B (A1, A2). A/A noise = |A1 p50 - A2 p50| and the same for p99. B counts as a change only if its difference from A
  exceeds 2x the A/A difference and at least 2 ms at p50. **[to align with lab/config/noise.json and R22 before the run]**
- Scrape `node_tx_execute`, `node_tx_await`, `tx_op_timer` count and sum before and after each arm; report the section 1 breakdown for B.
- Report every number plainly; a p50 of 11 ms is reported as "11 ms, 1 ms above the 10 ms bar".

### 4.5 Stop rule

Stop native P2 iteration and report the gap if either holds after this round: B fresh p50 > 15 ms, or B resolve at 10k history > 7 ms with
no statement left to remove. Otherwise the next round is levers 7 to 10 under 256 readers.

## Still to do

1. Read the adapter source (`packages/xtdb/src/XtdbStorageAdapter.ts`, `TransactionContext.ts`, `XtdbClient.ts`) and the P2X branch to
   confirm statement count, round-trip pattern and which guard scales with history.
2. Verify against XTDB 2.x docs: post-commit status statement and pipelining; log and fsync settings; await token semantics; Flight SQL status;
   recency-partitioned compaction.
3. Read R1, R6, R7, R14, R16 (P4 query text), R30, R34 (P5 levers), R41; lab/config/slots.json and xtdb-*.yaml.
4. Add P5 levers; align the A/A rule with lab/config/noise.json and R22.
5. Confirm with the orchestrator how Q96d is annotated now that Sam reopened lane X native.

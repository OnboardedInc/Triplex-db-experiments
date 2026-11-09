# R39: the shortest path to P2 on lane X (XTDB 2.2.0)

Planner: R39 (Opus 5.5, high). Date: 2026-11-09 (UTC). Repository: /Users/sam/projects/triplex-db-2, main at 043e3c84.
Goals and targets come only from lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md (P2 row of section 1, section 1.1 "P2 commits",
sections 2, 2.1 and 4.1). No engine, Docker or product code was touched; no agents were spawned.

North star: P2. Bars: commit p50 <= 10 ms and p99 <= 50 ms from the scheduled offer to the published ACK, for the 5-to-10 and 11-to-25
fact bands, with P1's 256 readers running; the pull at the returned tx sees the commit every time with no extra wait; duplicates and lost
ACKs return the original receipt every time (TARGETS 1 and 1.1).

## Summary

| Question | Answer |
| --- | --- |
| What P2X built | Per-subject CAS plus an engine commit stamp behind `commitPath: "subject-stamp"` (default off). 0 cross-subject conflicts against thousands for A0; service time 6 to 8x lower than A0 after about 20k commits; feed exact; G1 PASS with the option on and off. Best single-writer service p50 42.6 ms. |
| Why it is not merged | No independent review was ever run (V-P2X "later"); ruling Q51b moved the next XTDB P2/P3 step to the broker (P2B); the branch is 460 commits behind main and predates RT01, RQ01, J01 and contracts 0.3.8 to 0.3.13; the hot-subject router (Q51a), positions bound after commit (Q51c), the engine kill test (Q51f) and probe p9-stamp-ms (Q90c) are not done. |
| The XTDB commit floor in our VM | No measurement of a 10-fact commit has reached p50 10 ms. Best: 16.4 to 19.6 ms p50 for a bare 8-statement command at 0 to 1 readers (R16); 42.6 ms p50 for the Triplex P2X command (P2X); 3 s for Triplex A0 at the seeded 10k rung (N01). With 4 or more readers on the same node, service rose to 77 to 112 ms (R16). |
| Which mechanism is the floor | The engine's serial indexer, not fsync and not the read-your-own-write wait. On the writer node `COMMIT SYNC` already returns after the leader applied the transaction, so read-your-own-write costs nothing extra. Inside the engine, the await segment (resolve, replica append, apply) was 59% of commit time on a quiet start and 89% under load (X05 metrics); the two fsyncs are 1 to 2 ms (R13, R19). Triplex adds 8 statements and 3 point reads per commit. |
| Can XTDB natively meet the bar with 256 readers | Not on any evidence we have. A dedicated quiet run has never been made, so the closing measurement is the brief in section 4. |
| Composition for golden scenarios and the P2 measurement | Per subject serial, across subjects parallel, with the queue inside the candidate (TARGETS 2 "Conflicts", ruling Q51a). A0's single-flight writer stays only as the frozen control, and its GS commit bars are queue measurements, not P2 evidence. |
| RT01 and per-subject concurrency | RT01's client stamp is strictly increasing only because A0's scope CAS serializes every commit. Per-subject concurrency needs a decider-side stamp: the XTDB engine stamp on P2X (Q90c, after probe p9) or the broker's stamp in commitGroup. RT01 also adds a second scope-wide `MAX(stamp)` scan to A0's one ASSERT, which is unmeasured on an engine. |
| Shortest path to the P2 bar on lane X | XTDB behind the broker (EXP-P2B, rulings Q51b and Q58b): the ACK leaves the XTDB indexer. The same broker measured ACK p50 3.9 to 6.7 ms and p99 9.2 to 42.2 ms on QLever (P2Q). In parallel, one exclusive-slot turn (EXP-P2X2, section 4) settles whether the native path is closed, so the lab can say so plainly (SCOPE 3.2). |

## 0. Sources read

| Source | What it gave |
| --- | --- |
| lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md, lab/PROTOCOL.md | bars, measurement semantics, trace, composition identity (4.1), roles and effort caps |
| lab/scenarios/lib/composition.mjs (main) | the GS composition runs commits single-flight, `writerConcurrency = 1` (lines 42-46 and 74-79). The brief cited lab/bench/lib/composition.mjs; that file does not exist. The bench composition is lab/bench/lib/composition.ts (`public` and `public-queued`, the latter using the XTDB adapter's `admissionQueue: true`, also serial) |
| lab/research/R37 section 1.2 | lane X GS bars fail on queueing: commit p99 285 s to 5,403 s on a shared 2-CPU resident at 0.1 to 1 commit/s; 0 wrong answers in 19 receipts |
| exp/P2X-xtdb-commit-feed fb6681a4 (DESIGN.md, receipts, bench) and lab/experiments/EXP-P2X-xtdb-commit-feed/ on main (BRIEF, REPORT) | design, contention, service time with a client-side breakdown, trace runs, feed, crash tests |
| lab/experiments/EXP-N01-northstar-bench/REPORT.md | A0 at the seeded 10k rung: 3.0 s per 1-fact transact; cost model about 0.1 s plus 3.8 us per stored row |
| lab/experiments/EXP-X05-xtdb-read-follower/REPORT.md and lab/runs/X05/*.json | follower killed on reliability; writer latency per reader level; engine-side `node_tx_*` and `tx_op_timer` metrics (I extracted them, section 2.3) |
| lab/research/R16, R19 | bare XTDB commit latency; trace of one `COMMIT SYNC`; settings; E2 floor probe design |
| lab/research/R33 sections 2.1, 2.7 | record stamp per lane; why A0 stamps on the client; P2X engine stamp and probe p9-stamp-ms |
| lab/acceptance/RULINGS.md Q31a-e, Q51a-f, Q58b-d; RULINGS-PENDING.md Q51b, Q89a-i, Q90a-g | what is decided for positions, ACK, hot subjects, P2B, stamps and pinned reads |
| lab/experiments/EXP-P2Q-qlever-log-broker/REPORT.md | broker ACK numbers on QLever |
| exp/P4-current-path and lab/experiments/EXP-P4-current-path/BRIEF.md | current-path arms; X2 adds statements to the commit; H1 is fed asynchronously |
| .claude/worktrees/rt01 (read only, head cc54c3c6) | RT01 round A: XTDB A0 ASSERT now checks `MAX(position) = K` and `MAX(stamp) = S` in one statement; microbenchmarks are offline (`engineIO: false`) |
| lab/STATE.md, lab/NOTEBOOK.md tail | pool, scale window queue, review states |

## 1. What P2X built and measured

### 1.1 The design (exp/P2X-xtdb-commit-feed, code e6d165c1, final fb6681a4)

| Part | A0 (`scope-counter`, main) | P2X candidate (`subject-stamp`, default off) |
| --- | --- | --- |
| Order | dense counter: `ASSERT MAX(position) = K` over `tx_meta FOR ALL VALID_TIME` for the scope, write K+1 | the indexer stamps every row with the transaction's own system time, inside the transaction; position = `(stamp_us - 2020-01-01Z) * 8 + ordinal` |
| Compare-and-set | scope-wide: any two commits in one scope conflict | per subject: no `tx_heads` row newer than the source cut for any entity read or written; reads not confined to known entities escalate to the scope head |
| Idempotency and receipt | claim, attempt and assertion guards by `scope_key` scans | `_id` point lookups; a committed claim is final, so a duplicate costs one point read |
| Statements per commit | 8 | 8 (guards with the same handling share one ASSERT) |
| ACK | after `COMMIT SYNC` | after `COMMIT SYNC` plus one receipt point read that also returns the stamp |
| Feed | `transactions({after})` reads the whole journal per page | `METADATA` plus a `tx_feed` row in the same transaction; one source-log tailer; watermark = fully resolved prefix |
| Why the stamp is in log order | n/a | XTDB 2.2.0 resolves one database's transactions serially and gives each a system time later than the last one (+1 us if the clock has not moved), `TxResolver.kt:204-246 @ c6c1962`; probe p1: 320 concurrent commits, stamp = `_system_from` = `xt.txs.system_time`, strictly increasing in tx-id order |

### 1.2 Measured (slot s1, 2 CPU, 3.5 GiB, host load 8 to 19 on 12 cores; reported, not judged)

**Contention, 16 writers on 16 distinct subjects, closed loop, 480 commits:**

| History | Arm | Committed | Typed conflicts | CAS rejections | Commits/s | p50 / p90 / p99 ms |
| --- | --- | --- | --- | --- | --- | --- |
| fresh | P2X | 480 | 0 | 0 | 32.6 | 401 / 900 / 1,041 |
| fresh | A0 | 258 | 222 | 3,376 | 6.6 | 297 / 1,027 / 2,118 |
| fresh | A0 plus admission queue | 480 | 0 | 0 | 17.2 | 52 / 90 / 19,409 |
| about 20k | P2X | 480 | 0 | 0 | 21.0 | 695 / 1,039 / 1,461 |
| about 20k | A0 | 282 | 198 | 3,657 | 1.1 | 3,777 / 10,088 / 15,686 |

**Service time, 1 writer, 10 facts, with the client-side breakdown** (I read the `timings` field of each receipt on the branch;
"submit" is BEGIN, 8 statements and `COMMIT SYNC`; "reads" is the sum of the source-cut, claim and receipt point reads, p50 each):

| History | Arm | Service p50 / p99 ms | Submit p50 ms | Three reads, sum of p50s ms | Host load (1 min) |
| --- | --- | --- | --- | --- | --- |
| fresh | P2X | 42.6 / 93.1 | 31.3 | 10.1 | 8.3 |
| fresh | P2X | 79.7 / 245.3 | 60.4 | 17.0 | 8.0 |
| fresh | A0 | 57.0 / 125.4 | 43.6 | 10.6 | 8.5 |
| fresh | A0 | 56.2 / 87.5 | 45.7 | 10.3 | 8.0 |
| about 13k | P2X | 84.9 / 246 | 70.1 | 15.8 | 13.7 |
| about 13k | A0 | 641 / 1,416 | 587.2 | 50.3 | 12.8 |
| about 20k | P2X | 74.7 / 147; 77.9 / 254.4 | 56.7; 59.1 | 14.1; 15.2 | 9.2; 17.5 |
| about 20k | A0 | 484.2 / 1,420; 610.6 / 1,834 | 447.4; 504.4 | 43.1; 51.9 | 10.0; 19.1 |

**Open-loop TARGETS 2.1 trace** (10k subjects, 300 s with one 60 s burst at about 55 commands/s, about 20k history, 3,554 offered):

| Measure | A0 | P2X | P2X plus a per-subject driver queue (diagnostic) |
| --- | --- | --- | --- |
| Committed in window | 105 | 569 | 2,987 |
| Commits/s | 0.35 | 1.9 | 9.96 |
| CAS rejections | 5,900 | 4,982 (all same subject) | 0 |
| Steady ACK p50 / p99 ms | 2,444 / 12,554 | 615 / 218,641 | 294 / 256,003 |
| 5-to-10 band p50 / p99 ms | 1,845 / 309,466 | 78,420 / 319,379 | 175,779 / 334,825 |
| Feed gaps / order / duplicates | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| Feed lag steady p99 ms | 7,965 | 2,910 | 6,319 |

Re-sent and lost-ACK commands returned the original receipt in every arm. Crash injection (100 per variant): 0 visible duplicates with keyed
effects or an atomic checkpoint; the unkeyed split control showed 99, so the test can fail. Falsifiers F1 to F4 of Q31c pass
(packages/xtdb/test/subject-stamp.test.ts, 13/13). G1 xtdb at bd187d9 on a fresh engine: option off PASS 88/88, on PASS 88/88.

**What these numbers say about P2.** P2X fixed the problem it was built for: cross-subject conflicts and the history-dependent scope scan.
It did not reach the P2 bar in any run. The best single-writer service p50 was 42.6 ms, more than 4 times the bar, and 31.3 ms of it was the
engine transaction itself. Under the trace, the hottest subject (20% of commands) turns optimistic per-subject CAS into retries, and a
per-subject queue removes the retries but then the node is saturated (about 10 commits/s against a burst of 55/s).

### 1.3 Review state and why it is not merged

| Reason | Evidence | What it needs |
| --- | --- | --- |
| Never independently reviewed | STATE "V-P2X later"; no verify/P2X branch | a Codex high reviewer round per PROTOCOL 1 |
| Direction moved to the broker | Q51b (pending): the next XTDB P2/P3 experiment is EXP-P2B; P2X stays the XTDB-native arm A1 to compare against | nothing, if P2X is kept as A1 only |
| Far behind main | 460 commits behind, 11 ahead; base e01d40ed. Since then `packages/xtdb/src/XtdbStorageAdapter.ts` changed by 100+/24- lines (J01, X02, C8) and RT01 round A rewrites its CAS and receipt path | a rebase onto main after RT01 round A merges (Q90g puts RT01 round B on P2X "after it merges main") |
| Record time at decision not built | Q90c: P2X uses the engine stamp after probe p9-stamp-ms (R33 2.7 item 3, test T13: stored value equals JS `stamp / 1000` bit for bit over 10,000 commits); else both XTDB arms store integer microseconds | probe p9, then `instant` stamp form, watermark `BASE + floor(tx_meta.position / 8)` |
| Route-equivalence gate | Q89f names P2X among branches that must pass the R31 harness | run packages/testkit route-equivalence on the subject-stamp path |
| Hot subjects | Q51a: per-subject FIFO in the runtime's command router plus same-subject group commit up to 8; the queue is part of the candidate, not the driver | build it in the product runtime, not in the bench |
| Positions bound after commit | Q51c: core binds a position after publication, opaque totally ordered value; lands with the broker's engine-agnostic extraction (P2B) | until then P2X keeps negative placeholders and `bindPositions` |
| Log bytes | candidate source log 95,364 bytes per 10-fact commit against A0's 27,581 (probe p10); about 250 KB of slot volume per commit | Q51d (J01, merged default-off) to be applied to the stamped form |
| Untested engine-side crash and mixed paths | Q51f: `engine.mjs` gains a `kill` verb; a scope written by both paths fails typed. `grep kill lab/bin/engine.mjs` finds nothing on main | the kill verb and the refusal |
| Feed lag | steady p99 2.9 s against 250 ms, because the consumer's checkpoint transaction queues in the same serial indexer | Q51b sends the feed through the broker |

## 2. The XTDB commit floor in our VM

### 2.1 Every measured 10-fact (or smaller) commit on XTDB 2.2.0 in the triplex2 VM

All runs: 2-CPU, 3 to 3.5 GiB containers, Local log and storage, host load 8 to 19 on 12 cores, load generator on the host.

| Source | Command | Readers on the node | p50 ms | p99 ms | Latency kind |
| --- | --- | --- | --- | --- | --- |
| R16 misc-raw | single-row insert transaction | 0 | 14.7 | n/a | closed loop, quiet moment |
| R16 misc-raw | 10-row multi-row insert alone | 0 | 6.8 | n/a | closed loop, quiet moment; R19 calls the ordering non-monotonic, likely host noise |
| R16 p2 | 8 statements, 10 facts, 1 connection | 0 | 23.9 | 201.5 | closed loop |
| R16 p1b | same, open loop 40/s over 4 connections | 0 | 19.6 service; 19.9 from schedule | 105.7; 120.3 | open loop |
| R16 p1 | same | 0 | 16.4 service; 17.3 from schedule | 32.9; 43.2 | open loop; about 12% cheap CAS aborts (reused subjects) |
| R16 p1 | same | 1 | 17.2 service; 17.7 from schedule | 41.7; 41.8 | open loop |
| R16 p1b | same | 4 / 16 / 32 | 112 / 90 / 77 service; 3,588 / 7,239 / 10,599 from schedule | 337 / 523 / 916 | open loop; the writer falls behind |
| R16 p2 | same, 16 connections | 0 | 89.5 | 176.2 | closed loop, 172 commits/s |
| X05 baseline | same shape, 20/s on 8 connections | 0 | 50 service; 51 from schedule | 412; 557 | open loop, pooled zero-reader windows |
| X05 single node | same | 256 | 290 from schedule | 1,439 | open loop |
| X05 follower | same, readers on a read-only follower | 256 | 69 from schedule | 824 | open loop; follower died 9 times (Local log torn tail) |
| P2X | Triplex transact, subject-stamp | 0 | 42.6 to 79.7 fresh; 75 to 85 at 13k to 20k history | 93 to 254 | 1 writer, closed loop |
| P2X | Triplex transact, A0 | 0 | 56 to 57 fresh; 484 to 641 at 13k to 20k | 87 to 1,834 | 1 writer, closed loop |
| N01 | Triplex transact, A0, 1 fact, seeded 10k rung (about 770k rows) | 0 | 3,000 | n/a | single probe |

**No run reached p50 10 ms for a 10-fact command.** The closest was a bare 8-statement command at 16.4 ms service p50 (32.9 ms p99) with no readers and 17.2 ms (41.7 ms p99) with one reader, in a run where about 12% of commands were cheap CAS aborts.

### 2.2 Where one `COMMIT SYNC` spends its time (R19 3.1, source at c6c1962)

```
 client ── BEGIN, 8 statements, COMMIT SYNC ──> pgwire thread (statements buffered, expanded at commit)
   [1] source log append, FileChannel.force          ── fsync #1  (submit segment)
   [2] TxResolver: evaluate every ASSERT and DML     ── one resolver per database, serial
   [3] replica log append, FileChannel.force         ── fsync #2
   [4] leader reads its own replica record, applies it to the live index
   [5] Watchers wake the pgwire thread               ── (await segment = [2] to [5])
 CommandComplete ──> client   then Triplex P2X reads the receipt (one more round trip)
```

### 2.3 Engine-side split, from the metrics X05 scraped (lab/runs/X05/*.json, field `metrics.<phase>.writer`)

I parsed the Prometheus lines in the X05 receipts. `node_tx_execute` covers the whole commit inside the engine; `node_tx_await` is the part
after the source append ([2] to [5]); `node_tx_submit` was not recorded on the pgwire path (count 0), so the source-append segment is
execute minus await. Means are cumulative over the receipt's lifetime; quantiles are Micrometer's sliding window.

| Receipt, phase | Commits | Execute mean ms | Await mean ms | Await share | Source-append segment mean ms | `tx_op_timer` (resolve per op) p75 / p99 ms |
| --- | --- | --- | --- | --- | --- | --- |
| ff17f3, start (quiet) | 102 | 30.8 | 18.1 | 59% | 12.7 | 6.3 / 83.9 |
| ff17f3, before burst (after the reader ladder) | 17,199 | 98.4 | 87.2 | 89% | 11.2 | 3.9 / 13.6 |
| ff17f3, after burst | 23,243 | 123.0 | 111.0 | 90% | 12.0 | n/a |
| 8bb535, after burst | 29,898 | 117.2 | 106.8 | 91% | 10.4 | n/a |

About 6 ops resolve per commit (102,685 ops over 17,199 commits). R13 measured one fsync at 0.43 ms median on the same kind of volume, so
the 10 to 13 ms source-append segment is mostly serialization and queueing in the Local log writer, not the disk.

### 2.4 The answer: which mechanism is the floor

| Candidate | Verdict | Evidence |
| --- | --- | --- |
| Log append and fsync | **Not the floor.** Two fsyncs cost 1 to 2 ms. The source-append segment is 10 to 13 ms mean, flat under load, and mostly not disk | R13; R19 3.2; section 2.3 |
| Indexer (resolve, replica append, apply) | **The floor, and the part that grows.** It is 59% of engine commit time on a quiet start (18 ms) and about 90% under load (87 to 111 ms). There is one resolver per database, so every ASSERT and DML of every commit runs serially there, and readers on the same JVM compete for its 2 CPUs | section 2.3; R16 1.2 (4 readers raised service about 5x); R19 3.1 |
| Await-tx wait for read-your-own-write | **Zero on the writer node.** `COMMIT SYNC` returns after the leader applied the record, so a pull on the same node at the returned tx sees it with no extra wait (R16: 200/200). It becomes real only on another node: X05 measured ack-to-visible p50 23 to 32 ms at zero readers and 45 ms p50 / 451 ms p99 with 256 follower readers | R19 3.4; X05 lag table |
| Triplex on top | **Adds 10 to 15 ms and the history term.** P2X: 3 point reads cost 10 to 17 ms (sum of p50s), plus 8 statements per transaction. A0: scope scans cost about 3.8 us per stored row (N01) | section 1.2; N01 |

### 2.5 Can p50 <= 10 ms and p99 <= 50 ms be met natively with 256 readers?

**Not on the evidence.** Three facts close it on this host, and one gap keeps it from being a final statement.

1. **The engine alone exceeds the bar on a quiet start.** Engine-side commit mean 30.8 ms (X05 start); the best client-side p50 for a
   10-fact command is 16.4 ms (R16, 0 readers; 17.2 ms with 1 reader).
2. **Readers on the writer node raise commit service 4 to 6x.** R16 at 4 to 32 readers: 77 to 112 ms. X05 single node at 256 readers:
   290 ms p50. The read-only Local follower, the only reader topology that fits the pool, failed on reliability (X05: 9 deaths in about
   30 minutes). The Kafka topology needs about 7 GiB (X05), which does not fit beside the residents.
3. **85% of trace commands arrive in bursts.** Steady 15 facts/s at a mean of 13.7 facts per command is about 1.1 commands/s (540 s per
   10 minutes, about 590 commands); the burst is about 55 commands/s for 60 s (about 3,300 commands). The P2 percentiles over the trace are
   therefore mostly burst percentiles. A serial decider needs a service time of about 7 ms or less to keep p99 <= 50 ms at 55 commands/s
   (M/M/1: 4.6 x S / (1 - 55 x S) <= 0.05 s gives S <= 6.8 ms, utilisation 0.37). R16's bare 8-statement command at 40 commands/s already
   had p50 19.6 ms and p99 105.7 ms with no readers.
4. **The gap:** every number above came from a loaded host (load 8 to 19 on 12 cores, other agents running). No run has used an exclusive,
   CPU-pinned slot with the residents quiet, and R19's E2 decomposition (Local against InMemory log, pipelined statements) never ran.
   Section 4 closes this gap in one slot turn.

## 3. Single writer against per-subject concurrency

### 3.1 What each composition does today

| Composition | Where | Commit concurrency | What its GS or NS commit bars measure |
| --- | --- | --- | --- |
| `triplex-public` (W01/W01b harness) | lab/scenarios/lib/composition.mjs:42-46, 74-79 | single flight per runtime (`writerConcurrency = 1`), retries serialization conflicts from other processes up to 200 times | A0's queue: every commit waits behind every other one. At 0.1 to 1 commit/s against about 1.1 commands/s steady and 55/s in bursts, the queue never drains (R37 1.2: p99 285 s to 5,403 s) |
| `public` (bench, used by the W02 GS harness) | lab/bench/lib/composition.ts:120-175; lab/scenarios/v2/lanes.ts:29 | none in the composition; on XTDB A0 two concurrent transacts in one scope collide on the scope CAS (`triplex-cas-conflict`, N01) | either CAS losses or whatever serialization the driver imposes |
| `public-queued` (bench) | composition.ts:122 with XTDB `admissionQueue: true` | serial inside the XTDB adapter (looked non-FIFO in N01, not confirmed) | the same queue as single flight, moved into the adapter |
| P2X candidate plus a per-subject queue | P2X bench only (diagnostic arm) | serial per subject, parallel across subjects | engine saturation: 9.96 commits/s, 573 commands still pending on the two hottest subjects at the drain cap |

### 3.2 Recommendation: which composition the golden scenarios and the P2 measurement use

1. **The P2 measurement uses the lane's P2 candidate, and that candidate commits serially per subject and in parallel across subjects.**
   TARGETS 2 fixes the conflict model ("optimistic compare-and-set on the subject's last position; serial per subject, parallel across
   subjects"), and Q51a puts the per-subject FIFO queue and same-subject group commit in the runtime's command router, as part of the
   candidate. The driver offers commands open loop on the frozen schedule and never adds its own writer semaphore; TARGETS 1.1 P2 item 1
   already counts queueing behind other writers, so a queue the candidate needs shows up in its numbers.
2. **A0 single flight stays as the frozen control and nothing else.** A0 cannot run per-subject concurrency: its scope CAS turns
   concurrency into conflicts (P2X fresh: 222 conflicts and 3,376 CAS rejections for 480 commands). Its single-flight queue is honest A0
   behaviour, so receipts keep it, but every A0 commit bar is labelled "A0 control, queue-bound" and never read as P2 evidence.
3. **Golden scenarios run the candidate composition when the lane has one that passes its gates,** and until then report lane X commit
   bars as A0 diagnostics. GS correctness checks (accounting, receipts, read-your-own-write, no wrong reads) stay valid on A0 and are worth
   running now; the bars are not.
4. **The composition declares its concurrency in the receipt** (TARGETS 4.1 item 2): decider (engine indexer, broker loop or client),
   per-subject queue bound, group-commit limit, and the stamp source. A run whose driver serialized commits outside the composition cannot
   close a P2 obligation.
5. **One trace fact drives every choice: 85% of commands arrive in bursts at about 55 commands/s** (section 2.5 item 3). A single decider
   meets the bar only with a service time of about 7 ms or less. XTDB's indexer cannot do that on this host (42.6 ms best Triplex
   service, 16.4 ms best bare); the broker's decision loop can (ACK path alone 3.8 ms p50, 4.8 ms p99, P2Q).

### 3.3 How RT01's stamping interacts with per-subject concurrency

RT01 round A (worktree .claude/worktrees/rt01, head cc54c3c6, read only) implements Q90a and Q90c for XTDB A0:

| RT01 A0 fact | Where | Consequence for concurrency |
| --- | --- | --- |
| The stamp is decided on the client, `nextStamp(sourceStamp, stagedAt)`, from the source cut's stamp read with K | XtdbStorageAdapter.ts (rt01) lines 211, 250 | the stamp is strictly increasing in position only because the CAS admits only K + 1 after that exact cut (R33 2.1 item 4) |
| One ASSERT guards both coordinates: `MAX(position) = K AND MAX(stamp) = S` over `tx_meta FOR ALL VALID_TIME WHERE scope_key = ?` | XtdbStorageAdapter.ts (rt01) line 293; also line 119-125 | still scope-wide, so A0 stays serial per scope; RT01 chose one statement to avoid a pgwire round trip (REPORT) |
| The second `MAX(stamp)` subquery scans the same scope rows again | same line | A0's history term (N01: about 3.8 us per stored row) is likely larger; RT01's microbenchmarks are offline (`"engineIO": false`, evidence/adapter-microbench-final.json), so the engine cost is unmeasured |

**Client stamps and per-subject concurrency do not mix.** With per-subject CAS, two commits on different subjects are admitted in parallel,
each from its own source cut. Commit A stages at clock 1000 on subject X, commit B stages at 1001 on subject Y, and the indexer may resolve B
first. A client stamp would then give B a lower position and a higher stamp than A, so a `recordedAt` cut is not a log prefix again. That
is defect D-C1 that Q89a and Q90 exist to close. Per-subject concurrency therefore needs the stamp decided where the order is decided:

| Arm | Stamp source | Status |
| --- | --- | --- |
| XTDB A0 | client, under the scope CAS | RT01 round A, building; correct only because A0 is serial |
| XTDB P2X | the engine's system time inside the transaction (`COMMIT_STAMP_SQL`); strictly increasing in resolution order, also across scopes on one node (R33 2.7) | Q90c: after probe p9-stamp-ms (T13); if p9 fails, both XTDB arms store integer microseconds. Lands as RT01 round B on P2X after P2X merges main (Q90g) |
| Broker (P2Q, and P2B for XTDB) | the broker, per frame member, inside `commitGroup` under the writer lock | Q90c; lost-ACK replays return the original stamp |

Two more details for RT01 round B on P2X:
1. **The watermark must stay off a hot row.** R33 2.7 item 4 derives W from `tx_meta.position`, which P2X writes blind (the greatest stamp
   survives, R33 row XP9). Round B must not add a read-and-guard on a scope row, or it reintroduces the scope serialization P2X removed. R33
   chose microseconds for this reason (section 2.7 table: strict milliseconds would need the hot scope row).
2. **Seals (round 2) write `tx_meta.stamp` with `INSERT ... SELECT` from the current row** (R33 section 3 table). A seal is rare, so a read
   of the scope row there is acceptable, but it should be measured once under the per-subject trace.

### 3.4 What this means for the order of work

| Step | Why it is on the path | Blocked by |
| --- | --- | --- |
| RT01 round A merges (A0 stamps) | contract 0.4.0 and every later comparison series start here (Q90f) | RT01 review |
| EXP-P2X2 (section 4) on one exclusive slot | closes or reopens the XTDB-native P2 path with a quiet, pinned measurement | a slot turn in the scale window; no product code |
| P2Q merges, then EXP-P2B (Q58b) | the only design with measured ACKs inside the bar; XTDB becomes the replica and history layer | P2Q review round 10; one author owns the broker files (Q58b) |
| P2X rebased onto main plus RT01 round B, kept as arm A1 | the native comparison arm, and the fallback if P2B fails | RT01 round A merge; EXP-P2X2 decision |

## 4. Next experiment brief: EXP-P2X2, the XTDB commit floor and the per-subject composition on one exclusive slot

**North star:** P2 (commit p50 <= 10 ms and p99 <= 50 ms, offer to ACK, 5-to-10 and 11-to-25 bands, with P1's 256 readers; read-your-own-write
at the returned tx with no extra wait; original receipt on duplicates and lost ACKs), measured as TARGETS 1.1 "P2 commits" items 1 to 4.
**Scope:** lab/SCOPE.md (3.2: say plainly what is impossible natively, then build the workaround), lab/NORTH-STAR.md, lab/TARGETS.md
sections 1, 1.1, 2, 2.1, 4.1. Evidence: this report (R39), R16 sections 0.3 and 2, R19 sections 3 and 5 (E2), the P2X branch fb6681a4 and its
REPORT, X05 metrics. Rulings: Q31a, Q31e, Q51a, Q51b, Q58b, Q89a, Q90c.

### 4.1 Commander's intent

Settle, on a quiet and CPU-pinned exclusive slot, whether XTDB 2.2.0 can ever carry the P2 bar natively for a Triplex 10-fact command, and
name the mechanism that sets the floor with the engine's own metrics. When this lands, the lab either states plainly "XTDB-native P2 is not
reachable on this host: floor F ms, set by M" and puts lane X P2 on the broker (P2B) with P2X kept as arm A1, or has a measured margin that
justifies one native statement-cut round. It also measures, once, what RT01's second scope scan costs A0 on a real engine.

### 4.2 Arms (all on one exclusive slot, in this order, ABAB-interleaved where two arms compare)

| Arm | What | Commands | Shape | Source |
| --- | --- | --- | --- | --- |
| F1 | bare single-row `BEGIN; INSERT; COMMIT SYNC`, 1 connection | 1,000 | closed loop | R19 E2(a) |
| F2 | bare R16 command: 8 statements, 10 facts (claim ASSERT, CAS ASSERT, UPDATE, claim INSERT, 10-row ledger INSERT, feed INSERT), 1 connection | 1,000 | closed loop | R16 0.3, `writer.mjs` |
| F3 | F2 with all statements pipelined in one client write | 1,000 | closed loop | R19 E2(c) |
| F4 (optional) | F2 on an `InMemory` log slot (diagnostic only, no durability) | 1,000 | closed loop | R19 E2(b); run only if `engine.mjs` can start the slot with a log override without code changes |
| F5 | Triplex `transact` of 10 facts on P2X `subject-stamp` (build of fb6681a4), 1 writer, fresh scope, then after 10k commits of history | 150 per point, 15 warm-up dropped | closed loop | P2X `bench/run.mjs service` |
| F6 | Triplex A0 `transact` of 10 facts, 1 writer: main build against the RT01 round A build (or its merge), fresh and at 10k history, ABAB | 150 per point | closed loop | new; answers the unmeasured RT01 `MAX(stamp)` scan |
| F7 | frozen TARGETS 2.1 trace (generator hash and seed bound), 10k subjects, 600 s with one 60 s burst, P2X with a per-subject FIFO and same-subject group commit (Q51a; up to 8 per engine transaction), 0 readers | about 4,000 | open loop | P2X `bench/trace.mjs` plus the queue |
| F8 | F7 with 64 and then 256 closed-loop pinned readers on the same node (`server.numThreads: 300`, client in-flight cap 16 as in X05) | about 4,000 per level | open loop | X05 reader worker |
| F9 | A0 single flight on the F7 trace, 300 s (control; expected unstable) | as offered | open loop | `triplex-public` |

**Scrape before and after every arm:** `/metrics` lines `node_tx_execute_seconds`, `node_tx_await_seconds`, `node_tx_submit_seconds`,
`tx_op_timer_seconds` (count and sum, not only quantiles, so per-arm means come from differences), `pgwire_tx_latency`, compactor jobs, JVM heap.
Record the client breakdown as P2X's `timings` field does (submit, source-cut read, claim read, receipt read).

### 4.3 Predictions (falsifiable; report each MET, FALSIFIED or NOT RUN)

1. F1 p50 8 to 16 ms (R19); F2 p50 15 to 25 ms; F3 2 to 5 ms below F2. Falsified low if F3 p50 <= 6 ms.
2. In F2 the engine await segment (await sum over execute sum) is at least 50% of engine commit time, and the source-append segment is
   under 5 ms on the quiet pinned slot (X05 loaded: 10 to 13 ms). If F4 runs, it is 1 to 3 ms below F2 (fsync under a quarter of the floor).
3. F5 service p50 30 to 45 ms fresh and 40 to 90 ms at 10k history; submit at least 70% of service; the three point reads 9 to 17 ms.
4. F6: the RT01 build's A0 service at 10k history is higher than main's by at least 10%, because the ASSERT scans the scope twice.
   Falsified if within 5%.
5. F7: the 5-to-10 band misses the bar (p50 above 10 ms and p99 above 50 ms) at 0 readers; zero cross-subject CAS conflicts; zero
   same-subject retries with the queue; the burst does not drain within 60 s (TARGETS 1.1 P2 item 4).
6. F8: writer commit p99 at 256 readers at least 2x the F7 value (single node; R16 and X05 point to 4 to 6x).
7. Correctness in every arm: zero unaccounted commands, read-your-own-write 100% at the returned tx on the writer node with zero wait,
   original receipt on every duplicate and lost ACK, zero wrong answers in the O-REPLAY sample.

### 4.4 Gates

| Gate | When | Pass condition |
| --- | --- | --- |
| G-OFF | before the slot | bench unit tests pass; P2X `subject-stamp.test.ts` 13/13 on the build used; the frozen generator hash and seed are written into the receipt template |
| G1-ON/OFF | first 15 minutes of the slot turn, fresh engine | `node lab/bin/gate.mjs G1 --lane xtdb` PASS with `commitPath` on and off on the exact build F5 and F7 use (fb6681a4 passed 88/88 at bd187d9; rerun because the slot is fresh and the receipt must bind this build) |
| G-QUIET | before each arm | `compactor_jobs_available == 0`; host 1-minute load and VM CPU sampled (X05 `vm-cpu-sample.sh`); the slot pinned with `--cpuset-cpus`; residents' CPU use recorded |
| G-ACCT | every arm | every offered command committed with a receipt, rejected with a typed error, or a typed conflict found independently; zero unaccounted (TARGETS 1.1 P2 item 3) |
| G-RYOW | F5, F7, F8 | the pull at the returned tx returns the commit 100% with `waitedMs = 0`; any read that had to await is counted and fails the gate |
| G-IDEM | F7, F8 | every re-send (10% of system signals) and every lost-ACK retry (1%) returns the original receipt |
| G-ORACLE | F7, F8 | the bench's O-REPLAY sample check: zero mismatches |
| G-DISK | before F5 history and before F7 | host free disk at least 5 GiB after the expected growth (P2X: about 250 KB of slot volume per commit, so 10k history is about 2.5 GB) |

The run is `diagnostic` (no PAIR-0 yet, M01 parked). Verdicts are absolute for the decision rule below, because the rule only closes a path
when even the quiet, pinned best case misses by a margin.

### 4.5 Decision rule (written before the run)

| Outcome | Condition | Consequence |
| --- | --- | --- |
| **D1: native closed** | F3 p50 > 6 ms, or F5 fresh p50 > 20 ms, or engine resolve time per Triplex commit (`tx_op_timer` sum over commits in F5) > 7 ms | Record in lab/TARGETS.md section 3 notes and the scorecard: "XTDB 2.2.0 does not meet P2 natively on this host; floor F ms; mechanism: the serial indexer". Lane X P2 is carried by P2B. P2X stays A1 for P3 and correctness comparisons; its statement-cut ideas are not pursued |
| **D2: native has margin** | F3 p50 <= 6 ms and F5 fresh p50 <= 20 ms and resolve per commit <= 7 ms | One native round on P2X after its rebase and RT01 round B: one ASSERT per commit, pipelined statements, the receipt and stamp taken from the transaction instead of a following read, the claim read folded into the guard. Then F7 and F8 again |

The 7 ms figure is the serial service time at which one decider still holds p99 <= 50 ms at 55 commands/s (section 2.5 item 3). The 20 ms
figure leaves room for removing the three point reads (10 to 17 ms in P2X) and pipelining (2 to 5 ms).

### 4.6 Slot plan in the 11 GiB pool

Today (STATE, scale window open): tx2-datomic-dev parked with its volume kept; residents tx2-xtdb-dev 3.0 GiB and tx2-qlever-dev 3.5 GiB;
6.5 of 11 GiB used; 4.5 GiB free, so exactly one 3.5 GiB exclusive slot at a time, with 1.0 GiB left over.

| Slot turn | Holder | Memory |
| --- | --- | --- |
| now | CX-XRUN on xtdb-s1 (X02, C8, J01 reruns) | 3.5 |
| next | K01 live two-start and E1 | 3.5 |
| **then** | **EXP-P2X2 on xtdb-s1, about 90 minutes** | 3.5 (`-Xmx2g`, direct 1g); no follower, so the 1.0 GiB remainder stays free |
| after | P5 A1 at 1k; G03 slot run; W02 live GS on xtdb; unpark tx2-datomic-dev for EXP-DA04 | 3.5 each |

EXP-P2X2 goes before P5 A1 because P2 outranks P5 (NORTH-STAR rule 1). W02 live GS on xtdb should follow it, so its receipt can cite the
P2 decision; its commit bars stay A0 diagnostics either way.

| Phase inside the turn | Minutes |
| --- | --- |
| `engine.mjs up --lane xtdb --slot s1 --cpuset-cpus <2 vCPUs>` fresh; G1 on and off | 15 |
| F1 to F3 (and F4 if available, which needs a second fresh start) | 10 (plus 10) |
| F5 and F6 fresh (ABAB) | 10 |
| history to 10k commits with the P2X preload (parameterised `INSERT ... SELECT`, never literal VALUES: P2X and X05 both exhausted the 2 GiB heap that way) | 15 |
| F5 and F6 at 10k (ABAB) | 10 |
| F7, F8 at 64, F8 at 256, F9 | 30 |
| `engine.mjs down` with the volume; release the slot | 2 |

**Quiet-host option.** The strongest D1 statement needs the residents quiet. Q69a set the precedent of stopping qlever-dev for about 75
minutes for M01. The orchestrator decides whether to stop tx2-xtdb-dev and tx2-qlever-dev for the 20 minutes of F1 to F6; pausing Sam's
default colima VM needs Sam (STATE). If neither is done, the receipt records the load and the decision rule still applies.

### 4.7 Boundaries

1. Builder: Codex `gpt-6.1-sol` medium through `node lab/bin/agent.mjs launch --role builder`; reviewer: Codex high, a different agent
   (PROTOCOL 1). Branch `exp/P2X2-xtdb-commit-floor` from main. Files: `lab/experiments/EXP-P2X2-xtdb-commit-floor/**` only; no
   `packages/` edits. The F5 and F7 arms build the P2X packages from a separate worktree at fb6681a4; F6 builds main and the RT01 head.
2. Docker only with `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock` through `lab/bin/engine.mjs`; never
   /Users/sam/projects/triplex-db or ports 15442 and 17019; heavy builds through `lab/bin/heavy.mjs`; pnpm with
   `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`.
3. Raw samples compressed under /Users/sam/Claude/Projects/triplex-db-2/EXP-P2X2/; receipts under the experiment directory.
4. Reviewer prompt wording per PROTOCOL 6: "check that each gate rejects the inputs it should" and "an abrupt process stop", never attack
   language.

### 4.8 Report

Per arm: p50, p90, p99 and max per size band; commits/s; conflicts and retries; the client breakdown; engine execute, await and source-append
means and resolve time per commit from metric differences; host load and VM CPU; gate results; prediction verdicts; the D1 or D2 decision
with the numbers that decided it.

## 5. What P2B (XTDB behind the broker) must show on lane X, so it closes P2 and not just the ACK

P2Q's broker numbers came without readers and on QLever. Lane X inherits the ACK path; these are the lane-X-specific checks to add to the
P2B brief when it starts (Q58b: after the broker fix round is re-verified, by the same author).

| Check | Bar or rule | Why it is lane-specific |
| --- | --- | --- |
| ACK per band on the frozen trace, bursts included, with 256 readers on the XTDB replica | p50 <= 10 ms, p99 <= 50 ms | the broker runs on the host, XTDB in the VM; readers load XTDB, not the broker, but the applier and the readers share XTDB's 2 CPUs |
| Read-your-own-write at the returned position | 100% with no extra wait: served by the overlay (Q58d, entity pulls only) or a synchronous current store, never by waiting for the XTDB applier | the XTDB replica applies frames asynchronously (one pgwire transaction per frame, Q58b), and its own commit floor (section 2) is the applier's service time |
| XTDB applier throughput and lag | keeps up with 55 commands/s in bursts through frame grouping (up to 64 per frame in P2Q); watermark lag p99 reported; P1 reads at the latest tx route to the overlay or fallback while XTDB lags, and the fallback share is reported (TARGETS 4.1 item 5) | the applier is the same serial indexer measured in section 2.3 |
| Stamps | the broker decides the record stamp in `commitGroup` (Q90c); XTDB system time never carries broker positions or stamps (Q58b) | keeps P2X's engine stamp and the broker stamp from mixing in one scope |
| Duplicates and lost ACKs | original receipt 100%, including a lost ACK across a broker restart | as P2Q, now with XTDB as the replica |
| G1 xtdb with the broker path on | PASS | the XTDB read surfaces must honour the marker as the eligibility authority (Q58b) |

## 6. Open questions

1. **Does a separate current store have to be synchronous for read-your-own-write?** TARGETS 4.1 item 6 says the current index is kept
   synchronous with commits in normal operation. EXP-P4's H1 is fed from the feed (asynchronous) and its X2 arm adds `tx_current` writes to
   the commit (more statements on the serial indexer). The P2 and P4 designs should agree on one answer before either promotes.
2. **Is a broker log of record still "lane X"?** TARGETS 4.1 item 1 says each of the four assignments is "XTDB or QLever"; rulings Q51b and
   Q58b already put a host log in front of both engines. If Sam reads lane X as "XTDB is the source of truth", the honest lane X P2 result is
   the D1 statement from EXP-P2X2, and P2B is a cross-lane composition. This is Sam's call; I recommend recording the broker as the source
   of truth assignment explicitly in every lane X P2 receipt.
3. **R37-a (rung ruling) and GS on A0.** At the seeded 10k rung A0 costs about 3 s per commit (N01), so lane X GS commit bars at 10k will
   stay queue-bound until a candidate composition exists, whatever the rung ruling says.

## 7. Files

| File | Role |
| --- | --- |
| /Users/sam/Claude/Projects/triplex-db-2/R39/R39-lane-x-p2.md | this report |
| /Users/sam/projects/triplex-db-2/lab/scenarios/lib/composition.mjs:42-46, 74-79 | the single-flight writer (the brief's lab/bench/lib/composition.mjs path does not exist) |
| /Users/sam/projects/triplex-db-2/lab/bench/lib/composition.ts:120-175 and lab/scenarios/v2/lanes.ts:29 | the W02 GS composition (`public`, no queue) |
| /Users/sam/projects/triplex-db-2/lab/runs/X05/X05-s2-20261107T234308Z-ff17f3.json | engine-side commit metrics used in section 2.3 |
| exp/P2X-xtdb-commit-feed:lab/experiments/EXP-P2X-xtdb-commit-feed/receipts/service-*.json | client-side breakdown used in section 1.2 |
| /Users/sam/projects/triplex-db-2/.claude/worktrees/rt01/packages/xtdb/src/XtdbStorageAdapter.ts:119-125, 293 | RT01's two-coordinate scope ASSERT |

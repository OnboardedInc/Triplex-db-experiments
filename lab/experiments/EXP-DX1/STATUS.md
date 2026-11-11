# EXP-DX1 status: lane D fast-forward (read this first after a context compaction)

Updated 2026-11-09 night. Goal (Sam): all of P1 to P5 at their bars on Datomic or native XTDB. Mode: `lab/PROTOCOL.md` section 0b.
Diagnosis and target design: `lab/research/R51-fast-forward-diagnosis.md`. Integration branch: `lane/d-native` (worktree
`.claude/worktrees/d-native`), which is main plus the EXP-QH1 pull fast path (`Triples.reach`).

## Agents (all Codex gpt-6.1-sol medium, launched with `lab/bin/agent.mjs --role builder`)

| Id | Task | Branch / worktree | Prompt | Output |
| --- | --- | --- | --- | --- |
| DX-S1 | Datomic floors on Postgres storage: commit vs datoms, in-peer pull cost, history flatness, reader/writer isolation, cross-peer delay, durability sanity | `spike/DX-S1`, `.claude/worktrees/dx-s1` | `~/Claude/Projects/triplex-db-2/agents/prompts/DX-S1.md` | `lab/experiments/EXP-DX1/spike-s1/REPORT.md` |
| DX-B1 | Gateway and adapter fast paths: row datoms, one-call reach, no transactor on reads, two-round-trip commit, equivalence test | `exp/DX-B1-fast-paths`, `.claude/worktrees/dx-b1` | `.../prompts/DX-B1.md` | `lab/experiments/EXP-DX1/b1/REPORT.md` |
| DX-H1 | NS driver on lane datomic, `reach` composition, Postgres-backed stack scripts with split read and write gateways | `exp/DX-H1-ns-harness`, `.claude/worktrees/dx-h1` | `.../prompts/DX-H1.md` | `lab/experiments/EXP-DX1/h1/REPORT.md` |
| XN-S1 | XTDB floors: point-read CPU per query, leanest atomic commit, reader/writer coupling | `spike/XN-S1`, `.claude/worktrees/xn-s1` | `.../prompts/XN-S1.md` | `lab/experiments/EXP-XN1/spike-s1/REPORT.md` |

Last messages and logs: `~/Claude/Projects/triplex-db-2/agents/<Id>/`. VM CPU plan: DX-S1 0-3, XN-S1 4-5, DX-B1 and DX-H1 6-7.

## Next, in order

1. Read each report when its agent exits; compare with R51 section 5 predictions; record the numbers here.
2. Merge DX-B1 and DX-H1 into `lane/d-native` (H1's `main.clj` URI-template commit may conflict with B1's M2; resolve by hand).
3. Stage 2 build (DX-B2), on the merged branch: entity cache in the peer (versions valid from fill until the first transaction that
   touches the entity, invalidated from the tx report queue), content-hash references so a client never receives or parses the same
   entity version twice, `reach-many` for sweep pages, a maintenance-trigger route for P1 windows, and whatever H1 lists as blockers.
   If S1 shows datom count sets commit latency: lean fact encoding. If S1 shows commit queueing in bursts: per-subject compare-and-set
   in a transaction function.
4. First full NS run on lane D (10k rung, Postgres storage, split gateways), then close gaps bar by bar.
5. Lane X: decide from XN-S1 whether the SQL surface can meet P4 and P1 at all; if not, record the miss with numbers.
6. At the end: one independent review, receipts, scorecard.

## Open design points for stage 2 (orchestrator notes)

- NS computes P4 throughput as pull goodput divided by the engine's CPU quota (`TX2_ENGINE_CPUS`), so idle transactor and Postgres
  CPUs count against it. Give the stack one CPU for transactor plus Postgres and the rest to read gateways.
- Host to VM network throughput may cap goodput: an average pull is about 110 KB of JSON. Content-hash references cut that to about
  10 KB (only the subject's own entities travel after warm-up).
- The driver names bases by record time (`recordedAt` = a receipt's instant). The record-time mapping in DX-B1 M1 must be eligible for
  the benchmark's bases, or every past-basis read falls to the slow history route.

## Results so far

### DX-S1 (Datomic floors, Postgres storage, engine only; `spike/DX-S1` f5be712f, merged; report `lab/experiments/EXP-DX1/spike-s1/REPORT.md`)

The VM was shared with three other agents during these runs, so tails (p99) are unreliable; medians and CPU figures stand.

| Question | Result | R51 prediction | Reading |
| --- | --- | --- | --- |
| Commit, closed loop, 40 / 100 / 260 / 600 datoms | p50 5.1 / 4.0 / 4.5 / 8.4 ms; p99 14 / 20 / 24 / 42 ms | 3-6 ms at 40; 5-12 at 260 | Met. Median is flat up to 260 datoms. |
| Commit, 40 row-only datoms; via a transaction function | p50 1.8 ms; 1.6 ms | - | Uniqueness checks and entity creation cost more than bytes. A transaction function costs nothing measurable. |
| Commit, open loop 55/s, 40 datoms | p50 3.7, p99 23 ms | - | Inside the P2 bars. |
| Commit, open loop 55/s, 260 datoms | p50 7.2, p99 268 ms | - | Misses p99. Transactor had 1 CPU and a 32 MB index threshold, VM busy. Re-measure quiet with 2 CPUs and a larger threshold before deciding on a lean encoding. |
| Pull in the peer, 449 rows, 95 entities | 4,436 pulls per CPU-s with lookup refs; **6,302 with an id cache**; 25,595 with an entity cache | 1,400-3,000; then >6,600 | Better than predicted. The index path alone is 5.7x the 1,100 bar, so the gateway entity cache is not needed. |
| Same, 4 threads on 2 CPUs | 4,956 pulls per container CPU-s (id cache) | - | Scales across threads. |
| History depth 10 vs 1, current db | mean CPU 0.993x | flat | Met (bar 1.1x). As-of costs 1.0x to 1.3x. |
| Saturated reader peer vs writer p99 | inconclusive (baseline p99 varied 23 to 622 ms between runs) | within 1.25x | Re-measure in a quiet window. |
| Commit visible on another peer after ACK | p50 0.5 ms, p99 3.6 ms, max 10.9 ms | p50 <5, p99 <30 | Met. |
| Kill transactor / kill Postgres | 0 of 532 / 0 of 510 acknowledged commits missing | 0 | Met (one round each). |

Decisions from S1: (1) no entity cache in the gateway; (2) stage 2 read work is about the wire and the client (per-entity revision
and references so an entity version travels once per client session, `reach-many`); (3) a quiet-window spike DX-S2 re-measures the
260-datom burst and the isolation question with the transactor on 2 CPUs.

### DX-B1 (gateway and adapter fast paths; `exp/DX-B1-fast-paths` b9ce5abf, merged; report `lab/experiments/EXP-DX1/b1/REPORT.md`)

- Exactness: 6,600 fast-versus-fallback comparisons over 200 random scenarios: 5,960 deep-equal, 640 declined (380 interior position,
  260 irregular scope), 0 faults; three mutants each fail the test. Reads answer with the transactor process stopped.
- A commit is 2 HTTP calls (was about 9); a pull is 1 (was about 6).
- Diagnostic speed (dev storage, 500 warm-ups only, one container for both JVMs): pull p50 6.0 ms and 521 pulls per CPU-second; commit
  p50 12.9 ms at 276 datoms. Not representative: cold JIT, per-request `d/q`, double decode and `localeCompare` sort on the client,
  `d/sync` on begin and transact. DX-B2 fixes these.

### DX-H1 (NS driver on lane datomic; `exp/DX-H1-ns-harness` 23b97ac6, merged; report `lab/experiments/EXP-DX1/h1/REPORT.md`)

- `lab/bench/driver.ts --lane datomic --composition public|reach` reaches DONE through all 17 phases on a Postgres-backed stack
  (`lab/experiments/EXP-DX1/stack/up.sh`, separate write and read gateways); 0 read violations. Numbers were on the old gateway.
- Seeding through `Triples.transact`: about 2,400 facts/s, so 10k subjects in about 3 minutes and 100k in about 27 to 35 minutes.
- Open: P5 in the NS driver is fetch-only (the real activation path is `--world w0`); indexing-job hook; engine bytes read; O-REPLAY root.

### XN-S1 (XTDB 2.2.0 floors, engine only, one 2-CPU node; `spike/XN-S1` 5d583a42, merged; report `lab/experiments/EXP-XN1/spike-s1/REPORT.md`)

| Case | Result | R51 prediction | Bar |
| --- | --- | --- | --- |
| One 1,500-byte document by `_id`, settled node | up to 2,459 per engine CPU-s (16 clients); 1,079 with 1 client; p50 1.1 ms single client | 300-800 | 1,100 pulls |
| One pre-joined 135 KB document by `_id` | up to 1,710 per engine CPU-s; 1,115 with 1 client; p50 1.3 ms | - | 1,100 pulls |
| 95 small documents in one `IN` query | 54 to 63 per engine CPU-s; p50 18 ms single client | - | 1,100 pulls |
| Lean atomic commit (2 asserts, 3 documents, head, claim; one socket write), closed loop | p50 3.5 ms, p99 7.1 ms; aged 4.0 / 7.4 | - | 10 / 50 ms |
| Same, open loop 55/s | p50 9.3 ms, p99 35 ms | - | 10 / 50 ms |
| Same, 55/s with 16 readers on the node | p50 16.1 ms, p99 90.7 ms, 2.33x the no-reader p99 | misses 1.25x | 1.25x at 256 readers |

Reading: my prediction for point reads was too low. XTDB can clear P4's per-CPU bar only when a pull is one `_id` lookup of a
pre-joined document (multi-id reads are 20x too slow), and its lean commit clears P2 alone. P1 fails on one node: readers and the
indexer share the JVM. Passing P1 on native XTDB needs reads on a second node, which XTDB only supports with a Kafka log; no Kafka
image is on the machine, so that needs Sam's approval to download. Lane X is therefore parked behind that decision; lane D carries
the goal.

### DX-B2 (speed; `exp/DX-B2-speed` 92a18d88, merged; report `lab/experiments/EXP-DX1/b2/REPORT.md`)

Warm, Postgres storage, Postgres CPU 0, transactor CPUs 0-1, write gateway CPU 2, read gateway CPUs 3-4, 2,000 subjects.

| Measure | Result | Bar |
| --- | --- | --- |
| Pull, one client, with references | p50 1.87 ms, p99 6.50 ms; 3.6 KB per pull (82.8 KB without references); client CPU 0.71 ms | p50 5, p99 25 |
| Pull throughput, 32 readers | 6,798 pulls/s, **3,461 per read-gateway CPU-second**, p50 3.5 / p99 26 ms | 1,100 |
| Pull at a past record time / past position | p50 1.0 ms, p99 5.8 ms, 0 declines | p50 5, p99 25 |
| Commit, serial | **p50 9.77 ms, p99 30.7 ms**, 2 HTTP calls, median 249 datoms; `d/transact` itself 4.2 ms | p50 10, p99 50 |
| Commit, open loop 55/s through the admission queue | p50 25 ms, **p99 178 ms** (miss) | p50 10, p99 50 |
| Same with 32 readers running | p99 353 ms, 1.99x (miss) | 1.25x |
| Read your own write through the read gateway | 2,000 of 2,000 visible; pull p50 4.9 ms, p99 50 ms on grown hot worlds | 5 / 25 |

Tests: 144 pass (1 known pre-existing failure), 29,800 answer comparisons at 6,600 bases, 5 mutants each fail.
Cause of the burst miss: every commit in a scope is serial end to end (client-allocated position plus a scope-wide compare-and-set), so
a 10 ms service time at 55/s queues. DX-B3 moves position assignment into a transaction function, checks conflicts per entity and
commits optimistically in one call.

Known growth issue: a hot subject's placement entity gains one ref row per command, so its row set is re-sent whole after each change.
If the NS run shows it matters: send entity deltas from Datomic history (`d/since`) between the revision the client holds and the
current one.

### DX-B3 (commits that do not queue; `exp/DX-B3-concurrent-commits` b40c19c5, merged; report `lab/experiments/EXP-DX1/b3/REPORT.md`)

- Built: row text v2 with a shiftable 16-digit position; transaction function `:triplex/commit` assigns positions in the transactor and
  checks conflicts per entity; one-call optimistic commit from a bounded client row cache; `committedPosition` core seam. 203 tests
  pass (1 known failure). 16 clients x 200 commands concurrently: 0 conflicts, dense positions in transaction order.
- Serial commit p50 8.17 ms, p99 34 ms, 1.008 HTTP calls. `d/transact` itself p50 4.5 ms at a median of 249 datoms.
- 55/s open loop, no queue: p50 14.2 ms, p90 27.8 ms, **p99 482 ms** (83 of 3,291 over 50 ms); with 32 readers p99 584 ms (ratio 1.21).
  The transactor log shows apply maxima of 0.67 to 0.86 s, a storage put of 0.81 s and index jobs inside the burst.
- Reading: the client queue is gone; the remaining tail is in the engine at about 18,000 datoms per second.

### First NS run on lane D (orchestrator, stack `tx2-dxo1-a`, B2 code): stopped, invalid

Writer pending grew past 7,000 with the write gateway at 100% CPU and the transactor idle. Cause: core `transactions({after})` loads
every journal row per poll and `transactionByCommand` walks every fact (`packages/core/src/store/TriplesLive.ts` 632-690). DX-B4
fixes both. The run did not take the measurement lock and overlapped DX-B3's first M4 attempt for a few minutes.

### DX-H2 (P5 harness; `exp/DX-H2-p5-harness` 5e415d98, merged; report `lab/experiments/EXP-DX1/h2/REPORT.md`)

- `driver.ts --world w0 --lane datomic` runs the real activation (W0 kernel, outbox publication, oracle gates) with per-page stage
  timing and a paired live-traffic window. A 50-subject run completed with gates G0-G3, G5, G7, G9 passing; the 1,000-subject run
  failed on a live-reader read error after 256 subjects (cause not captured).
- Page time is all reading through the old path: 62 to 113 s per 64-subject page, against 0.02 s evaluation and 0.1 s publication.
- Needs from packages: reach results as rows with recorded positions (`getReachRowsMany`); indexed feed and command lookup (DX-B4).
- W0 seeding is 43 commands per subject: 434,768 commands at 10k and 4,338,757 at 100k; at the measured 35 commands/s that is 3.5 h
  and 34 h. Seeding throughput is a P5 blocker.

## Decision (orchestrator, 2026-11-09 night): build the lean layout

One datom per row (the row text) becomes the system of record in a new scope layout; every read is served from row texts and
Datomic history; legacy layout untouched; a differential test compares the two. Reasons: burst tail and median (P2), W0 seeding
throughput (P5), peer memory. Brief: `.../prompts/DX-B5.md`, launches when DX-B4 commits. Native Datalog over reified datoms is not
available on lean scopes until an asynchronous reifier exists (planned after the bars).

### DX-B4 (indexed feed and command lookup; `exp/DX-B4-indexed-feed` d3c67ff4, merged; report `lab/experiments/EXP-DX1/b4/REPORT.md`)

- Built: `getTransactionsAfter` (feed by position with long-poll) and `getTransactionIdByCommand`, with equivalence tests (700
  accepted comparisons); scan counters at `/v2/admin/scan-stats`. After the fix a 2,000-subject NS run made 0 whole-store scans
  (before: 3.9 million datoms enumerated) and reached all 17 phases.
- The 10k run was interrupted at the 1,024-reader level (see infrastructure finding below). Before that, writer pending peaked at 559
  in the burst and returned to 0 by L256. Its request samples show `d/transact` p50 247 ms during the run: the transaction function
  reads through the transactor's 128 MB object cache, which a 10k-subject store does not fit.
- Open: the P3 publication observer (`lab/bench/lib/datomic-publication.ts:24`) rejects shifted positions (DX-H3 fixes); the feed
  declines on irregular scopes and concurrent commits make scopes irregular through timestamp order (DX-B5 D0 fixes).

### Infrastructure finding (orchestrator, 2026-11-09 20:35 local)

The Mac reaches VM ports and the Docker socket through Lima's ssh port forwarding. At 1,024 readers the ssh master died and every
forward with it; the VM and its containers kept running. Restored without a restart: moved the stale socket file aside and ran
`ssh -F ~/.colima/_lima/colima-triplex2/ssh.config -O forward -L <sock>:/var/run/docker.sock lima-colima-triplex2` (same form for
ports). Consequence: every wall-clock number measured from the Mac so far includes that tunnel. From DX-H3 on, the driver runs in a
container inside the VM.

### DX-S3 (burst-tail attribution and configuration; `spike/DX-S3` 50efdb38, merged; report `lab/experiments/EXP-DX1/s3/REPORT.md`)

55/s open-loop burst, legacy layout (median 249 datoms per commit), load generator on the Mac through the ssh tunnel.

| Variant | Burst p50 / p99, no readers (worst of 3) | With 32 readers | Over 50 ms |
| --- | --- | --- | --- |
| V0 as DX-B3 | 14.4 / 76.8 ms | 16.1 / 100 ms | 191 of 9,873 |
| V1 Postgres alone on a CPU with 2 GB | 15.8 / 67.1 | 21.6 / 688 | 164 |
| V2 = V1 + index thresholds 768m/1536m, heaps 4 GB / 2.5 GB | 17.0 / 67.8 | 15.3 / 145 | 156 |
| V3 = V2 + ZGC | 21.1 / 178 | 25.0 / 215 | 554 |

- No configuration meets 10 / 50 ms. V2 removes index jobs and checkpoints from the burst; its transactor apply p99 is 8 to 14 ms at
  about 0.4 cores, so the transactor is not saturated. The largest pauses line up with write-gateway full GCs. ZGC is worse.
- Latency by command size in V2: 5-10 facts (mean 207 datoms) p50 14.6 ms; 11-25 (385) 18.9 ms; 26-50 (723) 26.7 ms. That is about
  23 microseconds per datom over the whole path plus about 10 ms fixed in the burst (serial is 7.6 to 9 ms), so the burst also
  pays for contention outside the transactor: one CPU for the write gateway, the client, the tunnel.
- `up.sh` gained memory, heap, threshold, JVM and Postgres flags (defaults unchanged). V2's command line is the baseline for full runs.
- Decision: the lean layout stands (5x fewer datoms cuts gateway, GC and apply work). After it lands, re-measure in the VM mode with
  the write gateway on two CPUs.

### DX-H3 (driver inside the VM; `exp/DX-H3-in-vm-harness` ab50fc38, merged; report `lab/experiments/EXP-DX1/h3/REPORT.md`, every bar in `h3/REAL-TABLES.md`)

- `stack/run-in-vm.sh PREFIX -- COMMAND` runs the driver in a `node:22.23.2-bookworm-slim` container on the stack network with no
  published ports; engine CPU comes from cgroup files; SQLite files live on a Docker volume; the publication observer accepts shifted
  positions; the oracle matcher handles reordered blob keys (fixed after the 10k run, not re-run).
- 10k run on the **legacy layout** (not lean): complete report, verdict ERROR. 905 of 13,059 trace commands published; feed stopped at
  position 1,036 (it declines on the irregular scope and the fallback scan hits the gateway deadline); L256 read p99 3,375 ms; P4 mix
  p50 14.8 ms and 17 pulls/s per core; 280 model violations and 259 read errors; O-REPLAY receipt check failed on 8 blob ids.
  Client was not saturated. These are the known legacy-layout defects (timestamp order makes the scope irregular; fat commits) plus
  gateways running a 1 GiB heap.
- **Gateway JVM finding (from DX-S3, confirmed while merging):** `bin/run` ignores `JAVA_OPTS` and reads `DATOMIC_JAVA_OPTS`, so every
  gateway in every measurement so far ran with a 1 GiB heap and the Serial collector (the JVM picks Serial on one CPU). `up.sh` now
  passes gateway heap through `DATOMIC_JAVA_OPTS`; full runs must also set `-XX:+UseG1GC` and give the write gateway two CPUs.
- The 280 model violations must be explained on the lean rerun before any bar is trusted.

### DX-B5 (lean layout; `exp/DX-B5-lean-layout` 087dba42, merged; report `lab/experiments/EXP-DX1/b5/REPORT.md`)

- Built: scope layout `lean` (`:triplex.scope/rows-version 3`, chosen at creation, `TRIPLEX_DATOMIC_LAYOUT=lean` in the bench); a row is
  one indexed row-text datom; cut reader (as-of) and history reader (Datomic history plus retirement markers) serve every row route;
  record times kept in commit order (ordered send, per-client ordered submission, clock replay); `getReachRows` / `getReachRowsMany`;
  the W0 page reader uses one call per page.
- Exactness: 300 scenarios on both layouts, 95,028 comparisons deep-equal (5,664 through the fast cut reader); 3 mutants rejected.
  Suites: legacy 180 pass / 2 fail, lean 178 pass / 2 fail / 2 skipped (native `q`). The two failures: the known signed-zero domain
  test, and an inherited DX-B4 journal test that expects success for an untyped SPI row (`tx_id` "spi") where both layouts now
  return a typed error. **Both must be fixed or explained before any PASS claim.**
- `LayoutUnsupported` on lean: native Datalog `q` and the older `log` route only.
- Numbers (DX-B3 stack profile, driver on the Mac through the tunnel, gateways 1 GiB heap with the Serial collector):

| Measure | Lean | Legacy, same session | Bar |
| --- | --- | --- | --- |
| Datoms per commit p50 / p90 / p99 | 48 / 82 / 124 | 251 / 540 / 898 | - |
| Serial commit p50 / p99; `d/transact` p50 | 7.5 / 23.3 ms; 3.1 ms | 9.9 / 32.5 ms; 4.0 ms | 10 / 50 |
| 55/s burst, no readers (3 runs) | p50 14.2 ms, p99 40-41 ms | 16.8 / 56.2 ms | 10 / 50 |
| 55/s burst with 32 readers | p50 10.8 ms, p99 67.8 ms | not run | 10 / 50 |
| Pull, one client; 32 readers | p50 2.2 / p99 7.0 ms; 2,525 per read-gateway CPU-s | - | 5 / 25; 1,100 |
| NS seed, 32 writers | 289 commands/s (11,800 facts/s) | - | - |
| W0 page, 64 subjects | 777 ms, 1 HTTP call, 32,570 rows | 62-113 s through the old path | - |

- Clock replays under contention: 58 (16 clients, one process, shared CPU), 77 (4 processes); 0 when isolated.

## Orchestrator runs on the lean layout inside the VM (2,000 subjects, 20 s levels; `lab/experiments/EXP-DX1/h3/attempt.sh medium`)

Evidence: `~/Claude/Projects/triplex-db-2/evidence/DX-H3/tx2-dxh3-om{1,2,3}/driver/ns-report.json`. om1 died (driver container
out of memory at 4 GB). Gateways: 2 GB heap, G1. Transactor heap 3 GB, object cache 1 GB.

| Measure | om2: engine 6 CPUs (write gateway 2, read gateway 2), driver 2 CPUs | om3: engine 4 CPUs (transactor 0-1, Postgres 0, write gateway 1, read gateway 2-3), driver 4 CPUs | Bar |
| --- | --- | --- | --- |
| Status, oracle | DONE, O-REPLAY PASS | DONE, O-REPLAY PASS | - |
| Reads correct | 608,841 of 608,841 | 729,751 of 729,761: **6 stale, 4 errors** | 0 violations |
| P3 (gaps, order, duplicates, resume, crash points) | all pass; lag p99 at L256 53 ms | all pass; lag p99 47 ms | 250 ms |
| P4 mix pull p50 / p99 | 0.88 / 3.6 ms | pass | 5 / 25 ms |
| P4 pulls/s per engine core | 938 (client saturated, 6 quota cores); 3,457 per used core | **1,661**; 3,743 per used core | 1,100 |
| P4 history p99 depth 10 / depth 1 | 1.43 (p50 1.09) | 1.18 (p50 1.06) | 1.1 |
| L1 read p50 / p99 | 0.36 / 1.3 ms | 0.35 / 1.2 ms | - |
| L64 goodput; read p50 / p99 | 5,631/s; 7.3 / 29 ms | 6,645/s; 5.6 / 41 ms | - |
| L256 goodput vs L64; read p99 | 0.44; 430 ms (client saturated) | 0.64; 340 ms (read gateway at 196% of 2 CPUs, client 0.86) | >= 1.0; 100 ms |
| Commit, lone commits at L1 | p50 33 ms (17 commits) | p50 36 ms | 10 / 50 |
| Commit bands, steady | 5-10 facts p50 13.8 ms, p99 70 ms | p50 14.3 ms, p99 79 ms | 10 / 50 |
| Commit bands, burst (overlaps L256, L1024) | p50 84 ms, p99 5.3 s (client saturated) | p50 45 ms, p99 680 ms (driver main thread 0.53-0.76 busy) | 10 / 50 |
| P2 accounting, duplicates, lost ACKs, read-your-own-write | all pass | all pass | - |
| P5 live read / writer p99 during the fetch-only sweep vs before | 1.17 / 0.46 | - | 1.5 |

Findings that drive the next round:

1. **Stale reads on the read peer (om3, kind `stale`).** A read at a receipt's record time is answered by a peer that has not received
   that commit yet. Fix in DX-B6 finding 5: strictly increasing record times, and a peer whose maximum record time is below the
   basis waits (then syncs once). om2 had none because its driver was slower.
2. **A lone commit takes 30 to 36 ms in the driver** against 7.5 ms back to back in the bench. DX-B6 finding 1 (breakdown and fix);
   DX-H4 step 4 (the driver's own share).
3. **The driver's main thread is the writer's bottleneck in the burst.** DX-H4 step 5.
4. **Reference misses cost a full pull** (2.7% of pulls at 64 readers) and the client caches are unbounded. DX-B6 findings 2 and 3.
5. Harness: maintenance events are mis-attributed per window; history depth is measured before Datomic has indexed; no matched
   zero-reader baseline. DX-H4 steps 1 to 3.
6. CPU plan that keeps the client unsaturated up to L64 and passes P4 per core: engine 4 CPUs, driver 4 CPUs with 3 reader threads.

## P5 arithmetic to keep in mind

A W0 subject has about 440 own rows (442,410 assertions per 1,000 subjects). 100,000 subjects in 100 s is about 440,000 rows per
second read, decoded and evaluated, about 13 GB of row JSON. That needs several read-gateway cores and several client cores at once;
the 8-CPU VM also has to carry live traffic during the sweep. Seeding 100k is 4.3 million commands (about 3 to 4 hours at 300 to 400
commands per second).

## DX-H4 merged (2026-11-10 08:45 UTC, merge e5150d6c): paired run at 2,000 subjects, and what the tables say

Report `lab/experiments/EXP-DX1/h4/REPORT.md`, tables `h4/tx2-dxh4-s6-TABLES.md`, evidence
`~/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-s6-{ladder,zero}`. 960,817 of 960,817 reads correct, oracle PASS,
maintenance event in every window, history p99 ratio 0.963, goodput 256/64 1.08. The 10k pair was not run (lock contention).

Misses: read p99 at L256 659 ms (bar 100); writer p99 ratio at 256 2.60 (bar 1.25, matched baseline); P2 at L256 p50 25 ms and
p99 274 ms; steady band p50 18.6 ms; lone commits at L1 p50 36 ms; P3 lag p99 at L256 520 ms; P4 903 pulls/s per quota core
(bar 1,100); recovery unjudged (30 s window); P5 is fetch-only in this driver.

Orchestrator reading of the tables (hypotheses, each with the test that settles it):

1. **Sparse work is slow on this VM, dense work is fast.** Commit p50 is 36 ms at L1, 30 ms at L4 and 13.6 ms at L16; it falls
   as the machine gets busier. DX-B6 measured back-to-back commits at p50 4.7 ms and one per second at 25 to 34 ms, with every
   component about 10x slower in the sparse case, including command construction in the driver (9.2 ms against 0.07 ms), which
   never touches Datomic. Feed lag p99 is 2,088 ms at L1 and 14 ms at L16. Hypothesis: an idle vCPU under the macOS hypervisor
   takes milliseconds to wake, so every hop of a sparse commit pays a wake. Test: `lab/experiments/EXP-DX1/vm-wake/run.sh` with
   and without `--spin` (no containers; fixed pure-CPU unit after a sleep). If confirmed, the lone-commit and steady-band misses
   are a property of the test bed, and the remedy is a VM setting (idle polling), recorded in every receipt. The 2 s feed lag at
   L1 and L4 still needs its own check: it looks like a long-poll that fell to its timeout.
2. **The read gateway loses efficiency under concurrency.** L4: 3,611 pulls/s on 1.18 engine cores in total (3,061 per used
   core). L1024 phase (256 readers, quiet writer): 3,593 pulls/s with the read gateway at 188% of its 2 CPUs (about 1,900 per
   core). L256 (burst): 2,167 pulls/s at 183% (about 1,180 per core). Closed-loop arithmetic: 256 readers with read p99 under
   100 ms needs about 5,000 pulls/s or more; 2 read-gateway CPUs at the L4 efficiency would give about 6,000. So P1 read p99, P4
   per quota core and P3 lag at L256 (the feed shares the saturated read gateway) all depend on one thing: why a pull costs 2 to
   3 times more CPU at 256 readers than at 4. Test: JFR and GC log on the read gateway at L4 and L256, and `--cpu-prof` on one
   reader worker. No download needed, JFR ships with the JVM.
3. **The driver is close to its own CPU limit.** Three reader workers at ELU 0.83 to 0.86, plus main, side and probe workers, on
   4 CPUs. Writer latency is measured inside that container, so the writer p99 ratio at 256 includes client contention. Remedy
   candidates: cheaper verification per read, or more VM CPUs (Sam's call; the Mac has 12 cores, the VM has 8).
4. **P4 per quota core is measured at the best ladder level, which neither side saturates.** The bar divides goodput by the 4
   quota cores (TARGETS section 1.1 P4 item 3), so the engine has to reach 4,400 pulls/s. It only can if item 2 is fixed.

## DX-B6 and DX-H5 merged (2026-11-10 12:00 UTC); three causes found; three agents launched

**DX-B6** (merge 2870c42b, report `b6/REPORT.md`): cold commits make one HTTP call instead of two; missing references repair
with a `need` request (zero full retries in 10,240 concurrent pulls); client caches bounded by bytes; the two failing tests pass;
record times strictly increase and a second peer waits for the record-time watermark (40,000 cross-peer answers correct).
Open: one commit per second still p50 24.9 ms against 4.7 ms back-to-back; 256 frozen-basis readers 2,100 pulls/s at p99 526 ms
with the read gateway at 1.98 of 2 cores.

**DX-H5** (merge 47d2b0a9, report `h5/REPORT.md`): W0 activation on 1,000 subjects with every gate passing took 58.6 s, 30.7 s
and 31.8 s with 1, 4 and 8 workers (32 subjects/s against 1,000 needed). Per 1,000 subjects: read and decode 6.69 CPU s, world
build 5.53, kernel 0.33, Python oracle 4.36, serialised verify, build and commit 24.9 s of wall. Seed 208 commands/s in reference
order; the 10,000-subject seed slowed from 210 to 115 commands/s and did not finish in 43 minutes. Sealed seed volume kept:
`tx2-dxh5-seed-1000-pg-data` (654 MB).

Orchestrator's reading (2026-11-10), three causes that between them cover every remaining miss:

1. **A hot value.** `:triplex.scope/position` is replaced by every commit. Reading it merges Datomic's in-memory index and
   cancels every replaced pair since the last index job (`MergeIter` / `filter_retractions`, seen in the transactor's thread
   dumps under `commit.clj:24`). The commit function reads it, and so does every pull (`select-db`), every journal page and every
   1 ms wait iteration. Cost grows with commits since the last index job. Agent **DX-B8** removes it.
2. **The read gateway serves 256 CPU-bound requests on 512 threads over 2 cores, re-reads every row of every entity on every
   pull, and holds a per-session lock across serialisation.** Agent **DX-B7** adds admission in arrival order, an entity cache
   keyed by (entity, revision), removes the lock and replaces 1 ms sleep polls with notification.
3. **The P5 sweep spends its time moving data, not evaluating.** Agent **DX-H6** takes the stages to a budget of about 1.5 CPU s
   per 1,000 subjects, moves the oracle out of the timed path (still every subject), pipelines publication and seeds in reference
   order with many commits in flight.

4. **Settled 2026-11-10 12:22 UTC: an idle vCPU on this VM wakes 8 to 9 ms late and then runs about 5 times slower for about
   10 ms** (`vm-wake/RESULT.md`). With one SCHED_IDLE busy loop per CPU the effect is gone. Every measurer now runs
   `vm-wake/keep-awake.sh start` under the lock and records `keepAwake: true`. Every earlier number was taken without it; the
   sparse-commit and steady-band misses have to be re-measured before they count as misses.
5. The paused lane's `tx2-qlever-dev` container was removed (volume retained): its health-check query used about 370 ms of one
   unpinned CPU every 5 s.

Sam, 2026-11-10: Kafka image download approved, VM stays at 8 CPUs. `apache/kafka:4.1.1` pulled 12:22 UTC
(`sha256:0bc1bb2478f45b6cea78864df86acdc11e8df2c5172477819a4d12942cbe5d40`, 232 MB). Agent **XN-S2** (`spike/XN-S2`,
`.claude/worktrees/xn-s2`, prompt `.../prompts/XN-S2.md`) tests one XTDB write node plus one read node on a Kafka log, engine only,
lowest lock priority.

## DX-B7 and XN-S2 results (2026-11-10 13:30 UTC)

**DX-B7** (branch `exp/DX-B7-read-gateway` head 08300758, **not merged here; DX-B8 merges it**; report `b7/REPORT.md` on that
branch). Built: arrival-order admission with a separate feed permit, session generations without a response-wide lock, a
byte-bounded parsed-entity cache keyed by (entity, revision), a report-queue consumer with notified waits, a revision memo per
cut. Result: throughput targets missed (256 readers 986 pulls/s, p99 516 ms, 824 pulls per gateway CPU-second, with keep-awake);
admission alone cut p99 at 256 readers from 515 to 214 ms at equal throughput; quiet feed lag p99 16.8 and 13.6 ms (met); the 2 s
feed outliers did not reproduce. Lean suite and the 300-scenario differential were not run on its last commit.
**Its profile is the finding:** with both caches at zero misses the gateway's CPU is still in `filter_retractions` (`eat_past`,
`skip`), `take_while` and boxed number comparison, which is `select-db` walking the scope entity's replaced position and replaced
maximum record time on every pull. That is cause 1 above, now seen on the read side.

**DX-B8 before-measurement** (unchanged code): fill rate 625 commits/s at 7,650 commits, 286 at 23,000, 77 at 97,000, 59 at
98,500. Cause 1 confirmed on the write side.

**XN-S2**: the local XTDB image has no Kafka module (`Unknown type '!Kafka'`; known types `!DirectMirror, !InMemory, !Local,
!Postgres`). Nothing measured. Resumed without downloads to test whether two nodes can share a log through `!Postgres` with the
local Postgres image. If not, lane X needs `ghcr.io/xtdb/xtdb-aws:2.2.0` and an S3-compatible store image (Sam's call).

**keep-awake helper**: the first version's `start` matched itself and started nothing; fixed (commit a323c667). Whether the
busy loops cost throughput under load is open: DX-B8 measures everything without and with.

**XN-S2 final (13:35 UTC, merged):** `!Postgres` is an external-source remote, not a log; `log: !Postgres` is rejected. No two-node
XTDB can be built from local images. **Lane X is parked** until Sam decides on two downloads: `ghcr.io/xtdb/xtdb-aws:2.2.0` (has the
Kafka module) and an S3-compatible object store image. Report `lab/experiments/EXP-XN1/spike-s2/REPORT.md`.

## DX-H6 result (merged 2026-11-10 15:52 UTC, merge 90012d51; it carries DX-B8's fix commit 19f5422d and DX-B7's gateway work)

Report `lab/experiments/EXP-DX1/h6/REPORT.md`. Every subject's world, output and record bytes equal the old code's.

| What | Before (DX-H5) | Now | Needed |
| --- | --- | --- | --- |
| Sweep rate, 1,000 subjects, live traffic, gates passing | 32 subjects/s | 223 subjects/s (4 workers, ratios 0.68 / 1.22); 334 subjects/s with 8 workers but live ratios 2.2 / 23 | 1,000 subjects/s |
| Load-generator CPU per 1,000 subjects (decode, world, kernel, hand-over) | 13.0 s | 0.97 s on the Mac warm (1.45 s in a later rebuild run); 1.86 s in the VM with 4 workers | about 1.3 s |
| Oracle | 4.36 s inside the timed path | outside it, every subject still compared before any gate says PASS | |
| Load-generator peak memory | out of memory at 8 GiB | 1.6 GiB with the package's byte budgets | 4 GiB |
| Serial seed rate | 174 to 208 commands/s | 259 commands/s after DX-B8's fix | 1,000 |
| 10,000-subject seed | not finished | all 434,768 commands acknowledged in reference order (263 falling to 145 commands/s); the count and fingerprint stage hit the 43-minute guard | sealed seed |

Open, from its report:
1. **Commits in flight break reference order.** The gateway's per-client sequence is best effort with a 20 ms timeout, so a
   window of 16 reorders (expected position 133, got 147). Needs a strict per-client sequence in the gateway. This blocks both fast
   seeding and pipelined publication.
2. **Publication is the next wall for P5:** 16 commits per 1,000 subjects, 2.6 to 2.8 s of summed commit wall, about 165 ms per
   commit of 458 datoms. At 1,000 subjects/s that is 2.6 s of serial transactor time per second. Not yet profiled.
3. **Gateway row pages:** 7.8 s of summed gateway time per 1,000 subjects (about 17 microseconds per row), on 2 cores shared
   with 64 live readers.
4. The seed rate still falls with size after the fix (263 to 145 commands/s over 400,000 commands). DX-B8's own measurement at
   250,000 commits will say how flat plain commits are.
5. Storage: 657.5 MB volume per 1,000 subjects, of which 335.5 MB is write-ahead log and 290.2 MB is Datomic data. See
   `lab/research/SAM-decisions-2026-11-09.md` (Sam's storage question) and spike DX-S4.

## DX-B8 result (merged 2026-11-10 17:00 UTC, merge ebc92d6f; carries DX-B7). Cause 1 is fixed and it was the big one

Report `lab/experiments/EXP-DX1/b8/REPORT.md`. Both layouts' gates and all 300 differential scenarios pass. All numbers below
are **without keep-awake**, on a scope with about 50,000 commits and no index job requested.

| Measurement | Unchanged code | After the head fix (19f5422d) | Bar |
| --- | --- | --- | --- |
| Back-to-back commit p50 at heads 1,000 / 50,000 / 250,000 / 500,000 | 8.1 / 10.5 / not reached / not reached ms | 6.3 / 3.1 / 3.3 / 3.2 ms | P2 p50 at most 10 ms |
| Fill rate | 625 falling to 59 commits/s by 98,500 | about 2,100 to 2,200 commits/s, flat | |
| Read-gateway CPU per pull at heads 1,000 / 50,000 | 0.52 / 3.77 ms | 0.14 / 0.12 ms (0.13 at 500,000) | |
| 256 readers, frozen basis | 2,100 to 2,226 pulls/s, p99 515 ms | 7,973 pulls/s, p99 75.6 ms, 4,916 pulls per gateway CPU-second | P1 p99 at most 100 ms; P4 1,100 per engine core (7,973 / 4 = 1,993) |
| 64 readers, frozen basis | 2,095 pulls/s | 8,848 pulls/s, p99 20.2 ms | goodput at 256 not below 64 (0.90, short) |
| 256 readers pinned to the newest receipt, writer at 15 commits/s | not measured | 5,109 pulls/s, read p99 158.8 ms, commit p99 26 ms loaded against 48 ms quiet, feed lag p99 17.9 ms | read p99 at most 100 ms (missed); writer ratio at most 1.25; feed lag at most 250 ms |

The second fix (da77a50a, a revision map fed by the transaction report queue, so a pull of unchanged entities makes no
per-entity Datomic call) passes every gate and a racing-writer test (498,577 verified hits, zero errors), and its profile shows
Datomic at under 6% of gateway samples. Its one performance run (3,568 pulls/s frozen, 2,658 moving) was taken while the Mac
had under 5 GiB of disk and 24 GB of swap in use, so it is not a valid comparison; the paired north-star run re-measures it.
Remaining gateway CPU by the profile: Clojure map lookups in `reach/read-entity`, key equality in the entity cache lookup,
string appends.

## Test-bed findings (2026-11-10 17:10 UTC)

1. **keep-awake is withdrawn** (`vm-wake/RESULT.md`): it halves dense throughput. All measurements run without a helper.
2. **The Mac is an M3 Pro with 6 performance and 6 efficiency cores; the VM has 8 vCPUs.** Any phase that keeps more than 6 vCPUs
   busy runs partly on efficiency cores.
3. **Disk fell to 4.4 GiB free.** Causes: the VM's data disk did not return freed blocks to macOS (28.5 GiB recovered with
   `fstrim`; the disk is now mounted with `discard`), swap grew to 28 GB, evidence was 53 GB (compressed losslessly to 42 GB).
   Free now: about 51 GiB.
4. **Host memory is overcommitted**: 18 to 28 GB of swap in use on 36 GB of RAM with this VM at 20 GiB. This adds noise to every
   timing. Sam's call whether to shrink the VM's memory or free memory elsewhere.

## XN-S2 final (2026-11-10, merged): two XTDB nodes on Kafka and MinIO work; the one measured case misses P2

`lab/experiments/EXP-XN1/spike-s2/REPORT.md`. A write node and a read node on `apache/kafka:4.1.1` and the Chainguard MinIO image
start, the read node sees the writer's commits, survives a restart and catches up, and the writer keeps going while it is down.
Measured: commits at 15/s with no readers p50 21.9 ms, p99 90.8 ms (bar 10 / 50). The loaded cases did not run (a 16-reader
preparation stalled, then disk and time ran out). Kafka used 0.10 cores and 422 MiB. Lane X stays parked behind lane D.

## Orchestrator's paired north-star run `tx2-dxh4-o1` (2026-11-10 17:13 to 17:28 UTC, merge ebc92d6f): NOT VALID as a verdict

Tables `lab/experiments/EXP-DX1/h4/tx2-dxh4-o1-TABLES.md`; evidence `~/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-o1-{zero,ladder}`.
Correct on every read and the oracle passes, but every latency is far worse than DX-H4's `s6` run on older code: L4 1,582 pulls/s
(was 3,611), L256 509 pulls/s with read p99 2,556 ms, burst commit p99 12 s, and the **zero-reader arm's** writer p99 in the burst
window is 3.2 s. During the run the Mac was in a video call (call apps 77% CPU, other processes 294% CPU, load 6 to 7) with 17.6 GB of
swap in use (`lab/bin/host-quiet.sh` said not quiet a minute after it ended). DX-B8's own harness had the same merged gateway
at half the speed of `19f5422d` an hour earlier, also on an unhealthy host. So one of two things is true and this run cannot
tell which: the second fix (`da77a50a`) regressed commits and pulls, or the host did it. DX-B9 step A settles it with
alternating arms in one lock hold.

New measuring rules (in DX-B9's brief, and for every later run): alternate arms inside one hold; record `host-quiet.sh` before
and after; no keep-awake.

**VM resized 2026-11-10 17:49 UTC (Sam approved): 8 CPU, 16 GiB (was 20), 100 GiB.** Restart took 26 s under the measurement
lock; 155 volumes and 16 images intact; docker context restored to `colima`; data disk remounted with `discard` (must be
repeated after any restart). Log `~/Claude/Projects/triplex-db-2/evidence/ORCH-vm-resize/resize.log`.

## DX-S4 storage anatomy (first part merged 2026-11-10 18:26 UTC; report `lab/experiments/EXP-DX1/s4/REPORT.md`, script `s4/footprint.sh`)

Same 442,410 assertion payloads (1,000 W0 subjects, 42,775 commands), write-ahead log excluded everywhere:

| Form | Bytes | Per assertion |
| --- | --- | --- |
| JSON lines, xz / gzip | 1.6 MB / 3.5 MB | 3.7 / 7.8 |
| Packed typed cells plus dictionary (raw, not a database) | 50.6 MB | 114 |
| JSON lines, raw | 89.7 MB | 203 |
| **Lane D Datomic after index, storage GC and `VACUUM FULL`** | **139.7 MB** | **316** |
| Plain Postgres typed table with 3 indexes | 150.8 MB | 341 |
| Lane D Datomic as sealed (no maintenance) | 286.5 MB | 648 |

1. **Half of the Datomic table was reclaimable garbage** (superseded index segments still live as key-value rows: 82,227 rows
   down to 12,343). Current and history row digests were identical before and after.
2. Maintained Datomic, which also carries history, journals, claims and receipts, is about level with a bare Postgres table.
3. **Journal change objects are 75% of all row text** (363.6 MB of text against 122.1 MB for subject rows, before compression).
4. The write-ahead log (335.5 MB as sealed) is a setting: 134 MB with smaller retention.
5. Per W0 subject, maintained: 140 KB of table, 170 KB of non-log volume. **100,000 subjects is about 14 to 17 GB**, not 65.
6. W0 text is very repetitive (xz 55 times smaller), so a compressed columnar store should be far smaller; not yet measured.
7. Second part (merged 20:25 UTC): Datomic rows only, maintained: packed binary 27.4 MB (62 bytes per assertion), unindexed
   strings 34.8 MB (79), indexed strings as today 42.5 MB (96); rows plus the real journal 126.3 MB (286), so **the feed journal
   is about 84 MB, 60% of the lane's maintained bytes**, and the by-value index about 8 MB. **XTDB 2.2.0: 702.7 MB one document
   per assertion (storage 471.8 MB, logs 230.9 MB), 628.7 MB one document per entity**, compactor idle but level-0 files still on
   disk, so not necessarily its minimum.
8. Sam, 2026-11-10: storage footprint is a guard metric (`lab/TARGETS.md`), no further size work now, and **no QLever work of any
   kind**. No QLever index was built; the 1.9 GB prepared input was removed.

Proposed metric (Sam to rank): stopped volume bytes excluding the physical write-ahead log, per W0 subject, after the reference
maintenance (index, storage GC, observed quiescence, `VACUUM FULL`, checkpoint, clean stop). Today: 170 KB per subject maintained,
318 KB as sealed.

## Plan from 2026-11-10 20:40 UTC (Sam: only this Mac; verdicts at the 10,000 rung; "could it run on the Mac directly?")

1. **Queued, starts by itself when the host is quiet:** `lab/experiments/EXP-DX1/quiet/run-10k-pair.sh tx2-dxh4-q1` (paired
   north-star benchmark, `--rung 10k`, in the VM, no keep-awake, host recorded before and after). Evidence
   `~/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-q1-*`. Known risk at this rung: DX-H3's 10k run on older code failed the
   oracle (receipt consistency, eight missing blob assertion identities).
2. **Native arm:** the wake probe run natively on macOS shows no slowdown after a wake (2.2 ms against 1.7 ms back-to-back,
   busy host) and about 3 ms of sleep overshoot, against 10 to 12 ms and 8 to 9 ms in the VM. Agent DX-N1 builds a native mode
   (Postgres, transactor, gateways and load generator as macOS processes under `~/Claude/Projects/triplex-db-2/native/`, ports
   28400 to 28499 on loopback) and a matched VM-against-native comparison. The VM stays the system of record until that
   report says otherwise.
3. DX-B9 continues in the package (step A gates, then strict commit order, publication cost, row pages).

## First 10,000-subject paired run `tx2-dxh4-q1` (2026-11-10 20:45 to 21:25 UTC, head 46c0fd1c): correct, and driver-limited

Tables `lab/experiments/EXP-DX1/h4/tx2-dxh4-q1-TABLES.md`. Host: borderline quiet at the start (other processes 147%, load 9.3),
busy at the end (other processes 991%, swap 22.7 GB): the lab's own agents (builds, test gates) were the noise. Treat latencies
as upper bounds.

1. **Correct at this rung: 699,920 of 699,920 reads, oracle PASS, receipt consistency PASS** (DX-H3's old blob failure is gone).
2. Met: zero violations; goodput 256 against 64 (1.07); writer p99 ratio at 256 (0.71); writer wait; every P3 bar including feed
   lag p99 at 256 readers (68 ms); P4 pull p50 1.3 ms and p99 5.6 ms; sweep-against-live ratios.
3. Missed: read p99 at 256 readers 627 ms; P2 at 256 readers p50 33.8 ms and p99 256 ms; P4 per quota core 402; goodput 1024
   against 256 (0.84) and writer ratio at 1,024 (2.63); history flatness 1.1007 against 1.1; recovery not computed.
4. **The load generator is the limit:** reader threads 0.93 to 0.97 busy at 1,350 to 1,600 pulls/s from 64 readers up, flagged
   "client saturated". That is about 1.9 ms of driver CPU per pull against 0.37 ms on a 2,000-subject scope, with 1.24 to 1.37
   HTTP requests per pull (repairs for evicted entities). Agent DX-H7 owns this.
5. Commit tails of 1 to 2 s appear in burst windows even with zero readers (L16 window: 1.6 s). Host, or the index job that
   every window requests on a 10,000-subject scope with the transactor sharing 2 CPUs: not separated yet.
6. Feed lag p99 2.1 s at 1 reader and 3.4 s at 16 readers (not judged bars). Still unexplained; the agents' own feed consumer
   never shows it.

**DX-B9 was stopped after four hours without a commit** (it built evidence-binding apparatus around one measurement). Its
finding stands: with alternating arms the second gateway fix is within 5 to 10% of the first, so the earlier twofold "regression"
was the host. Its uncommitted gateway fix and its drafts for strict commit order are saved as d2568d78 on `exp/DX-B9-walls`.
New rule in every brief: evidence is the raw command output, no manifests or audits, reports of at most 60 lines.

**Verdict runs need the agents idle too:** their builds and test gates are what made the host busy during both paired runs.

## 2026-11-10 21:55 UTC: Sam ended the native mode and asked for larger jumps

DX-N1 stopped, branch `exp/DX-N1-native` unmerged, its tools and runs removed, nothing of it running.

Orchestrator's measurement on `tx2-dxh4-q1-zero` (10,000 subjects, zero readers, `driver/ns-writes.jsonl`): transact call to
return p50 16.7 ms overall; **22 to 35 ms at the steady rate of about 2 commits/s, 11 to 20 ms inside the 55/s bursts**, against
3 ms back-to-back, so the p50 bar of 10 ms is being decided by per-hop wake cost on this VM, not by commit work. **Each burst has
one stall**: 20:53:46.7 to 49.3 UTC (31 commits, worst 1,253 ms) and 21:03:41.6 to 45.9 UTC (62 commits, worst 1,751 ms); no index
job was requested, no Postgres checkpoint logged. Queued A/B `vm-wake/helper-ab3.sh`: an idle-priority loop **inside** the
measured container (same cgroup), which is the one keep-awake variant not yet tried.

The jumps now in flight:

1. **P5: activation from a stored preview** (DX-H8). Preview evaluates the release for every subject in the background at a
   pinned basis; activation reads the change feed since then, re-evaluates only affected subjects, takes the rest from the
   memo, and publishes everything in large commits. Every subject is still compared with the full sweep (at 1,000) and with the
   oracle. Without a preview, activation is the full sweep (223 subjects/s today).
2. **Load generator at 10,000 subjects** (DX-H7): 1.9 ms of driver CPU per pull down to 0.4 ms.
3. **Strict per-client commit order** (DX-B10), for seeding and pipelined publication.
4. **Measurement** (DX-M1): the burst stall and the per-hop split of a steady-rate commit.

## 2026-11-10 22:30 UTC: P5 design settled with Sam (local copy), publication scope narrowed

Sam's concern: several people edit the ontology at once with different previews, so stored previews of outputs go stale
whenever anyone's release goes live. Agreed direction (verbatim in `lab/research/SAM-decisions-2026-11-09.md`):

1. **The runtime keeps a compact local copy of every entity's current rows, bootstrapped once and kept current by the change
   feed; a release is evaluated for every subject from that copy, with no fetch.** Kernel cost is 0.33 CPU s per 1,000 subjects;
   the 7.8 s of gateway time and 1.6 CPU s of decode per 1,000 are what the copy removes. Several candidate releases run over
   the same copy in one pass. Agent **DX-R1** builds it (`packages/datomic/src/replica/`, `lab/bench/lib/w0-replica*.ts`).
2. **Publication is of changed outputs in ordinary commits**, not 100,000 results at once (Sam: "The publishes won't be huge
   chunks"). A release that changes most subjects may publish more slowly.
3. DX-H8's stored-preview activation (committed dad67907 on its branch) stays as a comparison point; its publication profile,
   batch-size measurements and the sealed 10,000-subject seed are used by both designs.

Also: an idle-priority loop **inside** the measured container removes the wake penalty at about 8% dense cost on the probe
(`vm-wake/helper-ab3.sh`: dense 3,085 against 2,830 to 2,870 units; sleep overshoot 5.1 ms against 0.08 ms). The A/B on the
real writer trace at 10,000 subjects is running (`quiet/wake-ab.sh w1`).

## DX-M1 measurement (merged 2026-11-10 23:11 UTC, report `lab/experiments/EXP-DX1/m1/REPORT.md`): where commit time and tails come from at 10,000 subjects

1. **A burst stall (772 ms) is a G1 mixed-collection pause of 381 ms in the write gateway** (one CPU, 2 GiB heap), followed by a
   409 and a retry. Transactor pause in the same second 44 ms. No index job, no Postgres slow statement, checkpoint, lock wait or
   throttling, no swap I/O in the VM. The original 1 to 2 s stalls were not reproduced; pre-indexing does not remove the tail.
2. **At 10,000 subjects every commit makes two HTTP calls** (`/begin` plus the commit) because the writer's 32 MiB row cache no
   longer holds the predecessor stamps (9,185 missing). Dense commit median is therefore 6.4 ms, not 3.1.
3. **One commit per second 24.3 ms against 6.4 ms back-to-back; every phase is 3 to 4 times slower when sparse** (gateway native
   future 10.2 against 3.2 ms, staging with `/begin` 6.8 against 1.2, socket to headers 13.3 against 4.3). The Postgres INSERT is
   0.19 ms. This is the wake penalty spread over the hops.
4. `quiet/wake-ab.sh w1` baseline at the same rung (zero readers): steady p50 31.2 ms, burst p50 11.4 and p99 94 ms. In-container
   keep-awake loops made it far worse (burst p50 124 ms); keep-awake is closed (`vm-wake/RESULT.md`).

Follow-ups: DX-M1 resumed for collector arms on the write gateway and transactor (G1 as is, generational ZGC, small-footprint
G1, write gateway on its own CPU), alternating. A predecessor-stamp cache for the writer (one HTTP call per commit at any scope
size) goes to whoever next owns `RowCache.ts` (DX-H7 is in it now).

## DX-H7 first result (2026-11-11 00:05 UTC, branch `exp/DX-H7-driver-10k` head 8bf28097, **not merged: its gates did not finish**)

Report `h7/REPORT.md` on that branch. 10,000 subjects, 3 reader threads, steady writes only (no bursts), one run each:

| Arm | Readers | Verified pulls/s | Read p99 ms | Reader CPU ms per pull | Requests per pull |
| --- | --- | --- | --- | --- | --- |
| before | 64 / 256 | 3,709 / 3,848 | 53.6 / 188.7 | 0.77 / 0.76 | 1.35 / 1.32 |
| after | 64 / 256 | 4,899 / 4,834 | 40.1 / 138.6 | 0.56 / 0.57 | 1.004 / 1.006 |

Changes: interned reach keys, subject-to-thread affinity for the uniform part, 640 MiB entity cache per reader (294 to 297 MiB
used, zero evictions), reuse of hashes for immutable fact objects. Zero violations in 444,197 reads. Targets 0.4 ms and 6,000
pulls/s not met; reader threads still 0.92 to 0.98 busy; remaining cost is re-decoding entity bodies when current and historical
revisions alternate, traversal, Effect runtime and GC. Reader process peak 3.82 GiB. It waited 112 minutes for the lock.
4,834 pulls/s would clear P4's quota bar (4,400); read p99 at 256 readers (138.6 ms) is still bounded by the load generator.
Resumed: finish gates (commit `DX-H7 gated:`), then a writer predecessor-stamp map so commits make one HTTP call at any size.

Orchestrator's note for the next jump: once DX-R1's local copy passes its equality gates, the same copy with a short window of
recent revisions can serve current and recently pinned reads with no request at all; that takes the read path's cost out of
both the gateway and the client's decode. Not started.

## DX-B10 result (2026-11-11 00:30 UTC, branch `exp/DX-B10-order` head 489409b7, **not merged: ordering proofs not run**)

Step 1 committed and gated (37 native tests, 300 differential scenarios with 95,028 comparisons): DX-B9's gateway key fix and
sweep decoder repair. Step 2 committed: strict per-client commit order (client UUID plus sequence; gateway buffers up to 64
early arrivals per client and hands them to the transactor strictly in sequence, no timeout overtakes; a 30 s gap fails the
buffered suffix with a typed `CommitOrderGap`). Passed after step 2: build, 10 units, `reach` and `concurrent-commits` on both
layouts (6,400 pipelined commands, 1,000 conflicting races). **Not run** (over 100 minutes waiting for the lock): the 10,000-arrival
ordering tests (`commit_order_test.clj`, `strict-order.test.ts`), the full suite, the W0 seed at window 1 and 32, the fingerprint.

## DX-H8 interim (branch `exp/DX-H8-preview-activation`): publication cost per subject measured

Stored-preview activation at 1,000 subjects: 280 subjects/s (147 affected and re-evaluated, 853 reused, largest fan-out 138 from
one work location); the no-preview fallback 162 subjects/s in the same session. Publication is the bound: 333 ms per 64-subject
commit, best 1.07 ms per subject at 256 subjects per commit; the gateway rejects request bodies over 4 MiB (1,024 subjects).
With Sam's ruling that only changed outputs are published in ordinary commits, this cost applies to the changed subjects only.
Now sealing a 10,000-subject W0 seed (70-minute hold); the orchestrator stops it after that, since its remaining targets are
comparison only and the lock is needed.

**The measurement lock is the bottleneck: DX-H7 waited 112 minutes, DX-B10 over 100.** At most three agents that need the lock
from now on, and long holds only for things every design needs.

## DX-M1 collector arms (merged 2026-11-11 00:40 UTC; `m1/REPORT.md` section "Collector arms"): burst commits at 10,000 subjects, zero readers

| Write gateway | Gateway pauses: count / longest ms | Transactor longest pause ms | Commit p50 / p99 / max ms | Over 100 ms | Clock-conflict retries |
| --- | --- | --- | --- | --- | --- |
| G1 as today (run 1, run 2) | 54 / 35.0; 57 / 37.1 | 63.1; 43.7 | 9.44 / 66.2 / 206; 9.40 / 59.2 / 111 | 17; 1 | 11; 3 |
| Generational ZGC (run 1, run 2) | 28 / 0.05; 31 / 0.03 | 94.2; 55.2 | 9.66 / 70.0 / 196; 10.82 / 76.4 / 208 | 15; 17 | 8; 8 |
| Small-footprint G1 | 147 / 104.3 | 59.5 | 9.72 / 267.6 / 1,305 | 64 | 13 |

1. **Burst commit p50 is 9.4 ms with G1 (bar 10).** p99 is 59 to 66 ms (bar 50).
2. ZGC removes the gateway's pauses but slows the median 2 to 15% and does not improve p99, because **the transactor's own G1
   pauses (44 to 94 ms) and clock-conflict retries now set the tail**. The small-footprint arm is rejected.
3. The retries are `ClockConflict`: a commit's client-issued record time was not above the scope's maximum (two clients in
   the driver), so the commit function rejects it and the client replays. 3 to 13 per burst.
4. Not measured (lock): transactor with ZGC or a pause target; write gateway on its own CPU.

Leads from this: (a) a pause target or ZGC for the transactor; (b) let the commit function assign the record time when the
client's is not above the maximum, the way it already assigns positions, instead of rejecting and replaying.

## 2026-11-11 01:15 UTC: 10,000-subject W0 seed sealed; DX-H8 stopped; lock users cut to three

**Sealed seed: volume `tx2-dxh8-seed-10000-pg-data`** (5.8 GB), scope `dxh8-w0-10000-v1`, G0 PASS, 434,768 commands, 4,488,231 facts,
world fingerprint `sha256:7b4c292331396ab379423ed7faa1a095c324dcdb72afb411d0f48f93efa5624d`, serial seed 184.7 commands/s (39 minutes)
plus 4 minutes of counts; receipt `~/Claude/Projects/triplex-db-2/evidence/DX-H8/tx2-dxh8-seed-10000/driver/receipt.json`. Clone it,
never modify it.

DX-H8 stopped by the orchestrator after the seed (its 10,000-subject stored-preview run is comparison only); its containers,
clone volume and stale lock were removed by hand; report as left is 4f7a8618 on `exp/DX-H8-preview-activation` (not merged).
DX-B10 resumed for its ordering proofs and the seed-rate measurement (one resume attempt failed with "model is at capacity";
the retry is running). Lock users now: DX-R1, DX-H7, DX-B10.

Disk: 27 GiB free on the Mac at 01:12 UTC (evidence 48 GB, swap 18.7 GB, VM disk image 39 GB).

## DX-H7 merged (2026-11-11 02:08 UTC, merge 0939c037)

Reader changes gated on the lean layout: `reach` (200 scenarios, 5,120 concurrent cold pulls), `reach-repair`, `cache-budget`, and all
300 differential scenarios (95,028 comparisons). Writer predecessor cache (0f00f4af): a bounded map of exact predecessor tuples
(256 MiB budget; a unit test holds 400,000 predecessors for 100,000 subjects in about 155 MiB) survives row-cache eviction, so a
commit to a known subject stages without `/begin`; a miss falls back to `/begin`, a stale entry gets the gateway's typed conflict
and the existing retry. Lean `concurrent-commits`, `commit-observation`, `adapter`, `cache-budget` pass. **Not verified:** one
real-gateway test recheck, and the before/after measurement at 10,000 subjects (calls per commit, dense and sparse medians).
The queued paired benchmark `tx2-dxh4-q2` measures both the reader ceiling and requests per commit on this merge.

## DX-R1 result: the local copy works and is exact (merged 2026-11-11 02:18 UTC, merge 401ecf98; report `lab/experiments/EXP-DX1/r1/REPORT.md`)

| Measurement | 1,000 subjects | 10,000 subjects |
| --- | --- | --- |
| Worlds, outputs, records, published states against gateway, full sweep and oracle | all equal (also after 2,000 followed live commands) | all equal |
| Bootstrap | 6.6 s | 71.8 s |
| Packed bytes per subject (plus heap) | 46.2 KB (+35.7 KB) | 46.7 KB (+30.6 KB) |
| Evaluation pass: freeze + setup + compute (compute alone) | 1.17 s (0.44 s) | **9.27 s (4.09 s)**: 1,079 subjects/s whole pass, 2,444 compute |
| Live traffic during the pass: read p99 ratio / scheduled-writer p99 ratio | 0.73 / no samples | 1.00 / 1.03 (10 samples) |
| Three candidate releases in one pass | 1.16 times one | 1.17 times one |
| Publishing changed outputs | 149 subjects, 0.49 s | 997 subjects, 3.53 s (283 changed subjects/s) |
| Load-generator peak | 1.85 GB | 5.14 GiB |

Misses: follow lag under live load at 10,000 subjects p99 1,453 ms (each journal needs an exact-position `need` read; 17.6 ms
serial); the 300-scenario corpus gate ran 0 of 300 (first scenario is legacy layout with an explicit-position import, which the
gateway declines as `irregular`); 1,000-subject pass is 852 subjects/s because setup dominates.
Linear arithmetic for 100,000 subjects on the same four CPUs: evaluation pass 92.7 s (compute 40.9 s), bootstrap 718 s, memory
about 7.7 GB plus a 4.7 GB per-pass image. **At the 10,000-subject rung the P5 bar is met in this run (diagnostic, not a receipt).**

Next jumps, launched:
1. **DX-R2**: journals carry complete changed rows and revisions so following needs no extra read (lag p99 at most 250 ms under
   256 readers and the burst); workers read the store's own buffers (no per-pass image; 100,000 subjects in at most 6 GB);
   compact bootstrap pages; supported-scope check and the corpus gate.
2. **DX-R3**: the same copy as the read path. A short window of replaced versions lets it answer current and recently pinned
   reads with no request; older reads go to the gateway; the benchmark's readers get `--read-path replica` with the unchanged
   correctness check. Targets: at least 15,000 verified pulls/s and read p99 at most 100 ms at 256 readers, 10,000 subjects.

Note on `tx2-dxh4-q2`: the worktree was merged and rebuilt while its zero-reader arm was running, so its two arms may have
loaded different builds of the Datomic client (the merge added replica files and one export; the benchmark's read and write
paths did not change).

## DX-B10 proven and merged (2026-11-11 02:45 UTC, merge f63be9e9): strict per-client commit order

Proofs (commit 34fc25a8, no implementation change needed): `commit_order_test.clj` 8 tests including 10,000 reordered arrivals
with 64 in flight; `strict-order.test.ts` on both layouts, 10,000 real reordered commits each, every ACK position checked; full
native gateway run 45 tests / 53,975 assertions; lean base 183 passed; lean long (3,200 pipelined commands, 500 conflict races);
clock and peer (2,000 distributed commands, 5,000 peer commits, 10,000 peer read answers); all 300 differential scenarios.
One conflict in `packages/datomic/src/index.ts` (two added exports) resolved by keeping both. **Not rebuilt yet** (the q2 ladder
arm is running; rebuild after it). **Not measured:** W0 seed rate at windows 1 and 32 with the fingerprint; the orchestrator runs
`b10/seed-vm.sh` after q2.

## Second 10,000-subject pair `tx2-dxh4-q2` (2026-11-11 02:07 to 02:48 UTC): no verdict table, orchestrator's error

The host was quiet for once (other processes 76 to 116% CPU, no call). Both arms ran to the end, but the ladder's analysis
refused the matched baseline ("uses different harness source") because the orchestrator merged DX-R1 and DX-B10 into the worktree
between the two arms. No per-level table exists. What survives in `ns-report.json`: 1,445,690 pulls completed in the ladder
against 682,512 in `q1` (about 2.1 times), 1.02 to 1.03 requests per pull (was 1.24 to 1.37), 9,563 transact requests for 8,846
commits (1.08 per commit, was 1.19). **Rule from now on: verdict pairs run from a frozen checkout that nothing else touches.**

## Merged code checked, and seeding with commits in flight measured (2026-11-11 03:00 UTC, head 9ac1fafc)

1. Lean package suite on the merge of DX-H7, DX-R1 and DX-B10: 28 files, 206 tests passed, 2 skipped
   (`~/Claude/Projects/triplex-db-2/evidence/ORCH-merge/merge-base.log`).
2. W0 seed of 1,000 subjects in the VM (`b10/seed-vm.sh`, evidence `ORCH-merge/seed-windows.log`):

| In flight | Commands/s | World fingerprint |
| --- | --- | --- |
| 1 | 264.5 | `sha256:ca15387e…` (the reference) |
| 32 | 533.7 | `sha256:ca15387e…` (the reference) |

Strict ordering holds with 32 in flight. The speedup is 2.0 times, not more, because the transactor is at one full core and
the load generator's main thread is also saturated (about 2.4 ms of its CPU per command). A 100,000-subject seed (4.34 million
commands) is about 2.3 hours at this rate, if it holds with size. Group commit in the gateway (several commands of different
subjects in one Datomic transaction) would be the next lever; not started.

3. The next 10,000-subject pair (`tx2-dxh4-q3`) runs from a frozen checkout, `.claude/worktrees/verdict`, detached at this head.

## Third 10,000-subject pair `tx2-dxh4-q3` (2026-11-11 03:01 to 03:36 UTC, frozen checkout at fe0705f4, quiet host): ladder lost to a heap limit

Every phase ran (ladder to 1,024 readers, P4 phases, sweep); the driver then died in the final analysis with "JavaScript heap
out of memory" (twice the reads of earlier runs in the default V8 heap). `h4/run.sh` now sets a 6 GiB heap. No read-side table.

What survives (commit records are written as they happen):

| Arm and window | Commits | Call to return p50 / p99 ms |
| --- | --- | --- |
| Zero readers, burst (55/s) | 6,546 | **8.6 / 47.6** (7 over 100 ms, max 141) |
| Zero readers, steady (about 2/s) | 1,757 | 22.6 / 119.4 |
| Ladder, L4 and L16 windows (the burst falls here) | 1,653 and 1,736 | 12.1 / 64.1 and 14.1 / 66.1 |
| Ladder, L64 / L256 / L1024 windows (steady rate only) | 95 / 95 / 92 | 20.2 / 136.6, **24.7 / 187.8**, 23.9 / 119.3 |

Requests per commit 1.07 (9,488 for 8,836). Two readings: (1) with no readers, burst commits meet both P2 numbers (10 and 50 ms)
on a quiet host; (2) **in the real profile the 256-reader window contains only steady-rate commits**, so the P2 bar "at 256
readers" is judged on about 95 sparse commits, whose p50 is 22 to 25 ms at every reader count including one. That is the wake
penalty per hop, not reader interference.

Queued: `tx2-dxh4-q4` (same pair, 6 GiB heap, frozen checkout at ea8931d5) and `quiet/wake-ab2.sh w2` (each engine container on
its own CPU, Postgres 0, transactor 1, write gateway 2, read gateway 3, with and without in-container idle loops: with
exclusive CPUs a loop cannot take time from a neighbouring container, which is why the first in-container test failed).

## Agents running now

| Id | Task | Branch / worktree | Prompt |
| --- | --- | --- | --- |
| DX-R2 | Local copy at scale: journals with complete rows, no per-pass image, compact bootstrap, supported-scope check and corpus gate | `exp/DX-R2-replica-scale`, `.claude/worktrees/dx-r2` | `.../prompts/DX-R2.md` |
| DX-R3 | Local copy as the read path: recent-version window, `pullAt`, shared across reader threads, benchmark option `--read-path replica` | `exp/DX-R3-replica-reads`, `.claude/worktrees/dx-r3` | `.../prompts/DX-R3.md` |
| ORCH | Pair `tx2-dxh4-q4` from the frozen checkout (6 GiB driver heap); writer-trace A/B `w2` with exclusive CPUs | `.claude/worktrees/verdict` at ea8931d5; `lane/d-native` | |

After these: merge DX-B8 (it carries DX-B7) and DX-H6; paired north-star run at 2,000 and 10,000 subjects without and with
keep-awake; 100,000-subject seed and sweep; one independent review, receipts.

## 2026-11-11 04:00 UTC: quiet host overnight, VM memory, research round

**Host.** Sam (2026-11-10 night): the other project on this Mac is winding down, so memory and CPU are free overnight. Measured
with `lab/bin/host-quiet.sh`: swap used 16,568 MB at 03:37 UTC, 7,055 MB at 03:57 UTC; 60% of memory free; call apps 7% CPU.
q4 (frozen checkout `ea8931d5`) started its zero-reader arm at 03:46 UTC, so the first arm overlaps the wind-down and the
ladder arm runs on the quieter host. q4 against q3 is the test of what a quiet host changes.

**VM memory.** `lab/bin/vm-resize.sh 24` is queued (background) behind q4's `host-after` file: it takes the measurement lock,
refuses if any container is running, restarts triplex2 at 8 CPU / 24 GiB / 100 GiB, restores the docker context, remounts with
`discard`. Reason: the 100,000-subject steps need about 21 to 27 GiB in the VM (driver heap 6, local copy 6 to 12, transactor 3,
two peers 4, Postgres 2). Log `~/Claude/Projects/triplex-db-2/evidence/ORCH-vm-resize/`.

**Research round (four Sonnet agents, high effort; Sam asked for it).** Files in
`~/Claude/Projects/triplex-db-2/research/2026-11-11/`: R1 local replicas, R2 incremental evaluation (landed), R3 Datomic and
XTDB tuning, R4 test bed and commit path. R2's main finding for P5: memoize each rule per subject keyed by (rule content hash,
hashes of the values it read), share that store across candidate releases, and drop the per-pass setup (5.2 s of the 9.3 s at
10,000 subjects) by reading lazily from the local copy. A release that changes 3 of 12 rules then reruns about a quarter of the
rule work, and activation invalidates nothing. It needs per-rule pure functions, recorded reads, no ambient clock (threshold
primitives so each output carries the instant it could next change), and canonical outputs.

## 2026-11-11 04:10 UTC: research round complete (R1 to R4); DX-M2 launched; nohlt test prepared

All four files are in `~/Claude/Projects/triplex-db-2/research/2026-11-11/`. What changes the plan:

1. **Found by checking R3's warning against the live process: the transactor has never had Datomic's GC flags.**
   `bin/transactor` applies `-XX:+UseG1GC -XX:MaxGCPauseMillis=50` only when `JAVA_OPTS` is empty; `stack/up.sh` sets it, so the
   process is `java -server … -Xmx1g -Xms1g -Xms256m -Xmx3g …` (from `docker top tx2-dxh4-q4-ladder-tx`): JVM default pause goal
   200 ms and a heap that grows from 256 MB. Its pauses (44 to 94 ms) set the burst p99. DX-M1's collector arms changed only the
   write gateway. Every lane D commit number so far carries this.
2. **R4: record time as `max(submitted, previous + step)` inside the transaction** removes the `ClockConflict` replay. **R3:
   transaction hints** (`d/with :return-hints true`, pass `:hints`) move the commit function's reads out of the serialized
   pipeline; the transactor already batches queued transactions into one storage write, so pipelining is the group commit; do
   not merge logical commits into one Datomic transaction (functions see only the database before the transaction).
3. **R4: guest kernel parameter `nohlt`** (arm64 selects `GENERIC_IDLE_POLL_SETUP`; our guest kernel 6.8 has it and boots through
   GRUB) makes an idle vCPU busy-wait instead of blocking on the host, the suspected cause of the 8 to 10 ms wake penalty. Cost:
   every vCPU uses a host core at 100% while the VM is up. `lab/bin/vm-nohlt.sh on|off [cpus]` switches it under the lock and
   runs `vm-wake/run.sh` before and after. To run after q4, the 24 GiB restart and w2. Also from R4: a SCHED_IDLE loop in its own
   normal-weight cgroup competes at that group's full weight (explains "steals about half"); `cpu.idle=1` on that cgroup is the fix
   if loops are kept. **Durability caveat for the scorecard:** Lima's vz driver attaches disks with fsync mode "fsync", which
   Apple documents as best-effort, so a durable acknowledgement on this test bed is not power-loss durable and the 3 ms commit
   cost will not transfer to real hardware unchanged.
4. **R1 (local copy):** restart from a saved checkpoint plus the feed tail instead of a full bootstrap; mark one subject stale
   and refetch it instead of rebuilding everything; one incremental hash per subject bucket compared with a gateway-side hash
   at the same position as the continuous check; cold subjects compressed. Candidates for the brief after DX-R2 merges.
5. **R2 (evaluation):** per-rule memo keyed by rule hash and read values, shared across candidates (previous entry).
6. **XTDB (R3 section E):** commits go through a Kafka source log; vendor publishes 27.8k single-put transactions/s pipelined
   and no latency floor; the agent's inference is that it will not beat 3 ms p50 commits. Lane X stays parked behind lane D.

**DX-M2 launched 04:05 UTC** (`exp/DX-M2-commit-tail`, brief `~/Claude/Projects/triplex-db-2/agents/prompts/DX-M2.md`):
transactor and write-gateway JVM arms, record time assigned in the transaction, transaction hints. Targets: burst commit p50
at most 8 ms and p99 at most 30 ms, no transactor pause over 25 ms, zero clock replays, at least 700 commands/s at window 32.

## 2026-11-11 04:25 UTC: q4 result (zero-reader arm only); ladder lost to the driver container's memory limit

**Zero-reader arm, q3 against q4 (same code, `ea8931d5`; q4 on the quieter host: swap 16.6 GB at start, 4.0 GB at the end).**

| Run | Steady (2/s) commit p50 / p90 / p99 ms | Burst (55/s) commit p50 / p90 / p99 / max ms | Burst commits over 100 ms |
| --- | --- | --- | --- |
| q3 | 22.6 / 39.0 / 119.4 (n 1,757) | 8.6 / 17.0 / 47.6 / 141.2 (n 6,546) | 7 |
| q4 | 18.5 / 41.5 / 124.2 (n 1,758) | 8.7 / 17.7 / 49.0 / 132.2 (n 6,546) | 6 |

Reading: a quieter host did not move commit latency. The burst tail and the sparse-commit cost belong to the stack (transactor
pauses without Datomic's GC flags, clock replays, the VM's wake penalty), which is what DX-M2 and the `nohlt` test attack.

**Ladder arm lost a third time.** VM kernel log, 04:14:41 UTC: `Memory cgroup out of memory: Killed process (node) anon-rss
8117208kB` in the driver container (limit 8 GiB, JavaScript heap limit 6 GiB) at the start of `presweep`, after every ladder
level had finished. The driver keeps all samples in memory and analyses at the end, so a late death loses the whole ladder; the
report has no memory readings. q1 (699,920 reads) fitted; since DX-H7 the same ladder does about twice the reads.
Actions: (1) `h4/run.sh` takes `DX_DRIVER_MEMORY`; **q5** queued behind the 24 GiB restart with a 12 GiB container and 8 GiB heap,
from the frozen checkout at `1eea10e2` (scripts only differ from `ea8931d5`). (2) Owed harness fix, for DX-R3's resume or a small
brief once DX-R3 exits (it owns `driver.ts`): write each phase's summary to disk when the phase ends, bound sample memory,
record driver memory per phase. With local reads at 15,000/s the sample volume triples again.

## 2026-11-11 04:50 UTC: w2 (one CPU per engine container, with and without in-container idle loops)

Zero-reader writer trace, 10,000 subjects, 200 s, Postgres on CPU 0, transactor 1, write gateway 2, read gateway 3.

| Arm | Steady commit p50 / p90 / p99 ms | Burst commit p50 / p90 / p99 / max ms | Burst over 100 ms |
| --- | --- | --- | --- |
| No loops | 24.8 / 41.2 / 106.9 (n 1,382) | 7.1 / 13.3 / 42.0 / 336.0 (n 3,262) | 17 |
| Idle loop in each container | 17.3 / 31.5 / 90.9 (n 1,395) | 10.4 / 18.5 / 42.4 / 313.1 (n 3,262) | 9 |

Reading: loops inside the containers take 30% off the sparse-commit median and add 46% to the burst median, so they are not a
fix. The arms ran 50 minutes apart (the lock went to others in between) and the host was quieter for the second, so the steady
gain is an upper bound. In-container loops are closed as an option; `nohlt` (whole-guest idle polling) is the remaining test.

## 2026-11-11 05:10 UTC: VM at 24 GiB; q5 running; nohlt queued behind q5

VM restarted 05:08 UTC under the lock: 8 CPU, 24 GiB (docker sees 25,146,339,328 bytes), 157 volumes and 16 images intact, data
disk remounted with `discard`. Log `~/Claude/Projects/triplex-db-2/evidence/ORCH-vm-resize/resize-20261111T035920Z-24g.log`.
The docker context was `default` before and after: the other project stopped Sam's default colima profile during its wind-down
(`colima list` shows it Stopped), which is what moved the context off `colima`; nothing here touched that profile.

q5 (frozen checkout `1eea10e2`, driver container 12 GiB, heap 8 GiB) started 05:09 UTC. `lab/bin/vm-nohlt.sh on 8` waits for q5's
`host-after` file. Agents holding the lock after that restart measure under `nohlt`; compare their absolute numbers with care.

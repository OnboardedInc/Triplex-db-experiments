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

## Agents running now

| Id | Task | Branch / worktree | Prompt |
| --- | --- | --- | --- |
| DX-B8 (resumed 13:26 UTC) | Owns the whole package now: merge DX-B7, finish the head fix, all gates on both layouts, commit `DX-B8 fix:`; measure commits and pulls on a 50,000-commit scope, frozen and moving basis, without and with keep-awake; if still short, a revision map fed by the report queue so a current pull makes no Datomic call | `exp/DX-B8-head-lookup`, `.claude/worktrees/dx-b8` | `.../prompts/DX-B8-resume1.md` |
| DX-H6 | P5 sweep stage budgets, pipeline, oracle outside the timed path, ordered seeding with commits in flight, 10,000-subject seed and sweep (four steps committed, measuring) | `exp/DX-H6-sweep-cost`, `.claude/worktrees/dx-h6` | `.../prompts/DX-H6.md` |

After these: merge DX-B8 (it carries DX-B7) and DX-H6; paired north-star run at 2,000 and 10,000 subjects without and with
keep-awake; 100,000-subject seed and sweep; one independent review, receipts.

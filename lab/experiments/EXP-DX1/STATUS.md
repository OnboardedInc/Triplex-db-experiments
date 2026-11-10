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

## Agents running now

| Id | Task | Branch / worktree | Prompt |
| --- | --- | --- | --- |
| DX-B5 | Lean layout (one row-text datom per row as system of record), commit-order rule for record times, rows from reach, differential test against legacy | `exp/DX-B5-lean-layout`, `.claude/worktrees/dx-b5` | `.../prompts/DX-B5.md` |
| DX-H3 | Driver inside the VM, cgroup CPU sampling, publication observer fix, first complete NS report on lane D | `exp/DX-H3-in-vm-harness`, `.claude/worktrees/dx-h3` | `.../prompts/DX-H3.md` |

After these: merge; run NS at 10k on a lean scope in the VM mode; seed W0 and run P5 with the lean page reader; then the asynchronous
reifier for native Datalog on lean scopes; then one independent review and receipts.

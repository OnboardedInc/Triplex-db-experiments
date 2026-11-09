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

## Agents running now

| Id | Task | Branch / worktree | Prompt |
| --- | --- | --- | --- |
| DX-B2 | Gateway loop at engine cost; entity revisions, references and a client cache; `reach-many`; no `d/sync` on writes; index-job hook; warm numbers on Postgres with split gateways | `exp/DX-B2-speed`, `.claude/worktrees/dx-b2` | `.../prompts/DX-B2.md` |
| DX-H2 | P5 measurable on lane D: W0 activation with evaluation, publication, oracle gates, live traffic, time breakdown | `exp/DX-H2-p5-harness`, `.claude/worktrees/dx-h2` | `.../prompts/DX-H2.md` |

After B2 and H2: merge both; if H2 needs rows with recorded position from the reach path, add it; first full NS run on lane D at the
10k rung in a quiet VM (stop every other agent first); then P5 at 100k.

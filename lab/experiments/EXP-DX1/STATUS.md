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

## 3. Recommendation and the first experiment

### 3.1 Which path

**Take (b).** It is the only path whose estimate meets the latency and flatness bars, it reuses code that has passed review default-off,
and Q68a, Q68d and Q50a already rule it the design. Its one open risk, per-core throughput, is cheap to measure without an engine. Drop
(a) and (c) as P4 paths; build `cur` later only if GS.18's list queries need it.

**Two items for the orchestrator** (proposed):

1. **A correction to the record.** QG1's "about 270 ms per pull" is a whole-pull number: about 35 ms per request times 7 requests, with
   the 40 ms keep-alive stall in about a third of them. Every QLever latency measured from the host through `QleverClient` carries that
   stall; R17 0.2 item 1 was never applied to the client.
2. **A ruling in the shape of Q92d.** At the 10k and 100k rungs lane Q measures P4 on the broker's host store (route = host, Q68d), with
   the receipt naming the replica's state (built generation, live, or detached) and Q91a's base and delta counts when attached. The
   engine-attached run uses the largest rung the slot holds (expected 1k to 4k subjects: QG1's 10M-triple cap held 3,950 A0 subjects).
   This states an engine limit plainly (SCOPE 3.2) and rules out no engine for any layer.

### 3.2 Brief: EXP-QH1, lane Q current pulls from the broker's H1

**North star:** P4 (weighted p50 at most 5 ms, p99 at most 25 ms, largest bucket p99 at most 50 ms, at least 1,100 pulls/s per core with
broker and kernel CPU in the denominator per Q68d, depth-10/depth-1 p99 and bytes at most 1.1x); P2 as a guard (commit p50 at most
10 ms, p99 at most 50 ms). Scope and targets: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md 1.1 P4, 2.1, 4.1. Design: R24 sections 4
and 6, R31 sections 3 and 5, this report. Rulings: Q16, Q27, Q68a-g, Q89b, Q89c, Q89f, Q89i, Q91a, Q92h, Q94f.

**Commander's intent.** Serve lane Q's subject pulls at the current basis from the SQLite H1 store that SQL01 already writes in the commit
transaction, prove it answers exactly what every other route answers, and measure the five P4 numbers. Done means a P4 receipt per rung
with zero mismatches against O-REPLAY on at least 100,000 sampled pulls, the RQ01 gate passing with H1 registered, and the per-core
number known.

**Base.** A worktree from `exp/SQL01-broker-sqlite` (head `4863a8e0`) merged with main, or from main if the SQL01/P2Q integration round
merges first. Default-off option; A0 and the existing broker routes unchanged.

**Product changes (packages/qlever/src/broker only, behind `currentRoute: "h1"`, default off).**

1. `BrokerStorageAdapter.queryRows`: when the read is not history, names no `recordedAt`, has an entity selection and `h <= b <=` the
   durable marker, read `broker.pullAt(b, selection)` first and report route `h1` in `onRead`; otherwise keep today's routes. Inside a
   transaction keep today's behavior.
2. `sqlite-worker.ts` `pull`: throw a typed refusal instead of returning `{ eligible: false, rows: [] }` (Q89c, Q92h, D-Q2); return the
   rows as one JSON text built from `.pluck()` row strings, parsed once on the main thread.
3. `getByEntities` in the broker adapter: bucket rows by `entity_id` in one pass instead of one `rows.filter` per id.
4. Counters per pull: hops, rows read from `live_rows` and from `retired_rows`, row bytes examined (EXP-P4's logical bytes measure).

**Harness changes (lab only).**

1. Composition `broker-h1` in `lab/bench/lib/composition.ts`: the public Triples service on the broker path with `currentRoute: "h1"`,
   `assignments.current = host`, route recorded per read.
2. CPU accounting: main-thread CPU from `process.cpuUsage()` plus each reader worker's thread CPU (reported by the worker itself), so
   pulls per host CPU second counts thread CPU, not wall time.
3. Reuse EXP-P4's driver (`exp/P4-current-path`, `lab/experiments/EXP-P4-current-path/p4.ts`): the weighted mix, per-bucket and per-hop
   tables, matched 1,000-subject history growth to depth 3 and 10, the 20% expired stage, O-REPLAY gating before timing.
4. RQ01: implement the SQL01 H1 route driver that `pendingRouteAdapters` documents, with forcing (H1 on, replica on, outage), purge and
   catch-up events, and typed-refusal declarations.

**Gates, in order (a failed gate stops the round).**

| # | Gate | Pass |
| --- | --- | --- |
| G1 | Package suite (SQL01's 73 offline and 23 semantic tests), typecheck, build | all pass on the merged base and on the candidate |
| G2 | RQ01 with the H1 driver: L, V, P, T, TP, H, future P; purge and catch-up; Q89i repeats | zero differences; T, TP and `b < h` refuse typed; future P waits, then refuses |
| G3 | Offline mutants (EXP-P4 pattern): H1 drops retractions; H1 serves after a purge past b | both rejected by O-REPLAY, both exit nonzero, no timing emitted for the rejected stage |
| G4 | O-REPLAY on at least 100,000 sampled pulls per rung at the 80/15/5 basis mix, route recorded per read | zero mismatches; no H1 answer for an ineligible basis |
| G5 | Per-core screen at 10k, replica detached (outage mode, Q31e), single client, then closed loop up to 4 clients | at least 1,100 pulls per host CPU second on the weighted mix; if it misses, add one worker op that runs the whole BFS in one read transaction (arm H1w) and repeat G4 and G5 for it |
| G6 | P4 numbers at 10k and 100k, replica detached, fixed writer trace (TARGETS 2.1) through the broker | the five P4 bars, per bucket and per hop class, screening profile (Q16) |
| G7 | Writer guard: matched 10-fact commits with the H1 table writes on and off (test-only switch), same trace | commit p50 delta at most 0.5 ms and p99 within 1.1x (R24 prediction 7); bytes per fact recorded |
| G8 | Engine-attached run on one exclusive QLever slot (slot plan item 2) | the G6 bars hold with live publication; the receipt carries Q91a base and delta counts and the fallback share |

**Predictions (each can fail).**

| # | Prediction | Falsified if |
| --- | --- | --- |
| 1 | H1 weighted p50 1 to 2 ms, p99 8 to 20 ms at 10k and 100k; largest bucket p99 15 to 35 ms | weighted p50 above 5 ms or p99 above 25 ms |
| 2 | Before product changes 2 and 3, 600 to 850 pulls per host CPU second; after them, 1,250 to 2,500 | after the changes, under 1,100 |
| 3 | Rows and bytes examined at depth 10 within 1.02x of depth 1 at the current basis | above 1.05x |
| 4 | Zero mismatches in G4; every T and TP pull routes to `recent_rows` | any mismatch, or any H1 answer for a basis naming `recordedAt` |
| 5 | Fallback share at the 80/15/5 mix under 2% with a one-hour horizon (R24 prediction 8) | above 5% |
| 6 | With QLever attached, H1 p99 rises at most 1.2x over the detached run, because publication shares host CPU | above 1.5x |

**Slot plan (one 3.5 GiB exclusive QLever slot at a time; no other engine needed).**

1. **G1 to G7 need no engine slot.** The broker runs with its replica unreachable, which SQL01 supports (commits continue, Q31e), so the
   receipt names the replica's state as "detached". Host only, under `lab/bin/heavy.mjs`. Disk at about 800 B per fact: about 0.3 GB at
   10k subjects and about 3 GB at 100k (3.85M facts) [D from SQL01], against 14 GiB free on the host today and the 5 GiB floor; delete the
   100k database after its receipt is written.
2. **G8 takes `qlever-s1` once, exclusive, 3.5 GiB and 2 CPUs,** through `lab/bin/engine.mjs` with QG1's `--qlever-memory 1000M` and a
   built base (Q91a). Seed through the broker into the live replica at the largest rung that keeps the delta bounded (about 1k subjects,
   about 2.5M A0 triples; `cmd=rebuild-index` at 750k delta during the seed, per R8 and QG1 phase 0), then run G6's mix with the writer
   trace publishing. On the same base, run QG1's A0 pull sample twice, once with today's client and once with a connection per request,
   recording QLever's `time` per request, to confirm the section 1.3 decomposition. Expected slot time about 60 to 90 minutes including
   seed and rebuilds [E]. Queue it in the scale window after the slot runs already queued in lab/STATE.md.
3. Never touch `/Users/sam/projects/triplex-db`, ports 15442 and 17019, or the shared residents; Docker only through `engine.mjs` on the
   triplex2 socket.

**Out of scope for this round.** The `cur` graph, bundles, a valid-time horizon policy beyond measuring the 20% expired stage, T-shaped
H1 reads (wait for RT01 and Q90a), erasure of H1 rows (ER01-Q), PAIR-0 acceptance runs (a later round reruns G6 under PAIR-0 before any
bar closes), and the 256-reader P1 ladder.

**Roles (PROTOCOL 1).** Codex builder at medium in its own worktree; Codex reviewer at high on a separate worktree, briefed to check that
each documented check rejects the inputs it should (PROTOCOL 6 wording); the orchestrator merges.


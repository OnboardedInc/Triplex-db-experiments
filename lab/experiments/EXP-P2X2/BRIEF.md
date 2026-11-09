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


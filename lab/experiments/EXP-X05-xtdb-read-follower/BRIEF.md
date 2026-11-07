# EXP-X05 XTDB read-only follower: take readers off the writer's CPU (R19 E1, E5, E4)

**North star:** P1, the top priority: many concurrent pinned reads that never block writers. R16 showed reads never lock writers on
XTDB but starve them of CPU on one node (commit service time about 17 ms to 90-112 ms at 4+ readers). Measured as TARGETS 1.1 P1:
writer commit p50 and p99 with readers on the follower against the zero-reader run on the same trace segment, read goodput and p99,
zero correctness violations at the driver-recorded basis.
**Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md v2 (1.1, 4.1). Evidence: lab/research/R19-xtdb-read-scaling-commit-floor-tenancy.md
(sections 0.1, 1, 2, 5), lab/research/R16-xtdb-northstar-fit.md section 1. Rulings: Q31c-e (coordinates, eligibility, routed RYOW).

## Commander's intent
Prove or kill the cheapest P1 topology on the image we already pin: a second XTDB container on the same named volume with
`readOnlyDatabases: true`, following the writer through the replica log, serving all reads. When this lands we know whether readers on a
follower leave the writer's commit latency within 1.25x of its zero-reader run, what follower lag costs pinned reads, and whether the
half-written-record hazard is real. If it works, the all-XTDB composition gets a current/history read layer on a follower; if it fails,
we know whether the Kafka topology (R19 E8) is worth its memory.

## Point of view
1. **Harness first, and make it safe.** Add follower support to `lab/bin/engine.mjs`: a follower container bound to an existing slot's
   volume, admitted against the pool like any reservation (R19 E9 predicts at most 1.6 GiB at `-Xmx768m`), and CPU pinning
   (`--cpuset-cpus`) for both writer and follower so their CPUs do not overlap. The harness must refuse to start a second container on a
   volume unless its config has `readOnlyDatabases: true` (R19: no file locks, a second writer corrupts the log silently). Receipts bind
   both containers (TARGETS 4.1 item 2).
2. **Every follower read sends both tokens:** `BEGIN READ ONLY WITH (AWAIT_TOKEN = ..., SNAPSHOT_TOKEN = ..., CLOCK_TIME = ...)`; a
   snapshot token alone raises `0B000` on a lagging follower, and a default basis silently reads whatever the follower has (R19 1.4).
3. **Connections:** raise `server.numThreads` to about 300 on the follower for the 256-reader level and cap in-flight queries in the
   client; no pgbouncer (R19 2.3: SET AWAIT_TOKEN is session state a pooler cannot track).
4. **Measure the three things that decide it** (R19 E1, E5, E4): writer commit latency at 0, 4, 16, 64 and 256 readers on the follower
   versus 0 readers; ack-to-visible lag on the follower; correctness at the requested basis, including reads issued within 5 ms of an
   ACK; plus a burst of 20 to 60 KB commits to look for "log file corrupted" or a dead follower.
5. **Use EXP-N01's driver** (`exp/N01-northstar-bench`) if its P1 ladder is ready; otherwise a minimal driver that follows TARGETS 1.1 P1
   items 1, 2, 4 and 5, with its source hash in the receipt.

## Predictions (R19, falsifiable)
- Writer commit p50 and p99 at 16 follower readers within 1.25x of the zero-reader run (single node was 4x to 5x).
- Follower ack-to-visible lag p50 ≤ 10 ms, p99 ≤ 60 ms; zero "log file corrupted" under 20 to 60 KB commits.
- With both tokens, zero stale reads; snapshot-only reads raise `0B000` on 1% to 15% of reads issued within 5 ms of the ACK and never
  return a stale answer.
- Follower RSS at most 1.6 GiB; per-connection RSS 0.3 to 1.5 MiB at numThreads 300.

## Boundaries
- Worktree branch `exp/X05-xtdb-read-follower`. Files: `lab/bin/engine.mjs` and `lab/bin/lib.mjs` (follower support, cpuset, guard),
  `lab/config/` (a follower config next to the xtdb config), a driver or adapter under `lab/experiments/EXP-X05-xtdb-read-follower/`, and
  a small read-routing option in `packages/xtdb` only if needed (stay out of `XtdbStorageAdapter.ts`, which EXP-P2X owns).
- Engines: the pool is full right now. Build and unit-test the harness change first; then `node lab/bin/engine.mjs up --lane xtdb --slot
  s2` plus the follower when the pool admits them (poll `engine.mjs status` every few minutes; do not take another agent's slot). Release
  both when done. Never ports 15442/17019; Docker only via DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock through the harness.
- The host is loaded by other agents: judge the relative comparison on the same slot and window; report absolute bars without judging them.

## Report
Commit hash; harness change summary; the tables for writer latency per reader level (follower versus single node), lag, correctness,
large-commit burst; prediction verdicts; receipts; whether to pursue Kafka (E8). The orchestrator saves it as REPORT.md.

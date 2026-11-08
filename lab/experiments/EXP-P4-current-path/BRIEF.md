# EXP-P4 a fast path to current values, kept separate from history (P4; also P1 and P2 through the read path)

**North star:** P4: single-client pull p50 at most 5 ms and p99 at most 25 ms on the weighted mix, at least 1,100 pulls/s per engine core, and
p99 and bytes read at history depth 10 at most 1.1x depth 1 (TARGETS 1 and 1.1 P4). **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md
1.1 P4, 2.1, 4.1; lab/research/R24-current-path-and-sweep.md (the design; section 6 is this experiment's plan, complete); rulings Q68a-g (pending),
Q58a, Q60 (PAIR-0, provisional) in lab/acceptance/.

## Commander's intent
Find the cheapest structure that makes current reads fast and flat in history depth on both lanes, without ever answering a basis it cannot
reconstruct. Done means: per arm and bucket, exact answers on at least 100,000 sampled pulls checked against O-REPLAY, latency and bytes read at
depth 1, 3 and 10, and a recommendation per lane.

## Order (R24 section 6, adjusted for running work)
1. **Read-path arms first:** A0 baselines on both lanes; X1 (XTDB current reads with default temporal bounds instead of `FOR ALL VALID_TIME`,
   R24 section 1) in a fresh and an aged regime; H1 as an in-process current table behind the composition seam (no SQLite yet). These touch
   read paths only.
2. **Write-path arms after EXP-J01 lands** (it is changing the same write paths now; poll main for its merge): X2 (`tx_current` entity documents
   written in the same statement list) and Q1 (`cur` graph in the same guarded update). Behind default-off options.
3. Exactness gate before any timing, for every arm: eligibility tests for B below H, B above W, a 60 s consumer cut (GS.04b) and a regression of W;
   the receipt records the route per read; no read may report the current structure for an ineligible B.
4. Timing per R24 section 6 steps 4-6 (single-client per bucket, closed-loop to the CPU quota, depth 3 and 10 in place, the 100k rung for the
   best arm per lane, 20% expired facts). Judge only relatively (same slot, same window) until EXP-M01's PAIR gate exists; then rerun the
   decisive comparisons under PAIR-0.

## Predictions
R24 section 6 predictions 1-9 are this experiment's predictions; report each as MET, FALSIFIED or NOT RUN.

## Boundaries
- Worktree branch `exp/P4-current-path`. Files: packages/xtdb and packages/qlever read paths and options, a current-table module behind the
  composition seam in lab/bench/lib (H1), tests, and lab/experiments/EXP-P4-current-path/**. Write-path edits only after EXP-J01 merges, behind
  options; never in packages/qlever/src/broker (owned by the EXP-P2Q author).
- Engines: one exclusive slot per lane, one lane at a time; the pool is near full, so build and test offline first and poll with
  lab/bench/wait-slot.mjs; wait for XTDB compaction before every measurement (`compactor_jobs_available == 0`). Docker only with
  DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock through lab/bin/engine.mjs. Never touch /Users/sam/projects/triplex-db or ports 15442
  and 17019. Parameterised SQL only (Q63d). Disk is tight (13 GiB free): keep raw samples compressed under /Users/sam/Claude/Projects/triplex-db-2/EXP-P4/.
- pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  Subagents: Opus only, never fork.

## Report (return as text)
Per arm: exactness results, latency and bytes-read tables per bucket and depth, write overhead where built, predictions 1-9 verdicts, the
recommendation per lane, receipts, final commit hash.

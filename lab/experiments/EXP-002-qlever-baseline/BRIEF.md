# EXP-002 QLever baseline: fresh unchanged44, native142, and the raw semantic counterexamples (lane Q)

## Commander's intent
Establish the A0 control for lane Q on our own engine, with bound, fail-closed receipts, and pin the known QLever
semantic failures as reproducible baseline FAILs (so the fixes in EXP-Q03 have something honest to beat). The inherited
homebase passes (unchanged44 on the explicit bounded-plan profile, native142 at planner100) are reference only.

## Point of view
- Run, do not redesign. Fix only harness and environment defects; record semantic failures as found; first failures are
  retained; reruns get new run ids with reasons.
- Engine configuration: start from the repo's `qlever-start.sh`, record every flag; note the planner profile the
  homebase used (`planner100` / explicit bounded plan; find it in qualification/ and wiki/problems/qlever-planner-memory.md)
  and run with it, and also record one run with the default planner so the difference is visible.
- Raw counterexamples: reproduce R5's string-order control and the flat and nested correlated NOT EXISTS controls
  (lab/research/R5-qlever-semantic-blockers.md and lab/research/R5-probe/) through the native SPARQL surface on our engine,
  as G4 baseline receipts that are expected to FAIL against their original oracles.
- Note every place where the current adapter's native recursion writes scratch graphs (packages/qlever/src/native/
  BasisRelations.ts); PLAN v1 contract C8 will remove those, so count how many tasks use them.

## Gates
G0, G1, G2 and a G4 baseline for `--lane qlever`. Triage each FAIL as harness defect, real regression versus homebase
evidence, or engine limit.

## Boundaries
Branch `exp/002-qlever-baseline` in your worktree. Harness fixes in small separate commits. No adapter semantic changes.

## Report
REPORT.md: receipts, pass/fail per gate, the planner-profile comparison, the counterexample receipts, the scratch-write
inventory, timings and resource peaks.

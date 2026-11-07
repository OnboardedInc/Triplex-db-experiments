# EXP-001 XTDB baseline: fresh unchanged44 and native142 with XTQL and SQL tallies (lane X)

## Commander's intent
Establish the A0 control for lane X on our own engine: what the inherited XTDB adapter and native query library
actually do in this checkout, with bound, fail-closed receipts. Every later lane-X experiment is compared against
this. The inherited homebase passes (unchanged44, native142 v7) are reference only; this run either reproduces
them or records exactly where and why it does not.

## Point of view
- Run, do not redesign. Fix only harness and environment defects (ports, env vars, missing builds, homebase paths);
  record every semantic failure as found, with first failures retained. A rerun after a fix is a new run id with a
  written reason.
- Use the EXP-000 harness (`lab/bin/engine.mjs`, `lab/bin/gate.mjs`; read lab/experiments/EXP-000-loop-harness/REPORT.md
  first). Use an exclusive slot for reopen/restart cases if the harness requires it; otherwise the `dev` slot with a
  fresh scope.
- Native142 language accounting: per task, record every read substep's language from the traces. Report three
  numbers: tasks pure XTQL, tasks pure SQL, hybrid tasks. R6 predicts 11 / 57 / 3; confirm or correct it.
- Also run the 13 entry checks in packages/xtdb/experiments/native-entry.ts (or the equivalent `verify-xtdb-entry.ts`)
  after EXP-000 made their endpoints configurable.

## Facts from the harness (EXP-000 REPORT.md)
- G2 xtdb already passed 142/142 once (`lab/runs/G2/G2-xtdb-20261107T185821Z-210ae9.json`); rerun it as a control with a recorded reason.
- The first full G1 xtdb FAILED only because a concurrent gate rebuilt shared dist output; the harness now enforces one gate per
  worktree. Rerun G1 full and confirm.
- XTQL purity is being fixed separately by EXP-X02 (XTQL path will acquire its cut in XTQL). Do not change native query code here.
- Also measure and record, as `--run-kind control`, the time and peak memory of each gate, so later experiments have A0 controls.

## Gates
`node lab/bin/gate.mjs G0 --lane xtdb`, `G1 --lane xtdb`, `G2 --lane xtdb` receipts on main's harness, plus the entry
checks. Each FAIL is triaged in the report as harness defect (fixed, rerun), real regression versus homebase evidence,
or engine limit.

## Boundaries
Branch `exp/001-xtdb-baseline` in your worktree. Harness fixes that other lanes need go in small separate commits so the
orchestrator can cherry-pick them to main. No adapter semantic changes.

## Report
REPORT.md: receipts, pass/fail per gate, the language table, triage of every failure, timings and resource peaks, and
the three most surprising findings.

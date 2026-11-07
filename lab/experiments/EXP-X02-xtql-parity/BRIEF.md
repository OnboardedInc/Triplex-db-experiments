# EXP-X02 XTQL parity: every native task pure XTQL, every task pure SQL, one fixed cut per task (lane X)

## Commander's intent
Make XTQL a complete, independently qualified native language for the XTDB lane. When this lands, all 71 logical native
tasks run as pure XTQL (every substep, including acquiring the cut) and, separately, as pure SQL; both score 142/142 on our own
engine through the real runner; every multi-call task reads at one pinned cut; and neither language silently wraps an int64 sum.
This closes the largest gap in lane X (11 of 71 XTQL tasks this morning) and lets the acceptance contract count XTQL and SQL as
two real languages instead of one language with a decorative second one.

## Point of view (the orchestrator's; follow it unless you find hard evidence against it)
- **Do not re-derive.** R12 already verified an XTQL formulation for all 23 operations against the SQL library and the packet's
  expected rows: lab/research/R12-xtql-cookbook.md, with every statement, parameter list and row set in
  /Users/sam/Claude/Projects/triplex-db-2/R12-xtql-cookbook/raw/. Port those formulations into the native task library
  (packages/qualification/src/native/xtdb-workloads.ts and the XTQL source relations in packages/xtdb/src/native/Sources.ts) and
  cite the cookbook section in a code comment on each builder.
- **Cut acquisition in the query's own language.** packages/xtdb/src/native/NativeQueries.ts reads the source cut with SQL for every
  call. Make the XTQL path read `tx_meta` in XTQL and record that step's language as `xtql`; keep SQL for the SQL path. Ruling:
  language accounting counts every substep, including basis acquisition.
- **One cut per task.** Every multi-call task captures the cut (position P) from its first call and passes it as
  `basis.recordedPosition` to every later call (R12 showed this pins the cut). Add a test where a writer commits between two calls
  and the second call must not see it, in both languages.
- **No silent int64 wrap in either language.** Engine `SUM` over BIGINT wraps (R12, R6: `LongVector.kt:30-33 @ c6c1962`). Implement
  the 32-bit-halves recombination with overflow-checked arithmetic (R12's workaround) as a shared helper per language, or an exact
  DECIMAL sum with a range check if you prove it exact on 2.2.0; the result must be the exact total, or a typed integer-overflow
  error only when the final total is outside int64 (acceptance RULINGS Q8a). The SQL path's current wrap is a defect to fix too.
- **Recursion, interim only.** For the 14 recursive tasks, the XTQL path uses R12's depth-D unrolled XTQL plus a second XTQL
  fixpoint-check call: read-only, explicit max depth, and a typed error when the fixpoint check fails (never a truncated closure).
  Leave the SQL path's existing reachability helper as is for now (it mutates scratch tables, which PLAN contract C8 will remove in
  EXP-X03 after R10 reports). Mark both with `// [EXP-X02] interim, replaced by EXP-X03`.
- **Discriminating controls with independent answers.** R12 found the packet fixtures leave mutants alive and wrote 38 hand-built
  controls (workloads 05, 08, 09, 12, 17, 18, 20). Add them as tests, but their expected rows must come from the independent oracle
  `qualification/workloads/event_oracles.py` (run it on the control events if it supports them) or from a written hand derivation,
  never from running SQL or XTQL. Keep R12's mutants as a mutation check: each must fail at least one control.
- **Rejected:** a SQL shell around XTQL rounds (`INSERT ... SELECT * FROM (XTQL ...)`), because it makes the task hybrid and
  mutates; window functions (no XTQL operator, workload 18 needs none); `union-all` (cannot be planned in 2.2.0; no operation needs
  it; it is an engine-repair candidate, not this experiment).

## Boundaries
- Worktree branch `exp/X02-xtql-parity`. Files in scope: packages/qualification/src/native/xtdb-workloads.ts (and new helper
  modules next to it), packages/xtdb/src/native/*.ts, their tests, packages/qualification workload runner wiring if language
  accounting needs it. Do not change QLever code, core entity code, or lab/bin (ask the orchestrator through your report if the
  harness needs a change).
- Engines: use the harness. Read lab/experiments/EXP-000-loop-harness/REPORT.md if it exists, otherwise lab/bin/engine.mjs and
  lab/bin/gate.mjs. Use the shared `dev` XTDB slot with your own scope for development; if `node lab/bin/engine.mjs status` shows no
  healthy dev XTDB yet, build and unit-test first and retry every few minutes.
- Comments carry the reasoning: `// [EXP-X02] Why: ... Inspired by: R12 §n; references/xtdb @ c6c1962 path:line ... Rejected: ...`.
- Commit on your branch with messages ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; do not merge or push.

## Gates
- `node lab/bin/gate.mjs G2 --lane xtdb` (or the harness's equivalent) on your branch: 142 named executions pure XTQL and 142 pure
  SQL, zero hybrid, zero skips; receipts bound and retained.
- G0 passes; the unchanged44 XTDB conformance run is unaffected (G1).
- Controls and mutation check pass; the between-calls writer test passes in both languages; the int64 sum boundary cases (R12's
  seven plus ±(2^63-1) totals) give exact totals or typed overflow in both languages.

## Report
REPORT.md (if your harness refuses that file, put it in your final message): result class, receipts, the language table, the
int64 and recursion behavior, mutation results, deviations, and what EXP-X03 must replace. Final message ≤300 words.

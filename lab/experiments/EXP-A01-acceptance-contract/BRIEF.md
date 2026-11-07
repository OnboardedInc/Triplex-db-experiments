# EXP-A01 acceptance contract (shared, both lanes)

## Commander's intent
Produce the frozen, versioned, machine-checkable definition of "done" for the xtdb-native lane (XTQL and SQL
counted separately) and the qlever-native lane. After this lands, the loop's fitness function is no longer a set
of gate labels: every obligation in the ten goals, the ORM/raw-query requirement, the 10m-entity / 100m-fact
scale target and the 256-to-1024-client load target has named cases, an independent source of expected answers,
a public entrypoint, a scale/concurrency profile, and a binary closure rule over receipts. The adversarial
reviewer's top finding was that our gates "do not establish the done condition"; this experiment fixes that.
If a goal can be closed by a skip, an "unsupported" marker, a lowered threshold, or a green run that executed
stale code, this contract has failed.

## Point of view
- **Design-agnostic.** Obligations describe observable behavior at public boundaries (Triplex `Triples`
  service, entity repository, native `select`/`selectSql`/SPARQL native queries, receipts, journal, cursors,
  CLI/packaged consumer), never internal layout. The physical design (ledger + projection, index tables,
  QLever log of record) is still under review and must be free to change without editing the contract.
- **Derive, do not invent.** Sources, in priority order: `wiki/goals.md`, `handoffs/claude-native/README.md`
  and `START-HERE.md` (invariants: exact values, temporal cuts, assertion identity, history, receipts,
  write/cancellation honesty), `wiki/status.md`, `wiki/problems/*.md`, the 71-task packet
  (`qualification/workloads/temporal-workloads.json`, oracle `qualification/workloads/event_oracles.py`), the
  unchanged44 suite (packages/testkit runtimeConformance and packages/*/test/conformance.test.ts),
  `qualification/benchmark-contract.json` (load), and our research: `lab/research/R4-codebase-harness-map.md`,
  `R6-xtdb-gap-analysis.md` (per-goal gaps), `R1`/`R2` (engine limits), `R5` (QLever counterexamples).
  Read the adversarial review `lab/reviews/plan-review-r1.codex.md`: findings 1, 2, 4, 5, 10, 12, 13, 14 each
  name obligations or closure loopholes that the contract must cover.
- **Independent expected answers.** Each case names its oracle: the existing Python `event_oracles.py` for packet
  tasks, a new independent Python event-replay oracle for entity/history/metadata cases (to be built by a later
  experiment; specify what it must compute), engine-specific golden expectations only for documented engine
  behavior. The in-memory KV runtime may be a regression participant but never the sole oracle.
- **Mutation controls are obligations too.** For the entity suite and history cases, list the deliberate faults
  (wrong half-open boundary, dropped support, leaked future retirement metadata, rounded int64, swapped entity
  type, stale projection served as current) that must make the suite fail.
- **Load is a frozen contract with a calibration step.** Draft `load-contract.json` with: open-loop arrival model,
  query mix (by task family and repository operation), writer floor (rate, per-writer visibility deadline),
  fairness floor per client, overload policy with counted rejections, metrics (attempted, admitted, rejected,
  completed, outstanding, correctness-qualified read goodput, write visibility latency, projection freshness),
  logical clients versus connections, the 10m-entity dataset requirement, maintenance overlap, recovery after
  stress. Mark numeric thresholds that need calibration as `CALIBRATE` with the calibration procedure; calibration
  runs are never acceptance.
- **Capability matrix skeleton.** Operator × value type × surface (repository query, supported native fragment,
  unrestricted raw query) × engine, with an exactness column, seeded from R1/R2/R5 findings (e.g. QLever integers
  wrap outside ±2^59, doubles keep 49 mantissa bits, ICU string order; XTDB SUM over BIGINT wraps, union-all not
  plannable, window functions fail). Cells start OPEN or KNOWN-LIMIT with evidence links.

## Deliverables (all under `lab/acceptance/`)
1. `ACCEPTANCE.md`: human-readable contract. Sections per goal (1 to 10), plus R (ORM + raw queries make sense),
   S (scale), L (load). Each obligation: id (e.g. `G4.neg.correlated-not-exists`), statement, lanes, cases,
   oracle, entrypoint, profile, closure rule, current status (OPEN unless a fresh receipt exists, which none does).
2. `obligations.json`: the same obligations in machine form (schema documented at the top of ACCEPTANCE.md) so
   `lab/bin` can compute goal status from receipts later.
3. `load-contract.json` (v0, with CALIBRATE markers and the calibration procedure).
4. `capability-matrix.md` (skeleton with evidence links).
5. A closure-rule section that states the loophole bans explicitly: skips, unsupported markers, lowered thresholds,
   stale builds, wrong endpoints, hybrid-language tasks counted for one language, calibration runs, inherited
   homebase receipts.

## Boundaries
- Write only under `lab/acceptance/` and your `lab/experiments/EXP-A01-acceptance-contract/REPORT.md`. Do not
  modify source or tests. Do not start containers. Another agent may be editing `lab/bin` and
  `packages/qualification` in parallel; do not touch them.
- Do not commit; the orchestrator commits after review.
- Plain, specific prose; no em-dashes.

## Report
`REPORT.md`: obligation counts per goal and lane, the obligations you could not ground in a source (flag them),
open questions for the orchestrator, and the cases that need a new oracle. Final message: ≤300 words.

# EXP-O06 — O-REPLAY 0.5.0

North star: correctness floor for P1 reproducible record cuts and P2 atomic,
idempotent decisions. Goals and measurements: `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, `lab/TARGETS.md`. No performance claim.

Builder: CX-O06. Branch: `exp/O06-oracle-record-time`. Starting commit:
`4efe962e3faf79b3330973891b4533dae5f83704`. The commit containing this report is
its implementation head (resolve with `git log -1 -- lab/experiments/EXP-O06/REPORT.md`).

## Independence

New semantics were derived only from main-checkout R33 section 4.3 and its
referenced definitions in 2.1 and 3.1, and pending rulings Q90a, Q90d, Q90e, Q90f.
Existing oracle, oracle tests, golden vectors, and O02 converter supplied the
legacy behavior. No packages/core, adapter source, RT01 branch or product output
was read. No subagents, engine lifecycle actions, dependency changes, main-checkout
edits, merge, push, package publication, or production pin update occurred.

## Changes

- Runtime identity 0.5.0. Every output binds all 14 runtime Python modules by
  SHA-256; missing source files no longer silently disappear from the manifest.
- New independent integer-microsecond reference: corrected binary64 stamp inverse
  and cut, safe range, and max(previous + 1, clock) stamping. Boundary tests cover
  microseconds near the upper limit and neighboring binary64 instants.
- R-CMD-3 and R-RCP-7 split staging from decision time. Default validFrom and
  constraint evaluation use receipt stagedAt or declared command clock. Decided
  committed receipts require stagedAt; declared clocks match stagedAt. Explicit
  clock-driven cases also check the reference decision stamp.
- R-RCP-9 checks strict position-order stamps per scope, one shared stamp for
  physicalGroup interior ordinals, and original instants in lost-ACK observations.
  A receipt can include replays; these allocate no new identities or positions.
  Existing duplicate-command rejection remains unchanged.
- R-CUT-6 uses the published head at readStart and the record watermark. A later
  publication whose instant is <= R prevents an answer even when explicit P hides
  it: E-BASIS-NOT-AVAILABLE, axis recordedAt. Reads without explicit P pin to the
  recorded starting head. Oracle replay models the answer/refusal, not real waiting.
- R-JNL-5 journals are valid from stagedAt. Raw change JSON v2 omits own instants;
  historical assertion recordedAt remains on later retractions. Hydrated transaction
  changes preserve R-JNL-1 fields. Erasure re-rendering uses the same raw encoder.
  R-JNL-6 stays X-NOT-MODELED for :_tx/instant.
- New obligations apply to adapter.recordTime decided (R33 S7); legacy cases
  preserve 0.4.9 behavior. adapter.clockDriven explicitly selects reference stamps.
- G9-CUT-02b replaces G9-CUT-02 in the golden corpus. Equal clocks at 500 give
  distinct transaction instants 500 and 500.001; record cuts distinguish them.
- Fourteen authored fixtures include nine failing controls covering every changed
  or new rule. Receipt errors fail the oracle verdict; stale answers fail the
  fixture runner's partial observation comparison. The latter is needed because
  receipt inputs contain no observed assertion or query rows.

## Builder gates

All commands use lab/bin/heavy.mjs. Preflight host free space was 12,873,488 KiB,
above the 5 GiB admission floor. Raw first failures were preserved; final-source
reruns use separate paths. See evidence/gates.json and evidence/final-gates.json
for commands and exit codes, and README.md for reproducing the scoped runners.

| Gate | Result |
| --- | --- |
| New fixtures | 14/14 expected verdicts, including all nine FAIL controls |
| Full final unit suite | 394 tests, two existing contract-coverage failures; all nine new tests pass |
| Self-check | PASS; preserves the two explicitly reported missing historical review fixtures |
| Original golden corpus, core | All 341 item verdicts identical to frozen 0.4.9 |
| Original golden corpus, qlever | All 341 item verdicts identical to frozen 0.4.9 |
| Migrated golden corpus | All 331 other item verdicts unchanged per lane; G9-CUT-02b 10/10 AGREE per lane |
| Whitespace | git diff --check clean |

Core golden totals: 317 AGREE, 19 AGREE-RULED, two VECTOR-BUG, three NOT-MODELED.
QLever totals: 298 AGREE, 18 AGREE-RULED, 19 DISAGREE, one CONVERTER-ERROR,
two VECTOR-BUG, three NOT-MODELED. These inherited gaps remain; a converter
exit of zero is not semantic acceptance of its disagreeing items.

The full suite's two failures name missing Datomic lane coverage and the existing
E-UNAVAILABLE-CUT row absent from the current machine contract. These contract
coverage failures are outside R33 4.3; neither the contract nor unrelated oracle
rules were altered to hide them. The isolated baseline's first unit attempt lacked
its external oracle-test inputs and failed to import/run four tests; that failed
attempt remains evidence/baseline-unit.log. The corrected baseline attempt copies
only the existing six selfcheck input files plus the machine contract and rulings;
it is evidence/baseline-unit-complete.log. The corrected baseline runs 385 tests and has the identical two failure identities
as the 394-test final suite; proof.json records the comparison. A final recheck is
evidence/baseline-unit-recheck.log. These are inherited failures, not a green
full-suite gate.

## Evidence and limitations

Committed summaries and logs live in `lab/experiments/EXP-O06/evidence/`:
`proof.json`, `fixtures-final.log`, `selfcheck-final.log`, `unit-final.log`, and
per-lane baseline/final/updated results.json. SHA256SUMS lists every Python oracle,
test and authored runner file, plus the existing reference-freezing JavaScript (31 files total). Final provenance
checks confirm all 348 final/migrated output documents bind the exact 14 runtime
source hashes; raw-inventory.json lists 1,625 retained raw files.

Complete generated cases/results and frozen 0.4.9 source are retained locally at
`lab/experiments/EXP-O06/evidence/` (baseline-source and each run's cases/runs),
excluded from Git to avoid duplicating the raw corpus. The inventory records their
bytes and hashes. The frozen source originates from the starting commit above.

This is builder regression evidence. Independent review/promotion is outstanding.
No live engine or deadline-wait behavior, product implementation, native route
agreement, or performance target was verified. Real publication and the two-second
wait must be checked by the product harness. Cases start from stamp zero; replay
complete stamp-setting history when testing a nonfresh scope. The public naming
of clockDriven and replay observations is local oracle schema and should be
reviewed before its production pin. Raw v2 own-instant omission is modeled from
4.3; no additional v2 envelope discriminator was inferred from product source.

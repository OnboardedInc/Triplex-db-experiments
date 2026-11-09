# EXP-O06 — O-REPLAY 0.5.0, fix round 2

North star: correctness floor for P1 exact record cuts and P2 atomic, idempotent
receipts. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.
Builder CX-O06; branch `exp/O06-oracle-record-time`; parent implementation
`f8cda1c0eb12df798a74e464147abc251f038ee8`. The commit containing this report
is the round-2 head. No promotion or performance claim.

## Review and fixes

Read the read-only CX-VO06 report and audit at verify/O06 `b08cbf9` in the
verify-o06 worktree. Exact reviewer cases and original actual outputs are copied
under `round2/reviewer/reproductions/`; `probes.original.py` retains the reviewer's
runner. `round2/probes.py` changes only root/output routing and removes the final
invocation of the reviewer's separate audit. New semantics still use only R33
4.3, with definitions 2.1 and 3.1. No product/core/adapter/RT01 source was read.

- **F1 fixed:** decided raw journal omission compares record instants, which
  identify the physical transaction under S3/R-RCP-9. A retraction in a later
  ordinal no longer retains its own physical transaction's recordedAt. An older
  distinct transaction retains its recordedAt; hydrated changes retain both public
  instants. Regression assertions inspect parsed and canonical raw JSON.
- **F2 fixed:** stamp validation calls the same `_receipt` normalizer as replay.
  Resolved unknown-to-committed receipts with receipt-only stagedAt now behave
  identically to committed receipts, on both engine- and clock-driven paths.
  Reference stamps are computed only for clock-driven validation. Replay instant
  mismatches still fail.
- **F3 fixed:** finite query cuts at or above 2^43 are refused with typed
  E-BASIS-NOT-AVAILABLE / axis recordedAt before stamp conversion. Receipt stamps
  retain the strict storage bound. Tests include 2^43, 2^44, 1e100 and maximum
  finite binary64, plus an out-of-range receipt control.
- **Masking coverage failure fixed:** Datomic now has the machine contract's
  signed-long oracle range and a real boundary test, including out-of-core
  rejection. This is an oracle test, not engine qualification. The erasure
  coverage loop uses subtests so all 17 missing mappings are observable together.

## Gates and evidence

All heavy commands used lab/bin/heavy.mjs, starting with 11,925,820 KiB host free
space (>5 GiB). Fresh attempt: `round2/evidence-attempt2/`. `commands.json` binds
commands, environment, start/end times, actual exits and log hashes. The directory
is created exclusively; existing attempts cannot be overwritten. `inputs.json`
binds source, test and case bytes before execution; they are checked unchanged
after execution. Attempt 1 is retained. Attempt 2 adds explicit pre/post binding
for all six historical selfcheck inputs and frozen golden/baseline expectation
files; it reruns the same gates without changing the oracle fixes. No engine
slot was acquired or claimed.

| Check | Result |
| --- | --- |
| Copied reviewer probes | 22/22 match their authored contents; three original mismatches fixed |
| Authored fixture suite | 14/14 expected verdicts, including nine failing controls |
| Full unit suite | 398 tests; 18 explicit failures: 17 missing mappings and inherited E-UNAVAILABLE-CUT mismatch |
| Selfcheck | PASS with its two previously reported absent historical review fixtures |
| Legacy golden, core | 341/341 item identities/verdicts unchanged |
| Legacy golden, QLever | 341/341 unchanged |
| Updated golden | 331 other items unchanged per lane; G9-CUT-02b 10/10 AGREE per lane |
| Output provenance | 348 golden documents bind actual case bytes and exact 14 runtime modules |
| Reproduction provenance | All 22 generated case byte strings equal the copied reviewer cases; actual output case/source hashes match |
| Runner manifest | SHA256SUMS refreshed, including the round-2 runners |
| Whitespace | git diff --check clean |

`round2/evidence-attempt2/audit.json` is the scoped regression result;
`seal.json` binds the completed attempt, logs and reviewer case/actual pairs.
`inventory.json` lists raw artifacts. Golden cases/runs remain locally in that
attempt directory, excluded from Git; summaries, logs and all probe cases/actual
outputs are committed. Legacy comparison expectations are the retained historical
0.4.9 baseline result documents, hashed explicitly in audit.json; this round does
not claim a fresh 0.4.9 execution. The independent reviewer already checked those
341 triples against an exact Git-restored baseline.

Inherited golden gaps remain: core 317 AGREE, 19 AGREE-RULED, two VECTOR-BUG,
three NOT-MODELED; QLever 298 AGREE, 18 AGREE-RULED, 19 DISAGREE, one
CONVERTER-ERROR, two VECTOR-BUG, three NOT-MODELED. Equality does not qualify
those non-green outcomes. The original report's baseline/test delta was inaccurate:
CX-VO06's exact Git baseline ran 384 tests, and the reviewed head had ten new test
methods (394 total), not nine. This round adds three review regressions and the
Datomic boundary test (398 total).

## All exposed mapping gaps

These are left **open and failing** in Coverage.test_every_section4_row_has_a_named_test.
Existing Q66/Q70 test methods exercise related behavior, but no unreviewed aliases
were added to claim that the exact machine-contract mapping is complete.

| Required case mapping | Status |
| --- | --- |
| ER-INFLIGHT-PREFIXES | OPEN: missing Erasure.test_ER_INFLIGHT_PREFIXES |
| ER-CURSOR-ERASURE-PREFIX | OPEN: missing Erasure.test_ER_CURSOR_ERASURE_PREFIX |
| CONTRACT-Q70A | OPEN: missing Erasure.test_CONTRACT_Q70A |
| CONTRACT-Q70B | OPEN: missing Erasure.test_CONTRACT_Q70B |
| CONTRACT-Q70C | OPEN: missing Erasure.test_CONTRACT_Q70C |
| CONTRACT-Q70D | OPEN: missing Erasure.test_CONTRACT_Q70D |
| CONTRACT-Q70E | OPEN: missing Erasure.test_CONTRACT_Q70E |
| CONTRACT-Q70F | OPEN: missing Erasure.test_CONTRACT_Q70F |
| CONTRACT-Q70G | OPEN: missing Erasure.test_CONTRACT_Q70G |
| CONTRACT-Q70H | OPEN: missing Erasure.test_CONTRACT_Q70H |
| CONTRACT-Q70I | OPEN: missing Erasure.test_CONTRACT_Q70I |
| CONTRACT-Q70J | OPEN: missing Erasure.test_CONTRACT_Q70J |
| CONTRACT-Q70K | OPEN: missing Erasure.test_CONTRACT_Q70K |
| CONTRACT-Q70L | OPEN: missing Erasure.test_CONTRACT_Q70L |
| CONTRACT-Q70M | OPEN: missing Erasure.test_CONTRACT_Q70M |
| CONTRACT-Q70N | OPEN: missing Erasure.test_CONTRACT_Q70N |
| CONTRACT-Q70O | OPEN: missing Erasure.test_CONTRACT_Q70O |

The other inherited failure is unchanged: the oracle still lists E-UNAVAILABLE-CUT
while the current machine error table does not. Changing that legacy error would
change existing rule behavior, so it remains a separate contract reconciliation.
The suite is not green; the audit PASS means only the enumerated fixes and
regression checks succeeded with all 18 unit failures explicitly required.

## PASS / verdict / receipt audit (rule 9a)

Every execution below is offline. Slot binding is **not applicable**: no engine,
container or reservation was used or represented. The attempt wrapper provides
freshness and source/input binding for reused oracle functions; an isolated
oracle PASS alone cannot prove a caller supplied fresh product observations.

| Place producing an assessment | Content check | Freshness and binding |
| --- | --- | --- |
| replay/run.py `_record`, `_compare`, `receipt_consistency`, `evaluate_case` (reused; stamp_consistency changed) | Derive commands independently, compare outcomes/error fields, check receipt identities, normalized staging, stamps and replay instants; final oracle verdict aggregates discrepancies | Invoked from this exclusive attempt on captured case bytes; outputs include case SHA and all 14 runtime SHA values, checked by gates/seal. No product-observation freshness claim |
| tests/test_record_time.py review regressions; test_contract_section4.py Datomic/coverage changes | Check actual raw/canonical journal fields, preserved hydrated fields, resolved receipt equivalence, typed errors, integer bounds, and each missing named mapping | Fresh unit subprocess uses source/case files pinned before/after; command/log hashes retained. Names prove mapping presence only; missing 17 remain failing |
| round2/probes.py `evaluate`, predicates, final specMismatches/exit | Reviewer's authored content predicates inspect actual report contents or expected FAIL controls; exceptions cannot satisfy positives | Exclusive probe output directory; each actual report binds actual case SHA/runtime SHA. Seal compares generated bytes with exact copied reviewer cases and all 22 actual outputs |
| fixture_runner.py `check` / `main` (reused) | Recursive authored observation comparison plus receipt verdict; all nine negative controls must fail comparison | Fresh subprocess; fixture bytes pinned before/after, runtime hash map retained, command/log SHA bound |
| selfcheck.py checks/run_all and cli.py exits (reused) | Existing HAM/CFG8/EVT/continuation content checks; missing historical reviews remain explicit | Fresh subprocess, source/input files unchanged; captured output includes source hashes, command/log hashes retained. Does not newly qualify missing historical review evidence |
| golden_runner.py Results comparisons and vector verdicts (reused) | Compare oracle answers to hand-derived golden fields; retains DISAGREE/CONVERTER-ERROR/NOT-MODELED/VECTOR-BUG classifications | New per-run case/output directories in exclusive attempt; all 348 outputs checked against actual generated case SHA and runtime SHA. Baseline expectations are explicitly historical and hash-bound |
| round2/gates.py assertions and audit status | Require all exact legacy triples, replacement items, 22 probe predicates, fixture/selfcheck verdicts and exact 18-failure disclosure | Exclusive attempt, exact commands/times, pre/post source/input equality, bound cases/results/logs; source hashes rather than exit zero determine provenance |
| round2/seal.py final status | Recheck captured source/log bytes and all 22 copied-case/actual-report bindings; inventory and refresh executable-file manifest | Refuses existing seal; consumes the named attempt only, preserves its audit SHA, command receipt SHA, inventory SHA and updated runner SHA |

The old round-1 gates.py/final_gates.py/proof.py are retained historical runners
and were not invoked to certify round 2. The copied probes.original.py and old
reviewer actual outputs are historical controls, not fresh execution results.

## Limits and handoff

Independent review is still required. The 17 mapping gaps and error-table mismatch
remain open and visible. No product changes, adapter/native-route checks, live
publication/two-second wait, engine qualification, performance test, main-checkout
edit, deployment, merge or push occurred. The full suite must not be described
as passing. Re-review F1-F3 and decide the separate mapping/contract work before
any oracle pin or promotion.

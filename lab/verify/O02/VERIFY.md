# V-O02: independent verification of O-REPLAY 0.2.0 (EXP-O02 at 03519ae) against contract 0.3.3 (saved by the orchestrator, 2026-11-08)

**Verdict: FIX-FIRST, one blocking item (F1).** The oracle's answers on all 49 golden vectors are correct and the converter patch hides
no disagreement; the blocker is that, merged with main, the oracle's own tests read obligations.json 0.3.3 and fail 8 of 222.
Branch `verify/O02` commit e468fe9 (merge of exp/O02 into main b006b81); evidence in that branch's `lab/verify/O02/` (tools/, results/).

## Evidence
| Check | Verifier | Author | Same |
| --- | --- | --- | --- |
| Patched converter = patch_converter.py applied to V-O01's original | byte-identical (sha 4aca5183...) | same | yes |
| Unit tests at 03519ae (contract 0.3.1) | 216/216 | 216/216 | yes |
| Unit tests on verify/O02 (contract 0.3.3) | 222 run: 2 failures, 6 errors | not run | no (F1) |
| --self-check | O-HAM 18/18, O-CFG8 20/20, O-EVT 23/23 | same | yes |
| Converter reruns (unpatched, patched core, patched qlever) | identical item by item | same files | yes |
| 47 items whose verdict the patch changed, re-judged without the converter | 47/47 | none | yes |
| 22 new planted errors in the patched areas | 22/22 DISAGREE (original converter: 9/22) | none | yes |
| V-O01's 8 mutants; 23 section 4 probes | 8/8; 23/23 | same | yes |
| Independence | stdlib only; reads only the case file, its own sources (to hash them) and qualification fixtures; no packages/; no subprocess | same | yes |
| Golden files vs goldenFilesPinned | 9/9 | none | yes |
| 0.3.3 rules probed (20 probes) | 11 wrong answers, 5 refusals, 4 match; no golden vector uses any of them | none | none |

## Patch review
P1 (error tags), P3 (count kind), P4 (timeline kind, AMB-02 names) and P9 (lane plumbing) are pure maps. P5 and P7 are stricter. P2 (any of
id/_tag/reason), P6 (cursor reasons, VECTOR-BUG verdict) and P8 (raw contract only, per AMB-01 A) change judgment without hiding any
disagreement; their residual gaps (reason and phase not compared in P1/P2; oracle reason unchecked under VECTOR-BUG; P7 hard-codes ruled
answers) are closed for every current item by `judge_changed.py`.

## Fix list
- **F1 (blocking, oracle, two files):** add six section 4.7 rows to `errors.ERROR_TABLE` (E-INEXACT-JSON-NUMBER, E-NEGATIVE-ZERO-INSTANT,
  E-DECIMAL-OVERFLOW, E-DECIMAL-BARE-DIVIDE, E-DECIMAL-FRACTION, E-DECIMAL-NARROWING) without adding them to PRODUCED; add named tests
  AG-SUM-ONE-ENTITY (its 3 contract examples) and AG-INT-RESULT. Proven on a scratch copy: 224/224, 0 converter verdict changes; only
  errors.py and tests/test_contract_section4.py hashes change.
- **C1 (contract):** obligations.json lists O-REPLAY as TO-BUILD at lab/acceptance/oracle/replay.py with `oracleFilesPinned.O-REPLAY = []`;
  point it at lab/oracles/replay/** and pin the post-fix hashes.
- **C2 (contract):** LEGACY_LANE_OUTCOMES and legacyScan miss G1-I64-02 `min-exact` (the scan does not read commandTemplate/contrastCase).
- **C3 (contract):** Q33 not compiled (in progress as 0.3.4).
- **EXP-O03 (not blocking; no golden vector depends on them):** 11 confident wrong answers on 0.3.3 rules: Q30a -0 in JSON (x2), Q30b
  instant -0, Q22 add/mul/sum beyond 38 digits (x3), DC-D2I error name, Q33d cross-family ordered comparison (x2), Q31c non-dense receipt
  positions, Q24/Q31f erasure command; plus 5 refusals (inexact JSON number, decimal `/` `divide` `round`, rem over binary64, transactions
  limit 0, negative basis). Until fixed, the pin's scope is golden vectors plus section 4 through 0.3.1 and Q21; each unfixed rule should
  refuse with X-NOT-MODELED so G1.wire.write-guards, G1.types.decimal, G2.expr.cross-family-comparison, G7.position.coordinates
  (non-dense) and G9.erasure.* fail closed. Minor: R-VAL-7 should use Q33a's shortest-rendering test; coverage tests should watch
  decimalOps, decimalConversions, wireRules and the temporal, readShape and journal tables.

## Vector bugs
All four confirmed: G10-CUR-01 E1/E2 (`other-query`); G1-I64-01 and Q8F-02 on QLever (in 0.3.3 legacy outcomes); G1-I64-02 `min-exact` on
QLever only (new: missing from legacy outcomes, C2); G5-SUM-01, 02, 04, 05, 06, 08, 11 case 2 (in legacy outcomes).

## Side flag
EXP-W01's golden scenarios were generated with O-REPLAY 0.1 (`lab/scenarios/lib/oracle.mjs` runs the oracle from exp/O01); regenerate after
the oracle is pinned.

The verified 29-file hash table at 03519ae is in the verifier's hand-back and on branch verify/O02 (`tools/hash_table.py`).

# CX-VO05-2: O-OBS round 4 QA review

**Verdict: ACCEPT — pin `23e2273` for screening.** No remaining blocking finding was reproduced in this review.
The common context guard fixes R3-F1 for every protocol. The corrected cancellation positive preserves its original
uncertainty/drain boundary and now supplies sufficient coverage; independent adjacent-boundary controls verify the edges.

Reviewed `23e2273fc6b15b92821b318acd387f5484155d8a` on `exp/O05-observation-oracle`, after reading the builder's complete
`REPORT-round4.md`. As requested, merged it into `verify/O05` at `bed85a408ed961f41932ccfd876c43f009355dd5`. No reviewed
implementation was edited. All new review tools and receipts are under `lab/verify/O05/round4/`.

North star: correctness beneath P1, P2, P3 and P5; goals and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md` and
`lab/TARGETS.md`, with the operating protocol read before testing. This verdict is for the documented synthetic screening
evaluator, not production evidence collection, release readiness or closure of an engine obligation.

## Common context guard: one required path

At the reviewed revision, `lab/acceptance/oracle/observe.py:788`–790 contains the common selection guard. It requires:

- exactly one contract obligation matching the evaluator's obligation ID;
- O-OBS in that obligation's actual `oracles` selection;
- the evaluator's context protocol equal to the requested protocol;
- that protocol registered in the pinned contract's `obsProtocols` object.

The guard is in `check()` before WORK's additional threshold selection, case-field reconciliation, source reconciliation
and protocol dispatch. The sole handler dispatch is at line 803 and the sole PASS assignment is at 804. `main()` calls
`check()`; helper handlers do not emit their own oracle verdicts.

The independent QA verifies this in two ways (`round4/qa-evidence/summary.json` and `traces.json`):

1. AST inspection finds one shared guard, one dispatch and one PASS assignment, in that order in the straight-line
   success body, with no early success return or alternative PASS assignment.
2. Actual Python line/call tracing covers all fourteen protocols with both valid and contradictory contexts:
   **28/28 traces match**. Each valid context visits guard → dispatch → handler → PASS. Each unrelated-obligation
   context visits the guard, then returns REFUSED/2 without entering its handler or the PASS assignment. The CLI and
   directly traced `check()` result agree for every traced invocation. No monkey-patching or reviewed source edits were used.

Malformed or unauthenticated inputs can reject before reaching the selection guard. That is a fail-closed error path,
not a protocol dispatch or success bypass. The reachability claim is that every semantic handler invocation and PASS
must pass through the shared authority check.

**126 fresh authenticated CLI cases** exercise nine variants for each of fourteen protocols: a legitimate positive,
unrelated obligation, protocol mismatch, missing registration, unknown obligation, duplicate obligation, empty oracle
selection, O-OBS present only in `needsNewOracle`, and unrelated authority combined with an empty normalized evidence
object. All fourteen positives pass. All **112 contradictory contexts return REFUSED/2 at the intended common guard**.
The last variant demonstrates that invalid authority is rejected before source/handler field checks can choose a different
protocol outcome. A global registry entry or pending-oracle label cannot replace actual obligation delegation.

The frozen contract represents oracle delegation on obligations and protocols in a global registry. It does not encode
a separate obligation/case/protocol relation. This verdict verifies the represented delegation and protocol identity;
it does not invent an additional mapping from free-text statements. WORK retains its stricter contract-derived
obligation/threshold/witness relation, and legitimate nested WATERMARK checks still run through ACK-ORDER.

## Complete retained-case replay

`round4/replay.py` independently replays the actual retained input paths, without importing the builder's replay helpers,
relocating normalizers, rewriting contexts or regenerating old raw objects. It checks retained file hashes before/after
every invocation and runs the current merged oracle, not the old snapshot oracle.

**786/786 expected outcomes match:** 57 PASS, 172 FAIL and 557 REFUSED; no crashes and no unexpected PASS.

| Retained cohort | Cases | Fresh result |
| --- | ---: | --- |
| Entire round-2 review | 306 | All expected outcomes match, with the previously documented insufficient-coverage control still rejecting |
| Round-3 generalized transitions, selectors and timing | 462 | All expected verdicts and intended guards match |
| Round-3 isolated coverage controls | 4 | `both` passes; original, cadence-only and final-edge-only variants reject at their intended checks |
| Round-3 unrelated-obligation context probes | 14 | All fourteen now REFUSED/2 specifically at the common context guard |

The retained denominator includes all **177 round-1 inputs**, each REFUSED/2, and all **fourteen primary positive bundles**,
each PASS/0. All nine original round-2 false-PASS examples remain rejected. The round-3 generalized cohort preserves the
all-transition content mutations, obligation/bar pairings, exact-ratio boundaries and uncertainty cases at their intended
semantic guards. Those subgroups overlap the retained totals and are not counted again.

Receipt: `round4/replay-evidence/summary.json`; individual commands, output, exit codes, input hashes and results are retained
under its numbered case directories and `results.json`. Both source stability and input stability are true.

A first final-count audit grouped by display ID and overcounted legacy cases as 191 because fourteen positive IDs repeat
between cohorts. Its assertion failed; counting original evidence paths instead verifies exactly 177 legacy refusals.
`round4/audit-first.json` retains that review-audit error. No oracle input, result or cohort expectation changed.

The old helper matrices were also freshly rerun: **15,700/15,700** obligation/threshold/witness selector outcomes and
**50/50** rational decimal clock comparisons match. Only the two actual reuse/incremental obligation selections are accepted
by the selector matrix. These are helper calls, not additional CLI cases (`round4/matrix-evidence/`).

## Corrected positive and coverage boundaries

The corrected control starts from the retained supplemental cancellation observations. All non-sample fields are
compared against the original and remain identical: request 102, drain 2100, caller settlement 110, transport ACK 120,
reuse 2200, the request/connection identities and successful same-connection reuse. Uncertainty remains **u=1**.
Samples become `100 + 500*i`, i=0..15, ending at 7600. No threshold or timing gate is loosened.

It retains the original drain-margin boundary exactly:

`2100 - 102 + 2*u = 2000 ms = T-DRAIN-MS`.

It also exercises the first coverage edge at equality: latest first-sample time `100+1` equals earliest request time
`102-1`. The final sample at 7600 deliberately supplies slack over the required drain+5000 endpoint. It is not claimed
to be the minimum sufficient final sample. The independently retained four-way comparison still proves why both cadence
and final-edge repairs are necessary; it is replayed unchanged in the 786-case cohort.

Seven additional authenticated CLI controls make the remaining boundaries explicit:

| Control, always u=1 | Fresh result | What it establishes |
| --- | --- | --- |
| Corrected positive | PASS/0 | Original caller/drain/reuse observations remain valid with repaired coverage |
| Drain moved from 2100 to 2101 | FAIL: drain deadline | One nominal millisecond beyond the original uncertainty-aware drain boundary is rejected |
| First sample moved from 100 to 101 | FAIL: uncertain coverage | The corrected positive still tests the first coverage edge; one millisecond short fails |
| Final sample 7102, with adequate cadence | PASS/0 | Last-edge equality: `7100+1 <= 7102-1` |
| Final sample 7101, same adequate cadence | FAIL: uncertain coverage | One millisecond short of the last-edge requirement fails |
| Sample gaps 998 ms | PASS/0 | Cadence equality: `998+2*u = 1000 ms` |
| Sample gaps 999 ms | FAIL: uncertain coverage gap | One millisecond over the uncertainty-aware cadence limit fails |

Each negative fails at its intended gate, with other requirements providing sufficient slack. These controls establish
that correcting the positive did not sidestep or disable the edge checks. The actual inputs and raw authenticated bundles
are in `round4/qa-evidence/CANCEL-*`; results are also in `qa-evidence/results.json`.

The full new independent QA cohort is **133/133 matching CLI outcomes**, plus the separately counted 28 execution traces.
Together with the retained replay, this is **919 fresh CLI invocations: 74 PASS, 176 FAIL, 669 REFUSED**, all expected.
It is an execution denominator, not a claim of 919 independent product requirements.

## Shipped gates and source binding

All six shipped gates freshly pass under a separate heavy admission, with unchanged source bytes:

| Gate | Result | Receipt under `round4/gate-evidence/` |
| --- | --- | --- |
| `test_observe.py` | 96/96 fixtures | `test_observe.py.stdout.txt` |
| `test_cli.py` | 8/8 methods | `test_cli.py.stderr.txt` |
| `test_round2.py` | 29/29 methods | `test_round2.py.stderr.txt` |
| `test_round3.py` | 13/13 methods | `test_round3.py.stderr.txt` |
| `test_round4.py` | 4/4 methods, including common selection and the four-way corrected coverage control | `test_round4.py.stderr.txt` |
| `selfcheck.py` | 14/14 semantic omission mutants | `selfcheck.py.stdout.txt` |

Unit-method and mutation counts overlap other cohorts and are not added to the 919 CLI invocation denominator.
`gate-evidence/summary.json` records all process exits, source hashes and source stability.

Reviewed oracle SHA256: `668136f3c99e09b5332363bb6beaac7f177d07ef7718eb59b2b801faeedcb2cb`.
Contract SHA256: `4d52bf6ef978f830f871b4a4e1f4234c21d5253a2af42d3d8057b10e7998b03f`.
The working-tree oracle and contract exactly match 23e2273. The implementation diff from round three is restricted to
the shared context-selection check and movement of the existing registration check into it; temporal, authentication,
expected-content and exact-ratio checks remain unchanged.

All execution used the shared `lab/bin/heavy.mjs` admission path and checked more than 5 GiB free before cohort work.
The independent replay began with 19,803,992,064 free bytes, new QA with 19,781,148,672, the matrix replay with
19,699,879,936, and shipped gates with 19,909,586,944. All commands completed and released their heavy tokens normally.

Commands used:

```sh
node lab/bin/heavy.mjs --label CX-VO05-R4-retained -- python3 -I -B lab/verify/O05/round4/replay.py
node lab/bin/heavy.mjs --label CX-VO05-R4-guard-edges -- python3 -I -B lab/verify/O05/round4/qa.py
node lab/bin/heavy.mjs --label CX-VO05-R4-matrices -- python3 -I -B lab/verify/O05/round4/matrices.py
node lab/bin/heavy.mjs --label CX-VO05-R4-shipped-gates -- python3 -I -B lab/verify/O05/round4/gates.py
```

Whole-cohort runners refuse to overwrite retained attempts. Every CLI case's `result.json` contains its complete command,
observed output and exit status. For example, the review reproducer can run a new case:

```sh
node lab/bin/heavy.mjs --label CX-VO05-R4-one -- python3 -I -B lab/verify/O05/round4/reproduce.py qa-evidence/CANCEL-last-edge-exact
```

Synthetic HMAC keys retained with new bundles are public fixture material. The review uses its own existing encoder and
normalizer for new cases, not builder fixtures or builder expected answers.

## Scope of acceptance and handoff

**Safe to pin 23e2273 for screening under the documented evaluator-owned context and bundle model.** This review found
no remaining blocking defect in the requested fix or retained attack cohort. It does not establish that production
collectors, parsers, physical inventories, clock mapping or key custody produce trustworthy real-world inputs. Q82c's
separate verifier recollection remains required for actual acceptance evidence, and PASS retains `qualification: screening-only`.

No oracle fixes, package/adapter edits, live engine/Docker lifecycle, production scanner/parser/sidecar collection,
benchmarks or root pnpm checks were performed. No acceptance pin, obligation status or main-checkout source was changed.
The only merge was the explicitly requested merge into `verify/O05`; nothing was merged into main or pushed.
Production collector/parser integration, physical-inventory acquisition and any future explicit clock-correlation model
remain open work, rather than blockers to this limited screening pin.

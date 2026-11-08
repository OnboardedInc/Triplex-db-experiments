# CX-VO05-2: O-OBS round 3 adversarial review

**Verdict: FIX-FIRST.** The three concrete round-2 bypasses reject, but the obligation-authority check remains restricted
to WORK. Thirteen other protocol families still emit O-OBS PASS inside an evaluator context whose obligation does not use
O-OBS at all. Apply the common contract-context check before pinning for screening.

Reviewed `537adf8cc3d6ff28a69940649febc3c05b566ede` from `exp/O05-observation-oracle`. As explicitly requested, merged it into
`verify/O05` at `f98dd459403365b8d6005aced0ce8da483c773ef`. The reviewed oracle and contract exactly match 537adf8; no fixes
were made to them. All new review tools and evidence are under `lab/verify/O05/round3/`.

North star: the correctness floor under P1, P2, P3 and P5, governed by `lab/SCOPE.md`, `lab/NORTH-STAR.md` and
`lab/TARGETS.md`. Lab instructions and the builder's complete `REPORT-round3.md` were read before testing.

## Finding

### R3-F1 — P1: non-WORK protocols accept an obligation that does not select O-OBS

**Location at 537adf8:** `lab/acceptance/oracle/observe.py:184`–194 and 786–802; especially the WORK-only call at 788.

`work_selection()` now checks that the selected obligation's `oracles` contains O-OBS. Other protocols bypass that check.
The common path merely finds an existing obligation, checks inclusion of its threshold IDs, and dispatches the selected
protocol. For an obligation with no thresholds, the inclusion check is vacuously true.

`G1.found.unchanged44` requires the unchanged 44-case conformance suite in current and reopened modes. Its only oracle is
**O-TESTKIT**, and its entrypoint is EP-TRIPLES. It does not authorize an O-OBS case or witness. The independent
`round3/context_matrix.py` binds each protocol's otherwise complete authenticated positive to this obligation and
`case: CS-U44/all`. Its bundles retain valid raw bytes, HMACs, chains, independent heads, source kinds, normalizer pins,
case-field bindings and genuine protocol data. RESOURCE also binds its evidence-side obligation to the same ID, so this
does not depend on an evidence/context disagreement.

Fresh CLI results in `round3/context-evidence/summary.json`:

| Context obligation | Protocol families | Expected | Observed |
| --- | --- | --- | --- |
| `G1.found.unchanged44` (`oracles: [O-TESTKIT]`) | WORK | REFUSED | REFUSED/2 |
| Same | CANCEL, PREABORT, CONNECTIONS, SCRATCH, NO-MUTATION, RESOURCE, AVAILABILITY, SCALE-COUNT, MAINTENANCE, ERASURE-SCAN, WATERMARK, ACK-ORDER, FAULT-TRANSITIONS | FAIL or REFUSED | **13 PASS/0 results** |

MAINTENANCE, for example, emits PASS after consulting NS-P3-LAG-P99-MS even though the named obligation selects neither
O-OBS nor that metric. NO-MUTATION emits PASS with no consulted threshold at all. The WORK counterexample is now properly
refused under identical obligation authority, demonstrating that this boundary is enforced selectively rather than absent
by design from every protocol.

**Reproduction:**

```sh
node lab/bin/heavy.mjs --label CX-VO05-R3-one -- python3 -I -B lab/verify/O05/round3/reproduce.py context-evidence/NO-MUTATION
node lab/bin/heavy.mjs --label CX-VO05-R3-one -- python3 -I -B lab/verify/O05/round3/reproduce.py context-evidence/MAINTENANCE
node lab/bin/heavy.mjs --label CX-VO05-R3-one -- python3 -I -B lab/verify/O05/round3/reproduce.py context-evidence/WORK
```

The first two print PASS and exit 0; the third refuses. Each directory retains exact inputs, raw objects, external synthetic
test key, normalized evidence, context, output and invocation.

**Impact and trust boundary:** these are contradictory **trusted evaluator inputs**, not a way for candidate code to
rewrite an evaluator-owned context. The measured protocol facts remain internally valid. The defect is accepting them as
contract-bound O-OBS screening evidence for an obligation that delegates to another oracle. This is the same context
consistency boundary implicated by round-2's unrelated-obligation probe, generalized beyond WORK. It does not prove that
a separate qualification evaluator would close G1 or that any live engine fact was forged.

**Proposed fix:** enforce the obligation's O-OBS selection in the common `check()` path before protocol dispatch. Retain
the stricter WORK-specific obligation/bar/witness checks and explicitly supported nested thresholds. An unrelated
O-TESTKIT-only obligation should refuse for every O-OBS protocol. Keep the fourteen legitimate positive contexts as controls.
Further case/protocol mapping may need an explicit contract representation; that does not prevent this minimal common check.

**Authority:** Q80a's evaluator-owned, **contract-bound** obligation/case/witness/threshold context; round-2 R2-F2's stated
contract-consistency requirement and unrelated-obligation reproduction. No ruling provides a non-WORK exception.

## Review of R2-F1 through R2-F3

**R2-F1: fixed in the tested transition family.** `observe.py:699`–700 requires expected facts, and line 741 compares the
complete facts unconditionally. Lines 742–748 additionally check QT5 effect/absence arrays and access-path agreement.
The three retained wrong-content examples now fail. The new independent cohort covers **all twelve transition kinds**:
QT0, QT1, QT2, QT3, QT4s, QT4r, QT5, QT6, XT0, XT1, XT2 and XT3. Each substantive positive passes; **15 content mutations**
across their request, validation, COMMIT, update, source-readback, marker, access-path, transaction and receipt payloads
fail specifically at the expected-facts comparison. Missing expected facts refuse/fail for all twelve. These are 39 full
authenticated CLI cases (`general-evidence/0000` through `0038`), not just direct helper tests.

**R2-F2: the WORK bar bypass is fixed; its general authority boundary is incomplete (R3-F1).** For every one of the
contract's **157 obligations**, the review submits full authenticated WORK bundles selecting reuse and incremental work:
**314 CLI pairings**, with the two correct pairings passing and the other 312 refusing. Both contradictory work-threshold
unions refuse. The independent selector matrix covers **157 obligations x 50 registered thresholds x 2 witness kinds =
15,700 helper calls**, with exactly the two contract-authorized selections accepted. Expected authorized IDs come from the
two actual reuse/incremental obligation statements, not from the implementation's output.

The other explicit metric selector, MAINTENANCE, is exercised through the CLI for all 50 registered thresholds. Only
NS-P3-LAG-P99-MS passes; all 49 substitutions reject. Other handlers use fixed named thresholds rather than a selectable
metric. ACK-ORDER's nested WATERMARK threshold still works. This validates numerical selection, not permission to assign
the observation to an unrelated obligation; the separate fourteen-protocol context cohort exposes that remaining distinction.

**R2-F3: fixed for every observed timing-gate family tested.** `ClockBounds` at 152–181 uses rational endpoint intervals;
the temporal handlers at 394–429, 447–450, 500–505, 550–561, 578–589, 607–609, 664–669 and 680–685 call it.
The new cohort includes **57 authenticated timing cases**, with u=1 positive controls for all nine protocols that have
temporal requirements. Every negative reaches its intended guard; an earlier unrelated failure cannot count as coverage.
Fifty additional decimal primitive comparisons agree with independent rational inequalities.

| Timing family | Source-bound variations checked |
| --- | --- |
| CANCEL | request/settlement and settlement/reuse ordering; drain upper bound; ACK after request/before drain; reuse after drain; first/final coverage edges; sample cadence and strict sample order; possibly active query at drain; timeout grace and request/deadline order |
| PREABORT | window order; initial/final segment coverage; uncertain segment overlap; statement inclusion at both window edges; a provable-overlap positive |
| CONNECTIONS | return after close, release deadline and a sample that could be a post-deadline leak |
| AVAILABILITY | probe after failure, recovery deadline, possibly overlapping manual restart and a definitely earlier restart positive |
| MAINTENANCE | interval order, p99 lag uncertainty, final coverage edge, cadence, lag samples that could overlap either end of the maintenance window |
| ERASURE-SCAN | canary write/find, canary before publication, scan after publication and key destruction before scan |
| WATERMARK | wait order and upper bound, route order and containment inside the read |
| ACK-ORDER | source publication before ACK and ACK before the returned-position pull |
| FAULT-TRANSITIONS | transition before crash, readback strictly after crash and strict order between successive transitions |

Resource owner timestamps group simultaneous samples; equality binds sample identity, with no elapsed-time gate there.
The index's application valid-time values remain exact semantic coordinates. Collector chunk timestamps and bridge
send/receive pairs have the explicitly declared native/same-clock meanings described in the format. Those are not silently
treated as independently mapped application-event comparisons. SCRATCH, NO-MUTATION, SCALE-COUNT and WORK have no separate
observed-time inequality to exercise.

## The supplemental positive is insufficient evidence under the supported clock model

**Judgment: the bundle needs stronger coverage evidence; this is not a blocking over-strict gate.** The previous review
called `CANCEL/clock-margin-positive` positive because it fixed the drain duration. It did not provide uncertainty slack
for the separate cadence and final coverage requirements. The retained original is unchanged and its expectation change
is explicit in `round3/replay-evidence/summary.json`.

With u=1, its 1998 ms nominal drain has a 2000 ms worst-case interval and satisfies the drain bar. Its nominal 1000 ms
sample gaps can be 1002 ms, exceeding the 1000 ms maximum. Its final sample and required drain+5000 endpoint are both
7100 nominally, so the sample's earliest possible time (7099) cannot cover the endpoint's latest possible time (7101).
obs-context/1 provides no authenticated per-field clock-correlation relation that cancels these endpoint uncertainties.

`round3/coverage.py` re-encodes the **same caller/drain/reuse observations**, changing only the sample times:

| Variant | Sample change | Fresh result |
| --- | --- | --- |
| Original | 1000 ms gaps, final sample 7100 | FAIL: uncertain final coverage |
| Cadence only | 500 ms gaps, final sample 7100 | FAIL: uncertain final coverage |
| Final edge only | Original cadence, additional sample at 7600 | FAIL: uncertain sample gap |
| Both | 500 ms gaps, final sample 7600 | **PASS/0** |

All four reach their intended outcomes (`round3/coverage-evidence/summary.json`). This isolates both missing proof margins
and demonstrates that nonzero uncertainty is usable. A later correlation model could accept more cases, but the current
model cannot infer that a numeric equality means two distinct events share a constant clock offset. The review's old
positive label was too broad for this model; its input and first result were preserved.

## Fresh executions and evidence denominator

All execution used `lab/bin/heavy.mjs`. Each cohort checked host free space above 5 GiB at its start and records the free
bytes, source identity and stable source readback. No crash results occurred.

| Independent cohort | Unique CLI inputs | Fresh result | Receipt under `round3/` |
| --- | ---: | --- | --- |
| Entire retained round-2 review | 306 | 306 expected outcomes after the one explicit coverage expectation change; all 177 round-1 inputs REFUSED/2; all fourteen primary positives PASS/0; all nine original false-PASS cases reject | `replay-evidence/summary.json` |
| Generalized transitions, selectors and timing | 462 | 462/462 expected verdicts and intended guards; 27 PASS, 119 FAIL, 316 REFUSED | `general-evidence/summary.json` |
| Isolated supplemental coverage | 4 | 4/4 expected; one PASS, three FAIL | `coverage-evidence/summary.json` |
| Unrelated-obligation context across protocols | 14 | WORK refuses; thirteen unexpected context-acceptance PASS results | `context-evidence/summary.json` |

Combined independent CLI denominator: **786 inputs, 773 matching expectations, 13 unexpected PASS results** attributable
to R3-F1. The 15,700 selector-helper calls and 50 decimal comparisons are additional checks, not added to that CLI denominator.
The original review's 177 inputs and fourteen positives are subsets of 306; they are not counted again. The replay does
not invoke the old snapshot oracle or rely on the builder's replay harness: it runs the merged 537adf8 CLI directly on the
actual retained input paths, without relocation or input rewriting, and checks input hashes before/after each invocation.

The five shipped gates also freshly pass: **96/96 fixtures, 8/8 CLI methods, 29/29 round-two methods, 13/13 round-three
methods and 14/14 semantic omission mutants**. Their source hashes, exits and stdout/stderr are retained in
`round3/gate-evidence/`. These gates overlap other cohorts and are not extra unique CLI inputs. Their passing results do
not exercise R3-F1.

Reviewed oracle SHA256: `daeefcf312806dd045c37e19bd1d53205c085b7f1951a2ea4165d941403159ea`.
Contract SHA256: `4d52bf6ef978f830f871b4a4e1f4234c21d5253a2af42d3d8057b10e7998b03f`.
`git diff 537adf8 -- lab/acceptance/oracle/observe.py lab/acceptance/obligations.json` is empty.

The full cohort commands were:

```sh
node lab/bin/heavy.mjs --label CX-VO05-R3-retained -- python3 -I -B lab/verify/O05/round3/replay.py
node lab/bin/heavy.mjs --label CX-VO05-R3-general -- python3 -I -B lab/verify/O05/round3/review.py
node lab/bin/heavy.mjs --label CX-VO05-R3-shipped-gates -- python3 -I -B lab/verify/O05/round3/gates.py
node lab/bin/heavy.mjs --label CX-VO05-R3-coverage -- python3 -I -B lab/verify/O05/round3/coverage.py
node lab/bin/heavy.mjs --label CX-VO05-R3-context-matrix -- python3 -I -B lab/verify/O05/round3/context_matrix.py
```

Whole-cohort runners refuse to overwrite existing attempt directories. For an individual reproduction use `reproduce.py`
with a retained evidence directory; each `result.json` contains the full command and observed exit. Synthetic HMAC test keys
are public fixture material. Newly encoded cases use the prior review's independent encoder and normalizer, not builder
fixtures; all supplied records are regenerated from their retained raw chunks by the real oracle.

## Limits and handoff

The requested merge occurred only on `verify/O05`; nothing was merged into main or pushed. No reviewed implementation,
package, adapter, acceptance status or pin was edited. No live engine, Docker lifecycle, observer sidecar, production
normalizer, physical inventory/scanner, clock bridge service or key custody was built or verified. No root pnpm/package
checks or performance benchmarks were run for this Python lab review. The tests establish synthetic screening behavior,
not independent recollection of actual engine evidence or closure of a production obligation.

R2-F1 and R2-F3 are addressed, and WORK's obligation/bar selection is addressed. Apply the common obligation-authority
check from R3-F1, rerun the fourteen-protocol context matrix with positive controls, and obtain review before pinning.
The future production collector/parser integration and any explicit clock-correlation model remain separate open work.

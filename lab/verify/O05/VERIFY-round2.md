# CX-VO05-2: O-OBS round 2 adversarial review

**Verdict: FIX-FIRST. Do not pin 463703d for screening yet.**

Reviewed `exp/O05-observation-oracle` at `463703d0b7805bd2a01b3f6aa9856cf15b1513b9`, based on `6852fc1`.
Review branch: `verify/O05`, starting at `74d1152`. North star: the correctness floor under P1, P2, P3 and P5;
goals and targets come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

All 177 retained round-1 inputs now return **REFUSED/2**. Independent authenticated positive bundles pass for all fourteen
protocols. The new interface addresses the standalone-evidence forgery, exact-ratio and basic wait/canary attacks, but
authenticated counterexamples still earn PASS for incorrect fault contents, contradictory obligation/threshold selection
and insufficient timing margins. Authentication establishes which bytes were observed; it cannot make wrong observations correct.

## Findings

### R2-F1 — P1: most fault transitions never compare readback contents with expected contents

**Location at 463703d:** `lab/acceptance/oracle/observe.py:655`, especially 659, 694–704.

`transition_witness` looks up the evaluator's expected operation, position and facts. It checks identities and some structural
fields, but compares all facts with `expected['facts']` only inside `if field == 'sourceReadback'` (697–699). That branch
runs for QT4s, not QT2, QT5 or XT2. Three authenticated, source-bound counterexamples return **PASS/0**:

| Reproduction ID | Retained input | Incorrect observation accepted |
| --- | --- | --- |
| `FAULT-TRANSITIONS/QT2-LOGGED-wrong-facts` | `round2/evidence/new-075/` | Evaluator expects status `approved`; the post-crash COMMIT contains status `wrong`. |
| `FAULT-TRANSITIONS/QT5-VERIFIED-wrong-facts` | `round2/evidence/new-087/` | EAV/VEA return the expected effect and absence; AVE returns empty effects and absences. |
| `FAULT-TRANSITIONS/XT2-ENGINE-COMMITTED-wrong-facts` | `round2/evidence/new-093/` | The recorded engine transaction has no effects while the evaluator expects the committed status effect. |

The raw chunks, header HMACs, chain, seal, independent heads, recomputed records, record digest, operation/position and
post-crash readback metadata agree. The evaluator's expected facts remain unchanged. QT4s with wrong contents correctly
fails (`new-081`); equivalent positives for all four transition types pass. Thus this is a semantic check omission after
authentication, not an attempt to substitute stale hashes or candidate authority.

**Proposed fix:** require concrete expected facts for every supported transition and compare substantive observed payloads
against them for every transition. QT5 must check each access path's complete expected effects and absences, including
agreement across paths; merely requiring the two property names is insufficient. QT2 must compare the COMMIT's expected
contents, and XT2 must validate the committed transaction/marker contents. Preserve typed refusal for unsupported formats.

**Authority:** Q80b; ACCEPTANCE 7.3 / `commitOutcomes.witnessRule` and QT2, QT5, XT2 transition definitions. The round-2 README
also promises that all facts equal evaluator expectations, which the implementation does not enforce.

### R2-F2 — P1: a context can bind an incremental obligation but select the unrelated reuse threshold

**Location at 463703d:** `observe.py:742`–750; threshold lookup at 328–339; work evaluation at 503–507.

The code requires all obligation thresholds to appear in `context.thresholdIds`, but allows additional thresholds and
checks `witnessKind` against `selectedThreshold` without checking either against the named obligation or case.

`WORK/context-incremental-obligation-reuse-threshold` (`round2/evidence/new-052/`) binds
`G8.support.incremental-witness`, operation `one-entity-maintenance` and comparison `full-recomputation`. Observed work is
2/100, above its 1/100 bar. The context includes **both** T-INCR-WORK and T-REUSE-AVOIDED, then selects
`witnessKind: reuse` / `selectedThreshold: T-REUSE-AVOIDED`. O-OBS returns **PASS/0**, consulting only the 1/2 reuse bar.
Including the required threshold satisfies line 744 without ever applying it.

`WORK/unrelated-obligation` (`new-053`) also returns PASS with `G1.found.unchanged44`, an obligation that does not use O-OBS
or a work witness. Replacing the selected threshold list with only another obligation's threshold correctly fails
(`new-051`); the union variant demonstrates why that subset check is insufficient.

This is a contradictory **trusted evaluator input**, not proof that a candidate can rewrite an evaluator-owned context.
The context is a trust boundary, but its contract consistency is still the checker’s responsibility under Q80a and this
task's explicit context/other-obligation attack. The same 2% measurement must fail under a correctly selected incremental
context; the follow-up controls retain that comparison.

**Proposed fix:** resolve or validate an explicit contract-owned obligation/case/protocol/witness/threshold mapping. Reject
incompatible selections, including unions that silently authorize a looser unrelated threshold. Allow legitimate nested
protocol thresholds explicitly (ACK-ORDER legitimately consults WATERMARK), rather than equating all selected thresholds
with one obligation's flat list.

**Authority:** Q80a; `G8.support.incremental-witness` versus `G8.reuse.positive-witness`; round-1 F2.

### R2-F3 — P2: clock uncertainty is applied to routing and ACK order but omitted from other timing gates

**Location at 463703d:** `observe.py:356`, 371–372, 399–411, 458–467. Compare the margins at 567 and 624.

With bundle `clock.maxUncertaintyMs: 1` and evaluator ceiling 1, these authenticated boundary observations still return
**PASS/0**:

| Reproduction ID | Input | Nominal boundary accepted without margin |
| --- | --- | --- |
| `CANCEL/boundary-clock-uncertainty` | `round2/evidence/new-105/` | cancel request 100, engine drain 2100: exactly 2000 ms |
| `CONNECTIONS/boundary-clock-uncertainty` | `new-106` | close 10, return-to-baseline sample 5010: exactly 5000 ms |
| `AVAILABILITY/boundary-clock-uncertainty` | `new-107` | failure 10, first successful read/write probes 60010: exactly 60000 ms |

In particular, cancellation compares a caller event to an engine event. A 2000 ms nominal interval with nonzero mapping
uncertainty cannot establish the required upper bound. The caller/engine ordering and timeout grace comparisons likewise
do not consult `self.uncertainty`. The corresponding 10 ms WATERMARK boundary correctly fails with the same 1 ms uncertainty
(`new-108`), showing that the authenticated uncertainty reaches the judge but only some handlers use it.

The follow-up retains a 1998 ms drain control that passes with a 1 ms endpoint uncertainty
(`round2/supplement-evidence/018/`). A timeout at its nominal 100 ms grace boundary also passes with nonzero uncertainty
(`supplement-evidence/019`). For caller events sharing a clock offset, a future implementation can model that correlation;
the present generic context does not identify such per-field correlations. The cross-clock drain case alone establishes
this finding independently of the timeout example.

**Proposed fix:** carry clock provenance/uncertainty through each temporal inequality. Apply conservative endpoint margins
where required; cancellation across clocks must fail or refuse when the uncertainty interval straddles the bar. If two
events share an offset that cancels, prove that relationship rather than silently assuming exact times. Add uncertain
boundary and clearly-inside-boundary controls for every affected timing gate.

**Authority:** Q82c's clock bridge, R27 section 2.6 and section 11 item 6: mapped engine times carry uncertainty and required
inequalities pass only with the applicable margin. This is a new round-2 finding.

## Round-1 F1–F5 implementation trace and variations

Locations below refer to the unchanged reviewed `observe.py` at 463703d, not the round-1 line numbers.

| Original finding | Implementing code | Independent round-2 exercise | Assessment |
| --- | --- | --- | --- |
| F1: invented self-hashed logs | `authenticate`: 216–317; recomputed source checks: 155–205 | 177 legacy inputs all refused; all 14 protocol families reject changed raw bytes and mismatched independent heads despite internally valid two-chunk chains. Wrong key, missing final head, normalizer policy/hash changes, external paths and contract mismatch also reject. | Screening trust boundary substantially addressed. No claim of live collector authenticity or acceptance collection. |
| F2: threshold and obligation laundering | Case/context checks: 736–750; threshold lookup: 328–339; RESOURCE: 448–455; WORK: 503–507 | Evidence-selected threshold changes, witness-kind conflict, another-obligation-only threshold list and changed case operation reject. The obligation/threshold-union variation still passes (`new-052`). | Partially fixed; R2-F2 remains. |
| F3: fault label as witness | Fault gate: 633–653; concrete schemas: 655–706 | QT2, QT4s, QT5 and XT2 each reject a label-only record, missing readback object, pre-crash readback and wrong readback identity. All four have independent substantive positive controls. Three wrong-content variations still pass. | Partially fixed; R2-F1 remains. |
| F4: rounded work ratio | Integer validation: 497–501; Fraction/cross-multiplication: 505–507 | For each of four counter channels and both thresholds, exact equality passes and numerator plus one fails: 16/16 expected outcomes. Baseline is `2^54` for reuse and `100 * 2^53` for incremental work. | Fixed for these exact boundaries. |
| F5: unexplained wait label | Source-bound wait fields in FIELDS; wait event checks: 557–574 | Missing start, wrong read id, event/timestamp mismatch and wrong duration label fail; uncertain nominal boundary fails. Follow-up cases also align the retained events with an excessive interval. | Original bypass addressed; full pre-route bound is a conservative supported subset, not proof of arbitrary internal scheduling. |

Q82d additions are at 523–555. All six independently encoded canary failures (missing, zero hits, wrong canary, found only
at publication, different scanner, different location) return REFUSED; a surviving derived-channel hit returns FAIL.
The positive inventory enumerates separate synthetic locations for all twelve contract categories plus observer outputs,
old generations and freed blocks. This exercises inventory matching, not discovery of real engine files.

## Independent positive bundles and receipts

The review does not import builder fixtures, expected answers, bundle encoders or normalizers. `round2/review_round2.py`
uses the previous review's independently hand-counted examples, extends them from the contract, and encodes fresh two-chunk
streams with its own encoder and `round2/normalize.py`. Every substantive field is reconstructed by that pinned normalizer.
Safety protocols have two agreeing kinds. ACK-ORDER separately binds its nested WATERMARK stream. Fault witnesses contain
the expected operation, decided position, actual effects/absences or transaction/marker payloads and post-crash readback
identity. The count control uses n=3, width=1: 9 active fixture facts, 13 assertion versions, 4 retirements and 4 commands,
checked by a separate, unchanged O-REPLAY process.

These are genuine complete **synthetic protocol bundles**, with actual CLI PASS output, not legacy positives that simply
hit the missing-context refusal. They do not purport to originate from a real engine or satisfy an entire obligation such
as year-one population. The small SCALE-COUNT control tests the supported analytic protocol subset only.

| Protocol | Independent positive bundle | Verdict |
| --- | --- | --- |
| CANCEL | `round2/evidence/new-000/` | PASS/0 |
| PREABORT | `new-003` | PASS/0 |
| CONNECTIONS | `new-006` | PASS/0 |
| SCRATCH | `new-009` | PASS/0 |
| NO-MUTATION | `new-012` | PASS/0 |
| RESOURCE | `new-015` | PASS/0 |
| AVAILABILITY | `new-018` | PASS/0 |
| SCALE-COUNT | `new-021` | PASS/0 |
| WORK | `new-024` | PASS/0 |
| MAINTENANCE | `new-027` | PASS/0 |
| ERASURE-SCAN | `new-030` | PASS/0 |
| WATERMARK | `new-033` | PASS/0 |
| ACK-ORDER | `new-036` | PASS/0 |
| FAULT-TRANSITIONS | `new-039` | PASS/0 |

The first independent execution has **286 CLI cases**: 177 legacy refusals and 109 new authenticated bundle cases.
Of the new cases, 26 expected positives pass, 75 expected rejections reject, and 8 expected rejections incorrectly pass.
There are no crash results. `round2/evidence/results.json` retains every result, exit, exact command and evidence path;
`summary.json` records source hashes, free disk and unchanged subject bytes. Every case directory retains the actual inputs,
raw chunks, headers, external test key, context, seal, stdout and stderr. Test keys are synthetic public test material.

The follow-up has **20 CLI cases, 19 expected outcomes and one additional unexpected PASS** (the uncertain timeout
boundary). Its four positive controls pass: QLever NO-MUTATION, Datomic CANCEL and PREABORT with HO+TO, and cancellation
clearly within its timing margin. It rejects single-kind safety evidence, two EI subtypes offered as different kinds,
the wrong XTDB gauge, CR, unsupported HR engine evidence, unknown EI subtype, Datomic PREABORT lacking HO, kind/id mismatch,
source disagreement, and the proper incremental context's 2% work ratio. A completely re-HMACed two-chunk chain and seal,
with updated retained header hashes but unchanged independent witness heads, refuses at the independent-head check
(`supplement-evidence/012`). Both additional wait-event attacks fail on the intended duration/bound checks.

Combined independent denominator: **306 CLI cases** (177 legacy plus 129 bundle cases): 30 expected positives pass,
267 expected rejections reject and 9 expected rejections return PASS. No crashes. Raw results and source-stability receipts
are in `round2/supplement-evidence/{results,summary}.json` as well as the first-run evidence directory.

The shipped builder gates also pass unchanged under separate heavy admission, with `sourceStable: true`:

| Gate | Fresh result | Receipt |
| --- | --- | --- |
| `test_observe.py` | 96/96 | `round2/builder-gates/test_observe.py.stdout.txt` |
| `test_cli.py` | 8/8 | `round2/builder-gates/test_cli.py.stderr.txt` |
| `test_round2.py` | 29/29, including its legacy cohort | `round2/builder-gates/test_round2.py.stderr.txt` |
| `selfcheck.py` | 14/14 omission mutants | `round2/builder-gates/selfcheck.py.stdout.txt` |

Their passing results do not cover the independent false-PASS variations. The gate source hashes, process exits and
26,723,782,656 free bytes before execution are recorded in `round2/builder-gates/summary.json`. The initial independent
cohort had 26,951,659,520 free bytes; the follow-up had 26,738,159,616. All three cohorts completed, and their heavy tokens
were released normally.

## Reproduction and source identity

All writes are under `lab/verify/O05/`; no reviewed implementation file was edited. Because this worktree remains based on
the round-1 review, the exact round-2 subject is retained under `round2/subject/`. It was extracted from 463703d with
`git archive`; all 41 retained files were independently byte-compared with `git show 463703d:<path>`. `snapshot.json`
records that source identity. Reviewed observe.py SHA256:
`4d1a128e7c5074139451310a73ee03753c849b9d3a237950b705208d36782bd3`.

`round2/authority/` retains read-only copies and hashes of the main-checkout lab instructions, Q80/Q82 rulings and R27.
The task calls the format R27 section 6; the supplied R27 revision actually places obs-bundle/1 in section 2 and Datomic
sources in section 6. This review follows the concrete format text and Q82c, without treating that heading mismatch as a defect.

Rerun a retained counterexample (prints the actual oracle report and preserves its exit):

```sh
node lab/bin/heavy.mjs --label CX-VO05-2-one -- python3 -I -B lab/verify/O05/round2/review_round2.py --case new-075
node lab/bin/heavy.mjs --label CX-VO05-2-one -- python3 -I -B lab/verify/O05/round2/review_round2.py --case new-052
node lab/bin/heavy.mjs --label CX-VO05-2-one -- python3 -I -B lab/verify/O05/round2/review_round2.py --case new-105
```

The full first-run command was:

```sh
node lab/bin/heavy.mjs --label CX-VO05-2-independent -- python3 -I -B lab/verify/O05/round2/review_round2.py
```

Whole-cohort runners intentionally refuse to overwrite existing evidence. Use a new attempt/output directory for another
whole-cohort run. Each retained `invocation.json` also contains the exact individual CLI command, with all input paths.

## Limits and handoff

No engine, Docker lifecycle, observer sidecar, production normalizer, physical scanner, live timing or collector/key
custody was exercised. No package or adapter code was changed; no root pnpm checks, benchmarks or live qualification
were run. No acceptance pin, publication anchor or obligation status was changed. No merge or push was performed.
The local heavy semaphore governed all test cohorts; each receipt checks more than 5 GiB free disk before admission work.

Open integration questions remain the production collector/parser implementation, physical-inventory acquisition, clock
provenance and evaluator custody. Those disclosed later integrations are separate from the reproducible checker defects
above. Fix R2-F1–F3, then rerun these retained bundles with a different reviewer before pinning for screening.

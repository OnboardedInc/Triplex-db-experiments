# CX-VO05 adversarial verification of EXP-O05 / O-OBS

**Verdict: FIX-FIRST. Do not pin this revision as the fail-closed observation oracle.**

Reviewed branch `exp/O05-observation-oracle`, commit
`6852fc1b9abcba5db0d0ceb37cc340129a467456`, from `verify/O05`. The oracle and contract were not edited.
North star: the correctness floor beneath P1, P2, P3 and P5, under `lab/SCOPE.md`, `lab/NORTH-STAR.md`
and `lab/TARGETS.md`.

The implementation is useful as a consistency checker for already trusted normalized records. Its PASS does not establish
the engine origin, case authority, witness identity or evidence completeness required by the task. The builder accurately
discloses many of those limits; disclosure does not satisfy the commander's stronger fail-closed requirement. This review
does not claim that a standalone observation PASS already bypasses the separate qualification evaluator. Q55a explicitly
requires evaluator-owned executions and treats supplied records as diagnostics.

## Findings

### F1 — P1/blocking: a self-hashed invented log earns PASS on every protocol

**Location:** `lab/acceptance/oracle/observe.py:136` (especially 138–146), and PASS emission at 483.

`source()` checks a caller-selected kind, the caller's normalized records and a digest the caller can compute. There is no
trusted collector/run identity, raw-engine object root, independently selected case, input inventory or acceptance context.
Every `<protocol>/invented-log` example is generated entirely by this review, without any engine, collector or real run;
each even declares `collectorAttestation.rawEngineObjects=[]` and a nonexistent run. All fourteen return PASS/0. The correct
client-kind, missing-record and bad-digest rejections do not prevent this: relabeling and resealing defeats them.

**Reproduction:** run `reproduce.py NO-MUTATION/invented-log` as shown below; repeat for each protocol. The claimed
engine counter is just two hand-written integers. SCALE-COUNT invokes O-REPLAY for the expected answer, but its purported
engine answer is still hand-written; this does not authenticate a measurement. ERASURE-SCAN also passes twelve category
names all pointing to one invented empty directory (`ERASURE-SCAN/category-labels-as-inventory`). WATERMARK's source
prefix, erasure frontier, query attributes and incarnation are all similarly self-selected.

**Proposed fix:** require an evaluator-owned, contract-bound case/run context and independently retained collector objects;
bind normalized fields to those objects, the actual engine/composition, case inputs and complete inventories. Reject or
REFUSE untrusted standalone evidence. A separate diagnostic consistency result may remain available, but must not be an
O-OBS acceptance PASS. A second caller-supplied digest or `trusted:true` field would not fix this.

**Authority:** the brief's commander's intent; ACCEPTANCE 6.3 engine-side evidence requirements; Q55a / ACCEPTANCE's
QUALIFICATION_RUN and `CX-R7-INVENTED-EVIDENCE`. The wire format is undecided; the source of authority is already decided.

### F2 — P1: evidence selects which named threshold applies, or whether a cap applies

**Locations:** `observe.py:275`–279 and `observe.py:327`.

The threshold **values** come from the contract, but evidence controls their **applicability**:

* `WORK/incremental-boundary` measures 2 rows of one-entity maintenance against 100 rows of full recomputation: FAIL at
  `T-INCR-WORK=0.01`. Changing only `threshold` to `T-REUSE-AVOIDED=0.5` produces PASS
  (`WORK/threshold-laundering`). The operation names remain one-entity maintenance/full recomputation.
* `RESOURCE/planner-cap` has forecast and observed total RSS 3,758,096,385 bytes, one byte above the named planner cap:
  FAIL. Changing only `obligation` from `G3.admission.preconstruction` to the real but unrelated
  `G1.found.unchanged44` produces PASS with `thresholds:{}` (`RESOURCE/obligation-laundering`).

**Proposed fix:** bind obligation, case, witness kind and threshold IDs through trusted acceptance context. The selected
obligation must actually require this observation protocol and selected witness; use its thresholds, not an evidence-side
selector. Reject missing or conflicting binding. The same requirement applies to case-pinned error, source ACK owner,
resource envelope and population, although these two cases demonstrate the specific threshold bypass.

**Authority:** ACCEPTANCE threshold registry; `G3.admission.preconstruction`, `G8.reuse.positive-witness` and
`G8.support.incremental-witness` (the authoritative statements at ACCEPTANCE 2461 and 2471);
brief step 3 and CA02's own acknowledgement that selection must be independent.

### F3 — P1: fault evidence can consist solely of the transition label it is meant to prove

**Location:** `observe.py:433`–452, especially 444–448.

`FAULT-TRANSITIONS/transition-label-as-witness` supplies a hashed record containing only
`{"transition":"QT2-LOGGED","t":30}`, with a claimed readback timestamp after the crash. It gets PASS without any
COMMIT bytes, transaction identity, decided position, restarted log or engine readback. The independent variant
`verification-label-as-witness` gets PASS for QT5 with no complete expected effects/absences and no independent queries
through three access paths. This is the specific label-without-substance attack the brief forbids, even before considering
whole-log authenticity in F1.

`declared-unwitnessed-transition` additionally declares QT4s with no durable object and still passes with QT2 selected.
The narrow last-present-record calculation matches 6.3, but the implementation has no way to enforce 7.3's accompanying
rule that a protocol-declared transition absent from the witness fails the case. Distinguish attempted/unwitnessed events
from a claimed completed transition explicitly; do not treat this PASS as the full fault-case verdict.

**Proposed fix:** define contract-reviewed, transition-specific witness schemas and independent readback validation. QT2
needs the post-restart COMMIT decision for the particular command/group and position; QT4s needs durable-source publication
and source readability; QT5 needs its independent effects/absences/access-path witnesses. Refuse unsupported witness types.
Carry a complete, trusted transition inventory and apply the declared-but-unwitnessed rule at the appropriate case gate.

**Authority:** ACCEPTANCE 7.3, `commitOutcomes.witnessRule` and the variant transition tables; Q55b. Encoding is undecided;
what QT2, QT4s and QT5 must witness is not.

### F4 — P2: binary64 work ratios round an above-threshold measurement down to the boundary

**Location:** `observe.py:325` (`x / y`), then 327 / 169.

The counters accept arbitrary nonnegative integers, but division loses integer precision. In
`WORK/exact-ratio-above-half`, candidate=9,007,199,254,740,993 and baseline=18,014,398,509,481,984:
the exact ratio exceeds 0.5 by 1/2^54. Python rounds it to 0.5, allowing PASS. In
`WORK/exact-ratio-above-incremental`, candidate=1,000,000,000,000,000,001 and
baseline=100,000,000,000,000,000,000 exceed 0.01 by 1/10^20; division similarly hides the excess.

These are valid integer evidence boundaries, not a claim that current engine runs produce counters this large.

**Proposed fix:** compare integer counter ratios exactly, with rational contract thresholds (for example, cross-multiply
against 1/2 or 1/100). Preserve strict boundary distinctions without binary64 division. Include both cases as regression tests.

### F5 — P2: the wait bound is checked against an unverified duration label

**Location:** `observe.py:368`–371.

`WATERMARK/unaccounted-pre-route-delay` reports read start=100, route start=60,110 and waitMs=10. It gets PASS. The only
timing reconciliation is `routeStart-readStart >= waitMs`, which permits arbitrary unexplained time before routing while
the reported wait remains under 10 ms. No eligibility lookup/wait events independently establish the bounded wait.

The interval could include legitimate non-wait work; this test does not assert every pre-route millisecond is waiting.
It demonstrates that the evidence cannot establish which part was waiting, so a bounded-wait acceptance PASS is unsupported.

**Proposed fix:** require source-bound eligibility/wait start/end events, tied to the selected read and routing decision,
and compute the wait against the contract. Account for other pre-route work separately. REFUSE when the bound cannot be
established; do not simply cap the whole request's pre-route duration at 10 ms.

**Authority:** ACCEPTANCE 6.3 OBS-WATERMARK and COMPOSITION.watermarkRouting; Q31d.

## Independent tests and receipts

`review.py` builds its own examples from ACCEPTANCE 6.3 and the threshold/transition tables. It does not import or read the
builder's fixture definitions. The small SCALE-COUNT positive is independently hand-counted for n=3, width=1 using the
configured-entities-v1 recipe: 9 live facts, 13 assertion versions, 4 retirements and 4 domain commands. Only after constructing
and running the independent cohort does the script rerun the builder's three gates.

Every protocol has a synthetic positive, a rule/boundary negative and at least three forgery classes: missing substantive
evidence, client-kind substitution, kind/digest-only evidence, invented resealed logs and digest corruption, plus specific
semantic attacks. Positive controls test the normalized syntax under a hypothetical trusted fixture context; they do not
contradict F1 or purport to prove a real engine observation.

The final run has **177 independent CLI cases, 154 matching expectations and 23 acceptance discrepancies, all actual PASS/0**.
It detects **19/19 additional semantic mutants with zero crash kills**. All nine threshold-value authority probes pass their
three variants (27/27); all normalized positive controls pass. The unchanged builder gates also pass: 96/96 fixture cases,
8/8 CLI tests and 14/14 omission mutants. Source hashes are stable before/after both attempts.

Detailed counts and the per-protocol table are in `COUNTS.md`; canonical outputs, exit codes, source hashes, exact evidence
paths and contract replacements are retained under `evidence/final/`. `evidence/final/summary.json` is the run receipt.

Reproduce the entire final cohort and mutation checks:

```sh
node lab/bin/heavy.mjs --label CX-VO05-rerun -- python3 -I -B lab/verify/O05/review.py
```

Rerun one retained counterexample (the command prints the oracle verdict and preserves its exit code):

```sh
node lab/bin/heavy.mjs --label CX-VO05-one -- python3 -I -B lab/verify/O05/reproduce.py WORK/threshold-laundering
node lab/bin/heavy.mjs --label CX-VO05-one -- python3 -I -B lab/verify/O05/reproduce.py FAULT-TRANSITIONS/transition-label-as-witness
```

The first attempt is intentionally retained: `evidence/summary.json`, `results.json`, `mutants.json`, original case/contract
inputs, `evidence/cases.attempt1.json`, `evidence/review.attempt1.py`, and `scratch/*.py`. Its maintenance boundary wrongly
used 201 ms against a 250 ms contract; that discrepancy was a **review fixture error**, not an oracle defect. Its fault boundary
modified only the outer readback object and was rejected by a record-consistency check, so it did not exercise the intended
readback comparison. Those issues explained its 17/19 mutation result. The final attempt corrects both, adds exact-ratio,
crypto, validity-end and multi-attribute cases, and uses a smaller explicit guard-sensitive mutation cohort. No reviewed
implementation changes occurred between attempts; no original failure was erased or silently relabeled.

## Threshold authority audit

All nine numeric threshold values consulted by this implementation are read from the `--contract` file. For each, independent
tests tighten the contract across a positive boundary, remove its definition, and try to override it in the evidence. Tightened
values produce FAIL, missing definitions REFUSED, and the evidence override cannot loosen the value; emitted definitions match
the supplied contract. This validates value lookup, **not applicability** (F2), exact ratio arithmetic (F4), or evidence truth.

| Threshold | Contract value / direction | Equality control / negative |
| --- | --- | --- |
| T-DRAIN-MS | 2000 max | 2000 / 2001 ms |
| T-DEADLINE-GRACE-MS | 100 max | 100 / 101 ms |
| T-CONN-RELEASE-MS | 5000 max | release at 5000 ms; changing contract to 4999 rejects |
| T-PLANNER-MEM-BYTES | 3758096384 max | exact cap / cap+1 byte |
| T-AVAIL-WINDOW-MS | 60000 max | 60000 / 60001 ms |
| T-REUSE-AVOIDED | 0.5 max | 50/100 / 51/100; additional exact-integer excess |
| T-INCR-WORK | 0.01 max | 1/100 / 2/100; additional exact-integer excess |
| NS-P3-LAG-P99-MS | 250 max | 250 / 251 ms |
| T-WATERMARK-WAIT-MS | 10 max | 10 / 11 ms |

Other fixed numeric rules are explicit contract text: cancellation's 1000 ms sampling gap and 5000 ms post-drain window, zero
matching preabort statements, counter equality, zero erasure hits and strict post-publication scanning. MAINTENANCE's reused
1000 ms gap and nearest-rank p99 are author-proposed policy, not registry-derived contract requirements (CA07).

## Mutants beyond the builder's fourteen

The builder's self-check omits an entire handler per mutant. This review instead plants nineteen local guard changes in
`scratch/final/`: accepted source kind, source digest, drain equality, active-query drain, same-connection reuse, preabort tag,
pool maximum, scratch equality, committed counter equality, summed owners, manual restart, engine count comparison,
all-channel work ratio, lag percentile, derived erasure hits, erasure frontier, ACK ordering, post-crash readback and incarnation
fencing. Only these scratch copies change; their ROOT constant is relocated back to the same real O-REPLAY subprocess.

The final mutation result is retained in `evidence/final/mutants.json` with the exact replacement and killing cases. Only
assertions whose baseline oracle verdict already matched the independent expectation may kill a mutant. Existing oracle
defects cannot inflate the kill count. Crashes are retained separately and do not count. A restrictive `<`-instead-of-`<=`
drain mutant is killed by a positive equality control; the other guard weakenings are exposed by semantic false-PASS outputs.
This establishes test sensitivity for these nineteen changes, not completeness or source authenticity.

## CA01–CA12 assessment

| Item | Judgment from the actual contract |
| --- | --- |
| CA01 provenance | Genuine gap in serialized kinds/parser/authentication format. No ambiguity that engine evidence must originate from the engine and qualification from evaluator-owned execution (Q55a). Self-hashed logs do not meet that requirement; F1 blocks PASS without trusted context. |
| CA02 case authority | Genuine envelope/schema integration gap. The case pins errors, obligations pin thresholds, composition pins source ownership, and evaluator resolves cases. The authority is already decided; unbound candidate choices cannot be accepted. F1/F2. |
| CA03 cancellation | ACK enum, reuse record format and normalized timestamps need a format decision. Same-connection successful reuse, pinned E-CANCELLED/E-TIMEOUT, drain coverage, timeout grace and case authority are already specified. No extra caller-settle latency SLA should be invented. |
| CA04 completeness | PREABORT's full coverage is required, not optional. Segment encoding is a real format choice. CONNECTIONS has no mandated cadence; rejecting later observed leaks is reasonable. Borrowing cancellation's cadence for maintenance needs a ruling, not an assertion that it is normative. |
| CA05 scratch/owners | Inventory representation is a real gap. Every scratch relation/unknown outcome and actual resource owner must be accounted, not a conveniently declared subset. Summing simultaneous owner samples is a sensible conservative reading; completeness needs trusted inventory. |
| CA06 work units | Genuine ambiguity about heterogeneous channel aggregation and zero-work baselines. Checking every nonzero channel is conservative and disclosed. The named reuse/incremental thresholds and their respective obligations are unambiguous; allowing their substitution is not justified. Exact integer boundary comparisons are required for an honest ratio. |
| CA07 maintenance | Genuine missing protocol-to-metric/percentile/cadence mapping. NS-P3's lag definition and p99 bar exist, but are not automatically every maintenance case's required metric. Current p99/1000 ms/P3 restriction needs approval; without a binding to a named case threshold, REFUSE rather than claim general maintenance acceptance. |
| CA08 populations | Honest current oracle coverage limitation. Refusing unsupported representative/year-one/stratified populations is fail-closed. A configured-entities synthetic positive is not year-one qualification. |
| CA09 erasure | Physical per-lane inventory, scan adapters and key-deletion attestation formats are missing. Every physical protected/derived copy and key exclusivity are already mandated (Q31f); one row per category is not proof of completeness. With no trusted physical inventory/scan binding, PASS is unsupported. The reading that ciphertext is not a plaintext hit is sound. |
| CA10 eligibility | Genuine raw schemas and exact/history-route support gaps. Refusal of unsupported routes is safe. Prefix completeness, reconstructability of every touched attribute, erasure frontier, scope/mapping and Q67c fencing are already requirements. Self-asserting those facts, or a bounded wait label, does not establish them. |
| CA11 faults | Raw witness encodings and adapters are genuine gaps. COMMIT_OUTCOMES already specifies the substantive witnesses and forbids using the system's own claim. Minimal `{transition,t}` records are not a permissible resolution of that gap. The null-event representation also needs an explicit attempted/completed distinction to respect 7.3. F3. |
| CA12 verdict codes | Reasonable CLI design choices consistent with the brief: PASS/0, semantic FAIL/1, malformed/unsupported REFUSED/2. Unknown extras may be ignored. No reason to block these conventions; their correctness does not compensate for false PASS. |

## Limits and handoff

No engine or Docker lifecycle was used, no adapters/packages were imported or edited, no root pnpm/package/engine tests or
benchmarks were run, and no obligation was closed or oracle pin changed. No commit was merged or pushed. The local heavy
semaphore governed both review attempts; each receipt records more than 5 GiB host disk free and before/after source hashes.
The source hashes establish which oracle was tested, not the truth of supplied engine samples.

Open integration decisions: the trusted collector/evaluator binding and physical inventory; the named maintenance metric and
percentile policy; exact/history eligibility beyond the implemented projection subset; supported population models; concrete
transition witnesses and the declared-but-unwitnessed case gate. Those are prerequisites to a usable acceptance oracle, not
permissions for accepting the present forgeries. The builder should address F1–F5 and obtain another independent review.

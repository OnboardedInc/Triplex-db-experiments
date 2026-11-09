# CX-VO06: independent review of O-REPLAY 0.5.0 / EXP-O06

**Verdict: FIX-FIRST. Do not pin this implementation in contract 0.4.0 yet.**

North star: correctness floor for P1 reproducible record cuts and P2 atomic,
idempotent receipts. Goals and targets come from `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, and `lab/TARGETS.md`; no performance claim.

Reviewed builder head `f8cda1c0eb12df798a74e464147abc251f038ee8` on
`exp/O06-oracle-record-time`. Baseline is Git commit
`4efe962e3faf79b3330973891b4533dae5f83704`. Review branch: `verify/O06`.
The verification commit is the commit containing this report.

## Findings

### F1 — P1: raw journal JSON retains its own physical transaction's instant across interior ordinals

Severity: high (wrong expected journal content).

Location: `lab/oracles/replay/replay.py:756`.

R33 2.1 S3 defines one stamp per **top-level physical transaction**, shared by all
its logical ordinals. Section 4.3 and Q90e require raw journal values to omit that
transaction's own record instants. The encoder tests `a.txId == record.txId`,
which only recognizes the same logical ordinal.

Reproduction: two commands in `physicalGroup: "outer"`, positions 1 and 2, both
stamped 500. First asserts A; second retracts A and asserts B. The oracle returns
PASS, but the second command's raw `:_tx/change` retraction contains
`"recordedAt": 500`, the physical transaction's own instant. `retractedAt` is
correctly absent. This is observable through both journal facts and their raw
canonical JSON. The builder's existing same-command assert/retract test does not
cover this cross-ordinal case.

Evidence: [case](evidence/probes/cross-ordinal-journal-own-instant.case.json),
[actual output](evidence/probes/cross-ordinal-journal-own-instant.actual.json).

Proposed fix: determine ownership at the physical transaction boundary (or compare
the assertion's record instant with the current record instant on decided lanes,
where distinct physical transactions cannot tie). Omit recordedAt for assertions
created in an earlier ordinal of that same physical transaction; retain it for
an assertion from an earlier distinct transaction. Add both controls and keep
hydrated changes unchanged.

### F2 — P2: a valid resolved lost-ACK receipt without a declared command clock is rejected as malformed

Severity: medium (valid lost-ACK inputs cannot be evaluated).

Locations: `lab/oracles/replay/run.py:596`, `:616`, and `_staged` at `:252`.

The normal replay path uses `_receipt`, which normalizes `outcome: "unknown"`
with `resolvedOutcome: "committed"`. The new stamp-consistency path reads the
original receipt instead. `_staged` then ignores its supplied stagedAt because
the raw outcome is still unknown. It raises `OracleInputError` even though the
receipt has every required committed field. This also happens with
`adapter.clockDriven: false`, where no reference-clock comparison is required.

Reproduction: use the valid engine-clock case, omit both command clocks, and
keep receipt stagedAt=500 with increasing instants 500 and 500.001. Committed
receipts PASS. Change only each outcome to unknown and add resolvedOutcome
committed: evaluation raises `decided command 0 needs stagedAt or clock`.
The two receipt forms describe the same resolved decision.

Evidence: [passing committed control](evidence/probes/resolved-receipt-false.case.json),
[failing resolved control](evidence/probes/resolved-receipt-true.case.json),
[actual error](evidence/probes/resolved-receipt-true.actual.json).

Proposed fix: normalize receipts consistently before stamp verification, and only
compute reference stamps when needed for clock-driven checking. Add unknown-to-
committed tests with receipt-only stagedAt, and preserve the original-instant
checks on replay observations.

### F3 — P2: far-future record cuts produce malformed-case errors instead of typed basis refusal

Severity: medium (wrong result/error surface for a valid public cut).

Locations: `lab/oracles/replay/views.py:88` and `lab/oracles/replay/stamps.py:18`.

R33 3.1 requires a requested T above the watermark to wait/refuse, with an
immediate refusal for far-future T. The stamp storage bound in 2.1 does not make
an otherwise finite, nonnegative public query instant a malformed oracle case.
The new gate calls stamp_cut first, which raises an input error for T >= 2^43.

Reproduction: the two valid transactions at 500 and 500.001, followed by a match
at recordedAt=8796093022208 (2^43), validAt=500. Expected: query error
E-BASIS-NOT-AVAILABLE, axis recordedAt. Actual: `OracleInputError: record instant
outside [0, 2^43)`. The ordinary future T=501 control returns the correct typed
error. The oracle should model the typed refusal, not elapsed waiting.

Evidence: [large-future case](evidence/probes/large-future-refusal.case.json),
[actual error](evidence/probes/large-future-refusal.actual.json),
[ordinary-future control](evidence/probes/idle-future-refusal.actual.json).

Proposed fix: handle above-representable-range query cuts as an unavailable basis
before converting to a stamp; keep strict range checks for actual receipt stamps.
Do not iterate stampCut over non-injective divisions outside the storage domain.

## Fresh verification

All work was offline, without engines, package installs, product core or adapter
source. No builder source was changed. Every new file is under `lab/verify/O06/`.
Heavy commands used `lab/bin/heavy.mjs` with CX-VO06 labels, waited for grants,
and started with more than 5 GiB host disk free. No engine reservation was needed.

The baseline source, selfcheck inputs, obligations, rulings and old golden corpus
were restored directly from the exact baseline Git commit, not copied from the
builder's mutable baseline directory. [Baseline inventory](evidence/baseline-inventory.json)
records all restored bytes. The existing golden converter was reused with explicit
CLI and corpus roots; the source under test ran as a black-box subprocess.

| Fresh check | Observed result |
| --- | --- |
| Builder SHA256SUMS | All 31 listed files match |
| Builder-authored fixtures | All 14 expected outcomes, including nine failing controls |
| O-REPLAY selfcheck | PASS, retaining its two reported missing historical review fixtures |
| Baseline full unit suite | 384 tests; the same two named failures |
| Builder-head full unit suite | 394 tests; the same two named failures; all ten new test methods run |
| Original golden corpus, core | All 341 (vector, item, verdict) triples identical to 0.4.9 |
| Original golden corpus, QLever | All 341 triples identical to 0.4.9 |
| Updated golden corpus | All 331 other triples unchanged on each lane; all ten G9-CUT-02b items AGREE per lane |
| Independent authored probes | 22 probes; 19 match the spec, three mismatches above |
| Raw-output source/input binding | All 522 golden outputs match their actual case bytes and exact runtime source hashes |

This preserves inherited non-green golden results: core has 317 AGREE,
19 AGREE-RULED, two VECTOR-BUG and three NOT-MODELED. QLever has 298 AGREE,
18 AGREE-RULED, 19 DISAGREE, one CONVERTER-ERROR, two VECTOR-BUG and three
NOT-MODELED. Legacy equality does not turn those into semantic acceptance.

The builder report says 385 baseline tests and nine new tests. The exact Git
baseline rerun here runs 384; the new test file defines ten methods, yielding
394 at the reviewed head. The two failure identities are nevertheless identical.

The source-bound evidence is [gates.json](evidence/gates.json),
[audit.json](evidence/audit.json), [probe results](evidence/probes/results.json),
[builder manifest check](evidence/probes/builder-manifest-check.json), the unit,
fixture and selfcheck logs, and each lane's results.json. Complete regenerated
baseline sources and golden cases/runs remain locally in the evidence tree and
are ignored by Git; [raw-inventory.json](evidence/raw-inventory.json) retains
paths, sizes and hashes. The authored probes and their full outputs are committed.
An accidental repeated audit invocation stopped at the existing-attempt guard;
its log is retained as `audit.log` and no first-attempt audit was overwritten.

## Rule-by-rule assessment

| Rule | Positive control and rejected wrong behavior | Assessment |
| --- | --- | --- |
| R-CMD-3 | StagedAt=500, second decision=500.001: assertion validFrom stays 500; builder negative-valid-default supplies the wrong decision-time default | Correct on the exercised defaulting path |
| R-RCP-7 | Declared staging clock matches stagedAt; increasing wrong reference stamp and mismatched staging clock fail; engine-stamped increasing instant passes | F2 on resolved receipts |
| R-RCP-9 | Same millisecond gets 500 / 500.001; ties and decreasing stamps fail; physical-group shared stamp passes and per-ordinal restamp fails; lost-ACK replay keeps original instant and changed instant fails | Exercised order, grouping and replay checks work; F2 affects resolved-outcome compatibility |
| R-JNL-5 | Journals valid from stagedAt, own assert/retract instants omitted, distinct older assertion instant retained, hydrated changes preserved; builder negative-journal-default and negative-raw-own-instant fail | F1 on cross-ordinal retraction |
| R-CUT-6 | At published W answers; above W refuses; a pending publication with instant <= R refuses even with explicit earlier P; builder negative-early-answer fails | F3 for far-future finite query instants |
| R-JNL-6 | Existing test keeps :_tx/instant X-NOT-MODELED | Unchanged as section 4.3 requires |

G9-CUT-02b is correct for its declared raw-lifetime and as-of surfaces. Both
staging clocks are 500; the distinct physical transactions get 500 and 500.001.
At R=500 the live value is x, and just before 500 there is no value. At
R=500.001 the value is y. Raw history retains B1's later retirement at 500.001;
as-of D1 suppresses that retirement, while as-of D2 shows it. The Q1 raw-match
expectation deliberately retains raw lifetime metadata. The ten comparisons per
lane freshly agree. This does not imply native product execution was checked.

## The two inherited unit failures and what they hide

Both fail at baseline 4efe962 as well as builder head:

1. `Coverage.test_every_section4_row_has_a_named_test`: no
   `LaneRanges.test_lane_datomic`.
2. `Coverage.test_oracle_error_table_has_no_row_the_contract_dropped`:
   E-UNAVAILABLE-CUT exists in the oracle table but not in the machine contract.

They are real contract-coverage problems, not new O06 semantic regressions. They
also short-circuit later assertions, so matching their names is insufficient.
The independent audit explicitly evaluated the skipped checks on both sources:

- Decimal and position named checks and the card-many named check are present.
- Seventeen exact erasure test names are missing: ER-INFLIGHT-PREFIXES,
  ER-CURSOR-ERASURE-PREFIX and CONTRACT-Q70A through CONTRACT-Q70O. Existing
  `test_Q66...` and `test_Q70...` methods exercise related behavior and ran in the
  full suite; this is a named-coverage mapping gap, not evidence that all those
  behaviors are untested. The Datomic failure hides this additional mapping gap.
- The second test's skipped PRODUCED-subset-of-ERROR_TABLE check passes.

See audit.json coverageTails for the exact baseline/final lists. These existing
issues must remain visible; a claim that the two failures hide nothing would be
incorrect. They do not hide F1-F3: those require the new probes, which the green
O06-specific unit tests omit.

## PASS / verdict / receipt audit

No code under review was fixed, no product or contract pin was changed, and this
review issues no promotion PASS. The following authored locations turn observations
into checks or a verdict:

- `probes.py:evaluate`, its predicate callbacks and results.json: compare parsed
  observed contents with explicitly authored rule expectations; preserve every
  case and full actual output or exception. Freshness comes from exclusive new
  output paths and refusal to overwrite results. Binding uses actual case hashes,
  the reviewed worktree's runtime hashes and the verified builder SHA256SUMS.
  Report-level PASS alone is never enough for the journal and query probes.
- `audit.py` golden comparisons: compare every item identity and verdict, require
  an independently restored baseline, and separately record all inherited gaps.
  The fresh gates record start/end times, commands, source head and log hashes;
  all 522 output documents are checked against their actual case bytes and
  exact baseline/final runtime files. No engine slot or engine inputs are claimed.
- `audit.py` coverage tails and unit summaries: inspect actual names, contract
  sets and raw failure logs from both attempts; do not infer skipped assertions
  from an unchanged top-level failure count. Full raw inventories preserve binding.
- `VERIFY.md` FIX-FIRST verdict: follows the three committed concrete case/output
  mismatches. The limited successful checks above are regression evidence, not
  acceptance of the implementation or of inherited golden disagreements.

`rerun.py` records subprocess exit codes without treating exit zero as semantic
acceptance. Reused builder fixture/converter verdicts are identified as such;
the independent content checks and source/case binding are in probes.py and audit.py.

## Reproduction and limits

From this worktree, direct black-box reproductions use the retained case files:

```sh
node lab/bin/heavy.mjs --label CX-VO06-repro -- python3 -I lab/oracles/replay/cli.py lab/verify/O06/evidence/probes/cross-ordinal-journal-own-instant.case.json
node lab/bin/heavy.mjs --label CX-VO06-repro -- python3 -I lab/oracles/replay/cli.py lab/verify/O06/evidence/probes/resolved-receipt-true.case.json
node lab/bin/heavy.mjs --label CX-VO06-repro -- python3 -I lab/oracles/replay/cli.py lab/verify/O06/evidence/probes/large-future-refusal.case.json
```

`rerun.py`, `probes.py` and `audit.py` retain first attempts; use a new evidence
root for a new complete review instead of overwriting receipts. Builder evidence
proof.json and SHA256SUMS were read and compared with these independent results.

Not done: product/core/adapter review, code fixes, live publication or two-second
wait timing, engine route equivalence, performance qualification, package checks,
merge, push, deployment or contract pinning. No subagents were spawned. No
unresolved spec question is needed to reproduce F1-F3; independent re-review is
required after their fixes.

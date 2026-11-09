# OBS01 round 12 independent correctness review

**Verdict: FIX-FIRST.** Reviewed `806d40b7576b4d41e0e4a59a87a4914bf0271b0b` on
`exp/OBS01-observer`, offline, as CX-VOBS7. Three Class A findings remain: a forbidden numeric clock call can be ignored;
an early return can certify a truncated section; ambiguous BTF can certify an unambiguous helper identity. These are
acceptance defects demonstrated with constructed inputs, not assertions about what the real VM/compiler emits.

Read the authoritative scope/protocol and preamble, REPORT.md Round 12 and VERIFY-round11.md. The report actually numbers
seven divergences; all seven are addressed below. This review changes only reviewer tools, evidence and this report.

## Fresh execution and evidence

Command (one heavy admission, 9,005,867,008 bytes free at runner entry):

```sh
node lab/bin/heavy.mjs --label CX-VOBS7-R12 -- python3 -B lab/verify/CX-VOBS7/run_round12.py
```

| Suite | Fresh result |
| --- | --- |
| `test_vm.py` | 14/14 |
| `test_syncwitness.py` | 18/18 |
| `test_round10.py` | 40/40 |
| `test_round11.py` | 20/20 |
| `test_engine.mjs` | 25/25 |
| `test_round12.mjs` | 18/18 |
| reviewer round 9 | 11/11 |
| reviewer round 10 | 4/4 |
| reviewer round 11 | 5/5 |
| new reviewer round 12 | 1 control passes; 7 refusal assertions fail, establishing the cases below |

Thus all **92 Python and 43 Node tests in the round 12 offline durability gate**, and all 20 prior reviewer fixtures, pass.
This is not a claim that every unrelated observer or repository suite ran. The resident/VM tests were excluded by the offline
instruction. The new reviewer suite exits **1**; the capture runner's exit zero means it finished recording, not acceptance.

[RUN.json](../../verify/CX-VOBS7/round12/RUN.json) records the reviewed head, attempt times, exact argv, child exits,
stdout/stderr hashes and 22 source hashes. `sourceUnchanged` is true. Exact logs and constructed inputs/results are under
[round12/](../../verify/CX-VOBS7/round12/INDEX.md), covered by
[SHA256SUMS](../../verify/CX-VOBS7/round12/SHA256SUMS). Earlier round 11 evidence was preserved: the replay changes only its
output directory to `round12/prior-round11`, recorded with the replay hash in RUN.json.

## Class A — must be fixed before W0

### R12-F1 — High: an unparsed forbidden call outside a section is silently discarded

Locations: `lab/bin/clock-proof.mjs:275`, also `:132`, `:183` and `:279`.
Failing fixtures: `lab/verify/CX-VOBS7/review_round12.mjs:38` and `:46`.
Evidence: [outside-unparsed-clock.json](../../verify/CX-VOBS7/round12/independent/outside-unparsed-clock.json),
[blank-unparsed-clock.json](../../verify/CX-VOBS7/round12/independent/blank-unparsed-clock.json).

Append this stage to an otherwise accepted complete 15-section dump:

```text
LLVM IR stage:
%t = call i64 inttoptr (i64 125 to i64 ()*)() ; comment: call site
```

Both `clockPrimitiveVerdict` and the complete pure `judgeW0` return **pass: true**, with no reasons or forbidden/unparsed
calls. The BTF fixture identifies 125 as `bpf_ktime_get_boot_ns`.

The comment contains a second `call` token, so `parseCallLine` returns `unparsed`. The whole-text scan explicitly discards
that result. The loose scan recognizes the IR helper, but the verdict reads only its `problems`, not its numeric helper
counts. No symbolic clock name occurs in the text to trigger the separate name scan. A second fixture puts the same line
after a blank at the end of the chosen section: `extractSections` suppresses UNPARSED-CALL after the blank, then the same
whole-text omission accepts it.

The IR comment is legal syntax; these are still **constructed mixed-stage inputs**, not recorded bpftrace output. The defect
is that unfamiliar output can be accepted when familiar sections remain. It is not the Class B case of an entirely unknown
format refusing. The explicit requirement that another clock in any stage refuses is violated.

Proposed fix: account for every call-like line in the representations/stages admitted by the proof; an unparsed call must
refuse rather than disappear, including across blank lines. If comments are supported, parse them explicitly and still
check the actual helper. Other stages must never supply positive completeness evidence.

### R12-F2 — High: an `exit` instruction is not evidence that the dump reached the end of a section

Locations: `lab/bin/clock-proof.mjs:187`, `:192`, `:254`.
Failing fixtures: `lab/verify/CX-VOBS7/review_round12.mjs:53` and `:86`.
Evidence: [early-exit-truncation.json](../../verify/CX-VOBS7/round12/independent/early-exit-truncation.json),
[contradictory-exit.json](../../verify/CX-VOBS7/round12/independent/contradictory-exit.json).

After 14 complete sections, the final constructed section has this control flow (the evidence retains raw instruction bytes):

```text
Disassembly of section s_probe_15:
  0: call 5
  1: if r0 == 0 goto +1
  2: exit
  3: call 125
  4: exit
```

The full dump correctly refuses the boot-clock branch. Its **proper prefix ending at instruction 2 passes both proof and
W0**, reporting all 15 sections complete. There is no recorded section length/end delimiter, instruction-offset or branch
target check. EOF after an early return is treated as a complete final section. Successful process status alone does not
establish that the text supplied to the proof is a complete representation of its bytecode.

A separate malformed-input negative replaces the final exit with:

```text
  4: 85 00 00 00 05 00 00 00 exit
```

Those bytes encode a call to helper 5, yet `isExit` trusts the textual `exit` independently of the bytes. Both proof and W0
pass a section with no final bytecode exit. This is another route through the same insufficient completeness check.

Proposed fix: bind section completeness to authoritative bytecode lengths or explicit complete-dump section/stage endings;
validate instruction offsets/control flow and opcode/mnemonic agreement. Refuse a supported-format prefix or disagreement.
An ordinary return instruction and an aggregate call count cannot establish that all emitted instructions were observed.

### R12-F3 — Medium: BTF validation accepts ambiguous helper identities and malformed evidence

Locations: `lab/bin/btf-helpers.mjs:88`, `:98`–`:101`; helper-map inversion at `lab/bin/clock-proof.mjs:235`.
Further strict-header/type gaps: `lab/bin/btf-helpers.mjs:28`–`:29`, `:47`–`:48`.
Failing fixtures: `lab/verify/CX-VOBS7/review_round12.mjs:64`, `:72`, `:79`.
Evidence: [aliased-clock-id.json](../../verify/CX-VOBS7/round12/independent/aliased-clock-id.json),
[duplicate-empty-enum.json](../../verify/CX-VOBS7/round12/independent/duplicate-empty-enum.json),
[malformed-btf.json](../../verify/CX-VOBS7/round12/independent/malformed-btf.json).

1. Construct `bpf_func_id` with `BPF_FUNC_ktime_get_realtime_ns = 5` **before** the ordinary entries, including
   `BPF_FUNC_ktime_get_ns = 5`. All required names retain their usual distinct IDs. `deriveHelperIds` returns `ok: true`
   because collision detection covers only the required-name subset. Inverting **all** enum entries into `nameById` then
   silently chooses the later monotonic name. A numeric `call 5` is certified monotonic despite the enum supplying two
   identities, one explicitly clock-like and forbidden. Proof and W0 both pass. Enum ordering must not decide helper safety.
2. Append a second, empty ENUM named `bpf_func_id`. The `values.length > 0` filter removes it before checking uniqueness;
   `deriveHelperIds`, proof and W0 all pass. The requested duplicate-enum refusal is not universal.
3. Set header byte 3 (reserved flags) to 255, or set reserved type-info bit 29 in the first type record. Neither is checked;
   both malformed blobs pass proof and W0. These two mutations preserve the extracted IDs: they demonstrate the claimed
   strict structural refusal is incomplete, **not independently that the observed clock changes**.

These are constructed BTF negatives, not a claim that the supplied Ubuntu 6.8 kernel emits any of them. The acceptance
problem is adopting ambiguous/malformed evidence as a unique helper proof, which the brief explicitly requires to refuse.
The alias case establishes loss of helper identity; the other cases expose related validation omissions.

Proposed fix: validate the complete selected enum, reject helper-ID aliases across **all** entries used by inversion, count
all matching named enum types before checking non-emptiness, and reject unsupported header flags/reserved type bits. Keep
the existing missing-name, duplicate-enumerator, bounds, ENUM/ENUM64 and signed-value checks. Inversion must only receive
a validated one-to-one helper mapping.

## Requested checks that pass, with an A1 qualification

**A1 final W0 acceptance is fail-closed on command status.** `runFailure` requires integer exit zero and `timedOut === false`,
and rejects signals/errors, for compile, version, hash and BTF. The builder tests exercise 13 bad statuses per process; the
independent control matrix repeats seven per process through both the proof and W0. All refuse. Static inspection of
`sync-witness.mjs:338` and `:360` confirms that these statuses are supplied by the harness; no container path was executed.

The literal stronger phrase "no dump is adopted unless all four succeeded" is not fully implemented: `adopt` at
`clock-proof.mjs:242` checks compile and BTF only. A failed version/hash command still populates 15 parsed sections and helper
counts, although the accumulated failure keeps `pass: false` and W0 refuses. The retained process-control rows expose this.
Gate adoption on all four successful processes if the diagnostic fields are intended to meet that requirement; this
metadata discrepancy itself is not an additional false-W0 acceptance finding.

**Existing A2 negatives now work:** the original parenthesized numeric call 125 is recognized and refuses; malformed calls
inside recognized instruction lines produce UNPARSED-CALL; absent/duplicate/empty sections, missing last exits, ordinary
truncations and unlisted IDs in parsed sections refuse. No other stage supplies the positive monotonic-call count. The gaps
above show why these passing cases do not establish universal completeness or refusal.

**BTF positive and existing negative behavior:** the fresh builder suite passes both ENUM and ENUM64 extraction, changed IDs,
missing names, duplicate enumerators/nonempty enums, required-ID collisions, every strict prefix, section bounds/layout,
bad magic/version, strings, unknown kinds and overrunning records. IDs come from the supplied BTF, not the reference table.
No real kernel BTF or fresh primary UAPI header was read in this offline review.

**Reviewer fixture edits confirmed.** Compared `review_round11.mjs` at `ba10e8f7` with reviewed `806d40b7`. The only changes
are imports, the positive sectioned dump and version/hash/BTF fixture facts. All eight lines containing assertions are
byte-identical after trimming indentation; inspection of the full diff confirms no assertion, test body or negative input
changed. The fresh replay passes all five tests. The old retained round 11 results are historical and were not overwritten.
See [fixture-edit-audit.json](../../verify/CX-VOBS7/round12/fixture-edit-audit.json) and
[the exact diff](../../verify/CX-VOBS7/round12/review-round11-builder.diff).

## Class B — real W0 evidence only; these alone do not block ACCEPT-OFFLINE

| Question | Fail-closed behavior / first-run evidence needed |
| --- | --- |
| bpftrace v0.20.2 flag acceptance and actual disassembly markers/spellings | A failed command, empty dump or wholly unsupported section format refuses. Retain actual command/status/stdout/stderr; add a real complete golden dump. F1/F2 are separate Class A gaps for partially recognized input. |
| Real BTF section layout, type mix and the presence of `enum bpf_func_id` | Unsupported layout/kind or missing required enum/name refuses. Retain the actual BTF identity and derived enum; the current constructed fixtures do not establish compatibility. F3 addresses accepted ambiguity rather than conservative real-format rejection. |
| Allow-listed output/read helper alternatives emitted by this compiler | An unlisted parsed helper refuses. Observe whether the pinned compiler emits the allowed alternatives. No old-kernel blocker is alleged: the task supplies kernel **6.8.0-117-generic**, with ring-buffer and TAI helpers present. Their real BTF export remains unobserved here. |

REPORT divergences: 1 (chosen representation/completeness) has F1/F2 Class A limitations; 2 is the flag Class B question;
3 fixture edits are confirmed; 4 is compatible with the supplied kernel feature fact, with actual compiler output Class B;
5 the pinned-image base64 transport is statically wired but not executed, and its broad "corrupt transfer fails" statement
must not substitute for F3's missing validation; 6 cross-stage strictness has F1 and the BTF boundary has F3; 7 API changes
are exercised by the pure verdict tests. No Class B question is promoted to an observed VM failure.

## Verdict/receipt audit (rule 9a)

| Reviewer site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run_round12.py` command records / source equality | Exact child exits and raw stdout/stderr; checks 22 source hashes before/after; records failures without changing them to PASS | New `round12/` directory and attempt times; no historical output adopted | Exact reviewed head, argv, hashes and replay transformation; no engine-slot claim |
| Round 9/10 OUT overrides and round 11 replay | Original assertions; round 11 differs only by output directory | Fresh function executions into new per-round subdirectories | Original fixture hashes and exact replay hash/bytes; old evidence untouched |
| `review_round12.mjs` assertions, `evaluate` / `retain` | Expected refusal compared with actual proof and full pure W0 verdict; input text/BTF retained before failing assertions | Fresh pure calls on constructed inputs in this attempt | Actual pinned .bt bytes/hash, recorded dump text/BTF bytes; W0 engine facts explicitly stand-ins |
| Fixture edit audit | Full old/new diff, identical assertion lines and old/new SHA256 | Comparison performed in this review | Both exact commits, path and retained diff hash |
| SHA256SUMS and this FIX-FIRST verdict | Manifest verified against actual evidence bytes; verdict rests on the retained failed assertions, with duplicates grouped into three findings | This source-bound attempt only | Reviewed head, test/source hashes and saved case inputs; no live compilation, durability or VM acceptance claim |

No `lab/acceptance` file or previously tracked implementation/reviewer file was edited by this review. No pinned existing
path's hash moves, so there is no acceptance re-pin requested. Evidence is below 1 MB per file and 5 MB per directory.

Not performed: implementation fixes, VM/Docker/Colima/engine/network commands, image build, actual bpftrace compilation or
attachment, reading real kernel BTF, W0–W4, B9/CR-NS integration or unrelated repository suites. Open questions are the Class B
real-output/compatibility items above; the reproduced Class A findings are the reason for FIX-FIRST.

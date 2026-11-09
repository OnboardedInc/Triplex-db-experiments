# OBS01 round 13 independent review

**Verdict: FIX-FIRST.** Reviewed `b167510f0890e68b803288573228119073738784` on `exp/OBS01-observer`, as CX-VOBS7,
offline. One Medium finding remains in requested check 2: the static source check can erase executable time reads when
ordinary string literals contain comment delimiters. The actual pinned `.bt` passes and was not changed.

I apply **pending Q109a as the review contract**, as directed. I do not dispute its stated trusted-image/pinned-source
boundary. Crafted dump structure, numeric-only dump calls, unknown dump formats and early-exit truncations do **not**
contribute to this FIX-FIRST verdict. The finding concerns the source checker that Q109a retains as a gate.

Read the authoritative scope/protocol, REPORT.md Round 13 and VM.md (including its superseding Round 13 rules). North-star
reason: correctness of the durability observer is a prerequisite for the lab's atomic-commit and ordering measurements.

## Fresh runs

```sh
node lab/bin/heavy.mjs --label CX-VOBS7-R13 -- python3 -B lab/verify/CX-VOBS7/run_round13.py
```

The wrapper waited for a heavy slot, then ran one capture attempt with 10,528,346,112 bytes free at runner entry.

| Suite | Result |
| --- | --- |
| `test_vm.py` | 14/14 |
| `test_syncwitness.py` | 18/18 |
| `test_round10.py` | 40/40 |
| `test_round11.py` | 20/20 |
| `test_engine.mjs` | 25/25 |
| `test_round12.mjs` (now includes round 13 cases) | 24/24 |
| reviewer round 9 | 11/11 |
| reviewer round 10 | 4/4 |
| reviewer round 11, current revised expectations | 5/5 |
| reviewer round 12, current revised expectations | 8/8 |
| new reviewer round 13 | 3/5: controls pass; two source-refusal assertions fail for one defect |

All **92 Python and 49 Node tests listed by the builder, plus 28 prior reviewer fixtures**, pass. The new reviewer suite
exits **1**. The runner exits zero after recording outcomes; its completion is not an acceptance verdict.

[RUN.json](../../verify/CX-VOBS7/round13/RUN.json) binds exact argv, exits/log hashes, attempt times and 23 source hashes to
the reviewed head. `sourceUnchanged` is true. Prior reviewer output is redirected into fresh `round13/prior-round*`
directories; earlier evidence is unchanged. For JavaScript replays, only the output path is replaced, with exact generated
bytes/hashes recorded. [INDEX.md](../../verify/CX-VOBS7/round13/INDEX.md) describes all evidence and
[SHA256SUMS](../../verify/CX-VOBS7/round13/SHA256SUMS) covers it.

## R13-F1 — Medium: source comment stripping can erase actual time builtins inside otherwise valid code

Locations: `lab/bin/clock-proof.mjs:96` and `:102`; gate consumption at `:252`–`:254`.
Failing fixtures: `lab/verify/CX-VOBS7/review_round13.mjs:41` and `:46`.
Evidence: [url-string-source.json](../../verify/CX-VOBS7/round13/independent/url-string-source.json) and
[block-string-source.json](../../verify/CX-VOBS7/round13/independent/block-string-source.json).

Insert either statement sequence into the existing BEGIN block of a copy of the pinned source:

```c
printf("https://clock"); @review_clock = nsecs(boot);
```

```c
printf("/*"); @review_clock = nsecs(boot); printf("*/");
```

These contain a real default/boot-clock builtin, not a comment. Yet `sourceTimeSites` reports **`other: []`** for both.
The URL case reports only one monotonic site (the original source has 15), because stripping `//` inside the string also
leaves quotes unbalanced for the next regex. The block-delimiter case reports all 15 monotonic sites and drops just the
inserted executable code. Both proof and pure W0 accept with matching hashes for the source copy and clean process facts.

The root cause is order and lexical context: block and line comments are removed without respecting quoted strings,
**before** strings are stripped. Thus an ordinary string can change which executable tokens the gate sees. The same two
wrappers make all nine independent source cases pass: bare `nsecs`, `nsecs()`, `nsecs(boot)`, `nsecs(tai)`, `nsecs(sw_tai)`,
`elapsed`, `jiffies`, `time(...)` and `strftime(...)`. Without those string wrappers, all nine correctly refuse.

This reproduction changes **source input to the required static checker**, not dump structure. Every source copy is
retained with its computed source hash; the same neutral dump/control facts are used across the refusing and accepted
source cases. No claim is made that these copies were compiled or that their real output would lack a forbidden token.
The independent failure is that gate (1) says the source has no other time read when it does; gate (3) does not repair that
source-check result. This directly fails requested check 2 under Q109a and requires no candidate ability to write the
lab-pinned file. A legitimate lab-authored source edit can introduce the ordinary strings involved.

The **current pinned source is clean**, with 15 `nsecs(monotonic)` sites and no other time builtin. I do not allege that its
current program reads the wrong clock or that a real W0 run already accepted an incorrect clock.

Proposed fix: tokenize strings, escaped quotes, line comments and block comments together, preserving executable tokens
outside them; then check the resulting time-builtin tokens/calls. A syntax-aware scanner/parser should refuse unsupported
lexical input. Merely swapping two independent regex replacements can still mishandle quote characters inside comments.
Keep both regressions and the undecorated builtin controls. No implementation fix was made in this review.

## Disposition of the five requested checks

**1. Gate versus diagnostic: implemented as Q109a describes.** `clockPrimitiveVerdict` builds the top-level `bad` reasons
only from source/hash binding, the source time check, exact default version `bpftrace v0.20.2`, all four process statuses,
nonempty joined stdout/stderr, and the forbidden-name scan. The final `pass` is `bad.length === 0`. Structured sections,
allow-list/helper IDs, source-helper derivation, counts and BTF content feed `diag`, not `bad`.

Independent controls hold source/dump/statuses fixed while changing valid BTF to empty/missing-helper BTF: diagnostic
pass/fail changes, while the gate and W0 remain true. All seven independently repeated bad-status cases on each of the four
processes refuse and leave `diagnostic.adopted` false. Hash/version/empty-output negatives and every token in both streams
also refuse. The builder suite adds its 13-status matrix and nine-token/six-placement matrix. No diagnostic result rescues
a gate failure or blocks a gate success in these tested paths.

The token list and case-insensitive substring matching match VM.md exactly; numeric-only calls and token-free nonempty
garbage pass by the authorized decision. I do not relabel those intended outcomes as acceptance defects. The harness
statically writes the full stdout/stderr dump file and records `dumpFileSha256`, while the verdict hashes the joined text
it actually scans as `compiledSha256`. The real container/file-writing path was not exercised offline.

**2. Source check: pinned control passes; universal refusal fails R13-F1.** The unwrapped time forms above refuse, as do
the builder's additional `nsecs_*`/`ktime*` examples. Recognizing those names is insufficient when the lexer can erase
them. This is the only blocking finding.

**3. R12-F3 requested fixes: verified.** In both ENUM and ENUM64 fixtures, clock-like helper aliases before or after the
normal entries refuse independent of the required-name subset. All named `bpf_func_id` enum types count before the empty
check; duplicate-with-empty and only-empty cases refuse. Every nonzero header-flags byte (1–255) and each reserved type-info
bit (16–23, 29, 30) refuses. Together these are 273 independent negative cases, all passing their refusal assertions.
The existing builder suite checks positive signed-kind-flag behavior and ordinary BTF extraction. Collision detection now
covers every `BPF_FUNC_` helper entry used in inversion; the non-helper `__BPF_FUNC_MAX_ID` sentinel is not mapped as a helper.
Only BTF read **process status** gates W0 under Q109a; BTF content refusal remains a diagnostic.

**4. All eleven reviewer expectation changes follow the decision.** Full comparison is retained as
[reviewer-fixture-builder.diff](../../verify/CX-VOBS7/round13/reviewer-fixture-builder.diff), with old/new source hashes,
numbered markers and replay equality in [fixture-edit-audit.json](../../verify/CX-VOBS7/round13/fixture-edit-audit.json).

| Change | Reviewed outcome and reason |
| --- | --- |
| 1 | Nonempty unknown/error-like output passes; empty output refuses. This follows the nonempty/token-only dump gate. |
| 2 | Numeric/IR-only forbidden helper calls pass with diagnostic failure; named forbidden forms still refuse at the gate. |
| 3 | The old numeric partial-dump case passes W0 and fails the diagnostic. |
| 4 | Outside-section numeric/unparsed case passes gate/W0; diagnostic refusal also checks the disclosed diagnostic improvement. |
| 5 | Blank-line variant has the same disposition as 4. |
| 6 | Full early-exit fixture with numeric 125 passes the gate and fails the diagnostic. |
| 7 | Its truncated prefix passes gate and diagnostic. The disclosed early-exit diagnostic gap is explicitly preserved, not claimed fixed. |
| 8 | Helper alias still makes derivation refuse; BTF-content demotion makes gate/W0 pass and diagnostic fail. |
| 9 | Duplicate empty enum still makes derivation refuse; same gate/diagnostic separation as 8. |
| 10 | Flags/reserved bits now make derivation refuse; gate/W0 pass and diagnostic fails. The additional direct derivation assertion strengthens R12-F3 coverage. |
| 11 | Contradictory raw exit passes the token gate and fails the improved diagnostic. |

No fixture input, process/hash/version negative, or named-token refusal was weakened for an unrelated reason. All gate
expectation flips follow Q109a. The added diagnostic/direct-derivation assertions also check the **separately disclosed**
R12 parser/BTF fixes; those are not claims that demotion alone fixed parsing. The builder-regenerated round 11 replay is
exactly its canonical fixture with only the output directory changed. Some retained fixture titles/`expected` strings still
describe their historical purpose; the new explicit assertions and this table define the reviewed current outcomes.

**5. Listed suites and revised round 9–12 fixtures: all pass**, as detailed above. Their success is distinct from the two
new source assertions that establish R13-F1.

## Remaining evidence and scope

The trusted-image assumption is taken as given for this task. Actual bpftrace `-d all` output, image execution, real kernel
BTF and the future reviewed golden remain unobserved here. Those compatibility/evidence items do not themselves block this
review, nor do the known structured-diagnostic gaps. This report does not recommend promoting that parser before golden
review and does not infer a live clock guarantee from constructed outputs.

## Verdict/receipt audit (rule 9a)

| Reviewer site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run_round13.py` command records/source check | Exact exits and raw output hashes; source equality; failing suites remain nonzero records | New attempt directory/times, after heavy admission | Exact reviewed head and 23 source hashes; no engine slot or live VM claim |
| Prior fixture OUT overrides / generated replays | Original current assertions; only output-path substitutions | Fresh per-round executions; historical evidence untouched | Canonical fixture hashes and replay bytes/hashes/transformations in RUN.json |
| `review_round13.mjs` source assertions / retained rows | Compares actual source token findings and proof/W0 booleans with required refusal; all source copies/hash identities retained | Fresh calls on newly constructed source cases | Actual pinned-source hash, exact inserted statements, neutral dump/control inputs; W0 engine facts are stand-ins |
| Gate controls and BTF assertions | Gate separation/status/token negatives, exhaustive flags/reserved-bit checks and both enum forms | Fresh pure calls in this attempt | Source/test/helper hashes; BTF construction recipe and each resulting BTF hash; no real kernel identity claim |
| Fixture edit audit | Exact old/new diff, eleven numbered changes, regenerated-replay equality | Read and compared during this review | Both commit IDs, paths, old/new SHA256 and diff digest |
| SHA256SUMS and FIX-FIRST verdict | Evidence byte hashes verified; one finding supported by two failed assertions and eighteen source variants | This source-bound attempt | Reviewed head and saved inputs/results; no crafted-dump case contributes to the blocking verdict |

Only new reviewer tools/replays/evidence and this report are added. No previously tracked implementation or fixture was
edited by this review; `lab/acceptance` is unchanged and no existing pinned path's hash moves. Every evidence file is below
1 MB and the evidence directory is below 5 MB.

Not performed: implementation fixes, VM/Docker/Colima/engine/network commands, compiling the source variants, a real image
build or bpftrace dump/attach, W0–W4, B9/CR-NS integration, or unrelated repository suites. The open items are the source
checker fix and the later real-output/golden review.

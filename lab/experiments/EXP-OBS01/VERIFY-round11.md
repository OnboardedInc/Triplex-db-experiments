# OBS01 round 11 correctness review — FIX-FIRST

Reviewer CX-VOBS7, Codex gpt-6.1-sol (high). Reviewed `exp/OBS01-observer` at
`44607c6da735c98f8b788913c5709b8377b7147e`.
North star: P2/P3 correctness under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

**FIX-FIRST:** R10-F1 and R10-F2 are fixed; the observational clock check no longer substitutes for proof. Two **Class A**
fixtures nevertheless make both the new compiled-program proof and the complete pure W0 verdict return PASS on insufficient
evidence. Fix those before the first W0 run. Real flag acceptance and complete rejection of wholly unknown dump formats are
**Class B**, and do not independently block offline acceptance. No implementation was changed, no VM/network command ran.

## Fresh evidence

Read the authoritative scope/protocol, preamble, VERIFY-round10.md, REPORT.md Round 11 and VM.md Round 11. REPORT lists
divergences 1 through **11**, including the fixture correction, result shape and timeout additions; all are considered below.

Invocation: `node lab/bin/heavy.mjs --label CX-VOBS7-round11 -- python3 -B lab/verify/CX-VOBS7/run_round11.py`.
Host disk exceeded 5 GiB. The command waited for shared admission and ran one offline batch.

| Fresh suite | Result |
| --- | --- |
| `test_vm.py` | 14/14 pass |
| `test_syncwitness.py` | 18/18 pass |
| `test_round10.py` | 40/40 pass |
| `test_round11.py` | 20/20 pass |
| `node --test lab/observer/test_engine.mjs` | 25/25 pass |
| Reviewer `review_round9.py`, fresh OUT | 11/11 pass |
| Reviewer `review_round10.py`, current authorized observational expectation, fresh OUT | 4/4 pass |
| New reviewer `review_round11.mjs` | 3 controls pass; 2 Class A regression assertions fail; no test errors |

That is all **92 Python and 25 Node** builder tests, plus both requested prior reviewer suites.
Receipt: [`round11/RUN.json`](../../verify/CX-VOBS7/round11/RUN.json).
Raw logs and input/output cases: [`round11/`](../../verify/CX-VOBS7/round11/).
Manifest: [`round11/SHA256SUMS`](../../verify/CX-VOBS7/round11/SHA256SUMS).
The runner binds the reviewed head, 17 executed source/test hashes, exact command/output bytes, a fresh attempt directory and
an end-of-attempt source equality check. Earlier review evidence was not overwritten. All compiler dumps in the new fixtures
are **constructed**, and all non-clock W0 facts used in those pure-function fixtures are stand-ins, not observations of engines.

## Class A — must fix before W0 can qualify anything

### A1 — High: failed or missing compiler exit status still yields a clock proof and W0 PASS

Locations: `lab/bin/clock-proof.mjs:80`–`:91`; `lab/bin/sync-witness.mjs:349` and `:175`.
Fixture: `lab/verify/CX-VOBS7/review_round11.mjs:46`,
`a nonzero or missing compile exit status must refuse even after printing valid IR`.
Evidence: [`independent/compile-failure.json`](../../verify/CX-VOBS7/round11/independent/compile-failure.json).

Supply the correct source/hash/version, 15 recognized monotonic-helper IR calls, `timedOut:false`, and compiler exit status
**1**, **2**, **null**, or missing. Stderr says compilation failed after IR generation. Every case returns
`clockPrimitiveVerdict.pass=true` and `judgeW0.pass=true` when the other pure W0 inputs are good. The verdict checks timeout,
but never requires `compiled.exitCode === 0`, and ignores this error text.

The actual compile path uses `spawnSync` and returns its status; it does not throw on a failed compilation before the verdict.
An earlier IR stage can exist even if a later stage fails. Counting its calls is not evidence that the requested compilation
completed. This is a false proof result **independent** of whether `-d all` is eventually the right flag, so it is Class A.

Proposed fix: require recorded, successful completion (`exitCode === 0` and no timeout/process error) before parsing/adopting
the dump. Keep diagnostics, but do not adopt a partial compilation. Propagate/check success of the version/hash subcommands
as appropriate instead of treating their recorded exit codes as decorative metadata. Add partial-output failures, null status,
signals and missing-status tests through both the proof and W0 verdict.

### A2 — High: partial format recognition can ignore a forbidden time read while asserting every read is monotonic

Locations: `lab/bin/clock-proof.mjs:47`–`:60`, `:83`–`:91`.
Fixture: `lab/verify/CX-VOBS7/review_round11.mjs:56`,
`a partly recognised dump must not ignore a numeric forbidden helper call`.
Evidence: [`independent/partial-dump.json`](../../verify/CX-VOBS7/round11/independent/partial-dump.json).

Append this numeric call-instruction variation to 15 recognized monotonic IR calls:

```text
  99: (85) call 125
```

The parser ignores the line: its assembly regex accepts raw byte tokens but not the parenthesized opcode, and its verifier
regex requires a symbolic `bpf_name#id`. The proof reports only 15 calls to helper 5, no forbidden helpers and no problems.
Both **proof and W0 return PASS**, even though 125 is explicitly a forbidden clock helper in the implementation's own table.
This reproduction does not depend on independently establishing that table's kernel provenance.

The fixture is a constructed partial-format variation, **not a claim that bpftrace 0.20.2 actually emits this exact line**.
What it establishes is that unfamiliar output is not universally fail-closed: it fails only when insufficient familiar output
remains. A new/unsupported call format mixed with recognized IR can be silently dropped. Thus waiting for real dump format
alone does not resolve this quality-of-proof defect. It is Class A rather than the Class B case of a wholly unknown dump.

Proposed fix: choose and validate a complete compiled representation/section, account for every helper-call instruction in it,
and refuse on unparsed call sites or incomplete sections. Support known numeric opcode forms where appropriate. Do not let
recognized calls from another stage rescue an unparsed stage. Retain a real full dump when available, but add mixed-format and
partial/truncated-output negatives now. A lower-bound total across all occurrences/stages is not a completeness proof.

## Class B — real W0 output will settle these; they alone do not block ACCEPT-OFFLINE

| Question | Current behavior and required first-run evidence |
| --- | --- |
| Does bpftrace v0.20.2 accept `-d all` as the intended non-running compile/dump mode? | Not observed here. Empty output and wholly unrecognizable output refuse; timeout refuses. Record exact version, command, exit and full stdout/stderr at W0. A1 must first make partial non-successful output refuse too. |
| Are the constructed LLVM/assembly/verifier spellings the real complete output format? | Unverified. A wholly unsupported dump fails the recognizable-call/count rules. Add a real recorded golden dump and its section/probe coverage when W0 obtains it. A2 must first close the mixed recognized/unrecognized case. |
| Does optimization leave the expected source-site count or duplicate it across stages? | The current `>=` rule can cause a conservative first-run refusal; observed output is needed to set a justified representation/count rule. A count must not substitute for accounting for all call sites (A2). |
| Does the Linux helper take genuine local BOOTTIME reference readings under Q100q? | macOS tests cannot exercise the real Linux clock path. Missing independent references are explicitly INCONCLUSIVE; observational consistency never replaces the compiled proof. Validate the actual references at W0 without claiming identity from a zero separation. |

No Class B question above is presented as an observed VM failure, and none would be a blocker by itself under this task's
acceptance rule. The two Class A reproductions are the reason for FIX-FIRST.

## Requested fix checks

**R10-F1:** `witness_context` at `vm_normalizer.py:489` iterates **all** WAL events, rejects missing/non-int/negative timestamps
(`type(at) is int`, so bool is rejected), checks each against the effective attempt `[lower,upper]`, then includes every chunk
in the maximum coverage bound. `normalize` supplies those bounds at `:590`. The new 20-test suite includes both clock modes,
one-of-two missing timestamps, all malformed types, stale/future times and boundary equality. The old reviewer removal fixture
now actually removes timestamps and gets TRACE-INCOMPLETE.

The fixture correction at `test_syncwitness.py:238` stamps WAL events at 580,000,000 ns **before** applying test mutations.
It does not overwrite a removed/corrupted timestamp afterward. Final readbacks remain 590,000,000 ns, trace detach is
599,000,000 ns, and the attempt ends at 600,000,000 ns. The real collector already stamps emitted WAL chunks in
`vm_watch.py:256`. The correction fixes invalid positive fixture setup without hiding negatives: the passing removal/type/
late-tail tests demonstrate that mutations survive to the judge. No timing enforcement was relaxed.

**R10-F2:** `judge_witness` at `vm_normalizer.py:440` now independently tests `any(at < lower)` and
`any(lower <= at < upper)`. A per-commit boolean emits uncertainty once. Passing tests cover ACK permutations, duplicates,
the lower/upper endpoints, multiple members bound through `commit_views`, two commits, U independence and exact file syncs.
The original multi-ACK reviewer fixture now returns both codes; the proven violation stays primary.

**R10-F3 binding and observation:** correct source/hash/version controls pass/refuse as intended; the source analysis finds
15 monotonic sites and no alternative source time read. The harness hashes source before/after and uses the same pinned image
for version/hash/dump, then records the dump digest. The observational check now reports all three statuses. A missing proof
cannot be rescued by CONSISTENT observations; INCONCLUSIVE observations can accompany an otherwise valid program proof;
INCONSISTENT transport refuses W0. These are verified offline pure-function behaviors. Their success does not cure A1/A2.

## Linux UAPI helper-enum verification gap

The expected reference values for the requested Linux BPF helper ABI are:

| Helper | Expected ID | Code's ID |
| --- | --- | --- |
| `bpf_ktime_get_ns` | 5 | 5 |
| `bpf_jiffies64` | 118 | 118 |
| `bpf_ktime_get_boot_ns` | 125 | 125 |
| `bpf_ktime_get_coarse_ns` | 160 | 160 |
| `bpf_ktime_get_tai_ns` | 208 | 208 |

**Limitation:** those reference values are stable ABI knowledge, not a freshly read primary header in this attempt. I searched
the local checkout/evidence, installed toolchains/caches and relevant include paths and found only BSD/macOS BPF headers,
not Linux `include/uapi/linux/bpf.h` or generated libbpf helper declarations. No network or VM read was used to fill that gap.
Therefore the requested **independent primary-UAPI enum derivation was not completed**, and this report does not certify it as
freshly verified. The parser tests using `FORBIDDEN_CLOCK_HELPERS` check behavior against the declared table and must not be
mistaken for an independent header check. Retain a pinned upstream Linux UAPI header (including its ordered mapper/enum) and
derive/check these five values before relying on that part of the proof. No demonstrated ID mismatch is alleged here.

## REPORT divergences disposition

| Item | Assessment |
| --- | --- |
| 1 flag unverified | Class B for empty/unknown/timeout output; A1 is the separate partial-failure acceptance gap. |
| 2 constructed parser samples | Appropriate labeling; actual format is Class B, but mixed-format omission is Class A2. |
| 3 memory-derived helper IDs | Values match the expected ABI reference table above; fresh primary-header audit remains explicitly incomplete. |
| 4 count `>=` / repeated stages | Disclosed and insufficient for the absolute every-read claim unless complete representation coverage is established (A2). |
| 5 placeholder positional arguments | Constants change dev/directory filtering, not the requested source clock builtin; source hash/version binding is explicit. Actual attached bytes remain a later integration check. |
| 6 observational uncertainty/status | Matches the revised role; no observational-only W0 clock PASS. |
| 7 null BOOTTIME reference on macOS | Explicitly INCONCLUSIVE; no substitute clock invented. Real Linux behavior is Class B. |
| 8 prior reviewer expectation changed | Authorized by the decision; all four round 10 fixtures still execute, and the two judge regressions retain their assertions. |
| 9 shared fixture now stamps WAL | Correct and does not hide post-setup mutations, as verified above. |
| 10 new W0 result shape | Makes proof versus observation explicit; cannot rescue a failed/missing proof. |
| 11 entrypoint/timeout additions | Timeout path fails the proof. Non-timeout compiler failure is not rejected and must be fixed (A1). No real container path was executed here. |

## Verdict/receipt audit (rule 9a)

| Reviewer site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run_round11.py` command records | Captures exact child exits/stdout/stderr; source equality check | Fresh `round11/` directory and attempt times | Reviewed head and 17 exact source hashes; manifest covers cases/logs; no engine slot claim |
| `review_round11.mjs` three controls | Positive proof and exact source/version, forbidden-call and missing-proof negatives | Pure verdict invoked anew on constructed data | Actual pinned source bytes/hash and explicit constructed dump text |
| `review_round11.mjs` A1/A2 assertions / `retain` | Required refusal compared to actual proof and complete pure W0 output | This attempt's function calls; failures retained | Exact test/helper source hashes and saved inputs/results; W0 engine facts are labeled stand-ins |
| This FIX-FIRST verdict | Two retained Class A assertion failures; requested suites and prior fixes pass | Review of 44607c6d, not builder historical receipts | Same source equality check and retained evidence; no claim of real compilation or VM acceptance |

Only this report and new reviewer tools/evidence are added. No `lab/acceptance` or implementation path is edited, and no pinned
path's hash moves as a result of this review. Evidence is below 1 MB per file and 5 MB per raw-output directory.

Not performed: implementation fixes, VM/container/engine/network commands, a real image build, real bpftrace parsing/attach,
W0–W4, B9/CR-NS integration or full-repository checks. Open evidence items are the real dump/flag behavior and the primary UAPI
header audit; those remain distinct from the reproduced Class A acceptance defects.

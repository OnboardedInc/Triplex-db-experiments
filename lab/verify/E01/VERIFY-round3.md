# E01 round 3 integrity re-test — CX-VE01-4

North star: correctness of the evidence used to judge P1–P5; goals and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

Target: `exp/E01-claim-evaluator` at **388209d8f4ee23ab4a8ef8fd0ebafadfbdee0f79**, implementation **c73de9886f5ee26c6aebed64bf208cefb6f9a0f7**, contract **0.3.10**. Review branch started at **9a1f51eb1aed7a8f5ff099dcfde5472eacd0d1ad**. No evaluator code was changed. Main-checkout files were read-only, except the explicitly shared heavy semaphore directory.

All commands execute against a detached target worktree, `/private/tmp/tx2-ve01-target-388209d-CX-VE01-4`; prior verifier scripts were copied unchanged to their original relative paths there. Fresh tools and results are in [round3](round3/). [source.json](round3/source.json) binds the target and verifier sources; [ruling-Q81a.txt](round3/ruling-Q81a.txt) captures the authoritative main-checkout ruling read for this review. Earlier evidence remains historical and unchanged.

The host sandbox probe is unavailable in this managed process: `sandbox-exec` exits 71 with `sandbox_apply: Operation not permitted` ([probe](round3/sandbox-probe.json)). Unmodified legacy tests therefore use automatic fallback; supplemental and new tests explicitly select `sandbox:false`. This review measures detection, not OS containment.

**Verdict: ACCEPT — safe to merge the Q81a evaluator fix.** No new merge-blocking finding. Both prior F11 reproductions now refuse, and all requested additional variations with a missing or changed byte sequence refuse specifically as INPUT-TAMPERED after their semantic answers pass. The full lab suite passes and the reference replay agrees. Acceptance here is of the evaluator change within its documented detection boundary, not production qualification or arbitrary-code containment.

| Fresh command through `heavy.mjs` | Result | Evidence |
| --- | --- | --- |
| `node --test lab/bin/test/*.test.mjs` | **128/128 PASS**, exit 0, no skips/cancellations; 174.27 s after admission | [all.tap](round3/all.tap) |
| Original `v-e01.test.mjs` | **8 PASS / 15 FAIL**, exit 1; obsolete assertions explained below | [prior.tap](round3/prior.tap) |
| Round-2 delta | **12 PASS / 1 FAIL**, exit 1; old gap assertion now false | [delta.tap](round3/delta.tap) |
| Round-2 supplement | **3/3 PASS**, exit 0 | [supplement.tap](round3/supplement.tap) |
| Explicit fallback T1/T4/T2 | **3/3 PASS**, exit 0 | [fallback-routes.tap](round3/fallback-routes.tap) |
| New input variations and controls | **8/8 PASS**, exit 0 | [input-variations.tap](round3/input-variations.tap) |
| Reference replay | **70/70 agree**, 13,840 executor calls, no differences/self-check errors; 63/63 document verdicts DIAGNOSTIC; exit 0 | [reference.json](round3/reference.json) |

[command-status.json](round3/command-status.json) retains exact argv, UTC times, durations including queue waits, and observed exit codes. Each command has separate raw stdout and stderr; heavy admission waits were real and retained. No admission started below the 5 GiB host-free floor.

## Source review and Q81a

Line references in this report refer to **388209d**, not the older evaluator on this review branch. `lab/bin/claim.mjs:1235–1239` reads each input pathname and hashes its bytes, treating missing/unreadable files as a mismatch. `:1242–1245` retains the original content hash/path once, and checks on reuse. `:1398–1401` iterates **every retained input** before the final build/oracle checks. `:1455` invokes that final verifier within the separately caught end-check phase, before cleanup; reasons other than the two gate disclaimers prevent offline qualification. No source change to this mechanism was needed or made.

## Earlier regression suites

Every previous `.test.mjs` suite was rerun against target-relative imports. [literal-results.md](round3/literal-results.md) lists **every test by exact name and literal result**, and [test-summary.json](round3/test-summary.json) also includes the full lab suite. Failed obsolete assertions are retained as failures, not relabeled passing tests.

The original `v-e01.test.mjs` has **23 tests: 8 PASS, 15 FAIL; exit 1** ([TAP](round3/prior.tap)). Its expectations target 2796455, before the fixes and Q75 rulings:

| Original test numbers | Fresh result | Interpretation |
| --- | --- | --- |
| 1–3 | FAIL | Outside build links now prevent an instance; these old identity/toolchain assertions fail before measuring their intended condition. The current lab and delta guards cover the updated behavior. |
| 4 | PASS | Equal execution identities still share the first built instance. |
| 5–6 | PASS | Direct and symlink-routed oracle changes are refused in fallback. |
| 7 | PASS | Double fork killed; setsid helper survives, as documented. This PASS asserts a known limit. |
| 8 | FAIL | Expected A0-REBUILD-MISMATCH is absent: the Git replacement does not affect the pinned input/source; the honest run has only gate disclaimers. |
| 9 | FAIL | Candidate-supplied replacement oracle never creates its marker; the old substitution expectation is false. |
| 10–11 | FAIL | Wrong candidate remains DIAGNOSTIC rather than the old asserted core/offline QUALIFIED. |
| 12 | FAIL | Ignored Git replacements do not produce the old expected A0 mismatch. |
| 13 | FAIL | Removed shared-HOME callback API invalidates this old probe; delta checks fresh environments directly. |
| 14 | FAIL | Evidence deletion now prevents offline qualification. |
| 15 | FAIL | Hard-coded 2796455 evaluator copy fails its obsolete A0 identity before reaching its restore assertion; source-bound supplement covers the actual target. |
| 16 | PASS | Comparator pass/fail pairs agree across both judgment paths. |
| 17 | PASS | Nested O-REPLAY object comparisons remain UNCOMPARABLE, explicitly deferred by Q75g. |
| 18 | FAIL | Missing cause is now allowed; malformed present causes are refused under Q75h. |
| 19–20 | PASS | Absent observation never passes; promotion never qualifies through public commands. |
| 21 | FAIL | admitCore now refuses promotion. |
| 22 | FAIL | Every early return now carries GATE-NOT-RUN; its old contrary expectation fails. |
| 23 | FAIL | Evidence permission failure returns a diagnostic rather than escaping as an exception. |

Compared with the previous round's 5/23 literal passes, tests 5–7 now pass because this execution uses automatic fallback rather than an effective host sandbox. That is an environment difference, not a regression in confinement.

`round2/delta.test.mjs`: **12/13 PASS, 1 FAIL; exit 1** ([TAP](round3/delta.tap), [structured observations](round3/delta-results.json)). The sole failure is **“F2/F7 GAP: deleting the completed claimed-case input persists without refusal”**: its expected QUALIFIED is now DIAGNOSTIC with INPUT-TAMPERED. The other 12 pass unchanged: honest control; transitive evaluator integrity/poison persistence; corrupt loose-blob refusal; toolchain mutation; external link chain and internal cycle handling; 64 fresh child environments; deferred comparator refusal; structured cause validation; unexpected evidence object refusal; early promotion refusal; deleted evidence-directory handling; workload/placement validation. The inherited “gate child HOME” title still overstates its instrumentation: those 64 probes are SUT helper children, not an independent gate/version-probe trace.

`round2/supplement.test.mjs`: **3/3 PASS; exit 0** ([TAP](round3/supplement.tap), [observations](round3/supplement-results.json)). Both previously failing final-use deletion/rewrite cases now refuse with INPUT-TAMPERED while all case comparisons pass. Source-bound persistent evaluator modification and refusal by the next process still work. The first T3 run also has GATE-SLOT because its scratch evaluator lacks complete slot configuration; EVALUATOR-TAMPERED is separately observed in that run and before any build in the next process.

`round2/fallback-routes.test.mjs`, selecting T1/T4/T2: **3/3 PASS; exit 0**, zero skipped ([TAP](round3/fallback-routes.tap)). It repeats direct oracle edit, symlink oracle edit, and process-group cleanup with explicit fallback. The other legacy tests are filtered out, not counted as 20 additional passes.

The original mutation-testing driver `mutations.mjs` is not a target regression suite: it archives the hard-coded 2796455 evaluator and deliberately edits claim.mjs in scratch copies. It was not rerun as evidence about 388209d; no evaluator mutation was made in this review.

## New final-use input variations

[input-variations.test.mjs](round3/input-variations.test.mjs) appends an operation to the otherwise honest candidate after it prints its final `reopen` answer for each CS-SCOPE case. Each variation records **six inputs**, original/observed hashes and lengths, and the remaining filesystem entry type. Each run has **64/64 semantic case comparisons PASS**. Rejection assertions require exactly INPUT-TAMPERED plus the two existing gate disclaimers, excluding accidental refusal due to any other failure. [Structured results](round3/input-variations-results.json).

| Operation after final use | Observed filesystem/bytes | Rejected? |
| --- | --- | --- |
| Rename input to `<path>.renamed` | Original pathname absent; renamed file present | **Yes, INPUT-TAMPERED** |
| Truncate input to half length | Present, 22–25 bytes instead of 45–50 | **Yes, INPUT-TAMPERED** |
| Replace by symlink to changed bytes | Symlink present; same length, different SHA-256 | **Yes, INPUT-TAMPERED** |
| Rewrite with identical length | Regular file present; same length, different SHA-256 | **Yes, INPUT-TAMPERED** |
| Replace by dangling symlink | Symlink exists; reading original pathname fails ENOENT | **Yes, INPUT-TAMPERED** |
| Replace by symlink to identical bytes | Link resolves to the original byte sequence | **No**, offline QUALIFIED; top-level DIAGNOSTIC |
| Rewrite, then restore original bytes | Final bytes equal original | **No**, offline QUALIFIED; top-level DIAGNOSTIC |
| Honest control | Original bytes unchanged | **No**, offline QUALIFIED; top-level DIAGNOSTIC |

The exact-byte symlink result is intentional boundary evidence: `verifyInput` follows the pathname and checks bytes, without binding inode, regular-file type or mode. Q81a requires the input to be present with the same bytes, so this is not a violation of that ruling. A changed-byte or dangling link fails. A stronger requirement to preserve file type/mode would require a separate ruling and an lstat/no-follow implementation; it is not claimed or silently inferred here.

To reproduce, create a detached worktree at 388209d, copy this branch's verifier scripts to their matching relative paths there, then run from that target:

```sh
node lab/bin/heavy.mjs --label CX-VE01-4-repro -- node --test lab/verify/E01/round3/input-variations.test.mjs
node lab/bin/heavy.mjs --label CX-VE01-4-prior-repro -- node --test lab/verify/E01/round2/supplement.test.mjs
```

Expected: 8/8 and 3/3 PASS respectively. The retained [run-review.py](round3/run-review.py) reruns the complete command set with at most two reviewer wrappers concurrently; each independently takes the shared heavy semaphore. It assumes the prepared target worktree and copied scripts, and does not create either or alter claim.mjs.

## Documented limitations versus observations

The builder's [round-3 report](round3/target-report-round3.md) now accurately closes the prior missing final-use byte check and states the remaining limits:

- **Persistent input byte changes:** final-use deletion/rewrite and all requested changed/missing-byte variants are caught. No reproduction of F11 remains.
- **Edit-and-restore / TOCTOU:** the new restore control remains offline QUALIFIED; this directly confirms the named observational limit. These checks do not provide immutable files or eliminate a race after hashing.
- **Process-group cleanup / setsid:** the legacy and explicit fallback tests directly reproduce the documented distinction. No OS confinement claim is made, especially with the live sandbox probe unavailable.
- **Fallback filesystem/network exposure and same-user trust roots:** oracle/evidence/evaluator modifications remain reachable in fallback and their selected persistent-change checks work. This review did not exhaustively test network isolation or compromise the trusted launcher, checker, OS identity or Git authority. None is claimed protected by these tests.
- **Toolchain limits:** the resolved-node mutation is refused; the environment probe has 64 distinct removed HOME/TMPDIR directories. Neither proves a hermetic system-library/toolchain image or independently traces every gate child.
- **Unsupported acceptance paths:** promotion remains refused; every tested top-level qualification remains DIAGNOSTIC with GATE-NOT-RUN. No live paired measurement, executing OBL gate, fault witness or promotion prerequisite implementation was supplied by this change. Reference agreement is bounded to its 70 fixtures and 13,840 calls.
- **Nested O-REPLAY comparators:** the old and new comparator tests still return UNCOMPARABLE for the deferred object shapes, as Q75g allows.

**Carried nonblocking F12 — Low, contract prose.** Target `lab/acceptance/obligations.json:2849` still includes `slot` in `workloadIdentity.rule`, while `fields` excludes it and `placement` puts it on each arm ([capture](round3/contract-fields.json)). Reproduction: inspect those three properties or rerun the final delta test; the executable field/placement assertions pass. Proposed fix remains with the contract owner: correct the compiler prose and regenerate the contract. The round-3 builder report explicitly discloses this deferred correction; it does not block this evaluator-only Q81a change. No new finding requires a code fix before merge.

## Evidence integrity and cleanup

[source.json](round3/source.json) and [final-integrity.json](round3/final-integrity.json) compare all **72 tracked files** under target `lab/bin`, `lab/oracles`, and `lab/acceptance` with their Git blobs at 388209d. Every comparison matches before and after; the target tracked diff is empty. [SHA256SUMS](round3/SHA256SUMS) binds the retained evidence and tools. All output is fresh from this review; old failed and partial attempts were left unchanged.

Scratch fixture repositories and isolation directories are removed by the tests after recording their observations. The detached target is removed only after source/evidence checks and after all seven commands finish; [cleanup.json](round3/cleanup.json) records that cleanup. No shared resident, engine state or other agent's lock was removed.

Not performed: evaluator fixes, engine/Docker lifecycle changes, benchmarks, installs, package/root pnpm checks, broad TOCTOU/containment qualification, publishing, push, merge, or subagents. Open questions: none blocking this merge; the contract-owner F12 wording correction and already documented G03 isolation work remain separate follow-ups.

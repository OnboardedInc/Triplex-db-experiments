# EXP-E01 round 2 — CX-E01-R2

North star: correctness of the evidence used to judge all five priorities, P1–P5. Scope and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`. No performance target is changed.

Built on the paused agent's WIP `dd8a913`, preserving its implementation. Implementation source for the final gates: `0fa40d1`; evaluator file hashes and the contract version are in [source.json](evidence-round2/source.json). The main checkout, its contract compiler, rulings, handoff and verifier findings were read-only. No agents were spawned.

## Findings and regression guards

The new guards in `lab/bin/test/claim-round2.test.mjs` adapt the attack setup from verifier branch `verify/E01`, commit `e7fca9f`. These are builder regression tests, not a replacement for independent review. The original verifier's GAP assertions intentionally assert vulnerable behavior: fixing a gap makes that assertion red. This report names the inverted regression assertions, rather than claiming the original GAP tests became green unchanged.

| Finding / ruling | Implemented behavior and source | Regression assertion |
| --- | --- | --- |
| F1 / Q75a | `claim.mjs:908` lists the evaluator, reference compiler, and gate's transitive JS imports. `claim.mjs:919` compares working bytes with verified Git blobs before any candidate process. Persistent changes refuse with EVALUATOR-TAMPERED; a poison marker requires restoration. End checks detect persistent in-run changes. | `claim-round2.test.mjs:168`, “F1/T3”: a scratch evaluator with GATE-NOT-RUN removed refuses its next run against its original Git commit. |
| F2 / Q75b | `claim.mjs:540` strips inherited Git overrides, disables replace refs and user/system Git config, and verifies each blob against its tree entry's object ID. `claim.mjs:1172` reads and copies candidate/A0 trees, manifests, inputs and oracle runners before the first candidate process. No oracle runner is fetched lazily after a build. | `claim-round2.test.mjs:182`, “F2/T5c”: the real replace-ref substitution attack cannot qualify the wrong candidate; its answers fail. |
| F2 / Q75c | `claim.mjs:1553` requires per-file SHA-256 pins covering every declared runner file, including COMPILED runners, for a run to qualify offline. An unpinned compiled oracle can still execute from preloaded authority bytes for diagnostic work; the final offline verdict is DIAGNOSTIC. | `claim-round2.test.mjs:191`, “F2/Q75c”: an otherwise honest claim depending on unpinned O-CONTRACT is diagnostic. |
| F3 / Q75d | `claim.mjs:968` resolves node, pnpm and python3 to real paths, hashes their executable bytes and records their versions. `claim.mjs:1008` pins child PATH, invokes the recorded executable for these names, and checks tools before each invocation. `claim.mjs:984` binds the build's toolchain identity; oracle-invocation records bind Python. | `claim-round2.test.mjs:293`: a different PATH node is recorded and actually runs; its identity differs from A0. |
| F3 / Q75e | `claim.mjs:1056` uses lstat, hashes modes and internal target files, and never recursively follows a directory symlink. Source links outside the checkout refuse before the build; generated outside links refuse before output collection. `claim.mjs:1363` records unapplied composition as unboundConfig, outside execution identity. | `claim-round2.test.mjs:198` rejects outside file/directory links; `:278` changes identity for file modes and internal target bytes. |
| F4 / Q75f | `claim.mjs:1008` makes fresh HOME/TMPDIR for each build, SUT, oracle and gate child, and removes them after exit. Version probes also get fresh directories. The gate now uses the same run-bound child runner. | `claim-round2.test.mjs:207`, “F4/T6”: the build's planted HOME/TMPDIR files are absent in later children, including A0; every probe HOME is distinct. |
| F5 / Q75g | Intentionally still unsupported on 0.3.10: row/page/error comparators on an O-REPLAY answer object remain UNCOMPARABLE, never silently PASS. `claim.mjs:147` retains the fail-closed shape checks. | `claim-round2.test.mjs:250` uses `{commandOutcomes, queries: [{id, result}], state}`, rather than a top-level row array. All six non-exact comparators refuse. This is a green refusal guard, not implemented O-REPLAY comparator support. |
| F6 / Q75h | `claim.mjs:158` makes cause optional; if present it must be an object carrying a nonempty `_tag` or `message`. | `claim-round2.test.mjs:255`: absent and structured causes pass; false, zero, empty string, arrays, empty objects and null fail. |
| F7 / Q75i | The write store keeps the hashes it wrote; `claim.mjs:1448` requires every object at the end and checks its bytes. Deletion produces EVIDENCE-MISSING. Extra objects also refuse. | `claim-round2.test.mjs:220`, “F7/T7”: deleting a build-manifest object makes the run diagnostic. |
| F8 / Q75i | `claim.mjs:404` explicitly rejects promotion in admitCore before building, independently of the outer qualification guard. | `claim-round2.test.mjs:235`: run.core is DIAGNOSTIC and zero build instances execute. |
| F9 / Q75i | `claim.mjs:1423` adds GATE-NOT-RUN at the start, before format/commit/authority checks. End checks and unreadable evidence are caught and reported instead of escaping as exceptions. | `claim-round2.test.mjs:242` checks early returns; `:263` removes evidence-directory permissions and still receives a diagnostic verdict carrying GATE-NOT-RUN. |
| F10 / Q75e | The lstat walk refuses outside symlinks instead of walking external trees or revisiting pnpm-linked directories. | `claim-round2.test.mjs:198`. |
| Additional runtime closure | `claim.mjs:1394` checks all build instances and oracle copies at the end; each SUT invocation also checks its instance, including repeated invocations without a switch. This closes the old “only rehash on instance switch” window for persistent edits. | `claim-round2.test.mjs:308`: a same-instance source edit fails with BUILD-TAMPERED. |

## Contract 0.3.10 and reference replay

`workloadOk` (`claim.mjs:208`), `pairedOk` (`:349`) and the workload producer (`:1377`) use the shared identity without slot. Each arm's `{slot, cpuset, cpus}` lives in the paired measurement placement. Fixture workloads and mode/toolchain identities now match those fields. The negative W0 fixtures explicitly keep missing acceptance rather than accidentally inheriting 0.3.10's real W0 acceptance.

The existing comparator test now distinguishes schemas: case-result/2 uses its declared comparator in 0.3.10; case-result/1 alone uses hash equality. No comparator accepts arbitrary noncanonical JSON bytes as equality. CMP-EXACT-VALUE compares canonical values (whose canonical serialization is unique).

The standalone replay runner is [reference-replay.mjs](reference-replay.mjs). It compares every executor call's name, arguments, order and returned value, as well as the resulting verdict, against the actual compiler's self-check calls. The initial replay on 0.3.10: **70/70** fixtures agree, **13,840** executor calls, no admission self-check errors; all **63/63** document verdicts agree as DIAGNOSTIC. See [initial replay](evidence-round2/reference-replay-initial.json). Final-run results are retained below.

Q75c/Q75i restrictions on run qualification are applied by the lab even where the 0.3.10 reference helper is less strict. No compiler or generated contract output was changed to preempt 0.3.11. In particular, an inner reference-model result is not the final run verdict. The standalone replay's existing fixtures have no newly qualifying promotion path; explicit promotion regression tests cover the stricter builder behavior.

## Gates and retained attempts

All long commands ran through `node lab/bin/heavy.mjs --label CX-E01-R2... -- <command>`, after checking host free disk above 5 GiB. Shared-slot waits are retained in the logs. No engines, containers, benchmarks, package builds, network research, package publishing or merges were performed.

| Attempt | Result | Reason for next attempt |
| --- | --- | --- |
| [1: claim tests](evidence-round2/attempt1-claim-tests.tap) | 70/92 passed, 22 failed | Early integration pass. Editing the evaluator while this run was in progress correctly caused its integrity checks to refuse later claims; also exposed stale 0.3.9 assertions. Subsequent evaluator edits were committed before gates. |
| [2: full tests](evidence-round2/attempt2-all-tests.tap) | 100/122 passed, 22 failed | Directory modes entered runtime identities, but the prepared oracle manifest still omitted directory entries. Corrected that mismatch, negative W0 fixture acceptance and expanded attack guards. |
| [3: full tests](evidence-round2/attempt3-all-tests.tap) | 123/125 passed, 2 failed | Stale case-result/2 comparator expectation, and an ignored-records comparison that used different obligation sets. Corrected those tests; added transitive evaluator and final-runtime checks. |
| [4: final full tests](evidence-round2/attempt4-all-tests.tap) | **126/126 passed**, zero failures, skips or cancellations; 169.15 seconds after admission | Final implementation at `0fa40d1`. All 14 new regression assertions are green. |

Final commands (both exited 0):

```sh
node lab/bin/heavy.mjs --label CX-E01-R2-acceptance -- node --test lab/bin/test/*.test.mjs
node lab/bin/heavy.mjs --label CX-E01-R2-final-reference -- node lab/experiments/EXP-E01-claim-evaluator/reference-replay.mjs
```

[Final reference replay](evidence-round2/reference-replay-final.json): **70/70** fixtures, **13,840** executor calls, zero differences and zero admission self-check errors; **63/63** document verdicts agree as DIAGNOSTIC. The initial and final replays agree. [Slot-wait stderr](evidence-round2/reference-replay-final.stderr) is retained separately so the JSON remains parseable. [SHA256SUMS](evidence-round2/SHA256SUMS) binds the retained evidence files. The final report commit adds documentation and these receipts only; it does not change the tested evaluator bytes.

## Corrected unprotected list (Q75j)

- An edit made and restored between integrity observations can escape detection, including an evaluator rewrite restored within one candidate invocation. TOCTOU remains between reading/hash checks and execution. Persistent edits are checked before later use and at the end.
- As the independent V-E01 experiment demonstrated, a **double fork stays in the build's process group and is killed**. A helper that creates a new session with **setsid** can escape the group kill when sandbox-exec confinement is unavailable or disabled. The prior report's “double fork escapes” wording was wrong.
- This is not complete filesystem or network isolation. On macOS, sandbox-exec is attempted and its availability is recorded; fallback is detection only. Filesystem reads are broadly allowed, same-user writable files remain reachable without effective containment, and network isolation is absent in fallback. EXP-G03 remains necessary.
- The self-check and Git authority are trusted roots, not an immutable external verifier: a same-user attacker with unrestricted access could replace the checker/launcher wholesale or rewrite its Git anchor. Git blob checks defeat replace-ref and mismatched-object substitution under the recorded anchor; they do not create a separate OS security identity. No claim of arbitrary-code containment or independent promotion acceptance is made.
- System interpreters/libraries and tools beyond the resolved node/pnpm/python3 entrypoints are not a hermetic toolchain image. Install-metadata exclusions remain the contract's declared exclusions. A hard sandbox and immutable toolchain/root would be needed to eliminate those assumptions.
- Actual OBL gate execution, paired live measurements, fault injection witnesses and promotion prerequisites are not implemented here. Every qualification result retains GATE-NOT-RUN and top-level DIAGNOSTIC. O-REPLAY row-comparator support remains blocked pending the contract change.

The old REPORT.md is historical. This report supersedes its unprotected list and comparator/promotion claims. A separate adversarial reviewer must rerun the relevant source-bound gates; these builder checks do not certify a promotion.

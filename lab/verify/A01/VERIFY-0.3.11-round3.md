# Contract 0.3.11 round 3 — CX-VA01-0311

**Verdict: ACCEPT at `b3af37514d48c68e481d301276a4b818cc10872b`.** The eight failures are resolved without changing either evaluator assertion file or the Python reference-replay harness. Six needed coherent mock runner identities; one needed a still-valid oracle-refusal fixture; one exposed a real evaluator pin-admission defect, which the implementation now fixes. The merged-tree evaluator gate independently passes **108/108**, with no failures, skips, cancellations or todo tests. No blocking finding remains in this delta.

The round-2 review did not run this evaluator suite and missed the merged-tree compatibility failure. This review closes that verification gap by executing Q87's full gate on the exact merged source, in addition to checking the fixture and implementation changes.

North star: P1/P3 correctness floor: evaluator and contract must agree on oracle identity and refusal before a contract merge. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`.

Baseline: accepted round-2 source `3b46c8a07ff3c6285252736cc10e04267f7dbe1d`. Reviewed: `54ba9ebedc025f78b71ead9812c0a71aadc605c6` (runner pins/fixtures), `ab3eafc2` (main merge, parent `982350e24c93fd91682f0d083f207a251a79a680`), `b5af03398573080e178475952f03e57b8686bf17` (document-only O-ERR fixture), and final report head `b3af375`. The review used immutable Git blobs and a real local detached clone at that final head, so evaluator integrity checks compared executed source against the correct Git commit. The main checkout and code under review were not edited.

## Each of the eight failures

Numbers below are the builder's preserved 100/108 baseline TAP identifiers. Their exact names are retained independently in [delta-audit.json](round3/delta-audit.json). Each corresponding test passes in the fresh [108-test run](round3/evaluator.tap).

| Test | Previous failure and round-3 change | Judgment and preserved check |
| --- | --- | --- |
| 5 — fresh HOME/TMPDIR (`claim-round2.test.mjs:207`) | The one-file mock replay oracle inherited the production 29-file runner list. An unrelated ORACLE-RUNNER-UNPINNED made the otherwise honest offline run diagnostic. `claim-fixtures.mjs:154` now derives the mock's argv/files from its own actual pin map. | Correct fixture repair. Still requires offline QUALIFIED, multiple executions, no planted build marker in any execution HOME, and distinct execution HOME paths. No environment-isolation assertion changed. |
| 15 — final-use input deletion (`claim-round2.test.mjs:321`) | Same inconsistent replay runner list added an unrelated pin error to the expected exact reason set. The runner list now matches its mock bytes. | Correct fixture repair. The candidate must actually delete the input; comparisons must pass before the final check; result must be diagnostic and include INPUT-TAMPERED. The exact reason set remains GATE-NOT-RUN, INPUT-TAMPERED, RUN-NOT-ON-GATE. |
| 16 — final-use input rewrite (`claim-round2.test.mjs:321`) | Same fixture identity inconsistency as deletion. | Correct fixture repair. Still proves the candidate rewrote the input after use, that prior comparisons passed, and that final validation refuses it with the same exact three reasons. |
| 17 — reference executor-call replay (`claim.test.mjs:79`) | This was a **real evaluator defect**, not merely stale fixture data: with only the replay entrypoint hashed, Python returned DIAGNOSTIC after 313 calls while JavaScript returned QUALIFIED after the same calls. New `oracleRunnerPinned` at `claim.mjs:378`, applied by `contractBlockers` at `:393`, supplies the missing complete-file check. The incorrect duplicate pin-only preflight is removed. | Correct implementation fix. The test still replays every recorded Python self-check call, requires identical executor calls/arguments/order/verdicts, at least 59 fixtures and seven positive fixtures, and over 10,000 executor calls. No reference call, negative control or assertion was discarded. Independent pin and execution probes below confirm both negative and positive behavior. |
| 31 — GEN-REFUSED-SET (`claim.test.mjs:107`, dynamic fixture loop) | The old target was Q52 erasure shapes, modeled by accepted O-REPLAY 0.4.9. It produced unresolved selection reasons rather than a genuine oracle refusal. `claim-fixtures.mjs:361` now targets `G7.migration.schema-evolution`, which still reaches the scale-evolution refusal. | Correct fixture retargeting. The fixture still expects DIAGNOSTIC, and CAUSE still requires ORACLE-REFUSES specifically. The production scope probe confirms erasure residual shapes have no oracle refusal while migration does; the change does not reinstate a stale Q52 block or accept an unrelated failure as refusal. |
| 101 — build-helper cleanup (`claim.test.mjs:442`) | The same replay mock pin/list mismatch prevented the honest run from reaching the expected positive offline result. The fixture runner identity is corrected. | Correct fixture repair. The helper must still be absent after the cleaned-up build; a separate uncontained positive control must actually create its marker, so cleanup cannot pass vacuously. These assertions remain intact. |
| 106 — offline qualification boundary (`claim.test.mjs:501`) | The unrelated mock pin error made offlineVerdict diagnostic. The corrected runner identity restores the intended honest positive. | Correct fixture repair. Still requires core/offline QUALIFIED while the overall result stays DIAGNOSTIC; exact GATE-NOT-RUN/RUN-NOT-ON-GATE reasons, plan-only refusal, ignored gate stub and cleanup checks are unchanged. |
| 107 — CLI exit codes (`claim.test.mjs:519`) | Same fixture pin inconsistency caused the CLI's reported offline verdict to be diagnostic. | Correct fixture repair. CLI still exits 2 and reports overall DIAGNOSTIC, honest offline QUALIFIED, and exits 1 on usage error. No exit or verdict assertion changed. |

The shared fixture repair is justified by the contract, not by the desired green result: Q75c requires hashes for every file a runner declares. A mock implemented in one file must declare and hash that file; it must not borrow the production oracle's 29-file dependency list. The fixture's O-CONTRACT stub is also explicitly its own runner, rather than the production generator/projection pair. [Fixture diff](round3/fixture-delta.patch).

The extra O-ERR stub in `b5af033` repairs the document-only GS positive after Q75c began applying to document admission too. It gets an actual fixture file, a SHA-256 pin, a fixture verifier and a matching runner. It does **not** claim to implement a production error oracle. `variant === 'real'` returns before fixture alterations, and the generated production authority still has neither an O-ERR runner nor an O-ERR acceptance pin. The mock's documentary positive continues to have overall DIAGNOSTIC; production O-ERR remains blocked. The unchanged 108-test suite includes both the positive and the diagnostic/cause assertions.

## Assertion integrity

Byte comparison, not just assertion counting, proves that no assertion was weakened, removed, skipped or rewritten in either assertion file or the reference recorder:

| File | SHA-256, identical at baseline and reviewed head |
| --- | --- |
| `lab/bin/test/claim.test.mjs` | `4192957b45d94093b96cfb00d757f429618d57cf53012c6f88416da4030cf3a1` |
| `lab/bin/test/claim-round2.test.mjs` | `9fafb1773290d36ff6253299c702841658289ddb8c163a0f85f995f99ab7f144` |
| `lab/bin/test/claim_ref.py` | `34c3c40e76085a4b40d853843d0d8470d423ad87790215f480d8dcf6db56c5ab` |

The fixture diff changes mock runner declarations/pins and the refusal target; it does not change positive/negative expected verdicts or the CAUSE map. The fresh TAP has exactly 108 `ok` records and zero `not ok`, skipped, cancelled or todo tests. [Audit script](round3/audit_delta.py), [audit](round3/delta-audit.json).

## Independent checks beyond the 108 tests

The actual evaluator delta is retained in [evaluator-delta.patch](round3/evaluator-delta.patch). Complete runner declarations are now checked in both reference-style admission and common preflight. For COMPILED oracles whose map lives in `oracleRunners`, trusted copied bytes are also checked against their declared hashes at `claim.mjs:1206`.

I checked that this change is not simply another always-reject guard:

- **18/18 declaration variations match Python's `runner_pinned`.** These include the accepted 29-file replay map, the complete COMPILED source/projection map, absent/empty/partial/malformed maps, missing imported files, missing repository argv files, the empty-pin fallback, and refusal to borrow a fallback for a nonempty partial map. Production O-ERR is refused. [Driver](round3/runner_pin_vectors.py), [Node probe](round3/pin_predicate_probe.mjs), [results](round3/pin-predicate-results.json).
- **Three real local evaluator probes pass.** A COMPILED O-CONTRACT mock with a complete runner-output map and no separate oracle pin executes 64 cases and reaches offline QUALIFIED, with overall DIAGNOSTIC. A syntactically valid but wrong byte hash is rejected with ORACLE-FILES and offline DIAGNOSTIC. A missing map is rejected with ORACLE-RUNNER-UNPINNED and offline DIAGNOSTIC. These exercise the changed trusted-copy path, not just its declaration predicate. [Source](round3/compiled_runner_probes.mjs), [results](round3/compiled-runner-probes.txt).
- **Refusal scope stays correct.** The original Q52 target has no ORACLE-REFUSES; the replacement migration target has scale-evolution ORACLE-REFUSES. [Probe](round3/refusal_scope_probe.mjs), [results](round3/refusal-scope.json).

Two initial reviewer probes had harness setup errors: one omitted `cases` from a synthetic obligation, and the other searched document fixtures instead of run fixtures. Their initial logs are retained as `*-initial-fixture-error.txt`; neither is a candidate finding or counted as passing evidence. Both probes were corrected and rerun. The latter stopped before executing its intended evaluator probe.

## Fresh merged-tree gates

| Gate | Fresh result | Evidence |
| --- | --- | --- |
| Q87 evaluator suite: `node --test lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs` | **108/108 PASS**, zero failed/skipped/cancelled/todo; 168.2 s | [evaluator.tap](round3/evaluator.tap) |
| Original independent contract reproductions | **35/35 PASS** | [round1-reproductions.txt](round3/round1-reproductions.txt) |
| Prior independent delta variations | **23/23 PASS**, including actual oracle in-flight payloads | [variations.txt](round3/variations.txt), [source](round3/delta_variations.py) |
| Builder real-payload controls | **5/5 PASS** | [builder-variations.txt](round3/builder-variations.txt) |
| Contract mutation suite | **344/344 runnable mutations caught**, zero misses | [negtest.txt](round3/negtest.txt) |
| Q47d pending-authority/restoration suite | PASS, including byte-identical restoration | [q47d.txt](round3/q47d.txt) |
| `build_contract.py --verify` | PASS, all six generated outputs byte-identical at start and end | [start](round3/verify-start.txt), [final](round3/verify-final.txt) |

The mutation catalog has 425 entries; 81 retired anchors are excluded from the passing denominator, and the separately superseded historical status-only mutation remains excluded. An independent log tally confirms 344 CAUGHT records and zero misses. Generator SHA-256 is unchanged from round 2: `60055e9f236733365c4e558412368b0a2934df8cb1d5e9479d45758971940ccf`.

The evaluator suite, 344-mutation suite, three evaluator probes, Q47d and generator verification used `lab/bin/heavy.mjs`; preserved logs include resource queue waits where applicable. The other 35/23/5 tests and pure pin/scope probes each finish in under a second without engines. Host free disk before snapshot creation was 19,982,327,808 bytes, above the 5 GiB admission floor. [Source identity](round3/source.json).

## Merge and production authority

The main merge changes generated JSON only in `inputs`, `pendingRulings` and the transitive hash. All obligation records, compiled rulings, production runner declarations, world/oracle/image/A0 pins and closability counts are unchanged from round 2. Counts remain 157 total, 40 pin-level closable, 117 blocked; Datomic remains 153 applicable/0 closable/153 blocked. Production O-ERR remains unpinned. The new transitive hash is `cdd267d3b28fb5a121788731dc0ccaf54488324e3d2296dd97ffee8affca0405`.

All 43 pending IDs remain non-authoritative, with no compiled/pending intersection. Their ordered list equals the immutable main parent's pending list minus the same 50 already compiled rows. Q87 is obeyed as the explicit merge gate requested in this dispatch; its row remains pending and no other ruling was silently compiled. Q78e and Q86g's policy decisions remain outside this delta. [Audit](round3/delta-audit.json).

## Handoff and limits

The exact reviewed merged head passes the newly required contract/evaluator compatibility gate. No further fixture or pin-admission fix is requested for this delta. This acceptance is not database-lane qualification, production evaluator acceptance, or proof of all replay-comparator integration; the separate integration limitation recorded in round 2 was not changed by these pin/fixture edits.

No code under review or main-checkout file was edited; nothing was merged or pushed. No engine/container lifecycle, package install, benchmark, root pnpm check or live lane qualification was performed. Only reviewer scripts, source diffs, fixtures, logs and this report are committed. The disposable local clone and generated review fixture trees were removed after their processes exited; their source commit, first-error logs and receipts remain available. [prepare_snapshot.py](round3/prepare_snapshot.py) reconstructs the exact local clone for reruns.

[status.json](round3/status.json) records the final gate denominators; [SHA256SUMS](round3/SHA256SUMS) hashes the report and retained evidence. Source/report whitespace checks pass. Raw TAP/Q47d output is retained verbatim, including any emitted trailing spaces.

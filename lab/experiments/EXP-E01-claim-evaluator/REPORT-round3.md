# EXP-E01 round 3 — CX-E01-R3

North star: correctness of the evidence used to judge P1–P5. Goals and targets remain those in `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

## Q81a / reviewer F11

Built on `422c8d3` on `exp/E01-claim-evaluator`. Implementation commit: `c73de98`. Read the main-checkout ruling Q81a and `lab/verify/E01/VERIFY.md`, plus reviewer branch `verify/E01` at `9a1f51e` (`VERIFY-round2.md` and `round2/supplement.test.mjs`). Main-checkout files were read-only.

`lab/bin/claim.mjs` now shares a presence/hash check between input reuse and final verification. The existing map retains every generated input copy's original SHA-256 and path. Final verification visits every entry before build/oracle runtime checks and before isolation cleanup. Missing, unreadable or different bytes add INPUT-TAMPERED and make the offline verdict DIAGNOSTIC. Existing evidence-set checks remain in the same end-of-run phase. The guarantee is retained rather than narrowed.

`lab/bin/test/claim-round2.test.mjs` adapts the reviewer's two final-use variants: the candidate deletes or rewrites its CS-SCOPE input after producing its reopen answer. Each test proves the edit actually occurred, every case comparison passed, and the final result nevertheless refuses with INPUT-TAMPERED. The exact reason set must contain only INPUT-TAMPERED plus GATE-NOT-RUN and RUN-NOT-ON-GATE, ruling out unrelated refusal as a passing regression guard. The tests explicitly select sandbox:false to exercise detection-only behavior, matching the reviewer.

## Gates

Both commands use `heavy.mjs` and the canonical shared semaphore. Host free disk was about 30 GB before launch, above the 5 GiB floor. Queue waits are retained in stderr; other holders were observed alive and left untouched. The test wrapper was queued when the implementation commit completed, so all execution uses Git-anchored evaluator bytes.

```sh
node lab/bin/heavy.mjs --label CX-E01-R3-tests -- node --test lab/bin/test/*.test.mjs
node lab/bin/heavy.mjs --label CX-E01-R3-reference -- node lab/experiments/EXP-E01-claim-evaluator/reference-replay.mjs
```

- Full test suite: exit 0, **128/128 PASS**, zero failures, skips or cancellations, 217.31 seconds after admission; [TAP](evidence-round3/all-tests.tap), [stderr and queue waits](evidence-round3/all-tests.stderr).
- Reference replay: exit 0, **70/70** fixtures agree across **13,840 executor calls**, zero differences or self-check errors; **63/63** document verdicts agree as DIAGNOSTIC. [JSON](evidence-round3/reference-replay.json), [stderr and queue waits](evidence-round3/reference-replay.stderr).

[Source hashes](evidence-round3/source.json) identify the implementation, tests, runner and contract. [Final integrity receipt](evidence-round3/final-integrity.json) confirms those bytes still match the implementation commit. [SHA256SUMS](evidence-round3/SHA256SUMS) binds the retained evidence. The final report/evidence commit changes no tested evaluator bytes.

## Updated limitations

This list supersedes round 2's unprotected list. The round-2 assertion that all persistent edits were end-checked was too broad: input copies were checked only before reuse. Q81a closes that specific final-use hole; both deletion and rewrite are now end-checked.

- Changes made and restored between integrity observations can still evade detection, including case inputs and evaluator files. TOCTOU remains between hashing and use or final return; final checks are observations, not immutable storage.
- A double fork remains in the build's process group and is killed. A helper creating a new session with setsid can escape process-group cleanup when effective sandbox confinement is unavailable or disabled.
- Fallback remains detection only, with same-user filesystem reachability and no network isolation. The input regression tests do not establish OS containment. EXP-G03 remains necessary.
- The checker, launcher and Git authority remain trusted same-user roots. Recorded Git blob checks are not an immutable external verifier or separate OS identity.
- Resolved node/pnpm/python3 entrypoints do not constitute a hermetic toolchain image; system libraries and other tools remain outside that guarantee.
- Actual executing OBL gates, paired live measurements, fault witnesses and promotion prerequisites remain unimplemented. Every top-level qualification retains GATE-NOT-RUN and DIAGNOSTIC; offline qualification is diagnostic evidence, not acceptance. Nested O-REPLAY row/page/error comparators remain deferred to the contract change.
- Reviewer F12's stale generated workloadIdentity.rule prose is a contract-owner correction, outside this evaluator-only round. No compiler or generated contract files were changed.

No engines, Docker lifecycle changes, benchmarks, installs, package builds, root pnpm check, package checks, publishing, push or merge were performed. No subagents were spawned. These are builder regression gates; independent reviewer verification and promotion remain outstanding.

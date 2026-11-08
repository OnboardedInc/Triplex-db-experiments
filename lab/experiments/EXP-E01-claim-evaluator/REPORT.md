# EXP-E01 claim evaluator: report (contract 0.3.7 + Q55a; saved by the orchestrator, 2026-11-08 00:01Z)

**Bottom line:** `lab/bin/claim.mjs` implements Q55a. `admit` is always DIAGNOSTIC (DOCUMENT-ONLY, with a separate `documentVerdict`);
`qualify` builds the claimed commit and A0 itself from `git archive` (checkouts verified against tree blobs), resolves every case and mode
from pinned manifests (claim fields other than format, claimId, kind, obligations, commit, sourceTreeSha256, composition are ignored), runs
only pinned oracle bytes in a separate directory (exit 2 or X-NOT-MODELED = REFUSED), recomputes comparators on canonical JSON, counts
verification only from the authority contract's registry, and always adds GATE-NOT-RUN because `gate.mjs OBL --dry-run` does not execute.
No path to QUALIFIED exists today, by design. Branch `exp/E01-claim-evaluator` work commit 6d62724, head 4ce1ed1 (merge of main 02293d8);
97/97 tests (`node --test lab/bin/test/*.test.mjs`, about 60 s, needs git, tar, python3); nothing under lab/acceptance edited; gate.mjs change
is 10 lines.

## Run fixtures (offline unless noted)
| Run | verdict | offlineVerdict | Key reasons |
| --- | --- | --- | --- |
| RUN-CANDIDATE (C2) | DIAGNOSTIC | QUALIFIED | GATE-NOT-RUN, RUN-NOT-ON-GATE; 96 executions; A0 built from C1 runs the v1 allocator |
| RUN-WRONG-CANDIDATE (p+2) | DIAGNOSTIC | DIAGNOSTIC | CASE-FAIL on every candidate case, none on A0; MEASUREMENT-MISSING |
| RUN-FORGED-RECORDS | DIAGNOSTIC | DIAGNOSTIC | identical to the wrong candidate; receipts, selection, caseList, oDomainFingerprint ignored |
| RUN-REFUSED-CASE (migration) | DIAGNOSTIC | DIAGNOSTIC | CASE-REFUSED (MIG-DECIMAL-5-2-TO-6-3, oracle exit 2), ORACLE-REFUSES |
| RUN-UNREGISTERED-VERIFICATION | DIAGNOSTIC | n/a | VERIFIER-UNREGISTERED |
| RUN-UNREGISTERED-SLOT | DIAGNOSTIC | n/a | GATE-SLOT ("Unknown slot s9") |
| RUN-SUPPLIED-FINGERPRINT | DIAGNOSTIC | n/a | W0-UNPINNED; supplied W0 pin and fingerprint ignored (Q55e) |
| export-ignore altered archive | DIAGNOSTIC | n/a | CHECKOUT-MISMATCH; nothing built |
| candidate edits A0's build mid-run | DIAGNOSTIC | DIAGNOSTIC | BUILD-TAMPERED, CONTROL-UNMATCHED |
| real 0.3.7 contract | DIAGNOSTIC | n/a | VERIFIER-REGISTRY-ABSENT, A0-REGISTRY-NULL, SELECTION-UNRESOLVED, TRACE-NOT-FROZEN, GATE-NOT-RUN |

## Agreement with the contract's reference model
46/46 recorded `admit_claim` calls from `ruling_checks()` agree (2 QUALIFIED, 44 DIAGNOSTIC, including CX-R6-UNOPENED-MEANING,
CX-R6-UNMATCHED-CONTROL, CX-R6-INDIRECT-REFUSAL twice each), via `claim_ref.py`. The "45 negative / 17 positive" lists are prose records; the
admission-relevant ones are covered (CLAIM-NULL-ORACLE-PIN, CLAIM-SUPPLIED-NAMES, ZERO-OBJECT-HASHES, STALE-BINARY, EARLIER-COMMIT-FALSIFIER,
NO-MEASUREMENT, UNKNOWN-OBLIGATION, FAULT-REPS-SHORT, COMPOSITION-UNBOUND, W0-UNPINNED, STALE-DEFINITION (GEN-STALE-DEFINITION), NO-VERIFIER,
ZERO-MODES, REFUSAL-AS-AUTHORING); the rest are closure-rule checks `admit_claim` does not model. 38/38 shared document fixtures agree. Where
0.3.7 admits and the lab rejects (Q41d holds: wherever the contract rejects, the lab rejects): every document (Q55a); CODEX-R7-INVENTED-CASES
(CASES-MISSING); CODEX-R7-CANDIDATE-AS-A0 (BUILD-INPUT-STALE); Q42A-STALE-BINARY and RT-NARROW-ROOTS, RT-DEP-UPPERCASE, RT-DEP-UNLISTED,
RT-DEP-OTHER-WORKSPACE (provenance); RT-RELABEL-PROFILE, RT-CONTRACT-RELABEL, RT-DROP-FAIL-ATTEMPT, RT-COUNTS-EDITED, RT-FAULTREPS-RELABEL
(ledger); RT-SCREENING-PREREQ, RT-RUNKIND-SWAP, RT-CONTROL-OTHER-PROFILE, RT-SLOT-ARRAY, RT-VERIFIER-IS-AUTHOR (VA16, B7, VV1, VA14);
LAB-BRANCH-PINS-OWN-ORACLE, LAB-ORACLE-FILE-DRIFT, LAB-IMAGE-NOT-PINNED, LAB-FORBIDDEN-ENDPOINT, LAB-ADMISSION-BLOCKED, LAB-CONTROL-NO-PREREQ
(VA6, VA4, VA5, VA10, "A0 included"). Full table: `node lab/bin/test/claim-fixtures.mjs`.

## Known gaps (stated by the author)
Offline runs are not sandboxed (network, detached processes); the build runs the candidate's own build script and is not hermetic; the
workload identity is the evaluator's plan; CR-NS bars are not judged (no metrics).

## What an end-to-end QUALIFIED run needs
An executing `gate.mjs OBL` (plan in, every case and mode through engine.mjs on a registered slot with faults injected, observations out);
executable pinned case manifests for CS-POSITION, CS-COMPOSITION, CS-NS (and CS-W0-COVERAGE for domain claims); a frozen A0-XTDB entry; a
VERIFIER_REGISTRY entry for the claim commit; oracle invocations plus an adapter from O-REPLAY's JSON report to the expected answer; a frozen
trace in load-contract.json; an NS gate run on one exclusive slot for both sides; per side screening 30 s warmup + 120 s per ladder level or
acceptance 120 s + 600 s per level, plus `pnpm install --offline` and build per side (unmeasured); NS.P2 plus prerequisites came to 96
executions in the fixture.

## Formats
Receipt `triplex-db-2/receipt/2` (0.3.7 core fields plus lab fields receiptId, runKind, profile, contract, endpoint, admission, producer,
counts, profileIdentity.buildProvenanceSha256, ledgerSha256); records build-manifest/1, verifier-record/1, case-result/1 as in 0.3.7 plus lab
run-ledger/1 and build-provenance/1; case manifest `triplex-db-2/case-manifest/1` cases[{id, tags, input, contentSha256, comparator, oracle?,
faultPoint?}]; build spec `lab/config/build.json` {argv, outputs, run} with `{case}` and `{mode}`.

## Questions (ruled Q61)
Contract source for `qualify`; verifierRegistry entries; oracle runners; case-manifest field pins; case-result/1 extension (mode, rep,
comparator, inputSha256); build spec into the contract; workload identity only for CR-NS and CR-GS; frozen trace pin; image pins into the
contract; retained fault witnesses; A0 side verified through the registry's measuredBy.

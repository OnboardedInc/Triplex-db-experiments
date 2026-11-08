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

## On contract 0.3.9 (head e2a082e on merge 0042746 of main 639264e; 0.3.8 pass 46bcb62; saved 2026-11-08 00:44Z)
- 107/107 tests (`node --test lab/bin/test/*.test.mjs`); --verify exits 0; nothing under lab/acceptance edited; gate.mjs keeps the 10-line
  --dry-run block (adds the GS gate to its allowed list).
- Agreement: claim_ref.py records every admit_claim call with inputs, executor slots and every executor call in order; the JS admitCore must
  make the same calls in the same order and reach the same verdict. 0.3.8: 40/40 calls (5 QUALIFIED, 35 DIAGNOSTIC), 4,728 executor calls.
  0.3.9: 59/59 (7 QUALIFIED, 52 DIAGNOSTIC; includes CX-R7-INVENTED-EVIDENCE, -SELECTION-OVERREACH, -RELABELLED-CONTROL), 10,712 executor calls.
  Documents: DIAGNOSTIC on all 63. No disagreement; where the lab differs it is stricter or fails closed (A0's own position and identity
  runs failing: PREREQ-FAILED; `.gitattributes`-altered archive: CHECKOUT-MISMATCH; build edited by an earlier process: BUILD-TAMPERED; a
  comparator passing on different bytes: CASE-RECORD-INEXPRESSIBLE; a null frozenTrace override or an A0 entry without binarySha256: DIAGNOSTIC
  where Python raises).
- 0.3.9 ported: admit_claim with overrides, qualification_run, case_entry_ok, fault_witness_ok, paired_ok, registered_acceptance (null
  buildSpec fails first; image digests against imagePins; A0 measuredBy accepted with kind a0; workload and PAIR_0 measure_pair for CR-NS and
  CR-GS only; a fault-witness/1 per faultPoint injection; an unpinned oracle accepted only if COMPILED). Executor reads buildSpec,
  oracleRunners, oracleAnswerRule, caseManifest, imagePins, writerTrace.generator.frozen, measurementProtocol; writes build-manifest/2 and
  case-result/2. Honest nulls: no fault injector (every faultPoint case fails closed), no PAIR_0 runner (every CR-NS/CR-GS claim PAIRED-NOT-RUN).
  Offline positive G10.scope.shared-collision: core QUALIFIED with 64 case-result/2 comparisons and the A0 rebuild reproducing binarySha256;
  verdict DIAGNOSTIC (GATE-NOT-RUN). No path to QUALIFIED without a gate run.
- Build spec proposal (Q64a, ruled Q65e) in lab/config/build.json on the branch; questions ruled Q65a-d; the executing OBL gate is Q65f.

## Codex round 8 fixes (head 2796455 on merge ce908a8 of main; Q67b, e, i, j; saved 2026-11-08 01:39Z)
- 112/112 tests (`node --test lab/bin/test/*.test.mjs`, about 110 s). Reference replay unchanged on 0.3.9: 59/59 admit_claim calls agree
  (7 QUALIFIED), 10,712 executor calls, 0 self-check errors; documents DIAGNOSTIC on all 63. Changed only lab/bin/claim.mjs,
  lab/bin/test/claim-fixtures.mjs and lab/bin/test/claim.test.mjs.
- Q67b (finding 2): every build is a new instance in its own git-archive checkout with an execution-identity/1 hash over the source tree
  label, buildSpec sha256, lockfile, toolchain (node, platform, pnpm when used), the whole post-build checkout listing (sources, source
  runners, dependencies, symlink targets) and the dist listing; `byBinary` became `byIdentity`; each comparison records an executionSha256.
- Q67e (finding 6): separate mkdtemp roots for checkouts, child HOME/TMPDIR, case inputs and each oracle copy; oracle copies and evidence
  read-only; the oracle copy is listed and re-hashed against the pin before every invocation (ORACLE-TAMPERED refuses the oracle for the
  rest of the run); inputs re-hashed (INPUT-TAMPERED); an instance's runtime re-hashed when another instance ran in between
  (BUILD-TAMPERED); children run detached and their process group is SIGKILLed; claim.mjs, lib.mjs and gate.mjs hashed at start and end
  (EVALUATOR-TAMPERED); evidence verified at the end (EVIDENCE-TAMPERED).
- Q67i (finding 10): `compare` returns the declared comparator's verdict on the retained raw objects; `caseResultVerdict` gives REFUSED for
  exit 2 or X-NOT-MODELED, FAIL for other oracle errors or a missing object. Q67j (finding 11): `kind` reaches admitCore; promotion claims
  get PROMOTION-UNSUPPORTED (DIAGNOSTIC).
- Codex's counterexamples are now fixtures: identical-dist aliasing (RUN-ALIAS-DIST: the alias runs on its own instance and fails), a
  build helper left running (RUN-BACKGROUND-HELPER: killed with its group; a control without the group kill writes the marker), an escaped
  process editing the oracle copy and evidence (ORACLE-TAMPERED, EVIDENCE-TAMPERED, PREREQ-FAILED), the bag comparator ([1,2] against [2,1]
  passes), and a log-source promotion (PROMOTION-UNSUPPORTED).
- Still unprotected offline, so offline is never QUALIFIED and GATE-NOT-RUN stays: a process that leaves its group (setsid, double fork);
  check-to-use gaps between a re-hash and the read after it; runtime re-hashed only between instances, not per case; no filesystem or
  network isolation. Full isolation is EXP-G03's.
- Questions, ruled Q71 (pending): install-metadata exclusions for the identity of a real pnpm build; what "toolchain" covers; whether the
  reference's case_verdict follows Q67i for case-result/2.

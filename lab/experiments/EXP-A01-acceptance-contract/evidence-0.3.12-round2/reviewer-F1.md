# Contract 0.3.12 independent review — CX-VA01-0311

**Verdict: FIX-FIRST.** The new rulings, pending boundary, runner hashes, atomic oracle merge/pin move, evaluator gate and mutation results check out. One provenance defect blocks the requested pin under existing Q59c: V-O05-round4 hashes its review report as its instruction brief. Screening scope does not waive that ruling. The original dispatch is recoverable; no oracle implementation change is indicated.

Reviewed candidate `f5e7a413e17948738472d3465bcfdda3b72b2e41`. I read the builder's complete REPORT-0.3.12.md and validation-summary.json and audited the relevant source, rather than adopting its gate counts. Goals remain lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md; the required scope and operating documents were read.

## Finding F1 — P2: the registry hashes the review instead of the actual verification instructions

**Location:** `lab/acceptance/build_contract.py:6072`; authority `lab/acceptance/RULINGS.md:399` (Q59c), also the registry's own `briefRule` at generator line 1837.

Q59c says: “Every verification and re-check saves its own BRIEF file, so the registry's brief hash identifies the actual instructions.” The V-O05-round4 entry instead sets both `brief` and `record` to `lab/acceptance/pins/O-OBS-V-O05-round4.md`, with SHA-256 `aa275c634384c42977b6ed294be9cb527423a9ad824b9101556017b065bb12dc`. That file is byte-identical to `3e3df9c:lab/verify/O05/VERIFY-round4.md`: findings, methodology, results and handoff, without the original dispatched instructions. The entry's `briefNote` explicitly acknowledges that no separate brief exists. The verifier's O05 tree contains no saved brief/prompt/instructions file. Existing exceptions in `briefRule` name only the older V-O03/V-O04c checks, not O05.

**Reproduction:** run `python3 -I -B lab/verify/A01/v0312/audit.py` after preparing its snapshot. `audit.json` records `brief.compliant=false`, the exact Q59c row and retained registry entry. The ordinary `--verify` still passes: generator line 4304 checks file existence/hash and registry shape, not whether those bytes are the actual instructions. Thus a passing generator does not close this finding.

**Concrete recovery evidence:** the real round-4 launch prompt exists at `/Users/sam/Claude/Projects/triplex-db-2/agents/CX-VO05-2/prompt-2026-11-08T23-21-51-923Z.md`, SHA-256 `4207182cbbda61f04e9647e1dcde291bdc345dc30f49926abeed6e157e2c1baa`. The launch ledger resume/exit records and matching final message bind it to this review and head `3e3df9c`. Exact copies are retained under [v0312/O05-round4-launch-instructions.md](v0312/O05-round4-launch-instructions.md), [O05-round4-last.md](v0312/O05-round4-last.md), and [O05-brief-provenance.json](v0312/O05-brief-provenance.json).

**Proposed fix:** preserve the original dispatched instructions as an explicitly recovered instruction brief with their source provenance, point `brief`/`briefSha256` at those bytes, and keep `record` pointing at the unchanged review. Regenerate and rerun the required contract/evaluator gates. If original instructions cannot be authenticated, obtain a new independent review with its saved brief. Do not fabricate a retrospective summary or silently waive Q59c. I did not edit the registry, pin, oracle or contract.

**Does the missing standalone O05 brief block the pin? Yes, in this candidate.** The defect is the missing instruction preimage, not merely a filename convention. The recovered launch makes it repairable. O05's semantic ACCEPT for screening remains intact; this finding does not promote it to acceptance evidence or allege a defect in observe.py.

## Fresh source-bound execution

A local shared clone checked out the immutable candidate and actually merged current main `28c61c72b52255bd98c31ec7ccd372e1fcc4ab96` into a private review branch, producing `f1f00115f166742381af587bb8435fba21e7d77e`. Its two parents are recorded in [v0312/source.json](v0312/source.json). The merge changes only lab/NOTEBOOK.md and lab/STATE.md relative to the candidate; contract, runner and evaluator bytes remain the candidate's. This gives evaluator Git-integrity checks the correct HEAD rather than an archive inheriting another checkout's identity. Nothing was merged into the actual main branch.

All suites below ran through lab/bin/heavy.mjs with this review's labels; free disk before the snapshot was 13,924,102,144 bytes, above 5 GiB. The builder's earlier source `aaac166` is not substituted for the requested final candidate.

| Check | Independent result | Evidence |
| --- | --- | --- |
| Generator `--verify` | All six outputs byte-identical | [verify-before.log](v0312/verify-before.log), final verification below |
| Required merged-tree evaluator | **108/108 PASS**, 0 failed/skipped/cancelled/todo | [evaluator.log](v0312/evaluator.log), [evaluator-results.json](v0312/evaluator-results.json) |
| Contract 0.3.12 tests | 10/10 PASS | [contract-tests.log](v0312/contract-tests.log) |
| JavaScript screening controls | 3/3 PASS | [screening-js.log](v0312/screening-js.log) |
| Earlier independent reviewer regressions | 35/35 and 5/5 PASS | [reviewer-35.log](v0312/reviewer-35.log), [reviewer-5.log](v0312/reviewer-5.log) |
| Earlier generalized independent variations | 23/23 PASS | [variations.log](v0312/variations.log), [runner](v0312/run_previous_variations.py) |
| Mutation suite | **432/432 rejected**, no crash kills; intended guards checked | [mutations.log](v0312/mutations.log), [full child diagnostics and changed anchors](v0312/mutations.json), [reason audit](v0312/mutation-reason-audit.json) |

The only evaluator assertion-file edits since the pre-0.3.12 baseline `3aaac6eb` are two `maxBuffer: 8 << 20` options and their explanatory comments. Removing exactly those additions restores both files byte-for-byte. No assertion, test, skip condition or expected result changed. The sole evaluator implementation addition is the explicit screening-only blocker, covered by the three JavaScript screening tests.

## Ruling-by-ruling compilation

The [independent audit](v0312/audit.py) compares complete raw rows against **both** `3aaac6eb` and the builder's latest merged-main parent `95db6153`, then compares each topic/rule/basis object with its generated consumer in obligations.json. All **37/37 are exact**. No new ruling was dropped, added or softened. The table below states each semantic consequence; complete source text and destinations are retained in [audit.json](v0312/audit.json). Each row also has two freshly executed mutations, listed by ruling in the reason audit.

| Ruling | Generated consumer | Meaning checked (all exact) |
| --- | --- | --- |
| Q72a | `brokerRules.Q72a` | Detached lock-holder liveness, signal survival and fail-stop; Q84a subsequently replaces the perl helper with a SQLite lock. |
| Q72b | `brokerRules.Q72b` | Every broker read uses an in-request marker or before/after incarnation-marker fence; replay/fences change incarnation. |
| Q72c | `brokerRules.Q72c` | Exact reason strings now; core tagged errors required before default and cannot close the named error obligations yet. |
| Q72d | `brokerRules.Q72d` | Keep A0 correctness fix; re-freeze at P2Q merge and name it in matched comparisons. |
| Q72e | `brokerRules.Q72e` | Whole-log outage replay blocks default; coalesce probes now and test src through tsx. |
| Q72g | `brokerRules.Q72g` | All broker native wiring uses awaitBasisMs 2000 until the facade; bind receipts to claimed head. |
| Q79e | `exactQueryRules.Q79e` | Grammar-based subquery classification, nested parentheses/comments/set operations, generated depths 1–3 and XTDB answer checks. |
| Q79f | `exactQueryRules.Q79f` | Pinned recursive block-comment lexer and identifier boundaries; unterminated comments or lexer disagreements refuse. |
| Q80a | `observationRules.Q80a` | Evaluator-owned contract/run/case context and independently retained collector objects; self-hashes refuse. |
| Q80b | `observationRules.Q80b` | Transitions and wait bounds need checked source events and readback, not labels. |
| Q80c | `observationRules.Q80c` | Integer counters compared to rational thresholds by exact cross-multiplication. |
| Q82a | `observationRules.Q82a` | Six source kinds in trust order, prescribed source.kind syntax and explicit CR rejection. |
| Q82b | `observationRules.Q82b` | Four named safety protocols require agreement between two different source kinds. |
| Q82c | `observationRules.Q82c` | Observer-produced authenticated raw bundles, pinned re-executed normalizers and verifier recollection for acceptance; screening alone cannot close. |
| Q82d | `observationRules.Q82d` | Same-scanner pre-erasure canary at every location; add observer outputs, old index generations and freed blocks. |
| Q82e | `observationRules.Q82e` | Exact XTDB mutation gauge/JSON attributes, QLever metrics and lane D HO+TO evidence sources. |
| Q83a | `seedRules.Q83a` | Shutdown-hook java option on slots only, with changed config/golden keys and old receipts identified. |
| Q83b | `seedRules.Q83b` | Two finish-blocks, independent stable catalog proof, clean-stop/offline tails/tmp refusal and common reference-start fingerprint. |
| Q83c | `seedRules.Q83c` | List existing sparse block indices and re-list before querying, avoiding a potentially absent block. |
| Q83d | `seedRules.Q83d` | No requirement to see transient L0 tries; three stable five-second polls; Q83e explicitly refines the frontier interpretation. |
| Q83e | `seedRules.Q83e` | Separate F/M/T; allow F<M only with stopped-tail maintenance proof and unchanged T; stopped tails and both resumes bind M. |
| Q84a | `brokerRules.Q84a` | Exact SQLite pragmas/version and life-long separate-file exclusive SQLite writer lock. |
| Q84b | `brokerRules.Q84b` | Dedicated writer/checkpointer/four readers and 64 MiB gate/RESTART backstop. |
| Q84c | `brokerRules.Q84c` | Marker-first read transaction, h<=B<=lsn routing, one bounded work unit and retention pins for long work. |
| Q84d | `brokerRules.Q84d` | Current/retired rows clustered in the same database and commit transaction as marker. |
| Q84e | `brokerRules.Q84e` | Lock/recover/PASSIVE/epoch/cross-check startup ordering, including ACKED sidecar corruption detection. |
| Q85a | `datomicRules.Q85a` | Scope creation idempotent and monotonic, including concurrent creates. |
| Q85b | `datomicRules.Q85b` | All and only public constructor scopes, through a documented reversible database-name encoding. |
| Q85c | `datomicRules.Q85c` | Fresh build contexts containing only verified hashed inputs; dirty/reused contexts refuse. |
| Q85d | `datomicRules.Q85d` | One shared TS/JVM range/representation specification and test vectors; either-side unrepresentable values refused by both. |
| Q86a | `isolationRules.Q86a` | All candidate processes in specified hardened VM containers, tarred boxInputs and trusted store, bounded trusted output channels. |
| Q86b | `isolationRules.Q86b` | Per-container PID namespaces, per-case process checks and observed cgroup disappearance. |
| Q86c | `isolationRules.Q86c` | Internal per-arm relay-only network, no-network offline/build cases and per-run preflight; failures remain diagnostic. |
| Q86d | `isolationRules.Q86d` | execution-identity/2 adds image/build/toolchain/store/profile/runtime versions; placement remains separate. |
| Q86e | `isolationRules.Q86e` | No oracle or python in candidate image; immutable explicit authority commits in evaluator-owned clone, never mutable main. |
| Q86f | `isolationRules.Q86f` | Shared-core arm placement; separate lane D gateway; no durable-readback acceptance before SQL storage. |
| Q87 | `mergeGates.Q87` | Evaluator tests on candidate merged with main plus generation and contract tests are mandatory merge gates. |

The broker and native-query additions are also selected as `CONTRACT-Q…` cases in CS-COMPOSITION / G7.composition.ack-and-routed-ryow (Q72), CS-ENTRY / G10.native.read-only-and-safe-params (Q79), and CS-BROKER / G7.broker.promotion-hardening (Q84). Other groups are explicit generated rule consumers. This is a contract compilation review, not fresh implementation qualification for those lanes.

Q83's generated freeze projection preserves distinct F/M/T, maintenance-only stopped-tail proof, unchanged T and resume at M. Q74b is explicitly marked superseded by Q83b/d/e in both obligations.json and load-contract.json; the old snapshot-based interpretation cannot override the later ruling. Q86 requirements are preserved literally while `isolationAdmission.inForce=false`, pins and build argv remain null, and the unprotected list is explicit. It does not claim the requested containment already exists. Q86g stays pending.

## Pending boundary

The final pending file preserves **19 raw rows / 18 unique IDs**, exactly the merged-main parent's rows after subtracting only the authorized 37. The audit uses a multiset of complete rows, not an ID-keyed dictionary that would discard the second Q78e. None of these IDs appears among generated compiled rulings; pending authority remains `none`. In particular **Q78e, Q86g, all Q88 and all Q89 remain pending**, unchanged.

| Pending IDs | Why they remain pending in 0.3.12 |
| --- | --- |
| Q51b | XTDB's next host-log/broker experiment direction was outside this authorized compilation. |
| Q73a–b | W0-1.1.3 deep-write and inconsistent receiver-snapshot cases were outside this version's promoted set. |
| Q78e (two rows) | The original erasure/tenancy open question and later tenant-isolation decision remain source rows; the Sam decision is not inferred from Q85 or Q86f. |
| Q81b–c | Counter coverage for every request kind and compact option-off public-client equivalence were not authorized promotions here. |
| Q86g | VM mount/outbound hardening explicitly waits for Sam; no security settings were changed. |
| Q88a–c | Newly pending lane D SQL durability, DA04 sequencing and erasure/key-storage decisions were preserved, not compiled. Q86f already independently forbids durable-readback acceptance before SQL storage; that overlap does not compile Q88. |
| Q89a–h | Record-time design, route refusals, DA01 pins, current/history mapping, route-equivalence gate, public snapshot-token decision and P4 guard await a later contract. The Sam-facing token decision remains pending too. |

## O-OBS pin, closure and scope

All **30/30 SHA-256 entries** in the retained manifest, oraclePins and oracleRunners agree with checked-out bytes and immutable source blobs: observe.py at `23e2273fc6b15b92821b318acd387f5484155d8a` and all 29 O-REPLAY dependency files at `f195f30af618d3f9b0525a864e913824a315cc8c`. The manifest includes replay helpers, package entrypoints, schemas, fixtures and tests, not merely the observer entrypoint. The current accepted replay dependency is retained, rather than silently taking O05's older replay tree. [audit.json](v0312/audit.json) lists every path, source commit and digest.

I inspected observe.py's imports and subprocess calls: the fixed subprocess dependency is the replay CLI. Runtime normalizers are separately evaluator-selected, outside the bundle, hash-checked before isolated execution, and pinned in the trusted context; their per-context bytes are not missing fixed runner files. This checks pin closure, not the trustworthiness of real production collectors.

**Q45a passes:** merge `4b7b37002ab75ed77b247e18a6137a82f8b8eb1c` has the oracle source commit as its second parent and introduces both observer and pin relative to its first parent. The complete O-OBS pin and runner objects in that merge are identical to the final candidate's, not later repairs presented as atomic introduction. The absent first-parent O-OBS key is recorded as absence, not a null pin.

The pin says screening, names the exact reviewer/source, and Python admission plus JavaScript blockers prevent screening evidence from closing acceptance obligations. `answerMembers.O-OBS` remains null and generic executing-gate integration remains unpinned. No obligation was certified merely by importing this oracle. Q82c's verifier recollection and production collector/parser/inventory work remain requirements. F1 concerns the additional unchanged Q59c instruction provenance rule.

## Mutation reason audit

The original negtest0312.py harness ran unmodified in the merged clone. The wrapper intercepts only its subprocess return objects to retain each name, exact substitutions, exit status and complete stdout/stderr. A clean baseline passes before and after the run. **513 catalog entries = 432 executed + 81 retired anchors**; none of the retired controls is counted as executed, and the separately superseded Q59e diagnostic control is not counted as an extra kill.

Every executed child emits `CONTRACT INVALID:` and no Python traceback. I reviewed the mutations against their full diagnostics, then saved an explicit guard audit for all 432. Some historical controls now reject at an earlier equivalent guard: e.g. changing a receiver's oracle delegation (Q42c) or refusal reach (Q47c) changes the independently frozen pin-scope comparison; these are relevant source changes, not incidental crashes. The audit records those aliases explicitly rather than relying on the first truncated error or counting a different Q number as a miss. Guard-name grouping is evidence indexing, not a proof of exhaustive semantic coverage beyond these substitutions.

The **88 new controls** comprise 74 literal/consumer mutations (two for each of all 37 new rulings) and 14 controls covering O-OBS screening scope, commit, transitive runner closure, hashes and verifier; Python admission and blockers; two-source safety; physical inventory; freeze supersession and M resume; isolation deferral; evaluator count and assertion preservation. All 74 literal/consumer mutants fail with precisely their own ruling's `literal ruling and consumer must match authority`. The other 14 fail at their named semantic/pin guards. Full substitutions and diagnostics, including multiple errors, remain in [mutations.json](v0312/mutations.json); [mutation-reason-audit.json](v0312/mutation-reason-audit.json) records all matching guards and per-ruling coverage.

Passing these controls does not prove Q59c compliance: the existing brief mutation tests preservation of the declared brief rule and file hash, not that a newly registered file is the original instruction preimage. F1 is an independently demonstrated gap outside the 432 substitutions.

## Final verification, reproducibility and limits

The Q47d external test freshly detects both prohibited pending-authority regressions and restores all six outputs: [q47d.log](v0312/q47d.log). The final `--verify` again reports all six outputs byte-identical: [verify-after.log](v0312/verify-after.log). Transitive contract hash remains `2858ea71c4d4cad1e14ef422269cf6d8bae14ad3b5eb8e5ccc3950c1fb462144`. Generator SHA-256 remains `8ea37fba24579e9d0751c480e49eeefb0ee121dc5692c78d5ef48826493efe5d`. The merged review tree is clean after all gates; current main is still the pinned `28c61c72` at final inspection.

Commands/scripts: [prepare_snapshot.py](v0312/prepare_snapshot.py), [run_gates.py](v0312/run_gates.py), [capture_mutations.py](v0312/capture_mutations.py), [audit.py](v0312/audit.py), [audit_mutations.py](v0312/audit_mutations.py). Each gate's argv and exit are retained in the `*-results.json` files. [v0312/BRIEF.md](v0312/BRIEF.md) retains this review's actual dispatch. Two initial read-only audit-helper assumptions (absent pin key and colon in the error header) were corrected; first-error notes are retained. Neither changed candidate bytes or mutation expectations. The temporary 193 MiB local clone was removed only after its suites finished and its clean status/source identity were retained. Evidence and tools have a SHA256SUMS manifest.

**Not performed:** no contract/oracle/evaluator fix, production evidence collection, full historical O05 919-case recertification, live engine/container lifecycle, VM setting, benchmark, package install, root pnpm check, G03 pin promotion, push or actual-main merge. These gates establish the requested contract compilation and evaluator compatibility slice, not full lane qualification or production observation trust.

**Open handoff:** repair F1 using the recovered authenticated dispatch and rerun contract/evaluator gates. The Sam-pending Q78e/Q86g and later Q88/Q89 decisions remain outside this review. No other blocking defect was found in the requested 0.3.12 delta.

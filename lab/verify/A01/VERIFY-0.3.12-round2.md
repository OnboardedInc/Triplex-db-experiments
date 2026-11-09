# Contract 0.3.12 rounds 2–3 — independent delta review

**Verdict: ACCEPT for the dispatched delta at `4eb352b8a1dbc42c9696a61688e55e4698fa63c5`.** The earlier Q59c finding is closed by the original instruction bytes and an entry-wide substitution guard. I read every one of the 17 workload diff hunks: none changes the declared measured operations, input data or offered schedule. Both reviewed re-pins land with the integration merge. Q88a–c compile exactly; the requested pending boundary remains intact. All required fresh gates pass. No blocking finding remains in this delta.

Reviewer: CX-VA01-0311, branch verify/A01-0311. North star: correctness beneath P1–P5; goals and targets remain lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. Required scope and operating documents, both builder round reports, evidence-0.3.12-round3 and the complete INT-XCJ report were read. This review does not replace the independent reviews of the integrated candidate implementations or qualify live QLever C8.

## Exact source and fresh gates

Baseline is the previously reviewed `f5e7a413e17948738472d3465bcfdda3b72b2e41`. Round-2 fix is `72a1a164e1bbc7844b74c5157d4f1f67b374e3fc`; round-3 integration/re-pins are `3de54ac5f5ebc6c2c6d12ed902a6cb1ea360d590`; final dispatched receipt head is `4eb352b8a1dbc42c9696a61688e55e4698fa63c5`.

I created a new local shared clone of that final head and actually merged current-at-start main `28a27d48fd9cebab3ae530afdf7e5296d943bf67` into its private review branch. The resulting test head is `13922ce91c8b98c8cf9dec20e076b322b00fab1b`; only lab/NOTEBOOK.md and lab/agents/CODEX-PREAMBLE.md differ from the candidate. Contract, evaluator, package and test bytes remain the dispatched candidate's. [source.json](v0312r2/source.json) binds both parents and the source cutoff. No actual-main merge was performed.

All long jobs and the offline frozen-lockfile dependency installation used lab/bin/heavy.mjs. The snapshot began with 11,999,612,928 free bytes, above 5 GiB. Installation used pinned pnpm 10.11.0 and only the authorized owned store, with zero downloads and no tracked dependency or lockfile changes. G0 used the unchanged INT-XCJ/X02 shim to execute declared build/typecheck scripts and installed filtered Vitest; it is not represented as a root pnpm check.

| Fresh check | Result | Evidence |
| --- | --- | --- |
| `build_contract.py --verify`, before and after | Six outputs byte-identical on both runs | [verify-before.log](v0312r2/verify-before.log), [verify-after.log](v0312r2/verify-after.log) |
| Evaluator, actual merged review tree | **108/108**, zero failures/skips/cancellations/todo | [evaluator.log](v0312r2/evaluator.log), [execution result](v0312r2/evaluator-results.json) |
| Contract mutations | **451/451 intended rejections**, zero crashes or misses; 532 catalog entries, 81 retired anchors | [mutations.log](v0312r2/mutations.log), [every changed anchor and full diagnostic](v0312r2/mutations.json), [reason audit](v0312r2/mutation-reason-audit.json) |
| XTDB G0, full scope and offline | **1,168/1,168**, 137 expected / zero unexpected skips | [G0-receipt.json](v0312r2/G0-receipt.json), [G0.log](v0312r2/G0.log), [execution](v0312r2/G0-execution.json), [object/content audit](v0312r2/G0-object-audit.json) |
| Contract tests | **14/14** | [contract-tests.log](v0312r2/contract-tests.log) |
| JavaScript screening / earlier independent regressions | **3/3, 35/35, 5/5** | [screening-js.log](v0312r2/screening-js.log), [reviewer-35.log](v0312r2/reviewer-35.log), [reviewer-5.log](v0312r2/reviewer-5.log) |
| Pending-authority Q47d controls | Both prohibited regressions detected; outputs restored | [q47d.log](v0312r2/q47d.log) |

The fresh G0 ID is **`G0-xtdb-20261109T004338Z-399b99`**, not the builder's `...003626Z-7069fe` predecessor. Its source scope has zero diff bytes and no modified/untracked source inputs. Its optional stash snapshot is null; that does not replace source identity. The receipt can be dirty for the concurrent out-of-scope temporary mutation module. I independently rehashed **all 41 retained content objects and all 540 built files**, checked the actual attempt interval/head, and checked all seven newly expected skips against the fresh per-test Vitest inventory. G0 has slot null and no engine execution. No build/test/timeout reason is present.

Generator SHA-256: `914db3d15e91180e8b449fffeeb27b997dc10eb835fff66e10eca6517e985b59`. Transitive contract hash: `ad199b4c915846f24ef6c445dfd9d224bfb2f7a3751cd27a09813706af52f56e`. The evaluator implementation and both assertion files are byte-for-byte unchanged from the previous reviewed candidate. The external oracle pins/runners are unchanged; only the compiled O-CONTRACT runner's generator hash refreshes to the changed generator bytes.

## Q59c fix and general-form controls

The O-OBS registry now hashes `lab/acceptance/pins/O-OBS-V-O05-round4-BRIEF.md`, SHA-256 **`4207182cbbda61f04e9647e1dcde291bdc345dc30f49926abeed6e157e2c1baa`**. I compared its full bytes with the original dispatch recovered in my prior commit `4c9077e`. They are identical. The recovery provenance JSON also matches my retained original, its own hash matches the registry, and the matching last-message hash is retained. The unchanged `record` still points to the actual O05 review; no retrospective summary substitutes for instructions. O-OBS remains screening-only.

`VERIFIER_BRIEF_SOURCES` separately fixes the audited path/digest preimage for each of seven registry entries. `verifier_brief_checks()` checks every entry, checks the exact entry set, and compares its declared path/hash with those preimages and actual file bytes. A self-consistent substitute report/hash therefore fails, rather than passing a file-existence/hash test. The two old V-O03/V-O04c exceptions remain explicit; this fix does not invent new historical launch provenance for them.

All **seven new substitution mutations** execute and reject at their own `Q59c: <entry> must hash the original instruction brief, never its review report` guard: V-O04i, V-O03, V-O04c, V-D01-W0-1.1.1, V-D01e-W0-1.1.2, V-D01c-O-DOMAIN and V-O05-round4. They substitute a real retained review with its correct hash, so the guard is not merely detecting a corrupt digest. I additionally ran **12 in-memory variations** across those entries: review substitution and, where distinct, an unrelated real instruction document with its correct hash. Every intended entry rejects; restoring each original leaves zero brief errors. [delta-audit.json](v0312r2/delta-audit.json) retains every input path/error and the exact recovered digest.

## Every workload hunk, independently read

I compared immutable pre-round source `f483fb64` with integration source `b916d5dc`, read all removed and added lines, and checked the unchanged task packet. Raw diffs are [xtdb-workloads.ts.diff](v0312r2/xtdb-workloads.ts.diff) and [qlever-workloads.ts.diff](v0312r2/qlever-workloads.ts.diff). The independent audit records each hunk header, content hash and my assessment; it does not adopt the builder's Boolean classifications as proof.

The frozen packet `qualification/workloads/temporal-workloads.json` remains byte-identical, SHA-256 `322c773db2049b5a704d36925738859aef4982ca27194d13a659d1b0e9081271`. Its operation names/parameters, data, expected answers, cuts and schedules are unchanged. The workload source files are candidate implementations of those operations, so changes to physical reads, client work, error guards and arithmetic remain charged to the measured application call.

| File / hunk | Changes operations / data / schedule | Independent assessment |
| --- | --- | --- |
| xtdb-workloads.ts `@@ -2,16 +2,50 @@` | No / No / No | Comments and imports document native implementations, exact arithmetic, guards and path counting. |
| xtdb-workloads.ts `@@ -29,7 +63,21 @@` | No / No / No | Reachability interface adds explicit seed source and selector type. |
| xtdb-workloads.ts `@@ -39,17 +87,12 @@` | No / No / No | Session exposes explicit XTQL/SQL read-only closure implementations; no operation descriptor changes. |
| xtdb-workloads.ts `@@ -109,6 +152,23 @@` | No / No / No | XTQL typed integer/fact helpers translate existing attribute filters. |
| xtdb-workloads.ts `@@ -131,108 +191,160 @@` | No / No / No | Native task dispatch, common captured position and seeded frontier traversal implement the same task/cuts; no writes/data/schedule changes. |
| xtdb-workloads.ts `@@ -240,12 +352,17 @@` | No / No / No | Workload 03 keeps purchase-time and at-purchase price operands and adds XTQL equivalent. |
| xtdb-workloads.ts `@@ -264,28 +381,37 @@` | No / No / No | Workload 04 keeps claim coordinate, coverage, policy and event-derived valid cut. |
| xtdb-workloads.ts `@@ -293,41 +419,66 @@` | No / No / No | Workload 05 event count and winning revision unchanged; 06/07 use exact rather than wrapping sums over unchanged operands. |
| xtdb-workloads.ts `@@ -335,54 +486,91 @@` | No / No / No | Workloads 07-10 preserve inventory subtraction, capture-minus-refund, missing entitlement and deadline/watermark operations; exact errors and SQL null guard repair implementation. |
| xtdb-workloads.ts `@@ -396,98 +584,191 @@` | No / No / No | Closure tasks 11/13/14/15/20 move to seeded read-only execution; 12 null fix, 16 lineage and 17 ordered conversion retained with XTQL equivalents. |
| xtdb-workloads.ts `@@ -513,28 +794,40 @@` | No / No / No | Close unchanged 17 assembly; 18 union-duration endpoint segmentation and null guard; 19 shared task execution. |
| xtdb-workloads.ts `@@ -543,8 +836,12 @@` | No / No / No | Workload 19 prediction/customer/feature-known-at/fraud operands and historical subcuts remain the same. |
| xtdb-workloads.ts `@@ -560,49 +857,24 @@` | No / No / No | Workload 20 closure relocates above; supports replace length-1..3 approximation with general counting over unchanged edges/from/to/cut. |
| qlever-workloads.ts `@@ -5,6 +5,7 @@` | No / No / No | Import bounded support-path execution helper; no task descriptor or data change. |
| qlever-workloads.ts `@@ -197,6 +198,7 @@` | No / No / No | Optional native row cap retains 1000 default; completeness witness for support edges only. |
| qlever-workloads.ts `@@ -219,7 +221,7 @@` | No / No / No | Forward chosen cap without changing logical parameters or offered schedule. |
| qlever-workloads.ts `@@ -577,31 +579,22 @@` | No / No / No | Support operation remains distinct node-sequence paths; replace three fixed-depth queries with complete edge extraction and general counting. |

The two substantive interpretation checks are satisfied. Capturing the first call's position and supplying it on later calls implements a coherent task cut; it does not alter the requested temporal operation or add a writer command. Replacing three fixed-depth support-count queries with bounded general simple-path counting implements the packet's existing “distinct node-sequence paths” operation. The unchanged acyclic diamond still has 2/1/0 paths as B>D and then C>D retire. Seeded closure removes unnecessary all-pairs/scratch work without dropping a requested result. Edge extraction, limit-plus-one completeness proof, host traversal, exact-sum reconstruction and typed refusal costs remain measured; this review does not claim equal execution cost or establish live parity for every added query form.

## Atomic re-pins and one report wording correction

**Q45a passes.** Merge `3de54ac5` has first parent `ba282b0f` and second parent integration `b916d5dc`. Both pins are old in both parents, and both become the reviewed new hashes in the merge itself. Both `caseSets.CS-PKT71.pinnedSourceFiles` and `caseSourcesPinned.CS-PKT71` carry the same new values. No other workload is promoted.

| Recipe | Old pin | Merge pin / actual source |
| --- | --- | --- |
| XTDB | `22d785b034e440ca896b3fce7fe2df94e643586cb802fddd940fea84aff31fc3` | `ff39d3f2fcb74ee2a318e8801a12680a4f9f366b4a7f5ed9e20e89d5ccd8a3d0` |
| QLever | `410963c62f46be95525643f5eb78bf4069dee27d986b251f2aca33d05e48d2b3` | `9349878403ee468ce6b64922c648d88f598f799b1c65fc42a712aa47598e54da` |

**Nonblocking P3 documentation finding:** builder REPORT-0.3.12.md:145 says “both parent recipe hashes equal their old contract pins.” That is inaccurate for the second parent: integration `b916d5dc` already has the **new recipe bytes and old pins**, the expected mismatch that this merge fixes. Reproduction: inspect `delta-audit.json.atomicRepins[*].parentsThenMerge`, or hash each parent's recipe and read its CS-PKT71 pin. Proposed wording: “both parents retain old contract pins; the first has old recipe bytes, the integration parent has new recipe bytes; the merge has new bytes and new pins.” This does not invalidate atomic introduction of code plus pin on the contract branch and does not block acceptance. I did not edit the report under review.

## Expected-skip inventory and pending authority

The complete manifest comparison adds **exactly seven entries**, preserves every prior entry/order, and changes only the matching counts (XTDB 84→87, qualification 46→50) plus reasons. No other skip is added or removed. The fresh G0 per-test reports show each of the seven actual tests as gated/skipped; source inspection confirms their integration-environment gating. No assertion was weakened to obtain G0.

| Added live tests | Manifest reason |
| --- | --- |
| C8 XTDB read/write boundary load control; C8 QLever read/write boundary load control; standalone XTDB counter positive control; standalone QLever counter positive control | `live control; runs in G1 against the shared dev residents (C8, INT-XCJ)` |
| J01 racing command IDs; existing assertion/operation identity conflicts; stale-cut serialization conflict | `live test; runs in G1 against the shared dev residents (J01, INT-XCJ)` |

Q88a, Q88b and Q88c match their complete raw RULINGS-PENDING.md rows at the pre-integration parent **exactly**, including topic and basis, and have exact generated datomicRules consumers. The storage policy preserves dev evidence as DIAGNOSTIC for the stated acceptance uses, PostgreSQL SQL storage with fsync and SELECT-only peers, DA04 before DA03, and crypto-shredding plus batched excision/separate key schema. The literal Q88b still carries its resource envelopes and required G1/durability/tenancy/erasure gates; a compact policy projection does not replace that full rule. This compiles requirements; it neither migrates nor qualifies lane D storage.

The pending multiset is unchanged except for those three removals: **25 raw rows / 23 unique IDs**, preserving both Q78e rows and both Q89g rows. Q78e, Q86g, all Q89a–i and all Q90a–g remain pending with authority `none`; none appears among compiled rulings. Other retained IDs are Q51b, Q73a–b and Q81b–c. A dictionary keyed only by ID would miss duplicate-row loss; the independent audit uses full-row counters. RT01 and the Sam-facing tenancy/VM/API decisions are not inferred or compiled.

## Mutation results and PASS audit (rule 9a)

The original negtest0312.py harness ran unchanged in this attempt. Every one of **451** executed substitutions emits `CONTRACT INVALID:` and no traceback; the complete diagnostics match intended guards or explicitly reviewed legacy equivalent guards. The baseline passes before and after, excluding an unrelated universal failure. The **19 added controls** are seven Q59c substitutions and twelve round-3 controls: Q88 literal and consumer pairs (six), reverted/omitted pin for each recipe (four), promoted dev evidence and unsafe peer role (two). All 19 reject at the exact intended Q59c/Q88/Q45a guard. The old 432 controls also freshly reject. Retired anchors remain 81 and are not counted as kills.

The following is every place in my review code/report pipeline that turns observations into a receipt, successful check or verdict. Raw command collectors preserve observations; their exit codes alone are not the semantic acceptance decision.

| Code / conversion point | Content check | Freshness check | Binding check |
| --- | --- | --- | --- |
| prepare_snapshot.py → source identity JSON | Exact candidate checkout, two merge parents, only permitted main-document changes | Creates a new clone in this attempt's new directory | Full immutable candidate/main/review heads; no engine slot |
| capture_mutations.py + original harness → raw mutation records | Retains exact name, substitutions, child exit, stdout and stderr; harness header check is re-judged below | Children execute now, generated temporary module is removed; new output directory | Same scratch source, source digest in raw harness output, retained changed anchors |
| run_gates.py → raw command result records | Exact argv and actual status/logs; raw status is not adopted alone | This attempt launches each command; no builder result is imported | ROOT points to the source-bound review clone; audit_outcomes checks exact bytes |
| audit_mutations.py → intended-rejection audit | Every child has semantic invalid header, no crash traceback, matched ruling/explicit equivalent guard; added 19 exact guards | Consumes this attempt's 451 captured child results, not old harness counts | Same generator digest/source/anchors; exact counts and per-control diagnostics retained |
| run_g0.py → copied raw receipt and outputs | Requires full-scope actual PASS counts; preserves the new receipt/objects for independent re-judgment | Computes new receipt set from before/after this command and records start/end | Records exact head/argv, offline flags and predecessor; final binding is checked below |
| audit_receipt.py → G0 object/content audit | Exact 1168/1168/137 counts; all 41 objects and 540 build files rehashed; seven actual skip assertions; all steps zero, no reasons/timeouts | Receipt timestamps lie within recorded current command interval; distinct new run ID | Exact review HEAD, zero executed-source diff, lane XTDB, G0, slot null, correct experiment/inputs/build identities |
| audit_delta.py → provenance/ruling/pin/skip/hunk audit | Original brief bytes, substitution outcomes, full-row Q88/pending comparison, exact skip manifest, both pin projections and all hunk preimages | Reads current clone and immutable source blobs anew; records audit time | Exact commits/parent relationships/hashes and recovery commit; source-only checks have no engine slot; hunk meaning is my manual inspection |
| audit_outcomes.py → combined semantic outcome audit | Parses 108 actual TAP successes; exact Python/JS denominators; 451 reason matches; six output hashes and Q47d controls | All raw logs created after this attempt's snapshot; only current output directory consumed | Exact review HEAD and candidate byte equality for all relevant tracked inputs; G0 separately source/object audited |
| This report → ACCEPT delta verdict | Manual hunk/ruling review plus the above independently checked observed bytes; limitations retained | Uses these newly completed runs, with historical evidence explicitly labelled | Verdict names the dispatched candidate and tested main cutoff; does not qualify later main changes or live engine obligations |
| Final checksum manifest → evidence-integrity statement | Recomputes each retained artifact's SHA-256 and verifies it | Manifest generated after these current results and final report | Relative evidence paths resolve within this verifier worktree; no qualification claim inferred from a checksum |

Two initial read-only audit assumptions were corrected and their notes retained: the compiled O-CONTRACT generator hash legitimately refreshes, and build-manifest file paths are already repository-relative. No candidate source, assertion, raw result or expectation was changed. These are audit-helper corrections, not hidden gate reruns. The G0 wrapper records raw observations; its separate receipt auditor, executed after the run, supplies the full content/freshness/binding check.

## Scope cutoff, retention and handoff

While tests were running, main advanced to `ada97d150e37b9ab73028af7ca82ecfc0621744c`, adding R35/Q91 pending rows and their regenerated pending/hash metadata. That change is outside the dispatched `4eb352b` candidate and this verdict. [main-advance.json](v0312r2/main-advance.json) records the advance. Preserve those newly pending rows when reconciling the real merge and satisfy Q87 on that final merge result; this review does not certify an untested future conflict resolution. The actual evaluator run used main current at this attempt's start, not an archive or historical builder run.

The earlier QLever C8 loaded-ancestor timeout remains a separate CX-C8-R4 investigation, as the integration report states. Passing offline G0 and re-pinning candidate recipe code do not turn that failure into a live C8 or performance PASS. Compact encoding remains opt-in/default-off; no new compact-on promotion is granted here. O-OBS remains screening-only; G03 isolation pins remain deferred and lane D storage migration/durability remains separate work.

**Not performed:** no reviewed-code/contract fix, engine/container lifecycle, exclusive slot, live C8 retry, G1/G2, production collection, lane D migration/durability probe, benchmark, full root pnpm check, push or actual-main merge. The temporary clone, its owned dependency tree and generated outputs are removed only after all jobs finish and source/object checks are retained. Raw first failures from the reviewed work and this review's raw gate outputs remain preserved. [BRIEF.md](v0312r2/BRIEF.md) retains this review's actual dispatch.

**Handoff:** accept the requested rounds 2–3 delta. Only the nonblocking report wording correction above and the later-main Q91 merge/gate reconciliation remain; the original F1 requires no further fix.

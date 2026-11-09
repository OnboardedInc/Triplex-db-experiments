# Contract 0.3.13 — independent review, CX-VA01-0311

**Verdict: FIX-FIRST.** The dispatched candidate's ruling compilation, R36 amendments, pending boundary, atomic re-pins, 494 mutations and standalone evaluator check out. It does not currently merge with main: four conflict regions in lab/bin/gate.mjs prevent the required Q87 merged-tree evaluator run. I did not resolve reviewed code or relabel standalone 108/108 as merged-tree evidence.

Reviewed immutable head **`6b8d2182d78e567cf8e385622c9a259e8892687a`**, including the complete builder REPORT-0.3.13.md, validation-summary.json, INT-D/REPORT.md, and R36's relevant field/binding definitions and section 6. Goals remain lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md; the required scope/operating documents were read. North star: correctness beneath P1–P5. No engine or workload qualification is inferred from this contract review.

## F1 — P2: current-main merge conflicts block the required Q87 check

**Location:** `lab/bin/gate.mjs:26`, `:45`, `:725`, `:731` in the reviewed candidate. These four regions cover imports, environment cleanup, dry-run lane admission and executing lane admission.

**Reproduction:** create a new local clone, check out candidate `6b8d218`, then merge main **`e90c15846a7fb0b93f7d4debdef3dcb76a4f24d4`**, which was current at review start. `git merge --no-ff` exits 1, with `lab/bin/gate.mjs` the sole conflicted path. The attempted merge remains at candidate HEAD with four conflict regions. [v0313/source.json](v0313/source.json), the durable `merge.log` and `merge-conflict.patch` retain the exact revisions, result and conflict bytes. [prepare.py](v0313/prepare.py) reproduces the attempt without editing the main checkout.

DA01 adds LOCKS, Datomic environment isolation, and Datomic admission for G0/G1. Main's newer W02 integration needs MAIN, the broker environment variables and GS_LANES selection. Choosing either whole side would discard the other parent's required behavior. The automatic portions of a conflicted tree are not a finished integration and are not the required Q87 source.

**Proposed fix:** the builder/integrator should merge this pinned current main, preserve both imports and both sets of cleaned environment variables, combine Datomic G0/G1 admission with W02's GS-specific admission in both dry-run and executable paths, and review the rest of the automatic merge for both parents' intent. Commit that concrete merge, then run the unchanged 108-test evaluator, generator verification, contract controls and both applicable G0 gates on its exact bytes. No assertion or skip policy needs to be weakened. This reviewer made no such fix.

**Observed boundary:** standalone candidate evaluator **108/108 PASS**; evaluator on the branch merged with current main **NOT RUN / not verified because the real merge conflicts**. The builder's `c3ea3537` evidence includes dispatch main `15927efe`, not this later main. Q87 is mandatory, so the standalone and historical results cannot make this version safe to merge today.

## Independent source, ruling and amendment checks

A fresh local shared clone checked out the exact final candidate. A second clone attempted the real current-main merge above. All semantic contract and candidate gates use the first clone, whose tracked source bytes stay identical to the dispatched candidate. This separation keeps the merge failure visible and prevents partial-merge files from contaminating standalone results. Source identities, start time, reviewer baseline and free disk are recorded in source.json. Both clones are private review scratch paths, not edits to either real branch.

### Fifteen newly compiled rulings

I compared each new topic/rule/basis with the actual pending source at dispatch main **`15927efed3a6dd48d620b19bd0201fe862344b33`**, then with its generated consumer and compiled-ruling entry. **15/15 match exactly.** Q93a/b originate in a Today/Proposed table: their proposed text, rather than the `n/a` Today cell, is compiled verbatim and attributed to R36 section 6. The other thirteen source rows remain byte-identical in RULINGS.md. The builder's copied authority JSON is not the authority for my comparison.

| Ruling | Generated consumer | Meaning checked; all exact |
| --- | --- | --- |
| Q91a | qleverEvidenceRules | Built base plus bounded declared delta; base/delta/touched-block counts on receipts; earlier delta-only performance diagnostic. |
| Q91b | qleverEvidenceRules | No shared-resident --fresh delta policy; qualified Q91c rebuild loop handles growth. |
| Q91c | qleverEvidenceRules | Exclusive 10M-base threshold measurements, monotonic/spread keys, broker-log blue/green generations, per-read leases and Q89i identity; no per-graph workaround. |
| Q91d | qleverEvidenceRules | First rebuild-index on an exclusive-slot copy, not the shared resident. |
| Q93a | seedRules | Only a pre-freeze-pinned content fingerprint, read by the measuring process/endpoint before its warm-up, grants seed reuse; all other evidence refuses or is diagnostic. |
| Q93b | seedRules | R36 field/pin/count definitions, deadline on every read, two starts reproducing D and layout L before golden publication. |
| Q93c | seedRules | Clones compare full stored-column D; E1 fresh seeds compare D-prime, normalizing only engine-assigned fields with source comments and a guarding test. |
| Q94b | goldenScenarioRulings | W0-valid streams, explicit O-DOMAIN checks for every named domain claim, fail closed when absent; W01 retired. |
| Q94c | goldenScenarioRulings | Frozen TARGETS trace through the W0 mapper; private GS writerTrace retired; burst and maintenance event each measured window. |
| Q94d | goldenScenarioRulings | Per-run G0, fresh scope/verified clone, start/end counts and QLever Q91a counts. |
| Q94e | goldenScenarioRulings | Every pre-0.4.0 GS receipt diagnostic, no closure or comparison; defect reports stay defects. |
| Q94f | goldenScenarioRulings | Separate-current-store-only GS.04b; GS.04 engine-kill required on every lane, exclusive only. |
| Q94g | goldenScenarioRulings | Product atomic outbox for GS.19/GS.10; harness file can only support diagnostic P3 checks. |
| Q94h | goldenScenarioRulings | GS.10 old-release in-flight reconcile race required, scheduled in P5 round C after A/B. |
| Q94i | goldenScenarioRulings | Vendor revision in W0-1.2 with signal-ack; superseded outcome remains flagged for Sam. |

Full literal source rows and destinations are retained in [authority-audit.json](v0313/authority-audit.json). All new rules also have at least one executed mutation; in fact every one has a literal-weakening and a dropped-consumer control.

### Q93 “change to” rows and retirements

I independently read **R36 section 6** and compared its Proposed cells with the amended effective rules:

| Older ruling | Actual amendment / check |
| --- | --- |
| Q74b | Exact recipe text: two finish-blocks, jobs-0 waits, docker stop -t 60, copy stopped container; timeout refuses and nothing grants. |
| Q74c | Preserves the complete existing E1 bar and seven predictions; appends exactly the rerun condition for recipe/image/XTDB version changes. |
| Q74d | Exact health precondition plus in-driver G0; owner.json holds slot ownership only. |
| Q83a | Exact diagnostic-aid wording; no rule requires stop lines. |
| Q83b | Exact supersession by Q93a; recipe stays, readings diagnostic, xt.live_tables only on a freshly started node. |
| Q83c | Exact diagnostic-tool wording; B never reads xt.block_files. |
| Q74a/e/f/g | Effective rules unchanged. |
| Q92c/g | Complete pending rows unchanged; not silently compiled. |
| Q83d/e | Absent from active seedRules and compiled-ruling entries; exact old rule objects retained as historical retiredSeedRules. |

The generated load-contract.json seedRules/freezeProtocol equal obligations.json. The old F/M/resume gating is removed. The replacement binds every run to the measuring process and endpoint before warm-up, pins expected content after the last seed commit and before the first finish-block, reads all stored columns, carries independent manifest counts/O-DOMAIN checks, refuses read deadlines, and requires two-start D/L publication. Clone D and fresh-seed D-prime remain distinct; normalization does not weaken clone identity. This publishes requirements for a later K01 implementation; no K01 saved readiness certificate or implementation is adopted here.

Q94e is additionally enforced by Python executing admission, GS blockers and JavaScript executing admission. The three fresh JS policy tests cover GS executing kinds and mixed claims. Document-only structural validation can still report its structural outcome, while its outer result remains DIAGNOSTIC/DOCUMENT-ONLY; this path cannot close an obligation or enter an executing comparison. Both original evaluator test files are byte-identical to dispatch main. The changed synthetic domain-positive control still asserts QUALIFIED twice and now targets O-DOMAIN receiver ordering instead of a prohibited GS claim.

### Pending boundary

A full-row multiset comparison, including duplicates, shows that the final pending file removes only the authorized fifteen new IDs and preserves **46 raw rows / 44 exact IDs**. Both Q78e rows and both Q89g rows survive. All requested holds remain uncompiled with authority `none`: **Q78e, Q86g, Q89a–i, Q90a–g, Q92a–k, Q94a, Q95a–h and Q95-S**. Other retained IDs are Q51b, Q73a/b and Q81b/c. No Sam-facing tenancy, VM, API or erasure decision is inferred from another rule. TARGETS acceptance sizes and Q88 storage requirements stay unchanged.

There is an inherited inventory spelling quirk: generated pending IDs list `Q95` for the raw `Q95-S` row. The actual Sam row is retained byte-for-byte, remains pending and gains no authority; the independent raw-ID inventory records the suffix. This is not a newly introduced promotion or a reason to drop that row.

## Every re-pin and workload diff

**Q45a atomicity passes.** Commit **`260d46c715ddd6465894869eeceab08059fcf4ef`** has parents dispatch main `15927efe` and accepted integration **`6e5dde9778ac689f18bf039aa760969c506a0272`**. Both parents retain the old contract pins; the integration parent already has the new source/config bytes. The merge introduces those bytes and both new contract identities together on the contract branch. The final candidate retains the same pin values. [authority-audit.json](v0313/authority-audit.json) records every parent/merge value.

| Pinned item | Previous | New |
| --- | --- | --- |
| Datomic image | image null / imageId null | `tx2-datomic:1.0.7745-da00`; `sha256:34fb9db10a278ff5614e7ac59788a2456329c75d098871ce1831465e243f2dcf` |
| packages/testkit/src/index.ts | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28` |

I read the single testkit hunk **`@@ -2885,3 +2885,15 @@`** myself. It appends route-equivalence and route-history named exports/types after the existing runtimeConformance body. Every byte of that old body remains a prefix of the new file. It changes **no measured logical operation, fixture data or schedule**. Exporting the separately accepted helpers is candidate code integration, not substitution of workload inputs. Exact raw diff is retained durably as testkit-index.diff. The packet, native workload pins and XTDB/QLever image pins are unchanged.

The new testkit hash agrees in **all three** projections: O-TESTKIT's pinned source, CS-U44.pinnedSourceFiles, and caseSourcesPinned.CS-U44. Datomic image identity matches slots.json and oracle-contract.json. No Docker image was inspected or rebuilt; this is immutable accepted-source/config pin verification, not a new image or engine qualification. External oracle pins/registry remain unchanged; the compiled O-CONTRACT generator digest necessarily refreshes.

## Fresh gates and evidence

All long jobs and the offline, frozen-lockfile install used lab/bin/heavy.mjs with this review's labels and the authorized owned pnpm store. Disk at preparation was 16,729,362,432 bytes free, above 5 GiB, and each later heavy driver checks the floor. Raw command/result records bind argv, start/end, actual exit, candidate HEAD and output hashes; no builder PASS is imported as a fresh observation.

The **standalone** candidate evaluator freshly passes **108/108**, no failures/skips/cancellations/todo. Generator --verify passes before and after the Q47d controls with all six outputs byte-identical. Contract tests pass **18/18**, new JavaScript policy tests **3/3**, and prior real replay-payload regressions **5/5**. Q47d catches both prohibited pending-authority controls and restores the outputs. The obsolete historical null-Datomic-image test is not counted as a current gate; this version explicitly authorizes the image pin and current controls verify that a missing image still blocks.

The original mutation harness runs unchanged and freshly rejects **494/494** at intended guards, no traceback/crash kills or misses. Catalog **582 = 494 executed + 88 retired**. The retired controls are the previous 81 plus six explicitly retired frontier/process controls and the old prohibition on pinning Datomic; none is counted as executed. The **50 added catalog controls** include literal/consumer pairs for all fifteen new rules, effective amendments, complete historical-rule revival, D/D-prime, deadlines, two-start publication, QLever delta policy, GS holds, image identity and every testkit projection. Two old Q78 labels now reject at the equivalent Q61i missing-image/applicability checks. Full substitutions and full multi-line diagnostics remain in durable mutations.json and mutation-reason-audit.json; [mutation-summary.json](v0313/mutation-summary.json) records coverage and count identities.

The G0 observations below are candidate-only. The merged-tree Q87 result remains blocked regardless of standalone success.

| Offline G0 | Fresh result | Source-bound current receipt |
| --- | --- | --- |
| XTDB | **1,218/1,218**, zero failures, 137 expected / zero unexpected skips, scope full | `G0-xtdb-20261109T034417Z-08ce3a` |
| Datomic | **1,253/1,253**, zero failures, 66 expected / zero unexpected skips, scope full | `G0-datomic-20261109T034040Z-c8a898` |

Both name the exact candidate HEAD, zero executed-source diff bytes and no modified/untracked executed-source inputs. Both have slot null, all steps zero, no timeout/reason, and receipt timestamps inside this attempt's actual command interval. The audit checks **41 XTDB and 48 Datomic immutable content-addressed objects**, including the captured parent-grant bytes rather than today's reusable heavy-owner path. It also checks **566 XTDB and 528 Datomic built-file preimages** retained against each run's build manifest. [result-audit.json](v0313/result-audit.json) retains the actual counts, identities, object list, command timing and source hashes.

First XTDB G0 `G0-xtdb-20261109T033913Z-a682c4` also passed 1,218/1,218. The later Datomic build overwrote three declaration outputs (`TriplesLive.d.ts`, its map and `Triple.d.ts`) before my combined build-file audit. This was an evidence-capture limitation, not a test failure or reviewed source change. I preserved the mismatches in durable build-overwrite-audit.json, captured all Datomic build bytes, and reran XTDB **once** with `--previous` linking the first review run and an explicit capture reason. The rerun again passed, and all its build bytes were immediately captured. No assertion, timeout, skip inventory or candidate file changed. The first passing attempt and the initial failed audit observation remain retained; only the fully captured attempts are used for the complete build-byte audit above.

Generator SHA-256 remains **`07c98812ec83fe8a7e32dd09418d40522b48b3dc53e2d5f3df6f7007288d98e5`**; transitive contract hash remains **`b54ce77a391736254ab76c51d9d147010ca99df5645f0b87e32e4d14049b9c3c`**. No contract pin or generated file on this reviewer branch was changed. The original mutation harness creates and removes only its temporary mutant in the disposable candidate clone; Q47d restores its temporary inputs/outputs, and final source equality is checked.

## PASS audit — preamble 9a

Every observation-to-status/receipt/verdict boundary in my review tooling is listed here. Raw collectors explicitly record observations; they do not turn an exit code into merged-tree or live-engine qualification.

| Boundary | Content check | Freshness check | Binding check |
| --- | --- | --- | --- |
| prepare.py → source/merge-attempt record | Exact candidate checkout; real merge exit, conflicted path list and raw output | New clone/output directory; attempt start recorded | Full immutable candidate, current-main and reviewer commits; no slot |
| run.py → raw command observations | Exact argv, actual exit and log hash; no unobserved status is inferred | New `xb` log per command, start/end recorded; output directory never reused | Exact candidate HEAD asserted before invocation; code/inputs rechecked by audit_results |
| capture_mutations.py + unchanged original harness → raw mutation records | Actual changed anchors and full stdout/stderr/exit retained; harness invalid-header rule independently re-judged below | Every child runs this attempt; temporary module removed | Scratch generator, actual printed generator hash and per-child substitutions |
| audit_mutations.py → intended-rejection audit | 494 semantic invalid headers, no traceback kills; expected/equivalent guard matches; 15 literal/consumer pairs; retired controls excluded | Consumes this attempt's children, not historical PASS outcomes | Exact candidate and changed anchors; prior reviewed guard patterns are only expectations, hashed and compared with new output |
| audit_authority.py → literal/amendment/pin/hunk findings | Actual pending/R36 proposed text, complete duplicate-preserving row sets, active retirement, exact parent/merge hashes and projections; manual source-hunk meaning | Reads candidate/source blobs anew and records audit time | Immutable dispatch/integration/merge/candidate commits, R36 file hash and measured packet/source bytes; no engine slot |
| run_g0.py → raw G0 attempts/objects | Copies the sole new receipt, raw output and immutable object preimages with hash/length checks; preserves actual nonzero outcomes | New receipt set computed before/after each real command; new raw directories and times | Candidate HEAD, lane, predecessor, offline flags and heavy grant; no engine slot claimed |
| recapture_xtdb.py → retained build preimages and one rerun | Datomic bytes must match its existing current-attempt manifest before retention; XTDB rerun gets actual new receipt/objects and every build byte is checked immediately | Actual Datomic output still current; separate explicitly reasoned XTDB rerun, linked to prior attempt, never overwrites it | Exact per-attempt build paths/digests and source; direct heavy child admission; same unmodified test source/expectations |
| audit_results.py → standalone result audit and FIX-FIRST | Exact TAP/unittest/JS/G0 denominators, all six regenerated hashes, actual Q47d output, semantic mutant rejections, immutable object and build-byte checks | Current command intervals after review start; unique new G0 IDs/timestamps; current log hashes | Exact candidate source equality, lane/offline slot null, source diff zero, grant objects; explicitly refuses to certify the conflicted current-main tree |
| This report → review verdict | Independent manual source/ruling review plus audited current observations, with the merge failure and capture limitation retained | New runs are distinguished from builder/INT-D historical receipts | Verdict names exact candidate/current-main cutoff and F1; standalone tests never substitute for Q87 |
| Final manifests/index → retention integrity | Rehash every retained report/tool/summary/raw file and record byte length/path | Sealed only after all writers finish | Owned reviewer paths and exact durable root; a checksum is byte-retention proof, not engine qualification |

Two mutation-auditor bookkeeping assumptions were corrected: Q83e revival uses a consolidated `Q83d/e` Q93 guard, and that newly aliased control must still count as a new catalog entry. Notes are retained in audit-first.txt; no child outcome or expectation was dropped. The three overwritten declaration files and explicit recapture are also documented there and in the raw comparison. No failed test was relabelled or removed.

## Retention and handoff

All raw outputs, full mutation results, G0 output/object trees and complete build preimages are durable under:

`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0311/contract-0.3.13-attempt1/`

This follows preamble 9c: files over 1 MB and whole raw/gate directories stay outside Git. The repository retains the [short index](v0313/INDEX.md), [raw SHA-256 manifest](v0313/RAW-SHA256SUMS), small audit summaries, source/command tooling and the actual [review dispatch](v0313/BRIEF.md). The manifest uses paths relative to that durable root; evidence-index.json records counts, sizes and the manifest digest. Final sealing rehashes all retained bytes. Disposable source clones, owned node_modules and generated outputs are removed only after all commands finish and source/object bindings are preserved.

**Not done / not verified:** no resolution of reviewed merge conflicts; no evaluator on a successfully merged current-main tree; no live XTDB/Datomic/QLever G1/G2, image rebuild/readback, container lifecycle, exclusive slot, storage migration, production durability/erasure/tenancy qualification, benchmark, root pnpm check, unrelated CLI pack repair, push or merge into actual main. INT-D's earlier unbuilt-CLI pack limitation and the other pending implementation/qualification work are not fixed or relabelled by this review. The new image increases pin-level possibility, not achieved closure.

**Open handoff:** fix F1 on the builder/integration branch, retaining both parents' behavior, and rerun Q87 plus the source-bound contract and G0 checks on that final merge. No other blocking defect was found in the requested contract/ruling/pin delta.

# Contract 0.3.13 round 2 — independent delta review

**Verdict: ACCEPT (merge to main).** Reviewer CX-VA01-0311. The prior report's F1 is closed, with both parents' behavior retained and no new blocking finding. This review addresses only that merge. No reviewed source or contract was fixed by this reviewer.

Candidate **191f51c173ae605e278bebae319175a143b7ee2a** records code merge **2ec12111466f53718e1c8420f112402883981c28**, with parents **6b8d2182** (previously reviewed candidate) and **9a7996e2** (builder's current-main cutoff). I read round 2 of the builder report and its evidence index, then compared actual Git blobs and remerge diffs independently. Required scope/protocol documents were read; no older inherited performance objective overrides the lab scope.

For Q87, I also made an actual disposable merge with review-start main **e4850f801b8a7771a94e1b3394ecc5ddf24efb5f**. It merges cleanly at **897a757fdf7acd84379c0f539e014dc850029e31**. Main advanced only NOTEBOOK.md and STATE.md, and these are the only differences between the tested tree and candidate 191f51c. All executable, contract, test and configuration blobs are identical. The complete merge commit preimage, tree identities and note-only patch are retained durably. This is a merge in a private snapshot, not a merge into actual main. At sealing, main had advanced to cd1266d2 only in NOTEBOOK.md and STATE.md; final-source.json records that boundary. No later executable main change is claimed tested.

## F1 closure and four regions

| Merged gate.mjs region | Independent check |
| --- | --- |
| Imports, line 27 | Retains both MAIN (owned pnpm-store path) and LOCKS (Datomic parent-grant binding), with all other imports. |
| Environment cleanup, lines 47–56 | Union of both parents' live/engine flags; preserves Datomic URLs and integration flag removal, W02 broker/commit-path removal, existing admission/planner cleanup, then applies explicit owned overrides. |
| Dry-run admission, line 743 | Shared gateLanes admits XTDB/QLever plus Datomic for G0/G1; GS uses W02's GS_LANES; unsupported Datomic G2/G4/NS/OBL still refuse. |
| Executing admission, line 749 | Uses that same helper. Actual execution and dry-run cannot select different lane matrices. Dry-run remains a plan, not a receipt or semantic qualification. |

I read every gate diff hunk against both parents. W02's entire gateGS section is byte-identical to main, including broker setup, fresh-world arguments, refusals, domain/replay fixtures, diagnostic fields and slot metadata. W0's GS build/hash inclusion and failed-build early return survive. DA01's Run.step section is byte-identical to the prior candidate; Datomic package identity, tests, G1 cleanup/route-equivalence and parent-heavy-grant handling survive. The duplicate identical Datomic package entry is reduced to one.

I also read all imported QG1 engine hunks. Comparing added/deleted lines shows that the merged engine contains exactly main's QG1 patch on top of the candidate, and exactly the candidate's DA01 patch on top of main. QLever memory/seed overrides still require an exclusive QLever slot and accept only the experiment's 1000M override; captured seed hashes, empty-index check, seed binding, read-only mount and bounded rebuild retention remain. Datomic branches are retained. Live startup is outside this review.

## Other merge changes

“Nothing else changed” holds for unaccounted changes, not literally for the four gate regions alone. Eight merged paths differ from both parents: gate.mjs, automatically combined engine.mjs and RULINGS-PENDING.md, the two regenerated contract outputs, the version-local pnpm shim, the report and four new merge regressions. Git's remerge diff identifies exactly six manually resolved/added paths; all other merged files equal one parent, including modes. [merge-audit.json](v0313r2/merge-audit.json) lists these paths and parent-section hashes; full parent and remerge patches are durable.

The shim adds only recognition of the exact owned `--config.store-dir` prefix. It retains the declared package scripts and installed Vitest; no assertion, timeout, skip inventory or script is weakened. Main's heavy polling change is preserved automatically. The final 191f51c commit adds only report/evidence and two small G0 receipts.

Compared with the prior accepted contract semantics, obligations.json changes only the pending-file hash in two projections, the pending ID list and the transitive hash. Every compiled rule, pin, blocker and generator byte remains unchanged. Exactly main's six complete Q96a-c/Q97a-c rows are appended, with every older raw row and duplicate retained. They remain pending. Transitive hash is `7c67653511b51fb041c3d3115e90f90d347c041ae091f142762889d0afd485e7`; generator SHA-256 remains `07c98812ec83fe8a7e32dd09418d40522b48b3dc53e2d5f3df6f7007288d98e5`.

Both evaluator test files are byte-identical to both parents. claim.mjs and the full mutation harness are byte-identical to the prior candidate. No evaluator assertion was weakened, removed or skipped by this merge. The earlier report's ruling, R36 and pin review is retained as history; this round does not re-open that accepted semantic delta.

## Fresh merged-tree checks

The independent content/freshness/binding audit passes for all results below. The final evaluator result is from the actual linked worktree; its earlier normal-clone run also passed 108/108 and is retained separately. Long jobs and the frozen offline install use heavy.mjs and the owned pnpm store. Free space at preparation was 12,858,884,096 bytes, and the drivers check the 5 GiB floor before further heavy work.

| Check | Result |
| --- | --- |
| build_contract.py --verify, before and after controls | All six outputs byte-identical |
| Contract tests | 18/18 |
| Builder merge and GS policy tests | 7/7 |
| Prior real replay-payload regressions | 5/5 |
| Additional independent/QG1 boundary checks | 5/5 on corrected reviewer check; original 4/5 retained |
| Mutations | 494/494 intended rejections; zero crashes/misses; 582 catalog = 494 run + 88 retired |
| Q87 evaluator on actual current-main merge | 108/108; zero failures/skips/cancellations/todo |
| Q47d authority controls | PASS, temporary outputs restored |
| XTDB G0 | 1,218/1,218; 137 expected skips, zero unexpected |
| Datomic G0 | 1,253/1,253 on unchanged rerun; 66 expected skips, zero unexpected; first timeout retained |

Every mutation's full substitutions and diagnostic are retained. The independent auditor matches expected/equivalent guards against this attempt's output; all fifteen newly compiled 0.3.13 rulings retain their literal/consumer controls. Historical expected guard patterns supply expectations only, not observed results.

The first XTDB attempt, `G0-xtdb-20261109T041735Z-a76820`, is retained as **FAIL**, not adopted as qualification: normal-clone Git topology made MAIN derive the clone-local store and private lock directory. The strict owned-store guard rejected version/build commands; missing dist then caused typecheck errors and one qualification test import failure (1,217 passes, one failure). This was a reviewer environment error. I preserved all 30 raw files and 41 object references, then registered the exact same test commit as a real linked worktree, moved the installed dependencies back to their identical paths and changed no reviewed source. The corrected XTDB run explicitly links the failed run with --previous and explains the topology correction. Its source tree identity equals the failed attempt's. A fresh evaluator is also rerun in the final linked topology; the earlier clone's 108/108 is retained separately.

Shared heavy-pool owner bytes are captured while the corrected runs execute and audited against the command intervals. The clone's first private-pool attempt is explicitly excluded from admitted/accepted G0 evidence. Every accepted G0 has zero tracked-source diff, full scope, slot null and exact source HEAD; raw Vitest assertions, the three TAP suites, 71 packet cases and Python unit results are independently recounted against the receipt. All expected skip keys are compared with the unchanged manifest. Build files and immutable objects are captured immediately after each gate, before the next build can replace them.

Accepted XTDB run: `G0-xtdb-20261109T042058Z-82f6e0`.

The first correctly linked Datomic run, `G0-datomic-20261109T042314Z-f3030c`, is separately retained as **FAIL** (1,252/1,253; 66 expected skips). Its sole failure is `round3: retired stores cannot omit policies/cuts or silently decline purge execution`, at packages/testkit/test/route-equivalence-round3.test.ts:225, exceeding Vitest's existing 5000ms timeout. There is no data-assertion mismatch in its failure diagnostic. That entire test file is byte-identical to the prior candidate, and the same test passed in the corrected XTDB G0. I requested one full Datomic rerun, explicitly linking the failed run and preserving the source, assertions, skip policy and timeout. Both receipts, all raw test output, object preimages and built-file preimages remain retained. Timing under other heavy jobs is an observed limitation, not a proved causal explanation or a relabeling of this failure.

Accepted Datomic rerun: `G0-datomic-20261109T042547Z-703fd6`. XTDB retains 41 object references and 566 built files; Datomic retains 48 references and 528 built files. All preimages match their exact manifest length/SHA, and the final auditor independently recounts the raw assertions rather than trusting receipt PASS text.

No builder PASS is counted as a fresh reviewer observation. Reviewer audit-development corrections are retained: labeled pending cells, the intentionally inherited claim.mjs difference between parents, and a new boundary test that incorrectly expected the unused XTDB_SOURCE_PLAN variable to be cleared by either parent. That boundary test initially passed 4/5, then passed 5/5 with both parents explicitly checked; reviewed assertions never changed. [audit-development.md](v0313r2/audit-development.md) records both. Required gate outcomes and failures, if any, remain in the durable command observations.

## PASS audit — preamble 9a

Every place in the review tooling that adopts an observation or emits a status/receipt/verdict is listed below.

| Boundary | Content | Freshness | Binding |
| --- | --- | --- | --- |
| prepare.py → source/merge record | Actual checkout, real merge exit, exact changed paths; commit preimage and tree retained | New clone and create-only durable attempt; start recorded | Full candidate, main, test and reviewer commits; no engine slot |
| audit_merge.py → merge findings | Complete tree/mode comparison, exact parent patches/sections, pending-row multiset, contract field differences and unchanged test/harness blobs | Re-reads immutable Git/source bytes in this attempt | Exact two builder parents, merge, final candidate and actual tested merge |
| run.py → raw command observations | Real argv, exits and full log hashes; collector alone grants no acceptance | New xb logs and actual start/end intervals | Asserts exact test HEAD; final audit checks current source again |
| capture_mutations.py / unchanged harness → observations | Actual substitutions, complete child stdout/stderr and exits | New child executions and create-only outer log | Exact source harness/generator and per-child changed anchors |
| audit_mutations.py → intended-rejection finding | Invalid header plus intended guard, no tracebacks, count/retirement/coverage identities | Consumes this attempt's children | Tested source and independently reviewed expected-guard file digest |
| Existing tests plus boundary_variations.mjs → assertions | Actual lane/refusal matrices, all parent cleanup keys, explicit override ordering, store rejection and QG1 config/seed binding | Fresh children and new seed/config bytes | Explicit candidate checkout config; exact gate/lane/args, no acquired engine slot |
| correct_topology.py / retain_failed_clone.py → environment correction | Exact same Git commit/source; all failed raw files/objects compared before clone removal; failure remains FAIL | Explicit later linked registration, separate new G0 IDs/logs; no old output reused | Real common Git directory, canonical store/lock derivation; no reviewed source change |
| capture_shared_grants.py → admission observations | Copies actual owner bytes and hashes from shared lab heavy slots; no semantic PASS | Observes while current attempts run, timestamp per new immutable owner object | Own labels/run IDs, exact source, canonical shared lock path; accepted runs checked against command intervals |
| run_g0.py → raw receipts and retention | Sole new receipt, actual raw output, CAS hash/length and each build-file preimage | Before/after receipt set; new output dirs, command intervals; capture before next build | Exact test HEAD, lane, predecessor, explicit candidate config, offline flags and direct parent heavy grant; slot null |
| audit_results.py → result audit / verdict | Exact TAP/unittest counts, six output hashes, Q47d, semantic mutants, independently recounted raw G0 tests/skips, steps/objects/build bytes and shared admission; first failure excluded | All command and receipt times inside this new attempt; unique receipt IDs and log hashes | Exact executed source, inputs, lane, null slot and immutable grant objects; separate merge/mutation audits |
| This report → review verdict | Manual delta review plus audited fresh evidence and explicit limits | Current attempt distinguished from historical builder/reviewer evidence | Named candidate, tested merge and current-main cutoff; no live qualification inferred |
| seal.py / refresh_local_manifest.py → manifests/index | Rehash every retained byte and check tracked-source cleanliness | Runs only after all writers finish | Exact owned durable root, immutable source identity, scoped scratch cleanup; hashes prove retention only |

## Retention and limits

Raw outputs, complete mutation diagnostics, immutable objects and build preimages are durable outside Git at:

`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0311/contract-0.3.13-round2-attempt1/`

The [index](v0313r2/INDEX.md), [result audit](v0313r2/result-audit.json), [raw checksum manifest](v0313r2/RAW-SHA256SUMS), source identity, merge/mutation/result summaries and local SHA256SUMS are committed under v0313r2. The sealed raw corpus contains 1,931 files / 24,540,074 bytes; its largest file is 1,358,118 bytes and stays external. Large evidence stays external. Disposable source/dependencies are removed only after all audits and byte capture finish; shared caches, residents and other attempts are untouched.

**Not done / not verified:** live QLever startup or bounded-slot lifecycle, live XTDB/Datomic G1/G2/GS, image build/readback, benchmarks, storage/erasure/tenancy qualification, root pnpm check, package publication, push or merge into actual main. No contract or pinned-source change was retained; negative controls made temporary, restored changes only in the disposable snapshot. No reviewer re-pin is required. Pending implementation work remains pending.

**Handoff:** safe to merge the reviewed candidate through the tested current-main cutoff. No blocking merge question remains. **P3 follow-up:** the inherited five-second test timeout at packages/testkit/test/route-equivalence-round3.test.ts:225 deserves test-stability investigation under admitted concurrency; reproduce with the retained first Datomic command and diagnostic. Its cause is not established here, and no timeout/assertion change is proposed in this contract delta. The unchanged rerun passes. Pending rulings and all live qualification work remain outside this acceptance.

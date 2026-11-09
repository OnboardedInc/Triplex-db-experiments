# K01 round 13 — offline adversarial review

**Verdict: ACCEPT-OFFLINE. No findings requiring an implementation fix.** Typed catalog absence is a valid refusal boundary for this N01 seed. Written data cannot use that boundary to disappear under the current production expectation. The retained smoke reproduces its claimed source D/layout and fresh Dprime comparisons, but qualifies no golden or clone.

Reviewer CX-VK01; reviewed builder `9b764517`, merged into verify/K01 at `044f4335b19b4e938ae8ce4e758134c9b27104b5`. North star: the exact seed-reuse correctness floor supporting P1–P5, under lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. Read REPORT-round13.md, retained live-round12 counts, the smoke's source preimages/ledger/rows and pinned XTDB source. Runtime code under lab/bench, lab/bin and packages is unchanged from the builder. No production fixes were made by this review.

## 1. Does the policy match what the seed actually writes?

Yes for the current seed. `expectedN01` (`g0-xtdb.ts:36-61`) derives a complete policy over all **11 tables and 89 declared columns**. It marks only tx_assertions, tx_claims, tx_attempts and tx_meta written; counts of all seven side tables are independently fixed to zero. Caller-provided policy/count overrides are ignored. The true/false column flags mean “has some non-NULL seed cell,” not “is mentioned in DDL or SQL.”

I added controls that run the **public Triples writer plus the real XTDB storage adapter**, through their built exports, with a recording client instead of an engine. They execute seedRung for **1, 8, 20 and 500 subjects**. The recorder decodes the adapter's actual parameterized INSERT statements, retains assertion identities and command metadata, and compares every written table and every declared non-NULL column against the independently computed policy. No policy is used to generate the observed write set. All four populations agree; any new unclassified inserted table/column fails the control. The fixed native `_valid_from` SQL literal is excluded from bound-parameter indexing, not counted as an extra parameter or a declared Triplex column.

The public seed supplies actor/command ID, assert-only seedOps and no constraints/native-query work. Its writer/adapter paths write only the four core tables. Initializer DDL declares three additional empty tables; the other four query/native tables are lazy declarations in separate query paths. The false core columns are justified: initial seed operations supply no validTo and perform no retractions; the boolean channel is required only if actual generator facts contain that value kind. Journal position, instant, change JSON, entity type and business actor ensure the other required channels have non-NULL cells even for one subject.

Through the **actual extracted production SQL reader**, new controls delete each written table, remove each of the **32 required non-NULL columns** for the 20-subject case, or introduce rows into each unused table. All refuse. Missing tx_meta scope/position columns can refuse earlier at the scope-catalog check. Existing builder controls also require a non-NULL observed cell for every required column, refuse non-NULL values in every NULL-only core column, require complete policies, and reject catalog changes (including mutation of a reused object). The 98 earlier per-column controls continue to pass.

The production call sites always reconstruct expectedN01 before pinning/admission. Legacy model readers may omit the optional policy, but that does not offer the production N01 path an alternative. I retained the earlier count-only synthetic fixture with an explicit policy deletion, matching its stated cardinality scope; the new real-adapter and production-reader controls cover the policy itself. Its original bytes are retained under merge-input.

## 2. Can an unused table with rows pass as absent?

No under the production typed catalog and current policy. The reader returns zero/empty only when its freshly read catalog does not contain that table (`g0-xtdb.ts:105-107,131-134`). A written table is refused before that shortcut (`g0.ts:122-133`). Existing unused tables are counted **without a scope filter** (`g0.ts:134`, `g0-xtdb.ts:109-110`), against expected zero. This catches a row in another scope too.

The new SQL-reader controls plant a foreign-scope row separately in all seven unused tables. They invoke actual admitG0 after a healthy pin, require refusal, and inspect the emitted COUNT: no scope argument and no scope predicate. All pass. Empty existing side tables are permitted, which is necessary for the three tables present after initialization. Planner failures propagate; the reader has no catch turning a planning failure into zero or NULL. The builder's production-reader control additionally proves no COUNT/scan is planned for the four catalog-absent lazy tables.

Catalog proof and NULL materialization grant no admission by themselves. They only allow the ordinary complete scan/count and pre-freeze digest comparison to proceed. Present dynamic columns remain in SELECT * and D; missing declared NULL-only cells materialize NULL, and a later non-NULL cell changes D or refuses its policy.

## 3. Is the catalog real, typed, and safe across table versions?

Pinned source is clean at **c6c19623d90c658c15400fb46dc056f3735ed57b**. Independently hashed numbered excerpts are in evidence/review-round13/source-audit.json.

- `information_schema.clj:569-591` gets table references from Snapshot.tableInfo and columns from Snapshot.allColumnTypes, adding the engine's meta tables. `:259-264` emits table_name/table_schema; `:348-365` emits table_name, column_name and **xt_type as the rendered native type string**. Thus the production `information_schema.tables/columns` projections and public-schema filter use actual source-defined fields, not invented types.
- `OpenTx.kt:338-340,468-470` implements CREATE TABLE by declaring NULL column vectors. A first insert can make a lazy table visible, but the blanket claim “XTDB tables exist only after insert” would be false: explicit DDL can establish an empty table. The implementation and report correctly use observed catalog evidence instead of that blanket claim.
- `Snapshot.kt:115-129,171-189` unions historical table column names with live/staged/superseded names, including zero-row declared columns. `:72-100` merges their type contributions into allColumnTypes.
- `TableSnapshot.kt:23-39` explicitly distinguishes one physical segment's type map (what xt.live_columns reports) from the merged information_schema answer. `TableCatalog.kt:128-129,400-425` retains the union of old/new column keys and merges missing contributions appropriately. A column absent from a newer segment/version is not thereby absent from the complete table inventory. Put rows missing that cell contribute NULL; empty/declaration-only segments need not fabricate a new nullable value contribution.

The implementation uses that merged information_schema inventory, not xt.live_columns. I added a source-modeled version case: an older row has a required column while a newer row has NULL, with a nullable merged catalog type. The actual SQL reader pins and admits the unchanged contents; editing the newer cell refuses D, while removing the column globally refuses the written-column proof. The complete retained native-wire smoke captures also replay successfully through current G0, exercising actual captured catalog spellings and sparse NULLs. This is offline replay/source reasoning, not a new physical history/compaction test.

TypedCatalog validates table/column row shape, duplicate names, missing types, orphan columns and tables with no column inventory. Two catalog SQL statements are not one atomic database snapshot. Initial canonical bytes and the final catalog comparison detect changes and contradictions, but do not claim general concurrent-DDL snapshot isolation. The intended endpoint is a quiescent seed/clone. No retries or sleeps turn a catalog/count refusal into a success.

## 4. What did the smoke prove, and can its receipts grant admission?

I independently verified **all 99 files / 206,902,402 bytes** in the builder's external RAW-SHA256SUMS, including preimages and both failures. Source hashes before/after the smoke match the actual preimages. I then reconstructed the typed cells from each JSONL row's OID/nativeType/hex payload and ran current readG0/readE1G0 over **all five complete captures**: source, both source restarts, fresh seed, and final fresh capture. No endpoint was opened. Every full D equals its captured manifest/observation; both Dprime values reproduce. See smoke-replay.json and replay-smoke-round13.mjs.

| Retained diagnostic observation | Independently reproduced result |
| --- | --- |
| source and both source starts | D `a6dd488f1db5efcd1b70cdffe290b27bdbdb1636f685912bd03d4092899dcff5` |
| both source layouts | L `9c5a1a7932de457a963fa20b5d18885362130fa7ca59bce1e9dc3155807a5c76`, T 15436755 |
| source/fresh normalized digest | Dprime `a154912c2dbb1de7a0dc0e780eacf08e994b27dda3dc287efefe325e07c1878d` |
| fresh full digest | D `9e8c627225b2f6483141dc124d1f1653af0fa076afd2e4798638b7636a2ce53e` (appropriately distinct) |

The separate live-round12 source-count capture contains raw int8 text bytes `3631333834` / countText `61384`; the count fix was observed live, unlike the deleted round-11 count. Its incomplete overall capture is not an admission receipt.

The smoke ledger says diagnosticOnly:true and grantsAdmission:false and preserves **two ordered failures**. Golden failed at manifest hash construction, after stopped copy/tree comparison but **before copying the golden into the slot or performing the two clone G0 checks**. The following starts therefore concern the source volume. Fresh-state recording failed too. One missing helper import caused both failures; no golden record or successful fresh-state record resulted. These failures were not retried live after the fix.

The unqualified diagnostic manifest is written before pinning with a distinct format and no G0 pin (`xtdb-seed.ts:119-123`). A completed source manifest still requires readE1G0; it supplies a source pin, not clone qualification. Neither the measuring driver nor engine admission consumes the diagnostic ledger/unqualified record as a verdict. Driver reuse still requires its own fresh checkXtdb before setting seededBy (`driver.ts:279-280`); golden publication still follows both actual clone checks (`engine.mjs:736-745`). Current source-generator changes also invalidate the old smoke manifest's provenance for current measurement. My replay writes diagnosticOnly:true/grantsAdmission:false and never calls admitG0 on an endpoint.

I checked the recorded cleanup statuses and retained cleanup receipts. I did not contact Docker to re-observe volume absence or lifecycle state.

## 5. Why did offline tests miss the imports, and what now catches them?

There were **two failing command branches, one missing import**, and **three unresolved references**: golden manifest recording, fresh-state recording, and later loadGolden manifest revalidation. The missing symbol was sha256File.

The pre-smoke suite was **437 tests**, not the final 441. It imported engine.mjs to test exported pure helpers (key, listing, resource policy), but never executed the private golden/fresh/loadGolden record branches. Importing a JavaScript module and Node syntax checking do not resolve names inside unexecuted function bodies. The G0 placement test inspected source text for checkXtdb calls. Bench tsc's original coverage did not enable JavaScript semantic checking for that engine file. None of these checks could expose this runtime-only reference.

The final builder suite now includes engine-binding.test.ts: it explicitly uses TypeScript allowJs/checkJs semantic diagnostics on engine.mjs, requires no unbound names, removes the actual import as a negative control, and observes **three** sha256File diagnostics. The two captured log hashes/messages are checked. It was added after the smoke; a final count of 441 does not establish that the earlier suite would have found the failure.

I additionally added **three behavioral branch regressions**. They extract and execute the current golden, fresh and loadGolden functions with local in-memory lifecycle/file/client substitutes. The positive hash binding is derived from the **actual engine import declaration**. Omit it and each branch reproduces ReferenceError; retain it and each reaches the hash/record path. Removing the real import now also breaks the positive control. No Docker command, slot or production record is created by these fixtures; mocked G0 calls in them test binding/branch reachability only, not qualification. The compiler test independently checks actual whole-file name binding.

## Tests, attempts and evidence

**511/511 pass:** 256 builder, 30 earlier reviewer, 98 column, 57 representation, 48 round-12 metadata/count controls, and 22 new reviewer controls. No failed/cancelled/skipped/TODO test in the final full suite. Bench TypeScript and Node syntax checks pass. The full suite used heavy.mjs with a disk check before admission and again inside the runner. No slot was taken.

Evidence is under `lab/verify/K01/evidence/review-round13/`: run.json and suite logs pin executed sources and actual statuses; source-audit.json pins upstream excerpts and old/new runtime hashes; smoke-replay.json binds raw provenance and replay results. Durable reviewer cases live under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VK01/round13/attempt-4/` and are indexed by SHA256SUMS-RAW. The builder's 202 MB smoke stays at its existing external path; it is not copied into git.

Earlier attempts remain: setup attempt 1 referenced a nonexistent LIVE-round13.md and ran no tests; development-2 had 12 reviewer-fixture failures (the adapter spy incorrectly indexed a literal native column, seven cross-VM array-prototype comparisons, and one overly narrow refusal-message assertion). Correcting those fixtures produced 511 passing tests at completed-attempt-3. I then strengthened the engine branch regression to derive its binding from the actual import declaration and ran the final unique attempt 4. No implementation failure was retried into a PASS. The earlier count-only fixture adaptation and original bytes are retained under merge-input.

## PASS / verdict / receipt audit

| Boundary | Content | Freshness | Binding |
| --- | --- | --- | --- |
| expectedN01 policy / typedCatalog, refusal-only | Complete declared policy, independent counts and validated catalog inventories; actual adapter write-set regression | Policy recomputed and catalog queried for each read | Exact N01 inputs and current endpoint; no observed count becomes expectation |
| readG0 / readE1G0 source pin | Written table/column proofs, unused global-zero counts, all rows/cells, scan counts, full D and E1 relations | Bounded reads; scope/catalog before/after; two equal full reads for E1 | Expected includes complete policy/scope/position/counts/world; pre-freeze source call |
| admitG0, sole measurement PASS | Exact expected/pin binding then full D equality | Fresh measured-endpoint read every time | Current source/build, same expected and endpoint; no diagnostic/Dprime substitution |
| driver seededBy / golden publication, inspected | Actual G0 before reuse; two clone G0/layout checks before publication | In-process measurement read; independent start reads | Manifest/key/runtime/holder; not successfully reached in retained smoke |
| reviewer test success | Actual writer/adapter parameter rows; emitted SQL/refusals; missing-import mutation; known healthy controls | New execution/unique attempts, exact TAP denominator and no skips | Source hashes, named populations/fixtures; simulated lifecycle identified explicitly |
| reviewer smoke replay receipt | All 99 raw SHA256s, complete reconstructed native cells, exact D/Dprime/layout comparisons | Newly replayed current functions, sources unchanged during replay | Immutable captured paths/preimages/manifests, current source hashes; explicitly diagnostic, grants nothing |
| runner / this offline verdict | Exact suite counts, exits/signals/errors, log and source hashes; no partial suite adopted | New attempt 4; earlier failures/preimages retained | Reviewed builder/merge tree and checksummed evidence; no live or clone admission claim |

## Contract hashes and remaining limits

lab/acceptance is unchanged. Its textual references to engine.mjs are historical/prose references, including a pinned brief, not a discovered direct engine source-hash entry. The six changed runtime paths below have independently checked hashes against the builder parent; any necessary contract re-pin is left to the contract builder. This reviewer changed no production pinned file beyond the requested merge.

| Path | Parent SHA256 | Round-13 SHA256 |
| --- | --- | --- |
| lab/bench/lib/g0-catalog.ts | absent | 6c023fd74f0cd10482e3133ad1fcd6e8c3e70224e96d0308e7cde035fb8efbf6 |
| lab/bench/lib/g0-xtdb.ts | ccd6add7e50b3ce8da3cbe0acc46a2f73b289b8db2ac6bdbfa3e418c36969ca4 | 49ef92f312c02a92161ee939f5911626ca167a691c131ae844c5f2f96ad597b6 |
| lab/bench/lib/g0.ts | 1f98f70db84383b8c3ea489fa9b11f8fab9bbfc0b60193569f778fc34850b1eb | 63b657ac2b6ad408507e0043b5e05da766ef9ae3324ebed5a0e10cab1f8636e0 |
| lab/bench/lib/n01-counts.ts | a2a9a613ad6a40108cc200ce7050ffd855f48947945559f0f440d4c6d2971601 | 47b86aaff9f2e1bfd1e71258c457d7cbccc710d44183a10799a387d7866ac5fe |
| lab/bench/xtdb-seed.ts | b3f48c0c9caba9bf0751c4663ad0086f09d6533e87f6523a4579d6dc5d0fa99a | 098b36fe1ccfe263dd02ed75c18a29f8f1ed249425712d3d87401c2f6148c21a |
| lab/bin/engine.mjs | 1447cbd2db4a51af353d96e234d17e39c4c0510f6ca7995f569e38780fd697cf | f0fe4d3751e107dc2306b7080f99ff502d91c5bbd25f69fecaae2ef094b30fcb |

Old N01 source pins/goldens require regeneration: policy now participates in expected/D and source-generator binding. No current admission should adopt the historical smoke's successful diagnostics.

I made **no Docker/engine/lifecycle call, volume or slot**, and did not run the smoke/runbook. Live two-start qualification **from a copied golden**, successful publication, post-fix live hash recording and qualified fresh-seed E1 remain unverified. Offline replay verifies retained bytes and current logic, not an independent live engine execution or general concurrent catalog mutation. The remaining operational question is whether the next authorized full clone run completes without another downstream failure.

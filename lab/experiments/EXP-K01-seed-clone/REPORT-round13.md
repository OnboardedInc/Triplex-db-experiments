# EXP-K01 round 13 — typed absence and diagnostic smoke

Builder CX-K01-R2, branch exp/K01-seed-clone, parent 3d3345923b5b0e2f984125599eebbef58b885452. Result: the missing-table G0 failure is fixed and exercised on XTDB. The requested 20-subject diagnostic continued through both freezes, two source restarts and a fresh-seed Dprime comparison, recording two failures in order. Both failures share one missing import, now fixed offline. **No golden was published; clone qualification remains unverified.** No full LIVE runbook was run, and no diagnostic outcome grants admission.

## Fixes

1. `expectedN01` describes every schema-derived table and column: which tables receive seed rows and which columns receive non-NULL values. All 11 declared tables and 89 columns are covered. Counts explicitly require zero for unused side tables. Production G0 reads and validates `information_schema.tables` and `information_schema.columns` before counting/scanning, then requires an unchanged catalog after the read. Absent written tables/columns refuse. Missing never-written columns materialize only NULL; a non-NULL value refuses. Dynamic returned columns remain in D.
2. The SQL reader never plans COUNT/SELECT for a catalog-certified absent table. It counts an existing unused table across **all scopes**, so unexpected foreign rows cannot hide behind the seed scope filter. ORDER BY uses catalog-present columns. Planner exceptions propagate; none become an empty scan or zero count. Required columns must also have an observed non-NULL cell, rather than merely appear in a declaration. The initial catalog digest is frozen immediately, preventing an in-place mutable Reader object from replacing the earlier observation.
3. `xtdb-seed --diagnostic` preserves unqualified input/result metadata before pinning. The completed manifest is still emitted only after successful G0 pinning. The smoke captures that completed manifest, independent COUNTs, catalogs and complete native-wire rows before teardown; diagnostic metadata cannot substitute for a qualified manifest.
4. The smoke found `sha256File` unbound in both golden and fresh-state recording. Importing the existing helper fixes **all three** call sites, including later manifest revalidation. A compiler name-resolution regression removes the import to reproduce three unresolved references, checks the exact two captured failure logs, and requires no unresolved names in the current engine. This fix was made after the smoke, without a live retry.

Fixtures bind the previous live12 planning-error bytes and the current smoke's catalog, counts and error bytes to SHA256 provenance. Tests cover every declared table's absence/extra-row policy, every required/NULL-only column, malformed/partial/contradictory catalogs, catalog mutation, and the production SQL reader refusing to issue queries for all four absent side tables. The shared readG0/admitG0/readE1G0 call signatures are unchanged; optional policy/catalog extensions and the global-count argument are documented in [G0-SHARED-INTERFACE.md](G0-SHARED-INTERFACE.md).

## Pinned engine source

Read source at references/xtdb, commit c6c19623d90c658c15400fb46dc056f3735ed57b; exact file hashes are in [catalog-source.json](evidence/round13/catalog-source.json).

* information_schema.clj:569–585 builds table references from `Snapshot.tableInfo`, and column types from `Snapshot.allColumnTypes`; dispatch at 590–591 serves these inventories. Tables/columns reflect the query snapshot, not the adapter's source declarations.
* Snapshot.kt:27–33 describes the pinned live/trie/table view. Lines 72–100 derive column types over tableInfo; absent historical/live contributions can be NULL. Lines 171–189 preserve declared columns even for zero-row CREATE TABLE, combine live/staged/superseded columns, and capture the table catalog after the data/type view.
* OpenTx.kt:338–340 explicitly handles CREATE TABLE via `table(ref).declareColumns`; 468–470 declares its columns as NULL vectors. Thus first insert is sufficient but **not the only** way a table/column becomes visible in this pinned implementation. The observed seven public tables include three empty declared tables. The four lazy native/query tables are absent. The implementation trusts typed current catalog evidence, rather than either blanket DDL assumption.

The two catalog SQL statements are separate bounded reads, not a transactionally atomic catalog snapshot. Contradictions or a changed final inventory refuse; this protocol operates on an otherwise quiescent seeded endpoint. No retry, sleep-until-count-matches or planner-error recovery was introduced.

## Diagnostic smoke — exact outcomes

Command:

```sh
node lab/bin/heavy.mjs --label CX-K01-R13-smoke -- node lab/verify/K01/smoke-round13.mjs
```

Run `k01-r13-20261109T061737`, 2026-11-09 06:17:37–06:20:39 UTC, xtdb-s1 holder CX-K01-R13-smoke. Free space before admission: 9,210,445,824 bytes; before source seed: 9,210,552,320; before fresh seed: 9,092,300,800, all above 5 GiB. Source preimages and before/after hashes match throughout the smoke. Final offline code differs as explicitly described above.

Both seeds: 20 subjects, 20 accounts, 33 commands/position, 8,539 business assertions plus 10,509 public journal rows = **19,048 stored assertions**. Source and fresh completed manifests were captured before deletion. All five catalog/COUNT captures agree:

| Table | Observation |
| --- | --- |
| tx_assertions | 19,048 rows |
| tx_attempts, tx_claims | 33 rows each |
| tx_meta | 1 row |
| tx_constraint_generations, tx_constraint_graphs, tx_query_relations | Present, 0 rows each |
| tx_native_relation_attempts, tx_native_relations, tx_query_generations, tx_query_members | Absent in typed catalog; no COUNT issued |

Source D before freeze: `a6dd488f1db5efcd1b70cdffe290b27bdbdb1636f685912bd03d4092899dcff5`. Both subsequent **source-volume** starts reproduce it. Both layout observations are `9c5a1a7932de457a963fa20b5d18885362130fa7ca59bce1e9dc3155807a5c76`, T=15436755. Source and fresh Dprime both equal `a154912c2dbb1de7a0dc0e780eacf08e994b27dda3dc287efefe325e07c1878d`. This is a diagnostic fresh/source comparison, not qualified E1 against a published golden.

Failures preserved verbatim in the external ledger/logs, in order:

1. **golden**, 06:18:25.980Z: `[lab] sha256File is not defined` / `ReferenceError: sha256File is not defined`, `at golden (.../lab/bin/engine.mjs:730:66)`. Freeze/stopped copy and tree comparison had completed; record construction failed before copying the golden back into the slot. Consequently the following starts exercised the source volume, **not a clone**. No golden record was published.
2. **fresh-freeze**, 06:20:34.254Z: the same error, `at fresh (.../lab/bin/engine.mjs:656:23)`. The fresh freeze/restart ran, but fresh-state recording failed. Final catalog/COUNT/row capture still completed.

The driver continued after each failure, retained both, then removed the source slot volume, fresh slot volume and `tx2-golden-xtdb-2f501169` through engine.mjs. All three removal commands exited zero. [cleanup-check.json](evidence/round13/cleanup-check.json) additionally records absent holder reservation, absent s1 owner directory and absent retained-golden entry. **No volume is kept.** A subsequent private-daemon `docker volume inspect` reports `no such volume` for both the slot data volume and attempted golden; see volume-absence.log. The missing-import fix and immutable-catalog guard have not been rerun live. Full two-start clone publication and qualified E1 still require a later authorized run.

## Evidence and offline checks

[SMOKE-INDEX.md](evidence/round13/SMOKE-INDEX.md) locates the durable raw directory, `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round13/20261109T061737` (202,168,126 bytes). Complete wire rows, both manifests, catalogs, COUNTs, failures, source preimages and cleanup logs stay there. [RAW-SHA256SUMS](evidence/round13/RAW-SHA256SUMS) binds these and the external offline reviewer output. Only the small index/manifest and derived regression fixtures are committed.

Final gate:

```sh
node lab/bin/heavy.mjs --label CX-K01-R13-final2 -- node lab/verify/K01/run-round13.mjs
```

**441/441 pass:** 256 builder, 30 reviewer, 98 column, 57 representation tests; benchmark tsc exits 0. [run.json](evidence/round13/run.json) binds 67 source files and output hashes, rechecked against current bytes. No skipped/cancelled/TODO tests. Pre-smoke gate passed 437 tests and tsc. The first post-smoke gate had one test-only error: the new missing-import regression expected two unresolved references, but removing the import exposes three. Its corrected expectation now tests all three sites; the failed attempt is retained under final-1. Development syntax failure/success logs were retained separately. No failed live attempt was retried or replaced. Formatting checks pass for seven changed TypeScript files; xtdb-seed.ts has an existing default-formatter issue also reproduced on the parent bytes. No unrelated formatting rewrite was made. All 99 external raw files pass manifest verification.

## PASS / verdict / receipt audit

| Transition | Content | Freshness | Binding |
| --- | --- | --- | --- |
| Typed catalog / expected seed policy (refusal-only) | Complete typed table/column inventories, all declared policies, global unused-table zero counts; no planning-error fallback | Bounded current reads, initial bytes frozen, final catalog must agree | Same measured endpoint, table/column names and independently generated seed plan |
| readContent / source pin | Complete native-type/OID/raw-byte rows, independent expected counts, per-column NULL policy, W0 oracle unchanged | Current scans; scopes/catalog before/after; deadlines and full scan/count equality | D includes expected scope, position, world, counts and table policies |
| readE1G0 Dprime | Two full D reads agree; generated IDs/clocks normalized with existing consistency checks | New complete bounded reads | Same source inputs, expected policies and normalization assignments |
| admitG0 — only admission PASS | Fresh D equals valid pre-freeze D; every mismatch throws | Read by measuring process before warm-up | Exact expected pin binding and endpoint receipt; Dprime never substitutes |
| Golden publication / fresh-state recording | Existing two-clone D/L qualification remains mandatory; manifest hash now resolves to the imported helper | Current qualification reads and current manifest bytes | Existing owner/slot/publication lock and exact manifest/source/golden binding; not reached successfully in this smoke |
| Diagnostic smoke / offline test receipts | Actual statuses, ordered raw failures, complete captured rows/counts/catalogs and SHA256 checks; no diagnostic grants admission | Unique attempt paths, source hashes stable during smoke; final gate on current code | Own holder/slot, source preimages, commands, captured logs, derived fixtures with original-byte provenance |

No diagnostic is read as an admission decision. NULL/absent returns are justified at their catalog-proof boundary. Legacy Reader callers without the new optional N01 policy retain their previous complete-row/count obligations; production N01 always supplies it.

## Contract and limitations

lab/acceptance is unchanged. No pinned-path hash entry for these changed files was found in the current main acceptance tree (generic prose mentions engine.mjs). [changed-paths.json](evidence/round13/changed-paths.json) records parent/new SHA256 for all changed implementation, tests and handoff paths so the contract builder can re-pin as applicable. New policies/source inputs change D and seed-generator binding: regenerate prior N01 pins/goldens.

No full 500-subject LIVE runbook, successful clone qualification, successful publication or post-fix live retry is claimed. No native-wire value-kind suite was rerun in this diagnostic. The open operational question is whether the next authorized clone run uncovers another downstream failure; this round preserves the actual failures and supplies offline regressions instead of claiming that answer.

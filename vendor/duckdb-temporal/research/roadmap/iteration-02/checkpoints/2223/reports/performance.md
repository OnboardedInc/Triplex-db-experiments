# Item2 performance evidence — bounded, matched, no acceptance claim

30 October2026. Read-only production scope; all benchmark sources, copies, databases and logs are isolated under this performance directory. No source/Git/PR write, original-artifact overwrite, FP/cap/ROOT bypass, or performance fix was made. The approved quiet CPU window is now released; no owned build/DB/timing/profile process remains.

## Exact artifacts and method

- Accepted item1: SHA256 `5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d`,192606bytes, feature0.2.0.
- Current item2: SHA256 `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4`,202678bytes, feature0.3.0.
- Both retain their exact original `C_STRUCT_UNSTABLE/v2.0.0/linux_amd64` footer and genuine DuckDB2.0.0/d54cbbe3df runtime. Feature version is not C API version. Own copies and originals hash identically before/after all runs. Coordinator-verified source checkpoint:8b14300cf42ff9524957f7f5fb41ce7db89f4c1a; local older checkout HEAD is explicitly not mislabeled as that remote commit.
- CPU8 from allowed0–8, threads1, same runtime/environment/default supported FP, Python GC enabled. Only process affinity is changed; no exclusive-core/governor/host-security claim.

Primary corrected method freeze: `corrected-method-v2/PREDECLARED-MANIFEST.json`, SHA256 `0df2cf57ba94bc339a8ddd7ae3668b2c30bbe5acb1ba7947cc81ee9d38382075`. Static review reconciled all30 inputs, guards, saved preflights and clustered statistics.

Twelve predeclared filter-free workloads cover tiny/selective ingestion, wide output, long UTF8, all four tags/i64 extrema/subnormal and extreme finite f64, selective relational joins, chain/branch/cycle, duplicate witnesses, and two unchanged legacy API controls. Parser-independent host set-fixpoint expected rows/f64 bits match both artifacts; full native rounds/derived_facts/work match exactly before timing and on every call. All constants are finite/admitted and all work is bounded.

Prepared SQL invokes the scalar from real input-table **program/facts/cut/limit columns**, not an all-constant function expression. EXPLAIN retains a column scan. Untimed program AND fact-column mutation controls change the same prepared statement's result and restore the original rows/counters. No persistent program cache or result shortcut was introduced.

The42 paired blocks consist of2 rounds×21 pairs,84 fresh sequential old/new processes,21 old-first/21 new-first, randomized workload/load orders,2 warmup and3 measured sweeps per process. All5040 outcomes (3024measured/2016warmup) and every duration are retained, with no timeout/error/outlier dropping. Actual child optimization0/debugtrue/PYTHONOPTIMIZE0 is recorded throughout.

The primary unit is a **fresh-process pair**: median3 technical repetitions per process →42 matched ratios → seeded20000-resample42-unit bootstrap. Both round and load-order strata are in the JSON.3024 invocations are not treated as3024 independent process/build samples. This is one immutable build pair/one virtual host, not a population guarantee; repeated-process uncertainty matters. [Kalibera/Jones2013](https://kar.kent.ac.uk/33611/45/p63-kaliber.pdf).

## Primary result: native SQL full-fetch + strict decode

**No predeclared primary regression-investigation signal was triggered. This does not prove non-regression:** all12 primary95percent intervals include1; some upper bounds allow roughly10–11percent slowdown. Median paired candidate/accepted ratios range0.9686–1.0491. The study cannot rule out modest effects or justify a universal/native-only speed claim.

| Workload | Old ms | New ms | Median paired new/old | Bootstrap95 interval | Round1/2 ratios |
|---|---:|---:|---:|---|---|
| typed_ingestion_tiny |2.4699|2.5287|1.0029|[0.9764,1.0446]|1.0089/0.9966|
| typed_ingestion_selective_8000 |6.7750|6.8009|0.9774|[0.9477,1.0302]|0.9764/0.9811|
| typed_output_wide_2000 |38.2503|36.1530|1.0227|[0.9443,1.0537]|1.0076/1.0251|
| typed_long_strings_256 |6.8101|6.5553|0.9686|[0.9167,1.0476]|0.9483/0.9740|
| typed_heterogeneous_numeric_2048 |12.6193|12.7454|0.9888|[0.9244,1.0443]|0.9895/0.9882|
| typed_selective_join_2000 |3.2181|3.2585|0.9967|[0.9461,1.0519]|1.0360/0.9735|
| typed_chain_64 |12.6738|13.2825|1.0491|[0.9716,1.1034]|1.0535/0.9869|
| typed_branch_tree_126 |5.5314|5.6682|1.0288|[0.9965,1.1111]|1.0314/1.0009|
| typed_cycle_48 |13.6832|13.9097|0.9965|[0.9615,1.0979]|1.0003/0.9655|
| typed_duplicate_join_8000 |3.9376|4.2165|0.9929|[0.9550,1.0920]|0.9875/1.0077|
| legacy_string_output_4000 |8.8735|8.7144|0.9848|[0.9379,1.0583]|0.9768/0.9863|
| legacy_chain_64 |5.1390|4.9428|0.9923|[0.9575,1.0724]|1.0582/0.9868|

Old/new columns are marginal medians. The median **paired ratio is not their quotient**, particularly under variable process conditions; no favorable aggregation is substituted. Intervals are descriptive per workload, not family-wise or proof of equivalence.

This endpoint includes SQL EXECUTE/table lookup, native parser/ingestion/fixpoint/output encoding, complete nested fetch, and strict decoding. It is **not pure evaluator time, Python source-to-carrier setup, or persisted-store latency**. Each layer and setup phase is separately retained. For example, output-wide old/new marginal medians are4.386/4.261ms execute+invocation,13.814/14.145ms fetch,18.255/17.919ms strict decode. Do not sum marginal medians as if they were one paired observation or attribute client-heavy totals solely to C++.

SourceJSON read, carrier conversion, runtime import, connection, LOAD, table materialization and SQL preparation are outside these invocation timings. They are available per process/workload in `analysis/summary.json` and raw process records. Fresh primary DuckDB2 documentation was checked: prepared execution is supported;2.0 profiling uses `tracked_metrics`/dotted names rather than assuming older schemas. No profiler ran during the primary timings. [Prepared execution](https://duckdb.org/docs/2.0/sql/statements/prepare), [DuckDB2 profiling](https://duckdb.org/docs/2.0/dev/profiling), [metrics](https://duckdb.org/docs/2.0/dev/metrics).

## Separate persisted public query/query_json characterization

Freeze: `persisted-control/PREDECLARED-MANIFEST.json`, SHA256 `e8d88d87832abefbeb9074f9c6a2abff8a07c646264aaa506fc15a3c35400ed3`. This is **not complete storage performance** and does not replace the native study.

Exact accepted archive58931fcd/e42 source+old artifact and current released source+new artifact run in separate confined roots. Fixed sibling artifact paths resolve normally; no monkeypatch. Original512 retained-fact/32-operation caps and all public checks/normalization/FP guards remain active. One320-fact/10-commit closed physical database template is copied byte-exact into every process, matching actual generated fact IDs/timestamps/history as well as public results.256 float-heavy +64 mixed-tag facts; valid cut10/default known cut10. Both preflights match independent full rows/f64 bits/native counters and public metadata.

Twelve pairs/24 fresh processes,6 each load order,2warmup+3measured sweeps of4 controls: **480/480 outcomes PASS**,288measured/192warmup. Public method return timing includes its transaction/budget/admission/normalization/serialization checks; expected-result hashing is outside timing. The additional current FP checks are deliberately not removed.

| Public control | Old ms | New ms | Median paired new/old | Bootstrap95 interval |
|---|---:|---:|---:|---|
| float256 query |3.4737|4.2211|1.2729|[1.1439,1.3261]|
| float256 query_json |3.4810|4.4103|1.2632|[1.1782,1.3424]|
| mixed64 query |2.4648|2.4499|1.0384|[0.8811,1.0842]|
| mixed64 query_json |2.4664|2.6339|1.0847|[0.9597,1.1066]|

**There is a material measured float-heavy public-path cost in this bounded control (~26–27percent median paired); mixed controls are inconclusive.** It is not a native evaluator regression claim. This small single-round characterization does not isolate every possible storage/history/FP configuration.

### Focused follow-up, no source fix

After the signal, fresh primary profiling/fenv references and exact source call graphs were inspected. Five actual public calls per control were profiled separately, with unchanged guards/results/caps; all20 profiled+8warm calls per variant match exactly. Current source performs:

| Output/control | FP reads per query | FP reads per query_json |
|---|---:|---:|
|256f64 values|514 (258supported+256masked)|515 (259supported+256masked)|
|mixed64,16f64 values|34 (18supported+16masked)|35 (19supported+16masked)|

Accepted source has0 calls to this new Python FP-reader path. The current reader uses public `fegetenv` through the validated glibc binding, caching only ABI binding—not the changing environment. This call-count/source evidence supports an **inference** that added guard/admission/normalization contributes to the public-path cost. It does not prove every measured difference is caused exclusively by that guard; both source/artifact versions differ.

Python explicitly cautions that deterministic profiles distort Python/C comparative timing, so profile seconds are **not** benchmark ratios or an exact cost decomposition. GNU documents saving the FP environment, not a license to cache changing controls. No guard is skipped, caller state changed, or optimization/fix proposed here. [Python profiler limitations](https://docs.python.org/3.12/library/profile.html), [glibc2.41 fenv](https://sourceware.org/glibc/manual/2.41/html_node/Control-Functions.html). Parent-owned research may investigate future semantically safe designs separately.

## Preserved diagnostics, provenance and handoff

The original830fb741 frozen method/campaign remains unchanged as **INITIAL DIAGNOSTIC ONLY**:84processes/5040 rawPASS outcomes. Static review discovered assertions could fail open under optimized Python and the original children did not record optimization state. It was allowed to finish without interruption or source/gate edits; its later same-executor flags0 observation is not falsely presented as direct child introspection. It is not the selected headline dataset.

Corrected v2 rejects optimized Python in worker/controller/analyzer, explicitly rejects failed observations/counts, pins the analyzer to its own matching method manifest and all84 child flag records, and records actual0/true/0 state.17 adversarial optimization/FAIL/old-or-missing-provenance controls PASS without DuckDB import; fresh full preflight precedes the entire new42-pair primary campaign. No convenient subset is substituted. [Python assert semantics](https://docs.python.org/3.12/reference/simple_stmts.html#the-assert-statement), [optimization](https://docs.python.org/3.12/using/cmdline.html#cmdoption-O).

Raw initial footer-assumption correction and two optional CLI `--block1` typo rejections are also retained; fixed attempts are distinct, not rewritten. Neither was an artifact/source defect. All original/copy artifacts, three method freezes, sources, controls and template hash remain unchanged (`FINAL-INTEGRITY.json`). Full native6-file/binding production sources were not modified or rebuilt by this lane.

Not run: broad performance corpus beyond these12, multi-host/build/compiler inference, new-expression old-feature comparison, full storage performance, hostile mid-call FP changes, or a semantically altered fast path. No production acceptance/merge/deployment claim follows.

Live compact UTC progress remains outside immutable method inputs. The safe handoff captures a final distinct progress snapshot; publication excludes binaries, databases/runtime files, caches and full third-party PDFs/source pages, retaining their URL/hash references instead.

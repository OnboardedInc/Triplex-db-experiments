# Compact Python host projection: safe semantics, negative performance result

Research completed 2026-10-30 around 19:36 UTC. **Recommendation: retain the raw host path; do not implement this UNION projection as an optimization.** It is ownership-safe and preserves the tested application semantics, but loses on every tested workload, including the target 2,080-row recursive answer. No implementation, raw signature, artifact, public JSON contract, Site or Git state was changed.

## Answer and evidence

Yes: a single SQL statement can materialize the genuine `td_query_v2` result once and apply nested `list_transform` to each TDValue, returning `STRUCT(tag,payload UNION(s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE))` before Python fetch. Keep the outer application tag. Construct each alternative with explicit `union_value(s:=...)`, `union_value(b:=...)`, etc., and cast each branch to the identical full UNION type before the CASE combines them. Never first combine the numeric payloads into a common scalar type. [UNION types/casts](https://duckdb.org/docs/2.0/sql/data_types/union), [UNION constructors](https://duckdb.org/docs/2.0/sql/functions/union).

The proposed representation is **not physically compact SQL storage**: UNION is STRUCT-backed with its own discriminator. In this experiment the outer tag plus inner discriminator adds representation, while Python sees fewer named fields. The original five-field TDValue has four payload slots and **three inactive NULL payloads**, not four. SQL STRUCT fields remain fixed by schema; this is an explicit alternate fetch carrier, not a different logical value domain. [STRUCT types](https://duckdb.org/docs/2.0/sql/data_types/struct).

The exact generated SQL for all four arms is saved in `query-*.sql`; `compact_sql.py` generates the disposable queries. The checked arm rejects unknown tags, null parents/selected payloads, nonnull inactive payloads, nonfinite floats, NUL strings and malformed envelopes/rows with project-specific errors. It preserves every counter without casts. The trusted arm omits those shape guards but still selects explicitly typed UNION alternatives and rejects unknown tags. Both leave the raw function untouched.

A `WITH q(result) AS MATERIALIZED (...)` binds the result once. The outer expression maps both list levels without sorting, filtering input history, changing cuts or calling SQL inside the extension. The lambda's declared result type determines the output list type. [List transform](https://duckdb.org/docs/2.0/sql/functions/list#list_transformlist-lambdax).

## Semantics and transaction controls

Actual checks on the genuine pinned artifact:

- **29 existing fixture cases**: raw and checked compact outputs originate from one native invocation in one SQL statement. Both match the explicit expected answers and independently written SQL, with identical ordered cells and native counters.
- **28 extended input values / 27 canonical rows**: all four families, both int64 extrema and unsafe-JS neighbors, finite/subnormal float extremes, integral f64, normalized signed zero, empty/12/13/16,384-byte strings, astral/BMP and composed/decomposed Unicode. Tags, exact signed integers, float bits, UTF-8 text and tagged public JSON agree. SQL `union_tag` agrees with the external tag.
- **Seven malformed synthetic carriers** reject with the intended projection marker, not incidental binder errors: null parent, unknown tag, selected NULL, inactive nonnull, NaN, infinity and NUL string.
- UNION can contain an active NULL member: `union_value(i:=NULL::BIGINT)` retains SQL member `i` but Python sees `None`. The checked adapter rejects it rather than inventing a logical-null value.
- A deliberately incorrect numeric CASE converts int64 maximum into DOUBLE integer **9223372036854775808**. This retained negative control demonstrates why explicit alternatives are necessary.
- A disposable real-file two-connection test establishes the ownership path: reader begins a transaction and obtains raw `old`; writer commits `new`; checked compact on the **same reader connection/transaction** still returns only `old` with identical counters. After reader COMMIT, the next query sees both rows. This is an observed repeatable snapshot, not a claim that two connections inherit one transaction. The database/WAL was removed after closing both connections. [Transaction isolation](https://duckdb.org/docs/2.0/sql/statements/transactions#isolation-level).

Python UNION conversion unwraps its active payload, so the outer TD tag is indispensable. The probe's strict decoder checks exact bool/int/float types, full int64 bounds, finite float bits and canonical zero; i64 becomes a decimal JSON string, and integral f64 retains its explicit float tag. UTF-8 strings remain exact scalar text, not arbitrary BLOBs. No stringify or numeric coercion fallback is used. [Pinned Python conversion source](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/native/python_objects.cpp#L482-L506).

## Diagnostic experiment and results

Immutable artifact:
`5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d`.
Installed DuckDB 2.0.0/d54cbbe3df library:
`e7cda112749d860a36cb1524ff465cefecdb0acc5c4e2ff4510ecc1b6f6c061a`.
One engine thread, 96MB managed-memory setting, binary collation, disabled autoextensions, same raw caps (100000 facts/1000 rounds/5000000 work), live 1MB temp quota. No dependency installation or artifact rebuild.

Three **sequential independent processes**, four datasets, four counterbalanced arms, three unmeasured warmups and 21 warm repetitions per arm/phase. There are **2,016 validated warm samples**: 1,008 complete native full-path calls plus 1,008 saved-result controls. Another 96 per-arm-first observations are retained separately, not called OS-cold. Every measured call validates the entire answer, exact counters and public-JSON checksum; no count-only shortcut.

- Raw original: unchanged full SQL list/STRUCT aggregation, native call, complete Python fetch.
- Raw CTE: same materialized-result wrapper without transformation.
- Compact trusted: wrapper plus explicit UNION projection, assuming canonical genuine native output.
- Compact checked: wrapper plus strict SQL shape guards and UNION projection.
- Saved-result controls: a temporary table already holds the native result. These measure SQL projection plus complete fetch without invoking the callback. They are not subtracted from unrelated full-path runs.

Primary timers include SQL prepare/bind, all-history list construction, native evaluation/output, any projection and complete fetch. Strict client decoding, UTF-8 JSON encoding and destruction are outside that primary timer; decode-plus-JSON totals are also recorded. Python GC policy is unchanged, PYTHONHASHSEED=0. Validation/hash costs are not hidden in one candidate's timed path.

| Dataset (output rows) | Raw p50 / p95 ms | Raw CTE p50 / p95 | Compact trusted p50 / p95 | Compact checked p50 / p95 | Checked/raw, 3 replications |
| --- | ---: | ---: | ---: | ---: | --- |
| strings_512_byte_carrier (64) | 2.712 / 3.968 | 2.803 / 4.053 | 4.195 / 5.645 | 5.499 / 7.744 | 2.047× / 2.082× / 2.055× |
| strings_recursive_chain (2080) | 8.273 / 13.293 | 8.559 / 15.535 | 13.267 / 20.122 | 15.603 / 22.247 | 1.845× / 1.712× / 1.872× |
| typed_i64_unique (512) | 2.167 / 3.353 | 2.371 / 3.530 | 3.980 / 6.469 | 5.240 / 7.686 | 2.491× / 2.501× / 2.311× |
| typed_mixed_repeated (8) | 1.351 / 1.806 | 1.511 / 2.019 | 2.681 / 3.687 | 4.013 / 5.814 | 3.000× / 2.982× / 3.265× |

The target recursive closure has 64 input edges, 2,080 output rows / 4,160 cells and identical counters **rounds66 / derived4160 / work6240**. Raw full-fetch replication medians are **7.997 / 12.347 / 7.725ms**; trusted compact **13.046 / 19.022 / 12.886ms**; checked compact **14.754 / 21.138 / 14.459ms**. Checked loses **1.71–1.87×** within each replication. Including this probe's strict decoder and final UTF-8 JSON bytes still loses: raw **15.893 / 23.694 / 15.062ms**, checked **21.477 / 29.423 / 21.332ms**. Those codec timings describe this probe, not an existing production JSON adapter.

There is substantial shared-host/process drift, especially replication1. Other worker D confirmed its timing had finished before these runs, but this was not an isolated CPU or controlled-host experiment. All observed ratios are diagnostic on this artifact/workload/host, not a universal DuckDB or ABI claim. No native A/B ABI attribution is attempted.

## Transformation, fetch and allocation observations

Direct saved-result profiles, taken separately from primary sampling, observe SQL PROJECTION **0.622ms trusted / 1.113ms checked** on the recursive result. These are individual operator observations, not distributions or additive phase accounting. The profiler's intermediate-size metric is **177,832 raw / 181,992 compact bytes**; it is not a whole-process allocation census. Raw saved-result full-fetch warm medians range **5.495–8.053ms**, trusted compact **13.261–14.299ms**, checked **13.960–17.940ms**. Thus removing the callback does not make this candidate win; do not blame or change the native kernel from these results. Full profiler JSON and exact SQL/EXPLAIN are retained.

An untimed Python retained-object census is also negative: **1,341,783 raw / 1,541,279 compact bytes** for the result envelope. Every cell dict is 184 bytes in both shapes on this Python build. Raw one-character inactive-field keys are shared; compact `payload` keys are separate objects per cell. This measures retained Python objects with identity deduplication, not peak RSS, allocator overhead or a portable memory guarantee. It explains why “two fields” did not automatically mean less retained host memory; it does not isolate every conversion cost.

Raw `fetchnumpy()` was probed once: top-level dtype is **object**, with a dict envelope, list rows and five-field dict cells. It does not bypass recursive boxing for this nested signature. Arrow is not installed, and was not installed for this research. The separate primary-source [alternatives memo](alternatives.md) covers same-connection Arrow, copies/reader lifetimes and a genuine C API2 client owner. Its ownership-safe candidate discussion is not a recommendation to adopt the now-measured losing UNION projection. Columnar consumers must charge final tagged-JSON construction; a direct client must own its real connection/transaction rather than cast opaque Python handles or invent context-to-connection access.

## Reproduction and preservation

Run from this directory with the existing pinned runtime:

```sh
export PYTHONDONTWRITEBYTECODE=1 PYTHONHASHSEED=0
export PYTHONPATH=/tmp/temporal-datalog-20261030/engine/python2
python3 -B probe.py --semantics
for i in 0 1 2; do python3 -B probe.py --worker "$i" --repetitions 21; done
python3 -B probe.py --profile
python3 -B probe.py --summarize
python3 -B additional_diagnostics.py
```

Inspect existing reports before rerunning; worker reports use fixed names. The semantics script refuses an already-existing disposable snapshot database rather than overwriting it. Helpers come from the separately preserved `test-prep/sql-typed-contract`; exact hashes are in `source-input-audit.json`. This is same-host reproduction, not a fresh-machine runtime package.

Key evidence: `semantics.json`, `snapshot.json`, all `replication-*.json`, `summary.json`, `saved-profile-*.json`, `profile-summary.json`, `host-object-diagnostics.json`, exact SQL/EXPLAIN/logs, `sources/provenance.json`, and `alternative-sources/provenance.json`. Pinned API2 query-result/vector source blobs were independently fetched and Git-SHA checked; licenses are retained. Alternative ownership source citations are separate from measured runtime facts.

All three browser source/test/fixture files remain frozen at their accepted hashes, all ten old site files are unchanged, and immutable artifact5b661f38 retains its full SHA. Only this research directory was written. No implementation optimization, function/JSON contract change, Git/ref/PR/Page/Site action, Codex task or user-computer action was performed. Production readiness, item1 and the remaining roadmap are not established by this focused diagnostic.


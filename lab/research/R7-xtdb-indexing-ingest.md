# R7: How far XTDB 2.2.0 carries non-`_id` predicates, and how to design and feed `_id`-first index tables

**Scope.** Six questions (page pruning, IID, index-table shapes, ingest, history reads, compaction/GC) plus five adversarial checks from the orchestrator (skewed postings, high-degree reverse refs, range/ordered access, history of rewritten index docs, raw-user cost).

**Engine.** `ghcr.io/xtdb/xtdb:2.2.0`. Source: `references/xtdb` at tag v2.2.0, sha `c6c19623d90c658c15400fb46dc056f3735ed57b`, cited `path:line @ c6c1962`.

**Probe environment.** One container `tx2-probe-r7`, 3 CPU, 5 GiB, `JDK_JAVA_OPTIONS="-Xmx2500m -XX:MaxDirectMemorySize=1500m"`, Local log and storage on a named volume, Colima VM (6 CPU / 11.65 GiB). Container and volume are removed. Scripts and raw outputs: `/Users/sam/Claude/Projects/triplex-db-2/R7-xtdb-index-probes/` (`NOTES.md` is a running index; each `*.out` is raw output).

**Confidence labels.** High = source read and reproduced by probe. Medium = one of the two, or one data shape. Low = extrapolation.

**Status of the `_id`-first design in this report.** It is a hypothesis. Where it holds and where it fails is stated per section, and the failures are collected in "Where `_id`-first fails" below.

---

## Summary

| # | Question | Verdict | Confidence |
| --- | --- | --- | --- |
| 1 | Page pruning on non-`_id` columns | Pruning exists but works only (a) for string equality, via bloom, in compacted files (3M rows: 25 ms vs 0.9-1.0 s unpruned), and (b) for numeric/time equality and ranges when the column correlates with the IID, which only happens with an order-preserving UUID `_id` (9-14 ms). Insertion order of values does not cluster pages, because pages are IID-hash buckets. R1's "no bloom benefit after compaction" does not reproduce on a catalog that reads the compacted files. | High |
| 2 | `_id` and IID | UUID `_id` = its 16 raw bytes; string/keyword/int = first 16 bytes of SHA-256 of a typed string. UUID prefixes cluster rows: 1000 prefix-sharing keys in `_id IN` take 5.5 ms vs 330 ms for hashed keys. No `_id` range pushdown exists. | High |
| 3 | Index-table shapes | Unique value as `_id`: 6-10 ms lookup, 11 ms checked insert. Array doc: 2-5 ms lookup, 15-25 ms update up to 3000 ids, 540 ms at 1M ids. Per-edge rows with value-clustered UUID `_id`: 22-42 ms lookup, 4.5 ms insert, no read-modify-write. Per-edge rows with uniform `_id`: 44-665 ms lookup (control). | High |
| 4 | Ingest | Param `INSERT` via `postgres` tops out at 5-9k rows/s (20-23k with 2-4 connections). `COPY arrow-stream` over a raw wire client: 73-171k rows/s on one connection, 247k on two. `COPY transit-json`: 51-146k rows/s. COPY works inside `BEGIN READ WRITE` with `ASSERT` and `METADATA`. | High |
| 5 | History-mode reads | By `_id`, every history form costs 2-13 ms with 10 versions. Table-wide forms scale with all retained versions (500k ids x 10 versions: `COUNT(*)` current 4.8 s). | High (by-id), Medium (table-wide) |
| 6 | Compaction/GC | One compactor thread by default on 3 CPUs. L1C files are rewritten cumulatively (about 6x disk before GC). GC (aggressive settings) cut 37.7 GB to 13.1 GB within 10 s of a block boundary, but L0 files are never collected, so steady state is about 2.4x live data. The Local log is never truncated. | Medium-High |

### Where `_id`-first fails (read this first)

1. **Popular values need paging.** A single array doc works to roughly 10^4 ids. At 1M ids every append or remove writes a new 14 MB version (542 ms per update, 14 MB of disk per posting change). There is no server-side append: `||`, `array_append`, `array_cat` do not exist, `PATCH` replaces arrays and structs wholesale, `UPDATE ... SET x = (subquery)` is rejected. The only server-side form is `INSERT INTO t SELECT id, ARRAY_AGG(...) FROM (UNNEST ... UNION ALL ...)`.
2. **Resolving many ids is not cheap.** Any lookup that returns about 3000 entity ids costs about 0.5 s in the follow-up `_id IN (...)` entity fetch, whatever the index shape, because hashed entity ids scatter across 2500+ pages (2.8M rows read). The `_id` fast path is a few-ms path only for tens of ids, or for ids that share a UUID prefix.
3. **Ordered and range access does not come from `_id`.** `_id` ranges are not pruned. Ranges need bucket docs or an order-preserving UUID, and `ORDER BY ... LIMIT` with no bounding window scans the whole table even then.
4. **Removing a posting from a paged list needs a reverse pointer.** Without the page number stored on the entity, finding the page is an array scan (1.2-2.3 s at 1M postings).
5. **Raw SQL/XTQL users pay table scans** for anything not on an index table: 0.4-1.1 s at 3M rows, 9-35 s extrapolated to 100M facts.
6. **Uniqueness checks on non-`_id` columns are scans inside the single writer**: 1.1-2.7 s at 3M rows (R1: 1.79 s).
7. **CAST pitfall.** `_id = CAST('...' AS UUID)` is not recognised as an IID value and scans the table (DML `DELETE` with it took 2.7-4.9 s). Use a typed uuid parameter (OID 2950).
8. **Upstream correctness bug:** a join's IID/bloom pushdown can reach a scan beneath `LIMIT` or an aggregate and return rows the subquery never produced (#6151, open). Index-table joins must not put `LIMIT` or aggregates between the join and the entity scan.

---

## Q1. Page pruning

**Verdict.** XTDB prunes at page (trie-leaf) granularity using per-page metadata. A page is at most 1024 rows and is a bucket of the IID hash space, so rows with similar values do not share pages unless the `_id` encodes the value. Equality on strings prunes through bloom filters, but only in compacted files. Numeric/time predicates prune through min/max, but only if the value correlates with the IID. String ranges never prune.

### Evidence: source

- **Page definition.** Live-index leaf limit `PAGE_LIMIT = 1024` (`core/src/main/kotlin/xtdb/trie/MemoryHashTrie.kt:10 @ c6c1962`). Compaction re-pages to the same limit (`core/src/main/clojure/xtdb/compactor.clj:9 @ c6c1962`, `*page-size* 1024`). The trie fans out 4-way, two IID bits per level (`core/src/main/kotlin/xtdb/trie/Bucketer.kt:7-10 @ c6c1962`). `indexer.pageLimit` is configurable (`core/src/main/kotlin/xtdb/api/IndexerConfig.kt @ c6c1962`), but the compactor's page size is a dynamic var, not config.
- **Metadata kinds.** Integers, floats, dates, times, timestamps, durations: min/max stored as doubles (`core/src/main/kotlin/xtdb/metadata/ColumnMetadata.kt:31-54 @ c6c1962`; type map `core/src/main/kotlin/xtdb/arrow/metadata/MetadataFlavour.kt:64-82 @ c6c1962`). Utf8, Binary, FixedSizeBinary (UUID): bloom only, no min/max (`ColumnMetadata.kt:56-69`). Bool, interval, null: presence flag only. DECIMAL and unions: unsupported (`MetadataFlavour.kt:77, 93`).
- **Bloom geometry.** 2^22 bits, k = 5, Roaring-compressed (`core/src/main/kotlin/xtdb/bloom/BloomUtils.kt:15-16 @ c6c1962`). Each indexed value adds up to 5 bits, so metadata costs roughly 10 B per row per string column.
- **Which predicates prune.** `==` becomes min <= v AND max >= v AND bloom AND presence; `<`, `<=`, `>`, `>=` become min/max only (`core/src/main/clojure/xtdb/expression/metadata.clj:96-120 @ c6c1962`). A page without bloom data is treated as a match (`metadata.clj:155-170`).
- **Blooms exist only after compaction.** The live trie writer is called with `calculateBlooms = false` (`core/src/main/kotlin/xtdb/indexer/LiveTable.kt:198 @ c6c1962`), `ColumnMetadata.kt:141` writes blooms only if requested (or for `_iid`), and the compactor requests them (`core/src/main/kotlin/xtdb/compactor/Compactor.kt:91 @ c6c1962`).
- **Supersede rule.** A page that cannot match is still read if it sits at the same IID path as a matching page in an older file, because it may hold a newer version of the same entity (`core/src/main/clojure/xtdb/trie.clj:101-168 @ c6c1962`; per-path planning `core/src/main/kotlin/xtdb/segment/MergePlanner.kt:40-88 @ c6c1962`). Consequence: min/max on a hashed-`_id` table prunes only files older than the match.
- **Scan assembly.** `core/src/main/clojure/xtdb/operator/scan.clj:205-244, 296-350 @ c6c1962`. Join-build-side blooms and IIDs are pushed to the probe scan (`core/src/main/clojure/xtdb/operator/join.clj:175-189, 410-436 @ c6c1962`).
- **Instrumentation.** `EXPLAIN ANALYZE` returns on the `scan` row `scan_files_pruned/used`, `scan_pages_pruned/used`, `scan_rows_read` (`core/src/main/kotlin/xtdb/operator/scan/ScanMetrics.kt @ c6c1962`). All page counts below come from it.

### Evidence: probes (3,000,000 rows per table, 8 columns, `COUNT` = 3M rows read)

Four tables with identical columns (`key` unique string, `num` int, `ts` timestamp, `city` 1000 distinct):

| Table | `_id` | value order vs insertion |
| --- | --- | --- |
| `pr_h_sorted` | string `p<i>` (hashed IID) | same |
| `pr_h_shuf` | string `p<i>` | permuted |
| `pr_u_sorted` | UUID with rank in the high 64 bits | same |
| `pr_u_shuf` | UUID with rank in the high 64 bits | permuted |

*Phase A: compactor disabled, 24 L0 files per table (6144 pages). Phase B: same data compacted to L1C (4 live files, 3 full of 875k rows plus 1 partial, 4096 pages). Medians of 3 runs, ms, with pages used of total.*

| Query | A: `h_sorted` | A: `h_shuf` | A: `u_sorted` | B: `h_sorted` | B: `h_shuf` | B: `u_sorted` | B: `u_shuf` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `_id = x` | 13 (24 pages) | 10 | 1088 (CAST pitfall) | 10 (3) | 6 (3) | 6 (1, typed param) | 17 (3) |
| `key = 'k..'` unique string | 943 (6144) | 966 (6144) | 869 (8240) | **25 (3 of 4096)** | **29 (3)** | **19 (1)** | **22 (3)** |
| `key` miss | 862 | 1018 | 876 | 16 (0 pages) | 20 (0) | 20 (0) | 20 (0) |
| `num = M` | 465 (3840) | 952 (6144) | **10 (2 of 8240)** | 418 (3072) | 637 (4096) | **7.7 (1)** | **6.4 (4)** |
| `num` range 1k | 488 | 1068 | **11 (4)** | 479 | 719 | **9.8 (2)** | **8.8 (4)** |
| `num` range 100k | 532 | 852 | 43 (279) | 636 | 784 | 36 (138) | 33 (140) |
| `ts` 1 hour (60 rows) | 541 | 1106 | 10 (2) | 501 | 749 | 8 (1) | 8.7 (4) |
| `city = 'city7'` (3000 matches) | 914 | 839 | not run | 688 (3311 of 4096) | 647 (3373) | 952 (3190) | 874 (3915) |
| `key` string range 1k | 928 (6144) | 977 | not run | 1141 (4096) | 1023 (4096) | 915 (4358) | 1025 (4096) |
| `COUNT(*)` | 791 | 799 | 746 | 586 | 619 | 703 | 809 |

Raw: `prune-A.out`, `prune-B.out`, `iid-q-hashed.out`.

What the numbers show:

1. **Bloom equality works after compaction and not before.** Unique-string equality is 25-29 ms with 3 of 4096 pages read, against 0.87-0.97 s with every page read in L0. This contradicts R1's "bloom pruning not visible" (R1 Q7). One probe run explains how R1 could have seen that: after I restarted with the compactor enabled over existing L0 files, queries kept planning over the 24 L0 files (`files_used = 24`) even though `xt.trie_stats` listed 4 live L1C files; a second restart fixed it (`prune-B-stale-catalog-L0.out`). In a clean run (`visible.mjs`) the query switched to the L1 file immediately. Cause not isolated.
2. **Sorted insertion does not cluster pages.** `pr_h_sorted` equality on `num` prunes only 1024 of 4096 pages in the best case (older files) and 465 ms vs 952 ms shuffled in L0. Pages are IID buckets, so within a file the value range of every page spans the file's range. This answers the "sorted vs shuffled" question: sorted insertion helps only at file granularity, and only for the older files.
3. **An order-preserving UUID `_id` makes numeric/time min/max prune to 1-4 pages**, in L0 and after compaction, for sorted and shuffled insertion alike (the IID, not the insertion order, decides the page). Equality 6-10 ms, 1000-wide range 9-15 ms, 100k-wide range 33-43 ms (about 140 pages).
4. **Low-cardinality scattered values are not helped by blooms** (`city`: 3311-3915 of 4096 pages read, 650-950 ms).
5. **String ranges never prune.**
6. **Cost of pruned lookups is metadata evaluation over all pages.** A bloom lookup at 4096 pages costs 16-29 ms, so about 4-7 microseconds per page. Extrapolation to 100M facts (about 100k pages) gives roughly 0.4-0.7 s for a string-equality bloom lookup; upstream PR #6200 reports 113-260 ms for a min/max predicate on a 100M-row table, so the same order. Low confidence; not measured at that size. Upstream #6361 notes per-page `_iid` blooms dominate metadata files in recency-branched files.

### Compaction effect on layout (measured)

- Eight-column row: about 125 B per row in L0 data files and 125 B per row in the live L1C data; metadata about 60 B per row (`pr_h_sorted` after GC: data 722 MB including 380 MB of L0, meta 183 MB, 3M rows).
- 3M rows reaches only L1C (3 files over 100 MiB plus a partial). L2C needs 4 full L1C files (`core/src/main/clojure/xtdb/trie_catalog.clj:61-98, 115 @ c6c1962`; `dev/doc/compaction.allium`). L2+ pruning was not probed (open question).

**Confidence.** High for the mechanism and the 3M-row numbers; Low for the 100M extrapolation.

**Design implication.**

- String equality on unique-ish values: a bloom scan is acceptable for a raw-query escape hatch (25 ms at 3M), but it grows with page count and is useless before compaction. Do not use it on a hot path.
- To get range/equality pruning on a numeric/time attribute, the index row's `_id` must be a UUID whose high bits are an order-preserving encoding of the value (immutable per index row).

---

## Q2. `_id` and IID

**Verdict.** The IID is the trie key. UUID `_id`s are used as-is, so a UUID prefix is a trie prefix and clusters rows. Strings, keywords and integers are hashed. No SQL/XTQL form turns an `_id` range into an IID range; the only batch form is an exact-key set.

### Evidence: source

- `UUID` -> 16 raw bytes, most significant long first (`core/src/main/kotlin/xtdb/util/Iid.kt:12-27 @ c6c1962`, `core/src/main/kotlin/xtdb/Util.kt:8-15 @ c6c1962`).
- `String` -> first 16 bytes of SHA-256 of `"s" + value`; `Keyword` -> `"k" + value`; `Int/Long/Short/Byte` -> `"i" + value`; everything else (BigInt, double, ...) is rejected with `xtdb/invalid-id` (`Iid.kt:12-27`; valid types `core/src/main/clojure/xtdb/util.clj:186-190 @ c6c1962`).
- Single `_id = v` and `OR` chains of `_id = v` become an IID set in the scan (`scan.clj:133-180`); `IN (...)`, `= ANY`, `IN (SELECT ... UNNEST)` are planned as quantified comparisons, i.e. a semi-join whose build side supplies the IIDs (`core/src/main/clojure/xtdb/sql.clj:2238-2250 @ c6c1962`; `join.clj:175-189`). The scan then prunes tree paths and selects rows by binary search (`scan.clj:198-203`, `core/src/main/kotlin/xtdb/operator/scan/MultiIidSelector.kt @ c6c1962`).
- `resolve-eid-to-iid` accepts only a literal or a parameter holding a valid ID type (`scan.clj:133-146`). A `CAST(... AS UUID)` expression is not one.

### Evidence: probes (3M-row tables, compacted)

*`_id IN` with k keys, ms (pages read of 4096-4358).*

| k | hashed string keys, spread | hashed, consecutive ids | UUID keys, spread | UUID keys, consecutive ranks (shared prefix) |
| --- | --- | --- | --- | --- |
| 10 | 10.5-12 (30) | 5.8-6.8 (30) | 6.5-8 (11) | **1.9-2.9 (1)** |
| 100 | 48-76 (324) | 35-66 (336) | 26-31 (106) | **2.6-3.2 (1)** |
| 1000 | 330-475 (2521) | 260-320 (2475) | 163-221 (967) | **5.2-13 (3 pages, 2197 rows)** |

Other forms on the hashed table:

| Form | k=10 | k=100 | k=1000 |
| --- | --- | --- | --- |
| k sequential single lookups (1 connection) | 30-64 ms | 230-960 ms | 2.3-5.6 s |
| k single lookups, 4 connections | 10-24 ms | 61-93 ms | 675-855 ms |
| `OR` chain | 7-12 ms | 66-76 ms | **fails: "Syntax error compiling reify*"** |

- `IN (literals)`, `= ANY($1)`, `IN (SELECT FROM UNNEST($1))` perform within 20% of each other.
- UUID array parameters are unsupported (OID 2951: "Unsupported param type provided for read"). Pass `text[]` and `CAST(x AS UUID)` inside, which still gets the IID pushdown.
- **`_id` range on a UUID table is not pruned**: `_id >= lo AND _id < hi` read 4358 of 4358 pages, 991 ms.
- Point lookups: 6-10 ms at 3M rows (3 pages of 4 files, 2000-2900 rows read).

**Confidence.** High.

**Design implication.**

- Entity ids that are UUIDs with a shared prefix per group (tenant, owner, parent) make group-wide batch fetches 30-60x cheaper (5 ms vs 330 ms for 1000 ids). Prefix bits should be as many as needed to put one group in a few pages; hotspot risk is low because the trie splits adaptively.
- Batch reads: prefer one `= ANY($1)` over many point lookups (0.3 ms/key vs 2.3-5.6 ms/key). Cap `OR` chains well below 1000.
- Use typed uuid params or UUID literals that the parser treats as values; never `CAST` in the predicate.

---

## Q3. Index-table shapes

**Verdict.** For unique attributes, `_id` = value is the right shape. For non-unique attributes, an array-per-value doc is fastest to read and update while it stays small (up to about 10^4 ids); per-edge rows with a value-clustered UUID `_id` make writes O(1) and reads 22-42 ms; the uniform-hash per-edge shape is the slow control and should not be used.

### Shapes probed

```
 (a) unique:   _id = "<valueKey>"            eid
 (b) array:    _id = "<valueKey>"            eids[ ... ]
 (c) uniform:  _id = hash("<value>|<eid>")   val, eid          (control, bloom only)
 (c') clustered: _id = UUID( fnv64(value) | fnv64(eid) )   val, eid
                 IID prefix = value hash => all postings of one value are adjacent pages
```

### Lookup latency (3M edges, compacted; ms; `fu` files, pages read)

| Shape | 1000 values x 3000 postings | 300k values x 10 postings |
| --- | --- | --- |
| (a)-style `_id` lookup (unique) | 6-10 | 6-10 |
| (b) array doc | **5.2** (1 page) | **2.1** |
| (c') clustered UUID | **41.7** (72 of 72.6k pages, 34.5k rows) | **22.3** (6 of 8.9k pages) |
| (c) uniform hash | 665 (5840 pages, 3.0M rows) | 43.6 (37 pages) |
| (b) lookup + fetch the entities (`p._id IN (subquery)` on 3M-row table) | 482 | 8.5 |
| (c') lookup + fetch entities | 498 | 27 |
| (c) lookup + fetch entities | 1298 | 43 |

The entity fetch for 3000 hashed ids reads 3840 pages and 2.8M rows (about 450-500 ms); for 10 ids it reads 28 pages (about 6 ms). See failure 2.

### Write cost per update (transaction incl. `COMMIT SYNC`, median ms)

| Operation | ms |
| --- | --- |
| (a) `INSERT` one row (3M-row table) | 5.1 |
| (a) `ASSERT NOT EXISTS (... _id = $1)` + `INSERT` | 11.1 |
| (a) change value: `DELETE` old + `ASSERT NOT EXISTS` new + `INSERT` | 25.7 |
| (a) violating `ASSERT` (SQLSTATE P0004) | 17.5 |
| (a) uniqueness check of 1000 keys in one read, `_id = ANY` | 365-625 |
| control: `ASSERT NOT EXISTS` on non-`_id` column, 3M rows | 1240 (1090-2690) |
| (c') append posting (`INSERT` 1 row) | 4.4-4.8 |
| (c') remove posting (`DELETE` by typed uuid `_id`) | 13-19 |
| (c) append posting | 5.6-6.2 |
| (b) append, doc of 10 ids / 3000 ids (`INSERT ... SELECT ARRAY_AGG`) | 18 / 24 |
| (b) remove, doc of 10 ids / 3000 ids | 6.4 / 10.6 |

Array operations that do not exist or fail in 2.2.0 (`arrfn.out`, `arrfn2.out`): `ARRAY[..] || ARRAY[..]` ("No matching clause"), `array_cat`, `array_append`, `array_remove` (unknown function), `UPDATE ... SET eids = (SELECT ...)` ("Subqueries are not allowed in this context"), `PATCH` of an array or struct (replaces it; a struct "map posting" does not merge keys). `CARDINALITY`, `UNNEST`, `ARRAY_AGG`, `= ANY`, subscript work.

**Confidence.** High for lookups and per-update latency; Medium for scale (3M edges, not 100M).

**Design implication.**

- Unique attributes: `_id` = canonical value key, `ASSERT NOT EXISTS (SELECT 1 FROM ix WHERE _id = $1)` inside the entity transaction (11 ms), never a check on a non-`_id` column.
- Non-unique: see the skew results next for the choice between (b), paged (b), and (c').
- Do not use (c) uniform hashing for anything that returns more than a handful of rows.

---

## Scope extension 1 and 2. Skewed values and high-degree reverse references

Reverse references are structurally the same index (value = target entity id, postings = source entity ids). I ran one dataset: 1 popular value with 1,000,000 postings plus 200,000 small values with 1-10 postings (1.1M postings), and four layouts. Results apply to both.

*Layouts:* `sk_arr` = one array doc per value; `sk_pag1k` / `sk_pag10k` = head doc `_id = value` with `n` (page count) and the first page inline, overflow docs `_id = value#k`; `sk_edge_c` = per-edge rows with value-clustered UUID `_id`; `sk_edge_u` = per-edge rows with uniform `_id`.

### Lookup (ms, median)

| Layout | all 1M postings of the popular value | first page only (popular) | small value (8 postings) | small value (1 posting) |
| --- | --- | --- | --- | --- |
| single array doc | 536 (server `CARDINALITY` 2.1) | n/a | 2.5 | n/a |
| paged, 1000/page | 457 (head + `IN` of 999 pages) | 4.7 (1000 ids) | 3.4 | n/a |
| paged, 10000/page | 395 (head + `IN` of 99 pages) | 2.9 (10000 ids) | 2.0 | n/a |
| per-edge, clustered UUID | 2808 | n/a | 18 | 30 |
| per-edge, uniform | 6139 | n/a | 47 | 33 |

The 1,000,000-element array doc (about 14 MB) was accepted by `COPY`, read in 0.54 s, and no size limit was hit at that size. Larger sizes untested.

### Update (tx incl. `COMMIT SYNC`, median ms)

| Layout | append to popular value | remove from popular value | append to small value | remove from small value |
| --- | --- | --- | --- | --- |
| single array doc | **542** (new 14 MB version) | **393** | 34-52 | 36-54 |
| paged, 1000/page | 28.5 (last page) | 9.2 (page known) | 37 | n/a |
| paged, 10000/page | 49 | 25 (page known) | 31 | n/a |
| per-edge, clustered | 21 | 13-19 (typed param) | 22 | 13-19 |
| per-edge, uniform | 18 | 43 | 23 | 47 |

- Disk cost of an update on the 1M-element doc: six rewrites produced an 84.7 MB L0 file (about 14 MB per update, `sk_arr` data listing). Each paged update writes one page (about 14 KB for 1000 ids).
- Removing a posting from a paged layout when the entity does not store its page number: `'x' = ANY(eids)` scan over the page docs, 1.2-2.3 s (1M postings).
- The per-edge clustered `DELETE` measured 2.7-4.9 s in `post-q.mjs` because I wrote `_id = CAST('..' AS UUID)`; that is the CAST pitfall, not the layout. With a typed parameter (`ixq.mjs`) it is 13-19 ms.

**Confidence.** High for the measured numbers; Medium for generalising (one popular value, one distribution).

**Design implication (recommended layout for non-unique values and reverse refs).**

```
 head doc   _id = "<attrKey>|<valueKey>"     n = page count, eids = first <= 1000 ids   (1 lookup, 2-5 ms)
 overflow   _id = "<attrKey>|<valueKey>#k"   eids = <= 1000..10000 ids                  (IN of n-1 keys)
 entity doc stores (for each indexed value it appears in) the page number k            (makes removal a 1-page rewrite)
```

- Append goes to the last page (28-49 ms). New page when full; bump `n` on the head in the same transaction.
- Use pages of 1000-10000 ids. A single unpaged doc is acceptable only below about 10^4 ids (rewrite <= 1 MB).
- Per-edge clustered rows are the right choice when updates dominate and lookups return few rows (insert 4.5 ms, no read-modify-write), or for values of unbounded size where page bookkeeping is unwanted. Their cost is the metadata walk (22-42 ms at 3M rows, growing with page count) and 2.8 s to read 1M postings.
- Boolean-like attributes (two values, millions of postings each) should not be indexed with postings at all; use the projection scan (1 s per 3M rows) or a counter.

---

## Scope extension 3. Range and ordered access

**Verdict.** `_id` gives no range or order. Two layouts work: bucket docs (`_id` = attribute + value bucket) and order-preserving UUID index rows with a bounded window. An unbounded `ORDER BY ... LIMIT` is a full scan in every layout except bucket docs.

*Data: 3M entities, `num` dense 0..3M-1. Medians in ms; "pages" are pages read.*

| Access | Plain projection scan (hashed `_id`) | Order-preserving UUID index/projection rows | Bucket docs W=100 | W=1000 | W=10000 |
| --- | --- | --- | --- | --- | --- |
| range, 1000 values | 850-3500 (4096 pages) | **11-15** (2-4 pages) | 5.1 (10 buckets) | **3.1 (2 buckets)** | 65.8 (1 bucket, 10k entries) |
| range, 100k values (count) | 854 | **33-41** (138 pages) | 79.6 (1000 buckets) | **49.6 (101)** | 59.2 (11) |
| `ORDER BY num LIMIT 100` | 1768 | 1053-2092 (full scan) | 2.1 (1 bucket) | **2.4 (1)** | 7.4 (1) |
| `ORDER BY num DESC LIMIT 100` | 2006 | 1111-2517 (full scan) | 1.7 | **2.2** | 8.8 |
| next page after key A (`num >= A ORDER BY num LIMIT 100`) | 1946 | 702-783 (about 2500 pages) | 5.6 (2 buckets) | **3.5 (2)** | 12.5 (2) |
| next page with a bounding window (`A <= num < A+400 ... LIMIT 100`) | 903 | **9-14** (2-4 pages) | n/a | n/a | n/a |
| timestamp day (1440 rows) | 1320 | **9-10** (3-8 pages) | n/a | n/a | n/a |
| move one entity to a new value (remove + insert, tx) | n/a | n/a | 38 | **33** | 58 |

- Bucket doc layout: `_id = "num#<bucket>"`, `ents` = sorted array of `"<zero-padded value>|<entity id>"`; the range read is `_id IN (bucket ids)` and a client-side filter on the key prefix; the move is two `INSERT ... SELECT ARRAY_AGG(x ORDER BY x)` statements. Raw: `range-q.out`, `bucket-load.out`.
- **Bucket reads needed:** a 1000-value range needs 2 buckets at W=1000; a 100k-value range needs 101; an `ORDER BY ... LIMIT 100` page needs 1 (the first or last bucket) and a keyset next page needs 2.
- The order-preserving UUID needs the rank in the high 64 bits at row creation, so it suits index rows (immutable per row) or write-once data, not an attribute that is edited in place.
- Windowed ordered pages work only if the window is sized from the value density; an unbounded `ORDER BY` has no top-k pushdown.

**Confidence.** High for dense uniform values; Low for skewed or sparse domains (bucket occupancy varies; I did not probe it). The bucket width should be tuned from a histogram, with a split/merge rule.

**Design implication.** Offer bucket docs (W about 1000 entries) for sortable/range attributes users page through; offer the UUID-window form for time ranges on append-only data. State plainly that `ORDER BY` on raw projection tables is a scan.

---

## Scope extension 4. History of rewritten index docs

**Verdict.** By-`_id` history on a posting doc is as cheap as a current read, as long as one version is small. Cost is per version size, and every posting change keeps a full copy.

- Posting doc of 1000 ids rewritten 301 times; doc of 10,000 ids rewritten 101 times, inside the 200k-doc `sk_arr` table, after flush and compaction (`hist-after.out`):

| Query | 1000-id doc, 301 versions | 10,000-id doc, 101 versions |
| --- | --- | --- |
| current | 4.0 ms (3 pages, 1223 rows read) | 3.4 |
| `FOR SYSTEM_TIME AS OF` middle version | 3.0 | 3.3 |
| `FOR ALL SYSTEM_TIME` select `_system_from` | 5.1 (301 rows) | 4.0 (101 rows) |
| `FOR ALL SYSTEM_TIME` `CARDINALITY(eids)` per version | 4.9 | 3.8 |

  Before flush (versions in the live index) the same reads took 3-16 ms (`hist-q.out`). The "AS OF oldest" row returned 0 rows because JS truncated the microsecond `_system_from` to milliseconds; the plan cost was the same.
- A 1M-element doc stores 14 MB per version; its history read cost was not measured (open question). Storage grows linearly with number of changes times document size, which is the reason for paging.
- With a 500k-id x 10-version table (9.5M bitemporal rows, `ver-q.out`), reads by `_id`: `FOR SYSTEM_TIME AS OF` pass 1 / 5 / 9 = 2.3 / 6.2 / 8.5 ms (1 / 10 / 26 files); `FOR ALL SYSTEM_TIME` 13 ms; current 13 ms.

**Confidence.** Medium (small sample, microsecond truncation noted).

**Design implication.** Paged postings bound both the per-version size and the history cost. Time-travel on an index table is an `_id` read; time-travel on a projection table by predicate is a scan.

---

## Scope extension 5. What raw SQL/XTQL users pay without index tables

3M rows, hashed `_id`, compacted (phase B in Q1), on 3 CPU. R1 measured 1M rows at 0.22-0.30 s per non-`_id` predicate.

| Query on the projection table | 3M rows | extrapolation to 100M (linear) |
| --- | --- | --- |
| unique string equality (bloom, compacted) | 0.025 s | 0.4-0.7 s |
| unique string equality (L0 files, not yet compacted) | 0.9-1.0 s | 30 s |
| numeric/time equality or range, any data order | 0.42-0.78 s | 14-26 s |
| low-cardinality equality (`city`) | 0.65-0.95 s | 22-32 s |
| string range | 0.9-1.1 s | 30-38 s |
| `COUNT(*)` | 0.59-0.62 s | 20 s |
| `ORDER BY ... LIMIT 100` | 1.8-2.0 s | 60-67 s |
| non-`_id` predicate with 10 retained versions (500k entities, 4.8 s `COUNT`) | 2.3-4.8 s per 500k entities | scales with versions retained |

The 1M-row row was not re-measured (stopped at 3M); the 100M column is arithmetic, not a probe. Any raw query that touches a time column or a number is a full scan unless the table was built with the UUID trick.

**Confidence.** High at 3M, Low beyond.

---

## Q4. Ingest tuning

**Verdict.** Use `COPY ... FROM STDIN` with `arrow-stream` through a small raw wire client (the Node `postgres` driver's `.writable()` hangs against XTDB, R1 Q7). Parameterised multi-row `INSERT` is 10-20x slower. The single writer does not serialise parsing: more than one connection helps.

### Evidence: source

- COPY formats: `arrow-file`, `arrow-stream`, `transit-json`, `transit-msgpack` (`core/src/main/clojure/xtdb/pgwire.clj:1335-1363, 1459-1527 @ c6c1962`). Transit: the whole COPY is written to a temp file, decoded into a vector, and put as one transaction of one `PutDocs` op. Arrow outside a transaction: one transaction per record batch; inside `BEGIN`: batches are buffered on the transaction.
- A bare `COMMIT` is synchronous unless the transaction began `ASYNC` (`pgwire.clj:582-605 @ c6c1962`).
- `POST /system/finish-block` on the healthz port forces a block boundary (`docs/src/content/docs/ops/maintenance.md`, `core/src/main/clojure/xtdb/healthz.clj:124 @ c6c1962`).

### Evidence: probes (8-column rows; generation outside the timer; rows/s)

*Batch-size knee, one connection, 500k rows:*

| Rows per statement or batch | `INSERT` params (rows x stmts/tx) | `COPY transit-json` | `COPY arrow-stream` |
| --- | --- | --- | --- |
| 10 x 100 | 7,388 | | |
| 25 x 40 | **9,073** | | |
| 50 x 20 | 7,295 | | |
| 100 x 10 | 5,304 | | |
| 200 x 5 | 2,854 | | |
| 500 x 2 | 1,497 | | |
| 1,000 (1 stmt) | about 690 (R1) | 51,237 | 73,026 |
| 5,000 | | 64,240 | 89,786 |
| 10,000 | | 72,133 | **170,674** |
| 25,000 | | 86,306 | 141,509 |
| 50,000 | | 121,385 | 150,884 |
| 100,000 | | **145,613** | 123,011 |

*Connections (10,000-row batches; 50 rows x 20 stmts for `INSERT`):*

| Connections | `INSERT` | `COPY transit` | `COPY arrow` |
| --- | --- | --- | --- |
| 1 | 7,295 | 72,133 | 170,674 |
| 2 | 19,854 | 164,035 | 247,058 |
| 4 | 23,458 | 186,756 | 191,852 |

Throughput varies 10-30% run to run with background flush and compaction. Raw: `ingest-sweep.out`, `ingest1.out`, `heap1.out`.

*COPY semantics (`copytx.out`):*

- Inside `BEGIN READ WRITE WITH (METADATA = {op_id: 'op-1'})`: `ASSERT NOT EXISTS (...)`, `COPY ... arrow-stream` (1000 rows), `INSERT`, `COMMIT SYNC` commits atomically; `xt.txs` finds the transaction by `user_metadata->>'op_id'`.
- A repeated `op_id` fails `ASSERT` at `COMMIT SYNC` with SQLSTATE P0004 and the COPY rows are not written (count unchanged).
- `UPDATE` after `COPY` in the same transaction sees the copied rows.
- Arrow columns `_valid_from` / `_valid_to` (timestamp micros) are honoured per row.
- `BEGIN READ WRITE WITH (ASYNC = true)` + COPY of 50k rows + `COMMIT` returned in 216 ms; the next read on the same connection waited for indexing (325 ms total).
- Tables referenced by `ASSERT`/`INSERT` in a transaction must already exist (SQL "Table not found"); create them first with `CREATE TABLE t (_id, ...)`.

### JVM and heap (`heap1.out`; 3 CPU / 5 GiB container; heap 2500 MiB; direct 1500 MiB)

| Load | Result | Container RSS |
| --- | --- | --- |
| params 50 x 20, 300k rows | 9,249 rows/s, no error | 730 MiB |
| transit COPY 100k rows/COPY, 500k rows | 121,670 rows/s | 1.18 GiB |
| transit COPY **1,000,000 rows in one COPY**, 1M rows | 121,878 rows/s | 2.31 GiB |
| arrow COPY 10 record batches of 10k per COPY, 500k rows | 127,710 rows/s | 1.03 GiB |
| literal `VALUES`, 100 rows x 10 stmts, distinct text, 100k rows | 14,883 rows/s | 2.13 GiB |
| literal `VALUES`, 1000 x 10, distinct text | 21,798 rows/s for 100k rows, then **`Java heap space`** at about 220k cumulative rows (second run, 20k further rows) | 3.18 GiB |
| literal `VALUES`, 1000 x 10, **identical text**, 600k rows | 59,230 rows/s, no error | 570 MiB |

- The heap error R1 saw reproduces at `-Xmx2500m`, so a larger heap alone does not prevent it. It follows the number of distinct statement texts (plan and DML caches are keyed by text, sized 4096 and 256 entries, R1 Q7), not rows. Parameterised same-text statements and COPY do not trigger it. Mechanism not isolated.
- Identical-text literal statements run at 59k rows/s, which shows planning and parsing dominate parameterised `INSERT` cost (9k rows/s), not execution.
- Not tested: `pg` + `pg-copy-streams` (installed in the probe directory, not run), heap above 2500 MiB, container above 5 GiB, `memoryCache.maxSizeBytes` changes.

**Confidence.** High for the numbers on this VM; Medium for settings I did not exercise.

**Design implication.**

- Bulk path: `COPY arrow-stream`, 10k-50k rows per record batch, 2 connections, inside `BEGIN READ WRITE WITH (METADATA = {op_id: ...})` with the CAS `ASSERT` when the transaction must be atomic with the ledger; a transaction of many record batches commits all of them atomically. Fall back to 25 rows x 40 statements per transaction, 2-4 connections (about 20k rows/s) where COPY cannot be used.
- Do not use distinct literal `VALUES` text.
- Heap sizing for the 6 CPU / 12 GiB VM (untested; derived from RSS = heap + direct + about 0.5 GiB): container 8-9 GiB, `-Xmx4g -XX:MaxDirectMemorySize=3g`, `memoryCache.maxSizeBytes` about 1.5 GiB. A 1M-row transit COPY needed 2.3 GiB RSS at 2.5 GiB heap; cap per-COPY size at 100k rows or use arrow record batches.

---

## Q5. History-mode reads

**Verdict.** Anything keyed by `_id` is cheap whichever temporal form is used. Table-wide history forms read every retained version, and recency pruning does not help for versions written recently.

### Evidence: source

- Current-state files are split from superseded rows at L0 -> L1: L1C holds rows with infinite recency, L1H holds superseded rows partitioned into weekly recency buckets (`dev/doc/compaction.allium`; `trie_catalog.clj:61-98 @ c6c1962`). `filter-pages` skips a file when its recency is not after the query's lower bound (`trie.clj:101-168`).
- `xt.txs` is an ordinary table keyed by transaction id; `user_metadata` is a column.

### Evidence: probes (`ver` table: 500,000 ids x 10 versions written as 10 passes of COPY, 5M versions, 9.5M bitemporal rows, all within 47 s, compacted; `ver-q.out`)

| Query | ms (median) | files / pages / rows read |
| --- | --- | --- |
| current version by `_id` | 13.2 | 29 / 30 / 14,956 |
| current `_system_from` by `_id` | 11.3 | same |
| `FOR ALL SYSTEM_TIME` by `_id` (10 versions) | 13.0 | same |
| select the `_system_from` of version v=3 by `_id` | 10.1 | same |
| `FOR SYSTEM_TIME AS OF` end of pass 1 / 5 / 9, by `_id` | 2.3 / 6.2 / 8.5 | 1 / 10 / 26 files |
| `AS OF` before the first write | 1.6 | 0 files |
| 100 ids, current vs `AS OF` pass 5 (`= ANY`) | 490 / 235 | 2910 / 1067 pages |
| `COUNT(*)` current | **4762** | 93,720 pages, **46.4M rows** |
| `COUNT(*)` `AS OF` pass 5 | 1497 | 34,364 pages |
| `COUNT(*)` `FOR ALL SYSTEM_TIME` | 2714 (5.0M rows) | 93,720 pages |
| `COUNT(*)` `FOR ALL VALID_TIME` | 2910 (5.0M rows) | |
| `COUNT(*)` both `FOR ALL` | 3689 (9.5M rows) | |
| non-`_id` predicate, current | 2273 | 46.4M rows |
| `xt.txs WHERE _id = <tx id>` | 1.9 | 1 file |
| `xt.txs WHERE user_metadata->>'op_id' = ...` (2208 txs) | 2.8 | |

- Selecting the `_system_from` of a specific version by `_id` is a 10-13 ms read. The engine time of a commit is a 1.9 ms `xt.txs` read by transaction id; the position-to-time mapping should be stored by `METADATA = {op_id, position}` and read by `_id` of the tx, not by the metadata field once `xt.txs` grows (the metadata predicate is a scan).
- Current-time `COUNT(*)` read all 29 files because everything was written within one minute, so no file's recency was in the past. In a long-lived store, older history files should be skipped by the recency test; I did not probe that (open question).
- Disk for this table after GC: 4.4 GB for 5M versions = 880 B per version (data 3.36 GB, meta 1.06 GB).

**Confidence.** High for by-id; Medium for table-wide (recency effect untested).

**Design implication.** Point reads at any system time are 2-13 ms. A bitemporal projection with N retained versions multiplies every table scan by about N until the history ages out; plan retention (and `ERASE` where legal) for scan-heavy tables.

---

## Q6. Compaction and GC

**Verdict.** Compaction settles quickly under bulk load with one thread; GC reclaims superseded files quickly if its settings are tightened; L0 files and the Local log are retained.

### Settings (source and docs)

| Setting | Default | Source |
| --- | --- | --- |
| `compactor.threads` | `max(availableProcessors / 2, 1)`, so 1 on 3 CPUs (the docs say `min`) | `core/src/main/kotlin/xtdb/api/CompactorConfig.kt @ c6c1962`; `docs/src/content/docs/ops/config.md` |
| `indexer.rowsPerBlock` | 102,400 | `IndexerConfig.kt` |
| `indexer.flushDuration` | PT15M | `IndexerConfig.kt` |
| `indexer.pageLimit` / `logLimit` | 1024 / 64 | `IndexerConfig.kt` |
| `garbageCollector.enabled / blocksToKeep / garbageLifetime` | true / 10 / PT24H | `core/src/main/kotlin/xtdb/api/GarbageCollectorConfig.kt @ c6c1962` |
| L1C file size target | 100 MiB, not configurable (dynamic var) | `trie_catalog.clj:115 @ c6c1962` |
| `memoryCache.maxSizeBytes` / `maxSizeRatio` | unset / 0.5 of direct memory | `ops/config/storage.md` |
| Manual block boundary | `POST :8080/system/finish-block` | `maintenance.md` |

### Evidence: probes

- **Compaction throughput (compactor.threads 2 configured, 3 CPUs):** 4 tables x 3M rows, 24 L0 files each, compacted to L1C in about 80 s (about 150k rows/s).
- **L1C is rewritten cumulatively** (`pr_h_sorted/data`): L1 sizes 15.6, 31, 47, 63, 78, 94, 109 MB, then a new chain 15.7, 31, ... 110 MB; 24 L0 files produce 24 L1 files of which 4 stay live (875k, 875k, 875k, 375k rows, 377 MB). Before GC, one 3M-row table held 1712 MB of data files and 602 MB of metadata for 380 MB of live data: about 6x.
- **GC:** restart with `garbageCollector: {blocksToKeep: 2, garbageLifetime: PT1S}` and trigger one block boundary: `buffers` shrank from **37,706 MB to 13,083 MB within 10 s** (65% reclaimed; VM disk was at 95% before). Defaults would have kept the 24.6 GB for 24 h.
- **What remains after GC:** `pr_h_sorted` 905 MB for 3M rows = 300 B/row (L0 data 380 MB + live L1C 377 MB + metadata 183 MB; the 25 L0 files are still on disk). L0 files are kept deliberately as a recovery substrate (`trie_catalog.clj:175-182 @ c6c1962`, `drop-superseded-l0`). So steady state is about 2x live data plus metadata, down from about 6x.
- **Log:** the Local log is not truncated: 2.6 GB after 12M rows, 6.7 GB after about 55M rows (about 120-215 B/row).
- **Per-table bytes after GC** (`du` of `data` + `meta`, compacted + L0): `pr_h_sorted` 905 MB (3M rows, 8 columns); `ix_c_1000` 642 MB (3M edges, 3 columns); `ix_u_1000` 714 MB; `sk_arr` 283 MB; `rb_1000` 142 MB (3000 docs of 1000 ids); `ver` 4414 MB (9.5M bitemporal rows).

**Confidence.** Medium (one VM, one workload; GC timing observed once).

**Design implication.**

- Set `garbageCollector.garbageLifetime` to hours, not 24 h, and `blocksToKeep` to at least 4, for load phases; budget 2.4x live data plus the log.
- After a bulk load, call `POST /system/finish-block` and wait for `compactor_jobs_available == 0` in `/metrics` before relying on bloom pruning (Q1: L0 files have no blooms).
- With 6 CPUs set `compactor.threads` explicitly (2-3).

---

## Recommended physical design for a 10M-entity deployment

```
 projection tables                      index tables (all keyed by _id, all written in the entity tx)
 ------------------------               ---------------------------------------------------------------
 person   _id = UUID(prefix|rand)       ix_uniq_<attr>   _id = "<attr>|<canon value>"     eid
 org      _id = UUID(prefix|rand)       ix_post_<attr>   _id = "<attr>|<value>"           n, eids[<=1000]  (head, first page inline)
 ...      one column per attribute      ix_post_<attr>   _id = "<attr>|<value>#k"         eids[<=1000..10000]  (overflow pages)
                                        ix_ref_<type>    _id = "<target>|<edgeType>[#k]"   same paged layout, source ids
                                        ix_rng_<attr>    _id = "<attr>#<bucket W=1000>"    ents[sorted "value|eid"]
```

| Choice | Setting | Basis |
| --- | --- | --- |
| Entity `_id` | UUID, high 32-64 bits = tenant/owner/parent group, rest random | group fetch of 1000 ids 5.5 ms vs 330 ms (Q2) |
| Unique attributes | `ix_uniq_*`, `ASSERT NOT EXISTS` on `_id` in the entity tx | 11 ms checked insert; non-`_id` check 1.2 s (Q3) |
| Non-unique attributes, reverse refs | paged postings, head holds `n` and first page, entity stores page number | lookup 2-5 ms, popular 395-457 ms for 1M, update 28-49 ms (Skew) |
| Update-dominated, small-result attributes | per-edge rows, UUID `_id` = hash(value) + hash(entity) | insert 4.5 ms, lookup 22-42 ms (Q3) |
| Range/sort attributes | bucket docs W about 1000; UUID-window rows for append-only time data | range 3-50 ms, ordered page 2-4 ms (Range) |
| Ledger commit | `BEGIN READ WRITE WITH (METADATA = {op_id, position})`, CAS `ASSERT`, COPY arrow, `COMMIT SYNC` | Q4 copytx |
| Bulk load | `arrow-stream` COPY, 10k-50k rows per batch, 2 connections | 170-250k rows/s |
| Regular writes | one COPY or 25 x 40 param statements per transaction | 9k-20k rows/s |
| JVM (6 CPU / 12 GiB VM) | container 8-9 GiB, `-Xmx4g -XX:MaxDirectMemorySize=3g`, `memoryCache.maxSizeBytes` 1.5 GiB, `compactor.threads` 2-3 | untested sizes; derived from observed RSS |
| GC | `garbageLifetime` hours, `blocksToKeep` 4+ | Q6 |

**Expected latency (3M-row measurements; 10M entities is the same order for `_id` paths, linear for scans):**

| Path | Expected |
| --- | --- |
| Entity by `_id`, point | 6-10 ms |
| Unique attribute -> entity | 6-10 ms + 6-10 ms |
| Non-unique attribute, <= 1000 postings -> ids | 2-5 ms; entities +5-30 ms for tens of ids |
| Same, 3000 postings -> entities | about 0.5 s (entity ids scattered) or 5-15 ms if entity ids share a prefix |
| Popular value (1M) -> all ids | 0.4-0.5 s |
| Range of 1000 values / 100k values | 3-5 ms / 50-80 ms |
| Ordered page of 100 | 2-4 ms |
| Raw predicate on a projection table | 0.4-1.1 s per 3M rows; 15-35 s at 100M facts |
| `AS OF` by `_id` | 2-13 ms |
| Entity write incl. index maintenance (unique + 2 postings + range move) | about 11 + 2 x 30 + 33, about 100 ms sequential per entity change; amortised by batching in one transaction |

**Bytes per entity (on disk after GC, L0 retained, excluding the Local log):** 8-column row about 300 B per version; 3-column index edge about 215 B; bucket doc entry about 47 B; version-heavy rows about 880 B per bitemporal version (`ver`). For 10M entities with 30 attributes, a rough 0.6-1 KB per current version, times the retained-version multiplier, plus index edges; the log adds 120-215 B per row written.

---

## Open questions (not probed; time-boxed at the orchestrator's request)

1. Bloom/min-max lookup latency at 10M-100M rows (everything above 3M is arithmetic).
2. L2+ behaviour (a 3M-row table reaches only L1C); pruning on L2C/L3 files.
3. `pg` + `pg-copy-streams` (installed, not run); heap and direct memory above 2500/1500 MiB; `memoryCache` effects.
4. Why queries kept planning over L0 files after a restart with the compactor enabled (reproduced once; second restart cured it).
5. History read of the 1M-element array doc (14 MB per version) and recency-based skipping of old history files.
6. Bucket layouts for sparse or skewed value domains; bucket split/merge.
7. Concurrency between ingest, compaction and index-table maintenance transactions (single-writer queueing under mixed load).
8. Re-measure 1M-row raw predicates (only R1's numbers and the 3M-row numbers exist).

## Appendix. Probe index (`/Users/sam/Claude/Projects/triplex-db-2/R7-xtdb-index-probes/`)

| File | Purpose |
| --- | --- |
| `wire.mjs`, `rows.mjs`, `arrowgen.mjs`, `lib.mjs` | raw-wire COPY client, row model, Arrow batches, shared helpers |
| `ingest1.mjs`, `ingest2.mjs`, `run-ingest-sweep.sh`, `ingest-sweep.out`, `ingest1.out`, `heap1.mjs`, `heap1.out`, `copytx.mjs`, `copytx.out` | Q4 |
| `prune-load.mjs`, `load-q1.sh`, `prune-q.mjs`, `prune-A.out`, `prune-B.out`, `prune-B-stale-catalog-L0.out`, `visible.mjs`, `visible.out` | Q1 |
| `iid-q.mjs`, `iid-q-hashed.out`, `iid-q-uuid.out` | Q2 |
| `ixload.mjs`, `ixq.mjs`, `ixq-lookups.out`, `ixq-maint.out`, `arrfn.mjs`, `arrfn2.mjs`, `arrfn*.out` | Q3 |
| `post-load.mjs`, `post-q.mjs`, `post-q-read.out`, `post-q-update.out` | skew and high-degree postings |
| `bucket-load.mjs`, `range-q.mjs`, `range-q.out` | range and ordered access |
| `hist-q.mjs`, `hist-after.mjs`, `hist-q.out`, `hist-after.out`, `ver-load.mjs`, `ver-q.mjs`, `ver-q.out` | Q5 and history of rewritten docs |
| `xtdb-nocompact.yaml`, `xtdb-compact.yaml`, `xtdb-gc.yaml`, `watch-compaction.sh`, `wait-compact.sh`, `trie-stats.mjs`, `trie-sum.mjs`, `compaction-watch.out` | Q6 |
| `NOTES.md` | running notes written during the session |

Container setup: `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock docker run -d --name tx2-probe-r7 --cpus 3 --memory 5g -e JDK_JAVA_OPTIONS="-Xmx2500m -XX:MaxDirectMemorySize=1500m" -p 127.0.0.1:5467:5432 -v tx2-probe-r7-data:/var/lib/xtdb -v <cfg>.yaml:/etc/xtdb/config.yaml:ro ghcr.io/xtdb/xtdb:2.2.0 -f /etc/xtdb/config.yaml`. Container and volume removed at the end; no repo source modified. Probe data filled the VM disk to 95% before GC ran (37.7 GB in `buffers` plus 6.7 GB log); future probes of this size should enable aggressive GC from the start.

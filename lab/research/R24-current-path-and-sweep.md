# R24: Current-value path (P4) and release sweep (P5) on both lanes

**Written:** 2026-11-08 by research agent R24 (Sonnet 5.5); saved by the orchestrator as `lab/research/R24-current-path-and-sweep.md`. **Moves:** P4 and P5 directly, P1 and P2 through the read path and the broker. **Feeds:** EXP-P4 and EXP-P5 briefs (sections 6 and 7).

## 0. Answer

Build P4's fast path as one **current structure** that holds the live facts plus the facts retracted after a retention horizon H, and serve a read at basis B from it only when `H <= B <= W`, where W is the structure's applied watermark. Put the first copy in the broker's own SQLite file, written in the same transaction as the log frame, because the broker already needs that data for delete terms, retraction targets and preconditions; the same copy then serves P4 pulls, the P5 sweep and the Q50a fallback on both lanes with no new process. Give each engine a second, smaller copy written in the same transaction (XTDB) or the same guarded update (QLever) as its history rows, for list queries, native queries and lane completeness. XTDB 2.2.0 already splits current from historical files, but Triplex forfeits the split because every adapter read says `FOR ALL VALID_TIME`, which turns recency pruning off, and because it finds facts through non-`_id` predicates; QLever has no split, yet R17 measured flat pulls to 74M triples, and its cost is a fixed 3.4 to 6.5 ms per round that only a one-scan bundle or a host store removes. For P5, pin the basis by holding H at or below P_sweep, read in cursor pages from a worker thread that also runs the kernel, throttle on live-lane queue delay, and publish in 64-record frames below live commits. From the lab's own numbers a 100k sweep should take about 25 to 35 s on the host-store design on either lane, 45 to 95 s fed from XTDB per-subject documents, 25 to 55 s fed from a QLever streamed export, and 120 to 134 s fed from QLever batched pulls, which misses the 100 s bar.

| # | Question | Verdict | Confidence |
|---|---|---|---|
| 1 | XTDB current versus historical | Real physical split (L1C/L2C+ versus weekly L1H/L2H+) with recency pruning; `_id` reads are history-independent beyond the current week; Triplex's `FOR ALL VALID_TIME` reads and string-keyed facts forfeit it; `AS OF NOW` equals the default | High (source), Medium (costs) |
| 2 | QLever options | Host-held store wins on P4 and P5; second graph in the same update costs about +2% triples and stays flat but keeps the 3.4 to 6.5 ms per-round floor; kernel-side filtering from history is the exact fallback, not a fast path | High (measured by R17), Medium (extrapolation) |
| 3 | Prior art | Every bitemporal system splits on record or system time and keeps business time as data; only Kafka's versioned store serves an older basis from the current entry (validity short-circuit); asynchronous structures stay exact by waiting, failing, or folding the unapplied tail | Medium to High |
| 4 | Triplex today | Seven current-read sites; both adapters read the whole history table with temporal filters in SQL or SPARQL; the smallest change is a second table or graph written in the same statement list or update, plus a horizon row | High |
| 5 | Sweep | Replica for batch reads, short pinned pages, queue-delay admission, a lane in front of the FIFO engine, kernel in a worker; estimates in section 5.4 | Medium |

## How to read this report

- **Evidence labels.** `[S]` read in pinned source (`path:line`, XTDB at `references/xtdb` v2.2.0 sha `c6c1962`; Triplex on `main` unless a branch is named). `[W]` primary web document fetched (by me or by the two Opus sub-agents whose raw material is under `/Users/sam/Claude/Projects/triplex-db-2/R24/`). `[WS]` search snippet only. `[P]` measured in an earlier lab report (named). `[E]` my inference or arithmetic, with its inputs shown.
- **Done.** Read the lab files in the brief, the XTDB scan, trie, compactor and catalog source, the Triplex core and both adapters, the P2Q broker branch, and R7, R8, R16 to R19, R23. Two Opus sub-agents (prior art for current versus history, prior art for sweeps) fetched about 190 pages; I spot-checked four of their claims against the saved sources (Kafka `RocksDBVersionedStore.get(key, asOf)`, Netflix `Gradient2Limit` tolerance 1.5, Node's pooled-Buffer transfer rule, SQLite `wal.html` section 8) and all four held.
- **Not done.** No engine, container or benchmark was started, so every latency in sections 6 and 7 is a prediction. Lab numbers quoted from earlier reports come from a loaded host and are relative.
- **Style check.** I checked this file by grep for em-dashes and banned words. The background style reviewer was not run.

---

## 1. XTDB 2.2.0 internals: current versus historical reads

### 1.1 What the source establishes

1. **The split is physical.** The compactor routes each row by its recency into a current file (L1C, recency infinite) or a weekly historical file (L1H); the spec says "this is where the current/historical split happens" and gives the example that data with user-specified valid-to leaves L1C empty `[S dev/doc/compaction.allium:50-65]`. L1C is levelled to about 100 MiB and then split into L2C+ by IID prefix; L1H is tiered into L2H per recency partition `[S dev/doc/compaction.allium:67-95; core/src/main/clojure/xtdb/trie_catalog.clj:61-97]`. The docs promise "specific indices to quickly serve current-time queries" and "separate indices for historical data" `[S docs/src/content/docs/about/time-in-xtdb.md:236]`.
2. **Recency is computed per row during compaction.** `PolygonCalculator` walks one entity's events newest first, `Polygon.recency` is the largest T after which the row is invisible to every query whose valid time and system time are both at or after T `[S core/src/main/kotlin/xtdb/bitemporal/Polygon.kt:20-45; PolygonCalculator.kt:20-47]`. A row goes to L1C only when that recency is the end of time `[S compactor/OutWriter.kt:145-147]`; otherwise it goes to the weekly file containing its recency, rounded up to the next boundary `[S OutWriter.kt:60-64]`.
3. **Data not yet compacted is never pruned by recency.** Live-index pages carry recency `MAX` `[S segment/MemorySegment.kt:21]`; L0 files have no recency in their key, so `BufferPoolSegment` uses `MAX` `[S segment/BufferPoolSegment.kt:25]`; L0 and live events are unresolved against same-system-time events `[S Segment.kt:17-21]`.
4. **Which rows are "current" in XTDB's sense is narrower than Triplex's sense.** A row valid now but with a finite `valid_to` has recency equal to its `valid_to`, so it is filed as historical (spec example above). A row is also moved out of the current tier only when a newer version supersedes it. Triplex writes a new version of a row only to retract it: the adapter re-inserts the same `_id` with `_valid_from` fixed at 1970 so the new version replaces the whole native valid lifetime `[S packages/xtdb/src/XtdbStorageAdapter.ts:31-40, 529-545]`. So **XTDB's current tier holds every fact row ever asserted, retracted or not**, and the native split removes only the pre-retraction copies (one per retraction). Native valid time is never used by Triplex (rows are valid 1970 to infinity), so the finite-`valid_to` trap does not bite; Triplex's own `valid_to` lives in a column and the read filters it.

### 1.2 Lifecycle of a row and what it costs

```
 pgwire tx (INSERT/UPDATE/DELETE)
      |
      v
 LIVE INDEX  (memory; pages <= 1,024 rows, log <= 64; recency = MAX)
      |  block flush at 102,400 rows or 15 min  [S IndexerConfig.kt:13-16; MemoryHashTrie.kt:9-10]
      v
 L0 file  (raw events in live order, no blooms, recency = MAX)
      |  compactor, one job per L0 block: resolve events, compute recency per row
      +--------------------------------+------------------------------------+
      v                                v
 L1C  recency = MAX                L1H  weekly files, recency = Monday after supersession
 levelled: rewritten until         tiered: 4 files -> L2H (per recency partition), then L3H+
 100 MiB, then 4 files             pruned for "now" queries once the week has passed
 -> L2C split by IID prefix
```

| Stage | What happens to a row | Cost per row | Source |
|---|---|---|---|
| Write | appended to the in-memory table and a hash-trie leaf keyed by IID (UUID `_id` = its 16 bytes; string or integer `_id` = first 16 bytes of SHA-256) | memory; flush every 102,400 rows or 15 min | `[S]` above; `[P R7 Q2]` |
| L0 | written once, no blooms until compaction | about 125 B data plus about 60 B metadata for an 8-column row | `[P R7 Q1, Q6]` |
| L0 to L1 | bitemporal resolution plus recency routing | one `PolygonCalculator` step per event; about 150k rows/s per compactor thread | `[S compactor/SegmentMerge.kt:173-182]`, `[P R7 Q6]` |
| L1C | rewritten cumulatively until full (15.6, 31, 47, ... 110 MB chains) | about 6x disk before GC, about 2.4x live data after GC; L0 files are never collected | `[P R7 Q6]`, `[S trie_catalog.clj:115]` |
| L2C+ and L2H+ | merged four at a time, one rewrite per level | one rewrite per level | `[S compaction.allium:74-95]` |
| Read | pages (at most 1,024 rows) loaded for every file and path the query cannot rule out | `rowsRead` counts rows loaded before resolution | `[S ScanCursor.kt:67-69; operator/scan/ScanMetrics.kt:13-25]` |

### 1.3 How a read resolves

1. **Temporal bounds.** A scan with no `for-valid-time` gets `[:at [:now]]` `[S core/src/main/clojure/xtdb/operator/scan.clj:351-354]`; `at t` is the one-chronon range `[t, t+1)` `[S core/src/main/kotlin/xtdb/util/TemporalBounds.kt:23-26]`. The system-time upper bound is clamped to the snapshot token and, with no `FOR SYSTEM_TIME`, the lower bound is set to the snapshot's system time (`scan.clj:111-118`), so the default is a point in both dimensions.
2. **Whole files.** `current-tries` takes every live trie of the table; `filter-tries` drops a file whose recency is not after `min(valid lower, system lower)` and whose temporal metadata cannot intersect `[S trie_catalog.clj:283-285, 354-374; trie.clj:113-118]`.
3. **Paths and pages.** `MergePlanner` descends the hash tries; `_id = x`, `_id IN (...)` and `= ANY` become an IID set that prunes subtrees `[S scan.clj:133-203; segment/MergePlanner.kt:61-84; R7 Q2]`. A page that cannot match is still read if it sits at the same path as a matching page and may hold a newer version (`trie.clj:143-167`).
4. **Resolution.** When both dimensions are points the cursor uses `AsOfResolver`, which walks one entity's events newest first and stops at the first event covering the point; any other bounds use `PolygonResolver`, which builds a polygon for every event `[S operator/scan/ScanCursor.kt:38-41; EntityResolver.kt:24-112; EntityMerge.kt:18-60]`. For Triplex a row `_id` has at most two events (assert, retract), so the resolver is not the cost; page loading is.

### 1.4 Is there a structure with history-independent reads, and which query shape hits it

Yes, with conditions. The structure is L1C/L2C+ plus recency pruning of L1H+. The query shape is **`_id` equality, `IN` or `= ANY` under the default (or any point) valid and system time**.

| Condition | Read cost independent of history depth? | Why | Source |
|---|---|---|---|
| `_id` lookups, default time, history older than the current week and compacted | **Yes**: cost is files touched times one page of at most 1,024 rows | recency prunes old L1H files and pages; IID path prunes subtrees | `[S]` 1.3; `[P R16 4.2]` 3.95, 3.81, 5.34 ms p50 at depth 1, 3, 10 |
| Same, history written this week | No: the current week's L1H file is read, because its recency boundary is in the future | page recency `>` query lower bound | `[S OutWriter.kt:60-64; trie.clj:113-118]`; `[P R7 Q5]` 29 files and 14,956 rows read for one current `_id` when 10 versions were seconds old |
| Data still in the live index or L0 | No: recency `MAX`, no blooms | 1.1 item 3 | `[S]` |
| `FOR ALL VALID_TIME`, `FOR ALL SYSTEM_TIME`, open-ended ranges (a bounded range prunes only below its lower bound) | No: `min(valid lower, system lower)` becomes the minimum long, so no file or page is dropped, and `PolygonResolver` runs | `trie.clj:114-115`; `ScanCursor.kt:38-41` | `[S]` |
| Non-`_id` predicates (`scope_key`, `entity_id`, `id`) | No: blooms prune strings only after compaction, at about 4 to 7 microseconds per page, so cost grows with table size (3M rows: 25 to 29 ms; uncompacted 0.87 to 0.97 s) | metadata evaluated per page | `[P R7 Q1]`; `[P P2X]` A0 `scope_key` scan 39 ms versus 3 ms by `_id` |
| Table-wide forms | No: linear in retained versions (500k ids times 10 versions, `COUNT(*)` current 4.8 s) | | `[P R7 Q5]` |

### 1.5 `FOR VALID_TIME AS OF NOW` versus the default

**They cost the same.** The default is `[:at [:now]]` (`scan.clj:351-354`) and the explicit clause ends as `TemporalDimension.at(t)` with the same bounds, so the same resolver (`ScanCursor.kt:38-41`) and the same pruning apply. The only difference is how `t` is obtained: the default and `:now` read the query clock directly, while a SQL expression goes through the `:expr` branch, which evaluates a one-row projection when the scan opens (`scan.clj:70-90`). I expect that to cost microseconds [E]; R7 has no A/B. **Both differ greatly from `FOR ALL VALID_TIME`** (table above).

### 1.6 What the Triplex XTDB adapter does today

- Every read the adapter issues says `FOR ALL VALID_TIME`: facts (`XtdbStorageAdapter.ts:163`), the position row (`:95`), claims (`:508`), receipts (`:306`), dependency state (`:598`, `:606`). Recency pruning is therefore off for all of them, and the `tx_meta` row, rewritten at every commit, accumulates one superseded version per commit; because nothing is pruned, every position read also loads the pages that hold those versions in every file. That is consistent with P2X's finding that A0's `scope_key` reads grow with history `[P P2X]`.
- Facts are found by `entity_id`, `id`, `attribute` or `entity_type` columns (`:126-145`), never by `_id`. `_id` is `JSON.stringify([scopeKey, id])` (`:222`), a hashed string that scatters one entity's facts across pages.
- A pull is breadth-first over refs, one `Triples.entities(frontier)` call per hop (`lab/bench/lib/composition.ts:111-135`), so a 3 to 6 hop pull is 3 to 6 bloom-pruned scans.
- **Prediction for the lab's own P4 test [E]:** in `lab/bench`, history grows over minutes, so every superseded copy is in the current-week bucket and recency pruning cannot help even after the `FOR ALL VALID_TIME` fix. The fix pays only after history ages past a Monday boundary. An aged-history arm (section 6) would seed past system times in increasing order on a fresh database; 2.2.0 rejects a time at or below the latest completed transaction of the whole database (`TxResolver.kt:219-243` per R23 4.3), and passing an explicit `SYSTEM_TIME` over pgwire from the Node driver is an open probe in R23 section 8, so the arm is unverified `[E]`.

---

## 2. QLever: three ways to hold current values

### 2.1 Facts that bound the options

- **Row encoding.** A 10-fact command writes 24 rows (10 facts plus 14 journal rows) at about 27 triples per row, 653 triples (`lab/verify/P2Q/VERIFY.md`, row 8). J01's compact encoding writes 449 triples, 180 of them data rows, 18 per fact (`/Users/sam/Claude/Projects/triplex-db-2/EXP-J01/qlever-attribution-compact.out`, J01 not yet reported). Scaled to the mean 13.7-fact command, steady load is about 0.9 to 1.0k triples/s (3.3 to 3.6M per hour) and the 50x burst about 46k triples/s (2.8M per 60 s burst) `[E]`.
- **Delta cost.** Update time is about 6 ms plus 0.23 ms per 1,000 delta triples to 500k, 0.29 at 1M `[P R17 2.2]`; delta memory is 0.75 to 1.3 GB per million triples and is not covered by `-m`; rebuild at 750k to 1M triples, backpressure at 2M `[P R8 verdict 6]`. At the rates above that is 2.5 to 4.6 GB of delta per steady hour, so merges happen several times an hour and after every burst.
- **Every update empties the result cache** `[S R17 0.2 item 2: Server.cpp:1303-1309]`; a rebuild of 69M triples took 54 s and moved read p50 from 108 ms to 1.4 s under load; a rebuild of a 9.46M-triple current-only index took 5.2 s idle `[P R17 1.4]`.
- **Pull cost.** Direct subject scan in a current graph 1.9 ms; a `VALUES` join round 3.4 to 6.5 ms plus 0.4 to 0.5 ms per entity, with about 1,100 minor page faults per round; full pull 23 to 33 ms p50, 35 to 45 pulls/s per core; flat from 7M to 74M total triples and unchanged when 59.5M ledger triples were added to the same index `[P R17 4.2 to 4.4]`. A one-scan bundle (one literal row per fact under the root) reads in 1.2 ms p50, 770 to 870 pulls/s per core `[P R17 4.5]`.
- **Reconciling with R18.** R18 2.2 predicted that two graphs in one index are "not physically separated" because they share a delta and block metadata. R17 measured the current-graph pull as flat across ledger sizes up to 74M triples, so within the tested range the prediction did not show up. The shared delta, cache wipe and rebuild do hit both graphs, as R18 said.

### 2.2 Comparison

| | (a) Second graph in the same index, written by the replica applier in the same guarded update | (b) Current structure held by the broker (Q50a; R23 5.4 `recent_rows` with retention H) | (c) Kernel computes current from history |
|---|---|---|---|
| What it is | Compact row triples for live facts, for example `<E> <row> "json"`, inserted and deleted in the same `DELETE/INSERT ... WHERE {marker guard}` as the history triples (`packages/qlever/src/broker/sparql.ts:50-107` on `exp/P2Q`) | SQLite table written in the same transaction as the log frame; indexed by entity | Read every row of the entity (live and retracted) and apply `visibleAt(B)` in the kernel, as P2Q and R17 1.5 do |
| Write cost per 10-fact command | +10 to +12 inserts, +0 to 2 deletes, about +2% of 653 triples; about 2.5 KB of literal text | about 10 row upserts inside a transaction that already costs 3.2 ms p50 `[P R23 3]` | none |
| Effect of delta growth | Unchanged: same update cost (6 + 0.23 ms per 1,000 delta triples), same cache wipe, same snapshot copy, same rebuild stalls, driven by the 653 history triples | None: no delta | Same as (a) for the history rows it reads |
| Read cost | 14 to 25 ms for a 4-hop pull (per-round 3.4 to 6.5 ms) `[E from R17]`; 1.2 ms only with bundle rows | in-process index lookups, predicted under 2 ms (section 6) `[E]` | grows with rows per entity (retractions multiply rows); 198 ms p50 for past-pinned pulls with 8-entity `UNION` chunks `[P R17 1.5]` |
| Exactness | `H <= B <= marker`, marker read in the same request (P2Q already does this) | `H <= B <= W`, W read in the same transaction | exact for any B the history path holds |
| Moving parts added | none beyond more terms in the existing update | one table in the SQLite file Q58c already plans | none |
| Role | secondary: list and native queries, lane completeness, fallback when the broker store is behind | **primary for P4 and P5** | exact fallback and oracle for eligibility tests |

A **separate, current-only QLever index** (R17 option B, R18 X2 arm e) is the fourth choice. Its delta is about 2% of the history index's, so with a 100k-triple threshold it rebuilds every 7,000 to 10,000 commands (hours when steady, minutes in a burst) in 5 to 7 s `[E from R17 1.4, 2.2]`. It costs a process (about 150 MB at 9.5M triples, scaled from the 1.1 GB reported for 69M `[E from R17 5.4]`), a second applier and marker, and a generation swap. Build it only if (a) misses the GS.18 list-query bars.

### 2.3 Verdict

Use (b) for P4 and P5 on both lanes. Add (a) as a cheap secondary because it costs about 2% of the triples and keeps raw SPARQL over current data possible. Keep (c) as the fallback and as the oracle the other two are checked against. QLever's own P4 ceiling without a bundle is 23 to 33 ms p50; that is a property of the engine's join round, not of history.

---

## 3. Prior art for separating current from history

The prior-art agent's tables are condensed here; its full draft is `/Users/sam/Claude/Projects/triplex-db-2/R24/prior-art-current/R24-report-draft.md`.

| System | Physical split | Write path | How a read is tied to a basis | Source |
|---|---|---|---|---|
| **Datomic** | Layout time: each index has a persisted current part, a persisted history part and an in-memory part; `history` merges all three; `:db/noHistory` stops copying superseded values into history | Asynchronous background indexing; transaction is one log append plus a memory-index insert | Every db value has a basis-t; the memory index is part of the value, so lag cannot make it wrong; `as-of` merges all parts and filters; `noHistory` attributes are not exact under `as-of` | `[W]` docs.datomic.com filters, indexes, schema-reference; `[W, unofficial]` tonsky.me internals guide |
| **XTDB 1.x** | None: one KV store; the bitemporal key puts the newest version first (entity, reversed valid time, descending tx-id) | Indexer writes both bitemporal keys and content keys in one KV transaction | `entity-as-of` is one seek when the newest version satisfies the tx bound, otherwise steps forward or searches a z-curve; throws if the tx is not indexed; value joins scan every `(a, v, e)` ever written | `[S]` `index_store.clj:230-327, 819-870, 885` @ 1.24.4 |
| **Kafka Streams** | KTable store holds latest per key; history lives only in the topic. **Versioned store (KIP-889):** a latest-value segment plus segments of older versions grouped by validTo, in one RocksDB | A put also updates the store's Position; an in-order versioned put costs 2 reads and 2 writes | IQv2 `PositionBound.at(P)` is a lower bound and fails typed `NOT_UP_TO_BOUND`; **versioned `get(key, asOf)` returns the latest value whenever its validFrom is at or before asOf and searches history only otherwise; the latest version never expires** | `[S]` `StoreQueryUtils.java:115-190`, `RocksDBVersionedStore.java:183-269` @ 4.1.0; spot-checked |
| **CQRS read models (Azure), Marten, EventStoreDB, Axon** | Separate disposable read model | Marten inline: same unit of work; Marten async, Axon, EventStoreDB: checkpoint stored with the read model; Azure recommends outbox plus idempotent consumer | Eventually consistent; Marten `FetchLatest` folds the unapplied tail onto the stored snapshot, `QueryForNonStaleData` waits, time travel folds the event stream; rebuild by blue/green tables | `[W]` martendb.io projections and read-aggregates; learn.microsoft.com CQRS, materialized view |
| **Materialize** | Arrangement keeps only the latest version unless `RETAIN HISTORY` | Asynchronous dataflow | Query timestamp must satisfy `since <= ts < upper`; waits for `upper`; below `since` it errors with no fallback | `[S]` `timestamp_selection.rs:251-310, 438-456` @ 57ee317 |
| **ReadySet** | Cached query results separate from upstream | Asynchronous replication | No token; routes to upstream for read-your-writes; cannot serve a pinned basis | `[W]` readyset.io read-your-writes |
| **SQL Server, Db2, MariaDB, Oracle FDA, `temporal_tables`, Snowflake, BigQuery** | Current table plus history table (or retained versions); split on system time, application time stays on the row | Same statement (trigger or engine), except Oracle FDA, which archives from undo in a background process | As-of queries union current and history; Snowflake and BigQuery fail outside the retention window | `[W]` vendor docs; `[P R18 2.2]` |

**Findings for Triplex.**

1. **Split on record time only.** Every bitemporal design here splits on system or log time and keeps business time as data. Triplex facts carry `valid_from` and `valid_to` as columns, so the split key is the retraction position, not valid time. This avoids XTDB 2's trap where a finite `valid_to` moves a live fact to the historical tier `[E]`.
2. **Two consistency rules appear, and they are interchangeable.** (i) A **retention horizon**, as in Materialize's `since` and Snowflake's window: the structure holds everything visible at any basis at or above H, so the test is the O(1) `H <= B`. (ii) A **per-key validity interval**, as in Kafka's versioned store: the entry is exact for every basis from its last change onward. TARGETS 4.1 item 4 already states rule (ii) for a current-only index (B at or after the last change to every attribute touched). Rule (i) needs a purge job but no per-entity state; rule (ii) needs per-entity `lastChanged` on every read.
3. **A lagging structure is exact only by waiting, failing, or folding the tail.** Datomic and Marten `FetchLatest` fold; Materialize and Marten `QueryForNonStaleData` wait; Kafka fails typed. TARGETS 4.1 items 5 and 6 (wait at most 10 ms, then fall back) match the wait-then-fail family. Folding that subject's log tail from W to B is the only exact option that adds no wait, and the broker already holds the tail in its overlay.
4. **Watermarks must be contiguous.** Marten's high-water mark stops at holes; Triplex's dense positions and Q31c's resolved prefix already guarantee this.
5. **Rebuild as a new generation** with its own W (Kafka restore from checkpoint plus changelog headers; Marten blue/green). Readers switch when the new W reaches their basis.
6. **Correction to R18 2.2.** R18 says a Datomic current read passes over retracted pairs. Datomic's filters page says the present database pays no penalty for history `[W]`, and the unofficial internals guide describes separate persisted current and history parts `[W, unofficial]`. Confidence Medium because the official docs never describe the storage layout; the effect on the design is nil.

---

## 4. Triplex code today and the smallest change per lane

### 4.1 Where current values are read

| # | Site | What it does | Source |
|---|---|---|---|
| 1 | `StorageAdapterService.getByEntity`, `getByEntities`, `query`, `getById`, `history` | the adapter contract; every current read is one of these with a `ResolvedTemporalBasis` | `packages/core/src/storage/StorageAdapter.ts:73-86` |
| 2 | `Triples.entity`, `entities`, `match`, `entityPage` | resolve the basis, call the adapter, convert rows; `entityPage` reads all rows of an entity type, then `getByEntities` for one page | `packages/core/src/store/TriplesLive.ts:32-44, 46-80, 82-87` |
| 3 | Precondition checks inside `transact` | `adapter.getByEntity(entityId)` with no basis, compared with expected triple ids; this is a current read on the write path | `TriplesLive.ts:331` |
| 4 | Derivation readers | `byEntityType`, `byEntities` for reconciliation | `TriplesLive.ts:362-372` |
| 5 | `Repository.get`, `getMany`, `find` | typed interface only; every behavior is deferred to EXP-R02 | `packages/core/src/entity/Repository.ts:93-134` |
| 6 | N01 `public` composition `pull` and `sweepPull` | breadth-first, one `T.entities(frontier)` per hop; `sweepPull` is the same function | `lab/bench/lib/composition.ts:111-135, 148` |
| 7 | Datalog and maintained queries | executors and `MaintainedQueries` (complete-generation rebuild) | `packages/xtdb/src/XtdbQueryExecutor.ts`, `MaintainedQueries.ts`; `packages/qlever/src/QleverQueryExecutor.ts` |

**What each adapter does for "current".** Neither has a current structure. XTDB reads `tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND ...` with `recorded_position <= ?`, `retracted_at IS NULL OR retracted_position > ?`, `valid_from <= ?`, `valid_to IS NULL OR valid_to > ?` as SQL conditions (`XtdbStorageAdapter.ts:42-70, 111-186`). QLever reads `SELECT ?row WHERE { GRAPH g { ... } }` with the same predicates as SPARQL `FILTER`s and `OPTIONAL` retraction patterns (`QleverStorageAdapter.ts:130-225`; `getByEntity` at `:476`). Both therefore read retracted rows too, and a pinned read at any B uses the same code path as a current read. Cost grows with rows per entity, which grows with corrections.

### 4.2 Smallest change per lane

**XTDB (A0 adapter, P2X path and the P2B replica applier).**

1. `initialize` (`XtdbStorageAdapter.ts:622-652`): create `tx_current` with the same columns, `_id` = a UUID whose high 64 bits are a hash of `entity_id`, so one entity's rows share a trie prefix (UUID `_id` is used as its 16 raw bytes; a shared prefix cut a 1,000-key `IN` from 330 ms to 5 to 13 ms `[P R7 Q2]`); or, for the pull path, `_id` = the entity id with one document row per entity (R16's recommended shape, 3.95 to 5.3 ms `[P R16 4.2]`).
2. `persist` (`:188-262`): next to each `insertStatement("tx_assertions", ...)` add the same insert into `tx_current`. It is the same statement list, so it is the same XTDB transaction as the CAS `ASSERT`, the claim and the position row. For P2B, add the statement to the applier transaction between `ASSERT` on the marker and the marker `INSERT` (R23 4.1).
3. `queryRows` (`:111-186`): read `tx_current` when `H <= B <= W`, using the default temporal bounds (drop `FOR ALL VALID_TIME`). Rows retired at or below H are removed by a background parameterised `DELETE`, which turns them into historical versions that recency prunes after a week. A side table `tx_retired`, keyed by an order-preserving UUID of the retraction position, lists the ids to purge, because a predicate on `retracted_position` would scan (R7 Q1).
4. A `tx_meta` row (or a `cur_meta` row in the same transaction) records H. The marker row is W for the replica.

**QLever (A0 adapter and the P2Q broker).**

1. `buildPublication` (`sparql.ts:50-107`): it already computes, per row id, `fields(base)` and `fields(final)` and deletes and inserts the difference. Add a second pair for a compact current row (`<entityIri> <cur:row> "compact json"`) in a second graph `<urn:triplex:scope:S:cur>`: insert when the row is new or changed, delete when it was retired at or below H. The marker guard `WHERE { marker = M }` covers both graphs because it is one update.
2. `queryRows` / broker pulls: read the `cur` graph when `H <= B <= marker`, with the marker triple returned in the same request (`markerQuery`, `sparql.ts:124-126`).
3. For the sub-5 ms target, add bundle rows (R17 4.5) for the subject's own reach only; leave shared entities (accounts, releases, requirements) to the runtime cache, because bundle write amplification equals fan-in (about 200 for a branch, 2,000 for an org `[P R17 4.5]`).

**Broker (both lanes), the primary.** Add `current_rows(entity, row_id, lsn, row)` plus `retired_rows(retired_lsn, row_id)` to the SQLite file Q58c plans, written in the commit transaction (R23 3 measured 3.22 ms p50 for frame, 10 upserts, head and operation). The broker needs this data anyway for delete terms (R17 2.5), retraction targets (`retract` reads `queryRows` by `id`, `XtdbStorageAdapter.ts:529-545`) and preconditions (site 3 above). Set H = min(replica markers, consumer checkpoints, oldest pinned sweep basis) minus a retention window (default one hour, the span of Q16's 15% bucket); purge in batches off the commit path.

### 4.3 The eligibility rule

```
 serve a read at B from the current structure iff   H <= B <= W        (1)
   H = retention horizon: the structure holds every row that is visible at some basis >= H
       (live rows, plus rows retracted at positions > H)
   W = applied watermark, read in the SAME transaction/request as the rows
 else wait up to 10 ms for W (TARGETS 4.1 item 5), then fall back:
   B < H            -> history path (replica with marker >= B, kernel-side filter)
   B > W            -> broker overlay / log tail, then replica
 valid time is NOT part of eligibility: valid_from/valid_to stay on the row and the read filters them
```

- Rule (1) is the horizon rule of finding 2 above. It satisfies TARGETS 4.1 item 4 because the structure can reconstruct every B in `[H, W]`.
- Facts whose `valid_to` has passed stay as rows until a time-driven pass retires them below a valid-time horizon (the boundary timers of R18 3.4 item 3). That is the one growth path that is not history depth `[E]`; EXP-P4 measures it.
- Erasure: a current structure is a copy of PII (TARGETS 7 item 3). The broker store must hold values under the per-subject key Q58e plans, or be rebuilt after erasure.

---

## 5. P5: re-evaluating 100k subjects without hurting live traffic

The sweep agent's full draft is not saved as a file; its fetched sources are under `/Users/sam/Claude/Projects/triplex-db-2/R24/prior-art-sweep/raw/` and the tables below carry its findings.

### 5.1 Mechanisms from mature systems

**(1) A dedicated replica for batch reads** `[W]`

| System | What a long batch read costs the primary | Cost on the replica | Lag bound |
|---|---|---|---|
| PostgreSQL hot standby | none without feedback; with `hot_standby_feedback` vacuum keeps rows the standby needs | replay waits on conflicts, then the standby cancels the query | `max_standby_streaming_delay`, default 30 s, a total apply-delay budget |
| Aurora PostgreSQL | not stated | replay delayed up to the setting, then query cancelled (14 s in the vendor test) | setting capped at 30 s |
| Aurora MySQL | replicas run REPEATABLE READ, so long queries delay purge cluster-wide | purge burst afterwards | per-session READ COMMITTED |
| TiFlash, TiDB follower read | none (asynchronous learner; one ReadIndex RPC per follower read) | each read waits for apply up to the read timestamp | none; consistency by waiting |
| CockroachDB follower reads | none | exact-staleness reads can block behind a long write intent | closed timestamps; reads at least about 4.2 s old |
| Spanner Data Boost | documented as near-zero | separate compute | first plan operator must be a distributed union |

Triplex borrows the pattern only where retention is time-bounded or reader-held by Triplex itself: XTDB's `garbageLifetime` (24 h) and the horizon H both qualify, so a sweep replica costs the primary nothing `[E]`.

**(2) Snapshot-at-basis scans** `[W]`

| System | Pin | Retention | Past the window |
|---|---|---|---|
| PostgreSQL `pg_export_snapshot` / `pg_dump -j` | exported snapshot valid while the exporting transaction lives | tied to the reader | nothing expires; vacuum horizon held; `old_snapshot_threshold` removed in PG 17 `[WS]` |
| CockroachDB `AS OF SYSTEM TIME` | any fixed timestamp; jobs use protected timestamps | `gc.ttlseconds` | read fails below the GC threshold |
| MongoDB `atClusterTime` | cluster time | `minSnapshotHistoryWindowInSeconds`, 300 s | `SnapshotTooOld` |
| Flink | checkpoint barriers; recovery rewinds sources | source retention | recovery impossible once the offset is gone |
| Kafka consumer | committed offset | topic retention | `auto.offset.reset` defaults to `latest`, which skips lost data silently `[WS]` |

Triplex borrows: put a deadline well inside the shortest retention (XTDB 24 h; H window), fail closed with a typed error when it is passed, and record the pin as an operator-visible object (CockroachDB protected timestamps).

**(3) Chunking and admission control tied to live latency** `[W]`/`[S]`

| Tool | Signal | Action | Published constants |
|---|---|---|---|
| freno (GitHub) | replica lag | `HEAD /check`, 200 or 429 | lag threshold 1.0 s (one cluster 0.8 s); chunks of 50 to 100 rows; lag cached 20 ms |
| gh-ost | heartbeat lag, status variables, HTTP check | stop copying | heartbeat 100 ms; `max-lag-millis` 300 to 500; chunk 1,000 |
| pt-online-schema-change | replica lag, `Threads_running` | sleep after each chunk | `chunk-time` 0.5 s with EWMA of rows/s; `max-lag` 1 s; `max-load` Threads_running=25 |
| Vitess tablet throttler | shard max lag, threads_running, loadavg | go/no-go per app | lag threshold 5 s |
| Netflix AIMD | drop or timeout | +1 when inflight*2 >= limit; times 0.9 on drop | min 20, max 200 |
| Netflix Gradient2 | short RTT versus long-RTT EWMA | limit = limit x clamp(0.5, 1, 1.5 x long/short) + 4, smoothed 0.2 | `rttTolerance` default 1.5 |
| SEDA (USITS 2003) | p90 response time versus target | token-bucket rate: divide by 1.2 on breach, add 2 scaled by error | decision every 100 requests or 1 s; lower classes cut 10x first |
| Envoy adaptive concurrency | p90 of 100 ms windows versus minRTT | limit = (minRTT + buffer) / sample x limit + sqrt(limit) | update 0.1 s; minRTT refresh 60 s |
| folly CoDel | minimum queue delay over an interval | drop requests waiting longer than 2x target | interval 100 ms, target 5 ms |
| Google SRE | client accept ratio | reject locally once requests > K x accepts | window 2 min, K = 2; batch is `SHEDDABLE_PLUS` |
| CockroachDB, TiDB | scheduler runnable count; foreground CPU and I/O | elastic work gets the leftover budget | TiDB background `UTILIZATION_LIMIT` 0 to 100; under 5% overhead |

Which signal fits a 1.5x bar `[E]`: live-lane **queue delay** (minimum over 100 ms, CoDel style) leads p99 and has a sample per live request; live **p99 ratio** over at least 1,000 samples is the bar itself but lags, so it is a guard and a stop condition; writer commit p99 ratio is a second guard; replica lag helps only if live readers share the sweep's replica; CPU is too indirect because engine CPU sits inside the VM.

**(4) Priority queues and lanes in front of a FIFO engine** `[W]`

- Strict priority starves the low class while the high class stays busy (CockroachDB WorkQueue, TiDB, SRE, SEDA multi-class). Weighted shares (ScyllaDB, cgroup v2 `cpu.weight`, CockroachDB resource groups, Kubernetes API Priority and Fairness) give only an approximate split. Ceph reports that with maximum limits on both client and recovery neither class was predictable, and small-object throughput fell by up to 79% during OSD failures. Stripe reserves 20% of the fleet for critical calls; Netflix partitions 0.9 live and 0.1 batch.
- **A FIFO engine protected from the front**: Vitess vttablet keeps separate pools in front of MySQL (conn-pool 16, stream pool 200, transaction pool 20), and background apps also check the throttler; PgBouncer and kube-apiserver Priority and Fairness do the same. This is the QLever case (FIFO pool, no priorities `[S R18 cross-cutting 4]`), so the lane lives in the broker.

**(5) A CPU-bound kernel on its own core** `[W]`

- Node `worker_threads`: an `ArrayBuffer` in the transfer list moves without a copy; buffers from the internal pool (`Buffer.from`, `allocUnsafe` below `poolSize >>> 1`, 4 KiB on Node 22, 32 KiB on current Node) are always cloned, and the clone copies the whole pool; use `Buffer.allocUnsafeSlow` or a fetch `arrayBuffer()`. Structured clone of object graphs matters above about 100 KiB (Surma, browser, 2019). Bun's blog reports Node 24.6.0 postMessage of a flat string at 806 ns (11 chars), 1,220 ns (14 KB) and 242 microseconds (3 MB), machine not stated; that implies about 4 microseconds at 50 KB and 24 at 300 KB `[E]`. No local benchmark was run.
- LMAX Disruptor reports 52 ns per hop in a 3-stage pipeline against 32,757 ns for a blocking queue (i7-2720QM); the single-writer principle reports 300 ms versus 10,000 ms (uncontended lock) for 500M increments. SEDA uses bounded stage queues so a full queue pushes back on the upstream stage. Seastar is one thread per core with explicit message passing.

### 5.2 Recommended P5 design

```
   live readers (UI, reconcile pulls)                 activation / midnight expiry
        |                                                       |
        v                                                       v
  +---------------+  queue delay, p99 ratio       +---------------------------------+
  | LIVE LANE     |------------------------------>| SWEEP LANE (broker main thread) |
  | (priority)    |   AIMD in-flight pages        |  pin = hold H <= P_sweep        |
  +-------+-------+                               |  cursor (P_sweep, last subject) |
          |                                       |  page = 64 subjects             |
          v                                       +----------------+----------------+
   engine replicas (XTDB, QLever)                                  | page descriptors
   untouched by the sweep in the                                   v
   host-store design                          +----------------------------------------+
                                              | SWEEP WORKER(S), worker_threads        |
                                              |  read-only SQLite connection (WAL)     |
                                              |  rows -> typed facts (shared account   |
                                              |   bundles from a per-account cache)    |
                                              |  W0 kernel sweepSubject()  ~158 us     |
                                              |  -> small result records               |
                                              +----------------+-----------------------+
                                                               | transfer ArrayBuffer
                                                               v
                              broker main thread: outbox frames of 64 records, below live commits
```

1. **Pin by retention, not by holding a transaction.** Hold H at or below P_sweep for the sweep. Every worker filters by the explicit B = P_sweep, so workers can start at different instants and still agree. Rows retracted during the sweep stay in the store; at the fixed trace's 1.1 commands/s that is about 110 commands in 100 s, tens of rows `[E]`. The XTDB and QLever replicas pin the same way: XTDB by `SNAPSHOT_TOKEN` plus `garbageLifetime` `[P R16 5.1]`, QLever by one streamed request, which stayed pinned through 677 updates and a rebuild swap `[P R17 5.1]`.
2. **Cursor and page.** Persist `(P_sweep, last subject key)` after each page of 64 subjects (a 64-subject page of the kernel costs about 10 ms of event-loop time if run inline, which is why the kernel runs in a worker `[E]`). A crash resumes with no repeats and no gaps; a burst pauses the sweep.
3. **Admission.** Interval 100 ms. Increase in-flight pages by 1 when live queue delay is under 0.5 x target and the p99 ratio is under 1.25; multiply by 0.8 when queue delay exceeds the target (0.25 x the no-sweep live p99); halve and hold 1 s when the p99 ratio passes 1.4; drop to zero when either live p99 or commit p99 ratio exceeds 1.5 on two consecutive windows, then resume from one. These constants are starting values `[E]`, lineage SEDA, Netflix AIMD and Envoy.
4. **Workers.** One worker per sweep core, each with its own read-only SQLite connection, reads, decodes and evaluates a range of subjects and returns only the result record (1 to 3 KB), so no fact crosses a thread boundary. This requires WAL in normal locking mode: SQLite's `EXCLUSIVE` mode set before the first WAL access creates no shared-memory index and rejects every other connection `[W R23/raw/sqlite/wal.html section 8]`, so R23's `locking_mode=EXCLUSIVE` recommendation conflicts with parallel readers. Use the external `flock` for the single-writer rule instead, or let one owner thread do the reads and transfer buffers.
5. **Publication** goes through the host outbox in frames of 64 records, gated on the commit p99 guard and below live commit groups. On the QLever lane do not apply 100k work items to the index as 100k commands: R17 measured 112 commands/s through the applier at 64 clients (about 890 s for 100k) and the items would add roughly 2.5M delta triples, above R8's 2M backpressure ceiling `[E]`. Keep sweep outputs in the host outbox and apply them to a replica lazily.
6. **Kernel inputs are typed.** The wire path costs 508 µs per subject, 3.2x the typed path `[P D01b]`. Shared account bundles (requirements, release, policy) change rarely and are the same for about 500 subjects at the 100k rung (`lab/bench/lib/world.ts`), so validate them once per account; that would cut the kernel's 80% validation share for the shared part, a kernel change that D01b's author would have to make `[E]`.

### 5.3 What a sweep costs, by input

| Quantity | Value | Source |
|---|---|---|
| Kernel, typed facts | 158 µs mean per subject per release, p50 85 µs, p99 1.04 ms; 15.8 s of one core for 100k; index/validation 80% | `[P D01b]` |
| Kernel from JSON bytes | 508 µs mean (3.2x), about 51 s of one core | `[P D01b]` |
| Own facts per subject at the N01 100k rung | 28, 40 or 50 by hop class; about 3.9M facts in total (0.4 x 28 + 0.35 x 40 + 0.25 x 50 = 37.7 per subject, plus about 90k shared facts in 200 accounts) | `lab/bench/lib/world.ts`, `[E]` |
| XTDB engine-fed, per-subject documents, 50 ids per `_id IN` | 1,321 subjects/s on 1 connection, 2,412/s on 4 connections alone, 1,100/s with live traffic on the same 2-CPU node | `[P R16 5.2]` |
| QLever engine-fed, batched `VALUES` | 815 to 825 pulls/s per server core, 100k in 120 to 134 s of one core | `[P R17 5.2]` |
| QLever engine-fed, one streamed request | 9.46M rows (716 MB TSV) in 32.9 s, 287k rows/s | `[P R17 5.2]` |
| Host store, SQLite read plus decode | about 4M rows at 0.3 to 1M rows/s per core | `[E]`; better-sqlite3 iterate plus `JSON.parse` of about 250 B |
| Outbox frame | fsync 2.84 ms plus encode; 100k records in 1,563 frames of 64 | `[P P2Q ACK path]`, `[E]` |

### 5.4 Estimates for a 100k sweep with the recommended design

| Lane and design | Read | Kernel | Publish | Wall, capture to last publish | Live impact |
|---|---|---|---|---|---|
| **Host store, both lanes** (recommended) | 8 to 12 s of worker CPU for about 4M rows | 16 s (typed); 5 to 8 s with shared validation cached | 6 to 10 s of broker time | **25 to 35 s**, bound by the kernel; about 1.5 cores for about 25 s | no engine work at all; risk is the broker main thread (event-loop delay) and host CPU |
| XTDB, dedicated replica, per-subject documents | 41 s (4 connections, alone) to 91 s (R16 under live traffic); per-entity documents (5 to 10 per subject) would be about 2 to 4x slower `[E]` | 16 s overlapped | overlapped | **45 to 95 s** with per-subject documents; over 100 s with per-entity documents | R16 saw live pull p99 1.39x and p50 1.57x with the sweep on the same node; a separate replica removes the shared JVM but not the shared VM CPUs |
| QLever, read-only sweep replica, streamed export of the compact current graph | about 3.9M rows at 287k rows/s is 14 s; with 250 B JSON rows (about 1 GB) at the observed 21.8 MB/s about 45 s `[E]` | 16 s overlapped | overlapped | **25 to 55 s** | none on the live replica; the replica needs its own 1 to 1.9 GiB |
| QLever, batched `VALUES`, one core | 120 to 134 s | overlapped | overlapped | **120 to 134 s, misses the bar** | R17 saw live p99 1.7x to 3x when the sweep shared the process |

TARGETS bar: wall at most 100 s including publication; live read p99 and writer commit p99 each at most 1.5x. The host-store design leaves the largest margin on both. The XTDB replica design meets the wall bar only with per-subject documents.

---

## 6. Recommended EXP-P4 design (current-value path)

**North star.** P4: single-client pull p50 at most 5 ms and p99 at most 25 ms on the weighted mix, at least 1,100 pulls/s per engine core, p99 and bytes read at history depth 10 at most 1.1x depth 1 (TARGETS 1 and 1.1 P4). Also moves P1 (fewer engine reads) and P2 (the broker's own current reads).

**Arms** (one `Composition` per arm in `lab/bench/lib/composition.ts`; required arms are in bold).

| Arm | Lane | What changes |
|---|---|---|
| **A0** | both | today's `public` composition |
| X1 | XTDB | `FOR ALL VALID_TIME` replaced by the default temporal bounds on `tx_assertions` (`XtdbStorageAdapter.ts:163`), nothing else |
| **X2** | XTDB | `tx_current` entity-document table, `_id` = entity id, written in the same statement list as the history rows; read when `H <= B <= W` |
| **Q1** | QLever | compact `<E> <row>` triples in a `cur` graph inside the same guarded update; read when `H <= B <= marker` |
| Q2 | QLever | Q1 plus bundle rows for the subject's own reach |
| **H1** | both | broker-resident current store (SQLite or an equivalent in-process table behind the same interface) written with the frame; pull in process |
| H2 | both | H1 plus a world-document cache for shared account bundles with the validity interval of R18 6.3 |

H1 does not need the hardened SQLite log to be measured; the read path can run against an in-process table with the same interface first. X2 and Q1 can be built into the A0 adapters' write path (section 4.2) before P2B or the P2Q fixes land.

**Steps.**

1. Freeze the comparison: 10k rung first, then 100k; the matched 1,000-subject sample and the `p4-history` overlay already in `lab/bench/driver.ts:557-596`; weighted mix per TARGETS 1.1 P4 item 1.
2. Wait for compaction before every XTDB measurement (`compactor_jobs_available == 0`, R7 Q6) because L0 data has no blooms and no recency.
3. **Exactness gate first.** For every arm, at least 100,000 sampled pulls at the 80/15/5 basis mix, compared with O-REPLAY at the driver-recorded basis; zero mismatches. Add eligibility tests: B below H, B above W, a 60 s consumer cut (GS.04b), a regression of W. The receipt records the route per read; no read may report the current structure for an ineligible B.
4. Time single-client sequential pulls per bucket (p50 and p99), then closed-loop clients up to the engine CPU quota for pulls/s per core.
5. Grow history to depth 3 and 10 in place and repeat. For XTDB run two regimes: **fresh** (history seconds old) and **aged** (history seeded at past system times in increasing order so superseded versions fall in earlier weeks; the seeder must be the first writer on a fresh database, oldest time first, because 2.2.0 rejects a system time at or below the latest completed transaction, and the explicit `SYSTEM_TIME` option over pgwire still needs the probe listed in R23 section 8; if it fails, wait out a Monday boundary instead).
6. Repeat the best arm per lane at the 100k rung; add the valid-time growth path (facts with passed `valid_to`) at 20% of facts.

**Predictions** (each can fail).

| # | Prediction | Basis | Falsified if |
|---|---|---|---|
| 1 | A0 XTDB 4-hop pull p50 is at least 80 ms at the 100k rung | one bloom-pruned scan per hop at 25 to 40 ms `[P R7 Q1, P2X]` | p50 under 40 ms |
| 2 | X1 changes nothing in the fresh regime (pages used and latency within 10%) and, in the aged regime, pages used at depth 10 is within 1.1x of depth 1 | `trie.clj:113-118`; current-week bucket (1.4) | fresh-regime p50 improves by more than 20%, or aged-regime pages grow by more than 1.3x |
| 3 | X2 single-entity `_id IN` p50 at most 5 ms and p99 at most 25 ms at depth 1, 3 and 10, with depth-10 p50 at most 1.4x depth 1; the 4-hop mix p50 is 25 to 45 ms and misses the 5 ms bar | R16: 3.95, 3.81, 5.34 ms; 4 queries 35 to 40 ms | mix p50 under 10 ms (then H1 is unnecessary on XTDB) or over 60 ms |
| 4 | Q1 4-hop pull p50 is 14 to 35 ms, flat in depth (depth-10 over depth-1 at most 1.3x); Q2 reaches p50 at most 2 ms and at least 700 pulls/s per core | R17: 23 to 33 ms; bundle 1.2 ms | Q1 depth ratio above 1.3, or Q2 p50 above 4 ms |
| 5 | **H1 p50 at most 2 ms and p99 at most 10 ms on the weighted mix; at least 2,000 pulls/s per core; bytes read at depth 10 at most 1.05x depth 1** | in-process index lookups; the store excludes rows retired before H | p50 above 5 ms, or depth ratio above 1.1 |
| 6 | Zero correctness violations in at least 100,000 sampled pulls per arm; reads at 5%-bucket bases (up to 90 days) never route to the current structure | rule (1) | any mismatch, or any current-structure answer for B below H |
| 7 | Write overhead: X2 adds at most 3 ms p50 to a 10-fact commit and at most 5 ms with 2 retractions; Q1 adds at most 3% to the 653 triples per command (at most 20); H1 adds at most 0.5 ms to the broker's ACK p50 | R18 X2 prediction 3; section 2.2 | X2 over 5 ms, or Q1 over 5% |
| 8 | Fallback share at the 80/15/5 mix with a one-hour window is under 2% when W is within 250 ms of head | the 15% bucket is inside the window | share over 5% |
| 9 | At the 100k rung H1 holds about 3.9M live rows, about 1 GB on disk, under 1.5 GB RSS | 250 B rows `[E]` | disk over 3 GB |

**Measure.** Per arm and bucket: p50, p90, p99 of pull latency; pulls/s per core with the engine CPU quota in the receipt and broker/kernel CPU beside it (TARGETS 1.1 P4 item 3); route and language per read; fallback share; apply lag; commit p50 and p99 delta; writer triples (QLever) or rows (XTDB) per command. **Bytes read per pull:** XTDB `EXPLAIN ANALYZE` counters `scan_files_used`, `scan_pages_used`, `scan_rows_read` (`ScanMetrics.kt:13-25`; R16 found the pgwire output decoded as `[object Object]`, so the harness needs a decoder first); QLever server CPU and minor page faults from `/proc` (R17 method); H1 rows read counted in code. The N01 report marks engine bytes as an unmeasured seam (`driver.ts:907-908`), so this closes it.

**Slots and memory.** One exclusive engine slot per lane, one lane at a time. XTDB: slot of 3.5 GiB and 2 CPUs (R16 conditions); the 100k rung is about 3.9M facts, which becomes about 9M `tx_assertions` rows (about 2.4 rows per fact with the journal) at about 185 B each, so about 1.7 GB live and about 4 GB after the 2.4x compaction overhead `[E from R7, J01]`. QLever: the 3.5 GiB dev resident with delta capped at 750k triples and a rebuild between arms. Pool: 11 GiB total, xtdb-dev 3.0 and qlever-dev 3.5 leave 4.5 GiB `[STATE]`, so no second engine process is needed for P4. Host: about 1.5 GiB for the broker store and page cache. Do not run with other engine-heavy jobs; use `lab/bin/heavy.mjs`; judge latency relatively.

**Dependencies.** None for A0, X1, X2, Q1 and the in-process H1. The P2B replica variant of X2 and the SQLite H1 wait for P2B and the Q58c hardening. Agent time `[E]`: 1 day for X1/X2/Q1, 1 day for H1 plus the exactness gate, half a day for the aged regime.

---

## 7. Recommended EXP-P5 design (release sweep)

**North star.** P5: sweep 100k subjects at one pinned basis while the writer trace and 64 live readers run; wall at most 100 s including publication; live read p99 and writer commit p99 each at most 1.5x their no-sweep values; the pin never blocks writers or unrelated compaction (TARGETS 1 and 1.1 P5). Moves P1.

**Arms** (100k rung, both lanes; each arm compared with a matched no-sweep run on the same trace segment and burst phase).

| Arm | What changes |
|---|---|
| **S0** | uncontrolled: 8 sweep workers calling `sweepPull` through the public composition on the live engine |
| **S1** | S0 plus the lane of section 5.2 (cursor, page of 64, queue-delay admission) on the live engine |
| **S2** | S1 against a dedicated sweep replica (XTDB second broker-fed replica or X05-style follower; QLever second read-only server; streamed export on QLever) |
| **S3** | host-store sweep: worker threads read the broker store at B = P_sweep, kernel in the worker, outbox publication; no engine involved |
| S4 | S3 with the shared-bundle validation cache (needs a kernel change) |
| T | throttled variant (about 10 minutes) overlapping a real XTDB compaction or QLever rebuild, for the best arm |

**Steps.**

1. Fill the `lab/bench/lib/evaluate.ts` seams (`evaluate`, `publish`) with the D01b kernel's `sweepSubject(world, release, basis)`; they fail closed until EXP-D01 today. Check that the O-DOMAIN pin (D01c fix round) exists, because P5 expected outputs come from O-DOMAIN.
2. Implement the cursor, the pin (hold H), the coverage hash of the subject list and the outbox publication; implement the controller with the constants of 5.2 and a trace of in-flight pages.
3. Matched baselines: no-sweep windows on the same trace (zero-reader run semantics of TARGETS 1.1 P1 item 5).
4. Run S0, S1, S2, S3 in that order; the driver mutates 1% of subjects after the basis is captured (TARGETS 1.1 P5 item 4); then the kill-and-resume test (10 kills at random pages) and arm T.
5. Verify every sweep output against O-DOMAIN at the captured basis, the receipt's basis and release hash, and the subject-list hash (coverage exactly once).

**Predictions** (each can fail).

| # | Prediction | Basis | Falsified if |
|---|---|---|---|
| 1 | S0 raises live read p99 to at least 2x on XTDB (2 CPUs) and at least 3x on QLever while finishing in under 100 s | R17: 1.7x to 3x; R16: p99 1.39x, p50 1.57x; QLever FIFO pool `[P R8 2.2]` | live p99 stays under 1.5x on a lane (then no controller is needed there) |
| 2 | S1 holds live p99 at most 1.5x outside bursts; during a 55/s burst the sweep pauses, so wall is at most 100 s plus the 60 s burst | R18 X4 prediction 3; controller of 5.2 | live ratio above 1.5 for more than 2 consecutive windows, or wall above 200 s |
| 3 | S2 on XTDB finishes in 41 to 91 s with per-subject documents and over 100 s with per-entity documents; S2 on QLever finishes in 25 to 55 s by streamed export and 120 to 134 s by batched pulls | 5.3 | QLever batched pulls finish in under 80 s on one core, or XTDB per-entity documents finish in under 80 s |
| 4 | **S3 wall is at most 35 s (target 25 s); live read p99 and writer commit p99 at most 1.2x; broker event-loop delay p99 under 5 ms; worker CPU about 1.5 cores for about 25 s** | 5.4 | wall above 60 s, or a p99 ratio above 1.5 |
| 5 | 100% of sweep outputs equal O-DOMAIN at the captured basis, including the mutated 1%; coverage hash equals the subject-list hash; 10 random kills and resumes give identical outputs with no repeats | pin by retention; cursor | any difference |
| 6 | Publication of 100k records takes at most 10 s of broker time in frames of 64 and raises live commit p99 by at most 1.25x when gated; on QLever the sweep outputs add 0 triples to the index during the sweep | 1,563 frames at about 5 ms `[E]`; 5.2 item 5 | publication over 30 s, or commit p99 over 1.5x |
| 7 | Typed-input kernel cost reproduces at 15.8 s plus or minus 20% of CPU; feeding raw JSON costs about 51 s | `[P D01b]` | typed path over 40 s |
| 8 | The controller settles within 20 s and does not oscillate: in-flight pages change direction at most once per second after settling | AIMD lineage | more than 3 direction changes per second |
| 9 | The sweep holds no engine files: XTDB compaction and block flush complete during the sweep and the checksum of outputs is identical before and after; broker RSS grows by at most 300 MB and WAL by at most 50 MB | `[P R16 5.1]`; section 5.2 item 1 | checksum differs, or RSS growth above 600 MB |

**Measure.** Wall from basis capture to the last publish ACK; subjects/s; per-stage CPU (reader, kernel, publish) from `process.cpuUsage` and worker `eventLoopUtilization`; in-flight pages over time; live p50/p90/p99 per 5 s window and writer commit p99, each against the matched no-sweep phase; engine CPU from the container; fallback share; WAL size and broker RSS; the receipt binds basis, release hash, subject-list hash, kernel input mode and controller constants.

**Slots and memory.** XTDB lane: the replica slot (3.5 GiB, 2 CPUs) plus one small follower or second replica (1.0 GiB, `lab/config/xtdb-follower-small-config.yaml`), 4.5 GiB, which is the whole free pool; QLever lane: the 3.5 GiB dev resident plus a read-only sweep server of 1.0 to 1.9 GiB (R17's probe used 1.86 GiB at 69M triples; the current-only 100k-rung index is far smaller), which leaves 2.6 to 3.5 GiB of the 4.5 GiB free. The two lanes cannot run together. Host: broker plus two sweep workers, about 1.5 GiB RSS and up to 3 cores; the host runs at load 12 to 13 on 12 cores, so report CPU time next to wall time and run in a quiet window through `lab/bin/heavy.mjs`. Profile: screening (30 s warm-up, 120 s per level) for comparison, acceptance (120 s, 600 s) before a bar closes.

**Dependencies and time `[E]`.** D01b merged; O-DOMAIN pin pending (V-D01c fix round); P2B for the XTDB replica arm; P2Q fix round merged for the QLever broker; the SQLite store from Q58c for S3, or the in-process table from EXP-P4 H1. About 1.5 days for S0 to S2 and 1 day for S3 and the controller.

---

## 8. Open questions

1. **Horizon policy.** One hour matches the 15% basis bucket, but a long pinned reconcile or a sweep with a throttled 10-minute variant holds H lower. Should the broker refuse new sweeps when H would trail head by more than a set number of positions?
2. **SQLite locking.** R23's `locking_mode=EXCLUSIVE` rules out a second reader connection (`wal.html` section 8). Decide between WAL with the external `flock` (readers in workers) and one owner thread with transferred buffers; EXP-P4 H1 and EXP-P5 S3 should measure both.
3. **Cluster key.** Clustering XTDB rows by subject assumes each entity's facts are written by one subject's commands. Shared entities written by other subjects' commands would scatter. The N01 world has this shape (accounts, releases, requirements are shared); confirm with Sam's data model.
4. **Erasure.** The broker store and the engine current copies hold PII (TARGETS 7 item 3). Q58e's per-subject keys must cover `current_rows`, and the `cur` graph in QLever keeps deleted literals in its vocabulary until a full reindex `[P R17 6.2]`.
5. **Expired facts.** Facts whose `valid_to` has passed stay in the current structure. A valid-time horizon plus boundary timers would retire them; not designed here.
6. **Publication semantics.** TARGETS 1.1 P5 item 3 says results are published as work items through the atomic outbox. Is one outbox commit per subject required, or may a sweep page publish 64 results in one frame? This decides whether 100k publications are 100k commands.
7. **Where the live bars are measured.** If pulls are served from the broker, the P1 and P4 receipts should say so; TARGETS 4.1 item 5 already records the route, but "per engine core" in P4 needs a stated rule for host-served reads.
8. **Kernel change.** Caching validated shared bundles needs an incremental API in `packages/w0`; ask the D01b author whether the 80% validation share is separable for shared facts.
9. **Engine bytes read.** XTDB `EXPLAIN ANALYZE` decoding is broken in the harness (R16); QLever exposes no bytes counter, only CPU and page faults.
10. **Datomic detail.** Whether `noHistory` attributes are acceptable for Triplex is still Sam's call (R18 open item 7); this report did not assume yes.
11. **J01.** The compact QLever encoding (449 triples per 10-fact command) is read from raw output; re-check the figures once J01 reports.

---

## 9. Sources and raw material

- **Lab:** `lab/NORTH-STAR.md`, `SCOPE.md`, `TARGETS.md`; D01b and P2X reports; `lab/verify/P2Q/VERIFY.md`; `lab/STATE.md`; `lab/SCORECARD.md` 1.1; R7, R8, R16, R17, R18, R23; `lab/acceptance/RULINGS.md` (Q16, Q27, Q50a, Q58) and `RULINGS-PENDING.md` (Q63); `lab/bench/lib/composition.ts`, `world.ts`, `driver.ts`.
- **XTDB source (v2.2.0):** `core/src/main/clojure/xtdb/{trie.clj, trie_catalog.clj, operator/scan.clj, sql.clj}`; `core/src/main/kotlin/xtdb/{bitemporal/Polygon.kt, PolygonCalculator.kt; compactor/OutWriter.kt, SegmentMerge.kt; operator/scan/{ScanCursor,EntityResolver,EntityMerge,ScanMetrics}.kt; segment/{MergePlanner,BufferPoolSegment,MemorySegment,Segment}.kt; util/TemporalBounds.kt; api/IndexerConfig.kt}`; `dev/doc/compaction.allium`; `docs/src/content/docs/about/time-in-xtdb.md`.
- **Triplex:** `packages/core/src/{storage/StorageAdapter.ts, store/TriplesLive.ts, entity/Repository.ts}`; `packages/xtdb/src/XtdbStorageAdapter.ts`; `packages/qlever/src/QleverStorageAdapter.ts`; `exp/P2Q-qlever-log-broker` `packages/qlever/src/broker/sparql.ts` (worktree `.claude/worktrees/agent-a56ab43df1f0e0ef7`, head f711193).
- **Raw material:** `/Users/sam/Claude/Projects/triplex-db-2/R24/prior-art-current/` (Kafka 4.1.0 and Materialize source, draft report) and `.../prior-art-sweep/raw/` (freno, gh-ost, pt-osc, Vitess, Netflix concurrency-limits, folly CoDel, SRE chapters, SEDA, Envoy, cgroup v2, Kubernetes, Node, Disruptor, PostgreSQL, TiDB, CockroachDB, MongoDB pages). SQLite `wal.html` is in `/Users/sam/Claude/Projects/triplex-db-2/R23/raw/sqlite/`. The sweep sub-agent's fetches of the ACM Queue and CACM "Fail at Scale" articles and an AWS re:Post page returned 403, so CoDel is cited from the folly source.
- **EXP-J01 raw output** (not yet reported): `/Users/sam/Claude/Projects/triplex-db-2/EXP-J01/`.

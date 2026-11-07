# R18: Read path, change feed and sweep prior art (engine-independent patterns)

**Written:** 2026-11-07. **North star:** P1, P3, P4 and P5 of `lab/NORTH-STAR.md`, measured by the NS gate of `lab/TARGETS.md` section 1. **Scope:** patterns from papers, vendor documentation and source, mapped onto the Triplex layers of `lab/TARGETS.md` section 4 on XTDB 2.2.0 (`references/xtdb`, sha `c6c1962`) and QLever 0.6.0 (`references/qlever`, sha `6c5861a`). Native measurements belong to the separate XTDB and QLever research agents; this report only says which designs to try and what they should cost.

## How to read this report

- **Evidence labels.** `[S]` read in pinned source (cited `path:line @ sha`, or `path:line` for an unpinned clone named in the text). `[W]` fetched web primary source (paper, vendor documentation, vendor blog). `[WS]` a web-search summary that I did not open in full, so lower confidence. `[P]` taken from an earlier lab report (R-number and section). `[E]` my extrapolation or arithmetic, always shown with its inputs.
- **Confidence** is High (source or primary text says it), Medium (one source, or vendor-reported numbers on a different workload), Low (inferred).
- **What I did not do.** I started no containers and ran no engine, so every statement about XTDB and QLever behavior is from source or from R-reports, and the experiment predictions in section 7 are untested. I made no authenticated `gh` calls and no web request carried personal data. I touched nothing in `/Users/sam/projects/triplex-db`. The brief barred subagents, so the background style reviewer that `sam-writing-style` asks for was not run; I checked the file by grep for em-dashes and banned words only.
- **Raw material** (papers as text, doc pages, shallow clones of Salsa and differential dataflow) is in `/Users/sam/Claude/Projects/triplex-db-2/R18-read-path/` (`raw/`, `clones/`). Section 9 maps every URL to its local copy.

---

## 0. Verdicts at a glance

| # | Question | Verdict | Confidence |
|---|----------|---------|-----------|
| 1 | Serving pinned-basis reads at high rate | Every system that scales reads treats the basis as a value (Datomic db value, XTDB snapshot token, Zanzibar zookie, Materialize frontier), shares one snapshot among many readers, and keeps version retention separate from reader count in one of two ways. **Time-bounded retention** (FoundationDB 5 s, XTDB `garbageLifetime` 24 h, Spanner 1 h, Datomic `gc-storage` at least a month) never makes a writer or compactor wait for a reader, and a reader that is too slow fails. **Reader-tracked retention** (LMDB, PostgreSQL, differential dataflow `since`) guarantees the reader finishes and charges the cost as unreclaimed space. No system keeps per-subject state for readers; per-subject state appears only in derived caches (Noria, Zanzibar, TAO). XTDB 2.2.0 is time-bounded with an unbounded logical basis. QLever 0.6.0 pins one snapshot per request, has no named past basis, and runs requests on a FIFO pool. | High |
| 2 | Current index separate from history | Three patterns. A filter over one index (Datomic). A physical split by row lifetime (XTDB 2 current and historical tries, MariaDB `PARTITION BY SYSTEM_TIME`, SQL Server current plus history tables). A projection derived from a log (event-sourced views). XTDB 2.2.0 already splits current from historical files, so open-ended facts need no extra current table, but a currently valid fact with a finite `valid_to` (an expiry) is filed as historical, so Triplex expiry facts do not get the split. QLever named graphs share one delta, one rebuild and block metadata capped at 20 graphs per block, so real separation needs a second index. | High on XTDB source, Medium on cost |
| 3 | Change feed to dependency index | The proven structure is a recorded read set per computation, a reverse index from input to computations, early cutoff when an output is unchanged, and a durability split between rarely changing definitions and often changing facts (Salsa, Shake, Bazel, Convex). Resumable means a position persisted in the same transaction as the effect (Kafka design document, Materialize progress messages). Gap-free needs dense positions or a visible high-water mark (Marten). Triplex today has dense positions from a scope-wide compare-and-set counter, which also serializes every commit in a scope. | High |
| 4 | Read-your-own-write with derived layers | Two techniques. Maintain the layer in the same transaction (zero wait, more writes per commit; SQL Server indexed views, the Record Layer measures about 4 index writes per record). Or return a position token and make readers wait for the layer's applied position (XTDB `AWAIT_TOKEN`, Datomic `sync(t)`, Zanzibar zookie, Spanner safe time). Use the first for the layer on the pull path and the second for everything off it. XTDB's token is session state that `DISCARD ALL` clears, so a pooled client must send it per read-only transaction. | High |
| 5 | Large sweeps without hurting live traffic | Unmanaged background work raised foreground tail latency a lot in the published tests (ScyllaDB p99 from about 2 ms to 11 to 12 ms, about 6x; CockroachDB backups pushed p99 above 10 s). Controlled lanes bring it back (ScyllaDB 4 to 7 ms with shares 1000:10, CockroachDB 60 ms with an elastic CPU token bucket). Mechanisms are priority classes, token buckets, an admission controller driven by a latency signal, short resumable units (continuations), and a pinned read position. Neither engine has priority lanes, so the lane lives in the Triplex runtime. The same-box lab run of an unmanaged QLever rebuild shows +69% point-lookup p50. | High on mechanisms, Medium on magnitudes |
| 6 | Bounded subgraph pulls | The strongest pattern for 1,100 pulls/s per core is a per-subject world document cached in the runtime, stamped with a position validity interval, invalidated through the same reverse index that drives the feed, refilled by one exact pull under single-flight. Datomic pull and DataLoader batching reduce round trips but not per-fact work. | Medium (design synthesis from several sources, untested) |

### Cross-cutting findings that change the design

1. **One dependency index serves three jobs.** The structure that maps a change to the subjects to re-run (P3) is the same structure that invalidates a cached world document (P4, P1) and that limits a release sweep to the affected subjects (P5). Build it once, in the Triplex runtime, with a durable form in whichever engine holds the checkpoint.
2. **A cached current document can serve past bases.** If the cache entry records the position at which each dependency last changed, the entry is exact for every basis between the newest of those positions and the first later change. Salsa tracks the same thing as `changed_at` and `verified_at`. Reads at recent past bases then cost the same as current reads (section 6).
3. **XTDB 2.2.0 does not track open snapshots against its garbage collector.** Its contract is that a snapshot must be closed within `garbageLifetime` (default 24 h). A 100 s sweep puts no retention cost on writers or compaction, which meets the P5 bar "the long snapshot never blocks writers or unrelated compaction" for the pin itself `[S]`; the only cost is memory for the displaced live block if one `Snapshot` object is held across a block flush. Set `garbageLifetime` above the longest sweep and per-page reads need no lease at all.
4. **QLever has no priority between requests.** Its request pool is a plain FIFO `boost::asio::static_thread_pool` of `-j` threads `[S]`, and the earlier lab run showed head-of-line blocking of 7.46 s at `-j 1` `[P R8 §2.2]`. Sweep pages must be short, and the admission lane must sit in front of QLever.
5. **Triplex's dense scope-wide position is both an asset and a ceiling.** It makes the feed gap-free by construction, but every commit in a scope does `ASSERT MAX(position) = K` `[S packages/xtdb/src/XtdbStorageAdapter.ts:189-196]`, so concurrent commits in one scope conflict and retry, or (when the `admissionQueue` option is on) queue behind a one-permit semaphore (`XtdbStorageAdapter.ts:422-426`), instead of running in parallel per subject. If the P2 work moves to per-subject concurrency, the feed needs a log offset or a high-water mark (section 3.4).
6. **Steady offered load is far below the closed-loop ladder, and the burst is not.** From the paste's mix (60% 5 to 10 facts, 30% 11 to 25, 10% 26 to 50) the mean command is about 13.7 facts `[E]`, so 15 facts/s is about 1.1 commands/s and the 50x burst about 55 commands/s. With 10 to 100 reads per write that is 11 to 110 pulls/s steady and 550 to 5,500 pulls/s in a burst `[E]`. The 256-reader closed loop is a stress ladder; the real work is the burst, which at 1,100 pulls/s per core needs up to 5 cores for reads alone.
7. **QLever should not host the dependency index or the feed checkpoint.** A small QLever update has a fixed cost of 22 ms at a 100k-triple delta and 203 ms at 1M, and 1,000-triple updates took 455 to 1,755 ms under four readers `[P R8 §3, §2.2]`. One update per feed batch would use most of the 250 ms lag budget, so those structures belong in a store with cheap small transactions (XTDB tables or a local embedded store) `[E]`.

---

## 1. Serving pinned-basis reads at high rate

### 1.1 Verdict

1. Reads that never block writers come from immutable or copy-on-write data plus a basis that is a value, not a lock. Every system in the table below does this for the reads it serves.
2. The design choice that matters is **what bounds the version window**. Time-bounded systems fail slow readers; reader-tracked systems keep them alive and pay in space. P5's "the long snapshot never blocks writers or unrelated compaction" selects time-bounded retention plus resumable short reads.
3. Many concurrent readers are cheap when they **share one snapshot** (XTDB's refcounted shared snapshot, Zanzibar's quantized timestamps, differential dataflow's shared arrangements). Distinct per-read bases cost a snapshot each.
4. Nobody keeps state per subject for the reader. The per-subject items in the literature are cache entries keyed by (key, basis) that are invalidated by dependency.

### 1.2 Comparison

| System | What a reader pins | What stays in memory | What bounds the version window | Effect on writers | Source |
|--------|-------------------|----------------------|-------------------------------|-------------------|--------|
| **Datomic** (peers) | A database value: index roots plus the in-memory tail, optionally filtered by `as-of t`. `d/db` neither blocks nor contacts the transactor. | Per peer: a memory index up to `memory-index-max` (sample 512 MB, per connected database) and an LRU object cache of immutable segments (the capacity example gives it 50% of RAM). Nothing per entity. | `as-of` is a filter over the log-ordered datoms, so any retained `t` works. Storage garbage is reclaimed by `gc-storage older-than`, which the capacity page says should be at least a month old because a recent cutoff can disrupt index values that long-running processes still use. | None. The overview says any number of processes can hold copies of the immutable data, and readers wait for or coordinate with nobody. Writers are throttled only when the memory index passes `memory-index-max`. | `[W]` Datomic Overview (Benefits, Indexes, Topology); Clojure API `db`, `as-of`, `sync`; Capacity Planning (Transactor Memory, Peer Memory, Garbage Collection for Live Databases) |
| **XTDB 1.x** | `open-db` opens a KV index snapshot (`new-kv-index-snapshot (kv/new-snapshot kv-store)`) at a bitemporal basis `{valid-time, tx}`. The caller must close it. | Per index store: a `cav-cache` and a `canonical-buffer-cache`; the index itself is RocksDB or LMDB on disk. | All bitemporal entries stay in the index, so any tx is readable. Throws `NodeOutOfSyncException` if the node has not indexed the requested tx. | A RocksDB snapshot or LMDB read transaction is held while the db is open. | `[W]` XTDB 1.x Clojure API (`db`, `open-db`, `await-tx`); `[S]` `core/src/xtdb/query.clj:1685-1688, 2015-2033, 2147-2152` and `core/src/xtdb/kv/index_store.clj:1177-1180, 1217-1221` @ 1.24.4 |
| **XTDB 2.2.0** | A `Snapshot` that pins the live-index segments, the trie-catalog capture and table metadata. It is shared and refcounted. The user-visible basis is a snapshot token (per-partition tx basis) plus a clock time. | The open block in memory: up to 102,400 rows or 15 minutes, as Arrow relations that readers slice. Page caches: memory cache default 512 MB or ratio 0.5, disk cache default ratio 0.75. Nothing per subject. | Logical basis: any retained system time, because rows carry system-time bounds. Physical files: the snapshot must be closed within `garbageLifetime` (default 24 h, `blocksToKeep` 10). GC is by time only and does not look at open snapshots. | Readers hold the snapshot lock only while capturing; writers install under the write lock. | `[S]` `indexer/Snapshot.kt:28-33, 101-109`; `indexer/LiveIndex.kt:74-75, 98-102, 155-181, 187-209, 221-236`; `trie/TrieCatalog.kt:39-41`; `api/GarbageCollectorConfig.kt:15-16`; `api/IndexerConfig.kt:14-17`; `docs/.../ops/config/storage.md:25-51` |
| **Materialize / differential dataflow** | A trace handle on an arrangement (an indexed collection) with a `since` frontier. The collection is correct only at times beyond that frontier. | The arrangement: one indexed copy of the collection per key, shared by every query that uses the same key. Memory stays bounded because readers advance their frontier and the trace coalesces indistinguishable times. | The reader-held frontier (`set_logical_compaction`). Materialize keeps only the latest version by default; `RETAIN HISTORY FOR '1hr'` extends it. | None. A held trace stops the system from compacting, so the cost is memory. | `[W]` Shared Arrangements, VLDB 2020, §4.3 (Trace handles), §6.1; differential dataflow book `mdbook/src/chapter_5/chapter_5_3.md:89-95 @ e7c2470`; Materialize "Durable subscriptions"; "Isolation levels" |
| **Noria / ReadySet** | The latest published state of a view. No named versions. | Per view: a hash table keyed by query parameters, filled on demand (partial state), evicted by LRU, refilled by an upquery through the dataflow. | None. Eventual consistency only. | None. Read handlers use double-buffered hash tables and an atomic pointer swap; the paper reports up to 10x read throughput over a single-buffered table with bucket locks on skewed keys. | `[W]` Noria OSDI 2018 §3 (partially-stateful data-flow), §6.2 (Read handlers), §8.4; ReadySet "Deep caching" |
| **FoundationDB** | A read version from the Sequencer. Read-only transactions are serializable at that version and commit locally. | Storage servers keep the last 5 seconds of versions in memory; older data is only the latest on disk. | 5 seconds. `MAX_READ_TRANSACTION_LIFE_VERSIONS = 5 * VERSIONS_PER_SECOND` with 1e6 versions per second. A read after the window fails with `transaction_too_old`. | None. The paper chose the window to cap memory in Resolvers and storage servers, and says longer work should be split into smaller transactions. | `[W]` FDB SIGMOD 2021 §2.4 (read-only transactions, snapshot reads), §6.4 (5s MVCC window); `[S]` `fdbclient/ServerKnobs.cpp:43-44 @ release-7.3`; FDB "Known limitations" |
| **LMDB** | A snapshot of the copy-on-write B+tree root at transaction begin, in a reader-table slot. Only the newest committed version at begin can be pinned. | Nothing; the data is memory-mapped. | The oldest open reader. The header warns that read transactions block reuse of pages freed by newer writers, so the file can grow quickly. | None to writers, but there is exactly one writer at a time. | `[S]` `libraries/liblmdb/lmdb.h:23-26, 107-110` (LMDB `mdb.master`) |
| **Spanner / CockroachDB** (for scale) | A read timestamp at or below the replica's safe time `t_safe`. | MVCC versions per cell or key. | Spanner `version_retention_period`, default 1 hour, up to 7 days. CockroachDB `gc.ttlseconds`, shown as 14400 (4 h) in the documented default zone config. | None. Snapshot reads are lock-free; only commit wait applies to writers. | `[W]` Spanner OSDI 2012 §4.1.3, §4.2; Cloud Spanner PITR docs; CockroachDB follower-reads and zone-config docs |

### 1.3 What XTDB 2.2.0 does for a pinned read (source)

- **A reader gets a shared, refcounted snapshot.** `LiveIndex.openSnapshot(minSystemTime)` returns the cached `sharedSnap` after `retain()` when it is fresh enough, otherwise rebuilds it under the write lock with a double check (`LiveIndex.kt:221-236 @ c6c1962`). The snapshot closes its table views when the refcount reaches zero (`Snapshot.kt:101-109`).
- **Writers do not wait on readers.** `applyTx`, `commitTx` and `nextBlock` take the `StampedLock` write lock only to swap in new table values; the displaced value is released without freeing memory a reader still holds, because each reader took its own slice (`LiveIndex.kt:140-153, 155-209, 262-273`).
- **The cost of freshness is a rebuild, not a wait.** A read whose basis is newer than the cached snapshot rebuilds it once under the write lock; concurrent readers reuse the result. `Snapshot.open` visits every live table (`Snapshot.kt:133-196`), so the rebuild is O(live tables) and it blocks other readers and the next commit's install for that time. I did not measure it (experiment X1 does).
- **A "read-only transaction" holds no server resource.** It is a stored basis: `pinReadBasis` awaits the token, then records `(snapshotToken, snapshotTime, clock)` (`api/Xtdb.kt:683-698`). The XTDB documentation says the same: a read-only transaction is not a stateful transaction, needs no locking and does not degrade concurrent reads and writes (`docs/.../about/txs-in-xtdb.md:75-78`).
- **Slow readers are bounded by time, not tracked.** The catalog capture is a persistent map frozen at capture time, and the code comment states the contract: callers must close their snapshot within the configured `garbageLifetime` window, or GC may delete trie files the snapshot still references (`trie/TrieCatalog.kt:39-41`). The GC computes its cutoff from block count and wall time only (`TrieGarbageCollector.kt:129-131`).
- **Read scale-out exists.** Each database has one leader that indexes the source log and writes blocks; followers tail the replica log (`docs/.../about/dbs-in-xtdb.md:144-215`, `ops/troubleshooting.md:38`). A follower is the XTDB form of Datomic's practice of sending each load pattern to a different set of instances and of Spanner Data Boost, and it is the natural place for a sweep (section 5).

### 1.4 What QLever 0.6.0 does for a pinned read (source and lab reports)

- **One request is one snapshot.** The query context takes the current located-triples snapshot once at construction (`src/engine/QueryExecutionContext.h:256-261 @ 6c5861a`), and each update publishes a deep copy (`src/index/DeltaTriples.cpp:483-492`). The copy costs memory per distinct snapshot a running query still holds `[P R8 §6.3]`.
- **There is no named past basis.** A past basis exists only as data: the log position `rp <= P` filter in the same request, measured at 0.94x to 1.08x for selective reads and 2.6x for a count over every assertion `[P R8 §4]`.
- **Requests run FIFO.** `queryThreadPool_{numThreads}` is a `static_thread_pool` (`src/engine/Server.h:108`, `Server.cpp:63`). There is a `Query-Id` header that allows cancellation (`Server.cpp:988-1004`) and a default `-s 10s` timeout, but no priority classes.
- **What the lab measured.** Four readers and one writer at 99M triples gave point-lookup p50 44.8 ms at baseline and 75.5 ms during a rebuild, and `-j 1` stalled lookups up to 7.46 s `[P R8 §2.2]`.

### 1.5 Patterns to adopt, with costs

1. **Make the basis a value that travels with the request.** XTDB snapshot token, Datomic db value, Zanzibar zookie, Materialize timestamp. Triplex already carries `{recordedPosition, validAt}`; the engine-specific token stays an implementation detail (R1 Q5).
2. **Share snapshots and cache entries among concurrent readers.** XTDB already shares one refcounted snapshot (section 1.3). Zanzibar goes further. It rounds evaluation timestamps up to one or ten seconds so most requests share snapshots and cache entries, and it encodes the snapshot timestamp in cache keys to avoid reusing results across snapshots (§3.2.5). The shared arrangement paper reports query installation dropping from 1 to 2 seconds to milliseconds when queries share an index (§6.1). For Triplex the same effect comes without any staleness from the validity interval in section 6.3, which lets one cache entry serve every basis in a range. Rounding bases up (Zanzibar's quantization) is the fallback if interval hits turn out to be rare; its cost is up to one tick of staleness that is still an exact, named basis.
3. **Prefer time-bounded retention with checked failure.** FDB returns `transaction_too_old`; XTDB's contract is documented; Datomic and Spanner say the same in prose. A short-lived reader never needs a lease. A long job registers a lease only if the engine's retention is shorter than the job.
4. **Cap in-flight reads near the core count.** Closed-loop readers beyond the cap only wait in the queue, so goodput cannot fall when readers go from 64 to 256, which is the P1 bar. The Noria paper shows the same throughput-latency "hockey stick" for uncapped stores (OSDI 2018 §8).
5. **Use left-right style double buffering for a hot derived view that only needs the latest state** (Noria §6.2). It does not apply to pinned past bases.

---

## 2. Current index kept separate from history

### 2.1 Verdict

1. The three patterns differ in **where the split happens**: at query time (Datomic filter), at file or table layout time (XTDB 2, MariaDB, SQL Server), or in a derived projection (event sourcing, Materialize).
2. P4's condition "current-pull latency and bytes read stay flat as history grows" holds only for the layout-time and projection patterns.
3. XTDB 2.2.0 implements a layout-time split in its compactor. It is real in source and absent from the public docs `[S]`. Its definition of "current" is narrower than a Triplex "currently valid fact" (section 2.3).

### 2.2 Comparison and cost per write

| Pattern | Mechanism | Cost per write | Current read vs history depth | Source |
|---------|-----------|----------------|------------------------------|--------|
| **Datomic** | One set of indexes holds assertions and retractions; "current" is a filtered view; `history` is the unfiltered view; `:db/noHistory` drops history for chosen attributes. | Datoms appended to the log and memory index; background indexing rewrites segment trees across 4 indexes. | Not separated. A current read passes over retracted pairs in the same segments. `noHistory` is the escape for high-churn attributes, where the best-practices page says the database size and indexing cost of keeping history usually outweighs its use. | `[W]` Datomic Overview (Indexes); Filters (history); Best practices (NoHistory); API `history` |
| **XTDB 2.2.0** | The compactor routes each row by its **recency** into a current file (L1C, no recency) or a weekly historical file (L1H). L1C is levelled, L1H tiered. | Row appended to the live index, written to an L0 file at the block boundary, then rewritten by compaction. R7 measured L1C files rewritten cumulatively (about 6x disk before GC, about 2.4x live data at steady state). | A "now" query skips every page whose recency is at or before its lowest bound (`trie.clj:113-118`), so superseded history is not read. | `[S]` `clojure/xtdb/trie_catalog.clj:61-97`; `kotlin/xtdb/bitemporal/Polygon.kt:21-45`; `kotlin/xtdb/compactor/OutWriter.kt:140-148`; `clojure/xtdb/trie.clj:100-125`; `[P R7 Q6]` |
| **SQL Server temporal** | A current table plus a mirrored history table. An update stores the old row in the history table and closes its period in the same transaction; every DML adds a history row even if no value changed. `FOR SYSTEM_TIME AS OF` unions the two. | One in-place update plus one history insert per changed row. | Flat for current reads (history table untouched). Point-in-time reads union both tables. | `[W]` Microsoft Learn, "Temporal tables" (lines on updates, deletes, "FOR SYSTEM_TIME"); "Temporal table considerations" (indexing the two tables differently) |
| **MariaDB** | `PARTITION BY SYSTEM_TIME` with exactly one current partition and one or more history partitions; partition pruning limits current queries to one partition; history partitions rotate by time or size. | One row move per update into the history partition. | Flat for current reads by pruning. | `[WS]` MariaDB KB, "System-Versioned Tables" |
| **Event sourcing with snapshots** | Append events; a materialized view or snapshot holds current state; the page calls snapshots an optimization that never replaces the event stream; projections are eventually consistent. | One append, plus one asynchronous projection write per change. | Flat (the view is the current path). | `[W]` Azure Architecture Center, "Event Sourcing pattern" |
| **Materialize** | Objects keep only the latest version by default; `RETAIN HISTORY` is an explicit, paid extension. | Storage grows with the retention period; the docs advise not to retain history on indexes. | Flat unless retention is on. | `[W]` Materialize "Durable subscriptions" (Considerations) |
| **QLever named graphs** | A `current` graph and a `history` graph in one index. They share one delta and one rebuild. Block metadata names at most 20 distinct graphs per block; beyond that, `FROM` and `GRAPH` become per-row filters. | Updates write both graphs' triples into the same six permutations. | Not physically separated. A current read scans blocks that also hold history triples for the same subject and predicate. | `[S]` `src/index/ConstantsIndexBuilding.h:108 @ 6c5861a`; `[P R2 §1.2, §1.9 item 1]` |

### 2.3 Fit for Triplex

**XTDB.**

1. **What "current" means in the compactor.** `Polygon.recency` is the largest time T after which a row is invisible to every query whose valid time and system time are both at or after T (`Polygon.kt:21-45`). A row goes to the current file only when that recency is the end of time (`OutWriter.kt:146`). A fact that is valid now but has a finite `valid_to` (a document expiry, a window end) has recency equal to its `valid_to`, so it is written to a weekly historical file whose recency date lies in the future. A "now" query does not prune it (page recency is greater than the query bound), so it is still read. That is correct, but it means expiry facts are never in the current tier and a "now" pull reads every future-dated historical file it touches `[S][E]`.
2. **Consequence.** For open-ended facts the native split gives P4's flatness for free, and an explicit `current_*` table would only add write cost. For the expiry-heavy Onboarded facts (I-9 documents, start-date windows) flatness is not assured. Experiment X2 settles which case Triplex is in using `EXPLAIN ANALYZE` page counts (`scan_pages_used`, `scan_rows_read`), the same instrument R7 used.
3. **Same-transaction option.** If an explicit current table is needed, write it in the same DML transaction as the ledger rows, so read-your-own-write needs no token (section 4). R7 measured parameterized `INSERT` at 5k to 9k rows/s per connection, so 10 extra current rows per command cost on the order of 1 to 2 ms `[E]`.

**QLever.**

1. A second graph in the same index does not separate current from history. The separation that satisfies P4 is a **second QLever index** holding only current triples, built from the log of record like any read layer (C2, C4). It carries about 100M active facts instead of 150M to 500M retained facts a year, has its own delta and rebuild schedule, and can be restarted without touching the history index.
2. Cost: a second maintainer, a second marker, and a second `-m` and delta memory budget (R8 §6.3: delta is 0.75 to 1.3 GB per million triples).

**Optional, from Datomic.** `noHistory` for attributes whose history Triplex never explains, such as a signal's receive counter. This trades explain fidelity for write cost; it needs Sam's decision because Sam's must-haves include audit at a past point in time, so I do not recommend it by default.

---

## 3. From the change feed to a dependency index

### 3.1 Verdict

1. **Record what each computation read, then invert it.** Every system that avoids recomputation does this: Salsa and Adapton record dependency edges per memoized call, Shake and Bazel record dynamic dependencies per build step, Convex records the index ranges each query read, Materialize and differential dataflow keep arrangements keyed by the join key.
2. **Over-approximate cheaply, then cut off.** Excel keeps one dirty bit per cell and no dynamic dependencies (it over-recalculates); Salsa re-executes a node whose input changed and then backdates if the output is equal, so dependents stop early.
3. **Put definitions and facts on different durability tiers.** Salsa tracks, per durability level, the last revision at which any input of that level changed. A computation that depends only on high-durability inputs is declared valid in O(1) when only a low-durability input changed. For Triplex: release and requirement definitions are HIGH, subject facts are LOW.
4. **Resumability is a position persisted atomically with the effect.** Gap-freedom is a property of how positions are assigned, not of the consumer.

### 3.2 Mechanisms

| System | Unit of change | How dependents are found | Resume | Gap-free or ordering guarantee | Source |
|--------|---------------|--------------------------|--------|-------------------------------|--------|
| **Datomic** | Transaction `t` with its datoms | Application work: `tx-report-queue` delivers `:db-after`, `:tx-data` per transaction | The queue is in memory, does not block producers, grows until consumed, and starts when the connection starts. Durable resume uses `tx-range` over the log from the last processed `t`. | Total order by `t`. `tx-range` arguments are start inclusive and end exclusive. | `[W]` Datomic API `tx-report-queue`, `sync`; Log API (`tx-range`) |
| **Differential dataflow / Materialize** | Update triples `(data, time, diff)` | Operators over arrangements; cost follows the size of the change | `SUBSCRIBE ... WITH (PROGRESS)` emits progress messages; persist the last progress `mz_timestamp`, restart `AS OF <ts - 1>` with `SNAPSHOT false`. | Timestamps never decrease within a subscription; a progress row means no more updates before that time. History must be inside `RETAIN HISTORY`. | `[W]` CIDR 2013 (abstract); Materialize "Durable subscriptions", `SUBSCRIBE` |
| **Salsa** | A revision per input `set` | Each memoized function records the functions and inputs it read with their `changed_at` revisions; verification walks them ("red-green"); **backdating** keeps `changed_at` when a recomputed output equals the old one; **durability** skips the walk when only lower-durability inputs changed | Not applicable (in process) | Deterministic by construction | `[S]` `book/src/reference/algorithm.md`, `durability.md` @ 6d59529 |
| **Adapton** | A mutated reference cell | A demanded computation graph; mutation marks transitive dependents dirty (cheap flag propagation); recomputation is lazy on demand | Not applicable | Not applicable | `[W]` Adapton PLDI 2014 §2 |
| **Build systems** | A changed file | Excel: dirty bit per cell and a calc chain, no recorded dynamic dependencies (over-recalculates). Shake: recorded dynamic dependencies, "suspending" scheduler, early cutoff when a result is unchanged. Bazel: restarting scheduler, early cutoff. | Persistent traces | Minimality holds only with recorded dynamic dependencies | `[W]` Build Systems à la Carte, ICFP 2018 §2.2, §2.3, §4.2 |
| **Convex** | A log entry at a timestamp | Each query records its **read set** (index ranges scanned); a subscription is re-run when a new log entry's writes overlap the read set. The committer uses the same check for serializability. | Client re-subscribes; query re-runs at a new timestamp | Log entries share one timestamp sequence and are atomic per timestamp | `[W]` Convex "How Convex Works" (Subscriptions) |
| **Kafka** | A record at a partition offset | Consumer groups; one integer offset per partition per group | Offsets are checkpointed (stored in an internal topic); a consumer may also store its offset in its output store to get exactly-once effects | Per-partition total order | `[W]` Kafka design, "Consumer Position", "Message Delivery Semantics" |
| **PostgreSQL logical slot** | A decoded WAL change at an LSN | A slot per consumer | The slot position is persisted only at checkpoints, so after a crash changes may repeat and the client must dedupe by LSN. The slot keeps retaining WAL with no consumer connected, which can fill the disk. `max_slot_wal_keep_size` bounds it. | Changes replay in commit order; each is sent once in normal operation | `[W]` PostgreSQL "Logical Decoding Concepts" §47.2.2; `pg_replication_slots` |
| **CockroachDB changefeed** | A row change at an MVCC timestamp | Per-table or per-family changefeed job | Job checkpoints; `resolved` messages carry a high-water mark that guarantees no earlier update will arrive; protected timestamps hold GC (expire after 4 days by default) | Per-key order for the first emission, at-least-once, no global order | `[W]` CockroachDB "Changefeed messages", "Protect changefeed data" |
| **Zanzibar Watch** | A tuple modification | Clients maintain their own secondary indexes (the Leopard index ingests the stream and updates its posting lists with little effect on query serving) | Watch responses carry a heartbeat zookie; resume from it | Events in ascending timestamp order from the requested zookie to the heartbeat | `[W]` Zanzibar ATC 2019 §2.4.3, §3.2.4 |
| **Marten (event store)** | An event with a database sequence number | Async daemon projections | Progress per projection | Sequence numbers are reserved before commit, so a reader that follows "highest seen" can pass an uncommitted lower number. The daemon tracks a **high-water mark** and only skips gaps proven dead. | `[WS]` Marten async daemon docs and release notes |

### 3.3 Proposed structure for Triplex

```
  commit (subject S, position p, facts f1..fk)
        |
        v
  +------------------+        change feed rows (p, entity, attribute, valid range)
  |  ledger          |-----------------------------------------------+
  |  (source of      |                                               |
  |   truth)         |                                               v
  +------------------+                              +-------------------------------+
                                                    | feed consumer (single fenced) |
   boundary timers  ------------------------------> |  1. read batch p1..pn         |
   (next valid_from /                               |  2. for each change:          |
    valid_to > now,                                 |     deps(entity) -> subjects  |
    per subject)                                    |     intersect valid range     |
                                                    |     with each run's instants  |
   definition tier                                  |  3. enqueue subject, keep max |
   (release / requirement version)  ------------->  |     position (coalesce)       |
   subjects-by-release index                        |  4. write checkpoint = pn in  |
                                                    |     the SAME transaction as   |
                                                    |     the queue and index rows  |
                                                    +---------------+---------------+
                                                                    |
                              +-------------------------------------+---------------+
                              v                                                     v
                      work queue (per subject,                          world-document cache
                      latest position wins)                              invalidation (section 6)
                              |
                              v
                      reconcile run at basis >= position
                      records read set -> updates reverse index
                      (early cutoff: output hash equal => no downstream enqueue)
```

### 3.4 Design points and costs

1. **Read-set granularity.** Entity level costs the least memory. Entity-and-attribute with a valid-time range (Convex's read ranges) is the most precise and the most memory. Salsa and Shake show the precise form is what makes early cutoff work. Index size is the sum over subjects of the entities each run read: at 10M subjects and about 50 distinct entities per run that is 500M edges `[E]`, too many to keep for cold subjects.
   - **Rule 1: do not store edges to high-degree entities.** TAO caches only contiguous prefixes of long association lists; Zanzibar reads and caches all tuples of a hot object instead of fanning out per request. For Triplex, release and requirement definitions are read by up to 100k subjects each. Track them with a single version fact per subject (the definition tier), not one edge per subject per definition.
   - **Rule 2: keep edges only for subjects that are warm.** Noria drops updates for evicted keys and rebuilds on demand (upquery). A cold subject has no read set; its first read after eviction recomputes it.
2. **Valid-time awareness.** A feed record names the valid-time range it changed. A run needs re-running only if that range intersects an instant the run evaluated, which is its basis instant plus its own boundary instants. A correction confined to a range that ended before every evaluated instant leaves the "now" state alone but still changes `explain` at old bases; the feed reports it and the consumer decides. This is the Convex read-set overlap test with time as an extra dimension.
3. **Boundary timers.** Time passing can change a result with no write (a document expiring at midnight, a start date arriving). Keep, per subject, the smallest `valid_from` or `valid_to` greater than now among the facts the last run read, in a min-heap or timer wheel. Materialize expresses the same thing as a temporal filter on `mz_now()` (its durable-subscriptions example filters `end_time < mz_now()`). Scenario 20 (20,000 documents expiring at midnight) puts 20,000 timers due at one instant, which is a sweep and must go through the lane in section 5.
4. **Gap-free assignment.**
   - **Today:** `committedPosition()` reads the scope's `position` row and `persist` asserts `MAX(position) = K` (`packages/xtdb/src/XtdbStorageAdapter.ts:92-103, 189-196`). Positions are dense and a missing number means a rolled-back or in-flight commit. The cost is that all commits in a scope contend on one counter (conflict and retry, or an admission queue).
   - **If commits become per-subject parallel:** take the position from a log offset (XTDB source-log message id; QLever log frame number) so order is assigned at the log, or keep Marten's rule, which is that a consumer advances only to the highest position below which no reserved number is outstanding.
   - **Postgres sequences and similar** assign numbers before commit, which is the Marten failure; do not poll "id greater than last seen" on such columns.
5. **Resumable with exactly-once effect.** The Kafka design document gives the rule: store the consumer's offset in the same place as its output. Triplex's `ConsumerCheckpoint` already uses compare-and-retract and is documented as at-least-once (`packages/core/src/operational/ConsumerCheckpoint.ts:1-7`). The change is to write the checkpoint and the queue and index rows in one transaction (XTDB: one DML transaction with `ASSERT` on the expected checkpoint; QLever: one guarded update, C2). Materialize states the same rule for subscribers: persist the data and the progress timestamp together.
6. **Retention for resume.** Postgres slots, CockroachDB protected timestamps (4 days, then the changefeed fails) and Materialize `RETAIN HISTORY` all have a resume horizon. Triplex's ledger is the append-only source of truth, so the feed can always be replayed from any position; the cost is scan time, not data loss.
7. **Feed read cost on XTDB.** R7 found that non-`_id` predicates scan. A feed table read by position needs an order-preserving UUID `_id` (position in the high bits), which gave 9 to 14 ms for numeric range reads against 0.4 to 1.1 s unclustered at 3M rows `[P R7 Q1]`. Today's `transactions({after, limit})` reads every `_Transaction` row per page (`[P R9 §2.1]`).
8. **Feed read cost on QLever.** The feed is the log of record read sequentially by frame number; the engine is not involved (C2).
9. **Early cutoff needs deterministic runs.** The reconcile must be a pure function of its recorded reads. Triplex's kernel already forbids reads that mutate (C8); the open question is whether time (`now`) is an explicit input. If it is, the boundary timer covers it.

### 3.5 Fit and costs by engine

| | XTDB | QLever |
|---|------|--------|
| **Feed** | A feed table whose `_id` is an order-preserving UUID carrying the position, so the consumer reads `_id` ranges instead of scanning (section 3.4 item 7). | The log of record read by frame number (C2). |
| **Dependency index and queue** | Tables in the same engine as the checkpoint. Per-edge rows with value-clustered `_id` gave 4.5 ms inserts and 22 to 42 ms lookups at 3M edges; one array row per entity works up to about 10^4 ids and then needs paging `[P R7 Q3]`. Write only the **difference** between a run's old and new read set, so an unchanged run writes nothing. | Not in QLever. A small update costs a fixed 22 ms at 100k delta triples and 203 ms at 1M, and a 1,000-triple update p50 was 455 to 1,755 ms under 4 readers `[P R8 §3, §2.2]`. One update per feed batch would use most of the 250 ms lag budget. Keep the dependency index and checkpoint in a store with cheap small transactions (XTDB tables, or a local embedded store) and let QLever stay a read layer `[E]`. |
| **Checkpoint in the same transaction** | One DML transaction with `ASSERT` on the expected checkpoint position. | In the other store's transaction; the QLever read layer then follows the same log and publishes its own marker. |
| **Write cost** | Edge writes are proportional to read-set changes, not to runs. At about 1.1 commands/s steady and 55 in a burst, with about 50 entities per run, a worst case of rewriting every edge is 55 and 2,750 edge rows/s `[E]`, inside R7's 5k to 9k rows/s per connection; diffing makes the real figure much smaller. | Not applicable. |
| **Memory** | Index lives on disk; only warm subjects have edges (Rule 2). | The cache and queue live in the runtime process. |

---

## 4. Read-your-own-write with derived layers

### 4.1 Verdict

1. **Same-transaction maintenance has zero wait and a real write cost.** SQL Server documents that DML on a table referenced by many or complex indexed views can slow down significantly. The Record Layer reports about 8.5 records and 34.5 index key writes per transaction, roughly 4 index writes per record `[W]`.
2. **A position token has a wait equal to the layer's lag.** That is acceptable only off the hot path, because P2 requires the pull at the returned tx to see the commit 100% of the time with no extra wait, and P3's lag bar is 250 ms p99.
3. **Tokens are monotone lower bounds.** Zanzibar's zookie, XTDB's await token and Datomic's `sync(t)` all mean "at least as fresh as". That gives the system freedom to serve a fresher shared snapshot, which is what makes shared snapshots and interval-based cache hits (sections 1.5 and 6.3) compatible with read-your-own-write.

### 4.2 Mechanisms

| Technique | Wait | Extra write cost | Failure mode | Source |
|-----------|------|------------------|--------------|--------|
| Same-transaction maintenance | None | Derived rows ride in the commit | Slower commits; a bug in the derived write fails the command | SQL Server indexed views; Record Layer; XTDB DML transaction; Triplex adapter (rows, claims and meta persisted in one statement list, `XtdbStorageAdapter.ts:189-270`) |
| Return the post-commit value | None | None | Only the committing process benefits | Datomic `transact` returns `:db-after`; `with` returns a speculative `:db-after` |
| Wait for position | Layer lag | None | Timeouts; needs a fallback | Datomic `sync(t)` (returns a database with basis at least `t` without contacting the transactor); XTDB `awaitAll`; Spanner `t_safe`; Kafka offset vs consumer position |
| At-least-as-fresh token | Small | None | The server must be allowed to pick a later snapshot | Zanzibar §2.2 and §3.2.1; CockroachDB bounded staleness |
| Write-through with version numbers | None for the writer's tier | Invalidation messages | Late invalidations must be ignorable | TAO §4: a version number in the maintenance message lets a late message be ignored; read-after-write holds for clients sharing a cache (§6.1) |
| Strict serializable default | Bounded by freshness choice | None | Block until upstream data arrives | Materialize: queries run within a few seconds of wall clock; `real_time_recency` adds waiting for external sources |
| Eventual only | Unbounded | None | Cannot give read-your-own-write | Noria and ReadySet ("a small delay"); CockroachDB stale follower reads by design |

### 4.3 Fit for Triplex

**XTDB.**

1. **Within one connection the guarantee is automatic** ("queries are guaranteed to at least see the results of every transaction submitted through that connection", `docs/.../about/txs-in-xtdb.md:42`).
2. **Across connections it is not** ("you likely will, but it's not guaranteed", line 45). The token is a map from database to tx ids, merged on each write (`api/Xtdb.kt:280-282`), and `awaitAll` waits on a state flow of the latest processed tx before any query or DML (`database/Database.kt:630-650`, `api/log/Watchers.kt:14-80`, `Xtdb.kt:444, 688-690`).
3. **`DISCARD ALL` clears the token** (`resetSession` sets `awaitToken = null`, `Xtdb.kt:719-727`). A pooled client must therefore send `BEGIN READ ONLY WITH (AWAIT_TOKEN = '...')` per read, or set it after every checkout, and not rely on session state surviving.
4. **On a follower the wait equals replica-log lag.** Reads that carry a token on a follower node pay that lag; token-less reads do not.
5. **The world-document cache (section 6) must be written by the committing path.** The Triplex runtime that committed the command updates or invalidates the cache entry before it returns the receipt, as TAO's write-through does. An asynchronous feed consumer cannot do this within the P2 bar.

**QLever.**

1. **On the single server publication gives the guarantee.** HTTP 200 means all six permutations were updated, consolidated and published, and the snapshot is published only after the whole function returns (`DeltaTriples.cpp:516-565`, `[P R8 §1.4]`). A request that starts after the 200 sees the update, because one request takes one snapshot at construction.
2. **A read layer fed from the log is behind the ACK.** Its token is the layer's published marker `(epoch, position)`. A reader holding token T polls the marker until it is at least T, with a timeout, and on timeout takes the exact path in the source of truth (C1 already requires this).

**Costs.** For the cached current document, the extra work at commit is a lookup in the reverse index plus one invalidation per affected entry (section 6). For a synchronously maintained current table in XTDB, 10 facts add roughly 10 rows (about 1 to 2 ms by R7's insert rate `[E]`). Compare with an asynchronous layer at the P3 bar: up to 250 ms p99 wait.

---

## 5. Large sweeps without hurting live traffic

### 5.1 Verdict

1. **Pin a position, read in short pages, persist a cursor.** Spanner repeats the timestamp and the current read position to continue a query elsewhere; the Record Layer returns an opaque continuation so scans longer than a transaction limit continue across transactions; FDB's backup splits the key space into ranges that each fit in 5 seconds.
2. **Control admission from a latency signal.** CockroachDB admits elastic work only while scheduler p99 stays under 1 ms and grants CPU in 100 ms token slices; ScyllaDB assigns shares; FDB throttles batch priority before default priority.
3. **Put sweeps on a separate instance when the budget allows.** Datomic directs each load pattern to different peers; Spanner offers Data Boost for partitioned batch reads; XTDB 2.2 has follower nodes.
4. **The measured damage of doing nothing is large, and control recovers most of it but not necessarily down to 1.5x.** ScyllaDB's best shares result still left OLTP p99 at roughly 2 to 3.5 times its solo value (4 to 7 ms against 2 ms or less), and CockroachDB's 60 ms is not compared with a no-backup baseline in the post. The P5 bar of 1.5x is stricter than these published results, so reaching it probably needs a low sweep rate or a separate instance.
5. **Pin cost differs by engine.** Time-bounded (XTDB, FDB, Spanner, CockroachDB, Datomic) means a sweep within the window costs nothing in retention. Reader-tracked (LMDB, PostgreSQL, differential dataflow) holds back reclamation for the sweep's duration.

### 5.2 What a held snapshot costs in each system

| System | Cost of a long pin | Bound | Source |
|--------|--------------------|-------|--------|
| XTDB 2.2.0 | No retention cost. Memory for the displaced live block if the same `Snapshot` object is held across a block flush (every 102,400 rows or 15 min). A snapshot held longer than `garbageLifetime` can lose files. | 24 h default | `[S]` `Snapshot.kt`, `LiveIndex.kt:140-153`, `TrieCatalog.kt:39-41` |
| QLever 0.6.0 | One deep copy of the delta per distinct snapshot a running query holds; 0.75 to 1.3 GB per million delta triples | `-s` timeout, `-j` | `[P R8 §6.3]` |
| FoundationDB | None; the read fails after 5 s | 5 s | `[W]` |
| LMDB | Pages freed by newer writers cannot be reused; the file grows | Reader lifetime | `[S]` `lmdb.h:107-110` |
| PostgreSQL | The oldest running snapshot holds the vacuum horizon (dead rows stay); a replication slot holds WAL and catalog rows with no consumer connected; wraparound shutdown in extreme cases | Operator action, `max_slot_wal_keep_size` | `[W]` PostgreSQL "Routine Vacuuming", "Logical Decoding Concepts" |
| Differential dataflow | Compaction is blocked while a handle holds an old frontier | Handle advance or drop | `[S]` book `chapter_5_3.md:89-95` |
| CockroachDB | Protected timestamps hold GC for jobs; changefeeds fail after `protect_timestamp.max_age` (4 days) | Setting | `[W]` |
| Spanner | Reads older than `version_retention_period` (1 h default) fail | 1 h to 7 days | `[W]` |

### 5.3 Lane mechanisms and reported impact

| Mechanism | Setup and reported effect | Source |
|-----------|--------------------------|--------|
| **Elastic CPU token bucket with a latency controller** (CockroachDB) | Backups on a 3-node 8-vCPU TPC-C run. Elastic CPU allowed between 5% and 75%, tuned so scheduler p99 stays at or under 1 ms, tokens granted in 100 ms slices. Before the controller, p99 latency reached more than 10 s. After it, p99 was 60 ms. The post also finds request p99 about 22x the scheduler p99 when a request crosses about 10 goroutine handoffs. | `[W]` CockroachDB blog "Rubbing control theory on the Go scheduler" |
| **Shares** (ScyllaDB) | OLTP p99 at or under 2 ms alone, 11 to 12 ms with an OLAP job and no prioritization, 4 to 7 ms with shares 1000 for OLTP and 10 for OLAP. The post notes that shares give only an approximate balance. | `[W]` ScyllaDB blog "Workload prioritization" (Figures 6 and 8) |
| **Batch priority throttled first** (FoundationDB) | The Ratekeeper's storage-queue target is 1000e6 bytes for default priority and 750e6 for batch; an auto-throttled tag has its default rate reduced and its **batch priority transactions stopped completely**. | `[S]` `fdbclient/ServerKnobs.cpp:870-875 @ release-7.3`; `[W]` FDB "Transaction tagging" |
| **Token buckets with burst credit** (DynamoDB) | Per-partition admission control with burst capacity from unused capacity held for up to 300 seconds. | `[W]` DynamoDB ATC 2022 §4.1.1 |
| **Limits plus continuations plus throttling** (Record Layer) | Per-request record and byte limits; when hit, the full state returns as a continuation. Because each unit is small, rate-based throttling works better, and the authors say all clients keep making progress under stress. Index builds run as many transactions while the index is in a write-only state. | `[W]` Record Layer SIGMOD 2019 (Client Resource Isolation; Online index building) |
| **Batch reads at one timestamp** (Spanner) | A batch read-only transaction partitions a query and runs partitions in parallel at one timestamp; the Data Boost option uses separate compute. When a server fails, the client continues the read on another server by repeating the timestamp and the current read position. | `[W]` Cloud Spanner "Reads" (Read data in parallel); Spanner OSDI 2012 §4.2 |
| **Separate instances per load pattern** (Datomic) | The overview says one system can serve very different load patterns by sending each pattern to a different set of instances. | `[W]` Datomic Overview (Indexes) |
| **No control** (QLever, this lab) | Rebuild during a 4-reader 1-writer run: point-lookup p50 44.8 to 75.5 ms (+69%), rate 50.9 to 32.2/s, top-10 scan p99 929 ms to 1,607 ms; at `-j 1` lookups stalled up to 7.46 s. | `[P R8 §2.2]` |
| **Admission queues by priority and start time** (CockroachDB) | Work queues ordered by priority then transaction start time; documented warning that high priority can starve low priority until timeout. | `[W]` CockroachDB "Admission control" |

### 5.4 Proposed lane for Triplex

```
   live readers (UI, reconcile pulls, trace)            release activation / midnight expiry
              |                                                    |
              v                                                    v
     +-------------------+                               +-------------------+
     | live lane         |                               | sweep lane        |
     |  concurrency cap  |                               |  cursor (P_sweep, |
     |  = c cores        |                               |   last subject)   |
     |  queue delay      |<---- live p99 / queue delay --|  AIMD worker count|
     |  measured         |      vs baseline ratio        |  page = 64..256   |
     +---------+---------+                               |  subjects, pulls  |
               |                                         |  at one basis     |
               |                                         +---------+---------+
               v                                                   v
       engine (XTDB leader or follower; QLever -j N, FIFO)  <------+
       Rule: sweep pages are short enough that FIFO wait <= one live p99.
```

1. **Pinned position.** The sweep records `P_sweep` (a Triplex position) at the start and every page reads at that basis. XTDB: snapshot token plus the system-time bound; QLever: `rp <= P_sweep` in each request (`[P R8 §4]`). A page is one short request, so no engine snapshot lives longer than a page.
2. **Cursor.** `(P_sweep, last subject key)` persisted every page, as in the Spanner and Record Layer designs. A crash or a deliberate pause resumes with no repeats and no gaps; this is also how a sweep yields to a 60 s write burst.
3. **Admission.** Start with 1 worker and add one worker per interval while live p99 stays under 1.25x its no-sweep baseline; halve the workers when it passes 1.4x. The thresholds are my starting values `[E]`; CockroachDB's controller does the same with scheduler delay as the signal. Triplex can measure the queue delay at its own live lane (time from enqueue to engine start), which is the closest signal it controls.
4. **Arithmetic.** 100,000 pulls at 1,100/s is 91 s on one core `[E]`. During the writer trace's burst (550 to 5,500 pulls/s `[E]`) the live lane alone uses 0.5 to 5 cores, so a one-core sweep cannot both finish in 100 s and protect live p99 when the burst overlaps it. Hitting P5 under a burst needs spare cores or a follower node; the lane controller keeps the sweep from taking cores the burst needs.
5. **Scan resistance.** A sweep touches every subject once; it should not evict the live working set from the world-document cache. Keep the sweep's refills out of the live cache (or in a small separate region), and let the sweep use the shared engine page caches only.
6. **Fit.** XTDB: pages read by `_id IN (...)` over entity-clustered UUIDs are 5.5 ms per 1,000 keys against 330 ms for hashed keys `[P R7 Q2]`, which is why page-sized batches of subjects should be chosen by key prefix. QLever: one `VALUES` batch per page; the pool is FIFO, so keep each page well under the live p99.

### 5.5 Costs

- Controller and cursor: small, in the runtime (about a day of work).
- Follower node for XTDB: one more process and its caches; shares the object store; lag is the replica-log lag.
- Second read-only QLever instance for sweeps: doubles delta and rebuild work; only worth it if the controlled lane misses the 1.5x bar.

---

## 6. Bounded subgraph pulls at a version

### 6.1 Verdict

1. At 1,100 pulls/s per core each pull has about 0.9 ms (the reconcile reference is 0.8 ms per worker). Assembling 50 to 2,000 facts across 3 to 6 hops from an engine in that time is not plausible without clustering or caching `[E]`.
2. The pattern that removes the work is a **per-subject world document** held in the runtime, with a validity interval on positions and dependency-driven invalidation. Reads become a map lookup plus a deserialization; the exact pull runs only on a miss.
3. Round-trip reducers (Datomic pull patterns, DataLoader batching) matter for the miss path, especially on QLever's small FIFO pool.

### 6.2 Mechanisms

| Mechanism | What it does | Costs and limits | Source |
|-----------|--------------|------------------|--------|
| **Datomic pull** | Declarative pattern with nested map specs, reverse navigation (`:release/_artists`), recursion limits (number or `...`), `:limit` defaulting to the first 1000 values of a cardinality-many attribute. Runs in the peer against cached immutable segments, so the extra hops cost cache lookups, not round trips. | One result per pattern; no cross-pull batching other than `pull-many`. | `[W]` Datomic "Pull" |
| **GraphQL DataLoader** | Collects all loads in one tick of the event loop, calls one batch function with all keys, and memoizes per request. | Per-request cache only; batching is per tick. | `[W]` `graphql/dataloader` README (Batching, Caching) |
| **TAO** | Objects plus time-ordered association lists in a leader and follower cache tier; writes go to the leader, which sends invalidation or refill messages to followers; messages carry a version number so a late message can be ignored; only contiguous prefixes of long lists are cached. | Eventual consistency, with read-after-write for clients sharing a cache. | `[W]` TAO ATC 2013 §4, §6.1 |
| **Zanzibar caches** | Cache keys include the evaluation timestamp; timestamps are quantized to 1 or 10 s so many requests share entries; a lock table lets one request per key compute while others wait (cache-stampede control); a hot object's whole tuple set is read and cached. | Requires a quantization policy; the lock table needs care with cancellation. | `[W]` Zanzibar ATC 2019 §3.2.5 |
| **Noria / ReadySet partial state** | Only requested keys are materialized; the first read triggers an upquery; updates for evicted keys are dropped and rebuilt on demand; eviction is LRU or random. | Latest state only, eventually consistent. On the Lobsters benchmark, full state needs 789 MB (8x the 137 MB base tables); with partial state only 9% of state is essential, and at 10x scale the working set was 2.6 GB (38% of 7 GB total state) for sub-100 ms p95 at 2,300 pages/s. | `[W]` Noria OSDI 2018 §3, §8.4 (State size); ReadySet "Deep caching" |
| **Event-sourcing aggregate snapshots** | Snapshot every N events so rehydration replays only recent events; snapshots are an optimization that can be regenerated from the stream. | A snapshot is a cache; the stream remains the truth. | `[W]` Azure "Event Sourcing pattern" |
| **Convex query read sets** | A query's read set decides when its subscription result is stale. | Requires recording read ranges per query run. | `[W]` Convex "How Convex Works" |

### 6.3 World-document cache with a position validity interval

```
   entry for subject S, built by one exact pull at basis B:
   +-----------------------------------------------------------------------+
   | doc:  50..2,000 facts (bytes)                                         |
   | deps: entities and (attribute, valid range) read, with the position   |
   |       of the last change to each (changed_at)                         |
   | validFrom = max(changed_at over deps)    <= B                         |
   | validTo   = open, set to q when the feed reports a change to any dep  |
   |             at position q                                             |
   +-----------------------------------------------------------------------+

   position axis   ----|----------|-----------------|------------------->
                  validFrom      B (build)       validTo=q (dep changed)
                       [=============== exact for any basis here ==========)

   serve a read at basis X iff validFrom <= X < validTo
   (also needs X <= position the cache has seen from the feed/committing path)
```

1. **Why this is exact.** Between `validFrom` and the first later change to any dependency, nothing the pull read has changed. The document at B is therefore the document at every basis in that interval, including bases before B. This is Salsa's `changed_at` and `verified_at` logic expressed in positions.
2. **Reads at recent past bases.** For a subject that has not changed since X, an as-of pull at X is a hit. With about 1.1 commands/s spread over millions of subjects, most subjects are unchanged over the last hour `[E]`, so explain reads at recent bases are mostly hits; X1 measures the hit rate against the generator's skew.
3. **The reverse index is the invalidator.** A write to entity e finds the documents that include e (including documents of other subjects that reference e) and sets their `validTo`. This is the same index that drives the feed (section 3). Cost per write is the number of affected cached documents, not the cache size.
4. **Refill is lazy and single-flight.** After invalidation the entry stays absent until the next read; one request recomputes while others wait (Zanzibar lock table), which avoids the stampede the Noria paper also describes for look-aside memcached. Since 10 to 100 reads follow each write `[TARGETS §2]`, at least (R-1)/R of reads hit when reads concentrate on the written subject, which is 90% at R = 10 and 99% at R = 100 `[E]`.
5. **Memory.** At about 150 bytes per fact, a 50 to 2,000 fact document is 7.5 KB to 300 KB `[E]`; 10,000 warm subjects at a mean of 500 facts is about 750 MB. The steady write rate (1.1 commands/s) means few subjects are written per hour, so a cache of 10k to 50k subjects covers the reconcile-after-write pattern without holding 10M subjects.
6. **Failure and fallback.** Any miss, any stale `validTo`, any process restart, and any read whose basis is outside the interval takes the exact path. The cache is a function of the ledger and can always be rebuilt (C1, C8).

### 6.4 Fit and costs by engine

**XTDB.**

1. **The miss path needs clustering.** R7 measured 1,000 prefix-sharing UUID `_id`s in 5.5 ms against 330 ms for hashed ids, and about 0.5 s to fetch roughly 3,000 scattered entities. Make `_id` an entity-clustered UUID so a subject and its near neighbours fall on few pages `[P R7 Q2, "Where _id-first fails" item 2]`.
2. **Hops are separate lookups unless joined.** A 3 to 6 hop pull is 3 to 6 `_id IN` fetches or one joined query; R10 and R12 give the recursion and `pull` forms (`R1 §Q4`: `pull`, `pull*` work, `xtql.clj:141`).
3. **Document-per-subject stored in XTDB is risky.** R7 measured array-document updates at 15 to 25 ms up to 3,000 ids, so a stored world row would break the 10 ms commit p50 bar; the cache belongs in the runtime.

**QLever.**

1. **The miss path is one SPARQL request per pull** (R10's property-path shape), each with its own delta snapshot, on a `-j` pool of about 4 threads. A batch of several subjects in one `VALUES` request reduces per-request overhead, in the DataLoader style, at the cost of a longer FIFO hold.
2. **The cache matters more here** because the earlier lab run measured 44.8 ms point-lookup p50 at 99M triples under load `[P R8 §2.2]`, far above the 5 ms P4 bar. The world-document cache is the main route to the P4 bar on this lane, with SPARQL kept for misses, ranges and analytics.

---

## 7. Five experiments, ranked

Ranking rule: expected effect on the higher-ranked priority first, using Sam's order among the four this report covers (P1, P3, P4, P5), weighted by how much of the bar the change can close. X2 is cheap enough to run in parallel with X1 and X3. Each proposal plugs into the EXP-N01 `Composition` interface (writer, subject-pull reader, feed reader, sweep reader), reports a delta on matched NS runs, and is judged against the bars in `lab/TARGETS.md` section 1.

### X1. World-document cache with a validity interval (P1, P4)

**North star.** P1: read goodput at 64, 256 and 1,024 readers and writer commit p99 ratio. P4: single-client pull p50 and p99, pulls/s per core.

**Arms** (both lanes, NS 10k and 100k rungs, fixed writer trace running):

1. A: today's subject pull, one basis per read.
2. B: A plus the world-document cache (byte-bounded LRU, 512 MB) for current-basis reads only: push invalidation from an in-process reverse index, write-through invalidation by the committing path before the receipt returns, single-flight refill.
3. C: B plus the validity-interval check, so reads at past bases are served from the same entries.

**Predictions (each can fail).**

1. In B and C, at least 85% of current-basis pulls hit the cache on the fixed trace (misses are the first read after a write; reads concentrate on the written subject). If the hit ratio is under 70%, reads have too little locality and the cache does not pay.
2. A hit costs at most 0.3 ms p50 in process, and B reaches at least 5,000 pulls/s per core on hits against the 1,100 bar. A miss costs the same as in A.
3. At 256 readers, B keeps goodput at or above its 64-reader level (the P1 bar) and writer commit p99 at or under 1.25x baseline. If A falls below the 64-reader goodput at 256 on either lane while B does not, the cache is the cause; if A does not fall, the cache is a P4 gain only.
4. Zero correctness violations against O-REPLAY on at least 1,000,000 sampled reads, including reads at bases up to 1 hour old served by the interval check in C. At least 90% of as-of pulls at bases within the last hour are interval hits at the 100k rung (this depends on the generator's per-subject write skew; report the skew). If interval hits are under 50%, drop the interval check and keep B.
5. Diagnostic for XTDB: the number of snapshot rebuilds per second cannot exceed the commit rate, because one rebuild serves every reader that needs the same newer basis (`LiveIndex.kt:221-236`). Predicted rebuild cost is under 1% of a core at 100 live tables and 55 commits/s. If it exceeds 5% of a core or raises writer commit p99 above 1.25x, the rebuild under the write lock is a P1 bottleneck and the fix is fewer tables per command or a rounded basis.

**Cost.** About one day for the cache, interval logic and bench arms.

### X2. Current-tier flatness: XTDB native split against an explicit current table, QLever second index (P4, P1)

**North star.** P4: "current-pull latency and bytes read stay flat as retained history grows (depths 1, 3, 10)".

**Setup.** 100k subjects, about 200 facts each, history depths 1, 3 and 10 made by retroactive corrections and supersessions. Two fact populations: all open-ended, and 20% with finite future `valid_to` spread over 1 to 52 weeks. XTDB layouts: (a) one bitemporal table; (b) a `cur_*` table written in the same transaction as the ledger; (c) both. QLever layouts: (d) current and history as two graphs in one index; (e) a second, current-only index.

**Predictions.**

1. XTDB (a), open-ended facts: `scan_pages_used` and `scan_rows_read` within 10% across depths 1, 3 and 10 (recency pruning at `trie.clj:113-118`).
2. XTDB (a), with 20% expiry facts spread over at least 26 weeks: pages used grows by at least 2x from depth 1 to depth 10, because future-recency historical files are not pruned for a "now" query. If it stays flat, the source reading in section 2.3 is wrong and no explicit current table is needed.
3. XTDB (b): flat in both populations, with commit p50 at most 3 ms higher than (a) for a 10-fact command. If the extra commit cost is over 5 ms, (b) is not worth building.
4. QLever (d): pull latency rises by at least 1.5x from depth 1 to depth 10; (e) stays within 10%. If (d) is flat, a second graph suffices and the second index is dropped.

**Cost.** About half a day on XTDB (the instrument exists from R7); about a day on QLever (second index build).

### X3. Read-set dependency index with a transactional checkpoint (P3)

**North star.** P3: zero gaps, zero order violations per subject, lag p99 at most 250 ms with 256 readers, exact resume from a checkpoint.

**Setup.** Record read sets during reconcile runs (entity, attribute and valid range, plus a definition-version tier). Build the reverse index, boundary timers and early cutoff. The consumer writes queue rows, index rows and its checkpoint in one transaction. Run the NS trace and scenarios 3, 8, 9, 19 and 20 on a 10k world, with an oracle that re-runs every subject after every transaction offline.

**Predictions.**

1. **Misses:** zero. Over at least 100,000 commits, including 1% retroactive corrections and the midnight expiry wave, no subject whose output changed fails to be enqueued. A single miss fails the design.
2. **Lag:** p99 at most 250 ms to "affected subjects known" at 256 readers on the 100k rung, on both lanes.
3. **Crash safety:** killing the consumer at random points 100 times gives zero gaps and zero duplicated effects when the checkpoint shares the transaction. A control arm with the checkpoint in a separate transaction shows at least one duplicated effect in 100 kills; if it does not, the test cannot detect duplicates and its result is void.
4. **Precision:** entity-level read sets cause at least 2x more re-runs than entity-and-attribute-and-range read sets in the retroactive correction scenario, and the finer index is at most 2x larger. If the coarse index re-runs fewer than 1.3x as many subjects, use the coarse one.
5. **High-degree rule:** storing per-subject edges to release definitions inflates the index by at least 10x against the definition-version tier and adds no precision.

**Cost.** About a day and a half. It is the prerequisite for durable invalidation in X1 and for X5.

### X4. Lane-controlled paged sweep (P5, P1)

**North star.** P5: sweep 100k subjects at one pinned basis, wall time at most 100 s, live read p99 and writer commit p99 each at most 1.5x their no-sweep values, no writer or compaction blocked.

**Arms** (64 live readers plus the fixed writer trace, a 4-core slot):

1. Uncontrolled: 8 sweep workers, no cursor.
2. Fixed 1 worker with a persisted cursor.
3. AIMD on live queue delay and p99 ratio (thresholds in section 5.4).
4. Arm 3 against a read-only follower (XTDB) or a second read-only server (QLever).

**Predictions.**

1. Arm 1: live read p99 at least 3x baseline on QLever (FIFO pool, per R8's head-of-line blocking) and at least 2x on XTDB at 4 cores, with the sweep finishing in under 100 s. If arm 1 stays under 1.5x, lanes are not needed on that composition.
2. Arm 2: live p99 at most 1.5x, but sweep time over 100 s if one worker sustains less than 1,000 pulls/s.
3. Arm 3: both bars met outside a writer burst; during a burst the sweep pauses, so total sweep time is at most 100 s plus the burst duration (60 s). Published controlled results (ScyllaDB 2 to 3.5x) are weaker than the 1.5x bar, so a miss on live p99 in this arm is plausible and would point to arm 4.
4. Arm 4: both bars met including bursts on XTDB; if not, replica-log lag on the follower is the cause and it is reported.
5. Pin cost: on XTDB, a sweep read through per-page snapshots holds no more memory than the live-index high-water mark plus one page; one long `Snapshot` held across a block flush holds one extra live block. Killing the sweep at a random page and resuming yields the same per-subject outputs as an uninterrupted run (zero differences over 10 kills).

**Cost.** About one day.

### X5. Blast-radius sweep with early cutoff (P5, P3)

**North star.** P5: sweep wall time and live-latency impact; P3: the dependency tiers reused.

**Assumption.** The reconcile result decomposes into per-requirement nodes. If it is one function per subject, only subject-level skipping is available and the prediction below weakens.

**Setup.** Memoize per (subject, requirement) results with their recorded inputs and positions. For a release that changes 3 requirements, mark only nodes whose recorded definition version changed (HIGH durability tier), validate every other node in O(1) from the subject's last-change position, recompute marked nodes from the cached world document, and compare with a full re-pull of all 100k subjects (scenario 11 requires identical answers).

**Predictions.**

1. Output identical to the full sweep for 100% of subjects.
2. With each requirement applying to 5% to 30% of subjects, node recomputations are at most 3 x 30% x 100,000 = 90,000 and typically about 3 x 5% x 100,000 = 15,000; wall time is at most 25 s on one core against 91 s for the full sweep.
3. Memo validation costs under 50 microseconds per subject, so validating all 100k takes at most 5 s.
4. Falsifier: if the changed requirements' applicability reads shared hot facts, so that more than 50% of nodes are invalidated, or if validating a memo needs the full pull, the speedup is under 2x and the full sweep stays.

**Cost.** About one and a half days after X1 and X3 exist.

### Why this order

| Rank | Experiment | Priorities | Reason |
|------|------------|-----------|--------|
| 1 | X1 | P1, P4 | Highest-ranked priorities; one change attacks both the 1,100 pulls/s bar and the 256-reader goodput bar. |
| 2 | X3 | P3 | Correctness and lag for the feed, and it provides the durable index X1 and X5 need. |
| 3 | X2 | P4 | Cheap, and decides whether an explicit current table is built at all. |
| 4 | X4 | P5, P1 | Decides whether the 100 s and 1.5x bars are reachable with a controlled lane. |
| 5 | X5 | P5, P3 | Largest possible P5 speedup, but depends on how decomposable the reconcile is. |

---

## 8. Open items and risks

1. **Unmeasured claims.** The XTDB snapshot-rebuild contention (section 1.3), the expiry-fact handling by recency (section 2.3), and every `[E]` number are inferences. Each has an experiment above that can contradict it.
2. **Vendor numbers.** CockroachDB and ScyllaDB results are vendor blogs on different workloads and hardware. They show the direction and rough size of the effect, not what Triplex will see.
3. **`[WS]` rows.** MariaDB partitioning and Marten high-water mark behavior come from search summaries. The Marten and MariaDB rows are consistent with their documentation as summarized; verify before quoting in a design document.
4. **FoundationDB figures** come from the 2021 paper and release-7.3 knobs; later releases may differ.
5. **Datomic `t` density** (whether consecutive transactions have consecutive `t`) was not checked; the report does not rely on it.
6. **Position semantics under per-subject concurrency** are Sam's call on the P2 side; section 3.4 item 4 gives the two feed options for each answer.
7. **Decision for Sam:** whether history for high-churn attributes may be dropped (Datomic `noHistory`). I did not assume yes.

---

## 9. Source index

Local copies are under `/Users/sam/Claude/Projects/triplex-db-2/R18-read-path/`.

| Short name | URL | Local copy |
|------------|-----|-----------|
| Datomic Overview, Capacity, Filters, Log, Pull, Best practices, API | https://docs.datomic.com/datomic-overview.html ; https://docs.datomic.com/pro/operation/capacity.html ; https://docs.datomic.com/reference/filters.html ; https://docs.datomic.com/reference/log.html ; https://docs.datomic.com/pro/query/pull.html ; https://docs.datomic.com/reference/best.html ; https://docs.datomic.com/clojure/index.html | `raw/datomic/*.txt` |
| XTDB 1.x API and source | https://v1-docs.xtdb.com/clients/clojure/ ; https://github.com/xtdb/xtdb/tree/1.24.4/core/src/xtdb | `raw/xtdb1/` |
| XTDB 2.2.0 docs and source | `/Users/sam/projects/triplex-db-2/references/xtdb` | pinned clone |
| QLever 0.6.0 source | `/Users/sam/projects/triplex-db-2/references/qlever` | pinned clone |
| Materialize durable subscriptions, SUBSCRIBE, isolation | https://materialize.com/docs/markdown-docs/serve-results/durable-subscriptions/index.md ; https://materialize.com/docs/markdown-docs/sql/subscribe/index.md ; https://materialize.com/docs/serve-results/isolation-level/ | `raw/mz/` |
| Shared Arrangements (VLDB 2020) | https://www.vldb.org/pvldb/vol13/p1793-mcsherry.pdf | `raw/shared-arrangements-vldb20.pdf` |
| Differential dataflow (CIDR 2013); book | https://www.cidrdb.org/cidr2013/Papers/CIDR13_Paper111.pdf ; https://github.com/TimelyDataflow/differential-dataflow | `raw/differential-cidr13.pdf`; `clones/differential-dataflow` @ e7c2470 |
| Noria (OSDI 2018) | https://www.usenix.org/system/files/osdi18-gjengset.pdf | `raw/noria-osdi18.pdf` |
| ReadySet deep caching | https://readyset.io/docs/concepts/deep-caching | `raw/rs/` |
| FoundationDB paper; knobs; docs | https://www.foundationdb.org/files/fdb-paper.pdf ; https://github.com/apple/foundationdb/blob/release-7.3/fdbclient/ServerKnobs.cpp ; https://apple.github.io/foundationdb/known-limitations.html ; https://apple.github.io/foundationdb/transaction-tagging.html | `raw/fdb-sigmod21.pdf`; `raw/fdb/` |
| FoundationDB Record Layer | https://www.foundationdb.org/files/record-layer-paper.pdf | `raw/record-layer-sigmod19.pdf` |
| LMDB header | https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/lmdb.h | `raw/lmdb/lmdb.h` |
| Spanner (OSDI 2012); Cloud Spanner docs | https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf ; https://cloud.google.com/spanner/docs/reads ; https://cloud.google.com/spanner/docs/pitr | `raw/spanner-osdi12.pdf`; `raw/spanner/` |
| Zanzibar (ATC 2019) | https://www.usenix.org/system/files/atc19-pang.pdf | `raw/zanzibar-atc19.pdf` |
| TAO (ATC 2013) | https://www.usenix.org/system/files/conference/atc13/atc13-bronson.pdf | `raw/tao-atc13.pdf` |
| DynamoDB (ATC 2022) | https://www.usenix.org/system/files/atc22-elhemali.pdf | `raw/dynamodb-atc22.pdf` |
| CockroachDB docs and blog | https://www.cockroachlabs.com/docs/stable/follower-reads ; .../changefeed-messages ; .../protect-changefeed-data ; .../admission-control ; https://www.cockroachlabs.com/blog/rubbing-control-theory/ | `raw/crdb/`, `raw/blogs/crdb-rubbing.txt` |
| ScyllaDB workload prioritization | https://www.scylladb.com/2019/05/23/workload-prioritization-running-oltp-and-olap-traffic-on-the-same-superhighway/ | `raw/blogs/scylla-wp.txt` |
| PostgreSQL logical decoding, slots, vacuum | https://www.postgresql.org/docs/current/logicaldecoding-explanation.html ; .../view-pg-replication-slots.html ; .../routine-vacuuming.html | `raw/pg/` |
| Kafka design | https://kafka.apache.org/41/design/design/ | `raw/kafka/design.txt` |
| Salsa | https://github.com/salsa-rs/salsa (book/src/reference) | `clones/salsa` @ 6d59529 |
| Adapton (PLDI 2014) | http://matthewhammer.org/adapton/adapton-pldi2014.pdf | `raw/adapton-pldi14.pdf` |
| Build Systems à la Carte (ICFP 2018) | https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf | `raw/build-systems-alacarte.pdf` |
| Convex | https://stack.convex.dev/how-convex-works | `raw/blogs/convex.txt` |
| SQL Server temporal tables; indexed views | https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables ; .../views/create-indexed-views | `raw/misc/` |
| SQL:2011 temporal features (SIGMOD Record 2012) | https://sigmodrecord.org/publications/sigmodRecord/1209/pdfs/07.industry.kulkarni.pdf | `raw/sql2011-temporal.pdf` |
| Azure event sourcing | https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing | `raw/misc/azure-eventsourcing.txt` |
| GraphQL DataLoader | https://github.com/graphql/dataloader | `raw/misc/dataloader-README.md` |
| MariaDB, Marten (search summaries) | https://mariadb.com/kb/en/system-versioned-tables/ ; https://martendb.io/events/projections/async-daemon.html | none (not opened in full) |
| Lab reports used | `lab/research/R1`, `R2`, `R7`, `R8`, `R9`, `R10`, `R12` | in repo |

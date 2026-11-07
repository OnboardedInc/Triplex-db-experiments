# R19: XTDB 2.2.0 read nodes, the commit floor, connection scaling, and tenancy with storage-layer isolation

**Written:** 2026-11-07. **North star:** P1 (many concurrent pinned reads that never block writers) first, P2 (low-latency per-subject commits) second, plus the storage-layer tenant isolation requirement (`lab/SCOPE.md` section 2 item 3, `lab/TARGETS.md` section 3, GS.14 and GS.15). Goals and bars come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

**Builds on:** R16 (all), R18 sections 3 to 5, R13 (fsync numbers), R2 and R8 (QLever sizes). R17 is not in `lab/research/` yet; its raw directory exists but its tenant probe (`R17-qlever-northstar/scripts/tenants.py`) has produced no output, so QLever numbers here come from R2, R8, R18 and QLever source.

## How to read this report

- **Evidence labels.** `[S]` pinned source, cited `path:line`, XTDB at `references/xtdb` (v2.2.0, sha c6c1962), QLever at `references/qlever` (v0.6.0, sha 6c5861a). `[D]` XTDB docs under `references/xtdb/docs/src/content/docs/`. `[P]` earlier lab report. `[W]` web page I fetched. `[WS]` web-search summary I did not open in full. `[E]` my inference or arithmetic, with inputs shown.
- **Confidence.** High means source or primary text says it. Medium means one source, or a measurement on a different workload. Low means inferred.
- **What I did not do.** I started no containers and ran no engine, because the pool is full and measurement experiments outrank research probes. Every behavior claim is from source, docs, upstream tests or earlier lab measurements. Section 5 turns each open claim into a test with a numeric prediction. I spawned no subagents, so the background style review that `sam-writing-style` asks for did not run; I checked the file by grep for em-dashes and banned words only. Nothing under `packages/` or `lab/` other than this file was touched; `/Users/sam/projects/triplex-db` and ports 15442 and 17019 were not touched.
- **Raw material** is in `/Users/sam/Claude/Projects/triplex-db-2/R19/`: `source-excerpts.txt` (numbered excerpts for every citation), `docs/` (copies of the XTDB doc pages used), `web/web-notes.md` (URLs and summaries).

---

## 0. Verdicts

| # | Question | Answer | Confidence | Key evidence |
|---|----------|--------|-----------|--------------|
| Q1 | Which backends let a second node serve reads? | Two work. (a) Kafka-compatible log plus S3-compatible store, the documented topology, but the pinned lab image `ghcr.io/xtdb/xtdb:2.2.0` is the standalone build and has neither module. (b) Shared Local log plus Local storage on one filesystem, with the second process started read-only (`readOnlyDatabases: true`). This needs no Kafka and no object store and runs on the pinned image. R16 said horizontal reads need Kafka; that is too strong. | (b) Medium: works in an upstream in-process test, not tested across containers. (a) High. | `docker/standalone/build.gradle.kts:8-13` versus `docker/aws/build.gradle.kts:10-14`; `ReadOnlyLocalLog.kt:150-195`; `read_only_node_test.clj:17-55`; `LogProcessor.kt:280` |
| Q1 | Do all nodes run an indexer, and where does compaction run? | No node except the leader resolves transactions. Every node, including a read-only one, applies the leader's already-resolved rows to its own in-memory live index (deserialize plus insert). Followers never write blocks. Read-only nodes never compact and never claim leadership. Every other node runs compaction by default. | High | `FollowerLogProcessor.kt:112-153`; `Database.kt:328`; `LogProcessor.kt:280`; `dbs-in-xtdb.md` "Node processing" |
| Q1 | Does a writer-node token work on another node? | Two different tokens. The **await token** is a source-log message id per database and works on any node; the node waits up to 60 s, a hard-coded value. The **snapshot token** is a system time per database; a node that has not reached it does not wait, it raises error `0B000` (`xtdb/unindexed-tx`). Send both on every follower read. | High | `Database.kt:512-527,582-585`; `Xtdb.kt:248,280`; `query.clj:143-153`; `pgwire.clj:270` |
| Q1 | Memory per node, and Redpanda plus MinIO | Read-only node: smallest sane setting is about 1.5 to 1.75 GiB container (`-Xmx768m`, direct memory 768m, memory cache 384m). Redpanda about 1 to 1.25 GiB, an S3-compatible store 0.3 to 1 GiB, so the Kafka stack costs 1.5 to 2.5 GiB before any XTDB node. MinIO Community Edition has no official images since Oct 2025. | Low (footprints are inferred, vendor-reported or from secondary sources) | `slots.json`; R16 section 0.2; `web/web-notes.md` |
| Q2 | What does `server.numThreads` do? | It is the size of a fixed thread pool that holds one virtual thread per client connection, plus a queue of the same length. Connection 2N+1 is closed. It limits concurrent connections, not concurrent queries. Default 42. Raise it to about 300 for a 256-reader run and cap in-flight queries in the client. | High on mechanism, Low on the safe maximum | `pgwire.clj:1806,1826-1832,1768-1778`; `ServerConfig.kt:15` |
| Q2 | Does pgbouncer break tokens? | Transaction pooling cannot carry `SET AWAIT_TOKEN` (session state, not reported to the client, so not trackable). Per-transaction `BEGIN READ ONLY WITH (AWAIT_TOKEN=..., SNAPSHOT_TOKEN=..., CLOCK_TIME=...)` and per-query `SETTING SNAPSHOT_TOKEN` survive. `DISCARD ALL` clears the await token and is not run in transaction mode unless `server_reset_query_always=1`. A pooler is not needed; a client pool with raised `numThreads` is simpler. | Medium (pgbouncer docs are primary; XTDB behind pgbouncer is untested) | `Xtdb.kt:720-727`; `pgwire.clj:1324`; pgbouncer docs `web/web-notes.md` |
| Q3 | Where does the commit floor come from? | One `COMMIT SYNC` makes two durable appends in sequence (source log, then replica log), each ending in `FileChannel.force(true)`, and the writer node waits for its own read-back of the replica record before acknowledging. R13 measured fsync at 0.4 to 0.9 ms on the ext4 volume, so the two fsyncs are about 1 to 2 ms of a roughly 15 ms floor. The rest is statement round trips, SQL expansion, about nine thread hand-offs and CPU scheduling on a loaded host. | Medium: the trace is source; the split of the 15 ms is inference | `Database.kt:174`; `LocalLog.kt:169,198-203`; `SourceLogProcessor.kt:118-124`; `LeaderLogProcessor.kt:155-194`; `Xtdb.kt:333-340` |
| Q3 | Which settings change the floor? | Only the log type (in-memory removes fsync and durability; Kafka adds network hops), client-side pipelining of BEGIN, statements and COMMIT, fewer statements per command, CPU separation of the writer, and putting LOG on its own filesystem (p99 effect). No linger, batch-size or poll-interval setting exists; the Local log batches up to 10 messages per fsync in code. `COMMIT ASYNC` is safe for read-your-own-write but does not lower time to a usable ACK. | High on "no setting exists", Medium on the effect sizes | `LocalLog.kt:131,198-203`; `ElectionDriver.kt:36-41`; `Xtdb.kt:329-340` |
| Q4 | Tenancy for XTDB | Recommend a bridge: the 1m-entity tenant in its own database, the 1,000 small tenants in about 10 pooled "cell" databases with tenant-prefixed ids and a tenant column on a constant number of tables, per-tenant envelope encryption for sensitive values. One database per tenant does not fit: on the Local log each attached database appends a heartbeat record about 10 times a second with an fsync each (hard-coded), and every query resolves every attached database. | High on the mechanisms (source), Medium on magnitudes | `ElectionDriver.kt:36-41`; `ReplicaLogAppender.kt:62-66`; `query.clj:378-441`; `IQuerySource.kt:49-52`; R16 section 6.1 |
| Q4 | XTDB access control and encryption | XTDB 2.2.0 has no per-database or per-table authorization (only user authentication and role membership) and no at-rest or per-tenant encryption. A cross-database read by qualified name worked for the same user in R16. Storage-layer isolation therefore comes from separate storage paths plus the Triplex adapter plus application-level encryption. | High (absence confirmed by grep of docs and source; R16 probe) | `authentication.md`, `authorization.md`; `grep -ri encrypt docs/` returns nothing |
| Q4 | Tenancy for QLever | Recommend a bridge: the large tenant in its own index and server, small tenants in one shared index (or a few cell indexes) with one named graph per tenant, and one append-only log of record per tenant. One server per tenant does not fit: 1,001 servers at 31 to 43 MB idle each is at least 31 GB against an 11 GiB pool. | High on the arithmetic, Medium on the rest (R17 tenant probe pending) | `R2 section 1.4`; `ConstantsIndexBuilding.h:108`; `ServerMain.cpp:74` |
| Q4 | Is crypto isolation accepted as storage-layer isolation? | Treat it as a second layer. AWS's SaaS Lens defines silo and pool by resource separation and policy and treats bridge as a per-layer mix. I found no auditor, standard or regulator text that accepts per-tenant keys alone as isolation; a vendor article says outright that it does not replace authorization. Sam needs to rule on whether encrypted pooled storage satisfies GS.15. | Medium | `web/web-notes.md` |

### 0.1 Findings that change the design

1. **Read nodes can run on the pinned image with no Kafka and no S3 store.** A second container on the same named volume, started with `readOnlyDatabases: true`, follows the writer through the replica log file (inotify) and the shared storage directory. This removes the Redpanda plus object-store memory cost (1.5 to 2.5 GiB of the 11 GiB pool) and the missing-module problem, at the price of single-host, single-writer. It must still be proven across containers (experiment E1).
2. **The token protocol on a follower is "await, then snapshot".** A snapshot token alone fails fast with `0B000` on a lagging follower, and a default basis silently reads whatever the follower has. Triplex must send `AWAIT_TOKEN` and `SNAPSHOT_TOKEN` together in the read transaction.
3. **The commit floor is mostly not fsync.** Two fsyncs at 0.4 to 0.9 ms each explain 1 to 2 ms of about 15 ms. The lever list for P2 is therefore pipelining, fewer statements, CPU separation and splitting LOG from storage, not log durability settings.
4. **Silo-per-tenant has an idle cost R16 did not see.** On the Local log, each attached database's leader appends a no-op to its replica log whenever 100 ms pass without a record (hard-coded). That is about 10 appends and 10 `force` calls a second per database, about 27 MB a day of log that the Local log never trims. 1,000 attached databases would need about 10,000 fsyncs a second at idle against a measured ceiling of about 1,700 a second.
5. **Every query touches every attached database.** Query preparation and execution resolve all attached databases and build table info across all of them (the source carries a TODO saying so), and a snapshot token covers all of them. Cost grows with attached databases and with total table count, so pooled tenants must share a constant set of tables.
6. **Block cuts are a tail-latency event for both commits and follower reads.** While the leader uploads a block it stops resolving, and a follower buffers replica records (1,024 maximum, then a fault) until the block-uploaded record arrives.
7. **The replica-tail reader in the read-only Local log has no handling for a half-written last record.** That is a reliability risk to test under multi-KB transactions before relying on the topology.

---

## 1. Q1: XTDB 2.2.0 multi-node reads

### 1.1 Which backends let a second node serve reads

| Topology | Log | Storage | Second node works? | Needs | Evidence |
|----------|-----|---------|--------------------|-------|----------|
| In-memory | `InMemory` | `InMemory` | No, single process | none | `log.md` "In memory" `[D]` |
| Local only, second node read-write | `Local` | `Local` | **Unsafe.** Two writer processes append to one file with no file lock; the offset footer of each record is computed from `position()` before the write | none | `LocalLog.kt:129-136,160-175` `[S]`; `grep tryLock\|FileLock` finds no lock in `core/src/main` `[S]`; corruption is `[E]` |
| **Local shared, second node read-only** | `Local`, same directory | `Local`, same directory | **Yes in source and in upstream tests (same JVM).** Cross-container not tested | same filesystem visible to both containers; second node config `readOnlyDatabases: true`; identical absolute paths for attached secondaries | `ReadOnlyLocalLog.kt:150-195`, `DatabaseLogs.kt:29-40`, `Database.kt:279,328`, `read_only_node_test.clj:17-55`, `dbs-in-xtdb.md` "Read-only mode (v2.2+)" |
| Kafka-compatible log plus S3-compatible store | `Kafka` (two topics per database, one partition each) | `Remote` | Yes, the documented topology | `xtdb-aws` image (adds `xtdb-kafka` and `xtdb-aws` modules); broker; object store | `kafka.md` Setup `[D]`; `docker/aws/build.gradle.kts:10-14` `[S]` |
| Kafka log plus Local storage on a shared volume | `Kafka` | `Local` | Possible, not recommended | both of the above | `[E]` |

**The pinned image has neither module.** `slots.json` pins `ghcr.io/xtdb/xtdb:2.2.0@sha256:a6a42650...`. The standalone variant depends only on `xtdb-main` and `postgres-source` (`docker/standalone/build.gradle.kts:8-13`), while the AWS variant adds `xtdb-kafka` and `xtdb-aws` (`docker/aws/build.gradle.kts:10-14`). The `!Kafka` log tag is registered by a `ServiceLoader` `Log.Registration` supplied by the Kafka module (`Log.kt:50,58`), so a `!Kafka` config on the standalone image should fail to parse `[E]`. The Kafka topology therefore needs a second, unpinned image (`ghcr.io/xtdb/xtdb-aws:2.2.0`; XTDB's own bake file builds `xtdb-${variant}` tags, `docker-bake.hcl:40-48`) and a new digest in `slots.json`.

**Read-only Local topology, as source says it works:**

```
  client writes                                   readers (<=32 conns per node, 256 logical)
       |                                                  |
       v                                                  v
 +---------------------+   one named volume    +--------------------------+
 | WRITER node         |   /var/lib/xtdb       | READ node (read-only)    |
 |  leader, compactor  |    log/LOG            |  readOnlyDatabases: true |
 |  pgwire :5432       |    log/REPLICA_LOG    |  Follower only:          |
 |  resolve + 2 fsyncs |---- writes files ---->|   inotify tail of        |
 |  per commit         |    buffers/ (blocks,  |   REPLICA_LOG, applies   |
 +---------------------+     tries)           |   resolved rows          |
                                               |  no compaction, no blocks|
                                               |  pgwire :5433            |
                                               +--------------------------+
```

How each piece is wired:

- A read-only database opens both logs as `ReadOnlyLocalLog` and storage as `ReadOnlyBufferPool`, uses the no-op compactor, and opens no external source (`DatabaseLogs.kt:29-40`, `Database.kt:279,328,347`).
- `claimLeadership` returns immediately when `readOnly` is set (`LogProcessor.kt:280`), so the node is a permanent follower and never writes to the replica log.
- `ReadOnlyLocalLog.withTail` registers a Java `WatchService` for `ENTRY_MODIFY` on the log directory and re-reads the file's trailing offset on every wake or poll timeout (`ReadOnlyLocalLog.kt:150-195`). The code comment calls it "a read-only version of LocalLog that watches the log file for new messages written by another process (the primary cluster)".
- `readOnlyDatabases: true` makes the primary and every attached secondary read-only (`DatabaseCatalog.kt:118,210`). The follower learns of `ATTACH` and `DETACH` from the primary's replica log and attaches the same databases itself (`FollowerLogProcessor.kt:123-143`; secondaries come from `catalog.primary.tableCatalog.secondaryDatabases`, `DatabaseCatalog.kt:214-219`).
- Upstream tests start a read-write node and a read-only node on the same `:local` log and storage directories and check reads after plain commits, after block flushes, and with a tiny `rows-per-block` (`src/test/clojure/xtdb/read_only_node_test.clj:17-55` and following). Those run in one JVM, so they do not prove inotify delivery across containers.

**Constraints and risks (all `[E]` unless cited):**

- Single host only; both containers must see the same volume. The lab's slot volumes are Docker named volumes on the VM's ext4 (`engine.mjs` header), so inotify events from one container's writes reach the other because they share one kernel. A bind mount from macOS (virtiofs) is a different case I would not trust without a test.
- If an inotify event is missed, the follower still catches up at the next poll timeout. For `ReadOnlyLocalLog` that timeout is 5 to 10 s, because `RealElectionDriver(replicaLog)` uses 100 ms only for `InMemoryLog` and `LocalLog` and 1 s otherwise, and the election timeout is 5 to 10 times that (`ElectionDriver.kt:36-44`, `LogProcessor.kt:96`).
- The follower can read a record as soon as `write` returns, before the leader's `force` completes (`LocalLog.kt:160-169` versus `ReadOnlyLocalLog.kt:139-195` reading the file directly). A reader can briefly see a commit the writer has not yet acknowledged. That is harmless for snapshot semantics.
- **Half-written record risk.** `readLatestSubmittedOffset` in `ReadOnlyLocalLog` validates that the file ends exactly on a record boundary and throws `IllegalStateException` otherwise (`ReadOnlyLocalLog.kt:44-71`). Nothing in `readNewMessages` or `tailReplica` catches it: `tailReplica` reports any non-shutdown throwable to the watchers, and a failed state is absorbing (`LogProcessor.kt:261-264`, `Watchers.kt:33-37,50-55`). A reader that stats the file while the leader is in the middle of a multi-page `write` of a large record could trip this. The window is short (the leader's write is followed by an fsync gap of 0.4 ms or more) but not zero. Experiment E1 includes a large-transaction burst to look for it.
- No file locks anywhere, so a misconfigured second read-write process corrupts the log silently. The harness must refuse to start a second container without `readOnlyDatabases: true`.

### 1.2 What each node actually does

| Work | Leader (writer) | Follower (read-write, not leading) | Read-only follower |
|------|-----------------|------------------------------------|--------------------|
| Consume the source log | Yes, tails `LOG` (`LeaderLogProcessor.kt:243`) | No | No |
| Resolve a transaction (evaluate DML and `ASSERT`, assign system time, stage Arrow tables) | Yes (`TxResolver`, `SourceLogProcessor.kt:132-140`) | No | No |
| Append resolved record to the replica log | Yes, with a term stamp and fsync | No | No, cannot (`ReadOnlyLocalLog.enqueueMessage` throws, `ReadOnlyLocalLog.kt:107-108`) |
| Apply rows to the in-memory live index | Yes, after reading its own record back (`LeaderLogProcessor.kt:155-194`) | Yes (`FollowerLogProcessor.kt:112-153`) | Yes, same code |
| Write blocks and L0 tries to storage | Yes (`BlockCutter.upload`) | No | No |
| Compact | Yes (default threads = max(CPUs/2, 1)) | Yes, jobs picked at random, output byte-identical | **No**, `Compactor.NOOP` (`Database.kt:328`) |
| Collect garbage | Yes, leader only (`LeaderLogProcessor.kt:79`) | No | No |
| Serve queries | Yes | Yes | Yes |
| Claim leadership if the leader goes silent | n/a | Yes, after 5 to 10 assert intervals | **Never** (`LogProcessor.kt:280`) |

So followers duplicate the **apply** half of indexing (decode the Arrow IPC from each replica record and insert rows into the live tables) but not the **resolve** half. The resolve half is where `UPDATE ... WHERE` and `ASSERT` subqueries run, so it is the more expensive half for Triplex's command shape `[E]`. R16's finding that four readers raised commit service time from about 17 ms to 90 to 112 ms was on one node where the readers shared the JVM and CPUs with resolve, apply, fsync and compaction. A read-only node takes the readers away from the leader's JVM and from its CPU quota.

### 1.3 Where compaction runs and how to keep it off the read path

- **Default:** every non-read-only node compacts, with `threads = max(availableProcessors / 2, 1)` (`CompactorConfig.kt:10-14`; the docs say `min`, which is a typo, `config.md` "Compactor"). Jobs are chosen at random and outputs are byte-identical, so two read-write nodes duplicate work (`dbs-in-xtdb.md` "Compactor").
- **Read-only nodes never compact** (`Database.kt:328`). They learn of new compaction output through `TriesAdded` replica records, and of deletions through `TriesDeleted` (`FollowerLogProcessor.kt:155-160,174-176`).
- **`compactor.threads: 0` disables compaction on any node** (`config.md`).
- **A dedicated compactor node** (`xtdb compactor -f ...`, `config.md` CLI section) publishes its result by posting `TriesAdded` to the **source log** (`Compactor.kt:86` uses `partitionStorage.sourceLog`). On the Local log that would be a second writer process on `LOG`, which is the unsafe case above. A dedicated compactor therefore needs the Kafka topology.
- **With the Local topology**, compaction stays on the writer. Set `compactor.threads` to 1 to bound its CPU, accepting that compaction lags during bursts (more L0 files per table; R7 measured the read-time cost of uncompacted L0 files).

### 1.4 Tokens across nodes

| Token | Encodes | Minted by | Check on another node | If the node is behind | Evidence |
|-------|---------|-----------|-----------------------|-----------------------|----------|
| **Await token** (`SHOW AWAIT_TOKEN`, `SET AWAIT_TOKEN`, `BEGIN READ ONLY WITH (AWAIT_TOKEN=...)`) | per database, the source-log message id of each transaction this connection submitted | every write on a connection merges its tx id in (`Xtdb.kt:280-282,329-340`) | `awaitAll0` waits until `watchers.awaitSource(msgId)` for each database named in the token (`Database.kt:512-527`; `Watchers.kt:115-117`) | **waits**, up to `awaitTimeout` = 1 minute, hard-coded in `Connection` (`Xtdb.kt:248`), then throws a timeout | `[S]` |
| **Snapshot token** (`SHOW SNAPSHOT_TOKEN`, `SNAPSHOT_TOKEN=...`) | per database, the **system time** of the latest completed transaction on the minting node | `Database.kt:582-585` | `validate-basis-not-before` compares it with the node's snapshot basis (`query.clj:143-153`) | **fails fast** with `xtdb/unindexed-tx`, SQLSTATE `0B000` (`pgwire.clj:270`); never returns a silently older view | `[S]` |
| Default basis (no token) | the node's own latest completed tx | `default-basis` (`query.clj:155-163`) | n/a | reads whatever the node has applied | `[S]` |

Both tokens are portable between the writer and any follower, because transaction ids and system times come from the replicated records. The portable protocol for a read on a follower is:

```sql
BEGIN READ ONLY WITH (AWAIT_TOKEN = '<await token from the commit receipt>',
                      SNAPSHOT_TOKEN = '<snapshot token>',
                      CLOCK_TIME = TIMESTAMP '<valid-time basis>');
SELECT ...;   -- as many queries as the pull needs, all at one basis
COMMIT;
```

Three consequences:

1. **Await first, then snapshot.** Without `AWAIT_TOKEN`, a follower that is a few milliseconds behind raises `0B000` for a token minted after the commit. Triplex should treat `0B000` as "retry after await", never as a data error.
2. **Tokens are node-wide.** `snapshotToken()` is built from `latestCompletedTxs()` over every attached database (`Database.kt:582-597`), so the default token a writer mints with 11 attached databases names all 11. A follower that is behind on an unrelated tenant's database fails this tenant's pinned read. Triplex should build single-database tokens (the codec is a small protobuf map; R16 and `txs-in-xtdb.md` show example strings) or read `SHOW LATEST_COMPLETED_TXS` per database. Whether a hand-built single-database token is accepted is unproven (open question 5).
3. **`SNAPSHOT_TIME` is not a substitute.** The docs warn it is not repeatable across catch-up (`txs-in-xtdb.md` "Snapshots").

**Expected lag.** For the Local topology my estimate is: inotify wake under 1 ms, read of the tail, Arrow decode and live-index insert 1 to 3 ms, so commit acknowledgement to visible-on-follower of about 2 to 8 ms p50 `[E]`, with a tail at each block cut (section 1.5). The prediction to test is p50 at most 10 ms and p99 at most 60 ms at 40 commands/s (E1). For Kafka the lag adds one produce acknowledgement (`acks=all`, fsynced by Redpanda by default `[WS]`) and one consumer fetch, which I would expect to double or triple it `[E, Low]`.

**Watermark for the TARGETS section 4.1 routing rule.** The follower's watermark is `watchers.latestSourceMsgId` and its latest completed tx. Triplex can read it with `SHOW LATEST_COMPLETED_TXS` (`Database.kt:587-590` documents it as surfaced through pgwire) without blocking, then decide between waiting up to 250 ms on `AWAIT_TOKEN` and routing to the writer node, as section 4.1 item 3 requires.

### 1.5 Block-cut hazard, on both nodes

- **Leader:** a block is cut at 102,400 rows or after 15 minutes (`IndexerConfig.kt:15-16`). A database "quiet enough never to reach `rowsPerBlock` cuts a block every `flushTimeout` regardless of whether anything has been written" (`BlockFlusher.kt:11-17`). From the boundary until the uploaded record is read back, the leader accepts no new resolution (`BlockCutter.kt:110`, `SourceLogProcessor.kt:82-90`). Commits submitted in that window wait. Duration is `block.upload.timer` (`BlockCutter.kt:65`). Only about 1 commit in 1,000 sees it at the fixed trace (about one cut per 15 minutes at 1.1 commands/s), so it moves p99.9, not p99; the 60 s 50x burst can cut a block mid-burst.
- **Follower:** from `BlockBoundary` to `BlockUploaded`, a follower buffers incoming replica records instead of applying them, and `PendingBlock` throws a `Fault` ("follower-buffer-overflow") after 1,024 buffered records (`FollowerLogProcessor.kt:192-199`, `PendingBlock.kt:9-23`). A thrown fault ends ingestion for that follower. On the Local log the leader's heartbeat adds 10 records a second, so a block upload longer than about 100 s would overflow it `[E]`. In practice, awaits on a follower stall for the upload time at every cut.
- **Measure both** with `block.upload.timer`, `xtdb.replica.block.buffer.timer` and `xtdb.replica.block.buffered.records` (`BlockCutter.kt:65`, `FollowerLogProcessor.kt:59-72`).

### 1.6 Memory and CPU per node, and the Kafka stack

Known sizes `[P]`: lab XTDB slots are 3.0 GiB (`dev`, `-Xmx1500m`, direct 1g) and 3.5 GiB (`s1` to `s3`, `-Xmx2g`, direct 1g); R16 saw 422 MiB RSS on an idle `s2` node before any data; the memory cache defaults to half of the direct memory (`config.md` "Caching") and is shared by all databases on a node, keyed by database name (`LocalStorage.kt:48-51`), so extra databases do not each add a cache. Each read node has its own cache and its own copy of the live index; the OS page cache for the shared volume is shared.

| Component | Setting | Container cap | Evidence |
|-----------|---------|---------------|----------|
| Writer node | existing `s*` slot | 3.5 GiB, 2 CPUs | `slots.json` |
| **Read-only node, smallest sane** | `-Xmx768m -XX:MaxDirectMemorySize=768m`, `memoryCache.maxSizeBytes` 402653184 | 1.5 to 1.75 GiB, 2 CPUs | `[E]` from R16 idle RSS plus heap and direct caps; to be measured (E9) |
| Redpanda, one broker | `--smp 1 --memory 1G --reserve-memory 0M --overprovisioned` | 1.0 to 1.25 GiB; one source reports about 350 MiB idle at a 2G cap | `[WS]` community pattern; no official minimum found |
| S3-compatible store | S3Proxy (XTDB's own compose uses it), SeaweedFS or Garage | 0.3 to 1 GiB | `[WS]`; MinIO preallocates 1 to 2 GiB at start and its Community Edition has had no official images since Oct 2025 (secondary sources) |

Pool arithmetic (11 GiB, `slots.json`): the Local topology with a writer and two read nodes is 3.5 + 2 x 1.75 = 7.0 GiB; the Kafka topology with a writer, one read node, Redpanda and an object store is 3.5 + 1.75 + 1.25 + 0.5 = 7.0 GiB with one reader and 8.75 GiB with two. A QLever `dev` slot (2.5 GiB) fits beside the first but not comfortably beside the second.

**CPU matters more than topology.** The VM has 6 CPUs and each slot gets `--cpus 2` (a quota, not a pinning). Writer 2 + read nodes 2 + 2 + the load generator that R16 ran on the same host already exceeds 6. Moving readers to another container removes writer starvation only if the VM is not oversubscribed. Pin with `--cpuset-cpus` (writer on two cores, each read node on its own two, load generator and QLever on the rest) `[E]`. `engine.mjs` currently sets only a CPU quota.

### 1.7 How to stand up E1 without touching `lab/`

I cannot run this, so the steps for whoever holds a slot:

1. Start the writer with `engine.mjs up --lane xtdb --slot s1` (log and storage under `/var/lib/xtdb`, volume `tx2-xtdb-s1-data`).
2. Run the follower with the same image and volume, `docker run -d --name tx2-xtdb-s1-ro --cpus 2 --memory 1792m -e JDK_JAVA_OPTIONS='-Xmx768m -XX:MaxDirectMemorySize=768m' -v tx2-xtdb-s1-data:/var/lib/xtdb -v <ro-config>:/etc/xtdb/config.yaml:ro -p 127.0.0.1:5481:5432 <pinned image> -f /etc/xtdb/config.yaml`. The config is the writer's config plus `readOnlyDatabases: true`, the same `log.path` and `storage.path`, `healthz.port: 8080` mapped to another host port, and `memoryCache.maxSizeBytes: 402653184`. The follower must not be started before the writer has created `LOG` and `REPLICA_LOG`.
3. Check `/healthz/started` on both, then run section 5 E1.
4. The reservation ledger (`lab/locks/pool.json`) knows only `engine.mjs` containers, so the follower's 1.75 GiB has to be reserved by the owner of the slot under the "research probes outside the ledger" rule in `slots.json`.

---

## 2. Q2: Connection scaling

### 2.1 What `server.numThreads` controls

- `ServerConfig.numThreads` defaults to 42 (`ServerConfig.kt:15`); `serve` defaults `num-threads` to 42 (`pgwire.clj:1806`).
- The pool is `ThreadPoolExecutor(num-threads, num-threads, 0, ..., LinkedBlockingQueue(num-threads), virtual-thread factory)` (`pgwire.clj:1826-1832`). A handler owns its connection for the connection's whole life, so `num-threads` is a ceiling on concurrent clients, and the queue holds accepted sockets whose startup has not been served (the comment cites issue #5850, `pgwire.clj:1817-1825`).
- Connection number `num-threads + queue + 1` is rejected: `RejectedExecutionException` closes the socket and logs "PGwire at capacity, refusing connection" (`pgwire.clj:1759-1772`). Connections 43 to 84 are accepted and **hang** until a worker frees; R16's 64-reader level (64 readers plus 4 writers) hit this and showed read p99 of 20 s `[P]`.
- Each connection is a **virtual thread**, so 300 connections cost 300 virtual threads, not 300 platform threads. Query work runs on the connection's virtual thread; the carrier pool size follows the CPUs the JVM sees (2 under `--cpus 2`) `[E]`. Concurrency of actual query execution is therefore bounded by carriers and the CPU quota, not by `numThreads`.
- `server.readOnlyPort` starts a second server with its own pool of the same size and rejects DML and DDL (`pgwire.clj:1940-1953`, `ServerConfig.kt:14`). It separates connection slots, not CPU.
- `awaitTimeout` is a fixed one minute per connection, not configurable (`Xtdb.kt:248`).

### 2.2 Safe values

- **Fact:** 42 works; 43 to 84 queue; above 84 refuse.
- **Recommendation:** `numThreads: 300` on each read node for the 256-reader rung and `1100` only for the 1,024 stress rung, with the client capping in-flight queries per node near the core count (R18 section 1.5 item 4). Closed-loop "readers" in the harness do not each need their own connection; 256 logical readers multiplexed over 16 to 32 connections per node meets P1 without raising the pool at all.
- **Unknown:** memory per idle and per active connection (Connection state, a child allocator, portals), and whether JDK 21 virtual-thread pinning inside `runBlocking` reduces effective concurrency. Both are measured in E4. I would not go above 300 per node before seeing a per-connection RSS number.

### 2.3 Does a pooler break tokens, AWAIT_TOKEN or session settings

| State | Scope in XTDB | pgbouncer transaction mode | Result |
|-------|---------------|-----------------------------|--------|
| `BEGIN READ ONLY WITH (AWAIT_TOKEN, SNAPSHOT_TOKEN, CLOCK_TIME)` | one transaction | whole transaction stays on one server connection | **Works** |
| `SETTING SNAPSHOT_TOKEN = '...' SELECT ...` | one statement | one statement | **Works** |
| `SET AWAIT_TOKEN = '...'` | session (`Connection.awaitToken`, `Xtdb.kt:222`) | `SET` is never supported in transaction mode; AWAIT_TOKEN is not sent back as a ParameterStatus (only TimeZone is, `pgwire.clj:222-245,1324`), so `track_extra_parameters` cannot restore it | **Breaks or leaks.** The token stays on whichever server connection ran the `SET`, and a different client gets it |
| `DISCARD ALL` | clears session parameters, time zone, await token, default access mode (`Xtdb.kt:720-727`) | `server_reset_query` defaults to `DISCARD ALL` but applies only to session pooling unless `server_reset_query_always=1` | Safe but clears everything after every transaction |
| `SET TIME ZONE` | session | TimeZone is a built-in tracked parameter (pgbouncer docs) | Works |
| Protocol-level prepared statements | connection | work only with `max_prepared_statements` > 0 (pgbouncer rewrites names) | **Untested with XTDB.** H19 in R14 says XTDB's describe depends on execution count, so renaming may interact badly |

The leaked-token case is correctness-safe (a token is a lower bound, so the worst outcome is an unneeded wait of up to 60 s on a follower that lacks it), but it is a latency fault. **Recommendation:** no pooler. Use a Triplex-side pool, send both tokens per transaction as in section 1.4, and raise `numThreads`. If a pooler is wanted later, run it in transaction mode with `server_reset_query_always=1` and never use `SET AWAIT_TOKEN`.

---

## 3. Q3: The commit floor

### 3.1 Trace of one `COMMIT SYNC` on the Local log

```
 client --BEGIN, stmts, COMMIT SYNC--> pgwire virtual thread
   | stmts are parsed and buffered on the Connection; at commit drainWriteTx expands
   |   static DML into tx ops                                            (Xtdb.kt:990-1033)
   | cmd-commit -> commitSync -> executeTx                                (pgwire.clj:582-605)
   v
 [1] Database.submitTxBlocking: ops.toArrowBytes; sourceLog.appendMessageBlocking   (Database.kt:157-176)
   |   LocalLog writer coroutine: take <=10 queued msgs, write, FileChannel.force(true)   <== FSYNC #1
   |   (LocalLog.kt:131,198-203,169)  committedOffset flow wakes the leader's source tail
   v
 [2] SourceLogProcessor.processRecords -> channel -> TxResolver.indexTx: evaluate ops and ASSERTs,
   |   assign system time, stage Arrow tables                          (SourceLogProcessor.kt:118-140,254-265)
   v
 [3] ReplicaLogAppender queue -> replicaLog.enqueueMessage              (ReplicaLogAppender.kt:53-69)
   |   LocalLog writer coroutine: write, force(true)                    <== FSYNC #2
   v
 [4] LogProcessor.tailReplica wakes on committedOffset -> LeaderLogProcessor.applyReplicaMessage
   |   -> liveIndex.applyTx (write lock) -> Watchers.notifyApplied      (LogProcessor.kt:246-265, LeaderLogProcessor.kt:155-194)
   v
 [5] Watchers.awaitTx wakes the pgwire thread (StateFlow, no polling)   (Watchers.kt:111-113, Xtdb.kt:355-357)
   v
 CommandComplete to the client
```

What the trace establishes `[S]`:

- **Two durable appends in sequence per commit.** The source append returns only after its fsync (the deferred completes after `writeMessages`, `LocalLog.kt:220-223`), then the leader resolves, then the replica append gets its own fsync, and the writer node acknowledges only after it reads its own replica record back and applies it. This is new in 2.2: before the source/replica split a commit had one log append (`log.md` changelog, `dbs-in-xtdb.md` changelog).
- **Group commit exists but is fixed.** The writer coroutine drains up to 10 queued messages per `force` (`LocalLog.kt:198-203`), and the append channel has capacity 10 (`LocalLog.kt:131`). There is no linger time, no batch size and no fsync-policy setting in `Log.Factory` for Local (`LocalLog.Factory` has `path`, `instantSource`, `epoch`, `useInstantSourceForNonTx`, `coroutineContext`, `LocalLog.kt:329-337`).
- **No poll interval on the Local path.** Source tail, replica tail and awaits all wake on state flows. The 1 s `pollTimeout` in `tailAll` and the 100 ms to 1 s election timeout only bound an idle wait (`Log.kt:186-193`, `ElectionDriver.kt:36-44`).
- **Leader resolution is pipelined across commits.** Resolved transactions queue until they are read back (`TxResolver.kt` class comment), so throughput does not pay the double fsync serially; one command's latency does. R16 measured 172 commits/s at 16 connections `[P]`.

### 3.2 What the roughly 15 ms is made of

| Part | Estimate | Basis |
|------|----------|-------|
| Two fsyncs | 1 to 2 ms | R13: ext4 named volume 0.43 ms median, 1.83 ms p99 per fsynced append; batch of 10 plus one fsync 0.86 ms median `[P]`. XTDB's `force(true)` on Linux ext4 is an `fsync` of the file |
| pgwire round trips for BEGIN, statements, COMMIT | 1 to 3 ms on a loaded host `[E]` | R16 measured a single-row transaction at 14.7 ms p50 and an 8-statement, 10-fact command at 23.9 ms p50, so each added statement costs about 1 ms on that host |
| Per-statement parse on the connection thread, then static expansion of all buffered statements at commit | 1 to 3 ms `[E]` | `drainWriteTx` calls `expandStaticOps` (`toStaticOps` per DML op) before submit (`Xtdb.kt:990-1033`) |
| Thread hand-offs (source tail, persister, appender, writer coroutine, replica tail, apply, awaiting thread) | about nine, each a possible CPU-scheduling delay | trace above; R16's host had load average 10.7 to 13.4 on 12 cores, and R16's own breakdown is non-monotonic (a 10-row insert at 6.8 ms against a single-row insert at 14.7 ms), which points to host noise |
| Resolve and apply CPU | under 1 ms for a few rows `[E]` | `tx.op.timer` would show it |

My reading is that **fsync is under a quarter of the floor and scheduling plus round trips are most of it**. R16 reached the same suspicion ("the host, not the statement count, sets p50"). E2 settles it with the node's own metrics.

Metrics that decompose one commit with no profiler (healthz `/metrics`, `monitoring.md`): `node.tx.submit` (source append including fsync #1), `node.tx.await` (everything after), `node.tx.execute` (both), `tx.op.timer` (resolve), `xtdb.replica.process.timer{msg.type=ResolvedTx}` (apply on a follower), `pgwire.tx.latency` (`node/impl.clj:190-198`, `SourceLogTxIndexer.kt:63`, `FollowerLogProcessor.kt:45-57`, `pgwire.clj:1813`).

### 3.3 Settings and what each one trades

| Knob | Effect on the floor | What it trades away | Evidence |
|------|--------------------|---------------------|----------|
| Log type `Local` to `InMemory` | Removes both fsyncs, about 1 to 2 ms | **All durability and restart recovery.** Use only as a diagnostic control | `log.md` `[D]` |
| Log type `Local` to `Kafka` | Adds a network produce (`acks=all`) and a consumer fetch per hop, two hops; I expect a floor at least 1.5 times higher `[E, Low]` | Gains multi-node reads and failover; costs memory (section 1.6) | `kafka.md` Settings `[D]` |
| Redpanda write caching (`write.caching`, `flush.ms` default 100) | Acknowledges before fsync | **Durability**: unflushed messages are lost on a broker crash; conflicts with TARGETS 1.1 P2 item 1 ("ACK only after the commit is durable") | `[WS]` Redpanda docs |
| `COMMIT ASYNC` or `BEGIN READ WRITE WITH (ASYNC = true)` | Skips the wait for resolve, replica fsync and apply; the client returns after fsync #1 | The client no longer learns committed versus aborted (`ASSERT` failures, CAS losses, duplicates). See 3.4 | `Xtdb.kt:329-340`, `pgwire.clj:595-601`, `Sql.g4` CommitStatement and `AsyncTxOption` |
| Client pipelining of BEGIN, statements, COMMIT SYNC in one write | Saves N+1 round trips; I estimate 2 to 5 ms for a 4-statement command on a loaded host `[E]` | Nothing in durability or isolation; needs a driver that pipelines (postgres.js does within one tick) | `Xtdb.kt:1014-1033` (statements buffer client-side) |
| Fewer statements per command (one multi-row `INSERT` for ledger rows, a single `ASSERT` for CAS plus claim) | Each statement costs about 1 ms (R16: 14.7 ms for one statement, 23.9 ms for eight); the CAS assert alone added about 5 ms | Less readable command; same atomicity | R16 section 2.1 `[P]` |
| Concurrent writers (group commit) | Amortizes fsync across up to 10 queued messages | Needs per-subject parallelism; R18 finding 5 says the scope-wide `ASSERT MAX(position)` serializes commits in a scope | `LocalLog.kt:198-203`; R18 |
| Separate filesystem for `log.path` and `storage.path` | Protects commit **p99** from block uploads and compaction fsyncs on the same ext4 journal. R13 measured p99 13.7 to 93 ms and max 229 ms when another writer shared the volume | Two volumes to mount in each read node | R13 `[P]`; `[E]` for XTDB |
| `compactor.threads: 1` (or 0 during a burst window) | Frees CPU on a 2-CPU writer | Compaction lag, more L0 files for readers | `config.md`; R7 |
| Readers on a read-only node | Removes read CPU from the writer's JVM and quota | Section 1 costs | R16 section 1.2 `[P]` |
| `indexer.flushDuration`, `rowsPerBlock` | Not in the steady-state commit path. Control how often the block-cut stall happens (p99.9) | More blocks versus bigger replay and stall | `IndexerConfig.kt:15-16` |
| `indexer.logLimit`, `pageLimit` | Live-index structure; XTDB asks users to contact them before changing | Not recommended | `config.md` "Indexer" |

### 3.4 ASYNC commits plus an await on the next read, under TARGETS 4.1

**Read-your-own-write is safe.** After `commitAsync`, `submitTx` records the tx id into the connection's await token (`Xtdb.kt:280-282,329-330`), and every later query, prepare, snapshot pin or DML on that connection calls `awaitAll(awaitToken, 60 s)` first (`Xtdb.kt:444,690,1156,1207`). A different connection or node gets the same guarantee by sending the await token (section 1.4). Aborted transactions still advance the awaited source position, so the await returns even if the tx aborted.

**It does not help the P2 ACK.** TARGETS 4.1 item 4 makes the source of truth send the ACK only after the current index reaches the commit's position, and P2 requires a receipt or a typed conflict for every command (TARGETS 1.1 P2 item 3). With ASYNC the client has no outcome. Getting it needs `SELECT committed, error FROM xt.txs WHERE _id = ?` after the await, which is exactly the fallback `awaitTx` runs (`Xtdb.kt:360-377`) and R16 measured at about 11 ms for an `_id` lookup. So ASYNC adds a round trip to reach the same ACK. Its legitimate use is **pipelining**: submit several independent commands asynchronously, then collect outcomes, which raises throughput but not single-command latency. Keep `COMMIT SYNC` for the P2 path.

**Read nodes in the 4.1 model.** The writer's own live index is the "current index" that is synchronous with the ACK (COMMIT SYNC returns after the leader applied the record). A read node is an additional index with a watermark; it is asynchronous behind the ACK, and routing follows 4.1 item 3.

---

## 4. Q4: Tenancy with storage-layer isolation

### 4.1 What the engines give (facts)

**XTDB 2.2.0.**

- `ATTACH DATABASE` gives one log and one storage path per tenant at runtime, with its own leader, indexer and compaction driver (`dbs-in-xtdb.md` "Attaching/Detaching"; `Database.kt:254-411`). Attach p50 8.6 ms; about 6.2 MiB RSS and 0.6 threads per active database; first commit p50 75.8 ms, first read p50 31.2 ms (R16 section 6.1). The compactor thread pool and the memory cache are per node, not per database (`NodeBase.kt:86`, `LocalStorage.kt:48-51`).
- **Idle heartbeat per database.** `RealElectionDriver(replicaLog)` sets the assert interval to 100 ms for `InMemoryLog` and `LocalLog`, 1 s otherwise (`ElectionDriver.kt:36-41`). `ReplicaLogAppender.run` selects between the append queue and `onAssertTimeout`, which appends a `NoOp` when 100 ms pass with nothing queued (`ReplicaLogAppender.kt:59-70`). Every attached database has its own leader term and appender, so an idle Local-log database appends about 10 records a second, each followed by `force(true)` (`LocalLog.kt:169`). A `NoOp` record is 21 bytes of framing plus a payload of about 10 bytes `[E]`, so roughly 310 bytes a second, 1.1 MB an hour and 27 MB a day per database. The Local log is never truncated (R7 question 6, R13 table). Consistency check against R16's 100-database probe: 27 KB of disk per tenant after a run of well under two minutes is the same order as 310 bytes a second predicts (the run time is my estimate from `tenants.mjs`, not recorded) `[E]`.
- **Idle empty blocks.** A quiet database still cuts a block every 15 minutes (`BlockFlusher.kt:11-17`), about 1.1 blocks a second across 1,000 databases.
- **Every query touches every attached database.** `prepareRa` and `openQuery` call `resolve-dbs` and `open-snaps` for all attached databases and build `table-info` across every table of every database (`query.clj:378-441`). The interface comment says "TODO resolves every attached database, not just the ones a query names; under real multi-tenancy that wants narrowing" (`IQuerySource.kt:49-52`). Cost per query grows with databases and with total tables. `Snapshot.open` also iterates all live tables and all catalog tables (`Snapshot.kt:151,114-130`).
- **Tokens span all databases** (section 1.4 point 2).
- **No authorization below the connection.** Authentication providers and rules match `user`, `remoteAddress` and method (`authentication.md` "Rule configuration"); `GRANT` and `REVOKE` manage role membership only (`authorization.md`). There is no per-database or per-table privilege in the grammar (`Sql.g4:47,59-60` has role statements only). R16 saw a connection to one tenant read another tenant's table by a fully qualified name.
- **No encryption.** `grep -ril encrypt docs/` returns nothing.
- `ERASE` is logical; the marker stayed in `LOG` and `REPLICA_LOG` (R16 section 6.2). Crypto-shredding is already the plan (R15).

**QLever 0.6.0.**

- One server serves exactly one index: `--index-basename` is required (`ServerMain.cpp:74`). Idle RSS 31 to 43 MB for a small index and 46 MB at 12M triples; startup 15 to 40 ms; index 20 to 26 bytes per triple; delta 0.4 to 1.7 KB per triple outside `-m`; every update costs O(total delta); a rebuild of 12M triples takes 4.8 s and peaks at 1.33 GB at 2 CPUs (R2 sections 1.4, 1.7, 6.1).
- Named graphs share one delta and one rebuild. Block metadata records at most 20 distinct graphs per block (`ConstantsIndexBuilding.h:108`); beyond that `FROM` and `GRAPH` restrictions cannot skip blocks (R18 section 2.2).
- The lane's source of truth is Triplex's own log of record (R13, PLAN C2), which has no idle traffic: appends and fsyncs happen only on commits (R13 design).

### 4.2 XTDB options, costed for 1 tenant of 1m entities plus 1,000 tenants of 1k entities

Sizing: using TARGETS section 2's ratio of 10 active facts per entity, the large tenant holds about 10M active facts and the 1,000 small tenants hold about 10M in total, so the whole mix is 2m entities and about 20M active facts, the size of a 2m-entity rung.

| Option | Isolation | Cost for the mix (Local log) | Verdict |
|--------|-----------|------------------------------|---------|
| **A. One database per tenant (silo)**, 1,001 attached | Separate log and storage per tenant; no engine-enforced access control | RSS about 6.1 GiB (1,001 x 6.2 MiB, R16 extrapolation); about 600 threads; idle about 10,000 appends and `force` calls a second against about 1,700 a second measured capacity of the ext4 volume (R13); 27 GB a day of idle log growth; 1.1 empty blocks a second; every query resolves 1,001 databases; first commit p50 76 ms per tenant; attach 8.6 s in total | **Does not fit one node.** Fits with at most about 30 to 100 databases attached at a time (190 to 620 MiB, 300 to 1,000 idle fsyncs/s) |
| **A'. Silo with LRU attach**, at most K attached | Same as A for attached tenants; detached tenants have no process cost | K = 30 costs about 190 MiB and 300 idle fsyncs/s; attach 8.6 ms p50 plus cold cache on first use; `DETACH` is asynchronous and a quick re-attach can return `xtdb/db-being-detached` (`dbs-in-xtdb.md`); read nodes mirror the writer's attached set; a token covers only attached databases | Viable only if the number of tenants active in any 15-minute window is at most K. **Unknown, Sam to say** (section 4.6) |
| **B. One pooled database**, per-tenant tables | Logical only | Table count grows with tenants; every `Snapshot.open` and every `table-info` is O(tables); one block-cut and compaction domain for all tenants | Reject; per-tenant tables are the worst pooled shape |
| **C. One pooled database**, constant tables, tenant-prefixed `_id` | Logical only | Cheapest. R7 found entity-clustered UUID ids read 5.5 ms per 1,000 keys against 330 ms for hashed ids; a tenant prefix in the high bits clusters a tenant's rows | Fine for the small tenants if logical isolation is enough; blast radius is one database |
| **D. Bridge: large tenant silo plus about 10 cell databases of about 100 small tenants each** | Large tenant physically separate; small tenants share a cell, separated by tenant-prefixed ids, a tenant column, the Triplex adapter and per-tenant encryption | 11 attached databases: about 68 MiB, 7 threads, about 110 idle fsyncs/s, about 0.3 GB a day of log growth; constant table count; compaction and block cuts bounded per cell; a cell's data is 100 tenants x 10k facts = 1M facts | **Recommended** |
| **E. D plus per-tenant envelope encryption** | Adds cryptographic isolation and per-tenant crypto-shredding | Per command, about 10 AES-GCM operations with a cached data key, well under 0.1 ms `[E]`; a key-management call only on a cache miss; range rules on encrypted attributes run in the kernel (TARGETS section 7 item 4) | **Recommended with D** |

### 4.3 XTDB recommendation

Use **D plus E**:

1. **Large tenant** (1m entities): its own database, with its own `LOG`, `REPLICA_LOG`, storage directory, leader and compaction. If its load needs it, it can later move to its own writer node without changing the data model. This gives physical storage-layer isolation for the tenant that matters most.
2. **Small tenants:** hash each tenant to one of about 10 cell databases. Every table has a tenant column, and `_id` is a UUID whose high bits are the tenant. The number of tables stays constant, so snapshot and `table-info` cost does not grow with tenants.
3. **Keys:** one key-encryption key per tenant outside XTDB, wrapping per-subject data keys (the R15 crypto-shredding design). Sensitive values are encrypted before they reach XTDB, so files and logs hold ciphertext; keys must not appear in backups (a copy of a key defeats the shred, `[WS]`).
4. **Tenant promotion:** a tenant that outgrows a cell moves to its own database by replay of its ledger rows. Whether original system times can be preserved on replay is open (the grammar has a `SYSTEM_TIME` read-write option, `Sql.g4` `SystemTimeTxOption`, but I did not test ordering rules).
5. **Access control:** XTDB cannot enforce it, so the Triplex storage adapter binds each route to one database and one key. GS.15's "access fails at the storage layer" is then met by the key (the route cannot decrypt) and, for the large tenant, by the absence of any credential for that database in the route's process. The wording of GS.15 should say which of these it requires (section 4.6).

Cost for the mix: about 11 databases on one writer node, plus read nodes that attach the same 11; roughly 70 MiB of per-database overhead and about 2m entities of data. If Sam requires physical separation for **all** 1,001 tenants, the only XTDB shape that fits is A' with a small attached set or a multi-node fleet, and the Kafka log changes the heartbeat to 1 s but needs two topics per tenant (about 2,000 single-partition topics) `[E]`.

### 4.4 QLever options, costed for the same mix

| Option | Isolation | Cost for the mix | Verdict |
|--------|-----------|------------------|---------|
| **Per-tenant index and server**, 1,001 servers | Separate files and process per tenant | At least 1,001 x 31 MB = 31 GB idle RSS against an 11 GiB pool, plus a port, caches (`-c`, `-e`) and a thread pool per server; each rebuild is independent (a 1k-entity tenant rebuilds in well under a second) | **Does not fit.** The R17 tenant probe (`tenants.py`, `-j 1 -m 32M -c 2M -e 2M`) will give the exact per-server number; expect it to confirm the order of magnitude |
| **Named graph per tenant in one index** | Logical only | One server, about 20M triples in total (about 0.5 GB of index at 26 B/triple); one shared delta; a rebuild of the whole 20M-triple index is about 8 s at 2 CPUs and roughly 2 GB peak RSS by scaling R2's 4.8 s and 1.33 GB at 12M `[E]`; 1,001 graphs exceed the 20-graph block metadata cap, so graph restrictions become per-row filters on mixed blocks | Works functionally; weak isolation; one rebuild domain for all tenants |
| **Per-tenant log of record, shared derived index** | Source of truth physically separate per tenant (own file, fsync per commit group, no idle traffic); the read index is derived | 1,001 small append-only files; erasing a tenant's log and key removes its source of truth | Good for the source of truth; the derived index still needs one of the other rows |
| **Bridge (recommended): large tenant own server and index; small tenants in 1 to 10 cell indexes with a named graph per tenant; one log of record per tenant; per-tenant encryption of sensitive literals** | Large tenant physical; small tenants graph-level plus log-level plus crypto | 2 to 11 servers at about 35 MB idle each (under 0.4 GB), index about 0.26 GB for the large tenant and about 0.26 GB across cells, delta 0.4 to 1.7 KB per live triple, rebuild of the large tenant about 5 s and of a 1M-triple cell under 1 s | **Recommended** |

QLever has an extra constraint from R18 finding 7: its updates carry a fixed cost (22 ms at 100k delta triples, 203 ms at 1M), so the dependency index and feed checkpoint stay outside QLever whichever tenancy shape is used. Tenancy for the QLever lane therefore applies to its read index and its log of record only.

### 4.5 Prior art and whether crypto isolation counts

- **Silo, pool, bridge.** AWS's SaaS Lens describes silo and pool as two ends and bridge as the mix, defined per component: its example shares the web tier and gives each tenant its own application tier and storage (`bridge-model.html` `[W]`). The storage and isolation whitepapers, from search summaries `[WS]`, define silo as a separate database per tenant, pool as shared constructs isolated by policy with tenant context, and bridge as a hybrid. Recommendation D is a bridge at the data layer: silo for the large tenant, pool for the small ones.
- **Cost of silo at tenant counts like ours.** The AWS summaries and the XTDB numbers above agree that silo costs scale with tenant count, which is why bridge exists. XTDB adds the per-database idle heartbeat and the all-database query resolution; neither appears in vendor guidance.
- **Cryptographic isolation.** The pattern is a root key in a KMS, a key-encryption key per tenant, a data key per item, cached data keys, and key destruction as erasure. A vendor article presents it as stronger than logical separation, says it limits blast radius and "doesn't replace authorization", and claims no auditor acceptance (`web-notes.md` `[W]`). I found no SOC 2, ISO 27001, NIST SP 800-57 or regulator text that names per-tenant keys as sufficient tenant isolation `[WS]`, and I did not open those standards. Practitioner sources agree that shredding needs per-tenant or finer keys and that key copies in backups defeat it.
- **Reading for this project.** Crypto isolation clearly satisfies the erasure requirement (TARGETS section 7) and limits what a storage-level reader can learn. Whether it satisfies "tenant isolation at the storage layer" for pooled tenants is a definition, not a fact, so it goes to Sam. Metadata stays in the clear unless encrypted too: ids, attribute names, valid and system times, row counts and file sizes.

### 4.6 Decisions and measurements needed

1. **Sam:** does encrypted pooled storage (cells) satisfy GS.15, or must every tenant have its own physical database? The first makes D plus E sufficient; the second forces A' with a small attached set or several nodes.
2. **Sam:** roughly how many of the 1,000 small tenants are active in any 15-minute window? This sizes K for A'.
3. **Harness:** E3 and E7 below measure the idle-heartbeat and table-count costs that this section derives from source.

---

## 5. Ranked experiments, with falsifiable predictions

Rank follows `lab/NORTH-STAR.md`: P1 first, P2 second, then tenancy. Each names the metric and a result that would disprove the claim. E1 to E5 need one writer slot, one 1.75 GiB follower and the load generator.

| # | Priority | Question | Setup | Prediction (numbers) | Falsified if |
|---|----------|----------|-------|----------------------|--------------|
| **E1** | P1 | Does a read-only Local follower in a second container keep the writer's commit latency flat? | Writer on `s1`, follower per section 1.7 with `readOnlyDatabases: true`. R16's data (100k subjects, 22 columns) and open-loop writer at 40 commands/s. Readers (R16's 4-query, 40-entity pull) only on the follower at 0, 4, 16, 64 logical readers over 16 connections. Pin writer, follower and generator to separate cores. Include one 60 s window at 5x rate with 50-fact (20 to 60 KB) commands and one forced block cut | Writer commit service p50 and p99 at 16 readers each within 1.25x of the zero-reader run in the same session (R16 single node: 78 to 90 ms against 17 to 20 ms, so a 4x to 5x gap closes); follower read goodput at 1 reader 80 to 90 queries/s and at 4 to 64 readers 110 to 130 queries/s; ack-to-visible lag (writer ack to a follower read with `AWAIT_TOKEN` returning the row) p50 at most 10 ms, p99 at most 60 ms outside block cuts; zero "log file corrupted" errors in the follower log | Writer p50 above 1.5x baseline at 16 readers (then contention is not CPU: look at disk, page cache, shared cores); lag p99 above 250 ms; any `ingestion stopping` or `log file corrupted` line on the follower; follower stops advancing after inotify misses (lag steps of 5 to 10 s) |
| **E5** | P1 correctness | Is "await then snapshot" exact on a follower, and does a snapshot token alone fail safe? | 10,000 commits at 40/s; after each ack, read the committed row on the follower three ways: (a) `AWAIT_TOKEN` + `SNAPSHOT_TOKEN` + `CLOCK_TIME`, (b) `SNAPSHOT_TOKEN` only, (c) no token | (a) zero errors and zero stale reads; (b) some reads raise `0B000` (I predict 1 to 15% of reads issued within 5 ms of the ack, scaled by measured lag) and **zero** silently stale reads; (c) a non-zero share of stale reads of the latest commit | Any silent stale result in (a) or (b) is a severity-1 finding (the `validate-basis-not-before` guard does not cover a case); zero `0B000` in (b) means lag is below the read latency and the test needs a tighter loop |
| **E4** | P1 | Does raising `numThreads` plus a client in-flight cap meet the 256-reader goodput bar? | Follower with `server.numThreads: 42`, then `300`; 256 logical readers over 32 connections, then 256 connections; also 64 | At 42: more than 84 simultaneous sockets starve or refuse (R16 reproduced). At 300: all served; RSS growth per idle connection 0.3 to 1.5 MiB; goodput at 256 logical readers (32 connections) at least 0.9x of the 64-reader level | RSS per connection above 4 MiB; goodput at 256 below 0.8x of 64; "PGwire at capacity" at 300 |
| **E2** | P2 | What fraction of the single-row commit floor is fsync, round trips and scheduling? | Quiet writer (no other probes on the host if possible), one connection, 1,000 single-row `BEGIN; INSERT; COMMIT SYNC` per variant: (a) Local log; (b) `InMemory` log; (c) Local log with the three statements pipelined in one write; (d) Local log with `LOG` on a second named volume. Scrape `node.tx.submit`, `node.tx.await`, `tx.op.timer` before and after | (a) p50 8 to 16 ms; `node.tx.submit` p50 0.8 to 2 ms (one fsync plus serialization), `node.tx.await` p50 3 to 8 ms; (b) p50 lower by 1 to 3 ms, so fsync is under 25% of (a); (c) lower than (a) by 2 to 5 ms; (d) same p50 as (a) within 1 ms and a lower p99 when a block upload or compaction runs concurrently | (b) within 0.5 ms of (a) means fsync is negligible and the floor is all scheduling; (b) lower than (a) by more than 6 ms means fsync on this volume is slower than R13 measured; `node.tx.submit` above 3 ms means the volume's fsync is the bottleneck and the volume type should change |
| **E3** | tenancy | What does an idle attached database cost on the Local log? | One node, 50 `ATTACH`ed Local databases, idle for 120 s, then 200 attached. Record per-database `REPLICA_LOG` growth, node `syscw` or `fsync` count, CPU, and commit p50 for one active tenant | Per database 8 to 10 appends per second and 15 to 25 KB a minute of `REPLICA_LOG` growth; CPU at idle with 50 attached at least 5 percentage points above 0 attached; active-tenant commit p50 with 50 idle attached at most 1.3x of 0 attached, with 200 attached at least 1.5x | Growth under 2 KB a minute per database means the heartbeat is not what I read in `ElectionDriver`/`ReplicaLogAppender`; commit p50 flat to 200 attached means fsync capacity is not shared the way R13 suggests |
| **E7** | tenancy | Does table count slow commits and reads in a pooled database? | One database, 100, 1,000 and 3,000 tables each with 10 rows written in the last block; measure single-row commit p50 and a single-`_id` read p50 right after a commit | Commit p50 and fresh-read p50 grow at least 10% from 100 to 3,000 tables (`Snapshot.open` is O(live tables)); read p50 for the same query grows with the number of attached databases (E3 setup) | Flat within 5% means the snapshot rebuild is cheaper than I expect and per-tenant tables are acceptable |
| **E9** | P1 / pool | Smallest read-node footprint | Follower at `-Xmx768m`, direct 768m, cache 384m, with the R16 dataset and 16 readers | RSS at most 1.6 GiB; no OOM; readers reach at least 100 queries/s | OOM or sustained GC above 20% means 2.0 GiB is the floor |
| **E8** | P1 / P2 | If E1 fails, what does the Kafka topology cost? | `xtdb-aws:2.2.0`, Redpanda with `--smp 1 --memory 1G`, S3Proxy or SeaweedFS, writer plus one follower | Total memory 6.5 to 7.5 GiB; commit floor at least 1.5x E2(a); follower lag p50 10 to 30 ms | Commit floor within 1.2x of Local would make Kafka a free option |
| **E6** | P1 | Does pgbouncer in transaction mode carry the token protocol? | pgbouncer 1.21 or later, `pool_mode=transaction`, `max_prepared_statements=200`, 64 clients | `BEGIN READ ONLY WITH (...)` per read: zero wrong answers; a client that issues `SET AWAIT_TOKEN` leaks it to a second client on the same server connection within 100 transactions; prepared statements through the pooler give correct results | Any wrong answer with per-transaction tokens, or a describe failure from renamed statements |
| **E10** | tenancy | Cost of per-tenant envelope encryption on the command path | 10 values per command, AES-256-GCM in Node, cached data key; and 1% cache misses against a local key service | Under 0.1 ms CPU per command at hit rate 99%; under 1 ms added at p99 | Above 1 ms at p50 means encrypt in a worker or batch per command |

If E1 passes, E8 can be skipped. If E1 shows corruption or missed wake-ups, E8 is the fallback.

---

## 6. Open questions

1. **Cross-container inotify.** Does a write in one container wake the other's `WatchService` on a Colima named volume? A virtiofs bind mount is a separate case.
2. **Half-written record.** Can a read-only follower observe a half-written last record under multi-KB commits, and does it then fail permanently? (E1.)
3. **Follower after a leader restart or an epoch bump.** I read the code path only for steady state.
4. **Identical paths.** A follower attaching secondaries uses the absolute log and storage paths recorded in the primary's catalog, so every cell database must be mounted at the same paths in the follower.
5. **Single-database tokens.** Is a hand-built snapshot token that names only one database accepted, and does `await` of only that database suffice?
6. **Block-cut stall at scale.** Duration of `block.upload.timer` at 100k to 1M rows and its effect on commit p99.9 and follower lag.
7. **Per-connection memory** and virtual-thread pinning on JDK 21 (E4).
8. **Local log growth.** About 27 MB a day per database of heartbeat records, never trimmed. The retention story (epoch bump after a block flush, or a patched assert interval) is not designed.
9. **`xtdb-aws:2.2.0` image availability and digest**, needed only if E8 runs.
10. **R17's tenant probe** for QLever per-server RSS and per-graph behavior; this report uses R2 numbers.
11. **Active-tenant fraction** and the **GS.15 definition** (Sam, section 4.6).
12. **Migration of a tenant between cells** with original system times preserved.
13. **Compaction on the writer under the 2-CPU quota** at the 50x burst, and its interaction with P2 p99.

---

## 7. Files

| Path | Content |
|------|---------|
| `/Users/sam/projects/triplex-db-2/lab/research/R19-xtdb-read-scaling-commit-floor-tenancy.md` | this report |
| `/Users/sam/Claude/Projects/triplex-db-2/R19/source-excerpts.txt` | numbered source excerpts for every citation (about 1,400 lines) |
| `/Users/sam/Claude/Projects/triplex-db-2/R19/docs/` | copies of the XTDB doc pages used |
| `/Users/sam/Claude/Projects/triplex-db-2/R19/web/web-notes.md` | URLs and summaries for pgbouncer, Redpanda, MinIO, AWS SaaS Lens and per-tenant key sources |

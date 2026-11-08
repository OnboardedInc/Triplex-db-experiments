# R23: engines as replicas behind a log of record: prior art, token semantics, log substrate, XTDB applier, overlay pitfalls

**Written:** 2026-11-07 by research agent R23 (Sonnet xhigh); saved by the orchestrator. **Moves:** P2 (ACK), P3 (feed lag), then P1/P4
through read routing. **Scope:** EXP-P2B, Q50d hardening, Q55c.

## How to read this report
- **Evidence labels.** `[S]` read in pinned source or on a lab branch. `[W]` web primary document fetched 2026-11-07. `[P]` measured by R23
  on this Mac. `[E]` inference. `[R13]` from `lab/research/R13-log-of-record.md`.
- **Not done.** No engine or container started; no XTDB 2.2.0 run, so every XTDB statement is from source and docs (probe list in section
  8); no LMDB or LevelDB binding installed; no power cut, so every power-loss statement is an argument, not a test.
- **Conditions.** Load average 14 to 16 on 12 cores; the data volume was 97% full (15 GiB free). Numbers are relative under the same load.
- **Raw material:** `/Users/sam/Claude/Projects/triplex-db-2/R23/`: `scripts/` (nine Node scripts), `out/` (results quoted below), `raw/`
  (about 1.8 MB of fetched docs and source: SQLite, LMDB, RocksDB, LevelDB, libSQL, Kafka, MongoDB, Spanner, XTDB 1.x).

## 0. Answer
Build EXP-P2B as two separate experiments.

**EXP-P2B (XTDB as a second replica, broker substrate unchanged):**
- An XTDB applier sends one pgwire transaction per broker frame: `ASSERT EXISTS` on a marker row, `INSERT` the rows, `INSERT` the new marker.
- Reuse P2X's `XtdbClient.transact` and `checkpointStatements`; an ASSERT failure arrives as SQLSTATE `P0004`.
- Read rows and marker in one read-only XTDB transaction, so replica, overlay, log routing carries over.
- XTDB's system time can carry the frame's monotonized commit time, not the broker position; the marker row stays the authority.
- Start with XTDB's Local log (matches `xtdb-config.yaml`); an InMemory log with an epoch bump is an arm, because `LocalLog` never trims.

**Hardening experiment (after P2B has numbers):**
- Replace `HostLog`, the pid lock, the WATERMARK file and the in-memory maps with one SQLite file per stream: `better-sqlite3`, WAL,
  `synchronous=FULL`, `fullfsync=ON`, `checkpoint_fullfsync=ON`, `locking_mode=EXCLUSIVE`, application-driven checkpoints.
- Frames, a persisted overlay, and heads/claims/operations in that one file.
- Measured `[P]`: a 10-fact-shaped commit 3.0 ms p50 and about 6.0 ms p99, against 3.0 and 6.9 ms for a bare append plus `F_FULLFSYNC`
  under the same load. 30 SIGKILLs over 8,959 acknowledged commits lost nothing. A 202 MB un-checkpointed WAL recovers in 113 ms.
- Two measured traps: SQLite's macOS default (`fullfsync` off) is not power-loss durable (0.16 ms commits), and a one-byte flip in the middle
  of the WAL silently dropped 71 of 100 acknowledged commits with `integrity_check` still "ok". Keep the marker cross-checks.

**Q55c against mature systems.** They all report the basis, separate "at least" from "exactly at", and thread the token automatically in a
session, then wait with a timeout or fail typed. Q55c matches on reporting and typed failure; it differs by merging "after" and "at" into
one token, not threading the token per session, and defaulting to stale. Recommendation: a small change plus one sharper question for Sam
(section 7).

| # | Question | Verdict | Basis |
|---|---|---|---|
| 1 | Prior art | Two families: a source-side read surface (Debezium outbox, Kafka Streams state store, Datomic) or wait/typed-fail (XTDB, Mongo, PG, LiteFS). P2Q uses both plus an outside-the-engine merge. | `[W]` `[S]` |
| 2 | Token semantics | Q55c needs an `after` / `at` split and automatic per-session threading | `[W]` `[S]`; recommendation `[E]` |
| 3 | Substrate | SQLite via better-sqlite3, with three stated traps | `[P]` `[S]` `[W]` |
| 4 | XTDB replica | SQL applier with ASSERT guard; marker row authoritative; `ExternalSource` SPI is the fallback | `[S]` |
| 5 | Overlay | Exact today only by an invariant; persist it; never merge aggregates, Datalog, or pages | `[S]` `[E]` |

## 1. Prior art: an engine kept behind a durable log, with read-your-writes

| System | Where the ACK happens | How a reader asks for "at least my write" | Replica lags | Replica or primary down |
|---|---|---|---|---|
| **Datomic** `[W]` | After storage acknowledges the log write (docs.datomic.com/transactions/acid.html); transactor processes serially (transaction-processing.html). | `sync(t)`; `sync()` pings the transactor; `as-of(t)` is "no more than" t; pass t between processes "via cookie" (client-synchronization.html). | `sync(t)` waits; no timeout documented there. | Peers keep reading during transactor failover (operation/ha.html); writes not retried; after a timeout the peer does not know whether the transaction succeeded. |
| **XTDB 1.x** `[W]` `[R13]` | `submit-tx` returns after document store and tx log writes (Kafka `acks=all`). | `await-tx node tx [timeout]`, or `sync`. | Blocks; throws on timeout. | Index node resumes from `latest-completed-tx`; an ingester error halts indexing. |
| **libSQL embedded replica** `[S]` `[W]` | Remote primary runs the write and returns `current_frame_no`; client keeps the maximum (`libsql/src/replication/connection.rs:209-236`, `database.rs:474`). | Automatic `sync_oneshot` after a delegated write (`connection.rs:232-234`); manual `sync_until(frame_no)` (`database.rs:416`). | The write call blocks while syncing. | Reads from the local file; primary-unreachable behavior not documented. |
| **LiteFS** `[W]` | Local SQLite commit on the primary; the proxy tags the response with a cookie holding the commit TXID. | Replica position is TXID plus checksum; the proxy holds a GET until the position reaches the cookie (docs.fly.io/litefs/proxy). | Waits; times out "eventually"; a node over the lag threshold reports unhealthy. | Writes forwarded to the primary. |
| **Litestream** `[W]` | Local commit; replication asynchronous. | No read-your-writes protocol; VFS read replicas poll. | Lag is the data-loss window. | Restore at LTX file boundaries. |
| **Debezium outbox** `[W]` | Source database commit including the outbox row. | Not needed for the writer: the source database serves its own writes; consumers eventually consistent. | At-least-once; consumers record event ids with their effect. | Not covered. |
| **Kafka Streams IQv2** `[S]` `[W]` | Producer ack for input/changelog; store built by processing. | `StateQueryRequest.withPositionBound(PositionBound.at(position))`. | Typed `NOT_UP_TO_BOUND`, "retry later or query a different replica" (`QueryResult.java:82-88`). | `NOT_PRESENT` / `NOT_ACTIVE` typed. |
| **Materialize** `[W]` | Upstream commit. | `SET real_time_recency = true` under strict serializable (bounded by `real_time_recency_timeout`). | Strict serializable waits; serializable does not; bounded staleness never waits and fails SQLSTATE 40001. | n/a |

**What this means for P2B.** Family A has a source-side read surface that is always current (Debezium source database, Kafka Streams store,
Datomic transactor and live index); family B has only a log, so the reader waits (XTDB 1.x, Mongo, PG, LiteFS) or gets a typed failure
(Kafka IQv2, Materialize). P2Q's broker has a log, an in-memory overlay and an outside-the-engine merge; the merge is the one design no
mature system uses outside its own storage engine (Datomic merges inside the engine behind one value carrying `basis-t`). The closest
analogy is the Debezium outbox: the broker frame is the outbox row and the host log is the database, so the broker needs a persisted,
queryable record of recent rows (section 5.4), not an ever-growing in-memory overlay. On any write or fsync failure the broker stops
acknowledging and exits (R13 1.3), as Datomic treats unknown outcomes.

## 2. Basis tokens on native query surfaces

| System | Token and direction | Reports the basis? | Lag handling | Source |
|---|---|---|---|---|
| **MongoDB** | `afterClusterTime` = at least, set automatically by drivers in causal sessions; `atClusterTime` = exact, not combinable with `afterClusterTime`. | Session `operationTime` / `clusterTime` (response contents `[E]`) | Server waits until its oplog reaches T; bounded by `maxTimeMS` | `source/reference/read-concern.txt:517-555` `[W]` |
| **Cosmos DB** | Session token (`x-ms-session-token`) from every write; SDK tracks it within one client; carried by hand across clients; partition-bound. | Yes, in headers | Read session unavailable = 404 substatus 1002; SDK retry target not on Microsoft's page | `how-to-manage-consistency`, `troubleshoot-not-found` `[W]` |
| **CockroachDB** | No token. `AS OF SYSTEM TIME` exact; bounded staleness `with_min_timestamp` / `with_max_staleness` picks the freshest locally servable timestamp. | Only in `EXPLAIN ANALYZE` | `nearest_only` errors instead of reading remotely; a too-recent exact timestamp goes to the leaseholder | `follower-reads` `[W]` |
| **PostgreSQL 19** | LSN from the primary; `WAIT FOR LSN 'x' WITH (MODE, TIMEOUT, NO_THROW)`. | No; returns `success`, `timeout` or `not in recovery`; the timeout error names the current LSN | Waits; timeout 0 = forever; application falls back to the primary | `sql-wait.html` `[W]` |
| **Spanner** | No token; bounded staleness (`minReadTimestamp`, `maxStaleness`) vs exact (`readTimestamp`, `exactStaleness`); bounded only in single-use read-only transactions. | Opt-in `returnReadTimestamp` | Bounded staleness "may still block" | `timestamp-bounds`, REST `TransactionOptions` `[W]` |
| **Kafka Streams IQv2** | `PositionBound.at(p)` = at least. | Yes: `StateQueryResult.getPosition()` (`StateQueryResult.java:95-110`) | No wait; typed `NOT_UP_TO_BOUND` | `[S]` |
| **XTDB 2.2** | `AWAIT_TOKEN` = lower bound; `SNAPSHOT_TOKEN` = upper bound pinning a repeatable snapshot; the client defaults `await-token` to its last submitted transaction. | `SHOW AWAIT_TOKEN`, `SHOW SNAPSHOT_TOKEN` | Waits; `tx-timeout` default unlimited | `references/xtdb/docs/.../about/txs-in-xtdb.md:46-67,116`; `reference/main/xtql/queries.md:654-696` `[S]` |
| **Datomic** | `sync(t)` = at least; `as-of(t)` = no more than. | Every db value has `basis-t` | `sync` waits | `[W]` |

**Where Q55c matches:** every answer reports its basis; a token is a lower bound with wait-then-typed-fail carrying the observed position;
no surface presents an answer at a basis it was not computed at (XTDB's own docs warn a `SNAPSHOT_TIME` read on a lagging node may return a
state the system "may never have been in", `txs-in-xtdb.md:136-141`).

**Where Q55c differs:**
1. One token called a lower bound; every system above has two ("at least" and "exactly at / no more than"). P1 is an exact-point-in-time
   requirement and TARGETS 4.1 item 4 already requires reconstructing B, not only reaching it.
2. The default is stale. Mongo drivers, the Cosmos SDK, the XTDB client (`queries.md:658`), libSQL (`read_your_writes`) and the LiteFS proxy
   thread the token automatically for the same session; Q55c leaves a client that just committed with a native query that may not see it.
3. Unreachable replica fails typed; others route to another copy. Fine here only because the broker has no native query surface of its own.
4. "Every answer reports the basis" is stricter than common practice (PG, CockroachDB do not) and holds only through a Triplex facade; a
   direct connection to the engine port reports nothing.
5. The deadline default is unspecified (XTDB's unlimited default is a hazard; Mongo is unbounded without `maxTimeMS`).

## 3. The host log's substrate

| | Hand-rolled framed file (P2Q) | **SQLite WAL (better-sqlite3)** | LMDB (lmdb-js) | LevelDB / RocksDB (classic-level) | `@zamurai/wal` |
|---|---|---|---|---|---|
| macOS power-loss flush | `F_FULLFSYNC` via libuv `[R13]` | Only with `PRAGMA fullfsync=ON` (default off); `os_unix.c:3815-3829` calls `F_FULLFSYNC` only when `fullSync` | `F_FULLFSYNC` by default on Apple (`mdb.c:185`); data pages then meta synced (`mdb.c:4217-4219`, `:4503`); about 6 ms floor `[E]` | Yes: LevelDB `env_posix.cc:398-406`; RocksDB `io_posix.cc:1608,1626` | not checked |
| kill -9 | R13 tests (72,204 truncation points, 300 random cuts) | 30 kills, 8,959 acked commits, 0 lost `[P]` | copy-on-write B+tree, no WAL | WAL replay, recovery modes | not checked |
| Group commit | application-level, one frame per group | application-level, one transaction per group | lmdb-js batches async writes `[E]` | write batches | not checked |
| Rotation, checkpoints | none (single segment, rotation out of scope in `log.ts`) | `delete from frames` plus WAL checkpoint; checkpoint plus manifest in one transaction | no log; file does not shrink `[E]` | compaction competes for I/O | manual |
| Single-writer lock | pid file `log.ts:88-110` | `locking_mode=EXCLUSIVE`: `SQLITE_BUSY` while held, free after SIGKILL `[P]` | lock file `[E]` | LOCK file | n/a |
| Recovery time | full scan, JSON decode of every frame, rebuild three Maps (`broker.ts:242`) | 113 ms for a 202 MB WAL `[P]` | immediate `[E]` | WAL replay | not checked |
| Code we stop maintaining | none | `frame.ts` (221 lines), `log.ts` (402), pid lock, WATERMARK, torn-tail handling, rotation | lock/recovery only | more, plus a larger engine | small single-maintainer v0.4.0 (CRC32, not CRC32C) |

No other embedded log library with maintained Node bindings was found; Kafka-class logs are servers.

**Measurements `[P]`** (`R23/out/`), same machine and load. Baseline bare `append + fs.fsyncSync` of 1,060 bytes (400 samples): p50 3.01 ms,
p99 6.94 ms, max 7.97 ms.

| Variant | n | p50 ms | p99 ms |
|---|---|---|---|
| WAL, `FULL`, `fullfsync=0` (macOS default), 1 KiB row | 300 | 0.16 (not power-loss durable) | 4.08 |
| `FULL`, `fullfsync=1`, 1 KiB row | 300 | 3.99 | 14.14 |
| `EXTRA`, `fullfsync=1` | 300 | 3.24 | 10.97 |
| `NORMAL`, `fullfsync=1` | 300 | 0.01 (not durable) | 0.21 |
| 64 rows per transaction, `FULL`, `fullfsync=1` | 100 | 3.24 | 26.03 |
| 10-fact shape (3,000 B frame + 10 row upserts + head + operation, one per transaction) | 300 | 3.22 | 10.67 |
| Same, `EXCLUSIVE`, inline `wal_autocheckpoint=1000` | 2 x 2,000 | 3.21 / 2.98 | 13.6 / 10.0 (p99.9 56.4 / 19.7) |
| Same, `EXCLUSIVE`, `wal_autocheckpoint=0` plus `wal_checkpoint(PASSIVE)` every 200 commits | 2 x 2,000 | 3.03 / 3.00 | 5.95 / 6.04 (p99.9 12.6 / 10.5) |
| 16 such commands in one transaction | 100 | 5.74 | 24.35 |

- Process kill: 30 SIGKILL rounds, 8,959 acknowledged, 0 missing, 0 gaps, `integrity_check` ok each time; reopen median 5.9 ms, max 20.5 ms.
- Recovery: 202 MB WAL after SIGKILL opened and answered in 113 ms; `wal_checkpoint(TRUNCATE)` then 481 ms.
- Exclusive lock: a second process got `SQLITE_BUSY`; after SIGKILL of the holder it opened.
- Kernel flock without an addon: Node 22 has no `fs.flock`; a `perl` child holding `flock(LOCK_EX)` until stdin closes worked (contender exit 3
  while the parent lived; lock acquired after the parent was SIGKILLed).

**Three traps:**
1. macOS default not durable: `fullfsync` and `checkpoint_fullfsync` default off and are per connection; P2Q's `calibrate()` check
   (`log.ts:118-138`) must carry over (median under about 1 ms means the pragmas are not in effect).
2. WAL recovery cannot tell a torn tail from mid-log corruption: one flipped byte at 30% of a 1.24 MB WAL with 100 acked commits recovered 29,
   no error, `integrity_check` ok `[P]`; recovery stops at the first bad cumulative checksum (`fileformat2.html` 4.1). The hand-rolled chain
   refuses to start. Keep P2Q's cross-checks (replica marker above log head refuses, `broker.ts:223-229`; consumer checkpoint above head
   refuses) and add one per replica marker.
3. Synchronous API: `better-sqlite3` blocks the event loop per commit (about 3 ms, p99 about 6 ms): about 4% of loop time at 12 commands/s,
   16% at the 55/s burst. Use a worker thread if readers share the process (P2Q saw p99 rise to 42 ms with reads and applier in one process).

Smaller: WAL-reset corruption bug fixed in SQLite 3.51.3 (two or more connections only); `better-sqlite3` 12.10.0 bundles 3.53.1;
`node:sqlite` in Node 22.23.2 is 3.51.3 and experimental, so use `better-sqlite3`. WAL readers cannot see a commit before its WAL sync under
`FULL` (`wal.c:4296-4360`), so an in-process feed reader never sees an unsynced frame and the WATERMARK file race (R17 3.2) goes away.

**Recommendation: SQLite via `better-sqlite3`.** Pragmas `journal_mode=WAL`, `synchronous=FULL`, `fullfsync=ON`, `checkpoint_fullfsync=ON`,
`locking_mode=EXCLUSIVE`, `wal_autocheckpoint=0`, `auto_vacuum=INCREMENTAL`; `wal_checkpoint(PASSIVE)` from a timer when the queue is empty.
Order: (1) `SqliteLog` with the `HostLog` surface (`append`, `readFramesFrom`); (2) `heads`, `claims`, `operations` as tables (today rebuilt
from the whole log at open, `broker.ts:171-173`); (3) `recent_rows` (5.4) with retention `lsn <= min(replica markers, consumer checkpoints) -
window`. Keep a CRC32C column and `prev_crc` chain, a `committed_at` column (Q55d needs the source's publication timestamp; today's
commit-group payload has none, `frames.ts`), and an `epoch` row incremented in the open transaction. `locking_mode=EXCLUSIVE` is the lock and
excludes other processes from reading, so the feed consumer runs in the broker process or behind `http.ts`. If the hand-rolled log stays for
P2B, the perl helper is the zero-dependency `flock` of Q50d item 3. Not recommended: LMDB, LevelDB/RocksDB, `@zamurai/wal`. Cost: a native
dependency and maybe a worker thread; removes about 620 lines of durability code and Q50d items 2 and 3.

## 4. XTDB 2.2.0 as the replica

**4.1 Applier transaction** (template on the P2X branch: `CommitFeed.ts:313-333` fences a checkpoint with `ASSERT EXISTS / NOT EXISTS ... FOR
ALL VALID_TIME WHERE _id = ?` plus an `INSERT` with `_valid_from` fixed at 1970; `XtdbClient.ts:296-332` runs `BEGIN`, statements, `COMMIT
SYNC` and maps `P0004` to `XtdbTransactionRejected`):
```
BEGIN READ WRITE [, SYSTEM_TIME = <frame committed_at>]          -- optional, see 4.3
ASSERT EXISTS (SELECT 1 FROM broker_marker FOR ALL VALID_TIME
               WHERE _id = ? AND epoch = ? AND position = ?), 'triplex-replica-guard'
INSERT INTO triples (_valid_from, _id, ...columns) VALUES (TIMESTAMP '1970-01-01T00:00:00Z', ?, ...)   -- parameters only
INSERT INTO broker_marker (_valid_from, _id, epoch, position, lsn) VALUES (TIMESTAMP '1970-01-01T00:00:00Z', ?, ?, ?, ?)
COMMIT SYNC
```
First frame: `ASSERT NOT EXISTS` (`CommitFeed.ts:320-322`).

**4.2 Why idempotent and fenced `[S]`:** marker and rows in one XTDB transaction, a failed ASSERT aborts all and is recorded in `xt.txs`
(`txs.md:119`); transactions indexed in order one at a time, so an ASSERT sees the previous marker even with pipelined `COMMIT ASYNC`
(`txs.md:190`), and a failed guard makes later ones abort the same way until the applier re-reads and resumes; `INSERT` on an existing `_id`
upserts (`txs.md:28`); a fixed `_valid_from` prevents new valid-time slices on replay (the P2X keyed-effects defect); look up `_id` only (P2X:
`scope_key` scans 39 ms against 3 ms); an applier with an older epoch fails the guard.

**4.3 Explicit system time.** It can carry the frame's commit time, not the position. (a) No explicit system time: XTDB uses the log timestamp
bumped past the latest (`TxResolver.kt:211-216`); `AS OF SYSTEM_TIME` unrelated to broker time; simplest, use for P2B. (b) System time =
frame `committed_at`, strictly increasing (`max(prev + 1 us, now)`, persisted): `FOR SYSTEM_TIME AS OF T` returns frames committed at or
before T at XTDB-transaction granularity; 2.2.0 rejects a time not later than the latest completed transaction (`TxResolver.kt:219-243`;
`txs.md:222-224`), the rejected transaction still takes latest + 1 us, and several frames in one XTDB transaction share the last frame's
time. (c) Position encoded as time: never. Repository pulls do not use XTDB system time; the kernel filters on `recorded_position`; the marker
is the eligibility authority. External-source transactions smooth instead of rejecting (`TxResolver.kt:324-331`).

**4.4 Batching:** one broker frame (up to 64 commands) per XTDB transaction in steady state (statements are sequential round trips,
`XtdbClient.ts:301-305`; keep three or four); when behind, coalesce up to K frames capped at a few thousand rows (sweep rows per transaction
in {15, 100, 500, 2,000}); pipeline `COMMIT ASYNC` at depth 4 to 8 (`LocalLog` forces once per up to 10 queued messages, `LocalLog.kt:201`);
parameters-only sources (per-cell expressions exhausted the heap in P2X, `operator/table.clj:106-113`); Bind carries the parameter count as
int16, so at most 65,535 parameters per statement `[E]`.

**4.5 Local log and indexer when XTDB is not the source:** each transaction is two durable appends (source log and replica log,
`dbs-in-xtdb.md:222`; `ReplicaLogAppender.kt`), `force(true)` per batch (`LocalLog.kt:169`), about 0.13 to 1.2 ms per force in the VM
`[R13 2.2]`, off the ACK and feed paths. `LocalLog` never trims (only the failed-write rollback `truncate`, `:183`); applier bytes per command
unmeasured, probably near A0's 27,581. InMemory arm: `Database.kt:440` defaults to `Log.inMemoryLog`; `InMemoryLog.Factory` takes `epoch`;
ids restart at 0 after restart; 2.2 refuses to start if the log epoch is below storage's, and older versions acknowledged then discarded
transactions (`ops/config/log.md`), so bump `epoch` at every start (broker epoch via `engine.mjs`); a crash loses what is not in a block
(`rowsPerBlock: 102400`, `flushDuration: PT15M`, `ops/config.md:269-273`), and the broker replays from the marker (lower `flushDuration` to
shorten replay, at the cost of more small blocks). The serial indexer now limits only replica freshness. Read-only transactions do not lock
or degrade concurrent reads and writes (`txs-in-xtdb.md`).

**4.6 Alternative: the `ExternalSource` SPI** (`core/src/main/kotlin/xtdb/api/tx/ExternalSource.kt:1-60`): `onPartitionAssigned(partition,
afterToken, txIndexer)`; XTDB persists an opaque `ExternalSourceToken` per transaction and block and resumes from it; the database is a
read-only mirror rejecting pgwire writes; explicit `systemTime` smoothed (`TxResolver.kt:324-338`); used by the Postgres and Kafka Connect
sources. Costs a Kotlin module in the pinned image and internal `OpenTx` APIs. Use only if the SQL applier is the bottleneck.

**4.7 Reads:** `BEGIN READ ONLY; SELECT ... FROM broker_marker ...; SELECT ... FROM triples WHERE ...; COMMIT`; the snapshot is fixed at the
first query, so rows and marker are one snapshot, as in QLever's single request (`BrokerStorageAdapter.ts:214-231`). Eligibility is `marker
>= B`; do not use `AWAIT_TOKEN` (XTDB log positions, not broker positions).

## 5. Overlay-merge correctness
**5.1 Why today's merge is exact (an invariant):** the overlay keeps the latest version per row id (`broker.ts:496-505`); a retraction is a
new version of the same id changing only `retracted_*`; pattern matching tests entity, attribute, type and value, which never change; merge
is `byId.set(row.id, row)`; visibility is evaluated after, in the kernel, by `visibleAt(B)`, exact because retraction metadata is kept until
erasure.

| # | Pitfall | When it bites | Handling |
|---|---|---|---|
| 1 | Predicate applied to the overlay's new version only, so a replica row matching the old version stays (ghost row) | Any update changing a filtered column; P2Q safe only by the invariant | Assert the invariant in a test; otherwise fetch overlay versions by key set first and filter after merging |
| 2 | Absence from the overlay is not deletion; the replica's row reappears | `erase`, physical deletes, crypto-shredding; frames carry rows only (`frames.ts`) | Explicit tombstones in frames; erasure also purges payloads from the log and `recent_rows` |
| 3 | Overlay always wins (`byId.set`) | Replica ahead of the overlay snapshot, or two replicas at different markers | Compare LSN, keep the greater |
| 4 | As-of reads: overlay is head, replica may have compacted history | Past-basis reads; XTDB GC (`blocksToKeep: 10`, `garbageLifetime: PT24H`) | Kernel `visibleAt(B)` over the id-keyed merge; engine time clauses not exact while the replica lags; TARGETS 4.1 item 4 eligibility |
| 5 | Engine aggregates cannot see overlay rows | Native and executor reads | Never merge; wait or fail typed (Q55c), or aggregate in the kernel (P2Q `dependencyState`, `BrokerStorageAdapter.ts:413-425`) |
| 6 | LIMIT/ORDER BY: overlay changes the top N; collations differ | Sorted, limited lists | Over-fetch by touching overlay rows, or sort only in the kernel |
| 7 | Pagination shifts when overlay rows land between pages; route changes between pages | Multi-page reads | Cursor = (basis B, sort key, id) keyset at fixed B; refuse paging on a merged route unless the kernel pages (Elasticsearch: without a point in time pages "could miss or duplicate hits") |
| 8 | `fromLog` costs O(tail) and allocates the whole tail | Replica restart or outage; `broker.ts:570` passes `Number.MAX_SAFE_INTEGER`; `log.ts:352` `Buffer.alloc(length)` | Persisted overlay indexed by entity (5.4) |
| 9 | Overlay unbounded when publication stalls (evicts 2 s after `publishedAt`, `broker.ts:507-515`) | Replica outage (Q50d) | Bound with typed `Overloaded` at admission |
| 10 | Marker and rows in separate requests | Every route | One request / read-only transaction; for native SPARQL read the marker before and after, report the interval if they differ `[E]` |

**5.3 Avoiding the merge:** Kafka Streams queries the store the log built (typed `NOT_UP_TO_BOUND`); Debezium's source database answers reads;
Elasticsearch GET is real-time and separate from search, which uses `refresh=wait_for` and point-in-time paging; XTDB, Mongo, PG, LiteFS wait;
Datomic merges inside the engine; LSM stores keep deletion markers until compaction (LevelDB `doc/impl.md:25,104`).

**5.4 Recommendation:** persist the overlay as `recent_rows(id PK, entity, lsn, row)` plus an entity index in the broker's SQLite, written in
the commit transaction; delete rows at or below every replica's marker (after the 2 s reader retention). O(log n) fallback, no memory bound,
no rebuild at open. Id-keyed merge for entity pulls only; aggregates, Datalog/executor reads and paged lists wait or fail typed. With
unlimited retention `recent_rows` becomes Q50a's full entity store and the merge disappears for pulls (an EXP-Q05 decision).

## 6. Recommended EXP-P2B
```
 commands (one subject each)
      |
      v
 +------------------- broker process (macOS host) ----------------------+
 | decide: claims, per-subject CAS (heads / claims / operations)        |
 |    v   one commit group = one log append + one F_FULLFSYNC (~3 ms)   |
 | frames + recent_rows (+ later: SQLite)  --> ACK after durable        |
 |    +--> feed (Q55d: lag from source publication to consumer record) |
 |    +--> applier per replica, each with its own marker                |
 |          QLever: guarded SPARQL update (marker in the graph)         |
 |          XTDB  : ASSERT marker; INSERT rows; INSERT marker           |
 +----------------------------------------------------------------------+
 pull at B: replica (marker >= B) | replica + recent rows | recent rows
 native   : facade -> wait(after) | at | typed error; always report basis
```
**Steps** (rough agent time `[E]`): (1) freeze the comparison (30 min): P2X's trace, seed and slot (`p2x-a`, 10k subjects, 300 s, 60 s burst
at 55/s, about 20k history); arms A1 (P2X subject-stamp), B (P2B), Q (P2Q). (2) Probe XTDB 2.2.0 (1 h, section 8). (3) Extract the broker
core behind a `Replica` interface (marker read, guarded apply, row read); add `committed_at` to the commit-group payload and a marker per
replica (about 3 h); QLever becomes one implementation. (4) XTDB applier and read path from 4.1 and 4.7 (about 4 h). (5) Fault tests (2 h):
duplicate batch, old epoch, lost response, XTDB SIGKILL mid-burst (`engine.mjs` needs `kill`, Q51f). (6) Measure batch {1 frame, up to 8} x
XTDB log {Local, InMemory + epoch} x faults {none, XTDB kill, XTDB stall 60 s} x native reads {with `after`, without}.

| # | Prediction | Basis | Falsified if |
|---|---|---|---|
| 1 | ACK p50 <= 8 ms and p99 <= 50 ms in the 5-10 and 11-25 bands; 26-50 p99 <= 100 ms | ACK path unchanged from P2Q (6.7 / 42.2 ms) | ACK latency correlates with XTDB backlog (abs r > 0.2), or steady p99 > 50 ms |
| 2 | Feed lag (Q55d) p99 <= 50 ms steady, <= 250 ms through the burst | P2Q 12.8-24.5 ms | Lag moves with replica backlog |
| 3 | Apply lag p99 <= 2 s steady; the 55/s burst drains within 60 s | 3-statement apply without read-back `[E]` | Apply lag > 10 s at 12 commands/s |
| 4 | 100% of pulls at the returned position correct; replica route >= 80% of steady pulls; log route 0% once `recent_rows` exists | P2Q 57/57, 114/114 | Log route > 1%, or a pull > 25 ms because of its route |
| 5 | XTDB SIGKILL: 0 acknowledged commits lost; catch-up within 2x the outage; pulls correct throughout | Marker inside XTDB, broker replay | Any loss or wrong pull |
| 6 | 100/100 injected duplicate or old-epoch applies abort with `P0004`, 0 duplicate rows, marker unchanged | 4.2 | Any duplicate |
| 7 | XTDB bytes per applied 10-fact command <= 35 KB (Local), about 0 log growth (InMemory) | A0 27,581 B; P2X 95,364 B | > 95 KB |
| 8 | Native query with `after`: 100% of sampled answers equal the oracle at the reported basis; typed `BasisNotAvailable` (with observed position) at the deadline | 4.7, 7 | An answer differs from the oracle at its reported position |

**Measure:** ACK p50/p90/p99 per band against the TARGETS 2.1 schedule; feed lag per Q55d with the frame's commit time; replica apply lag in
frames and ms; XTDB apply throughput (transactions/s, rows/s by rows per transaction); route shares and per-route latency; overlay or
`recent_rows` size; XTDB disk growth (Local log, blocks, bytes per command); broker and XTDB CPU; receipts bind fsync mode, `F_FULLFSYNC`
calibration, XTDB config hash and epoch (Q55b).

**Hardening experiment (after P2B):** `SqliteLog` behind `HostLog`, then tables for heads/claims/operations, then `recent_rows`.
H1 ACK p50 within +0.5 ms and p99 within +3 ms of `HostLog`; H2 100 SIGKILLs in a burst: 0 acked lost, open < 1 s at 1 GB of log; H3 a second
broker on the same directory fails within 200 ms and a successor opens < 1 s after SIGKILL; H4 a 10 min replica outage at 12/s keeps broker
RSS flat and gives typed `Overloaded` at the disk bound; H5 open time independent of history (1M claims < 1 s); H6 one corrupted byte in an
acknowledged region makes the broker refuse to start through a marker or checkpoint cross-check (plain SQLite fails this).

## 7. Q55c recommendation
**Proposed text (replaces the native-surface half of Q55c):** native queries go through a Triplex facade; engine ports are not public. A
request may carry `after: position` (wait until the replica marker reaches it within the deadline, then typed `BasisNotAvailable{required,
observed, replica}`) or `at: position` (exact; also requires the engine to reconstruct that position, else typed `BasisNotReconstructible`). A
client session tracks its own high-water mark (last commit position and last read basis) and sends it as an implicit `after`. Tokenless
external callers get the replica's watermark and the reported position. Every answer carries `{basis: {low, high}, route}` from the marker
read in the same snapshot (XTDB) or around the query (QLever). Replica unreachable stays `ReplicaUnavailable`. Default deadline 2 s.

**Sharper question for Sam:** after a Triplex client commits and then runs a raw native query (SPARQL, XTQL or SQL) on the same client without
naming a basis, should that query (a) wait for its own commit to reach the replica, up to a deadline, then fail typed, or (b) answer
immediately at the replica's current position and report that position? (a) is what the Mongo drivers, the Cosmos SDK, the XTDB client and
the LiteFS proxy do; it removes "I just wrote this and my query does not show it", but native latency then includes replica lag, which on
XTDB can be seconds when its indexer is busy. (b) is cheap and honest but the surprising default, and no mature system chose it for a client's
own session. R23 recommends (a) for the same client session and (b) for tokenless external callers, the XTDB client's own rule.

## 8. Open questions
1. XTDB probes before coding: ASSERT as the first statement of a DML transaction; `P0004` on `COMMIT SYNC`; `COMMIT ASYNC` pipelining with
   failing guards; explicit `SYSTEM_TIME` over pgwire from the Node driver; safe rows per statement; `FOR SYSTEM_TIME AS OF` equals the frames
   committed at or before the time.
2. Is the 2 s overlay retention (`broker.ts:508`) enough for a reader holding an older replica snapshot when publication is slower than QLever's?
3. Claims and operations retention: lost-ACK resolution must return the original receipt, but for how long (keep, or N days then a typed
   unknown-operation error)?
4. Erasure against a log that holds values: `erase` must reach frames, `recent_rows` and checkpoints (crypto-shredding?); blocks any
   retention design (TARGETS 7).
5. Checkpoint source at scale: a full entity store in the broker is a fourth copy, about 25 GB or more at the 100M-fact scale, beyond this disk.
6. Whether the SQLite worker thread is worth it at the trace's rates or only under P1's 256 readers in one process.
7. Multi-scope: one SQLite file per scope means one fsync per scope and no cross-scope group commit.
8. PostgreSQL 19 status of `WAIT FOR LSN` (beta in search snippets; `pg_wal_replay_wait()` committed then reverted, dates unverified).
9. Cosmos replica retry target on substatus 1002.
10. Frame size estimated 4 to 8 KB per 10-fact command from `frames.ts` `[E]`, unmeasured; it sets the log retention window against free disk.

## 9. Sources
Repository: `lab/experiments/EXP-P2Q-qlever-log-broker/REPORT.md`, `lab/experiments/EXP-P2X-xtdb-commit-feed/REPORT.md`,
`lab/acceptance/RULINGS-PENDING.md` (Q50, Q51, Q55), `lab/research/R13-log-of-record.md`, `lab/TARGETS.md` 4.1; branch
`exp/P2Q-qlever-log-broker` `packages/qlever/src/broker/{broker,log,frame,frames,feed,position,sparql,BrokerStorageAdapter}.ts`; branch
`exp/P2X-xtdb-commit-feed` `packages/xtdb/src/{CommitFeed,XtdbClient,XtdbStorageAdapter}.ts`; `references/xtdb` at v2.2.0 (`c6c19623`):
`core/src/main/kotlin/xtdb/indexer/{TxResolver,ExternalSourceProcessor,ReplicaLogAppender}.kt`, `api/log/{LocalLog,InMemoryLog,Log}.kt`,
`api/tx/ExternalSource.kt`, docs `about/txs-in-xtdb.md`, `about/dbs-in-xtdb.md`, `ops/config.md`, `ops/config/log.md`,
`reference/main/sql/txs.md`, `reference/main/xtql/queries.md`.
Web (fetched 2026-11-07; long ones under `R23/raw/`): SQLite `pragma.html`, `wal.html`, `walformat.html`, `fileformat2.html`, `testing.html`,
`os_unix.c`, `wal.c`; LMDB `mdb.c`; RocksDB `env/io_posix.cc` and WAL-Recovery-Modes wiki; LevelDB `util/env_posix.cc`, `doc/impl.md`; libSQL
`replication/connection.rs`, `database.rs`, Turso embedded replicas; LiteFS proxy docs and fly.io consistency post; litestream.io
how-it-works; Debezium outbox post; Kafka `StateQueryResult.java`, `QueryResult.java`, interactive-queries guide; Materialize isolation
levels; MongoDB `read-concern.txt`; Cosmos DB `how-to-manage-consistency`, `troubleshoot-not-found`; CockroachDB `follower-reads`; PostgreSQL 19
`sql-wait.html`; Spanner `timestamp-bounds`, REST `TransactionOptions`; Datomic `acid`, `client-synchronization`, `transaction-processing`,
`ha`; XTDB 1.x Clojure API; Elasticsearch `refresh-parameter`, `paginate-search-results`.
Scripts: `R23/scripts/{fsync-baseline,sqlite-bench,sqlite-bench2,sqlite-kill9,sqlite-kill9-worker,sqlite-recovery,sqlite-lock,sqlite-midcorrupt,flock-helper-test}.cjs`; results in `R23/out/`.

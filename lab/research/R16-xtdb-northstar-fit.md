# R16: How far XTDB 2.2.0 carries Sam's five priorities and the six requirements

**North star.** Moves P1 (pinned reads that never block writers), P2 (small idempotent commits), P3 (change feed), P4 (current path separate from history), P5 (release sweep) and the six requirements in `lab/TARGETS.md` section 3. Measured here on one XTDB 2.2.0 node. Goals and bars come from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

**Builds on** R1, R7, R10, R12, R14 (not repeated). Source pinned at `references/xtdb` (v2.2.0, sha c6c1962), cited `path:line`. Probe scripts and raw outputs: `/Users/sam/Claude/Projects/triplex-db-2/R16-xtdb-northstar/` (`misc-raw.txt` holds outputs printed to the terminal only).

## 0. Read this first

### 0.1 Verdicts in one table

| # | Verdict | Confidence |
| --- | --- | --- |
| P1 | Reads take no locks and tokens pin a basis, but readers and the single indexer share one JVM and CPU. In my runs, 4 or more closed-loop readers raised commit service time about 5x (17 ms to 90 to 112 ms), and a 40 commands/s writer fell behind. The P1 bar (commit p99 within 1.25x at 256 readers) is not met on a 2-CPU node. | Medium: one 2-CPU container on a loaded host, one early run disagreed |
| P1 connections | `pgwire` accepts 42 concurrent connections by default (`numThreads`). 256 readers need `server.numThreads` raised or a pooler. | High (source and probe) |
| P2 | Atomic CAS, claim-table idempotency, and read-your-own-write all work 100% of the time. Latency does not meet the bar: commit p50 16 to 24 ms (bar 10), p99 33 to 200 ms (bar 50). | High on correctness, Medium on latency |
| P3 | XTDB has no change stream. It exposes the log as SQL tables (`xt.source_log_msgs`, `xt.replica_log_msgs`) and `xt.txs`, which are enough to build a gap-free resumable feed, but nothing reports entity, attribute and valid-time range. The cheapest feed is `METADATA` plus a feed row written in the same transaction, tailed from `xt.txs` or the source log. | High |
| P4 | Native current/historical split exists (L1C versus L1H files, weekly recency buckets). Measured single-subject current pull p50 4.0 to 5.3 ms, p99 10 to 17 ms at history depth 1, 3, 10, which is nearly flat. A 4-query bounded pull of 40 entities costs 35 to 40 ms p50. | High (source), Medium (numbers) |
| P5 | A token pins no files. A 20k-subject sweep at one token gave identical results before and after writes, a block flush and compaction. Sweep rate 1,100 subjects/s under live load, 2,412/s alone, so 100k takes about 91 s and 41 s. Live pull p50 rose 57%. | Medium |
| Tenant isolation | `ATTACH DATABASE` gives one log and one storage path per tenant at runtime. Cost is about 6 MiB RSS and 0.6 threads per active tenant, so 1,000 small tenants do not fit on a 3.5 GiB node. | Medium |
| Erasure | `ERASE` removes rows across all valid and system time. The marker string stayed in both log files after `ERASE`. Storage-file removal is not measured. Crypto-shredding is needed for a hard guarantee. | High (logical and log), Low (storage) |
| Numbers | BIGINT `+` and `*` raise typed overflow errors, `SUM` wraps silently, DECIMAL stores exactly but has gaps (`MIN`/`MAX` fail, a numeric-typed parameter compare failed). 2^53 and above round trips and orders exactly as BIGINT. | High |

### 0.2 Measurement conditions (these bound every latency below)

1. Slot `s2`, container 2 CPU, 3.5 GiB, `-Xmx2g -XX:MaxDirectMemorySize=1g`, Local log and storage. Released with `down` at about 14:55 (orchestrator capacity request).
2. The host (12 cores) had load averages of 10.7 to 13.4 during the window because other agents were running probes. Absolute latencies are inflated by an unknown factor.
3. The load generator ran on the same host, 4 worker threads for readers.
4. The writer was an open-loop 40 commands/s (400 facts/s), not the fixed trace (1.5 commands/s steady, 75 commands/s bursts). It sits between the steady and burst rates.
5. Data: 100,000 subjects, one document per subject with 22 columns (8 BIGINT, 8 VARCHAR, 4 reference columns, `pos`, `ver`), loaded by Arrow `COPY`. Not the year-one scale.
6. One early P1 run (4 readers: 390 queries/s, commit p50 22 ms) was not reproduced by three later runs. I report the later runs and flag the early one as an unexplained outlier (`misc-raw.txt`).

### 0.3 Command shape used for P2 and P1 writes

One transaction per command, 8 statements, 10 facts:

```
BEGIN READ WRITE WITH (METADATA = {cmd, subj, pos})
  ASSERT NOT EXISTS (SELECT 1 FROM r16_claim WHERE _id = $cmd), 'dup'     -- idempotency, SQLSTATE P0004
  ASSERT (SELECT COALESCE(MAX(pos),0) FROM r16_ent WHERE _id = $subj) = $expected, 'cas'
  UPDATE r16_ent SET a0..a9 = ..., pos = $new WHERE _id = $subj           -- current index
  INSERT INTO r16_claim (_id = cmd, subj, pos)                            -- receipt
  INSERT INTO r16_ledger VALUES (10 rows)                                 -- append-only facts
  INSERT INTO r16_feed (_id = cmd, subj, pos, changes)                    -- feed row / outbox
COMMIT SYNC
```

Scripts: `writer.mjs`, `p2.mjs`, `p1.mjs`.

## 1. Q1 (P1): pinned reads that never block writers

### 1.1 Concurrency model (source)

| Fact | Evidence |
| --- | --- |
| One indexing leader per database. It consumes the source log, resolves each transaction, and publishes to the replica log. Followers tail the replica log and serve queries. | `docs/src/content/docs/about/dbs-in-xtdb.md` ("Database architecture"), `core/src/main/kotlin/xtdb/indexer/LeaderLogProcessor.kt:34` |
| Followers need a shared replica log (Kafka) and object store. The Local and in-memory logs are single-node only, so horizontal read scale-out requires Kafka. | `docs/src/content/docs/ops/config/log.md` (v2.2 source/replica log split) |
| A read-only transaction "defines a long-lived, stable basis" and "does not require locking or risk degrading performance of concurrent reads and writes". | `docs/src/content/docs/about/txs-in-xtdb.md:73-78` |
| A snapshot is a refcounted frozen view of the live index, trie catalog and table catalog. | `core/src/main/kotlin/xtdb/indexer/Snapshot.kt` (class comment, `retain`/`close`) |
| The pgwire server runs each connection on a virtual thread in a pool of `num-threads` (default 42). Extra sockets queue (queue length 42) or are refused. | `core/src/main/clojure/xtdb/pgwire.clj:1798,1806,1826,1773` |
| `server.readOnlyPort` starts a second pgwire server that rejects DML and DDL, with its own pool. | `core/src/main/kotlin/xtdb/api/ServerConfig.kt:14`, `pgwire.clj:1924,1943`, `docs/.../ops/config.md:175-185` |
| No per-query memory cap and no statement timeout in config. Query memory comes from the node's direct memory (`MaxDirectMemorySize`). Cancel (SQLSTATE 57014) exists. | `docs/src/content/docs/ops/config.md` (no setting found), `pgwire.clj:184,198` |

### 1.2 Measured: closed-loop pinned readers plus the open-loop writer

Reader unit = one bounded pull: 4 queries (`_id IN` batches of 1, 3, 9, 27) that return 40 entities and about 880 values, pinned with `SETTING SNAPSHOT_TOKEN = '...', CLOCK_TIME = TIMESTAMP '...'` on every query. A pinned-drift check (40 subjects read at the token before and after each level while 800 writes landed) showed 0 drift at every level. Writer: 40 commands/s over 4 connections, 15 s per level (`p1b.out`, clean subject pool, zero write errors).

| Readers | Pulls/s | Queries/s | Pull p50 / p99 (ms) | Commit p50 / p99 from schedule (ms) | Commit service p50 / p99 (ms) | Writer max queue |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | n/a | n/a | n/a | 19.9 / 120.3 | 19.6 / 105.7 | 3 |
| 4 | 20.8 | 83 | 178 / 426 | 3,588 / 4,822 | 112 / 337 | 188 |
| 16 | 26.8 | 107 | 577 / 1,218 | 7,239 / 9,120 | 90 / 523 | 343 |
| 32 | 21.9 | 88 | 1,364 / 3,019 | 10,599 / 12,266 | 77 / 916 | 475 |

The earlier run (`p1.out`, 20 s per level, about 12% of commands were cheap CAS aborts because I reused subjects):

| Readers | Pulls/s | Pull p50 / p99 (ms) | Commit p50 / p99 from schedule (ms) | Commit service p50 / p99 (ms) |
| --- | --- | --- | --- | --- |
| 0 | n/a | n/a | 17.3 / 43.2 | 16.4 / 32.9 |
| 1 | 37.9 | 23.9 / 58.3 | 17.7 / 41.8 | 17.2 / 41.7 |
| 4 | 20.7 | 154 / 650 | 3,115 / 6,601 | 94.6 / 612 |
| 16 | 60.3 | 234 / 862 | 339 / 1,536 | 77.9 / 345 |
| 64 | 80.3 | 488 / 20,412 | 8,862 / 13,769 | 43.3 / 268 |

Reading these:

1. **Nothing blocks, everything shares CPU.** Writes kept committing and pinned reads stayed exact at every level. But the container ran at 110 to 119% CPU (cap 200%) with 4 readers and no writer, and the writer's service time rose from about 17 ms to 90 to 112 ms once 4 or more closed-loop readers ran. The open-loop writer then queued.
2. **Read goodput does not scale with readers** on 2 CPUs: 83 to 107 queries/s from 4 to 32 readers. The P1 bar (goodput at 256 readers not below the 64-reader level) cannot be met by one 2-CPU node.
3. **The 64-reader level is invalid.** 64 readers plus 4 writers is 68 connections against a pool of 42 plus a queue of 42. The surplus sockets starved until the window ended (read p99 20.4 s). The cap is a configuration limit, `server.numThreads`.
4. **Read-only capacity without a writer:** 1 reader gave 85 queries/s (single-query p50 8.9 ms); 4 readers gave 124 queries/s (p50 23.5 ms) at 110 to 119% CPU.
5. **Not isolated:** whether the writer slowdown is CPU contention or a lock or queue inside the node. R1 and the source say there are no read locks; the evidence here is consistent with plain CPU sharing, but I did not profile it.

### 1.3 Implication for P1

- Per-node read capacity is bounded by the CPUs given to the JVM. A 256-reader goal needs followers (Kafka and an object store) or many more CPUs, plus `numThreads` raised.
- `readOnlyPort` gives a second pool, so reader connection storms cannot starve writer connections of pool slots. It does not separate CPU.
- Keep reads per write low: batch with `_id IN (...)` (50 ids per query gave 1,321 subjects/s on one connection, section 5).

**Open:** 256 and 1,024 readers; follower node; `numThreads` raised; a dedicated machine.

## 2. Q2 (P2): small per-subject commits

### 2.1 Measured (`p2.out`, command shape in section 0.3, one connection unless noted)

| Case | n | p50 | p90 | p99 | Notes |
| --- | --- | --- | --- | --- | --- |
| 10 facts, 1 connection, closed loop | 550 | 23.9 ms | 56.6 | 201.5 | 29 commits/s |
| 5 facts | 270 | 52.9 | 84.9 | 158.9 | run right after the first; noisy |
| 50 facts | 270 | 31.1 | 60.6 | 84.2 | |
| 10 facts, 4 connections, closed loop | 1,000 | 44.0 | 66.4 | 88.9 | 88 commits/s, 881 facts/s |
| 10 facts, 16 connections, closed loop | 4,000 | 89.5 | 129.3 | 176.2 | 172 commits/s, 1,722 facts/s |
| 10 facts, open loop 40/s, no readers (`p1b.out`) | 602 | 19.6 | 61.7 | 105.7 | service time; 0 errors |
| 10 facts, open loop 40/s, 1 reader (`p1.out`) | 801 | 17.2 | n/a | 41.7 | service time |

Per-statement cost on a quiet moment (`misc-raw.txt`, 1 connection, p50): single-row insert transaction 14.7 ms, plus `ASSERT NOT EXISTS` by `_id` 15.3 ms, plus CAS assert 20.7 ms (`ASSERT EXISTS (... _id AND pos = n)` is the same, 20.4 ms), 10-column `UPDATE` alone 20.6 ms, 10-row multi-row insert alone 6.8 ms. The floor is a commit round trip; the CAS assert adds about 5 ms.

### 2.2 Correctness (all 100%)

| Check | Result |
| --- | --- |
| Read-your-own-write, same connection | 200/200 |
| Read on a different connection with no token | 200/200 (the docs do not guarantee this, `txs-in-xtdb.md:40-66`) |
| Different connection after `SHOW AWAIT_TOKEN` and `SET AWAIT_TOKEN` | 200/200 |
| Duplicate `commandId` (lost-ACK retry) | 100/100 rejected with SQLSTATE `P0004` and message `dup`; receipt readable by `_id` in 11 ms; exactly 10 ledger rows for the command |
| CAS race (two commands, same expected `pos`) | one commits, the loser gets `P0004` `cas`, no partial rows |

### 2.3 `COMMIT SYNC` versus await tokens

`COMMIT SYNC` returns after the transaction is indexed on the connected node (R1 Q5/Q6). `ASYNC = true` returns earlier and a later read on the same connection waits (R7 Q4). Await tokens only matter for another node or process. Per H19 in R14, the token advances on writes only, so pass an explicit snapshot token across processes.

### 2.4 Implication for P2

- Correct today: atomicity, CAS, idempotency, receipts.
- The bar (p50 10 ms, p99 50 ms) is not met here: p50 16 to 24 ms, p99 33 to 200 ms, on a loaded host. The single-row floor of 15 ms in the quiet breakdown suggests the host, not the statement count, sets p50. A dedicated run could move this by a large factor; I cannot say how far.
- Throughput is not the constraint: 16 writers sustained 172 commits/s (1,722 facts/s), 2.3x the burst rate of 750 facts/s.
- Idempotency by `_id` of a claims table is a cheap `_id` lookup (about 11 ms read, about 12 ms rejected duplicate). A duplicate costs a full rejected transaction; a read of the claim row first would avoid the write path.

## 3. Q3 (P3): change feed

### 3.1 What XTDB 2.2.0 exposes

| Mechanism | What it gives | What it lacks | Evidence |
| --- | --- | --- | --- |
| `xt.txs` | One row per transaction: `_id` (equal to the source-log message id), `committed`, `error`, `system_time`, `user_metadata` (the `METADATA` map). | Entity, attribute, valid-time range. Range queries (`_id > x`) scan the table. | probe, R1 Q6 |
| `xt.source_log_msgs` | Ordered raw source-log messages by `msg_id` (log offset). Requires `msg_id` bounds. Includes `tx_ops` decoded to EDN. | Parameterised statements show the SQL text with Arrow argument bytes (`:args #bytes "ffff..."`), not values. Aborted transactions appear (commit status is not in the source log). Offsets must be exact record starts or the read fails with "log file corrupted ... expected record separator". | `core/src/main/clojure/xtdb/log_tables.clj:32-37,217-234` |
| `xt.replica_log_msgs` | Resolved messages: `resolved-tx` with `tx-id`, `committed`, `error`, `system-time`, `table-names`. | No row data, no metadata. Its offsets differ from tx ids. | same file, probe |
| Kafka replica topic (`${topic}-replica`) | Leader's resolved output, tailed by followers. | An internal format, not a documented consumer API. Not tested (no Kafka). | `docs/.../ops/config/log/kafka.md` |
| External sources (Postgres CDC, Kafka Connect) | Inbound only: they feed an XTDB secondary database. | No outbound CDC from XTDB. | `docs/.../ops/external-sources/overview.md` |

Verdict: no supported change stream. A feed with (tx, entity, attribute, valid-time range) must be written by Triplex.

### 3.2 Measured tail cost (`p3.out`, 18,514 transactions in `xt.txs`, 1 client)

| Query | Rows | p50 |
| --- | --- | --- |
| `xt.txs WHERE _id > tip-5000 ... LIMIT 100` | 1 | 13.9 ms |
| `xt.txs WHERE _id > 0 ... LIMIT 100` (far back) | 100 | 23.1 ms |
| `xt.txs WHERE _id > tip` (empty poll) | 0 | 11.9 ms |
| `xt.source_log_msgs` window of 2,001 messages | 2,001 | 46.0 ms |
| `xt.source_log_msgs` 101 messages with `tx_ops` | 101 | 38.6 ms |
| `xt.source_log_msgs` empty poll at the tip | 1 | 2.1 ms |
| `xt.replica_log_msgs` first 200 KB | 1,513 | 12.7 ms |

`xt.txs` polls cost a table scan (12 ms at 18.5k rows, growing with the table). The source-log tail is O(window) from an offset: an empty poll is 2 ms.

### 3.3 Lag and consumer count (open-loop 40 commands/s for 12 s, consumers poll `xt.txs` every 25 ms)

| Consumers | Commits | Commit p50 / p99 from schedule | Feed lag after ack p50 / p99 | Polls/s |
| --- | --- | --- | --- | --- |
| 0 | 481 | 20.3 / 94.8 ms | n/a | 0 |
| 1 | 481 | 18.7 / 691.6 ms | 28.9 / 404 ms | 26 |
| 8 | 482 | 20.2 / 106.0 ms | 35.4 / 119.7 ms | 186 |
| 32 | 481 | 3,081.6 / 6,558.7 ms | 154 / 431 ms | 365 |

32 consumers scanning `xt.txs` saturated the node and stalled commits. One consumer (or a few) is fine. Fan-out must happen in Triplex, not by many readers tailing the engine.

### 3.4 Cheapest design that meets the P3 shape

```
 command transaction (one XTDB tx)
   BEGIN READ WRITE WITH (METADATA = {cmd, subj, pos, attrs, vf, vt})   -- entity, attributes, valid range
     ... facts, ledger rows ...
     INSERT INTO feed (_id = cmd, subj, pos, changes[ {attr, valid_from, valid_to} ])   -- same tx, atomic
   COMMIT SYNC
                    |
                    v   single tailer (one connection)
   source log tail:  SELECT msg_id, msg_type, tx_ops FROM xt.source_log_msgs WHERE msg_id BETWEEN $last AND $big
        (resume = last processed msg_id, read inclusive and skip the duplicate; gap-free by log order)
   plus commit status: xt.txs row (committed) or xt.replica_log_msgs resolved-tx
   plus the content: feed row by _id = cmd (an _id lookup)   or the METADATA map itself
                    |
                    v   Triplex journal (checkpoint = msg_id), fan-out to subscribers
```

- Order and gaps: tx ids are log offsets, strictly increasing, so a checkpoint of the last `msg_id` gives exact resume. Aborted transactions must be filtered with `committed`.
- The `METADATA` map is the lightest carrier: one source (`xt.txs`) holds tx, entity, attributes and range with no second lookup. Its size limit and effect on `xt.txs` scan cost were not measured.
- The 250 ms lag bar looks reachable with one tailer: measured 29 to 35 ms p50 and 120 ms p99 with 1 to 8 pollers at 25 ms intervals (host loaded).

**Risk:** tailing `xt.txs` degrades as the table grows (R7: `_id` ranges are not pruned, so a range query scans). Prefer the source-log tail, or poll `xt.txs` with a narrow recent window and verify at 1M+ transactions (open).

## 4. Q4 (P4): current values separate from history

### 4.1 Storage design (source)

| Fact | Evidence |
| --- | --- |
| L0 compaction splits events into current (L1C, recency infinite, "levelled" to about 100 MB, then L2C split by IID) and historical (L1H, finite recency, tiered, then L2H). | `dev/doc/compaction.allium:50-58`, `core/src/main/clojure/xtdb/trie_catalog.clj:61-98` |
| Historical files are partitioned into weekly buckets by recency (the next Monday after the event was superseded). | `core/src/main/kotlin/xtdb/compactor/OutWriter.kt:28-60`, `BufferPoolSegment.kt:25` |
| A scan includes a page only if `min(valid lower, system lower) < page recency`. With default bases that lower bound is "now", so history that was superseded before the current week's Monday boundary is skipped without I/O. History superseded this week is still considered. | `core/src/main/clojure/xtdb/trie.clj:114-118` |
| Only compaction output has this split. Data still in L0 files or the live index is not partitioned yet. | `compaction.allium:50-58` |

So the answer to "do current reads touch history as it grows" is: they skip history older than the current week, and they still consider this week's history (and everything not yet compacted). Point reads by `_id` descend one IID path, so even then they read a few pages.

### 4.2 Measured at depth 1, 3, 10 (`p4-d1.out`, `p4-d3.out`, `p4-d10.out`)

100,000 subjects, each version rewrites the whole subject document by `COPY`. Each depth was flushed (`finish-block`) and compacted before measuring, then one transaction refreshed the catalog (upstream #6174). The sample was 1,000 random subjects that no writer had touched. All history is seconds old, so it sits in the current-week bucket: this is the worst case for recency skipping.

| Depth | Single-subject pull p50 / p99 (ms) | Pulls/s, 1 client | 3-hop 40-entity pull p50 / p99 (ms) | Pulls/s, 1 client | Query p50 within the pull |
| --- | --- | --- | --- | --- | --- |
| 1 | 3.95 / 13.5 | 210 | 34.6 / 64.6 | 27.0 | 7.2 ms |
| 3 | 3.81 / 10.0 | 238 | 34.5 / 88.6 | 26.0 | 7.2 ms |
| 10 | 5.34 / 17.5 | 164 | 40.3 / 80.8 | 22.9 | 8.1 ms |

- The single-subject pull (22 values) meets the P4 latency bar (p50 5 ms, p99 25 ms) at all three depths, with p50 up 35% at depth 10.
- The bounded pull of 40 entities (about 880 values) takes 4 sequential queries and costs 35 to 40 ms p50. It does not meet the 5 ms bar. The cost is the number of hops and the scatter of hashed ids, not history depth (R7 Q2: 100-id lookup 28 to 48 ms).
- The 1,100 pulls/s/core bar is not met by a ping-pong client (164 to 238 single pulls/s). Batching reaches it (section 5: 1,321 subjects/s on one connection).
- The `EXPLAIN ANALYZE` rows/pages output did not decode usefully (`[object Object]`), so bytes read is not reported.

### 4.3 Implication

- Keep one document per subject for the current index (the pull is one `_id` lookup). The history of that table is read-flat for point lookups.
- Avoid unbounded scans over this table at depth: R7 measured `COUNT(*)` at 4.8 s with 10 versions of 500k ids when everything was recent.
- Flat-with-history is only shown for point reads, in the worst case for recency. Table-wide forms were not re-measured.

## 5. Q5 (P5): release sweep at a pinned basis

### 5.1 Does a long-lived snapshot pin storage or block compaction?

| Fact | Evidence |
| --- | --- |
| A snapshot token is an upper bound on transactions visible to a query. It is not an open transaction. | `docs/.../about/txs-in-xtdb.md` ("Snapshots") |
| Trie garbage collection is signalled at block boundaries and works from `blocksToKeep` and `garbageLifetime` (default 10 blocks, 24 h), with no reference to open snapshots. | `dev/doc/gc.allium`, R7 Q6 |
| An in-flight `Snapshot` object holds references to specific files and live segments. A single query that runs longer than the GC horizon could lose files. A sweep of seconds to minutes is far inside 24 h. | `core/src/main/kotlin/xtdb/indexer/Snapshot.kt`, `gc.allium` |

### 5.2 Measured (`p5.out`; 20,000 subjects; batches of 50 ids via `SETTING SNAPSHOT_TOKEN ... SELECT ... WHERE _id IN (50 params)`; depth-10 data)

| Case | Wall | Subjects/s | Batch p50 / p99 (ms) |
| --- | --- | --- | --- |
| 4 connections, alone | 8.3 s | 2,412 | 76 / 170 |
| 1 connection, alone (5,000 subjects) | 3.8 s | 1,321 | 34 / 82 |
| 4 connections, with live traffic (1 pinned reader plus 40 commands/s) | 18.2 s | 1,100 | 157 / 517 |
| 4 connections, after a block flush and compaction, same token | 10.3 s | 1,948 | 81 / 241 |

- Projected for 100k subjects: about 41 s alone, about 91 s under live traffic, 76 s on one connection. The ≤100 s bar is met on a 2-CPU node for this single-document pull. A bounded graph pull (4 queries each) is far slower (about 25 pulls/s per client).
- **Pinning held.** The checksum (sum of `pos` and `ver`) was identical in the sweep under live traffic, the sweep alone, and the sweep after 800 writes, a flush and compaction.
- **Live impact** (1 pinned reader and the writer, both already near saturation): live pull p50 100 ms to 157 ms (+57%), p99 369 to 514 ms (+39%). Commits completed: 798 baseline, 799 with the sweep; commit service p99 307 ms baseline versus 280 ms with the sweep. The ≤1.5x bar for live p99 is met on pull p99 (1.39x) and missed on pull p50 (1.57x). Writes were never blocked.
- Per core: the container has 2 CPUs; the sweep alone drove 2,412 subjects/s, so about 1,200 per CPU, near the 1,100 bar. I did not capture per-CPU utilisation during the sweep.

**Open:** 100k subjects in full; 64 live readers; bounded graph pulls per subject; sweep on a follower.

## 6. Q6: requirements

### 6.1 Tenant isolation at the storage layer

`ATTACH DATABASE name WITH $$ log: ..., storage: ... $$` run on the primary database adds a secondary database at runtime, each with its own log, object store, leader, indexer and compactor (`docs/.../about/dbs-in-xtdb.md:258-290`). `mode: 'read-only'` exists. Cross-database reads use `db.table` names.

Probe (`tenants-100.out`, 100 databases, Local log and storage):

| Item | Result |
| --- | --- |
| Attach time | 100 databases in 1,050 ms; p50 8.6 ms, max 49.9 ms |
| RSS | 422 MiB before; 439 MiB after attach; 1.05 GiB after one commit and one read in each (about 6.2 MiB per active tenant, includes uncollected heap) |
| Threads | 43 before; 102 after attach; 104 after writes (about 0.6 per tenant) |
| First commit per tenant (includes connect and table creation) | p50 75.8 ms, p99 280.9 ms |
| First read per tenant | p50 31.2 ms, p99 118.9 ms |
| Disk | 2.7 MB for 100 tenants (about 27 KB each) |
| Detach | 102 databases in 628 ms |
| Isolation | Each tenant's unqualified `secret` table returned only its own row, and the primary database could not see it unqualified. Fully qualified cross-database reads succeed for the same user (a connection to `r16_tenant_b` read `r16_tenant_a.secret`; the reverse failed, so sibling visibility appeared to depend on attach order, cause not isolated). Isolation is by storage and namespace; access control needs the authz settings (`docs/.../ops/config/authorization.md`, not tested). |

Fit: tens to a few hundred active tenants per node, not 1,000 small tenants on a 3.5 GiB node (extrapolated 6 GiB). With Kafka, each database needs two topics. A large-tenant-plus-many-small-tenants mix (scenario 15) was not run. `finish-block` flushed 103 databases at once and drove CPU to 196%, so block timing across many tenants needs a staggered config.

### 6.2 Real erasure

| Layer | Result |
| --- | --- |
| Queries | After `ERASE FROM r16_pii WHERE _id = ...`, `FOR ALL SYSTEM_TIME FOR ALL VALID_TIME` returned 0 of 3 versions. The docs: erase "for all valid-time, for all system-time", "even queries as of a previous system-time no longer return" the data (`docs/.../reference/main/sql/txs.md:86-91`). |
| Log | The marker string was still present in the `LOG` and `REPLICA_LOG` files after `ERASE` (2 hits each, before and after). The Local log is never truncated (R7 Q6). On Kafka, `retention.ms` (default 1 day) deletes it eventually (`kafka.md:125`). |
| Storage files | Not measured. The merge treats an erase event as an event applied when pages are rewritten (`core/src/main/kotlin/xtdb/compactor/SegmentMerge.kt:69-91`). R7 found L0 files are kept after compaction. My attempt to grep a 2.7 GB volume on `s2` timed out and I did not run a flush on the shared dev. |
| Known bug | `FOR SYSTEM_TIME FROM a TO b` windows ending before an `ERASE` can return erased rows until compaction (upstream #6358, fixed on main after 2.2.0; R14 H20). |

Verdict: `ERASE` is logical erasure plus eventual removal from compacted files. It does not reach the log or kept L0 files. For PII the safe design is crypto-shredding (values encrypted under a per-subject key held outside XTDB; delete the key), as in R15 section 5, with `ERASE` as a secondary cleanup.

### 6.3 Atomic outbox and work items

Any number of tables commit atomically in one transaction (R1 Q6). My command wrote the entity row, claim, 10 ledger rows and a feed row in one transaction; a failed `ASSERT` (`dup` or `cas`) left no partial rows (a duplicate command left exactly 10 ledger rows). The outbox or work-item row can be another insert in the same transaction, and a consumer reads it by `_id` or from the log tail.

### 6.4 No silent precision loss (`misc-raw.txt`)

| Case | Result | Silent? |
| --- | --- | --- |
| BIGINT max + 1, max * 2 | typed error 08P01 "data exception - overflow error" | No |
| `SUM` of two BIGINT max | returns -2 | **Yes** (R14 H01; sum `DECIMAL(32,0)` instead, which returned 18446744073709551614) |
| Parameter above int8 range | error 22P02 | No |
| 2^53, 2^53+1, 2^53+2 as BIGINT | stored, ordered and range-filtered exactly | No |
| DECIMAL(30,6) literal | exact round trip; `0.1 + 0.2` as DECIMAL gives `0.30` | No |
| `CAST('123456.789' AS DECIMAL(5,2))` | error XX000 "invalid writeObject" | No (untyped, unclear message) |
| DECIMAL compare to a numeric-typed parameter (column with mixed scales) | error 0A000 "Decimal" | No, but unsupported |
| DECIMAL `ORDER BY`, `>=` against a DECIMAL literal | works | n/a |
| `MIN` / `MAX` over DECIMAL | error "No method in multimethod 'set-value-code' ... :decimal" | No, but unsupported |
| `CAST(2^53+1 AS DOUBLE)` | 9007199254740992 | **Yes** (explicit cast) |
| `ABS(min BIGINT)` | returns min BIGINT | **Yes** (R14 H13) |
| Double `0.1 + 0.2` | 0.30000000000000004 | n/a |

Fit: BIGINT meets the "at least 2^53, order-preserving, hard error on unrepresentable" rule for storage, comparison and `+`/`*`. Guards needed: no `SUM`/`ABS` on BIGINT without range guard, no casts to DOUBLE. Money as scaled BIGINT avoids the DECIMAL gaps (R7 notes DECIMAL page metadata is unsupported, `MetadataFlavour.kt:77`; DECIMAL across compaction was not probed here).

## 7. Summary table

| Priority or requirement | Native support | Measured number | Workaround | Risk |
| --- | --- | --- | --- | --- |
| P1 pinned reads | `SNAPSHOT_TOKEN` plus `CLOCK_TIME` per query or in `BEGIN READ ONLY`; no read locks | 0 drift at all levels; writer service 17 ms to 90 to 112 ms with 4+ closed-loop readers on 2 CPUs; 42-connection default cap | Raise `server.numThreads`; `readOnlyPort`; followers (Kafka plus object store); cap reader concurrency per node | High: readers and indexer share CPU; 256-reader bar unproven |
| P2 commits | One tx, `ASSERT` CAS, claims-table idempotency, `METADATA` | p50 16 to 24 ms, p99 33 to 200 ms (10 facts); 172 commits/s at 16 writers; RYOW 200/200; duplicates 100/100 rejected `P0004` | Cheaper CAS shape does not help (20.4 versus 20.7 ms); read the claim before the write path | Medium: latency bar (10/50 ms) missed on a loaded host |
| P3 change feed | None. Log as SQL tables, `xt.txs`, `METADATA` | Tail empty poll 2.1 ms (log) versus 11.9 ms (`xt.txs`); lag p50 29 to 35 ms, p99 120 ms with 1 to 8 pollers; 32 pollers stall commits | `METADATA` plus feed row in the same tx; one tailer on `xt.source_log_msgs`; checkpoint = `msg_id` | Medium: `xt.txs` scans grow; params in `tx_ops` are opaque Arrow; exact-offset rule |
| P4 current separate from history | L1C versus L1H, weekly recency buckets | Single pull p50 4.0 / 3.8 / 5.3 ms at depth 1 / 3 / 10; 40-entity 3-hop pull 35 to 40 ms | One document per subject; batch `_id IN`; avoid table-wide scans | Low for point reads; recency skip only after a week |
| P5 release sweep | Token pins a basis, not files | 2,412 subjects/s alone, 1,100 under load (100k in 41 s and 91 s); live pull p50 +57%, p99 +39%; checksums identical across flush and compaction | Batch 50 ids per query; run on a follower | Medium: graph pulls are 40x slower than document pulls |
| Tenant isolation | `ATTACH DATABASE`, own log and storage | 8.6 ms attach p50; about 6 MiB RSS and 0.6 threads per active tenant; 27 KB disk each | Group small tenants into shared databases with a tenant column; one database for large tenants | High for 1,000 tenants per node |
| Real erasure | `ERASE` across all time | 0 rows after erase; marker stayed in `LOG` and `REPLICA_LOG` | Crypto-shredding; Kafka `retention.ms`; epoch bump to drop a log | High: log and L0 retention |
| Atomic outbox | Multi-table tx | Feed, claim, ledger, entity rows in one commit; failed asserts leave nothing | None needed | Low |
| No silent precision loss | BIGINT overflow errors; DECIMAL exact | Errors on `+`, `*`, out-of-range param; silent: `SUM`, `ABS(min)`, cast to DOUBLE | `SUM` as `DECIMAL(32,0)`; guard casts; money as scaled BIGINT | Medium: DECIMAL `MIN`/`MAX` and param compare gaps |

## 8. Recommended XTDB role per layer

```
 commands --> [SOURCE OF TRUTH]  XTDB primary DB: ledger + claims + feed rows, one tx per command,
                    |                          CAS and idempotency by ASSERT
                    |            (P2: correct, 16-24 ms p50 here; the log is the retained substrate)
                    |
          change feed (one tailer on xt.source_log_msgs / xt.txs, checkpoint = msg_id)
                    |
        +-----------+-----------+------------------------+
        v                       v                        v
 [CURRENT INDEX]         [HISTORY INDEX]          [ANALYTICAL COPY]
 XTDB table, one doc     the same XTDB tables     XTDB follower or read-only port for sweeps
 per subject, _id        with SYSTEM_TIME AS OF   (pinned token, 50-id batches); table-wide
 lookups (4-5 ms)        / snapshot token reads   scans and aggregates are linear (R7), so
 same tx as ledger       (2-13 ms by _id, R7)     heavy analytics belong in another engine
```

1. **Source of truth:** XTDB can hold it. Correctness features are native (atomic multi-table commit, `ASSERT`, `METADATA`). Constraints: no change stream (build the feed), log retention defeats `ERASE` (use crypto-shredding), and p50 sits above the 10 ms bar on this host.
2. **Current index:** XTDB is a good fit for per-subject documents read by `_id`. Write it in the same transaction as the ledger so read-your-own-write needs no wait.
3. **History index:** XTDB native bitemporal reads at a stored token plus `CLOCK_TIME` answer past bases exactly (verified repeatable). Cost is table size, not a separate store.
4. **Analytical copy:** XTDB handles the 100k sweep (document pulls, batched) inside the P5 bar on a 2-CPU node, but for P1 isolation run it on a follower or read-only endpoint, not the writer node. Scan-heavy analytics are linear in rows and are better placed in the other engine.
5. **Do not rely on one node for P1 at 256 readers.** Plan Kafka plus object store for followers, or accept the P1 miss on a single node.

## 9. Open questions (not measured)

1. P1 at 256 and 1,024 readers; with `server.numThreads` raised; with a follower; on a dedicated machine. Confirm why early and later 4-reader runs differ.
2. P2 on a quiet host and with the exact fixed writer trace (steady 1.5 commands/s plus 75 commands/s bursts).
3. `xt.txs` and source-log tail cost at 1M+ transactions; `METADATA` size limits; Kafka replica-topic consumption.
4. Physical presence of erased values in L0, L1 and L2 files after flush and compaction (needs a dedicated engine and a bounded file search).
5. Per-subject bounded pulls of 50 to 2,000 facts at the 5 ms bar (needs a graph that fits one query, or maintained per-subject subgraph documents).
6. 1,000 small tenants plus one large tenant under live load; tenant authorization settings.
7. DECIMAL across compaction (R1 open question 10), and DECIMAL parameter comparison failure cause.

## 10. Files

| Path | Content |
| --- | --- |
| `/Users/sam/Claude/Projects/triplex-db-2/R16-xtdb-northstar/` | all scripts and raw outputs |
| `.../p1.out`, `p1b.out` | P1 levels (first and clean runs) |
| `.../p2.out`, `breakdown.mjs` | P2 |
| `.../p3.out` | P3 |
| `.../p4-d1.out`, `p4-d3.out`, `p4-d10.out` | P4 |
| `.../p5.out` | P5 |
| `.../tenants-100.out` | tenant cost |
| `.../misc-raw.txt` | numerics, DECIMAL, erase, breakdown, unsaved early run, host conditions |

Engine state: slot `s2` released. The retained volume `tx2-xtdb-s2-data` (2.76 GiB, holder R16-xtdb-northstar) stays until the next `up --fresh` or `down --remove-volume`. Shared dev (port 5470) received one table, `r16_pii`, with one erased row.

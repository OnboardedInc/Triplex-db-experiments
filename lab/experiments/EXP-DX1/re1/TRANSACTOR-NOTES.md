# DX-RE1: how Datomic 1.0.7745 processes one transaction

Hard problem H6. These notes follow one `d/transact-async` from the write gateway to Postgres and back, with the class and
method that does each step, the thread it runs on, what it waits on, and the setting that controls it. Our own words; no
decompiled code is quoted. The licence finding is in [REPORT.md](REPORT.md); the changes it suggests are in
[WRITE-BETTER.md](WRITE-BETTER.md).

## How to read the evidence tags

| Tag | Meaning | Source |
| --- | --- | --- |
| **S** | Read in the code | `datomic-transactor-pro-1.0.7745.jar` (SHA-256 `a9ea741d…`, the same bytes as in image `tx2-datomic:1.0.7745-da00`), decompiled with Vineflower 1.11.1. The writer loop was cross-checked with CFR 0.152. Absences (no `setAutoCommit`, no `commit`) were checked in the bytecode with `javap -c`. |
| **O** | Observed in a recorded run | DX-T1 run `tx2-dxt1-cost-a-2-full` (2026-11-13 00:49–00:55 UTC, image `aecbac4c…`, 10,000 subjects, zero readers, lean layout, trace level `full`). It holds the transactor's own per-transaction log (`:tx/process`, logger `datomic.transaction`), its storage log (`datomic.kv-cluster`), the peer log (`:peer/transact`), the Postgres statement log and the transactor's Flight Recorder file (parks ≥5 ms with stacks; socket and file I/O ≥1 ms). The steady window is 00:53:00–00:55:00: 3,435 transactions at about 29 per second, 45 datoms at p50. |
| **I** | Inferred | Reasoning from S and O; not read and not seen. |

Confidence is high unless a step says otherwise. Compiled Clojure decompiles into long but faithful Java. The uncertain
parts are named where they come up.

`full` tracing adds about 3 ms per commit (DX-T1 ablation), so every O time here is an upper bound for the untraced stack.
The counts (statements, batches, lookups) do not depend on tracing.

## The picture

```
 WRITE GATEWAY JVM (peer)                 TRANSACTOR JVM (one pipeline per database)                    POSTGRES
 ───────────────────────────              ─────────────────────────────────────────────                    ────────
 Jetty thread
  1 storage/commit!  builds [[:triplex/commit {...}]]
  2 Connection.transactAsync
      └► unsent-updates-queue (128)
  3 connector thread: Fressian + send ──TLS──► 4 Artemis address <db>.tx-submit
                                                (256 KiB, then senders BLOCK)
                                              5 reader-<db>: decode, stamp read-at
                                                 └► unprocessed-updates-queue (capacity 5)
                                              6 processor-<db>: one transaction at a time
                                              7    db/with-tx: tx function, tempids, checks,
                                                   memory-index insert          ◄── segment reads (cache or SELECT)
                                              8    ├► fressianer-<db>: serialise for the log
                                                   │      └► writer-queue
                                                   └► notify-fressianer-<db>: serialise the notification
                                                          └► block-notify-queue
                                             11 writer-<db>: take + drain what is queued (≤512 KiB)
                                             12    LogImpl.append ─► send-off thread: update-pod
                                                                       INSERT tail chunk ──────────────► commit, WAL flush
                                                                       UPDATE pod where rev=? ─────────► commit, WAL flush
                                             13    deliver :logged
                                             14 block-notifier-<db>: wait :logged, then send
 15 notifier thread: notify_data ◄──TLS──────── Artemis address <db>.tx-result (every peer of this database)
     accept-new-data, deliver the future
 16 Jetty thread: deref returns, HTTP response
```

Off this path but sharing its threads or storage: the log-treeifier (cuts the log tail into segments and makes the writer
reset the tail), indexing (builds index segments in the background and is adopted on the processor thread), heartbeat, GC
and logging. See [Background work](#background-work-that-can-delay-a-commit).

## The path of one transaction

1. **The gateway builds one Datomic transaction per Triplex commit (peer, outside the serial point).**
   `triplex.gateway.storage/commit!` checks the operation id, `tx-data` prepares every row and fact map, and the result
   is one call, `[[:triplex/commit {:scope … :ops [...] …}]]`. `submit!` passes it to `triplex.gateway.commit-order/enqueue!`,
   which calls `d/transact-async` in client sequence while holding the client lane's monitor, then the request thread
   waits on the future for up to 5 s. (S, from the gateway source.)

2. **`datomic.peer.Connection.transactAsync(List, Object)` only queues it.**
   `datomic.transaction/create-procargs` gives the transaction a UUID, a settable future is registered in `pending-txes`,
   and the procargs are offered to `unsent-updates-queue`, an `ArrayBlockingQueue` of 128. A full queue fails the call at once
   ("peer queue exceeded"). The peer does **no** validation, tempid resolution, schema check or expansion: the transaction
   function call and its payload travel as data. Waits on: nothing. (S.)

3. **One connector thread per connection serialises and sends.**
   The send loop in `datomic.connector.TransactorHornetConnector` takes each procargs, `datomic.artemis-client/create-fressian-message`
   writes it as a non-durable Artemis message, and `ClientProducer.send` sends it to `<db-id>.tx-submit`. The Netty connector
   from `datomic.connector/create-hornet-factory` has `sslEnabled` set from the transactor's published `encrypt-channel`.
   The producer window is 256 KiB. Waits on: Artemis flow control only. That a non-durable send does not wait for a server
   reply is the Artemis client default, not read in Datomic code (I, medium). Setting: `encrypt-channel` (default true; O:
   `:encrypt-channel true` in our transactor's start record). (S.)

4. **The transactor's embedded Artemis server holds the message.**
   `datomic.update/create-master` starts the server (`datomic.artemis-server/start-server`, persistence off, journal sync off)
   and sets the `*.tx-submit` addresses to at most 256 KiB with `AddressFullMessagePolicy.BLOCK`: when that much is waiting,
   peers' sends block. (S.)

5. **`reader-<db>` decodes and queues.**
   `datomic.update/reader`: an Artemis consumer with window size 0 on a temporary queue at the submit address;
   `datomic.transaction/read-message` decodes the Fressian and stamps `read-at`. A `:sync` request is answered from here; a
   transaction goes into `unprocessed-updates-queue`, an `ArrayBlockingQueue` of **5**. When five are waiting the reader stops
   taking, and the 256 KiB address limit then pushes back to the peers. A transaction with `:hints` is also copied to the
   prefetch queue (capacity 5). The Artemis message is acknowledged after the put. (S; O for the thread name.)

6. **`processor-<db>` applies transactions one at a time; there is no grouping at apply.**
   `datomic.update/processor` loops: if `Indexer.memidx_limit_exceeded?` (memory index over `memory-index-max`) it raises the
   `:BackPressure` alarm and serves only the priority queue (index adoption) until the index catches up; otherwise it takes
   from `priority-updates-queue` first, then from `unprocessed-updates-queue` (1 s poll). A transaction goes to
   `datomic.update/process-transaction`, an index request to `process-request-index`, and a finished index to
   `process-new-index`. Each database has its own processor and its own seven other threads, named `reader-`, `processor-`,
   `fressianer-`, `notify-fressianer-`, `writer-`, `block-notifier-`, `log-treeifier-` and `segment-prefetch-processor-`
   followed by the database id. (S; O: these names appear in the JFR and the logs, including a second set for the
   `tx2-health` database.)

7. **The apply is `datomic.db/with-tx`, the same function a peer runs for `d/with`.**
   `process-transaction` calls `datomic.update/swap-xf!` on the database atom with `with-tx*` → `datomic.db/with-tx(db,
   dispatcher, tx-data)`:
   1. `ProcessExpander.inject` walks the operations. `:db/add` and `:db/retract` become datoms. Anything else is a
      transaction function: `Db.getFn` returns the function compiled when it was installed (cached as a schema element, not
      recompiled per call), it is applied to the transactor's current db value and the operations it returns are injected
      in turn. Its time goes to the `:tx-fn-ms` counter.
   2. `ProcessExpander.getData` → `datomic.db/get-ids` resolves tempids, including upserts through `:db.unique/identity`
      attributes (one AVET lookup each; `:res-ct`, `:res-tx-ms`), adds composites and the transaction's instant.
   3. `datomic.db/add-ensured-data` → `Db.addData` visits every datom. On an entity that existed **before** this transaction
      it calls `find-aevt` to drop a redundant assertion and, for cardinality-one attributes, to find the old value to
      retract (`:dedup-ct`, `:dedup-tx-ms`). On a `:db/unique` attribute it calls `find-avet` (`:ucheck-ct`, `:ucheck-tx-ms`).
      Then it inserts into the in-memory EAVT and AEVT, into AVET for indexed or unique attributes, and into RAET for references.
      Datoms on entities created in this transaction skip the redundancy lookup.
   4. `add-fulltext`, then the result `{:db-before :db-after :tx-data :tempids :tx-stats}`.

   Waits on: index segments. Each lookup reads segments from the object cache, or from storage on a miss, on this one
   thread. Probe prefetch (`datomic.prefetchProbes`, default true) forwards the segments it is about to need to the
   `segment-prefetch-processor-<db>` and `prefetch-worker` threads so some loads run ahead. (S. O: steady-window apply p50
   1.15 ms, p90 5.2, p99 14.7.)

8. **After the apply the processor hands off and takes the next transaction.**
   The result goes to `processed-updates-queue` (to be logged) and to `fressian-for-notify-queue` (to be announced), both
   unbounded `LinkedBlockingQueue`s, with a `:logged` promise that ties the two. If `datomic.db/data-needs-index?` (memory
   index over `memory-index-threshold`) an index request is put on the priority queue. So the apply of transaction N+1
   overlaps the log write of N. A failed transaction (for example our `TRIPLEX_CONFLICT`) skips the log and is announced
   with `:logged` already true. (S.)

9. **`fressianer-<db>` serialises the transaction for the log.**
   `Indexer.notify_txdata` updates the memory-index accounting and `datomic.log/fressianed-tx` writes the transaction's
   datoms as Fressian bytes, which go to `writer-queue` as `{:type :fressianed-tx}`. (S.)

10. **`notify-fressianer-<db>` serialises the notification in parallel.**
    `datomic.update/fressian-tx-notification` writes `{:id :data :t :tempids :io-stats}` (the datoms again) and queues it for
    the block-notifier. (S.)

11. **`writer-<db>` writes whatever is queued, without waiting: this is Datomic's whole group commit.**
    `datomic.update/writer` takes one item, then `drain-block` adds every further `:fressianed-tx` already in `writer-queue`
    while the batch is under `datomic.log/max-block-threshold` (512 KiB). If the batch is over `datomic.log/segment-threshold`
    (54,000 bytes) it is written at once. Otherwise the writer polls the queue again without waiting and keeps adding
    until the queue is empty, then writes. There is no timer and no wait for company. Other items on the same queue, `:adopt-tree` and `:ensure-tree` from the log-treeifier, are run
    by the `writer-process` multimethod on this same thread between batches. Neither threshold is a property. (S, CFR
    agrees. O: across the run 4,495 of about 4,569 log writes held one transaction, 64 held two and 10 held three, counting
    same-millisecond completions as one batch.)

12. **`LogImpl.append` makes two sequential autocommit statements.**
    `log-block` runs `(swap! log-ref datomic.log/append …)`. `LogImpl.append` → `datomic.log/write-tail-descriptor` →
    `datomic.cluster/update-pod` on the key `pod-log-tail/<db-id>` → `KVCluster.update_pod_STAR_`. That function runs in a
    `clojure.core/future-call` on a `clojure-agent-send-off-pool` thread, and the writer blocks on it. Inside it:
    1. `KVStore.put` of a new **tail chunk**: id a random UUID, value the Fressian bytes of this batch only, map
       `{:prev <previous chunk id>}`. `KVSql.put` → `datomic.sql/insert` → `insert into datomic_kvs (id, map, val) values (?,?,?)`.
    2. `KVStore.put` of the **pod row**: `{:rev n :tail <chunk id>}` with `:ensure {:rev n-1}`. `KVSql.put` → `datomic.sql/update`
       → `update datomic_kvs set rev=?, map=? where id=? and rev=?`. Zero rows updated means a conflict; the code then reads
       the pod to check whether an earlier try already succeeded.

    Each statement borrows a connection from a tomcat-jdbc `DataSource`, runs one `executeUpdate` and returns it. No Datomic
    class calls `setAutoCommit` or `commit` (checked in the bytecode), and the pool is not told otherwise, so the driver's
    default autocommit applies: **each statement is its own Postgres transaction, so one log write is two commits and, with
    `synchronous_commit=on`, two WAL flushes, one after the other.** Failed writes retry with `:linear` backoff (50 ms × n,
    up to 20 tries). Log writes skip the write-concurrency semaphore, which only index-segment writes take. (S. O: the
    Postgres log shows exactly this insert-then-conditional-update pair; in the steady window the pod update took p50 1.07 ms,
    p90 2.22, p99 5.38, and the gap between the insert and the update on one connection was p50 0.46 ms, p99 3.5. The JFR shows
    `writer-<db>` parked 755 times for 5 ms or more in this exact chain, `log_block` → `LogImpl.append` →
    `write_tail_descriptor` → future `deref`, and 4,096 Postgres socket reads of 1 ms or more on send-off threads, median 1.8 ms.)

13. **Then the writer completes the batch.**
    `datomic.transaction/transactions-completed!` records the `TransactionNsec` and `TransactionApplyNsec` metrics and logs one
    `:tx/process` line per transaction at INFO, on the writer thread. `:new-tail` goes to the log-treeifier and only then
    `:logged` is delivered for each transaction in the batch. Any INFO logging here sits between the durable write and the
    acknowledgement. (S. O: the `:tx/process` lines come from `writer-<db>`.)

14. **`block-notifier-<db>` sends the acknowledgement strictly after the durable write.**
    It takes notifications in transaction order, builds a non-durable Artemis message in advance, waits on that transaction's
    `:logged` (60 s; after that the transactor fails itself with "Timed out waiting for log write"), then sends to
    `<db-id>.tx-result`. Artemis copies it to every peer connected to this database, both gateways in our stack. (S. O: 788
    parks of 5 ms or more on that promise.)

15. **The peer applies the novelty, then completes the future.**
    The notification is handled on one long-lived thread per connection, seen as a `clojure-agent-send-off-pool` thread
    (O; the loop body is inferred, I medium). `Connection.notify_data` removes the pending future by id, runs
    `swap! db-ref datomic.peer/accept-new-data` → `datomic.db/accept-data-no-check` (memory-index insert without checks, metric
    `PeerAcceptNewMsec`), offers the datoms to the fulltext queue, logs `:peer/transact :end` at INFO, then delivers
    `{:db-before :db-after :tx-data :tempids}`, plus `:io-stats` when the call passed `:io-context`. (S.)

16. **The gateway's deref returns** and `storage/commit!` builds the response from `:db-after` and `:tx-data`.

### Where the time goes (O, steady window, `full` tracing, ms)

The peer's `:peer/transact` start and end records carry the same UUID as the transactor's `:tx/process`, so the legs can be
joined. All three logs share the VM clock; each leg has about ±1 ms of millisecond rounding. Script: `tx-log-stats.py`.

| Leg | p50 | p90 | p99 |
| --- | ---: | ---: | ---: |
| Peer `transactAsync` → future delivered (steps 2–15) | 9.0 | 22 | 47 |
| Send leg: peer start → transactor `read-at` (steps 2–5) | 1.9 | 5.7 | 17.5 |
| Inside the transactor: `read-at` → log written (steps 5–12) | 4.1 | 11.2 | 30.6 |
| … of which the apply (step 7) | 1.15 | 5.2 | 14.7 |
| … of which the transaction function | 0.49 | 3.0 | 9.3 |
| … of which the pod update (step 12) | 1.07 | 2.2 | 5.4 |
| Ack leg: log written → peer future delivered (steps 13–15) | 2.0 | 6 | 15 |

## The durable write, in numbers

**Minimum per log write (S):** two statements, `INSERT` of the tail chunk then `UPDATE … where rev=?` of the pod row, each
autocommitted, so two commits and up to two WAL flushes in series. They are shared by every transaction in the same writer
batch, but at our load batches hold one transaction (O).

**Amortised per transaction (S + O):** the tail chunk holds about 12 KB per transaction (O: median `:bufsize` 12,049 bytes).
Every time the tail passes 54,000 bytes the log-treeifier writes log-tree segments and asks the writer to reset the tail.
In the steady window without index jobs (00:53:30–00:55:00, 3,372 transactions):

| Storage write per transaction | Count | Thread | On the commit's own path? |
| --- | ---: | --- | --- |
| Tail append: `INSERT` + `UPDATE` | 0.97 × 2 | writer (send-off) | yes |
| Tail reset (`adopt-root`): read pod, `INSERT`, `UPDATE` | 0.24 × 2 writes | writer (send-off) | yes, for the next transaction in the queue |
| Log-tree segment `INSERT` (median 4.8 KB) | 0.71 | log-treeifier (send-off) | no, but same Postgres and same WAL |
| Index segment `INSERT` | 0.005 here; bursts during index jobs | `storage` pool | no |

That is about **3.1 Postgres commits per Datomic transaction** (O: the Postgres log counts 1.95 inserts and 1.21 updates per
transaction over 00:53–00:55), of which a transaction waits for about 2.5 on average. Postgres group commit may merge flushes
from concurrent backends, so WAL flushes are at most that number (I). Segment reads by the transactor and the peers add 2.4 `SELECT`s per
transaction across all backends, and the pool's `select 1` check runs at most every 5 s per connection.

**Acknowledgement:** only after both statements of the batch that holds the transaction have returned (steps 12–14).

## Background work that can delay a commit

| Work | Where it runs | How it reaches the commit path | Evidence |
| --- | --- | --- | --- |
| **Log tail reset** (`datomic.update/extend-tree`, `datomic.log/adopt-root`) | `log-treeifier-<db>` writes segments; `:adopt-tree` runs on **`writer-<db>`** | A reset (read + 2 writes) runs between two batches, so a commit queued behind it waits. Frequency is bytes per transaction ÷ 54,000. | S; O: 801 resets per 3,372 transactions; treeify p50 5 ms, max 46 ms |
| **Index job** (`process-request-index`) | The processor takes `index-sem` and freezes the memory index (`datomic.db/prepare-for-indexing`); the job runs in a `future-call` and writes segments on the `storage` pool (`write-concurrency` threads, semaphore of `write-concurrency` + 2) | Competes for Postgres, its WAL and the transactor's two CPUs | S; O: 1,608 Postgres reads ≥1 ms on `storage` threads, median 3.1 ms |
| **Index adoption** (`process-new-index` → `datomic.db/complete-indexing`, including `recalc-elements`) | **`processor-<db>`**, served before queued transactions | Transactions wait during the adoption, then run against new index segments that are not yet cached | S; O: in the 2 s after each of 9 adoptions, 26% of transactions read Postgres during apply and apply p50 was 7.6 ms; 20 s and more later, 11% and 1.2 ms |
| **Memory-index back-pressure** | processor | Over `memory-index-max` the processor stops taking transactions until an index is adopted | S; not seen in this run |
| **Cold segments at the serial point** | processor (`datomic.cache` lookup → `DeserializingRepairingLookup`) | One thread waits for a SQL read and then deserialises | O: 13% of steady transactions read Postgres during apply; 797 loads cost 425 ms of SQL, 1,474 ms of deserialising and 558 ms waiting on in-flight loads, about 0.7 ms per transaction on average. The parks ≥5 ms are mostly in `Db.addData` → `find-aevt` → `seekAEVT` (5–29 ms each), some inside the transaction function (`seekEAVT`) |
| **Heartbeat** (`datomic.lifecycle/pump` → `set-ref`) | its own thread, every `heartbeat-interval-msec` (5 s) | One more storage write every 5 s | S |
| **Garbage** (`mark-pod-garbage`, `datomic.garbage`) | futures after tail resets | Marks old tail chunks as garbage; no `DELETE` appears in the six-minute Postgres log | S for the marking, O for the absence |
| **JVM GC** (G1; the stack replaces the launcher's `-XX:MaxGCPauseMillis=50` with only `-Xms256m -Xmx3g`) | all threads | Stops the whole pipeline | O: 197 pauses in 356 s, p50 11.7 ms, p90 23.5, max 70 |
| **Logging** (`bin/logback.xml`: root INFO, `prudent` rolling file; the stack loads it from the `bin` classpath entry when tracing is off) | writer (`:tx/process`), send-off thread inside the pod update (`:kv-cluster/update-pod` begin and end), peer Jetty and notifier threads (`:peer/transact` start and end) | Five synchronous log appends sit on every commit's path, before the acknowledgement | S for the levels and placement; O in the `full` run: 549 log-file writes ≥1 ms on send-off threads (max 34 ms) and 73 on the writer (max 13.5 ms). The cost under the default prudent appender was not measured. |
| **CPU sharing** | Our placement: transactor on VM CPUs 0–1, Postgres on 0, write gateway on 1 | Each commit crosses about ten thread hand-offs: peer connector, Netty, reader, processor, fressianer, writer, send-off thread, writer again, block-notifier, Netty, peer notifier | S for the threads; I for the cost; H2 |

## Every setting that changes the path

Values marked *ours* are the h4/h3 benchmark stack (`lab/experiments/EXP-DX1/h4/run.sh`), observed in the transactor's start
record. The `up.sh` defaults differ where noted.

| Setting | Default | Ours | What it changes (step) |
| --- | --- | --- | --- |
| `encrypt-channel` (transactor property) | true | true | TLS on every peer ↔ transactor message (3, 14) |
| `memory-index-threshold` / `datomic.memoryIndexThreshold` | 32m in the template | 256m (`up.sh` default 128m) | When an index job is requested; how often adoptions make caches cold (6, 8) |
| `memory-index-max` | 512m in the template | 1g (`up.sh` 512m) | When the processor stops taking transactions (6) |
| `object-cache-max` / `datomic.objectCacheMax` | 128m in the template | 1g (`up.sh` 128m) | How many index segments the apply finds in memory (7) |
| `write-concurrency` / `datomic.writeConcurrency` | 4 | 4 | Index-segment writer threads and their semaphore (`n` + 2); log writes skip it |
| `read-concurrency` / `datomic.readConcurrency` | 2 × write | 8 | Segment-read semaphore |
| `index-parallelism` / `datomic.indexParallelism` | 1 | 1 | Index job threads |
| `heartbeat-interval-msec` / `datomic.heartbeatIntervalMsec` | 5000 | 5000 | Heartbeat writes; also the pool's validation interval |
| `sql-driver-params` | none | none | Passed to `DataSourceProxy.setConnectionProperties` (any PgJDBC property) |
| `sql-validation-query` | `select 1` | same | The `testOnBorrow` query |
| `sql-initial-size` (a key read by `kv_sql_ext`; not in the template, and that the property reaches it is inferred) | 2 | 2 | Pool initial size; `maxActive` stays at the tomcat-jdbc default of 100 |
| `datomic.prefetchProbes` / `prefetchConcurrency` / `readAheadPool` | true / 1 / 4 | same | Segment prefetch beside the apply (7) |
| `datomic.txTimeoutMsec` | 10000 | 10000 | Only the blocking `d/transact`; the gateway uses `transact-async` with a 5 s deref |
| `datomic.peerConnectionTTLMsec` | 10000 | 10000 | Artemis connection TTL; failure check every TTL/2 |
| `datomic.logDirSizeLimit`, `logCoalesceThreshold`, `podGcDelayMsec`, `deleteConcurrency` | 50000, 1000, 60000, 1 | same | Log tree shape and garbage |
| Peer `:hints` option (gateway `TX2_COMMIT_HINTS`) | off | off | Reader copies the transaction to the prefetch queue; dispatcher becomes the segment-prefetch one (5, 7) |
| Peer `:io-context` option | none | none | The transactor returns per-transaction `:io-stats` to the caller (15) |
| Logger `datomic.transaction`, `datomic.kv-cluster`, `datomic.peer` | INFO (root) | INFO | Synchronous log lines on the commit path (12, 13, 15) |
| JVM `JAVA_OPTS` for `bin/transactor` | `-XX:+UseG1GC -XX:MaxGCPauseMillis=50` | replaced by `-Xms256m -Xmx3g` (G1 with its 200 ms default target) | GC pauses |
| **Not settable** (vars and literals) | `segment-threshold` 54,000 B; `max-block-threshold` 512 KiB; `dir-threshold` 1,000; reader queue 5; prefetch queue 5; tx-submit 256 KiB + BLOCK; producer window 256 KiB; peer unsent queue 128; log-write wait 60 s (fatal); log-write retries 20 × 50 ms·n; transactor semaphore wait 300 s | | |

## What makes a transaction cheap or expensive for the transactor

Read in `with-tx`, `ProcessExpander` and `Db.addData` (S), with the steady-window counters (O, means per commit).

1. **Fixed per Datomic transaction, whatever its size:** the send leg and TLS, the reader's decode, one apply dispatch, the
   transaction entity and its instant, one log write (two commits) unless batched, two serialisations (log and
   notification), the notification to every peer, and each peer's accept. This is most of the 9 ms at p50.
2. **Per datom:** memory-index inserts (EAVT and AEVT; AVET when indexed or unique; RAET for references), Fressian bytes
   twice, and log bytes, which set how often the tail is reset and how fast the memory index fills.
3. **Per datom on an entity that existed before the transaction:** one AEVT lookup. Cardinality-one also finds the old value
   and adds a retraction datom. A redundant re-assertion is looked up and dropped. Ours: 5.0 lookups, 1.0 redundant datom,
   0.31 ms mean, 4.7 ms p99. These lookups are where the transactor waits for storage after an index adoption (O).
4. **Per assertion of a unique attribute:** one AVET lookup. Ours: 5.0, 0.02 ms mean.
5. **Per tempid that upserts:** one AVET lookup. Ours: 4.0, 0.06 ms mean.
6. **A transaction function:** whatever it reads, at the serial point, on one thread. Ours is the largest serial cost: mean
   1.14 ms, p50 0.49, p99 9.3 ms. The apply's index reads per commit average 203 AVET node visits, 158 directory visits,
   20 EAVT and 10 AEVT, so the AVET reads (index ranges over row texts, many of them on the history index) dominate (O for
   the counts, I for the attribution).
7. **Free or cheap:** datoms on entities created in the same transaction (no redundancy lookup), and the function compile
   (done once at install).

## The gateway's commit, mapped onto that work (lean layout)

What `triplex.gateway.commit/code` (the `:triplex/commit` transaction function) reads at the serial point, per commit, from
the gateway source:

| Read | Index | How many | Why |
| --- | --- | --- | --- |
| scope `head-version`, latest commit `position` and `max-recorded-at`, `strict-record-clocks` | EAVT on the scope and on the latest transaction entity | ~5 | head position and clock rule |
| `row-id` for each `live` id: `index-range` on `:triplex.entity/row` by prefix, then `seek-datoms` for a retirement marker | AVET + EAVT | 2 per live id | each row still live |
| for each `entities` id with `source`: `entid [:triplex.entity/id]` then `:triplex.entity/rev` | AVET + **EAVT** | 2 per subject | optimistic check |
| `identity-row` for every `:triplex/assert`: `index-range` on **`(d/history db)`** over `:triplex.entity/row` by prefix | **history** AVET | 1 per new row | a row id is never reused, even after retirement |
| for every `:triplex/retract`: `entid`, then `seek-datoms` | AVET + EAVT | 2 per retirement | find the exact live row text |
| `entid` of each journal entity | AVET | 1 per journal | feed append-only proof |

Then Datomic's own checks run on what the function returns: the `{:triplex.entity/id …}` map of each subject upserts (AVET)
and, for an existing subject, is a redundant re-assertion (AEVT lookup, dropped); `:triplex.entity/rev` is cardinality-one,
so every touched existing subject costs an **AEVT** lookup and a retraction datom; `:triplex.tx/position`,
`:triplex.tx/operation-id` and `:triplex.claim/command-id` are unique (AVET each); `:triplex.entity/row` and
`:triplex.tx/max-recorded-at` are indexed (AVET inserts). The rev the function reads through EAVT and the rev Datomic
retracts through AEVT are the same fact in two different index segments.

## Static reading against the running process

The check used the recorded `full` run of the same image (O), not a fresh live sample; see [REPORT.md](REPORT.md).

| Static claim | Seen in the recording? |
| --- | --- |
| One pipeline of named threads per database | Yes: `processor-`, `writer-`, `fressianer-`, `notify-fressianer-`, `block-notifier-`, `log-treeifier-`, `reader-` for the scope database and for `tx2-health` |
| The writer blocks on the pod update, which runs on a send-off thread | Yes: writer parks in `LogImpl.append` → `write_tail_descriptor` → `ClojureFutureWithChannel.deref`; Postgres socket reads on send-off threads |
| Two statements per log write: insert, then update with a revision check | Yes: the Postgres log pairs `insert into datomic_kvs (id, map, val)` with `update datomic_kvs set rev=$1, map=$2 where id=$3 and rev=$4` |
| Acknowledgement only after the write | Yes: block-notifier parks on the `:logged` promise |
| No waiting group commit | Yes: 98% of log writes hold one transaction |
| Serial-point storage reads come from the apply | Yes: processor parks in `Db.addData` → `find-aevt` and in the transaction function (`seekEAVT`) |
| Index adoption runs on the processor | Yes: one processor park in `process-new-index` → `complete-indexing` → `recalc-elements` |
| **Not predicted by the reading** | The log tail is reset about every four transactions, because our transactions are about 12 KB of log each. Insert and update counts are therefore not 1:1. |

## What this reading could not determine

1. The cost of TLS, Artemis delivery and the thread hand-offs inside the 1.9 ms send leg and the 2.0 ms ack leg. The recording
   has no execution samples, and the JFR thresholds (5 ms parks, 1 ms I/O) hide short waits.
2. How long an index adoption holds the processor (no log event marks its end), and what share of the post-adoption slowdown
   is adoption time versus cold segments.
3. The cost of the default INFO logging (prudent appender inside the container) in an untraced stack.
4. Which attributes make up the 12 KB of log per transaction.
5. How a non-durable Artemis send blocks under flow control; Datomic code leaves it to the Artemis client defaults.
6. Postgres-side time per commit (WAL flush versus execution); the statement log excludes the commit at `Sync`.

## Method and provenance

1. Licence: `LICENSE` in the distribution is the Apache License 2.0; see [REPORT.md](REPORT.md).
2. The jars and licence files were copied out of image `tx2-datomic:1.0.7745-da00` (id `aecbac4c…`, the image DX-T1 measured)
   and match the verified build input `datomic-pro-1.0.7745.zip` (SHA-256 `60ac6bc5…`, `lab/config/datomic/SHA256SUMS`). The
   gateway's peer runs from the same transactor jar: `bin/run` puts `*transactor*.jar` and `lib/*` on the classpath.
   `peer-1.0.7745.jar` is a separately compiled build of the peer namespaces (same functions, different generated class
   numbers, plus `datomic.core2`) and is not loaded by our stack.
3. REA CLI 6.9.0 (`inspect-artifact`, `compare-artifacts`) inventoried both jars. Vineflower 1.11.1 decompiled 3,824
   classes in 38 s, single-threaded at `nice 19`. A local script rewrote Clojure constant references into names for reading.
   CFR 0.152 cross-checked the writer loop, and `javap -c` checked absences.
4. Decompiled output and working files stay under `$HOME/Claude/Projects/triplex-db-2/evidence/DX-RE1/` and are not in this
   repository.
5. `tx-log-stats.py` (this directory) reproduces every O number from a `full` run directory:
   `python3 -I tx-log-stats.py RUN_DIR [FROM TO]`.

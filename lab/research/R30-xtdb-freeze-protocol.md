# R30: a provable freeze state for an XTDB 2.2.0 slot (unblocks EXP-K01's seed-once clones)

**Written:** 2026-11-08 by planner R30 (Opus). **Moves:** measurement speed for P1 to P5. A K01 clone replaces a 38-minute 10k seed
with a few minutes of settle, copy and start (R26). K01's first live run refused to make a golden, which was the right call, because
two R26 assumptions failed on the pinned image. This report explains both failures from source and gives a freeze protocol whose
clean state the engine itself proves.

## How to read this report

- **Evidence labels.**
  - `[S]` pinned XTDB source, `references/xtdb` (v2.2.0, `c6c1962`), cited `path:line`. Lab files are cited from the repo root.
  - `[K]` K01 evidence at commit `ad11a68`, `lab/experiments/EXP-K01-seed-clone/evidence/<file>`.
  - `[W]` web primary document, fetched 2026-11-08, unauthenticated, no personal details sent.
  - `[P]` an earlier lab report or receipt.
  - `[E]` my inference or arithmetic, inputs shown.
- **What I did not do.** I started no container, ran no engine, ran nothing in the VM and edited nothing in the repository. Every
  prediction in section 6 is untested and is written as a check with an expected result.
- **No subagents** (the brief forbids them), so no independent style review ran.

## 0. Answer

**Q1. The missing `Node stopped.` is a logging race, not an unclean stop.**
- Log4j2's own JVM shutdown hook is on by default. It stops the logger context in parallel with XTDB's hook. XTDB logs
  `Stopping node...` first, then closes the node, then logs `Node stopped.`. By then Log4j has stopped, so the line goes nowhere.
- The proof in K01's own log: node close also logs `Server stopped.`, `Healthz server stopped.` and `Flight SQL server stopped`.
  None of the three appears either (`[K] restart-engine.log`).
- The exit code proves the hook did not force an exit. XTDB's hook calls `halt(1)` after 10 s, which exits 1. A JVM that finishes its
  shutdown after SIGTERM exits 128 + 15 = 143. Both observed stops exited 143 in 1.5 s and 5.8 s.
- **Fix:** add `-Dlog4j2.shutdownHookEnabled=false` to the s1 to s3 `javaOpts`. Then `Node stopped.` is written, and K01's rule can
  stay as it is.

**Q2. The 61,709 rows live in the live index's cached shared snapshot, not in the live index.**
- `finish-block` cut the block and `nextBlock()` cleared the live tables. It did not refresh `LiveIndex.sharedSnap`.
- A query reuses the cached snapshot whenever its basis is no older than the query's minimum. No transaction followed, so the basis
  never moved, and every connection and every SQL text got the same pre-block snapshot. That snapshot holds its own slices of the old
  rows. `xt.live_tables` reads that snapshot.
- This is upstream #6174, which R14 (H10) already recorded. It is fixed after 2.2.0.
- **Nothing on the lab's surface (SQL or HTTP) refreshes the snapshot without a write.** A new transaction does, but it puts a row back
  in the live index. A restart does.
- **Consequence:** stop reading `xt.live_tables` on a running source as settle evidence. Prove settled from block files, gauges and
  `xt.trie_stats`. That table reads the live trie catalog, not the snapshot. Then take the freeze fingerprint on a fresh start.

**Q3. "Restart, then settle, then stop" is harmless but in the wrong order.**
- The pre-settle restart buys nothing.
- What a symmetric freeze needs is this:
  - **Two `finish-block`s.** The second one cuts an empty block, and that block records the post-compaction trie catalog. A clone then
    loads the compacted catalog at start. Otherwise it plans over uncompacted L0 files until its first write (#6174 again).
  - **One start after the copy.** This "reference start" boots the same bytes every clone boots, and the freeze fingerprint is taken
    there.
- Every arm, cloned or freshly seeded, then starts its window from the same thing: a fresh JVM over a settled, cleanly stopped volume.
- **Cost at 10k: about 4 to 9 minutes on top of the seed `[E]`.** About 3 to 7 of those are the fingerprint and the 15-second
  stability readings. Each clone costs about 2 to 5 minutes, against 38 to 53 for a seed.

**Q4. In 2.2.0, reading a block that does not exist hangs.**
- `xt.block_files` means to skip missing blocks, but `MemoryCache` throws the loader error inside a coroutine it launched. The error
  never reaches the caller, so the query waits forever.
- Supported listing:
  - **Tries:** `xt.trie_stats` (catalog only, no file reads).
  - **Blocks:** the file listing of `buffers/v06/blocks/b*.binpb`, followed by `xt.block_files WHERE block_idx = '<listed>'` for listed
    indices only.
- Block GC deletes block files older than the latest minus 10, so indices are not dense from `00`.

**Q5. The protocol is in section 5. K01 changes, in order of importance:**
1. Add the Log4j flag.
2. Replace the `xt.live_tables` settle predicate.
3. Add the second `finish-block`.
4. Move the freeze fingerprint to a reference start after the copy.
5. Refuse a non-empty `.tmp` instead of deleting it.
6. Check the log tails offline.
7. Drop the pre-settle restart.
8. Make sure no client connection is open at stop.

```
 GOLDEN (once per key)                                           EVERY ARM
 ------------------------------------------------------------    -----------------------------------------
 seed --> finish-block #1 --> wait: new block, L0 tries in       clone arm:  copy golden --> start ---+
          trie_stats, jobs 0 x3, listing stable                                                       |
      --> finish-block #2 (empty block = catalog checkpoint)     fresh arm:  seed --> #1 --> #2 -->   |
          wait: block N+2, same tx_id, trie digest unchanged                 clean stop --> start ----+
      --> close clients --> docker stop -t 60                                                         |
          proof: exit 143, < 10 s, "Node stopped." (Log4j flag)                                       v
      --> offline: LOG/REPLICA_LOG tails valid, no .tmp files        same start evidence: "resuming after X",
      --> copy to tx2-golden-xtdb-<key8> (tree hash equal)           X = golden's last msg id, started 200,
      --> REFERENCE START of the source (same bytes):                live rows 0, trie digest = golden's,
          start lines, live rows 0, trie digest, C3-C8 freeze        C3-C8 = reference freeze record
      --> clean stop; golden itself is never started
```

## 1. Q1: why `docker stop -t 60` never logs `Node stopped.`

### 1.1 The shutdown path

| Step | What happens | Source |
| --- | --- | --- |
| Signal delivery | `ENTRYPOINT ["java", ..., "clojure.main", "-m", "xtdb.main"]` is exec form, so `java` is PID 1 and receives SIGTERM directly. No shell sits in between. | `[S] docker/Dockerfile:32-40` |
| Logging stack | Log4j2 with `BasicContextSelector`, so logging is synchronous with no async loggers. The `Console` appender writes to `SYSTEM_OUT`. `log4j2.xml` sets no `shutdownHook` attribute. | `[S] docker/Dockerfile:38`; `[S] main/src/main/resources/log4j2.xml:1-23`; Log4j `2.26.1` `[S] gradle/libs.versions.toml:35` |
| JVM on SIGTERM | The signal handler calls `Shutdown.exit(sig.getNumber() + 0200)`, so the status is 143. All registered hooks start "in some unspecified order" and run concurrently. | `[W] https://raw.githubusercontent.com/openjdk/jdk/master/src/java.base/unix/classes/java/lang/Terminator.java` line 51; `[W] https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Runtime.html` ("Shutdown Sequence") |
| XTDB's hook | Logs `Stopping node...`, delivers the promise the main thread waits on, and joins the main thread for 10 s. If the main thread is still alive it logs `could not stop node cleanly ...` and calls `halt(1)`. Otherwise it logs `Node stopped.`. | `[S] main/src/main/clojure/xtdb/main.clj:81-99` |
| Main thread | `start-node` sits in `util/with-open` on `@(shutdown-hook-promise)`. Delivery returns, `with-open` closes the node, and an exception from close propagates. | `[S] main.clj:166-171`; `[S] core/src/main/clojure/xtdb/util.clj:110-130` |
| Log4j's hook | `log4j2.shutdownHookEnabled` defaults to `true`: "a shutdown hook will be installed to stop all logger contexts when the system stops". It runs in its own `Runtime#addShutdownHook` thread. | `[W] https://logging.apache.org/log4j/2.x/manual/systemproperties.html` |

### 1.2 What the K01 logs show

- **Log4j's hook wins the race.** `restart-engine.log` ends at `21:36:37 | INFO xtdb.main | Stopping node...` and then shows the next
  container's start banner `[K]`.
- **Three node-close lines are missing too.**
  - pgwire logs `Server stopped.` at the end of its close `[S] core/src/main/clojure/xtdb/pgwire.clj:88,122`.
  - Healthz logs `Healthz server stopped.` `[S] core/src/main/clojure/xtdb/healthz.clj:200-202`.
  - Flight SQL logs `Flight SQL server stopped` `[S] core/src/main/kotlin/xtdb/api/FlightSql.kt:83`.
  - These run inside node close, before `Node stopped.`. Their absence means everything logged after `Stopping node...` was dropped,
    not just the last line.
- **The node close finished, and finished fast.**
  - `pre-freeze-restart-stop.json`: exit 143, `stopMs` 1542, not OOM-killed `[K]`.
  - `abort-missing-block.log`: exit 143, `stopMs` 5801 `[K]`. That run had a query hung on the missing block. pgwire's close waits up
    to 5 s (`drain-wait` default 5000 ms) for open connections before it force-closes them `[S] pgwire.clj:96-109`.

### 1.3 Why exit 143 within 10 s already proves the hook did not force the exit

1. If the main thread were still alive after 10 s, the hook would call `halt(1)` `[S] main.clj:92-95`. `halt` sets status 1 and
   "never returns normally" `[W] Runtime javadoc`. Docker would report 1, not 143.
2. If node close threw, the exception would leave `with-open` and reach `-main`'s `catch Throwable`, which calls `(System/exit 1)`
   `[S] main.clj:382-385`. During a shutdown already in progress, `exit` will "block indefinitely" `[W] Runtime javadoc`. The main
   thread would then still be alive at 10 s, so `halt(1)` again and exit 1.
3. So exit 143 plus a stop under 10 s means node close returned normally `[E]`. Closes that `try-close` swallowed would have logged
   `could not close` warnings, and those are lost to the same race `[S] util.clj:93-101`.

### 1.4 What evidence of a clean stop survives on disk

- **No marker.**
  - `LocalLog.close` only cancels its scope (5 s timeout) and closes its channels `[S] core/src/main/kotlin/xtdb/api/log/LocalLog.kt:309-312`.
  - `LocalStorage.close` only closes an allocator `[S] core/src/main/kotlin/xtdb/storage/LocalStorage.kt:182-184`.
  - `LiveIndex.close` is in memory only `[S] core/src/main/kotlin/xtdb/indexer/LiveIndex.kt:283-295`.
  - A clean stop of an idle node therefore leaves the same bytes as a kill at the same instant. For a golden, that is what matters:
    the freeze is the bytes of a settled idle node.
- **Checkable after the fact:**

| Evidence | Why it means something | Source |
| --- | --- | --- |
| `log/LOG` and `log/REPLICA_LOG` tails are well formed | Every append batch is `force(true)`. At start the node reads the last 8 bytes as the offset of the last record and requires a `0x1E` separator there, and `file size == offset + 1 + 4 + 8 + size + 8`. Otherwise start fails with "log file corrupted". The same check can run offline in the helper container. | `[S] LocalLog.kt:57-93,154-169` |
| No files under `buffers/**/.tmp/` | Uploads are written to `.tmp/upload*.arrow` and atomically moved into place. An upload interrupted by close leaves its temp file (the `ClosedByInterruptException` branch does not delete it). A settled node has no upload in flight, so `.tmp` must be empty. | `[S] LocalStorage.kt:54-57,118-128,150-177` |
| The next start's two lines | `starting follower: pending block: ..., src: S, replica: R` and `leader startup complete, resuming after X`. X is the source watermark after replay. For a settled freeze, X equals the last block's `latest_processed_msg_id`. `pending block` always prints `false` at process start (`openFollower()` gets no argument), so it proves nothing. | `[S] core/src/main/kotlin/xtdb/indexer/LogProcessor.kt:377-385,400,433,497` |
| Exit code and stop time | 143 within 10 s, as in 1.3. 137 means SIGKILL at the grace limit. 1 means `halt`. | 1.3 |

### 1.5 The fix and its alternative

| Option | What changes | Pros | Cons |
| --- | --- | --- | --- |
| **A (recommended).** Add `-Dlog4j2.shutdownHookEnabled=false` to `slots.json` `slots.xtdb.s1..s3.javaOpts` | Log4j no longer stops its context on its own. XTDB's hook still runs. Console output is synchronous, so every line is written before the JVM exits. | K01's existing `Node stopped.` rule works unchanged. The three component lines become visible too. | Changes the effective config hash, and with it the golden key. Both arms get it because both run on s1 to s3. dev and the followers are untouched. Needs the orchestrator's approval because it is a slot config change. |
| B. Keep the config and replace the log-line rule | Accept exit 143, `stopMs < 10000`, `Stopping node...` present, `could not stop node cleanly` absent, valid log tails, empty `.tmp`, and the reference start lines. | No config change. | Weaker: a swallowed close warning is invisible. It also contradicts the brief's own rule ("do not substitute exit 143"). |

Recommend A, with B's checks added: they cost nothing and they hold even if logging changes.

## 2. Q2: rows still visible after finish-block plus compactor jobs 0

### 2.1 Mechanism

```
 seed commits ---> LiveIndex.tables (61,709 rows)        sharedSnap = Snapshot.open(...) at last refresh
                                                           holds: its own slices of those rows,
 POST /system/finish-block                                        trieCatSnap (no L0 for the new block),
   -> FlushBlock msg -> BlockCutter.cut / upload                  txBasis = last seed tx
   -> adoptBlock: trieCatalog.addTries(L0)
                  tableCatalog.refresh                     NOT refreshed by nextBlock or addTries
                  liveIndex.nextBlock(): tables cleared
                                                           query: openSnapshot(minBasis)
 compactor: L0 -> L1, TriesAdded -> addTries               freshEnough = txBasis.systemTime >= minBasis
                                                           no new tx, so true: same old snapshot, for
                                                           every connection and every SQL text
```

| Claim | Source |
| --- | --- |
| The cached snapshot is refreshed only by `refreshSnap0`, which is called from (a) `openSnapshot` when the cache is older than the caller's minimum, (b) `refreshSnap()`, and (c) `LiveIndex.open` | `[S] LiveIndex.kt:98-120,221-237,317` |
| `refreshSnap()` has one caller outside `LiveIndex`: `Compactor.compactAll`, whose comment says the cached snapshot "would otherwise stay frozen at the last commit/`nextBlock`" | `[S] core/src/main/kotlin/xtdb/compactor/Compactor.kt:296-308` |
| `compactAll` is reachable only in-process (`xtdb.compactor/compact-all!`), not through pgwire or healthz | `[S] core/src/main/clojure/xtdb/compactor.clj:21-26`; healthz routes `[S] healthz.clj:49-142` |
| Block adoption clears the live tables but does not refresh the snapshot | `[S] core/src/main/kotlin/xtdb/database/PartitionState.kt:36-42`; `[S] LiveIndex.kt:262-281` |
| The snapshot captured a trie-catalog snapshot, the live tables (its own slices) and a table-catalog snapshot, with `txBasis = latestCompletedTx` | `[S] core/src/main/kotlin/xtdb/indexer/Snapshot.kt:133-195`; slices `[S] LiveIndex.kt:149-150` |
| `xt.live_tables` sums row counts from the snapshot (`.table snap`) | `[S] core/src/main/clojure/xtdb/information_schema.clj:473-479,623` |
| `xt.trie_stats` reads the live trie catalog (`.getTrieCatalog db-state`), not the snapshot | `[S] information_schema.clj:464-471,567,622` |
| `xt.metrics_gauges` reads the meter registry, not the snapshot | `[S] information_schema.clj:512,626` |
| A query's minimum basis is the connection's resolved token, and the cached snapshot is handed back "when it's fresh enough" | `[S] core/src/main/clojure/xtdb/query.clj:368-381,426-439` |
| Replaying `TriesAdded` on follower or leader calls `addTries`, with no refresh | `[S] core/src/main/kotlin/xtdb/indexer/FollowerLogProcessor.kt:155-157`; `[S] LeaderLogProcessor.kt:196-198` |

**Which component holds the rows:** `LiveIndex.sharedSnap`, a `Snapshot` with its own `TableSnapshot` slices of the pre-block live
tables. It is not the live index (cleared), not the buffer pool and not the memory cache.

**Why a restart reads zero:** `PartitionState.open` loads the catalogs from the latest block and calls `LiveIndex.open`, which
builds a fresh snapshot over an empty live index `[S] PartitionState.kt:54-74`; `[S] LiveIndex.kt:301-318`.

**What empties it without a restart:**
- **A committed transaction.** It advances `latestCompletedTx`, so the next query with that basis refreshes the snapshot. But it adds
  a transaction and live rows, so the golden is no longer "live index empty".
- **Waiting does nothing.** The cache has no time-based expiry.
- **Conclusion:** do not try. Use the restart this protocol needs anyway.

### 2.2 Two consequences the K01 code does not yet handle

1. **The pre-stop fingerprint cannot equal a clone's.**
   - C6 records `liveTables` on the running source. That is 61,709 stale rows, against 0 on any clone.
   - C8's `EXPLAIN ANALYZE` on the source plans over the in-memory live rows. A clone plans over files.
   - Both compare a stale view with a fresh one.
2. **A golden with only one `finish-block` gives clones stale plans until their first write.**
   - The latest block records the trie partitions as of its cut, current catalog plus its own L0: `BlockCutter.upload` builds them
     with `trieCatalog.withPartitions` `[S] core/src/main/kotlin/xtdb/indexer/BlockCutter.kt:207-214`.
   - A starting node loads its trie catalog from that block's table blocks `[S] core/src/main/clojure/xtdb/table_catalog.clj:78-88`;
     `[S] core/src/main/clojure/xtdb/trie_catalog.clj:575-580`.
   - Compaction that finished after the cut exists only as `TriesAdded` records. Replay applies them after `LiveIndex.open` has already
     built the snapshot.
   - So a clone's reads plan over the uncompacted L0 files until its first transaction. This is #6174 ("after a restart"),
     R14 H10 `[P] lab/research/R14-xtdb-correctness-hazards.md:24,55`.
   - **A second `finish-block` after compaction is idle fixes it.**
     - It cuts an empty block, because `FlushBlock` cuts whenever its expected index is the current one, rows or not
       `[S] core/src/main/kotlin/xtdb/indexer/SourceLogProcessor.kt:142-152`.
     - That block records the post-compaction partitions.
     - An empty block writes no tries, so it gives the compactor nothing to do `[S] core/src/main/kotlin/xtdb/indexer/BlockFlusher.kt:11-16`.
   - K01's final path (restart, then a second `finish-block`, 1 to 2 blocks) did this by accident `[K] final-live.log`.

### 2.3 Snapshot-independent evidence that a block is cut, adopted and compacted

| Fact | Observable | Source |
| --- | --- | --- |
| Block N+1 is durable | `b<lexhex(N+1)>.binpb` appears in the file listing, and the `xtdb.block.last_upload_time` gauge advances | `[S] BlockCutter.kt:240-243`; `[S] LogProcessor.kt:421-426` |
| It holds every completed tx | `xt.block_files` row for that index: `tx_id` equals gauge `node.tx.latestCompletedTxId`, and `latest_processed_msg_id` equals `node.tx.latestProcessedMsgId`, which equals `latestSubmittedMsgId` (`node.tx.lag.MsgId` 0) | `[S] core/src/main/clojure/xtdb/block_tables.clj:110-118`; `[S] core/src/main/kotlin/xtdb/database/Database.kt:375-387`; `[S] core/src/main/kotlin/xtdb/catalog/TableCatalog.kt:304-339` |
| Adopted | `xt.trie_stats` shows a level-0 trie keyed to block N+1 for each table that had rows. `addTries` is the first step of `adoptBlock`, and the other two follow in the same call. | `[S] PartitionState.kt:36-42`; `[S] core/src/main/kotlin/xtdb/trie/Trie.kt:54` |
| Compaction idle | `compactor.jobs.available` is 0 on three readings 5 s apart. The gauge is computed from the trie catalog, so a job in flight still counts until its output tries land. | `[S] Compactor.kt:206,212-262` |
| GC done | File listing and `xt.trie_stats` digest unchanged across the same three readings. Block GC is signalled at each block boundary and deletes block files `<= latest - blocksToKeep` (default 10). Trie GC deletes garbage older than the latest tx's system time minus 24 h, so it is data-time based and does nothing to a fresh seed. | `[S] core/src/main/kotlin/xtdb/garbage_collector/BlockGarbageCollector.kt:136-160`; `[S] core/src/main/kotlin/xtdb/api/GarbageCollectorConfig.kt:13-16`; `[S] core/src/main/kotlin/xtdb/garbage_collector/TrieGarbageCollector.kt:37-42,131-134` |

Adoption itself writes nothing to disk; it is in memory. The bytes at stop are the same whether or not adoption finished, as long as
`BlockUploaded` is durable. The adoption check matters because the compactor's job list depends on it.

## 3. Q3: is "restart, then settle, then stop" a symmetric freeze?

### 3.1 What symmetry has to mean here

Two arms are comparable when each starts its window from:
- the same kind of state: a cleanly stopped, settled volume, booted by a fresh JVM;
- the same in-memory picture: an empty live index, a snapshot built over the compacted trie catalog, cold caches, and a block timer
  restarted at 15 minutes (`IndexerConfig.flushDuration` `[S] core/src/main/kotlin/xtdb/api/IndexerConfig.kt:16`;
  `[S] BlockFlusher.kt:18-50`).

A clone always starts this way. A fresh-seeded arm (E1, C10) matches only if it also settles, stops cleanly and starts again. An arm
that measures on the JVM that seeded it carries the stale snapshot from 2.1 and warm caches, so it is not symmetric.

### 3.2 K01's order compared with the recommended one

| | K01 observed: finish-block, restart, finish-block, stop | Recommended: finish-block, finish-block, stop, copy, reference start, stop |
| --- | --- | --- |
| Settle evidence | Waited for `live_tables` 0, which on the source never comes without the restart | Block file, gauges, trie digest (2.3), no restart needed |
| Catalog checkpoint (2.2 item 2) | Yes, by accident: the post-restart `finish-block` cut an empty block | Yes, on purpose: `finish-block` #2 |
| Golden bytes | Include one extra leader term and one extra claim `NoOp` in `REPLICA_LOG` per restart (`LogProcessor.kt:284-287`) | Exactly the settled bytes. The reference start's claim lands on the source only, after the copy |
| Freeze fingerprint | On a node that started before the second block. Fresh, but not the bytes clones get | On a node booted from the golden's bytes, the same start every clone makes |
| Symmetric with a fresh arm | Only if the fresh arm also restarts in the middle | Fresh arm = the same steps without the copy |

Either order gives a valid golden once the stop proof exists. The recommended order is simpler. It drops one start and stop, and it
makes "golden fingerprint = clone fingerprint" hold by construction.

### 3.3 Cost of each step at 10k

**Scaling inputs `[E]`:**
- At 500 subjects, 26,635 assertions became 61,709 live rows, 2.32 rows per assertion `[K] live-diagnostic.json, retry.log`.
- At 10k, 384,785 assertions gives about 890k rows `[P] R26 0`.
- `rowsPerBlock` is 102,400 `[S] IndexerConfig.kt:15`.
- So about 8 blocks are cut during the seed, about 70k rows are still open at its end, and 10 blocks exist after both `finish-block`s.
  With `blocksToKeep` 10 that is right at the GC edge.

| Step | 500-subject observation | 10k estimate | Basis |
| --- | --- | --- | --- |
| Seed | 64.8 to 90.9 s | 38 to 53 min | `[K] seed.log, retry.log`; `[P] R26 0` |
| `finish-block` #1 to new block | under 6 s (first poll) | 5 to 20 s | `[K] retry.log` 21:31:15 to 21:31:21; open-block upload only `[E]` |
| Compaction to jobs 0, plus 3 readings | already 0 | 0.5 to 3 min | L0 to L1 about 150k rows/s per thread `[P] R24 table "L0 to L1"`; A0 saw the last block still compacting at window start `[P] R26 237` |
| `finish-block` #2 plus 3 readings | about 15 s | 15 to 30 s | `[K] final-live.log` 21:37:19 to 21:37:34 |
| Clean stop | 1.5 s (5.8 s with a hung client) | 2 to 6 s | `[K] pre-freeze-restart-stop.json, abort-missing-block.log` |
| Offline tail and `.tmp` check | n/a | under 5 s | reads 8 bytes plus a header per log `[E]` |
| Copy to golden | not run | 10 to 60 s for about 3.9 GiB | `[P] R26 390`; P4's retained 10k volume is 3.87 GiB `[K] cleanup-status.txt` |
| Reference start to `/healthz/started` | about 1 s on an empty volume | 10 to 30 s | `[K] restart-engine.log`; follower ready in 11 to 28 s `[P] EXP-X05 REPORT.md:6` |
| C3 to C8 fingerprint | not persisted | 1 to 3 min | `[P] R26 390` |
| Final stop | 1.5 s | 2 to 6 s | as above |
| **Freeze total beyond the seed** | | **about 4 to 9 min** | sum |
| **Per clone (copy, start, verify)** | | **about 2 to 5 min** | R26 budget |
| **Extra for a fresh-seeded arm (settle, stop, start)** | | **about 1.5 to 4.5 min** | sum |

K01's extra pre-settle restart would add one stop and one start, about 15 to 40 s at 10k, and nothing else.

## 4. Q4: the supported way to list blocks and tries

### 4.1 Why the missing-block probe hung

1. **The system table expects missing blocks.** `xt.block_files` needs `block_idx` bounds, then reads each index through the buffer
   pool. `try-read-block` wraps the read in `catch Exception` and returns nil for a missing block `[S] block_tables.clj:120-160`.
2. **`LocalStorage.getByteArray` reads through `MemoryCache.get`.** Its loader throws `Object ... doesn't exist.` for a missing file
   `[S] LocalStorage.kt:59-74`.
3. **The loader throws in the wrong place.** In `MemoryCache.FetchReq.handle`, the loader `fetch(path)` runs as the first statement
   of a coroutine launched on a `SupervisorJob` scope, outside the `try` `[S] core/src/main/kotlin/xtdb/cache/MemoryCache.kt:93-94,115-133`.
   - The exception goes to the uncaught handler, which is the `xtdb.util | Uncaught exception` line in `[K] settle-engine.log`.
   - Nothing completes the waiting `CompletableDeferred`s, so the query blocks forever.
4. **Every later read of that path also hangs.** The path stays in `fetchReqs`, so any later read of the same path joins the dead
   fetch as one more waiter `[S] MemoryCache.kt:115-119`.
5. **The same hazard hits two more tables.** `xt.table_block_files` and `xt.table_block_file_tries` read table-block files the same way
   `[S] block_tables.clj:173-186`.

### 4.2 Supported listing

| Need | Use | Why it is safe |
| --- | --- | --- |
| Tries and their state | `SELECT ... FROM xt.trie_stats` | Reads the in-memory trie catalog, no file reads `[S] information_schema.clj:464-471` |
| Which blocks exist | File listing of `/var/lib/xtdb/buffers/v06/blocks/b*.binpb` (K01's current method) | It is the engine's own rule: the latest block is the lexicographically last `blocks/*.binpb` `[S] TableCatalog.kt:352-361` |
| Block contents | `xt.block_files WHERE block_idx = '<lexhex>'` for listed indices only | It reads only existing files |
| Block contents with the node stopped | `docker run --rm -v <vol>:/var/lib/xtdb:ro <pinned image> read-block-file /var/lib/xtdb/buffers/v06/blocks/<f>` | A CLI command of the same image `[S] main.clj:304-321,367-369`. The second JVM gets `JDK_JAVA_OPTIONS` only if it is passed, so size it small |

Two traps:
- **Indices are not dense.** Block GC removes files `<= latest - 10` `[S] BlockGarbageCollector.kt:140-142`, so a range starting at
  `00` hangs once GC has run.
- **Names are lex-hex.** Index 0 is `00`, 15 is `0f`, 16 is `110` `[S] core/src/main/kotlin/xtdb/util/StringUtil.kt:164-168`.

Read the listing again right before each query. Block GC can delete a file between the listing and the query. A deleted file is
missing, so the query hangs.

## 5. Q5: the freeze protocol

All waits poll every 5 s. "x3" means three consecutive readings 5 s apart. Every step writes its evidence into
`golden-attempt-*.json` before the next step starts (K01 `engine.mjs:638` already does this).

### 5.1 Golden

| # | Step | Evidence the step must produce (refuse otherwise) | Timeout at 10k |
| --- | --- | --- | --- |
| G0 | Config: s1 to s3 `javaOpts` include `-Dlog4j2.shutdownHookEnabled=false` (decision D1) | Effective config records it; golden key includes it | n/a |
| G1 | Seed (existing). The seed process exits, so its pgwire pool is closed | Manifest complete, closed form exact | existing |
| G2 | Baseline | File listing gives the latest index L (or none). Gauges: `latestCompletedTxId` T, `latestSubmittedMsgId`, `latestProcessedMsgId`, `lag` 0, `last_upload_time` U0, `jobs`. `xt.trie_stats` digest D0 | 30 s |
| G3 | `POST /system/finish-block` #1 | 200. Then a file at index L+1 (index 0 if none); its `xt.block_files` row has `tx_id` = T and `latest_processed_msg_id` = gauge `latestProcessedMsgId` = `latestSubmittedMsgId`; `last_upload_time` > U0; `xt.trie_stats` has an L0 trie for block L+1 per table that had rows; then jobs 0 x3 with an unchanged listing and trie digest D1 x3 | 15 min |
| G4 | `POST /system/finish-block` #2 (catalog checkpoint) | 200. A file at L+2 whose `tx_id` = T and `latest_processed_msg_id` = the new `latestProcessedMsgId`; `last_upload_time` advanced; jobs 0 x3; trie digest = D1 x3 (an empty block adds no tries); listing stable x3 | 3 min |
| G5 | Pre-stop record | Listing, D1, gauges, and `xt.trie_stats` rows saved. **Do not record `xt.live_tables` here** (stale by design, 2.1) | 30 s |
| G6 | No clients | `clone-check` process exited; no other holder connected. pgwire drains for up to 5 s per open connection (`pgwire.clj:96-109`), and an open snapshot can hold `LiveIndex.close` for up to 60 s (`LiveIndex.kt:291-292`), which would exceed the 10 s hook and force `halt(1)` | 5 s |
| G7 | `docker stop -t 60` | Exit 143, not OOM, `stopMs` < 10000, `Stopping node...` and `Node stopped.` in this run's log, no `could not stop node cleanly`. Predicted with D1: `Server stopped.`, `Flight SQL server stopped` and `Healthz server stopped.` before `Node stopped.` | 60 s, refuse at 10 s |
| G8 | Offline checks, helper container, read-only mount | `LOG` and `REPLICA_LOG` tails pass the `LocalLog.kt:61-93` structure check; no file under any `buffers/**/.tmp/`; block listing = G5 | 1 min |
| G9 | Copy to `tx2-golden-xtdb-<key8>` (existing) | Source and destination tree hashes equal. **Refuse on `.tmp` content; do not `rm -rf` it** | 5 min |
| G10 | Reference start of the source slot (the same bytes as the golden) | `resuming after X` with X = G4's `latest_processed_msg_id`; `/healthz/started` 200; `xt.live_tables` total 0; `latestCompletedTxId` = T; lag 0; `xt.trie_stats` digest = D1; jobs 0 x3 | started within 2 min |
| G11 | Freeze fingerprint C3 to C8 on the reference start | This is the golden record's `freeze`; listing unchanged at the end (no timer block) | finish within 10 min of G10, inside the 15 min flush timer |
| G12 | Stop the reference start | Same proof as G7. Then retire the source volume as K01 does now. Never start the golden volume | 60 s |

### 5.2 Every arm

| Arm | Steps | Start evidence |
| --- | --- | --- |
| Clone | copy golden, C1 tree hash, start | `resuming after X` = golden record's X; started 200; live rows 0; trie digest = D1; jobs 0 x3; C3 to C8 = the G11 record exactly (same lineage) |
| Fresh-seeded (E1 C10, or any comparator) | G1 to G8 on its own slot, no copy, then start | Same lines and checks. C3 is compared by shape across seeds (K01 correction 5) |

Arms must begin their windows the same number of seconds after `/healthz/started`, because the 15-minute block timer starts with the
process (`BlockFlusher.kt:23-28`).

**Q74e's forced in-window `finish-block` has the same staleness.** Read-only traffic after it sees the stale snapshot until the next
write. Under P1 write load the next commit refreshes it within one commit `[E]`.

### 5.3 What K01 must change

| # | Change | Where | Why |
| --- | --- | --- | --- |
| 1 | Add `-Dlog4j2.shutdownHookEnabled=false` to s1 to s3 `javaOpts` (needs approval, decision D1) | `lab/config/slots.json` | Q1 |
| 2 | `stopVerdict`: also require `stopMs < 10000` and `Stopping node...`; record the component lines | `lab/bin/engine.mjs:500-509` | 1.3 |
| 3 | Settle: drop `live.total === 0` from the predicate; use the block, gauge, `xt.trie_stats` L0 and stability checks; add `last_upload_time` to `gauges()` | `lab/bench/clone-check.ts:58-106` | 2.1, 2.3 |
| 4 | Second `finish-block` after jobs 0 | same | 2.2 item 2 |
| 5 | Freeze fingerprint moves to a reference start after the copy; drop the pre-stop fingerprint from the record, or keep it as non-compared diagnostics | `lab/bin/engine.mjs:618-697` (`golden`) | 2.2 item 1 |
| 6 | Offline log-tail and `.tmp` checks before the copy; refuse a non-empty `.tmp` instead of `find ... -exec rm -rf` | `engine.mjs` golden helper script | 1.4 |
| 7 | Keep file-listing enumeration; read the listing again right before each `xt.block_files` query; never query `xt.table_block_files` or `xt.table_block_file_tries` for an unlisted index | `clone-check.ts:68-82` | Q4 |
| 8 | Drop the pre-settle restart from the operator sequence | K01 run book, `E1-PLAN.md` | 3.2 |
| 9 | E1 fresh arm uses G1 to G8 plus start | `E1-PLAN.md` | 5.2 |
| 10 | When 2.2.1 is pinned, test again whether the second `finish-block` and the reference start are still needed (#6174 fixed) | R21 E2 | `[P] R21:196,285` |

**R26 corrections:**
- R26 1.5 item 2 assumed the log line follows a clean stop. With Log4j's default hook it does not.
- R26 1.5 item 4 and 6.2 assumed `finish-block` plus jobs 0 empties the live index "as queries see it". On the cached snapshot it
  does not.
- R26 6.2 needs a second `finish-block` and a reference start.

## 6. Predictions to test (one small exclusive-slot run, 500 subjects)

| # | Check | Expected | Refutes the report if |
| --- | --- | --- | --- |
| T1 | Stop a running s-slot with D1 | Log tail `Stopping node...`, the three component lines, `Node stopped.`; exit 143; under 3 s | `Node stopped.` still missing, which means something besides Log4j's hook drops lines |
| T2 | Stop the same slot without D1 | Only `Stopping node...`; exit 143 | The lines appear, which means the race is intermittent: run T1 and T2 5 times each |
| T3 | After `finish-block` with no tx, compare `xt.trie_stats` with `xt.live_tables` | `trie_stats` shows the new L0 trie while `live_tables` is still nonzero | `trie_stats` lags as well |
| T4 | After G4, the second block | `tx_id` same as the first block, no new L0 tries, jobs 0 | The empty block writes tries or adds jobs |
| T5 | Reference start trie digest compared with D1 | Equal | Different, which means the block-recorded partitions differ from the live catalog (state or garbage fields) |
| T6 | Clone from a golden with only one `finish-block`, `EXPLAIN ANALYZE` C8 before and after one write | Plan touches L0 files before the write and compacted files after | No difference: #6174 does not apply to this layout |
| T7 | `resuming after X` on the reference start | X = last block's `latest_processed_msg_id` | X larger: some source message lands after the last block |

## 7. Decisions for Sam or the orchestrator

1. **D1.** Approve the Log4j flag on s1 to s3, which changes the config hash and the golden key (recommended). The alternative is
   option B, the compound proof without the log line.
2. **D2.** Approve the canonical freeze state "settled with a catalog-checkpoint block, fingerprinted on a reference start". Historical
   A0 receipts started hot and stay not directly comparable, as R26 open question 1 already says.

## 8. Sources

- XTDB `v2.2.0` (`c6c1962`), `references/xtdb`: every `[S]` path above.
- K01 evidence at `ad11a68`: `lab/experiments/EXP-K01-seed-clone/REPORT.md` and `evidence/{retry,final-live,restart-engine,settle-engine,golden,snapshot-diagnostic,up}.log`,
  `evidence/{pre-freeze-restart-stop,abort-missing-block,live-diagnostic}.json`, `evidence/cleanup-status.txt`.
  K01 code at the same commit: `lab/bench/clone-check.ts`, `lab/bin/engine.mjs`.
- Lab: `lab/research/R26-seed-clone.md`, `R14-xtdb-correctness-hazards.md`, `R16-xtdb-northstar-fit.md`, `R21-engine-upgrade-survey.md`,
  `R24-current-path-and-sweep.md`, `lab/experiments/EXP-X05-xtdb-read-follower/REPORT.md`, `lab/config/slots.json`, `xtdb-config.yaml`.
- Web, fetched 2026-11-08:
  - Log4j system properties, `https://logging.apache.org/log4j/2.x/manual/systemproperties.html`.
  - Java 21 `Runtime`, `https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Runtime.html`.
  - OpenJDK `Terminator.java`, `https://raw.githubusercontent.com/openjdk/jdk/master/src/java.base/unix/classes/java/lang/Terminator.java`.

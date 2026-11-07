# R13: Log of record for the QLever lane, durable append from Node, and what fsync means on this Mac

**Written:** 2026-11-07. **Scope:** contracts C2 (commit protocol), C3 (broker and fence) and C4 (publication) in `lab/PLAN.md` v1. **Engine under protection:** QLever 0.6.0 (`adfreiburg/qlever`, source tag `v0.6.0`, sha `6c5861a`). **Host:** MacBook Pro `Mac15,7` (Apple M3 Pro, 36 GB, internal Apple SSD, macOS 26.5.1), Node 22.23.2 (libuv 1.51.0). **VM:** colima profile `triplex2` (colima 0.10.3, limactl 2.1.4, `vmType: vz`, `mountType: virtiofs`, Ubuntu 24.04 guest, kernel 6.8).

## How to read this report

- **Evidence labels.** `[S]` = read in pinned source (QLever, XTDB) or in upstream source at the cited tag. `[P]` = measured or observed by me on this machine. `[W]` = web primary source (docs, KIP, Jepsen report, vendor docs), fetched without authentication. `[E]` = my extrapolation from measured numbers.
- **Confidence** is High (source and measurement agree, or direct measurement of the exact behavior), Medium (one line of evidence, or a toy-scale measurement), Low (inferred).
- **Source cites** for QLever are `path:line @ 6c5861a` relative to `references/qlever`. Other cites name the repo and tag.
- **What I did not do.** I started no QLever or XTDB container (memory rule), so every QLever statement is from source, from R2/R8, or labelled as untested. I could not cut power, so every power-loss statement is an argument from documentation plus latency measurements, not an experiment.
- **Raw material.** Scripts, raw outputs and fetched upstream files are in `/Users/sam/Claude/Projects/triplex-db-2/R13-log-durability/` (`scripts/`, `out/`, `raw/`). The throwaway container used `node:22-alpine` (256 MiB cap), ran on `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock` only, and was removed together with its image and volume. To rerun `scripts/vm-run.sh`, pull the image again and `mkdir R13-log-durability/vmdata`.

---

## 0. Verdicts at a glance

| # | Question | Verdict | Confidence |
|---|----------|---------|-----------|
| 1 | Prior art | Every system that survives crashes treats the log as the only commit point and the index as a deterministic follower that can be rebuilt and replayed. None gets mutual exclusion from lease timing: safety comes from a check at the resource (Datomic CAS on the root pointer, Kafka producer epochs). Documented failures cluster in four places: lazy fsync, torn-tail versus corruption handling, retrying after an fsync error, and checkpoints that are not atomic with the log offset. | High |
| 2 | Durable append from Node 22 | On macOS, Node's `fs.fsync` and `fs.fdatasync` both issue `F_FULLFSYNC` (libuv 1.51 source). Measured: 2.9 ms per 1 KiB append when the machine is quiet, 8.5 ms median when the R7/R8 probes are busy, p99 up to 25 ms. `O_DSYNC` and `O_SYNC` cost 0.02 ms on macOS, so they are not durable and must not be used. One fsync per commit group costs at most a few percent of a QLever update (0.2 to 1.7 s per R8). A frame with chained CRC32C classified all 72,204 truncation points and every single-bit flip in two test frames correctly. | High |
| 3 | What fsync means here | Inside the VM, `fsync` ends in a host `fsync(2)` on the disk image, which Apple documents as not flushing the drive cache (limactl hard-codes cached mode plus `Fsync`). Measured guest latency is 0.13 to 1.2 ms, far under the 2.9 ms floor of a real `F_FULLFSYNC`. virtiofs is no stronger. ACK durability is therefore: survives process crash and VM crash, probably survives a macOS kernel panic, not guaranteed through power loss. Putting the broker and log on the macOS host and using Node's `fs.fsync` gives `F_FULLFSYNC` durability and a separate failure domain from the VM disk. | High on mechanism, Medium on host panic, power loss untested |
| 4 | Checkpoint export and generation switch | QLever 0.6.0 has no N-Quads output. SELECT can export all graphs as TSV or JSON, but TSV drops the specific datatype of native numbers. The better checkpoint is produced by folding the log (sorted N-Quads, zstd), not by exporting from QLever, because the checkpoint must not depend on the health of the engine it protects. `qlever-index -F nq` rebuilds it. A tmp-dir, manifest, `COMMITTED` marker, rename, atomic `CURRENT` switch survived a crash-state model check (520 states, 0 violations; 5 mutants each caught). | High on source, Medium on costs |
| 5 | Single-writer fencing | Use a kernel advisory lock held for the broker's whole life, plus an epoch in the log, plus an epoch-and-position guard inside every QLever update. The QLever access token authenticates but does not fence: it is fixed at server start, printed in the server log at INFO, and shared by every holder. `flock` is exclusive across containers (tested on an ext4 volume and on virtiofs) but is not coherent between the macOS host and the guest on virtiofs (tested). | High for the lock tests, Medium for the update guard |

**Requested changes to PLAN v1** (details in section 6.7):
1. C2.8: generate checkpoints by folding the log, not by exporting from QLever (export stays an audit tool).
2. C2.1/C3: run the broker and the log on the macOS host, not in the VM, and say so in the profile identity.
3. C2.3: define log frames as pure quad deltas (no read-dependent WHERE logic) so replay from any earlier position is idempotent. This matches R8's finding that re-sending converges.
4. C3.3: name the fencing mechanism (lock plus epoch plus update guard) instead of "lease".

---

## 1. Prior art: a log of record with a rebuildable query index

### 1.1 Verdict

1. **Commit = durable append** in XTDB 1.x, Datomic, Elasticsearch (`durability: request`) and PostgreSQL. Systems that acknowledge before the append is durable (Kafka by default, NATS JetStream by default) depend on replication, and Jepsen found acknowledged-write loss in NATS 2.12.1 when that assumption failed. We have one machine and no replicas, so we must fsync before the decision.
2. **The index is a function of the log.** XTDB 1.x indexes with a follower (`tx-ingester`) that resumes from `latest-completed-tx`; Datomic rebuilds its memory index from the log on every load; Elasticsearch replays the translog after its last Lucene commit; Kafka Streams restores a RocksDB store from a changelog. In each, a crash between "log durable" and "index updated" is repaired by replay, not by rollback.
3. **Fencing uses a check at the resource.** Datomic's Jepsen report says two transactors can be active at once and safety comes from a sequential compare-and-set on the storage root pointer. Kafka bumps a producer epoch on `initTransactions` so the broker rejects the old one. Kleppmann's fencing-token argument is the general form.
4. **Checkpoints must capture state and log offset atomically.** Kafka Streams kept changelog offsets in a separate `.checkpoint` file and had to redesign (KIP-1035) because the file cannot be atomic with the state it describes.

Confidence: High (source or primary docs for each row below; no Jepsen analysis of XTDB 1.x exists that I could find).

### 1.2 Comparison

| System | Commit point | Group commit | Fencing, epochs, leases | Crash between log and index | Checkpoint or compaction | Retention |
|--------|-------------|--------------|-------------------------|----------------------------|--------------------------|-----------|
| **XTDB 1.x** (Kafka tx-log) | Kafka record acked by all in-sync replicas (`acks=all`, idempotent producer). Documents go to the document store first, then the tx event to the log. `tx-id` is the Kafka offset. [S] | Kafka producer batching; ingester pulls 50 txs per poll and batches by doc count. [S] | None at the XTDB layer. Single-partition topic gives total order; index nodes are deterministic followers, so several can run. Kafka brokers fence by leader epoch. [S] | On start the ingester reads `latest-completed-tx` from the index store and resubscribes after it; it logs "Latest completed tx ... latest submitted ...". An ingester error stops indexing (fail-stop). [S] | `xtdb.checkpoint`: RocksDB `Checkpoint.createCheckpoint` (hardlinks), uploaded to a checkpoint store with `retain-at-least` and `retain-newer-than`; a new node restores the newest checkpoint, then replays the log. [S] | Tx topic `retention.ms = Long.MAX_VALUE`; document topic compacted by content hash. [S] |
| **Datomic** | Transactor appends to the log in storage and does not acknowledge until it is durable. [W] | Transactor batches queued transactions; only the log write blocks. [W] | Active/standby transactors; standby takes over after two missed heartbeats (default 5 s). Jepsen: two can be active, safety comes from a sequential CAS on the storage root pointer, not from fencing; transactors kill themselves when storage connectivity is unstable. [W] | Memory index is rebuilt from the log on every load; indexing jobs write new immutable segment trees, then CAS the root. [W] | Background indexing; if it lags past `memory-index-max` the transactor throttles writes. [W] | Log is part of the database; old index segments are garbage after a newer root. |
| **Kafka Streams** | The changelog topic append (producer ack). Local RocksDB is a cache of it. [W] | Producer batching; EOS transactions group output and offsets. [W] | `transactional.id` plus epoch bump on `initTransactions`; old epochs get `InvalidProducerEpoch`. [W] | Restore replays the changelog (from the `.checkpoint` offset when valid, else from the start). [W] | Compacted changelog; standby replicas keep a warm copy. KIP-1035 moves offsets into the store because `.checkpoint` cannot be atomic with state. [W] | Compaction keeps the latest value per key. |
| **Elasticsearch** | Translog fsynced before the request is acknowledged (`index.translog.durability: request`, default; `async` loses up to `sync_interval`, default 5 s). [W] | Per bulk request. | Primary and replica terms with sequence numbers (not read in detail). | Operations after the last Lucene commit are replayed from the translog on shard recovery. [W] | A flush is a Lucene commit plus a new translog generation; `flush_threshold_size` (default 10 GB) bounds replay. [W] | Translog trimmed after commit. |
| **etcd WAL** (Raft) | `fdatasync` of the WAL tail before acknowledging. [S] | Per Raft batch. | `flock` on every WAL segment file (`LockedFile`); one process per data dir. [S] | Replay WAL after the last snapshot. | Raft snapshots; old segments released after. | 64 MB preallocated segments. |
| **PostgreSQL WAL** | Commit record flushed (`fsync`, `fdatasync` on Linux; `fsync_writethrough` exists). [W] | `commit_delay` and `commit_siblings`; since 9.3 the first backend waits and the rest ride its flush. [W] | One postmaster per data directory, enforced by a lock file (general knowledge, not fetched). | Redo from the last checkpoint (general knowledge). | Checkpoints plus WAL recycling (general knowledge). | By checkpoint distance. |
| **XTDB 2.2.0 LocalLog** (pinned in this repo) | Batch of up to 10 messages appended, then `FileChannel.force(true)`. On a Mac JDK `force` is `F_FULLFSYNC`. On any failure the file is truncated back to the batch start. [S] | Up to 10 messages per `force`. | `epoch` is an integer in config that is stamped on message ids; it is not a lock or lease. No file lock in the file. [S] | Index state is rebuilt from the log; no CRC in the record (`separator, size, timestamp, payload, offset`). | Block files in the object store. | Operator trims after block flush. |

Source details: XTDB 1.x `core/src/xtdb/node.clj:218-221` (docs submitted, then tx), `modules/kafka/src/xtdb/kafka.clj:64-70` (`acks=all`, idempotence), `:132-134` (single partition asserted), `:220-224` (`retention.ms`), `core/src/xtdb/tx.clj:526-531, 575-577` (ingester start and replay), `modules/rocksdb/src/xtdb/rocksdb.clj:270-285` (`sync?` default false, `disable-wal?` default false, so the index store is not trusted to be durable), `core/src/xtdb/checkpoint.clj`. XTDB 2.2.0 `core/src/main/kotlin/xtdb/api/log/LocalLog.kt:129-190`. etcd `server/storage/wal/wal.go` (`SegmentSizeBytes = 64 MB`, `crc32.Castagnoli`, `Fdatasync`, `Fsync(dir)`, `LockFile`), `repair.go`, `encoder.go`. JDK `FileDispatcherImpl.c` (macOS branch) calls `fcntl(fd, F_FULLFSYNC)`.

### 1.3 Documented failure modes that apply to us

| Failure | Where | What happened | Lesson for the broker |
|---------|-------|---------------|----------------------|
| Lazy fsync loses acknowledged writes | Jepsen, NATS JetStream 2.12.1 [W] | Default fsync about every two minutes while publishes are acknowledged immediately. A simulated power failure lost 131,418 of 930,005 acknowledged messages in one run; rapid single-node kills within the first two minutes deleted a whole stream in another. | ACK only after a durable append. A weaker default needs a named, documented window. |
| Corrupt or truncated segment files | Jepsen, NATS [W] | Bit flips or truncation on 1 to 2 of 5 nodes lost up to 679,153 of 1,367,069 acknowledged writes, 201,286 of them while later writes from the same process were readable. | A checksum that only says "bad" is not enough. Recovery must decide between "torn tail, truncate" and "mid-log corruption, stop". |
| Single node loses unsynced data | Redpanda analysis of Kafka defaults [W] | Truncating the leader's log tail after acks=all lost an acknowledged record and shifted later offsets. | Replication does not replace local fsync. We have no replication, so fsync is the whole story. |
| Retrying after fsync failure | PostgreSQL "fsyncgate" (2018), Rebello et al., USENIX ATC 2020 [W] | After a failed `fsync` Linux marks the dirty pages clean, so a retried `fsync` returns success without the data on disk. PostgreSQL now PANICs. The ATC paper found no studied application (PostgreSQL, LMDB, LevelDB, SQLite, Redis) handled it fully. | On any write or fsync error: stop acknowledging, never retry on the same descriptor, exit, and recover by re-reading the file. |
| Crash-consistency assumptions break across filesystems | Pillai et al., OSDI 2014 [W] | 60 crash vulnerabilities in 11 widely used applications; persistence properties differ across six Linux filesystems. | Fsync the file, then the directory, for every create and rename. Do not rely on ext4 or APFS ordering. |
| Checkpoint offset not atomic with state | Kafka KIP-1035 [W] | Changelog offsets in a separate `.checkpoint` file cannot be synced atomically with RocksDB state. | Put the log position inside the checkpoint manifest and publish the manifest last. |
| Index node dies on config or storage hiccup | Datomic Jepsen [W] | Transactors killed themselves when the storage connection was unstable; Jepsen ran them under systemd `Restart=on-failure`. | The supervisor must restart a fail-stopped broker automatically, and startup must be safe to repeat. |
| Ingester stops on error | XTDB 1.x [S] | `set-ingester-error!` halts indexing rather than skipping a transaction. | Fail-stop on unexplained apply errors; do not skip frames. |

### 1.4 What we copy and what we reject

- **Copy:** durable append as the decision (XTDB, Datomic, Elasticsearch); idempotent replay from a recorded position (XTDB ingester); checksummed, chained records with preallocated or zero-tolerant tails and directory fsync on create (etcd); truncate-and-back-up on torn tail (etcd `Repair` copies the file to `.broken` first); fail-stop on fsync error (PostgreSQL); backpressure when the index lags (Datomic, and C4.4); position stored inside the checkpoint (KIP-1035).
- **Reject:** lease expiry as the only exclusion (clock and pause problems; Datomic's Jepsen shows the CAS is what makes it safe); replication-based durability (Kafka design text says it avoids fsync because of replicas; we have none); a separate offsets file (KIP-1035); an index store whose durability the log depends on (XTDB 1.x defaults `sync?` to false for the same reason: the log is the truth).

---

## 2. Durable append from Node.js 22

### 2.1 Verdict

1. **On macOS Node already does the strong thing.** libuv 1.51.0 (Node 22.23.2) implements `fs.fsync` and `fs.fdatasync` as `fcntl(F_FULLFSYNC)`, then `F_BARRIERFSYNC`, then plain `fsync` as silent fallbacks (`src/unix/fs.c:170-203 @ libuv v1.51.0`). Measured: Node `fs.fsync` 2.90 ms, Python `fcntl F_FULLFSYNC` 2.92 ms, Python plain `os.fsync` 0.022 ms. [S][P]
2. **`O_DSYNC` and `O_SYNC` are not durable on macOS.** Measured 0.021 to 0.023 ms, the same as plain `fsync`. On Linux ext4 `O_DSYNC` is a real sync (0.6 ms). [P]
3. **Cost is small next to QLever.** One write plus one fsync per commit group is 3 to 25 ms on the host; R8 measures 0.2 to 1.7 s per QLever update. [P][E]
4. **Format.** A frame with a header CRC chained to the previous frame and a payload CRC (CRC32C) detects every torn write I could construct and classifies it correctly. [P]
5. **Silent downgrade risk.** If `F_FULLFSYNC` is unsupported on the volume, libuv falls back without error. The broker must check the filesystem and calibrate latency at startup.

Confidence: High.

### 2.2 Measured latency (1 KiB payload, 1,060-byte frames, 400 records per variant)

Median / p99 in ms and records per second. "Mac" = Node on the host (APFS, `F_FULLFSYNC`). "ext4" = a Docker named volume in the VM (`/dev/vdb1`). "virtiofs" = a bind mount of a macOS directory. Raw: `out/bench-*.json`. [P]

| Variant | Mac (quiet) | VM ext4 | VM virtiofs |
|---------|-------------|---------|-------------|
| append, no sync | 0.002 / 0.02, 67k/s | 0.001 / 0.02, 44k/s | 0.086 / 0.46, 7.4k/s |
| append + `fsync` per record | **2.90 / 3.95, 378/s** | 0.43 / 1.83, 1.7k/s | 0.16 / 1.93, 4.0k/s |
| append + `fdatasync` per record | 2.92 / 3.94, 380/s | 0.45 / 2.65, 1.6k/s | 0.28 / 1.26, 2.8k/s |
| async `filehandle.sync()` per record | 2.94 / 4.01, 379/s | 0.92 / 4.35, 0.9k/s | 0.22 / 0.52, 4.0k/s |
| `O_DSYNC` append, no explicit sync | 0.023 / 0.45, 24k/s (not durable) | 0.60 / 2.01, 1.4k/s | 0.13 / 0.50, 5.9k/s |
| batch of 10 + one `fsync` | 2.98 / 4.03, 3.3k/s | 0.86 / 3.05, 8.7k/s | 0.34 / 2.46, 16k/s |
| **batch of 100 + one `fsync`** | **2.88 / 3.91, 31.8k/s** | 1.25 / 3.89, 45.7k/s | 0.58 / 2.65, 76k/s |
| batch of 100 + `fdatasync` | 2.89 / 3.81, 33.2k/s | 1.16 / 4.44, 45.1k/s | 0.49 / 2.42, 122k/s |
| batch of 1000 + one `fsync` | 4.84 / 10.4, 110k/s | 2.55 / 7.12, 187k/s | 3.94 / 5.12, 159k/s |
| preallocated 64 MiB, `pwrite` + `fdatasync`, per record | 2.97 / 5.47, 344/s | **0.13 / 0.65, 5.9k/s** | 0.13 / 0.34, 6.5k/s |
| preallocated, batch of 100 | 2.86 / 5.82, 32k/s | 0.26 / 0.45, 199k/s | 0.20 / 0.45, 240k/s |
| new segment: create, write header, fsync file, fsync dir | 2.96 / 6.0 | 1.22 / 2.97 | 0.42 / 0.88 |
| atomic replace: write tmp, fsync, rename, fsync dir | 5.85 / 7.11 | 1.74 / 3.97 | 0.70 / 1.12 |

Host primitive comparison, Python, 400 appends of 1 KiB (`out/bench-mac-python-modes.jsonl`) [P]:

| Call | p50 ms | p99 ms |
|------|--------|--------|
| `os.fsync` (plain `fsync(2)`) | 0.022 | 0.048 |
| `F_BARRIERFSYNC` | 0.99 | 4.08 |
| `F_FULLFSYNC` | 2.92 | 6.12 |
| `O_DSYNC` write | 0.021 | 0.050 |
| `O_SYNC` write | 0.023 | 0.061 |

Observations:
- Preallocation helps on Linux (3.4x per record on ext4, because `fdatasync` does not have to commit a size change) and does nothing on macOS, where `fdatasync` is the same call as `fsync`.
- Latency on the host depends on what else is running. Five runs of the same 300-record loop gave p50 of 2.90, 2.94, 3.03, 8.52 and 8.55 ms, with p99 up to 25 ms and a max of 77 ms, while `tx2-probe-r7` and `tx2-probe-r8` were doing I/O (load average 10 to 12). A 13 GB background writer added nothing measurable on top (p50 3.2 ms, p99 11.5 ms). [P] Budget 3 to 10 ms median and 25 ms p99.
- Inside the VM the ext4 tail is worse when other writers share the volume: with a background loop of fsynced 1 GiB `dd` writes, p99 went from 13.7 ms to 93 ms and the max to 229 ms. [P] A log on the same ext4 volume as the QLever index would see QLever's rewrite of `.update-triples` (tens of MB per request) as latency spikes.
- A segment create costs about 3 ms and an atomic replace about 6 ms on the host, so rotation and manifest writes are cheap.

### 2.3 Group commit

The writer loop takes everything queued while the previous fsync ran, writes it as one frame and fsyncs once. Closed-loop clients, 1 KiB commit each, 3 s per row (`out/groupcommit-*.json`) [P]:

| Clients | Mac commits/s, p50 / p99 ms | VM ext4 commits/s, p50 / p99 ms |
|---------|-----------------------------|---------------------------------|
| 1 | 372, 2.97 / 4.4 | 363, 1.74 / 17.4 |
| 16 | 2,303, 5.8 / 29 | 1,306, 5.3 / 150 |
| 64 | 9,815, 6.0 / 19.6 | 14,753, 3.4 / 14.0 |
| 256 | 33,335, 6.9 / 23.4 | 52,180, 4.2 / 12.7 |
| 1024 | 114,740, 7.9 / 22.8 | 102,222, 8.4 / 38.6 |

Implication for Triplex: the commit group size is set by QLever, not by the log. R8 shows the best QLever throughput at 10k to 50k triples per request with 0.2 to 1.7 s of server time, so groups form naturally while the previous update runs. No `commit_delay`-style timer is needed. The decision for group k+1 can be fsynced while group k is still applying, as long as frame k+1 is not written before the fsync of frame k returned.

### 2.4 Record framing and torn-write detection

Reference code: `scripts/wal.mjs` (format), `scripts/durable-log.mjs` (writer with recovery), tests `scripts/wal-test.mjs` and `scripts/recovery-test.mjs`.

```
Segment  := SegmentHeader(32)  Frame*  [zero padding allowed]
SegmentHeader := "TRPLXLG1"(8) | formatVersion u32 | flags u32 | epoch u64 | firstLsn u64        (LE)
Frame := FrameHeader(32)  Payload(payloadLen)  PayloadCrc(4)
FrameHeader := magic u32 'TXLF' | payloadLen u32 | lsn u64 | epoch u32 | prevCrc u32 | kind u16 | flags u16 | headerCrc u32
  headerCrc  = crc32c(header[0..28), seed = prevCrc)        prevCrc = previous frame's PayloadCrc,
  PayloadCrc = crc32c(payload,       seed = headerCrc)      or crc32c(segment header) for the first frame
```

Rules the scanner applies at the first invalid frame (`scanSegment`):

| Situation | Classification | Action |
|-----------|---------------|--------|
| Nothing left, or only zero bytes | clean end | accept |
| Invalid frame and no later byte sequence that looks like a frame header (magic, `lsn` above expected, sane length, fits in file) | torn tail | truncate to the last valid frame, fsync, back up the cut bytes (etcd style), continue |
| Invalid frame and a plausible later header exists | corruption | **refuse to start**; restore from backup or checkpoint |
| Segment header unreadable | bad segment | if it is the newest segment and has no frames, delete and recreate; otherwise refuse |

Why this is sound: the writer never writes frame k+1 before the fsync of frame k returned, so after a crash at most one frame (the in-flight one) can be invalid by tearing, and nothing valid can follow it. A valid frame after an invalid one therefore means damage to an acknowledged frame.

Test results [P] (`out/wal-test.out`, `out/recovery-test.out`):

| Test | Result |
|------|--------|
| CRC32C check value `"123456789"` = `0xE3069283`; CRC32 IEEE = `0xCBF43926`; incremental equals one-shot | pass |
| Truncate a 12-frame segment (sizes 0 B to 64 KiB) at **every** byte offset (72,204 cases) | never "corruption"; frames kept equal the frames fully present; status `clean-end` only at frame boundaries |
| Zero-filled preallocated tail, and a frame whose first 4 KiB page persisted while later pages are zero or missing | `clean-end` / `torn-tail`, preceding frames kept |
| Flip one bit in each of 136 bytes of an interior frame | all 136 classified `corruption`; no frame at or after the damaged one accepted |
| Flip one bit in each of 37 bytes of the **last** frame | all dropped as `torn-tail` (see limit below) |
| Splice a valid frame from another chain into position 3; swap two adjacent frames | rejected (`corruption`) |
| 300 random cuts of real files, recover on open, append, rescan | all 300 end `clean-end` with exactly one more frame |

**Known limit.** Damage to the last frame that was already acknowledged is indistinguishable from a torn write using the file alone. The broker closes this gap with two cross-checks at startup: QLever's published marker position P must not exceed the log's last LSN, and the checkpoint manifest records its own LSN. Either mismatch means "log lost an acknowledged frame" and the broker refuses to start.

### 2.5 CRC32C in Node

Node 22 has `zlib.crc32`, which is CRC32 (IEEE), not CRC32C. Measured on the M3 Pro [P] (`out/crc-bench-mac.jsonl`):

| Implementation | 1 KiB | 64 KiB | 4 MiB |
|----------------|-------|--------|-------|
| CRC32C, JS slicing-by-8 (`wal.mjs`) | 1.2 GB/s (0.84 us) | 1.1 GB/s | 1.2 GB/s |
| `zlib.crc32` (IEEE, native) | 14.4 GB/s | 27.5 GB/s | 29.8 GB/s |

QLever applies 25k to 40k triples per second, which is a few MB/s of text, so 1.2 GB/s is irrelevant to throughput. Use CRC32C (Castagnoli) because its error-detection properties on small records are the reason etcd, RocksDB and Kafka v2 batches use it, and the JS version is fast enough. A native addon with the ARM CRC32C instruction is an optional optimization I did not test.

### 2.6 Other mechanics

- **Open flags.** Open the active segment with `'a'` (`O_APPEND`) after taking the lock and finishing recovery, loop on partial writes (`writeAll` in the scripts), and never pass a position on an append-mode descriptor. For a preallocated segment on Linux use `'r+'` and explicit offsets instead, and do not mix the two.
- **Directory fsync.** `fs.openSync(dir, 'r')` followed by `fs.fsyncSync(fd)` works on macOS APFS and on Linux ext4 and virtiofs (all three ran without error). Required after creating a segment, after every rename, and after deleting a segment you must not see again.
- **Error handling.** On any `write`, `fsync` or `ftruncate` error set a failed flag, reject every pending commit, close nothing else, and exit. Do not retry. On restart the recovery scan decides what survived. (`GroupCommitLog` in `durable-log.mjs` implements the flag.)
- **Capacity.** The host data volume is 90% full (38 GiB free of 460 GiB), and the colima data disk is a 64 GB sparse file with 55 GB allocated. Log plus two checkpoints may reach tens of GB at 100M facts. The broker must refuse to start, or refuse writes, below a free-space floor, because ENOSPC mid-frame is the one torn write you cause yourself.
- **Compression.** `zlib.zstdCompressSync` exists in Node 22.23. Compressing the payload (flag bit 0) keeps the log small; the CRC covers the stored bytes. The N-Triples sample from R2 compressed 12.8x with `zstd -3` (19.9 MB from 255.7 MB, 2.8M triples, synthetic and highly regular), so expect 6x to 13x on real data. [P][E]

---

## 3. What fsync means on this machine

### 3.1 Verdict

1. **The VM disk is attached in cached mode with `Fsync` synchronization.** limactl 2.1.4 (the installed version) and current Lima master both call `NewDiskImageStorageDeviceAttachmentWithCacheAndSync(..., DiskImageCachingModeCached, DiskImageSynchronizationModeFsync)` for the main disk and every additional disk. Neither is configurable in `lima.yaml` or `colima.yaml`; changing it means patching Lima. [S]
2. **Apple documents `Fsync` as best-effort** with "the same guarantees as the `fsync` system call", which does not move data "from the disk's internal cache to permanent storage". `Full` is the mode that "ensures there's no loss of already synchronized data in the case of panic or loss of power". [W]
3. **Measurements agree.** Guest `fsync` costs 0.13 to 1.2 ms. A real `F_FULLFSYNC` on this Mac costs at least 2.9 ms, and an ext4 `fsync` needs a journal commit with one or two flushes, so a full-flush mode would show 6 ms or more. [P][E]
4. **Docker named volumes live on that disk.** `mountinfo` inside a container shows the volume as `/docker/volumes/<name>/_data` on `ext4 /dev/vdb1`. That device is the colima additional disk, a raw sparse file `~/.colima/_lima/_disks/colima-triplex2/datadisk` (64.4 GB, 55 GB allocated). [P]
5. **virtiofs is no stronger.** A macOS directory bind-mounted into a container shows `virtiofs lima-...`. Guest `fsync` on it costs 0.16 ms against 0.086 ms for a write without sync, so it is not an `F_FULLFSYNC`. Timing cannot tell a forwarded `fsync(2)` (0.02 ms on the host plus a round trip) from a no-op that only costs a round trip. Apple does not document what its virtiofs server does with a guest flush (and a Linux FUSE client treats a server that does not implement fsync as success; general knowledge, not verified here). [P][W] Treat virtiofs as "at most plain fsync".

Confidence: High that guest fsync is not a drive-cache flush; Medium that it is a real host `fsync(2)` for the block device; Low for virtiofs beyond "not stronger than plain fsync".

### 3.2 The two paths

```
                    BROKER ON THE MAC HOST                              BROKER OR LOG INSIDE THE VM

  node fs.fsync(fd)                                          node fs.fsync(fd)   (Linux: fsync(2))
        |                                                           |
        v  libuv: fcntl(F_FULLFSYNC)         2.9 ms                 v  ext4 on /dev/vdb1: data + journal commit
  APFS -> internal NVMe, asks the drive                             |  virtio-blk FLUSH             0.13 - 1.2 ms
          to flush its cache                                        v
  [data is on permanent storage]                             Virtualization.framework disk attachment
                                                               caching = Cached, sync = Fsync (Lima, hard-coded)
                                                                    |  host fsync(2) on  ...colima-triplex2/datadisk
                                                                    v
                                                             APFS -> NVMe controller; cache NOT flushed
                                                             [data is "sent to the drive"]

  virtiofs bind mount:  guest fsync -> FUSE fsync -> Apple's host-side server -> unknown   (0.16 ms)
```

### 3.3 Evidence

| Item | Evidence |
|------|----------|
| Host call semantics | `man 2 fsync` on this Mac: `fsync()` moves data from the host to the drive, "the drive itself may not physically write the data ... for quite some time and it may be written in an out-of-order sequence", and power loss can leave "only some or none" of it. `F_FULLFSYNC` "asks the drive to flush all buffered data to permanent storage". [S] |
| Node on the host | libuv `uv__fs_fsync`: `fcntl(F_FULLFSYNC)`, fallback `F_BARRIERFSYNC` (85), fallback `fsync`. `uv__fs_fdatasync` on Apple calls the same function. Node 22.23.2 reports libuv 1.51.0. [S] Measured 2.90 ms. [P] |
| Lima sync mode | `pkg/driver/vz/vm_darwin.go` @ v2.1.4 lines 47, 274, 557, 602 and @ master lines 47, 348, 631, 685. Comment at line 42: the cached mode "avoid[s] disk corruption on ARM". No config field for it in `pkg/limatype/lima_yaml.go`. [S] |
| Apple semantics | `VZDiskImageSynchronizationMode` pages: `fsync`, `full`, `none` (fetched from `developer.apple.com/tutorials/data/documentation/virtualization/...json`, saved in `raw/`). |
| Running VM | `limactl hostagent` PID in `~/.colima/_lima/colima-triplex2/ha.pid`; `lima.yaml` has `vmType: vz`, `mountType: virtiofs`, one additional disk. [P] |
| Guest latency | Tables in 2.2. |
| Bulk write test | 128 MiB then `fsync`: 14 to 37 ms on ext4, 1.4 to 12 ms on virtiofs, similar on the host. Not discriminating, because the SSD absorbs 128 MiB in a few tens of ms either way. Listed only so nobody repeats it. [P] (`out/bulk-*.jsonl`, `out/bulk-vm.log`) |

### 3.4 What ACK durability can we claim

"ACK" means the client receives the commit receipt, which per C2.4 is after publication, so the log frame has been fsynced before it.

| Failure | A: log in the VM (Docker volume, Node in the guest) | B: log on virtiofs bind mount | C: broker and log on the macOS host (`fs.fsync` = `F_FULLFSYNC`) |
|---------|------|------|------|
| Broker process crash or `kill -9` | survives (High) | survives (High) | survives (High) |
| QLever crash, OOM, container restart | survives (High) | survives | survives (High) |
| VM crash, colima restart, VZ process killed, guest kernel panic | survives (Medium: data was handed to host `fsync(2)` before the guest's fsync returned) | survives (Medium, same reasoning) | survives (High: log is not in the VM) |
| VM disk image lost or corrupted (`colima delete`, image damage, ext4 error) | **lost together with the index** | survives (separate failure domain) | survives (separate failure domain) |
| macOS kernel panic or watchdog reset | probably survives (data already given to the drive; Low to Medium) | probably survives | survives to the extent `F_FULLFSYNC` is honored (Medium) |
| Power loss, battery depletion, forced shutdown | **not guaranteed**: the last commits can be lost or reordered, per Apple's description of `Fsync` mode | not guaranteed (behavior unknown) | survives to the extent the SSD obeys `F_FULLFSYNC` (Medium; documented behavior, not testable here) |
| SSD failure, theft, deletion of the directory, FileVault key loss | lost | lost | lost; ship sealed segments and checkpoints off the device |

The machine is a MacBook on AC power (battery 80%), so battery depletion is the main power-loss path; it reduces but does not remove the exposure.

### 3.5 Configuration that strengthens it

| Option | Effect | Cost | Status |
|--------|--------|------|--------|
| **1. Broker process and log on the macOS host** (QLever stays in the VM on a published port) | Node `fs.fsync` is `F_FULLFSYNC`; log leaves the VM failure domain; no dependence on Lima settings | Broker is a host process; QLever token and port forwarding must be handled (colima forwards guest 127.0.0.1 ports to host 127.0.0.1) | Measured (2.9 ms), recommended |
| 2. Build a patched limactl with `DiskImageSynchronizationModeFull` | Guest fsync reaches `F_FULLFSYNC` on the host for every VM disk | Every guest flush becomes about 3 ms or more; ext4 fsync issues one or two flushes; a custom Lima fork to maintain | Untested; not available as configuration |
| 3. Host-side helper calls `F_FULLFSYNC` on the disk image after a guest ack | `fsync` is per file, not per descriptor, so it should flush data the VZ process already wrote | Needs host/guest signaling and sits on the commit path | Hypothesis, Low confidence |
| 4. Second copy of sealed segments and checkpoints off the machine (immutable files, plain `rclone`) | Covers SSD loss | Only the active segment is exposed | Recommended |
| 5. Keep the QLever index on the VM volume and treat it as a cache | QLever's own persistence has no fsync anyway (R2 §1.5) | None | Already the plan |

### 3.6 What I could not determine

- Whether Apple's virtiofs server forwards a guest `FUSE_FSYNC` as `fsync`, `F_FULLFSYNC` or nothing. Latency alone cannot separate "plain fsync" from "no-op".
- Real power-loss behavior of any path. Reproducing it needs a power cut or a fault-injecting filesystem, neither available here.
- Whether the Apple SSD controller flushes on `F_FULLFSYNC` as documented. The 2.9 ms against 0.022 ms gap shows the call does more work than plain fsync, which fits a real flush.

---

## 4. Checkpoint export from QLever 0.6.0 and crash-safe generation switching

### 4.1 Verdict

1. **No graph-preserving export exists in the server.** SELECT exports octet-stream, CSV, TSV, SPARQL XML, SPARQL JSON, QLever JSON; CONSTRUCT exports Turtle, CSV, TSV, N-Triples, QLever JSON (`src/engine/ExportQueryExecutionTrees.h:42-52 @ 6c5861a`). `application/n-quads` is registered as a media type (`src/util/http/MediaTypes.cpp:48`) but only for **input** (`LOAD`, `src/index/InputFileSpecification.cpp:21`). R2 §7.1(4) lists it among result formats; that is a correction. [S] High.
2. **Graph names need SELECT.** `SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }` returns the graph column, with the special `ql:default-graph` IRI for the unnamed graph (`src/index/IndexImpl.h:185`, `src/parser/RdfParser.h:67`). Or run one CONSTRUCT per graph with `Accept: application/n-triples` and append the graph IRI to each line. [S] Medium (query shape not run).
3. **TSV loses datatypes of natively encoded numbers.** `idToStringAndType` returns numbers as a bare string with the XSD type in a separate field, and the TSV writer emits only the string (`src/engine/ExportQueryExecutionTrees.cpp:524-531`; R2 §7.1(5)). Add `(DATATYPE(?o) AS ?dt)` or use QLever JSON. Values are also already normalized by the engine (60-bit integers, 49-bit-mantissa doubles, millisecond dates; R2 §4), so an export is a lossy copy of the log, never an exact one. [S][P]
4. **The better source of a checkpoint is the log.** The log carries the exact lexical forms, does not depend on QLever being healthy, and gives a deterministic quad set at each LSN. Export from QLever stays as an audit (per-graph counts, optional sampled digests). [E] argument, High confidence in the reasoning.
5. **Rebuild path is supported.** `qlever-index -f <file> -F nq` reads N-Quads (graph from the fourth term, default graph for unlabelled lines, `-g <iri>` to set a graph per file, `-p true` for parallel parsing of N-Triples and N-Quads) (`src/index/IndexBuilderMain.cpp:212-232 @ 6c5861a`). Several files can be given, each with its own format and graph. [S]
6. **Directory moves inside QLever are not crash-safe.** The pinned source says so (below). Use our own generation directories and a switch protocol, and model-checked it. [S][P]

### 4.2 Cost at 100M to 1B triples

Inputs: 91 B per triple in the N-Triples sample of the compact layout (255.7 MB for 2,808,098 triples), plus about 22 B for a graph IRI per quad [P][E]; TSV export rate 0.5M rows/s [R2 §7.1(6), P]; `qlever-index` 0.32 to 0.46M triples/s at 2 CPUs and about 1.5x to 2.5x that at 6 CPUs [R2 §6.1, §8]; index size 20 B per triple.

| Triples | N-Quads raw | zstd (6x to 13x) | QLever TSV export at 0.5M rows/s | `qlever-index` from N-Quads, 2 CPUs | Index on disk, 2x to 3x during switch |
|---------|------------|------------------|----------------------------------|-------------------------------------|---------------------------------------|
| 100M | 11 GB | 0.9 to 1.9 GB | 3.3 min | 3.6 to 5.2 min | 2 GB, 4 to 6 GB |
| 820M (P+C at 100M facts) | 93 GB | 7 to 16 GB | 27 min | 30 to 43 min (R2: ~32 min) | 16 GB, 33 to 49 GB |
| 1B | 113 GB | 9 to 19 GB | 33 min | 36 to 52 min | 20 GB, 40 to 60 GB |

All [E], medium-low confidence. Export adds a datatype column and a graph column, so the real export is slower than 0.5M rows/s. Memory is not the limit: R2 measured 145 MB RSS for a streaming TSV export, and build memory is set by `num-triples-per-batch` (R2 §6.1).

Log-fold checkpoint cost is dominated by sequential I/O of the whole quad set plus an external sort of the new suffix: read and write 93 GB raw (7 to 16 GB compressed) at 820M triples, so minutes to tens of minutes on this SSD, no QLever involvement. [E]

**Replay versus rebuild.** Replaying through SPARQL UPDATE runs at about 29k triples/s at best (R8 §3.1); building runs at 0.32 to 0.46M triples/s (R2). For an 820M-triple index the crossover is a log suffix of about 50M triples (replay = rebuild at roughly 29 minutes). Below that, replay onto the existing base index; above it, rebuild from checkpoint plus suffix. A routine recovery after `rebuild-index` has a delta of at most about 1M triples, which replays in 35 to 60 seconds. [E]

### 4.3 Crash-safe generation switching

**QLever's own hazard.** `Qlever::moveRebuiltIndexIntoPlace` first renames every file of the live index into `previous.<date>/`, then every file of the new index into the live names (`src/libqlever/Qlever.cpp:663-713`), and `swapInRebuiltIndex` then swaps in memory (`:783-815`). The comment at `:809-812` says: "If this throws halfway through, the server keeps running consistently on the old index ..., but the on-disk layout has to be repaired manually before the next restart." The window is between the two `moveIndex` calls and inside each (rename is per file). [S]

**Our protocol.** Each generation is a directory containing one complete QLever index and a manifest. A pointer file selects the active one.

```
gens/                                       (on the VM ext4 volume next to the index; or the same layout on the host for checkpoints)
  CURRENT                 text "g000043\n", or a symlink swapped by rename
  g000042/                previous generation, kept
  g000043/                active generation: triplex.index.* , MANIFEST, COMMITTED
  g000044.building/       in progress, ignored by recovery, deleted at start
```

Switch, in order:
1. Build: stream the decompressed checkpoint parts and the folded log suffix into `qlever-index -i gens/g000044.building/triplex -F nq` (stdin, or one `-f` per file).
2. `fsync` every index file; `qlever-index` does not do this itself.
3. Write `MANIFEST` (log position `appliedLsn`, checkpoint id, file list with sizes and SHA-256, per-graph counts, format versions, build parameters), `fsync` it.
4. Write `COMMITTED`, `fsync` it, `fsync` the building directory.
5. `rename(g000044.building, g000044)`, `fsync(gens)`.
6. Write `CURRENT.tmp`, `fsync` it, `rename(CURRENT.tmp, CURRENT)`, `fsync(gens)`. **This is the commit point of the switch.**
7. Stop QLever, start it on `gens/g000044/triplex`, replay the log suffix after `appliedLsn`, publish.
8. Keep the previous generation until the new one has served and verified; then prune beyond two.

The generation directories live on the VM volume, so steps 2 to 6 run on the VM side (a small helper script or sidecar container started through the `triplex2` Docker socket), ordered by the broker. Plain guest `fsync` strength (section 3) is enough there, because a lost or half-written generation costs a rebuild (T2), never data: the log and checkpoints stay on the host.

Recovery rule: read `CURRENT`; accept its target only if `MANIFEST` parses, `COMMITTED` exists and all listed files have the recorded sizes (hash check optional at start, mandatory after a crash); otherwise take the highest generation that passes; delete `*.building`.

**Evidence: crash-state model check** (`scripts/gen-switch-sim.mjs`, `out/gen-switch-sim.out`) [P]. The model keeps an operation log and, for every crash point, lets each operation not covered by a completed fsync (file contents by `fsync(file)`, directory entries by `fsync(dir)`) independently be present or absent. Starting from a durable `g000042`:

| Variant | Crash states | Violations |
|---------|--------------|-----------|
| Correct protocol, recovery by `CURRENT` only | 520 | **0** |
| Correct protocol, `CURRENT` plus fallback scan | 520 | **0** |
| Mutant: skip `fsync` of index data files | 3,495 | 7 (acknowledged switch lost) |
| Mutant: acknowledge before the final `fsync(gens)` | 522 | 2 (acknowledged switch lost) |
| Mutant: no `fsync(gens)` after `building` to `g000044` rename, no fallback | 555 | 6 (no valid generation) |
| Mutant: overwrite `CURRENT` in place (truncate then write), no fallback | 514 | 2 (no valid generation) |
| Mutant: recovery trusts directory existence | 3,495 | 28 (partial generation accepted) |

The model is adversarial about ordering but abstract about the filesystem: it is evidence that the step order is necessary and sufficient under the stated assumptions, not a substitute for a fault-injection run (F05).

**Cheap physical snapshot before QLever's `rebuild-index`.** QLever builds the new index in a fresh `rebuild.<ts>.tmp` directory and only renames files afterwards; the old permutation and vocabulary files are never opened for writing, and the persisted delta file is rewritten by tmp-and-rename (`src/index/DeltaTriples.cpp:648-672`, R2 §1.5). So `cp -al gens/g000042 gens/g000042.pre-rebuild` (hardlinks, same filesystem, near-instant) before calling `rebuild-index` leaves an intact index if the move sequence fails halfway. [S] Medium; untested because no QLever was started. The `rebuild-index` request also accepts `rebuild-tmp-dir` and `rebuild-previous-index-dir` (`references/qlever-control/src/qlever/commands/rebuild_index.py:30-45`), so the broker can choose both names.

---

## 5. Single-writer fencing

### 5.1 Verdict

1. **Layer 1: a kernel advisory lock for the broker's life.** No expiry, no clock. A holder that is paused (`SIGSTOP`, debugger) still holds it, which blocks takeover instead of allowing split-brain. A holder that dies releases it. `flock` was exclusive across containers on both the ext4 volume and the virtiofs bind mount. [P] High.
2. **It is not coherent between host and guest on virtiofs.** A container held `flock` on a file in a bind-mounted macOS directory; a macOS Python process took both `flock` and `lockf` on the same file without blocking. [P] High. Never use a lock on a shared directory as the exclusion between a host process and a VM process.
3. **Layer 2: epoch in the log.** The broker's first frame after taking the lock is `EPOCH_BEGIN(epoch = previous + 1)`, fsynced. Frames carry their epoch; recovery rejects a decreasing epoch. This protects the log from an old writer that somehow ran.
4. **Layer 3: a guard inside every QLever update.** QLever's access token authenticates but does not fence (below). The broker puts the marker in the update's WHERE clause: the update applies only if the stored `(epoch, position)` equals the expected `(E, P-1)`, and writes `(E, P)`. A late update from a stale broker matches nothing and changes nothing. This is the fencing-token pattern: the resource checks the token. [W][S] Medium, because R2 §1.8 argues the guard is evaluated on the single update thread but did not race it.
5. **Layer 4 (heavy): restart QLever with a new token per epoch** when death of the previous broker cannot be proved. Costs a restart (replay of a persisted 1M delta takes seconds: R2 §1.5 measured about 5 us per triple, R8 §3.2).

### 5.2 QLever access tokens

- Set only at startup by `--access-token/-a` (`src/ServerMain.cpp:78`); no runtime change. [S]
- Compared in constant time; accepted as `Authorization: Bearer <token>` or `access-token` parameter, and the two must agree (`src/engine/ParsedRequestBuilder.cpp:177-199`, `Server.cpp:1578-1600`). [S]
- Required for SPARQL Update (`Server.cpp:819-820`), Graph Store writes (`:849`), `rebuild-index`, `clear-delta-triples`, runtime parameters, materialized views, longer timeouts, metrics. Queries need no token. [S]
- **The token is printed at INFO when the server starts**: `Access token for restricted API calls is "<token>"` (`Server.cpp:94`). Anyone who can read the container log has it. [S]
- `--no-access-check/-n` turns all of this off (`ServerMain.cpp:80`), and R2 says the repo's current flags include it. The broker design requires removing it. [S]
- The `qlever-control` helper passes the token as a URL or form parameter, which can end up in access logs; use the `Authorization` header. [S]

### 5.3 Failure modes of each mechanism

| Mechanism | Works for | Fails or misleads when |
|-----------|-----------|------------------------|
| `flock` on a local file (macOS `lockf(1)` wrapper or native addon; Linux `flock(1)` wrapper or addon). Node core has no `flock`. | Broker crash (kernel releases), restart, two brokers on one host. Child processes that inherit the descriptor keep the lock alive after the parent dies, which is a safe failure. macOS `lockf` excluded both a second `lockf` and a Python `flock`/`fcntl` lock (tested). | Different mounts or hosts (virtiofs host versus guest: tested, not coherent); network filesystems; processes that do not call `flock` (advisory only); a paused holder blocks failover until someone kills it (intended). |
| `O_EXCL` lock file with PID | Trivial | Stale after `SIGKILL` or power loss; PID reuse; needs a takeover protocol and a clock |
| Lease with expiry in a file or store | Cross-host failover | Needs clocks; a pause longer than the lease lets two holders write; needs a resource-side token anyway (Kleppmann; Datomic Jepsen) |
| QLever token alone | Keeps clients out | Static, logged, shared by old and new broker; does nothing against a zombie that already holds it |
| Marker guard (epoch, position) in each update | A zombie with a valid token | Must be atomic with the write (single update thread, R2 §1.8, Medium); the broker must read the response's change counts, because a failed guard is HTTP 200 with zero changes; a bug in any one write path that omits the guard bypasses it |
| New token per epoch plus QLever restart | The old broker is locked out at the server | Restart cost; drops the query cache; needs the supervisor to hand the token only to the new broker |
| TCP port bind on 127.0.0.1 as a mutex (alternative to `flock`) | Auto-released on death, host-wide | Only excludes processes that can reach that port number; remember QLever's published port is separate |

### 5.4 Takeover procedure

1. Acquire the lock (blocking with a timeout; if it times out, report the holder's PID from `LOCK` contents and stop; a human or supervisor kills it).
2. Recover the log (section 6.5 steps 1 to 4).
3. Append `EPOCH_BEGIN(E+1)` and fsync.
4. Run the fence: restart QLever if the previous outcome is unknown (new token if the old broker was not proved dead), read the marker.
5. Replay committed frames after the published position, installing `(E+1, P)` in the first update. From this point a late update from epoch E fails its guard.

---

## 6. Recommended log design for the QLever broker

### 6.1 Placement

```
 macOS host (APFS)                                        colima VM (Linux, ext4 volume)
 +---------------------------------------------+          +--------------------------------------+
 | Triplex broker (Node 22, one process)       |  HTTP    | QLever 0.6.0                         |
 |   holds LOCK, epoch, QLever token           +--------->|   -a <token>, no --no-access-check   |
 |   LOG  segments/*.log        (F_FULLFSYNC)  | 127.0.0.1|   index generations gens/gNNNNNN/    |
 |   CHECKPOINTS checkpoints/cp-<lsn>/         |  :port   |   (cache; rebuildable from log)      |
 +---------------------------------------------+          +--------------------------------------+
        off-device copy of sealed segments + checkpoints (immutable files)
```

The log and checkpoints are the only durable copy. QLever's index generations are a rebuildable cache. The broker reaches the VM side (generation switch, QLever restart, new token) through the Docker CLI on the `triplex2` socket or a sidecar helper; nothing durable depends on those steps being fsync-strong.

### 6.2 Record format and payload

- Frame, header, chain and CRC32C as in 2.4 (`formatVersion` in the segment header is part of the profile identity).
- **Frame kinds:** 1 `COMMIT_GROUP`, 2 `EPOCH_BEGIN`, 3 `SEAL` (last frame of a rotated segment: segment frame count and a rolling checksum), 4 `APPLIED_HINT` (lazy, not fsynced on its own: "positions up to LSN n were published and verified"), 5 `CHECKPOINT_MARK`, 6 `BULK_FILE_REF` (a delta stored as an immutable, already-fsynced N-Quads file named by SHA-256, so a bulk import is not written twice).
- **`COMMIT_GROUP` payload** (optionally zstd, flag bit 0): group id and previous position; for each member its command id, actor and durable claims; the resolved delta as sorted `ADD` and `DEL` quad sets with no blank nodes, no read-dependent logic; the marker change `(epoch, position)`; the expected-effects digest used by C2.5 verification (per-graph insert and delete counts plus required absences). Because the delta is plain quads, applying it needs no engine state: `DELETE DATA` and `INSERT DATA` semantics, or the single-operation `DELETE {..} INSERT {..} WHERE { guard }` form of 5.1(4).
- **Idempotence property.** For any LSN j at or below the position m that QLever actually reached, replaying frames j+1..n onto the state at m yields the same final state as replaying them onto the state at j, because the final presence of every quad touched by j+1..n is decided by the last frame touching it, and untouched quads are unchanged. So recovery never needs to know exactly how far QLever got. R8 found the same thing empirically (re-sending converges). Frames must therefore carry no blank nodes, since a blank node label would differ per application.

### 6.3 Fsync policy and group commit

1. One `write` of the whole frame and one `fs.fsync` (a full flush on macOS) per commit group. The fsync return is the decision; no ACK, no QLever call before it.
2. Group formation: everything queued while the previous group was applying, capped by the C4 operation bound (R8 recommends 10k to 50k triples). No timer. Frame k+1 is written only after the fsync of frame k returned. The decision for k+1 may overlap the apply of k; publication and ACK stay in order.
3. `EPOCH_BEGIN`, `SEAL`, segment creation, manifest and pointer writes: fsync file, then directory.
4. `APPLIED_HINT`: appended without its own fsync; it rides the next commit's fsync. A lost hint costs only a longer (still idempotent) replay.
5. Any error from write, fsync, ftruncate or rename: set failed, reject all pending commits, exit non-zero; the supervisor restarts the broker; recovery re-reads the files.
6. Startup self-check: the log directory must be on a local APFS volume (not virtiofs, SMB, tmpfs); run a 50-record calibration and warn or refuse if the median is under about 1 ms on macOS (that would mean `F_FULLFSYNC` is not in effect); check free space.
7. On Linux (if the broker later moves to a server): `fdatasync`, 64 to 256 MiB segments preallocated by writing zeros once and fsyncing, ext4 or xfs on a local disk. Measured benefit 3.4x per record in the VM.
8. Never use `O_DSYNC`, `O_SYNC` or `F_BARRIERFSYNC` for the decision on macOS.

### 6.4 Segment and checkpoint layout

```
triplex-log/                                   (host, 0700, owned by the broker user)
  LOCK                                          flock target; broker writes its PID + epoch for diagnostics
  segments/
    seg-<firstLsn:020d>-e<epoch>.log            128 MiB target; rotate at a frame boundary
    ...                                         sealed segments are immutable (copy off-device)
  checkpoints/
    CURRENT                                     text "cp-<lsn>"; atomic replace
    cp-<lsn>/
      MANIFEST.json                             lsn, epoch, formatVersions, per-graph counts, file list (size, sha256),
                                                claims window (command id -> lsn for the retry horizon), prev checkpoint,
                                                producedBy = "log-fold"
      part-00000.nq.zst ...                     sorted canonical N-Quads, one graph label per line, about 1 GiB per part
      COMMITTED
    cp-<lsn>.building/                          ignored and deleted by recovery
  gens/ (on the VM volume)                      QLever index generations (4.3)
```

Rotation: write `SEAL`, fsync, close; create the next segment with `O_EXCL`, write the header, fsync the file, fsync the directory, then append (about 3 ms on the host). Names carry the first LSN so a directory listing gives the order; a gap in LSNs between adjacent segments is corruption.

Checkpoint (log-fold): stream the previous checkpoint's parts and the net delta of segments in `(cp.lsn, new.lsn]` (external sort of the delta, last-writer-wins per quad, adds minus deletes), merge-join into new sorted parts, fsync parts, write `MANIFEST.json`, fsync, write `COMMITTED`, fsync, fsync directory, rename the building directory, replace `CURRENT`. Verification before the old checkpoint is retired: re-read part hashes and per-graph counts; optionally compare per-graph counts with a `GROUP BY ?g` query on QLever. Trigger: log suffix since the last checkpoint above about 20% of the checkpoint size, or daily, whichever comes first.

Retention: keep the newest verified checkpoint, the one before it, and every segment after the **older** of the two (so a failed newest checkpoint never strands the log). Delete a segment only after the covering checkpoint is `COMMITTED` and verified, and after its off-device copy is confirmed.

### 6.5 Recovery steps

Numbered by cause; each tier falls through to the next only if its check fails.

```
 T0  broker restart, QLever fine        seconds
 T1  QLever outcome unknown or suspect  tens of seconds to minutes
 T2  QLever index files unusable        tens of minutes
 T3  log damaged                        operator decision
```

**Startup (every tier):**
1. Take `LOCK`. If it times out, stop and report the holder.
2. List segments; check LSN continuity between segments.
3. Scan the newest segment with `scanSegment`. Torn tail: back up the cut bytes, truncate, fsync. Corruption or bad header on a non-empty segment: refuse to start (T3). Older segments: scan only the headers and `SEAL` frames; a full scan runs in the background and on demand.
4. Append `EPOCH_BEGIN(E+1)`, fsync. Rebuild the command-id table from the checkpoint claims window plus a scan of the frames after it.

**T0/T1: reconcile QLever with the log**
5. Read QLever's marker `(epoch, P)` in one query (R8: one snapshot, no torn reads). If P is above the log's last LSN, the log lost an acknowledged frame: stop (T3).
6. If QLever is unreachable, restarted or its last request had an unknown outcome (non-200, timeout, connection loss, verification failure): fence, restart QLever (new token if the old broker was not proved dead). Ensure no update is still queued (single update thread; a client disconnect does not cancel an update, R8 S5).
7. Choose the replay start: the latest `APPLIED_HINT` found, else the generation's `appliedLsn`. If you do not trust the persisted delta, stop QLever and delete `<base>.update-triples` (or call `cmd=clear-delta-triples` with the token) so the state equals the immutable base index.
8. Fold frames from the replay start to the log head into net deltas of at most the C4 bound and apply each with the guarded single-operation update; expect HTTP 200 with the expected change counts. Repeat an update until it returns 200 (R8: converges). A change count of zero where changes were expected means the guard failed: another epoch exists, so stop.
9. Verify the complete expected effects and required absences of the last frames (C2.5), publish, lift the fence, resolve lost-ACK retries from the command-id table.

**T2: index unusable** (base files missing or fail size/hash, volume lost, or replay would exceed about 50M triples): build a new generation from the newest verified checkpoint plus the log suffix after it (4.3), switch, then continue at step 5.

**T3: log damaged:** do not guess. Restore the newest checkpoint and sealed segments from the off-device copy, or accept the loss of everything after the last intact frame by an explicit operator action that is itself logged.

### 6.6 Parameters at a glance

| Parameter | Value | Basis |
|-----------|-------|-------|
| fsync per commit group | 1 | 2.3, R8 |
| Expected log latency on the host | 3 to 10 ms median, 25 ms p99 | 2.2 |
| Group size | 10k to 50k triples (C4 bound) | R8 §3.3 |
| Segment size | 128 MiB (64 to 256 MiB acceptable) | etcd uses 64 MB |
| Frame overhead | 36 bytes per group | 2.4 |
| Replay rate | about 29k triples/s | R8 |
| Rebuild crossover | about 50M triples of suffix at 820M-triple index | 4.2 |
| Checkpoint trigger | suffix above 20% of checkpoint size, or daily | choice |
| Retained checkpoints | 2 verified, plus all later segments | choice |

### 6.7 Changes to PLAN v1 contracts

- **C2.1:** "appends a COMMIT record ... and fsyncs it" becomes "appends one frame and calls `fs.fsync` on a host-local APFS file (which is `F_FULLFSYNC`), after the broker has verified the volume type and calibrated latency". Add the frame format version to the profile identity.
- **C2.3:** apply as one **guarded** update whose WHERE clause requires the marker `(epoch, position)` to match and whose response must show the expected change counts.
- **C2.6:** add "re-send of the identical frame until HTTP 200" as the first repair (R8), with restart and clear-and-replay as the fallback; replay from any earlier position is idempotent because frames are pure quad deltas.
- **C2.8:** checkpoints are produced by folding the log; QLever export is an audit only. Manifest includes `producedBy`, claims window, and per-graph counts. Retention as in 6.4.
- **C3.2:** remove `--no-access-check`, set `-a`, send the token only in the `Authorization` header, and treat the token as visible in the QLever container log.
- **C3.3:** name the mechanism: broker-lifetime kernel lock (host `lockf`/`flock`), `EPOCH_BEGIN` frame, marker guard in every update; a new token plus QLever restart when the old broker is not proved dead.
- **C3 (new):** the broker runs on the host; a VM-resident broker cannot claim power-loss durability without a patched Lima.
- **F05 additions:** (a) race two guarded updates from different epochs; (b) rebuild equivalence: apply N frames through UPDATE and separately `qlever-index` the same quads from N-Quads, then compare full dumps (R2 §4: UPDATE wraps integers outside 60 bits, the index builder does not); (c) pre-rebuild hardlink snapshot survives a forced failure between the two `moveIndex` calls; (d) per-graph count and digest audit query cost at 100M facts; (e) kill-at-every-step runs of the generation switch on the real ext4 volume.

---

## 7. The honest durability statement for this machine

**With the recommended deployment** (broker and log on the macOS host, Node's `fs.fsync`, QLever in the VM):

- When the client receives a commit receipt, the commit group's frame was written with `F_FULLFSYNC` to the Mac's internal SSD **before** QLever was touched. This is the only durable copy of the data.
- It survives: a broker crash or `kill -9`; any QLever crash, OOM or restart; any colima VM crash, restart, image corruption or `colima delete`; a macOS kernel panic (Medium confidence); a power cut or battery depletion **to the extent the Apple SSD honors `F_FULLFSYNC`** (Medium: documented by Apple, measured to be a different and slower operation than plain `fsync`, not testable here).
- It does not survive: loss or failure of the SSD, deletion of the log directory, or theft. Sealed segments and checkpoints are immutable and should be copied off the machine; only the active segment is exposed between copies.
- A frame that was being written at the moment of a crash is discarded on restart. The client got no receipt for it, so the loss is not an acknowledged loss. Damage to an already acknowledged frame is detected only if it is not the last frame or if QLever's marker or a checkpoint proves it; otherwise the last frame is indistinguishable from a torn write.

**If the log stayed in the VM** (Docker volume or virtiofs): process crash and VM crash are survived; **power-loss durability is not guaranteed**, because Lima attaches the VM disk with `Fsync` synchronization, which Apple documents as not flushing the drive cache, and virtiofs behavior is undocumented. The log would also share a failure domain with the QLever volume it exists to protect.

**What strengthens it, in order:** keep the broker and log on the host (done by design); copy sealed segments and checkpoints off the device; for any VM-resident log, patch Lima to `DiskImageSynchronizationModeFull` (unverified); run the F05 kill and corruption suites on the real stack.

---

## 8. Open questions and falsifiers

1. Does Apple's virtiofs server forward a guest `fsync`? (Only matters if anything durable lives on a virtiofs mount; the design avoids it.)
2. Is the marker guard in the update atomic under a race of two writers? Needs a QLever container; R2 §1.8 argues yes from source.
3. Does `qlever-index -F nq` produce a byte-for-byte equal term set to the UPDATE path for every literal the projection can emit? (F05 item b.)
4. Per-graph `COUNT` audit cost at 820M triples on 6 CPUs and 12 GiB.
5. `cp -al` pre-rebuild snapshot: does QLever ever write into an existing index file during `rebuild-index` (only append-only logs expected)?
6. Real power-loss test: a second Mac, or `LazyFS`-style fault injection in a Linux VM, to validate the frame scanner against the filesystem's actual post-crash states instead of the model.
7. A native `flock` helper for Node versus the `lockf`/`flock` command wrapper: which survives supervisor restarts cleanly.

---

## Appendix A: files

| Path | Content |
|------|---------|
| `R13-log-durability/scripts/wal.mjs` | CRC32C (slicing-by-8), frame encoder, chain, `scanSegment` |
| `.../scripts/wal-test.mjs`, `recovery-test.mjs` | Torn-write and corruption property tests; real-file recovery trials |
| `.../scripts/durable-log.mjs` | Group-commit log writer with recovery on open and fail-closed errors |
| `.../scripts/fsync-bench.mjs`, `fsync-modes.py`, `group-commit-bench.mjs`, `fsync-under-load.mjs`, `bgwriter.py`, `bulk-fsync.{mjs,py}`, `crc-bench.mjs` | Benchmarks |
| `.../scripts/gen-switch-sim.mjs` | Crash-state model of the generation switch with mutants |
| `.../scripts/vm-run.sh` | In-VM runs (profile `triplex2` only) |
| `.../out/` | All raw results cited above |
| `.../raw/` | Fetched upstream files: libuv `fs.c`, Lima `vm_darwin.go` (v2.1.4 and master), Apple `VZDiskImage*` JSON, XTDB 1.x source files, etcd WAL source, Kafka docs, JDK `FileDispatcherImpl.c` |

## Appendix B: sources

Web (all fetched without authentication):
- Apple, `VZDiskImageSynchronizationMode` (`fsync`, `full`, `none`) and `VZDiskImageCachingMode`: https://developer.apple.com/documentation/virtualization/vzdiskimagesynchronizationmode
- Lima vz driver: https://github.com/lima-vm/lima/blob/v2.1.4/pkg/driver/vz/vm_darwin.go
- libuv: https://github.com/libuv/libuv/blob/v1.51.0/src/unix/fs.c
- Jepsen, NATS 2.12.1: https://jepsen.io/analyses/nats-2.12.1
- Jepsen, Datomic Pro 1.0.7075: https://jepsen.io/analyses/datomic-pro-1.0.7075
- Datomic HA: https://docs.datomic.com/operation/ha.html; background indexing: https://docs.datomic.com/indexes/background-indexing.html; forum on durable log before ack: https://forum.datomic.com/t/architecture-transactor-persistent-durable-tree/1556/2
- Kafka design (replication instead of fsync, `transactional.id`): https://github.com/apache/kafka/blob/trunk/docs/design/design.md; Streams architecture: https://github.com/apache/kafka/blob/trunk/docs/streams/architecture.md; KIP-98: https://cwiki.apache.org/confluence/display/KAFKA/KIP-98+-+Exactly+Once+Delivery+and+Transactional+Messaging; KIP-1035: https://cwiki.apache.org/confluence/display/KAFKA/KIP-1035%3A+StateStore+managed+changelog+offsets
- Redpanda on fsync: https://www.redpanda.com/blog/why-fsync-is-needed-for-data-safety-in-kafka-or-non-byzantine-protocols
- Elasticsearch translog: https://www.elastic.co/docs/reference/elasticsearch/index-settings/translog
- PostgreSQL WAL settings: https://www.postgresql.org/docs/current/runtime-config-wal.html; fsync errors: https://wiki.postgresql.org/wiki/Fsync_Errors
- Rebello et al., ATC 2020: https://www.usenix.org/conference/atc20/presentation/rebello; Pillai et al., OSDI 2014: https://www.usenix.org/conference/osdi14/technical-sessions/presentation/pillai
- RocksDB WAL recovery modes: https://github.com/facebook/rocksdb/wiki/WAL-Recovery-Modes
- Kleppmann on fencing tokens: https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
- SQLite `PRAGMA fullfsync`: https://www.sqlite.org/pragma.html#pragma_fullfsync
- XTDB 1.x (branch `1.x`): https://github.com/xtdb/xtdb/tree/1.x ; etcd WAL: https://github.com/etcd-io/etcd/tree/main/server/storage/wal ; JDK macOS `force`: https://github.com/openjdk/jdk/blob/master/src/java.base/macosx/native/libnio/ch/FileDispatcherImpl.c

Local source: `references/qlever` @ 6c5861a (`src/libqlever/Qlever.cpp`, `src/engine/Server.cpp`, `src/engine/ParsedRequestBuilder.cpp`, `src/engine/ExportQueryExecutionTrees.{h,cpp}`, `src/index/ExportIds.h`, `src/index/IndexBuilderMain.cpp`, `src/index/InputFileSpecification.cpp`, `src/util/http/MediaTypes.cpp`), `references/qlever-control`, `references/xtdb` (2.2.0, `LocalLog.kt`), `lab/research/R2-qlever-capabilities.md`, `lab/research/R8-qlever-write-lifecycle.md` (draft read 2026-11-07).

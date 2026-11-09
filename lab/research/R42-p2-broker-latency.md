# R42: how the Node.js commit broker reaches P2 on one host

Researcher: R42 (Opus 5.5, high). Date: 2026-11-09. Read-only on code; the only file written is this one. No engine, Docker, slot or
product code was touched. Goals and targets come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

North star: P2. Bar (TARGETS section 1 and 1.1): offer-to-ACK p50 <= 10 ms and p99 <= 50 ms for the 5-to-10 and 11-to-25 fact bands,
with P1's 256 readers running; the ACK is sent only after the commit is durable and readable; duplicates and lost ACKs return the
original receipt. P1 adds a second writer bar that matters here: at 256 readers, writer commit p99 <= 1.25x its zero-reader baseline.

## 1. Summary

| Question | Answer |
| --- | --- |
| Why P2B round 1 (45.94 / 82.45 ms) and P2Q round 2 (5.9 ms) differ | They measure different intervals under different load. 5.9 ms is P2Q's source-durable-to-consumer **feed lag**; P2Q's own offer-to-ACK in that run was p50 7.1 / p99 32.8 ms with **zero readers**. P2B round 1 ran 256 reader loops **on the broker's event loop**. The SQLite store adds about 1 ms per commit over P2Q's segment log, not 40 ms. Section 3. |
| What the floor is on this Mac | The F_FULLFSYNC that makes a commit durable: SQLite WAL commit with `synchronous=FULL` + `fullfsync=ON` measured p50 3.4 to 4.0 ms, p99 7.4 to 8.3 ms in isolation (section 5.3). Everything else in the broker adds about 2.5 to 3 ms at p50. |
| Can the bar be met | Yes at p50 already: the builder's round 2 measured 6.68 to 7.32 ms p50 at 256 readers once readers moved to a worker thread. p99 is not stable yet: 21.90 ms in one matrix and 55.42 ms in the next, both at 256 readers in a worker. The tail comes from work still on the broker's main thread and from device-wide F_FULLFSYNC noise. |
| Does SQL01's durability claim hold on macOS | Yes for the code as written: WAL + `synchronous=FULL` + `fullfsync=ON` issues F_FULLFSYNC on every commit (measured 3.4 to 4.0 ms against 0.1 ms with `fullfsync=OFF`), using better-sqlite3's bundled upstream SQLite 3.53.1, not Apple's patched build. Two gaps: `requireFullFsync` defaults to false and the engine factories never set it, and no power-loss test has been run. Section 4. |
| Does the store block the event loop during commit | Not the commit itself: better-sqlite3 is synchronous but runs in a dedicated writer worker, and `append` is an async MessageChannel request. Several other calls do block the main thread with `Atomics.wait`, and the harness's feed consumer runs a synchronous F_FULLFSYNC on the main thread for every feed page. Section 6. |
| Top recommendation for round 3 | Make the broker's main thread commit-only: move the feed consumer and the overlay/source read service off it, and give readers their own SQLite connections. Section 7. |

## 2. Sources read

| Source | What it gave |
| --- | --- |
| `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` sections 1, 1.1, 2, 2.1 | bars, open-loop offer semantics, trace rate (steady 15 facts/s; bursts of 750 facts/s for 60 s every 10 minutes), P1's 1.25x writer bar |
| `.claude/worktrees/p2b/lab/experiments/EXP-P2B/REPORT.md` and `measure.mjs` | round 1 numbers; 256 reader loops in the same event loop as the broker (`measure.mjs` lines 237-252) |
| `.claude/worktrees/p2b/lab/experiments/EXP-P2B/REPORT-round2.md`, `round2/case.mjs`, `round2/run.mjs` and the evidence in `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round2/` | the builder's in-progress stage split and placement matrix (read, not rerun) |
| `.claude/worktrees/p2b/packages/broker/src/{log.ts,sqlite-worker.ts,broker.ts,feed.ts}` | the actual store, pragmas, threading and decision loop |
| `.claude/worktrees/agent-a56ab43df1f0e0ef7/lab/experiments/EXP-P2Q-qlever-log-broker/REPORT-round2.md`, `git show 957e3a36:packages/qlever/src/broker/log.ts` and `bench/run.mjs`, receipt `CX-P2Q-R2/957e3a3/P2Q-trace-C-offline-20261108T214322Z-7d9860.json` | what P2Q's 5.9 ms is and the store it ran on |
| `.claude/worktrees/int-q/lab/experiments/EXP-SQL01/REPORT.md`, `REPORT-round2.md` | SQL01 design, durability tests, earlier commit latency with and without readers |
| `lab/research/R39-lane-x-p2.md` | why native XTDB is closed for P2 and why the broker is the path |
| Web sources linked inline in sections 4 and 5 | SQLite, libuv, Node, Apple and Linux fsync behaviour |
| My own probes (section 5.3, scripts in the appendix) | isolated SQLite commit cost by sync setting, raw fsync, worker and process round trips, event-loop delay under synthetic reader load |

## 3. Why P2B round 1 and P2Q round 2 differ

### 3.1 Side by side

| Factor | P2B round 1 (memory diagnostic) | P2Q round 2 (offline trace) |
| --- | --- | --- |
| Interval behind the headline number | scheduled offer to published ACK: p50 45.94, p99 82.45 ms (5-to-10 band, n = 9) | source durability to durable consumer record (P3 lag): p50 5.9, p99 23.6 ms |
| Offer-to-ACK in the same run | the headline number above | p50 7.1, p99 32.8 ms (all bands, n = 28); 5-to-10 band p50 7.0, p99 32.8 ms |
| Concurrent readers | 256 async loops in the broker's own event loop, each running a read, an answer check and `sleep(1)`; 194,153 reads in 10 s | none ("no burst, resend, actual lost ACK or P1-reader phase") |
| Log store | SQLite (SQL01): WAL, `synchronous=FULL`, `fullfsync=ON`, one transaction writes frame, receipts, claims, heads, rows and marker | append-only segment file plus `FileHandle.sync()` (libuv F_FULLFSYNC), fsync calibration 2.94 ms |
| Replica | in-memory replica applied on the same thread | QLever, updated asynchronously by the applier |
| Sample size | 9 commits in the band; p99 is the maximum | 28 commits; p99 is the maximum |

### 3.2 What explains the gap

1. **The 5.9 ms is not an ACK latency.** P2Q's comparable figure is 7.1 ms p50, which is within 1 ms of the builder's round 2
   zero-reader cells (7.75 to 8.27 ms p50).
2. **Reader placement explains almost all of round 1's 46 ms.** The builder's round 2 matrix (600 commands per cell, 200 per band, 20
   offers/s) isolates it:

| Cell (10-fact band) | Offer-to-ACK p50 / p99 ms | Commit+F_FULLFSYNC envelope p50 / p99 ms | Scheduling p99 | Queue p99 | Durable-to-host p99 | Reads | Read p50 / p99 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| before, local, 0 readers | 8.27 / 23.90 | 4.56 / 15.96 | 2.7 | 0.0 | 4.2 | 0 | n/a |
| before, local, 256 | 227.53 / 607.03 | 5.38 / 24.49 | 228.7 | 184.2 | 194.6 | 144,602 | 13.3 / 112.2 |
| before, worker, 0 | 7.75 to 8.03 / 14.81 to 24.18 | 4.46 to 4.93 / 8.06 to 14.55 | 2.1 to 2.6 | 0.1 to 0.2 | 4.0 | 0 | n/a |
| before, worker, 16 | 7.31 / 14.09 | 4.32 / 9.43 | 2.5 | 0.0 | 2.1 | 111,201 | 0.14 / 3.60 |
| before, worker, 256 | 6.68 / 21.90 | 4.51 / 9.30 | 3.6 | 0.0 | 7.2 | 189,123 | 0.10 / 84.13 |
| after, worker, 0 | 7.81 / 20.95 | 4.21 / 7.16 | 5.1 | 0.1 | 0.2 | 0 | n/a |
| after, worker, 16 | 7.88 / 22.13 | 4.78 / 16.09 | 2.5 | 0.0 | 0.6 | 112,210 | 0.14 / 3.90 |
| after, worker, 256 | 7.32 / 55.42 | 4.36 / 22.54 | 18.4 | 0.6 | 20.8 | 185,422 | 0.10 / 89.51 |
| after, local, 256 | 226.38 / 712.45 | 6.39 / 34.06 | 312.9 | 192.3 | 194.1 | 129,081 | 19.0 / 133.2 |

   With readers on the broker's thread, every commit continuation (offer timer, queue entry, append callback) waits behind a full round
   of reader turns. A simple model matches: local-256 spent 19.1 s of reader-scan CPU over 129,081 reads (about 148 us per read plus
   about 9 us of answer check), so one round of 256 readers costs about 40 ms of main-thread time. Round 1's p50 of 46 ms sits on that
   line. My synthetic probe (section 5.3) shows the same shape: a `setTimeout(0)` continuation took 1.28 ms on an idle loop, 2.08 ms with
   16 loops doing 50 us each, and 14.2 ms with 256 such loops.
3. **SQLite costs about 1 ms more per commit than P2Q's segment.** Isolated, a 4 KiB append plus libuv F_FULLFSYNC measured 3.0 to 3.1 ms
   p50, and a 10-row SQLite WAL commit with F_FULLFSYNC 3.4 to 4.0 ms p50 (section 5.3). Inside the broker, the commit envelope is 4.2 to
   4.9 ms p50. This is a real but small cost and does not explain round 1.
4. **fsync settings do not explain it either.** Both stores use F_FULLFSYNC on every commit. Neither runs a cheaper, non-durable sync.

## 4. SQLite commit cost and durability

### 4.1 What the settings mean

| Setting | Syncs per commit in WAL mode | Durable across power loss | Source |
| --- | --- | --- | --- |
| `synchronous=NORMAL` | none; only checkpoints sync | no: "A transaction committed in WAL mode with synchronous=NORMAL might roll back following a power loss or system crash" | [SQLite PRAGMA](https://www.sqlite.org/pragma.html#pragma_synchronous), [SQLite WAL](https://www.sqlite.org/wal.html) |
| `synchronous=FULL` | one sync of the WAL after each commit | yes, if the sync reaches stable storage | same |
| `synchronous=EXTRA` | same as FULL in WAL mode | same as FULL | same |
| `fullfsync=ON` | makes every SQLite sync use F_FULLFSYNC on macOS; `checkpoint_fullfsync` is then irrelevant | needed on macOS for FULL to mean durable | [SQLite PRAGMA](https://www.sqlite.org/pragma.html#pragma_fullfsync) |

On macOS, `fsync()` sends data to the drive but does not ask the drive to flush its write cache; F_FULLFSYNC does. libuv's
`uv__fs_fsync` says so in its comment and calls `fcntl(F_FULLFSYNC)` first, falling back to F_BARRIERFSYNC and then `fsync`; its
`fdatasync` on Apple calls the same function ([libuv src/unix/fs.c](https://github.com/libuv/libuv/blob/v1.x/src/unix/fs.c)). So Node's
`fs.fsyncSync` and `fs.fdatasyncSync` are already full flushes on macOS, which matches the 3.0 ms raw figure in section 5.3.
F_BARRIERFSYNC only orders writes and returns before data is stable; Apple suggests it for apps that do not need persistence
guarantees ([Michael Tsai's summary of the 2022 discussion](https://mjtsai.com/blog/2022/02/17/apple-ssd-benchmarks-and-f_fullsync)).
Apple's own bundled SQLite maps `PRAGMA fullfsync=on` to F_BARRIERFSYNC, so it is not durable even with the pragma
([BonsaiDb, "SQLite on macOS: Not ACID compliant with the bundled version"](https://bonsaidb.io/blog/acid-on-apple/)).

### 4.2 What SQL01 sets (`packages/broker/src/sqlite-worker.ts`)

1. Writer and checkpointer connections: `synchronous=FULL`, `fullfsync=ON`, `checkpoint_fullfsync=ON`, `wal_autocheckpoint=0`,
   `journal_size_limit=16777216`, `journal_mode=WAL` (lines 22-25, 50-53). Readers open read-only and also set `fullfsync`.
2. One `db.transaction(...).immediate()` per commit group inserts the frame, operation receipts, claims, subject heads, recent/live/retired
   rows and the marker (lines 116-144). `BEGIN IMMEDIATE` takes the writer lock before the marker read.
3. Startup calibration times 12 durable inserts and, only when `requireFullFsync` is set and the platform is darwin, refuses a median
   under 1 ms (lines 35-40, 53-54).
4. A separate checkpointer runs PASSIVE every 4 s and a gated RESTART when the WAL exceeds 64 MiB (lines 76-115).
5. After commit the host writes a 32-byte `ACKED` sidecar with `writeFileSync` and `renameSync`, without fsync; SQL01 calls it a
   corruption witness, not a second log (lines 182-186; SQL01 REPORT line 15).
6. SQLite version is enforced at >= 3.51.3; the bundled version in better-sqlite3 12.10.0 is 3.53.1 (my probe).

### 4.3 Does the durability claim hold on macOS

| Check | Verdict | Evidence |
| --- | --- | --- |
| Every commit syncs the WAL with F_FULLFSYNC | holds | `synchronous=FULL` + `fullfsync=ON`; measured 3.4 to 4.0 ms p50 per 10-row commit against 0.10 to 0.12 ms with `fullfsync=OFF` and 0.06 ms with NORMAL (section 5.3). A plain fsync could not take 3 to 4 ms on this SSD. |
| The SQLite build honours the pragma | holds | better-sqlite3 bundles upstream SQLite 3.53.1, whose unix VFS calls `fcntl(F_FULLFSYNC)` (BonsaiDb's reading of `os_unix.c`); Apple's patched system library is not loaded. |
| ACK only after durability | holds | `broker.ts` resolves ACKs after `log.append` returns, which returns after `COMMIT` (lines 573-616). |
| Atomic per member and idempotent | holds | one SQLite transaction per group; a failed group fail-stops the broker and every member gets outcome-unknown; duplicates resolve through the `operations` table (lines 481-497). |
| Refuses a volume where F_FULLFSYNC silently degrades | **gap** | `requireFullFsync` defaults to false; `packages/xtdb/src` and `packages/qlever/src` never set it, so an `XTDB_COMMIT_PATH=broker` run on a volume without F_FULLFSYNC (network or virtiofs mounts) would fall back to `fsync` with no refusal. On Linux there is no check at all. |
| Power loss | **unqualified** | SQL01's 50 SIGKILLs keep the host and device caches alive; SQL01 round 2 says no power cut or VFS fault injection was done. Russ Bishop found that two of four NVMe drives he tested lost data that had already been flushed with F_FULLFSYNC when power was cut ([Tsai](https://mjtsai.com/blog/2022/02/17/apple-ssd-benchmarks-and-f_fullsync)), so durability ultimately depends on the drive honouring flushes. |
| ACKED sidecar | acceptable by design | no fsync and no directory fsync after rename, so after a power cut it can name an older LSN. That weakens the witness but cannot produce a false refusal, because it is only checked as "this LSN must exist with this CRC". |

### 4.4 Typical commit and flush latency by platform

| Platform | Flush primitive | Typical latency | Source |
| --- | --- | --- | --- |
| This host (Apple M3 Pro, internal APFS SSD) | libuv F_FULLFSYNC after 4 KiB append | p50 3.0 to 3.1, p99 6.1 to 7.5 ms | section 5.3 |
| This host | SQLite WAL commit, FULL + fullfsync, 10 rows | p50 3.4 to 4.0, p99 7.4 to 8.3 ms | section 5.3 |
| This host | SQLite WAL commit, FULL, fullfsync OFF (not durable) | p50 0.10 to 0.12 ms | section 5.3 |
| This host | SQLite WAL commit, NORMAL (not durable) | p50 0.06 ms | section 5.3 |
| Earlier lab measurement, this host | segment F_FULLFSYNC | 2.9 ms per append | P2Q `log.ts` header, R13 |
| M1 Pro, internal APFS | acknowledged WAL write with F_FULLFSYNC | about 3.9 ms (65 us before the switch) | [chunkdb PR 54](https://github.com/chunkdb/chunkdb/pull/54) |
| MacBook Air M1 | single-threaded rewrite with F_FULLFSYNC | 46 IOPS (about 22 ms each) against 40,000 without; second-hand report, attribution unverified | [Phoronix forum thread](https://www.phoronix.com/forums/forum/software/bsd-mac-os-x-hurd-others/1309928-turns-out-macos-has-been-benchmark-cheating-in-writes-by-not-doing-proper-fsync) |
| Linux ext4, Samsung 990 Pro (consumer, no power-loss protection) | fsync / fdatasync after 16 KB write | 2,974 / 2,783 us | [Small Datum, 2026-01-07](https://smalldatum.blogspot.com/2026/01/ssds-power-loss-protection-and-fsync.html) |
| Linux ext4, Crucial T500 | fsync / fdatasync | 891 / 447 us | same |
| Linux ext4, Intel D7-P5520 (power-loss protection) | fsync / fdatasync | 12.4 / 9.8 us | same |
| Linux ext4, Samsung PM9a3 (power-loss protection) | fsync / fdatasync | 1.6 / 0.7 us | same |
| GCP local NVMe, ext4 | fsync / fdatasync | 56.2 / 28.1 us | same |

The macOS floor of about 4 ms p50 leaves about 6 ms of the 10 ms p50 budget for everything else. On a Linux server with a
power-loss-protected NVMe drive the same commit would cost well under 1 ms, so a design that passes on this Mac passes there with room.

### 4.5 Group commit and batching that keep per-subject atomicity

1. **The broker already group-commits** (`broker.ts` lines 15-17, 442-563): everything queued while the previous append ran forms the next
   group, capped at 64 commands and 1,024 ordinals, with no timer. Each member is validated against the staged prefix of its own group, so
   per-subject compare-and-set still serialises within a group, and the whole group is one SQLite transaction.
2. **Batching is nearly free in bytes:** a 640-row SQLite commit measured p50 4.4 to 4.9 ms against 3.4 to 4.0 ms for 10 rows (section
   5.3). The flush dominates.
3. **Batching does not lower latency at this trace rate.** Steady load is about 15 facts/s, roughly one command per second; a burst is
   about 55 commands/s. With a 4 to 5 ms commit, about 0.25 commands arrive per commit window in a burst, so most groups have one member.
   Grouping protects burst p99 and throughput; it does not shorten a single commit.
4. **Do not add a linger timer.** Waiting to collect members adds its whole wait to p50 for no throughput the trace needs.
5. **Pipelining two groups is not possible inside one SQLite database:** the writer lock is held through `COMMIT` and its sync. The only
   way to overlap flushes would be a separate log file of record with SQLite as an index fed at `synchronous=NORMAL`. That saves about
   1 ms (3.0 against 4.0 ms), brings back the segment-replay design SQL01 rejected for outage pulls, and adds a recovery path. Not worth it.
6. **Blast radius:** a failure inside a group transaction fail-stops all of its members as outcome-unknown, which lost-ACK resolution then
   settles. This keeps atomicity; it only widens how many commands one fault touches.

## 5. Event-loop contention and placement

### 5.1 What the evidence says

1. Node's documentation: workers "are useful for performing CPU-intensive JavaScript operations. They do not help much with I/O-intensive
   work" ([Node worker_threads](https://nodejs.org/api/worker_threads.html)). Reader scans and answer checks in this harness are CPU work,
   so they belong in workers; pgwire I/O against a live engine does not need a worker but its decode and hydration CPU does compete.
2. Messages are structured-cloned at `postMessage` time; `SharedArrayBuffer` contents are shared, not copied
   ([Node worker_threads](https://nodejs.org/api/worker_threads.html)). That makes a SharedArrayBuffer the cheap channel for a watermark and
   messages the right channel for row payloads.
3. better-sqlite3 runs on whatever thread calls it and suggests worker threads for slow queries
   ([better-sqlite3 threads.md](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/threads.md)). `node:sqlite` is also fully
   synchronous ("All APIs exposed by this class execute synchronously"; [Node sqlite](https://nodejs.org/api/sqlite.html)), so switching
   drivers would not remove the need for a writer worker.

### 5.2 Placement options

| Placement | Cost per hop (measured here) | Effect on the commit path | Notes |
| --- | --- | --- | --- |
| Readers in the broker's event loop | none | every continuation waits a full reader round: 227 ms p50 at 256 readers | rejected by the builder's round 2 |
| Readers in one worker thread | async MessageChannel round trip 17 to 25 us p50, 42 to 117 us p99 | p50 7 ms; p99 21.9 or 55.4 ms because overlay reads still come back to the main thread | one worker is ~77% busy in scans (22.7 s scan CPU in a 30 s cell) and its read p99 is 84 to 90 ms, close to P1's 100 ms bar |
| Reader pool of N worker threads | same | removes reader CPU from the broker thread if overlay reads are served inside the workers | each worker needs its own replica copy or direct SQLite access |
| Separate reader process over a Unix socket or fork IPC | Unix socket 13 us p50, 103 us p99; fork IPC 19 us p50, 117 us p99 (551-byte payload) | the broker process sees only commit traffic | the shape a production reader service would have; SQLite WAL allows readers in other processes on a local disk |
| SharedArrayBuffer watermark | an `Atomics.load` | lets readers check freshness without asking the broker | already used for the checkpoint gate; cannot carry row data |
| Synchronous worker RPC with `Atomics.wait` | 15 to 33 us p50 when the target is idle | blocks the caller's whole event loop until the target answers, which can be a full fsync if the target is mid-commit | used by several broker paths (section 6) |

The hop itself is negligible: about 0.02 ms against a 10 ms budget. What matters is which thread does the work.

### 5.3 My probes (this host, 2026-11-09, Node 22.23.2, better-sqlite3 12.10.0 / SQLite 3.53.1, load average 4.4 to 5.3 on 12 cores)

These are small isolated probes on a shared host. They do not repeat the builder's stage split or reader matrix.

| Probe | n | p50 ms | p99 ms | max ms |
| --- | --- | --- | --- | --- |
| SQLite WAL commit, FULL + fullfsync, 10 rows of 300 B (run 1 / run 2) | 200 / 300 | 3.98 / 3.97 | 8.13 / 8.30 | 8.80 / 9.93 |
| same, 640 rows | 200 / 300 | 4.91 / 4.37 | 11.10 / 12.96 | 11.95 / 18.08 |
| SQLite WAL commit, FULL, fullfsync OFF | 200 / 300 | 0.10 / 0.12 | 0.36 / 2.32 | 9.21 / 2.96 |
| SQLite WAL commit, NORMAL | 200 / 300 | 0.06 / 0.06 | 0.15 / 0.12 | 0.50 / 0.81 |
| `fs.fsyncSync` after 4 KiB append (libuv F_FULLFSYNC) | 200 / 300 | 3.12 / 3.04 | 7.51 / 7.38 | 8.25 / 7.44 |
| `fs.fdatasyncSync` after 4 KiB append | 200 / 300 | 3.12 / 2.96 | 7.28 / 6.15 | 7.47 / 8.46 |
| SQLite FULL + fullfsync with no other flusher (2 runs) | 250 | 3.38 / 3.46 | 7.36 / 7.43 | 9.22 / 8.39 |
| same, another thread F_FULLFSYNCs a second file every 10 ms | 250 | 3.56 / 3.35 | 10.67 / 7.31 | 32.90 / 9.77 |
| same, another thread F_FULLFSYNCs a second file back to back | 250 | 5.45 / 3.54 | 11.78 / 8.58 | 14.46 / 10.22 |
| main-to-worker async MessageChannel round trip, 10 rows | 3,000 | 0.024 | 0.042 | 0.14 |
| main-to-worker sync `Atomics.wait` round trip, 10 rows | 3,000 | 0.032 | 0.044 | 1.21 |
| `ACKED` sidecar `writeFileSync` + `renameSync` | 2,000 | 0.12 | 0.36 | 0.72 |
| `setTimeout(0)` continuation, idle loop | 300 | 1.28 | 1.35 | 2.03 |
| same, 16 loops each burning 50 us per turn | 300 | 2.08 | 2.15 to 2.26 | 2.99 |
| same, 256 such loops | 300 | 14.21 | 14.80 to 16.31 | 17.50 |

What this adds:

1. F_FULLFSYNC is the floor (about 3 ms raw, 3.4 to 4.0 ms through SQLite); the SQLite transaction body and B-tree work add under 1 ms.
2. A second F_FULLFSYNC stream on the same device inflates commit latency, but only mildly and noisily (one run moved p50 from 3.4 to
   5.5 ms, the repeat did not). F_FULLFSYNC flushes the whole drive cache, so other agents' I/O on this host also lands in the commit tail.
3. Thread hops are not the problem; queueing behind other JavaScript on the same thread is.

## 6. Which API the store uses and what blocks

| Path | API | Thread that blocks | Severity |
| --- | --- | --- | --- |
| Commit (`HostLog.append`) | better-sqlite3 `db.transaction(...).immediate()` in the writer worker; host calls `Connection.request` (async MessageChannel) | writer worker only | fine: the commit never blocks the main thread |
| Decision checks: `log.operation`, `log.claim`, `log.head` per command (`broker.ts` lines 481, 675, 682) | `Connection.sync`: `postMessage` then `Atomics.wait` loop with `receiveMessageOnPort` (`log.ts` lines 111-131) | main thread, about 15 to 33 us each | low: the writer is idle while the decision runs, because `pump` awaits each append before deciding the next group |
| Publication: `publishWatermark` (`ack` op: ACKED write + rename) | `Connection.sync` | main thread, about 0.15 ms | low; part of the 0.63 to 0.73 ms publication p50 |
| `pinBasis`, `unpin`, `purge` | `Connection.sync` to the **writer** | main thread, for as long as the writer is busy, up to a full commit and fsync | medium: a P5 sweep or reader pin issued during a commit stalls the broker loop for 4 to 30 ms |
| Feed `LogFeed.poll` (`feed.ts` line 101, `readFramesFrom`) | `Connection.sync` on reader `pool[0]`, which also serves pulls, overlay and applier reads | main thread, for as long as `pool[0]` is busy | medium |
| Feed consumer `FeedConsumerStore.recordEffects` (`feed.ts` lines 278-279) | `fs.writeSync` + `fs.fsyncSync` (F_FULLFSYNC, 3 to 8 ms) | main thread, once per feed page | **high in the harness**: `round2/case.mjs` polls every 10 ms on the broker's thread |
| Overlay and source reads for reader workers (`round2/case.mjs` lines 298-303) | worker asks main via MessageChannel; main calls `overlayAsync` / `fromLogAsync` on the reader pool | main thread JavaScript per read (56,644 overlay routes in the after/worker/256 cell) | **high at 256 readers** |
| Reader pulls | `Connection.request` on four reader workers, each `BEGIN; marker(); ...; COMMIT` | reader workers | fine |

Two observations from the builder's numbers support the two "high" rows:

1. **Durable-to-host p99 is about 4 ms even with zero readers** in most cells (4.0 to 4.4 ms local and before/worker), about one
   F_FULLFSYNC. That is what a commit's completion would wait if it arrived while the main thread was inside the consumer's
   `fsyncSync`. At 20 commits/s with a 3 to 4 ms flush per page, the main thread is blocked about 6 to 8% of the time, which is
   consistent with a p99 effect and no p50 effect. This is an inference to confirm, not a measured attribution.
2. **At 256 readers in a worker the tail grows on the main thread, not in the reader worker:** scheduling p99 18.4 ms, durable-to-host
   p99 20.8 ms and publication p99 9.4 ms in the after cell, against 2.5, 0.6 and 1.4 ms at 16 readers. The reader worker is saturated, so
   the replica apply lags (p50 33.2 ms against 1.5 ms at zero readers), more reads miss the replica and fall to the overlay, and every
   overlay read is served by the main thread. The two 256-reader cells (21.9 and 55.4 ms p99) show how unstable that feedback is.

## 7. Ranked design changes for EXP-P2B round 3

Ranked by expected effect on P2 p99 (and P1's 1.25x writer bar) per unit of change. All keep the existing durability, atomicity and
idempotency mechanics unchanged.

| Rank | Change | Expected latency effect | How to measure | Floor risk |
| --- | --- | --- | --- | --- |
| 1 | **Move the feed consumer off the broker's thread.** Run `LogFeed.poll` and `FeedConsumerStore.recordEffects` in their own worker (or process) with their own read-only SQLite connection, so neither `Atomics.wait` on `pool[0]` nor the consumer's F_FULLFSYNC ever runs on the broker's event loop. | Durable-to-host p99 and scheduling p99 at zero readers from about 4 ms to under 0.5 ms; offer-to-ACK p99 down by up to one flush (about 4 to 8 ms). P3 lag should not change by more than one IPC hop. | Rerun the builder's worker/0 and worker/16 cells; compare `durableToHost`, `scheduling` and `publication` p99, and feed lag p50/p99. | none to P2. P3 must keep effect plus checkpoint in one durable write; the consumer still fsyncs, just elsewhere. |
| 2 | **Serve overlay and source reads inside the reader workers from SQLite**, each worker with its own read-only connection to `broker.db` (`recent_rows`, `live_rows`, `retired_rows`, `marker`), and publish the broker watermark through a SharedArrayBuffer. Main thread stops answering per-read RPCs. | At 256 readers: scheduling, durable-to-host and publication p99 back toward the 16-reader values (2.5 / 0.6 / 1.4 ms); offer-to-ACK p99 from 21.9 to 55.4 ms to roughly 15 to 25 ms; makes P1's "writer p99 <= 1.25x zero-reader baseline" reachable. | Same matrix at 0/16/256; also count main-thread handler calls and main-thread CPU per second; report the 256/0 writer p99 ratio. | Read-your-own-write still holds: `COMMIT` returns before the ACK, so a read transaction begun after the ACK sees the commit. Cross-process readers cannot join the in-process checkpoint gate, so a stuck reader can still grow the WAL; keep reads short and alarm on WAL size. |
| 3 | **Size the reader side to the cores:** 256 readers spread over a pool of 4 to 8 reader workers (M3 Pro has 6 performance and 6 efficiency cores), each with its own replica copy or reading H1 rows from SQLite directly. | Read p99 from 84 to 90 ms to low milliseconds; replica apply p50 back to about 1.5 ms; fewer overlay misses, which also helps rank 2. | P1 goodput and read p99 at 64 and 256 readers with 1, 2, 4, 8 workers; replica apply lag; route mix. | Each in-memory replica copy must apply every frame; a copy that falls behind must route to the overlay or refuse, never answer stale (the existing basis gate already enforces this). |
| 4 | **Production shape: three processes.** Broker process (decision loop, SQLite writer worker, checkpointer); reader service process(es) answering P1 pulls from XTDB plus SQLite; feed consumer process. Connect with Unix sockets. | Same as ranks 1 to 3 combined, plus isolation from GC pauses and from live-XTDB pgwire decode CPU in readers. Hop cost 13 to 19 us p50. | The live XTDB arm in `COMMANDS.md`, with readers in their own process. | Process restart and epoch handling for out-of-process readers is R25's open caveat; readers must re-read the marker and incarnation per request. |
| 5 | **Stop synchronous writer RPCs from reader-facing and sweep paths:** make `pinBasis`, `unpin`, `purge` and the feed's `readFramesFrom` asynchronous, or route pins to a reader connection. Optionally cache claims and subject heads in broker memory to drop about three sync RPCs per command. | Removes 4 to 30 ms main-thread stalls when a pin or purge coincides with a commit (matters for P5 sweeps); the caching saves about 0.1 ms per command. | Run a P5-style pin and purge stream during the 256-reader matrix and compare writer p99. | Caching heads and claims must stay a pure read-through of what the writer committed; the SQLite tables stay the record. |
| 6 | **Default `requireFullFsync` to true for every production factory on darwin, and record the calibration in every receipt; on Linux, record the device and whether it has power-loss protection.** | none | Startup refusal test on a volume without F_FULLFSYNC (for example a RAM disk or network mount). | Closes the silent non-durability gap in section 4.3. |
| 7 | **Measurement hygiene for acceptance cells:** run on a quiet host or a heavy slot, record load average and concurrent disk activity, repeat each cell at least 3 times, report the commit envelope p99 separately from the rest, and use at least 1,000 samples per band so p99 is not the second-highest sample. | none, but separates host F_FULLFSYNC noise (envelope p99 7 to 34 ms in round 2) from broker effects | n/a | none |

**Expected result after ranks 1 to 3 on this Mac:** p50 about 7 ms (about 4 ms flush plus 2.5 to 3 ms broker work), and p99 bounded by
the flush tail, about 10 to 25 ms on a quiet host. Both under the bars with margin.

### 7.1 Rejected options

| Option | Latency effect | Why rejected |
| --- | --- | --- |
| `synchronous=NORMAL` on the log of record | commit 4 ms to 0.06 ms | ACKed commits can roll back after power loss; violates "ACK only after durable" |
| `fullfsync=OFF` on macOS, or F_BARRIERFSYNC | commit to about 0.1 ms | ordering only; data not on stable storage at ACK |
| ACK before the flush returns (early or speculative ACK) | removes the flush from the ACK path | same violation |
| Separate segment log of record plus SQLite at NORMAL as an index | about 1 ms | adds a second recovery path and the replay-growth problem SQL01 removed |
| Linger timer for bigger groups | adds its wait to p50 | the trace rate never needs the throughput |
| Replacing better-sqlite3 with `node:sqlite` | none | equally synchronous; still needs the writer worker |

`synchronous=NORMAL` is acceptable only for stores that can be rebuilt from the durable log, for example a derived index, never for
the log, the receipts or a consumer checkpoint that is not replay-safe.

## 8. Threats to the "durable, atomic, idempotent" floor

1. **Silent F_FULLFSYNC fallback** when `requireFullFsync` is false (default) on a volume that does not support it. Fix is rank 6.
2. **Drive honesty.** F_FULLFSYNC and Linux fsync are only as good as the drive's flush. Power-loss qualification has not been run;
   SIGKILL tests do not cover it.
3. **Moving readers out of process** (ranks 2 to 4) loses the SharedArrayBuffer checkpoint gate for those readers. A long or stuck
   cross-process read transaction stops checkpoints and grows the WAL; RESTART already uses `busy_timeout=0` so it never stalls the
   writer, but WAL growth needs an alarm and a bound on read transaction length.
4. **Group-transaction faults** fail-stop every member as outcome-unknown. Lost-ACK resolution recovers them, but scenario GS.4 should
   include a fault inside a multi-member group.
5. **Caching claims or heads in memory** (rank 5) must never answer a duplicate or a compare-and-set from a cache that could disagree
   with SQLite after a restart; rebuild it from the tables at startup.
6. **The `ACKED` sidecar** is unsynced by design; do not promote it to a source of truth.

## Appendix: probe scripts

Run from any directory with Node 22; they write only into a sibling `db/` folder that they delete. They were run from the session
scratchpad, which is disposable; the results above are the record.

`bench.cjs` (SQLite sync settings, raw fsync, worker RPC, event-loop delay):

```js
const D = require('/Users/sam/projects/triplex-db-2/.claude/worktrees/p2b/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3');
const fs = require('fs'), path = require('path');
const { Worker, MessageChannel, receiveMessageOnPort } = require('worker_threads');
const dir = path.join(__dirname, 'db'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
const st = a => { a = a.slice().sort((x, y) => x - y); const q = p => a[Math.max(0, Math.ceil(a.length * p) - 1)]; return { n: a.length, p50: +q(.5).toFixed(3), p90: +q(.9).toFixed(3), p99: +q(.99).toFixed(3), max: +a.at(-1).toFixed(3) }; };
const N = +process.argv[2] || 200; const out = {};
function sqlite(name, prag, rowsPerTx) {
  const d = new D(path.join(dir, name + '.db'));
  d.pragma('journal_mode=WAL'); for (const p of prag) d.pragma(p); d.pragma('wal_autocheckpoint=0');
  d.exec('CREATE TABLE r(e TEXT, id TEXT, row TEXT, PRIMARY KEY(e,id)) WITHOUT ROWID; CREATE TABLE m(id INTEGER PRIMARY KEY, lsn INT)'); d.exec('INSERT INTO m VALUES(1,0)');
  const ins = d.prepare('INSERT INTO r VALUES(?,?,?)'), up = d.prepare('UPDATE m SET lsn=? WHERE id=1');
  const pay = 'x'.repeat(300); let k = 0; const t = [];
  const tx = d.transaction(i => { for (let j = 0; j < rowsPerTx; j++) ins.run('s' + (i % 128), 'id' + (k++), pay); up.run(i); });
  for (let i = 0; i < 10; i++) tx.immediate(i);
  for (let i = 0; i < N; i++) { const s = performance.now(); tx.immediate(i); t.push(performance.now() - s); }
  d.close(); out[`sqlite ${name} rows=${rowsPerTx}`] = st(t);
}
sqlite('full_fullfsync', ['synchronous=FULL', 'fullfsync=ON', 'checkpoint_fullfsync=ON'], 10);
sqlite('full_fullfsync_640', ['synchronous=FULL', 'fullfsync=ON', 'checkpoint_fullfsync=ON'], 640);
sqlite('full_plainfsync', ['synchronous=FULL', 'fullfsync=OFF'], 10);
sqlite('normal', ['synchronous=NORMAL'], 10);
for (const [nm, fn] of [['fs.fsyncSync', fs.fsyncSync], ['fs.fdatasyncSync', fs.fdatasyncSync]]) {
  const fd = fs.openSync(path.join(dir, nm), 'a'); const b = Buffer.alloc(4096, 1); const t = [];
  for (let i = 0; i < N; i++) { fs.writeSync(fd, b); const s = performance.now(); fn(fd); t.push(performance.now() - s); }
  fs.closeSync(fd); out['raw ' + nm + ' 4KiB append'] = st(t);
}
const w = new Worker(`const {parentPort}=require('worker_threads');parentPort.on('message',({response,signal,payload})=>{response.postMessage({result:payload});response.close();if(signal){const s=new Int32Array(signal);Atomics.store(s,0,1);Atomics.notify(s,0);}});`, { eval: true });
const rows = Array.from({ length: 10 }, (_, i) => ({ entity_id: 'subject:1', id: 'id' + i, attribute: ':a/' + i, value_string: 'v' + i, recorded_position: i, retracted_position: null, valid_from: 1, valid_to: null }));
(async () => {
  const asyncCall = p => new Promise(r => { const { port1, port2 } = new MessageChannel(); port1.once('message', m => { port1.close(); r(m); }); w.postMessage({ response: port2, payload: p }, [port2]); });
  const syncCall = p => { const { port1, port2 } = new MessageChannel(); const sig = new SharedArrayBuffer(4), s = new Int32Array(sig); w.postMessage({ response: port2, signal: sig, payload: p }, [port2]); let m; while (!(m = receiveMessageOnPort(port1))) Atomics.wait(s, 0, 0, 10); port1.close(); return m.message; };
  for (const [label, p] of [['tiny', 1], ['10 rows', rows]]) {
    for (let i = 0; i < 200; i++) await asyncCall(p);
    let t = []; for (let i = 0; i < 3000; i++) { const s = performance.now(); await asyncCall(p); t.push(performance.now() - s); } out[`rpc async ${label}`] = st(t);
    for (let i = 0; i < 200; i++) syncCall(p);
    t = []; for (let i = 0; i < 3000; i++) { const s = performance.now(); syncCall(p); t.push(performance.now() - s); } out[`rpc sync ${label}`] = st(t);
  }
  await w.terminate();
  const { monitorEventLoopDelay } = require('perf_hooks');
  for (const loops of [0, 16, 256]) {
    let stop = false; const busy = us => { const e = performance.now() + us / 1000; while (performance.now() < e); };
    const ls = Array.from({ length: loops }, async () => { while (!stop) { busy(50); await new Promise(r => setTimeout(r, 1)); } });
    const h = monitorEventLoopDelay({ resolution: 1 }); h.enable();
    const t = []; for (let i = 0; i < 300; i++) { const s = performance.now(); await new Promise(r => setTimeout(r, 0)); t.push(performance.now() - s); await new Promise(r => setTimeout(r, 3)); }
    h.disable(); stop = true; await Promise.all(ls);
    out[`timer(0) with ${loops} loops x 50us`] = { ...st(t), eldP99ms: +(h.percentile(99) / 1e6).toFixed(2) };
  }
  out.meta = { node: process.version, sqlite: new D(':memory:').prepare('select sqlite_version() v').get().v, load: require('os').loadavg(), N };
  console.log(JSON.stringify(out, null, 1)); fs.rmSync(dir, { recursive: true, force: true });
})();
```

`interfere.cjs`: the same 10-row FULL + fullfsync commit, 250 samples with a 2 ms gap, run three ways: alone; while a worker thread
appends 200 bytes and calls `fs.fsyncSync` on a second file every 10 ms; and while it does so back to back.

`ipc.cjs`: 3,000 round trips of a 551-byte JSON payload between a parent and a `child_process.fork` child, first over the fork IPC
channel, then over a Unix domain socket with `setNoDelay(true)`; the first 200 are discarded as warm-up.

ACKED probe: 2,000 iterations of `fs.writeFileSync(tmp, 32 bytes)` plus `fs.renameSync(tmp, ACKED)`.

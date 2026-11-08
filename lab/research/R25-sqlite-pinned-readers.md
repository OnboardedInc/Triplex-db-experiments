# R25: many pinned readers beside one durable writer in the broker's SQLite file

**Written:** 2026-11-07 (measurements, first agent) and 2026-11-08 (continuation: checkpointer thread, short-transaction sweep, H1 in SQLite, this report), research agent R25 under `lab/PROTOCOL.md`. **Moves:** P1 (pinned reads that never block writers), P2 (commit latency), P4 (H1 current store), P5 (sweep workers reading a pinned basis).

## How to read this report
- **Evidence labels.** `[S]` read in SQLite source (the copy of `wal.c` in `R23/raw/sqlite/`) or in lab code (branch `exp/P2Q-qlever-log-broker` at f711193; `lab/bench/lib/current-table.ts` at 6f061a8). `[W]` web primary document with URL and fetch date. `[P]` measured by R25 on this Mac. `[E]` inference.
- **Not done.** No power cut, so every power-loss statement is an argument from source and docs. No Docker, no engine. SQLite was exercised only through `better-sqlite3` 12.10.0 (bundles SQLite 3.53.1) on Node 22.23.2, 12 cores [P].
- **Conditions.** The host is shared with other agents. One-minute load average ranged from 6 to 94 during the runs; every table row carries its own start and end load. Treat every latency as a relative comparison between rows measured minutes apart. The CPU-burner rows (`spin`) are the control for host CPU competition.
- **Workload.** Writer: R23's 10-fact shape (one 3,000 B frame, 10 `current_rows` upserts for one entity, head, operation, marker row), one transaction per command, Poisson at 50 commits/s. That is the trace's burst rate held continuously; the steady trace is about 1.1 commands/s (TARGETS 2), so WAL growth figures below are about 45 times the steady-state figures. Base file: 50,000 entities x 10 rows (500,000 `current_rows`, 142 MB). Readers: closed loop, each read one transaction: 80% "point" (a 4-entity pull of 40 rows, half from the writer's 1,000-entity active set, repeated read of the first entity inside the same snapshot) and 20% "range" (500 rows in key order). Every read checks itself: rows never newer than the snapshot's marker LSN, all 10 rows of an entity at one LSN, repeat read identical. A violation counter covers all of this.
- **Raw material.** Scripts in `/Users/sam/Claude/Projects/triplex-db-2/R25/scripts/` (`bench.cjs` writer plus reader threads, `pool.cjs` main-thread dispatch, `locks.cjs` kill tests, `vis.cjs`, `dur.cjs`, `xfer.cjs`, `h1.cjs` H1 shape). Results in `.../R25/out/` (one JSON per run plus `*-brief.log` with start load per run). Data files were deleted.

## 0. Answer

**Drop `locking_mode=EXCLUSIVE`. Keep R23's durability pragmas. Open the file in WAL with normal locking; enforce one writer process with a lock on a separate file; give the read-write connection to one writer thread, checkpoints to a second thread with its own connection, and reads to a pool of four reader threads with `readonly` connections. Pin long work (sweeps, straddling reads) by an explicit basis plus a retention horizon, never by a long read transaction.**

1. **Single writer** [P]. SQLite does not give "one broker process": two writer processes on one file both acknowledged commits (820 and 88 in 3 s; only the frames primary key caught 5 equal LSNs). A lock on a separate file does, without touching readers. Use a SQLite exclusive lock on `broker.lock` (acquire 2.4 ms p50; another process and a second connection in the same process both get `SQLITE_BUSY`; released by SIGKILL). The perl `flock` child also works (9.2 ms).
2. **SIGKILL of the writer with readers open** [P]. 40 kills with reader processes attached: 0 acknowledged commits lost, pinned readers' snapshots unchanged, polling readers saw no error, no `SQLITE_BUSY` and no LSN going backwards; the successor's first commit came 41 to 53 ms (p50) after the kill.
3. **Snapshot LSN** [P]. `BEGIN` pins nothing; the first read does. Make the first statement of every read transaction `SELECT lsn, epoch, h FROM marker`; the returned LSN is the snapshot, and every later statement in that transaction sees exactly that state. A 30 s hold returned identical probe results every second for 10 holds in a row.
4. **Readers do not block the writer** [P]. 0 `SQLITE_BUSY` on any of about 300,000 measured commits, 0 violations in about 91 million checked reads. The writer's median commit rose by about 0.2 to 0.8 ms with 4 to 16 reader threads (3.0 to 3.3 ms alone, 3.4 to 4.1 ms with readers); CPU-burner threads alone moved it 0 to 0.5 ms. p99 moves are within the run-to-run spread of this host (6 to 23 ms).
5. **Checkpoint starvation is real, and where the checkpoint runs decides it** [P]. A PASSIVE checkpoint run by the writer thread right after a commit never resets the WAL while closed-loop readers run: readers still hold the previous commit's snapshot, so it copies all but the last 7 to 9 frames (148 of 150 incomplete over 10 minutes) and the WAL grew 1.67 MB/s to 714 MB. When it finally reset, truncating the file stalled one commit 994 ms. The same PASSIVE every 4 s from a separate checkpointer thread completed 66 of 74 times and kept the WAL at 16 to 38 MB with 8 readers and no gate. A gated RESTART (readers park between transactions for 1 to 6 ms, checkpoint 7 to 57 ms) bounds the WAL at 64 MB as a backstop.
6. **Long read transactions are what the design must avoid** [P]. A sweep holding 30 s transactions back to back grew the WAL to 504 MB in 300 s, and the checkpoint after each release took up to 637 ms on the writer thread (commit sojourn p99 182 ms). A gated RESTART that waits on such a reader blocked the writer 5.3 s per attempt (commits fell from 50/s to 6.7/s). The same sweep as one short transaction per 64-subject page (max 43 ms) kept the WAL at 16 MB with the gate.
7. **Thread model** [P]. The writer on the main thread blocks the event loop (loop delay p99 5.9 to 7.1 ms, max 58 to 77 ms; on a worker 1.5 to 3.4 ms). One owner thread serving reads between commits caps at about 7,600 reads/s and its read p99 at 256 clients is 96 to 114 ms; four reader threads give 19,200 to 20,600 reads/s with p99 36 to 46 ms at 256 clients and goodput 0.95 of that at 1,024 clients. Cost: about 18 MB RSS per idle reader thread, 70 to 80 MB per busy one.
8. **Durability** [P] [S]. The multi-reader design changes neither R23 trap if every connection that is not `readonly` sets `fullfsync=ON` (a read-write connection with defaults that closes last checkpoints with plain `fsync`). Readers never see a frame before its WAL sync (the wal-index header is published after the sync). The mid-WAL byte flip still drops acknowledged commits silently (30 of 100 recovered) whether or not readers are attached; the `ACKED` sidecar high-water mark detects it. The WAL-reset bug is fixed in the bundled 3.53.1.
9. **H1 in the same file** [P]. EXP-P4's H1 table fits in `broker.db` as two tables clustered by entity, `live_rows` and `retired_rows`, written in the commit's own transaction and read at an explicit basis by the reader pool. A 3-hop, 151-fact pull took 0.10 to 0.11 ms p50 and 0.34 to 0.91 ms p99 (P4 bars 5 and 25 ms), about 8,000 pulls per busy reader-thread second; rows examined stayed at 151 from history depth 1 to 10 while a single retained-row table went to 610. Maintaining the rows added 0.06 to 0.07 ms p50 to each commit's transaction. A one-thread sweep pulled 20,000 subjects at one pinned basis in 2.09 s, one short transaction per 64 subjects, and a re-pull of all 20,000 at that basis afterwards matched every digest (section 6).

## 1. Single writer without EXCLUSIVE (question 1)

**1.1 What SQLite itself guarantees `[S]` `[W]`**
- WAL allows one writer at a time across processes and many concurrent readers (https://sqlite.org/wal.html section 2.2, fetched 2026-11-07). It does not tie the writer to one process: any process that opens the file can take the write lock between commits.
- `locking_mode=EXCLUSIVE` set before the first WAL access creates no shared-memory index, and every other connection gets `SQLITE_BUSY` (`wal.html` sections 8 and 9). Switching EXCLUSIVE on later has the same effect until the mode is set back to NORMAL and the file is accessed once (https://sqlite.org/pragma.html#pragma_locking_mode) [P `locks-t6`].
- SQLite's locks are POSIX advisory `fcntl` locks (https://sqlite.org/lockingv3.html section 6.0, fetched 2026-11-07), which the kernel drops when the process dies. Closing any other file descriptor on the same file in the same process drops them too (https://sqlite.org/howtocorrupt.html section 2.2, fetched 2026-11-07), so broker code must never open `broker.db` or `broker.lock` with `fs`.

**1.2 Measured**

| # | Test | Result |
|---|---|---|
| T1 | Two writer processes on one file, no external lock, 3 s | Both acknowledge: 820 and 88 commits, 5 primary-key collisions, `integrity_check` ok. SQLite serialised the commits; the frames primary key caught equal LSNs; each process's in-memory heads and claims would have diverged. [P `locks-t1`] |
| T6 | Second connection while the first is EXCLUSIVE | `SQLITE_BUSY`, whether EXCLUSIVE was set before the first WAL access or at run time; after switching back to NORMAL the next access succeeds [P `locks-t6`] |
| T7 | SQLite-native lock: separate file, `locking_mode=EXCLUSIVE`, then `BEGIN EXCLUSIVE; COMMIT` | A second connection in the same process and a second process both get `SQLITE_BUSY`; acquired after the holder closes [P `locks-t7`] |
| T2a | perl `flock` child holds `LOCK`; 20 SIGKILLs of the writer while a pinned reader process and a polling reader process stay open | Successor's first commit 52.9 ms p50, 69.8 ms p90, 277 ms max after the kill (includes starting a new Node process); lock wait 9.2 ms p50; contender exits 3; 0 acknowledged commits lost; pinned reader 0 changes over all 20 kills; polling reader 8,501 reads, 0 `SQLITE_BUSY`, 0 errors, 0 LSN regressions; `integrity_check` ok [P `locks-t2`] |
| T3a | Same with the SQLite lock file | Successor's first commit 41.4 ms p50, 48.4 ms max; lock wait 2.4 ms p50; contender gets `SQLITE_BUSY`; pinned reader 0 changes; polling reader 9,556 reads, 0 busy, 0 errors; 0 lost [P `locks-t3`] |
| T2b, T3b | Same with no reader process (every connection dies with the writer) | Takeover 53.5 ms p50 (perl), 47.5 ms p50 (SQLite lock); 0 lost; in 14 of 20 and 15 of 20 rounds one commit that was written but never acknowledged survived (recovery adopted it) [P] |
| T4 | SIGKILL of a reader that holds a pinned transaction | While pinned, a PASSIVE checkpoint copied 0 of 3,019 frames; after the kill, the next PASSIVE copied 3,019 of 3,019 [P `locks-t4`] |
| T5 | `BEGIN`, then a commit by the writer, then the first read | The read sees the newer LSN; the first read, not `BEGIN`, pins the snapshot [P `locks-t5`] |

**1.3 What the kill results mean**
- **Acknowledged means durable and not lost.** In all 80 kills the successor started above every acknowledged LSN.
- **An un-acknowledged commit has two outcomes.** If some connection keeps the shared-memory index alive (a reader process), frames written after the last published header are overwritten by the successor and the commit is gone. If every connection died, recovery scans the WAL file and adopts a fully written commit whether or not its `fsync` returned (14 and 15 of 20 rounds). Both are legal under lost-ACK resolution, but the broker must resolve a lost ACK by reading the `ops` table, never by assuming the commit failed.
- **A recovered commit may not be synced.** After a crash with no surviving connection, recovery can adopt frames that the page cache holds but the disk may not. Readers that see them could see a commit that a power cut then removes. The successor must run `wal_checkpoint(PASSIVE)` before it starts reader threads: the checkpoint syncs the WAL before copying (`wal.c:2360`) `[S]`. This is one reason to keep readers as threads of the broker process: they die with the writer, so no reader outlives a crash and reads a recovered frame before that sync `[E]`.
- **Readers in other processes saw no errors across 40 takeovers** (the `SQLITE_BUSY` during recovery documented in `wal.html` section 9 did not occur, because their shared-memory index stayed valid).

**1.4 Verdict.** The external lock is necessary (T1) and compatible with readers. The SQLite lock file needs no child process and was faster to acquire (2.4 ms against 9.2 ms). It is an ordinary SQLite connection, so the `fs` rule above applies to `broker.lock` as well.

## 2. Pinned snapshots (question 2)

- **How a reader learns its LSN** [P `locks-t5`] [W `wal.html` 2.2]. A WAL read transaction records the WAL end mark when it first reads, not at `BEGIN` (better-sqlite3 issues a deferred `BEGIN`). So the first statement is the marker read: `BEGIN; SELECT lsn, epoch, h FROM marker WHERE id=1; ...; COMMIT`. The marker row is updated in every commit's own transaction, so the value equals the highest LSN in the snapshot. In `feed` checks the marker always equalled `max(lsn)` of `frames` in the same snapshot.
- **Many queries, one snapshot** [P]. Every point read re-read its first entity inside the same transaction: 0 differences in tens of millions of reads. Ten 30 s sweep holds (`long-sweep-r4`) re-ran a 6,000-row probe every second and re-read the marker: 0 changes, while the writer committed about 1,500 times per hold.
- **How long** [P] [W]. SQLite sets no time limit on a read transaction. The cost of a long one is that no checkpoint can copy frames past its end mark, and the WAL cannot restart until it ends (`wal.html` 6). Measured cost at 50 commits/s: WAL growth of 1.67 to 1.7 MB/s for as long as any reader pins old frames (so a 30 s pin costs about 50 MB and a 100 s P5 sweep about 170 MB; at the steady trace rate about 45 times less). Latency did not degrade with WAL size: in `long-passive-r8` the per-minute commit p50 stayed 3.38 to 3.62 ms and point-read p50 0.084 to 0.11 ms while the WAL grew from 10 to 703 MB.
- **What a long pin breaks** [P]. (1) Back-to-back 30 s pins never let the WAL reset (504 MB after 300 s, 0 of 75 checkpoints complete). (2) The first checkpoint after a pin is released copies the backlog on whichever thread runs it: up to 637 ms on the writer thread, commit sojourn p99 182 ms against 25 ms gated without sweep. (3) A RESTART checkpoint waits on the pin through the busy handler: in `sweep-restart` every gate blocked the writer 5.2 to 5.3 s (the 5,000 ms busy timeout) and commits fell to 6.7/s, sojourn p50 24.7 s.
- **Verdict.** A snapshot can be held across many queries and for 30 s without error, but P5 should not hold one. Use one short transaction per page at an explicit basis B and hold the retention horizon H at or below B (R24 section 5.2 item 1). Measured two ways: `sweepshort` (one 64-subject page per transaction, max 43 ms; WAL bounded at 16 MB with 11 to 12 gates per 120 s, 0 violations; section 3.4), and the H1 sweep with digest verification (section 6).

## 3. Readers never block the writer (question 3)

All rows: writer on a worker thread, R23 pragmas (`synchronous=FULL`, `fullfsync=ON`, `checkpoint_fullfsync=ON`, `wal_autocheckpoint=0`), normal locking unless marked, PASSIVE checkpoint on the writer thread every 200 commits unless marked, 60 s measured after 5 s warm-up, about 2,935 commits per row. "Commit" is the duration of the commit call; "sojourn" runs from the scheduled offer time to the commit's return, so it includes queueing behind checkpoints (TARGETS 1.1 P2 item 1). Two interleaved passes, a and b.

**3.1 Reader threads against CPU-burner threads** [P `q3-brief.log`]

| Row | Commit p50 a / b ms | Commit p99 a / b ms | Sojourn p99 a / b ms | Reads/s a / b | Point read p50 / p99 ms (a) | WAL MB | Load start>end (a) |
|---|---|---|---|---|---|---|---|
| 0 readers | 3.06 / 3.30 | 8.8 / 14.1 | 27.9 / 41.0 | - | - | 6.6 | 10.7>18.3 |
| 0 readers, EXCLUSIVE (R23) | 3.00 / 3.17 | 7.1 / 12.2 | 16.8 / 29.3 | - | - | 6.6 | 18.3>13.7 |
| 4 readers | 3.78 / 4.02 | 15.1 / 18.3 | 262 / 46.6 | 17,814 / 12,924 | 0.057 / 1.14 | 103 | 13.4>16.5 |
| 4 spin threads | 3.13 / 3.21 | 11.0 / 17.4 | 20.9 / 52.7 | - | - | 6.6 | 16.5>12.6 |
| 8 readers | 3.65 / 3.56 | 15.4 / 14.7 | 67.1 / 78.8 | 24,851 / 24,440 | 0.071 / 2.29 | 103 | 12.6>14.9 |
| 8 spin threads | 3.19 / 3.44 | 13.2 / 16.3 | 23.7 / 30.2 | - | - | 6.6 | 14.0>14.2 |
| 16 readers | 3.53 / 4.15 | 10.8 / 22.5 | 26.6 / 74.3 | 26,552 / 14,175 | 0.108 / 5.93 | 103 | 14.2>23.1 |
| 16 spin threads | 2.99 / 3.81 | 6.6 / 21.6 | 15.0 / 71.7 | - | - | 6.6 | 23.1>94.4 |
| 0 readers, end of pass | 3.24 / 3.70 | 13.5 / 12.6 | 33.8 / 24.7 | - | - | 6.6 | 87.7>37.9 |

- 0 `SQLITE_BUSY` for the writer and for every reader, 0 errors, 0 violations in every row.
- The one 687 ms commit (4 readers, pass a, hence its 262 ms sojourn p99) has no counterpart in pass b; the end-of-pass zero-reader rows (p99 12.6 to 13.5 ms) show the spread of this host.
- **Cost of readers on the median: +0.3 to +0.8 ms, of which CPU competition explains 0 to +0.5 ms** (spin rows). The remainder is WAL growth: with readers the WAL is never reset, so every commit extends the file.

**3.2 Separating WAL growth from reader presence** [P `extra-brief.log`]. `prealloc` pre-grows the WAL to 150 MB before measuring, so commits overwrite existing blocks; `nockpt` runs no checkpoint at all.

| Row | Commit p50 a / b ms | Commit p99 a / b ms | Sojourn p99 a / b ms | Reads/s a / b |
|---|---|---|---|---|
| 0 readers, no checkpoint (WAL grows to 103 MB) | 3.35 / 3.20 | 6.4 / 6.1 | 14.0 / 14.2 | - |
| 0 readers, WAL pre-grown | 2.95 / 3.18 | 9.7 / 13.5 | 22.2 / 39.8 | - |
| 4 readers, WAL pre-grown | 3.17 / 3.76 | 7.1 / 14.1 | 17.1 / 37.6 | 19,423 / 21,729 |
| 8 readers, WAL pre-grown | 3.32 / 3.39 | 8.9 / 6.8 | 17.9 / 14.7 | 25,154 / 24,818 |
| 16 readers, WAL pre-grown | 3.41 / 3.54 | 7.7 / 16.5 | 17.7 / 37.0 | 24,301 / 27,278 |

- With the WAL pre-grown, readers add +0.2 to +0.6 ms to the median and nothing measurable to p99.
- **The lowest commit p99 in the whole study is the row with no checkpoint (6.1 to 6.4 ms).** Checkpoints run on the writer thread raise commit p99 and sojourn p99 more than readers do. This led to the checkpointer-thread arm in 3.3.
- **P1 bar check** (writer commit p99 at most 1.25x its zero-reader baseline): the medians pass; the p99 ratio cannot be resolved on this host, where two zero-reader runs a few minutes apart differ by 1.6x (8.8 against 14.1 ms). It needs the calibrated quiet profile.

**3.3 Five to ten minutes at 50 commits/s: WAL growth, starvation and latency** [P `rest-brief.log`, `r25b-brief.log`]

| Row | Duration | Commit p50 / p99 / max ms | Sojourn p99 / p999 ms | Reads/s | WAL max / end MB | Checkpoints complete | Load start>end |
|---|---|---|---|---|---|---|---|
| 0 readers | 300 s | 3.14 / 16.2 / 89 | 48.9 / 93.6 | - | 6.8 / 6.8 | 75 of 75 | 21.6>8.5 |
| 8 readers, PASSIVE on writer only | 600 s | 3.43 / 10.8 / **994** | 22.7 / **594** | 22,457 | **714 / 282** | 2 of 150 | 13.3>21.7 |
| 8 readers, PASSIVE plus gated RESTART at 64 MB | 600 s | 3.23 / 10.8 / 58 | 24.9 / 62.9 | 24,111 | 64.4 / 30.6 | 2 of 150 (15 gates) | 21.7>21.0 |
| 8 readers with 1.5 to 4.5 ms think time | 300 s | 3.26 / 21.7 / 189 | 159 / 347 | 1,799 | 39.4 / 16 | 57 of 75 | 8.5>10.8 |
| 4 readers plus back-to-back 30 s sweep pins | 300 s | 3.88 / 23.2 / 499 | 182 / 522 | 16,206 | **504 / 504** | 0 of 75 | 11.5>15.3 |
| 4 readers plus 30 s pins, gated RESTART at 16 MB | 120 s | 3.91 / 15.8 / 24 | **102,626** (p50 24,709) | 962 | 33.7 | 0 of 4 (22 gates, each 5.2 to 5.3 s) | 15.3>9.5 |
| **8 readers, checkpointer thread (PASSIVE every 4 s), gate at 64 MB** | 300 s | **3.00 / 18.2 / 81** | 55.7 / 184 | **31,829** | **38.4 / 16** | **66 of 74** (0 gates) | 6.0>19.4 |

- `journal_size_limit=16 MiB` on all rows.
- **Growth rate.** Without a reset the WAL grows 1.67 MB/s at 50 commits/s, about 33 KB per 10-fact commit (8 pages of 4 KB: frame, `current_rows`, heads, ops, marker and their index pages). At the steady trace rate that is about 37 KB/s.
- **Latency does not degrade with WAL size.** Per-minute windows of the 600 s PASSIVE row: commit p50 3.38 to 3.62 ms, p99 6.3 to 14.2 ms, point-read p50 0.084 to 0.110 ms, flat from 10 MB to 703 MB.
- **The reset is the cost.** The single 994 ms commit (and the 594 ms sojourn p999) is the commit that restarted the 703 MB WAL at 437 s, when SQLite truncated it to the 16 MiB limit. A small WAL keeps this event small.
- **Why the writer's own PASSIVE never completes** [P] [S]. Each checkpoint ran immediately after a commit, when readers that started before that commit still held its predecessor's snapshot. It copied all but the last 7 to 9 frames every time (`log - checkpointed` = 7 to 9 in every sample). A complete backfill is what lets the next writer restart the WAL from the start (`wal.c`, `walRestartLog`); with continuous readers it happened twice in 10 minutes.
- **The checkpointer thread fixes this.** It runs at times unrelated to commits, when readers are mostly on the newest snapshot, and completed 66 of 74 checkpoints (9.9 ms p50, 69.6 ms max, all on its own thread). The WAL stayed at 16 to 38 MB and the 64 MB gate never fired. In the minutes without host interference (windows 2 to 4) commit p99 was 6.0 to 8.3 ms and sojourn p99 14.0 to 18.0 ms, the best reader rows measured. Windows 0 and 1 (p99 16.6 and 26.4 ms, sojourn p99 31 and 153 ms) coincide with host load rising from 6 to 19. One 300 s run cannot separate that from an effect of two connections issuing `F_FULLFSYNC` at once, so this is the first item to repeat in a quiet window (section 9).
- **Think time matters.** With readers idle 1.5 to 4.5 ms between reads (1,799 reads/s), even the writer-thread checkpoint completed 57 of 75 times and the WAL stayed at 13 to 39 MB. Starvation is a property of saturated closed-loop readers.

**3.4 Sweep as short transactions, with matched no-sweep controls** [P `r25b-brief.log`]. 4 readers, gated RESTART at 16 MB, PASSIVE on the writer every 200 commits, 120 s, interleaved. The sweep thread reads 64 subjects (640 rows) per page every 20 ms, one read transaction per page, and parks at the gate between pages.

| Row | Commit p50 / p99 ms | Sojourn p99 ms | Reads/s | Sweep pages, page p50 / p99 / max ms | WAL max MB | Gates (gate ms) | Load |
|---|---|---|---|---|---|---|---|
| no sweep, a | 3.12 / 8.9 | 17.0 | 26,153 | - | 16.1 | 11 | 19.4>12.6 |
| short-transaction sweep, a | 3.32 / 15.1 | 44.8 | 20,205 | 4,839, 0.52 / 4.2 / 43 | 16.3 | 12 (10 to 21) | 11.3>13.4 |
| no sweep, b | 3.00 / 12.2 | 25.7 | 23,517 | - | 16.3 | 12 | 13.4>12.2 |
| short-transaction sweep, b | 2.95 / 11.4 | 20.9 | 26,930 | 4,855, 0.47 / 2.6 / 38 | 16.1 | 11 (29 to 41) | 12.2>10.5 |
| reference: 30 s pins, no gate (300 s) | 3.88 / 23.2 | 182 | 16,206 | 11,703, 0.56 / 8.9 / 82 | 504 | 0 | 11.5>15.3 |

- 0 violations and 0 `SQLITE_BUSY` everywhere; every gate RESTART returned `busy=0`.
- Commit p99 with the short sweep over no sweep: 1.70x in pass a, 0.93x in pass b (1.25x on the pass means); sojourn p99 2.6x and 0.81x. The P5 bar (at most 1.5x) is met on the means but not per pass; the spread is the host's. The 30 s-pin reference is worse on every column at a similar load.

## 4. Thread model in Node (question 4)

**4.1 Where the writer runs** [P `rest-brief.log`]

| Row | Commit p50 / p99 ms | Event-loop delay p99 / max ms (main thread) | Reads/s | RSS MB |
|---|---|---|---|---|
| Writer on the main thread, 0 readers | 3.13 / 9.2 | **5.9 / 77** | - | 61 |
| Writer on the main thread, 8 reader threads | 3.58 / 7.1 | **7.1 / 58** | 24,840 | 645 |
| Writer on a worker, 8 reader threads | 3.66 / 14.6 | 3.1 / 46 | 24,406 | 675 |
| Writer on a worker, 0 readers (3.1, a and b) | 3.06 / 3.30 | 2.3 / 2.6 | - | 69 to 72 |
| Owner: the writer thread also serves 4 / 8 / 16 closed-loop virtual readers | 3.02 / 7.1; 3.08 / 14.0; 3.02 / 5.1 | 1.9; 1.8; 1.6 | 8,106; 7,988; 8,194 | 127 to 130 |

- Main-thread writer sojourn values are understated by up to 1 ms (`setTimeout` can fire early), so only the event-loop columns of those rows are compared.
- R23's synchronous-API trap holds: every commit blocks whatever thread runs it for about 3 ms. On the main thread that is event-loop delay for every request.

**4.2 Reader threads against one owner thread, 256 logical clients on the main thread** [P `pool-brief.log`]. The main thread keeps 256 (or 64, 1,024) closed-loop requests in flight and dispatches each over a `MessagePort`, either to the writer's own thread (owner) or to N reader threads. 30 s, writer at 50 commits/s.

| Mode | Reads/s a / b | Read p50 / p99 ms (a) | Commit p50 / p99 ms (a) | Commit sojourn p99 a / b ms | Main loop delay p99 ms | RSS MB |
|---|---|---|---|---|---|---|
| Owner (writer thread serves reads) | 7,634 / 7,296 | 29.6 / **96.5** (b: 114) | 3.00 / 13.2 | 27.9 / 51.2 | 2.0 | 152 |
| 1 reader thread | 9,266 / 8,963 | 24.9 / 68.4 | 3.00 / 5.3 | 13.7 / 55.3 | 1.7 | 170 |
| 2 reader threads | 11,943 / 11,782 | 19.5 / 52.6 | 3.16 / 7.5 | 16.9 / 25.4 | 1.9 | 269 to 281 |
| **4 reader threads** | **19,210 / 20,556** | **11.7 / 45.6** (b: 36.2) | 3.36 / 7.4 | 15.4 / 38.7 | 2.1 to 2.3 | 407 to 410 |
| 8 reader threads | 21,492 / 25,181 | 10.2 / 37.8 (b: 29.4) | 3.54 / 16.8 | 41.9 / 14.5 | 2.8 to 3.2 | 677 to 697 |
| 4 reader threads, `mmap_size=256 MiB` | 30,045 | 7.8 / 19.7 | 4.37 / 10.2 | 25.3 | 2.8 | 468 |
| 4 reader threads, gated RESTART at 16 MB | 19,774 | 11.6 / 35.0 | 4.51 / 15.9 | 52.4 | 2.1 | 429 |
| Owner, 64 clients / 1,024 clients | 6,742 / 7,654 | 6.9 / 46.8; 124 / 281 | - | 64.1 / 74.7 | 2.0 | 147 to 152 |
| 4 reader threads, 64 clients / 1,024 clients | 18,189 / 18,276 | 2.9 / 11.8; 51.6 / 128 | - | 59.7 / 36.3 | 2.2 to 2.3 | 399 to 407 |

- 0 violations in every row.
- **P1 bars at the broker store level.** At 256 clients, four reader threads give read p99 36 to 46 ms (bar 100 ms); the owner thread gives 96 to 114 ms. At 1,024 clients, four threads keep 0.95 of the 256-client goodput (18,276 against 19,210; bar 0.9). Going from 4 to 8 threads adds 12 to 22% throughput for about 280 MB more RSS.
- **mmap** raised reads/s by 56% in the pool (30,045 against 19,210) and 63% in the bench (40,615 against 24,851 with 8 threads). It changes failure behaviour (an I/O error becomes `SIGBUS`, https://sqlite.org/mmap.html) and was measured once; keep it as an option for EXP-P4, not part of the base design.
- `cache_size` was not a lever: the "2 MB cache" rows equal SQLite's default (`-2000`), so `q4-cache2m` repeats the default and differs from it only by noise.

**4.3 Cost of crossing threads, per read** [P `xfer.json`]. One reader worker, a 4-entity pull (40 rows of 220 B), 3,000 round trips each.

| Path | p50 µs | p99 µs |
|---|---|---|
| Empty message round trip | 18.7 | 74.3 |
| Pinned read on the main thread (no crossing) | 37.5 | 181.8 |
| Pinned read in a worker, result consumed there, one small ack back | 76.8 | 742 |
| Pinned read in a worker, rows packed into one `ArrayBuffer` and transferred | 56.3 | 281.5 |
| Pinned read in a worker, 40 row objects structured-cloned | 83.1 | 311.8 |
| One worker, 64 requests in flight | 21,591 reads/s | |

- Crossing costs 20 to 45 µs per read. It matters only for reads cheaper than that; an H1 pull is 0.1 to 1 ms (section 6). Return a packed buffer, or consume the rows in the worker (P5: kernel in the worker, R24 5.2 item 4).
- Memory: RSS 114 MB with no reader worker, then 124, 160, 246 and 405 MB with 1, 4, 8 and 16 idle workers (about 18 MB each). Busy workers in the bench cost 70 to 80 MB each (RSS 1.1 to 1.3 GB at 16 readers), most of it V8 heap from row objects.

**4.4 Verdict.** Writer on its own worker thread, owning the only read-write connection to `broker.db` that commits. A checkpointer thread with its own read-write connection. A pool of four reader worker threads, each with one `readonly` connection, fed over `MessagePort` by the main thread; the main thread never touches SQLite. The owner model is simpler but fails the 256-client p99 bar at about 7,600 reads/s and puts read work in front of commits.

## 5. Durability traps carried over (question 5)

| # | Trap | Does the multi-reader design change it? | Evidence |
|---|---|---|---|
| 1 | `fullfsync` is per connection and off by default; off is not power-loss durable on macOS | Only through the close-time checkpoint. A `readonly` connection never checkpoints at close (the WAL was still there in 9 of 9 closes). A read-write connection with defaults that closes last does checkpoint, with plain `fsync` (1.05 ms against 5.21 ms with `fullfsync` on). So every connection that is not `readonly` (writer, checkpointer, lock) sets `fullfsync=ON` and `checkpoint_fullfsync=ON`, and P2Q's `calibrate()` check (`log.ts`) runs on the writer and on the checkpointer connection. | [P `dur`]; https://sqlite.org/pragma.html#pragma_fullfsync |
| 2 | One flipped byte in the middle of the WAL silently drops acknowledged commits | No. 100 acknowledged commits, a byte flipped at 30% of the WAL: 30 recovered (R23: 29), `integrity_check` ok, with and without live reader processes attached during the flip (the readers kept reading all 100 rows from shared memory until the kill). The `ACKED` sidecar high-water mark (written after each commit, not fsynced) detects it: recovered head 1,030 below acknowledged 1,100. | [P `dur`, `dur-flip`] |
| 3 | WAL-reset bug before SQLite 3.51.3 (two or more connections writing or checkpointing at the same moment) | The recommended design has two connections that can checkpoint (writer for the gate, checkpointer for PASSIVE), so the bug's precondition exists. The bundled 3.53.1 contains the fix (changes list for 3.51.3). Assert `sqlite_version() >= 3.51.3` at open; `node:sqlite` in Node 22.23.2 is exactly 3.51.3 and stays out. | [W] https://sqlite.org/wal.html section 11, https://sqlite.org/changes.html, fetched 2026-11-07; [P] `sqlite_version()` = 3.53.1 |
| 4 | Readers see a frame before its sync | No. Under `synchronous=FULL` the WAL is synced before the wal-index header that readers use is published (`wal.c:4313`, then `wal.c:4360`). Measured from another process: with `FULL` and `fullfsync=ON` each commit was first visible 1.74 ms or more after the commit began and at most 0.15 ms before `commit()` returned (0 of 212 seen more than 1 ms early); with `synchronous=OFF` first sight came 0.12 ms after the start. The one exception is a frame adopted by recovery after a crash (1.3): run PASSIVE before starting readers. | [S] [P `vis`] |
| 5 | Read your own write after the ACK | 20,000 trials, commit on the writer connection then a read on another connection: 0 stale reads. | [P `vis`] |

## 6. H1 in the broker's SQLite file (new input: EXP-P4)

**6.1 What H1 needs from the file `[S]`.** H1 (`lab/bench/lib/current-table.ts` at 6f061a8) holds every row visible at some basis at or above the retention horizon H: the live rows plus the rows retracted after H, each with its assert position and retract position. A read at basis B is served only when H <= B <= W, where W is the highest applied position; rows are filtered at B (asserted at or before B, not retracted at or before B). In `broker.db` the rows are written in the same transaction as the frame, so W is the marker LSN of the reader's own snapshot and the "W read fresh on every read" rule holds by construction. Durability, recovery and the watermark wait that EXP-P4 lists as open for H1 come from the file.

**6.2 Two layouts, measured** [P `h1-split.json`, `h1-naive.json`]. World: 20,000 subjects, each a subject entity (21 rows, 3 of them references), two child entities (15 rows each) and a shared account (60 rows, 200 accounts) that references a policy (40 rows, 20 policies): a 3-hop pull of 151 facts (TARGETS P4 bucket 50 to 200). 1.01M rows, 96 MB at depth 1. Writer: 50 commits/s, each a 10-fact correction on an active subject (retract 10 rows, assert 10) plus a 3,000 B frame, operation and marker, R23 pragmas, PASSIVE every 200 commits, gate at 32 MB. Readers: closed loop; 50% matched-sample subjects (the 1,000 subjects that get the history), 50% active subjects; 80% at B = the snapshot's marker, 20% at B up to 3,000 positions back; one read transaction per pull; 10% of active-subject pulls repeated at the same B in a later transaction after the writer moved on ("straddle"). History: 0, 2 and 9 corrections of all 51 rows of each matched subject and its children, 10,000 positions before the measured window. 30 s per row after 3 s warm-up.
- **naive:** one `rows` table, primary key `(entity, rid)`, a nullable retract position; every retained version of an entity is read and filtered.
- **split:** `live_rows (entity, rid)` and `retired_rows (entity, rpos, rid)`, both `WITHOUT ROWID`; a retraction moves the row; a pull reads the entity's live rows plus `retired_rows WHERE entity=? AND rpos > B`, so the retired part examined is bounded by what changed after B, not by history depth.

| Layout, depth, reader threads | Matched-sample pull p50 / p90 / p99 ms | Rows examined per sample pull | All pulls p50 / p99 ms | Pulls per busy reader-second | Commit p50 / p99 ms | H1 rows in the commit p50 / p99 ms | Load |
|---|---|---|---|---|---|---|---|
| split, 1, 1 | 0.096 / 0.161 / 0.419 | 151 | 0.097 / 0.458 | 8,141 | 3.48 / 14.2 | 0.071 / 0.29 | 8.1>7.1 |
| split, 1, 8 | 0.099 / 0.152 / 0.372 | 151 | 0.102 / 0.395 | 8,075 | 3.39 / 8.7 | 0.063 / 0.25 | 7.1>6.5 |
| split, 3, 1 | 0.105 / 0.268 / 0.556 | 151 | 0.103 / 0.479 | 7,328 | 3.64 / 11.1 | 0.068 / 0.36 | 6.7>6.2 |
| split, 3, 8 | 0.106 / 0.148 / 0.340 | 151 | 0.105 / 0.340 | 8,340 | 3.47 / 8.6 | 0.065 / 0.33 | 6.2>5.5 |
| split, 10, 1 | 0.111 / 0.400 / 0.908 | 151 | 0.106 / 0.737 | 6,155 | 3.48 / 13.5 | 0.070 / 0.46 | 5.5>4.9 |
| split, 10, 8 | 0.108 / 0.161 / 0.419 | 151 | 0.105 / 0.377 | 8,241 | 3.19 / 7.5 | 0.066 / 0.41 | 4.9>5.1 |
| naive, 1, 1 | 0.096 / 0.116 / 0.276 | 151 | 0.099 / 0.316 | 9,028 | 3.22 / 6.8 | 0.060 / 0.17 | 4.8>5.1 |
| naive, 1, 8 | 0.100 / 0.133 / 0.325 | 151 | 0.106 / 0.372 | 8,089 | 3.24 / 8.1 | 0.060 / 0.23 | 5.1>5.5 |
| naive, 3, 1 | 0.150 / 0.297 / 0.818 | 253 | 0.143 / 0.794 | 5,664 | 3.36 / 8.1 | 0.065 / 0.20 | 5.4>5.5 |
| naive, 3, 8 | 0.154 / 0.221 / 0.501 | 253 | 0.150 / 0.508 | 6,006 | 3.39 / 10.7 | 0.063 / 0.22 | 5.5>5.4 |
| naive, 10, 1 | 0.350 / 0.936 / 1.829 | 610 | 0.320 / 1.576 | 2,729 | 3.43 / 8.0 | 0.070 / 0.42 | 5.4>6.0 |
| naive, 10, 8 | 0.356 / 0.608 / 1.358 | 610 | 0.325 / 1.170 | 3,177 | 3.44 / 9.0 | 0.070 / 0.37 | 6.0>7.4 |

- 0 violations (every entity at every basis had exactly its row count and distinct attributes), 0 errors, and 0 straddle mismatches in 7,000 to 7,900 straddles per 8-reader row: two transactions at the same B, with commits to that subject in between, returned identical digests.
- The wall-clock pull rate (517 to 4,832 pulls/s) is set by the straddles' 25 ms waits; the per-busy-second column is the cost of a pull: about 0.12 ms of one thread, so one reader thread serves about 8,000 such pulls/s (P4 bar: 1,100 per engine core).
- **Flatness.** Rows examined: split 1.00x from depth 1 to 10, naive 4.04x. Matched-sample p99, depth 10 over depth 1: split 1.13x with 8 readers and 2.17x with 1 reader (0.419 to 0.908 ms); naive 4.2x and 6.6x. The split layout's work is flat; its single-reader p99 is not shown flat by one pass on a loaded host (p90 rose 0.16 to 0.40 ms in the 1-reader rows only, which ran first after each deepening). The TARGETS bar (at most 1.1x) is not met as measured in either layout; split is the candidate to repeat (section 8).
- **Against in-memory H1.** EXP-P4's synthetic 10k diagnostic measured mix p50 0.028 to 0.036 ms and p99 0.46 to 0.63 ms; behind XTDB, 0.58 to 0.94 ms p50 and 10.5 to 18.4 ms p99. SQLite-backed H1 is about 3x the in-memory median, has a similar p99, and is durable.
- **Write cost.** The H1 statements in the commit (move 10 rows, insert 10) took 0.063 to 0.071 ms p50 and at most 0.46 ms p99 of CPU inside the transaction; whole commits stayed at 3.2 to 3.6 ms p50, as with the upsert shape. This meets R24 prediction 7's 0.5 ms median bound for the CPU part; the fsync cost of the extra WAL pages is inside the commit time and was not separated.

**6.3 Sweep at one basis, by retention, not by a long transaction** [P]. A sweep thread fixed B at its start and pulled all 20,000 subjects at B, 64 subjects per read transaction, while the writer committed to active subjects (inside the sweep's range) and 4 readers ran. Afterwards the main thread re-pulled all 20,000 subjects at B in one transaction and compared digests.

| Layout | Wall | Subjects/s | Rows/s | Rows examined per subject | Page transaction p50 / p99 / max ms | Digest mismatches | Commits during sweep | Commit p99 / sojourn p99 ms |
|---|---|---|---|---|---|---|---|---|
| split | 2.09 s | 9,570 | 1.45M | 151 | 6.6 / 8.5 / 8.9 | 0 of 20,000 | 113 | 6.7 / 17.5 |
| naive | 3.39 s | 5,905 | 0.89M | 179 | 8.1 / 49.6 / 56.0 | 0 of 20,000 | 183 | 7.1 / 35.6 |

- At this rate 100k subjects take about 10.5 s of one reader thread (R24 5.4 estimated 8 to 12 s of worker CPU for about 4M rows); the kernel, not the read, bounds a P5 sweep.
- No sweep transaction was longer than 9 ms (split), so the sweep never holds back a checkpoint or a gate.

**6.4 Purge.** Deleting the 533,460 rows retracted before H = head - 3,000 took 910 ms (split) and 1,218 ms (naive) as one statement on the writer connection [P]. That would stall commits, so the writer purges in small chunks between commits (about 1.7 µs per row, so 2,000 rows cost about 3.4 ms) `[E]`. At the steady trace (about 1.1 commands/s of 5 to 50 facts) an hour retains roughly 20,000 to 200,000 retired rows `[E]`.

**6.5 J01 and the file.** EXP-J01 found that the journal and its guards are 47.9% of an XTDB A0 commit's bytes (14,394 of 30,061) and 57.9% of QLever's triples. With the broker file as the log of record, the journal is the frame. Its size hardly changes SQLite commit cost: commit time is set by the `F_FULLFSYNC`, and R23 measured 64 rows in one transaction at 3.24 ms p50 against 3.99 ms for one 1 KiB row [P R23 section 3]. WAL growth is set by pages touched (about 8 pages, 33 KB, per 10-fact commit here), not by frame bytes. So moving journal and guard content into the frame and out of the engine replicas costs the file about one more page per commit `[E]`; the saving is on the engine side, where J01 measured it.

## 7. Recommended design (question 6)

**One design, for EXP-P4's H1 arm, EXP-P5's S3 arm and the Q58c hardening.**

```
  broker process (Node 22, better-sqlite3 12.10.0 / SQLite 3.53.1)
  +--------------------------------------------------------------------------------------------+
  | main thread: HTTP, admission, request dispatch over MessagePort. Opens broker.lock only.   |
  |   holds broker.lock: SQLite connection, locking_mode=EXCLUSIVE, BEGIN EXCLUSIVE; COMMIT,   |
  |   kept open for the life of the process (single-writer rule across processes)             |
  +------------+------------------------+------------------------+-----------------------------+
               | commands               | (timer)                | reads, sweep pages
               v                        v                        v
  +-------------------------+ +-----------------------+ +----------------------------------------+
  | WRITER thread           | | CHECKPOINTER thread   | | READER POOL: 4 worker threads          |
  | broker.db read-write    | | broker.db read-write  | | broker.db readonly connections         |
  | one transaction per     | | wal_checkpoint(       | | BEGIN; SELECT lsn,epoch,h FROM marker; |
  |  command group: frame,  | |   PASSIVE) every 4 s  | |  check H <= B <= lsn; queries at B;    |
  |  ops, heads, H1 rows,   | |                       | |  COMMIT; return a packed buffer        |
  |  marker -> ACK          | |                       | | parks at the gate between transactions |
  | gate: WAL > 64 MiB ->   | |                       | | no transaction longer than a page      |
  |  park readers, RESTART  | |                       | |  (sweeps: many pages at one B)         |
  | purge in small chunks   | |                       | |                                        |
  +-------------------------+ +-----------------------+ +----------------------------------------+
                         \               |               /
                          v              v              v
              broker.db  +  broker.db-wal (16 to 64 MiB)  +  broker.db-shm   (WAL, normal locking)
```

**7.1 Pragmas.**

| Connection | Pragmas | Why |
|---|---|---|
| writer and checkpointer (read-write) | `journal_mode=WAL`, `synchronous=FULL`, `fullfsync=ON`, `checkpoint_fullfsync=ON`, `wal_autocheckpoint=0`, `journal_size_limit=16777216`, `busy_timeout=5000`; locking mode left at NORMAL; P2Q's `calibrate()` on both | R23's durability set, minus EXCLUSIVE (1, 5); the size limit truncates the WAL after each reset (a 703 MB reset cost one 994 ms commit, 3.3) |
| readers | open with `readonly: true`; `fullfsync=ON`, `checkpoint_fullfsync=ON` (inert on a read-only connection, kept against a future change); no `mmap_size` in the base design | a read-only connection never checkpoints at close (5 item 1); mmap is a measured +56 to 63% read option with different failure behaviour (4.2) |
| lock | separate file `broker.lock`: `locking_mode=EXCLUSIVE`, `BEGIN EXCLUSIVE; COMMIT` once, connection held open | 2.4 ms acquire, refuses same-process and other-process contenders, freed by SIGKILL (1.2 T3, T7) |
| all | assert `sqlite_version() >= 3.51.3`; never open either file with `fs` | WAL-reset fix (5 item 3); `fs` close drops POSIX locks (1.1) |

**7.2 Lock and start-up order.** (1) Acquire `broker.lock` (a contender gets `SQLITE_BUSY` and exits). (2) Open the writer connection and read the marker (this runs WAL recovery if the last owner crashed). (3) `wal_checkpoint(PASSIVE)` on the writer connection, which syncs any frame recovery adopted (1.3). (4) Bump `epoch` in a transaction; run R23's cross-checks (`ACKED` sidecar at or below head, replica markers and consumer checkpoints at or below head; refuse to start otherwise). (5) Start the checkpointer and the reader pool. (6) Admit traffic. Lost ACKs are resolved from `ops`, never by assuming failure (1.3). Measured takeover after SIGKILL: 41 to 53 ms p50 including a new Node process.

**7.3 Commit and ACK.** One transaction per command (or per command group): frame row (CRC chain, `committed_at`), `ops`, `heads`, H1 rows (`live_rows` and `retired_rows` moves), `marker(lsn, epoch)`. `commit()` returns after the WAL `F_FULLFSYNC` and after the wal-index header is published, so the ACK sent then is durable and every later read transaction includes it (5 items 4, 5). Then write the `ACKED` sidecar. Measured: 3.0 to 3.6 ms p50 with readers; H1 maintenance 0.06 to 0.07 ms of that.

**7.4 Snapshot API for the broker.**

```ts
interface Snapshot { lsn: number; epoch: number; horizon: number }   // read as the first statement
interface ReadRequest { kind: "pull" | "feed" | "sweepPage" | "range"; basis?: number; args: unknown }
interface ReadResult  { snapshot: Snapshot; basis: number; payload: ArrayBuffer }
read(req: ReadRequest): Promise<ReadResult>          // one read transaction in a reader thread
pinBasis(basis: number, owner: string): PinHandle     // holds H <= basis until released (sweeps, straddles)
```
- In the reader thread: `BEGIN`, then `SELECT lsn, epoch, h FROM marker` (this pins the snapshot), then `B = basis ?? lsn`. If `B > lsn`, wait up to H1's `WATERMARK_WAIT_MS` and retry, else route to the source; if `B < h`, route to the source (H1's eligibility rule). Run the queries filtered at B, `COMMIT`, return `{snapshot, basis: B, payload}`.
- A read transaction does one unit of work (one pull, one feed batch, one 64-subject page). Work that spans many units keeps its basis by `pinBasis`, not by an open transaction; the purge never deletes rows retracted after the lowest pinned basis. This is R24 5.2 item 1 ("pin by retention"); measured as 0 digest mismatches for 20,000 subjects and 0 straddle mismatches in 53,275 straddles (6.2, 6.3).

**7.5 Checkpoint policy.** The checkpointer thread runs `wal_checkpoint(PASSIVE)` every 4 s (measured: 66 of 74 complete, WAL 16 to 38 MB, 9.9 ms p50 on its own thread). The writer checks the WAL size every 25 commits; above 64 MiB it closes the gate: readers park between transactions (1 to 6 ms measured), the writer runs `wal_checkpoint(RESTART)` (7 to 57 ms), and reopens the gate. The gate never meets a long reader, because no read transaction lasts longer than one unit of work; as a second guard, lower the writer's `busy_timeout` to about 100 ms for the RESTART call so a stuck reader costs at most that `[E]`, never the 5.3 s measured in `sweep-restart`. Measured for the writer-thread variant of this gate: 15 gates in 10 minutes at 50 commits/s, WAL bounded at 64 MB, commit max 58 ms.

**7.6 Thread counts and memory.** Writer 1, checkpointer 1, readers 4 (measured 19,200 to 20,600 4-entity reads/s, or about 8,000 H1 pulls/s per thread; p99 36 to 46 ms at 256 clients). RSS about 400 MB with four busy readers (4.2). P5 sweep workers are reader-pool threads (or extra reader threads under R24's admission controller) that run the kernel on the rows and return only result records.

**7.7 Numbers this design rests on.**

| Property | Number | Section |
|---|---|---|
| Acknowledged commits lost over 80 writer SIGKILLs | 0 | 1.2 |
| Successor's first commit after SIGKILL, readers open | 41.4 ms p50 (SQLite lock), 52.9 ms (perl) | 1.2 |
| Writer `SQLITE_BUSY` from readers | 0 in about 300,000 commits | 3, 4, 6 |
| Read violations | 0 in about 91 million checked reads, including about 966,000 H1 pulls | 3, 4, 6 |
| Commit p50 alone / with 4 to 16 readers | 3.0 to 3.3 ms / 3.4 to 4.1 ms (WAL growing); 3.2 to 3.8 ms (WAL pre-grown) | 3.1, 3.2 |
| WAL growth while starved, 50 commits/s | 1.67 MB/s; 714 MB in 10 minutes; one 994 ms commit at the reset | 3.3 |
| WAL with checkpointer thread, 8 readers | 16 to 38 MB, 0 gates in 300 s | 3.3 |
| Reads/s, 4 reader threads, 256 clients | 19,210 to 20,556, p99 36 to 46 ms (owner thread: 7,296 to 7,634, p99 96 to 114 ms) | 4.2 |
| Event-loop delay p99, writer on main / on worker | 5.9 to 7.1 ms / 1.5 to 3.4 ms | 3, 4.1 |
| H1 pull, 151 facts, 3 hops | 0.10 to 0.11 ms p50, 0.34 to 0.91 ms p99, rows examined flat at 151 to depth 10 | 6.2 |
| H1 sweep, one thread | 9,570 subjects/s; 100k in about 10.5 s; 0 digest mismatches | 6.3 |

## 8. Open questions

1. **Checkpointer thread in a quiet window.** One 300 s run; its first two minutes (commit p99 16.6 and 26.4 ms) coincide with host load rising from 6 to 19, the last three are the best measured (6.0 to 8.3 ms). Repeat as two interleaved passes against the writer-thread checkpoint with the same gate, under the calibrated profile, and check whether two connections issuing `F_FULLFSYNC` at once lengthen commits.
2. **P1 p99 ratio.** Writer commit p99 at most 1.25x its zero-reader baseline cannot be resolved on this host (zero-reader runs minutes apart differ by 1.6x). Needs the quiet, calibrated profile and longer windows.
3. **H1 flatness.** Split layout: rows examined flat, p99 1.13x at 8 readers but 2.17x at 1 reader from one pass. Repeat with several interleaved passes, randomised phase order, and the larger P4 buckets (201 to 800 and 801 to 2,000 facts, 4 to 6 hops), at the 100k rung (EXP-P4: 3.85M rows), and check B-tree fragmentation of `live_rows` after many moves.
4. **Purge in chunks.** Only a single 533,000-row delete was measured (910 ms). Measure chunked purge between commits and its effect on commit p99, and the horizon policy (R24 open question 1): refuse a new `pinBasis` that would hold H too far below head.
5. **Power loss.** Not tested; every power-loss statement rests on `fullfsync` documentation, `wal.c` ordering and R23. An external power-cut test on this hardware remains the only direct check.
6. **Readers in another process.** The design keeps all readers as threads of the broker process. If a feed consumer or tool reads `broker.db` from another process, it can outlive a writer crash and read a frame adopted by recovery before the successor's PASSIVE sync (1.3); such a process should wait for the new `epoch` before reading.
7. **mmap.** +56 to 63% reads/s measured once; its `SIGBUS`-on-I/O-error behaviour and its effect on commit latency (4.37 ms p50 in that row against 3.36 ms) need a dedicated check before EXP-P4 uses it.
8. **Erasure** (R24 open question 4). `retired_rows` keeps erased values until the purge passes them; Q58e's per-subject keys must cover both H1 tables and the frames.
9. **Gate `busy_timeout`.** The 100 ms cap on the RESTART wait is an inference; measure it with a deliberately stuck reader.
10. **J01 frame size.** The claim that moving journal content into the frame adds about one page per commit is inferred from R23's size-insensitive commit times; measure with the real compact journal encoding once the broker writes it.

## 9. Sources

- Repository: `lab/NORTH-STAR.md`, `lab/TARGETS.md` (sections 1, 1.1, 2), `lab/research/R23-log-of-record-compositions.md` (sections 3, 5), `lab/research/R24-current-path-and-sweep.md` (sections 5 to 8); branch `exp/P2Q-qlever-log-broker` at f711193, `packages/qlever/src/broker/log.ts` (`KernelLock`, `calibrate`) and `broker.ts`; `lab/experiments/EXP-P4-current-path/REPORT.md` and `lab/bench/lib/current-table.ts` at 6f061a8; `lab/experiments/EXP-J01-bytes-per-commit/REPORT.md` at 5cc42fb.
- Web (fetched 2026-11-07): https://sqlite.org/wal.html, https://sqlite.org/lockingv3.html, https://sqlite.org/howtocorrupt.html, https://sqlite.org/c3ref/wal_checkpoint_v2.html, https://sqlite.org/changes.html, https://sqlite.org/pragma.html, https://sqlite.org/mmap.html.
- SQLite source: `R23/raw/sqlite/wal.c` (line numbers in this report refer to that copy).
- Raw results: `/Users/sam/Claude/Projects/triplex-db-2/R25/out/` (bench-*.json, pool-*.json, h1-*.json, locks-t*.json, vis.json, dur*.json, xfer.json, *-brief.log).

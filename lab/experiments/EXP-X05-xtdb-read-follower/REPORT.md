# EXP-X05 XTDB read-only follower on the writer's volume: report (saved by the orchestrator, 2026-11-08 00:17Z)

**Verdict: killed on reliability, not latency.** The follower shares the writer's Local log through the volume and its tail reader reads
half-written records (the Local log takes no file lock, R19 1.1). It died 9 times in about 30 minutes of load (6 under normal commits: 5 at
20 commands/s, about one every 3 to 4 minutes, and 1 at 100/s; 3 of 3 bursts of 20-60 KB commits within 2 to 32 s). Each death is permanent
(ingestion stops, healthz unhealthy, every read XX000 until replaced; a replacement was ready in 11-28 s and caught up within 0.3 s). It fails
closed: 0 wrong or stale answers over 570,821 checked rows; the 55,366 reads after deaths all errored. Cause: `ReadOnlyLocalLog.readLatestSubmittedOffset`
(ReadOnlyLocalLog.kt:58) from `withTail.readNewMessages` (:155): the writer appends each record with one FileChannel.write while the follower
stats the file and reads its last 8 bytes unlocked, sometimes seeing a file ending mid-record (one "offset" was 8680820740569200760 =
0x7878787878787878, the driver's `xxxxxxxx` padding); any record crossing a page boundary is exposed. The follower ran at 1.0 GiB (-Xmx512m,
256m direct, 128 MiB cache), peaked at 532 MiB and was never OOM-killed. Branch exp/X05-xtdb-read-follower head f20b9a7 (guard first in
6ce035a), merged into main ccf692c; packages/ untouched.

## Harness built (merged)
- Second-writer guard (`lab/bin/lib.mjs` volumeGuard): a container may start on a volume another container mounts only if its config says
  exactly top-level `readOnlyDatabases: true` (commented, nested, quoted, capitalised, duplicated or unparsable configs refused; other
  containers count in any state); `checkFollowerConfig` requires the writer's log and storage paths. 20/20 lab/bin tests; 5/5 driver tests.
  Live evidence lab/runs/X05/guard-live-s2-20261107T225712852Z.json (a second writer-config container refused; follower config passed; writer
  `down` refused with exit 3 while the follower existed).
- `engine.mjs --follower` up/down/logs (tx2-xtdb-<slot>-ro on the slot volume mounted :ro; own pool reservation under the slot lock;
  exclusive slots only; refused unless the writer is ready; writer `up --fresh` keeps its reservation; writer `down` refused while a follower
  exists). `--cpuset-cpus` for writer and follower (refused if overlapping; joins the effective config only when given, so unpinned slot
  hashes are unchanged). `--follower-profile small` (1.0 GiB, lab/config/xtdb-follower-small-config.yaml). Receipts bind both containers.
- Driver in lab/experiments/EXP-X05-xtdb-read-follower/ (driver.mjs, reader-worker.mjs, common.mjs): R16's 8-statement writer open loop on one
  frozen Poisson segment replayed per window with a forced block cut at +1 s; R16's 4-query 40-entity pull with `BEGIN READ ONLY WITH
  (AWAIT_TOKEN, SNAPSHOT_TOKEN, CLOCK_TIME)`; 60% hot roots, 10% split reads, basis 80/15/5; every row checked at the driver basis; logical
  readers share a 16-transaction in-flight cap (follower one connection per reader with numThreads 300; single node at most 28).
- Departures: writer 20/s on 8 connections (40/s saturated the writer with no readers: queue 157, p50 from schedule 1.6-4.2 s); a literal seed
  of 1,000-row INSERTs exhausted the writer's 2 GiB heap at about 50k rows (likely plan-cache bloat), reseeded with one parameterised statement.

## Writer latency per reader level (full run X05-s2-20261107T234308Z-ff17f3; host load about 13; VM vCPUs 86-98% busy; reported, not judged)
Baseline pooled Z0-Z3: commit p50 51 ms, p99 557 ms from schedule; service p50 50, p99 412; zero-reader windows Z0 61/570, Z1 71/737, Z2 36/254,
Z3 43/316.
| Level | Follower writer p50/p99 (ratio) | Single node writer p50/p99 (ratio) | Writer CPU F vs S | Pulls/s F vs S | Violations |
| --- | --- | --- | --- | --- | --- |
| 4 | 53/1,075 (1.05x/1.93x) | 77/567 (1.52x/1.02x) | 64% vs 151% | 31.4 vs 28.6 | 0 / 0 |
| 16 | 387/6,093 (7.6x/10.9x) | 6,452/21,044 (127x/38x) | 79% vs 110% | 8.0 vs 10.0 | 0 / 0 |
| 64 | 3,702/15,650 (72.7x/28.1x; follower died mid-window) | 275/3,323 (5.4x/6.0x) | 89% vs 125% | 6.5 vs 29.3 | 0 / 0 |
| 256 | 69/824 (1.36x/1.48x) | 290/1,439 (5.7x/2.6x) | 42% vs 130% | 35.3 vs 27.4 | 0 / 0 |
Levels 16, 64 and 256 put the same 16 transactions in flight on the follower (the cap), yet the writer ratio was 7.6x, 72.7x and 1.36x: host
load decides absolute results. Adjacent pairs consistently show the follower taking reads off the writer (writer CPU 42-89% against 110-151%).
Read p99 at 256 readers 11.3 s (follower) and 12.4 s (single node), almost all client cap wait.

## Lag and correctness
Lag (follower await-read minus the same read on the writer): raw ack-to-visible at zero readers p50 23-32 ms (3-4 round trips); excess at zero
readers p50 4.2-15.8, p99 34-54 ms; with follower readers F4 6.3/67, F256 45/451, F16 188/2,352, F64 173/1,061 ms. 570,821 rows checked, 0
violations, 0 torn, missing or duplicate rows; 1,381 split reads all repeatable (744 truly straddled). The driver-built snapshot token equalled
`SHOW SNAPSHOT_TOKEN` byte for byte and the follower accepted it (partly answers R19 open question 5). E5 over 2,497 commits: both tokens 2,370
exact; snapshot only 2,392 exact, 1 x 0B000 (0.04%); no token 2,378 exact, 5 stale (0.21%), 5 read ahead.

## Predictions
1. Writer within 1.25x at 16 follower readers: falsified as measured (7.6x/10.9x), confounded by VM saturation and a cold replacement; best
   matched point F256 1.36x/1.48x. 2. Lag p50 <= 10 ms, p99 <= 60 ms: holds at zero readers for p99 (4/4) and p50 (2/4); fails under readers.
3. Zero "log file corrupted" under 20-60 KB commits: falsified (3/3 bursts and normal commits). 4. Both tokens zero stale: holds; snapshot-only
0B000 on 1-15%: falsified low (0.04%), never stale. 5. Follower RSS <= 1.6 GiB holds (532 MiB); per-connection RSS 0.3-1.5 MiB falsified low
(0.02 MiB; 256 idle connections added 5 MiB; numThreads 300 opened 256 connections in 1.3 s).

## Next (author's view)
Kafka (E8) or an upstream fix (ReadOnlyLocalLog treating an end-of-file footer mismatch as "not yet written, retry"). The Kafka topology
needs about 7 GiB (writer 3.5, follower 1.75, Redpanda 1.25, object store 0.5) against 4.5 GiB beside both residents. Until either exists,
reads fall back to the writer with a supervisor replacing the follower (11-28 s of fallback per death). Receipts in lab/runs/X05/; raw logs in
/Users/sam/Claude/Projects/triplex-db-2/X05/. Resources released.

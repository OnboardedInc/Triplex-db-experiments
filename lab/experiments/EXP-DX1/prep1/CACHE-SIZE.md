# Test a 32 GiB transactor object cache

**North star P2.** Scheduled offer to durable ACK on the same sealed database of 162,456,470 business facts, roughly 430 million native records. These five-minute cells diagnose the writer without the background readers used for the P2 score. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## What the checkpoints can see

All three published checkpoints retained index creation and adoption clocks, the memory-index gauge, and the configured 16 GiB object-cache limit. Their archived metric stream has no object-cache occupancy, eviction counts or vendor hit-rate samples. The memory index and object cache are different. Per-save `ocache` includes accesses that descend to storage. The ratio of `sql` to `ocache` is SQL read-through on the instrumented write, with no observed intermediate cache-counter use. It does not measure process-wide hit rate. SQL counts read requests to PostgreSQL, including requests it can satisfy from memory. Per-index `*-load` counts describe segments absent from the object cache and do not form an additive breakdown of SQL fetches. [Datomic I/O stats](https://docs.datomic.com/reference/io-stats.html) · [Datomic monitoring](https://docs.datomic.com/operation/monitoring.html)

| At 394/s | SQL/save outside → during jobs | Mean apply outside → during jobs | SQL-through share outside → during jobs |
| --- | ---: | ---: | ---: |
| Barrier 6 | 1.25 → 1.57 | 1.73 → 2.79 ms | 8.22% → 10.41% |
| Rolling 6 | 1.27 → 1.53 | 1.69 → 2.73 ms | 9.72% → 11.86% |
| Rolling 12 | 1.28 → 1.59 | 1.76 → 2.75 ms | 9.77% → 12.27% |

These rows use native apply starts over the whole measured tape, with job intervals aligned by the host clock. Compared with each job's prior ten seconds, SQL reads/save rose during all five jobs in each 394/s arm. At 235/s the pooled job intervals had fewer reads than the remaining tape in all three arms. At 620/s the pooled job intervals rose by 0.21, 0.05 and 0.09 reads/save in barrier 6, rolling 6 and rolling 12. The relationship depends on load and phase. The earlier 201.83 → 361.51 saves/s observation changed the object cache from 2 to 16 GiB and CPU from one to three cores together. [Earlier scale comparison](https://github.com/OnboardedInc/Triplex-db-experiments/blob/64a76c50d/lab/experiments/EXP-DX1/scale1/SCALE-TUNE.md)

| At 394/s, matched late bins | SQL/save clear → spell | AEVT loads/save clear → spell | EAVT loads/save clear → spell |
| --- | ---: | ---: | ---: |
| Rolling 6 | 0.99 → 1.57 | 0.74 → 1.04 | 0.81 → 1.00 |
| Rolling 12 | 0.98 → 1.64 | 0.72 → 1.06 | 0.75 → 1.08 |

The matched late bins are seconds 170–190 and 230–250 against 200–220 and 270–290. AVET loads remained at roughly 0.001/save or less and VAET stayed at zero. Both hot-path indexes account for essentially all additional by-sort loads in these bins. Pooling each entire 394 tape weakens the per-index effect. Across all active jobs EAVT and AEVT loads are roughly flat even as SQL read-through rises. The checkpoints carry no segment identities or reuse distances to resolve the difference.

| 394/s, late index job | SQL/save in prior 10s → during → following 10s | Peak full second during job |
| --- | ---: | ---: |
| Rolling 6, 198.76–219.03 s | 1.57 → 1.61 → 1.03 | 2.03 at 207 s |
| Rolling 6, 262.75–285.26 s | 1.27 → 1.38 → 1.36 | 1.86 at 277 s |
| Rolling 12, 198.74–217.85 s | 0.75 → 1.54 → 1.48 | 1.84 at 213 s |
| Rolling 12, 262.70–284.44 s | 1.30 → 1.61 → 1.51 | 1.87 at 278 s |

The peaks arrive before adoption. Re-reading rewritten segments after adoption can explain some persistence and cannot explain those peaks. Build-time cache competition is consistent with the peaks and the concentration in EAVT and AEVT. Rolling 6 was already at 1.57 SQL reads/save before the first late job and some jobs left reads elevated after adoption. This leaves room for phase locality, changes in SQL read-through within the same sorts, and concurrent CPU or I/O pressure. The checks do not tell whether the 16 GiB cache was full. [Core-split clocks](CORE-SPLIT.md)

The durable evidence includes `p17-cache/reads-by-second.json.gz` with exact save and read denominators by second and by job, and `reads-around-index-jobs.tsv.gz` with per-save rates for every observed second within each job and its ten-second shoulders for all three arms. Partial bins and truncated jobs keep their observed denominators. [Evidence checksums](SHA256SUMS)

## Server add-on

Run the clean checkout pinned in the [report](REPORT.md). A single 60-minute-capped command runs independent copies of the same four 300-second tapes at 394 and 620/s, first using rolling 6 and three transactor cores with 32 GiB cache, then the same cache with the five-core split. Each arm has 20 minutes of offers and a 29-minute attempt limit (plus up to 20 seconds for shutdown). The queued fresh and 16 GiB five-core commands retain their original pins. The two-rate tapes match their 394 and 620 cells, with the same caveat about absent 235 history as the five-core add-on.

Both transactors use Java 25 ZGC with `-Xms1024m -Xmx49152m -XX:MaxDirectMemorySize=8192m`, a 32 GiB object cache and a 60 GiB container. Keep `index-parallelism=1`, ZGC `ConcGCThreads=2` and `ParallelGCThreads=3`. The three-core arm uses the headline CPU placement and `ActiveProcessorCount=3`. The combination uses transactor cores `0,4,5,7,8`, `ActiveProcessorCount=5` and writer cores `2,3`. PostgreSQL is capped at 8 GiB, the writer at 6 GiB and reader at 5 GiB. Role caps total 79 GiB, leaving up to 17 GiB for the host and page cache on a 96 GiB machine or about 10.4 GiB at 96 decimal GB before reserved memory. The harness requires at least 89 GiB on Linux `MemTotal`; it reads back each cgroup's actual cap. This is budget headroom shared with the OS and runner. File cache charged within the cgroups also counts against their caps.

The larger heap and smaller direct cap make the extra cache feasible. The primary comparison is the SQL read-through effect of this memory treatment. Latency can also move through ZGC, direct allocation or page-cache effects. Keep durability, WAL placement and all other roles' memory settings fixed. Collect each role's cgroup memory current, anonymous and file bytes and events once per second. Retain Datomic's process-wide `ObjectCache` hit samples and `ObjectCacheCount` if emitted, plus JVM heap-used and direct-buffer pool samples on the metrics callback. Heap use and count remain proxies for occupancy, and absent vendor metrics remain unknown. [Datomic cache layout](https://docs.datomic.com/operation/caching.html) · [Datomic heap guidance](https://docs.datomic.com/operation/capacity.html)

```bash
DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-PREP1-cache32 -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh cache32 "$CACHE32_OUT" 97aced1b1128ca54da2a72003299f38d805f1abc \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$SCALE1_PGDATA" --wal-mount "$SCALE1_WAL_MOUNT"
```

## Forecast before launch

The read and apply forecasts refer to matched late intervals outside and inside index work, when the cache has had time to fill. Cold-start writes and recent rewritten segments will still miss. The five-core combination primarily shortens apply and index overlap, with similar per-save read counts.

| 32 GiB treatment | Offered/s | SQL/save outside → inside | Mean apply outside → inside | Stored/s whole / second half | Second-half busy p99 | Loaded quiet p99 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 transactor cores | 394 | 0.55 → 0.95 | 1.10 → 1.90 ms | 394 / 394 | 90 ms | 47 ms |
| 3 transactor cores | 620 | 0.70 → 1.05 | 1.22 → 2.05 ms | 495 / 515 | 30,025 ms | 50 ms |
| 5 transactor cores | 394 | 0.55 → 0.95 | 1.08 → 1.62 ms | 394 / 394 | 60 ms | 43 ms |
| 5 transactor cores | 620 | 0.70 → 1.05 | 1.20 → 1.78 ms | 520 / 540 | 30,025 ms | 48 ms |

The decisive result is a smaller increase in SQL and AEVT/EAVT loads during jobs on three cores. If the 394/s spell still shows roughly 1.0 → 1.6 SQL reads/save despite evidence of heap headroom, the cache-size explanation loses. If only the five-core arm improves latency and the read counts remain flat, CPU headroom is the better explanation for that latency gain. If aggregate cache hit rate improves and only the post-adoption spikes remain, check generation turnover rather than attributing all misses to eviction during the build.

## Production sizing

Treat 32 GiB near 430M native records, 74 GiB at 1B and 595 GiB at 8B as DX-W1's fitted active-set estimates for this writer tape. Size a host from measured concurrently active owners and read-through at its intended load, and budget JVM headroom, PostgreSQL, peers and page cache on top. Even 74 GiB for cached objects alone would strain this server. The small owner head is the path to capping the amount of cold owner history the serial writer touches. It keeps exact revision, identity, retirement and history semantics with a separate bounded read layout, so the hot write footprint can track current owners and their activity instead of scaling with retained history. [DX-W1 retirement and owner-head model](https://github.com/OnboardedInc/Triplex-db-experiments/blob/ad2e188a9/lab/experiments/EXP-DX1/w1/RETIREMENT-READS.md)

## Verification and custody

Mac launch-policy and flag readback checks ran under one ordinary heavy token. The two new arms accepted the expected role flags and refused the stale heap, direct limit and object-cache setting. The original fresh and five-core tape plans matched their archived bytes. No Mac engine or live Linux trial ran.

The cohort reader consumes published archive and member digests, joins the bound original offer tape, attempt, database and receipt to the exact native transaction and pairs the same database's index clocks. The live preflight accepts startup flags and mounted properties only for the owned slot and planned arm before any offers. The collector repeats those checks, binds observed cgroup CPU/memory and counter rows to the current slot, source, boot and process IDs, and hashes the retained inputs and readbacks. Receipt durability and content checks are inherited intact. No contract pins moved. [Evidence checksums](SHA256SUMS)

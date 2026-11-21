# Why the maintained load slowed

The verified continuation stopped at **514,741,853 indexed records**, native t **38,613,452**, logical head **4,034,400** and **165.738 GB** of allocated PGDATA. The host was charged **2h 14m 53s** across the ladder and maintained load. Step 1 extends that budget to 26 hours while preserving the stopped run. [Extended limits and command](EXTENDED-LIMITS.md)

The observations below come from the source-bound maintained archive at `6d3d44641` and its two progress receipts. The solo comparison is the original three-core ladder at `acd350e92`. PostgreSQL counters are deltas over each write phase. Datomic means are weighted by sample count in complete minute buckets. JVM intervals come from the first and last timestamps in the per-process logs, which include startup and teardown. [SCALE1 maintained readout and evidence](https://github.com/OnboardedInc/Triplex-db-experiments/blob/15ecd2d39/lab/experiments/EXP-DX1/scale1/AGE1-LOAD.md)

## 1. Where writing waited

| Signal during writes | Solo ladder | Maintained 1 | Maintained 2 |
| --- | ---: | ---: | ---: |
| Indexed records/s | 19,760 | 13,270 | 11,928 |
| Loader time inside submission | 61% | 72% | 74% |
| Datomic transaction apply, mean ms | 0.863 | 1.457 | 1.654 |
| Datomic cache hit fraction | 84.5% | 73.8% | 70.0% |
| Datomic storage-get mean ms | 0.128 | 0.214 | 0.216 |
| PostgreSQL buffer reads per million records | 63k | 494k | 613k |
| WAL bytes per indexed record | 721 | 1,438 | 1,595 |
| Mean WAL sync, ms | 0.170 | 0.229 | 0.244 |
| Index writes per million sampled datoms | 26.8k | 63.2k | 68.9k |
| Adopted index job count and median duration | 59 · 11.8 s | 32 · 18.8 s | 44 · 21.0 s |

The loader was already feeding at depth 256 and spent most of each window waiting inside submission. Mean apply predicts about **686 and 604 solo transactions/s** if serialized, close to the observed **664 and 596/s**. Server-side apply is the clearest elapsed bottleneck. Its clock can include storage waits. The transactor used 3.54 and 3.43 of six cores. Loader safepoints were 12 and 22 s, and transactor safepoints took 86 and 113 s. The pause fraction fell on the slower window. [Datomic transaction processing](https://docs.datomic.com/transactions/transaction-processing.html)

Lower cache hits, more storage reads and roughly double the WAL per record support increased work in the storage path. The almost flat PGDATA and TOAST allocation establishes reuse. It cannot identify free-space map or TOAST reuse as the cause of extra apply time. PostgreSQL had a **one-CPU affinity in both runs**. The archive lacks its CPU utilization, run queue, per-backend waits and NVMe queue metrics, so it cannot distinguish PostgreSQL CPU saturation, storage wait or contention between index and transaction I/O. PostgreSQL buffer reads can include operating-system cache hits. [SCALE1 host placement](https://github.com/OnboardedInc/Triplex-db-experiments/blob/15ecd2d39/lab/experiments/EXP-DX1/scale1/decision/age-host.ts)

The 256 MiB threshold coincided with fewer jobs per minute and larger jobs than the ladder at 128 MiB. Paired jobs occupied about 51% of both maintained write windows versus about 83% in the fast solo ladder. Job count or total occupied time alone cannot explain the regression. In window 2, intervals with at least 60% index overlap delivered **10,785/s** versus **12,731/s** at at most 40% overlap. The same split did not depress window 1. That supports contention during the later window without isolating the threshold from cache state, changed index work, the larger database or placement. Neither window reported a back-pressure alarm. [Datomic indexing and thresholds](https://docs.datomic.com/operation/capacity.html#indexing)

## 2. Where maintenance time went

| Step | Total after writes | Native collector JVM | Vacuum JVM | Drain, readback and boundaries |
| --- | ---: | ---: | ---: | ---: |
| Initial backlog | 1,403.1 s | 776.2 s | 612.8 s | 14.1 s |
| Window 1 | 353.7 s | 193.9 s | 135.9 s | 24.0 s |
| Window 2 | 578.1 s | 319.2 s | 219.7 s | 39.1 s |

Maintenance added 30–32% to writing time, or 23–24% of the full recurring cycles. The collector plus vacuum JVMs accounted for **93%** of that extra time in both cycles. The remaining time includes the **12 and 27 s** index settlement, peer startup, readback and dispatch. The transactor stayed up. The collector spent **119 and 121 s per million segments**, and the vacuum JVM spent **15.5 and 15.2 s per million TOAST deletions**. The vacuum log lacks per-phase progress, so it cannot split heap, TOAST and index cleanup time.

- Collecting every other window while keeping vacuum at each boundary could amortize fixed effort. It leaves rows for retired Datomic segments live in SQL for an extra window. Vacuum cannot reuse those pages until after Datomic deletes them. The next collection will still owe those deletes and the directory high-water mark could grow.
- The current ordinary vacuum specifies `PARALLEL 2`. More workers affect eligible index cleanup only. PostgreSQL requires at least two eligible indexes on a relation, and the standard Datomic table and its TOAST table each have one. More workers are unlikely to help their heap or TOAST scans. [PostgreSQL VACUUM](https://www.postgresql.org/docs/17/sql-vacuum.html)
- The collector already uses `datomic.deleteConcurrency=8` and `datomic.readConcurrency=16`. Raising them could help if the collector lacks enough requests in flight. It could also increase SQL contention on one core. At the same cutoff it leaves the same live segments, so any disk benefit comes from earlier reuse. [Datomic gc-db options](https://docs.datomic.com/operation/capacity.html#separated-garbage-collection-tool-for-datomic)

## 3. Trend and time to 1B

The slowdown persisted within the sampled windows. Median 30-second writing rates fell from **13,152 to 11,894/s** and the final steady rates fell from **12,701 to 11,771/s**. Lower cache hits and longer jobs are consistent with that observation. Two adjacent windows cannot establish a size law. The archive has segment counts and durations but no level census. It cannot identify a level transition or show how much of the slowdown will persist.

| Maintained-rate scenario | At 750M | At 1B | More time from the held cut | Total paid loading |
| --- | ---: | ---: | ---: | ---: |
| Latest measured rate persists | 9,023/s | 9,023/s | 14h 56m | 17h 11m |
| Illustrative gradual decline | 8,100/s | 7,300/s | 16h 40m | 18h 55m |
| Exactly at the new floor | 6,500/s | 6,500/s | 20h 44m | 22h 59m |

The gradual scenario changes rate linearly with the record count between the held cut, 750M and 1B. It is a sensitivity case. At the latest rate, 750M is about 7h 15m away and the total loading bill at 1B is about **$18.73**. The last two post-maintenance allocation slopes mechanically project **179–186 GB** at 1B. The archive cannot show when the free pages will be exhausted. Keep the 400 GB ceiling.

## 4. Window-boundary decision

Keep the profile unchanged. No single adjustment has a source-bound comparison that supports a rate prediction. The strongest unanswered question is pressure on PostgreSQL's one allocated CPU. CPU utilization and pressure from that cgroup, sampled PostgreSQL wait classes and vacuum phase progress would distinguish the next candidate without writing anything to the database. No loader or measurement setting changed in Step 2.

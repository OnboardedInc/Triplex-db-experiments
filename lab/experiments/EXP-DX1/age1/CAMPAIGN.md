# DX-AGE1 server campaign

Keep all accounts in one writable Datomic Pro database. Measure P1 exact pins, P2 durable saves, P3 feed resume and P4 the current read path as history grows. Hold the population fixed. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Admission and cost

Reserve one server at $1.09/h under the $130 budget (~119.3 h). Price the initial load independently if a compatible 0.82B base is unavailable. The generator requires its own known subject identities, starting rows, revision and clock ledger. A different load cannot supply that starting point.

| Rung | Added records | Added hours / USD at 20,097 records/s | Cumulative USD | What the rung buys |
| --- | ---: | ---: | ---: | --- |
| 1B | 0.18B | 2.49 / 2.71 | 2.71 | First instrumented baseline past the mixed seed. |
| 2B | 1B | 13.82 / 15.07 | 17.78 | First doubling for drift in head, old-cut and indexing costs. |
| 4B | 2B | 27.64 / 30.13 | 47.91 | Second doubling to distinguish a flat path from sustained growth. |
| 8B | 4B | 55.29 / 60.26 | 108.17 | Proposed operating boundary and full-copy budget. |

The baseline uses the observed 300,000-record Mac load at 20,097 records/s over 14.93 s. Its three segments ranged from 17,225 to 22,022 records/s. It establishes a short full-shape rate at this age. The earlier floor reached 68,471 bare members/s in a short Mac sample with 128 minimal members per transaction. K preserves a physical transaction per save and includes indexed IDs, a journal, revisions and retractions. At 10k records/s, cumulative aging costs $35.73 through 2B, $96.28 through 4B and $217.39 through 8B. At 50k, the 8B age-only cost is $43.48. Set aside 15 hours ($16.35) for traffic, full copies and recovery measurements. From a compatible 0.82B base, 8B requires about 19.1k sustained records/s after that reserve. Plan through 4B. The slowest observed segment would cost $126.21 in aging alone through 8B. Starting instead from a 0.25B compatible synthetic seed would cost $116.76 in aging at the baseline rate, plus seed creation and measurement time. Start the 8B rung only if the compatible starting point, last-rung rate and observed recovery cost leave room under the budget and peak disk cap. End the campaign on any exactness failure, sustained backpressure or live service limit violation. [Capacity guidance](https://docs.datomic.com/operation/capacity.html)

## Predictions to freeze before execution

These engineering priors assume PostgreSQL on local NVMe, 3.5/50 offered saves/s, one ordered writer and indexing at 32 MiB threshold, 512 MiB maximum and one indexing thread. Initial transactor/peer object caches are 512/768 MiB with room in the heap for indexes, buffers and GC. Mac ratios are comparable only for matched mechanisms. Use the first server rung to test the absolute values.

| Metric | 1B | 2B | 4B | 8B |
| --- | ---: | ---: | ---: | ---: |
| Low save p50/p99, ms | 8/24 | 8/25 | 9/28 | 10/35 |
| Busy save p50/p99, ms | 9/36 | 10/40 | 11/48 | 14/65 |
| Save p50/p99 during fixed-debt index job, ms | 10/48 | 11/55 | 13/68 | 16/90 |
| Current warm recent p50/p99, ms | 3/10 | 3/10 | 3/11 | 3/12 |
| Current warm year-idle p50/p99, ms | 3/12 | 3/12 | 3/13 | 4/14 |
| Current first peer recent / year-idle, ms | 25/35 | 28/40 | 31/45 | 34/50 |
| Near pin warm recent p50/p99, ms | 4/14 | 4/15 | 5/17 | 5/19 |
| Near pin warm year-idle p50/p99, ms | 4/15 | 4/16 | 5/18 | 5/20 |
| Near pin first peer recent / year-idle, ms | 35/45 | 39/51 | 43/57 | 47/63 |
| Old cut warm p50/p99 and first peer, ms | 6/20; 50 | 7/23; 58 | 8/26; 66 | 9/29; 74 |
| Seven-entry feed page p50/p99, ms | 3/12 | 3/13 | 4/14 | 4/16 |
| Fixed-debt index request to adoption, s | 12 | 16 | 20 | 24 |
| Transactor / live read peer PSS, GiB | 1.8/1.3 | 2.1/1.5 | 2.3/1.7 | 2.4/1.8 |
| Settled SQL organization estimate, GB | 178 | 254 | 407 | 714 |
| Indexed allocated SQL sensitivity, GB | 203 | 419 | 851 | 1,715 |
| Native backup bytes, GB | 125 | 178 | 285 | 500 |
| Full backup / full verify / native restore, h | 0.69/0.35/0.50 | 0.99/0.49/0.71 | 1.58/0.79/1.13 | 2.78/1.39/1.98 |

SQL estimates carry forward the analyst's 164 GB base and 1,531 settled or 4,313 allocated bytes per save at 19.992 datoms/save. The backup prior uses 0.70 × settled bytes and 50/100/70 MB/s for backup/verify/restore. Restore adds fresh open and exact readback. Provision WAL, filesystem reserve and duplicate copy overlap separately, including the destination. [Backup and restore](https://docs.datomic.com/operation/backup.html)

## Run sequence

1. Record a fresh attempt, exact source and engine hashes, hardware and caps, Java and SQL versions, disk devices and write durability. Run fidelity before aging. Freeze ten deep accounts of about 100k people each, the fixed active cohort and four wide accounts with few fields per person. Freeze the generated command tape and simulated clock.
2. On the already provisioned private stack, use the staged product gateway source and set TX2_SAVE_LEDGER=1 and TX2_SMALL_ROWS=1. Use solo K with packed journal and grouping disabled. Set AGE_ATTEMPT, DATOMIC_URI_TEMPLATE, AGE_SQL_JDBC, AGE_SQL_PASSWORD and a capacity-based AGE_MAX_SQL_BYTES through the private runtime. Run the Clojure entry point triplex.age.scale init with the deep and thin people counts per account. Save the actual scope, population, seed record count and basis. A resumed seed must reproduce the full expected active state.
3. Use node model.mjs targets with the initial record count and active-subject count to convert each absolute rung to the first tape position at or above it. Run triplex.age.scale rung with the deep count, thin count, scope, previous save count, target save count, low sample count and busy sample count. Carry its ending logical head into the next rung. Bind counted records to physical saves and account for schema, index occurrences and SQL/WAL separately. Reconcile the exact native log prefix before resuming any unknown outcome.
4. Repeat the same low/busy schedules and index-overlap profile at each age. Measure both warm and one fresh JVM per cold probe, with the same probes as the Mac harness. Record in-job sample denominators, adoption and index logs, PSS, physical I/O, GC and SQL/WAL. Repeat matched windows with the same novelty before distinguishing growth laws. New JVMs isolate peer cache. Cold storage needs its own admitted repeated arm. Verify returned rows, ACKs and feed positions every time.
5. At the end of each rung, quiesce writes and index through the last acknowledged basis. Take a new full native backup and verify all segments at the exact listed cut. Restore to clean SQL storage with no destination transactor. Run triplex.age.scale restored with the population counts, scope, save count and restore t. Verify the last ACK, current and old pinned rows and the feed. Time backup, full verification, restore and reopen/readback individually. Retain logs and manifests before removing temporary copies.
6. If adoption lags under the frozen novelty, try the 256/1,024 MiB memory-index settings if the heap can support them. Try index-parallelism 4 or 8 for CPU-bound indexing with spare storage capacity. If cold or write tails are I/O-bound, vary object-cache size, try a local NVMe Valcache and measure PostgreSQL storage wait and fsync. Vary one arm at a time. [Caching](https://docs.datomic.com/operation/caching.html) · [Indexing](https://docs.datomic.com/indexes/background-indexing.html)

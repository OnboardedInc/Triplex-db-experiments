# Fresh v0.1 scorecard

All four arms and twelve matched pairs completed on the sealed fresh database with ten accounts of 100,000 people. With the tuned ordered writer, 235 offered saves/s yielded 234.98 in-window, and 394 yielded 342.90. At 394 all 35,460 saves eventually received durable acknowledgements. The quiet account's commit p99 increased from 13.70 to 69.63 ms. Each writer exceeded the quiet 1.25× commit ratio at its lightest tested rate of 50/s.

| Writer | Offered/s | Durable in-window/s | Total durable/offered | Expired / durable after window | All save p50/p99 ms | Quiet commit p99 solo → loaded | Quiet read p99 ratio | Quiet feed p99 ratio |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| Ordered ZGC | 50 | 50.00 | 4,500/4,500 | 0 / 0 | 9.73 / 118.78 | 22.91 → 53.50 ms · 2.34× | 1.00× | 0.76× |
| Ordered ZGC | 235 | 234.98 | 21,150/21,150 | 0 / 2 | 47.10 / 2392.06 | 20.09 → 88.06 ms · 4.38× | 1.67× | 1.46× |
| Ordered ZGC | 394 | 342.90 | 35,460/35,460 | 0 / 4,599 | 9895.93 / 12517.38 | 13.70 → 69.63 ms · 5.08× | 1.69× | 1.33× |
| Ordered ZGC | 620 | 329.42 | 39,554/55,800 | 16,246 / 9,906 | 29753.34 / 30130.83 | 18.94 → 76.80 ms · 4.05× | 2.10× | 1.62× |
| Ordered G1 | 50 | 50.00 | 4,500/4,500 | 0 / 0 | 8.83 / 204.80 | 26.75 → 151.55 ms · 5.67× | 1.28× | 1.22× |
| Ordered G1 | 235 | 232.59 | 21,150/21,150 | 0 / 217 | 82.43 / 1105.92 | 43.52 → 113.66 ms · 2.61× | 2.13× | 1.83× |
| Ordered G1 | 394 | 296.59 | 35,460/35,460 | 0 / 8,767 | 15138.82 / 23192.14 | 67.07 → 115.71 ms · 1.73× | 1.59× | 1.87× |
| Ordered G1 | 620 | 305.24 | 37,144/55,800 | 18,656 / 9,672 | 29753.34 / 30146.56 | 41.22 → 115.71 ms · 2.81× | 2.28× | 1.66× |
| Grouped G1 | 50 | 50.00 | 4,500/4,500 | 0 / 0 | 7.36 / 528.38 | 40.96 → 569.34 ms · 13.90× | 0.70× | 2.43× |
| Grouped G1 | 235 | 167.78 | 21,150/21,150 | 0 / 6,050 | 19136.51 / 29491.20 | 36.09 → 201.73 ms · 5.59× | 7.87× | 1.80× |
| Grouped G1 | 394 | 158.56 | 20,401/35,460 | 15,059 / 6,131 | 30015.49 / 30146.56 | 48.38 → 548.86 ms · 11.34× | 1.78× | 2.61× |
| Grouped G1 | 620 | 174.02 | 22,063/55,800 | 33,737 / 6,401 | 30015.49 / 30146.56 | 43.26 → 214.01 ms · 4.95× | 1.69× | 2.29× |

Each pair offered 315 quiet saves per side over 90 seconds, with 3,840 checked reads and 315 observed feed entries per side. All quiet saves completed and every tested read matched. Every offered write across the matched windows was accounted for. The all-save latency columns count committed saves, including those acknowledged after the window. No independent repeat or confidence interval was collected for these short scorecard cells.

In the six-minute zero-reader and reader windows, all 1,260 saves and corresponding feed rows matched in each. Save p50/p99 were 5.57/24.58 ms and 5.60/22.53 ms. At 64 reader seats, 93,648 checked reads completed during the minute with read p99 146.43 ms and 1,560.8 reads/s. At 256, 53,591 completed with p99 860.16 ms and 893.18 reads/s. These bounded pinned reads do not constitute a full deep v3 goodput measurement. The import recorded 344,832 facts in 10,776 frames over 108 s, with 341,536 queryable by its check (3,192.89 recorded facts/s). The full P8 scale and the separate Publish and machine-loss rows remain open.

The tuned headline used Java 25 ZGC on three cores with a 24 GiB heap, 16 GiB Datomic object cache and the separate WAL device. Both gateways used Java 21 G1 on four write cores and one read core. The ordered G1 and grouped G1 controls used Java 21 G1 with the same transactor core and cache budgets, with WAL on their data devices. Grouped data used the spare drive because three ordered copies occupied the main drive. The timing covers this combined configuration. Absolute GC logs for all three roles, scheduled offer and client reply times, gateway stage durations and native transaction clocks are in the archive.

The scorecard used the published `3a71c1767` workload and `92f8e6c30`, which changes only the Docker PID census. The loaded arm passed the repaired empty-residency measurement. Its launch, copy, option, data and freshness checks remained in force. This card reports the bounded observations alongside the existing bars.

Forecast and actual. The tuned forecast at 394 was 325–365/s and landed at 342.90. At 620 it forecast 330–380/s and measured 329.42. The ordered default forecast was 340–380 at 394 and 320–365 at 620. It delivered 296.59 and 305.24. Grouped forecast 147–182/s at 235 and above, with 167.78, 158.56 and 174.02 observed. Native elapsed time including live startup and cleanup was 78 min 35 s and USD 1.43 against a 300-minute, USD 5.45 cap. The systemd unit including its wait for staging took 87 min 26 s and USD 1.59.

The archived benchmark is 105,763,500 bytes. The Mac copy contains the generated scorecard, all matched operation ledgers, observers, JVM logs and control receipts in the collection allowlist. The archive hash matched both hosts. [Scorecard and readout hashes](evidence/score-v01-fresh-tuned.sha256)

## Predictions beside each scorecard row

| Row | Forecast before the fresh run | Fresh observation |
| --- | --- | --- |
| P1 pinned reads | Exact pinned answers, higher p99 at the top of the reader ladder and continued writer progress. | Zero reported errors in 288,792 checked reads over six one-minute cells. L256 delivered 893.18/s at 860.16 ms p99. L1024 delivered 509.43/s at 2,375.68 ms p99. All 1,260 saves completed and the whole-window writer p99 ratio was 0.917×. |
| P2 commits | Ordered near 50/s at 50 and 220–235/s at 235. At 394/620 expect 325–365/330–380 for the tuned setup and 340–380/320–365 for default. Grouped 147–182/s at 235 and above. | Both ordered setups met the delivery forecast through 235. Tuned delivered 342.90/329.42 at 394/620. Default delivered 296.59/305.24. Grouped delivered 167.78, 158.56 and 174.02 at 235, 394 and 620. The table above gives the offer counts and deadlines. |
| P3 change feed | Exact order, positions and changes. Queueing and polling could widen the tail. | 1,260 exact changes in the loaded six-minute window. Dispatch-to-observation p99 98.30 ms. Crash resume and effects remain open. |
| P4 current pulls | Exact projected fields and faster warm reads. | 1,000 current demands had p50 4.54 ms and p99 50.18 ms. The separate 200 first pulls had p99 66.56 ms. Depth and engine-byte checks remain open. |
| P5 Publish | Separate Server 1 campaign. | Unmeasured on this held roster. |
| P6 quiet account | Most busy ratios above 1.25×. At 394, about 3.35× tuned and 2.77× default. At 620, 2.29× tuned and 4.53× default. Grouped tails longest. | At 394, 5.08× tuned, 1.73× default and 11.34× grouped. At 620, 4.05×, 2.81× and 4.95×. The three writers also exceeded the commit bar at 50. Each side has 315 quiet saves, 3,840 reads and 315 feed entries. |
| P7 idle cost | First pulls slower than current pulls. A single-population residency difference. | Cold first-pull p99 66.56 ms across 200 probes. Transactor/write/read added RSS was 16.89/55.35/70.32 B per roster person, with 102/67/61 threads. The untouched-person slope remains open. |
| P8 paced import | Exact imported bytes and higher live lag. The fixed pace probes 3,000 facts/s. | 3,192.89 recorded facts/s across 108 seconds, 344,832 verified and 341,536 queryable by the window end. Highest account save/read p99 88.97/34.43 ms. A matched pacing control remains open. |
| P9 machine loss and move | Separate two-host drill. | Unmeasured here. |
| Queryable journal, receipts, mixed IDs | Exact journal and receipt matches. Both retired IDs refused and historical reads preserved. | All 1,260 loaded journal entries matched their receipts and durable claims were sampled. Both retired IDs returned `IdentityConflict`. Typed reads matched at the seed, pre-witness and both save cuts. |
| Erasure and acknowledged-write loss | Separate drills. | Unmeasured here. |

[Original forecasts](https://github.com/OnboardedInc/Triplex-db-experiments/blob/2e974a95b10a30a30ff3f46947df4f32beacc657/lab/experiments/EXP-DX1/v01/SERVER.md#predictions-written-before-the-run)

The 1B column remains unmeasured. The maintained AGE1 continuation stopped at 514,741,853 indexed records when its second write-and-maintenance cycle fell below the 9,900 records/s floor. No 1B replay or independent native-copy seal was produced. [Continuation and custody](AGE1-LOAD.md)

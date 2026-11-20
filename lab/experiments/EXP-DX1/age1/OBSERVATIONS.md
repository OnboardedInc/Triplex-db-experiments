# Mac observations

Datomic Pro 1.0.7745 used PostgreSQL 17 and 720 fixed people across 10 deep and 4 thin accounts. The 706 active people came from the same tape at every rung. Units are milliseconds unless shown. Parentheses give sample counts. Both native restores were read back at the independently listed backup t, and current rows, old pins, receipt and feed were verified. [Method](METHOD.md)

| Metric | 360,314 records | 1,260,314 records |
| --- | ---: | ---: |
| Native load records/s | 4,115 | 6,859 |
| Low 3.5/s save p50 / p99 | 25.68 / 1204.41 (24) | 18.71 / 838.28 (24) |
| Busy 50/s save p50 / p99 | 936.88 / 3172.69 (120) | 133.66 / 368.74 (120) |
| During index request interval, save p50 / p99 | 238.95 / 2880.27 (10) | 78.76 / 551.43 (43) |
| Index request during saves, seconds | 2.63 | 1.19 |
| Index settlement after load, seconds | 4.07 | 9.19 |
| Feed, seven journals, p50 / p99 | 7.95 / 41.64 (30) | 2.87 / 12.92 (30) |
| Transactor / measured peer PSS, MiB | 539 / 361 | 626 / 435 |
| Allocated SQL, MB | 73.68 | 283.71 |
| Native backup, MB | 21.13 | 74.29 |
| Backup / full verify / restore, seconds | 10.92 / 8.75 / 9.71 | 20.11 / 12.20 / 24.35 |
| Fresh restore peer and exact readback, seconds | 10.95 | 10.99 |
| Current, recent, warm p50 / p99 | 9.02 / 23.12 (40) | 11.36 / 30.84 (40) |
| Current, recent, first peer (1) | 311.85 | 540.85 |
| Current, year-idle, warm p50 / p99 | 9.49 / 23.84 (40) | 7.88 / 22.59 (40) |
| Current, year-idle, first peer (1) | 441.28 | 231.26 |
| Near pin, recent, warm p50 / p99 | 13.97 / 41.27 (40) | 9.36 / 34.37 (40) |
| Near pin, recent, first peer (1) | 318.38 | 247.59 |
| Near pin, year-idle, warm p50 / p99 | 11.42 / 30.11 (40) | 10.12 / 66.17 (40) |
| Near pin, year-idle, first peer (1) | 335.50 | 235.15 |
| Old cut, warm p50 / p99 | 14.28 / 51.30 (40) | 6.34 / 13.78 (40) |
| Old cut, first peer (1) | 280.65 | 305.36 |

Two complete rungs leave the flat, logarithmic and linear models unresolved for latency, memory, indexing and copy clocks. Allocated SQL moved from 12.15 MB at the 55,034-record seed to 73.68 and 283.71 MB. Incremental slopes were about 202 and 233 bytes/record. Native backup bytes grew 3.52× as indexed history grew 3.50×. The physical size observations are consistent with near-linear growth over this interval.

The 50/s ordered writer fell behind its offer schedule on the first rung. Busy p99 fell from 3.17 s to 0.37 s as the database grew. Ten and 43 save intervals overlapped the requested index windows, respectively. Queue depth and sampling variability limit any causal comparison. The idle and hot probes used fixed deep owners. First-peer samples retain PostgreSQL and guest caches. Absolute clocks are specific to this Mac, its runtime caps and the single writer.

The 180,000-save rung timed out after 105,264 tape saves. Its nine complete load segments added 900,000 records at 10,700 records/s, after two measured rungs averaging 5,875 records/s. These segments preserve exact native receipts but have no complete read, index, memory or copy set. The early separate 300,000-record load sustained 20,097 records/s over 14.93 seconds. [Evidence hashes](SHA256SUMS)

## Successor

All 14 accounts moved together at logical position 17. Both old and new pins, the current view and 15 feed entries matched across 112 person-cut checks. The archived writer refused the new save, and the retry returned the original native receipt at position 4. The successor continued at position 18.

The erasure copied 160 identity markers at each of two tested cuts. Fresh historical indexes contained zero affected rows and the tested native log frames lost the synthetic values. Already-held native database values still returned subject rows in both eras, and both affected ordinary journals lost their stored rows. The routed marker check and untouched sibling succeeded. Persistent publication of the erasure frontier, arbitrary cross-era joins and all backup and WAL copies remain open. [Evidence hashes](SHA256SUMS)

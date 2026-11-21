# Ordered writer durable-append tails

The dedicated WAL NVMe cut quiet p99 at 394 offered from 82.76 to 6.99 ms alone and from 338.13 to 103.99 ms under load. Both results improved in absolute time. The loaded ratio rose from 4.09× to 14.88× because the solo save improved more. The builder expected 1.6× and I expected 1.8–3.5×. At 235 offered the WAL ratio fell from 7.25× to 1.96×. Both ratios still exceeded 1.25×.

Each arm used the original sealed 16,245,050-fact population in one database, synchronous commit, and the pinned `df1b45d6b` tape. Every cell below used 315 quiet saves and a 90-second elapsed-offer window. The transactor, writer and reader had 1/4/1 cores. The control and WAL treatment both used Java 21 G1 everywhere. A fresh synchronous sentinel joined backend, commit, flush LSN and successful fdatasync before each measured arm.

| Arm | Offered/s | Window | ACKs in window / all offers | Saves/s | Quiet p99 ms · loaded/solo | Physical appends n | Append p50 / p99 / max ms | Appends over 20 ms by assigned cause |
| --- | ---: | --- | ---: | ---: | --- | ---: | --- | --- |
| Control | 235 | alone | 315 / 315 | 3.500 | 71.577 | 315 | 0.745 / 60.275 / 64.509 | WAL sync: 12 |
| Control | 235 | loaded | 21,149 / 21,150 | 234.989 | 518.693 · 7.247× | 16,476 | 0.424 / 4.650 / 400.859 | transactor safepoint: 13, unresolved: 2, flush remainder: 13, WAL sync: 17 |
| Control | 394 | alone | 315 / 315 | 3.500 | 82.763 | 315 | 0.457 / 77.207 / 80.462 | WAL sync: 14 |
| Control | 394 | loaded | 35,457 / 35,460 | 393.967 | 338.132 · 4.086× | 25,025 | 0.411 / 3.818 / 199.341 | checkpoint writeback: 2, transactor safepoint: 18, unresolved: 5, flush remainder: 13, WAL sync: 19 |
| Separate WAL | 235 | alone | 315 / 315 | 3.500 | 28.057 | 315 | 0.745 / 4.898 / 49.757 | transactor safepoint: 1 |
| Separate WAL | 235 | loaded | 21,149 / 21,150 | 234.989 | 54.961 · 1.959× | 17,672 | 0.428 / 4.237 / 85.922 | transactor safepoint: 7, unresolved: 2 |
| Separate WAL | 394 | alone | 315 / 315 | 3.500 | 6.988 | 315 | 0.474 / 0.920 / 1.078 | 0 |
| Separate WAL | 394 | loaded | 35,457 / 35,460 | 393.967 | 103.988 · 14.881× | 26,459 | 0.409 / 3.529 / 104.541 | transactor safepoint: 16, unresolved: 1 |

All offered control and WAL saves durably ACKed. At 394 under load, the count of appends over 20 ms fell from 57 to 17. On separate WAL, 16 of those 17 overlapped a transactor safepoint enough for assignment. None was assigned to WAL sync or the remainder of a WAL flush. Earlier-append handoffs over 20 ms fell from 55 to 15. Overlap helps identify where time went. It cannot distinguish all competing work as causes.

The first attempt stopped at the native gate with zero timed offers. The second completed control and WAL. It started a Java 25 transactor, then refused it at a startup check which expected the version of the Java 21 gateways. The two remaining treatments run in a separate session with the same sealed inputs and live role checks.

The first two verified arms and failed ZGC startup are retained in `evidence/DX-BM1/day-n20/prep1-tail-syscall`. The summary and raw archives are 6,650,517 and 93,352,680 bytes. The checked `append-causes.tsv` lists each assigned cause over 20 ms with its slot window, monotonic time and native transaction identity. Its 47,043 bytes and both archives are checksummed. [Evidence manifest](SHA256SUMS) · [Forecasts](PREDICTIONS.md)

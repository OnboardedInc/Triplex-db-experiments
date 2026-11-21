# Full-size removal on request, bench 3

INT1 build `3669bee41` and `erase1/SERVER-ERASE2.md`, run in the one ten-account database. The run used a disposable copy of the held fresh copy at cut 87,002, rolling 6 credits, and 235 offered saves per second in each of four 90-second windows. The measured run is the repaired unit `triplex-bench3-removal2`. Its stack started at 19:19:22 UTC and it ended at 19:28:12 UTC. The driver was pinned to cores 9–11 once the transactor ran, and stayed there before and through every window ([why](HANDOFF.md)).

**Every forecast was met or beaten, except one quiet-read ratio.** Removing one protected value from each of 100 people took 75.83 ms to a durable acknowledgement and 243.90 ms until all 13 live routes had checked it. Every window stored all 21,150 of its offers, including 315 of 315 quiet saves.

| Reading | Forecast | Measured | Verdict |
| --- | --- | --- | --- |
| Extra native apply per protected replacement, p50 | 0.1–0.8 ms, five extra records | Protected block 0.74 ms with 28 records. The plain blocks before and after took 0.98 and 0.53 ms with 23 records. That is +0.21 ms against the later plain block; the earlier block includes first-touch work. | Met |
| 100 people, request to durable acknowledgement | 150–900 ms | 75.83 ms | Better than forecast |
| Request until the live routes check | 250–1,800 ms | 243.90 ms. The slowest routes were the current reader at 167.6 ms and assertion history at 167.4 ms after the acknowledgement. | Better than forecast |
| Quiet save p99, removal window ÷ baseline / after | 1.00–1.40× | 0.99× / 0.86× (72.93 ms against 73.80 and 85.02) | Met |
| Quiet read p99, removal window ÷ baseline / after | 1.00–1.35× | 0.32× / **1.76×** (10.45 ms against 32.17 and 5.95) | After-ratio missed. Quiet reads got faster window by window (32.17 → 10.45 → 7.39 → 5.95 ms), so the ratio reflects cache warming across windows, not the removal. |
| 100-body cleanup, including the native completion barrier | 8–75 s | 15.47 s. All 100 bodies matched, with keys absent afterwards. | Met |
| Quiet save p99, cleanup window ÷ baseline / after | 1.10–2.00× | 1.80× / 1.57× (133.12 ms) | Met |
| Quiet read p99, cleanup window ÷ baseline / after | 1.00–1.60× | 0.23× / 1.24× (7.39 ms) | Met |
| Wall time from a stopped copy | 15–50 min, 88 min ceiling | 15 min from the start of preparation (19:13:14) to the end (19:28:12), including the rebuild and copy | Met |

| Window | Offered / durable | Durable within the 90 s of offers | Quiet saves | Quiet save p50 / p99 ms | Quiet read p50 / p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 21,150 / 21,150 | 21,148 | 315 / 315 | 6.45 / 73.80 | 4.75 / 32.17 |
| Removal | 21,150 / 21,150 | 21,118 | 315 / 315 | 4.79 / 72.93 | 1.54 / 10.45 |
| Cleanup | 21,150 / 21,150 | 21,146 | 315 / 315 | 4.89 / 133.12 | 1.37 / 7.39 |
| After | 21,150 / 21,150 | 21,147 | 315 / 315 | 4.72 / 85.02 | 1.27 / 5.95 |

The quiet save p99 near 73 ms in the baseline and removal windows exceeds the owner's 50 ms quiet-account limit at 235 offered. The removal does not cause it, since the removal window is no worse than the baseline. The rolling 6 reference at 235 had loaded quiet p99 43.91 ms. This tape uses a different quiet schedule of 3.5/s with checked reads, so the two numbers are not a matched comparison.

The live routes checked were current writer, current reader, pinned, held handle, entity history, assertion history, old-cut batch, Reach pinned and current, journal rows and page, feed resume and the protected-value filter. The runner shut PostgreSQL down cleanly, and its slot left no containers or volumes. The Mac copy is at `evidence/DX-BM1/bench3/bench3-removal`: a 591,008-byte summary and a 20,020,038-byte raw archive, checked member by member against the transfer manifest. Rental cost about USD 5.75 at 19:30 UTC. [Checksums](SHA256SUMS)

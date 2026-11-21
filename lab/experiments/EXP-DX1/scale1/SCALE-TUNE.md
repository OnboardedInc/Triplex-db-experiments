# Full-size cache, cores and WAL follow-up

Forecast 38–42 minutes on the built source, with a 45-minute native cap (USD 0.82). Each of the three arms reopens the same stopped cut independently. Each arm uses 90-second matched quiet windows at 394 and 620 offered saves/s, with 315 quiet saves per window, 1,900 people per busy neighbour and six-credit fair turns. PostgreSQL keeps all durability settings on. [Producer forecasts and mechanism](https://github.com/OnboardedInc/Triplex-db-experiments/blob/1d0e2f5663dbb75c192efdb97621348da69c8bc8/lab/experiments/EXP-DX1/prep1/FULL-SIZE-READING.md)

| Transactor | Offered/s | Forecast delivered/s | Forecast quiet solo / loaded p99, ms | Forecast quiet ratio | Forecast reads/save solo / loaded |
| --- | ---: | ---: | --- | ---: | --- |
| 1 core, 2 GiB cache, G1 | 394 | 277 | 135 / 189 | 1.40× | 2.50 / 1.55 |
| 1 core, 2 GiB cache, G1 | 620 | 273 | 155 / 217 | 1.40× | 2.50 / 1.55 |
| 3 cores, 16 GiB cache, G1 | 394 | 365 | 91 / 137 | 1.50× | 1.50 / 0.45 |
| 3 cores, 16 GiB cache, G1 | 620 | 405 | 100 / 150 | 1.50× | 1.50 / 0.58 |
| 3 cores, 16 GiB cache, dedicated WAL, ZGC | 394 | 394 | 21 / 28 | 1.32× | 1.50 / 0.45 |
| 3 cores, 16 GiB cache, dedicated WAL, ZGC | 620 | 440 | 20 / 34 | 1.68× | 1.50 / 0.58 |

Every solo window forecasts 3.5 saves/s. The 394/s combined arm needs all 35,460 durable saves after drain with zero expiry. The workload checks and measurement logic come from `6abc19f66b0bbe59f3dbc57767ca6dc7456c8d4e`. Actual source `8879abb2c2cf66a66d2cb273cf6c4c704cf41172` changes only the expected NVMe numbering in setup, cleanup, stack and collector. We read the real root and secondary ext4 mounts and keep them distinct. This host uses the reverse enumeration from the pinned launcher. Shell syntax and Python compilation passed. The tree diff from the producer is five removals and five additions across three files.

## Measured on the full seed

**None of the tested configurations carried every 394/s offer.** The larger-cache G1 arm was closest at 361.51 saves/s with 2,565 expiries. The WAL and ZGC arm reached 345.80/s with 4,110 expiries. At 620 offered, the combined arm reached 365.13/s, with 22,535 expired. It reduced loaded quiet p99 to 57.67 ms, 2.29× its solo value. All six loaded quiet ratios exceeded 1.25×.

Each cell is 90 seconds. Every quiet group acknowledged 315/315, including when aggregate traffic lost offers. The durable column includes ACKs after the offer window. Expiries were the only non-ACK outcome. Each treatment appears once per rate, with its own clean PGDATA copy and six-credit fair turns.

| Transactor | Offered/s | Forecast delivered/s | In-window delivered/s (n) | Durable / offered | Expired | Quiet solo → loaded p99, ms (315 per side) | Ratio |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 GiB, 1 core, G1 | 394 | 277 | 201.83 (18,165) | 18,261 / 35,460 | 17,199 | 115.45 → 445.54 | 3.86× |
| 2 GiB, 1 core, G1 | 620 | 273 | 187.12 (16,841) | 17,093 / 55,800 | 38,707 | 89.75 → 444.09 | 4.95× |
| 16 GiB, 3 cores, G1 | 394 | 365 | 361.51 (32,536) | 32,895 / 35,460 | 2,565 | 68.88 → 190.81 | 2.77× |
| 16 GiB, 3 cores, G1 | 620 | 405 | 351.19 (31,607) | 32,189 / 55,800 | 23,611 | 41.13 → 186.13 | 4.53× |
| 16 GiB, 3 cores, WAL, ZGC | 394 | 394 | 345.80 (31,122) | 31,350 / 35,460 | 4,110 | 65.99 → 221.10 | 3.35× |
| 16 GiB, 3 cores, WAL, ZGC | 620 | 440 | 365.13 (32,862) | 33,265 / 55,800 | 22,535 | 25.18 → 57.67 | 2.29× |

SQL reads and native apply means are per acknowledged save. Append counts and latency include drain. Transactor CPU averages over the recorded offer and drain interval, with the offered 90 seconds measured separately.

| Transactor | Cell | SQL reads/save (n) | Native apply mean / p99, ms/save | Append p50 / p99 / max, ms (n) | Transactor CPU mean cores / assigned · seconds |
| --- | --- | ---: | ---: | ---: | ---: |
| 2 GiB, 1 core, G1 | 394-alone | 2.552 (315) | 8.444 / 46.040 | 0.584 / 32.906 / 53.378 (315) | 0.054 / 1 · 89.51 |
| 2 GiB, 1 core, G1 | 394-loaded | 1.811 (18,261) | 3.743 / 14.940 | 0.398 / 2.591 / 211.006 (17,924) | 0.740 / 1 · 91.01 |
| 2 GiB, 1 core, G1 | 620-alone | 1.994 (315) | 3.334 / 8.800 | 0.368 / 61.408 / 77.226 (315) | 0.015 / 1 · 89.46 |
| 2 GiB, 1 core, G1 | 620-loaded | 2.018 (17,093) | 4.021 / 13.340 | 0.398 / 4.104 / 190.078 (16,954) | 0.797 / 1 · 91.01 |
| 16 GiB, 3 cores, G1 | 394-alone | 2.371 (315) | 5.731 / 28.050 | 0.554 / 31.820 / 40.829 (315) | 0.056 / 3 · 89.49 |
| 16 GiB, 3 cores, G1 | 394-loaded | 0.738 (32,895) | 1.703 / 7.960 | 0.414 / 2.472 / 58.627 (28,127) | 1.146 / 3 · 91.00 |
| 16 GiB, 3 cores, G1 | 620-alone | 1.308 (315) | 2.839 / 5.810 | 0.354 / 32.612 / 40.015 (315) | 0.011 / 3 · 89.46 |
| 16 GiB, 3 cores, G1 | 620-loaded | 0.961 (32,189) | 1.852 / 4.720 | 0.397 / 2.098 / 96.865 (30,041) | 1.104 / 3 · 91.00 |
| 16 GiB, 3 cores, WAL, ZGC | 394-alone | 2.273 (315) | 6.599 / 17.190 | 0.590 / 2.385 / 4.340 (315) | 0.056 / 3 · 89.48 |
| 16 GiB, 3 cores, WAL, ZGC | 394-loaded | 0.787 (31,350) | 1.858 / 8.530 | 0.416 / 2.450 / 20.804 (27,494) | 1.346 / 3 · 91.00 |
| 16 GiB, 3 cores, WAL, ZGC | 620-alone | 1.327 (315) | 2.852 / 6.250 | 0.364 / 0.712 / 1.170 (315) | 0.012 / 3 · 89.46 |
| 16 GiB, 3 cores, WAL, ZGC | 620-loaded | 1.109 (33,265) | 1.778 / 4.430 | 0.397 / 2.106 / 16.850 (31,377) | 1.493 / 3 · 91.00 |

The base and cache transactors used Java 21 G1 on one and three cores respectively. The combined transactor used Java 25 ZGC on three cores. Both gateways used Java 21 G1, with four write cores and one read core. The checked combined output observed WAL on the second ext4 drive and read back all durability switches enabled. Loaded append p99 stayed near 2–2.5 ms in the tuned arms. The combined arm reduced the maximum at both rates. At 394/s the combined changes jointly reduced the solo append tail and still missed capacity and quiet isolation. This arm does not apportion the combined effect between WAL and ZGC.

Build through cleanup took 32 min 9 s (USD 0.58). The 34,792,588-byte compressed bundle retained each original arm, stage clocks, three JVM logs per arm and CPU witnesses. Recomputed append p50, p99, maximum and in-window counts use every unique validated native append. The result rejoined checked receipts and original trace blocks at the attempt-bound transaction and checked the other reported quantiles against the producer. [Archive checksum](evidence/prep-v01-ceiling-tuned.sha256)

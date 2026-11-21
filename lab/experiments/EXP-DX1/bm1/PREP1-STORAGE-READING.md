# Ordered identities, native reads and transactor cache

At 394 offered saves/s, ordered IDs delivered 393.92/s with a 2 GiB transactor cache. The 16 GiB cache arm reached the same rate. The unmodified prepared writer with 2 GiB delivered 165.80/s. Ordered IDs averaged 0.014 transactor SQL reads/save, far below my forecast of 2–4 and the builder's 2.2. The ordered arm durably ACKed every offer at both rates. The quiet account's p99 reached 4.28× and 3.47× its solo p99 at 235 and 394. Both exceeded 1.25×.

All four arms ran from the same ten-account physical save set in one database at `df307c29c08a9045a4526769f5c917f66800eee4`. Each arm started from the sealed PostgreSQL population, ran two quiet and two loaded windows in the same order, and used Java 21 G1. Transactor/write/read JVMs used 1/4/1 cores. Their configured heaps were 24/4/3 GiB and PostgreSQL had one core. The transactor memory cap was 30 GiB in all four arms. The larger arm changed its object cache from 2 to 16 GiB. The ordered arm combines the new ID block with numeric ownership and no hints. Numeric-only and hints controls were cut to fit 90 minutes.

| Writer | Rate | ACKs in 60 s / offered | Durable after drain | Expired | Saves/s | Saves per append | Quiet solo → loaded p99, ms · ratio |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Grouped K · 2 GiB | 235 | 8,822 / 14,100 | 9,070 | 5,030 | 147.03 | 7.984 | 90.80 → 682.40 · 7.52× |
| Grouped K · 2 GiB | 394 | 9,323 / 23,640 | 9,611 | 14,029 | 155.38 | 7.983 | 116.74 → 486.78 · 4.17× |
| Original S · 2 GiB | 235 | 8,554 / 14,100 | 8,737 | 5,363 | 142.57 | 1.040 | 90.59 → 1,908.97 · 21.07× |
| Original S · 2 GiB | 394 | 9,948 / 23,640 | 10,337 | 13,303 | 165.80 | 1.035 | 127.78 → 1,193.52 · 9.34× |
| Original S · 16 GiB | 235 | 11,953 / 14,100 | 12,348 | 1,752 | 199.22 | 1.093 | 102.94 → 1,820.23 · 17.68× |
| Original S · 16 GiB | 394 | 23,635 / 23,640 | 23,640 | 0 | 393.92 | 1.152 | 112.45 → 558.09 · 4.96× |
| Ordered S · 2 GiB | 235 | 14,094 / 14,100 | 14,100 | 0 | 234.90 | 1.262 | 73.66 → 315.42 · 4.28× |
| Ordered S · 2 GiB | 394 | 23,635 / 23,640 | 23,640 | 0 | 393.92 | 1.344 | 34.07 → 118.16 · 3.47× |

Each p99 for the quiet account uses all 210 scheduled saves in that cell. All 152,640 offers are accounted for. The ordinary and ordered prepared paths had zero replans. All 38,160 ordered offers matched a native prepared receipt with its unique ordered token and the installed function ID. The 60-second delivery figures exclude ACKs during drain. Expired offers never received an ACK and are excluded from the native-stage distributions.

| Writer | Rate | Native SQL reads/save, mean | Native decode ms/save, mean | Native apply ms/save p50 / p99 | Native ready → append p99, ms | Sender queue / HTTP p99, ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Grouped K · 2 GiB | 235 | 0.017 | 0.006 | 0.185 / 1.421 | 4.36 | 22,798 / 1,306 |
| Grouped K · 2 GiB | 394 | 0.014 | 0.005 | 0.171 / 0.629 | 3.63 | 36,948 / 1,170 |
| Original S · 2 GiB | 235 | 7.393 | 2.581 | 5.250 / 24.690 | 116.83 | 23,291 / 1,589 |
| Original S · 2 GiB | 394 | 7.978 | 2.610 | 5.000 / 13.860 | 96.65 | 35,061 / 1,052 |
| Original S · 16 GiB | 235 | 3.719 | 1.404 | 3.410 / 17.170 | 107.37 | 13,312 / 1,463 |
| Original S · 16 GiB | 394 | 0.710 | 0.244 | 0.740 / 5.330 | 67.93 | 2,389 / 431 |
| Ordered S · 2 GiB | 235 | 0.033 | 0.021 | 0.250 / 4.830 | 97.33 | 2 / 210 |
| Ordered S · 2 GiB | 394 | 0.014 | 0.006 | 0.260 / 2.760 | 52.41 | 27 / 136 |

Datomic's SQL and decode counters cover the transaction thread. Grouped K does predecessor work at the gateway, outside these counters. Native ready-to-append p99 remains 52 ms at 394 with ordered IDs even though native apply p99 falls to 2.76 ms. The 394 windows follow the 235 windows for all treatments. The cache and ordered results describe those warmed windows. The grouped control's lower 147–155/s versus the earlier 180–182/s comparison is a new reading on the same application tape and different transactor heap policy. The changed runtime and single arm per treatment limit between-session attribution.

The small gate verified ordered receipts for all four reduced phases before timing. The independently checked full outputs bind the exact offered commands, journal content, source, fresh function, and original seed. The first prefetch gate failure still has its own archive. The successful summary archive is 15,690,313 bytes and the raw archive is 4,173,763 bytes under `evidence/DX-BM1/day-n20/prep1-ordered`. [Checksums](SHA256SUMS) · [Forecasts](PREDICTIONS.md)

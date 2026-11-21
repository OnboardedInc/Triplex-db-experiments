# Java 21 G1, Java 25 G1 and Java 25 ZGC on bare metal

At 235 offered saves/s, Java 21 G1, Java 25 G1 and Java 25 ZGC delivered 186.15, 195.93 and 219.55 in the 60-second window. At 394 offered they delivered 174.22, 189.58 and 245.33. ZGC beat my 140–190/s forecast at 235. Java 25 G1 improved 5–9% on Java 21 across the two crowded windows with the same 24 GiB stack reservation. ZGC improved another 12–29% with 37 GiB reserved.

The three ZGC pause p99s were 16–20 µs with zero logged allocation stalls. Solo save p99 at 23.5/s was 361, 248 and 253 ms. All three exceeded the builder's 24–48 ms bands and my 55–135 ms bands. At 39.4/s ZGC's solo p99 rose to 467 ms against 239 ms on Java 25 G1. Java 25 ZGC improved loaded throughput in this tape. Sparse-save tails and quiet-account interference remained large.

All arms used the same 100,000-person seed of ten deep accounts in one Datomic database. Source `5a96527807fd646fbc866b33dc72565481c409e0` ran with 3/2/3 effective cores on the transactor, writer and reader. PostgreSQL used one core. The three sender cores served the same functions across arms. Each arm verified all 81,444 saves, 600 exact historical reads, and original seal and role identities. The 42m15s of arm time excludes preparation. The original collector refused a 0.361 ms request-file mtime lag. The corrected replay checked the original rows and fingerprints without rerunning any arm.

| JVM | Duration | Mean Java CPU cores | Sum of role peak cgroups | Tx pause n, p99 / max ms | Writer pause n, p99 / max ms | Reader pause n, p99 / max ms |
| --- | ---: | ---: | ---: | --- | --- | --- |
| 21 G1 | 14.90 min | 0.922 | 7.83 GiB | 503 · 67.436 / 354.403 | 263 · 23.096 / 23.752 | 33 · 33.137 / 33.137 |
| 25 G1 | 14.11 min | 0.950 | 7.51 GiB | 776 · 75.144 / 108.113 | 260 · 23.366 / 23.637 | 85 · 27.291 / 27.291 |
| 25 ZGC | 13.23 min | 1.089 | 15.78 GiB | 196 · 0.020 / 0.030 | 145 · 0.016 / 0.016 | 90 · 0.017 / 0.017 |

The peak column sums individual cgroup peaks since startup. Reserved heap at a single population size gives no untouched-person slope. ZGC and the higher memory budget were bundled. The memory-matched fourth arm was outside the reordered brief.

`ten` offers the named rate independently per account. `nine` adds a fixed 3.5/s quiet account to nine busy neighbours. `solo` is one account at the named rate. Goodput counts durable ACKs ending in the 60-second window. The remainder completed during drain. Pinned reads use 60 samples in each cell. Quiet p99 uses the stated quiet n and the producer's matched solo baseline. Stage columns recompute rank p99 of per-save clocks across all offers. Native entry includes work after submission, and peer await includes queueing and native work. These columns overlap. The producer supplied no isolated native-apply clock for this campaign.

| JVM | Window | Saves n | ACKs in 60 s | Saves/s | Quiet n · p50 / p99 ms | Quiet × | Read p99 ms | All ACK p99 ms | Prepare / native entry / peer await p99 ms |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| 21 G1 | solo35 | 210 | 210 | 3.50 | 210 · 16.461 / 50.720 | 1.000 | 40.394 | 50.720 | 2.267 / 10.000 / 47.675 |
| 21 G1 | ten35 | 2,100 | 2,100 | 35.00 | 210 · 10.495 / 325.284 | 6.413 | 4.469 | 292.996 | 0.379 / 32.000 / 291.607 |
| 21 G1 | solo49 | 294 | 294 | 4.90 | 294 · 10.377 / 106.884 | 1.000 | 17.014 | 106.884 | 0.365 / 8.000 / 105.472 |
| 21 G1 | ten49 | 2,940 | 2,940 | 49.00 | 294 · 8.298 / 195.564 | 1.830 | 2.976 | 177.514 | 0.287 / 36.000 / 176.202 |
| 21 G1 | solo235 | 1,410 | 1,410 | 23.50 | 1410 · 7.125 / 360.992 | 1.000 | 4.472 | 360.992 | 0.314 / 12.000 / 310.682 |
| 21 G1 | ten235 | 14,100 | 11,169 | 186.15 | 1410 · 4884.308 / 19881.026 | 55.073 | 3.866 | 19713.248 | 0.178 / 1064.000 / 1163.308 |
| 21 G1 | nine235 | 12,900 | 10,641 | 177.35 | 210 · 602.126 / 914.933 | 18.039 | 7.261 | 15270.111 | 0.170 / 946.000 / 1100.069 |
| 21 G1 | solo394 | 2,364 | 2,364 | 39.40 | 2364 · 7.641 / 378.332 | 1.000 | 8.364 | 378.332 | 0.283 / 33.000 / 243.785 |
| 21 G1 | ten394 | 23,640 | 10,453 | 174.22 | 2364 · 37748.848 / 75410.706 | 199.324 | 21.645 | 74679.578 | 0.173 / 1048.000 / 1071.944 |
| 21 G1 | nine394 | 21,486 | 11,345 | 189.08 | 210 · 571.440 / 1218.331 | 24.021 | 12.114 | 55072.967 | 0.178 / 996.000 / 1004.275 |
| 25 G1 | solo35 | 210 | 210 | 3.50 | 210 · 18.118 / 107.937 | 1.000 | 64.761 | 107.937 | 2.560 / 18.000 / 105.054 |
| 25 G1 | ten35 | 2,100 | 2,100 | 35.00 | 210 · 9.581 / 50.534 | 0.468 | 6.049 | 107.922 | 0.365 / 38.000 / 105.552 |
| 25 G1 | solo49 | 294 | 294 | 4.90 | 294 · 10.099 / 173.120 | 1.000 | 17.626 | 173.120 | 0.352 / 6.000 / 172.114 |
| 25 G1 | ten49 | 2,940 | 2,940 | 49.00 | 294 · 8.053 / 335.195 | 1.936 | 2.403 | 300.931 | 0.272 / 22.000 / 299.222 |
| 25 G1 | solo235 | 1,410 | 1,410 | 23.50 | 1410 · 7.161 / 248.101 | 1.000 | 2.428 | 248.101 | 0.288 / 9.000 / 243.095 |
| 25 G1 | ten235 | 14,100 | 11,756 | 195.93 | 1410 · 3127.813 / 12031.381 | 48.494 | 10.479 | 11848.292 | 0.163 / 1028.000 / 1047.887 |
| 25 G1 | nine235 | 12,900 | 11,597 | 193.28 | 210 · 379.762 / 960.210 | 8.896 | 10.713 | 7086.825 | 0.170 / 910.000 / 978.442 |
| 25 G1 | solo394 | 2,364 | 2,364 | 39.40 | 2364 · 6.985 / 238.688 | 1.000 | 16.329 | 238.688 | 0.248 / 37.000 / 232.657 |
| 25 G1 | ten394 | 23,640 | 11,375 | 189.58 | 2364 · 32295.194 / 64696.897 | 271.052 | 7.787 | 64104.748 | 0.171 / 1064.000 / 1113.042 |
| 25 G1 | nine394 | 21,486 | 12,193 | 203.22 | 210 · 562.708 / 891.073 | 8.255 | 7.810 | 47059.250 | 0.163 / 880.000 / 890.350 |
| 25 ZGC | solo35 | 210 | 210 | 3.50 | 210 · 18.456 / 90.282 | 1.000 | 46.843 | 90.282 | 1.725 / 15.000 / 87.080 |
| 25 ZGC | ten35 | 2,100 | 2,100 | 35.00 | 210 · 11.204 / 213.068 | 2.360 | 2.489 | 269.989 | 0.979 / 31.000 / 268.065 |
| 25 ZGC | solo49 | 294 | 294 | 4.90 | 294 · 9.874 / 167.440 | 1.000 | 23.336 | 167.440 | 0.400 / 8.000 / 165.579 |
| 25 ZGC | ten49 | 2,940 | 2,940 | 49.00 | 294 · 6.585 / 281.080 | 1.679 | 2.810 | 246.449 | 0.311 / 8.000 / 244.454 |
| 25 ZGC | solo235 | 1,410 | 1,410 | 23.50 | 1410 · 5.636 / 253.201 | 1.000 | 2.289 | 253.201 | 0.821 / 4.000 / 230.735 |
| 25 ZGC | ten235 | 14,100 | 13,173 | 219.55 | 1410 · 225.920 / 4317.827 | 17.053 | 12.829 | 4324.140 | 0.712 / 812.000 / 848.472 |
| 25 ZGC | nine235 | 12,900 | 12,035 | 200.58 | 210 · 127.442 / 1211.691 | 13.421 | 17.874 | 4587.543 | 0.192 / 918.000 / 1123.146 |
| 25 ZGC | solo394 | 2,364 | 2,364 | 39.40 | 2364 · 5.909 / 467.003 | 1.000 | 2.581 | 467.003 | 0.285 / 13.000 / 294.613 |
| 25 ZGC | ten394 | 23,640 | 14,720 | 245.33 | 2364 · 19443.135 / 34549.784 | 73.982 | 10.161 | 34377.816 | 0.161 / 906.000 / 991.110 |
| 25 ZGC | nine394 | 21,486 | 14,202 | 236.70 | 210 · 477.458 / 999.219 | 11.068 | 14.249 | 29660.617 | 0.172 / 795.000 / 807.374 |

The builder expected quiet p99 ratios of 13–45× at 23.5 and 20–65× at 39.4 with nine busy neighbours. The measured ratios were 18.04/24.02× on 21 G1, 8.90/8.26× on 25 G1 and 13.42/11.07× on 25 ZGC. All six exceeded 1.25×. The quiet account's scheduled ACK p99 ranged from 0.891 to 1.218 s in these cells. ZGC's largest advantage came under the ten-account loaded tape, which still delivered only 93% and 62% of the offered rates.

The Mac copy under `evidence/DX-BM1/day-n20/jvm25-retry` holds a 16,871,002-byte summary archive and 177,168-byte raw archive. Hashes bind the native per-save rows, role pause logs, requests, producer summaries, restore witnesses and independent collector replay. The original unit exit remains failed due to the original collector alert. [Manifest](SHA256SUMS) · [Forecasts](PREDICTIONS.md)

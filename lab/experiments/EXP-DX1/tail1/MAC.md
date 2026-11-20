# Mac replay observations

Each arm used the same four-minute deep schedule with zero load readers, 5,110 primary offers and 144 resends. The seed contained 1,604,464 live facts across 10,000 subjects. Every arm used one signed Datomic image and verified SQL durability. Client times describe the Mac. JVM pause durations and bytes per save inform the server hypotheses.

| Arm | Verified saves | Saves/s | Client ACK p50 / p99 / p99.9 / max, ms | Writer pauses and p50 / p99 / max, ms | Writer average cores / peak MiB | HTTP calls/save |
| --- | ---: | ---: | --- | --- | --- | ---: |
| Serial C | 5,110 | 21.29 | 518.47 / 20,851.43 / 22,586.70 / 22,677.72 | 159, 9.71 / 175.01 / 260.81 | 0.152 / 620 | 1.292 |
| G1, one core | 5,110 | 21.29 | 85.53 / 4,306.58 / 5,803.85 / 6,064.64 | 144, 10.76 / 63.06 / 77.79 | 0.153 / 796 | 1.296 |
| Generational ZGC | 5,110 | 21.29 | 268.13 / 16,929.25 / 18,129.15 / 18,203.64 | 150, 0.008 / 0.062 / 0.341 | 0.148 / 1,318 | 1.294 |
| Serial repeat | 5,110 | 21.29 | 76.83 / 4,544.86 / 6,145.69 / 6,256.55 | 160, 9.78 / 146.23 / 165.26 | 0.142 / 624 | 1.296 |
| Lower allocation, Serial | 5,110 | 21.29 | 182.77 / 16,217.32 / 16,909.55 / 17,048.48 | 156, 9.24 / 121.36 / 123.61 | 0.141 / 633 | 1.295 |
| G1, two cores | 5,110 | 21.29 | 78.04 / 3,464.23 / 4,130.13 / 4,173.54 | 346, 8.38 / 30.68 / 62.14 | 0.181 / 617 | 1.296 |
| G1 with receipts | 3,654 | 15.22 | 5,324.81 / 30,753.95 / 31,630.26 / 32,074.57 | 121, 22.43 / 126.80 / 224.37 | 0.210 / 747 | 1.144 |

| Arm | Reader pauses and p50 / p99 / max, ms | Reader cores / peak MiB | Transactor pauses and p50 / p99 / max, ms | Transactor cores / peak MiB |
| --- | --- | --- | --- | --- |
| Serial C | 296, 12.36 / 58.14 / 108.17 | 0.207 / 592 | 163, 20.09 / 93.41 / 96.05 | 0.261 / 912 |
| G1, one core | 624, 7.96 / 39.62 / 91.60 | 0.426 / 522 | 167, 31.24 / 110.87 / 114.41 | 0.236 / 979 |
| Generational ZGC | 405, 10.03 / 57.85 / 72.42 | 0.241 / 539 | 149, 21.73 / 69.57 / 95.07 | 0.255 / 979 |
| Serial repeat | 253, 14.49 / 63.28 / 68.60 | 0.184 / 584 | 160, 32.17 / 102.45 / 117.18 | 0.228 / 1,021 |
| Lower allocation, Serial | 254, 13.48 / 36.27 / 122.60 | 0.181 / 543 | 141, 18.33 / 64.70 / 69.58 | 0.240 / 953 |
| G1, two cores | 332, 11.57 / 38.73 / 57.87 | 0.200 / 575 | 133, 28.66 / 86.56 / 92.17 | 0.215 / 975 |
| G1 with receipts | 205, 24.38 / 108.84 / 204.77 | 0.311 / 563 | 233, 35.26 / 161.73 / 219.34 | 0.360 / 1,013 |

| Arm | JFR weighted MiB/s | MiB per verified save | Row texts / request parsing / replies, percent | Young / mixed / full / other writer pauses |
| --- | ---: | ---: | --- | --- |
| Serial C | 51.02 | 2.396 | 51.0 / 14.0 / 4.5 | 156 / 0 / 3 / 0 |
| G1, one core | 54.09 | 2.540 | 51.6 / 14.1 / 3.8 | 138 / 4 / 0 / 2 |
| Generational ZGC | 54.00 | 2.536 | 49.9 / 12.4 / 4.3 | 0 / 0 / 0 / 150 |
| Serial repeat | 49.87 | 2.342 | 49.7 / 15.3 / 4.6 | 155 / 0 / 5 / 0 |
| Lower allocation, Serial | 49.31 | 2.316 | 46.9 / 14.6 / 4.4 | 152 / 0 / 4 / 0 |
| G1, two cores | 58.26 | 2.736 | 52.7 / 12.1 / 4.3 | 178 / 58 / 0 / 110 |
| G1 with receipts | 24.72 | 1.623 | 39.4 / 16.1 / 5.9 | 31 / 68 / 0 / 22 |

The biggest named allocation sites were Fressian UTF-8 character arrays and string-builder buffers. The Serial C sampled total of 2.396 MiB/save was close to the rounded between-pause heap growth of 2.48 MiB per covered save. Serial's recent control measured 1.16 MiB of row preparation per save. Direct row decoding lowered that component to 1.09 MiB and overall allocation from 2.34 to 2.32 MiB/save. The profiles recorded no speculative-apply allocation stacks, and speculative commit hints were disabled. The remaining buckets include native SQL and serialization work.

The writer heap maximum was 896 MiB requested in all arms, with 1,408 MiB available to the container. Serial's effective heap was about 866 MiB. The reader used 416 of 768 MiB and the transactor 704 of 1,056 MiB. Two-core G1 logged more, shorter pauses with both cores verified at startup. No captured writer pause was triggered by a humongous allocation. Generational ZGC recorded zero allocation stalls and came within 90 MiB of its memory cap. Its corrected count includes both young-cycle labels and old phases emitted in Java 21.

The four-minute prefix has zero history-growth windows. Serial C logged 26 writer pauses overlapping explicit index requests, including two full collections. The remaining 133 pauses had a 60.04 ms p99 and included a full pause. The JVM reported allocation failure for all 159. The overlap locates benchmark activity on the clock. Serial C's fifty slowest commits spent most of their time queued before dispatch, with 21.61 seconds in that interval at the median. The repeat Serial's 4.54-second client p99 illustrates the Mac's client-level variability.

The first receipt trial committed 3,654 primary offers. Another 1,263 expired and 193 lack an outcome. Comparing the same 3,654 completed offers gives 1,218 to 422 snapshot calls and 1.372 to 1.144 total calls per save. The ACK p99 on those offers was 4.23 to 30.75 seconds. The receipt trial's fifty slowest saves had 29.88 seconds before dispatch at the median.

The repeat is queued behind the last one-core control.

The independent oracle matched 336 sampled reads across the completed arms. The attempt ledger retains the counts of expiries, resends and missing outcomes. Allocation recovery replayed the original recording bytes through a 384 MiB helper after the timed windows. [Evidence manifest](SHA256SUMS)

Recorded heavy and timing-lock waits total about 5 hours and 53 minutes for the completed work, including the withdrawn jobs and allocation recovery. One attempt found a retired image. Another seeded all subjects and yielded after the remaining heavy tokens failed to drain. Each started stack released its owned reservation, volume and network. [Evidence manifest](SHA256SUMS)

# Staggered writer capacity

At 35 offers/s, all 10,500 saves were acknowledged in their 300-second window. Account 1’s write p99 rose from 48.44 [43.43, 71.11] (n=1050) to 121.56 [39.93, 149.33] (n=1050) ms, a 2.51× ratio. Its 1.25× threshold was already exceeded by the first loaded window on the writer clock. Matched quiet reads and feed lag are unmeasured.

The first observed pre-dispatch expiry was at 175/s. Of 52,500 offers, 1,924 expired before dispatch, 326 were blocked by an expired task creation, and 49,657 were acknowledged within the window, or 165.52 [159.34, 171.70] saves/s. The preceding 155/s window acknowledged all 46,500 offers with no expiry. Its pooled p99 was 11.01 seconds.

The restored 10,000-person-per-account fixture used the original 40/30/10/20 mixed command tape and one native database. The run stopped at 62 minutes when the sender missed the fixed start of `staggered-1-4`. The transactor reached one full core for three samples. The sender reported a 6.65-second stall in the 235/s window. The path includes the sender, gateways and transactor. The transactor-only capacity is unmeasured. [Source-bound observations](evidence/arm-p6-i1-pool-staggered-a-writer.sha256)

| Window | Offers/s (n) | ACKs/s in window (n and 90% interval) | Pre-dispatch expiry / dependent / missing | Commit p50 ms [90%] | Commit p99 ms [90%] | ACK n | Account 1 p99 ms [90%] (n) | ACK drain ms |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: |
| alone | 3.50 (1,050) | 3.50 [3.45, 3.55] (1,050) | 0 / 0 / 0 | 5.81 [5.56, 6.05] | 48.44 [43.46, 71.11] | 1,050 | 48.44 [43.43, 71.11] (n=1050) | 0.00 |
| ten-steady | 35.00 (10,500) | 35.00 [34.85, 35.15] (10,500) | 0 / 0 / 0 | 4.22 [4.17, 4.27] | 86.43 [77.82, 98.19] | 10,500 | 121.56 [39.93, 149.33] (n=1050) | 0.00 |
| plateau-1 | 55.00 (16,500) | 55.00 [54.76, 55.22] (16,500) | 0 / 0 / 0 | 4.17 [4.13, 4.21] | 142.71 [136.44, 154.65] | 16,500 | 168.51 [108.24, 198.95] (n=1050) | 0.00 |
| plateau-3 | 95.00 (28,500) | 95.00 [93.92, 96.02] (28,499) | 0 / 0 / 0 | 5.09 [5.05, 5.13] | 507.98 [483.31, 528.02] | 28,500 | 507.98 [359.59, 714.34] (n=1050) | 6.07 |
| plateau-5 | 135.00 (40,500) | 135.00 [132.20, 137.72] (40,499) | 0 / 0 / 0 | 9.03 [8.95, 9.12] | 1360.73 [1335.59, 1390.33] | 40,500 | 1142.30 [1021.43, 1385.08] (n=1050) | 4.57 |
| plateau-6 | 155.00 (46,500) | 154.99 [150.69, 159.37] (46,498) | 0 / 0 / 0 | 44.17 [42.86, 45.72] | 11014.94 [10461.40, 11580.37] | 46,500 | 2202.44 [2074.04, 2293.20] (n=1050) | 16.68 |
| plateau-7 | 175.00 (52,500) | 165.52 [159.34, 171.70] (49,657) | 1,924 / 326 / 0 | 578.77 [569.23, 590.01] | 30103.11 [30063.66, 30135.69] | 50,250 | 6722.65 [6274.79, 7765.44] (n=1050) | 31534.28 |
| plateau-8 | 195.00 (58,500) | 149.82 [142.85, 158.30] (44,946) | 10,905 / 1,732 / 0 | 2864.94 [2824.08, 2920.85] | 31557.79 [31453.66, 31661.67] | 45,863 | 18222.26 [15846.02, 19609.12] (n=1050) | 32664.01 |
| plateau-9 | 215.00 (64,500) | 132.85 [124.90, 141.13] (39,854) | 21,091 / 2,140 / 0 | 5621.16 [5568.53, 5680.23] | 33394.03 [33223.83, 33585.88] | 41,269 | 31001.88 [30509.21, 31975.81] (n=1028) | 34666.73 |
| plateau-10 | 235.00 (70,500) | 107.39 [100.61, 114.71] (32,218) | 35,329 / 1,989 / 0 | 9562.69 [9501.40, 9636.00] | 36203.25 [36032.04, 36416.99] | 33,182 | 36431.00 [35909.64, 36712.10] (n=3492) | 33896.89 |
| nine-peak-1 | 358.10 (21,486) | 79.15 [63.62, 94.12] (4,749) | 14,217 / 325 / 0 | 15655.80 [15335.09, 15933.55] | 37649.58 [37532.74, 37750.30] | 6,944 | 35608.49 [31784.90, 36780.90] (n=163) | 32260.94 |
| nine-recover-1 | 35.00 (4,200) | 30.19 [24.52, 36.86] (3,623) | 20 / 557 / 0 | 32.35 [30.40, 34.09] | 29026.40 [28367.36, 29520.07] | 3,623 | 20663.49 [16023.76, 23696.23] (n=400) | 0.00 |
| nine-peak-2 | 358.10 (21,486) | 132.92 [110.62, 154.60] (7,975) | 10,198 / 782 / 0 | 7239.45 [7110.22, 7449.33] | 36908.10 [36604.64, 37240.18] | 10,506 | 32223.35 [30578.46, 36774.79] (n=195) | 34796.45 |
| nine-recover-2 | 35.00 (4,200) | 29.23 [24.28, 34.14] (3,508) | 49 / 521 / 0 | 37.31 [34.93, 38.90] | 29686.92 [29274.67, 30012.97] | 3,630 | 23610.15 [19244.32, 27034.80] (n=412) | 4073.98 |
| nine-peak-3 | 358.10 (21,486) | 120.25 [99.55, 141.22] (7,215) | 11,338 / 652 / 0 | 10089.11 [9879.07, 10339.90] | 37890.68 [37671.01, 38115.76] | 9,496 | 35226.09 [30842.40, 38804.27] (n=192) | 31312.23 |
| nine-recover-3 | 35.00 (4,200) | 30.66 [25.38, 36.88] (3,679) | 7 / 513 / 0 | 35.01 [33.01, 37.24] | 28694.52 [28310.59, 29215.76] | 3,680 | 28427.50 [22151.65, 29279.04] (n=416) | 2.60 |
| staggered-1-1 | 70.90 (4,254) | 68.03 [65.73, 70.20] (4,082) | 0 / 168 / 0 | 11.98 [11.41, 12.56] | 325.26 [233.04, 500.88] | 4,086 | 380.28 [214.55, 500.88] (n=2335) | 8.95 |
| staggered-1-2 | 70.90 (4,254) | 67.98 [57.33, 82.35] (4,079) | 4 / 165 / 0 | 38.58 [36.55, 40.89] | 17625.94 [17156.60, 18014.91] | 4,085 | 13178.55 [12712.70, 13529.33] (n=208) | 35481.62 |
| staggered-1-3 | 70.90 (4,254) | 63.32 [59.47, 67.27] (3,799) | 5 / 150 / 300 | 14.63 [13.89, 15.54] | 492.32 [292.55, 596.15] | 3,799 | 632.43 [205.65, 775.20] (n=195) | 0.00 |

ACK latency runs from each frozen offer to the original driver’s committed acknowledgement. In-window rate counts ACKs for offers in that same window. Drain counts ACKs arriving after the window. The rate intervals resample one-second blocks. Latency intervals resample observed acknowledgements. Account 1 also goes hot in `plateau-10` and `staggered-1-1`. Missing dispositions in the final cell include the abrupt recorder exit. Field width, own-write headroom and the paired database layout remain the subsequent study’s questions.

Recovery checked the archived bytes, source, slot, nonce, original seed cut, exact frozen tape and monotonic trace clocks. Each included event matched its original sequence and scheduled time. Committed positions were unique across primary saves. Four ACK markers in one cell were outside a truncated span list and their acknowledgement clocks came from the original root records. The writer’s gzip file ends in one partial record, which was discarded. The first archive remains intact and terminal correctness is unjudged.

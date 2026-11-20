# Decision cells

Offered rate and goodput use the same rated interval. Capacity comparisons use 90-second cells. The single account uses 150, 120, 300 and 60 seconds at 3.5, 4.9, 23.5 and 39.4/s respectively, from the same restored image with and without a 600-second reader dose. p50 and p99 use original durable acknowledgements. Expiry is before SDK dispatch. Socket timestamps cover successful HTTP responses. The placement sentinel keeps 3.5/s and replays 64 identical pinned reader seats in the quiet control and loaded cells. Every durable feed change is checked.

The primary budget requires p50 ≤10 ms, p99 ≤50 ms, all primary dispositions exact with no expiry, rejection or missing offers, at least 99% of ACKs in the window and at most 1 s of drain. A quiet comparison requires 500 observations on each side and p99 ≤1.25× for saves, pinned reads and feed lag. The two layouts share one PostgreSQL, transactor JVM, physical cores and gateways. The two-database layout has two native commit pipelines inside that JVM.

## arm-d7-small-seed

10000 deep people per account, pooled layout, individual writer. Source `7c74da948b0d5c524b3aa05d6795731bea3ff961`. Unfixed write path.

Terminal status exit-code. Cells with a sealed writer ledger 0. Matched decision unmeasured.

## arm-d7-small-seed-b

10000 deep people per account, pooled layout, individual writer. Source `8b236f6a27bbef81603d5ad12ee9f85fd2af43dc`. Unfixed write path.

16,245,050 current facts across 1 database(s). Ingest took 0.67 hours at 6771.32 facts/s. Exact claim and feed verification took 0.61 hours. PostgreSQL added 724.59 bytes per fact (one physical seed).

Observed ingest cgroup peaks in GiB, from 40 progress snapshots.

| Transactor | PostgreSQL | Write gateway | Read gateway |
| ---: | ---: | ---: | ---: |
| 4.51 | 6.00 | 0.27 | 2.94 |

## arm-d7-single-seed

100000 deep people per account, single layout, individual writer. Source `daf289fab1bc94593a2a62f0999ceecff3600c84`. Audited write path.

16,245,647 current facts across 1 database(s). Ingest took 0.69 hours at 6540.77 facts/s. Exact claim and feed verification took 0.62 hours. PostgreSQL added 723.42 bytes per fact (one physical seed).

Observed ingest cgroup peaks in GiB, from 42 progress snapshots.

| Transactor | PostgreSQL | Write gateway | Read gateway |
| ---: | ---: | ---: | ---: |
| 4.85 | 6.00 | 0.28 | 2.80 |

## arm-d7-single-zero

100000 deep people per account, single layout, individual writer with zero readers. Source `daf289fab1bc94593a2a62f0999ceecff3600c84`. Audited write path.

Terminal status exit-code. Cells with a sealed writer ledger 0. Matched decision unmeasured.

## arm-d7-single-read

100000 deep people per account, single layout, individual writer with 64 reader seats. Source `daf289fab1bc94593a2a62f0999ceecff3600c84`. Audited write path.

Terminal status exit-code. Cells with a sealed writer ledger 0. Matched decision unmeasured.

## arm-d7-single-zero-b

100000 deep people per account, single layout, individual writer with zero readers. Source `07057d6c2e2cb95550ecfae81d8fc68a68e7b69c`. Audited write path.

Terminal status exit-code. Cells with a sealed writer ledger 3. Matched decision unmeasured.

## arm-d7-single-read-b

100000 deep people per account, single layout, individual writer with 64 reader seats. Source `07057d6c2e2cb95550ecfae81d8fc68a68e7b69c`. Audited write path.

Terminal status exit-code. Cells with a sealed writer ledger 0. Matched decision unmeasured.

## arm-d7-single-zero-c

100000 deep people per account, single layout, individual writer with zero readers. Source `0ac94040950bff80974e1f0cc21c4c73f914b3d5`. Audited write path.

| Cell | Offered/s | Durable ACKs/s (n) | Pre-dispatch expiry | Missing | Refused / uncertain / recovered | p50 ms | p99 ms | Quiet save p99 ms | Reader p99 ms | Feed p99 ms | ACK / disposition drain ms |
| --- | ---: | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- | ---: |
| r0-3p5 | 3.50 | 3.50 (n=525, 90% [3.43, 3.58]) | 0 | 0 | 0 / 0 / 0 | 10.37 (n=525, 90% [9.66, 11.26]) | 66.56 (n=525, 90% [56.32, 118.78]) | 66.56 (n=525, 90% [58.11, 118.78]) | unmeasured | 25.09 (n=525, 90% [24.70, 26.62]) | 0.00 / 0.00 |
| r0-4p9 | 4.90 | 4.90 (n=588, 90% [4.83, 4.96]) | 0 | 0 | 0 / 0 / 0 | 4.70 (n=588, 90% [4.61, 4.86]) | 34.81 (n=588, 90% [17.15, 40.70]) | 34.81 (n=588, 90% [27.77, 40.70]) | unmeasured | 25.09 (n=588, 90% [24.96, 25.21]) | 0.00 / 0.00 |
| r0-23p5 | 23.50 | 23.50 (n=7050, 90% [23.44, 23.55]) | 0 | 0 | 0 / 0 / 0 | 3.66 (n=7050, 90% [3.63, 3.69]) | 33.02 (n=7050, 90% [24.83, 38.91]) | 33.02 (n=7050, 90% [24.83, 38.40]) | unmeasured | 24.96 (n=7050, 90% [24.83, 24.96]) | 0.00 / 0.00 |
| r0-39p4 | 39.40 | 39.40 (n=2364, 90% [39.28, 39.53]) | 0 | 0 | 0 / 0 / 0 | 3.46 (n=2364, 90% [3.42, 3.52]) | 63.23 (n=2364, 90% [42.49, 71.17]) | 63.23 (n=2364, 90% [42.49, 77.82]) | unmeasured | 24.83 (n=2364, 90% [24.83, 24.96]) | 0.00 / 0.00 |

| Cell | SDK timer p99 ms | Admission p99 ms | Request send p99 ms | Gateway queue p99 ms | Native entry p99 ms | Native compute p99 ms | Logical saves / native tx |
| --- | --- | --- | --- | --- | --- | --- | --- |
| r0-3p5 | 2.16 (n=525, 90% [1.88, 2.25]) | 1.13 (n=525, 90% [0.64, 2.40]) | 2.32 (n=525, 90% [1.09, 3.49]) | unmeasured | 8.03 (n=525, 90% [6.01, 39.17]) | 47.62 (n=525, 90% [42.49, 76.80]) | 525 / 525 |
| r0-4p9 | 1.86 (n=588, 90% [1.77, 1.98]) | 0.71 (n=588, 90% [0.31, 1.36]) | 1.13 (n=588, 90% [0.55, 1.99]) | unmeasured | 4.01 (n=588, 90% [4.01, 5.02]) | 7.13 (n=588, 90% [6.08, 8.83]) | 588 / 588 |
| r0-23p5 | 1.96 (n=7050, 90% [1.93, 1.99]) | 0.27 (n=7050, 90% [0.26, 0.28]) | 0.54 (n=7050, 90% [0.50, 0.71]) | unmeasured | 3.01 (n=7050, 90% [3.01, 4.01]) | 11.78 (n=7050, 90% [11.01, 12.93]) | 7050 / 7050 |
| r0-39p4 | 2.10 (n=2364, 90% [2.04, 2.14]) | 0.25 (n=2364, 90% [0.22, 0.31]) | 0.47 (n=2364, 90% [0.41, 0.53]) | unmeasured | 39.17 (n=2364, 90% [19.07, 49.15]) | 12.48 (n=2364, 90% [10.18, 15.62]) | 2364 / 2364 |

Separate WAL latency is unmeasured. Per-cell cgroup, storage and sender dose records are in the compact evidence.

Cgroup peaks in GiB through each sampled cell, including that arm's restore and startup.

| Cell | Transactor | PostgreSQL | Write gateway | Read gateway |
| --- | ---: | ---: | ---: | ---: |
| r0-3p5 | 1.11 | 6.00 | 1.40 | 0.42 |
| r0-4p9 | 1.33 | 6.00 | 1.40 | 0.43 |
| r0-23p5 | 2.34 | 6.00 | 1.45 | 0.45 |
| r0-39p4 | 2.45 | 6.00 | 1.46 | 0.45 |

## arm-d7-single-read-c

100000 deep people per account, single layout, individual writer with 64 reader seats. Source `0ac94040950bff80974e1f0cc21c4c73f914b3d5`. Audited write path.

| Cell | Offered/s | Durable ACKs/s (n) | Pre-dispatch expiry | Missing | Refused / uncertain / recovered | p50 ms | p99 ms | Quiet save p99 ms | Reader p99 ms | Feed p99 ms | ACK / disposition drain ms |
| --- | ---: | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- | ---: |
| r0-3p5 | 3.50 | 3.50 (n=525, 90% [3.43, 3.58]) | 0 | 0 | 0 / 0 / 0 | 11.26 (n=525, 90% [10.56, 11.90]) | 74.24 (n=525, 90% [63.74, 101.89]) | 74.24 (n=525, 90% [64.00, 101.89]) | 10.62 (n=9120, 90% [9.15, 12.73]) | 27.01 (n=525, 90% [24.83, 42.49]) | 0.00 / 0.00 |
| r0-4p9 | 4.90 | 4.90 (n=588, 90% [4.83, 4.97]) | 0 | 0 | 0 / 0 / 0 | 4.93 (n=588, 90% [4.80, 5.09]) | 33.79 (n=588, 90% [20.35, 40.45]) | 33.79 (n=588, 90% [27.90, 40.45]) | 4.45 (n=7200, 90% [4.05, 4.89]) | 26.11 (n=588, 90% [24.96, 29.05]) | 0.00 / 0.00 |
| r0-23p5 | 23.50 | 23.50 (n=7050, 90% [23.45, 23.55]) | 0 | 0 | 0 / 0 / 0 | 3.57 (n=7050, 90% [3.55, 3.60]) | 34.05 (n=7050, 90% [25.73, 37.63]) | 34.05 (n=7050, 90% [25.73, 37.38]) | 4.13 (n=18720, 90% [3.95, 4.42]) | 25.21 (n=7050, 90% [25.09, 25.21]) | 0.00 / 0.00 |
| r0-39p4 | 39.40 | 39.40 (n=2364, 90% [39.23, 39.58]) | 0 | 0 | 0 / 0 / 0 | 3.34 (n=2364, 90% [3.29, 3.39]) | 46.85 (n=2364, 90% [31.87, 59.90]) | 46.85 (n=2364, 90% [31.87, 60.16]) | 3.47 (n=3360, 90% [3.34, 3.82]) | 25.09 (n=2364, 90% [25.09, 25.21]) | 0.00 / 0.00 |

| Cell | SDK timer p99 ms | Admission p99 ms | Request send p99 ms | Gateway queue p99 ms | Native entry p99 ms | Native compute p99 ms | Logical saves / native tx |
| --- | --- | --- | --- | --- | --- | --- | --- |
| r0-3p5 | 1.90 (n=525, 90% [1.81, 1.98]) | 1.32 (n=525, 90% [0.82, 3.33]) | 2.29 (n=525, 90% [1.19, 3.74]) | unmeasured | 8.03 (n=525, 90% [6.01, 27.01]) | 55.30 (n=525, 90% [49.15, 84.99]) | 525 / 525 |
| r0-4p9 | 1.92 (n=588, 90% [1.74, 2.06]) | 0.66 (n=588, 90% [0.30, 2.11]) | 1.61 (n=588, 90% [0.87, 1.98]) | unmeasured | 4.01 (n=588, 90% [4.01, 6.01]) | 7.39 (n=588, 90% [5.21, 8.70]) | 588 / 588 |
| r0-23p5 | 1.87 (n=7050, 90% [1.82, 1.90]) | 0.18 (n=7050, 90% [0.18, 0.19]) | 0.52 (n=7050, 90% [0.43, 0.69]) | unmeasured | 3.01 (n=7050, 90% [3.01, 4.01]) | 11.01 (n=7050, 90% [10.56, 11.46]) | 7050 / 7050 |
| r0-39p4 | 1.86 (n=2364, 90% [1.82, 1.93]) | 0.18 (n=2364, 90% [0.18, 0.20]) | 0.31 (n=2364, 90% [0.29, 0.35]) | unmeasured | 29.05 (n=2364, 90% [16.06, 37.12]) | 11.90 (n=2364, 90% [10.37, 13.38]) | 2364 / 2364 |

Separate WAL latency is unmeasured. Per-cell cgroup, storage and sender dose records are in the compact evidence.

Cgroup peaks in GiB through each sampled cell, including that arm's restore and startup.

| Cell | Transactor | PostgreSQL | Write gateway | Read gateway |
| --- | ---: | ---: | ---: | ---: |
| r0-3p5 | 1.19 | 6.00 | 1.39 | 2.10 |
| r0-4p9 | 1.36 | 6.00 | 1.39 | 2.18 |
| r0-23p5 | 2.33 | 6.00 | 1.45 | 2.34 |
| r0-39p4 | 2.55 | 6.00 | 1.47 | 2.34 |

## arm-d7-wfix-pilot-seed

10000 deep people per account, pooled layout, individual writer. Source `e1a3f01a7c5adcc7c017ee4363a40ed667338994`. Audited write path.

16,245,050 current facts across 1 database(s). Ingest took 0.68 hours at 6598.71 facts/s. Exact claim and feed verification took 0.61 hours. PostgreSQL added 722.81 bytes per fact (one physical seed).

Observed ingest cgroup peaks in GiB, from 41 progress snapshots.

| Transactor | PostgreSQL | Write gateway | Read gateway |
| ---: | ---: | ---: | ---: |
| 4.80 | 6.00 | 0.27 | 2.83 |

## arm-d7-wfix-pilot-bounded

10000 deep people per account, pooled layout, bounded writer. Source `e1a3f01a7c5adcc7c017ee4363a40ed667338994`. Audited write path.

Terminal status exit-code. Cells with a sealed writer ledger 0. Matched decision unmeasured.

## arm-d7-wfix-pilot-b

10000 deep people per account, pooled layout, bounded writer. Source `97852735506d9f04d7a2195ee11bc0535b7a2493`. Audited write path.

| Cell | Offered/s | Durable ACKs/s (n) | Pre-dispatch expiry | Missing | Refused / uncertain / recovered | p50 ms | p99 ms | Quiet save p99 ms | Reader p99 ms | Feed p99 ms | ACK / disposition drain ms |
| --- | ---: | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- | ---: |
| r0-alone | 3.50 | 3.50 (n=315, 90% [3.41, 3.59]) | 0 | 0 | 0 / 0 / 0 | 11.07 (n=315, 90% [10.49, 11.78]) | 80.89 (n=315, 90% [47.62, 307.20]) | 80.89 (n=315, 90% [45.05, 307.20]) | 8.03 (n=3840, 90% [6.66, 10.56]) | 25.73 (n=315, 90% [25.21, 26.75]) | 0.00 / 0.00 |
| r0-35 | 35.00 | 34.99 (n=3149, 90% [34.42, 35.58]) | 0 | 0 | 0 / 0 / 0 | 6.30 (n=3150, 90% [6.11, 6.46]) | 288.77 (n=3150, 90% [266.24, 352.25]) | 301.06 (n=315, 90% [178.18, 327.68]) | 2.98 (n=3840, 90% [2.62, 3.54]) | 24.83 (n=315, 90% [24.19, 24.96]) | 2.41 / 2.41 |
| r0-50 | 50.00 | 50.00 (n=4500, 90% [49.60, 50.43]) | 0 | 0 | 0 / 0 / 0 | 3.54 (n=4500, 90% [3.49, 3.58]) | 84.99 (n=4500, 90% [76.80, 94.21]) | 91.14 (n=315, 90% [54.02, 109.06]) | 2.32 (n=3840, 90% [2.21, 2.54]) | 25.09 (n=315, 90% [24.83, 25.21]) | 0.00 / 0.00 |
| r0-235 | 235.00 | 234.74 (n=21127, 90% [222.36, 245.78]) | 0 | 0 | 0 / 0 / 0 | 102.91 (n=21150, 90% [98.30, 109.06]) | 5701.63 (n=21150, 90% [5505.02, 5931.01]) | 708.61 (n=315, 90% [514.05, 724.99]) | 4.58 (n=3840, 90% [3.55, 5.76]) | 25.34 (n=315, 90% [25.09, 25.60]) | 44.01 / 44.01 |
| r0-394 | 394.00 | 268.63 (n=24177, 90% [251.08, 285.71]) | 4335 | 0 | 0 / 0 / 0 | 10092.54 (n=31125, 90% [9961.47, 10223.61]) | 30539.78 (n=31125, 90% [30539.78, 30539.78]) | 770.05 (n=315, 90% [643.07, 806.91]) | 9.92 (n=3840, 90% [6.33, 13.18]) | 25.09 (n=315, 90% [24.96, 26.50]) | 25035.66 / 25035.66 |
| r1-alone | 3.50 | 3.50 (n=315, 90% [3.42, 3.58]) | 0 | 0 | 0 / 0 / 0 | 7.23 (n=315, 90% [6.62, 7.65]) | 25.34 (n=315, 90% [22.66, 41.73]) | 25.34 (n=315, 90% [22.66, 41.73]) | 9.98 (n=3840, 90% [7.01, 12.80]) | 25.21 (n=315, 90% [24.45, 25.98]) | 0.00 / 0.00 |
| r1-394 | 394.00 | 232.58 (n=20932, 90% [218.54, 248.38]) | 7800 | 0 | 0 / 0 / 0 | 19005.44 (n=27660, 90% [18350.08, 19529.73]) | 31326.21 (n=27660, 90% [31326.21, 31457.28]) | 770.05 (n=315, 90% [708.61, 774.14]) | 15.62 (n=3840, 90% [12.54, 21.25]) | 25.34 (n=315, 90% [24.70, 28.03]) | 32091.86 / 32091.86 |
| r1-235 | 235.00 | 201.56 (n=18140, 90% [185.94, 217.57]) | 518 | 0 | 0 / 0 / 0 | 2965.50 (n=20632, 90% [2867.20, 3047.42]) | 30277.63 (n=20632, 90% [30277.63, 30277.63]) | 839.68 (n=315, 90% [679.93, 929.79]) | 25.21 (n=3840, 90% [22.14, 28.67]) | 27.39 (n=315, 90% [24.96, 42.75]) | 8348.04 / 8348.04 |
| r1-50 | 50.00 | 50.00 (n=4500, 90% [49.20, 50.86]) | 0 | 0 | 0 / 0 / 0 | 6.91 (n=4500, 90% [6.69, 7.07]) | 643.07 (n=4500, 90% [589.82, 700.41]) | 485.38 (n=315, 90% [228.35, 761.86]) | 15.49 (n=3840, 90% [12.73, 18.56]) | 27.14 (n=315, 90% [25.09, 36.61]) | 0.00 / 0.00 |
| r1-35 | 35.00 | 34.99 (n=3149, 90% [34.70, 35.27]) | 0 | 0 | 0 / 0 / 0 | 4.22 (n=3150, 90% [4.13, 4.29]) | 81.41 (n=3150, 90% [63.49, 104.96]) | 52.48 (n=315, 90% [17.79, 155.65]) | 19.20 (n=3840, 90% [16.00, 22.53]) | 25.34 (n=315, 90% [24.96, 26.50]) | 0.07 / 0.07 |

| Offered/s | Quiet save ratio | Quiet read ratio | Quiet feed ratio | Both absolute cells within budget |
| ---: | --- | --- | --- | --- |
| 35 | 3.77× (n=630/630, 90% [1.75, 5.88]) | 1.37× (n=7680/7680, 90% [0.92, 1.70]) | 0.98× (n=630/630, 90% [0.96, 1.01]) | no |
| 50 | 4.31× (n=630/630, 90% [2.48, 10.19]) | 1.19× (n=7680/7680, 90% [0.90, 1.44]) | 0.99× (n=630/630, 90% [0.97, 1.08]) | no |
| 235 | 13.76× (n=630/630, 90% [8.91, 17.39]) | 2.13× (n=7680/7680, 90% [1.39, 2.64]) | 1.06× (n=630/630, 90% [0.98, 1.12]) | no |
| 394 | 14.53× (n=630/630, 90% [9.47, 17.48]) | 1.51× (n=7680/7680, 90% [1.08, 1.90]) | 0.99× (n=630/630, 90% [0.96, 1.05]) | no |

| Cell | SDK timer p99 ms | Admission p99 ms | Request send p99 ms | Gateway queue p99 ms | Native entry p99 ms | Native compute p99 ms | Logical saves / native tx |
| --- | --- | --- | --- | --- | --- | --- | --- |
| r0-alone | 2.13 (n=315, 90% [1.93, 2.37]) | 1.25 (n=315, 90% [0.69, 3.65]) | 2.90 (n=315, 90% [1.15, 4.01]) | 0.12 (n=315, 90% [0.01, 71.68]) | 7.01 (n=315, 90% [5.02, 13.05]) | 44.03 (n=315, 90% [31.61, 67.07]) | 315 / 315 |
| r0-35 | 1.79 (n=3150, 90% [1.72, 1.85]) | 0.20 (n=3150, 90% [0.19, 0.21]) | 1.04 (n=3150, 90% [0.80, 1.55]) | 220.16 (n=3150, 90% [183.29, 244.74]) | 4.01 (n=3150, 90% [4.01, 4.01]) | 25.60 (n=3150, 90% [21.38, 31.74]) | 3150 / 3008 |
| r0-50 | 1.83 (n=4500, 90% [1.77, 1.85]) | 0.19 (n=4500, 90% [0.18, 0.19]) | 0.51 (n=4500, 90% [0.49, 0.54]) | 58.11 (n=4500, 90% [45.31, 62.98]) | 3.01 (n=4500, 90% [2.01, 3.01]) | 6.37 (n=4500, 90% [5.98, 6.69]) | 4500 / 4407 |
| r0-235 | 1.78 (n=21150, 90% [1.74, 1.83]) | 5570.56 (n=21150, 90% [5308.41, 5767.17]) | 0.71 (n=21150, 90% [0.69, 0.73]) | 864.25 (n=21150, 90% [847.87, 897.02]) | 5.02 (n=21150, 90% [4.01, 5.02]) | 8.06 (n=21150, 90% [7.68, 8.38]) | 21150 / 12694 |
| r0-394 | 2.14 (n=31125, 90% [2.02, 2.32]) | 29999.46 (n=31125, 90% [29999.22, 29999.46]) | 0.42 (n=31125, 90% [0.40, 0.43]) | 1269.76 (n=31125, 90% [1269.76, 1277.95]) | 3.01 (n=31125, 90% [3.01, 3.01]) | 4.70 (n=31125, 90% [4.54, 4.83]) | 31125 / 15775 |
| r1-alone | 2.10 (n=315, 90% [2.06, 2.38]) | 0.78 (n=315, 90% [0.48, 3.17]) | 1.39 (n=315, 90% [0.95, 2.90]) | 0.01 (n=315, 90% [0.00, 0.01]) | 1.00 (n=315, 90% [1.00, 2.01]) | 19.97 (n=315, 90% [17.92, 20.48]) | 315 / 315 |
| r1-394 | 5.63 (n=27660, 90% [5.02, 6.21]) | 29999.98 (n=27660, 90% [29999.55, 29999.98]) | 0.35 (n=27660, 90% [0.34, 0.35]) | 1531.90 (n=27660, 90% [1499.13, 1564.67]) | 3.01 (n=27660, 90% [3.01, 3.01]) | 5.98 (n=27660, 90% [5.76, 6.11]) | 27660 / 13855 |
| r1-235 | 2.51 (n=20632, 90% [2.24, 2.90]) | 29884.42 (n=20632, 90% [29884.42, 29884.42]) | 0.48 (n=20632, 90% [0.46, 0.49]) | 1777.66 (n=20632, 90% [1753.09, 1810.43]) | 3.01 (n=20632, 90% [3.01, 3.01]) | 5.57 (n=20632, 90% [5.44, 5.89]) | 20632 / 10330 |
| r1-50 | 1.79 (n=4500, 90% [1.76, 1.84]) | 0.30 (n=4500, 90% [0.28, 0.31]) | 0.56 (n=4500, 90% [0.53, 0.58]) | 432.13 (n=4500, 90% [360.45, 509.95]) | 2.01 (n=4500, 90% [2.01, 2.01]) | 25.60 (n=4500, 90% [24.19, 28.93]) | 4500 / 4101 |
| r1-35 | 1.89 (n=3150, 90% [1.83, 1.94]) | 0.32 (n=3150, 90% [0.31, 0.33]) | 0.49 (n=3150, 90% [0.46, 0.52]) | 58.11 (n=3150, 90% [28.41, 66.05]) | 1.00 (n=3150, 90% [1.00, 1.00]) | 10.49 (n=3150, 90% [9.79, 11.52]) | 3150 / 3102 |

Separate WAL latency is unmeasured. Per-cell cgroup, storage and sender dose records are in the compact evidence.

Cgroup peaks in GiB through each sampled cell, including that arm's restore and startup.

| Cell | Transactor | PostgreSQL | Write gateway | Read gateway |
| --- | ---: | ---: | ---: | ---: |
| r0-alone | 0.68 | 6.00 | 1.37 | 1.41 |
| r0-35 | 2.31 | 6.00 | 1.93 | 1.47 |
| r0-50 | 2.64 | 6.00 | 2.04 | 1.53 |
| r0-235 | 3.24 | 6.00 | 2.82 | 1.63 |
| r0-394 | 3.36 | 6.00 | 3.03 | 1.67 |
| r1-alone | 3.36 | 6.00 | 3.03 | 1.76 |
| r1-394 | 3.81 | 6.00 | 3.06 | 1.87 |
| r1-235 | 4.01 | 6.00 | 3.06 | 1.87 |
| r1-50 | 4.02 | 6.00 | 3.06 | 1.89 |
| r1-35 | 4.02 | 6.00 | 3.06 | 1.89 |

## Matched single-account reader dose

Latency differences compare the two restores of the sealed image from arm-d7-single-seed. Each condition ran once.

| Offered/s | Save p99 with readers / zero (n / n) | Feed p99 with readers / zero (n / n) |
| ---: | --- | --- |
| 3.5 | 1.12× (525 / 525) | 1.08× (525 / 525) |
| 4.9 | 0.97× (588 / 588) | 1.04× (588 / 588) |
| 23.5 | 1.03× (7050 / 7050) | 1.01× (7050 / 7050) |
| 39.4 | 0.74× (2364 / 2364) | 1.01× (2364 / 2364) |

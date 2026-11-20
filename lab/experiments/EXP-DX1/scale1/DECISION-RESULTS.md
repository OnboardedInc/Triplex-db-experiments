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

## Matched single-account reader dose

Latency differences compare the two restores of the sealed image from arm-d7-single-seed. Each condition ran once.

| Offered/s | Save p99 with readers / zero (n / n) | Feed p99 with readers / zero (n / n) |
| ---: | --- | --- |
| 3.5 | 1.12× (525 / 525) | 1.08× (525 / 525) |
| 4.9 | 0.97× (588 / 588) | 1.04× (588 / 588) |
| 23.5 | 1.03× (7050 / 7050) | 1.01× (7050 / 7050) |
| 39.4 | 0.74× (2364 / 2364) | 1.01× (2364 / 2364) |

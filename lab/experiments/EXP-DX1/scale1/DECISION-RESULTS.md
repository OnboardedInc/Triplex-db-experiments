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

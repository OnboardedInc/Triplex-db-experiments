# Durable append tail on server 1

Use the command pinned in [the report](REPORT.md). `OUT` is a new absolute directory. `SEALED` is the original PREP1 ten-account campaign directory containing the sealed `seed.json`, `seed.pgdump`, and `plan.json` from the 16,245,050-fact comparison. Run on the assigned Linux host as root in the bench queue. The second NVMe must be reserved for the run, unmounted, and already formatted as ext4. The runner mounts it for the WAL arm, creates and cleans its own fresh WAL directory, and unmounts it. The runner never formats the device. It needs bpftrace 0.20.2 or newer with working cgroup-v2 uprobes and syscall tracepoints, the existing PostgreSQL 17 and Java 21 images, and the Datomic Java 25 image. For a private JVM1 build, set `DX_PREP1_JAVA25_RECEIPT` to its verified image receipt. [bpftrace clock implementation](https://github.com/bpftrace/bpftrace/blob/v0.20.2/src/ast/irbuilderbpf.cpp#L992)

The four arms restore the same dump separately, then run 90 s each at 235 solo, 235 loaded, 394 solo, and 394 loaded. The quiet account has 315 identical offers in each matched pair, alone and with nine neighbours. The six minutes of tape per arm span the five-minute checkpoint period. Each arm has 17 min 50 s work time and 20 s kill grace. The whole run has 74 min 20 s work time and 40 s kill grace, including seed verification, restores, analysis and teardown.

One ordered-ID, numeric-owner gateway feeds a single transactor. Core masks are transactor `0`, PostgreSQL `1`, writer `2-5`, reader `6`, and trace collector `7`. Heap maxima are 24/4/3 GiB for transactor/writer/reader. The transactor object cache is 2 GiB. The control repeats the original placement and Java 21 G1 with the new probes. WAL moves PostgreSQL's `pg_wal` to the second NVMe. ZGC uses Java 25 on the transactor with JVM1's one-core settings, retaining Java 21 G1 for both gateways. Fair turns set six outstanding offers per turn and wait for its receipts as the quiet account reclaims its turn. PostgreSQL uses `fsync=on`, `synchronous_commit=on`, `full_page_writes=on`, `wal_sync_method=fdatasync`, 2 GiB shared buffers, a five-minute checkpoint timeout, completion target 0.9, `checkpoint_flush_after=256kB`, 80 MiB minimum and 1 GiB maximum WAL, `log_checkpoints=on`, and `track_wal_io_timing=on` in all arms.

## Forecasts recorded before launch

All latencies are milliseconds. Each append percentile and maximum uses physical Datomic calls in the corresponding window. The quiet ratio uses due-to-ACK p99 for the same quiet tape. These are rough point forecasts, especially for the maxima.

| Arm | Loaded offers/s | Quiet solo p99 | Quiet loaded/solo | Solo append p99 / max | Loaded append p99 / max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Control | 235 | 74 | 4.3× | 61 / 82 | 4.7 / 233 |
| Control | 394 | 34 | 3.5× | 4.4 / 34 | 2.8 / 168 |
| Dedicated WAL | 235 | 30 | 1.7× | 14 / 35 | 2.5 / 120 |
| Dedicated WAL | 394 | 24 | 1.6× | 3 / 25 | 1.8 / 85 |
| Transactor ZGC | 235 | 72 | 4.1× | 58 / 80 | 4.5 / 225 |
| Transactor ZGC | 394 | 33 | 3.2× | 4.2 / 32 | 2.7 / 158 |
| Fair turns | 235 | 74 | 3.0× | 61 / 82 | 4.6 / 230 |
| Fair turns | 394 | 34 | 2.7× | 4.4 / 34 | 2.8 / 160 |

The WAL forecast assumes some of the long calls wait on the disk shared with PostgreSQL data. ZGC should remove safepoint overlap on the transactor while leaving long I/O waits in place. Fair turns should reduce queued work ahead of the quiet account, with little effect on the append that has already started. A quiet expiry withholds its all-offers p99 and ratio. The output keeps the expiry count and completed-only percentile.

## Combined treatment, forecast before launch

Use `tail-combined` with the same sealed small seed. Its one arm runs the same four 90-second cells within a 30-minute launch-to-cleanup cap. Dedicated WAL, Java 25 ZGC on the transactor only and six-credit fair turns are all enabled. Java 21 G1 stays on both gateways. The driver supplies the reserved unmounted ext4 NVMe and the pinned Java 25 image as above.

| Gross offers/s | Window | Delivered/s forecast | Quiet p99 forecast, ms | Loaded/solo forecast | Append p99 / max forecast, ms | Expected stored |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 235 | Alone | 3.5 | 13 | 1.00× | 2 / 14 | 315 / 315 |
| 235 | Loaded | 235 | 20 | 1.54× | 2.3 / 32 | 21,150 / 21,150 |
| 394 | Alone | 3.5 | 9 | 1.00× | 1.3 / 12 | 315 / 315 |
| 394 | Loaded | 394 | 17 | 1.89× | 2.6 / 42 | 35,460 / 35,460 |

The forecast clears the 50 ms solo bar and expects zero expiries. The point estimates exceed the 1.25× isolation bar. Separate WAL alone already brought solo p99 under 50 ms twice and made the 394 solo denominator small at 6.99 ms. At that denominator the ratio requires loaded p99 at or below 8.74 ms. For storage success, use the durable receipt count after drain alongside the in-window rate.

## Reading the run

- The raw append event records `System.nanoTime()` start/end, block sizes, SQL insert/update intervals, and the backend PID from the JDBC connection borrowed for each call. Native transaction numbers bind appends to durable command receipts and the offered tape. Startup, failed and unattributed appends are retained in the timeline, with coverage marked. Each measured cell requires witnessed ordered receipts and a PostgreSQL backend join.
- The observer tracks the actual PostgreSQL image inode and cgroup. On the same monotonic clock it traces dirty `CommitTransactionCommand` calls, their `XLogFlush` intervals and LSNs, successful `fdatasync` on the same backend within the flush, and checkpointer start, end and write/sync calls of at least 1 ms. The exact SQL join requires one commit contained in the JDBC interval on the translated PID, and a matching flush LSN. A fresh synchronous sentinel in a separate database has to witness all three probes before each tape. `pg_stat_wal` deltas and the PostgreSQL checkpoint log cross-check coverage. [PostgreSQL commit source](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/access/transam/xact.c) · [PostgreSQL WAL source](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/access/transam/xlog.c) · [PostgreSQL 17 statistics](https://www.postgresql.org/docs/17/monitoring-stats.html)
- Clock samples bracket conversions for all three JVM safepoint logs. `append-tail.ndjson` gives every append's intervals, SQL join status and overlap. The largest timed component labels an append over 20 ms if it covers at least half. Checkpoint writeback and safepoint labels mean measured overlap. A WAL-flush remainder may include WAL writes, lock waits, or a sync performed by another backend. Unmatched or ambiguous events remain unresolved. The handoff field splits a ready-to-append wait over 20 ms into time inside earlier appends and time outside them. These durations can overlap other observations. `tail-summary.json` reports counts and coverage by cell, checkpoints, bridged pauses, WAL counter deltas and hashes of the raw evidence.

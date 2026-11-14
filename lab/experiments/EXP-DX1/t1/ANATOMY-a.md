# Commit anatomy

Run tx2-dxt1-p4-anatomy-a-2-anatomy; source 104497f6e3b6a182fb121c4260b92b22642ec370; tracing full. 3605 linked HTTP exchanges / 3420 primary commits; 3420 sequential per-commit partitions, 0 with overlapping HTTP and 0 without a complete HTTP exchange. Collection complete: true.

Cross-boundary network values are signed residuals including Jetty dispatch and Node callbacks. Negative values expose concurrent write/header milestones and are retained. Quantiles do not add. Parse ends inside the resolve callback; later continuation work is outside this HTTP partition. The table sums sequential attempts per primary commit. Concurrent exchanges remain explicitly unpartitioned; raw per-exchange quantiles are retained in JSON.

Whole commit p50/p99 14.491/66.997 ms; outside the HTTP partition 4.258/30.491 ms. TypeScript total wall including offer queue p50/p99 4.368/30.570 ms, share 0.326/0.724.

TypeScript own scopes p50/p99 3.403/9.947 ms. Their observed synchronous CPU p50/p99 0.737/2.739 ms; run-queue wait 0.000/1.647 ms. Synchronous counters exclude async scopes and can be quantized.

| Step | n | p50 ms | p99 ms |
| --- | ---: | ---: | ---: |
| client encode and send | 3420 | 0.267 | 1.692 |
| outbound network and Jetty dispatch | 3420 | 0.210 | 3.432 |
| gateway before peer | 3420 | 0.835 | 6.802 |
| peer transact wait | 3420 | 6.757 | 31.318 |
| gateway after peer | 3420 | 0.200 | 1.709 |
| return network, body and callback | 3420 | 0.142 | 8.045 |
| client parse and resolve callback | 3420 | 0.050 | 0.179 |

Authored transactor function: 0/3420 commits observed, p50/p99 n/a/n/a ms. Remaining peer wait excluding that function p50/p99 6.300/30.967 ms. Function wall includes any internal wait/GC; it is not an exclusive CPU claim.

Native database/t counters: 0 primary commits; transactor p50/p99 n/a/n/a ms; apply n/a/n/a ms; queue/storage/other remainder n/a/n/a ms. These are native counters, not reconstructed timeline boundaries.

Postgres: 1626 isolated windows, 1816 ambiguous. Statement count p50/p99 2.000/16.000; server statement ms p50/p99 0.255/1.356. WAL sample delta: {"wal_records":76897,"wal_bytes":37286980,"wal_write":11391,"wal_sync":11390,"wal_write_time":166.29199999999997,"wal_sync_time":3488.497}. WAL counters are aggregate over the stated sample window, including background storage work; they are never presented as exact per-Datomic-transaction counts.

Postgres protocol scope: https://www.postgresql.org/docs/17/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY ; cumulative WAL lag: https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-STATS-VIEWS .

Peer wait still includes peer/transactor networking, transactor computation/queue and storage round trips. SQL windows are correlations without a shared transaction ID. Extended-protocol execute duration excludes the later implicit commit at Sync; it is not complete storage wall time. WAL sync counters have a different aggregate scope and are not added as a per-request measurement. Autocommit statements can each flush WAL. A statement's WAL sync count and transactor own before/after storage remain unsplit without backend-specific observations.

| Phase / largest observed cause | commits >50ms | total wall ms | total cause ms | worst trace ID |
| --- | ---: | ---: | ---: | --- |
| tail / network | 16 | 1645.490 | 1119.578 | b64bc2be1b200d270000000000001051 |
| tail / driver.queue.subject | 13 | 1371.469 | 907.468 | b64bc2be1b200d270000000000001055 |
| tail / driver.queue.scheduler-late | 7 | 1067.714 | 633.861 | b64bc2be1b200d27000000000000105d |
| tail / peer-wait | 12 | 738.943 | 353.962 | b64bc2be1b200d270000000000002035 |
| L1024 / peer-wait | 10 | 610.418 | 465.378 | b64bc2be1b200d2700000000000007d6 |
| L1024 / driver.queue.scheduler-late | 2 | 169.323 | 126.000 | b64bc2be1b200d270000000000000ae9 |
| L1024 / driver.queue.subject | 2 | 127.676 | 70.145 | b64bc2be1b200d2700000000000007d8 |
| L1024 / network | 1 | 88.094 | 68.547 | b64bc2be1b200d270000000000000ae7 |
| L4 / peer-wait | 1 | 64.172 | 54.979 | b64bc2be1b200d2700000000000004ba |
| L16 / typescript | 1 | 52.157 | 17.265 | b64bc2be1b200d270000000000000522 |

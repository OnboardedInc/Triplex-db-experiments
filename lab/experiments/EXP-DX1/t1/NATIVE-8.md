North star: identify P2's engine-side tail before changing its collector or durability. These are targeted full-level 10,000-subject recordings, source 37997257; the default verdict level remains summary. Controls are the same session's opening/closing current-layout arms, with unchanged durable settings. The original C summary run has no native counters/JFR, so its 60 peer-dominated outliers cannot be retrospectively assigned an internal cause.

Four GC-free outliers in the opening loaded control park the exact native transaction writer in `datomic.log/write_tail_descriptor`. A separate transactor I/O thread waits on the owned Postgres socket for nearly the same interval. Native database-hash/t binds the commit to its counters and writer thread. SQL and socket matching are time-window correlations without a shared SQL transaction ID; they are not an exclusive WAL-sync measurement.

| trace ID | commit / peer / native apply ms | descriptor-future park / PG socket read ms |
| --- | --- | --- |
| 297dcc833e138fb00000000000002007 | 263.078 / 256.726 / 1.370 | 252.849 / 251.825 |
| 297dcc833e138fb00000000000001eba | 243.995 / 234.577 / 6.280 | 224.684 / 223.826 |
| 297dcc833e138fb00000000000001ebb | 200.389 / 186.009 / 6.480 | 183.583 / 182.838 |
| 297dcc833e138fb00000000000001f8a | 164.804 / 157.066 / 11.400 | 142.884 / 142.278 |

The first example has INSERT execution .326 ms, then roughly 252 ms until UPDATE execution .147 ms. Extended-query execute durations omit the later implicit commit at Sync. Two storage statements are observed here; these examples do not establish extra tail-reset writes. What remains unsplit is PostgreSQL's implicit commit/WAL flush, storage/network scheduling and the response leg. Changing the JVM collector is not justified as a fix for these four waits. Fsync and synchronous commit stay enabled.

| full opening / shared-core candidate / closing | opening | candidate | closing |
| --- | --- | --- | --- |
| commits >50 ms | 49 | 43 | 29 |
| those overlapping TX GC / gateway GC | 14 / 1 | 6 / 1 | 12 / 1 |
| those with cold SQL-read counters | 17 | 7 | 7 |
| all-primary cold SQL-read commits / 3707 | 396 | 371 | 401 |
| cold SQL time p50/p99 ms | .700 / 6.260 | .530 / 4.280 | .650 / 5.370 |
| cold deserialize time p50/p99 ms | 2.460 / 31.330 | 2.040 / 16.190 | 2.520 / 28.610 |
| swap GiB / Mac CPU median,p99 % | 4.234 / 9.4,102.1 | 4.234 / 10.0,125.5 | 4.234 / 10.4,91.8 |

Overlap/cold counts are nonexclusive and do not name the largest cause by themselves. Exact index-adoption boundaries are absent. A zero-reader cold example, `058068fc8a49036b000000000000013c`, spends 61.030 ms in the authored function, with 12 SQL reads / 6.350 ms and 5.920-ms deserialization; the remaining function wall is not measured CPU. No collector, threshold or cache change is claimed to remove that remainder.

Current-layout cost per fact, targeted zero reference (full; swap 4.234 GiB, Mac CPU 10.3/84.5%; same-session loaded controls above). Quantiles are marginal p50/p99 and do not add; bands associate size with cost, not an isolated byte-only causal effect.

| facts | n | native datoms p50/p99 | commit ms | peer ms | apply ms | authored function ms |
| --- | ---: | --- | --- | --- | --- | --- |
| 5–10 | 2232 | 41/45 | 10.638/45.063 | 5.578/33.441 | 1.280/14.400 | .740/8.660 |
| 11–25 | 1076 | 61/75 | 12.639/46.664 | 6.479/37.394 | 1.620/17.000 | 1.010/10.480 |
| 26–50 | 399 | 101/125 | 16.719/62.602 | 8.262/45.553 | 2.520/20.100 | 1.660/10.790 |

Raw clock-aligned JFR, original statement logs, actual native results, source/build hashes and full host sampling remain under the five `tx2-dxt1-p8-shared-a-*` runs. Private `p8-native-analysis*` preserves the derived counters and `storage-tail*.json` preserves clipped stacks/socket fields. Original automatic reports are unchanged; later digest verification/derivation must be used for cited findings. The zero placement observations have no closing zero control, so they are not qualified zero-floor savings. Next useful instrumentation is finer Postgres wait sampling or its Sync boundary, plus a writer heap census for the retained command/oracle history.

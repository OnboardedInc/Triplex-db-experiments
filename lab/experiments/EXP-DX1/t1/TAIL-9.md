# Part 9 commit tails and writer stalls

The following comparisons use each loaded arm’s summary-tracing host/control context in [VERDICT-9.md](VERDICT-9.md). C/A/F have the identical frozen 900-second primary offer trace and 7408 commands each. They are historical comparisons across sessions; the two controlled ABA experiments are in [WITNESS-9.md](WITNESS-9.md) and [STORAGE-9.md](STORAGE-9.md).

| largest observed cause | C count / summed wall ms | A count / summed wall ms | F count / summed wall ms | F worst trace |
| --- | --- | --- | --- | --- |
| peer-wait | 60 / 7397.245 | 113 / 12070.289 | 100 / 12221.579 | `6da2db1f2b98870a0000000000002327` |
| driver.queue.scheduler-late | 10 / 922.265 | 5 / 444.533 | 12 / 1746.026 | `6da2db1f2b98870a0000000000000434` |
| driver.queue.subject | 11 / 1101.573 | 18 / 2252.979 | 11 / 845.545 | `6da2db1f2b98870a000000000000043b` |
| network | 10 / 2212.500 | 8 / 740.748 | 4 / 488.736 | `6da2db1f2b98870a0000000000002420` |
| typescript | 1 / 207.622 | 0 / 0 | 3 / 192.382 | `6da2db1f2b98870a000000000000384f` |
| peer-call | 0 / 0 | 0 / 0 | 1 / 63.340 | `6da2db1f2b98870a00000000000016b2` |
| gateway | 4 / 258.203 | 0 / 0 | 0 / 0 | — |
| all commits >50 ms | 96 / 12099.408 | 144 / 15508.549 | 131 / 15557.608 | — |

Each commit is counted once, assigned to its largest observed exclusive span; summed wall is the complete latency of those commits, not additive causal time. Summary `peer-wait` includes peer/transactor transport, scheduling, storage and pauses; `peer-call` is peer call setup. This selection has no native/JFR/SQL collectors, so F’s 100 peer-dominated outliers are not individually certified WAL-sync stalls. The earlier full-level windows do locate PG `IO:WalSync` plus guest block flush delay, with examples in STORAGE-9.

| writer, primary timing window | C | A | F |
| --- | ---: | ---: | ---: |
| GC events | 1811 | 1696 | 1701 |
| GC total / maximum ms | 5082.407 / 71.153 | 4750.755 / 74.980 | 5047.252 / 149.975 |
| GC >50 ms count / total ms | 4 / 245.330 | 2 / 143.363 | 3 / 288.270 |
| heap median / maximum MiB | 529.758 / 1015.871 | 534.238 / 883.431 | 567.594 / 876.725 |
| lateness >50 ms intervals / merged episodes | 4 / 2 | 6 / 3 | 13 / 4 |
| lateness episode union ms | 205.077 | 373.756 | 449.530 |

Distinct scheduler episodes union overlapping waits from different commits. These are timer-lateness intervals, not a count of independent transactions stalled. Main-writer records are checked for source/run/slot/thread 0; the actual worker persistence interval is a separate resource overlay.

| F scheduler episode ms | clipped GC union ms | remaining ms | first delayed commit trace | named overlapping work |
| --- | ---: | ---: | --- | --- |
| 149.446 | 148.307 | 1.139 | `6da2db1f2b98870a0000000000000433` | no named synchronous scope |
| 84.109 | 6.866 | 77.243 | `6da2db1f2b98870a0000000000002435` | client.encode 16.610 ms, driver.reader-basis.broadcast 0.407 ms |
| 91.071 | 19.945 | 71.126 | `6da2db1f2b98870a0000000000002448` | client.encode 28.256 ms, driver.reader-basis.broadcast 0.994 ms |
| 124.903 | 16.893 | 108.010 | `6da2db1f2b98870a000000000000244e` | driver.reader-basis.broadcast 0.377 ms, driver.publication.persist-deferred 0.034 ms |

The first episode is almost entirely GC. The other residuals stay unassigned: summary spans cannot distinguish unsampled synchronous work, event-loop callbacks and thread descheduling. Named scopes can include GC; their durations are not added to the GC column. No old CPU profile is used to claim that the new residual has the same cause.

A’s 137.165-ms synchronous SQLite witness scope is now off the writer. In F, writer dispatch p50/p99/max is .017/.069/2.304 ms and independent readback .063/.354/2.730 ms over 7435 completed in-window operations; all 7436 operations durably complete. Worker storage itself reaches 118.430 ms, without blocking the writer. Original capture time, post-ACK release boundary, independent durable SELECT and exact content verification remain intact. The overall 50-ms tail is still missed, not masked by moving the witness interval.

GC count/heap changes across C/A/F are observations, not controlled heap-setting gains. Previously rejected journal/nursery/old-space/core/slim trials were not revisited. More direct host-versus-guest flush attribution and a current profile of the residual writer stalls remain open. Raw inputs, scripts and qualified derivations are sealed in `p9-final-analysis/`.

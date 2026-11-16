# Part 10 remaining commit tails

All latencies inherit each loaded arm’s tracing, swap, Mac CPU and same-session off controls in [VERDICT-10.md](VERDICT-10.md). C/A/F are historical comparisons, not causal controls. G is ERROR and unqualified; H is DONE with all reads correct and independent oracle PASS. The current frozen history workload stays unchanged.

| largest observed exclusive cause | C | A | F | G (ERROR) | H | H worst trace |
| --- | --- | --- | --- | --- | --- | --- |
| peer-wait | 60 / 7397.245 | 113 / 12070.289 | 100 / 12221.579 | 55 / 6608.753 | 46 / 7852.546 | `23e84b7c0e963e1800000000000022f3` |
| driver.queue.scheduler-late | 10 / 922.265 | 5 / 444.533 | 12 / 1746.026 | 8 / 656.013 | 4 / 280.733 | `23e84b7c0e963e180000000000002407` |
| driver.queue.subject | 11 / 1101.573 | 18 / 2252.979 | 11 / 845.545 | 6 / 431.032 | 13 / 920.761 | `23e84b7c0e963e18000000000000117c` |
| network | 10 / 2212.500 | 8 / 740.748 | 4 / 488.736 | 3 / 323.287 | 5 / 345.605 | `23e84b7c0e963e1800000000000023ea` |
| typescript | 1 / 207.622 | 0 / 0 | 3 / 192.382 | 1 / 60.847 | 0 / 0 | — |
| peer-call | 0 / 0 | 0 / 0 | 1 / 63.340 | 0 / 0 | 0 / 0 | — |
| gateway | 4 / 258.203 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | — |

Cells are number of commits / summed full wall ms for primary commits above 50 ms. Each commit is counted once by its largest exclusive observed span. These wall sums are not additive causal time. H has 68 such commits: 46 peer-wait, 13 same-subject, 5 network and 4 scheduler-lateness dominated.

| full H arm / summary | >50 burst / growth / sparse | all-primary original p99 ms |
| --- | --- | --- |
| zero | 54 / 16 / 8 | 51.130371 |
| ladder | 47 / 13 / 8 | 48.849365 |

The 256-reader small-band p99 and writer ratio are set by seven-fact trace `23e84b7c0e963e180000000000001eeb`: 103.006104-ms original latency, .001709-ms timer lateness, .048096-ms total queue/admission wait, 102.161-ms transact call, 98.981934-ms gateway peer-transact wait, and .723145 ms after ACK. Writer and gateway roots are uniquely joined and source/slot/raw bytes checked. Clock corrections leave 102.281250 ms; this outlier is not the timer bias. Peer wait includes transactor/storage, messaging, scheduling and gateway pauses; default summary does not split its internal cause.

The optional four-subject history trial reduces growth slow commits 14/17 → 0, with depths 3 and 10 complete, but changes a frozen maintenance step and is not the verdict default. Its longer growth phases also shift later phase populations; do not attribute every burst-tail difference to batching. [Same-session history ABA](HISTORY-10.md).

The native/full fixed-gap arms locate two idle-sensitive regions: durable WAL-write path and peer/transactor wake-up/handoffs. No cold SQL-read median appears in those probes. Native process, WAL statistics and per-thread residuals remain explicitly scoped in [IDLE-10.md](IDLE-10.md); no full-probe cause is assigned to a particular H outlier without native evidence. No keep-warm behavior is adopted.

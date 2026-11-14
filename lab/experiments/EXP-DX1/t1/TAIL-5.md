# Part 5 commit tails

Every actual primary commit over 50 ms is included. Counts agree with the actual writer denominator; total wall below is the recorded trace wall (onDone closure adds a small amount in these legacy traces). Cause time is the largest exclusive layer or queue component, not proof of hidden Datomic/storage internals. Bookended witness comparison only: source 3ff6db5a, clock compatibility mode held fixed. No tail improvement is claimed.

tx2-dxt1-p5-defer-b-1-baseline: summary; swap 9.802 GiB; Mac non-VM CPU median/p99 39.5/179.3%; controls 1-baseline / 4-baseline, 14.569/71.413 ms p50/p99.

| Largest cause | count | total trace wall ms | total cause ms | worst wall ms / trace ID |
| --- | ---: | ---: | ---: | --- |
| peer-wait | 62 | 4023.279 | 2695.765 | 143.316 / `417bfc4f9929a22c00000000000001fe` |
| driver.queue.subject | 16 | 1166.547 | 734.703 | 134.762 / `417bfc4f9929a22c0000000000000826` |
| network | 10 | 687.654 | 291.343 | 161.087 / `417bfc4f9929a22c000000000000082b` |
| gateway | 8 | 522.553 | 237.930 | 92.339 / `417bfc4f9929a22c000000000000035d` |
| driver.queue.scheduler-late | 6 | 438.819 | 209.837 | 82.382 / `417bfc4f9929a22c0000000000000834` |
| typescript | 3 | 179.084 | 48.720 | 70.763 / `417bfc4f9929a22c000000000000015d` |

tx2-dxt1-p5-defer-b-2-deferred: summary; swap 9.794 GiB; Mac non-VM CPU median/p99 64.2/326.5%; controls 1-baseline / 4-baseline, 14.569/71.413 ms p50/p99.

| Largest cause | count | total trace wall ms | total cause ms | worst wall ms / trace ID |
| --- | ---: | ---: | ---: | --- |
| peer-wait | 94 | 16125.643 | 13092.628 | 525.200 / `e120860e95986b4f00000000000005f1` |
| driver.queue.subject | 34 | 10739.602 | 8648.298 | 657.371 / `e120860e95986b4f0000000000000606` |
| gateway | 5 | 320.020 | 214.380 | 77.574 / `e120860e95986b4f000000000000158e` |
| network | 4 | 252.084 | 113.676 | 73.089 / `e120860e95986b4f0000000000001590` |
| driver.queue.scheduler-late | 1 | 53.086 | 27.475 | 53.086 / `e120860e95986b4f00000000000004d2` |

tx2-dxt1-p5-defer-b-3-deferred: summary; swap 9.755 GiB; Mac non-VM CPU median/p99 44.3/208.1%; controls 1-baseline / 4-baseline, 14.569/71.413 ms p50/p99.

| Largest cause | count | total trace wall ms | total cause ms | worst wall ms / trace ID |
| --- | ---: | ---: | ---: | --- |
| peer-wait | 55 | 3726.375 | 2728.863 | 154.900 / `e02eebd0058fff14000000000000024c` |
| driver.queue.subject | 11 | 766.428 | 509.123 | 114.252 / `e02eebd0058fff1400000000000011e1` |
| network | 12 | 990.754 | 469.634 | 128.239 / `e02eebd0058fff14000000000000171e` |
| driver.queue.scheduler-late | 7 | 628.034 | 259.426 | 151.431 / `e02eebd0058fff14000000000000171b` |
| gateway | 4 | 268.464 | 138.535 | 94.135 / `e02eebd0058fff140000000000001714` |
| peer-call | 1 | 148.482 | 72.796 | 148.482 / `e02eebd0058fff140000000000001718` |
| typescript | 2 | 119.698 | 36.076 | 60.965 / `e02eebd0058fff1400000000000010fb` |

tx2-dxt1-p5-defer-b-4-baseline: summary; swap 9.755 GiB; Mac non-VM CPU median/p99 52.4/342.2%; controls 1-baseline / 4-baseline, 14.569/71.413 ms p50/p99.

| Largest cause | count | total trace wall ms | total cause ms | worst wall ms / trace ID |
| --- | ---: | ---: | ---: | --- |
| peer-wait | 46 | 3467.588 | 2488.975 | 147.243 / `854d20932ad6977700000000000000f2` |
| driver.queue.scheduler-late | 10 | 1413.836 | 629.469 | 220.338 / `854d20932ad6977700000000000003cf` |
| network | 5 | 780.619 | 519.386 | 224.403 / `854d20932ad6977700000000000003c6` |
| typescript | 8 | 1067.456 | 435.905 | 189.122 / `854d20932ad6977700000000000003d3` |
| driver.queue.subject | 9 | 708.069 | 354.621 | 234.570 / `854d20932ad6977700000000000003d4` |
| typescript-gc | 1 | 281.759 | 89.892 | 281.759 / `854d20932ad6977700000000000003ca` |
| gateway | 1 | 66.709 | 26.821 | 66.709 / `854d20932ad6977700000000000001f3` |

Full zero-arm causes below are a separate 900-second workload, not an after-vs-control tail comparison. summary; swap 12.094 GiB (12.000-12.266); Mac non-VM CPU 49.7/227.4% median/p99; opening off context 13.273/67.350 ms, with 12.274-GiB swap and 51.5/244.3% Mac CPU.

| Phase | largest cause | count | total trace wall ms | total cause ms | worst trace ID |
| --- | --- | ---: | ---: | ---: | --- |
| tail | peer-wait | 92 | 8079.493 | 5863.615 | `929c6bf6f98413460000000000003cda` |
| L4 | peer-wait | 56 | 4137.918 | 3071.598 | `929c6bf6f9841346000000000000036a` |
| grow10 | peer-wait | 7 | 3488.276 | 2638.094 | `929c6bf6f98413460000000000002406` |
| tail | driver.queue.subject | 26 | 3145.291 | 2156.308 | `929c6bf6f98413460000000000003ce2` |
| L4 | driver.queue.subject | 14 | 1784.730 | 1263.840 | `929c6bf6f9841346000000000000036e` |
| L16 | peer-wait | 25 | 1579.095 | 1264.835 | `929c6bf6f984134600000000000011e8` |
| tail | network | 13 | 1294.581 | 623.396 | `929c6bf6f98413460000000000002782` |
| L16 | driver.queue.subject | 12 | 884.203 | 573.275 | `929c6bf6f984134600000000000011ea` |
| tail | driver.queue.scheduler-late | 10 | 803.782 | 385.428 | `929c6bf6f98413460000000000002781` |
| grow3 | peer-wait | 1 | 429.419 | 281.577 | `929c6bf6f98413460000000000002304` |
| tail | typescript | 5 | 412.289 | 151.922 | `929c6bf6f98413460000000000003cfb` |
| grow10 | driver.queue.scheduler-late | 4 | 367.743 | 301.979 | `929c6bf6f98413460000000000002419` |
| tail | gateway | 4 | 229.322 | 136.267 | `929c6bf6f9841346000000000000440b` |
| L1 | peer-wait | 2 | 209.251 | 154.351 | `929c6bf6f984134600000000000001f2` |
| warmup | peer-wait | 2 | 202.618 | 155.609 | `929c6bf6f98413460000000000000117` |
| L16 | network | 2 | 156.039 | 69.850 | `929c6bf6f98413460000000000001aa6` |
| L4 | network | 2 | 150.876 | 99.764 | `929c6bf6f98413460000000000000d88` |
| p4h10 | peer-wait | 1 | 107.954 | 102.190 | `929c6bf6f9841346000000000000246c` |
| L16 | gateway | 1 | 100.843 | 44.894 | `929c6bf6f98413460000000000001aa3` |
| baseline | peer-wait | 1 | 97.999 | 88.154 | `929c6bf6f98413460000000000000181` |
| sweep | network | 1 | 93.664 | 84.377 | `929c6bf6f98413460000000000002602` |
| recovery | typescript | 1 | 76.160 | 40.670 | `929c6bf6f98413460000000000002123` |
| recovery | peer-wait | 1 | 71.812 | 64.268 | `929c6bf6f984134600000000000020b8` |
| p4mix | peer-wait | 1 | 63.089 | 56.898 | `929c6bf6f98413460000000000002212` |

Five examples (same full-zero summary context):
- `929c6bf6f98413460000000000002406`: grow10 / peer-wait; no long pre-request queue in this example.
- `929c6bf6f98413460000000000002304`: grow3 / peer-wait; no long pre-request queue in this example.
- `929c6bf6f98413460000000000003ce2`: tail / driver.queue.subject; scheduler-late 12.343 ms behind None with 9/32 slots; subject 181.321 ms behind 929c6bf6f98413460000000000003cdf with 9/32 slots
- `929c6bf6f98413460000000000003cda`: tail / peer-wait; scheduler-late 61.202 ms behind None with 3/32 slots
- `929c6bf6f9841346000000000000036e`: L4 / driver.queue.subject; subject 195.444 ms behind 929c6bf6f9841346000000000000036d with 5/32 slots

Subject waits are consequences of earlier same-subject work; no slot wait is selected as the largest tail cause. Scheduler lateness with slots free is an independent benchmark-writer stall. Overlapping persistence/expected-state work is retained in the timeline; the default does not provide a CPU stack proving what the writer executed throughout the remaining lateness. No new causal attribution to the host or a hidden transactor stage is inferred.

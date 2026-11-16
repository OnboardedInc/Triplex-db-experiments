# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (35.115 ms, trace `7f5c171c0c2d73c700000000000002d7`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (56.674 ms, trace `7f5c171c0c2d73c700000000000002d8`); `node-14/thread-0/driver.queue.scheduler-late` (39.077 ms, trace `7f5c171c0c2d73c700000000000002d2`); `node-14/thread-0/driver.queue.scheduler-late` (29.479 ms, trace `7f5c171c0c2d73c700000000000002d3`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (25.823 ms, trace `7f5c171c0c2d73c700000000000002d4`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-idle-b-9-plain`; source `a0785bcf96f7afea3965b3028db2e27f4fbef6a9`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 1250/1250 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 1250/1250. Raw trace bytes: 18442649.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 4057 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 6000.773 | 1141.708 | 9.035 | 4049 |
| idle-10 | 0 | 2492.251 | 778.709 | 9.240 | 3025 |
| idle-25 | 0 | 4737.251 | 753.809 | 6.538 | 3034 |
| idle-50 | 0 | 8458.044 | 803.029 | 7.285 | 3034 |
| idle-100 | 0 | 15910.111 | 936.166 | 9.820 | 3034 |
| idle-250 | 0 | 38264.407 | 1370.005 | 19.610 | 3030 |
| idle-500 | 0 | 75532.797 | 1873.290 | 47.002 | 3034 |
| idle-1000 | 0 | 148015.843 | 2853.668 | 82.208 | 3012 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000002d7 | driver.queue.scheduler-late | 5.722 | none | 4 / 32 |
| 7f5c171c0c2d73c700000000000002d7 | driver.queue.scheduler-dispatch | 0.018 | none | 4 / 32 |

Observed active steps while trace 7f5c171c0c2d73c700000000000002d7 waited: []

| 7f5c171c0c2d73c700000000000002d8 | driver.queue.scheduler-dispatch | 0.067 | none | 5 / 32 |
| 7f5c171c0c2d73c700000000000002d8 | driver.queue.scheduler-late | 0.006 | none | 5 / 32 |

Observed active steps while trace 7f5c171c0c2d73c700000000000002d8 waited: []

| 7f5c171c0c2d73c700000000000002d2 | driver.queue.scheduler-late | 39.077 | none | 1 / 32 |
| 7f5c171c0c2d73c700000000000002d2 | driver.queue.scheduler-dispatch | 0.044 | none | 1 / 32 |

Observed active steps while trace 7f5c171c0c2d73c700000000000002d2 waited: []

| 7f5c171c0c2d73c700000000000002d3 | driver.queue.scheduler-late | 29.479 | none | 2 / 32 |
| 7f5c171c0c2d73c700000000000002d3 | driver.queue.scheduler-dispatch | 0.012 | none | 2 / 32 |

Observed active steps while trace 7f5c171c0c2d73c700000000000002d3 waited: []

| 7f5c171c0c2d73c700000000000002d4 | driver.queue.scheduler-late | 19.591 | none | 3 / 32 |
| 7f5c171c0c2d73c700000000000002d4 | driver.queue.scheduler-dispatch | 0.008 | none | 3 / 32 |

Observed active steps while trace 7f5c171c0c2d73c700000000000002d4 waited: []

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.061 | 0.000 | 0.000 | 0.533 | 2.409 | n/a | 0.000 | 0.049 | 0.490 | 1.412 | 0.023 | 0.000 | 0.108 | 4.450 | 0.839 | n/a | 0.024 | 2.458 | 0.210 | 0.024 |
| p99 | 49.052 | 3.005 | 0.000 | 2.108 | 8.958 | n/a | 0.000 | 1.352 | 0.979 | 5.497 | 0.025 | 0.000 | 0.365 | 26.597 | 5.265 | n/a | 0.271 | 10.310 | 0.244 | 0.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000000f1 | 49.052 | 8.958 | n/a | 0.000 | 1.352 | 0.979 | 5.497 | 0.025 | 0.000 | 0.108 | 26.597 | 5.265 | n/a | 0.271 | 10.310 | 0.210 | 0.271 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 7f5c171c0c2d73c7000000000000028d | 10.061 | 2.409 | n/a | 0.000 | 0.049 | 0.490 | 1.412 | 0.023 | 0.000 | 0.365 | 4.450 | 0.839 | n/a | 0.024 | 2.458 | 0.244 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.093ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.020ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.061 | 0.000 | 0.000 | 0.533 | 2.409 | n/a | 0.000 | 0.049 | 0.490 | 1.412 | 0.023 | 0.000 | 0.108 | 4.450 | 0.839 | n/a | 0.024 | 2.458 | 0.210 | 0.024 |
| p99 | 49.052 | 3.005 | 0.000 | 2.108 | 8.958 | n/a | 0.000 | 1.352 | 0.979 | 5.497 | 0.025 | 0.000 | 0.365 | 26.597 | 5.265 | n/a | 0.271 | 10.310 | 0.244 | 0.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000000f1 | 49.052 | 8.958 | n/a | 0.000 | 1.352 | 0.979 | 5.497 | 0.025 | 0.000 | 0.108 | 26.597 | 5.265 | n/a | 0.271 | 10.310 | 0.210 | 0.271 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 7f5c171c0c2d73c7000000000000028d | 10.061 | 2.409 | n/a | 0.000 | 0.049 | 0.490 | 1.412 | 0.023 | 0.000 | 0.365 | 4.450 | 0.839 | n/a | 0.024 | 2.458 | 0.244 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.093ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.020ms |

## P2 / warmup / commit (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.198 | 0.520 | 0.000 | 0.512 | 2.220 | n/a | 0.000 | 0.046 | 0.749 | 1.387 | 0.020 | 0.000 | 0.171 | 5.382 | 0.557 | n/a | 0.020 | 2.447 | 0.203 | 0.020 |
| p99 | 26.450 | 1.938 | 0.036 | 1.162 | 4.166 | n/a | 0.000 | 1.958 | 3.822 | 5.172 | 0.375 | 0.000 | 3.998 | 12.882 | 5.886 | n/a | 0.046 | 5.246 | 0.351 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c7000000000000018a | 37.942 | 1.980 | n/a | 0.000 | 0.033 | 0.637 | 1.101 | 0.018 | 0.000 | 0.095 | 7.972 | 26.087 | n/a | 0.017 | 2.013 | 0.053 | 0.017 | tx/thread-82/transactor.triplex-function | none observed |
| 7f5c171c0c2d73c700000000000000f5 | 33.884 | 4.146 | n/a | 0.000 | 1.737 | 1.260 | 1.601 | 0.023 | 0.000 | 4.298 | 14.983 | 5.808 | n/a | 0.030 | 5.883 | 0.174 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 2.294ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.065ms |
| 7f5c171c0c2d73c700000000000000f2 | 26.450 | 3.279 | n/a | 0.000 | 0.083 | 1.662 | 1.427 | 0.020 | 0.000 | 3.104 | 16.018 | 0.830 | n/a | 0.028 | 3.362 | 0.127 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.090ms |
| 7f5c171c0c2d73c700000000000000fd | 24.862 | 4.467 | n/a | 4.149 | 0.114 | 0.846 | 1.400 | 0.019 | 0.000 | 1.615 | 11.594 | 0.619 | n/a | 0.040 | 8.730 | 0.351 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000000f7 | 24.794 | 4.972 | n/a | 0.000 | 0.151 | 0.814 | 5.015 | 0.048 | 0.000 | 1.954 | 11.025 | 0.745 | n/a | 0.070 | 5.123 | 0.207 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.139ms; driver.publication.persist-deferred 0.019ms |
| 7f5c171c0c2d73c70000000000000273 | 22.723 | 2.705 | n/a | 0.000 | 0.055 | 0.883 | 1.762 | 0.023 | 0.000 | 0.124 | 11.266 | 5.873 | n/a | 0.032 | 2.760 | 0.121 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.373ms |
| 7f5c171c0c2d73c70000000000000145 | 21.983 | 2.605 | n/a | 0.000 | 0.098 | 0.677 | 3.511 | 0.023 | 0.000 | 0.418 | 10.421 | 4.184 | n/a | 0.046 | 2.703 | 0.123 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000149 | 21.282 | 2.064 | n/a | 0.000 | 0.561 | 0.694 | 3.093 | 0.041 | 0.000 | 1.414 | 12.882 | 0.513 | n/a | 0.020 | 2.625 | 0.123 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000236 | 21.033 | 1.963 | n/a | 0.000 | 1.599 | 0.482 | 1.229 | 0.014 | 0.000 | 0.068 | 6.287 | 9.377 | n/a | 0.013 | 3.563 | 0.169 | 0.013 | tx/thread-82/transactor.triplex-function | none observed |
| 7f5c171c0c2d73c70000000000000163 | 20.167 | 4.063 | n/a | 0.000 | 0.083 | 0.999 | 1.561 | 0.019 | 0.000 | 0.318 | 9.200 | 3.889 | n/a | 0.034 | 4.147 | 0.206 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000001ce | 19.755 | 3.089 | n/a | 0.000 | 0.077 | 0.749 | 1.145 | 0.030 | 0.000 | 0.333 | 8.772 | 5.487 | n/a | 0.073 | 3.166 | 0.160 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000017d | 19.561 | 1.938 | n/a | 0.000 | 1.445 | 3.822 | 1.868 | 0.047 | 0.000 | 0.136 | 9.780 | 0.509 | n/a | 0.015 | 3.383 | 0.173 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000010a | 19.329 | 2.576 | n/a | 0.000 | 0.079 | 0.654 | 3.482 | 0.023 | 0.000 | 0.352 | 10.818 | 1.316 | n/a | 0.029 | 2.655 | 0.137 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000012c | 19.292 | 3.056 | n/a | 0.000 | 0.092 | 0.688 | 1.996 | 0.019 | 0.000 | 0.786 | 10.517 | 2.101 | n/a | 0.035 | 3.148 | 0.163 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000013d | 19.250 | 1.837 | n/a | 0.000 | 0.054 | 0.943 | 3.607 | 0.043 | 0.000 | 0.130 | 12.072 | 0.540 | n/a | 0.023 | 1.891 | 0.098 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000171 | 18.375 | 1.836 | n/a | 0.000 | 0.039 | 0.801 | 4.951 | 0.022 | 0.000 | 0.075 | 8.035 | 2.598 | n/a | 0.019 | 1.875 | 0.102 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000001db | 17.921 | 1.854 | n/a | 0.000 | 0.037 | 4.507 | 1.769 | 0.039 | 0.000 | 5.096 | 4.047 | 0.554 | n/a | 0.019 | 1.891 | 0.105 | 0.019 | gw-w/thread-50/d/transact-async | none observed |
| 7f5c171c0c2d73c70000000000000120 | 17.909 | 2.456 | n/a | 0.000 | 0.050 | 2.775 | 1.277 | 0.048 | 0.000 | 0.688 | 7.892 | 2.703 | n/a | 0.020 | 2.506 | 0.140 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000001d9 | 17.811 | 2.426 | n/a | 0.000 | 0.038 | 4.137 | 4.463 | 0.019 | 0.000 | 0.069 | 6.122 | 0.519 | n/a | 0.017 | 2.464 | 0.138 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.104ms |
| 7f5c171c0c2d73c7000000000000018b | 17.742 | 3.170 | n/a | 0.000 | 0.057 | 1.667 | 1.414 | 0.018 | 0.000 | 0.126 | 9.972 | 1.289 | n/a | 0.029 | 3.228 | 0.182 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.298ms; driver.publication.persist-deferred 0.017ms |

## P2 / warmup / commit / 5-10 facts (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.198 | 0.520 | 0.000 | 0.512 | 2.220 | n/a | 0.000 | 0.046 | 0.749 | 1.387 | 0.020 | 0.000 | 0.171 | 5.382 | 0.557 | n/a | 0.020 | 2.447 | 0.203 | 0.020 |
| p99 | 26.450 | 1.938 | 0.036 | 1.162 | 4.166 | n/a | 0.000 | 1.958 | 3.822 | 5.172 | 0.375 | 0.000 | 3.998 | 12.882 | 5.886 | n/a | 0.046 | 5.246 | 0.351 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c7000000000000018a | 37.942 | 1.980 | n/a | 0.000 | 0.033 | 0.637 | 1.101 | 0.018 | 0.000 | 0.095 | 7.972 | 26.087 | n/a | 0.017 | 2.013 | 0.053 | 0.017 | tx/thread-82/transactor.triplex-function | none observed |
| 7f5c171c0c2d73c700000000000000f5 | 33.884 | 4.146 | n/a | 0.000 | 1.737 | 1.260 | 1.601 | 0.023 | 0.000 | 4.298 | 14.983 | 5.808 | n/a | 0.030 | 5.883 | 0.174 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 2.294ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.065ms |
| 7f5c171c0c2d73c700000000000000f2 | 26.450 | 3.279 | n/a | 0.000 | 0.083 | 1.662 | 1.427 | 0.020 | 0.000 | 3.104 | 16.018 | 0.830 | n/a | 0.028 | 3.362 | 0.127 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.090ms |
| 7f5c171c0c2d73c700000000000000fd | 24.862 | 4.467 | n/a | 4.149 | 0.114 | 0.846 | 1.400 | 0.019 | 0.000 | 1.615 | 11.594 | 0.619 | n/a | 0.040 | 8.730 | 0.351 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000000f7 | 24.794 | 4.972 | n/a | 0.000 | 0.151 | 0.814 | 5.015 | 0.048 | 0.000 | 1.954 | 11.025 | 0.745 | n/a | 0.070 | 5.123 | 0.207 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.139ms; driver.publication.persist-deferred 0.019ms |
| 7f5c171c0c2d73c70000000000000273 | 22.723 | 2.705 | n/a | 0.000 | 0.055 | 0.883 | 1.762 | 0.023 | 0.000 | 0.124 | 11.266 | 5.873 | n/a | 0.032 | 2.760 | 0.121 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.373ms |
| 7f5c171c0c2d73c70000000000000145 | 21.983 | 2.605 | n/a | 0.000 | 0.098 | 0.677 | 3.511 | 0.023 | 0.000 | 0.418 | 10.421 | 4.184 | n/a | 0.046 | 2.703 | 0.123 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000149 | 21.282 | 2.064 | n/a | 0.000 | 0.561 | 0.694 | 3.093 | 0.041 | 0.000 | 1.414 | 12.882 | 0.513 | n/a | 0.020 | 2.625 | 0.123 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000236 | 21.033 | 1.963 | n/a | 0.000 | 1.599 | 0.482 | 1.229 | 0.014 | 0.000 | 0.068 | 6.287 | 9.377 | n/a | 0.013 | 3.563 | 0.169 | 0.013 | tx/thread-82/transactor.triplex-function | none observed |
| 7f5c171c0c2d73c70000000000000163 | 20.167 | 4.063 | n/a | 0.000 | 0.083 | 0.999 | 1.561 | 0.019 | 0.000 | 0.318 | 9.200 | 3.889 | n/a | 0.034 | 4.147 | 0.206 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000001ce | 19.755 | 3.089 | n/a | 0.000 | 0.077 | 0.749 | 1.145 | 0.030 | 0.000 | 0.333 | 8.772 | 5.487 | n/a | 0.073 | 3.166 | 0.160 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000017d | 19.561 | 1.938 | n/a | 0.000 | 1.445 | 3.822 | 1.868 | 0.047 | 0.000 | 0.136 | 9.780 | 0.509 | n/a | 0.015 | 3.383 | 0.173 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000010a | 19.329 | 2.576 | n/a | 0.000 | 0.079 | 0.654 | 3.482 | 0.023 | 0.000 | 0.352 | 10.818 | 1.316 | n/a | 0.029 | 2.655 | 0.137 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000012c | 19.292 | 3.056 | n/a | 0.000 | 0.092 | 0.688 | 1.996 | 0.019 | 0.000 | 0.786 | 10.517 | 2.101 | n/a | 0.035 | 3.148 | 0.163 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000013d | 19.250 | 1.837 | n/a | 0.000 | 0.054 | 0.943 | 3.607 | 0.043 | 0.000 | 0.130 | 12.072 | 0.540 | n/a | 0.023 | 1.891 | 0.098 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000171 | 18.375 | 1.836 | n/a | 0.000 | 0.039 | 0.801 | 4.951 | 0.022 | 0.000 | 0.075 | 8.035 | 2.598 | n/a | 0.019 | 1.875 | 0.102 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000001db | 17.921 | 1.854 | n/a | 0.000 | 0.037 | 4.507 | 1.769 | 0.039 | 0.000 | 5.096 | 4.047 | 0.554 | n/a | 0.019 | 1.891 | 0.105 | 0.019 | gw-w/thread-50/d/transact-async | none observed |
| 7f5c171c0c2d73c70000000000000120 | 17.909 | 2.456 | n/a | 0.000 | 0.050 | 2.775 | 1.277 | 0.048 | 0.000 | 0.688 | 7.892 | 2.703 | n/a | 0.020 | 2.506 | 0.140 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000001d9 | 17.811 | 2.426 | n/a | 0.000 | 0.038 | 4.137 | 4.463 | 0.019 | 0.000 | 0.069 | 6.122 | 0.519 | n/a | 0.017 | 2.464 | 0.138 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.104ms |
| 7f5c171c0c2d73c7000000000000018b | 17.742 | 3.170 | n/a | 0.000 | 0.057 | 1.667 | 1.414 | 0.018 | 0.000 | 0.126 | 9.972 | 1.289 | n/a | 0.029 | 3.228 | 0.182 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.298ms; driver.publication.persist-deferred 0.017ms |

## P2 / idle-10 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.129 | 0.215 | 0.000 | 0.503 | 2.176 | n/a | 0.000 | 0.067 | 0.810 | 1.351 | 0.020 | 0.000 | 0.127 | 7.564 | 0.621 | n/a | 0.021 | 2.405 | 0.171 | 0.021 |
| p99 | 73.453 | 1.599 | 0.185 | 1.208 | 4.735 | n/a | 0.000 | 29.490 | 13.682 | 5.551 | 0.078 | 16.226 | 4.986 | 51.833 | 4.757 | n/a | 0.051 | 32.385 | 0.510 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000002d7 | 73.940 | 1.750 | n/a | 0.000 | 5.740 | 10.531 | 3.988 | 0.009 | 16.226 | 0.028 | 35.115 | 0.539 | n/a | 0.013 | 7.490 | 0.101 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.126ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.readback 0.074ms; driver.publication.readback 0.059ms |
| 7f5c171c0c2d73c700000000000002d8 | 73.453 | 2.834 | n/a | 0.000 | 0.074 | 7.538 | 1.093 | 0.023 | 0.000 | 0.345 | 56.674 | 4.839 | n/a | 0.034 | 2.908 | 0.040 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.074ms; driver.publication.readback 0.067ms |
| 7f5c171c0c2d73c700000000000002d2 | 72.361 | 2.362 | n/a | 0.000 | 39.120 | 4.979 | 4.312 | 0.038 | 0.000 | 0.101 | 20.214 | 1.218 | n/a | 0.017 | 41.482 | 0.573 | 0.017 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.persist-deferred 0.022ms |
| 7f5c171c0c2d73c700000000000002d3 | 67.145 | 2.895 | n/a | 0.000 | 29.490 | 7.207 | 0.903 | 0.012 | 0.000 | 0.028 | 25.735 | 0.866 | n/a | 0.009 | 32.385 | 0.482 | 0.009 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.021ms |
| 7f5c171c0c2d73c700000000000002d4 | 64.526 | 3.692 | n/a | 0.000 | 19.599 | 13.682 | 0.894 | 0.009 | 0.000 | 0.017 | 25.823 | 0.805 | n/a | 0.006 | 23.291 | 0.361 | 0.006 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.readback 0.059ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.022ms |
| 7f5c171c0c2d73c700000000000002d5 | 64.091 | 4.988 | n/a | 0.000 | 9.702 | 7.113 | 4.860 | 0.027 | 0.000 | 3.786 | 29.667 | 3.942 | n/a | 0.006 | 14.690 | 0.229 | 0.006 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.readback 0.074ms; driver.publication.readback 0.059ms; driver.publication.readback 0.054ms |
| 7f5c171c0c2d73c700000000000002d9 | 59.531 | 1.939 | n/a | 0.000 | 0.057 | 1.397 | 0.733 | 0.011 | 0.000 | 3.107 | 51.833 | 0.428 | n/a | 0.026 | 1.996 | 0.034 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.074ms; driver.publication.readback 0.059ms |
| 7f5c171c0c2d73c700000000000002d0 | 55.616 | 2.434 | n/a | 0.000 | 0.756 | 42.320 | 1.734 | 0.057 | 0.000 | 0.590 | 7.094 | 0.621 | n/a | 0.011 | 3.190 | 0.057 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.230ms; driver.publication.persist-deferred 0.061ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.026ms |
| 7f5c171c0c2d73c700000000000002da | 52.552 | 1.728 | n/a | 0.000 | 0.053 | 1.939 | 1.714 | 0.017 | 0.000 | 0.357 | 43.875 | 2.847 | n/a | 0.023 | 1.781 | 0.034 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.publication.readback 0.074ms; driver.publication.readback 0.067ms; driver.publication.readback 0.059ms |
| 7f5c171c0c2d73c700000000000002dd | 46.938 | 1.944 | n/a | 0.000 | 0.037 | 0.621 | 1.580 | 0.031 | 0.000 | 5.267 | 36.806 | 0.631 | n/a | 0.021 | 1.981 | 0.042 | 0.021 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.publication.readback 0.114ms; driver.publication.readback 0.074ms; driver.publication.readback 0.067ms |
| 7f5c171c0c2d73c70000000000000378 | 41.015 | 2.283 | n/a | 0.000 | 0.041 | 0.845 | 1.508 | 0.029 | 0.000 | 0.151 | 35.643 | 0.494 | n/a | 0.021 | 2.324 | 0.057 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.041ms |
| 7f5c171c0c2d73c700000000000002df | 39.464 | 1.859 | n/a | 0.000 | 0.053 | 1.036 | 4.641 | 0.015 | 16.226 | 0.033 | 14.249 | 1.321 | n/a | 0.031 | 1.912 | 0.048 | 0.031 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.publication.readback 0.114ms; driver.publication.readback 0.067ms; driver.publication.readback 0.043ms |
| 7f5c171c0c2d73c700000000000002e2 | 38.423 | 3.817 | n/a | 0.000 | 0.046 | 3.297 | 1.160 | 0.028 | 0.000 | 0.058 | 29.424 | 0.571 | n/a | 0.024 | 3.863 | 0.101 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.114ms; driver.publication.readback 0.067ms; driver.publication.readback 0.051ms; driver.publication.readback 0.043ms |
| 7f5c171c0c2d73c700000000000002e1 | 36.470 | 2.340 | n/a | 0.000 | 0.092 | 8.383 | 1.413 | 0.020 | 0.000 | 4.986 | 16.559 | 2.641 | n/a | 0.036 | 2.432 | 0.067 | 0.036 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.114ms; driver.publication.readback 0.067ms; driver.publication.readback 0.043ms; driver.publication.readback 0.039ms |
| 7f5c171c0c2d73c7000000000000029c | 35.786 | 3.318 | n/a | 0.000 | 0.092 | 12.655 | 1.451 | 0.074 | 0.000 | 0.127 | 15.964 | 2.063 | n/a | 0.042 | 3.409 | 0.095 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.063ms; driver.publication.readback 0.044ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.017ms |
| 7f5c171c0c2d73c7000000000000037a | 35.682 | 1.961 | n/a | 0.000 | 0.038 | 0.604 | 4.800 | 0.018 | 0.000 | 0.073 | 27.628 | 0.539 | n/a | 0.021 | 1.999 | 0.056 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.022ms |
| 7f5c171c0c2d73c7000000000000037b | 30.208 | 2.895 | n/a | 0.000 | 0.626 | 0.592 | 1.299 | 0.018 | 0.000 | 0.457 | 22.759 | 1.543 | n/a | 0.019 | 3.521 | 0.117 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.014ms |
| 7f5c171c0c2d73c700000000000002e5 | 29.769 | 1.755 | n/a | 0.000 | 0.018 | 2.968 | 1.855 | 0.056 | 0.000 | 0.130 | 22.449 | 0.524 | n/a | 0.014 | 1.773 | 0.060 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.114ms; driver.publication.readback 0.067ms; driver.publication.readback 0.051ms; driver.publication.readback 0.043ms; driver.publication.readback 0.039ms |
| 7f5c171c0c2d73c70000000000000299 | 29.726 | 3.568 | n/a | 0.000 | 0.107 | 3.097 | 1.427 | 0.017 | 0.000 | 0.056 | 20.854 | 0.570 | n/a | 0.031 | 3.675 | 0.124 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.016ms |
| 7f5c171c0c2d73c7000000000000037c | 28.891 | 1.847 | n/a | 0.000 | 0.052 | 0.693 | 1.555 | 0.026 | 0.000 | 0.479 | 23.149 | 1.065 | n/a | 0.024 | 1.899 | 0.066 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.132ms; driver.publication.readback 0.051ms; driver.publication.readback 0.048ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.022ms |

## P2 / idle-10 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.129 | 0.215 | 0.000 | 0.503 | 2.176 | n/a | 0.000 | 0.067 | 0.810 | 1.351 | 0.020 | 0.000 | 0.127 | 7.564 | 0.621 | n/a | 0.021 | 2.405 | 0.171 | 0.021 |
| p99 | 73.453 | 1.599 | 0.185 | 1.208 | 4.735 | n/a | 0.000 | 29.490 | 13.682 | 5.551 | 0.078 | 16.226 | 4.986 | 51.833 | 4.757 | n/a | 0.051 | 32.385 | 0.510 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000002d7 | 73.940 | 1.750 | n/a | 0.000 | 5.740 | 10.531 | 3.988 | 0.009 | 16.226 | 0.028 | 35.115 | 0.539 | n/a | 0.013 | 7.490 | 0.101 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.126ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.readback 0.074ms; driver.publication.readback 0.059ms |
| 7f5c171c0c2d73c700000000000002d8 | 73.453 | 2.834 | n/a | 0.000 | 0.074 | 7.538 | 1.093 | 0.023 | 0.000 | 0.345 | 56.674 | 4.839 | n/a | 0.034 | 2.908 | 0.040 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.074ms; driver.publication.readback 0.067ms |
| 7f5c171c0c2d73c700000000000002d2 | 72.361 | 2.362 | n/a | 0.000 | 39.120 | 4.979 | 4.312 | 0.038 | 0.000 | 0.101 | 20.214 | 1.218 | n/a | 0.017 | 41.482 | 0.573 | 0.017 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.persist-deferred 0.022ms |
| 7f5c171c0c2d73c700000000000002d3 | 67.145 | 2.895 | n/a | 0.000 | 29.490 | 7.207 | 0.903 | 0.012 | 0.000 | 0.028 | 25.735 | 0.866 | n/a | 0.009 | 32.385 | 0.482 | 0.009 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.021ms |
| 7f5c171c0c2d73c700000000000002d4 | 64.526 | 3.692 | n/a | 0.000 | 19.599 | 13.682 | 0.894 | 0.009 | 0.000 | 0.017 | 25.823 | 0.805 | n/a | 0.006 | 23.291 | 0.361 | 0.006 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.readback 0.059ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.022ms |
| 7f5c171c0c2d73c700000000000002d5 | 64.091 | 4.988 | n/a | 0.000 | 9.702 | 7.113 | 4.860 | 0.027 | 0.000 | 3.786 | 29.667 | 3.942 | n/a | 0.006 | 14.690 | 0.229 | 0.006 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.103ms; driver.publication.readback 0.074ms; driver.publication.readback 0.059ms; driver.publication.readback 0.054ms |
| 7f5c171c0c2d73c700000000000002d9 | 59.531 | 1.939 | n/a | 0.000 | 0.057 | 1.397 | 0.733 | 0.011 | 0.000 | 3.107 | 51.833 | 0.428 | n/a | 0.026 | 1.996 | 0.034 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.074ms; driver.publication.readback 0.059ms |
| 7f5c171c0c2d73c700000000000002d0 | 55.616 | 2.434 | n/a | 0.000 | 0.756 | 42.320 | 1.734 | 0.057 | 0.000 | 0.590 | 7.094 | 0.621 | n/a | 0.011 | 3.190 | 0.057 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.230ms; driver.publication.persist-deferred 0.061ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.026ms |
| 7f5c171c0c2d73c700000000000002da | 52.552 | 1.728 | n/a | 0.000 | 0.053 | 1.939 | 1.714 | 0.017 | 0.000 | 0.357 | 43.875 | 2.847 | n/a | 0.023 | 1.781 | 0.034 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.publication.readback 0.074ms; driver.publication.readback 0.067ms; driver.publication.readback 0.059ms |
| 7f5c171c0c2d73c700000000000002dd | 46.938 | 1.944 | n/a | 0.000 | 0.037 | 0.621 | 1.580 | 0.031 | 0.000 | 5.267 | 36.806 | 0.631 | n/a | 0.021 | 1.981 | 0.042 | 0.021 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.publication.readback 0.114ms; driver.publication.readback 0.074ms; driver.publication.readback 0.067ms |
| 7f5c171c0c2d73c70000000000000378 | 41.015 | 2.283 | n/a | 0.000 | 0.041 | 0.845 | 1.508 | 0.029 | 0.000 | 0.151 | 35.643 | 0.494 | n/a | 0.021 | 2.324 | 0.057 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.041ms |
| 7f5c171c0c2d73c700000000000002df | 39.464 | 1.859 | n/a | 0.000 | 0.053 | 1.036 | 4.641 | 0.015 | 16.226 | 0.033 | 14.249 | 1.321 | n/a | 0.031 | 1.912 | 0.048 | 0.031 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.readback 0.130ms; driver.publication.readback 0.126ms; driver.publication.readback 0.114ms; driver.publication.readback 0.067ms; driver.publication.readback 0.043ms |
| 7f5c171c0c2d73c700000000000002e2 | 38.423 | 3.817 | n/a | 0.000 | 0.046 | 3.297 | 1.160 | 0.028 | 0.000 | 0.058 | 29.424 | 0.571 | n/a | 0.024 | 3.863 | 0.101 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.114ms; driver.publication.readback 0.067ms; driver.publication.readback 0.051ms; driver.publication.readback 0.043ms |
| 7f5c171c0c2d73c700000000000002e1 | 36.470 | 2.340 | n/a | 0.000 | 0.092 | 8.383 | 1.413 | 0.020 | 0.000 | 4.986 | 16.559 | 2.641 | n/a | 0.036 | 2.432 | 0.067 | 0.036 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.114ms; driver.publication.readback 0.067ms; driver.publication.readback 0.043ms; driver.publication.readback 0.039ms |
| 7f5c171c0c2d73c7000000000000029c | 35.786 | 3.318 | n/a | 0.000 | 0.092 | 12.655 | 1.451 | 0.074 | 0.000 | 0.127 | 15.964 | 2.063 | n/a | 0.042 | 3.409 | 0.095 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.063ms; driver.publication.readback 0.044ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.017ms |
| 7f5c171c0c2d73c7000000000000037a | 35.682 | 1.961 | n/a | 0.000 | 0.038 | 0.604 | 4.800 | 0.018 | 0.000 | 0.073 | 27.628 | 0.539 | n/a | 0.021 | 1.999 | 0.056 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.022ms |
| 7f5c171c0c2d73c7000000000000037b | 30.208 | 2.895 | n/a | 0.000 | 0.626 | 0.592 | 1.299 | 0.018 | 0.000 | 0.457 | 22.759 | 1.543 | n/a | 0.019 | 3.521 | 0.117 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.014ms |
| 7f5c171c0c2d73c700000000000002e5 | 29.769 | 1.755 | n/a | 0.000 | 0.018 | 2.968 | 1.855 | 0.056 | 0.000 | 0.130 | 22.449 | 0.524 | n/a | 0.014 | 1.773 | 0.060 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.114ms; driver.publication.readback 0.067ms; driver.publication.readback 0.051ms; driver.publication.readback 0.043ms; driver.publication.readback 0.039ms |
| 7f5c171c0c2d73c70000000000000299 | 29.726 | 3.568 | n/a | 0.000 | 0.107 | 3.097 | 1.427 | 0.017 | 0.000 | 0.056 | 20.854 | 0.570 | n/a | 0.031 | 3.675 | 0.124 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.016ms |
| 7f5c171c0c2d73c7000000000000037c | 28.891 | 1.847 | n/a | 0.000 | 0.052 | 0.693 | 1.555 | 0.026 | 0.000 | 0.479 | 23.149 | 1.065 | n/a | 0.024 | 1.899 | 0.066 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.132ms; driver.publication.readback 0.051ms; driver.publication.readback 0.048ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.022ms |

## P2/P4 / read-your-own-write / read (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.091 | n/a | n/a | n/a | 15.163 | 4.709 | 0.213 | 0.000 | 0.616 | 0.673 | 0.001 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.010 | 20.722 | 0.945 | 0.010 |
| p99 | 51.856 | n/a | n/a | n/a | 30.062 | 35.659 | 3.603 | 0.000 | 25.062 | 6.461 | 0.032 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.017 | 51.847 | 1.000 | 0.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000003fa | 51.856 | 16.322 | 35.525 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 51.847 | 1.000 | 0.009 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.091ms; driver.publication.readback 0.059ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.017ms |
| 7f5c171c0c2d73c700000000000002cf | 48.372 | 12.700 | 35.659 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 48.360 | 1.000 | 0.012 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.230ms; driver.publication.persist-deferred 0.061ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.026ms |
| 7f5c171c0c2d73c70000000000000323 | 46.365 | 14.481 | 0.295 | 0.000 | 0.000 | 25.062 | 6.461 | 0.002 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.007 | 14.776 | 0.319 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.071ms; driver.publication.readback 0.063ms; driver.publication.readback 0.053ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.042ms |
| 7f5c171c0c2d73c700000000000002d1 | 45.496 | 12.744 | 32.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 45.489 | 1.000 | 0.007 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.230ms; driver.publication.persist-deferred 0.061ms; driver.publication.readback 0.041ms |
| 7f5c171c0c2d73c700000000000000f4 | 41.164 | 30.062 | 1.036 | 1.863 | 0.000 | 4.942 | 3.176 | 0.032 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.017 | 32.961 | 0.801 | 0.017 | node-14/thread-2/replica.pull-at | driver.publication.readback 2.294ms; driver.publication.readback 0.139ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.065ms; driver.publication.persist-deferred 0.019ms |
| 7f5c171c0c2d73c700000000000003fc | 37.432 | 19.699 | 15.327 | 0.355 | 0.000 | 0.616 | 1.410 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.008 | 35.381 | 0.945 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.059ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.017ms |
| 7f5c171c0c2d73c700000000000002fd | 29.798 | 16.407 | 5.300 | 3.603 | 0.000 | 2.402 | 2.069 | 0.005 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.008 | 25.310 | 0.849 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.066ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.015ms |
| 7f5c171c0c2d73c700000000000000fc | 29.527 | 12.903 | 7.601 | 0.218 | 0.000 | 6.348 | 2.399 | 0.015 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.010 | 20.722 | 0.702 | 0.010 | node-14/thread-2/replica.pull-at | client.encode 4.394ms; driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.022ms |
| 7f5c171c0c2d73c70000000000000326 | 28.311 | 20.714 | 1.909 | 2.026 | 0.000 | 2.953 | 0.690 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.008 | 24.649 | 0.871 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.071ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.042ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.018ms |
| 7f5c171c0c2d73c700000000000007a7 | 23.286 | 18.268 | 0.504 | 1.517 | 0.000 | 2.298 | 0.673 | 0.002 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.010 | 20.290 | 0.871 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.018ms |
| 7f5c171c0c2d73c700000000000002de | 23.091 | 16.842 | 6.239 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 23.081 | 1.000 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.126ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.019ms |
| 7f5c171c0c2d73c70000000000000adc | 23.037 | 15.565 | 0.367 | 2.123 | 0.000 | 1.552 | 3.398 | 0.001 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.015 | 18.055 | 0.784 | 0.015 | node-14/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.134ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.060ms |
| 7f5c171c0c2d73c70000000000000a79 | 22.318 | 7.089 | 14.511 | 0.704 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 22.304 | 0.999 | 0.013 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.021ms |
| 7f5c171c0c2d73c700000000000002aa | 21.668 | 14.393 | 7.266 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 21.659 | 1.000 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.163ms; driver.publication.readback 0.069ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.014ms |
| 7f5c171c0c2d73c700000000000000f8 | 21.007 | 12.698 | 3.881 | 0.213 | 0.000 | 2.680 | 1.473 | 0.017 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.012 | 16.792 | 0.799 | 0.012 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.139ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.038ms; driver.publication.persist-deferred 0.019ms |
| 7f5c171c0c2d73c70000000000000102 | 20.589 | 11.751 | 4.709 | 0.216 | 0.000 | 1.303 | 2.531 | 0.031 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.013 | 16.675 | 0.810 | 0.013 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.078ms; driver.publication.persist-deferred 0.026ms |
| 7f5c171c0c2d73c700000000000002a5 | 19.653 | 16.010 | 0.415 | 0.876 | 0.000 | 1.401 | 0.931 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.009 | 17.301 | 0.880 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.206ms; driver.publication.readback 0.163ms; driver.publication.readback 0.056ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.021ms |
| 7f5c171c0c2d73c700000000000000fa | 19.602 | 15.163 | 4.429 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 19.592 | 1.000 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.038ms; driver.reader-basis.broadcast 0.034ms; driver.publication.persist-deferred 0.022ms |
| 7f5c171c0c2d73c700000000000002a6 | 19.273 | 19.167 | 0.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 19.267 | 1.000 | 0.006 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.206ms; driver.publication.readback 0.163ms; driver.publication.readback 0.056ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.021ms |
| 7f5c171c0c2d73c700000000000002cb | 18.557 | 5.481 | 13.064 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 18.545 | 0.999 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.183ms; driver.publication.persist-deferred 0.018ms |

## P2 / idle-25 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.654 | 0.552 | 0.000 | 0.471 | 1.942 | n/a | 0.000 | 0.040 | 0.595 | 1.156 | 0.016 | 0.000 | 0.271 | 4.157 | 0.491 | n/a | 0.019 | 1.988 | 0.216 | 0.019 |
| p99 | 20.211 | 1.654 | 0.021 | 0.950 | 3.645 | n/a | 0.000 | 1.498 | 4.224 | 5.860 | 0.068 | 0.000 | 3.582 | 10.651 | 1.355 | n/a | 0.044 | 3.870 | 0.410 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000003d7 | 29.850 | 1.656 | n/a | 0.000 | 0.032 | 6.004 | 17.778 | 0.015 | 0.000 | 0.063 | 3.781 | 0.505 | n/a | 0.016 | 1.688 | 0.057 | 0.016 | gw-w/thread-68/gateway.response-write | driver.reader-basis.broadcast 0.050ms |
| 7f5c171c0c2d73c7000000000000047c | 20.211 | 2.851 | n/a | 0.000 | 0.047 | 4.224 | 1.779 | 0.035 | 0.000 | 0.109 | 10.667 | 0.474 | n/a | 0.025 | 2.898 | 0.143 | 0.025 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004a6 | 19.340 | 3.645 | n/a | 0.000 | 0.093 | 0.787 | 1.316 | 0.017 | 0.000 | 1.430 | 10.651 | 1.355 | n/a | 0.044 | 3.738 | 0.193 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000414 | 16.316 | 2.250 | n/a | 0.000 | 0.039 | 0.741 | 1.632 | 0.028 | 0.000 | 0.167 | 10.509 | 0.930 | n/a | 0.020 | 2.289 | 0.140 | 0.020 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000457 | 15.211 | 2.278 | n/a | 0.000 | 0.048 | 0.621 | 1.129 | 0.016 | 0.000 | 0.071 | 10.111 | 0.917 | n/a | 0.021 | 2.325 | 0.153 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004df | 15.125 | 1.801 | n/a | 0.000 | 0.023 | 0.577 | 1.618 | 0.047 | 0.000 | 0.129 | 10.435 | 0.482 | n/a | 0.013 | 1.824 | 0.121 | 0.013 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004b8 | 14.907 | 2.325 | n/a | 0.000 | 0.190 | 0.668 | 1.141 | 0.015 | 0.000 | 0.342 | 9.681 | 0.506 | n/a | 0.040 | 2.516 | 0.169 | 0.040 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000003e7 | 14.719 | 2.543 | n/a | 0.000 | 0.032 | 0.822 | 1.776 | 0.033 | 0.000 | 0.148 | 8.847 | 0.501 | n/a | 0.018 | 2.575 | 0.175 | 0.018 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004c5 | 14.434 | 1.696 | n/a | 0.000 | 0.032 | 0.431 | 4.397 | 0.016 | 0.000 | 0.226 | 7.104 | 0.510 | n/a | 0.021 | 1.728 | 0.120 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000046d | 14.252 | 3.012 | n/a | 0.000 | 0.065 | 0.703 | 1.511 | 0.026 | 0.000 | 1.323 | 7.181 | 0.397 | n/a | 0.034 | 3.077 | 0.216 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004c2 | 14.224 | 3.544 | n/a | 0.000 | 0.066 | 0.707 | 0.884 | 0.015 | 0.000 | 3.582 | 4.438 | 0.955 | n/a | 0.033 | 3.610 | 0.254 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000040c | 14.151 | 1.942 | n/a | 0.000 | 0.067 | 0.777 | 3.274 | 0.032 | 0.000 | 0.189 | 7.377 | 0.463 | n/a | 0.029 | 2.009 | 0.142 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000003d3 | 14.048 | 1.839 | n/a | 0.000 | 0.041 | 0.575 | 4.445 | 0.015 | 0.000 | 0.089 | 6.578 | 0.448 | n/a | 0.018 | 1.880 | 0.134 | 0.018 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000003e1 | 13.885 | 3.118 | n/a | 0.000 | 0.067 | 0.821 | 1.766 | 0.027 | 0.000 | 0.187 | 7.350 | 0.521 | n/a | 0.028 | 3.185 | 0.229 | 0.028 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004b2 | 13.536 | 3.201 | n/a | 0.000 | 0.033 | 0.683 | 1.161 | 0.015 | 0.000 | 0.295 | 7.656 | 0.473 | n/a | 0.019 | 3.234 | 0.239 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000003f9 | 13.228 | 3.301 | n/a | 0.000 | 2.374 | 0.689 | 1.903 | 0.030 | 0.000 | 0.098 | 4.320 | 0.487 | n/a | 0.026 | 5.675 | 0.429 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000048c | 13.209 | 1.708 | n/a | 0.000 | 0.022 | 0.629 | 1.553 | 0.026 | 0.000 | 1.686 | 7.135 | 0.437 | n/a | 0.013 | 1.731 | 0.131 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000467 | 12.932 | 2.025 | n/a | 0.000 | 0.063 | 0.573 | 5.296 | 0.034 | 0.000 | 0.136 | 4.304 | 0.472 | n/a | 0.028 | 2.088 | 0.161 | 0.028 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 7f5c171c0c2d73c700000000000004ba | 12.847 | 2.458 | n/a | 0.000 | 0.054 | 0.728 | 1.790 | 0.029 | 0.000 | 0.680 | 6.629 | 0.453 | n/a | 0.027 | 2.512 | 0.196 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004a8 | 12.761 | 3.303 | n/a | 0.000 | 0.074 | 0.950 | 1.042 | 0.015 | 0.000 | 0.123 | 6.735 | 0.489 | n/a | 0.029 | 3.376 | 0.265 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-25 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.654 | 0.552 | 0.000 | 0.471 | 1.942 | n/a | 0.000 | 0.040 | 0.595 | 1.156 | 0.016 | 0.000 | 0.271 | 4.157 | 0.491 | n/a | 0.019 | 1.988 | 0.216 | 0.019 |
| p99 | 20.211 | 1.654 | 0.021 | 0.950 | 3.645 | n/a | 0.000 | 1.498 | 4.224 | 5.860 | 0.068 | 0.000 | 3.582 | 10.651 | 1.355 | n/a | 0.044 | 3.870 | 0.410 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000003d7 | 29.850 | 1.656 | n/a | 0.000 | 0.032 | 6.004 | 17.778 | 0.015 | 0.000 | 0.063 | 3.781 | 0.505 | n/a | 0.016 | 1.688 | 0.057 | 0.016 | gw-w/thread-68/gateway.response-write | driver.reader-basis.broadcast 0.050ms |
| 7f5c171c0c2d73c7000000000000047c | 20.211 | 2.851 | n/a | 0.000 | 0.047 | 4.224 | 1.779 | 0.035 | 0.000 | 0.109 | 10.667 | 0.474 | n/a | 0.025 | 2.898 | 0.143 | 0.025 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004a6 | 19.340 | 3.645 | n/a | 0.000 | 0.093 | 0.787 | 1.316 | 0.017 | 0.000 | 1.430 | 10.651 | 1.355 | n/a | 0.044 | 3.738 | 0.193 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000414 | 16.316 | 2.250 | n/a | 0.000 | 0.039 | 0.741 | 1.632 | 0.028 | 0.000 | 0.167 | 10.509 | 0.930 | n/a | 0.020 | 2.289 | 0.140 | 0.020 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000457 | 15.211 | 2.278 | n/a | 0.000 | 0.048 | 0.621 | 1.129 | 0.016 | 0.000 | 0.071 | 10.111 | 0.917 | n/a | 0.021 | 2.325 | 0.153 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004df | 15.125 | 1.801 | n/a | 0.000 | 0.023 | 0.577 | 1.618 | 0.047 | 0.000 | 0.129 | 10.435 | 0.482 | n/a | 0.013 | 1.824 | 0.121 | 0.013 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004b8 | 14.907 | 2.325 | n/a | 0.000 | 0.190 | 0.668 | 1.141 | 0.015 | 0.000 | 0.342 | 9.681 | 0.506 | n/a | 0.040 | 2.516 | 0.169 | 0.040 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000003e7 | 14.719 | 2.543 | n/a | 0.000 | 0.032 | 0.822 | 1.776 | 0.033 | 0.000 | 0.148 | 8.847 | 0.501 | n/a | 0.018 | 2.575 | 0.175 | 0.018 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004c5 | 14.434 | 1.696 | n/a | 0.000 | 0.032 | 0.431 | 4.397 | 0.016 | 0.000 | 0.226 | 7.104 | 0.510 | n/a | 0.021 | 1.728 | 0.120 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000046d | 14.252 | 3.012 | n/a | 0.000 | 0.065 | 0.703 | 1.511 | 0.026 | 0.000 | 1.323 | 7.181 | 0.397 | n/a | 0.034 | 3.077 | 0.216 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004c2 | 14.224 | 3.544 | n/a | 0.000 | 0.066 | 0.707 | 0.884 | 0.015 | 0.000 | 3.582 | 4.438 | 0.955 | n/a | 0.033 | 3.610 | 0.254 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000040c | 14.151 | 1.942 | n/a | 0.000 | 0.067 | 0.777 | 3.274 | 0.032 | 0.000 | 0.189 | 7.377 | 0.463 | n/a | 0.029 | 2.009 | 0.142 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000003d3 | 14.048 | 1.839 | n/a | 0.000 | 0.041 | 0.575 | 4.445 | 0.015 | 0.000 | 0.089 | 6.578 | 0.448 | n/a | 0.018 | 1.880 | 0.134 | 0.018 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000003e1 | 13.885 | 3.118 | n/a | 0.000 | 0.067 | 0.821 | 1.766 | 0.027 | 0.000 | 0.187 | 7.350 | 0.521 | n/a | 0.028 | 3.185 | 0.229 | 0.028 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004b2 | 13.536 | 3.201 | n/a | 0.000 | 0.033 | 0.683 | 1.161 | 0.015 | 0.000 | 0.295 | 7.656 | 0.473 | n/a | 0.019 | 3.234 | 0.239 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000003f9 | 13.228 | 3.301 | n/a | 0.000 | 2.374 | 0.689 | 1.903 | 0.030 | 0.000 | 0.098 | 4.320 | 0.487 | n/a | 0.026 | 5.675 | 0.429 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000048c | 13.209 | 1.708 | n/a | 0.000 | 0.022 | 0.629 | 1.553 | 0.026 | 0.000 | 1.686 | 7.135 | 0.437 | n/a | 0.013 | 1.731 | 0.131 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000467 | 12.932 | 2.025 | n/a | 0.000 | 0.063 | 0.573 | 5.296 | 0.034 | 0.000 | 0.136 | 4.304 | 0.472 | n/a | 0.028 | 2.088 | 0.161 | 0.028 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 7f5c171c0c2d73c700000000000004ba | 12.847 | 2.458 | n/a | 0.000 | 0.054 | 0.728 | 1.790 | 0.029 | 0.000 | 0.680 | 6.629 | 0.453 | n/a | 0.027 | 2.512 | 0.196 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000004a8 | 12.761 | 3.303 | n/a | 0.000 | 0.074 | 0.950 | 1.042 | 0.015 | 0.000 | 0.123 | 6.735 | 0.489 | n/a | 0.029 | 3.376 | 0.265 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.284 | 0.000 | 0.000 | 0.477 | 1.922 | n/a | 0.000 | 0.045 | 0.603 | 1.075 | 0.014 | 0.000 | 0.136 | 3.948 | 0.467 | n/a | 0.021 | 1.983 | 0.236 | 0.021 |
| p99 | 24.836 | 1.587 | 0.005 | 0.971 | 3.455 | n/a | 0.000 | 1.868 | 3.971 | 5.246 | 0.054 | 0.000 | 0.746 | 13.002 | 1.823 | n/a | 0.040 | 4.082 | 0.402 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000005af | 31.631 | 1.917 | n/a | 0.000 | 0.043 | 0.507 | 1.075 | 0.012 | 0.000 | 0.075 | 27.076 | 0.905 | n/a | 0.021 | 1.960 | 0.062 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.077ms |
| 7f5c171c0c2d73c700000000000005b9 | 24.836 | 2.783 | n/a | 0.000 | 0.078 | 0.774 | 4.244 | 0.012 | 11.947 | 0.071 | 4.476 | 0.418 | n/a | 0.033 | 2.861 | 0.115 | 0.033 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 7f5c171c0c2d73c700000000000005ec | 19.179 | 2.011 | n/a | 0.000 | 0.068 | 0.581 | 4.610 | 0.024 | 0.000 | 3.955 | 7.441 | 0.459 | n/a | 0.030 | 2.079 | 0.108 | 0.030 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000546 | 18.279 | 1.847 | n/a | 0.000 | 0.071 | 0.673 | 1.533 | 0.024 | 0.000 | 0.192 | 13.002 | 0.918 | n/a | 0.018 | 1.918 | 0.105 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000505 | 18.036 | 1.905 | n/a | 0.000 | 0.038 | 3.971 | 1.639 | 0.030 | 0.000 | 0.168 | 7.860 | 2.407 | n/a | 0.018 | 1.943 | 0.108 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005c3 | 17.344 | 2.343 | n/a | 0.000 | 0.048 | 0.829 | 5.326 | 0.025 | 0.000 | 0.111 | 6.815 | 1.823 | n/a | 0.024 | 2.391 | 0.138 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005b1 | 17.101 | 1.922 | n/a | 0.000 | 0.052 | 1.725 | 1.686 | 0.020 | 0.000 | 0.721 | 10.288 | 0.666 | n/a | 0.021 | 1.974 | 0.115 | 0.021 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005d8 | 15.764 | 1.754 | n/a | 0.000 | 0.043 | 4.040 | 3.219 | 0.011 | 0.000 | 0.067 | 6.141 | 0.467 | n/a | 0.021 | 1.798 | 0.114 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000519 | 15.291 | 2.922 | n/a | 0.000 | 0.075 | 0.764 | 5.246 | 0.041 | 0.000 | 0.121 | 5.182 | 0.907 | n/a | 0.033 | 2.997 | 0.196 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000598 | 14.995 | 1.879 | n/a | 0.000 | 0.042 | 0.790 | 4.888 | 0.019 | 0.000 | 0.218 | 6.652 | 0.485 | n/a | 0.022 | 1.920 | 0.128 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000055f | 14.579 | 2.187 | n/a | 0.000 | 1.895 | 0.477 | 0.835 | 0.013 | 0.000 | 0.120 | 8.099 | 0.936 | n/a | 0.018 | 4.082 | 0.280 | 0.018 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005f8 | 13.819 | 2.840 | n/a | 0.000 | 0.083 | 0.619 | 0.880 | 0.012 | 0.000 | 0.374 | 8.084 | 0.893 | n/a | 0.034 | 2.923 | 0.212 | 0.034 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005b3 | 13.599 | 1.842 | n/a | 0.000 | 0.057 | 0.465 | 0.872 | 0.010 | 0.000 | 0.388 | 8.823 | 1.118 | n/a | 0.025 | 1.899 | 0.140 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000559 | 12.829 | 2.933 | n/a | 0.000 | 0.088 | 0.780 | 1.648 | 0.034 | 0.000 | 0.120 | 6.717 | 0.474 | n/a | 0.035 | 3.022 | 0.236 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005d6 | 12.548 | 2.190 | n/a | 0.000 | 0.032 | 0.703 | 1.649 | 0.018 | 0.000 | 0.096 | 7.383 | 0.461 | n/a | 0.016 | 2.222 | 0.177 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000513 | 12.363 | 3.004 | n/a | 0.000 | 0.098 | 0.675 | 0.946 | 0.015 | 0.000 | 0.058 | 7.056 | 0.470 | n/a | 0.040 | 3.102 | 0.251 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000059e | 12.331 | 2.619 | n/a | 0.000 | 0.056 | 0.669 | 1.335 | 0.012 | 0.000 | 0.583 | 5.792 | 1.239 | n/a | 0.025 | 2.675 | 0.217 | 0.025 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000563 | 12.287 | 3.304 | n/a | 0.000 | 0.078 | 0.717 | 2.614 | 1.640 | 0.000 | 0.100 | 3.311 | 0.491 | n/a | 0.033 | 3.382 | 0.275 | 0.033 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000507 | 12.248 | 3.352 | n/a | 0.000 | 0.072 | 0.687 | 1.727 | 0.030 | 0.000 | 0.115 | 5.738 | 0.499 | n/a | 0.029 | 3.423 | 0.280 | 0.029 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000051d | 12.084 | 1.725 | n/a | 0.000 | 0.043 | 1.508 | 1.506 | 0.042 | 0.000 | 0.482 | 5.251 | 1.506 | n/a | 0.021 | 1.768 | 0.146 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.284 | 0.000 | 0.000 | 0.477 | 1.922 | n/a | 0.000 | 0.045 | 0.603 | 1.075 | 0.014 | 0.000 | 0.136 | 3.948 | 0.467 | n/a | 0.021 | 1.983 | 0.236 | 0.021 |
| p99 | 24.836 | 1.587 | 0.005 | 0.971 | 3.455 | n/a | 0.000 | 1.868 | 3.971 | 5.246 | 0.054 | 0.000 | 0.746 | 13.002 | 1.823 | n/a | 0.040 | 4.082 | 0.402 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000005af | 31.631 | 1.917 | n/a | 0.000 | 0.043 | 0.507 | 1.075 | 0.012 | 0.000 | 0.075 | 27.076 | 0.905 | n/a | 0.021 | 1.960 | 0.062 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.077ms |
| 7f5c171c0c2d73c700000000000005b9 | 24.836 | 2.783 | n/a | 0.000 | 0.078 | 0.774 | 4.244 | 0.012 | 11.947 | 0.071 | 4.476 | 0.418 | n/a | 0.033 | 2.861 | 0.115 | 0.033 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 7f5c171c0c2d73c700000000000005ec | 19.179 | 2.011 | n/a | 0.000 | 0.068 | 0.581 | 4.610 | 0.024 | 0.000 | 3.955 | 7.441 | 0.459 | n/a | 0.030 | 2.079 | 0.108 | 0.030 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000546 | 18.279 | 1.847 | n/a | 0.000 | 0.071 | 0.673 | 1.533 | 0.024 | 0.000 | 0.192 | 13.002 | 0.918 | n/a | 0.018 | 1.918 | 0.105 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000505 | 18.036 | 1.905 | n/a | 0.000 | 0.038 | 3.971 | 1.639 | 0.030 | 0.000 | 0.168 | 7.860 | 2.407 | n/a | 0.018 | 1.943 | 0.108 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005c3 | 17.344 | 2.343 | n/a | 0.000 | 0.048 | 0.829 | 5.326 | 0.025 | 0.000 | 0.111 | 6.815 | 1.823 | n/a | 0.024 | 2.391 | 0.138 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005b1 | 17.101 | 1.922 | n/a | 0.000 | 0.052 | 1.725 | 1.686 | 0.020 | 0.000 | 0.721 | 10.288 | 0.666 | n/a | 0.021 | 1.974 | 0.115 | 0.021 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005d8 | 15.764 | 1.754 | n/a | 0.000 | 0.043 | 4.040 | 3.219 | 0.011 | 0.000 | 0.067 | 6.141 | 0.467 | n/a | 0.021 | 1.798 | 0.114 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000519 | 15.291 | 2.922 | n/a | 0.000 | 0.075 | 0.764 | 5.246 | 0.041 | 0.000 | 0.121 | 5.182 | 0.907 | n/a | 0.033 | 2.997 | 0.196 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000598 | 14.995 | 1.879 | n/a | 0.000 | 0.042 | 0.790 | 4.888 | 0.019 | 0.000 | 0.218 | 6.652 | 0.485 | n/a | 0.022 | 1.920 | 0.128 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000055f | 14.579 | 2.187 | n/a | 0.000 | 1.895 | 0.477 | 0.835 | 0.013 | 0.000 | 0.120 | 8.099 | 0.936 | n/a | 0.018 | 4.082 | 0.280 | 0.018 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005f8 | 13.819 | 2.840 | n/a | 0.000 | 0.083 | 0.619 | 0.880 | 0.012 | 0.000 | 0.374 | 8.084 | 0.893 | n/a | 0.034 | 2.923 | 0.212 | 0.034 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005b3 | 13.599 | 1.842 | n/a | 0.000 | 0.057 | 0.465 | 0.872 | 0.010 | 0.000 | 0.388 | 8.823 | 1.118 | n/a | 0.025 | 1.899 | 0.140 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000559 | 12.829 | 2.933 | n/a | 0.000 | 0.088 | 0.780 | 1.648 | 0.034 | 0.000 | 0.120 | 6.717 | 0.474 | n/a | 0.035 | 3.022 | 0.236 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000005d6 | 12.548 | 2.190 | n/a | 0.000 | 0.032 | 0.703 | 1.649 | 0.018 | 0.000 | 0.096 | 7.383 | 0.461 | n/a | 0.016 | 2.222 | 0.177 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000513 | 12.363 | 3.004 | n/a | 0.000 | 0.098 | 0.675 | 0.946 | 0.015 | 0.000 | 0.058 | 7.056 | 0.470 | n/a | 0.040 | 3.102 | 0.251 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000059e | 12.331 | 2.619 | n/a | 0.000 | 0.056 | 0.669 | 1.335 | 0.012 | 0.000 | 0.583 | 5.792 | 1.239 | n/a | 0.025 | 2.675 | 0.217 | 0.025 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000563 | 12.287 | 3.304 | n/a | 0.000 | 0.078 | 0.717 | 2.614 | 1.640 | 0.000 | 0.100 | 3.311 | 0.491 | n/a | 0.033 | 3.382 | 0.275 | 0.033 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000507 | 12.248 | 3.352 | n/a | 0.000 | 0.072 | 0.687 | 1.727 | 0.030 | 0.000 | 0.115 | 5.738 | 0.499 | n/a | 0.029 | 3.423 | 0.280 | 0.029 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000051d | 12.084 | 1.725 | n/a | 0.000 | 0.043 | 1.508 | 1.506 | 0.042 | 0.000 | 0.482 | 5.251 | 1.506 | n/a | 0.021 | 1.768 | 0.146 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.383 | 0.000 | 0.000 | 0.516 | 2.240 | n/a | 0.000 | 0.049 | 0.639 | 1.020 | 0.012 | 0.000 | 0.134 | 4.609 | 0.486 | n/a | 0.023 | 2.352 | 0.228 | 0.023 |
| p99 | 18.208 | 2.003 | 0.000 | 1.230 | 4.339 | n/a | 0.000 | 2.239 | 3.887 | 5.476 | 0.034 | 0.000 | 3.564 | 12.445 | 1.647 | n/a | 0.051 | 6.250 | 0.439 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c70000000000000627 | 19.659 | 2.448 | n/a | 0.000 | 0.048 | 0.929 | 1.803 | 0.021 | 0.000 | 0.172 | 13.720 | 0.496 | n/a | 0.022 | 2.496 | 0.127 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006c8 | 18.208 | 2.653 | n/a | 0.000 | 0.053 | 0.811 | 1.626 | 0.020 | 0.000 | 0.111 | 12.445 | 0.460 | n/a | 0.029 | 2.706 | 0.149 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000666 | 17.791 | 1.966 | n/a | 0.000 | 0.040 | 0.670 | 1.835 | 0.013 | 0.000 | 0.359 | 11.901 | 0.986 | n/a | 0.020 | 2.005 | 0.113 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006c2 | 17.718 | 4.874 | n/a | 0.000 | 2.903 | 0.701 | 0.849 | 0.012 | 0.000 | 0.086 | 7.343 | 0.918 | n/a | 0.032 | 7.777 | 0.439 | 0.032 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000755 | 17.164 | 2.240 | n/a | 0.000 | 1.491 | 0.609 | 0.941 | 0.011 | 0.000 | 0.325 | 11.071 | 0.455 | n/a | 0.021 | 3.732 | 0.217 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006f2 | 16.290 | 1.854 | n/a | 0.000 | 0.052 | 0.558 | 1.034 | 0.012 | 0.000 | 3.721 | 8.569 | 0.467 | n/a | 0.023 | 1.906 | 0.117 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006db | 15.240 | 1.748 | n/a | 0.000 | 0.047 | 0.597 | 6.989 | 0.015 | 0.000 | 0.104 | 5.187 | 0.533 | n/a | 0.021 | 1.795 | 0.118 | 0.021 | gw-w/thread-51/storage/commit! | none observed |
| 7f5c171c0c2d73c70000000000000698 | 15.191 | 1.784 | n/a | 0.000 | 0.040 | 0.553 | 1.216 | 0.017 | 0.000 | 0.139 | 10.946 | 0.477 | n/a | 0.020 | 1.823 | 0.120 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000746 | 15.148 | 1.757 | n/a | 0.000 | 0.043 | 0.549 | 4.720 | 0.016 | 0.000 | 0.077 | 7.493 | 0.472 | n/a | 0.021 | 1.800 | 0.119 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000651 | 15.017 | 1.848 | n/a | 0.000 | 0.057 | 0.593 | 5.426 | 0.015 | 0.000 | 0.628 | 5.380 | 1.047 | n/a | 0.023 | 1.906 | 0.127 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000074b | 15.000 | 1.937 | n/a | 0.000 | 0.035 | 3.887 | 1.350 | 0.018 | 0.000 | 0.098 | 7.195 | 0.463 | n/a | 0.016 | 1.973 | 0.132 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000071e | 14.851 | 1.742 | n/a | 0.000 | 0.045 | 0.459 | 3.611 | 0.012 | 0.000 | 0.100 | 8.377 | 0.481 | n/a | 0.024 | 1.787 | 0.120 | 0.024 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006a3 | 14.689 | 2.095 | n/a | 0.000 | 0.025 | 4.280 | 0.904 | 0.011 | 0.000 | 0.070 | 6.815 | 0.475 | n/a | 0.014 | 2.120 | 0.144 | 0.014 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000676 | 14.613 | 1.776 | n/a | 0.000 | 0.042 | 0.560 | 0.940 | 0.012 | 0.000 | 0.092 | 10.251 | 0.915 | n/a | 0.025 | 1.818 | 0.124 | 0.025 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000074d | 14.409 | 2.968 | n/a | 0.000 | 0.050 | 0.626 | 1.055 | 0.010 | 0.000 | 0.317 | 8.573 | 0.786 | n/a | 0.022 | 3.018 | 0.209 | 0.022 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006d1 | 14.256 | 3.467 | n/a | 0.000 | 0.058 | 0.818 | 1.599 | 0.023 | 0.000 | 0.108 | 6.995 | 1.161 | n/a | 0.028 | 3.524 | 0.247 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000670 | 13.878 | 4.011 | n/a | 0.000 | 2.239 | 0.764 | 1.202 | 0.013 | 0.000 | 0.383 | 4.609 | 0.621 | n/a | 0.035 | 6.250 | 0.450 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000692 | 13.869 | 3.160 | n/a | 0.000 | 0.046 | 0.725 | 0.970 | 0.013 | 0.000 | 0.074 | 4.858 | 4.001 | n/a | 0.021 | 3.207 | 0.231 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000068b | 13.812 | 3.531 | n/a | 0.000 | 0.099 | 1.630 | 1.154 | 0.013 | 0.000 | 0.073 | 6.317 | 0.946 | n/a | 0.050 | 3.630 | 0.263 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006d3 | 13.677 | 4.134 | n/a | 0.000 | 0.086 | 0.981 | 1.043 | 0.012 | 0.000 | 0.065 | 6.833 | 0.482 | n/a | 0.040 | 4.220 | 0.309 | 0.040 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.383 | 0.000 | 0.000 | 0.516 | 2.240 | n/a | 0.000 | 0.049 | 0.639 | 1.020 | 0.012 | 0.000 | 0.134 | 4.609 | 0.486 | n/a | 0.023 | 2.352 | 0.228 | 0.023 |
| p99 | 18.208 | 2.003 | 0.000 | 1.230 | 4.339 | n/a | 0.000 | 2.239 | 3.887 | 5.476 | 0.034 | 0.000 | 3.564 | 12.445 | 1.647 | n/a | 0.051 | 6.250 | 0.439 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c70000000000000627 | 19.659 | 2.448 | n/a | 0.000 | 0.048 | 0.929 | 1.803 | 0.021 | 0.000 | 0.172 | 13.720 | 0.496 | n/a | 0.022 | 2.496 | 0.127 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006c8 | 18.208 | 2.653 | n/a | 0.000 | 0.053 | 0.811 | 1.626 | 0.020 | 0.000 | 0.111 | 12.445 | 0.460 | n/a | 0.029 | 2.706 | 0.149 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000666 | 17.791 | 1.966 | n/a | 0.000 | 0.040 | 0.670 | 1.835 | 0.013 | 0.000 | 0.359 | 11.901 | 0.986 | n/a | 0.020 | 2.005 | 0.113 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006c2 | 17.718 | 4.874 | n/a | 0.000 | 2.903 | 0.701 | 0.849 | 0.012 | 0.000 | 0.086 | 7.343 | 0.918 | n/a | 0.032 | 7.777 | 0.439 | 0.032 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000755 | 17.164 | 2.240 | n/a | 0.000 | 1.491 | 0.609 | 0.941 | 0.011 | 0.000 | 0.325 | 11.071 | 0.455 | n/a | 0.021 | 3.732 | 0.217 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006f2 | 16.290 | 1.854 | n/a | 0.000 | 0.052 | 0.558 | 1.034 | 0.012 | 0.000 | 3.721 | 8.569 | 0.467 | n/a | 0.023 | 1.906 | 0.117 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006db | 15.240 | 1.748 | n/a | 0.000 | 0.047 | 0.597 | 6.989 | 0.015 | 0.000 | 0.104 | 5.187 | 0.533 | n/a | 0.021 | 1.795 | 0.118 | 0.021 | gw-w/thread-51/storage/commit! | none observed |
| 7f5c171c0c2d73c70000000000000698 | 15.191 | 1.784 | n/a | 0.000 | 0.040 | 0.553 | 1.216 | 0.017 | 0.000 | 0.139 | 10.946 | 0.477 | n/a | 0.020 | 1.823 | 0.120 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000746 | 15.148 | 1.757 | n/a | 0.000 | 0.043 | 0.549 | 4.720 | 0.016 | 0.000 | 0.077 | 7.493 | 0.472 | n/a | 0.021 | 1.800 | 0.119 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000651 | 15.017 | 1.848 | n/a | 0.000 | 0.057 | 0.593 | 5.426 | 0.015 | 0.000 | 0.628 | 5.380 | 1.047 | n/a | 0.023 | 1.906 | 0.127 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000074b | 15.000 | 1.937 | n/a | 0.000 | 0.035 | 3.887 | 1.350 | 0.018 | 0.000 | 0.098 | 7.195 | 0.463 | n/a | 0.016 | 1.973 | 0.132 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000071e | 14.851 | 1.742 | n/a | 0.000 | 0.045 | 0.459 | 3.611 | 0.012 | 0.000 | 0.100 | 8.377 | 0.481 | n/a | 0.024 | 1.787 | 0.120 | 0.024 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006a3 | 14.689 | 2.095 | n/a | 0.000 | 0.025 | 4.280 | 0.904 | 0.011 | 0.000 | 0.070 | 6.815 | 0.475 | n/a | 0.014 | 2.120 | 0.144 | 0.014 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000676 | 14.613 | 1.776 | n/a | 0.000 | 0.042 | 0.560 | 0.940 | 0.012 | 0.000 | 0.092 | 10.251 | 0.915 | n/a | 0.025 | 1.818 | 0.124 | 0.025 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000074d | 14.409 | 2.968 | n/a | 0.000 | 0.050 | 0.626 | 1.055 | 0.010 | 0.000 | 0.317 | 8.573 | 0.786 | n/a | 0.022 | 3.018 | 0.209 | 0.022 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006d1 | 14.256 | 3.467 | n/a | 0.000 | 0.058 | 0.818 | 1.599 | 0.023 | 0.000 | 0.108 | 6.995 | 1.161 | n/a | 0.028 | 3.524 | 0.247 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000670 | 13.878 | 4.011 | n/a | 0.000 | 2.239 | 0.764 | 1.202 | 0.013 | 0.000 | 0.383 | 4.609 | 0.621 | n/a | 0.035 | 6.250 | 0.450 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000692 | 13.869 | 3.160 | n/a | 0.000 | 0.046 | 0.725 | 0.970 | 0.013 | 0.000 | 0.074 | 4.858 | 4.001 | n/a | 0.021 | 3.207 | 0.231 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000068b | 13.812 | 3.531 | n/a | 0.000 | 0.099 | 1.630 | 1.154 | 0.013 | 0.000 | 0.073 | 6.317 | 0.946 | n/a | 0.050 | 3.630 | 0.263 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000006d3 | 13.677 | 4.134 | n/a | 0.000 | 0.086 | 0.981 | 1.043 | 0.012 | 0.000 | 0.065 | 6.833 | 0.482 | n/a | 0.040 | 4.220 | 0.309 | 0.040 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.443 | 0.390 | 0.000 | 0.569 | 2.599 | n/a | 0.000 | 0.067 | 0.791 | 1.202 | 0.015 | 0.000 | 0.173 | 5.011 | 0.547 | n/a | 0.032 | 2.701 | 0.244 | 0.032 |
| p99 | 21.603 | 2.005 | 0.000 | 1.470 | 4.205 | n/a | 0.000 | 2.392 | 2.319 | 4.961 | 0.089 | 0.000 | 1.502 | 12.091 | 1.923 | n/a | 0.065 | 5.358 | 0.412 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000007fa | 48.833 | 4.205 | n/a | 0.000 | 0.066 | 1.143 | 1.574 | 0.018 | 0.000 | 0.199 | 40.875 | 0.714 | n/a | 0.039 | 4.271 | 0.087 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000081a | 21.603 | 3.382 | n/a | 0.000 | 0.100 | 0.816 | 1.381 | 0.016 | 0.000 | 0.089 | 10.886 | 4.891 | n/a | 0.042 | 3.481 | 0.161 | 0.042 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000076e | 18.965 | 3.588 | n/a | 0.000 | 0.123 | 1.025 | 1.897 | 0.032 | 0.000 | 0.188 | 10.812 | 1.246 | n/a | 0.054 | 3.711 | 0.196 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000813 | 18.716 | 3.923 | n/a | 0.000 | 0.098 | 0.939 | 1.060 | 0.013 | 0.000 | 0.069 | 12.091 | 0.481 | n/a | 0.043 | 4.021 | 0.215 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000799 | 17.693 | 2.599 | n/a | 0.000 | 0.074 | 1.521 | 5.508 | 0.030 | 0.000 | 0.213 | 6.731 | 0.983 | n/a | 0.033 | 2.674 | 0.151 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007f6 | 17.133 | 5.248 | n/a | 0.000 | 0.109 | 1.000 | 1.274 | 0.027 | 0.000 | 0.827 | 8.000 | 0.600 | n/a | 0.048 | 5.358 | 0.313 | 0.048 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007db | 16.809 | 3.339 | n/a | 0.000 | 0.094 | 0.685 | 1.150 | 0.010 | 0.000 | 0.060 | 10.970 | 0.459 | n/a | 0.042 | 3.434 | 0.204 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007f1 | 16.133 | 2.906 | n/a | 0.000 | 2.160 | 0.553 | 0.961 | 0.013 | 0.000 | 3.125 | 5.440 | 0.943 | n/a | 0.031 | 5.066 | 0.314 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007ed | 16.097 | 1.968 | n/a | 0.000 | 0.055 | 1.010 | 3.505 | 0.036 | 0.000 | 0.225 | 8.721 | 0.552 | n/a | 0.026 | 2.023 | 0.126 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000840 | 15.473 | 2.696 | n/a | 0.000 | 0.061 | 1.792 | 1.893 | 0.026 | 0.000 | 0.213 | 7.541 | 1.191 | n/a | 0.060 | 2.758 | 0.178 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000852 | 15.427 | 2.217 | n/a | 0.000 | 0.065 | 0.616 | 1.308 | 0.015 | 0.000 | 0.178 | 9.750 | 1.251 | n/a | 0.027 | 2.282 | 0.148 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000077b | 15.420 | 2.481 | n/a | 0.000 | 0.054 | 0.783 | 0.996 | 0.015 | 0.000 | 0.152 | 9.657 | 1.255 | n/a | 0.026 | 2.535 | 0.164 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000886 | 15.392 | 3.640 | n/a | 0.000 | 0.122 | 0.815 | 1.259 | 0.016 | 0.000 | 0.131 | 8.245 | 1.112 | n/a | 0.052 | 3.761 | 0.244 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.127ms |
| 7f5c171c0c2d73c70000000000000881 | 15.234 | 3.650 | n/a | 0.000 | 0.059 | 0.841 | 1.214 | 0.015 | 0.000 | 0.088 | 8.040 | 1.295 | n/a | 0.032 | 3.709 | 0.243 | 0.032 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.314ms |
| 7f5c171c0c2d73c70000000000000773 | 15.224 | 3.723 | n/a | 0.000 | 0.063 | 1.521 | 0.873 | 0.015 | 0.000 | 0.076 | 7.885 | 1.037 | n/a | 0.030 | 3.787 | 0.249 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007c7 | 15.223 | 3.239 | n/a | 0.000 | 2.392 | 1.108 | 2.022 | 0.013 | 0.000 | 0.095 | 5.401 | 0.929 | n/a | 0.023 | 5.631 | 0.370 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000864 | 15.110 | 3.693 | n/a | 0.000 | 0.133 | 1.140 | 1.864 | 0.025 | 0.000 | 0.614 | 7.034 | 0.555 | n/a | 0.052 | 3.826 | 0.253 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000080a | 14.857 | 2.791 | n/a | 0.000 | 0.066 | 0.640 | 1.040 | 0.012 | 0.000 | 0.902 | 8.316 | 1.058 | n/a | 0.032 | 2.856 | 0.192 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000782 | 14.489 | 3.403 | n/a | 0.000 | 0.130 | 0.780 | 2.030 | 0.020 | 0.000 | 0.188 | 7.394 | 0.488 | n/a | 0.056 | 3.533 | 0.244 | 0.056 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000008b4 | 14.413 | 2.889 | n/a | 0.000 | 0.091 | 1.095 | 1.537 | 0.019 | 0.000 | 0.198 | 7.878 | 0.665 | n/a | 0.041 | 2.979 | 0.207 | 0.041 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.443 | 0.390 | 0.000 | 0.569 | 2.599 | n/a | 0.000 | 0.067 | 0.791 | 1.202 | 0.015 | 0.000 | 0.173 | 5.011 | 0.547 | n/a | 0.032 | 2.701 | 0.244 | 0.032 |
| p99 | 21.603 | 2.005 | 0.000 | 1.470 | 4.205 | n/a | 0.000 | 2.392 | 2.319 | 4.961 | 0.089 | 0.000 | 1.502 | 12.091 | 1.923 | n/a | 0.065 | 5.358 | 0.412 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000007fa | 48.833 | 4.205 | n/a | 0.000 | 0.066 | 1.143 | 1.574 | 0.018 | 0.000 | 0.199 | 40.875 | 0.714 | n/a | 0.039 | 4.271 | 0.087 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000081a | 21.603 | 3.382 | n/a | 0.000 | 0.100 | 0.816 | 1.381 | 0.016 | 0.000 | 0.089 | 10.886 | 4.891 | n/a | 0.042 | 3.481 | 0.161 | 0.042 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000076e | 18.965 | 3.588 | n/a | 0.000 | 0.123 | 1.025 | 1.897 | 0.032 | 0.000 | 0.188 | 10.812 | 1.246 | n/a | 0.054 | 3.711 | 0.196 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000813 | 18.716 | 3.923 | n/a | 0.000 | 0.098 | 0.939 | 1.060 | 0.013 | 0.000 | 0.069 | 12.091 | 0.481 | n/a | 0.043 | 4.021 | 0.215 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000799 | 17.693 | 2.599 | n/a | 0.000 | 0.074 | 1.521 | 5.508 | 0.030 | 0.000 | 0.213 | 6.731 | 0.983 | n/a | 0.033 | 2.674 | 0.151 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007f6 | 17.133 | 5.248 | n/a | 0.000 | 0.109 | 1.000 | 1.274 | 0.027 | 0.000 | 0.827 | 8.000 | 0.600 | n/a | 0.048 | 5.358 | 0.313 | 0.048 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007db | 16.809 | 3.339 | n/a | 0.000 | 0.094 | 0.685 | 1.150 | 0.010 | 0.000 | 0.060 | 10.970 | 0.459 | n/a | 0.042 | 3.434 | 0.204 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007f1 | 16.133 | 2.906 | n/a | 0.000 | 2.160 | 0.553 | 0.961 | 0.013 | 0.000 | 3.125 | 5.440 | 0.943 | n/a | 0.031 | 5.066 | 0.314 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007ed | 16.097 | 1.968 | n/a | 0.000 | 0.055 | 1.010 | 3.505 | 0.036 | 0.000 | 0.225 | 8.721 | 0.552 | n/a | 0.026 | 2.023 | 0.126 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000840 | 15.473 | 2.696 | n/a | 0.000 | 0.061 | 1.792 | 1.893 | 0.026 | 0.000 | 0.213 | 7.541 | 1.191 | n/a | 0.060 | 2.758 | 0.178 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000852 | 15.427 | 2.217 | n/a | 0.000 | 0.065 | 0.616 | 1.308 | 0.015 | 0.000 | 0.178 | 9.750 | 1.251 | n/a | 0.027 | 2.282 | 0.148 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000077b | 15.420 | 2.481 | n/a | 0.000 | 0.054 | 0.783 | 0.996 | 0.015 | 0.000 | 0.152 | 9.657 | 1.255 | n/a | 0.026 | 2.535 | 0.164 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000886 | 15.392 | 3.640 | n/a | 0.000 | 0.122 | 0.815 | 1.259 | 0.016 | 0.000 | 0.131 | 8.245 | 1.112 | n/a | 0.052 | 3.761 | 0.244 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.127ms |
| 7f5c171c0c2d73c70000000000000881 | 15.234 | 3.650 | n/a | 0.000 | 0.059 | 0.841 | 1.214 | 0.015 | 0.000 | 0.088 | 8.040 | 1.295 | n/a | 0.032 | 3.709 | 0.243 | 0.032 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.314ms |
| 7f5c171c0c2d73c70000000000000773 | 15.224 | 3.723 | n/a | 0.000 | 0.063 | 1.521 | 0.873 | 0.015 | 0.000 | 0.076 | 7.885 | 1.037 | n/a | 0.030 | 3.787 | 0.249 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000007c7 | 15.223 | 3.239 | n/a | 0.000 | 2.392 | 1.108 | 2.022 | 0.013 | 0.000 | 0.095 | 5.401 | 0.929 | n/a | 0.023 | 5.631 | 0.370 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000864 | 15.110 | 3.693 | n/a | 0.000 | 0.133 | 1.140 | 1.864 | 0.025 | 0.000 | 0.614 | 7.034 | 0.555 | n/a | 0.052 | 3.826 | 0.253 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000080a | 14.857 | 2.791 | n/a | 0.000 | 0.066 | 0.640 | 1.040 | 0.012 | 0.000 | 0.902 | 8.316 | 1.058 | n/a | 0.032 | 2.856 | 0.192 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000782 | 14.489 | 3.403 | n/a | 0.000 | 0.130 | 0.780 | 2.030 | 0.020 | 0.000 | 0.188 | 7.394 | 0.488 | n/a | 0.056 | 3.533 | 0.244 | 0.056 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000008b4 | 14.413 | 2.889 | n/a | 0.000 | 0.091 | 1.095 | 1.537 | 0.019 | 0.000 | 0.198 | 7.878 | 0.665 | n/a | 0.041 | 2.979 | 0.207 | 0.041 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.245 | 0.187 | 0.000 | 0.547 | 2.507 | n/a | 0.000 | 0.073 | 0.817 | 1.368 | 0.016 | 0.000 | 0.163 | 5.738 | 0.557 | n/a | 0.030 | 2.638 | 0.231 | 0.030 |
| p99 | 32.729 | 2.087 | 0.000 | 1.989 | 5.723 | n/a | 1.864 | 3.137 | 2.675 | 6.050 | 0.078 | 0.000 | 3.323 | 11.225 | 1.466 | n/a | 0.104 | 6.438 | 0.416 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000008c8 | 43.471 | 3.293 | n/a | 0.000 | 0.095 | 0.879 | 8.033 | 0.067 | 22.651 | 0.561 | 7.326 | 0.523 | n/a | 0.044 | 3.388 | 0.078 | 0.044 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.119ms |
| 7f5c171c0c2d73c70000000000000a2d | 32.729 | 7.747 | n/a | 0.000 | 0.110 | 2.675 | 2.639 | 0.033 | 0.000 | 0.139 | 18.736 | 0.589 | n/a | 0.062 | 7.857 | 0.240 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000099b | 20.362 | 4.567 | n/a | 0.000 | 0.161 | 1.204 | 5.579 | 0.050 | 0.000 | 0.379 | 7.618 | 0.729 | n/a | 0.075 | 4.728 | 0.232 | 0.075 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000093c | 19.745 | 4.446 | n/a | 0.000 | 0.190 | 1.362 | 2.619 | 0.045 | 0.000 | 0.987 | 8.559 | 1.466 | n/a | 0.071 | 4.636 | 0.235 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000009f0 | 19.534 | 2.419 | n/a | 0.000 | 0.073 | 1.036 | 5.279 | 0.027 | 0.000 | 3.323 | 6.195 | 1.148 | n/a | 0.034 | 2.492 | 0.128 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000982 | 19.236 | 5.011 | n/a | 0.000 | 0.167 | 1.172 | 1.469 | 0.021 | 0.000 | 0.179 | 9.639 | 1.507 | n/a | 0.072 | 5.178 | 0.269 | 0.072 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000008fa | 17.142 | 2.544 | n/a | 0.000 | 0.923 | 0.749 | 1.048 | 0.012 | 0.000 | 0.141 | 11.225 | 0.482 | n/a | 0.017 | 3.468 | 0.202 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000009d2 | 17.057 | 3.876 | n/a | 0.000 | 0.091 | 0.945 | 4.567 | 0.030 | 0.000 | 2.613 | 4.428 | 0.469 | n/a | 0.038 | 3.967 | 0.233 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a1d | 17.037 | 3.850 | n/a | 0.000 | 0.093 | 2.177 | 2.912 | 0.078 | 0.000 | 0.296 | 6.888 | 0.691 | n/a | 0.052 | 3.943 | 0.231 | 0.052 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000950 | 16.515 | 4.412 | n/a | 0.000 | 0.145 | 1.585 | 1.772 | 0.021 | 0.000 | 0.478 | 6.748 | 1.291 | n/a | 0.064 | 4.557 | 0.276 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000008c3 | 16.111 | 4.052 | n/a | 0.000 | 0.175 | 1.623 | 1.416 | 0.021 | 0.000 | 0.191 | 7.095 | 1.436 | n/a | 0.104 | 4.226 | 0.262 | 0.104 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000008d2 | 16.090 | 2.575 | n/a | 0.000 | 2.896 | 1.004 | 2.115 | 0.030 | 0.000 | 0.682 | 6.242 | 0.523 | n/a | 0.024 | 5.470 | 0.340 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000009eb | 16.085 | 2.502 | n/a | 0.000 | 0.080 | 0.822 | 6.050 | 0.044 | 0.000 | 0.273 | 5.675 | 0.605 | n/a | 0.033 | 2.582 | 0.161 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000913 | 16.009 | 5.723 | n/a | 0.000 | 0.188 | 1.286 | 1.540 | 0.019 | 0.000 | 0.269 | 6.181 | 0.696 | n/a | 0.108 | 5.911 | 0.369 | 0.108 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000009a5 | 15.826 | 3.396 | n/a | 0.000 | 0.129 | 0.689 | 1.199 | 0.017 | 0.000 | 0.102 | 9.087 | 1.156 | n/a | 0.052 | 3.525 | 0.223 | 0.052 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a13 | 15.506 | 3.647 | n/a | 2.703 | 0.088 | 1.240 | 1.931 | 0.027 | 0.000 | 0.164 | 5.098 | 0.567 | n/a | 0.042 | 6.438 | 0.415 | 0.042 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000996 | 15.137 | 3.131 | n/a | 0.000 | 3.137 | 0.734 | 1.368 | 0.014 | 0.000 | 0.418 | 5.731 | 0.574 | n/a | 0.030 | 6.268 | 0.414 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000097a | 15.015 | 3.741 | n/a | 0.000 | 0.085 | 1.732 | 1.602 | 0.025 | 0.000 | 0.195 | 7.083 | 0.501 | n/a | 0.051 | 3.826 | 0.255 | 0.051 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a22 | 14.831 | 4.964 | n/a | 0.000 | 0.066 | 1.475 | 1.445 | 0.016 | 0.000 | 0.138 | 6.028 | 0.651 | n/a | 0.047 | 5.030 | 0.339 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000932 | 14.807 | 4.226 | n/a | 0.000 | 0.179 | 1.101 | 1.917 | 0.021 | 0.000 | 0.156 | 6.429 | 0.704 | n/a | 0.074 | 4.404 | 0.297 | 0.074 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.245 | 0.187 | 0.000 | 0.547 | 2.507 | n/a | 0.000 | 0.073 | 0.817 | 1.368 | 0.016 | 0.000 | 0.163 | 5.738 | 0.557 | n/a | 0.030 | 2.638 | 0.231 | 0.030 |
| p99 | 32.729 | 2.087 | 0.000 | 1.989 | 5.723 | n/a | 1.864 | 3.137 | 2.675 | 6.050 | 0.078 | 0.000 | 3.323 | 11.225 | 1.466 | n/a | 0.104 | 6.438 | 0.416 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c700000000000008c8 | 43.471 | 3.293 | n/a | 0.000 | 0.095 | 0.879 | 8.033 | 0.067 | 22.651 | 0.561 | 7.326 | 0.523 | n/a | 0.044 | 3.388 | 0.078 | 0.044 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.119ms |
| 7f5c171c0c2d73c70000000000000a2d | 32.729 | 7.747 | n/a | 0.000 | 0.110 | 2.675 | 2.639 | 0.033 | 0.000 | 0.139 | 18.736 | 0.589 | n/a | 0.062 | 7.857 | 0.240 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000099b | 20.362 | 4.567 | n/a | 0.000 | 0.161 | 1.204 | 5.579 | 0.050 | 0.000 | 0.379 | 7.618 | 0.729 | n/a | 0.075 | 4.728 | 0.232 | 0.075 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000093c | 19.745 | 4.446 | n/a | 0.000 | 0.190 | 1.362 | 2.619 | 0.045 | 0.000 | 0.987 | 8.559 | 1.466 | n/a | 0.071 | 4.636 | 0.235 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000009f0 | 19.534 | 2.419 | n/a | 0.000 | 0.073 | 1.036 | 5.279 | 0.027 | 0.000 | 3.323 | 6.195 | 1.148 | n/a | 0.034 | 2.492 | 0.128 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000982 | 19.236 | 5.011 | n/a | 0.000 | 0.167 | 1.172 | 1.469 | 0.021 | 0.000 | 0.179 | 9.639 | 1.507 | n/a | 0.072 | 5.178 | 0.269 | 0.072 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000008fa | 17.142 | 2.544 | n/a | 0.000 | 0.923 | 0.749 | 1.048 | 0.012 | 0.000 | 0.141 | 11.225 | 0.482 | n/a | 0.017 | 3.468 | 0.202 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000009d2 | 17.057 | 3.876 | n/a | 0.000 | 0.091 | 0.945 | 4.567 | 0.030 | 0.000 | 2.613 | 4.428 | 0.469 | n/a | 0.038 | 3.967 | 0.233 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a1d | 17.037 | 3.850 | n/a | 0.000 | 0.093 | 2.177 | 2.912 | 0.078 | 0.000 | 0.296 | 6.888 | 0.691 | n/a | 0.052 | 3.943 | 0.231 | 0.052 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000950 | 16.515 | 4.412 | n/a | 0.000 | 0.145 | 1.585 | 1.772 | 0.021 | 0.000 | 0.478 | 6.748 | 1.291 | n/a | 0.064 | 4.557 | 0.276 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000008c3 | 16.111 | 4.052 | n/a | 0.000 | 0.175 | 1.623 | 1.416 | 0.021 | 0.000 | 0.191 | 7.095 | 1.436 | n/a | 0.104 | 4.226 | 0.262 | 0.104 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000008d2 | 16.090 | 2.575 | n/a | 0.000 | 2.896 | 1.004 | 2.115 | 0.030 | 0.000 | 0.682 | 6.242 | 0.523 | n/a | 0.024 | 5.470 | 0.340 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000009eb | 16.085 | 2.502 | n/a | 0.000 | 0.080 | 0.822 | 6.050 | 0.044 | 0.000 | 0.273 | 5.675 | 0.605 | n/a | 0.033 | 2.582 | 0.161 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000913 | 16.009 | 5.723 | n/a | 0.000 | 0.188 | 1.286 | 1.540 | 0.019 | 0.000 | 0.269 | 6.181 | 0.696 | n/a | 0.108 | 5.911 | 0.369 | 0.108 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c700000000000009a5 | 15.826 | 3.396 | n/a | 0.000 | 0.129 | 0.689 | 1.199 | 0.017 | 0.000 | 0.102 | 9.087 | 1.156 | n/a | 0.052 | 3.525 | 0.223 | 0.052 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a13 | 15.506 | 3.647 | n/a | 2.703 | 0.088 | 1.240 | 1.931 | 0.027 | 0.000 | 0.164 | 5.098 | 0.567 | n/a | 0.042 | 6.438 | 0.415 | 0.042 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000996 | 15.137 | 3.131 | n/a | 0.000 | 3.137 | 0.734 | 1.368 | 0.014 | 0.000 | 0.418 | 5.731 | 0.574 | n/a | 0.030 | 6.268 | 0.414 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c7000000000000097a | 15.015 | 3.741 | n/a | 0.000 | 0.085 | 1.732 | 1.602 | 0.025 | 0.000 | 0.195 | 7.083 | 0.501 | n/a | 0.051 | 3.826 | 0.255 | 0.051 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a22 | 14.831 | 4.964 | n/a | 0.000 | 0.066 | 1.475 | 1.445 | 0.016 | 0.000 | 0.138 | 6.028 | 0.651 | n/a | 0.047 | 5.030 | 0.339 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000932 | 14.807 | 4.226 | n/a | 0.000 | 0.179 | 1.101 | 1.917 | 0.021 | 0.000 | 0.156 | 6.429 | 0.704 | n/a | 0.074 | 4.404 | 0.297 | 0.074 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.488 | 0.718 | 0.000 | 0.611 | 2.862 | n/a | 0.000 | 0.080 | 0.892 | 1.506 | 0.019 | 0.000 | 0.188 | 5.999 | 0.617 | n/a | 0.038 | 3.138 | 0.249 | 0.038 |
| p99 | 21.294 | 3.004 | 0.000 | 2.528 | 5.570 | n/a | 2.145 | 3.308 | 2.440 | 6.402 | 0.065 | 0.000 | 0.974 | 11.240 | 1.887 | n/a | 0.104 | 7.354 | 0.444 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c70000000000000a9f | 47.949 | 2.691 | n/a | 0.000 | 0.095 | 0.808 | 2.303 | 0.037 | 0.000 | 0.974 | 5.626 | 35.374 | n/a | 0.041 | 2.786 | 0.058 | 0.041 | tx/thread-82/transactor.triplex-function | driver.reader-basis.broadcast 0.134ms |
| 7f5c171c0c2d73c70000000000000ba8 | 21.294 | 4.913 | n/a | 0.000 | 0.482 | 0.918 | 1.500 | 0.024 | 0.000 | 0.224 | 11.240 | 1.803 | n/a | 0.190 | 5.395 | 0.253 | 0.190 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a63 | 20.740 | 5.000 | n/a | 0.000 | 0.167 | 1.792 | 2.541 | 0.038 | 0.000 | 0.953 | 9.475 | 0.681 | n/a | 0.093 | 5.167 | 0.249 | 0.093 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b24 | 20.396 | 2.463 | n/a | 0.000 | 0.074 | 1.229 | 6.402 | 0.060 | 0.000 | 0.312 | 9.269 | 0.548 | n/a | 0.039 | 2.537 | 0.124 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a39 | 19.473 | 4.318 | n/a | 0.000 | 3.449 | 1.177 | 1.575 | 0.021 | 0.000 | 0.244 | 7.521 | 1.103 | n/a | 0.065 | 7.767 | 0.399 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a6c | 19.197 | 3.854 | n/a | 0.000 | 0.080 | 1.372 | 1.652 | 0.021 | 0.000 | 0.516 | 11.173 | 0.491 | n/a | 0.039 | 3.934 | 0.205 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b0f | 19.026 | 4.368 | n/a | 0.000 | 0.155 | 1.331 | 2.949 | 0.035 | 0.000 | 0.907 | 7.885 | 1.320 | n/a | 0.074 | 4.524 | 0.238 | 0.074 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a75 | 18.872 | 6.026 | n/a | 0.000 | 0.189 | 1.152 | 1.936 | 0.031 | 0.000 | 0.386 | 8.354 | 0.695 | n/a | 0.104 | 6.215 | 0.329 | 0.104 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a8a | 18.518 | 3.992 | n/a | 0.000 | 0.065 | 0.889 | 1.451 | 0.018 | 0.000 | 0.216 | 11.184 | 0.670 | n/a | 0.033 | 4.057 | 0.219 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b48 | 17.579 | 2.585 | n/a | 0.000 | 0.078 | 0.842 | 1.782 | 0.021 | 0.000 | 0.215 | 11.476 | 0.536 | n/a | 0.043 | 2.664 | 0.152 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b84 | 17.256 | 5.536 | n/a | 0.000 | 0.175 | 1.243 | 1.706 | 0.022 | 0.000 | 0.200 | 7.197 | 1.088 | n/a | 0.090 | 5.711 | 0.331 | 0.090 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b42 | 16.861 | 5.570 | n/a | 0.000 | 0.171 | 1.166 | 2.772 | 0.045 | 0.000 | 1.054 | 5.356 | 0.657 | n/a | 0.069 | 5.741 | 0.340 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b1e | 16.813 | 2.580 | n/a | 0.000 | 0.094 | 0.981 | 1.759 | 0.022 | 0.000 | 0.568 | 9.680 | 1.079 | n/a | 0.048 | 2.674 | 0.159 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a69 | 16.597 | 4.272 | n/a | 0.000 | 2.690 | 1.074 | 1.281 | 0.018 | 0.000 | 0.140 | 5.891 | 1.196 | n/a | 0.034 | 6.962 | 0.419 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000ba5 | 16.586 | 2.543 | n/a | 0.000 | 0.059 | 0.949 | 7.883 | 0.023 | 0.000 | 0.145 | 4.439 | 0.502 | n/a | 0.043 | 2.603 | 0.157 | 0.043 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 7f5c171c0c2d73c70000000000000b5d | 16.531 | 2.436 | n/a | 1.318 | 0.062 | 0.604 | 1.320 | 0.022 | 0.000 | 0.164 | 10.055 | 0.518 | n/a | 0.032 | 3.815 | 0.231 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a72 | 16.463 | 2.699 | n/a | 0.000 | 0.084 | 1.194 | 2.459 | 0.036 | 0.000 | 0.355 | 8.806 | 0.789 | n/a | 0.041 | 2.782 | 0.169 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b18 | 16.442 | 2.467 | n/a | 0.000 | 0.085 | 1.043 | 3.193 | 0.038 | 0.000 | 0.251 | 8.003 | 1.314 | n/a | 0.048 | 2.552 | 0.155 | 0.048 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000aa5 | 16.430 | 2.729 | n/a | 0.000 | 0.091 | 1.347 | 2.055 | 0.032 | 0.000 | 0.199 | 8.300 | 1.638 | n/a | 0.039 | 2.819 | 0.172 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.201ms |
| 7f5c171c0c2d73c70000000000000b4e | 16.340 | 4.932 | n/a | 1.282 | 0.076 | 1.579 | 2.423 | 0.038 | 0.000 | 0.239 | 5.193 | 0.532 | n/a | 0.046 | 6.290 | 0.385 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.488 | 0.718 | 0.000 | 0.611 | 2.862 | n/a | 0.000 | 0.080 | 0.892 | 1.506 | 0.019 | 0.000 | 0.188 | 5.999 | 0.617 | n/a | 0.038 | 3.138 | 0.249 | 0.038 |
| p99 | 21.294 | 3.004 | 0.000 | 2.528 | 5.570 | n/a | 2.145 | 3.308 | 2.440 | 6.402 | 0.065 | 0.000 | 0.974 | 11.240 | 1.887 | n/a | 0.104 | 7.354 | 0.444 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f5c171c0c2d73c70000000000000a9f | 47.949 | 2.691 | n/a | 0.000 | 0.095 | 0.808 | 2.303 | 0.037 | 0.000 | 0.974 | 5.626 | 35.374 | n/a | 0.041 | 2.786 | 0.058 | 0.041 | tx/thread-82/transactor.triplex-function | driver.reader-basis.broadcast 0.134ms |
| 7f5c171c0c2d73c70000000000000ba8 | 21.294 | 4.913 | n/a | 0.000 | 0.482 | 0.918 | 1.500 | 0.024 | 0.000 | 0.224 | 11.240 | 1.803 | n/a | 0.190 | 5.395 | 0.253 | 0.190 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a63 | 20.740 | 5.000 | n/a | 0.000 | 0.167 | 1.792 | 2.541 | 0.038 | 0.000 | 0.953 | 9.475 | 0.681 | n/a | 0.093 | 5.167 | 0.249 | 0.093 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b24 | 20.396 | 2.463 | n/a | 0.000 | 0.074 | 1.229 | 6.402 | 0.060 | 0.000 | 0.312 | 9.269 | 0.548 | n/a | 0.039 | 2.537 | 0.124 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a39 | 19.473 | 4.318 | n/a | 0.000 | 3.449 | 1.177 | 1.575 | 0.021 | 0.000 | 0.244 | 7.521 | 1.103 | n/a | 0.065 | 7.767 | 0.399 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a6c | 19.197 | 3.854 | n/a | 0.000 | 0.080 | 1.372 | 1.652 | 0.021 | 0.000 | 0.516 | 11.173 | 0.491 | n/a | 0.039 | 3.934 | 0.205 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b0f | 19.026 | 4.368 | n/a | 0.000 | 0.155 | 1.331 | 2.949 | 0.035 | 0.000 | 0.907 | 7.885 | 1.320 | n/a | 0.074 | 4.524 | 0.238 | 0.074 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a75 | 18.872 | 6.026 | n/a | 0.000 | 0.189 | 1.152 | 1.936 | 0.031 | 0.000 | 0.386 | 8.354 | 0.695 | n/a | 0.104 | 6.215 | 0.329 | 0.104 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a8a | 18.518 | 3.992 | n/a | 0.000 | 0.065 | 0.889 | 1.451 | 0.018 | 0.000 | 0.216 | 11.184 | 0.670 | n/a | 0.033 | 4.057 | 0.219 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b48 | 17.579 | 2.585 | n/a | 0.000 | 0.078 | 0.842 | 1.782 | 0.021 | 0.000 | 0.215 | 11.476 | 0.536 | n/a | 0.043 | 2.664 | 0.152 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b84 | 17.256 | 5.536 | n/a | 0.000 | 0.175 | 1.243 | 1.706 | 0.022 | 0.000 | 0.200 | 7.197 | 1.088 | n/a | 0.090 | 5.711 | 0.331 | 0.090 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b42 | 16.861 | 5.570 | n/a | 0.000 | 0.171 | 1.166 | 2.772 | 0.045 | 0.000 | 1.054 | 5.356 | 0.657 | n/a | 0.069 | 5.741 | 0.340 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b1e | 16.813 | 2.580 | n/a | 0.000 | 0.094 | 0.981 | 1.759 | 0.022 | 0.000 | 0.568 | 9.680 | 1.079 | n/a | 0.048 | 2.674 | 0.159 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a69 | 16.597 | 4.272 | n/a | 0.000 | 2.690 | 1.074 | 1.281 | 0.018 | 0.000 | 0.140 | 5.891 | 1.196 | n/a | 0.034 | 6.962 | 0.419 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000ba5 | 16.586 | 2.543 | n/a | 0.000 | 0.059 | 0.949 | 7.883 | 0.023 | 0.000 | 0.145 | 4.439 | 0.502 | n/a | 0.043 | 2.603 | 0.157 | 0.043 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 7f5c171c0c2d73c70000000000000b5d | 16.531 | 2.436 | n/a | 1.318 | 0.062 | 0.604 | 1.320 | 0.022 | 0.000 | 0.164 | 10.055 | 0.518 | n/a | 0.032 | 3.815 | 0.231 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000a72 | 16.463 | 2.699 | n/a | 0.000 | 0.084 | 1.194 | 2.459 | 0.036 | 0.000 | 0.355 | 8.806 | 0.789 | n/a | 0.041 | 2.782 | 0.169 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000b18 | 16.442 | 2.467 | n/a | 0.000 | 0.085 | 1.043 | 3.193 | 0.038 | 0.000 | 0.251 | 8.003 | 1.314 | n/a | 0.048 | 2.552 | 0.155 | 0.048 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7f5c171c0c2d73c70000000000000aa5 | 16.430 | 2.729 | n/a | 0.000 | 0.091 | 1.347 | 2.055 | 0.032 | 0.000 | 0.199 | 8.300 | 1.638 | n/a | 0.039 | 2.819 | 0.172 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.201ms |
| 7f5c171c0c2d73c70000000000000b4e | 16.340 | 4.932 | n/a | 1.282 | 0.076 | 1.579 | 2.423 | 0.038 | 0.000 | 0.239 | 5.193 | 0.532 | n/a | 0.046 | 6.290 | 0.385 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.525 | n/a | n/a | n/a | 0.049 | n/a | 0.000 | 0.000 | 0.658 | 200.688 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.101 | 0.049 | 0.000 | 0.101 |
| p99 | 375.742 | n/a | n/a | n/a | 15.378 | n/a | 1.613 | 0.000 | 2.947 | 358.634 | 3.461 | 16.003 | 0.176 | 0.000 | n/a | n/a | 0.388 | 16.991 | 0.122 | 0.388 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b7150000000000000002 | 375.742 | 3.762 | n/a | 0.000 | 0.000 | 2.000 | 358.634 | 3.461 | 7.321 | 0.176 | 0.000 | n/a | n/a | 0.388 | 3.762 | 0.010 | 0.388 | gw-r/thread-47/gateway.admitted-work | none observed |
| 10698d5dab6065c80000000000000005 | 204.188 | 0.085 | n/a | 0.000 | 0.000 | 1.216 | 202.543 | 0.021 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.166 | 0.085 | 0.000 | 0.166 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c80000000000000917 | 202.342 | 0.045 | n/a | 0.000 | 0.000 | 0.569 | 201.511 | 0.012 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.101 | 0.045 | 0.000 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c8000000000000032d | 202.009 | 0.049 | n/a | 0.000 | 0.000 | 1.128 | 200.685 | 0.005 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.081 | 0.049 | 0.000 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c80000000000000916 | 201.525 | 0.042 | n/a | 0.000 | 0.000 | 0.658 | 200.688 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.096 | 0.042 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c80000000000000918 | 201.436 | 0.034 | n/a | 0.000 | 0.000 | 0.598 | 200.682 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.073 | 0.034 | 0.000 | 0.073 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c80000000000000919 | 201.350 | 0.020 | n/a | 0.000 | 0.000 | 0.384 | 200.843 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.047 | 0.020 | 0.000 | 0.047 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c8000000000000091c | 139.313 | 15.378 | n/a | 1.613 | 0.000 | 0.332 | 105.783 | 0.003 | 16.003 | 0.003 | 0.000 | n/a | n/a | 0.197 | 16.991 | 0.122 | 0.197 | gw-r/thread-52/gateway.admitted-work | none observed |
| 10698d5dab6065c80000000000000006 | 106.469 | 0.119 | n/a | 0.000 | 0.000 | 2.947 | 103.167 | 0.020 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.113 | 0.119 | 0.001 | 0.113 | gw-r/thread-51/journal/page | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 976.225 | n/a | n/a | n/a | 0.241 | n/a | 0.000 | 0.000 | 1.581 | 969.210 | 0.007 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.143 | 0.241 | 0.000 | 0.143 |
| p99 | 1005.006 | n/a | n/a | n/a | 4.831 | n/a | 0.000 | 0.000 | 1.963 | 1001.580 | 0.021 | 0.000 | 0.262 | 0.000 | n/a | n/a | 1.320 | 4.831 | 0.005 | 1.320 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b71500000000000000a4 | 1005.006 | 0.241 | n/a | 0.000 | 0.000 | 1.581 | 1001.580 | 0.021 | 0.000 | 0.262 | 0.000 | n/a | n/a | 1.320 | 0.241 | 0.000 | 1.320 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b7150000000000000937 | 976.225 | 4.831 | n/a | 0.000 | 0.000 | 1.963 | 969.210 | 0.007 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.143 | 4.831 | 0.005 | 0.143 | gw-r/thread-67/journal/page | none observed |

## P3 / warmup / internal (202 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.574 | n/a | n/a | n/a | 2.582 | n/a | 0.000 | 0.000 | 0.668 | 20.065 | 0.010 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.069 | 2.582 | 0.111 | 0.069 |
| p99 | 48.449 | n/a | n/a | n/a | 6.285 | n/a | 0.000 | 0.000 | 7.591 | 45.325 | 1.041 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.325 | 6.285 | 0.338 | 0.325 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b7150000000000000234 | 1002.652 | 0.159 | n/a | 0.000 | 0.000 | 0.722 | 1000.585 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.144 | 0.159 | 0.000 | 1.144 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b71500000000000000a5 | 61.354 | 5.708 | n/a | 0.000 | 0.000 | 0.696 | 54.433 | 0.015 | 0.000 | 0.282 | 0.000 | n/a | n/a | 0.220 | 5.708 | 0.093 | 0.220 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000137 | 48.449 | 2.288 | n/a | 0.000 | 0.000 | 0.675 | 45.325 | 0.012 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.070 | 2.288 | 0.047 | 0.070 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b71500000000000000f3 | 41.604 | 4.566 | n/a | 0.000 | 0.000 | 0.663 | 36.132 | 0.011 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.176 | 4.566 | 0.110 | 0.176 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b715000000000000015a | 36.234 | 5.585 | n/a | 0.000 | 0.000 | 1.004 | 29.417 | 0.013 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.135 | 5.585 | 0.154 | 0.135 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b715000000000000019b | 35.657 | 2.324 | n/a | 0.000 | 0.000 | 1.054 | 32.184 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.061 | 2.324 | 0.065 | 0.061 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b71500000000000000ee | 35.466 | 2.412 | n/a | 0.000 | 0.000 | 0.508 | 31.403 | 1.041 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.068 | 2.412 | 0.068 | 0.068 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b71500000000000000b9 | 35.101 | 2.455 | n/a | 0.000 | 0.000 | 1.740 | 30.119 | 0.648 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.091 | 2.455 | 0.070 | 0.091 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b715000000000000021d | 34.840 | 2.602 | n/a | 0.000 | 0.000 | 0.946 | 31.101 | 0.010 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.093 | 2.602 | 0.075 | 0.093 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b71500000000000001e1 | 34.711 | 3.711 | n/a | 0.000 | 0.000 | 0.330 | 30.499 | 0.004 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.156 | 3.711 | 0.107 | 0.156 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b71500000000000000fc | 33.798 | 5.543 | n/a | 0.000 | 0.000 | 0.768 | 27.174 | 0.048 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.195 | 5.543 | 0.164 | 0.195 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000206 | 33.344 | 2.498 | n/a | 0.000 | 0.000 | 0.447 | 30.268 | 0.012 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.060 | 2.498 | 0.075 | 0.060 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b715000000000000014d | 33.044 | 2.680 | n/a | 0.000 | 0.000 | 2.652 | 27.547 | 0.017 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.064 | 2.680 | 0.081 | 0.064 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b7150000000000000186 | 32.601 | 6.285 | n/a | 0.000 | 0.000 | 0.674 | 25.418 | 0.012 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.145 | 6.285 | 0.193 | 0.145 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b715000000000000011e | 32.535 | 2.272 | n/a | 0.000 | 0.000 | 0.772 | 29.334 | 0.011 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.063 | 2.272 | 0.070 | 0.063 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000168 | 32.521 | 2.545 | n/a | 0.000 | 0.000 | 3.375 | 26.449 | 0.011 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.059 | 2.545 | 0.078 | 0.059 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b71500000000000000db | 32.369 | 2.279 | n/a | 0.000 | 0.000 | 0.506 | 29.400 | 0.019 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.070 | 2.279 | 0.070 | 0.070 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b71500000000000001ce | 32.062 | 4.802 | n/a | 0.000 | 0.000 | 0.763 | 26.346 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.094 | 4.802 | 0.150 | 0.094 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000148 | 32.001 | 2.135 | n/a | 0.000 | 0.000 | 0.422 | 29.296 | 0.018 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.050 | 2.135 | 0.067 | 0.050 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b71500000000000001a1 | 31.793 | 3.212 | n/a | 0.000 | 0.000 | 1.527 | 26.943 | 0.010 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.059 | 3.212 | 0.101 | 0.059 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-10 / internal (139 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.952 | n/a | n/a | n/a | 2.586 | n/a | 0.000 | 0.000 | 0.668 | 4.326 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.070 | 2.586 | 0.317 | 0.070 |
| p99 | 61.733 | n/a | n/a | n/a | 10.094 | n/a | 0.000 | 0.000 | 8.229 | 52.618 | 0.387 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.506 | 10.094 | 0.762 | 0.506 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b7150000000000000355 | 1002.243 | 0.104 | n/a | 0.000 | 0.000 | 0.292 | 1000.690 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.111 | 0.104 | 0.000 | 1.111 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000277 | 61.733 | 5.292 | n/a | 0.000 | 0.000 | 3.571 | 52.618 | 0.013 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.186 | 5.292 | 0.086 | 0.186 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000310 | 39.671 | 5.450 | n/a | 0.000 | 0.000 | 0.484 | 33.565 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.127 | 5.450 | 0.137 | 0.127 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b71500000000000002bd | 39.528 | 7.029 | n/a | 0.000 | 0.000 | 0.469 | 9.215 | 0.004 | 22.653 | 0.029 | 0.000 | n/a | n/a | 0.129 | 7.029 | 0.178 | 0.129 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| c4ead26c33a7b7150000000000000246 | 24.238 | 4.745 | n/a | 0.000 | 0.000 | 0.617 | 18.713 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.124 | 4.745 | 0.196 | 0.124 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000348 | 23.792 | 3.296 | n/a | 0.000 | 0.000 | 0.916 | 19.378 | 0.015 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.127 | 3.296 | 0.139 | 0.127 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000357 | 23.642 | 3.099 | n/a | 0.000 | 0.000 | 2.234 | 18.212 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.083 | 3.099 | 0.131 | 0.083 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000271 | 23.131 | 6.730 | n/a | 0.000 | 0.000 | 13.744 | 2.550 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.069 | 6.730 | 0.291 | 0.069 | node-14/thread-2/socket.wait-first-byte | none observed |
| c4ead26c33a7b7150000000000000287 | 23.034 | 5.309 | n/a | 0.000 | 0.000 | 4.551 | 13.032 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.086 | 5.309 | 0.230 | 0.086 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b71500000000000002b3 | 22.487 | 4.037 | n/a | 0.000 | 0.000 | 3.723 | 14.605 | 0.010 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.070 | 4.037 | 0.180 | 0.070 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b715000000000000024c | 21.949 | 9.652 | n/a | 0.000 | 0.000 | 0.733 | 11.005 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.506 | 9.652 | 0.440 | 0.506 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b715000000000000029a | 20.914 | 4.721 | n/a | 0.000 | 0.000 | 0.573 | 15.499 | 0.025 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.057 | 4.721 | 0.226 | 0.057 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b715000000000000033e | 19.449 | 2.115 | n/a | 0.000 | 0.000 | 0.621 | 16.600 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.062 | 2.115 | 0.109 | 0.062 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b715000000000000023c | 19.203 | 2.899 | n/a | 0.000 | 0.000 | 3.051 | 13.087 | 0.015 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.088 | 2.899 | 0.151 | 0.088 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b715000000000000027d | 18.591 | 10.094 | n/a | 0.000 | 0.000 | 5.642 | 1.639 | 0.901 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.293 | 10.094 | 0.543 | 0.293 | node-14/thread-2/replica.fetch-feed | none observed |
| c4ead26c33a7b715000000000000032a | 17.705 | 2.537 | n/a | 0.000 | 0.000 | 2.921 | 12.147 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.061 | 2.537 | 0.143 | 0.061 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b7150000000000000346 | 17.277 | 3.280 | n/a | 0.000 | 0.000 | 2.520 | 11.362 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.068 | 3.280 | 0.190 | 0.068 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b71500000000000002d2 | 17.125 | 4.536 | n/a | 0.000 | 0.000 | 0.510 | 11.905 | 0.009 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.122 | 4.536 | 0.265 | 0.122 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b7150000000000000264 | 16.854 | 5.262 | n/a | 0.000 | 0.000 | 2.113 | 9.339 | 0.015 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.106 | 5.262 | 0.312 | 0.106 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b71500000000000002f2 | 16.642 | 2.369 | n/a | 0.000 | 0.000 | 2.309 | 11.872 | 0.008 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.055 | 2.369 | 0.142 | 0.055 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-25 / internal (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.024 | n/a | n/a | n/a | 2.276 | n/a | 0.000 | 0.000 | 0.502 | 21.555 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.061 | 2.276 | 0.095 | 0.061 |
| p99 | 70.310 | n/a | n/a | n/a | 10.532 | n/a | 0.000 | 0.000 | 4.182 | 44.797 | 0.323 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.171 | 10.532 | 0.348 | 0.171 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b7150000000000000481 | 1003.531 | 0.153 | n/a | 0.000 | 0.000 | 0.724 | 1001.449 | 0.016 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.117 | 0.153 | 0.000 | 1.117 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b7150000000000000390 | 70.310 | 15.467 | n/a | 0.000 | 0.000 | 34.803 | 19.897 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.094 | 15.467 | 0.220 | 0.094 | node-14/thread-2/socket.wait-first-byte | none observed |
| c4ead26c33a7b7150000000000000483 | 48.875 | 3.443 | n/a | 0.000 | 0.000 | 0.515 | 44.797 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.062 | 3.443 | 0.070 | 0.062 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b71500000000000003a8 | 40.003 | 4.286 | n/a | 0.000 | 0.000 | 0.546 | 35.017 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.112 | 4.286 | 0.107 | 0.112 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000420 | 37.622 | 2.772 | n/a | 0.000 | 0.000 | 0.401 | 28.541 | 0.004 | 5.814 | 0.031 | 0.000 | n/a | n/a | 0.058 | 2.772 | 0.074 | 0.058 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b715000000000000036d | 33.315 | 4.421 | n/a | 0.000 | 0.000 | 0.695 | 28.053 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.114 | 4.421 | 0.133 | 0.114 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b715000000000000037d | 32.941 | 3.324 | n/a | 0.000 | 0.000 | 0.385 | 29.105 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.096 | 3.324 | 0.101 | 0.096 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b7150000000000000439 | 32.510 | 2.829 | n/a | 0.000 | 0.000 | 1.263 | 28.278 | 0.002 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.126 | 2.829 | 0.087 | 0.126 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b715000000000000038e | 32.018 | 3.107 | n/a | 0.000 | 0.000 | 0.713 | 28.101 | 0.011 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.071 | 3.107 | 0.097 | 0.071 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b7150000000000000445 | 30.862 | 4.607 | n/a | 0.000 | 0.000 | 0.604 | 25.487 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.110 | 4.607 | 0.149 | 0.110 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b7150000000000000397 | 30.841 | 2.119 | n/a | 0.000 | 0.000 | 0.382 | 28.231 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.054 | 2.119 | 0.069 | 0.054 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b71500000000000003f4 | 30.258 | 10.532 | n/a | 0.000 | 0.000 | 0.987 | 18.552 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.171 | 10.532 | 0.348 | 0.171 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b71500000000000003a1 | 30.077 | 2.293 | n/a | 0.000 | 0.000 | 0.475 | 27.191 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.073 | 2.293 | 0.076 | 0.073 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000454 | 29.972 | 2.483 | n/a | 0.000 | 0.000 | 0.445 | 26.934 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.059 | 2.483 | 0.083 | 0.059 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b715000000000000040e | 29.793 | 2.188 | n/a | 0.000 | 0.000 | 0.479 | 27.040 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.056 | 2.188 | 0.073 | 0.056 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b71500000000000003c0 | 29.743 | 2.744 | n/a | 0.000 | 0.000 | 3.662 | 23.180 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.143 | 2.744 | 0.092 | 0.143 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b7150000000000000377 | 29.011 | 2.880 | n/a | 0.000 | 0.000 | 0.522 | 25.516 | 0.008 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.057 | 2.880 | 0.099 | 0.057 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b71500000000000003cc | 29.002 | 2.189 | n/a | 0.000 | 0.000 | 0.420 | 26.281 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.053 | 2.189 | 0.075 | 0.053 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b71500000000000003e9 | 28.927 | 2.024 | n/a | 0.000 | 0.000 | 4.182 | 22.635 | 0.002 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.063 | 2.024 | 0.070 | 0.063 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000477 | 28.647 | 3.628 | n/a | 0.000 | 0.000 | 3.754 | 21.178 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.062 | 3.628 | 0.127 | 0.062 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-50 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.976 | n/a | n/a | n/a | 2.358 | n/a | 0.000 | 0.000 | 0.548 | 46.654 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.064 | 2.358 | 0.048 | 0.064 |
| p99 | 108.582 | n/a | n/a | n/a | 5.008 | n/a | 0.000 | 0.000 | 4.187 | 105.805 | 0.119 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.221 | 5.008 | 0.102 | 0.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b71500000000000005ad | 1002.596 | 0.115 | n/a | 0.000 | 0.000 | 0.591 | 1000.731 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.103 | 0.115 | 0.000 | 1.103 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b71500000000000005b0 | 108.582 | 2.033 | n/a | 0.000 | 0.000 | 0.658 | 105.805 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.075 | 2.033 | 0.019 | 0.075 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b715000000000000053c | 76.238 | 4.875 | n/a | 0.000 | 0.000 | 0.552 | 70.670 | 0.003 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.115 | 4.875 | 0.064 | 0.115 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b7150000000000000546 | 64.187 | 2.575 | n/a | 0.000 | 0.000 | 4.200 | 57.321 | 0.002 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.069 | 2.575 | 0.040 | 0.069 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000577 | 61.567 | 4.750 | n/a | 0.000 | 0.000 | 0.917 | 55.661 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.221 | 4.750 | 0.077 | 0.221 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000496 | 57.636 | 1.969 | n/a | 0.000 | 0.000 | 0.424 | 55.151 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.057 | 1.969 | 0.034 | 0.057 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b715000000000000059b | 57.475 | 2.057 | n/a | 0.000 | 0.000 | 0.394 | 54.900 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.068 | 2.057 | 0.036 | 0.068 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b715000000000000058f | 56.941 | 7.125 | n/a | 0.000 | 0.000 | 0.616 | 49.098 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.064 | 7.125 | 0.125 | 0.064 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b71500000000000004ed | 56.932 | 2.473 | n/a | 0.000 | 0.000 | 0.453 | 53.921 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.074 | 2.473 | 0.043 | 0.074 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b715000000000000054b | 56.430 | 3.623 | n/a | 0.000 | 0.000 | 0.405 | 52.271 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.105 | 3.623 | 0.064 | 0.105 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b71500000000000004e7 | 55.836 | 1.863 | n/a | 0.000 | 0.000 | 0.513 | 53.371 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.070 | 1.863 | 0.033 | 0.070 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b7150000000000000550 | 55.737 | 2.341 | n/a | 0.000 | 0.000 | 1.135 | 52.192 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.058 | 2.341 | 0.042 | 0.058 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b7150000000000000563 | 54.508 | 4.165 | n/a | 0.000 | 0.000 | 0.615 | 49.586 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.106 | 4.165 | 0.076 | 0.106 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b7150000000000000525 | 54.423 | 4.465 | n/a | 0.000 | 0.000 | 3.417 | 46.460 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.067 | 4.465 | 0.082 | 0.067 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b7150000000000000587 | 54.224 | 3.332 | n/a | 0.000 | 0.000 | 0.682 | 50.098 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.059 | 3.332 | 0.061 | 0.059 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b71500000000000004a9 | 54.188 | 2.859 | n/a | 0.000 | 0.000 | 0.399 | 50.837 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.053 | 2.859 | 0.053 | 0.053 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b71500000000000004d2 | 53.750 | 4.697 | n/a | 0.000 | 0.000 | 0.450 | 48.454 | 0.011 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.100 | 4.697 | 0.087 | 0.100 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000582 | 53.583 | 2.853 | n/a | 0.000 | 0.000 | 0.396 | 50.225 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.063 | 2.853 | 0.053 | 0.063 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b715000000000000050b | 53.543 | 2.269 | n/a | 0.000 | 0.000 | 0.504 | 50.675 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.062 | 2.269 | 0.042 | 0.062 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b715000000000000050f | 53.349 | 3.366 | n/a | 0.000 | 0.000 | 0.405 | 49.409 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.114 | 3.366 | 0.063 | 0.114 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-100 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 99.815 | n/a | n/a | n/a | 2.435 | n/a | 0.000 | 0.000 | 0.573 | 96.304 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.065 | 2.435 | 0.025 | 0.065 |
| p99 | 248.121 | n/a | n/a | n/a | 5.203 | n/a | 0.000 | 0.000 | 3.088 | 245.095 | 0.314 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.264 | 5.203 | 0.051 | 0.264 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b71500000000000006da | 1002.848 | 0.111 | n/a | 0.000 | 0.000 | 0.352 | 1001.214 | 0.011 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.104 | 0.111 | 0.000 | 1.104 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b71500000000000006dd | 248.121 | 2.461 | n/a | 0.000 | 0.000 | 0.477 | 245.095 | 0.003 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.059 | 2.461 | 0.010 | 0.059 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b71500000000000005ed | 107.944 | 2.349 | n/a | 0.000 | 0.000 | 0.431 | 105.064 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.082 | 2.349 | 0.022 | 0.082 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b71500000000000006d0 | 107.771 | 2.442 | n/a | 0.000 | 0.000 | 0.628 | 104.604 | 0.004 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.073 | 2.442 | 0.023 | 0.073 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000687 | 107.751 | 4.999 | n/a | 0.000 | 0.000 | 0.879 | 101.717 | 0.002 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.133 | 4.999 | 0.046 | 0.133 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b71500000000000006c7 | 107.378 | 3.745 | n/a | 0.000 | 0.000 | 0.751 | 102.793 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.073 | 3.745 | 0.035 | 0.073 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b7150000000000000672 | 107.207 | 4.279 | n/a | 0.000 | 0.000 | 0.624 | 102.002 | 0.003 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.264 | 4.279 | 0.040 | 0.264 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b7150000000000000614 | 106.211 | 5.282 | n/a | 0.000 | 0.000 | 0.863 | 99.924 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.102 | 5.282 | 0.050 | 0.102 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b71500000000000005e8 | 105.794 | 4.167 | n/a | 0.000 | 0.000 | 0.537 | 100.935 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.114 | 4.167 | 0.039 | 0.114 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b71500000000000006ac | 105.715 | 4.358 | n/a | 0.000 | 0.000 | 1.271 | 99.928 | 0.007 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.124 | 4.358 | 0.041 | 0.124 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b71500000000000005f6 | 105.531 | 2.055 | n/a | 0.000 | 0.000 | 0.409 | 102.967 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.064 | 2.055 | 0.019 | 0.064 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b7150000000000000679 | 105.491 | 5.065 | n/a | 0.000 | 0.000 | 0.573 | 99.658 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.138 | 5.065 | 0.048 | 0.138 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b7150000000000000651 | 105.210 | 3.919 | n/a | 0.000 | 0.000 | 0.537 | 100.640 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.060 | 3.919 | 0.037 | 0.060 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b7150000000000000644 | 105.163 | 2.102 | n/a | 0.000 | 0.000 | 0.419 | 102.550 | 0.003 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.056 | 2.102 | 0.020 | 0.056 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b715000000000000064b | 105.136 | 2.052 | n/a | 0.000 | 0.000 | 0.595 | 102.352 | 0.010 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.066 | 2.052 | 0.020 | 0.066 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b71500000000000005c4 | 104.934 | 3.176 | n/a | 0.000 | 0.000 | 1.476 | 100.091 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.147 | 3.176 | 0.030 | 0.147 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b7150000000000000604 | 104.920 | 4.044 | n/a | 0.000 | 0.000 | 0.518 | 100.208 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.109 | 4.044 | 0.039 | 0.109 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b7150000000000000668 | 104.899 | 2.815 | n/a | 0.000 | 0.000 | 0.385 | 101.594 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.815 | 0.027 | 0.063 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b71500000000000005fd | 104.887 | 2.520 | n/a | 0.000 | 0.000 | 0.418 | 101.840 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.065 | 2.520 | 0.024 | 0.065 | gw-r/thread-48/journal/page | none observed |
| c4ead26c33a7b71500000000000006a1 | 104.778 | 3.329 | n/a | 0.000 | 0.000 | 1.776 | 99.557 | 0.004 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.053 | 3.329 | 0.032 | 0.053 | gw-r/thread-67/journal/page | none observed |

## P3 / idle-250 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 249.935 | n/a | n/a | n/a | 2.485 | n/a | 0.000 | 0.000 | 0.646 | 245.859 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.069 | 2.485 | 0.010 | 0.069 |
| p99 | 498.242 | n/a | n/a | n/a | 6.783 | n/a | 0.000 | 0.000 | 2.675 | 495.284 | 0.011 | 0.000 | 1.658 | 0.000 | n/a | n/a | 0.224 | 6.783 | 0.027 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b7150000000000000807 | 1002.651 | 0.178 | n/a | 0.000 | 0.000 | 0.633 | 1000.668 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 1.138 | 0.178 | 0.000 | 1.138 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b715000000000000080a | 498.242 | 2.432 | n/a | 0.000 | 0.000 | 0.437 | 495.284 | 0.003 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.061 | 2.432 | 0.005 | 0.061 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b7150000000000000763 | 287.097 | 3.071 | n/a | 0.000 | 0.000 | 2.675 | 281.212 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.084 | 3.071 | 0.011 | 0.084 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b7150000000000000747 | 261.373 | 4.959 | n/a | 0.000 | 0.000 | 1.196 | 255.046 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.135 | 4.959 | 0.019 | 0.135 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b71500000000000006e7 | 261.198 | 3.117 | n/a | 0.000 | 0.000 | 0.449 | 257.545 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.056 | 3.117 | 0.012 | 0.056 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b715000000000000077f | 261.089 | 2.310 | n/a | 0.000 | 0.000 | 0.660 | 258.013 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.071 | 2.310 | 0.009 | 0.071 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b7150000000000000719 | 261.072 | 4.794 | n/a | 0.000 | 0.000 | 0.611 | 246.172 | 0.004 | 9.335 | 0.020 | 0.000 | n/a | n/a | 0.137 | 4.794 | 0.018 | 0.137 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b71500000000000007c1 | 259.359 | 3.966 | n/a | 0.000 | 0.000 | 0.413 | 254.713 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.224 | 3.966 | 0.015 | 0.224 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b715000000000000075f | 258.213 | 2.379 | n/a | 0.000 | 0.000 | 0.582 | 255.134 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.073 | 2.379 | 0.009 | 0.073 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b715000000000000070d | 258.195 | 4.882 | n/a | 0.000 | 0.000 | 0.737 | 252.428 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.100 | 4.882 | 0.019 | 0.100 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b7150000000000000757 | 257.315 | 2.632 | n/a | 0.000 | 0.000 | 1.596 | 252.965 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.069 | 2.632 | 0.010 | 0.069 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b71500000000000007ab | 256.894 | 5.325 | n/a | 0.000 | 0.000 | 1.986 | 249.450 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.097 | 5.325 | 0.021 | 0.097 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b7150000000000000779 | 256.854 | 2.417 | n/a | 0.000 | 0.000 | 0.535 | 253.807 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.062 | 2.417 | 0.009 | 0.062 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b71500000000000007dc | 256.320 | 2.170 | n/a | 0.000 | 0.000 | 0.439 | 253.586 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.064 | 2.170 | 0.008 | 0.064 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b71500000000000007f2 | 256.029 | 10.802 | n/a | 0.000 | 0.000 | 1.068 | 244.025 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.105 | 10.802 | 0.042 | 0.105 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b71500000000000006f9 | 255.848 | 6.783 | n/a | 0.000 | 0.000 | 2.931 | 246.033 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.061 | 6.783 | 0.027 | 0.061 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b7150000000000000721 | 255.699 | 5.305 | n/a | 0.000 | 0.000 | 0.648 | 249.555 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.132 | 5.305 | 0.021 | 0.132 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b7150000000000000739 | 255.611 | 2.050 | n/a | 0.000 | 0.000 | 1.247 | 252.195 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.059 | 2.050 | 0.008 | 0.059 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b715000000000000072e | 255.410 | 2.967 | n/a | 0.000 | 0.000 | 1.308 | 251.040 | 0.003 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.064 | 2.967 | 0.012 | 0.064 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b7150000000000000735 | 254.753 | 2.113 | n/a | 0.000 | 0.000 | 0.441 | 252.106 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.053 | 2.113 | 0.008 | 0.053 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-500 / internal (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 499.746 | n/a | n/a | n/a | 2.561 | n/a | 0.000 | 0.000 | 0.604 | 495.980 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.067 | 2.561 | 0.005 | 0.067 |
| p99 | 525.971 | n/a | n/a | n/a | 8.100 | n/a | 0.000 | 0.000 | 3.303 | 522.141 | 0.209 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.264 | 8.100 | 0.016 | 0.264 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b7150000000000000934 | 1002.287 | 0.121 | n/a | 0.000 | 0.000 | 0.527 | 1000.492 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.106 | 0.121 | 0.000 | 1.106 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000936 | 525.971 | 10.699 | n/a | 0.000 | 0.000 | 0.572 | 514.410 | 0.007 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.264 | 10.699 | 0.020 | 0.264 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000818 | 525.296 | 2.395 | n/a | 0.000 | 0.000 | 0.647 | 522.141 | 0.003 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.072 | 2.395 | 0.005 | 0.072 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b7150000000000000868 | 513.041 | 2.463 | n/a | 0.000 | 0.000 | 0.453 | 498.706 | 0.005 | 11.326 | 0.031 | 0.000 | n/a | n/a | 0.058 | 2.463 | 0.005 | 0.058 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b7150000000000000874 | 511.947 | 3.070 | n/a | 0.000 | 0.000 | 3.303 | 505.430 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.081 | 3.070 | 0.006 | 0.081 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b71500000000000008ad | 510.966 | 4.179 | n/a | 0.000 | 0.000 | 0.938 | 504.944 | 0.003 | 0.000 | 0.830 | 0.000 | n/a | n/a | 0.072 | 4.179 | 0.008 | 0.072 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b7150000000000000862 | 510.718 | 3.934 | n/a | 0.000 | 0.000 | 0.995 | 505.653 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.084 | 3.934 | 0.008 | 0.084 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000854 | 508.325 | 3.481 | n/a | 0.000 | 0.000 | 0.460 | 504.246 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.098 | 3.481 | 0.007 | 0.098 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b71500000000000008f4 | 508.214 | 2.116 | n/a | 0.000 | 0.000 | 0.431 | 505.580 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.055 | 2.116 | 0.004 | 0.055 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000904 | 507.870 | 2.195 | n/a | 0.000 | 0.000 | 0.464 | 505.119 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.063 | 2.195 | 0.004 | 0.063 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b71500000000000008fc | 507.747 | 5.655 | n/a | 0.000 | 0.000 | 0.659 | 501.284 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.109 | 5.655 | 0.011 | 0.109 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b71500000000000008c0 | 507.460 | 2.359 | n/a | 0.000 | 0.000 | 2.012 | 502.991 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.074 | 2.359 | 0.005 | 0.074 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000928 | 506.602 | 2.958 | n/a | 0.000 | 0.000 | 0.480 | 503.033 | 0.009 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.079 | 2.958 | 0.006 | 0.079 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b71500000000000008ec | 506.512 | 2.198 | n/a | 0.000 | 0.000 | 0.469 | 503.754 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.063 | 2.198 | 0.004 | 0.063 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b715000000000000090e | 506.197 | 6.104 | n/a | 0.000 | 0.000 | 0.852 | 498.812 | 0.295 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.122 | 6.104 | 0.012 | 0.122 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b715000000000000085d | 506.126 | 2.881 | n/a | 0.000 | 0.000 | 0.549 | 502.570 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.069 | 2.881 | 0.006 | 0.069 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000840 | 505.805 | 2.458 | n/a | 0.000 | 0.000 | 0.432 | 502.755 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.128 | 2.458 | 0.005 | 0.128 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b71500000000000008b0 | 505.687 | 2.192 | n/a | 0.000 | 0.000 | 0.608 | 502.747 | 0.014 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.070 | 2.192 | 0.004 | 0.070 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b71500000000000008e0 | 505.625 | 7.130 | n/a | 0.000 | 0.000 | 0.656 | 497.718 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.092 | 7.130 | 0.014 | 0.092 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000836 | 505.561 | 2.972 | n/a | 0.000 | 0.000 | 0.465 | 501.968 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.115 | 2.972 | 0.006 | 0.115 | gw-r/thread-67/journal/page | none observed |

## P3 / idle-1000 / internal (157 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1000.020 | n/a | n/a | n/a | 3.229 | n/a | 0.000 | 0.000 | 0.605 | 994.799 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.079 | 3.563 | 0.004 | 0.079 |
| p99 | 1009.887 | n/a | n/a | n/a | 8.470 | n/a | 1.079 | 0.000 | 4.177 | 1002.029 | 0.016 | 0.000 | 0.068 | 0.000 | n/a | n/a | 1.205 | 9.548 | 0.738 | 1.205 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c4ead26c33a7b7150000000000000968 | 1014.755 | 3.823 | n/a | 0.704 | 0.000 | 18.531 | 991.586 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.086 | 4.527 | 0.004 | 0.086 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b71500000000000009c6 | 1009.887 | 8.294 | n/a | 3.536 | 0.000 | 0.697 | 997.219 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.103 | 11.831 | 0.012 | 0.103 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000956 | 1007.477 | 9.548 | n/a | 0.000 | 0.000 | 0.546 | 996.325 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.023 | 9.548 | 0.009 | 1.023 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000a37 | 1007.271 | 5.118 | n/a | 0.000 | 0.000 | 0.801 | 1000.076 | 0.006 | 0.000 | 0.066 | 0.000 | n/a | n/a | 1.205 | 5.118 | 0.005 | 1.205 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b71500000000000009ac | 1007.265 | 0.162 | n/a | 0.000 | 0.000 | 0.646 | 991.049 | 0.004 | 14.224 | 0.051 | 0.000 | n/a | n/a | 1.129 | 0.162 | 0.000 | 1.129 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b71500000000000009d4 | 1007.201 | 5.177 | n/a | 1.027 | 0.000 | 0.834 | 999.934 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.184 | 6.204 | 0.006 | 0.184 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b715000000000000095a | 1005.780 | 4.751 | n/a | 0.000 | 0.000 | 1.032 | 999.856 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.105 | 4.751 | 0.005 | 0.105 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b71500000000000009ce | 1005.719 | 3.229 | n/a | 0.000 | 0.000 | 0.556 | 1001.813 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.085 | 3.229 | 0.003 | 0.085 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000a59 | 1005.714 | 2.396 | n/a | 0.000 | 0.000 | 2.801 | 1000.404 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.067 | 2.396 | 0.002 | 0.067 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000a25 | 1005.697 | 2.516 | n/a | 0.000 | 0.000 | 0.545 | 1002.512 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.068 | 2.516 | 0.003 | 0.068 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b7150000000000000a65 | 1005.689 | 3.020 | n/a | 0.000 | 0.000 | 0.441 | 1002.029 | 0.010 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.142 | 3.020 | 0.003 | 0.142 | gw-r/thread-52/journal/page | none observed |
| c4ead26c33a7b7150000000000000a68 | 1005.333 | 0.108 | n/a | 0.000 | 0.000 | 3.645 | 1000.452 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 1.094 | 0.108 | 0.000 | 1.094 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000997 | 1005.262 | 3.636 | n/a | 0.523 | 0.000 | 0.388 | 1000.601 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.063 | 4.160 | 0.004 | 0.063 | gw-r/thread-51/journal/page | none observed |
| c4ead26c33a7b7150000000000000990 | 1005.043 | 3.162 | n/a | 0.408 | 0.000 | 0.566 | 1000.824 | 0.005 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.062 | 3.570 | 0.004 | 0.062 | gw-r/thread-50/journal/page | none observed |
| c4ead26c33a7b7150000000000000a45 | 1004.838 | 6.413 | n/a | 1.027 | 0.000 | 0.787 | 996.410 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.163 | 7.441 | 0.007 | 0.163 | gw-r/thread-49/journal/page | none observed |
| c4ead26c33a7b7150000000000000972 | 1004.704 | 4.172 | n/a | 0.767 | 0.000 | 3.183 | 996.473 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.073 | 4.938 | 0.005 | 0.073 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000a29 | 1004.647 | 4.021 | n/a | 0.589 | 0.000 | 0.454 | 999.455 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.068 | 4.610 | 0.005 | 0.068 | gw-r/thread-47/journal/page | none observed |
| c4ead26c33a7b7150000000000000a51 | 1004.593 | 4.355 | n/a | 0.000 | 0.000 | 3.352 | 996.751 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.107 | 4.355 | 0.004 | 0.107 | gw-r/thread-67/journal/page | none observed |
| c4ead26c33a7b715000000000000099b | 1004.335 | 3.989 | n/a | 0.618 | 0.000 | 0.482 | 999.079 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.114 | 4.607 | 0.005 | 0.114 | gw-r/thread-45/journal/page | none observed |
| c4ead26c33a7b7150000000000000965 | 1004.294 | 2.561 | n/a | 0.000 | 0.000 | 0.385 | 1001.239 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.056 | 2.561 | 0.003 | 0.056 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.176 | n/a | n/a | n/a | 0.052 | n/a | 0.000 | 0.000 | 0.759 | 201.132 | 0.011 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.094 | 0.052 | 0.000 | 0.094 |
| p99 | 203.191 | n/a | n/a | n/a | 0.058 | n/a | 0.000 | 0.000 | 1.567 | 201.856 | 0.080 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.143 | 0.058 | 0.000 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10698d5dab6065c800000000000000d0 | 203.191 | 0.057 | n/a | 0.000 | 0.000 | 1.567 | 201.289 | 0.011 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.143 | 0.057 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 10698d5dab6065c800000000000000cf | 203.141 | 0.052 | n/a | 0.000 | 0.000 | 0.875 | 201.856 | 0.080 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.108 | 0.052 | 0.000 | 0.108 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c800000000000000ce | 202.176 | 0.039 | n/a | 0.000 | 0.000 | 0.759 | 201.132 | 0.018 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c800000000000000d1 | 201.727 | 0.032 | n/a | 0.000 | 0.000 | 0.669 | 200.872 | 0.006 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c800000000000000d2 | 128.750 | 0.058 | n/a | 0.000 | 0.000 | 0.752 | 127.779 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.094 | 0.058 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-10 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.808 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.629 | 200.948 | 0.007 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.089 | 0.042 | 0.000 | 0.089 |
| p99 | 202.223 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 0.832 | 201.351 | 0.014 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.096 | 0.045 | 0.000 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10698d5dab6065c8000000000000015a | 202.223 | 0.042 | n/a | 0.000 | 0.000 | 0.620 | 201.351 | 0.014 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.089 | 0.042 | 0.000 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c8000000000000015c | 201.838 | 0.042 | n/a | 0.000 | 0.000 | 0.703 | 200.948 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.091 | 0.042 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c8000000000000015b | 201.808 | 0.045 | n/a | 0.000 | 0.000 | 0.629 | 200.964 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.096 | 0.045 | 0.000 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c80000000000000159 | 201.193 | 0.027 | n/a | 0.000 | 0.000 | 0.329 | 200.595 | 0.006 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.053 | 0.027 | 0.000 | 0.053 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c8000000000000015d | 115.936 | 0.041 | n/a | 0.000 | 0.000 | 0.832 | 114.984 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.059 | 0.041 | 0.000 | 0.059 | gw-r/thread-45/journal/page | none observed |

## P3 / idle-25 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.175 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.611 | 201.268 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.105 | 0.041 | 0.000 | 0.105 |
| p99 | 202.859 | n/a | n/a | n/a | 0.058 | n/a | 0.000 | 0.000 | 0.967 | 201.708 | 0.017 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.145 | 0.058 | 0.000 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10698d5dab6065c800000000000001f6 | 202.859 | 0.058 | n/a | 0.000 | 0.000 | 0.795 | 201.708 | 0.014 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.145 | 0.058 | 0.000 | 0.145 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c800000000000001f4 | 202.217 | 0.051 | n/a | 0.000 | 0.000 | 0.967 | 200.990 | 0.017 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.118 | 0.051 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c800000000000001f3 | 202.175 | 0.034 | n/a | 0.000 | 0.000 | 0.526 | 201.446 | 0.011 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.068 | 0.034 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c800000000000001f5 | 202.017 | 0.041 | n/a | 0.000 | 0.000 | 0.500 | 201.268 | 0.012 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.105 | 0.041 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c800000000000001f7 | 134.045 | 0.041 | n/a | 0.000 | 0.000 | 0.611 | 133.287 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.059 | 0.041 | 0.000 | 0.059 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-50 / read (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 55.623 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 0.560 | 55.096 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.060 | 0.045 | 0.001 | 0.060 |
| p99 | 202.001 | n/a | n/a | n/a | 0.078 | n/a | 0.000 | 0.000 | 2.587 | 201.075 | 0.009 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.124 | 0.078 | 0.001 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10698d5dab6065c8000000000000028f | 202.001 | 0.070 | n/a | 0.000 | 0.000 | 0.770 | 200.967 | 0.006 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.124 | 0.070 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c8000000000000028e | 201.736 | 0.029 | n/a | 0.000 | 0.000 | 0.491 | 201.075 | 0.009 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.061 | 0.029 | 0.000 | 0.061 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c80000000000000290 | 201.517 | 0.032 | n/a | 0.000 | 0.000 | 0.621 | 200.737 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c8000000000000028d | 201.470 | 0.051 | n/a | 0.000 | 0.000 | 0.626 | 200.636 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.109 | 0.051 | 0.000 | 0.109 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c80000000000000291 | 157.343 | 0.042 | n/a | 0.000 | 0.000 | 0.441 | 156.756 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.067 | 0.042 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c80000000000000292 | 106.141 | 0.046 | n/a | 0.000 | 0.000 | 0.460 | 105.533 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.060 | 0.046 | 0.000 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c80000000000000254 | 69.751 | 0.060 | n/a | 0.000 | 0.000 | 0.520 | 69.053 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.084 | 0.060 | 0.001 | 0.084 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c80000000000000259 | 65.619 | 0.038 | n/a | 0.000 | 0.000 | 2.587 | 62.898 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.049 | 0.038 | 0.001 | 0.049 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c80000000000000272 | 56.505 | 0.078 | n/a | 0.000 | 0.000 | 0.702 | 55.575 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.093 | 0.078 | 0.001 | 0.093 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c8000000000000025e | 56.122 | 0.045 | n/a | 0.000 | 0.000 | 0.746 | 55.232 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.063 | 0.045 | 0.001 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c80000000000000284 | 55.769 | 0.058 | n/a | 0.000 | 0.000 | 0.444 | 55.160 | 0.004 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.086 | 0.058 | 0.001 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c8000000000000022d | 55.623 | 0.038 | n/a | 0.000 | 0.000 | 0.408 | 55.096 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.049 | 0.038 | 0.001 | 0.049 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c80000000000000201 | 54.739 | 0.038 | n/a | 0.000 | 0.000 | 0.322 | 54.311 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.054 | 0.038 | 0.001 | 0.054 | gw-r/thread-48/journal/page | none observed |
| 10698d5dab6065c80000000000000277 | 52.357 | 0.051 | n/a | 0.000 | 0.000 | 0.994 | 51.231 | 0.003 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.053 | 0.051 | 0.001 | 0.053 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c8000000000000020b | 51.594 | 0.048 | n/a | 0.000 | 0.000 | 0.573 | 50.901 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.058 | 0.048 | 0.001 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c80000000000000228 | 51.403 | 0.037 | n/a | 0.000 | 0.000 | 0.879 | 50.409 | 0.007 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.047 | 0.037 | 0.001 | 0.047 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c8000000000000023c | 51.274 | 0.034 | n/a | 0.000 | 0.000 | 0.474 | 50.701 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.046 | 0.034 | 0.001 | 0.046 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c8000000000000022a | 50.831 | 0.051 | n/a | 0.000 | 0.000 | 0.478 | 50.189 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.062 | 0.051 | 0.001 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c80000000000000278 | 50.513 | 0.038 | n/a | 0.000 | 0.000 | 0.578 | 49.794 | 0.009 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.046 | 0.038 | 0.001 | 0.046 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c8000000000000024f | 50.492 | 0.039 | n/a | 0.000 | 0.000 | 0.586 | 49.749 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.051 | 0.039 | 0.001 | 0.051 | gw-r/thread-67/journal/page | none observed |

## P3 / idle-100 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.560 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.511 | 95.697 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.061 | 0.047 | 0.000 | 0.061 |
| p99 | 202.451 | n/a | n/a | n/a | 0.078 | n/a | 0.000 | 0.000 | 2.165 | 201.444 | 1.122 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.128 | 0.078 | 0.001 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10698d5dab6065c80000000000000329 | 202.990 | 0.077 | n/a | 0.000 | 0.000 | 1.011 | 201.613 | 0.010 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.177 | 0.077 | 0.000 | 0.177 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c8000000000000032a | 202.451 | 0.029 | n/a | 0.000 | 0.000 | 0.799 | 201.444 | 0.009 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c80000000000000328 | 202.222 | 0.042 | n/a | 0.000 | 0.000 | 0.707 | 201.295 | 0.006 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.086 | 0.042 | 0.000 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c8000000000000032b | 201.563 | 0.042 | n/a | 0.000 | 0.000 | 0.694 | 200.674 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.105 | 0.042 | 0.000 | 0.105 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c80000000000000327 | 201.361 | 0.035 | n/a | 0.000 | 0.000 | 0.563 | 200.653 | 0.003 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.062 | 0.035 | 0.000 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c800000000000002b0 | 107.380 | 0.071 | n/a | 0.000 | 0.000 | 1.444 | 105.717 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.095 | 0.071 | 0.001 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 10698d5dab6065c80000000000000322 | 103.553 | 0.037 | n/a | 0.000 | 0.000 | 0.830 | 102.572 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.048 | 0.037 | 0.000 | 0.048 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c800000000000002fd | 103.468 | 0.041 | n/a | 0.000 | 0.000 | 0.729 | 102.595 | 0.004 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.049 | 0.041 | 0.000 | 0.049 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c8000000000000031d | 103.075 | 0.040 | n/a | 0.000 | 0.000 | 0.507 | 102.399 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c800000000000002b8 | 102.433 | 0.050 | n/a | 0.000 | 0.000 | 0.545 | 101.774 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.052 | 0.050 | 0.000 | 0.052 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c800000000000002dc | 102.344 | 0.049 | n/a | 0.000 | 0.000 | 0.477 | 101.738 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.068 | 0.049 | 0.000 | 0.068 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c8000000000000030e | 101.865 | 0.039 | n/a | 0.000 | 0.000 | 0.498 | 101.260 | 0.004 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.048 | 0.039 | 0.000 | 0.048 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c800000000000002d6 | 101.372 | 0.055 | n/a | 0.000 | 0.000 | 0.605 | 100.605 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.060 | 0.055 | 0.001 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c800000000000002db | 101.234 | 0.055 | n/a | 0.000 | 0.000 | 0.539 | 100.532 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.065 | 0.055 | 0.001 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c800000000000002df | 101.198 | 0.044 | n/a | 0.000 | 0.000 | 0.440 | 100.625 | 0.006 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.066 | 0.044 | 0.000 | 0.066 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c80000000000000314 | 101.136 | 0.038 | n/a | 0.000 | 0.000 | 0.454 | 100.578 | 0.002 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.047 | 0.038 | 0.000 | 0.047 | gw-r/thread-48/journal/page | none observed |
| 10698d5dab6065c800000000000002b5 | 100.982 | 0.050 | n/a | 0.000 | 0.000 | 0.550 | 100.299 | 0.002 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.068 | 0.050 | 0.000 | 0.068 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c800000000000002ba | 100.885 | 0.040 | n/a | 0.000 | 0.000 | 0.668 | 100.115 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.049 | 0.040 | 0.000 | 0.049 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c800000000000002f1 | 100.646 | 0.062 | n/a | 0.000 | 0.000 | 0.502 | 99.982 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.088 | 0.062 | 0.001 | 0.088 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c800000000000002cc | 100.596 | 0.077 | n/a | 0.000 | 0.000 | 3.761 | 96.627 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.085 | 0.077 | 0.001 | 0.085 | gw-r/thread-52/journal/page | none observed |

## P3 / idle-250 / read (157 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.574 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.531 | 200.734 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.073 | 0.039 | 0.000 | 0.073 |
| p99 | 204.999 | n/a | n/a | n/a | 0.071 | n/a | 0.000 | 0.000 | 3.312 | 204.307 | 0.028 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.143 | 0.071 | 0.001 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10698d5dab6065c800000000000003b5 | 206.148 | 0.040 | n/a | 0.000 | 0.000 | 1.605 | 204.307 | 0.008 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c80000000000000439 | 204.999 | 0.038 | n/a | 0.000 | 0.000 | 3.837 | 200.984 | 0.008 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.068 | 0.038 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c80000000000000335 | 204.959 | 0.033 | n/a | 0.000 | 0.000 | 0.303 | 204.471 | 0.007 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c80000000000000457 | 204.312 | 0.037 | n/a | 0.000 | 0.000 | 0.326 | 203.813 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.069 | 0.037 | 0.000 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c8000000000000039d | 204.163 | 0.035 | n/a | 0.000 | 0.000 | 3.275 | 200.745 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.062 | 0.035 | 0.000 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c8000000000000036b | 204.079 | 0.033 | n/a | 0.000 | 0.000 | 3.312 | 200.617 | 0.004 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.062 | 0.033 | 0.000 | 0.062 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c8000000000000037b | 203.858 | 0.056 | n/a | 0.000 | 0.000 | 2.860 | 200.755 | 0.004 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.118 | 0.056 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c800000000000003ad | 203.815 | 0.047 | n/a | 0.000 | 0.000 | 2.946 | 200.686 | 0.003 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.081 | 0.047 | 0.000 | 0.081 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c80000000000000345 | 203.135 | 0.034 | n/a | 0.000 | 0.000 | 1.869 | 201.079 | 0.007 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c80000000000000355 | 203.026 | 0.034 | n/a | 0.000 | 0.000 | 1.248 | 201.563 | 0.008 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.073 | 0.034 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c80000000000000417 | 202.898 | 0.061 | n/a | 0.000 | 0.000 | 1.960 | 200.698 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.128 | 0.061 | 0.000 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c800000000000003a3 | 202.873 | 0.038 | n/a | 0.000 | 0.000 | 1.945 | 200.769 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.069 | 0.038 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c800000000000003bf | 202.553 | 0.053 | n/a | 0.000 | 0.000 | 1.771 | 200.552 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.120 | 0.053 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c800000000000003ab | 202.474 | 0.032 | n/a | 0.000 | 0.000 | 1.298 | 201.013 | 0.005 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.065 | 0.032 | 0.000 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c800000000000003cd | 202.441 | 0.054 | n/a | 0.000 | 0.000 | 1.531 | 200.679 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.122 | 0.054 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c8000000000000041d | 202.427 | 0.055 | n/a | 0.000 | 0.000 | 0.680 | 201.474 | 0.007 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.119 | 0.055 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c80000000000000437 | 202.385 | 0.071 | n/a | 0.000 | 0.000 | 0.700 | 201.429 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.143 | 0.071 | 0.000 | 0.143 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c80000000000000399 | 202.371 | 0.058 | n/a | 0.000 | 0.000 | 0.606 | 201.479 | 0.018 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.132 | 0.058 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c80000000000000375 | 202.286 | 0.051 | n/a | 0.000 | 0.000 | 0.622 | 201.400 | 0.007 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.115 | 0.051 | 0.000 | 0.115 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c800000000000003a9 | 202.169 | 0.032 | n/a | 0.000 | 0.000 | 0.793 | 201.188 | 0.008 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-67/journal/page | none observed |

## P3 / idle-500 / read (411 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.427 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.585 | 200.660 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.000 | 0.072 |
| p99 | 204.730 | n/a | n/a | n/a | 0.086 | n/a | 0.000 | 0.000 | 3.208 | 202.317 | 0.025 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.159 | 0.086 | 0.001 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10698d5dab6065c800000000000004a3 | 205.308 | 0.037 | n/a | 0.000 | 0.000 | 0.566 | 204.594 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.066 | 0.037 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c80000000000000554 | 205.009 | 0.031 | n/a | 0.000 | 0.000 | 0.459 | 204.418 | 0.003 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c80000000000000610 | 205.009 | 0.045 | n/a | 0.000 | 0.000 | 4.281 | 200.566 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.066 | 0.045 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c80000000000000583 | 204.975 | 0.056 | n/a | 0.000 | 0.000 | 4.132 | 200.613 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.122 | 0.056 | 0.000 | 0.122 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c80000000000000571 | 204.730 | 0.039 | n/a | 0.000 | 0.000 | 0.321 | 204.213 | 0.008 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.081 | 0.039 | 0.000 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c800000000000004cf | 204.100 | 0.043 | n/a | 0.000 | 0.000 | 3.208 | 200.729 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.074 | 0.043 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c800000000000005f8 | 203.733 | 0.036 | n/a | 0.000 | 0.000 | 1.301 | 202.263 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.061 | 0.036 | 0.000 | 0.061 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c8000000000000050c | 203.498 | 0.031 | n/a | 0.000 | 0.000 | 0.437 | 202.881 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c8000000000000054e | 203.197 | 0.032 | n/a | 0.000 | 0.000 | 0.719 | 202.317 | 0.004 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c80000000000000587 | 203.192 | 0.072 | n/a | 0.000 | 0.000 | 1.073 | 201.790 | 0.010 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.151 | 0.072 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c80000000000000520 | 203.126 | 0.035 | n/a | 0.000 | 0.000 | 1.749 | 201.174 | 0.007 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c800000000000005b7 | 203.046 | 0.032 | n/a | 0.000 | 0.000 | 1.861 | 201.024 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c80000000000000592 | 202.833 | 0.051 | n/a | 0.000 | 0.000 | 1.755 | 200.855 | 0.019 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.104 | 0.051 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c800000000000005f9 | 202.784 | 0.040 | n/a | 0.000 | 0.000 | 0.774 | 201.765 | 0.010 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.084 | 0.040 | 0.000 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c8000000000000056e | 202.748 | 0.057 | n/a | 0.000 | 0.000 | 0.931 | 201.601 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.110 | 0.057 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c8000000000000060b | 202.726 | 0.062 | n/a | 0.000 | 0.000 | 1.323 | 201.101 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.168 | 0.062 | 0.000 | 0.168 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c80000000000000473 | 202.716 | 0.065 | n/a | 0.000 | 0.000 | 1.073 | 201.332 | 0.005 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.150 | 0.065 | 0.000 | 0.150 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c8000000000000054a | 202.626 | 0.036 | n/a | 0.000 | 0.000 | 0.523 | 201.930 | 0.008 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.059 | 0.036 | 0.000 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c8000000000000050b | 202.621 | 0.032 | n/a | 0.000 | 0.000 | 1.434 | 201.014 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c800000000000004eb | 202.574 | 0.069 | n/a | 0.000 | 0.000 | 0.724 | 201.532 | 0.010 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.146 | 0.069 | 0.000 | 0.146 | gw-r/thread-67/journal/page | none observed |

## P3 / idle-1000 / read (755 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.439 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.586 | 200.687 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.073 | 0.037 | 0.000 | 0.073 |
| p99 | 204.216 | n/a | n/a | n/a | 0.085 | n/a | 0.000 | 0.000 | 3.010 | 202.067 | 0.021 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.168 | 0.086 | 0.001 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10698d5dab6065c800000000000007a9 | 205.346 | 0.037 | n/a | 0.000 | 0.000 | 4.245 | 200.926 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.075 | 0.037 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c800000000000006c6 | 205.264 | 0.045 | n/a | 0.000 | 0.000 | 0.660 | 200.705 | 0.008 | 0.000 | 3.740 | 0.000 | n/a | n/a | 0.106 | 0.045 | 0.000 | 0.106 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c800000000000008e9 | 205.250 | 0.037 | n/a | 0.509 | 0.000 | 3.740 | 200.833 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.073 | 0.546 | 0.003 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c800000000000007d2 | 205.214 | 0.033 | n/a | 0.000 | 0.000 | 0.670 | 204.375 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c80000000000000766 | 205.001 | 0.052 | n/a | 0.000 | 0.000 | 0.594 | 204.185 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.130 | 0.052 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| 10698d5dab6065c800000000000006a5 | 204.693 | 0.039 | n/a | 0.000 | 0.000 | 0.565 | 203.961 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.073 | 0.039 | 0.000 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c8000000000000090c | 204.251 | 0.030 | n/a | 0.000 | 0.000 | 3.208 | 200.878 | 0.005 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.076 | 0.030 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c80000000000000821 | 204.216 | 0.043 | n/a | 0.000 | 0.000 | 0.854 | 203.210 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.064 | 0.043 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c80000000000000656 | 204.191 | 0.047 | n/a | 0.000 | 0.000 | 3.407 | 200.616 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.070 | 0.047 | 0.000 | 0.070 | gw-r/thread-67/journal/page | none observed |
| 10698d5dab6065c8000000000000076d | 204.171 | 0.050 | n/a | 0.000 | 0.000 | 3.159 | 200.806 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.105 | 0.050 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c80000000000000687 | 203.951 | 0.052 | n/a | 0.000 | 0.000 | 3.010 | 200.759 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.083 | 0.052 | 0.000 | 0.083 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c800000000000006b6 | 203.927 | 0.035 | n/a | 0.000 | 0.000 | 3.081 | 200.682 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c800000000000006aa | 203.917 | 0.050 | n/a | 0.000 | 0.000 | 3.003 | 200.712 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.112 | 0.050 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c80000000000000812 | 203.818 | 0.029 | n/a | 0.000 | 0.000 | 2.845 | 200.768 | 0.015 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.074 | 0.029 | 0.000 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c80000000000000637 | 203.726 | 0.039 | n/a | 0.000 | 0.000 | 2.752 | 200.809 | 0.004 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.070 | 0.039 | 0.000 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 10698d5dab6065c800000000000006c3 | 203.475 | 0.034 | n/a | 0.000 | 0.000 | 2.663 | 200.666 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.079 | 0.034 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 10698d5dab6065c80000000000000763 | 203.462 | 0.067 | n/a | 0.000 | 0.000 | 2.587 | 200.622 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.133 | 0.067 | 0.000 | 0.133 | gw-r/thread-52/journal/page | none observed |
| 10698d5dab6065c80000000000000833 | 203.348 | 0.034 | n/a | 0.000 | 0.000 | 2.174 | 201.002 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.072 | 0.034 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 10698d5dab6065c80000000000000633 | 203.046 | 0.031 | n/a | 0.000 | 0.000 | 0.498 | 202.407 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 10698d5dab6065c800000000000006d0 | 203.046 | 0.052 | n/a | 0.000 | 0.000 | 0.450 | 202.356 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.118 | 0.052 | 0.000 | 0.118 | gw-r/thread-67/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 1250 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.003/2.868 ms; post-ACK p50/p99: 0.358/1.068 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.727 | 11.300 | 11.117 | reported |
| All-primary p99 ms | 46.938 | 46.609 | 40.430 | <=50 |
| L256 5-10 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 5-10 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 11-25 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 11-25 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 26-50 p50Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| L256 26-50 p99Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| Burst 5-10 p50 ms | unavailable | unavailable | unavailable | <=10 |
| Burst 11-25 p50 ms | unavailable | unavailable | unavailable | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | unavailable | unavailable | unavailable | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | unavailable | unavailable | unavailable | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5-10 | >=1000 | 8 | 12.166/47.700 | 11.547 | 7.068 | 17.369 | 0.102/0.029 |
| 5-10 | overlap | 121 | 15.682/68.200 | 15.370 | 10.536 | 24.829 | 0.058/0.018 |
| 5-10 | 0-50 | 525 | 10.312/24.748 | 9.878 | 5.641 | 14.459 | 0.054/0.017 |
| 5-10 | 50-100 | 149 | 10.258/18.155 | 9.944 | 5.501 | 14.103 | 0.058/0.017 |
| 5-10 | 100-250 | 149 | 11.344/21.503 | 11.028 | 6.050 | 15.198 | 0.076/0.019 |
| 5-10 | 250-1000 | 298 | 12.406/20.812 | 11.959 | 6.912 | 17.465 | 0.083/0.020 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1250 | 9 | 583.215 |

## Writer heap, GC and scheduler stalls

Source a0785bcf96f7afea3965b3028db2e27f4fbef6a9; 1250 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 361.173 / 391.071 |
| GC events / total duration / maximum ms | 317 / 863.423 / 56.502 |
| GC events >50 ms / total duration ms | 1 / 56.502 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":309,"4":4,"8":4} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 46.938 / 9 / 583.215 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

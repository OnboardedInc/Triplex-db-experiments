# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (59.806 ms, trace `c5e7bd39fcaf8a8f0000000000000139`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (60.834 ms, trace `c5e7bd39fcaf8a8f00000000000001b9`); `tx/thread-87/transactor.triplex-function` (44.656 ms, trace `c5e7bd39fcaf8a8f000000000000020a`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (55.119 ms, trace `c5e7bd39fcaf8a8f0000000000001d9b`); `tx/thread-87/transactor.triplex-function` (44.201 ms, trace `c5e7bd39fcaf8a8f0000000000000374`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-cache0-b-2-candidate`; source `9ac79685c6286ce7a20f3d06be5556d314817f42`; subjects 10000; tracing full.

Recorders: gateway, node, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 17731385.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 186 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13364.750 | 400.035 | 11.767 | 454 |
| L1 | 0 | 19964.198 | 329.053 | 8.388 | 668 |
| L4 | 0 | 19980.865 | 301.717 | 4.855 | 628 |
| L16 | 0 | 19971.605 | 308.122 | 5.148 | 686 |
| L64 | 0 | 19977.651 | 325.388 | 6.750 | 850 |
| L256 | 0 | 19971.571 | 408.763 | 5.389 | 708 |
| L1024 | 0 | 19981.667 | 3281.005 | 28.265 | 16846 |
| tail | 0 | 64695.027 | 10008.164 | 82.595 | 53113 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000000139 | driver.queue.scheduler-late | 0.984 | none | 0 / 32 |
| c5e7bd39fcaf8a8f0000000000000139 | driver.queue.scheduler-dispatch | 0.061 | none | 0 / 32 |

Observed active steps while trace c5e7bd39fcaf8a8f0000000000000139 waited: []

| c5e7bd39fcaf8a8f00000000000001b9 | driver.queue.scheduler-dispatch | 0.115 | none | 0 / 32 |
| c5e7bd39fcaf8a8f00000000000001b9 | driver.queue.scheduler-late | 0.071 | none | 0 / 32 |

Observed active steps while trace c5e7bd39fcaf8a8f00000000000001b9 waited: []

| c5e7bd39fcaf8a8f000000000000020a | driver.queue.scheduler-dispatch | 0.117 | none | 0 / 32 |
| c5e7bd39fcaf8a8f000000000000020a | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace c5e7bd39fcaf8a8f000000000000020a waited: []

| c5e7bd39fcaf8a8f0000000000001d9b | driver.queue.scheduler-late | 0.096 | none | 0 / 32 |
| c5e7bd39fcaf8a8f0000000000001d9b | driver.queue.scheduler-dispatch | 0.046 | none | 0 / 32 |

Observed active steps while trace c5e7bd39fcaf8a8f0000000000001d9b waited: []

| c5e7bd39fcaf8a8f0000000000000374 | driver.queue.scheduler-dispatch | 0.054 | none | 1 / 32 |
| c5e7bd39fcaf8a8f0000000000000374 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace c5e7bd39fcaf8a8f0000000000000374 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.550 | 0.341 | 0.000 | 0.708 | 4.641 | 0.571 | 0.000 | 0.124 | 1.521 | 6.042 | 0.030 | n/a | 0.342 | 9.631 | 4.577 | n/a | 0.037 | 5.336 | 0.175 | 0.037 |
| p99 | 63.609 | 5.526 | 0.000 | 4.479 | 13.195 | n/a | 6.891 | 1.268 | 5.469 | 26.316 | 0.151 | n/a | 4.089 | 47.817 | 13.047 | n/a | 0.146 | 21.339 | 0.387 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000000107 | 63.609 | 3.010 | n/a | 0.000 | 0.987 | 0.939 | 2.184 | 0.024 | n/a | 0.129 | 47.817 | 8.491 | n/a | 0.027 | 3.998 | 0.063 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000000f1 | 60.738 | 11.510 | 0.377 | 0.000 | 0.052 | 2.067 | 24.469 | 0.128 | n/a | 0.201 | 12.388 | 9.519 | n/a | 0.026 | 11.939 | 0.197 | 0.026 | gw-w/thread-43/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000000ef | 59.988 | 13.195 | n/a | 6.891 | 1.253 | 2.768 | 2.546 | 0.020 | n/a | 0.088 | 28.551 | 4.531 | n/a | 0.146 | 21.339 | 0.356 | 0.146 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000000f5 | 50.330 | 5.328 | 0.434 | 0.000 | 0.055 | 2.133 | 16.191 | 0.032 | n/a | 4.089 | 8.982 | 13.047 | n/a | 0.038 | 5.817 | 0.116 | 0.038 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f0000000000000105 | 47.762 | 8.846 | n/a | 4.050 | 0.965 | 1.560 | 4.813 | 0.076 | n/a | 0.251 | 21.100 | 6.054 | n/a | 0.049 | 13.860 | 0.290 | 0.049 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000010f | 42.348 | 3.451 | n/a | 1.841 | 0.550 | 0.967 | 26.316 | 0.090 | n/a | 1.488 | 6.363 | 1.257 | n/a | 0.025 | 5.842 | 0.138 | 0.025 | gw-w/thread-46/gateway.request-parse | none observed |
| c5e7bd39fcaf8a8f000000000000010d | 40.115 | 6.576 | 0.198 | 0.306 | 0.124 | 1.500 | 6.042 | 0.027 | n/a | 0.391 | 17.753 | 7.158 | n/a | 0.041 | 7.203 | 0.180 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000000fb | 39.419 | 4.701 | 0.348 | 0.000 | 0.085 | 5.469 | 7.997 | 0.030 | n/a | 2.524 | 12.727 | 5.490 | n/a | 0.048 | 5.134 | 0.130 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000000f9 | 39.244 | 5.043 | 0.157 | 0.000 | 0.020 | 1.881 | 19.049 | 0.030 | n/a | 0.506 | 5.558 | 6.986 | n/a | 0.014 | 5.220 | 0.133 | 0.014 | gw-w/thread-46/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000109 | 37.257 | 6.028 | 0.194 | 0.000 | 0.053 | 1.727 | 15.584 | 0.047 | n/a | 0.139 | 9.877 | 3.585 | n/a | 0.022 | 6.276 | 0.168 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000101 | 35.444 | 3.988 | 0.217 | 1.398 | 0.110 | 1.462 | 12.135 | 0.030 | n/a | 0.118 | 11.360 | 4.577 | n/a | 0.049 | 5.713 | 0.161 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000123 | 35.241 | 4.958 | 0.302 | 0.000 | 0.057 | 2.110 | 11.261 | 0.052 | n/a | 0.715 | 7.593 | 8.165 | n/a | 0.028 | 5.317 | 0.151 | 0.028 | gw-w/thread-46/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000115 | 32.608 | 7.292 | n/a | 4.066 | 1.268 | 1.447 | 3.737 | 0.118 | n/a | 1.295 | 9.004 | 4.301 | n/a | 0.080 | 12.627 | 0.387 | 0.080 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000011b | 32.593 | 4.534 | 0.353 | 0.321 | 0.103 | 1.956 | 7.046 | 0.039 | n/a | 0.425 | 12.177 | 5.594 | n/a | 0.044 | 5.311 | 0.163 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000113 | 32.550 | 3.721 | 0.290 | 0.255 | 0.138 | 1.151 | 11.932 | 0.033 | n/a | 0.085 | 9.631 | 5.267 | n/a | 0.047 | 4.404 | 0.135 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000000ff | 32.145 | 6.107 | n/a | 2.064 | 0.836 | 1.609 | 3.786 | 0.062 | n/a | 0.791 | 12.532 | 4.323 | n/a | 0.035 | 9.007 | 0.280 | 0.035 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000103 | 31.583 | 5.374 | 0.261 | 0.000 | 0.057 | 1.751 | 11.713 | 0.040 | n/a | 0.342 | 8.345 | 3.675 | n/a | 0.024 | 5.693 | 0.180 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000010b | 30.423 | 4.500 | 0.328 | 0.453 | 0.054 | 1.570 | 14.440 | 0.031 | n/a | 3.609 | 4.835 | 0.577 | n/a | 0.025 | 5.336 | 0.175 | 0.025 | gw-w/thread-43/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f000000000000011d | 30.410 | 3.615 | n/a | 0.000 | 0.713 | 1.766 | 5.712 | 0.151 | n/a | 0.358 | 9.796 | 8.262 | n/a | 0.037 | 4.328 | 0.142 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000111 | 29.006 | 2.493 | n/a | 0.000 | 0.374 | 0.718 | 3.778 | 0.024 | n/a | 0.088 | 12.366 | 9.136 | n/a | 0.029 | 2.867 | 0.099 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.069 | 1.000 | 0.000 | 0.878 | 3.451 | n/a | 0.000 | 0.534 | 0.967 | 3.069 | 0.024 | n/a | 0.298 | 7.384 | 1.257 | n/a | 0.037 | 4.328 | 0.258 | 0.037 |
| p99 | 42.348 | 2.191 | 0.000 | 2.334 | 4.963 | n/a | 1.841 | 0.922 | 2.087 | 26.316 | 0.151 | n/a | 1.488 | 13.673 | 9.136 | n/a | 0.070 | 6.789 | 0.318 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f000000000000010f | 42.348 | 3.451 | n/a | 1.841 | 0.550 | 0.967 | 26.316 | 0.090 | n/a | 1.488 | 6.363 | 1.257 | n/a | 0.025 | 5.842 | 0.138 | 0.025 | gw-w/thread-46/gateway.request-parse | none observed |
| c5e7bd39fcaf8a8f000000000000011d | 30.410 | 3.615 | n/a | 0.000 | 0.713 | 1.766 | 5.712 | 0.151 | n/a | 0.358 | 9.796 | 8.262 | n/a | 0.037 | 4.328 | 0.142 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000111 | 29.006 | 2.493 | n/a | 0.000 | 0.374 | 0.718 | 3.778 | 0.024 | n/a | 0.088 | 12.366 | 9.136 | n/a | 0.029 | 2.867 | 0.099 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000000f7 | 26.309 | 4.963 | n/a | 1.706 | 0.121 | 0.850 | 3.172 | 0.021 | n/a | 0.467 | 10.118 | 4.823 | n/a | 0.070 | 6.789 | 0.258 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000000f3 | 25.069 | 4.641 | n/a | 1.346 | 0.534 | 0.944 | 1.721 | 0.020 | n/a | 0.427 | 13.673 | 1.717 | n/a | 0.046 | 6.521 | 0.260 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000119 | 14.649 | 4.156 | n/a | 0.000 | 0.501 | 0.799 | 1.109 | 0.030 | n/a | 0.080 | 7.384 | 0.534 | n/a | 0.057 | 4.657 | 0.318 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000121 | 14.396 | 3.082 | n/a | 0.000 | 0.800 | 2.087 | 1.302 | 0.022 | n/a | 0.298 | 6.184 | 0.588 | n/a | 0.035 | 3.881 | 0.270 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000124 | 13.909 | 3.167 | n/a | 0.000 | 0.365 | 1.461 | 1.246 | 0.018 | n/a | 0.096 | 6.478 | 1.026 | n/a | 0.051 | 3.533 | 0.254 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000000fc | 12.983 | 2.629 | n/a | 0.000 | 0.922 | 1.139 | 3.069 | 0.024 | n/a | 0.127 | 4.508 | 0.532 | n/a | 0.033 | 3.552 | 0.274 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.136 | 0.092 | 0.053 | 0.401 | 3.854 | 0.187 | 0.321 | 0.061 | 3.811 | 15.388 | 0.055 | n/a | 0.394 | 9.410 | 3.624 | n/a | 0.032 | 4.423 | 0.119 | 0.032 |
| p99 | 37.136 | 0.092 | 0.053 | 0.401 | 3.854 | 0.187 | 0.321 | 0.061 | 3.811 | 15.388 | 0.055 | n/a | 0.394 | 9.410 | 3.624 | n/a | 0.032 | 4.423 | 0.119 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000000127 | 37.136 | 3.854 | 0.187 | 0.321 | 0.061 | 3.811 | 15.388 | 0.055 | n/a | 0.394 | 9.410 | 3.624 | n/a | 0.032 | 4.423 | 0.119 | 0.032 | gw-w/thread-40/gateway.admitted-work | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.876 | 0.383 | 0.000 | 0.579 | 3.604 | n/a | 0.000 | 0.219 | 1.328 | 5.760 | 0.031 | n/a | 0.321 | 8.392 | 4.157 | n/a | 0.032 | 4.187 | 0.169 | 0.032 |
| p99 | 97.328 | 3.870 | 0.000 | 3.118 | 6.656 | n/a | 2.846 | 1.349 | 4.504 | 26.609 | 0.163 | n/a | 6.925 | 59.806 | 35.628 | n/a | 0.113 | 9.561 | 0.353 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000000139 | 97.328 | 6.656 | n/a | 1.860 | 1.045 | 2.136 | 7.985 | 0.022 | n/a | 0.074 | 59.806 | 17.719 | n/a | 0.024 | 9.561 | 0.098 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000015b | 64.256 | 2.195 | n/a | 0.000 | 0.253 | 2.189 | 1.674 | 0.152 | n/a | 6.925 | 15.229 | 35.628 | n/a | 0.010 | 2.448 | 0.038 | 0.010 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 1.472ms |
| c5e7bd39fcaf8a8f000000000000015a | 61.822 | 4.244 | 0.306 | 0.311 | 0.055 | 1.638 | 7.341 | 0.052 | n/a | 4.913 | 38.475 | 4.454 | n/a | 0.035 | 4.915 | 0.080 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.472ms |
| c5e7bd39fcaf8a8f000000000000013f | 51.479 | 4.026 | 0.456 | 0.000 | 0.065 | 1.857 | 26.609 | 0.035 | n/a | 0.131 | 12.139 | 6.118 | n/a | 0.043 | 4.547 | 0.088 | 0.043 | gw-w/thread-40/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000147 | 44.619 | 6.375 | 0.236 | 0.000 | 0.207 | 1.490 | 17.860 | 0.034 | n/a | 3.369 | 8.392 | 6.542 | n/a | 0.113 | 6.819 | 0.153 | 0.113 | gw-w/thread-47/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000143 | 40.596 | 3.455 | 0.238 | 0.419 | 0.045 | 1.259 | 8.517 | 0.028 | n/a | 0.349 | 20.344 | 5.922 | n/a | 0.021 | 4.158 | 0.102 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000013b | 39.896 | 3.083 | 0.163 | 0.000 | 0.067 | 1.495 | 14.316 | 0.037 | n/a | 0.088 | 13.219 | 7.394 | n/a | 0.034 | 3.313 | 0.083 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000135 | 35.668 | 4.843 | 0.218 | 0.000 | 0.109 | 1.656 | 5.802 | 0.027 | n/a | 0.389 | 10.014 | 12.559 | n/a | 0.051 | 5.170 | 0.145 | 0.051 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f000000000000013d | 34.222 | 4.480 | 0.472 | 0.406 | 0.068 | 2.403 | 12.537 | 0.035 | n/a | 0.551 | 7.563 | 5.667 | n/a | 0.041 | 5.426 | 0.159 | 0.041 | gw-w/thread-46/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000165 | 33.577 | 3.472 | 0.201 | 0.440 | 0.073 | 2.217 | 14.909 | 0.086 | n/a | 0.187 | 7.514 | 4.442 | n/a | 0.034 | 4.187 | 0.125 | 0.034 | gw-w/thread-45/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000149 | 33.327 | 3.416 | n/a | 0.000 | 0.567 | 1.334 | 10.649 | 0.087 | n/a | 1.049 | 11.046 | 5.143 | n/a | 0.036 | 3.983 | 0.120 | 0.036 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000012b | 33.132 | 4.095 | 0.199 | 0.425 | 0.071 | 2.020 | 9.096 | 0.035 | n/a | 0.433 | 7.718 | 9.000 | n/a | 0.040 | 4.790 | 0.145 | 0.040 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f0000000000000169 | 32.737 | 5.677 | 0.185 | 0.000 | 0.109 | 2.373 | 13.134 | 0.066 | n/a | 0.132 | 8.451 | 2.572 | n/a | 0.038 | 5.970 | 0.182 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000131 | 32.634 | 3.280 | 0.174 | 0.000 | 0.065 | 1.134 | 9.896 | 0.028 | n/a | 0.081 | 13.327 | 4.624 | n/a | 0.024 | 3.519 | 0.108 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.998ms |
| c5e7bd39fcaf8a8f0000000000000129 | 32.404 | 3.721 | 0.218 | 0.000 | 0.049 | 1.132 | 12.842 | 0.031 | n/a | 0.074 | 6.614 | 7.693 | n/a | 0.031 | 3.988 | 0.123 | 0.031 | gw-w/thread-42/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f000000000000016d | 32.359 | 4.141 | 0.343 | 0.461 | 0.139 | 1.328 | 10.949 | 0.031 | n/a | 2.217 | 9.301 | 3.409 | n/a | 0.042 | 5.084 | 0.157 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000012e | 31.573 | 3.318 | n/a | 1.569 | 0.760 | 1.208 | 4.837 | 0.049 | n/a | 0.147 | 17.579 | 2.078 | n/a | 0.028 | 5.646 | 0.179 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000159 | 31.303 | 3.102 | n/a | 0.000 | 0.656 | 3.898 | 1.284 | 0.022 | n/a | 3.170 | 14.974 | 4.157 | n/a | 0.039 | 3.759 | 0.120 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000137 | 27.305 | 3.873 | 0.396 | 0.329 | 0.064 | 1.692 | 1.995 | 0.029 | n/a | 0.321 | 14.400 | 4.174 | n/a | 0.032 | 4.662 | 0.171 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000014b | 25.148 | 4.422 | 0.402 | 0.391 | 0.075 | 2.260 | 8.055 | 0.033 | n/a | 0.432 | 5.396 | 3.645 | n/a | 0.037 | 5.291 | 0.210 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.212 | 0.378 | 0.000 | 0.453 | 2.681 | n/a | 0.000 | 0.988 | 1.050 | 1.415 | 0.022 | n/a | 0.179 | 7.548 | 0.715 | n/a | 0.027 | 3.759 | 0.215 | 0.027 |
| p99 | 31.303 | 1.001 | 0.000 | 0.874 | 5.822 | n/a | 0.000 | 1.349 | 4.504 | 3.861 | 0.046 | n/a | 3.170 | 14.974 | 7.201 | n/a | 0.071 | 6.099 | 0.353 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000000159 | 31.303 | 3.102 | n/a | 0.000 | 0.656 | 3.898 | 1.284 | 0.022 | n/a | 3.170 | 14.974 | 4.157 | n/a | 0.039 | 3.759 | 0.120 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000145 | 22.089 | 2.921 | n/a | 0.000 | 0.988 | 0.764 | 1.415 | 0.021 | n/a | 0.108 | 8.651 | 7.201 | n/a | 0.021 | 3.909 | 0.177 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000130 | 20.512 | 2.469 | n/a | 0.000 | 1.093 | 0.933 | 2.334 | 0.039 | n/a | 0.179 | 10.033 | 3.399 | n/a | 0.032 | 3.562 | 0.174 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000134 | 17.494 | 5.822 | n/a | 0.000 | 0.276 | 4.504 | 3.861 | 0.046 | n/a | 0.604 | 1.864 | 0.489 | n/a | 0.027 | 6.099 | 0.349 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| c5e7bd39fcaf8a8f000000000000016b | 17.212 | 2.681 | n/a | 0.000 | 1.136 | 1.053 | 1.891 | 0.031 | n/a | 0.925 | 8.658 | 0.792 | n/a | 0.045 | 3.816 | 0.222 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000015d | 13.185 | 1.599 | n/a | 0.000 | 1.235 | 1.050 | 0.935 | 0.021 | n/a | 0.066 | 7.548 | 0.715 | n/a | 0.017 | 2.833 | 0.215 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.846ms |
| c5e7bd39fcaf8a8f000000000000014f | 12.603 | 3.748 | n/a | 0.000 | 0.706 | 1.130 | 1.232 | 0.026 | n/a | 0.164 | 4.888 | 0.639 | n/a | 0.071 | 4.454 | 0.353 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000175 | 11.566 | 1.680 | n/a | 0.000 | 1.349 | 0.644 | 1.489 | 0.020 | n/a | 0.299 | 5.569 | 0.499 | n/a | 0.018 | 3.029 | 0.262 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.961ms; driver.expected-state.bind-receipt 0.026ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.721 | 0.000 | 0.000 | 0.465 | 3.339 | 0.306 | 0.000 | 0.178 | 1.234 | 5.084 | 0.034 | n/a | 0.361 | 7.478 | 4.035 | n/a | 0.035 | 3.914 | 0.167 | 0.035 |
| p99 | 73.484 | 3.241 | 0.005 | 3.218 | 8.072 | n/a | 1.680 | 0.989 | 4.737 | 35.099 | 3.727 | n/a | 0.810 | 60.834 | 10.580 | n/a | 0.088 | 10.318 | 0.299 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f00000000000001b9 | 73.484 | 3.966 | n/a | 0.000 | 0.185 | 0.733 | 3.797 | 0.022 | n/a | 0.141 | 60.834 | 3.752 | n/a | 0.054 | 4.151 | 0.056 | 0.054 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001bb | 57.363 | 4.625 | 0.174 | 0.449 | 0.076 | 1.644 | 34.926 | 0.033 | n/a | 0.112 | 9.516 | 5.765 | n/a | 0.042 | 5.324 | 0.093 | 0.042 | gw-w/thread-42/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f000000000000019a | 51.275 | 3.481 | 0.184 | 0.000 | 0.054 | 1.590 | 35.099 | 0.039 | n/a | 0.185 | 6.573 | 4.035 | n/a | 0.035 | 3.719 | 0.073 | 0.035 | gw-w/thread-44/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f000000000000018c | 38.740 | 5.453 | 0.217 | 0.000 | 0.186 | 2.117 | 15.420 | 0.310 | n/a | 0.107 | 9.145 | 5.728 | n/a | 0.058 | 5.855 | 0.151 | 0.058 | gw-w/thread-47/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000001ac | 37.507 | 3.176 | 0.175 | 0.277 | 0.075 | 1.272 | 19.359 | 0.036 | n/a | 0.472 | 5.972 | 6.657 | n/a | 0.035 | 3.702 | 0.099 | 0.035 | gw-w/thread-47/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000001b5 | 36.634 | 8.072 | n/a | 1.680 | 0.566 | 4.737 | 3.140 | 0.047 | n/a | 0.658 | 8.355 | 9.330 | n/a | 0.049 | 10.318 | 0.282 | 0.049 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f00000000000001b7 | 36.052 | 5.389 | 0.142 | 0.000 | 0.044 | 1.234 | 7.742 | 3.727 | n/a | 0.085 | 14.367 | 3.299 | n/a | 0.023 | 5.575 | 0.155 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000019e | 35.906 | 3.512 | 0.300 | 0.308 | 0.047 | 3.885 | 10.630 | 0.050 | n/a | 0.202 | 7.972 | 8.976 | n/a | 0.023 | 4.168 | 0.116 | 0.023 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f0000000000000184 | 35.797 | 3.269 | 0.176 | 0.000 | 0.069 | 1.229 | 10.662 | 0.034 | n/a | 0.431 | 9.322 | 10.580 | n/a | 0.025 | 3.513 | 0.098 | 0.025 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f0000000000000181 | 35.107 | 3.053 | 0.171 | 0.000 | 0.039 | 3.541 | 13.175 | 0.030 | n/a | 0.371 | 7.827 | 6.881 | n/a | 0.019 | 3.264 | 0.093 | 0.019 | gw-w/thread-45/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000001a6 | 34.286 | 3.339 | 0.211 | 0.268 | 0.069 | 1.736 | 17.885 | 0.033 | n/a | 0.489 | 7.054 | 3.161 | n/a | 0.040 | 3.887 | 0.113 | 0.040 | gw-w/thread-47/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000001c9 | 32.228 | 3.891 | 0.177 | 0.000 | 0.146 | 1.654 | 6.559 | 0.037 | n/a | 0.144 | 10.128 | 9.459 | n/a | 0.033 | 4.214 | 0.131 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001b1 | 28.622 | 3.219 | 0.258 | 0.324 | 0.113 | 1.406 | 12.269 | 0.038 | n/a | 0.458 | 4.749 | 5.743 | n/a | 0.045 | 3.914 | 0.137 | 0.045 | gw-w/thread-44/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f000000000000018e | 27.966 | 4.065 | 0.234 | 0.000 | 0.081 | 1.639 | 8.761 | 0.036 | n/a | 0.094 | 9.633 | 3.385 | n/a | 0.038 | 4.380 | 0.157 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000017d | 27.348 | 4.656 | 0.210 | 0.000 | 0.159 | 1.787 | 10.098 | 0.095 | n/a | 0.143 | 6.294 | 3.855 | n/a | 0.051 | 5.025 | 0.184 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000194 | 26.984 | 6.771 | 0.246 | 0.000 | 0.084 | 1.078 | 5.724 | 0.039 | n/a | 0.364 | 9.104 | 3.533 | n/a | 0.040 | 7.101 | 0.263 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001b3 | 26.423 | 3.856 | 0.224 | 0.381 | 0.178 | 1.579 | 10.280 | 0.109 | n/a | 0.417 | 5.759 | 3.563 | n/a | 0.076 | 4.639 | 0.176 | 0.076 | gw-w/thread-40/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000186 | 26.283 | 2.894 | n/a | 0.000 | 0.236 | 0.649 | 2.192 | 0.021 | n/a | 0.411 | 10.649 | 9.211 | n/a | 0.021 | 3.130 | 0.119 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000198 | 26.220 | 3.507 | 0.229 | 0.000 | 0.184 | 1.281 | 5.910 | 0.034 | n/a | 0.084 | 7.713 | 7.189 | n/a | 0.088 | 3.920 | 0.150 | 0.088 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000019c | 24.721 | 4.744 | n/a | 0.000 | 0.372 | 1.355 | 3.309 | 0.028 | n/a | 0.255 | 7.755 | 6.859 | n/a | 0.044 | 5.116 | 0.207 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.056 | 0.000 | 0.000 | 0.475 | 2.622 | n/a | 0.000 | 0.313 | 0.814 | 1.266 | 0.023 | n/a | 0.361 | 5.701 | 2.628 | n/a | 0.031 | 2.935 | 0.174 | 0.031 |
| p99 | 22.529 | 0.998 | 0.000 | 0.790 | 3.525 | n/a | 0.000 | 0.989 | 1.930 | 5.084 | 0.041 | n/a | 0.785 | 9.505 | 10.522 | n/a | 0.068 | 4.449 | 0.299 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f000000000000018a | 22.529 | 2.323 | n/a | 0.000 | 0.544 | 0.643 | 2.141 | 0.036 | n/a | 0.361 | 9.505 | 6.953 | n/a | 0.023 | 2.867 | 0.127 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000017b | 20.908 | 2.218 | n/a | 0.000 | 0.208 | 0.814 | 1.266 | 0.023 | n/a | 0.123 | 5.701 | 10.522 | n/a | 0.031 | 2.427 | 0.116 | 0.031 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f000000000000017f | 19.364 | 2.167 | n/a | 0.000 | 0.555 | 0.845 | 4.189 | 0.030 | n/a | 0.381 | 7.101 | 4.053 | n/a | 0.042 | 2.723 | 0.141 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001a4 | 19.077 | 2.622 | n/a | 0.000 | 0.313 | 1.930 | 5.084 | 0.026 | n/a | 0.099 | 7.857 | 1.116 | n/a | 0.030 | 2.935 | 0.154 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001c4 | 17.913 | 3.525 | n/a | 0.000 | 0.924 | 1.016 | 1.137 | 0.023 | n/a | 0.118 | 6.040 | 5.064 | n/a | 0.066 | 4.449 | 0.248 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001ae | 17.056 | 2.973 | n/a | 0.000 | 0.989 | 0.814 | 1.650 | 0.022 | n/a | 0.785 | 7.166 | 2.628 | n/a | 0.030 | 3.961 | 0.232 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000192 | 13.826 | 2.651 | n/a | 0.000 | 0.641 | 1.060 | 1.836 | 0.041 | n/a | 0.675 | 3.530 | 3.361 | n/a | 0.031 | 3.293 | 0.238 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000190 | 11.603 | 3.297 | n/a | 0.000 | 0.167 | 0.858 | 1.202 | 0.023 | n/a | 0.506 | 4.942 | 0.540 | n/a | 0.068 | 3.464 | 0.299 | 0.068 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001c7 | 10.520 | 2.810 | n/a | 0.000 | 0.183 | 0.608 | 1.141 | 0.023 | n/a | 0.127 | 4.745 | 0.832 | n/a | 0.051 | 2.993 | 0.285 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001bc | 9.106 | 1.516 | n/a | 0.000 | 0.071 | 0.505 | 1.031 | 0.019 | n/a | 0.404 | 3.281 | 2.255 | n/a | 0.024 | 1.587 | 0.174 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.507 | n/a | n/a | n/a | 33.752 | 2.410 | 2.374 | 0.000 | 20.254 | 2.687 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.007 | 60.654 | 0.704 | 0.007 |
| p99 | 240.018 | n/a | n/a | n/a | 92.980 | 192.887 | 12.130 | 0.000 | 149.949 | 37.191 | 18.460 | n/a | 0.025 | 0.000 | n/a | n/a | 0.016 | 220.781 | 1.000 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000000fd5 | 240.018 | 17.297 | 52.697 | 0.000 | 0.000 | 149.949 | 1.598 | 18.460 | n/a | 0.009 | 0.000 | n/a | n/a | 0.007 | 69.994 | 0.292 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.496ms; driver.expected-state.bind-receipt 1.252ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.155ms; driver.publication.persist-deferred 1.143ms |
| c5e7bd39fcaf8a8f0000000000000fdb | 226.694 | 26.085 | 192.887 | 1.808 | 0.000 | 4.535 | 1.354 | 0.006 | n/a | 0.010 | 0.000 | n/a | n/a | 0.008 | 220.781 | 0.974 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.496ms; driver.expected-state.bind-receipt 1.252ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.155ms; driver.publication.persist-deferred 1.143ms |
| c5e7bd39fcaf8a8f0000000000000fdc | 202.989 | 15.638 | 110.128 | 0.000 | 0.000 | 74.764 | 2.428 | 0.007 | n/a | 0.015 | 0.000 | n/a | n/a | 0.008 | 125.766 | 0.620 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.496ms; driver.expected-state.bind-receipt 1.252ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.155ms; driver.publication.persist-deferred 1.143ms |
| c5e7bd39fcaf8a8f000000000000155a | 179.384 | 30.876 | 52.359 | 0.897 | 0.000 | 91.073 | 1.357 | 2.813 | n/a | 0.002 | 0.000 | n/a | n/a | 0.005 | 84.133 | 0.469 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.778ms; driver.publication.persist-deferred 1.041ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.916ms |
| c5e7bd39fcaf8a8f0000000000001558 | 177.713 | 29.744 | 70.659 | 4.380 | 0.000 | 68.351 | 4.562 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.004 | 104.783 | 0.590 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.041ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.916ms; driver.publication.persist-deferred 0.904ms |
| c5e7bd39fcaf8a8f0000000000000fde | 172.873 | 74.294 | 34.044 | 10.291 | 0.000 | 36.187 | 18.039 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.009 | 118.630 | 0.686 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.252ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.155ms; driver.publication.persist-deferred 1.143ms; driver.publication.persist-deferred 1.048ms |
| c5e7bd39fcaf8a8f0000000000001552 | 172.072 | 32.159 | 0.278 | 9.099 | 0.000 | 117.232 | 13.285 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.008 | 41.536 | 0.241 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.339ms; driver.publication.persist-deferred 1.041ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.916ms |
| c5e7bd39fcaf8a8f0000000000000fd6 | 161.656 | 28.608 | 80.415 | 0.000 | 0.000 | 46.334 | 6.277 | 0.005 | n/a | 0.013 | 0.000 | n/a | n/a | 0.004 | 109.023 | 0.674 | 0.004 | node-14/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 1.496ms; driver.expected-state.bind-receipt 1.252ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.143ms; driver.publication.persist-deferred 1.048ms |
| c5e7bd39fcaf8a8f0000000000000fd8 | 141.052 | 29.174 | 93.086 | 1.378 | 0.000 | 16.530 | 0.870 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.005 | 123.637 | 0.877 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.496ms; driver.expected-state.bind-receipt 1.252ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.143ms; driver.publication.persist-deferred 1.048ms |
| c5e7bd39fcaf8a8f0000000000001555 | 137.411 | 47.071 | 3.340 | 2.733 | 0.000 | 70.067 | 2.687 | 11.507 | n/a | 0.002 | 0.000 | n/a | n/a | 0.004 | 53.144 | 0.387 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.339ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.916ms; driver.publication.persist-deferred 0.904ms; driver.publication.persist-deferred 0.860ms |
| c5e7bd39fcaf8a8f0000000000000fcc | 131.430 | 35.440 | 88.137 | 1.555 | 0.000 | 0.941 | 5.337 | 0.001 | n/a | 0.006 | 0.000 | n/a | n/a | 0.012 | 125.133 | 0.952 | 0.012 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 1.516ms; driver.expected-state.bind-receipt 1.496ms; driver.publication.persist-deferred 1.211ms; driver.publication.persist-deferred 1.034ms; driver.publication.persist-deferred 1.006ms |
| c5e7bd39fcaf8a8f0000000000000fd7 | 124.177 | 25.643 | 55.138 | 2.009 | 0.000 | 40.171 | 1.207 | 0.002 | n/a | 0.004 | 0.000 | n/a | n/a | 0.003 | 82.790 | 0.667 | 0.003 | node-14/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 1.496ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.006ms; driver.publication.persist-deferred 0.971ms; driver.publication.persist-deferred 0.913ms |
| c5e7bd39fcaf8a8f0000000000001bb5 | 121.654 | 92.980 | 0.431 | 11.990 | 0.000 | 7.111 | 9.115 | 0.001 | n/a | 0.018 | 0.000 | n/a | n/a | 0.008 | 105.402 | 0.866 | 0.008 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.040ms; driver.publication.persist-deferred 1.024ms; driver.publication.persist-deferred 0.887ms; driver.publication.persist-deferred 0.857ms; driver.publication.persist-deferred 0.799ms |
| c5e7bd39fcaf8a8f0000000000000fd4 | 118.067 | 24.916 | 60.612 | 1.896 | 0.000 | 25.508 | 3.122 | 2.004 | n/a | 0.003 | 0.000 | n/a | n/a | 0.005 | 87.424 | 0.740 | 0.005 | node-14/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 1.496ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.034ms; driver.publication.persist-deferred 1.006ms; driver.publication.persist-deferred 0.971ms |
| c5e7bd39fcaf8a8f0000000000000fca | 116.062 | 17.392 | 98.659 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 116.051 | 1.000 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 1.516ms; driver.expected-state.bind-receipt 1.496ms; driver.publication.persist-deferred 1.211ms; driver.publication.persist-deferred 1.100ms; driver.publication.persist-deferred 1.034ms |
| c5e7bd39fcaf8a8f0000000000001987 | 114.866 | 70.594 | 0.331 | 12.130 | 0.000 | 28.012 | 3.779 | 0.001 | n/a | 0.014 | 0.000 | n/a | n/a | 0.005 | 83.054 | 0.723 | 0.005 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.012ms; driver.publication.persist-deferred 0.995ms; driver.publication.persist-deferred 0.853ms; driver.publication.persist-deferred 0.834ms; driver.publication.persist-deferred 0.635ms |
| c5e7bd39fcaf8a8f0000000000000a1f | 105.788 | 55.332 | 2.278 | 3.305 | 0.000 | 41.194 | 1.866 | 1.797 | n/a | 0.010 | 0.000 | n/a | n/a | 0.006 | 60.915 | 0.576 | 0.006 | node-14/thread-3/socket.body-read | driver.publication.persist-deferred 1.213ms; driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 0.983ms; driver.publication.persist-deferred 0.662ms |
| c5e7bd39fcaf8a8f0000000000001551 | 105.064 | 36.272 | 0.291 | 1.240 | 0.000 | 61.448 | 2.781 | 3.017 | n/a | 0.009 | 0.000 | n/a | n/a | 0.008 | 37.802 | 0.360 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.339ms; driver.publication.persist-deferred 0.978ms; driver.publication.persist-deferred 0.916ms; driver.publication.persist-deferred 0.904ms; driver.publication.persist-deferred 0.860ms |
| c5e7bd39fcaf8a8f0000000000000fe9 | 100.558 | 24.577 | 53.902 | 0.000 | 0.000 | 20.254 | 1.043 | 0.766 | n/a | 0.005 | 0.000 | n/a | n/a | 0.010 | 78.479 | 0.780 | 0.010 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.252ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 1.143ms; driver.publication.persist-deferred 1.048ms; driver.publication.persist-deferred 1.006ms |
| c5e7bd39fcaf8a8f0000000000000fcf | 91.217 | 15.573 | 74.177 | 0.000 | 0.000 | 1.124 | 0.333 | 0.002 | n/a | 0.002 | 0.000 | n/a | n/a | 0.006 | 89.750 | 0.984 | 0.006 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 1.516ms; driver.expected-state.bind-receipt 1.496ms; driver.publication.persist-deferred 1.034ms; driver.publication.persist-deferred 0.971ms; driver.publication.persist-deferred 0.913ms |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.580 | 0.000 | 0.000 | 0.432 | 3.162 | n/a | 0.000 | 0.137 | 1.328 | 2.390 | 0.036 | n/a | 0.175 | 7.340 | 3.565 | n/a | 0.035 | 3.628 | 0.167 | 0.035 |
| p99 | 70.494 | 2.002 | 0.000 | 1.408 | 12.934 | n/a | 0.428 | 1.066 | 6.751 | 24.467 | 0.106 | n/a | 3.332 | 15.395 | 44.656 | n/a | 0.102 | 13.648 | 0.311 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f000000000000020a | 70.494 | 3.396 | 0.231 | 0.257 | 0.121 | 1.797 | 12.320 | 0.053 | n/a | 0.176 | 7.384 | 44.656 | n/a | 0.102 | 4.006 | 0.057 | 0.102 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f0000000000000210 | 46.461 | 3.760 | 0.187 | 0.233 | 0.068 | 2.200 | 24.467 | 0.073 | n/a | 0.222 | 9.708 | 5.505 | n/a | 0.037 | 4.248 | 0.091 | 0.037 | gw-w/thread-47/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000001ef | 45.659 | 12.934 | n/a | 0.000 | 0.714 | 3.972 | 15.066 | 0.106 | n/a | 0.812 | 10.736 | 1.286 | n/a | 0.034 | 13.648 | 0.299 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001d5 | 40.121 | 4.801 | 0.261 | 0.000 | 0.050 | 2.020 | 12.848 | 0.043 | n/a | 2.338 | 7.148 | 10.582 | n/a | 0.029 | 5.112 | 0.127 | 0.029 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f000000000000021a | 31.818 | 3.649 | 0.202 | 0.428 | 0.080 | 6.751 | 10.727 | 0.099 | n/a | 0.834 | 5.615 | 3.393 | n/a | 0.040 | 4.359 | 0.137 | 0.040 | gw-w/thread-43/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000216 | 31.010 | 3.244 | 0.210 | 0.289 | 0.075 | 1.328 | 5.740 | 0.032 | n/a | 0.186 | 9.544 | 10.316 | n/a | 0.045 | 3.818 | 0.123 | 0.045 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f00000000000001dd | 29.923 | 4.125 | 0.170 | 0.000 | 0.038 | 1.494 | 10.717 | 0.045 | n/a | 0.175 | 8.957 | 4.181 | n/a | 0.021 | 4.333 | 0.145 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000202 | 29.889 | 3.978 | 0.357 | 0.262 | 0.061 | 1.962 | 11.153 | 0.050 | n/a | 0.198 | 8.015 | 3.823 | n/a | 0.031 | 4.657 | 0.156 | 0.031 | gw-w/thread-40/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000206 | 29.169 | 3.839 | 0.373 | 0.263 | 0.118 | 1.682 | 8.506 | 0.047 | n/a | 0.110 | 9.226 | 4.937 | n/a | 0.067 | 4.593 | 0.157 | 0.067 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001f1 | 27.241 | 3.628 | 0.371 | 0.351 | 0.064 | 2.208 | 10.797 | 0.052 | n/a | 0.433 | 4.754 | 4.554 | n/a | 0.029 | 4.415 | 0.162 | 0.029 | gw-w/thread-44/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000001ed | 25.823 | 3.486 | 0.234 | 0.000 | 0.056 | 1.696 | 8.684 | 0.042 | n/a | 0.105 | 7.346 | 4.140 | n/a | 0.033 | 3.776 | 0.146 | 0.033 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001e4 | 25.630 | 3.240 | n/a | 0.000 | 0.281 | 1.652 | 1.246 | 0.023 | n/a | 0.144 | 15.395 | 3.589 | n/a | 0.060 | 3.521 | 0.137 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001e1 | 25.487 | 3.081 | 0.272 | 0.000 | 0.137 | 1.677 | 12.632 | 0.032 | n/a | 0.087 | 6.356 | 1.148 | n/a | 0.065 | 3.491 | 0.137 | 0.065 | gw-w/thread-47/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000001f9 | 24.792 | 4.006 | 0.214 | 0.401 | 0.093 | 1.341 | 7.433 | 0.047 | n/a | 0.104 | 7.340 | 3.774 | n/a | 0.041 | 4.713 | 0.190 | 0.041 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001d8 | 23.828 | 3.403 | 0.307 | 0.286 | 0.051 | 1.499 | 5.634 | 0.029 | n/a | 0.401 | 8.312 | 3.880 | n/a | 0.029 | 4.046 | 0.170 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001d2 | 23.659 | 4.140 | n/a | 0.000 | 0.204 | 1.006 | 1.236 | 0.012 | n/a | 3.332 | 8.034 | 5.683 | n/a | 0.013 | 4.344 | 0.184 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.685ms |
| c5e7bd39fcaf8a8f000000000000020c | 22.842 | 3.162 | n/a | 0.000 | 0.313 | 1.112 | 2.000 | 0.054 | n/a | 0.189 | 14.904 | 1.047 | n/a | 0.061 | 3.475 | 0.152 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000021e | 22.687 | 3.294 | 0.271 | 0.248 | 0.201 | 1.288 | 6.283 | 0.053 | n/a | 0.771 | 6.442 | 3.759 | n/a | 0.078 | 4.013 | 0.177 | 0.078 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001de | 22.426 | 5.188 | n/a | 0.000 | 0.437 | 0.716 | 1.572 | 0.019 | n/a | 0.100 | 9.926 | 4.425 | n/a | 0.044 | 5.625 | 0.251 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001f7 | 21.800 | 3.179 | 0.153 | 0.212 | 0.036 | 0.896 | 4.946 | 0.027 | n/a | 0.389 | 7.287 | 4.642 | n/a | 0.032 | 3.580 | 0.164 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.741 | 0.000 | 0.000 | 0.455 | 2.133 | n/a | 0.000 | 0.695 | 0.834 | 1.620 | 0.025 | n/a | 0.152 | 7.100 | 3.271 | n/a | 0.035 | 2.826 | 0.166 | 0.035 |
| p99 | 25.630 | 1.001 | 0.000 | 0.741 | 3.240 | n/a | 0.000 | 1.066 | 4.250 | 2.178 | 0.057 | n/a | 1.097 | 15.395 | 8.314 | n/a | 0.065 | 3.521 | 0.299 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f00000000000001e4 | 25.630 | 3.240 | n/a | 0.000 | 0.281 | 1.652 | 1.246 | 0.023 | n/a | 0.144 | 15.395 | 3.589 | n/a | 0.060 | 3.521 | 0.137 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000020c | 22.842 | 3.162 | n/a | 0.000 | 0.313 | 1.112 | 2.000 | 0.054 | n/a | 0.189 | 14.904 | 1.047 | n/a | 0.061 | 3.475 | 0.152 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000212 | 21.580 | 1.835 | n/a | 0.000 | 1.048 | 0.457 | 1.787 | 0.031 | n/a | 0.152 | 7.935 | 8.314 | n/a | 0.021 | 2.883 | 0.134 | 0.021 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f00000000000001d1 | 20.155 | 1.698 | n/a | 0.000 | 0.817 | 4.250 | 1.108 | 0.022 | n/a | 0.414 | 8.159 | 3.660 | n/a | 0.027 | 2.515 | 0.125 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000207 | 19.522 | 2.095 | n/a | 0.000 | 0.629 | 0.668 | 1.620 | 0.025 | n/a | 0.095 | 13.198 | 1.164 | n/a | 0.028 | 2.724 | 0.140 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001cb | 18.687 | 1.759 | n/a | 0.000 | 0.695 | 1.016 | 1.942 | 0.051 | n/a | 0.640 | 8.989 | 3.565 | n/a | 0.031 | 2.454 | 0.131 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001e9 | 17.209 | 2.186 | n/a | 0.000 | 1.066 | 0.733 | 1.617 | 0.023 | n/a | 0.119 | 7.813 | 3.616 | n/a | 0.036 | 3.252 | 0.189 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001e2 | 16.741 | 2.133 | n/a | 0.000 | 1.040 | 0.738 | 1.826 | 0.021 | n/a | 0.083 | 6.934 | 3.927 | n/a | 0.040 | 3.173 | 0.190 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001cd | 16.153 | 1.999 | n/a | 0.000 | 0.704 | 1.017 | 1.984 | 0.057 | n/a | 0.289 | 7.100 | 2.968 | n/a | 0.035 | 2.702 | 0.167 | 0.035 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000204 | 15.762 | 2.684 | n/a | 0.000 | 0.142 | 1.812 | 1.547 | 0.025 | n/a | 0.106 | 5.854 | 3.563 | n/a | 0.030 | 2.826 | 0.179 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001da | 15.559 | 2.149 | n/a | 0.000 | 0.853 | 0.694 | 2.178 | 0.025 | n/a | 1.097 | 5.955 | 2.544 | n/a | 0.065 | 3.002 | 0.193 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001ff | 13.750 | 2.226 | n/a | 0.000 | 0.061 | 0.969 | 1.773 | 0.041 | n/a | 0.697 | 4.690 | 3.271 | n/a | 0.023 | 2.287 | 0.166 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001f5 | 11.625 | 1.771 | n/a | 0.000 | 0.060 | 0.487 | 1.403 | 0.021 | n/a | 0.107 | 5.622 | 2.133 | n/a | 0.021 | 1.830 | 0.157 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000001e7 | 11.271 | 3.023 | n/a | 0.000 | 0.253 | 0.834 | 1.395 | 0.027 | n/a | 0.121 | 5.065 | 0.504 | n/a | 0.049 | 3.276 | 0.291 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000021c | 9.372 | 1.878 | n/a | 0.000 | 0.926 | 0.632 | 1.055 | 0.027 | n/a | 0.314 | 3.962 | 0.543 | n/a | 0.035 | 2.803 | 0.299 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.593 | 0.205 | 0.000 | 0.555 | 3.220 | n/a | 0.000 | 0.190 | 1.111 | 3.906 | 0.023 | n/a | 0.269 | 6.400 | 3.233 | n/a | 0.027 | 3.858 | 0.194 | 0.027 |
| p99 | 59.498 | 2.012 | 0.049 | 1.781 | 7.194 | n/a | 0.513 | 1.290 | 5.172 | 20.865 | 0.091 | n/a | 3.558 | 15.751 | 34.362 | n/a | 0.095 | 8.153 | 0.419 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000000252 | 59.498 | 5.588 | 0.199 | 0.312 | 0.124 | 1.468 | 5.395 | 0.044 | n/a | 0.226 | 11.728 | 34.362 | n/a | 0.054 | 6.223 | 0.105 | 0.054 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f0000000000000242 | 49.728 | 3.053 | 0.182 | 0.368 | 0.106 | 1.268 | 19.257 | 0.022 | n/a | 0.393 | 12.109 | 12.926 | n/a | 0.043 | 3.710 | 0.075 | 0.043 | gw-w/thread-47/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000232 | 40.152 | 3.704 | 0.184 | 0.305 | 0.078 | 2.096 | 17.073 | 0.050 | n/a | 0.151 | 9.081 | 7.400 | n/a | 0.030 | 4.271 | 0.106 | 0.030 | gw-w/thread-44/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000244 | 39.213 | 6.091 | 0.249 | 0.513 | 0.073 | 1.668 | 9.067 | 0.045 | n/a | 1.211 | 13.970 | 6.286 | n/a | 0.039 | 6.926 | 0.177 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000246 | 39.150 | 4.118 | 0.182 | 0.236 | 0.084 | 2.080 | 20.865 | 0.029 | n/a | 0.482 | 8.051 | 2.987 | n/a | 0.037 | 4.620 | 0.118 | 0.037 | gw-w/thread-42/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f000000000000025c | 37.986 | 3.599 | 0.341 | 0.323 | 0.073 | 1.637 | 5.876 | 0.028 | n/a | 0.377 | 12.549 | 13.151 | n/a | 0.033 | 4.336 | 0.114 | 0.033 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f000000000000026f | 35.982 | 4.416 | 0.240 | 0.420 | 0.052 | 4.809 | 10.266 | 0.047 | n/a | 0.277 | 8.124 | 7.308 | n/a | 0.023 | 5.128 | 0.143 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000022b | 33.382 | 3.572 | 0.186 | 0.231 | 0.075 | 1.111 | 11.659 | 0.022 | n/a | 0.406 | 9.466 | 6.626 | n/a | 0.028 | 4.063 | 0.122 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000220 | 32.506 | 7.194 | 0.360 | 0.263 | 0.073 | 1.852 | 5.979 | 0.035 | n/a | 0.113 | 9.214 | 7.390 | n/a | 0.032 | 7.891 | 0.243 | 0.032 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000023e | 32.391 | 3.417 | 0.166 | 0.358 | 0.050 | 1.331 | 17.156 | 0.029 | n/a | 0.405 | 6.225 | 3.233 | n/a | 0.022 | 3.990 | 0.123 | 0.022 | gw-w/thread-44/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000249 | 31.498 | 2.083 | n/a | 0.000 | 0.762 | 5.172 | 0.827 | 0.008 | n/a | 0.020 | 15.751 | 6.866 | n/a | 0.010 | 2.845 | 0.090 | 0.010 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.270ms |
| c5e7bd39fcaf8a8f0000000000000281 | 30.762 | 2.937 | 0.184 | 0.286 | 0.037 | 1.063 | 8.954 | 0.025 | n/a | 0.071 | 10.584 | 6.603 | n/a | 0.018 | 3.444 | 0.112 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000277 | 30.320 | 4.012 | 0.249 | 0.228 | 0.068 | 1.679 | 14.662 | 0.035 | n/a | 0.137 | 5.497 | 3.720 | n/a | 0.032 | 4.557 | 0.150 | 0.032 | gw-w/thread-44/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f000000000000024e | 26.994 | 4.482 | 0.274 | 0.429 | 0.036 | 1.611 | 5.916 | 0.091 | n/a | 0.940 | 6.286 | 6.909 | n/a | 0.020 | 5.221 | 0.193 | 0.020 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f000000000000025a | 26.707 | 5.075 | n/a | 0.000 | 0.116 | 0.820 | 5.644 | 0.023 | n/a | 0.130 | 10.354 | 4.513 | n/a | 0.031 | 5.191 | 0.194 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000230 | 26.605 | 2.938 | n/a | 0.000 | 0.275 | 0.666 | 3.906 | 0.020 | n/a | 0.461 | 8.323 | 9.993 | n/a | 0.023 | 3.213 | 0.121 | 0.023 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f0000000000000238 | 26.271 | 5.906 | n/a | 0.000 | 0.747 | 0.951 | 1.984 | 0.026 | n/a | 1.654 | 13.339 | 1.570 | n/a | 0.095 | 6.653 | 0.253 | 0.095 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000227 | 25.811 | 3.918 | n/a | 0.000 | 0.499 | 2.690 | 4.917 | 0.022 | n/a | 0.080 | 9.964 | 3.695 | n/a | 0.028 | 4.416 | 0.171 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000269 | 25.594 | 4.860 | 0.272 | 0.481 | 0.081 | 1.738 | 4.257 | 0.029 | n/a | 0.118 | 8.066 | 5.655 | n/a | 0.038 | 5.694 | 0.222 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000258 | 25.346 | 3.484 | 0.233 | 0.265 | 0.190 | 1.474 | 11.212 | 0.030 | n/a | 0.144 | 4.403 | 3.832 | n/a | 0.078 | 4.173 | 0.165 | 0.078 | gw-w/thread-46/gateway.admitted-work | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.672 | 0.558 | 0.000 | 0.549 | 2.149 | n/a | 0.000 | 0.747 | 0.863 | 1.236 | 0.017 | n/a | 0.228 | 5.965 | 0.880 | n/a | 0.023 | 2.702 | 0.207 | 0.023 |
| p99 | 31.498 | 2.003 | 0.000 | 0.830 | 6.862 | n/a | 0.000 | 1.290 | 5.172 | 8.048 | 0.055 | n/a | 3.558 | 15.751 | 6.866 | n/a | 0.083 | 8.153 | 0.344 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000000249 | 31.498 | 2.083 | n/a | 0.000 | 0.762 | 5.172 | 0.827 | 0.008 | n/a | 0.020 | 15.751 | 6.866 | n/a | 0.010 | 2.845 | 0.090 | 0.010 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.270ms |
| c5e7bd39fcaf8a8f000000000000022e | 24.397 | 2.738 | n/a | 0.000 | 0.438 | 0.905 | 1.112 | 0.017 | n/a | 0.418 | 15.397 | 3.351 | n/a | 0.022 | 3.176 | 0.130 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000268 | 23.700 | 6.862 | n/a | 0.000 | 1.290 | 1.933 | 8.048 | 0.038 | n/a | 0.228 | 4.619 | 0.599 | n/a | 0.083 | 8.153 | 0.344 | 0.083 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000235 | 19.014 | 2.306 | n/a | 0.000 | 0.129 | 4.753 | 1.793 | 0.034 | n/a | 0.241 | 7.818 | 1.917 | n/a | 0.022 | 2.435 | 0.128 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000023f | 18.869 | 2.359 | n/a | 0.000 | 0.818 | 0.863 | 1.055 | 0.015 | n/a | 3.558 | 9.743 | 0.431 | n/a | 0.027 | 3.177 | 0.168 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000221 | 15.244 | 3.809 | n/a | 0.000 | 0.050 | 1.590 | 7.013 | 0.055 | n/a | 0.124 | 2.343 | 0.222 | n/a | 0.039 | 3.858 | 0.253 | 0.039 | gw-w/thread-45/commit.prepare-and-validate | none observed |
| c5e7bd39fcaf8a8f000000000000027b | 14.652 | 2.612 | n/a | 0.000 | 1.022 | 0.839 | 2.223 | 0.037 | n/a | 0.304 | 6.760 | 0.827 | n/a | 0.028 | 3.635 | 0.248 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000025d | 13.797 | 2.505 | n/a | 0.000 | 0.917 | 0.540 | 3.188 | 0.019 | n/a | 0.415 | 4.123 | 2.070 | n/a | 0.021 | 3.422 | 0.248 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000026d | 13.672 | 1.875 | n/a | 0.000 | 0.536 | 0.514 | 1.443 | 0.017 | n/a | 0.135 | 8.248 | 0.880 | n/a | 0.025 | 2.411 | 0.176 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000229 | 13.192 | 1.841 | n/a | 0.000 | 0.588 | 0.691 | 1.236 | 0.016 | n/a | 0.409 | 6.400 | 1.994 | n/a | 0.017 | 2.428 | 0.184 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000225 | 13.022 | 2.149 | n/a | 0.000 | 0.553 | 0.489 | 0.922 | 0.018 | n/a | 0.455 | 4.853 | 3.558 | n/a | 0.026 | 2.702 | 0.207 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000027f | 12.786 | 1.889 | n/a | 0.000 | 0.870 | 0.956 | 2.235 | 0.035 | n/a | 0.177 | 5.965 | 0.625 | n/a | 0.033 | 2.759 | 0.216 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000253 | 11.919 | 1.713 | n/a | 0.000 | 0.747 | 1.506 | 1.053 | 0.016 | n/a | 0.152 | 6.212 | 0.500 | n/a | 0.022 | 2.460 | 0.206 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000263 | 10.991 | 1.748 | n/a | 0.000 | 0.895 | 1.444 | 1.683 | 0.019 | n/a | 0.105 | 3.876 | 1.203 | n/a | 0.017 | 2.643 | 0.240 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000275 | 9.678 | 2.360 | n/a | 0.000 | 0.121 | 0.695 | 0.981 | 0.017 | n/a | 0.098 | 4.459 | 0.924 | n/a | 0.023 | 2.480 | 0.256 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000025f | 8.341 | 1.690 | n/a | 0.000 | 0.999 | 0.488 | 0.937 | 0.016 | n/a | 0.269 | 3.146 | 0.774 | n/a | 0.023 | 2.688 | 0.322 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.466 | 0.224 | 0.000 | 0.465 | 3.104 | n/a | 0.000 | 0.183 | 1.040 | 3.045 | 0.027 | n/a | 0.176 | 5.962 | 3.505 | n/a | 0.029 | 3.647 | 0.214 | 0.029 |
| p99 | 52.146 | 2.383 | 0.045 | 1.373 | 11.485 | n/a | 0.572 | 1.066 | 5.977 | 24.147 | 0.075 | n/a | 3.118 | 34.596 | n/a | n/a | 0.098 | 12.174 | 0.401 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f00000000000002a0 | 52.146 | 11.485 | 0.136 | 0.465 | 0.087 | 1.376 | 3.045 | 0.030 | n/a | 0.153 | 34.596 | 0.741 | n/a | 0.032 | 12.174 | 0.233 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000292 | 48.452 | 3.527 | 0.264 | 0.246 | 0.055 | 1.665 | 22.575 | 0.056 | n/a | 3.118 | 8.714 | 8.205 | n/a | 0.026 | 4.092 | 0.084 | 0.026 | gw-w/thread-45/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000002a4 | 45.897 | 3.609 | 0.140 | 0.318 | 0.033 | 1.166 | 24.147 | 0.023 | n/a | 0.125 | 10.512 | 5.809 | n/a | 0.016 | 4.099 | 0.089 | 0.016 | gw-w/thread-44/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000002ac | 41.052 | 4.393 | 0.351 | 0.000 | 0.084 | 5.977 | 13.371 | 0.075 | n/a | 0.346 | 10.552 | 5.855 | n/a | 0.046 | 4.828 | 0.118 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000029a | 38.541 | 3.199 | 0.171 | 0.262 | 0.074 | 1.192 | 20.471 | 0.027 | n/a | 1.856 | 7.749 | 3.505 | n/a | 0.034 | 3.707 | 0.096 | 0.034 | gw-w/thread-40/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000002b2 | 32.604 | 3.698 | 0.293 | 0.000 | 0.034 | 1.224 | 10.618 | 0.033 | n/a | 0.521 | 11.896 | 4.270 | n/a | 0.017 | 4.025 | 0.123 | 0.017 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000287 | 28.775 | 2.743 | 0.246 | 0.244 | 0.099 | 1.029 | 4.989 | 0.021 | n/a | 0.360 | 13.174 | 5.829 | n/a | 0.042 | 3.332 | 0.116 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002b4 | 27.194 | 3.371 | 0.188 | 0.000 | 0.078 | 1.487 | 7.281 | 0.046 | n/a | 0.205 | 11.173 | 3.330 | n/a | 0.036 | 3.636 | 0.134 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002c0 | 26.032 | 3.897 | 0.335 | 0.000 | 0.077 | 1.891 | 8.673 | 0.045 | n/a | 0.807 | 5.925 | 4.348 | n/a | 0.034 | 4.309 | 0.166 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000028b | 25.481 | 4.796 | 0.151 | 0.456 | 0.044 | 1.335 | 4.335 | 0.024 | n/a | 0.073 | 13.652 | 0.595 | n/a | 0.018 | 5.448 | 0.214 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002d5 | 25.428 | 3.031 | 0.207 | 0.000 | 0.081 | 1.283 | 6.068 | 0.029 | n/a | 0.183 | 10.947 | 3.559 | n/a | 0.039 | 3.320 | 0.131 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002ca | 24.104 | 3.104 | 0.215 | 0.000 | 0.152 | 1.584 | 10.444 | 0.044 | n/a | 0.538 | 5.028 | 2.922 | n/a | 0.073 | 3.472 | 0.144 | 0.073 | gw-w/thread-46/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f00000000000002cf | 23.100 | 3.652 | 2.061 | 0.000 | 0.054 | 2.123 | 5.946 | 0.041 | n/a | 0.591 | 4.909 | 3.697 | n/a | 0.026 | 5.767 | 0.250 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002b0 | 22.771 | 4.469 | n/a | 0.000 | 0.912 | 1.053 | 1.231 | 0.035 | n/a | 0.124 | 11.209 | 3.680 | n/a | 0.057 | 5.381 | 0.236 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002bc | 22.743 | 6.434 | 0.143 | 0.000 | 0.041 | 1.534 | 7.041 | 0.036 | n/a | 0.777 | 4.594 | 2.123 | n/a | 0.021 | 6.617 | 0.291 | 0.021 | gw-w/thread-43/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000298 | 22.515 | 4.720 | 0.229 | 0.572 | 0.183 | 1.715 | 5.776 | 0.027 | n/a | 0.095 | 5.574 | 3.525 | n/a | 0.098 | 5.704 | 0.253 | 0.098 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002d0 | 21.923 | 4.485 | n/a | 0.000 | 0.111 | 0.634 | 1.507 | 0.017 | n/a | 0.097 | 10.380 | 4.667 | n/a | 0.024 | 4.596 | 0.210 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002a8 | 21.304 | 2.925 | 0.250 | 0.000 | 0.085 | 0.845 | 5.459 | 0.021 | n/a | 0.084 | 5.962 | 5.628 | n/a | 0.044 | 3.260 | 0.153 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002b8 | 20.487 | 3.071 | 0.143 | 0.000 | 0.048 | 1.079 | 7.081 | 0.034 | n/a | 0.085 | 5.007 | 3.924 | n/a | 0.016 | 3.262 | 0.159 | 0.016 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002d3 | 20.219 | 4.801 | 0.308 | 0.000 | 0.169 | 3.115 | 3.953 | 0.058 | n/a | 0.632 | 5.798 | 1.308 | n/a | 0.077 | 5.278 | 0.261 | 0.077 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.732 | 0.000 | 0.000 | 0.486 | 2.378 | n/a | 0.000 | 0.534 | 0.853 | 1.577 | 0.021 | n/a | 0.172 | 4.855 | 0.760 | n/a | 0.028 | 3.073 | 0.216 | 0.028 |
| p99 | 19.377 | 1.140 | 0.000 | 0.861 | 2.965 | n/a | 0.000 | 1.009 | 5.497 | 7.452 | 0.036 | n/a | 2.291 | 8.708 | n/a | n/a | 0.062 | 3.800 | 0.401 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f00000000000002ae | 19.377 | 2.908 | n/a | 0.000 | 0.892 | 1.064 | 1.577 | 0.022 | n/a | 0.192 | 8.623 | 4.068 | n/a | 0.031 | 3.800 | 0.196 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002a2 | 18.611 | 2.795 | n/a | 0.000 | 0.462 | 0.975 | 3.194 | 0.020 | n/a | 0.172 | 6.647 | 4.284 | n/a | 0.061 | 3.258 | 0.175 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002b6 | 16.546 | 2.038 | n/a | 0.000 | 0.817 | 0.951 | 5.116 | 0.036 | n/a | 2.291 | 4.557 | 0.709 | n/a | 0.029 | 2.855 | 0.173 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002cc | 16.049 | 2.804 | n/a | 0.000 | 0.157 | 5.497 | 7.452 | 0.021 | n/a | 0.056 | 0.000 | n/a | n/a | 0.062 | 2.961 | 0.185 | 0.062 | node-14/thread-0/socket.wait-first-byte | none observed |
| c5e7bd39fcaf8a8f00000000000002c1 | 14.926 | 2.807 | n/a | 0.000 | 0.586 | 0.906 | 1.195 | 0.021 | n/a | 0.127 | 3.896 | 5.364 | n/a | 0.026 | 3.393 | 0.227 | 0.026 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f0000000000000293 | 14.867 | 2.211 | n/a | 0.000 | 1.009 | 0.699 | 2.642 | 0.030 | n/a | 0.131 | 6.645 | 1.475 | n/a | 0.025 | 3.220 | 0.217 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002a5 | 14.807 | 2.802 | n/a | 0.000 | 0.397 | 0.827 | 1.261 | 0.021 | n/a | 0.176 | 8.708 | 0.585 | n/a | 0.028 | 3.200 | 0.216 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000285 | 13.732 | 2.378 | n/a | 0.000 | 0.769 | 0.897 | 1.589 | 0.031 | n/a | 0.819 | 6.649 | 0.574 | n/a | 0.027 | 3.146 | 0.229 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002bd | 13.102 | 1.989 | n/a | 0.000 | 0.375 | 0.581 | 1.190 | 0.017 | n/a | 0.377 | 4.855 | 3.692 | n/a | 0.026 | 2.365 | 0.180 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002ba | 12.818 | 2.390 | n/a | 0.000 | 0.254 | 0.723 | 4.260 | 0.025 | n/a | 0.084 | 4.503 | 0.551 | n/a | 0.029 | 2.644 | 0.206 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000029b | 10.458 | 2.318 | n/a | 0.000 | 0.390 | 0.853 | 1.292 | 0.021 | n/a | 0.167 | 4.622 | 0.760 | n/a | 0.034 | 2.708 | 0.259 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002c8 | 10.443 | 1.668 | n/a | 0.000 | 0.534 | 0.305 | 1.095 | 0.015 | n/a | 0.102 | 4.976 | 1.732 | n/a | 0.015 | 2.202 | 0.211 | 0.015 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000282 | 10.337 | 2.261 | n/a | 0.000 | 0.812 | 0.842 | 1.735 | 0.027 | n/a | 0.650 | 3.509 | 0.482 | n/a | 0.020 | 3.073 | 0.297 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000029e | 10.005 | 1.841 | n/a | 0.000 | 0.318 | 0.394 | 0.848 | 0.018 | n/a | 0.347 | 5.568 | 0.653 | n/a | 0.019 | 2.159 | 0.216 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000002c5 | 9.100 | 2.965 | n/a | 0.000 | 0.682 | 0.870 | 0.908 | 0.016 | n/a | 0.125 | 3.113 | 0.383 | n/a | 0.038 | 3.647 | 0.401 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (837 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.941 | 0.347 | 0.000 | 0.549 | 2.312 | n/a | 0.000 | 0.710 | 0.665 | 1.051 | 0.012 | n/a | 0.107 | 5.486 | 0.957 | n/a | 0.018 | 3.240 | 0.249 | 0.018 |
| p99 | 46.093 | 2.049 | 0.000 | 2.224 | 7.293 | n/a | 0.000 | 12.577 | 10.344 | 8.006 | 0.054 | n/a | 3.858 | 23.557 | 18.314 | n/a | 0.052 | 14.612 | 0.606 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000000374 | 67.992 | 4.302 | 0.193 | 0.000 | 0.056 | 1.171 | 10.001 | 0.019 | n/a | 0.313 | 7.717 | 44.201 | n/a | 0.020 | 4.551 | 0.067 | 0.020 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 2.731ms; driver.publication.persist-deferred 0.980ms; driver.publication.persist-deferred 0.846ms |
| c5e7bd39fcaf8a8f000000000000080d | 52.861 | 7.293 | n/a | 0.000 | 0.499 | 10.748 | 20.744 | 0.026 | n/a | 0.073 | 13.331 | 0.127 | n/a | 0.019 | 7.792 | 0.147 | 0.019 | gw-w/thread-45/commit.prepare-and-validate | driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 0.805ms; driver.publication.persist-deferred 0.676ms |
| c5e7bd39fcaf8a8f00000000000003f9 | 52.815 | 2.690 | n/a | 0.000 | 0.503 | 2.796 | 0.938 | 0.015 | n/a | 0.061 | 17.245 | 28.561 | n/a | 0.005 | 3.193 | 0.060 | 0.005 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 2.074ms |
| c5e7bd39fcaf8a8f00000000000003f8 | 51.914 | 2.171 | n/a | 0.000 | 0.576 | 7.103 | 0.413 | 0.005 | n/a | 0.014 | 41.263 | 0.350 | n/a | 0.019 | 2.747 | 0.053 | 0.019 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.074ms |
| c5e7bd39fcaf8a8f00000000000002e6 | 50.195 | 2.902 | 0.259 | 0.000 | 0.097 | 1.152 | 33.153 | 0.025 | n/a | 0.083 | 6.185 | 6.293 | n/a | 0.044 | 3.258 | 0.065 | 0.044 | gw-w/thread-43/gateway.admitted-work | none observed |
| c5e7bd39fcaf8a8f0000000000000821 | 48.912 | 1.631 | n/a | 0.000 | 34.350 | 0.406 | 1.050 | 0.013 | n/a | 0.135 | 10.010 | 1.301 | n/a | 0.017 | 35.981 | 0.736 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.905ms; driver.publication.persist-deferred 0.893ms; driver.publication.persist-deferred 0.833ms; driver.publication.persist-deferred 0.769ms; driver.publication.persist-deferred 0.723ms |
| c5e7bd39fcaf8a8f0000000000000826 | 47.563 | 7.254 | n/a | 0.000 | 1.114 | 10.517 | 3.721 | 0.054 | n/a | 0.281 | 23.518 | 1.094 | n/a | 0.010 | 8.368 | 0.176 | 0.010 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.905ms; driver.publication.persist-deferred 0.893ms; driver.publication.persist-deferred 0.833ms; driver.publication.persist-deferred 0.769ms; driver.publication.persist-deferred 0.640ms |
| c5e7bd39fcaf8a8f000000000000038c | 46.511 | 3.088 | n/a | 0.000 | 0.523 | 0.505 | 1.428 | 0.013 | n/a | 0.885 | 31.413 | 8.651 | n/a | 0.005 | 3.611 | 0.078 | 0.005 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.864ms |
| c5e7bd39fcaf8a8f0000000000000551 | 46.093 | 11.964 | n/a | 1.737 | 0.737 | 10.344 | 7.278 | 0.042 | n/a | 3.937 | 8.594 | 1.441 | n/a | 0.020 | 14.438 | 0.313 | 0.020 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000090c | 45.011 | 2.373 | n/a | 0.000 | 30.521 | 0.531 | 1.115 | 0.012 | n/a | 0.085 | 6.135 | 4.226 | n/a | 0.012 | 32.895 | 0.731 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.977ms; driver.publication.persist-deferred 0.941ms; driver.publication.persist-deferred 0.928ms; driver.publication.persist-deferred 0.915ms |
| c5e7bd39fcaf8a8f0000000000000503 | 44.610 | 4.181 | n/a | 0.000 | 0.792 | 32.115 | 2.883 | 0.029 | n/a | 0.677 | 3.281 | 0.613 | n/a | 0.040 | 4.973 | 0.111 | 0.040 | node-14/thread-0/socket.wait-first-byte | none observed |
| c5e7bd39fcaf8a8f0000000000000521 | 43.859 | 1.629 | n/a | 0.000 | 0.523 | 0.548 | 0.873 | 0.011 | n/a | 0.313 | 17.354 | 22.591 | n/a | 0.017 | 2.151 | 0.049 | 0.017 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f000000000000090a | 41.563 | 8.304 | n/a | 0.000 | 1.739 | 7.229 | 3.509 | 0.011 | n/a | 0.053 | 18.795 | 1.914 | n/a | 0.010 | 10.043 | 0.242 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.143ms; driver.publication.persist-deferred 0.977ms; driver.publication.persist-deferred 0.928ms |
| c5e7bd39fcaf8a8f000000000000080f | 40.966 | 2.204 | n/a | 0.000 | 0.488 | 16.308 | 1.319 | 0.022 | n/a | 1.598 | 15.512 | 3.502 | n/a | 0.013 | 2.692 | 0.066 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 0.805ms; driver.publication.persist-deferred 0.676ms |
| c5e7bd39fcaf8a8f00000000000004a8 | 40.494 | 2.097 | n/a | 0.000 | 4.552 | 5.757 | 1.282 | 0.016 | n/a | 0.349 | 23.291 | 3.133 | n/a | 0.016 | 6.649 | 0.164 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.589ms; driver.expected-state.bind-receipt 1.045ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.990ms; driver.publication.persist-deferred 0.687ms |
| c5e7bd39fcaf8a8f0000000000000810 | 39.668 | 3.289 | n/a | 0.000 | 0.972 | 7.729 | 1.560 | 0.015 | n/a | 1.383 | 23.557 | 1.121 | n/a | 0.042 | 4.261 | 0.107 | 0.042 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 0.805ms; driver.publication.persist-deferred 0.676ms |
| c5e7bd39fcaf8a8f0000000000000825 | 39.596 | 4.437 | n/a | 0.000 | 19.576 | 3.365 | 1.216 | 0.010 | n/a | 0.046 | 8.409 | 2.526 | n/a | 0.011 | 24.013 | 0.606 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.905ms; driver.publication.persist-deferred 0.893ms; driver.publication.persist-deferred 0.833ms; driver.publication.persist-deferred 0.692ms; driver.publication.persist-deferred 0.633ms |
| c5e7bd39fcaf8a8f00000000000002ec | 38.355 | 2.277 | n/a | 0.000 | 0.725 | 1.487 | 0.988 | 0.013 | n/a | 0.340 | 30.822 | 1.688 | n/a | 0.014 | 3.002 | 0.078 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.475ms; driver.publication.persist-deferred 0.999ms |
| c5e7bd39fcaf8a8f00000000000006cf | 38.271 | 2.322 | n/a | 0.000 | 0.360 | 0.376 | 0.877 | 0.010 | n/a | 0.238 | 26.727 | 7.344 | n/a | 0.016 | 2.682 | 0.070 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.817ms |
| c5e7bd39fcaf8a8f000000000000049b | 38.037 | 6.274 | n/a | 0.000 | 4.157 | 6.455 | 1.721 | 0.020 | n/a | 0.094 | 13.492 | 5.816 | n/a | 0.008 | 10.432 | 0.274 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.235ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.888ms; driver.publication.persist-deferred 0.812ms; driver.publication.persist-deferred 0.667ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.977 | 0.000 | 0.000 | 0.424 | 1.900 | n/a | 0.000 | 0.718 | 0.644 | 0.926 | 0.012 | n/a | 0.103 | 5.363 | 0.715 | n/a | 0.018 | 2.714 | 0.230 | 0.018 |
| p99 | 40.966 | 1.996 | 0.009 | 1.127 | 5.333 | n/a | 0.000 | 12.577 | 8.487 | 5.691 | 0.056 | n/a | 3.812 | 23.291 | 17.147 | n/a | 0.052 | 14.612 | 0.603 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f00000000000003f9 | 52.815 | 2.690 | n/a | 0.000 | 0.503 | 2.796 | 0.938 | 0.015 | n/a | 0.061 | 17.245 | 28.561 | n/a | 0.005 | 3.193 | 0.060 | 0.005 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 2.074ms |
| c5e7bd39fcaf8a8f00000000000003f8 | 51.914 | 2.171 | n/a | 0.000 | 0.576 | 7.103 | 0.413 | 0.005 | n/a | 0.014 | 41.263 | 0.350 | n/a | 0.019 | 2.747 | 0.053 | 0.019 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.074ms |
| c5e7bd39fcaf8a8f0000000000000821 | 48.912 | 1.631 | n/a | 0.000 | 34.350 | 0.406 | 1.050 | 0.013 | n/a | 0.135 | 10.010 | 1.301 | n/a | 0.017 | 35.981 | 0.736 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.905ms; driver.publication.persist-deferred 0.893ms; driver.publication.persist-deferred 0.833ms; driver.publication.persist-deferred 0.769ms; driver.publication.persist-deferred 0.723ms |
| c5e7bd39fcaf8a8f0000000000000521 | 43.859 | 1.629 | n/a | 0.000 | 0.523 | 0.548 | 0.873 | 0.011 | n/a | 0.313 | 17.354 | 22.591 | n/a | 0.017 | 2.151 | 0.049 | 0.017 | tx/thread-87/transactor.triplex-function | none observed |
| c5e7bd39fcaf8a8f000000000000080f | 40.966 | 2.204 | n/a | 0.000 | 0.488 | 16.308 | 1.319 | 0.022 | n/a | 1.598 | 15.512 | 3.502 | n/a | 0.013 | 2.692 | 0.066 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 0.805ms; driver.publication.persist-deferred 0.676ms |
| c5e7bd39fcaf8a8f00000000000004a8 | 40.494 | 2.097 | n/a | 0.000 | 4.552 | 5.757 | 1.282 | 0.016 | n/a | 0.349 | 23.291 | 3.133 | n/a | 0.016 | 6.649 | 0.164 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.589ms; driver.expected-state.bind-receipt 1.045ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.990ms; driver.publication.persist-deferred 0.687ms |
| c5e7bd39fcaf8a8f000000000000090e | 37.245 | 1.614 | n/a | 0.000 | 30.251 | 0.379 | 0.824 | 0.011 | n/a | 0.095 | 3.398 | 0.662 | n/a | 0.011 | 31.864 | 0.856 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.977ms; driver.publication.persist-deferred 0.941ms; driver.publication.persist-deferred 0.928ms; driver.publication.persist-deferred 0.917ms; driver.publication.persist-deferred 0.915ms |
| c5e7bd39fcaf8a8f0000000000000499 | 34.869 | 3.063 | n/a | 0.000 | 6.865 | 4.332 | 2.536 | 0.022 | n/a | 0.094 | 17.109 | 0.821 | n/a | 0.029 | 9.927 | 0.285 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.888ms; driver.publication.persist-deferred 0.667ms |
| c5e7bd39fcaf8a8f000000000000049a | 34.667 | 4.518 | n/a | 0.000 | 3.996 | 4.068 | 1.047 | 0.017 | n/a | 0.046 | 20.441 | 0.521 | n/a | 0.014 | 8.514 | 0.246 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.235ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.888ms; driver.publication.persist-deferred 0.667ms |
| c5e7bd39fcaf8a8f000000000000038b | 33.911 | 2.156 | n/a | 0.000 | 0.325 | 2.559 | 4.456 | 0.006 | n/a | 0.021 | 13.545 | 10.821 | n/a | 0.023 | 2.480 | 0.073 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000005f1 | 33.886 | 1.562 | n/a | 0.000 | 0.279 | 0.482 | 0.891 | 0.012 | n/a | 1.864 | 27.738 | 1.040 | n/a | 0.017 | 1.841 | 0.054 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.172ms; driver.publication.persist-deferred 0.244ms |
| c5e7bd39fcaf8a8f0000000000000535 | 33.775 | 3.321 | n/a | 0.000 | 0.517 | 2.302 | 1.026 | 0.011 | n/a | 3.776 | 22.381 | 0.400 | n/a | 0.041 | 3.838 | 0.114 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000080e | 33.311 | 2.073 | n/a | 0.000 | 1.707 | 10.595 | 1.002 | 0.017 | n/a | 3.858 | 11.975 | 2.073 | n/a | 0.012 | 3.780 | 0.113 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000038d | 32.416 | 3.311 | n/a | 0.000 | 0.969 | 2.701 | 1.349 | 0.021 | n/a | 0.096 | 23.517 | 0.408 | n/a | 0.042 | 4.280 | 0.132 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.909ms; driver.publication.persist-deferred 0.864ms; driver.publication.persist-deferred 0.714ms |
| c5e7bd39fcaf8a8f00000000000007f8 | 32.094 | 1.782 | n/a | 0.000 | 0.019 | 1.351 | 0.628 | 0.005 | n/a | 0.172 | 27.072 | 1.055 | n/a | 0.009 | 1.801 | 0.056 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.280ms; driver.publication.persist-deferred 1.229ms; driver.publication.persist-deferred 0.830ms; driver.publication.persist-deferred 0.788ms; driver.publication.persist-deferred 0.529ms |
| c5e7bd39fcaf8a8f00000000000007db | 32.021 | 1.543 | n/a | 0.000 | 0.948 | 0.537 | 1.480 | 0.021 | n/a | 3.292 | 19.167 | 5.014 | n/a | 0.019 | 2.491 | 0.078 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.919ms |
| c5e7bd39fcaf8a8f0000000000000738 | 31.887 | 1.978 | n/a | 0.000 | 15.677 | 2.776 | 0.570 | 0.010 | n/a | 0.086 | 10.245 | 0.521 | n/a | 0.024 | 17.656 | 0.554 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.584ms; driver.publication.persist-deferred 0.999ms; driver.publication.persist-deferred 0.738ms; driver.publication.persist-deferred 0.422ms |
| c5e7bd39fcaf8a8f0000000000000411 | 31.838 | 2.343 | n/a | 0.000 | 1.134 | 22.569 | 0.949 | 0.016 | n/a | 0.075 | 4.241 | 0.499 | n/a | 0.012 | 3.477 | 0.109 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.952ms; driver.publication.persist-deferred 0.721ms; driver.publication.persist-deferred 0.717ms |
| c5e7bd39fcaf8a8f000000000000040f | 31.834 | 2.035 | n/a | 0.000 | 12.577 | 8.402 | 0.736 | 0.012 | n/a | 0.137 | 7.432 | 0.490 | n/a | 0.012 | 14.612 | 0.459 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.952ms; driver.publication.persist-deferred 0.721ms; driver.publication.persist-deferred 0.717ms; driver.publication.persist-deferred 0.666ms |
| c5e7bd39fcaf8a8f0000000000000511 | 31.731 | 1.454 | n/a | 0.000 | 0.149 | 0.795 | 0.642 | 0.006 | n/a | 0.160 | 14.852 | 13.658 | n/a | 0.016 | 1.603 | 0.051 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.265ms; driver.publication.persist-deferred 1.064ms |

## P2 / tail / commit (2631 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.970 | 0.184 | 0.000 | 0.493 | 2.211 | n/a | 0.000 | 0.688 | 0.555 | 0.911 | 0.011 | n/a | 0.088 | 4.047 | 0.767 | n/a | 0.013 | 3.081 | 0.297 | 0.013 |
| p99 | 41.231 | 2.046 | 0.033 | 2.125 | 7.113 | n/a | 0.000 | 11.412 | 7.286 | 6.364 | 0.043 | n/a | 2.629 | 23.939 | 8.088 | n/a | 0.041 | 14.919 | 0.664 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000001d9b | 69.416 | 1.612 | n/a | 0.000 | 0.142 | 0.695 | 1.373 | 0.020 | n/a | 0.120 | 55.119 | 10.316 | n/a | 0.020 | 1.754 | 0.025 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000137c | 59.916 | 3.405 | n/a | 0.000 | 0.072 | 24.858 | 0.793 | 0.011 | n/a | 0.085 | 30.194 | 0.475 | n/a | 0.024 | 3.476 | 0.058 | 0.024 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000009dc | 55.647 | 6.594 | n/a | 0.000 | 2.369 | 2.067 | 1.025 | 0.005 | n/a | 0.031 | 34.739 | 8.806 | n/a | 0.012 | 8.962 | 0.161 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.560ms; driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 1.096ms; driver.publication.persist-deferred 0.980ms |
| c5e7bd39fcaf8a8f00000000000011c4 | 53.026 | 1.217 | n/a | 0.000 | 42.543 | 0.281 | 0.647 | 0.010 | n/a | 1.818 | 5.105 | 1.397 | n/a | 0.009 | 43.760 | 0.825 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 1.017ms; driver.expected-state.bind-receipt 1.011ms; driver.publication.persist-deferred 0.892ms; driver.publication.persist-deferred 0.764ms |
| c5e7bd39fcaf8a8f00000000000019bb | 52.700 | 3.741 | n/a | 0.000 | 42.345 | 0.371 | 1.190 | 0.012 | n/a | 0.683 | 3.133 | 1.214 | n/a | 0.011 | 46.086 | 0.874 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.849ms; driver.publication.persist-deferred 0.738ms; driver.publication.persist-deferred 0.354ms |
| c5e7bd39fcaf8a8f000000000000184f | 50.242 | 3.823 | n/a | 0.000 | 3.265 | 0.414 | 0.953 | 0.011 | n/a | 0.035 | 4.902 | 36.821 | n/a | 0.016 | 7.089 | 0.141 | 0.016 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 2.590ms; driver.publication.persist-deferred 0.772ms; driver.publication.persist-deferred 0.657ms |
| c5e7bd39fcaf8a8f00000000000019b9 | 49.171 | 1.422 | n/a | 0.000 | 0.242 | 2.103 | 1.128 | 0.029 | n/a | 0.102 | 42.975 | 1.159 | n/a | 0.011 | 1.664 | 0.034 | 0.011 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.849ms |
| c5e7bd39fcaf8a8f00000000000009de | 48.997 | 3.926 | n/a | 0.000 | 0.493 | 0.510 | 1.405 | 0.013 | n/a | 0.060 | 36.377 | 6.197 | n/a | 0.018 | 4.418 | 0.090 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.560ms; driver.expected-state.bind-receipt 1.360ms; driver.publication.persist-deferred 1.252ms; driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 0.980ms |
| c5e7bd39fcaf8a8f00000000000009db | 47.930 | 3.423 | n/a | 0.000 | 5.193 | 3.441 | 0.875 | 0.009 | n/a | 0.043 | 26.835 | 8.088 | n/a | 0.022 | 8.616 | 0.180 | 0.022 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.560ms; driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 1.096ms |
| c5e7bd39fcaf8a8f0000000000000dd8 | 47.816 | 8.041 | n/a | 0.000 | 2.514 | 15.840 | 5.981 | 0.006 | n/a | 0.025 | 13.686 | 1.713 | n/a | 0.011 | 10.554 | 0.221 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.409ms; driver.publication.persist-deferred 1.270ms; driver.publication.persist-deferred 1.210ms; driver.publication.persist-deferred 0.866ms |
| c5e7bd39fcaf8a8f00000000000009e1 | 47.265 | 2.210 | n/a | 0.000 | 3.529 | 0.527 | 1.159 | 0.016 | n/a | 0.068 | 28.759 | 10.978 | n/a | 0.018 | 5.740 | 0.121 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.560ms; driver.expected-state.bind-receipt 1.360ms; driver.publication.persist-deferred 1.252ms; driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 1.061ms |
| c5e7bd39fcaf8a8f00000000000009af | 46.798 | 3.400 | n/a | 0.000 | 6.796 | 3.023 | 1.280 | 0.019 | n/a | 5.715 | 24.042 | 2.495 | n/a | 0.028 | 10.197 | 0.218 | 0.028 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.782ms; driver.publication.persist-deferred 1.725ms; driver.expected-state.bind-receipt 1.685ms; driver.expected-state.bind-receipt 1.244ms; driver.publication.persist-deferred 1.238ms |
| c5e7bd39fcaf8a8f00000000000009df | 46.767 | 1.837 | n/a | 0.000 | 0.993 | 0.480 | 0.895 | 0.011 | n/a | 0.083 | 41.871 | 0.571 | n/a | 0.024 | 2.830 | 0.061 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.560ms; driver.expected-state.bind-receipt 1.360ms; driver.publication.persist-deferred 1.252ms; driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 1.061ms |
| c5e7bd39fcaf8a8f00000000000011c2 | 45.825 | 7.669 | n/a | 0.000 | 0.514 | 10.176 | 2.565 | 0.047 | n/a | 3.842 | 18.302 | 2.698 | n/a | 0.013 | 8.182 | 0.179 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 1.017ms; driver.expected-state.bind-receipt 1.011ms; driver.publication.persist-deferred 0.764ms; driver.publication.persist-deferred 0.574ms |
| c5e7bd39fcaf8a8f0000000000000ee1 | 45.442 | 4.094 | n/a | 0.000 | 1.081 | 0.598 | 1.658 | 0.021 | n/a | 0.575 | 11.917 | 25.473 | n/a | 0.025 | 5.175 | 0.114 | 0.025 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 1.611ms |
| c5e7bd39fcaf8a8f0000000000001852 | 45.441 | 1.485 | n/a | 0.000 | 0.438 | 0.470 | 1.115 | 0.019 | n/a | 0.068 | 41.240 | 0.594 | n/a | 0.013 | 1.922 | 0.042 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.890ms |
| c5e7bd39fcaf8a8f0000000000000ee3 | 44.472 | 1.643 | n/a | 0.000 | 5.175 | 0.434 | 0.869 | 0.012 | n/a | 0.062 | 30.447 | 5.818 | n/a | 0.013 | 6.819 | 0.153 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.611ms; driver.publication.persist-deferred 0.940ms |
| c5e7bd39fcaf8a8f00000000000019ba | 44.318 | 1.909 | n/a | 0.000 | 0.142 | 0.493 | 0.816 | 0.013 | n/a | 0.048 | 39.997 | 0.872 | n/a | 0.027 | 2.051 | 0.046 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f0000000000000c2a | 43.927 | 3.278 | n/a | 0.000 | 16.603 | 2.951 | 1.078 | 0.015 | n/a | 1.860 | 12.487 | 5.649 | n/a | 0.005 | 19.882 | 0.453 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 1.248ms; driver.publication.persist-deferred 0.837ms; driver.publication.persist-deferred 0.711ms |
| c5e7bd39fcaf8a8f00000000000009e2 | 43.162 | 3.040 | n/a | 0.000 | 0.276 | 1.283 | 0.983 | 0.011 | n/a | 0.068 | 36.206 | 1.282 | n/a | 0.013 | 3.315 | 0.077 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.360ms; driver.publication.persist-deferred 1.252ms; driver.publication.persist-deferred 1.061ms; driver.publication.persist-deferred 1.002ms; driver.publication.persist-deferred 0.980ms |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.530 | 0.000 | 0.000 | 0.391 | 1.770 | n/a | 0.000 | 0.694 | 0.536 | 0.784 | 0.011 | n/a | 0.085 | 3.788 | 0.580 | n/a | 0.013 | 2.591 | 0.278 | 0.013 |
| p99 | 38.317 | 1.951 | 0.023 | 1.000 | 5.075 | n/a | 0.000 | 11.412 | 8.390 | 3.873 | 0.041 | n/a | 2.629 | 24.029 | 5.893 | n/a | 0.041 | 13.789 | 0.675 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c5e7bd39fcaf8a8f0000000000001d9b | 69.416 | 1.612 | n/a | 0.000 | 0.142 | 0.695 | 1.373 | 0.020 | n/a | 0.120 | 55.119 | 10.316 | n/a | 0.020 | 1.754 | 0.025 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f000000000000137c | 59.916 | 3.405 | n/a | 0.000 | 0.072 | 24.858 | 0.793 | 0.011 | n/a | 0.085 | 30.194 | 0.475 | n/a | 0.024 | 3.476 | 0.058 | 0.024 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000011c4 | 53.026 | 1.217 | n/a | 0.000 | 42.543 | 0.281 | 0.647 | 0.010 | n/a | 1.818 | 5.105 | 1.397 | n/a | 0.009 | 43.760 | 0.825 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 1.017ms; driver.expected-state.bind-receipt 1.011ms; driver.publication.persist-deferred 0.892ms; driver.publication.persist-deferred 0.764ms |
| c5e7bd39fcaf8a8f00000000000019b9 | 49.171 | 1.422 | n/a | 0.000 | 0.242 | 2.103 | 1.128 | 0.029 | n/a | 0.102 | 42.975 | 1.159 | n/a | 0.011 | 1.664 | 0.034 | 0.011 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.849ms |
| c5e7bd39fcaf8a8f00000000000009db | 47.930 | 3.423 | n/a | 0.000 | 5.193 | 3.441 | 0.875 | 0.009 | n/a | 0.043 | 26.835 | 8.088 | n/a | 0.022 | 8.616 | 0.180 | 0.022 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.560ms; driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 1.096ms |
| c5e7bd39fcaf8a8f00000000000009e1 | 47.265 | 2.210 | n/a | 0.000 | 3.529 | 0.527 | 1.159 | 0.016 | n/a | 0.068 | 28.759 | 10.978 | n/a | 0.018 | 5.740 | 0.121 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.560ms; driver.expected-state.bind-receipt 1.360ms; driver.publication.persist-deferred 1.252ms; driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 1.061ms |
| c5e7bd39fcaf8a8f00000000000009af | 46.798 | 3.400 | n/a | 0.000 | 6.796 | 3.023 | 1.280 | 0.019 | n/a | 5.715 | 24.042 | 2.495 | n/a | 0.028 | 10.197 | 0.218 | 0.028 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.782ms; driver.publication.persist-deferred 1.725ms; driver.expected-state.bind-receipt 1.685ms; driver.expected-state.bind-receipt 1.244ms; driver.publication.persist-deferred 1.238ms |
| c5e7bd39fcaf8a8f00000000000009df | 46.767 | 1.837 | n/a | 0.000 | 0.993 | 0.480 | 0.895 | 0.011 | n/a | 0.083 | 41.871 | 0.571 | n/a | 0.024 | 2.830 | 0.061 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.560ms; driver.expected-state.bind-receipt 1.360ms; driver.publication.persist-deferred 1.252ms; driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 1.061ms |
| c5e7bd39fcaf8a8f00000000000011c2 | 45.825 | 7.669 | n/a | 0.000 | 0.514 | 10.176 | 2.565 | 0.047 | n/a | 3.842 | 18.302 | 2.698 | n/a | 0.013 | 8.182 | 0.179 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 1.017ms; driver.expected-state.bind-receipt 1.011ms; driver.publication.persist-deferred 0.764ms; driver.publication.persist-deferred 0.574ms |
| c5e7bd39fcaf8a8f0000000000001852 | 45.441 | 1.485 | n/a | 0.000 | 0.438 | 0.470 | 1.115 | 0.019 | n/a | 0.068 | 41.240 | 0.594 | n/a | 0.013 | 1.922 | 0.042 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.890ms |
| c5e7bd39fcaf8a8f0000000000000ee3 | 44.472 | 1.643 | n/a | 0.000 | 5.175 | 0.434 | 0.869 | 0.012 | n/a | 0.062 | 30.447 | 5.818 | n/a | 0.013 | 6.819 | 0.153 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.611ms; driver.publication.persist-deferred 0.940ms |
| c5e7bd39fcaf8a8f00000000000019ba | 44.318 | 1.909 | n/a | 0.000 | 0.142 | 0.493 | 0.816 | 0.013 | n/a | 0.048 | 39.997 | 0.872 | n/a | 0.027 | 2.051 | 0.046 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c5e7bd39fcaf8a8f00000000000019cd | 41.231 | 2.335 | n/a | 0.000 | 23.970 | 6.420 | 0.556 | 0.006 | n/a | 0.018 | 5.612 | 2.303 | n/a | 0.011 | 26.305 | 0.638 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| c5e7bd39fcaf8a8f000000000000165f | 39.322 | 7.261 | n/a | 0.000 | 0.355 | 20.025 | 1.804 | 0.022 | n/a | 0.121 | 9.099 | 0.627 | n/a | 0.006 | 7.616 | 0.194 | 0.006 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.163ms; driver.publication.persist-deferred 1.107ms; driver.publication.persist-deferred 1.093ms; driver.publication.persist-deferred 1.071ms; driver.publication.persist-deferred 0.780ms |
| c5e7bd39fcaf8a8f0000000000001567 | 38.630 | 1.810 | n/a | 0.000 | 26.553 | 0.411 | 0.609 | 0.008 | n/a | 0.060 | 6.329 | 2.842 | n/a | 0.010 | 28.363 | 0.734 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.041ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.725ms; driver.publication.persist-deferred 0.694ms; driver.publication.persist-deferred 0.659ms |
| c5e7bd39fcaf8a8f0000000000000dd9 | 38.317 | 1.221 | n/a | 0.000 | 5.281 | 11.402 | 5.529 | 0.003 | n/a | 0.011 | 14.503 | 0.356 | n/a | 0.010 | 6.501 | 0.170 | 0.010 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.270ms; driver.publication.persist-deferred 0.866ms |
| c5e7bd39fcaf8a8f00000000000009b0 | 37.908 | 3.421 | n/a | 0.000 | 3.655 | 5.899 | 1.197 | 0.017 | n/a | 0.060 | 10.902 | 12.747 | n/a | 0.011 | 7.076 | 0.187 | 0.011 | tx/thread-87/transactor.triplex-function | driver.expected-state.bind-receipt 2.782ms; driver.publication.persist-deferred 1.725ms; driver.expected-state.bind-receipt 1.244ms; driver.publication.persist-deferred 1.238ms; driver.publication.persist-deferred 1.149ms |
| c5e7bd39fcaf8a8f0000000000001396 | 37.124 | 1.956 | n/a | 0.000 | 1.086 | 0.604 | 0.881 | 0.013 | n/a | 0.108 | 24.029 | 8.430 | n/a | 0.017 | 3.042 | 0.082 | 0.017 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.864ms |
| c5e7bd39fcaf8a8f00000000000009e4 | 36.560 | 2.246 | n/a | 0.000 | 1.816 | 1.432 | 0.658 | 0.011 | n/a | 0.075 | 29.856 | 0.437 | n/a | 0.030 | 4.062 | 0.111 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.360ms; driver.publication.persist-deferred 1.252ms; driver.publication.persist-deferred 1.101ms; driver.publication.persist-deferred 1.061ms; driver.publication.persist-deferred 1.002ms |
| c5e7bd39fcaf8a8f0000000000000c29 | 36.284 | 2.570 | n/a | 0.000 | 20.117 | 4.751 | 0.563 | 0.006 | n/a | 0.028 | 7.044 | 1.192 | n/a | 0.013 | 22.687 | 0.625 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | none observed |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.189 | n/a | n/a | n/a | 0.107 | n/a | 0.000 | 0.000 | 1.144 | 200.560 | 0.012 | n/a | 0.028 | 0.000 | n/a | n/a | 0.128 | 0.107 | 0.001 | 0.128 |
| p99 | 376.678 | n/a | n/a | n/a | 15.701 | n/a | 1.142 | 0.000 | 3.082 | 371.114 | 0.101 | n/a | 0.188 | 0.000 | n/a | n/a | 0.440 | 16.715 | 0.299 | 0.440 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a7060000000000000002 | 376.678 | 3.797 | n/a | 0.000 | 0.000 | 1.144 | 371.114 | 0.101 | n/a | 0.081 | 0.000 | n/a | n/a | 0.440 | 3.797 | 0.010 | 0.440 | gw-r/thread-43/gateway.admitted-work | none observed |
| 155bd958e09c272c0000000000000006 | 204.030 | 0.107 | n/a | 0.000 | 0.000 | 1.136 | 202.522 | 0.014 | n/a | 0.163 | 0.000 | n/a | n/a | 0.087 | 0.107 | 0.001 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000005 | 203.380 | 0.060 | n/a | 0.000 | 0.000 | 1.267 | 201.684 | 0.025 | n/a | 0.188 | 0.000 | n/a | n/a | 0.156 | 0.060 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000f3d | 202.470 | 0.045 | n/a | 0.000 | 0.000 | 1.121 | 201.173 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.075 | 0.045 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000f3b | 201.189 | 0.039 | n/a | 0.000 | 0.000 | 0.490 | 200.560 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.070 | 0.039 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000f3c | 201.099 | 0.031 | n/a | 0.000 | 0.000 | 0.575 | 200.416 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.057 | 0.031 | 0.000 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000f40 | 69.061 | 15.701 | n/a | 1.014 | 0.000 | 2.601 | 49.573 | 0.012 | n/a | 0.012 | 0.000 | n/a | n/a | 0.148 | 16.715 | 0.242 | 0.148 | gw-r/thread-65/gateway.admitted-work | none observed |
| 155bd958e09c272c0000000000000f41 | 59.536 | 14.893 | n/a | 0.000 | 0.000 | 2.085 | 42.353 | 0.021 | n/a | 0.026 | 0.000 | n/a | n/a | 0.158 | 14.893 | 0.250 | 0.158 | gw-r/thread-46/gateway.admitted-work | none observed |
| 155bd958e09c272c0000000000000f42 | 52.486 | 14.542 | n/a | 1.142 | 0.000 | 3.082 | 33.583 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.128 | 15.684 | 0.299 | 0.128 | gw-r/thread-44/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 814.220 | n/a | n/a | n/a | 0.174 | n/a | 0.000 | 0.000 | 0.553 | 801.024 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.229 | 0.174 | 0.000 | 0.229 |
| p99 | 1004.086 | n/a | n/a | n/a | 12.315 | n/a | 0.000 | 0.000 | 1.311 | 1001.134 | 0.011 | n/a | 0.239 | 0.000 | n/a | n/a | 1.217 | 12.315 | 0.015 | 1.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a70600000000000000a4 | 1004.086 | 0.174 | n/a | 0.000 | 0.000 | 1.311 | 1001.134 | 0.011 | n/a | 0.239 | 0.000 | n/a | n/a | 1.217 | 0.174 | 0.000 | 1.217 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a70600000000000000a5 | 814.220 | 12.315 | n/a | 0.000 | 0.000 | 0.553 | 801.024 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.229 | 12.315 | 0.015 | 0.229 | gw-r/thread-41/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 457.888 | n/a | n/a | n/a | 2.612 | n/a | 0.000 | 0.000 | 0.677 | 450.969 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.080 | 2.612 | 0.006 | 0.080 |
| p99 | 1002.768 | n/a | n/a | n/a | 10.438 | n/a | 0.000 | 0.000 | 4.830 | 998.854 | 0.023 | n/a | 3.016 | 0.000 | n/a | n/a | 0.219 | 10.438 | 0.053 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a70600000000000000bb | 1002.768 | 2.861 | n/a | 0.000 | 0.000 | 0.877 | 998.854 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.091 | 2.861 | 0.003 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a70600000000000000b4 | 999.948 | 2.629 | n/a | 0.000 | 0.000 | 0.662 | 996.482 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.088 | 2.629 | 0.003 | 0.088 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000000ba | 996.405 | 2.632 | n/a | 0.000 | 0.000 | 0.546 | 993.017 | 0.020 | n/a | 0.105 | 0.000 | n/a | n/a | 0.085 | 2.632 | 0.003 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a70600000000000000ae | 992.591 | 2.531 | n/a | 0.000 | 0.000 | 0.615 | 989.289 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.077 | 2.531 | 0.003 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000000ce | 964.361 | 2.612 | n/a | 0.000 | 0.000 | 1.003 | 960.548 | 0.021 | n/a | 0.102 | 0.000 | n/a | n/a | 0.074 | 2.612 | 0.003 | 0.074 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a70600000000000000ab | 941.854 | 2.819 | n/a | 0.000 | 0.000 | 0.495 | 938.350 | 0.012 | n/a | 0.081 | 0.000 | n/a | n/a | 0.098 | 2.819 | 0.003 | 0.098 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a70600000000000000a8 | 919.432 | 4.122 | n/a | 0.000 | 0.000 | 0.667 | 914.346 | 0.017 | n/a | 0.113 | 0.000 | n/a | n/a | 0.167 | 4.122 | 0.004 | 0.167 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a70600000000000000c1 | 898.780 | 5.626 | n/a | 0.000 | 0.000 | 0.677 | 892.299 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.102 | 5.626 | 0.006 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000000ca | 773.775 | 2.907 | n/a | 0.000 | 0.000 | 0.472 | 770.194 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.130 | 2.907 | 0.004 | 0.130 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a70600000000000000c4 | 550.197 | 1.951 | n/a | 0.000 | 0.000 | 1.145 | 546.916 | 0.023 | n/a | 0.098 | 0.000 | n/a | n/a | 0.064 | 1.951 | 0.004 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a70600000000000000b2 | 544.629 | 2.772 | n/a | 0.000 | 0.000 | 0.582 | 541.122 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.071 | 2.772 | 0.005 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000000c7 | 504.462 | 2.209 | n/a | 0.000 | 0.000 | 2.202 | 499.898 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.078 | 2.209 | 0.004 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a70600000000000000c8 | 486.292 | 2.523 | n/a | 0.000 | 0.000 | 0.545 | 483.090 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.078 | 2.523 | 0.005 | 0.078 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a70600000000000000c0 | 467.247 | 2.288 | n/a | 0.000 | 0.000 | 0.656 | 464.119 | 0.017 | n/a | 0.092 | 0.000 | n/a | n/a | 0.075 | 2.288 | 0.005 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000000c6 | 457.888 | 5.308 | n/a | 0.000 | 0.000 | 2.767 | 449.519 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.219 | 5.308 | 0.012 | 0.219 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000000b6 | 454.119 | 2.564 | n/a | 0.000 | 0.000 | 0.432 | 450.969 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.075 | 2.564 | 0.006 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a70600000000000000b5 | 367.118 | 10.438 | n/a | 0.000 | 0.000 | 1.413 | 354.991 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.180 | 10.438 | 0.028 | 0.180 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000000b1 | 317.668 | 7.423 | n/a | 0.000 | 0.000 | 0.504 | 309.525 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.125 | 7.423 | 0.023 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a70600000000000000bc | 294.579 | 2.263 | n/a | 0.000 | 0.000 | 0.704 | 291.425 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.080 | 2.263 | 0.008 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a70600000000000000a7 | 288.735 | 3.969 | n/a | 0.000 | 0.000 | 1.056 | 280.519 | 0.011 | n/a | 3.016 | 0.000 | n/a | n/a | 0.165 | 3.969 | 0.014 | 0.165 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 431.898 | n/a | n/a | n/a | 3.430 | n/a | 0.490 | 0.000 | 0.677 | 423.828 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.080 | 4.106 | 0.011 | 0.080 |
| p99 | 1006.924 | n/a | n/a | n/a | 14.275 | n/a | 1.724 | 0.000 | 3.756 | 1004.222 | 2.817 | n/a | 0.153 | 0.000 | n/a | n/a | 1.101 | 16.000 | 0.587 | 1.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a70600000000000000dd | 1006.924 | 0.105 | n/a | 0.000 | 0.000 | 1.335 | 1004.222 | 0.064 | n/a | 0.097 | 0.000 | n/a | n/a | 1.101 | 0.105 | 0.000 | 1.101 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a70600000000000000dc | 1005.704 | 5.390 | n/a | 0.721 | 0.000 | 0.670 | 998.764 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.074 | 6.111 | 0.006 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000000d7 | 1005.290 | 6.064 | n/a | 0.630 | 0.000 | 2.886 | 995.540 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.111 | 6.695 | 0.007 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a70600000000000000fd | 1002.618 | 0.127 | n/a | 0.000 | 0.000 | 0.566 | 1000.752 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 1.097 | 0.127 | 0.000 | 1.097 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a70600000000000000d1 | 1002.237 | 3.747 | n/a | 0.448 | 0.000 | 0.551 | 997.220 | 0.011 | n/a | 0.153 | 0.000 | n/a | n/a | 0.106 | 4.195 | 0.004 | 0.106 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000000d0 | 1002.179 | 9.558 | n/a | 1.089 | 0.000 | 3.756 | 987.565 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.131 | 10.647 | 0.011 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a7060000000000000105 | 993.046 | 2.934 | n/a | 0.000 | 0.000 | 0.766 | 989.216 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.069 | 2.934 | 0.003 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a706000000000000010d | 991.381 | 3.060 | n/a | 0.000 | 0.000 | 0.459 | 987.724 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.067 | 3.060 | 0.003 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a70600000000000000d8 | 987.162 | 3.430 | n/a | 0.476 | 0.000 | 0.409 | 982.695 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.079 | 3.906 | 0.004 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000000102 | 912.797 | 2.335 | n/a | 0.000 | 0.000 | 2.234 | 908.061 | 0.009 | n/a | 0.095 | 0.000 | n/a | n/a | 0.063 | 2.335 | 0.003 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a70600000000000000df | 897.975 | 8.727 | n/a | 0.607 | 0.000 | 1.009 | 887.386 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.200 | 9.333 | 0.010 | 0.200 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a7060000000000000101 | 893.634 | 2.981 | n/a | 0.626 | 0.000 | 0.634 | 889.228 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.093 | 3.608 | 0.004 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a70600000000000000e4 | 700.954 | 3.227 | n/a | 1.185 | 0.000 | 1.984 | 694.354 | 0.024 | n/a | 0.100 | 0.000 | n/a | n/a | 0.080 | 4.412 | 0.006 | 0.080 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a70600000000000000d9 | 697.006 | 5.589 | n/a | 0.733 | 0.000 | 1.935 | 688.562 | 0.018 | n/a | 0.078 | 0.000 | n/a | n/a | 0.092 | 6.322 | 0.009 | 0.092 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000000ea | 673.794 | 2.238 | n/a | 0.000 | 0.000 | 1.027 | 670.346 | 0.019 | n/a | 0.095 | 0.000 | n/a | n/a | 0.070 | 2.238 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000000fa | 652.046 | 5.253 | n/a | 0.546 | 0.000 | 0.677 | 645.350 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.146 | 5.799 | 0.009 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a70600000000000000d2 | 541.229 | 4.172 | n/a | 0.436 | 0.000 | 0.473 | 535.996 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.073 | 4.608 | 0.009 | 0.073 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000000e5 | 511.479 | 3.662 | n/a | 0.546 | 0.000 | 0.692 | 506.405 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.085 | 4.208 | 0.008 | 0.085 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a7060000000000000106 | 477.866 | 4.477 | n/a | 0.562 | 0.000 | 0.917 | 471.770 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.072 | 5.039 | 0.011 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a7060000000000000107 | 464.881 | 14.275 | n/a | 1.724 | 0.000 | 0.833 | 447.781 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.177 | 16.000 | 0.034 | 0.177 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 450.203 | n/a | n/a | n/a | 3.565 | n/a | 0.000 | 0.000 | 0.693 | 436.194 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.075 | 3.690 | 0.009 | 0.075 |
| p99 | 1004.367 | n/a | n/a | n/a | 12.405 | n/a | 1.050 | 0.000 | 4.176 | 1001.040 | 1.051 | n/a | 0.162 | 0.000 | n/a | n/a | 1.096 | 13.136 | 0.104 | 1.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a706000000000000012b | 1004.367 | 5.602 | n/a | 1.050 | 0.000 | 0.577 | 996.928 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.150 | 6.653 | 0.007 | 0.150 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a7060000000000000125 | 1002.844 | 0.106 | n/a | 0.000 | 0.000 | 0.439 | 1001.040 | 0.033 | n/a | 0.129 | 0.000 | n/a | n/a | 1.096 | 0.106 | 0.000 | 1.096 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000137 | 997.668 | 2.612 | n/a | 0.000 | 0.000 | 1.125 | 993.816 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.065 | 2.612 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000114 | 996.793 | 4.396 | n/a | 0.000 | 0.000 | 0.939 | 991.290 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.075 | 4.396 | 0.004 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a706000000000000011c | 990.541 | 3.730 | n/a | 0.000 | 0.000 | 0.638 | 985.910 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.224 | 3.730 | 0.004 | 0.224 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a706000000000000012a | 984.320 | 2.573 | n/a | 0.000 | 0.000 | 0.605 | 980.998 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.073 | 2.573 | 0.003 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000000111 | 949.002 | 2.178 | n/a | 0.000 | 0.000 | 1.845 | 944.835 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.062 | 2.178 | 0.002 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a706000000000000011d | 857.074 | 2.084 | n/a | 0.000 | 0.000 | 0.457 | 854.403 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.070 | 2.084 | 0.002 | 0.070 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000140 | 845.207 | 4.900 | n/a | 0.000 | 0.000 | 0.921 | 839.122 | 0.017 | n/a | 0.072 | 0.000 | n/a | n/a | 0.175 | 4.900 | 0.006 | 0.175 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a7060000000000000127 | 844.000 | 6.981 | n/a | 0.657 | 0.000 | 0.883 | 835.308 | 0.009 | n/a | 0.091 | 0.000 | n/a | n/a | 0.070 | 7.638 | 0.009 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a706000000000000010e | 811.035 | 6.450 | n/a | 0.954 | 0.000 | 0.384 | 803.004 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.184 | 7.404 | 0.009 | 0.184 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000134 | 808.039 | 5.631 | n/a | 0.000 | 0.000 | 0.695 | 801.520 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.144 | 5.631 | 0.007 | 0.144 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000141 | 745.475 | 4.083 | n/a | 0.000 | 0.000 | 3.215 | 737.921 | 0.013 | n/a | 0.162 | 0.000 | n/a | n/a | 0.082 | 4.083 | 0.005 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000000138 | 694.954 | 9.501 | n/a | 0.850 | 0.000 | 0.486 | 683.945 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.106 | 10.351 | 0.015 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a7060000000000000148 | 636.666 | 5.363 | n/a | 0.000 | 0.000 | 0.774 | 630.302 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.177 | 5.363 | 0.008 | 0.177 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a7060000000000000133 | 608.526 | 5.329 | n/a | 0.000 | 0.000 | 0.728 | 602.296 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.143 | 5.329 | 0.009 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a706000000000000013c | 593.089 | 2.591 | n/a | 0.000 | 0.000 | 0.606 | 589.790 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.060 | 2.591 | 0.004 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a7060000000000000123 | 554.403 | 2.937 | n/a | 0.000 | 0.000 | 0.570 | 550.767 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.072 | 2.937 | 0.005 | 0.072 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a706000000000000012d | 530.619 | 4.672 | n/a | 0.000 | 0.000 | 1.079 | 524.746 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.071 | 4.672 | 0.009 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a706000000000000012c | 481.533 | 2.671 | n/a | 0.000 | 0.000 | 4.176 | 474.559 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.077 | 2.671 | 0.006 | 0.077 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 448.080 | n/a | n/a | n/a | 2.686 | n/a | 0.000 | 0.000 | 0.634 | 444.799 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.070 | 2.686 | 0.008 | 0.070 |
| p99 | 1003.942 | n/a | n/a | n/a | 9.403 | n/a | 0.688 | 0.000 | 5.192 | 1001.000 | 0.068 | n/a | 0.071 | 0.000 | n/a | n/a | 1.111 | 9.950 | 0.613 | 1.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a7060000000000000185 | 1003.942 | 0.157 | n/a | 0.000 | 0.000 | 1.865 | 1000.771 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 1.111 | 0.157 | 0.000 | 1.111 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000163 | 1002.705 | 0.096 | n/a | 0.000 | 0.000 | 0.438 | 1001.000 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 1.094 | 0.096 | 0.000 | 1.094 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a706000000000000017d | 1002.224 | 0.106 | n/a | 0.000 | 0.000 | 0.400 | 1000.608 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 1.059 | 0.106 | 0.000 | 1.059 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a706000000000000016d | 1000.072 | 2.507 | n/a | 0.000 | 0.000 | 0.366 | 997.080 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.070 | 2.507 | 0.003 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000153 | 988.979 | 2.686 | n/a | 0.000 | 0.000 | 0.948 | 985.242 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.080 | 2.686 | 0.003 | 0.080 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a7060000000000000184 | 986.860 | 2.370 | n/a | 0.000 | 0.000 | 0.657 | 983.692 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.068 | 2.370 | 0.002 | 0.068 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000154 | 861.116 | 2.201 | n/a | 0.000 | 0.000 | 4.817 | 853.950 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.068 | 2.201 | 0.003 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000172 | 850.876 | 2.639 | n/a | 0.000 | 0.000 | 0.388 | 847.754 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.057 | 2.639 | 0.003 | 0.057 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000159 | 720.694 | 2.686 | n/a | 0.000 | 0.000 | 0.793 | 717.089 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.069 | 2.686 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a706000000000000014e | 718.685 | 1.986 | n/a | 0.000 | 0.000 | 0.388 | 716.177 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.066 | 1.986 | 0.003 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000178 | 717.682 | 2.646 | n/a | 0.000 | 0.000 | 0.541 | 714.369 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.065 | 2.646 | 0.004 | 0.065 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000165 | 654.152 | 6.585 | n/a | 0.617 | 0.000 | 0.479 | 646.371 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.078 | 7.202 | 0.011 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a706000000000000016e | 539.351 | 5.599 | n/a | 0.688 | 0.000 | 0.594 | 532.348 | 0.012 | n/a | 0.037 | 0.000 | n/a | n/a | 0.074 | 6.286 | 0.012 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a7060000000000000182 | 532.110 | 4.957 | n/a | 0.000 | 0.000 | 0.751 | 526.161 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.196 | 4.957 | 0.009 | 0.196 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000000174 | 522.347 | 3.822 | n/a | 0.000 | 0.000 | 4.347 | 514.031 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.114 | 3.822 | 0.007 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a706000000000000016c | 521.152 | 4.176 | n/a | 0.000 | 0.000 | 0.602 | 516.249 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.075 | 4.176 | 0.008 | 0.075 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a7060000000000000187 | 518.079 | 4.950 | n/a | 0.000 | 0.000 | 0.582 | 512.414 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.111 | 4.950 | 0.010 | 0.111 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a706000000000000017a | 498.319 | 2.015 | n/a | 0.000 | 0.000 | 3.032 | 493.173 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.068 | 2.015 | 0.004 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000000149 | 485.432 | 3.399 | n/a | 0.000 | 0.000 | 0.700 | 481.135 | 0.068 | n/a | 0.050 | 0.000 | n/a | n/a | 0.080 | 3.399 | 0.007 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a7060000000000000175 | 477.190 | 2.721 | n/a | 0.000 | 0.000 | 0.349 | 474.008 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.086 | 2.721 | 0.006 | 0.086 | gw-r/thread-43/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 313.139 | n/a | n/a | n/a | 2.913 | n/a | 0.000 | 0.000 | 0.475 | 309.788 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.070 | 3.049 | 0.013 | 0.070 |
| p99 | 1005.562 | n/a | n/a | n/a | 11.390 | n/a | 3.010 | 0.000 | 3.230 | 1000.692 | 3.767 | n/a | 0.083 | 0.000 | n/a | n/a | 1.125 | 12.082 | 0.716 | 1.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a70600000000000001a7 | 1005.562 | 4.171 | n/a | 0.000 | 0.000 | 2.063 | 999.220 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.062 | 4.171 | 0.004 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000001c3 | 1002.464 | 0.129 | n/a | 0.000 | 0.000 | 0.456 | 1000.692 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 1.125 | 0.129 | 0.000 | 1.125 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a706000000000000018a | 1002.010 | 0.105 | n/a | 0.000 | 0.000 | 0.337 | 1000.438 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 1.095 | 0.105 | 0.000 | 1.095 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000001c5 | 997.963 | 2.875 | n/a | 0.000 | 0.000 | 0.367 | 994.615 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.070 | 2.875 | 0.003 | 0.070 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a70600000000000001a6 | 986.905 | 2.651 | n/a | 0.563 | 0.000 | 0.946 | 982.618 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.096 | 3.215 | 0.003 | 0.096 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a706000000000000019a | 975.778 | 2.913 | n/a | 0.000 | 0.000 | 0.467 | 972.288 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.082 | 2.913 | 0.003 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a70600000000000001d5 | 865.754 | 2.049 | n/a | 0.000 | 0.000 | 0.368 | 863.129 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.179 | 2.049 | 0.002 | 0.179 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a706000000000000019c | 848.982 | 4.129 | n/a | 0.000 | 0.000 | 0.452 | 844.301 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.066 | 4.129 | 0.005 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a70600000000000001a4 | 834.176 | 2.551 | n/a | 0.000 | 0.000 | 0.624 | 830.858 | 0.025 | n/a | 0.060 | 0.000 | n/a | n/a | 0.059 | 2.551 | 0.003 | 0.059 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000001a0 | 740.978 | 4.073 | n/a | 2.788 | 0.000 | 1.918 | 732.037 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.110 | 6.861 | 0.009 | 0.110 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000001c6 | 718.570 | 2.761 | n/a | 0.000 | 0.000 | 0.431 | 715.285 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.069 | 2.761 | 0.004 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a70600000000000001af | 694.859 | 8.066 | n/a | 0.907 | 0.000 | 0.665 | 685.075 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.113 | 8.973 | 0.013 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000001c1 | 682.445 | 5.142 | n/a | 0.000 | 0.000 | 0.565 | 676.546 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.163 | 5.142 | 0.008 | 0.163 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000001a8 | 674.006 | 3.521 | n/a | 0.000 | 0.000 | 0.550 | 669.804 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.072 | 3.521 | 0.005 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a70600000000000001b6 | 565.372 | 5.380 | n/a | 0.000 | 0.000 | 0.628 | 559.147 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.175 | 5.380 | 0.010 | 0.175 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000001d2 | 542.546 | 2.519 | n/a | 0.000 | 0.000 | 0.652 | 539.273 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 0.070 | 2.519 | 0.005 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000001b7 | 517.349 | 11.390 | n/a | 0.692 | 0.000 | 0.775 | 504.337 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.128 | 12.082 | 0.023 | 0.128 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000001b8 | 487.661 | 2.887 | n/a | 0.000 | 0.000 | 0.410 | 484.256 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.066 | 2.887 | 0.006 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a70600000000000001cf | 463.603 | 2.544 | n/a | 0.000 | 0.000 | 0.399 | 460.545 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.060 | 2.544 | 0.005 | 0.060 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000195 | 444.801 | 2.218 | n/a | 0.000 | 0.000 | 0.626 | 441.833 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.068 | 2.218 | 0.005 | 0.068 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 303.918 | n/a | n/a | n/a | 2.562 | n/a | 0.000 | 0.000 | 0.621 | 300.365 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.069 | 2.562 | 0.009 | 0.069 |
| p99 | 1003.420 | n/a | n/a | n/a | 8.208 | n/a | 0.000 | 0.000 | 5.069 | 1001.074 | 0.082 | n/a | 0.071 | 0.000 | n/a | n/a | 1.104 | 8.208 | 0.530 | 1.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a70600000000000001ea | 1003.420 | 0.118 | n/a | 0.000 | 0.000 | 1.606 | 1000.544 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.104 | 0.118 | 0.000 | 1.104 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000217 | 1002.677 | 0.094 | n/a | 0.000 | 0.000 | 0.379 | 1001.074 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 1.063 | 0.094 | 0.000 | 1.063 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000000213 | 1001.881 | 2.300 | n/a | 0.000 | 0.000 | 0.670 | 998.805 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.065 | 2.300 | 0.002 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000212 | 996.180 | 4.827 | n/a | 0.000 | 0.000 | 0.626 | 990.478 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.198 | 4.827 | 0.005 | 0.198 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000001ff | 995.573 | 2.389 | n/a | 0.000 | 0.000 | 0.555 | 992.515 | 0.022 | n/a | 0.028 | 0.000 | n/a | n/a | 0.064 | 2.389 | 0.002 | 0.064 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000219 | 992.278 | 3.769 | n/a | 0.000 | 0.000 | 0.573 | 987.823 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.076 | 3.769 | 0.004 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a7060000000000000200 | 909.395 | 2.240 | n/a | 0.000 | 0.000 | 3.084 | 903.948 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.073 | 2.240 | 0.002 | 0.073 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a7060000000000000216 | 870.332 | 2.198 | n/a | 0.000 | 0.000 | 1.365 | 866.685 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.054 | 2.198 | 0.003 | 0.054 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000203 | 848.332 | 2.530 | n/a | 0.000 | 0.000 | 0.486 | 845.203 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.069 | 2.530 | 0.003 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a7060000000000000207 | 832.816 | 2.236 | n/a | 0.000 | 0.000 | 0.534 | 829.937 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.065 | 2.236 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a70600000000000001dd | 822.920 | 3.329 | n/a | 0.000 | 0.000 | 0.751 | 818.727 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.069 | 3.329 | 0.004 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a70600000000000001f1 | 795.324 | 2.595 | n/a | 0.000 | 0.000 | 0.488 | 792.144 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.063 | 2.595 | 0.003 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000001f8 | 737.062 | 2.443 | n/a | 0.000 | 0.000 | 0.360 | 734.165 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.066 | 2.443 | 0.003 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000001fa | 620.747 | 1.966 | n/a | 0.000 | 0.000 | 0.422 | 618.257 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.066 | 1.966 | 0.003 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000001d9 | 618.393 | 3.374 | n/a | 0.000 | 0.000 | 0.544 | 614.368 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.065 | 3.374 | 0.005 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000001f6 | 587.949 | 2.429 | n/a | 0.000 | 0.000 | 0.459 | 584.980 | 0.002 | n/a | 0.014 | 0.000 | n/a | n/a | 0.065 | 2.429 | 0.004 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000001e9 | 553.724 | 2.258 | n/a | 0.000 | 0.000 | 0.660 | 550.667 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.089 | 2.258 | 0.004 | 0.089 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a70600000000000001e2 | 465.043 | 5.030 | n/a | 0.000 | 0.000 | 5.069 | 454.831 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.077 | 5.030 | 0.011 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000001f0 | 403.015 | 7.456 | n/a | 0.000 | 0.000 | 0.449 | 394.966 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.102 | 7.456 | 0.019 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a7060000000000000211 | 396.687 | 4.626 | n/a | 0.000 | 0.000 | 0.819 | 391.042 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.171 | 4.626 | 0.012 | 0.171 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / internal (757 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.047 | n/a | n/a | n/a | 2.969 | n/a | 0.000 | 0.000 | 0.511 | 9.618 | 0.003 | n/a | 0.015 | 0.000 | n/a | n/a | 0.070 | 2.969 | 0.250 | 0.070 |
| p99 | 116.080 | n/a | n/a | n/a | 13.951 | n/a | 1.095 | 0.000 | 5.043 | 110.678 | 0.296 | n/a | 0.079 | 0.000 | n/a | n/a | 0.526 | 14.068 | 0.824 | 0.526 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a706000000000000021a | 973.158 | 1.564 | n/a | 0.000 | 0.000 | 0.364 | 971.140 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.064 | 1.564 | 0.002 | 0.064 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a7060000000000000225 | 966.988 | 2.251 | n/a | 0.000 | 0.000 | 0.529 | 964.073 | 0.024 | n/a | 0.047 | 0.000 | n/a | n/a | 0.063 | 2.251 | 0.002 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000226 | 966.494 | 3.524 | n/a | 0.000 | 0.000 | 3.943 | 958.821 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.166 | 3.524 | 0.004 | 0.166 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a706000000000000021d | 823.420 | 2.339 | n/a | 0.000 | 0.000 | 0.405 | 820.594 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.050 | 2.339 | 0.003 | 0.050 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000000221 | 785.398 | 3.671 | n/a | 0.000 | 0.000 | 0.469 | 781.078 | 0.003 | n/a | 0.051 | 0.000 | n/a | n/a | 0.126 | 3.671 | 0.005 | 0.126 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a706000000000000021e | 200.010 | 3.805 | n/a | 0.000 | 0.000 | 0.612 | 195.483 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.073 | 3.805 | 0.019 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a7060000000000000224 | 177.310 | 2.218 | n/a | 0.000 | 0.000 | 0.569 | 174.435 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.072 | 2.218 | 0.013 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a70600000000000004ec | 116.080 | 4.963 | n/a | 0.000 | 0.000 | 0.304 | 110.678 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.082 | 4.963 | 0.043 | 0.082 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a706000000000000075f | 93.338 | 5.697 | n/a | 0.000 | 0.000 | 0.574 | 86.976 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 0.083 | 5.697 | 0.061 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a70600000000000002f7 | 90.756 | 6.197 | n/a | 1.099 | 0.000 | 0.568 | 82.712 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.166 | 7.296 | 0.080 | 0.166 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a70600000000000007a4 | 89.585 | 3.890 | n/a | 0.000 | 0.000 | 0.567 | 85.015 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.074 | 3.890 | 0.043 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000005f0 | 87.078 | 3.474 | n/a | 0.000 | 0.000 | 0.437 | 83.067 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.055 | 3.474 | 0.040 | 0.055 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000000471 | 86.280 | 6.278 | n/a | 0.000 | 0.000 | 0.396 | 79.480 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.113 | 6.278 | 0.073 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000639 | 82.371 | 3.233 | n/a | 0.000 | 0.000 | 0.476 | 78.577 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.059 | 3.233 | 0.039 | 0.059 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000000499 | 80.875 | 8.168 | n/a | 0.981 | 0.000 | 0.774 | 70.787 | 0.002 | n/a | 0.013 | 0.000 | n/a | n/a | 0.149 | 9.149 | 0.113 | 0.149 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a70600000000000004f7 | 77.350 | 4.568 | n/a | 0.000 | 0.000 | 0.577 | 72.000 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.196 | 4.568 | 0.059 | 0.196 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a706000000000000068f | 76.737 | 6.190 | n/a | 0.000 | 0.000 | 0.423 | 69.994 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.104 | 6.190 | 0.081 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a706000000000000076b | 74.193 | 3.657 | n/a | 0.000 | 0.000 | 0.648 | 69.727 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.120 | 3.657 | 0.049 | 0.120 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a706000000000000079c | 73.678 | 5.504 | n/a | 1.097 | 0.000 | 0.608 | 66.300 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.159 | 6.602 | 0.090 | 0.159 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a7060000000000000411 | 71.202 | 9.918 | n/a | 0.622 | 0.000 | 0.516 | 60.051 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.085 | 10.539 | 0.148 | 0.085 | gw-r/thread-41/journal/page | none observed |

## P3 / tail / internal (2336 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.104 | n/a | n/a | n/a | 3.708 | n/a | 0.000 | 0.000 | 0.427 | 7.844 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.084 | 3.713 | 0.308 | 0.084 |
| p99 | 344.811 | n/a | n/a | n/a | 14.885 | n/a | 1.296 | 0.000 | 4.244 | 330.822 | 0.302 | n/a | 0.046 | 0.000 | n/a | n/a | 1.129 | 15.539 | 0.849 | 1.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 063ba0585c12a7060000000000001ac1 | 1002.694 | 0.098 | n/a | 0.000 | 0.000 | 0.346 | 1001.017 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 1.175 | 0.098 | 0.000 | 1.175 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000001b0e | 1002.317 | 0.122 | n/a | 0.000 | 0.000 | 0.498 | 1000.423 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 1.241 | 0.122 | 0.000 | 1.241 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000001ac6 | 992.385 | 2.220 | n/a | 0.000 | 0.000 | 0.286 | 989.772 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.053 | 2.220 | 0.002 | 0.053 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a7060000000000001ac3 | 991.960 | 7.861 | n/a | 1.021 | 0.000 | 0.269 | 982.510 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.279 | 8.882 | 0.009 | 0.279 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a7060000000000001b09 | 987.996 | 2.303 | n/a | 0.000 | 0.000 | 0.522 | 985.088 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.055 | 2.303 | 0.002 | 0.055 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000001b06 | 905.025 | 2.785 | n/a | 0.000 | 0.000 | 0.460 | 901.627 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.127 | 2.785 | 0.003 | 0.127 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a7060000000000001aca | 900.520 | 2.563 | n/a | 0.000 | 0.000 | 0.663 | 897.194 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.064 | 2.563 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a7060000000000001ae3 | 871.905 | 2.414 | n/a | 0.000 | 0.000 | 0.395 | 869.011 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.072 | 2.414 | 0.003 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 063ba0585c12a7060000000000001ad5 | 865.656 | 2.653 | n/a | 0.000 | 0.000 | 0.406 | 862.475 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.089 | 2.653 | 0.003 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 063ba0585c12a7060000000000001b04 | 827.483 | 2.148 | n/a | 0.000 | 0.000 | 0.972 | 824.280 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.055 | 2.148 | 0.003 | 0.055 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000001abf | 799.004 | 2.191 | n/a | 0.000 | 0.000 | 0.308 | 796.391 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.055 | 2.191 | 0.003 | 0.055 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000001acc | 731.421 | 3.268 | n/a | 0.000 | 0.000 | 0.256 | 727.738 | 0.004 | n/a | 0.016 | 0.000 | n/a | n/a | 0.139 | 3.268 | 0.004 | 0.139 | gw-r/thread-43/journal/page | none observed |
| 063ba0585c12a7060000000000001b00 | 722.062 | 2.051 | n/a | 0.000 | 0.000 | 0.354 | 719.559 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.067 | 2.051 | 0.003 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000001ae8 | 707.011 | 8.077 | n/a | 1.082 | 0.000 | 0.510 | 697.067 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.229 | 9.158 | 0.013 | 0.229 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a7060000000000001ae7 | 645.693 | 4.492 | n/a | 0.000 | 0.000 | 0.564 | 640.509 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.101 | 4.492 | 0.007 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 063ba0585c12a7060000000000001af6 | 605.385 | 2.765 | n/a | 0.000 | 0.000 | 0.350 | 602.157 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.062 | 2.765 | 0.005 | 0.062 | gw-r/thread-41/journal/page | none observed |
| 063ba0585c12a7060000000000001ae1 | 590.384 | 3.867 | n/a | 0.000 | 0.000 | 1.452 | 584.973 | 0.011 | n/a | 0.014 | 0.000 | n/a | n/a | 0.066 | 3.867 | 0.007 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a7060000000000001afb | 583.796 | 4.743 | n/a | 0.000 | 0.000 | 0.411 | 578.464 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.125 | 4.743 | 0.008 | 0.125 | gw-r/thread-46/journal/page | none observed |
| 063ba0585c12a7060000000000001adb | 433.705 | 2.235 | n/a | 0.000 | 0.000 | 0.324 | 431.082 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.050 | 2.235 | 0.005 | 0.050 | gw-r/thread-47/journal/page | none observed |
| 063ba0585c12a7060000000000001ad9 | 401.593 | 1.782 | n/a | 0.000 | 0.000 | 0.405 | 399.320 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.055 | 1.782 | 0.004 | 0.055 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / read (77 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.187 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.770 | 201.059 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 0.078 | 0.039 | 0.000 | 0.078 |
| p99 | 210.251 | n/a | n/a | n/a | 0.130 | n/a | 0.000 | 0.000 | 8.012 | 206.315 | 3.529 | n/a | 1.093 | 0.000 | n/a | n/a | 0.503 | 0.130 | 0.002 | 0.503 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 155bd958e09c272c000000000000002f | 210.251 | 0.037 | n/a | 0.000 | 0.000 | 8.012 | 201.875 | 0.018 | n/a | 0.228 | 0.000 | n/a | n/a | 0.081 | 0.037 | 0.000 | 0.081 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000010 | 207.501 | 0.038 | n/a | 0.000 | 0.000 | 0.776 | 206.315 | 0.018 | n/a | 0.268 | 0.000 | n/a | n/a | 0.086 | 0.038 | 0.000 | 0.086 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000027 | 205.923 | 0.031 | n/a | 0.000 | 0.000 | 0.551 | 205.019 | 0.023 | n/a | 0.232 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000007 | 205.585 | 0.039 | n/a | 0.000 | 0.000 | 0.783 | 204.434 | 0.011 | n/a | 0.149 | 0.000 | n/a | n/a | 0.169 | 0.039 | 0.000 | 0.169 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000008 | 205.221 | 0.033 | n/a | 0.000 | 0.000 | 0.951 | 203.989 | 0.013 | n/a | 0.146 | 0.000 | n/a | n/a | 0.088 | 0.033 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000031 | 205.188 | 0.033 | n/a | 0.000 | 0.000 | 2.045 | 202.834 | 0.017 | n/a | 0.162 | 0.000 | n/a | n/a | 0.096 | 0.033 | 0.000 | 0.096 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000059 | 205.076 | 0.039 | n/a | 0.000 | 0.000 | 3.870 | 200.943 | 0.013 | n/a | 0.124 | 0.000 | n/a | n/a | 0.087 | 0.039 | 0.000 | 0.087 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000049 | 204.861 | 0.032 | n/a | 0.000 | 0.000 | 3.085 | 201.524 | 0.015 | n/a | 0.132 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c000000000000001c | 204.730 | 0.031 | n/a | 0.000 | 0.000 | 0.662 | 203.894 | 0.012 | n/a | 0.055 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000043 | 204.416 | 0.053 | n/a | 0.000 | 0.000 | 1.626 | 202.393 | 0.015 | n/a | 0.151 | 0.000 | n/a | n/a | 0.178 | 0.053 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c000000000000003b | 204.373 | 0.028 | n/a | 0.000 | 0.000 | 2.661 | 201.412 | 0.034 | n/a | 0.173 | 0.000 | n/a | n/a | 0.064 | 0.028 | 0.000 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c000000000000001b | 204.359 | 0.031 | n/a | 0.000 | 0.000 | 3.082 | 200.976 | 0.018 | n/a | 0.178 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000009 | 204.097 | 0.067 | n/a | 0.000 | 0.000 | 2.448 | 200.925 | 0.011 | n/a | 0.143 | 0.000 | n/a | n/a | 0.503 | 0.067 | 0.000 | 0.503 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000039 | 203.889 | 0.046 | n/a | 0.000 | 0.000 | 0.795 | 202.753 | 0.028 | n/a | 0.137 | 0.000 | n/a | n/a | 0.129 | 0.046 | 0.000 | 0.129 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000021 | 203.871 | 0.040 | n/a | 0.000 | 0.000 | 2.344 | 201.192 | 0.014 | n/a | 0.199 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000032 | 203.738 | 0.045 | n/a | 0.000 | 0.000 | 0.927 | 202.338 | 0.020 | n/a | 0.208 | 0.000 | n/a | n/a | 0.200 | 0.045 | 0.000 | 0.200 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c000000000000000f | 203.563 | 0.042 | n/a | 0.000 | 0.000 | 0.992 | 202.311 | 0.018 | n/a | 0.107 | 0.000 | n/a | n/a | 0.092 | 0.042 | 0.000 | 0.092 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000016 | 203.531 | 0.027 | n/a | 0.000 | 0.000 | 0.745 | 202.545 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.067 | 0.027 | 0.000 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c000000000000000e | 203.285 | 0.052 | n/a | 0.000 | 0.000 | 0.901 | 201.921 | 0.047 | n/a | 0.229 | 0.000 | n/a | n/a | 0.135 | 0.052 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000015 | 203.145 | 0.049 | n/a | 0.000 | 0.000 | 1.073 | 201.736 | 0.014 | n/a | 0.168 | 0.000 | n/a | n/a | 0.104 | 0.049 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.033 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.792 | 200.924 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 0.083 | 0.042 | 0.000 | 0.083 |
| p99 | 207.813 | n/a | n/a | n/a | 0.091 | n/a | 0.000 | 0.000 | 4.454 | 206.446 | 5.838 | n/a | 3.892 | 0.000 | n/a | n/a | 0.308 | 0.091 | 0.001 | 0.308 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 155bd958e09c272c00000000000000b7 | 207.813 | 0.033 | n/a | 0.000 | 0.000 | 2.331 | 205.203 | 0.013 | n/a | 0.160 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000078 | 207.257 | 0.037 | n/a | 0.000 | 0.000 | 0.595 | 206.446 | 0.016 | n/a | 0.089 | 0.000 | n/a | n/a | 0.074 | 0.037 | 0.000 | 0.074 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000090 | 207.109 | 0.053 | n/a | 0.000 | 0.000 | 2.324 | 204.530 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.127 | 0.053 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c00000000000000ad | 205.352 | 0.055 | n/a | 0.000 | 0.000 | 1.071 | 204.019 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 0.172 | 0.055 | 0.000 | 0.172 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c000000000000008b | 205.032 | 0.039 | n/a | 0.000 | 0.000 | 0.705 | 204.071 | 0.015 | n/a | 0.108 | 0.000 | n/a | n/a | 0.094 | 0.039 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000064 | 205.019 | 0.062 | n/a | 0.000 | 0.000 | 0.930 | 203.750 | 0.013 | n/a | 0.046 | 0.000 | n/a | n/a | 0.218 | 0.062 | 0.000 | 0.218 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c00000000000000c6 | 204.451 | 0.029 | n/a | 0.000 | 0.000 | 0.562 | 203.589 | 0.046 | n/a | 0.154 | 0.000 | n/a | n/a | 0.072 | 0.029 | 0.000 | 0.072 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c000000000000006e | 204.450 | 0.031 | n/a | 0.000 | 0.000 | 2.973 | 201.202 | 0.017 | n/a | 0.155 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c000000000000007c | 204.274 | 0.033 | n/a | 0.000 | 0.000 | 1.397 | 202.641 | 0.014 | n/a | 0.111 | 0.000 | n/a | n/a | 0.077 | 0.033 | 0.000 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000088 | 204.154 | 0.028 | n/a | 0.000 | 0.000 | 2.164 | 201.700 | 0.045 | n/a | 0.148 | 0.000 | n/a | n/a | 0.068 | 0.028 | 0.000 | 0.068 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000066 | 204.097 | 0.031 | n/a | 0.000 | 0.000 | 0.766 | 199.200 | 0.023 | n/a | 3.892 | 0.000 | n/a | n/a | 0.185 | 0.031 | 0.000 | 0.185 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c000000000000005e | 203.854 | 0.031 | n/a | 0.000 | 0.000 | 2.077 | 201.555 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c00000000000000ba | 203.762 | 0.028 | n/a | 0.000 | 0.000 | 0.781 | 202.620 | 0.017 | n/a | 0.245 | 0.000 | n/a | n/a | 0.070 | 0.028 | 0.000 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000095 | 203.670 | 0.039 | n/a | 0.000 | 0.000 | 0.832 | 202.650 | 0.013 | n/a | 0.042 | 0.000 | n/a | n/a | 0.095 | 0.039 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000080 | 203.410 | 0.044 | n/a | 0.000 | 0.000 | 1.027 | 202.089 | 0.016 | n/a | 0.136 | 0.000 | n/a | n/a | 0.098 | 0.044 | 0.000 | 0.098 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000097 | 203.337 | 0.032 | n/a | 0.000 | 0.000 | 0.999 | 201.851 | 0.242 | n/a | 0.136 | 0.000 | n/a | n/a | 0.078 | 0.032 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000060 | 203.003 | 0.042 | n/a | 0.000 | 0.000 | 0.779 | 201.972 | 0.018 | n/a | 0.094 | 0.000 | n/a | n/a | 0.098 | 0.042 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000073 | 202.961 | 0.039 | n/a | 0.000 | 0.000 | 2.018 | 200.717 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.098 | 0.039 | 0.000 | 0.098 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c00000000000000b8 | 202.938 | 0.057 | n/a | 0.000 | 0.000 | 1.144 | 201.406 | 0.011 | n/a | 0.160 | 0.000 | n/a | n/a | 0.159 | 0.057 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c00000000000000bd | 202.909 | 0.055 | n/a | 0.000 | 0.000 | 1.315 | 201.233 | 0.011 | n/a | 0.121 | 0.000 | n/a | n/a | 0.174 | 0.055 | 0.000 | 0.174 | gw-r/thread-41/journal/page | none observed |

## P3 / L4 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.758 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.718 | 200.795 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.086 | 0.042 | 0.000 | 0.086 |
| p99 | 207.352 | n/a | n/a | n/a | 0.112 | n/a | 0.000 | 0.000 | 4.054 | 205.231 | 4.764 | n/a | 0.705 | 0.000 | n/a | n/a | 0.322 | 0.112 | 0.002 | 0.322 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 155bd958e09c272c00000000000000d9 | 207.352 | 0.036 | n/a | 0.000 | 0.000 | 1.926 | 205.148 | 0.042 | n/a | 0.114 | 0.000 | n/a | n/a | 0.086 | 0.036 | 0.000 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c00000000000000cf | 206.610 | 0.033 | n/a | 0.000 | 0.000 | 4.054 | 202.333 | 0.007 | n/a | 0.093 | 0.000 | n/a | n/a | 0.090 | 0.033 | 0.000 | 0.090 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c00000000000000e6 | 206.094 | 0.062 | n/a | 0.000 | 0.000 | 2.366 | 203.370 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.182 | 0.062 | 0.000 | 0.182 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000112 | 205.953 | 0.025 | n/a | 0.000 | 0.000 | 0.490 | 205.231 | 0.013 | n/a | 0.132 | 0.000 | n/a | n/a | 0.062 | 0.025 | 0.000 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c000000000000012c | 205.777 | 0.028 | n/a | 0.000 | 0.000 | 0.784 | 204.716 | 0.031 | n/a | 0.156 | 0.000 | n/a | n/a | 0.063 | 0.028 | 0.000 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c00000000000000e7 | 205.238 | 0.031 | n/a | 0.000 | 0.000 | 1.729 | 203.259 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.080 | 0.031 | 0.000 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c000000000000010f | 205.222 | 0.042 | n/a | 0.000 | 0.000 | 0.704 | 204.317 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.097 | 0.042 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c00000000000000cb | 205.212 | 0.031 | n/a | 0.000 | 0.000 | 1.015 | 203.995 | 0.007 | n/a | 0.093 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c00000000000000fe | 205.079 | 0.048 | n/a | 0.000 | 0.000 | 0.779 | 204.102 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.114 | 0.048 | 0.000 | 0.114 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c00000000000000db | 203.584 | 0.028 | n/a | 0.000 | 0.000 | 2.238 | 201.128 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.066 | 0.028 | 0.000 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c00000000000000ce | 203.514 | 0.033 | n/a | 0.000 | 0.000 | 2.195 | 201.075 | 0.008 | n/a | 0.121 | 0.000 | n/a | n/a | 0.082 | 0.033 | 0.000 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000116 | 203.387 | 0.033 | n/a | 0.000 | 0.000 | 1.773 | 201.458 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c00000000000000f2 | 203.375 | 0.053 | n/a | 0.000 | 0.000 | 2.284 | 200.789 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.191 | 0.053 | 0.000 | 0.191 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c00000000000000f8 | 203.137 | 0.042 | n/a | 0.000 | 0.000 | 1.498 | 201.366 | 0.007 | n/a | 0.124 | 0.000 | n/a | n/a | 0.099 | 0.042 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c00000000000000f7 | 202.984 | 0.018 | n/a | 0.000 | 0.000 | 0.769 | 201.910 | 0.015 | n/a | 0.230 | 0.000 | n/a | n/a | 0.042 | 0.018 | 0.000 | 0.042 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c00000000000000d0 | 202.868 | 0.067 | n/a | 0.000 | 0.000 | 1.380 | 201.205 | 0.007 | n/a | 0.105 | 0.000 | n/a | n/a | 0.104 | 0.067 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c00000000000000fc | 202.842 | 0.054 | n/a | 0.000 | 0.000 | 1.192 | 201.133 | 0.011 | n/a | 0.131 | 0.000 | n/a | n/a | 0.322 | 0.054 | 0.000 | 0.322 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000109 | 202.778 | 0.048 | n/a | 0.000 | 0.000 | 1.075 | 201.355 | 0.011 | n/a | 0.167 | 0.000 | n/a | n/a | 0.121 | 0.048 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c00000000000000d1 | 202.697 | 0.086 | n/a | 0.000 | 0.000 | 1.045 | 201.319 | 0.014 | n/a | 0.133 | 0.000 | n/a | n/a | 0.100 | 0.086 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000129 | 202.495 | 0.038 | n/a | 0.000 | 0.000 | 0.667 | 201.616 | 0.030 | n/a | 0.071 | 0.000 | n/a | n/a | 0.072 | 0.038 | 0.000 | 0.072 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.588 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.661 | 200.769 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.082 | 0.041 | 0.000 | 0.082 |
| p99 | 208.103 | n/a | n/a | n/a | 0.097 | n/a | 0.000 | 0.000 | 4.293 | 204.233 | 6.493 | n/a | 3.016 | 0.000 | n/a | n/a | 0.192 | 0.097 | 0.001 | 0.192 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 155bd958e09c272c000000000000012e | 208.103 | 0.032 | n/a | 0.000 | 0.000 | 0.735 | 204.233 | 0.008 | n/a | 3.016 | 0.000 | n/a | n/a | 0.080 | 0.032 | 0.000 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c000000000000016a | 206.539 | 0.029 | n/a | 0.000 | 0.000 | 3.521 | 202.846 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.062 | 0.029 | 0.000 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000178 | 204.844 | 0.071 | n/a | 0.000 | 0.000 | 0.750 | 203.839 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.138 | 0.071 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000168 | 204.808 | 0.029 | n/a | 0.000 | 0.000 | 0.473 | 204.178 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.074 | 0.029 | 0.000 | 0.074 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000140 | 204.780 | 0.038 | n/a | 0.000 | 0.000 | 0.660 | 203.939 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.070 | 0.038 | 0.000 | 0.070 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c000000000000017b | 204.323 | 0.037 | n/a | 0.000 | 0.000 | 1.059 | 203.059 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.089 | 0.037 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000153 | 203.407 | 0.029 | n/a | 0.000 | 0.000 | 0.564 | 202.638 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c000000000000014d | 202.909 | 0.031 | n/a | 0.000 | 0.000 | 1.942 | 200.783 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.083 | 0.031 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c000000000000013c | 202.779 | 0.043 | n/a | 0.000 | 0.000 | 0.752 | 201.776 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.131 | 0.043 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c000000000000013e | 202.684 | 0.040 | n/a | 0.000 | 0.000 | 0.815 | 201.674 | 0.012 | n/a | 0.054 | 0.000 | n/a | n/a | 0.089 | 0.040 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000141 | 202.544 | 0.038 | n/a | 0.000 | 0.000 | 0.877 | 201.442 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.108 | 0.038 | 0.000 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000135 | 202.541 | 0.054 | n/a | 0.000 | 0.000 | 1.083 | 201.142 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.166 | 0.054 | 0.000 | 0.166 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c000000000000017f | 202.413 | 0.052 | n/a | 0.000 | 0.000 | 0.961 | 201.148 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.137 | 0.052 | 0.000 | 0.137 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000176 | 202.388 | 0.072 | n/a | 0.000 | 0.000 | 1.009 | 201.047 | 0.012 | n/a | 0.057 | 0.000 | n/a | n/a | 0.192 | 0.072 | 0.000 | 0.192 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c000000000000017e | 202.331 | 0.058 | n/a | 0.000 | 0.000 | 0.663 | 201.362 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.144 | 0.058 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c000000000000014f | 202.313 | 0.055 | n/a | 0.000 | 0.000 | 0.760 | 200.751 | 0.576 | n/a | 0.093 | 0.000 | n/a | n/a | 0.078 | 0.055 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000188 | 202.278 | 0.048 | n/a | 0.000 | 0.000 | 1.001 | 201.021 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.124 | 0.048 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000187 | 202.211 | 0.059 | n/a | 0.000 | 0.000 | 0.821 | 201.144 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.094 | 0.059 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000158 | 202.165 | 0.058 | n/a | 0.000 | 0.000 | 1.096 | 200.810 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.143 | 0.058 | 0.000 | 0.143 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000152 | 202.159 | 0.034 | n/a | 0.000 | 0.000 | 0.542 | 201.435 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.086 | 0.034 | 0.000 | 0.086 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.270 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.587 | 200.615 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 |
| p99 | 205.152 | n/a | n/a | n/a | 0.087 | n/a | 0.000 | 0.000 | 3.187 | 204.243 | 3.083 | n/a | 0.122 | 0.000 | n/a | n/a | 0.194 | 0.087 | 0.001 | 0.194 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 155bd958e09c272c00000000000001b0 | 205.562 | 0.034 | n/a | 0.000 | 0.000 | 0.582 | 204.771 | 0.014 | n/a | 0.073 | 0.000 | n/a | n/a | 0.089 | 0.034 | 0.000 | 0.089 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c000000000000019c | 205.152 | 0.030 | n/a | 0.000 | 0.000 | 0.637 | 204.243 | 0.010 | n/a | 0.173 | 0.000 | n/a | n/a | 0.060 | 0.030 | 0.000 | 0.060 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c00000000000001b4 | 205.141 | 0.029 | n/a | 0.000 | 0.000 | 4.162 | 200.814 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.069 | 0.029 | 0.000 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c00000000000001da | 204.397 | 0.040 | n/a | 0.000 | 0.000 | 3.187 | 201.003 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.092 | 0.040 | 0.000 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c00000000000001d9 | 203.706 | 0.045 | n/a | 0.000 | 0.000 | 2.460 | 201.034 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.088 | 0.045 | 0.000 | 0.088 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c00000000000001a3 | 202.823 | 0.030 | n/a | 0.000 | 0.000 | 1.353 | 201.299 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.066 | 0.030 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c00000000000001ef | 202.632 | 0.059 | n/a | 0.000 | 0.000 | 1.284 | 201.049 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.159 | 0.059 | 0.000 | 0.159 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000208 | 202.497 | 0.043 | n/a | 0.000 | 0.000 | 0.768 | 201.461 | 0.015 | n/a | 0.122 | 0.000 | n/a | n/a | 0.088 | 0.043 | 0.000 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000199 | 202.430 | 0.029 | n/a | 0.000 | 0.000 | 0.443 | 201.840 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c00000000000001f1 | 202.281 | 0.030 | n/a | 0.000 | 0.000 | 0.674 | 201.409 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c00000000000001c6 | 202.273 | 0.045 | n/a | 0.000 | 0.000 | 0.822 | 201.165 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.150 | 0.045 | 0.000 | 0.150 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000204 | 202.251 | 0.029 | n/a | 0.000 | 0.000 | 0.693 | 201.351 | 0.005 | n/a | 0.104 | 0.000 | n/a | n/a | 0.069 | 0.029 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c00000000000001c7 | 202.155 | 0.057 | n/a | 0.000 | 0.000 | 0.779 | 201.167 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.077 | 0.057 | 0.000 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c00000000000001ed | 202.141 | 0.084 | n/a | 0.000 | 0.000 | 1.108 | 200.725 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.158 | 0.084 | 0.000 | 0.158 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c00000000000001b6 | 202.139 | 0.029 | n/a | 0.000 | 0.000 | 0.931 | 201.054 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.070 | 0.029 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000201 | 202.075 | 0.062 | n/a | 0.000 | 0.000 | 1.087 | 200.719 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.147 | 0.062 | 0.000 | 0.147 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c00000000000001c0 | 202.055 | 0.073 | n/a | 0.000 | 0.000 | 1.123 | 200.627 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.193 | 0.073 | 0.000 | 0.193 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c00000000000001df | 202.033 | 0.034 | n/a | 0.000 | 0.000 | 0.665 | 201.169 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.075 | 0.034 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c00000000000001a4 | 201.984 | 0.027 | n/a | 0.000 | 0.000 | 0.856 | 200.962 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.064 | 0.027 | 0.000 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c00000000000001f5 | 201.979 | 0.088 | n/a | 0.000 | 0.000 | 1.073 | 200.594 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.171 | 0.088 | 0.000 | 0.171 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.408 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.621 | 200.668 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.069 | 0.039 | 0.000 | 0.069 |
| p99 | 204.148 | n/a | n/a | n/a | 0.091 | n/a | 0.000 | 0.000 | 3.466 | 201.825 | 0.365 | n/a | 0.117 | 0.000 | n/a | n/a | 0.178 | 0.091 | 0.001 | 0.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 155bd958e09c272c000000000000023f | 204.760 | 0.033 | n/a | 0.000 | 0.000 | 3.855 | 200.752 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.065 | 0.033 | 0.000 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000257 | 204.148 | 0.040 | n/a | 0.000 | 0.000 | 3.219 | 200.756 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.091 | 0.040 | 0.000 | 0.091 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000274 | 203.706 | 0.094 | n/a | 0.000 | 0.000 | 2.505 | 200.830 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.221 | 0.094 | 0.000 | 0.221 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c000000000000021c | 203.527 | 0.035 | n/a | 0.000 | 0.000 | 0.825 | 202.515 | 0.005 | n/a | 0.067 | 0.000 | n/a | n/a | 0.079 | 0.035 | 0.000 | 0.079 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000279 | 203.269 | 0.038 | n/a | 0.000 | 0.000 | 1.197 | 201.825 | 0.009 | n/a | 0.117 | 0.000 | n/a | n/a | 0.084 | 0.038 | 0.000 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c000000000000026f | 202.884 | 0.049 | n/a | 0.000 | 0.000 | 1.285 | 201.340 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.103 | 0.049 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000248 | 202.651 | 0.064 | n/a | 0.000 | 0.000 | 1.256 | 201.094 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.152 | 0.064 | 0.000 | 0.152 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000214 | 202.624 | 0.029 | n/a | 0.000 | 0.000 | 1.389 | 201.059 | 0.027 | n/a | 0.053 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000278 | 202.417 | 0.069 | n/a | 0.000 | 0.000 | 1.040 | 201.066 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.178 | 0.069 | 0.000 | 0.178 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c000000000000024d | 202.400 | 0.030 | n/a | 0.000 | 0.000 | 0.704 | 201.477 | 0.010 | n/a | 0.107 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000264 | 202.369 | 0.029 | n/a | 0.000 | 0.000 | 0.304 | 201.813 | 0.017 | n/a | 0.141 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000227 | 202.344 | 0.033 | n/a | 0.000 | 0.000 | 0.924 | 201.225 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.077 | 0.033 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c000000000000024a | 202.287 | 0.076 | n/a | 0.000 | 0.000 | 1.287 | 200.704 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.147 | 0.076 | 0.000 | 0.147 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c000000000000027a | 202.227 | 0.034 | n/a | 0.000 | 0.000 | 0.920 | 201.105 | 0.006 | n/a | 0.080 | 0.000 | n/a | n/a | 0.081 | 0.034 | 0.000 | 0.081 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000221 | 202.114 | 0.046 | n/a | 0.000 | 0.000 | 0.607 | 201.268 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.087 | 0.046 | 0.000 | 0.087 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c000000000000023c | 202.114 | 0.035 | n/a | 0.000 | 0.000 | 0.727 | 201.207 | 0.024 | n/a | 0.057 | 0.000 | n/a | n/a | 0.064 | 0.035 | 0.000 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c000000000000020d | 202.092 | 0.023 | n/a | 0.000 | 0.000 | 0.484 | 201.422 | 0.011 | n/a | 0.102 | 0.000 | n/a | n/a | 0.050 | 0.023 | 0.000 | 0.050 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c000000000000020e | 202.041 | 0.040 | n/a | 0.000 | 0.000 | 0.808 | 201.027 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000247 | 202.028 | 0.031 | n/a | 0.000 | 0.000 | 0.676 | 201.159 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000217 | 201.947 | 0.042 | n/a | 0.000 | 0.000 | 0.549 | 201.169 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.082 | 0.042 | 0.000 | 0.082 | gw-r/thread-41/journal/page | none observed |

## P3 / L1024 / read (71 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.641 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.530 | 68.115 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 0.047 | 0.001 | 0.063 |
| p99 | 203.100 | n/a | n/a | n/a | 0.106 | n/a | 0.000 | 0.000 | 4.001 | 201.570 | 4.331 | n/a | 0.108 | 0.000 | n/a | n/a | 0.198 | 0.106 | 0.007 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 155bd958e09c272c0000000000000288 | 203.100 | 0.037 | n/a | 0.000 | 0.000 | 2.019 | 200.887 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.075 | 0.037 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000295 | 202.583 | 0.034 | n/a | 0.000 | 0.000 | 0.786 | 201.570 | 0.009 | n/a | 0.108 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000289 | 202.448 | 0.062 | n/a | 0.000 | 0.000 | 0.899 | 201.226 | 0.013 | n/a | 0.092 | 0.000 | n/a | n/a | 0.156 | 0.062 | 0.000 | 0.156 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000294 | 202.437 | 0.077 | n/a | 0.000 | 0.000 | 1.151 | 200.924 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.198 | 0.077 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c000000000000027e | 202.132 | 0.022 | n/a | 0.000 | 0.000 | 0.745 | 201.228 | 0.006 | n/a | 0.082 | 0.000 | n/a | n/a | 0.049 | 0.022 | 0.000 | 0.049 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000282 | 202.085 | 0.043 | n/a | 0.000 | 0.000 | 0.940 | 200.949 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.079 | 0.043 | 0.000 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c000000000000028f | 201.929 | 0.046 | n/a | 0.000 | 0.000 | 0.843 | 200.876 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.095 | 0.046 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c000000000000028a | 201.887 | 0.045 | n/a | 0.000 | 0.000 | 0.866 | 200.817 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.088 | 0.045 | 0.000 | 0.088 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000290 | 201.881 | 0.063 | n/a | 0.000 | 0.000 | 0.919 | 200.682 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.171 | 0.063 | 0.000 | 0.171 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000293 | 201.791 | 0.028 | n/a | 0.000 | 0.000 | 0.565 | 201.050 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.076 | 0.028 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000292 | 201.748 | 0.035 | n/a | 0.000 | 0.000 | 0.812 | 200.761 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c000000000000027c | 201.616 | 0.027 | n/a | 0.000 | 0.000 | 0.383 | 201.070 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.063 | 0.027 | 0.000 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000283 | 201.611 | 0.045 | n/a | 0.000 | 0.000 | 0.755 | 200.679 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.095 | 0.045 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c000000000000027f | 201.502 | 0.039 | n/a | 0.000 | 0.000 | 0.686 | 200.641 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.079 | 0.039 | 0.000 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c000000000000028e | 201.478 | 0.030 | n/a | 0.000 | 0.000 | 0.474 | 200.826 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.093 | 0.030 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000284 | 201.436 | 0.028 | n/a | 0.000 | 0.000 | 0.443 | 200.824 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.062 | 0.028 | 0.000 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c000000000000028d | 201.182 | 0.028 | n/a | 0.000 | 0.000 | 0.569 | 200.492 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.060 | 0.028 | 0.000 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c000000000000027d | 201.128 | 0.020 | n/a | 0.000 | 0.000 | 0.406 | 200.628 | 0.007 | n/a | 0.019 | 0.000 | n/a | n/a | 0.049 | 0.020 | 0.000 | 0.049 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000286 | 194.750 | 0.053 | n/a | 0.000 | 0.000 | 0.480 | 193.724 | 0.419 | n/a | 0.008 | 0.000 | n/a | n/a | 0.066 | 0.053 | 0.000 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c000000000000028c | 173.459 | 0.041 | n/a | 0.000 | 0.000 | 0.428 | 172.891 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.054 | 0.041 | 0.000 | 0.054 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.843 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.453 | 82.443 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.061 | 0.039 | 0.000 | 0.061 |
| p99 | 201.939 | n/a | n/a | n/a | 0.096 | n/a | 0.000 | 0.000 | 2.980 | 201.027 | 0.926 | n/a | 0.094 | 0.000 | n/a | n/a | 0.175 | 0.096 | 0.002 | 0.175 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 155bd958e09c272c0000000000000eda | 202.118 | 0.031 | n/a | 0.000 | 0.000 | 0.581 | 201.320 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.082 | 0.031 | 0.000 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 155bd958e09c272c0000000000000f20 | 202.038 | 0.057 | n/a | 0.000 | 0.000 | 0.954 | 200.846 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.125 | 0.057 | 0.000 | 0.125 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000f33 | 201.939 | 0.067 | n/a | 0.000 | 0.000 | 0.780 | 200.900 | 0.015 | n/a | 0.056 | 0.000 | n/a | n/a | 0.122 | 0.067 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000edb | 201.938 | 0.040 | n/a | 0.000 | 0.000 | 0.828 | 200.939 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.086 | 0.040 | 0.000 | 0.086 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000f08 | 201.883 | 0.039 | n/a | 0.000 | 0.000 | 0.735 | 200.944 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.100 | 0.039 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000ece | 201.823 | 0.078 | n/a | 0.000 | 0.000 | 0.940 | 200.591 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.175 | 0.078 | 0.000 | 0.175 | gw-r/thread-43/journal/page | none observed |
| 155bd958e09c272c0000000000000f02 | 201.791 | 0.038 | n/a | 0.000 | 0.000 | 0.543 | 201.027 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.106 | 0.038 | 0.000 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000f2c | 201.727 | 0.052 | n/a | 0.000 | 0.000 | 0.901 | 200.543 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.189 | 0.052 | 0.000 | 0.189 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000f06 | 201.716 | 0.046 | n/a | 0.000 | 0.000 | 0.501 | 201.033 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.063 | 0.046 | 0.000 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000ed2 | 201.647 | 0.048 | n/a | 0.000 | 0.000 | 0.608 | 200.852 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.114 | 0.048 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000ecc | 201.606 | 0.035 | n/a | 0.000 | 0.000 | 1.020 | 200.421 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.094 | 0.035 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000f2b | 201.506 | 0.049 | n/a | 0.000 | 0.000 | 0.680 | 200.604 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.144 | 0.049 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 155bd958e09c272c0000000000000ee2 | 201.488 | 0.043 | n/a | 0.000 | 0.000 | 0.423 | 200.828 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.125 | 0.043 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000ee9 | 201.486 | 0.070 | n/a | 0.000 | 0.000 | 0.701 | 200.514 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.168 | 0.070 | 0.000 | 0.168 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000f1a | 201.464 | 0.039 | n/a | 0.000 | 0.000 | 0.628 | 200.656 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.093 | 0.039 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 155bd958e09c272c0000000000000eed | 201.456 | 0.023 | n/a | 0.000 | 0.000 | 0.570 | 200.755 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.057 | 0.023 | 0.000 | 0.057 | gw-r/thread-41/journal/page | none observed |
| 155bd958e09c272c0000000000000f16 | 201.421 | 0.028 | n/a | 0.000 | 0.000 | 0.303 | 200.956 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.064 | 0.028 | 0.000 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 155bd958e09c272c0000000000000f2a | 201.420 | 0.046 | n/a | 0.000 | 0.000 | 0.603 | 200.594 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.127 | 0.046 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000ed4 | 201.406 | 0.025 | n/a | 0.000 | 0.000 | 0.480 | 200.788 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.059 | 0.025 | 0.000 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 155bd958e09c272c0000000000000ef0 | 201.394 | 0.053 | n/a | 0.000 | 0.000 | 0.626 | 200.528 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.134 | 0.053 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

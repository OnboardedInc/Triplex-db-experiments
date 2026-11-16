# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (98.249 ms, trace `75750a6a969f78c5000000000000014d`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (33.807 ms, trace `75750a6a969f78c50000000000000103`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (97.668 ms, trace `75750a6a969f78c50000000000001f2d`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (80.056 ms, trace `75750a6a969f78c5000000000000019d`); `gw-w/thread-45/gateway.admitted-work` (64.082 ms, trace `75750a6a969f78c5000000000000028e`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-disk-a-4-baseline`; source `0d95e5721572bbafaa54630aa6265d188d8e3d26`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4258/4259 (99.977%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 19182114.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 407 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 14326.395 | 1076.243 | 25.817 | 457 |
| L1 | 1 | 44965.676 | 2062.529 | 41.361 | 1476 |
| L4 | 4 | 44974.202 | 3130.671 | 68.837 | 1762 |
| L16 | 16 | 44945.875 | 9900.099 | 125.781 | 34243 |
| L64 | 64 | 44579.631 | 10650.972 | 173.837 | 35853 |
| L256 | 256 | 44807.071 | 2716.431 | 80.211 | 1560 |
| L1024 | 1024 | 44091.320 | 3404.842 | 419.024 | 1598 |
| tail | 0 | 164326.174 | 4153.232 | 92.548 | 6128 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 75750a6a969f78c5000000000000014d | driver.queue.scheduler-dispatch | 0.056 | none | 0 / 32 |
| 75750a6a969f78c5000000000000014d | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 75750a6a969f78c5000000000000014d waited: []

| 75750a6a969f78c50000000000000103 | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |
| 75750a6a969f78c50000000000000103 | driver.queue.scheduler-late | 0.010 | none | 0 / 32 |

Observed active steps while trace 75750a6a969f78c50000000000000103 waited: []

| 75750a6a969f78c50000000000001f2d | driver.queue.scheduler-dispatch | 0.047 | none | 0 / 32 |
| 75750a6a969f78c50000000000001f2d | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 75750a6a969f78c50000000000001f2d waited: []

| 75750a6a969f78c5000000000000019d | driver.queue.scheduler-dispatch | 0.083 | none | 0 / 32 |
| 75750a6a969f78c5000000000000019d | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 75750a6a969f78c5000000000000019d waited: []

| 75750a6a969f78c5000000000000028e | driver.queue.scheduler-dispatch | 0.027 | none | 0 / 32 |
| 75750a6a969f78c5000000000000028e | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 75750a6a969f78c5000000000000028e waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.143 | 0.525 | 0.000 | 0.685 | 4.741 | 0.705 | 0.000 | 0.073 | 1.785 | 6.572 | 0.032 | n/a | 0.242 | 12.929 | n/a | n/a | 0.026 | 5.073 | 0.184 | 0.026 |
| p99 | 104.333 | 4.674 | 0.000 | 3.281 | 26.150 | n/a | 0.375 | 0.246 | 23.774 | 19.573 | 0.209 | n/a | 3.392 | 42.029 | n/a | n/a | 0.232 | 26.603 | 0.498 | 0.232 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000000103 | 104.333 | 26.150 | 0.379 | 0.000 | 0.074 | 23.774 | 19.230 | 0.209 | n/a | 0.678 | 33.807 | n/a | n/a | 0.031 | 26.603 | 0.255 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 75750a6a969f78c50000000000000113 | 69.874 | 5.399 | 0.233 | 0.000 | 0.145 | 20.928 | 19.573 | 0.071 | n/a | 0.159 | 23.301 | n/a | n/a | 0.064 | 5.777 | 0.083 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 75750a6a969f78c50000000000000100 | 64.671 | 10.865 | n/a | 0.000 | 0.246 | 1.165 | 8.227 | 0.052 | n/a | 1.923 | 42.029 | n/a | n/a | 0.164 | 11.111 | 0.172 | 0.164 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000115 | 46.311 | 4.741 | 0.198 | 0.000 | 0.192 | 5.500 | 9.684 | 0.033 | n/a | 0.115 | 25.824 | n/a | n/a | 0.023 | 5.132 | 0.111 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 75750a6a969f78c50000000000000129 | 44.019 | 10.593 | 0.283 | 0.335 | 0.070 | 3.213 | 8.009 | 0.104 | n/a | 0.723 | 20.666 | n/a | n/a | 0.024 | 11.281 | 0.256 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.072ms |
| 75750a6a969f78c5000000000000011f | 41.774 | 10.013 | 0.705 | 0.000 | 0.079 | 4.270 | 12.300 | 0.030 | n/a | 0.083 | 14.264 | n/a | n/a | 0.030 | 10.796 | 0.258 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| 75750a6a969f78c5000000000000011b | 38.077 | 7.497 | 0.164 | 0.000 | 0.082 | 4.100 | 8.286 | 0.078 | n/a | 0.242 | 17.605 | n/a | n/a | 0.023 | 7.743 | 0.203 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000131 | 37.126 | 5.193 | 0.670 | 0.305 | 0.075 | 4.321 | 6.572 | 0.035 | n/a | 0.502 | 19.427 | n/a | n/a | 0.026 | 6.243 | 0.168 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000139 | 36.059 | 4.463 | 0.166 | 0.375 | 0.069 | 3.445 | 12.027 | 0.028 | n/a | 0.108 | 15.357 | n/a | n/a | 0.021 | 5.073 | 0.141 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000125 | 35.640 | 13.224 | 0.165 | 0.308 | 0.064 | 1.785 | 9.914 | 0.056 | n/a | 0.106 | 9.996 | n/a | n/a | 0.023 | 13.761 | 0.386 | 0.023 | node-13/thread-9/client.persist-and-resolve | none observed |
| 75750a6a969f78c5000000000000010b | 35.602 | 6.149 | 0.257 | 0.000 | 0.070 | 2.759 | 11.125 | 0.033 | n/a | 0.110 | 15.070 | n/a | n/a | 0.029 | 6.476 | 0.182 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000012d | 34.505 | 7.185 | 0.142 | 0.295 | 0.065 | 1.883 | 11.080 | 0.114 | n/a | 2.427 | 11.292 | n/a | n/a | 0.022 | 7.688 | 0.223 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000109 | 32.093 | 4.071 | n/a | 0.000 | 0.061 | 0.783 | 3.098 | 0.028 | n/a | 0.136 | 23.887 | n/a | n/a | 0.029 | 4.132 | 0.129 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 75750a6a969f78c50000000000000135 | 30.193 | 4.524 | 0.311 | 0.000 | 0.049 | 1.741 | 11.417 | 0.032 | n/a | 0.097 | 12.002 | n/a | n/a | 0.021 | 4.884 | 0.162 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000107 | 30.143 | 9.270 | 0.212 | 0.000 | 0.073 | 2.514 | 7.092 | 0.121 | n/a | 1.674 | 9.156 | n/a | n/a | 0.032 | 9.554 | 0.317 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000010d | 29.923 | 5.147 | 0.251 | 0.000 | 0.119 | 2.173 | 10.098 | 0.032 | n/a | 0.085 | 11.963 | n/a | n/a | 0.055 | 5.517 | 0.184 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000127 | 28.222 | 4.383 | n/a | 0.000 | 0.053 | 0.505 | 1.924 | 0.033 | n/a | 1.041 | 20.261 | n/a | n/a | 0.022 | 4.436 | 0.157 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000011d | 23.892 | 11.337 | 0.485 | 0.000 | 0.081 | 2.794 | 2.368 | 0.031 | n/a | 0.142 | 6.630 | n/a | n/a | 0.025 | 11.902 | 0.498 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000118 | 22.830 | 3.787 | n/a | 0.000 | 0.069 | 1.463 | 1.774 | 0.025 | n/a | 0.525 | 15.161 | n/a | n/a | 0.026 | 3.855 | 0.169 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000012e | 20.999 | 2.144 | n/a | 0.000 | 0.063 | 0.721 | 1.687 | 0.021 | n/a | 3.233 | 13.104 | n/a | n/a | 0.026 | 2.207 | 0.105 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.018 | 0.713 | 0.000 | 0.803 | 2.762 | n/a | 0.000 | 0.071 | 0.783 | 1.612 | 0.022 | n/a | 0.233 | 8.284 | n/a | n/a | 0.030 | 2.930 | 0.184 | 0.030 |
| p99 | 32.093 | 2.447 | 0.000 | 1.570 | 4.071 | n/a | 0.000 | 0.168 | 4.282 | 4.722 | 0.050 | n/a | 3.392 | 23.887 | n/a | n/a | 0.232 | 4.132 | 0.335 | 0.232 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000000109 | 32.093 | 4.071 | n/a | 0.000 | 0.061 | 0.783 | 3.098 | 0.028 | n/a | 0.136 | 23.887 | n/a | n/a | 0.029 | 4.132 | 0.129 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 75750a6a969f78c5000000000000012e | 20.999 | 2.144 | n/a | 0.000 | 0.063 | 0.721 | 1.687 | 0.021 | n/a | 3.233 | 13.104 | n/a | n/a | 0.026 | 2.207 | 0.105 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000122 | 18.588 | 3.514 | n/a | 0.000 | 0.081 | 0.846 | 1.147 | 0.020 | n/a | 0.082 | 12.866 | n/a | n/a | 0.033 | 3.595 | 0.193 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000132 | 17.013 | 2.603 | n/a | 0.000 | 0.071 | 4.282 | 1.609 | 0.025 | n/a | 0.109 | 8.284 | n/a | n/a | 0.030 | 2.674 | 0.157 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000010e | 15.018 | 2.677 | n/a | 0.000 | 0.082 | 0.850 | 4.722 | 0.019 | n/a | 0.089 | 6.533 | n/a | n/a | 0.045 | 2.759 | 0.184 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000105 | 14.802 | 2.762 | n/a | 0.000 | 0.168 | 0.755 | 1.612 | 0.022 | n/a | 0.456 | 8.795 | n/a | n/a | 0.232 | 2.930 | 0.198 | 0.232 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000120 | 14.104 | 3.333 | n/a | 0.000 | 0.057 | 1.329 | 2.791 | 0.050 | n/a | 0.233 | 6.287 | n/a | n/a | 0.025 | 3.390 | 0.240 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000012a | 14.086 | 1.988 | n/a | 0.000 | 0.069 | 0.755 | 1.124 | 0.020 | n/a | 3.392 | 6.714 | n/a | n/a | 0.025 | 2.056 | 0.146 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000136 | 9.750 | 3.140 | n/a | 0.000 | 0.127 | 0.772 | 1.084 | 0.022 | n/a | 0.307 | 4.249 | n/a | n/a | 0.048 | 3.267 | 0.335 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.187 | 0.179 | 0.000 | 0.513 | 3.789 | n/a | 0.000 | 0.063 | 1.344 | 4.819 | 0.032 | n/a | 0.440 | 10.848 | n/a | n/a | 0.025 | 4.100 | 0.174 | 0.025 |
| p99 | 126.864 | 3.002 | 0.026 | 1.844 | 9.892 | n/a | 0.427 | 2.024 | 6.135 | 37.725 | 3.248 | n/a | 4.027 | 98.249 | n/a | n/a | 0.097 | 10.402 | 0.382 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c5000000000000014d | 126.864 | 6.611 | 0.196 | 0.000 | 0.057 | 3.142 | 18.432 | 0.050 | n/a | 0.104 | 98.249 | n/a | n/a | 0.024 | 6.864 | 0.054 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.070ms |
| 75750a6a969f78c5000000000000019d | 99.808 | 7.169 | 0.165 | 0.000 | 0.085 | 3.316 | 8.505 | 0.031 | n/a | 0.429 | 80.056 | n/a | n/a | 0.052 | 7.419 | 0.074 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.074ms |
| 75750a6a969f78c5000000000000014f | 91.700 | 4.789 | 0.208 | 0.353 | 0.067 | 1.836 | 7.606 | 0.034 | n/a | 0.129 | 76.654 | n/a | n/a | 0.024 | 5.418 | 0.059 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms |
| 75750a6a969f78c500000000000001ec | 80.065 | 3.981 | n/a | 0.000 | 0.050 | 0.784 | 17.505 | 0.021 | n/a | 0.097 | 57.598 | n/a | n/a | 0.028 | 4.031 | 0.050 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 75750a6a969f78c50000000000000147 | 61.903 | 5.248 | 0.204 | 0.360 | 0.101 | 1.344 | 37.725 | 0.039 | n/a | 0.681 | 16.166 | n/a | n/a | 0.034 | 5.913 | 0.096 | 0.034 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.056ms |
| 75750a6a969f78c500000000000001c7 | 50.136 | 3.443 | 0.138 | 0.228 | 0.058 | 1.410 | 28.468 | 0.042 | n/a | 0.525 | 15.799 | n/a | n/a | 0.024 | 3.867 | 0.077 | 0.024 | gw-w/thread-46/gateway.admitted-work | none observed |
| 75750a6a969f78c50000000000000155 | 47.483 | 5.644 | 0.136 | 0.321 | 0.054 | 1.568 | 9.240 | 0.054 | n/a | 2.157 | 28.287 | n/a | n/a | 0.021 | 6.156 | 0.130 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001c1 | 40.804 | 9.892 | 0.227 | 0.224 | 0.058 | 5.123 | 14.951 | 0.046 | n/a | 0.202 | 10.057 | n/a | n/a | 0.023 | 10.402 | 0.255 | 0.023 | gw-w/thread-44/gateway.admitted-work | none observed |
| 75750a6a969f78c50000000000000175 | 40.346 | 3.630 | 0.161 | 0.290 | 0.103 | 3.332 | 7.046 | 0.030 | n/a | 1.821 | 23.895 | n/a | n/a | 0.038 | 4.184 | 0.104 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000013b | 40.024 | 7.161 | 0.181 | 0.000 | 0.074 | 1.967 | 13.711 | 0.051 | n/a | 2.920 | 13.932 | n/a | n/a | 0.028 | 7.415 | 0.185 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001e1 | 37.777 | 7.755 | n/a | 0.000 | 2.024 | 2.161 | 1.407 | 0.025 | n/a | 0.052 | 24.332 | n/a | n/a | 0.020 | 9.779 | 0.259 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.040ms |
| 75750a6a969f78c5000000000000013d | 37.404 | 4.254 | 0.226 | 0.345 | 0.071 | 1.769 | 13.894 | 0.035 | n/a | 0.107 | 16.683 | n/a | n/a | 0.021 | 4.896 | 0.131 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000017f | 37.164 | 5.079 | 0.151 | 0.224 | 0.066 | 2.286 | 15.908 | 0.063 | n/a | 3.484 | 9.880 | n/a | n/a | 0.022 | 5.521 | 0.149 | 0.022 | gw-w/thread-40/gateway.admitted-work | none observed |
| 75750a6a969f78c5000000000000017b | 36.741 | 3.895 | 0.396 | 0.228 | 0.063 | 1.322 | 14.649 | 0.046 | n/a | 1.566 | 14.551 | n/a | n/a | 0.026 | 4.581 | 0.125 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001cf | 36.507 | 4.000 | 0.181 | 0.205 | 0.060 | 5.642 | 14.371 | 0.029 | n/a | 1.589 | 10.408 | n/a | n/a | 0.023 | 4.446 | 0.122 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000142 | 35.736 | 2.314 | n/a | 0.000 | 0.057 | 0.666 | 4.329 | 0.022 | n/a | 0.434 | 27.893 | n/a | n/a | 0.022 | 2.371 | 0.066 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000159 | 34.931 | 4.298 | 0.201 | 0.365 | 0.068 | 1.355 | 8.944 | 0.031 | n/a | 3.233 | 16.408 | n/a | n/a | 0.026 | 4.933 | 0.141 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000153 | 34.265 | 5.122 | n/a | 0.000 | 0.163 | 0.560 | 3.750 | 0.024 | n/a | 1.605 | 22.984 | n/a | n/a | 0.057 | 5.286 | 0.154 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000181 | 34.080 | 6.511 | 0.180 | 0.257 | 0.063 | 1.597 | 8.346 | 0.039 | n/a | 0.169 | 16.894 | n/a | n/a | 0.024 | 7.011 | 0.206 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001a5 | 33.136 | 3.584 | 0.133 | 0.227 | 0.059 | 1.304 | 16.609 | 0.054 | n/a | 0.788 | 10.358 | n/a | n/a | 0.021 | 4.002 | 0.121 | 0.021 | gw-w/thread-42/gateway.admitted-work | none observed |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.523 | 0.000 | 0.000 | 0.513 | 2.403 | n/a | 0.000 | 0.059 | 0.816 | 1.423 | 0.024 | n/a | 0.500 | 7.160 | n/a | n/a | 0.027 | 2.486 | 0.187 | 0.027 |
| p99 | 35.736 | 1.694 | 0.000 | 0.802 | 5.785 | n/a | 0.000 | 1.450 | 2.309 | 5.214 | 0.653 | n/a | 3.479 | 27.893 | n/a | n/a | 0.079 | 5.843 | 0.308 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000000142 | 35.736 | 2.314 | n/a | 0.000 | 0.057 | 0.666 | 4.329 | 0.022 | n/a | 0.434 | 27.893 | n/a | n/a | 0.022 | 2.371 | 0.066 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000145 | 18.974 | 5.785 | n/a | 0.000 | 0.058 | 2.068 | 5.214 | 0.072 | n/a | 0.588 | 5.163 | n/a | n/a | 0.026 | 5.843 | 0.308 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001dc | 17.922 | 2.140 | n/a | 0.000 | 0.059 | 0.860 | 1.597 | 0.040 | n/a | 0.500 | 12.698 | n/a | n/a | 0.029 | 2.198 | 0.123 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001a2 | 17.578 | 3.430 | n/a | 0.000 | 0.060 | 0.763 | 4.819 | 0.023 | n/a | 0.376 | 8.084 | n/a | n/a | 0.024 | 3.490 | 0.199 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000019a | 17.542 | 2.987 | n/a | 0.000 | 0.103 | 0.716 | 1.028 | 0.020 | n/a | 0.714 | 11.938 | n/a | n/a | 0.036 | 3.090 | 0.176 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001be | 16.843 | 4.259 | n/a | 0.000 | 0.146 | 1.875 | 2.268 | 0.057 | n/a | 0.804 | 7.368 | n/a | n/a | 0.066 | 4.405 | 0.262 | 0.066 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000191 | 16.764 | 2.212 | n/a | 0.000 | 0.071 | 0.718 | 1.211 | 0.024 | n/a | 0.531 | 11.950 | n/a | n/a | 0.048 | 2.282 | 0.136 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000156 | 16.306 | 2.048 | n/a | 0.000 | 0.055 | 0.721 | 1.318 | 0.021 | n/a | 0.329 | 11.785 | n/a | n/a | 0.028 | 2.103 | 0.129 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001e0 | 16.048 | 2.384 | n/a | 0.000 | 0.070 | 0.890 | 1.635 | 0.026 | n/a | 0.136 | 10.873 | n/a | n/a | 0.034 | 2.454 | 0.153 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001d4 | 15.890 | 2.455 | n/a | 0.000 | 0.059 | 1.104 | 1.849 | 0.053 | n/a | 0.167 | 10.175 | n/a | n/a | 0.027 | 2.514 | 0.158 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000160 | 15.619 | 3.938 | n/a | 0.000 | 0.161 | 1.152 | 1.276 | 0.025 | n/a | 3.479 | 5.527 | n/a | n/a | 0.061 | 4.100 | 0.262 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000016b | 15.523 | 1.934 | n/a | 0.000 | 0.046 | 0.740 | 1.215 | 0.024 | n/a | 0.534 | 11.007 | n/a | n/a | 0.022 | 1.980 | 0.128 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000018c | 15.307 | 2.893 | n/a | 0.000 | 0.060 | 1.252 | 1.558 | 0.025 | n/a | 0.546 | 8.938 | n/a | n/a | 0.035 | 2.953 | 0.193 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001a0 | 13.274 | 3.534 | n/a | 0.000 | 0.221 | 1.181 | 1.423 | 0.031 | n/a | 0.615 | 6.191 | n/a | n/a | 0.079 | 3.755 | 0.283 | 0.079 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.114ms |
| 75750a6a969f78c500000000000001d6 | 12.249 | 1.607 | n/a | 0.000 | 0.054 | 1.499 | 4.568 | 0.022 | n/a | 0.091 | 4.382 | n/a | n/a | 0.026 | 1.661 | 0.136 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 75750a6a969f78c50000000000000170 | 12.159 | 1.523 | n/a | 0.000 | 0.020 | 2.309 | 1.006 | 0.021 | n/a | 0.105 | 7.160 | n/a | n/a | 0.015 | 1.543 | 0.127 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001da | 11.696 | 2.145 | n/a | 0.000 | 0.046 | 0.779 | 1.046 | 0.021 | n/a | 0.595 | 7.037 | n/a | n/a | 0.027 | 2.191 | 0.187 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001e8 | 11.610 | 2.125 | n/a | 0.000 | 1.450 | 0.809 | 1.333 | 0.653 | n/a | 1.087 | 4.128 | n/a | n/a | 0.025 | 3.574 | 0.308 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000187 | 11.326 | 2.403 | n/a | 0.000 | 0.028 | 0.810 | 1.771 | 0.048 | n/a | 0.255 | 5.997 | n/a | n/a | 0.016 | 2.431 | 0.215 | 0.016 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001cc | 10.471 | 2.576 | n/a | 0.000 | 0.106 | 0.816 | 0.951 | 0.018 | n/a | 0.803 | 5.155 | n/a | n/a | 0.045 | 2.682 | 0.256 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.838 | 0.162 | 0.000 | 0.467 | 3.586 | n/a | 0.000 | 0.056 | 1.060 | 2.770 | 0.026 | n/a | 0.339 | 10.255 | n/a | n/a | 0.025 | 3.952 | 0.192 | 0.025 |
| p99 | 75.533 | 2.010 | 0.000 | 1.439 | 14.350 | n/a | 0.894 | 1.866 | 7.641 | 37.939 | 0.137 | n/a | 3.792 | 34.708 | n/a | n/a | 0.068 | 14.912 | 0.408 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c5000000000000028e | 94.627 | 4.306 | 0.149 | 0.435 | 0.029 | 1.756 | 68.953 | 0.036 | n/a | 0.090 | 18.858 | n/a | n/a | 0.016 | 4.919 | 0.052 | 0.016 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.076ms |
| 75750a6a969f78c500000000000001fd | 75.533 | 14.350 | n/a | 0.000 | 0.116 | 3.829 | 30.299 | 0.137 | n/a | 1.534 | 25.199 | n/a | n/a | 0.068 | 14.467 | 0.192 | 0.068 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 75750a6a969f78c5000000000000022e | 58.055 | 3.429 | 0.140 | 0.262 | 0.054 | 1.928 | 37.939 | 0.025 | n/a | 3.012 | 11.245 | n/a | n/a | 0.021 | 3.884 | 0.067 | 0.021 | gw-w/thread-44/gateway.admitted-work | none observed |
| 75750a6a969f78c50000000000000295 | 53.621 | 4.136 | n/a | 0.000 | 0.122 | 0.907 | 1.331 | 0.026 | n/a | 0.489 | 46.557 | n/a | n/a | 0.053 | 4.258 | 0.079 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000002b8 | 50.915 | 5.341 | 1.092 | 0.000 | 0.061 | 9.255 | 9.642 | 0.044 | n/a | 0.104 | 25.345 | n/a | n/a | 0.030 | 6.494 | 0.128 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000294 | 49.183 | 10.124 | 0.333 | 0.716 | 0.090 | 3.761 | 14.431 | 0.052 | n/a | 5.990 | 13.649 | n/a | n/a | 0.036 | 11.263 | 0.229 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000024f | 42.804 | 9.196 | 0.196 | 1.915 | 0.045 | 1.896 | 11.073 | 0.053 | n/a | 0.472 | 17.939 | n/a | n/a | 0.018 | 11.352 | 0.265 | 0.018 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000224 | 41.742 | 7.602 | 0.157 | 0.234 | 0.088 | 7.523 | 7.544 | 0.032 | n/a | 0.981 | 17.548 | n/a | n/a | 0.034 | 8.081 | 0.194 | 0.034 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000029f | 40.076 | 10.040 | 0.197 | 0.257 | 0.052 | 2.185 | 9.949 | 0.040 | n/a | 0.108 | 17.227 | n/a | n/a | 0.022 | 10.545 | 0.263 | 0.022 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000002a5 | 39.658 | 5.208 | 0.186 | 0.340 | 0.051 | 0.926 | 5.114 | 0.023 | n/a | 0.117 | 27.672 | n/a | n/a | 0.021 | 5.785 | 0.146 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000021e | 39.520 | 7.339 | 0.190 | 0.625 | 0.050 | 3.279 | 10.481 | 0.088 | n/a | 0.122 | 17.325 | n/a | n/a | 0.020 | 8.204 | 0.208 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001fb | 39.258 | 3.588 | 0.145 | 0.000 | 0.055 | 2.485 | 15.962 | 0.081 | n/a | 0.081 | 16.843 | n/a | n/a | 0.019 | 3.787 | 0.096 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000236 | 38.696 | 1.709 | n/a | 0.000 | 0.046 | 0.580 | 1.264 | 0.015 | n/a | 0.355 | 34.708 | n/a | n/a | 0.019 | 1.755 | 0.045 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000218 | 38.667 | 7.863 | 0.195 | 0.000 | 0.094 | 5.128 | 9.925 | 0.037 | n/a | 0.405 | 14.987 | n/a | n/a | 0.033 | 8.152 | 0.211 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000239 | 38.612 | 8.663 | 1.531 | 0.509 | 0.063 | 5.517 | 6.874 | 0.027 | n/a | 0.419 | 14.981 | n/a | n/a | 0.027 | 10.767 | 0.279 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000023f | 38.094 | 4.317 | 0.186 | 0.254 | 0.052 | 5.175 | 9.204 | 0.051 | n/a | 0.825 | 18.011 | n/a | n/a | 0.018 | 4.810 | 0.126 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000226 | 37.475 | 14.297 | 0.199 | 0.360 | 0.056 | 2.389 | 5.748 | 0.033 | n/a | 0.446 | 13.926 | n/a | n/a | 0.021 | 14.912 | 0.398 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000253 | 37.055 | 14.568 | 0.249 | 0.253 | 0.057 | 2.557 | 4.165 | 0.035 | n/a | 0.349 | 14.801 | n/a | n/a | 0.021 | 15.128 | 0.408 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000200 | 36.635 | 4.628 | 0.221 | 0.334 | 0.053 | 1.259 | 13.210 | 0.025 | n/a | 0.291 | 16.590 | n/a | n/a | 0.023 | 5.237 | 0.143 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000028a | 35.831 | 5.159 | 0.144 | 0.488 | 0.056 | 4.380 | 10.042 | 0.023 | n/a | 0.122 | 15.397 | n/a | n/a | 0.019 | 5.847 | 0.163 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.354 | 0.500 | 0.000 | 0.459 | 2.099 | n/a | 0.000 | 0.054 | 0.734 | 1.290 | 0.020 | n/a | 0.193 | 7.465 | n/a | n/a | 0.027 | 2.265 | 0.178 | 0.027 |
| p99 | 38.696 | 2.370 | 0.000 | 1.099 | 3.972 | n/a | 0.000 | 1.866 | 3.516 | 9.374 | 0.056 | n/a | 3.297 | 34.708 | n/a | n/a | 0.047 | 4.080 | 0.299 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000000236 | 38.696 | 1.709 | n/a | 0.000 | 0.046 | 0.580 | 1.264 | 0.015 | n/a | 0.355 | 34.708 | n/a | n/a | 0.019 | 1.755 | 0.045 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000022f | 25.660 | 3.910 | n/a | 0.000 | 0.048 | 1.684 | 6.033 | 0.033 | n/a | 0.126 | 13.804 | n/a | n/a | 0.023 | 3.958 | 0.154 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000203 | 23.810 | 1.985 | n/a | 0.000 | 0.043 | 0.676 | 1.107 | 0.021 | n/a | 0.101 | 19.855 | n/a | n/a | 0.023 | 2.027 | 0.085 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 75750a6a969f78c50000000000000287 | 23.027 | 2.986 | n/a | 0.000 | 0.062 | 0.883 | 1.228 | 0.022 | n/a | 0.174 | 17.642 | n/a | n/a | 0.030 | 3.048 | 0.132 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000023a | 19.612 | 2.373 | n/a | 0.000 | 0.050 | 0.826 | 1.486 | 0.048 | n/a | 0.777 | 14.020 | n/a | n/a | 0.030 | 2.424 | 0.124 | 0.030 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000279 | 18.647 | 2.364 | n/a | 0.000 | 0.055 | 0.663 | 1.126 | 0.021 | n/a | 0.120 | 14.270 | n/a | n/a | 0.029 | 2.419 | 0.130 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000255 | 18.192 | 3.254 | n/a | 0.000 | 0.084 | 0.681 | 0.892 | 0.014 | n/a | 2.769 | 10.459 | n/a | n/a | 0.038 | 3.339 | 0.184 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.020ms |
| 75750a6a969f78c500000000000001f6 | 18.061 | 2.031 | n/a | 0.000 | 0.052 | 0.639 | 2.535 | 0.023 | n/a | 0.085 | 12.669 | n/a | n/a | 0.028 | 2.083 | 0.115 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000001f0 | 17.780 | 1.928 | n/a | 0.000 | 0.039 | 0.607 | 1.109 | 0.020 | n/a | 0.389 | 13.667 | n/a | n/a | 0.020 | 1.968 | 0.111 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000021f | 17.765 | 1.853 | n/a | 0.000 | 0.054 | 0.984 | 4.657 | 0.046 | n/a | 0.084 | 10.063 | n/a | n/a | 0.024 | 1.907 | 0.107 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000242 | 17.639 | 1.710 | n/a | 0.000 | 0.064 | 0.563 | 3.477 | 0.017 | n/a | 0.101 | 11.686 | n/a | n/a | 0.023 | 1.774 | 0.101 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000002ae | 17.383 | 2.209 | n/a | 0.000 | 0.056 | 0.843 | 4.636 | 0.019 | n/a | 3.297 | 6.295 | n/a | n/a | 0.028 | 2.265 | 0.130 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000274 | 17.236 | 3.472 | n/a | 0.000 | 0.055 | 2.069 | 9.374 | 0.039 | n/a | 0.382 | 1.821 | n/a | n/a | 0.024 | 3.527 | 0.205 | 0.024 | gw-w/thread-47/gateway.admitted-work | none observed |
| 75750a6a969f78c50000000000000270 | 14.748 | 2.596 | n/a | 0.000 | 0.094 | 0.745 | 0.888 | 0.015 | n/a | 0.246 | 10.125 | n/a | n/a | 0.038 | 2.691 | 0.182 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000028f | 14.443 | 2.393 | n/a | 0.000 | 0.179 | 0.765 | 1.694 | 0.045 | n/a | 2.980 | 6.375 | n/a | n/a | 0.012 | 2.573 | 0.178 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000215 | 14.400 | 3.972 | n/a | 0.000 | 0.109 | 1.044 | 1.458 | 0.020 | n/a | 0.150 | 7.605 | n/a | n/a | 0.043 | 4.080 | 0.283 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000002a0 | 13.664 | 2.340 | n/a | 0.000 | 0.103 | 0.589 | 0.889 | 0.016 | n/a | 0.088 | 9.591 | n/a | n/a | 0.047 | 2.444 | 0.179 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 75750a6a969f78c50000000000000211 | 13.354 | 1.881 | n/a | 0.000 | 0.058 | 0.657 | 1.290 | 0.020 | n/a | 0.117 | 9.307 | n/a | n/a | 0.023 | 1.939 | 0.145 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000024c | 13.260 | 2.099 | n/a | 0.000 | 1.866 | 0.831 | 1.879 | 0.044 | n/a | 0.617 | 5.890 | n/a | n/a | 0.032 | 3.965 | 0.299 | 0.032 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000232 | 12.556 | 1.943 | n/a | 0.000 | 0.039 | 0.661 | 1.198 | 0.016 | n/a | 0.409 | 8.270 | n/a | n/a | 0.020 | 1.982 | 0.158 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (298 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 106.674 | n/a | n/a | n/a | 39.134 | 29.111 | 2.554 | 0.000 | 0.245 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.683 | 78.250 | 0.925 | 6.683 |
| p99 | 468.902 | n/a | n/a | n/a | 117.704 | 354.573 | 22.597 | 0.000 | 80.284 | 18.771 | 71.674 | n/a | 0.010 | 0.000 | n/a | n/a | 189.505 | 414.563 | 1.000 | 189.505 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c500000000000015c8 | 554.898 | 111.320 | 359.894 | 13.664 | 0.000 | 0.321 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 69.699 | 484.877 | 0.874 | 69.699 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.550ms; driver.reader-basis.broadcast 0.775ms; driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.279ms; driver.reader-basis.broadcast 0.270ms |
| 75750a6a969f78c500000000000015db | 481.248 | 39.134 | 413.371 | 1.273 | 0.000 | 0.279 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.192 | 453.778 | 0.943 | 27.192 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.550ms; driver.reader-basis.broadcast 0.775ms; driver.reader-basis.broadcast 0.279ms; driver.reader-basis.broadcast 0.270ms; driver.reader-basis.broadcast 0.269ms |
| 75750a6a969f78c5000000000000157e | 468.902 | 55.493 | 354.573 | 4.497 | 0.000 | 0.234 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.105 | 414.563 | 0.884 | 54.105 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.054ms; driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.298ms; driver.reader-basis.broadcast 0.287ms |
| 75750a6a969f78c500000000000015bc | 464.521 | 55.643 | 222.922 | 2.554 | 0.000 | 3.578 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 179.823 | 281.119 | 0.605 | 179.823 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.550ms; driver.reader-basis.broadcast 0.775ms; driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.279ms; driver.reader-basis.broadcast 0.269ms |
| 75750a6a969f78c50000000000001567 | 441.270 | 23.147 | 228.334 | 0.000 | 0.000 | 0.284 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 189.505 | 251.482 | 0.570 | 189.505 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.261ms; driver.expected-state.bind-receipt 1.054ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.298ms; driver.reader-basis.broadcast 0.298ms |
| 75750a6a969f78c5000000000000157c | 428.362 | 21.534 | 331.138 | 0.000 | 0.000 | 0.251 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 75.439 | 352.672 | 0.823 | 75.439 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.054ms; driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.298ms; driver.reader-basis.broadcast 0.287ms |
| 75750a6a969f78c50000000000001594 | 423.637 | 47.208 | 330.434 | 8.401 | 0.000 | 0.285 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.310 | 386.042 | 0.911 | 37.310 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.287ms; driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.167ms |
| 75750a6a969f78c500000000000015cc | 419.859 | 54.452 | 286.400 | 13.324 | 0.000 | 0.313 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 65.371 | 354.176 | 0.844 | 65.371 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.550ms; driver.reader-basis.broadcast 0.775ms; driver.reader-basis.broadcast 0.279ms; driver.reader-basis.broadcast 0.269ms; driver.reader-basis.broadcast 0.264ms |
| 75750a6a969f78c50000000000001579 | 417.261 | 21.531 | 316.301 | 0.000 | 0.000 | 0.273 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 79.156 | 337.832 | 0.810 | 79.156 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.054ms; driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.298ms; driver.reader-basis.broadcast 0.287ms |
| 75750a6a969f78c500000000000015bd | 394.730 | 50.506 | 231.140 | 4.906 | 0.000 | 0.307 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 107.871 | 286.552 | 0.726 | 107.871 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.775ms; driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.269ms; driver.reader-basis.broadcast 0.264ms; driver.publication.readback 0.139ms |
| 75750a6a969f78c50000000000001592 | 365.125 | 19.608 | 293.808 | 0.000 | 0.000 | 0.245 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.464 | 313.416 | 0.858 | 51.464 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.287ms; driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.167ms |
| 75750a6a969f78c500000000000015dc | 360.660 | 42.276 | 303.825 | 1.273 | 0.000 | 0.273 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.012 | 347.375 | 0.963 | 13.012 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.550ms; driver.reader-basis.broadcast 0.775ms; driver.reader-basis.broadcast 0.279ms; driver.reader-basis.broadcast 0.269ms; driver.reader-basis.broadcast 0.264ms |
| 75750a6a969f78c50000000000001588 | 360.489 | 88.090 | 255.741 | 11.611 | 0.000 | 0.495 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.552 | 355.442 | 0.986 | 4.552 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.298ms; driver.reader-basis.broadcast 0.287ms; driver.publication.readback 0.167ms |
| 75750a6a969f78c500000000000015a3 | 358.361 | 24.185 | 258.691 | 0.000 | 0.000 | 0.260 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 75.226 | 282.875 | 0.789 | 75.226 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.723ms; driver.reader-basis.broadcast 0.287ms; driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.167ms; driver.publication.persist-deferred 0.139ms |
| 75750a6a969f78c50000000000001578 | 350.204 | 13.458 | 168.903 | 0.000 | 0.000 | 0.291 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 167.552 | 182.361 | 0.521 | 167.552 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.054ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.298ms; driver.reader-basis.broadcast 0.287ms; driver.publication.readback 0.254ms |
| 75750a6a969f78c5000000000000157b | 340.539 | 15.665 | 299.402 | 0.000 | 0.000 | 3.611 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.861 | 315.067 | 0.925 | 21.861 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.054ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.298ms; driver.reader-basis.broadcast 0.287ms; driver.publication.readback 0.254ms |
| 75750a6a969f78c50000000000001576 | 322.773 | 85.424 | 146.308 | 30.188 | 0.000 | 0.232 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.621 | 261.920 | 0.811 | 60.621 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.054ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.298ms; driver.reader-basis.broadcast 0.287ms; driver.publication.readback 0.254ms |
| 75750a6a969f78c500000000000015f6 | 321.177 | 21.121 | 291.802 | 3.676 | 0.000 | 1.328 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.251 | 316.598 | 0.986 | 3.251 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.550ms; driver.reader-basis.broadcast 0.775ms; driver.reader-basis.broadcast 0.279ms; driver.reader-basis.broadcast 0.270ms; driver.publication.readback 0.234ms |
| 75750a6a969f78c50000000000001ae9 | 316.643 | 73.447 | 144.798 | 15.227 | 0.000 | 3.074 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 80.098 | 233.471 | 0.737 | 80.098 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.443ms; driver.reader-basis.broadcast 0.334ms; driver.reader-basis.broadcast 0.323ms; driver.publication.readback 0.231ms; driver.publication.readback 0.139ms |
| 75750a6a969f78c50000000000001562 | 307.972 | 46.892 | 210.095 | 4.097 | 0.000 | 2.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.887 | 261.084 | 0.848 | 44.887 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.261ms; driver.expected-state.bind-receipt 1.054ms; driver.reader-basis.broadcast 0.312ms; driver.reader-basis.broadcast 0.298ms; driver.reader-basis.broadcast 0.298ms |

## P2 / L16 / commit (1700 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.984 | 0.341 | 0.000 | 0.520 | 2.365 | n/a | 0.000 | 0.050 | 0.652 | 1.072 | 0.013 | n/a | 0.113 | 5.833 | n/a | n/a | 0.018 | 2.715 | 0.239 | 0.018 |
| p99 | 44.411 | 2.594 | 0.045 | 2.246 | 8.159 | n/a | 0.000 | 15.692 | 7.741 | 9.325 | 0.056 | n/a | 3.392 | 32.208 | n/a | n/a | 0.055 | 18.096 | 0.612 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000000361 | 71.162 | 4.075 | n/a | 0.000 | 0.029 | 1.165 | 1.495 | 0.015 | n/a | 0.353 | 64.015 | n/a | n/a | 0.016 | 4.103 | 0.058 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.worker-message 0.930ms; driver.reader-basis.broadcast 0.162ms; driver.publication.readback 0.061ms; driver.publication.readback 0.059ms; driver.publication.readback 0.035ms |
| 75750a6a969f78c5000000000000038b | 67.471 | 4.462 | 12.056 | 0.000 | 0.019 | 11.373 | 10.310 | 0.033 | n/a | 0.126 | 29.080 | n/a | n/a | 0.012 | 16.536 | 0.245 | 0.012 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.167ms; driver.publication.readback 0.078ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.050ms; driver.publication.readback 0.044ms |
| 75750a6a969f78c50000000000000360 | 63.791 | 1.399 | n/a | 0.000 | 0.018 | 1.798 | 0.674 | 0.007 | n/a | 0.506 | 59.379 | n/a | n/a | 0.009 | 1.417 | 0.022 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.162ms; driver.publication.readback 0.061ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.008ms |
| 75750a6a969f78c50000000000000363 | 57.867 | 1.988 | n/a | 0.000 | 0.015 | 6.189 | 1.242 | 0.016 | n/a | 3.664 | 44.741 | n/a | n/a | 0.010 | 2.003 | 0.035 | 0.010 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.worker-message 0.930ms; driver.reader-basis.broadcast 0.162ms; driver.publication.readback 0.094ms; driver.publication.readback 0.061ms; driver.publication.readback 0.059ms |
| 75750a6a969f78c50000000000000362 | 57.471 | 1.532 | n/a | 0.000 | 0.050 | 7.741 | 0.532 | 0.007 | n/a | 0.022 | 47.565 | n/a | n/a | 0.021 | 1.582 | 0.028 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 0.930ms; driver.reader-basis.broadcast 0.162ms; driver.publication.readback 0.061ms; driver.publication.readback 0.059ms; driver.publication.readback 0.035ms |
| 75750a6a969f78c5000000000000042d | 53.862 | 1.376 | n/a | 0.000 | 28.641 | 0.292 | 0.766 | 0.011 | n/a | 0.064 | 22.700 | n/a | n/a | 0.012 | 30.017 | 0.557 | 0.012 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.100ms; driver.reader-basis.broadcast 0.084ms; driver.publication.readback 0.078ms; driver.publication.readback 0.070ms |
| 75750a6a969f78c50000000000000375 | 51.988 | 3.228 | n/a | 0.000 | 22.941 | 2.554 | 1.621 | 0.027 | n/a | 0.086 | 21.519 | n/a | n/a | 0.011 | 26.170 | 0.503 | 0.011 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.196ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.066ms; driver.publication.readback 0.060ms; driver.publication.readback 0.055ms |
| 75750a6a969f78c500000000000002e4 | 51.393 | 3.679 | 0.183 | 0.000 | 0.056 | 5.462 | 32.160 | 0.026 | n/a | 0.416 | 9.384 | n/a | n/a | 0.028 | 3.918 | 0.076 | 0.028 | gw-w/thread-40/gateway.admitted-work | none observed |
| 75750a6a969f78c5000000000000035e | 50.770 | 1.892 | n/a | 0.000 | 0.092 | 0.904 | 0.730 | 0.014 | n/a | 0.891 | 46.212 | n/a | n/a | 0.034 | 1.984 | 0.039 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.162ms; driver.publication.persist-deferred 0.019ms |
| 75750a6a969f78c50000000000000364 | 50.674 | 2.876 | n/a | 0.000 | 0.067 | 7.997 | 1.459 | 0.020 | n/a | 0.289 | 37.921 | n/a | n/a | 0.044 | 2.943 | 0.058 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.worker-message 0.930ms; driver.publication.readback 0.094ms; driver.publication.readback 0.061ms; driver.publication.readback 0.061ms; driver.publication.readback 0.059ms |
| 75750a6a969f78c50000000000000470 | 49.581 | 2.653 | n/a | 0.000 | 33.507 | 2.221 | 0.924 | 0.008 | n/a | 0.028 | 10.224 | n/a | n/a | 0.016 | 36.160 | 0.729 | 0.016 | node-13/thread-0/driver.queue.scheduler-late | none observed |
| 75750a6a969f78c500000000000003f1 | 49.161 | 2.322 | n/a | 0.000 | 25.298 | 0.666 | 1.740 | 0.027 | n/a | 3.981 | 15.114 | n/a | n/a | 0.014 | 27.619 | 0.562 | 0.014 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.153ms; driver.publication.readback 0.072ms; driver.publication.readback 0.058ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.023ms |
| 75750a6a969f78c5000000000000035f | 49.012 | 1.267 | n/a | 0.000 | 0.687 | 0.386 | 0.471 | 0.007 | n/a | 0.021 | 46.163 | n/a | n/a | 0.011 | 1.953 | 0.040 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.162ms |
| 75750a6a969f78c500000000000005e7 | 48.801 | 3.098 | n/a | 0.000 | 7.089 | 0.827 | 1.461 | 0.017 | n/a | 0.076 | 36.217 | n/a | n/a | 0.015 | 10.188 | 0.209 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.086ms; driver.publication.persist-deferred 0.043ms |
| 75750a6a969f78c50000000000000d51 | 47.791 | 2.928 | n/a | 0.000 | 0.024 | 0.460 | 18.561 | 0.037 | n/a | 0.098 | 25.673 | n/a | n/a | 0.010 | 2.951 | 0.062 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000460 | 45.115 | 2.269 | n/a | 0.000 | 5.183 | 9.823 | 0.934 | 0.015 | n/a | 0.363 | 26.507 | n/a | n/a | 0.020 | 7.452 | 0.165 | 0.020 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.087ms; driver.publication.persist-deferred 0.051ms; driver.publication.persist-deferred 0.029ms |
| 75750a6a969f78c50000000000000840 | 44.507 | 5.868 | n/a | 0.000 | 0.042 | 2.360 | 8.671 | 0.071 | n/a | 0.625 | 26.847 | n/a | n/a | 0.022 | 5.910 | 0.133 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.readback 0.075ms; driver.publication.readback 0.060ms; driver.publication.readback 0.058ms; driver.publication.readback 0.034ms |
| 75750a6a969f78c50000000000000ade | 44.411 | 3.282 | 0.193 | 0.000 | 0.086 | 4.815 | 24.874 | 0.016 | n/a | 0.732 | 10.381 | n/a | n/a | 0.033 | 3.561 | 0.080 | 0.033 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.145ms; driver.publication.readback 0.073ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.016ms |
| 75750a6a969f78c50000000000000d53 | 44.001 | 1.665 | n/a | 0.000 | 29.498 | 1.863 | 0.962 | 0.029 | n/a | 0.455 | 9.518 | n/a | n/a | 0.011 | 31.164 | 0.708 | 0.011 | node-13/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.066ms; driver.publication.readback 0.062ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.023ms |
| 75750a6a969f78c50000000000000476 | 43.726 | 6.577 | n/a | 0.000 | 0.078 | 0.506 | 5.741 | 0.010 | n/a | 0.039 | 30.742 | n/a | n/a | 0.034 | 6.654 | 0.152 | 0.034 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (989 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.813 | 0.000 | 0.000 | 0.415 | 1.919 | n/a | 0.000 | 0.052 | 0.639 | 0.917 | 0.013 | n/a | 0.117 | 5.411 | n/a | n/a | 0.018 | 2.239 | 0.214 | 0.018 |
| p99 | 43.461 | 2.003 | 0.031 | 1.031 | 4.716 | n/a | 0.000 | 14.442 | 7.997 | 5.475 | 0.054 | n/a | 3.456 | 35.105 | n/a | n/a | 0.055 | 16.191 | 0.607 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000000360 | 63.791 | 1.399 | n/a | 0.000 | 0.018 | 1.798 | 0.674 | 0.007 | n/a | 0.506 | 59.379 | n/a | n/a | 0.009 | 1.417 | 0.022 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.162ms; driver.publication.readback 0.061ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.008ms |
| 75750a6a969f78c50000000000000362 | 57.471 | 1.532 | n/a | 0.000 | 0.050 | 7.741 | 0.532 | 0.007 | n/a | 0.022 | 47.565 | n/a | n/a | 0.021 | 1.582 | 0.028 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 0.930ms; driver.reader-basis.broadcast 0.162ms; driver.publication.readback 0.061ms; driver.publication.readback 0.059ms; driver.publication.readback 0.035ms |
| 75750a6a969f78c5000000000000042d | 53.862 | 1.376 | n/a | 0.000 | 28.641 | 0.292 | 0.766 | 0.011 | n/a | 0.064 | 22.700 | n/a | n/a | 0.012 | 30.017 | 0.557 | 0.012 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.100ms; driver.reader-basis.broadcast 0.084ms; driver.publication.readback 0.078ms; driver.publication.readback 0.070ms |
| 75750a6a969f78c5000000000000035e | 50.770 | 1.892 | n/a | 0.000 | 0.092 | 0.904 | 0.730 | 0.014 | n/a | 0.891 | 46.212 | n/a | n/a | 0.034 | 1.984 | 0.039 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.162ms; driver.publication.persist-deferred 0.019ms |
| 75750a6a969f78c50000000000000364 | 50.674 | 2.876 | n/a | 0.000 | 0.067 | 7.997 | 1.459 | 0.020 | n/a | 0.289 | 37.921 | n/a | n/a | 0.044 | 2.943 | 0.058 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.worker-message 0.930ms; driver.publication.readback 0.094ms; driver.publication.readback 0.061ms; driver.publication.readback 0.061ms; driver.publication.readback 0.059ms |
| 75750a6a969f78c500000000000003f1 | 49.161 | 2.322 | n/a | 0.000 | 25.298 | 0.666 | 1.740 | 0.027 | n/a | 3.981 | 15.114 | n/a | n/a | 0.014 | 27.619 | 0.562 | 0.014 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.153ms; driver.publication.readback 0.072ms; driver.publication.readback 0.058ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.023ms |
| 75750a6a969f78c5000000000000035f | 49.012 | 1.267 | n/a | 0.000 | 0.687 | 0.386 | 0.471 | 0.007 | n/a | 0.021 | 46.163 | n/a | n/a | 0.011 | 1.953 | 0.040 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.162ms |
| 75750a6a969f78c50000000000000460 | 45.115 | 2.269 | n/a | 0.000 | 5.183 | 9.823 | 0.934 | 0.015 | n/a | 0.363 | 26.507 | n/a | n/a | 0.020 | 7.452 | 0.165 | 0.020 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.087ms; driver.publication.persist-deferred 0.051ms; driver.publication.persist-deferred 0.029ms |
| 75750a6a969f78c50000000000000d53 | 44.001 | 1.665 | n/a | 0.000 | 29.498 | 1.863 | 0.962 | 0.029 | n/a | 0.455 | 9.518 | n/a | n/a | 0.011 | 31.164 | 0.708 | 0.011 | node-13/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.066ms; driver.publication.readback 0.062ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.023ms |
| 75750a6a969f78c50000000000000382 | 43.461 | 1.374 | n/a | 0.000 | 35.198 | 0.473 | 0.814 | 0.021 | n/a | 0.250 | 5.320 | n/a | n/a | 0.011 | 36.572 | 0.841 | 0.011 | node-13/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.078ms; driver.publication.readback 0.057ms; driver.publication.readback 0.055ms; driver.publication.readback 0.044ms |
| 75750a6a969f78c500000000000008a9 | 43.077 | 6.022 | n/a | 0.000 | 1.390 | 1.887 | 2.186 | 0.050 | n/a | 0.415 | 31.115 | n/a | n/a | 0.011 | 7.412 | 0.172 | 0.011 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.150ms; driver.reader-basis.broadcast 0.147ms; driver.publication.persist-deferred 0.021ms |
| 75750a6a969f78c50000000000000477 | 42.727 | 1.250 | n/a | 0.000 | 4.002 | 0.588 | 0.752 | 0.015 | n/a | 3.890 | 32.208 | n/a | n/a | 0.023 | 5.252 | 0.123 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.017ms |
| 75750a6a969f78c500000000000004c8 | 42.022 | 1.387 | n/a | 0.000 | 1.497 | 0.316 | 1.210 | 0.032 | n/a | 2.465 | 35.105 | n/a | n/a | 0.010 | 2.883 | 0.069 | 0.010 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.118ms; driver.publication.readback 0.065ms; driver.publication.readback 0.064ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.016ms |
| 75750a6a969f78c500000000000003f0 | 41.948 | 1.145 | n/a | 0.000 | 0.711 | 2.582 | 0.521 | 0.009 | n/a | 0.031 | 36.941 | n/a | n/a | 0.008 | 1.856 | 0.044 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000003ef | 41.054 | 1.579 | n/a | 0.000 | 0.030 | 1.586 | 1.077 | 0.023 | n/a | 0.686 | 36.051 | n/a | n/a | 0.021 | 1.609 | 0.039 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000037c | 40.750 | 2.171 | n/a | 0.000 | 4.457 | 6.411 | 1.579 | 0.021 | n/a | 0.663 | 25.427 | n/a | n/a | 0.020 | 6.629 | 0.163 | 0.020 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.196ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.066ms; driver.publication.readback 0.060ms; driver.publication.readback 0.055ms |
| 75750a6a969f78c50000000000000471 | 40.516 | 2.644 | n/a | 0.000 | 18.394 | 0.571 | 1.285 | 0.016 | n/a | 1.262 | 16.338 | n/a | n/a | 0.006 | 21.038 | 0.519 | 0.006 | node-13/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.079ms; driver.reader-basis.broadcast 0.075ms; driver.publication.persist-deferred 0.020ms |
| 75750a6a969f78c500000000000002cf | 40.446 | 2.015 | n/a | 0.000 | 0.946 | 0.619 | 1.046 | 0.029 | n/a | 0.082 | 35.687 | n/a | n/a | 0.022 | 2.961 | 0.073 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000000661 | 39.103 | 1.377 | n/a | 0.000 | 0.456 | 0.324 | 0.975 | 0.014 | n/a | 0.471 | 35.476 | n/a | n/a | 0.010 | 1.833 | 0.047 | 0.010 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.935ms; driver.publication.readback 0.107ms; driver.publication.readback 0.067ms; driver.publication.readback 0.066ms; driver.publication.readback 0.060ms |
| 75750a6a969f78c50000000000000367 | 38.723 | 1.913 | n/a | 0.000 | 0.045 | 0.808 | 4.969 | 0.047 | n/a | 0.100 | 30.819 | n/a | n/a | 0.022 | 1.958 | 0.051 | 0.022 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.worker-message 0.930ms; driver.publication.readback 0.094ms; driver.publication.readback 0.061ms; driver.publication.readback 0.059ms; driver.publication.readback 0.047ms |

## P2 / L64 / commit (1776 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.479 | 0.475 | 0.000 | 0.524 | 2.388 | n/a | 0.000 | 0.045 | 0.600 | 0.989 | 0.014 | n/a | 0.090 | 5.532 | n/a | n/a | 0.016 | 2.741 | 0.250 | 0.016 |
| p99 | 50.340 | 2.728 | 0.077 | 2.294 | 8.024 | n/a | 0.229 | 14.932 | 9.033 | 7.775 | 0.053 | n/a | 2.563 | 36.917 | n/a | n/a | 0.048 | 18.196 | 0.707 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c500000000000011ec | 89.740 | 1.477 | n/a | 0.000 | 71.268 | 0.404 | 0.737 | 0.012 | n/a | 0.051 | 15.777 | n/a | n/a | 0.013 | 72.745 | 0.811 | 0.013 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.115ms; driver.worker-message 0.505ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.164ms; driver.publication.readback 0.124ms |
| 75750a6a969f78c500000000000011ea | 74.532 | 5.039 | n/a | 0.000 | 1.269 | 5.133 | 2.631 | 0.033 | n/a | 3.923 | 56.493 | n/a | n/a | 0.011 | 6.308 | 0.085 | 0.011 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.worker-message 0.505ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.124ms; driver.publication.readback 0.078ms; driver.publication.readback 0.075ms |
| 75750a6a969f78c50000000000001af6 | 74.187 | 1.689 | n/a | 0.000 | 51.841 | 8.307 | 0.469 | 0.005 | n/a | 0.014 | 11.841 | n/a | n/a | 0.019 | 53.531 | 0.722 | 0.019 | node-13/thread-0/driver.queue.scheduler-late | none observed |
| 75750a6a969f78c5000000000000156a | 73.756 | 2.655 | n/a | 0.000 | 5.579 | 3.181 | 3.820 | 0.003 | n/a | 0.026 | 58.478 | n/a | n/a | 0.015 | 8.234 | 0.112 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.298ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.066ms; driver.publication.persist-deferred 0.023ms |
| 75750a6a969f78c5000000000000156d | 69.666 | 4.918 | n/a | 0.000 | 1.528 | 3.029 | 0.863 | 0.007 | n/a | 1.081 | 58.232 | n/a | n/a | 0.008 | 6.446 | 0.093 | 0.008 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.298ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.066ms; driver.publication.persist-deferred 0.042ms |
| 75750a6a969f78c50000000000001080 | 66.884 | 7.226 | 0.216 | 0.000 | 0.014 | 7.280 | 13.970 | 0.041 | n/a | 0.142 | 37.985 | n/a | n/a | 0.010 | 7.456 | 0.111 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.372ms; driver.reader-basis.broadcast 0.512ms; driver.publication.readback 0.104ms; driver.publication.readback 0.072ms; driver.publication.readback 0.052ms |
| 75750a6a969f78c50000000000001af7 | 65.906 | 2.470 | n/a | 0.000 | 47.052 | 3.454 | 1.124 | 0.015 | n/a | 0.064 | 11.723 | n/a | n/a | 0.004 | 49.522 | 0.751 | 0.004 | node-13/thread-0/driver.queue.scheduler-late | none observed |
| 75750a6a969f78c5000000000000156f | 65.475 | 1.544 | n/a | 0.000 | 10.856 | 9.349 | 0.791 | 0.010 | n/a | 0.260 | 42.646 | n/a | n/a | 0.019 | 12.400 | 0.189 | 0.019 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.261ms; driver.reader-basis.broadcast 0.298ms; driver.publication.readback 0.119ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms |
| 75750a6a969f78c50000000000001815 | 61.014 | 1.948 | n/a | 0.000 | 1.528 | 1.465 | 0.930 | 0.008 | n/a | 0.136 | 54.991 | n/a | n/a | 0.010 | 3.476 | 0.057 | 0.010 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.persist-deferred 0.021ms |
| 75750a6a969f78c500000000000011ed | 60.905 | 3.045 | n/a | 0.000 | 0.019 | 0.442 | 1.908 | 0.028 | n/a | 0.115 | 55.333 | n/a | n/a | 0.014 | 3.064 | 0.050 | 0.014 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.worker-message 0.505ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.078ms; driver.publication.readback 0.075ms; driver.publication.readback 0.049ms |
| 75750a6a969f78c50000000000001570 | 58.559 | 4.865 | n/a | 0.000 | 0.605 | 5.924 | 1.153 | 0.015 | n/a | 0.232 | 45.747 | n/a | n/a | 0.019 | 5.469 | 0.093 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.261ms; driver.reader-basis.broadcast 0.298ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.066ms |
| 75750a6a969f78c50000000000001673 | 57.689 | 4.636 | n/a | 0.000 | 43.516 | 4.552 | 2.630 | 0.044 | n/a | 0.866 | 1.429 | n/a | n/a | 0.014 | 48.152 | 0.835 | 0.014 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.077ms; driver.publication.readback 0.072ms; driver.publication.readback 0.068ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.027ms |
| 75750a6a969f78c50000000000001319 | 56.190 | 6.549 | n/a | 0.000 | 1.379 | 3.549 | 7.534 | 0.078 | n/a | 0.171 | 36.917 | n/a | n/a | 0.014 | 7.928 | 0.141 | 0.014 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.105ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.037ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.027ms |
| 75750a6a969f78c500000000000012c8 | 54.239 | 10.423 | 0.156 | 0.000 | 0.041 | 5.420 | 16.329 | 0.045 | n/a | 0.099 | 21.709 | n/a | n/a | 0.017 | 10.620 | 0.196 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.119ms; driver.publication.readback 0.118ms; driver.publication.readback 0.106ms; driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.028ms |
| 75750a6a969f78c5000000000000118d | 52.977 | 8.903 | n/a | 0.000 | 19.857 | 1.833 | 3.783 | 0.038 | n/a | 0.575 | 17.974 | n/a | n/a | 0.014 | 28.760 | 0.543 | 0.014 | node-13/thread-0/driver.queue.subject | driver.worker-message 0.685ms; driver.reader-basis.broadcast 0.216ms; driver.publication.readback 0.126ms; driver.publication.readback 0.117ms; driver.publication.persist-deferred 0.042ms |
| 75750a6a969f78c50000000000001212 | 52.003 | 4.384 | n/a | 1.836 | 0.038 | 4.959 | 24.308 | 0.056 | n/a | 0.900 | 15.504 | n/a | n/a | 0.018 | 6.258 | 0.120 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.177ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.015ms |
| 75750a6a969f78c50000000000001337 | 51.028 | 5.533 | n/a | 0.000 | 0.050 | 7.492 | 8.263 | 0.029 | n/a | 0.535 | 29.107 | n/a | n/a | 0.020 | 5.583 | 0.109 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.252ms; driver.publication.readback 0.058ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.015ms |
| 75750a6a969f78c50000000000001146 | 50.340 | 2.473 | n/a | 0.000 | 1.145 | 0.375 | 1.760 | 0.019 | n/a | 0.061 | 44.499 | n/a | n/a | 0.008 | 3.618 | 0.072 | 0.008 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.552ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.018ms |
| 75750a6a969f78c50000000000001979 | 49.844 | 7.610 | 0.148 | 0.236 | 0.035 | 1.576 | 33.783 | 0.016 | n/a | 0.271 | 6.156 | n/a | n/a | 0.013 | 8.029 | 0.161 | 0.013 | gw-w/thread-40/gateway.admitted-work | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.013ms |
| 75750a6a969f78c50000000000001d19 | 49.623 | 2.694 | n/a | 0.000 | 0.049 | 0.535 | 0.934 | 0.012 | n/a | 0.061 | 45.318 | n/a | n/a | 0.020 | 2.743 | 0.055 | 0.020 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.350ms |

## P2 / L64 / commit / 5-10 facts (1061 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.902 | 0.000 | 0.000 | 0.408 | 1.921 | n/a | 0.000 | 0.044 | 0.586 | 0.869 | 0.013 | n/a | 0.091 | 4.945 | n/a | n/a | 0.016 | 2.240 | 0.233 | 0.016 |
| p99 | 47.607 | 2.000 | 0.076 | 1.371 | 5.752 | n/a | 0.000 | 15.744 | 9.033 | 4.865 | 0.056 | n/a | 2.563 | 32.570 | n/a | n/a | 0.046 | 17.246 | 0.705 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c500000000000011ec | 89.740 | 1.477 | n/a | 0.000 | 71.268 | 0.404 | 0.737 | 0.012 | n/a | 0.051 | 15.777 | n/a | n/a | 0.013 | 72.745 | 0.811 | 0.013 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.115ms; driver.worker-message 0.505ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.164ms; driver.publication.readback 0.124ms |
| 75750a6a969f78c500000000000011ea | 74.532 | 5.039 | n/a | 0.000 | 1.269 | 5.133 | 2.631 | 0.033 | n/a | 3.923 | 56.493 | n/a | n/a | 0.011 | 6.308 | 0.085 | 0.011 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.worker-message 0.505ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.124ms; driver.publication.readback 0.078ms; driver.publication.readback 0.075ms |
| 75750a6a969f78c50000000000001af6 | 74.187 | 1.689 | n/a | 0.000 | 51.841 | 8.307 | 0.469 | 0.005 | n/a | 0.014 | 11.841 | n/a | n/a | 0.019 | 53.531 | 0.722 | 0.019 | node-13/thread-0/driver.queue.scheduler-late | none observed |
| 75750a6a969f78c5000000000000156a | 73.756 | 2.655 | n/a | 0.000 | 5.579 | 3.181 | 3.820 | 0.003 | n/a | 0.026 | 58.478 | n/a | n/a | 0.015 | 8.234 | 0.112 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.298ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.066ms; driver.publication.persist-deferred 0.023ms |
| 75750a6a969f78c5000000000000156f | 65.475 | 1.544 | n/a | 0.000 | 10.856 | 9.349 | 0.791 | 0.010 | n/a | 0.260 | 42.646 | n/a | n/a | 0.019 | 12.400 | 0.189 | 0.019 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.261ms; driver.reader-basis.broadcast 0.298ms; driver.publication.readback 0.119ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms |
| 75750a6a969f78c50000000000001815 | 61.014 | 1.948 | n/a | 0.000 | 1.528 | 1.465 | 0.930 | 0.008 | n/a | 0.136 | 54.991 | n/a | n/a | 0.010 | 3.476 | 0.057 | 0.010 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.persist-deferred 0.021ms |
| 75750a6a969f78c50000000000001319 | 56.190 | 6.549 | n/a | 0.000 | 1.379 | 3.549 | 7.534 | 0.078 | n/a | 0.171 | 36.917 | n/a | n/a | 0.014 | 7.928 | 0.141 | 0.014 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.105ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.037ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.027ms |
| 75750a6a969f78c50000000000001212 | 52.003 | 4.384 | n/a | 1.836 | 0.038 | 4.959 | 24.308 | 0.056 | n/a | 0.900 | 15.504 | n/a | n/a | 0.018 | 6.258 | 0.120 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.177ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.015ms |
| 75750a6a969f78c50000000000001d19 | 49.623 | 2.694 | n/a | 0.000 | 0.049 | 0.535 | 0.934 | 0.012 | n/a | 0.061 | 45.318 | n/a | n/a | 0.020 | 2.743 | 0.055 | 0.020 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.350ms |
| 75750a6a969f78c50000000000001102 | 49.000 | 1.533 | n/a | 0.000 | 0.032 | 0.377 | 0.924 | 0.009 | n/a | 0.081 | 46.030 | n/a | n/a | 0.014 | 1.565 | 0.032 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.243ms; driver.publication.readback 0.086ms; driver.publication.persist-deferred 0.023ms |
| 75750a6a969f78c50000000000001817 | 47.607 | 1.412 | n/a | 0.000 | 0.245 | 1.280 | 0.893 | 0.017 | n/a | 0.074 | 43.679 | n/a | n/a | 0.008 | 1.657 | 0.035 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.persist-deferred 0.021ms |
| 75750a6a969f78c50000000000001572 | 46.996 | 2.376 | n/a | 0.000 | 0.086 | 9.492 | 0.747 | 0.010 | n/a | 0.208 | 34.045 | n/a | n/a | 0.032 | 2.462 | 0.052 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.261ms; driver.reader-basis.broadcast 0.298ms; driver.publication.readback 0.119ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms |
| 75750a6a969f78c50000000000001318 | 40.324 | 3.573 | n/a | 0.000 | 0.051 | 2.583 | 0.815 | 0.016 | n/a | 0.269 | 32.996 | n/a | n/a | 0.022 | 3.623 | 0.090 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.037ms |
| 75750a6a969f78c500000000000011f3 | 38.552 | 2.124 | n/a | 0.000 | 0.029 | 2.881 | 0.858 | 0.013 | n/a | 0.062 | 32.570 | n/a | n/a | 0.015 | 2.153 | 0.056 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.115ms; driver.publication.readback 0.124ms; driver.publication.readback 0.086ms; driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.046ms |
| 75750a6a969f78c50000000000001573 | 37.371 | 1.272 | n/a | 0.000 | 0.041 | 9.033 | 1.499 | 0.030 | n/a | 0.121 | 25.356 | n/a | n/a | 0.018 | 1.313 | 0.035 | 0.018 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.261ms; driver.reader-basis.broadcast 0.298ms; driver.publication.readback 0.119ms; driver.publication.readback 0.071ms; driver.publication.readback 0.069ms |
| 75750a6a969f78c50000000000001b41 | 36.248 | 1.451 | n/a | 0.000 | 1.397 | 0.239 | 0.746 | 0.007 | n/a | 0.050 | 32.351 | n/a | n/a | 0.007 | 2.849 | 0.079 | 0.007 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.310ms; driver.publication.readback 0.250ms; driver.publication.readback 0.227ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.014ms |
| 75750a6a969f78c5000000000000149c | 36.183 | 3.113 | n/a | 0.000 | 0.043 | 0.527 | 0.723 | 0.012 | n/a | 0.063 | 31.681 | n/a | n/a | 0.020 | 3.156 | 0.087 | 0.020 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.542ms; driver.publication.persist-deferred 0.045ms |
| 75750a6a969f78c500000000000015fc | 35.755 | 2.934 | n/a | 0.000 | 1.356 | 6.934 | 3.265 | 0.016 | n/a | 0.032 | 21.199 | n/a | n/a | 0.020 | 4.290 | 0.120 | 0.020 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.775ms; driver.publication.readback 0.079ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.019ms |
| 75750a6a969f78c50000000000001982 | 35.547 | 1.277 | n/a | 0.000 | 2.687 | 0.415 | 0.839 | 0.014 | n/a | 0.094 | 30.209 | n/a | n/a | 0.012 | 3.965 | 0.112 | 0.012 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.299ms; driver.publication.readback 0.079ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.018ms |
| 75750a6a969f78c50000000000001df5 | 35.368 | 1.535 | n/a | 0.000 | 21.677 | 3.337 | 1.356 | 0.021 | n/a | 0.095 | 7.337 | n/a | n/a | 0.010 | 23.212 | 0.656 | 0.010 | node-13/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.365ms; driver.publication.readback 0.098ms; driver.publication.persist-deferred 0.065ms; driver.publication.readback 0.060ms; driver.publication.readback 0.054ms |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.711 | 0.000 | 0.000 | 0.256 | 4.157 | 0.157 | 0.000 | 0.058 | 1.264 | 10.525 | 0.035 | n/a | 0.264 | 7.226 | n/a | n/a | 0.023 | 4.372 | 0.184 | 0.023 |
| p99 | 23.711 | 0.000 | 0.000 | 0.256 | 4.157 | 0.157 | 0.000 | 0.058 | 1.264 | 10.525 | 0.035 | n/a | 0.264 | 7.226 | n/a | n/a | 0.023 | 4.372 | 0.184 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000001013 | 23.711 | 4.157 | 0.157 | 0.000 | 0.058 | 1.264 | 10.525 | 0.035 | n/a | 0.264 | 7.226 | n/a | n/a | 0.023 | 4.372 | 0.184 | 0.023 | gw-w/thread-43/gateway.admitted-work | driver.publication.persist-deferred 0.020ms |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.948 | 0.000 | 0.000 | 0.448 | 3.644 | n/a | 0.000 | 0.045 | 0.764 | 1.759 | 0.018 | n/a | 0.078 | 6.138 | n/a | n/a | 0.019 | 3.915 | 0.291 | 0.019 |
| p99 | 103.636 | 1.998 | 0.054 | 1.324 | 13.244 | n/a | 0.000 | 1.942 | 11.369 | 33.677 | 0.056 | n/a | 1.734 | 97.668 | n/a | n/a | 0.060 | 13.484 | 0.531 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000001f2d | 103.636 | 3.381 | 0.260 | 0.000 | 0.049 | 0.792 | 1.391 | 0.016 | n/a | 0.059 | 97.668 | n/a | n/a | 0.019 | 3.690 | 0.036 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.365ms |
| 75750a6a969f78c50000000000001f2b | 61.564 | 11.052 | 0.237 | 0.000 | 0.045 | 1.498 | 7.727 | 0.021 | n/a | 0.094 | 40.863 | n/a | n/a | 0.028 | 11.334 | 0.184 | 0.028 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.367ms |
| 75750a6a969f78c50000000000001ea1 | 60.141 | 3.939 | 0.169 | 0.000 | 0.031 | 0.761 | 3.353 | 0.015 | n/a | 0.267 | 51.589 | n/a | n/a | 0.016 | 4.139 | 0.069 | 0.016 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.396ms |
| 75750a6a969f78c50000000000001ee3 | 48.769 | 7.004 | 0.154 | 0.000 | 0.047 | 2.509 | 33.677 | 0.030 | n/a | 0.071 | 5.258 | n/a | n/a | 0.019 | 7.205 | 0.148 | 0.019 | gw-w/thread-47/commit.prepare-and-validate | driver.reader-basis.broadcast 0.388ms |
| 75750a6a969f78c50000000000001e88 | 45.538 | 4.320 | 0.161 | 0.000 | 0.050 | 0.927 | 4.533 | 0.015 | n/a | 0.062 | 35.451 | n/a | n/a | 0.020 | 4.531 | 0.099 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.567ms |
| 75750a6a969f78c50000000000001f33 | 39.603 | 10.455 | 0.191 | 0.000 | 0.043 | 3.930 | 7.228 | 0.023 | n/a | 0.362 | 17.353 | n/a | n/a | 0.018 | 10.689 | 0.270 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.349ms |
| 75750a6a969f78c50000000000001ef5 | 32.569 | 7.883 | 0.221 | 0.000 | 0.062 | 1.278 | 16.757 | 0.035 | n/a | 0.063 | 6.249 | n/a | n/a | 0.022 | 8.166 | 0.251 | 0.022 | gw-w/thread-43/commit.prepare-and-validate | driver.reader-basis.broadcast 0.355ms |
| 75750a6a969f78c50000000000001eed | 29.826 | 4.802 | 0.268 | 0.000 | 0.042 | 11.369 | 1.668 | 0.019 | n/a | 0.062 | 11.579 | n/a | n/a | 0.017 | 5.112 | 0.171 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.351ms |
| 75750a6a969f78c50000000000001ea5 | 29.267 | 4.633 | 0.202 | 0.000 | 0.045 | 5.409 | 10.127 | 0.030 | n/a | 0.056 | 8.747 | n/a | n/a | 0.018 | 4.881 | 0.167 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.838ms |
| 75750a6a969f78c50000000000001f19 | 28.037 | 7.370 | 0.144 | 0.000 | 0.041 | 1.174 | 10.309 | 0.035 | n/a | 0.474 | 8.477 | n/a | n/a | 0.015 | 7.554 | 0.269 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001efd | 27.674 | 8.146 | 0.157 | 0.000 | 0.039 | 4.742 | 6.709 | 0.019 | n/a | 0.319 | 7.529 | n/a | n/a | 0.014 | 8.342 | 0.301 | 0.014 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.354ms |
| 75750a6a969f78c50000000000001eb3 | 27.597 | 13.244 | 0.199 | 0.000 | 0.042 | 5.560 | 2.719 | 0.018 | n/a | 0.069 | 5.732 | n/a | n/a | 0.015 | 13.484 | 0.489 | 0.015 | node-13/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.885ms |
| 75750a6a969f78c50000000000001f27 | 26.753 | 6.036 | 0.177 | 0.000 | 0.072 | 1.098 | 6.978 | 0.018 | n/a | 0.050 | 12.300 | n/a | n/a | 0.024 | 6.285 | 0.235 | 0.024 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f11 | 26.052 | 9.556 | 0.153 | 0.000 | 0.038 | 1.459 | 8.858 | 0.026 | n/a | 0.091 | 5.856 | n/a | n/a | 0.014 | 9.747 | 0.374 | 0.014 | gw-w/thread-44/gateway.admitted-work | none observed |
| 75750a6a969f78c50000000000001f23 | 24.905 | 8.627 | 0.199 | 0.000 | 0.043 | 5.054 | 5.391 | 0.018 | n/a | 0.082 | 5.476 | n/a | n/a | 0.015 | 8.869 | 0.356 | 0.015 | node-13/thread-9/client.persist-and-resolve | none observed |
| 75750a6a969f78c50000000000001f39 | 24.847 | 2.998 | n/a | 0.000 | 0.079 | 5.677 | 2.519 | 0.016 | n/a | 0.053 | 13.464 | n/a | n/a | 0.040 | 3.077 | 0.124 | 0.040 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.377ms |
| 75750a6a969f78c50000000000001ecd | 24.710 | 8.224 | 0.181 | 0.000 | 0.043 | 1.354 | 3.588 | 0.018 | n/a | 0.083 | 11.193 | n/a | n/a | 0.026 | 8.449 | 0.342 | 0.026 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.852ms |
| 75750a6a969f78c50000000000001ee7 | 24.557 | 8.283 | 0.211 | 0.000 | 0.045 | 1.550 | 7.503 | 0.030 | n/a | 0.083 | 6.833 | n/a | n/a | 0.018 | 8.540 | 0.348 | 0.018 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001e91 | 23.310 | 9.079 | 0.212 | 0.000 | 0.048 | 1.349 | 8.375 | 0.023 | n/a | 0.112 | 4.092 | n/a | n/a | 0.020 | 9.338 | 0.401 | 0.020 | gw-w/thread-64/gateway.admitted-work | driver.reader-basis.broadcast 0.347ms |
| 75750a6a969f78c50000000000001eef | 22.900 | 3.513 | 5.736 | 0.000 | 0.045 | 1.265 | 6.077 | 0.026 | n/a | 0.066 | 6.156 | n/a | n/a | 0.017 | 9.294 | 0.406 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.251 | 0.000 | 0.000 | 0.448 | 2.514 | n/a | 0.000 | 0.056 | 0.569 | 1.003 | 0.014 | n/a | 0.069 | 5.837 | n/a | n/a | 0.021 | 2.684 | 0.270 | 0.021 |
| p99 | 24.847 | 1.998 | 0.000 | 0.929 | 4.622 | n/a | 0.000 | 1.942 | 5.677 | 3.509 | 0.037 | n/a | 0.639 | 13.464 | n/a | n/a | 0.060 | 4.717 | 0.459 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000001f39 | 24.847 | 2.998 | n/a | 0.000 | 0.079 | 5.677 | 2.519 | 0.016 | n/a | 0.053 | 13.464 | n/a | n/a | 0.040 | 3.077 | 0.124 | 0.040 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.377ms |
| 75750a6a969f78c50000000000001e95 | 19.827 | 2.748 | n/a | 0.000 | 0.040 | 0.730 | 3.509 | 0.021 | n/a | 0.060 | 12.698 | n/a | n/a | 0.021 | 2.788 | 0.141 | 0.021 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.346ms |
| 75750a6a969f78c50000000000001f3f | 16.626 | 2.741 | n/a | 0.000 | 0.050 | 4.098 | 1.344 | 0.037 | n/a | 0.578 | 7.754 | n/a | n/a | 0.025 | 2.791 | 0.168 | 0.025 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms |
| 75750a6a969f78c50000000000001e9b | 14.567 | 2.986 | n/a | 0.000 | 0.031 | 0.422 | 1.838 | 0.013 | n/a | 0.040 | 9.219 | n/a | n/a | 0.018 | 3.017 | 0.207 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f41 | 13.650 | 2.979 | n/a | 0.000 | 0.094 | 0.815 | 1.792 | 0.035 | n/a | 0.481 | 7.394 | n/a | n/a | 0.060 | 3.073 | 0.225 | 0.060 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001e97 | 13.277 | 2.385 | n/a | 0.000 | 0.035 | 0.672 | 3.112 | 0.022 | n/a | 0.432 | 6.602 | n/a | n/a | 0.018 | 2.420 | 0.182 | 0.018 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f3b | 13.036 | 2.442 | n/a | 0.000 | 0.073 | 0.669 | 1.648 | 0.025 | n/a | 0.639 | 7.501 | n/a | n/a | 0.039 | 2.515 | 0.193 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001ef3 | 12.740 | 3.140 | n/a | 0.000 | 0.067 | 0.569 | 0.846 | 0.013 | n/a | 0.098 | 7.980 | n/a | n/a | 0.027 | 3.207 | 0.252 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.340ms |
| 75750a6a969f78c50000000000001ec9 | 12.673 | 2.969 | n/a | 0.000 | 0.066 | 0.684 | 1.071 | 0.013 | n/a | 0.262 | 7.581 | n/a | n/a | 0.026 | 3.036 | 0.240 | 0.026 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001eb1 | 12.592 | 2.489 | n/a | 0.000 | 0.047 | 0.469 | 0.763 | 0.012 | n/a | 0.044 | 8.747 | n/a | n/a | 0.021 | 2.536 | 0.201 | 0.021 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f0b | 12.570 | 3.515 | n/a | 0.000 | 0.099 | 0.715 | 1.919 | 0.032 | n/a | 0.165 | 6.087 | n/a | n/a | 0.037 | 3.614 | 0.287 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f0e | 11.683 | 2.082 | n/a | 0.000 | 1.942 | 0.458 | 1.231 | 0.014 | n/a | 0.066 | 5.875 | n/a | n/a | 0.015 | 4.024 | 0.344 | 0.015 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001ec5 | 11.622 | 3.674 | n/a | 0.000 | 0.094 | 0.764 | 0.985 | 0.014 | n/a | 0.057 | 6.001 | n/a | n/a | 0.031 | 3.769 | 0.324 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f36 | 11.294 | 1.982 | n/a | 0.000 | 0.032 | 0.651 | 1.656 | 0.024 | n/a | 0.567 | 6.365 | n/a | n/a | 0.017 | 2.014 | 0.178 | 0.017 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001eff | 11.019 | 2.184 | n/a | 0.000 | 0.031 | 0.446 | 0.832 | 0.013 | n/a | 0.308 | 7.189 | n/a | n/a | 0.015 | 2.214 | 0.201 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001eb8 | 10.549 | 3.645 | n/a | 0.000 | 0.270 | 0.662 | 0.989 | 0.016 | n/a | 0.059 | 4.871 | n/a | n/a | 0.038 | 3.915 | 0.371 | 0.038 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001eb5 | 10.266 | 4.622 | n/a | 0.000 | 0.095 | 0.703 | 0.801 | 0.013 | n/a | 0.069 | 3.932 | n/a | n/a | 0.031 | 4.717 | 0.459 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f1c | 10.251 | 2.032 | n/a | 0.000 | 0.032 | 0.304 | 1.178 | 0.017 | n/a | 0.045 | 6.623 | n/a | n/a | 0.020 | 2.063 | 0.201 | 0.020 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.348ms |
| 75750a6a969f78c50000000000001e8f | 10.233 | 2.055 | n/a | 0.000 | 0.045 | 0.499 | 0.840 | 0.013 | n/a | 0.057 | 6.703 | n/a | n/a | 0.021 | 2.100 | 0.205 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001ed3 | 10.057 | 3.220 | n/a | 0.000 | 0.078 | 0.608 | 1.030 | 0.013 | n/a | 0.056 | 5.024 | n/a | n/a | 0.027 | 3.298 | 0.328 | 0.027 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.175 | 0.130 | 0.000 | 0.485 | 4.209 | n/a | 0.000 | 0.045 | 1.111 | 1.745 | 0.020 | n/a | 0.094 | 7.694 | n/a | n/a | 0.025 | 4.496 | 0.278 | 0.025 |
| p99 | 47.385 | 2.942 | 0.523 | 2.093 | 11.635 | n/a | 0.000 | 2.577 | 9.520 | 16.186 | 0.063 | n/a | 1.310 | 32.517 | n/a | n/a | 0.052 | 11.863 | 0.518 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000001f7f | 47.385 | 3.361 | 0.192 | 0.000 | 0.033 | 6.603 | 4.531 | 0.020 | n/a | 0.098 | 32.517 | n/a | n/a | 0.029 | 3.586 | 0.076 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.383ms |
| 75750a6a969f78c50000000000001f58 | 43.082 | 7.144 | 1.076 | 0.000 | 0.045 | 2.856 | 11.344 | 0.037 | n/a | 0.137 | 20.425 | n/a | n/a | 0.017 | 8.265 | 0.192 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.352ms |
| 75750a6a969f78c50000000000001fdc | 37.193 | 6.071 | 0.658 | 0.000 | 0.054 | 9.520 | 10.147 | 0.063 | n/a | 0.519 | 10.142 | n/a | n/a | 0.020 | 6.783 | 0.182 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.416ms |
| 75750a6a969f78c50000000000001fea | 36.914 | 6.778 | 0.187 | 0.000 | 0.058 | 1.652 | 7.195 | 0.044 | n/a | 0.090 | 20.875 | n/a | n/a | 0.035 | 7.023 | 0.190 | 0.035 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001fc4 | 36.441 | 4.784 | 0.196 | 0.000 | 0.084 | 1.487 | 2.000 | 0.021 | n/a | 0.082 | 27.750 | n/a | n/a | 0.037 | 5.064 | 0.139 | 0.037 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.341ms |
| 75750a6a969f78c50000000000001f67 | 35.804 | 10.435 | 0.224 | 0.000 | 0.047 | 3.012 | 2.414 | 0.033 | n/a | 0.094 | 19.528 | n/a | n/a | 0.017 | 10.706 | 0.299 | 0.017 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.337ms |
| 75750a6a969f78c50000000000001f6b | 33.785 | 9.360 | 0.219 | 0.000 | 0.063 | 1.047 | 2.809 | 0.018 | n/a | 0.098 | 20.149 | n/a | n/a | 0.022 | 9.642 | 0.285 | 0.022 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.346ms |
| 75750a6a969f78c50000000000001f5d | 33.554 | 8.179 | 0.177 | 0.000 | 0.065 | 1.392 | 5.251 | 0.021 | n/a | 0.072 | 18.375 | n/a | n/a | 0.022 | 8.420 | 0.251 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.348ms |
| 75750a6a969f78c50000000000001fb2 | 32.590 | 6.906 | 0.304 | 0.000 | 0.043 | 0.675 | 1.492 | 0.022 | n/a | 0.387 | 22.735 | n/a | n/a | 0.026 | 7.253 | 0.223 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.334ms |
| 75750a6a969f78c50000000000001f75 | 32.492 | 8.818 | 0.314 | 0.000 | 0.078 | 8.090 | 3.914 | 0.025 | n/a | 0.068 | 11.156 | n/a | n/a | 0.029 | 9.210 | 0.283 | 0.029 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.477ms |
| 75750a6a969f78c50000000000001f9e | 30.951 | 6.757 | 0.211 | 0.000 | 0.064 | 2.601 | 10.459 | 0.038 | n/a | 0.680 | 10.121 | n/a | n/a | 0.019 | 7.033 | 0.227 | 0.019 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f61 | 30.839 | 3.108 | 0.766 | 0.000 | 0.038 | 1.865 | 9.315 | 0.011 | n/a | 0.030 | 15.686 | n/a | n/a | 0.020 | 3.912 | 0.127 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.608ms; driver.publication.readback 0.125ms; driver.publication.persist-deferred 0.019ms |
| 75750a6a969f78c50000000000001f83 | 29.940 | 2.908 | n/a | 0.000 | 0.034 | 0.652 | 3.792 | 0.033 | n/a | 0.132 | 22.364 | n/a | n/a | 0.025 | 2.942 | 0.098 | 0.025 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001fe4 | 29.725 | 7.007 | 0.174 | 0.000 | 0.045 | 1.119 | 7.226 | 0.020 | n/a | 0.054 | 14.055 | n/a | n/a | 0.025 | 7.226 | 0.243 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001fbc | 28.768 | 8.293 | 2.736 | 0.000 | 0.064 | 1.111 | 4.378 | 0.019 | n/a | 0.282 | 11.860 | n/a | n/a | 0.025 | 11.093 | 0.386 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001fec | 28.365 | 9.863 | 0.223 | 0.000 | 0.072 | 1.681 | 5.787 | 0.031 | n/a | 0.428 | 10.257 | n/a | n/a | 0.022 | 10.158 | 0.358 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f4f | 28.194 | 6.189 | 0.177 | 0.000 | 0.068 | 1.381 | 10.132 | 0.021 | n/a | 0.384 | 9.797 | n/a | n/a | 0.045 | 6.435 | 0.228 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.338ms |
| 75750a6a969f78c50000000000001fa6 | 27.557 | 4.308 | 0.178 | 0.000 | 0.044 | 6.550 | 7.616 | 0.021 | n/a | 0.056 | 8.768 | n/a | n/a | 0.016 | 4.530 | 0.164 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001fbe | 26.343 | 10.533 | 0.148 | 0.000 | 0.042 | 2.300 | 8.620 | 0.028 | n/a | 0.086 | 4.555 | n/a | n/a | 0.029 | 10.724 | 0.407 | 0.029 | node-13/thread-9/client.persist-and-resolve | none observed |
| 75750a6a969f78c50000000000001fa0 | 26.158 | 5.986 | n/a | 0.000 | 0.068 | 0.648 | 1.962 | 0.025 | n/a | 0.160 | 17.268 | n/a | n/a | 0.041 | 6.055 | 0.231 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.340 | 0.337 | 0.000 | 0.490 | 3.109 | n/a | 0.000 | 0.044 | 0.649 | 1.005 | 0.019 | n/a | 0.102 | 6.094 | n/a | n/a | 0.025 | 3.197 | 0.267 | 0.025 |
| p99 | 29.940 | 2.942 | 0.160 | 1.050 | 7.246 | n/a | 0.000 | 2.577 | 4.559 | 16.186 | 0.040 | n/a | 0.735 | 22.364 | n/a | n/a | 0.052 | 9.823 | 0.518 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000001f83 | 29.940 | 2.908 | n/a | 0.000 | 0.034 | 0.652 | 3.792 | 0.033 | n/a | 0.132 | 22.364 | n/a | n/a | 0.025 | 2.942 | 0.098 | 0.025 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f5c | 26.066 | 3.668 | n/a | 0.000 | 0.037 | 1.593 | 16.186 | 0.036 | n/a | 0.082 | 4.445 | n/a | n/a | 0.019 | 3.705 | 0.142 | 0.019 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| 75750a6a969f78c50000000000001fd2 | 25.777 | 2.305 | n/a | 0.000 | 0.037 | 1.689 | 1.492 | 0.028 | n/a | 0.527 | 19.679 | n/a | n/a | 0.020 | 2.342 | 0.091 | 0.020 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.838ms |
| 75750a6a969f78c50000000000001f76 | 24.385 | 5.241 | n/a | 0.000 | 0.048 | 1.208 | 1.393 | 0.021 | n/a | 0.735 | 15.715 | n/a | n/a | 0.024 | 5.289 | 0.217 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.477ms |
| 75750a6a969f78c50000000000001ff1 | 21.690 | 7.246 | n/a | 0.000 | 2.577 | 1.356 | 1.963 | 0.030 | n/a | 0.324 | 8.163 | n/a | n/a | 0.031 | 9.823 | 0.453 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001fd9 | 20.864 | 1.764 | n/a | 0.000 | 1.219 | 4.559 | 0.531 | 0.006 | n/a | 0.023 | 12.755 | n/a | n/a | 0.006 | 2.983 | 0.143 | 0.006 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.379ms; driver.publication.readback 0.144ms; driver.publication.persist-deferred 0.021ms |
| 75750a6a969f78c50000000000001f85 | 19.999 | 5.281 | n/a | 0.000 | 0.041 | 2.202 | 10.745 | 0.039 | n/a | 0.167 | 1.493 | n/a | n/a | 0.030 | 5.322 | 0.266 | 0.030 | gw-w/thread-40/gateway.admitted-work | none observed |
| 75750a6a969f78c50000000000001f4d | 19.405 | 2.349 | n/a | 0.000 | 0.045 | 0.460 | 0.895 | 0.013 | n/a | 0.047 | 15.574 | n/a | n/a | 0.020 | 2.395 | 0.123 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001fc2 | 17.202 | 3.284 | n/a | 0.000 | 0.063 | 1.877 | 1.683 | 0.035 | n/a | 0.189 | 10.018 | n/a | n/a | 0.052 | 3.347 | 0.195 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f52 | 16.951 | 2.323 | n/a | 0.000 | 0.203 | 0.671 | 1.028 | 0.015 | n/a | 0.054 | 12.643 | n/a | n/a | 0.014 | 2.526 | 0.149 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001ffa | 16.174 | 2.923 | n/a | 0.000 | 1.573 | 0.665 | 1.371 | 0.022 | n/a | 0.124 | 9.471 | n/a | n/a | 0.026 | 4.496 | 0.278 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f88 | 15.777 | 3.402 | n/a | 0.000 | 0.062 | 0.601 | 0.971 | 0.014 | n/a | 0.064 | 10.635 | n/a | n/a | 0.028 | 3.464 | 0.220 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001fee | 14.253 | 3.396 | n/a | 0.000 | 0.055 | 0.462 | 1.002 | 0.013 | n/a | 0.052 | 9.236 | n/a | n/a | 0.036 | 3.451 | 0.242 | 0.036 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f8a | 13.687 | 2.267 | n/a | 0.000 | 0.030 | 0.419 | 1.120 | 0.016 | n/a | 0.101 | 9.703 | n/a | n/a | 0.031 | 2.297 | 0.168 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f79 | 13.632 | 4.050 | n/a | 0.000 | 0.038 | 0.599 | 1.576 | 0.021 | n/a | 0.069 | 7.260 | n/a | n/a | 0.018 | 4.087 | 0.300 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f4b | 13.134 | 3.109 | n/a | 0.000 | 0.067 | 0.581 | 1.472 | 0.037 | n/a | 0.063 | 7.767 | n/a | n/a | 0.038 | 3.176 | 0.242 | 0.038 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f6d | 12.537 | 4.209 | n/a | 0.000 | 0.044 | 0.801 | 1.511 | 0.025 | n/a | 0.124 | 5.802 | n/a | n/a | 0.021 | 4.253 | 0.339 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f73 | 12.340 | 2.783 | n/a | 0.000 | 0.037 | 0.605 | 1.096 | 0.029 | n/a | 0.074 | 7.694 | n/a | n/a | 0.021 | 2.820 | 0.229 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001fc0 | 12.086 | 4.429 | n/a | 0.000 | 0.055 | 0.542 | 0.616 | 0.011 | n/a | 0.233 | 6.177 | n/a | n/a | 0.022 | 4.485 | 0.371 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000001f9c | 11.627 | 3.064 | n/a | 0.000 | 0.066 | 0.415 | 0.778 | 0.012 | n/a | 0.316 | 6.950 | n/a | n/a | 0.026 | 3.130 | 0.269 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (366 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.814 | 0.149 | 0.000 | 0.479 | 3.405 | n/a | 0.000 | 0.044 | 0.855 | 1.610 | 0.019 | n/a | 0.087 | 5.518 | n/a | n/a | 0.030 | 3.790 | 0.277 | 0.030 |
| p99 | 54.994 | 2.999 | 0.000 | 2.451 | 8.138 | n/a | 1.498 | 2.459 | 3.901 | 22.585 | 0.051 | n/a | 3.363 | 24.772 | n/a | n/a | 0.097 | 8.455 | 0.502 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c5000000000000206d | 72.120 | 6.989 | 0.256 | 0.000 | 0.048 | 1.100 | 4.542 | 0.015 | n/a | 0.068 | 59.080 | n/a | n/a | 0.025 | 7.292 | 0.101 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.452ms |
| 75750a6a969f78c50000000000002087 | 70.930 | 3.229 | 0.267 | 0.000 | 0.033 | 1.231 | 57.698 | 0.040 | n/a | 0.097 | 8.308 | n/a | n/a | 0.028 | 3.529 | 0.050 | 0.028 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.445ms |
| 75750a6a969f78c5000000000000225f | 70.348 | 5.531 | n/a | 0.000 | 2.051 | 0.915 | 1.378 | 0.021 | n/a | 0.093 | 60.323 | n/a | n/a | 0.037 | 7.582 | 0.108 | 0.037 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.049ms |
| 75750a6a969f78c50000000000002146 | 54.994 | 2.986 | 0.140 | 0.000 | 0.035 | 0.970 | 2.589 | 0.030 | n/a | 0.064 | 48.155 | n/a | n/a | 0.025 | 3.160 | 0.057 | 0.025 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.431ms |
| 75750a6a969f78c50000000000002287 | 42.089 | 3.058 | n/a | 0.000 | 0.039 | 0.698 | 32.620 | 0.026 | n/a | 0.075 | 5.547 | n/a | n/a | 0.026 | 3.097 | 0.074 | 0.026 | gw-w/thread-46/gateway.request-parse | driver.reader-basis.broadcast 0.978ms |
| 75750a6a969f78c500000000000022d0 | 38.380 | 4.296 | 0.174 | 0.000 | 0.039 | 0.970 | 24.207 | 0.017 | n/a | 0.056 | 8.593 | n/a | n/a | 0.029 | 4.509 | 0.117 | 0.029 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.542ms |
| 75750a6a969f78c50000000000002039 | 33.202 | 2.654 | n/a | 0.000 | 1.719 | 3.872 | 0.852 | 0.013 | n/a | 0.045 | 24.019 | n/a | n/a | 0.029 | 4.372 | 0.132 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000200c | 32.712 | 4.646 | 0.211 | 0.000 | 0.042 | 1.222 | 6.616 | 0.016 | n/a | 0.710 | 19.221 | n/a | n/a | 0.029 | 4.898 | 0.150 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.232ms |
| 75750a6a969f78c50000000000002024 | 31.186 | 3.654 | 0.208 | 0.000 | 0.080 | 0.955 | 1.376 | 0.016 | n/a | 0.051 | 24.772 | n/a | n/a | 0.073 | 3.942 | 0.126 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.414ms |
| 75750a6a969f78c5000000000000210c | 29.712 | 1.889 | n/a | 0.000 | 0.041 | 0.525 | 22.585 | 0.044 | n/a | 0.084 | 4.514 | n/a | n/a | 0.030 | 1.930 | 0.065 | 0.030 | gw-w/thread-44/commit.prepare-and-validate | driver.reader-basis.broadcast 1.091ms |
| 75750a6a969f78c500000000000020b6 | 26.051 | 4.622 | 0.346 | 0.000 | 0.133 | 1.491 | 5.336 | 0.021 | n/a | 0.389 | 13.649 | n/a | n/a | 0.064 | 5.101 | 0.196 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000221c | 24.888 | 8.138 | 0.277 | 0.000 | 0.040 | 1.459 | 4.974 | 0.020 | n/a | 3.363 | 6.590 | n/a | n/a | 0.027 | 8.455 | 0.340 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000022d6 | 24.786 | 5.004 | 0.347 | 0.000 | 0.041 | 1.507 | 9.080 | 0.034 | n/a | 0.089 | 8.656 | n/a | n/a | 0.029 | 5.392 | 0.218 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.301ms |
| 75750a6a969f78c500000000000020d3 | 24.313 | 7.343 | n/a | 0.000 | 0.111 | 2.646 | 2.695 | 0.037 | n/a | 0.361 | 11.067 | n/a | n/a | 0.054 | 7.453 | 0.307 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.339ms |
| 75750a6a969f78c50000000000002079 | 24.291 | 3.337 | n/a | 0.000 | 0.041 | 0.782 | 1.274 | 0.022 | n/a | 0.405 | 18.403 | n/a | n/a | 0.026 | 3.378 | 0.139 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000002026 | 24.244 | 3.576 | 0.180 | 0.450 | 0.049 | 1.365 | 13.435 | 0.022 | n/a | 0.069 | 5.062 | n/a | n/a | 0.036 | 4.255 | 0.175 | 0.036 | gw-w/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.426ms |
| 75750a6a969f78c5000000000000203d | 23.965 | 5.394 | 0.255 | 0.420 | 0.043 | 1.189 | 9.529 | 0.017 | n/a | 0.075 | 7.007 | n/a | n/a | 0.034 | 6.113 | 0.255 | 0.034 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.922ms |
| 75750a6a969f78c500000000000020e2 | 23.847 | 3.487 | 0.321 | 0.000 | 0.058 | 0.997 | 5.708 | 0.021 | n/a | 0.121 | 13.092 | n/a | n/a | 0.042 | 3.866 | 0.162 | 0.042 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000021a6 | 23.674 | 5.198 | 0.198 | 0.000 | 0.044 | 0.913 | 4.373 | 0.021 | n/a | 0.055 | 12.841 | n/a | n/a | 0.031 | 5.440 | 0.230 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000221e | 23.669 | 5.550 | n/a | 1.704 | 0.035 | 0.629 | 1.696 | 0.016 | n/a | 0.578 | 13.434 | n/a | n/a | 0.027 | 7.289 | 0.308 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.211 | 0.488 | 0.000 | 0.457 | 2.207 | n/a | 0.000 | 0.046 | 0.646 | 1.035 | 0.016 | n/a | 0.090 | 5.184 | n/a | n/a | 0.030 | 2.325 | 0.257 | 0.030 |
| p99 | 29.712 | 1.991 | 0.000 | 1.305 | 5.550 | n/a | 0.000 | 2.459 | 3.872 | 6.339 | 0.044 | n/a | 0.746 | 11.701 | n/a | n/a | 0.072 | 5.848 | 0.458 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 75750a6a969f78c50000000000002039 | 33.202 | 2.654 | n/a | 0.000 | 1.719 | 3.872 | 0.852 | 0.013 | n/a | 0.045 | 24.019 | n/a | n/a | 0.029 | 4.372 | 0.132 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000210c | 29.712 | 1.889 | n/a | 0.000 | 0.041 | 0.525 | 22.585 | 0.044 | n/a | 0.084 | 4.514 | n/a | n/a | 0.030 | 1.930 | 0.065 | 0.030 | gw-w/thread-44/commit.prepare-and-validate | driver.reader-basis.broadcast 1.091ms |
| 75750a6a969f78c5000000000000217e | 18.341 | 4.147 | n/a | 0.000 | 1.701 | 0.759 | 1.139 | 0.025 | n/a | 0.061 | 10.475 | n/a | n/a | 0.034 | 5.848 | 0.319 | 0.034 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000204a | 16.765 | 3.998 | n/a | 0.000 | 0.033 | 1.025 | 1.356 | 0.017 | n/a | 0.383 | 9.910 | n/a | n/a | 0.043 | 4.031 | 0.240 | 0.043 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000002063 | 15.753 | 2.243 | n/a | 0.000 | 0.046 | 0.682 | 0.970 | 0.016 | n/a | 0.070 | 11.701 | n/a | n/a | 0.025 | 2.289 | 0.145 | 0.025 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000213a | 15.574 | 5.550 | n/a | 0.000 | 0.042 | 1.395 | 2.690 | 0.034 | n/a | 0.228 | 5.606 | n/a | n/a | 0.029 | 5.592 | 0.359 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000002267 | 15.138 | 2.690 | n/a | 0.000 | 0.039 | 0.922 | 4.047 | 0.020 | n/a | 0.280 | 7.114 | n/a | n/a | 0.026 | 2.729 | 0.180 | 0.026 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.396ms |
| 75750a6a969f78c50000000000002232 | 15.130 | 2.095 | n/a | 0.000 | 3.500 | 0.650 | 4.277 | 0.020 | n/a | 0.070 | 4.483 | n/a | n/a | 0.033 | 5.595 | 0.370 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000020fd | 14.491 | 4.026 | n/a | 0.000 | 0.043 | 2.112 | 6.339 | 0.033 | n/a | 0.100 | 1.808 | n/a | n/a | 0.031 | 4.069 | 0.281 | 0.031 | gw-w/thread-46/gateway.response-write | none observed |
| 75750a6a969f78c5000000000000223b | 14.340 | 4.606 | n/a | 0.000 | 0.089 | 1.184 | 1.761 | 0.044 | n/a | 0.195 | 6.390 | n/a | n/a | 0.072 | 4.695 | 0.327 | 0.072 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000002147 | 14.117 | 1.741 | n/a | 0.000 | 0.041 | 0.509 | 1.100 | 0.016 | n/a | 0.245 | 10.437 | n/a | n/a | 0.029 | 1.782 | 0.126 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000212c | 14.000 | 2.589 | n/a | 0.000 | 2.193 | 0.770 | 1.385 | 0.025 | n/a | 0.145 | 6.868 | n/a | n/a | 0.026 | 4.781 | 0.342 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000002190 | 13.830 | 6.661 | n/a | 0.000 | 0.095 | 0.684 | 1.196 | 0.014 | n/a | 0.070 | 5.018 | n/a | n/a | 0.092 | 6.756 | 0.488 | 0.092 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000021f4 | 13.704 | 3.989 | n/a | 0.000 | 0.096 | 4.529 | 0.871 | 0.014 | n/a | 0.048 | 4.109 | n/a | n/a | 0.049 | 4.085 | 0.298 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.851ms |
| 75750a6a969f78c50000000000002077 | 13.552 | 2.716 | n/a | 0.000 | 0.129 | 0.827 | 1.482 | 0.041 | n/a | 0.730 | 7.564 | n/a | n/a | 0.064 | 2.845 | 0.210 | 0.064 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c5000000000000227e | 13.552 | 3.964 | n/a | 0.000 | 0.135 | 0.865 | 1.350 | 0.018 | n/a | 0.104 | 7.056 | n/a | n/a | 0.060 | 4.098 | 0.302 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c500000000000020bc | 13.402 | 2.003 | n/a | 0.000 | 0.056 | 0.601 | 0.916 | 0.013 | n/a | 0.059 | 9.719 | n/a | n/a | 0.036 | 2.059 | 0.154 | 0.036 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000002157 | 12.999 | 2.828 | n/a | 0.000 | 0.040 | 0.669 | 0.819 | 0.014 | n/a | 0.056 | 8.545 | n/a | n/a | 0.028 | 2.867 | 0.221 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 75750a6a969f78c50000000000002235 | 12.933 | 5.119 | n/a | 0.000 | 0.115 | 1.699 | 3.402 | 0.038 | n/a | 0.292 | 2.201 | n/a | n/a | 0.067 | 5.233 | 0.405 | 0.067 | node-13/thread-0/driver.execute | none observed |
| 75750a6a969f78c50000000000002193 | 12.756 | 3.386 | n/a | 0.000 | 2.459 | 0.546 | 1.517 | 0.024 | n/a | 0.385 | 4.410 | n/a | n/a | 0.029 | 5.846 | 0.458 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (1180 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.046 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.000 | 0.000 | 0.022 |
| p99 | 304.966 | n/a | n/a | n/a | 0.342 | n/a | 0.000 | 304.910 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.357 | 304.964 | 1.000 | 0.357 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 371a3791485d8c8e00000000000010a4 | 310.811 | 0.453 | n/a | 0.000 | 310.350 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 310.803 | 1.000 | 0.007 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000000010a5 | 310.550 | 0.062 | n/a | 0.000 | 310.483 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 310.544 | 1.000 | 0.005 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000000010af | 308.980 | 0.059 | n/a | 0.000 | 308.917 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 308.976 | 1.000 | 0.005 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000000010b0 | 308.947 | 0.036 | n/a | 0.000 | 308.908 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 308.944 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000000010b8 | 308.488 | 0.063 | n/a | 0.000 | 308.418 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 308.481 | 1.000 | 0.007 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 3696630475d1d3990000000000000bda | 307.811 | 0.325 | n/a | 0.000 | 307.480 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 307.805 | 1.000 | 0.006 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 3696630475d1d3990000000000000bdb | 307.638 | 0.041 | n/a | 0.000 | 307.592 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 307.633 | 1.000 | 0.006 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 3696630475d1d3990000000000000bdc | 307.613 | 0.024 | n/a | 0.000 | 307.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 307.609 | 1.000 | 0.005 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 3696630475d1d3990000000000000bdd | 307.599 | 0.027 | n/a | 0.000 | 307.567 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 307.594 | 1.000 | 0.004 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000009db | 305.803 | 0.342 | n/a | 0.000 | 305.456 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 305.798 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000009dc | 305.727 | 0.051 | n/a | 0.000 | 305.672 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 305.723 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000009eb | 304.966 | 0.080 | n/a | 0.000 | 304.884 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.964 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000009ea | 304.946 | 0.034 | n/a | 0.000 | 304.910 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.944 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000009ec | 304.925 | 0.020 | n/a | 0.000 | 304.902 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 304.922 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000009ed | 304.924 | 0.020 | n/a | 0.000 | 304.900 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 304.920 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 3696630475d1d3990000000000000be5 | 303.363 | 0.047 | n/a | 0.000 | 303.305 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 303.353 | 1.000 | 0.010 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 3696630475d1d399000000000000c595 | 280.554 | 0.030 | n/a | 0.000 | 280.523 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.553 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000000cb41 | 280.542 | 0.023 | n/a | 0.000 | 280.517 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.541 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 3696630475d1d399000000000000c594 | 280.528 | 0.140 | n/a | 0.000 | 280.385 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.526 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000000cb40 | 280.523 | 0.144 | n/a | 0.000 | 280.377 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.521 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (995 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 271.671 | n/a | n/a | n/a | 0.251 | n/a | 0.000 | 271.561 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.167 | 271.668 | 1.000 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 22a64f1e9553c1710000000000131c36 | 328.698 | 0.095 | n/a | 0.000 | 328.601 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 328.696 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.044ms |
| 22a64f1e9553c1710000000000060e49 | 284.364 | 0.092 | n/a | 0.000 | 284.269 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 284.361 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000869e0 | 284.319 | 0.249 | n/a | 0.000 | 284.067 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 284.316 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000010ab99 | 280.655 | 0.164 | n/a | 0.000 | 280.490 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.653 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000005fd87 | 279.590 | 0.116 | n/a | 0.000 | 279.472 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.588 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c1710000000000070e80 | 277.851 | 0.283 | n/a | 0.000 | 277.565 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.848 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000e5d8e | 275.032 | 0.178 | n/a | 0.000 | 274.852 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.029 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000f9166 | 273.906 | 0.105 | n/a | 0.000 | 273.799 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.904 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000008f835 | 272.989 | 0.101 | n/a | 0.000 | 272.884 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.986 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 22a64f1e9553c17100000000001199af | 271.671 | 0.108 | n/a | 0.000 | 271.561 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.668 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000008d7f5 | 269.190 | 0.136 | n/a | 0.000 | 269.052 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.188 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000d7d8e | 268.328 | 0.254 | n/a | 0.000 | 268.070 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 268.324 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000961a5 | 268.093 | 0.160 | n/a | 0.000 | 267.929 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 268.089 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c1710000000000120583 | 267.725 | 0.109 | n/a | 0.000 | 267.614 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.722 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000013520e | 267.480 | 0.116 | n/a | 0.000 | 267.363 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.478 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| 22a64f1e9553c171000000000010d8b7 | 266.920 | 0.125 | n/a | 0.000 | 266.793 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.918 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c1710000000000093b38 | 266.706 | 0.181 | n/a | 0.000 | 266.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 266.702 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000c9aa1 | 266.651 | 0.091 | n/a | 0.000 | 266.558 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.649 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c1710000000000100823 | 266.574 | 0.260 | n/a | 0.000 | 266.310 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 266.570 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000000b06ae | 266.458 | 0.195 | n/a | 0.000 | 266.260 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.456 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |

## P1 / L4 / read (2378 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.000 | 0.000 | 0.019 |
| p99 | 273.349 | n/a | n/a | n/a | 0.217 | n/a | 0.000 | 273.204 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.221 | 273.346 | 1.000 | 0.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3696630475d1d3990000000000054d45 | 326.386 | 0.147 | n/a | 0.000 | 326.237 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 326.384 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.082ms |
| 22a64f1e9553c171000000000013dae9 | 324.963 | 0.017 | n/a | 0.000 | 324.945 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 324.962 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.085ms |
| 22a64f1e9553c171000000000013dae8 | 324.935 | 0.086 | n/a | 0.000 | 324.846 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 324.932 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.085ms |
| 371a3791485d8c8e0000000000057d05 | 324.734 | 0.097 | n/a | 0.000 | 324.635 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 324.732 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| 22a64f1e9553c17100000000001d174e | 304.320 | 0.020 | n/a | 0.000 | 304.299 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.319 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000001d174d | 304.290 | 0.099 | n/a | 0.000 | 304.188 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.287 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000000e3362 | 303.302 | 0.148 | n/a | 0.000 | 303.150 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 303.298 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 3696630475d1d39900000000000ddea0 | 302.909 | 0.122 | n/a | 0.000 | 302.783 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 302.906 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000000bf291 | 285.717 | 0.132 | n/a | 0.000 | 285.583 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.715 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e0000000000094952 | 284.972 | 0.143 | n/a | 0.000 | 284.826 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 284.970 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 3696630475d1d3990000000000090722 | 284.194 | 0.122 | n/a | 0.000 | 284.069 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 284.191 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000017e59e | 283.781 | 0.156 | n/a | 0.000 | 283.622 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.779 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 3696630475d1d39900000000000bad0a | 283.689 | 0.149 | n/a | 0.000 | 283.537 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.686 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000001aba5e | 283.601 | 0.169 | n/a | 0.000 | 283.428 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.598 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000001aba5f | 283.563 | 0.028 | n/a | 0.000 | 283.533 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.561 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000017e5ae | 282.976 | 0.035 | n/a | 0.000 | 282.939 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.974 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 3696630475d1d39900000000000cf49d | 277.272 | 0.108 | n/a | 0.000 | 277.162 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.270 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000000d417c | 276.099 | 0.201 | n/a | 0.000 | 275.894 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 276.095 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000001c1ac4 | 276.082 | 0.256 | n/a | 0.000 | 275.818 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 276.074 | 1.000 | 0.008 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 3696630475d1d39900000000000d1ed0 | 275.227 | 0.102 | n/a | 0.000 | 275.123 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.224 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.050ms |

## P1 / L16 / read (2752 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 55.351 | n/a | n/a | n/a | 0.021 | n/a | 0.000 | 54.017 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 54.629 | 1.000 | 0.002 |
| p99 | 270.559 | n/a | n/a | n/a | 42.160 | n/a | 3.903 | 270.497 | 0.287 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.842 | 270.558 | 1.000 | 25.842 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 371a3791485d8c8e0000000000113bd9 | 288.722 | 0.191 | n/a | 0.000 | 288.528 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.719 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 3696630475d1d399000000000010ebf0 | 288.279 | 0.210 | n/a | 0.000 | 288.067 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.277 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 3696630475d1d399000000000010ebf1 | 288.212 | 0.092 | n/a | 0.000 | 288.120 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.211 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 3696630475d1d399000000000010ebf2 | 288.164 | 0.028 | n/a | 0.000 | 288.135 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.163 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 22a64f1e9553c1710000000000204c82 | 288.063 | 0.482 | n/a | 0.000 | 287.578 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 288.060 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 371a3791485d8c8e0000000000113bf5 | 288.040 | 0.013 | n/a | 0.000 | 288.026 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 288.039 | 1.000 | 0.000 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 371a3791485d8c8e0000000000113bf4 | 288.031 | 0.013 | n/a | 0.000 | 288.018 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.031 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 371a3791485d8c8e0000000000113bf2 | 288.030 | 0.030 | n/a | 0.000 | 287.999 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.029 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 371a3791485d8c8e0000000000113bf3 | 288.024 | 0.015 | n/a | 0.000 | 288.009 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.023 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 3696630475d1d399000000000010ebf6 | 287.876 | 0.044 | n/a | 0.000 | 287.832 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.875 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 3696630475d1d399000000000010ebf7 | 287.849 | 0.014 | n/a | 0.000 | 287.833 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.847 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 22a64f1e9553c1710000000000204c83 | 287.690 | 0.053 | n/a | 0.000 | 287.634 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.687 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 22a64f1e9553c1710000000000204c84 | 287.665 | 0.166 | n/a | 0.000 | 287.497 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.663 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 22a64f1e9553c1710000000000204c85 | 287.519 | 0.021 | n/a | 0.000 | 287.495 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.517 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 22a64f1e9553c1710000000000204ca8 | 285.428 | 0.045 | n/a | 0.000 | 285.381 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.426 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 22a64f1e9553c1710000000000204cc1 | 283.708 | 0.046 | n/a | 0.000 | 283.660 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.706 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 371a3791485d8c8e000000000014a878 | 273.402 | 0.031 | n/a | 0.000 | 273.369 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.400 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e000000000014a877 | 273.362 | 0.153 | n/a | 0.000 | 273.205 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 273.357 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000001ff3f6 | 272.655 | 0.152 | n/a | 0.000 | 272.500 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.652 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e000000000014a895 | 272.534 | 0.022 | n/a | 0.000 | 272.510 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.533 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |

## P1 / L64 / read (6167 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.443 | n/a | n/a | n/a | 0.087 | n/a | 0.000 | 55.405 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 59.482 | 1.000 | 0.002 |
| p99 | 682.331 | n/a | n/a | n/a | 154.343 | n/a | 34.247 | 263.500 | 144.796 | 1.217 | 73.022 | n/a | 0.004 | 0.000 | n/a | n/a | 444.995 | 266.409 | 1.000 | 444.995 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 22a64f1e9553c17100000000002686f6 | 1056.338 | 45.722 | n/a | 5.425 | 293.050 | 0.329 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 711.812 | 344.197 | 0.326 | 711.812 | node-13/thread-4/socket.wait-first-byte | client.reach-decode-and-cache 42.707ms; reader.observe 39.885ms; reader.observe 14.385ms; reader.observe 14.244ms; client.parse 9.375ms |
| 22a64f1e9553c17100000000002686ee | 1048.481 | 233.587 | n/a | 36.815 | 302.324 | 328.018 | 92.611 | 0.001 | n/a | 0.002 | 0.000 | n/a | n/a | 55.123 | 572.727 | 0.546 | 55.123 | node-13/thread-4/socket.wait-first-byte | client.reach-decode-and-cache 42.707ms; reader.observe 39.885ms; reader.observe 14.385ms; reader.observe 14.244ms; client.parse 9.375ms |
| 3696630475d1d399000000000015f53e | 991.755 | 35.252 | n/a | 11.274 | 0.000 | 327.095 | 0.490 | 94.025 | n/a | 0.004 | 0.000 | n/a | n/a | 523.615 | 46.526 | 0.047 | 523.615 | node-13/thread-6/socket.wait-first-byte | reader.observe 121.588ms; reader.observe 27.665ms; reader.observe 23.607ms; client.reach-decode-and-cache 11.111ms; reader.observe 11.010ms |
| 371a3791485d8c8e000000000016abf3 | 974.646 | 213.074 | n/a | 55.179 | 194.703 | 2.798 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 508.893 | 462.955 | 0.475 | 508.893 | node-13/thread-5/socket.wait-first-byte | reader.observe 45.201ms; client.reach-decode-and-cache 26.929ms; client.reach-decode-and-cache 15.762ms; reader.observe 14.127ms; client.reach-decode-and-cache 7.273ms |
| 22a64f1e9553c17100000000002686ed | 964.193 | 267.525 | n/a | 57.131 | 432.189 | 132.876 | 65.019 | 0.003 | n/a | 0.004 | 0.000 | n/a | n/a | 9.445 | 756.845 | 0.785 | 9.445 | node-13/thread-4/reader.straddle-await-ack | reader.observe 39.885ms; reader.observe 14.385ms; reader.observe 14.244ms; reader.observe 8.469ms; reader.observe 8.321ms |
| 371a3791485d8c8e000000000016ac30 | 942.424 | 135.328 | n/a | 38.389 | 0.000 | 0.370 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 768.337 | 173.718 | 0.184 | 768.337 | node-13/thread-5/socket.wait-first-byte | reader.observe 45.201ms; reader.observe 14.127ms; reader.observe 11.786ms; reader.observe 7.200ms; reader.observe 6.546ms |
| 371a3791485d8c8e000000000016ac2e | 929.843 | 143.345 | n/a | 39.554 | 0.000 | 0.462 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 746.482 | 182.900 | 0.197 | 746.482 | node-13/thread-5/socket.wait-first-byte | reader.observe 45.201ms; reader.observe 14.127ms; reader.observe 11.786ms; reader.observe 6.546ms; client.parse 6.248ms |
| 3696630475d1d399000000000015f543 | 923.310 | 23.881 | n/a | 0.000 | 42.259 | 560.777 | 0.473 | 55.018 | n/a | 0.002 | 0.000 | n/a | n/a | 240.899 | 66.141 | 0.072 | 240.899 | node-13/thread-6/socket.wait-first-byte | reader.observe 121.588ms; reader.observe 27.665ms; reader.observe 23.607ms; reader.observe 12.811ms; client.reach-decode-and-cache 11.111ms |
| 3696630475d1d399000000000016bd16 | 918.312 | 46.106 | n/a | 5.898 | 36.087 | 0.809 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 829.411 | 88.092 | 0.096 | 829.411 | node-13/thread-6/socket.wait-first-byte | reader.observe 55.219ms; reader.observe 51.403ms; client.reach-decode-and-cache 42.872ms; reader.observe 38.578ms; reader.observe 25.679ms |
| 371a3791485d8c8e0000000000174f84 | 911.349 | 212.614 | n/a | 48.738 | 15.103 | 446.374 | 90.168 | 0.001 | n/a | 0.003 | 0.000 | n/a | n/a | 98.348 | 276.455 | 0.303 | 98.348 | node-13/thread-5/socket.wait-first-byte | reader.observe 17.912ms; reader.observe 17.136ms; reader.observe 16.545ms; reader.observe 11.037ms; client.reach-decode-and-cache 8.845ms |
| 371a3791485d8c8e000000000016ac2c | 903.732 | 123.463 | n/a | 35.720 | 0.000 | 0.279 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 744.270 | 159.183 | 0.176 | 744.270 | node-13/thread-5/socket.wait-first-byte | reader.observe 45.201ms; reader.observe 14.127ms; reader.observe 11.786ms; reader.observe 6.546ms; client.parse 6.248ms |
| 371a3791485d8c8e0000000000174f8d | 902.973 | 78.105 | n/a | 11.886 | 0.000 | 0.556 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 812.425 | 89.992 | 0.100 | 812.425 | node-13/thread-5/socket.wait-first-byte | reader.observe 17.912ms; reader.observe 17.136ms; reader.observe 16.545ms; reader.observe 11.037ms; reader.observe 8.115ms |
| 371a3791485d8c8e000000000016ac2a | 901.166 | 127.172 | n/a | 35.720 | 0.000 | 0.711 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 737.563 | 162.892 | 0.181 | 737.563 | node-13/thread-5/socket.wait-first-byte | reader.observe 45.201ms; reader.observe 14.127ms; reader.observe 11.786ms; reader.observe 6.546ms; client.parse 6.248ms |
| 3696630475d1d399000000000016bd17 | 900.889 | 35.602 | n/a | 2.167 | 47.854 | 0.588 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 814.679 | 85.623 | 0.095 | 814.679 | node-13/thread-6/socket.wait-first-byte | reader.observe 55.219ms; reader.observe 51.403ms; client.reach-decode-and-cache 42.872ms; reader.observe 38.578ms; reader.observe 25.679ms |
| 371a3791485d8c8e000000000016ac29 | 898.250 | 138.034 | n/a | 51.065 | 0.000 | 0.603 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 708.549 | 189.099 | 0.211 | 708.549 | node-13/thread-5/socket.wait-first-byte | reader.observe 45.201ms; reader.observe 14.127ms; reader.observe 6.546ms; client.parse 6.248ms; client.parse 4.462ms |
| 22a64f1e9553c1710000000000257661 | 896.710 | 24.971 | n/a | 0.000 | 59.022 | 694.964 | 1.346 | 116.398 | n/a | 0.005 | 0.000 | n/a | n/a | 0.003 | 83.993 | 0.094 | 0.003 | node-13/thread-4/socket.wait-first-byte | reader.observe 21.209ms; reader.observe 12.826ms; reader.observe 12.076ms; client.parse 10.885ms; reader.observe 10.400ms |
| 3696630475d1d399000000000016bd15 | 892.532 | 158.057 | n/a | 32.240 | 45.596 | 1.834 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 654.805 | 235.893 | 0.264 | 654.805 | node-13/thread-6/socket.wait-first-byte | reader.observe 55.219ms; reader.observe 51.403ms; client.reach-decode-and-cache 42.872ms; reader.observe 38.578ms; reader.observe 25.679ms |
| 22a64f1e9553c171000000000025763d | 889.519 | 204.929 | n/a | 49.458 | 226.770 | 250.933 | 53.714 | 58.368 | n/a | 0.002 | 0.000 | n/a | n/a | 45.345 | 481.157 | 0.541 | 45.345 | node-13/thread-4/socket.wait-first-byte | reader.observe 21.209ms; reader.observe 12.826ms; reader.observe 12.076ms; client.parse 10.885ms; client.reach-decode-and-cache 10.437ms |
| 3696630475d1d399000000000015f540 | 883.583 | 127.938 | n/a | 97.549 | 0.000 | 549.698 | 0.692 | 54.335 | n/a | 0.003 | 0.000 | n/a | n/a | 53.368 | 225.487 | 0.255 | 53.368 | node-13/thread-6/socket.wait-first-byte | reader.observe 27.665ms; reader.observe 23.607ms; client.reach-decode-and-cache 11.111ms; reader.observe 11.010ms; reader.observe 9.141ms |
| 22a64f1e9553c17100000000002686ef | 879.360 | 242.739 | n/a | 51.253 | 446.594 | 23.241 | 55.159 | 1.333 | n/a | 0.006 | 0.000 | n/a | n/a | 59.035 | 740.585 | 0.842 | 59.035 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 42.707ms; reader.observe 39.885ms; reader.observe 14.385ms; reader.observe 14.244ms; client.parse 9.375ms |

## P1 / L256 / read (14121 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 229.162 | n/a | n/a | n/a | 0.027 | n/a | 0.000 | 229.092 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 229.160 | 1.000 | 0.001 |
| p99 | 260.806 | n/a | n/a | n/a | 4.397 | n/a | 0.000 | 260.708 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.280 | 260.805 | 1.000 | 0.280 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 22a64f1e9553c171000000000031648d | 270.394 | 4.958 | n/a | 0.000 | 265.434 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.392 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000002242c0 | 267.972 | 0.452 | n/a | 0.000 | 267.519 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.970 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000002242c1 | 267.907 | 0.022 | n/a | 0.000 | 267.884 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.906 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000001b256a | 266.839 | 0.145 | n/a | 0.000 | 266.692 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.837 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000001d8e0c | 266.564 | 0.298 | n/a | 0.000 | 266.263 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 266.561 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000001d8e10 | 266.422 | 0.013 | n/a | 0.000 | 266.408 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.421 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000001d8e0d | 266.420 | 0.061 | n/a | 0.000 | 266.358 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.419 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000001d8e0f | 266.417 | 0.013 | n/a | 0.000 | 266.403 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.416 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e00000000001d8e0e | 266.411 | 0.014 | n/a | 0.000 | 266.396 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.410 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 22a64f1e9553c17100000000002ccfb3 | 266.288 | 0.146 | n/a | 0.000 | 266.140 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.286 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e000000000022430d | 266.249 | 0.853 | n/a | 0.000 | 265.394 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.247 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e000000000022430f | 266.172 | 0.324 | n/a | 0.000 | 265.847 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.171 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e0000000000224312 | 266.161 | 0.285 | n/a | 0.000 | 265.850 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 266.135 | 1.000 | 0.026 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e0000000000224310 | 266.063 | 0.108 | n/a | 0.000 | 265.954 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.062 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e0000000000224314 | 266.040 | 0.014 | n/a | 0.000 | 266.025 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.039 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e0000000000224313 | 266.036 | 0.017 | n/a | 0.000 | 266.017 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.034 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e0000000000224311 | 266.032 | 0.083 | n/a | 0.000 | 265.947 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.030 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e000000000022430e | 266.005 | 0.042 | n/a | 0.000 | 265.961 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.002 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 22a64f1e9553c171000000000031648c | 265.864 | 0.246 | n/a | 0.000 | 265.614 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 265.861 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 371a3791485d8c8e000000000022430c | 265.720 | 0.109 | n/a | 0.000 | 265.609 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.719 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (44092 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 154.523 | n/a | n/a | n/a | 0.023 | n/a | 0.000 | 151.689 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 152.905 | 1.000 | 0.001 |
| p99 | 1801.470 | n/a | n/a | n/a | 87.204 | n/a | 58.308 | 269.429 | 498.904 | 0.306 | 325.954 | n/a | 0.002 | 0.000 | n/a | n/a | 7.040 | 316.396 | 1.000 | 7.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 371a3791485d8c8e00000000002bd0eb | 5192.301 | 297.725 | n/a | 40.340 | 0.000 | 4763.908 | 42.512 | 12.516 | n/a | 0.004 | 0.000 | n/a | n/a | 35.296 | 338.065 | 0.065 | 35.296 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0ff | 5150.035 | 1898.009 | n/a | 437.378 | 0.000 | 2321.303 | 42.254 | 451.083 | n/a | 0.004 | 0.000 | n/a | n/a | 0.003 | 2335.387 | 0.453 | 0.003 | node-13/thread-5/client.reach | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0f1 | 5095.183 | 315.901 | n/a | 38.898 | 0.000 | 4653.679 | 41.409 | 12.997 | n/a | 0.003 | 0.000 | n/a | n/a | 32.294 | 354.799 | 0.070 | 32.294 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0ec | 5039.990 | 287.391 | n/a | 35.051 | 0.000 | 4628.577 | 41.001 | 12.350 | n/a | 0.005 | 0.000 | n/a | n/a | 35.615 | 322.441 | 0.064 | 35.615 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0fc | 5013.072 | 248.789 | n/a | 32.747 | 0.000 | 3716.417 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1015.119 | 281.536 | 0.056 | 1015.119 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0fb | 4995.658 | 261.088 | n/a | 40.510 | 0.000 | 4556.455 | 40.874 | 26.134 | n/a | 0.002 | 0.000 | n/a | n/a | 70.596 | 301.598 | 0.060 | 70.596 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0df | 4958.119 | 242.316 | n/a | 32.289 | 0.000 | 3709.861 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 973.653 | 274.605 | 0.055 | 973.653 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0e4 | 4942.382 | 242.663 | n/a | 28.565 | 0.000 | 3688.894 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 982.260 | 271.228 | 0.055 | 982.260 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0bd | 4922.452 | 107.291 | n/a | 17.280 | 0.000 | 3704.975 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1092.906 | 124.571 | 0.025 | 1092.906 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0d4 | 4903.093 | 249.325 | n/a | 32.074 | 0.000 | 3700.818 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 920.876 | 281.399 | 0.057 | 920.876 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd103 | 4885.920 | 1957.471 | n/a | 446.329 | 0.000 | 1227.275 | 0.295 | 407.960 | n/a | 0.002 | 0.000 | n/a | n/a | 846.589 | 2403.800 | 0.492 | 846.589 | node-13/thread-5/client.reach | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0cf | 4866.549 | 243.485 | n/a | 34.389 | 0.000 | 3746.729 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 841.946 | 277.874 | 0.057 | 841.946 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd107 | 4848.627 | 1714.333 | n/a | 379.068 | 0.000 | 2284.176 | 43.810 | 427.229 | n/a | 0.007 | 0.000 | n/a | n/a | 0.004 | 2093.401 | 0.432 | 0.004 | node-13/thread-5/client.reach | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd105 | 4825.615 | 1706.941 | n/a | 374.883 | 0.000 | 1547.990 | 0.275 | 421.085 | n/a | 0.002 | 0.000 | n/a | n/a | 774.438 | 2081.824 | 0.431 | 774.438 | node-13/thread-5/client.reach | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0fe | 4810.033 | 292.409 | n/a | 34.690 | 0.000 | 3679.222 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 803.712 | 327.099 | 0.068 | 803.712 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0b3 | 4787.332 | 87.503 | n/a | 15.468 | 0.000 | 4367.223 | 41.789 | 19.718 | n/a | 0.002 | 0.000 | n/a | n/a | 255.629 | 102.971 | 0.022 | 255.629 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd095 | 4747.757 | 74.007 | n/a | 11.393 | 0.000 | 4352.873 | 41.295 | 12.002 | n/a | 0.002 | 0.000 | n/a | n/a | 256.186 | 85.399 | 0.018 | 256.186 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0a3 | 4719.301 | 95.258 | n/a | 14.881 | 0.000 | 3719.056 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 890.106 | 110.138 | 0.023 | 890.106 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd0a5 | 4685.960 | 93.411 | n/a | 11.728 | 0.000 | 4300.693 | 41.603 | 11.173 | n/a | 0.002 | 0.000 | n/a | n/a | 227.351 | 105.139 | 0.022 | 227.351 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |
| 371a3791485d8c8e00000000002bd097 | 4668.444 | 102.576 | n/a | 14.878 | 0.000 | 4270.364 | 45.638 | 5.812 | n/a | 0.001 | 0.000 | n/a | n/a | 229.175 | 117.454 | 0.025 | 229.175 | node-13/thread-5/socket.queue-and-write | reader.observe 147.322ms; reader.observe 104.286ms; reader.observe 54.481ms; reader.observe 46.493ms; reader.observe 39.404ms |

## P1 / tail / read (34 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.026 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 0.000 | 0.000 | 0.026 |
| p99 | 0.257 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3696630475d1d39900000000002e410d | 0.257 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | uncovered | none observed |
| 3696630475d1d39900000000002e4109 | 0.180 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | uncovered | none observed |
| 3696630475d1d39900000000002e410c | 0.110 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | uncovered | none observed |
| 3696630475d1d39900000000002e4107 | 0.101 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1f4 | 0.100 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | uncovered | none observed |
| 3696630475d1d39900000000002e4108 | 0.097 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | uncovered | none observed |
| 3696630475d1d39900000000002e4105 | 0.088 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1f3 | 0.077 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1e2 | 0.072 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | uncovered | none observed |
| 3696630475d1d39900000000002e410a | 0.063 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.063 | 0.000 | 0.000 | 0.063 | uncovered | none observed |
| 3696630475d1d39900000000002e410e | 0.058 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.058 | 0.000 | 0.000 | 0.058 | uncovered | none observed |
| 3696630475d1d39900000000002e410f | 0.048 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.048 | 0.000 | 0.000 | 0.048 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1f0 | 0.037 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.037 | 0.000 | 0.000 | 0.037 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1ef | 0.035 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.035 | 0.000 | 0.000 | 0.035 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1ee | 0.033 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.033 | 0.000 | 0.000 | 0.033 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1ea | 0.030 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.000 | 0.000 | 0.030 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1eb | 0.030 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.000 | 0.000 | 0.030 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1e5 | 0.026 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 0.000 | 0.000 | 0.026 | uncovered | none observed |
| 371a3791485d8c8e00000000002de1f1 | 0.026 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 0.000 | 0.000 | 0.026 | uncovered | none observed |
| 3696630475d1d39900000000002e4106 | 0.023 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 0.000 | 0.000 | 0.023 | uncovered | none observed |

## P3 / outside-phases / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.240 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 200.576 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 |
| p99 | 434.558 | n/a | n/a | n/a | 24.168 | n/a | 1.675 | 0.000 | 7.656 | 429.865 | 0.099 | n/a | 0.170 | 0.000 | n/a | n/a | 47.418 | 25.079 | 0.315 | 47.418 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d020000000000000002 | 434.558 | 3.072 | n/a | 0.000 | 0.000 | 1.056 | 429.865 | 0.099 | n/a | 0.075 | 0.000 | n/a | n/a | 0.391 | 3.072 | 0.007 | 0.391 | gw-r/thread-47/gateway.admitted-work | none observed |
| 093b24cae2a35bc10000000000000005 | 202.998 | 0.000 | n/a | 0.000 | 0.000 | 1.579 | 200.979 | 0.012 | n/a | 0.170 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-44/journal/page | none observed |
| 093b24cae2a35bc10000000000000006 | 202.882 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 201.184 | 0.014 | n/a | 0.125 | 0.000 | n/a | n/a | 0.454 | 0.000 | 0.000 | 0.454 | gw-r/thread-42/journal/page | none observed |
| 093b24cae2a35bc1000000000000138d | 201.834 | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 201.208 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-484/journal/page | none observed |
| 093b24cae2a35bc10000000000001390 | 201.711 | 0.000 | n/a | 0.000 | 0.000 | 0.512 | 201.032 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-136/journal/page | none observed |
| 093b24cae2a35bc1000000000000138c | 201.510 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 200.754 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-159/journal/page | none observed |
| 093b24cae2a35bc1000000000000138f | 201.240 | 0.000 | n/a | 0.000 | 0.000 | 0.514 | 200.576 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-466/journal/page | none observed |
| 093b24cae2a35bc1000000000000138e | 201.139 | 0.000 | n/a | 0.000 | 0.000 | 0.434 | 200.571 | 0.003 | n/a | 0.045 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-360/journal/page | none observed |
| 093b24cae2a35bc10000000000001393 | 97.193 | 23.533 | n/a | 1.546 | 0.000 | 7.656 | 64.324 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.127 | 25.079 | 0.258 | 0.127 | gw-r/thread-482/gateway.admitted-work | none observed |
| 093b24cae2a35bc10000000000001394 | 78.782 | 24.168 | n/a | 0.000 | 0.000 | 7.196 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.418 | 24.168 | 0.307 | 47.418 | node-13/thread-8/socket.wait-first-byte | none observed |
| 093b24cae2a35bc10000000000001395 | 76.548 | 17.480 | n/a | 1.675 | 0.000 | 5.303 | 51.925 | 0.009 | n/a | 0.006 | 0.000 | n/a | n/a | 0.152 | 19.155 | 0.250 | 0.152 | gw-r/thread-131/gateway.admitted-work | none observed |
| 093b24cae2a35bc10000000000001396 | 70.082 | 22.084 | n/a | 0.000 | 0.000 | 7.119 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.879 | 22.084 | 0.315 | 40.879 | node-13/thread-8/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1005.875 | n/a | n/a | n/a | 0.138 | n/a | 0.000 | 0.000 | 3.305 | 1001.183 | 0.013 | n/a | 0.143 | 0.000 | n/a | n/a | 1.097 | 0.138 | 0.000 | 1.097 |
| p99 | 16555.667 | n/a | n/a | n/a | 0.194 | n/a | 0.000 | 0.000 | 15553.194 | 1001.671 | 0.023 | n/a | 0.287 | 0.000 | n/a | n/a | 1.138 | 0.194 | 0.000 | 1.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d0200000000000000a4 | 16555.667 | 0.194 | n/a | 0.000 | 0.000 | 15553.194 | 1001.671 | 0.013 | n/a | 0.287 | 0.000 | n/a | n/a | 0.308 | 0.194 | 0.000 | 0.308 | node-13/thread-2/socket.wait-first-byte | none observed |
| c9ab53a6f9c03d0200000000000000a5 | 1005.875 | 0.113 | n/a | 0.000 | 0.000 | 3.305 | 1001.183 | 0.013 | n/a | 0.122 | 0.000 | n/a | n/a | 1.138 | 0.113 | 0.000 | 1.138 | gw-r/thread-47/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000a6 | 1003.019 | 0.138 | n/a | 0.000 | 0.000 | 0.461 | 1001.157 | 0.023 | n/a | 0.143 | 0.000 | n/a | n/a | 1.097 | 0.138 | 0.000 | 1.097 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 448.775 | n/a | n/a | n/a | 3.662 | n/a | 0.000 | 0.000 | 1.603 | 431.724 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.132 | 5.072 | 0.017 | 0.132 |
| p99 | 1004.796 | n/a | n/a | n/a | 29.488 | n/a | 12.322 | 0.000 | 6.341 | 1001.083 | 0.093 | n/a | 1.663 | 0.000 | n/a | n/a | 47.245 | 34.790 | 0.456 | 47.245 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d0200000000000000bd | 1004.796 | 0.118 | n/a | 0.000 | 0.000 | 0.812 | 1001.083 | 0.020 | n/a | 1.663 | 0.000 | n/a | n/a | 1.100 | 0.118 | 0.000 | 1.100 | gw-r/thread-44/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000b0 | 996.039 | 3.662 | n/a | 0.000 | 0.000 | 0.633 | 990.676 | 0.058 | n/a | 0.084 | 0.000 | n/a | n/a | 0.926 | 3.662 | 0.004 | 0.926 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000d2 | 991.132 | 2.806 | n/a | 0.000 | 0.000 | 2.580 | 985.575 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.087 | 2.806 | 0.003 | 0.087 | gw-r/thread-44/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000b6 | 977.511 | 3.240 | n/a | 1.352 | 0.000 | 2.516 | 970.150 | 0.014 | n/a | 0.098 | 0.000 | n/a | n/a | 0.140 | 4.592 | 0.005 | 0.140 | gw-r/thread-63/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000bc | 976.381 | 3.918 | n/a | 0.000 | 0.000 | 6.341 | 965.799 | 0.027 | n/a | 0.184 | 0.000 | n/a | n/a | 0.112 | 3.918 | 0.004 | 0.112 | gw-r/thread-70/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000ad | 940.508 | 3.881 | n/a | 4.376 | 0.000 | 3.546 | 928.329 | 0.017 | n/a | 0.105 | 0.000 | n/a | n/a | 0.253 | 8.257 | 0.009 | 0.253 | gw-r/thread-48/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000c4 | 862.517 | 8.362 | n/a | 6.251 | 0.000 | 0.779 | 846.860 | 0.026 | n/a | 0.107 | 0.000 | n/a | n/a | 0.132 | 14.613 | 0.017 | 0.132 | gw-r/thread-49/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000aa | 836.135 | 2.488 | n/a | 0.000 | 0.000 | 2.591 | 830.773 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.182 | 2.488 | 0.003 | 0.182 | gw-r/thread-66/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000cd | 742.807 | 7.639 | n/a | 1.016 | 0.000 | 1.743 | 732.220 | 0.022 | n/a | 0.051 | 0.000 | n/a | n/a | 0.117 | 8.655 | 0.012 | 0.117 | gw-r/thread-68/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000b5 | 617.836 | 3.456 | n/a | 4.691 | 0.000 | 5.546 | 603.914 | 0.021 | n/a | 0.093 | 0.000 | n/a | n/a | 0.115 | 8.146 | 0.013 | 0.115 | gw-r/thread-65/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000cb | 536.796 | 2.839 | n/a | 0.000 | 0.000 | 2.553 | 531.235 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.081 | 2.839 | 0.005 | 0.081 | gw-r/thread-46/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000c2 | 519.190 | 7.195 | n/a | 0.000 | 0.000 | 1.988 | 509.782 | 0.023 | n/a | 0.118 | 0.000 | n/a | n/a | 0.085 | 7.195 | 0.014 | 0.085 | gw-r/thread-71/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000c7 | 502.948 | 2.050 | n/a | 0.000 | 0.000 | 0.715 | 499.928 | 0.064 | n/a | 0.115 | 0.000 | n/a | n/a | 0.077 | 2.050 | 0.004 | 0.077 | gw-r/thread-70/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000c9 | 491.256 | 9.152 | n/a | 0.000 | 0.000 | 0.557 | 481.372 | 0.013 | n/a | 0.066 | 0.000 | n/a | n/a | 0.095 | 9.152 | 0.019 | 0.095 | gw-r/thread-66/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000ca | 460.562 | 2.516 | n/a | 0.000 | 0.000 | 4.341 | 453.539 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.090 | 2.516 | 0.005 | 0.090 | gw-r/thread-44/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000b9 | 448.775 | 11.682 | n/a | 0.916 | 0.000 | 4.212 | 431.724 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.176 | 12.598 | 0.028 | 0.176 | gw-r/thread-45/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000a9 | 333.238 | 6.316 | n/a | 12.322 | 0.000 | 0.624 | 313.646 | 0.027 | n/a | 0.149 | 0.000 | n/a | n/a | 0.155 | 18.637 | 0.056 | 0.155 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000b3 | 309.176 | 6.099 | n/a | 0.832 | 0.000 | 1.198 | 300.841 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.101 | 6.930 | 0.022 | 0.101 | gw-r/thread-46/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000b7 | 296.751 | 6.976 | n/a | 2.178 | 0.000 | 5.518 | 281.728 | 0.093 | n/a | 0.121 | 0.000 | n/a | n/a | 0.138 | 9.154 | 0.031 | 0.138 | gw-r/thread-42/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000cf | 257.320 | 6.193 | n/a | 0.000 | 0.000 | 0.717 | 250.041 | 0.024 | n/a | 0.137 | 0.000 | n/a | n/a | 0.208 | 6.193 | 0.024 | 0.208 | gw-r/thread-66/journal/page | none observed |

## P3 / L1 / internal (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 435.579 | n/a | n/a | n/a | 3.432 | n/a | 0.000 | 0.000 | 0.663 | 429.762 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.107 | 3.538 | 0.010 | 0.107 |
| p99 | 1008.514 | n/a | n/a | n/a | 11.622 | n/a | 1.856 | 0.000 | 4.659 | 1002.248 | 0.037 | n/a | 2.354 | 0.000 | n/a | n/a | 37.077 | 11.622 | 0.512 | 37.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d02000000000000012d | 1008.514 | 5.424 | n/a | 0.000 | 0.000 | 0.617 | 1002.248 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.154 | 5.424 | 0.005 | 0.154 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000d3 | 1007.551 | 6.913 | n/a | 1.011 | 0.000 | 0.953 | 998.431 | 0.013 | n/a | 0.064 | 0.000 | n/a | n/a | 0.167 | 7.923 | 0.008 | 0.167 | gw-r/thread-46/journal/page | none observed |
| c9ab53a6f9c03d02000000000000010f | 1006.505 | 5.537 | n/a | 0.000 | 0.000 | 0.480 | 1000.281 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.162 | 5.537 | 0.006 | 0.162 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d020000000000000116 | 1005.187 | 2.541 | n/a | 1.044 | 0.000 | 3.893 | 997.523 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.089 | 3.584 | 0.004 | 0.089 | gw-r/thread-45/journal/page | none observed |
| c9ab53a6f9c03d020000000000000127 | 1003.740 | 0.168 | n/a | 0.000 | 0.000 | 0.702 | 1000.780 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 2.033 | 0.168 | 0.000 | 2.033 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d020000000000000155 | 1003.716 | 2.848 | n/a | 0.000 | 0.000 | 1.235 | 999.503 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.064 | 2.848 | 0.003 | 0.064 | gw-r/thread-71/journal/page | none observed |
| c9ab53a6f9c03d02000000000000012c | 1002.802 | 2.613 | n/a | 0.000 | 0.000 | 0.536 | 999.525 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.074 | 2.613 | 0.003 | 0.074 | gw-r/thread-65/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000da | 1002.467 | 0.120 | n/a | 0.000 | 0.000 | 0.446 | 1000.708 | 0.013 | n/a | 0.081 | 0.000 | n/a | n/a | 1.098 | 0.120 | 0.000 | 1.098 | gw-r/thread-67/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000d4 | 997.938 | 3.701 | n/a | 0.000 | 0.000 | 0.725 | 993.390 | 0.008 | n/a | 0.030 | 0.000 | n/a | n/a | 0.085 | 3.701 | 0.004 | 0.085 | gw-r/thread-49/journal/page | none observed |
| c9ab53a6f9c03d020000000000000107 | 990.852 | 2.774 | n/a | 0.000 | 0.000 | 0.660 | 987.305 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.064 | 2.774 | 0.003 | 0.064 | gw-r/thread-68/journal/page | none observed |
| c9ab53a6f9c03d020000000000000100 | 990.232 | 2.554 | n/a | 1.115 | 0.000 | 0.517 | 985.904 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.097 | 3.669 | 0.004 | 0.097 | gw-r/thread-44/journal/page | none observed |
| c9ab53a6f9c03d020000000000000139 | 990.114 | 2.665 | n/a | 0.000 | 0.000 | 1.001 | 986.287 | 0.009 | n/a | 0.090 | 0.000 | n/a | n/a | 0.063 | 2.665 | 0.003 | 0.063 | gw-r/thread-70/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000dc | 961.869 | 6.032 | n/a | 0.000 | 0.000 | 0.583 | 954.974 | 0.013 | n/a | 0.076 | 0.000 | n/a | n/a | 0.191 | 6.032 | 0.006 | 0.191 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000e1 | 945.810 | 6.678 | n/a | 1.142 | 0.000 | 0.561 | 937.130 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.250 | 7.819 | 0.008 | 0.250 | gw-r/thread-65/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000e0 | 945.567 | 2.733 | n/a | 0.000 | 0.000 | 2.063 | 940.483 | 0.017 | n/a | 0.070 | 0.000 | n/a | n/a | 0.201 | 2.733 | 0.003 | 0.201 | gw-r/thread-63/journal/page | none observed |
| c9ab53a6f9c03d02000000000000011e | 939.597 | 5.352 | n/a | 0.000 | 0.000 | 0.876 | 933.115 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.203 | 5.352 | 0.006 | 0.203 | gw-r/thread-67/journal/page | none observed |
| c9ab53a6f9c03d020000000000000103 | 922.861 | 2.782 | n/a | 0.000 | 0.000 | 1.820 | 918.058 | 0.006 | n/a | 0.097 | 0.000 | n/a | n/a | 0.097 | 2.782 | 0.003 | 0.097 | gw-r/thread-71/journal/page | none observed |
| c9ab53a6f9c03d020000000000000113 | 916.412 | 5.148 | n/a | 0.000 | 0.000 | 0.687 | 910.417 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.120 | 5.148 | 0.006 | 0.120 | gw-r/thread-42/journal/page | none observed |
| c9ab53a6f9c03d0200000000000000e2 | 895.480 | 3.728 | n/a | 0.000 | 0.000 | 0.748 | 890.864 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.107 | 3.728 | 0.004 | 0.107 | gw-r/thread-49/journal/page | none observed |
| c9ab53a6f9c03d020000000000000142 | 886.884 | 2.809 | n/a | 0.000 | 0.000 | 0.491 | 883.477 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.061 | 2.809 | 0.003 | 0.061 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 340.566 | n/a | n/a | n/a | 2.893 | n/a | 0.000 | 0.000 | 0.902 | 332.738 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.076 | 2.893 | 0.011 | 0.076 |
| p99 | 1004.971 | n/a | n/a | n/a | 9.926 | n/a | 0.000 | 0.000 | 7.730 | 1001.088 | 0.031 | n/a | 0.080 | 0.000 | n/a | n/a | 39.346 | 9.926 | 0.314 | 39.346 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d0200000000000001a8 | 1005.819 | 2.313 | n/a | 0.000 | 0.000 | 1.352 | 1000.982 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 1.103 | 2.313 | 0.002 | 1.103 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d02000000000000018b | 1004.971 | 0.108 | n/a | 0.000 | 0.000 | 2.891 | 1000.796 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 1.118 | 0.108 | 0.000 | 1.118 | gw-r/thread-48/journal/page | none observed |
| c9ab53a6f9c03d020000000000000165 | 1004.725 | 0.117 | n/a | 0.000 | 0.000 | 0.648 | 1001.579 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 2.322 | 0.117 | 0.000 | 2.322 | gw-r/thread-69/journal/page | none observed |
| c9ab53a6f9c03d02000000000000017f | 1003.979 | 0.105 | n/a | 0.000 | 0.000 | 0.573 | 1001.088 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 2.133 | 0.105 | 0.000 | 2.133 | gw-r/thread-46/journal/page | none observed |
| c9ab53a6f9c03d02000000000000016f | 1001.668 | 2.246 | n/a | 0.000 | 0.000 | 0.772 | 996.511 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 2.065 | 2.246 | 0.002 | 2.065 | gw-r/thread-65/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001c6 | 1001.513 | 2.229 | n/a | 0.000 | 0.000 | 2.726 | 996.467 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.060 | 2.229 | 0.002 | 0.060 | gw-r/thread-65/journal/page | none observed |
| c9ab53a6f9c03d020000000000000186 | 997.064 | 7.156 | n/a | 0.000 | 0.000 | 2.874 | 986.827 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.157 | 7.156 | 0.007 | 0.157 | gw-r/thread-67/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001eb | 994.112 | 2.238 | n/a | 0.000 | 0.000 | 0.548 | 991.185 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.059 | 2.238 | 0.002 | 0.059 | gw-r/thread-47/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001c5 | 992.495 | 3.348 | n/a | 0.000 | 0.000 | 2.077 | 986.921 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.112 | 3.348 | 0.003 | 0.112 | gw-r/thread-42/journal/page | none observed |
| c9ab53a6f9c03d020000000000000187 | 987.267 | 2.355 | n/a | 0.000 | 0.000 | 2.407 | 982.366 | 0.004 | n/a | 0.065 | 0.000 | n/a | n/a | 0.069 | 2.355 | 0.002 | 0.069 | gw-r/thread-47/journal/page | none observed |
| c9ab53a6f9c03d02000000000000019b | 977.030 | 2.334 | n/a | 0.000 | 0.000 | 0.813 | 973.763 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.066 | 2.334 | 0.002 | 0.066 | gw-r/thread-65/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001a7 | 975.287 | 2.594 | n/a | 0.000 | 0.000 | 0.630 | 971.919 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.061 | 2.594 | 0.003 | 0.061 | gw-r/thread-68/journal/page | none observed |
| c9ab53a6f9c03d020000000000000174 | 885.551 | 6.322 | n/a | 0.000 | 0.000 | 2.379 | 876.741 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.074 | 6.322 | 0.007 | 0.074 | gw-r/thread-63/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001a6 | 856.236 | 6.009 | n/a | 0.000 | 0.000 | 1.153 | 848.922 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.080 | 6.009 | 0.007 | 0.080 | gw-r/thread-46/journal/page | none observed |
| c9ab53a6f9c03d02000000000000019d | 844.227 | 6.209 | n/a | 0.000 | 0.000 | 1.229 | 836.596 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.130 | 6.209 | 0.007 | 0.130 | gw-r/thread-48/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001d6 | 823.344 | 1.830 | n/a | 0.000 | 0.000 | 1.516 | 819.837 | 0.031 | n/a | 0.067 | 0.000 | n/a | n/a | 0.064 | 1.830 | 0.002 | 0.064 | gw-r/thread-67/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001de | 820.319 | 4.344 | n/a | 0.000 | 0.000 | 2.780 | 813.086 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.067 | 4.344 | 0.005 | 0.067 | gw-r/thread-49/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001f1 | 802.591 | 2.188 | n/a | 0.000 | 0.000 | 1.422 | 798.872 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.062 | 2.188 | 0.003 | 0.062 | gw-r/thread-42/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001f8 | 770.572 | 2.910 | n/a | 0.000 | 0.000 | 2.267 | 760.194 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 5.133 | 2.910 | 0.004 | 5.133 | gw-r/thread-47/journal/page | none observed |
| c9ab53a6f9c03d02000000000000017a | 717.117 | 2.360 | n/a | 0.000 | 0.000 | 1.635 | 713.004 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.073 | 2.360 | 0.003 | 0.073 | gw-r/thread-66/journal/page | none observed |

## P3 / L16 / internal (1472 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.155 | n/a | n/a | n/a | 3.562 | n/a | 0.000 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.508 | 3.567 | 0.283 | 7.508 |
| p99 | 422.023 | n/a | n/a | n/a | 20.375 | n/a | 1.918 | 0.000 | 3.570 | 413.275 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 48.417 | 21.539 | 0.860 | 48.417 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d020000000000000226 | 1006.806 | 8.331 | n/a | 0.000 | 0.000 | 0.483 | 997.867 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.080 | 8.331 | 0.008 | 0.080 | gw-r/thread-66/journal/page | none observed |
| c9ab53a6f9c03d0200000000000001ff | 1004.453 | 6.817 | n/a | 0.000 | 0.000 | 0.525 | 996.907 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.160 | 6.817 | 0.007 | 0.160 | gw-r/thread-42/journal/page | none observed |
| c9ab53a6f9c03d020000000000000213 | 1004.033 | 2.406 | n/a | 0.000 | 0.000 | 0.492 | 1001.004 | 0.014 | n/a | 0.057 | 0.000 | n/a | n/a | 0.060 | 2.406 | 0.002 | 0.060 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d020000000000000219 | 1002.591 | 0.132 | n/a | 0.000 | 0.000 | 0.517 | 1000.770 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 1.108 | 0.132 | 0.000 | 1.108 | gw-r/thread-67/journal/page | none observed |
| c9ab53a6f9c03d020000000000000217 | 1002.552 | 0.113 | n/a | 0.000 | 0.000 | 0.460 | 1000.802 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 1.113 | 0.113 | 0.000 | 1.113 | gw-r/thread-44/journal/page | none observed |
| c9ab53a6f9c03d020000000000000212 | 1000.669 | 2.584 | n/a | 0.000 | 0.000 | 0.707 | 997.248 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.062 | 2.584 | 0.003 | 0.062 | gw-r/thread-66/journal/page | none observed |
| c9ab53a6f9c03d020000000000000227 | 915.980 | 2.013 | n/a | 0.000 | 0.000 | 0.745 | 913.097 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.063 | 2.013 | 0.002 | 0.063 | gw-r/thread-69/journal/page | none observed |
| c9ab53a6f9c03d02000000000000021b | 910.163 | 3.419 | n/a | 0.000 | 0.000 | 0.957 | 905.610 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.128 | 3.419 | 0.004 | 0.128 | gw-r/thread-70/journal/page | none observed |
| c9ab53a6f9c03d020000000000000216 | 909.607 | 6.372 | n/a | 0.000 | 0.000 | 2.009 | 901.107 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.067 | 6.372 | 0.007 | 0.067 | gw-r/thread-65/journal/page | none observed |
| c9ab53a6f9c03d020000000000000200 | 870.499 | 2.214 | n/a | 0.000 | 0.000 | 3.315 | 864.856 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.073 | 2.214 | 0.003 | 0.073 | gw-r/thread-63/journal/page | none observed |
| c9ab53a6f9c03d020000000000000208 | 865.908 | 2.546 | n/a | 0.000 | 0.000 | 0.557 | 862.698 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.064 | 2.546 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| c9ab53a6f9c03d020000000000000203 | 817.463 | 3.093 | n/a | 0.000 | 0.000 | 1.005 | 813.238 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.075 | 3.093 | 0.004 | 0.075 | gw-r/thread-48/journal/page | none observed |
| c9ab53a6f9c03d020000000000000222 | 790.553 | 2.277 | n/a | 0.000 | 0.000 | 0.414 | 787.719 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.065 | 2.277 | 0.003 | 0.065 | gw-r/thread-49/journal/page | none observed |
| c9ab53a6f9c03d02000000000000021e | 789.917 | 2.072 | n/a | 0.000 | 0.000 | 3.224 | 784.507 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.062 | 2.072 | 0.003 | 0.062 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d020000000000000211 | 422.023 | 4.607 | n/a | 0.000 | 0.000 | 4.028 | 413.275 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.072 | 4.607 | 0.011 | 0.072 | gw-r/thread-69/journal/page | none observed |
| c9ab53a6f9c03d02000000000000020f | 249.524 | 2.430 | n/a | 0.000 | 0.000 | 2.045 | 244.948 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.059 | 2.430 | 0.010 | 0.059 | gw-r/thread-42/journal/page | none observed |
| c9ab53a6f9c03d020000000000000209 | 240.750 | 4.456 | n/a | 0.000 | 0.000 | 1.303 | 234.775 | 0.011 | n/a | 0.048 | 0.000 | n/a | n/a | 0.158 | 4.456 | 0.019 | 0.158 | gw-r/thread-67/journal/page | none observed |
| c9ab53a6f9c03d02000000000000021f | 209.053 | 2.370 | n/a | 0.000 | 0.000 | 1.643 | 204.941 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.065 | 2.370 | 0.011 | 0.065 | gw-r/thread-48/journal/page | none observed |
| c9ab53a6f9c03d020000000000000204 | 189.365 | 2.664 | n/a | 0.000 | 0.000 | 1.189 | 185.260 | 0.150 | n/a | 0.045 | 0.000 | n/a | n/a | 0.057 | 2.664 | 0.014 | 0.057 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d020000000000000224 | 187.813 | 2.791 | n/a | 0.000 | 0.000 | 2.834 | 182.051 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.063 | 2.791 | 0.015 | 0.063 | gw-r/thread-42/journal/page | none observed |

## P3 / L64 / internal (1310 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.188 | n/a | n/a | n/a | 5.902 | n/a | 0.000 | 0.000 | 0.329 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.005 | 5.999 | 0.423 | 7.005 |
| p99 | 523.725 | n/a | n/a | n/a | 44.447 | n/a | 5.537 | 0.000 | 5.134 | 514.732 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 47.244 | 46.617 | 0.891 | 47.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d020000000000001982 | 999.347 | 3.412 | n/a | 0.000 | 0.000 | 2.065 | 993.742 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.094 | 3.412 | 0.003 | 0.094 | gw-r/thread-90/journal/page | none observed |
| c9ab53a6f9c03d020000000000001986 | 991.290 | 2.527 | n/a | 0.000 | 0.000 | 0.473 | 988.203 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.057 | 2.527 | 0.003 | 0.057 | gw-r/thread-117/journal/page | none observed |
| c9ab53a6f9c03d020000000000001983 | 963.818 | 11.388 | n/a | 4.671 | 0.000 | 0.358 | 947.035 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.342 | 16.059 | 0.017 | 0.342 | gw-r/thread-124/journal/page | none observed |
| c9ab53a6f9c03d02000000000000198b | 930.406 | 2.428 | n/a | 0.000 | 0.000 | 0.388 | 927.500 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.063 | 2.428 | 0.003 | 0.063 | gw-r/thread-42/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019a4 | 920.855 | 10.124 | n/a | 0.000 | 0.000 | 0.471 | 910.174 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.060 | 10.124 | 0.011 | 0.060 | gw-r/thread-76/journal/page | none observed |
| c9ab53a6f9c03d020000000000001994 | 905.525 | 4.577 | n/a | 0.000 | 0.000 | 1.057 | 899.718 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.123 | 4.577 | 0.005 | 0.123 | gw-r/thread-79/journal/page | none observed |
| c9ab53a6f9c03d020000000000001981 | 855.615 | 2.700 | n/a | 0.000 | 0.000 | 0.865 | 851.962 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.058 | 2.700 | 0.003 | 0.058 | gw-r/thread-48/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019a6 | 704.016 | 8.919 | n/a | 0.000 | 0.000 | 4.605 | 690.394 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.063 | 8.919 | 0.013 | 0.063 | gw-r/thread-127/journal/page | none observed |
| c9ab53a6f9c03d02000000000000198c | 700.220 | 1.779 | n/a | 0.000 | 0.000 | 2.147 | 696.183 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.091 | 1.779 | 0.003 | 0.091 | gw-r/thread-129/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019a8 | 665.223 | 15.173 | n/a | 0.000 | 0.000 | 0.739 | 648.671 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.590 | 15.173 | 0.023 | 0.590 | gw-r/thread-77/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019a0 | 610.657 | 2.190 | n/a | 0.000 | 0.000 | 16.721 | 591.631 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.073 | 2.190 | 0.004 | 0.073 | gw-r/thread-95/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019b6 | 562.902 | 2.987 | n/a | 0.000 | 0.000 | 0.697 | 559.123 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.063 | 2.987 | 0.005 | 0.063 | gw-r/thread-99/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019bb | 527.534 | 2.714 | n/a | 0.000 | 0.000 | 0.583 | 524.120 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.078 | 2.714 | 0.005 | 0.078 | gw-r/thread-116/journal/page | none observed |
| c9ab53a6f9c03d02000000000000199c | 523.725 | 5.760 | n/a | 0.000 | 0.000 | 3.074 | 514.732 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.123 | 5.760 | 0.011 | 0.123 | gw-r/thread-110/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019bf | 422.588 | 2.710 | n/a | 0.000 | 0.000 | 0.745 | 419.052 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.070 | 2.710 | 0.006 | 0.070 | gw-r/thread-48/journal/page | none observed |
| c9ab53a6f9c03d020000000000001999 | 371.491 | 2.945 | n/a | 0.000 | 0.000 | 1.808 | 366.547 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.144 | 2.945 | 0.008 | 0.144 | gw-r/thread-103/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019b4 | 352.199 | 6.835 | n/a | 0.000 | 0.000 | 3.495 | 341.771 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.069 | 6.835 | 0.019 | 0.069 | gw-r/thread-45/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019b7 | 345.985 | 2.628 | n/a | 0.000 | 0.000 | 2.176 | 341.081 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.068 | 2.628 | 0.008 | 0.068 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019b2 | 310.961 | 7.006 | n/a | 0.000 | 0.000 | 0.714 | 302.556 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.636 | 7.006 | 0.023 | 0.636 | gw-r/thread-91/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019ad | 306.583 | 10.449 | n/a | 0.000 | 0.000 | 0.688 | 295.313 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.094 | 10.449 | 0.034 | 0.094 | gw-r/thread-63/journal/page | none observed |

## P3 / L256 / internal (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 348.864 | n/a | n/a | n/a | 2.822 | n/a | 0.000 | 0.000 | 0.787 | 335.956 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.091 | 2.822 | 0.011 | 0.091 |
| p99 | 1004.927 | n/a | n/a | n/a | 14.395 | n/a | 2.983 | 0.000 | 6.083 | 1000.779 | 0.104 | n/a | 0.052 | 0.000 | n/a | n/a | 47.846 | 19.033 | 0.414 | 47.846 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d020000000000001a15 | 1005.981 | 3.839 | n/a | 0.000 | 0.000 | 4.111 | 997.903 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.081 | 3.839 | 0.004 | 0.081 | gw-r/thread-49/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a05 | 1004.927 | 0.076 | n/a | 0.000 | 0.000 | 1.793 | 1001.847 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 1.179 | 0.076 | 0.000 | 1.179 | gw-r/thread-47/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a47 | 1004.760 | 2.210 | n/a | 0.000 | 0.000 | 0.469 | 1000.779 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 1.245 | 2.210 | 0.002 | 1.245 | gw-r/thread-46/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a0a | 1003.422 | 0.154 | n/a | 0.000 | 0.000 | 1.476 | 1000.635 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.111 | 0.154 | 0.000 | 1.111 | gw-r/thread-105/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a21 | 1002.239 | 0.101 | n/a | 0.000 | 0.000 | 0.403 | 1000.585 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 1.106 | 0.101 | 0.000 | 1.106 | gw-r/thread-103/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a42 | 1002.163 | 0.104 | n/a | 0.000 | 0.000 | 0.388 | 1000.555 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.077 | 0.104 | 0.000 | 1.077 | gw-r/thread-101/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a34 | 1001.619 | 3.256 | n/a | 0.000 | 0.000 | 4.560 | 993.694 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.064 | 3.256 | 0.003 | 0.064 | gw-r/thread-65/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a14 | 1000.917 | 3.172 | n/a | 0.000 | 0.000 | 0.499 | 997.115 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.088 | 3.172 | 0.003 | 0.088 | gw-r/thread-84/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a1a | 998.285 | 2.198 | n/a | 0.000 | 0.000 | 1.390 | 994.597 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.057 | 2.198 | 0.002 | 0.057 | gw-r/thread-129/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a19 | 990.369 | 2.212 | n/a | 0.000 | 0.000 | 0.444 | 987.590 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.056 | 2.212 | 0.002 | 0.056 | gw-r/thread-106/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019c9 | 987.173 | 2.766 | n/a | 0.000 | 0.000 | 1.857 | 982.445 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.068 | 2.766 | 0.003 | 0.068 | gw-r/thread-100/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a49 | 982.091 | 2.466 | n/a | 0.000 | 0.000 | 0.372 | 979.174 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.056 | 2.466 | 0.003 | 0.056 | gw-r/thread-114/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a31 | 954.502 | 2.061 | n/a | 0.000 | 0.000 | 0.624 | 951.695 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.073 | 2.061 | 0.002 | 0.073 | gw-r/thread-100/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a1e | 937.804 | 3.315 | n/a | 0.000 | 0.000 | 0.446 | 933.965 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.064 | 3.315 | 0.004 | 0.064 | gw-r/thread-72/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019d8 | 927.816 | 2.624 | n/a | 0.000 | 0.000 | 0.956 | 924.149 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.057 | 2.624 | 0.003 | 0.057 | gw-r/thread-97/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a2c | 909.060 | 2.664 | n/a | 0.000 | 0.000 | 3.268 | 903.048 | 0.002 | n/a | 0.014 | 0.000 | n/a | n/a | 0.064 | 2.664 | 0.003 | 0.064 | gw-r/thread-49/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a3f | 905.141 | 3.543 | n/a | 0.000 | 0.000 | 0.721 | 900.781 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.071 | 3.543 | 0.004 | 0.071 | gw-r/thread-108/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a16 | 904.814 | 2.822 | n/a | 0.000 | 0.000 | 0.689 | 901.199 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.083 | 2.822 | 0.003 | 0.083 | gw-r/thread-87/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a45 | 899.250 | 2.739 | n/a | 0.000 | 0.000 | 2.511 | 893.899 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.076 | 2.739 | 0.003 | 0.076 | gw-r/thread-123/journal/page | none observed |
| c9ab53a6f9c03d0200000000000019c4 | 876.399 | 3.732 | n/a | 0.000 | 0.000 | 5.469 | 867.078 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.064 | 3.732 | 0.004 | 0.064 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / internal (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 391.935 | n/a | n/a | n/a | 4.116 | n/a | 0.000 | 0.000 | 0.839 | 385.270 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.111 | 5.217 | 0.015 | 0.111 |
| p99 | 1009.200 | n/a | n/a | n/a | 24.246 | n/a | 9.496 | 0.000 | 12.731 | 1000.608 | 0.034 | n/a | 0.051 | 0.000 | n/a | n/a | 46.641 | 26.052 | 0.667 | 46.641 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d020000000000001acf | 1009.200 | 8.038 | n/a | 1.662 | 0.000 | 0.599 | 998.656 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.208 | 9.700 | 0.010 | 0.208 | gw-r/thread-180/journal/page | none observed |
| c9ab53a6f9c03d020000000000001acb | 1007.927 | 14.658 | n/a | 8.327 | 0.000 | 1.323 | 983.490 | 0.002 | n/a | 0.011 | 0.000 | n/a | n/a | 0.115 | 22.985 | 0.023 | 0.115 | gw-r/thread-463/journal/page | none observed |
| c9ab53a6f9c03d020000000000001ab3 | 1002.596 | 9.289 | n/a | 0.000 | 0.000 | 2.164 | 991.036 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.078 | 9.289 | 0.009 | 0.078 | gw-r/thread-123/journal/page | none observed |
| c9ab53a6f9c03d020000000000001ab2 | 1002.587 | 2.341 | n/a | 0.000 | 0.000 | 0.481 | 999.656 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.075 | 2.341 | 0.002 | 0.075 | gw-r/thread-101/journal/page | none observed |
| c9ab53a6f9c03d020000000000001aaa | 1002.263 | 0.098 | n/a | 0.000 | 0.000 | 0.422 | 1000.608 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 1.092 | 0.098 | 0.000 | 1.092 | gw-r/thread-110/journal/page | none observed |
| c9ab53a6f9c03d020000000000001aba | 1002.160 | 2.746 | n/a | 0.000 | 0.000 | 0.672 | 998.635 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.074 | 2.746 | 0.003 | 0.074 | gw-r/thread-45/journal/page | none observed |
| c9ab53a6f9c03d020000000000001aa6 | 1000.875 | 24.246 | n/a | 1.806 | 0.000 | 0.611 | 973.853 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.302 | 26.052 | 0.026 | 0.302 | gw-r/thread-111/journal/page | none observed |
| c9ab53a6f9c03d020000000000001aa9 | 996.218 | 2.514 | n/a | 0.000 | 0.000 | 0.657 | 992.945 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.057 | 2.514 | 0.003 | 0.057 | gw-r/thread-118/journal/page | none observed |
| c9ab53a6f9c03d020000000000001aa2 | 995.597 | 5.684 | n/a | 0.000 | 0.000 | 0.504 | 989.230 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.131 | 5.684 | 0.006 | 0.131 | gw-r/thread-85/journal/page | none observed |
| c9ab53a6f9c03d020000000000001ae7 | 986.238 | 3.148 | n/a | 0.000 | 0.000 | 0.557 | 982.409 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.083 | 3.148 | 0.003 | 0.083 | gw-r/thread-431/journal/page | none observed |
| c9ab53a6f9c03d020000000000001ab9 | 982.036 | 2.290 | n/a | 0.000 | 0.000 | 0.598 | 979.014 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.097 | 2.290 | 0.002 | 0.097 | gw-r/thread-129/journal/page | none observed |
| c9ab53a6f9c03d020000000000001ad5 | 981.388 | 4.552 | n/a | 2.044 | 0.000 | 0.715 | 973.923 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.124 | 6.595 | 0.007 | 0.124 | gw-r/thread-48/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a85 | 976.907 | 6.151 | n/a | 0.000 | 0.000 | 1.256 | 969.390 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.079 | 6.151 | 0.006 | 0.079 | gw-r/thread-46/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a82 | 971.895 | 3.535 | n/a | 0.000 | 0.000 | 0.432 | 967.821 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.080 | 3.535 | 0.004 | 0.080 | gw-r/thread-121/journal/page | none observed |
| c9ab53a6f9c03d020000000000001abf | 970.951 | 15.652 | n/a | 0.000 | 0.000 | 0.839 | 954.188 | 0.017 | n/a | 0.035 | 0.000 | n/a | n/a | 0.220 | 15.652 | 0.016 | 0.220 | gw-r/thread-110/journal/page | none observed |
| c9ab53a6f9c03d020000000000001ada | 957.690 | 7.066 | n/a | 2.003 | 0.000 | 2.110 | 946.346 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.130 | 9.069 | 0.009 | 0.130 | gw-r/thread-458/journal/page | none observed |
| c9ab53a6f9c03d020000000000001ae5 | 918.372 | 11.328 | n/a | 0.000 | 0.000 | 1.254 | 905.595 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.137 | 11.328 | 0.012 | 0.137 | gw-r/thread-298/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a56 | 843.020 | 2.189 | n/a | 0.000 | 0.000 | 0.645 | 840.085 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.072 | 2.189 | 0.003 | 0.072 | gw-r/thread-95/journal/page | none observed |
| c9ab53a6f9c03d020000000000001a7f | 831.705 | 2.334 | n/a | 0.000 | 0.000 | 9.200 | 820.036 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.097 | 2.334 | 0.003 | 0.097 | gw-r/thread-127/journal/page | none observed |
| c9ab53a6f9c03d020000000000001aa3 | 823.551 | 9.830 | n/a | 0.000 | 0.000 | 0.458 | 813.073 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.159 | 9.830 | 0.012 | 0.159 | gw-r/thread-113/journal/page | none observed |

## P3 / tail / internal (368 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 321.380 | n/a | n/a | n/a | 3.417 | n/a | 0.000 | 0.000 | 0.531 | 319.148 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.101 | 3.426 | 0.012 | 0.101 |
| p99 | 1005.013 | n/a | n/a | n/a | 16.323 | n/a | 1.597 | 0.000 | 4.142 | 1000.964 | 0.106 | n/a | 0.062 | 0.000 | n/a | n/a | 46.856 | 16.968 | 0.699 | 46.856 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9ab53a6f9c03d020000000000001c48 | 1011.184 | 7.921 | n/a | 0.000 | 0.000 | 0.812 | 1002.227 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.182 | 7.921 | 0.008 | 0.182 | gw-r/thread-47/journal/page | none observed |
| c9ab53a6f9c03d020000000000001c00 | 1005.879 | 4.134 | n/a | 0.000 | 0.000 | 0.612 | 1001.010 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.066 | 4.134 | 0.004 | 0.066 | gw-r/thread-241/journal/page | none observed |
| c9ab53a6f9c03d020000000000001b95 | 1005.278 | 2.828 | n/a | 0.000 | 0.000 | 1.520 | 1000.830 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.060 | 2.828 | 0.003 | 0.060 | gw-r/thread-254/journal/page | none observed |
| c9ab53a6f9c03d020000000000001b0d | 1005.013 | 5.134 | n/a | 0.000 | 0.000 | 0.549 | 999.168 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.131 | 5.134 | 0.005 | 0.131 | gw-r/thread-260/journal/page | none observed |
| c9ab53a6f9c03d020000000000001b7d | 1003.359 | 2.957 | n/a | 0.000 | 0.000 | 0.514 | 999.791 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.058 | 2.957 | 0.003 | 0.058 | gw-r/thread-195/journal/page | none observed |
| c9ab53a6f9c03d020000000000001b2d | 1003.054 | 5.061 | n/a | 0.000 | 0.000 | 0.603 | 997.199 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.154 | 5.061 | 0.005 | 0.154 | gw-r/thread-372/journal/page | none observed |
| c9ab53a6f9c03d020000000000001c62 | 1003.005 | 0.117 | n/a | 0.000 | 0.000 | 0.716 | 1000.988 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 1.133 | 0.117 | 0.000 | 1.133 | gw-r/thread-341/journal/page | none observed |
| c9ab53a6f9c03d020000000000001aeb | 1003.001 | 4.141 | n/a | 0.747 | 0.000 | 0.481 | 997.510 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.088 | 4.888 | 0.005 | 0.088 | gw-r/thread-179/journal/page | none observed |
| c9ab53a6f9c03d020000000000001c52 | 1002.852 | 0.152 | n/a | 0.000 | 0.000 | 0.581 | 1000.938 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 1.110 | 0.152 | 0.000 | 1.110 | gw-r/thread-240/journal/page | none observed |
| c9ab53a6f9c03d020000000000001aec | 1002.757 | 0.108 | n/a | 0.000 | 0.000 | 0.418 | 1000.964 | 0.016 | n/a | 0.165 | 0.000 | n/a | n/a | 1.086 | 0.108 | 0.000 | 1.086 | gw-r/thread-277/journal/page | none observed |
| c9ab53a6f9c03d020000000000001c43 | 1002.736 | 2.559 | n/a | 0.000 | 0.000 | 0.363 | 999.718 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.068 | 2.559 | 0.003 | 0.068 | gw-r/thread-254/journal/page | none observed |
| c9ab53a6f9c03d020000000000001bde | 1002.721 | 0.130 | n/a | 0.000 | 0.000 | 0.584 | 1000.848 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 1.104 | 0.130 | 0.000 | 1.104 | gw-r/thread-273/journal/page | none observed |
| c9ab53a6f9c03d020000000000001b70 | 1002.705 | 0.195 | n/a | 0.000 | 0.000 | 0.583 | 1000.719 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 1.157 | 0.195 | 0.000 | 1.157 | gw-r/thread-331/journal/page | none observed |
| c9ab53a6f9c03d020000000000001c47 | 1002.684 | 5.757 | n/a | 0.000 | 0.000 | 0.517 | 996.247 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.126 | 5.757 | 0.006 | 0.126 | gw-r/thread-297/journal/page | none observed |
| c9ab53a6f9c03d020000000000001c2a | 1002.426 | 0.099 | n/a | 0.000 | 0.000 | 0.445 | 1000.690 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 1.140 | 0.099 | 0.000 | 1.140 | gw-r/thread-206/journal/page | none observed |
| c9ab53a6f9c03d020000000000001d03 | 1002.387 | 0.152 | n/a | 0.000 | 0.000 | 0.515 | 1000.539 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 1.130 | 0.152 | 0.000 | 1.130 | gw-r/thread-261/journal/page | none observed |
| c9ab53a6f9c03d020000000000001d14 | 1002.244 | 5.825 | n/a | 0.000 | 0.000 | 0.852 | 995.393 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.146 | 5.825 | 0.006 | 0.146 | gw-r/thread-383/journal/page | none observed |
| c9ab53a6f9c03d020000000000001d0c | 1002.234 | 0.115 | n/a | 0.000 | 0.000 | 0.414 | 1000.581 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 1.092 | 0.115 | 0.000 | 1.092 | gw-r/thread-355/journal/page | none observed |
| c9ab53a6f9c03d020000000000001b00 | 1002.200 | 0.125 | n/a | 0.000 | 0.000 | 0.476 | 1000.466 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 1.098 | 0.125 | 0.000 | 1.098 | gw-r/thread-246/journal/page | none observed |
| c9ab53a6f9c03d020000000000001ce4 | 1002.089 | 0.100 | n/a | 0.000 | 0.000 | 0.362 | 1000.496 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 1.089 | 0.100 | 0.000 | 1.089 | gw-r/thread-173/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.524 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.152 | 201.242 | 0.016 | n/a | 0.115 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 209.815 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.031 | 207.392 | 2.621 | n/a | 4.223 | 0.000 | n/a | n/a | 1.858 | 0.000 | 0.000 | 1.858 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 093b24cae2a35bc10000000000000058 | 209.815 | 0.000 | n/a | 0.000 | 0.000 | 2.719 | 206.865 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 093b24cae2a35bc10000000000000031 | 208.438 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 207.392 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc1000000000000000d | 208.016 | 0.000 | n/a | 0.000 | 0.000 | 3.405 | 204.228 | 0.102 | n/a | 0.175 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc10000000000000059 | 207.837 | 0.000 | n/a | 0.000 | 0.000 | 2.675 | 204.900 | 0.035 | n/a | 0.116 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-69/journal/page | none observed |
| 093b24cae2a35bc10000000000000040 | 207.348 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 204.482 | 0.020 | n/a | 0.156 | 0.000 | n/a | n/a | 1.858 | 0.000 | 0.000 | 1.858 | gw-r/thread-65/journal/page | none observed |
| 093b24cae2a35bc1000000000000000b | 207.221 | 0.000 | n/a | 0.000 | 0.000 | 3.154 | 203.836 | 0.014 | n/a | 0.097 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-67/journal/page | none observed |
| 093b24cae2a35bc10000000000000007 | 206.879 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 205.579 | 0.059 | n/a | 0.205 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-46/journal/page | none observed |
| 093b24cae2a35bc1000000000000002d | 206.577 | 0.000 | n/a | 0.000 | 0.000 | 2.873 | 203.388 | 0.026 | n/a | 0.166 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-72/journal/page | none observed |
| 093b24cae2a35bc10000000000000009 | 206.316 | 0.000 | n/a | 0.000 | 0.000 | 2.303 | 203.080 | 0.019 | n/a | 0.218 | 0.000 | n/a | n/a | 0.697 | 0.000 | 0.000 | 0.697 | gw-r/thread-44/journal/page | none observed |
| 093b24cae2a35bc10000000000000025 | 206.098 | 0.000 | n/a | 0.000 | 0.000 | 4.333 | 201.415 | 0.021 | n/a | 0.158 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-70/journal/page | none observed |
| 093b24cae2a35bc10000000000000052 | 206.067 | 0.000 | n/a | 0.000 | 0.000 | 1.487 | 204.302 | 0.017 | n/a | 0.138 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-42/journal/page | none observed |
| 093b24cae2a35bc1000000000000004b | 205.814 | 0.000 | n/a | 0.000 | 0.000 | 3.636 | 201.946 | 0.020 | n/a | 0.111 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 093b24cae2a35bc1000000000000005b | 205.320 | 0.000 | n/a | 0.000 | 0.000 | 1.848 | 203.141 | 0.013 | n/a | 0.121 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-48/journal/page | none observed |
| 093b24cae2a35bc1000000000000000f | 205.209 | 0.000 | n/a | 0.000 | 0.000 | 3.224 | 201.638 | 0.028 | n/a | 0.226 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-65/journal/page | none observed |
| 093b24cae2a35bc10000000000000023 | 205.058 | 0.000 | n/a | 0.000 | 0.000 | 1.210 | 203.602 | 0.026 | n/a | 0.107 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-72/journal/page | none observed |
| 093b24cae2a35bc1000000000000001a | 204.979 | 0.000 | n/a | 0.000 | 0.000 | 2.077 | 202.632 | 0.015 | n/a | 0.115 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-69/journal/page | none observed |
| 093b24cae2a35bc1000000000000002f | 204.915 | 0.000 | n/a | 0.000 | 0.000 | 2.345 | 202.254 | 0.018 | n/a | 0.149 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-69/journal/page | none observed |
| 093b24cae2a35bc10000000000000041 | 204.896 | 0.000 | n/a | 0.000 | 0.000 | 2.510 | 202.054 | 0.022 | n/a | 0.194 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-44/journal/page | none observed |
| 093b24cae2a35bc10000000000000026 | 204.889 | 0.000 | n/a | 0.000 | 0.000 | 1.682 | 202.983 | 0.014 | n/a | 0.100 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc10000000000000014 | 204.706 | 0.000 | n/a | 0.000 | 0.000 | 3.460 | 200.951 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-42/journal/page | none observed |

## P3 / L1 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.803 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 200.816 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 206.733 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.173 | 204.536 | 3.340 | n/a | 0.195 | 0.000 | n/a | n/a | 0.286 | 0.000 | 0.000 | 0.286 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 093b24cae2a35bc1000000000000007f | 209.909 | 0.000 | n/a | 0.000 | 0.000 | 4.173 | 205.427 | 0.047 | n/a | 0.130 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-66/journal/page | none observed |
| 093b24cae2a35bc100000000000000bf | 207.451 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 206.648 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| 093b24cae2a35bc10000000000000081 | 206.733 | 0.000 | n/a | 0.000 | 0.000 | 5.502 | 200.904 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-71/journal/page | none observed |
| 093b24cae2a35bc100000000000000d6 | 205.984 | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 204.506 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.426 | 0.000 | 0.000 | 0.426 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc10000000000000105 | 205.549 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 204.536 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 093b24cae2a35bc100000000000000d1 | 205.418 | 0.000 | n/a | 0.000 | 0.000 | 3.931 | 201.272 | 0.014 | n/a | 0.101 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 093b24cae2a35bc100000000000000ac | 205.315 | 0.000 | n/a | 0.000 | 0.000 | 2.068 | 199.760 | 3.340 | n/a | 0.031 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-72/journal/page | none observed |
| 093b24cae2a35bc100000000000000e6 | 205.124 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 204.234 | 0.027 | n/a | 0.080 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 093b24cae2a35bc1000000000000009c | 205.054 | 0.000 | n/a | 0.000 | 0.000 | 4.004 | 200.814 | 0.014 | n/a | 0.091 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-65/journal/page | none observed |
| 093b24cae2a35bc100000000000000e1 | 204.881 | 0.000 | n/a | 0.000 | 0.000 | 3.835 | 200.819 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-71/journal/page | none observed |
| 093b24cae2a35bc100000000000000de | 204.823 | 0.000 | n/a | 0.000 | 0.000 | 3.607 | 201.015 | 0.009 | n/a | 0.091 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 093b24cae2a35bc100000000000000a3 | 204.747 | 0.000 | n/a | 0.000 | 0.000 | 3.390 | 201.120 | 0.014 | n/a | 0.130 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc10000000000000126 | 204.649 | 0.000 | n/a | 0.000 | 0.000 | 3.477 | 201.008 | 0.005 | n/a | 0.070 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 093b24cae2a35bc1000000000000015a | 204.595 | 0.000 | n/a | 0.000 | 0.000 | 3.698 | 200.731 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 093b24cae2a35bc100000000000000dc | 204.579 | 0.000 | n/a | 0.000 | 0.000 | 3.285 | 201.127 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-67/journal/page | none observed |
| 093b24cae2a35bc10000000000000060 | 204.453 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 203.221 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-66/journal/page | none observed |
| 093b24cae2a35bc10000000000000141 | 204.408 | 0.000 | n/a | 0.000 | 0.000 | 3.600 | 200.659 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-70/journal/page | none observed |
| 093b24cae2a35bc10000000000000116 | 204.295 | 0.000 | n/a | 0.000 | 0.000 | 3.216 | 200.853 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-71/journal/page | none observed |
| 093b24cae2a35bc1000000000000007e | 204.249 | 0.000 | n/a | 0.000 | 0.000 | 3.360 | 200.691 | 0.013 | n/a | 0.081 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 093b24cae2a35bc1000000000000007b | 204.234 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 203.057 | 0.015 | n/a | 0.108 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-68/journal/page | none observed |

## P3 / L4 / read (218 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.835 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.847 | 200.820 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 206.791 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.146 | 204.444 | 4.717 | n/a | 0.100 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 093b24cae2a35bc1000000000000020f | 215.072 | 0.000 | n/a | 0.000 | 0.000 | 10.415 | 204.444 | 0.014 | n/a | 0.060 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-45/journal/page | none observed |
| 093b24cae2a35bc10000000000000165 | 210.650 | 0.000 | n/a | 0.000 | 0.000 | 5.048 | 205.378 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-67/journal/page | none observed |
| 093b24cae2a35bc10000000000000201 | 206.791 | 0.000 | n/a | 0.000 | 0.000 | 5.625 | 200.924 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-44/journal/page | none observed |
| 093b24cae2a35bc10000000000000187 | 206.099 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 205.419 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 093b24cae2a35bc10000000000000214 | 205.492 | 0.000 | n/a | 0.000 | 0.000 | 4.237 | 201.055 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc1000000000000023b | 205.158 | 0.000 | n/a | 0.000 | 0.000 | 0.651 | 204.347 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc100000000000001d9 | 205.027 | 0.000 | n/a | 0.000 | 0.000 | 3.896 | 200.972 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 093b24cae2a35bc1000000000000021a | 204.842 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 204.024 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 093b24cae2a35bc1000000000000021f | 204.672 | 0.000 | n/a | 0.000 | 0.000 | 3.846 | 200.638 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 093b24cae2a35bc10000000000000194 | 204.605 | 0.000 | n/a | 0.000 | 0.000 | 0.589 | 203.783 | 0.020 | n/a | 0.066 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| 093b24cae2a35bc100000000000001fe | 204.534 | 0.000 | n/a | 0.000 | 0.000 | 3.463 | 200.846 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-48/journal/page | none observed |
| 093b24cae2a35bc100000000000001d1 | 204.477 | 0.000 | n/a | 0.000 | 0.000 | 1.915 | 202.379 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-63/journal/page | none observed |
| 093b24cae2a35bc1000000000000016d | 204.353 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 203.576 | 0.007 | n/a | 0.096 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 093b24cae2a35bc10000000000000200 | 204.337 | 0.000 | n/a | 0.000 | 0.000 | 0.433 | 203.732 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 093b24cae2a35bc10000000000000209 | 204.138 | 0.000 | n/a | 0.000 | 0.000 | 2.913 | 201.043 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 093b24cae2a35bc100000000000001f9 | 204.105 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 203.162 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-69/journal/page | none observed |
| 093b24cae2a35bc100000000000001a7 | 203.717 | 0.000 | n/a | 0.000 | 0.000 | 1.176 | 202.179 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-70/journal/page | none observed |
| 093b24cae2a35bc100000000000001c1 | 203.686 | 0.000 | n/a | 0.000 | 0.000 | 1.497 | 201.962 | 0.017 | n/a | 0.074 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-66/journal/page | none observed |
| 093b24cae2a35bc100000000000001e0 | 203.675 | 0.000 | n/a | 0.000 | 0.000 | 2.316 | 201.153 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 093b24cae2a35bc1000000000000022b | 203.672 | 0.000 | n/a | 0.000 | 0.000 | 2.881 | 200.595 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (136 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.342 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 86.610 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 |
| p99 | 207.313 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 8.920 | 203.190 | 1.746 | n/a | 0.085 | 0.000 | n/a | n/a | 51.760 | 0.000 | 0.000 | 51.760 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 093b24cae2a35bc10000000000000281 | 210.081 | 0.000 | n/a | 0.000 | 0.000 | 8.920 | 200.986 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-42/journal/page | none observed |
| 093b24cae2a35bc10000000000000258 | 207.313 | 0.000 | n/a | 0.000 | 0.000 | 6.303 | 200.842 | 0.017 | n/a | 0.055 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-67/journal/page | none observed |
| 093b24cae2a35bc10000000000000299 | 204.995 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 203.873 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| 093b24cae2a35bc1000000000000025f | 204.207 | 0.000 | n/a | 0.000 | 0.000 | 2.761 | 201.246 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc1000000000000029d | 204.036 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 203.190 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-45/journal/page | none observed |
| 093b24cae2a35bc10000000000000269 | 203.606 | 0.000 | n/a | 0.000 | 0.000 | 1.299 | 202.102 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc10000000000000276 | 203.349 | 0.000 | n/a | 0.000 | 0.000 | 2.063 | 201.085 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 093b24cae2a35bc10000000000000271 | 203.238 | 0.000 | n/a | 0.000 | 0.000 | 0.408 | 202.692 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-63/journal/page | none observed |
| 093b24cae2a35bc10000000000000293 | 202.655 | 0.000 | n/a | 0.000 | 0.000 | 1.607 | 200.880 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-70/journal/page | none observed |
| 093b24cae2a35bc10000000000000263 | 202.583 | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 201.840 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-70/journal/page | none observed |
| 093b24cae2a35bc10000000000000287 | 202.512 | 0.000 | n/a | 0.000 | 0.000 | 0.739 | 201.505 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-44/journal/page | none observed |
| 093b24cae2a35bc1000000000000027e | 202.434 | 0.000 | n/a | 0.000 | 0.000 | 0.700 | 201.511 | 0.015 | n/a | 0.081 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-70/journal/page | none observed |
| 093b24cae2a35bc10000000000000259 | 202.431 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 201.270 | 0.028 | n/a | 0.081 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-65/journal/page | none observed |
| 093b24cae2a35bc1000000000000025d | 202.424 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.148 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 093b24cae2a35bc10000000000000257 | 202.287 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 200.866 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 093b24cae2a35bc10000000000000298 | 202.244 | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 200.967 | 0.006 | n/a | 0.075 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-72/journal/page | none observed |
| 093b24cae2a35bc10000000000000297 | 202.142 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 200.979 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 093b24cae2a35bc1000000000000028b | 202.136 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 200.887 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-42/journal/page | none observed |
| 093b24cae2a35bc10000000000000286 | 202.132 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.028 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-69/journal/page | none observed |
| 093b24cae2a35bc10000000000000292 | 202.101 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 201.274 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (128 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 120.522 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 119.599 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 204.893 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.296 | 201.670 | 2.763 | n/a | 0.083 | 0.000 | n/a | n/a | 52.057 | 0.000 | 0.000 | 52.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 093b24cae2a35bc10000000000000dac | 206.261 | 0.000 | n/a | 0.000 | 0.000 | 5.490 | 200.602 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-86/journal/page | none observed |
| 093b24cae2a35bc10000000000000dcb | 204.893 | 0.000 | n/a | 0.000 | 0.000 | 3.474 | 201.280 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-107/journal/page | none observed |
| 093b24cae2a35bc10000000000000d8a | 204.854 | 0.000 | n/a | 0.000 | 0.000 | 0.494 | 200.783 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 3.524 | 0.000 | 0.000 | 3.524 | gw-r/thread-112/journal/page | none observed |
| 093b24cae2a35bc10000000000000da8 | 204.751 | 0.000 | n/a | 0.000 | 0.000 | 3.225 | 201.375 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-125/journal/page | none observed |
| 093b24cae2a35bc10000000000000d7c | 204.213 | 0.000 | n/a | 0.000 | 0.000 | 2.889 | 201.107 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-97/journal/page | none observed |
| 093b24cae2a35bc10000000000000d7b | 204.169 | 0.000 | n/a | 0.000 | 0.000 | 0.396 | 203.640 | 0.010 | n/a | 0.033 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-78/journal/page | none observed |
| 093b24cae2a35bc10000000000000d91 | 204.111 | 0.000 | n/a | 0.000 | 0.000 | 3.354 | 200.625 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-106/journal/page | none observed |
| 093b24cae2a35bc10000000000000dc0 | 202.806 | 0.000 | n/a | 0.000 | 0.000 | 1.709 | 200.863 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-94/journal/page | none observed |
| 093b24cae2a35bc10000000000000d86 | 202.617 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 201.459 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-84/journal/page | none observed |
| 093b24cae2a35bc10000000000000dc9 | 202.598 | 0.000 | n/a | 0.000 | 0.000 | 1.125 | 201.286 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc10000000000000d96 | 202.395 | 0.000 | n/a | 0.000 | 0.000 | 1.475 | 200.772 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 093b24cae2a35bc10000000000000da6 | 202.370 | 0.000 | n/a | 0.000 | 0.000 | 1.511 | 200.687 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-80/journal/page | none observed |
| 093b24cae2a35bc10000000000000d92 | 202.340 | 0.000 | n/a | 0.000 | 0.000 | 0.498 | 201.670 | 0.015 | n/a | 0.055 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 093b24cae2a35bc10000000000000dbf | 202.149 | 0.000 | n/a | 0.000 | 0.000 | 1.447 | 200.553 | 0.016 | n/a | 0.017 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-100/journal/page | none observed |
| 093b24cae2a35bc10000000000000d85 | 202.128 | 0.000 | n/a | 0.000 | 0.000 | 1.406 | 200.585 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-76/journal/page | none observed |
| 093b24cae2a35bc10000000000000dd5 | 202.060 | 0.000 | n/a | 0.000 | 0.000 | 0.409 | 201.516 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-78/journal/page | none observed |
| 093b24cae2a35bc10000000000000dbe | 201.948 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 201.269 | 0.026 | n/a | 0.049 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 093b24cae2a35bc10000000000000d87 | 201.917 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 200.770 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-101/journal/page | none observed |
| 093b24cae2a35bc10000000000000da9 | 201.902 | 0.000 | n/a | 0.000 | 0.000 | 0.427 | 201.343 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-78/journal/page | none observed |
| 093b24cae2a35bc10000000000000dcc | 201.866 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 201.054 | 0.015 | n/a | 0.087 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-93/journal/page | none observed |

## P3 / L256 / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.357 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.609 | 200.600 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 |
| p99 | 206.231 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.548 | 203.825 | 2.858 | n/a | 0.087 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 093b24cae2a35bc10000000000000de3 | 206.678 | 0.000 | n/a | 0.000 | 0.000 | 5.548 | 200.938 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-122/journal/page | none observed |
| 093b24cae2a35bc10000000000000ed1 | 206.460 | 0.000 | n/a | 0.000 | 0.000 | 3.266 | 202.983 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-45/journal/page | none observed |
| 093b24cae2a35bc10000000000000dec | 206.231 | 0.000 | n/a | 0.000 | 0.000 | 1.954 | 204.063 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-63/journal/page | none observed |
| 093b24cae2a35bc10000000000000ddb | 205.236 | 0.000 | n/a | 0.000 | 0.000 | 4.411 | 200.639 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-120/journal/page | none observed |
| 093b24cae2a35bc10000000000000ec6 | 205.032 | 0.000 | n/a | 0.000 | 0.000 | 0.566 | 204.320 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-106/journal/page | none observed |
| 093b24cae2a35bc10000000000000e7e | 204.698 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 203.825 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-89/journal/page | none observed |
| 093b24cae2a35bc10000000000000e5c | 204.568 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 203.789 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-109/journal/page | none observed |
| 093b24cae2a35bc10000000000000e14 | 204.513 | 0.000 | n/a | 0.000 | 0.000 | 3.513 | 200.832 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 093b24cae2a35bc10000000000000eca | 204.372 | 0.000 | n/a | 0.000 | 0.000 | 3.670 | 200.550 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-126/journal/page | none observed |
| 093b24cae2a35bc10000000000000e34 | 204.020 | 0.000 | n/a | 0.000 | 0.000 | 3.450 | 200.423 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-117/journal/page | none observed |
| 093b24cae2a35bc10000000000000eb0 | 203.797 | 0.000 | n/a | 0.000 | 0.000 | 2.823 | 200.816 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-86/journal/page | none observed |
| 093b24cae2a35bc10000000000000e18 | 203.508 | 0.000 | n/a | 0.000 | 0.000 | 3.377 | 200.013 | 0.002 | n/a | 0.015 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-88/journal/page | none observed |
| 093b24cae2a35bc10000000000000e19 | 203.436 | 0.000 | n/a | 0.000 | 0.000 | 2.742 | 200.552 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-65/journal/page | none observed |
| 093b24cae2a35bc10000000000000e07 | 203.037 | 0.000 | n/a | 0.000 | 0.000 | 1.925 | 200.952 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-76/journal/page | none observed |
| 093b24cae2a35bc10000000000000e85 | 203.019 | 0.000 | n/a | 0.000 | 0.000 | 2.175 | 200.652 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-97/journal/page | none observed |
| 093b24cae2a35bc10000000000000ed2 | 202.973 | 0.000 | n/a | 0.000 | 0.000 | 2.052 | 200.755 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-105/journal/page | none observed |
| 093b24cae2a35bc10000000000000e08 | 202.914 | 0.000 | n/a | 0.000 | 0.000 | 2.039 | 200.713 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-109/journal/page | none observed |
| 093b24cae2a35bc10000000000000de9 | 202.708 | 0.000 | n/a | 0.000 | 0.000 | 1.699 | 200.803 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-69/journal/page | none observed |
| 093b24cae2a35bc10000000000000e49 | 202.677 | 0.000 | n/a | 0.000 | 0.000 | 1.716 | 200.752 | 0.012 | n/a | 0.040 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc10000000000000e51 | 202.617 | 0.000 | n/a | 0.000 | 0.000 | 1.155 | 201.256 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-104/journal/page | none observed |

## P3 / L1024 / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.383 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 200.642 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 206.814 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.103 | 204.195 | 6.245 | n/a | 0.083 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 093b24cae2a35bc10000000000000f90 | 397.128 | 0.000 | n/a | 0.000 | 0.000 | 193.887 | 203.128 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-187/journal/page | none observed |
| 093b24cae2a35bc10000000000000eef | 212.326 | 0.000 | n/a | 0.000 | 0.000 | 0.621 | 211.510 | 0.030 | n/a | 0.056 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-88/journal/page | none observed |
| 093b24cae2a35bc10000000000000fb8 | 206.814 | 0.000 | n/a | 0.000 | 0.000 | 5.705 | 200.948 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-218/journal/page | none observed |
| 093b24cae2a35bc10000000000000f45 | 206.014 | 0.000 | n/a | 0.000 | 0.000 | 5.080 | 200.788 | 0.011 | n/a | 0.038 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-91/journal/page | none observed |
| 093b24cae2a35bc10000000000000f8f | 205.981 | 0.000 | n/a | 0.000 | 0.000 | 4.787 | 201.012 | 0.002 | n/a | 0.029 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-110/journal/page | none observed |
| 093b24cae2a35bc10000000000000fb0 | 205.281 | 0.000 | n/a | 0.000 | 0.000 | 0.533 | 204.552 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-215/journal/page | none observed |
| 093b24cae2a35bc10000000000000efb | 205.046 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 203.998 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-79/journal/page | none observed |
| 093b24cae2a35bc10000000000000eff | 204.833 | 0.000 | n/a | 0.000 | 0.000 | 0.437 | 204.195 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-110/journal/page | none observed |
| 093b24cae2a35bc10000000000000eea | 204.799 | 0.000 | n/a | 0.000 | 0.000 | 4.098 | 200.505 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-77/journal/page | none observed |
| 093b24cae2a35bc10000000000000fc9 | 204.747 | 0.000 | n/a | 0.000 | 0.000 | 3.857 | 200.747 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-168/journal/page | none observed |
| 093b24cae2a35bc10000000000000f63 | 204.523 | 0.000 | n/a | 0.000 | 0.000 | 2.323 | 202.052 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-90/journal/page | none observed |
| 093b24cae2a35bc10000000000000fae | 204.341 | 0.000 | n/a | 0.000 | 0.000 | 3.535 | 200.658 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-92/journal/page | none observed |
| 093b24cae2a35bc10000000000000ef4 | 204.164 | 0.000 | n/a | 0.000 | 0.000 | 0.518 | 203.504 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-68/journal/page | none observed |
| 093b24cae2a35bc10000000000000f35 | 204.154 | 0.000 | n/a | 0.000 | 0.000 | 1.323 | 202.635 | 0.015 | n/a | 0.052 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-120/journal/page | none observed |
| 093b24cae2a35bc10000000000000f54 | 203.933 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 203.056 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-107/journal/page | none observed |
| 093b24cae2a35bc10000000000000fc7 | 203.765 | 0.000 | n/a | 0.000 | 0.000 | 0.443 | 203.177 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-205/journal/page | none observed |
| 093b24cae2a35bc10000000000000ef2 | 203.652 | 0.000 | n/a | 0.000 | 0.000 | 3.058 | 200.462 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-63/journal/page | none observed |
| 093b24cae2a35bc10000000000000ee0 | 203.451 | 0.000 | n/a | 0.000 | 0.000 | 1.286 | 201.990 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-90/journal/page | none observed |
| 093b24cae2a35bc10000000000000f1a | 203.412 | 0.000 | n/a | 0.000 | 0.000 | 0.478 | 202.778 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-88/journal/page | none observed |
| 093b24cae2a35bc10000000000000fc2 | 203.341 | 0.000 | n/a | 0.000 | 0.000 | 2.547 | 200.639 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-229/journal/page | none observed |

## P3 / tail / read (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.211 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.486 | 200.565 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 202.927 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.862 | 201.602 | 0.740 | n/a | 0.109 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 093b24cae2a35bc100000000000012ed | 207.648 | 0.000 | n/a | 0.000 | 0.000 | 0.343 | 207.189 | 0.005 | n/a | 0.010 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-226/journal/page | none observed |
| 093b24cae2a35bc10000000000001261 | 204.316 | 0.000 | n/a | 0.000 | 0.000 | 3.440 | 200.655 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-339/journal/page | none observed |
| 093b24cae2a35bc10000000000001031 | 203.911 | 0.000 | n/a | 0.000 | 0.000 | 1.311 | 202.458 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-269/journal/page | none observed |
| 093b24cae2a35bc10000000000001042 | 203.750 | 0.000 | n/a | 0.000 | 0.000 | 2.343 | 201.222 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-341/journal/page | none observed |
| 093b24cae2a35bc10000000000001106 | 203.393 | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 202.497 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-127/journal/page | none observed |
| 093b24cae2a35bc100000000000011d0 | 203.369 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 202.177 | 0.009 | n/a | 0.128 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-455/journal/page | none observed |
| 093b24cae2a35bc100000000000010e4 | 203.349 | 0.000 | n/a | 0.000 | 0.000 | 2.559 | 200.650 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-318/journal/page | none observed |
| 093b24cae2a35bc10000000000001345 | 203.010 | 0.000 | n/a | 0.000 | 0.000 | 0.433 | 202.448 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-264/journal/page | none observed |
| 093b24cae2a35bc1000000000000101b | 202.927 | 0.000 | n/a | 0.000 | 0.000 | 2.143 | 200.588 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-267/journal/page | none observed |
| 093b24cae2a35bc1000000000000130f | 202.899 | 0.000 | n/a | 0.000 | 0.000 | 0.342 | 202.436 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.071 | 0.000 | 0.000 | 0.071 | gw-r/thread-283/journal/page | none observed |
| 093b24cae2a35bc100000000000010de | 202.748 | 0.000 | n/a | 0.000 | 0.000 | 1.679 | 200.891 | 0.024 | n/a | 0.062 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-206/journal/page | none observed |
| 093b24cae2a35bc10000000000001361 | 202.667 | 0.000 | n/a | 0.000 | 0.000 | 1.466 | 200.979 | 0.007 | n/a | 0.127 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-99/journal/page | none observed |
| 093b24cae2a35bc10000000000001278 | 202.665 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 201.574 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-125/journal/page | none observed |
| 093b24cae2a35bc10000000000000ff8 | 202.568 | 0.000 | n/a | 0.000 | 0.000 | 1.844 | 200.584 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-189/journal/page | none observed |
| 093b24cae2a35bc1000000000000127e | 202.533 | 0.000 | n/a | 0.000 | 0.000 | 1.243 | 201.045 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-273/journal/page | none observed |
| 093b24cae2a35bc10000000000001105 | 202.521 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 201.653 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-115/journal/page | none observed |
| 093b24cae2a35bc10000000000001324 | 202.479 | 0.000 | n/a | 0.000 | 0.000 | 1.194 | 201.109 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-251/journal/page | none observed |
| 093b24cae2a35bc10000000000001338 | 202.448 | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 201.725 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-425/journal/page | none observed |
| 093b24cae2a35bc10000000000001276 | 202.441 | 0.579 | n/a | 0.000 | 0.000 | 0.420 | 201.249 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.104 | 0.579 | 0.003 | 0.104 | gw-r/thread-94/journal/page | none observed |
| 093b24cae2a35bc10000000000001148 | 202.397 | 0.000 | n/a | 0.000 | 0.000 | 1.630 | 200.507 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-337/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3707 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/4.946 ms; post-ACK p50/p99: 0.428/2.123 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.642 | 11.112 | 10.739 | reported |
| All-primary p99 ms | 47.791 | 47.363 | 46.226 | <=50 |
| L256 5-10 p50Ms | 10.303 | 9.791 | 9.727 | <=10 |
| L256 5-10 p99Ms | 24.847 | 24.306 | 24.305 | <=50 |
| L256 11-25 p50Ms | 11.007 | 10.239 | 10.239 | <=10 |
| L256 11-25 p99Ms | 17.604 | 16.488 | 16.488 | <=50 |
| L256 26-50 p50Ms | 17.407 | 16.383 | 16.383 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 19.840 | 18.646 | 18.645 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 10.111 | 9.791 | 9.407 | <=10 |
| Burst 11-25 p50 ms | 12.287 | 11.647 | 11.327 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 24.847 | 24.306 | 24.305 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 29.940 | 28.888 | 28.883 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 64.426/64.426 | 61.822 | 43.976 | 110.371 | 0.623/0.104 |
| 5-10 | 250-1000 | 134 | 11.527/32.032 | 10.932 | 6.560 | 15.664 | 0.070/0.023 |
| 5-10 | 50-100 | 76 | 9.011/22.345 | 8.525 | 4.846 | 11.803 | 0.052/0.018 |
| 11-25 | 250-1000 | 82 | 13.181/68.297 | 12.265 | 6.680 | 16.201 | 0.075/0.023 |
| 26-50 | 250-1000 | 25 | 17.246/75.417 | 16.258 | 8.775 | 21.385 | 0.096/0.023 |
| 5-10 | 100-250 | 67 | 10.812/39.500 | 10.208 | 6.244 | 14.880 | 0.068/0.021 |
| 5-10 | overlap | 892 | 11.598/48.325 | 11.231 | 6.913 | 15.495 | 0.039/0.018 |
| 26-50 | 0-50 | 195 | 15.156/43.648 | 14.084 | 7.449 | 18.961 | 0.065/0.020 |
| 11-25 | 100-250 | 27 | 12.253/23.816 | 11.360 | 6.392 | 16.824 | 0.072/0.021 |
| 11-25 | 0-50 | 511 | 10.834/33.305 | 10.137 | 5.554 | 13.965 | 0.052/0.019 |
| 5-10 | 0-50 | 1063 | 8.766/26.426 | 8.383 | 4.719 | 11.571 | 0.045/0.019 |
| 26-50 | overlap | 153 | 17.588/68.138 | 16.272 | 10.079 | 23.530 | 0.054/0.020 |
| 26-50 | 100-250 | 10 | 15.150/80.015 | 13.570 | 5.654 | 14.701 | 0.077/0.032 |
| 11-25 | 50-100 | 42 | 10.759/22.332 | 10.101 | 5.355 | 13.317 | 0.058/0.018 |
| 26-50 | 50-100 | 15 | 13.851/23.382 | 12.943 | 6.915 | 18.269 | 0.081/0.021 |
| 11-25 | overlap | 414 | 13.792/45.855 | 13.254 | 8.048 | 18.362 | 0.042/0.019 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1846 | 17 | 1101.015 |
| burst | 1861 | 11 | 657.087 |

## Writer heap, GC and scheduler stalls

Source 0d95e5721572bbafaa54630aa6265d188d8e3d26; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 497.765 / 553.064 |
| GC events / total duration / maximum ms | 927 / 2749.934 / 192.749 |
| GC events >50 ms / total duration ms | 2 / 244.780 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":913,"4":7,"8":7} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 1 / 51.793 |
| Union stall episodes / duration ms | 1 / 51.793 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 47.791 / 28 / 1758.102 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

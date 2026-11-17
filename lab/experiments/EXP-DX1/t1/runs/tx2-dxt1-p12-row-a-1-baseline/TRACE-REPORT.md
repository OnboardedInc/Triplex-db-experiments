# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-47/gateway.admitted-work` (183.864 ms, trace `02a177b3528fec9f0000000000000236`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (92.201 ms, trace `02a177b3528fec9f00000000000001a4`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (97.196 ms, trace `02a177b3528fec9f0000000000000453`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (75.160 ms, trace `02a177b3528fec9f0000000000000831`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (93.856 ms, trace `02a177b3528fec9f0000000000000450`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p12-row-a-1-baseline`; source `2409bdada6be6cb7f17d1aa71f31da90a72f01af`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8788687.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 223 source calibrations, offsets preserved in raw traces and trace-summary.json. 0 JFR events without continuous-anchor proof are retained raw but not overlaid; Mac wall samples are whole-run context, not per-commit overlap evidence.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13495.472 | 301.174 | 5.403 | 454 |
| L1 | 0 | 19957.497 | 417.236 | 11.824 | 668 |
| L4 | 0 | 19962.558 | 402.015 | 7.021 | 628 |
| L16 | 0 | 19973.407 | 499.141 | 6.961 | 686 |
| L64 | 0 | 19979.341 | 427.383 | 13.227 | 870 |
| L256 | 0 | 19975.417 | 423.743 | 18.497 | 688 |
| L1024 | 0 | 19990.944 | 4544.158 | 41.044 | 17101 |
| tail | 0 | 64517.965 | 13212.678 | 109.705 | 52807 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 02a177b3528fec9f0000000000000236 | driver.queue.scheduler-dispatch | 0.048 | none | 0 / 32 |
| 02a177b3528fec9f0000000000000236 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 02a177b3528fec9f0000000000000236 waited: []

| 02a177b3528fec9f00000000000001a4 | driver.queue.scheduler-dispatch | 0.059 | none | 0 / 32 |
| 02a177b3528fec9f00000000000001a4 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 02a177b3528fec9f00000000000001a4 waited: []

| 02a177b3528fec9f0000000000000453 | driver.queue.scheduler-late | 0.688 | none | 5 / 32 |
| 02a177b3528fec9f0000000000000453 | driver.queue.scheduler-dispatch | 0.014 | none | 5 / 32 |

Observed active steps while trace 02a177b3528fec9f0000000000000453 waited: []

| 02a177b3528fec9f0000000000000831 | driver.queue.scheduler-dispatch | 0.032 | none | 3 / 32 |
| 02a177b3528fec9f0000000000000831 | driver.queue.scheduler-late | 0.004 | none | 3 / 32 |

Observed active steps while trace 02a177b3528fec9f0000000000000831 waited: []

| 02a177b3528fec9f0000000000000450 | driver.queue.scheduler-dispatch | 0.025 | none | 2 / 32 |
| 02a177b3528fec9f0000000000000450 | driver.queue.scheduler-late | 0.001 | none | 2 / 32 |

Observed active steps while trace 02a177b3528fec9f0000000000000450 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.024 | 0.000 | 0.000 | 0.594 | 4.440 | 0.496 | 0.000 | 0.073 | 1.253 | 8.249 | 0.028 | n/a | 0.438 | 16.073 | n/a | n/a | 0.028 | 4.935 | 0.167 | 0.028 |
| p99 | 94.317 | 3.996 | 0.048 | 3.464 | 18.754 | n/a | 3.425 | 1.448 | 2.459 | 52.463 | 0.115 | n/a | 3.908 | 60.016 | n/a | n/a | 0.265 | 19.656 | 0.300 | 0.265 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f00000000000000f3 | 94.317 | 15.764 | n/a | 3.425 | 0.466 | 0.757 | 10.036 | 0.042 | n/a | 3.546 | 60.016 | n/a | n/a | 0.265 | 19.656 | 0.208 | 0.265 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 02a177b3528fec9f000000000000010f | 81.646 | 4.909 | 0.171 | 0.000 | 0.055 | 1.839 | 52.463 | 0.021 | n/a | 0.069 | 22.096 | n/a | n/a | 0.022 | 5.136 | 0.063 | 0.022 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.025ms |
| 02a177b3528fec9f00000000000000f7 | 78.157 | 18.754 | 0.496 | 0.000 | 0.118 | 2.201 | 29.380 | 0.115 | n/a | 1.822 | 25.230 | n/a | n/a | 0.040 | 19.368 | 0.248 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000113 | 69.919 | 6.026 | 0.269 | 0.344 | 0.070 | 2.038 | 41.035 | 0.038 | n/a | 0.668 | 19.407 | n/a | n/a | 0.024 | 6.709 | 0.096 | 0.024 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.017ms |
| 02a177b3528fec9f00000000000000ff | 52.553 | 6.550 | 0.229 | 0.000 | 0.055 | 2.197 | 17.000 | 0.064 | n/a | 0.075 | 26.356 | n/a | n/a | 0.027 | 6.834 | 0.130 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| 02a177b3528fec9f000000000000011d | 51.375 | 7.759 | 0.252 | 0.303 | 0.156 | 1.176 | 16.600 | 0.025 | n/a | 0.346 | 24.703 | n/a | n/a | 0.055 | 8.469 | 0.165 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 02a177b3528fec9f0000000000000107 | 46.271 | 6.602 | 0.188 | 0.000 | 0.081 | 1.795 | 10.805 | 0.047 | n/a | 0.399 | 26.320 | n/a | n/a | 0.033 | 6.872 | 0.149 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 02a177b3528fec9f0000000000000109 | 45.676 | 3.994 | 0.209 | 0.000 | 0.300 | 1.054 | 13.973 | 0.025 | n/a | 1.675 | 24.405 | n/a | n/a | 0.042 | 4.504 | 0.099 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 02a177b3528fec9f0000000000000119 | 40.962 | 7.056 | 0.235 | 0.543 | 0.075 | 1.541 | 13.276 | 0.050 | n/a | 0.828 | 17.330 | n/a | n/a | 0.028 | 7.910 | 0.193 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 02a177b3528fec9f0000000000000121 | 39.452 | 3.972 | 0.255 | 0.314 | 0.236 | 1.129 | 20.094 | 0.040 | n/a | 0.438 | 12.886 | n/a | n/a | 0.090 | 4.777 | 0.121 | 0.090 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.067ms |
| 02a177b3528fec9f00000000000000fb | 37.369 | 6.837 | 0.219 | 0.000 | 0.061 | 1.974 | 20.282 | 0.031 | n/a | 2.760 | 5.170 | n/a | n/a | 0.035 | 7.117 | 0.190 | 0.035 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.033ms |
| 02a177b3528fec9f0000000000000103 | 37.115 | 9.427 | 0.293 | 0.000 | 0.039 | 2.459 | 12.742 | 0.031 | n/a | 0.066 | 12.026 | n/a | n/a | 0.032 | 9.759 | 0.263 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.121ms; driver.reader-basis.broadcast 0.035ms |
| 02a177b3528fec9f00000000000000fd | 37.031 | 3.051 | n/a | 0.000 | 0.077 | 0.712 | 5.518 | 0.015 | n/a | 0.107 | 27.521 | n/a | n/a | 0.030 | 3.129 | 0.084 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| 02a177b3528fec9f000000000000011a | 33.296 | 8.365 | n/a | 0.000 | 0.209 | 1.673 | 5.255 | 0.035 | n/a | 3.908 | 13.759 | n/a | n/a | 0.091 | 8.575 | 0.258 | 0.091 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000012b | 32.024 | 4.073 | 0.237 | 0.324 | 0.049 | 1.309 | 9.388 | 0.026 | n/a | 0.288 | 16.310 | n/a | n/a | 0.021 | 4.683 | 0.146 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 02a177b3528fec9f0000000000000111 | 30.792 | 6.129 | 0.343 | 0.360 | 0.088 | 1.702 | 9.452 | 0.046 | n/a | 0.554 | 12.083 | n/a | n/a | 0.033 | 6.920 | 0.225 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 02a177b3528fec9f0000000000000116 | 30.722 | 2.802 | n/a | 0.000 | 0.056 | 0.886 | 5.277 | 0.038 | n/a | 0.612 | 21.027 | n/a | n/a | 0.024 | 2.857 | 0.093 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000122 | 30.147 | 2.415 | n/a | 0.000 | 0.073 | 1.253 | 6.362 | 0.035 | n/a | 0.132 | 19.851 | n/a | n/a | 0.026 | 2.488 | 0.083 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000104 | 29.351 | 4.215 | n/a | 0.000 | 1.448 | 0.543 | 5.579 | 0.018 | n/a | 0.363 | 17.161 | n/a | n/a | 0.025 | 5.663 | 0.193 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 02a177b3528fec9f00000000000000f9 | 26.273 | 4.440 | n/a | 0.000 | 0.066 | 0.986 | 4.463 | 0.015 | n/a | 0.087 | 16.073 | n/a | n/a | 0.143 | 4.506 | 0.172 | 0.143 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.821 | 0.000 | 0.000 | 0.829 | 2.802 | n/a | 0.000 | 0.067 | 0.886 | 3.753 | 0.015 | n/a | 0.612 | 8.949 | n/a | n/a | 0.026 | 2.927 | 0.167 | 0.026 |
| p99 | 37.031 | 1.344 | 0.000 | 2.171 | 4.440 | n/a | 0.000 | 1.145 | 2.075 | 6.362 | 0.038 | n/a | 3.365 | 27.521 | n/a | n/a | 0.143 | 4.506 | 0.300 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f00000000000000fd | 37.031 | 3.051 | n/a | 0.000 | 0.077 | 0.712 | 5.518 | 0.015 | n/a | 0.107 | 27.521 | n/a | n/a | 0.030 | 3.129 | 0.084 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| 02a177b3528fec9f0000000000000116 | 30.722 | 2.802 | n/a | 0.000 | 0.056 | 0.886 | 5.277 | 0.038 | n/a | 0.612 | 21.027 | n/a | n/a | 0.024 | 2.857 | 0.093 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000122 | 30.147 | 2.415 | n/a | 0.000 | 0.073 | 1.253 | 6.362 | 0.035 | n/a | 0.132 | 19.851 | n/a | n/a | 0.026 | 2.488 | 0.083 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000000f9 | 26.273 | 4.440 | n/a | 0.000 | 0.066 | 0.986 | 4.463 | 0.015 | n/a | 0.087 | 16.073 | n/a | n/a | 0.143 | 4.506 | 0.172 | 0.143 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| 02a177b3528fec9f0000000000000129 | 16.821 | 2.733 | n/a | 0.000 | 0.058 | 0.772 | 1.172 | 0.024 | n/a | 3.083 | 8.949 | n/a | n/a | 0.030 | 2.791 | 0.166 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000101 | 15.182 | 2.874 | n/a | 0.000 | 0.053 | 0.968 | 2.419 | 0.037 | n/a | 3.079 | 5.727 | n/a | n/a | 0.026 | 2.927 | 0.193 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000114 | 14.820 | 2.895 | n/a | 0.000 | 0.273 | 0.595 | 1.138 | 0.012 | n/a | 3.365 | 6.521 | n/a | n/a | 0.021 | 3.168 | 0.214 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000126 | 14.262 | 2.314 | n/a | 0.000 | 0.067 | 2.075 | 1.119 | 0.015 | n/a | 0.631 | 8.012 | n/a | n/a | 0.028 | 2.381 | 0.167 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000011e | 12.582 | 2.626 | n/a | 0.000 | 1.145 | 0.728 | 3.753 | 0.014 | n/a | 0.396 | 3.900 | n/a | n/a | 0.020 | 3.771 | 0.300 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.061 | 0.297 | 0.000 | 0.431 | 6.921 | 0.188 | 0.426 | 0.069 | 2.234 | 16.032 | 0.029 | n/a | 0.146 | 16.990 | n/a | n/a | 0.028 | 7.603 | 0.177 | 0.028 |
| p99 | 43.061 | 0.297 | 0.000 | 0.431 | 6.921 | 0.188 | 0.426 | 0.069 | 2.234 | 16.032 | 0.029 | n/a | 0.146 | 16.990 | n/a | n/a | 0.028 | 7.603 | 0.177 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f000000000000012d | 43.061 | 6.921 | 0.188 | 0.426 | 0.069 | 2.234 | 16.032 | 0.029 | n/a | 0.146 | 16.990 | n/a | n/a | 0.028 | 7.603 | 0.177 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.606 | 0.464 | 0.000 | 0.616 | 4.326 | n/a | 0.000 | 0.074 | 1.125 | 5.004 | 0.026 | n/a | 0.371 | 14.167 | n/a | n/a | 0.030 | 5.002 | 0.160 | 0.030 |
| p99 | 95.280 | 3.656 | 0.000 | 3.715 | 8.835 | n/a | 2.894 | 5.626 | 3.272 | 21.151 | 6.964 | n/a | 4.192 | 75.972 | n/a | n/a | 0.107 | 11.937 | 0.484 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f0000000000000141 | 95.280 | 4.455 | 0.256 | 0.000 | 0.067 | 1.323 | 12.378 | 0.033 | n/a | 0.766 | 75.972 | n/a | n/a | 0.030 | 4.778 | 0.050 | 0.030 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| 02a177b3528fec9f000000000000016f | 77.937 | 7.423 | 0.447 | 0.000 | 0.057 | 2.235 | 21.151 | 0.163 | n/a | 4.046 | 42.389 | n/a | n/a | 0.026 | 7.927 | 0.102 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 02a177b3528fec9f0000000000000149 | 58.706 | 5.198 | 0.161 | 0.372 | 0.049 | 1.024 | 7.376 | 0.046 | n/a | 0.128 | 44.328 | n/a | n/a | 0.023 | 5.780 | 0.098 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 02a177b3528fec9f0000000000000143 | 55.490 | 8.482 | 0.533 | 0.296 | 0.068 | 2.102 | 15.808 | 0.065 | n/a | 0.371 | 27.730 | n/a | n/a | 0.034 | 9.380 | 0.169 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| 02a177b3528fec9f0000000000000131 | 51.889 | 4.896 | 0.200 | 0.000 | 0.075 | 2.521 | 15.495 | 0.047 | n/a | 1.918 | 26.706 | n/a | n/a | 0.030 | 5.171 | 0.100 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 02a177b3528fec9f000000000000017d | 48.487 | 6.053 | 0.368 | 0.419 | 0.094 | 1.405 | 8.380 | 0.032 | n/a | 3.166 | 28.524 | n/a | n/a | 0.045 | 6.935 | 0.143 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 02a177b3528fec9f0000000000000136 | 42.068 | 4.521 | n/a | 0.000 | 0.104 | 0.953 | 1.718 | 0.021 | n/a | 4.192 | 30.515 | n/a | n/a | 0.043 | 4.626 | 0.110 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 02a177b3528fec9f0000000000000145 | 41.429 | 5.142 | 0.302 | 0.000 | 0.105 | 1.612 | 13.942 | 0.060 | n/a | 0.517 | 19.707 | n/a | n/a | 0.041 | 5.549 | 0.134 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 02a177b3528fec9f000000000000012f | 41.081 | 4.183 | 0.209 | 0.000 | 0.055 | 1.415 | 14.984 | 0.023 | n/a | 0.119 | 20.071 | n/a | n/a | 0.022 | 4.447 | 0.108 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| 02a177b3528fec9f0000000000000173 | 39.924 | 4.320 | 0.235 | 0.373 | 0.074 | 1.357 | 8.199 | 0.020 | n/a | 0.080 | 25.236 | n/a | n/a | 0.031 | 5.002 | 0.125 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 02a177b3528fec9f000000000000017f | 39.417 | 4.619 | 0.227 | 0.322 | 0.088 | 1.329 | 12.700 | 0.050 | n/a | 0.440 | 19.608 | n/a | n/a | 0.034 | 5.257 | 0.133 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 02a177b3528fec9f0000000000000153 | 36.513 | 3.564 | 0.259 | 0.337 | 0.048 | 1.164 | 16.828 | 0.023 | n/a | 0.105 | 14.167 | n/a | n/a | 0.017 | 4.208 | 0.115 | 0.017 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.044ms |
| 02a177b3528fec9f000000000000014d | 35.414 | 4.577 | 0.451 | 0.000 | 0.237 | 1.457 | 10.855 | 0.026 | n/a | 0.322 | 17.405 | n/a | n/a | 0.084 | 5.264 | 0.149 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 02a177b3528fec9f0000000000000165 | 33.377 | 4.810 | 0.238 | 0.000 | 0.052 | 1.292 | 13.058 | 0.020 | n/a | 0.256 | 13.630 | n/a | n/a | 0.023 | 5.099 | 0.153 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| 02a177b3528fec9f0000000000000159 | 32.029 | 4.776 | 0.299 | 0.000 | 0.060 | 1.526 | 9.773 | 0.038 | n/a | 0.552 | 14.977 | n/a | n/a | 0.027 | 5.135 | 0.160 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 02a177b3528fec9f0000000000000169 | 31.159 | 3.921 | 0.245 | 0.000 | 0.163 | 1.300 | 12.759 | 6.964 | n/a | 0.362 | 5.383 | n/a | n/a | 0.061 | 4.330 | 0.139 | 0.061 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.055ms |
| 02a177b3528fec9f000000000000013b | 30.486 | 4.927 | 0.274 | 0.000 | 0.056 | 1.035 | 9.122 | 0.016 | n/a | 0.302 | 14.719 | n/a | n/a | 0.036 | 5.256 | 0.172 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 02a177b3528fec9f000000000000013e | 30.403 | 5.109 | n/a | 0.000 | 0.095 | 0.564 | 1.131 | 0.012 | n/a | 0.407 | 23.048 | n/a | n/a | 0.038 | 5.204 | 0.171 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000166 | 27.185 | 5.853 | n/a | 0.000 | 0.085 | 1.703 | 2.787 | 0.039 | n/a | 0.895 | 15.778 | n/a | n/a | 0.044 | 5.938 | 0.218 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000138 | 26.625 | 4.326 | 0.286 | 0.000 | 0.051 | 1.218 | 9.104 | 0.027 | n/a | 0.472 | 11.118 | n/a | n/a | 0.023 | 4.663 | 0.175 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.066 | 0.000 | 0.000 | 0.518 | 3.406 | n/a | 0.000 | 0.104 | 0.771 | 1.243 | 0.020 | n/a | 0.312 | 8.825 | n/a | n/a | 0.029 | 4.085 | 0.254 | 0.029 |
| p99 | 42.068 | 1.341 | 0.000 | 1.136 | 7.847 | n/a | 0.000 | 5.626 | 3.272 | 7.579 | 0.043 | n/a | 4.192 | 30.515 | n/a | n/a | 0.089 | 7.910 | 0.365 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f0000000000000136 | 42.068 | 4.521 | n/a | 0.000 | 0.104 | 0.953 | 1.718 | 0.021 | n/a | 4.192 | 30.515 | n/a | n/a | 0.043 | 4.626 | 0.110 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 02a177b3528fec9f0000000000000139 | 24.521 | 7.847 | n/a | 0.000 | 0.063 | 3.272 | 7.579 | 0.043 | n/a | 0.314 | 5.373 | n/a | n/a | 0.029 | 7.910 | 0.323 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 02a177b3528fec9f000000000000014a | 21.107 | 2.010 | n/a | 0.000 | 0.051 | 0.519 | 0.797 | 0.012 | n/a | 0.326 | 17.369 | n/a | n/a | 0.023 | 2.062 | 0.098 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000179 | 20.265 | 1.763 | n/a | 0.000 | 5.626 | 0.588 | 1.882 | 0.034 | n/a | 0.193 | 10.162 | n/a | n/a | 0.018 | 7.389 | 0.365 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.022ms |
| 02a177b3528fec9f0000000000000154 | 18.066 | 3.858 | n/a | 0.000 | 0.227 | 0.895 | 1.370 | 0.021 | n/a | 0.116 | 11.489 | n/a | n/a | 0.089 | 4.085 | 0.226 | 0.089 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 02a177b3528fec9f0000000000000170 | 15.488 | 3.406 | n/a | 0.000 | 1.372 | 0.771 | 1.216 | 0.016 | n/a | 0.140 | 8.534 | n/a | n/a | 0.033 | 4.778 | 0.308 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000015f | 14.147 | 3.488 | n/a | 0.000 | 0.112 | 0.696 | 0.660 | 0.012 | n/a | 0.312 | 8.825 | n/a | n/a | 0.043 | 3.600 | 0.254 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.077ms |
| 02a177b3528fec9f0000000000000163 | 8.479 | 2.901 | n/a | 0.000 | 0.049 | 0.967 | 1.243 | 0.020 | n/a | 0.321 | 2.953 | n/a | n/a | 0.025 | 2.950 | 0.348 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.859 | 0.564 | 0.000 | 0.589 | 4.391 | 0.650 | 0.000 | 0.071 | 1.137 | 5.019 | 0.021 | n/a | 0.235 | 14.396 | n/a | n/a | 0.030 | 4.985 | 0.191 | 0.030 |
| p99 | 111.912 | 4.393 | 0.000 | 3.739 | 9.569 | n/a | 3.798 | 2.601 | 5.342 | 21.815 | 0.064 | n/a | 5.311 | 92.201 | n/a | n/a | 0.102 | 10.664 | 0.448 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f00000000000001a4 | 111.912 | 5.845 | 0.270 | 0.000 | 0.061 | 1.418 | 11.981 | 0.024 | n/a | 0.086 | 92.201 | n/a | n/a | 0.026 | 6.176 | 0.055 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 02a177b3528fec9f000000000000019e | 45.995 | 6.092 | 0.436 | 3.798 | 0.207 | 5.342 | 12.233 | 0.023 | n/a | 0.112 | 17.687 | n/a | n/a | 0.066 | 10.532 | 0.229 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 02a177b3528fec9f00000000000001a8 | 43.056 | 4.066 | 0.153 | 0.532 | 0.063 | 1.436 | 21.815 | 0.064 | n/a | 0.134 | 14.764 | n/a | n/a | 0.029 | 4.814 | 0.112 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 02a177b3528fec9f00000000000001b7 | 42.364 | 9.337 | 0.650 | 0.593 | 0.085 | 2.340 | 10.484 | 0.053 | n/a | 0.184 | 18.597 | n/a | n/a | 0.041 | 10.664 | 0.252 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001b4 | 42.023 | 2.386 | n/a | 0.000 | 0.055 | 0.819 | 1.637 | 0.029 | n/a | 1.417 | 35.653 | n/a | n/a | 0.028 | 2.441 | 0.058 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 02a177b3528fec9f00000000000001bd | 37.809 | 5.381 | 0.435 | 0.331 | 0.053 | 2.093 | 12.094 | 0.027 | n/a | 0.075 | 17.293 | n/a | n/a | 0.026 | 6.200 | 0.164 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000187 | 36.656 | 4.690 | 0.275 | 0.396 | 0.055 | 1.070 | 10.837 | 0.016 | n/a | 0.287 | 18.991 | n/a | n/a | 0.038 | 5.417 | 0.148 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 02a177b3528fec9f000000000000018a | 35.727 | 4.206 | 0.171 | 0.322 | 0.069 | 1.637 | 12.686 | 0.031 | n/a | 0.317 | 16.259 | n/a | n/a | 0.030 | 4.768 | 0.133 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 02a177b3528fec9f00000000000001b9 | 34.972 | 6.769 | 0.394 | 0.602 | 0.085 | 2.056 | 7.176 | 0.028 | n/a | 0.453 | 17.371 | n/a | n/a | 0.040 | 7.849 | 0.224 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000194 | 33.532 | 4.825 | 0.191 | 0.249 | 0.114 | 1.121 | 11.969 | 0.016 | n/a | 0.235 | 14.772 | n/a | n/a | 0.041 | 5.379 | 0.160 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001ad | 32.455 | 4.793 | n/a | 0.000 | 0.070 | 0.724 | 1.707 | 0.013 | n/a | 0.448 | 24.664 | n/a | n/a | 0.035 | 4.863 | 0.150 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001a0 | 32.160 | 4.945 | 0.378 | 0.000 | 0.073 | 1.827 | 6.077 | 0.023 | n/a | 1.159 | 17.636 | n/a | n/a | 0.042 | 5.396 | 0.168 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001ac | 31.941 | 4.695 | 0.280 | 0.250 | 0.067 | 1.231 | 10.314 | 0.018 | n/a | 0.501 | 14.555 | n/a | n/a | 0.029 | 5.292 | 0.166 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001c6 | 31.494 | 7.108 | n/a | 0.000 | 2.601 | 1.012 | 5.019 | 0.045 | n/a | 0.127 | 15.545 | n/a | n/a | 0.038 | 9.708 | 0.308 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000019a | 31.194 | 4.391 | 0.168 | 0.227 | 0.057 | 1.218 | 13.260 | 0.017 | n/a | 0.073 | 11.756 | n/a | n/a | 0.026 | 4.843 | 0.155 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001c2 | 30.789 | 5.611 | 0.215 | 0.521 | 0.045 | 1.227 | 6.821 | 0.018 | n/a | 0.372 | 15.933 | n/a | n/a | 0.027 | 6.392 | 0.208 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.publication.persist-deferred 0.058ms |
| 02a177b3528fec9f00000000000001a1 | 30.508 | 8.207 | n/a | 0.000 | 0.219 | 1.309 | 2.976 | 0.044 | n/a | 0.893 | 16.766 | n/a | n/a | 0.094 | 8.426 | 0.276 | 0.094 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000192 | 30.371 | 4.252 | 0.305 | 0.238 | 0.071 | 1.462 | 11.252 | 0.034 | n/a | 0.121 | 12.608 | n/a | n/a | 0.028 | 4.867 | 0.160 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001c5 | 30.089 | 4.159 | 0.237 | 0.408 | 0.181 | 1.137 | 11.859 | 0.032 | n/a | 0.106 | 11.910 | n/a | n/a | 0.059 | 4.985 | 0.166 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001b3 | 29.859 | 5.807 | 0.161 | 0.506 | 0.041 | 1.263 | 10.110 | 0.016 | n/a | 0.223 | 11.708 | n/a | n/a | 0.023 | 6.515 | 0.218 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.215 | 0.000 | 0.000 | 0.513 | 2.511 | n/a | 0.000 | 0.067 | 0.809 | 1.195 | 0.021 | n/a | 0.405 | 10.144 | n/a | n/a | 0.030 | 2.640 | 0.183 | 0.030 |
| p99 | 42.023 | 1.002 | 0.000 | 1.042 | 4.887 | n/a | 0.000 | 1.184 | 1.364 | 4.861 | 0.040 | n/a | 3.348 | 35.653 | n/a | n/a | 0.102 | 5.042 | 0.247 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f00000000000001b4 | 42.023 | 2.386 | n/a | 0.000 | 0.055 | 0.819 | 1.637 | 0.029 | n/a | 1.417 | 35.653 | n/a | n/a | 0.028 | 2.441 | 0.058 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 02a177b3528fec9f00000000000001c1 | 25.792 | 4.887 | n/a | 0.000 | 0.154 | 0.996 | 0.915 | 0.022 | n/a | 3.348 | 15.392 | n/a | n/a | 0.076 | 5.042 | 0.195 | 0.076 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000195 | 19.812 | 3.091 | n/a | 0.000 | 0.098 | 1.364 | 4.861 | 0.040 | n/a | 0.178 | 10.144 | n/a | n/a | 0.036 | 3.189 | 0.161 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000197 | 18.361 | 2.270 | n/a | 0.000 | 0.158 | 0.704 | 1.404 | 0.027 | n/a | 0.167 | 13.529 | n/a | n/a | 0.102 | 2.428 | 0.132 | 0.102 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000018f | 18.259 | 2.076 | n/a | 0.000 | 1.184 | 0.629 | 1.356 | 0.019 | n/a | 0.145 | 12.829 | n/a | n/a | 0.021 | 3.260 | 0.179 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000180 | 18.215 | 4.018 | n/a | 0.000 | 0.073 | 0.990 | 0.994 | 0.016 | n/a | 0.405 | 11.694 | n/a | n/a | 0.026 | 4.091 | 0.225 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001ca | 15.872 | 2.979 | n/a | 0.000 | 0.048 | 0.809 | 1.195 | 0.021 | n/a | 0.982 | 9.809 | n/a | n/a | 0.030 | 3.027 | 0.191 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000184 | 14.101 | 2.511 | n/a | 0.000 | 0.067 | 0.788 | 1.452 | 0.021 | n/a | 0.513 | 8.714 | n/a | n/a | 0.036 | 2.579 | 0.183 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001a9 | 10.704 | 2.575 | n/a | 0.000 | 0.065 | 1.014 | 1.182 | 0.018 | n/a | 0.491 | 5.323 | n/a | n/a | 0.036 | 2.640 | 0.247 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001cc | 8.187 | 1.814 | n/a | 0.000 | 0.064 | 0.608 | 0.874 | 0.014 | n/a | 0.064 | 4.724 | n/a | n/a | 0.024 | 1.878 | 0.229 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.554 | 0.343 | 0.000 | 0.579 | 3.873 | n/a | 0.000 | 0.059 | 1.018 | 2.207 | 0.020 | n/a | 0.376 | 11.322 | n/a | n/a | 0.026 | 4.458 | 0.190 | 0.026 |
| p99 | 68.553 | 2.269 | 0.000 | 3.507 | 13.604 | n/a | 0.703 | 2.771 | 6.762 | 21.502 | 0.071 | n/a | 4.208 | 64.099 | n/a | n/a | 0.069 | 13.695 | 0.402 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f00000000000001e9 | 68.553 | 2.366 | n/a | 0.000 | 0.041 | 0.577 | 1.027 | 0.017 | n/a | 0.383 | 64.099 | n/a | n/a | 0.044 | 2.407 | 0.035 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001f3 | 56.378 | 13.604 | n/a | 0.000 | 0.091 | 6.762 | 21.502 | 0.071 | n/a | 3.957 | 10.354 | n/a | n/a | 0.038 | 13.695 | 0.243 | 0.038 | gw-w/thread-48/storage/begin-command! | driver.reader-basis.broadcast 0.020ms |
| 02a177b3528fec9f000000000000020e | 39.386 | 3.636 | 0.258 | 0.326 | 0.095 | 1.134 | 16.231 | 0.018 | n/a | 0.071 | 17.568 | n/a | n/a | 0.049 | 4.315 | 0.110 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000020a | 38.894 | 9.610 | 0.519 | 0.703 | 0.072 | 1.908 | 7.053 | 0.024 | n/a | 0.378 | 18.599 | n/a | n/a | 0.029 | 10.903 | 0.280 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001db | 38.109 | 4.234 | 0.171 | 0.000 | 0.058 | 1.285 | 7.852 | 0.031 | n/a | 3.566 | 20.889 | n/a | n/a | 0.023 | 4.463 | 0.117 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001de | 37.382 | 4.512 | 0.250 | 0.000 | 0.059 | 1.377 | 13.812 | 0.030 | n/a | 3.251 | 14.064 | n/a | n/a | 0.026 | 4.822 | 0.129 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001f2 | 37.138 | 3.964 | 0.170 | 0.000 | 0.118 | 1.104 | 18.090 | 0.026 | n/a | 2.583 | 11.042 | n/a | n/a | 0.044 | 4.251 | 0.114 | 0.044 | gw-w/thread-47/gateway.admitted-work | none observed |
| 02a177b3528fec9f00000000000001e3 | 32.708 | 5.565 | n/a | 0.000 | 0.081 | 0.556 | 1.837 | 0.018 | n/a | 0.516 | 24.099 | n/a | n/a | 0.035 | 5.646 | 0.173 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000214 | 31.581 | 3.955 | 0.176 | 0.275 | 0.051 | 1.145 | 8.413 | 0.022 | n/a | 1.838 | 15.680 | n/a | n/a | 0.025 | 4.458 | 0.141 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001f6 | 30.676 | 4.970 | 0.200 | 0.344 | 0.062 | 3.436 | 8.908 | 0.031 | n/a | 2.987 | 9.712 | n/a | n/a | 0.026 | 5.577 | 0.182 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000207 | 29.227 | 4.170 | n/a | 0.000 | 0.120 | 0.767 | 0.909 | 0.014 | n/a | 0.367 | 22.838 | n/a | n/a | 0.043 | 4.290 | 0.147 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000021e | 28.470 | 3.427 | 0.221 | 0.214 | 0.049 | 1.018 | 10.246 | 0.030 | n/a | 0.093 | 13.155 | n/a | n/a | 0.018 | 3.910 | 0.137 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001d5 | 28.030 | 5.336 | 0.287 | 0.000 | 0.071 | 2.197 | 12.317 | 0.028 | n/a | 0.099 | 7.662 | n/a | n/a | 0.034 | 5.693 | 0.203 | 0.034 | gw-w/thread-41/gateway.admitted-work | none observed |
| 02a177b3528fec9f00000000000001f9 | 27.079 | 5.455 | n/a | 0.000 | 0.050 | 0.858 | 1.095 | 0.017 | n/a | 0.414 | 19.166 | n/a | n/a | 0.024 | 5.505 | 0.203 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000206 | 26.749 | 4.257 | 0.315 | 0.409 | 0.096 | 2.364 | 9.487 | 0.032 | n/a | 0.063 | 9.693 | n/a | n/a | 0.034 | 5.077 | 0.190 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001e2 | 26.176 | 4.543 | 0.300 | 0.000 | 0.048 | 1.349 | 8.208 | 0.017 | n/a | 2.787 | 8.902 | n/a | n/a | 0.021 | 4.892 | 0.187 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001fc | 26.106 | 3.497 | 0.298 | 0.291 | 0.053 | 0.804 | 5.278 | 0.018 | n/a | 4.208 | 11.626 | n/a | n/a | 0.035 | 4.138 | 0.159 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001fe | 25.985 | 4.253 | 0.181 | 0.339 | 0.057 | 1.138 | 6.392 | 0.019 | n/a | 0.070 | 13.513 | n/a | n/a | 0.023 | 4.831 | 0.186 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000202 | 25.560 | 4.204 | n/a | 0.000 | 0.207 | 0.705 | 1.491 | 0.021 | n/a | 1.292 | 17.570 | n/a | n/a | 0.069 | 4.411 | 0.173 | 0.069 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001ff | 25.313 | 4.517 | n/a | 0.000 | 0.052 | 0.716 | 1.523 | 0.024 | n/a | 0.083 | 18.377 | n/a | n/a | 0.021 | 4.569 | 0.181 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.526 | 0.723 | 0.000 | 0.626 | 2.984 | n/a | 0.000 | 0.075 | 0.753 | 1.095 | 0.018 | n/a | 0.383 | 12.304 | n/a | n/a | 0.028 | 3.289 | 0.199 | 0.028 |
| p99 | 68.553 | 2.269 | 0.000 | 3.507 | 5.455 | n/a | 0.000 | 2.771 | 1.505 | 5.771 | 0.029 | n/a | 1.292 | 64.099 | n/a | n/a | 0.069 | 6.449 | 0.383 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f00000000000001e9 | 68.553 | 2.366 | n/a | 0.000 | 0.041 | 0.577 | 1.027 | 0.017 | n/a | 0.383 | 64.099 | n/a | n/a | 0.044 | 2.407 | 0.035 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000207 | 29.227 | 4.170 | n/a | 0.000 | 0.120 | 0.767 | 0.909 | 0.014 | n/a | 0.367 | 22.838 | n/a | n/a | 0.043 | 4.290 | 0.147 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001f9 | 27.079 | 5.455 | n/a | 0.000 | 0.050 | 0.858 | 1.095 | 0.017 | n/a | 0.414 | 19.166 | n/a | n/a | 0.024 | 5.505 | 0.203 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000202 | 25.560 | 4.204 | n/a | 0.000 | 0.207 | 0.705 | 1.491 | 0.021 | n/a | 1.292 | 17.570 | n/a | n/a | 0.069 | 4.411 | 0.173 | 0.069 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001df | 23.871 | 2.531 | n/a | 0.000 | 2.467 | 0.708 | 5.771 | 0.018 | n/a | 0.046 | 12.304 | n/a | n/a | 0.027 | 4.998 | 0.209 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001e6 | 18.449 | 2.405 | n/a | 0.000 | 0.042 | 0.467 | 1.162 | 0.021 | n/a | 0.461 | 13.860 | n/a | n/a | 0.031 | 2.448 | 0.133 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000215 | 17.613 | 2.832 | n/a | 0.000 | 0.104 | 0.753 | 0.934 | 0.012 | n/a | 0.297 | 12.645 | n/a | n/a | 0.036 | 2.937 | 0.167 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| 02a177b3528fec9f00000000000001ed | 17.526 | 2.417 | n/a | 0.000 | 0.062 | 0.505 | 0.982 | 0.014 | n/a | 0.354 | 13.164 | n/a | n/a | 0.028 | 2.479 | 0.141 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000021f | 17.050 | 3.688 | n/a | 0.000 | 2.761 | 0.862 | 2.207 | 0.029 | n/a | 0.896 | 6.582 | n/a | n/a | 0.025 | 6.449 | 0.378 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001d2 | 16.526 | 3.214 | n/a | 0.000 | 0.075 | 1.505 | 1.708 | 0.027 | n/a | 0.812 | 9.151 | n/a | n/a | 0.034 | 3.289 | 0.199 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001d0 | 16.098 | 3.285 | n/a | 0.000 | 0.079 | 0.929 | 1.185 | 0.020 | n/a | 0.484 | 10.081 | n/a | n/a | 0.034 | 3.364 | 0.209 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001d6 | 15.429 | 2.984 | n/a | 0.000 | 0.045 | 0.789 | 1.105 | 0.018 | n/a | 0.430 | 10.035 | n/a | n/a | 0.023 | 3.029 | 0.196 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000020b | 13.052 | 2.231 | n/a | 0.000 | 2.771 | 0.461 | 0.923 | 0.015 | n/a | 0.248 | 6.386 | n/a | n/a | 0.017 | 5.002 | 0.383 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000001eb | 8.834 | 3.027 | n/a | 0.000 | 0.049 | 0.634 | 0.954 | 0.018 | n/a | 0.364 | 3.763 | n/a | n/a | 0.026 | 3.076 | 0.348 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000020f | 8.466 | 2.172 | n/a | 0.000 | 0.051 | 0.782 | 0.979 | 0.012 | n/a | 0.229 | 4.220 | n/a | n/a | 0.019 | 2.223 | 0.263 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.703 | 0.000 | 0.000 | 0.626 | 3.539 | n/a | 0.000 | 0.057 | 0.816 | 2.913 | 0.019 | n/a | 0.130 | 7.498 | n/a | n/a | 0.025 | 3.937 | 0.213 | 0.025 |
| p99 | 210.757 | 1.994 | 0.000 | 1.620 | 8.499 | n/a | 0.504 | 3.130 | 7.490 | 186.594 | 0.053 | n/a | 3.658 | 39.078 | n/a | n/a | 0.067 | 8.931 | 0.430 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f0000000000000236 | 210.757 | 6.297 | 0.208 | 0.504 | 0.050 | 1.712 | 186.594 | 0.024 | n/a | 0.106 | 15.240 | n/a | n/a | 0.021 | 7.059 | 0.033 | 0.021 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.091ms; driver.reader-basis.broadcast 0.042ms |
| 02a177b3528fec9f000000000000022f | 59.055 | 6.104 | 0.255 | 0.489 | 0.054 | 1.452 | 11.513 | 0.019 | n/a | 0.065 | 39.078 | n/a | n/a | 0.025 | 6.902 | 0.117 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 02a177b3528fec9f000000000000026f | 50.989 | 4.279 | 0.372 | 0.000 | 0.043 | 1.237 | 5.559 | 0.019 | n/a | 0.391 | 39.071 | n/a | n/a | 0.020 | 4.693 | 0.092 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000027b | 40.275 | 3.838 | 0.298 | 0.000 | 0.048 | 1.794 | 13.370 | 0.025 | n/a | 0.380 | 20.495 | n/a | n/a | 0.027 | 4.185 | 0.104 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000276 | 32.650 | 3.393 | n/a | 0.000 | 2.092 | 0.739 | 1.176 | 0.016 | n/a | 0.904 | 24.311 | n/a | n/a | 0.021 | 5.485 | 0.168 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000242 | 32.444 | 4.257 | 0.822 | 0.223 | 0.036 | 1.622 | 15.779 | 0.017 | n/a | 0.261 | 9.408 | n/a | n/a | 0.019 | 5.339 | 0.165 | 0.019 | gw-w/thread-46/gateway.admitted-work | none observed |
| 02a177b3528fec9f0000000000000246 | 30.653 | 3.657 | 0.386 | 0.228 | 0.040 | 1.212 | 5.715 | 0.026 | n/a | 0.073 | 19.294 | n/a | n/a | 0.020 | 4.312 | 0.141 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000026d | 30.256 | 8.499 | 0.175 | 0.000 | 0.071 | 1.700 | 6.510 | 0.043 | n/a | 0.357 | 12.866 | n/a | n/a | 0.034 | 8.745 | 0.289 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000225 | 29.958 | 4.659 | 0.281 | 0.362 | 0.069 | 4.329 | 10.010 | 0.020 | n/a | 0.083 | 10.121 | n/a | n/a | 0.025 | 5.370 | 0.179 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000025c | 27.820 | 3.842 | 0.369 | 0.000 | 0.058 | 2.900 | 9.094 | 0.023 | n/a | 0.059 | 11.447 | n/a | n/a | 0.027 | 4.270 | 0.153 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000281 | 27.047 | 3.374 | 0.188 | 0.000 | 0.145 | 1.057 | 13.442 | 0.037 | n/a | 0.114 | 8.643 | n/a | n/a | 0.046 | 3.707 | 0.137 | 0.046 | gw-w/thread-45/gateway.admitted-work | none observed |
| 02a177b3528fec9f0000000000000287 | 26.162 | 4.036 | 0.243 | 0.000 | 0.031 | 1.199 | 7.648 | 0.018 | n/a | 0.068 | 12.904 | n/a | n/a | 0.015 | 4.311 | 0.165 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000239 | 26.153 | 3.984 | 0.301 | 0.223 | 0.044 | 1.561 | 7.751 | 0.020 | n/a | 0.325 | 11.929 | n/a | n/a | 0.016 | 4.551 | 0.174 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.019ms |
| 02a177b3528fec9f0000000000000264 | 25.669 | 3.920 | 0.230 | 0.354 | 0.076 | 1.013 | 8.333 | 0.027 | n/a | 0.404 | 11.284 | n/a | n/a | 0.029 | 4.579 | 0.178 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000024c | 24.240 | 1.796 | n/a | 0.000 | 0.036 | 0.552 | 0.993 | 0.017 | n/a | 0.213 | 20.613 | n/a | n/a | 0.019 | 1.832 | 0.076 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.019ms |
| 02a177b3528fec9f000000000000025d | 23.790 | 5.801 | n/a | 0.000 | 3.130 | 1.035 | 2.951 | 0.031 | n/a | 0.147 | 10.668 | n/a | n/a | 0.027 | 8.931 | 0.375 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 02a177b3528fec9f0000000000000275 | 23.428 | 3.985 | 0.221 | 0.000 | 0.031 | 1.024 | 11.347 | 0.016 | n/a | 0.063 | 6.725 | n/a | n/a | 0.016 | 4.238 | 0.181 | 0.016 | gw-w/thread-44/gateway.admitted-work | none observed |
| 02a177b3528fec9f000000000000026a | 23.109 | 5.500 | 0.188 | 0.000 | 0.062 | 1.039 | 5.336 | 0.027 | n/a | 0.083 | 10.850 | n/a | n/a | 0.025 | 5.749 | 0.249 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000231 | 22.988 | 3.185 | n/a | 0.000 | 0.088 | 0.769 | 3.804 | 0.013 | n/a | 0.074 | 15.021 | n/a | n/a | 0.035 | 3.273 | 0.142 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000273 | 22.584 | 3.887 | n/a | 0.000 | 0.050 | 0.730 | 7.551 | 0.044 | n/a | 3.658 | 6.635 | n/a | n/a | 0.028 | 3.937 | 0.174 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.067 | 0.172 | 0.000 | 0.495 | 2.667 | n/a | 0.000 | 0.088 | 0.703 | 1.192 | 0.017 | n/a | 0.130 | 5.903 | n/a | n/a | 0.035 | 2.732 | 0.234 | 0.035 |
| p99 | 24.240 | 1.682 | 0.000 | 0.944 | 6.502 | n/a | 0.000 | 2.093 | 7.490 | 8.140 | 0.053 | n/a | 0.598 | 20.613 | n/a | n/a | 0.067 | 6.579 | 0.430 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f000000000000024c | 24.240 | 1.796 | n/a | 0.000 | 0.036 | 0.552 | 0.993 | 0.017 | n/a | 0.213 | 20.613 | n/a | n/a | 0.019 | 1.832 | 0.076 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.019ms |
| 02a177b3528fec9f0000000000000231 | 22.988 | 3.185 | n/a | 0.000 | 0.088 | 0.769 | 3.804 | 0.013 | n/a | 0.074 | 15.021 | n/a | n/a | 0.035 | 3.273 | 0.142 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000223 | 22.471 | 6.502 | n/a | 0.000 | 0.077 | 7.490 | 4.757 | 0.052 | n/a | 0.598 | 2.956 | n/a | n/a | 0.039 | 6.579 | 0.293 | 0.039 | node-14/thread-0/socket.wait-first-byte | none observed |
| 02a177b3528fec9f000000000000026b | 18.703 | 4.989 | n/a | 0.000 | 0.091 | 1.622 | 8.140 | 0.047 | n/a | 0.130 | 3.645 | n/a | n/a | 0.039 | 5.080 | 0.272 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000256 | 16.649 | 2.777 | n/a | 0.000 | 0.044 | 0.756 | 1.100 | 0.023 | n/a | 0.089 | 11.836 | n/a | n/a | 0.023 | 2.822 | 0.169 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000022c | 15.826 | 1.809 | n/a | 0.000 | 0.046 | 0.482 | 4.351 | 0.011 | n/a | 0.269 | 8.839 | n/a | n/a | 0.019 | 1.855 | 0.117 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 02a177b3528fec9f0000000000000285 | 11.666 | 2.601 | n/a | 0.000 | 0.123 | 0.473 | 1.190 | 0.017 | n/a | 0.080 | 7.132 | n/a | n/a | 0.050 | 2.724 | 0.234 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 02a177b3528fec9f000000000000027e | 11.275 | 3.860 | n/a | 0.000 | 0.120 | 0.694 | 1.192 | 0.017 | n/a | 0.404 | 4.937 | n/a | n/a | 0.052 | 3.980 | 0.353 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000267 | 11.067 | 2.667 | n/a | 0.000 | 2.093 | 0.808 | 1.250 | 0.020 | n/a | 0.069 | 4.142 | n/a | n/a | 0.017 | 4.760 | 0.430 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000260 | 10.793 | 2.370 | n/a | 0.000 | 0.057 | 0.805 | 1.425 | 0.023 | n/a | 0.145 | 5.936 | n/a | n/a | 0.032 | 2.427 | 0.225 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000238 | 10.370 | 1.993 | n/a | 0.000 | 0.112 | 0.551 | 1.249 | 0.025 | n/a | 0.514 | 5.903 | n/a | n/a | 0.022 | 2.105 | 0.203 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000243 | 10.364 | 1.840 | n/a | 0.000 | 0.045 | 0.479 | 0.892 | 0.018 | n/a | 0.054 | 7.013 | n/a | n/a | 0.024 | 1.884 | 0.182 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000228 | 9.872 | 2.073 | n/a | 0.000 | 0.063 | 0.612 | 0.977 | 0.014 | n/a | 0.086 | 6.008 | n/a | n/a | 0.039 | 2.136 | 0.216 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000270 | 9.764 | 3.602 | n/a | 0.000 | 0.126 | 0.722 | 0.935 | 0.015 | n/a | 0.083 | 4.213 | n/a | n/a | 0.067 | 3.728 | 0.382 | 0.067 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000262 | 8.780 | 2.683 | n/a | 0.000 | 0.050 | 0.783 | 1.440 | 0.053 | n/a | 0.083 | 3.654 | n/a | n/a | 0.034 | 2.732 | 0.311 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000282 | 8.730 | 2.480 | n/a | 0.000 | 0.114 | 0.703 | 0.762 | 0.013 | n/a | 0.215 | 4.397 | n/a | n/a | 0.045 | 2.594 | 0.297 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000278 | 8.703 | 3.166 | n/a | 0.000 | 0.093 | 0.635 | 0.872 | 0.010 | n/a | 0.292 | 3.596 | n/a | n/a | 0.040 | 3.259 | 0.374 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.675 | 0.301 | 0.000 | 0.589 | 3.881 | n/a | 0.000 | 0.060 | 0.898 | 1.977 | 0.017 | n/a | 0.123 | 8.070 | n/a | n/a | 0.028 | 4.374 | 0.222 | 0.028 |
| p99 | 58.772 | 3.000 | 0.000 | 3.199 | 11.001 | n/a | 3.651 | 0.172 | 3.281 | 21.598 | 0.062 | n/a | 15.925 | 47.052 | n/a | n/a | 0.091 | 12.104 | 0.487 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f00000000000002a8 | 58.772 | 3.892 | 0.304 | 0.296 | 0.119 | 1.039 | 5.898 | 0.032 | n/a | 0.091 | 47.052 | n/a | n/a | 0.048 | 4.610 | 0.078 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002c4 | 57.760 | 11.001 | 0.563 | 0.369 | 0.172 | 3.281 | 9.559 | 0.062 | n/a | 0.148 | 32.565 | n/a | n/a | 0.040 | 12.104 | 0.210 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002ac | 45.145 | 4.800 | 0.206 | 0.471 | 0.055 | 1.193 | 17.383 | 0.018 | n/a | 0.049 | 20.941 | n/a | n/a | 0.031 | 5.531 | 0.123 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002b0 | 40.242 | 8.027 | 0.222 | 0.300 | 0.060 | 1.597 | 14.537 | 0.031 | n/a | 0.057 | 15.383 | n/a | n/a | 0.028 | 8.609 | 0.214 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002d9 | 37.819 | 7.062 | 0.183 | 0.634 | 0.058 | 1.486 | 7.823 | 0.035 | n/a | 0.075 | 20.440 | n/a | n/a | 0.024 | 7.937 | 0.210 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000028c | 32.443 | 2.458 | n/a | 0.000 | 0.078 | 0.637 | 21.598 | 0.016 | n/a | 0.051 | 7.577 | n/a | n/a | 0.028 | 2.536 | 0.078 | 0.028 | gw-w/thread-41/gateway.request-parse | driver.reader-basis.broadcast 0.023ms |
| 02a177b3528fec9f0000000000000296 | 32.036 | 3.646 | 0.390 | 0.337 | 0.130 | 1.050 | 8.501 | 0.029 | n/a | 0.072 | 17.820 | n/a | n/a | 0.060 | 4.504 | 0.141 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002b3 | 31.947 | 5.545 | n/a | 0.000 | 0.133 | 0.593 | 1.580 | 0.037 | n/a | 15.925 | 8.070 | n/a | n/a | 0.063 | 5.678 | 0.178 | 0.063 | gw-w/thread-47/d/transact-async | driver.reader-basis.broadcast 0.030ms |
| 02a177b3528fec9f00000000000002d5 | 31.573 | 4.567 | 0.234 | 3.651 | 0.047 | 1.192 | 7.300 | 0.020 | n/a | 0.075 | 14.468 | n/a | n/a | 0.020 | 8.499 | 0.269 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002b8 | 29.435 | 4.086 | 0.221 | 0.330 | 0.099 | 1.474 | 6.574 | 0.016 | n/a | 0.062 | 16.533 | n/a | n/a | 0.039 | 4.737 | 0.161 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000028b | 26.061 | 3.583 | 0.188 | 0.000 | 0.071 | 1.046 | 7.168 | 0.050 | n/a | 0.061 | 13.862 | n/a | n/a | 0.031 | 3.842 | 0.147 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002db | 24.507 | 3.592 | 0.238 | 0.310 | 0.039 | 1.105 | 8.522 | 0.030 | n/a | 0.126 | 10.517 | n/a | n/a | 0.028 | 4.179 | 0.171 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002bc | 23.182 | 6.703 | 0.296 | 0.568 | 0.040 | 2.196 | 8.699 | 0.036 | n/a | 0.123 | 4.500 | n/a | n/a | 0.021 | 7.607 | 0.328 | 0.021 | gw-w/thread-47/gateway.admitted-work | none observed |
| 02a177b3528fec9f0000000000000293 | 22.445 | 4.406 | n/a | 0.000 | 0.121 | 0.748 | 1.208 | 0.012 | n/a | 0.298 | 15.611 | n/a | n/a | 0.042 | 4.527 | 0.202 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002c0 | 22.285 | 3.881 | 0.171 | 0.387 | 0.040 | 0.917 | 4.594 | 0.021 | n/a | 0.054 | 12.192 | n/a | n/a | 0.027 | 4.480 | 0.201 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000029e | 21.882 | 4.132 | 0.197 | 0.418 | 0.120 | 1.159 | 8.258 | 0.015 | n/a | 0.274 | 7.271 | n/a | n/a | 0.038 | 4.866 | 0.222 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002b9 | 21.003 | 4.561 | n/a | 0.000 | 0.064 | 0.740 | 1.202 | 0.017 | n/a | 0.094 | 14.297 | n/a | n/a | 0.028 | 4.626 | 0.220 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000299 | 20.708 | 5.224 | n/a | 0.000 | 0.125 | 0.912 | 5.242 | 0.030 | n/a | 0.152 | 8.976 | n/a | n/a | 0.048 | 5.349 | 0.258 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000029c | 20.609 | 3.356 | 0.261 | 0.339 | 0.119 | 0.880 | 8.373 | 0.016 | n/a | 0.045 | 7.173 | n/a | n/a | 0.047 | 4.075 | 0.198 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002b6 | 18.895 | 4.027 | 0.188 | 0.308 | 0.043 | 0.823 | 4.704 | 0.021 | n/a | 0.239 | 8.521 | n/a | n/a | 0.020 | 4.567 | 0.242 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.190 | 0.684 | 0.000 | 0.582 | 2.551 | n/a | 0.000 | 0.064 | 0.560 | 0.958 | 0.013 | n/a | 0.294 | 5.154 | n/a | n/a | 0.025 | 2.590 | 0.243 | 0.025 |
| p99 | 21.003 | 2.004 | 0.000 | 2.061 | 4.561 | n/a | 0.000 | 0.163 | 1.167 | 3.258 | 0.037 | n/a | 0.603 | 14.297 | n/a | n/a | 0.091 | 4.626 | 0.354 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f00000000000002b9 | 21.003 | 4.561 | n/a | 0.000 | 0.064 | 0.740 | 1.202 | 0.017 | n/a | 0.094 | 14.297 | n/a | n/a | 0.028 | 4.626 | 0.220 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002b1 | 16.852 | 3.936 | n/a | 0.000 | 0.153 | 1.035 | 1.722 | 0.017 | n/a | 0.391 | 9.538 | n/a | n/a | 0.060 | 4.089 | 0.243 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 02a177b3528fec9f00000000000002c1 | 16.696 | 2.551 | n/a | 0.000 | 0.039 | 0.401 | 0.623 | 0.008 | n/a | 0.051 | 13.004 | n/a | n/a | 0.019 | 2.590 | 0.155 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002c5 | 13.621 | 2.841 | n/a | 0.000 | 0.038 | 0.472 | 0.958 | 0.012 | n/a | 0.064 | 9.211 | n/a | n/a | 0.025 | 2.879 | 0.211 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002a9 | 13.082 | 4.302 | n/a | 0.000 | 0.072 | 0.996 | 1.130 | 0.017 | n/a | 0.317 | 6.219 | n/a | n/a | 0.029 | 4.374 | 0.334 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002bd | 10.954 | 3.039 | n/a | 0.000 | 0.079 | 0.790 | 1.784 | 0.037 | n/a | 0.603 | 4.569 | n/a | n/a | 0.054 | 3.118 | 0.285 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002a5 | 10.436 | 3.106 | n/a | 0.000 | 0.163 | 0.745 | 0.840 | 0.013 | n/a | 0.316 | 5.163 | n/a | n/a | 0.091 | 3.269 | 0.313 | 0.091 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000029f | 10.190 | 2.017 | n/a | 0.000 | 0.055 | 0.383 | 0.982 | 0.014 | n/a | 0.386 | 6.328 | n/a | n/a | 0.025 | 2.073 | 0.203 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002c9 | 10.110 | 3.539 | n/a | 0.000 | 0.035 | 0.927 | 0.916 | 0.016 | n/a | 0.067 | 4.587 | n/a | n/a | 0.021 | 3.574 | 0.354 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.184ms |
| 02a177b3528fec9f0000000000000288 | 9.019 | 1.882 | n/a | 0.000 | 0.086 | 0.560 | 1.037 | 0.021 | n/a | 0.302 | 5.103 | n/a | n/a | 0.028 | 1.968 | 0.218 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 02a177b3528fec9f00000000000002cb | 8.668 | 2.511 | n/a | 0.000 | 0.060 | 0.523 | 0.778 | 0.012 | n/a | 0.258 | 4.501 | n/a | n/a | 0.025 | 2.571 | 0.297 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002a1 | 8.534 | 1.706 | n/a | 0.000 | 0.067 | 0.470 | 0.804 | 0.013 | n/a | 0.294 | 5.154 | n/a | n/a | 0.025 | 1.773 | 0.208 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 02a177b3528fec9f0000000000000297 | 7.104 | 1.852 | n/a | 0.000 | 0.039 | 0.431 | 0.803 | 0.013 | n/a | 0.326 | 3.621 | n/a | n/a | 0.019 | 1.891 | 0.266 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000002cf | 6.500 | 1.926 | n/a | 0.000 | 0.080 | 1.167 | 3.258 | 0.010 | n/a | 0.026 | 0.000 | n/a | n/a | 0.033 | 2.006 | 0.309 | 0.033 | gw-w/thread-47/gateway.admitted-work | none observed |

## P2 / L1024 / commit (851 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.675 | 0.467 | 0.000 | 0.574 | 2.490 | n/a | 0.000 | 0.055 | 0.629 | 0.925 | 0.010 | n/a | 0.076 | 6.272 | n/a | n/a | 0.018 | 2.909 | 0.246 | 0.018 |
| p99 | 93.532 | 2.933 | 0.067 | 2.369 | 7.559 | n/a | 0.383 | 16.699 | 8.368 | 10.702 | 0.071 | n/a | 3.656 | 61.958 | n/a | n/a | 0.066 | 19.565 | 0.647 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f0000000000000453 | 106.839 | 2.330 | n/a | 0.000 | 0.701 | 2.193 | 0.961 | 0.009 | n/a | 3.440 | 97.196 | n/a | n/a | 0.010 | 3.032 | 0.028 | 0.010 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.120ms; driver.publication.readback 0.112ms; driver.reader-basis.broadcast 0.072ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms |
| 02a177b3528fec9f0000000000000831 | 106.030 | 7.632 | n/a | 0.000 | 0.035 | 4.418 | 3.639 | 0.036 | n/a | 0.318 | 89.934 | n/a | n/a | 0.017 | 7.667 | 0.072 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.188ms; driver.publication.readback 0.243ms; driver.publication.readback 0.213ms; driver.reader-basis.broadcast 0.147ms; driver.publication.readback 0.083ms |
| 02a177b3528fec9f0000000000000450 | 104.851 | 4.849 | n/a | 0.000 | 0.026 | 0.486 | 1.556 | 0.010 | n/a | 4.054 | 93.856 | n/a | n/a | 0.013 | 4.875 | 0.046 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.readback 0.064ms; driver.reader-basis.broadcast 0.053ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.022ms |
| 02a177b3528fec9f000000000000044f | 102.720 | 2.104 | n/a | 0.000 | 5.882 | 0.441 | 0.904 | 0.011 | n/a | 0.045 | 93.318 | n/a | n/a | 0.016 | 7.985 | 0.078 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.183ms; driver.publication.readback 0.069ms; driver.reader-basis.broadcast 0.053ms; driver.publication.persist-deferred 0.018ms |
| 02a177b3528fec9f0000000000000452 | 99.269 | 4.693 | n/a | 0.000 | 0.075 | 0.535 | 1.045 | 0.009 | n/a | 0.582 | 92.303 | n/a | n/a | 0.028 | 4.768 | 0.048 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.112ms; driver.reader-basis.broadcast 0.072ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms; driver.publication.readback 0.050ms |
| 02a177b3528fec9f000000000000082b | 97.879 | 3.134 | n/a | 0.000 | 31.697 | 0.776 | 1.450 | 0.023 | n/a | 0.104 | 60.667 | n/a | n/a | 0.028 | 34.831 | 0.356 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.188ms; driver.publication.readback 0.243ms; driver.publication.readback 0.213ms; driver.reader-basis.broadcast 0.147ms; driver.publication.readback 0.053ms |
| 02a177b3528fec9f000000000000082f | 95.451 | 4.605 | n/a | 0.000 | 29.701 | 0.561 | 1.406 | 0.010 | n/a | 0.091 | 59.049 | n/a | n/a | 0.028 | 34.307 | 0.359 | 0.028 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.188ms; driver.publication.readback 0.243ms; driver.publication.readback 0.213ms; driver.reader-basis.broadcast 0.147ms; driver.publication.readback 0.061ms |
| 02a177b3528fec9f000000000000044e | 93.968 | 5.237 | n/a | 0.000 | 0.060 | 0.815 | 1.093 | 0.010 | n/a | 0.403 | 86.323 | n/a | n/a | 0.027 | 5.297 | 0.056 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.183ms; driver.reader-basis.broadcast 0.053ms |
| 02a177b3528fec9f0000000000000451 | 93.532 | 1.735 | n/a | 0.000 | 0.966 | 3.511 | 0.708 | 0.007 | n/a | 0.048 | 86.488 | n/a | n/a | 0.071 | 2.700 | 0.029 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.readback 0.064ms; driver.reader-basis.broadcast 0.053ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.018ms |
| 02a177b3528fec9f000000000000082e | 87.206 | 2.281 | n/a | 0.000 | 2.500 | 0.670 | 0.659 | 0.006 | n/a | 0.014 | 81.066 | n/a | n/a | 0.009 | 4.781 | 0.055 | 0.009 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.188ms; driver.publication.readback 0.213ms; driver.reader-basis.broadcast 0.147ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.032ms |
| 02a177b3528fec9f0000000000000832 | 71.348 | 5.660 | n/a | 0.000 | 0.093 | 2.591 | 0.934 | 0.008 | n/a | 0.070 | 61.958 | n/a | n/a | 0.035 | 5.753 | 0.081 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.188ms; driver.publication.readback 0.213ms; driver.reader-basis.broadcast 0.147ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.026ms |
| 02a177b3528fec9f0000000000000560 | 66.938 | 18.023 | n/a | 0.000 | 0.101 | 6.729 | 5.587 | 0.038 | n/a | 1.445 | 34.977 | n/a | n/a | 0.038 | 18.125 | 0.271 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.127ms; driver.reader-basis.broadcast 0.081ms; driver.publication.persist-deferred 0.015ms |
| 02a177b3528fec9f0000000000000454 | 66.594 | 2.012 | n/a | 0.000 | 0.061 | 4.509 | 0.757 | 0.014 | n/a | 1.381 | 57.835 | n/a | n/a | 0.025 | 2.073 | 0.031 | 0.025 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.120ms; driver.publication.readback 0.112ms; driver.reader-basis.broadcast 0.072ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms |
| 02a177b3528fec9f0000000000000835 | 66.454 | 1.609 | n/a | 0.000 | 50.502 | 2.630 | 0.662 | 0.006 | n/a | 0.429 | 10.604 | n/a | n/a | 0.013 | 52.111 | 0.784 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.243ms; driver.publication.readback 0.083ms; driver.publication.readback 0.061ms; driver.publication.readback 0.053ms; driver.publication.readback 0.039ms |
| 02a177b3528fec9f0000000000000455 | 64.909 | 1.184 | n/a | 0.000 | 0.021 | 2.319 | 0.718 | 0.012 | n/a | 3.505 | 57.139 | n/a | n/a | 0.012 | 1.204 | 0.019 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.120ms; driver.publication.readback 0.112ms; driver.reader-basis.broadcast 0.072ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms |
| 02a177b3528fec9f00000000000002ec | 58.887 | 5.111 | 0.452 | 0.482 | 0.062 | 1.808 | 38.246 | 0.018 | n/a | 0.285 | 12.399 | n/a | n/a | 0.025 | 6.107 | 0.104 | 0.025 | gw-w/thread-45/gateway.admitted-work | none observed |
| 02a177b3528fec9f000000000000039a | 58.702 | 2.220 | n/a | 0.000 | 0.051 | 0.555 | 5.924 | 0.005 | n/a | 0.063 | 49.859 | n/a | n/a | 0.025 | 2.271 | 0.039 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.reader-basis.broadcast 0.042ms; driver.publication.persist-deferred 0.039ms |
| 02a177b3528fec9f0000000000000546 | 56.460 | 5.110 | n/a | 0.000 | 2.394 | 16.652 | 12.045 | 0.005 | n/a | 0.086 | 20.138 | n/a | n/a | 0.031 | 7.503 | 0.133 | 0.031 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.227ms; driver.reader-basis.broadcast 0.111ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.078ms; driver.publication.readback 0.072ms |
| 02a177b3528fec9f0000000000000375 | 54.299 | 2.511 | n/a | 0.000 | 1.318 | 21.219 | 1.887 | 0.037 | n/a | 0.052 | 27.266 | n/a | n/a | 0.009 | 3.829 | 0.071 | 0.009 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.078ms; driver.publication.readback 0.063ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.022ms |
| 02a177b3528fec9f000000000000075c | 49.685 | 10.263 | n/a | 0.000 | 25.713 | 0.777 | 2.009 | 0.011 | n/a | 1.063 | 9.826 | n/a | n/a | 0.022 | 35.977 | 0.724 | 0.022 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.240ms; driver.publication.readback 0.180ms; driver.publication.readback 0.095ms; driver.publication.persist-deferred 0.061ms; driver.publication.persist-deferred 0.056ms |

## P2 / L1024 / commit / 5-10 facts (493 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.452 | 0.000 | 0.000 | 0.440 | 1.984 | n/a | 0.000 | 0.056 | 0.612 | 0.802 | 0.010 | n/a | 0.077 | 5.304 | n/a | n/a | 0.018 | 2.422 | 0.233 | 0.018 |
| p99 | 66.454 | 1.997 | 0.054 | 1.086 | 5.796 | n/a | 0.000 | 16.699 | 12.039 | 5.913 | 0.062 | n/a | 3.620 | 57.139 | n/a | n/a | 0.079 | 19.565 | 0.619 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f000000000000044f | 102.720 | 2.104 | n/a | 0.000 | 5.882 | 0.441 | 0.904 | 0.011 | n/a | 0.045 | 93.318 | n/a | n/a | 0.016 | 7.985 | 0.078 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.183ms; driver.publication.readback 0.069ms; driver.reader-basis.broadcast 0.053ms; driver.publication.persist-deferred 0.018ms |
| 02a177b3528fec9f000000000000082b | 97.879 | 3.134 | n/a | 0.000 | 31.697 | 0.776 | 1.450 | 0.023 | n/a | 0.104 | 60.667 | n/a | n/a | 0.028 | 34.831 | 0.356 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.188ms; driver.publication.readback 0.243ms; driver.publication.readback 0.213ms; driver.reader-basis.broadcast 0.147ms; driver.publication.readback 0.053ms |
| 02a177b3528fec9f0000000000000451 | 93.532 | 1.735 | n/a | 0.000 | 0.966 | 3.511 | 0.708 | 0.007 | n/a | 0.048 | 86.488 | n/a | n/a | 0.071 | 2.700 | 0.029 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.readback 0.064ms; driver.reader-basis.broadcast 0.053ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.018ms |
| 02a177b3528fec9f0000000000000454 | 66.594 | 2.012 | n/a | 0.000 | 0.061 | 4.509 | 0.757 | 0.014 | n/a | 1.381 | 57.835 | n/a | n/a | 0.025 | 2.073 | 0.031 | 0.025 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.120ms; driver.publication.readback 0.112ms; driver.reader-basis.broadcast 0.072ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms |
| 02a177b3528fec9f0000000000000835 | 66.454 | 1.609 | n/a | 0.000 | 50.502 | 2.630 | 0.662 | 0.006 | n/a | 0.429 | 10.604 | n/a | n/a | 0.013 | 52.111 | 0.784 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.243ms; driver.publication.readback 0.083ms; driver.publication.readback 0.061ms; driver.publication.readback 0.053ms; driver.publication.readback 0.039ms |
| 02a177b3528fec9f0000000000000455 | 64.909 | 1.184 | n/a | 0.000 | 0.021 | 2.319 | 0.718 | 0.012 | n/a | 3.505 | 57.139 | n/a | n/a | 0.012 | 1.204 | 0.019 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.120ms; driver.publication.readback 0.112ms; driver.reader-basis.broadcast 0.072ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms |
| 02a177b3528fec9f000000000000039a | 58.702 | 2.220 | n/a | 0.000 | 0.051 | 0.555 | 5.924 | 0.005 | n/a | 0.063 | 49.859 | n/a | n/a | 0.025 | 2.271 | 0.039 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.reader-basis.broadcast 0.042ms; driver.publication.persist-deferred 0.039ms |
| 02a177b3528fec9f0000000000000375 | 54.299 | 2.511 | n/a | 0.000 | 1.318 | 21.219 | 1.887 | 0.037 | n/a | 0.052 | 27.266 | n/a | n/a | 0.009 | 3.829 | 0.071 | 0.009 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.078ms; driver.publication.readback 0.063ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.022ms |
| 02a177b3528fec9f000000000000037b | 47.803 | 2.022 | n/a | 0.000 | 26.025 | 2.225 | 0.637 | 0.011 | n/a | 0.070 | 16.799 | n/a | n/a | 0.015 | 28.047 | 0.587 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.146ms; driver.publication.persist-deferred 0.084ms; driver.publication.readback 0.063ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.035ms |
| 02a177b3528fec9f000000000000035c | 47.124 | 1.802 | n/a | 0.000 | 0.020 | 0.740 | 0.618 | 0.005 | n/a | 0.017 | 43.911 | n/a | n/a | 0.011 | 1.822 | 0.039 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.148ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.019ms |
| 02a177b3528fec9f000000000000076a | 45.410 | 4.219 | n/a | 0.000 | 1.300 | 0.685 | 1.025 | 0.009 | n/a | 0.761 | 37.398 | n/a | n/a | 0.013 | 5.519 | 0.122 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.141ms; driver.reader-basis.broadcast 0.096ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.015ms |
| 02a177b3528fec9f00000000000004b2 | 44.633 | 1.474 | n/a | 0.000 | 2.094 | 1.653 | 0.523 | 0.006 | n/a | 0.014 | 38.854 | n/a | n/a | 0.014 | 3.567 | 0.080 | 0.014 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.220ms; driver.publication.readback 0.161ms; driver.reader-basis.broadcast 0.060ms; driver.publication.readback 0.057ms; driver.publication.readback 0.048ms |
| 02a177b3528fec9f00000000000003b2 | 44.512 | 3.581 | n/a | 0.000 | 0.103 | 1.573 | 0.752 | 0.011 | n/a | 0.089 | 38.358 | n/a | n/a | 0.044 | 3.684 | 0.083 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000000750 | 44.434 | 2.519 | n/a | 0.000 | 0.023 | 0.347 | 0.494 | 0.004 | n/a | 0.019 | 41.015 | n/a | n/a | 0.012 | 2.542 | 0.057 | 0.012 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.017ms |
| 02a177b3528fec9f0000000000000389 | 42.400 | 1.760 | n/a | 0.000 | 0.040 | 0.778 | 0.750 | 0.011 | n/a | 0.162 | 38.875 | n/a | n/a | 0.022 | 1.800 | 0.042 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.022ms |
| 02a177b3528fec9f0000000000000547 | 41.838 | 4.641 | n/a | 0.000 | 2.485 | 20.476 | 0.516 | 0.005 | n/a | 0.016 | 13.688 | n/a | n/a | 0.010 | 7.126 | 0.170 | 0.010 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.227ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.078ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.063ms |
| 02a177b3528fec9f0000000000000752 | 41.459 | 2.105 | n/a | 0.000 | 0.027 | 1.712 | 0.547 | 0.007 | n/a | 0.050 | 36.893 | n/a | n/a | 0.118 | 2.132 | 0.051 | 0.118 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.042ms |
| 02a177b3528fec9f0000000000000769 | 41.303 | 3.317 | n/a | 0.000 | 1.385 | 2.860 | 0.625 | 0.010 | n/a | 0.011 | 33.079 | n/a | n/a | 0.017 | 4.702 | 0.114 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.141ms; driver.reader-basis.broadcast 0.096ms; driver.publication.persist-deferred 0.023ms |
| 02a177b3528fec9f000000000000039c | 40.813 | 1.586 | n/a | 0.000 | 0.048 | 1.972 | 0.606 | 0.009 | n/a | 0.213 | 36.359 | n/a | n/a | 0.021 | 1.634 | 0.040 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.reader-basis.broadcast 0.042ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.028ms |
| 02a177b3528fec9f0000000000000358 | 39.052 | 1.559 | n/a | 0.000 | 0.026 | 0.484 | 0.728 | 0.010 | n/a | 0.063 | 36.165 | n/a | n/a | 0.017 | 1.585 | 0.041 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (70 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.586 | n/a | n/a | n/a | 40.771 | 1.077 | 3.426 | 0.000 | 0.669 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.965 | 53.373 | 0.729 | 20.965 |
| p99 | 320.302 | n/a | n/a | n/a | 266.204 | 108.200 | 31.671 | 0.000 | 57.822 | 1.054 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 159.051 | 301.189 | 1.000 | 159.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f0000000000001a83 | 320.302 | 266.204 | 3.315 | 31.671 | 0.000 | 2.201 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.911 | 301.189 | 0.940 | 16.911 | node-14/thread-3/client.reach | driver.reader-basis.broadcast 0.374ms; driver.reader-basis.broadcast 0.301ms; driver.reader-basis.broadcast 0.278ms; driver.publication.readback 0.173ms; driver.publication.readback 0.146ms |
| 02a177b3528fec9f0000000000001932 | 306.383 | 211.933 | 42.442 | 20.207 | 0.000 | 2.426 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.375 | 274.582 | 0.896 | 29.375 | node-14/thread-3/client.reach | driver.expected-state.bind-receipt 1.004ms; driver.reader-basis.broadcast 0.346ms; driver.reader-basis.broadcast 0.273ms; driver.reader-basis.broadcast 0.266ms; driver.publication.readback 0.199ms |
| 02a177b3528fec9f000000000000178e | 304.109 | 233.841 | 0.396 | 20.859 | 0.000 | 5.522 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.492 | 255.096 | 0.839 | 43.492 | node-14/thread-3/client.reach | driver.expected-state.bind-receipt 1.437ms; driver.expected-state.bind-receipt 1.118ms; driver.publication.readback 0.417ms; driver.reader-basis.broadcast 0.271ms; driver.reader-basis.broadcast 0.259ms |
| 02a177b3528fec9f0000000000001d07 | 263.328 | 218.640 | 0.309 | 25.050 | 0.000 | 1.454 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.875 | 244.000 | 0.927 | 17.875 | node-14/thread-3/client.reach | driver.reader-basis.broadcast 0.707ms; driver.reader-basis.broadcast 0.314ms; driver.reader-basis.broadcast 0.297ms; driver.publication.readback 0.156ms; driver.publication.readback 0.138ms |
| 02a177b3528fec9f000000000000151d | 243.445 | 20.947 | 108.200 | 0.000 | 0.000 | 0.774 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 113.524 | 129.147 | 0.530 | 113.524 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.180ms; driver.reader-basis.broadcast 0.435ms; driver.publication.readback 0.406ms; driver.reader-basis.broadcast 0.306ms; driver.reader-basis.broadcast 0.263ms |
| 02a177b3528fec9f0000000000001519 | 231.949 | 86.876 | 71.017 | 9.902 | 0.000 | 1.118 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.036 | 167.795 | 0.723 | 63.036 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.180ms; driver.reader-basis.broadcast 0.435ms; driver.publication.readback 0.406ms; driver.reader-basis.broadcast 0.306ms; driver.publication.readback 0.161ms |
| 02a177b3528fec9f0000000000001523 | 226.512 | 33.892 | 96.707 | 2.104 | 0.000 | 0.545 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 93.263 | 132.703 | 0.586 | 93.263 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.180ms; driver.reader-basis.broadcast 0.435ms; driver.reader-basis.broadcast 0.306ms; driver.reader-basis.broadcast 0.263ms; driver.publication.readback 0.161ms |
| 02a177b3528fec9f0000000000000fa8 | 199.560 | 62.591 | 12.009 | 7.467 | 0.000 | 1.255 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 116.239 | 82.067 | 0.411 | 116.239 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.198ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.151ms; driver.publication.readback 0.110ms; driver.publication.readback 0.108ms |
| 02a177b3528fec9f00000000000010bb | 193.907 | 126.730 | 0.150 | 9.442 | 0.000 | 1.004 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 56.580 | 136.322 | 0.703 | 56.580 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.203ms; driver.reader-basis.broadcast 0.180ms; driver.publication.readback 0.053ms; driver.publication.readback 0.053ms; driver.publication.readback 0.051ms |
| 02a177b3528fec9f00000000000006d6 | 190.695 | 28.454 | 1.126 | 1.404 | 0.000 | 0.660 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 159.051 | 30.984 | 0.162 | 159.051 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.164ms; driver.publication.readback 0.133ms; driver.publication.readback 0.129ms; driver.publication.readback 0.124ms; driver.publication.readback 0.124ms |
| 02a177b3528fec9f0000000000000325 | 164.426 | 48.932 | 104.076 | 2.156 | 0.000 | 4.382 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.880 | 155.165 | 0.944 | 4.880 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 2.125ms; driver.publication.readback 0.261ms; driver.publication.readback 0.129ms; driver.publication.readback 0.126ms; driver.publication.readback 0.098ms |
| 02a177b3528fec9f0000000000000faa | 160.219 | 66.231 | 4.775 | 7.501 | 0.000 | 0.957 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 80.755 | 78.507 | 0.490 | 80.755 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.198ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.110ms; driver.publication.readback 0.108ms; driver.publication.readback 0.100ms |
| 02a177b3528fec9f00000000000006de | 159.670 | 28.456 | 41.246 | 2.372 | 0.000 | 0.425 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 87.171 | 72.074 | 0.451 | 87.171 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.164ms; driver.publication.persist-deferred 0.145ms; driver.publication.readback 0.133ms; driver.publication.readback 0.124ms; driver.publication.readback 0.124ms |
| 02a177b3528fec9f000000000000031b | 155.728 | 15.817 | 0.414 | 0.000 | 0.000 | 1.221 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 138.276 | 16.231 | 0.104 | 138.276 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 2.125ms; driver.publication.readback 0.129ms; driver.publication.readback 0.126ms; driver.publication.readback 0.098ms; driver.publication.readback 0.072ms |
| 02a177b3528fec9f00000000000006da | 146.250 | 57.467 | 72.070 | 12.989 | 0.000 | 0.422 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.302 | 142.526 | 0.975 | 3.302 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.164ms; driver.publication.readback 0.133ms; driver.publication.readback 0.124ms; driver.publication.readback 0.116ms; driver.publication.readback 0.088ms |
| 02a177b3528fec9f00000000000013cc | 141.952 | 117.066 | 2.191 | 8.538 | 0.000 | 1.123 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.035 | 127.795 | 0.900 | 13.035 | node-14/thread-3/worker.gateway-observer.observe | driver.reader-basis.broadcast 0.545ms; driver.reader-basis.broadcast 0.229ms; driver.publication.readback 0.069ms; driver.publication.readback 0.062ms; driver.publication.readback 0.056ms |
| 02a177b3528fec9f0000000000001955 | 141.654 | 101.210 | 0.214 | 6.460 | 0.000 | 0.694 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.075 | 107.885 | 0.762 | 33.075 | node-14/thread-3/client.reach | driver.publication.readback 0.390ms; driver.reader-basis.broadcast 0.286ms; driver.reader-basis.broadcast 0.285ms; driver.publication.readback 0.132ms; driver.publication.readback 0.069ms |
| 02a177b3528fec9f00000000000006df | 140.624 | 30.597 | 43.149 | 2.372 | 0.000 | 0.154 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.351 | 76.119 | 0.541 | 64.351 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.164ms; driver.publication.readback 0.133ms; driver.publication.readback 0.124ms; driver.publication.readback 0.088ms; driver.reader-basis.broadcast 0.083ms |
| 02a177b3528fec9f0000000000001514 | 136.688 | 60.179 | 0.341 | 5.560 | 0.000 | 57.822 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.785 | 66.080 | 0.483 | 12.785 | node-14/thread-3/socket.body-read | driver.reader-basis.broadcast 0.435ms; driver.publication.readback 0.406ms; driver.publication.readback 0.161ms; driver.publication.readback 0.155ms; driver.publication.readback 0.112ms |
| 02a177b3528fec9f000000000000195c | 132.239 | 30.554 | 95.115 | 1.378 | 0.000 | 4.517 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.676 | 127.047 | 0.961 | 0.676 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.390ms; driver.reader-basis.broadcast 0.285ms; driver.publication.readback 0.135ms; driver.publication.readback 0.132ms; driver.publication.readback 0.069ms |

## P2 / tail / commit (2617 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.968 | 0.288 | 0.000 | 0.508 | 2.269 | n/a | 0.000 | 0.037 | 0.506 | 0.819 | 0.007 | n/a | 0.056 | 4.240 | n/a | n/a | 0.013 | 2.521 | 0.282 | 0.013 |
| p99 | 39.391 | 2.141 | 0.043 | 2.134 | 8.498 | n/a | 0.334 | 10.555 | 6.786 | 7.163 | 0.036 | n/a | 1.930 | 24.783 | n/a | n/a | 0.047 | 17.391 | 0.661 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f0000000000001566 | 75.929 | 3.363 | n/a | 0.000 | 65.246 | 0.599 | 0.778 | 0.008 | n/a | 0.296 | 5.619 | n/a | n/a | 0.020 | 68.608 | 0.904 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.103ms; driver.reader-basis.broadcast 0.442ms; driver.publication.readback 0.235ms; driver.publication.readback 0.124ms; driver.publication.readback 0.108ms |
| 02a177b3528fec9f0000000000001565 | 66.891 | 10.055 | n/a | 0.000 | 34.146 | 0.646 | 7.163 | 0.052 | n/a | 0.050 | 14.658 | n/a | n/a | 0.120 | 44.201 | 0.661 | 0.120 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.442ms; driver.publication.readback 0.235ms; driver.publication.readback 0.124ms; driver.publication.persist-deferred 0.085ms; driver.publication.persist-deferred 0.074ms |
| 02a177b3528fec9f0000000000001ad9 | 62.767 | 4.678 | n/a | 0.000 | 0.041 | 0.591 | 41.308 | 0.004 | n/a | 0.033 | 16.095 | n/a | n/a | 0.017 | 4.719 | 0.075 | 0.017 | gw-w/thread-41/commit.prepare-and-validate | driver.reader-basis.broadcast 0.591ms; driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.026ms |
| 02a177b3528fec9f0000000000001adc | 62.195 | 10.088 | n/a | 0.000 | 0.075 | 28.842 | 2.970 | 0.029 | n/a | 0.099 | 20.050 | n/a | n/a | 0.042 | 10.163 | 0.163 | 0.042 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.591ms; driver.publication.readback 0.181ms; driver.publication.readback 0.052ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.026ms |
| 02a177b3528fec9f0000000000001adb | 50.070 | 3.729 | n/a | 0.000 | 0.137 | 34.678 | 1.703 | 0.023 | n/a | 0.062 | 9.691 | n/a | n/a | 0.047 | 3.867 | 0.077 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.081ms |
| 02a177b3528fec9f0000000000001bf5 | 49.230 | 3.424 | n/a | 0.000 | 0.058 | 0.544 | 0.734 | 0.006 | n/a | 0.192 | 44.249 | n/a | n/a | 0.024 | 3.481 | 0.071 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.321ms |
| 02a177b3528fec9f0000000000000c3b | 47.830 | 4.117 | n/a | 0.000 | 0.759 | 0.534 | 28.272 | 0.017 | n/a | 0.015 | 14.106 | n/a | n/a | 0.010 | 4.876 | 0.102 | 0.010 | gw-w/thread-41/gateway.request-parse | driver.publication.readback 0.184ms; driver.publication.readback 0.128ms; driver.publication.persist-deferred 0.020ms |
| 02a177b3528fec9f00000000000011cf | 46.200 | 1.318 | n/a | 0.000 | 40.827 | 0.361 | 0.563 | 0.008 | n/a | 0.032 | 3.084 | n/a | n/a | 0.008 | 42.145 | 0.912 | 0.008 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.129ms; driver.expected-state.bind-receipt 1.089ms; driver.publication.readback 0.061ms; driver.publication.readback 0.057ms; driver.publication.readback 0.047ms |
| 02a177b3528fec9f00000000000012b2 | 45.509 | 6.741 | n/a | 0.000 | 0.043 | 0.460 | 27.021 | 0.006 | n/a | 0.014 | 11.208 | n/a | n/a | 0.016 | 6.784 | 0.149 | 0.016 | gw-w/thread-48/commit.prepare-and-validate | driver.publication.readback 0.151ms; driver.publication.persist-deferred 0.045ms |
| 02a177b3528fec9f000000000000131f | 44.692 | 1.778 | n/a | 0.000 | 0.014 | 0.520 | 0.625 | 0.007 | n/a | 0.149 | 41.590 | n/a | n/a | 0.009 | 1.792 | 0.040 | 0.009 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f0000000000001796 | 44.616 | 2.737 | n/a | 0.000 | 1.539 | 2.596 | 2.219 | 0.021 | n/a | 0.079 | 35.418 | n/a | n/a | 0.006 | 4.276 | 0.096 | 0.006 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.090ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.020ms |
| 02a177b3528fec9f0000000000000c9d | 44.504 | 19.299 | n/a | 0.000 | 4.407 | 7.344 | 1.547 | 0.013 | n/a | 2.255 | 9.631 | n/a | n/a | 0.007 | 23.706 | 0.533 | 0.007 | node-14/thread-0/client.validation-and-staging | driver.publication.readback 0.155ms; driver.publication.readback 0.137ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.018ms |
| 02a177b3528fec9f0000000000000c9c | 44.497 | 13.031 | n/a | 0.000 | 9.997 | 11.094 | 0.654 | 0.003 | n/a | 0.005 | 9.706 | n/a | n/a | 0.008 | 23.028 | 0.518 | 0.008 | node-14/thread-0/client.validation-and-staging | driver.publication.readback 0.155ms; driver.publication.readback 0.137ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.020ms |
| 02a177b3528fec9f000000000000156e | 44.320 | 3.020 | n/a | 0.000 | 29.052 | 0.606 | 1.388 | 0.010 | n/a | 0.048 | 10.183 | n/a | n/a | 0.013 | 32.072 | 0.724 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.103ms; driver.publication.readback 0.108ms; driver.publication.readback 0.077ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms |
| 02a177b3528fec9f00000000000018b8 | 44.282 | 15.303 | 0.284 | 2.753 | 0.040 | 3.019 | 9.378 | 0.036 | n/a | 0.053 | 13.395 | n/a | n/a | 0.020 | 18.381 | 0.415 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.568ms; driver.reader-basis.broadcast 0.811ms; driver.publication.readback 0.180ms; driver.publication.readback 0.113ms; driver.publication.readback 0.076ms |
| 02a177b3528fec9f00000000000011cd | 44.116 | 8.937 | n/a | 0.000 | 0.054 | 14.642 | 1.693 | 0.018 | n/a | 0.048 | 18.701 | n/a | n/a | 0.023 | 8.992 | 0.204 | 0.023 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.129ms; driver.expected-state.bind-receipt 1.089ms; driver.publication.readback 0.061ms; driver.publication.readback 0.057ms; driver.publication.readback 0.040ms |
| 02a177b3528fec9f00000000000012b4 | 43.224 | 2.923 | n/a | 0.000 | 0.038 | 23.478 | 1.890 | 0.036 | n/a | 0.119 | 14.727 | n/a | n/a | 0.013 | 2.961 | 0.068 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.155ms; driver.publication.persist-deferred 0.024ms |
| 02a177b3528fec9f0000000000001dcc | 42.892 | 5.017 | 0.184 | 0.442 | 0.053 | 1.554 | 6.557 | 0.016 | n/a | 0.079 | 28.971 | n/a | n/a | 0.019 | 5.696 | 0.133 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f000000000000117b | 41.915 | 2.518 | n/a | 0.000 | 3.343 | 0.260 | 0.888 | 0.009 | n/a | 0.019 | 34.866 | n/a | n/a | 0.012 | 5.861 | 0.140 | 0.012 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.223ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.024ms |
| 02a177b3528fec9f0000000000001575 | 40.877 | 1.823 | n/a | 0.000 | 0.021 | 0.428 | 0.977 | 0.009 | n/a | 0.243 | 37.357 | n/a | n/a | 0.018 | 1.844 | 0.045 | 0.018 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.100ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.018ms |

## P2 / tail / commit / 5-10 facts (1555 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.747 | 0.000 | 0.000 | 0.397 | 1.756 | n/a | 0.000 | 0.037 | 0.494 | 0.688 | 0.007 | n/a | 0.055 | 3.760 | n/a | n/a | 0.013 | 1.991 | 0.262 | 0.013 |
| p99 | 34.730 | 2.002 | 0.043 | 1.043 | 5.678 | n/a | 0.000 | 10.270 | 7.869 | 3.220 | 0.035 | n/a | 1.582 | 23.066 | n/a | n/a | 0.046 | 13.928 | 0.682 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 02a177b3528fec9f0000000000001566 | 75.929 | 3.363 | n/a | 0.000 | 65.246 | 0.599 | 0.778 | 0.008 | n/a | 0.296 | 5.619 | n/a | n/a | 0.020 | 68.608 | 0.904 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.103ms; driver.reader-basis.broadcast 0.442ms; driver.publication.readback 0.235ms; driver.publication.readback 0.124ms; driver.publication.readback 0.108ms |
| 02a177b3528fec9f0000000000001bf5 | 49.230 | 3.424 | n/a | 0.000 | 0.058 | 0.544 | 0.734 | 0.006 | n/a | 0.192 | 44.249 | n/a | n/a | 0.024 | 3.481 | 0.071 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.321ms |
| 02a177b3528fec9f00000000000011cf | 46.200 | 1.318 | n/a | 0.000 | 40.827 | 0.361 | 0.563 | 0.008 | n/a | 0.032 | 3.084 | n/a | n/a | 0.008 | 42.145 | 0.912 | 0.008 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.129ms; driver.expected-state.bind-receipt 1.089ms; driver.publication.readback 0.061ms; driver.publication.readback 0.057ms; driver.publication.readback 0.047ms |
| 02a177b3528fec9f000000000000131f | 44.692 | 1.778 | n/a | 0.000 | 0.014 | 0.520 | 0.625 | 0.007 | n/a | 0.149 | 41.590 | n/a | n/a | 0.009 | 1.792 | 0.040 | 0.009 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 02a177b3528fec9f00000000000011cd | 44.116 | 8.937 | n/a | 0.000 | 0.054 | 14.642 | 1.693 | 0.018 | n/a | 0.048 | 18.701 | n/a | n/a | 0.023 | 8.992 | 0.204 | 0.023 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.129ms; driver.expected-state.bind-receipt 1.089ms; driver.publication.readback 0.061ms; driver.publication.readback 0.057ms; driver.publication.readback 0.040ms |
| 02a177b3528fec9f00000000000012b4 | 43.224 | 2.923 | n/a | 0.000 | 0.038 | 23.478 | 1.890 | 0.036 | n/a | 0.119 | 14.727 | n/a | n/a | 0.013 | 2.961 | 0.068 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.155ms; driver.publication.persist-deferred 0.024ms |
| 02a177b3528fec9f0000000000001575 | 40.877 | 1.823 | n/a | 0.000 | 0.021 | 0.428 | 0.977 | 0.009 | n/a | 0.243 | 37.357 | n/a | n/a | 0.018 | 1.844 | 0.045 | 0.018 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.100ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.018ms |
| 02a177b3528fec9f000000000000156b | 40.283 | 2.809 | n/a | 0.000 | 8.913 | 9.268 | 2.145 | 0.035 | n/a | 2.065 | 15.035 | n/a | n/a | 0.013 | 11.722 | 0.291 | 0.013 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.103ms; driver.reader-basis.broadcast 0.442ms; driver.publication.readback 0.235ms; driver.publication.persist-deferred 0.058ms; driver.publication.persist-deferred 0.034ms |
| 02a177b3528fec9f0000000000001674 | 39.391 | 5.884 | n/a | 0.000 | 0.015 | 6.026 | 2.269 | 0.027 | n/a | 0.082 | 25.079 | n/a | n/a | 0.009 | 5.899 | 0.150 | 0.009 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.245ms; driver.publication.readback 0.063ms; driver.publication.readback 0.047ms; driver.publication.readback 0.043ms; driver.publication.readback 0.036ms |
| 02a177b3528fec9f0000000000001884 | 38.952 | 3.721 | n/a | 0.000 | 2.443 | 2.214 | 0.645 | 0.007 | n/a | 0.023 | 29.879 | n/a | n/a | 0.020 | 6.165 | 0.158 | 0.020 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.019ms |
| 02a177b3528fec9f0000000000000c9e | 37.985 | 19.550 | n/a | 0.000 | 3.532 | 5.094 | 0.282 | 0.002 | n/a | 0.008 | 9.511 | n/a | n/a | 0.007 | 23.082 | 0.608 | 0.007 | node-14/thread-0/client.validation-and-staging | driver.publication.readback 0.155ms; driver.publication.readback 0.137ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.018ms |
| 02a177b3528fec9f00000000000017bc | 35.783 | 3.274 | n/a | 0.000 | 4.728 | 0.573 | 0.564 | 0.007 | n/a | 0.192 | 26.433 | n/a | n/a | 0.013 | 8.002 | 0.224 | 0.013 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.065ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.048ms; driver.publication.persist-deferred 0.043ms |
| 02a177b3528fec9f0000000000001564 | 35.768 | 4.749 | n/a | 0.000 | 16.042 | 0.645 | 1.842 | 0.008 | n/a | 0.039 | 12.415 | n/a | n/a | 0.029 | 20.791 | 0.581 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.124ms; driver.publication.persist-deferred 0.085ms; driver.publication.persist-deferred 0.074ms |
| 02a177b3528fec9f00000000000018b7 | 35.255 | 2.049 | n/a | 0.000 | 3.933 | 0.729 | 1.566 | 0.021 | n/a | 1.728 | 25.176 | n/a | n/a | 0.054 | 5.982 | 0.170 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.568ms; driver.reader-basis.broadcast 0.811ms; driver.publication.readback 0.113ms; driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.047ms |
| 02a177b3528fec9f00000000000016a4 | 35.237 | 3.079 | n/a | 0.000 | 0.097 | 2.597 | 1.272 | 0.014 | n/a | 0.068 | 28.081 | n/a | n/a | 0.029 | 3.176 | 0.090 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 2.620ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.009ms |
| 02a177b3528fec9f0000000000000a60 | 34.730 | 1.833 | n/a | 0.000 | 0.940 | 1.114 | 0.418 | 0.004 | n/a | 0.021 | 30.388 | n/a | n/a | 0.012 | 2.773 | 0.080 | 0.012 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.314ms; driver.publication.persist-deferred 0.016ms |
| 02a177b3528fec9f0000000000001875 | 34.557 | 1.480 | n/a | 0.000 | 0.028 | 4.285 | 0.712 | 0.008 | n/a | 0.039 | 27.995 | n/a | n/a | 0.011 | 1.508 | 0.044 | 0.011 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.293ms |
| 02a177b3528fec9f0000000000000bea | 34.544 | 3.406 | n/a | 0.000 | 23.891 | 2.868 | 1.256 | 0.014 | n/a | 0.042 | 3.050 | n/a | n/a | 0.017 | 27.297 | 0.790 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.285ms; driver.publication.readback 0.124ms; driver.publication.persist-deferred 0.050ms; driver.publication.persist-deferred 0.038ms; driver.publication.persist-deferred 0.018ms |
| 02a177b3528fec9f0000000000000b09 | 33.736 | 2.623 | n/a | 0.000 | 0.101 | 27.023 | 3.907 | 0.018 | n/a | 0.025 | 0.000 | n/a | n/a | 0.039 | 2.724 | 0.081 | 0.039 | node-14/thread-0/socket.wait-first-byte | none observed |
| 02a177b3528fec9f0000000000000b71 | 33.350 | 2.594 | n/a | 0.000 | 20.841 | 0.597 | 0.976 | 0.007 | n/a | 0.027 | 8.297 | n/a | n/a | 0.011 | 23.435 | 0.703 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.184ms; driver.publication.persist-deferred 0.062ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.043ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.419 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 200.719 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 |
| p99 | 383.522 | n/a | n/a | n/a | 20.145 | n/a | 1.215 | 0.000 | 19.030 | 361.405 | 0.113 | n/a | 0.126 | 0.000 | n/a | n/a | 0.570 | 21.359 | 0.257 | 0.570 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff2090000000000000002 | 383.522 | 2.588 | n/a | 0.000 | 0.000 | 19.030 | 361.405 | 0.113 | n/a | 0.120 | 0.000 | n/a | n/a | 0.266 | 2.588 | 0.007 | 0.266 | gw-r/thread-44/gateway.admitted-work | none observed |
| ee1200e896726d030000000000000007 | 209.314 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 207.579 | 0.014 | n/a | 0.126 | 0.000 | n/a | n/a | 0.570 | 0.000 | 0.000 | 0.570 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000006 | 208.198 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 207.125 | 0.018 | n/a | 0.109 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000005 | 204.165 | 0.000 | n/a | 0.000 | 0.000 | 1.267 | 202.475 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000efc | 201.867 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 201.153 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d030000000000000efd | 201.419 | 0.000 | n/a | 0.000 | 0.000 | 0.487 | 200.719 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000efb | 201.285 | 0.000 | n/a | 0.000 | 0.000 | 0.547 | 200.574 | 0.011 | n/a | 0.036 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000f00 | 89.774 | 20.145 | n/a | 1.215 | 0.000 | 5.990 | 62.255 | 0.005 | n/a | 0.003 | 0.000 | n/a | n/a | 0.162 | 21.359 | 0.238 | 0.162 | gw-r/thread-43/gateway.admitted-work | none observed |
| ee1200e896726d030000000000000f02 | 79.560 | 18.248 | n/a | 0.000 | 0.000 | 3.635 | 57.480 | 0.006 | n/a | 0.014 | 0.000 | n/a | n/a | 0.177 | 18.248 | 0.229 | 0.177 | gw-r/thread-41/gateway.admitted-work | none observed |
| ee1200e896726d030000000000000f01 | 72.610 | 18.638 | n/a | 0.000 | 0.000 | 3.521 | 50.180 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.255 | 18.638 | 0.257 | 0.255 | gw-r/thread-69/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 886.259 | n/a | n/a | n/a | 0.403 | n/a | 0.000 | 0.000 | 0.657 | 867.974 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.267 | 0.403 | 0.000 | 0.267 |
| p99 | 1008.890 | n/a | n/a | n/a | 17.320 | n/a | 0.000 | 0.000 | 1.548 | 1005.083 | 0.005 | n/a | 0.233 | 0.000 | n/a | n/a | 1.618 | 17.320 | 0.020 | 1.618 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff20900000000000000a4 | 1008.890 | 0.403 | n/a | 0.000 | 0.000 | 1.548 | 1005.083 | 0.005 | n/a | 0.233 | 0.000 | n/a | n/a | 1.618 | 0.403 | 0.000 | 1.618 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff20900000000000000a5 | 886.259 | 17.320 | n/a | 0.000 | 0.000 | 0.657 | 867.974 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.267 | 17.320 | 0.020 | 0.267 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 439.676 | n/a | n/a | n/a | 2.886 | n/a | 0.000 | 0.000 | 0.622 | 435.959 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.101 | 2.886 | 0.007 | 0.101 |
| p99 | 1041.383 | n/a | n/a | n/a | 9.834 | n/a | 0.000 | 0.000 | 36.537 | 1003.567 | 0.057 | n/a | 0.094 | 0.000 | n/a | n/a | 48.992 | 9.834 | 0.118 | 48.992 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff20900000000000000d0 | 1041.383 | 0.144 | n/a | 0.000 | 0.000 | 36.537 | 1003.567 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 1.090 | 0.144 | 0.000 | 1.090 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff20900000000000000bb | 1002.598 | 0.159 | n/a | 0.000 | 0.000 | 0.450 | 1000.826 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 1.095 | 0.159 | 0.000 | 1.095 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff20900000000000000b4 | 1000.203 | 2.950 | n/a | 0.000 | 0.000 | 0.430 | 996.684 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.088 | 2.950 | 0.003 | 0.088 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000000ae | 952.488 | 1.833 | n/a | 0.000 | 0.000 | 0.622 | 949.866 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.102 | 1.833 | 0.002 | 0.102 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff20900000000000000ba | 946.112 | 2.696 | n/a | 0.000 | 0.000 | 1.379 | 941.907 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.088 | 2.696 | 0.003 | 0.088 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff20900000000000000ab | 792.169 | 3.186 | n/a | 0.000 | 0.000 | 3.205 | 785.556 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.157 | 3.186 | 0.004 | 0.157 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000000a8 | 734.064 | 3.925 | n/a | 0.000 | 0.000 | 0.866 | 729.117 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.102 | 3.925 | 0.005 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff20900000000000000b3 | 723.943 | 3.514 | n/a | 0.000 | 0.000 | 0.718 | 719.591 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.083 | 3.514 | 0.005 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000000c2 | 722.883 | 9.834 | n/a | 0.000 | 0.000 | 0.621 | 712.177 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.196 | 9.834 | 0.014 | 0.196 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff20900000000000000c9 | 657.847 | 2.436 | n/a | 0.000 | 0.000 | 0.494 | 654.756 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.078 | 2.436 | 0.004 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff20900000000000000c0 | 649.210 | 5.330 | n/a | 0.000 | 0.000 | 2.970 | 640.637 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.228 | 5.330 | 0.008 | 0.228 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000000c6 | 638.707 | 2.682 | n/a | 0.000 | 0.000 | 0.470 | 635.394 | 0.057 | n/a | 0.032 | 0.000 | n/a | n/a | 0.071 | 2.682 | 0.004 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff20900000000000000cb | 599.987 | 2.389 | n/a | 0.000 | 0.000 | 0.429 | 597.060 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.067 | 2.389 | 0.004 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff20900000000000000b7 | 446.016 | 3.460 | n/a | 0.000 | 0.000 | 0.514 | 441.861 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.137 | 3.460 | 0.008 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff20900000000000000b9 | 439.676 | 2.886 | n/a | 0.000 | 0.000 | 0.689 | 435.959 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.095 | 2.886 | 0.007 | 0.095 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000000a7 | 391.902 | 3.885 | n/a | 0.000 | 0.000 | 0.750 | 387.085 | 0.016 | n/a | 0.052 | 0.000 | n/a | n/a | 0.114 | 3.885 | 0.010 | 0.114 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff20900000000000000c5 | 353.224 | 2.323 | n/a | 0.000 | 0.000 | 0.520 | 350.262 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.078 | 2.323 | 0.007 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff20900000000000000c8 | 330.660 | 2.340 | n/a | 0.000 | 0.000 | 0.452 | 327.726 | 0.012 | n/a | 0.056 | 0.000 | n/a | n/a | 0.073 | 2.340 | 0.007 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000000b1 | 290.615 | 9.390 | n/a | 0.000 | 0.000 | 0.572 | 280.411 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.206 | 9.390 | 0.032 | 0.206 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000000c4 | 279.002 | 3.418 | n/a | 0.000 | 0.000 | 1.024 | 274.409 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.098 | 3.418 | 0.012 | 0.098 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 346.609 | n/a | n/a | n/a | 4.584 | n/a | 0.615 | 0.000 | 0.588 | 339.140 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.113 | 5.243 | 0.016 | 0.113 |
| p99 | 1005.993 | n/a | n/a | n/a | 15.791 | n/a | 3.321 | 0.000 | 6.121 | 1001.058 | 0.019 | n/a | 0.871 | 0.000 | n/a | n/a | 41.057 | 17.683 | 0.853 | 41.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff20900000000000000d3 | 1005.993 | 5.228 | n/a | 1.748 | 0.000 | 0.599 | 998.292 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.087 | 6.976 | 0.007 | 0.087 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff2090000000000000101 | 1003.103 | 0.178 | n/a | 0.000 | 0.000 | 0.649 | 1001.058 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 1.127 | 0.178 | 0.000 | 1.127 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff20900000000000000da | 991.936 | 3.724 | n/a | 1.730 | 0.000 | 0.507 | 985.858 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.079 | 5.454 | 0.005 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000000106 | 989.742 | 6.300 | n/a | 0.000 | 0.000 | 0.891 | 982.342 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.176 | 6.300 | 0.006 | 0.176 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff20900000000000000d9 | 988.657 | 3.839 | n/a | 1.021 | 0.000 | 6.121 | 977.497 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.136 | 4.860 | 0.005 | 0.136 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff209000000000000010e | 987.917 | 3.242 | n/a | 0.000 | 0.000 | 0.659 | 983.909 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.073 | 3.242 | 0.003 | 0.073 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff20900000000000000df | 986.527 | 3.803 | n/a | 0.542 | 0.000 | 0.588 | 981.441 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.101 | 4.345 | 0.004 | 0.101 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff20900000000000000de | 955.639 | 4.199 | n/a | 0.614 | 0.000 | 0.464 | 950.174 | 0.019 | n/a | 0.060 | 0.000 | n/a | n/a | 0.110 | 4.813 | 0.005 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000000d2 | 953.458 | 6.495 | n/a | 1.761 | 0.000 | 1.040 | 943.991 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.116 | 8.256 | 0.009 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000000fe | 929.101 | 5.491 | n/a | 0.000 | 0.000 | 0.560 | 922.934 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.072 | 5.491 | 0.006 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000000e5 | 862.008 | 4.441 | n/a | 0.522 | 0.000 | 1.646 | 855.197 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.147 | 4.963 | 0.006 | 0.147 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff20900000000000000e0 | 742.069 | 8.700 | n/a | 1.113 | 0.000 | 0.626 | 731.420 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.173 | 9.812 | 0.013 | 0.173 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff2090000000000000103 | 694.875 | 5.243 | n/a | 0.000 | 0.000 | 1.794 | 687.726 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.077 | 5.243 | 0.008 | 0.077 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000000dd | 613.594 | 4.842 | n/a | 0.540 | 0.000 | 0.868 | 607.207 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.091 | 5.382 | 0.009 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000000eb | 593.654 | 2.927 | n/a | 0.000 | 0.000 | 0.489 | 590.066 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.112 | 2.927 | 0.005 | 0.112 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000000e8 | 581.587 | 8.490 | n/a | 0.974 | 0.000 | 0.472 | 570.671 | 0.010 | n/a | 0.871 | 0.000 | n/a | n/a | 0.099 | 9.464 | 0.016 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000000fb | 535.269 | 7.665 | n/a | 2.583 | 0.000 | 0.601 | 524.245 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.132 | 10.249 | 0.019 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff20900000000000000db | 472.874 | 7.098 | n/a | 0.572 | 0.000 | 0.472 | 464.135 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.550 | 7.670 | 0.016 | 0.550 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff2090000000000000108 | 469.553 | 12.089 | n/a | 1.581 | 0.000 | 0.943 | 454.601 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.300 | 13.670 | 0.029 | 0.300 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000000fc | 464.149 | 3.879 | n/a | 0.709 | 0.000 | 0.441 | 458.995 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.104 | 4.588 | 0.010 | 0.104 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 430.656 | n/a | n/a | n/a | 4.129 | n/a | 0.000 | 0.000 | 0.577 | 424.722 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.119 | 4.129 | 0.011 | 0.119 |
| p99 | 1003.303 | n/a | n/a | n/a | 11.174 | n/a | 1.469 | 0.000 | 6.820 | 1001.216 | 0.357 | n/a | 6.243 | 0.000 | n/a | n/a | 45.714 | 12.643 | 0.534 | 45.714 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff209000000000000012b | 1003.303 | 0.188 | n/a | 0.000 | 0.000 | 0.648 | 1001.216 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 1.212 | 0.188 | 0.000 | 1.212 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff209000000000000011d | 1002.487 | 2.841 | n/a | 0.000 | 0.000 | 4.225 | 995.319 | 0.009 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.841 | 0.003 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000000115 | 996.822 | 3.489 | n/a | 0.000 | 0.000 | 0.699 | 992.536 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.072 | 3.489 | 0.004 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000141 | 994.372 | 2.667 | n/a | 0.000 | 0.000 | 0.402 | 991.184 | 0.012 | n/a | 0.040 | 0.000 | n/a | n/a | 0.066 | 2.667 | 0.003 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000000138 | 991.493 | 4.129 | n/a | 0.000 | 0.000 | 1.417 | 985.768 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.138 | 4.129 | 0.004 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff2090000000000000126 | 988.383 | 4.277 | n/a | 0.000 | 0.000 | 1.140 | 982.830 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.088 | 4.277 | 0.004 | 0.088 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff209000000000000012a | 916.387 | 3.081 | n/a | 0.000 | 0.000 | 0.625 | 912.531 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.105 | 3.081 | 0.003 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff2090000000000000149 | 799.021 | 4.036 | n/a | 0.000 | 0.000 | 0.543 | 794.283 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.119 | 4.036 | 0.005 | 0.119 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff209000000000000013e | 785.557 | 4.158 | n/a | 0.000 | 0.000 | 0.539 | 780.713 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.113 | 4.158 | 0.005 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff2090000000000000112 | 775.938 | 5.537 | n/a | 0.000 | 0.000 | 0.655 | 769.599 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.109 | 5.537 | 0.007 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000000134 | 765.488 | 5.810 | n/a | 0.000 | 0.000 | 0.750 | 758.734 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.154 | 5.810 | 0.008 | 0.154 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000000125 | 756.253 | 9.113 | n/a | 0.000 | 0.000 | 0.804 | 746.181 | 0.009 | n/a | 0.024 | 0.000 | n/a | n/a | 0.122 | 9.113 | 0.012 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff209000000000000012f | 703.383 | 5.418 | n/a | 0.000 | 0.000 | 0.711 | 697.143 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.079 | 5.418 | 0.008 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000127 | 702.156 | 7.066 | n/a | 0.995 | 0.000 | 0.473 | 693.483 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.126 | 8.060 | 0.011 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff209000000000000011e | 695.745 | 8.586 | n/a | 0.000 | 0.000 | 0.577 | 686.284 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.251 | 8.586 | 0.012 | 0.251 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff2090000000000000135 | 652.467 | 2.621 | n/a | 0.000 | 0.000 | 6.820 | 642.929 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.069 | 2.621 | 0.004 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff209000000000000010f | 618.113 | 5.082 | n/a | 0.000 | 0.000 | 0.494 | 612.371 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.146 | 5.082 | 0.008 | 0.146 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000142 | 578.120 | 4.116 | n/a | 0.000 | 0.000 | 2.466 | 571.404 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.079 | 4.116 | 0.007 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000000139 | 506.049 | 11.174 | n/a | 1.469 | 0.000 | 0.574 | 492.664 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.133 | 12.643 | 0.025 | 0.133 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff209000000000000013a | 493.092 | 3.752 | n/a | 0.000 | 0.000 | 0.524 | 488.708 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.070 | 3.752 | 0.008 | 0.070 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 366.605 | n/a | n/a | n/a | 2.889 | n/a | 0.000 | 0.000 | 0.557 | 358.680 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.080 | 2.889 | 0.008 | 0.080 |
| p99 | 1006.369 | n/a | n/a | n/a | 12.797 | n/a | 0.950 | 0.000 | 2.117 | 1002.686 | 0.493 | n/a | 0.073 | 0.000 | n/a | n/a | 25.100 | 13.748 | 0.611 | 25.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff2090000000000000186 | 1006.369 | 2.788 | n/a | 0.000 | 0.000 | 0.776 | 1002.686 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.091 | 2.788 | 0.003 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000174 | 1004.156 | 2.933 | n/a | 0.000 | 0.000 | 1.965 | 999.158 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.059 | 2.933 | 0.003 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff209000000000000017e | 1002.980 | 0.102 | n/a | 0.000 | 0.000 | 0.456 | 1001.271 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 1.096 | 0.102 | 0.000 | 1.096 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff2090000000000000164 | 1002.841 | 0.130 | n/a | 0.000 | 0.000 | 0.565 | 1000.503 | 0.493 | n/a | 0.043 | 0.000 | n/a | n/a | 1.105 | 0.130 | 0.000 | 1.105 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff209000000000000016e | 1000.849 | 2.826 | n/a | 0.000 | 0.000 | 0.477 | 997.449 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.068 | 2.826 | 0.003 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff2090000000000000185 | 995.499 | 4.362 | n/a | 0.000 | 0.000 | 0.655 | 990.406 | 0.002 | n/a | 0.011 | 0.000 | n/a | n/a | 0.063 | 4.362 | 0.004 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff2090000000000000154 | 992.503 | 5.447 | n/a | 0.000 | 0.000 | 0.874 | 986.017 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.133 | 5.447 | 0.005 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff209000000000000017a | 855.475 | 3.781 | n/a | 0.000 | 0.000 | 0.505 | 851.096 | 0.005 | n/a | 0.015 | 0.000 | n/a | n/a | 0.073 | 3.781 | 0.004 | 0.073 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff2090000000000000159 | 848.140 | 2.934 | n/a | 0.000 | 0.000 | 0.861 | 844.244 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.071 | 2.934 | 0.003 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff2090000000000000155 | 689.126 | 2.306 | n/a | 0.000 | 0.000 | 1.319 | 685.403 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.075 | 2.306 | 0.003 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000184 | 686.572 | 2.933 | n/a | 0.000 | 0.000 | 0.427 | 683.109 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.067 | 2.933 | 0.004 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff209000000000000016d | 675.734 | 3.191 | n/a | 0.000 | 0.000 | 1.052 | 671.372 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.074 | 3.191 | 0.005 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000000188 | 637.215 | 2.707 | n/a | 0.000 | 0.000 | 0.461 | 633.953 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.065 | 2.707 | 0.004 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000000177 | 636.119 | 2.752 | n/a | 0.000 | 0.000 | 0.593 | 632.660 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.073 | 2.752 | 0.004 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff209000000000000017c | 629.893 | 2.598 | n/a | 0.000 | 0.000 | 0.538 | 626.625 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.092 | 2.598 | 0.004 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000170 | 627.696 | 2.665 | n/a | 0.000 | 0.000 | 0.687 | 624.239 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.065 | 2.665 | 0.004 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff209000000000000014f | 524.809 | 2.238 | n/a | 0.000 | 0.000 | 0.479 | 521.992 | 0.005 | n/a | 0.015 | 0.000 | n/a | n/a | 0.080 | 2.238 | 0.004 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000167 | 505.829 | 4.290 | n/a | 0.000 | 0.000 | 0.592 | 500.830 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.085 | 4.290 | 0.008 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000000166 | 489.570 | 8.746 | n/a | 0.697 | 0.000 | 0.482 | 479.449 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.162 | 9.443 | 0.019 | 0.162 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000152 | 467.709 | 3.341 | n/a | 0.000 | 0.000 | 0.424 | 463.793 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 0.100 | 3.341 | 0.007 | 0.100 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 335.343 | n/a | n/a | n/a | 3.329 | n/a | 0.000 | 0.000 | 0.411 | 328.650 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.087 | 3.522 | 0.013 | 0.087 |
| p99 | 1006.581 | n/a | n/a | n/a | 12.098 | n/a | 0.865 | 0.000 | 15.744 | 1003.663 | 0.037 | n/a | 0.059 | 0.000 | n/a | n/a | 49.389 | 12.098 | 0.312 | 49.389 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff209000000000000018a | 1006.581 | 4.724 | n/a | 0.857 | 0.000 | 0.398 | 1000.359 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.213 | 5.582 | 0.006 | 0.213 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff20900000000000001c3 | 1005.633 | 0.169 | n/a | 0.000 | 0.000 | 0.632 | 1003.663 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 1.113 | 0.169 | 0.000 | 1.113 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff20900000000000001c2 | 1004.730 | 3.203 | n/a | 0.000 | 0.000 | 0.554 | 1000.856 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.069 | 3.203 | 0.003 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff20900000000000001a6 | 1001.861 | 6.374 | n/a | 0.000 | 0.000 | 0.376 | 994.896 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.191 | 6.374 | 0.006 | 0.191 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000001a5 | 989.158 | 2.675 | n/a | 0.865 | 0.000 | 0.272 | 985.211 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.095 | 3.540 | 0.004 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff20900000000000001a4 | 986.961 | 2.778 | n/a | 0.000 | 0.000 | 0.424 | 983.650 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.068 | 2.778 | 0.003 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000001c0 | 849.103 | 2.739 | n/a | 0.000 | 0.000 | 0.452 | 845.783 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.062 | 2.739 | 0.003 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff209000000000000019c | 814.890 | 4.917 | n/a | 0.000 | 0.000 | 1.104 | 808.753 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.084 | 4.917 | 0.006 | 0.084 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000199 | 786.774 | 3.675 | n/a | 0.000 | 0.000 | 0.908 | 782.052 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.085 | 3.675 | 0.005 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000001b4 | 722.994 | 3.256 | n/a | 0.000 | 0.000 | 0.510 | 719.121 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.066 | 3.256 | 0.005 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff2090000000000000198 | 710.920 | 4.832 | n/a | 0.000 | 0.000 | 15.744 | 690.134 | 0.023 | n/a | 0.042 | 0.000 | n/a | n/a | 0.145 | 4.832 | 0.007 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff20900000000000001d4 | 690.530 | 1.546 | n/a | 0.000 | 0.000 | 0.398 | 688.488 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.075 | 1.546 | 0.002 | 0.075 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000001cd | 640.806 | 2.507 | n/a | 0.000 | 0.000 | 0.360 | 637.820 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.057 | 2.507 | 0.004 | 0.057 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff20900000000000001b7 | 599.617 | 2.923 | n/a | 0.000 | 0.000 | 0.382 | 596.205 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.080 | 2.923 | 0.005 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff209000000000000019f | 587.490 | 4.011 | n/a | 0.734 | 0.000 | 0.451 | 582.155 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.101 | 4.745 | 0.008 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000001d0 | 545.674 | 3.053 | n/a | 0.000 | 0.000 | 0.417 | 542.093 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.087 | 3.053 | 0.006 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000001ae | 538.175 | 4.372 | n/a | 0.699 | 0.000 | 0.931 | 532.040 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.088 | 5.071 | 0.009 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff20900000000000001c5 | 529.630 | 4.020 | n/a | 0.000 | 0.000 | 0.766 | 524.728 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.087 | 4.020 | 0.008 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000001a7 | 518.415 | 3.522 | n/a | 0.000 | 0.000 | 0.617 | 514.120 | 0.025 | n/a | 0.042 | 0.000 | n/a | n/a | 0.089 | 3.522 | 0.007 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff20900000000000001a0 | 430.944 | 3.140 | n/a | 0.000 | 0.000 | 0.388 | 427.287 | 0.037 | n/a | 0.021 | 0.000 | n/a | n/a | 0.070 | 3.140 | 0.007 | 0.070 | gw-r/thread-43/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 390.435 | n/a | n/a | n/a | 3.123 | n/a | 0.000 | 0.000 | 0.517 | 382.946 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.108 | 3.123 | 0.010 | 0.108 |
| p99 | 1004.843 | n/a | n/a | n/a | 10.327 | n/a | 0.000 | 0.000 | 4.490 | 1002.234 | 0.316 | n/a | 0.066 | 0.000 | n/a | n/a | 41.538 | 10.327 | 0.615 | 41.538 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff2090000000000000207 | 1004.843 | 0.303 | n/a | 0.000 | 0.000 | 1.394 | 1001.919 | 0.017 | n/a | 0.066 | 0.000 | n/a | n/a | 1.144 | 0.303 | 0.000 | 1.144 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff20900000000000001fd | 1004.130 | 0.159 | n/a | 0.000 | 0.000 | 0.538 | 1002.234 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 1.150 | 0.159 | 0.000 | 1.150 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000000217 | 1002.148 | 0.112 | n/a | 0.000 | 0.000 | 0.394 | 1000.496 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 1.096 | 0.112 | 0.000 | 1.096 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000001e9 | 1000.708 | 3.389 | n/a | 0.000 | 0.000 | 0.683 | 996.535 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.077 | 3.389 | 0.003 | 0.077 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff2090000000000000212 | 996.650 | 3.195 | n/a | 0.000 | 0.000 | 0.470 | 992.842 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.094 | 3.195 | 0.003 | 0.094 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff2090000000000000219 | 983.856 | 2.373 | n/a | 0.000 | 0.000 | 0.388 | 980.831 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.209 | 2.373 | 0.002 | 0.209 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000000216 | 978.995 | 4.096 | n/a | 0.000 | 0.000 | 0.484 | 974.289 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.081 | 4.096 | 0.004 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000000213 | 965.291 | 8.068 | n/a | 0.000 | 0.000 | 0.716 | 956.351 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.125 | 8.068 | 0.008 | 0.125 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000001f6 | 899.295 | 4.541 | n/a | 0.000 | 0.000 | 0.517 | 894.095 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.111 | 4.541 | 0.005 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 52028179bffff20900000000000001f3 | 781.388 | 3.551 | n/a | 0.000 | 0.000 | 2.799 | 774.819 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.174 | 3.551 | 0.005 | 0.174 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000001ff | 739.891 | 3.099 | n/a | 0.000 | 0.000 | 0.409 | 736.226 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.126 | 3.099 | 0.004 | 0.126 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff20900000000000001e8 | 715.633 | 2.793 | n/a | 0.000 | 0.000 | 0.366 | 712.324 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.130 | 2.793 | 0.004 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000000202 | 676.752 | 2.582 | n/a | 0.000 | 0.000 | 2.898 | 671.129 | 0.010 | n/a | 0.024 | 0.000 | n/a | n/a | 0.108 | 2.582 | 0.004 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000001dc | 672.463 | 4.113 | n/a | 0.000 | 0.000 | 1.220 | 667.007 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.077 | 4.113 | 0.006 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000001ef | 659.293 | 2.362 | n/a | 0.000 | 0.000 | 0.430 | 656.403 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.064 | 2.362 | 0.004 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000000211 | 558.252 | 2.957 | n/a | 0.000 | 0.000 | 0.464 | 554.689 | 0.014 | n/a | 0.038 | 0.000 | n/a | n/a | 0.091 | 2.957 | 0.005 | 0.091 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000001d9 | 557.617 | 3.054 | n/a | 0.000 | 0.000 | 0.562 | 553.889 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.066 | 3.054 | 0.005 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000001ee | 527.894 | 2.912 | n/a | 0.000 | 0.000 | 0.523 | 524.332 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.094 | 2.912 | 0.006 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff20900000000000001e0 | 483.313 | 5.098 | n/a | 0.000 | 0.000 | 4.490 | 473.625 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.076 | 5.098 | 0.011 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff20900000000000001f8 | 454.473 | 4.469 | n/a | 0.000 | 0.000 | 0.674 | 449.147 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 0.132 | 4.469 | 0.010 | 0.132 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (746 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.300 | n/a | n/a | n/a | 3.289 | n/a | 0.000 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.111 | 3.289 | 0.255 | 7.111 |
| p99 | 186.639 | n/a | n/a | n/a | 15.179 | n/a | 1.083 | 0.000 | 1.624 | 183.013 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 47.849 | 15.392 | 0.822 | 47.849 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff2090000000000000225 | 1007.640 | 0.111 | n/a | 0.000 | 0.000 | 5.338 | 1001.057 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 1.100 | 0.111 | 0.000 | 1.100 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff209000000000000021a | 795.884 | 2.434 | n/a | 0.000 | 0.000 | 0.379 | 792.935 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.096 | 2.434 | 0.003 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff2090000000000000227 | 750.908 | 4.477 | n/a | 0.000 | 0.000 | 0.687 | 745.619 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.091 | 4.477 | 0.006 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000000222 | 688.165 | 2.721 | n/a | 0.000 | 0.000 | 0.421 | 684.816 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.171 | 2.721 | 0.004 | 0.171 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff209000000000000021d | 661.371 | 2.131 | n/a | 0.000 | 0.000 | 0.369 | 658.746 | 0.010 | n/a | 0.026 | 0.000 | n/a | n/a | 0.090 | 2.131 | 0.003 | 0.090 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000000224 | 325.891 | 2.607 | n/a | 0.000 | 0.000 | 0.450 | 322.695 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.089 | 2.607 | 0.008 | 0.089 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff209000000000000021e | 251.731 | 4.355 | n/a | 0.000 | 0.000 | 0.668 | 246.603 | 0.011 | n/a | 0.024 | 0.000 | n/a | n/a | 0.069 | 4.355 | 0.017 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff209000000000000021b | 186.639 | 2.475 | n/a | 0.000 | 0.000 | 0.876 | 183.013 | 0.130 | n/a | 0.024 | 0.000 | n/a | n/a | 0.121 | 2.475 | 0.013 | 0.121 | gw-r/thread-43/journal/page | none observed |
| 52028179bffff20900000000000004e6 | 108.868 | 5.645 | n/a | 0.000 | 0.000 | 1.522 | 101.577 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.100 | 5.645 | 0.052 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff209000000000000030f | 107.917 | 3.184 | n/a | 0.000 | 0.000 | 2.206 | 102.429 | 0.005 | n/a | 0.006 | 0.000 | n/a | n/a | 0.087 | 3.184 | 0.030 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff20900000000000005b5 | 99.356 | 22.308 | n/a | 2.372 | 0.000 | 0.620 | 73.765 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.251 | 24.680 | 0.248 | 0.251 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff2090000000000000220 | 99.289 | 2.868 | n/a | 0.000 | 0.000 | 0.408 | 95.887 | 0.009 | n/a | 0.024 | 0.000 | n/a | n/a | 0.093 | 2.868 | 0.029 | 0.093 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff2090000000000000367 | 97.896 | 5.723 | n/a | 0.000 | 0.000 | 0.572 | 91.483 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.073 | 5.723 | 0.058 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff209000000000000074f | 95.791 | 3.338 | n/a | 0.000 | 0.000 | 1.703 | 90.631 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.073 | 3.338 | 0.035 | 0.073 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff2090000000000000793 | 92.466 | 3.365 | n/a | 0.000 | 0.000 | 0.486 | 88.494 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.069 | 3.365 | 0.036 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000005e6 | 88.276 | 2.917 | n/a | 0.000 | 0.000 | 6.484 | 78.798 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.065 | 2.917 | 0.033 | 0.065 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff209000000000000065e | 88.275 | 4.156 | n/a | 0.000 | 0.000 | 0.445 | 83.595 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 0.071 | 4.156 | 0.047 | 0.071 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff20900000000000002f1 | 83.251 | 5.508 | n/a | 0.000 | 0.000 | 0.437 | 77.189 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.088 | 5.508 | 0.066 | 0.088 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff20900000000000004f0 | 81.059 | 2.177 | n/a | 0.000 | 0.000 | 0.459 | 78.325 | 0.001 | n/a | 0.006 | 0.000 | n/a | n/a | 0.091 | 2.177 | 0.027 | 0.091 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff2090000000000000817 | 81.030 | 7.324 | n/a | 0.000 | 0.000 | 0.372 | 73.000 | 0.037 | n/a | 0.031 | 0.000 | n/a | n/a | 0.266 | 7.324 | 0.090 | 0.266 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / internal (2288 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.309 | n/a | n/a | n/a | 4.024 | n/a | 0.000 | 0.000 | 0.207 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.844 | 4.086 | 0.343 | 5.844 |
| p99 | 341.158 | n/a | n/a | n/a | 16.060 | n/a | 1.571 | 0.000 | 1.675 | 338.763 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 46.890 | 17.457 | 0.864 | 46.890 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 52028179bffff2090000000000001a8f | 1003.822 | 2.673 | n/a | 0.000 | 0.000 | 0.329 | 1000.723 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.057 | 2.673 | 0.003 | 0.057 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff2090000000000001ad3 | 1002.866 | 0.271 | n/a | 0.000 | 0.000 | 0.989 | 1000.417 | 0.010 | n/a | 0.014 | 0.000 | n/a | n/a | 1.164 | 0.271 | 0.000 | 1.164 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff2090000000000001a85 | 1002.260 | 0.199 | n/a | 0.000 | 0.000 | 0.500 | 1000.403 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 1.125 | 0.199 | 0.000 | 1.125 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff2090000000000001aa8 | 1001.952 | 0.117 | n/a | 0.000 | 0.000 | 0.334 | 1000.382 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 1.083 | 0.117 | 0.000 | 1.083 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000001aca | 998.207 | 2.858 | n/a | 0.000 | 0.000 | 0.651 | 994.574 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.088 | 2.858 | 0.003 | 0.088 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff2090000000000001ace | 994.626 | 3.196 | n/a | 0.000 | 0.000 | 0.730 | 990.608 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.067 | 3.196 | 0.003 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000001a84 | 986.578 | 2.932 | n/a | 0.000 | 0.000 | 0.245 | 983.289 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.051 | 2.932 | 0.003 | 0.051 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000001a99 | 908.788 | 5.600 | n/a | 0.000 | 0.000 | 0.368 | 902.634 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.158 | 5.600 | 0.006 | 0.158 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff2090000000000001a8a | 892.148 | 3.331 | n/a | 0.000 | 0.000 | 0.391 | 888.279 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.107 | 3.331 | 0.004 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 52028179bffff2090000000000001aab | 821.486 | 3.333 | n/a | 0.000 | 0.000 | 0.430 | 817.611 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.085 | 3.333 | 0.004 | 0.085 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff2090000000000001a87 | 801.181 | 7.574 | n/a | 0.844 | 0.000 | 0.449 | 792.010 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.267 | 8.418 | 0.011 | 0.267 | gw-r/thread-47/journal/page | none observed |
| 52028179bffff2090000000000001aa4 | 713.366 | 4.014 | n/a | 0.000 | 0.000 | 0.374 | 708.831 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.118 | 4.014 | 0.006 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000001acb | 713.146 | 4.302 | n/a | 0.000 | 0.000 | 0.573 | 708.085 | 0.008 | n/a | 0.030 | 0.000 | n/a | n/a | 0.147 | 4.302 | 0.006 | 0.147 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000001aa0 | 680.455 | 3.158 | n/a | 0.000 | 0.000 | 0.348 | 676.864 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.056 | 3.158 | 0.005 | 0.056 | gw-r/thread-41/journal/page | none observed |
| 52028179bffff2090000000000001ac3 | 577.086 | 2.249 | n/a | 0.000 | 0.000 | 0.450 | 574.252 | 0.016 | n/a | 0.048 | 0.000 | n/a | n/a | 0.071 | 2.249 | 0.004 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000001a90 | 547.811 | 3.904 | n/a | 0.000 | 0.000 | 0.489 | 543.129 | 0.003 | n/a | 0.126 | 0.000 | n/a | n/a | 0.160 | 3.904 | 0.007 | 0.160 | gw-r/thread-48/journal/page | none observed |
| 52028179bffff2090000000000001ac5 | 532.796 | 3.752 | n/a | 0.000 | 0.000 | 0.578 | 528.271 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.141 | 3.752 | 0.007 | 0.141 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff2090000000000001aad | 525.005 | 13.474 | n/a | 1.665 | 0.000 | 0.405 | 508.965 | 0.033 | n/a | 0.025 | 0.000 | n/a | n/a | 0.437 | 15.139 | 0.029 | 0.437 | gw-r/thread-45/journal/page | none observed |
| 52028179bffff2090000000000001aba | 483.831 | 2.263 | n/a | 0.000 | 0.000 | 0.456 | 481.012 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.060 | 2.263 | 0.005 | 0.060 | gw-r/thread-65/journal/page | none observed |
| 52028179bffff2090000000000001ac6 | 455.935 | 2.078 | n/a | 0.000 | 0.000 | 0.559 | 453.209 | 0.006 | n/a | 0.016 | 0.000 | n/a | n/a | 0.067 | 2.078 | 0.005 | 0.067 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.806 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.710 | 200.753 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 |
| p99 | 216.562 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.297 | 215.082 | 6.435 | n/a | 2.890 | 0.000 | n/a | n/a | 50.632 | 0.000 | 0.000 | 50.632 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee1200e896726d030000000000000015 | 216.562 | 0.000 | n/a | 0.000 | 0.000 | 1.116 | 215.082 | 0.016 | n/a | 0.124 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000009 | 215.225 | 0.000 | n/a | 0.000 | 0.000 | 5.297 | 209.500 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.347 | 0.000 | 0.000 | 0.347 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000017 | 207.212 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 205.959 | 0.003 | n/a | 0.041 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000014 | 206.898 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 205.835 | 0.007 | n/a | 0.101 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000033 | 206.822 | 0.000 | n/a | 0.000 | 0.000 | 0.564 | 206.073 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d03000000000000000e | 206.417 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 202.582 | 0.006 | n/a | 2.890 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000027 | 206.132 | 0.000 | n/a | 0.000 | 0.000 | 1.085 | 204.686 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000059 | 205.567 | 0.000 | n/a | 0.000 | 0.000 | 0.395 | 204.771 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.329 | 0.000 | 0.000 | 0.329 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000038 | 205.538 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 204.591 | 0.009 | n/a | 0.094 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000018 | 204.846 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 203.977 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d03000000000000004b | 204.769 | 0.000 | n/a | 0.000 | 0.000 | 2.248 | 202.362 | 0.006 | n/a | 0.013 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000008 | 204.577 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 203.172 | 0.008 | n/a | 0.130 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d030000000000000031 | 204.533 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 203.249 | 0.017 | n/a | 0.080 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d03000000000000003d | 204.192 | 0.000 | n/a | 0.000 | 0.000 | 2.568 | 201.175 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.369 | 0.000 | 0.000 | 0.369 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d03000000000000003e | 203.875 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 202.572 | 0.030 | n/a | 0.097 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000040 | 203.585 | 0.000 | n/a | 0.000 | 0.000 | 2.629 | 200.734 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000021 | 203.309 | 0.000 | n/a | 0.000 | 0.000 | 1.283 | 201.612 | 0.009 | n/a | 0.178 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000046 | 203.041 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.940 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d03000000000000001b | 202.956 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 202.027 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d030000000000000035 | 202.943 | 0.000 | n/a | 0.000 | 0.000 | 1.252 | 201.506 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.588 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.661 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 |
| p99 | 209.372 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.354 | 208.485 | 6.757 | n/a | 1.867 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee1200e896726d030000000000000079 | 209.372 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 208.485 | 0.017 | n/a | 0.061 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000000c3 | 206.388 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 205.279 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d030000000000000073 | 205.349 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 204.265 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d03000000000000006d | 205.306 | 0.000 | n/a | 0.000 | 0.000 | 4.354 | 200.764 | 0.004 | n/a | 0.068 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d03000000000000009d | 204.732 | 0.000 | n/a | 0.000 | 0.000 | 0.928 | 203.616 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000077 | 204.583 | 0.000 | n/a | 0.000 | 0.000 | 0.566 | 203.837 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d0300000000000000aa | 204.522 | 0.000 | n/a | 0.000 | 0.000 | 0.979 | 203.251 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d03000000000000007d | 204.417 | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 203.534 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d03000000000000006c | 204.389 | 0.000 | n/a | 0.000 | 0.000 | 3.579 | 200.608 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d03000000000000008d | 204.331 | 0.000 | n/a | 0.000 | 0.000 | 0.387 | 203.747 | 0.005 | n/a | 0.080 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000000a6 | 204.127 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 202.732 | 0.012 | n/a | 0.320 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000097 | 203.642 | 0.000 | n/a | 0.000 | 0.000 | 2.459 | 200.958 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d03000000000000008e | 203.258 | 0.000 | n/a | 0.000 | 0.000 | 0.722 | 200.797 | 0.005 | n/a | 1.624 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d0300000000000000c1 | 203.106 | 0.000 | n/a | 0.000 | 0.000 | 2.146 | 200.745 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000082 | 202.752 | 0.000 | n/a | 0.000 | 0.000 | 0.977 | 201.464 | 0.005 | n/a | 0.085 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d0300000000000000b7 | 202.662 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 201.416 | 0.011 | n/a | 0.112 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d0300000000000000a9 | 202.561 | 0.000 | n/a | 0.000 | 0.000 | 1.085 | 201.092 | 0.034 | n/a | 0.083 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000084 | 202.515 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 201.545 | 0.008 | n/a | 0.115 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000068 | 202.439 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 201.556 | 0.006 | n/a | 0.084 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d0300000000000000c4 | 202.423 | 0.000 | n/a | 0.000 | 0.000 | 1.253 | 200.820 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.472 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 200.648 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 205.990 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.082 | 204.780 | 4.430 | n/a | 0.110 | 0.000 | n/a | n/a | 0.404 | 0.000 | 0.000 | 0.404 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee1200e896726d030000000000000115 | 205.990 | 0.000 | n/a | 0.000 | 0.000 | 0.936 | 204.780 | 0.010 | n/a | 0.110 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000111 | 205.303 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 204.511 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000000cc | 205.093 | 0.000 | n/a | 0.000 | 0.000 | 0.468 | 204.463 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d0300000000000000dd | 205.056 | 0.000 | n/a | 0.000 | 0.000 | 4.082 | 200.759 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000112 | 204.767 | 0.000 | n/a | 0.000 | 0.000 | 0.458 | 204.182 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000000e2 | 204.397 | 0.000 | n/a | 0.000 | 0.000 | 3.510 | 200.713 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000000cb | 204.049 | 0.000 | n/a | 0.000 | 0.000 | 0.605 | 203.288 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d0300000000000000dc | 204.040 | 0.000 | n/a | 0.000 | 0.000 | 0.458 | 203.444 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d0300000000000000d6 | 203.718 | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 202.917 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000104 | 203.502 | 0.000 | n/a | 0.000 | 0.000 | 2.811 | 200.531 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000000ed | 202.442 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 201.159 | 0.018 | n/a | 0.067 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000122 | 202.366 | 0.000 | n/a | 0.000 | 0.000 | 1.699 | 200.465 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d0300000000000000fb | 202.342 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.095 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d0300000000000000fc | 202.279 | 0.000 | n/a | 0.000 | 0.000 | 1.282 | 200.800 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000000e9 | 202.275 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 200.934 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000107 | 202.267 | 0.000 | n/a | 0.000 | 0.000 | 1.551 | 200.471 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d0300000000000000d4 | 202.190 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 201.096 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000000f1 | 202.181 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 201.184 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000000e4 | 202.120 | 0.000 | n/a | 0.000 | 0.000 | 0.976 | 200.976 | 0.014 | n/a | 0.047 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d0300000000000000e0 | 202.065 | 0.000 | n/a | 0.000 | 0.000 | 0.545 | 201.340 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.296 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 200.597 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 207.405 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.630 | 204.967 | 4.260 | n/a | 0.093 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee1200e896726d030000000000000193 | 207.405 | 0.000 | n/a | 0.000 | 0.000 | 6.630 | 200.611 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000155 | 205.502 | 0.000 | n/a | 0.000 | 0.000 | 0.332 | 204.967 | 0.018 | n/a | 0.093 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d03000000000000015a | 204.386 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 203.618 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d03000000000000013f | 203.619 | 0.000 | n/a | 0.000 | 0.000 | 1.922 | 201.537 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000176 | 203.267 | 0.000 | n/a | 0.000 | 0.000 | 2.454 | 200.631 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d03000000000000013b | 202.675 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 201.789 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000170 | 202.466 | 0.000 | n/a | 0.000 | 0.000 | 1.137 | 201.021 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d03000000000000018d | 202.309 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 201.209 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d03000000000000018e | 202.183 | 0.000 | n/a | 0.000 | 0.000 | 0.465 | 201.575 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d03000000000000013d | 202.163 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 201.151 | 0.021 | n/a | 0.078 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000188 | 202.126 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 201.138 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d03000000000000016c | 202.100 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 200.997 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d030000000000000137 | 201.945 | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 200.582 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d03000000000000016b | 201.911 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 200.853 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d03000000000000013a | 201.907 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 200.988 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000171 | 201.904 | 0.000 | n/a | 0.000 | 0.000 | 0.670 | 201.002 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000189 | 201.902 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 201.079 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000172 | 201.902 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 200.749 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000133 | 201.884 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 200.973 | 0.012 | n/a | 0.054 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d03000000000000015b | 201.839 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 200.938 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-41/journal/page | none observed |

## P3 / L64 / read (107 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.168 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.466 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 206.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.058 | 205.354 | 2.590 | n/a | 0.081 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee1200e896726d0300000000000001a4 | 225.461 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 224.703 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000195 | 206.016 | 0.000 | n/a | 0.000 | 0.000 | 0.470 | 205.354 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d0300000000000001c0 | 205.085 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 204.319 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000196 | 204.803 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 203.802 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000001ba | 204.719 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 203.966 | 0.017 | n/a | 0.019 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000001bf | 204.658 | 0.000 | n/a | 0.000 | 0.000 | 4.058 | 200.425 | 0.005 | n/a | 0.014 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000001a1 | 204.495 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 203.771 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000001b6 | 204.439 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 203.448 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000001ee | 203.565 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 202.766 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000001e3 | 203.253 | 0.000 | n/a | 0.000 | 0.000 | 2.544 | 200.540 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000001e8 | 202.463 | 0.000 | n/a | 0.000 | 0.000 | 0.438 | 201.880 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000001be | 202.394 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 201.552 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d0300000000000001ef | 201.993 | 0.000 | n/a | 0.000 | 0.000 | 0.557 | 201.250 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d03000000000000019c | 201.991 | 0.000 | n/a | 0.000 | 0.000 | 0.748 | 200.983 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d0300000000000001b8 | 201.930 | 0.000 | n/a | 0.000 | 0.000 | 1.168 | 200.550 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d0300000000000001a8 | 201.890 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 200.630 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d0300000000000001af | 201.876 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 200.753 | 0.012 | n/a | 0.040 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d0300000000000001a6 | 201.861 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 200.810 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000001c4 | 201.816 | 0.000 | n/a | 0.000 | 0.000 | 0.333 | 201.344 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d0300000000000001b9 | 201.816 | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 200.982 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-41/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.371 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.615 | 200.559 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 205.418 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.865 | 204.329 | 2.402 | n/a | 0.147 | 0.000 | n/a | n/a | 0.462 | 0.000 | 0.000 | 0.462 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee1200e896726d03000000000000023f | 210.981 | 0.000 | n/a | 0.000 | 0.000 | 6.248 | 204.466 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000217 | 205.418 | 0.000 | n/a | 0.000 | 0.000 | 3.397 | 201.875 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000270 | 205.058 | 0.000 | n/a | 0.000 | 0.000 | 0.502 | 204.329 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000223 | 205.007 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 204.012 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000211 | 204.481 | 0.000 | n/a | 0.000 | 0.000 | 0.611 | 203.702 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d03000000000000026e | 203.937 | 0.000 | n/a | 0.000 | 0.000 | 2.793 | 200.956 | 0.008 | n/a | 0.091 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000278 | 203.699 | 0.000 | n/a | 0.000 | 0.000 | 2.709 | 200.803 | 0.016 | n/a | 0.074 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000231 | 203.231 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 201.779 | 0.024 | n/a | 0.292 | 0.000 | n/a | n/a | 0.462 | 0.000 | 0.000 | 0.462 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d03000000000000021a | 202.976 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 202.087 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000259 | 202.226 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 201.080 | 0.168 | n/a | 0.061 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000260 | 202.216 | 0.000 | n/a | 0.000 | 0.000 | 1.180 | 200.823 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000252 | 202.161 | 0.000 | n/a | 0.000 | 0.000 | 1.110 | 200.756 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000275 | 202.126 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 200.946 | 0.005 | n/a | 0.068 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000236 | 202.050 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.989 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000257 | 201.924 | 0.000 | n/a | 0.000 | 0.000 | 0.422 | 201.095 | 0.017 | n/a | 0.058 | 0.000 | n/a | n/a | 0.332 | 0.000 | 0.000 | 0.332 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000235 | 201.872 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 200.646 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d03000000000000022f | 201.863 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 200.872 | 0.018 | n/a | 0.060 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d03000000000000024c | 201.807 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 200.748 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d03000000000000024a | 201.782 | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 200.627 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d03000000000000027b | 201.765 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 200.891 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-43/journal/page | none observed |

## P3 / L1024 / read (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 74.856 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.522 | 74.115 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 |
| p99 | 205.459 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.420 | 203.518 | 30.092 | n/a | 0.170 | 0.000 | n/a | n/a | 50.742 | 0.000 | 0.000 | 50.742 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee1200e896726d03000000000000028f | 205.459 | 0.000 | n/a | 0.000 | 0.000 | 1.792 | 203.518 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000296 | 203.206 | 0.000 | n/a | 0.000 | 0.000 | 2.420 | 200.546 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000289 | 203.128 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 202.290 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000284 | 202.963 | 0.000 | n/a | 0.000 | 0.000 | 1.195 | 201.485 | 0.025 | n/a | 0.066 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000290 | 202.065 | 0.000 | n/a | 0.000 | 0.000 | 1.295 | 200.615 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d030000000000000295 | 201.859 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 200.843 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000291 | 201.809 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 200.866 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d03000000000000027f | 201.789 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 200.940 | 0.022 | n/a | 0.060 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d030000000000000283 | 201.749 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 200.594 | 0.005 | n/a | 0.078 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-41/journal/page | none observed |
| ee1200e896726d03000000000000028b | 201.484 | 0.000 | n/a | 0.000 | 0.000 | 0.605 | 200.703 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d03000000000000027e | 201.378 | 0.000 | n/a | 0.000 | 0.000 | 0.546 | 200.663 | 0.004 | n/a | 0.054 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d03000000000000027d | 201.374 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 200.568 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000286 | 201.354 | 0.000 | n/a | 0.000 | 0.000 | 0.522 | 200.669 | 0.014 | n/a | 0.054 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000294 | 201.213 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 200.438 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000282 | 201.175 | 0.000 | n/a | 0.000 | 0.000 | 0.415 | 200.606 | 0.019 | n/a | 0.042 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d03000000000000028a | 200.964 | 0.000 | n/a | 0.000 | 0.000 | 0.428 | 200.405 | 0.004 | n/a | 0.013 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000292 | 200.943 | 0.000 | n/a | 0.000 | 0.000 | 0.394 | 200.453 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d03000000000000028d | 200.819 | 0.000 | n/a | 0.000 | 0.000 | 0.326 | 200.361 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000281 | 184.383 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 183.513 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-44/journal/page | none observed |
| ee1200e896726d030000000000000280 | 127.659 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 126.336 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.771 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.448 | 83.173 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 |
| p99 | 202.527 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.728 | 201.126 | 0.969 | n/a | 0.096 | 0.000 | n/a | n/a | 49.674 | 0.000 | 0.000 | 49.674 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee1200e896726d030000000000000ebd | 203.858 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 202.794 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000ed0 | 203.642 | 0.000 | n/a | 0.000 | 0.000 | 2.892 | 200.591 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000ef7 | 202.527 | 0.000 | n/a | 0.000 | 0.000 | 1.640 | 200.688 | 0.013 | n/a | 0.058 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d030000000000000eed | 201.882 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 200.904 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000ec3 | 201.799 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 201.014 | 0.005 | n/a | 0.071 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000ed3 | 201.785 | 0.000 | n/a | 0.000 | 0.000 | 1.116 | 200.504 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d030000000000000e96 | 201.748 | 0.000 | n/a | 0.000 | 0.000 | 0.369 | 201.188 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-65/journal/page | none observed |
| ee1200e896726d030000000000000eaa | 201.690 | 0.000 | n/a | 0.000 | 0.000 | 0.389 | 201.126 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000ed9 | 201.681 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 200.621 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000edd | 201.676 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 200.739 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000ea9 | 201.664 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 200.887 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000e9b | 201.642 | 0.000 | n/a | 0.000 | 0.000 | 0.455 | 200.991 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-43/journal/page | none observed |
| ee1200e896726d030000000000000ee8 | 201.639 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 200.759 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000eec | 201.635 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 200.760 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000ee3 | 201.628 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 200.777 | 0.016 | n/a | 0.078 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000eb1 | 201.622 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 200.674 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| ee1200e896726d030000000000000eb2 | 201.585 | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 200.903 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| ee1200e896726d030000000000000ec1 | 201.575 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 200.768 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| ee1200e896726d030000000000000ef1 | 201.555 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 200.603 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| ee1200e896726d030000000000000ec2 | 201.531 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 200.570 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.361 | 0.000 | 0.000 | 0.361 | gw-r/thread-43/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions

Verdict: scheduled offer to the final receipt handed to the caller (ack/1, Sam 2026-11-16). Actual scheduler lateness counts. Legacy finish is reported, never judged. Corrected removes observed offer lateness, including GC/event-loop stalls, and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged. Commit-based bars need at least 500 primary commits, including both sides of a ratio.

Timer lateness p50/p99: 0.002/4.246 ms; post-ACK p50/p99: 0.398/1.984 ms.

| Measurement | verdict (ACK) | legacy finish | corrected diagnostic | bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 9.070 | 9.599 | 8.861 | reported |
| All-primary p99 ms | 44.876 | 45.509 | 44.521 | <=50 |
| L256 5-10 p50Ms | 10.175 | 10.495 | 10.175 | <=10 |
| L256 5-10 p99Ms | 19.165 | 21.003 | 19.163 | <=50 |
| L256 11-25 p50Ms | 20.223 | 20.735 | 20.095 | <=10 |
| L256 11-25 p99Ms | 31.222 | 31.947 | 31.214 | <=50 |
| L256 26-50 p50Ms | 13.567 | 16.383 | 13.567 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 15.119 | 16.515 | 15.117 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 7.807 | 8.159 | 7.551 | <=10 |
| Burst 11-25 p50 ms | 9.791 | 10.495 | 9.599 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 31.222 | 31.947 | 31.214 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 106.254 | 106.839 | 105.710 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 93.851/93.851 | 91.561 | 63.591 | 155.707 | 1.365/0.172 |
| 5-10 | 250-1000 | 53 | 14.035/41.969 | 13.619 | 8.200 | 19.724 | 0.091/0.033 |
| 11-25 | 100-250 | 14 | 14.787/27.903 | 13.973 | 6.902 | 21.835 | 0.069/0.025 |
| 26-50 | 100-250 | 5 | 20.594/32.385 | 19.664 | 12.061 | 28.958 | 0.118/0.026 |
| 11-25 | 250-1000 | 26 | 19.937/32.365 | 19.414 | 10.128 | 32.012 | 0.077/0.023 |
| 5-10 | 0-50 | 1144 | 7.249/26.992 | 6.878 | 3.626 | 9.217 | 0.042/0.019 |
| 5-10 | 100-250 | 21 | 10.135/68.512 | 9.801 | 6.271 | 12.961 | 0.072/0.022 |
| 26-50 | 250-1000 | 8 | 24.478/56.287 | 23.028 | 10.326 | 24.327 | 0.132/0.025 |
| 5-10 | 50-100 | 65 | 7.229/21.351 | 6.934 | 3.703 | 9.343 | 0.050/0.020 |
| 11-25 | 0-50 | 546 | 9.460/33.925 | 8.819 | 4.653 | 11.881 | 0.047/0.020 |
| 26-50 | overlap | 146 | 15.373/71.256 | 14.022 | 7.905 | 20.256 | 0.054/0.021 |
| 26-50 | 50-100 | 15 | 12.930/36.391 | 11.655 | 5.708 | 14.953 | 0.065/0.024 |
| 11-25 | overlap | 366 | 11.977/84.706 | 11.365 | 6.648 | 15.115 | 0.039/0.019 |
| 11-25 | 50-100 | 34 | 10.913/44.557 | 10.210 | 5.414 | 13.904 | 0.068/0.019 |
| 5-10 | overlap | 782 | 9.513/44.411 | 9.179 | 5.453 | 12.167 | 0.036/0.018 |
| 26-50 | 0-50 | 194 | 13.148/66.837 | 12.152 | 5.948 | 15.742 | 0.058/0.021 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 894 | 19 | 1573.558 |
| burst | 2526 | 6 | 388.130 |

## Writer heap, GC and scheduler stalls

Source 2409bdada6be6cb7f17d1aa71f31da90a72f01af; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 329.906 / 477.074 |
| GC events / total duration / maximum ms | 619 / 1360.823 / 26.882 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":607,"4":6,"8":6} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 45.509 / 26 / 2030.551 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

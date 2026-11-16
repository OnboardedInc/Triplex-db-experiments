# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (107.083 ms, trace `229c246d02f877b30000000000001fad`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (87.898 ms, trace `229c246d02f877b30000000000002316`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (79.778 ms, trace `229c246d02f877b30000000000000151`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (53.490 ms, trace `229c246d02f877b300000000000001fe`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (74.838 ms, trace `229c246d02f877b300000000000001a9`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-cores-b-1-baseline-ladder`; source `d709fd769d271992b6a87841489c90665585e919`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4258/4259 (99.977%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 19060885.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 386 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 14336.307 | 1036.635 | 22.609 | 457 |
| L1 | 1 | 44972.270 | 2005.869 | 36.060 | 1485 |
| L4 | 4 | 44934.292 | 3191.485 | 70.520 | 1762 |
| L16 | 16 | 44035.125 | 9987.762 | 123.499 | 34266 |
| L64 | 64 | 44979.260 | 10790.520 | 182.599 | 35836 |
| L256 | 256 | 44362.464 | 2716.012 | 76.703 | 1560 |
| L1024 | 1024 | 44187.677 | 3412.017 | 107.786 | 1598 |
| tail | 0 | 163522.563 | 4081.035 | 79.742 | 6116 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 229c246d02f877b30000000000001fad | driver.queue.scheduler-dispatch | 0.045 | none | 0 / 32 |
| 229c246d02f877b30000000000001fad | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 229c246d02f877b30000000000001fad waited: []

| 229c246d02f877b30000000000002316 | driver.queue.scheduler-dispatch | 0.080 | none | 0 / 32 |
| 229c246d02f877b30000000000002316 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 229c246d02f877b30000000000002316 waited: []

| 229c246d02f877b30000000000000151 | driver.queue.scheduler-dispatch | 0.056 | none | 0 / 32 |
| 229c246d02f877b30000000000000151 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 229c246d02f877b30000000000000151 waited: []

| 229c246d02f877b300000000000001fe | driver.queue.scheduler-dispatch | 0.102 | none | 0 / 32 |
| 229c246d02f877b300000000000001fe | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 229c246d02f877b300000000000001fe waited: []

| 229c246d02f877b300000000000001a9 | driver.queue.scheduler-dispatch | 0.051 | none | 0 / 32 |
| 229c246d02f877b300000000000001a9 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 229c246d02f877b300000000000001a9 waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.579 | 0.303 | 0.000 | 0.551 | 4.975 | 3.628 | 0.000 | 0.070 | 1.500 | 8.537 | 0.044 | n/a | 0.368 | 13.096 | n/a | n/a | 0.029 | 6.106 | 0.217 | 0.029 |
| p99 | 84.365 | 3.492 | 0.000 | 2.787 | 20.711 | n/a | 5.265 | 2.305 | 9.879 | 22.929 | 0.218 | n/a | 3.738 | 69.988 | n/a | n/a | 0.166 | 22.958 | 0.516 | 0.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000000127 | 84.365 | 10.754 | n/a | 0.000 | 0.174 | 1.167 | 1.843 | 0.218 | n/a | 0.156 | 69.988 | n/a | n/a | 0.065 | 10.927 | 0.130 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms |
| 229c246d02f877b3000000000000011b | 83.015 | 12.821 | 0.155 | 0.000 | 0.061 | 2.328 | 17.257 | 0.083 | n/a | 0.142 | 50.146 | n/a | n/a | 0.021 | 13.037 | 0.157 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 229c246d02f877b30000000000000103 | 70.068 | 20.711 | 2.166 | 0.000 | 0.080 | 2.326 | 17.560 | 0.203 | n/a | 0.992 | 26.003 | n/a | n/a | 0.027 | 22.958 | 0.328 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 229c246d02f877b30000000000000100 | 55.619 | 9.873 | n/a | 0.000 | 0.263 | 0.988 | 13.531 | 0.051 | n/a | 0.111 | 30.636 | n/a | n/a | 0.166 | 10.137 | 0.182 | 0.166 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000113 | 55.144 | 8.938 | 3.628 | 0.000 | 0.129 | 5.899 | 14.371 | 0.062 | n/a | 0.233 | 21.829 | n/a | n/a | 0.054 | 12.696 | 0.230 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 229c246d02f877b30000000000000139 | 47.244 | 4.975 | 0.149 | 5.058 | 0.066 | 1.846 | 15.266 | 0.058 | n/a | 1.445 | 18.354 | n/a | n/a | 0.028 | 10.248 | 0.217 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| 229c246d02f877b30000000000000131 | 46.581 | 7.530 | 0.189 | 5.265 | 0.070 | 1.726 | 14.537 | 0.035 | n/a | 0.489 | 16.713 | n/a | n/a | 0.027 | 13.054 | 0.280 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 229c246d02f877b30000000000000107 | 45.728 | 9.844 | 0.333 | 0.000 | 0.073 | 6.252 | 14.570 | 0.044 | n/a | 0.140 | 14.435 | n/a | n/a | 0.038 | 10.250 | 0.224 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 229c246d02f877b30000000000000115 | 45.014 | 13.412 | 0.196 | 0.000 | 0.092 | 5.328 | 12.474 | 0.050 | n/a | 0.392 | 13.043 | n/a | n/a | 0.027 | 13.699 | 0.304 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 229c246d02f877b3000000000000010b | 44.635 | 3.838 | 0.180 | 0.000 | 0.103 | 9.879 | 18.703 | 0.043 | n/a | 0.368 | 11.479 | n/a | n/a | 0.042 | 4.121 | 0.092 | 0.042 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.028ms |
| 229c246d02f877b3000000000000011f | 44.158 | 4.842 | 0.509 | 0.000 | 0.057 | 2.104 | 22.929 | 0.064 | n/a | 0.708 | 12.917 | n/a | n/a | 0.028 | 5.407 | 0.122 | 0.028 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.044ms |
| 229c246d02f877b30000000000000125 | 44.027 | 20.219 | 0.261 | 2.122 | 0.113 | 1.929 | 8.537 | 0.066 | n/a | 0.162 | 10.576 | n/a | n/a | 0.042 | 22.715 | 0.516 | 0.042 | node-15/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.066ms |
| 229c246d02f877b3000000000000012d | 42.349 | 13.496 | 0.149 | 1.862 | 0.063 | 2.139 | 11.058 | 0.044 | n/a | 0.415 | 13.096 | n/a | n/a | 0.028 | 15.571 | 0.368 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 229c246d02f877b30000000000000135 | 39.193 | 4.279 | 0.236 | 0.000 | 0.044 | 1.500 | 9.828 | 0.029 | n/a | 3.500 | 19.754 | n/a | n/a | 0.023 | 4.559 | 0.116 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.072ms |
| 229c246d02f877b30000000000000129 | 38.579 | 13.385 | 0.183 | 0.326 | 0.093 | 1.326 | 6.276 | 0.061 | n/a | 0.138 | 16.753 | n/a | n/a | 0.037 | 13.988 | 0.363 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.074ms |
| 229c246d02f877b3000000000000010d | 32.561 | 5.851 | 0.193 | 0.000 | 0.062 | 2.420 | 10.803 | 0.030 | n/a | 0.087 | 13.086 | n/a | n/a | 0.029 | 6.106 | 0.188 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 229c246d02f877b30000000000000119 | 32.103 | 3.706 | n/a | 0.000 | 0.086 | 1.033 | 9.554 | 0.024 | n/a | 0.094 | 17.574 | n/a | n/a | 0.031 | 3.792 | 0.118 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000116 | 26.908 | 7.695 | n/a | 0.000 | 0.168 | 1.424 | 6.700 | 0.082 | n/a | 3.738 | 7.048 | n/a | n/a | 0.052 | 7.863 | 0.292 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000109 | 26.633 | 3.348 | n/a | 0.000 | 0.070 | 1.283 | 5.956 | 0.036 | n/a | 0.537 | 15.368 | n/a | n/a | 0.036 | 3.418 | 0.128 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000136 | 25.501 | 3.078 | n/a | 0.000 | 0.034 | 0.737 | 1.310 | 0.016 | n/a | 2.543 | 17.766 | n/a | n/a | 0.016 | 3.113 | 0.122 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.072ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.812 | 0.509 | 0.000 | 0.647 | 2.673 | n/a | 0.000 | 0.069 | 0.783 | 1.310 | 0.020 | n/a | 0.385 | 7.294 | n/a | n/a | 0.027 | 3.034 | 0.204 | 0.027 |
| p99 | 26.633 | 2.004 | 0.000 | 0.949 | 3.881 | n/a | 0.000 | 2.305 | 4.374 | 5.956 | 0.036 | n/a | 2.543 | 17.766 | n/a | n/a | 0.127 | 4.770 | 0.297 | 0.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000000109 | 26.633 | 3.348 | n/a | 0.000 | 0.070 | 1.283 | 5.956 | 0.036 | n/a | 0.537 | 15.368 | n/a | n/a | 0.036 | 3.418 | 0.128 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000136 | 25.501 | 3.078 | n/a | 0.000 | 0.034 | 0.737 | 1.310 | 0.016 | n/a | 2.543 | 17.766 | n/a | n/a | 0.016 | 3.113 | 0.122 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.072ms |
| 229c246d02f877b30000000000000123 | 22.485 | 3.881 | n/a | 0.000 | 0.715 | 0.871 | 1.372 | 0.020 | n/a | 0.385 | 15.221 | n/a | n/a | 0.019 | 4.597 | 0.204 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000105 | 17.576 | 2.465 | n/a | 0.000 | 2.305 | 0.783 | 3.958 | 0.023 | n/a | 0.829 | 7.084 | n/a | n/a | 0.127 | 4.770 | 0.271 | 0.127 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.095ms |
| 229c246d02f877b3000000000000012f | 16.812 | 2.264 | n/a | 0.000 | 0.048 | 0.744 | 3.806 | 0.020 | n/a | 0.087 | 9.819 | n/a | n/a | 0.024 | 2.312 | 0.138 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000133 | 15.843 | 2.673 | n/a | 0.000 | 0.069 | 4.374 | 1.278 | 0.023 | n/a | 0.103 | 7.294 | n/a | n/a | 0.031 | 2.742 | 0.173 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000120 | 11.380 | 2.927 | n/a | 0.000 | 0.068 | 1.160 | 1.303 | 0.023 | n/a | 0.513 | 5.358 | n/a | n/a | 0.029 | 2.994 | 0.263 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000010e | 10.207 | 2.357 | n/a | 0.000 | 0.677 | 0.767 | 1.299 | 0.019 | n/a | 0.113 | 4.948 | n/a | n/a | 0.027 | 3.034 | 0.297 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000012b | 10.019 | 2.170 | n/a | 0.000 | 0.065 | 0.697 | 1.158 | 0.020 | n/a | 0.159 | 5.725 | n/a | n/a | 0.025 | 2.235 | 0.223 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.211 | 0.000 | 0.000 | 0.456 | 3.701 | n/a | 0.000 | 0.063 | 1.302 | 4.351 | 0.028 | n/a | 0.208 | 11.075 | n/a | n/a | 0.028 | 4.141 | 0.178 | 0.028 |
| p99 | 97.110 | 4.206 | 0.000 | 2.014 | 8.957 | n/a | 0.516 | 5.009 | 5.980 | 29.812 | 0.080 | n/a | 4.062 | 79.778 | n/a | n/a | 0.086 | 11.201 | 0.445 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000000151 | 97.110 | 3.739 | 0.239 | 0.000 | 0.058 | 3.301 | 9.560 | 0.035 | n/a | 0.373 | 79.778 | n/a | n/a | 0.026 | 4.036 | 0.042 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 229c246d02f877b300000000000001a9 | 88.730 | 4.157 | 0.148 | 0.287 | 0.052 | 1.391 | 7.675 | 0.047 | n/a | 0.110 | 74.838 | n/a | n/a | 0.024 | 4.644 | 0.052 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 229c246d02f877b3000000000000019f | 83.056 | 4.374 | 0.133 | 0.247 | 0.050 | 1.479 | 10.685 | 0.044 | n/a | 0.425 | 65.596 | n/a | n/a | 0.023 | 4.804 | 0.058 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 229c246d02f877b300000000000001eb | 68.303 | 3.412 | 0.153 | 0.000 | 0.084 | 3.411 | 9.974 | 0.032 | n/a | 0.073 | 51.128 | n/a | n/a | 0.036 | 3.650 | 0.053 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.117ms |
| 229c246d02f877b30000000000000142 | 64.531 | 2.423 | n/a | 0.000 | 0.069 | 0.643 | 1.256 | 0.018 | n/a | 0.102 | 59.989 | n/a | n/a | 0.031 | 2.492 | 0.039 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000165 | 55.547 | 5.163 | 0.215 | 0.385 | 0.063 | 1.539 | 29.812 | 0.065 | n/a | 0.156 | 18.125 | n/a | n/a | 0.022 | 5.827 | 0.105 | 0.022 | gw-w/thread-47/commit.prepare-and-validate | driver.reader-basis.broadcast 0.060ms |
| 229c246d02f877b300000000000001c5 | 49.995 | 4.719 | n/a | 0.000 | 0.058 | 0.716 | 23.565 | 0.055 | n/a | 0.102 | 20.752 | n/a | n/a | 0.028 | 4.777 | 0.096 | 0.028 | gw-w/thread-47/commit.prepare-and-validate | driver.reader-basis.broadcast 0.069ms |
| 229c246d02f877b30000000000000143 | 43.057 | 4.636 | 0.163 | 0.000 | 0.072 | 1.457 | 10.783 | 0.028 | n/a | 0.113 | 25.778 | n/a | n/a | 0.027 | 4.870 | 0.113 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms; driver.reader-basis.broadcast 0.053ms; driver.publication.persist-deferred 0.017ms |
| 229c246d02f877b30000000000000147 | 41.579 | 3.912 | 0.176 | 0.000 | 0.066 | 1.487 | 9.654 | 0.037 | n/a | 0.147 | 26.075 | n/a | n/a | 0.025 | 4.154 | 0.100 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms |
| 229c246d02f877b30000000000000159 | 40.112 | 3.655 | 0.228 | 0.000 | 0.060 | 3.242 | 10.264 | 0.045 | n/a | 0.105 | 22.483 | n/a | n/a | 0.030 | 3.943 | 0.098 | 0.030 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 229c246d02f877b3000000000000014d | 39.509 | 5.192 | 0.140 | 0.374 | 0.066 | 1.812 | 9.985 | 0.053 | n/a | 0.143 | 21.716 | n/a | n/a | 0.027 | 5.772 | 0.146 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 229c246d02f877b3000000000000013d | 37.862 | 4.366 | 0.218 | 0.371 | 0.101 | 3.067 | 13.226 | 0.053 | n/a | 0.353 | 16.069 | n/a | n/a | 0.038 | 5.055 | 0.134 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 229c246d02f877b30000000000000149 | 36.506 | 5.241 | 5.890 | 0.000 | 0.070 | 1.295 | 2.462 | 0.028 | n/a | 0.354 | 21.136 | n/a | n/a | 0.031 | 11.201 | 0.307 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 229c246d02f877b300000000000001cf | 35.634 | 7.270 | 0.244 | 0.000 | 0.071 | 4.752 | 6.797 | 0.027 | n/a | 0.095 | 16.349 | n/a | n/a | 0.028 | 7.586 | 0.213 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001cb | 34.512 | 5.553 | 0.257 | 0.313 | 0.055 | 1.439 | 10.536 | 0.028 | n/a | 0.302 | 16.000 | n/a | n/a | 0.028 | 6.178 | 0.179 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001c7 | 33.625 | 6.074 | 0.170 | 0.000 | 0.053 | 1.335 | 5.879 | 0.026 | n/a | 0.459 | 19.602 | n/a | n/a | 0.027 | 6.298 | 0.187 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000155 | 33.539 | 3.581 | 0.147 | 0.392 | 0.070 | 1.869 | 12.610 | 0.062 | n/a | 0.201 | 14.583 | n/a | n/a | 0.024 | 4.190 | 0.125 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.213ms |
| 229c246d02f877b300000000000001b1 | 33.113 | 4.432 | 0.133 | 0.377 | 0.057 | 4.680 | 6.362 | 0.032 | n/a | 0.600 | 16.413 | n/a | n/a | 0.027 | 4.999 | 0.151 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001af | 32.022 | 3.432 | 0.134 | 0.208 | 0.059 | 5.980 | 7.796 | 0.046 | n/a | 0.099 | 14.244 | n/a | n/a | 0.024 | 3.833 | 0.120 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000013b | 31.833 | 5.404 | 0.143 | 0.000 | 0.064 | 1.898 | 8.731 | 0.038 | n/a | 0.400 | 15.128 | n/a | n/a | 0.025 | 5.612 | 0.176 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.760 | 0.210 | 0.000 | 0.456 | 2.287 | n/a | 0.000 | 0.063 | 0.830 | 1.169 | 0.022 | n/a | 0.163 | 8.517 | n/a | n/a | 0.031 | 2.360 | 0.172 | 0.031 |
| p99 | 64.531 | 1.002 | 0.000 | 0.775 | 7.072 | n/a | 0.000 | 5.009 | 4.071 | 6.774 | 0.055 | n/a | 1.704 | 59.989 | n/a | n/a | 0.067 | 7.138 | 0.443 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000000142 | 64.531 | 2.423 | n/a | 0.000 | 0.069 | 0.643 | 1.256 | 0.018 | n/a | 0.102 | 59.989 | n/a | n/a | 0.031 | 2.492 | 0.039 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000019b | 22.765 | 2.425 | n/a | 0.000 | 0.063 | 1.800 | 1.088 | 0.019 | n/a | 0.320 | 17.026 | n/a | n/a | 0.025 | 2.488 | 0.109 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000146 | 21.522 | 7.072 | n/a | 0.000 | 0.066 | 4.071 | 6.774 | 0.055 | n/a | 0.362 | 3.091 | n/a | n/a | 0.031 | 7.138 | 0.332 | 0.031 | node-15/thread-0/driver.execute | none observed |
| 229c246d02f877b300000000000001db | 19.377 | 1.644 | n/a | 0.000 | 0.057 | 0.893 | 1.432 | 0.038 | n/a | 1.704 | 13.585 | n/a | n/a | 0.025 | 1.701 | 0.088 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001e1 | 17.138 | 2.752 | n/a | 0.000 | 0.109 | 0.827 | 1.022 | 0.019 | n/a | 0.079 | 12.279 | n/a | n/a | 0.051 | 2.861 | 0.167 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000018d | 16.756 | 4.040 | n/a | 0.000 | 0.165 | 1.024 | 1.317 | 0.025 | n/a | 0.151 | 9.966 | n/a | n/a | 0.067 | 4.205 | 0.251 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000156 | 16.203 | 2.217 | n/a | 0.000 | 0.068 | 1.182 | 1.280 | 0.022 | n/a | 0.328 | 11.075 | n/a | n/a | 0.031 | 2.285 | 0.141 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000170 | 15.861 | 2.383 | n/a | 0.000 | 0.094 | 0.669 | 0.816 | 0.016 | n/a | 0.058 | 11.787 | n/a | n/a | 0.039 | 2.476 | 0.156 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001d6 | 15.503 | 2.274 | n/a | 0.000 | 0.059 | 0.861 | 1.131 | 0.022 | n/a | 0.484 | 10.643 | n/a | n/a | 0.029 | 2.333 | 0.151 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000186 | 15.121 | 1.687 | n/a | 0.000 | 5.009 | 0.609 | 0.869 | 0.017 | n/a | 0.933 | 5.977 | n/a | n/a | 0.021 | 6.696 | 0.443 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.389ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.021ms |
| 229c246d02f877b300000000000001a1 | 14.782 | 3.380 | n/a | 0.000 | 0.056 | 1.276 | 2.030 | 0.053 | n/a | 0.163 | 7.791 | n/a | n/a | 0.033 | 3.436 | 0.232 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |
| 229c246d02f877b3000000000000016b | 14.760 | 2.252 | n/a | 0.000 | 0.058 | 1.467 | 1.970 | 0.041 | n/a | 0.426 | 8.517 | n/a | n/a | 0.029 | 2.310 | 0.157 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001dd | 13.490 | 3.061 | n/a | 0.000 | 0.113 | 0.830 | 1.040 | 0.020 | n/a | 0.435 | 7.927 | n/a | n/a | 0.064 | 3.174 | 0.235 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001a3 | 13.445 | 2.906 | n/a | 0.000 | 0.048 | 0.799 | 1.024 | 0.019 | n/a | 0.092 | 8.535 | n/a | n/a | 0.022 | 2.953 | 0.220 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001e9 | 13.210 | 1.930 | n/a | 0.000 | 0.049 | 0.647 | 1.711 | 0.024 | n/a | 0.125 | 8.695 | n/a | n/a | 0.031 | 1.978 | 0.150 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001d4 | 13.183 | 1.868 | n/a | 0.000 | 0.069 | 0.813 | 1.149 | 0.022 | n/a | 0.102 | 9.130 | n/a | n/a | 0.031 | 1.936 | 0.147 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000191 | 12.692 | 2.287 | n/a | 0.000 | 0.063 | 0.956 | 1.258 | 0.023 | n/a | 0.208 | 7.859 | n/a | n/a | 0.038 | 2.350 | 0.185 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001bf | 12.507 | 2.122 | n/a | 0.000 | 0.067 | 0.725 | 1.194 | 0.026 | n/a | 0.528 | 7.816 | n/a | n/a | 0.029 | 2.189 | 0.175 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000161 | 12.210 | 2.770 | n/a | 0.000 | 0.063 | 0.893 | 0.968 | 0.019 | n/a | 0.093 | 7.375 | n/a | n/a | 0.029 | 2.833 | 0.232 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000017d | 10.361 | 2.295 | n/a | 0.000 | 0.065 | 0.861 | 1.784 | 0.023 | n/a | 0.138 | 5.159 | n/a | n/a | 0.035 | 2.360 | 0.228 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.834 | 0.170 | 0.000 | 0.513 | 3.589 | n/a | 0.000 | 0.055 | 1.052 | 3.717 | 0.027 | n/a | 0.386 | 9.687 | n/a | n/a | 0.028 | 4.010 | 0.211 | 0.028 |
| p99 | 78.237 | 2.397 | 0.000 | 1.534 | 15.278 | n/a | 5.186 | 1.613 | 7.169 | 17.512 | 0.083 | n/a | 3.043 | 59.874 | n/a | n/a | 0.066 | 15.384 | 0.520 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b300000000000001fe | 90.504 | 15.278 | n/a | 0.000 | 0.105 | 2.531 | 11.776 | 0.063 | n/a | 0.197 | 60.508 | n/a | n/a | 0.046 | 15.384 | 0.170 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| 229c246d02f877b30000000000000285 | 78.237 | 7.198 | 0.291 | 0.349 | 0.091 | 1.380 | 8.521 | 0.033 | n/a | 0.461 | 59.874 | n/a | n/a | 0.042 | 7.927 | 0.101 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.076ms |
| 229c246d02f877b3000000000000022e | 71.939 | 3.445 | 0.152 | 0.266 | 0.051 | 1.846 | 9.908 | 0.025 | n/a | 0.943 | 55.282 | n/a | n/a | 0.021 | 3.914 | 0.054 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.118ms |
| 229c246d02f877b3000000000000023f | 46.570 | 4.743 | 0.599 | 4.502 | 0.053 | 1.853 | 14.099 | 0.082 | n/a | 0.135 | 20.482 | n/a | n/a | 0.022 | 9.897 | 0.213 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000224 | 44.626 | 5.827 | 0.163 | 3.868 | 0.053 | 5.658 | 17.512 | 0.035 | n/a | 2.032 | 9.457 | n/a | n/a | 0.021 | 9.911 | 0.222 | 0.021 | gw-w/thread-46/gateway.admitted-work | none observed |
| 229c246d02f877b30000000000000276 | 42.221 | 5.521 | n/a | 0.000 | 0.040 | 2.939 | 30.654 | 0.059 | n/a | 0.296 | 2.689 | n/a | n/a | 0.023 | 5.560 | 0.132 | 0.023 | gw-w/thread-42/gateway.admitted-work | none observed |
| 229c246d02f877b30000000000000295 | 41.372 | 5.974 | 0.159 | 0.302 | 0.103 | 1.169 | 14.008 | 0.041 | n/a | 3.043 | 16.525 | n/a | n/a | 0.048 | 6.537 | 0.158 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000002b1 | 40.220 | 4.998 | 0.575 | 0.274 | 0.054 | 18.270 | 6.542 | 0.026 | n/a | 0.140 | 9.316 | n/a | n/a | 0.023 | 5.902 | 0.147 | 0.023 | node-15/thread-9/socket.wait-first-byte | none observed |
| 229c246d02f877b30000000000000210 | 37.961 | 4.978 | 2.975 | 0.000 | 0.053 | 7.169 | 6.612 | 0.036 | n/a | 0.513 | 15.595 | n/a | n/a | 0.030 | 8.006 | 0.211 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000002a7 | 36.254 | 6.174 | 0.182 | 1.287 | 0.052 | 2.652 | 9.219 | 0.036 | n/a | 0.400 | 16.224 | n/a | n/a | 0.028 | 7.695 | 0.212 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000252 | 36.083 | 5.748 | 0.227 | 0.237 | 0.051 | 1.254 | 7.272 | 0.038 | n/a | 0.119 | 21.111 | n/a | n/a | 0.027 | 6.263 | 0.174 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000024c | 36.083 | 6.234 | 0.215 | 0.208 | 0.045 | 1.321 | 12.713 | 0.028 | n/a | 0.097 | 15.199 | n/a | n/a | 0.023 | 6.701 | 0.186 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000226 | 35.713 | 10.029 | 0.162 | 0.284 | 0.097 | 3.419 | 10.629 | 0.083 | n/a | 0.187 | 10.785 | n/a | n/a | 0.039 | 10.573 | 0.296 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000206 | 35.654 | 5.087 | 2.128 | 0.000 | 0.050 | 1.312 | 11.144 | 0.042 | n/a | 0.441 | 15.428 | n/a | n/a | 0.021 | 7.266 | 0.204 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000239 | 34.920 | 5.609 | 0.173 | 0.250 | 0.039 | 3.675 | 9.964 | 0.062 | n/a | 0.171 | 14.932 | n/a | n/a | 0.045 | 6.071 | 0.174 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000208 | 34.024 | 6.313 | 2.593 | 0.000 | 0.089 | 1.905 | 8.003 | 0.030 | n/a | 0.455 | 14.596 | n/a | n/a | 0.040 | 8.995 | 0.264 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001fb | 33.878 | 7.052 | 0.139 | 5.186 | 0.052 | 1.715 | 10.204 | 0.043 | n/a | 0.141 | 9.321 | n/a | n/a | 0.026 | 12.428 | 0.367 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000247 | 33.396 | 4.675 | 0.159 | 2.988 | 0.053 | 3.256 | 7.412 | 0.028 | n/a | 0.107 | 14.692 | n/a | n/a | 0.024 | 7.876 | 0.236 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000267 | 32.862 | 7.715 | n/a | 0.000 | 0.069 | 0.981 | 6.638 | 0.034 | n/a | 0.731 | 16.660 | n/a | n/a | 0.033 | 7.784 | 0.237 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000250 | 32.809 | 8.502 | 0.251 | 0.244 | 0.049 | 1.847 | 8.811 | 0.029 | n/a | 0.340 | 12.700 | n/a | n/a | 0.035 | 9.047 | 0.276 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.652 | 0.000 | 0.000 | 0.510 | 2.372 | n/a | 0.000 | 0.056 | 0.767 | 1.576 | 0.022 | n/a | 0.376 | 7.007 | n/a | n/a | 0.028 | 2.812 | 0.205 | 0.028 |
| p99 | 42.221 | 2.397 | 0.000 | 1.038 | 5.553 | n/a | 0.000 | 1.613 | 2.939 | 30.654 | 0.282 | n/a | 3.461 | 25.210 | n/a | n/a | 0.074 | 6.074 | 0.385 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000000276 | 42.221 | 5.521 | n/a | 0.000 | 0.040 | 2.939 | 30.654 | 0.059 | n/a | 0.296 | 2.689 | n/a | n/a | 0.023 | 5.560 | 0.132 | 0.023 | gw-w/thread-42/gateway.admitted-work | none observed |
| 229c246d02f877b300000000000002a0 | 31.186 | 2.208 | n/a | 0.000 | 0.056 | 0.635 | 2.657 | 0.019 | n/a | 0.364 | 25.210 | n/a | n/a | 0.037 | 2.264 | 0.073 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.075ms |
| 229c246d02f877b30000000000000203 | 23.444 | 5.028 | n/a | 0.000 | 1.046 | 0.774 | 1.357 | 0.020 | n/a | 0.386 | 14.771 | n/a | n/a | 0.062 | 6.074 | 0.259 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.108ms |
| 229c246d02f877b3000000000000023a | 21.461 | 2.116 | n/a | 0.000 | 0.055 | 1.110 | 2.093 | 0.043 | n/a | 1.075 | 14.942 | n/a | n/a | 0.028 | 2.171 | 0.101 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000020d | 20.409 | 1.845 | n/a | 0.000 | 0.042 | 0.660 | 1.042 | 0.020 | n/a | 0.388 | 16.392 | n/a | n/a | 0.022 | 1.886 | 0.092 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000257 | 20.164 | 1.926 | n/a | 0.000 | 0.028 | 0.529 | 1.576 | 0.031 | n/a | 3.461 | 12.595 | n/a | n/a | 0.018 | 1.954 | 0.097 | 0.018 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.055ms; driver.publication.readback 0.054ms |
| 229c246d02f877b300000000000001f7 | 19.980 | 4.079 | n/a | 0.000 | 0.140 | 0.967 | 2.558 | 0.022 | n/a | 0.176 | 11.971 | n/a | n/a | 0.066 | 4.219 | 0.211 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000022f | 18.189 | 5.553 | n/a | 0.000 | 0.029 | 2.653 | 7.121 | 0.035 | n/a | 0.521 | 2.259 | n/a | n/a | 0.018 | 5.582 | 0.307 | 0.018 | node-15/thread-0/driver.execute | none observed |
| 229c246d02f877b30000000000000283 | 18.107 | 5.364 | n/a | 0.000 | 0.112 | 1.895 | 2.852 | 0.030 | n/a | 0.802 | 7.007 | n/a | n/a | 0.046 | 5.476 | 0.302 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000293 | 17.555 | 2.164 | n/a | 0.000 | 0.057 | 0.652 | 1.092 | 0.019 | n/a | 0.079 | 13.464 | n/a | n/a | 0.028 | 2.221 | 0.127 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000021f | 17.476 | 2.091 | n/a | 0.000 | 0.056 | 0.694 | 2.688 | 0.023 | n/a | 1.080 | 10.816 | n/a | n/a | 0.028 | 2.146 | 0.123 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000212 | 17.226 | 3.502 | n/a | 0.000 | 0.053 | 0.891 | 1.019 | 0.025 | n/a | 0.480 | 11.227 | n/a | n/a | 0.029 | 3.555 | 0.206 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000232 | 16.510 | 3.278 | n/a | 0.000 | 0.111 | 0.881 | 4.654 | 0.020 | n/a | 0.092 | 7.412 | n/a | n/a | 0.062 | 3.388 | 0.205 | 0.062 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001f0 | 16.217 | 2.694 | n/a | 0.000 | 0.072 | 0.990 | 1.610 | 0.037 | n/a | 0.560 | 10.223 | n/a | n/a | 0.031 | 2.766 | 0.171 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000215 | 15.593 | 2.815 | n/a | 0.000 | 0.065 | 0.939 | 1.491 | 0.022 | n/a | 0.157 | 10.075 | n/a | n/a | 0.028 | 2.880 | 0.185 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000024d | 15.281 | 2.771 | n/a | 0.000 | 0.041 | 0.763 | 4.519 | 0.020 | n/a | 0.074 | 7.068 | n/a | n/a | 0.025 | 2.812 | 0.184 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000027b | 15.217 | 3.020 | n/a | 0.000 | 0.063 | 0.521 | 1.418 | 0.018 | n/a | 0.162 | 9.985 | n/a | n/a | 0.029 | 3.083 | 0.203 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000002af | 14.652 | 2.044 | n/a | 0.000 | 0.051 | 0.694 | 4.784 | 0.021 | n/a | 0.099 | 6.901 | n/a | n/a | 0.057 | 2.095 | 0.143 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000000237 | 14.188 | 1.975 | n/a | 0.000 | 0.039 | 0.801 | 1.625 | 0.042 | n/a | 0.755 | 8.929 | n/a | n/a | 0.021 | 2.015 | 0.142 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000001f2 | 13.662 | 1.882 | n/a | 0.000 | 0.063 | 1.248 | 1.243 | 0.023 | n/a | 0.133 | 9.033 | n/a | n/a | 0.036 | 1.945 | 0.142 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1702 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.253 | 0.454 | 0.000 | 0.546 | 2.371 | n/a | 0.000 | 0.046 | 0.643 | 1.028 | 0.014 | n/a | 0.111 | 6.014 | n/a | n/a | 0.019 | 2.746 | 0.239 | 0.019 |
| p99 | 47.603 | 2.658 | 0.057 | 2.234 | 7.928 | n/a | 0.258 | 15.141 | 8.208 | 8.249 | 0.052 | n/a | 3.030 | 36.016 | n/a | n/a | 0.060 | 17.528 | 0.597 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b3000000000000039b | 63.228 | 3.286 | n/a | 0.000 | 1.753 | 0.453 | 1.257 | 0.028 | n/a | 0.902 | 55.537 | n/a | n/a | 0.011 | 5.039 | 0.080 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.021ms |
| 229c246d02f877b300000000000004aa | 62.217 | 2.688 | n/a | 0.000 | 0.021 | 9.578 | 5.750 | 0.018 | n/a | 1.825 | 42.325 | n/a | n/a | 0.011 | 2.709 | 0.044 | 0.011 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.181ms; driver.publication.readback 0.131ms; driver.publication.readback 0.116ms; driver.publication.readback 0.115ms; driver.publication.readback 0.107ms |
| 229c246d02f877b3000000000000041d | 57.179 | 2.095 | n/a | 0.000 | 38.881 | 0.638 | 4.284 | 0.031 | n/a | 0.078 | 11.144 | n/a | n/a | 0.030 | 40.975 | 0.717 | 0.030 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.156ms; driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.097ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.078ms |
| 229c246d02f877b300000000000004b3 | 57.082 | 2.542 | n/a | 0.000 | 6.520 | 0.797 | 2.248 | 0.022 | n/a | 0.125 | 44.812 | n/a | n/a | 0.015 | 9.063 | 0.159 | 0.015 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.191ms; driver.publication.readback 0.219ms; driver.publication.readback 0.181ms; driver.publication.readback 0.131ms; driver.publication.readback 0.116ms |
| 229c246d02f877b300000000000004a7 | 55.201 | 2.459 | n/a | 0.000 | 0.948 | 6.378 | 1.271 | 0.009 | n/a | 1.061 | 43.069 | n/a | n/a | 0.007 | 3.407 | 0.062 | 0.007 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.219ms; driver.publication.readback 0.131ms; driver.publication.readback 0.115ms; driver.publication.readback 0.065ms; driver.publication.readback 0.060ms |
| 229c246d02f877b300000000000002e3 | 55.013 | 7.463 | 0.330 | 0.561 | 0.107 | 4.941 | 5.391 | 0.026 | n/a | 0.107 | 36.016 | n/a | n/a | 0.071 | 8.461 | 0.154 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000002c1 | 54.653 | 9.400 | 0.136 | 0.304 | 0.043 | 4.787 | 27.808 | 0.027 | n/a | 0.349 | 11.776 | n/a | n/a | 0.022 | 9.883 | 0.181 | 0.022 | gw-w/thread-44/gateway.admitted-work | none observed |
| 229c246d02f877b30000000000000419 | 53.772 | 3.785 | n/a | 0.000 | 24.390 | 7.252 | 1.091 | 0.020 | n/a | 1.123 | 16.093 | n/a | n/a | 0.018 | 28.176 | 0.524 | 0.018 | node-15/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.097ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.029ms |
| 229c246d02f877b300000000000004a0 | 52.876 | 2.856 | n/a | 0.000 | 0.031 | 0.414 | 1.460 | 0.014 | n/a | 1.325 | 46.755 | n/a | n/a | 0.021 | 2.888 | 0.055 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.219ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.015ms |
| 229c246d02f877b300000000000004b7 | 52.729 | 7.571 | n/a | 0.000 | 33.985 | 0.822 | 1.100 | 0.024 | n/a | 1.150 | 8.016 | n/a | n/a | 0.062 | 41.555 | 0.788 | 0.062 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.191ms; driver.publication.readback 0.219ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.181ms; driver.publication.readback 0.131ms |
| 229c246d02f877b30000000000000322 | 51.731 | 4.114 | n/a | 0.000 | 0.044 | 4.820 | 1.429 | 0.041 | n/a | 0.111 | 41.148 | n/a | n/a | 0.025 | 4.158 | 0.080 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.144ms; driver.reader-basis.broadcast 0.073ms; driver.publication.readback 0.065ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.050ms |
| 229c246d02f877b30000000000000378 | 49.224 | 2.253 | n/a | 0.000 | 17.221 | 2.932 | 1.089 | 0.018 | n/a | 0.082 | 25.617 | n/a | n/a | 0.012 | 19.475 | 0.396 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.118ms; driver.publication.persist-deferred 0.114ms; driver.publication.readback 0.114ms; driver.publication.readback 0.069ms; driver.publication.readback 0.066ms |
| 229c246d02f877b3000000000000041e | 48.932 | 2.443 | n/a | 0.000 | 20.150 | 4.355 | 0.797 | 0.018 | n/a | 0.078 | 21.056 | n/a | n/a | 0.034 | 22.593 | 0.462 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.156ms; driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.097ms; driver.publication.persist-deferred 0.078ms; driver.publication.readback 0.058ms |
| 229c246d02f877b300000000000004a2 | 48.900 | 1.107 | n/a | 0.000 | 0.144 | 2.105 | 0.774 | 0.003 | n/a | 0.118 | 44.642 | n/a | n/a | 0.007 | 1.251 | 0.026 | 0.007 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.219ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.015ms |
| 229c246d02f877b3000000000000041c | 48.207 | 7.928 | n/a | 0.000 | 15.877 | 3.240 | 1.197 | 0.009 | n/a | 0.045 | 19.905 | n/a | n/a | 0.005 | 23.805 | 0.494 | 0.005 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.097ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.035ms |
| 229c246d02f877b300000000000004b5 | 47.892 | 2.000 | n/a | 0.000 | 0.031 | 0.568 | 0.925 | 0.012 | n/a | 0.058 | 44.282 | n/a | n/a | 0.016 | 2.031 | 0.042 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.191ms; driver.publication.readback 0.219ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.181ms; driver.publication.readback 0.131ms |
| 229c246d02f877b3000000000000041a | 47.887 | 4.031 | n/a | 0.000 | 24.384 | 10.205 | 0.734 | 0.006 | n/a | 0.014 | 8.506 | n/a | n/a | 0.007 | 28.415 | 0.593 | 0.007 | node-15/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.097ms; driver.publication.persist-deferred 0.035ms |
| 229c246d02f877b300000000000004b1 | 47.603 | 5.835 | n/a | 0.000 | 0.049 | 1.446 | 1.546 | 0.018 | n/a | 0.067 | 38.615 | n/a | n/a | 0.026 | 5.884 | 0.124 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.181ms; driver.publication.readback 0.116ms; driver.publication.readback 0.115ms; driver.publication.readback 0.107ms; driver.publication.readback 0.063ms |
| 229c246d02f877b3000000000000040f | 47.371 | 3.417 | n/a | 0.000 | 0.158 | 2.810 | 1.327 | 0.018 | n/a | 0.377 | 39.243 | n/a | n/a | 0.021 | 3.575 | 0.075 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.155ms; driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.006ms |
| 229c246d02f877b30000000000000837 | 46.301 | 4.380 | n/a | 0.000 | 28.604 | 0.543 | 1.200 | 0.015 | n/a | 0.105 | 11.439 | n/a | n/a | 0.016 | 32.984 | 0.712 | 0.016 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.202ms; driver.publication.readback 0.110ms; driver.publication.readback 0.076ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.048ms |

## P2 / L16 / commit / 5-10 facts (990 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.380 | 0.000 | 0.000 | 0.428 | 1.920 | n/a | 0.000 | 0.044 | 0.630 | 0.881 | 0.013 | n/a | 0.113 | 5.417 | n/a | n/a | 0.019 | 2.138 | 0.218 | 0.019 |
| p99 | 41.510 | 1.998 | 0.034 | 1.201 | 5.242 | n/a | 0.000 | 15.987 | 6.737 | 5.179 | 0.055 | n/a | 3.038 | 35.356 | n/a | n/a | 0.059 | 17.539 | 0.655 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b3000000000000041d | 57.179 | 2.095 | n/a | 0.000 | 38.881 | 0.638 | 4.284 | 0.031 | n/a | 0.078 | 11.144 | n/a | n/a | 0.030 | 40.975 | 0.717 | 0.030 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.156ms; driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.097ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.078ms |
| 229c246d02f877b300000000000004b3 | 57.082 | 2.542 | n/a | 0.000 | 6.520 | 0.797 | 2.248 | 0.022 | n/a | 0.125 | 44.812 | n/a | n/a | 0.015 | 9.063 | 0.159 | 0.015 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.191ms; driver.publication.readback 0.219ms; driver.publication.readback 0.181ms; driver.publication.readback 0.131ms; driver.publication.readback 0.116ms |
| 229c246d02f877b3000000000000041e | 48.932 | 2.443 | n/a | 0.000 | 20.150 | 4.355 | 0.797 | 0.018 | n/a | 0.078 | 21.056 | n/a | n/a | 0.034 | 22.593 | 0.462 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.156ms; driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.097ms; driver.publication.persist-deferred 0.078ms; driver.publication.readback 0.058ms |
| 229c246d02f877b300000000000004a2 | 48.900 | 1.107 | n/a | 0.000 | 0.144 | 2.105 | 0.774 | 0.003 | n/a | 0.118 | 44.642 | n/a | n/a | 0.007 | 1.251 | 0.026 | 0.007 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.219ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.015ms |
| 229c246d02f877b300000000000004b5 | 47.892 | 2.000 | n/a | 0.000 | 0.031 | 0.568 | 0.925 | 0.012 | n/a | 0.058 | 44.282 | n/a | n/a | 0.016 | 2.031 | 0.042 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.191ms; driver.publication.readback 0.219ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.181ms; driver.publication.readback 0.131ms |
| 229c246d02f877b3000000000000039c | 45.888 | 1.717 | n/a | 0.000 | 0.046 | 0.591 | 0.923 | 0.018 | n/a | 0.251 | 42.320 | n/a | n/a | 0.022 | 1.763 | 0.038 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.021ms |
| 229c246d02f877b300000000000004a5 | 45.378 | 2.325 | n/a | 0.000 | 2.137 | 1.349 | 2.861 | 0.005 | n/a | 0.021 | 36.674 | n/a | n/a | 0.006 | 4.462 | 0.098 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.219ms; driver.publication.readback 0.131ms; driver.publication.readback 0.065ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.017ms |
| 229c246d02f877b300000000000004a6 | 45.212 | 1.403 | n/a | 0.000 | 0.822 | 3.317 | 0.658 | 0.018 | n/a | 0.026 | 38.958 | n/a | n/a | 0.010 | 2.224 | 0.049 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.219ms; driver.publication.readback 0.131ms; driver.publication.readback 0.065ms; driver.publication.readback 0.060ms; driver.publication.readback 0.046ms |
| 229c246d02f877b30000000000000363 | 44.478 | 2.261 | n/a | 0.000 | 0.029 | 2.089 | 0.587 | 0.011 | n/a | 0.222 | 39.265 | n/a | n/a | 0.013 | 2.290 | 0.051 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.079ms; driver.publication.readback 0.052ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.027ms; driver.publication.persist-deferred 0.018ms |
| 229c246d02f877b3000000000000039a | 41.510 | 2.679 | n/a | 0.000 | 0.088 | 0.737 | 2.555 | 0.008 | n/a | 0.045 | 35.356 | n/a | n/a | 0.041 | 2.768 | 0.067 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000004a4 | 41.290 | 2.238 | n/a | 0.000 | 2.695 | 1.101 | 1.143 | 0.018 | n/a | 0.549 | 33.483 | n/a | n/a | 0.063 | 4.933 | 0.119 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.219ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.013ms |
| 229c246d02f877b30000000000000529 | 40.718 | 1.447 | n/a | 0.000 | 0.023 | 0.630 | 1.241 | 0.017 | n/a | 0.080 | 37.269 | n/a | n/a | 0.012 | 1.470 | 0.036 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.150ms; driver.reader-basis.broadcast 0.117ms; driver.publication.persist-deferred 0.013ms |
| 229c246d02f877b30000000000000834 | 39.195 | 1.933 | n/a | 0.000 | 26.422 | 2.820 | 1.632 | 0.013 | n/a | 0.106 | 6.255 | n/a | n/a | 0.015 | 28.355 | 0.723 | 0.015 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.110ms; driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.048ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.016ms |
| 229c246d02f877b3000000000000040d | 38.998 | 1.904 | n/a | 0.000 | 0.156 | 4.019 | 1.648 | 0.038 | n/a | 0.624 | 30.589 | n/a | n/a | 0.020 | 2.060 | 0.053 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.113ms |
| 229c246d02f877b30000000000000f0b | 38.852 | 2.106 | n/a | 0.000 | 0.022 | 0.449 | 0.664 | 0.009 | n/a | 0.058 | 35.531 | n/a | n/a | 0.013 | 2.128 | 0.055 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.221ms; driver.publication.readback 0.058ms |
| 229c246d02f877b3000000000000040e | 37.545 | 2.098 | n/a | 0.000 | 0.024 | 3.658 | 0.773 | 0.016 | n/a | 0.071 | 30.893 | n/a | n/a | 0.011 | 2.122 | 0.057 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.113ms |
| 229c246d02f877b3000000000000037f | 37.287 | 3.612 | n/a | 0.000 | 27.396 | 0.705 | 0.823 | 0.018 | n/a | 0.691 | 4.028 | n/a | n/a | 0.014 | 31.008 | 0.832 | 0.014 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.098ms; driver.publication.readback 0.095ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.049ms; driver.publication.readback 0.048ms |
| 229c246d02f877b3000000000000041b | 37.223 | 4.599 | n/a | 0.000 | 22.416 | 3.856 | 0.623 | 0.008 | n/a | 0.026 | 5.689 | n/a | n/a | 0.007 | 27.015 | 0.726 | 0.007 | node-15/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.097ms |
| 229c246d02f877b300000000000004a8 | 36.083 | 2.102 | n/a | 0.000 | 0.061 | 5.221 | 0.982 | 0.039 | n/a | 0.103 | 27.555 | n/a | n/a | 0.021 | 2.162 | 0.060 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.131ms; driver.publication.readback 0.115ms; driver.publication.readback 0.065ms; driver.publication.readback 0.060ms; driver.publication.readback 0.046ms |
| 229c246d02f877b30000000000000468 | 35.790 | 1.697 | n/a | 0.000 | 4.177 | 15.058 | 1.414 | 0.013 | n/a | 0.060 | 13.363 | n/a | n/a | 0.009 | 5.874 | 0.164 | 0.009 | node-15/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.268ms; driver.publication.persist-deferred 0.048ms |

## P2/P4 / read-your-own-write / read (403 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 106.434 | n/a | n/a | n/a | 40.876 | 35.820 | 2.928 | 0.000 | 0.227 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.351 | 81.534 | 0.924 | 5.351 |
| p99 | 752.114 | n/a | n/a | n/a | 129.985 | 602.183 | 25.183 | 0.000 | 77.212 | 10.020 | 67.123 | n/a | 0.004 | 0.000 | n/a | n/a | 185.023 | 651.122 | 1.000 | 185.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000001897 | 805.948 | 55.382 | 708.780 | 6.264 | 0.000 | 0.359 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.163 | 770.427 | 0.956 | 35.163 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 1.944ms; driver.expected-state.bind-receipt 1.907ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms |
| 229c246d02f877b30000000000001875 | 786.110 | 61.658 | 602.238 | 13.418 | 0.000 | 0.298 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 108.498 | 677.314 | 0.862 | 108.498 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 2.124ms; driver.expected-state.bind-receipt 1.944ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms |
| 229c246d02f877b30000000000001865 | 763.415 | 124.548 | 510.760 | 12.542 | 0.000 | 0.404 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 115.160 | 647.850 | 0.849 | 115.160 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 2.124ms; driver.expected-state.bind-receipt 1.944ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms |
| 229c246d02f877b30000000000001885 | 757.528 | 54.783 | 517.550 | 5.625 | 0.000 | 0.200 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 179.369 | 577.959 | 0.763 | 179.369 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 2.124ms; driver.expected-state.bind-receipt 1.944ms; driver.expected-state.bind-receipt 1.907ms; driver.reader-basis.broadcast 1.483ms |
| 229c246d02f877b3000000000000188f | 752.114 | 76.797 | 562.502 | 11.823 | 0.000 | 0.504 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 100.487 | 651.122 | 0.866 | 100.487 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 1.944ms; driver.expected-state.bind-receipt 1.907ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms |
| 229c246d02f877b30000000000001895 | 749.368 | 33.537 | 628.738 | 0.000 | 0.000 | 0.215 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.878 | 662.275 | 0.884 | 86.878 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 1.944ms; driver.expected-state.bind-receipt 1.907ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms |
| 229c246d02f877b300000000000018ac | 739.928 | 69.231 | 636.303 | 4.223 | 0.000 | 4.442 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.729 | 709.757 | 0.959 | 25.729 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 1.944ms; driver.expected-state.bind-receipt 1.907ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms |
| 229c246d02f877b30000000000001873 | 727.864 | 51.987 | 449.002 | 4.188 | 0.000 | 0.256 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 222.430 | 505.177 | 0.694 | 222.430 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 2.124ms; driver.expected-state.bind-receipt 1.944ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms |
| 229c246d02f877b300000000000018a8 | 702.755 | 29.971 | 602.183 | 0.000 | 0.000 | 0.244 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 70.356 | 632.154 | 0.900 | 70.356 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 1.944ms; driver.expected-state.bind-receipt 1.907ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms |
| 229c246d02f877b300000000000018de | 613.639 | 87.222 | 460.085 | 7.538 | 0.000 | 0.275 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 58.519 | 554.845 | 0.904 | 58.519 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.907ms; driver.expected-state.bind-receipt 1.183ms; driver.reader-basis.broadcast 0.428ms; driver.reader-basis.broadcast 0.310ms; driver.reader-basis.broadcast 0.306ms |
| 229c246d02f877b300000000000018d6 | 611.072 | 121.715 | 319.146 | 9.394 | 0.000 | 8.568 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 152.248 | 450.256 | 0.737 | 152.248 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.907ms; driver.expected-state.bind-receipt 1.183ms; driver.reader-basis.broadcast 0.428ms; driver.reader-basis.broadcast 0.310ms; driver.publication.readback 0.297ms |
| 229c246d02f877b30000000000001862 | 593.750 | 59.459 | 416.542 | 8.429 | 0.000 | 0.844 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 108.477 | 484.430 | 0.816 | 108.477 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 2.124ms; driver.expected-state.bind-receipt 1.944ms; driver.expected-state.bind-receipt 1.057ms; driver.expected-state.bind-receipt 1.023ms; driver.expected-state.bind-receipt 1.000ms |
| 229c246d02f877b3000000000000185d | 570.402 | 21.333 | 323.162 | 3.290 | 0.000 | 0.677 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 221.939 | 347.786 | 0.610 | 221.939 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 2.124ms; driver.expected-state.bind-receipt 1.023ms; driver.reader-basis.broadcast 0.511ms; driver.reader-basis.broadcast 0.452ms; driver.reader-basis.broadcast 0.332ms |
| 229c246d02f877b300000000000018d9 | 525.734 | 83.503 | 375.568 | 5.992 | 0.000 | 3.338 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 57.334 | 465.063 | 0.885 | 57.334 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.907ms; driver.expected-state.bind-receipt 1.183ms; driver.reader-basis.broadcast 0.428ms; driver.reader-basis.broadcast 0.310ms; driver.publication.readback 0.297ms |
| 229c246d02f877b30000000000001866 | 493.633 | 17.331 | 329.996 | 0.000 | 0.000 | 0.281 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 146.026 | 347.326 | 0.704 | 146.026 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 2.124ms; driver.expected-state.bind-receipt 1.023ms; driver.reader-basis.broadcast 0.511ms; driver.reader-basis.broadcast 0.452ms; driver.reader-basis.broadcast 0.332ms |
| 229c246d02f877b30000000000001898 | 480.340 | 35.495 | 420.649 | 0.000 | 0.000 | 0.539 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.658 | 456.144 | 0.950 | 23.658 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 1.944ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms; driver.expected-state.bind-receipt 1.103ms |
| 229c246d02f877b300000000000018af | 478.643 | 108.454 | 309.931 | 7.169 | 0.000 | 0.558 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.531 | 425.554 | 0.889 | 52.531 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 1.944ms; driver.expected-state.bind-receipt 1.907ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms |
| 229c246d02f877b30000000000001890 | 469.769 | 42.335 | 260.915 | 0.000 | 0.000 | 0.269 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 166.250 | 303.250 | 0.646 | 166.250 | node-15/thread-0/rpc.gateway-observer.observe | client.encode 4.969ms; driver.expected-state.bind-receipt 1.944ms; driver.reader-basis.broadcast 1.483ms; driver.expected-state.bind-receipt 1.476ms; driver.expected-state.bind-receipt 1.103ms |
| 229c246d02f877b3000000000000185c | 468.171 | 111.294 | 228.547 | 21.229 | 0.000 | 0.479 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 106.623 | 361.069 | 0.771 | 106.623 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 2.124ms; driver.expected-state.bind-receipt 1.023ms; driver.reader-basis.broadcast 0.452ms; driver.reader-basis.broadcast 0.332ms; driver.reader-basis.broadcast 0.323ms |
| 229c246d02f877b30000000000001909 | 464.483 | 39.028 | 387.180 | 0.000 | 0.000 | 0.274 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.000 | 426.208 | 0.918 | 38.000 | node-15/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.310ms; driver.reader-basis.broadcast 0.306ms; driver.publication.readback 0.297ms; driver.reader-basis.broadcast 0.292ms; driver.reader-basis.broadcast 0.292ms |

## P2 / L64 / commit (1776 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.687 | 0.417 | 0.000 | 0.536 | 2.425 | n/a | 0.000 | 0.045 | 0.606 | 0.999 | 0.014 | n/a | 0.092 | 5.689 | n/a | n/a | 0.017 | 2.810 | 0.252 | 0.017 |
| p99 | 45.016 | 2.709 | 0.076 | 2.316 | 9.004 | n/a | 0.240 | 17.912 | 10.651 | 7.052 | 0.052 | n/a | 3.029 | 31.061 | n/a | n/a | 0.050 | 22.150 | 0.686 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b3000000000000121a | 75.802 | 2.021 | n/a | 0.000 | 20.279 | 0.533 | 3.312 | 0.012 | n/a | 0.065 | 49.566 | n/a | n/a | 0.015 | 22.300 | 0.294 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.274ms; driver.publication.readback 0.075ms; driver.publication.readback 0.071ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.018ms |
| 229c246d02f877b300000000000018f4 | 73.475 | 7.842 | n/a | 0.000 | 33.341 | 6.230 | 3.286 | 0.052 | n/a | 0.766 | 21.952 | n/a | n/a | 0.008 | 41.183 | 0.560 | 0.008 | node-15/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.183ms; driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.170ms; driver.publication.readback 0.082ms; driver.publication.readback 0.078ms |
| 229c246d02f877b300000000000018f3 | 69.071 | 3.115 | n/a | 0.000 | 48.003 | 5.033 | 0.606 | 0.003 | n/a | 0.010 | 12.284 | n/a | n/a | 0.017 | 51.118 | 0.740 | 0.017 | node-15/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.170ms; driver.publication.readback 0.067ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.059ms |
| 229c246d02f877b300000000000016c8 | 67.926 | 2.718 | n/a | 0.000 | 40.006 | 1.207 | 1.261 | 0.016 | n/a | 0.096 | 22.611 | n/a | n/a | 0.010 | 42.724 | 0.629 | 0.010 | node-15/thread-0/driver.queue.subject | driver.worker-message 1.254ms; driver.worker-message 0.858ms; driver.publication.readback 0.171ms; driver.publication.readback 0.157ms; driver.publication.readback 0.149ms |
| 229c246d02f877b300000000000018ef | 65.183 | 3.307 | n/a | 0.000 | 0.563 | 52.798 | 1.254 | 0.030 | n/a | 0.071 | 7.151 | n/a | n/a | 0.009 | 3.870 | 0.059 | 0.009 | node-15/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.070ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.027ms; driver.publication.persist-deferred 0.010ms |
| 229c246d02f877b30000000000001222 | 64.297 | 5.403 | n/a | 0.000 | 0.036 | 3.451 | 27.469 | 0.048 | n/a | 3.199 | 24.671 | n/a | n/a | 0.019 | 5.438 | 0.085 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.worker-message 0.618ms; driver.worker-message 0.544ms; driver.publication.readback 0.077ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.027ms |
| 229c246d02f877b30000000000001241 | 60.760 | 1.429 | n/a | 0.000 | 36.557 | 7.296 | 2.752 | 0.010 | n/a | 0.027 | 12.675 | n/a | n/a | 0.014 | 37.987 | 0.625 | 0.014 | node-15/thread-0/driver.queue.subject | client.encode 1.144ms; driver.reader-basis.broadcast 0.639ms; driver.publication.readback 0.136ms; driver.publication.readback 0.092ms; driver.publication.readback 0.083ms |
| 229c246d02f877b300000000000011fc | 59.002 | 1.299 | n/a | 0.000 | 42.559 | 1.924 | 0.657 | 0.013 | n/a | 2.903 | 9.631 | n/a | n/a | 0.016 | 43.858 | 0.743 | 0.016 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.349ms; driver.reader-basis.broadcast 0.231ms; driver.publication.readback 0.151ms; driver.publication.readback 0.084ms; driver.publication.readback 0.070ms |
| 229c246d02f877b3000000000000123f | 55.772 | 6.482 | n/a | 0.000 | 0.037 | 4.523 | 2.444 | 0.033 | n/a | 0.130 | 42.102 | n/a | n/a | 0.021 | 6.519 | 0.117 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.639ms; driver.publication.readback 0.092ms; driver.publication.readback 0.083ms; driver.publication.readback 0.082ms; driver.publication.persist-deferred 0.020ms |
| 229c246d02f877b30000000000001bf4 | 55.378 | 4.568 | n/a | 0.000 | 0.505 | 1.872 | 1.352 | 0.013 | n/a | 0.085 | 46.970 | n/a | n/a | 0.013 | 5.073 | 0.092 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001509 | 51.185 | 3.342 | 0.170 | 0.284 | 0.036 | 4.515 | 5.686 | 0.017 | n/a | 0.048 | 37.070 | n/a | n/a | 0.015 | 3.833 | 0.075 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.128ms; driver.publication.readback 0.077ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.025ms |
| 229c246d02f877b30000000000001bf5 | 50.664 | 2.507 | n/a | 0.000 | 0.011 | 3.254 | 0.720 | 0.007 | n/a | 0.020 | 44.137 | n/a | n/a | 0.008 | 2.518 | 0.050 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.021ms |
| 229c246d02f877b300000000000016c6 | 47.962 | 1.962 | n/a | 0.000 | 26.590 | 0.576 | 2.007 | 0.041 | n/a | 0.118 | 16.642 | n/a | n/a | 0.025 | 28.552 | 0.595 | 0.025 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.157ms; driver.publication.readback 0.149ms; driver.publication.readback 0.142ms; driver.publication.readback 0.130ms; driver.publication.readback 0.099ms |
| 229c246d02f877b300000000000016d5 | 47.715 | 1.323 | n/a | 0.000 | 20.644 | 1.466 | 0.738 | 0.014 | n/a | 0.054 | 23.466 | n/a | n/a | 0.011 | 21.967 | 0.460 | 0.011 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.worker-message 0.858ms; driver.worker-message 0.638ms; driver.reader-basis.broadcast 0.516ms; driver.publication.readback 0.171ms; driver.publication.readback 0.146ms |
| 229c246d02f877b30000000000001841 | 46.581 | 3.221 | n/a | 0.000 | 7.558 | 0.427 | 1.235 | 0.012 | n/a | 0.051 | 34.060 | n/a | n/a | 0.017 | 10.780 | 0.231 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.054ms; driver.publication.readback 0.170ms; driver.publication.readback 0.136ms; driver.publication.readback 0.134ms; driver.publication.persist-deferred 0.040ms |
| 229c246d02f877b30000000000001b44 | 46.313 | 7.347 | n/a | 0.000 | 9.887 | 7.407 | 2.176 | 0.021 | n/a | 0.123 | 19.334 | n/a | n/a | 0.018 | 17.234 | 0.372 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | client.encode 1.022ms; driver.publication.readback 0.326ms; driver.reader-basis.broadcast 0.318ms; driver.publication.persist-deferred 0.060ms |
| 229c246d02f877b300000000000011fa | 45.832 | 4.300 | n/a | 0.000 | 0.021 | 2.158 | 2.257 | 0.030 | n/a | 1.822 | 35.232 | n/a | n/a | 0.011 | 4.322 | 0.094 | 0.011 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.349ms; driver.reader-basis.broadcast 0.231ms; driver.publication.readback 0.151ms; driver.publication.readback 0.070ms; driver.publication.readback 0.060ms |
| 229c246d02f877b300000000000015f2 | 45.016 | 3.734 | n/a | 0.000 | 2.192 | 7.343 | 1.312 | 0.024 | n/a | 4.854 | 25.535 | n/a | n/a | 0.022 | 5.926 | 0.132 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.271ms; driver.publication.readback 0.224ms; driver.publication.readback 0.120ms; driver.publication.readback 0.108ms; driver.publication.readback 0.056ms |
| 229c246d02f877b300000000000016c3 | 44.233 | 13.333 | n/a | 0.000 | 0.016 | 8.644 | 3.262 | 0.039 | n/a | 0.427 | 18.500 | n/a | n/a | 0.011 | 13.349 | 0.302 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.publication.readback 0.142ms; driver.publication.readback 0.083ms; driver.publication.persist-deferred 0.043ms; driver.publication.persist-deferred 0.030ms |
| 229c246d02f877b30000000000001bf6 | 44.093 | 2.093 | n/a | 0.000 | 0.020 | 4.709 | 1.441 | 0.023 | n/a | 0.074 | 35.722 | n/a | n/a | 0.011 | 2.112 | 0.048 | 0.011 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.021ms |

## P2 / L64 / commit / 5-10 facts (1060 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.015 | 0.000 | 0.000 | 0.419 | 1.936 | n/a | 0.000 | 0.043 | 0.593 | 0.873 | 0.014 | n/a | 0.094 | 5.176 | n/a | n/a | 0.017 | 2.201 | 0.235 | 0.017 |
| p99 | 43.646 | 2.003 | 0.054 | 1.190 | 6.482 | n/a | 0.000 | 18.430 | 10.000 | 4.871 | 0.052 | n/a | 2.974 | 28.982 | n/a | n/a | 0.048 | 22.300 | 0.709 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b3000000000000121a | 75.802 | 2.021 | n/a | 0.000 | 20.279 | 0.533 | 3.312 | 0.012 | n/a | 0.065 | 49.566 | n/a | n/a | 0.015 | 22.300 | 0.294 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.274ms; driver.publication.readback 0.075ms; driver.publication.readback 0.071ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.018ms |
| 229c246d02f877b300000000000018f4 | 73.475 | 7.842 | n/a | 0.000 | 33.341 | 6.230 | 3.286 | 0.052 | n/a | 0.766 | 21.952 | n/a | n/a | 0.008 | 41.183 | 0.560 | 0.008 | node-15/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.183ms; driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.170ms; driver.publication.readback 0.082ms; driver.publication.readback 0.078ms |
| 229c246d02f877b300000000000018f3 | 69.071 | 3.115 | n/a | 0.000 | 48.003 | 5.033 | 0.606 | 0.003 | n/a | 0.010 | 12.284 | n/a | n/a | 0.017 | 51.118 | 0.740 | 0.017 | node-15/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.170ms; driver.publication.readback 0.067ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.059ms |
| 229c246d02f877b30000000000001222 | 64.297 | 5.403 | n/a | 0.000 | 0.036 | 3.451 | 27.469 | 0.048 | n/a | 3.199 | 24.671 | n/a | n/a | 0.019 | 5.438 | 0.085 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.worker-message 0.618ms; driver.worker-message 0.544ms; driver.publication.readback 0.077ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.027ms |
| 229c246d02f877b300000000000011fc | 59.002 | 1.299 | n/a | 0.000 | 42.559 | 1.924 | 0.657 | 0.013 | n/a | 2.903 | 9.631 | n/a | n/a | 0.016 | 43.858 | 0.743 | 0.016 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.349ms; driver.reader-basis.broadcast 0.231ms; driver.publication.readback 0.151ms; driver.publication.readback 0.084ms; driver.publication.readback 0.070ms |
| 229c246d02f877b3000000000000123f | 55.772 | 6.482 | n/a | 0.000 | 0.037 | 4.523 | 2.444 | 0.033 | n/a | 0.130 | 42.102 | n/a | n/a | 0.021 | 6.519 | 0.117 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.639ms; driver.publication.readback 0.092ms; driver.publication.readback 0.083ms; driver.publication.readback 0.082ms; driver.publication.persist-deferred 0.020ms |
| 229c246d02f877b300000000000016d5 | 47.715 | 1.323 | n/a | 0.000 | 20.644 | 1.466 | 0.738 | 0.014 | n/a | 0.054 | 23.466 | n/a | n/a | 0.011 | 21.967 | 0.460 | 0.011 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.worker-message 0.858ms; driver.worker-message 0.638ms; driver.reader-basis.broadcast 0.516ms; driver.publication.readback 0.171ms; driver.publication.readback 0.146ms |
| 229c246d02f877b300000000000011fa | 45.832 | 4.300 | n/a | 0.000 | 0.021 | 2.158 | 2.257 | 0.030 | n/a | 1.822 | 35.232 | n/a | n/a | 0.011 | 4.322 | 0.094 | 0.011 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.349ms; driver.reader-basis.broadcast 0.231ms; driver.publication.readback 0.151ms; driver.publication.readback 0.070ms; driver.publication.readback 0.060ms |
| 229c246d02f877b300000000000015f2 | 45.016 | 3.734 | n/a | 0.000 | 2.192 | 7.343 | 1.312 | 0.024 | n/a | 4.854 | 25.535 | n/a | n/a | 0.022 | 5.926 | 0.132 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.271ms; driver.publication.readback 0.224ms; driver.publication.readback 0.120ms; driver.publication.readback 0.108ms; driver.publication.readback 0.056ms |
| 229c246d02f877b300000000000016c3 | 44.233 | 13.333 | n/a | 0.000 | 0.016 | 8.644 | 3.262 | 0.039 | n/a | 0.427 | 18.500 | n/a | n/a | 0.011 | 13.349 | 0.302 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.publication.readback 0.142ms; driver.publication.readback 0.083ms; driver.publication.persist-deferred 0.043ms; driver.publication.persist-deferred 0.030ms |
| 229c246d02f877b30000000000001b4a | 43.646 | 9.184 | n/a | 0.000 | 13.309 | 6.487 | 4.231 | 0.073 | n/a | 0.235 | 10.116 | n/a | n/a | 0.011 | 22.493 | 0.515 | 0.011 | node-15/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.409ms; client.encode 1.022ms; driver.publication.readback 0.589ms; driver.publication.readback 0.122ms; driver.publication.readback 0.105ms |
| 229c246d02f877b3000000000000123e | 43.585 | 1.885 | n/a | 0.000 | 0.054 | 0.685 | 0.970 | 0.014 | n/a | 0.109 | 39.840 | n/a | n/a | 0.027 | 1.939 | 0.044 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.639ms; driver.publication.readback 0.083ms; driver.publication.persist-deferred 0.016ms |
| 229c246d02f877b30000000000001dab | 41.899 | 3.052 | n/a | 0.000 | 0.057 | 0.542 | 1.569 | 0.022 | n/a | 0.054 | 36.577 | n/a | n/a | 0.027 | 3.109 | 0.074 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000011c6 | 39.900 | 1.173 | n/a | 0.000 | 3.862 | 2.390 | 0.593 | 0.013 | n/a | 0.066 | 31.794 | n/a | n/a | 0.009 | 5.035 | 0.126 | 0.009 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.260ms; driver.publication.readback 0.138ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.020ms |
| 229c246d02f877b300000000000018e5 | 39.577 | 3.535 | n/a | 0.000 | 0.067 | 25.214 | 0.841 | 0.014 | n/a | 0.741 | 9.134 | n/a | n/a | 0.032 | 3.602 | 0.091 | 0.032 | node-15/thread-0/socket.wait-first-byte | driver.publication.readback 0.136ms; driver.publication.persist-deferred 0.014ms |
| 229c246d02f877b30000000000001e5b | 38.656 | 1.564 | n/a | 0.000 | 21.398 | 3.602 | 1.482 | 0.030 | n/a | 0.130 | 10.438 | n/a | n/a | 0.012 | 22.962 | 0.594 | 0.012 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.090ms; driver.publication.readback 0.135ms; driver.publication.readback 0.123ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.029ms |
| 229c246d02f877b30000000000001210 | 38.617 | 1.206 | n/a | 0.000 | 0.295 | 0.510 | 0.518 | 0.006 | n/a | 0.016 | 36.056 | n/a | n/a | 0.010 | 1.501 | 0.039 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.121ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.037ms; driver.publication.persist-deferred 0.020ms |
| 229c246d02f877b30000000000001706 | 38.178 | 3.784 | n/a | 0.000 | 11.444 | 3.735 | 0.645 | 0.011 | n/a | 0.724 | 17.816 | n/a | n/a | 0.020 | 15.228 | 0.399 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.293ms; driver.publication.readback 0.102ms; driver.publication.persist-deferred 0.019ms |
| 229c246d02f877b30000000000001b47 | 38.149 | 12.036 | n/a | 0.000 | 14.128 | 2.524 | 1.092 | 0.021 | n/a | 0.665 | 7.671 | n/a | n/a | 0.013 | 26.164 | 0.686 | 0.013 | node-15/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.409ms; client.encode 1.022ms; driver.publication.readback 0.326ms; driver.publication.persist-deferred 0.038ms |
| 229c246d02f877b30000000000001b46 | 38.026 | 8.667 | n/a | 0.000 | 13.804 | 8.255 | 0.663 | 0.007 | n/a | 0.036 | 6.570 | n/a | n/a | 0.025 | 22.471 | 0.591 | 0.025 | node-15/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.409ms; driver.publication.readback 0.326ms; driver.publication.persist-deferred 0.038ms |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.841 | 0.000 | 0.000 | 0.533 | 3.863 | n/a | 0.000 | 0.045 | 0.887 | 1.747 | 0.022 | n/a | 0.089 | 6.721 | n/a | n/a | 0.019 | 4.098 | 0.270 | 0.019 |
| p99 | 81.017 | 2.004 | 0.000 | 1.344 | 13.622 | n/a | 0.204 | 2.308 | 18.115 | 12.453 | 0.043 | n/a | 1.078 | 74.847 | n/a | n/a | 0.043 | 13.912 | 0.628 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000001eef | 81.017 | 3.197 | n/a | 0.000 | 0.067 | 0.487 | 2.322 | 0.019 | n/a | 0.061 | 74.847 | n/a | n/a | 0.017 | 3.264 | 0.040 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.420ms |
| 229c246d02f877b30000000000001ee3 | 40.072 | 12.276 | 0.365 | 0.000 | 0.065 | 18.115 | 2.022 | 0.042 | n/a | 0.096 | 7.072 | n/a | n/a | 0.019 | 12.706 | 0.317 | 0.019 | node-15/thread-9/socket.wait-first-byte | none observed |
| 229c246d02f877b30000000000001f47 | 33.018 | 8.472 | 0.183 | 0.000 | 0.041 | 1.223 | 9.044 | 0.021 | n/a | 0.073 | 13.931 | n/a | n/a | 0.029 | 8.697 | 0.263 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f53 | 32.920 | 7.851 | 0.185 | 0.000 | 0.067 | 4.342 | 7.080 | 0.031 | n/a | 0.445 | 12.899 | n/a | n/a | 0.021 | 8.102 | 0.246 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f83 | 29.687 | 6.886 | 1.206 | 0.000 | 0.037 | 4.668 | 4.907 | 0.027 | n/a | 0.069 | 11.863 | n/a | n/a | 0.024 | 8.129 | 0.274 | 0.024 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f4d | 29.656 | 9.191 | 0.147 | 0.000 | 0.047 | 1.511 | 7.341 | 0.025 | n/a | 0.256 | 11.124 | n/a | n/a | 0.014 | 9.386 | 0.316 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001eec | 29.076 | 2.515 | n/a | 0.000 | 0.034 | 0.521 | 5.072 | 0.017 | n/a | 0.035 | 20.865 | n/a | n/a | 0.017 | 2.549 | 0.088 | 0.017 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.347ms |
| 229c246d02f877b30000000000001f69 | 28.566 | 7.069 | 0.149 | 0.000 | 0.039 | 8.927 | 5.316 | 0.023 | n/a | 0.095 | 6.929 | n/a | n/a | 0.016 | 7.258 | 0.254 | 0.016 | node-15/thread-9/socket.wait-first-byte | none observed |
| 229c246d02f877b30000000000001f3f | 28.130 | 13.622 | 0.238 | 0.000 | 0.052 | 2.471 | 7.416 | 0.028 | n/a | 0.380 | 3.908 | n/a | n/a | 0.016 | 13.912 | 0.495 | 0.016 | node-15/thread-9/client.persist-and-resolve | none observed |
| 229c246d02f877b30000000000001f73 | 28.041 | 7.295 | 0.190 | 0.000 | 0.063 | 1.244 | 12.453 | 0.029 | n/a | 0.058 | 6.688 | n/a | n/a | 0.021 | 7.548 | 0.269 | 0.021 | gw-w/thread-49/gateway.admitted-work | none observed |
| 229c246d02f877b30000000000001f61 | 27.641 | 5.043 | 0.177 | 0.000 | 0.065 | 6.632 | 6.600 | 0.024 | n/a | 0.082 | 8.994 | n/a | n/a | 0.023 | 5.285 | 0.191 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001ee1 | 26.976 | 6.175 | 0.240 | 0.000 | 0.052 | 4.093 | 5.478 | 0.024 | n/a | 0.054 | 10.823 | n/a | n/a | 0.037 | 6.466 | 0.240 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f8d | 26.550 | 4.516 | 0.192 | 0.000 | 0.036 | 5.785 | 11.076 | 0.043 | n/a | 0.092 | 4.794 | n/a | n/a | 0.014 | 4.745 | 0.179 | 0.014 | node-15/thread-9/socket.wait-first-byte | none observed |
| 229c246d02f877b30000000000001ef5 | 26.540 | 6.460 | 0.195 | 0.000 | 0.040 | 8.287 | 6.476 | 0.021 | n/a | 0.056 | 4.990 | n/a | n/a | 0.014 | 6.695 | 0.252 | 0.014 | node-15/thread-9/socket.wait-first-byte | none observed |
| 229c246d02f877b30000000000001f23 | 25.707 | 7.135 | n/a | 0.000 | 0.105 | 0.938 | 1.984 | 0.042 | n/a | 0.106 | 15.364 | n/a | n/a | 0.033 | 7.240 | 0.282 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 2.094ms |
| 229c246d02f877b30000000000001ef9 | 25.629 | 4.112 | 0.163 | 0.000 | 0.057 | 8.469 | 3.468 | 0.032 | n/a | 0.105 | 9.201 | n/a | n/a | 0.022 | 4.332 | 0.169 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f33 | 25.124 | 5.234 | 0.250 | 0.000 | 0.066 | 4.166 | 8.382 | 0.031 | n/a | 0.127 | 6.825 | n/a | n/a | 0.042 | 5.551 | 0.221 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f2d | 24.810 | 6.081 | 0.148 | 0.000 | 0.046 | 4.145 | 6.192 | 0.022 | n/a | 0.074 | 8.086 | n/a | n/a | 0.014 | 6.276 | 0.253 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f1d | 24.582 | 6.458 | 0.167 | 0.000 | 0.060 | 2.330 | 7.312 | 0.024 | n/a | 0.061 | 8.147 | n/a | n/a | 0.024 | 6.685 | 0.272 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001ee4 | 24.043 | 3.084 | n/a | 0.000 | 0.049 | 0.764 | 4.044 | 0.025 | n/a | 0.061 | 15.994 | n/a | n/a | 0.022 | 3.133 | 0.130 | 0.022 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.312 | 0.000 | 0.000 | 0.543 | 2.766 | n/a | 0.000 | 0.044 | 0.619 | 1.137 | 0.017 | n/a | 0.089 | 5.791 | n/a | n/a | 0.021 | 2.855 | 0.271 | 0.021 |
| p99 | 29.076 | 1.903 | 0.000 | 1.320 | 7.135 | n/a | 0.000 | 2.308 | 1.049 | 5.072 | 0.042 | n/a | 0.581 | 20.865 | n/a | n/a | 0.038 | 7.240 | 0.426 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000001eec | 29.076 | 2.515 | n/a | 0.000 | 0.034 | 0.521 | 5.072 | 0.017 | n/a | 0.035 | 20.865 | n/a | n/a | 0.017 | 2.549 | 0.088 | 0.017 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.347ms |
| 229c246d02f877b30000000000001f23 | 25.707 | 7.135 | n/a | 0.000 | 0.105 | 0.938 | 1.984 | 0.042 | n/a | 0.106 | 15.364 | n/a | n/a | 0.033 | 7.240 | 0.282 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 2.094ms |
| 229c246d02f877b30000000000001ee4 | 24.043 | 3.084 | n/a | 0.000 | 0.049 | 0.764 | 4.044 | 0.025 | n/a | 0.061 | 15.994 | n/a | n/a | 0.022 | 3.133 | 0.130 | 0.022 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001ef6 | 20.535 | 3.364 | n/a | 0.000 | 0.033 | 1.049 | 2.012 | 0.032 | n/a | 0.103 | 13.922 | n/a | n/a | 0.021 | 3.397 | 0.165 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f14 | 18.246 | 3.546 | n/a | 0.000 | 0.079 | 0.712 | 0.941 | 0.014 | n/a | 0.062 | 12.860 | n/a | n/a | 0.032 | 3.625 | 0.199 | 0.032 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f00 | 18.207 | 2.700 | n/a | 0.000 | 0.051 | 0.542 | 1.025 | 0.013 | n/a | 0.304 | 13.551 | n/a | n/a | 0.021 | 2.751 | 0.151 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001eea | 15.370 | 3.087 | n/a | 0.000 | 0.042 | 0.734 | 1.651 | 0.025 | n/a | 0.352 | 9.458 | n/a | n/a | 0.021 | 3.129 | 0.204 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f26 | 15.052 | 3.844 | n/a | 0.000 | 0.080 | 0.887 | 1.687 | 0.025 | n/a | 0.100 | 8.395 | n/a | n/a | 0.033 | 3.924 | 0.261 | 0.033 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001ed6 | 14.838 | 1.979 | n/a | 0.000 | 0.037 | 0.423 | 1.051 | 0.014 | n/a | 0.053 | 11.265 | n/a | n/a | 0.017 | 2.016 | 0.136 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.387ms |
| 229c246d02f877b30000000000001edf | 14.038 | 3.871 | n/a | 0.000 | 0.089 | 0.836 | 2.188 | 0.025 | n/a | 0.083 | 6.909 | n/a | n/a | 0.037 | 3.960 | 0.282 | 0.037 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f38 | 13.937 | 5.196 | n/a | 0.000 | 0.158 | 0.562 | 0.784 | 0.012 | n/a | 0.049 | 7.138 | n/a | n/a | 0.038 | 5.354 | 0.384 | 0.038 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.535ms |
| 229c246d02f877b30000000000001f5b | 13.769 | 3.187 | n/a | 0.000 | 1.785 | 0.626 | 0.951 | 0.015 | n/a | 0.061 | 7.119 | n/a | n/a | 0.024 | 4.971 | 0.361 | 0.024 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f58 | 13.608 | 2.352 | n/a | 0.000 | 0.036 | 0.489 | 1.137 | 0.015 | n/a | 0.064 | 9.495 | n/a | n/a | 0.020 | 2.388 | 0.175 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001ee6 | 13.395 | 3.724 | n/a | 0.000 | 0.077 | 0.715 | 1.083 | 0.015 | n/a | 0.350 | 7.398 | n/a | n/a | 0.033 | 3.801 | 0.284 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f43 | 13.291 | 2.766 | n/a | 0.000 | 0.038 | 0.798 | 1.493 | 0.029 | n/a | 0.115 | 8.032 | n/a | n/a | 0.019 | 2.805 | 0.211 | 0.019 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f4f | 11.570 | 3.725 | n/a | 0.000 | 0.110 | 0.692 | 1.164 | 0.016 | n/a | 0.080 | 5.747 | n/a | n/a | 0.037 | 3.835 | 0.331 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f6e | 11.326 | 2.338 | n/a | 0.000 | 2.308 | 0.500 | 0.917 | 0.016 | n/a | 0.236 | 4.999 | n/a | n/a | 0.013 | 4.646 | 0.410 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f19 | 11.312 | 2.787 | n/a | 0.000 | 0.033 | 0.801 | 1.423 | 0.042 | n/a | 0.089 | 6.121 | n/a | n/a | 0.015 | 2.820 | 0.249 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f8e | 10.817 | 2.009 | n/a | 0.000 | 0.033 | 0.458 | 1.386 | 0.021 | n/a | 0.581 | 6.306 | n/a | n/a | 0.024 | 2.042 | 0.189 | 0.024 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f88 | 10.813 | 3.863 | n/a | 0.000 | 0.051 | 0.858 | 2.403 | 0.019 | n/a | 0.058 | 3.536 | n/a | n/a | 0.026 | 3.914 | 0.362 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.666 | 0.000 | 0.000 | 0.463 | 4.173 | n/a | 0.000 | 0.043 | 0.755 | 1.810 | 0.022 | n/a | 0.102 | 7.429 | n/a | n/a | 0.017 | 4.562 | 0.292 | 0.017 |
| p99 | 143.544 | 2.003 | 0.090 | 1.209 | 11.590 | n/a | 0.000 | 11.598 | 9.440 | 70.445 | 0.063 | n/a | 5.347 | 107.083 | n/a | n/a | 0.099 | 13.918 | 0.631 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000001fad | 143.544 | 6.791 | 0.207 | 0.000 | 0.048 | 4.469 | 24.834 | 0.039 | n/a | 0.057 | 107.083 | n/a | n/a | 0.016 | 7.046 | 0.049 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.334ms |
| 229c246d02f877b30000000000001fd5 | 78.756 | 4.173 | n/a | 0.000 | 0.039 | 1.772 | 70.445 | 0.047 | n/a | 0.682 | 1.580 | n/a | n/a | 0.019 | 4.212 | 0.053 | 0.019 | gw-w/thread-64/storage/begin-command! | driver.reader-basis.broadcast 0.313ms |
| 229c246d02f877b30000000000002010 | 69.324 | 7.869 | 0.260 | 0.000 | 0.043 | 6.836 | 34.225 | 0.043 | n/a | 0.360 | 19.669 | n/a | n/a | 0.019 | 8.173 | 0.118 | 0.019 | gw-w/thread-64/gateway.admitted-work | none observed |
| 229c246d02f877b30000000000001ff0 | 48.049 | 7.651 | 0.187 | 0.000 | 0.064 | 1.222 | 9.018 | 0.027 | n/a | 0.107 | 29.752 | n/a | n/a | 0.022 | 7.901 | 0.164 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fe8 | 47.079 | 6.963 | 0.153 | 0.000 | 0.040 | 1.122 | 6.833 | 0.060 | n/a | 0.138 | 31.756 | n/a | n/a | 0.015 | 7.156 | 0.152 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002002 | 39.594 | 4.642 | 0.210 | 0.000 | 0.042 | 6.704 | 1.758 | 0.022 | n/a | 0.055 | 26.146 | n/a | n/a | 0.016 | 4.895 | 0.124 | 0.016 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fd1 | 39.144 | 3.885 | 0.203 | 0.000 | 0.039 | 5.182 | 5.640 | 0.028 | n/a | 0.324 | 23.829 | n/a | n/a | 0.015 | 4.126 | 0.105 | 0.015 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fbb | 36.731 | 6.349 | 0.224 | 0.000 | 0.065 | 0.969 | 4.075 | 0.040 | n/a | 0.129 | 24.856 | n/a | n/a | 0.023 | 6.638 | 0.181 | 0.023 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000204b | 34.902 | 3.627 | n/a | 0.000 | 0.060 | 0.519 | 0.814 | 0.013 | n/a | 0.043 | 29.789 | n/a | n/a | 0.036 | 3.687 | 0.106 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fb3 | 34.415 | 3.764 | 1.036 | 0.000 | 0.019 | 8.083 | 13.658 | 0.043 | n/a | 0.440 | 7.358 | n/a | n/a | 0.015 | 4.819 | 0.140 | 0.015 | gw-w/thread-46/gateway.admitted-work | driver.publication.readback 0.081ms |
| 229c246d02f877b30000000000001fe3 | 34.374 | 8.182 | 0.408 | 0.000 | 0.033 | 2.164 | 15.467 | 0.044 | n/a | 0.112 | 7.951 | n/a | n/a | 0.013 | 8.623 | 0.251 | 0.013 | gw-w/thread-65/gateway.admitted-work | none observed |
| 229c246d02f877b3000000000000203e | 32.607 | 11.590 | 0.202 | 0.000 | 0.046 | 6.568 | 5.198 | 0.021 | n/a | 0.062 | 8.904 | n/a | n/a | 0.015 | 11.839 | 0.363 | 0.015 | node-15/thread-9/client.persist-and-resolve | none observed |
| 229c246d02f877b30000000000002018 | 32.345 | 7.719 | 0.148 | 0.000 | 0.043 | 2.318 | 6.198 | 0.033 | n/a | 0.546 | 15.323 | n/a | n/a | 0.016 | 7.911 | 0.245 | 0.016 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f9f | 31.753 | 6.163 | 0.252 | 0.000 | 0.063 | 6.523 | 9.278 | 0.030 | n/a | 0.162 | 9.258 | n/a | n/a | 0.026 | 6.478 | 0.204 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000200e | 29.737 | 7.425 | 1.552 | 0.000 | 0.056 | 5.210 | 5.852 | 0.036 | n/a | 0.553 | 9.034 | n/a | n/a | 0.019 | 9.033 | 0.304 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000202e | 29.278 | 7.922 | 3.284 | 0.000 | 0.043 | 1.726 | 7.172 | 0.029 | n/a | 0.366 | 8.720 | n/a | n/a | 0.016 | 11.249 | 0.384 | 0.016 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fa8 | 29.125 | 6.716 | 0.201 | 0.000 | 0.042 | 3.057 | 5.721 | 0.030 | n/a | 0.064 | 13.279 | n/a | n/a | 0.016 | 6.959 | 0.239 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002008 | 28.314 | 8.932 | 4.480 | 0.000 | 0.045 | 4.392 | 6.230 | 0.027 | n/a | 0.127 | 4.063 | n/a | n/a | 0.018 | 13.458 | 0.475 | 0.018 | node-15/thread-9/client.persist-and-resolve | none observed |
| 229c246d02f877b3000000000000200c | 27.287 | 9.129 | 0.147 | 0.000 | 0.044 | 0.940 | 5.098 | 0.021 | n/a | 0.088 | 11.805 | n/a | n/a | 0.015 | 9.321 | 0.342 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002039 | 26.838 | 3.990 | n/a | 0.000 | 0.031 | 0.690 | 0.884 | 0.012 | n/a | 0.055 | 21.122 | n/a | n/a | 0.053 | 4.021 | 0.150 | 0.053 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.092 | 0.313 | 0.000 | 0.446 | 2.842 | n/a | 0.000 | 0.042 | 0.541 | 0.996 | 0.016 | n/a | 0.082 | 5.779 | n/a | n/a | 0.017 | 3.227 | 0.276 | 0.017 |
| p99 | 78.756 | 1.646 | 0.090 | 0.885 | 4.904 | n/a | 0.000 | 11.598 | 3.182 | 70.445 | 0.060 | n/a | 0.682 | 29.789 | n/a | n/a | 0.099 | 13.918 | 0.631 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000001fd5 | 78.756 | 4.173 | n/a | 0.000 | 0.039 | 1.772 | 70.445 | 0.047 | n/a | 0.682 | 1.580 | n/a | n/a | 0.019 | 4.212 | 0.053 | 0.019 | gw-w/thread-64/storage/begin-command! | driver.reader-basis.broadcast 0.313ms |
| 229c246d02f877b3000000000000204b | 34.902 | 3.627 | n/a | 0.000 | 0.060 | 0.519 | 0.814 | 0.013 | n/a | 0.043 | 29.789 | n/a | n/a | 0.036 | 3.687 | 0.106 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002024 | 26.311 | 4.003 | n/a | 0.000 | 0.034 | 0.539 | 0.855 | 0.012 | n/a | 0.203 | 20.648 | n/a | n/a | 0.016 | 4.038 | 0.153 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f9b | 24.716 | 3.460 | n/a | 0.000 | 0.072 | 0.616 | 1.038 | 0.060 | n/a | 0.111 | 19.331 | n/a | n/a | 0.028 | 3.532 | 0.143 | 0.028 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002011 | 22.064 | 2.321 | n/a | 0.000 | 11.598 | 0.491 | 1.239 | 0.017 | n/a | 0.301 | 6.083 | n/a | n/a | 0.015 | 13.918 | 0.631 | 0.015 | node-15/thread-0/driver.queue.scheduler-late | none observed |
| 229c246d02f877b30000000000001fe9 | 15.899 | 2.934 | n/a | 0.000 | 0.040 | 0.554 | 0.959 | 0.013 | n/a | 0.063 | 11.321 | n/a | n/a | 0.016 | 2.973 | 0.187 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fb4 | 15.110 | 3.445 | n/a | 0.000 | 1.934 | 0.641 | 2.794 | 0.019 | n/a | 0.082 | 6.181 | n/a | n/a | 0.014 | 5.380 | 0.356 | 0.014 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fac | 14.145 | 4.215 | n/a | 0.000 | 0.051 | 3.182 | 3.638 | 0.033 | n/a | 0.089 | 2.914 | n/a | n/a | 0.021 | 4.266 | 0.302 | 0.021 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fc9 | 14.015 | 2.516 | n/a | 0.000 | 0.033 | 0.429 | 0.855 | 0.013 | n/a | 0.056 | 10.098 | n/a | n/a | 0.015 | 2.549 | 0.182 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fc2 | 13.708 | 2.842 | n/a | 0.000 | 0.033 | 0.551 | 0.929 | 0.021 | n/a | 0.054 | 9.260 | n/a | n/a | 0.018 | 2.875 | 0.210 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fdd | 13.249 | 3.651 | n/a | 0.000 | 0.095 | 0.716 | 1.399 | 0.021 | n/a | 0.086 | 7.230 | n/a | n/a | 0.050 | 3.746 | 0.283 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fbd | 13.030 | 4.107 | n/a | 0.000 | 0.029 | 0.552 | 0.927 | 0.015 | n/a | 0.190 | 7.195 | n/a | n/a | 0.015 | 4.136 | 0.317 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000202a | 12.939 | 1.775 | n/a | 0.000 | 1.567 | 0.463 | 1.106 | 0.024 | n/a | 0.070 | 7.927 | n/a | n/a | 0.009 | 3.342 | 0.258 | 0.009 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002013 | 12.422 | 3.113 | n/a | 0.000 | 0.068 | 0.633 | 0.930 | 0.015 | n/a | 0.331 | 7.233 | n/a | n/a | 0.099 | 3.181 | 0.256 | 0.099 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.344ms |
| 229c246d02f877b30000000000001feb | 12.395 | 3.078 | n/a | 0.000 | 0.031 | 0.643 | 1.310 | 0.016 | n/a | 0.058 | 7.245 | n/a | n/a | 0.014 | 3.109 | 0.251 | 0.014 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fd2 | 11.733 | 2.631 | n/a | 0.000 | 0.978 | 0.475 | 1.014 | 0.021 | n/a | 0.291 | 6.309 | n/a | n/a | 0.014 | 3.609 | 0.308 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000203f | 11.412 | 2.451 | n/a | 0.000 | 0.039 | 0.393 | 0.996 | 0.019 | n/a | 0.052 | 7.446 | n/a | n/a | 0.017 | 2.490 | 0.218 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.365ms |
| 229c246d02f877b30000000000001f98 | 11.092 | 2.732 | n/a | 0.000 | 0.028 | 0.474 | 2.052 | 0.016 | n/a | 0.056 | 5.719 | n/a | n/a | 0.014 | 2.760 | 0.249 | 0.014 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001f95 | 10.913 | 3.958 | n/a | 0.000 | 0.027 | 0.556 | 0.854 | 0.014 | n/a | 0.067 | 5.424 | n/a | n/a | 0.013 | 3.985 | 0.365 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000001fc0 | 10.541 | 2.196 | n/a | 0.000 | 1.790 | 0.458 | 0.765 | 0.014 | n/a | 0.050 | 5.254 | n/a | n/a | 0.015 | 3.986 | 0.378 | 0.015 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (365 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.385 | 0.000 | 0.000 | 0.475 | 3.225 | n/a | 0.000 | 0.045 | 0.735 | 1.497 | 0.021 | n/a | 0.087 | 5.734 | n/a | n/a | 0.029 | 3.513 | 0.270 | 0.029 |
| p99 | 54.504 | 2.887 | 0.000 | 3.124 | 8.042 | n/a | 1.565 | 1.987 | 3.972 | 16.152 | 0.083 | n/a | 1.478 | 46.468 | n/a | n/a | 0.093 | 8.690 | 0.538 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b30000000000002316 | 112.748 | 15.250 | 0.469 | 0.000 | 0.084 | 3.303 | 5.508 | 0.083 | n/a | 0.095 | 87.898 | n/a | n/a | 0.058 | 15.803 | 0.140 | 0.058 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 6.125ms |
| 229c246d02f877b3000000000000225d | 60.282 | 3.205 | 0.234 | 0.000 | 0.087 | 1.285 | 6.301 | 0.041 | n/a | 0.092 | 48.990 | n/a | n/a | 0.048 | 3.526 | 0.058 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.443ms |
| 229c246d02f877b30000000000002177 | 58.832 | 3.437 | 0.216 | 0.000 | 0.040 | 1.158 | 3.014 | 0.042 | n/a | 0.118 | 50.790 | n/a | n/a | 0.018 | 3.693 | 0.063 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.438ms |
| 229c246d02f877b3000000000000209c | 54.504 | 4.696 | 0.247 | 0.000 | 0.036 | 1.487 | 1.471 | 0.022 | n/a | 0.062 | 46.468 | n/a | n/a | 0.016 | 4.978 | 0.091 | 0.016 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000209d | 45.848 | 1.821 | n/a | 0.000 | 0.031 | 0.518 | 0.882 | 0.016 | n/a | 0.077 | 42.489 | n/a | n/a | 0.015 | 1.851 | 0.040 | 0.015 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000205e | 41.421 | 4.812 | 1.914 | 0.000 | 0.034 | 1.236 | 9.305 | 0.020 | n/a | 0.045 | 24.039 | n/a | n/a | 0.015 | 6.760 | 0.163 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000020b2 | 36.984 | 3.114 | 0.194 | 0.000 | 0.070 | 0.806 | 1.445 | 0.021 | n/a | 0.058 | 31.254 | n/a | n/a | 0.023 | 3.377 | 0.091 | 0.023 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000020c5 | 36.947 | 5.067 | n/a | 0.000 | 0.072 | 0.613 | 2.050 | 0.026 | n/a | 0.425 | 28.659 | n/a | n/a | 0.036 | 5.139 | 0.139 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.101ms |
| 229c246d02f877b30000000000002264 | 35.950 | 2.753 | n/a | 0.000 | 0.046 | 1.679 | 22.759 | 0.005 | n/a | 0.031 | 8.646 | n/a | n/a | 0.033 | 2.798 | 0.078 | 0.033 | gw-w/thread-45/commit.prepare-and-validate | driver.publication.persist-deferred 0.020ms |
| 229c246d02f877b30000000000002322 | 34.530 | 5.740 | 0.305 | 0.000 | 0.036 | 2.068 | 6.999 | 0.024 | n/a | 0.115 | 19.206 | n/a | n/a | 0.038 | 6.081 | 0.176 | 0.038 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000231e | 33.640 | 2.879 | 0.167 | 0.000 | 0.038 | 0.838 | 3.974 | 0.020 | n/a | 0.043 | 25.648 | n/a | n/a | 0.035 | 3.084 | 0.092 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002076 | 32.205 | 3.364 | 0.142 | 0.000 | 0.041 | 0.760 | 1.743 | 0.034 | n/a | 0.090 | 26.015 | n/a | n/a | 0.016 | 3.546 | 0.110 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002088 | 31.459 | 4.130 | 0.253 | 0.000 | 0.042 | 1.219 | 1.675 | 0.024 | n/a | 0.091 | 24.009 | n/a | n/a | 0.016 | 4.426 | 0.141 | 0.016 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000022eb | 31.381 | 7.462 | 0.214 | 0.000 | 0.035 | 1.228 | 10.269 | 0.026 | n/a | 0.047 | 12.061 | n/a | n/a | 0.038 | 7.712 | 0.246 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002265 | 29.971 | 1.547 | n/a | 0.000 | 0.009 | 0.293 | 21.202 | 0.025 | n/a | 0.056 | 6.831 | n/a | n/a | 0.009 | 1.555 | 0.052 | 0.009 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| 229c246d02f877b3000000000000231a | 29.272 | 3.938 | 0.192 | 0.000 | 0.055 | 1.641 | 8.405 | 0.079 | n/a | 0.341 | 14.572 | n/a | n/a | 0.050 | 4.185 | 0.143 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000020cf | 28.892 | 3.421 | n/a | 0.000 | 0.023 | 0.385 | 18.159 | 0.028 | n/a | 0.050 | 6.789 | n/a | n/a | 0.037 | 3.444 | 0.119 | 0.037 | gw-w/thread-48/commit.prepare-and-validate | none observed |
| 229c246d02f877b30000000000002306 | 28.622 | 4.692 | 0.212 | 0.000 | 0.045 | 2.196 | 7.594 | 0.036 | n/a | 0.298 | 13.507 | n/a | n/a | 0.042 | 4.950 | 0.173 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000219f | 27.382 | 6.879 | 0.186 | 0.000 | 0.033 | 1.143 | 4.350 | 0.020 | n/a | 0.043 | 14.710 | n/a | n/a | 0.019 | 7.097 | 0.259 | 0.019 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.410ms |
| 229c246d02f877b300000000000020e8 | 26.806 | 6.274 | n/a | 0.000 | 2.720 | 0.570 | 1.146 | 0.017 | n/a | 0.392 | 15.657 | n/a | n/a | 0.030 | 8.995 | 0.336 | 0.030 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.991 | 0.000 | 0.000 | 0.425 | 2.142 | n/a | 0.000 | 0.045 | 0.561 | 1.000 | 0.017 | n/a | 0.094 | 5.334 | n/a | n/a | 0.028 | 2.280 | 0.238 | 0.028 |
| p99 | 29.971 | 1.601 | 0.000 | 1.544 | 5.426 | n/a | 0.000 | 1.987 | 3.620 | 7.859 | 0.043 | n/a | 1.478 | 12.409 | n/a | n/a | 0.072 | 5.515 | 0.452 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 229c246d02f877b3000000000000209d | 45.848 | 1.821 | n/a | 0.000 | 0.031 | 0.518 | 0.882 | 0.016 | n/a | 0.077 | 42.489 | n/a | n/a | 0.015 | 1.851 | 0.040 | 0.015 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002265 | 29.971 | 1.547 | n/a | 0.000 | 0.009 | 0.293 | 21.202 | 0.025 | n/a | 0.056 | 6.831 | n/a | n/a | 0.009 | 1.555 | 0.052 | 0.009 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| 229c246d02f877b30000000000002089 | 25.313 | 4.547 | n/a | 0.000 | 0.051 | 10.605 | 7.859 | 0.037 | n/a | 0.155 | 2.032 | n/a | n/a | 0.027 | 4.597 | 0.182 | 0.027 | node-15/thread-0/socket.wait-first-byte | none observed |
| 229c246d02f877b30000000000002079 | 20.843 | 2.031 | n/a | 0.000 | 0.035 | 0.836 | 5.339 | 0.043 | n/a | 0.129 | 12.409 | n/a | n/a | 0.022 | 2.066 | 0.099 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002154 | 16.763 | 3.155 | n/a | 0.000 | 0.097 | 3.620 | 1.240 | 0.017 | n/a | 3.134 | 5.462 | n/a | n/a | 0.039 | 3.251 | 0.194 | 0.039 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000020b9 | 16.345 | 4.047 | n/a | 0.000 | 0.133 | 0.937 | 3.353 | 0.036 | n/a | 0.156 | 7.621 | n/a | n/a | 0.061 | 4.181 | 0.256 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000214f | 15.626 | 4.034 | n/a | 0.000 | 0.046 | 2.613 | 5.534 | 0.043 | n/a | 0.156 | 3.168 | n/a | n/a | 0.031 | 4.080 | 0.261 | 0.031 | gw-w/thread-45/gateway.response-write | none observed |
| 229c246d02f877b300000000000021aa | 15.276 | 2.629 | n/a | 0.000 | 0.032 | 0.581 | 1.077 | 0.017 | n/a | 0.250 | 10.672 | n/a | n/a | 0.018 | 2.661 | 0.174 | 0.018 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000210f | 15.187 | 2.311 | n/a | 0.000 | 0.036 | 0.437 | 0.895 | 0.014 | n/a | 0.047 | 11.432 | n/a | n/a | 0.016 | 2.347 | 0.155 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b30000000000002286 | 14.932 | 4.111 | n/a | 0.000 | 1.987 | 0.976 | 1.078 | 0.022 | n/a | 0.295 | 6.426 | n/a | n/a | 0.037 | 6.097 | 0.408 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000020c9 | 14.922 | 1.756 | n/a | 0.000 | 1.793 | 0.564 | 1.394 | 0.022 | n/a | 0.328 | 9.048 | n/a | n/a | 0.017 | 3.549 | 0.238 | 0.017 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000020b3 | 13.748 | 1.730 | n/a | 0.000 | 0.061 | 0.485 | 1.081 | 0.015 | n/a | 0.062 | 10.290 | n/a | n/a | 0.023 | 1.791 | 0.130 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000218c | 13.654 | 4.556 | n/a | 0.000 | 0.038 | 1.044 | 1.958 | 0.040 | n/a | 0.094 | 5.908 | n/a | n/a | 0.016 | 4.594 | 0.336 | 0.016 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000020dd | 13.563 | 5.465 | n/a | 0.000 | 0.050 | 1.845 | 3.344 | 0.036 | n/a | 0.188 | 2.607 | n/a | n/a | 0.028 | 5.515 | 0.407 | 0.028 | node-15/thread-0/driver.execute | none observed |
| 229c246d02f877b300000000000020b5 | 13.245 | 2.188 | n/a | 0.000 | 0.061 | 0.482 | 0.799 | 0.014 | n/a | 0.055 | 9.614 | n/a | n/a | 0.032 | 2.250 | 0.170 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000219a | 13.243 | 2.801 | n/a | 0.000 | 0.104 | 0.710 | 1.032 | 0.018 | n/a | 0.073 | 8.469 | n/a | n/a | 0.036 | 2.905 | 0.219 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000022c3 | 13.211 | 2.634 | n/a | 0.000 | 0.049 | 0.969 | 1.952 | 0.040 | n/a | 0.135 | 7.388 | n/a | n/a | 0.044 | 2.682 | 0.203 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000217e | 13.124 | 1.805 | n/a | 0.000 | 1.750 | 0.404 | 0.940 | 0.015 | n/a | 0.061 | 8.132 | n/a | n/a | 0.016 | 3.555 | 0.271 | 0.016 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b300000000000020d8 | 13.093 | 1.624 | n/a | 0.000 | 0.031 | 0.576 | 0.925 | 0.024 | n/a | 0.254 | 9.644 | n/a | n/a | 0.016 | 1.655 | 0.126 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 229c246d02f877b3000000000000223e | 13.063 | 2.848 | n/a | 0.000 | 0.083 | 0.614 | 2.302 | 0.016 | n/a | 0.067 | 7.076 | n/a | n/a | 0.058 | 2.930 | 0.224 | 0.058 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (1228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.049 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 0.000 | 0.000 | 0.024 |
| p99 | 330.549 | n/a | n/a | n/a | 14.356 | n/a | 0.000 | 330.434 | 1.553 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 62.222 | 330.548 | 1.000 | 62.222 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d7dd19d0169c638000000000003ac6c | 331.479 | 0.025 | n/a | 0.000 | 331.453 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 331.477 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c638000000000003ac6b | 331.466 | 0.053 | n/a | 0.000 | 331.412 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 331.465 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c638000000000003ac6a | 331.422 | 0.024 | n/a | 0.000 | 331.396 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 331.420 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c638000000000003ac69 | 331.390 | 0.036 | n/a | 0.000 | 331.353 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 331.389 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000039fd2 | 331.361 | 0.042 | n/a | 0.000 | 331.319 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 331.360 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000039fd3 | 331.358 | 0.016 | n/a | 0.000 | 331.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 331.357 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000039fd1 | 331.336 | 0.130 | n/a | 0.000 | 331.204 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 331.334 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c638000000000003ac68 | 331.290 | 0.209 | n/a | 0.000 | 331.078 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 331.287 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000039fe3 | 331.129 | 0.013 | n/a | 0.000 | 331.115 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 331.129 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000039fe2 | 331.122 | 0.012 | n/a | 0.000 | 331.109 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 331.121 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000039fe1 | 331.120 | 0.016 | n/a | 0.000 | 331.103 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 331.119 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| b1729b239e07eeae000000000003b2cb | 330.563 | 0.020 | n/a | 0.000 | 330.541 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.562 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae000000000003b2ca | 330.549 | 0.113 | n/a | 0.000 | 330.434 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 330.548 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae000000000003b2e0 | 330.242 | 0.012 | n/a | 0.000 | 330.230 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.241 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae000000000003b2df | 330.233 | 0.012 | n/a | 0.000 | 330.220 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.232 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae000000000003b2de | 330.228 | 0.020 | n/a | 0.000 | 330.206 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.227 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b0000000000000072d | 305.173 | 0.386 | n/a | 0.000 | 304.784 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 305.169 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000000749 | 304.117 | 0.031 | n/a | 0.000 | 304.083 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.114 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000000748 | 304.081 | 0.034 | n/a | 0.000 | 304.044 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 304.078 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000000747 | 304.055 | 0.079 | n/a | 0.000 | 303.973 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.052 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (956 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 272.197 | n/a | n/a | n/a | 0.199 | n/a | 0.000 | 272.074 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.160 | 272.195 | 1.000 | 0.160 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eece1a6aa4ad68b00000000000060e7c | 312.968 | 0.104 | n/a | 0.000 | 312.862 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.966 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b0000000000010a940 | 299.022 | 0.178 | n/a | 0.000 | 298.842 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 299.020 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000000863c5 | 281.469 | 0.213 | n/a | 0.000 | 281.253 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.467 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000000b13ba | 276.963 | 0.171 | n/a | 0.000 | 276.789 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.960 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000000b033d | 274.191 | 0.180 | n/a | 0.000 | 274.009 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.189 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000070c48 | 274.189 | 0.186 | n/a | 0.000 | 274.001 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.188 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000000f8999 | 273.381 | 0.098 | n/a | 0.000 | 273.281 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.379 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b0000000000008fa2b | 273.160 | 0.093 | n/a | 0.000 | 273.065 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.158 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| eece1a6aa4ad68b00000000000092f27 | 272.650 | 0.199 | n/a | 0.000 | 272.448 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.647 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b0000000000008d82a | 272.197 | 0.121 | n/a | 0.000 | 272.074 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.195 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000095afa | 272.015 | 0.194 | n/a | 0.000 | 271.817 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 272.011 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000000c9473 | 271.485 | 0.170 | n/a | 0.000 | 271.312 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.482 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000000d74d1 | 270.474 | 0.165 | n/a | 0.000 | 270.306 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.471 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b0000000000005fc7d | 269.508 | 0.131 | n/a | 0.000 | 269.375 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.506 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b0000000000010d1dc | 269.432 | 0.127 | n/a | 0.000 | 269.303 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.430 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b00000000000130c35 | 269.137 | 0.095 | n/a | 0.000 | 269.040 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.135 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.068ms |
| eece1a6aa4ad68b0000000000011fbd8 | 269.009 | 0.101 | n/a | 0.000 | 268.906 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.007 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000000e52db | 267.267 | 0.212 | n/a | 0.000 | 267.052 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 267.264 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000001193cc | 266.842 | 0.102 | n/a | 0.000 | 266.738 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.840 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b0000000000009d527 | 266.831 | 0.111 | n/a | 0.000 | 266.718 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.829 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.048ms |

## P1 / L4 / read (2368 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.000 | 0.000 | 0.019 |
| p99 | 275.394 | n/a | n/a | n/a | 0.249 | n/a | 0.000 | 275.175 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.245 | 275.391 | 1.000 | 0.245 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d7dd19d0169c6380000000000058507 | 339.134 | 0.130 | n/a | 0.000 | 339.002 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 339.132 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.078ms |
| eece1a6aa4ad68b0000000000013cf47 | 338.489 | 0.123 | n/a | 0.000 | 338.363 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 338.486 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.091ms |
| eece1a6aa4ad68b0000000000013cf48 | 338.456 | 0.029 | n/a | 0.000 | 338.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.455 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.091ms |
| b1729b239e07eeae0000000000058bf6 | 338.178 | 0.122 | n/a | 0.000 | 338.054 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 338.176 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.063ms |
| b1729b239e07eeae00000000000c057e | 281.774 | 0.100 | n/a | 0.000 | 281.671 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.771 | 1.000 | 0.003 | node-15/thread-5/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000000c05ab | 281.709 | 0.101 | n/a | 0.000 | 281.606 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.708 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000001d4629 | 281.564 | 0.108 | n/a | 0.000 | 281.453 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.561 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 9d7dd19d0169c63800000000000d4ef9 | 281.561 | 0.606 | n/a | 0.000 | 280.951 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 281.557 | 1.000 | 0.004 | node-15/thread-6/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000001d462a | 281.557 | 0.037 | n/a | 0.000 | 281.518 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.555 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| eece1a6aa4ad68b000000000001ab1ba | 281.515 | 0.027 | n/a | 0.000 | 281.487 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.514 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000001ab1b9 | 281.505 | 0.091 | n/a | 0.000 | 281.412 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.503 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000000e7d2d | 280.840 | 0.097 | n/a | 0.000 | 280.741 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.838 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| b1729b239e07eeae00000000000e8129 | 280.773 | 0.096 | n/a | 0.000 | 280.675 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.770 | 1.000 | 0.003 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.023ms |
| b1729b239e07eeae00000000000d4f2a | 280.698 | 0.163 | n/a | 0.000 | 280.531 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 280.693 | 1.000 | 0.004 | node-15/thread-5/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000001c06d2 | 280.370 | 0.039 | n/a | 0.000 | 280.330 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.369 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000001c06d1 | 280.338 | 0.185 | n/a | 0.000 | 280.149 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.334 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000000fca87 | 280.247 | 0.163 | n/a | 0.000 | 280.081 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.245 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| 9d7dd19d0169c63800000000000fbc66 | 280.182 | 0.116 | n/a | 0.000 | 280.063 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.179 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.023ms |
| eece1a6aa4ad68b000000000001e9d8b | 279.776 | 0.018 | n/a | 0.000 | 279.756 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.775 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| eece1a6aa4ad68b000000000001e9d8a | 279.734 | 0.093 | n/a | 0.000 | 279.640 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.732 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.024ms |

## P1 / L16 / read (2800 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 55.446 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 54.575 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 54.871 | 1.000 | 0.003 |
| p99 | 267.396 | n/a | n/a | n/a | 32.127 | n/a | 2.446 | 267.376 | 0.266 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.818 | 267.394 | 1.000 | 36.818 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eece1a6aa4ad68b000000000001ff9b1 | 277.344 | 0.030 | n/a | 0.000 | 277.313 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.343 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| eece1a6aa4ad68b000000000001ff9b0 | 277.330 | 0.034 | n/a | 0.000 | 277.295 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.329 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| eece1a6aa4ad68b000000000001ff9af | 277.301 | 0.120 | n/a | 0.000 | 277.178 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.299 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| eece1a6aa4ad68b000000000001ff9c7 | 276.592 | 0.013 | n/a | 0.000 | 276.578 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.591 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| eece1a6aa4ad68b000000000001ff9c5 | 276.588 | 0.031 | n/a | 0.000 | 276.557 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.587 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| eece1a6aa4ad68b000000000001ff9c6 | 276.586 | 0.016 | n/a | 0.000 | 276.569 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.585 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| b1729b239e07eeae000000000011279d | 276.355 | 0.027 | n/a | 0.000 | 276.327 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.354 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| b1729b239e07eeae000000000011279c | 276.329 | 0.119 | n/a | 0.000 | 276.207 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.326 | 1.000 | 0.003 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| b1729b239e07eeae00000000001127b0 | 275.849 | 0.013 | n/a | 0.000 | 275.835 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.848 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| b1729b239e07eeae00000000001127af | 275.842 | 0.015 | n/a | 0.000 | 275.825 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.841 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| b1729b239e07eeae00000000001127ae | 275.835 | 0.020 | n/a | 0.000 | 275.814 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.834 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 9d7dd19d0169c63800000000001109c8 | 275.323 | 0.115 | n/a | 0.000 | 275.206 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.321 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 9d7dd19d0169c63800000000001109d8 | 274.066 | 0.033 | n/a | 0.000 | 274.031 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.064 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 9d7dd19d0169c63800000000001109fc | 271.934 | 0.033 | n/a | 0.000 | 271.899 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.932 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 9d7dd19d0169c6380000000000110a05 | 271.489 | 0.023 | n/a | 0.000 | 271.463 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.486 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 9d7dd19d0169c6380000000000110a06 | 271.481 | 0.048 | n/a | 0.000 | 271.430 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.478 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| b1729b239e07eeae0000000000112269 | 269.327 | 0.096 | n/a | 0.000 | 269.230 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.326 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae0000000000112268 | 269.255 | 0.015 | n/a | 0.000 | 269.239 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.254 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae0000000000112267 | 269.223 | 0.068 | n/a | 0.000 | 269.154 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.221 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae0000000000112278 | 268.959 | 0.035 | n/a | 0.000 | 268.922 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.958 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |

## P1 / L64 / read (6340 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.414 | n/a | n/a | n/a | 0.154 | n/a | 0.000 | 53.101 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 61.063 | 1.000 | 0.003 |
| p99 | 678.684 | n/a | n/a | n/a | 171.189 | n/a | 43.075 | 263.355 | 198.062 | 1.273 | 72.011 | n/a | 0.005 | 0.000 | n/a | n/a | 396.675 | 300.873 | 1.000 | 396.675 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eece1a6aa4ad68b0000000000025debf | 1713.015 | 230.625 | n/a | 54.513 | 278.103 | 143.640 | 1.349 | 55.086 | n/a | 0.002 | 0.000 | n/a | n/a | 949.697 | 563.241 | 0.329 | 949.697 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; reader.observe 29.261ms; client.reach-decode-and-cache 28.300ms |
| eece1a6aa4ad68b0000000000025dec6 | 1571.923 | 188.538 | n/a | 42.900 | 342.681 | 871.420 | 59.936 | 66.425 | n/a | 0.019 | 0.000 | n/a | n/a | 0.004 | 574.119 | 0.365 | 0.004 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; reader.observe 29.261ms; client.reach-decode-and-cache 28.300ms |
| eece1a6aa4ad68b0000000000025dec3 | 1485.125 | 559.734 | n/a | 184.927 | 314.419 | 6.486 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 419.559 | 1059.081 | 0.713 | 419.559 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; reader.observe 29.261ms; reader.observe 23.395ms |
| eece1a6aa4ad68b0000000000025dec2 | 1333.811 | 40.545 | n/a | 10.918 | 0.000 | 397.168 | 0.579 | 59.856 | n/a | 0.002 | 0.000 | n/a | n/a | 824.743 | 51.463 | 0.039 | 824.743 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; reader.observe 29.261ms; client.reach-decode-and-cache 28.300ms |
| eece1a6aa4ad68b0000000000025dec8 | 1135.661 | 334.694 | n/a | 114.456 | 0.000 | 0.507 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 686.005 | 449.149 | 0.395 | 686.005 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; reader.observe 29.261ms; client.reach-decode-and-cache 28.300ms |
| eece1a6aa4ad68b0000000000025dec7 | 1007.922 | 23.168 | n/a | 0.000 | 0.000 | 431.777 | 0.227 | 71.648 | n/a | 0.002 | 0.000 | n/a | n/a | 481.100 | 23.168 | 0.023 | 481.100 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; reader.observe 29.261ms; client.reach-decode-and-cache 28.300ms |
| 9d7dd19d0169c638000000000016d7c7 | 952.667 | 88.554 | n/a | 18.544 | 0.000 | 630.673 | 12.087 | 88.102 | n/a | 0.002 | 0.000 | n/a | n/a | 114.704 | 107.098 | 0.112 | 114.704 | node-15/thread-6/socket.wait-first-byte | reader.observe 62.627ms; reader.observe 58.404ms; reader.observe 53.129ms; reader.observe 42.379ms; reader.observe 32.807ms |
| eece1a6aa4ad68b0000000000025deaf | 911.052 | 57.291 | n/a | 0.000 | 120.127 | 535.238 | 5.239 | 75.638 | n/a | 0.002 | 0.000 | n/a | n/a | 117.517 | 177.418 | 0.195 | 117.517 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; reader.observe 29.261ms; client.reach-decode-and-cache 28.300ms |
| eece1a6aa4ad68b0000000000025deae | 897.876 | 77.442 | n/a | 23.820 | 198.374 | 428.885 | 0.317 | 68.933 | n/a | 0.004 | 0.000 | n/a | n/a | 100.101 | 299.636 | 0.334 | 100.101 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; reader.observe 29.261ms; client.reach-decode-and-cache 28.300ms |
| 9d7dd19d0169c638000000000016d7bf | 878.399 | 78.678 | n/a | 25.350 | 0.000 | 555.391 | 12.334 | 83.491 | n/a | 0.004 | 0.000 | n/a | n/a | 123.151 | 104.028 | 0.118 | 123.151 | node-15/thread-6/socket.wait-first-byte | reader.observe 62.627ms; reader.observe 58.404ms; reader.observe 42.379ms; reader.observe 32.807ms; reader.observe 18.523ms |
| eece1a6aa4ad68b00000000000264104 | 875.572 | 85.619 | n/a | 30.801 | 242.206 | 0.860 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 516.087 | 358.625 | 0.410 | 516.087 | node-15/thread-4/socket.wait-first-byte | client.parse 90.046ms; reader.observe 75.965ms; client.reach-decode-and-cache 41.283ms; reader.observe 40.106ms; client.reach-decode-and-cache 37.308ms |
| eece1a6aa4ad68b0000000000025dec1 | 852.142 | 25.340 | n/a | 0.000 | 0.000 | 390.738 | 0.382 | 59.514 | n/a | 0.002 | 0.000 | n/a | n/a | 376.166 | 25.340 | 0.030 | 376.166 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; reader.observe 29.261ms; client.reach-decode-and-cache 28.300ms |
| eece1a6aa4ad68b0000000000025deb6 | 846.389 | 82.232 | n/a | 18.882 | 0.000 | 578.235 | 0.656 | 79.552 | n/a | 0.002 | 0.000 | n/a | n/a | 86.830 | 101.113 | 0.119 | 86.830 | node-15/thread-4/socket.wait-first-byte | replica.apply-delta 137.634ms; reader.observe 40.126ms; reader.observe 30.772ms; client.reach-decode-and-cache 28.300ms; reader.observe 23.395ms |
| eece1a6aa4ad68b00000000000264103 | 844.489 | 101.840 | n/a | 29.493 | 236.661 | 0.691 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 475.804 | 367.994 | 0.436 | 475.804 | node-15/thread-4/socket.wait-first-byte | client.parse 90.046ms; reader.observe 75.965ms; client.reach-decode-and-cache 41.283ms; reader.observe 40.106ms; client.reach-decode-and-cache 37.308ms |
| 9d7dd19d0169c638000000000016d86c | 832.922 | 71.042 | n/a | 23.118 | 0.000 | 0.482 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 738.280 | 94.160 | 0.113 | 738.280 | node-15/thread-6/socket.wait-first-byte | reader.observe 62.627ms; reader.observe 58.404ms; reader.observe 53.129ms; reader.observe 42.653ms; reader.observe 42.379ms |
| 9d7dd19d0169c638000000000016d869 | 831.714 | 33.039 | n/a | 16.803 | 8.450 | 5.358 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 768.063 | 58.292 | 0.070 | 768.063 | node-15/thread-6/socket.wait-first-byte | reader.observe 62.627ms; reader.observe 58.404ms; reader.observe 53.129ms; reader.observe 42.653ms; reader.observe 42.379ms |
| 9d7dd19d0169c638000000000016d86b | 823.035 | 71.898 | n/a | 15.277 | 0.000 | 0.596 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 735.264 | 87.175 | 0.106 | 735.264 | node-15/thread-6/socket.wait-first-byte | reader.observe 62.627ms; reader.observe 58.404ms; reader.observe 53.129ms; reader.observe 42.653ms; reader.observe 42.379ms |
| b1729b239e07eeae000000000015e86d | 809.658 | 243.623 | n/a | 45.313 | 103.463 | 66.135 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 351.124 | 392.399 | 0.485 | 351.124 | node-15/thread-5/socket.wait-first-byte | reader.observe 41.096ms; reader.observe 28.845ms; client.reach-decode-and-cache 16.185ms; reader.observe 8.814ms; client.reach-decode-and-cache 7.930ms |
| eece1a6aa4ad68b00000000000263eb8 | 808.903 | 81.615 | n/a | 11.580 | 297.510 | 3.636 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 414.563 | 390.705 | 0.483 | 414.563 | node-15/thread-4/socket.wait-first-byte | reader.observe 32.800ms; client.reach-decode-and-cache 28.383ms; reader.observe 18.885ms; reader.observe 16.619ms; client.parse 7.064ms |
| eece1a6aa4ad68b000000000002640fd | 806.303 | 171.189 | n/a | 154.013 | 0.000 | 3.208 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 477.893 | 325.202 | 0.403 | 477.893 | node-15/thread-4/socket.wait-first-byte | client.parse 90.046ms; reader.observe 75.965ms; client.reach-decode-and-cache 41.283ms; reader.observe 40.106ms; client.reach-decode-and-cache 37.308ms |

## P1 / L256 / read (14108 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 230.113 | n/a | n/a | n/a | 0.028 | n/a | 0.000 | 230.008 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 230.112 | 1.000 | 0.001 |
| p99 | 311.789 | n/a | n/a | n/a | 4.355 | n/a | 0.000 | 311.763 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.311 | 311.788 | 1.000 | 0.311 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d7dd19d0169c63800000000001b73aa | 328.881 | 0.250 | n/a | 0.000 | 328.629 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 328.879 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73ab | 328.776 | 0.035 | n/a | 0.000 | 328.739 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 328.774 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73ac | 328.769 | 0.014 | n/a | 0.000 | 328.753 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 328.768 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000002a8ec6 | 327.186 | 0.025 | n/a | 0.000 | 327.159 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.184 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000001bbbdc | 327.152 | 0.058 | n/a | 0.000 | 327.092 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 327.150 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000002a8ec5 | 327.150 | 0.037 | n/a | 0.000 | 327.112 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.148 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000002a8ec4 | 327.093 | 0.037 | n/a | 0.000 | 327.054 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 327.091 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| eece1a6aa4ad68b000000000002a8ec3 | 327.006 | 0.198 | n/a | 0.000 | 326.805 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 327.003 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73f3 | 325.962 | 0.148 | n/a | 0.000 | 325.813 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 325.960 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73f4 | 325.868 | 0.039 | n/a | 0.000 | 325.818 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 325.857 | 1.000 | 0.011 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73fa | 325.866 | 0.154 | n/a | 0.000 | 325.710 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.865 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73f7 | 325.850 | 0.027 | n/a | 0.000 | 325.821 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.848 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73f5 | 325.849 | 0.025 | n/a | 0.000 | 325.821 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.846 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73f6 | 325.848 | 0.026 | n/a | 0.000 | 325.817 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 325.844 | 1.000 | 0.004 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73f8 | 325.846 | 0.021 | n/a | 0.000 | 325.822 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 325.843 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73f9 | 325.833 | 0.015 | n/a | 0.000 | 325.817 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.832 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73fb | 325.778 | 0.147 | n/a | 0.000 | 325.629 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.776 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000001b73fc | 325.677 | 0.132 | n/a | 0.000 | 325.543 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.675 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000001bbbda | 325.623 | 0.132 | n/a | 0.000 | 325.490 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 325.622 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000001bbbdb | 325.602 | 0.028 | n/a | 0.000 | 325.572 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.600 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (45139 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 156.510 | n/a | n/a | n/a | 0.020 | n/a | 0.000 | 156.444 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 156.509 | 1.000 | 0.001 |
| p99 | 258.021 | n/a | n/a | n/a | 13.918 | n/a | 3.682 | 257.962 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.188 | 258.020 | 1.000 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1729b239e07eeae00000000002f50b6 | 279.313 | 0.023 | n/a | 0.000 | 279.288 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.312 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50b4 | 279.311 | 0.023 | n/a | 0.000 | 279.287 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.310 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50b5 | 279.310 | 0.023 | n/a | 0.000 | 279.287 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.310 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50b3 | 279.301 | 0.013 | n/a | 0.000 | 279.287 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.300 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50b2 | 279.298 | 0.012 | n/a | 0.000 | 279.286 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.297 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50b1 | 279.291 | 0.012 | n/a | 0.000 | 279.278 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.290 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50b0 | 279.285 | 0.011 | n/a | 0.000 | 279.272 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.284 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50af | 279.279 | 0.012 | n/a | 0.000 | 279.266 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.278 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50ae | 279.271 | 0.012 | n/a | 0.000 | 279.258 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.270 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50ad | 279.269 | 0.012 | n/a | 0.000 | 279.255 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.268 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50ab | 279.263 | 0.027 | n/a | 0.000 | 279.235 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.262 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50ac | 279.259 | 0.012 | n/a | 0.000 | 279.245 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.258 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50aa | 279.252 | 0.013 | n/a | 0.000 | 279.238 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.251 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50a9 | 279.244 | 0.023 | n/a | 0.000 | 279.220 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.243 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50a8 | 279.225 | 0.012 | n/a | 0.000 | 279.212 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.224 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50a7 | 279.221 | 0.013 | n/a | 0.000 | 279.207 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.220 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50a5 | 279.216 | 0.041 | n/a | 0.000 | 279.173 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.214 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50a6 | 279.214 | 0.019 | n/a | 0.000 | 279.194 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.213 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| b1729b239e07eeae00000000002f50a4 | 279.192 | 0.128 | n/a | 0.000 | 279.062 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.190 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | none observed |
| 9d7dd19d0169c63800000000002ef1a1 | 277.865 | 0.013 | n/a | 0.000 | 277.851 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.864 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |

## P1 / tail / read (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 0.000 | 0.000 | 0.027 |
| p99 | 0.118 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1729b239e07eeae00000000003003e0 | 0.118 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6a6 | 0.114 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa69f | 0.111 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | uncovered | none observed |
| b1729b239e07eeae00000000003003d8 | 0.099 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | uncovered | none observed |
| b1729b239e07eeae00000000003003e1 | 0.058 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.058 | 0.000 | 0.000 | 0.058 | uncovered | none observed |
| b1729b239e07eeae00000000003003d7 | 0.049 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.049 | 0.000 | 0.000 | 0.049 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6ad | 0.040 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.040 | 0.000 | 0.000 | 0.040 | uncovered | none observed |
| b1729b239e07eeae00000000003003d9 | 0.037 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.037 | 0.000 | 0.000 | 0.037 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6a2 | 0.036 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 0.000 | 0.000 | 0.036 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6a7 | 0.036 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 0.000 | 0.000 | 0.036 | uncovered | none observed |
| b1729b239e07eeae00000000003003dc | 0.035 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.035 | 0.000 | 0.000 | 0.035 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6a5 | 0.034 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.034 | 0.000 | 0.000 | 0.034 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6a8 | 0.031 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 0.000 | 0.000 | 0.031 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6a9 | 0.028 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 0.000 | 0.000 | 0.028 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa69d | 0.028 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 0.000 | 0.000 | 0.028 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6ac | 0.027 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 0.000 | 0.000 | 0.027 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6a4 | 0.022 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.000 | 0.000 | 0.022 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6a3 | 0.020 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 0.000 | 0.000 | 0.020 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6a0 | 0.019 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.000 | 0.000 | 0.019 | uncovered | none observed |
| 9d7dd19d0169c63800000000002fa6ab | 0.018 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 | uncovered | none observed |

## P3 / outside-phases / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.187 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 200.686 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 403.432 | n/a | n/a | n/a | 18.114 | n/a | 1.318 | 0.000 | 5.917 | 396.733 | 0.101 | n/a | 0.121 | 0.000 | n/a | n/a | 32.718 | 19.428 | 0.270 | 32.718 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d90000000000000002 | 403.432 | 2.487 | n/a | 0.000 | 0.000 | 3.716 | 396.733 | 0.101 | n/a | 0.081 | 0.000 | n/a | n/a | 0.313 | 2.487 | 0.006 | 0.313 | gw-r/thread-44/gateway.admitted-work | none observed |
| 629e813a778b18eb0000000000000005 | 206.430 | 0.000 | n/a | 0.000 | 0.000 | 1.273 | 204.678 | 0.010 | n/a | 0.121 | 0.000 | n/a | n/a | 0.349 | 0.000 | 0.000 | 0.349 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb0000000000000006 | 202.270 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 201.168 | 0.011 | n/a | 0.117 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-46/journal/page | none observed |
| 629e813a778b18eb000000000000135a | 201.620 | 0.000 | n/a | 0.000 | 0.000 | 0.519 | 200.941 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-94/journal/page | none observed |
| 629e813a778b18eb000000000000135e | 201.388 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 200.731 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-129/journal/page | none observed |
| 629e813a778b18eb000000000000135b | 201.271 | 0.000 | n/a | 0.000 | 0.000 | 0.413 | 200.705 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-114/journal/page | none observed |
| 629e813a778b18eb000000000000135c | 201.187 | 0.000 | n/a | 0.000 | 0.000 | 0.369 | 200.686 | 0.012 | n/a | 0.048 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-68/journal/page | none observed |
| 629e813a778b18eb000000000000135d | 201.160 | 0.000 | n/a | 0.000 | 0.000 | 0.501 | 200.528 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-110/journal/page | none observed |
| 629e813a778b18eb0000000000001363 | 83.452 | 17.026 | n/a | 0.000 | 0.000 | 3.137 | 63.025 | 0.005 | n/a | 0.008 | 0.000 | n/a | n/a | 0.251 | 17.026 | 0.204 | 0.251 | gw-r/thread-108/gateway.admitted-work | none observed |
| 629e813a778b18eb0000000000001361 | 74.603 | 18.111 | n/a | 1.318 | 0.000 | 2.511 | 52.521 | 0.006 | n/a | 0.006 | 0.000 | n/a | n/a | 0.131 | 19.428 | 0.260 | 0.131 | gw-r/thread-83/gateway.admitted-work | none observed |
| 629e813a778b18eb0000000000001362 | 73.288 | 18.114 | n/a | 0.000 | 0.000 | 2.030 | 52.881 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.253 | 18.114 | 0.247 | 0.253 | gw-r/thread-85/gateway.admitted-work | none observed |
| 629e813a778b18eb0000000000001364 | 52.925 | 14.289 | n/a | 0.000 | 0.000 | 5.917 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.718 | 14.289 | 0.270 | 32.718 | node-15/thread-8/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1005.175 | n/a | n/a | n/a | 0.249 | n/a | 0.000 | 0.000 | 1.800 | 1001.691 | 0.014 | n/a | 0.168 | 0.000 | n/a | n/a | 1.134 | 0.249 | 0.000 | 1.134 |
| p99 | 16602.380 | n/a | n/a | n/a | 0.249 | n/a | 0.000 | 0.000 | 15595.858 | 1005.055 | 0.036 | n/a | 0.193 | 0.000 | n/a | n/a | 1.271 | 0.249 | 0.000 | 1.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d900000000000000a4 | 16602.380 | 0.203 | n/a | 0.000 | 0.000 | 15595.858 | 1005.055 | 0.011 | n/a | 0.193 | 0.000 | n/a | n/a | 1.060 | 0.203 | 0.000 | 1.060 | node-15/thread-2/socket.wait-first-byte | none observed |
| a3cd05a76876e1d900000000000000a5 | 1005.175 | 0.249 | n/a | 0.000 | 0.000 | 1.800 | 1001.691 | 0.014 | n/a | 0.150 | 0.000 | n/a | n/a | 1.271 | 0.249 | 0.000 | 1.271 | gw-r/thread-47/journal/page | none observed |
| a3cd05a76876e1d900000000000000a6 | 1004.005 | 0.249 | n/a | 0.000 | 0.000 | 0.886 | 1001.533 | 0.036 | n/a | 0.168 | 0.000 | n/a | n/a | 1.134 | 0.249 | 0.000 | 1.134 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 440.649 | n/a | n/a | n/a | 5.017 | n/a | 0.909 | 0.000 | 2.305 | 437.066 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.173 | 6.507 | 0.019 | 0.173 |
| p99 | 1012.326 | n/a | n/a | n/a | 26.868 | n/a | 9.583 | 0.000 | 37.167 | 999.047 | 0.022 | n/a | 0.137 | 0.000 | n/a | n/a | 3.091 | 36.451 | 0.406 | 3.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d900000000000000d1 | 1012.326 | 13.076 | n/a | 0.547 | 0.000 | 4.673 | 993.702 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.242 | 13.623 | 0.013 | 0.242 | gw-r/thread-66/journal/page | none observed |
| a3cd05a76876e1d900000000000000bd | 1007.174 | 3.347 | n/a | 0.517 | 0.000 | 4.089 | 999.047 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.091 | 3.864 | 0.004 | 0.091 | gw-r/thread-73/journal/page | none observed |
| a3cd05a76876e1d900000000000000b6 | 1000.122 | 24.482 | n/a | 0.000 | 0.000 | 1.257 | 973.421 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.877 | 24.482 | 0.024 | 0.877 | gw-r/thread-75/journal/page | none observed |
| a3cd05a76876e1d900000000000000b0 | 986.258 | 3.199 | n/a | 0.830 | 0.000 | 4.358 | 977.663 | 0.011 | n/a | 0.124 | 0.000 | n/a | n/a | 0.073 | 4.029 | 0.004 | 0.073 | gw-r/thread-44/journal/page | none observed |
| a3cd05a76876e1d900000000000000bc | 947.593 | 7.785 | n/a | 8.774 | 0.000 | 6.811 | 923.901 | 0.018 | n/a | 0.115 | 0.000 | n/a | n/a | 0.189 | 16.559 | 0.017 | 0.189 | gw-r/thread-67/journal/page | none observed |
| a3cd05a76876e1d900000000000000ad | 917.104 | 6.746 | n/a | 7.819 | 0.000 | 3.063 | 899.193 | 0.012 | n/a | 0.080 | 0.000 | n/a | n/a | 0.191 | 14.565 | 0.016 | 0.191 | gw-r/thread-67/journal/page | none observed |
| a3cd05a76876e1d900000000000000c3 | 906.890 | 15.144 | n/a | 3.816 | 0.000 | 0.717 | 886.941 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.173 | 18.959 | 0.021 | 0.173 | gw-r/thread-69/journal/page | none observed |
| a3cd05a76876e1d900000000000000aa | 851.890 | 3.758 | n/a | 4.688 | 0.000 | 1.624 | 841.548 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.181 | 8.446 | 0.010 | 0.181 | gw-r/thread-45/journal/page | none observed |
| a3cd05a76876e1d900000000000000cc | 700.245 | 3.117 | n/a | 0.000 | 0.000 | 0.889 | 696.075 | 0.022 | n/a | 0.066 | 0.000 | n/a | n/a | 0.075 | 3.117 | 0.004 | 0.075 | gw-r/thread-45/journal/page | none observed |
| a3cd05a76876e1d900000000000000b5 | 608.439 | 5.017 | n/a | 0.987 | 0.000 | 4.716 | 596.256 | 0.020 | n/a | 0.135 | 0.000 | n/a | n/a | 1.308 | 6.004 | 0.010 | 1.308 | gw-r/thread-41/journal/page | none observed |
| a3cd05a76876e1d900000000000000cb | 569.436 | 4.702 | n/a | 1.805 | 0.000 | 6.962 | 555.769 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.114 | 6.507 | 0.011 | 0.114 | gw-r/thread-75/journal/page | none observed |
| a3cd05a76876e1d900000000000000c1 | 532.480 | 17.427 | n/a | 0.781 | 0.000 | 1.194 | 512.876 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.085 | 18.207 | 0.034 | 0.085 | gw-r/thread-41/journal/page | none observed |
| a3cd05a76876e1d900000000000000c8 | 514.053 | 2.801 | n/a | 6.440 | 0.000 | 7.169 | 497.416 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.123 | 9.240 | 0.018 | 0.123 | gw-r/thread-70/journal/page | none observed |
| a3cd05a76876e1d900000000000000c6 | 503.036 | 2.383 | n/a | 0.000 | 0.000 | 0.663 | 499.825 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.076 | 2.383 | 0.005 | 0.076 | gw-r/thread-46/journal/page | none observed |
| a3cd05a76876e1d900000000000000c9 | 440.649 | 2.660 | n/a | 0.000 | 0.000 | 0.781 | 437.066 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.067 | 2.660 | 0.006 | 0.067 | gw-r/thread-67/journal/page | none observed |
| a3cd05a76876e1d900000000000000b9 | 435.958 | 4.496 | n/a | 0.567 | 0.000 | 22.843 | 407.887 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.121 | 5.064 | 0.012 | 0.121 | gw-r/thread-62/journal/page | none observed |
| a3cd05a76876e1d900000000000000b2 | 325.613 | 6.607 | n/a | 9.392 | 0.000 | 0.797 | 308.589 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.122 | 16.000 | 0.049 | 0.122 | gw-r/thread-69/journal/page | none observed |
| a3cd05a76876e1d900000000000000a9 | 325.078 | 5.604 | n/a | 0.521 | 0.000 | 37.167 | 281.255 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.423 | 6.124 | 0.019 | 0.423 | gw-r/thread-75/journal/page | none observed |
| a3cd05a76876e1d900000000000000ba | 311.519 | 8.921 | n/a | 2.245 | 0.000 | 2.635 | 297.170 | 0.021 | n/a | 0.137 | 0.000 | n/a | n/a | 0.389 | 11.165 | 0.036 | 0.389 | gw-r/thread-47/journal/page | none observed |
| a3cd05a76876e1d900000000000000cd | 284.840 | 4.730 | n/a | 0.694 | 0.000 | 1.249 | 277.879 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.218 | 5.425 | 0.019 | 0.218 | gw-r/thread-71/journal/page | none observed |

## P3 / L1 / internal (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 426.650 | n/a | n/a | n/a | 3.226 | n/a | 0.000 | 0.000 | 0.650 | 423.484 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.082 | 3.288 | 0.009 | 0.082 |
| p99 | 1006.906 | n/a | n/a | n/a | 16.486 | n/a | 2.023 | 0.000 | 9.578 | 1003.278 | 2.009 | n/a | 2.918 | 0.000 | n/a | n/a | 42.187 | 18.509 | 0.771 | 42.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d900000000000000d3 | 1006.906 | 0.128 | n/a | 0.000 | 0.000 | 1.504 | 1003.278 | 0.009 | n/a | 0.100 | 0.000 | n/a | n/a | 1.887 | 0.128 | 0.000 | 1.887 | gw-r/thread-65/journal/page | none observed |
| a3cd05a76876e1d90000000000000100 | 1005.706 | 5.632 | n/a | 0.000 | 0.000 | 0.953 | 998.933 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.131 | 5.632 | 0.006 | 0.131 | gw-r/thread-48/journal/page | none observed |
| a3cd05a76876e1d900000000000000e0 | 1003.880 | 0.123 | n/a | 0.000 | 0.000 | 0.547 | 1002.014 | 0.016 | n/a | 0.083 | 0.000 | n/a | n/a | 1.096 | 0.123 | 0.000 | 1.096 | gw-r/thread-73/journal/page | none observed |
| a3cd05a76876e1d9000000000000011e | 1002.627 | 0.113 | n/a | 0.000 | 0.000 | 0.496 | 1000.809 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 1.135 | 0.113 | 0.000 | 1.135 | gw-r/thread-62/journal/page | none observed |
| a3cd05a76876e1d90000000000000155 | 1001.891 | 2.405 | n/a | 0.000 | 0.000 | 0.738 | 998.644 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.068 | 2.405 | 0.002 | 0.068 | gw-r/thread-41/journal/page | none observed |
| a3cd05a76876e1d900000000000000db | 1000.781 | 7.318 | n/a | 1.080 | 0.000 | 0.454 | 991.646 | 0.033 | n/a | 0.101 | 0.000 | n/a | n/a | 0.148 | 8.398 | 0.008 | 0.148 | gw-r/thread-44/journal/page | none observed |
| a3cd05a76876e1d90000000000000116 | 999.366 | 2.825 | n/a | 0.000 | 0.000 | 0.391 | 996.032 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.061 | 2.825 | 0.003 | 0.061 | gw-r/thread-48/journal/page | none observed |
| a3cd05a76876e1d900000000000000da | 996.727 | 3.144 | n/a | 0.000 | 0.000 | 0.576 | 992.845 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.084 | 3.144 | 0.003 | 0.084 | gw-r/thread-48/journal/page | none observed |
| a3cd05a76876e1d9000000000000012d | 996.594 | 5.288 | n/a | 0.000 | 0.000 | 0.919 | 990.255 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.075 | 5.288 | 0.005 | 0.075 | gw-r/thread-72/journal/page | none observed |
| a3cd05a76876e1d9000000000000012c | 996.283 | 2.854 | n/a | 0.000 | 0.000 | 0.384 | 992.893 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.108 | 2.854 | 0.003 | 0.108 | gw-r/thread-68/journal/page | none observed |
| a3cd05a76876e1d900000000000000df | 993.001 | 3.240 | n/a | 1.022 | 0.000 | 0.485 | 988.104 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.079 | 4.262 | 0.004 | 0.079 | gw-r/thread-45/journal/page | none observed |
| a3cd05a76876e1d9000000000000010f | 992.789 | 2.785 | n/a | 0.000 | 0.000 | 0.417 | 989.444 | 0.015 | n/a | 0.072 | 0.000 | n/a | n/a | 0.056 | 2.785 | 0.003 | 0.056 | gw-r/thread-48/journal/page | none observed |
| a3cd05a76876e1d90000000000000139 | 992.283 | 3.900 | n/a | 0.000 | 0.000 | 0.941 | 987.258 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.135 | 3.900 | 0.004 | 0.135 | gw-r/thread-65/journal/page | none observed |
| a3cd05a76876e1d90000000000000107 | 991.527 | 2.663 | n/a | 0.581 | 0.000 | 0.575 | 987.521 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.093 | 3.243 | 0.003 | 0.093 | gw-r/thread-62/journal/page | none observed |
| a3cd05a76876e1d900000000000000d2 | 971.262 | 3.036 | n/a | 0.000 | 0.000 | 0.489 | 967.593 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.075 | 3.036 | 0.003 | 0.075 | gw-r/thread-65/journal/page | none observed |
| a3cd05a76876e1d90000000000000103 | 946.783 | 5.538 | n/a | 0.000 | 0.000 | 0.610 | 940.466 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.111 | 5.538 | 0.006 | 0.111 | gw-r/thread-75/journal/page | none observed |
| a3cd05a76876e1d90000000000000128 | 931.269 | 2.545 | n/a | 0.000 | 0.000 | 1.988 | 926.624 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.056 | 2.545 | 0.003 | 0.056 | gw-r/thread-74/journal/page | none observed |
| a3cd05a76876e1d90000000000000113 | 908.594 | 2.206 | n/a | 0.661 | 0.000 | 0.615 | 904.985 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.079 | 2.867 | 0.003 | 0.079 | gw-r/thread-69/journal/page | none observed |
| a3cd05a76876e1d90000000000000142 | 903.543 | 7.085 | n/a | 0.000 | 0.000 | 0.475 | 895.887 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.064 | 7.085 | 0.008 | 0.064 | gw-r/thread-65/journal/page | none observed |
| a3cd05a76876e1d90000000000000104 | 852.045 | 2.521 | n/a | 0.000 | 0.000 | 0.411 | 848.984 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.057 | 2.521 | 0.003 | 0.057 | gw-r/thread-68/journal/page | none observed |

## P3 / L4 / internal (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 366.986 | n/a | n/a | n/a | 3.472 | n/a | 0.000 | 0.000 | 1.068 | 358.091 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.076 | 3.472 | 0.010 | 0.076 |
| p99 | 1009.095 | n/a | n/a | n/a | 10.440 | n/a | 0.676 | 0.000 | 8.507 | 1003.195 | 0.030 | n/a | 0.085 | 0.000 | n/a | n/a | 37.423 | 10.513 | 0.125 | 37.423 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d900000000000001e8 | 1012.915 | 2.213 | n/a | 0.000 | 0.000 | 4.690 | 1005.899 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.068 | 2.213 | 0.002 | 0.068 | gw-r/thread-62/journal/page | none observed |
| a3cd05a76876e1d900000000000001fc | 1009.095 | 0.158 | n/a | 0.000 | 0.000 | 6.790 | 1000.897 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 1.181 | 0.158 | 0.000 | 1.181 | gw-r/thread-71/journal/page | none observed |
| a3cd05a76876e1d90000000000000165 | 1005.605 | 4.295 | n/a | 0.000 | 0.000 | 0.398 | 999.115 | 0.008 | n/a | 1.730 | 0.000 | n/a | n/a | 0.060 | 4.295 | 0.004 | 0.060 | gw-r/thread-45/journal/page | none observed |
| a3cd05a76876e1d90000000000000189 | 1005.243 | 0.134 | n/a | 0.000 | 0.000 | 0.728 | 1003.195 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 1.121 | 0.134 | 0.000 | 1.121 | gw-r/thread-47/journal/page | none observed |
| a3cd05a76876e1d900000000000001a5 | 1002.840 | 2.372 | n/a | 0.000 | 0.000 | 2.771 | 997.576 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.066 | 2.372 | 0.002 | 0.066 | gw-r/thread-66/journal/page | none observed |
| a3cd05a76876e1d9000000000000016e | 1001.061 | 4.649 | n/a | 0.000 | 0.000 | 0.856 | 995.457 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.066 | 4.649 | 0.005 | 0.066 | gw-r/thread-44/journal/page | none observed |
| a3cd05a76876e1d90000000000000185 | 1000.120 | 5.730 | n/a | 0.000 | 0.000 | 0.960 | 993.276 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.075 | 5.730 | 0.006 | 0.075 | gw-r/thread-66/journal/page | none observed |
| a3cd05a76876e1d9000000000000017e | 997.510 | 2.688 | n/a | 0.000 | 0.000 | 0.996 | 993.709 | 0.017 | n/a | 0.042 | 0.000 | n/a | n/a | 0.059 | 2.688 | 0.003 | 0.059 | gw-r/thread-74/journal/page | none observed |
| a3cd05a76876e1d900000000000001c3 | 997.299 | 7.492 | n/a | 0.000 | 0.000 | 0.373 | 989.265 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.121 | 7.492 | 0.008 | 0.121 | gw-r/thread-46/journal/page | none observed |
| a3cd05a76876e1d900000000000001c2 | 995.702 | 3.240 | n/a | 0.000 | 0.000 | 1.287 | 991.056 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.076 | 3.240 | 0.003 | 0.076 | gw-r/thread-44/journal/page | none observed |
| a3cd05a76876e1d90000000000000184 | 991.635 | 4.396 | n/a | 0.000 | 0.000 | 0.897 | 986.229 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.065 | 4.396 | 0.004 | 0.065 | gw-r/thread-47/journal/page | none observed |
| a3cd05a76876e1d90000000000000199 | 989.174 | 3.707 | n/a | 0.000 | 0.000 | 2.214 | 983.143 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.066 | 3.707 | 0.004 | 0.066 | gw-r/thread-68/journal/page | none observed |
| a3cd05a76876e1d900000000000001a6 | 981.894 | 4.353 | n/a | 0.000 | 0.000 | 0.854 | 976.549 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.076 | 4.353 | 0.004 | 0.076 | gw-r/thread-69/journal/page | none observed |
| a3cd05a76876e1d90000000000000174 | 902.680 | 7.231 | n/a | 0.000 | 0.000 | 1.050 | 894.270 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.065 | 7.231 | 0.008 | 0.065 | gw-r/thread-41/journal/page | none observed |
| a3cd05a76876e1d900000000000001a4 | 859.730 | 7.040 | n/a | 0.000 | 0.000 | 3.009 | 849.558 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.062 | 7.040 | 0.008 | 0.062 | gw-r/thread-70/journal/page | none observed |
| a3cd05a76876e1d9000000000000019b | 854.470 | 9.265 | n/a | 0.000 | 0.000 | 0.507 | 844.581 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.073 | 9.265 | 0.011 | 0.073 | gw-r/thread-47/journal/page | none observed |
| a3cd05a76876e1d900000000000001d3 | 821.487 | 1.763 | n/a | 0.000 | 0.000 | 0.827 | 818.757 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.080 | 1.763 | 0.002 | 0.080 | gw-r/thread-72/journal/page | none observed |
| a3cd05a76876e1d900000000000001db | 782.652 | 2.750 | n/a | 0.000 | 0.000 | 4.070 | 775.682 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.072 | 2.750 | 0.004 | 0.072 | gw-r/thread-45/journal/page | none observed |
| a3cd05a76876e1d900000000000001ee | 780.190 | 3.536 | n/a | 0.000 | 0.000 | 15.602 | 760.908 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.090 | 3.536 | 0.005 | 0.090 | gw-r/thread-70/journal/page | none observed |
| a3cd05a76876e1d900000000000001f5 | 766.426 | 4.119 | n/a | 0.000 | 0.000 | 5.058 | 757.135 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.062 | 4.119 | 0.005 | 0.062 | gw-r/thread-75/journal/page | none observed |

## P3 / L16 / internal (1483 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.970 | n/a | n/a | n/a | 3.645 | n/a | 0.000 | 0.000 | 0.251 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.341 | 3.647 | 0.290 | 7.341 |
| p99 | 242.861 | n/a | n/a | n/a | 17.835 | n/a | 1.710 | 0.000 | 3.571 | 235.018 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 48.885 | 18.345 | 0.839 | 48.885 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d90000000000000211 | 1005.669 | 2.303 | n/a | 0.000 | 0.000 | 0.594 | 1002.658 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.063 | 2.303 | 0.002 | 0.063 | gw-r/thread-69/journal/page | none observed |
| a3cd05a76876e1d90000000000000215 | 1004.434 | 0.136 | n/a | 0.000 | 0.000 | 1.558 | 1001.567 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 1.113 | 0.136 | 0.000 | 1.113 | gw-r/thread-73/journal/page | none observed |
| a3cd05a76876e1d90000000000000223 | 1002.367 | 0.120 | n/a | 0.000 | 0.000 | 0.369 | 1000.710 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 1.111 | 0.120 | 0.000 | 1.111 | gw-r/thread-71/journal/page | none observed |
| a3cd05a76876e1d90000000000000210 | 1001.744 | 4.330 | n/a | 0.000 | 0.000 | 1.094 | 996.209 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.071 | 4.330 | 0.004 | 0.071 | gw-r/thread-45/journal/page | none observed |
| a3cd05a76876e1d90000000000000217 | 968.516 | 2.301 | n/a | 0.000 | 0.000 | 0.519 | 965.553 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.096 | 2.301 | 0.002 | 0.096 | gw-r/thread-71/journal/page | none observed |
| a3cd05a76876e1d90000000000000218 | 936.959 | 3.293 | n/a | 0.000 | 0.000 | 0.622 | 932.906 | 0.002 | n/a | 0.022 | 0.000 | n/a | n/a | 0.115 | 3.293 | 0.004 | 0.115 | gw-r/thread-41/journal/page | none observed |
| a3cd05a76876e1d90000000000000213 | 911.129 | 6.979 | n/a | 0.000 | 0.000 | 6.985 | 897.034 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.079 | 6.979 | 0.008 | 0.079 | gw-r/thread-62/journal/page | none observed |
| a3cd05a76876e1d90000000000000225 | 898.639 | 2.964 | n/a | 0.000 | 0.000 | 0.516 | 895.056 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.065 | 2.964 | 0.003 | 0.065 | gw-r/thread-41/journal/page | none observed |
| a3cd05a76876e1d90000000000000206 | 873.590 | 4.686 | n/a | 0.000 | 0.000 | 1.648 | 867.041 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.162 | 4.686 | 0.005 | 0.162 | gw-r/thread-67/journal/page | none observed |
| a3cd05a76876e1d900000000000001fe | 837.735 | 3.187 | n/a | 0.000 | 0.000 | 2.567 | 831.832 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.092 | 3.187 | 0.004 | 0.092 | gw-r/thread-75/journal/page | none observed |
| a3cd05a76876e1d90000000000000201 | 802.553 | 2.547 | n/a | 0.000 | 0.000 | 0.703 | 799.123 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.075 | 2.547 | 0.003 | 0.075 | gw-r/thread-70/journal/page | none observed |
| a3cd05a76876e1d9000000000000021f | 790.528 | 2.052 | n/a | 0.000 | 0.000 | 0.402 | 787.967 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.063 | 2.052 | 0.003 | 0.063 | gw-r/thread-62/journal/page | none observed |
| a3cd05a76876e1d9000000000000021b | 780.178 | 4.823 | n/a | 0.000 | 0.000 | 2.906 | 772.297 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.093 | 4.823 | 0.006 | 0.093 | gw-r/thread-68/journal/page | none observed |
| a3cd05a76876e1d9000000000000020f | 430.801 | 2.262 | n/a | 0.000 | 0.000 | 1.180 | 427.262 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.262 | 0.005 | 0.063 | gw-r/thread-75/journal/page | none observed |
| a3cd05a76876e1d9000000000000020d | 242.861 | 5.182 | n/a | 0.000 | 0.000 | 2.528 | 235.018 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.070 | 5.182 | 0.021 | 0.070 | gw-r/thread-46/journal/page | none observed |
| a3cd05a76876e1d9000000000000021d | 215.810 | 2.520 | n/a | 0.000 | 0.000 | 0.492 | 212.689 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.076 | 2.520 | 0.012 | 0.076 | gw-r/thread-46/journal/page | none observed |
| a3cd05a76876e1d90000000000000202 | 203.098 | 3.182 | n/a | 0.000 | 0.000 | 2.817 | 196.971 | 0.003 | n/a | 0.056 | 0.000 | n/a | n/a | 0.069 | 3.182 | 0.016 | 0.069 | gw-r/thread-44/journal/page | none observed |
| a3cd05a76876e1d90000000000000221 | 195.429 | 2.341 | n/a | 0.000 | 0.000 | 1.057 | 191.924 | 0.003 | n/a | 0.040 | 0.000 | n/a | n/a | 0.063 | 2.341 | 0.012 | 0.063 | gw-r/thread-69/journal/page | none observed |
| a3cd05a76876e1d90000000000000207 | 183.867 | 4.346 | n/a | 0.000 | 0.000 | 0.579 | 178.827 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.104 | 4.346 | 0.024 | 0.104 | gw-r/thread-69/journal/page | none observed |
| a3cd05a76876e1d90000000000000204 | 137.640 | 3.719 | n/a | 0.000 | 0.000 | 0.567 | 131.597 | 1.578 | n/a | 0.036 | 0.000 | n/a | n/a | 0.144 | 3.719 | 0.027 | 0.144 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (1226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.218 | n/a | n/a | n/a | 5.920 | n/a | 0.000 | 0.000 | 0.369 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.953 | 6.060 | 0.438 | 6.953 |
| p99 | 547.150 | n/a | n/a | n/a | 55.145 | n/a | 7.538 | 0.000 | 5.807 | 540.899 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 47.328 | 56.118 | 0.909 | 47.328 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d90000000000001935 | 1004.653 | 0.147 | n/a | 0.000 | 0.000 | 2.786 | 1000.570 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 1.111 | 0.147 | 0.000 | 1.111 | gw-r/thread-105/journal/page | none observed |
| a3cd05a76876e1d9000000000000193a | 993.498 | 2.864 | n/a | 0.000 | 0.000 | 0.419 | 990.121 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.070 | 2.864 | 0.003 | 0.070 | gw-r/thread-126/journal/page | none observed |
| a3cd05a76876e1d9000000000000193e | 968.987 | 2.247 | n/a | 0.000 | 0.000 | 0.694 | 965.953 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.071 | 2.247 | 0.002 | 0.071 | gw-r/thread-97/journal/page | none observed |
| a3cd05a76876e1d90000000000001957 | 941.785 | 2.224 | n/a | 0.000 | 0.000 | 1.580 | 937.879 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.065 | 2.224 | 0.002 | 0.065 | gw-r/thread-107/journal/page | none observed |
| a3cd05a76876e1d90000000000001937 | 931.434 | 14.256 | n/a | 0.000 | 0.000 | 0.835 | 916.082 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.236 | 14.256 | 0.015 | 0.236 | gw-r/thread-102/journal/page | none observed |
| a3cd05a76876e1d90000000000001948 | 926.630 | 3.327 | n/a | 0.000 | 0.000 | 2.037 | 921.166 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.058 | 3.327 | 0.004 | 0.058 | gw-r/thread-111/journal/page | none observed |
| a3cd05a76876e1d90000000000001933 | 880.392 | 2.271 | n/a | 0.000 | 0.000 | 4.789 | 873.230 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.067 | 2.271 | 0.003 | 0.067 | gw-r/thread-103/journal/page | none observed |
| a3cd05a76876e1d9000000000000195a | 716.708 | 2.658 | n/a | 0.000 | 0.000 | 2.914 | 711.025 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.081 | 2.658 | 0.004 | 0.081 | gw-r/thread-71/journal/page | none observed |
| a3cd05a76876e1d90000000000001940 | 665.813 | 2.317 | n/a | 0.000 | 0.000 | 2.497 | 660.898 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.079 | 2.317 | 0.003 | 0.079 | gw-r/thread-104/journal/page | none observed |
| a3cd05a76876e1d90000000000001974 | 660.214 | 4.243 | n/a | 0.000 | 0.000 | 0.549 | 655.294 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.101 | 4.243 | 0.006 | 0.101 | gw-r/thread-79/journal/page | none observed |
| a3cd05a76876e1d90000000000001954 | 649.284 | 2.347 | n/a | 0.000 | 0.000 | 1.334 | 645.492 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.068 | 2.347 | 0.004 | 0.068 | gw-r/thread-100/journal/page | none observed |
| a3cd05a76876e1d9000000000000195c | 640.723 | 12.370 | n/a | 4.862 | 0.000 | 0.542 | 622.535 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.384 | 17.232 | 0.027 | 0.384 | gw-r/thread-81/journal/page | none observed |
| a3cd05a76876e1d90000000000001950 | 547.150 | 2.565 | n/a | 0.000 | 0.000 | 3.594 | 540.899 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.050 | 2.565 | 0.005 | 0.050 | gw-r/thread-88/journal/page | none observed |
| a3cd05a76876e1d9000000000000196a | 525.383 | 6.944 | n/a | 0.000 | 0.000 | 0.505 | 517.843 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.067 | 6.944 | 0.013 | 0.067 | gw-r/thread-69/journal/page | none observed |
| a3cd05a76876e1d9000000000000196f | 504.870 | 4.042 | n/a | 0.000 | 0.000 | 0.597 | 500.141 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.064 | 4.042 | 0.008 | 0.064 | gw-r/thread-122/journal/page | none observed |
| a3cd05a76876e1d90000000000001972 | 456.534 | 2.360 | n/a | 0.000 | 0.000 | 0.552 | 453.529 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.066 | 2.360 | 0.005 | 0.066 | gw-r/thread-116/journal/page | none observed |
| a3cd05a76876e1d90000000000001969 | 394.304 | 8.584 | n/a | 0.000 | 0.000 | 1.926 | 383.663 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.066 | 8.584 | 0.022 | 0.066 | gw-r/thread-87/journal/page | none observed |
| a3cd05a76876e1d9000000000000194d | 360.277 | 1.969 | n/a | 0.000 | 0.000 | 3.665 | 354.511 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.070 | 1.969 | 0.005 | 0.070 | gw-r/thread-118/journal/page | none observed |
| a3cd05a76876e1d9000000000000196c | 340.885 | 2.023 | n/a | 0.000 | 0.000 | 5.807 | 332.942 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.065 | 2.023 | 0.006 | 0.065 | gw-r/thread-124/journal/page | none observed |
| a3cd05a76876e1d90000000000001966 | 311.394 | 8.521 | n/a | 0.000 | 0.000 | 2.540 | 300.058 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.224 | 8.521 | 0.027 | 0.224 | gw-r/thread-84/journal/page | none observed |

## P3 / L256 / internal (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 339.407 | n/a | n/a | n/a | 3.716 | n/a | 0.000 | 0.000 | 0.789 | 322.214 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.088 | 3.716 | 0.013 | 0.088 |
| p99 | 1023.405 | n/a | n/a | n/a | 22.076 | n/a | 6.487 | 0.000 | 12.333 | 1000.919 | 0.021 | n/a | 0.346 | 0.000 | n/a | n/a | 41.669 | 22.076 | 0.527 | 41.669 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d9000000000000197d | 1023.405 | 22.076 | n/a | 0.000 | 0.000 | 0.260 | 1000.919 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.117 | 22.076 | 0.022 | 0.117 | gw-r/thread-85/journal/page | none observed |
| a3cd05a76876e1d900000000000019b9 | 1005.541 | 5.460 | n/a | 0.000 | 0.000 | 0.935 | 998.920 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.192 | 5.460 | 0.005 | 0.192 | gw-r/thread-106/journal/page | none observed |
| a3cd05a76876e1d900000000000019c6 | 1005.227 | 4.565 | n/a | 0.000 | 0.000 | 3.964 | 996.578 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.090 | 4.565 | 0.005 | 0.090 | gw-r/thread-116/journal/page | none observed |
| a3cd05a76876e1d900000000000019bd | 1003.356 | 2.438 | n/a | 0.000 | 0.000 | 0.428 | 1000.409 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.053 | 2.438 | 0.002 | 0.053 | gw-r/thread-66/journal/page | none observed |
| a3cd05a76876e1d900000000000019f9 | 1002.890 | 0.097 | n/a | 0.000 | 0.000 | 0.472 | 1000.606 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 1.672 | 0.097 | 0.000 | 1.672 | gw-r/thread-81/journal/page | none observed |
| a3cd05a76876e1d900000000000019d4 | 1002.761 | 0.142 | n/a | 0.000 | 0.000 | 0.645 | 1000.790 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 1.124 | 0.142 | 0.000 | 1.124 | gw-r/thread-122/journal/page | none observed |
| a3cd05a76876e1d900000000000019e7 | 1002.685 | 5.653 | n/a | 0.000 | 0.000 | 0.802 | 996.042 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.154 | 5.653 | 0.006 | 0.154 | gw-r/thread-117/journal/page | none observed |
| a3cd05a76876e1d900000000000019cb | 1001.992 | 0.099 | n/a | 0.000 | 0.000 | 0.317 | 1000.448 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 1.092 | 0.099 | 0.000 | 1.092 | gw-r/thread-71/journal/page | none observed |
| a3cd05a76876e1d900000000000019c7 | 1000.086 | 3.047 | n/a | 0.000 | 0.000 | 2.563 | 994.305 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.135 | 3.047 | 0.003 | 0.135 | gw-r/thread-47/journal/page | none observed |
| a3cd05a76876e1d900000000000019f5 | 992.642 | 2.292 | n/a | 0.000 | 0.000 | 0.347 | 989.902 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.052 | 2.292 | 0.002 | 0.052 | gw-r/thread-116/journal/page | none observed |
| a3cd05a76876e1d900000000000019fb | 984.619 | 2.661 | n/a | 0.000 | 0.000 | 0.728 | 981.068 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.125 | 2.661 | 0.003 | 0.125 | gw-r/thread-97/journal/page | none observed |
| a3cd05a76876e1d900000000000019cd | 982.232 | 2.237 | n/a | 0.000 | 0.000 | 0.333 | 979.575 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.056 | 2.237 | 0.002 | 0.056 | gw-r/thread-95/journal/page | none observed |
| a3cd05a76876e1d9000000000000198c | 944.274 | 2.246 | n/a | 0.000 | 0.000 | 0.428 | 941.503 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.069 | 2.246 | 0.002 | 0.069 | gw-r/thread-103/journal/page | none observed |
| a3cd05a76876e1d900000000000019e0 | 938.803 | 2.915 | n/a | 0.000 | 0.000 | 0.617 | 935.172 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.060 | 2.915 | 0.003 | 0.060 | gw-r/thread-48/journal/page | none observed |
| a3cd05a76876e1d900000000000019f7 | 935.092 | 2.854 | n/a | 0.000 | 0.000 | 2.335 | 929.814 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.054 | 2.854 | 0.003 | 0.054 | gw-r/thread-119/journal/page | none observed |
| a3cd05a76876e1d900000000000019e4 | 933.155 | 2.535 | n/a | 0.000 | 0.000 | 0.810 | 929.722 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.068 | 2.535 | 0.003 | 0.068 | gw-r/thread-86/journal/page | none observed |
| a3cd05a76876e1d900000000000019d1 | 908.205 | 4.424 | n/a | 0.000 | 0.000 | 0.789 | 902.865 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.076 | 4.424 | 0.005 | 0.076 | gw-r/thread-45/journal/page | none observed |
| a3cd05a76876e1d90000000000001979 | 894.489 | 2.955 | n/a | 0.000 | 0.000 | 2.355 | 889.088 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.056 | 2.955 | 0.003 | 0.056 | gw-r/thread-68/journal/page | none observed |
| a3cd05a76876e1d900000000000019f2 | 887.661 | 3.450 | n/a | 0.000 | 0.000 | 2.136 | 881.978 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.067 | 3.450 | 0.004 | 0.067 | gw-r/thread-74/journal/page | none observed |
| a3cd05a76876e1d900000000000019c8 | 879.814 | 2.065 | n/a | 0.000 | 0.000 | 0.477 | 877.180 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.070 | 2.065 | 0.002 | 0.070 | gw-r/thread-121/journal/page | none observed |

## P3 / L1024 / internal (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 374.068 | n/a | n/a | n/a | 3.764 | n/a | 0.000 | 0.000 | 0.879 | 368.855 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.094 | 3.764 | 0.013 | 0.094 |
| p99 | 1005.699 | n/a | n/a | n/a | 28.015 | n/a | 5.947 | 0.000 | 9.359 | 1000.873 | 0.162 | n/a | 0.072 | 0.000 | n/a | n/a | 44.564 | 28.015 | 0.853 | 44.564 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d90000000000001a8a | 1005.699 | 2.963 | n/a | 0.000 | 0.000 | 2.053 | 1000.585 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.065 | 2.963 | 0.003 | 0.065 | gw-r/thread-105/journal/page | none observed |
| a3cd05a76876e1d90000000000001a55 | 1005.016 | 5.990 | n/a | 0.000 | 0.000 | 1.123 | 997.791 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.066 | 5.990 | 0.006 | 0.066 | gw-r/thread-97/journal/page | none observed |
| a3cd05a76876e1d90000000000001a37 | 1003.627 | 0.103 | n/a | 0.000 | 0.000 | 1.636 | 1000.757 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 1.084 | 0.103 | 0.000 | 1.084 | gw-r/thread-128/journal/page | none observed |
| a3cd05a76876e1d90000000000001a6d | 1002.594 | 0.099 | n/a | 0.000 | 0.000 | 0.469 | 1000.873 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 1.105 | 0.099 | 0.000 | 1.105 | gw-r/thread-44/journal/page | none observed |
| a3cd05a76876e1d90000000000001a66 | 1002.308 | 0.116 | n/a | 0.000 | 0.000 | 0.381 | 1000.645 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 1.120 | 0.116 | 0.000 | 1.120 | gw-r/thread-98/journal/page | none observed |
| a3cd05a76876e1d90000000000001a84 | 1002.272 | 8.896 | n/a | 0.000 | 0.000 | 0.581 | 992.659 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.080 | 8.896 | 0.009 | 0.080 | gw-r/thread-91/journal/page | none observed |
| a3cd05a76876e1d90000000000001a5c | 1002.210 | 0.094 | n/a | 0.000 | 0.000 | 0.388 | 1000.590 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 1.095 | 0.094 | 0.000 | 1.095 | gw-r/thread-123/journal/page | none observed |
| a3cd05a76876e1d90000000000001a65 | 1001.119 | 2.225 | n/a | 0.000 | 0.000 | 0.698 | 998.089 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.072 | 2.225 | 0.002 | 0.072 | gw-r/thread-121/journal/page | none observed |
| a3cd05a76876e1d90000000000001a80 | 996.725 | 8.930 | n/a | 0.000 | 0.000 | 2.745 | 984.937 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.081 | 8.930 | 0.009 | 0.081 | gw-r/thread-98/journal/page | none observed |
| a3cd05a76876e1d90000000000001a6f | 993.272 | 6.610 | n/a | 0.000 | 0.000 | 1.962 | 984.579 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.093 | 6.610 | 0.007 | 0.093 | gw-r/thread-45/journal/page | none observed |
| a3cd05a76876e1d90000000000001a9c | 989.707 | 2.481 | n/a | 0.000 | 0.000 | 0.452 | 986.688 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.058 | 2.481 | 0.003 | 0.058 | gw-r/thread-108/journal/page | none observed |
| a3cd05a76876e1d90000000000001a5e | 973.670 | 2.221 | n/a | 0.000 | 0.000 | 0.965 | 970.385 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.057 | 2.221 | 0.002 | 0.057 | gw-r/thread-80/journal/page | none observed |
| a3cd05a76876e1d90000000000001a59 | 962.211 | 10.588 | n/a | 5.947 | 0.000 | 0.740 | 944.632 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.260 | 16.535 | 0.017 | 0.260 | gw-r/thread-99/journal/page | none observed |
| a3cd05a76876e1d90000000000001a34 | 947.553 | 3.764 | n/a | 0.000 | 0.000 | 3.870 | 939.817 | 0.002 | n/a | 0.036 | 0.000 | n/a | n/a | 0.064 | 3.764 | 0.004 | 0.064 | gw-r/thread-83/journal/page | none observed |
| a3cd05a76876e1d90000000000001a8f | 920.686 | 3.651 | n/a | 0.000 | 0.000 | 3.131 | 913.787 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.083 | 3.651 | 0.004 | 0.083 | gw-r/thread-47/journal/page | none observed |
| a3cd05a76876e1d90000000000001a75 | 918.456 | 2.159 | n/a | 0.000 | 0.000 | 3.648 | 912.551 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.071 | 2.159 | 0.002 | 0.071 | gw-r/thread-67/journal/page | none observed |
| a3cd05a76876e1d90000000000001a9a | 861.871 | 6.760 | n/a | 0.000 | 0.000 | 6.188 | 848.816 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.076 | 6.760 | 0.008 | 0.076 | gw-r/thread-69/journal/page | none observed |
| a3cd05a76876e1d90000000000001a9d | 845.254 | 2.016 | n/a | 0.000 | 0.000 | 0.604 | 842.515 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.070 | 2.016 | 0.002 | 0.070 | gw-r/thread-118/journal/page | none observed |
| a3cd05a76876e1d90000000000001a31 | 843.763 | 7.496 | n/a | 0.000 | 0.000 | 3.288 | 832.864 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.087 | 7.496 | 0.009 | 0.087 | gw-r/thread-110/journal/page | none observed |
| a3cd05a76876e1d90000000000001a76 | 814.596 | 3.142 | n/a | 0.000 | 0.000 | 1.292 | 810.035 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.094 | 3.142 | 0.004 | 0.094 | gw-r/thread-102/journal/page | none observed |

## P3 / tail / internal (368 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 347.136 | n/a | n/a | n/a | 3.300 | n/a | 0.000 | 0.000 | 0.507 | 337.819 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.097 | 3.319 | 0.012 | 0.097 |
| p99 | 1004.721 | n/a | n/a | n/a | 15.067 | n/a | 1.419 | 0.000 | 3.498 | 1000.763 | 0.121 | n/a | 0.060 | 0.000 | n/a | n/a | 44.957 | 16.554 | 0.770 | 44.957 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a3cd05a76876e1d90000000000001c0b | 1007.760 | 10.498 | n/a | 1.716 | 0.000 | 1.566 | 993.847 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.111 | 12.214 | 0.012 | 0.111 | gw-r/thread-129/journal/page | none observed |
| a3cd05a76876e1d90000000000001ac2 | 1005.649 | 4.236 | n/a | 0.000 | 0.000 | 0.553 | 1000.757 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.083 | 4.236 | 0.004 | 0.083 | gw-r/thread-116/journal/page | none observed |
| a3cd05a76876e1d90000000000001b75 | 1005.102 | 2.357 | n/a | 0.000 | 0.000 | 0.339 | 1002.296 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.063 | 2.357 | 0.002 | 0.063 | gw-r/thread-126/journal/page | none observed |
| a3cd05a76876e1d90000000000001b9e | 1004.721 | 2.757 | n/a | 0.000 | 0.000 | 1.358 | 1000.513 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.070 | 2.757 | 0.003 | 0.070 | gw-r/thread-88/journal/page | none observed |
| a3cd05a76876e1d90000000000001c68 | 1004.076 | 5.518 | n/a | 0.000 | 0.000 | 0.540 | 997.863 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.131 | 5.518 | 0.005 | 0.131 | gw-r/thread-111/journal/page | none observed |
| a3cd05a76876e1d90000000000001c0a | 1003.880 | 3.042 | n/a | 0.000 | 0.000 | 0.494 | 1000.234 | 0.002 | n/a | 0.040 | 0.000 | n/a | n/a | 0.068 | 3.042 | 0.003 | 0.068 | gw-r/thread-94/journal/page | none observed |
| a3cd05a76876e1d90000000000001af0 | 1003.736 | 0.099 | n/a | 0.000 | 0.000 | 1.725 | 1000.763 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 1.086 | 0.099 | 0.000 | 1.086 | gw-r/thread-47/journal/page | none observed |
| a3cd05a76876e1d90000000000001c19 | 1003.089 | 5.937 | n/a | 0.000 | 0.000 | 1.185 | 995.790 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.110 | 5.937 | 0.006 | 0.110 | gw-r/thread-88/journal/page | none observed |
| a3cd05a76876e1d90000000000001bfe | 1002.948 | 0.120 | n/a | 0.000 | 0.000 | 1.275 | 1000.422 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 1.095 | 0.120 | 0.000 | 1.095 | gw-r/thread-71/journal/page | none observed |
| a3cd05a76876e1d90000000000001b4c | 1002.829 | 3.200 | n/a | 0.000 | 0.000 | 1.030 | 998.507 | 0.002 | n/a | 0.027 | 0.000 | n/a | n/a | 0.063 | 3.200 | 0.003 | 0.063 | gw-r/thread-108/journal/page | none observed |
| a3cd05a76876e1d90000000000001ca3 | 1002.825 | 5.580 | n/a | 0.000 | 0.000 | 0.746 | 996.330 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.145 | 5.580 | 0.006 | 0.145 | gw-r/thread-107/journal/page | none observed |
| a3cd05a76876e1d90000000000001b27 | 1002.817 | 0.141 | n/a | 0.000 | 0.000 | 1.034 | 1000.467 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.136 | 0.141 | 0.000 | 1.136 | gw-r/thread-107/journal/page | none observed |
| a3cd05a76876e1d90000000000001acd | 1002.805 | 2.531 | n/a | 0.000 | 0.000 | 0.391 | 999.781 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.058 | 2.531 | 0.003 | 0.058 | gw-r/thread-112/journal/page | none observed |
| a3cd05a76876e1d90000000000001c07 | 1002.754 | 0.147 | n/a | 0.000 | 0.000 | 0.974 | 1000.456 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 1.141 | 0.147 | 0.000 | 1.141 | gw-r/thread-96/journal/page | none observed |
| a3cd05a76876e1d90000000000001c9b | 1002.725 | 0.109 | n/a | 0.000 | 0.000 | 0.574 | 1000.893 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 1.094 | 0.109 | 0.000 | 1.094 | gw-r/thread-120/journal/page | none observed |
| a3cd05a76876e1d90000000000001bb6 | 1002.583 | 0.091 | n/a | 0.000 | 0.000 | 0.935 | 1000.432 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 1.091 | 0.091 | 0.000 | 1.091 | gw-r/thread-98/journal/page | none observed |
| a3cd05a76876e1d90000000000001aa1 | 1002.433 | 0.097 | n/a | 0.000 | 0.000 | 0.399 | 1000.768 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 1.085 | 0.097 | 0.000 | 1.085 | gw-r/thread-101/journal/page | none observed |
| a3cd05a76876e1d90000000000001ab5 | 1002.407 | 0.103 | n/a | 0.000 | 0.000 | 0.684 | 1000.490 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 1.082 | 0.103 | 0.000 | 1.082 | gw-r/thread-85/journal/page | none observed |
| a3cd05a76876e1d90000000000001ac3 | 1002.396 | 0.122 | n/a | 0.000 | 0.000 | 0.470 | 1000.651 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 1.101 | 0.122 | 0.000 | 1.101 | gw-r/thread-70/journal/page | none observed |
| a3cd05a76876e1d90000000000001b20 | 1002.391 | 2.154 | n/a | 0.000 | 0.000 | 0.274 | 999.864 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.054 | 2.154 | 0.002 | 0.054 | gw-r/thread-118/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.378 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.104 | 200.997 | 0.013 | n/a | 0.114 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 234.175 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 32.681 | 208.691 | 3.186 | n/a | 2.036 | 0.000 | n/a | n/a | 49.824 | 0.000 | 0.000 | 49.824 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 629e813a778b18eb000000000000000b | 234.175 | 0.000 | n/a | 0.000 | 0.000 | 32.681 | 201.182 | 0.024 | n/a | 0.181 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-71/journal/page | none observed |
| 629e813a778b18eb000000000000003e | 210.178 | 0.000 | n/a | 0.000 | 0.000 | 9.103 | 200.860 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-71/journal/page | none observed |
| 629e813a778b18eb000000000000002a | 210.002 | 0.000 | n/a | 0.000 | 0.000 | 1.012 | 208.691 | 0.019 | n/a | 0.190 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-44/journal/page | none observed |
| 629e813a778b18eb0000000000000040 | 207.196 | 0.000 | n/a | 0.000 | 0.000 | 4.293 | 202.668 | 0.029 | n/a | 0.106 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb0000000000000023 | 206.777 | 0.000 | n/a | 0.000 | 0.000 | 5.306 | 201.218 | 0.011 | n/a | 0.142 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-70/journal/page | none observed |
| 629e813a778b18eb0000000000000032 | 206.594 | 0.000 | n/a | 0.000 | 0.000 | 1.676 | 204.600 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-71/journal/page | none observed |
| 629e813a778b18eb0000000000000018 | 206.188 | 0.000 | n/a | 0.000 | 0.000 | 4.679 | 201.207 | 0.017 | n/a | 0.185 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-71/journal/page | none observed |
| 629e813a778b18eb000000000000001b | 205.947 | 0.000 | n/a | 0.000 | 0.000 | 0.885 | 201.587 | 3.186 | n/a | 0.171 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 629e813a778b18eb000000000000004c | 205.885 | 0.000 | n/a | 0.000 | 0.000 | 1.454 | 204.197 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-41/journal/page | none observed |
| 629e813a778b18eb0000000000000024 | 205.548 | 0.000 | n/a | 0.000 | 0.000 | 4.015 | 201.229 | 0.019 | n/a | 0.155 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 629e813a778b18eb000000000000000e | 205.509 | 0.000 | n/a | 0.000 | 0.000 | 1.258 | 203.998 | 0.015 | n/a | 0.140 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-44/journal/page | none observed |
| 629e813a778b18eb0000000000000028 | 205.449 | 0.000 | n/a | 0.000 | 0.000 | 2.537 | 201.583 | 0.018 | n/a | 0.191 | 0.000 | n/a | n/a | 1.121 | 0.000 | 0.000 | 1.121 | gw-r/thread-43/journal/page | none observed |
| 629e813a778b18eb0000000000000056 | 205.226 | 0.000 | n/a | 0.000 | 0.000 | 2.488 | 202.458 | 0.014 | n/a | 0.143 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb0000000000000046 | 204.734 | 0.000 | n/a | 0.000 | 0.000 | 3.604 | 200.886 | 0.010 | n/a | 0.111 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-74/journal/page | none observed |
| 629e813a778b18eb0000000000000059 | 204.450 | 0.000 | n/a | 0.000 | 0.000 | 2.948 | 201.174 | 0.028 | n/a | 0.200 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-43/journal/page | none observed |
| 629e813a778b18eb0000000000000041 | 204.013 | 0.000 | n/a | 0.000 | 0.000 | 2.722 | 200.907 | 0.013 | n/a | 0.257 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 629e813a778b18eb000000000000002d | 204.001 | 0.000 | n/a | 0.000 | 0.000 | 1.104 | 202.645 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| 629e813a778b18eb0000000000000053 | 203.915 | 0.000 | n/a | 0.000 | 0.000 | 1.257 | 200.381 | 0.058 | n/a | 2.036 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-47/journal/page | none observed |
| 629e813a778b18eb0000000000000042 | 203.890 | 0.000 | n/a | 0.000 | 0.000 | 2.518 | 201.142 | 0.013 | n/a | 0.098 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-75/journal/page | none observed |
| 629e813a778b18eb0000000000000026 | 203.641 | 0.000 | n/a | 0.000 | 0.000 | 2.095 | 201.192 | 0.047 | n/a | 0.151 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-71/journal/page | none observed |

## P3 / L1 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.837 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 200.822 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 |
| p99 | 206.219 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.766 | 204.760 | 3.189 | n/a | 0.172 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 629e813a778b18eb0000000000000084 | 207.772 | 0.000 | n/a | 0.000 | 0.000 | 2.755 | 204.760 | 0.021 | n/a | 0.116 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-74/journal/page | none observed |
| 629e813a778b18eb000000000000014a | 206.313 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 205.519 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-73/journal/page | none observed |
| 629e813a778b18eb0000000000000086 | 206.219 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 205.055 | 0.020 | n/a | 0.142 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 629e813a778b18eb0000000000000142 | 206.176 | 0.000 | n/a | 0.000 | 0.000 | 4.766 | 201.106 | 0.006 | n/a | 0.106 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-41/journal/page | none observed |
| 629e813a778b18eb0000000000000060 | 206.170 | 0.000 | n/a | 0.000 | 0.000 | 2.195 | 203.713 | 0.023 | n/a | 0.088 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-47/journal/page | none observed |
| 629e813a778b18eb00000000000000b7 | 206.155 | 0.000 | n/a | 0.000 | 0.000 | 4.809 | 201.121 | 0.008 | n/a | 0.101 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-71/journal/page | none observed |
| 629e813a778b18eb00000000000000ec | 205.944 | 0.000 | n/a | 0.000 | 0.000 | 1.640 | 204.099 | 0.015 | n/a | 0.072 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb000000000000005e | 205.686 | 0.000 | n/a | 0.000 | 0.000 | 4.190 | 201.171 | 0.017 | n/a | 0.138 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-46/journal/page | none observed |
| 629e813a778b18eb00000000000000b1 | 205.336 | 0.000 | n/a | 0.000 | 0.000 | 4.375 | 200.779 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 629e813a778b18eb00000000000000ac | 205.217 | 0.000 | n/a | 0.000 | 0.000 | 0.479 | 202.678 | 1.865 | n/a | 0.096 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-74/journal/page | none observed |
| 629e813a778b18eb0000000000000070 | 205.147 | 0.000 | n/a | 0.000 | 0.000 | 3.807 | 201.049 | 0.012 | n/a | 0.120 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-67/journal/page | none observed |
| 629e813a778b18eb000000000000015c | 204.896 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 203.915 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-45/journal/page | none observed |
| 629e813a778b18eb000000000000010f | 204.877 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 203.915 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| 629e813a778b18eb0000000000000124 | 204.807 | 0.000 | n/a | 0.000 | 0.000 | 0.409 | 204.249 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-75/journal/page | none observed |
| 629e813a778b18eb0000000000000149 | 204.655 | 0.000 | n/a | 0.000 | 0.000 | 0.314 | 200.789 | 0.009 | n/a | 3.456 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-75/journal/page | none observed |
| 629e813a778b18eb0000000000000134 | 204.272 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 203.413 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-72/journal/page | none observed |
| 629e813a778b18eb00000000000000b8 | 203.923 | 0.000 | n/a | 0.000 | 0.000 | 1.385 | 201.794 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.658 | 0.000 | 0.000 | 0.658 | gw-r/thread-70/journal/page | none observed |
| 629e813a778b18eb0000000000000091 | 203.888 | 0.000 | n/a | 0.000 | 0.000 | 2.772 | 200.898 | 0.009 | n/a | 0.093 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 629e813a778b18eb000000000000009b | 203.830 | 0.000 | n/a | 0.000 | 0.000 | 2.520 | 201.032 | 0.009 | n/a | 0.112 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-65/journal/page | none observed |
| 629e813a778b18eb0000000000000075 | 203.685 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 202.427 | 0.021 | n/a | 0.227 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-74/journal/page | none observed |

## P3 / L4 / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.697 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 200.782 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 |
| p99 | 207.033 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.373 | 204.298 | 2.890 | n/a | 0.118 | 0.000 | n/a | n/a | 0.512 | 0.000 | 0.000 | 0.512 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 629e813a778b18eb0000000000000165 | 213.450 | 0.000 | n/a | 0.000 | 0.000 | 14.602 | 194.379 | 4.342 | n/a | 0.020 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 629e813a778b18eb000000000000024e | 212.211 | 0.000 | n/a | 0.000 | 0.000 | 7.763 | 204.298 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 629e813a778b18eb0000000000000238 | 207.033 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 205.701 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-41/journal/page | none observed |
| 629e813a778b18eb0000000000000185 | 206.837 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 206.020 | 0.018 | n/a | 0.053 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-75/journal/page | none observed |
| 629e813a778b18eb000000000000024c | 205.197 | 0.000 | n/a | 0.000 | 0.000 | 4.386 | 200.664 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-68/journal/page | none observed |
| 629e813a778b18eb0000000000000225 | 205.106 | 0.000 | n/a | 0.000 | 0.000 | 3.906 | 201.027 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-67/journal/page | none observed |
| 629e813a778b18eb00000000000001ac | 204.898 | 0.000 | n/a | 0.000 | 0.000 | 3.608 | 201.102 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-71/journal/page | none observed |
| 629e813a778b18eb00000000000001d8 | 204.604 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 203.390 | 0.019 | n/a | 0.080 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-75/journal/page | none observed |
| 629e813a778b18eb0000000000000206 | 204.578 | 0.000 | n/a | 0.000 | 0.000 | 1.301 | 203.050 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-75/journal/page | none observed |
| 629e813a778b18eb000000000000016e | 204.468 | 0.000 | n/a | 0.000 | 0.000 | 3.279 | 200.994 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-67/journal/page | none observed |
| 629e813a778b18eb0000000000000217 | 204.424 | 0.000 | n/a | 0.000 | 0.000 | 1.133 | 203.057 | 0.029 | n/a | 0.064 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-44/journal/page | none observed |
| 629e813a778b18eb00000000000001e9 | 204.200 | 0.000 | n/a | 0.000 | 0.000 | 2.735 | 201.293 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-67/journal/page | none observed |
| 629e813a778b18eb000000000000022e | 203.969 | 0.000 | n/a | 0.000 | 0.000 | 2.214 | 201.531 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-69/journal/page | none observed |
| 629e813a778b18eb0000000000000169 | 203.868 | 0.000 | n/a | 0.000 | 0.000 | 2.752 | 200.956 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-66/journal/page | none observed |
| 629e813a778b18eb0000000000000210 | 203.856 | 0.000 | n/a | 0.000 | 0.000 | 3.013 | 200.684 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb0000000000000219 | 203.733 | 0.000 | n/a | 0.000 | 0.000 | 2.759 | 200.808 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-67/journal/page | none observed |
| 629e813a778b18eb00000000000001fd | 203.272 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 202.297 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-74/journal/page | none observed |
| 629e813a778b18eb000000000000018e | 203.169 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 201.265 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 1.112 | 0.000 | 0.000 | 1.112 | gw-r/thread-47/journal/page | none observed |
| 629e813a778b18eb000000000000017e | 203.017 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 202.276 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb00000000000001e1 | 202.992 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 202.114 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-66/journal/page | none observed |

## P3 / L16 / read (144 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.729 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 76.242 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 205.806 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.688 | 202.913 | 5.122 | n/a | 0.104 | 0.000 | n/a | n/a | 49.840 | 0.000 | 0.000 | 49.840 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 629e813a778b18eb000000000000025e | 211.807 | 0.000 | n/a | 0.000 | 0.000 | 10.818 | 200.768 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-43/journal/page | none observed |
| 629e813a778b18eb0000000000000280 | 205.806 | 0.000 | n/a | 0.000 | 0.000 | 4.872 | 200.760 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-75/journal/page | none observed |
| 629e813a778b18eb000000000000027a | 205.054 | 0.000 | n/a | 0.000 | 0.000 | 1.343 | 203.541 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-70/journal/page | none observed |
| 629e813a778b18eb000000000000027b | 204.581 | 0.000 | n/a | 0.000 | 0.000 | 3.518 | 200.875 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| 629e813a778b18eb000000000000027f | 204.191 | 0.000 | n/a | 0.000 | 0.000 | 1.082 | 202.913 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-72/journal/page | none observed |
| 629e813a778b18eb0000000000000288 | 203.587 | 0.000 | n/a | 0.000 | 0.000 | 1.446 | 201.871 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-67/journal/page | none observed |
| 629e813a778b18eb000000000000028e | 203.034 | 0.000 | n/a | 0.000 | 0.000 | 1.793 | 200.999 | 0.004 | n/a | 0.069 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-71/journal/page | none observed |
| 629e813a778b18eb0000000000000268 | 202.872 | 0.000 | n/a | 0.000 | 0.000 | 1.674 | 201.028 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-66/journal/page | none observed |
| 629e813a778b18eb0000000000000279 | 202.688 | 0.000 | n/a | 0.000 | 0.000 | 1.323 | 201.161 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-68/journal/page | none observed |
| 629e813a778b18eb0000000000000298 | 202.614 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 201.395 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-70/journal/page | none observed |
| 629e813a778b18eb0000000000000287 | 202.480 | 0.000 | n/a | 0.000 | 0.000 | 1.216 | 201.028 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb000000000000029e | 202.300 | 0.000 | n/a | 0.000 | 0.000 | 1.049 | 201.028 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb0000000000000276 | 202.257 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 201.337 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-67/journal/page | none observed |
| 629e813a778b18eb0000000000000277 | 202.167 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 201.089 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-74/journal/page | none observed |
| 629e813a778b18eb000000000000029b | 202.143 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 200.884 | 0.013 | n/a | 0.064 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-66/journal/page | none observed |
| 629e813a778b18eb000000000000029f | 202.029 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 200.701 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-67/journal/page | none observed |
| 629e813a778b18eb000000000000025d | 201.982 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 201.194 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-67/journal/page | none observed |
| 629e813a778b18eb0000000000000293 | 201.967 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 201.011 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb0000000000000275 | 201.959 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.013 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 629e813a778b18eb0000000000000282 | 201.955 | 0.000 | n/a | 0.000 | 0.000 | 0.710 | 200.976 | 0.009 | n/a | 0.094 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-67/journal/page | none observed |

## P3 / L64 / read (132 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 103.694 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.612 | 103.255 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 203.963 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.452 | 202.014 | 0.647 | n/a | 0.068 | 0.000 | n/a | n/a | 56.767 | 0.000 | 0.000 | 56.767 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 629e813a778b18eb0000000000000d5a | 204.221 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 203.535 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-125/journal/page | none observed |
| 629e813a778b18eb0000000000000d67 | 203.963 | 0.000 | n/a | 0.000 | 0.000 | 2.889 | 200.826 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-117/journal/page | none observed |
| 629e813a778b18eb0000000000000d88 | 203.936 | 0.000 | n/a | 0.000 | 0.000 | 0.589 | 200.953 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 2.340 | 0.000 | 0.000 | 2.340 | gw-r/thread-125/journal/page | none observed |
| 629e813a778b18eb0000000000000d94 | 203.768 | 0.000 | n/a | 0.000 | 0.000 | 2.897 | 200.725 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-62/journal/page | none observed |
| 629e813a778b18eb0000000000000d70 | 203.553 | 0.000 | n/a | 0.000 | 0.000 | 2.767 | 200.646 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-112/journal/page | none observed |
| 629e813a778b18eb0000000000000d7c | 203.084 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 202.014 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 629e813a778b18eb0000000000000d52 | 202.432 | 0.000 | n/a | 0.000 | 0.000 | 1.569 | 200.736 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-121/journal/page | none observed |
| 629e813a778b18eb0000000000000d93 | 202.147 | 0.000 | n/a | 0.000 | 0.000 | 1.422 | 200.591 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-66/journal/page | none observed |
| 629e813a778b18eb0000000000000d9d | 202.147 | 0.000 | n/a | 0.000 | 0.000 | 1.498 | 200.509 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-41/journal/page | none observed |
| 629e813a778b18eb0000000000000d6e | 201.979 | 0.000 | n/a | 0.000 | 0.000 | 1.300 | 200.563 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-122/journal/page | none observed |
| 629e813a778b18eb0000000000000d86 | 201.926 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 200.880 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-129/journal/page | none observed |
| 629e813a778b18eb0000000000000d82 | 201.737 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 200.899 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-126/journal/page | none observed |
| 629e813a778b18eb0000000000000d74 | 201.688 | 0.000 | n/a | 0.000 | 0.000 | 0.486 | 201.022 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-113/journal/page | none observed |
| 629e813a778b18eb0000000000000d44 | 201.652 | 0.000 | n/a | 0.000 | 0.000 | 0.680 | 200.811 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-120/journal/page | none observed |
| 629e813a778b18eb0000000000000d5b | 201.634 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 200.828 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-106/journal/page | none observed |
| 629e813a778b18eb0000000000000d96 | 201.631 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 200.808 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-44/journal/page | none observed |
| 629e813a778b18eb0000000000000d69 | 201.624 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 200.753 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-69/journal/page | none observed |
| 629e813a778b18eb0000000000000d5f | 201.623 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 200.808 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-115/journal/page | none observed |
| 629e813a778b18eb0000000000000d91 | 201.598 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 200.755 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-91/journal/page | none observed |
| 629e813a778b18eb0000000000000d85 | 201.574 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 200.935 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-83/journal/page | none observed |

## P3 / L256 / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.312 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.600 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 |
| p99 | 205.719 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.790 | 202.690 | 2.164 | n/a | 0.154 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 629e813a778b18eb0000000000000e3e | 212.925 | 0.000 | n/a | 0.000 | 0.000 | 12.048 | 200.742 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-84/journal/page | none observed |
| 629e813a778b18eb0000000000000db6 | 207.969 | 0.000 | n/a | 0.000 | 0.000 | 6.662 | 201.052 | 0.037 | n/a | 0.065 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-108/journal/page | none observed |
| 629e813a778b18eb0000000000000da1 | 205.719 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 205.040 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-47/journal/page | none observed |
| 629e813a778b18eb0000000000000db2 | 204.498 | 0.000 | n/a | 0.000 | 0.000 | 1.965 | 202.196 | 0.008 | n/a | 0.183 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-86/journal/page | none observed |
| 629e813a778b18eb0000000000000dd1 | 204.326 | 0.000 | n/a | 0.000 | 0.000 | 0.421 | 203.759 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-107/journal/page | none observed |
| 629e813a778b18eb0000000000000ddc | 204.139 | 0.000 | n/a | 0.000 | 0.000 | 3.471 | 200.529 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-95/journal/page | none observed |
| 629e813a778b18eb0000000000000e96 | 203.913 | 0.000 | n/a | 0.000 | 0.000 | 3.481 | 200.330 | 0.010 | n/a | 0.015 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-93/journal/page | none observed |
| 629e813a778b18eb0000000000000e69 | 203.721 | 0.000 | n/a | 0.000 | 0.000 | 3.007 | 200.569 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-85/journal/page | none observed |
| 629e813a778b18eb0000000000000e41 | 203.623 | 0.000 | n/a | 0.000 | 0.000 | 2.809 | 200.657 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-91/journal/page | none observed |
| 629e813a778b18eb0000000000000dba | 203.361 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 202.690 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 629e813a778b18eb0000000000000e92 | 203.066 | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 201.638 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-70/journal/page | none observed |
| 629e813a778b18eb0000000000000e01 | 202.916 | 0.000 | n/a | 0.000 | 0.000 | 2.252 | 200.524 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-129/journal/page | none observed |
| 629e813a778b18eb0000000000000df8 | 202.832 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 200.812 | 0.029 | n/a | 1.335 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-79/journal/page | none observed |
| 629e813a778b18eb0000000000000e33 | 202.813 | 0.000 | n/a | 0.000 | 0.000 | 1.049 | 201.556 | 0.019 | n/a | 0.063 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-83/journal/page | none observed |
| 629e813a778b18eb0000000000000e8d | 202.746 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 201.805 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| 629e813a778b18eb0000000000000ea3 | 202.624 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 201.742 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-122/journal/page | none observed |
| 629e813a778b18eb0000000000000e8c | 202.506 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 201.646 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-110/journal/page | none observed |
| 629e813a778b18eb0000000000000e49 | 202.502 | 0.000 | n/a | 0.000 | 0.000 | 1.224 | 201.032 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-120/journal/page | none observed |
| 629e813a778b18eb0000000000000e3f | 202.489 | 0.000 | n/a | 0.000 | 0.000 | 0.427 | 201.918 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-127/journal/page | none observed |
| 629e813a778b18eb0000000000000e90 | 202.449 | 0.000 | n/a | 0.000 | 0.000 | 0.338 | 201.915 | 0.019 | n/a | 0.093 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-71/journal/page | none observed |

## P3 / L1024 / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.209 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 200.575 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 209.453 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.245 | 203.288 | 3.771 | n/a | 0.071 | 0.000 | n/a | n/a | 1.019 | 0.000 | 0.000 | 1.019 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 629e813a778b18eb0000000000000eb9 | 214.487 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 213.616 | 0.024 | n/a | 0.047 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-95/journal/page | none observed |
| 629e813a778b18eb0000000000000f00 | 213.411 | 0.000 | n/a | 0.000 | 0.000 | 12.729 | 200.554 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-114/journal/page | none observed |
| 629e813a778b18eb0000000000000ef6 | 209.453 | 0.000 | n/a | 0.000 | 0.000 | 8.538 | 200.772 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-122/journal/page | none observed |
| 629e813a778b18eb0000000000000f66 | 204.417 | 0.000 | n/a | 0.000 | 0.000 | 1.985 | 202.284 | 0.016 | n/a | 0.047 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-95/journal/page | none observed |
| 629e813a778b18eb0000000000000eee | 204.363 | 0.000 | n/a | 0.000 | 0.000 | 0.869 | 203.288 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-91/journal/page | none observed |
| 629e813a778b18eb0000000000000f35 | 204.324 | 0.000 | n/a | 0.000 | 0.000 | 0.467 | 203.697 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-70/journal/page | none observed |
| 629e813a778b18eb0000000000000ee8 | 204.306 | 0.000 | n/a | 0.000 | 0.000 | 3.336 | 200.790 | 0.014 | n/a | 0.078 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-93/journal/page | none observed |
| 629e813a778b18eb0000000000000f93 | 204.190 | 0.000 | n/a | 0.000 | 0.000 | 3.488 | 200.563 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-86/journal/page | none observed |
| 629e813a778b18eb0000000000000f22 | 204.110 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 202.873 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-109/journal/page | none observed |
| 629e813a778b18eb0000000000000ea5 | 203.668 | 0.000 | n/a | 0.000 | 0.000 | 1.438 | 202.058 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-75/journal/page | none observed |
| 629e813a778b18eb0000000000000ef9 | 203.551 | 0.000 | n/a | 0.000 | 0.000 | 2.665 | 200.737 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-101/journal/page | none observed |
| 629e813a778b18eb0000000000000f56 | 203.469 | 0.000 | n/a | 0.000 | 0.000 | 2.838 | 200.501 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-100/journal/page | none observed |
| 629e813a778b18eb0000000000000f1b | 203.468 | 0.000 | n/a | 0.000 | 0.000 | 2.600 | 200.714 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-120/journal/page | none observed |
| 629e813a778b18eb0000000000000f44 | 203.377 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 202.560 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-91/journal/page | none observed |
| 629e813a778b18eb0000000000000f55 | 203.348 | 0.000 | n/a | 0.000 | 0.000 | 2.628 | 200.559 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-80/journal/page | none observed |
| 629e813a778b18eb0000000000000f3c | 203.284 | 0.000 | n/a | 0.000 | 0.000 | 2.141 | 200.926 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-115/journal/page | none observed |
| 629e813a778b18eb0000000000000ed7 | 202.872 | 0.000 | n/a | 0.000 | 0.000 | 0.410 | 202.321 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-72/journal/page | none observed |
| 629e813a778b18eb0000000000000f8b | 202.826 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 201.818 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-126/journal/page | none observed |
| 629e813a778b18eb0000000000000f71 | 202.739 | 0.000 | n/a | 0.000 | 0.000 | 0.486 | 202.089 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-120/journal/page | none observed |
| 629e813a778b18eb0000000000000efa | 202.732 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 201.697 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-113/journal/page | none observed |

## P3 / tail / read (841 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.170 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.472 | 200.547 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 203.088 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.097 | 201.587 | 1.131 | n/a | 0.105 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 629e813a778b18eb0000000000001333 | 217.051 | 0.000 | n/a | 0.000 | 0.000 | 0.509 | 216.355 | 0.016 | n/a | 0.056 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 629e813a778b18eb0000000000001090 | 205.625 | 0.000 | n/a | 0.000 | 0.000 | 0.434 | 205.009 | 0.023 | n/a | 0.065 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-102/journal/page | none observed |
| 629e813a778b18eb0000000000001205 | 205.462 | 0.000 | n/a | 0.000 | 0.000 | 3.808 | 201.129 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.414 | 0.000 | 0.000 | 0.414 | gw-r/thread-41/journal/page | none observed |
| 629e813a778b18eb00000000000010a6 | 204.617 | 0.000 | n/a | 0.000 | 0.000 | 1.227 | 203.237 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-88/journal/page | none observed |
| 629e813a778b18eb0000000000001077 | 203.677 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 202.541 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-69/journal/page | none observed |
| 629e813a778b18eb0000000000000fd7 | 203.654 | 0.000 | n/a | 0.000 | 0.000 | 3.019 | 200.506 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-123/journal/page | none observed |
| 629e813a778b18eb0000000000000fe6 | 203.163 | 0.000 | n/a | 0.000 | 0.000 | 2.067 | 200.906 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-68/journal/page | none observed |
| 629e813a778b18eb00000000000012b3 | 203.148 | 0.000 | n/a | 0.000 | 0.000 | 2.338 | 200.609 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-119/journal/page | none observed |
| 629e813a778b18eb000000000000100e | 203.088 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 202.078 | 0.004 | n/a | 0.055 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-102/journal/page | none observed |
| 629e813a778b18eb0000000000001207 | 203.044 | 0.000 | n/a | 0.000 | 0.000 | 1.953 | 200.897 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-105/journal/page | none observed |
| 629e813a778b18eb0000000000001070 | 202.996 | 0.000 | n/a | 0.000 | 0.000 | 2.167 | 200.664 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-117/journal/page | none observed |
| 629e813a778b18eb0000000000000fa9 | 202.843 | 0.000 | n/a | 0.000 | 0.000 | 0.469 | 202.152 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-75/journal/page | none observed |
| 629e813a778b18eb00000000000012ba | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 1.931 | 200.682 | 0.018 | n/a | 0.051 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-129/journal/page | none observed |
| 629e813a778b18eb000000000000118d | 202.793 | 0.000 | n/a | 0.000 | 0.000 | 1.953 | 200.608 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-47/journal/page | none observed |
| 629e813a778b18eb000000000000115f | 202.773 | 0.000 | n/a | 0.000 | 0.000 | 1.115 | 201.281 | 0.024 | n/a | 0.081 | 0.000 | n/a | n/a | 0.272 | 0.000 | 0.000 | 0.272 | gw-r/thread-41/journal/page | none observed |
| 629e813a778b18eb000000000000121d | 202.761 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 201.413 | 0.011 | n/a | 0.115 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-120/journal/page | none observed |
| 629e813a778b18eb00000000000012e8 | 202.706 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 201.587 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-125/journal/page | none observed |
| 629e813a778b18eb000000000000118a | 202.700 | 0.000 | n/a | 0.000 | 0.000 | 1.184 | 201.167 | 0.011 | n/a | 0.132 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-129/journal/page | none observed |
| 629e813a778b18eb000000000000129c | 202.634 | 0.000 | n/a | 0.000 | 0.000 | 1.392 | 201.035 | 0.021 | n/a | 0.098 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-89/journal/page | none observed |
| 629e813a778b18eb00000000000012cf | 202.613 | 0.000 | n/a | 0.000 | 0.000 | 1.690 | 200.760 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-111/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3707 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/6.431 ms; post-ACK p50/p99: 0.441/2.110 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.879 | 11.260 | 10.925 | reported |
| All-primary p99 ms | 46.313 | 45.567 | 43.953 | <=50 |
| L256 5-10 p50Ms | 11.327 | 10.303 | 10.303 | <=10 |
| L256 5-10 p99Ms | 29.076 | 28.354 | 28.352 | <=50 |
| L256 11-25 p50Ms | 13.311 | 12.607 | 12.607 | <=10 |
| L256 11-25 p99Ms | 81.017 | 80.228 | 80.227 | <=50 |
| L256 26-50 p50Ms | 13.247 | 12.159 | 12.159 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 15.298 | 14.028 | 14.026 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 10.175 | 9.791 | 9.471 | <=10 |
| Burst 11-25 p50 ms | 12.863 | 12.159 | 11.839 | <=10 |
| L256 writer p99 ratio | 3.636 | 3.692 | 3.696 | <=1.25 |
| L256 writer maximum ms | 81.017 | 80.228 | 80.227 | <=2000 |
| L1024 writer p99 ratio | 0.797 | 0.787 | 0.787 | <=2 |
| L1024 writer maximum ms | 34.902 | 33.901 | 33.900 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 55.356/55.356 | 53.190 | 30.771 | 100.344 | 0.617/0.110 |
| 5-10 | 250-1000 | 131 | 11.460/34.842 | 10.861 | 6.481 | 15.797 | 0.070/0.021 |
| 5-10 | 50-100 | 75 | 8.912/37.919 | 8.611 | 4.990 | 12.334 | 0.049/0.019 |
| 11-25 | 250-1000 | 80 | 13.668/80.950 | 12.654 | 6.600 | 16.395 | 0.079/0.021 |
| 26-50 | 250-1000 | 22 | 20.212/90.399 | 18.116 | 10.653 | 24.151 | 0.095/0.023 |
| 5-10 | 100-250 | 72 | 10.466/45.817 | 9.660 | 5.860 | 14.209 | 0.064/0.020 |
| 5-10 | overlap | 903 | 11.803/44.218 | 11.454 | 7.141 | 15.789 | 0.038/0.018 |
| 26-50 | 0-50 | 179 | 15.255/41.212 | 14.231 | 7.472 | 18.858 | 0.064/0.021 |
| 11-25 | 100-250 | 30 | 11.942/26.352 | 11.145 | 6.251 | 15.849 | 0.064/0.020 |
| 11-25 | 0-50 | 509 | 11.166/37.029 | 10.487 | 5.665 | 14.157 | 0.054/0.020 |
| 5-10 | 0-50 | 1051 | 8.674/30.300 | 8.257 | 4.647 | 11.510 | 0.047/0.019 |
| 26-50 | overlap | 166 | 18.373/47.553 | 17.250 | 9.922 | 24.602 | 0.058/0.021 |
| 26-50 | 100-250 | 12 | 14.042/32.029 | 13.051 | 6.341 | 16.510 | 0.073/0.019 |
| 11-25 | 50-100 | 37 | 11.462/32.431 | 10.876 | 6.330 | 15.159 | 0.059/0.019 |
| 26-50 | 50-100 | 19 | 14.261/36.875 | 13.404 | 7.974 | 19.107 | 0.083/0.023 |
| 11-25 | overlap | 420 | 14.715/51.688 | 14.108 | 8.764 | 19.183 | 0.046/0.019 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1845 | 15 | 982.861 |
| burst | 1862 | 10 | 596.520 |

## Writer heap, GC and scheduler stalls

Source d709fd769d271992b6a87841489c90665585e919; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 500.123 / 592.873 |
| GC events / total duration / maximum ms | 899 / 2572.519 / 50.754 |
| GC events >50 ms / total duration ms | 1 / 50.754 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":885,"4":7,"8":7} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 46.313 / 25 / 1579.380 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

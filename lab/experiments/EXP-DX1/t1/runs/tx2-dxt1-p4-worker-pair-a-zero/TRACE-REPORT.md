# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (525.894 ms, trace `74b83bb6072e79280000000000000429`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (176.348 ms, trace `74b83bb6072e792800000000000004f1`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (150.280 ms, trace `74b83bb6072e7928000000000000271e`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (141.013 ms, trace `74b83bb6072e792800000000000026f5`); `gw-w/thread-70/peer.transact-await (includes order/network/storage)` (142.254 ms, trace `74b83bb6072e79280000000000002605`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-worker-pair-a-zero`; source `7e08cba64bbec1d542d2639ff32eb72b38443892`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 8532/8533 (99.988%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 8533/8533. Raw trace bytes: 18236032.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 480 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14071.638 | 1158.478 | 63.562 | 305 |
| baseline | 0 | 44527.736 | 1858.648 | 101.238 | 1065 |
| L1 | 0 | 44982.550 | 1109.913 | 45.198 | 1166 |
| L4 | 0 | 44964.374 | 7558.151 | 450.867 | 25111 |
| L16 | 0 | 44935.792 | 6909.881 | 359.152 | 24430 |
| L64 | 0 | 44645.584 | 955.923 | 19.919 | 1050 |
| L256 | 0 | 44658.764 | 988.655 | 14.264 | 1104 |
| L1024 | 0 | 44155.302 | 1171.576 | 36.670 | 1082 |
| recovery | 0 | 59021.672 | 1449.921 | 51.576 | 1690 |
| p4mix | 0 | 44427.887 | 1055.744 | 25.811 | 1220 |
| p4h1 | 0 | 44017.531 | 994.954 | 60.895 | 1090 |
| grow3 | 0 | 7411.448 | 1333.802 | 146.400 | 158 |
| p4h3 | 0 | 44520.926 | 987.709 | 17.128 | 1196 |
| grow10 | 0 | 14321.362 | 3820.906 | 298.166 | 356 |
| p4h10 | 0 | 44053.416 | 959.189 | 15.675 | 970 |
| presweep | 0 | 44723.532 | 1072.286 | 26.716 | 1230 |
| sweep | 0 | 44482.373 | 1035.628 | 31.172 | 970 |
| tail | 0 | 209640.764 | 18411.999 | 1636.151 | 53262 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 74b83bb6072e79280000000000000429 | driver.queue.scheduler-late | 525.894 | none | 0 / 32 |
| 74b83bb6072e79280000000000000429 | driver.queue.scheduler-dispatch | 0.402 | none | 0 / 32 |

Observed active steps while trace 74b83bb6072e79280000000000000429 waited: []

| 74b83bb6072e792800000000000004f1 | driver.queue.scheduler-late | 1.044 | none | 0 / 32 |
| 74b83bb6072e792800000000000004f1 | driver.queue.scheduler-dispatch | 0.104 | none | 0 / 32 |

Observed active steps while trace 74b83bb6072e792800000000000004f1 waited: []

| 74b83bb6072e7928000000000000271e | driver.queue.scheduler-dispatch | 0.068 | none | 0 / 32 |
| 74b83bb6072e7928000000000000271e | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 74b83bb6072e7928000000000000271e waited: []

| 74b83bb6072e792800000000000026f5 | driver.queue.scheduler-dispatch | 0.060 | none | 0 / 32 |
| 74b83bb6072e792800000000000026f5 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 74b83bb6072e792800000000000026f5 waited: []

| 74b83bb6072e79280000000000002605 | driver.queue.scheduler-dispatch | 0.060 | none | 0 / 32 |
| 74b83bb6072e79280000000000002605 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 74b83bb6072e79280000000000002605 waited: []

## P2 / outside-phases / commit (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.535 | 0.383 | 0.000 | 0.624 | 4.321 | 0.230 | 0.000 | 0.076 | 1.298 | 3.177 | 0.027 | n/a | 0.349 | 10.506 | n/a | n/a | 0.046 | 4.716 | 0.224 | 0.046 |
| p99 | 603.266 | 8.032 | 0.000 | 8.294 | 26.711 | 0.452 | 0.305 | 526.296 | 1.856 | 29.022 | 0.125 | n/a | 3.590 | 32.593 | n/a | n/a | 0.921 | 553.083 | 0.917 | 0.921 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000000429 | 603.266 | 26.711 | 0.077 | 0.000 | 526.296 | 1.298 | 14.639 | 0.125 | n/a | 0.605 | 32.593 | n/a | n/a | 0.921 | 553.083 | 0.917 | 0.921 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 74b83bb6072e79280000000000000462 | 61.851 | 6.427 | 0.230 | 0.305 | 0.073 | 1.854 | 29.022 | 0.059 | n/a | 2.314 | 21.507 | n/a | n/a | 0.059 | 7.036 | 0.114 | 0.059 | gw-w/thread-45/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000250d | 30.053 | 4.287 | 0.245 | 0.000 | 0.076 | 1.856 | 13.049 | 0.029 | n/a | 0.105 | 10.354 | n/a | n/a | 0.051 | 4.608 | 0.153 | 0.051 | gw-w/thread-44/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000277d | 25.427 | 4.402 | 0.266 | 0.000 | 0.048 | 1.208 | 3.571 | 0.023 | n/a | 0.097 | 15.778 | n/a | n/a | 0.035 | 4.716 | 0.185 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000277f | 24.105 | 3.890 | 0.238 | 0.000 | 0.047 | 1.404 | 5.701 | 0.042 | n/a | 0.203 | 12.547 | n/a | n/a | 0.034 | 4.175 | 0.173 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000051f | 22.913 | 4.026 | 0.297 | 0.000 | 0.066 | 1.827 | 9.800 | 0.055 | n/a | 0.751 | 6.044 | n/a | n/a | 0.046 | 4.390 | 0.192 | 0.046 | gw-w/thread-47/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000261a | 22.535 | 2.860 | 0.007 | 0.000 | 0.951 | 0.470 | 1.664 | 0.023 | n/a | 3.590 | 12.924 | n/a | n/a | 0.046 | 3.818 | 0.169 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000261d | 20.475 | 5.275 | 0.452 | 0.000 | 0.116 | 1.645 | 1.974 | 0.043 | n/a | 0.386 | 10.506 | n/a | n/a | 0.078 | 5.843 | 0.285 | 0.078 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000261e | 20.364 | 5.647 | 0.007 | 0.000 | 0.774 | 0.574 | 1.130 | 0.023 | n/a | 0.364 | 11.791 | n/a | n/a | 0.054 | 6.429 | 0.316 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002781 | 17.293 | 3.638 | 0.193 | 0.000 | 0.046 | 0.678 | 3.177 | 0.024 | n/a | 0.094 | 9.410 | n/a | n/a | 0.032 | 3.877 | 0.224 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002511 | 14.853 | 4.547 | 0.261 | 0.000 | 0.044 | 1.386 | 3.027 | 0.027 | n/a | 0.286 | 5.238 | n/a | n/a | 0.036 | 4.852 | 0.327 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000250e | 14.351 | 4.321 | 0.004 | 0.000 | 0.591 | 0.541 | 0.988 | 0.023 | n/a | 0.349 | 7.486 | n/a | n/a | 0.049 | 4.916 | 0.343 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002618 | 9.946 | 3.298 | 0.011 | 0.000 | 0.736 | 0.556 | 0.842 | 0.023 | n/a | 0.326 | 4.120 | n/a | n/a | 0.033 | 4.046 | 0.407 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit (27 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.126 | 1.006 | 0.000 | 1.865 | 7.732 | 0.305 | 0.000 | 0.352 | 1.870 | 11.541 | 0.065 | n/a | 0.558 | 21.339 | n/a | n/a | 0.077 | 9.135 | 0.212 | 0.077 |
| p99 | 130.348 | 14.584 | 1.729 | 19.494 | 49.691 | 0.976 | 7.328 | 1.382 | 7.636 | 35.004 | 4.593 | n/a | 4.015 | 92.175 | n/a | n/a | 0.705 | 50.811 | 0.448 | 0.705 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000045a | 130.348 | 25.670 | 0.021 | 7.328 | 1.382 | 1.177 | 1.954 | 0.038 | n/a | 0.445 | 92.175 | n/a | n/a | 0.157 | 34.402 | 0.264 | 0.157 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000042e | 122.799 | 49.691 | 0.768 | 0.000 | 0.352 | 4.436 | 29.590 | 0.351 | n/a | 1.109 | 36.426 | n/a | n/a | 0.077 | 50.811 | 0.414 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000043a | 92.848 | 14.448 | 0.772 | 0.000 | 0.528 | 7.636 | 35.004 | 4.593 | n/a | 0.466 | 29.247 | n/a | n/a | 0.156 | 15.747 | 0.170 | 0.156 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000454 | 69.418 | 7.304 | 0.730 | 0.502 | 0.118 | 2.584 | 16.993 | 0.096 | n/a | 0.882 | 40.126 | n/a | n/a | 0.082 | 8.655 | 0.125 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000436 | 69.323 | 11.282 | 0.976 | 0.000 | 0.092 | 2.843 | 24.524 | 0.065 | n/a | 0.601 | 28.873 | n/a | n/a | 0.067 | 12.350 | 0.178 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000044c | 66.295 | 8.843 | 0.460 | 0.495 | 0.218 | 2.801 | 14.445 | 0.040 | n/a | 0.558 | 38.389 | n/a | n/a | 0.046 | 10.016 | 0.151 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000460 | 65.367 | 8.345 | 0.792 | 0.563 | 0.089 | 3.211 | 21.553 | 0.098 | n/a | 0.445 | 30.206 | n/a | n/a | 0.064 | 9.789 | 0.150 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000444 | 63.195 | 10.035 | 0.752 | 0.000 | 0.183 | 2.450 | 21.891 | 0.094 | n/a | 0.429 | 27.246 | n/a | n/a | 0.115 | 10.970 | 0.174 | 0.115 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000044e | 61.413 | 8.623 | 0.008 | 0.000 | 0.505 | 1.011 | 9.067 | 0.112 | n/a | 4.015 | 38.031 | n/a | n/a | 0.042 | 9.135 | 0.149 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000432 | 60.327 | 15.254 | 0.510 | 0.000 | 0.813 | 4.096 | 21.302 | 0.060 | n/a | 0.383 | 17.792 | n/a | n/a | 0.119 | 16.577 | 0.275 | 0.119 | gw-w/thread-44/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000000458 | 59.830 | 7.333 | 0.317 | 4.793 | 0.121 | 1.776 | 11.541 | 0.146 | n/a | 1.084 | 32.661 | n/a | n/a | 0.058 | 12.564 | 0.210 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000043c | 58.317 | 7.478 | 0.341 | 0.000 | 0.083 | 2.953 | 27.129 | 0.123 | n/a | 0.454 | 19.666 | n/a | n/a | 0.089 | 7.903 | 0.136 | 0.089 | gw-w/thread-49/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000000430 | 49.162 | 13.557 | 0.011 | 0.000 | 0.732 | 0.887 | 3.289 | 0.052 | n/a | 0.343 | 30.108 | n/a | n/a | 0.182 | 14.300 | 0.291 | 0.182 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000450 | 47.126 | 7.732 | 0.476 | 0.502 | 0.117 | 3.399 | 15.980 | 0.060 | n/a | 0.653 | 18.119 | n/a | n/a | 0.089 | 8.827 | 0.187 | 0.089 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000442 | 46.491 | 8.174 | 0.384 | 0.000 | 0.108 | 2.036 | 12.749 | 0.068 | n/a | 0.929 | 21.339 | n/a | n/a | 0.705 | 8.667 | 0.186 | 0.705 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000045e | 46.370 | 6.851 | 0.305 | 0.479 | 0.070 | 1.870 | 14.042 | 0.076 | n/a | 0.243 | 22.379 | n/a | n/a | 0.055 | 7.706 | 0.166 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000438 | 45.177 | 19.982 | 0.010 | 0.000 | 0.269 | 1.973 | 3.375 | 0.063 | n/a | 1.198 | 18.167 | n/a | n/a | 0.139 | 20.261 | 0.448 | 0.139 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000456 | 39.196 | 7.320 | 0.020 | 5.908 | 0.936 | 1.039 | 1.366 | 0.029 | n/a | 0.230 | 22.266 | n/a | n/a | 0.084 | 14.183 | 0.362 | 0.084 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000042c | 36.240 | 6.377 | 0.008 | 0.000 | 0.395 | 1.809 | 12.375 | 0.089 | n/a | 2.581 | 12.477 | n/a | n/a | 0.129 | 6.781 | 0.187 | 0.129 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000043d | 35.787 | 11.529 | 0.013 | 0.000 | 1.300 | 1.009 | 7.325 | 0.058 | n/a | 0.256 | 14.236 | n/a | n/a | 0.060 | 12.842 | 0.359 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.649 | 1.734 | 0.000 | 3.124 | 6.395 | 0.008 | 0.000 | 0.732 | 1.072 | 3.289 | 0.050 | n/a | 0.445 | 13.676 | n/a | n/a | 0.084 | 7.359 | 0.252 | 0.084 |
| p99 | 130.348 | 14.584 | 1.729 | 19.494 | 25.670 | 0.021 | 7.328 | 1.382 | 1.809 | 12.375 | 0.103 | n/a | 2.581 | 92.175 | n/a | n/a | 0.182 | 34.402 | 0.362 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000045a | 130.348 | 25.670 | 0.021 | 7.328 | 1.382 | 1.177 | 1.954 | 0.038 | n/a | 0.445 | 92.175 | n/a | n/a | 0.157 | 34.402 | 0.264 | 0.157 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000430 | 49.162 | 13.557 | 0.011 | 0.000 | 0.732 | 0.887 | 3.289 | 0.052 | n/a | 0.343 | 30.108 | n/a | n/a | 0.182 | 14.300 | 0.291 | 0.182 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000456 | 39.196 | 7.320 | 0.020 | 5.908 | 0.936 | 1.039 | 1.366 | 0.029 | n/a | 0.230 | 22.266 | n/a | n/a | 0.084 | 14.183 | 0.362 | 0.084 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000042c | 36.240 | 6.377 | 0.008 | 0.000 | 0.395 | 1.809 | 12.375 | 0.089 | n/a | 2.581 | 12.477 | n/a | n/a | 0.129 | 6.781 | 0.187 | 0.129 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000044a | 35.649 | 6.395 | 0.013 | 0.000 | 1.148 | 0.772 | 5.555 | 0.043 | n/a | 1.260 | 20.424 | n/a | n/a | 0.039 | 7.556 | 0.212 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000434 | 29.255 | 6.970 | 0.008 | 0.000 | 0.382 | 1.263 | 6.471 | 0.050 | n/a | 0.325 | 13.676 | n/a | n/a | 0.111 | 7.359 | 0.252 | 0.111 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000447 | 22.574 | 4.108 | 0.005 | 0.000 | 1.191 | 0.938 | 5.136 | 0.087 | n/a | 0.314 | 10.759 | n/a | n/a | 0.036 | 5.304 | 0.235 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000045c | 15.907 | 3.625 | 0.005 | 0.000 | 0.284 | 1.577 | 1.484 | 0.033 | n/a | 0.465 | 8.385 | n/a | n/a | 0.047 | 3.915 | 0.246 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000452 | 15.647 | 4.890 | 0.006 | 0.000 | 0.563 | 1.072 | 1.933 | 0.103 | n/a | 0.713 | 6.302 | n/a | n/a | 0.065 | 5.459 | 0.349 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.083 | 0.797 | 0.000 | 1.709 | 6.102 | 0.028 | 0.000 | 0.188 | 1.630 | 3.361 | 0.056 | n/a | 0.471 | 14.039 | n/a | n/a | 0.066 | 7.162 | 0.254 | 0.066 |
| p99 | 186.281 | 17.674 | 0.024 | 18.612 | 48.821 | 1.434 | 6.693 | 24.314 | 46.671 | 58.644 | 0.341 | n/a | 4.472 | 176.348 | n/a | n/a | 0.360 | 51.898 | 0.672 | 0.360 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000004f1 | 186.281 | 5.241 | 0.011 | 0.000 | 1.148 | 0.906 | 2.095 | 0.145 | n/a | 0.286 | 176.348 | n/a | n/a | 0.101 | 6.400 | 0.034 | 0.101 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004a7 | 133.446 | 48.821 | 0.519 | 1.194 | 0.110 | 5.000 | 40.521 | 0.059 | n/a | 1.445 | 35.662 | n/a | n/a | 0.115 | 50.644 | 0.380 | 0.115 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004f2 | 121.594 | 4.202 | 0.220 | 0.000 | 0.073 | 46.671 | 58.644 | 0.067 | n/a | 0.347 | 11.312 | n/a | n/a | 0.057 | 4.495 | 0.037 | 0.057 | gw-w/thread-44/gateway.admitted-work | driver.publication 1.854ms |
| 74b83bb6072e792800000000000004c3 | 106.869 | 4.434 | 0.338 | 0.647 | 0.095 | 2.210 | 9.654 | 0.053 | n/a | 0.222 | 89.140 | n/a | n/a | 0.075 | 5.514 | 0.052 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004a9 | 95.163 | 46.231 | 0.025 | 0.000 | 0.893 | 4.021 | 10.661 | 0.067 | n/a | 0.550 | 32.511 | n/a | n/a | 0.206 | 47.148 | 0.495 | 0.206 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000512 | 89.479 | 6.740 | 0.006 | 0.000 | 1.114 | 2.697 | 4.075 | 0.045 | n/a | 0.625 | 74.073 | n/a | n/a | 0.105 | 7.860 | 0.088 | 0.105 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000047f | 78.435 | 9.161 | 0.469 | 0.953 | 0.140 | 2.969 | 26.254 | 0.066 | n/a | 0.867 | 37.455 | n/a | n/a | 0.102 | 10.723 | 0.137 | 0.102 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000479 | 78.025 | 25.915 | 0.016 | 2.240 | 23.726 | 1.196 | 5.000 | 0.066 | n/a | 0.416 | 19.091 | n/a | n/a | 0.360 | 51.898 | 0.665 | 0.360 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 74b83bb6072e7928000000000000046a | 69.968 | 11.112 | 0.541 | 0.794 | 0.069 | 2.049 | 25.325 | 0.067 | n/a | 0.471 | 29.499 | n/a | n/a | 0.042 | 12.515 | 0.179 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000475 | 62.023 | 7.133 | 0.284 | 0.583 | 0.068 | 1.859 | 15.145 | 0.055 | n/a | 0.228 | 36.610 | n/a | n/a | 0.058 | 8.069 | 0.130 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000047c | 61.107 | 10.821 | 0.015 | 2.248 | 0.205 | 1.182 | 2.718 | 0.070 | n/a | 0.683 | 43.102 | n/a | n/a | 0.064 | 13.288 | 0.217 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000046f | 57.802 | 8.981 | 0.275 | 0.434 | 0.116 | 2.514 | 24.986 | 0.068 | n/a | 0.472 | 19.881 | n/a | n/a | 0.075 | 9.806 | 0.170 | 0.075 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000046d | 55.922 | 7.948 | 0.437 | 0.286 | 0.162 | 6.204 | 20.576 | 0.093 | n/a | 0.287 | 19.814 | n/a | n/a | 0.115 | 8.832 | 0.158 | 0.115 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000517 | 55.719 | 4.938 | 0.318 | 0.000 | 0.112 | 1.871 | 26.465 | 0.071 | n/a | 0.389 | 21.486 | n/a | n/a | 0.070 | 5.367 | 0.096 | 0.070 | gw-w/thread-48/gateway.admitted-work | none observed |
| 74b83bb6072e792800000000000004d1 | 52.362 | 6.289 | 0.306 | 0.448 | 0.120 | 1.694 | 18.590 | 0.070 | n/a | 4.472 | 20.292 | n/a | n/a | 0.081 | 7.162 | 0.137 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004e7 | 51.612 | 8.042 | 0.907 | 0.000 | 0.082 | 2.846 | 17.757 | 0.045 | n/a | 0.304 | 21.575 | n/a | n/a | 0.055 | 9.031 | 0.175 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000047b | 49.994 | 7.289 | 0.390 | 0.650 | 0.139 | 2.158 | 15.201 | 0.073 | n/a | 2.282 | 21.754 | n/a | n/a | 0.057 | 8.468 | 0.169 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004ac | 46.184 | 6.727 | 0.013 | 0.000 | 24.314 | 1.045 | 2.240 | 0.041 | n/a | 0.614 | 11.143 | n/a | n/a | 0.048 | 31.054 | 0.672 | 0.048 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 7.763ms; driver.publication 1.600ms |
| 74b83bb6072e79280000000000000485 | 46.119 | 5.245 | 0.355 | 0.780 | 0.188 | 1.940 | 18.633 | 0.049 | n/a | 0.217 | 18.628 | n/a | n/a | 0.084 | 6.568 | 0.142 | 0.084 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000050d | 45.445 | 4.650 | 0.288 | 0.000 | 0.068 | 1.531 | 13.722 | 0.047 | n/a | 0.240 | 24.855 | n/a | n/a | 0.043 | 5.007 | 0.110 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (26 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.010 | 0.987 | 0.000 | 2.220 | 5.241 | 0.006 | 0.000 | 0.792 | 1.053 | 2.006 | 0.044 | n/a | 0.425 | 11.143 | n/a | n/a | 0.065 | 6.362 | 0.296 | 0.065 |
| p99 | 186.281 | 3.141 | 0.014 | 5.738 | 13.618 | 0.015 | 2.248 | 24.314 | 4.656 | 12.845 | 0.145 | n/a | 3.406 | 176.348 | n/a | n/a | 0.143 | 31.054 | 0.672 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000004f1 | 186.281 | 5.241 | 0.011 | 0.000 | 1.148 | 0.906 | 2.095 | 0.145 | n/a | 0.286 | 176.348 | n/a | n/a | 0.101 | 6.400 | 0.034 | 0.101 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000047c | 61.107 | 10.821 | 0.015 | 2.248 | 0.205 | 1.182 | 2.718 | 0.070 | n/a | 0.683 | 43.102 | n/a | n/a | 0.064 | 13.288 | 0.217 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004ac | 46.184 | 6.727 | 0.013 | 0.000 | 24.314 | 1.045 | 2.240 | 0.041 | n/a | 0.614 | 11.143 | n/a | n/a | 0.048 | 31.054 | 0.672 | 0.048 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 7.763ms; driver.publication 1.600ms |
| 74b83bb6072e7928000000000000046c | 37.291 | 9.839 | 0.005 | 0.000 | 0.945 | 4.550 | 12.845 | 0.060 | n/a | 0.613 | 8.293 | n/a | n/a | 0.143 | 10.789 | 0.289 | 0.143 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004b3 | 36.138 | 5.272 | 0.006 | 0.000 | 0.571 | 1.185 | 8.294 | 0.058 | n/a | 0.317 | 20.370 | n/a | n/a | 0.065 | 5.848 | 0.162 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000515 | 34.326 | 13.618 | 0.015 | 0.000 | 1.669 | 2.055 | 2.006 | 0.046 | n/a | 0.453 | 14.330 | n/a | n/a | 0.134 | 15.302 | 0.446 | 0.134 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000468 | 34.227 | 6.632 | 0.010 | 0.000 | 1.083 | 2.828 | 2.828 | 0.066 | n/a | 0.621 | 20.098 | n/a | n/a | 0.061 | 7.725 | 0.226 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000507 | 33.339 | 5.091 | 0.014 | 0.000 | 0.604 | 1.938 | 1.644 | 0.039 | n/a | 0.223 | 23.717 | n/a | n/a | 0.070 | 5.708 | 0.171 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000491 | 32.376 | 9.661 | 0.014 | 0.000 | 2.288 | 4.656 | 4.485 | 0.059 | n/a | 0.406 | 10.696 | n/a | n/a | 0.112 | 11.963 | 0.369 | 0.112 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000487 | 30.973 | 8.347 | 0.011 | 0.000 | 1.008 | 1.559 | 5.122 | 0.094 | n/a | 3.406 | 11.346 | n/a | n/a | 0.080 | 9.366 | 0.302 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004e5 | 29.411 | 3.749 | 0.005 | 0.000 | 0.188 | 1.630 | 1.768 | 0.029 | n/a | 0.278 | 21.715 | n/a | n/a | 0.049 | 3.942 | 0.134 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004a3 | 25.073 | 5.146 | 0.014 | 0.000 | 1.202 | 2.530 | 2.288 | 0.068 | n/a | 0.485 | 13.279 | n/a | n/a | 0.059 | 6.362 | 0.254 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000503 | 21.101 | 3.457 | 0.005 | 0.000 | 0.550 | 0.985 | 2.606 | 0.043 | n/a | 0.294 | 13.114 | n/a | n/a | 0.047 | 4.012 | 0.190 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004f9 | 21.010 | 5.647 | 0.008 | 0.000 | 0.792 | 2.052 | 1.728 | 0.038 | n/a | 0.369 | 10.299 | n/a | n/a | 0.077 | 6.446 | 0.307 | 0.077 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004db | 20.378 | 5.140 | 0.006 | 0.000 | 1.189 | 0.795 | 3.081 | 0.079 | n/a | 1.137 | 8.860 | n/a | n/a | 0.091 | 6.335 | 0.311 | 0.091 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000051d | 20.040 | 5.018 | 0.005 | 0.000 | 0.912 | 0.891 | 1.263 | 0.030 | n/a | 0.224 | 11.659 | n/a | n/a | 0.038 | 5.935 | 0.296 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004b7 | 19.203 | 6.165 | 0.007 | 0.000 | 1.272 | 1.132 | 2.416 | 0.057 | n/a | 0.962 | 7.085 | n/a | n/a | 0.109 | 7.443 | 0.388 | 0.109 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000004c1 | 19.079 | 4.165 | 0.005 | 0.000 | 0.902 | 0.894 | 1.162 | 0.032 | n/a | 0.425 | 11.431 | n/a | n/a | 0.062 | 5.073 | 0.266 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000050f | 18.199 | 7.672 | 0.006 | 0.000 | 0.183 | 0.771 | 1.186 | 0.029 | n/a | 0.724 | 7.587 | n/a | n/a | 0.041 | 7.861 | 0.432 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000518 | 18.150 | 3.600 | 0.006 | 0.000 | 0.095 | 0.774 | 1.255 | 0.040 | n/a | 0.196 | 12.143 | n/a | n/a | 0.041 | 3.700 | 0.204 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (241 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.584 | n/a | n/a | n/a | 47.223 | 19.042 | 2.974 | 0.000 | 0.139 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 75.917 | 0.986 | 0.028 |
| p99 | 362.388 | n/a | n/a | n/a | 123.545 | 157.090 | 29.698 | 0.000 | 65.738 | 60.613 | 0.005 | n/a | 0.011 | 0.000 | n/a | n/a | 163.625 | 232.831 | 1.000 | 163.625 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000030a1 | 453.712 | 49.645 | 129.216 | 2.615 | 0.000 | 0.333 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 271.904 | 181.475 | 0.400 | 271.904 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.533ms; driver.publication 2.441ms; driver.publication 2.098ms; driver.publication 2.035ms; driver.publication 1.739ms |
| 74b83bb6072e792800000000000030a0 | 367.568 | 97.390 | 80.277 | 4.818 | 0.000 | 0.251 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 184.832 | 182.486 | 0.496 | 184.832 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.793ms; driver.publication 2.441ms; driver.publication 2.035ms; driver.publication 1.739ms; driver.publication 1.684ms |
| 74b83bb6072e79280000000000003097 | 362.388 | 109.295 | 113.545 | 9.990 | 0.000 | 0.374 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 129.183 | 232.831 | 0.642 | 129.183 | node-14/thread-3/socket.wait-first-byte | driver.publication 6.139ms; driver.publication 2.793ms; driver.publication 2.441ms; driver.publication 2.035ms; driver.publication 1.739ms |
| 74b83bb6072e792800000000000030af | 332.345 | 77.935 | 174.682 | 20.480 | 0.000 | 0.692 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 58.557 | 273.097 | 0.822 | 58.557 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.533ms; driver.publication 2.098ms; driver.publication 2.035ms; driver.publication 1.739ms; driver.publication 1.684ms |
| 74b83bb6072e7928000000000000274d | 291.686 | 19.599 | 157.090 | 109.080 | 0.000 | 0.681 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.235 | 285.769 | 0.980 | 5.235 | node-14/thread-0/rpc.replica.observe | client.encode 3.972ms; client.encode 2.600ms; client.encode 2.368ms |
| 74b83bb6072e79280000000000004362 | 288.698 | 74.751 | 10.272 | 10.790 | 0.000 | 140.181 | 17.744 | 34.940 | n/a | 0.010 | 0.000 | n/a | n/a | 0.009 | 95.813 | 0.332 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication 3.543ms; driver.publication 2.814ms; driver.publication 2.188ms; driver.publication 1.249ms; driver.publication 1.236ms |
| 74b83bb6072e7928000000000000456a | 271.206 | 208.974 | 0.479 | 17.159 | 0.000 | 1.323 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.272 | 226.611 | 0.836 | 43.272 | node-14/thread-3/worker.gateway-observer.observe | none observed |
| 74b83bb6072e79280000000000002b0d | 262.269 | 94.996 | 57.030 | 18.507 | 0.000 | 31.101 | 60.613 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.007 | 170.532 | 0.650 | 0.007 | node-14/thread-3/client.reach | driver.publication 4.669ms; driver.publication 2.434ms; driver.expected-state.bind-receipt 1.968ms; driver.publication 1.654ms; driver.publication 1.368ms |
| 74b83bb6072e79280000000000003091 | 258.354 | 64.266 | 125.342 | 5.568 | 0.000 | 8.400 | 54.734 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.016 | 195.176 | 0.755 | 0.016 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 6.139ms; driver.publication 2.793ms; driver.publication 2.441ms; driver.publication 2.035ms; driver.publication 1.739ms |
| 74b83bb6072e792800000000000040ce | 234.677 | 54.275 | 16.489 | 0.000 | 0.000 | 0.288 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 163.625 | 70.764 | 0.302 | 163.625 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.818ms; driver.publication 1.610ms; driver.publication 1.584ms; driver.publication 1.248ms; driver.publication 1.180ms |
| 74b83bb6072e79280000000000003084 | 231.509 | 68.547 | 31.430 | 1.727 | 0.000 | 58.194 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 71.612 | 101.704 | 0.439 | 71.612 | node-14/thread-3/socket.wait-first-byte | driver.publication 6.139ms; driver.publication 2.793ms; driver.publication 2.669ms; driver.publication 2.441ms; driver.publication 2.164ms |
| 74b83bb6072e79280000000000003f76 | 224.468 | 82.111 | 113.151 | 7.133 | 0.000 | 0.404 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.669 | 202.395 | 0.902 | 21.669 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.209ms; driver.publication 3.653ms; driver.publication 1.455ms; driver.expected-state.bind-receipt 1.381ms; driver.publication 1.309ms |
| 74b83bb6072e79280000000000004360 | 221.782 | 71.950 | 18.443 | 7.113 | 0.000 | 74.205 | 50.050 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.010 | 97.507 | 0.440 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.814ms; driver.publication 1.249ms; driver.publication 1.236ms; driver.publication 1.148ms; driver.publication 1.122ms |
| 74b83bb6072e7928000000000000394b | 210.834 | 62.759 | 0.742 | 5.959 | 0.000 | 0.774 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 140.601 | 69.459 | 0.329 | 140.601 | node-14/thread-3/socket.wait-first-byte | driver.publication 3.647ms; driver.expected-state.bind-receipt 1.426ms; driver.publication 1.238ms; driver.publication 1.146ms; driver.publication 1.125ms |
| 74b83bb6072e79280000000000003bce | 209.987 | 93.161 | 10.406 | 13.909 | 0.000 | 58.946 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.565 | 117.477 | 0.559 | 33.565 | node-14/thread-3/socket.body-read | driver.publication 5.655ms; driver.publication 2.439ms; driver.publication 1.917ms; driver.publication 1.554ms; driver.publication 1.387ms |
| 74b83bb6072e792800000000000014b9 | 199.028 | 63.929 | 0.383 | 6.276 | 0.000 | 0.653 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 127.786 | 70.588 | 0.355 | 127.786 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.167ms; driver.publication 1.096ms; driver.publication 1.041ms; driver.publication 1.020ms |
| 74b83bb6072e7928000000000000379d | 197.895 | 56.996 | 128.602 | 6.356 | 0.000 | 0.896 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.045 | 191.953 | 0.970 | 5.045 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.505ms; driver.publication 2.915ms; driver.publication 2.428ms; driver.publication 2.275ms; driver.publication 2.140ms |
| 74b83bb6072e792800000000000030c6 | 193.689 | 27.075 | 72.473 | 0.000 | 0.000 | 0.610 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 93.530 | 99.549 | 0.514 | 93.530 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.533ms; driver.publication 2.098ms; driver.publication 1.373ms; driver.publication 1.149ms; driver.expected-state.bind-receipt 1.102ms |
| 74b83bb6072e792800000000000030a4 | 191.375 | 75.327 | 52.104 | 3.587 | 0.000 | 0.280 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.078 | 131.017 | 0.685 | 60.078 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.035ms; driver.publication 1.739ms; driver.publication 1.684ms; driver.publication 1.445ms; driver.publication 1.417ms |
| 74b83bb6072e79280000000000003093 | 188.891 | 67.965 | 93.351 | 4.695 | 0.000 | 0.607 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.273 | 166.011 | 0.879 | 22.273 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 6.139ms; driver.publication 2.793ms; driver.publication 2.441ms; driver.publication 1.610ms; driver.publication 1.491ms |

## P2 / L1 / commit (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.854 | 0.653 | 0.000 | 1.477 | 4.529 | 0.012 | 0.000 | 0.159 | 1.271 | 5.451 | 0.040 | n/a | 0.330 | 12.556 | n/a | n/a | 0.058 | 5.115 | 0.199 | 0.058 |
| p99 | 73.859 | 2.569 | 0.464 | 11.495 | 16.556 | 1.857 | 0.000 | 1.165 | 9.808 | 33.430 | 0.131 | n/a | 4.557 | 50.437 | n/a | n/a | 0.134 | 16.702 | 0.574 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000059a | 82.495 | 8.582 | 0.369 | 0.000 | 0.159 | 9.808 | 33.478 | 0.257 | n/a | 7.375 | 22.368 | n/a | n/a | 0.099 | 9.110 | 0.110 | 0.099 | gw-w/thread-48/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000058d | 73.859 | 6.928 | 0.006 | 0.000 | 0.437 | 0.921 | 5.680 | 0.056 | n/a | 0.359 | 59.412 | n/a | n/a | 0.060 | 7.371 | 0.100 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000582 | 64.898 | 6.703 | 0.301 | 0.000 | 0.143 | 1.559 | 32.871 | 0.068 | n/a | 3.526 | 19.640 | n/a | n/a | 0.087 | 7.147 | 0.110 | 0.087 | gw-w/thread-48/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000053b | 64.755 | 4.316 | 0.006 | 0.000 | 0.155 | 0.787 | 5.451 | 0.064 | n/a | 3.782 | 50.125 | n/a | n/a | 0.069 | 4.477 | 0.069 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000005c9 | 64.551 | 5.531 | 0.005 | 0.000 | 0.688 | 0.906 | 29.375 | 0.041 | n/a | 0.216 | 27.737 | n/a | n/a | 0.052 | 6.224 | 0.096 | 0.052 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| 74b83bb6072e79280000000000000578 | 64.288 | 3.837 | 0.255 | 0.000 | 0.103 | 1.592 | 33.430 | 0.062 | n/a | 0.535 | 24.425 | n/a | n/a | 0.049 | 4.195 | 0.065 | 0.049 | gw-w/thread-44/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000000556 | 64.206 | 4.651 | 0.261 | 0.000 | 0.081 | 1.550 | 8.842 | 0.048 | n/a | 0.746 | 47.970 | n/a | n/a | 0.056 | 4.993 | 0.078 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000530 | 61.907 | 6.092 | 0.007 | 0.000 | 0.590 | 1.654 | 2.685 | 0.035 | n/a | 0.250 | 50.437 | n/a | n/a | 0.157 | 6.689 | 0.108 | 0.157 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000560 | 54.620 | 4.752 | 0.242 | 0.000 | 0.077 | 1.915 | 23.143 | 0.075 | n/a | 2.450 | 21.924 | n/a | n/a | 0.042 | 5.071 | 0.093 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000056e | 51.244 | 6.988 | 1.137 | 0.000 | 0.100 | 2.647 | 16.195 | 0.067 | n/a | 3.580 | 20.444 | n/a | n/a | 0.086 | 8.225 | 0.161 | 0.086 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000005c6 | 49.098 | 5.023 | 0.306 | 0.000 | 0.062 | 1.475 | 6.208 | 0.033 | n/a | 0.385 | 35.471 | n/a | n/a | 0.134 | 5.391 | 0.110 | 0.134 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000523 | 48.457 | 16.556 | 0.011 | 0.000 | 0.135 | 3.348 | 13.150 | 0.100 | n/a | 0.422 | 14.676 | n/a | n/a | 0.059 | 16.702 | 0.345 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000538 | 47.986 | 5.602 | 0.005 | 0.000 | 0.844 | 0.769 | 1.861 | 0.026 | n/a | 0.168 | 38.615 | n/a | n/a | 0.095 | 6.452 | 0.134 | 0.095 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000543 | 43.824 | 6.263 | 0.385 | 0.000 | 0.068 | 2.230 | 14.993 | 0.049 | n/a | 0.272 | 19.511 | n/a | n/a | 0.052 | 6.716 | 0.153 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000527 | 42.584 | 3.938 | 0.266 | 0.000 | 0.104 | 3.074 | 13.028 | 0.044 | n/a | 0.213 | 21.863 | n/a | n/a | 0.054 | 4.308 | 0.101 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000053f | 42.147 | 4.538 | 0.315 | 0.000 | 0.137 | 2.304 | 18.567 | 0.050 | n/a | 0.640 | 15.485 | n/a | n/a | 0.111 | 4.990 | 0.118 | 0.111 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000005e8 | 38.817 | 6.712 | 0.493 | 0.000 | 0.080 | 2.251 | 11.754 | 0.071 | n/a | 0.256 | 17.136 | n/a | n/a | 0.064 | 7.285 | 0.188 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000059d | 38.681 | 4.861 | 0.226 | 0.000 | 0.077 | 2.149 | 18.135 | 0.129 | n/a | 0.432 | 12.610 | n/a | n/a | 0.062 | 5.164 | 0.134 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000005e6 | 38.676 | 4.209 | 0.358 | 0.000 | 0.075 | 1.797 | 10.319 | 0.104 | n/a | 0.256 | 21.478 | n/a | n/a | 0.079 | 4.642 | 0.120 | 0.079 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000536 | 38.446 | 5.233 | 0.296 | 0.000 | 0.065 | 1.629 | 13.303 | 0.049 | n/a | 0.338 | 17.465 | n/a | n/a | 0.068 | 5.594 | 0.146 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.481 | 0.881 | 0.000 | 2.051 | 4.325 | 0.006 | 0.000 | 0.558 | 0.807 | 1.454 | 0.034 | n/a | 0.403 | 10.112 | n/a | n/a | 0.052 | 5.115 | 0.292 | 0.052 |
| p99 | 64.755 | 1.665 | 0.464 | 16.348 | 21.886 | 0.016 | 0.000 | 1.124 | 10.012 | 15.654 | 0.109 | n/a | 4.557 | 50.125 | n/a | n/a | 0.104 | 22.025 | 0.582 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000053b | 64.755 | 4.316 | 0.006 | 0.000 | 0.155 | 0.787 | 5.451 | 0.064 | n/a | 3.782 | 50.125 | n/a | n/a | 0.069 | 4.477 | 0.069 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000538 | 47.986 | 5.602 | 0.005 | 0.000 | 0.844 | 0.769 | 1.861 | 0.026 | n/a | 0.168 | 38.615 | n/a | n/a | 0.095 | 6.452 | 0.134 | 0.095 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000597 | 37.841 | 21.886 | 0.015 | 0.000 | 0.124 | 1.551 | 1.889 | 0.065 | n/a | 0.819 | 11.441 | n/a | n/a | 0.052 | 22.025 | 0.582 | 0.052 | node-14/thread-0/driver.publication | none observed |
| 74b83bb6072e7928000000000000059b | 32.597 | 9.514 | 0.016 | 0.000 | 0.439 | 10.012 | 8.128 | 0.109 | n/a | 0.558 | 3.717 | n/a | n/a | 0.104 | 9.969 | 0.306 | 0.104 | node-14/thread-0/socket.wait-first-byte | none observed |
| 74b83bb6072e79280000000000000532 | 32.205 | 5.235 | 0.012 | 0.000 | 0.633 | 1.402 | 1.800 | 0.082 | n/a | 4.557 | 18.414 | n/a | n/a | 0.071 | 5.880 | 0.183 | 0.071 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000555 | 29.492 | 4.285 | 0.005 | 0.000 | 0.140 | 3.172 | 15.654 | 0.081 | n/a | 0.334 | 5.749 | n/a | n/a | 0.072 | 4.430 | 0.150 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000541 | 26.136 | 3.727 | 0.006 | 0.000 | 0.533 | 1.589 | 1.603 | 0.036 | n/a | 0.797 | 17.766 | n/a | n/a | 0.079 | 4.266 | 0.163 | 0.079 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000529 | 25.121 | 5.912 | 0.012 | 0.000 | 0.995 | 0.617 | 1.518 | 0.059 | n/a | 3.735 | 12.226 | n/a | n/a | 0.047 | 6.919 | 0.275 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000005a8 | 24.854 | 13.395 | 0.005 | 0.000 | 0.863 | 0.604 | 0.907 | 0.025 | n/a | 0.179 | 8.839 | n/a | n/a | 0.037 | 14.262 | 0.574 | 0.037 | node-14/thread-0/driver.publication | none observed |
| 74b83bb6072e792800000000000005d9 | 24.312 | 3.102 | 0.006 | 0.000 | 0.470 | 0.625 | 0.865 | 0.025 | n/a | 0.217 | 18.961 | n/a | n/a | 0.041 | 3.578 | 0.147 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000559 | 23.438 | 4.199 | 0.005 | 0.000 | 0.133 | 0.931 | 1.807 | 0.045 | n/a | 0.330 | 15.947 | n/a | n/a | 0.040 | 4.337 | 0.185 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000055e | 22.491 | 5.746 | 0.011 | 0.000 | 0.969 | 0.836 | 1.132 | 0.030 | n/a | 0.196 | 13.482 | n/a | n/a | 0.091 | 6.726 | 0.299 | 0.091 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000005c7 | 22.491 | 5.483 | 0.011 | 0.000 | 1.124 | 3.791 | 0.906 | 0.026 | n/a | 0.192 | 10.885 | n/a | n/a | 0.073 | 6.618 | 0.294 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000005b5 | 22.401 | 5.875 | 0.011 | 0.000 | 0.695 | 1.070 | 1.601 | 0.027 | n/a | 0.200 | 12.828 | n/a | n/a | 0.094 | 6.581 | 0.294 | 0.094 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000546 | 20.430 | 3.686 | 0.006 | 0.000 | 0.281 | 0.740 | 1.999 | 0.071 | n/a | 0.401 | 13.202 | n/a | n/a | 0.045 | 3.973 | 0.194 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000057d | 19.481 | 3.717 | 0.004 | 0.000 | 0.395 | 0.694 | 1.643 | 0.056 | n/a | 0.471 | 12.462 | n/a | n/a | 0.040 | 4.116 | 0.211 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.515ms |
| 74b83bb6072e792800000000000005d2 | 18.585 | 4.497 | 0.010 | 0.000 | 0.887 | 1.290 | 1.947 | 0.055 | n/a | 0.870 | 8.968 | n/a | n/a | 0.063 | 5.393 | 0.290 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000005b9 | 18.550 | 4.632 | 0.005 | 0.000 | 0.758 | 0.746 | 1.454 | 0.052 | n/a | 0.403 | 10.449 | n/a | n/a | 0.052 | 5.395 | 0.291 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000000561 | 18.522 | 3.357 | 0.006 | 0.000 | 0.521 | 0.956 | 1.215 | 0.030 | n/a | 0.483 | 11.910 | n/a | n/a | 0.045 | 3.884 | 0.210 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000005af | 17.967 | 6.847 | 0.005 | 0.000 | 0.539 | 0.682 | 1.016 | 0.027 | n/a | 0.187 | 8.613 | n/a | n/a | 0.050 | 7.391 | 0.411 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (1770 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.130 | 0.765 | 0.000 | 1.640 | 3.698 | 0.006 | 0.000 | 0.760 | 0.779 | 1.155 | 0.030 | n/a | 0.254 | 6.864 | n/a | n/a | 0.034 | 4.669 | 0.314 | 0.034 |
| p99 | 64.271 | 2.914 | 2.757 | 5.524 | 11.039 | 1.437 | 0.000 | 17.995 | 14.708 | 13.615 | 4.416 | n/a | 5.027 | 36.639 | n/a | n/a | 0.113 | 27.163 | 0.715 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000006dc | 99.103 | 3.816 | 0.007 | 0.000 | 0.761 | 7.573 | 1.858 | 0.023 | n/a | 0.090 | 84.918 | n/a | n/a | 0.056 | 4.584 | 0.046 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.531ms; driver.publication 1.137ms |
| 74b83bb6072e79280000000000000683 | 93.370 | 10.319 | 0.005 | 0.000 | 4.889 | 63.349 | 0.985 | 0.045 | n/a | 0.312 | 13.403 | n/a | n/a | 0.062 | 15.214 | 0.163 | 0.062 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 4.507ms; driver.publication 2.478ms; driver.expected-state.bind-receipt 1.358ms |
| 74b83bb6072e792800000000000006a4 | 86.710 | 4.349 | 0.010 | 0.000 | 60.390 | 0.736 | 0.915 | 0.035 | n/a | 3.809 | 16.403 | n/a | n/a | 0.063 | 64.749 | 0.747 | 0.063 | node-14/thread-0/driver.queue.subject | driver.publication 1.213ms; driver.publication 1.116ms; driver.publication 1.087ms; driver.publication 1.054ms; driver.publication 1.001ms |
| 74b83bb6072e792800000000000006df | 70.992 | 3.360 | 0.005 | 0.000 | 0.094 | 2.455 | 4.470 | 0.080 | n/a | 2.571 | 57.920 | n/a | n/a | 0.036 | 3.459 | 0.049 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.531ms; driver.publication 1.170ms; driver.publication 1.137ms |
| 74b83bb6072e79280000000000000687 | 70.600 | 7.998 | 4.961 | 0.000 | 13.863 | 8.520 | 0.841 | 0.018 | n/a | 0.110 | 34.262 | n/a | n/a | 0.027 | 26.822 | 0.380 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 4.104ms; driver.publication 1.573ms; driver.publication 1.131ms |
| 74b83bb6072e79280000000000000686 | 70.466 | 7.586 | 4.261 | 0.000 | 17.782 | 6.924 | 1.299 | 0.027 | n/a | 0.158 | 32.400 | n/a | n/a | 0.029 | 29.629 | 0.420 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 4.104ms |
| 74b83bb6072e7928000000000000063e | 69.734 | 5.510 | 0.007 | 0.000 | 0.523 | 1.586 | 23.883 | 0.104 | n/a | 0.310 | 37.696 | n/a | n/a | 0.115 | 6.041 | 0.087 | 0.115 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.098ms |
| 74b83bb6072e79280000000000000b53 | 68.832 | 8.306 | 0.100 | 0.000 | 2.004 | 33.352 | 3.599 | 4.984 | n/a | 1.117 | 15.350 | n/a | n/a | 0.021 | 10.410 | 0.151 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.add-commit 5.598ms; driver.publication 2.895ms; driver.publication 2.097ms; driver.publication 1.907ms; driver.publication 1.689ms |
| 74b83bb6072e7928000000000000063b | 68.743 | 4.662 | 0.191 | 0.000 | 0.012 | 1.620 | 16.993 | 0.041 | n/a | 0.203 | 44.989 | n/a | n/a | 0.032 | 4.865 | 0.071 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.548ms; driver.publication 1.098ms |
| 74b83bb6072e79280000000000000602 | 68.385 | 4.254 | 0.282 | 0.325 | 0.097 | 1.629 | 49.710 | 0.036 | n/a | 0.639 | 11.350 | n/a | n/a | 0.062 | 4.958 | 0.073 | 0.062 | gw-w/thread-47/gateway.admitted-work | none observed |
| 74b83bb6072e792800000000000005f6 | 68.165 | 5.216 | 0.375 | 0.000 | 0.021 | 1.833 | 14.845 | 0.086 | n/a | 1.473 | 44.290 | n/a | n/a | 0.028 | 5.611 | 0.082 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.513ms |
| 74b83bb6072e7928000000000000069b | 66.493 | 3.878 | 0.006 | 0.000 | 33.428 | 3.246 | 3.200 | 0.030 | n/a | 0.419 | 22.234 | n/a | n/a | 0.052 | 37.312 | 0.561 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 4.406ms; driver.publication 3.025ms; driver.publication 1.212ms; driver.publication 1.164ms; driver.publication 1.087ms |
| 74b83bb6072e792800000000000006d8 | 66.375 | 3.894 | 0.007 | 0.000 | 0.175 | 0.741 | 1.723 | 0.045 | n/a | 5.650 | 54.091 | n/a | n/a | 0.049 | 4.075 | 0.061 | 0.049 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.424ms; driver.publication 1.198ms |
| 74b83bb6072e7928000000000000062d | 65.360 | 6.729 | 0.011 | 0.000 | 14.748 | 2.987 | 2.559 | 0.054 | n/a | 2.239 | 35.997 | n/a | n/a | 0.035 | 21.489 | 0.329 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 20.747ms; driver.publication 7.099ms; driver.publication 3.250ms; driver.expected-state.bind-receipt 3.236ms; driver.expected-state.bind-receipt 1.600ms |
| 74b83bb6072e7928000000000000068b | 64.766 | 11.836 | 0.221 | 0.000 | 15.505 | 11.423 | 9.478 | 0.029 | n/a | 0.140 | 16.108 | n/a | n/a | 0.026 | 27.561 | 0.426 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 4.104ms; driver.publication 1.573ms; driver.publication 1.356ms; driver.publication 1.158ms; driver.publication 1.131ms |
| 74b83bb6072e79280000000000000aa4 | 64.549 | 3.320 | 0.003 | 0.000 | 2.724 | 18.584 | 1.888 | 7.794 | n/a | 0.071 | 30.138 | n/a | n/a | 0.028 | 6.047 | 0.094 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.345ms; driver.publication 1.143ms |
| 74b83bb6072e79280000000000000688 | 64.466 | 13.886 | 4.123 | 0.000 | 9.924 | 5.365 | 5.516 | 0.040 | n/a | 1.253 | 24.334 | n/a | n/a | 0.024 | 27.933 | 0.433 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.104ms; driver.publication 1.573ms |
| 74b83bb6072e792800000000000006db | 64.271 | 4.680 | 0.014 | 0.000 | 0.402 | 4.309 | 1.063 | 0.029 | n/a | 0.251 | 53.463 | n/a | n/a | 0.060 | 5.096 | 0.079 | 0.060 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.531ms |
| 74b83bb6072e79280000000000000886 | 63.328 | 17.811 | 0.021 | 0.000 | 0.840 | 14.240 | 12.384 | 0.081 | n/a | 1.536 | 16.389 | n/a | n/a | 0.028 | 18.671 | 0.295 | 0.028 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.538ms |
| 74b83bb6072e7928000000000000062c | 63.252 | 10.478 | 0.007 | 0.000 | 0.234 | 10.875 | 2.325 | 0.036 | n/a | 4.178 | 35.040 | n/a | n/a | 0.081 | 10.718 | 0.169 | 0.081 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 20.747ms; driver.publication 7.099ms; driver.expected-state.bind-receipt 1.600ms |

## P2 / L4 / commit / 5-10 facts (1033 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.516 | 0.640 | 0.000 | 1.499 | 3.221 | 0.005 | 0.000 | 0.797 | 0.769 | 0.971 | 0.030 | n/a | 0.250 | 6.221 | n/a | n/a | 0.033 | 4.136 | 0.311 | 0.033 |
| p99 | 53.795 | 2.071 | 2.642 | 5.169 | 8.766 | 0.204 | 0.000 | 18.200 | 18.305 | 8.228 | 4.383 | n/a | 4.906 | 35.077 | n/a | n/a | 0.107 | 27.163 | 0.747 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000000683 | 93.370 | 10.319 | 0.005 | 0.000 | 4.889 | 63.349 | 0.985 | 0.045 | n/a | 0.312 | 13.403 | n/a | n/a | 0.062 | 15.214 | 0.163 | 0.062 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 4.507ms; driver.publication 2.478ms; driver.expected-state.bind-receipt 1.358ms |
| 74b83bb6072e792800000000000006a4 | 86.710 | 4.349 | 0.010 | 0.000 | 60.390 | 0.736 | 0.915 | 0.035 | n/a | 3.809 | 16.403 | n/a | n/a | 0.063 | 64.749 | 0.747 | 0.063 | node-14/thread-0/driver.queue.subject | driver.publication 1.213ms; driver.publication 1.116ms; driver.publication 1.087ms; driver.publication 1.054ms; driver.publication 1.001ms |
| 74b83bb6072e79280000000000000687 | 70.600 | 7.998 | 4.961 | 0.000 | 13.863 | 8.520 | 0.841 | 0.018 | n/a | 0.110 | 34.262 | n/a | n/a | 0.027 | 26.822 | 0.380 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 4.104ms; driver.publication 1.573ms; driver.publication 1.131ms |
| 74b83bb6072e79280000000000000686 | 70.466 | 7.586 | 4.261 | 0.000 | 17.782 | 6.924 | 1.299 | 0.027 | n/a | 0.158 | 32.400 | n/a | n/a | 0.029 | 29.629 | 0.420 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 4.104ms |
| 74b83bb6072e7928000000000000063e | 69.734 | 5.510 | 0.007 | 0.000 | 0.523 | 1.586 | 23.883 | 0.104 | n/a | 0.310 | 37.696 | n/a | n/a | 0.115 | 6.041 | 0.087 | 0.115 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.098ms |
| 74b83bb6072e79280000000000000aa4 | 64.549 | 3.320 | 0.003 | 0.000 | 2.724 | 18.584 | 1.888 | 7.794 | n/a | 0.071 | 30.138 | n/a | n/a | 0.028 | 6.047 | 0.094 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.345ms; driver.publication 1.143ms |
| 74b83bb6072e7928000000000000062b | 61.958 | 26.978 | 0.006 | 0.000 | 0.832 | 1.510 | 2.226 | 0.038 | n/a | 0.530 | 29.732 | n/a | n/a | 0.107 | 27.816 | 0.449 | 0.107 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 7.099ms |
| 74b83bb6072e79280000000000000685 | 59.781 | 5.125 | 0.017 | 0.000 | 18.200 | 8.538 | 5.009 | 0.081 | n/a | 0.387 | 22.365 | n/a | n/a | 0.058 | 23.342 | 0.390 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 4.104ms |
| 74b83bb6072e79280000000000000b4d | 59.601 | 5.020 | 0.009 | 0.000 | 43.886 | 3.443 | 0.913 | 0.030 | n/a | 0.463 | 5.778 | n/a | n/a | 0.058 | 48.915 | 0.821 | 0.058 | node-14/thread-0/driver.queue.subject | driver.expected-state.add-commit 5.598ms; driver.publication 2.895ms; driver.publication 2.244ms; driver.publication 2.097ms; driver.publication 1.907ms |
| 74b83bb6072e79280000000000000aa6 | 58.688 | 3.264 | 0.007 | 0.000 | 0.690 | 18.664 | 0.706 | 0.009 | n/a | 0.077 | 35.225 | n/a | n/a | 0.045 | 3.961 | 0.067 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.346ms; driver.publication 1.345ms; driver.publication 1.190ms; driver.publication 1.143ms; driver.publication 1.007ms |
| 74b83bb6072e7928000000000000068a | 53.795 | 8.996 | 0.016 | 0.000 | 18.151 | 9.604 | 0.898 | 0.034 | n/a | 1.998 | 14.066 | n/a | n/a | 0.033 | 27.163 | 0.505 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.104ms; driver.publication 1.573ms; driver.publication 1.131ms; driver.publication 1.046ms |
| 74b83bb6072e7928000000000000068c | 53.368 | 4.707 | 2.704 | 0.000 | 6.191 | 19.661 | 10.992 | 0.088 | n/a | 0.187 | 8.800 | n/a | n/a | 0.037 | 13.602 | 0.255 | 0.037 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.305ms; driver.publication 1.573ms; driver.publication 1.356ms; driver.publication 1.131ms; driver.publication 1.046ms |
| 74b83bb6072e792800000000000008ae | 53.341 | 3.420 | 0.062 | 0.000 | 1.247 | 10.199 | 1.052 | 0.566 | n/a | 0.134 | 36.639 | n/a | n/a | 0.023 | 4.729 | 0.089 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.213ms |
| 74b83bb6072e7928000000000000069e | 53.301 | 3.591 | 0.104 | 0.000 | 0.439 | 1.356 | 0.823 | 6.250 | n/a | 0.056 | 40.646 | n/a | n/a | 0.037 | 4.134 | 0.078 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 4.406ms; driver.publication 3.025ms; driver.publication 1.212ms; driver.publication 1.164ms; driver.publication 1.087ms |
| 74b83bb6072e79280000000000000ecc | 52.297 | 4.851 | 0.009 | 0.000 | 1.355 | 0.910 | 2.872 | 0.033 | n/a | 2.693 | 39.532 | n/a | n/a | 0.041 | 6.215 | 0.119 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.271ms; driver.publication 1.066ms; driver.publication 0.478ms |
| 74b83bb6072e79280000000000001284 | 52.230 | 3.230 | 0.008 | 0.000 | 33.908 | 2.967 | 1.153 | 0.031 | n/a | 0.161 | 10.744 | n/a | n/a | 0.029 | 37.146 | 0.711 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.860ms; driver.publication 1.581ms; driver.publication 1.426ms; driver.publication 1.275ms; driver.publication 1.176ms |
| 74b83bb6072e79280000000000000644 | 52.187 | 5.121 | 0.008 | 0.000 | 1.292 | 12.097 | 0.918 | 5.227 | n/a | 0.219 | 27.275 | n/a | n/a | 0.031 | 6.421 | 0.123 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.661ms; driver.publication 1.424ms; driver.publication 1.209ms |
| 74b83bb6072e792800000000000012bf | 51.903 | 2.986 | 0.004 | 0.000 | 1.322 | 1.835 | 0.864 | 0.010 | n/a | 0.041 | 44.819 | n/a | n/a | 0.021 | 4.312 | 0.083 | 0.021 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.188ms; driver.publication 1.046ms; driver.publication 1.004ms |
| 74b83bb6072e79280000000000000912 | 51.729 | 8.766 | 0.003 | 0.000 | 2.904 | 2.555 | 1.012 | 7.937 | n/a | 0.288 | 28.224 | n/a | n/a | 0.041 | 11.673 | 0.226 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.474ms |
| 74b83bb6072e7928000000000000069d | 51.191 | 3.106 | 0.007 | 0.000 | 0.356 | 4.111 | 0.907 | 0.023 | n/a | 3.347 | 39.298 | n/a | n/a | 0.035 | 3.469 | 0.068 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.406ms; driver.publication 3.025ms; driver.publication 1.212ms; driver.publication 1.164ms; driver.expected-state.bind-receipt 1.082ms |

## P2 / L16 / commit (1709 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.223 | 0.719 | 0.000 | 1.567 | 3.503 | 0.006 | 0.000 | 0.711 | 0.649 | 1.068 | 0.028 | n/a | 0.200 | 5.969 | n/a | n/a | 0.031 | 4.407 | 0.338 | 0.031 |
| p99 | 63.495 | 3.041 | 2.605 | 5.717 | 10.659 | 0.670 | 0.000 | 22.706 | 10.958 | 8.971 | 2.122 | n/a | 3.545 | 33.560 | n/a | n/a | 0.078 | 27.037 | 0.715 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000152b | 134.161 | 6.367 | 0.008 | 3.898 | 0.824 | 28.913 | 4.585 | 5.201 | n/a | 1.200 | 83.134 | n/a | n/a | 0.030 | 11.097 | 0.083 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 15.784ms; driver.expected-state.bind-receipt 1.755ms; driver.publication 1.315ms; driver.publication 1.248ms; driver.expected-state.bind-receipt 1.248ms |
| 74b83bb6072e79280000000000001568 | 125.864 | 12.965 | 0.013 | 0.000 | 0.877 | 2.499 | 26.388 | 0.170 | n/a | 1.044 | 81.855 | n/a | n/a | 0.052 | 13.855 | 0.110 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000152d | 117.498 | 4.119 | 0.008 | 0.000 | 65.337 | 1.531 | 0.660 | 6.354 | n/a | 0.091 | 39.360 | n/a | n/a | 0.038 | 69.464 | 0.591 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 15.784ms; driver.expected-state.bind-receipt 1.755ms; driver.publication 1.315ms; driver.publication 1.248ms; driver.expected-state.bind-receipt 1.248ms |
| 74b83bb6072e79280000000000001534 | 93.032 | 3.575 | 0.004 | 0.000 | 65.310 | 7.284 | 0.956 | 0.028 | n/a | 1.005 | 14.843 | n/a | n/a | 0.026 | 68.890 | 0.740 | 0.026 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.755ms; driver.publication 1.315ms; driver.publication 1.248ms; driver.publication 1.230ms; driver.publication 1.194ms |
| 74b83bb6072e792800000000000014e6 | 92.828 | 3.456 | 0.004 | 0.000 | 78.033 | 0.538 | 0.900 | 0.030 | n/a | 0.380 | 9.460 | n/a | n/a | 0.027 | 81.493 | 0.878 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 2.389ms; driver.publication 1.768ms; driver.publication 1.188ms; driver.publication 1.154ms; driver.expected-state.bind-receipt 1.103ms |
| 74b83bb6072e79280000000000001569 | 87.760 | 3.077 | 0.007 | 0.000 | 74.182 | 0.622 | 4.443 | 0.024 | n/a | 0.283 | 5.093 | n/a | n/a | 0.030 | 77.266 | 0.880 | 0.030 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.636ms; driver.publication 1.412ms |
| 74b83bb6072e79280000000000001567 | 83.039 | 5.175 | 0.318 | 0.000 | 0.083 | 2.190 | 2.387 | 0.038 | n/a | 0.498 | 72.298 | n/a | n/a | 0.052 | 5.575 | 0.067 | 0.052 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000001535 | 82.047 | 2.949 | 0.004 | 0.000 | 50.917 | 4.751 | 0.773 | 0.030 | n/a | 0.208 | 22.373 | n/a | n/a | 0.041 | 53.870 | 0.657 | 0.041 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.755ms; driver.publication 1.315ms; driver.publication 1.248ms; driver.publication 1.194ms; driver.expected-state.bind-receipt 1.182ms |
| 74b83bb6072e792800000000000015e4 | 81.606 | 9.040 | 0.009 | 0.000 | 0.703 | 9.940 | 29.704 | 0.034 | n/a | 3.183 | 28.954 | n/a | n/a | 0.039 | 9.751 | 0.119 | 0.039 | gw-w/thread-44/commit.prepare-and-validate | driver.publication 1.257ms |
| 74b83bb6072e79280000000000001b93 | 81.564 | 14.072 | 0.014 | 0.000 | 0.349 | 18.717 | 28.827 | 0.090 | n/a | 0.329 | 19.119 | n/a | n/a | 0.047 | 14.436 | 0.177 | 0.047 | gw-w/thread-44/commit.prepare-and-validate | driver.publication 5.205ms; driver.publication 1.977ms; driver.publication 1.314ms; driver.publication 1.216ms |
| 74b83bb6072e792800000000000014e4 | 81.333 | 13.735 | 0.009 | 3.947 | 0.587 | 10.780 | 4.447 | 0.124 | n/a | 2.136 | 45.541 | n/a | n/a | 0.027 | 18.278 | 0.225 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.389ms; driver.publication 1.188ms; driver.publication 1.154ms; driver.expected-state.bind-receipt 1.103ms; driver.publication 1.069ms |
| 74b83bb6072e7928000000000000152a | 73.191 | 18.740 | 0.008 | 0.000 | 0.615 | 1.259 | 1.441 | 0.041 | n/a | 0.174 | 50.854 | n/a | n/a | 0.060 | 19.363 | 0.265 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.248ms; driver.publication 1.109ms |
| 74b83bb6072e792800000000000019b3 | 70.456 | 3.255 | 0.006 | 0.000 | 37.997 | 17.613 | 0.923 | 0.030 | n/a | 0.609 | 9.989 | n/a | n/a | 0.033 | 41.258 | 0.586 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 8.073ms |
| 74b83bb6072e792800000000000019b1 | 67.326 | 12.856 | 0.010 | 0.000 | 0.125 | 45.472 | 0.865 | 0.032 | n/a | 0.146 | 7.780 | n/a | n/a | 0.041 | 12.990 | 0.193 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |
| 74b83bb6072e7928000000000000152f | 66.771 | 7.524 | 0.005 | 0.000 | 1.009 | 0.672 | 8.480 | 0.549 | n/a | 0.278 | 48.218 | n/a | n/a | 0.037 | 8.538 | 0.128 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 15.784ms; driver.publication 1.194ms; driver.publication 1.150ms; driver.expected-state.bind-receipt 0.772ms |
| 74b83bb6072e7928000000000000152c | 66.009 | 3.007 | 0.002 | 0.000 | 0.551 | 10.005 | 1.230 | 0.050 | n/a | 0.189 | 50.931 | n/a | n/a | 0.042 | 3.561 | 0.054 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 15.784ms; driver.expected-state.bind-receipt 1.248ms; driver.publication 1.150ms; driver.publication 1.109ms |
| 74b83bb6072e792800000000000015e6 | 63.849 | 4.093 | 0.008 | 0.000 | 52.618 | 0.713 | 0.817 | 0.026 | n/a | 0.080 | 5.463 | n/a | n/a | 0.033 | 56.718 | 0.888 | 0.033 | node-14/thread-0/driver.queue.subject | driver.publication 1.417ms; driver.publication 1.257ms; driver.expected-state.bind-receipt 1.241ms; driver.publication 1.053ms |
| 74b83bb6072e792800000000000015e2 | 63.495 | 2.829 | 2.406 | 0.000 | 0.047 | 1.022 | 34.995 | 0.067 | n/a | 0.215 | 21.893 | n/a | n/a | 0.022 | 5.282 | 0.083 | 0.022 | gw-w/thread-67/gateway.request-parse | driver.publication 1.257ms; driver.publication 1.072ms |
| 74b83bb6072e79280000000000001537 | 63.127 | 3.838 | 0.006 | 0.000 | 7.276 | 1.384 | 0.430 | 5.110 | n/a | 0.042 | 45.016 | n/a | n/a | 0.026 | 11.120 | 0.176 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.755ms; driver.publication 1.315ms; driver.publication 1.248ms; driver.publication 1.194ms; driver.expected-state.bind-receipt 1.182ms |
| 74b83bb6072e7928000000000000153c | 62.585 | 9.840 | 0.010 | 0.000 | 30.585 | 0.679 | 1.742 | 0.042 | n/a | 4.117 | 15.534 | n/a | n/a | 0.035 | 40.435 | 0.646 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 1.673ms; driver.publication 1.230ms; driver.publication 1.179ms; driver.publication 1.119ms |

## P2 / L16 / commit / 5-10 facts (1019 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.600 | 0.609 | 0.000 | 1.443 | 3.008 | 0.006 | 0.000 | 0.719 | 0.622 | 0.896 | 0.028 | n/a | 0.198 | 5.389 | n/a | n/a | 0.031 | 3.846 | 0.329 | 0.031 |
| p99 | 63.849 | 2.160 | 1.585 | 4.739 | 8.937 | 0.268 | 0.000 | 28.936 | 11.247 | 4.848 | 2.273 | n/a | 2.693 | 30.281 | n/a | n/a | 0.078 | 34.220 | 0.721 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000152b | 134.161 | 6.367 | 0.008 | 3.898 | 0.824 | 28.913 | 4.585 | 5.201 | n/a | 1.200 | 83.134 | n/a | n/a | 0.030 | 11.097 | 0.083 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 15.784ms; driver.expected-state.bind-receipt 1.755ms; driver.publication 1.315ms; driver.publication 1.248ms; driver.expected-state.bind-receipt 1.248ms |
| 74b83bb6072e79280000000000001534 | 93.032 | 3.575 | 0.004 | 0.000 | 65.310 | 7.284 | 0.956 | 0.028 | n/a | 1.005 | 14.843 | n/a | n/a | 0.026 | 68.890 | 0.740 | 0.026 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.755ms; driver.publication 1.315ms; driver.publication 1.248ms; driver.publication 1.230ms; driver.publication 1.194ms |
| 74b83bb6072e792800000000000014e6 | 92.828 | 3.456 | 0.004 | 0.000 | 78.033 | 0.538 | 0.900 | 0.030 | n/a | 0.380 | 9.460 | n/a | n/a | 0.027 | 81.493 | 0.878 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 2.389ms; driver.publication 1.768ms; driver.publication 1.188ms; driver.publication 1.154ms; driver.expected-state.bind-receipt 1.103ms |
| 74b83bb6072e79280000000000001569 | 87.760 | 3.077 | 0.007 | 0.000 | 74.182 | 0.622 | 4.443 | 0.024 | n/a | 0.283 | 5.093 | n/a | n/a | 0.030 | 77.266 | 0.880 | 0.030 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.636ms; driver.publication 1.412ms |
| 74b83bb6072e79280000000000001535 | 82.047 | 2.949 | 0.004 | 0.000 | 50.917 | 4.751 | 0.773 | 0.030 | n/a | 0.208 | 22.373 | n/a | n/a | 0.041 | 53.870 | 0.657 | 0.041 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.755ms; driver.publication 1.315ms; driver.publication 1.248ms; driver.publication 1.194ms; driver.expected-state.bind-receipt 1.182ms |
| 74b83bb6072e792800000000000014e4 | 81.333 | 13.735 | 0.009 | 3.947 | 0.587 | 10.780 | 4.447 | 0.124 | n/a | 2.136 | 45.541 | n/a | n/a | 0.027 | 18.278 | 0.225 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.389ms; driver.publication 1.188ms; driver.publication 1.154ms; driver.expected-state.bind-receipt 1.103ms; driver.publication 1.069ms |
| 74b83bb6072e7928000000000000152a | 73.191 | 18.740 | 0.008 | 0.000 | 0.615 | 1.259 | 1.441 | 0.041 | n/a | 0.174 | 50.854 | n/a | n/a | 0.060 | 19.363 | 0.265 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.248ms; driver.publication 1.109ms |
| 74b83bb6072e792800000000000019b3 | 70.456 | 3.255 | 0.006 | 0.000 | 37.997 | 17.613 | 0.923 | 0.030 | n/a | 0.609 | 9.989 | n/a | n/a | 0.033 | 41.258 | 0.586 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 8.073ms |
| 74b83bb6072e792800000000000019b1 | 67.326 | 12.856 | 0.010 | 0.000 | 0.125 | 45.472 | 0.865 | 0.032 | n/a | 0.146 | 7.780 | n/a | n/a | 0.041 | 12.990 | 0.193 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |
| 74b83bb6072e7928000000000000152c | 66.009 | 3.007 | 0.002 | 0.000 | 0.551 | 10.005 | 1.230 | 0.050 | n/a | 0.189 | 50.931 | n/a | n/a | 0.042 | 3.561 | 0.054 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 15.784ms; driver.expected-state.bind-receipt 1.248ms; driver.publication 1.150ms; driver.publication 1.109ms |
| 74b83bb6072e792800000000000015e6 | 63.849 | 4.093 | 0.008 | 0.000 | 52.618 | 0.713 | 0.817 | 0.026 | n/a | 0.080 | 5.463 | n/a | n/a | 0.033 | 56.718 | 0.888 | 0.033 | node-14/thread-0/driver.queue.subject | driver.publication 1.417ms; driver.publication 1.257ms; driver.expected-state.bind-receipt 1.241ms; driver.publication 1.053ms |
| 74b83bb6072e7928000000000000153d | 62.150 | 5.008 | 0.005 | 0.000 | 35.197 | 3.438 | 1.383 | 1.217 | n/a | 0.672 | 15.185 | n/a | n/a | 0.045 | 40.209 | 0.647 | 0.045 | node-14/thread-0/driver.queue.subject | driver.publication 1.673ms; driver.expected-state.bind-receipt 1.594ms; driver.publication 1.401ms; driver.publication 1.230ms; driver.publication 1.179ms |
| 74b83bb6072e792800000000000019b4 | 62.099 | 6.467 | 0.594 | 0.000 | 28.936 | 12.484 | 0.617 | 0.243 | n/a | 0.063 | 12.680 | n/a | n/a | 0.014 | 35.997 | 0.580 | 0.014 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 8.073ms; driver.publication 1.036ms |
| 74b83bb6072e7928000000000000156a | 61.719 | 2.507 | 0.004 | 0.000 | 54.063 | 0.466 | 0.997 | 0.030 | n/a | 0.138 | 3.490 | n/a | n/a | 0.024 | 56.573 | 0.917 | 0.024 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.636ms; driver.publication 1.412ms |
| 74b83bb6072e79280000000000001549 | 58.728 | 3.792 | 0.004 | 0.000 | 30.434 | 0.628 | 0.760 | 0.027 | n/a | 1.860 | 21.171 | n/a | n/a | 0.052 | 34.230 | 0.583 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 1.075ms; driver.publication 1.027ms |
| 74b83bb6072e79280000000000001533 | 53.018 | 6.300 | 0.104 | 0.000 | 3.442 | 10.958 | 0.736 | 5.599 | n/a | 0.926 | 24.924 | n/a | n/a | 0.029 | 9.847 | 0.186 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.755ms; driver.publication 1.248ms; driver.publication 1.194ms; driver.expected-state.bind-receipt 1.182ms; driver.publication 1.150ms |
| 74b83bb6072e792800000000000019b5 | 52.967 | 6.397 | 1.040 | 0.000 | 18.618 | 16.062 | 0.510 | 0.018 | n/a | 0.228 | 10.084 | n/a | n/a | 0.011 | 26.054 | 0.492 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 8.073ms; driver.publication 1.036ms |
| 74b83bb6072e792800000000000020da | 46.531 | 4.193 | 0.006 | 0.000 | 0.928 | 0.751 | 1.588 | 0.054 | n/a | 0.240 | 38.717 | n/a | n/a | 0.053 | 5.127 | 0.110 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000018ca | 45.233 | 4.016 | 0.008 | 0.000 | 8.263 | 1.088 | 1.252 | 0.051 | n/a | 0.201 | 30.281 | n/a | n/a | 0.073 | 12.287 | 0.272 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.052ms |
| 74b83bb6072e792800000000000019b6 | 43.842 | 9.801 | 1.197 | 0.000 | 4.872 | 14.591 | 0.378 | 2.525 | n/a | 0.040 | 10.420 | n/a | n/a | 0.017 | 15.870 | 0.362 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 8.073ms; driver.publication 1.036ms |

## P2 / L64 / commit (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.526 | 0.439 | 0.000 | 1.232 | 3.650 | 0.010 | 0.000 | 0.095 | 0.832 | 1.643 | 0.034 | n/a | 0.190 | 7.875 | n/a | n/a | 0.043 | 4.329 | 0.242 | 0.043 |
| p99 | 85.064 | 4.449 | 0.017 | 5.803 | 11.553 | 1.958 | 0.000 | 1.184 | 3.494 | 58.641 | 0.128 | n/a | 2.916 | 32.617 | n/a | n/a | 0.100 | 12.615 | 0.567 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002148 | 85.064 | 3.644 | 1.958 | 0.000 | 0.082 | 1.220 | 58.641 | 0.073 | n/a | 0.234 | 19.174 | n/a | n/a | 0.037 | 5.685 | 0.067 | 0.037 | gw-w/thread-69/gateway.admitted-work | driver.publication 2.231ms |
| 74b83bb6072e79280000000000002137 | 39.666 | 3.466 | 0.006 | 0.000 | 0.962 | 0.704 | 1.534 | 0.072 | n/a | 0.257 | 32.617 | n/a | n/a | 0.046 | 4.435 | 0.112 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002164 | 34.278 | 5.298 | 0.374 | 0.000 | 0.090 | 2.585 | 10.660 | 0.128 | n/a | 0.293 | 14.785 | n/a | n/a | 0.066 | 5.761 | 0.168 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000020fb | 33.221 | 4.441 | 0.009 | 0.000 | 0.496 | 0.595 | 0.940 | 0.028 | n/a | 2.916 | 23.747 | n/a | n/a | 0.049 | 4.947 | 0.149 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000020f4 | 30.256 | 5.199 | 0.241 | 0.000 | 0.055 | 3.494 | 11.993 | 0.038 | n/a | 1.834 | 7.347 | n/a | n/a | 0.054 | 5.495 | 0.182 | 0.054 | gw-w/thread-49/gateway.admitted-work | none observed |
| 74b83bb6072e792800000000000021a4 | 30.087 | 4.616 | 0.272 | 0.000 | 0.039 | 1.699 | 6.447 | 0.039 | n/a | 0.155 | 16.787 | n/a | n/a | 0.032 | 4.927 | 0.164 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000214e | 27.570 | 3.313 | 0.241 | 0.000 | 0.050 | 1.090 | 7.022 | 0.033 | n/a | 0.141 | 15.641 | n/a | n/a | 0.037 | 3.605 | 0.131 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002150 | 27.534 | 3.748 | 0.431 | 0.000 | 0.076 | 1.166 | 4.660 | 0.029 | n/a | 0.102 | 17.264 | n/a | n/a | 0.059 | 4.255 | 0.155 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000217a | 26.789 | 3.420 | 0.200 | 0.000 | 0.044 | 1.081 | 5.219 | 0.028 | n/a | 0.132 | 16.621 | n/a | n/a | 0.044 | 3.665 | 0.137 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000217e | 25.839 | 4.094 | 0.255 | 0.000 | 0.053 | 1.330 | 6.277 | 0.031 | n/a | 0.288 | 13.480 | n/a | n/a | 0.030 | 4.402 | 0.170 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000020ed | 25.698 | 4.694 | 0.250 | 0.000 | 0.049 | 1.834 | 9.002 | 0.075 | n/a | 0.308 | 9.443 | n/a | n/a | 0.043 | 4.992 | 0.194 | 0.043 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000210f | 25.344 | 4.175 | 0.265 | 0.000 | 0.031 | 0.979 | 8.214 | 0.041 | n/a | 0.450 | 11.141 | n/a | n/a | 0.047 | 4.471 | 0.176 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.103ms |
| 74b83bb6072e79280000000000002169 | 25.233 | 3.627 | 0.328 | 0.000 | 0.014 | 1.511 | 6.236 | 0.031 | n/a | 0.149 | 13.311 | n/a | n/a | 0.026 | 3.969 | 0.157 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.086ms |
| 74b83bb6072e79280000000000002104 | 24.439 | 4.112 | 0.197 | 0.000 | 0.039 | 1.364 | 11.817 | 0.041 | n/a | 0.366 | 6.472 | n/a | n/a | 0.031 | 4.348 | 0.178 | 0.031 | gw-w/thread-69/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002114 | 24.240 | 3.842 | 0.301 | 0.000 | 0.047 | 1.516 | 7.013 | 0.045 | n/a | 0.510 | 10.923 | n/a | n/a | 0.044 | 4.190 | 0.173 | 0.044 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002190 | 24.181 | 3.292 | 0.208 | 0.000 | 0.044 | 1.487 | 6.137 | 0.049 | n/a | 0.215 | 12.719 | n/a | n/a | 0.031 | 3.544 | 0.147 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002156 | 23.934 | 3.849 | 0.300 | 0.000 | 0.088 | 0.901 | 7.542 | 0.033 | n/a | 0.106 | 11.053 | n/a | n/a | 0.062 | 4.237 | 0.177 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002149 | 23.872 | 4.136 | 0.008 | 0.000 | 0.318 | 0.338 | 0.521 | 0.015 | n/a | 0.045 | 18.457 | n/a | n/a | 0.034 | 4.462 | 0.187 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002144 | 23.864 | 4.121 | 0.243 | 0.000 | 0.087 | 1.189 | 5.779 | 0.053 | n/a | 0.531 | 11.807 | n/a | n/a | 0.054 | 4.450 | 0.186 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002128 | 23.225 | 3.650 | 0.279 | 0.000 | 0.095 | 1.222 | 9.330 | 0.049 | n/a | 0.176 | 8.362 | n/a | n/a | 0.061 | 4.024 | 0.173 | 0.061 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (34 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.838 | 0.711 | 0.000 | 1.611 | 3.556 | 0.006 | 0.000 | 0.572 | 0.584 | 0.971 | 0.031 | n/a | 0.156 | 6.107 | n/a | n/a | 0.047 | 4.354 | 0.322 | 0.047 |
| p99 | 39.666 | 3.098 | 0.000 | 3.141 | 5.772 | 0.010 | 0.000 | 1.184 | 0.947 | 11.855 | 0.072 | n/a | 2.916 | 32.617 | n/a | n/a | 0.100 | 6.965 | 0.478 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002137 | 39.666 | 3.466 | 0.006 | 0.000 | 0.962 | 0.704 | 1.534 | 0.072 | n/a | 0.257 | 32.617 | n/a | n/a | 0.046 | 4.435 | 0.112 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000020fb | 33.221 | 4.441 | 0.009 | 0.000 | 0.496 | 0.595 | 0.940 | 0.028 | n/a | 2.916 | 23.747 | n/a | n/a | 0.049 | 4.947 | 0.149 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002149 | 23.872 | 4.136 | 0.008 | 0.000 | 0.318 | 0.338 | 0.521 | 0.015 | n/a | 0.045 | 18.457 | n/a | n/a | 0.034 | 4.462 | 0.187 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000020fd | 23.087 | 3.561 | 0.008 | 0.000 | 0.771 | 0.542 | 11.855 | 0.027 | n/a | 0.091 | 6.198 | n/a | n/a | 0.034 | 4.340 | 0.188 | 0.034 | gw-w/thread-42/commit.prepare-and-validate | none observed |
| 74b83bb6072e7928000000000000216e | 20.066 | 4.592 | 0.009 | 0.000 | 0.264 | 0.915 | 1.619 | 0.050 | n/a | 0.199 | 12.346 | n/a | n/a | 0.073 | 4.865 | 0.242 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000020f5 | 19.080 | 3.406 | 0.010 | 0.000 | 0.560 | 0.688 | 1.395 | 0.043 | n/a | 0.465 | 12.476 | n/a | n/a | 0.037 | 3.977 | 0.208 | 0.037 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002154 | 16.720 | 3.414 | 0.007 | 0.000 | 1.120 | 0.455 | 1.129 | 0.035 | n/a | 0.151 | 10.362 | n/a | n/a | 0.047 | 4.541 | 0.272 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002111 | 16.681 | 3.104 | 0.006 | 0.000 | 0.091 | 0.520 | 0.971 | 0.027 | n/a | 0.100 | 11.822 | n/a | n/a | 0.040 | 3.201 | 0.192 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021a6 | 15.986 | 4.435 | 0.006 | 0.000 | 0.146 | 0.521 | 0.860 | 0.028 | n/a | 0.117 | 9.822 | n/a | n/a | 0.050 | 4.588 | 0.287 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002178 | 15.355 | 5.772 | 0.009 | 0.000 | 1.184 | 0.947 | 0.911 | 0.025 | n/a | 0.128 | 6.306 | n/a | n/a | 0.073 | 6.965 | 0.454 | 0.073 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000214b | 14.303 | 4.012 | 0.008 | 0.000 | 0.368 | 0.658 | 1.310 | 0.050 | n/a | 0.217 | 7.633 | n/a | n/a | 0.047 | 4.388 | 0.307 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000219f | 14.158 | 4.307 | 0.010 | 0.000 | 0.721 | 0.654 | 1.392 | 0.050 | n/a | 0.183 | 6.778 | n/a | n/a | 0.063 | 5.039 | 0.356 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000217f | 14.009 | 5.312 | 0.009 | 0.000 | 0.844 | 0.769 | 0.864 | 0.026 | n/a | 0.111 | 6.026 | n/a | n/a | 0.048 | 6.165 | 0.440 | 0.048 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000212a | 13.736 | 3.081 | 0.007 | 0.000 | 0.477 | 0.677 | 1.422 | 0.055 | n/a | 0.233 | 7.729 | n/a | n/a | 0.054 | 3.565 | 0.260 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002160 | 13.512 | 3.432 | 0.006 | 0.000 | 0.847 | 0.613 | 1.809 | 0.048 | n/a | 0.195 | 6.507 | n/a | n/a | 0.054 | 4.286 | 0.317 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002199 | 12.882 | 2.957 | 0.004 | 0.000 | 0.376 | 0.800 | 2.967 | 0.046 | n/a | 0.644 | 5.057 | n/a | n/a | 0.032 | 3.337 | 0.259 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000216c | 12.872 | 3.593 | 0.006 | 0.000 | 0.975 | 0.564 | 1.321 | 0.047 | n/a | 0.206 | 6.104 | n/a | n/a | 0.057 | 4.574 | 0.355 | 0.057 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002196 | 12.838 | 3.813 | 0.006 | 0.000 | 0.230 | 0.513 | 0.855 | 0.053 | n/a | 0.123 | 7.169 | n/a | n/a | 0.076 | 4.049 | 0.315 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002115 | 12.427 | 3.753 | 0.009 | 0.000 | 0.572 | 0.628 | 1.377 | 0.045 | n/a | 0.210 | 5.791 | n/a | n/a | 0.041 | 4.333 | 0.349 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000219b | 12.329 | 3.556 | 0.006 | 0.000 | 0.970 | 0.537 | 0.875 | 0.031 | n/a | 0.105 | 6.218 | n/a | n/a | 0.032 | 4.532 | 0.368 | 0.032 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.605 | 0.414 | 0.000 | 1.277 | 3.901 | 0.013 | 0.000 | 0.196 | 0.886 | 1.825 | 0.031 | n/a | 0.182 | 8.108 | n/a | n/a | 0.047 | 4.473 | 0.260 | 0.047 |
| p99 | 82.009 | 3.365 | 0.006 | 19.179 | 20.549 | 1.990 | 0.000 | 1.317 | 10.354 | 27.852 | 0.939 | n/a | 2.791 | 59.149 | n/a | n/a | 0.091 | 21.503 | 0.567 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000021d3 | 82.009 | 20.549 | 0.006 | 0.000 | 0.948 | 0.526 | 0.783 | 0.027 | n/a | 0.129 | 59.006 | n/a | n/a | 0.037 | 21.503 | 0.262 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021c2 | 70.369 | 4.242 | 0.008 | 0.000 | 0.636 | 0.576 | 5.568 | 0.032 | n/a | 0.104 | 59.149 | n/a | n/a | 0.055 | 4.886 | 0.069 | 0.055 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000223f | 47.094 | 3.473 | 0.192 | 0.000 | 0.048 | 1.420 | 5.205 | 0.029 | n/a | 0.332 | 36.357 | n/a | n/a | 0.039 | 3.713 | 0.079 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021be | 42.922 | 4.311 | 0.283 | 0.000 | 0.080 | 2.120 | 10.835 | 0.052 | n/a | 0.116 | 25.055 | n/a | n/a | 0.070 | 4.674 | 0.109 | 0.070 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021e0 | 40.948 | 3.046 | 0.270 | 0.000 | 0.037 | 1.189 | 27.852 | 0.030 | n/a | 0.147 | 8.343 | n/a | n/a | 0.035 | 3.352 | 0.082 | 0.035 | gw-w/thread-69/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002259 | 39.998 | 4.614 | 0.323 | 0.000 | 0.082 | 1.527 | 25.877 | 0.033 | n/a | 0.130 | 7.332 | n/a | n/a | 0.080 | 5.019 | 0.125 | 0.080 | gw-w/thread-67/gateway.admitted-work | none observed |
| 74b83bb6072e792800000000000021c4 | 34.325 | 3.374 | 0.262 | 0.000 | 0.078 | 1.216 | 18.960 | 0.039 | n/a | 0.125 | 10.210 | n/a | n/a | 0.061 | 3.714 | 0.108 | 0.061 | gw-w/thread-42/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000223d | 33.104 | 3.133 | 0.229 | 0.000 | 0.106 | 0.886 | 1.599 | 0.036 | n/a | 0.381 | 26.683 | n/a | n/a | 0.052 | 3.468 | 0.105 | 0.052 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021b2 | 30.837 | 4.412 | 0.272 | 0.000 | 0.041 | 1.996 | 11.549 | 0.060 | n/a | 0.770 | 11.687 | n/a | n/a | 0.050 | 4.725 | 0.153 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002265 | 30.745 | 4.779 | 0.362 | 0.000 | 0.120 | 1.505 | 7.084 | 0.065 | n/a | 0.716 | 16.052 | n/a | n/a | 0.063 | 5.260 | 0.171 | 0.063 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021ba | 28.948 | 5.751 | 0.010 | 0.000 | 0.374 | 3.293 | 1.485 | 0.043 | n/a | 0.639 | 17.315 | n/a | n/a | 0.040 | 6.134 | 0.212 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021d8 | 27.863 | 2.997 | 0.191 | 0.000 | 0.042 | 1.220 | 5.152 | 0.076 | n/a | 2.791 | 15.351 | n/a | n/a | 0.042 | 3.230 | 0.116 | 0.042 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002255 | 27.656 | 3.103 | 0.283 | 0.000 | 0.049 | 0.950 | 3.071 | 0.027 | n/a | 0.114 | 20.014 | n/a | n/a | 0.044 | 3.435 | 0.124 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021e6 | 27.047 | 4.673 | 0.004 | 0.000 | 0.357 | 10.354 | 9.776 | 0.062 | n/a | 0.131 | 1.645 | n/a | n/a | 0.045 | 5.034 | 0.186 | 0.045 | node-14/thread-0/socket.wait-first-byte | none observed |
| 74b83bb6072e7928000000000000220b | 26.490 | 4.269 | 0.209 | 0.000 | 0.043 | 1.365 | 5.910 | 0.034 | n/a | 0.156 | 14.463 | n/a | n/a | 0.040 | 4.521 | 0.171 | 0.040 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021f3 | 25.035 | 4.637 | 0.217 | 0.000 | 0.035 | 1.789 | 7.654 | 0.039 | n/a | 0.153 | 10.460 | n/a | n/a | 0.051 | 4.889 | 0.195 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021bd | 24.455 | 5.743 | 0.009 | 0.000 | 0.960 | 1.783 | 11.918 | 0.067 | n/a | 0.213 | 3.686 | n/a | n/a | 0.077 | 6.711 | 0.274 | 0.077 | gw-w/thread-42/gateway.route | none observed |
| 74b83bb6072e79280000000000002253 | 23.893 | 4.238 | 0.270 | 0.000 | 0.049 | 1.350 | 5.792 | 0.030 | n/a | 0.118 | 11.986 | n/a | n/a | 0.061 | 4.557 | 0.191 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002229 | 23.601 | 5.365 | 0.292 | 0.000 | 0.063 | 1.976 | 5.498 | 0.038 | n/a | 0.406 | 9.915 | n/a | n/a | 0.049 | 5.720 | 0.242 | 0.049 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021e2 | 23.599 | 6.984 | 0.589 | 0.000 | 0.040 | 2.212 | 3.647 | 0.051 | n/a | 0.180 | 9.831 | n/a | n/a | 0.066 | 7.613 | 0.323 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.882 | 0.713 | 0.000 | 1.670 | 3.864 | 0.006 | 0.000 | 0.720 | 0.551 | 0.920 | 0.029 | n/a | 0.177 | 5.583 | n/a | n/a | 0.049 | 4.474 | 0.338 | 0.049 |
| p99 | 82.009 | 3.261 | 0.006 | 19.179 | 20.549 | 0.091 | 0.000 | 1.317 | 10.354 | 11.918 | 0.939 | n/a | 0.490 | 59.006 | n/a | n/a | 0.079 | 21.503 | 0.494 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000021d3 | 82.009 | 20.549 | 0.006 | 0.000 | 0.948 | 0.526 | 0.783 | 0.027 | n/a | 0.129 | 59.006 | n/a | n/a | 0.037 | 21.503 | 0.262 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021e6 | 27.047 | 4.673 | 0.004 | 0.000 | 0.357 | 10.354 | 9.776 | 0.062 | n/a | 0.131 | 1.645 | n/a | n/a | 0.045 | 5.034 | 0.186 | 0.045 | node-14/thread-0/socket.wait-first-byte | none observed |
| 74b83bb6072e792800000000000021bd | 24.455 | 5.743 | 0.009 | 0.000 | 0.960 | 1.783 | 11.918 | 0.067 | n/a | 0.213 | 3.686 | n/a | n/a | 0.077 | 6.711 | 0.274 | 0.077 | gw-w/thread-42/gateway.route | none observed |
| 74b83bb6072e792800000000000021fc | 22.989 | 3.121 | 0.005 | 0.000 | 0.336 | 0.520 | 1.227 | 0.041 | n/a | 0.183 | 17.505 | n/a | n/a | 0.051 | 3.462 | 0.151 | 0.051 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000225a | 19.716 | 4.821 | 0.013 | 0.000 | 0.761 | 0.813 | 0.995 | 0.030 | n/a | 0.308 | 11.909 | n/a | n/a | 0.067 | 5.595 | 0.284 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021e3 | 19.500 | 5.624 | 0.010 | 0.000 | 1.004 | 0.631 | 0.974 | 0.026 | n/a | 0.106 | 11.069 | n/a | n/a | 0.056 | 6.638 | 0.340 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021c5 | 18.689 | 5.808 | 0.011 | 0.000 | 0.482 | 0.739 | 1.928 | 0.027 | n/a | 0.118 | 9.526 | n/a | n/a | 0.050 | 6.302 | 0.337 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021f7 | 16.170 | 3.486 | 0.006 | 0.000 | 0.886 | 0.666 | 1.358 | 0.042 | n/a | 0.490 | 9.197 | n/a | n/a | 0.038 | 4.379 | 0.271 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021d6 | 15.686 | 5.781 | 0.010 | 0.000 | 1.101 | 1.360 | 0.911 | 0.027 | n/a | 0.111 | 6.313 | n/a | n/a | 0.071 | 6.893 | 0.439 | 0.071 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002245 | 15.661 | 3.801 | 0.006 | 0.000 | 0.667 | 0.586 | 0.791 | 0.026 | n/a | 0.278 | 9.430 | n/a | n/a | 0.075 | 4.474 | 0.286 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021eb | 15.207 | 4.551 | 0.006 | 0.000 | 0.102 | 0.659 | 1.490 | 0.050 | n/a | 0.221 | 8.088 | n/a | n/a | 0.042 | 4.659 | 0.306 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021da | 15.080 | 5.372 | 0.009 | 0.000 | 0.164 | 0.737 | 0.854 | 0.027 | n/a | 0.125 | 7.741 | n/a | n/a | 0.051 | 5.544 | 0.368 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002251 | 14.491 | 4.165 | 0.005 | 0.000 | 0.405 | 0.695 | 0.864 | 0.026 | n/a | 0.124 | 8.162 | n/a | n/a | 0.045 | 4.575 | 0.316 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021ce | 14.379 | 3.536 | 0.006 | 0.000 | 1.024 | 0.620 | 1.519 | 0.052 | n/a | 0.255 | 7.334 | n/a | n/a | 0.033 | 4.567 | 0.318 | 0.033 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002239 | 14.112 | 3.864 | 0.091 | 0.000 | 0.404 | 0.580 | 0.738 | 0.939 | n/a | 0.024 | 7.456 | n/a | n/a | 0.016 | 4.358 | 0.309 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.220ms |
| 74b83bb6072e792800000000000021b0 | 14.034 | 3.888 | 0.009 | 0.000 | 0.948 | 0.826 | 3.974 | 0.032 | n/a | 0.115 | 4.202 | n/a | n/a | 0.040 | 4.845 | 0.345 | 0.040 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000021f4 | 12.980 | 4.756 | 0.011 | 0.000 | 0.958 | 0.751 | 0.983 | 0.034 | n/a | 0.141 | 5.266 | n/a | n/a | 0.079 | 5.725 | 0.441 | 0.079 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000222d | 12.882 | 2.799 | 0.006 | 0.000 | 0.478 | 0.465 | 1.310 | 0.052 | n/a | 0.182 | 7.555 | n/a | n/a | 0.036 | 3.282 | 0.255 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002233 | 12.389 | 3.475 | 0.005 | 0.000 | 0.160 | 0.421 | 0.693 | 0.027 | n/a | 0.118 | 7.448 | n/a | n/a | 0.042 | 3.641 | 0.294 | 0.042 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000224e | 12.268 | 2.971 | 0.006 | 0.000 | 0.720 | 0.551 | 0.878 | 0.027 | n/a | 0.271 | 6.805 | n/a | n/a | 0.040 | 3.697 | 0.301 | 0.040 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.787 | 0.430 | 0.000 | 0.949 | 3.789 | 0.010 | 0.000 | 0.094 | 1.014 | 2.566 | 0.033 | n/a | 0.148 | 7.996 | n/a | n/a | 0.040 | 4.256 | 0.265 | 0.040 |
| p99 | 57.820 | 3.412 | 1.540 | 3.988 | 10.702 | 5.327 | 0.000 | 2.023 | 4.821 | 21.273 | 0.092 | n/a | 2.648 | 43.582 | n/a | n/a | 0.067 | 11.753 | 0.537 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002286 | 57.820 | 3.013 | 0.204 | 0.000 | 0.042 | 0.947 | 9.761 | 0.044 | n/a | 0.192 | 43.582 | n/a | n/a | 0.036 | 3.259 | 0.056 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022e3 | 52.404 | 3.646 | 1.109 | 0.000 | 0.052 | 1.196 | 3.369 | 0.028 | n/a | 0.097 | 42.869 | n/a | n/a | 0.038 | 4.807 | 0.092 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002274 | 46.094 | 3.809 | 0.268 | 0.000 | 0.044 | 1.537 | 21.273 | 0.035 | n/a | 0.125 | 18.970 | n/a | n/a | 0.031 | 4.122 | 0.089 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022cd | 43.182 | 5.325 | 0.004 | 0.000 | 0.984 | 0.462 | 1.826 | 0.029 | n/a | 0.121 | 34.401 | n/a | n/a | 0.030 | 6.313 | 0.146 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000228e | 41.647 | 5.727 | 5.327 | 0.000 | 0.068 | 1.237 | 11.240 | 0.061 | n/a | 0.227 | 17.735 | n/a | n/a | 0.026 | 11.122 | 0.267 | 0.026 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 1.100ms |
| 74b83bb6072e792800000000000022a3 | 29.257 | 5.222 | 0.317 | 0.000 | 0.059 | 1.863 | 11.906 | 0.074 | n/a | 0.599 | 9.174 | n/a | n/a | 0.042 | 5.598 | 0.191 | 0.042 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022a5 | 28.948 | 4.361 | 0.180 | 0.000 | 0.054 | 1.314 | 5.346 | 0.044 | n/a | 0.187 | 17.426 | n/a | n/a | 0.036 | 4.595 | 0.159 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002278 | 27.586 | 4.296 | 0.329 | 0.000 | 0.041 | 1.513 | 7.176 | 0.037 | n/a | 0.138 | 13.999 | n/a | n/a | 0.056 | 4.667 | 0.169 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022b3 | 27.226 | 4.469 | 0.257 | 0.000 | 0.061 | 1.781 | 8.808 | 0.051 | n/a | 0.221 | 11.546 | n/a | n/a | 0.034 | 4.786 | 0.176 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000226e | 26.961 | 3.614 | 0.225 | 0.000 | 0.032 | 1.715 | 10.818 | 0.055 | n/a | 0.148 | 10.317 | n/a | n/a | 0.037 | 3.871 | 0.144 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022b7 | 26.368 | 4.552 | 0.193 | 0.000 | 0.056 | 1.345 | 9.521 | 0.028 | n/a | 0.351 | 10.290 | n/a | n/a | 0.033 | 4.801 | 0.182 | 0.033 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002269 | 25.188 | 3.743 | 0.232 | 0.000 | 0.056 | 1.197 | 9.008 | 0.043 | n/a | 0.117 | 10.759 | n/a | n/a | 0.034 | 4.030 | 0.160 | 0.034 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022d3 | 25.028 | 10.702 | 0.010 | 0.000 | 1.040 | 2.451 | 2.316 | 0.051 | n/a | 0.152 | 8.237 | n/a | n/a | 0.067 | 11.753 | 0.470 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000228f | 24.782 | 3.983 | 0.006 | 0.000 | 0.216 | 4.821 | 1.526 | 0.038 | n/a | 0.123 | 14.019 | n/a | n/a | 0.050 | 4.206 | 0.170 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022a7 | 24.190 | 3.192 | 0.276 | 0.000 | 0.052 | 1.224 | 9.462 | 0.034 | n/a | 0.127 | 9.784 | n/a | n/a | 0.039 | 3.520 | 0.146 | 0.039 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002299 | 24.062 | 3.050 | 2.344 | 0.000 | 0.037 | 1.055 | 6.687 | 0.028 | n/a | 0.100 | 10.727 | n/a | n/a | 0.033 | 5.432 | 0.226 | 0.033 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002292 | 23.723 | 10.098 | 0.006 | 0.000 | 1.043 | 2.533 | 2.566 | 0.077 | n/a | 1.043 | 6.306 | n/a | n/a | 0.050 | 11.147 | 0.470 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022c3 | 23.722 | 4.410 | 0.216 | 0.000 | 0.061 | 1.538 | 5.716 | 0.040 | n/a | 0.127 | 11.574 | n/a | n/a | 0.040 | 4.687 | 0.198 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022c7 | 23.215 | 4.426 | 0.283 | 0.000 | 0.045 | 1.345 | 8.615 | 0.058 | n/a | 0.535 | 7.841 | n/a | n/a | 0.067 | 4.754 | 0.205 | 0.067 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002302 | 23.213 | 3.385 | 0.180 | 0.000 | 0.050 | 1.025 | 5.520 | 0.030 | n/a | 0.107 | 12.884 | n/a | n/a | 0.032 | 3.615 | 0.156 | 0.032 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (27 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.508 | 0.555 | 0.000 | 1.549 | 3.602 | 0.005 | 0.000 | 0.782 | 0.558 | 1.021 | 0.029 | n/a | 0.159 | 7.312 | n/a | n/a | 0.044 | 4.206 | 0.318 | 0.044 |
| p99 | 24.782 | 2.758 | 1.540 | 3.988 | 5.796 | 0.010 | 0.000 | 2.023 | 4.821 | 8.347 | 0.077 | n/a | 0.760 | 16.111 | n/a | n/a | 0.064 | 6.745 | 0.537 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000228f | 24.782 | 3.983 | 0.006 | 0.000 | 0.216 | 4.821 | 1.526 | 0.038 | n/a | 0.123 | 14.019 | n/a | n/a | 0.050 | 4.206 | 0.170 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022d8 | 22.899 | 4.220 | 0.008 | 0.000 | 0.868 | 0.710 | 0.739 | 0.025 | n/a | 0.159 | 16.111 | n/a | n/a | 0.058 | 5.097 | 0.223 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022e1 | 19.169 | 4.594 | 0.007 | 0.000 | 0.661 | 0.620 | 1.034 | 0.030 | n/a | 0.124 | 12.046 | n/a | n/a | 0.053 | 5.262 | 0.275 | 0.053 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000226f | 18.605 | 3.304 | 0.006 | 0.000 | 0.859 | 0.463 | 1.470 | 0.038 | n/a | 0.163 | 12.262 | n/a | n/a | 0.039 | 4.169 | 0.224 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022b4 | 18.022 | 5.796 | 0.005 | 0.000 | 0.911 | 0.658 | 1.131 | 0.031 | n/a | 0.130 | 9.322 | n/a | n/a | 0.037 | 6.712 | 0.372 | 0.037 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002289 | 17.988 | 4.668 | 0.010 | 0.000 | 1.042 | 0.823 | 1.372 | 0.038 | n/a | 0.149 | 9.841 | n/a | n/a | 0.044 | 5.721 | 0.318 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022ec | 17.924 | 4.308 | 0.005 | 0.000 | 0.299 | 2.249 | 8.347 | 0.066 | n/a | 0.600 | 2.005 | n/a | n/a | 0.045 | 4.612 | 0.257 | 0.045 | gw-w/thread-46/gateway.admitted-work | none observed |
| 74b83bb6072e792800000000000022fa | 17.787 | 3.636 | 0.006 | 0.000 | 0.527 | 0.525 | 0.836 | 0.026 | n/a | 0.272 | 11.921 | n/a | n/a | 0.037 | 4.170 | 0.234 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002298 | 17.568 | 5.752 | 0.005 | 0.000 | 0.829 | 1.848 | 6.846 | 0.058 | n/a | 0.198 | 1.970 | n/a | n/a | 0.061 | 6.587 | 0.375 | 0.061 | node-14/thread-0/driver.execute | none observed |
| 74b83bb6072e792800000000000022ac | 16.895 | 5.206 | 0.008 | 0.000 | 0.804 | 1.504 | 1.839 | 0.031 | n/a | 0.128 | 7.312 | n/a | n/a | 0.064 | 6.018 | 0.356 | 0.064 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000229a | 15.207 | 3.602 | 0.004 | 0.000 | 0.989 | 0.765 | 1.611 | 0.043 | n/a | 0.260 | 7.882 | n/a | n/a | 0.052 | 4.595 | 0.302 | 0.052 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002314 | 15.141 | 2.624 | 0.004 | 0.000 | 0.782 | 0.470 | 0.994 | 0.028 | n/a | 0.115 | 10.094 | n/a | n/a | 0.031 | 3.410 | 0.225 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022e4 | 14.654 | 3.596 | 0.004 | 0.000 | 0.213 | 1.029 | 2.134 | 0.077 | n/a | 0.760 | 6.788 | n/a | n/a | 0.052 | 3.813 | 0.260 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000231d | 14.508 | 3.919 | 0.004 | 0.000 | 0.985 | 0.542 | 0.830 | 0.025 | n/a | 0.114 | 8.040 | n/a | n/a | 0.050 | 4.908 | 0.338 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022f0 | 14.362 | 2.427 | 0.004 | 0.000 | 1.100 | 0.424 | 0.755 | 0.028 | n/a | 0.148 | 9.441 | n/a | n/a | 0.034 | 3.531 | 0.246 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022e7 | 13.686 | 3.510 | 0.005 | 0.000 | 0.741 | 0.455 | 0.751 | 0.027 | n/a | 0.163 | 7.978 | n/a | n/a | 0.055 | 4.256 | 0.311 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000230a | 12.902 | 3.437 | 0.007 | 0.000 | 1.026 | 0.558 | 1.051 | 0.027 | n/a | 0.111 | 6.637 | n/a | n/a | 0.048 | 4.470 | 0.346 | 0.048 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022c1 | 12.868 | 2.944 | 0.005 | 0.000 | 0.331 | 0.523 | 0.775 | 0.026 | n/a | 0.277 | 7.952 | n/a | n/a | 0.036 | 3.279 | 0.255 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000022fd | 12.556 | 4.718 | 0.005 | 0.000 | 2.023 | 0.679 | 1.021 | 0.036 | n/a | 0.274 | 3.764 | n/a | n/a | 0.037 | 6.745 | 0.537 | 0.037 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000227f | 12.530 | 3.558 | 0.006 | 0.000 | 0.514 | 0.552 | 2.713 | 0.040 | n/a | 0.226 | 4.866 | n/a | n/a | 0.054 | 4.079 | 0.326 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (141 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.627 | 0.546 | 0.000 | 1.357 | 3.970 | 0.008 | 0.000 | 0.168 | 0.867 | 1.856 | 0.033 | n/a | 0.182 | 7.544 | n/a | n/a | 0.046 | 4.468 | 0.288 | 0.046 |
| p99 | 97.548 | 2.586 | 0.012 | 5.378 | 10.424 | 2.548 | 0.000 | 1.177 | 4.749 | 29.589 | 2.077 | n/a | 1.442 | 82.587 | n/a | n/a | 0.093 | 12.282 | 0.544 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002366 | 98.649 | 12.209 | 0.355 | 0.000 | 0.071 | 1.378 | 1.577 | 0.028 | n/a | 0.363 | 82.587 | n/a | n/a | 0.081 | 12.635 | 0.128 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002408 | 97.548 | 4.630 | 0.336 | 0.000 | 0.059 | 1.438 | 7.807 | 0.029 | n/a | 0.137 | 83.068 | n/a | n/a | 0.045 | 5.025 | 0.052 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000237d | 52.279 | 3.951 | 0.357 | 0.000 | 0.083 | 1.209 | 29.589 | 0.059 | n/a | 0.268 | 16.713 | n/a | n/a | 0.050 | 4.391 | 0.084 | 0.050 | gw-w/thread-45/gateway.admitted-work | none observed |
| 74b83bb6072e792800000000000023d8 | 45.397 | 4.216 | 0.192 | 0.000 | 0.060 | 1.646 | 30.273 | 0.037 | n/a | 0.107 | 8.825 | n/a | n/a | 0.041 | 4.468 | 0.098 | 0.041 | gw-w/thread-70/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000236f | 39.562 | 9.591 | 2.548 | 0.000 | 0.143 | 1.240 | 3.037 | 0.080 | n/a | 1.442 | 21.387 | n/a | n/a | 0.093 | 12.282 | 0.310 | 0.093 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000241e | 39.470 | 4.889 | 0.316 | 0.000 | 0.078 | 5.162 | 14.156 | 0.029 | n/a | 0.109 | 14.677 | n/a | n/a | 0.052 | 5.283 | 0.134 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002426 | 36.833 | 3.522 | 0.250 | 0.000 | 0.053 | 1.055 | 22.544 | 0.029 | n/a | 0.352 | 8.988 | n/a | n/a | 0.040 | 3.825 | 0.104 | 0.040 | gw-w/thread-42/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002324 | 33.554 | 3.999 | 0.192 | 0.000 | 0.028 | 1.267 | 20.804 | 0.056 | n/a | 0.163 | 7.007 | n/a | n/a | 0.038 | 4.219 | 0.126 | 0.038 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 74b83bb6072e792800000000000023a1 | 32.912 | 3.438 | 0.215 | 0.000 | 0.052 | 4.749 | 6.467 | 0.056 | n/a | 3.652 | 14.230 | n/a | n/a | 0.052 | 3.705 | 0.113 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002436 | 30.954 | 3.282 | 0.269 | 0.000 | 0.064 | 1.890 | 8.308 | 0.037 | n/a | 0.415 | 16.625 | n/a | n/a | 0.063 | 3.616 | 0.117 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023e6 | 29.768 | 3.256 | 0.246 | 0.000 | 0.081 | 1.210 | 8.093 | 0.039 | n/a | 0.149 | 16.635 | n/a | n/a | 0.058 | 3.583 | 0.120 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023fa | 28.931 | 3.524 | 0.177 | 0.000 | 0.064 | 1.124 | 6.435 | 0.040 | n/a | 0.146 | 17.384 | n/a | n/a | 0.038 | 3.764 | 0.130 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023b5 | 28.027 | 3.743 | 0.345 | 0.000 | 0.058 | 1.379 | 6.133 | 0.048 | n/a | 0.211 | 16.056 | n/a | n/a | 0.054 | 4.146 | 0.148 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002377 | 27.402 | 3.836 | 0.238 | 0.000 | 0.050 | 1.350 | 7.954 | 0.035 | n/a | 0.128 | 13.774 | n/a | n/a | 0.038 | 4.123 | 0.150 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023b7 | 27.314 | 3.700 | 0.301 | 0.000 | 0.050 | 1.214 | 6.483 | 0.060 | n/a | 0.199 | 15.243 | n/a | n/a | 0.063 | 4.051 | 0.148 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023c2 | 27.238 | 4.242 | 0.390 | 0.000 | 0.069 | 1.313 | 9.102 | 0.044 | n/a | 0.160 | 11.869 | n/a | n/a | 0.049 | 4.700 | 0.173 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002410 | 25.843 | 4.915 | 0.412 | 0.000 | 0.075 | 1.765 | 6.257 | 0.052 | n/a | 0.254 | 12.048 | n/a | n/a | 0.066 | 5.401 | 0.209 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002434 | 25.778 | 3.236 | 0.245 | 0.000 | 0.067 | 1.004 | 9.453 | 0.035 | n/a | 0.378 | 11.327 | n/a | n/a | 0.034 | 3.549 | 0.138 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023a7 | 25.681 | 2.893 | 0.217 | 0.000 | 0.095 | 1.166 | 10.051 | 0.033 | n/a | 0.345 | 10.837 | n/a | n/a | 0.043 | 3.205 | 0.125 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000239d | 24.817 | 3.649 | 0.347 | 0.000 | 0.149 | 1.743 | 9.025 | 0.043 | n/a | 0.205 | 9.605 | n/a | n/a | 0.051 | 4.145 | 0.167 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.158 | 0.695 | 0.000 | 1.634 | 3.444 | 0.005 | 0.000 | 0.660 | 0.664 | 1.002 | 0.032 | n/a | 0.172 | 5.369 | n/a | n/a | 0.047 | 4.296 | 0.349 | 0.047 |
| p99 | 24.145 | 2.880 | 3.322 | 8.054 | 10.424 | 0.014 | 0.000 | 1.195 | 2.605 | 5.394 | 2.627 | n/a | 0.566 | 17.750 | n/a | n/a | 0.088 | 11.088 | 0.538 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000023b3 | 24.145 | 9.850 | 0.008 | 0.000 | 0.503 | 1.226 | 2.045 | 0.055 | n/a | 0.344 | 10.026 | n/a | n/a | 0.088 | 10.361 | 0.429 | 0.088 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023b8 | 23.875 | 3.864 | 0.008 | 0.000 | 0.104 | 0.555 | 1.365 | 0.041 | n/a | 0.156 | 17.750 | n/a | n/a | 0.033 | 3.975 | 0.166 | 0.033 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002413 | 21.156 | 5.086 | 0.008 | 0.000 | 0.105 | 0.682 | 0.840 | 0.031 | n/a | 0.198 | 14.120 | n/a | n/a | 0.087 | 5.199 | 0.246 | 0.087 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023c4 | 20.627 | 10.424 | 0.005 | 0.000 | 0.660 | 1.466 | 1.388 | 0.041 | n/a | 0.135 | 6.452 | n/a | n/a | 0.056 | 11.088 | 0.538 | 0.056 | node-14/thread-0/driver.publication | none observed |
| 74b83bb6072e792800000000000023c3 | 20.441 | 4.840 | 0.008 | 0.000 | 1.195 | 1.054 | 1.002 | 0.058 | n/a | 0.287 | 11.926 | n/a | n/a | 0.071 | 6.044 | 0.296 | 0.071 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023a8 | 18.607 | 2.577 | 0.004 | 0.000 | 1.054 | 0.354 | 0.738 | 2.627 | n/a | 0.566 | 10.657 | n/a | n/a | 0.030 | 3.635 | 0.195 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023df | 18.600 | 4.392 | 0.005 | 0.000 | 0.379 | 0.664 | 0.981 | 0.031 | n/a | 0.141 | 11.942 | n/a | n/a | 0.065 | 4.776 | 0.257 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000238c | 16.807 | 3.283 | 0.005 | 0.000 | 0.935 | 2.035 | 0.979 | 0.033 | n/a | 0.137 | 9.363 | n/a | n/a | 0.037 | 4.223 | 0.251 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000239a | 16.020 | 5.879 | 0.007 | 0.000 | 0.090 | 1.799 | 2.961 | 0.073 | n/a | 0.235 | 4.942 | n/a | n/a | 0.034 | 5.977 | 0.373 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023fc | 15.168 | 3.401 | 0.004 | 0.000 | 0.579 | 0.751 | 1.363 | 0.041 | n/a | 0.233 | 8.736 | n/a | n/a | 0.061 | 3.984 | 0.263 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002332 | 15.044 | 2.488 | 0.004 | 0.000 | 0.933 | 0.488 | 0.860 | 0.026 | n/a | 0.119 | 10.095 | n/a | n/a | 0.031 | 3.425 | 0.228 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002393 | 15.021 | 6.262 | 0.005 | 0.000 | 0.771 | 0.482 | 1.105 | 0.030 | n/a | 0.123 | 6.186 | n/a | n/a | 0.057 | 7.038 | 0.469 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023f1 | 14.458 | 6.234 | 0.014 | 0.000 | 0.790 | 0.958 | 1.071 | 0.034 | n/a | 0.343 | 4.948 | n/a | n/a | 0.067 | 7.038 | 0.487 | 0.067 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002421 | 14.091 | 3.198 | 0.005 | 0.000 | 1.094 | 0.471 | 1.047 | 0.025 | n/a | 0.370 | 7.830 | n/a | n/a | 0.052 | 4.296 | 0.305 | 0.052 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000023d2 | 13.823 | 3.408 | 0.004 | 0.000 | 0.279 | 0.688 | 0.791 | 0.026 | n/a | 0.287 | 8.289 | n/a | n/a | 0.052 | 3.691 | 0.267 | 0.052 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002365 | 13.628 | 6.083 | 0.009 | 0.000 | 1.109 | 2.605 | 1.381 | 0.037 | n/a | 0.116 | 2.234 | n/a | n/a | 0.054 | 7.200 | 0.528 | 0.054 | node-14/thread-0/driver.execute | none observed |
| 74b83bb6072e7928000000000000235d | 13.597 | 3.743 | 0.008 | 0.000 | 0.721 | 1.231 | 5.394 | 0.054 | n/a | 0.457 | 1.931 | n/a | n/a | 0.058 | 4.472 | 0.329 | 0.058 | gw-w/thread-44/gateway.admitted-work | none observed |
| 74b83bb6072e792800000000000023d9 | 13.488 | 3.568 | 0.004 | 0.000 | 1.071 | 1.659 | 1.358 | 0.067 | n/a | 0.169 | 5.539 | n/a | n/a | 0.052 | 4.643 | 0.344 | 0.052 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002352 | 13.462 | 4.287 | 0.008 | 0.000 | 0.995 | 0.781 | 0.905 | 0.032 | n/a | 0.134 | 6.236 | n/a | n/a | 0.086 | 5.290 | 0.393 | 0.086 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002428 | 13.260 | 3.236 | 0.003 | 0.000 | 0.126 | 0.372 | 0.740 | 0.024 | n/a | 0.329 | 8.375 | n/a | n/a | 0.055 | 3.365 | 0.254 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.454 | 0.429 | 0.000 | 1.349 | 3.929 | 0.008 | 0.000 | 0.216 | 0.833 | 1.432 | 0.029 | n/a | 0.135 | 7.196 | n/a | n/a | 0.046 | 4.524 | 0.303 | 0.046 |
| p99 | 32.606 | 2.526 | 0.000 | 3.739 | 7.469 | 1.092 | 0.000 | 1.064 | 1.784 | 9.573 | 0.093 | n/a | 0.603 | 19.028 | n/a | n/a | 0.147 | 7.938 | 0.524 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000249b | 37.287 | 3.497 | 0.300 | 0.000 | 0.070 | 1.204 | 24.899 | 0.027 | n/a | 0.118 | 7.123 | n/a | n/a | 0.050 | 3.867 | 0.104 | 0.050 | gw-w/thread-45/gateway.admitted-work | none observed |
| 74b83bb6072e792800000000000024a5 | 32.606 | 4.173 | 0.007 | 0.000 | 0.587 | 0.662 | 0.808 | 0.025 | n/a | 0.129 | 26.174 | n/a | n/a | 0.042 | 4.767 | 0.146 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002506 | 31.567 | 4.461 | 0.264 | 0.000 | 0.076 | 1.434 | 9.573 | 0.037 | n/a | 0.356 | 15.328 | n/a | n/a | 0.040 | 4.801 | 0.152 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024bb | 30.891 | 5.657 | 0.699 | 0.000 | 0.078 | 1.382 | 8.604 | 0.034 | n/a | 0.135 | 14.218 | n/a | n/a | 0.083 | 6.434 | 0.208 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000248c | 29.524 | 4.652 | 0.419 | 0.000 | 0.053 | 1.493 | 8.453 | 0.049 | n/a | 0.200 | 14.143 | n/a | n/a | 0.062 | 5.124 | 0.174 | 0.062 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024c0 | 27.413 | 5.326 | 0.005 | 0.000 | 1.005 | 0.512 | 1.318 | 0.044 | n/a | 0.129 | 19.028 | n/a | n/a | 0.046 | 6.336 | 0.231 | 0.046 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000246c | 26.290 | 3.575 | 0.316 | 0.000 | 0.089 | 1.700 | 5.197 | 0.051 | n/a | 0.603 | 14.713 | n/a | n/a | 0.045 | 3.981 | 0.151 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024f2 | 25.635 | 4.846 | 0.244 | 0.000 | 0.076 | 1.318 | 1.470 | 0.027 | n/a | 0.128 | 17.470 | n/a | n/a | 0.053 | 5.167 | 0.202 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024de | 24.844 | 4.488 | 0.956 | 0.000 | 0.079 | 1.471 | 4.965 | 0.029 | n/a | 0.287 | 12.480 | n/a | n/a | 0.089 | 5.523 | 0.222 | 0.089 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024a8 | 24.259 | 5.076 | 0.291 | 0.000 | 0.063 | 1.380 | 5.216 | 0.031 | n/a | 0.152 | 11.985 | n/a | n/a | 0.065 | 5.429 | 0.224 | 0.065 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 1.199ms |
| 74b83bb6072e79280000000000002440 | 22.877 | 3.077 | 0.236 | 0.000 | 0.053 | 1.181 | 7.371 | 0.041 | n/a | 0.198 | 10.678 | n/a | n/a | 0.042 | 3.366 | 0.147 | 0.042 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002450 | 22.565 | 4.267 | 1.307 | 0.000 | 0.052 | 1.434 | 1.987 | 0.045 | n/a | 0.208 | 13.210 | n/a | n/a | 0.057 | 5.625 | 0.249 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000245a | 22.449 | 3.908 | 0.299 | 0.000 | 0.078 | 0.944 | 5.026 | 0.028 | n/a | 0.126 | 11.980 | n/a | n/a | 0.059 | 4.285 | 0.191 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024cf | 21.596 | 4.307 | 0.326 | 0.000 | 0.134 | 1.191 | 6.549 | 0.027 | n/a | 0.116 | 8.892 | n/a | n/a | 0.053 | 4.767 | 0.221 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002452 | 21.596 | 4.158 | 0.312 | 0.000 | 0.053 | 1.488 | 5.750 | 0.039 | n/a | 0.127 | 9.612 | n/a | n/a | 0.056 | 4.524 | 0.209 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024e2 | 21.324 | 2.876 | 0.208 | 0.000 | 0.049 | 0.833 | 6.015 | 0.028 | n/a | 0.100 | 11.183 | n/a | n/a | 0.032 | 3.133 | 0.147 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002472 | 21.287 | 5.164 | 0.310 | 0.000 | 0.044 | 1.604 | 2.180 | 0.031 | n/a | 0.115 | 11.806 | n/a | n/a | 0.035 | 5.517 | 0.259 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000247f | 20.970 | 6.912 | 0.005 | 0.000 | 0.855 | 0.680 | 1.520 | 0.034 | n/a | 0.135 | 10.790 | n/a | n/a | 0.039 | 7.772 | 0.371 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002464 | 20.942 | 3.298 | 0.252 | 0.000 | 0.038 | 1.019 | 3.744 | 0.040 | n/a | 0.981 | 11.529 | n/a | n/a | 0.040 | 3.588 | 0.171 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024fd | 20.658 | 4.386 | 0.202 | 0.000 | 0.047 | 1.371 | 4.854 | 0.047 | n/a | 0.158 | 9.560 | n/a | n/a | 0.032 | 4.635 | 0.224 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.783 | 0.478 | 0.000 | 1.520 | 3.514 | 0.005 | 0.000 | 0.552 | 0.592 | 0.888 | 0.025 | n/a | 0.139 | 5.232 | n/a | n/a | 0.042 | 4.019 | 0.347 | 0.042 |
| p99 | 32.606 | 1.729 | 0.000 | 4.622 | 6.856 | 0.013 | 0.000 | 1.064 | 2.056 | 5.247 | 0.090 | n/a | 0.342 | 26.174 | n/a | n/a | 0.154 | 7.354 | 0.510 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000024a5 | 32.606 | 4.173 | 0.007 | 0.000 | 0.587 | 0.662 | 0.808 | 0.025 | n/a | 0.129 | 26.174 | n/a | n/a | 0.042 | 4.767 | 0.146 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024df | 17.759 | 4.491 | 0.007 | 0.000 | 0.446 | 0.825 | 1.809 | 0.035 | n/a | 0.185 | 9.909 | n/a | n/a | 0.052 | 4.944 | 0.278 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024c8 | 17.021 | 3.514 | 0.004 | 0.000 | 0.370 | 1.137 | 5.247 | 0.059 | n/a | 0.292 | 6.358 | n/a | n/a | 0.040 | 3.888 | 0.228 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000248d | 15.938 | 2.605 | 0.004 | 0.000 | 0.272 | 0.647 | 1.261 | 0.039 | n/a | 0.195 | 10.874 | n/a | n/a | 0.041 | 2.882 | 0.181 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002490 | 15.079 | 2.492 | 0.004 | 0.000 | 0.965 | 0.458 | 0.780 | 0.024 | n/a | 0.109 | 10.210 | n/a | n/a | 0.038 | 3.460 | 0.229 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002493 | 14.986 | 6.532 | 0.010 | 0.000 | 0.609 | 0.829 | 1.014 | 0.023 | n/a | 0.119 | 5.808 | n/a | n/a | 0.042 | 7.151 | 0.477 | 0.042 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000247c | 14.791 | 5.353 | 0.008 | 0.000 | 0.313 | 2.056 | 0.987 | 0.028 | n/a | 0.104 | 5.905 | n/a | n/a | 0.036 | 5.674 | 0.384 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002453 | 14.766 | 2.906 | 0.005 | 0.000 | 0.825 | 0.657 | 1.684 | 0.051 | n/a | 0.236 | 8.366 | n/a | n/a | 0.037 | 3.736 | 0.253 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024bc | 14.751 | 4.268 | 0.013 | 0.000 | 0.304 | 0.846 | 1.488 | 0.090 | n/a | 0.342 | 7.343 | n/a | n/a | 0.057 | 4.585 | 0.311 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002474 | 14.730 | 3.464 | 0.007 | 0.000 | 0.276 | 0.479 | 0.544 | 0.012 | n/a | 0.052 | 9.830 | n/a | n/a | 0.065 | 3.747 | 0.254 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.559ms |
| 74b83bb6072e7928000000000000246e | 14.491 | 6.856 | 0.008 | 0.000 | 0.490 | 0.948 | 0.766 | 0.025 | n/a | 0.127 | 5.232 | n/a | n/a | 0.038 | 7.354 | 0.508 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024e3 | 13.644 | 3.219 | 0.004 | 0.000 | 0.750 | 0.460 | 0.834 | 0.026 | n/a | 0.117 | 8.192 | n/a | n/a | 0.042 | 3.973 | 0.291 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000244d | 13.300 | 2.725 | 0.003 | 0.000 | 0.053 | 0.423 | 0.755 | 0.026 | n/a | 0.139 | 9.136 | n/a | n/a | 0.039 | 2.781 | 0.209 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024c4 | 12.469 | 5.323 | 0.010 | 0.000 | 0.917 | 0.856 | 1.090 | 0.030 | n/a | 0.148 | 4.047 | n/a | n/a | 0.049 | 6.250 | 0.501 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024f3 | 12.239 | 3.242 | 0.006 | 0.000 | 0.671 | 0.661 | 1.207 | 0.035 | n/a | 0.297 | 6.079 | n/a | n/a | 0.042 | 3.918 | 0.320 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024d0 | 11.832 | 3.077 | 0.004 | 0.000 | 0.812 | 0.602 | 1.492 | 0.036 | n/a | 0.110 | 5.666 | n/a | n/a | 0.033 | 3.893 | 0.329 | 0.033 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000024fa | 11.783 | 4.021 | 0.007 | 0.000 | 1.064 | 0.592 | 0.906 | 0.025 | n/a | 0.309 | 4.808 | n/a | n/a | 0.050 | 5.093 | 0.432 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002509 | 11.479 | 3.192 | 0.004 | 0.000 | 0.728 | 0.573 | 0.763 | 0.024 | n/a | 0.110 | 6.044 | n/a | n/a | 0.041 | 3.924 | 0.342 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000245c | 11.362 | 4.528 | 0.008 | 0.000 | 0.556 | 0.671 | 0.715 | 0.023 | n/a | 0.141 | 4.656 | n/a | n/a | 0.064 | 5.092 | 0.448 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000249c | 11.316 | 3.304 | 0.005 | 0.000 | 0.182 | 0.592 | 1.590 | 0.052 | n/a | 0.271 | 5.270 | n/a | n/a | 0.051 | 3.491 | 0.308 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.351 | 0.463 | 0.000 | 1.505 | 3.298 | 0.007 | 0.000 | 0.736 | 0.541 | 0.988 | 0.023 | n/a | 0.349 | 7.486 | n/a | n/a | 0.046 | 4.046 | 0.343 | 0.046 |
| p99 | 22.535 | 1.087 | 0.000 | 2.338 | 4.321 | 0.011 | 0.000 | 0.951 | 0.556 | 1.664 | 0.023 | n/a | 3.590 | 12.924 | n/a | n/a | 0.049 | 4.916 | 0.407 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000261a | 22.535 | 2.860 | 0.007 | 0.000 | 0.951 | 0.470 | 1.664 | 0.023 | n/a | 3.590 | 12.924 | n/a | n/a | 0.046 | 3.818 | 0.169 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000250e | 14.351 | 4.321 | 0.004 | 0.000 | 0.591 | 0.541 | 0.988 | 0.023 | n/a | 0.349 | 7.486 | n/a | n/a | 0.049 | 4.916 | 0.343 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002618 | 9.946 | 3.298 | 0.011 | 0.000 | 0.736 | 0.556 | 0.842 | 0.023 | n/a | 0.326 | 4.120 | n/a | n/a | 0.033 | 4.046 | 0.407 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.201 | 0.428 | 0.000 | 1.374 | 3.784 | 0.009 | 0.000 | 0.118 | 0.853 | 1.377 | 0.028 | n/a | 0.296 | 7.838 | n/a | n/a | 0.042 | 4.162 | 0.270 | 0.042 |
| p99 | 61.041 | 4.767 | 2.524 | 5.997 | 15.151 | 2.307 | 0.000 | 1.079 | 4.222 | 35.248 | 0.510 | n/a | 3.878 | 36.080 | n/a | n/a | 0.094 | 15.515 | 0.580 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002519 | 61.041 | 4.284 | 0.202 | 0.000 | 0.044 | 1.133 | 35.248 | 0.065 | n/a | 0.246 | 19.779 | n/a | n/a | 0.041 | 4.530 | 0.074 | 0.041 | gw-w/thread-47/gateway.request-parse | none observed |
| 74b83bb6072e79280000000000002514 | 50.354 | 4.915 | 0.006 | 0.000 | 0.666 | 1.034 | 8.569 | 0.052 | n/a | 0.379 | 34.691 | n/a | n/a | 0.042 | 5.587 | 0.111 | 0.042 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002562 | 48.655 | 3.146 | 0.242 | 0.000 | 0.042 | 1.235 | 7.638 | 0.039 | n/a | 0.201 | 36.080 | n/a | n/a | 0.031 | 3.431 | 0.071 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002558 | 41.235 | 5.637 | 0.009 | 0.000 | 0.404 | 2.810 | 29.993 | 0.160 | n/a | 2.060 | 0.104 | n/a | n/a | 0.058 | 6.050 | 0.147 | 0.058 | gw-w/thread-45/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002513 | 40.469 | 3.058 | 0.162 | 0.000 | 0.043 | 0.900 | 6.133 | 0.011 | n/a | 0.033 | 30.095 | n/a | n/a | 0.031 | 3.264 | 0.081 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000258a | 35.321 | 15.151 | 0.009 | 0.000 | 0.355 | 0.889 | 2.795 | 0.032 | n/a | 0.165 | 15.848 | n/a | n/a | 0.076 | 15.515 | 0.439 | 0.076 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000257f | 32.473 | 3.324 | 0.307 | 0.000 | 0.064 | 1.295 | 15.701 | 0.026 | n/a | 0.120 | 11.594 | n/a | n/a | 0.041 | 3.695 | 0.114 | 0.041 | gw-w/thread-46/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002521 | 28.260 | 3.851 | 0.180 | 0.000 | 0.079 | 1.071 | 7.148 | 0.030 | n/a | 0.371 | 15.495 | n/a | n/a | 0.036 | 4.110 | 0.145 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002533 | 27.372 | 3.815 | 0.851 | 0.000 | 0.038 | 1.276 | 9.034 | 0.063 | n/a | 0.178 | 12.065 | n/a | n/a | 0.052 | 4.704 | 0.172 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002589 | 26.896 | 3.986 | 0.298 | 0.000 | 0.063 | 1.140 | 6.428 | 0.039 | n/a | 0.310 | 14.551 | n/a | n/a | 0.080 | 4.347 | 0.162 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000256a | 25.885 | 3.296 | 0.252 | 0.000 | 0.057 | 1.427 | 11.258 | 0.039 | n/a | 0.561 | 8.959 | n/a | n/a | 0.036 | 3.605 | 0.139 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002537 | 25.764 | 2.957 | 0.178 | 0.000 | 0.038 | 1.031 | 5.274 | 0.026 | n/a | 0.100 | 16.125 | n/a | n/a | 0.035 | 3.173 | 0.123 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002563 | 25.272 | 5.819 | 0.004 | 0.000 | 0.870 | 0.637 | 2.870 | 0.040 | n/a | 1.038 | 13.960 | n/a | n/a | 0.034 | 6.693 | 0.265 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000252d | 24.880 | 3.049 | 0.214 | 0.000 | 0.087 | 1.007 | 11.567 | 0.046 | n/a | 0.126 | 8.747 | n/a | n/a | 0.038 | 3.349 | 0.135 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002574 | 24.535 | 4.218 | 2.054 | 0.000 | 0.045 | 1.332 | 5.013 | 0.025 | n/a | 0.348 | 11.449 | n/a | n/a | 0.051 | 6.317 | 0.257 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000253d | 23.563 | 4.489 | 0.245 | 0.000 | 0.054 | 1.465 | 6.817 | 0.028 | n/a | 0.105 | 10.324 | n/a | n/a | 0.036 | 4.788 | 0.203 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025a2 | 23.145 | 4.188 | 0.004 | 0.000 | 0.916 | 0.842 | 2.227 | 0.072 | n/a | 3.133 | 11.721 | n/a | n/a | 0.044 | 5.107 | 0.221 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002593 | 22.998 | 5.971 | 0.349 | 0.000 | 0.088 | 1.514 | 4.759 | 0.027 | n/a | 0.122 | 10.103 | n/a | n/a | 0.065 | 6.408 | 0.279 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000252b | 22.475 | 3.530 | 0.241 | 0.000 | 0.043 | 0.953 | 5.416 | 0.027 | n/a | 0.324 | 11.897 | n/a | n/a | 0.045 | 3.814 | 0.170 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000257d | 22.385 | 3.939 | 0.232 | 0.000 | 0.045 | 1.266 | 6.972 | 0.027 | n/a | 0.092 | 9.771 | n/a | n/a | 0.039 | 4.217 | 0.188 | 0.039 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.246 | 0.636 | 0.000 | 1.751 | 4.205 | 0.005 | 0.000 | 0.543 | 0.667 | 0.884 | 0.026 | n/a | 0.321 | 5.672 | n/a | n/a | 0.045 | 4.630 | 0.341 | 0.045 |
| p99 | 50.354 | 2.260 | 2.524 | 4.694 | 7.136 | 0.011 | 0.000 | 1.079 | 2.810 | 29.993 | 0.510 | n/a | 3.878 | 34.691 | n/a | n/a | 0.083 | 7.387 | 0.543 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002514 | 50.354 | 4.915 | 0.006 | 0.000 | 0.666 | 1.034 | 8.569 | 0.052 | n/a | 0.379 | 34.691 | n/a | n/a | 0.042 | 5.587 | 0.111 | 0.042 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002558 | 41.235 | 5.637 | 0.009 | 0.000 | 0.404 | 2.810 | 29.993 | 0.160 | n/a | 2.060 | 0.104 | n/a | n/a | 0.058 | 6.050 | 0.147 | 0.058 | gw-w/thread-45/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000253f | 22.182 | 4.619 | 0.004 | 0.000 | 0.962 | 0.560 | 1.500 | 0.042 | n/a | 3.878 | 10.568 | n/a | n/a | 0.048 | 5.586 | 0.252 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002550 | 21.965 | 4.788 | 0.006 | 0.000 | 0.708 | 0.984 | 0.573 | 0.100 | n/a | 0.473 | 14.280 | n/a | n/a | 0.053 | 5.502 | 0.250 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025a9 | 19.725 | 4.205 | 0.005 | 0.000 | 0.140 | 0.515 | 0.958 | 0.027 | n/a | 3.432 | 10.382 | n/a | n/a | 0.060 | 4.350 | 0.221 | 0.060 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000251e | 19.592 | 2.871 | 0.005 | 0.000 | 0.227 | 0.540 | 0.884 | 0.029 | n/a | 3.453 | 11.543 | n/a | n/a | 0.039 | 3.103 | 0.158 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000255a | 18.988 | 4.598 | 0.007 | 0.000 | 0.892 | 0.667 | 0.586 | 0.510 | n/a | 0.295 | 11.375 | n/a | n/a | 0.057 | 5.498 | 0.290 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000253a | 17.076 | 5.987 | 0.005 | 0.000 | 0.778 | 0.501 | 0.832 | 0.024 | n/a | 0.103 | 8.802 | n/a | n/a | 0.044 | 6.770 | 0.396 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002517 | 16.324 | 5.262 | 0.007 | 0.000 | 1.035 | 0.765 | 2.057 | 0.035 | n/a | 0.128 | 6.996 | n/a | n/a | 0.041 | 6.303 | 0.386 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002556 | 16.201 | 4.218 | 0.007 | 0.000 | 0.118 | 0.641 | 0.841 | 0.320 | n/a | 3.562 | 6.449 | n/a | n/a | 0.045 | 4.343 | 0.268 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000251b | 16.190 | 5.502 | 0.008 | 0.000 | 0.420 | 0.847 | 1.149 | 0.039 | n/a | 0.538 | 7.639 | n/a | n/a | 0.048 | 5.930 | 0.366 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025a5 | 15.719 | 4.151 | 0.008 | 0.000 | 0.875 | 0.707 | 0.934 | 0.022 | n/a | 3.204 | 5.745 | n/a | n/a | 0.073 | 5.034 | 0.320 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002544 | 14.386 | 6.049 | 0.004 | 0.000 | 0.270 | 0.465 | 0.991 | 0.025 | n/a | 0.373 | 6.143 | n/a | n/a | 0.064 | 6.323 | 0.440 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000257b | 13.602 | 7.136 | 0.007 | 0.000 | 0.245 | 0.549 | 0.792 | 0.019 | n/a | 0.257 | 4.513 | n/a | n/a | 0.083 | 7.387 | 0.543 | 0.083 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025c9 | 13.528 | 3.078 | 0.005 | 0.000 | 1.079 | 0.489 | 0.864 | 0.026 | n/a | 0.134 | 7.800 | n/a | n/a | 0.054 | 4.162 | 0.308 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025c5 | 13.448 | 4.536 | 0.007 | 0.000 | 0.796 | 0.959 | 0.757 | 0.022 | n/a | 0.251 | 6.079 | n/a | n/a | 0.041 | 5.339 | 0.397 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000256c | 13.246 | 4.676 | 0.004 | 0.000 | 0.510 | 0.840 | 0.830 | 0.023 | n/a | 0.361 | 5.948 | n/a | n/a | 0.053 | 5.191 | 0.392 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002575 | 12.839 | 4.794 | 0.011 | 0.000 | 0.605 | 0.560 | 1.212 | 0.027 | n/a | 0.396 | 5.181 | n/a | n/a | 0.054 | 5.410 | 0.421 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002553 | 12.573 | 4.158 | 0.007 | 0.000 | 0.083 | 0.859 | 1.622 | 0.047 | n/a | 0.230 | 5.523 | n/a | n/a | 0.045 | 4.247 | 0.338 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025cd | 12.529 | 4.303 | 0.007 | 0.000 | 0.271 | 0.774 | 1.247 | 0.033 | n/a | 0.177 | 5.672 | n/a | n/a | 0.046 | 4.582 | 0.366 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.698 | 0.356 | 0.000 | 0.505 | 4.514 | 0.219 | 0.000 | 0.099 | 2.095 | 2.570 | 0.036 | n/a | 0.150 | 22.837 | n/a | n/a | 0.046 | 5.875 | 0.125 | 0.046 |
| p99 | 166.111 | 3.641 | 0.005 | 3.653 | 8.338 | 32.449 | 0.000 | 2.138 | 30.134 | 7.684 | 5.625 | n/a | 1.854 | 142.254 | n/a | n/a | 0.073 | 37.786 | 0.649 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002605 | 166.111 | 4.535 | 11.292 | 0.000 | 0.062 | 1.960 | 4.056 | 0.033 | n/a | 1.854 | 142.254 | n/a | n/a | 0.065 | 15.888 | 0.096 | 0.065 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025ff | 161.243 | 3.878 | 22.491 | 0.000 | 0.045 | 1.339 | 7.684 | 0.046 | n/a | 0.125 | 125.602 | n/a | n/a | 0.033 | 26.414 | 0.164 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002613 | 136.197 | 8.338 | 0.011 | 0.000 | 0.744 | 7.349 | 1.392 | 0.031 | n/a | 0.150 | 118.124 | n/a | n/a | 0.059 | 9.092 | 0.067 | 0.059 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002608 | 120.700 | 4.296 | 0.011 | 0.000 | 0.701 | 15.393 | 0.654 | 0.056 | n/a | 0.240 | 99.314 | n/a | n/a | 0.033 | 5.009 | 0.041 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025d8 | 119.057 | 5.709 | 8.423 | 0.000 | 0.049 | 2.095 | 4.986 | 0.072 | n/a | 0.589 | 97.102 | n/a | n/a | 0.033 | 14.181 | 0.119 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000260b | 58.203 | 3.199 | 32.449 | 0.000 | 2.138 | 0.263 | 0.663 | 0.024 | n/a | 0.126 | 19.291 | n/a | n/a | 0.049 | 37.786 | 0.649 | 0.049 | node-14/thread-0/client.commit-send-queue | client.encode 5.147ms |
| 74b83bb6072e792800000000000025e9 | 54.032 | 5.407 | 0.012 | 0.000 | 1.089 | 30.134 | 4.129 | 0.026 | n/a | 0.120 | 13.043 | n/a | n/a | 0.073 | 6.508 | 0.120 | 0.073 | node-14/thread-0/socket.wait-first-byte | none observed |
| 74b83bb6072e792800000000000025e0 | 49.817 | 3.482 | 0.219 | 0.000 | 0.022 | 2.233 | 1.486 | 0.036 | n/a | 0.103 | 42.197 | n/a | n/a | 0.040 | 3.723 | 0.075 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025eb | 41.698 | 4.514 | 0.300 | 0.000 | 0.099 | 18.632 | 6.619 | 5.625 | n/a | 0.176 | 5.680 | n/a | n/a | 0.054 | 4.913 | 0.118 | 0.054 | node-14/thread-5/socket.wait-first-byte | none observed |
| 74b83bb6072e792800000000000025ec | 37.904 | 6.282 | 0.013 | 0.000 | 0.326 | 0.396 | 1.379 | 0.027 | n/a | 0.086 | 29.345 | n/a | n/a | 0.050 | 6.621 | 0.175 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025f9 | 34.738 | 3.787 | 0.523 | 0.000 | 0.045 | 1.226 | 2.570 | 1.600 | n/a | 0.112 | 24.828 | n/a | n/a | 0.048 | 4.354 | 0.125 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025dd | 33.474 | 4.026 | 0.008 | 0.000 | 0.939 | 1.484 | 3.469 | 0.035 | n/a | 0.633 | 22.837 | n/a | n/a | 0.044 | 4.973 | 0.149 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025f3 | 29.230 | 5.112 | 0.403 | 0.000 | 0.048 | 1.425 | 4.174 | 0.197 | n/a | 0.150 | 17.676 | n/a | n/a | 0.046 | 5.563 | 0.190 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000025e3 | 26.250 | 5.787 | 0.010 | 0.000 | 0.846 | 3.233 | 0.979 | 0.029 | n/a | 0.150 | 15.176 | n/a | n/a | 0.042 | 6.642 | 0.253 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000260f | 25.558 | 4.296 | 0.375 | 0.000 | 0.071 | 2.405 | 3.217 | 0.047 | n/a | 0.464 | 14.634 | n/a | n/a | 0.049 | 4.742 | 0.186 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002614 | 21.718 | 5.166 | 0.007 | 0.000 | 0.701 | 5.808 | 1.177 | 0.037 | n/a | 0.122 | 8.657 | n/a | n/a | 0.043 | 5.875 | 0.270 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.814ms; driver.publication 1.370ms |

## P2 / grow3 / commit / 5-10 facts (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.032 | 1.066 | 0.000 | 1.793 | 4.296 | 0.011 | 0.000 | 0.939 | 5.808 | 1.177 | 0.035 | n/a | 0.126 | 19.291 | n/a | n/a | 0.044 | 5.875 | 0.149 | 0.044 |
| p99 | 120.700 | 2.026 | 0.005 | 3.499 | 5.407 | 32.449 | 0.000 | 2.138 | 30.134 | 4.129 | 0.056 | n/a | 0.633 | 99.314 | n/a | n/a | 0.073 | 37.786 | 0.649 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002608 | 120.700 | 4.296 | 0.011 | 0.000 | 0.701 | 15.393 | 0.654 | 0.056 | n/a | 0.240 | 99.314 | n/a | n/a | 0.033 | 5.009 | 0.041 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000260b | 58.203 | 3.199 | 32.449 | 0.000 | 2.138 | 0.263 | 0.663 | 0.024 | n/a | 0.126 | 19.291 | n/a | n/a | 0.049 | 37.786 | 0.649 | 0.049 | node-14/thread-0/client.commit-send-queue | client.encode 5.147ms |
| 74b83bb6072e792800000000000025e9 | 54.032 | 5.407 | 0.012 | 0.000 | 1.089 | 30.134 | 4.129 | 0.026 | n/a | 0.120 | 13.043 | n/a | n/a | 0.073 | 6.508 | 0.120 | 0.073 | node-14/thread-0/socket.wait-first-byte | none observed |
| 74b83bb6072e792800000000000025dd | 33.474 | 4.026 | 0.008 | 0.000 | 0.939 | 1.484 | 3.469 | 0.035 | n/a | 0.633 | 22.837 | n/a | n/a | 0.044 | 4.973 | 0.149 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002614 | 21.718 | 5.166 | 0.007 | 0.000 | 0.701 | 5.808 | 1.177 | 0.037 | n/a | 0.122 | 8.657 | n/a | n/a | 0.043 | 5.875 | 0.270 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.814ms; driver.publication 1.370ms |

## P4 / p4h3 / commit (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.498 | 0.428 | 0.000 | 1.330 | 3.596 | 0.013 | 0.000 | 0.172 | 0.856 | 1.821 | 0.031 | n/a | 0.181 | 8.901 | n/a | n/a | 0.038 | 4.139 | 0.249 | 0.038 |
| p99 | 45.721 | 2.073 | 0.005 | 3.141 | 6.272 | 0.624 | 0.000 | 1.053 | 1.561 | 24.671 | 0.108 | n/a | 0.740 | 26.591 | n/a | n/a | 0.075 | 6.795 | 0.486 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002643 | 60.031 | 4.229 | 0.238 | 0.000 | 0.046 | 1.165 | 39.751 | 0.025 | n/a | 0.115 | 14.416 | n/a | n/a | 0.045 | 4.513 | 0.075 | 0.045 | gw-w/thread-44/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002629 | 45.721 | 3.220 | 0.624 | 0.000 | 0.035 | 1.027 | 24.671 | 0.054 | n/a | 0.240 | 15.824 | n/a | n/a | 0.027 | 3.879 | 0.085 | 0.027 | gw-w/thread-42/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002620 | 37.882 | 5.068 | 0.012 | 0.000 | 0.083 | 0.753 | 9.912 | 0.029 | n/a | 0.125 | 21.848 | n/a | n/a | 0.051 | 5.163 | 0.136 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002674 | 34.812 | 2.636 | 0.174 | 0.000 | 0.047 | 0.886 | 4.211 | 0.037 | n/a | 0.146 | 26.635 | n/a | n/a | 0.041 | 2.856 | 0.082 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000266b | 34.558 | 4.287 | 0.007 | 0.000 | 0.982 | 0.386 | 1.971 | 0.023 | n/a | 0.282 | 26.591 | n/a | n/a | 0.028 | 5.277 | 0.153 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000267a | 29.849 | 3.576 | 0.283 | 0.000 | 0.054 | 1.084 | 11.996 | 0.025 | n/a | 0.114 | 12.680 | n/a | n/a | 0.037 | 3.913 | 0.131 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000269f | 27.399 | 4.210 | 0.253 | 0.000 | 0.059 | 1.340 | 8.692 | 0.127 | n/a | 0.160 | 12.525 | n/a | n/a | 0.034 | 4.522 | 0.165 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002691 | 26.862 | 5.377 | 0.011 | 0.000 | 0.835 | 0.869 | 1.204 | 0.037 | n/a | 0.156 | 18.335 | n/a | n/a | 0.039 | 6.223 | 0.232 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002637 | 26.470 | 3.310 | 0.539 | 0.000 | 0.086 | 1.005 | 6.372 | 0.030 | n/a | 0.111 | 14.971 | n/a | n/a | 0.046 | 3.936 | 0.149 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026af | 25.162 | 3.139 | 0.303 | 0.000 | 0.031 | 1.194 | 5.491 | 0.049 | n/a | 0.463 | 14.457 | n/a | n/a | 0.036 | 3.473 | 0.138 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002690 | 24.547 | 4.426 | 0.287 | 0.000 | 0.090 | 1.465 | 7.692 | 0.043 | n/a | 0.101 | 10.321 | n/a | n/a | 0.123 | 4.802 | 0.196 | 0.123 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002649 | 24.508 | 3.767 | 0.184 | 0.000 | 0.046 | 1.132 | 2.969 | 0.029 | n/a | 0.138 | 16.210 | n/a | n/a | 0.032 | 3.997 | 0.163 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000268c | 24.326 | 2.750 | 0.213 | 0.000 | 0.068 | 0.893 | 3.060 | 0.024 | n/a | 0.122 | 17.159 | n/a | n/a | 0.037 | 3.031 | 0.125 | 0.037 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026c0 | 23.175 | 4.878 | 0.265 | 0.000 | 0.053 | 1.491 | 1.932 | 0.079 | n/a | 0.137 | 14.308 | n/a | n/a | 0.032 | 5.196 | 0.224 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026e9 | 22.691 | 3.828 | 0.008 | 0.000 | 0.663 | 0.764 | 2.867 | 0.039 | n/a | 0.159 | 14.324 | n/a | n/a | 0.038 | 4.500 | 0.198 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000263b | 22.531 | 4.146 | 0.304 | 0.000 | 0.070 | 1.145 | 7.191 | 0.026 | n/a | 0.261 | 9.350 | n/a | n/a | 0.037 | 4.520 | 0.201 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002624 | 22.180 | 5.128 | 0.011 | 0.000 | 0.992 | 0.646 | 2.218 | 0.021 | n/a | 0.426 | 12.703 | n/a | n/a | 0.036 | 6.132 | 0.276 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002694 | 22.110 | 4.285 | 0.281 | 0.000 | 0.049 | 1.002 | 1.821 | 0.032 | n/a | 0.364 | 14.241 | n/a | n/a | 0.036 | 4.614 | 0.209 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026b3 | 21.647 | 2.904 | 0.311 | 0.000 | 0.082 | 0.990 | 5.657 | 0.030 | n/a | 0.314 | 11.320 | n/a | n/a | 0.039 | 3.297 | 0.152 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026ad | 21.453 | 2.619 | 0.216 | 0.000 | 0.038 | 0.924 | 7.507 | 0.029 | n/a | 0.100 | 9.984 | n/a | n/a | 0.038 | 2.873 | 0.134 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.861 | 0.664 | 0.000 | 1.602 | 3.274 | 0.008 | 0.000 | 0.475 | 0.642 | 1.204 | 0.032 | n/a | 0.183 | 6.863 | n/a | n/a | 0.039 | 3.791 | 0.267 | 0.039 |
| p99 | 26.862 | 2.073 | 0.541 | 3.141 | 5.377 | 0.044 | 0.000 | 1.004 | 3.864 | 8.558 | 0.108 | n/a | 0.980 | 18.335 | n/a | n/a | 0.072 | 6.223 | 0.534 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002691 | 26.862 | 5.377 | 0.011 | 0.000 | 0.835 | 0.869 | 1.204 | 0.037 | n/a | 0.156 | 18.335 | n/a | n/a | 0.039 | 6.223 | 0.232 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002696 | 21.448 | 3.732 | 0.008 | 0.000 | 0.354 | 0.556 | 0.737 | 0.022 | n/a | 0.108 | 15.881 | n/a | n/a | 0.049 | 4.094 | 0.191 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002652 | 20.271 | 4.517 | 0.007 | 0.000 | 0.895 | 3.864 | 8.558 | 0.051 | n/a | 0.135 | 2.211 | n/a | n/a | 0.035 | 5.419 | 0.267 | 0.035 | gw-w/thread-49/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000267c | 19.716 | 4.411 | 0.014 | 0.000 | 0.172 | 0.815 | 1.365 | 0.043 | n/a | 0.661 | 12.185 | n/a | n/a | 0.049 | 4.597 | 0.233 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002663 | 19.532 | 2.492 | 0.008 | 0.000 | 0.889 | 0.637 | 1.346 | 0.042 | n/a | 0.183 | 13.896 | n/a | n/a | 0.039 | 3.389 | 0.174 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000262e | 18.514 | 3.638 | 0.044 | 0.000 | 0.911 | 0.756 | 1.131 | 0.038 | n/a | 0.585 | 11.373 | n/a | n/a | 0.038 | 4.594 | 0.248 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002630 | 17.866 | 4.257 | 0.011 | 0.000 | 0.175 | 0.709 | 0.759 | 0.076 | n/a | 0.726 | 11.082 | n/a | n/a | 0.072 | 4.443 | 0.249 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026df | 17.765 | 3.037 | 0.009 | 0.000 | 0.129 | 0.642 | 2.017 | 0.046 | n/a | 0.202 | 11.647 | n/a | n/a | 0.035 | 3.175 | 0.179 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026a8 | 17.599 | 2.729 | 0.007 | 0.000 | 0.976 | 1.150 | 1.807 | 0.046 | n/a | 0.555 | 10.291 | n/a | n/a | 0.038 | 3.712 | 0.211 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002622 | 17.543 | 3.431 | 0.008 | 0.000 | 1.004 | 0.486 | 1.186 | 0.022 | n/a | 0.372 | 10.985 | n/a | n/a | 0.050 | 4.443 | 0.253 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026a2 | 17.395 | 3.145 | 0.009 | 0.000 | 0.914 | 0.802 | 2.099 | 0.108 | n/a | 0.980 | 9.306 | n/a | n/a | 0.032 | 4.068 | 0.234 | 0.032 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000269c | 17.037 | 4.081 | 0.009 | 0.000 | 0.846 | 0.742 | 4.385 | 0.058 | n/a | 0.106 | 6.752 | n/a | n/a | 0.057 | 4.937 | 0.290 | 0.057 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000262a | 17.001 | 3.230 | 0.007 | 0.000 | 0.217 | 0.604 | 5.323 | 0.031 | n/a | 0.092 | 7.463 | n/a | n/a | 0.034 | 3.454 | 0.203 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026b6 | 16.392 | 2.762 | 0.008 | 0.000 | 0.497 | 1.148 | 0.884 | 0.023 | n/a | 0.111 | 10.922 | n/a | n/a | 0.038 | 3.266 | 0.199 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002655 | 16.048 | 3.244 | 0.007 | 0.000 | 0.204 | 0.543 | 1.066 | 0.022 | n/a | 0.097 | 10.833 | n/a | n/a | 0.031 | 3.455 | 0.215 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002646 | 15.432 | 4.621 | 0.012 | 0.000 | 0.195 | 1.561 | 1.308 | 0.046 | n/a | 0.338 | 7.294 | n/a | n/a | 0.057 | 4.828 | 0.313 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002659 | 14.861 | 3.925 | 0.008 | 0.000 | 0.397 | 0.570 | 0.783 | 0.024 | n/a | 0.323 | 8.795 | n/a | n/a | 0.038 | 4.329 | 0.291 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026b4 | 14.114 | 4.098 | 0.011 | 0.000 | 0.865 | 0.644 | 1.467 | 0.071 | n/a | 0.181 | 6.738 | n/a | n/a | 0.039 | 4.975 | 0.352 | 0.039 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002626 | 13.959 | 3.336 | 0.013 | 0.000 | 0.384 | 0.537 | 1.030 | 0.023 | n/a | 0.099 | 8.502 | n/a | n/a | 0.036 | 3.733 | 0.267 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026c3 | 13.587 | 4.588 | 0.013 | 0.000 | 0.364 | 0.724 | 0.852 | 0.023 | n/a | 0.125 | 6.863 | n/a | n/a | 0.034 | 4.965 | 0.365 | 0.034 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.733 | 0.543 | 0.000 | 0.510 | 4.064 | 0.019 | 0.000 | 0.121 | 10.488 | 2.372 | 0.030 | n/a | 0.225 | 53.200 | n/a | n/a | 0.035 | 5.338 | 0.125 | 0.035 |
| p99 | 182.084 | 1.533 | 0.490 | 1.992 | 7.163 | 43.262 | 0.000 | 71.104 | 20.663 | 20.075 | 0.102 | n/a | 0.866 | 150.280 | n/a | n/a | 0.070 | 73.665 | 0.876 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000271e | 182.084 | 6.468 | 16.151 | 0.000 | 0.070 | 0.975 | 7.823 | 0.039 | n/a | 0.231 | 150.280 | n/a | n/a | 0.047 | 22.689 | 0.125 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026f5 | 170.262 | 5.218 | 12.173 | 0.000 | 0.062 | 1.046 | 10.322 | 0.028 | n/a | 0.364 | 141.013 | n/a | n/a | 0.037 | 17.452 | 0.103 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002765 | 165.915 | 4.155 | 18.880 | 0.000 | 0.046 | 0.903 | 5.247 | 0.035 | n/a | 0.136 | 136.477 | n/a | n/a | 0.037 | 23.081 | 0.139 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002711 | 161.314 | 3.540 | 0.013 | 0.000 | 0.426 | 10.837 | 0.768 | 0.023 | n/a | 0.252 | 145.412 | n/a | n/a | 0.043 | 3.979 | 0.025 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000275c | 161.194 | 3.015 | 0.009 | 0.000 | 0.627 | 10.922 | 1.047 | 0.031 | n/a | 0.677 | 144.815 | n/a | n/a | 0.051 | 3.651 | 0.023 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002760 | 153.191 | 3.112 | 0.008 | 0.000 | 0.759 | 13.285 | 0.882 | 0.024 | n/a | 0.120 | 134.968 | n/a | n/a | 0.033 | 3.879 | 0.025 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002761 | 145.526 | 4.344 | 0.013 | 0.000 | 0.121 | 12.069 | 1.123 | 0.025 | n/a | 0.147 | 127.643 | n/a | n/a | 0.041 | 4.478 | 0.031 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.163ms |
| 74b83bb6072e7928000000000000270d | 116.361 | 7.163 | 7.892 | 0.000 | 0.083 | 1.146 | 8.996 | 0.027 | n/a | 0.151 | 90.867 | n/a | n/a | 0.036 | 15.138 | 0.130 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000270a | 113.743 | 4.905 | 0.019 | 0.000 | 0.878 | 18.299 | 1.389 | 0.069 | n/a | 0.504 | 87.626 | n/a | n/a | 0.055 | 5.801 | 0.051 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002775 | 107.449 | 4.468 | 10.581 | 0.000 | 0.071 | 1.146 | 6.825 | 0.035 | n/a | 0.150 | 84.137 | n/a | n/a | 0.035 | 15.120 | 0.141 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002772 | 103.667 | 3.452 | 0.009 | 0.000 | 0.844 | 12.365 | 1.459 | 0.039 | n/a | 0.514 | 84.954 | n/a | n/a | 0.032 | 4.304 | 0.042 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000274c | 87.768 | 3.107 | 0.008 | 0.000 | 0.980 | 20.663 | 2.372 | 0.037 | n/a | 0.131 | 60.429 | n/a | n/a | 0.040 | 4.096 | 0.047 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.334ms |
| 74b83bb6072e7928000000000000274b | 87.404 | 4.228 | 0.013 | 0.000 | 1.096 | 12.493 | 0.813 | 0.022 | n/a | 0.478 | 68.210 | n/a | n/a | 0.051 | 5.338 | 0.061 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002728 | 84.126 | 2.554 | 0.008 | 0.000 | 71.104 | 0.354 | 0.713 | 0.024 | n/a | 0.126 | 9.210 | n/a | n/a | 0.034 | 73.665 | 0.876 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.834ms |
| 74b83bb6072e79280000000000002719 | 81.077 | 2.913 | 0.009 | 0.000 | 0.958 | 13.864 | 1.115 | 0.034 | n/a | 0.187 | 61.964 | n/a | n/a | 0.032 | 3.880 | 0.048 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002706 | 80.733 | 2.465 | 0.008 | 0.000 | 0.648 | 14.760 | 0.618 | 0.023 | n/a | 0.291 | 61.886 | n/a | n/a | 0.034 | 3.121 | 0.039 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002725 | 79.419 | 5.081 | 43.262 | 0.000 | 0.055 | 10.488 | 12.799 | 0.085 | n/a | 0.717 | 6.891 | n/a | n/a | 0.042 | 48.398 | 0.609 | 0.042 | node-14/thread-0/rpc.probe.transact | none observed |
| 74b83bb6072e79280000000000002756 | 74.160 | 3.684 | 0.218 | 0.000 | 0.010 | 1.036 | 15.686 | 0.023 | n/a | 0.265 | 53.200 | n/a | n/a | 0.038 | 3.912 | 0.053 | 0.038 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000026fb | 71.652 | 5.265 | 11.842 | 0.000 | 0.055 | 3.150 | 9.136 | 0.040 | n/a | 0.793 | 41.338 | n/a | n/a | 0.034 | 17.161 | 0.240 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002715 | 54.480 | 4.350 | 15.359 | 0.000 | 0.073 | 1.112 | 6.333 | 0.028 | n/a | 0.288 | 26.900 | n/a | n/a | 0.038 | 19.782 | 0.363 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit / 5-10 facts (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 84.126 | 0.853 | 0.000 | 1.530 | 3.015 | 0.008 | 0.000 | 0.878 | 13.579 | 0.959 | 0.024 | n/a | 0.187 | 61.886 | n/a | n/a | 0.035 | 3.979 | 0.051 | 0.035 |
| p99 | 161.314 | 1.533 | 0.005 | 1.774 | 4.905 | 0.019 | 0.000 | 71.104 | 20.663 | 20.075 | 0.069 | n/a | 0.677 | 145.412 | n/a | n/a | 0.055 | 73.665 | 0.876 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002711 | 161.314 | 3.540 | 0.013 | 0.000 | 0.426 | 10.837 | 0.768 | 0.023 | n/a | 0.252 | 145.412 | n/a | n/a | 0.043 | 3.979 | 0.025 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000275c | 161.194 | 3.015 | 0.009 | 0.000 | 0.627 | 10.922 | 1.047 | 0.031 | n/a | 0.677 | 144.815 | n/a | n/a | 0.051 | 3.651 | 0.023 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000270a | 113.743 | 4.905 | 0.019 | 0.000 | 0.878 | 18.299 | 1.389 | 0.069 | n/a | 0.504 | 87.626 | n/a | n/a | 0.055 | 5.801 | 0.051 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000274c | 87.768 | 3.107 | 0.008 | 0.000 | 0.980 | 20.663 | 2.372 | 0.037 | n/a | 0.131 | 60.429 | n/a | n/a | 0.040 | 4.096 | 0.047 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.334ms |
| 74b83bb6072e7928000000000000274b | 87.404 | 4.228 | 0.013 | 0.000 | 1.096 | 12.493 | 0.813 | 0.022 | n/a | 0.478 | 68.210 | n/a | n/a | 0.051 | 5.338 | 0.061 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002728 | 84.126 | 2.554 | 0.008 | 0.000 | 71.104 | 0.354 | 0.713 | 0.024 | n/a | 0.126 | 9.210 | n/a | n/a | 0.034 | 73.665 | 0.876 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.834ms |
| 74b83bb6072e79280000000000002719 | 81.077 | 2.913 | 0.009 | 0.000 | 0.958 | 13.864 | 1.115 | 0.034 | n/a | 0.187 | 61.964 | n/a | n/a | 0.032 | 3.880 | 0.048 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002706 | 80.733 | 2.465 | 0.008 | 0.000 | 0.648 | 14.760 | 0.618 | 0.023 | n/a | 0.291 | 61.886 | n/a | n/a | 0.034 | 3.121 | 0.039 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002778 | 45.646 | 2.832 | 0.008 | 0.000 | 0.677 | 16.954 | 0.959 | 0.023 | n/a | 0.085 | 24.073 | n/a | n/a | 0.035 | 3.518 | 0.077 | 0.035 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002743 | 43.708 | 3.296 | 0.007 | 0.000 | 2.544 | 6.063 | 20.075 | 0.040 | n/a | 0.116 | 11.539 | n/a | n/a | 0.028 | 5.847 | 0.134 | 0.028 | gw-w/thread-47/gateway.admitted-work | client.encode 2.175ms |
| 74b83bb6072e79280000000000002754 | 25.295 | 2.821 | 0.007 | 0.000 | 0.645 | 13.579 | 0.755 | 0.022 | n/a | 0.083 | 7.354 | n/a | n/a | 0.029 | 3.473 | 0.137 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h10 / commit (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.123 | 0.386 | 0.000 | 0.715 | 3.582 | 0.171 | 0.000 | 0.101 | 0.842 | 1.859 | 0.028 | n/a | 0.173 | 8.643 | n/a | n/a | 0.039 | 4.137 | 0.248 | 0.039 |
| p99 | 50.207 | 2.211 | 2.803 | 4.519 | 11.524 | 1.961 | 0.000 | 1.158 | 3.449 | 39.264 | 0.120 | n/a | 2.590 | 25.531 | n/a | n/a | 0.096 | 11.942 | 0.519 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002801 | 50.207 | 3.606 | 0.247 | 0.000 | 0.082 | 1.336 | 39.264 | 0.025 | n/a | 0.102 | 5.506 | n/a | n/a | 0.038 | 3.935 | 0.078 | 0.038 | gw-w/thread-44/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002816 | 36.477 | 8.335 | 0.033 | 0.000 | 0.134 | 2.529 | 8.001 | 0.052 | n/a | 0.413 | 16.939 | n/a | n/a | 0.040 | 8.503 | 0.233 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027ad | 33.449 | 5.476 | 0.014 | 0.000 | 0.423 | 0.686 | 0.971 | 0.029 | n/a | 0.259 | 25.531 | n/a | n/a | 0.061 | 5.913 | 0.177 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027c9 | 31.155 | 3.835 | 0.321 | 0.000 | 0.051 | 1.185 | 17.217 | 0.028 | n/a | 0.293 | 8.183 | n/a | n/a | 0.042 | 4.206 | 0.135 | 0.042 | gw-w/thread-47/gateway.admitted-work | none observed |
| 74b83bb6072e7928000000000000280f | 31.145 | 3.945 | 0.010 | 0.000 | 0.382 | 0.654 | 21.522 | 0.035 | n/a | 0.110 | 4.401 | n/a | n/a | 0.085 | 4.337 | 0.139 | 0.085 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 74b83bb6072e79280000000000002799 | 30.804 | 3.739 | 1.961 | 0.000 | 0.047 | 1.287 | 11.681 | 0.028 | n/a | 0.123 | 11.910 | n/a | n/a | 0.029 | 5.747 | 0.187 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027a7 | 30.617 | 11.524 | 0.306 | 0.000 | 0.112 | 1.001 | 4.800 | 0.028 | n/a | 0.146 | 12.607 | n/a | n/a | 0.092 | 11.942 | 0.390 | 0.092 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000278f | 29.779 | 3.381 | 0.017 | 0.000 | 0.739 | 3.449 | 0.835 | 0.036 | n/a | 0.145 | 21.141 | n/a | n/a | 0.036 | 4.137 | 0.139 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.297ms |
| 74b83bb6072e792800000000000027af | 29.010 | 3.983 | 0.198 | 0.000 | 0.045 | 1.282 | 9.258 | 0.028 | n/a | 0.141 | 14.038 | n/a | n/a | 0.035 | 4.227 | 0.146 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027c1 | 28.082 | 4.130 | 0.219 | 0.000 | 0.060 | 1.373 | 6.063 | 0.039 | n/a | 2.590 | 13.577 | n/a | n/a | 0.033 | 4.408 | 0.157 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002790 | 27.878 | 4.432 | 0.068 | 0.000 | 0.630 | 0.313 | 1.974 | 0.013 | n/a | 0.330 | 20.095 | n/a | n/a | 0.023 | 5.130 | 0.184 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002783 | 27.327 | 4.786 | 0.014 | 0.000 | 0.432 | 0.705 | 4.619 | 0.048 | n/a | 0.174 | 16.493 | n/a | n/a | 0.056 | 5.232 | 0.191 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027cb | 25.529 | 4.408 | 0.792 | 0.000 | 0.045 | 1.481 | 6.138 | 0.027 | n/a | 0.245 | 12.361 | n/a | n/a | 0.031 | 5.245 | 0.205 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002788 | 24.715 | 3.342 | 0.285 | 0.000 | 0.093 | 1.178 | 5.681 | 0.043 | n/a | 0.475 | 13.522 | n/a | n/a | 0.096 | 3.720 | 0.151 | 0.096 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.143ms |
| 74b83bb6072e79280000000000002784 | 24.050 | 4.222 | 0.300 | 0.000 | 0.086 | 1.164 | 8.647 | 0.040 | n/a | 0.257 | 9.283 | n/a | n/a | 0.052 | 4.607 | 0.192 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.400ms |
| 74b83bb6072e79280000000000002832 | 24.004 | 2.984 | 0.185 | 0.000 | 0.045 | 1.010 | 9.586 | 0.038 | n/a | 0.172 | 9.950 | n/a | n/a | 0.033 | 3.214 | 0.134 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002813 | 23.596 | 3.854 | 0.263 | 0.000 | 0.060 | 1.405 | 8.513 | 0.060 | n/a | 0.761 | 8.643 | n/a | n/a | 0.038 | 4.176 | 0.177 | 0.038 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027a9 | 23.222 | 3.306 | 0.185 | 0.000 | 0.047 | 1.251 | 7.987 | 0.028 | n/a | 0.122 | 10.264 | n/a | n/a | 0.033 | 3.538 | 0.152 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027f3 | 22.282 | 3.321 | 0.253 | 0.000 | 0.046 | 0.940 | 6.892 | 0.025 | n/a | 0.111 | 10.649 | n/a | n/a | 0.045 | 3.619 | 0.162 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000278d | 21.907 | 3.777 | 0.007 | 0.000 | 0.955 | 0.611 | 1.198 | 0.075 | n/a | 0.447 | 14.780 | n/a | n/a | 0.058 | 4.739 | 0.216 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (34 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.835 | 0.657 | 0.000 | 1.655 | 3.369 | 0.009 | 0.000 | 0.680 | 0.611 | 1.015 | 0.029 | n/a | 0.193 | 7.979 | n/a | n/a | 0.038 | 4.084 | 0.273 | 0.038 |
| p99 | 36.477 | 2.038 | 0.006 | 3.246 | 8.335 | 0.068 | 0.000 | 1.158 | 3.449 | 21.522 | 0.075 | n/a | 0.667 | 25.531 | n/a | n/a | 0.085 | 8.503 | 0.466 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002816 | 36.477 | 8.335 | 0.033 | 0.000 | 0.134 | 2.529 | 8.001 | 0.052 | n/a | 0.413 | 16.939 | n/a | n/a | 0.040 | 8.503 | 0.233 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027ad | 33.449 | 5.476 | 0.014 | 0.000 | 0.423 | 0.686 | 0.971 | 0.029 | n/a | 0.259 | 25.531 | n/a | n/a | 0.061 | 5.913 | 0.177 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000280f | 31.145 | 3.945 | 0.010 | 0.000 | 0.382 | 0.654 | 21.522 | 0.035 | n/a | 0.110 | 4.401 | n/a | n/a | 0.085 | 4.337 | 0.139 | 0.085 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 74b83bb6072e7928000000000000278f | 29.779 | 3.381 | 0.017 | 0.000 | 0.739 | 3.449 | 0.835 | 0.036 | n/a | 0.145 | 21.141 | n/a | n/a | 0.036 | 4.137 | 0.139 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.297ms |
| 74b83bb6072e79280000000000002790 | 27.878 | 4.432 | 0.068 | 0.000 | 0.630 | 0.313 | 1.974 | 0.013 | n/a | 0.330 | 20.095 | n/a | n/a | 0.023 | 5.130 | 0.184 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002783 | 27.327 | 4.786 | 0.014 | 0.000 | 0.432 | 0.705 | 4.619 | 0.048 | n/a | 0.174 | 16.493 | n/a | n/a | 0.056 | 5.232 | 0.191 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000278d | 21.907 | 3.777 | 0.007 | 0.000 | 0.955 | 0.611 | 1.198 | 0.075 | n/a | 0.447 | 14.780 | n/a | n/a | 0.058 | 4.739 | 0.216 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002787 | 19.838 | 3.981 | 0.013 | 0.000 | 1.030 | 0.508 | 0.731 | 0.043 | n/a | 0.103 | 13.379 | n/a | n/a | 0.052 | 5.023 | 0.253 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027c7 | 19.337 | 4.158 | 0.009 | 0.000 | 1.058 | 0.825 | 1.329 | 0.039 | n/a | 0.188 | 11.665 | n/a | n/a | 0.066 | 5.225 | 0.270 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027a1 | 17.758 | 3.361 | 0.009 | 0.000 | 0.715 | 0.568 | 0.883 | 0.025 | n/a | 0.178 | 11.982 | n/a | n/a | 0.037 | 4.084 | 0.230 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000278b | 17.360 | 2.848 | 0.008 | 0.000 | 0.978 | 0.968 | 1.859 | 0.020 | n/a | 0.086 | 10.561 | n/a | n/a | 0.032 | 3.833 | 0.221 | 0.032 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027bb | 16.378 | 2.988 | 0.009 | 0.000 | 1.023 | 1.048 | 1.015 | 0.030 | n/a | 0.135 | 10.088 | n/a | n/a | 0.042 | 4.020 | 0.245 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027ff | 15.700 | 6.126 | 0.032 | 0.000 | 1.158 | 0.753 | 1.185 | 0.047 | n/a | 0.296 | 6.057 | n/a | n/a | 0.046 | 7.317 | 0.466 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002823 | 15.315 | 3.373 | 0.010 | 0.000 | 1.044 | 0.546 | 0.893 | 0.027 | n/a | 0.305 | 9.080 | n/a | n/a | 0.038 | 4.427 | 0.289 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027f1 | 15.188 | 2.456 | 0.007 | 0.000 | 0.468 | 0.624 | 0.767 | 0.023 | n/a | 0.239 | 10.573 | n/a | n/a | 0.032 | 2.930 | 0.193 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027ef | 15.136 | 3.104 | 0.009 | 0.000 | 0.262 | 0.706 | 1.407 | 0.050 | n/a | 0.207 | 9.352 | n/a | n/a | 0.039 | 3.375 | 0.223 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002803 | 15.024 | 5.793 | 0.016 | 0.000 | 0.541 | 1.128 | 2.706 | 0.052 | n/a | 0.218 | 4.510 | n/a | n/a | 0.060 | 6.350 | 0.423 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027c3 | 14.835 | 3.376 | 0.008 | 0.000 | 0.618 | 0.586 | 0.895 | 0.022 | n/a | 0.105 | 9.191 | n/a | n/a | 0.032 | 4.003 | 0.270 | 0.032 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000027d9 | 14.723 | 3.631 | 0.009 | 0.000 | 1.042 | 0.521 | 0.791 | 0.026 | n/a | 0.243 | 8.427 | n/a | n/a | 0.035 | 4.681 | 0.318 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002811 | 14.208 | 3.833 | 0.009 | 0.000 | 0.492 | 0.725 | 1.250 | 0.039 | n/a | 0.667 | 7.142 | n/a | n/a | 0.052 | 4.333 | 0.305 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.535 | 0.410 | 0.000 | 1.320 | 3.660 | 0.013 | 0.000 | 0.193 | 0.787 | 1.503 | 0.029 | n/a | 0.145 | 6.891 | n/a | n/a | 0.040 | 4.268 | 0.306 | 0.040 |
| p99 | 29.093 | 2.758 | 0.010 | 4.160 | 8.485 | 3.462 | 0.000 | 1.302 | 3.002 | 9.390 | 0.079 | n/a | 0.778 | 20.499 | n/a | n/a | 0.076 | 8.918 | 0.478 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000028e8 | 39.751 | 4.340 | 0.204 | 0.000 | 0.047 | 0.811 | 3.031 | 0.026 | n/a | 0.320 | 30.933 | n/a | n/a | 0.040 | 4.591 | 0.116 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002854 | 29.093 | 7.161 | 0.018 | 0.000 | 0.404 | 0.607 | 1.729 | 0.028 | n/a | 0.306 | 18.799 | n/a | n/a | 0.042 | 7.583 | 0.261 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028be | 28.568 | 12.596 | 0.009 | 0.000 | 0.978 | 0.756 | 1.885 | 0.049 | n/a | 0.216 | 12.048 | n/a | n/a | 0.031 | 13.583 | 0.475 | 0.031 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028f4 | 27.428 | 3.267 | 3.462 | 0.000 | 0.086 | 1.146 | 9.505 | 0.075 | n/a | 0.164 | 9.689 | n/a | n/a | 0.035 | 6.815 | 0.248 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028ea | 27.321 | 3.904 | 0.012 | 0.000 | 1.056 | 0.540 | 0.923 | 0.023 | n/a | 0.305 | 20.499 | n/a | n/a | 0.060 | 4.972 | 0.182 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028ee | 26.718 | 4.139 | 0.008 | 0.000 | 0.369 | 0.649 | 2.778 | 0.041 | n/a | 0.638 | 18.055 | n/a | n/a | 0.040 | 4.516 | 0.169 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002881 | 25.689 | 3.294 | 0.247 | 0.000 | 0.049 | 1.206 | 7.226 | 0.046 | n/a | 0.110 | 13.463 | n/a | n/a | 0.048 | 3.591 | 0.140 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002905 | 23.798 | 3.330 | 0.210 | 0.000 | 0.094 | 1.114 | 4.411 | 0.033 | n/a | 0.185 | 14.382 | n/a | n/a | 0.038 | 3.635 | 0.153 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002871 | 23.786 | 3.273 | 0.320 | 0.000 | 0.053 | 1.096 | 5.551 | 0.043 | n/a | 0.219 | 13.157 | n/a | n/a | 0.075 | 3.646 | 0.153 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002836 | 23.125 | 3.454 | 0.287 | 0.000 | 0.089 | 1.183 | 4.213 | 0.054 | n/a | 0.449 | 13.346 | n/a | n/a | 0.051 | 3.830 | 0.166 | 0.051 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000285e | 22.579 | 3.278 | 0.256 | 0.000 | 0.059 | 1.244 | 8.114 | 0.045 | n/a | 0.218 | 9.329 | n/a | n/a | 0.036 | 3.593 | 0.159 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002844 | 22.540 | 5.194 | 0.011 | 0.000 | 1.100 | 0.743 | 1.325 | 0.031 | n/a | 0.133 | 13.967 | n/a | n/a | 0.036 | 6.306 | 0.280 | 0.036 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028f0 | 22.143 | 3.014 | 0.189 | 0.000 | 0.047 | 1.212 | 4.645 | 0.033 | n/a | 0.159 | 12.811 | n/a | n/a | 0.032 | 3.251 | 0.147 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002900 | 21.857 | 3.045 | 0.006 | 0.000 | 1.052 | 0.370 | 0.774 | 0.023 | n/a | 0.086 | 16.469 | n/a | n/a | 0.031 | 4.103 | 0.188 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028f9 | 21.598 | 3.235 | 0.175 | 0.000 | 0.038 | 1.056 | 6.758 | 0.030 | n/a | 0.290 | 9.976 | n/a | n/a | 0.041 | 3.447 | 0.160 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028ba | 21.560 | 5.074 | 0.010 | 0.000 | 0.997 | 4.554 | 8.081 | 0.075 | n/a | 0.363 | 2.362 | n/a | n/a | 0.044 | 6.081 | 0.282 | 0.044 | gw-w/thread-42/storage/begin-command! | none observed |
| 74b83bb6072e79280000000000002852 | 20.946 | 4.335 | 0.621 | 0.000 | 0.058 | 1.380 | 5.046 | 0.079 | n/a | 0.351 | 9.022 | n/a | n/a | 0.055 | 5.014 | 0.239 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028ec | 20.630 | 3.270 | 0.293 | 0.000 | 0.045 | 1.170 | 4.074 | 0.061 | n/a | 0.694 | 10.990 | n/a | n/a | 0.033 | 3.609 | 0.175 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002879 | 20.397 | 3.925 | 0.243 | 0.000 | 0.049 | 1.082 | 4.923 | 0.024 | n/a | 0.122 | 9.974 | n/a | n/a | 0.055 | 4.217 | 0.207 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002877 | 20.316 | 3.638 | 0.231 | 0.000 | 0.077 | 1.071 | 6.877 | 0.045 | n/a | 0.176 | 8.156 | n/a | n/a | 0.045 | 3.946 | 0.194 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.392 | 0.439 | 0.000 | 1.689 | 3.477 | 0.008 | 0.000 | 0.427 | 0.599 | 0.911 | 0.025 | n/a | 0.155 | 5.045 | n/a | n/a | 0.038 | 3.900 | 0.352 | 0.038 |
| p99 | 27.321 | 1.797 | 0.010 | 4.160 | 5.858 | n/a | 0.000 | 1.281 | 4.554 | 8.081 | 0.106 | n/a | 0.476 | 20.499 | n/a | n/a | 0.080 | 6.150 | 0.542 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e792800000000000028ea | 27.321 | 3.904 | 0.012 | 0.000 | 1.056 | 0.540 | 0.923 | 0.023 | n/a | 0.305 | 20.499 | n/a | n/a | 0.060 | 4.972 | 0.182 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002900 | 21.857 | 3.045 | 0.006 | 0.000 | 1.052 | 0.370 | 0.774 | 0.023 | n/a | 0.086 | 16.469 | n/a | n/a | 0.031 | 4.103 | 0.188 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028ba | 21.560 | 5.074 | 0.010 | 0.000 | 0.997 | 4.554 | 8.081 | 0.075 | n/a | 0.363 | 2.362 | n/a | n/a | 0.044 | 6.081 | 0.282 | 0.044 | gw-w/thread-42/storage/begin-command! | none observed |
| 74b83bb6072e7928000000000000285a | 18.370 | 4.549 | 0.008 | 0.000 | 0.856 | 1.086 | 4.804 | 0.040 | n/a | 0.173 | 6.797 | n/a | n/a | 0.057 | 5.412 | 0.295 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028ce | 17.365 | 5.858 | 0.009 | 0.000 | 0.283 | 0.536 | 0.922 | 0.029 | n/a | 0.109 | 9.584 | n/a | n/a | 0.036 | 6.150 | 0.354 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028f2 | 16.076 | 3.535 | 0.009 | 0.000 | 0.219 | 0.823 | 1.685 | 0.076 | n/a | 0.251 | 9.406 | n/a | n/a | 0.072 | 3.763 | 0.234 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002903 | 15.847 | 3.660 | 0.008 | 0.000 | 0.230 | 0.556 | 0.889 | 0.025 | n/a | 0.120 | 10.306 | n/a | n/a | 0.053 | 3.899 | 0.246 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000286f | 14.070 | 3.539 | 0.009 | 0.000 | 0.822 | 1.019 | 1.490 | 0.046 | n/a | 0.207 | 6.891 | n/a | n/a | 0.049 | 4.370 | 0.311 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000288d | 13.583 | 4.335 | 0.012 | 0.000 | 0.427 | 0.760 | 1.263 | 0.050 | n/a | 0.476 | 6.205 | n/a | n/a | 0.055 | 4.775 | 0.352 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002834 | 13.423 | 3.201 | 0.009 | 0.000 | 0.143 | 0.750 | 1.420 | 0.046 | n/a | 0.170 | 7.634 | n/a | n/a | 0.051 | 3.353 | 0.250 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000287f | 13.145 | 3.697 | 0.009 | 0.000 | 0.159 | 0.558 | 0.915 | 0.027 | n/a | 0.095 | 7.652 | n/a | n/a | 0.033 | 3.865 | 0.294 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028e2 | 12.957 | 2.350 | 0.007 | 0.000 | 0.193 | 0.458 | 0.911 | 0.024 | n/a | 0.106 | 8.875 | n/a | n/a | 0.035 | 2.550 | 0.197 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028d6 | 12.700 | 5.665 | 0.009 | 0.000 | 0.084 | 0.793 | 0.884 | 0.029 | n/a | 0.135 | 5.052 | n/a | n/a | 0.050 | 5.758 | 0.453 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028af | 12.234 | 2.857 | 0.007 | 0.000 | 1.032 | 0.468 | 1.012 | 0.025 | n/a | 0.257 | 6.543 | n/a | n/a | 0.033 | 3.896 | 0.318 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002889 | 12.058 | 3.496 | 0.008 | 0.000 | 0.932 | 0.738 | 1.478 | 0.045 | n/a | 0.236 | 5.045 | n/a | n/a | 0.080 | 4.436 | 0.368 | 0.080 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028e0 | 11.779 | 3.188 | 0.007 | 0.000 | 0.547 | 0.432 | 0.809 | 0.023 | n/a | 0.273 | 6.470 | n/a | n/a | 0.031 | 3.741 | 0.318 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028d9 | 11.659 | 3.748 | 0.008 | 0.000 | 0.703 | 0.379 | 0.780 | 0.024 | n/a | 0.095 | 5.881 | n/a | n/a | 0.042 | 4.459 | 0.382 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002891 | 11.558 | 3.532 | 0.009 | 0.000 | 0.683 | 0.727 | 1.457 | 0.038 | n/a | 0.155 | 4.920 | n/a | n/a | 0.037 | 4.224 | 0.365 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000028b7 | 11.392 | 3.316 | 0.008 | 0.000 | 0.075 | 0.599 | 1.588 | 0.106 | n/a | 0.427 | 5.241 | n/a | n/a | 0.032 | 3.399 | 0.298 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000287b | 11.296 | 3.085 | 0.008 | 0.000 | 0.885 | 0.690 | 1.445 | 0.038 | n/a | 0.169 | 4.945 | n/a | n/a | 0.033 | 3.978 | 0.352 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.750 | 0.391 | 0.000 | 0.799 | 3.867 | 0.157 | 0.000 | 0.088 | 0.825 | 2.120 | 0.034 | n/a | 0.223 | 8.618 | n/a | n/a | 0.046 | 4.264 | 0.240 | 0.046 |
| p99 | 80.419 | 3.106 | 3.186 | 5.033 | 37.098 | 0.830 | 0.000 | 1.057 | 1.840 | 17.071 | 0.345 | n/a | 1.084 | 32.048 | n/a | n/a | 0.112 | 37.537 | 0.587 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000292b | 80.419 | 37.098 | 0.356 | 0.000 | 0.082 | 1.757 | 17.071 | 0.078 | n/a | 0.572 | 23.351 | n/a | n/a | 0.053 | 37.537 | 0.467 | 0.053 | node-14/thread-5/client.persist-and-resolve | none observed |
| 74b83bb6072e79280000000000002929 | 46.414 | 8.392 | 0.010 | 0.000 | 0.763 | 0.678 | 3.701 | 0.049 | n/a | 0.659 | 32.048 | n/a | n/a | 0.112 | 9.166 | 0.197 | 0.112 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000297a | 40.385 | 4.491 | 0.009 | 0.000 | 0.912 | 0.825 | 1.896 | 0.026 | n/a | 0.437 | 31.752 | n/a | n/a | 0.037 | 5.412 | 0.134 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000295e | 30.753 | 4.515 | 0.178 | 0.000 | 0.044 | 1.353 | 7.970 | 0.042 | n/a | 0.114 | 16.482 | n/a | n/a | 0.054 | 4.737 | 0.154 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002976 | 30.307 | 4.464 | 0.254 | 0.000 | 0.052 | 1.495 | 9.905 | 0.027 | n/a | 0.350 | 13.721 | n/a | n/a | 0.038 | 4.770 | 0.157 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000290f | 29.738 | 7.446 | 0.009 | 0.000 | 0.838 | 1.042 | 3.457 | 0.345 | n/a | 0.346 | 16.192 | n/a | n/a | 0.064 | 8.292 | 0.279 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e792800000000000029ac | 27.701 | 4.459 | 0.243 | 0.000 | 0.054 | 1.651 | 6.073 | 0.082 | n/a | 0.208 | 14.892 | n/a | n/a | 0.039 | 4.757 | 0.172 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002988 | 27.692 | 4.355 | 0.191 | 0.000 | 0.050 | 1.414 | 5.046 | 0.034 | n/a | 0.107 | 16.462 | n/a | n/a | 0.033 | 4.596 | 0.166 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000294f | 27.624 | 4.985 | 0.325 | 0.000 | 0.101 | 1.468 | 9.600 | 0.102 | n/a | 0.223 | 10.732 | n/a | n/a | 0.089 | 5.410 | 0.196 | 0.089 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000294b | 26.478 | 3.433 | 0.214 | 0.000 | 0.094 | 1.314 | 11.558 | 0.040 | n/a | 0.157 | 9.616 | n/a | n/a | 0.053 | 3.741 | 0.141 | 0.053 | gw-w/thread-45/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002953 | 25.914 | 5.040 | 0.188 | 0.000 | 0.049 | 1.469 | 10.101 | 0.036 | n/a | 0.360 | 8.618 | n/a | n/a | 0.052 | 5.277 | 0.204 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002907 | 25.699 | 6.872 | 0.019 | 0.000 | 0.350 | 0.778 | 1.136 | 0.027 | n/a | 0.121 | 16.339 | n/a | n/a | 0.058 | 7.241 | 0.282 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002947 | 25.645 | 2.943 | 0.182 | 0.000 | 0.043 | 0.824 | 4.574 | 0.042 | n/a | 0.185 | 16.815 | n/a | n/a | 0.038 | 3.168 | 0.124 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002915 | 25.606 | 3.256 | 0.288 | 0.000 | 0.051 | 1.213 | 6.659 | 0.054 | n/a | 0.234 | 13.811 | n/a | n/a | 0.039 | 3.596 | 0.140 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000296a | 25.046 | 3.886 | 0.010 | 0.000 | 0.710 | 0.672 | 1.698 | 0.044 | n/a | 0.274 | 17.697 | n/a | n/a | 0.054 | 4.606 | 0.184 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002909 | 24.430 | 3.460 | 0.268 | 0.000 | 0.086 | 1.094 | 7.476 | 0.036 | n/a | 0.149 | 11.805 | n/a | n/a | 0.056 | 3.813 | 0.156 | 0.056 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002911 | 23.212 | 3.922 | 0.256 | 0.000 | 0.065 | 1.050 | 7.049 | 0.036 | n/a | 0.111 | 10.661 | n/a | n/a | 0.062 | 4.243 | 0.183 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000292f | 22.654 | 4.295 | 0.274 | 0.000 | 0.058 | 1.413 | 4.423 | 0.054 | n/a | 0.732 | 11.368 | n/a | n/a | 0.036 | 4.627 | 0.204 | 0.036 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000299a | 22.544 | 3.213 | 0.166 | 0.000 | 0.040 | 0.914 | 3.268 | 0.024 | n/a | 0.109 | 14.771 | n/a | n/a | 0.038 | 3.419 | 0.152 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002980 | 22.514 | 5.105 | 0.224 | 0.000 | 0.071 | 1.251 | 5.690 | 0.032 | n/a | 0.160 | 9.910 | n/a | n/a | 0.070 | 5.400 | 0.240 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit / 5-10 facts (24 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.551 | 0.933 | 0.000 | 1.678 | 3.488 | 0.009 | 0.000 | 0.587 | 0.588 | 1.279 | 0.030 | n/a | 0.214 | 5.874 | n/a | n/a | 0.041 | 4.060 | 0.360 | 0.041 |
| p99 | 25.046 | 2.080 | 3.186 | 5.033 | 8.049 | 0.018 | 0.000 | 1.057 | 1.625 | 4.015 | 0.102 | n/a | 0.696 | 17.697 | n/a | n/a | 0.099 | 8.760 | 0.587 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e7928000000000000296a | 25.046 | 3.886 | 0.010 | 0.000 | 0.710 | 0.672 | 1.698 | 0.044 | n/a | 0.274 | 17.697 | n/a | n/a | 0.054 | 4.606 | 0.184 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002981 | 18.179 | 4.397 | 0.015 | 0.000 | 0.632 | 1.625 | 0.884 | 0.023 | n/a | 0.277 | 10.272 | n/a | n/a | 0.056 | 5.043 | 0.277 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002955 | 17.572 | 6.686 | 0.007 | 0.000 | 0.994 | 0.702 | 1.511 | 0.035 | n/a | 0.174 | 7.385 | n/a | n/a | 0.077 | 7.687 | 0.437 | 0.077 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002935 | 16.783 | 3.171 | 0.007 | 0.000 | 0.911 | 0.556 | 1.649 | 0.031 | n/a | 0.396 | 10.031 | n/a | n/a | 0.031 | 4.089 | 0.244 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002933 | 16.323 | 2.856 | 0.008 | 0.000 | 1.057 | 0.616 | 1.655 | 0.054 | n/a | 0.696 | 9.344 | n/a | n/a | 0.037 | 3.922 | 0.240 | 0.037 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002966 | 15.558 | 3.217 | 0.008 | 0.000 | 0.474 | 0.607 | 1.621 | 0.044 | n/a | 0.183 | 9.365 | n/a | n/a | 0.040 | 3.698 | 0.238 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000293d | 15.461 | 4.252 | 0.007 | 0.000 | 1.015 | 0.547 | 2.395 | 0.021 | n/a | 0.109 | 7.054 | n/a | n/a | 0.061 | 5.274 | 0.341 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002994 | 14.931 | 8.049 | 0.014 | 0.000 | 0.697 | 0.588 | 0.918 | 0.024 | n/a | 0.104 | 4.474 | n/a | n/a | 0.062 | 8.760 | 0.587 | 0.062 | node-14/thread-0/driver.publication | none observed |
| 74b83bb6072e7928000000000000291b | 14.832 | 4.092 | 0.015 | 0.000 | 0.510 | 1.066 | 1.987 | 0.040 | n/a | 0.686 | 6.403 | n/a | n/a | 0.033 | 4.616 | 0.311 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000294d | 14.294 | 4.645 | 0.014 | 0.000 | 0.515 | 0.746 | 1.818 | 0.047 | n/a | 0.535 | 5.874 | n/a | n/a | 0.099 | 5.174 | 0.362 | 0.099 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002964 | 14.178 | 3.178 | 0.010 | 0.000 | 0.587 | 0.414 | 1.325 | 0.071 | n/a | 0.214 | 8.348 | n/a | n/a | 0.032 | 3.775 | 0.266 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000299e | 13.750 | 2.836 | 0.008 | 0.000 | 1.049 | 0.513 | 0.762 | 0.023 | n/a | 0.099 | 8.421 | n/a | n/a | 0.038 | 3.893 | 0.283 | 0.038 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002986 | 13.551 | 2.715 | 0.009 | 0.000 | 0.408 | 0.579 | 1.344 | 0.057 | n/a | 0.238 | 8.154 | n/a | n/a | 0.047 | 3.132 | 0.231 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002951 | 13.253 | 4.723 | 0.011 | 0.000 | 0.402 | 0.720 | 1.244 | 0.030 | n/a | 0.138 | 5.928 | n/a | n/a | 0.057 | 5.136 | 0.388 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000290b | 12.855 | 4.784 | 0.009 | 0.000 | 0.088 | 0.623 | 1.279 | 0.102 | n/a | 0.215 | 5.684 | n/a | n/a | 0.073 | 4.881 | 0.380 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e7928000000000000295b | 12.485 | 3.867 | 0.007 | 0.000 | 0.940 | 1.061 | 4.015 | 0.046 | n/a | 0.164 | 2.338 | n/a | n/a | 0.046 | 4.815 | 0.386 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002949 | 11.273 | 3.085 | 0.009 | 0.000 | 0.964 | 0.317 | 1.413 | 0.032 | n/a | 0.398 | 5.028 | n/a | n/a | 0.028 | 4.058 | 0.360 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002977 | 11.164 | 3.759 | 0.014 | 0.000 | 0.287 | 0.583 | 1.112 | 0.028 | n/a | 0.363 | 4.970 | n/a | n/a | 0.047 | 4.060 | 0.364 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002989 | 10.151 | 3.256 | 0.018 | 0.000 | 0.560 | 0.502 | 0.845 | 0.025 | n/a | 0.095 | 4.810 | n/a | n/a | 0.040 | 3.833 | 0.378 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 74b83bb6072e79280000000000002990 | 10.023 | 4.424 | 0.014 | 0.000 | 0.432 | 0.610 | 0.814 | 0.022 | n/a | 0.266 | 3.385 | n/a | n/a | 0.057 | 4.870 | 0.486 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3761 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.050 | 0.660 | 0.000 | 1.572 | 3.553 | 0.005 | 0.000 | 0.709 | 0.646 | 1.047 | 0.020 | n/a | 0.153 | 5.925 | n/a | n/a | 0.028 | 4.480 | 0.349 | 0.028 |
| p99 | 66.398 | 3.073 | 3.088 | 6.127 | 12.619 | 1.021 | 0.000 | 17.844 | 14.073 | 9.596 | 2.923 | n/a | 2.674 | 38.613 | n/a | n/a | 0.084 | 24.232 | 0.711 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000003078 | 136.347 | 4.031 | 0.006 | 0.000 | 104.809 | 15.796 | 4.519 | 0.047 | n/a | 0.186 | 6.892 | n/a | n/a | 0.062 | 108.846 | 0.798 | 0.062 | node-14/thread-0/driver.queue.subject | driver.publication 19.841ms; driver.publication 8.983ms; driver.publication 6.871ms; driver.publication 5.156ms; driver.publication 4.991ms |
| 74b83bb6072e79280000000000002b19 | 133.387 | 14.584 | 0.012 | 0.000 | 0.937 | 104.413 | 1.475 | 0.045 | n/a | 0.198 | 11.678 | n/a | n/a | 0.044 | 15.534 | 0.116 | 0.044 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.654ms |
| 74b83bb6072e79280000000000002b1b | 125.764 | 3.698 | 0.039 | 0.000 | 5.122 | 108.301 | 3.375 | 0.048 | n/a | 0.137 | 5.026 | n/a | n/a | 0.019 | 8.859 | 0.070 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.040ms; driver.publication 1.654ms |
| 74b83bb6072e79280000000000002eab | 122.805 | 11.363 | 0.010 | 0.000 | 82.221 | 1.489 | 1.710 | 0.029 | n/a | 4.225 | 21.729 | n/a | n/a | 0.029 | 93.594 | 0.762 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 4.881ms; driver.publication 1.787ms; driver.publication 1.523ms; driver.publication 1.439ms; driver.publication 1.279ms |
| 74b83bb6072e79280000000000003075 | 116.883 | 11.685 | 0.013 | 0.000 | 37.317 | 23.399 | 6.867 | 0.089 | n/a | 0.374 | 37.103 | n/a | n/a | 0.037 | 49.015 | 0.419 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 26.524ms; driver.publication 8.983ms; driver.publication 6.871ms; driver.publication 5.156ms; driver.publication 4.991ms |
| 74b83bb6072e79280000000000002daa | 113.539 | 17.629 | 0.013 | 0.000 | 1.091 | 42.320 | 38.564 | 0.052 | n/a | 0.218 | 13.598 | n/a | n/a | 0.054 | 18.733 | 0.165 | 0.054 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.533ms; driver.publication 1.369ms; driver.publication 1.032ms |
| 74b83bb6072e79280000000000002ea7 | 106.558 | 7.909 | 0.008 | 0.000 | 54.106 | 3.054 | 1.447 | 0.022 | n/a | 1.147 | 38.831 | n/a | n/a | 0.032 | 62.023 | 0.582 | 0.032 | node-14/thread-0/driver.queue.subject | driver.publication 1.523ms; driver.publication 1.439ms; driver.publication 1.279ms; driver.publication 1.204ms; driver.publication 1.179ms |
| 74b83bb6072e79280000000000004685 | 104.073 | 4.532 | 0.244 | 0.000 | 0.084 | 1.585 | 84.410 | 0.063 | n/a | 3.984 | 9.120 | n/a | n/a | 0.050 | 4.860 | 0.047 | 0.050 | gw-w/thread-42/gateway.admitted-work | none observed |
| 74b83bb6072e79280000000000002b1f | 101.878 | 10.344 | 0.016 | 0.000 | 48.507 | 23.026 | 3.870 | 0.055 | n/a | 0.200 | 15.829 | n/a | n/a | 0.032 | 58.867 | 0.578 | 0.032 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 3.040ms; driver.publication 2.810ms; driver.publication 1.318ms |
| 74b83bb6072e79280000000000003d0e | 95.397 | 8.140 | 4.669 | 0.000 | 0.013 | 2.234 | 11.917 | 0.042 | n/a | 1.629 | 66.702 | n/a | n/a | 0.052 | 12.822 | 0.134 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.905ms; driver.publication 1.659ms; driver.expected-state.bind-receipt 1.576ms; driver.publication 1.427ms; driver.publication 1.169ms |
| 74b83bb6072e79280000000000002ea6 | 89.748 | 2.855 | 0.005 | 0.000 | 4.694 | 0.524 | 0.701 | 2.953 | n/a | 0.023 | 77.968 | n/a | n/a | 0.026 | 7.553 | 0.084 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.279ms; driver.publication 1.204ms; driver.publication 1.179ms; driver.publication 1.135ms |
| 74b83bb6072e79280000000000004006 | 89.600 | 11.662 | 0.009 | 0.000 | 18.648 | 1.505 | 4.533 | 0.051 | n/a | 0.337 | 52.802 | n/a | n/a | 0.052 | 30.320 | 0.338 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 5.514ms; driver.publication 3.428ms; driver.publication 1.950ms; driver.publication 1.384ms; driver.publication 1.245ms |
| 74b83bb6072e79280000000000002ea5 | 89.193 | 7.516 | 0.082 | 0.000 | 0.362 | 1.255 | 0.788 | 3.770 | n/a | 0.100 | 75.306 | n/a | n/a | 0.015 | 7.960 | 0.089 | 0.015 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | driver.publication 1.279ms; driver.publication 1.204ms; driver.publication 1.179ms |
| 74b83bb6072e79280000000000003fff | 87.984 | 4.373 | 0.005 | 0.000 | 35.188 | 5.092 | 1.415 | 0.016 | n/a | 1.195 | 40.642 | n/a | n/a | 0.059 | 39.566 | 0.450 | 0.059 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | driver.publication 5.514ms; driver.publication 1.459ms; driver.publication 1.384ms; driver.publication 1.329ms; driver.expected-state.bind-receipt 1.190ms |
| 74b83bb6072e79280000000000002ea8 | 87.798 | 5.053 | 0.006 | 0.000 | 0.451 | 5.419 | 1.210 | 0.028 | n/a | 4.432 | 71.131 | n/a | n/a | 0.067 | 5.511 | 0.063 | 0.067 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 1.279ms; driver.publication 1.204ms; driver.publication 1.179ms; driver.publication 1.135ms |
| 74b83bb6072e79280000000000002ea9 | 86.816 | 3.343 | 0.005 | 0.000 | 14.491 | 3.029 | 1.275 | 0.023 | n/a | 1.505 | 63.122 | n/a | n/a | 0.021 | 17.839 | 0.205 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.439ms; driver.publication 1.279ms; driver.publication 1.204ms; driver.publication 1.179ms; driver.publication 1.135ms |
| 74b83bb6072e79280000000000003d1c | 86.667 | 3.601 | 0.004 | 0.000 | 75.778 | 0.990 | 0.962 | 0.012 | n/a | 0.080 | 5.205 | n/a | n/a | 0.035 | 79.383 | 0.916 | 0.035 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.997ms; driver.publication 1.905ms; driver.publication 1.427ms; driver.publication 1.363ms; driver.expected-state.bind-receipt 1.205ms |
| 74b83bb6072e79280000000000003d18 | 85.657 | 4.863 | 0.006 | 0.000 | 70.178 | 0.425 | 2.596 | 0.021 | n/a | 0.093 | 7.446 | n/a | n/a | 0.029 | 75.048 | 0.876 | 0.029 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.997ms; driver.publication 1.905ms; driver.publication 1.427ms; driver.publication 1.363ms; driver.expected-state.bind-receipt 1.205ms |
| 74b83bb6072e79280000000000004005 | 84.807 | 5.800 | 0.007 | 0.000 | 0.206 | 2.940 | 0.976 | 0.559 | n/a | 0.225 | 74.040 | n/a | n/a | 0.053 | 6.013 | 0.071 | 0.053 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 5.514ms; driver.publication 3.428ms; driver.publication 1.384ms; driver.publication 1.245ms; driver.expected-state.bind-receipt 1.190ms |
| 74b83bb6072e79280000000000002be7 | 82.660 | 3.018 | 0.004 | 0.000 | 55.993 | 2.787 | 1.079 | 0.038 | n/a | 0.388 | 19.333 | n/a | n/a | 0.020 | 59.015 | 0.714 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication 1.230ms; driver.publication 1.213ms; driver.publication 1.060ms |

## P2 / tail / commit / 5-10 facts (2159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.399 | 0.581 | 0.000 | 1.458 | 3.107 | 0.005 | 0.000 | 0.752 | 0.608 | 0.857 | 0.019 | n/a | 0.146 | 5.230 | n/a | n/a | 0.027 | 4.047 | 0.346 | 0.027 |
| p99 | 61.919 | 2.293 | 3.048 | 5.510 | 10.563 | 0.151 | 0.000 | 19.352 | 13.542 | 8.703 | 3.053 | n/a | 2.418 | 38.613 | n/a | n/a | 0.084 | 24.197 | 0.714 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 74b83bb6072e79280000000000002b1b | 125.764 | 3.698 | 0.039 | 0.000 | 5.122 | 108.301 | 3.375 | 0.048 | n/a | 0.137 | 5.026 | n/a | n/a | 0.019 | 8.859 | 0.070 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.040ms; driver.publication 1.654ms |
| 74b83bb6072e79280000000000003075 | 116.883 | 11.685 | 0.013 | 0.000 | 37.317 | 23.399 | 6.867 | 0.089 | n/a | 0.374 | 37.103 | n/a | n/a | 0.037 | 49.015 | 0.419 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 26.524ms; driver.publication 8.983ms; driver.publication 6.871ms; driver.publication 5.156ms; driver.publication 4.991ms |
| 74b83bb6072e79280000000000002ea6 | 89.748 | 2.855 | 0.005 | 0.000 | 4.694 | 0.524 | 0.701 | 2.953 | n/a | 0.023 | 77.968 | n/a | n/a | 0.026 | 7.553 | 0.084 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.279ms; driver.publication 1.204ms; driver.publication 1.179ms; driver.publication 1.135ms |
| 74b83bb6072e79280000000000003fff | 87.984 | 4.373 | 0.005 | 0.000 | 35.188 | 5.092 | 1.415 | 0.016 | n/a | 1.195 | 40.642 | n/a | n/a | 0.059 | 39.566 | 0.450 | 0.059 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | driver.publication 5.514ms; driver.publication 1.459ms; driver.publication 1.384ms; driver.publication 1.329ms; driver.expected-state.bind-receipt 1.190ms |
| 74b83bb6072e79280000000000002ea9 | 86.816 | 3.343 | 0.005 | 0.000 | 14.491 | 3.029 | 1.275 | 0.023 | n/a | 1.505 | 63.122 | n/a | n/a | 0.021 | 17.839 | 0.205 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.439ms; driver.publication 1.279ms; driver.publication 1.204ms; driver.publication 1.179ms; driver.publication 1.135ms |
| 74b83bb6072e79280000000000002be7 | 82.660 | 3.018 | 0.004 | 0.000 | 55.993 | 2.787 | 1.079 | 0.038 | n/a | 0.388 | 19.333 | n/a | n/a | 0.020 | 59.015 | 0.714 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication 1.230ms; driver.publication 1.213ms; driver.publication 1.060ms |
| 74b83bb6072e79280000000000003d15 | 78.508 | 2.501 | 0.004 | 0.000 | 61.037 | 3.036 | 0.634 | 0.009 | n/a | 0.066 | 11.203 | n/a | n/a | 0.019 | 63.542 | 0.809 | 0.019 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.997ms; driver.publication 1.905ms; driver.publication 1.659ms; driver.publication 1.427ms; driver.expected-state.bind-receipt 1.205ms |
| 74b83bb6072e79280000000000002be4 | 73.886 | 3.130 | 0.006 | 0.000 | 0.443 | 0.630 | 1.375 | 0.026 | n/a | 0.263 | 67.983 | n/a | n/a | 0.031 | 3.579 | 0.048 | 0.031 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 1.305ms |
| 74b83bb6072e79280000000000003d10 | 72.703 | 2.645 | 0.005 | 0.000 | 41.246 | 1.275 | 1.503 | 0.026 | n/a | 0.926 | 25.053 | n/a | n/a | 0.024 | 43.896 | 0.604 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication 1.659ms; driver.expected-state.bind-receipt 1.576ms; driver.publication 1.146ms |
| 74b83bb6072e79280000000000003079 | 71.258 | 9.001 | 0.007 | 0.000 | 19.916 | 4.734 | 1.567 | 0.064 | n/a | 0.909 | 35.041 | n/a | n/a | 0.020 | 28.923 | 0.406 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 17.320ms; driver.publication 8.983ms; driver.publication 5.156ms; driver.publication 1.148ms |
| 74b83bb6072e79280000000000002ea0 | 69.323 | 3.543 | 0.073 | 0.000 | 3.788 | 3.144 | 0.530 | 2.915 | n/a | 0.017 | 55.297 | n/a | n/a | 0.016 | 7.404 | 0.107 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.753ms; driver.publication 2.360ms; driver.publication 1.008ms |
| 74b83bb6072e79280000000000003074 | 69.255 | 12.681 | 0.095 | 0.000 | 0.412 | 7.427 | 2.007 | 3.798 | n/a | 4.091 | 38.729 | n/a | n/a | 0.016 | 13.187 | 0.190 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 26.524ms |
| 74b83bb6072e79280000000000002be8 | 69.083 | 3.127 | 0.006 | 0.000 | 0.851 | 1.328 | 1.280 | 0.010 | n/a | 0.236 | 62.217 | n/a | n/a | 0.027 | 3.984 | 0.058 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.230ms; driver.publication 1.213ms |
| 74b83bb6072e79280000000000004001 | 68.935 | 5.546 | 0.009 | 0.000 | 6.195 | 5.880 | 2.937 | 2.236 | n/a | 0.158 | 45.938 | n/a | n/a | 0.038 | 11.749 | 0.170 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 5.514ms; driver.publication 1.459ms; driver.publication 1.329ms; driver.expected-state.bind-receipt 1.190ms |
| 74b83bb6072e79280000000000002ab9 | 68.559 | 4.232 | 0.015 | 0.000 | 0.937 | 8.427 | 20.604 | 0.042 | n/a | 0.646 | 33.617 | n/a | n/a | 0.037 | 5.184 | 0.076 | 0.037 | gw-w/thread-46/gateway.admitted-work | driver.publication 2.176ms; driver.publication 1.426ms; driver.publication 1.296ms; driver.publication 1.173ms; driver.publication 1.014ms |
| 74b83bb6072e79280000000000002ea1 | 67.149 | 5.899 | 0.010 | 0.000 | 0.069 | 1.787 | 1.123 | 0.034 | n/a | 6.327 | 51.869 | n/a | n/a | 0.031 | 5.978 | 0.089 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.753ms; driver.publication 1.204ms; driver.publication 1.008ms |
| 74b83bb6072e79280000000000002eb0 | 66.057 | 4.151 | 0.008 | 0.000 | 1.043 | 0.912 | 0.824 | 0.019 | n/a | 0.053 | 59.008 | n/a | n/a | 0.039 | 5.203 | 0.079 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.881ms; driver.publication 1.523ms; driver.publication 1.439ms; driver.publication 1.135ms |
| 74b83bb6072e79280000000000002eaf | 65.732 | 2.800 | 0.004 | 0.000 | 13.218 | 2.572 | 1.146 | 0.021 | n/a | 1.077 | 44.873 | n/a | n/a | 0.022 | 16.021 | 0.244 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 4.881ms; driver.publication 1.523ms; driver.publication 1.439ms; driver.publication 1.135ms |
| 74b83bb6072e79280000000000002e9f | 65.481 | 2.604 | 0.006 | 0.000 | 5.298 | 3.365 | 0.887 | 3.290 | n/a | 0.103 | 49.908 | n/a | n/a | 0.019 | 7.908 | 0.121 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.753ms; driver.publication 3.520ms; driver.publication 1.008ms |
| 74b83bb6072e79280000000000003f61 | 63.280 | 2.846 | 0.005 | 0.000 | 27.253 | 3.248 | 0.679 | 0.010 | n/a | 0.042 | 29.131 | n/a | n/a | 0.066 | 30.104 | 0.476 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.928ms; driver.expected-state.bind-receipt 1.726ms; driver.publication 1.254ms; driver.publication 1.248ms; driver.publication 1.045ms |

## P3 / outside-phases / read (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.243 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.581 | 200.545 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 305.837 | n/a | n/a | n/a | 68.379 | n/a | 17.962 | 0.000 | 5.256 | 260.936 | 11.418 | n/a | 0.748 | 0.000 | n/a | n/a | 0.837 | 86.341 | 0.376 | 0.837 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d6000000000000296a | 305.837 | 68.379 | n/a | 17.962 | 0.000 | 4.130 | 215.124 | 0.012 | n/a | 0.008 | 0.000 | n/a | n/a | 0.222 | 86.341 | 0.282 | 0.222 | gw-r/thread-48/gateway.admitted-work | none observed |
| f31aa36de17c4d330000000000000002 | 268.275 | 1.916 | n/a | 0.000 | 0.000 | 1.051 | 260.936 | 3.641 | n/a | 0.130 | 0.000 | n/a | n/a | 0.601 | 1.916 | 0.007 | 0.601 | gw-r/thread-44/gateway.admitted-work | none observed |
| 3b9cdcd227f9d4d60000000000000005 | 208.883 | 0.000 | n/a | 0.000 | 0.000 | 2.330 | 205.006 | 0.038 | n/a | 0.748 | 0.000 | n/a | n/a | 0.761 | 0.000 | 0.000 | 0.761 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016bb | 207.285 | 0.000 | n/a | 0.000 | 0.000 | 1.520 | 205.627 | 0.017 | n/a | 0.032 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000006 | 205.264 | 0.000 | n/a | 0.000 | 0.000 | 2.257 | 201.793 | 0.039 | n/a | 0.338 | 0.000 | n/a | n/a | 0.837 | 0.000 | 0.000 | 0.837 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000008 | 205.201 | 0.000 | n/a | 0.000 | 0.000 | 2.617 | 201.700 | 0.058 | n/a | 0.498 | 0.000 | n/a | n/a | 0.328 | 0.000 | 0.000 | 0.328 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000009 | 205.164 | 0.000 | n/a | 0.000 | 0.000 | 2.602 | 201.873 | 0.049 | n/a | 0.244 | 0.000 | n/a | n/a | 0.396 | 0.000 | 0.000 | 0.396 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001407 | 204.978 | 0.000 | n/a | 0.000 | 0.000 | 0.410 | 204.405 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000007 | 202.857 | 0.000 | n/a | 0.000 | 0.000 | 1.219 | 201.181 | 0.014 | n/a | 0.143 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000002961 | 201.618 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.740 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001402 | 201.539 | 0.000 | n/a | 0.000 | 0.000 | 0.533 | 200.803 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016b6 | 201.475 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 200.863 | 0.004 | n/a | 0.054 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016af | 201.468 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 200.660 | 0.003 | n/a | 0.040 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016b4 | 201.463 | 0.000 | n/a | 0.000 | 0.000 | 0.581 | 200.711 | 0.004 | n/a | 0.059 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001542 | 201.382 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 200.590 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001540 | 201.347 | 0.000 | n/a | 0.000 | 0.000 | 0.416 | 200.732 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016b7 | 201.342 | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 200.659 | 0.029 | n/a | 0.049 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000002962 | 201.338 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 200.530 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016b1 | 201.323 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 200.544 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001405 | 201.303 | 0.000 | n/a | 0.000 | 0.000 | 0.503 | 200.607 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |

## P3 / outside-phases / internal (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 490.999 | n/a | n/a | n/a | 3.790 | n/a | 0.000 | 0.000 | 0.479 | 485.597 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.141 | 3.790 | 0.010 | 0.141 |
| p99 | 1014.124 | n/a | n/a | n/a | 28.450 | n/a | 1.380 | 0.000 | 5.197 | 1005.895 | 3.941 | n/a | 0.971 | 0.000 | n/a | n/a | 7.708 | 29.830 | 0.788 | 7.708 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d3300000000000000a4 | 1014.124 | 0.676 | n/a | 0.000 | 0.000 | 5.197 | 1005.260 | 0.581 | n/a | 0.971 | 0.000 | n/a | n/a | 1.440 | 0.676 | 0.001 | 1.440 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000000a5 | 1007.924 | 0.358 | n/a | 0.000 | 0.000 | 1.272 | 1005.895 | 0.063 | n/a | 0.241 | 0.000 | n/a | n/a | 0.095 | 0.358 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d33000000000000200a | 1003.510 | 3.790 | n/a | 0.000 | 0.000 | 0.562 | 999.068 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.057 | 3.790 | 0.004 | 0.057 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001e39 | 1002.464 | 0.170 | n/a | 0.000 | 0.000 | 0.365 | 1000.722 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 1.144 | 0.170 | 0.000 | 1.144 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d33000000000000200c | 995.038 | 2.348 | n/a | 0.000 | 0.000 | 0.321 | 988.319 | 3.941 | n/a | 0.039 | 0.000 | n/a | n/a | 0.070 | 2.348 | 0.002 | 0.070 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d33000000000000200b | 988.174 | 3.274 | n/a | 0.000 | 0.000 | 0.305 | 984.508 | 0.012 | n/a | 0.024 | 0.000 | n/a | n/a | 0.051 | 3.274 | 0.003 | 0.051 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001e37 | 492.564 | 2.985 | n/a | 0.000 | 0.000 | 0.370 | 489.105 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.071 | 2.985 | 0.006 | 0.071 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001e36 | 490.999 | 4.707 | n/a | 0.000 | 0.000 | 0.479 | 485.597 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.181 | 4.707 | 0.010 | 0.181 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001efc | 368.604 | 6.503 | n/a | 0.000 | 0.000 | 0.880 | 361.052 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.128 | 6.503 | 0.018 | 0.128 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000000a6 | 359.734 | 23.814 | n/a | 0.000 | 0.000 | 1.106 | 334.285 | 0.021 | n/a | 0.113 | 0.000 | n/a | n/a | 0.394 | 23.814 | 0.066 | 0.394 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001efe | 311.098 | 10.709 | n/a | 0.000 | 0.000 | 0.296 | 299.790 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.256 | 10.709 | 0.034 | 0.256 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000002009 | 251.967 | 6.506 | n/a | 0.000 | 0.000 | 0.656 | 244.598 | 0.071 | n/a | 0.041 | 0.000 | n/a | n/a | 0.096 | 6.506 | 0.026 | 0.096 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001efa | 65.833 | 10.089 | n/a | 1.316 | 0.000 | 0.522 | 53.677 | 0.066 | n/a | 0.022 | 0.000 | n/a | n/a | 0.141 | 11.405 | 0.173 | 0.141 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001ef9 | 37.852 | 28.450 | n/a | 1.380 | 0.000 | 0.314 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.708 | 29.830 | 0.788 | 7.708 | node-14/thread-2/replica.publish | none observed |
| f31aa36de17c4d330000000000001ef6 | 3.297 | 2.239 | n/a | 0.000 | 0.000 | 0.189 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.869 | 2.239 | 0.679 | 0.869 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 437.920 | n/a | n/a | n/a | 4.103 | n/a | 0.000 | 0.000 | 1.130 | 433.190 | 0.027 | n/a | 0.170 | 0.000 | n/a | n/a | 0.227 | 4.103 | 0.011 | 0.227 |
| p99 | 1005.597 | n/a | n/a | n/a | 14.589 | n/a | 0.000 | 0.000 | 4.138 | 1002.793 | 2.316 | n/a | 0.920 | 0.000 | n/a | n/a | 14.780 | 14.589 | 0.480 | 14.780 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d3300000000000000ba | 1005.597 | 0.262 | n/a | 0.000 | 0.000 | 1.526 | 1002.793 | 0.087 | n/a | 0.642 | 0.000 | n/a | n/a | 0.286 | 0.262 | 0.000 | 0.286 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d3300000000000000d0 | 1004.541 | 0.218 | n/a | 0.000 | 0.000 | 1.194 | 1001.695 | 0.021 | n/a | 0.194 | 0.000 | n/a | n/a | 1.220 | 0.218 | 0.000 | 1.220 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d3300000000000000d2 | 993.123 | 3.655 | n/a | 0.000 | 0.000 | 1.409 | 987.817 | 0.027 | n/a | 0.123 | 0.000 | n/a | n/a | 0.093 | 3.655 | 0.004 | 0.093 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d3300000000000000bc | 971.242 | 7.762 | n/a | 0.000 | 0.000 | 3.418 | 957.471 | 2.316 | n/a | 0.153 | 0.000 | n/a | n/a | 0.122 | 7.762 | 0.008 | 0.122 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d3300000000000000b4 | 961.635 | 3.769 | n/a | 0.000 | 0.000 | 0.740 | 956.833 | 0.029 | n/a | 0.117 | 0.000 | n/a | n/a | 0.148 | 3.769 | 0.004 | 0.148 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d3300000000000000ae | 871.520 | 3.449 | n/a | 0.000 | 0.000 | 0.964 | 866.674 | 0.057 | n/a | 0.255 | 0.000 | n/a | n/a | 0.121 | 3.449 | 0.004 | 0.121 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d3300000000000000b2 | 841.958 | 6.987 | n/a | 0.000 | 0.000 | 1.093 | 832.999 | 0.184 | n/a | 0.343 | 0.000 | n/a | n/a | 0.351 | 6.987 | 0.008 | 0.351 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d3300000000000000c9 | 760.352 | 3.817 | n/a | 0.000 | 0.000 | 1.182 | 755.126 | 0.012 | n/a | 0.132 | 0.000 | n/a | n/a | 0.082 | 3.817 | 0.005 | 0.082 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d3300000000000000c6 | 749.010 | 4.449 | n/a | 0.000 | 0.000 | 3.134 | 740.950 | 0.044 | n/a | 0.174 | 0.000 | n/a | n/a | 0.259 | 4.449 | 0.006 | 0.259 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000000c0 | 736.750 | 2.748 | n/a | 0.000 | 0.000 | 1.287 | 732.501 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.105 | 2.748 | 0.004 | 0.105 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000000ab | 672.863 | 3.851 | n/a | 0.000 | 0.000 | 4.138 | 664.386 | 0.018 | n/a | 0.205 | 0.000 | n/a | n/a | 0.265 | 3.851 | 0.006 | 0.265 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d3300000000000000c2 | 653.471 | 13.985 | n/a | 0.000 | 0.000 | 0.657 | 638.493 | 0.021 | n/a | 0.160 | 0.000 | n/a | n/a | 0.154 | 13.985 | 0.021 | 0.154 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000000a8 | 650.031 | 4.165 | n/a | 0.000 | 0.000 | 1.662 | 642.641 | 0.866 | n/a | 0.188 | 0.000 | n/a | n/a | 0.509 | 4.165 | 0.006 | 0.509 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000000cb | 596.552 | 14.589 | n/a | 0.000 | 0.000 | 1.309 | 579.537 | 0.534 | n/a | 0.132 | 0.000 | n/a | n/a | 0.450 | 14.589 | 0.024 | 0.450 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d3300000000000000b8 | 479.072 | 5.178 | n/a | 0.000 | 0.000 | 1.240 | 471.846 | 0.158 | n/a | 0.385 | 0.000 | n/a | n/a | 0.265 | 5.178 | 0.011 | 0.265 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d3300000000000000b6 | 437.920 | 3.073 | n/a | 0.000 | 0.000 | 1.186 | 433.190 | 0.054 | n/a | 0.327 | 0.000 | n/a | n/a | 0.089 | 3.073 | 0.007 | 0.089 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000000a9 | 352.660 | 7.492 | n/a | 0.000 | 0.000 | 1.443 | 343.102 | 0.095 | n/a | 0.170 | 0.000 | n/a | n/a | 0.358 | 7.492 | 0.021 | 0.358 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000000c3 | 338.889 | 3.610 | n/a | 0.000 | 0.000 | 0.931 | 334.121 | 0.014 | n/a | 0.105 | 0.000 | n/a | n/a | 0.108 | 3.610 | 0.011 | 0.108 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d3300000000000000ac | 292.751 | 4.583 | n/a | 0.000 | 0.000 | 1.086 | 286.400 | 0.129 | n/a | 0.312 | 0.000 | n/a | n/a | 0.241 | 4.583 | 0.016 | 0.241 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d3300000000000000c5 | 277.099 | 4.103 | n/a | 0.000 | 0.000 | 0.797 | 271.794 | 0.023 | n/a | 0.155 | 0.000 | n/a | n/a | 0.227 | 4.103 | 0.015 | 0.227 | gw-r/thread-50/journal/page | none observed |

## P3 / baseline / internal (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 416.694 | n/a | n/a | n/a | 4.993 | n/a | 0.000 | 0.000 | 0.918 | 407.424 | 0.015 | n/a | 0.071 | 0.000 | n/a | n/a | 0.172 | 5.603 | 0.014 | 0.172 |
| p99 | 1009.345 | n/a | n/a | n/a | 58.946 | n/a | 5.749 | 0.000 | 6.001 | 1006.167 | 3.447 | n/a | 0.270 | 0.000 | n/a | n/a | 40.083 | 58.946 | 0.785 | 40.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000000106 | 1009.345 | 0.172 | n/a | 0.000 | 0.000 | 1.466 | 1006.167 | 0.105 | n/a | 0.213 | 0.000 | n/a | n/a | 1.221 | 0.172 | 0.000 | 1.221 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000000102 | 1006.424 | 5.990 | n/a | 1.074 | 0.000 | 0.941 | 996.957 | 0.855 | n/a | 0.112 | 0.000 | n/a | n/a | 0.495 | 7.064 | 0.007 | 0.495 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000000127 | 1003.774 | 0.201 | n/a | 0.000 | 0.000 | 1.097 | 1001.163 | 0.026 | n/a | 0.108 | 0.000 | n/a | n/a | 1.178 | 0.201 | 0.000 | 1.178 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000000de | 1003.643 | 0.227 | n/a | 0.000 | 0.000 | 1.040 | 1001.072 | 0.033 | n/a | 0.107 | 0.000 | n/a | n/a | 1.164 | 0.227 | 0.000 | 1.164 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000000155 | 1003.024 | 0.120 | n/a | 0.000 | 0.000 | 0.685 | 1001.036 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 1.107 | 0.120 | 0.000 | 1.107 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d3300000000000000da | 998.741 | 10.196 | n/a | 0.000 | 0.000 | 2.150 | 985.983 | 0.144 | n/a | 0.086 | 0.000 | n/a | n/a | 0.181 | 10.196 | 0.010 | 0.181 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d33000000000000012c | 998.582 | 5.579 | n/a | 1.425 | 0.000 | 1.032 | 990.048 | 0.012 | n/a | 0.137 | 0.000 | n/a | n/a | 0.348 | 7.004 | 0.007 | 0.348 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d3300000000000000d9 | 996.916 | 6.507 | n/a | 0.000 | 0.000 | 1.250 | 987.101 | 1.818 | n/a | 0.088 | 0.000 | n/a | n/a | 0.152 | 6.507 | 0.007 | 0.152 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d33000000000000010f | 996.854 | 3.367 | n/a | 0.000 | 0.000 | 0.566 | 992.589 | 0.182 | n/a | 0.055 | 0.000 | n/a | n/a | 0.095 | 3.367 | 0.003 | 0.095 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000000116 | 988.100 | 5.096 | n/a | 0.817 | 0.000 | 0.627 | 981.313 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.159 | 5.913 | 0.006 | 0.159 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000000139 | 986.422 | 8.959 | n/a | 0.000 | 0.000 | 0.747 | 976.310 | 0.017 | n/a | 0.105 | 0.000 | n/a | n/a | 0.283 | 8.959 | 0.009 | 0.283 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d33000000000000012d | 975.890 | 4.274 | n/a | 0.000 | 0.000 | 0.783 | 970.637 | 0.015 | n/a | 0.050 | 0.000 | n/a | n/a | 0.131 | 4.274 | 0.004 | 0.131 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d3300000000000000d3 | 975.638 | 3.452 | n/a | 0.000 | 0.000 | 0.960 | 971.037 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.105 | 3.452 | 0.004 | 0.105 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d3300000000000000e5 | 952.794 | 10.255 | n/a | 1.809 | 0.000 | 1.561 | 938.612 | 0.085 | n/a | 0.192 | 0.000 | n/a | n/a | 0.279 | 12.064 | 0.013 | 0.279 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d3300000000000000e0 | 952.400 | 4.420 | n/a | 0.000 | 0.000 | 0.838 | 946.930 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.122 | 4.420 | 0.005 | 0.122 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d33000000000000011e | 942.365 | 12.183 | n/a | 0.884 | 0.000 | 0.916 | 927.811 | 0.043 | n/a | 0.042 | 0.000 | n/a | n/a | 0.486 | 13.067 | 0.014 | 0.486 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000000142 | 901.969 | 5.800 | n/a | 0.000 | 0.000 | 2.133 | 893.793 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.182 | 5.800 | 0.006 | 0.182 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000000149 | 893.553 | 4.381 | n/a | 0.000 | 0.000 | 1.143 | 887.883 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.100 | 4.381 | 0.005 | 0.100 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d3300000000000000ff | 871.030 | 7.731 | n/a | 1.495 | 0.000 | 1.205 | 858.948 | 1.460 | n/a | 0.096 | 0.000 | n/a | n/a | 0.095 | 9.226 | 0.011 | 0.095 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000000134 | 836.228 | 5.706 | n/a | 1.411 | 0.000 | 1.050 | 827.809 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.191 | 7.117 | 0.009 | 0.191 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / internal (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 405.729 | n/a | n/a | n/a | 3.758 | n/a | 0.000 | 0.000 | 0.619 | 392.744 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.111 | 3.758 | 0.010 | 0.111 |
| p99 | 1004.037 | n/a | n/a | n/a | 10.439 | n/a | 1.351 | 0.000 | 2.896 | 1001.159 | 0.485 | n/a | 0.112 | 0.000 | n/a | n/a | 33.774 | 11.921 | 0.609 | 33.774 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000000170 | 1005.666 | 4.190 | n/a | 0.000 | 0.000 | 0.583 | 999.967 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.871 | 4.190 | 0.004 | 0.871 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d33000000000000018b | 1004.037 | 0.214 | n/a | 0.000 | 0.000 | 0.995 | 1001.535 | 0.015 | n/a | 0.112 | 0.000 | n/a | n/a | 1.167 | 0.214 | 0.000 | 1.167 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000000187 | 1003.550 | 4.184 | n/a | 0.000 | 0.000 | 0.713 | 998.476 | 0.007 | n/a | 0.092 | 0.000 | n/a | n/a | 0.078 | 4.184 | 0.004 | 0.078 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000000166 | 1003.382 | 0.126 | n/a | 0.000 | 0.000 | 0.814 | 1001.159 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 1.197 | 0.126 | 0.000 | 1.197 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000000176 | 1003.287 | 4.039 | n/a | 0.000 | 0.000 | 0.687 | 998.321 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.165 | 4.039 | 0.004 | 0.165 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d3300000000000001a7 | 1002.419 | 0.137 | n/a | 0.000 | 0.000 | 0.416 | 1000.691 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 1.117 | 0.137 | 0.000 | 1.117 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d3300000000000001eb | 1002.338 | 2.527 | n/a | 0.000 | 0.000 | 0.604 | 999.018 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.111 | 2.527 | 0.003 | 0.111 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000000186 | 1000.838 | 3.230 | n/a | 0.000 | 0.000 | 0.578 | 996.901 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.086 | 3.230 | 0.003 | 0.086 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d3300000000000001ff | 1000.779 | 3.494 | n/a | 0.000 | 0.000 | 0.573 | 996.529 | 0.015 | n/a | 0.075 | 0.000 | n/a | n/a | 0.094 | 3.494 | 0.003 | 0.094 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000001a6 | 996.760 | 3.278 | n/a | 0.000 | 0.000 | 0.728 | 992.464 | 0.135 | n/a | 0.051 | 0.000 | n/a | n/a | 0.105 | 3.278 | 0.003 | 0.105 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000000180 | 985.677 | 3.378 | n/a | 0.000 | 0.000 | 0.780 | 981.298 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.157 | 3.378 | 0.003 | 0.157 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d3300000000000001c6 | 984.070 | 3.542 | n/a | 0.000 | 0.000 | 1.759 | 978.472 | 0.143 | n/a | 0.035 | 0.000 | n/a | n/a | 0.119 | 3.542 | 0.004 | 0.119 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d3300000000000001f8 | 981.220 | 2.275 | n/a | 0.000 | 0.000 | 0.396 | 978.424 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.091 | 2.275 | 0.002 | 0.091 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000001c3 | 977.337 | 5.394 | n/a | 0.000 | 0.000 | 1.068 | 970.384 | 0.187 | n/a | 0.105 | 0.000 | n/a | n/a | 0.199 | 5.394 | 0.006 | 0.199 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d3300000000000001a9 | 961.494 | 3.218 | n/a | 0.000 | 0.000 | 0.772 | 957.350 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.099 | 3.218 | 0.003 | 0.099 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d3300000000000001c5 | 957.025 | 5.795 | n/a | 0.000 | 0.000 | 0.647 | 950.167 | 0.122 | n/a | 0.052 | 0.000 | n/a | n/a | 0.243 | 5.795 | 0.006 | 0.243 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d33000000000000019b | 897.572 | 3.257 | n/a | 0.000 | 0.000 | 0.489 | 893.717 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.068 | 3.257 | 0.004 | 0.068 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d33000000000000017c | 890.799 | 5.185 | n/a | 0.000 | 0.000 | 0.666 | 884.655 | 0.015 | n/a | 0.096 | 0.000 | n/a | n/a | 0.182 | 5.185 | 0.006 | 0.182 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d3300000000000001f5 | 843.434 | 2.354 | n/a | 0.000 | 0.000 | 0.564 | 840.375 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.096 | 2.354 | 0.003 | 0.096 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000001b7 | 814.293 | 5.834 | n/a | 0.000 | 0.000 | 0.764 | 807.533 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.108 | 5.834 | 0.007 | 0.108 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / internal (1585 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.455 | n/a | n/a | n/a | 3.562 | n/a | 0.000 | 0.000 | 0.252 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.115 | 3.562 | 0.292 | 7.115 |
| p99 | 362.509 | n/a | n/a | n/a | 14.984 | n/a | 1.182 | 0.000 | 0.872 | 358.467 | 0.111 | n/a | 0.050 | 0.000 | n/a | n/a | 46.614 | 15.593 | 0.832 | 46.614 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000000217 | 1011.348 | 3.098 | n/a | 0.000 | 0.000 | 0.424 | 1007.649 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.136 | 3.098 | 0.003 | 0.136 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000000212 | 1002.965 | 0.216 | n/a | 0.000 | 0.000 | 0.688 | 1000.866 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 1.126 | 0.216 | 0.000 | 1.126 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000000219 | 1000.458 | 4.944 | n/a | 0.000 | 0.000 | 0.452 | 994.825 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.195 | 4.944 | 0.005 | 0.195 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000000208 | 1000.101 | 6.563 | n/a | 0.000 | 0.000 | 0.802 | 992.457 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.239 | 6.563 | 0.007 | 0.239 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000000225 | 998.397 | 2.429 | n/a | 0.000 | 0.000 | 0.472 | 995.375 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.076 | 2.429 | 0.002 | 0.076 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000000218 | 990.647 | 2.577 | n/a | 0.000 | 0.000 | 1.590 | 986.367 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.076 | 2.577 | 0.003 | 0.076 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000000214 | 822.546 | 7.673 | n/a | 0.000 | 0.000 | 0.506 | 814.202 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.128 | 7.673 | 0.009 | 0.128 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d33000000000000021a | 703.728 | 1.774 | n/a | 0.000 | 0.000 | 0.567 | 701.167 | 0.016 | n/a | 0.114 | 0.000 | n/a | n/a | 0.090 | 1.774 | 0.003 | 0.090 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000000226 | 701.030 | 2.577 | n/a | 0.000 | 0.000 | 0.541 | 697.746 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.099 | 2.577 | 0.004 | 0.099 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000000210 | 662.747 | 4.801 | n/a | 0.000 | 0.000 | 0.552 | 657.283 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.071 | 4.801 | 0.007 | 0.071 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000000200 | 632.051 | 3.386 | n/a | 0.000 | 0.000 | 0.624 | 627.838 | 0.016 | n/a | 0.084 | 0.000 | n/a | n/a | 0.103 | 3.386 | 0.005 | 0.103 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000000222 | 595.580 | 3.250 | n/a | 0.000 | 0.000 | 2.472 | 589.716 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.093 | 3.250 | 0.005 | 0.093 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000000203 | 579.413 | 3.214 | n/a | 0.000 | 0.000 | 0.472 | 575.507 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.168 | 3.214 | 0.006 | 0.168 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d33000000000000021d | 538.064 | 2.028 | n/a | 0.000 | 0.000 | 0.443 | 535.405 | 0.075 | n/a | 0.050 | 0.000 | n/a | n/a | 0.064 | 2.028 | 0.004 | 0.064 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000000223 | 406.365 | 2.772 | n/a | 0.000 | 0.000 | 0.453 | 403.011 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.093 | 2.772 | 0.007 | 0.093 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000000201 | 362.509 | 3.095 | n/a | 0.000 | 0.000 | 0.714 | 358.467 | 0.027 | n/a | 0.061 | 0.000 | n/a | n/a | 0.145 | 3.095 | 0.009 | 0.145 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000000204 | 321.426 | 2.985 | n/a | 0.000 | 0.000 | 0.622 | 317.680 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.093 | 2.985 | 0.009 | 0.093 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d33000000000000021b | 304.145 | 2.221 | n/a | 0.000 | 0.000 | 0.542 | 301.073 | 0.115 | n/a | 0.058 | 0.000 | n/a | n/a | 0.135 | 2.221 | 0.007 | 0.135 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d33000000000000021e | 255.394 | 2.049 | n/a | 0.000 | 0.000 | 0.428 | 252.820 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.057 | 2.049 | 0.008 | 0.057 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d33000000000000020f | 231.199 | 2.667 | n/a | 0.000 | 0.000 | 0.490 | 227.907 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.105 | 2.667 | 0.012 | 0.105 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / internal (1522 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.590 | n/a | n/a | n/a | 4.194 | n/a | 0.000 | 0.000 | 0.229 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.169 | 4.210 | 0.341 | 6.169 |
| p99 | 426.759 | n/a | n/a | n/a | 16.985 | n/a | 1.492 | 0.000 | 0.966 | 418.149 | 0.125 | n/a | 0.038 | 0.000 | n/a | n/a | 46.840 | 17.166 | 0.858 | 46.840 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001ae7 | 1008.542 | 5.118 | n/a | 0.000 | 0.000 | 0.563 | 1002.713 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.115 | 5.118 | 0.005 | 0.115 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001ac3 | 1002.283 | 3.250 | n/a | 0.000 | 0.000 | 0.543 | 998.117 | 0.195 | n/a | 0.036 | 0.000 | n/a | n/a | 0.143 | 3.250 | 0.003 | 0.143 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001ac4 | 1002.105 | 0.125 | n/a | 0.000 | 0.000 | 0.402 | 1000.427 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.111 | 0.125 | 0.000 | 1.111 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001ace | 999.378 | 3.543 | n/a | 0.000 | 0.000 | 0.406 | 995.309 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.079 | 3.543 | 0.004 | 0.079 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001ae9 | 924.236 | 2.752 | n/a | 0.000 | 0.000 | 0.486 | 920.704 | 0.190 | n/a | 0.046 | 0.000 | n/a | n/a | 0.059 | 2.752 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001ad8 | 836.130 | 8.617 | n/a | 0.000 | 0.000 | 0.359 | 826.759 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.367 | 8.617 | 0.010 | 0.367 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001ac9 | 797.739 | 5.530 | n/a | 0.000 | 0.000 | 0.430 | 791.476 | 0.105 | n/a | 0.040 | 0.000 | n/a | n/a | 0.158 | 5.530 | 0.007 | 0.158 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001ae3 | 713.062 | 3.055 | n/a | 0.000 | 0.000 | 0.475 | 709.427 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.077 | 3.055 | 0.004 | 0.077 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001ac6 | 703.368 | 11.643 | n/a | 0.000 | 0.000 | 0.935 | 690.392 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.369 | 11.643 | 0.017 | 0.369 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001ade | 685.811 | 5.196 | n/a | 0.000 | 0.000 | 0.747 | 679.565 | 0.110 | n/a | 0.032 | 0.000 | n/a | n/a | 0.160 | 5.196 | 0.008 | 0.160 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001b01 | 681.528 | 2.286 | n/a | 0.000 | 0.000 | 0.528 | 678.485 | 0.100 | n/a | 0.033 | 0.000 | n/a | n/a | 0.095 | 2.286 | 0.003 | 0.095 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001af8 | 585.713 | 4.620 | n/a | 0.000 | 0.000 | 0.382 | 580.526 | 0.011 | n/a | 0.036 | 0.000 | n/a | n/a | 0.138 | 4.620 | 0.008 | 0.138 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001b04 | 461.487 | 3.802 | n/a | 0.000 | 0.000 | 0.344 | 457.110 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.201 | 3.802 | 0.008 | 0.201 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001acf | 457.003 | 2.067 | n/a | 0.000 | 0.000 | 0.572 | 454.258 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.064 | 2.067 | 0.005 | 0.064 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001aeb | 427.647 | 8.667 | n/a | 0.000 | 0.000 | 0.555 | 418.149 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.245 | 8.667 | 0.020 | 0.245 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001b03 | 426.759 | 2.163 | n/a | 0.000 | 0.000 | 0.344 | 424.132 | 0.002 | n/a | 0.014 | 0.000 | n/a | n/a | 0.102 | 2.163 | 0.005 | 0.102 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001af9 | 365.752 | 5.540 | n/a | 0.000 | 0.000 | 0.638 | 359.363 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.164 | 5.540 | 0.015 | 0.164 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001afc | 325.726 | 2.585 | n/a | 0.000 | 0.000 | 0.425 | 322.593 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.092 | 2.585 | 0.008 | 0.092 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001afa | 307.193 | 2.826 | n/a | 0.000 | 0.000 | 0.358 | 303.880 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.107 | 2.826 | 0.009 | 0.107 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001af5 | 307.094 | 4.317 | n/a | 0.000 | 0.000 | 0.869 | 301.669 | 0.100 | n/a | 0.031 | 0.000 | n/a | n/a | 0.107 | 4.317 | 0.014 | 0.107 | gw-r/thread-44/journal/page | none observed |

## P3 / L64 / internal (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 380.139 | n/a | n/a | n/a | 3.355 | n/a | 0.000 | 0.000 | 0.412 | 375.880 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.094 | 3.365 | 0.008 | 0.094 |
| p99 | 1025.608 | n/a | n/a | n/a | 14.898 | n/a | 1.366 | 0.000 | 3.759 | 1019.729 | 0.237 | n/a | 0.072 | 0.000 | n/a | n/a | 47.040 | 14.898 | 0.537 | 47.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001b8a | 1025.608 | 4.972 | n/a | 0.000 | 0.000 | 0.766 | 1019.729 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.105 | 4.972 | 0.005 | 0.105 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001b5d | 1005.781 | 0.118 | n/a | 0.000 | 0.000 | 3.759 | 1000.735 | 0.014 | n/a | 0.052 | 0.000 | n/a | n/a | 1.103 | 0.118 | 0.000 | 1.103 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001b4e | 1002.813 | 4.077 | n/a | 0.000 | 0.000 | 0.506 | 998.010 | 0.097 | n/a | 0.040 | 0.000 | n/a | n/a | 0.084 | 4.077 | 0.004 | 0.084 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001b0d | 1002.291 | 0.096 | n/a | 0.000 | 0.000 | 0.346 | 1000.684 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 1.106 | 0.096 | 0.000 | 1.106 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001b08 | 1002.211 | 0.150 | n/a | 0.000 | 0.000 | 0.509 | 1000.435 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 1.082 | 0.150 | 0.000 | 1.082 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001b65 | 1001.391 | 0.166 | n/a | 0.000 | 0.000 | 0.477 | 1000.625 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.069 | 0.166 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001b1d | 998.489 | 2.537 | n/a | 0.000 | 0.000 | 0.352 | 995.308 | 0.171 | n/a | 0.034 | 0.000 | n/a | n/a | 0.086 | 2.537 | 0.003 | 0.086 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001b57 | 994.995 | 2.450 | n/a | 0.000 | 0.000 | 0.416 | 992.007 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.087 | 2.450 | 0.002 | 0.087 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001b89 | 993.616 | 2.810 | n/a | 0.000 | 0.000 | 0.965 | 989.575 | 0.135 | n/a | 0.050 | 0.000 | n/a | n/a | 0.081 | 2.810 | 0.003 | 0.081 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001b58 | 993.553 | 2.419 | n/a | 0.000 | 0.000 | 0.365 | 990.652 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.073 | 2.419 | 0.002 | 0.073 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001b71 | 991.164 | 2.523 | n/a | 0.000 | 0.000 | 0.307 | 988.219 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.089 | 2.523 | 0.003 | 0.089 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001b4a | 989.404 | 2.261 | n/a | 0.000 | 0.000 | 0.448 | 986.463 | 0.130 | n/a | 0.019 | 0.000 | n/a | n/a | 0.083 | 2.261 | 0.002 | 0.083 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001b5c | 986.461 | 2.375 | n/a | 0.000 | 0.000 | 0.394 | 983.586 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.061 | 2.375 | 0.002 | 0.061 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001b30 | 955.073 | 4.784 | n/a | 0.000 | 0.000 | 0.451 | 949.601 | 0.084 | n/a | 0.031 | 0.000 | n/a | n/a | 0.122 | 4.784 | 0.005 | 0.122 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001b4c | 942.899 | 4.306 | n/a | 0.000 | 0.000 | 0.373 | 938.090 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.101 | 4.306 | 0.005 | 0.101 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001b78 | 889.065 | 7.554 | n/a | 0.000 | 0.000 | 0.513 | 880.678 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.262 | 7.554 | 0.008 | 0.262 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001b22 | 861.262 | 5.677 | n/a | 0.000 | 0.000 | 0.315 | 854.999 | 0.097 | n/a | 0.025 | 0.000 | n/a | n/a | 0.149 | 5.677 | 0.007 | 0.149 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001b86 | 857.333 | 3.628 | n/a | 0.000 | 0.000 | 0.387 | 853.054 | 0.115 | n/a | 0.028 | 0.000 | n/a | n/a | 0.121 | 3.628 | 0.004 | 0.121 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001b55 | 841.975 | 4.433 | n/a | 0.000 | 0.000 | 0.474 | 836.946 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.085 | 4.433 | 0.005 | 0.085 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001b60 | 829.492 | 3.752 | n/a | 0.000 | 0.000 | 0.485 | 824.974 | 0.135 | n/a | 0.033 | 0.000 | n/a | n/a | 0.114 | 3.752 | 0.005 | 0.114 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / internal (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 403.031 | n/a | n/a | n/a | 3.218 | n/a | 0.000 | 0.000 | 0.427 | 398.356 | 0.009 | n/a | 0.029 | 0.000 | n/a | n/a | 0.094 | 3.218 | 0.010 | 0.094 |
| p99 | 1009.219 | n/a | n/a | n/a | 12.833 | n/a | 2.598 | 0.000 | 7.240 | 1002.435 | 0.254 | n/a | 0.094 | 0.000 | n/a | n/a | 49.704 | 14.180 | 0.677 | 49.704 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001bf5 | 1009.219 | 5.983 | n/a | 0.000 | 0.000 | 0.454 | 1002.435 | 0.137 | n/a | 0.035 | 0.000 | n/a | n/a | 0.176 | 5.983 | 0.006 | 0.176 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001c1d | 1005.824 | 5.424 | n/a | 0.000 | 0.000 | 1.081 | 999.063 | 0.111 | n/a | 0.027 | 0.000 | n/a | n/a | 0.119 | 5.424 | 0.005 | 0.119 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001bfa | 1005.135 | 2.418 | n/a | 0.000 | 0.000 | 2.451 | 1000.139 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.073 | 2.418 | 0.002 | 0.073 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001bec | 1002.917 | 4.439 | n/a | 0.000 | 0.000 | 0.343 | 998.048 | 0.009 | n/a | 0.023 | 0.000 | n/a | n/a | 0.054 | 4.439 | 0.004 | 0.054 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001c29 | 1002.797 | 0.114 | n/a | 0.000 | 0.000 | 0.481 | 1000.999 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 1.097 | 0.114 | 0.000 | 1.097 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001c0c | 1002.000 | 0.107 | n/a | 0.000 | 0.000 | 0.327 | 1000.461 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.062 | 0.107 | 0.000 | 1.062 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001bf2 | 1001.986 | 0.097 | n/a | 0.000 | 0.000 | 0.284 | 1000.463 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.099 | 0.097 | 0.000 | 1.099 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001c01 | 1000.921 | 3.398 | n/a | 0.000 | 0.000 | 0.470 | 996.825 | 0.129 | n/a | 0.033 | 0.000 | n/a | n/a | 0.067 | 3.398 | 0.003 | 0.067 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001c17 | 999.821 | 2.222 | n/a | 0.000 | 0.000 | 0.370 | 997.021 | 0.109 | n/a | 0.042 | 0.000 | n/a | n/a | 0.058 | 2.222 | 0.002 | 0.058 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001c28 | 999.497 | 2.445 | n/a | 0.000 | 0.000 | 0.413 | 996.530 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.061 | 2.445 | 0.002 | 0.061 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001bf4 | 997.744 | 5.313 | n/a | 0.000 | 0.000 | 0.401 | 991.893 | 0.010 | n/a | 0.030 | 0.000 | n/a | n/a | 0.096 | 5.313 | 0.005 | 0.096 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001be4 | 996.838 | 3.075 | n/a | 0.000 | 0.000 | 0.413 | 993.155 | 0.086 | n/a | 0.022 | 0.000 | n/a | n/a | 0.087 | 3.075 | 0.003 | 0.087 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001bfb | 994.762 | 2.982 | n/a | 0.000 | 0.000 | 0.347 | 991.188 | 0.121 | n/a | 0.042 | 0.000 | n/a | n/a | 0.082 | 2.982 | 0.003 | 0.082 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001beb | 993.774 | 3.221 | n/a | 0.000 | 0.000 | 2.712 | 987.623 | 0.101 | n/a | 0.037 | 0.000 | n/a | n/a | 0.080 | 3.221 | 0.003 | 0.080 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001bc7 | 988.135 | 8.105 | n/a | 0.000 | 0.000 | 1.968 | 977.580 | 0.254 | n/a | 0.025 | 0.000 | n/a | n/a | 0.203 | 8.105 | 0.008 | 0.203 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001bc9 | 953.056 | 3.354 | n/a | 0.000 | 0.000 | 0.366 | 949.122 | 0.101 | n/a | 0.047 | 0.000 | n/a | n/a | 0.066 | 3.354 | 0.004 | 0.066 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001c11 | 950.158 | 2.631 | n/a | 0.000 | 0.000 | 0.409 | 946.996 | 0.009 | n/a | 0.027 | 0.000 | n/a | n/a | 0.085 | 2.631 | 0.003 | 0.085 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001bf8 | 948.396 | 2.278 | n/a | 0.000 | 0.000 | 0.413 | 945.466 | 0.117 | n/a | 0.052 | 0.000 | n/a | n/a | 0.071 | 2.278 | 0.002 | 0.071 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001bb5 | 927.380 | 2.359 | n/a | 0.000 | 0.000 | 0.415 | 924.498 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.079 | 2.359 | 0.003 | 0.079 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001c0f | 896.897 | 2.397 | n/a | 0.000 | 0.000 | 0.375 | 893.880 | 0.141 | n/a | 0.048 | 0.000 | n/a | n/a | 0.056 | 2.397 | 0.003 | 0.056 | gw-r/thread-46/journal/page | none observed |

## P3 / L1024 / internal (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 380.399 | n/a | n/a | n/a | 3.059 | n/a | 0.000 | 0.000 | 0.462 | 373.987 | 0.009 | n/a | 0.032 | 0.000 | n/a | n/a | 0.084 | 3.059 | 0.009 | 0.084 |
| p99 | 1005.565 | n/a | n/a | n/a | 13.633 | n/a | 1.365 | 0.000 | 3.382 | 1000.552 | 1.300 | n/a | 0.069 | 0.000 | n/a | n/a | 50.166 | 14.998 | 0.717 | 50.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001c50 | 1005.565 | 4.791 | n/a | 0.000 | 0.000 | 0.591 | 999.925 | 0.120 | n/a | 0.029 | 0.000 | n/a | n/a | 0.109 | 4.791 | 0.005 | 0.109 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001cb4 | 1004.011 | 4.804 | n/a | 0.000 | 0.000 | 0.452 | 998.517 | 0.119 | n/a | 0.039 | 0.000 | n/a | n/a | 0.080 | 4.804 | 0.005 | 0.080 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001cb2 | 1003.863 | 5.283 | n/a | 0.000 | 0.000 | 0.838 | 997.495 | 0.100 | n/a | 0.024 | 0.000 | n/a | n/a | 0.124 | 5.283 | 0.005 | 0.124 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001c43 | 1002.427 | 0.175 | n/a | 0.000 | 0.000 | 0.519 | 1000.552 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 1.129 | 0.175 | 0.000 | 1.129 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001c2f | 1002.252 | 0.090 | n/a | 0.000 | 0.000 | 0.472 | 1000.533 | 0.014 | n/a | 0.044 | 0.000 | n/a | n/a | 1.099 | 0.090 | 0.000 | 1.099 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001cb3 | 1002.097 | 2.807 | n/a | 0.000 | 0.000 | 0.455 | 998.529 | 0.120 | n/a | 0.069 | 0.000 | n/a | n/a | 0.118 | 2.807 | 0.003 | 0.118 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001ca2 | 1001.405 | 2.313 | n/a | 0.000 | 0.000 | 0.461 | 998.403 | 0.123 | n/a | 0.036 | 0.000 | n/a | n/a | 0.068 | 2.313 | 0.002 | 0.068 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001c7b | 1001.122 | 5.124 | n/a | 0.000 | 0.000 | 1.105 | 994.661 | 0.127 | n/a | 0.023 | 0.000 | n/a | n/a | 0.082 | 5.124 | 0.005 | 0.082 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001c51 | 999.302 | 3.550 | n/a | 0.000 | 0.000 | 0.462 | 995.085 | 0.106 | n/a | 0.022 | 0.000 | n/a | n/a | 0.077 | 3.550 | 0.004 | 0.077 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001c90 | 998.525 | 2.588 | n/a | 0.000 | 0.000 | 0.380 | 995.443 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.067 | 2.588 | 0.003 | 0.067 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001c60 | 997.956 | 2.258 | n/a | 0.000 | 0.000 | 0.456 | 995.034 | 0.099 | n/a | 0.051 | 0.000 | n/a | n/a | 0.059 | 2.258 | 0.002 | 0.059 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001c5a | 996.598 | 2.689 | n/a | 0.000 | 0.000 | 0.483 | 993.266 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.123 | 2.689 | 0.003 | 0.123 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001c5b | 995.303 | 2.377 | n/a | 0.000 | 0.000 | 0.410 | 992.305 | 0.115 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 2.377 | 0.002 | 0.063 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001cae | 994.056 | 4.734 | n/a | 0.000 | 0.000 | 0.421 | 988.733 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.124 | 4.734 | 0.005 | 0.124 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001c45 | 992.534 | 2.249 | n/a | 0.000 | 0.000 | 0.409 | 989.675 | 0.117 | n/a | 0.026 | 0.000 | n/a | n/a | 0.059 | 2.249 | 0.002 | 0.059 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001cab | 987.675 | 10.177 | n/a | 0.000 | 0.000 | 0.411 | 976.889 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.156 | 10.177 | 0.010 | 0.156 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001c2e | 984.974 | 2.599 | n/a | 0.000 | 0.000 | 0.364 | 981.900 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.059 | 2.599 | 0.003 | 0.059 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001c6f | 907.600 | 2.803 | n/a | 0.000 | 0.000 | 0.781 | 903.916 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.053 | 2.803 | 0.003 | 0.053 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001c32 | 901.027 | 10.526 | n/a | 0.000 | 0.000 | 0.495 | 889.584 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.378 | 10.526 | 0.012 | 0.378 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001c38 | 899.446 | 2.932 | n/a | 0.000 | 0.000 | 0.833 | 895.563 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.070 | 2.932 | 0.003 | 0.070 | gw-r/thread-49/journal/page | none observed |

## P3 / recovery / internal (139 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 347.496 | n/a | n/a | n/a | 4.009 | n/a | 0.000 | 0.000 | 0.462 | 344.184 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.116 | 4.009 | 0.014 | 0.116 |
| p99 | 1004.128 | n/a | n/a | n/a | 16.707 | n/a | 1.583 | 0.000 | 1.905 | 1000.739 | 0.306 | n/a | 0.075 | 0.000 | n/a | n/a | 47.525 | 18.040 | 0.612 | 47.525 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001d91 | 1005.156 | 2.948 | n/a | 0.000 | 0.000 | 0.780 | 1001.271 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.076 | 2.948 | 0.003 | 0.076 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001d8f | 1004.128 | 3.119 | n/a | 0.000 | 0.000 | 0.334 | 1000.461 | 0.083 | n/a | 0.031 | 0.000 | n/a | n/a | 0.099 | 3.119 | 0.003 | 0.099 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001d1f | 1003.365 | 2.423 | n/a | 0.000 | 0.000 | 0.313 | 1000.404 | 0.122 | n/a | 0.025 | 0.000 | n/a | n/a | 0.077 | 2.423 | 0.002 | 0.077 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001d6a | 1002.404 | 0.101 | n/a | 0.000 | 0.000 | 0.449 | 1000.675 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 1.095 | 0.101 | 0.000 | 1.095 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001cfd | 1002.361 | 0.097 | n/a | 0.000 | 0.000 | 0.358 | 1000.739 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 1.090 | 0.097 | 0.000 | 1.090 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001d83 | 1002.193 | 0.216 | n/a | 0.000 | 0.000 | 0.404 | 1000.405 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 1.128 | 0.216 | 0.000 | 1.128 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001d69 | 1000.306 | 4.771 | n/a | 0.000 | 0.000 | 0.457 | 994.964 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.079 | 4.771 | 0.005 | 0.079 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001d05 | 997.759 | 4.612 | n/a | 0.000 | 0.000 | 0.492 | 992.275 | 0.210 | n/a | 0.054 | 0.000 | n/a | n/a | 0.116 | 4.612 | 0.005 | 0.116 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001d2b | 997.132 | 3.801 | n/a | 0.000 | 0.000 | 0.574 | 992.656 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.074 | 3.801 | 0.004 | 0.074 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001d88 | 995.357 | 3.189 | n/a | 0.000 | 0.000 | 0.885 | 990.963 | 0.222 | n/a | 0.025 | 0.000 | n/a | n/a | 0.073 | 3.189 | 0.003 | 0.073 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001d57 | 987.844 | 5.239 | n/a | 0.000 | 0.000 | 0.435 | 981.972 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.168 | 5.239 | 0.005 | 0.168 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001d72 | 986.116 | 2.215 | n/a | 0.000 | 0.000 | 0.368 | 983.443 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.058 | 2.215 | 0.002 | 0.058 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001d90 | 981.109 | 2.309 | n/a | 0.000 | 0.000 | 0.383 | 978.335 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.055 | 2.309 | 0.002 | 0.055 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001cd6 | 980.436 | 13.398 | n/a | 1.235 | 0.000 | 0.810 | 964.341 | 0.160 | n/a | 0.023 | 0.000 | n/a | n/a | 0.469 | 14.633 | 0.015 | 0.469 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001cfb | 974.618 | 4.488 | n/a | 0.893 | 0.000 | 0.671 | 968.355 | 0.097 | n/a | 0.058 | 0.000 | n/a | n/a | 0.056 | 5.381 | 0.006 | 0.056 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001d55 | 971.055 | 5.343 | n/a | 0.000 | 0.000 | 0.620 | 964.786 | 0.108 | n/a | 0.033 | 0.000 | n/a | n/a | 0.165 | 5.343 | 0.006 | 0.165 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001cff | 967.193 | 3.762 | n/a | 0.000 | 0.000 | 0.447 | 962.656 | 0.134 | n/a | 0.045 | 0.000 | n/a | n/a | 0.149 | 3.762 | 0.004 | 0.149 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001d40 | 962.974 | 2.324 | n/a | 0.000 | 0.000 | 0.453 | 960.083 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.075 | 2.324 | 0.002 | 0.075 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001d2d | 960.556 | 2.551 | n/a | 0.000 | 0.000 | 0.370 | 957.460 | 0.078 | n/a | 0.033 | 0.000 | n/a | n/a | 0.065 | 2.551 | 0.003 | 0.065 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001d13 | 943.707 | 2.750 | n/a | 0.000 | 0.000 | 0.531 | 940.282 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.087 | 2.750 | 0.003 | 0.087 | gw-r/thread-49/journal/page | none observed |

## P3 / p4mix / internal (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 323.390 | n/a | n/a | n/a | 3.541 | n/a | 0.000 | 0.000 | 0.457 | 320.962 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.100 | 3.541 | 0.012 | 0.100 |
| p99 | 1004.693 | n/a | n/a | n/a | 12.571 | n/a | 1.289 | 0.000 | 4.184 | 1000.651 | 0.216 | n/a | 0.081 | 0.000 | n/a | n/a | 45.764 | 13.525 | 0.785 | 45.764 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001d95 | 1016.686 | 2.712 | n/a | 0.000 | 0.000 | 1.139 | 1012.677 | 0.063 | n/a | 0.030 | 0.000 | n/a | n/a | 0.064 | 2.712 | 0.003 | 0.064 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001db7 | 1004.693 | 4.778 | n/a | 0.000 | 0.000 | 0.448 | 999.183 | 0.068 | n/a | 0.031 | 0.000 | n/a | n/a | 0.184 | 4.778 | 0.005 | 0.184 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001df2 | 1004.302 | 0.136 | n/a | 0.000 | 0.000 | 2.410 | 1000.528 | 0.007 | n/a | 0.092 | 0.000 | n/a | n/a | 1.129 | 0.136 | 0.000 | 1.129 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001dae | 1003.355 | 2.397 | n/a | 0.000 | 0.000 | 0.430 | 1000.321 | 0.088 | n/a | 0.038 | 0.000 | n/a | n/a | 0.080 | 2.397 | 0.002 | 0.080 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001dea | 1002.751 | 4.742 | n/a | 0.000 | 0.000 | 0.453 | 997.324 | 0.096 | n/a | 0.029 | 0.000 | n/a | n/a | 0.107 | 4.742 | 0.005 | 0.107 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001d93 | 1002.512 | 0.156 | n/a | 0.000 | 0.000 | 0.502 | 1000.651 | 0.004 | n/a | 0.064 | 0.000 | n/a | n/a | 1.135 | 0.156 | 0.000 | 1.135 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001e22 | 1002.446 | 0.156 | n/a | 0.000 | 0.000 | 0.517 | 1000.567 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 1.160 | 0.156 | 0.000 | 1.160 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001de9 | 997.368 | 3.161 | n/a | 0.000 | 0.000 | 0.516 | 993.469 | 0.084 | n/a | 0.025 | 0.000 | n/a | n/a | 0.112 | 3.161 | 0.003 | 0.112 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001da3 | 997.349 | 3.276 | n/a | 0.000 | 0.000 | 0.684 | 993.196 | 0.090 | n/a | 0.022 | 0.000 | n/a | n/a | 0.081 | 3.276 | 0.003 | 0.081 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001d92 | 995.387 | 2.979 | n/a | 0.000 | 0.000 | 0.540 | 991.662 | 0.085 | n/a | 0.025 | 0.000 | n/a | n/a | 0.096 | 2.979 | 0.003 | 0.096 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001e27 | 994.478 | 4.873 | n/a | 0.000 | 0.000 | 0.510 | 988.871 | 0.090 | n/a | 0.026 | 0.000 | n/a | n/a | 0.108 | 4.873 | 0.005 | 0.108 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001d9d | 992.494 | 2.167 | n/a | 0.000 | 0.000 | 0.571 | 989.575 | 0.073 | n/a | 0.040 | 0.000 | n/a | n/a | 0.067 | 2.167 | 0.002 | 0.067 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001dab | 940.133 | 4.335 | n/a | 0.000 | 0.000 | 0.418 | 935.175 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.180 | 4.335 | 0.005 | 0.180 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001e25 | 922.919 | 3.233 | n/a | 0.000 | 0.000 | 0.349 | 919.186 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.122 | 3.233 | 0.004 | 0.122 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001e2d | 897.659 | 2.218 | n/a | 0.000 | 0.000 | 0.248 | 895.031 | 0.062 | n/a | 0.027 | 0.000 | n/a | n/a | 0.074 | 2.218 | 0.002 | 0.074 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001e2e | 855.109 | 6.722 | n/a | 0.000 | 0.000 | 2.631 | 845.556 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.159 | 6.722 | 0.008 | 0.159 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001dcf | 828.761 | 2.980 | n/a | 0.000 | 0.000 | 0.409 | 825.185 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.155 | 2.980 | 0.004 | 0.155 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001e15 | 806.347 | 6.291 | n/a | 0.000 | 0.000 | 0.435 | 799.467 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.131 | 6.291 | 0.008 | 0.131 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001e1a | 805.793 | 4.166 | n/a | 0.000 | 0.000 | 0.621 | 800.768 | 0.103 | n/a | 0.035 | 0.000 | n/a | n/a | 0.101 | 4.166 | 0.005 | 0.101 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001dcd | 793.579 | 2.483 | n/a | 0.000 | 0.000 | 0.350 | 790.627 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.089 | 2.483 | 0.003 | 0.089 | gw-r/thread-49/journal/page | none observed |

## P3 / p4h1 / internal (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 394.687 | n/a | n/a | n/a | 3.193 | n/a | 0.000 | 0.000 | 0.426 | 390.380 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.115 | 3.193 | 0.009 | 0.115 |
| p99 | 1002.507 | n/a | n/a | n/a | 20.979 | n/a | 1.120 | 0.000 | 1.196 | 1000.447 | 0.331 | n/a | 0.069 | 0.000 | n/a | n/a | 38.341 | 20.979 | 0.745 | 38.341 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001e4d | 1002.739 | 2.436 | n/a | 0.000 | 0.000 | 0.324 | 999.795 | 0.082 | n/a | 0.038 | 0.000 | n/a | n/a | 0.064 | 2.436 | 0.002 | 0.064 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001e94 | 1002.507 | 0.160 | n/a | 0.000 | 0.000 | 0.396 | 1000.752 | 0.014 | n/a | 0.052 | 0.000 | n/a | n/a | 1.133 | 0.160 | 0.000 | 1.133 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001e9c | 1002.276 | 0.166 | n/a | 0.000 | 0.000 | 0.506 | 1000.420 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 1.142 | 0.166 | 0.000 | 1.142 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001e92 | 1002.136 | 0.128 | n/a | 0.000 | 0.000 | 0.393 | 1000.447 | 0.022 | n/a | 0.037 | 0.000 | n/a | n/a | 1.110 | 0.128 | 0.000 | 1.110 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001e8b | 1002.009 | 0.104 | n/a | 0.000 | 0.000 | 0.313 | 1000.443 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 1.104 | 0.104 | 0.000 | 1.104 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001ebd | 998.722 | 3.761 | n/a | 0.000 | 0.000 | 0.352 | 994.453 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.120 | 3.761 | 0.004 | 0.120 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001e4e | 995.829 | 2.295 | n/a | 0.000 | 0.000 | 0.360 | 993.072 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.062 | 2.295 | 0.002 | 0.062 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001e46 | 994.027 | 3.240 | n/a | 0.000 | 0.000 | 0.361 | 990.067 | 0.167 | n/a | 0.087 | 0.000 | n/a | n/a | 0.105 | 3.240 | 0.003 | 0.105 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001e55 | 993.644 | 2.875 | n/a | 0.000 | 0.000 | 0.478 | 990.021 | 0.167 | n/a | 0.030 | 0.000 | n/a | n/a | 0.073 | 2.875 | 0.003 | 0.073 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001e5c | 993.061 | 4.097 | n/a | 0.000 | 0.000 | 0.474 | 988.399 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.063 | 4.097 | 0.004 | 0.063 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001e9e | 985.527 | 3.693 | n/a | 0.000 | 0.000 | 1.196 | 980.503 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.099 | 3.693 | 0.004 | 0.099 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001e79 | 980.126 | 5.288 | n/a | 0.000 | 0.000 | 0.855 | 973.830 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.120 | 5.288 | 0.005 | 0.120 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001e40 | 954.757 | 12.812 | n/a | 0.000 | 0.000 | 0.739 | 940.622 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.542 | 12.812 | 0.013 | 0.542 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001e7c | 941.373 | 2.609 | n/a | 0.000 | 0.000 | 0.618 | 938.037 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.079 | 2.609 | 0.003 | 0.079 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001ebf | 929.536 | 5.609 | n/a | 0.000 | 0.000 | 0.533 | 923.191 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 0.130 | 5.609 | 0.006 | 0.130 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001e97 | 905.535 | 5.591 | n/a | 0.000 | 0.000 | 0.810 | 898.888 | 0.078 | n/a | 0.020 | 0.000 | n/a | n/a | 0.148 | 5.591 | 0.006 | 0.148 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001e59 | 896.001 | 2.405 | n/a | 0.000 | 0.000 | 0.508 | 892.939 | 0.071 | n/a | 0.020 | 0.000 | n/a | n/a | 0.059 | 2.405 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001e50 | 890.642 | 2.678 | n/a | 0.000 | 0.000 | 0.384 | 887.498 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.070 | 2.678 | 0.003 | 0.070 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001e58 | 870.695 | 4.493 | n/a | 0.000 | 0.000 | 0.587 | 865.443 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.134 | 4.493 | 0.005 | 0.134 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001e67 | 848.085 | 3.128 | n/a | 0.000 | 0.000 | 0.503 | 844.128 | 0.151 | n/a | 0.031 | 0.000 | n/a | n/a | 0.143 | 3.128 | 0.004 | 0.143 | gw-r/thread-48/journal/page | none observed |

## P3 / grow3 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 241.675 | n/a | n/a | n/a | 109.044 | n/a | 5.595 | 0.000 | 0.674 | 115.445 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 1.683 | 114.782 | 0.436 | 1.683 |
| p99 | 694.496 | n/a | n/a | n/a | 152.567 | n/a | 11.253 | 0.000 | 1.989 | 549.317 | 19.642 | n/a | 0.041 | 0.000 | n/a | n/a | 18.105 | 159.293 | 0.790 | 18.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001ed2 | 694.496 | 135.159 | n/a | 7.171 | 0.000 | 1.032 | 549.317 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 1.784 | 142.329 | 0.205 | 1.784 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001ed7 | 538.642 | 152.567 | n/a | 6.726 | 0.000 | 1.902 | 374.066 | 0.910 | n/a | 0.040 | 0.000 | n/a | n/a | 2.432 | 159.293 | 0.296 | 2.432 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001ee2 | 526.779 | 112.548 | n/a | 6.502 | 0.000 | 1.162 | 404.618 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 1.920 | 119.051 | 0.226 | 1.920 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001edf | 518.734 | 123.900 | n/a | 6.991 | 0.000 | 0.914 | 385.174 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 1.715 | 130.890 | 0.252 | 1.715 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001edd | 507.112 | 109.493 | n/a | 7.059 | 0.000 | 0.883 | 387.384 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 2.251 | 116.552 | 0.230 | 2.251 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001ed0 | 491.341 | 120.650 | n/a | 7.188 | 0.000 | 0.674 | 360.266 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 2.541 | 127.839 | 0.260 | 2.541 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001ee5 | 488.188 | 109.548 | n/a | 5.595 | 0.000 | 1.147 | 369.851 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 2.004 | 115.143 | 0.236 | 2.004 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001ee1 | 457.045 | 113.486 | n/a | 6.847 | 0.000 | 0.793 | 333.908 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 1.981 | 120.334 | 0.263 | 1.981 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001ee4 | 424.628 | 99.708 | n/a | 5.378 | 0.000 | 0.748 | 316.762 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.993 | 105.086 | 0.247 | 1.993 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001ed6 | 361.180 | 6.171 | n/a | 0.000 | 0.000 | 0.485 | 354.271 | 0.125 | n/a | 0.027 | 0.000 | n/a | n/a | 0.101 | 6.171 | 0.017 | 0.101 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001ef4 | 316.450 | 111.397 | n/a | 3.999 | 0.000 | 0.551 | 178.532 | 19.642 | n/a | 0.041 | 0.000 | n/a | n/a | 2.289 | 115.396 | 0.365 | 2.289 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001ee8 | 271.842 | 111.981 | n/a | 6.490 | 0.000 | 1.801 | 150.045 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.488 | 118.471 | 0.436 | 1.488 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001ee6 | 266.177 | 119.314 | n/a | 8.615 | 0.000 | 0.900 | 135.296 | 0.600 | n/a | 0.019 | 0.000 | n/a | n/a | 1.433 | 127.929 | 0.481 | 1.433 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001ee9 | 257.803 | 112.259 | n/a | 6.652 | 0.000 | 1.989 | 134.345 | 0.853 | n/a | 0.023 | 0.000 | n/a | n/a | 1.683 | 118.911 | 0.461 | 1.683 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001ee7 | 243.161 | 109.044 | n/a | 5.738 | 0.000 | 1.021 | 125.842 | 0.016 | n/a | 0.021 | 0.000 | n/a | n/a | 1.479 | 114.782 | 0.472 | 1.479 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001ef0 | 242.970 | 127.444 | n/a | 6.962 | 0.000 | 0.918 | 106.147 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 1.484 | 134.406 | 0.553 | 1.484 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001eed | 241.675 | 113.559 | n/a | 6.608 | 0.000 | 0.655 | 115.445 | 0.685 | n/a | 0.019 | 0.000 | n/a | n/a | 4.704 | 120.167 | 0.497 | 4.704 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001eec | 238.785 | 103.568 | n/a | 7.508 | 0.000 | 0.513 | 124.430 | 0.001 | n/a | 0.012 | 0.000 | n/a | n/a | 2.753 | 111.075 | 0.465 | 2.753 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001eea | 228.469 | 110.121 | n/a | 11.253 | 0.000 | 1.072 | 104.535 | 0.002 | n/a | 0.014 | 0.000 | n/a | n/a | 1.472 | 121.375 | 0.531 | 1.472 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001ef5 | 204.639 | 126.079 | n/a | 7.547 | 0.000 | 0.703 | 67.895 | 0.002 | n/a | 0.022 | 0.000 | n/a | n/a | 2.390 | 133.626 | 0.653 | 2.390 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 349.665 | n/a | n/a | n/a | 3.274 | n/a | 0.000 | 0.000 | 0.394 | 346.570 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.089 | 3.274 | 0.011 | 0.089 |
| p99 | 1002.281 | n/a | n/a | n/a | 12.397 | n/a | 1.475 | 0.000 | 0.611 | 1000.442 | 0.414 | n/a | 0.052 | 0.000 | n/a | n/a | 30.715 | 12.397 | 0.676 | 30.715 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001f41 | 1002.407 | 6.070 | n/a | 0.000 | 0.000 | 0.499 | 995.703 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.093 | 6.070 | 0.006 | 0.093 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001f42 | 1002.281 | 0.158 | n/a | 0.000 | 0.000 | 0.433 | 1000.512 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.135 | 0.158 | 0.000 | 1.135 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001f78 | 1002.038 | 0.110 | n/a | 0.000 | 0.000 | 0.347 | 1000.442 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.100 | 0.110 | 0.000 | 1.100 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001f58 | 1001.995 | 0.092 | n/a | 0.000 | 0.000 | 0.304 | 1000.417 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.144 | 0.092 | 0.000 | 1.144 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001f7a | 1001.994 | 0.097 | n/a | 0.000 | 0.000 | 0.294 | 1000.427 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.138 | 0.097 | 0.000 | 1.138 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001f68 | 999.990 | 3.164 | n/a | 0.000 | 0.000 | 0.336 | 996.249 | 0.059 | n/a | 0.052 | 0.000 | n/a | n/a | 0.131 | 3.164 | 0.003 | 0.131 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001f4c | 998.584 | 2.135 | n/a | 0.000 | 0.000 | 0.314 | 996.032 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.070 | 2.135 | 0.002 | 0.070 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001f6e | 997.997 | 3.563 | n/a | 0.000 | 0.000 | 0.432 | 993.896 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.084 | 3.563 | 0.004 | 0.084 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001f8e | 996.815 | 3.784 | n/a | 0.000 | 0.000 | 0.443 | 992.390 | 0.118 | n/a | 0.028 | 0.000 | n/a | n/a | 0.053 | 3.784 | 0.004 | 0.053 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001f23 | 996.219 | 3.028 | n/a | 0.000 | 0.000 | 0.359 | 992.735 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 3.028 | 0.003 | 0.063 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001f60 | 995.664 | 3.062 | n/a | 0.000 | 0.000 | 0.367 | 992.137 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.065 | 3.062 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001f64 | 992.747 | 2.197 | n/a | 0.000 | 0.000 | 0.460 | 989.991 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.066 | 2.197 | 0.002 | 0.066 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001f77 | 992.311 | 2.304 | n/a | 0.000 | 0.000 | 0.281 | 989.620 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.060 | 2.304 | 0.002 | 0.060 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001f57 | 992.265 | 3.097 | n/a | 0.000 | 0.000 | 0.475 | 988.581 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.061 | 3.097 | 0.003 | 0.061 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001f49 | 978.517 | 1.694 | n/a | 0.000 | 0.000 | 0.432 | 976.299 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.062 | 1.694 | 0.002 | 0.062 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001f0b | 950.785 | 4.754 | n/a | 0.000 | 0.000 | 0.526 | 945.273 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.203 | 4.754 | 0.005 | 0.203 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001f70 | 842.745 | 2.313 | n/a | 0.000 | 0.000 | 0.322 | 840.012 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.069 | 2.313 | 0.003 | 0.069 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001f15 | 837.839 | 4.269 | n/a | 0.000 | 0.000 | 0.438 | 832.948 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.153 | 4.269 | 0.005 | 0.153 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001f5b | 812.396 | 2.690 | n/a | 0.000 | 0.000 | 0.446 | 809.118 | 0.025 | n/a | 0.043 | 0.000 | n/a | n/a | 0.074 | 2.690 | 0.003 | 0.074 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001f8c | 810.790 | 2.660 | n/a | 0.000 | 0.000 | 0.413 | 807.630 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.058 | 2.660 | 0.003 | 0.058 | gw-r/thread-47/journal/page | none observed |

## P3 / grow10 / internal (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 188.159 | n/a | n/a | n/a | 110.156 | n/a | 6.031 | 0.000 | 0.571 | 65.987 | 0.002 | n/a | 0.013 | 0.000 | n/a | n/a | 1.713 | 115.384 | 0.596 | 1.713 |
| p99 | 418.131 | n/a | n/a | n/a | 235.445 | n/a | 25.219 | 0.000 | 6.032 | 310.770 | 1.535 | n/a | 0.049 | 0.000 | n/a | n/a | 118.766 | 247.840 | 0.933 | 118.766 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000001fb3 | 418.131 | 91.506 | n/a | 13.160 | 0.000 | 0.383 | 310.770 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 2.277 | 104.666 | 0.250 | 2.277 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000001fca | 370.111 | 138.566 | n/a | 25.219 | 0.000 | 1.584 | 203.302 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 1.382 | 163.785 | 0.443 | 1.382 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001fd0 | 347.556 | 112.438 | n/a | 7.141 | 0.000 | 0.962 | 225.689 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 1.294 | 119.579 | 0.344 | 1.294 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001fde | 322.805 | 99.177 | n/a | 3.980 | 0.000 | 0.407 | 217.183 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 2.023 | 103.157 | 0.320 | 2.023 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001fe7 | 295.328 | 163.626 | n/a | 12.319 | 0.000 | 0.617 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 118.766 | 175.945 | 0.596 | 118.766 | node-14/thread-2/socket.wait-first-byte | none observed |
| f31aa36de17c4d330000000000001fd6 | 288.425 | 109.025 | n/a | 5.789 | 0.000 | 0.571 | 171.462 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 1.533 | 114.814 | 0.398 | 1.533 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001fae | 281.629 | 131.478 | n/a | 4.259 | 0.000 | 0.592 | 143.157 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 2.105 | 135.737 | 0.482 | 2.105 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001fdf | 276.643 | 110.294 | n/a | 9.262 | 0.000 | 0.611 | 155.014 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 1.423 | 119.556 | 0.432 | 1.423 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001fa7 | 276.596 | 124.142 | n/a | 6.593 | 0.000 | 0.659 | 142.429 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 2.737 | 130.735 | 0.473 | 2.737 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000001fb0 | 275.030 | 161.578 | n/a | 12.096 | 0.000 | 0.564 | 97.971 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 2.788 | 173.674 | 0.631 | 2.788 | node-14/thread-2/replica.fetch-feed | none observed |
| f31aa36de17c4d330000000000001fab | 273.289 | 129.011 | n/a | 9.403 | 0.000 | 0.805 | 131.801 | 0.839 | n/a | 0.025 | 0.000 | n/a | n/a | 1.405 | 138.414 | 0.506 | 1.405 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001fa0 | 270.638 | 116.957 | n/a | 6.317 | 0.000 | 0.914 | 144.782 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.630 | 123.274 | 0.455 | 1.630 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001fe9 | 265.850 | 235.445 | n/a | 12.394 | 0.000 | 0.698 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.312 | 247.840 | 0.932 | 17.312 | node-14/thread-2/replica.fetch-feed | none observed |
| f31aa36de17c4d330000000000001fa4 | 263.469 | 105.975 | n/a | 6.371 | 0.000 | 0.995 | 147.966 | 0.555 | n/a | 0.029 | 0.000 | n/a | n/a | 1.577 | 112.346 | 0.426 | 1.577 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000001fe4 | 261.686 | 122.033 | n/a | 6.448 | 0.000 | 0.963 | 129.927 | 0.665 | n/a | 0.033 | 0.000 | n/a | n/a | 1.617 | 128.481 | 0.491 | 1.617 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000001ff0 | 261.259 | 104.312 | n/a | 5.707 | 0.000 | 0.668 | 148.046 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 2.492 | 110.019 | 0.421 | 2.492 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001fc6 | 256.973 | 123.024 | n/a | 7.647 | 0.000 | 0.905 | 123.678 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 1.686 | 130.671 | 0.509 | 1.686 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000001fc9 | 256.378 | 117.730 | n/a | 5.864 | 0.000 | 0.672 | 129.143 | 0.001 | n/a | 0.013 | 0.000 | n/a | n/a | 2.955 | 123.594 | 0.482 | 2.955 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000001ffd | 256.202 | 119.778 | n/a | 6.192 | 0.000 | 0.668 | 128.072 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 1.451 | 125.970 | 0.492 | 1.451 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000001fc4 | 252.757 | 134.477 | n/a | 7.031 | 0.000 | 0.806 | 108.025 | 0.772 | n/a | 0.017 | 0.000 | n/a | n/a | 1.629 | 141.508 | 0.560 | 1.629 | gw-r/thread-45/journal/page | none observed |

## P3 / p4h10 / internal (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 418.598 | n/a | n/a | n/a | 2.889 | n/a | 0.000 | 0.000 | 0.392 | 415.686 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.078 | 2.889 | 0.007 | 0.078 |
| p99 | 1005.770 | n/a | n/a | n/a | 21.216 | n/a | 1.383 | 0.000 | 2.725 | 1002.464 | 0.254 | n/a | 0.107 | 0.000 | n/a | n/a | 46.161 | 22.424 | 0.859 | 46.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d33000000000000201e | 1005.770 | 2.688 | n/a | 0.000 | 0.000 | 0.402 | 1002.464 | 0.076 | n/a | 0.030 | 0.000 | n/a | n/a | 0.110 | 2.688 | 0.003 | 0.110 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d33000000000000203b | 1002.243 | 0.122 | n/a | 0.000 | 0.000 | 0.384 | 1000.599 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.101 | 0.122 | 0.000 | 1.101 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000002069 | 1002.242 | 0.108 | n/a | 0.000 | 0.000 | 0.394 | 1000.589 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 1.105 | 0.108 | 0.000 | 1.105 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d33000000000000205d | 1002.219 | 0.177 | n/a | 0.000 | 0.000 | 0.406 | 1000.493 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.107 | 0.177 | 0.000 | 1.107 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000002035 | 1002.129 | 4.144 | n/a | 0.000 | 0.000 | 0.337 | 997.419 | 0.130 | n/a | 0.023 | 0.000 | n/a | n/a | 0.075 | 4.144 | 0.004 | 0.075 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000002089 | 1000.507 | 2.417 | n/a | 0.000 | 0.000 | 0.356 | 997.518 | 0.138 | n/a | 0.027 | 0.000 | n/a | n/a | 0.050 | 2.417 | 0.002 | 0.050 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000002056 | 999.688 | 2.585 | n/a | 0.000 | 0.000 | 0.394 | 996.616 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.063 | 2.585 | 0.003 | 0.063 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000002071 | 998.032 | 2.708 | n/a | 0.000 | 0.000 | 0.400 | 994.769 | 0.068 | n/a | 0.028 | 0.000 | n/a | n/a | 0.059 | 2.708 | 0.003 | 0.059 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000002022 | 997.880 | 2.866 | n/a | 0.000 | 0.000 | 0.363 | 994.560 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.063 | 2.866 | 0.003 | 0.063 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000002065 | 997.235 | 4.794 | n/a | 0.000 | 0.000 | 0.414 | 991.817 | 0.083 | n/a | 0.018 | 0.000 | n/a | n/a | 0.109 | 4.794 | 0.005 | 0.109 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000002052 | 995.045 | 2.433 | n/a | 0.000 | 0.000 | 0.476 | 991.792 | 0.254 | n/a | 0.026 | 0.000 | n/a | n/a | 0.063 | 2.433 | 0.002 | 0.063 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000002075 | 995.026 | 2.456 | n/a | 0.000 | 0.000 | 0.301 | 992.091 | 0.105 | n/a | 0.024 | 0.000 | n/a | n/a | 0.050 | 2.456 | 0.002 | 0.050 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000002043 | 994.384 | 2.437 | n/a | 0.000 | 0.000 | 2.157 | 989.605 | 0.096 | n/a | 0.029 | 0.000 | n/a | n/a | 0.060 | 2.437 | 0.002 | 0.060 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000002029 | 994.080 | 2.221 | n/a | 0.000 | 0.000 | 0.542 | 991.224 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.065 | 2.221 | 0.002 | 0.065 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d33000000000000207b | 993.914 | 3.250 | n/a | 0.000 | 0.000 | 0.344 | 990.103 | 0.095 | n/a | 0.021 | 0.000 | n/a | n/a | 0.100 | 3.250 | 0.003 | 0.100 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000002064 | 993.792 | 3.591 | n/a | 0.000 | 0.000 | 2.725 | 987.304 | 0.093 | n/a | 0.023 | 0.000 | n/a | n/a | 0.056 | 3.591 | 0.004 | 0.056 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000002023 | 984.512 | 21.216 | n/a | 1.208 | 0.000 | 0.435 | 961.289 | 0.083 | n/a | 0.038 | 0.000 | n/a | n/a | 0.243 | 22.424 | 0.023 | 0.243 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d33000000000000200f | 979.957 | 3.273 | n/a | 0.000 | 0.000 | 0.339 | 975.983 | 0.232 | n/a | 0.036 | 0.000 | n/a | n/a | 0.094 | 3.273 | 0.003 | 0.094 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d33000000000000205a | 978.435 | 3.888 | n/a | 0.000 | 0.000 | 0.594 | 973.558 | 0.241 | n/a | 0.041 | 0.000 | n/a | n/a | 0.113 | 3.888 | 0.004 | 0.113 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000002067 | 971.110 | 3.045 | n/a | 0.000 | 0.000 | 0.411 | 967.481 | 0.087 | n/a | 0.020 | 0.000 | n/a | n/a | 0.066 | 3.045 | 0.003 | 0.066 | gw-r/thread-46/journal/page | none observed |

## P3 / presweep / internal (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 363.042 | n/a | n/a | n/a | 3.351 | n/a | 0.000 | 0.000 | 0.426 | 360.287 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.080 | 3.351 | 0.012 | 0.080 |
| p99 | 1004.141 | n/a | n/a | n/a | 13.166 | n/a | 1.583 | 0.000 | 2.602 | 1000.513 | 0.213 | n/a | 0.060 | 0.000 | n/a | n/a | 29.185 | 14.585 | 0.694 | 29.185 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d3300000000000020aa | 1005.016 | 4.833 | n/a | 0.000 | 0.000 | 0.580 | 999.400 | 0.094 | n/a | 0.024 | 0.000 | n/a | n/a | 0.085 | 4.833 | 0.005 | 0.085 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d3300000000000020fc | 1004.141 | 4.561 | n/a | 0.000 | 0.000 | 0.397 | 999.016 | 0.091 | n/a | 0.020 | 0.000 | n/a | n/a | 0.057 | 4.561 | 0.005 | 0.057 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000002102 | 1002.272 | 0.156 | n/a | 0.000 | 0.000 | 0.434 | 1000.513 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 1.120 | 0.156 | 0.000 | 1.120 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000020b3 | 1002.269 | 0.105 | n/a | 0.000 | 0.000 | 0.299 | 1000.737 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 1.088 | 0.105 | 0.000 | 1.088 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000020c9 | 999.517 | 2.763 | n/a | 0.000 | 0.000 | 0.377 | 996.295 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.051 | 2.763 | 0.003 | 0.051 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d3300000000000020e8 | 998.297 | 3.840 | n/a | 0.000 | 0.000 | 0.410 | 993.873 | 0.083 | n/a | 0.025 | 0.000 | n/a | n/a | 0.066 | 3.840 | 0.004 | 0.066 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000020a9 | 996.931 | 2.821 | n/a | 0.000 | 0.000 | 0.341 | 993.687 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.052 | 2.821 | 0.003 | 0.052 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d33000000000000210f | 995.787 | 2.164 | n/a | 0.000 | 0.000 | 2.309 | 991.146 | 0.080 | n/a | 0.032 | 0.000 | n/a | n/a | 0.056 | 2.164 | 0.002 | 0.056 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000002109 | 991.823 | 2.197 | n/a | 0.000 | 0.000 | 0.398 | 989.121 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.070 | 2.197 | 0.002 | 0.070 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000002095 | 925.507 | 2.926 | n/a | 0.000 | 0.000 | 0.720 | 921.643 | 0.100 | n/a | 0.031 | 0.000 | n/a | n/a | 0.087 | 2.926 | 0.003 | 0.087 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000002121 | 907.486 | 2.533 | n/a | 0.000 | 0.000 | 0.580 | 904.196 | 0.077 | n/a | 0.031 | 0.000 | n/a | n/a | 0.070 | 2.533 | 0.003 | 0.070 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d33000000000000212e | 882.326 | 2.749 | n/a | 0.000 | 0.000 | 0.545 | 878.933 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.052 | 2.749 | 0.003 | 0.052 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d3300000000000020f7 | 857.534 | 5.148 | n/a | 0.000 | 0.000 | 0.353 | 851.851 | 0.085 | n/a | 0.023 | 0.000 | n/a | n/a | 0.074 | 5.148 | 0.006 | 0.074 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000002133 | 850.237 | 3.177 | n/a | 0.000 | 0.000 | 0.325 | 846.544 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.156 | 3.177 | 0.004 | 0.156 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000002124 | 833.251 | 7.490 | n/a | 0.939 | 0.000 | 0.525 | 823.724 | 0.400 | n/a | 0.023 | 0.000 | n/a | n/a | 0.149 | 8.429 | 0.010 | 0.149 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000020db | 789.931 | 3.295 | n/a | 0.000 | 0.000 | 4.438 | 782.078 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.085 | 3.295 | 0.004 | 0.085 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d3300000000000020c2 | 784.103 | 2.678 | n/a | 0.000 | 0.000 | 0.421 | 780.697 | 0.083 | n/a | 0.029 | 0.000 | n/a | n/a | 0.194 | 2.678 | 0.003 | 0.194 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d3300000000000020a7 | 759.075 | 4.403 | n/a | 0.000 | 0.000 | 0.610 | 753.966 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.061 | 4.403 | 0.006 | 0.061 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000020af | 757.889 | 3.743 | n/a | 0.000 | 0.000 | 0.349 | 753.606 | 0.098 | n/a | 0.024 | 0.000 | n/a | n/a | 0.070 | 3.743 | 0.005 | 0.070 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000020ca | 746.696 | 3.084 | n/a | 0.000 | 0.000 | 0.387 | 743.066 | 0.081 | n/a | 0.022 | 0.000 | n/a | n/a | 0.055 | 3.084 | 0.004 | 0.055 | gw-r/thread-48/journal/page | none observed |

## P3 / sweep / internal (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 453.960 | n/a | n/a | n/a | 3.011 | n/a | 0.000 | 0.000 | 0.408 | 449.333 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.094 | 3.011 | 0.011 | 0.094 |
| p99 | 1002.324 | n/a | n/a | n/a | 19.431 | n/a | 1.439 | 0.000 | 1.323 | 1000.705 | 0.235 | n/a | 0.057 | 0.000 | n/a | n/a | 38.931 | 19.431 | 0.864 | 38.931 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d33000000000000214e | 1002.324 | 0.110 | n/a | 0.000 | 0.000 | 0.355 | 1000.705 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 1.091 | 0.110 | 0.000 | 1.091 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d3300000000000021b3 | 1002.264 | 0.096 | n/a | 0.000 | 0.000 | 0.399 | 1000.577 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 1.143 | 0.096 | 0.000 | 1.143 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000002141 | 1002.149 | 0.098 | n/a | 0.000 | 0.000 | 0.310 | 1000.594 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 1.092 | 0.098 | 0.000 | 1.092 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d3300000000000021ac | 1001.119 | 2.162 | n/a | 0.000 | 0.000 | 0.342 | 998.443 | 0.074 | n/a | 0.037 | 0.000 | n/a | n/a | 0.061 | 2.162 | 0.002 | 0.061 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000002162 | 999.667 | 3.011 | n/a | 0.000 | 0.000 | 0.424 | 995.982 | 0.109 | n/a | 0.020 | 0.000 | n/a | n/a | 0.122 | 3.011 | 0.003 | 0.122 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d3300000000000021a8 | 999.387 | 4.474 | n/a | 0.000 | 0.000 | 1.323 | 993.225 | 0.235 | n/a | 0.041 | 0.000 | n/a | n/a | 0.089 | 4.474 | 0.004 | 0.089 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000002186 | 998.079 | 2.136 | n/a | 0.000 | 0.000 | 0.391 | 995.437 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.066 | 2.136 | 0.002 | 0.066 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000002156 | 997.936 | 2.604 | n/a | 0.000 | 0.000 | 0.412 | 994.823 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.061 | 2.604 | 0.003 | 0.061 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d33000000000000214d | 997.457 | 2.485 | n/a | 0.000 | 0.000 | 0.399 | 994.399 | 0.087 | n/a | 0.029 | 0.000 | n/a | n/a | 0.057 | 2.485 | 0.002 | 0.057 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000002185 | 996.393 | 2.399 | n/a | 0.000 | 0.000 | 0.452 | 993.431 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.062 | 2.399 | 0.002 | 0.062 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000002140 | 996.186 | 2.849 | n/a | 0.000 | 0.000 | 0.270 | 992.810 | 0.163 | n/a | 0.031 | 0.000 | n/a | n/a | 0.063 | 2.849 | 0.003 | 0.063 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d33000000000000214c | 995.297 | 2.330 | n/a | 0.000 | 0.000 | 0.364 | 992.522 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.052 | 2.330 | 0.002 | 0.052 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000002163 | 991.408 | 2.632 | n/a | 0.000 | 0.000 | 0.365 | 988.188 | 0.106 | n/a | 0.039 | 0.000 | n/a | n/a | 0.078 | 2.632 | 0.003 | 0.078 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000002143 | 990.580 | 2.873 | n/a | 0.000 | 0.000 | 0.344 | 987.268 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.057 | 2.873 | 0.003 | 0.057 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d3300000000000021ad | 990.174 | 2.406 | n/a | 0.000 | 0.000 | 0.261 | 987.389 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.089 | 2.406 | 0.002 | 0.089 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d3300000000000021b5 | 986.603 | 2.412 | n/a | 0.000 | 0.000 | 0.301 | 983.731 | 0.073 | n/a | 0.035 | 0.000 | n/a | n/a | 0.050 | 2.412 | 0.002 | 0.050 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d3300000000000021a6 | 962.042 | 2.159 | n/a | 0.000 | 0.000 | 0.317 | 959.485 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.059 | 2.159 | 0.002 | 0.059 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000021a9 | 961.155 | 3.391 | n/a | 0.000 | 0.000 | 0.547 | 957.000 | 0.088 | n/a | 0.033 | 0.000 | n/a | n/a | 0.096 | 3.391 | 0.004 | 0.096 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d33000000000000215f | 928.654 | 3.698 | n/a | 0.000 | 0.000 | 0.405 | 924.297 | 0.097 | n/a | 0.040 | 0.000 | n/a | n/a | 0.117 | 3.698 | 0.004 | 0.117 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d3300000000000021a2 | 923.290 | 11.740 | n/a | 1.312 | 0.000 | 0.614 | 908.789 | 0.206 | n/a | 0.038 | 0.000 | n/a | n/a | 0.590 | 13.052 | 0.014 | 0.590 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / internal (3084 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.928 | n/a | n/a | n/a | 4.986 | n/a | 0.000 | 0.000 | 0.253 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.016 | 5.001 | 0.398 | 5.016 |
| p99 | 998.285 | n/a | n/a | n/a | 31.227 | n/a | 3.342 | 0.000 | 1.999 | 994.373 | 0.128 | n/a | 0.045 | 0.000 | n/a | n/a | 46.915 | 32.590 | 0.873 | 46.915 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f31aa36de17c4d330000000000003a4c | 1006.373 | 5.082 | n/a | 0.000 | 0.000 | 0.419 | 1000.732 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.105 | 5.082 | 0.005 | 0.105 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000002204 | 1005.857 | 5.487 | n/a | 0.000 | 0.000 | 0.482 | 999.763 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 0.090 | 5.487 | 0.005 | 0.090 | gw-r/thread-46/journal/page | none observed |
| f31aa36de17c4d330000000000003a1e | 1005.837 | 5.581 | n/a | 0.000 | 0.000 | 0.425 | 999.676 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.118 | 5.581 | 0.006 | 0.118 | gw-r/thread-81/journal/page | none observed |
| f31aa36de17c4d3300000000000021cb | 1005.160 | 5.266 | n/a | 0.000 | 0.000 | 0.402 | 999.249 | 0.101 | n/a | 0.026 | 0.000 | n/a | n/a | 0.116 | 5.266 | 0.005 | 0.116 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000003a89 | 1004.656 | 3.453 | n/a | 0.000 | 0.000 | 0.296 | 1000.802 | 0.012 | n/a | 0.028 | 0.000 | n/a | n/a | 0.064 | 3.453 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000003a2e | 1004.418 | 5.469 | n/a | 0.000 | 0.000 | 0.479 | 998.249 | 0.095 | n/a | 0.029 | 0.000 | n/a | n/a | 0.099 | 5.469 | 0.005 | 0.099 | gw-r/thread-81/journal/page | none observed |
| f31aa36de17c4d330000000000003a12 | 1003.576 | 3.103 | n/a | 0.000 | 0.000 | 0.453 | 999.914 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.062 | 3.103 | 0.003 | 0.062 | gw-r/thread-49/journal/page | none observed |
| f31aa36de17c4d330000000000003a36 | 1003.515 | 4.137 | n/a | 0.000 | 0.000 | 0.411 | 998.805 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.114 | 4.137 | 0.004 | 0.114 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000039c5 | 1002.550 | 0.114 | n/a | 0.000 | 0.000 | 0.412 | 1000.842 | 0.013 | n/a | 0.060 | 0.000 | n/a | n/a | 1.109 | 0.114 | 0.000 | 1.109 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d3300000000000021de | 1002.530 | 0.209 | n/a | 0.000 | 0.000 | 0.485 | 1000.641 | 0.017 | n/a | 0.061 | 0.000 | n/a | n/a | 1.117 | 0.209 | 0.000 | 1.117 | gw-r/thread-47/journal/page | none observed |
| f31aa36de17c4d330000000000003a15 | 1002.414 | 0.152 | n/a | 0.000 | 0.000 | 0.434 | 1000.662 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 1.108 | 0.152 | 0.000 | 1.108 | gw-r/thread-79/journal/page | none observed |
| f31aa36de17c4d330000000000003b31 | 1002.380 | 0.131 | n/a | 0.000 | 0.000 | 0.491 | 1000.600 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 1.105 | 0.131 | 0.000 | 1.105 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d330000000000003a17 | 1002.377 | 0.185 | n/a | 0.000 | 0.000 | 0.445 | 1000.580 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 1.126 | 0.185 | 0.000 | 1.126 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000003a0f | 1002.338 | 0.113 | n/a | 0.000 | 0.000 | 0.392 | 1000.630 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 1.107 | 0.113 | 0.000 | 1.107 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000003a27 | 1002.255 | 0.101 | n/a | 0.000 | 0.000 | 0.431 | 1000.575 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 1.092 | 0.101 | 0.000 | 1.092 | gw-r/thread-44/journal/page | none observed |
| f31aa36de17c4d3300000000000021c1 | 1002.062 | 0.099 | n/a | 0.000 | 0.000 | 0.309 | 1000.504 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 1.098 | 0.099 | 0.000 | 1.098 | gw-r/thread-45/journal/page | none observed |
| f31aa36de17c4d330000000000003b1b | 1002.019 | 0.086 | n/a | 0.000 | 0.000 | 0.367 | 1000.433 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 1.089 | 0.086 | 0.000 | 1.089 | gw-r/thread-79/journal/page | none observed |
| f31aa36de17c4d3300000000000021fd | 1001.564 | 3.135 | n/a | 0.000 | 0.000 | 0.359 | 997.857 | 0.111 | n/a | 0.035 | 0.000 | n/a | n/a | 0.067 | 3.135 | 0.003 | 0.067 | gw-r/thread-50/journal/page | none observed |
| f31aa36de17c4d330000000000003a50 | 1001.516 | 2.844 | n/a | 0.000 | 0.000 | 0.372 | 997.971 | 0.199 | n/a | 0.055 | 0.000 | n/a | n/a | 0.075 | 2.844 | 0.003 | 0.075 | gw-r/thread-48/journal/page | none observed |
| f31aa36de17c4d330000000000003aeb | 1001.496 | 3.123 | n/a | 0.000 | 0.000 | 1.184 | 996.979 | 0.127 | n/a | 0.033 | 0.000 | n/a | n/a | 0.050 | 3.123 | 0.003 | 0.050 | gw-r/thread-79/journal/page | none observed |

## P3 / warmup / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.065 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.346 | 201.403 | 0.037 | n/a | 0.170 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 |
| p99 | 228.187 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.916 | 225.966 | 2.425 | n/a | 7.864 | 0.000 | n/a | n/a | 1.166 | 0.000 | 0.000 | 1.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d6000000000000001c | 228.187 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 225.966 | 0.034 | n/a | 1.015 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000015 | 222.336 | 0.000 | n/a | 0.000 | 0.000 | 1.743 | 212.291 | 0.200 | n/a | 7.864 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000013 | 214.748 | 0.000 | n/a | 0.000 | 0.000 | 6.318 | 207.441 | 0.100 | n/a | 0.514 | 0.000 | n/a | n/a | 0.374 | 0.000 | 0.000 | 0.374 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000021 | 211.470 | 0.000 | n/a | 0.000 | 0.000 | 6.439 | 204.395 | 0.031 | n/a | 0.285 | 0.000 | n/a | n/a | 0.319 | 0.000 | 0.000 | 0.319 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000058 | 209.889 | 0.000 | n/a | 0.000 | 0.000 | 1.728 | 207.624 | 0.074 | n/a | 0.196 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000056 | 208.190 | 0.000 | n/a | 0.000 | 0.000 | 5.436 | 202.213 | 0.228 | n/a | 0.153 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000012 | 207.518 | 0.000 | n/a | 0.000 | 0.000 | 1.419 | 204.335 | 1.382 | n/a | 0.183 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000016 | 207.169 | 0.000 | n/a | 0.000 | 0.000 | 2.976 | 203.508 | 0.080 | n/a | 0.296 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000000e | 206.453 | 0.000 | n/a | 0.000 | 0.000 | 3.483 | 202.281 | 0.036 | n/a | 0.446 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000011 | 205.850 | 0.000 | n/a | 0.000 | 0.000 | 3.470 | 201.870 | 0.112 | n/a | 0.173 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000010 | 205.286 | 0.000 | n/a | 0.000 | 0.000 | 1.457 | 203.275 | 0.085 | n/a | 0.215 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000002c | 204.707 | 0.000 | n/a | 0.000 | 0.000 | 1.593 | 202.514 | 0.146 | n/a | 0.219 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000045 | 204.534 | 0.000 | n/a | 0.000 | 0.000 | 1.706 | 202.248 | 0.089 | n/a | 0.244 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000001d | 204.291 | 0.000 | n/a | 0.000 | 0.000 | 1.179 | 202.541 | 0.087 | n/a | 0.261 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000022 | 204.152 | 0.000 | n/a | 0.000 | 0.000 | 2.371 | 201.415 | 0.021 | n/a | 0.146 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000004a | 204.007 | 0.000 | n/a | 0.000 | 0.000 | 1.584 | 201.863 | 0.101 | n/a | 0.163 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000002e | 203.870 | 0.000 | n/a | 0.000 | 0.000 | 1.387 | 202.014 | 0.062 | n/a | 0.236 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000002d | 203.868 | 0.000 | n/a | 0.000 | 0.000 | 1.596 | 201.430 | 0.025 | n/a | 0.315 | 0.000 | n/a | n/a | 0.501 | 0.000 | 0.000 | 0.501 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000028 | 203.859 | 0.000 | n/a | 0.000 | 0.000 | 1.557 | 201.919 | 0.012 | n/a | 0.161 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000039 | 203.793 | 0.000 | n/a | 0.000 | 0.000 | 1.567 | 201.844 | 0.045 | n/a | 0.170 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-45/journal/page | none observed |

## P3 / baseline / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.294 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 201.042 | 0.014 | n/a | 0.100 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 |
| p99 | 227.702 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 14.483 | 213.475 | 3.367 | n/a | 0.868 | 0.000 | n/a | n/a | 0.758 | 0.000 | 0.000 | 0.758 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d600000000000000ba | 279.925 | 0.000 | n/a | 0.000 | 0.000 | 75.935 | 203.250 | 0.037 | n/a | 0.192 | 0.000 | n/a | n/a | 0.510 | 0.000 | 0.000 | 0.510 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000084 | 232.388 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 214.528 | 2.272 | n/a | 14.645 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000000b9 | 227.702 | 0.000 | n/a | 0.000 | 0.000 | 14.483 | 212.430 | 0.173 | n/a | 0.120 | 0.000 | n/a | n/a | 0.497 | 0.000 | 0.000 | 0.497 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000000bd | 218.825 | 0.000 | n/a | 0.000 | 0.000 | 4.116 | 213.475 | 0.113 | n/a | 0.334 | 0.000 | n/a | n/a | 0.787 | 0.000 | 0.000 | 0.787 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000009d | 217.342 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 215.997 | 0.090 | n/a | 0.354 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000089 | 214.783 | 0.000 | n/a | 0.000 | 0.000 | 1.416 | 212.870 | 0.012 | n/a | 0.173 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000008c | 214.569 | 0.000 | n/a | 0.000 | 0.000 | 9.592 | 204.407 | 0.041 | n/a | 0.279 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000006b | 206.622 | 0.000 | n/a | 0.000 | 0.000 | 1.914 | 203.742 | 0.033 | n/a | 0.460 | 0.000 | n/a | n/a | 0.473 | 0.000 | 0.000 | 0.473 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000008a | 206.356 | 0.000 | n/a | 0.000 | 0.000 | 4.252 | 201.573 | 0.044 | n/a | 0.164 | 0.000 | n/a | n/a | 0.322 | 0.000 | 0.000 | 0.322 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000133 | 206.313 | 0.000 | n/a | 0.000 | 0.000 | 1.487 | 204.205 | 0.013 | n/a | 0.448 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000067 | 206.115 | 0.000 | n/a | 0.000 | 0.000 | 1.448 | 203.462 | 0.773 | n/a | 0.219 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000000cd | 205.690 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 204.515 | 0.018 | n/a | 0.237 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000116 | 205.347 | 0.000 | n/a | 0.000 | 0.000 | 2.061 | 202.948 | 0.010 | n/a | 0.120 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000075 | 205.179 | 0.000 | n/a | 0.000 | 0.000 | 1.395 | 203.413 | 0.011 | n/a | 0.167 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000115 | 205.026 | 0.000 | n/a | 0.000 | 0.000 | 3.043 | 201.679 | 0.010 | n/a | 0.137 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000112 | 204.952 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 203.641 | 0.007 | n/a | 0.102 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000064 | 204.901 | 0.000 | n/a | 0.000 | 0.000 | 1.014 | 203.036 | 0.072 | n/a | 0.364 | 0.000 | n/a | n/a | 0.414 | 0.000 | 0.000 | 0.414 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000113 | 204.764 | 0.000 | n/a | 0.000 | 0.000 | 1.170 | 202.470 | 0.034 | n/a | 0.868 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000086 | 204.490 | 0.000 | n/a | 0.000 | 0.000 | 1.940 | 202.125 | 0.014 | n/a | 0.218 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000000f1 | 204.371 | 0.000 | n/a | 0.000 | 0.000 | 2.796 | 201.317 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |

## P3 / L1 / read (221 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.622 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 200.758 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 204.666 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.379 | 201.740 | 3.906 | n/a | 0.170 | 0.000 | n/a | n/a | 0.464 | 0.000 | 0.000 | 0.464 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000000192 | 206.521 | 0.000 | n/a | 0.000 | 0.000 | 5.027 | 201.275 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000194 | 205.088 | 0.000 | n/a | 0.000 | 0.000 | 3.446 | 201.095 | 0.027 | n/a | 0.164 | 0.000 | n/a | n/a | 0.357 | 0.000 | 0.000 | 0.357 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001ef | 204.666 | 0.000 | n/a | 0.000 | 0.000 | 1.528 | 201.740 | 0.022 | n/a | 0.089 | 0.000 | n/a | n/a | 1.288 | 0.000 | 0.000 | 1.288 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001ed | 203.529 | 0.000 | n/a | 0.000 | 0.000 | 1.221 | 201.902 | 0.010 | n/a | 0.166 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001ee | 203.293 | 0.000 | n/a | 0.000 | 0.000 | 1.518 | 201.532 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000196 | 202.903 | 0.000 | n/a | 0.000 | 0.000 | 0.941 | 201.446 | 0.018 | n/a | 0.391 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001ec | 202.898 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 201.742 | 0.020 | n/a | 0.170 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000021b | 202.800 | 0.000 | n/a | 0.000 | 0.000 | 1.014 | 201.485 | 0.020 | n/a | 0.093 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000190 | 202.727 | 0.000 | n/a | 0.000 | 0.000 | 1.448 | 201.056 | 0.006 | n/a | 0.082 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001a2 | 202.621 | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 200.893 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 1.035 | 0.000 | 0.000 | 1.035 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000015f | 202.484 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 201.197 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000024e | 202.471 | 0.000 | n/a | 0.000 | 0.000 | 1.490 | 200.644 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.279 | 0.000 | 0.000 | 0.279 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001f2 | 202.437 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 201.294 | 0.009 | n/a | 0.105 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001b3 | 202.376 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 201.284 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000017c | 202.343 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 201.231 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001bc | 202.335 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 200.963 | 0.020 | n/a | 0.051 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000016f | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 201.145 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000187 | 202.301 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 201.251 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001f1 | 202.257 | 0.000 | n/a | 0.000 | 0.000 | 0.996 | 201.000 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000001bf | 202.246 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 201.314 | 0.155 | n/a | 0.083 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / read (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.398 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 76.534 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 |
| p99 | 202.685 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.115 | 201.765 | 2.726 | n/a | 0.155 | 0.000 | n/a | n/a | 50.024 | 0.000 | 0.000 | 50.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000000253 | 203.930 | 0.000 | n/a | 0.000 | 0.000 | 1.736 | 201.765 | 0.025 | n/a | 0.209 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000279 | 202.685 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 201.807 | 0.012 | n/a | 0.088 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000266 | 202.395 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 201.454 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000026c | 202.194 | 0.000 | n/a | 0.000 | 0.000 | 1.119 | 200.837 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000026f | 202.177 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 200.954 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000026a | 202.151 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 200.860 | 0.015 | n/a | 0.088 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000271 | 202.081 | 0.000 | n/a | 0.000 | 0.000 | 1.242 | 200.698 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000261 | 202.058 | 0.000 | n/a | 0.000 | 0.000 | 0.665 | 201.086 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000028a | 201.971 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 201.144 | 0.006 | n/a | 0.084 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000291 | 201.958 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 201.062 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000272 | 201.918 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 200.890 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000025e | 201.915 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 200.780 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000278 | 201.912 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 200.907 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000258 | 201.871 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 200.862 | 0.018 | n/a | 0.066 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000026e | 201.842 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 200.943 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000295 | 201.833 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 200.712 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000028f | 201.780 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 200.899 | 0.011 | n/a | 0.054 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000254 | 201.771 | 0.000 | n/a | 0.000 | 0.000 | 0.538 | 201.044 | 0.013 | n/a | 0.071 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000269 | 201.745 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 200.946 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000256 | 201.708 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 200.706 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (146 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 114.814 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.483 | 113.345 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 202.395 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.109 | 201.014 | 2.661 | n/a | 0.151 | 0.000 | n/a | n/a | 50.143 | 0.000 | 0.000 | 50.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000000e6a | 203.292 | 0.000 | n/a | 0.000 | 0.000 | 2.407 | 200.672 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e3c | 202.395 | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 201.421 | 0.012 | n/a | 0.269 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e82 | 201.976 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 201.014 | 0.021 | n/a | 0.076 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e40 | 201.964 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 200.901 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e89 | 201.685 | 0.000 | n/a | 0.000 | 0.000 | 0.611 | 200.910 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e70 | 201.656 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 200.779 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e8c | 201.650 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 200.769 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e78 | 201.626 | 0.000 | n/a | 0.000 | 0.000 | 0.391 | 201.011 | 0.013 | n/a | 0.053 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e71 | 201.554 | 0.000 | n/a | 0.000 | 0.000 | 0.645 | 200.775 | 0.003 | n/a | 0.042 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e4b | 201.541 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 200.627 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e50 | 201.538 | 0.000 | n/a | 0.000 | 0.000 | 0.923 | 200.430 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e3f | 201.535 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 200.708 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e49 | 201.521 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 200.734 | 0.004 | n/a | 0.056 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e55 | 201.511 | 0.000 | n/a | 0.000 | 0.000 | 0.680 | 200.641 | 0.003 | n/a | 0.041 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e76 | 201.460 | 0.000 | n/a | 0.000 | 0.000 | 0.691 | 200.530 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e4d | 201.453 | 0.000 | n/a | 0.000 | 0.000 | 0.532 | 200.767 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e63 | 201.436 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 200.686 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e90 | 201.413 | 0.000 | n/a | 0.000 | 0.000 | 0.417 | 200.799 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e84 | 201.367 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 200.769 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000e6b | 201.360 | 0.000 | n/a | 0.000 | 0.000 | 0.523 | 200.700 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-44/journal/page | none observed |

## P3 / L64 / read (229 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.074 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.478 | 200.507 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 201.877 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.015 | 201.015 | 1.966 | n/a | 0.080 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000000f4f | 203.444 | 0.000 | n/a | 0.000 | 0.000 | 2.455 | 200.731 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f34 | 202.286 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 201.261 | 0.014 | n/a | 0.067 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f0e | 201.877 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 200.787 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f0b | 201.864 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 200.735 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000eeb | 201.841 | 0.000 | n/a | 0.000 | 0.000 | 0.645 | 201.015 | 0.018 | n/a | 0.048 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f8c | 201.793 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 201.039 | 0.019 | n/a | 0.068 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000ef8 | 201.792 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.711 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f49 | 201.778 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 200.744 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f93 | 201.719 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 200.829 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f70 | 201.716 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 200.870 | 0.013 | n/a | 0.068 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f22 | 201.686 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.713 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000ed3 | 201.679 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 200.872 | 0.018 | n/a | 0.104 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000eb5 | 201.655 | 0.000 | n/a | 0.000 | 0.000 | 0.612 | 200.868 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000ea8 | 201.654 | 0.000 | n/a | 0.000 | 0.000 | 0.565 | 200.906 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f39 | 201.647 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 200.862 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000eee | 201.618 | 0.000 | n/a | 0.000 | 0.000 | 0.591 | 200.822 | 0.024 | n/a | 0.068 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f33 | 201.606 | 0.000 | n/a | 0.000 | 0.000 | 0.499 | 200.907 | 0.018 | n/a | 0.072 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000ea3 | 201.558 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 200.706 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000f1d | 201.542 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 200.802 | 0.021 | n/a | 0.053 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000ec4 | 201.542 | 0.000 | n/a | 0.000 | 0.000 | 0.480 | 200.871 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (232 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.128 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.498 | 200.531 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 202.832 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.723 | 201.006 | 2.624 | n/a | 0.083 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d6000000000000109d | 205.000 | 0.000 | n/a | 0.000 | 0.000 | 4.073 | 200.722 | 0.013 | n/a | 0.054 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000fb5 | 204.348 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 203.576 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000fce | 202.832 | 0.000 | n/a | 0.000 | 0.000 | 1.503 | 201.125 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000fb7 | 202.692 | 0.000 | n/a | 0.000 | 0.000 | 1.723 | 200.793 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000fa6 | 202.533 | 0.000 | n/a | 0.000 | 0.000 | 1.337 | 201.006 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000fc0 | 202.467 | 0.000 | n/a | 0.000 | 0.000 | 1.826 | 200.457 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001088 | 201.844 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 200.876 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000109b | 201.805 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 200.806 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000108c | 201.796 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 200.969 | 0.013 | n/a | 0.064 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000fc9 | 201.792 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 200.802 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001070 | 201.791 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 200.764 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000108b | 201.790 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 200.860 | 0.010 | n/a | 0.113 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000105f | 201.779 | 0.000 | n/a | 0.000 | 0.000 | 1.137 | 200.505 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001096 | 201.754 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 200.706 | 0.031 | n/a | 0.056 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001089 | 201.735 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 200.775 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000000fdf | 201.727 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 200.804 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001085 | 201.704 | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 200.905 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001036 | 201.680 | 0.000 | n/a | 0.000 | 0.000 | 0.517 | 200.992 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001062 | 201.677 | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 200.968 | 0.014 | n/a | 0.067 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001086 | 201.672 | 0.000 | n/a | 0.000 | 0.000 | 0.490 | 200.976 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |

## P3 / L1024 / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.272 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 200.546 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 |
| p99 | 202.123 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 201.420 | 2.200 | n/a | 0.106 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000001100 | 204.062 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 203.314 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010c4 | 202.274 | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 201.502 | 0.012 | n/a | 0.177 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010e5 | 202.123 | 0.000 | n/a | 0.000 | 0.000 | 0.939 | 200.912 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010f5 | 202.109 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 201.420 | 0.013 | n/a | 0.054 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001163 | 202.104 | 0.000 | n/a | 0.000 | 0.000 | 1.211 | 200.688 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001184 | 202.048 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 201.332 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010b6 | 202.042 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 201.050 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010f0 | 202.022 | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 201.003 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000117b | 201.990 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 200.723 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.315 | 0.000 | 0.000 | 0.315 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000011a4 | 201.969 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 201.239 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010d1 | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 200.948 | 0.010 | n/a | 0.135 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010c7 | 201.915 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 200.617 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001196 | 201.906 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 200.994 | 0.014 | n/a | 0.094 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010f1 | 201.898 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 201.081 | 0.019 | n/a | 0.072 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010e0 | 201.827 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 200.842 | 0.014 | n/a | 0.053 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001141 | 201.826 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 200.788 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000119b | 201.790 | 0.000 | n/a | 0.000 | 0.000 | 0.589 | 200.987 | 0.018 | n/a | 0.082 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000118a | 201.768 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 200.729 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000010a3 | 201.760 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.683 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001140 | 201.758 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 200.814 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-47/journal/page | none observed |

## P3 / recovery / read (310 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.212 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 200.523 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 202.474 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.297 | 201.149 | 3.650 | n/a | 0.125 | 0.000 | n/a | n/a | 0.289 | 0.000 | 0.000 | 0.289 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000001223 | 240.570 | 0.000 | n/a | 0.000 | 0.000 | 0.337 | 240.075 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000012a0 | 206.703 | 0.000 | n/a | 0.000 | 0.000 | 6.117 | 200.445 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001268 | 202.513 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 201.390 | 0.009 | n/a | 0.109 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000011b8 | 202.474 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 200.574 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 1.124 | 0.000 | 0.000 | 1.124 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000011df | 202.459 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.223 | 0.007 | n/a | 0.125 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001262 | 202.397 | 0.000 | n/a | 0.000 | 0.000 | 1.106 | 201.075 | 0.014 | n/a | 0.096 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001218 | 202.296 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.044 | 0.006 | n/a | 0.084 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000011e4 | 202.207 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 200.658 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000011ba | 202.181 | 0.000 | n/a | 0.000 | 0.000 | 1.065 | 200.902 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001214 | 202.153 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 200.984 | 0.043 | n/a | 0.087 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001250 | 202.106 | 0.000 | n/a | 0.000 | 0.000 | 0.903 | 200.972 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001298 | 202.094 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 201.105 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000011b2 | 202.087 | 0.000 | n/a | 0.000 | 0.000 | 1.309 | 200.618 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000011ad | 202.063 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.044 | 0.018 | n/a | 0.080 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001297 | 202.028 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 201.005 | 0.014 | n/a | 0.148 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000011c5 | 202.011 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 200.760 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000129c | 201.998 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 201.008 | 0.077 | n/a | 0.045 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001256 | 201.995 | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 201.007 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001247 | 201.991 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 200.670 | 0.004 | n/a | 0.060 | 0.000 | n/a | n/a | 0.453 | 0.000 | 0.000 | 0.453 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001263 | 201.977 | 0.000 | n/a | 0.000 | 0.000 | 0.950 | 200.797 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |

## P3 / p4mix / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.127 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.493 | 200.508 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 202.496 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 201.265 | 2.620 | n/a | 0.107 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d6000000000000130c | 211.068 | 0.000 | n/a | 0.000 | 0.000 | 10.334 | 200.519 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013a2 | 203.993 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 200.573 | 2.557 | n/a | 0.037 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001338 | 202.496 | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 201.532 | 0.004 | n/a | 0.092 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013a3 | 202.153 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 201.085 | 0.013 | n/a | 0.175 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013ba | 202.144 | 0.000 | n/a | 0.000 | 0.000 | 0.438 | 201.265 | 0.074 | n/a | 0.171 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000131e | 201.939 | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 200.592 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013a7 | 201.929 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 200.880 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013e1 | 201.918 | 0.000 | n/a | 0.000 | 0.000 | 0.382 | 201.301 | 0.033 | n/a | 0.096 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001345 | 201.880 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 200.905 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013a6 | 201.878 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 200.924 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000132c | 201.843 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.766 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013fc | 201.836 | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 200.598 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000131c | 201.774 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 201.043 | 0.024 | n/a | 0.072 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001320 | 201.695 | 0.000 | n/a | 0.000 | 0.000 | 0.513 | 200.995 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000132f | 201.682 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 200.862 | 0.007 | n/a | 0.107 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001343 | 201.649 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 200.816 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013b8 | 201.639 | 0.000 | n/a | 0.000 | 0.000 | 0.972 | 200.514 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000138d | 201.623 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 200.575 | 0.004 | n/a | 0.056 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013d4 | 201.614 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 200.544 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000013cd | 201.608 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 200.776 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h1 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.138 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.451 | 200.513 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 |
| p99 | 203.281 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.240 | 201.028 | 3.085 | n/a | 0.100 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d600000000000014d2 | 228.083 | 0.000 | n/a | 0.000 | 0.000 | 27.249 | 200.691 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001495 | 207.236 | 0.000 | n/a | 0.000 | 0.000 | 6.585 | 200.495 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000144d | 203.281 | 0.000 | n/a | 0.000 | 0.000 | 0.460 | 200.580 | 2.125 | n/a | 0.025 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000014fb | 202.349 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 201.012 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000014bd | 202.067 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 201.028 | 0.018 | n/a | 0.262 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000142f | 202.061 | 0.000 | n/a | 0.000 | 0.000 | 0.316 | 201.553 | 0.009 | n/a | 0.093 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001434 | 202.045 | 0.000 | n/a | 0.000 | 0.000 | 0.400 | 201.465 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000014fe | 201.931 | 0.000 | n/a | 0.000 | 0.000 | 1.045 | 200.642 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001492 | 201.877 | 0.000 | n/a | 0.000 | 0.000 | 0.591 | 201.024 | 0.009 | n/a | 0.107 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000140d | 201.839 | 0.000 | n/a | 0.000 | 0.000 | 1.240 | 200.428 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001475 | 201.809 | 0.000 | n/a | 0.000 | 0.000 | 0.591 | 200.947 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001444 | 201.785 | 0.000 | n/a | 0.000 | 0.000 | 1.116 | 200.494 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001487 | 201.783 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 200.695 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000014d7 | 201.758 | 0.000 | n/a | 0.000 | 0.000 | 0.675 | 200.882 | 0.014 | n/a | 0.069 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000014f4 | 201.705 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 200.756 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001459 | 201.704 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 200.641 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000144c | 201.697 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 200.517 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.395 | 0.000 | 0.000 | 0.395 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000014ad | 201.678 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 200.737 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001500 | 201.665 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 200.796 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001467 | 201.639 | 0.000 | n/a | 0.000 | 0.000 | 0.454 | 200.967 | 0.008 | n/a | 0.100 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |

## P3 / grow3 / read (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 194.526 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 187.895 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 |
| p99 | 239.313 | n/a | n/a | n/a | 0.938 | n/a | 0.000 | 0.000 | 2.787 | 200.923 | 61.417 | n/a | 0.093 | 0.000 | n/a | n/a | 0.730 | 0.938 | 0.008 | 0.730 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000001521 | 239.313 | 0.000 | n/a | 0.000 | 0.000 | 0.710 | 179.334 | 58.711 | n/a | 0.033 | 0.000 | n/a | n/a | 0.524 | 0.000 | 0.000 | 0.524 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000152d | 202.151 | 0.754 | n/a | 0.000 | 0.000 | 2.787 | 198.439 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.136 | 0.754 | 0.004 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000150f | 201.819 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 200.735 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001517 | 201.799 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 200.772 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001520 | 201.743 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 200.923 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001530 | 201.592 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 200.512 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000152b | 201.585 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 200.569 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001519 | 201.486 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 200.790 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000150e | 201.424 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 200.704 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001525 | 201.416 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 200.569 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000150c | 201.345 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 200.607 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001512 | 201.290 | 0.000 | n/a | 0.000 | 0.000 | 0.518 | 200.630 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001526 | 201.274 | 0.000 | n/a | 0.000 | 0.000 | 0.494 | 200.565 | 0.007 | n/a | 0.093 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001513 | 201.251 | 0.000 | n/a | 0.000 | 0.000 | 0.434 | 200.658 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001529 | 201.208 | 0.000 | n/a | 0.000 | 0.000 | 0.499 | 200.540 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000151e | 201.166 | 0.000 | n/a | 0.000 | 0.000 | 0.444 | 200.550 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001523 | 201.098 | 0.000 | n/a | 0.000 | 0.000 | 0.442 | 200.512 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000152f | 196.164 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 194.965 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.546 | 0.000 | 0.000 | 0.546 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000152c | 194.526 | 0.514 | n/a | 0.000 | 0.000 | 0.656 | 168.951 | 24.280 | n/a | 0.030 | 0.000 | n/a | n/a | 0.095 | 0.514 | 0.003 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000153b | 192.542 | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 191.472 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.554 | 0.000 | 0.000 | 0.554 | gw-r/thread-44/journal/page | none observed |

## P3 / p4h3 / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.119 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 200.480 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 202.193 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.346 | 200.928 | 2.118 | n/a | 0.075 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000001544 | 203.624 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 202.795 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015b5 | 202.575 | 0.000 | n/a | 0.000 | 0.000 | 1.833 | 200.550 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001560 | 202.193 | 0.000 | n/a | 0.000 | 0.000 | 1.585 | 200.433 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015a6 | 201.871 | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 200.928 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015d6 | 201.796 | 0.000 | n/a | 0.000 | 0.000 | 1.185 | 200.475 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015ee | 201.771 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 200.750 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001613 | 201.752 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.912 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000161d | 201.729 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 200.481 | 0.003 | n/a | 0.051 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015d2 | 201.708 | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 200.843 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015a1 | 201.703 | 0.000 | n/a | 0.000 | 0.000 | 0.847 | 200.593 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015f9 | 201.667 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 200.865 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000157d | 201.635 | 0.000 | n/a | 0.000 | 0.000 | 1.076 | 200.435 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000158b | 201.569 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 200.779 | 0.004 | n/a | 0.077 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000162b | 201.537 | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 200.768 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015ad | 201.506 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 200.539 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015de | 201.505 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 200.677 | 0.004 | n/a | 0.064 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001586 | 201.503 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 200.765 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015fd | 201.494 | 0.000 | n/a | 0.000 | 0.000 | 0.597 | 200.671 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001630 | 201.487 | 0.000 | n/a | 0.000 | 0.000 | 0.356 | 200.951 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000015e2 | 201.485 | 0.000 | n/a | 0.000 | 0.000 | 0.443 | 200.849 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-44/journal/page | none observed |

## P3 / grow10 / read (77 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 147.270 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 143.962 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.463 | 0.000 | 0.000 | 0.463 |
| p99 | 215.608 | n/a | n/a | n/a | 7.953 | n/a | 0.000 | 0.000 | 7.373 | 201.183 | 30.979 | n/a | 0.227 | 0.000 | n/a | n/a | 49.590 | 7.953 | 0.043 | 49.590 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000001644 | 215.608 | 0.891 | n/a | 0.000 | 0.000 | 0.602 | 182.875 | 30.979 | n/a | 0.054 | 0.000 | n/a | n/a | 0.207 | 0.891 | 0.004 | 0.207 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000166b | 203.418 | 0.000 | n/a | 0.000 | 0.000 | 2.489 | 200.723 | 0.004 | n/a | 0.062 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016a4 | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 1.900 | 200.511 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001670 | 202.323 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 201.183 | 0.008 | n/a | 0.227 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000165f | 202.281 | 0.767 | n/a | 0.000 | 0.000 | 0.918 | 200.424 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.132 | 0.767 | 0.004 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001657 | 201.879 | 7.666 | n/a | 0.000 | 0.000 | 7.373 | 186.576 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.217 | 7.666 | 0.038 | 0.217 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000167c | 201.474 | 0.000 | n/a | 0.000 | 0.000 | 0.595 | 200.692 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001699 | 201.464 | 0.000 | n/a | 0.000 | 0.000 | 0.509 | 200.798 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001659 | 201.450 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 200.694 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000164b | 201.343 | 0.000 | n/a | 0.000 | 0.000 | 0.546 | 200.649 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001696 | 201.335 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 200.518 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001653 | 201.261 | 0.000 | n/a | 0.000 | 0.000 | 0.570 | 200.531 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001675 | 201.173 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 200.420 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001686 | 201.086 | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 200.480 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001684 | 201.001 | 0.000 | n/a | 0.000 | 0.000 | 0.337 | 200.534 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000166f | 200.591 | 0.000 | n/a | 0.000 | 0.000 | 1.957 | 198.024 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.568 | 0.000 | 0.000 | 0.568 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001661 | 199.297 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 198.023 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.487 | 0.000 | 0.000 | 0.487 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016a3 | 198.393 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 197.417 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.463 | 0.000 | 0.000 | 0.463 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001648 | 188.279 | 0.000 | n/a | 0.000 | 0.000 | 0.597 | 187.175 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.473 | 0.000 | 0.000 | 0.473 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001664 | 188.158 | 0.564 | n/a | 0.000 | 0.000 | 0.525 | 161.484 | 25.448 | n/a | 0.038 | 0.000 | n/a | n/a | 0.100 | 0.564 | 0.003 | 0.100 | gw-r/thread-46/journal/page | none observed |

## P3 / p4h10 / read (229 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.186 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 200.520 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 202.427 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.943 | 201.014 | 1.964 | n/a | 0.089 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d600000000000017b2 | 204.734 | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 203.922 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016da | 202.457 | 0.000 | n/a | 0.000 | 0.000 | 1.814 | 200.448 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000173d | 202.427 | 0.000 | n/a | 0.000 | 0.000 | 1.600 | 200.662 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016c1 | 202.203 | 0.000 | n/a | 0.000 | 0.000 | 1.466 | 200.536 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000017ae | 202.045 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 200.743 | 0.005 | n/a | 0.089 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001740 | 202.016 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 200.985 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000176e | 201.973 | 0.000 | n/a | 0.000 | 0.000 | 1.051 | 200.713 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001704 | 201.968 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 201.219 | 0.012 | n/a | 0.054 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001742 | 201.861 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 200.647 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.526 | 0.000 | 0.000 | 0.526 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001789 | 201.768 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 200.922 | 0.020 | n/a | 0.073 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000177e | 201.740 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 200.538 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000179d | 201.728 | 0.000 | n/a | 0.000 | 0.000 | 0.615 | 200.827 | 0.094 | n/a | 0.060 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001792 | 201.717 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 200.698 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016cd | 201.704 | 0.000 | n/a | 0.000 | 0.000 | 0.476 | 200.875 | 0.197 | n/a | 0.060 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000016f3 | 201.703 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 200.714 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001768 | 201.698 | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 201.014 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000175c | 201.688 | 0.000 | n/a | 0.000 | 0.000 | 0.545 | 200.959 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001767 | 201.687 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 200.505 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000172f | 201.669 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 200.843 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000178a | 201.664 | 0.000 | n/a | 0.000 | 0.000 | 0.679 | 200.727 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-49/journal/page | none observed |

## P3 / presweep / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.140 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.504 | 200.501 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 202.095 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 201.107 | 1.194 | n/a | 0.080 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d600000000000017d4 | 203.791 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 202.848 | 0.020 | n/a | 0.059 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000017c1 | 203.328 | 0.000 | n/a | 0.000 | 0.000 | 2.316 | 200.703 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000018b8 | 202.095 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 201.196 | 0.032 | n/a | 0.073 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000181f | 202.052 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 201.026 | 0.044 | n/a | 0.063 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000018bb | 202.052 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 201.028 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000017c0 | 202.016 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 201.107 | 0.031 | n/a | 0.080 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000017ee | 201.912 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 200.903 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000018ae | 201.844 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 201.101 | 0.018 | n/a | 0.059 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001846 | 201.796 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 200.726 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001869 | 201.792 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 200.841 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000185d | 201.696 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.644 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001862 | 201.672 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 200.672 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000017c3 | 201.669 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 200.805 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001889 | 201.659 | 0.000 | n/a | 0.000 | 0.000 | 0.966 | 200.529 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001875 | 201.648 | 0.000 | n/a | 0.000 | 0.000 | 0.597 | 200.872 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001811 | 201.646 | 0.000 | n/a | 0.000 | 0.000 | 1.134 | 200.337 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000017db | 201.639 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 200.796 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000018b0 | 201.594 | 0.000 | n/a | 0.000 | 0.000 | 0.700 | 200.714 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001864 | 201.593 | 0.000 | n/a | 0.000 | 0.000 | 0.624 | 200.764 | 0.014 | n/a | 0.058 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000017e3 | 201.591 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 200.750 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-44/journal/page | none observed |

## P3 / sweep / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.166 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 200.511 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 201.994 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.285 | 200.997 | 3.147 | n/a | 0.093 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d60000000000001906 | 202.871 | 0.000 | n/a | 0.000 | 0.000 | 1.421 | 201.218 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001904 | 202.159 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 201.040 | 0.045 | n/a | 0.072 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001982 | 201.994 | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 200.863 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000019aa | 201.952 | 0.000 | n/a | 0.000 | 0.000 | 1.285 | 200.525 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001909 | 201.825 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 200.897 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000018c8 | 201.821 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 200.848 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001914 | 201.781 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 200.853 | 0.006 | n/a | 0.145 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000195d | 201.756 | 0.000 | n/a | 0.000 | 0.000 | 0.568 | 200.981 | 0.017 | n/a | 0.063 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000191a | 201.749 | 0.000 | n/a | 0.000 | 0.000 | 0.700 | 200.853 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000194e | 201.716 | 0.000 | n/a | 0.000 | 0.000 | 0.477 | 200.997 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001922 | 201.710 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 200.703 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000019a2 | 201.688 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 200.797 | 0.004 | n/a | 0.065 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001936 | 201.681 | 0.000 | n/a | 0.000 | 0.000 | 0.593 | 200.855 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000018f6 | 201.679 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 200.480 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000199a | 201.678 | 0.000 | n/a | 0.000 | 0.000 | 0.709 | 200.762 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001919 | 201.659 | 0.000 | n/a | 0.000 | 0.000 | 0.560 | 200.898 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001990 | 201.656 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 200.983 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001971 | 201.632 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 200.807 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001941 | 201.625 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 200.803 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000018d2 | 201.600 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.873 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / read (929 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.037 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.470 | 200.478 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 202.243 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.652 | 201.097 | 2.625 | n/a | 0.095 | 0.000 | n/a | n/a | 50.172 | 0.000 | 0.000 | 50.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3b9cdcd227f9d4d600000000000028c1 | 219.854 | 0.000 | n/a | 0.000 | 0.000 | 18.953 | 200.734 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000026c8 | 205.547 | 0.000 | n/a | 0.000 | 0.000 | 1.656 | 202.972 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.864 | 0.000 | 0.000 | 0.864 | gw-r/thread-81/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000028e6 | 202.642 | 0.000 | n/a | 0.000 | 0.000 | 1.367 | 201.074 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000283a | 202.469 | 0.000 | n/a | 0.000 | 0.000 | 1.351 | 200.931 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000028fb | 202.342 | 0.000 | n/a | 0.000 | 0.000 | 1.274 | 200.673 | 0.015 | n/a | 0.050 | 0.000 | n/a | n/a | 0.330 | 0.000 | 0.000 | 0.330 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000270e | 202.331 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 201.317 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000272f | 202.307 | 0.000 | n/a | 0.000 | 0.000 | 0.486 | 201.586 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d6000000000000281b | 202.294 | 0.000 | n/a | 0.000 | 0.000 | 1.419 | 200.722 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000026c1 | 202.271 | 0.000 | n/a | 0.000 | 0.000 | 1.284 | 200.808 | 0.013 | n/a | 0.070 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000027fe | 202.243 | 0.000 | n/a | 0.000 | 0.000 | 1.652 | 200.435 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-79/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000002801 | 202.226 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 201.051 | 0.018 | n/a | 0.068 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000001a02 | 202.183 | 0.000 | n/a | 0.000 | 0.000 | 1.541 | 200.428 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-49/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000028d0 | 202.167 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 200.891 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000026d6 | 202.134 | 0.000 | n/a | 0.000 | 0.000 | 0.847 | 201.101 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000002761 | 202.102 | 0.000 | n/a | 0.000 | 0.000 | 1.245 | 200.698 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-79/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000028d9 | 202.097 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 200.901 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-48/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000002794 | 202.077 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 200.797 | 0.053 | n/a | 0.104 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 | gw-r/thread-50/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000002738 | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 1.183 | 200.729 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-79/journal/page | none observed |
| 3b9cdcd227f9d4d60000000000002923 | 202.053 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 201.147 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 3b9cdcd227f9d4d600000000000027e4 | 202.008 | 0.000 | n/a | 0.000 | 0.000 | 1.216 | 200.630 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

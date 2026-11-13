# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (196.370 ms, trace `5d330d6a85d3ff400000000000000116`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (203.198 ms, trace `5d330d6a85d3ff4000000000000000b5`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (119.995 ms, trace `5d330d6a85d3ff400000000000000117`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (110.471 ms, trace `5d330d6a85d3ff40000000000000013f`); `gw-w/thread-65/peer.transact-await (includes order/network/storage)` (101.432 ms, trace `5d330d6a85d3ff40000000000000013e`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-smoke-j`; source `4ad48894a9a6a214f5e2866fec5fb8ac31d2d831`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 82/82 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 82/82. Raw trace bytes: 767355.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 87 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1484.684 | 184.314 | 287.959 | 39 |
| baseline | 0 | 1977.253 | 108.583 | 12.388 | 44 |
| L1 | 1 | 1979.508 | 157.638 | 18.043 | 30 |
| L4 | 4 | 1979.164 | 263.123 | 210.606 | 44 |
| L16 | 16 | 1927.646 | 206.980 | 227.591 | 44 |
| L64 | 16 | 1932.876 | 237.877 | 265.955 | 44 |
| L256 | 16 | 1900.947 | 177.459 | 186.889 | 58 |
| L1024 | 16 | 1967.795 | 253.298 | 319.940 | 16 |
| recovery | 16 | 1959.644 | 238.902 | 258.269 | 44 |
| p4mix | 1 | 1977.612 | 42.229 | 20.536 | 43 |
| p4h1 | 1 | 1026.280 | 18.082 | 15.816 | 16 |
| grow3 | 0 | 414.560 | 17.416 | 0.279 | 36 |
| p4h3 | 1 | 2266.165 | 112.827 | 61.556 | 122 |
| grow10 | 0 | 244.321 | 37.282 | 20.518 | 22 |
| p4h10 | 1 | 1043.563 | 60.613 | 25.253 | 58 |
| presweep | 16 | 1028.474 | 94.332 | 153.592 | 30 |
| sweep | 16 | 125.754 | 33.797 | 10.106 | 113 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 5d330d6a85d3ff400000000000000116 | driver.queue.scheduler-late | 0.389 | none | 0 / 32 |
| 5d330d6a85d3ff400000000000000116 | driver.queue.scheduler-dispatch | 0.143 | none | 0 / 32 |

Observed active steps while trace 5d330d6a85d3ff400000000000000116 waited: []

| 5d330d6a85d3ff4000000000000000b5 | driver.queue.scheduler-late | 0.264 | none | 0 / 32 |
| 5d330d6a85d3ff4000000000000000b5 | driver.queue.scheduler-dispatch | 0.080 | none | 0 / 32 |

Observed active steps while trace 5d330d6a85d3ff4000000000000000b5 waited: []

| 5d330d6a85d3ff400000000000000117 | driver.queue.scheduler-dispatch | 0.114 | none | 1 / 32 |
| 5d330d6a85d3ff400000000000000117 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace 5d330d6a85d3ff400000000000000117 waited: []

| 5d330d6a85d3ff40000000000000013f | driver.queue.scheduler-dispatch | 0.006 | none | 9 / 32 |
| 5d330d6a85d3ff40000000000000013f | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace 5d330d6a85d3ff40000000000000013f waited: []

| 5d330d6a85d3ff40000000000000013e | driver.queue.scheduler-dispatch | 0.006 | none | 8 / 32 |
| 5d330d6a85d3ff40000000000000013e | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace 5d330d6a85d3ff40000000000000013e waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.488 | 1.003 | 0.000 | 1.054 | 8.241 | 0.013 | 0.000 | 0.073 | 1.290 | 6.884 | 0.105 | n/a | 0.526 | 13.808 | n/a | n/a | 0.062 | 9.230 | 0.284 | 0.062 |
| p99 | 62.118 | 4.634 | 0.000 | 5.010 | 34.627 | 0.919 | 0.000 | 1.223 | 3.527 | 11.038 | 0.240 | n/a | 0.735 | 24.674 | n/a | n/a | 0.323 | 35.362 | 0.569 | 0.323 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff400000000000000094 | 62.118 | 34.627 | 0.661 | 0.000 | 0.073 | 3.527 | 6.884 | 0.240 | n/a | 0.735 | 15.271 | n/a | n/a | 0.099 | 35.362 | 0.569 | 0.099 | node-14/thread-8/client.validation-and-staging | driver.worker-message 0.537ms |
| 5d330d6a85d3ff400000000000000092 | 53.107 | 13.843 | 0.013 | 0.000 | 1.223 | 1.290 | 11.038 | 0.177 | n/a | 0.526 | 24.674 | n/a | n/a | 0.323 | 15.078 | 0.284 | 0.323 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000096 | 28.488 | 4.295 | 0.006 | 0.000 | 0.783 | 0.950 | 8.075 | 0.105 | n/a | 0.405 | 13.808 | n/a | n/a | 0.062 | 5.084 | 0.178 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000098 | 27.771 | 8.241 | 0.919 | 0.000 | 0.070 | 2.938 | 2.856 | 0.074 | n/a | 0.610 | 12.000 | n/a | n/a | 0.062 | 9.230 | 0.332 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.488 | 1.662 | 0.000 | 2.109 | 4.295 | 0.006 | 0.000 | 0.783 | 0.950 | 8.075 | 0.105 | n/a | 0.405 | 13.808 | n/a | n/a | 0.062 | 5.084 | 0.178 | 0.062 |
| p99 | 28.488 | 1.662 | 0.000 | 2.109 | 4.295 | 0.006 | 0.000 | 0.783 | 0.950 | 8.075 | 0.105 | n/a | 0.405 | 13.808 | n/a | n/a | 0.062 | 5.084 | 0.178 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff400000000000000096 | 28.488 | 4.295 | 0.006 | 0.000 | 0.783 | 0.950 | 8.075 | 0.105 | n/a | 0.405 | 13.808 | n/a | n/a | 0.062 | 5.084 | 0.178 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.697 | 0.929 | 0.000 | 1.026 | 5.145 | 0.009 | 0.000 | 0.093 | 1.469 | 2.561 | 0.076 | n/a | 0.290 | 10.528 | n/a | n/a | 0.092 | 5.482 | 0.249 | 0.092 |
| p99 | 42.521 | 2.973 | 0.061 | 3.634 | 8.120 | 2.103 | 0.705 | 1.189 | 4.635 | 5.273 | 1.106 | n/a | 0.708 | 33.903 | n/a | n/a | 0.256 | 10.307 | 0.349 | 0.256 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff40000000000000009e | 42.521 | 4.051 | 0.009 | 0.705 | 0.226 | 1.274 | 1.797 | 0.048 | n/a | 0.253 | 33.903 | n/a | n/a | 0.256 | 4.990 | 0.117 | 0.256 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000009c | 29.545 | 8.120 | 2.103 | 0.000 | 0.084 | 4.635 | 2.561 | 1.106 | n/a | 0.346 | 10.528 | n/a | n/a | 0.062 | 10.307 | 0.349 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000009a | 28.697 | 5.690 | 0.008 | 0.650 | 1.189 | 1.469 | 5.273 | 0.077 | n/a | 0.290 | 13.954 | n/a | n/a | 0.096 | 7.538 | 0.263 | 0.096 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000009f | 22.031 | 5.145 | 0.244 | 0.000 | 0.093 | 3.014 | 5.104 | 0.076 | n/a | 0.708 | 7.555 | n/a | n/a | 0.092 | 5.482 | 0.249 | 0.092 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.364ms |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.697 | 1.378 | 0.000 | 1.933 | 4.051 | 0.008 | 0.650 | 0.226 | 1.274 | 1.797 | 0.048 | n/a | 0.253 | 13.954 | n/a | n/a | 0.096 | 4.990 | 0.117 | 0.096 |
| p99 | 42.521 | 2.973 | 0.000 | 3.634 | 5.690 | 0.009 | 0.705 | 1.189 | 1.469 | 5.273 | 0.077 | n/a | 0.290 | 33.903 | n/a | n/a | 0.256 | 7.538 | 0.263 | 0.256 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff40000000000000009e | 42.521 | 4.051 | 0.009 | 0.705 | 0.226 | 1.274 | 1.797 | 0.048 | n/a | 0.253 | 33.903 | n/a | n/a | 0.256 | 4.990 | 0.117 | 0.256 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000009a | 28.697 | 5.690 | 0.008 | 0.650 | 1.189 | 1.469 | 5.273 | 0.077 | n/a | 0.290 | 13.954 | n/a | n/a | 0.096 | 7.538 | 0.263 | 0.096 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.715 | 0.000 | 0.000 | 0.499 | 6.632 | 0.182 | 0.000 | 0.321 | 1.526 | 5.120 | 0.076 | n/a | 0.792 | 9.729 | n/a | n/a | 0.057 | 6.899 | 0.248 | 0.057 |
| p99 | 27.843 | 3.152 | 0.004 | 3.790 | 7.536 | 0.223 | 1.411 | 0.522 | 1.799 | 6.560 | 1.104 | n/a | 2.934 | 10.188 | n/a | n/a | 0.116 | 9.475 | 0.355 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000a4 | 27.843 | 6.632 | 0.182 | 0.000 | 0.085 | 1.799 | 6.560 | 0.076 | n/a | 2.934 | 9.527 | n/a | n/a | 0.050 | 6.899 | 0.248 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000a2 | 26.715 | 7.536 | 0.006 | 1.411 | 0.522 | 1.428 | 5.120 | 0.053 | n/a | 0.792 | 9.729 | n/a | n/a | 0.116 | 9.475 | 0.355 | 0.116 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000a7 | 20.740 | 4.500 | 0.223 | 0.000 | 0.321 | 1.526 | 2.243 | 1.104 | n/a | 0.577 | 10.188 | n/a | n/a | 0.057 | 5.044 | 0.243 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 44.087 | 0.453 | 0.000 | 0.436 | 5.666 | 0.010 | 0.000 | 0.079 | 3.781 | 5.436 | 0.071 | n/a | 0.547 | 27.375 | n/a | n/a | 0.041 | 6.652 | 0.138 | 0.041 |
| p99 | 72.781 | 1.794 | 0.002 | 3.624 | 9.641 | 0.918 | 1.232 | 0.993 | 4.214 | 9.076 | 0.108 | n/a | 5.113 | 44.935 | n/a | n/a | 0.045 | 10.356 | 0.221 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000b0 | 72.781 | 9.641 | 0.321 | 0.000 | 0.079 | 3.927 | 9.076 | 0.071 | n/a | 4.690 | 44.935 | n/a | n/a | 0.041 | 10.041 | 0.138 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.worker-message 0.536ms |
| 5d330d6a85d3ff4000000000000000a9 | 46.795 | 8.121 | 0.010 | 1.232 | 0.993 | 1.115 | 2.380 | 0.065 | n/a | 5.113 | 27.726 | n/a | n/a | 0.039 | 10.356 | 0.221 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000ad | 44.087 | 5.666 | 0.918 | 0.000 | 0.068 | 4.214 | 5.436 | 0.082 | n/a | 0.283 | 27.375 | n/a | n/a | 0.045 | 6.652 | 0.151 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 0.672ms; driver.worker-message 0.512ms |
| 5d330d6a85d3ff4000000000000000ab | 41.208 | 4.031 | 0.006 | 0.000 | 0.376 | 3.781 | 6.698 | 0.108 | n/a | 0.547 | 25.620 | n/a | n/a | 0.042 | 4.413 | 0.107 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 67.574 | 0.366 | 0.000 | 0.371 | 4.819 | 0.010 | 0.000 | 0.068 | 1.250 | 5.734 | 0.052 | n/a | 0.280 | 29.981 | n/a | n/a | 0.040 | 5.078 | 0.064 | 0.040 |
| p99 | 211.338 | 2.199 | 0.000 | 2.146 | 9.048 | 0.922 | 0.392 | 0.344 | 2.958 | 41.366 | 0.156 | n/a | 0.530 | 203.198 | n/a | n/a | 0.068 | 10.430 | 0.204 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000b5 | 211.338 | 4.728 | 0.007 | 0.000 | 0.344 | 1.035 | 1.637 | 0.042 | n/a | 0.280 | 203.198 | n/a | n/a | 0.068 | 5.078 | 0.024 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000b7 | 78.259 | 4.819 | 0.010 | 0.000 | 0.163 | 1.250 | 41.366 | 0.075 | n/a | 0.530 | 29.981 | n/a | n/a | 0.063 | 4.993 | 0.064 | 0.063 | gw-w/thread-45/commit.prepare-and-validate | none observed |
| 5d330d6a85d3ff4000000000000000b9 | 67.574 | 9.048 | 0.922 | 0.392 | 0.068 | 1.604 | 20.125 | 0.156 | n/a | 0.386 | 34.834 | n/a | n/a | 0.040 | 10.430 | 0.154 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 0.959ms; driver.worker-message 0.843ms |
| 5d330d6a85d3ff4000000000000000b2 | 30.943 | 6.043 | 0.220 | 0.000 | 0.061 | 2.958 | 5.734 | 0.052 | n/a | 0.265 | 15.572 | n/a | n/a | 0.038 | 6.324 | 0.204 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.259 | 1.948 | 0.000 | 1.508 | 4.728 | 0.007 | 0.000 | 0.163 | 1.035 | 1.637 | 0.042 | n/a | 0.280 | 29.981 | n/a | n/a | 0.063 | 4.993 | 0.024 | 0.063 |
| p99 | 211.338 | 2.199 | 0.000 | 2.146 | 4.819 | 0.010 | 0.000 | 0.344 | 1.250 | 41.366 | 0.075 | n/a | 0.530 | 203.198 | n/a | n/a | 0.068 | 5.078 | 0.064 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000b5 | 211.338 | 4.728 | 0.007 | 0.000 | 0.344 | 1.035 | 1.637 | 0.042 | n/a | 0.280 | 203.198 | n/a | n/a | 0.068 | 5.078 | 0.024 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000b7 | 78.259 | 4.819 | 0.010 | 0.000 | 0.163 | 1.250 | 41.366 | 0.075 | n/a | 0.530 | 29.981 | n/a | n/a | 0.063 | 4.993 | 0.064 | 0.063 | gw-w/thread-45/commit.prepare-and-validate | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.440 | 0.000 | 0.000 | 0.570 | 6.258 | 0.021 | 0.000 | 0.069 | 1.731 | 18.292 | 0.089 | n/a | 0.665 | 26.530 | n/a | n/a | 0.049 | 6.613 | 0.167 | 0.049 |
| p99 | 99.639 | 4.551 | 0.047 | 5.541 | 15.432 | 0.698 | 0.313 | 1.018 | 2.104 | 33.660 | 0.114 | n/a | 4.772 | 58.339 | n/a | n/a | 0.126 | 16.511 | 0.231 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000c2 | 99.639 | 4.340 | 0.274 | 0.261 | 0.069 | 1.875 | 33.660 | 0.114 | n/a | 0.665 | 58.339 | n/a | n/a | 0.042 | 4.944 | 0.050 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 0.771ms |
| 5d330d6a85d3ff4000000000000000bb | 95.888 | 14.966 | 0.021 | 0.000 | 1.018 | 1.731 | 18.292 | 0.089 | n/a | 4.772 | 54.874 | n/a | n/a | 0.126 | 16.005 | 0.167 | 0.126 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000bd | 78.440 | 15.432 | 0.698 | 0.313 | 0.069 | 2.104 | 32.858 | 0.111 | n/a | 0.277 | 26.530 | n/a | n/a | 0.049 | 16.511 | 0.210 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000c0 | 28.668 | 6.258 | 0.010 | 0.000 | 0.345 | 1.074 | 1.398 | 0.044 | n/a | 1.073 | 18.396 | n/a | n/a | 0.069 | 6.613 | 0.231 | 0.069 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.668 | 0.843 | 0.000 | 2.946 | 6.258 | 0.010 | 0.000 | 0.345 | 1.074 | 1.398 | 0.044 | n/a | 1.073 | 18.396 | n/a | n/a | 0.069 | 6.613 | 0.231 | 0.069 |
| p99 | 28.668 | 0.843 | 0.000 | 2.946 | 6.258 | 0.010 | 0.000 | 0.345 | 1.074 | 1.398 | 0.044 | n/a | 1.073 | 18.396 | n/a | n/a | 0.069 | 6.613 | 0.231 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000c0 | 28.668 | 6.258 | 0.010 | 0.000 | 0.345 | 1.074 | 1.398 | 0.044 | n/a | 1.073 | 18.396 | n/a | n/a | 0.069 | 6.613 | 0.231 | 0.069 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.535 | 0.927 | 0.000 | 1.676 | 4.559 | 0.006 | 0.000 | 0.513 | 0.990 | 5.795 | 0.058 | n/a | 0.546 | 18.872 | n/a | n/a | 0.054 | 5.588 | 0.197 | 0.054 |
| p99 | 68.992 | 1.059 | 0.000 | 1.939 | 6.237 | 2.110 | 2.160 | 1.235 | 5.121 | 21.750 | 0.098 | n/a | 2.801 | 32.919 | n/a | n/a | 0.141 | 8.673 | 0.267 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000c6 | 68.992 | 5.290 | 0.452 | 2.160 | 0.130 | 5.121 | 21.750 | 0.098 | n/a | 2.801 | 31.047 | n/a | n/a | 0.141 | 8.033 | 0.116 | 0.141 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000cb | 43.955 | 3.498 | 0.005 | 0.000 | 0.513 | 0.904 | 5.795 | 0.040 | n/a | 0.227 | 32.919 | n/a | n/a | 0.054 | 4.016 | 0.091 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000cd | 32.535 | 6.237 | 2.110 | 0.266 | 0.061 | 1.690 | 8.054 | 0.058 | n/a | 0.254 | 13.771 | n/a | n/a | 0.034 | 8.673 | 0.267 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000c4 | 27.835 | 4.559 | 0.006 | 0.000 | 0.911 | 0.959 | 1.887 | 0.039 | n/a | 0.546 | 18.872 | n/a | n/a | 0.055 | 5.477 | 0.197 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000c9 | 22.622 | 4.347 | 0.006 | 0.000 | 1.235 | 0.990 | 5.557 | 0.095 | n/a | 1.109 | 9.238 | n/a | n/a | 0.044 | 5.588 | 0.247 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.835 | 0.927 | 0.000 | 1.777 | 4.347 | 0.006 | 0.000 | 0.911 | 0.959 | 5.557 | 0.040 | n/a | 0.546 | 18.872 | n/a | n/a | 0.054 | 5.477 | 0.197 | 0.054 |
| p99 | 43.955 | 1.059 | 0.000 | 1.939 | 4.559 | 0.006 | 0.000 | 1.235 | 0.990 | 5.795 | 0.095 | n/a | 1.109 | 32.919 | n/a | n/a | 0.055 | 5.588 | 0.247 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000cb | 43.955 | 3.498 | 0.005 | 0.000 | 0.513 | 0.904 | 5.795 | 0.040 | n/a | 0.227 | 32.919 | n/a | n/a | 0.054 | 4.016 | 0.091 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000c4 | 27.835 | 4.559 | 0.006 | 0.000 | 0.911 | 0.959 | 1.887 | 0.039 | n/a | 0.546 | 18.872 | n/a | n/a | 0.055 | 5.477 | 0.197 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000c9 | 22.622 | 4.347 | 0.006 | 0.000 | 1.235 | 0.990 | 5.557 | 0.095 | n/a | 1.109 | 9.238 | n/a | n/a | 0.044 | 5.588 | 0.247 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.623 | 0.000 | 0.000 | 0.364 | 5.007 | 0.264 | 0.239 | 0.058 | 1.643 | 12.337 | 0.106 | n/a | 0.337 | 21.364 | n/a | n/a | 0.045 | 5.685 | 0.137 | 0.045 |
| p99 | 46.614 | 0.000 | 0.000 | 0.625 | 6.895 | 0.352 | 0.269 | 0.058 | 2.211 | 13.623 | 0.120 | n/a | 0.426 | 22.835 | n/a | n/a | 0.048 | 7.456 | 0.160 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000cf | 46.614 | 6.895 | 0.264 | 0.239 | 0.058 | 2.211 | 13.623 | 0.106 | n/a | 0.337 | 22.835 | n/a | n/a | 0.045 | 7.456 | 0.160 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000d2 | 41.623 | 5.007 | 0.352 | 0.269 | 0.058 | 1.643 | 12.337 | 0.120 | n/a | 0.426 | 21.364 | n/a | n/a | 0.048 | 5.685 | 0.137 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 1.611ms |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 44.770 | 0.998 | 0.000 | 1.092 | 4.846 | 0.021 | 0.000 | 0.306 | 1.401 | 13.161 | 0.124 | n/a | 1.142 | 17.021 | n/a | n/a | 0.049 | 5.453 | 0.142 | 0.049 |
| p99 | 63.135 | 3.851 | 0.000 | 3.277 | 8.961 | 2.409 | 0.000 | 0.906 | 4.795 | 20.340 | 0.152 | n/a | 4.352 | 38.080 | n/a | n/a | 0.201 | 11.677 | 0.218 | 0.201 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000d6 | 63.135 | 8.021 | 0.021 | 0.000 | 0.906 | 1.401 | 13.161 | 0.124 | n/a | 1.371 | 38.080 | n/a | n/a | 0.052 | 8.947 | 0.142 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000d4 | 62.211 | 8.961 | 2.409 | 0.000 | 0.306 | 4.795 | 13.775 | 0.152 | n/a | 4.352 | 27.260 | n/a | n/a | 0.201 | 11.677 | 0.188 | 0.201 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000da | 44.770 | 4.603 | 0.482 | 0.000 | 0.060 | 1.611 | 20.340 | 0.148 | n/a | 0.469 | 17.021 | n/a | n/a | 0.036 | 5.145 | 0.115 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000d8 | 25.057 | 4.846 | 0.006 | 0.000 | 0.601 | 0.846 | 2.174 | 0.051 | n/a | 1.142 | 15.342 | n/a | n/a | 0.049 | 5.453 | 0.218 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.057 | 1.632 | 0.000 | 1.865 | 4.846 | 0.006 | 0.000 | 0.601 | 0.846 | 2.174 | 0.051 | n/a | 1.142 | 15.342 | n/a | n/a | 0.049 | 5.453 | 0.218 | 0.049 |
| p99 | 25.057 | 1.632 | 0.000 | 1.865 | 4.846 | 0.006 | 0.000 | 0.601 | 0.846 | 2.174 | 0.051 | n/a | 1.142 | 15.342 | n/a | n/a | 0.049 | 5.453 | 0.218 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000d8 | 25.057 | 4.846 | 0.006 | 0.000 | 0.601 | 0.846 | 2.174 | 0.051 | n/a | 1.142 | 15.342 | n/a | n/a | 0.049 | 5.453 | 0.218 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.933 | 0.446 | 0.000 | 0.541 | 6.231 | 0.190 | 0.000 | 0.067 | 1.514 | 16.337 | 0.052 | n/a | 0.864 | 10.956 | n/a | n/a | 0.067 | 6.842 | 0.243 | 0.067 |
| p99 | 41.565 | 0.965 | 0.000 | 0.896 | 8.958 | 0.225 | 0.355 | 1.115 | 7.604 | 16.689 | 0.149 | n/a | 0.878 | 16.125 | n/a | n/a | 0.070 | 10.081 | 0.308 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000dc | 41.565 | 8.958 | 0.008 | 0.000 | 1.115 | 7.604 | 16.337 | 0.149 | n/a | 0.878 | 6.450 | n/a | n/a | 0.067 | 10.081 | 0.243 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000dd | 39.933 | 4.682 | 0.225 | 0.000 | 0.061 | 1.514 | 16.689 | 0.052 | n/a | 0.516 | 16.125 | n/a | n/a | 0.070 | 4.968 | 0.124 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000df | 22.227 | 6.231 | 0.190 | 0.355 | 0.067 | 1.489 | 1.994 | 0.040 | n/a | 0.864 | 10.956 | n/a | n/a | 0.041 | 6.842 | 0.308 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.565 | 0.446 | 0.000 | 0.346 | 8.958 | 0.008 | 0.000 | 1.115 | 7.604 | 16.337 | 0.149 | n/a | 0.878 | 6.450 | n/a | n/a | 0.067 | 10.081 | 0.243 | 0.067 |
| p99 | 41.565 | 0.446 | 0.000 | 0.346 | 8.958 | 0.008 | 0.000 | 1.115 | 7.604 | 16.337 | 0.149 | n/a | 0.878 | 6.450 | n/a | n/a | 0.067 | 10.081 | 0.243 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000dc | 41.565 | 8.958 | 0.008 | 0.000 | 1.115 | 7.604 | 16.337 | 0.149 | n/a | 0.878 | 6.450 | n/a | n/a | 0.067 | 10.081 | 0.243 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.939 | 0.520 | 0.000 | 0.677 | 4.413 | 0.012 | 0.000 | 0.140 | 1.595 | 2.976 | 0.062 | n/a | 0.410 | 17.309 | n/a | n/a | 0.055 | 5.132 | 0.191 | 0.055 |
| p99 | 43.430 | 1.789 | 0.003 | 2.816 | 7.485 | 0.328 | 0.485 | 1.122 | 2.444 | 14.162 | 0.087 | n/a | 3.464 | 27.780 | n/a | n/a | 0.147 | 7.999 | 0.332 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000e4 | 43.430 | 5.703 | 0.187 | 0.485 | 0.061 | 2.101 | 14.162 | 0.062 | n/a | 3.306 | 17.309 | n/a | n/a | 0.054 | 6.436 | 0.148 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000123 | 42.321 | 4.354 | 0.289 | 0.349 | 0.140 | 2.265 | 14.029 | 0.074 | n/a | 0.302 | 20.432 | n/a | n/a | 0.087 | 5.132 | 0.121 | 0.087 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000121 | 37.079 | 4.212 | 0.012 | 0.000 | 0.702 | 2.070 | 1.836 | 0.087 | n/a | 0.314 | 27.780 | n/a | n/a | 0.066 | 4.926 | 0.133 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000f6 | 35.450 | 6.257 | 0.011 | 0.000 | 1.122 | 1.299 | 1.347 | 0.040 | n/a | 3.464 | 21.763 | n/a | n/a | 0.147 | 7.390 | 0.208 | 0.147 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000e2 | 34.498 | 7.485 | 0.006 | 0.000 | 0.508 | 2.356 | 5.496 | 0.074 | n/a | 0.730 | 17.787 | n/a | n/a | 0.055 | 7.999 | 0.232 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000011f | 32.939 | 6.015 | 0.328 | 0.457 | 0.077 | 2.444 | 12.858 | 0.064 | n/a | 0.410 | 10.242 | n/a | n/a | 0.045 | 6.876 | 0.209 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000f8 | 31.174 | 5.411 | 0.006 | 0.000 | 0.498 | 1.146 | 5.057 | 0.041 | n/a | 0.640 | 18.329 | n/a | n/a | 0.046 | 5.916 | 0.190 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000fc | 24.789 | 4.413 | 0.006 | 0.000 | 0.328 | 0.859 | 1.423 | 0.040 | n/a | 3.222 | 14.419 | n/a | n/a | 0.080 | 4.746 | 0.191 | 0.080 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000fa | 23.433 | 4.003 | 0.286 | 0.356 | 0.117 | 1.311 | 2.976 | 0.080 | n/a | 0.355 | 13.891 | n/a | n/a | 0.059 | 4.761 | 0.203 | 0.059 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000f4 | 14.911 | 4.323 | 0.199 | 0.356 | 0.070 | 1.595 | 2.220 | 0.053 | n/a | 0.256 | 5.796 | n/a | n/a | 0.041 | 4.948 | 0.332 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.260 | 0.586 | 0.000 | 0.589 | 4.908 | 0.247 | 0.223 | 0.063 | 1.907 | 5.841 | 0.055 | n/a | 0.608 | 10.923 | n/a | n/a | 0.040 | 5.618 | 0.067 | 0.040 |
| p99 | 87.061 | 0.805 | 0.000 | 0.666 | 5.297 | 0.386 | 0.234 | 0.101 | 2.378 | 18.148 | 0.096 | n/a | 1.344 | 60.461 | n/a | n/a | 0.058 | 5.841 | 0.214 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000e6 | 87.061 | 5.297 | 0.247 | 0.234 | 0.063 | 1.907 | 18.148 | 0.055 | n/a | 0.608 | 60.461 | n/a | n/a | 0.040 | 5.841 | 0.067 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000e8 | 26.260 | 4.908 | 0.386 | 0.223 | 0.101 | 2.378 | 5.841 | 0.096 | n/a | 1.344 | 10.923 | n/a | n/a | 0.058 | 5.618 | 0.214 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.519 | 1.458 | 0.000 | 1.908 | 5.344 | 0.007 | 0.000 | 0.763 | 1.528 | 1.540 | 0.042 | n/a | 0.284 | 11.978 | n/a | n/a | 0.060 | 6.128 | 0.153 | 0.060 |
| p99 | 50.178 | 2.534 | 0.000 | 2.765 | 5.872 | 0.271 | 0.386 | 0.938 | 25.635 | 3.048 | 3.052 | n/a | 1.853 | 33.478 | n/a | n/a | 0.073 | 6.640 | 0.253 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000ed | 50.178 | 5.344 | 0.271 | 0.386 | 0.127 | 25.635 | 3.048 | 3.052 | n/a | 0.284 | 11.978 | n/a | n/a | 0.053 | 6.128 | 0.122 | 0.053 | node-14/thread-8/socket.wait-first-byte | none observed |
| 5d330d6a85d3ff4000000000000000eb | 43.519 | 5.872 | 0.005 | 0.000 | 0.763 | 1.521 | 1.540 | 0.042 | n/a | 0.239 | 33.478 | n/a | n/a | 0.060 | 6.640 | 0.153 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000ef | 21.334 | 4.462 | 0.007 | 0.000 | 0.938 | 1.528 | 0.851 | 0.033 | n/a | 1.853 | 11.589 | n/a | n/a | 0.073 | 5.407 | 0.253 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.334 | 2.534 | 0.000 | 1.908 | 4.462 | 0.007 | 0.000 | 0.938 | 1.528 | 0.851 | 0.033 | n/a | 1.853 | 11.589 | n/a | n/a | 0.073 | 5.407 | 0.253 | 0.073 |
| p99 | 21.334 | 2.534 | 0.000 | 1.908 | 4.462 | 0.007 | 0.000 | 0.938 | 1.528 | 0.851 | 0.033 | n/a | 1.853 | 11.589 | n/a | n/a | 0.073 | 5.407 | 0.253 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000ef | 21.334 | 4.462 | 0.007 | 0.000 | 0.938 | 1.528 | 0.851 | 0.033 | n/a | 1.853 | 11.589 | n/a | n/a | 0.073 | 5.407 | 0.253 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.789 | 0.618 | 0.000 | 1.595 | 4.212 | 0.006 | 0.000 | 0.328 | 0.859 | 1.423 | 0.040 | n/a | 0.314 | 14.419 | n/a | n/a | 0.066 | 4.746 | 0.133 | 0.066 |
| p99 | 37.079 | 1.789 | 0.000 | 2.449 | 4.413 | 0.012 | 0.000 | 0.702 | 2.070 | 1.836 | 0.087 | n/a | 3.222 | 27.780 | n/a | n/a | 0.080 | 4.926 | 0.191 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff400000000000000121 | 37.079 | 4.212 | 0.012 | 0.000 | 0.702 | 2.070 | 1.836 | 0.087 | n/a | 0.314 | 27.780 | n/a | n/a | 0.066 | 4.926 | 0.133 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff4000000000000000fc | 24.789 | 4.413 | 0.006 | 0.000 | 0.328 | 0.859 | 1.423 | 0.040 | n/a | 3.222 | 14.419 | n/a | n/a | 0.080 | 4.746 | 0.191 | 0.080 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.926 | 0.667 | 0.000 | 1.616 | 4.427 | 0.010 | 0.000 | 0.119 | 1.342 | 2.437 | 0.050 | n/a | 0.599 | 15.491 | n/a | n/a | 0.043 | 5.397 | 0.220 | 0.043 |
| p99 | 69.077 | 1.692 | 8.019 | 10.761 | 14.394 | 0.258 | 0.376 | 1.297 | 4.371 | 12.170 | 0.099 | n/a | 3.634 | 49.505 | n/a | n/a | 0.082 | 14.775 | 0.431 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff4000000000000000fe | 69.077 | 5.787 | 0.010 | 0.000 | 1.104 | 4.371 | 4.550 | 0.045 | n/a | 3.634 | 49.505 | n/a | n/a | 0.071 | 6.901 | 0.100 | 0.071 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000010d | 47.458 | 3.743 | 0.204 | 0.278 | 0.105 | 2.492 | 12.170 | 0.087 | n/a | 0.643 | 27.685 | n/a | n/a | 0.051 | 4.331 | 0.091 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000100 | 37.276 | 4.737 | 0.240 | 0.363 | 0.060 | 3.623 | 9.080 | 0.050 | n/a | 0.599 | 18.484 | n/a | n/a | 0.040 | 5.400 | 0.145 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000010f | 34.257 | 14.394 | 0.005 | 0.000 | 0.375 | 1.194 | 2.437 | 0.057 | n/a | 0.261 | 15.491 | n/a | n/a | 0.042 | 14.775 | 0.431 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000111 | 31.669 | 4.427 | 0.258 | 0.376 | 0.068 | 2.535 | 7.689 | 0.094 | n/a | 0.322 | 15.854 | n/a | n/a | 0.045 | 5.131 | 0.162 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000105 | 26.926 | 9.276 | 0.011 | 0.000 | 0.547 | 1.342 | 2.213 | 0.046 | n/a | 0.291 | 13.118 | n/a | n/a | 0.082 | 9.834 | 0.365 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000109 | 25.181 | 6.729 | 0.004 | 0.000 | 0.053 | 0.691 | 1.461 | 0.041 | n/a | 0.650 | 15.510 | n/a | n/a | 0.043 | 6.786 | 0.269 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000102 | 22.689 | 4.095 | 0.005 | 0.000 | 1.297 | 0.812 | 1.469 | 0.038 | n/a | 0.763 | 14.165 | n/a | n/a | 0.043 | 5.397 | 0.238 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000107 | 15.546 | 3.293 | 0.006 | 0.000 | 0.119 | 1.448 | 4.242 | 0.099 | n/a | 0.291 | 6.006 | n/a | n/a | 0.042 | 3.417 | 0.220 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000010b | 14.104 | 3.728 | 0.010 | 0.000 | 0.510 | 0.802 | 2.404 | 0.071 | n/a | 0.633 | 5.891 | n/a | n/a | 0.058 | 4.248 | 0.301 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.974 | n/a | n/a | n/a | 5.354 | 7.794 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 10.961 | 0.998 | 0.018 |
| p99 | 108.668 | n/a | n/a | n/a | 26.423 | 96.761 | 3.755 | 0.000 | 6.876 | 64.381 | 0.016 | n/a | 0.259 | 0.000 | n/a | n/a | 0.047 | 97.369 | 1.000 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff40000000000000012b | 108.668 | 26.423 | 10.929 | 0.000 | 0.000 | 6.876 | 64.381 | 0.016 | n/a | 0.029 | 0.000 | n/a | n/a | 0.014 | 37.352 | 0.344 | 0.014 | gw-w/thread-44/gateway.admitted-work | driver.publication 4.126ms |
| 5d330d6a85d3ff400000000000000119 | 97.385 | 0.607 | 96.761 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 97.369 | 1.000 | 0.017 | node-14/thread-0/rpc.replica.observe | client.encode 3.461ms |
| 5d330d6a85d3ff400000000000000103 | 91.443 | 23.514 | 12.414 | 0.000 | 0.000 | 4.841 | 50.385 | 0.016 | n/a | 0.259 | 0.000 | n/a | n/a | 0.014 | 35.928 | 0.393 | 0.014 | gw-w/thread-47/gateway.admitted-work | none observed |
| 5d330d6a85d3ff400000000000000093 | 35.202 | 2.504 | 32.651 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.047 | 35.155 | 0.999 | 0.047 | node-14/thread-0/rpc.replica.observe | none observed |
| 5d330d6a85d3ff4000000000000000bc | 26.324 | 22.392 | 0.137 | 3.755 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.040 | 26.284 | 0.998 | 0.040 | node-14/thread-2/replica.pull-at | none observed |
| 5d330d6a85d3ff40000000000000012d | 20.129 | 5.328 | 14.779 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 20.107 | 0.999 | 0.022 | node-14/thread-0/rpc.replica.observe | none observed |
| 5d330d6a85d3ff4000000000000000cc | 19.951 | 16.445 | 3.492 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 19.937 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| 5d330d6a85d3ff4000000000000000f0 | 15.049 | 0.384 | 14.645 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 15.028 | 0.999 | 0.020 | node-14/thread-0/rpc.replica.observe | client.parse 1.168ms |
| 5d330d6a85d3ff4000000000000000b8 | 12.593 | 12.144 | 0.430 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 12.574 | 0.999 | 0.019 | node-14/thread-2/replica.pull-at | none observed |
| 5d330d6a85d3ff400000000000000110 | 11.811 | 0.149 | 11.646 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 11.795 | 0.999 | 0.016 | node-14/thread-0/rpc.replica.observe | none observed |
| 5d330d6a85d3ff4000000000000000a3 | 10.974 | 0.874 | 10.088 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 10.961 | 0.999 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| 5d330d6a85d3ff4000000000000000c5 | 10.271 | 10.157 | 0.092 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 10.249 | 0.998 | 0.022 | node-14/thread-2/replica.pull-at | none observed |
| 5d330d6a85d3ff4000000000000000b6 | 9.686 | 8.796 | 0.865 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 9.662 | 0.998 | 0.024 | node-14/thread-2/replica.pull-at | none observed |
| 5d330d6a85d3ff4000000000000000aa | 9.341 | 0.451 | 8.874 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 9.325 | 0.998 | 0.016 | node-14/thread-0/rpc.replica.observe | none observed |
| 5d330d6a85d3ff4000000000000000f9 | 8.716 | 0.496 | 8.205 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.700 | 0.998 | 0.015 | node-14/thread-0/rpc.replica.observe | none observed |
| 5d330d6a85d3ff4000000000000000e3 | 8.448 | 0.637 | 7.794 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 8.431 | 0.998 | 0.018 | node-14/thread-0/rpc.replica.observe | none observed |
| 5d330d6a85d3ff4000000000000000d9 | 8.351 | 6.254 | 2.083 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.336 | 0.998 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 5d330d6a85d3ff4000000000000000d7 | 8.258 | 5.354 | 2.881 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 8.235 | 0.997 | 0.023 | node-14/thread-2/replica.pull-at | none observed |
| 5d330d6a85d3ff4000000000000000ff | 7.574 | 7.459 | 0.095 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 7.554 | 0.997 | 0.020 | node-14/thread-2/replica.pull-at | none observed |
| 5d330d6a85d3ff400000000000000128 | 6.261 | 6.167 | 0.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 6.247 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.104 | 0.750 | 0.000 | 1.579 | 3.293 | 0.006 | 0.000 | 0.119 | 0.802 | 2.404 | 0.071 | n/a | 0.291 | 5.891 | n/a | n/a | 0.042 | 3.417 | 0.220 | 0.042 |
| p99 | 15.546 | 0.921 | 0.014 | 1.616 | 3.728 | 0.010 | 0.000 | 0.510 | 1.448 | 4.242 | 0.099 | n/a | 0.633 | 6.006 | n/a | n/a | 0.058 | 4.248 | 0.301 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff400000000000000107 | 15.546 | 3.293 | 0.006 | 0.000 | 0.119 | 1.448 | 4.242 | 0.099 | n/a | 0.291 | 6.006 | n/a | n/a | 0.042 | 3.417 | 0.220 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000010b | 14.104 | 3.728 | 0.010 | 0.000 | 0.510 | 0.802 | 2.404 | 0.071 | n/a | 0.633 | 5.891 | n/a | n/a | 0.058 | 4.248 | 0.301 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 162.786 | 0.000 | 0.000 | 0.389 | 9.216 | 0.013 | 0.000 | 0.116 | 5.024 | 5.538 | 0.111 | n/a | 0.983 | 128.496 | n/a | n/a | 0.067 | 12.940 | 0.066 | 0.067 |
| p99 | 233.068 | 0.479 | 2.508 | 4.866 | 14.750 | 3.056 | 0.552 | 0.533 | 14.553 | 14.383 | 0.163 | n/a | 1.712 | 196.370 | n/a | n/a | 0.218 | 15.296 | 0.079 | 0.218 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff400000000000000116 | 233.068 | 14.750 | 0.013 | 0.000 | 0.533 | 14.553 | 5.538 | 0.111 | n/a | 0.983 | 196.370 | n/a | n/a | 0.218 | 15.296 | 0.066 | 0.218 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000117 | 162.786 | 9.216 | 3.056 | 0.552 | 0.116 | 5.024 | 14.383 | 0.163 | n/a | 1.712 | 128.496 | n/a | n/a | 0.067 | 12.940 | 0.079 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 4.060ms |

## P4 / p4h10 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.145 | 0.469 | 0.000 | 2.300 | 6.283 | 0.011 | 0.000 | 0.821 | 1.574 | 4.604 | 0.053 | n/a | 0.692 | 18.192 | n/a | n/a | 0.058 | 7.944 | 0.238 | 0.058 |
| p99 | 95.041 | 1.976 | 2.578 | 4.533 | 8.457 | 0.362 | 0.615 | 14.099 | 3.729 | 13.600 | 0.123 | n/a | 0.958 | 67.237 | n/a | n/a | 0.073 | 20.390 | 0.641 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff400000000000000125 | 95.041 | 8.457 | 0.362 | 0.615 | 0.101 | 3.729 | 13.600 | 0.123 | n/a | 0.743 | 67.237 | n/a | n/a | 0.073 | 9.535 | 0.100 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000012e | 43.555 | 4.424 | 0.314 | 0.344 | 0.115 | 1.574 | 8.583 | 0.049 | n/a | 0.202 | 27.877 | n/a | n/a | 0.072 | 5.197 | 0.119 | 0.072 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000129 | 33.145 | 7.117 | 0.006 | 0.000 | 0.821 | 1.592 | 4.604 | 0.063 | n/a | 0.692 | 18.192 | n/a | n/a | 0.058 | 7.944 | 0.240 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff40000000000000012a | 31.828 | 6.283 | 0.007 | 0.000 | 14.099 | 0.865 | 1.671 | 0.045 | n/a | 0.958 | 7.852 | n/a | n/a | 0.047 | 20.390 | 0.641 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 1.215ms; driver.expected-state.bind-receipt 1.152ms |
| 5d330d6a85d3ff400000000000000127 | 23.102 | 4.396 | 0.011 | 0.000 | 1.088 | 1.087 | 1.495 | 0.053 | n/a | 0.279 | 14.637 | n/a | n/a | 0.057 | 5.495 | 0.238 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.828 | 0.544 | 2.578 | 4.533 | 6.283 | 0.007 | 0.000 | 14.099 | 0.865 | 1.671 | 0.045 | n/a | 0.958 | 7.852 | n/a | n/a | 0.047 | 20.390 | 0.641 | 0.047 |
| p99 | 31.828 | 0.544 | 2.578 | 4.533 | 6.283 | 0.007 | 0.000 | 14.099 | 0.865 | 1.671 | 0.045 | n/a | 0.958 | 7.852 | n/a | n/a | 0.047 | 20.390 | 0.641 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff40000000000000012a | 31.828 | 6.283 | 0.007 | 0.000 | 14.099 | 0.865 | 1.671 | 0.045 | n/a | 0.958 | 7.852 | n/a | n/a | 0.047 | 20.390 | 0.641 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 1.215ms; driver.expected-state.bind-receipt 1.152ms |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.668 | 0.000 | 0.000 | 0.620 | 4.227 | 1.094 | 0.251 | 0.094 | 1.552 | 7.817 | 0.059 | n/a | 0.391 | 19.869 | n/a | n/a | 0.052 | 5.969 | 0.130 | 0.052 |
| p99 | 75.710 | 0.566 | 0.009 | 1.439 | 4.508 | 2.186 | 0.273 | 0.496 | 5.664 | 10.902 | 0.093 | n/a | 1.443 | 50.875 | n/a | n/a | 0.056 | 6.718 | 0.208 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff400000000000000130 | 75.710 | 4.227 | 2.186 | 0.251 | 0.054 | 5.664 | 10.902 | 0.059 | n/a | 1.443 | 50.875 | n/a | n/a | 0.048 | 6.718 | 0.089 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000134 | 28.668 | 4.508 | 1.094 | 0.273 | 0.094 | 1.552 | 7.817 | 0.051 | n/a | 0.256 | 12.971 | n/a | n/a | 0.052 | 5.969 | 0.208 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5d330d6a85d3ff400000000000000132 | 27.493 | 3.077 | 0.005 | 0.000 | 0.496 | 1.008 | 2.499 | 0.093 | n/a | 0.391 | 19.869 | n/a | n/a | 0.056 | 3.578 | 0.130 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.493 | 0.566 | 0.009 | 1.439 | 3.077 | 0.005 | 0.000 | 0.496 | 1.008 | 2.499 | 0.093 | n/a | 0.391 | 19.869 | n/a | n/a | 0.056 | 3.578 | 0.130 | 0.056 |
| p99 | 27.493 | 0.566 | 0.009 | 1.439 | 3.077 | 0.005 | 0.000 | 0.496 | 1.008 | 2.499 | 0.093 | n/a | 0.391 | 19.869 | n/a | n/a | 0.056 | 3.578 | 0.130 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff400000000000000132 | 27.493 | 3.077 | 0.005 | 0.000 | 0.496 | 1.008 | 2.499 | 0.093 | n/a | 0.391 | 19.869 | n/a | n/a | 0.056 | 3.578 | 0.130 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 110.122 | 0.761 | 0.000 | 1.599 | 9.099 | 5.889 | 0.000 | 0.010 | 12.541 | 1.405 | 13.698 | n/a | 0.076 | 62.138 | n/a | n/a | 0.029 | 15.715 | 0.133 | 0.029 |
| p99 | 158.215 | 1.971 | 2.962 | 5.863 | 11.897 | 10.344 | 0.000 | 0.070 | 27.720 | 10.053 | 30.431 | n/a | 0.648 | 110.471 | n/a | n/a | 0.108 | 19.889 | 0.179 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d330d6a85d3ff40000000000000013f | 158.215 | 9.540 | 10.344 | 0.000 | 0.006 | 16.088 | 1.308 | 10.349 | n/a | 0.053 | 110.471 | n/a | n/a | 0.057 | 19.889 | 0.126 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 5.541ms; driver.publication 4.257ms; driver.publication 2.718ms; driver.publication 2.128ms; driver.publication 1.368ms |
| 5d330d6a85d3ff40000000000000013e | 149.037 | 8.803 | 9.809 | 0.000 | 0.006 | 21.485 | 2.577 | 4.782 | n/a | 0.120 | 101.432 | n/a | n/a | 0.023 | 18.619 | 0.125 | 0.023 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 5.541ms; driver.publication 4.257ms; driver.publication 2.718ms; driver.publication 2.128ms; driver.publication 1.368ms |
| 5d330d6a85d3ff40000000000000013d | 141.268 | 10.154 | 8.612 | 0.000 | 0.013 | 13.329 | 1.250 | 15.586 | n/a | 0.037 | 92.260 | n/a | n/a | 0.026 | 18.779 | 0.133 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 5.541ms; driver.publication 4.257ms; driver.publication 2.718ms; driver.publication 1.368ms; driver.publication 1.247ms |
| 5d330d6a85d3ff40000000000000013c | 124.856 | 9.099 | 7.504 | 0.000 | 0.008 | 27.720 | 1.405 | 2.501 | n/a | 0.052 | 76.544 | n/a | n/a | 0.023 | 16.611 | 0.133 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 5.541ms; driver.publication 4.257ms; driver.publication 2.718ms; driver.publication 1.368ms; driver.publication 1.247ms |
| 5d330d6a85d3ff40000000000000013b | 116.026 | 9.539 | 6.166 | 0.000 | 0.010 | 12.541 | 0.774 | 19.362 | n/a | 0.069 | 67.537 | n/a | n/a | 0.028 | 15.715 | 0.135 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.541ms; driver.publication 4.257ms; driver.publication 2.718ms; driver.publication 1.247ms; driver.publication 1.081ms |
| 5d330d6a85d3ff40000000000000013a | 110.122 | 8.190 | 5.732 | 0.000 | 0.026 | 2.343 | 1.153 | 30.431 | n/a | 0.076 | 62.138 | n/a | n/a | 0.033 | 13.948 | 0.127 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 5.541ms; driver.publication 4.257ms; driver.publication 2.718ms; driver.publication 1.081ms |
| 5d330d6a85d3ff400000000000000139 | 100.101 | 11.897 | 5.889 | 0.000 | 0.012 | 10.409 | 10.053 | 13.698 | n/a | 0.079 | 48.033 | n/a | n/a | 0.031 | 17.799 | 0.178 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 4.257ms; driver.publication 2.718ms; driver.publication 1.081ms |
| 5d330d6a85d3ff400000000000000138 | 85.967 | 9.836 | 5.516 | 0.000 | 0.008 | 10.549 | 5.510 | 18.598 | n/a | 0.516 | 35.405 | n/a | n/a | 0.029 | 15.360 | 0.179 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.718ms; driver.publication 1.081ms |
| 5d330d6a85d3ff400000000000000137 | 76.841 | 6.330 | 4.211 | 0.000 | 0.012 | 13.222 | 6.441 | 16.596 | n/a | 0.648 | 29.273 | n/a | n/a | 0.108 | 10.553 | 0.137 | 0.108 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 2.718ms |
| 5d330d6a85d3ff400000000000000136 | 46.729 | 6.460 | 0.033 | 0.000 | 0.070 | 6.259 | 1.631 | 0.057 | n/a | 0.258 | 31.908 | n/a | n/a | 0.053 | 6.564 | 0.140 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.026 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 306.110 | n/a | n/a | n/a | 51.127 | n/a | 4.531 | 306.021 | 32.130 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.889 | 306.106 | 1.000 | 51.889 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68383e831c6fb7d30000000000000b33 | 306.167 | 0.018 | n/a | 0.000 | 306.147 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.165 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000000b32 | 306.152 | 0.023 | n/a | 0.000 | 306.126 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.149 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000000b31 | 306.110 | 0.085 | n/a | 0.000 | 306.021 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 306.106 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000000b49 | 305.865 | 0.038 | n/a | 0.000 | 305.825 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 305.863 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| f5a99e3556f7e55500000000000008a8 | 305.016 | 0.021 | n/a | 0.000 | 304.993 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 305.014 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e55500000000000008a7 | 305.006 | 0.017 | n/a | 0.000 | 304.987 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 305.004 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e55500000000000008a6 | 304.996 | 0.020 | n/a | 0.000 | 304.973 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.993 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e55500000000000008a5 | 304.974 | 0.066 | n/a | 0.000 | 304.905 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 304.971 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000000f8f | 303.812 | 0.021 | n/a | 0.000 | 303.789 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 303.811 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000000f8e | 303.785 | 0.021 | n/a | 0.000 | 303.764 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 303.784 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000000f8d | 303.746 | 0.034 | n/a | 0.000 | 303.711 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 303.745 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000000f8c | 303.690 | 0.082 | n/a | 0.000 | 303.607 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 303.689 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000000b30 | 303.555 | 0.640 | n/a | 0.000 | 302.911 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 303.551 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000000f8b | 302.885 | 0.318 | n/a | 0.000 | 302.562 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 302.880 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000000b4a | 302.018 | 0.111 | n/a | 0.000 | 301.881 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 301.991 | 1.000 | 0.027 | node-14/thread-3/reader.straddle-await-ack | none observed |
| f5a99e3556f7e55500000000000008a4 | 301.801 | 0.584 | n/a | 0.000 | 301.206 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 301.790 | 1.000 | 0.010 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e5550000000000009cf2 | 278.263 | 0.074 | n/a | 0.000 | 278.188 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.261 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e5550000000000009cf1 | 278.229 | 0.019 | n/a | 0.000 | 278.209 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.229 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e5550000000000009cf0 | 278.205 | 0.032 | n/a | 0.000 | 278.172 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.204 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e5550000000000009cef | 278.160 | 0.128 | n/a | 0.000 | 278.031 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.158 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 294.882 | n/a | n/a | n/a | 3.128 | n/a | 0.000 | 294.587 | 0.537 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.111 | 294.877 | 1.000 | 3.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68383e831c6fb7d3000000000001e0ee | 294.882 | 0.290 | n/a | 0.000 | 294.587 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 294.877 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 68383e831c6fb7d3000000000000c8af | 273.535 | 0.136 | n/a | 0.000 | 273.395 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 273.531 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.085ms |
| 68383e831c6fb7d3000000000000c8dd | 6.777 | 3.128 | n/a | 0.000 | 0.000 | 0.537 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.111 | 3.128 | 0.462 | 3.111 | node-14/thread-3/socket.wait-first-byte | none observed |
| 68383e831c6fb7d30000000000011c47 | 0.905 | 0.902 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.902 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d30000000000018a81 | 0.546 | 0.544 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.544 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d30000000000017ec9 | 0.461 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.461 | 0.000 | 0.000 | 0.461 | uncovered | none observed |
| 68383e831c6fb7d30000000000011a5f | 0.440 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.440 | 0.000 | 0.000 | 0.440 | uncovered | none observed |
| 68383e831c6fb7d3000000000001a072 | 0.434 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.434 | 0.000 | 0.000 | 0.434 | uncovered | none observed |
| 68383e831c6fb7d3000000000001d9e8 | 0.397 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.397 | 0.000 | 0.000 | 0.397 | uncovered | none observed |
| 68383e831c6fb7d3000000000000d6fd | 0.375 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 | uncovered | none observed |
| 68383e831c6fb7d3000000000000d015 | 0.372 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.372 | 0.000 | 0.000 | 0.372 | uncovered | none observed |
| 68383e831c6fb7d300000000000105dc | 0.370 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.370 | 0.000 | 0.000 | 0.370 | uncovered | none observed |
| 68383e831c6fb7d3000000000000d674 | 0.357 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.357 | 0.000 | 0.000 | 0.357 | uncovered | none observed |
| 68383e831c6fb7d3000000000001801b | 0.349 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.349 | 0.000 | 0.000 | 0.349 | uncovered | none observed |
| 68383e831c6fb7d30000000000014a6e | 0.345 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.345 | 0.000 | 0.000 | 0.345 | uncovered | none observed |
| 68383e831c6fb7d3000000000000f9e8 | 0.336 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | uncovered | none observed |
| 68383e831c6fb7d30000000000017484 | 0.335 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | uncovered | none observed |
| 68383e831c6fb7d30000000000017df6 | 0.333 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.333 | 0.000 | 0.000 | 0.333 | uncovered | none observed |
| 68383e831c6fb7d3000000000001485b | 0.331 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.331 | 0.000 | 0.000 | 0.331 | uncovered | none observed |
| 68383e831c6fb7d3000000000000e222 | 0.328 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.328 | 0.000 | 0.000 | 0.328 | uncovered | none observed |

## P1 / L4 / read (225 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 290.317 | n/a | n/a | n/a | 5.638 | n/a | 0.000 | 290.205 | 0.713 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.338 | 290.307 | 1.000 | 1.338 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0bf2a69b16533706000000000000cb9e | 291.163 | 0.159 | n/a | 0.000 | 290.999 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 291.158 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| f5a99e3556f7e555000000000000ce72 | 290.717 | 0.288 | n/a | 0.000 | 290.419 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 290.707 | 1.000 | 0.009 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 68383e831c6fb7d3000000000001f1a2 | 290.317 | 0.187 | n/a | 0.000 | 290.120 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 290.307 | 1.000 | 0.010 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 68383e831c6fb7d3000000000001f1a3 | 290.249 | 0.042 | n/a | 0.000 | 290.205 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.247 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 68383e831c6fb7d3000000000001e0f1 | 184.522 | 0.125 | n/a | 0.000 | 184.393 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 184.518 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 0bf2a69b16533706000000000000c0ba | 184.167 | 0.621 | n/a | 0.000 | 183.534 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 184.156 | 1.000 | 0.012 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| f5a99e3556f7e555000000000000c1e6 | 182.280 | 0.261 | n/a | 0.000 | 182.015 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 182.276 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 68383e831c6fb7d3000000000001e0f4 | 34.825 | 20.534 | n/a | 2.303 | 0.000 | 0.776 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.212 | 22.837 | 0.656 | 11.212 | node-14/thread-3/reader.execute | none observed |
| 0bf2a69b16533706000000000000c0c3 | 32.785 | 25.836 | n/a | 2.201 | 0.000 | 0.713 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.034 | 28.037 | 0.855 | 4.034 | node-14/thread-5/reader.execute | none observed |
| f5a99e3556f7e555000000000000c220 | 8.095 | 5.638 | n/a | 0.000 | 0.000 | 1.120 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.338 | 5.638 | 0.696 | 1.338 | node-14/thread-4/reader.execute | none observed |
| f5a99e3556f7e5550000000000013c4f | 3.549 | 3.547 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.547 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 0bf2a69b16533706000000000000cc91 | 3.210 | 3.208 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.208 | 1.000 | 0.001 | node-14/thread-5/reader.execute | none observed |
| f5a99e3556f7e555000000000000d3e1 | 1.708 | 1.704 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.704 | 0.998 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| f5a99e3556f7e5550000000000017287 | 1.299 | 1.297 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.297 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 0bf2a69b16533706000000000000ec76 | 1.217 | 1.216 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.216 | 0.999 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| f5a99e3556f7e555000000000000ec3e | 1.159 | 1.158 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.158 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| f5a99e3556f7e5550000000000018636 | 1.137 | 1.135 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.135 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| f5a99e3556f7e5550000000000013c1f | 1.120 | 1.119 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.119 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| f5a99e3556f7e555000000000000c78d | 1.073 | 1.072 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.072 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 0bf2a69b16533706000000000000f068 | 1.046 | 1.046 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.046 | 0.999 | 0.001 | node-14/thread-5/replica.pull-at | none observed |

## P1 / L16 / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 460.345 | n/a | n/a | n/a | 4.319 | n/a | 0.000 | 460.305 | 0.394 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.525 | 460.344 | 1.000 | 2.525 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f5a99e3556f7e5550000000000021021 | 460.354 | 0.220 | n/a | 0.000 | 460.132 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 460.352 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f5a99e3556f7e5550000000000021023 | 460.348 | 0.015 | n/a | 0.000 | 460.333 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.348 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f5a99e3556f7e5550000000000021022 | 460.345 | 0.035 | n/a | 0.000 | 460.309 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.344 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 68383e831c6fb7d3000000000003677a | 460.320 | 0.014 | n/a | 0.000 | 460.305 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.319 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 68383e831c6fb7d30000000000036774 | 460.317 | 0.055 | n/a | 0.000 | 460.261 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.316 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 68383e831c6fb7d30000000000036779 | 460.306 | 0.013 | n/a | 0.000 | 460.293 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 460.306 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 68383e831c6fb7d30000000000036777 | 460.302 | 0.028 | n/a | 0.000 | 460.273 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.301 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 68383e831c6fb7d30000000000036778 | 460.299 | 0.015 | n/a | 0.000 | 460.284 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.298 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 68383e831c6fb7d30000000000036773 | 460.293 | 0.198 | n/a | 0.000 | 460.092 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 460.291 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| f5a99e3556f7e5550000000000021046 | 460.038 | 0.074 | n/a | 0.000 | 459.963 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.037 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f5a99e3556f7e5550000000000021045 | 460.029 | 0.038 | n/a | 0.000 | 459.990 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 460.028 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 0bf2a69b165337060000000000021fa6 | 459.286 | 0.299 | n/a | 0.000 | 458.983 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 459.282 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 0bf2a69b165337060000000000021fa7 | 459.207 | 0.125 | n/a | 0.000 | 459.080 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 459.205 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 0bf2a69b165337060000000000021fa8 | 459.136 | 0.041 | n/a | 0.000 | 459.093 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 459.134 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 0bf2a69b165337060000000000021fb7 | 458.552 | 0.044 | n/a | 0.000 | 458.505 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 458.550 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 0bf2a69b165337060000000000021fb8 | 458.516 | 0.018 | n/a | 0.000 | 458.496 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 458.515 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 68383e831c6fb7d3000000000003678f | 115.039 | 0.101 | n/a | 0.000 | 114.934 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 115.034 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| f5a99e3556f7e555000000000002105b | 114.669 | 0.031 | n/a | 0.000 | 114.638 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 114.668 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 0bf2a69b165337060000000000021fca | 114.642 | 0.023 | n/a | 0.000 | 114.618 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 114.641 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| f5a99e3556f7e555000000000002105a | 114.636 | 0.028 | n/a | 0.000 | 114.606 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 114.634 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |

## P1 / L64 / read (213 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.032 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 340.104 | n/a | n/a | n/a | 5.598 | n/a | 0.000 | 340.037 | 0.481 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.645 | 340.101 | 1.000 | 22.645 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0bf2a69b16533706000000000002c990 | 340.177 | 0.048 | n/a | 0.000 | 340.127 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.175 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000002c98f | 340.167 | 0.042 | n/a | 0.000 | 340.124 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.165 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000002c98e | 340.104 | 0.064 | n/a | 0.000 | 340.037 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 340.101 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000002c98d | 340.046 | 0.131 | n/a | 0.000 | 339.911 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 340.042 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000041501 | 339.848 | 0.080 | n/a | 0.000 | 339.767 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.847 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000041503 | 339.844 | 0.013 | n/a | 0.000 | 339.830 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.844 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000041502 | 339.830 | 0.017 | n/a | 0.000 | 339.813 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.829 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d300000000000414fe | 339.827 | 0.294 | n/a | 0.000 | 339.531 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 339.824 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000041500 | 339.808 | 0.019 | n/a | 0.000 | 339.788 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.807 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d300000000000414ff | 339.778 | 0.044 | n/a | 0.000 | 339.732 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.777 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000002c98c | 339.193 | 0.436 | n/a | 0.000 | 338.754 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 339.190 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000002bbe4 | 339.053 | 0.243 | n/a | 0.000 | 338.809 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.052 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000002bbe3 | 338.981 | 0.165 | n/a | 0.000 | 338.812 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 338.977 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000002bbe7 | 338.911 | 0.019 | n/a | 0.000 | 338.891 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.910 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000002bbe6 | 338.874 | 0.014 | n/a | 0.000 | 338.859 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.873 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000002bbe5 | 338.871 | 0.021 | n/a | 0.000 | 338.848 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 338.869 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000002f871 | 278.415 | 0.066 | n/a | 0.000 | 278.345 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.412 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000002eeb4 | 278.323 | 0.068 | n/a | 0.000 | 278.252 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.320 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000002f87c | 278.200 | 0.180 | n/a | 0.000 | 278.019 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.199 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000002f87e | 278.083 | 0.016 | n/a | 0.000 | 278.065 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.082 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L256 / read (215 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.031 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 293.718 | n/a | n/a | n/a | 12.183 | n/a | 0.000 | 293.697 | 0.440 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.294 | 293.716 | 1.000 | 12.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0bf2a69b1653370600000000000409d2 | 295.030 | 0.095 | n/a | 0.000 | 294.931 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 295.026 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b1653370600000000000409ea | 294.009 | 0.072 | n/a | 0.000 | 293.933 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 294.005 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d3000000000005591e | 293.718 | 0.065 | n/a | 0.000 | 293.650 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.716 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d3000000000005591f | 293.716 | 0.024 | n/a | 0.000 | 293.691 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.715 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000055921 | 293.716 | 0.018 | n/a | 0.000 | 293.697 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.715 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000055920 | 293.709 | 0.021 | n/a | 0.000 | 293.687 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.708 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d3000000000005591d | 293.708 | 0.146 | n/a | 0.000 | 293.561 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.707 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d3000000000005591c | 293.567 | 0.181 | n/a | 0.000 | 293.382 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 293.563 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0bf2a69b1653370600000000000409d1 | 292.732 | 0.158 | n/a | 0.000 | 292.570 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 292.728 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000003f434 | 292.694 | 0.052 | n/a | 0.000 | 292.639 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.691 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000003f433 | 292.650 | 0.088 | n/a | 0.000 | 292.559 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 292.647 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000003f432 | 292.588 | 0.032 | n/a | 0.000 | 292.553 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.586 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000003f431 | 292.563 | 0.039 | n/a | 0.000 | 292.522 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.561 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000003f430 | 292.500 | 0.179 | n/a | 0.000 | 292.317 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 292.496 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0bf2a69b1653370600000000000409fd | 291.839 | 0.033 | n/a | 0.000 | 291.804 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.837 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b1653370600000000000409fc | 291.821 | 0.039 | n/a | 0.000 | 291.780 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 291.819 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b1653370600000000000366f6 | 277.525 | 0.046 | n/a | 0.000 | 277.478 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.524 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| 0bf2a69b1653370600000000000366f5 | 277.450 | 0.054 | n/a | 0.000 | 277.395 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.449 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| 0bf2a69b1653370600000000000366f4 | 277.379 | 0.037 | n/a | 0.000 | 277.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.378 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| 0bf2a69b1653370600000000000366f3 | 277.305 | 0.050 | n/a | 0.000 | 277.253 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.303 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |

## P1 / L1024 / read (309 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 |
| p99 | 5.054 | n/a | n/a | n/a | 3.997 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.094 | 3.997 | 0.999 | 3.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68383e831c6fb7d30000000000056b31 | 21.018 | 2.272 | n/a | 0.000 | 0.000 | 0.513 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.232 | 2.272 | 0.108 | 18.232 | node-14/thread-3/socket.wait-first-byte | replica.apply-delta 0.019ms |
| 0bf2a69b165337060000000000041d0d | 16.237 | 3.997 | n/a | 0.000 | 0.000 | 0.816 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.424 | 3.997 | 0.246 | 11.424 | node-14/thread-5/socket.wait-first-byte | replica.apply-delta 0.025ms |
| f5a99e3556f7e555000000000004057d | 12.430 | 1.186 | n/a | 0.000 | 0.000 | 0.357 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.887 | 1.186 | 0.095 | 10.887 | node-14/thread-4/socket.wait-first-byte | replica.apply-delta 0.027ms |
| 0bf2a69b16533706000000000005205e | 5.054 | 5.052 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.052 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 68383e831c6fb7d30000000000065382 | 4.616 | 4.614 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.614 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 0bf2a69b16533706000000000005211e | 4.076 | 4.070 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 4.070 | 0.999 | 0.006 | node-14/thread-5/reader.execute | none observed |
| 68383e831c6fb7d3000000000005cffa | 3.696 | 3.694 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.694 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d3000000000005cffb | 3.691 | 3.678 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.678 | 0.997 | 0.013 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d3000000000005cffc | 3.680 | 3.667 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.667 | 0.996 | 0.013 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d3000000000005cffd | 3.663 | 3.648 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.648 | 0.996 | 0.015 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000673ac | 3.094 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.094 | 0.000 | 0.000 | 3.094 | uncovered | none observed |
| 68383e831c6fb7d300000000000673ab | 3.062 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.062 | 0.000 | 0.000 | 3.062 | uncovered | none observed |
| 0bf2a69b165337060000000000046a37 | 2.908 | 2.897 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.897 | 0.996 | 0.011 | node-14/thread-5/replica.pull-at | none observed |
| 0bf2a69b165337060000000000046a36 | 2.902 | 2.900 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.900 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 0bf2a69b165337060000000000046a38 | 2.899 | 2.887 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 2.887 | 0.996 | 0.012 | node-14/thread-5/reader.execute | none observed |
| 68383e831c6fb7d3000000000006bcd8 | 2.734 | 2.729 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.729 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| f5a99e3556f7e555000000000004543f | 2.390 | 2.389 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.389 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 0bf2a69b16533706000000000004c63c | 2.338 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.338 | 0.000 | 0.000 | 2.338 | uncovered | none observed |
| 0bf2a69b1653370600000000000519ef | 2.328 | 2.324 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.324 | 0.998 | 0.004 | node-14/thread-5/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000608e0 | 2.275 | 2.273 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.273 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / recovery / read (202 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.035 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 311.728 | n/a | n/a | n/a | 7.942 | n/a | 0.000 | 311.660 | 0.596 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.737 | 311.726 | 1.000 | 1.737 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68383e831c6fb7d30000000000074c48 | 311.822 | 0.059 | n/a | 0.000 | 311.761 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 311.819 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000074c47 | 311.771 | 0.023 | n/a | 0.000 | 311.747 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.770 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000074c46 | 311.728 | 0.066 | n/a | 0.000 | 311.660 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 311.726 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000074c67 | 311.170 | 0.033 | n/a | 0.000 | 311.136 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.169 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000074c68 | 311.156 | 0.026 | n/a | 0.000 | 311.129 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.155 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d30000000000074c45 | 310.325 | 0.288 | n/a | 0.000 | 310.032 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 310.320 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000005dea5 | 309.907 | 0.019 | n/a | 0.000 | 309.886 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.905 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000005dea4 | 309.903 | 0.054 | n/a | 0.000 | 309.848 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.902 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000005dea3 | 309.854 | 0.027 | n/a | 0.000 | 309.826 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.853 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000005dea2 | 309.840 | 0.066 | n/a | 0.000 | 309.772 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.838 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5a99e3556f7e555000000000005dea1 | 309.730 | 0.146 | n/a | 0.000 | 309.581 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 309.727 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000006051c | 309.682 | 0.045 | n/a | 0.000 | 309.635 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 309.679 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000006051b | 309.652 | 0.173 | n/a | 0.000 | 309.473 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 309.646 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000060531 | 307.890 | 0.017 | n/a | 0.000 | 307.872 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.889 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b16533706000000000006052f | 307.868 | 0.054 | n/a | 0.000 | 307.810 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 307.864 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000060530 | 307.865 | 0.024 | n/a | 0.000 | 307.840 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.864 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000060fa0 | 274.289 | 0.064 | n/a | 0.000 | 274.223 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.287 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000060f9f | 274.134 | 0.186 | n/a | 0.000 | 273.944 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 274.130 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000060fb5 | 274.095 | 0.026 | n/a | 0.000 | 274.068 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.094 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0bf2a69b165337060000000000060fb4 | 274.059 | 0.047 | n/a | 0.000 | 274.010 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.057 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (165 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 0.977 | n/a | n/a | n/a | 0.966 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.484 | 0.966 | 0.998 | 0.484 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68383e831c6fb7d30000000000077a51 | 38.792 | 19.883 | n/a | 1.333 | 0.000 | 0.521 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.056 | 21.215 | 0.547 | 17.056 | node-14/thread-3/socket.wait-first-byte | none observed |
| 68383e831c6fb7d3000000000008e205 | 0.977 | 0.966 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.966 | 0.989 | 0.011 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d3000000000008e2ed | 0.926 | 0.923 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.923 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d30000000000077e09 | 0.923 | 0.922 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.922 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d30000000000083532 | 0.922 | 0.921 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.921 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d30000000000094c14 | 0.707 | 0.705 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.705 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d30000000000087c90 | 0.681 | 0.664 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.664 | 0.975 | 0.017 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d3000000000008b788 | 0.597 | 0.595 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.595 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d3000000000008e025 | 0.573 | 0.571 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.571 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d3000000000007ac19 | 0.559 | 0.557 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.557 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d30000000000087bc5 | 0.517 | 0.509 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.509 | 0.984 | 0.008 | node-14/thread-3/reader.execute | none observed |
| 68383e831c6fb7d300000000000942ed | 0.484 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.484 | 0.000 | 0.000 | 0.484 | uncovered | none observed |
| 68383e831c6fb7d3000000000008e365 | 0.484 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.484 | 0.000 | 0.000 | 0.484 | uncovered | none observed |
| 68383e831c6fb7d3000000000009495e | 0.464 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.464 | 0.000 | 0.000 | 0.464 | uncovered | none observed |
| 68383e831c6fb7d3000000000008f6f0 | 0.428 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.428 | 0.000 | 0.000 | 0.428 | uncovered | none observed |
| 68383e831c6fb7d30000000000086d3c | 0.427 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.427 | 0.000 | 0.000 | 0.427 | uncovered | none observed |
| 68383e831c6fb7d3000000000008b7b3 | 0.405 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.405 | 0.000 | 0.000 | 0.405 | uncovered | none observed |
| 68383e831c6fb7d30000000000091551 | 0.405 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.405 | 0.000 | 0.000 | 0.405 | uncovered | none observed |
| 68383e831c6fb7d3000000000008e213 | 0.394 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.394 | 0.000 | 0.000 | 0.394 | uncovered | none observed |
| 68383e831c6fb7d3000000000008e7b5 | 0.388 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.388 | 0.000 | 0.000 | 0.388 | uncovered | none observed |

## P4 / p4h1 / read (157 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 1.219 | n/a | n/a | n/a | 1.216 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.487 | 1.216 | 0.998 | 0.487 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68383e831c6fb7d30000000000096f5e | 12.564 | 3.293 | n/a | 0.000 | 0.000 | 0.481 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.790 | 3.293 | 0.262 | 8.790 | node-14/thread-3/socket.wait-first-byte | none observed |
| 68383e831c6fb7d300000000000b4b85 | 1.219 | 1.216 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.216 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000a3177 | 0.813 | 0.812 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.812 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000b9167 | 0.764 | 0.762 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.762 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000af704 | 0.634 | 0.633 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.633 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d3000000000009f118 | 0.582 | 0.578 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.578 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d3000000000009da8b | 0.555 | 0.553 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.553 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000b4bde | 0.539 | 0.537 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.537 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000a4b59 | 0.534 | 0.532 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.532 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000a6c68 | 0.532 | 0.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.529 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.053ms |
| 68383e831c6fb7d300000000000b4797 | 0.517 | 0.512 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.512 | 0.991 | 0.005 | node-14/thread-3/reader.execute | none observed |
| 68383e831c6fb7d3000000000009d6ab | 0.508 | 0.504 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.504 | 0.992 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 68383e831c6fb7d300000000000affd7 | 0.487 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.487 | 0.000 | 0.000 | 0.487 | uncovered | none observed |
| 68383e831c6fb7d300000000000a6a87 | 0.482 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.482 | 0.000 | 0.000 | 0.482 | uncovered | none observed |
| 68383e831c6fb7d300000000000b5dc7 | 0.473 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.473 | 0.000 | 0.000 | 0.473 | uncovered | none observed |
| 68383e831c6fb7d300000000000b0484 | 0.448 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.448 | 0.000 | 0.000 | 0.448 | uncovered | none observed |
| 68383e831c6fb7d300000000000b2a04 | 0.445 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.445 | 0.000 | 0.000 | 0.445 | uncovered | none observed |
| 68383e831c6fb7d300000000000b70ca | 0.435 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 | uncovered | none observed |
| 68383e831c6fb7d300000000000b5de1 | 0.429 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.429 | 0.000 | 0.000 | 0.429 | uncovered | none observed |
| 68383e831c6fb7d300000000000b667b | 0.409 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.409 | 0.000 | 0.000 | 0.409 | uncovered | none observed |

## P4 / p4h3 / read (159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 1.028 | n/a | n/a | n/a | 0.599 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.028 | 0.599 | 0.997 | 1.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68383e831c6fb7d300000000000bb527 | 8.785 | 1.826 | n/a | 0.000 | 0.000 | 0.747 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.212 | 1.826 | 0.208 | 6.212 | node-14/thread-3/socket.wait-first-byte | none observed |
| 68383e831c6fb7d300000000000d4eb9 | 1.028 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.028 | 0.000 | 0.000 | 1.028 | uncovered | none observed |
| 68383e831c6fb7d300000000000c8251 | 0.608 | 0.599 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.599 | 0.986 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000cda93 | 0.568 | 0.566 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.566 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000c8254 | 0.564 | 0.560 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.560 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000dd2a2 | 0.550 | 0.548 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.548 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000c96c5 | 0.498 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.498 | 0.000 | 0.000 | 0.498 | uncovered | none observed |
| 68383e831c6fb7d300000000000da333 | 0.449 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.449 | 0.000 | 0.000 | 0.449 | uncovered | none observed |
| 68383e831c6fb7d300000000000d1fb9 | 0.432 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.432 | 0.000 | 0.000 | 0.432 | uncovered | none observed |
| 68383e831c6fb7d300000000000c06d5 | 0.421 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.421 | 0.000 | 0.000 | 0.421 | uncovered | none observed |
| 68383e831c6fb7d300000000000d281f | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| 68383e831c6fb7d300000000000cbe68 | 0.416 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 | uncovered | none observed |
| 68383e831c6fb7d300000000000d6092 | 0.399 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | uncovered | none observed |
| 68383e831c6fb7d300000000000c5962 | 0.396 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.396 | 0.000 | 0.000 | 0.396 | uncovered | none observed |
| 68383e831c6fb7d300000000000bd06a | 0.386 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.386 | 0.000 | 0.000 | 0.386 | uncovered | none observed |
| 68383e831c6fb7d300000000000de946 | 0.386 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.386 | 0.000 | 0.000 | 0.386 | uncovered | none observed |
| 68383e831c6fb7d300000000000c20fe | 0.382 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 | uncovered | none observed |
| 68383e831c6fb7d300000000000de8a0 | 0.380 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.380 | 0.000 | 0.000 | 0.380 | uncovered | none observed |
| 68383e831c6fb7d300000000000cc2e1 | 0.378 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | uncovered | none observed |
| 68383e831c6fb7d300000000000d60b5 | 0.372 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.372 | 0.000 | 0.000 | 0.372 | uncovered | none observed |

## P4 / p4h10 / read (145 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 18.017 | n/a | n/a | n/a | 11.970 | n/a | 0.000 | 0.000 | 0.942 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.294 | 11.970 | 0.999 | 8.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 68383e831c6fb7d300000000000f04f3 | 20.608 | 11.970 | n/a | 0.000 | 0.000 | 0.344 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.294 | 11.970 | 0.581 | 8.294 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.057ms; replica.apply-delta 0.031ms |
| 68383e831c6fb7d300000000000debbf | 18.017 | 4.655 | n/a | 0.000 | 0.000 | 1.069 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.293 | 4.655 | 0.258 | 12.293 | node-14/thread-3/socket.wait-first-byte | none observed |
| 68383e831c6fb7d300000000000f04f2 | 17.078 | 13.654 | n/a | 0.000 | 0.000 | 0.942 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.482 | 13.654 | 0.799 | 2.482 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000dfa23 | 5.006 | 5.004 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 5.004 | 1.000 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 68383e831c6fb7d300000000000e264a | 1.172 | 1.170 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.170 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e1b01 | 1.151 | 1.144 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 1.144 | 0.994 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e2d33 | 1.078 | 1.076 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.076 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000ea6ee | 0.902 | 0.901 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.901 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e2b23 | 0.871 | 0.842 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 0.842 | 0.967 | 0.029 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000ef901 | 0.847 | 0.845 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.845 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e28c0 | 0.839 | 0.837 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.837 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000eaf8b | 0.803 | 0.801 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.801 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e2a68 | 0.792 | 0.790 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.790 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e2490 | 0.792 | 0.782 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.782 | 0.988 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e2266 | 0.781 | 0.775 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.775 | 0.993 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e2665 | 0.766 | 0.765 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.765 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e2c5c | 0.729 | 0.728 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.728 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e0d69 | 0.712 | 0.708 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.708 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e24a1 | 0.694 | 0.686 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.686 | 0.988 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 68383e831c6fb7d300000000000e2ba5 | 0.685 | 0.680 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.680 | 0.993 | 0.005 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (198 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.046 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.000 | 0.000 | 0.022 |
| p99 | 456.493 | n/a | n/a | n/a | 15.282 | n/a | 4.699 | 456.234 | 1.138 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.372 | 456.442 | 1.000 | 10.372 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0bf2a69b16533706000000000006ec5b | 456.554 | 0.208 | n/a | 0.000 | 456.234 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.113 | 456.442 | 1.000 | 0.113 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms; replica.apply-delta 0.051ms; replica.apply-delta 0.049ms; replica.apply-delta 0.040ms; replica.apply-delta 0.039ms |
| 0bf2a69b16533706000000000006ec5a | 456.493 | 0.220 | n/a | 0.000 | 456.268 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 456.488 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms; replica.apply-delta 0.051ms; replica.apply-delta 0.049ms; replica.apply-delta 0.040ms; replica.apply-delta 0.039ms |
| 0bf2a69b16533706000000000006ec6f | 456.228 | 0.209 | n/a | 0.000 | 455.891 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.128 | 456.100 | 1.000 | 0.128 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms; replica.apply-delta 0.051ms; replica.apply-delta 0.049ms; replica.apply-delta 0.040ms; replica.apply-delta 0.039ms |
| 0bf2a69b16533706000000000006ec70 | 456.227 | 0.205 | n/a | 0.000 | 455.883 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.139 | 456.088 | 1.000 | 0.139 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms; replica.apply-delta 0.051ms; replica.apply-delta 0.049ms; replica.apply-delta 0.040ms; replica.apply-delta 0.039ms |
| 0bf2a69b16533706000000000006ec71 | 456.191 | 0.223 | n/a | 0.000 | 455.820 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.149 | 456.042 | 1.000 | 0.149 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms; replica.apply-delta 0.051ms; replica.apply-delta 0.049ms; replica.apply-delta 0.040ms; replica.apply-delta 0.039ms |
| f5a99e3556f7e555000000000006cd1d | 456.058 | 0.116 | n/a | 0.000 | 455.887 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.054 | 456.004 | 1.000 | 0.054 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.185ms; replica.apply-delta 0.056ms; replica.apply-delta 0.052ms; replica.apply-delta 0.051ms; replica.apply-delta 0.036ms |
| f5a99e3556f7e555000000000006cd1e | 456.055 | 0.115 | n/a | 0.000 | 455.877 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.063 | 455.992 | 1.000 | 0.063 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.185ms; replica.apply-delta 0.056ms; replica.apply-delta 0.052ms; replica.apply-delta 0.051ms; replica.apply-delta 0.036ms |
| f5a99e3556f7e555000000000006cd1c | 456.031 | 0.126 | n/a | 0.000 | 455.903 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 456.029 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.185ms; replica.apply-delta 0.056ms; replica.apply-delta 0.052ms; replica.apply-delta 0.051ms; replica.apply-delta 0.036ms |
| f5a99e3556f7e555000000000006cd25 | 455.923 | 0.118 | n/a | 0.000 | 455.737 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.069 | 455.854 | 1.000 | 0.069 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.185ms; replica.apply-delta 0.056ms; replica.apply-delta 0.052ms; replica.apply-delta 0.051ms; replica.apply-delta 0.036ms |
| f5a99e3556f7e555000000000006cd26 | 455.916 | 0.114 | n/a | 0.000 | 455.728 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.074 | 455.842 | 1.000 | 0.074 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.185ms; replica.apply-delta 0.056ms; replica.apply-delta 0.052ms; replica.apply-delta 0.051ms; replica.apply-delta 0.036ms |
| 68383e831c6fb7d30000000000107cf3 | 454.253 | 0.115 | n/a | 0.000 | 454.034 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.104 | 454.149 | 1.000 | 0.104 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.280ms; replica.apply-delta 0.065ms; replica.apply-delta 0.060ms; replica.apply-delta 0.056ms; replica.apply-delta 0.055ms |
| 68383e831c6fb7d30000000000107cf2 | 454.246 | 0.115 | n/a | 0.000 | 454.046 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.084 | 454.162 | 1.000 | 0.084 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.280ms; replica.apply-delta 0.065ms; replica.apply-delta 0.060ms; replica.apply-delta 0.056ms; replica.apply-delta 0.055ms |
| 68383e831c6fb7d30000000000107cf0 | 454.233 | 0.117 | n/a | 0.000 | 454.062 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.054 | 454.179 | 1.000 | 0.054 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.280ms; replica.apply-delta 0.065ms; replica.apply-delta 0.060ms; replica.apply-delta 0.056ms; replica.apply-delta 0.055ms |
| 68383e831c6fb7d30000000000107cf1 | 454.232 | 0.116 | n/a | 0.000 | 454.054 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.063 | 454.170 | 1.000 | 0.063 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.280ms; replica.apply-delta 0.065ms; replica.apply-delta 0.060ms; replica.apply-delta 0.056ms; replica.apply-delta 0.055ms |
| 68383e831c6fb7d30000000000107cef | 454.219 | 0.132 | n/a | 0.000 | 454.082 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 454.214 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.280ms; replica.apply-delta 0.065ms; replica.apply-delta 0.060ms; replica.apply-delta 0.056ms; replica.apply-delta 0.055ms |
| 68383e831c6fb7d30000000000107cf9 | 454.041 | 0.121 | n/a | 0.000 | 453.806 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.114 | 453.927 | 1.000 | 0.114 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.280ms; replica.apply-delta 0.065ms; replica.apply-delta 0.060ms; replica.apply-delta 0.056ms; replica.apply-delta 0.055ms |
| 68383e831c6fb7d300000000000ffecb | 279.590 | 0.012 | n/a | 0.000 | 279.577 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.589 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d300000000000ffeca | 279.578 | 0.013 | n/a | 0.000 | 279.564 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.577 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d300000000000ffec9 | 279.571 | 0.016 | n/a | 0.000 | 279.554 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.570 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 68383e831c6fb7d300000000000ffec8 | 279.570 | 0.024 | n/a | 0.000 | 279.545 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.569 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / baseline / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.007 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 0.052 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.052 | 0.000 | 0.000 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0bf2a69b16533706000000000000c0b5 | 0.052 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.052 | 0.000 | 0.000 | 0.052 | uncovered | none observed |
| f5a99e3556f7e555000000000000c1d0 | 0.045 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.045 | 0.000 | 0.000 | 0.045 | uncovered | none observed |
| 0bf2a69b16533706000000000000c0b6 | 0.012 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 | uncovered | none observed |
| 0bf2a69b16533706000000000000c0b7 | 0.007 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 | uncovered | none observed |
| 0bf2a69b16533706000000000000c0b9 | 0.006 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.000 | 0.000 | 0.006 | uncovered | none observed |
| 0bf2a69b16533706000000000000c0b8 | 0.005 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.000 | 0.000 | 0.005 | uncovered | none observed |

## P5 / sweep / read (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 4.230 | n/a | n/a | n/a | 3.834 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.045 | 4.114 | 0.988 | 0.045 |
| p99 | 6.759 | n/a | n/a | n/a | 6.387 | n/a | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.188 | 6.570 | 0.997 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f863d14a6ebbf160000000000000003 | 6.759 | 5.760 | n/a | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.188 | 6.570 | 0.972 | 0.188 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000283 | 6.410 | 6.387 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.387 | 0.996 | 0.023 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000284 | 6.054 | 6.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 6.026 | 0.995 | 0.029 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000285 | 5.653 | 5.611 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.042 | 5.611 | 0.993 | 0.042 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000286 | 5.444 | 5.408 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 5.408 | 0.993 | 0.036 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000287 | 5.119 | 5.077 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.042 | 5.077 | 0.992 | 0.042 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000288 | 4.856 | 4.806 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.050 | 4.806 | 0.990 | 0.050 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf1600000000000002f3 | 4.681 | 4.668 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 4.668 | 0.997 | 0.012 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000004 | 4.611 | 3.680 | n/a | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.120 | 4.491 | 0.974 | 0.120 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000289 | 4.537 | 4.486 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.051 | 4.486 | 0.989 | 0.051 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf16000000000000028a | 4.260 | 4.207 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 4.207 | 0.988 | 0.053 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000005 | 4.230 | 3.303 | n/a | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.116 | 4.114 | 0.973 | 0.116 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000006 | 4.077 | 3.147 | n/a | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.119 | 3.958 | 0.971 | 0.119 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf16000000000000028b | 4.061 | 4.004 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.057 | 4.004 | 0.986 | 0.057 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000007 | 3.942 | 3.003 | n/a | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.128 | 3.813 | 0.967 | 0.128 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000313 | 3.848 | 3.834 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.834 | 0.996 | 0.014 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000008 | 3.728 | 2.782 | n/a | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.135 | 3.593 | 0.964 | 0.135 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000303 | 3.712 | 3.671 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.040 | 3.671 | 0.989 | 0.040 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000314 | 3.678 | 3.633 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.045 | 3.633 | 0.988 | 0.045 | node-14/thread-6/replica.pull-at | none observed |
| 4f863d14a6ebbf160000000000000009 | 3.606 | 2.653 | n/a | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.143 | 3.463 | 0.960 | 0.143 | node-14/thread-6/replica.pull-at | none observed |

## P3 / outside-phases / read (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.048 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 200.984 | 0.018 | n/a | 0.114 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 |
| p99 | 218.777 | n/a | n/a | n/a | 1.167 | n/a | 0.000 | 0.000 | 3.277 | 216.712 | 0.595 | n/a | 1.806 | 0.000 | n/a | n/a | 0.468 | 1.167 | 0.013 | 0.468 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe0000000000000005 | 218.777 | 0.000 | n/a | 0.000 | 0.000 | 1.415 | 216.712 | 0.103 | n/a | 0.167 | 0.000 | n/a | n/a | 0.379 | 0.000 | 0.000 | 0.379 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000007 | 206.582 | 0.000 | n/a | 0.000 | 0.000 | 1.521 | 202.941 | 0.011 | n/a | 1.806 | 0.000 | n/a | n/a | 0.302 | 0.000 | 0.000 | 0.302 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000006 | 203.423 | 0.000 | n/a | 0.000 | 0.000 | 1.823 | 201.012 | 0.016 | n/a | 0.180 | 0.000 | n/a | n/a | 0.392 | 0.000 | 0.000 | 0.392 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe000000000000007f | 203.077 | 0.000 | n/a | 0.000 | 0.000 | 1.222 | 201.470 | 0.028 | n/a | 0.147 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000082 | 202.995 | 0.000 | n/a | 0.000 | 0.000 | 1.519 | 201.113 | 0.060 | n/a | 0.136 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe0000000000000061 | 202.764 | 0.000 | n/a | 0.000 | 0.000 | 1.150 | 201.310 | 0.012 | n/a | 0.155 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000007c | 202.701 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 201.439 | 0.019 | n/a | 0.162 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe000000000000005e | 202.619 | 0.000 | n/a | 0.000 | 0.000 | 0.993 | 201.302 | 0.057 | n/a | 0.103 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe000000000000009f | 202.616 | 0.000 | n/a | 0.000 | 0.000 | 1.192 | 201.110 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe00000000000000c7 | 202.483 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.297 | 0.057 | n/a | 0.192 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe00000000000000a2 | 202.293 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 201.107 | 0.015 | n/a | 0.154 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe00000000000000a4 | 202.282 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 201.080 | 0.055 | n/a | 0.150 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000060 | 202.140 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 201.046 | 0.025 | n/a | 0.109 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| 4768eb16d22b25fe000000000000009e | 202.110 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 200.984 | 0.016 | n/a | 0.123 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe00000000000000c9 | 202.055 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 201.003 | 0.013 | n/a | 0.114 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe0000000000000063 | 202.048 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 200.943 | 0.018 | n/a | 0.127 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 4768eb16d22b25fe00000000000000a0 | 202.034 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 200.935 | 0.021 | n/a | 0.230 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe00000000000000c8 | 202.014 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 201.076 | 0.020 | n/a | 0.134 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe00000000000000cb | 201.965 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.797 | 0.013 | n/a | 0.114 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe0000000000000080 | 201.945 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 200.923 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |

## P3 / outside-phases / internal (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 308.169 | n/a | n/a | n/a | 2.212 | n/a | 0.000 | 0.000 | 0.816 | 303.944 | 0.015 | n/a | 0.095 | 0.000 | n/a | n/a | 1.109 | 2.212 | 0.010 | 1.109 |
| p99 | 1005.797 | n/a | n/a | n/a | 83.791 | n/a | 5.045 | 0.000 | 1.499 | 1002.326 | 1.515 | n/a | 0.461 | 0.000 | n/a | n/a | 13.301 | 88.836 | 0.860 | 13.301 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000017 | 1005.797 | 0.204 | n/a | 0.000 | 0.000 | 1.499 | 1002.326 | 0.067 | n/a | 0.461 | 0.000 | n/a | n/a | 1.240 | 0.204 | 0.000 | 1.240 | gw-r/thread-46/journal/page | none observed |
| afed4e10977d04530000000000000018 | 1004.523 | 0.152 | n/a | 0.000 | 0.000 | 0.873 | 1002.101 | 0.020 | n/a | 0.140 | 0.000 | n/a | n/a | 1.238 | 0.152 | 0.000 | 1.238 | gw-r/thread-48/journal/page | none observed |
| afed4e10977d04530000000000000019 | 1003.978 | 0.266 | n/a | 0.000 | 0.000 | 1.292 | 1001.080 | 0.015 | n/a | 0.125 | 0.000 | n/a | n/a | 1.199 | 0.266 | 0.000 | 1.199 | gw-r/thread-63/journal/page | none observed |
| afed4e10977d04530000000000000083 | 1003.684 | 0.221 | n/a | 0.000 | 0.000 | 1.048 | 1001.183 | 0.018 | n/a | 0.093 | 0.000 | n/a | n/a | 1.121 | 0.221 | 0.000 | 1.121 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d04530000000000000053 | 1003.405 | 0.220 | n/a | 0.000 | 0.000 | 0.869 | 1001.022 | 0.030 | n/a | 0.112 | 0.000 | n/a | n/a | 1.152 | 0.220 | 0.000 | 1.152 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d0453000000000000009b | 1003.042 | 0.115 | n/a | 0.000 | 0.000 | 0.700 | 1001.009 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 1.109 | 0.115 | 0.000 | 1.109 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d04530000000000000080 | 736.101 | 2.212 | n/a | 0.000 | 0.000 | 0.668 | 733.015 | 0.024 | n/a | 0.120 | 0.000 | n/a | n/a | 0.062 | 2.212 | 0.003 | 0.062 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d04530000000000000063 | 592.924 | 2.124 | n/a | 0.000 | 0.000 | 1.056 | 589.479 | 0.011 | n/a | 0.148 | 0.000 | n/a | n/a | 0.105 | 2.124 | 0.004 | 0.105 | gw-r/thread-63/journal/page | none observed |
| afed4e10977d0453000000000000005f | 572.718 | 7.285 | n/a | 0.000 | 0.000 | 0.750 | 564.364 | 0.053 | n/a | 0.126 | 0.000 | n/a | n/a | 0.139 | 7.285 | 0.013 | 0.139 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d04530000000000000051 | 570.754 | 3.533 | n/a | 0.000 | 0.000 | 0.869 | 565.839 | 0.171 | n/a | 0.120 | 0.000 | n/a | n/a | 0.222 | 3.533 | 0.006 | 0.222 | gw-r/thread-46/journal/page | none observed |
| afed4e10977d0453000000000000005e | 308.169 | 3.316 | n/a | 0.000 | 0.000 | 0.740 | 303.944 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.074 | 3.316 | 0.011 | 0.074 | gw-r/thread-67/journal/page | none observed |
| afed4e10977d04530000000000000081 | 275.351 | 2.864 | n/a | 0.000 | 0.000 | 0.613 | 270.195 | 1.515 | n/a | 0.090 | 0.000 | n/a | n/a | 0.073 | 2.864 | 0.010 | 0.073 | gw-r/thread-63/journal/page | none observed |
| afed4e10977d04530000000000000064 | 224.311 | 3.489 | n/a | 0.000 | 0.000 | 1.111 | 219.494 | 0.014 | n/a | 0.128 | 0.000 | n/a | n/a | 0.075 | 3.489 | 0.016 | 0.075 | gw-r/thread-43/journal/page | none observed |
| afed4e10977d0453000000000000007f | 149.127 | 2.893 | n/a | 0.000 | 0.000 | 1.141 | 144.878 | 0.027 | n/a | 0.115 | 0.000 | n/a | n/a | 0.073 | 2.893 | 0.019 | 0.073 | gw-r/thread-48/journal/page | none observed |
| afed4e10977d0453000000000000005c | 103.248 | 83.791 | n/a | 5.045 | 0.000 | 1.111 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.301 | 88.836 | 0.860 | 13.301 | node-14/thread-2/replica.fetch-feed | none observed |
| afed4e10977d04530000000000000061 | 83.224 | 2.512 | n/a | 0.000 | 0.000 | 0.816 | 79.288 | 0.489 | n/a | 0.035 | 0.000 | n/a | n/a | 0.085 | 2.512 | 0.030 | 0.085 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d04530000000000000099 | 12.533 | 1.818 | n/a | 0.000 | 0.000 | 0.375 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.340 | 1.818 | 0.145 | 10.340 | node-14/thread-2/socket.wait-first-byte | none observed |
| afed4e10977d04530000000000000098 | 11.419 | 4.319 | n/a | 0.000 | 0.000 | 0.355 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.745 | 4.319 | 0.378 | 6.745 | node-14/thread-2/socket.wait-first-byte | none observed |
| afed4e10977d0453000000000000005d | 6.786 | 3.250 | n/a | 0.000 | 0.000 | 0.488 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.048 | 3.250 | 0.479 | 3.048 | node-14/thread-2/socket.wait-first-byte | none observed |
| afed4e10977d0453000000000000009a | 6.406 | 2.002 | n/a | 0.000 | 0.000 | 0.277 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.127 | 2.002 | 0.312 | 4.127 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 303.763 | n/a | n/a | n/a | 2.902 | n/a | 0.000 | 0.000 | 0.884 | 269.683 | 0.014 | n/a | 0.106 | 0.000 | n/a | n/a | 0.251 | 2.902 | 0.012 | 0.251 |
| p99 | 716.490 | n/a | n/a | n/a | 30.409 | n/a | 1.117 | 0.000 | 3.507 | 711.749 | 0.021 | n/a | 0.185 | 0.000 | n/a | n/a | 1.543 | 31.526 | 0.104 | 1.543 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d0453000000000000001d | 716.490 | 2.715 | n/a | 0.000 | 0.000 | 1.576 | 711.749 | 0.014 | n/a | 0.185 | 0.000 | n/a | n/a | 0.251 | 2.715 | 0.004 | 0.251 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d0453000000000000001b | 480.348 | 17.443 | n/a | 0.000 | 0.000 | 3.507 | 458.904 | 0.017 | n/a | 0.123 | 0.000 | n/a | n/a | 0.354 | 17.443 | 0.036 | 0.354 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d0453000000000000001a | 303.763 | 30.409 | n/a | 1.117 | 0.000 | 0.884 | 269.683 | 0.021 | n/a | 0.106 | 0.000 | n/a | n/a | 1.543 | 31.526 | 0.104 | 1.543 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d0453000000000000001e | 232.865 | 2.902 | n/a | 0.000 | 0.000 | 0.816 | 228.805 | 0.014 | n/a | 0.097 | 0.000 | n/a | n/a | 0.230 | 2.902 | 0.012 | 0.230 | gw-r/thread-47/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 227.726 | n/a | n/a | n/a | 2.875 | n/a | 0.000 | 0.000 | 0.730 | 220.261 | 0.016 | n/a | 0.130 | 0.000 | n/a | n/a | 0.119 | 2.875 | 0.004 | 0.119 |
| p99 | 976.332 | n/a | n/a | n/a | 6.287 | n/a | 0.000 | 0.000 | 1.347 | 972.281 | 0.020 | n/a | 0.181 | 0.000 | n/a | n/a | 15.118 | 6.287 | 0.184 | 15.118 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000023 | 976.332 | 2.404 | n/a | 0.000 | 0.000 | 1.347 | 972.281 | 0.018 | n/a | 0.181 | 0.000 | n/a | n/a | 0.101 | 2.404 | 0.002 | 0.101 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d04530000000000000020 | 773.231 | 2.875 | n/a | 0.000 | 0.000 | 1.302 | 768.742 | 0.016 | n/a | 0.176 | 0.000 | n/a | n/a | 0.119 | 2.875 | 0.004 | 0.119 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d04530000000000000021 | 227.726 | 6.287 | n/a | 0.000 | 0.000 | 0.730 | 220.261 | 0.020 | n/a | 0.130 | 0.000 | n/a | n/a | 0.299 | 6.287 | 0.028 | 0.299 | gw-r/thread-48/journal/page | none observed |
| afed4e10977d04530000000000000024 | 19.112 | 3.509 | n/a | 0.000 | 0.000 | 0.485 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.118 | 3.509 | 0.184 | 15.118 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 735.423 | n/a | n/a | n/a | 4.357 | n/a | 0.000 | 0.000 | 1.241 | 729.559 | 0.022 | n/a | 0.114 | 0.000 | n/a | n/a | 0.197 | 4.357 | 0.006 | 0.197 |
| p99 | 994.636 | n/a | n/a | n/a | 11.056 | n/a | 0.000 | 0.000 | 1.689 | 988.863 | 0.025 | n/a | 0.158 | 0.000 | n/a | n/a | 0.206 | 11.056 | 0.041 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000029 | 994.636 | 4.357 | n/a | 0.000 | 0.000 | 1.165 | 988.863 | 0.025 | n/a | 0.111 | 0.000 | n/a | n/a | 0.116 | 4.357 | 0.004 | 0.116 | gw-r/thread-66/journal/page | none observed |
| afed4e10977d04530000000000000027 | 735.423 | 4.285 | n/a | 0.000 | 0.000 | 1.241 | 729.559 | 0.018 | n/a | 0.114 | 0.000 | n/a | n/a | 0.206 | 4.285 | 0.006 | 0.206 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d04530000000000000026 | 270.862 | 11.056 | n/a | 0.000 | 0.000 | 1.689 | 257.740 | 0.022 | n/a | 0.158 | 0.000 | n/a | n/a | 0.197 | 11.056 | 0.041 | 0.197 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 416.215 | n/a | n/a | n/a | 3.476 | n/a | 0.000 | 0.000 | 1.037 | 409.624 | 0.017 | n/a | 0.124 | 0.000 | n/a | n/a | 0.148 | 3.476 | 0.008 | 0.148 |
| p99 | 1004.831 | n/a | n/a | n/a | 7.548 | n/a | 0.000 | 0.000 | 2.072 | 1000.972 | 0.044 | n/a | 0.143 | 0.000 | n/a | n/a | 2.074 | 7.548 | 0.042 | 2.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d0453000000000000002f | 1004.831 | 0.618 | n/a | 0.000 | 0.000 | 1.037 | 1000.972 | 0.011 | n/a | 0.119 | 0.000 | n/a | n/a | 2.074 | 0.618 | 0.001 | 2.074 | gw-r/thread-67/journal/page | none observed |
| afed4e10977d0453000000000000002b | 429.115 | 3.476 | n/a | 0.000 | 0.000 | 0.901 | 424.459 | 0.044 | n/a | 0.143 | 0.000 | n/a | n/a | 0.092 | 3.476 | 0.008 | 0.092 | gw-r/thread-43/journal/page | none observed |
| afed4e10977d0453000000000000002d | 416.215 | 4.173 | n/a | 0.000 | 0.000 | 2.072 | 409.624 | 0.019 | n/a | 0.133 | 0.000 | n/a | n/a | 0.194 | 4.173 | 0.010 | 0.194 | gw-r/thread-46/journal/page | none observed |
| afed4e10977d0453000000000000002a | 180.574 | 7.548 | n/a | 0.000 | 0.000 | 2.061 | 170.677 | 0.017 | n/a | 0.124 | 0.000 | n/a | n/a | 0.148 | 7.548 | 0.042 | 0.148 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 285.279 | n/a | n/a | n/a | 2.775 | n/a | 0.000 | 0.000 | 1.153 | 281.097 | 0.018 | n/a | 0.118 | 0.000 | n/a | n/a | 0.119 | 2.775 | 0.010 | 0.119 |
| p99 | 958.642 | n/a | n/a | n/a | 9.361 | n/a | 0.000 | 0.000 | 2.393 | 952.700 | 0.178 | n/a | 0.148 | 0.000 | n/a | n/a | 5.423 | 9.361 | 0.618 | 5.423 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000031 | 958.642 | 4.751 | n/a | 0.000 | 0.000 | 0.882 | 952.700 | 0.015 | n/a | 0.118 | 0.000 | n/a | n/a | 0.175 | 4.751 | 0.005 | 0.175 | gw-r/thread-47/journal/page | none observed |
| afed4e10977d04530000000000000036 | 630.367 | 2.537 | n/a | 0.000 | 0.000 | 1.238 | 626.231 | 0.178 | n/a | 0.064 | 0.000 | n/a | n/a | 0.119 | 2.537 | 0.004 | 0.119 | gw-r/thread-47/journal/page | none observed |
| afed4e10977d04530000000000000032 | 285.279 | 2.775 | n/a | 0.000 | 0.000 | 1.153 | 281.097 | 0.018 | n/a | 0.148 | 0.000 | n/a | n/a | 0.089 | 2.775 | 0.010 | 0.089 | gw-r/thread-43/journal/page | none observed |
| afed4e10977d04530000000000000034 | 117.700 | 2.184 | n/a | 0.000 | 0.000 | 2.393 | 112.873 | 0.027 | n/a | 0.128 | 0.000 | n/a | n/a | 0.094 | 2.184 | 0.019 | 0.094 | gw-r/thread-47/journal/page | none observed |
| afed4e10977d04530000000000000030 | 15.154 | 9.361 | n/a | 0.000 | 0.000 | 0.370 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.423 | 9.361 | 0.618 | 5.423 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 319.459 | n/a | n/a | n/a | 2.921 | n/a | 0.000 | 0.000 | 1.128 | 316.036 | 0.023 | n/a | 0.136 | 0.000 | n/a | n/a | 0.104 | 2.921 | 0.006 | 0.104 |
| p99 | 754.755 | n/a | n/a | n/a | 9.241 | n/a | 3.755 | 0.000 | 3.202 | 737.929 | 2.990 | n/a | 0.169 | 0.000 | n/a | n/a | 0.473 | 12.996 | 0.017 | 0.473 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000037 | 754.755 | 9.241 | n/a | 3.755 | 0.000 | 3.202 | 737.929 | 0.019 | n/a | 0.136 | 0.000 | n/a | n/a | 0.473 | 12.996 | 0.017 | 0.473 | gw-r/thread-45/journal/page | none observed |
| afed4e10977d0453000000000000003c | 710.606 | 3.429 | n/a | 0.000 | 0.000 | 0.537 | 703.395 | 2.990 | n/a | 0.152 | 0.000 | n/a | n/a | 0.104 | 3.429 | 0.005 | 0.104 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d0453000000000000003a | 319.459 | 1.957 | n/a | 0.000 | 0.000 | 1.190 | 316.036 | 0.023 | n/a | 0.169 | 0.000 | n/a | n/a | 0.084 | 1.957 | 0.006 | 0.084 | gw-r/thread-46/journal/page | none observed |
| afed4e10977d04530000000000000039 | 255.313 | 2.921 | n/a | 0.000 | 0.000 | 1.128 | 250.992 | 0.031 | n/a | 0.132 | 0.000 | n/a | n/a | 0.110 | 2.921 | 0.011 | 0.110 | gw-r/thread-67/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 315.204 | n/a | n/a | n/a | 3.908 | n/a | 0.000 | 0.000 | 1.019 | 306.584 | 0.247 | n/a | 0.117 | 0.000 | n/a | n/a | 0.111 | 3.908 | 0.011 | 0.111 |
| p99 | 736.754 | n/a | n/a | n/a | 7.259 | n/a | 0.000 | 0.000 | 2.340 | 730.066 | 1.959 | n/a | 0.211 | 0.000 | n/a | n/a | 0.202 | 7.259 | 0.036 | 0.202 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d0453000000000000003f | 736.754 | 4.766 | n/a | 0.000 | 0.000 | 1.375 | 730.066 | 0.247 | n/a | 0.211 | 0.000 | n/a | n/a | 0.090 | 4.766 | 0.006 | 0.090 | gw-r/thread-63/journal/page | none observed |
| afed4e10977d04530000000000000040 | 518.275 | 2.883 | n/a | 0.000 | 0.000 | 0.769 | 514.411 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.111 | 2.883 | 0.006 | 0.111 | gw-r/thread-45/journal/page | none observed |
| afed4e10977d04530000000000000041 | 315.204 | 7.259 | n/a | 0.000 | 0.000 | 1.019 | 306.584 | 0.012 | n/a | 0.128 | 0.000 | n/a | n/a | 0.202 | 7.259 | 0.023 | 0.202 | gw-r/thread-48/journal/page | none observed |
| afed4e10977d0453000000000000003d | 242.861 | 2.675 | n/a | 0.000 | 0.000 | 0.657 | 237.356 | 1.959 | n/a | 0.117 | 0.000 | n/a | n/a | 0.096 | 2.675 | 0.011 | 0.096 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d04530000000000000044 | 109.684 | 3.908 | n/a | 0.000 | 0.000 | 2.340 | 102.364 | 0.816 | n/a | 0.077 | 0.000 | n/a | n/a | 0.177 | 3.908 | 0.036 | 0.177 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 993.800 | n/a | n/a | n/a | 2.613 | n/a | 0.000 | 0.000 | 0.901 | 990.065 | 0.016 | n/a | 0.103 | 0.000 | n/a | n/a | 1.500 | 2.613 | 0.003 | 1.500 |
| p99 | 1004.521 | n/a | n/a | n/a | 4.624 | n/a | 0.000 | 0.000 | 0.942 | 1001.757 | 0.027 | n/a | 0.122 | 0.000 | n/a | n/a | 4.063 | 4.624 | 0.511 | 4.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000045 | 1004.521 | 0.192 | n/a | 0.000 | 0.000 | 0.942 | 1001.757 | 0.027 | n/a | 0.103 | 0.000 | n/a | n/a | 1.500 | 0.192 | 0.000 | 1.500 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d04530000000000000047 | 993.800 | 2.613 | n/a | 0.000 | 0.000 | 0.901 | 990.065 | 0.016 | n/a | 0.122 | 0.000 | n/a | n/a | 0.083 | 2.613 | 0.003 | 0.083 | gw-r/thread-47/journal/page | none observed |
| afed4e10977d04530000000000000046 | 9.054 | 4.624 | n/a | 0.000 | 0.000 | 0.368 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.063 | 4.624 | 0.511 | 4.063 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 354.750 | n/a | n/a | n/a | 3.136 | n/a | 0.000 | 0.000 | 0.968 | 349.911 | 0.019 | n/a | 0.104 | 0.000 | n/a | n/a | 0.125 | 3.136 | 0.008 | 0.125 |
| p99 | 1013.112 | n/a | n/a | n/a | 5.748 | n/a | 0.000 | 0.000 | 1.375 | 1005.431 | 0.055 | n/a | 0.158 | 0.000 | n/a | n/a | 0.344 | 5.748 | 0.013 | 0.344 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000048 | 1013.112 | 5.748 | n/a | 0.000 | 0.000 | 1.375 | 1005.431 | 0.055 | n/a | 0.158 | 0.000 | n/a | n/a | 0.344 | 5.748 | 0.006 | 0.344 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d0453000000000000004b | 400.991 | 3.136 | n/a | 0.000 | 0.000 | 1.075 | 396.531 | 0.019 | n/a | 0.104 | 0.000 | n/a | n/a | 0.126 | 3.136 | 0.008 | 0.126 | gw-r/thread-63/journal/page | none observed |
| afed4e10977d04530000000000000049 | 354.750 | 3.613 | n/a | 0.000 | 0.000 | 0.968 | 349.911 | 0.021 | n/a | 0.113 | 0.000 | n/a | n/a | 0.125 | 3.613 | 0.010 | 0.125 | gw-r/thread-48/journal/page | none observed |
| afed4e10977d0453000000000000004d | 237.024 | 2.996 | n/a | 0.000 | 0.000 | 0.791 | 233.049 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.102 | 2.996 | 0.013 | 0.102 | gw-r/thread-45/journal/page | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 958.098 | n/a | n/a | n/a | 5.524 | n/a | 0.000 | 0.000 | 1.237 | 951.259 | 0.015 | n/a | 0.107 | 0.000 | n/a | n/a | 0.114 | 5.524 | 0.005 | 0.114 |
| p99 | 1010.665 | n/a | n/a | n/a | 6.967 | n/a | 0.000 | 0.000 | 3.605 | 1003.448 | 0.341 | n/a | 0.777 | 0.000 | n/a | n/a | 0.138 | 6.967 | 0.016 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d0453000000000000004e | 1010.665 | 5.524 | n/a | 0.000 | 0.000 | 0.794 | 1003.448 | 0.007 | n/a | 0.777 | 0.000 | n/a | n/a | 0.114 | 5.524 | 0.005 | 0.114 | gw-r/thread-67/journal/page | none observed |
| afed4e10977d0453000000000000004f | 958.098 | 2.695 | n/a | 0.000 | 0.000 | 3.605 | 951.259 | 0.341 | n/a | 0.107 | 0.000 | n/a | n/a | 0.091 | 2.695 | 0.003 | 0.091 | gw-r/thread-63/journal/page | none observed |
| afed4e10977d04530000000000000050 | 441.964 | 6.967 | n/a | 0.000 | 0.000 | 1.237 | 433.509 | 0.015 | n/a | 0.099 | 0.000 | n/a | n/a | 0.138 | 6.967 | 0.016 | 0.138 | gw-r/thread-66/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 754.901 | n/a | n/a | n/a | 3.530 | n/a | 0.000 | 0.000 | 0.807 | 747.564 | 0.021 | n/a | 0.102 | 0.000 | n/a | n/a | 0.103 | 3.530 | 0.006 | 0.103 |
| p99 | 927.115 | n/a | n/a | n/a | 4.855 | n/a | 0.000 | 0.000 | 2.251 | 923.630 | 2.750 | n/a | 0.107 | 0.000 | n/a | n/a | 0.109 | 4.855 | 0.064 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000055 | 927.115 | 2.563 | n/a | 0.000 | 0.000 | 0.695 | 923.630 | 0.021 | n/a | 0.107 | 0.000 | n/a | n/a | 0.099 | 2.563 | 0.003 | 0.099 | gw-r/thread-45/journal/page | none observed |
| afed4e10977d04530000000000000056 | 754.901 | 4.855 | n/a | 0.000 | 0.000 | 2.251 | 747.564 | 0.020 | n/a | 0.102 | 0.000 | n/a | n/a | 0.109 | 4.855 | 0.006 | 0.109 | gw-r/thread-66/journal/page | none observed |
| afed4e10977d04530000000000000054 | 55.579 | 3.530 | n/a | 0.000 | 0.000 | 0.807 | 48.356 | 2.750 | n/a | 0.033 | 0.000 | n/a | n/a | 0.103 | 3.530 | 0.064 | 0.103 | gw-r/thread-49/journal/page | none observed |

## P3 / grow3 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 276.092 | n/a | n/a | n/a | 4.329 | n/a | 0.000 | 0.000 | 0.854 | 270.826 | 0.014 | n/a | 0.084 | 0.000 | n/a | n/a | 0.167 | 4.329 | 0.045 | 0.167 |
| p99 | 794.779 | n/a | n/a | n/a | 112.799 | n/a | 6.059 | 0.000 | 1.132 | 668.914 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 6.452 | 118.858 | 0.150 | 6.452 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d0453000000000000005a | 794.779 | 112.799 | n/a | 6.059 | 0.000 | 0.457 | 668.914 | 0.014 | n/a | 0.084 | 0.000 | n/a | n/a | 6.452 | 118.858 | 0.150 | 6.452 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d04530000000000000057 | 276.092 | 3.921 | n/a | 0.000 | 0.000 | 1.132 | 270.826 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.094 | 3.921 | 0.014 | 0.094 | gw-r/thread-66/journal/page | none observed |
| afed4e10977d04530000000000000059 | 96.741 | 4.329 | n/a | 0.000 | 0.000 | 0.854 | 91.309 | 0.014 | n/a | 0.069 | 0.000 | n/a | n/a | 0.167 | 4.329 | 0.045 | 0.167 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h3 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 211.133 | n/a | n/a | n/a | 3.329 | n/a | 0.000 | 0.000 | 0.988 | 206.809 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.077 | 3.329 | 0.016 | 0.077 |
| p99 | 910.726 | n/a | n/a | n/a | 157.396 | n/a | 10.245 | 0.000 | 1.988 | 733.248 | 0.171 | n/a | 0.199 | 0.000 | n/a | n/a | 42.845 | 167.641 | 0.240 | 42.845 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000076 | 910.726 | 157.396 | n/a | 10.245 | 0.000 | 1.335 | 733.248 | 0.045 | n/a | 0.194 | 0.000 | n/a | n/a | 8.262 | 167.641 | 0.184 | 8.262 | gw-r/thread-46/journal/page | none observed |
| afed4e10977d04530000000000000073 | 507.464 | 18.214 | n/a | 0.000 | 0.000 | 1.570 | 487.511 | 0.019 | n/a | 0.074 | 0.000 | n/a | n/a | 0.077 | 18.214 | 0.036 | 0.077 | gw-r/thread-49/journal/page | none observed |
| afed4e10977d04530000000000000074 | 467.799 | 3.329 | n/a | 0.000 | 0.000 | 0.988 | 463.195 | 0.012 | n/a | 0.199 | 0.000 | n/a | n/a | 0.075 | 3.329 | 0.007 | 0.075 | gw-r/thread-63/journal/page | none observed |
| afed4e10977d0453000000000000006a | 299.533 | 5.895 | n/a | 0.000 | 0.000 | 1.191 | 292.261 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.072 | 5.895 | 0.020 | 0.072 | gw-r/thread-47/journal/page | none observed |
| afed4e10977d0453000000000000006b | 257.629 | 3.133 | n/a | 0.000 | 0.000 | 1.237 | 253.104 | 0.012 | n/a | 0.062 | 0.000 | n/a | n/a | 0.082 | 3.133 | 0.012 | 0.082 | gw-r/thread-47/journal/page | none observed |
| afed4e10977d04530000000000000068 | 211.133 | 3.413 | n/a | 0.000 | 0.000 | 0.599 | 206.809 | 0.158 | n/a | 0.081 | 0.000 | n/a | n/a | 0.073 | 3.413 | 0.016 | 0.073 | gw-r/thread-45/journal/page | none observed |
| afed4e10977d04530000000000000067 | 197.054 | 3.095 | n/a | 0.000 | 0.000 | 0.632 | 193.119 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.126 | 3.095 | 0.016 | 0.126 | gw-r/thread-48/journal/page | none observed |
| afed4e10977d04530000000000000071 | 169.189 | 2.206 | n/a | 0.000 | 0.000 | 1.988 | 164.676 | 0.171 | n/a | 0.085 | 0.000 | n/a | n/a | 0.063 | 2.206 | 0.013 | 0.063 | gw-r/thread-66/journal/page | none observed |
| afed4e10977d0453000000000000006f | 45.575 | 2.396 | n/a | 0.000 | 0.000 | 0.334 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.845 | 2.396 | 0.053 | 42.845 | node-14/thread-2/socket.wait-first-byte | none observed |
| afed4e10977d0453000000000000006d | 24.803 | 5.942 | n/a | 0.000 | 0.000 | 0.511 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.350 | 5.942 | 0.240 | 18.350 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 141.971 | n/a | n/a | n/a | 91.300 | n/a | 3.771 | 0.000 | 1.063 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.449 | 95.071 | 0.626 | 3.449 |
| p99 | 206.189 | n/a | n/a | n/a | 124.628 | n/a | 8.844 | 0.000 | 2.017 | 71.126 | 1.826 | n/a | 0.117 | 0.000 | n/a | n/a | 45.801 | 129.022 | 0.808 | 45.801 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d0453000000000000007c | 206.189 | 124.628 | n/a | 4.394 | 0.000 | 2.017 | 71.126 | 1.826 | n/a | 0.117 | 0.000 | n/a | n/a | 2.080 | 129.022 | 0.626 | 2.080 | node-14/thread-2/replica.fetch-feed | none observed |
| afed4e10977d04530000000000000077 | 187.563 | 113.952 | n/a | 2.932 | 0.000 | 0.836 | 66.565 | 0.095 | n/a | 0.038 | 0.000 | n/a | n/a | 3.144 | 116.885 | 0.623 | 3.144 | node-14/thread-2/replica.fetch-feed | none observed |
| afed4e10977d0453000000000000007b | 158.206 | 78.744 | n/a | 8.844 | 0.000 | 0.927 | 66.160 | 0.020 | n/a | 0.062 | 0.000 | n/a | n/a | 3.449 | 87.587 | 0.554 | 3.449 | node-14/thread-2/replica.fetch-feed | none observed |
| afed4e10977d0453000000000000007d | 141.971 | 91.300 | n/a | 3.771 | 0.000 | 1.099 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.801 | 95.071 | 0.670 | 45.801 | node-14/thread-2/replica.fetch-feed | none observed |
| afed4e10977d0453000000000000007e | 123.681 | 77.948 | n/a | 3.785 | 0.000 | 1.139 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.809 | 81.733 | 0.661 | 40.809 | node-14/thread-2/replica.fetch-feed | none observed |
| afed4e10977d04530000000000000078 | 117.865 | 91.886 | n/a | 3.323 | 0.000 | 1.063 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.593 | 95.209 | 0.808 | 21.593 | node-14/thread-2/replica.fetch-feed | none observed |
| afed4e10977d04530000000000000079 | 4.059 | 2.292 | n/a | 0.000 | 0.000 | 0.343 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.424 | 2.292 | 0.565 | 1.424 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 205.828 | n/a | n/a | n/a | 2.494 | n/a | 0.000 | 0.000 | 0.732 | 201.088 | 0.023 | n/a | 0.090 | 0.000 | n/a | n/a | 0.077 | 2.494 | 0.017 | 0.077 |
| p99 | 1003.087 | n/a | n/a | n/a | 17.613 | n/a | 0.000 | 0.000 | 1.124 | 1000.956 | 3.175 | n/a | 0.145 | 0.000 | n/a | n/a | 2.790 | 17.613 | 0.381 | 2.790 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d0453000000000000008c | 1003.087 | 0.152 | n/a | 0.000 | 0.000 | 0.670 | 1000.956 | 0.036 | n/a | 0.145 | 0.000 | n/a | n/a | 1.128 | 0.152 | 0.000 | 1.128 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d04530000000000000087 | 492.631 | 17.613 | n/a | 0.000 | 0.000 | 0.951 | 473.741 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.222 | 17.613 | 0.036 | 0.222 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d0453000000000000008b | 234.047 | 2.548 | n/a | 0.000 | 0.000 | 0.732 | 230.565 | 0.023 | n/a | 0.101 | 0.000 | n/a | n/a | 0.077 | 2.548 | 0.011 | 0.077 | gw-r/thread-46/journal/page | none observed |
| afed4e10977d04530000000000000085 | 205.828 | 3.423 | n/a | 0.000 | 0.000 | 1.124 | 201.088 | 0.024 | n/a | 0.103 | 0.000 | n/a | n/a | 0.066 | 3.423 | 0.017 | 0.066 | gw-r/thread-45/journal/page | none observed |
| afed4e10977d04530000000000000084 | 58.103 | 2.494 | n/a | 0.000 | 0.000 | 0.786 | 51.492 | 3.175 | n/a | 0.090 | 0.000 | n/a | n/a | 0.067 | 2.494 | 0.043 | 0.067 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d04530000000000000089 | 5.626 | 2.142 | n/a | 0.000 | 0.000 | 0.694 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.790 | 2.142 | 0.381 | 2.790 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 384.158 | n/a | n/a | n/a | 3.181 | n/a | 0.000 | 0.000 | 0.876 | 379.613 | 0.016 | n/a | 0.076 | 0.000 | n/a | n/a | 0.094 | 3.181 | 0.008 | 0.094 |
| p99 | 596.378 | n/a | n/a | n/a | 4.849 | n/a | 0.000 | 0.000 | 1.024 | 593.281 | 0.125 | n/a | 0.105 | 0.000 | n/a | n/a | 23.656 | 4.849 | 0.168 | 23.656 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000091 | 596.378 | 1.941 | n/a | 0.000 | 0.000 | 0.954 | 593.281 | 0.023 | n/a | 0.105 | 0.000 | n/a | n/a | 0.074 | 1.941 | 0.003 | 0.074 | gw-r/thread-47/journal/page | none observed |
| afed4e10977d0453000000000000008e | 566.476 | 4.608 | n/a | 0.000 | 0.000 | 1.024 | 560.523 | 0.125 | n/a | 0.102 | 0.000 | n/a | n/a | 0.094 | 4.608 | 0.008 | 0.094 | gw-r/thread-67/journal/page | none observed |
| afed4e10977d0453000000000000008f | 384.158 | 3.181 | n/a | 0.000 | 0.000 | 0.876 | 379.613 | 0.016 | n/a | 0.076 | 0.000 | n/a | n/a | 0.397 | 3.181 | 0.008 | 0.397 | gw-r/thread-50/journal/page | none observed |
| afed4e10977d0453000000000000008d | 28.790 | 4.849 | n/a | 0.000 | 0.000 | 0.285 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.656 | 4.849 | 0.168 | 23.656 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / sweep / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.542 | n/a | n/a | n/a | 2.589 | n/a | 0.000 | 0.000 | 0.355 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.820 | 2.589 | 0.213 | 8.820 |
| p99 | 34.288 | n/a | n/a | n/a | 4.933 | n/a | 0.000 | 0.000 | 0.618 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.344 | 4.933 | 0.328 | 31.344 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| afed4e10977d04530000000000000092 | 34.288 | 2.589 | n/a | 0.000 | 0.000 | 0.355 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.344 | 2.589 | 0.076 | 31.344 | node-14/thread-2/socket.wait-first-byte | none observed |
| afed4e10977d04530000000000000094 | 19.355 | 4.933 | n/a | 0.000 | 0.000 | 0.350 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.072 | 4.933 | 0.255 | 14.072 | node-14/thread-2/socket.wait-first-byte | none observed |
| afed4e10977d04530000000000000095 | 13.299 | 2.831 | n/a | 0.000 | 0.000 | 0.618 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.850 | 2.831 | 0.213 | 9.850 | node-14/thread-2/socket.wait-first-byte | none observed |
| afed4e10977d04530000000000000093 | 11.542 | 2.368 | n/a | 0.000 | 0.000 | 0.354 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.820 | 2.368 | 0.205 | 8.820 | node-14/thread-2/socket.wait-first-byte | none observed |
| afed4e10977d04530000000000000096 | 10.189 | 3.339 | n/a | 0.000 | 0.000 | 0.393 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.458 | 3.339 | 0.328 | 6.458 | node-14/thread-2/socket.wait-first-byte | none observed |
| afed4e10977d04530000000000000097 | 9.703 | 2.231 | n/a | 0.000 | 0.000 | 0.408 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.063 | 2.231 | 0.230 | 7.063 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.625 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.120 | 201.229 | 0.026 | n/a | 0.170 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 211.381 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 8.538 | 202.364 | 0.070 | n/a | 0.265 | 0.000 | n/a | n/a | 0.465 | 0.000 | 0.000 | 0.465 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe000000000000000b | 211.381 | 0.000 | n/a | 0.000 | 0.000 | 8.538 | 202.364 | 0.070 | n/a | 0.170 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe0000000000000009 | 203.840 | 0.000 | n/a | 0.000 | 0.000 | 1.688 | 201.375 | 0.047 | n/a | 0.265 | 0.000 | n/a | n/a | 0.465 | 0.000 | 0.000 | 0.465 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe0000000000000008 | 203.115 | 0.000 | n/a | 0.000 | 0.000 | 1.770 | 200.952 | 0.016 | n/a | 0.137 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000010 | 203.051 | 0.000 | n/a | 0.000 | 0.000 | 1.120 | 201.513 | 0.026 | n/a | 0.262 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 4768eb16d22b25fe000000000000000e | 202.625 | 0.000 | n/a | 0.000 | 0.000 | 1.179 | 201.138 | 0.043 | n/a | 0.154 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe000000000000000f | 202.512 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 201.229 | 0.022 | n/a | 0.207 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000000c | 202.436 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.230 | 0.026 | n/a | 0.163 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe0000000000000012 | 202.255 | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 201.229 | 0.023 | n/a | 0.214 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.624 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.103 | 201.146 | 0.014 | n/a | 0.158 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 202.714 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 201.272 | 1.492 | n/a | 0.185 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe0000000000000014 | 202.714 | 0.000 | n/a | 0.000 | 0.000 | 1.116 | 201.272 | 0.014 | n/a | 0.185 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 4768eb16d22b25fe0000000000000015 | 202.706 | 0.000 | n/a | 0.000 | 0.000 | 1.103 | 201.254 | 0.011 | n/a | 0.159 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe0000000000000016 | 202.624 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 201.146 | 0.019 | n/a | 0.158 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe0000000000000017 | 97.890 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 95.211 | 1.492 | n/a | 0.059 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 170.481 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.187 | 169.226 | 0.021 | n/a | 0.084 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 |
| p99 | 203.686 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.641 | 201.636 | 10.772 | n/a | 0.223 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe0000000000000023 | 203.686 | 0.000 | n/a | 0.000 | 0.000 | 1.641 | 201.636 | 0.021 | n/a | 0.179 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe0000000000000024 | 203.133 | 0.000 | n/a | 0.000 | 0.000 | 1.187 | 201.483 | 0.017 | n/a | 0.223 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe0000000000000025 | 170.481 | 0.000 | n/a | 0.000 | 0.000 | 1.059 | 169.226 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe0000000000000022 | 112.464 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 107.235 | 4.257 | n/a | 0.084 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000021 | 99.432 | 0.000 | n/a | 0.000 | 0.000 | 1.231 | 87.139 | 10.772 | n/a | 0.073 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.389 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 201.458 | 0.028 | n/a | 0.148 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 |
| p99 | 208.891 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.706 | 207.408 | 14.616 | n/a | 0.239 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe000000000000002e | 208.891 | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 207.408 | 0.050 | n/a | 0.185 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe0000000000000026 | 206.532 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 205.365 | 0.111 | n/a | 0.146 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe0000000000000030 | 205.271 | 0.000 | n/a | 0.000 | 0.000 | 1.146 | 203.673 | 0.033 | n/a | 0.205 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe0000000000000028 | 204.010 | 0.000 | n/a | 0.000 | 0.000 | 0.967 | 202.159 | 0.411 | n/a | 0.239 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe000000000000002f | 203.403 | 0.000 | n/a | 0.000 | 0.000 | 1.362 | 201.604 | 0.018 | n/a | 0.215 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe000000000000002c | 203.389 | 0.000 | n/a | 0.000 | 0.000 | 1.706 | 201.316 | 0.028 | n/a | 0.145 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe0000000000000027 | 202.705 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 201.458 | 0.018 | n/a | 0.148 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-67/journal/page | none observed |
| 4768eb16d22b25fe000000000000002a | 202.588 | 0.000 | n/a | 0.000 | 0.000 | 1.118 | 201.119 | 0.018 | n/a | 0.167 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe000000000000002d | 87.663 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 86.439 | 0.018 | n/a | 0.087 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe0000000000000029 | 60.387 | 0.000 | n/a | 0.000 | 0.000 | 1.111 | 44.403 | 14.616 | n/a | 0.080 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-67/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.888 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.610 | 200.943 | 0.016 | n/a | 0.138 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 |
| p99 | 215.202 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 13.926 | 202.386 | 10.641 | n/a | 0.403 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe0000000000000038 | 215.202 | 0.000 | n/a | 0.000 | 0.000 | 13.926 | 200.936 | 0.028 | n/a | 0.138 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000003b | 205.616 | 0.000 | n/a | 0.000 | 0.000 | 2.869 | 202.386 | 0.012 | n/a | 0.130 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe0000000000000035 | 204.854 | 0.000 | n/a | 0.000 | 0.000 | 2.091 | 202.176 | 0.036 | n/a | 0.403 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe0000000000000032 | 203.445 | 0.000 | n/a | 0.000 | 0.000 | 1.621 | 201.380 | 0.022 | n/a | 0.183 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-67/journal/page | none observed |
| 4768eb16d22b25fe0000000000000034 | 203.072 | 0.000 | n/a | 0.000 | 0.000 | 1.046 | 201.567 | 0.037 | n/a | 0.212 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-67/journal/page | none observed |
| 4768eb16d22b25fe0000000000000039 | 202.888 | 0.000 | n/a | 0.000 | 0.000 | 1.610 | 200.943 | 0.015 | n/a | 0.151 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe0000000000000036 | 202.584 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 201.414 | 0.016 | n/a | 0.165 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000003d | 99.975 | 0.000 | n/a | 0.000 | 0.000 | 1.462 | 98.231 | 0.015 | n/a | 0.095 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe000000000000003c | 79.681 | 0.000 | n/a | 0.000 | 0.000 | 3.033 | 65.777 | 10.641 | n/a | 0.039 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe000000000000003a | 73.492 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 72.633 | 0.012 | n/a | 0.038 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.232 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 200.982 | 0.017 | n/a | 0.125 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 204.293 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.573 | 201.404 | 11.155 | n/a | 0.193 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe000000000000003e | 204.293 | 0.000 | n/a | 0.000 | 0.000 | 2.573 | 201.404 | 0.039 | n/a | 0.162 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe0000000000000044 | 203.091 | 0.000 | n/a | 0.000 | 0.000 | 1.828 | 200.982 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe000000000000003f | 202.917 | 0.000 | n/a | 0.000 | 0.000 | 1.187 | 201.386 | 0.023 | n/a | 0.193 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000041 | 202.446 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 201.289 | 0.042 | n/a | 0.159 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000040 | 202.240 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.002 | 0.017 | n/a | 0.124 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-67/journal/page | none observed |
| 4768eb16d22b25fe0000000000000046 | 202.232 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 201.099 | 0.015 | n/a | 0.178 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000045 | 202.036 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 200.838 | 0.022 | n/a | 0.175 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe0000000000000043 | 201.951 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 200.819 | 0.015 | n/a | 0.112 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe0000000000000042 | 117.735 | 0.000 | n/a | 0.000 | 0.000 | 1.191 | 116.259 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-67/journal/page | none observed |
| 4768eb16d22b25fe0000000000000047 | 111.517 | 0.000 | n/a | 0.000 | 0.000 | 1.160 | 98.922 | 11.155 | n/a | 0.099 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-49/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.961 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.896 | 201.192 | 0.030 | n/a | 0.138 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 |
| p99 | 208.031 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.457 | 203.145 | 8.761 | n/a | 0.235 | 0.000 | n/a | n/a | 0.752 | 0.000 | 0.000 | 0.752 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe000000000000004d | 208.031 | 0.000 | n/a | 0.000 | 0.000 | 4.457 | 203.145 | 0.042 | n/a | 0.153 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe000000000000004b | 205.313 | 0.000 | n/a | 0.000 | 0.000 | 1.551 | 202.544 | 0.232 | n/a | 0.235 | 0.000 | n/a | n/a | 0.752 | 0.000 | 0.000 | 0.752 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe0000000000000049 | 205.307 | 0.000 | n/a | 0.000 | 0.000 | 3.932 | 201.047 | 0.018 | n/a | 0.138 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe000000000000004a | 203.907 | 0.000 | n/a | 0.000 | 0.000 | 1.320 | 202.212 | 0.023 | n/a | 0.188 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe0000000000000048 | 203.850 | 0.000 | n/a | 0.000 | 0.000 | 2.342 | 201.192 | 0.016 | n/a | 0.145 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe000000000000004f | 202.961 | 0.000 | n/a | 0.000 | 0.000 | 1.340 | 201.297 | 0.013 | n/a | 0.127 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe0000000000000051 | 202.269 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 201.266 | 0.030 | n/a | 0.134 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe0000000000000050 | 169.550 | 0.000 | n/a | 0.000 | 0.000 | 1.896 | 164.370 | 3.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe000000000000004e | 118.884 | 0.000 | n/a | 0.000 | 0.000 | 1.984 | 107.921 | 8.761 | n/a | 0.056 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe000000000000004c | 104.928 | 0.000 | n/a | 0.000 | 0.000 | 2.025 | 97.921 | 4.197 | n/a | 0.160 | 0.000 | n/a | n/a | 0.625 | 0.000 | 0.000 | 0.625 | gw-r/thread-63/journal/page | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.243 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 200.896 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 |
| p99 | 202.656 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.235 | 201.365 | 0.059 | n/a | 0.156 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe0000000000000056 | 202.656 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 201.365 | 0.059 | n/a | 0.115 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe000000000000005d | 202.532 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 201.306 | 0.043 | n/a | 0.156 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000005b | 202.343 | 0.000 | n/a | 0.000 | 0.000 | 1.160 | 200.896 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe0000000000000053 | 202.334 | 0.000 | n/a | 0.000 | 0.000 | 1.235 | 200.833 | 0.015 | n/a | 0.099 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe0000000000000055 | 202.297 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.064 | 0.025 | n/a | 0.124 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe0000000000000054 | 202.243 | 0.000 | n/a | 0.000 | 0.000 | 0.980 | 200.994 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe0000000000000059 | 201.959 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 200.853 | 0.015 | n/a | 0.107 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000005a | 201.916 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 200.937 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe0000000000000058 | 201.693 | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 200.884 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe0000000000000057 | 109.521 | 0.000 | n/a | 0.000 | 0.000 | 1.088 | 108.140 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe000000000000005c | 64.718 | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 63.436 | 0.036 | n/a | 0.120 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-66/journal/page | none observed |

## P3 / p4h1 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.390 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 201.109 | 0.015 | n/a | 0.142 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 |
| p99 | 203.221 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 201.997 | 0.131 | n/a | 0.165 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe000000000000006d | 203.221 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 201.997 | 0.131 | n/a | 0.147 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000006f | 202.939 | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 201.538 | 0.026 | n/a | 0.164 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000006b | 202.843 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 201.514 | 0.036 | n/a | 0.153 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe0000000000000066 | 202.655 | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 200.963 | 0.013 | n/a | 0.165 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe0000000000000069 | 202.406 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 201.208 | 0.032 | n/a | 0.142 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe0000000000000068 | 202.390 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 201.109 | 0.015 | n/a | 0.106 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000006a | 202.338 | 0.000 | n/a | 0.000 | 0.000 | 1.050 | 201.047 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe0000000000000064 | 202.291 | 0.000 | n/a | 0.000 | 0.000 | 1.089 | 200.870 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000065 | 202.278 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 201.270 | 0.020 | n/a | 0.157 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe000000000000006e | 202.038 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 201.002 | 0.014 | n/a | 0.109 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe0000000000000067 | 148.979 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 147.905 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-45/journal/page | none observed |

## P3 / grow3 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.936 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 88.097 | 0.028 | n/a | 0.120 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 |
| p99 | 228.546 | n/a | n/a | n/a | 0.969 | n/a | 0.000 | 0.000 | 1.242 | 201.281 | 154.283 | n/a | 3.956 | 0.000 | n/a | n/a | 0.261 | 0.969 | 0.004 | 0.261 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe0000000000000076 | 228.546 | 0.969 | n/a | 0.000 | 0.000 | 1.120 | 71.793 | 154.283 | n/a | 0.120 | 0.000 | n/a | n/a | 0.261 | 0.969 | 0.004 | 0.261 | gw-r/thread-46/gateway.admission-wait | none observed |
| 4768eb16d22b25fe0000000000000075 | 202.863 | 0.000 | n/a | 0.000 | 0.000 | 1.242 | 201.281 | 0.012 | n/a | 0.160 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| 4768eb16d22b25fe0000000000000071 | 202.462 | 0.000 | n/a | 0.000 | 0.000 | 1.153 | 200.999 | 0.015 | n/a | 0.123 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe0000000000000074 | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 200.844 | 0.018 | n/a | 0.108 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe0000000000000073 | 91.148 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 88.097 | 2.313 | n/a | 0.032 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe0000000000000070 | 75.197 | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 69.153 | 4.682 | n/a | 0.085 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe0000000000000072 | 51.187 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 46.172 | 0.028 | n/a | 3.956 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h3 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.044 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.790 | 200.855 | 0.021 | n/a | 0.105 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |
| p99 | 210.876 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.844 | 201.419 | 2.858 | n/a | 0.199 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe0000000000000086 | 210.876 | 0.000 | n/a | 0.000 | 0.000 | 9.844 | 200.776 | 0.014 | n/a | 0.096 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe0000000000000093 | 202.570 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 201.419 | 0.056 | n/a | 0.096 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000090 | 202.416 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 201.131 | 0.015 | n/a | 0.130 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe0000000000000088 | 202.346 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.231 | 0.021 | n/a | 0.141 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe000000000000008e | 202.302 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 201.208 | 0.022 | n/a | 0.196 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-43/journal/page | none observed |
| 4768eb16d22b25fe000000000000008d | 202.044 | 0.000 | n/a | 0.000 | 0.000 | 0.574 | 201.115 | 0.022 | n/a | 0.199 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe0000000000000091 | 201.886 | 0.000 | n/a | 0.000 | 0.000 | 0.790 | 200.855 | 0.014 | n/a | 0.105 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe0000000000000085 | 186.471 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 185.708 | 0.017 | n/a | 0.065 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 4768eb16d22b25fe0000000000000084 | 185.447 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 181.997 | 2.712 | n/a | 0.030 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe000000000000008c | 165.207 | 0.000 | n/a | 0.000 | 0.000 | 1.284 | 163.615 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe0000000000000087 | 75.660 | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 71.885 | 2.858 | n/a | 0.034 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-45/journal/page | none observed |

## P3 / grow10 / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 113.820 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.061 | 109.835 | 0.020 | n/a | 0.127 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 |
| p99 | 282.532 | n/a | n/a | n/a | 2.403 | n/a | 0.000 | 0.000 | 4.161 | 201.598 | 172.814 | n/a | 0.232 | 0.000 | n/a | n/a | 0.580 | 2.403 | 0.009 | 0.580 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe0000000000000095 | 282.532 | 2.403 | n/a | 0.000 | 0.000 | 1.356 | 105.617 | 172.814 | n/a | 0.108 | 0.000 | n/a | n/a | 0.233 | 2.403 | 0.009 | 0.233 | gw-r/thread-43/gateway.admission-wait | none observed |
| 4768eb16d22b25fe0000000000000094 | 202.901 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 201.598 | 0.053 | n/a | 0.232 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000009b | 120.449 | 0.515 | n/a | 0.000 | 0.000 | 4.161 | 115.481 | 0.017 | n/a | 0.127 | 0.000 | n/a | n/a | 0.148 | 0.515 | 0.004 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 4768eb16d22b25fe000000000000009a | 113.820 | 0.000 | n/a | 0.000 | 0.000 | 1.061 | 112.010 | 0.020 | n/a | 0.148 | 0.000 | n/a | n/a | 0.580 | 0.000 | 0.000 | 0.580 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe0000000000000099 | 111.212 | 0.000 | n/a | 0.000 | 0.000 | 0.615 | 109.835 | 0.070 | n/a | 0.165 | 0.000 | n/a | n/a | 0.526 | 0.000 | 0.000 | 0.526 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe000000000000009c | 69.277 | 0.000 | n/a | 0.000 | 0.000 | 2.184 | 66.435 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.538 | 0.000 | 0.000 | 0.538 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h10 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.400 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 201.077 | 0.024 | n/a | 0.128 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 |
| p99 | 205.298 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.650 | 202.646 | 0.046 | n/a | 0.325 | 0.000 | n/a | n/a | 0.544 | 0.000 | 0.000 | 0.544 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe00000000000000b3 | 205.298 | 0.000 | n/a | 0.000 | 0.000 | 3.650 | 201.318 | 0.040 | n/a | 0.136 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe00000000000000a6 | 204.662 | 0.000 | n/a | 0.000 | 0.000 | 1.734 | 202.309 | 0.032 | n/a | 0.325 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe00000000000000a7 | 204.316 | 0.000 | n/a | 0.000 | 0.000 | 1.318 | 202.646 | 0.024 | n/a | 0.169 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe00000000000000a5 | 203.430 | 0.000 | n/a | 0.000 | 0.000 | 1.662 | 201.080 | 0.029 | n/a | 0.115 | 0.000 | n/a | n/a | 0.544 | 0.000 | 0.000 | 0.544 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe00000000000000ab | 202.989 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 201.637 | 0.046 | n/a | 0.244 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe00000000000000ac | 202.400 | 0.000 | n/a | 0.000 | 0.000 | 1.137 | 200.988 | 0.016 | n/a | 0.128 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe00000000000000b2 | 202.201 | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 201.077 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe00000000000000af | 201.944 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 200.888 | 0.013 | n/a | 0.102 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe00000000000000a9 | 201.861 | 0.000 | n/a | 0.000 | 0.000 | 0.675 | 200.915 | 0.023 | n/a | 0.108 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 4768eb16d22b25fe00000000000000b1 | 201.432 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 200.682 | 0.013 | n/a | 0.091 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 4768eb16d22b25fe00000000000000a8 | 153.504 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 152.226 | 0.024 | n/a | 0.128 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.694 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 200.892 | 0.017 | n/a | 0.104 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 203.121 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.332 | 201.425 | 3.668 | n/a | 0.247 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4768eb16d22b25fe00000000000000b6 | 203.121 | 0.000 | n/a | 0.000 | 0.000 | 1.332 | 201.425 | 0.022 | n/a | 0.104 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe00000000000000bc | 202.789 | 0.000 | n/a | 0.000 | 0.000 | 1.095 | 201.349 | 0.018 | n/a | 0.130 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe00000000000000b4 | 202.758 | 0.000 | n/a | 0.000 | 0.000 | 1.035 | 201.339 | 0.016 | n/a | 0.247 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-63/journal/page | none observed |
| 4768eb16d22b25fe00000000000000b9 | 202.242 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 201.165 | 0.021 | n/a | 0.114 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 4768eb16d22b25fe00000000000000b7 | 202.126 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 200.892 | 0.013 | n/a | 0.108 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 4768eb16d22b25fe00000000000000bb | 201.694 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 200.927 | 0.017 | n/a | 0.097 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 4768eb16d22b25fe00000000000000ba | 162.094 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 158.861 | 2.313 | n/a | 0.035 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| 4768eb16d22b25fe00000000000000bd | 148.590 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 143.732 | 3.668 | n/a | 0.110 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-66/journal/page | none observed |
| 4768eb16d22b25fe00000000000000b5 | 131.244 | 0.000 | n/a | 0.000 | 0.000 | 1.195 | 129.733 | 0.012 | n/a | 0.055 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-67/journal/page | none observed |
| 4768eb16d22b25fe00000000000000b8 | 114.601 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 113.745 | 0.017 | n/a | 0.078 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-50/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (245.560 ms, trace `217f8f683f5b76ef000000000000011b`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (159.277 ms, trace `217f8f683f5b76ef0000000000000151`); `gw-w/thread-62/peer.transact-await (includes order/network/storage)` (158.094 ms, trace `217f8f683f5b76ef0000000000000150`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (151.629 ms, trace `217f8f683f5b76ef000000000000014f`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (120.472 ms, trace `217f8f683f5b76ef000000000000014e`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-smoke-f`; source `04298a56c00b5aa953b14f65e3a34966e72210e3`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 812154.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 106 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1528.553 | 259.753 | 20.521 | 39 |
| baseline | 0 | 1972.611 | 35.437 | 1.368 | 44 |
| L1 | 1 | 1983.051 | 149.736 | 7.310 | 30 |
| L4 | 4 | 1971.837 | 283.893 | 18.592 | 44 |
| L16 | 16 | 1916.608 | 247.020 | 6.722 | 44 |
| L64 | 16 | 1841.115 | 169.345 | 7.333 | 44 |
| L256 | 16 | 1874.737 | 245.388 | 8.703 | 58 |
| L1024 | 16 | 1952.757 | 251.840 | 10.127 | 16 |
| recovery | 16 | 1937.829 | 223.704 | 4.025 | 44 |
| p4mix | 1 | 1984.261 | 39.619 | 2.495 | 43 |
| p4h1 | 1 | 1027.528 | 23.402 | 0.357 | 16 |
| grow3 | 0 | 1624.160 | 254.810 | 3.293 | 58 |
| p4h3 | 1 | 2418.654 | 65.992 | 4.316 | 100 |
| grow10 | 0 | 1658.025 | 469.426 | 3.685 | 21 |
| p4h10 | 1 | 2331.414 | 51.597 | 0.746 | 63 |
| presweep | 16 | 1479.240 | 143.198 | 2.333 | 39 |
| sweep | 16 | 202.323 | 43.737 | 9.628 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 217f8f683f5b76ef000000000000011b | driver.queue.scheduler-dispatch | 0.164 | none | 0 / 32 |
| 217f8f683f5b76ef000000000000011b | driver.queue.scheduler-late | 0.006 | none | 0 / 32 |

Observed active steps while trace 217f8f683f5b76ef000000000000011b waited: []

| 217f8f683f5b76ef0000000000000151 | driver.queue.scheduler-dispatch | 0.006 | none | 9 / 32 |
| 217f8f683f5b76ef0000000000000151 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace 217f8f683f5b76ef0000000000000151 waited: []

| 217f8f683f5b76ef0000000000000150 | driver.queue.scheduler-dispatch | 0.007 | none | 8 / 32 |
| 217f8f683f5b76ef0000000000000150 | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace 217f8f683f5b76ef0000000000000150 waited: []

| 217f8f683f5b76ef000000000000014f | driver.queue.scheduler-dispatch | 0.010 | none | 7 / 32 |
| 217f8f683f5b76ef000000000000014f | driver.queue.scheduler-late | 0.000 | none | 7 / 32 |

Observed active steps while trace 217f8f683f5b76ef000000000000014f waited: []

| 217f8f683f5b76ef000000000000014e | driver.queue.scheduler-dispatch | 0.007 | none | 6 / 32 |
| 217f8f683f5b76ef000000000000014e | driver.queue.scheduler-late | 0.000 | none | 6 / 32 |

Observed active steps while trace 217f8f683f5b76ef000000000000014e waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.354 | 0.470 | 0.000 | 0.525 | 7.745 | 0.016 | 0.000 | 0.103 | 1.945 | 5.398 | 0.105 | n/a | 0.538 | 13.383 | n/a | n/a | 0.117 | 8.090 | 0.276 | 0.117 |
| p99 | 62.897 | 8.494 | 0.632 | 10.453 | 29.990 | 1.011 | 0.000 | 1.107 | 6.852 | 13.524 | 3.048 | n/a | 0.976 | 21.142 | n/a | n/a | 0.508 | 31.090 | 0.510 | 0.508 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000094 | 62.897 | 23.523 | 0.010 | 0.000 | 1.107 | 1.945 | 13.524 | 0.163 | n/a | 0.976 | 21.142 | n/a | n/a | 0.508 | 24.640 | 0.392 | 0.508 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000097 | 60.985 | 29.990 | 1.011 | 0.000 | 0.089 | 6.852 | 8.955 | 0.105 | n/a | 0.548 | 13.383 | n/a | n/a | 0.052 | 31.090 | 0.510 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000099 | 29.354 | 7.745 | 0.016 | 0.000 | 0.328 | 1.567 | 1.992 | 0.067 | n/a | 0.394 | 17.126 | n/a | n/a | 0.117 | 8.090 | 0.276 | 0.117 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef000000000000009b | 29.096 | 5.401 | 0.376 | 0.000 | 0.103 | 3.216 | 5.398 | 3.048 | n/a | 0.538 | 10.863 | n/a | n/a | 0.154 | 5.879 | 0.202 | 0.154 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.656 | n/a | n/a | n/a | 13.025 | 1.840 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 14.304 | 0.998 | 0.018 |
| p99 | 134.868 | n/a | n/a | n/a | 43.865 | 42.664 | 1.368 | 0.000 | 7.346 | 73.097 | 0.218 | n/a | 0.274 | 0.000 | n/a | n/a | 47.675 | 72.786 | 0.999 | 47.675 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000095 | 134.868 | 43.865 | 28.920 | 0.000 | 0.000 | 7.346 | 54.177 | 0.218 | n/a | 0.274 | 0.000 | n/a | n/a | 0.067 | 72.786 | 0.540 | 0.067 | gw-w/thread-41/gateway.admitted-work | none observed |
| 217f8f683f5b76ef00000000000000dc | 111.921 | 24.246 | 13.643 | 0.000 | 0.000 | 0.894 | 73.097 | 0.009 | n/a | 0.021 | 0.000 | n/a | n/a | 0.011 | 37.888 | 0.339 | 0.011 | gw-w/thread-43/gateway.admitted-work | none observed |
| 217f8f683f5b76ef000000000000012f | 98.472 | 32.441 | 16.318 | 1.189 | 0.000 | 0.849 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.675 | 49.948 | 0.507 | 47.675 | node-14/thread-0/socket.wait-first-byte | none observed |
| 217f8f683f5b76ef00000000000000d0 | 85.562 | 13.105 | 2.002 | 0.000 | 0.000 | 1.932 | 68.450 | 0.016 | n/a | 0.036 | 0.000 | n/a | n/a | 0.021 | 15.107 | 0.177 | 0.021 | gw-w/thread-43/gateway.admitted-work | none observed |
| 217f8f683f5b76ef00000000000000ff | 58.235 | 15.507 | 42.664 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.064 | 58.171 | 0.999 | 0.064 | node-14/thread-0/rpc.replica.observe | none observed |
| 217f8f683f5b76ef00000000000000c8 | 48.182 | 12.465 | 1.840 | 0.000 | 0.000 | 0.368 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.509 | 14.304 | 0.297 | 33.509 | node-14/thread-0/socket.wait-first-byte | none observed |
| 217f8f683f5b76ef00000000000000df | 23.745 | 14.023 | 0.765 | 0.000 | 0.000 | 0.480 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.477 | 14.788 | 0.623 | 8.477 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef000000000000009a | 21.264 | 20.958 | 0.280 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 21.239 | 0.999 | 0.025 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef00000000000000bf | 18.329 | 15.393 | 2.061 | 0.861 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 18.315 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef000000000000013a | 16.188 | 13.025 | 3.148 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 16.173 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | driver.publication 1.300ms |
| 217f8f683f5b76ef0000000000000104 | 14.656 | 13.179 | 0.094 | 1.368 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 14.642 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef0000000000000141 | 13.716 | 13.536 | 0.165 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 13.701 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef0000000000000137 | 12.894 | 12.768 | 0.113 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 12.881 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef0000000000000110 | 11.874 | 11.666 | 0.103 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.105 | 11.768 | 0.991 | 0.105 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef000000000000011e | 10.428 | 0.376 | 10.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 10.411 | 0.998 | 0.018 | node-14/thread-0/rpc.replica.observe | none observed |
| 217f8f683f5b76ef00000000000000af | 9.494 | 1.550 | 7.929 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 9.479 | 0.998 | 0.015 | node-14/thread-0/rpc.replica.observe | none observed |
| 217f8f683f5b76ef0000000000000116 | 9.475 | 9.391 | 0.072 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 9.463 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef00000000000000ea | 9.315 | 9.126 | 0.169 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 9.296 | 0.998 | 0.019 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef00000000000000c4 | 8.295 | 8.140 | 0.143 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 8.283 | 0.998 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 217f8f683f5b76ef00000000000000bb | 7.937 | 5.018 | 2.902 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.919 | 0.998 | 0.018 | node-14/thread-2/replica.pull-at | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.354 | 2.194 | 0.013 | 3.053 | 7.745 | 0.016 | 0.000 | 0.328 | 1.567 | 1.992 | 0.067 | n/a | 0.394 | 17.126 | n/a | n/a | 0.117 | 8.090 | 0.276 | 0.117 |
| p99 | 29.354 | 2.194 | 0.013 | 3.053 | 7.745 | 0.016 | 0.000 | 0.328 | 1.567 | 1.992 | 0.067 | n/a | 0.394 | 17.126 | n/a | n/a | 0.117 | 8.090 | 0.276 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000099 | 29.354 | 7.745 | 0.016 | 0.000 | 0.328 | 1.567 | 1.992 | 0.067 | n/a | 0.394 | 17.126 | n/a | n/a | 0.117 | 8.090 | 0.276 | 0.117 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.844 | 0.000 | 0.000 | 0.449 | 4.147 | 0.006 | 0.000 | 0.153 | 1.530 | 2.660 | 0.060 | n/a | 0.354 | 6.715 | n/a | n/a | 0.074 | 4.455 | 0.202 | 0.074 |
| p99 | 22.109 | 0.543 | 0.000 | 2.421 | 5.114 | 0.242 | 0.000 | 0.942 | 3.288 | 5.188 | 0.063 | n/a | 1.145 | 10.736 | n/a | n/a | 0.138 | 6.014 | 0.309 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef000000000000009f | 22.109 | 4.147 | 0.230 | 0.000 | 0.078 | 1.943 | 4.503 | 0.063 | n/a | 0.354 | 10.736 | n/a | n/a | 0.055 | 4.455 | 0.202 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef000000000000009d | 20.440 | 5.066 | 0.006 | 0.000 | 0.942 | 1.530 | 1.993 | 0.054 | n/a | 0.675 | 10.100 | n/a | n/a | 0.074 | 6.014 | 0.294 | 0.074 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000a3 | 17.844 | 5.114 | 0.242 | 0.000 | 0.153 | 3.288 | 2.660 | 0.060 | n/a | 1.145 | 5.082 | n/a | n/a | 0.101 | 5.509 | 0.309 | 0.101 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000a1 | 17.438 | 3.292 | 0.006 | 0.000 | 0.207 | 1.530 | 5.188 | 0.060 | n/a | 0.304 | 6.715 | n/a | n/a | 0.138 | 3.504 | 0.201 | 0.138 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.438 | 0.515 | 0.000 | 1.427 | 3.292 | 0.006 | 0.000 | 0.207 | 1.530 | 1.993 | 0.054 | n/a | 0.304 | 6.715 | n/a | n/a | 0.074 | 3.504 | 0.201 | 0.074 |
| p99 | 20.440 | 0.543 | 0.000 | 2.421 | 5.066 | 0.006 | 0.000 | 0.942 | 1.530 | 5.188 | 0.060 | n/a | 0.675 | 10.100 | n/a | n/a | 0.138 | 6.014 | 0.294 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef000000000000009d | 20.440 | 5.066 | 0.006 | 0.000 | 0.942 | 1.530 | 1.993 | 0.054 | n/a | 0.675 | 10.100 | n/a | n/a | 0.074 | 6.014 | 0.294 | 0.074 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000a1 | 17.438 | 3.292 | 0.006 | 0.000 | 0.207 | 1.530 | 5.188 | 0.060 | n/a | 0.304 | 6.715 | n/a | n/a | 0.138 | 3.504 | 0.201 | 0.138 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.460 | 0.585 | 0.000 | 0.853 | 4.682 | 0.249 | 0.000 | 0.108 | 1.838 | 4.715 | 0.054 | n/a | 0.726 | 12.190 | n/a | n/a | 0.078 | 5.070 | 0.218 | 0.078 |
| p99 | 29.384 | 2.528 | 0.000 | 3.341 | 6.688 | 0.252 | 0.000 | 0.136 | 3.027 | 7.731 | 0.096 | n/a | 1.009 | 19.782 | n/a | n/a | 0.308 | 6.802 | 0.257 | 0.308 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000aa | 29.384 | 4.438 | 0.249 | 0.000 | 0.076 | 1.838 | 2.579 | 0.052 | n/a | 0.318 | 19.782 | n/a | n/a | 0.051 | 4.763 | 0.162 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000a5 | 26.460 | 6.688 | 0.005 | 0.000 | 0.108 | 1.382 | 4.715 | 0.054 | n/a | 1.009 | 12.190 | n/a | n/a | 0.308 | 6.802 | 0.257 | 0.308 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000a7 | 23.240 | 4.682 | 0.252 | 0.000 | 0.136 | 3.027 | 7.731 | 0.096 | n/a | 0.726 | 6.512 | n/a | n/a | 0.078 | 5.070 | 0.218 | 0.078 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 64.753 | 0.460 | 0.000 | 0.709 | 6.583 | 0.011 | 0.000 | 0.092 | 1.264 | 8.377 | 0.076 | n/a | 0.692 | 34.099 | n/a | n/a | 0.038 | 7.658 | 0.141 | 0.038 |
| p99 | 84.129 | 2.604 | 0.016 | 2.560 | 20.833 | 0.473 | 2.497 | 1.065 | 7.070 | 17.426 | 0.354 | n/a | 5.787 | 48.135 | n/a | n/a | 0.059 | 23.895 | 0.297 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000b3 | 84.129 | 20.833 | 0.473 | 2.497 | 0.092 | 7.070 | 13.900 | 0.354 | n/a | 4.756 | 34.099 | n/a | n/a | 0.055 | 23.895 | 0.284 | 0.055 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000b0 | 73.210 | 10.093 | 0.179 | 0.000 | 0.071 | 3.183 | 17.426 | 0.236 | n/a | 0.692 | 41.292 | n/a | n/a | 0.038 | 10.343 | 0.141 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000ac | 64.753 | 5.837 | 0.004 | 0.000 | 0.779 | 1.136 | 8.377 | 0.076 | n/a | 0.373 | 48.135 | n/a | n/a | 0.037 | 6.620 | 0.102 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000ae | 25.777 | 6.583 | 0.011 | 0.000 | 1.065 | 1.264 | 1.662 | 0.058 | n/a | 5.787 | 9.290 | n/a | n/a | 0.059 | 7.658 | 0.297 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.153 | 0.328 | 0.000 | 0.484 | 7.004 | 0.009 | 0.000 | 0.111 | 1.303 | 4.194 | 0.120 | n/a | 0.848 | 23.809 | n/a | n/a | 0.061 | 7.470 | 0.160 | 0.061 |
| p99 | 159.436 | 1.793 | 0.000 | 2.193 | 9.502 | 0.330 | 1.304 | 1.064 | 3.963 | 56.883 | 5.266 | n/a | 4.045 | 89.059 | n/a | n/a | 0.086 | 9.943 | 0.302 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000bc | 159.436 | 7.989 | 0.206 | 1.304 | 0.072 | 3.226 | 56.883 | 0.182 | n/a | 0.477 | 89.059 | n/a | n/a | 0.039 | 9.570 | 0.060 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000b7 | 41.505 | 5.568 | 0.007 | 0.000 | 1.064 | 0.963 | 3.207 | 5.266 | n/a | 0.848 | 24.521 | n/a | n/a | 0.061 | 6.638 | 0.160 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000ba | 41.153 | 7.004 | 0.009 | 0.000 | 0.458 | 1.303 | 4.362 | 0.078 | n/a | 4.045 | 23.809 | n/a | n/a | 0.086 | 7.470 | 0.182 | 0.086 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000b5 | 32.936 | 9.502 | 0.330 | 0.000 | 0.111 | 3.963 | 4.194 | 0.120 | n/a | 3.290 | 11.360 | n/a | n/a | 0.067 | 9.943 | 0.302 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.153 | 1.707 | 0.000 | 2.103 | 5.568 | 0.007 | 0.000 | 0.458 | 0.963 | 3.207 | 0.078 | n/a | 0.848 | 23.809 | n/a | n/a | 0.061 | 6.638 | 0.160 | 0.061 |
| p99 | 41.505 | 1.793 | 0.000 | 2.193 | 7.004 | 0.009 | 0.000 | 1.064 | 1.303 | 4.362 | 5.266 | n/a | 4.045 | 24.521 | n/a | n/a | 0.086 | 7.470 | 0.182 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000b7 | 41.505 | 5.568 | 0.007 | 0.000 | 1.064 | 0.963 | 3.207 | 5.266 | n/a | 0.848 | 24.521 | n/a | n/a | 0.061 | 6.638 | 0.160 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000ba | 41.153 | 7.004 | 0.009 | 0.000 | 0.458 | 1.303 | 4.362 | 0.078 | n/a | 4.045 | 23.809 | n/a | n/a | 0.086 | 7.470 | 0.182 | 0.086 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 63.286 | 0.222 | 0.000 | 0.366 | 5.278 | 0.005 | 0.000 | 0.061 | 1.176 | 23.842 | 0.071 | n/a | 0.543 | 27.845 | n/a | n/a | 0.035 | 6.377 | 0.101 | 0.035 |
| p99 | 125.820 | 1.475 | 0.000 | 2.476 | 9.347 | 4.965 | 0.806 | 1.013 | 5.801 | 40.941 | 0.141 | n/a | 3.184 | 63.669 | n/a | n/a | 0.042 | 14.826 | 0.189 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000c5 | 125.820 | 9.347 | 4.965 | 0.454 | 0.061 | 5.801 | 40.941 | 0.141 | n/a | 0.408 | 63.669 | n/a | n/a | 0.033 | 14.826 | 0.118 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000be | 92.582 | 5.836 | 0.005 | 0.000 | 1.013 | 0.931 | 25.775 | 0.071 | n/a | 1.882 | 57.029 | n/a | n/a | 0.039 | 6.854 | 0.074 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000c0 | 63.286 | 5.278 | 0.236 | 0.806 | 0.057 | 1.919 | 23.842 | 0.084 | n/a | 3.184 | 27.845 | n/a | n/a | 0.035 | 6.377 | 0.101 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000c3 | 21.936 | 3.571 | 0.005 | 0.000 | 0.565 | 1.176 | 2.767 | 0.048 | n/a | 0.543 | 13.219 | n/a | n/a | 0.042 | 4.141 | 0.189 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.936 | 1.359 | 0.000 | 1.657 | 3.571 | 0.005 | 0.000 | 0.565 | 1.176 | 2.767 | 0.048 | n/a | 0.543 | 13.219 | n/a | n/a | 0.042 | 4.141 | 0.189 | 0.042 |
| p99 | 21.936 | 1.359 | 0.000 | 1.657 | 3.571 | 0.005 | 0.000 | 0.565 | 1.176 | 2.767 | 0.048 | n/a | 0.543 | 13.219 | n/a | n/a | 0.042 | 4.141 | 0.189 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000c3 | 21.936 | 3.571 | 0.005 | 0.000 | 0.565 | 1.176 | 2.767 | 0.048 | n/a | 0.543 | 13.219 | n/a | n/a | 0.042 | 4.141 | 0.189 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.764 | 0.841 | 0.000 | 1.682 | 5.102 | 0.010 | 0.000 | 0.238 | 1.008 | 8.296 | 0.107 | n/a | 1.181 | 17.098 | n/a | n/a | 0.045 | 5.913 | 0.192 | 0.045 |
| p99 | 62.907 | 1.219 | 0.001 | 2.012 | 8.436 | 0.249 | 0.906 | 0.866 | 3.880 | 20.448 | 0.222 | n/a | 3.043 | 39.128 | n/a | n/a | 0.096 | 9.422 | 0.222 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000ca | 62.907 | 8.195 | 0.249 | 0.906 | 0.072 | 3.880 | 17.877 | 0.222 | n/a | 2.898 | 28.558 | n/a | n/a | 0.050 | 9.422 | 0.150 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 0.745ms |
| 217f8f683f5b76ef00000000000000cf | 54.201 | 5.102 | 0.010 | 0.000 | 0.238 | 1.008 | 8.296 | 0.054 | n/a | 0.269 | 39.128 | n/a | n/a | 0.096 | 5.350 | 0.099 | 0.096 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000d2 | 47.764 | 8.436 | 0.225 | 0.438 | 0.068 | 2.144 | 20.448 | 0.076 | n/a | 3.043 | 12.847 | n/a | n/a | 0.040 | 9.167 | 0.192 | 0.040 | gw-w/thread-45/gateway.admitted-work | none observed |
| 217f8f683f5b76ef00000000000000c7 | 26.684 | 5.041 | 0.007 | 0.000 | 0.866 | 0.869 | 2.224 | 0.107 | n/a | 0.428 | 17.098 | n/a | n/a | 0.045 | 5.913 | 0.222 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000cd | 18.950 | 3.458 | 0.010 | 0.000 | 0.739 | 0.948 | 3.177 | 0.142 | n/a | 1.181 | 9.255 | n/a | n/a | 0.039 | 4.207 | 0.222 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.684 | 0.902 | 0.000 | 1.854 | 5.041 | 0.010 | 0.000 | 0.739 | 0.948 | 3.177 | 0.107 | n/a | 0.428 | 17.098 | n/a | n/a | 0.045 | 5.350 | 0.222 | 0.045 |
| p99 | 54.201 | 1.219 | 0.001 | 2.012 | 5.102 | 0.010 | 0.000 | 0.866 | 1.008 | 8.296 | 0.142 | n/a | 1.181 | 39.128 | n/a | n/a | 0.096 | 5.913 | 0.222 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000cf | 54.201 | 5.102 | 0.010 | 0.000 | 0.238 | 1.008 | 8.296 | 0.054 | n/a | 0.269 | 39.128 | n/a | n/a | 0.096 | 5.350 | 0.099 | 0.096 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000c7 | 26.684 | 5.041 | 0.007 | 0.000 | 0.866 | 0.869 | 2.224 | 0.107 | n/a | 0.428 | 17.098 | n/a | n/a | 0.045 | 5.913 | 0.222 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000cd | 18.950 | 3.458 | 0.010 | 0.000 | 0.739 | 0.948 | 3.177 | 0.142 | n/a | 1.181 | 9.255 | n/a | n/a | 0.039 | 4.207 | 0.222 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 56.533 | 0.185 | 0.000 | 0.484 | 5.428 | 0.221 | 0.333 | 0.075 | 2.782 | 18.694 | 0.095 | n/a | 0.372 | 27.410 | n/a | n/a | 0.041 | 6.086 | 0.097 | 0.041 |
| p99 | 62.825 | 0.422 | 0.000 | 0.592 | 6.317 | 0.300 | 0.362 | 0.104 | 5.497 | 20.720 | 0.123 | n/a | 0.400 | 30.013 | n/a | n/a | 0.071 | 7.053 | 0.125 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000d7 | 62.825 | 5.428 | 0.221 | 0.362 | 0.075 | 5.497 | 20.720 | 0.095 | n/a | 0.372 | 30.013 | n/a | n/a | 0.041 | 6.086 | 0.097 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000d4 | 56.533 | 6.317 | 0.300 | 0.333 | 0.104 | 2.782 | 18.694 | 0.123 | n/a | 0.400 | 27.410 | n/a | n/a | 0.071 | 7.053 | 0.125 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.300 | 0.250 | 0.000 | 0.751 | 4.613 | 0.006 | 0.000 | 0.091 | 1.122 | 5.993 | 0.055 | n/a | 0.830 | 24.861 | n/a | n/a | 0.048 | 4.936 | 0.118 | 0.048 |
| p99 | 48.794 | 1.349 | 0.000 | 1.810 | 5.559 | 0.649 | 0.000 | 0.946 | 2.297 | 14.294 | 0.104 | n/a | 3.513 | 35.080 | n/a | n/a | 0.065 | 6.299 | 0.129 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000db | 48.794 | 4.792 | 0.006 | 0.000 | 0.946 | 1.122 | 5.993 | 0.055 | n/a | 0.735 | 35.080 | n/a | n/a | 0.065 | 5.744 | 0.118 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000d9 | 48.733 | 5.559 | 0.649 | 0.000 | 0.091 | 2.297 | 14.294 | 0.104 | n/a | 0.830 | 24.861 | n/a | n/a | 0.048 | 6.299 | 0.129 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000de | 41.300 | 3.668 | 0.005 | 0.000 | 0.578 | 0.912 | 1.541 | 0.047 | n/a | 3.513 | 30.989 | n/a | n/a | 0.047 | 4.251 | 0.103 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000e1 | 40.434 | 4.613 | 0.262 | 0.000 | 0.061 | 1.790 | 13.721 | 0.063 | n/a | 2.275 | 17.597 | n/a | n/a | 0.053 | 4.936 | 0.122 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.300 | 1.234 | 0.000 | 1.681 | 3.668 | 0.005 | 0.000 | 0.578 | 0.912 | 1.541 | 0.047 | n/a | 3.513 | 30.989 | n/a | n/a | 0.047 | 4.251 | 0.103 | 0.047 |
| p99 | 41.300 | 1.234 | 0.000 | 1.681 | 3.668 | 0.005 | 0.000 | 0.578 | 0.912 | 1.541 | 0.047 | n/a | 3.513 | 30.989 | n/a | n/a | 0.047 | 4.251 | 0.103 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000de | 41.300 | 3.668 | 0.005 | 0.000 | 0.578 | 0.912 | 1.541 | 0.047 | n/a | 3.513 | 30.989 | n/a | n/a | 0.047 | 4.251 | 0.103 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.928 | 0.213 | 0.000 | 0.527 | 5.158 | 0.234 | 0.000 | 0.168 | 2.551 | 9.240 | 0.092 | n/a | 1.246 | 11.828 | n/a | n/a | 0.064 | 5.605 | 0.216 | 0.064 |
| p99 | 40.212 | 0.824 | 0.000 | 0.597 | 6.007 | 0.286 | 0.000 | 0.443 | 5.552 | 14.722 | 0.120 | n/a | 1.811 | 14.564 | n/a | n/a | 0.098 | 6.408 | 0.220 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000e4 | 40.212 | 6.007 | 0.234 | 0.000 | 0.168 | 2.551 | 14.722 | 0.092 | n/a | 1.811 | 14.564 | n/a | n/a | 0.064 | 6.408 | 0.159 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000e3 | 25.928 | 5.158 | 0.004 | 0.000 | 0.443 | 5.552 | 9.240 | 0.082 | n/a | 0.908 | 4.442 | n/a | n/a | 0.098 | 5.605 | 0.216 | 0.098 | node-14/thread-0/socket.wait-first-byte | none observed |
| 217f8f683f5b76ef00000000000000e6 | 23.268 | 4.757 | 0.286 | 0.000 | 0.082 | 1.956 | 2.929 | 0.120 | n/a | 1.246 | 11.828 | n/a | n/a | 0.063 | 5.124 | 0.220 | 0.063 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.928 | 0.213 | 0.000 | 0.231 | 5.158 | 0.004 | 0.000 | 0.443 | 5.552 | 9.240 | 0.082 | n/a | 0.908 | 4.442 | n/a | n/a | 0.098 | 5.605 | 0.216 | 0.098 |
| p99 | 25.928 | 0.213 | 0.000 | 0.231 | 5.158 | 0.004 | 0.000 | 0.443 | 5.552 | 9.240 | 0.082 | n/a | 0.908 | 4.442 | n/a | n/a | 0.098 | 5.605 | 0.216 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000e3 | 25.928 | 5.158 | 0.004 | 0.000 | 0.443 | 5.552 | 9.240 | 0.082 | n/a | 0.908 | 4.442 | n/a | n/a | 0.098 | 5.605 | 0.216 | 0.098 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / outside-phases / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.479 | 0.237 | 0.000 | 0.622 | 4.490 | 0.009 | 0.000 | 0.130 | 1.697 | 3.532 | 0.055 | n/a | 0.350 | 14.091 | n/a | n/a | 0.050 | 4.882 | 0.188 | 0.050 |
| p99 | 90.377 | 2.470 | 0.037 | 2.993 | 6.871 | 0.320 | 0.273 | 0.879 | 4.411 | 14.918 | 0.113 | n/a | 3.507 | 65.305 | n/a | n/a | 0.087 | 7.390 | 0.297 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000eb | 90.377 | 6.871 | 0.198 | 0.251 | 0.070 | 2.271 | 14.918 | 0.113 | n/a | 0.339 | 65.305 | n/a | n/a | 0.041 | 7.390 | 0.082 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000e9 | 35.212 | 6.135 | 0.009 | 0.000 | 0.489 | 1.697 | 5.917 | 0.084 | n/a | 0.350 | 20.474 | n/a | n/a | 0.059 | 6.633 | 0.188 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000103 | 33.438 | 5.498 | 0.005 | 0.000 | 0.879 | 0.999 | 2.793 | 0.053 | n/a | 3.507 | 19.660 | n/a | n/a | 0.043 | 6.383 | 0.191 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000109 | 26.877 | 3.758 | 0.005 | 0.000 | 0.240 | 0.868 | 1.482 | 0.098 | n/a | 1.747 | 18.626 | n/a | n/a | 0.053 | 4.003 | 0.149 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef000000000000010d | 25.458 | 4.070 | 0.006 | 0.000 | 0.523 | 1.941 | 3.845 | 0.061 | n/a | 0.884 | 14.091 | n/a | n/a | 0.038 | 4.599 | 0.181 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000107 | 23.479 | 3.092 | 0.006 | 0.000 | 0.850 | 0.828 | 1.438 | 0.102 | n/a | 1.035 | 16.085 | n/a | n/a | 0.043 | 3.948 | 0.168 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000134 | 23.029 | 6.165 | 0.280 | 0.273 | 0.130 | 1.822 | 3.688 | 0.055 | n/a | 0.257 | 10.271 | n/a | n/a | 0.087 | 6.848 | 0.297 | 0.087 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef000000000000010b | 22.791 | 5.845 | 0.258 | 0.240 | 0.075 | 1.791 | 1.842 | 0.050 | n/a | 0.309 | 12.332 | n/a | n/a | 0.050 | 6.418 | 0.282 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000105 | 21.534 | 4.490 | 0.320 | 0.000 | 0.073 | 4.411 | 7.082 | 0.048 | n/a | 0.246 | 4.809 | n/a | n/a | 0.057 | 4.882 | 0.227 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000132 | 16.693 | 3.853 | 0.247 | 0.267 | 0.083 | 1.423 | 3.532 | 0.042 | n/a | 0.989 | 6.203 | n/a | n/a | 0.054 | 4.449 | 0.267 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.628 | 0.590 | 0.000 | 0.775 | 5.748 | 0.471 | 0.000 | 0.092 | 1.503 | 1.983 | 0.067 | n/a | 0.432 | 16.588 | n/a | n/a | 0.061 | 6.994 | 0.056 | 0.061 |
| p99 | 169.446 | 0.996 | 0.000 | 1.146 | 8.868 | 0.511 | 0.643 | 0.158 | 4.676 | 72.697 | 0.785 | n/a | 5.828 | 75.825 | n/a | n/a | 0.137 | 9.497 | 0.253 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000ed | 169.446 | 8.868 | 0.471 | 0.000 | 0.158 | 4.676 | 72.697 | 0.785 | n/a | 5.828 | 75.825 | n/a | n/a | 0.137 | 9.497 | 0.056 | 0.137 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000ef | 27.628 | 5.748 | 0.511 | 0.643 | 0.092 | 1.503 | 1.983 | 0.067 | n/a | 0.432 | 16.588 | n/a | n/a | 0.061 | 6.994 | 0.253 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.540 | 2.086 | 0.000 | 1.566 | 5.491 | 0.007 | 0.000 | 0.607 | 7.773 | 1.884 | 0.049 | n/a | 0.305 | 23.810 | n/a | n/a | 0.059 | 7.502 | 0.107 | 0.059 |
| p99 | 99.706 | 2.678 | 0.011 | 4.236 | 7.565 | 0.299 | 0.334 | 3.145 | 20.544 | 30.951 | 25.731 | n/a | 1.170 | 41.604 | n/a | n/a | 0.064 | 8.640 | 0.313 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000f4 | 99.706 | 6.731 | 0.299 | 0.334 | 0.138 | 20.544 | 3.094 | 25.731 | n/a | 1.170 | 41.604 | n/a | n/a | 0.061 | 7.502 | 0.075 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000fa | 62.346 | 4.590 | 0.225 | 0.305 | 0.038 | 7.773 | 30.951 | 0.169 | n/a | 0.289 | 17.974 | n/a | n/a | 0.032 | 5.158 | 0.083 | 0.032 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| 217f8f683f5b76ef00000000000000f5 | 41.540 | 3.782 | 0.007 | 0.000 | 0.649 | 8.558 | 1.042 | 0.039 | n/a | 0.309 | 27.090 | n/a | n/a | 0.064 | 4.438 | 0.107 | 0.064 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000f2 | 34.910 | 7.565 | 0.007 | 0.000 | 0.607 | 0.810 | 1.741 | 0.049 | n/a | 0.261 | 23.810 | n/a | n/a | 0.059 | 8.179 | 0.234 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef00000000000000fe | 27.600 | 5.491 | 0.005 | 0.000 | 3.145 | 0.746 | 1.884 | 0.041 | n/a | 0.305 | 15.929 | n/a | n/a | 0.053 | 8.640 | 0.313 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | client.encode 2.665ms |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.540 | 2.086 | 0.004 | 1.566 | 3.782 | 0.007 | 0.000 | 0.649 | 8.558 | 1.042 | 0.039 | n/a | 0.309 | 27.090 | n/a | n/a | 0.064 | 4.438 | 0.107 | 0.064 |
| p99 | 41.540 | 2.086 | 0.004 | 1.566 | 3.782 | 0.007 | 0.000 | 0.649 | 8.558 | 1.042 | 0.039 | n/a | 0.309 | 27.090 | n/a | n/a | 0.064 | 4.438 | 0.107 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef00000000000000f5 | 41.540 | 3.782 | 0.007 | 0.000 | 0.649 | 8.558 | 1.042 | 0.039 | n/a | 0.309 | 27.090 | n/a | n/a | 0.064 | 4.438 | 0.107 | 0.064 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.479 | 0.558 | 0.000 | 1.614 | 3.092 | 0.006 | 0.000 | 0.850 | 0.828 | 1.438 | 0.102 | n/a | 1.035 | 16.085 | n/a | n/a | 0.043 | 3.948 | 0.168 | 0.043 |
| p99 | 23.479 | 0.558 | 0.000 | 1.614 | 3.092 | 0.006 | 0.000 | 0.850 | 0.828 | 1.438 | 0.102 | n/a | 1.035 | 16.085 | n/a | n/a | 0.043 | 3.948 | 0.168 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000107 | 23.479 | 3.092 | 0.006 | 0.000 | 0.850 | 0.828 | 1.438 | 0.102 | n/a | 1.035 | 16.085 | n/a | n/a | 0.043 | 3.948 | 0.168 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.483 | 0.678 | 0.000 | 1.844 | 3.860 | 0.006 | 0.000 | 0.671 | 0.967 | 4.924 | 0.061 | n/a | 0.416 | 13.865 | n/a | n/a | 0.039 | 5.486 | 0.148 | 0.039 |
| p99 | 277.832 | 2.077 | 0.026 | 3.017 | 7.501 | 0.254 | 0.000 | 2.256 | 5.389 | 15.898 | 0.204 | n/a | 3.386 | 245.560 | n/a | n/a | 0.075 | 7.926 | 0.352 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef000000000000011b | 277.832 | 7.501 | 0.254 | 0.000 | 0.170 | 5.389 | 15.898 | 0.204 | n/a | 2.780 | 245.560 | n/a | n/a | 0.075 | 7.926 | 0.029 | 0.075 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef000000000000010f | 54.584 | 4.662 | 0.020 | 0.000 | 0.804 | 0.845 | 6.006 | 0.042 | n/a | 0.240 | 41.893 | n/a | n/a | 0.072 | 5.486 | 0.101 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000119 | 39.172 | 5.104 | 0.006 | 0.000 | 0.671 | 0.967 | 6.486 | 0.110 | n/a | 3.386 | 22.402 | n/a | n/a | 0.039 | 5.781 | 0.148 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000113 | 28.574 | 3.573 | 0.005 | 0.000 | 2.256 | 1.142 | 1.753 | 0.104 | n/a | 0.416 | 19.296 | n/a | n/a | 0.029 | 5.834 | 0.204 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.388ms |
| 217f8f683f5b76ef0000000000000117 | 28.483 | 3.860 | 0.188 | 0.000 | 0.065 | 1.487 | 8.325 | 0.061 | n/a | 0.594 | 13.865 | n/a | n/a | 0.039 | 4.113 | 0.144 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000115 | 23.141 | 2.625 | 0.005 | 0.000 | 0.935 | 0.773 | 4.924 | 0.053 | n/a | 0.237 | 13.552 | n/a | n/a | 0.037 | 3.566 | 0.154 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef000000000000011d | 22.363 | 6.777 | 0.006 | 0.000 | 1.097 | 1.288 | 1.745 | 0.100 | n/a | 0.812 | 10.479 | n/a | n/a | 0.060 | 7.880 | 0.352 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000111 | 19.541 | 3.632 | 0.005 | 0.000 | 0.343 | 0.939 | 4.471 | 0.057 | n/a | 0.285 | 9.762 | n/a | n/a | 0.045 | 3.980 | 0.204 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.541 | 0.529 | 0.000 | 1.434 | 2.625 | 0.005 | 0.000 | 0.343 | 0.773 | 4.471 | 0.053 | n/a | 0.237 | 9.762 | n/a | n/a | 0.037 | 3.566 | 0.154 | 0.037 |
| p99 | 23.141 | 0.678 | 0.026 | 1.943 | 3.632 | 0.005 | 0.000 | 0.935 | 0.939 | 4.924 | 0.057 | n/a | 0.285 | 13.552 | n/a | n/a | 0.045 | 3.980 | 0.204 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000115 | 23.141 | 2.625 | 0.005 | 0.000 | 0.935 | 0.773 | 4.924 | 0.053 | n/a | 0.237 | 13.552 | n/a | n/a | 0.037 | 3.566 | 0.154 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000111 | 19.541 | 3.632 | 0.005 | 0.000 | 0.343 | 0.939 | 4.471 | 0.057 | n/a | 0.285 | 9.762 | n/a | n/a | 0.045 | 3.980 | 0.204 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.902 | 0.546 | 0.007 | 1.045 | 5.179 | 0.291 | 0.254 | 0.104 | 1.912 | 6.228 | 0.049 | n/a | 0.660 | 15.664 | n/a | n/a | 0.058 | 5.945 | 0.139 | 0.058 |
| p99 | 47.016 | 0.942 | 0.020 | 2.815 | 6.177 | 6.823 | 1.236 | 0.981 | 19.910 | 10.794 | 0.109 | n/a | 1.954 | 27.156 | n/a | n/a | 0.094 | 14.285 | 0.457 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000120 | 47.016 | 5.179 | 0.291 | 0.254 | 0.104 | 1.118 | 10.794 | 0.109 | n/a | 1.954 | 27.156 | n/a | n/a | 0.058 | 5.827 | 0.124 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef000000000000012e | 42.902 | 4.958 | 0.006 | 0.000 | 0.981 | 19.910 | 0.987 | 0.046 | n/a | 0.255 | 15.664 | n/a | n/a | 0.094 | 5.945 | 0.139 | 0.094 | node-14/thread-0/socket.wait-first-byte | none observed |
| 217f8f683f5b76ef0000000000000126 | 31.279 | 6.177 | 6.823 | 1.236 | 0.048 | 1.912 | 6.228 | 0.049 | n/a | 0.660 | 8.093 | n/a | n/a | 0.052 | 14.285 | 0.457 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | client.encode 2.480ms |

## P2 / grow10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.902 | 0.942 | 0.007 | 2.815 | 4.958 | 0.006 | 0.000 | 0.981 | 19.910 | 0.987 | 0.046 | n/a | 0.255 | 15.664 | n/a | n/a | 0.094 | 5.945 | 0.139 | 0.094 |
| p99 | 42.902 | 0.942 | 0.007 | 2.815 | 4.958 | 0.006 | 0.000 | 0.981 | 19.910 | 0.987 | 0.046 | n/a | 0.255 | 15.664 | n/a | n/a | 0.094 | 5.945 | 0.139 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef000000000000012e | 42.902 | 4.958 | 0.006 | 0.000 | 0.981 | 19.910 | 0.987 | 0.046 | n/a | 0.255 | 15.664 | n/a | n/a | 0.094 | 5.945 | 0.139 | 0.094 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.349 | 0.915 | 0.000 | 1.812 | 3.803 | 0.006 | 0.000 | 0.294 | 1.015 | 1.674 | 0.042 | n/a | 0.478 | 13.823 | n/a | n/a | 0.050 | 4.719 | 0.168 | 0.050 |
| p99 | 118.592 | 1.571 | 0.000 | 2.833 | 8.361 | 0.198 | 0.327 | 99.512 | 1.825 | 7.778 | 0.563 | n/a | 4.321 | 106.061 | n/a | n/a | 0.074 | 103.174 | 0.895 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000138 | 118.592 | 8.361 | 0.013 | 0.000 | 1.096 | 1.015 | 1.674 | 0.040 | n/a | 0.261 | 106.061 | n/a | n/a | 0.071 | 9.470 | 0.080 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000139 | 115.327 | 3.657 | 0.005 | 0.000 | 99.512 | 1.825 | 1.052 | 0.040 | n/a | 4.321 | 4.840 | n/a | n/a | 0.074 | 103.174 | 0.895 | 0.074 | node-14/thread-0/driver.queue.subject | driver.publication 1.323ms |
| 217f8f683f5b76ef0000000000000136 | 62.221 | 3.616 | 0.005 | 0.000 | 0.877 | 0.846 | 7.778 | 0.043 | n/a | 0.478 | 48.528 | n/a | n/a | 0.051 | 4.498 | 0.072 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef000000000000013e | 28.349 | 4.241 | 0.198 | 0.234 | 0.081 | 1.593 | 5.209 | 0.102 | n/a | 2.819 | 13.823 | n/a | n/a | 0.050 | 4.753 | 0.168 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000140 | 26.827 | 4.420 | 0.006 | 0.000 | 0.294 | 0.906 | 1.574 | 0.042 | n/a | 0.627 | 18.911 | n/a | n/a | 0.047 | 4.719 | 0.176 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef000000000000013c | 23.354 | 3.803 | 0.177 | 0.327 | 0.068 | 1.600 | 5.823 | 0.563 | n/a | 0.239 | 10.707 | n/a | n/a | 0.049 | 4.375 | 0.187 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.827 | 1.464 | 0.000 | 1.942 | 3.657 | 0.005 | 0.000 | 0.294 | 0.906 | 1.052 | 0.040 | n/a | 0.627 | 4.840 | n/a | n/a | 0.047 | 4.719 | 0.176 | 0.047 |
| p99 | 115.327 | 1.571 | 0.000 | 2.297 | 4.420 | 0.006 | 0.000 | 99.512 | 1.825 | 1.574 | 0.042 | n/a | 4.321 | 18.911 | n/a | n/a | 0.074 | 103.174 | 0.895 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000139 | 115.327 | 3.657 | 0.005 | 0.000 | 99.512 | 1.825 | 1.052 | 0.040 | n/a | 4.321 | 4.840 | n/a | n/a | 0.074 | 103.174 | 0.895 | 0.074 | node-14/thread-0/driver.queue.subject | driver.publication 1.323ms |
| 217f8f683f5b76ef0000000000000140 | 26.827 | 4.420 | 0.006 | 0.000 | 0.294 | 0.906 | 1.574 | 0.042 | n/a | 0.627 | 18.911 | n/a | n/a | 0.047 | 4.719 | 0.176 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.530 | 0.269 | 0.000 | 0.346 | 9.450 | 0.155 | 0.000 | 0.115 | 2.000 | 3.454 | 0.042 | n/a | 0.409 | 12.111 | n/a | n/a | 0.053 | 9.668 | 0.313 | 0.053 |
| p99 | 41.603 | 0.377 | 0.000 | 1.714 | 15.096 | 0.200 | 0.316 | 1.105 | 3.840 | 10.741 | 0.074 | n/a | 0.896 | 14.204 | n/a | n/a | 0.097 | 15.728 | 0.378 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000142 | 41.603 | 15.096 | 0.200 | 0.316 | 0.115 | 2.000 | 10.741 | 0.074 | n/a | 0.896 | 12.111 | n/a | n/a | 0.053 | 15.728 | 0.378 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000146 | 31.530 | 9.450 | 0.155 | 0.000 | 0.064 | 3.840 | 3.454 | 0.042 | n/a | 0.281 | 14.204 | n/a | n/a | 0.041 | 9.668 | 0.307 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 217f8f683f5b76ef0000000000000144 | 14.025 | 3.279 | 0.006 | 0.000 | 1.105 | 0.833 | 1.389 | 0.041 | n/a | 0.409 | 6.866 | n/a | n/a | 0.097 | 4.390 | 0.313 | 0.097 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.025 | 0.269 | 0.000 | 1.714 | 3.279 | 0.006 | 0.000 | 1.105 | 0.833 | 1.389 | 0.041 | n/a | 0.409 | 6.866 | n/a | n/a | 0.097 | 4.390 | 0.313 | 0.097 |
| p99 | 14.025 | 0.269 | 0.000 | 1.714 | 3.279 | 0.006 | 0.000 | 1.105 | 0.833 | 1.389 | 0.041 | n/a | 0.409 | 6.866 | n/a | n/a | 0.097 | 4.390 | 0.313 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000144 | 14.025 | 3.279 | 0.006 | 0.000 | 1.105 | 0.833 | 1.389 | 0.041 | n/a | 0.409 | 6.866 | n/a | n/a | 0.097 | 4.390 | 0.313 | 0.097 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 115.069 | 0.737 | 0.002 | 2.063 | 7.173 | 11.188 | 0.000 | 0.008 | 6.717 | 1.406 | 7.510 | n/a | 0.390 | 80.873 | n/a | n/a | 0.028 | 18.466 | 0.125 | 0.028 |
| p99 | 201.500 | 1.571 | 0.174 | 23.082 | 28.875 | 12.321 | 0.000 | 0.044 | 10.594 | 7.973 | 14.550 | n/a | 6.471 | 159.277 | n/a | n/a | 0.054 | 40.029 | 0.219 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 217f8f683f5b76ef0000000000000151 | 201.500 | 7.759 | 12.321 | 0.000 | 0.006 | 5.979 | 0.729 | 14.550 | n/a | 0.825 | 159.277 | n/a | n/a | 0.054 | 20.086 | 0.100 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 22.767ms; driver.publication 4.063ms; driver.publication 2.168ms; driver.publication 1.979ms; driver.publication 1.660ms |
| 217f8f683f5b76ef0000000000000150 | 199.282 | 7.899 | 11.706 | 0.000 | 0.007 | 8.102 | 0.724 | 12.639 | n/a | 0.086 | 158.094 | n/a | n/a | 0.025 | 19.612 | 0.098 | 0.025 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 22.767ms; driver.publication 4.063ms; driver.publication 2.168ms; driver.publication 1.979ms; driver.publication 1.660ms |
| 217f8f683f5b76ef000000000000014f | 193.594 | 8.204 | 11.330 | 0.000 | 0.010 | 8.405 | 4.589 | 9.051 | n/a | 0.337 | 151.629 | n/a | n/a | 0.041 | 19.543 | 0.101 | 0.041 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 22.767ms; driver.publication 4.063ms; driver.publication 2.168ms; driver.publication 1.979ms; driver.publication 1.660ms |
| 217f8f683f5b76ef000000000000014e | 182.847 | 28.875 | 11.146 | 0.000 | 0.008 | 8.370 | 0.796 | 11.201 | n/a | 1.956 | 120.472 | n/a | n/a | 0.024 | 40.029 | 0.219 | 0.024 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 4.063ms; driver.publication 2.168ms; driver.publication 1.979ms; driver.publication 1.660ms; driver.publication 1.561ms |
| 217f8f683f5b76ef000000000000014d | 130.089 | 7.173 | 11.288 | 0.000 | 0.005 | 10.594 | 7.973 | 0.192 | n/a | 2.077 | 90.766 | n/a | n/a | 0.021 | 18.466 | 0.142 | 0.021 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 4.063ms; driver.publication 2.168ms; driver.publication 1.979ms; driver.publication 1.561ms |
| 217f8f683f5b76ef000000000000014c | 115.069 | 8.924 | 11.292 | 0.000 | 0.006 | 6.932 | 4.916 | 1.974 | n/a | 0.123 | 80.873 | n/a | n/a | 0.028 | 20.222 | 0.176 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.168ms; driver.publication 1.979ms; driver.publication 1.561ms |
| 217f8f683f5b76ef000000000000014b | 98.392 | 5.995 | 11.188 | 0.000 | 0.008 | 5.718 | 0.926 | 7.510 | n/a | 0.178 | 66.833 | n/a | n/a | 0.037 | 17.190 | 0.175 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.168ms; driver.publication 1.979ms |
| 217f8f683f5b76ef000000000000014a | 84.489 | 6.257 | 9.333 | 0.000 | 0.012 | 4.760 | 5.201 | 9.009 | n/a | 0.426 | 49.459 | n/a | n/a | 0.032 | 15.602 | 0.185 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.979ms |
| 217f8f683f5b76ef0000000000000149 | 66.135 | 3.937 | 4.352 | 0.000 | 0.011 | 6.487 | 2.265 | 0.051 | n/a | 6.471 | 42.542 | n/a | n/a | 0.020 | 8.299 | 0.125 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.979ms |
| 217f8f683f5b76ef0000000000000148 | 64.565 | 4.538 | 0.016 | 0.000 | 0.044 | 6.717 | 1.406 | 0.059 | n/a | 0.390 | 51.361 | n/a | n/a | 0.034 | 4.597 | 0.071 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (192 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.033 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 304.081 | n/a | n/a | n/a | 82.608 | n/a | 14.848 | 303.863 | 99.012 | 63.029 | 2.014 | n/a | 0.092 | 0.000 | n/a | n/a | 150.170 | 304.058 | 1.000 | 150.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 04ccbea29634a0ee00000000000002b9 | 304.404 | 0.536 | n/a | 0.000 | 303.863 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 304.399 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee00000000000002ba | 304.081 | 0.165 | n/a | 0.000 | 303.893 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 304.058 | 1.000 | 0.023 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee00000000000002bb | 303.889 | 0.049 | n/a | 0.000 | 303.828 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 303.877 | 1.000 | 0.011 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee00000000000002c4 | 303.229 | 0.078 | n/a | 0.000 | 303.143 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 303.221 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000000182 | 293.958 | 0.450 | n/a | 0.000 | 293.501 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 293.952 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000000019e | 292.665 | 0.079 | n/a | 0.000 | 292.582 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.661 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f58370400000000000001c2 | 291.610 | 0.046 | n/a | 0.000 | 291.561 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 291.607 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f58370400000000000001c1 | 291.599 | 0.053 | n/a | 0.000 | 291.544 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.597 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f58370400000000000001ce | 290.519 | 0.076 | n/a | 0.000 | 290.439 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 290.515 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000001af | 286.532 | 0.380 | n/a | 0.000 | 286.146 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 286.526 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000001c4 | 286.082 | 0.034 | n/a | 0.000 | 286.044 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.079 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000001c3 | 286.034 | 0.037 | n/a | 0.000 | 285.995 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.032 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000001c2 | 285.993 | 0.040 | n/a | 0.000 | 285.950 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 285.990 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000001c1 | 285.985 | 0.074 | n/a | 0.000 | 285.908 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 285.982 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000007e5e | 279.006 | 0.034 | n/a | 0.000 | 278.970 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.004 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000007e5d | 278.973 | 0.033 | n/a | 0.000 | 278.938 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.971 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000007e5c | 278.953 | 0.044 | n/a | 0.000 | 278.906 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.950 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000007e5b | 278.917 | 0.211 | n/a | 0.000 | 278.703 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.914 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee00000000000087ed | 278.904 | 0.030 | n/a | 0.000 | 278.874 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.903 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee00000000000087f7 | 278.903 | 0.050 | n/a | 0.000 | 278.852 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.902 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 313.827 | n/a | n/a | n/a | 1.611 | n/a | 0.000 | 313.575 | 0.322 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.909 | 313.824 | 1.000 | 4.909 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d128f7839f583704000000000001c22d | 313.827 | 0.249 | n/a | 0.000 | 313.575 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 313.824 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| d128f7839f583704000000000000a5e7 | 230.383 | 0.120 | n/a | 0.000 | 230.259 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 230.379 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| d128f7839f583704000000000000a615 | 6.842 | 1.611 | n/a | 0.000 | 0.000 | 0.322 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.909 | 1.611 | 0.236 | 4.909 | node-14/thread-3/socket.wait-first-byte | none observed |
| d128f7839f5837040000000000011904 | 0.731 | 0.730 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.730 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f5837040000000000013cb9 | 0.492 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.492 | 0.000 | 0.000 | 0.492 | uncovered | none observed |
| d128f7839f5837040000000000010299 | 0.467 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.467 | 0.000 | 0.000 | 0.467 | uncovered | none observed |
| d128f7839f5837040000000000011b9e | 0.435 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 | uncovered | none observed |
| d128f7839f5837040000000000011a18 | 0.430 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.430 | 0.000 | 0.000 | 0.430 | uncovered | none observed |
| d128f7839f583704000000000000b425 | 0.412 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.412 | 0.000 | 0.000 | 0.412 | uncovered | none observed |
| d128f7839f583704000000000000dcc8 | 0.411 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.411 | 0.000 | 0.000 | 0.411 | uncovered | none observed |
| d128f7839f583704000000000000d414 | 0.390 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.390 | 0.000 | 0.000 | 0.390 | uncovered | none observed |
| d128f7839f583704000000000000fbab | 0.375 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 | uncovered | none observed |
| d128f7839f5837040000000000011b9f | 0.373 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.373 | 0.000 | 0.000 | 0.373 | uncovered | none observed |
| d128f7839f5837040000000000015b55 | 0.369 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.369 | 0.000 | 0.000 | 0.369 | uncovered | none observed |
| d128f7839f583704000000000000dcc5 | 0.366 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.366 | 0.000 | 0.000 | 0.366 | uncovered | none observed |
| d128f7839f5837040000000000011b6f | 0.337 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | uncovered | none observed |
| d128f7839f5837040000000000011f03 | 0.337 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | uncovered | none observed |
| d128f7839f583704000000000000d475 | 0.336 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | uncovered | none observed |
| d128f7839f583704000000000000b882 | 0.335 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | uncovered | none observed |
| d128f7839f583704000000000000dccc | 0.335 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | uncovered | none observed |

## P1 / L4 / read (195 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.021 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 274.938 | n/a | n/a | n/a | 19.381 | n/a | 3.207 | 274.758 | 0.488 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.101 | 274.936 | 1.000 | 3.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5cad4d044ac8e6000000000000b18e | 275.291 | 0.159 | n/a | 0.000 | 275.128 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 275.287 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000000b825 | 274.938 | 0.178 | n/a | 0.000 | 274.758 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.936 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000001cf24 | 272.246 | 0.194 | n/a | 0.000 | 272.048 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 272.242 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000001cf25 | 272.243 | 0.033 | n/a | 0.000 | 272.208 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.241 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000001c230 | 161.011 | 0.078 | n/a | 0.000 | 160.929 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 161.007 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 3e5cad4d044ac8e6000000000000a625 | 160.113 | 0.323 | n/a | 0.000 | 159.777 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 160.101 | 1.000 | 0.012 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 04ccbea29634a0ee000000000000aa78 | 159.103 | 0.347 | n/a | 0.000 | 158.753 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 159.100 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.059ms |
| d128f7839f583704000000000001c278 | 32.357 | 20.234 | n/a | 3.207 | 0.000 | 0.763 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.154 | 23.440 | 0.724 | 8.154 | node-14/thread-3/reader.execute | none observed |
| 3e5cad4d044ac8e6000000000000a62e | 27.405 | 19.381 | n/a | 4.435 | 0.000 | 0.488 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.101 | 23.816 | 0.869 | 3.101 | node-14/thread-5/reader.execute | none observed |
| d128f7839f5837040000000000026bf3 | 6.195 | 6.166 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 6.166 | 0.995 | 0.029 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f5837040000000000026bf2 | 6.185 | 6.182 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.182 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 04ccbea29634a0ee000000000000aab2 | 5.453 | 3.552 | n/a | 0.000 | 0.000 | 0.485 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.417 | 3.552 | 0.651 | 1.417 | node-14/thread-4/reader.execute | none observed |
| 3e5cad4d044ac8e60000000000014836 | 4.043 | 3.930 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.112 | 3.930 | 0.972 | 0.112 | node-14/thread-5/replica.pull-at | none observed |
| d128f7839f583704000000000002885f | 4.041 | 2.658 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.383 | 2.658 | 0.658 | 1.383 | node-14/thread-3/reader.execute | none observed |
| d128f7839f583704000000000001e3df | 3.797 | 3.795 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.795 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 04ccbea29634a0ee000000000000e1ab | 3.729 | 3.728 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.728 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 3e5cad4d044ac8e6000000000000b206 | 3.276 | 3.270 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 3.270 | 0.998 | 0.007 | node-14/thread-5/replica.pull-at | none observed |
| d128f7839f583704000000000001d0ca | 3.216 | 3.214 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.214 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f5837040000000000028127 | 3.108 | 3.102 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 3.102 | 0.998 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 3e5cad4d044ac8e6000000000000a626 | 3.068 | 3.063 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.063 | 0.998 | 0.005 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.022ms |

## P1 / L16 / read (222 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.040 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 290.235 | n/a | n/a | n/a | 6.655 | n/a | 0.000 | 290.203 | 0.626 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.808 | 290.234 | 1.000 | 4.808 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5cad4d044ac8e6000000000001bb15 | 290.580 | 0.267 | n/a | 0.000 | 290.310 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 290.577 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 3e5cad4d044ac8e6000000000001bb16 | 290.544 | 0.044 | n/a | 0.000 | 290.498 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.542 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 3e5cad4d044ac8e6000000000001bb28 | 290.235 | 0.096 | n/a | 0.000 | 290.138 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.234 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 3e5cad4d044ac8e6000000000001bb2a | 290.221 | 0.017 | n/a | 0.000 | 290.203 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.220 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 3e5cad4d044ac8e6000000000001bb29 | 290.208 | 0.031 | n/a | 0.000 | 290.177 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.208 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| d128f7839f583704000000000003062d | 289.376 | 0.065 | n/a | 0.000 | 289.309 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.374 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 04ccbea29634a0ee000000000001b7a6 | 289.113 | 0.431 | n/a | 0.000 | 288.678 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 289.109 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| d128f7839f583704000000000003062c | 288.920 | 0.215 | n/a | 0.000 | 288.699 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 288.914 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 04ccbea29634a0ee000000000001b7a7 | 288.877 | 0.060 | n/a | 0.000 | 288.813 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 288.873 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 04ccbea29634a0ee000000000001b7a8 | 288.842 | 0.036 | n/a | 0.000 | 288.802 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 288.838 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| d128f7839f583704000000000003066f | 288.542 | 0.028 | n/a | 0.000 | 288.512 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.541 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| d128f7839f583704000000000003066e | 288.490 | 0.034 | n/a | 0.000 | 288.454 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.488 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| d128f7839f583704000000000003066c | 288.482 | 0.219 | n/a | 0.000 | 288.261 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.480 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| d128f7839f583704000000000003066d | 288.436 | 0.049 | n/a | 0.000 | 288.385 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.434 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 04ccbea29634a0ee000000000001b7b7 | 288.180 | 0.061 | n/a | 0.000 | 288.117 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.177 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 04ccbea29634a0ee000000000001b7b8 | 288.085 | 0.239 | n/a | 0.000 | 287.841 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 288.080 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 3e5cad4d044ac8e6000000000001bb3b | 247.181 | 0.094 | n/a | 0.000 | 247.052 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.035 | 247.146 | 1.000 | 0.035 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 3e5cad4d044ac8e6000000000001bb3a | 247.122 | 0.045 | n/a | 0.000 | 247.072 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 247.117 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 04ccbea29634a0ee000000000001b7c3 | 247.012 | 0.029 | n/a | 0.000 | 246.982 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 247.011 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| 3e5cad4d044ac8e6000000000001bb39 | 247.008 | 0.179 | n/a | 0.000 | 246.825 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 247.004 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |

## P1 / L64 / read (221 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.033 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 340.890 | n/a | n/a | n/a | 35.490 | n/a | 3.542 | 340.798 | 15.585 | 27.658 | 133.852 | n/a | 0.017 | 0.000 | n/a | n/a | 41.033 | 340.888 | 1.000 | 41.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d128f7839f5837040000000000038212 | 340.939 | 0.026 | n/a | 0.000 | 340.912 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.938 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000038210 | 340.891 | 0.123 | n/a | 0.000 | 340.767 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.890 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000038211 | 340.890 | 0.032 | n/a | 0.000 | 340.856 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.888 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000002471d | 340.850 | 0.219 | n/a | 0.000 | 340.631 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.849 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000002471f | 340.826 | 0.027 | n/a | 0.000 | 340.798 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.825 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000003820f | 340.797 | 0.042 | n/a | 0.000 | 340.754 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.796 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000003820d | 340.779 | 0.350 | n/a | 0.000 | 340.426 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 340.776 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000002471e | 340.774 | 0.037 | n/a | 0.000 | 340.735 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.772 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000003820e | 340.740 | 0.049 | n/a | 0.000 | 340.689 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.739 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000002471c | 340.722 | 0.040 | n/a | 0.000 | 340.680 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.721 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000002471b | 340.599 | 0.203 | n/a | 0.000 | 340.393 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 340.595 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000024a19 | 340.378 | 0.587 | n/a | 0.000 | 339.788 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 340.375 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000024a1a | 339.950 | 0.188 | n/a | 0.000 | 339.757 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 339.946 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000024a32 | 338.805 | 0.042 | n/a | 0.000 | 338.762 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.803 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000024a33 | 338.801 | 0.017 | n/a | 0.000 | 338.783 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.800 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000024a34 | 338.782 | 0.026 | n/a | 0.000 | 338.755 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.781 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000002edd0 | 274.942 | 0.013 | n/a | 0.000 | 274.928 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.941 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 04ccbea29634a0ee000000000002edcf | 274.940 | 0.017 | n/a | 0.000 | 274.921 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.938 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 04ccbea29634a0ee000000000002edce | 274.926 | 0.016 | n/a | 0.000 | 274.908 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.925 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 04ccbea29634a0ee000000000002edcd | 274.903 | 0.027 | n/a | 0.000 | 274.874 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.902 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |

## P1 / L256 / read (190 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.035 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 302.049 | n/a | n/a | n/a | 17.828 | n/a | 2.255 | 301.861 | 0.526 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.284 | 302.042 | 1.000 | 27.284 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d128f7839f583704000000000004cf3e | 303.051 | 0.151 | n/a | 0.000 | 302.898 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 303.048 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000004cf3d | 302.049 | 0.182 | n/a | 0.000 | 301.861 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 302.042 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee0000000000038060 | 301.492 | 0.232 | n/a | 0.000 | 301.254 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 301.486 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000004cf64 | 300.365 | 0.052 | n/a | 0.000 | 300.311 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.364 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000004cf63 | 300.331 | 0.029 | n/a | 0.000 | 300.300 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.329 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000004cf62 | 300.303 | 0.028 | n/a | 0.000 | 300.272 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.301 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000004cf61 | 300.286 | 0.072 | n/a | 0.000 | 300.211 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.283 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000399db | 299.169 | 0.057 | n/a | 0.000 | 299.110 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 299.167 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000399da | 299.157 | 0.068 | n/a | 0.000 | 299.087 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 299.155 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000399e1 | 298.814 | 0.055 | n/a | 0.000 | 298.756 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 298.811 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000399e2 | 298.783 | 0.019 | n/a | 0.000 | 298.763 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.781 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee0000000000038066 | 298.682 | 0.162 | n/a | 0.000 | 298.519 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.680 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee0000000000038067 | 298.564 | 0.051 | n/a | 0.000 | 298.512 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.563 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee0000000000038068 | 298.550 | 0.027 | n/a | 0.000 | 298.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.548 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee0000000000038069 | 298.542 | 0.014 | n/a | 0.000 | 298.527 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.541 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e600000000000399d9 | 298.438 | 0.331 | n/a | 0.000 | 298.100 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 298.432 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000042e1d | 274.357 | 0.045 | n/a | 0.000 | 274.311 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.356 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| d128f7839f5837040000000000042e20 | 274.271 | 0.027 | n/a | 0.000 | 274.243 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.270 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| d128f7839f5837040000000000042e1f | 274.247 | 0.031 | n/a | 0.000 | 274.215 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.245 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 3e5cad4d044ac8e60000000000039972 | 271.257 | 0.036 | n/a | 0.000 | 271.221 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.256 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (319 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 6.110 | n/a | n/a | n/a | 5.901 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.207 | 5.901 | 0.999 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5cad4d044ac8e6000000000003ae63 | 61.404 | 25.379 | n/a | 3.443 | 0.000 | 0.798 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.785 | 28.822 | 0.469 | 31.785 | node-14/thread-5/socket.wait-first-byte | replica.apply-delta 0.042ms |
| d128f7839f583704000000000004e6e2 | 38.260 | 1.297 | n/a | 0.000 | 0.000 | 0.701 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.262 | 1.297 | 0.034 | 36.262 | node-14/thread-3/socket.wait-first-byte | replica.apply-delta 0.024ms |
| 04ccbea29634a0ee000000000003972f | 29.411 | 17.031 | n/a | 1.861 | 0.000 | 0.481 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.037 | 18.892 | 0.642 | 10.037 | node-14/thread-4/reader.execute | none observed |
| 3e5cad4d044ac8e60000000000044500 | 6.110 | 6.105 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 6.105 | 0.999 | 0.005 | node-14/thread-5/reader.execute | none observed |
| 3e5cad4d044ac8e600000000000449c2 | 5.912 | 5.888 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 5.888 | 0.996 | 0.024 | node-14/thread-5/replica.pull-at | none observed |
| 3e5cad4d044ac8e600000000000449c1 | 5.906 | 5.901 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 5.901 | 0.999 | 0.004 | node-14/thread-5/replica.pull-at | none observed |
| 3e5cad4d044ac8e600000000000449c3 | 5.876 | 5.850 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.850 | 0.996 | 0.026 | node-14/thread-5/reader.execute | none observed |
| d128f7839f5837040000000000058420 | 3.987 | 3.985 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.985 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 3e5cad4d044ac8e6000000000004454b | 3.852 | 3.849 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.849 | 0.999 | 0.003 | node-14/thread-5/reader.execute | none observed |
| 3e5cad4d044ac8e60000000000044cd2 | 3.750 | 3.747 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.747 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 3e5cad4d044ac8e60000000000044cd3 | 3.747 | 3.733 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.733 | 0.996 | 0.014 | node-14/thread-5/replica.pull-at | none observed |
| d128f7839f5837040000000000055081 | 3.746 | 3.607 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.139 | 3.607 | 0.963 | 0.139 | node-14/thread-3/replica.pull-at | none observed |
| 3e5cad4d044ac8e60000000000044cd4 | 3.697 | 3.681 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.681 | 0.996 | 0.015 | node-14/thread-5/replica.pull-at | none observed |
| 3e5cad4d044ac8e60000000000044420 | 3.636 | 3.634 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.634 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 04ccbea29634a0ee00000000000445f3 | 3.591 | 3.588 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.588 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.037ms |
| d128f7839f5837040000000000055082 | 3.575 | 3.548 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.548 | 0.992 | 0.027 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f5837040000000000055083 | 3.547 | 3.518 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 3.518 | 0.992 | 0.029 | node-14/thread-3/replica.pull-at | none observed |
| 04ccbea29634a0ee00000000000445f8 | 3.523 | 3.508 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.508 | 0.996 | 0.015 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.037ms |
| 04ccbea29634a0ee00000000000445f9 | 3.516 | 3.500 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.500 | 0.996 | 0.016 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.037ms |
| 04ccbea29634a0ee00000000000445fa | 3.514 | 3.496 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.496 | 0.995 | 0.018 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.037ms |

## P1 / recovery / read (218 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 297.869 | n/a | n/a | n/a | 10.029 | n/a | 0.000 | 297.839 | 0.422 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.281 | 297.868 | 1.000 | 2.281 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5cad4d044ac8e60000000000059a31 | 297.915 | 0.054 | n/a | 0.000 | 297.858 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.912 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000059a30 | 297.877 | 0.029 | n/a | 0.000 | 297.847 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.876 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000059a33 | 297.869 | 0.029 | n/a | 0.000 | 297.839 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.868 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000059a2f | 297.837 | 0.026 | n/a | 0.000 | 297.810 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.836 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000005782a | 297.771 | 0.302 | n/a | 0.000 | 297.462 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 297.764 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000059a2e | 297.756 | 0.136 | n/a | 0.000 | 297.617 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 297.753 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000006df9b | 297.671 | 0.071 | n/a | 0.000 | 297.575 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 297.647 | 1.000 | 0.025 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000006df9c | 297.587 | 0.030 | n/a | 0.000 | 297.552 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 297.582 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000006df9a | 297.579 | 0.134 | n/a | 0.000 | 297.443 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 297.577 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee0000000000057842 | 296.524 | 0.120 | n/a | 0.000 | 296.402 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.522 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000006dfbf | 296.484 | 0.095 | n/a | 0.000 | 296.387 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.482 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000006dfdb | 295.577 | 0.016 | n/a | 0.000 | 295.560 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.576 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000006dfda | 295.574 | 0.021 | n/a | 0.000 | 295.552 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.573 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000005785e | 295.367 | 0.104 | n/a | 0.000 | 295.261 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 295.365 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000005785f | 295.339 | 0.059 | n/a | 0.000 | 295.276 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 295.335 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000005786a | 295.098 | 0.084 | n/a | 0.000 | 295.012 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 295.097 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e6000000000005a7fd | 291.009 | 0.148 | n/a | 0.000 | 290.858 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.006 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000006f003 | 290.704 | 0.013 | n/a | 0.000 | 290.691 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.703 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000006f002 | 290.699 | 0.014 | n/a | 0.000 | 290.684 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.698 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000006f001 | 290.685 | 0.021 | n/a | 0.000 | 290.664 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.684 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 2.039 | n/a | n/a | n/a | 1.751 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.484 | 1.751 | 0.999 | 0.484 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d128f7839f583704000000000007195d | 20.886 | 1.593 | n/a | 0.000 | 0.000 | 0.440 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.853 | 1.593 | 0.076 | 18.853 | node-14/thread-3/socket.wait-first-byte | replica.apply-delta 0.033ms |
| d128f7839f5837040000000000086f9c | 2.039 | 2.036 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.036 | 0.999 | 0.003 | node-14/thread-3/reader.execute | none observed |
| d128f7839f5837040000000000071d55 | 1.751 | 1.751 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.751 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000007d1b4 | 1.401 | 1.398 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.398 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000007b3c7 | 0.797 | 0.795 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.795 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f5837040000000000084f44 | 0.667 | 0.665 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.665 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000007fac6 | 0.615 | 0.531 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.084 | 0.531 | 0.863 | 0.084 | node-14/thread-3/reader.execute | none observed |
| d128f7839f5837040000000000084ba7 | 0.581 | 0.579 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.579 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f5837040000000000081451 | 0.564 | 0.562 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.562 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000007a337 | 0.521 | 0.520 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.520 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f5837040000000000076e7c | 0.484 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.484 | 0.000 | 0.000 | 0.484 | uncovered | none observed |
| d128f7839f583704000000000008ec0e | 0.482 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.482 | 0.000 | 0.000 | 0.482 | uncovered | none observed |
| d128f7839f583704000000000008a341 | 0.469 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.469 | 0.000 | 0.000 | 0.469 | uncovered | none observed |
| d128f7839f583704000000000008049e | 0.452 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.452 | 0.000 | 0.000 | 0.452 | uncovered | none observed |
| d128f7839f583704000000000008161f | 0.452 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.452 | 0.000 | 0.000 | 0.452 | uncovered | none observed |
| d128f7839f58370400000000000719e0 | 0.449 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.449 | 0.000 | 0.000 | 0.449 | uncovered | none observed |
| d128f7839f583704000000000007d153 | 0.449 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.449 | 0.000 | 0.000 | 0.449 | uncovered | none observed |
| d128f7839f583704000000000008107a | 0.445 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.445 | 0.000 | 0.000 | 0.445 | uncovered | none observed |
| d128f7839f5837040000000000081965 | 0.432 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.432 | 0.000 | 0.000 | 0.432 | uncovered | none observed |
| d128f7839f5837040000000000077330 | 0.425 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.425 | 0.000 | 0.000 | 0.425 | uncovered | none observed |

## P4 / p4h1 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 4.946 | n/a | n/a | n/a | 3.092 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.477 | 3.092 | 0.999 | 0.477 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d128f7839f5837040000000000092093 | 8.440 | 2.336 | n/a | 0.000 | 0.000 | 0.434 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.670 | 2.336 | 0.277 | 5.670 | node-14/thread-3/socket.wait-first-byte | none observed |
| d128f7839f583704000000000009fa46 | 4.946 | 4.940 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 4.940 | 0.999 | 0.005 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.046ms |
| d128f7839f583704000000000009e87a | 3.094 | 3.092 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.092 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000ac694 | 1.797 | 1.795 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.795 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000a825d | 1.472 | 1.469 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.469 | 0.998 | 0.003 | node-14/thread-3/reader.execute | none observed |
| d128f7839f58370400000000000ac6a3 | 1.371 | 1.368 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.368 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000009f792 | 1.195 | 1.188 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 1.188 | 0.994 | 0.007 | node-14/thread-3/reader.execute | none observed |
| d128f7839f583704000000000009f3e8 | 1.160 | 1.156 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.156 | 0.996 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000009e8a2 | 1.075 | 1.066 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 1.066 | 0.992 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000009ebc0 | 0.760 | 0.756 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.756 | 0.995 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000009e972 | 0.625 | 0.575 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.049 | 0.575 | 0.921 | 0.049 | node-14/thread-3/reader.execute | none observed |
| d128f7839f583704000000000009f3cc | 0.600 | 0.560 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.041 | 0.560 | 0.932 | 0.041 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000009eb82 | 0.594 | 0.579 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.579 | 0.974 | 0.015 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000009c6c9 | 0.581 | 0.579 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.579 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000009e87d | 0.542 | 0.539 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.539 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000009ef46 | 0.531 | 0.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.529 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f583704000000000009e9af | 0.510 | 0.506 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.506 | 0.991 | 0.004 | node-14/thread-3/reader.execute | none observed |
| d128f7839f583704000000000009ebe5 | 0.477 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.477 | 0.000 | 0.000 | 0.477 | uncovered | none observed |
| d128f7839f58370400000000000ac685 | 0.475 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.475 | 0.000 | 0.000 | 0.475 | uncovered | none observed |
| d128f7839f583704000000000009ec9d | 0.472 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.472 | 0.000 | 0.000 | 0.472 | uncovered | none observed |

## P4 / p4h3 / read (159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 5.766 | n/a | n/a | n/a | 2.560 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.138 | 2.560 | 0.999 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d128f7839f58370400000000000b58e8 | 15.147 | 2.560 | n/a | 0.000 | 0.000 | 0.621 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.966 | 2.560 | 0.169 | 11.966 | node-14/thread-3/socket.wait-first-byte | none observed |
| d128f7839f58370400000000000d0eff | 5.766 | 5.763 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.763 | 0.999 | 0.003 | node-14/thread-3/reader.execute | none observed |
| d128f7839f58370400000000000bf123 | 2.443 | 2.440 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.440 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000b82d4 | 1.152 | 1.150 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.150 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c7607 | 1.143 | 1.138 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.138 | 0.996 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000d7a95 | 0.886 | 0.885 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.885 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c7843 | 0.795 | 0.790 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.790 | 0.994 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c7616 | 0.754 | 0.752 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.752 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c7667 | 0.734 | 0.731 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.731 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c76c4 | 0.680 | 0.674 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.674 | 0.992 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c6c74 | 0.657 | 0.656 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.656 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000d0858 | 0.599 | 0.590 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.590 | 0.985 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c8329 | 0.582 | 0.581 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.581 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c3f79 | 0.576 | 0.574 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.574 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c75fa | 0.573 | 0.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.568 | 0.992 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c75ff | 0.568 | 0.551 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.551 | 0.969 | 0.018 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c4ce0 | 0.561 | 0.559 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.559 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000c7c87 | 0.543 | 0.536 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.536 | 0.986 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000b96c7 | 0.523 | 0.521 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.521 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000b96c4 | 0.511 | 0.508 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.508 | 0.993 | 0.003 | node-14/thread-3/reader.execute | none observed |

## P4 / p4h10 / read (146 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 1.624 | n/a | n/a | n/a | 1.569 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.490 | 1.569 | 0.999 | 0.490 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d128f7839f58370400000000000d9f63 | 9.629 | 1.569 | n/a | 0.000 | 0.000 | 0.403 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.657 | 1.569 | 0.163 | 7.657 | node-14/thread-3/socket.wait-first-byte | none observed |
| d128f7839f58370400000000000ecd77 | 1.624 | 1.622 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.622 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000f24f3 | 1.246 | 1.244 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.244 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000e7c78 | 0.984 | 0.982 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.982 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000ef546 | 0.894 | 0.892 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.892 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000f0a0c | 0.748 | 0.746 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.746 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000e169c | 0.654 | 0.653 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.653 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000e7ef4 | 0.648 | 0.645 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.645 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000e01de | 0.586 | 0.583 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.583 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000f9d01 | 0.573 | 0.571 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.571 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000fa6f1 | 0.557 | 0.555 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.555 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000f39c6 | 0.533 | 0.531 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.531 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| d128f7839f58370400000000000f9d22 | 0.490 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.490 | 0.000 | 0.000 | 0.490 | uncovered | none observed |
| d128f7839f58370400000000000f39cf | 0.469 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.469 | 0.000 | 0.000 | 0.469 | uncovered | none observed |
| d128f7839f58370400000000000fa51a | 0.462 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.462 | 0.000 | 0.000 | 0.462 | uncovered | none observed |
| d128f7839f58370400000000000e17f8 | 0.440 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.440 | 0.000 | 0.000 | 0.440 | uncovered | none observed |
| d128f7839f58370400000000000fa444 | 0.439 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.439 | 0.000 | 0.000 | 0.439 | uncovered | none observed |
| d128f7839f58370400000000000ed915 | 0.432 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.432 | 0.000 | 0.000 | 0.432 | uncovered | none observed |
| d128f7839f58370400000000000eb8b6 | 0.429 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.429 | 0.000 | 0.000 | 0.429 | uncovered | none observed |
| d128f7839f58370400000000000f9d38 | 0.426 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.426 | 0.000 | 0.000 | 0.426 | uncovered | none observed |

## P5 / presweep / read (250 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.043 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.000 | 0.000 | 0.022 |
| p99 | 267.084 | n/a | n/a | n/a | 14.704 | n/a | 0.000 | 267.008 | 0.599 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.170 | 267.082 | 1.000 | 8.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 04ccbea29634a0ee0000000000060984 | 267.175 | 0.087 | n/a | 0.000 | 267.086 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.174 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee0000000000060983 | 267.116 | 0.016 | n/a | 0.000 | 267.099 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 267.115 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee0000000000060982 | 267.084 | 0.074 | n/a | 0.000 | 267.008 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.082 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000006098d | 266.994 | 0.039 | n/a | 0.000 | 266.954 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.993 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000062f0e | 263.615 | 0.020 | n/a | 0.000 | 263.592 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 263.613 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000062f0d | 263.592 | 0.026 | n/a | 0.000 | 263.565 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.591 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000062f0c | 263.539 | 0.059 | n/a | 0.000 | 263.478 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.538 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000062f0b | 263.408 | 0.100 | n/a | 0.000 | 263.305 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 263.406 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000101952 | 262.741 | 0.015 | n/a | 0.000 | 262.725 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.740 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000101951 | 262.724 | 0.018 | n/a | 0.000 | 262.705 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.723 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee0000000000060981 | 262.704 | 0.175 | n/a | 0.000 | 262.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 262.700 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d128f7839f5837040000000000101950 | 262.704 | 0.019 | n/a | 0.000 | 262.684 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.702 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000010194f | 262.682 | 0.020 | n/a | 0.000 | 262.661 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.681 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000010194e | 262.672 | 0.056 | n/a | 0.000 | 262.615 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.671 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3e5cad4d044ac8e60000000000062f0a | 262.581 | 0.115 | n/a | 0.000 | 262.463 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.578 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d128f7839f583704000000000010194d | 261.894 | 0.097 | n/a | 0.000 | 261.794 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 261.891 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 04ccbea29634a0ee000000000005af02 | 45.062 | 26.135 | n/a | 8.752 | 0.000 | 0.599 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.576 | 34.887 | 0.774 | 9.576 | node-14/thread-4/reader.execute | replica.apply-delta 0.022ms |
| d128f7839f58370400000000000fa892 | 27.309 | 17.043 | n/a | 0.000 | 0.000 | 0.859 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.408 | 17.043 | 0.624 | 9.408 | node-14/thread-3/reader.execute | none observed |
| 3e5cad4d044ac8e6000000000005cf14 | 19.088 | 14.704 | n/a | 1.342 | 0.000 | 0.881 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.162 | 16.045 | 0.841 | 2.162 | node-14/thread-5/reader.execute | none observed |
| 04ccbea29634a0ee000000000005aea0 | 11.493 | 0.115 | n/a | 0.000 | 11.376 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 11.490 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P5 / sweep / read (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.199 | n/a | n/a | n/a | 2.195 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 2.195 | 0.994 | 0.018 |
| p99 | 31.249 | n/a | n/a | n/a | 19.719 | n/a | 7.595 | 0.000 | 0.990 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.805 | 27.314 | 1.000 | 8.805 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 04ccbea29634a0ee00000000000673fb | 31.249 | 19.719 | n/a | 7.595 | 0.000 | 0.990 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.944 | 27.314 | 0.874 | 2.944 | node-14/thread-4/reader.execute | none observed |
| 3e5cad4d044ac8e6000000000006a71e | 22.797 | 13.048 | n/a | 0.000 | 0.000 | 0.945 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.805 | 13.048 | 0.572 | 8.805 | node-14/thread-5/reader.execute | none observed |
| 567e61f94465393f00000000000002e3 | 10.088 | 10.039 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.049 | 10.039 | 0.995 | 0.049 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f00000000000002e4 | 9.790 | 9.722 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.068 | 9.722 | 0.993 | 0.068 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f00000000000002e5 | 9.650 | 9.612 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 9.612 | 0.996 | 0.039 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f00000000000002e6 | 9.542 | 9.499 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.044 | 9.499 | 0.995 | 0.044 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f00000000000002e7 | 9.428 | 9.368 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.060 | 9.368 | 0.994 | 0.060 | node-14/thread-6/replica.pull-at | none observed |
| d128f7839f5837040000000000108d78 | 9.021 | 5.363 | n/a | 0.000 | 0.000 | 0.943 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.716 | 5.363 | 0.594 | 2.716 | node-14/thread-3/reader.execute | none observed |
| 567e61f94465393f00000000000002e8 | 8.878 | 8.816 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.063 | 8.816 | 0.993 | 0.063 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f0000000000000253 | 8.747 | 8.736 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 8.736 | 0.999 | 0.011 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f0000000000000254 | 8.720 | 8.700 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 8.700 | 0.998 | 0.020 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f0000000000000255 | 8.653 | 8.627 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 8.627 | 0.997 | 0.026 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f0000000000000256 | 8.610 | 8.586 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 8.586 | 0.997 | 0.024 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f0000000000000257 | 8.569 | 8.543 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 8.543 | 0.997 | 0.026 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f00000000000002e9 | 8.514 | 8.447 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.068 | 8.447 | 0.992 | 0.068 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f0000000000000258 | 8.503 | 8.474 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 8.474 | 0.997 | 0.029 | node-14/thread-6/reader.execute | none observed |
| 567e61f94465393f00000000000002f3 | 8.278 | 8.196 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.082 | 8.196 | 0.990 | 0.082 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f00000000000002ea | 8.251 | 8.174 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.077 | 8.174 | 0.991 | 0.077 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f00000000000002eb | 8.015 | 7.934 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.081 | 7.934 | 0.990 | 0.081 | node-14/thread-6/replica.pull-at | none observed |
| 567e61f94465393f0000000000000063 | 7.776 | 7.756 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 7.756 | 0.998 | 0.019 | node-14/thread-6/replica.pull-at | none observed |

## P1 / outside-phases / read (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.345 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.345 | 0.000 | 0.000 | 0.345 |
| p99 | 0.502 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.502 | 0.000 | 0.000 | 0.502 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5cad4d044ac8e6000000000006b3f3 | 0.502 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.502 | 0.000 | 0.000 | 0.502 | uncovered | none observed |
| d128f7839f5837040000000000109dab | 0.446 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.446 | 0.000 | 0.000 | 0.446 | uncovered | none observed |
| 3e5cad4d044ac8e6000000000006b3f4 | 0.441 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.441 | 0.000 | 0.000 | 0.441 | uncovered | none observed |
| 3e5cad4d044ac8e6000000000006b3f5 | 0.423 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.423 | 0.000 | 0.000 | 0.423 | uncovered | none observed |
| 3e5cad4d044ac8e6000000000006b3f6 | 0.412 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.412 | 0.000 | 0.000 | 0.412 | uncovered | none observed |
| d128f7839f5837040000000000109dac | 0.389 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.389 | 0.000 | 0.000 | 0.389 | uncovered | none observed |
| 04ccbea29634a0ee0000000000067d56 | 0.364 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.364 | 0.000 | 0.000 | 0.364 | uncovered | none observed |
| 04ccbea29634a0ee0000000000067d57 | 0.352 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.352 | 0.000 | 0.000 | 0.352 | uncovered | none observed |
| 04ccbea29634a0ee0000000000067d58 | 0.345 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.345 | 0.000 | 0.000 | 0.345 | uncovered | none observed |
| 04ccbea29634a0ee0000000000067d59 | 0.318 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.318 | 0.000 | 0.000 | 0.318 | uncovered | none observed |
| d128f7839f5837040000000000109dad | 0.261 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | uncovered | none observed |
| d128f7839f5837040000000000109dae | 0.182 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | uncovered | none observed |
| d128f7839f5837040000000000109daf | 0.142 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | uncovered | none observed |
| 3e5cad4d044ac8e6000000000006b3f7 | 0.141 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | uncovered | none observed |
| d128f7839f5837040000000000109db0 | 0.118 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | uncovered | none observed |
| 04ccbea29634a0ee0000000000067d55 | 0.117 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | uncovered | none observed |

## P1 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.021 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.000 | 0.000 | 0.021 |
| p99 | 0.097 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 04ccbea29634a0ee000000000000aa60 | 0.097 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | uncovered | none observed |
| 3e5cad4d044ac8e6000000000000a624 | 0.057 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.057 | 0.000 | 0.000 | 0.057 | uncovered | none observed |
| 04ccbea29634a0ee000000000000aa62 | 0.021 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.000 | 0.000 | 0.021 | uncovered | none observed |
| 04ccbea29634a0ee000000000000aa61 | 0.017 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 | uncovered | none observed |

## P3 / outside-phases / read (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.543 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.045 | 201.149 | 0.018 | n/a | 0.145 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 |
| p99 | 222.146 | n/a | n/a | n/a | 0.724 | n/a | 0.000 | 0.000 | 9.424 | 212.875 | 3.968 | n/a | 0.502 | 0.000 | n/a | n/a | 50.692 | 0.724 | 0.004 | 50.692 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000007 | 222.146 | 0.000 | n/a | 0.000 | 0.000 | 3.469 | 212.875 | 0.074 | n/a | 0.502 | 0.000 | n/a | n/a | 5.225 | 0.000 | 0.000 | 5.225 | gw-r/thread-49/journal/page | none observed |
| 85a4c558e217000d000000000000005b | 212.024 | 0.000 | n/a | 0.000 | 0.000 | 3.777 | 207.922 | 0.023 | n/a | 0.145 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| 85a4c558e217000d000000000000005d | 207.669 | 0.000 | n/a | 0.000 | 0.000 | 1.045 | 202.378 | 3.968 | n/a | 0.069 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-67/journal/page | none observed |
| 85a4c558e217000d000000000000005e | 206.122 | 0.000 | n/a | 0.000 | 0.000 | 4.090 | 201.554 | 0.051 | n/a | 0.244 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-64/journal/page | none observed |
| 85a4c558e217000d00000000000000a0 | 203.839 | 0.000 | n/a | 0.000 | 0.000 | 2.361 | 201.151 | 0.019 | n/a | 0.148 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-44/journal/page | none observed |
| 85a4c558e217000d000000000000005c | 203.713 | 0.000 | n/a | 0.000 | 0.000 | 0.996 | 202.365 | 0.020 | n/a | 0.211 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 85a4c558e217000d0000000000000006 | 203.545 | 0.000 | n/a | 0.000 | 0.000 | 1.652 | 201.336 | 0.018 | n/a | 0.188 | 0.000 | n/a | n/a | 0.351 | 0.000 | 0.000 | 0.351 | gw-r/thread-61/journal/page | none observed |
| 85a4c558e217000d00000000000000c6 | 203.455 | 0.000 | n/a | 0.000 | 0.000 | 0.992 | 202.097 | 0.016 | n/a | 0.176 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-69/journal/page | none observed |
| 85a4c558e217000d000000000000009e | 203.338 | 0.000 | n/a | 0.000 | 0.000 | 1.811 | 201.149 | 0.018 | n/a | 0.159 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-72/journal/page | none observed |
| 85a4c558e217000d000000000000009c | 203.012 | 0.000 | n/a | 0.000 | 0.000 | 1.566 | 201.163 | 0.015 | n/a | 0.153 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-68/journal/page | none observed |
| 85a4c558e217000d0000000000000079 | 202.963 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 201.602 | 0.052 | n/a | 0.211 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-68/journal/page | none observed |
| 85a4c558e217000d000000000000007c | 202.785 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 201.137 | 0.029 | n/a | 0.192 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-66/journal/page | none observed |
| 85a4c558e217000d00000000000000a1 | 202.726 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 201.349 | 0.016 | n/a | 0.162 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 85a4c558e217000d00000000000000c9 | 202.698 | 0.000 | n/a | 0.000 | 0.000 | 1.213 | 201.209 | 0.010 | n/a | 0.140 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-73/journal/page | none observed |
| 85a4c558e217000d0000000000000005 | 202.595 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 201.074 | 0.019 | n/a | 0.184 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 | gw-r/thread-44/journal/page | none observed |
| 85a4c558e217000d0000000000000078 | 202.574 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 201.328 | 0.039 | n/a | 0.187 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-65/journal/page | none observed |
| 85a4c558e217000d00000000000000c7 | 202.543 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 201.357 | 0.024 | n/a | 0.173 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-71/journal/page | none observed |
| 85a4c558e217000d00000000000000c8 | 202.532 | 0.000 | n/a | 0.000 | 0.000 | 0.970 | 201.238 | 0.022 | n/a | 0.173 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 85a4c558e217000d000000000000007f | 202.196 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 201.171 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 85a4c558e217000d00000000000000ca | 201.960 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 200.998 | 0.016 | n/a | 0.137 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-72/journal/page | none observed |

## P3 / outside-phases / internal (18 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 349.604 | n/a | n/a | n/a | 3.163 | n/a | 0.000 | 0.000 | 1.262 | 345.207 | 0.018 | n/a | 0.108 | 0.000 | n/a | n/a | 0.183 | 3.163 | 0.009 | 0.183 |
| p99 | 1012.488 | n/a | n/a | n/a | 83.402 | n/a | 2.908 | 0.000 | 6.169 | 1003.310 | 2.230 | n/a | 0.911 | 0.000 | n/a | n/a | 30.388 | 86.310 | 0.732 | 30.388 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000017 | 1012.488 | 0.446 | n/a | 0.000 | 0.000 | 5.058 | 1002.313 | 2.230 | n/a | 0.911 | 0.000 | n/a | n/a | 1.531 | 0.446 | 0.000 | 1.531 | gw-r/thread-46/journal/page | none observed |
| b9798449a898950b0000000000000051 | 1011.651 | 0.331 | n/a | 0.000 | 0.000 | 6.169 | 1003.310 | 0.092 | n/a | 0.342 | 0.000 | n/a | n/a | 1.408 | 0.331 | 0.000 | 1.408 | gw-r/thread-45/journal/page | none observed |
| b9798449a898950b0000000000000019 | 1005.603 | 0.207 | n/a | 0.000 | 0.000 | 0.918 | 1002.976 | 0.090 | n/a | 0.273 | 0.000 | n/a | n/a | 1.139 | 0.207 | 0.000 | 1.139 | gw-r/thread-47/journal/page | none observed |
| b9798449a898950b0000000000000018 | 1005.209 | 0.254 | n/a | 0.000 | 0.000 | 2.324 | 1001.245 | 0.023 | n/a | 0.178 | 0.000 | n/a | n/a | 1.185 | 0.254 | 0.000 | 1.185 | gw-r/thread-46/journal/page | none observed |
| b9798449a898950b000000000000007f | 1004.152 | 2.958 | n/a | 0.000 | 0.000 | 2.229 | 998.710 | 0.032 | n/a | 0.156 | 0.000 | n/a | n/a | 0.066 | 2.958 | 0.003 | 0.066 | gw-r/thread-45/journal/page | none observed |
| b9798449a898950b0000000000000097 | 1003.155 | 0.151 | n/a | 0.000 | 0.000 | 0.899 | 1000.882 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 1.127 | 0.151 | 0.000 | 1.127 | gw-r/thread-65/journal/page | none observed |
| b9798449a898950b000000000000001a | 880.498 | 40.386 | n/a | 0.946 | 0.000 | 1.584 | 835.745 | 0.021 | n/a | 0.144 | 0.000 | n/a | n/a | 1.673 | 41.332 | 0.047 | 1.673 | gw-r/thread-46/journal/page | none observed |
| b9798449a898950b0000000000000050 | 671.538 | 7.310 | n/a | 0.000 | 0.000 | 1.026 | 662.775 | 0.028 | n/a | 0.122 | 0.000 | n/a | n/a | 0.277 | 7.310 | 0.011 | 0.277 | gw-r/thread-49/journal/page | none observed |
| b9798449a898950b0000000000000060 | 545.587 | 3.275 | n/a | 0.000 | 0.000 | 1.476 | 540.656 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.079 | 3.275 | 0.006 | 0.079 | gw-r/thread-70/journal/page | none observed |
| b9798449a898950b0000000000000066 | 349.604 | 3.163 | n/a | 0.000 | 0.000 | 0.838 | 345.207 | 0.081 | n/a | 0.182 | 0.000 | n/a | n/a | 0.133 | 3.163 | 0.009 | 0.133 | gw-r/thread-48/journal/page | none observed |
| b9798449a898950b0000000000000063 | 279.763 | 2.244 | n/a | 0.000 | 0.000 | 0.801 | 276.500 | 0.016 | n/a | 0.108 | 0.000 | n/a | n/a | 0.095 | 2.244 | 0.008 | 0.095 | gw-r/thread-46/journal/page | none observed |
| b9798449a898950b0000000000000080 | 247.159 | 3.571 | n/a | 0.000 | 0.000 | 1.339 | 242.101 | 0.018 | n/a | 0.067 | 0.000 | n/a | n/a | 0.064 | 3.571 | 0.014 | 0.064 | gw-r/thread-73/journal/page | none observed |
| b9798449a898950b000000000000007e | 220.674 | 4.393 | n/a | 0.000 | 0.000 | 1.602 | 214.470 | 0.016 | n/a | 0.101 | 0.000 | n/a | n/a | 0.092 | 4.393 | 0.020 | 0.092 | gw-r/thread-66/journal/page | none observed |
| b9798449a898950b0000000000000061 | 173.051 | 5.932 | n/a | 0.000 | 0.000 | 1.639 | 165.139 | 0.014 | n/a | 0.143 | 0.000 | n/a | n/a | 0.183 | 5.932 | 0.034 | 0.183 | gw-r/thread-71/journal/page | none observed |
| b9798449a898950b0000000000000065 | 163.399 | 3.872 | n/a | 0.000 | 0.000 | 0.796 | 158.531 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.095 | 3.872 | 0.024 | 0.095 | gw-r/thread-75/journal/page | none observed |
| b9798449a898950b000000000000005d | 148.133 | 9.394 | n/a | 1.368 | 0.000 | 1.234 | 135.665 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.410 | 10.762 | 0.073 | 0.410 | gw-r/thread-67/journal/page | none observed |
| b9798449a898950b000000000000005f | 124.788 | 2.420 | n/a | 0.000 | 0.000 | 1.262 | 120.917 | 0.056 | n/a | 0.060 | 0.000 | n/a | n/a | 0.073 | 2.420 | 0.019 | 0.073 | gw-r/thread-64/journal/page | none observed |
| b9798449a898950b000000000000007c | 117.875 | 83.402 | n/a | 2.908 | 0.000 | 1.177 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.388 | 86.310 | 0.732 | 30.388 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 376.156 | n/a | n/a | n/a | 6.311 | n/a | 0.000 | 0.000 | 1.781 | 370.077 | 0.038 | n/a | 0.238 | 0.000 | n/a | n/a | 0.325 | 6.311 | 0.017 | 0.325 |
| p99 | 698.707 | n/a | n/a | n/a | 11.716 | n/a | 0.000 | 0.000 | 4.411 | 684.926 | 0.055 | n/a | 0.326 | 0.000 | n/a | n/a | 0.541 | 11.716 | 0.024 | 0.541 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b000000000000001d | 698.707 | 11.716 | n/a | 0.000 | 0.000 | 1.359 | 684.926 | 0.055 | n/a | 0.326 | 0.000 | n/a | n/a | 0.325 | 11.716 | 0.017 | 0.325 | gw-r/thread-68/journal/page | none observed |
| b9798449a898950b000000000000001c | 376.156 | 3.883 | n/a | 0.000 | 0.000 | 1.781 | 370.077 | 0.038 | n/a | 0.238 | 0.000 | n/a | n/a | 0.138 | 3.883 | 0.010 | 0.138 | gw-r/thread-70/journal/page | none observed |
| b9798449a898950b000000000000001f | 266.496 | 6.311 | n/a | 0.000 | 0.000 | 4.411 | 255.107 | 0.017 | n/a | 0.110 | 0.000 | n/a | n/a | 0.541 | 6.311 | 0.024 | 0.541 | gw-r/thread-67/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 272.733 | n/a | n/a | n/a | 3.161 | n/a | 0.000 | 0.000 | 1.331 | 267.791 | 0.019 | n/a | 0.151 | 0.000 | n/a | n/a | 0.111 | 3.161 | 0.005 | 0.111 |
| p99 | 913.040 | n/a | n/a | n/a | 3.954 | n/a | 0.000 | 0.000 | 3.028 | 908.852 | 0.062 | n/a | 0.176 | 0.000 | n/a | n/a | 0.181 | 3.954 | 0.046 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000023 | 913.040 | 3.161 | n/a | 0.000 | 0.000 | 0.688 | 908.852 | 0.062 | n/a | 0.167 | 0.000 | n/a | n/a | 0.111 | 3.161 | 0.003 | 0.111 | gw-r/thread-66/journal/page | none observed |
| b9798449a898950b0000000000000020 | 716.752 | 3.719 | n/a | 0.000 | 0.000 | 3.028 | 709.688 | 0.019 | n/a | 0.117 | 0.000 | n/a | n/a | 0.181 | 3.719 | 0.005 | 0.181 | gw-r/thread-45/journal/page | none observed |
| b9798449a898950b0000000000000021 | 272.733 | 2.672 | n/a | 0.000 | 0.000 | 2.009 | 267.791 | 0.018 | n/a | 0.151 | 0.000 | n/a | n/a | 0.092 | 2.672 | 0.010 | 0.092 | gw-r/thread-70/journal/page | none observed |
| b9798449a898950b0000000000000025 | 86.432 | 3.954 | n/a | 0.000 | 0.000 | 1.331 | 80.810 | 0.031 | n/a | 0.176 | 0.000 | n/a | n/a | 0.130 | 3.954 | 0.046 | 0.130 | gw-r/thread-61/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 785.577 | n/a | n/a | n/a | 4.309 | n/a | 0.000 | 0.000 | 1.872 | 780.969 | 0.014 | n/a | 0.174 | 0.000 | n/a | n/a | 0.108 | 4.309 | 0.004 | 0.108 |
| p99 | 1004.901 | n/a | n/a | n/a | 6.390 | n/a | 0.000 | 0.000 | 2.481 | 997.814 | 0.066 | n/a | 0.193 | 0.000 | n/a | n/a | 0.142 | 6.390 | 0.030 | 0.142 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000029 | 1004.901 | 4.309 | n/a | 0.000 | 0.000 | 2.481 | 997.814 | 0.014 | n/a | 0.174 | 0.000 | n/a | n/a | 0.108 | 4.309 | 0.004 | 0.108 | gw-r/thread-66/journal/page | none observed |
| b9798449a898950b0000000000000027 | 785.577 | 3.030 | n/a | 0.000 | 0.000 | 1.225 | 780.969 | 0.066 | n/a | 0.193 | 0.000 | n/a | n/a | 0.095 | 3.030 | 0.004 | 0.095 | gw-r/thread-68/journal/page | none observed |
| b9798449a898950b0000000000000026 | 212.175 | 6.390 | n/a | 0.000 | 0.000 | 1.872 | 203.627 | 0.014 | n/a | 0.130 | 0.000 | n/a | n/a | 0.142 | 6.390 | 0.030 | 0.142 | gw-r/thread-42/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 405.294 | n/a | n/a | n/a | 3.425 | n/a | 0.000 | 0.000 | 1.426 | 399.916 | 0.024 | n/a | 0.181 | 0.000 | n/a | n/a | 0.100 | 3.425 | 0.008 | 0.100 |
| p99 | 1024.500 | n/a | n/a | n/a | 28.248 | n/a | 0.000 | 0.000 | 2.191 | 994.387 | 0.074 | n/a | 0.228 | 0.000 | n/a | n/a | 0.188 | 28.248 | 0.040 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b000000000000002f | 1024.500 | 28.248 | n/a | 0.000 | 0.000 | 1.426 | 994.387 | 0.024 | n/a | 0.228 | 0.000 | n/a | n/a | 0.188 | 28.248 | 0.028 | 0.188 | gw-r/thread-68/journal/page | none observed |
| b9798449a898950b000000000000002d | 489.689 | 3.191 | n/a | 0.000 | 0.000 | 2.191 | 483.981 | 0.030 | n/a | 0.195 | 0.000 | n/a | n/a | 0.101 | 3.191 | 0.007 | 0.101 | gw-r/thread-46/journal/page | none observed |
| b9798449a898950b000000000000002b | 405.294 | 3.425 | n/a | 0.000 | 0.000 | 1.655 | 399.916 | 0.017 | n/a | 0.181 | 0.000 | n/a | n/a | 0.100 | 3.425 | 0.008 | 0.100 | gw-r/thread-44/journal/page | none observed |
| b9798449a898950b000000000000002a | 143.894 | 5.827 | n/a | 0.000 | 0.000 | 1.023 | 136.702 | 0.074 | n/a | 0.169 | 0.000 | n/a | n/a | 0.099 | 5.827 | 0.040 | 0.099 | gw-r/thread-69/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 250.957 | n/a | n/a | n/a | 2.534 | n/a | 0.000 | 0.000 | 1.144 | 241.505 | 0.026 | n/a | 0.173 | 0.000 | n/a | n/a | 0.105 | 2.534 | 0.003 | 0.105 |
| p99 | 941.082 | n/a | n/a | n/a | 3.896 | n/a | 0.000 | 0.000 | 5.139 | 936.303 | 0.040 | n/a | 0.233 | 0.000 | n/a | n/a | 0.169 | 3.896 | 0.042 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000030 | 941.082 | 3.240 | n/a | 0.000 | 0.000 | 1.144 | 936.303 | 0.026 | n/a | 0.233 | 0.000 | n/a | n/a | 0.135 | 3.240 | 0.003 | 0.135 | gw-r/thread-69/journal/page | none observed |
| b9798449a898950b0000000000000035 | 852.710 | 2.210 | n/a | 0.000 | 0.000 | 1.571 | 848.660 | 0.024 | n/a | 0.151 | 0.000 | n/a | n/a | 0.093 | 2.210 | 0.003 | 0.093 | gw-r/thread-61/journal/page | none observed |
| b9798449a898950b0000000000000033 | 250.957 | 3.896 | n/a | 0.000 | 0.000 | 5.139 | 241.505 | 0.040 | n/a | 0.207 | 0.000 | n/a | n/a | 0.169 | 3.896 | 0.016 | 0.169 | gw-r/thread-49/journal/page | none observed |
| b9798449a898950b0000000000000031 | 60.789 | 2.534 | n/a | 0.000 | 0.000 | 0.809 | 57.136 | 0.032 | n/a | 0.173 | 0.000 | n/a | n/a | 0.105 | 2.534 | 0.042 | 0.105 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 307.743 | n/a | n/a | n/a | 4.598 | n/a | 0.000 | 0.000 | 1.284 | 299.367 | 0.022 | n/a | 0.114 | 0.000 | n/a | n/a | 0.147 | 4.598 | 0.007 | 0.147 |
| p99 | 778.481 | n/a | n/a | n/a | 8.880 | n/a | 0.861 | 0.000 | 3.923 | 772.734 | 0.028 | n/a | 0.139 | 0.000 | n/a | n/a | 0.177 | 9.740 | 0.017 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b000000000000003b | 778.481 | 4.598 | n/a | 0.000 | 0.000 | 0.871 | 772.734 | 0.017 | n/a | 0.102 | 0.000 | n/a | n/a | 0.159 | 4.598 | 0.006 | 0.159 | gw-r/thread-68/journal/page | none observed |
| b9798449a898950b0000000000000036 | 566.403 | 8.880 | n/a | 0.861 | 0.000 | 3.923 | 552.425 | 0.028 | n/a | 0.139 | 0.000 | n/a | n/a | 0.147 | 9.740 | 0.017 | 0.147 | gw-r/thread-70/journal/page | none observed |
| b9798449a898950b0000000000000038 | 307.743 | 4.690 | n/a | 0.000 | 0.000 | 3.369 | 299.367 | 0.026 | n/a | 0.114 | 0.000 | n/a | n/a | 0.177 | 4.690 | 0.015 | 0.177 | gw-r/thread-71/journal/page | none observed |
| b9798449a898950b0000000000000039 | 276.668 | 2.042 | n/a | 0.000 | 0.000 | 1.284 | 273.076 | 0.022 | n/a | 0.123 | 0.000 | n/a | n/a | 0.122 | 2.042 | 0.007 | 0.122 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 323.250 | n/a | n/a | n/a | 4.535 | n/a | 0.000 | 0.000 | 2.519 | 320.135 | 0.019 | n/a | 0.126 | 0.000 | n/a | n/a | 0.119 | 4.535 | 0.009 | 0.119 |
| p99 | 740.073 | n/a | n/a | n/a | 7.670 | n/a | 0.000 | 0.000 | 3.332 | 734.064 | 0.051 | n/a | 0.174 | 0.000 | n/a | n/a | 0.250 | 7.670 | 0.048 | 0.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b000000000000003e | 740.073 | 2.427 | n/a | 0.000 | 0.000 | 3.332 | 734.064 | 0.019 | n/a | 0.126 | 0.000 | n/a | n/a | 0.104 | 2.427 | 0.003 | 0.104 | gw-r/thread-44/journal/page | none observed |
| b9798449a898950b000000000000003f | 496.538 | 4.535 | n/a | 0.000 | 0.000 | 1.711 | 489.895 | 0.040 | n/a | 0.174 | 0.000 | n/a | n/a | 0.183 | 4.535 | 0.009 | 0.183 | gw-r/thread-71/journal/page | none observed |
| b9798449a898950b0000000000000040 | 323.250 | 1.901 | n/a | 0.000 | 0.000 | 0.995 | 320.135 | 0.018 | n/a | 0.094 | 0.000 | n/a | n/a | 0.108 | 1.901 | 0.006 | 0.108 | gw-r/thread-69/journal/page | none observed |
| b9798449a898950b000000000000003c | 199.658 | 4.672 | n/a | 0.000 | 0.000 | 2.519 | 192.142 | 0.013 | n/a | 0.062 | 0.000 | n/a | n/a | 0.250 | 4.672 | 0.023 | 0.250 | gw-r/thread-75/journal/page | none observed |
| b9798449a898950b0000000000000043 | 161.233 | 7.670 | n/a | 0.000 | 0.000 | 2.566 | 150.673 | 0.051 | n/a | 0.154 | 0.000 | n/a | n/a | 0.119 | 7.670 | 0.048 | 0.119 | gw-r/thread-66/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 983.448 | n/a | n/a | n/a | 2.171 | n/a | 0.000 | 0.000 | 1.781 | 979.006 | 0.019 | n/a | 0.198 | 0.000 | n/a | n/a | 0.091 | 2.171 | 0.002 | 0.091 |
| p99 | 1021.913 | n/a | n/a | n/a | 4.549 | n/a | 0.000 | 0.000 | 2.526 | 1014.504 | 0.043 | n/a | 0.375 | 0.000 | n/a | n/a | 0.096 | 4.549 | 0.004 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000044 | 1021.913 | 4.549 | n/a | 0.000 | 0.000 | 2.526 | 1014.504 | 0.043 | n/a | 0.198 | 0.000 | n/a | n/a | 0.091 | 4.549 | 0.004 | 0.091 | gw-r/thread-75/journal/page | none observed |
| b9798449a898950b0000000000000045 | 983.448 | 2.171 | n/a | 0.000 | 0.000 | 1.781 | 979.006 | 0.019 | n/a | 0.375 | 0.000 | n/a | n/a | 0.096 | 2.171 | 0.002 | 0.096 | gw-r/thread-48/journal/page | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 326.889 | n/a | n/a | n/a | 3.187 | n/a | 0.000 | 0.000 | 0.925 | 315.068 | 0.023 | n/a | 0.113 | 0.000 | n/a | n/a | 0.108 | 3.187 | 0.007 | 0.108 |
| p99 | 994.703 | n/a | n/a | n/a | 4.635 | n/a | 0.000 | 0.000 | 7.735 | 989.458 | 0.058 | n/a | 0.143 | 0.000 | n/a | n/a | 0.167 | 4.635 | 0.020 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000046 | 994.703 | 3.187 | n/a | 0.000 | 0.000 | 1.742 | 989.458 | 0.035 | n/a | 0.113 | 0.000 | n/a | n/a | 0.167 | 3.187 | 0.003 | 0.167 | gw-r/thread-66/journal/page | none observed |
| b9798449a898950b0000000000000049 | 430.414 | 3.017 | n/a | 0.000 | 0.000 | 0.891 | 426.274 | 0.016 | n/a | 0.108 | 0.000 | n/a | n/a | 0.108 | 3.017 | 0.007 | 0.108 | gw-r/thread-75/journal/page | none observed |
| b9798449a898950b0000000000000047 | 326.889 | 3.781 | n/a | 0.000 | 0.000 | 7.735 | 315.068 | 0.058 | n/a | 0.143 | 0.000 | n/a | n/a | 0.103 | 3.781 | 0.012 | 0.103 | gw-r/thread-65/journal/page | none observed |
| b9798449a898950b000000000000004b | 230.193 | 4.635 | n/a | 0.000 | 0.000 | 0.925 | 224.355 | 0.023 | n/a | 0.115 | 0.000 | n/a | n/a | 0.139 | 4.635 | 0.020 | 0.139 | gw-r/thread-49/journal/page | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 986.722 | n/a | n/a | n/a | 5.175 | n/a | 0.000 | 0.000 | 1.847 | 979.939 | 0.022 | n/a | 0.133 | 0.000 | n/a | n/a | 0.187 | 5.175 | 0.005 | 0.187 |
| p99 | 1002.721 | n/a | n/a | n/a | 7.338 | n/a | 0.000 | 0.000 | 3.495 | 994.538 | 0.028 | n/a | 0.162 | 0.000 | n/a | n/a | 0.224 | 7.338 | 0.019 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b000000000000004c | 1002.721 | 4.416 | n/a | 0.000 | 0.000 | 3.495 | 994.538 | 0.022 | n/a | 0.112 | 0.000 | n/a | n/a | 0.137 | 4.416 | 0.004 | 0.137 | gw-r/thread-68/journal/page | none observed |
| b9798449a898950b000000000000004d | 986.722 | 5.175 | n/a | 0.000 | 0.000 | 1.205 | 979.939 | 0.018 | n/a | 0.162 | 0.000 | n/a | n/a | 0.224 | 5.175 | 0.005 | 0.224 | gw-r/thread-44/journal/page | none observed |
| b9798449a898950b000000000000004e | 395.707 | 7.338 | n/a | 0.000 | 0.000 | 1.847 | 386.175 | 0.028 | n/a | 0.133 | 0.000 | n/a | n/a | 0.187 | 7.338 | 0.019 | 0.187 | gw-r/thread-74/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 693.441 | n/a | n/a | n/a | 5.687 | n/a | 0.000 | 0.000 | 2.260 | 684.341 | 0.026 | n/a | 0.133 | 0.000 | n/a | n/a | 0.197 | 5.687 | 0.009 | 0.197 |
| p99 | 854.217 | n/a | n/a | n/a | 6.532 | n/a | 0.000 | 0.000 | 2.400 | 848.683 | 2.728 | n/a | 0.247 | 0.000 | n/a | n/a | 0.238 | 6.532 | 0.083 | 0.238 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000053 | 854.217 | 3.693 | n/a | 0.000 | 0.000 | 1.444 | 848.683 | 0.026 | n/a | 0.247 | 0.000 | n/a | n/a | 0.124 | 3.693 | 0.004 | 0.124 | gw-r/thread-44/journal/page | none observed |
| b9798449a898950b0000000000000054 | 693.441 | 6.532 | n/a | 0.000 | 0.000 | 2.260 | 684.341 | 0.016 | n/a | 0.095 | 0.000 | n/a | n/a | 0.197 | 6.532 | 0.009 | 0.197 | gw-r/thread-48/journal/page | none observed |
| b9798449a898950b0000000000000052 | 68.799 | 5.687 | n/a | 0.000 | 0.000 | 2.400 | 57.614 | 2.728 | n/a | 0.133 | 0.000 | n/a | n/a | 0.238 | 5.687 | 0.083 | 0.238 | gw-r/thread-42/journal/page | none observed |

## P3 / grow3 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 357.140 | n/a | n/a | n/a | 5.332 | n/a | 0.000 | 0.000 | 1.051 | 280.421 | 0.023 | n/a | 0.119 | 0.000 | n/a | n/a | 8.382 | 5.332 | 0.106 | 8.382 |
| p99 | 1223.468 | n/a | n/a | n/a | 123.655 | n/a | 5.914 | 0.000 | 2.342 | 1084.315 | 0.032 | n/a | 0.182 | 0.000 | n/a | n/a | 39.831 | 129.568 | 0.283 | 39.831 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000058 | 1223.468 | 123.655 | n/a | 5.914 | 0.000 | 1.051 | 1084.315 | 0.032 | n/a | 0.119 | 0.000 | n/a | n/a | 8.382 | 129.568 | 0.106 | 8.382 | gw-r/thread-46/journal/page | none observed |
| b9798449a898950b000000000000005c | 385.712 | 95.427 | n/a | 4.963 | 0.000 | 1.266 | 280.421 | 0.032 | n/a | 0.182 | 0.000 | n/a | n/a | 3.420 | 100.391 | 0.260 | 3.420 | gw-r/thread-74/journal/page | none observed |
| b9798449a898950b0000000000000055 | 357.140 | 4.161 | n/a | 0.000 | 0.000 | 2.342 | 350.310 | 0.023 | n/a | 0.170 | 0.000 | n/a | n/a | 0.134 | 4.161 | 0.012 | 0.134 | gw-r/thread-64/journal/page | none observed |
| b9798449a898950b0000000000000057 | 44.382 | 4.092 | n/a | 0.000 | 0.000 | 0.459 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.831 | 4.092 | 0.092 | 39.831 | node-14/thread-2/socket.wait-first-byte | none observed |
| b9798449a898950b000000000000005a | 18.832 | 5.332 | n/a | 0.000 | 0.000 | 0.479 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.020 | 5.332 | 0.283 | 13.020 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h3 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 193.938 | n/a | n/a | n/a | 3.494 | n/a | 0.000 | 0.000 | 0.854 | 188.055 | 0.013 | n/a | 0.088 | 0.000 | n/a | n/a | 0.118 | 3.494 | 0.015 | 0.118 |
| p99 | 794.106 | n/a | n/a | n/a | 12.057 | n/a | 0.000 | 0.000 | 12.816 | 780.341 | 0.037 | n/a | 0.270 | 0.000 | n/a | n/a | 26.979 | 12.057 | 0.089 | 26.979 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000071 | 794.106 | 12.057 | n/a | 0.000 | 0.000 | 1.196 | 780.341 | 0.037 | n/a | 0.270 | 0.000 | n/a | n/a | 0.205 | 12.057 | 0.015 | 0.205 | gw-r/thread-46/journal/page | none observed |
| b9798449a898950b0000000000000073 | 600.690 | 9.138 | n/a | 0.000 | 0.000 | 12.816 | 578.499 | 0.023 | n/a | 0.115 | 0.000 | n/a | n/a | 0.098 | 9.138 | 0.015 | 0.098 | gw-r/thread-74/journal/page | none observed |
| b9798449a898950b0000000000000070 | 463.480 | 5.555 | n/a | 0.000 | 0.000 | 0.706 | 457.036 | 0.013 | n/a | 0.093 | 0.000 | n/a | n/a | 0.078 | 5.555 | 0.012 | 0.078 | gw-r/thread-71/journal/page | none observed |
| b9798449a898950b0000000000000069 | 222.135 | 2.212 | n/a | 0.000 | 0.000 | 0.854 | 218.715 | 0.022 | n/a | 0.232 | 0.000 | n/a | n/a | 0.100 | 2.212 | 0.010 | 0.100 | gw-r/thread-74/journal/page | none observed |
| b9798449a898950b000000000000006f | 193.938 | 4.567 | n/a | 0.000 | 0.000 | 1.151 | 188.055 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.120 | 4.567 | 0.024 | 0.120 | gw-r/thread-72/journal/page | none observed |
| b9798449a898950b0000000000000074 | 168.032 | 3.494 | n/a | 0.000 | 0.000 | 0.601 | 163.772 | 0.012 | n/a | 0.036 | 0.000 | n/a | n/a | 0.118 | 3.494 | 0.021 | 0.118 | gw-r/thread-68/journal/page | none observed |
| b9798449a898950b000000000000006c | 57.273 | 3.329 | n/a | 0.000 | 0.000 | 2.283 | 51.427 | 0.026 | n/a | 0.088 | 0.000 | n/a | n/a | 0.118 | 3.329 | 0.058 | 0.118 | gw-r/thread-64/journal/page | none observed |
| b9798449a898950b000000000000006a | 30.290 | 2.704 | n/a | 0.000 | 0.000 | 0.607 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.979 | 2.704 | 0.089 | 26.979 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 143.283 | n/a | n/a | n/a | 89.708 | n/a | 4.225 | 0.000 | 0.845 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.387 | 93.934 | 0.610 | 2.387 |
| p99 | 921.609 | n/a | n/a | n/a | 100.207 | n/a | 6.092 | 0.000 | 5.001 | 820.048 | 0.025 | n/a | 0.094 | 0.000 | n/a | n/a | 36.278 | 106.299 | 0.786 | 36.278 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000076 | 921.609 | 93.418 | n/a | 5.178 | 0.000 | 1.058 | 820.048 | 0.015 | n/a | 0.094 | 0.000 | n/a | n/a | 1.797 | 98.597 | 0.107 | 1.797 | gw-r/thread-64/journal/page | none observed |
| b9798449a898950b0000000000000079 | 206.334 | 89.708 | n/a | 4.225 | 0.000 | 2.913 | 108.093 | 0.025 | n/a | 0.094 | 0.000 | n/a | n/a | 1.276 | 93.934 | 0.455 | 1.276 | node-14/thread-2/replica.fetch-feed | none observed |
| b9798449a898950b000000000000007a | 154.399 | 90.306 | n/a | 3.929 | 0.000 | 0.845 | 56.832 | 0.019 | n/a | 0.081 | 0.000 | n/a | n/a | 2.387 | 94.236 | 0.610 | 2.387 | node-14/thread-2/replica.fetch-feed | none observed |
| b9798449a898950b000000000000007b | 143.283 | 100.207 | n/a | 6.092 | 0.000 | 0.706 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.278 | 106.299 | 0.742 | 36.278 | node-14/thread-2/replica.fetch-feed | none observed |
| b9798449a898950b0000000000000077 | 110.911 | 72.106 | n/a | 3.772 | 0.000 | 5.001 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.032 | 75.878 | 0.684 | 30.032 | node-14/thread-2/replica.fetch-feed | none observed |
| b9798449a898950b0000000000000078 | 110.001 | 82.080 | n/a | 4.341 | 0.000 | 0.703 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.876 | 86.421 | 0.786 | 22.876 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 513.359 | n/a | n/a | n/a | 2.751 | n/a | 0.000 | 0.000 | 1.523 | 502.917 | 0.047 | n/a | 0.096 | 0.000 | n/a | n/a | 0.143 | 2.751 | 0.016 | 0.143 |
| p99 | 1006.729 | n/a | n/a | n/a | 8.606 | n/a | 0.000 | 0.000 | 2.058 | 1002.192 | 0.068 | n/a | 0.224 | 0.000 | n/a | n/a | 2.123 | 8.606 | 0.462 | 2.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000087 | 1006.729 | 2.751 | n/a | 0.000 | 0.000 | 1.425 | 1002.192 | 0.068 | n/a | 0.224 | 0.000 | n/a | n/a | 0.069 | 2.751 | 0.003 | 0.069 | gw-r/thread-44/journal/page | none observed |
| b9798449a898950b0000000000000088 | 534.117 | 8.606 | n/a | 0.000 | 0.000 | 1.523 | 523.553 | 0.052 | n/a | 0.214 | 0.000 | n/a | n/a | 0.169 | 8.606 | 0.016 | 0.169 | gw-r/thread-73/journal/page | none observed |
| b9798449a898950b0000000000000082 | 513.359 | 8.126 | n/a | 0.000 | 0.000 | 2.058 | 502.917 | 0.020 | n/a | 0.095 | 0.000 | n/a | n/a | 0.143 | 8.126 | 0.016 | 0.143 | gw-r/thread-49/journal/page | none observed |
| b9798449a898950b0000000000000085 | 235.826 | 2.553 | n/a | 0.000 | 0.000 | 1.564 | 231.508 | 0.047 | n/a | 0.096 | 0.000 | n/a | n/a | 0.058 | 2.553 | 0.011 | 0.058 | gw-r/thread-71/journal/page | none observed |
| b9798449a898950b0000000000000084 | 4.927 | 2.274 | n/a | 0.000 | 0.000 | 0.530 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.123 | 2.274 | 0.462 | 2.123 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 471.900 | n/a | n/a | n/a | 2.607 | n/a | 0.000 | 0.000 | 0.950 | 466.259 | 0.014 | n/a | 0.100 | 0.000 | n/a | n/a | 0.066 | 2.607 | 0.006 | 0.066 |
| p99 | 659.226 | n/a | n/a | n/a | 5.345 | n/a | 0.000 | 0.000 | 2.905 | 652.735 | 0.031 | n/a | 0.134 | 0.000 | n/a | n/a | 0.082 | 5.345 | 0.012 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b000000000000008b | 659.226 | 5.345 | n/a | 0.000 | 0.000 | 0.950 | 652.735 | 0.019 | n/a | 0.115 | 0.000 | n/a | n/a | 0.063 | 5.345 | 0.008 | 0.063 | gw-r/thread-45/journal/page | none observed |
| b9798449a898950b000000000000008e | 584.404 | 1.799 | n/a | 0.000 | 0.000 | 2.268 | 580.106 | 0.031 | n/a | 0.134 | 0.000 | n/a | n/a | 0.066 | 1.799 | 0.003 | 0.066 | gw-r/thread-46/journal/page | none observed |
| b9798449a898950b000000000000008a | 471.900 | 2.607 | n/a | 0.000 | 0.000 | 2.905 | 466.259 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.082 | 2.607 | 0.006 | 0.082 | gw-r/thread-70/journal/page | none observed |
| b9798449a898950b000000000000008c | 330.634 | 3.974 | n/a | 0.000 | 0.000 | 0.845 | 325.632 | 0.014 | n/a | 0.100 | 0.000 | n/a | n/a | 0.069 | 3.974 | 0.012 | 0.069 | gw-r/thread-44/journal/page | none observed |

## P3 / sweep / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.586 | n/a | n/a | n/a | 1.997 | n/a | 0.000 | 0.000 | 0.332 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.394 | 1.997 | 0.107 | 15.394 |
| p99 | 31.995 | n/a | n/a | n/a | 6.675 | n/a | 0.000 | 0.000 | 0.388 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.932 | 6.675 | 0.264 | 24.932 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b9798449a898950b0000000000000095 | 31.995 | 6.675 | n/a | 0.000 | 0.000 | 0.388 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.932 | 6.675 | 0.209 | 24.932 | node-14/thread-2/socket.wait-first-byte | none observed |
| b9798449a898950b0000000000000091 | 22.125 | 1.839 | n/a | 0.000 | 0.000 | 0.313 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.973 | 1.839 | 0.083 | 19.973 | node-14/thread-2/socket.wait-first-byte | none observed |
| b9798449a898950b0000000000000094 | 21.820 | 2.260 | n/a | 0.000 | 0.000 | 0.366 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.194 | 2.260 | 0.104 | 19.194 | node-14/thread-2/socket.wait-first-byte | none observed |
| b9798449a898950b0000000000000093 | 19.534 | 1.743 | n/a | 0.000 | 0.000 | 0.321 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.469 | 1.743 | 0.089 | 17.469 | node-14/thread-2/socket.wait-first-byte | none observed |
| b9798449a898950b0000000000000090 | 17.586 | 1.885 | n/a | 0.000 | 0.000 | 0.307 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.394 | 1.885 | 0.107 | 15.394 | node-14/thread-2/socket.wait-first-byte | none observed |
| b9798449a898950b0000000000000092 | 16.125 | 1.997 | n/a | 0.000 | 0.000 | 0.366 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.763 | 1.997 | 0.124 | 13.763 | node-14/thread-2/socket.wait-first-byte | none observed |
| b9798449a898950b0000000000000096 | 15.281 | 3.285 | n/a | 0.000 | 0.000 | 0.368 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.628 | 3.285 | 0.215 | 11.628 | node-14/thread-2/socket.wait-first-byte | none observed |
| b9798449a898950b000000000000008f | 8.198 | 2.163 | n/a | 0.000 | 0.000 | 0.332 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.703 | 2.163 | 0.264 | 5.703 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.842 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.230 | 200.976 | 0.052 | n/a | 0.171 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 |
| p99 | 302.053 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 13.110 | 202.092 | 101.754 | n/a | 3.616 | 0.000 | n/a | n/a | 3.397 | 0.000 | 0.000 | 3.397 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000009 | 302.053 | 0.000 | n/a | 0.000 | 0.000 | 3.230 | 193.500 | 101.754 | n/a | 0.171 | 0.000 | n/a | n/a | 3.397 | 0.000 | 0.000 | 3.397 | gw-r/thread-47/journal/page | none observed |
| 85a4c558e217000d000000000000000a | 214.931 | 0.000 | n/a | 0.000 | 0.000 | 13.110 | 201.186 | 0.062 | n/a | 0.364 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-66/journal/page | none observed |
| 85a4c558e217000d0000000000000008 | 213.856 | 0.000 | n/a | 0.000 | 0.000 | 9.680 | 199.624 | 0.026 | n/a | 3.616 | 0.000 | n/a | n/a | 0.910 | 0.000 | 0.000 | 0.910 | gw-r/thread-44/journal/page | none observed |
| 85a4c558e217000d0000000000000010 | 205.099 | 0.000 | n/a | 0.000 | 0.000 | 3.292 | 201.365 | 0.116 | n/a | 0.205 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-69/journal/page | none observed |
| 85a4c558e217000d000000000000000e | 204.842 | 0.000 | n/a | 0.000 | 0.000 | 1.307 | 202.092 | 0.052 | n/a | 1.133 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-49/journal/page | none observed |
| 85a4c558e217000d000000000000000c | 203.815 | 0.000 | n/a | 0.000 | 0.000 | 2.116 | 201.375 | 0.024 | n/a | 0.167 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 85a4c558e217000d000000000000000d | 202.666 | 0.000 | n/a | 0.000 | 0.000 | 1.398 | 200.976 | 0.015 | n/a | 0.166 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-61/journal/page | none observed |
| 85a4c558e217000d000000000000000b | 105.954 | 0.000 | n/a | 0.000 | 0.000 | 3.530 | 93.594 | 8.553 | n/a | 0.131 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-46/journal/page | none observed |

## P3 / baseline / read (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.042 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.166 | 201.963 | 0.028 | n/a | 0.254 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 204.729 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.264 | 201.972 | 0.052 | n/a | 0.341 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000013 | 204.729 | 0.000 | n/a | 0.000 | 0.000 | 2.264 | 201.963 | 0.028 | n/a | 0.341 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 85a4c558e217000d0000000000000014 | 204.042 | 0.000 | n/a | 0.000 | 0.000 | 1.599 | 201.972 | 0.052 | n/a | 0.254 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-65/journal/page | none observed |
| 85a4c558e217000d0000000000000012 | 203.957 | 0.000 | n/a | 0.000 | 0.000 | 2.166 | 201.428 | 0.021 | n/a | 0.220 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 205.153 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.266 | 202.030 | 0.030 | n/a | 0.179 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 |
| p99 | 235.741 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 12.033 | 222.377 | 0.776 | n/a | 0.696 | 0.000 | n/a | n/a | 1.002 | 0.000 | 0.000 | 1.002 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000020 | 235.741 | 0.000 | n/a | 0.000 | 0.000 | 12.033 | 222.377 | 0.776 | n/a | 0.383 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-68/journal/page | none observed |
| 85a4c558e217000d0000000000000022 | 206.381 | 0.000 | n/a | 0.000 | 0.000 | 1.266 | 203.903 | 0.030 | n/a | 0.179 | 0.000 | n/a | n/a | 1.002 | 0.000 | 0.000 | 1.002 | gw-r/thread-67/journal/page | none observed |
| 85a4c558e217000d0000000000000021 | 205.153 | 0.000 | n/a | 0.000 | 0.000 | 2.167 | 202.030 | 0.076 | n/a | 0.696 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-66/journal/page | none observed |
| 85a4c558e217000d000000000000001f | 173.317 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 172.309 | 0.025 | n/a | 0.079 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-70/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.753 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 201.274 | 0.029 | n/a | 0.139 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 |
| p99 | 221.835 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.164 | 218.643 | 41.740 | n/a | 0.439 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d000000000000002b | 221.835 | 0.000 | n/a | 0.000 | 0.000 | 2.735 | 218.643 | 0.130 | n/a | 0.139 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-73/journal/page | none observed |
| 85a4c558e217000d0000000000000024 | 204.246 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 203.381 | 0.042 | n/a | 0.111 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-44/journal/page | none observed |
| 85a4c558e217000d0000000000000025 | 204.051 | 0.000 | n/a | 0.000 | 0.000 | 1.762 | 201.964 | 0.015 | n/a | 0.153 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-42/journal/page | none observed |
| 85a4c558e217000d000000000000002c | 203.053 | 0.000 | n/a | 0.000 | 0.000 | 0.992 | 201.421 | 0.028 | n/a | 0.439 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-74/journal/page | none observed |
| 85a4c558e217000d0000000000000029 | 202.757 | 0.000 | n/a | 0.000 | 0.000 | 1.077 | 201.274 | 0.023 | n/a | 0.190 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-49/journal/page | none observed |
| 85a4c558e217000d000000000000002d | 202.753 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 201.327 | 0.029 | n/a | 0.172 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-66/journal/page | none observed |
| 85a4c558e217000d0000000000000027 | 202.324 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 201.218 | 0.022 | n/a | 0.154 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-72/journal/page | none observed |
| 85a4c558e217000d0000000000000023 | 144.060 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 101.240 | 41.740 | n/a | 0.058 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-44/journal/page | none observed |
| 85a4c558e217000d0000000000000026 | 107.105 | 0.000 | n/a | 0.000 | 0.000 | 2.672 | 93.804 | 10.329 | n/a | 0.121 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| 85a4c558e217000d0000000000000028 | 76.642 | 0.000 | n/a | 0.000 | 0.000 | 5.164 | 64.438 | 6.844 | n/a | 0.075 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.041 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 200.917 | 0.031 | n/a | 0.126 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 220.313 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 18.360 | 202.840 | 16.634 | n/a | 0.287 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000030 | 220.313 | 0.000 | n/a | 0.000 | 0.000 | 18.360 | 201.696 | 0.017 | n/a | 0.135 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| 85a4c558e217000d0000000000000031 | 205.311 | 0.000 | n/a | 0.000 | 0.000 | 2.442 | 202.367 | 0.031 | n/a | 0.287 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-65/journal/page | none observed |
| 85a4c558e217000d0000000000000037 | 203.967 | 0.000 | n/a | 0.000 | 0.000 | 0.836 | 202.840 | 0.020 | n/a | 0.144 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-73/journal/page | none observed |
| 85a4c558e217000d0000000000000034 | 202.258 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 201.111 | 0.062 | n/a | 0.180 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-46/journal/page | none observed |
| 85a4c558e217000d0000000000000032 | 202.159 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 201.030 | 0.020 | n/a | 0.144 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-70/journal/page | none observed |
| 85a4c558e217000d0000000000000035 | 202.041 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 200.917 | 0.020 | n/a | 0.126 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 85a4c558e217000d000000000000002f | 167.169 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 165.982 | 0.015 | n/a | 0.122 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 85a4c558e217000d0000000000000039 | 152.574 | 0.000 | n/a | 0.000 | 0.000 | 1.651 | 145.936 | 4.656 | n/a | 0.066 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-68/journal/page | none observed |
| 85a4c558e217000d0000000000000038 | 92.464 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 74.749 | 16.634 | n/a | 0.069 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-74/journal/page | none observed |
| 85a4c558e217000d000000000000002e | 77.766 | 0.000 | n/a | 0.000 | 0.000 | 2.119 | 65.819 | 9.642 | n/a | 0.042 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-67/journal/page | none observed |
| 85a4c558e217000d0000000000000033 | 74.497 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 71.206 | 2.188 | n/a | 0.101 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-72/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.836 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.209 | 201.115 | 0.022 | n/a | 0.155 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 |
| p99 | 206.352 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.922 | 204.799 | 11.016 | n/a | 0.368 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d000000000000003c | 206.352 | 0.000 | n/a | 0.000 | 0.000 | 1.035 | 204.799 | 0.022 | n/a | 0.368 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-42/journal/page | none observed |
| 85a4c558e217000d000000000000003a | 206.129 | 0.000 | n/a | 0.000 | 0.000 | 4.922 | 200.939 | 0.022 | n/a | 0.133 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 85a4c558e217000d0000000000000042 | 205.974 | 0.000 | n/a | 0.000 | 0.000 | 1.242 | 204.259 | 0.030 | n/a | 0.169 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | gw-r/thread-69/journal/page | none observed |
| 85a4c558e217000d000000000000003f | 204.071 | 0.000 | n/a | 0.000 | 0.000 | 2.452 | 201.261 | 0.022 | n/a | 0.199 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-46/journal/page | none observed |
| 85a4c558e217000d000000000000003d | 203.185 | 0.000 | n/a | 0.000 | 0.000 | 1.683 | 201.115 | 0.044 | n/a | 0.219 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-65/journal/page | none observed |
| 85a4c558e217000d0000000000000040 | 202.836 | 0.000 | n/a | 0.000 | 0.000 | 1.209 | 201.328 | 0.021 | n/a | 0.133 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| 85a4c558e217000d0000000000000041 | 202.532 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 201.045 | 0.025 | n/a | 0.155 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-73/journal/page | none observed |
| 85a4c558e217000d000000000000003b | 202.461 | 0.000 | n/a | 0.000 | 0.000 | 1.001 | 201.146 | 0.021 | n/a | 0.134 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-64/journal/page | none observed |
| 85a4c558e217000d000000000000003e | 113.467 | 0.000 | n/a | 0.000 | 0.000 | 1.334 | 100.732 | 11.016 | n/a | 0.242 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-72/journal/page | none observed |
| 85a4c558e217000d0000000000000043 | 84.190 | 0.000 | n/a | 0.000 | 0.000 | 1.007 | 79.846 | 3.037 | n/a | 0.138 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-67/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.260 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.592 | 201.245 | 0.035 | n/a | 0.199 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 |
| p99 | 212.819 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.718 | 205.785 | 21.776 | n/a | 0.228 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000049 | 212.819 | 0.000 | n/a | 0.000 | 0.000 | 6.718 | 205.785 | 0.015 | n/a | 0.157 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| 85a4c558e217000d0000000000000045 | 206.440 | 0.000 | n/a | 0.000 | 0.000 | 4.584 | 201.521 | 0.031 | n/a | 0.139 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-70/journal/page | none observed |
| 85a4c558e217000d0000000000000047 | 205.294 | 0.000 | n/a | 0.000 | 0.000 | 3.470 | 201.450 | 0.039 | n/a | 0.207 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-64/journal/page | none observed |
| 85a4c558e217000d000000000000004c | 204.287 | 0.000 | n/a | 0.000 | 0.000 | 2.452 | 186.607 | 14.883 | n/a | 0.190 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-74/journal/page | none observed |
| 85a4c558e217000d0000000000000046 | 203.521 | 0.000 | n/a | 0.000 | 0.000 | 1.339 | 201.753 | 0.035 | n/a | 0.228 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-44/journal/page | none observed |
| 85a4c558e217000d000000000000004b | 203.260 | 0.000 | n/a | 0.000 | 0.000 | 1.545 | 201.245 | 0.041 | n/a | 0.222 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-71/journal/page | none observed |
| 85a4c558e217000d0000000000000044 | 203.201 | 0.000 | n/a | 0.000 | 0.000 | 1.592 | 201.180 | 0.022 | n/a | 0.210 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 85a4c558e217000d000000000000004d | 202.756 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.403 | 0.035 | n/a | 0.211 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-73/journal/page | none observed |
| 85a4c558e217000d000000000000004a | 86.264 | 0.000 | n/a | 0.000 | 0.000 | 1.075 | 63.129 | 21.776 | n/a | 0.049 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-72/journal/page | none observed |
| 85a4c558e217000d0000000000000048 | 78.599 | 0.000 | n/a | 0.000 | 0.000 | 1.602 | 67.018 | 9.600 | n/a | 0.199 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-42/journal/page | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.913 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.275 | 0.022 | n/a | 0.159 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 |
| p99 | 204.021 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.141 | 202.833 | 3.774 | n/a | 0.295 | 0.000 | n/a | n/a | 0.297 | 0.000 | 0.000 | 0.297 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000054 | 204.021 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 202.833 | 0.022 | n/a | 0.177 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-64/journal/page | none observed |
| 85a4c558e217000d0000000000000055 | 203.936 | 0.000 | n/a | 0.000 | 0.000 | 1.470 | 201.826 | 0.046 | n/a | 0.295 | 0.000 | n/a | n/a | 0.297 | 0.000 | 0.000 | 0.297 | gw-r/thread-66/journal/page | none observed |
| 85a4c558e217000d0000000000000059 | 203.859 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 202.688 | 0.021 | n/a | 0.119 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-75/journal/page | none observed |
| 85a4c558e217000d0000000000000050 | 203.358 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 201.937 | 0.033 | n/a | 0.253 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-61/journal/page | none observed |
| 85a4c558e217000d0000000000000057 | 203.105 | 0.000 | n/a | 0.000 | 0.000 | 1.493 | 201.275 | 0.014 | n/a | 0.159 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-65/journal/page | none observed |
| 85a4c558e217000d0000000000000056 | 202.913 | 0.000 | n/a | 0.000 | 0.000 | 1.352 | 201.120 | 0.051 | n/a | 0.226 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-42/journal/page | none observed |
| 85a4c558e217000d0000000000000051 | 202.661 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.358 | 0.018 | n/a | 0.151 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-67/journal/page | none observed |
| 85a4c558e217000d0000000000000052 | 202.645 | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.142 | 0.016 | n/a | 0.154 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-45/journal/page | none observed |
| 85a4c558e217000d000000000000004f | 202.000 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 200.825 | 0.018 | n/a | 0.110 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-47/journal/page | none observed |
| 85a4c558e217000d0000000000000053 | 106.715 | 0.000 | n/a | 0.000 | 0.000 | 2.141 | 104.092 | 0.104 | n/a | 0.227 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-70/journal/page | none observed |
| 85a4c558e217000d0000000000000058 | 85.431 | 0.000 | n/a | 0.000 | 0.000 | 1.738 | 79.696 | 3.774 | n/a | 0.069 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-71/journal/page | none observed |

## P3 / p4h1 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.209 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 201.369 | 0.026 | n/a | 0.187 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 |
| p99 | 209.994 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.674 | 208.154 | 2.911 | n/a | 0.269 | 0.000 | n/a | n/a | 0.467 | 0.000 | 0.000 | 0.467 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000060 | 209.994 | 0.000 | n/a | 0.000 | 0.000 | 1.377 | 208.154 | 0.122 | n/a | 0.182 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-46/journal/page | none observed |
| 85a4c558e217000d0000000000000061 | 204.638 | 0.000 | n/a | 0.000 | 0.000 | 1.004 | 202.993 | 0.091 | n/a | 0.269 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | gw-r/thread-72/journal/page | none observed |
| 85a4c558e217000d0000000000000069 | 203.650 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 202.470 | 0.062 | n/a | 0.187 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-69/journal/page | none observed |
| 85a4c558e217000d0000000000000064 | 203.274 | 0.000 | n/a | 0.000 | 0.000 | 1.492 | 201.369 | 0.026 | n/a | 0.196 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-71/journal/page | none observed |
| 85a4c558e217000d000000000000005f | 203.229 | 0.000 | n/a | 0.000 | 0.000 | 1.425 | 201.192 | 0.019 | n/a | 0.126 | 0.000 | n/a | n/a | 0.467 | 0.000 | 0.000 | 0.467 | gw-r/thread-70/journal/page | none observed |
| 85a4c558e217000d0000000000000068 | 203.209 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 201.873 | 0.026 | n/a | 0.209 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-61/journal/page | none observed |
| 85a4c558e217000d0000000000000067 | 203.145 | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 201.617 | 0.041 | n/a | 0.190 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 | gw-r/thread-74/journal/page | none observed |
| 85a4c558e217000d0000000000000063 | 203.097 | 0.000 | n/a | 0.000 | 0.000 | 1.389 | 201.342 | 0.017 | n/a | 0.196 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-65/journal/page | none observed |
| 85a4c558e217000d0000000000000065 | 202.653 | 0.000 | n/a | 0.000 | 0.000 | 1.073 | 201.245 | 0.023 | n/a | 0.155 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-75/journal/page | none observed |
| 85a4c558e217000d0000000000000066 | 188.739 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 184.318 | 2.911 | n/a | 0.105 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-73/journal/page | none observed |
| 85a4c558e217000d0000000000000062 | 159.888 | 0.000 | n/a | 0.000 | 0.000 | 6.674 | 152.558 | 0.024 | n/a | 0.184 | 0.000 | n/a | n/a | 0.448 | 0.000 | 0.000 | 0.448 | gw-r/thread-66/journal/page | none observed |

## P3 / grow3 / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.102 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.153 | 200.997 | 0.061 | n/a | 0.194 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 |
| p99 | 412.837 | n/a | n/a | n/a | 0.719 | n/a | 0.000 | 0.000 | 4.807 | 201.825 | 226.874 | n/a | 0.288 | 0.000 | n/a | n/a | 0.305 | 0.719 | 0.008 | 0.305 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000071 | 412.837 | 0.655 | n/a | 0.000 | 0.000 | 0.758 | 184.365 | 226.874 | n/a | 0.065 | 0.000 | n/a | n/a | 0.121 | 0.655 | 0.002 | 0.121 | gw-r/thread-42/gateway.admission-wait | none observed |
| 85a4c558e217000d000000000000006f | 207.141 | 0.000 | n/a | 0.000 | 0.000 | 4.807 | 201.679 | 0.061 | n/a | 0.288 | 0.000 | n/a | n/a | 0.305 | 0.000 | 0.000 | 0.305 | gw-r/thread-45/journal/page | none observed |
| 85a4c558e217000d000000000000006b | 203.690 | 0.000 | n/a | 0.000 | 0.000 | 1.361 | 201.825 | 0.056 | n/a | 0.264 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-67/journal/page | none observed |
| 85a4c558e217000d0000000000000074 | 203.272 | 0.000 | n/a | 0.000 | 0.000 | 1.141 | 201.745 | 0.061 | n/a | 0.200 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-73/journal/page | none observed |
| 85a4c558e217000d0000000000000070 | 203.102 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 201.811 | 0.037 | n/a | 0.194 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-66/journal/page | none observed |
| 85a4c558e217000d000000000000006e | 202.600 | 0.000 | n/a | 0.000 | 0.000 | 1.153 | 200.997 | 0.036 | n/a | 0.196 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-72/journal/page | none observed |
| 85a4c558e217000d000000000000006c | 128.897 | 0.000 | n/a | 0.000 | 0.000 | 1.172 | 124.907 | 2.539 | n/a | 0.085 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-49/journal/page | none observed |
| 85a4c558e217000d0000000000000075 | 91.875 | 0.719 | n/a | 0.000 | 0.000 | 1.790 | 54.766 | 34.277 | n/a | 0.188 | 0.000 | n/a | n/a | 0.135 | 0.719 | 0.008 | 0.135 | gw-r/thread-61/journal/page | none observed |

## P3 / p4h3 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.067 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 200.988 | 0.021 | n/a | 0.121 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 |
| p99 | 204.620 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.788 | 202.376 | 9.575 | n/a | 0.733 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d000000000000008b | 204.620 | 0.000 | n/a | 0.000 | 0.000 | 2.366 | 201.831 | 0.038 | n/a | 0.213 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-73/journal/page | none observed |
| 85a4c558e217000d0000000000000089 | 204.395 | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 202.376 | 0.029 | n/a | 0.733 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-75/journal/page | none observed |
| 85a4c558e217000d000000000000008a | 203.620 | 0.000 | n/a | 0.000 | 0.000 | 1.716 | 201.560 | 0.030 | n/a | 0.202 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 85a4c558e217000d0000000000000081 | 202.841 | 0.000 | n/a | 0.000 | 0.000 | 1.329 | 201.165 | 0.017 | n/a | 0.194 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-69/journal/page | none observed |
| 85a4c558e217000d000000000000008d | 202.656 | 0.000 | n/a | 0.000 | 0.000 | 1.155 | 201.115 | 0.021 | n/a | 0.146 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-61/journal/page | none observed |
| 85a4c558e217000d000000000000008e | 202.468 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 200.990 | 0.014 | n/a | 0.132 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-69/journal/page | none observed |
| 85a4c558e217000d0000000000000086 | 202.067 | 0.000 | n/a | 0.000 | 0.000 | 0.822 | 200.988 | 0.018 | n/a | 0.121 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 85a4c558e217000d0000000000000087 | 201.931 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 200.865 | 0.015 | n/a | 0.118 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-66/journal/page | none observed |
| 85a4c558e217000d0000000000000085 | 188.434 | 0.000 | n/a | 0.000 | 0.000 | 4.116 | 184.016 | 0.021 | n/a | 0.093 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-70/journal/page | none observed |
| 85a4c558e217000d0000000000000090 | 162.889 | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 161.346 | 0.017 | n/a | 0.107 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-67/journal/page | none observed |
| 85a4c558e217000d000000000000008f | 141.798 | 0.000 | n/a | 0.000 | 0.000 | 4.788 | 136.746 | 0.027 | n/a | 0.114 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-65/journal/page | none observed |
| 85a4c558e217000d0000000000000080 | 121.861 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 111.082 | 9.575 | n/a | 0.105 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-61/journal/page | none observed |
| 85a4c558e217000d000000000000008c | 109.346 | 0.000 | n/a | 0.000 | 0.000 | 3.640 | 101.266 | 4.220 | n/a | 0.064 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-47/journal/page | none observed |

## P3 / grow10 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 183.505 | n/a | n/a | n/a | 0.504 | n/a | 0.000 | 0.000 | 1.008 | 182.202 | 0.024 | n/a | 0.126 | 0.000 | n/a | n/a | 0.170 | 0.504 | 0.001 | 0.170 |
| p99 | 363.081 | n/a | n/a | n/a | 0.937 | n/a | 0.000 | 0.000 | 3.877 | 210.408 | 150.881 | n/a | 0.355 | 0.000 | n/a | n/a | 50.017 | 0.937 | 0.010 | 50.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d0000000000000093 | 363.081 | 0.513 | n/a | 0.000 | 0.000 | 1.008 | 210.408 | 150.881 | n/a | 0.157 | 0.000 | n/a | n/a | 0.115 | 0.513 | 0.001 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 85a4c558e217000d0000000000000092 | 203.066 | 0.000 | n/a | 0.000 | 0.000 | 1.485 | 201.054 | 0.030 | n/a | 0.355 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-72/journal/page | none observed |
| 85a4c558e217000d0000000000000091 | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 200.934 | 0.024 | n/a | 0.119 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-70/journal/page | none observed |
| 85a4c558e217000d0000000000000097 | 183.505 | 0.504 | n/a | 0.000 | 0.000 | 0.512 | 182.202 | 0.030 | n/a | 0.154 | 0.000 | n/a | n/a | 0.103 | 0.504 | 0.003 | 0.103 | gw-r/thread-42/journal/page | none observed |
| 85a4c558e217000d0000000000000098 | 112.966 | 0.937 | n/a | 0.000 | 0.000 | 1.719 | 110.000 | 0.015 | n/a | 0.126 | 0.000 | n/a | n/a | 0.170 | 0.937 | 0.008 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 85a4c558e217000d0000000000000099 | 77.315 | 0.743 | n/a | 0.000 | 0.000 | 3.877 | 72.342 | 0.018 | n/a | 0.122 | 0.000 | n/a | n/a | 0.213 | 0.743 | 0.010 | 0.213 | gw-r/thread-69/journal/page | none observed |
| 85a4c558e217000d000000000000009a | 50.556 | 0.000 | n/a | 0.000 | 0.000 | 0.539 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.017 | 0.000 | 0.000 | 50.017 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / p4h10 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.633 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.099 | 200.920 | 0.019 | n/a | 0.142 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 204.857 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.302 | 201.980 | 5.109 | n/a | 0.261 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d00000000000000ae | 204.857 | 0.000 | n/a | 0.000 | 0.000 | 3.302 | 201.195 | 0.013 | n/a | 0.175 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-47/journal/page | none observed |
| 85a4c558e217000d00000000000000b0 | 203.536 | 0.000 | n/a | 0.000 | 0.000 | 2.346 | 200.920 | 0.018 | n/a | 0.132 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 85a4c558e217000d00000000000000b1 | 203.509 | 0.000 | n/a | 0.000 | 0.000 | 1.112 | 201.980 | 0.096 | n/a | 0.176 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 85a4c558e217000d00000000000000ac | 203.169 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 201.938 | 0.019 | n/a | 0.184 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-72/journal/page | none observed |
| 85a4c558e217000d00000000000000a9 | 203.137 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 201.745 | 0.066 | n/a | 0.261 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-70/journal/page | none observed |
| 85a4c558e217000d00000000000000ad | 202.903 | 0.000 | n/a | 0.000 | 0.000 | 1.099 | 201.516 | 0.013 | n/a | 0.129 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-64/journal/page | none observed |
| 85a4c558e217000d00000000000000a6 | 202.633 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 201.168 | 0.041 | n/a | 0.142 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-69/journal/page | none observed |
| 85a4c558e217000d00000000000000ab | 201.927 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 200.769 | 0.016 | n/a | 0.144 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-66/journal/page | none observed |
| 85a4c558e217000d00000000000000a5 | 201.859 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 200.870 | 0.016 | n/a | 0.138 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-61/journal/page | none observed |
| 85a4c558e217000d00000000000000af | 110.879 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 108.180 | 1.535 | n/a | 0.146 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-42/journal/page | none observed |
| 85a4c558e217000d00000000000000b2 | 78.424 | 0.000 | n/a | 0.000 | 0.000 | 1.989 | 70.850 | 5.109 | n/a | 0.140 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | gw-r/thread-61/journal/page | none observed |
| 85a4c558e217000d00000000000000a7 | 56.893 | 0.000 | n/a | 0.000 | 0.000 | 1.316 | 53.635 | 1.681 | n/a | 0.069 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-74/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.213 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 201.016 | 0.030 | n/a | 0.165 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 210.907 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.681 | 204.809 | 4.474 | n/a | 4.805 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a4c558e217000d00000000000000b4 | 210.907 | 0.000 | n/a | 0.000 | 0.000 | 4.802 | 201.016 | 0.081 | n/a | 4.805 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-68/journal/page | none observed |
| 85a4c558e217000d00000000000000b3 | 209.268 | 0.000 | n/a | 0.000 | 0.000 | 4.029 | 204.809 | 0.037 | n/a | 0.208 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-67/journal/page | none observed |
| 85a4c558e217000d00000000000000bc | 205.619 | 0.000 | n/a | 0.000 | 0.000 | 1.074 | 204.165 | 0.022 | n/a | 0.164 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-49/journal/page | none observed |
| 85a4c558e217000d00000000000000b9 | 205.598 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 204.479 | 0.021 | n/a | 0.177 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 85a4c558e217000d00000000000000b7 | 204.970 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 203.859 | 0.054 | n/a | 0.177 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-72/journal/page | none observed |
| 85a4c558e217000d00000000000000b6 | 202.213 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 200.952 | 0.025 | n/a | 0.134 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-75/journal/page | none observed |
| 85a4c558e217000d00000000000000bb | 202.210 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 201.258 | 0.030 | n/a | 0.165 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-74/journal/page | none observed |
| 85a4c558e217000d00000000000000b8 | 201.755 | 0.000 | n/a | 0.000 | 0.000 | 0.970 | 200.534 | 0.022 | n/a | 0.101 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-64/journal/page | none observed |
| 85a4c558e217000d00000000000000bd | 134.441 | 0.000 | n/a | 0.000 | 0.000 | 7.681 | 121.811 | 4.474 | n/a | 0.229 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-48/journal/page | none observed |
| 85a4c558e217000d00000000000000ba | 102.892 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 99.657 | 2.223 | n/a | 0.046 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-42/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

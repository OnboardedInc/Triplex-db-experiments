# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (233.266 ms, trace `476f09e0db7f059000000000000000c8`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (183.757 ms, trace `476f09e0db7f05900000000000000059`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (137.897 ms, trace `476f09e0db7f05900000000000000060`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (111.828 ms, trace `476f09e0db7f059000000000000000a1`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (62.529 ms, trace `476f09e0db7f059000000000000000e3`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-smoke-j`; source `647da7a8545c6ff0acd545de48fde57601c3de71`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 81/81 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 81/81. Raw trace bytes: 732204.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 104 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1411.411 | 175.206 | 289.419 | 39 |
| baseline | 0 | 1976.223 | 63.103 | 9.908 | 30 |
| L1 | 1 | 1977.281 | 178.933 | 20.412 | 44 |
| L4 | 4 | 1936.779 | 239.977 | 234.538 | 44 |
| L16 | 16 | 1970.124 | 202.987 | 226.352 | 44 |
| L64 | 16 | 1937.051 | 213.765 | 235.401 | 44 |
| L256 | 16 | 1890.855 | 167.750 | 189.268 | 58 |
| L1024 | 16 | 1887.347 | 241.164 | 312.105 | 16 |
| recovery | 16 | 1961.499 | 216.071 | 244.293 | 44 |
| p4mix | 1 | 1956.145 | 39.823 | 25.718 | 38 |
| p4h1 | 1 | 1834.593 | 33.184 | 21.265 | 30 |
| grow3 | 0 | 272.621 | 58.289 | 0.018 | 22 |
| p4h3 | 1 | 2488.490 | 66.172 | 37.304 | 133 |
| grow10 | 0 | 992.632 | 338.651 | 60.816 | 13 |
| p4h10 | 1 | 2014.830 | 49.410 | 35.762 | 49 |
| presweep | 16 | 1869.489 | 184.662 | 279.209 | 53 |
| sweep | 16 | 121.009 | 31.099 | 31.796 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 476f09e0db7f059000000000000000c8 | driver.queue.scheduler-late | 0.395 | none | 0 / 32 |
| 476f09e0db7f059000000000000000c8 | driver.queue.scheduler-dispatch | 0.135 | none | 0 / 32 |

Observed active steps while trace 476f09e0db7f059000000000000000c8 waited: []

| 476f09e0db7f05900000000000000059 | driver.queue.scheduler-dispatch | 0.080 | none | 0 / 32 |
| 476f09e0db7f05900000000000000059 | driver.queue.scheduler-late | 0.049 | none | 0 / 32 |

Observed active steps while trace 476f09e0db7f05900000000000000059 waited: []

| 476f09e0db7f05900000000000000060 | driver.queue.scheduler-late | 0.128 | none | 0 / 32 |
| 476f09e0db7f05900000000000000060 | driver.queue.scheduler-dispatch | 0.050 | none | 0 / 32 |

Observed active steps while trace 476f09e0db7f05900000000000000060 waited: []

| 476f09e0db7f059000000000000000a1 | driver.queue.scheduler-dispatch | 0.038 | none | 0 / 32 |
| 476f09e0db7f059000000000000000a1 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 476f09e0db7f059000000000000000a1 waited: []

| 476f09e0db7f059000000000000000e3 | driver.queue.scheduler-dispatch | 0.005 | none | 9 / 32 |

Observed active steps while trace 476f09e0db7f059000000000000000e3 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.647 | 0.000 | 0.000 | 0.395 | 7.203 | 0.009 | 0.000 | 0.078 | 3.229 | 3.779 | 0.058 | n/a | 1.669 | 11.991 | n/a | n/a | 0.057 | 8.791 | 0.268 | 0.057 |
| p99 | 52.256 | 3.645 | 2.782 | 6.407 | 20.163 | 1.520 | 0.000 | 1.003 | 3.646 | 12.248 | 0.306 | n/a | 7.591 | 15.005 | n/a | n/a | 1.162 | 20.702 | 0.396 | 1.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000039 | 52.256 | 20.163 | 0.461 | 0.000 | 0.078 | 3.229 | 12.248 | 0.306 | n/a | 1.669 | 14.046 | n/a | n/a | 0.057 | 20.702 | 0.396 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000037 | 46.029 | 11.324 | 0.009 | 0.000 | 1.003 | 3.646 | 10.772 | 0.058 | n/a | 3.050 | 15.005 | n/a | n/a | 1.162 | 12.336 | 0.268 | 1.162 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000003b | 27.647 | 3.473 | 0.006 | 0.000 | 0.758 | 1.374 | 2.296 | 0.102 | n/a | 7.591 | 11.991 | n/a | n/a | 0.056 | 4.237 | 0.153 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000003d | 24.847 | 7.203 | 1.520 | 0.000 | 0.067 | 3.355 | 3.779 | 0.048 | n/a | 0.832 | 7.978 | n/a | n/a | 0.063 | 8.791 | 0.354 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.647 | 0.806 | 0.005 | 1.739 | 3.473 | 0.006 | 0.000 | 0.758 | 1.374 | 2.296 | 0.102 | n/a | 7.591 | 11.991 | n/a | n/a | 0.056 | 4.237 | 0.153 | 0.056 |
| p99 | 27.647 | 0.806 | 0.005 | 1.739 | 3.473 | 0.006 | 0.000 | 0.758 | 1.374 | 2.296 | 0.102 | n/a | 7.591 | 11.991 | n/a | n/a | 0.056 | 4.237 | 0.153 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f0590000000000000003b | 27.647 | 3.473 | 0.006 | 0.000 | 0.758 | 1.374 | 2.296 | 0.102 | n/a | 7.591 | 11.991 | n/a | n/a | 0.056 | 4.237 | 0.153 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.238 | 0.389 | 0.000 | 0.447 | 4.158 | 0.202 | 0.000 | 0.112 | 2.318 | 3.453 | 0.047 | n/a | 0.814 | 12.259 | n/a | n/a | 0.169 | 4.472 | 0.192 | 0.169 |
| p99 | 30.732 | 0.982 | 0.000 | 1.771 | 5.454 | 0.242 | 0.000 | 0.610 | 3.659 | 4.473 | 0.051 | n/a | 0.868 | 20.543 | n/a | n/a | 0.181 | 5.771 | 0.250 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f0590000000000000003f | 30.732 | 3.726 | 0.006 | 0.000 | 0.610 | 0.841 | 4.473 | 0.042 | n/a | 0.310 | 20.543 | n/a | n/a | 0.181 | 4.341 | 0.141 | 0.181 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000041 | 23.238 | 4.158 | 0.202 | 0.000 | 0.112 | 2.318 | 3.178 | 0.051 | n/a | 0.868 | 12.259 | n/a | n/a | 0.091 | 4.472 | 0.192 | 0.091 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000043 | 23.106 | 5.454 | 0.242 | 0.000 | 0.076 | 3.659 | 3.453 | 0.047 | n/a | 0.814 | 9.193 | n/a | n/a | 0.169 | 5.771 | 0.250 | 0.169 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.732 | 0.982 | 0.000 | 1.771 | 3.726 | 0.006 | 0.000 | 0.610 | 0.841 | 4.473 | 0.042 | n/a | 0.310 | 20.543 | n/a | n/a | 0.181 | 4.341 | 0.141 | 0.181 |
| p99 | 30.732 | 0.982 | 0.000 | 1.771 | 3.726 | 0.006 | 0.000 | 0.610 | 0.841 | 4.473 | 0.042 | n/a | 0.310 | 20.543 | n/a | n/a | 0.181 | 4.341 | 0.141 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f0590000000000000003f | 30.732 | 3.726 | 0.006 | 0.000 | 0.610 | 0.841 | 4.473 | 0.042 | n/a | 0.310 | 20.543 | n/a | n/a | 0.181 | 4.341 | 0.141 | 0.181 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.288 | 0.255 | 0.000 | 0.839 | 4.221 | 0.008 | 0.365 | 0.169 | 1.368 | 3.300 | 0.048 | n/a | 0.571 | 11.526 | n/a | n/a | 0.052 | 5.303 | 0.228 | 0.052 |
| p99 | 63.634 | 2.896 | 0.042 | 3.476 | 9.232 | 0.276 | 0.816 | 1.022 | 2.656 | 11.925 | 0.116 | n/a | 1.676 | 44.960 | n/a | n/a | 0.083 | 10.461 | 0.318 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f0590000000000000004c | 63.634 | 4.221 | 0.178 | 0.000 | 0.169 | 1.447 | 11.925 | 0.116 | n/a | 0.571 | 44.960 | n/a | n/a | 0.046 | 4.568 | 0.072 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000046 | 32.847 | 9.232 | 0.005 | 0.635 | 0.589 | 2.656 | 5.589 | 0.115 | n/a | 1.139 | 12.836 | n/a | n/a | 0.052 | 10.461 | 0.318 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000049 | 23.288 | 4.574 | 0.276 | 0.365 | 0.088 | 1.368 | 3.300 | 0.048 | n/a | 1.676 | 11.526 | n/a | n/a | 0.067 | 5.303 | 0.228 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000044 | 19.970 | 3.855 | 0.008 | 0.816 | 1.022 | 0.943 | 1.825 | 0.038 | n/a | 0.313 | 11.066 | n/a | n/a | 0.083 | 5.702 | 0.286 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.970 | 0.255 | 0.042 | 1.602 | 3.855 | 0.008 | 0.816 | 1.022 | 0.943 | 1.825 | 0.038 | n/a | 0.313 | 11.066 | n/a | n/a | 0.083 | 5.702 | 0.286 | 0.083 |
| p99 | 19.970 | 0.255 | 0.042 | 1.602 | 3.855 | 0.008 | 0.816 | 1.022 | 0.943 | 1.825 | 0.038 | n/a | 0.313 | 11.066 | n/a | n/a | 0.083 | 5.702 | 0.286 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000044 | 19.970 | 3.855 | 0.008 | 0.816 | 1.022 | 0.943 | 1.825 | 0.038 | n/a | 0.313 | 11.066 | n/a | n/a | 0.083 | 5.702 | 0.286 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.892 | 0.181 | 0.000 | 0.732 | 5.454 | 0.010 | 0.392 | 0.118 | 0.896 | 3.180 | 0.044 | n/a | 0.371 | 18.828 | n/a | n/a | 0.047 | 6.190 | 0.200 | 0.047 |
| p99 | 69.438 | 3.676 | 4.359 | 9.104 | 12.371 | 0.281 | 1.250 | 0.969 | 4.300 | 11.216 | 0.116 | n/a | 4.918 | 39.315 | n/a | n/a | 0.054 | 13.946 | 0.293 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000052 | 69.438 | 9.210 | 0.189 | 0.000 | 0.118 | 4.300 | 11.216 | 0.116 | n/a | 4.918 | 39.315 | n/a | n/a | 0.054 | 9.517 | 0.137 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000004d | 47.659 | 12.371 | 0.010 | 1.250 | 0.316 | 0.896 | 3.959 | 0.043 | n/a | 0.298 | 28.470 | n/a | n/a | 0.047 | 13.946 | 0.293 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000055 | 30.892 | 5.454 | 0.281 | 0.392 | 0.062 | 2.192 | 3.180 | 0.079 | n/a | 0.371 | 18.828 | n/a | n/a | 0.053 | 6.190 | 0.200 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000050 | 22.789 | 4.108 | 0.005 | 0.544 | 0.969 | 0.880 | 2.910 | 0.044 | n/a | 1.734 | 11.548 | n/a | n/a | 0.046 | 5.627 | 0.247 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 63.667 | 0.528 | 0.000 | 0.588 | 4.929 | 0.009 | 0.000 | 0.101 | 2.460 | 8.077 | 0.076 | n/a | 0.506 | 29.015 | n/a | n/a | 0.045 | 5.066 | 0.058 | 0.045 |
| p99 | 228.470 | 1.182 | 0.000 | 2.005 | 6.636 | 0.761 | 0.275 | 0.601 | 4.695 | 34.677 | 1.921 | n/a | 0.767 | 183.757 | n/a | n/a | 0.073 | 7.760 | 0.175 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000059 | 228.470 | 4.929 | 0.009 | 0.000 | 0.128 | 4.187 | 34.677 | 0.072 | n/a | 0.666 | 183.757 | n/a | n/a | 0.045 | 5.066 | 0.022 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000005b | 72.475 | 3.622 | 0.006 | 0.000 | 0.601 | 0.956 | 6.419 | 1.921 | n/a | 0.506 | 58.399 | n/a | n/a | 0.045 | 4.228 | 0.058 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000005e | 63.667 | 6.636 | 0.761 | 0.261 | 0.101 | 4.695 | 21.262 | 0.095 | n/a | 0.767 | 29.015 | n/a | n/a | 0.073 | 7.760 | 0.122 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000057 | 30.991 | 4.967 | 0.132 | 0.275 | 0.063 | 2.460 | 8.077 | 0.076 | n/a | 0.320 | 14.568 | n/a | n/a | 0.054 | 5.436 | 0.175 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.475 | 0.528 | 0.000 | 1.722 | 3.622 | 0.006 | 0.000 | 0.128 | 0.956 | 6.419 | 0.072 | n/a | 0.506 | 58.399 | n/a | n/a | 0.045 | 4.228 | 0.022 | 0.045 |
| p99 | 228.470 | 1.182 | 0.000 | 2.005 | 4.929 | 0.009 | 0.000 | 0.601 | 4.187 | 34.677 | 1.921 | n/a | 0.666 | 183.757 | n/a | n/a | 0.045 | 5.066 | 0.058 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000059 | 228.470 | 4.929 | 0.009 | 0.000 | 0.128 | 4.187 | 34.677 | 0.072 | n/a | 0.666 | 183.757 | n/a | n/a | 0.045 | 5.066 | 0.022 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000005b | 72.475 | 3.622 | 0.006 | 0.000 | 0.601 | 0.956 | 6.419 | 1.921 | n/a | 0.506 | 58.399 | n/a | n/a | 0.045 | 4.228 | 0.058 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 62.208 | 0.463 | 0.000 | 0.781 | 5.744 | 0.009 | 0.000 | 0.061 | 1.868 | 13.500 | 0.123 | n/a | 0.513 | 30.639 | n/a | n/a | 0.047 | 6.457 | 0.079 | 0.047 |
| p99 | 160.939 | 1.702 | 0.393 | 3.557 | 7.318 | 2.624 | 0.300 | 0.461 | 3.250 | 29.121 | 0.240 | n/a | 1.825 | 137.897 | n/a | n/a | 0.064 | 8.644 | 0.133 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000060 | 160.939 | 7.318 | 0.009 | 0.000 | 0.178 | 1.554 | 13.500 | 0.132 | n/a | 0.303 | 137.897 | n/a | n/a | 0.047 | 7.505 | 0.047 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000067 | 109.924 | 5.744 | 2.624 | 0.223 | 0.053 | 3.250 | 22.304 | 0.123 | n/a | 1.825 | 73.727 | n/a | n/a | 0.052 | 8.644 | 0.079 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000062 | 62.208 | 4.580 | 0.721 | 0.300 | 0.061 | 1.868 | 29.121 | 0.109 | n/a | 0.513 | 24.892 | n/a | n/a | 0.043 | 5.662 | 0.091 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000064 | 48.584 | 5.991 | 0.005 | 0.000 | 0.461 | 3.201 | 7.041 | 0.240 | n/a | 0.942 | 30.639 | n/a | n/a | 0.064 | 6.457 | 0.133 | 0.064 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.584 | 1.702 | 0.000 | 3.557 | 5.991 | 0.005 | 0.000 | 0.461 | 3.201 | 7.041 | 0.240 | n/a | 0.942 | 30.639 | n/a | n/a | 0.064 | 6.457 | 0.133 | 0.064 |
| p99 | 48.584 | 1.702 | 0.000 | 3.557 | 5.991 | 0.005 | 0.000 | 0.461 | 3.201 | 7.041 | 0.240 | n/a | 0.942 | 30.639 | n/a | n/a | 0.064 | 6.457 | 0.133 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000064 | 48.584 | 5.991 | 0.005 | 0.000 | 0.461 | 3.201 | 7.041 | 0.240 | n/a | 0.942 | 30.639 | n/a | n/a | 0.064 | 6.457 | 0.133 | 0.064 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.380 | 0.588 | 0.000 | 1.649 | 3.892 | 0.009 | 0.000 | 0.194 | 2.020 | 5.476 | 0.050 | n/a | 0.650 | 21.858 | n/a | n/a | 0.040 | 4.380 | 0.146 | 0.040 |
| p99 | 113.559 | 1.484 | 0.000 | 1.871 | 6.391 | 0.432 | 0.438 | 0.455 | 3.899 | 23.677 | 0.147 | n/a | 1.142 | 82.359 | n/a | n/a | 0.052 | 7.048 | 0.260 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000072 | 113.559 | 3.869 | 0.432 | 0.000 | 0.079 | 2.047 | 23.677 | 0.147 | n/a | 0.910 | 82.359 | n/a | n/a | 0.040 | 4.380 | 0.039 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000006b | 54.723 | 6.391 | 0.162 | 0.438 | 0.057 | 2.020 | 14.316 | 0.058 | n/a | 0.341 | 30.903 | n/a | n/a | 0.039 | 7.048 | 0.129 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000068 | 32.380 | 4.300 | 0.009 | 0.000 | 0.427 | 3.899 | 1.498 | 0.050 | n/a | 0.289 | 21.858 | n/a | n/a | 0.051 | 4.736 | 0.146 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000070 | 22.318 | 3.892 | 0.008 | 0.000 | 0.455 | 0.961 | 5.476 | 0.035 | n/a | 1.142 | 10.295 | n/a | n/a | 0.052 | 4.355 | 0.195 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000006e | 14.414 | 3.550 | 0.005 | 0.000 | 0.194 | 1.081 | 1.479 | 0.038 | n/a | 0.650 | 7.381 | n/a | n/a | 0.036 | 3.749 | 0.260 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.318 | 0.785 | 0.000 | 1.659 | 3.892 | 0.008 | 0.000 | 0.427 | 1.081 | 1.498 | 0.038 | n/a | 0.650 | 10.295 | n/a | n/a | 0.051 | 4.355 | 0.195 | 0.051 |
| p99 | 32.380 | 1.484 | 0.000 | 1.871 | 4.300 | 0.009 | 0.000 | 0.455 | 3.899 | 5.476 | 0.050 | n/a | 1.142 | 21.858 | n/a | n/a | 0.052 | 4.736 | 0.260 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000068 | 32.380 | 4.300 | 0.009 | 0.000 | 0.427 | 3.899 | 1.498 | 0.050 | n/a | 0.289 | 21.858 | n/a | n/a | 0.051 | 4.736 | 0.146 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000070 | 22.318 | 3.892 | 0.008 | 0.000 | 0.455 | 0.961 | 5.476 | 0.035 | n/a | 1.142 | 10.295 | n/a | n/a | 0.052 | 4.355 | 0.195 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000006e | 14.414 | 3.550 | 0.005 | 0.000 | 0.194 | 1.081 | 1.479 | 0.038 | n/a | 0.650 | 7.381 | n/a | n/a | 0.036 | 3.749 | 0.260 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.756 | 0.140 | 0.000 | 0.324 | 5.186 | 0.116 | 0.404 | 0.068 | 1.297 | 9.949 | 0.057 | n/a | 0.604 | 19.435 | n/a | n/a | 0.042 | 5.792 | 0.149 | 0.042 |
| p99 | 45.123 | 0.672 | 0.236 | 0.850 | 6.424 | 0.352 | 1.584 | 0.086 | 2.877 | 13.965 | 0.067 | n/a | 1.814 | 19.492 | n/a | n/a | 0.060 | 8.428 | 0.187 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000074 | 45.123 | 6.424 | 0.352 | 1.584 | 0.068 | 1.297 | 13.965 | 0.067 | n/a | 1.814 | 19.492 | n/a | n/a | 0.060 | 8.428 | 0.187 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000077 | 38.756 | 5.186 | 0.116 | 0.404 | 0.086 | 2.877 | 9.949 | 0.057 | n/a | 0.604 | 19.435 | n/a | n/a | 0.042 | 5.792 | 0.149 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.455 | 0.414 | 0.000 | 0.403 | 4.129 | 0.009 | 0.000 | 0.067 | 1.676 | 8.193 | 0.042 | n/a | 0.792 | 19.685 | n/a | n/a | 0.050 | 4.736 | 0.118 | 0.050 |
| p99 | 52.912 | 1.855 | 0.000 | 2.722 | 6.454 | 0.299 | 0.000 | 0.602 | 2.786 | 11.774 | 0.117 | n/a | 1.549 | 36.811 | n/a | n/a | 0.057 | 6.820 | 0.204 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f0590000000000000007a | 52.912 | 5.726 | 0.009 | 0.000 | 0.529 | 1.288 | 8.193 | 0.039 | n/a | 0.261 | 36.811 | n/a | n/a | 0.057 | 6.263 | 0.118 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000007f | 44.295 | 3.779 | 0.165 | 0.000 | 0.061 | 2.079 | 11.774 | 0.117 | n/a | 1.549 | 24.721 | n/a | n/a | 0.050 | 4.004 | 0.090 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000079 | 33.455 | 6.454 | 0.299 | 0.000 | 0.067 | 2.786 | 9.117 | 0.051 | n/a | 0.927 | 13.710 | n/a | n/a | 0.043 | 6.820 | 0.204 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000007d | 28.426 | 4.129 | 0.005 | 0.000 | 0.602 | 1.676 | 1.446 | 0.042 | n/a | 0.792 | 19.685 | n/a | n/a | 0.050 | 4.736 | 0.167 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.426 | 0.926 | 0.000 | 1.737 | 4.129 | 0.005 | 0.000 | 0.602 | 1.676 | 1.446 | 0.042 | n/a | 0.792 | 19.685 | n/a | n/a | 0.050 | 4.736 | 0.167 | 0.050 |
| p99 | 28.426 | 0.926 | 0.000 | 1.737 | 4.129 | 0.005 | 0.000 | 0.602 | 1.676 | 1.446 | 0.042 | n/a | 0.792 | 19.685 | n/a | n/a | 0.050 | 4.736 | 0.167 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f0590000000000000007d | 28.426 | 4.129 | 0.005 | 0.000 | 0.602 | 1.676 | 1.446 | 0.042 | n/a | 0.792 | 19.685 | n/a | n/a | 0.050 | 4.736 | 0.167 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.123 | 0.000 | 0.000 | 0.343 | 8.312 | 0.286 | 0.000 | 0.088 | 2.019 | 11.443 | 0.088 | n/a | 1.096 | 16.486 | n/a | n/a | 0.051 | 8.670 | 0.245 | 0.051 |
| p99 | 48.399 | 0.269 | 0.000 | 0.379 | 8.411 | 0.290 | 0.489 | 0.830 | 4.478 | 14.166 | 0.142 | n/a | 1.627 | 21.821 | n/a | n/a | 0.062 | 9.246 | 0.299 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000082 | 48.399 | 8.312 | 0.290 | 0.000 | 0.068 | 2.019 | 14.166 | 0.051 | n/a | 1.627 | 21.821 | n/a | n/a | 0.045 | 8.670 | 0.179 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000084 | 32.123 | 7.008 | 0.286 | 0.489 | 0.088 | 1.376 | 5.805 | 0.088 | n/a | 0.447 | 16.486 | n/a | n/a | 0.051 | 7.870 | 0.245 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000080 | 30.892 | 8.411 | 0.005 | 0.000 | 0.830 | 4.478 | 11.443 | 0.142 | n/a | 1.096 | 4.425 | n/a | n/a | 0.062 | 9.246 | 0.299 | 0.062 | node-14/thread-0/driver.execute | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.892 | 0.000 | 0.000 | 0.328 | 8.411 | 0.005 | 0.000 | 0.830 | 4.478 | 11.443 | 0.142 | n/a | 1.096 | 4.425 | n/a | n/a | 0.062 | 9.246 | 0.299 | 0.062 |
| p99 | 30.892 | 0.000 | 0.000 | 0.328 | 8.411 | 0.005 | 0.000 | 0.830 | 4.478 | 11.443 | 0.142 | n/a | 1.096 | 4.425 | n/a | n/a | 0.062 | 9.246 | 0.299 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000080 | 30.892 | 8.411 | 0.005 | 0.000 | 0.830 | 4.478 | 11.443 | 0.142 | n/a | 1.096 | 4.425 | n/a | n/a | 0.062 | 9.246 | 0.299 | 0.062 | node-14/thread-0/driver.execute | none observed |

## P2 / outside-phases / commit (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.614 | 0.455 | 0.000 | 0.584 | 4.990 | 0.203 | 0.229 | 0.070 | 1.448 | 3.062 | 0.057 | n/a | 0.569 | 16.542 | n/a | n/a | 0.049 | 5.483 | 0.124 | 0.049 |
| p99 | 125.188 | 3.666 | 0.401 | 4.017 | 9.746 | 0.733 | 0.448 | 0.475 | 5.063 | 27.112 | 0.115 | n/a | 4.430 | 111.828 | n/a | n/a | 0.066 | 10.170 | 0.332 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000a1 | 125.188 | 4.238 | 0.733 | 0.229 | 0.041 | 5.063 | 2.514 | 0.068 | n/a | 0.415 | 111.828 | n/a | n/a | 0.058 | 5.241 | 0.042 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000009c | 71.700 | 4.990 | 0.018 | 0.000 | 0.475 | 1.072 | 1.693 | 0.101 | n/a | 2.801 | 60.494 | n/a | n/a | 0.057 | 5.483 | 0.076 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000089 | 52.487 | 5.810 | 0.207 | 0.408 | 0.070 | 1.756 | 27.112 | 0.057 | n/a | 0.324 | 16.701 | n/a | n/a | 0.042 | 6.495 | 0.124 | 0.042 | gw-w/thread-41/gateway.admitted-work | none observed |
| 476f09e0db7f059000000000000000c2 | 43.190 | 3.968 | 0.203 | 0.280 | 0.041 | 4.927 | 9.495 | 0.049 | n/a | 4.430 | 19.762 | n/a | n/a | 0.035 | 4.491 | 0.104 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 4.500ms |
| 476f09e0db7f0590000000000000009b | 33.614 | 7.307 | 0.415 | 0.307 | 0.101 | 2.128 | 10.049 | 0.049 | n/a | 0.365 | 12.841 | n/a | n/a | 0.051 | 8.129 | 0.242 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f05900000000000000086 | 30.599 | 9.746 | 0.010 | 0.000 | 0.414 | 1.448 | 1.615 | 0.039 | n/a | 0.720 | 16.542 | n/a | n/a | 0.066 | 10.170 | 0.332 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000c6 | 29.840 | 4.185 | 0.219 | 0.448 | 0.063 | 1.437 | 10.112 | 0.096 | n/a | 1.322 | 11.913 | n/a | n/a | 0.045 | 4.916 | 0.165 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000009f | 21.325 | 5.561 | 0.005 | 0.000 | 0.243 | 1.197 | 3.062 | 0.115 | n/a | 0.569 | 10.523 | n/a | n/a | 0.049 | 5.809 | 0.272 | 0.049 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.896 | 0.461 | 0.000 | 0.412 | 5.762 | 0.212 | 0.239 | 0.119 | 1.430 | 3.650 | 0.149 | n/a | 1.301 | 17.610 | n/a | n/a | 0.056 | 6.482 | 0.164 | 0.056 |
| p99 | 76.243 | 1.903 | 1.895 | 4.558 | 6.894 | 0.257 | 0.399 | 1.061 | 2.340 | 14.702 | 0.156 | n/a | 1.718 | 50.790 | n/a | n/a | 0.057 | 7.961 | 0.296 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f0590000000000000008b | 76.243 | 5.762 | 0.257 | 0.399 | 0.064 | 2.340 | 14.702 | 0.156 | n/a | 1.718 | 50.790 | n/a | n/a | 0.056 | 6.482 | 0.085 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000008f | 26.896 | 6.894 | 0.006 | 0.000 | 1.061 | 1.430 | 3.650 | 0.149 | n/a | 1.301 | 12.365 | n/a | n/a | 0.041 | 7.961 | 0.296 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f0590000000000000008d | 25.036 | 3.536 | 0.212 | 0.239 | 0.119 | 0.866 | 1.671 | 0.037 | n/a | 0.690 | 17.610 | n/a | n/a | 0.057 | 4.105 | 0.164 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.701 | 0.000 | 0.000 | 0.311 | 2.926 | 0.164 | 0.000 | 0.064 | 3.966 | 1.449 | 0.036 | n/a | 0.246 | 20.045 | n/a | n/a | 0.028 | 4.297 | 0.127 | 0.028 |
| p99 | 71.152 | 0.228 | 0.000 | 1.592 | 3.781 | 1.894 | 0.288 | 11.105 | 5.629 | 4.570 | 0.537 | n/a | 0.289 | 47.797 | n/a | n/a | 0.041 | 15.924 | 0.224 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000094 | 71.152 | 2.926 | 1.894 | 0.000 | 11.105 | 5.629 | 1.449 | 0.036 | n/a | 0.289 | 47.797 | n/a | n/a | 0.028 | 15.924 | 0.224 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | client.encode 3.995ms |
| 476f09e0db7f05900000000000000092 | 33.701 | 3.781 | 0.164 | 0.288 | 0.064 | 3.966 | 4.570 | 0.537 | n/a | 0.246 | 20.045 | n/a | n/a | 0.041 | 4.297 | 0.127 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.152 | 0.228 | 0.000 | 1.592 | 2.926 | 1.894 | 0.000 | 11.105 | 5.629 | 1.449 | 0.036 | n/a | 0.289 | 47.797 | n/a | n/a | 0.028 | 15.924 | 0.224 | 0.028 |
| p99 | 71.152 | 0.228 | 0.000 | 1.592 | 2.926 | 1.894 | 0.000 | 11.105 | 5.629 | 1.449 | 0.036 | n/a | 0.289 | 47.797 | n/a | n/a | 0.028 | 15.924 | 0.224 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f05900000000000000094 | 71.152 | 2.926 | 1.894 | 0.000 | 11.105 | 5.629 | 1.449 | 0.036 | n/a | 0.289 | 47.797 | n/a | n/a | 0.028 | 15.924 | 0.224 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | client.encode 3.995ms |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.512 | 0.599 | 0.000 | 1.800 | 4.097 | 0.005 | 0.000 | 0.344 | 1.113 | 2.003 | 0.048 | n/a | 0.507 | 10.426 | n/a | n/a | 0.042 | 4.570 | 0.203 | 0.042 |
| p99 | 34.517 | 2.856 | 0.003 | 2.632 | 5.364 | 0.177 | 0.292 | 1.036 | 3.233 | 16.802 | 0.095 | n/a | 1.417 | 18.459 | n/a | n/a | 0.068 | 5.849 | 0.320 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000a7 | 34.517 | 4.097 | 0.176 | 0.236 | 0.061 | 3.233 | 16.802 | 0.083 | n/a | 0.499 | 9.280 | n/a | n/a | 0.051 | 4.570 | 0.132 | 0.051 | gw-w/thread-41/gateway.admitted-work | none observed |
| 476f09e0db7f059000000000000000a3 | 30.652 | 4.183 | 0.006 | 0.000 | 0.344 | 1.065 | 5.119 | 0.095 | n/a | 1.417 | 18.378 | n/a | n/a | 0.045 | 4.532 | 0.148 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000b5 | 27.705 | 4.380 | 0.006 | 0.000 | 0.240 | 0.791 | 3.454 | 0.040 | n/a | 0.280 | 18.459 | n/a | n/a | 0.054 | 4.627 | 0.167 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000b0 | 26.344 | 5.364 | 0.014 | 0.000 | 0.470 | 1.113 | 1.407 | 0.048 | n/a | 0.244 | 17.616 | n/a | n/a | 0.068 | 5.849 | 0.222 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000b4 | 26.283 | 5.267 | 0.177 | 0.292 | 0.051 | 1.625 | 6.823 | 0.056 | n/a | 0.708 | 11.241 | n/a | n/a | 0.042 | 5.787 | 0.220 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000a5 | 24.512 | 3.764 | 0.005 | 0.000 | 0.914 | 0.939 | 1.608 | 0.039 | n/a | 0.799 | 16.395 | n/a | n/a | 0.050 | 4.683 | 0.191 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000a8 | 17.427 | 4.504 | 0.005 | 0.000 | 1.036 | 1.073 | 2.051 | 0.075 | n/a | 0.569 | 8.075 | n/a | n/a | 0.039 | 5.544 | 0.318 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000ae | 16.634 | 3.145 | 0.005 | 0.000 | 0.229 | 1.447 | 1.037 | 0.035 | n/a | 0.272 | 10.426 | n/a | n/a | 0.038 | 3.379 | 0.203 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000ac | 16.459 | 3.308 | 0.004 | 0.000 | 0.484 | 1.206 | 2.003 | 0.088 | n/a | 0.507 | 8.829 | n/a | n/a | 0.029 | 3.797 | 0.231 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000b2 | 11.520 | 3.215 | 0.005 | 0.000 | 0.462 | 1.493 | 1.362 | 0.036 | n/a | 0.570 | 4.336 | n/a | n/a | 0.041 | 3.681 | 0.320 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.634 | 0.599 | 0.000 | 1.705 | 3.215 | 0.005 | 0.000 | 0.344 | 1.447 | 1.362 | 0.036 | n/a | 0.570 | 10.426 | n/a | n/a | 0.041 | 3.681 | 0.203 | 0.041 |
| p99 | 30.652 | 0.846 | 0.000 | 2.481 | 4.183 | 0.006 | 0.000 | 0.462 | 1.493 | 5.119 | 0.095 | n/a | 1.417 | 18.378 | n/a | n/a | 0.045 | 4.532 | 0.320 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000a3 | 30.652 | 4.183 | 0.006 | 0.000 | 0.344 | 1.065 | 5.119 | 0.095 | n/a | 1.417 | 18.378 | n/a | n/a | 0.045 | 4.532 | 0.148 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000ae | 16.634 | 3.145 | 0.005 | 0.000 | 0.229 | 1.447 | 1.037 | 0.035 | n/a | 0.272 | 10.426 | n/a | n/a | 0.038 | 3.379 | 0.203 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000b2 | 11.520 | 3.215 | 0.005 | 0.000 | 0.462 | 1.493 | 1.362 | 0.036 | n/a | 0.570 | 4.336 | n/a | n/a | 0.041 | 3.681 | 0.320 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.145 | n/a | n/a | n/a | 5.571 | 0.820 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 7.132 | 0.998 | 0.015 |
| p99 | 90.635 | n/a | n/a | n/a | 47.648 | 80.590 | 5.069 | 0.000 | 1.077 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.332 | 90.623 | 1.000 | 15.332 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000c3 | 90.635 | 10.033 | 80.590 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 90.623 | 1.000 | 0.012 | node-14/thread-0/rpc.replica.observe | none observed |
| 476f09e0db7f059000000000000000a9 | 70.399 | 47.648 | 1.273 | 5.069 | 0.000 | 1.077 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.332 | 53.989 | 0.767 | 15.332 | node-14/thread-3/client.reach-decode-and-cache | none observed |
| 476f09e0db7f05900000000000000038 | 38.165 | 35.658 | 0.619 | 1.826 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.062 | 38.103 | 0.998 | 0.062 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f059000000000000000d2 | 13.476 | 13.221 | 0.221 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.033 | 13.442 | 0.998 | 0.033 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f05900000000000000061 | 13.082 | 12.442 | 0.624 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 13.066 | 0.999 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f0590000000000000007b | 12.435 | 12.281 | 0.131 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 12.412 | 0.998 | 0.023 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f0590000000000000006f | 12.035 | 11.398 | 0.624 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 12.022 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f0590000000000000005a | 8.124 | 0.923 | 7.186 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.109 | 0.998 | 0.015 | node-14/thread-0/rpc.replica.observe | none observed |
| 476f09e0db7f05900000000000000087 | 7.527 | 7.417 | 0.092 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.509 | 0.998 | 0.018 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f059000000000000000d3 | 7.315 | 0.258 | 7.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 7.290 | 0.997 | 0.024 | node-14/thread-0/rpc.replica.observe | none observed |
| 476f09e0db7f059000000000000000b7 | 7.145 | 7.054 | 0.078 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.132 | 0.998 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f05900000000000000069 | 6.368 | 3.381 | 2.973 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 6.354 | 0.998 | 0.015 | node-14/thread-0/rpc.replica.observe | none observed |
| 476f09e0db7f05900000000000000047 | 6.133 | 0.483 | 5.633 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 6.116 | 0.997 | 0.017 | node-14/thread-0/rpc.replica.observe | none observed |
| 476f09e0db7f0590000000000000005c | 5.980 | 5.622 | 0.344 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 5.966 | 0.998 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f059000000000000000a0 | 5.783 | 0.153 | 5.615 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 5.768 | 0.997 | 0.015 | node-14/thread-0/rpc.replica.observe | none observed |
| 476f09e0db7f059000000000000000a6 | 5.697 | 5.571 | 0.110 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.680 | 0.997 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f0590000000000000003c | 5.375 | 0.239 | 5.125 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 5.364 | 0.998 | 0.011 | node-14/thread-0/rpc.replica.observe | none observed |
| 476f09e0db7f059000000000000000d9 | 4.850 | 3.491 | 1.345 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 4.837 | 0.997 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f059000000000000000af | 4.788 | 2.857 | 1.917 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 4.774 | 0.997 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| 476f09e0db7f059000000000000000ca | 4.574 | 3.708 | 0.820 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.045 | 4.529 | 0.990 | 0.045 | node-14/thread-2/replica.pull-at | none observed |

## P2 / grow10 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 46.542 | 0.998 | 0.000 | 0.545 | 4.724 | 0.005 | 0.000 | 0.082 | 1.850 | 8.172 | 0.150 | n/a | 0.492 | 9.696 | n/a | n/a | 0.057 | 8.188 | 0.176 | 0.057 |
| p99 | 104.030 | 1.487 | 3.104 | 5.145 | 7.068 | 13.869 | 0.241 | 1.114 | 19.788 | 23.729 | 0.156 | n/a | 0.534 | 58.786 | n/a | n/a | 0.060 | 18.916 | 0.182 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000b9 | 104.030 | 4.724 | 13.869 | 0.241 | 0.082 | 1.850 | 23.729 | 0.156 | n/a | 0.534 | 58.786 | n/a | n/a | 0.060 | 18.916 | 0.182 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000c1 | 46.542 | 7.068 | 0.005 | 0.000 | 1.114 | 19.788 | 8.172 | 0.150 | n/a | 0.492 | 9.696 | n/a | n/a | 0.057 | 8.188 | 0.176 | 0.057 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h10 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.795 | 0.514 | 0.005 | 2.648 | 6.470 | 0.010 | 0.000 | 0.149 | 0.959 | 6.400 | 0.111 | n/a | 0.810 | 18.425 | n/a | n/a | 0.079 | 7.070 | 0.135 | 0.079 |
| p99 | 244.547 | 2.552 | 0.364 | 3.871 | 9.386 | 0.183 | 0.427 | 0.832 | 2.342 | 19.151 | 0.426 | n/a | 3.457 | 233.266 | n/a | n/a | 0.131 | 9.545 | 0.267 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000c8 | 244.547 | 6.533 | 0.008 | 0.000 | 0.530 | 0.890 | 2.851 | 0.036 | n/a | 0.316 | 233.266 | n/a | n/a | 0.116 | 7.070 | 0.029 | 0.116 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000cc | 44.991 | 5.420 | 0.181 | 0.427 | 0.060 | 1.502 | 19.151 | 0.139 | n/a | 3.332 | 14.742 | n/a | n/a | 0.039 | 6.088 | 0.135 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000cd | 36.795 | 6.470 | 0.010 | 0.000 | 0.832 | 0.959 | 6.400 | 0.111 | n/a | 3.457 | 18.425 | n/a | n/a | 0.131 | 7.312 | 0.199 | 0.131 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000c9 | 36.286 | 3.975 | 0.183 | 0.304 | 0.068 | 2.342 | 13.265 | 0.426 | n/a | 0.573 | 15.106 | n/a | n/a | 0.043 | 4.531 | 0.125 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.513ms |
| 476f09e0db7f059000000000000000d0 | 35.748 | 9.386 | 0.010 | 0.000 | 0.149 | 0.946 | 2.839 | 0.037 | n/a | 0.810 | 21.492 | n/a | n/a | 0.079 | 9.545 | 0.267 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 244.547 | 2.552 | 0.000 | 3.871 | 6.533 | 0.008 | 0.000 | 0.530 | 0.890 | 2.851 | 0.036 | n/a | 0.316 | 233.266 | n/a | n/a | 0.116 | 7.070 | 0.029 | 0.116 |
| p99 | 244.547 | 2.552 | 0.000 | 3.871 | 6.533 | 0.008 | 0.000 | 0.530 | 0.890 | 2.851 | 0.036 | n/a | 0.316 | 233.266 | n/a | n/a | 0.116 | 7.070 | 0.029 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000c8 | 244.547 | 6.533 | 0.008 | 0.000 | 0.530 | 0.890 | 2.851 | 0.036 | n/a | 0.316 | 233.266 | n/a | n/a | 0.116 | 7.070 | 0.029 | 0.116 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.238 | 0.592 | 0.000 | 0.558 | 3.839 | 0.008 | 0.000 | 0.100 | 1.294 | 4.836 | 0.056 | n/a | 0.431 | 10.077 | n/a | n/a | 0.054 | 4.550 | 0.245 | 0.054 |
| p99 | 36.578 | 1.327 | 0.000 | 2.495 | 10.530 | 0.611 | 0.443 | 16.669 | 4.052 | 7.636 | 0.114 | n/a | 0.885 | 16.426 | n/a | n/a | 0.072 | 21.783 | 0.596 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000d1 | 36.578 | 5.106 | 0.008 | 0.000 | 16.669 | 1.294 | 4.836 | 0.111 | n/a | 0.321 | 8.162 | n/a | n/a | 0.072 | 21.783 | 0.596 | 0.072 | node-14/thread-0/driver.queue.subject | driver.publication 1.969ms; driver.expected-state.bind-receipt 1.195ms |
| 476f09e0db7f059000000000000000d4 | 35.746 | 10.530 | 0.325 | 0.443 | 0.060 | 4.052 | 7.636 | 0.114 | n/a | 0.885 | 11.641 | n/a | n/a | 0.060 | 11.358 | 0.318 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000d6 | 30.238 | 3.839 | 0.611 | 0.000 | 0.100 | 1.436 | 6.928 | 0.056 | n/a | 0.788 | 16.426 | n/a | n/a | 0.054 | 4.550 | 0.150 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 476f09e0db7f059000000000000000d8 | 16.459 | 3.500 | 0.005 | 0.000 | 0.531 | 0.798 | 1.041 | 0.035 | n/a | 0.431 | 10.077 | n/a | n/a | 0.042 | 4.035 | 0.245 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.459 | 0.592 | 0.000 | 2.033 | 3.500 | 0.005 | 0.000 | 0.531 | 0.798 | 1.041 | 0.035 | n/a | 0.321 | 8.162 | n/a | n/a | 0.042 | 4.035 | 0.245 | 0.042 |
| p99 | 36.578 | 1.327 | 0.000 | 2.495 | 5.106 | 0.008 | 0.000 | 16.669 | 1.294 | 4.836 | 0.111 | n/a | 0.431 | 10.077 | n/a | n/a | 0.072 | 21.783 | 0.596 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000d1 | 36.578 | 5.106 | 0.008 | 0.000 | 16.669 | 1.294 | 4.836 | 0.111 | n/a | 0.321 | 8.162 | n/a | n/a | 0.072 | 21.783 | 0.596 | 0.072 | node-14/thread-0/driver.queue.subject | driver.publication 1.969ms; driver.expected-state.bind-receipt 1.195ms |
| 476f09e0db7f059000000000000000d8 | 16.459 | 3.500 | 0.005 | 0.000 | 0.531 | 0.798 | 1.041 | 0.035 | n/a | 0.431 | 10.077 | n/a | n/a | 0.042 | 4.035 | 0.245 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.342 | 0.730 | 0.059 | 2.066 | 4.952 | 6.192 | 0.000 | 0.006 | 13.673 | 1.411 | 10.440 | n/a | 0.435 | 33.523 | n/a | n/a | 0.022 | 10.972 | 0.161 | 0.022 |
| p99 | 120.253 | 1.948 | 6.395 | 8.795 | 11.834 | 14.444 | 0.000 | 0.047 | 29.462 | 10.943 | 20.813 | n/a | 12.779 | 62.529 | n/a | n/a | 0.064 | 21.398 | 0.215 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 476f09e0db7f059000000000000000e3 | 120.253 | 4.855 | 14.444 | 0.000 | 0.005 | 13.673 | 2.885 | 14.846 | n/a | 6.952 | 62.529 | n/a | n/a | 0.064 | 19.304 | 0.161 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 8.523ms; driver.publication 7.041ms; driver.publication 3.964ms; driver.publication 3.674ms; driver.publication 1.947ms |
| 476f09e0db7f059000000000000000e2 | 112.071 | 7.669 | 13.723 | 0.000 | 0.006 | 13.373 | 10.943 | 11.738 | n/a | 0.268 | 54.329 | n/a | n/a | 0.021 | 21.398 | 0.191 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 8.523ms; driver.publication 7.041ms; driver.publication 3.674ms; driver.publication 1.947ms; driver.publication 1.795ms |
| 476f09e0db7f059000000000000000e1 | 103.580 | 5.377 | 12.411 | 0.000 | 0.005 | 18.334 | 1.643 | 17.951 | n/a | 0.204 | 47.634 | n/a | n/a | 0.022 | 17.793 | 0.172 | 0.022 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 8.523ms; driver.publication 7.041ms; driver.publication 3.674ms; driver.publication 1.947ms; driver.publication 1.795ms |
| 476f09e0db7f059000000000000000e0 | 101.165 | 11.834 | 8.760 | 0.000 | 0.008 | 29.462 | 1.590 | 7.413 | n/a | 0.103 | 41.974 | n/a | n/a | 0.021 | 20.602 | 0.204 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 7.041ms; driver.publication 3.674ms; driver.publication 1.947ms; driver.publication 1.795ms; driver.publication 1.698ms |
| 476f09e0db7f059000000000000000df | 91.844 | 10.353 | 7.901 | 0.000 | 0.006 | 28.073 | 1.151 | 10.440 | n/a | 0.376 | 33.523 | n/a | n/a | 0.021 | 18.259 | 0.199 | 0.021 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 3.674ms; driver.publication 1.947ms; driver.publication 1.795ms; driver.publication 1.698ms; driver.publication 1.037ms |
| 476f09e0db7f059000000000000000de | 79.342 | 4.774 | 6.192 | 0.000 | 0.006 | 15.600 | 0.942 | 20.813 | n/a | 0.435 | 30.552 | n/a | n/a | 0.027 | 10.972 | 0.138 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 3.674ms; driver.publication 1.947ms; driver.publication 1.795ms; driver.publication 1.037ms |
| 476f09e0db7f059000000000000000dd | 70.260 | 4.033 | 5.432 | 0.000 | 0.006 | 12.442 | 1.167 | 11.095 | n/a | 12.779 | 23.281 | n/a | n/a | 0.024 | 9.471 | 0.135 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.674ms; driver.publication 1.947ms; driver.publication 1.795ms |
| 476f09e0db7f059000000000000000dc | 56.063 | 4.607 | 3.990 | 0.000 | 0.008 | 21.763 | 1.411 | 0.034 | n/a | 4.395 | 19.833 | n/a | n/a | 0.021 | 8.605 | 0.153 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.674ms; driver.publication 1.947ms |
| 476f09e0db7f059000000000000000db | 52.228 | 4.952 | 1.484 | 0.000 | 0.012 | 3.168 | 2.590 | 0.045 | n/a | 1.644 | 38.304 | n/a | n/a | 0.028 | 6.448 | 0.123 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 3.674ms |
| 476f09e0db7f059000000000000000da | 27.985 | 5.948 | 0.016 | 0.000 | 0.047 | 2.757 | 1.275 | 0.045 | n/a | 0.608 | 17.256 | n/a | n/a | 0.034 | 6.011 | 0.215 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (201 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 292.117 | n/a | n/a | n/a | 37.352 | n/a | 5.131 | 292.083 | 29.209 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.469 | 292.112 | 1.000 | 37.469 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de20000000000001737 | 293.115 | 0.534 | n/a | 0.000 | 292.575 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 293.109 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000001738 | 292.321 | 0.195 | n/a | 0.000 | 292.107 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 292.302 | 1.000 | 0.019 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000001739 | 292.117 | 0.030 | n/a | 0.000 | 292.083 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 292.112 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000001425 | 292.117 | 0.375 | n/a | 0.000 | 291.738 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 292.112 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000000173a | 292.099 | 0.022 | n/a | 0.000 | 292.074 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.097 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000000173b | 292.092 | 0.081 | n/a | 0.000 | 292.009 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.090 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000000173c | 292.004 | 0.025 | n/a | 0.000 | 291.976 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.002 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000001426 | 291.987 | 0.042 | n/a | 0.000 | 291.942 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.985 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000001427 | 291.967 | 0.051 | n/a | 0.000 | 291.906 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 291.957 | 1.000 | 0.010 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000001428 | 291.815 | 0.033 | n/a | 0.000 | 291.777 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 291.810 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000000d1e | 291.537 | 0.495 | n/a | 0.000 | 291.040 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.535 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000001430 | 291.413 | 0.072 | n/a | 0.000 | 291.339 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 291.410 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000000d1f | 291.229 | 0.108 | n/a | 0.000 | 291.116 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 291.224 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000000d33 | 288.777 | 0.096 | n/a | 0.000 | 288.663 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 288.759 | 1.000 | 0.018 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000000d34 | 288.645 | 0.023 | n/a | 0.000 | 288.620 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.643 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000000d35 | 288.625 | 0.022 | n/a | 0.000 | 288.601 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.623 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000009bb1 | 277.228 | 0.016 | n/a | 0.000 | 277.211 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.227 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000009bb0 | 277.226 | 0.070 | n/a | 0.000 | 277.156 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.225 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000009bad | 277.218 | 0.190 | n/a | 0.000 | 277.025 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.215 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000009baf | 277.163 | 0.022 | n/a | 0.000 | 277.140 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.162 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1 / read (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 290.209 | n/a | n/a | n/a | 1.952 | n/a | 0.000 | 290.006 | 0.705 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.965 | 290.206 | 1.000 | 1.965 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de20000000000020a08 | 290.209 | 0.201 | n/a | 0.000 | 290.006 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 290.206 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms; replica.apply-delta 0.031ms |
| 46ad0b0babf04de2000000000000d535 | 280.228 | 0.170 | n/a | 0.000 | 280.051 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 280.222 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000000d1a7 | 47.035 | 0.155 | n/a | 0.000 | 46.873 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 47.028 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.070ms; replica.apply-delta 0.032ms |
| 46ad0b0babf04de2000000000000d1d5 | 4.621 | 1.952 | n/a | 0.000 | 0.000 | 0.705 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.965 | 1.952 | 0.422 | 1.965 | node-14/thread-4/socket.wait-first-byte | none observed |
| 46ad0b0babf04de2000000000001a240 | 0.851 | 0.849 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.849 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000000de3b | 0.783 | 0.781 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.781 | 0.996 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000017387 | 0.634 | 0.632 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.632 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000001a8d2 | 0.611 | 0.607 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.607 | 0.994 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000001fc6f | 0.403 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.403 | 0.000 | 0.000 | 0.403 | uncovered | none observed |
| 46ad0b0babf04de2000000000001481f | 0.384 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.384 | 0.000 | 0.000 | 0.384 | uncovered | none observed |
| 46ad0b0babf04de20000000000018a2d | 0.382 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 | uncovered | none observed |
| 46ad0b0babf04de2000000000001482a | 0.368 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.368 | 0.000 | 0.000 | 0.368 | uncovered | none observed |
| 46ad0b0babf04de20000000000010e17 | 0.365 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.365 | 0.000 | 0.000 | 0.365 | uncovered | none observed |
| 46ad0b0babf04de2000000000000d1b8 | 0.318 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.318 | 0.000 | 0.000 | 0.318 | uncovered | none observed |
| 46ad0b0babf04de2000000000000d1a9 | 0.312 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 | uncovered | none observed |
| 46ad0b0babf04de20000000000014bdb | 0.310 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.310 | 0.000 | 0.000 | 0.310 | uncovered | none observed |
| 46ad0b0babf04de2000000000001e882 | 0.303 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.303 | 0.000 | 0.000 | 0.303 | uncovered | none observed |
| 46ad0b0babf04de2000000000000d6de | 0.300 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 | uncovered | none observed |
| 46ad0b0babf04de20000000000019cf7 | 0.295 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 | uncovered | none observed |
| 46ad0b0babf04de2000000000001c68e | 0.283 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | uncovered | none observed |

## P1 / L4 / read (217 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 270.625 | n/a | n/a | n/a | 4.337 | n/a | 0.000 | 270.362 | 0.515 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.190 | 270.612 | 1.000 | 2.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7cb1af0fb7f81f68000000000000c1c5 | 273.343 | 0.144 | n/a | 0.000 | 273.197 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.341 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000021dd6 | 272.350 | 0.130 | n/a | 0.000 | 272.216 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 272.346 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000000c2d3 | 270.625 | 0.250 | n/a | 0.000 | 270.362 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 270.612 | 1.000 | 0.013 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000021dd7 | 270.403 | 0.037 | n/a | 0.000 | 270.361 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 270.398 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000000ba52 | 256.791 | 0.578 | n/a | 0.000 | 256.197 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 256.775 | 1.000 | 0.016 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.025ms |
| 46ad0b0babf04de20000000000020a0b | 255.321 | 0.054 | n/a | 0.000 | 255.265 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 255.319 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms; replica.apply-delta 0.031ms |
| 7cb1af0fb7f81f68000000000000b4ec | 254.458 | 0.193 | n/a | 0.000 | 254.263 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 254.456 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms; replica.apply-delta 0.030ms |
| a742d814859877a8000000000000ba5b | 26.601 | 22.845 | n/a | 1.051 | 0.000 | 0.515 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.190 | 23.896 | 0.898 | 2.190 | node-14/thread-6/reader.execute | none observed |
| 7cb1af0fb7f81f68000000000000b526 | 13.234 | 10.497 | n/a | 0.000 | 0.000 | 1.035 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.702 | 10.497 | 0.793 | 1.702 | node-14/thread-5/reader.execute | none observed |
| 46ad0b0babf04de20000000000020ad6 | 7.139 | 4.337 | n/a | 0.000 | 0.000 | 0.539 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.264 | 4.337 | 0.607 | 2.264 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de2000000000002f4c5 | 2.915 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.915 | 0.000 | 0.000 | 2.915 | uncovered | none observed |
| 7cb1af0fb7f81f680000000000012fd5 | 2.636 | 2.635 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.635 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000029733 | 2.177 | 2.176 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.176 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000024b35 | 2.065 | 2.063 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.063 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000020cf9 | 1.839 | 1.838 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.838 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7cb1af0fb7f81f6800000000000125dd | 1.356 | 1.354 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.354 | 0.998 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f680000000000015547 | 1.188 | 1.186 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.186 | 0.998 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f68000000000001282f | 1.127 | 1.122 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.122 | 0.996 | 0.005 | node-14/thread-5/reader.execute | none observed |
| 7cb1af0fb7f81f68000000000001550b | 1.114 | 1.112 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.112 | 0.999 | 0.001 | node-14/thread-5/reader.observe | none observed |
| a742d814859877a8000000000000e52e | 0.957 | 0.955 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.955 | 0.998 | 0.002 | node-14/thread-6/replica.pull-at | none observed |

## P1 / L16 / read (276 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 477.659 | n/a | n/a | n/a | 11.264 | n/a | 0.000 | 477.533 | 0.437 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.025 | 477.656 | 1.000 | 2.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de2000000000003b859 | 477.708 | 0.019 | n/a | 0.000 | 477.688 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 477.707 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 46ad0b0babf04de2000000000003b858 | 477.701 | 0.026 | n/a | 0.000 | 477.674 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 477.699 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 46ad0b0babf04de2000000000003b857 | 477.659 | 0.162 | n/a | 0.000 | 477.494 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 477.656 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| a742d814859877a80000000000020e3e | 477.588 | 0.122 | n/a | 0.000 | 477.464 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 477.586 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 46ad0b0babf04de2000000000003b85a | 477.574 | 0.039 | n/a | 0.000 | 477.533 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 477.573 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| a742d814859877a80000000000020e3d | 477.546 | 0.361 | n/a | 0.000 | 477.182 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 477.543 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 46ad0b0babf04de2000000000003b85b | 477.544 | 0.018 | n/a | 0.000 | 477.524 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 477.542 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 46ad0b0babf04de2000000000003b85c | 477.538 | 0.022 | n/a | 0.000 | 477.514 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 477.536 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| a742d814859877a80000000000020e5c | 477.131 | 0.027 | n/a | 0.000 | 477.104 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 477.130 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| a742d814859877a80000000000020e5b | 477.095 | 0.032 | n/a | 0.000 | 477.063 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 477.094 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| a742d814859877a80000000000020e5a | 477.069 | 0.052 | n/a | 0.000 | 477.016 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 477.068 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 7cb1af0fb7f81f680000000000020188 | 476.772 | 0.246 | n/a | 0.000 | 476.524 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 476.770 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| 7cb1af0fb7f81f68000000000002018c | 476.751 | 0.020 | n/a | 0.000 | 476.731 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 476.751 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| 7cb1af0fb7f81f68000000000002018b | 476.735 | 0.013 | n/a | 0.000 | 476.721 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 476.734 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| 7cb1af0fb7f81f680000000000020189 | 476.724 | 0.033 | n/a | 0.000 | 476.691 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 476.724 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| 7cb1af0fb7f81f68000000000002018a | 476.724 | 0.015 | n/a | 0.000 | 476.708 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 476.723 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| a742d814859877a80000000000020e88 | 92.032 | 0.014 | n/a | 0.000 | 92.017 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 92.031 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| a742d814859877a80000000000020e87 | 92.024 | 0.014 | n/a | 0.000 | 92.009 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 92.023 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| a742d814859877a80000000000020e86 | 92.013 | 0.019 | n/a | 0.000 | 91.994 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 92.012 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| a742d814859877a80000000000020e85 | 92.008 | 0.033 | n/a | 0.000 | 91.974 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 92.007 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.028ms |

## P1 / L64 / read (225 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.026 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 409.642 | n/a | n/a | n/a | 3.624 | n/a | 0.000 | 409.595 | 0.515 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.983 | 409.640 | 1.000 | 12.983 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de20000000000046ac7 | 409.702 | 0.106 | n/a | 0.000 | 409.595 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.701 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000046ac8 | 409.682 | 0.024 | n/a | 0.000 | 409.657 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.681 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000046ac6 | 409.642 | 0.025 | n/a | 0.000 | 409.615 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.640 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000046ac3 | 409.600 | 0.309 | n/a | 0.000 | 409.288 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 409.596 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000046ac5 | 409.569 | 0.026 | n/a | 0.000 | 409.542 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.568 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000046ac4 | 409.545 | 0.045 | n/a | 0.000 | 409.500 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.544 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000002b891 | 409.267 | 0.226 | n/a | 0.000 | 409.039 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 409.265 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000002b892 | 409.206 | 0.033 | n/a | 0.000 | 409.171 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 409.204 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000002b893 | 409.199 | 0.015 | n/a | 0.000 | 409.184 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.198 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000002b895 | 409.176 | 0.028 | n/a | 0.000 | 409.147 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.175 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000002b896 | 409.169 | 0.013 | n/a | 0.000 | 409.156 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.169 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000002aa41 | 408.456 | 0.013 | n/a | 0.000 | 408.442 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 408.455 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000002aa40 | 408.450 | 0.013 | n/a | 0.000 | 408.436 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 408.449 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000002aa3f | 408.439 | 0.015 | n/a | 0.000 | 408.423 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 408.438 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000002aa3e | 408.431 | 0.020 | n/a | 0.000 | 408.410 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 408.430 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000002aa3d | 408.414 | 0.142 | n/a | 0.000 | 408.269 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 408.411 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000004975b | 297.391 | 0.119 | n/a | 0.000 | 297.270 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 297.389 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 46ad0b0babf04de2000000000004976e | 297.281 | 0.013 | n/a | 0.000 | 297.267 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.280 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 46ad0b0babf04de2000000000004976d | 297.271 | 0.017 | n/a | 0.000 | 297.253 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.270 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 46ad0b0babf04de2000000000004976c | 297.256 | 0.014 | n/a | 0.000 | 297.241 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.255 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |

## P1 / L256 / read (195 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.035 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 281.894 | n/a | n/a | n/a | 6.052 | n/a | 0.000 | 281.859 | 0.491 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.085 | 281.892 | 1.000 | 10.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a742d814859877a80000000000034a15 | 281.917 | 0.026 | n/a | 0.000 | 281.889 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.916 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000034a14 | 281.894 | 0.033 | n/a | 0.000 | 281.859 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.892 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000034a13 | 281.842 | 0.167 | n/a | 0.000 | 281.673 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.839 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f6800000000000347a2 | 281.635 | 0.140 | n/a | 0.000 | 281.491 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.632 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f6800000000000347a3 | 281.617 | 0.041 | n/a | 0.000 | 281.574 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.615 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f6800000000000347a4 | 281.594 | 0.030 | n/a | 0.000 | 281.562 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.592 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000034a31 | 281.450 | 0.032 | n/a | 0.000 | 281.417 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.449 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000034a30 | 281.422 | 0.028 | n/a | 0.000 | 281.392 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.421 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000050d9b | 281.121 | 0.046 | n/a | 0.000 | 281.073 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.118 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000050d9a | 281.107 | 0.052 | n/a | 0.000 | 281.052 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.104 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000050d99 | 281.075 | 0.159 | n/a | 0.000 | 280.912 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 281.072 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f6800000000000347b0 | 280.966 | 0.022 | n/a | 0.000 | 280.942 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.964 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f6800000000000347b1 | 280.960 | 0.042 | n/a | 0.000 | 280.917 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.959 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000050dab | 280.464 | 0.028 | n/a | 0.000 | 280.434 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.462 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000050daa | 280.451 | 0.027 | n/a | 0.000 | 280.422 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.449 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000050da9 | 280.440 | 0.036 | n/a | 0.000 | 280.401 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.437 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000005b13d | 272.502 | 0.014 | n/a | 0.000 | 272.486 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.501 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms; replica.apply-delta 0.030ms |
| 46ad0b0babf04de2000000000005b138 | 272.499 | 0.196 | n/a | 0.000 | 272.292 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 272.488 | 1.000 | 0.011 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms; replica.apply-delta 0.030ms |
| 46ad0b0babf04de2000000000005b13c | 272.497 | 0.016 | n/a | 0.000 | 272.480 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.496 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms; replica.apply-delta 0.030ms |
| 46ad0b0babf04de2000000000005b13a | 272.494 | 0.039 | n/a | 0.000 | 272.454 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.493 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms; replica.apply-delta 0.030ms |

## P1 / L1024 / read (311 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 3.629 | n/a | n/a | n/a | 3.404 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.819 | 3.404 | 0.999 | 0.819 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a742d814859877a8000000000003f682 | 52.223 | 22.616 | n/a | 4.485 | 0.000 | 0.683 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.440 | 27.101 | 0.519 | 24.440 | node-14/thread-6/socket.wait-first-byte | none observed |
| 46ad0b0babf04de2000000000005b8fe | 37.734 | 13.677 | n/a | 0.000 | 0.000 | 0.539 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.518 | 13.677 | 0.362 | 23.518 | node-14/thread-4/socket.wait-first-byte | none observed |
| 7cb1af0fb7f81f68000000000003f112 | 13.833 | 2.053 | n/a | 0.000 | 0.000 | 0.716 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.064 | 2.053 | 0.148 | 11.064 | node-14/thread-5/socket.wait-first-byte | none observed |
| 7cb1af0fb7f81f68000000000004474b | 3.629 | 3.626 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.626 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f68000000000004bab1 | 3.407 | 3.404 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.404 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f68000000000004bab2 | 3.406 | 3.389 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.389 | 0.995 | 0.017 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f68000000000004bab3 | 3.354 | 3.336 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.336 | 0.994 | 0.019 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f68000000000005031b | 3.128 | 3.127 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.127 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000006e0e8 | 3.093 | 3.091 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.091 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 7cb1af0fb7f81f680000000000044782 | 2.598 | 2.596 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.596 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f680000000000044783 | 2.581 | 2.570 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 2.570 | 0.996 | 0.010 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f680000000000044784 | 2.574 | 2.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.563 | 0.996 | 0.011 | node-14/thread-5/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000005c164 | 2.124 | 2.115 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 2.115 | 0.996 | 0.009 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000005c163 | 2.119 | 2.117 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.117 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000005c165 | 2.104 | 2.094 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 2.094 | 0.995 | 0.010 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000005c166 | 2.099 | 2.089 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 2.089 | 0.995 | 0.010 | node-14/thread-4/replica.pull-at | none observed |
| a742d814859877a80000000000050248 | 1.801 | 1.798 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.798 | 0.999 | 0.002 | node-14/thread-6/reader.execute | none observed |
| 7cb1af0fb7f81f68000000000003f57e | 1.305 | 1.296 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 1.296 | 0.993 | 0.009 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f6800000000000498a3 | 1.303 | 1.274 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 1.274 | 0.978 | 0.029 | node-14/thread-5/replica.pull-at | none observed |
| 7cb1af0fb7f81f68000000000003f57d | 1.302 | 1.300 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.300 | 0.999 | 0.001 | node-14/thread-5/replica.pull-at | none observed |

## P1 / recovery / read (229 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 302.679 | n/a | n/a | n/a | 4.790 | n/a | 0.000 | 302.629 | 0.739 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.308 | 302.677 | 1.000 | 2.308 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a742d814859877a8000000000005f407 | 302.705 | 0.030 | n/a | 0.000 | 302.673 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.703 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000005f406 | 302.689 | 0.033 | n/a | 0.000 | 302.654 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.688 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000005f405 | 302.679 | 0.049 | n/a | 0.000 | 302.629 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.677 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000005f404 | 302.661 | 0.040 | n/a | 0.000 | 302.619 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.659 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000005f403 | 302.613 | 0.207 | n/a | 0.000 | 302.403 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 302.610 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000007deea | 301.566 | 0.012 | n/a | 0.000 | 301.552 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.565 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000007dee8 | 301.565 | 0.039 | n/a | 0.000 | 301.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.564 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000007dee9 | 301.561 | 0.013 | n/a | 0.000 | 301.547 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.560 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000007dee7 | 301.553 | 0.044 | n/a | 0.000 | 301.508 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.552 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000007dee6 | 301.533 | 0.056 | n/a | 0.000 | 301.476 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.532 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000060205 | 301.508 | 0.259 | n/a | 0.000 | 301.248 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.507 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000007dee5 | 301.460 | 0.139 | n/a | 0.000 | 301.318 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 301.458 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000060204 | 301.282 | 0.137 | n/a | 0.000 | 301.142 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 301.279 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000060229 | 300.988 | 0.016 | n/a | 0.000 | 300.971 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.987 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000060228 | 300.979 | 0.029 | n/a | 0.000 | 300.949 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.978 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f680000000000060227 | 300.978 | 0.077 | n/a | 0.000 | 300.900 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.977 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000060a8f | 278.905 | 0.015 | n/a | 0.000 | 278.889 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.904 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000060a8e | 278.889 | 0.017 | n/a | 0.000 | 278.871 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.888 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000060a8d | 278.879 | 0.020 | n/a | 0.000 | 278.858 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.878 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a80000000000060a93 | 278.837 | 0.017 | n/a | 0.000 | 278.819 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.836 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (171 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 1.499 | n/a | n/a | n/a | 1.497 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.495 | 1.497 | 0.999 | 0.495 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de20000000000080d32 | 20.397 | 9.670 | n/a | 1.394 | 0.000 | 0.445 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.888 | 11.064 | 0.542 | 8.888 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de200000000000a3af0 | 1.499 | 1.497 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.497 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000080ed4 | 0.948 | 0.946 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.946 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000962b7 | 0.913 | 0.908 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.908 | 0.994 | 0.005 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de200000000000810b4 | 0.910 | 0.909 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.909 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000997c1 | 0.681 | 0.669 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.669 | 0.984 | 0.011 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000088628 | 0.639 | 0.637 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.637 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000099331 | 0.557 | 0.554 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.554 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000084868 | 0.526 | 0.524 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.524 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000009cda0 | 0.495 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.495 | 0.000 | 0.000 | 0.495 | uncovered | none observed |
| 46ad0b0babf04de200000000000a3e85 | 0.479 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.479 | 0.000 | 0.000 | 0.479 | uncovered | none observed |
| 46ad0b0babf04de2000000000008fd5e | 0.478 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.478 | 0.000 | 0.000 | 0.478 | uncovered | none observed |
| 46ad0b0babf04de200000000000997c0 | 0.438 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.438 | 0.000 | 0.000 | 0.438 | uncovered | none observed |
| 46ad0b0babf04de20000000000099369 | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| 46ad0b0babf04de200000000000a0b6a | 0.415 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.415 | 0.000 | 0.000 | 0.415 | uncovered | none observed |
| 46ad0b0babf04de20000000000099357 | 0.409 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.409 | 0.000 | 0.000 | 0.409 | uncovered | none observed |
| 46ad0b0babf04de20000000000099495 | 0.406 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.406 | 0.000 | 0.000 | 0.406 | uncovered | none observed |
| 46ad0b0babf04de2000000000009c4df | 0.398 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.398 | 0.000 | 0.000 | 0.398 | uncovered | none observed |
| 46ad0b0babf04de200000000000996c2 | 0.394 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.394 | 0.000 | 0.000 | 0.394 | uncovered | none observed |
| 46ad0b0babf04de2000000000009961b | 0.391 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.391 | 0.000 | 0.000 | 0.391 | uncovered | none observed |

## P4 / p4h1 / read (193 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 1.428 | n/a | n/a | n/a | 0.602 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.428 | 0.602 | 0.996 | 1.428 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de200000000000a50ae | 9.052 | 2.186 | n/a | 0.000 | 0.000 | 0.801 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.065 | 2.186 | 0.241 | 6.065 | node-14/thread-4/socket.wait-first-byte | none observed |
| 46ad0b0babf04de200000000000c158b | 1.428 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.428 | 0.000 | 0.000 | 1.428 | uncovered | none observed |
| 46ad0b0babf04de200000000000b6f67 | 0.604 | 0.602 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.602 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000ad949 | 0.572 | 0.569 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.569 | 0.996 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de200000000000ca23c | 0.554 | 0.530 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 0.530 | 0.957 | 0.024 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de200000000000b6ed2 | 0.549 | 0.536 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.536 | 0.976 | 0.013 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de200000000000ccc7f | 0.524 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.524 | 0.000 | 0.000 | 0.524 | uncovered | none observed |
| 46ad0b0babf04de200000000000cd0e0 | 0.508 | 0.503 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.503 | 0.991 | 0.005 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de200000000000b8efe | 0.496 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.496 | 0.000 | 0.000 | 0.496 | uncovered | none observed |
| 46ad0b0babf04de200000000000b2325 | 0.470 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.470 | 0.000 | 0.000 | 0.470 | uncovered | none observed |
| 46ad0b0babf04de200000000000bee74 | 0.466 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.466 | 0.000 | 0.000 | 0.466 | uncovered | none observed |
| 46ad0b0babf04de200000000000adf54 | 0.439 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.439 | 0.000 | 0.000 | 0.439 | uncovered | none observed |
| 46ad0b0babf04de200000000000b7f26 | 0.420 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.420 | 0.000 | 0.000 | 0.420 | uncovered | none observed |
| 46ad0b0babf04de200000000000a6dd7 | 0.402 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.402 | 0.000 | 0.000 | 0.402 | uncovered | none observed |
| 46ad0b0babf04de200000000000b7fd7 | 0.395 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.395 | 0.000 | 0.000 | 0.395 | uncovered | none observed |
| 46ad0b0babf04de200000000000c1e79 | 0.388 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.388 | 0.000 | 0.000 | 0.388 | uncovered | none observed |
| 46ad0b0babf04de200000000000be2c5 | 0.388 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.388 | 0.000 | 0.000 | 0.388 | uncovered | none observed |
| 46ad0b0babf04de200000000000aa9d2 | 0.378 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | uncovered | none observed |
| 46ad0b0babf04de200000000000b23b0 | 0.375 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 | uncovered | none observed |
| 46ad0b0babf04de200000000000ca3ec | 0.369 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.369 | 0.000 | 0.000 | 0.369 | uncovered | none observed |

## P4 / p4h3 / read (183 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 1.135 | n/a | n/a | n/a | 1.128 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.493 | 1.128 | 0.998 | 0.493 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de200000000000d21c7 | 10.230 | 1.576 | n/a | 0.000 | 0.000 | 0.535 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.119 | 1.576 | 0.154 | 8.119 | node-14/thread-4/socket.wait-first-byte | none observed |
| 46ad0b0babf04de200000000000dac38 | 1.135 | 1.128 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 1.128 | 0.994 | 0.007 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000dcefa | 1.061 | 1.059 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.059 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.025ms |
| 46ad0b0babf04de200000000000e7126 | 0.766 | 0.764 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.764 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000dac37 | 0.696 | 0.694 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.694 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000f050e | 0.681 | 0.678 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.678 | 0.995 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000d5585 | 0.678 | 0.676 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.676 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000d602b | 0.569 | 0.567 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.567 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000d4171 | 0.565 | 0.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.563 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000e237f | 0.565 | 0.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.563 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000d617a | 0.493 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.493 | 0.000 | 0.000 | 0.493 | uncovered | none observed |
| 46ad0b0babf04de200000000000d5826 | 0.481 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.481 | 0.000 | 0.000 | 0.481 | uncovered | none observed |
| 46ad0b0babf04de200000000000d64af | 0.470 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.470 | 0.000 | 0.000 | 0.470 | uncovered | none observed |
| 46ad0b0babf04de200000000000d6a78 | 0.462 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.462 | 0.000 | 0.000 | 0.462 | uncovered | none observed |
| 46ad0b0babf04de200000000000d58ca | 0.450 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.450 | 0.000 | 0.000 | 0.450 | uncovered | none observed |
| 46ad0b0babf04de200000000000d9c00 | 0.448 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.448 | 0.000 | 0.000 | 0.448 | uncovered | none observed |
| 46ad0b0babf04de200000000000e7d76 | 0.446 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.446 | 0.000 | 0.000 | 0.446 | uncovered | none observed |
| 46ad0b0babf04de200000000000f518b | 0.444 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 | uncovered | none observed |
| 46ad0b0babf04de200000000000e3d64 | 0.426 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.426 | 0.000 | 0.000 | 0.426 | uncovered | none observed |
| 46ad0b0babf04de200000000000d6a40 | 0.405 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.405 | 0.000 | 0.000 | 0.405 | uncovered | none observed |

## P4 / p4h10 / read (177 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 1.758 | n/a | n/a | n/a | 1.505 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.499 | 1.505 | 0.998 | 0.499 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de200000000000f9da8 | 6.462 | 1.505 | n/a | 0.000 | 0.000 | 0.431 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.526 | 1.505 | 0.233 | 4.526 | node-14/thread-4/socket.wait-first-byte | none observed |
| 46ad0b0babf04de200000000001145c0 | 1.758 | 1.756 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.756 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000fd504 | 0.799 | 0.796 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.796 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000104765 | 0.746 | 0.743 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.743 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000010fbc7 | 0.745 | 0.731 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.731 | 0.982 | 0.013 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000fa7b2 | 0.651 | 0.649 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.649 | 0.996 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de2000000000011c718 | 0.602 | 0.600 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.600 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000fd52a | 0.598 | 0.597 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.597 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de200000000000fd6b2 | 0.554 | 0.551 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.551 | 0.994 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de20000000000121c94 | 0.538 | 0.536 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.536 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 46ad0b0babf04de2000000000010ff15 | 0.531 | 0.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.529 | 0.995 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de200000000000fdcf2 | 0.525 | 0.521 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.521 | 0.992 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 46ad0b0babf04de200000000000fd38d | 0.499 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.499 | 0.000 | 0.000 | 0.499 | uncovered | none observed |
| 46ad0b0babf04de2000000000010df95 | 0.465 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.465 | 0.000 | 0.000 | 0.465 | uncovered | none observed |
| 46ad0b0babf04de2000000000010c931 | 0.459 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.459 | 0.000 | 0.000 | 0.459 | uncovered | none observed |
| 46ad0b0babf04de200000000000fd339 | 0.453 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.453 | 0.000 | 0.000 | 0.453 | uncovered | none observed |
| 46ad0b0babf04de200000000000fd365 | 0.444 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 | uncovered | none observed |
| 46ad0b0babf04de2000000000011ce5a | 0.423 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.423 | 0.000 | 0.000 | 0.423 | uncovered | none observed |
| 46ad0b0babf04de20000000000109bc2 | 0.419 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.419 | 0.000 | 0.000 | 0.419 | uncovered | none observed |
| 46ad0b0babf04de200000000000fd325 | 0.400 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.400 | 0.000 | 0.000 | 0.400 | uncovered | none observed |

## P5 / presweep / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 265.364 | n/a | n/a | n/a | 20.252 | n/a | 3.381 | 265.327 | 0.589 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.796 | 265.363 | 1.000 | 17.796 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a742d814859877a8000000000006de8a | 265.547 | 0.116 | n/a | 0.000 | 265.429 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.545 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000006de8b | 265.530 | 0.026 | n/a | 0.000 | 265.502 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.529 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000006edc1 | 265.364 | 0.035 | n/a | 0.000 | 265.327 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.363 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000006edc0 | 265.283 | 0.151 | n/a | 0.000 | 265.130 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.281 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000006edd6 | 265.150 | 0.024 | n/a | 0.000 | 265.125 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.149 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000006edd5 | 265.138 | 0.055 | n/a | 0.000 | 265.082 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.137 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7cb1af0fb7f81f68000000000006edd4 | 265.102 | 0.029 | n/a | 0.000 | 265.072 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.101 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000012fcf3 | 264.963 | 0.127 | n/a | 0.000 | 264.834 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.961 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000006deaa | 264.484 | 0.033 | n/a | 0.000 | 264.449 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.481 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000006deab | 264.452 | 0.022 | n/a | 0.000 | 264.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.449 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a742d814859877a8000000000006deac | 264.385 | 0.024 | n/a | 0.000 | 264.359 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.383 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000012fd05 | 263.656 | 0.129 | n/a | 0.000 | 263.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.654 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000012fd2a | 262.407 | 0.029 | n/a | 0.000 | 262.376 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.405 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000012fd2b | 262.379 | 0.019 | n/a | 0.000 | 262.358 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.377 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000012fd47 | 261.502 | 0.026 | n/a | 0.000 | 261.474 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 261.500 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de2000000000012fd48 | 261.483 | 0.017 | n/a | 0.000 | 261.464 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 261.481 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 46ad0b0babf04de20000000000122212 | 54.432 | 27.356 | n/a | 2.334 | 0.000 | 0.589 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.153 | 29.690 | 0.545 | 24.153 | node-14/thread-4/socket.wait-first-byte | replica.apply-delta 0.023ms |
| a742d814859877a80000000000061afd | 52.236 | 20.252 | n/a | 3.381 | 0.000 | 0.937 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.666 | 23.633 | 0.452 | 27.666 | node-14/thread-6/socket.wait-first-byte | none observed |
| 7cb1af0fb7f81f680000000000062f14 | 42.634 | 22.320 | n/a | 1.928 | 0.000 | 0.589 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.796 | 24.248 | 0.569 | 17.796 | node-14/thread-5/reader.execute | none observed |
| 7cb1af0fb7f81f680000000000062ecd | 33.920 | 0.212 | n/a | 0.000 | 33.705 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 33.917 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |

## P5 / sweep / read (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 4.107 | n/a | n/a | n/a | 3.714 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 4.098 | 0.997 | 0.015 |
| p99 | 91.881 | n/a | n/a | n/a | 58.917 | n/a | 10.183 | 0.000 | 4.099 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.623 | 68.159 | 1.000 | 19.623 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de20000000000131409 | 91.881 | 58.917 | n/a | 9.242 | 0.000 | 4.099 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.623 | 68.159 | 0.742 | 19.623 | node-14/thread-4/reader.execute | none observed |
| 7cb1af0fb7f81f68000000000006ff7a | 24.702 | 14.049 | n/a | 3.571 | 0.000 | 0.511 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.571 | 17.620 | 0.713 | 6.571 | node-14/thread-5/reader.execute | none observed |
| 0aea6ee5f2ea9adc0000000000000063 | 12.029 | 11.131 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 12.016 | 0.999 | 0.013 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc0000000000000064 | 11.972 | 11.065 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 11.951 | 0.998 | 0.022 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc0000000000000065 | 11.917 | 11.006 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 11.891 | 0.998 | 0.025 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc0000000000000066 | 11.862 | 10.948 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 11.833 | 0.998 | 0.029 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc0000000000000067 | 11.806 | 10.889 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.032 | 11.774 | 0.997 | 0.032 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc0000000000000068 | 11.622 | 10.700 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.037 | 11.585 | 0.997 | 0.037 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc0000000000000069 | 11.575 | 10.650 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 11.536 | 0.997 | 0.039 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc000000000000006a | 11.530 | 10.602 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.043 | 11.488 | 0.996 | 0.043 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc000000000000006b | 11.484 | 10.553 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.046 | 11.438 | 0.996 | 0.046 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc000000000000006c | 11.438 | 10.502 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.050 | 11.388 | 0.996 | 0.050 | node-14/thread-7/replica.pull-at | none observed |
| 0aea6ee5f2ea9adc000000000000006d | 11.392 | 10.454 | n/a | 0.885 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 11.339 | 0.995 | 0.053 | node-14/thread-7/replica.pull-at | none observed |
| a742d814859877a8000000000006f51f | 11.310 | 11.306 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 11.306 | 1.000 | 0.004 | node-14/thread-6/replica.pull-at | replica.apply-delta 0.042ms; replica.apply-delta 0.034ms |
| a742d814859877a8000000000006f520 | 11.290 | 11.278 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 11.278 | 0.999 | 0.012 | node-14/thread-6/replica.pull-at | replica.apply-delta 0.042ms; replica.apply-delta 0.034ms |
| 0aea6ee5f2ea9adc00000000000000b3 | 10.744 | 0.550 | n/a | 10.183 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 10.732 | 0.999 | 0.011 | node-14/thread-7/node.gc | none observed |
| 0aea6ee5f2ea9adc00000000000000b4 | 10.730 | 0.528 | n/a | 10.183 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 10.710 | 0.998 | 0.020 | node-14/thread-7/node.gc | none observed |
| 0aea6ee5f2ea9adc00000000000000b5 | 10.712 | 0.507 | n/a | 10.183 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 10.690 | 0.998 | 0.022 | node-14/thread-7/node.gc | none observed |
| 0aea6ee5f2ea9adc00000000000000b6 | 10.692 | 0.487 | n/a | 10.183 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 10.669 | 0.998 | 0.023 | node-14/thread-7/node.gc | none observed |
| 7cb1af0fb7f81f680000000000070480 | 10.600 | 10.596 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 10.596 | 1.000 | 0.003 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.034ms; replica.apply-delta 0.022ms |

## P1 / outside-phases / read (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.189 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 |
| p99 | 0.344 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46ad0b0babf04de20000000000131a3d | 0.344 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 | uncovered | none observed |
| 46ad0b0babf04de20000000000131a3e | 0.323 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.323 | 0.000 | 0.000 | 0.323 | uncovered | none observed |
| 7cb1af0fb7f81f680000000000070a20 | 0.225 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | uncovered | none observed |
| 7cb1af0fb7f81f680000000000070a21 | 0.215 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | uncovered | none observed |
| 46ad0b0babf04de20000000000131a3f | 0.210 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | uncovered | none observed |
| 7cb1af0fb7f81f680000000000070a22 | 0.205 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | uncovered | none observed |
| 46ad0b0babf04de20000000000131a40 | 0.202 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | uncovered | none observed |
| 46ad0b0babf04de20000000000131a41 | 0.189 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | uncovered | none observed |
| a742d814859877a8000000000006fb69 | 0.164 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | uncovered | none observed |
| a742d814859877a8000000000006fb6a | 0.150 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | uncovered | none observed |
| a742d814859877a8000000000006fb6b | 0.140 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | uncovered | none observed |
| a742d814859877a8000000000006fb6c | 0.133 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | uncovered | none observed |
| 7cb1af0fb7f81f680000000000070a23 | 0.125 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | uncovered | none observed |
| 46ad0b0babf04de20000000000131a42 | 0.074 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | uncovered | none observed |
| 7cb1af0fb7f81f680000000000070a24 | 0.068 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | uncovered | none observed |

## P1 / baseline / read (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.073 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 |
| p99 | 0.142 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7cb1af0fb7f81f68000000000000b4d6 | 0.142 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | uncovered | none observed |
| 7cb1af0fb7f81f68000000000000b4d4 | 0.073 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | uncovered | none observed |
| 7cb1af0fb7f81f68000000000000b4d5 | 0.030 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.000 | 0.000 | 0.030 | uncovered | none observed |

## P3 / outside-phases / read (27 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.076 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.932 | 200.956 | 0.014 | n/a | 0.100 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 205.236 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.438 | 203.450 | 6.209 | n/a | 0.212 | 0.000 | n/a | n/a | 66.713 | 0.000 | 0.000 | 66.713 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a33615693087657000000000000005d | 205.236 | 0.000 | n/a | 0.000 | 0.000 | 1.477 | 203.450 | 0.014 | n/a | 0.141 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-69/journal/page | none observed |
| 7a33615693087657000000000000005a | 204.641 | 0.000 | n/a | 0.000 | 0.000 | 3.438 | 200.958 | 0.012 | n/a | 0.103 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| 7a336156930876570000000000000099 | 203.171 | 0.000 | n/a | 0.000 | 0.000 | 2.122 | 200.740 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-67/journal/page | none observed |
| 7a336156930876570000000000000007 | 203.119 | 0.000 | n/a | 0.000 | 0.000 | 1.183 | 201.007 | 0.008 | n/a | 0.090 | 0.000 | n/a | n/a | 0.832 | 0.000 | 0.000 | 0.832 | gw-r/thread-51/journal/page | none observed |
| 7a336156930876570000000000000095 | 202.752 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 201.321 | 0.019 | n/a | 0.149 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 7a336156930876570000000000000005 | 202.745 | 0.000 | n/a | 0.000 | 0.000 | 1.121 | 201.244 | 0.019 | n/a | 0.212 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-51/journal/page | none observed |
| 7a336156930876570000000000000075 | 202.716 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 201.242 | 0.018 | n/a | 0.176 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-69/journal/page | none observed |
| 7a3361569308765700000000000000bd | 202.680 | 0.000 | n/a | 0.000 | 0.000 | 1.329 | 201.029 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-66/journal/page | none observed |
| 7a3361569308765700000000000000bf | 202.499 | 0.000 | n/a | 0.000 | 0.000 | 0.950 | 201.236 | 0.034 | n/a | 0.142 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-66/journal/page | none observed |
| 7a336156930876570000000000000058 | 202.401 | 0.000 | n/a | 0.000 | 0.000 | 1.014 | 201.030 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-69/journal/page | none observed |
| 7a336156930876570000000000000094 | 202.369 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 201.285 | 0.024 | n/a | 0.138 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000057 | 202.283 | 0.000 | n/a | 0.000 | 0.000 | 1.091 | 200.956 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-68/journal/page | none observed |
| 7a336156930876570000000000000006 | 202.206 | 0.000 | n/a | 0.000 | 0.000 | 0.977 | 200.896 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-50/journal/page | none observed |
| 7a33615693087657000000000000005b | 202.076 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 201.049 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 7a3361569308765700000000000000be | 202.030 | 0.000 | n/a | 0.000 | 0.000 | 0.609 | 201.153 | 0.023 | n/a | 0.129 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-67/journal/page | none observed |
| 7a336156930876570000000000000097 | 202.016 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 201.093 | 0.019 | n/a | 0.140 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 7a336156930876570000000000000076 | 201.934 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 200.834 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-49/journal/page | none observed |
| 7a336156930876570000000000000073 | 201.755 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 200.892 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 7a336156930876570000000000000096 | 201.664 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 200.814 | 0.014 | n/a | 0.097 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 7a3361569308765700000000000000bc | 201.588 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 200.743 | 0.024 | n/a | 0.083 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-67/journal/page | none observed |

## P3 / outside-phases / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 563.845 | n/a | n/a | n/a | 2.406 | n/a | 0.000 | 0.000 | 0.887 | 556.397 | 0.017 | n/a | 0.089 | 0.000 | n/a | n/a | 0.162 | 2.406 | 0.006 | 0.162 |
| p99 | 1004.880 | n/a | n/a | n/a | 86.076 | n/a | 3.341 | 0.000 | 2.847 | 1001.500 | 2.779 | n/a | 0.281 | 0.000 | n/a | n/a | 21.282 | 89.417 | 0.787 | 21.282 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000052 | 1004.880 | 0.147 | n/a | 0.000 | 0.000 | 2.335 | 1001.105 | 0.017 | n/a | 0.142 | 0.000 | n/a | n/a | 1.133 | 0.147 | 0.000 | 1.133 | gw-r/thread-44/journal/page | none observed |
| 6e5f18807d6f379c0000000000000017 | 1004.634 | 0.188 | n/a | 0.000 | 0.000 | 1.412 | 1001.455 | 0.016 | n/a | 0.281 | 0.000 | n/a | n/a | 1.282 | 0.188 | 0.000 | 1.282 | gw-r/thread-46/journal/page | none observed |
| 6e5f18807d6f379c0000000000000018 | 1004.171 | 0.231 | n/a | 0.000 | 0.000 | 1.097 | 1001.500 | 0.014 | n/a | 0.183 | 0.000 | n/a | n/a | 1.145 | 0.231 | 0.000 | 1.145 | gw-r/thread-50/journal/page | none observed |
| 6e5f18807d6f379c0000000000000019 | 1003.136 | 0.174 | n/a | 0.000 | 0.000 | 0.734 | 1000.931 | 0.015 | n/a | 0.161 | 0.000 | n/a | n/a | 1.121 | 0.174 | 0.000 | 1.121 | gw-r/thread-49/journal/page | none observed |
| 6e5f18807d6f379c000000000000007d | 989.077 | 2.406 | n/a | 0.000 | 0.000 | 0.628 | 985.900 | 0.013 | n/a | 0.068 | 0.000 | n/a | n/a | 0.062 | 2.406 | 0.002 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c000000000000007c | 932.783 | 2.337 | n/a | 0.000 | 0.000 | 0.820 | 929.457 | 0.020 | n/a | 0.089 | 0.000 | n/a | n/a | 0.061 | 2.337 | 0.003 | 0.061 | gw-r/thread-67/journal/page | none observed |
| 6e5f18807d6f379c000000000000005d | 563.845 | 6.553 | n/a | 0.000 | 0.000 | 0.650 | 556.397 | 0.019 | n/a | 0.110 | 0.000 | n/a | n/a | 0.116 | 6.553 | 0.012 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 6e5f18807d6f379c0000000000000051 | 519.959 | 2.873 | n/a | 0.000 | 0.000 | 1.012 | 515.854 | 0.017 | n/a | 0.105 | 0.000 | n/a | n/a | 0.097 | 2.873 | 0.006 | 0.097 | gw-r/thread-69/journal/page | none observed |
| 6e5f18807d6f379c000000000000004f | 494.805 | 4.843 | n/a | 0.000 | 0.000 | 0.775 | 488.929 | 0.017 | n/a | 0.079 | 0.000 | n/a | n/a | 0.162 | 4.843 | 0.010 | 0.162 | gw-r/thread-51/journal/page | none observed |
| 6e5f18807d6f379c000000000000005c | 295.742 | 2.975 | n/a | 0.000 | 0.000 | 0.978 | 290.745 | 0.892 | n/a | 0.077 | 0.000 | n/a | n/a | 0.074 | 2.975 | 0.010 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c000000000000005f | 127.267 | 2.060 | n/a | 0.000 | 0.000 | 0.887 | 121.449 | 2.779 | n/a | 0.025 | 0.000 | n/a | n/a | 0.067 | 2.060 | 0.016 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 6e5f18807d6f379c000000000000005b | 113.545 | 86.076 | n/a | 3.341 | 0.000 | 2.847 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.282 | 89.417 | 0.787 | 21.282 | node-14/thread-2/replica.fetch-feed | none observed |
| 6e5f18807d6f379c000000000000007a | 10.739 | 7.979 | n/a | 0.000 | 0.000 | 0.518 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.241 | 7.979 | 0.743 | 2.241 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 153.613 | n/a | n/a | n/a | 4.930 | n/a | 0.000 | 0.000 | 0.934 | 148.919 | 0.014 | n/a | 0.161 | 0.000 | n/a | n/a | 0.231 | 4.930 | 0.020 | 0.231 |
| p99 | 817.621 | n/a | n/a | n/a | 29.448 | n/a | 1.826 | 0.000 | 1.283 | 810.967 | 0.025 | n/a | 0.185 | 0.000 | n/a | n/a | 0.281 | 31.275 | 0.340 | 0.281 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c000000000000001d | 817.621 | 4.930 | n/a | 0.000 | 0.000 | 1.283 | 810.967 | 0.014 | n/a | 0.161 | 0.000 | n/a | n/a | 0.265 | 4.930 | 0.006 | 0.265 | gw-r/thread-48/journal/page | none observed |
| 6e5f18807d6f379c000000000000001c | 383.496 | 7.673 | n/a | 0.000 | 0.000 | 0.934 | 374.453 | 0.020 | n/a | 0.185 | 0.000 | n/a | n/a | 0.231 | 7.673 | 0.020 | 0.231 | gw-r/thread-46/journal/page | none observed |
| 6e5f18807d6f379c000000000000001e | 153.613 | 3.373 | n/a | 0.000 | 0.000 | 1.085 | 148.919 | 0.013 | n/a | 0.117 | 0.000 | n/a | n/a | 0.106 | 3.373 | 0.022 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 6e5f18807d6f379c000000000000001a | 91.876 | 29.448 | n/a | 1.826 | 0.000 | 0.590 | 59.537 | 0.025 | n/a | 0.168 | 0.000 | n/a | n/a | 0.281 | 31.275 | 0.340 | 0.281 | gw-r/thread-50/journal/page | none observed |

## P3 / baseline / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 852.032 | n/a | n/a | n/a | 2.398 | n/a | 0.000 | 0.000 | 0.679 | 848.375 | 0.014 | n/a | 0.098 | 0.000 | n/a | n/a | 0.083 | 2.398 | 0.003 | 0.083 |
| p99 | 997.762 | n/a | n/a | n/a | 2.729 | n/a | 0.000 | 0.000 | 1.275 | 994.581 | 0.022 | n/a | 0.171 | 0.000 | n/a | n/a | 0.488 | 2.729 | 0.018 | 0.488 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000023 | 997.762 | 2.313 | n/a | 0.000 | 0.000 | 0.679 | 994.581 | 0.013 | n/a | 0.098 | 0.000 | n/a | n/a | 0.078 | 2.313 | 0.002 | 0.078 | gw-r/thread-68/journal/page | none observed |
| 6e5f18807d6f379c0000000000000020 | 852.032 | 2.398 | n/a | 0.000 | 0.000 | 0.667 | 848.375 | 0.014 | n/a | 0.089 | 0.000 | n/a | n/a | 0.488 | 2.398 | 0.003 | 0.488 | gw-r/thread-68/journal/page | none observed |
| 6e5f18807d6f379c0000000000000021 | 147.872 | 2.729 | n/a | 0.000 | 0.000 | 1.275 | 143.593 | 0.022 | n/a | 0.171 | 0.000 | n/a | n/a | 0.083 | 2.729 | 0.018 | 0.083 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 316.753 | n/a | n/a | n/a | 1.943 | n/a | 0.000 | 0.000 | 0.813 | 308.587 | 0.016 | n/a | 0.146 | 0.000 | n/a | n/a | 0.195 | 1.943 | 0.004 | 0.195 |
| p99 | 1004.193 | n/a | n/a | n/a | 7.036 | n/a | 0.000 | 0.000 | 1.234 | 1001.386 | 0.040 | n/a | 0.171 | 0.000 | n/a | n/a | 28.698 | 7.036 | 0.063 | 28.698 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000029 | 1004.193 | 0.203 | n/a | 0.000 | 0.000 | 1.234 | 1001.386 | 0.016 | n/a | 0.171 | 0.000 | n/a | n/a | 1.183 | 0.203 | 0.000 | 1.183 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c0000000000000027 | 651.820 | 2.343 | n/a | 0.000 | 0.000 | 0.813 | 648.259 | 0.040 | n/a | 0.170 | 0.000 | n/a | n/a | 0.195 | 2.343 | 0.004 | 0.195 | gw-r/thread-46/journal/page | none observed |
| 6e5f18807d6f379c0000000000000025 | 316.753 | 7.036 | n/a | 0.000 | 0.000 | 0.869 | 308.587 | 0.022 | n/a | 0.146 | 0.000 | n/a | n/a | 0.093 | 7.036 | 0.022 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 6e5f18807d6f379c0000000000000024 | 30.993 | 1.943 | n/a | 0.000 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.698 | 1.943 | 0.063 | 28.698 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L4 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 372.018 | n/a | n/a | n/a | 3.064 | n/a | 0.000 | 0.000 | 0.734 | 368.675 | 0.016 | n/a | 0.128 | 0.000 | n/a | n/a | 0.098 | 3.064 | 0.007 | 0.098 |
| p99 | 970.517 | n/a | n/a | n/a | 7.159 | n/a | 0.000 | 0.000 | 1.276 | 962.408 | 0.057 | n/a | 0.152 | 0.000 | n/a | n/a | 27.797 | 7.159 | 0.087 | 27.797 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000030 | 970.517 | 7.159 | n/a | 0.000 | 0.000 | 0.734 | 962.408 | 0.016 | n/a | 0.114 | 0.000 | n/a | n/a | 0.085 | 7.159 | 0.007 | 0.085 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c000000000000002c | 427.742 | 3.064 | n/a | 0.000 | 0.000 | 1.276 | 423.162 | 0.012 | n/a | 0.128 | 0.000 | n/a | n/a | 0.098 | 3.064 | 0.007 | 0.098 | gw-r/thread-49/journal/page | none observed |
| 6e5f18807d6f379c000000000000002e | 372.018 | 2.249 | n/a | 0.000 | 0.000 | 0.851 | 368.675 | 0.020 | n/a | 0.133 | 0.000 | n/a | n/a | 0.090 | 2.249 | 0.006 | 0.090 | gw-r/thread-67/journal/page | none observed |
| 6e5f18807d6f379c000000000000002b | 206.833 | 5.754 | n/a | 0.000 | 0.000 | 0.734 | 199.958 | 0.057 | n/a | 0.152 | 0.000 | n/a | n/a | 0.178 | 5.754 | 0.028 | 0.178 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c000000000000002a | 30.941 | 2.685 | n/a | 0.000 | 0.000 | 0.458 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.797 | 2.685 | 0.087 | 27.797 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 371.643 | n/a | n/a | n/a | 3.115 | n/a | 0.000 | 0.000 | 1.068 | 364.267 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.095 | 3.115 | 0.008 | 0.095 |
| p99 | 996.660 | n/a | n/a | n/a | 4.711 | n/a | 0.000 | 0.000 | 3.950 | 991.894 | 0.195 | n/a | 1.150 | 0.000 | n/a | n/a | 0.203 | 4.711 | 0.029 | 0.203 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000031 | 996.660 | 3.499 | n/a | 0.000 | 0.000 | 1.068 | 991.894 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.088 | 3.499 | 0.004 | 0.088 | gw-r/thread-69/journal/page | none observed |
| 6e5f18807d6f379c0000000000000036 | 574.167 | 4.711 | n/a | 0.000 | 0.000 | 2.371 | 566.702 | 0.195 | n/a | 0.093 | 0.000 | n/a | n/a | 0.095 | 4.711 | 0.008 | 0.095 | gw-r/thread-67/journal/page | none observed |
| 6e5f18807d6f379c0000000000000032 | 371.643 | 3.115 | n/a | 0.000 | 0.000 | 3.950 | 364.267 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.203 | 3.115 | 0.008 | 0.203 | gw-r/thread-48/journal/page | none observed |
| 6e5f18807d6f379c0000000000000033 | 91.633 | 2.668 | n/a | 0.000 | 0.000 | 0.995 | 86.705 | 0.013 | n/a | 1.150 | 0.000 | n/a | n/a | 0.101 | 2.668 | 0.029 | 0.101 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 419.984 | n/a | n/a | n/a | 3.079 | n/a | 0.000 | 0.000 | 1.290 | 414.781 | 0.017 | n/a | 0.093 | 0.000 | n/a | n/a | 0.100 | 3.079 | 0.007 | 0.100 |
| p99 | 879.499 | n/a | n/a | n/a | 13.102 | n/a | 0.000 | 0.000 | 1.907 | 871.719 | 0.179 | n/a | 0.136 | 0.000 | n/a | n/a | 0.343 | 13.102 | 0.021 | 0.343 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000037 | 879.499 | 6.184 | n/a | 0.000 | 0.000 | 1.357 | 871.719 | 0.017 | n/a | 0.093 | 0.000 | n/a | n/a | 0.129 | 6.184 | 0.007 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 6e5f18807d6f379c000000000000003b | 633.304 | 13.102 | n/a | 0.000 | 0.000 | 1.290 | 618.467 | 0.014 | n/a | 0.089 | 0.000 | n/a | n/a | 0.343 | 13.102 | 0.021 | 0.343 | gw-r/thread-68/journal/page | none observed |
| 6e5f18807d6f379c000000000000003a | 419.984 | 3.079 | n/a | 0.000 | 0.000 | 1.907 | 414.781 | 0.021 | n/a | 0.096 | 0.000 | n/a | n/a | 0.100 | 3.079 | 0.007 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 6e5f18807d6f379c0000000000000039 | 116.122 | 2.366 | n/a | 0.000 | 0.000 | 1.190 | 112.168 | 0.179 | n/a | 0.136 | 0.000 | n/a | n/a | 0.082 | 2.366 | 0.020 | 0.082 | gw-r/thread-69/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 308.508 | n/a | n/a | n/a | 2.275 | n/a | 0.000 | 0.000 | 0.793 | 303.874 | 0.017 | n/a | 0.084 | 0.000 | n/a | n/a | 0.087 | 2.275 | 0.007 | 0.087 |
| p99 | 635.789 | n/a | n/a | n/a | 4.987 | n/a | 0.000 | 0.000 | 2.137 | 632.590 | 0.249 | n/a | 0.101 | 0.000 | n/a | n/a | 0.182 | 4.987 | 0.030 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000040 | 635.789 | 2.275 | n/a | 0.000 | 0.000 | 0.726 | 632.590 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.095 | 2.275 | 0.004 | 0.095 | gw-r/thread-50/journal/page | none observed |
| 6e5f18807d6f379c000000000000003f | 626.519 | 3.147 | n/a | 0.000 | 0.000 | 0.699 | 622.468 | 0.017 | n/a | 0.101 | 0.000 | n/a | n/a | 0.087 | 3.147 | 0.005 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c000000000000003d | 308.508 | 2.085 | n/a | 0.000 | 0.000 | 2.137 | 303.874 | 0.249 | n/a | 0.078 | 0.000 | n/a | n/a | 0.084 | 2.085 | 0.007 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 6e5f18807d6f379c0000000000000042 | 266.490 | 2.063 | n/a | 0.000 | 0.000 | 0.793 | 263.320 | 0.147 | n/a | 0.084 | 0.000 | n/a | n/a | 0.081 | 2.063 | 0.008 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 6e5f18807d6f379c0000000000000043 | 164.527 | 4.987 | n/a | 0.000 | 0.000 | 1.522 | 157.758 | 0.013 | n/a | 0.065 | 0.000 | n/a | n/a | 0.182 | 4.987 | 0.030 | 0.182 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 922.760 | n/a | n/a | n/a | 2.147 | n/a | 0.000 | 0.000 | 0.632 | 919.652 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.076 | 2.147 | 0.002 | 0.076 |
| p99 | 1000.544 | n/a | n/a | n/a | 2.271 | n/a | 0.000 | 0.000 | 2.320 | 995.926 | 0.017 | n/a | 0.104 | 0.000 | n/a | n/a | 0.083 | 2.271 | 0.002 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000046 | 1000.544 | 2.147 | n/a | 0.000 | 0.000 | 2.320 | 995.926 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.076 | 2.147 | 0.002 | 0.076 | gw-r/thread-66/journal/page | none observed |
| 6e5f18807d6f379c0000000000000045 | 922.760 | 2.271 | n/a | 0.000 | 0.000 | 0.632 | 919.652 | 0.017 | n/a | 0.104 | 0.000 | n/a | n/a | 0.083 | 2.271 | 0.002 | 0.083 | gw-r/thread-68/journal/page | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 406.766 | n/a | n/a | n/a | 4.396 | n/a | 0.000 | 0.000 | 0.714 | 400.625 | 0.018 | n/a | 0.066 | 0.000 | n/a | n/a | 0.092 | 4.396 | 0.012 | 0.092 |
| p99 | 989.877 | n/a | n/a | n/a | 6.236 | n/a | 0.000 | 0.000 | 2.031 | 986.740 | 0.021 | n/a | 0.105 | 0.000 | n/a | n/a | 0.217 | 6.236 | 0.029 | 0.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000047 | 989.877 | 2.312 | n/a | 0.000 | 0.000 | 0.639 | 986.740 | 0.015 | n/a | 0.091 | 0.000 | n/a | n/a | 0.081 | 2.312 | 0.002 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c0000000000000048 | 452.045 | 6.236 | n/a | 0.000 | 0.000 | 2.031 | 443.435 | 0.021 | n/a | 0.105 | 0.000 | n/a | n/a | 0.217 | 6.236 | 0.014 | 0.217 | gw-r/thread-44/journal/page | none observed |
| 6e5f18807d6f379c000000000000004a | 406.766 | 4.855 | n/a | 0.000 | 0.000 | 1.023 | 400.625 | 0.019 | n/a | 0.062 | 0.000 | n/a | n/a | 0.182 | 4.855 | 0.012 | 0.182 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c000000000000004b | 153.976 | 4.396 | n/a | 0.000 | 0.000 | 0.714 | 148.690 | 0.018 | n/a | 0.066 | 0.000 | n/a | n/a | 0.092 | 4.396 | 0.029 | 0.092 | gw-r/thread-47/journal/page | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 996.961 | n/a | n/a | n/a | 2.290 | n/a | 0.000 | 0.000 | 0.640 | 985.723 | 0.048 | n/a | 0.088 | 0.000 | n/a | n/a | 0.093 | 2.290 | 0.002 | 0.093 |
| p99 | 998.100 | n/a | n/a | n/a | 9.675 | n/a | 0.000 | 0.000 | 1.240 | 994.827 | 0.162 | n/a | 0.124 | 0.000 | n/a | n/a | 0.151 | 9.675 | 0.010 | 0.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c000000000000004d | 998.100 | 2.290 | n/a | 0.000 | 0.000 | 0.640 | 994.827 | 0.162 | n/a | 0.088 | 0.000 | n/a | n/a | 0.093 | 2.290 | 0.002 | 0.093 | gw-r/thread-67/journal/page | none observed |
| 6e5f18807d6f379c000000000000004e | 996.961 | 9.675 | n/a | 0.000 | 0.000 | 1.240 | 985.723 | 0.048 | n/a | 0.124 | 0.000 | n/a | n/a | 0.151 | 9.675 | 0.010 | 0.151 | gw-r/thread-51/journal/page | none observed |

## P3 / p4h1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 207.801 | n/a | n/a | n/a | 2.145 | n/a | 0.000 | 0.000 | 0.590 | 202.297 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.146 | 2.145 | 0.006 | 0.146 |
| p99 | 926.960 | n/a | n/a | n/a | 4.555 | n/a | 0.000 | 0.000 | 0.797 | 923.688 | 0.176 | n/a | 0.262 | 0.000 | n/a | n/a | 34.549 | 4.555 | 0.058 | 34.549 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000054 | 926.960 | 2.114 | n/a | 0.000 | 0.000 | 0.797 | 923.688 | 0.013 | n/a | 0.262 | 0.000 | n/a | n/a | 0.086 | 2.114 | 0.002 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c0000000000000055 | 803.743 | 4.555 | n/a | 0.000 | 0.000 | 0.590 | 798.253 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.258 | 4.555 | 0.006 | 0.258 | gw-r/thread-66/journal/page | none observed |
| 6e5f18807d6f379c0000000000000056 | 207.801 | 4.333 | n/a | 0.000 | 0.000 | 0.741 | 202.297 | 0.176 | n/a | 0.108 | 0.000 | n/a | n/a | 0.146 | 4.333 | 0.021 | 0.146 | gw-r/thread-50/journal/page | none observed |
| 6e5f18807d6f379c0000000000000053 | 36.965 | 2.145 | n/a | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.549 | 2.145 | 0.058 | 34.549 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 214.182 | n/a | n/a | n/a | 1.840 | n/a | 0.000 | 0.000 | 0.626 | 211.593 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.091 | 1.840 | 0.009 | 0.091 |
| p99 | 776.251 | n/a | n/a | n/a | 112.404 | n/a | 7.896 | 0.000 | 0.931 | 650.372 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 4.534 | 120.300 | 0.155 | 4.534 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000059 | 776.251 | 112.404 | n/a | 7.896 | 0.000 | 0.931 | 650.372 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 4.534 | 120.300 | 0.155 | 4.534 | gw-r/thread-68/journal/page | none observed |
| 6e5f18807d6f379c0000000000000058 | 214.182 | 1.840 | n/a | 0.000 | 0.000 | 0.626 | 211.593 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.091 | 1.840 | 0.009 | 0.091 | gw-r/thread-66/journal/page | none observed |

## P3 / p4h3 / internal (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 273.588 | n/a | n/a | n/a | 3.137 | n/a | 0.000 | 0.000 | 0.625 | 269.821 | 0.024 | n/a | 0.071 | 0.000 | n/a | n/a | 0.089 | 3.137 | 0.021 | 0.089 |
| p99 | 638.203 | n/a | n/a | n/a | 81.766 | n/a | 3.457 | 0.000 | 0.839 | 586.943 | 0.322 | n/a | 0.198 | 0.000 | n/a | n/a | 40.244 | 85.223 | 0.134 | 40.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000073 | 638.203 | 81.766 | n/a | 3.457 | 0.000 | 0.839 | 549.575 | 0.036 | n/a | 0.165 | 0.000 | n/a | n/a | 2.364 | 85.223 | 0.134 | 2.364 | gw-r/thread-49/journal/page | none observed |
| 6e5f18807d6f379c0000000000000071 | 591.791 | 3.857 | n/a | 0.000 | 0.000 | 0.625 | 586.943 | 0.102 | n/a | 0.198 | 0.000 | n/a | n/a | 0.065 | 3.857 | 0.007 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 6e5f18807d6f379c0000000000000061 | 569.304 | 1.773 | n/a | 0.000 | 0.000 | 0.537 | 566.848 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.064 | 1.773 | 0.003 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 6e5f18807d6f379c0000000000000066 | 294.608 | 4.320 | n/a | 0.000 | 0.000 | 0.619 | 289.515 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.083 | 4.320 | 0.015 | 0.083 | gw-r/thread-50/journal/page | none observed |
| 6e5f18807d6f379c0000000000000068 | 273.833 | 3.137 | n/a | 0.000 | 0.000 | 0.674 | 269.821 | 0.024 | n/a | 0.102 | 0.000 | n/a | n/a | 0.075 | 3.137 | 0.011 | 0.075 | gw-r/thread-66/journal/page | none observed |
| 6e5f18807d6f379c0000000000000069 | 273.588 | 1.800 | n/a | 0.000 | 0.000 | 0.814 | 270.318 | 0.322 | n/a | 0.158 | 0.000 | n/a | n/a | 0.177 | 1.800 | 0.007 | 0.177 | gw-r/thread-50/journal/page | none observed |
| 6e5f18807d6f379c0000000000000065 | 173.979 | 3.797 | n/a | 0.000 | 0.000 | 0.774 | 169.097 | 0.148 | n/a | 0.073 | 0.000 | n/a | n/a | 0.092 | 3.797 | 0.022 | 0.092 | gw-r/thread-67/journal/page | none observed |
| 6e5f18807d6f379c0000000000000062 | 168.139 | 3.584 | n/a | 0.000 | 0.000 | 0.687 | 163.562 | 0.159 | n/a | 0.071 | 0.000 | n/a | n/a | 0.075 | 3.584 | 0.021 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 6e5f18807d6f379c0000000000000070 | 76.082 | 2.169 | n/a | 0.000 | 0.000 | 0.566 | 73.168 | 0.023 | n/a | 0.066 | 0.000 | n/a | n/a | 0.089 | 2.169 | 0.029 | 0.089 | gw-r/thread-47/journal/page | none observed |
| 6e5f18807d6f379c000000000000006e | 42.090 | 1.572 | n/a | 0.000 | 0.000 | 0.274 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.244 | 1.572 | 0.037 | 40.244 | node-14/thread-2/socket.wait-first-byte | none observed |
| 6e5f18807d6f379c000000000000006c | 27.083 | 2.107 | n/a | 0.000 | 0.000 | 0.294 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.681 | 2.107 | 0.078 | 24.681 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 128.016 | n/a | n/a | n/a | 85.057 | n/a | 3.250 | 0.000 | 0.957 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.453 | 90.679 | 0.608 | 2.453 |
| p99 | 197.091 | n/a | n/a | n/a | 100.938 | n/a | 8.730 | 0.000 | 1.318 | 119.507 | 0.835 | n/a | 0.077 | 0.000 | n/a | n/a | 27.775 | 109.669 | 0.872 | 27.775 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000077 | 197.091 | 70.975 | n/a | 3.147 | 0.000 | 1.318 | 119.507 | 0.749 | n/a | 0.066 | 0.000 | n/a | n/a | 1.328 | 74.122 | 0.376 | 1.328 | gw-r/thread-51/journal/page | none observed |
| 6e5f18807d6f379c0000000000000076 | 166.249 | 85.057 | n/a | 5.623 | 0.000 | 1.293 | 72.718 | 0.015 | n/a | 0.077 | 0.000 | n/a | n/a | 1.466 | 90.679 | 0.545 | 1.466 | node-14/thread-2/replica.fetch-feed | none observed |
| 6e5f18807d6f379c0000000000000075 | 140.137 | 82.583 | n/a | 2.635 | 0.000 | 1.119 | 50.469 | 0.835 | n/a | 0.042 | 0.000 | n/a | n/a | 2.453 | 85.219 | 0.608 | 2.453 | node-14/thread-2/replica.fetch-feed | none observed |
| 6e5f18807d6f379c0000000000000079 | 128.016 | 100.938 | n/a | 8.730 | 0.000 | 0.917 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.431 | 109.669 | 0.857 | 17.431 | node-14/thread-2/replica.fetch-feed | none observed |
| 6e5f18807d6f379c0000000000000078 | 120.085 | 88.103 | n/a | 3.250 | 0.000 | 0.957 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.775 | 91.354 | 0.761 | 27.775 | node-14/thread-2/replica.fetch-feed | none observed |
| 6e5f18807d6f379c0000000000000074 | 104.243 | 85.987 | n/a | 4.918 | 0.000 | 0.612 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.726 | 90.905 | 0.872 | 12.726 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 306.544 | n/a | n/a | n/a | 3.532 | n/a | 0.000 | 0.000 | 1.125 | 301.560 | 0.021 | n/a | 0.081 | 0.000 | n/a | n/a | 1.119 | 3.532 | 0.020 | 1.119 |
| p99 | 1004.803 | n/a | n/a | n/a | 9.340 | n/a | 0.000 | 0.000 | 2.942 | 1001.523 | 0.022 | n/a | 0.159 | 0.000 | n/a | n/a | 14.604 | 9.340 | 0.333 | 14.604 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000080 | 1004.803 | 0.159 | n/a | 0.000 | 0.000 | 1.833 | 1001.523 | 0.021 | n/a | 0.148 | 0.000 | n/a | n/a | 1.119 | 0.159 | 0.000 | 1.119 | gw-r/thread-44/journal/page | none observed |
| 6e5f18807d6f379c0000000000000083 | 469.965 | 9.340 | n/a | 0.000 | 0.000 | 2.942 | 457.354 | 0.021 | n/a | 0.159 | 0.000 | n/a | n/a | 0.148 | 9.340 | 0.020 | 0.148 | gw-r/thread-50/journal/page | none observed |
| 6e5f18807d6f379c0000000000000082 | 306.544 | 3.631 | n/a | 0.000 | 0.000 | 1.125 | 301.560 | 0.022 | n/a | 0.081 | 0.000 | n/a | n/a | 0.125 | 3.631 | 0.012 | 0.125 | gw-r/thread-68/journal/page | none observed |
| 6e5f18807d6f379c000000000000007f | 17.776 | 2.860 | n/a | 0.000 | 0.000 | 0.312 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.604 | 2.860 | 0.161 | 14.604 | node-14/thread-2/socket.wait-first-byte | none observed |
| 6e5f18807d6f379c0000000000000081 | 10.611 | 3.532 | n/a | 0.000 | 0.000 | 0.269 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.811 | 3.532 | 0.333 | 6.811 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 208.703 | n/a | n/a | n/a | 2.208 | n/a | 0.000 | 0.000 | 0.850 | 196.559 | 0.015 | n/a | 0.074 | 0.000 | n/a | n/a | 0.065 | 2.208 | 0.010 | 0.065 |
| p99 | 988.888 | n/a | n/a | n/a | 9.690 | n/a | 0.000 | 0.000 | 2.923 | 985.614 | 0.018 | n/a | 0.207 | 0.000 | n/a | n/a | 4.434 | 9.690 | 0.277 | 4.434 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000089 | 988.888 | 2.260 | n/a | 0.000 | 0.000 | 0.850 | 985.614 | 0.018 | n/a | 0.081 | 0.000 | n/a | n/a | 0.065 | 2.260 | 0.002 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 6e5f18807d6f379c000000000000008a | 639.444 | 2.208 | n/a | 0.000 | 0.000 | 0.792 | 636.297 | 0.015 | n/a | 0.074 | 0.000 | n/a | n/a | 0.057 | 2.208 | 0.003 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 6e5f18807d6f379c0000000000000087 | 208.703 | 9.690 | n/a | 0.000 | 0.000 | 2.083 | 196.559 | 0.016 | n/a | 0.207 | 0.000 | n/a | n/a | 0.147 | 9.690 | 0.046 | 0.147 | gw-r/thread-69/journal/page | none observed |
| 6e5f18807d6f379c000000000000008c | 158.633 | 1.614 | n/a | 0.000 | 0.000 | 2.923 | 153.955 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.057 | 1.614 | 0.010 | 0.057 | gw-r/thread-68/journal/page | none observed |
| 6e5f18807d6f379c0000000000000086 | 6.825 | 1.892 | n/a | 0.000 | 0.000 | 0.499 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.434 | 1.892 | 0.277 | 4.434 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / sweep / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.947 | n/a | n/a | n/a | 1.767 | n/a | 0.000 | 0.000 | 0.331 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.884 | 1.767 | 0.096 | 5.884 |
| p99 | 1002.761 | n/a | n/a | n/a | 5.184 | n/a | 0.000 | 0.000 | 2.982 | 1000.771 | 0.012 | n/a | 0.141 | 0.000 | n/a | n/a | 18.146 | 5.184 | 0.455 | 18.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6e5f18807d6f379c0000000000000094 | 1002.761 | 0.109 | n/a | 0.000 | 0.000 | 0.632 | 1000.771 | 0.012 | n/a | 0.141 | 0.000 | n/a | n/a | 1.096 | 0.109 | 0.000 | 1.096 | gw-r/thread-48/journal/page | none observed |
| 6e5f18807d6f379c0000000000000091 | 20.292 | 1.797 | n/a | 0.000 | 0.000 | 0.349 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.146 | 1.797 | 0.089 | 18.146 | node-14/thread-2/socket.wait-first-byte | none observed |
| 6e5f18807d6f379c000000000000008f | 18.647 | 1.667 | n/a | 0.000 | 0.000 | 0.317 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.663 | 1.667 | 0.089 | 16.663 | node-14/thread-2/socket.wait-first-byte | none observed |
| 6e5f18807d6f379c000000000000008d | 17.071 | 1.641 | n/a | 0.000 | 0.000 | 0.264 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.165 | 1.641 | 0.096 | 15.165 | node-14/thread-2/socket.wait-first-byte | none observed |
| 6e5f18807d6f379c0000000000000093 | 11.947 | 2.855 | n/a | 0.000 | 0.000 | 0.471 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.620 | 2.855 | 0.239 | 8.620 | node-14/thread-2/socket.wait-first-byte | none observed |
| 6e5f18807d6f379c0000000000000092 | 11.398 | 5.184 | n/a | 0.000 | 0.000 | 0.331 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.884 | 5.184 | 0.455 | 5.884 | node-14/thread-2/socket.wait-first-byte | none observed |
| 6e5f18807d6f379c000000000000008e | 9.802 | 1.767 | n/a | 0.000 | 0.000 | 2.982 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.054 | 1.767 | 0.180 | 5.054 | node-14/thread-2/socket.wait-first-byte | none observed |
| 6e5f18807d6f379c0000000000000090 | 7.076 | 1.803 | n/a | 0.000 | 0.000 | 0.317 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.956 | 1.803 | 0.255 | 4.956 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.401 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.686 | 201.067 | 0.017 | n/a | 0.159 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 |
| p99 | 208.746 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.324 | 202.014 | 0.047 | n/a | 0.201 | 0.000 | n/a | n/a | 0.626 | 0.000 | 0.000 | 0.626 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a33615693087657000000000000000b | 208.746 | 0.000 | n/a | 0.000 | 0.000 | 7.324 | 201.135 | 0.017 | n/a | 0.127 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| 7a33615693087657000000000000000d | 204.989 | 0.000 | n/a | 0.000 | 0.000 | 3.550 | 201.067 | 0.018 | n/a | 0.159 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000008 | 204.636 | 0.000 | n/a | 0.000 | 0.000 | 2.121 | 202.014 | 0.013 | n/a | 0.184 | 0.000 | n/a | n/a | 0.304 | 0.000 | 0.000 | 0.304 | gw-r/thread-48/journal/page | none observed |
| 7a336156930876570000000000000009 | 203.848 | 0.000 | n/a | 0.000 | 0.000 | 1.990 | 201.018 | 0.029 | n/a | 0.186 | 0.000 | n/a | n/a | 0.626 | 0.000 | 0.000 | 0.626 | gw-r/thread-44/journal/page | none observed |
| 7a33615693087657000000000000000e | 203.401 | 0.000 | n/a | 0.000 | 0.000 | 1.531 | 201.494 | 0.024 | n/a | 0.201 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-69/journal/page | none observed |
| 7a33615693087657000000000000000f | 202.825 | 0.000 | n/a | 0.000 | 0.000 | 1.301 | 201.197 | 0.013 | n/a | 0.162 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000011 | 147.288 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 146.144 | 0.007 | n/a | 0.107 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| 7a33615693087657000000000000000c | 144.448 | 0.000 | n/a | 0.000 | 0.000 | 1.044 | 143.015 | 0.047 | n/a | 0.158 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-67/journal/page | none observed |
| 7a336156930876570000000000000010 | 140.716 | 0.000 | n/a | 0.000 | 0.000 | 1.686 | 138.785 | 0.009 | n/a | 0.108 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-69/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.073 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 200.983 | 0.013 | n/a | 0.147 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 202.286 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 201.283 | 0.041 | n/a | 0.189 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a336156930876570000000000000014 | 202.286 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 201.283 | 0.032 | n/a | 0.172 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000012 | 202.087 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 201.138 | 0.041 | n/a | 0.189 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000013 | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 200.983 | 0.013 | n/a | 0.147 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-66/journal/page | none observed |
| 7a336156930876570000000000000015 | 179.492 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 178.354 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-66/journal/page | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 119.549 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.349 | 118.396 | 0.019 | n/a | 0.156 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 203.723 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.617 | 201.402 | 8.169 | n/a | 0.190 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a336156930876570000000000000021 | 203.723 | 0.000 | n/a | 0.000 | 0.000 | 1.981 | 201.402 | 0.019 | n/a | 0.190 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-50/journal/page | none observed |
| 7a336156930876570000000000000022 | 202.854 | 0.000 | n/a | 0.000 | 0.000 | 1.280 | 201.261 | 0.022 | n/a | 0.179 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 7a336156930876570000000000000023 | 119.549 | 0.000 | n/a | 0.000 | 0.000 | 0.923 | 118.396 | 0.012 | n/a | 0.080 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-50/journal/page | none observed |
| 7a33615693087657000000000000001f | 86.131 | 0.000 | n/a | 0.000 | 0.000 | 3.617 | 74.061 | 8.169 | n/a | 0.156 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-44/journal/page | none observed |
| 7a336156930876570000000000000020 | 83.174 | 0.000 | n/a | 0.000 | 0.000 | 1.349 | 81.576 | 0.013 | n/a | 0.103 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-67/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.406 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.013 | 0.020 | n/a | 0.138 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 206.790 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.142 | 204.042 | 9.031 | n/a | 0.241 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a336156930876570000000000000027 | 206.790 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 196.925 | 9.031 | n/a | 0.045 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-51/journal/page | none observed |
| 7a33615693087657000000000000002b | 205.090 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 204.042 | 0.017 | n/a | 0.127 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000024 | 203.769 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 202.763 | 0.015 | n/a | 0.149 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-69/journal/page | none observed |
| 7a336156930876570000000000000029 | 202.704 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 201.651 | 0.020 | n/a | 0.155 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-68/journal/page | none observed |
| 7a336156930876570000000000000025 | 202.545 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 201.401 | 0.036 | n/a | 0.241 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-51/journal/page | none observed |
| 7a336156930876570000000000000026 | 202.406 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.274 | 0.014 | n/a | 0.189 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-69/journal/page | none observed |
| 7a33615693087657000000000000002c | 202.103 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 201.013 | 0.022 | n/a | 0.138 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 7a33615693087657000000000000002a | 196.072 | 0.000 | n/a | 0.000 | 0.000 | 1.133 | 188.002 | 6.560 | n/a | 0.148 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-46/journal/page | none observed |
| 7a33615693087657000000000000002d | 166.707 | 0.000 | n/a | 0.000 | 0.000 | 2.142 | 157.431 | 6.952 | n/a | 0.065 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000028 | 105.838 | 0.000 | n/a | 0.000 | 0.000 | 1.432 | 104.126 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.508 | 200.886 | 0.017 | n/a | 0.112 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 203.135 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.027 | 201.355 | 12.900 | n/a | 0.223 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a336156930876570000000000000030 | 203.135 | 0.000 | n/a | 0.000 | 0.000 | 1.989 | 200.886 | 0.017 | n/a | 0.145 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-66/journal/page | none observed |
| 7a336156930876570000000000000031 | 203.031 | 0.000 | n/a | 0.000 | 0.000 | 1.272 | 201.355 | 0.016 | n/a | 0.207 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-50/journal/page | none observed |
| 7a336156930876570000000000000033 | 202.917 | 0.000 | n/a | 0.000 | 0.000 | 1.508 | 201.112 | 0.048 | n/a | 0.147 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 7a336156930876570000000000000034 | 202.375 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 201.166 | 0.046 | n/a | 0.223 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-51/journal/page | none observed |
| 7a33615693087657000000000000002e | 202.367 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.131 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-47/journal/page | none observed |
| 7a336156930876570000000000000036 | 202.015 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 200.993 | 0.014 | n/a | 0.113 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| 7a336156930876570000000000000035 | 185.357 | 0.000 | n/a | 0.000 | 0.000 | 2.344 | 169.908 | 12.900 | n/a | 0.031 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-69/journal/page | none observed |
| 7a336156930876570000000000000032 | 180.672 | 0.000 | n/a | 0.000 | 0.000 | 4.242 | 172.552 | 3.652 | n/a | 0.112 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-66/journal/page | none observed |
| 7a336156930876570000000000000038 | 153.742 | 0.000 | n/a | 0.000 | 0.000 | 5.027 | 139.554 | 9.018 | n/a | 0.033 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-67/journal/page | none observed |
| 7a33615693087657000000000000002f | 81.759 | 0.000 | n/a | 0.000 | 0.000 | 1.592 | 79.892 | 0.012 | n/a | 0.058 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-66/journal/page | none observed |

## P3 / L1024 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.468 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.040 | 201.214 | 0.018 | n/a | 0.143 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 |
| p99 | 203.834 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.773 | 202.191 | 4.168 | n/a | 0.209 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a336156930876570000000000000041 | 203.834 | 0.000 | n/a | 0.000 | 0.000 | 1.602 | 201.833 | 0.061 | n/a | 0.178 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-47/journal/page | none observed |
| 7a336156930876570000000000000040 | 203.695 | 0.000 | n/a | 0.000 | 0.000 | 1.082 | 202.191 | 0.048 | n/a | 0.209 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-49/journal/page | none observed |
| 7a33615693087657000000000000003c | 203.354 | 0.000 | n/a | 0.000 | 0.000 | 1.773 | 201.308 | 0.016 | n/a | 0.143 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-66/journal/page | none observed |
| 7a33615693087657000000000000003a | 202.782 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 201.343 | 0.018 | n/a | 0.144 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-66/journal/page | none observed |
| 7a336156930876570000000000000039 | 202.468 | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 201.214 | 0.037 | n/a | 0.149 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-49/journal/page | none observed |
| 7a33615693087657000000000000003f | 202.455 | 0.000 | n/a | 0.000 | 0.000 | 1.040 | 201.094 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-47/journal/page | none observed |
| 7a33615693087657000000000000003b | 202.090 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 201.079 | 0.015 | n/a | 0.112 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 7a33615693087657000000000000003e | 201.834 | 0.000 | n/a | 0.000 | 0.000 | 0.609 | 200.963 | 0.016 | n/a | 0.113 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 7a336156930876570000000000000042 | 101.134 | 0.000 | n/a | 0.000 | 0.000 | 0.979 | 95.680 | 4.168 | n/a | 0.098 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-49/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.650 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.230 | 0.019 | n/a | 0.139 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 212.375 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.371 | 203.673 | 13.072 | n/a | 0.175 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a336156930876570000000000000049 | 212.375 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 198.339 | 13.072 | n/a | 0.038 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000048 | 209.364 | 0.000 | n/a | 0.000 | 0.000 | 5.371 | 203.673 | 0.016 | n/a | 0.175 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 7a336156930876570000000000000045 | 202.944 | 0.000 | n/a | 0.000 | 0.000 | 1.159 | 201.505 | 0.020 | n/a | 0.156 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-69/journal/page | none observed |
| 7a336156930876570000000000000043 | 202.735 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 201.472 | 0.045 | n/a | 0.167 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-69/journal/page | none observed |
| 7a336156930876570000000000000046 | 202.684 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 201.384 | 0.015 | n/a | 0.170 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-44/journal/page | none observed |
| 7a336156930876570000000000000044 | 202.650 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 201.271 | 0.019 | n/a | 0.139 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 7a33615693087657000000000000004a | 202.220 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 201.230 | 0.017 | n/a | 0.140 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-44/journal/page | none observed |
| 7a33615693087657000000000000004b | 173.264 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 167.733 | 4.356 | n/a | 0.032 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-48/journal/page | none observed |
| 7a33615693087657000000000000004c | 147.177 | 0.000 | n/a | 0.000 | 0.000 | 0.724 | 146.226 | 0.018 | n/a | 0.089 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| 7a336156930876570000000000000047 | 96.134 | 0.000 | n/a | 0.000 | 0.000 | 3.901 | 86.046 | 5.989 | n/a | 0.052 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-69/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.280 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 201.058 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 202.967 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.603 | 201.793 | 0.070 | n/a | 0.209 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a336156930876570000000000000050 | 202.967 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 201.793 | 0.021 | n/a | 0.209 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 7a336156930876570000000000000054 | 202.721 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.544 | 0.018 | n/a | 0.167 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 7a33615693087657000000000000004e | 202.316 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 200.980 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-51/journal/page | none observed |
| 7a336156930876570000000000000053 | 202.315 | 0.000 | n/a | 0.000 | 0.000 | 1.080 | 200.928 | 0.016 | n/a | 0.109 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-68/journal/page | none observed |
| 7a336156930876570000000000000055 | 202.301 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 201.321 | 0.021 | n/a | 0.143 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-68/journal/page | none observed |
| 7a336156930876570000000000000052 | 202.280 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 201.208 | 0.012 | n/a | 0.133 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 7a33615693087657000000000000004f | 202.039 | 0.000 | n/a | 0.000 | 0.000 | 0.746 | 201.058 | 0.015 | n/a | 0.110 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 7a33615693087657000000000000004d | 202.001 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 201.155 | 0.015 | n/a | 0.103 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-50/journal/page | none observed |
| 7a336156930876570000000000000051 | 106.931 | 0.000 | n/a | 0.000 | 0.000 | 1.170 | 105.490 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-49/journal/page | none observed |
| 7a336156930876570000000000000056 | 93.917 | 0.000 | n/a | 0.000 | 0.000 | 1.603 | 92.042 | 0.070 | n/a | 0.093 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h1 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.416 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 201.236 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 203.375 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.497 | 201.653 | 0.032 | n/a | 0.168 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a336156930876570000000000000064 | 203.375 | 0.000 | n/a | 0.000 | 0.000 | 1.497 | 201.497 | 0.032 | n/a | 0.137 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-44/journal/page | none observed |
| 7a336156930876570000000000000063 | 202.763 | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.258 | 0.020 | n/a | 0.159 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-66/journal/page | none observed |
| 7a33615693087657000000000000005e | 202.761 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 201.653 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-66/journal/page | none observed |
| 7a336156930876570000000000000065 | 202.665 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 201.525 | 0.020 | n/a | 0.141 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-66/journal/page | none observed |
| 7a336156930876570000000000000060 | 202.567 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 201.391 | 0.012 | n/a | 0.128 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-66/journal/page | none observed |
| 7a33615693087657000000000000005f | 202.505 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 201.330 | 0.019 | n/a | 0.141 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 7a336156930876570000000000000069 | 202.416 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 201.112 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-50/journal/page | none observed |
| 7a336156930876570000000000000062 | 202.387 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.236 | 0.015 | n/a | 0.168 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 7a336156930876570000000000000068 | 202.047 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 200.924 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-67/journal/page | none observed |
| 7a336156930876570000000000000067 | 201.636 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 200.706 | 0.017 | n/a | 0.105 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-44/journal/page | none observed |
| 7a336156930876570000000000000061 | 139.307 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 138.105 | 0.022 | n/a | 0.086 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-47/journal/page | none observed |
| 7a33615693087657000000000000006a | 133.628 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 132.728 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-67/journal/page | none observed |

## P3 / grow3 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.918 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 200.899 | 0.014 | n/a | 0.102 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 202.295 | n/a | n/a | n/a | 0.515 | n/a | 0.000 | 0.000 | 0.958 | 201.118 | 69.937 | n/a | 0.142 | 0.000 | n/a | n/a | 0.192 | 0.515 | 0.003 | 0.192 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a33615693087657000000000000006f | 202.295 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 201.118 | 0.013 | n/a | 0.142 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 7a33615693087657000000000000006e | 202.177 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 200.899 | 0.014 | n/a | 0.114 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 7a33615693087657000000000000006c | 201.918 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 200.981 | 0.018 | n/a | 0.102 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000070 | 183.370 | 0.515 | n/a | 0.000 | 0.000 | 0.792 | 111.932 | 69.937 | n/a | 0.088 | 0.000 | n/a | n/a | 0.107 | 0.515 | 0.003 | 0.107 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h3 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.323 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 200.599 | 0.015 | n/a | 0.083 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 202.379 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.152 | 201.101 | 30.042 | n/a | 0.136 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a33615693087657000000000000007a | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 1.152 | 200.932 | 0.014 | n/a | 0.119 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-44/journal/page | none observed |
| 7a33615693087657000000000000008a | 202.055 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 200.926 | 0.013 | n/a | 0.136 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| 7a336156930876570000000000000088 | 202.007 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 200.912 | 0.018 | n/a | 0.106 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 7a336156930876570000000000000080 | 201.966 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 201.101 | 0.052 | n/a | 0.092 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-50/journal/page | none observed |
| 7a336156930876570000000000000079 | 201.926 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 201.094 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-67/journal/page | none observed |
| 7a336156930876570000000000000082 | 201.554 | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 200.769 | 0.015 | n/a | 0.083 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-66/journal/page | none observed |
| 7a33615693087657000000000000007e | 201.468 | 0.000 | n/a | 0.000 | 0.000 | 0.522 | 200.740 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-51/journal/page | none observed |
| 7a336156930876570000000000000087 | 201.323 | 0.000 | n/a | 0.000 | 0.000 | 0.475 | 200.599 | 0.017 | n/a | 0.126 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-47/journal/page | none observed |
| 7a33615693087657000000000000007d | 170.852 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 170.029 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-50/journal/page | none observed |
| 7a33615693087657000000000000007c | 159.546 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 158.714 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-67/journal/page | none observed |
| 7a336156930876570000000000000089 | 143.999 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 139.007 | 3.900 | n/a | 0.058 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-67/journal/page | none observed |
| 7a33615693087657000000000000007b | 124.045 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 121.121 | 1.827 | n/a | 0.056 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-67/journal/page | none observed |
| 7a33615693087657000000000000007f | 73.420 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 42.312 | 30.042 | n/a | 0.034 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000086 | 73.394 | 0.000 | n/a | 0.000 | 0.000 | 0.480 | 70.022 | 2.753 | n/a | 0.031 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-69/journal/page | none observed |

## P3 / grow10 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 106.657 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.197 | 88.085 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 |
| p99 | 202.503 | n/a | n/a | n/a | 0.988 | n/a | 0.000 | 0.000 | 2.568 | 201.098 | 79.854 | n/a | 0.117 | 0.000 | n/a | n/a | 0.712 | 0.988 | 0.011 | 0.712 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a33615693087657000000000000008b | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 1.145 | 201.098 | 0.015 | n/a | 0.117 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 7a336156930876570000000000000090 | 151.917 | 0.000 | n/a | 0.000 | 0.000 | 1.197 | 150.064 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.557 | 0.000 | 0.000 | 0.557 | gw-r/thread-66/journal/page | none observed |
| 7a33615693087657000000000000008f | 109.236 | 0.554 | n/a | 0.000 | 0.000 | 2.568 | 98.235 | 7.668 | n/a | 0.083 | 0.000 | n/a | n/a | 0.127 | 0.554 | 0.005 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 7a33615693087657000000000000008c | 106.657 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 25.205 | 79.854 | n/a | 0.086 | 0.000 | n/a | n/a | 0.542 | 0.000 | 0.000 | 0.542 | gw-r/thread-44/gateway.admission-wait | none observed |
| 7a33615693087657000000000000008e | 91.028 | 0.988 | n/a | 0.000 | 0.000 | 1.674 | 88.085 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.190 | 0.988 | 0.011 | 0.190 | gw-r/thread-48/journal/page | none observed |
| 7a336156930876570000000000000092 | 64.097 | 0.000 | n/a | 0.000 | 0.000 | 1.823 | 53.717 | 7.789 | n/a | 0.056 | 0.000 | n/a | n/a | 0.712 | 0.000 | 0.000 | 0.712 | gw-r/thread-46/journal/page | none observed |
| 7a336156930876570000000000000091 | 56.313 | 0.550 | n/a | 0.000 | 0.000 | 1.162 | 54.377 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.117 | 0.550 | 0.010 | 0.117 | gw-r/thread-69/journal/page | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.990 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 200.848 | 0.015 | n/a | 0.100 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 |
| p99 | 202.914 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.376 | 201.543 | 8.903 | n/a | 0.296 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a33615693087657000000000000009b | 202.914 | 0.000 | n/a | 0.000 | 0.000 | 1.376 | 201.188 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-68/journal/page | none observed |
| 7a33615693087657000000000000009a | 202.871 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 201.543 | 0.045 | n/a | 0.296 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 7a3361569308765700000000000000a1 | 202.770 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 201.345 | 0.015 | n/a | 0.185 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-68/journal/page | none observed |
| 7a3361569308765700000000000000a7 | 202.547 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 201.400 | 0.039 | n/a | 0.151 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-51/journal/page | none observed |
| 7a33615693087657000000000000009f | 202.124 | 0.000 | n/a | 0.000 | 0.000 | 1.098 | 200.736 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-68/journal/page | none observed |
| 7a33615693087657000000000000009c | 202.068 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 200.848 | 0.015 | n/a | 0.097 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-49/journal/page | none observed |
| 7a3361569308765700000000000000a2 | 201.990 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 200.879 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 7a3361569308765700000000000000a0 | 201.920 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 200.931 | 0.015 | n/a | 0.115 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-50/journal/page | none observed |
| 7a3361569308765700000000000000a6 | 201.818 | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 200.797 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-68/journal/page | none observed |
| 7a3361569308765700000000000000a4 | 201.609 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 200.781 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-44/journal/page | none observed |
| 7a3361569308765700000000000000a3 | 115.522 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 114.352 | 0.011 | n/a | 0.034 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-68/journal/page | none observed |
| 7a33615693087657000000000000009d | 91.500 | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 81.182 | 8.903 | n/a | 0.069 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-68/journal/page | none observed |
| 7a3361569308765700000000000000a5 | 88.234 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 84.277 | 2.890 | n/a | 0.051 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 | gw-r/thread-48/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.832 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.901 | 200.855 | 0.018 | n/a | 0.104 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 |
| p99 | 202.952 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.954 | 201.542 | 4.570 | n/a | 0.166 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a3361569308765700000000000000b1 | 202.952 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 201.542 | 0.019 | n/a | 0.166 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-68/journal/page | none observed |
| 7a3361569308765700000000000000ac | 202.668 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 201.354 | 0.025 | n/a | 0.158 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 7a3361569308765700000000000000b0 | 202.233 | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 201.008 | 0.014 | n/a | 0.113 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-66/journal/page | none observed |
| 7a3361569308765700000000000000ab | 202.021 | 0.000 | n/a | 0.000 | 0.000 | 0.901 | 200.864 | 0.018 | n/a | 0.108 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 7a3361569308765700000000000000ad | 201.874 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 200.855 | 0.014 | n/a | 0.106 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-66/journal/page | none observed |
| 7a3361569308765700000000000000ae | 201.832 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 200.880 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 7a3361569308765700000000000000aa | 197.363 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 194.418 | 2.128 | n/a | 0.040 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 7a3361569308765700000000000000b2 | 188.432 | 0.000 | n/a | 0.000 | 0.000 | 2.954 | 181.804 | 3.448 | n/a | 0.041 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-66/journal/page | none observed |
| 7a3361569308765700000000000000b3 | 152.190 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 151.097 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-66/journal/page | none observed |
| 7a3361569308765700000000000000af | 100.506 | 0.000 | n/a | 0.000 | 0.000 | 2.298 | 93.430 | 4.570 | n/a | 0.078 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-66/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.203 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.072 | 0.018 | n/a | 0.132 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 |
| p99 | 202.203 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.072 | 0.018 | n/a | 0.132 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a3361569308765700000000000000bb | 202.203 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.072 | 0.018 | n/a | 0.132 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

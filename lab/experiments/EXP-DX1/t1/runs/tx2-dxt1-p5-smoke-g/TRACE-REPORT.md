# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (112.273 ms, trace `2ca3ef2cf69b70400000000000000058`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (145.561 ms, trace `2ca3ef2cf69b7040000000000000005a`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (102.503 ms, trace `2ca3ef2cf69b7040000000000000005b`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (65.481 ms, trace `2ca3ef2cf69b70400000000000000038`); `node-14/thread-8/client.validation-and-staging` (15.617 ms, trace `2ca3ef2cf69b7040000000000000003b`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-smoke-g`; source `f9af2506c70dcb8d0320436b5dee5dadd9f024d9`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 22/22 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 22/22. Raw trace bytes: 279822.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 63 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1512.900 | 199.029 | 5.886 | 39 |
| L1 | 1 | 1963.839 | 127.366 | 1.282 | 44 |
| L4 | 4 | 1926.967 | 280.756 | 6.092 | 30 |
| L16 | 16 | 1877.523 | 236.373 | 8.277 | 39 |
| tail | 0 | 3196.725 | 56.236 | 4.367 | 85 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 2ca3ef2cf69b70400000000000000058 | driver.queue.scheduler-dispatch | 0.050 | none | 0 / 32 |
| 2ca3ef2cf69b70400000000000000058 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 2ca3ef2cf69b70400000000000000058 waited: []

| 2ca3ef2cf69b7040000000000000005a | driver.queue.scheduler-dispatch | 0.103 | none | 0 / 32 |
| 2ca3ef2cf69b7040000000000000005a | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 2ca3ef2cf69b7040000000000000005a waited: []

| 2ca3ef2cf69b7040000000000000005b | driver.queue.scheduler-late | 0.256 | none | 1 / 32 |
| 2ca3ef2cf69b7040000000000000005b | driver.queue.scheduler-dispatch | 0.074 | none | 1 / 32 |

Observed active steps while trace 2ca3ef2cf69b7040000000000000005b waited: []

| 2ca3ef2cf69b70400000000000000038 | driver.queue.scheduler-late | 0.556 | none | 0 / 32 |
| 2ca3ef2cf69b70400000000000000038 | driver.queue.scheduler-dispatch | 0.164 | none | 0 / 32 |

Observed active steps while trace 2ca3ef2cf69b70400000000000000038 waited: []

| 2ca3ef2cf69b7040000000000000003b | driver.queue.scheduler-dispatch | 0.067 | none | 0 / 32 |
| 2ca3ef2cf69b7040000000000000003b | driver.queue.scheduler-late | 0.017 | none | 0 / 32 |

Observed active steps while trace 2ca3ef2cf69b7040000000000000003b waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.552 | 0.908 | 0.000 | 0.439 | 7.132 | 0.534 | 0.000 | 0.097 | 1.978 | 8.312 | 0.043 | n/a | 0.339 | 13.770 | n/a | n/a | 0.071 | 7.489 | 0.194 | 0.071 |
| p99 | 96.272 | 3.235 | 0.000 | 5.339 | 40.544 | n/a | 0.000 | 0.719 | 8.196 | 9.872 | 0.134 | n/a | 3.748 | 65.481 | n/a | n/a | 0.473 | 41.163 | 0.552 | 0.473 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ca3ef2cf69b70400000000000000038 | 96.272 | 13.966 | n/a | 0.000 | 0.719 | 1.978 | 9.872 | 0.034 | n/a | 3.748 | 65.481 | n/a | n/a | 0.473 | 14.686 | 0.153 | 0.473 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b7040000000000000003b | 74.524 | 40.544 | 0.534 | 0.000 | 0.085 | 7.902 | 8.312 | 0.134 | n/a | 3.195 | 13.770 | n/a | n/a | 0.049 | 41.163 | 0.552 | 0.049 | node-14/thread-8/client.validation-and-staging | none observed |
| 2ca3ef2cf69b7040000000000000003f | 38.552 | 7.132 | 0.260 | 0.000 | 0.097 | 8.196 | 8.687 | 0.084 | n/a | 0.339 | 13.687 | n/a | n/a | 0.071 | 7.489 | 0.194 | 0.071 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b7040000000000000003d | 22.967 | 4.607 | n/a | 0.000 | 0.119 | 1.357 | 2.289 | 0.043 | n/a | 0.150 | 14.317 | n/a | n/a | 0.083 | 4.727 | 0.206 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.171 | n/a | n/a | n/a | 8.374 | 0.609 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 11.159 | 0.995 | 0.012 |
| p99 | 134.238 | n/a | n/a | n/a | 101.906 | 2.786 | 21.129 | 0.000 | 5.186 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.242 | 124.167 | 0.999 | 37.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ca3ef2cf69b70400000000000000039 | 134.238 | 101.906 | 1.132 | 21.129 | 0.000 | 5.186 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.885 | 124.167 | 0.925 | 4.885 | node-14/thread-3/client.reach-decode-and-cache | none observed |
| 2ca3ef2cf69b7040000000000000005d | 94.868 | 45.995 | 0.756 | 6.872 | 0.000 | 4.002 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.242 | 53.624 | 0.565 | 37.242 | node-14/thread-3/socket.wait-first-byte | none observed |
| 2ca3ef2cf69b70400000000000000068 | 20.843 | 15.176 | 0.404 | 0.000 | 0.000 | 0.467 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.796 | 15.579 | 0.747 | 4.796 | node-14/thread-2/replica.pull-at | none observed |
| 2ca3ef2cf69b70400000000000000064 | 19.021 | 18.232 | 0.159 | 0.619 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 19.010 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | none observed |
| 2ca3ef2cf69b70400000000000000052 | 15.203 | 13.623 | 1.569 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 15.192 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 2ca3ef2cf69b70400000000000000054 | 11.171 | 8.374 | 2.786 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 11.159 | 0.999 | 0.011 | node-14/thread-2/replica.pull-at | none observed |
| 2ca3ef2cf69b70400000000000000060 | 5.372 | 5.261 | 0.100 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 5.362 | 0.998 | 0.010 | node-14/thread-2/replica.pull-at | none observed |
| 2ca3ef2cf69b70400000000000000042 | 3.269 | 3.150 | 0.104 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.253 | 0.995 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| 2ca3ef2cf69b70400000000000000047 | 2.769 | 2.576 | 0.181 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.757 | 0.996 | 0.011 | node-14/thread-2/replica.pull-at | none observed |
| 2ca3ef2cf69b7040000000000000003e | 2.727 | 0.675 | 2.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 2.710 | 0.994 | 0.017 | node-14/thread-0/rpc.replica.observe | none observed |
| 2ca3ef2cf69b7040000000000000004b | 0.961 | 0.343 | 0.609 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.953 | 0.991 | 0.008 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.967 | 0.908 | 0.000 | 2.265 | 4.607 | n/a | 0.000 | 0.119 | 1.357 | 2.289 | 0.043 | n/a | 0.150 | 14.317 | n/a | n/a | 0.083 | 4.727 | 0.206 | 0.083 |
| p99 | 22.967 | 0.908 | 0.000 | 2.265 | 4.607 | n/a | 0.000 | 0.119 | 1.357 | 2.289 | 0.043 | n/a | 0.150 | 14.317 | n/a | n/a | 0.083 | 4.727 | 0.206 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ca3ef2cf69b7040000000000000003d | 22.967 | 4.607 | n/a | 0.000 | 0.119 | 1.357 | 2.289 | 0.043 | n/a | 0.150 | 14.317 | n/a | n/a | 0.083 | 4.727 | 0.206 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.275 | 0.186 | 0.000 | 0.807 | 4.222 | 0.357 | 0.000 | 0.105 | 1.077 | 3.726 | 0.027 | n/a | 0.464 | 14.820 | n/a | n/a | 0.083 | 4.698 | 0.136 | 0.083 |
| p99 | 74.362 | 0.588 | 0.000 | 2.138 | 5.868 | n/a | 0.000 | 0.618 | 2.538 | 11.073 | 0.061 | n/a | 3.917 | 59.790 | n/a | n/a | 0.261 | 6.330 | 0.241 | 0.261 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ca3ef2cf69b70400000000000000048 | 74.362 | 5.868 | 0.357 | 0.000 | 0.105 | 2.538 | 5.028 | 0.061 | n/a | 0.464 | 59.790 | n/a | n/a | 0.150 | 6.330 | 0.085 | 0.150 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000043 | 33.277 | 4.303 | 0.158 | 0.000 | 0.060 | 2.132 | 11.073 | 0.051 | n/a | 0.636 | 14.820 | n/a | n/a | 0.044 | 4.521 | 0.136 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000046 | 26.275 | 4.222 | n/a | 0.000 | 0.618 | 0.986 | 1.549 | 0.026 | n/a | 3.917 | 14.875 | n/a | n/a | 0.083 | 4.840 | 0.184 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000041 | 19.508 | 4.168 | n/a | 0.000 | 0.531 | 1.077 | 3.726 | 0.027 | n/a | 0.134 | 9.585 | n/a | n/a | 0.261 | 4.698 | 0.241 | 0.261 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.508 | 0.456 | 0.000 | 1.864 | 4.168 | n/a | 0.000 | 0.531 | 0.986 | 1.549 | 0.026 | n/a | 0.134 | 9.585 | n/a | n/a | 0.083 | 4.698 | 0.184 | 0.083 |
| p99 | 26.275 | 0.588 | 0.000 | 2.138 | 4.222 | n/a | 0.000 | 0.618 | 1.077 | 3.726 | 0.027 | n/a | 3.917 | 14.875 | n/a | n/a | 0.261 | 4.840 | 0.241 | 0.261 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ca3ef2cf69b70400000000000000046 | 26.275 | 4.222 | n/a | 0.000 | 0.618 | 0.986 | 1.549 | 0.026 | n/a | 3.917 | 14.875 | n/a | n/a | 0.083 | 4.840 | 0.184 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000041 | 19.508 | 4.168 | n/a | 0.000 | 0.531 | 1.077 | 3.726 | 0.027 | n/a | 0.134 | 9.585 | n/a | n/a | 0.261 | 4.698 | 0.241 | 0.261 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.278 | 0.857 | 0.000 | 0.611 | 4.686 | 0.374 | 0.000 | 0.074 | 2.241 | 5.336 | 0.059 | n/a | 0.216 | 21.096 | n/a | n/a | 0.045 | 5.225 | 0.131 | 0.045 |
| p99 | 41.345 | 1.399 | 0.000 | 2.245 | 7.895 | n/a | 0.000 | 0.539 | 5.622 | 5.624 | 0.080 | n/a | 3.804 | 29.728 | n/a | n/a | 0.062 | 8.119 | 0.292 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ca3ef2cf69b7040000000000000004a | 41.345 | 4.686 | n/a | 0.000 | 0.539 | 0.791 | 5.336 | 0.022 | n/a | 0.198 | 29.728 | n/a | n/a | 0.045 | 5.225 | 0.126 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b7040000000000000004f | 35.278 | 4.169 | 0.374 | 0.000 | 0.070 | 2.241 | 3.425 | 0.059 | n/a | 3.804 | 21.096 | n/a | n/a | 0.039 | 4.614 | 0.131 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b7040000000000000004c | 27.813 | 7.895 | 0.150 | 0.000 | 0.074 | 5.622 | 5.624 | 0.080 | n/a | 0.216 | 8.091 | n/a | n/a | 0.062 | 8.119 | 0.292 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 46.880 | 0.613 | 0.000 | 0.652 | 7.813 | 0.765 | 0.000 | 0.072 | 1.482 | 5.306 | 0.036 | n/a | 0.156 | 21.712 | n/a | n/a | 0.036 | 8.875 | 0.127 | 0.036 |
| p99 | 174.478 | 1.751 | 0.000 | 2.267 | 8.666 | n/a | 0.791 | 1.435 | 15.406 | 50.751 | 0.098 | n/a | 1.121 | 112.273 | n/a | n/a | 0.075 | 10.100 | 0.260 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ca3ef2cf69b70400000000000000058 | 174.478 | 7.813 | 0.219 | 0.791 | 0.052 | 2.294 | 50.751 | 0.098 | n/a | 0.156 | 112.273 | n/a | n/a | 0.031 | 8.875 | 0.051 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000055 | 48.114 | 8.606 | 0.765 | 0.000 | 0.072 | 15.406 | 9.478 | 0.053 | n/a | 0.190 | 13.508 | n/a | n/a | 0.037 | 9.442 | 0.196 | 0.037 | node-14/thread-8/socket.wait-first-byte | none observed |
| 2ca3ef2cf69b70400000000000000051 | 46.880 | 5.286 | n/a | 0.000 | 0.647 | 1.106 | 4.580 | 0.036 | n/a | 1.121 | 34.069 | n/a | n/a | 0.036 | 5.933 | 0.127 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000053 | 38.834 | 8.666 | n/a | 0.000 | 1.435 | 1.482 | 5.306 | 0.034 | n/a | 0.125 | 21.712 | n/a | n/a | 0.075 | 10.100 | 0.260 | 0.075 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 44.138 | 0.400 | 0.000 | 1.315 | 4.621 | n/a | 0.000 | 0.108 | 1.568 | 5.113 | 0.027 | n/a | 0.505 | 19.773 | n/a | n/a | 0.040 | 5.292 | 0.145 | 0.040 |
| p99 | 173.865 | 1.178 | 0.000 | 4.319 | 6.081 | n/a | 0.512 | 0.813 | 2.559 | 21.797 | 0.101 | n/a | 3.197 | 145.561 | n/a | n/a | 0.062 | 6.401 | 0.242 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ca3ef2cf69b7040000000000000005a | 173.865 | 5.173 | 0.211 | 0.287 | 0.106 | 1.568 | 20.361 | 0.048 | n/a | 0.505 | 145.561 | n/a | n/a | 0.046 | 5.777 | 0.033 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b7040000000000000005b | 109.994 | 2.875 | n/a | 0.000 | 0.331 | 1.690 | 2.041 | 0.022 | n/a | 0.495 | 102.503 | n/a | n/a | 0.037 | 3.206 | 0.029 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000061 | 60.695 | 4.002 | 0.226 | 0.235 | 0.095 | 2.012 | 21.797 | 0.046 | n/a | 3.197 | 29.022 | n/a | n/a | 0.062 | 4.559 | 0.075 | 0.062 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000065 | 44.138 | 5.639 | 0.192 | 0.512 | 0.057 | 2.559 | 15.948 | 0.101 | n/a | 0.144 | 18.941 | n/a | n/a | 0.045 | 6.401 | 0.145 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000067 | 31.323 | 3.827 | n/a | 0.000 | 0.813 | 1.145 | 5.113 | 0.027 | n/a | 0.839 | 19.524 | n/a | n/a | 0.036 | 4.640 | 0.148 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000063 | 30.049 | 4.621 | n/a | 0.000 | 0.671 | 0.883 | 3.398 | 0.024 | n/a | 0.640 | 19.773 | n/a | n/a | 0.040 | 5.292 | 0.176 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b7040000000000000005f | 25.537 | 6.081 | n/a | 0.000 | 0.108 | 0.986 | 2.287 | 0.022 | n/a | 0.131 | 15.885 | n/a | n/a | 0.037 | 6.189 | 0.242 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.323 | 0.429 | 0.000 | 2.045 | 3.827 | n/a | 0.000 | 0.331 | 1.145 | 2.287 | 0.022 | n/a | 0.495 | 19.524 | n/a | n/a | 0.037 | 4.640 | 0.148 | 0.037 |
| p99 | 109.994 | 0.805 | 0.000 | 4.319 | 6.081 | n/a | 0.000 | 0.813 | 1.690 | 5.113 | 0.027 | n/a | 0.839 | 102.503 | n/a | n/a | 0.037 | 6.189 | 0.242 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ca3ef2cf69b7040000000000000005b | 109.994 | 2.875 | n/a | 0.000 | 0.331 | 1.690 | 2.041 | 0.022 | n/a | 0.495 | 102.503 | n/a | n/a | 0.037 | 3.206 | 0.029 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b70400000000000000067 | 31.323 | 3.827 | n/a | 0.000 | 0.813 | 1.145 | 5.113 | 0.027 | n/a | 0.839 | 19.524 | n/a | n/a | 0.036 | 4.640 | 0.148 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 2ca3ef2cf69b7040000000000000005f | 25.537 | 6.081 | n/a | 0.000 | 0.108 | 0.986 | 2.287 | 0.022 | n/a | 0.131 | 15.885 | n/a | n/a | 0.037 | 6.189 | 0.242 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.026 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 341.565 | n/a | n/a | n/a | 53.249 | n/a | 8.294 | 341.517 | 5.695 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.885 | 341.563 | 1.000 | 64.885 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e22173c6fc8d326c00000000000003df | 341.724 | 0.369 | n/a | 0.000 | 341.350 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 341.719 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c00000000000003e0 | 341.567 | 0.047 | n/a | 0.000 | 341.517 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 341.564 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c00000000000003e2 | 341.565 | 0.019 | n/a | 0.000 | 341.544 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 341.563 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c00000000000003e1 | 341.561 | 0.022 | n/a | 0.000 | 341.536 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 341.558 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c00000000000003f4 | 341.265 | 0.027 | n/a | 0.000 | 341.236 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 341.263 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db0000000000000eb1 | 340.777 | 0.431 | n/a | 0.000 | 340.342 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 340.773 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db0000000000000eb2 | 340.591 | 0.051 | n/a | 0.000 | 340.537 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 340.588 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db0000000000000efd | 338.393 | 0.050 | n/a | 0.000 | 338.340 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 338.390 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db0000000000000efe | 338.337 | 0.023 | n/a | 0.000 | 338.311 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 338.334 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db0000000000000f05 | 337.971 | 0.045 | n/a | 0.000 | 337.924 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 337.969 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e05130000000000000368 | 328.842 | 0.330 | n/a | 0.000 | 328.508 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 328.838 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e05130000000000000369 | 328.693 | 0.041 | n/a | 0.000 | 328.649 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 328.691 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000000036a | 328.686 | 0.021 | n/a | 0.000 | 328.664 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 328.684 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000000037e | 328.399 | 0.038 | n/a | 0.000 | 328.358 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 328.396 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000000037d | 328.363 | 0.027 | n/a | 0.000 | 328.333 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 328.360 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c00000000000003f7 | 316.966 | 0.039 | n/a | 0.000 | 316.922 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 316.960 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db000000000000a1dd | 275.717 | 0.131 | n/a | 0.000 | 275.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.716 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db000000000000a1eb | 275.590 | 0.035 | n/a | 0.000 | 275.554 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.589 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db000000000000a1dc | 275.583 | 0.039 | n/a | 0.000 | 275.544 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.583 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db000000000000a1db | 275.545 | 0.052 | n/a | 0.000 | 275.491 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.544 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1 / read (86 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 290.282 | n/a | n/a | n/a | 11.458 | n/a | 0.000 | 290.179 | 0.976 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.589 | 290.279 | 1.000 | 4.589 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e22173c6fc8d326c000000000002089e | 290.282 | 0.100 | n/a | 0.000 | 290.179 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 290.279 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.060ms |
| e22173c6fc8d326c000000000002050b | 275.450 | 0.268 | n/a | 0.000 | 275.179 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.446 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c000000000001450e | 268.703 | 0.148 | n/a | 0.000 | 268.553 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.701 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c000000000000ddb9 | 17.023 | 11.458 | n/a | 0.000 | 0.000 | 0.976 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.589 | 11.458 | 0.673 | 4.589 | node-14/thread-4/reader.execute | none observed |
| e22173c6fc8d326c00000000000206a2 | 0.434 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.434 | 0.000 | 0.000 | 0.434 | uncovered | none observed |
| e22173c6fc8d326c0000000000018128 | 0.421 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.421 | 0.000 | 0.000 | 0.421 | uncovered | none observed |
| e22173c6fc8d326c000000000000ddc7 | 0.408 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 | uncovered | replica.apply-delta 0.151ms |
| e22173c6fc8d326c0000000000017c50 | 0.399 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | uncovered | none observed |
| e22173c6fc8d326c00000000000183cb | 0.332 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.332 | 0.000 | 0.000 | 0.332 | uncovered | none observed |
| e22173c6fc8d326c0000000000015de4 | 0.319 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.319 | 0.000 | 0.000 | 0.319 | uncovered | none observed |
| e22173c6fc8d326c00000000000206cc | 0.313 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | uncovered | none observed |
| e22173c6fc8d326c000000000000ea04 | 0.308 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.308 | 0.000 | 0.000 | 0.308 | uncovered | none observed |
| e22173c6fc8d326c000000000001811f | 0.308 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.308 | 0.000 | 0.000 | 0.308 | uncovered | none observed |
| e22173c6fc8d326c0000000000018122 | 0.299 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.299 | 0.000 | 0.000 | 0.299 | uncovered | none observed |
| e22173c6fc8d326c000000000001812c | 0.294 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 | uncovered | none observed |
| e22173c6fc8d326c0000000000011cc5 | 0.293 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 | uncovered | none observed |
| e22173c6fc8d326c000000000001ba6e | 0.290 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.290 | 0.000 | 0.000 | 0.290 | uncovered | none observed |
| e22173c6fc8d326c000000000001c317 | 0.285 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 | uncovered | none observed |
| e22173c6fc8d326c0000000000015cf1 | 0.282 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.282 | 0.000 | 0.000 | 0.282 | uncovered | none observed |
| e22173c6fc8d326c000000000001660a | 0.281 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | uncovered | none observed |

## P1 / L4 / read (256 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 296.093 | n/a | n/a | n/a | 4.512 | n/a | 0.000 | 295.931 | 0.375 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.164 | 296.090 | 1.000 | 1.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e22173c6fc8d326c000000000003428e | 296.260 | 0.062 | n/a | 0.000 | 296.197 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 296.259 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.039ms |
| e22173c6fc8d326c000000000003428d | 296.125 | 0.179 | n/a | 0.000 | 295.943 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 296.122 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.039ms |
| fe85387ee66cf4db000000000001d22b | 296.093 | 0.159 | n/a | 0.000 | 295.931 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.090 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| 9b2d1be72a8e0513000000000001c2fe | 295.762 | 0.142 | n/a | 0.000 | 295.617 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 295.760 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| fe85387ee66cf4db000000000000de5c | 237.859 | 0.568 | n/a | 0.000 | 237.283 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 237.851 | 1.000 | 0.008 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| e22173c6fc8d326c00000000000208a1 | 236.052 | 0.064 | n/a | 0.000 | 235.985 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 236.050 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.060ms |
| 9b2d1be72a8e0513000000000000cb4c | 233.761 | 0.164 | n/a | 0.000 | 233.592 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 233.756 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| fe85387ee66cf4db000000000000de65 | 30.983 | 27.498 | n/a | 1.865 | 0.000 | 0.456 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.164 | 29.363 | 0.948 | 1.164 | node-14/thread-6/reader.execute | none observed |
| 9b2d1be72a8e0513000000000000cb86 | 10.015 | 2.601 | n/a | 0.000 | 0.000 | 0.395 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.020 | 2.601 | 0.260 | 7.020 | node-14/thread-5/socket.wait-first-byte | none observed |
| e22173c6fc8d326c00000000000209d6 | 6.135 | 6.133 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 6.133 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| e22173c6fc8d326c0000000000031087 | 4.521 | 4.512 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 4.512 | 0.998 | 0.008 | node-14/thread-4/replica.pull-at | none observed |
| e22173c6fc8d326c0000000000020917 | 3.948 | 1.963 | n/a | 0.000 | 0.000 | 0.375 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.610 | 1.963 | 0.497 | 1.610 | node-14/thread-4/socket.wait-first-byte | none observed |
| 9b2d1be72a8e05130000000000019a2f | 3.290 | 3.288 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.288 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| fe85387ee66cf4db000000000000e01f | 1.463 | 1.460 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.460 | 0.998 | 0.003 | node-14/thread-6/replica.pull-at | none observed |
| fe85387ee66cf4db000000000000e033 | 1.279 | 1.276 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.276 | 0.998 | 0.002 | node-14/thread-6/replica.pull-at | none observed |
| e22173c6fc8d326c0000000000029faa | 1.221 | 1.219 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.219 | 0.998 | 0.003 | node-14/thread-4/reader.execute | none observed |
| fe85387ee66cf4db000000000000ed71 | 1.221 | 1.218 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.218 | 0.998 | 0.003 | node-14/thread-6/replica.pull-at | none observed |
| 9b2d1be72a8e0513000000000000da1c | 1.096 | 1.094 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.094 | 0.998 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| fe85387ee66cf4db000000000000df20 | 1.077 | 1.074 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.074 | 0.997 | 0.003 | node-14/thread-6/replica.pull-at | none observed |
| fe85387ee66cf4db0000000000014c63 | 1.073 | 1.072 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.072 | 0.999 | 0.001 | node-14/thread-6/replica.pull-at | none observed |

## P1 / L16 / read (297 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 286.775 | n/a | n/a | n/a | 10.580 | n/a | 0.000 | 286.619 | 0.289 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.619 | 286.773 | 1.000 | 3.619 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e22173c6fc8d326c000000000003597b | 286.794 | 0.017 | n/a | 0.000 | 286.776 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.793 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c000000000003597a | 286.787 | 0.031 | n/a | 0.000 | 286.755 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.786 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c0000000000035979 | 286.775 | 0.154 | n/a | 0.000 | 286.619 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.773 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c000000000003598b | 285.551 | 0.026 | n/a | 0.000 | 285.523 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.549 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c000000000003598c | 285.540 | 0.018 | n/a | 0.000 | 285.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.539 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e22173c6fc8d326c000000000003598d | 285.540 | 0.015 | n/a | 0.000 | 285.524 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.539 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db000000000001e776 | 280.494 | 0.122 | n/a | 0.000 | 280.371 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.493 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db000000000001e775 | 280.483 | 0.026 | n/a | 0.000 | 280.456 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.482 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db000000000001e774 | 280.473 | 0.135 | n/a | 0.000 | 280.332 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 280.466 | 1.000 | 0.006 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db000000000001e777 | 280.256 | 0.102 | n/a | 0.000 | 280.149 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 280.250 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fe85387ee66cf4db000000000001e77f | 278.887 | 0.031 | n/a | 0.000 | 278.854 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.885 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000001d892 | 276.914 | 0.058 | n/a | 0.000 | 276.854 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.912 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000001d891 | 276.779 | 0.340 | n/a | 0.000 | 276.434 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 276.774 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000001d8a8 | 276.713 | 0.027 | n/a | 0.000 | 276.685 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.712 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000001d8a7 | 276.666 | 0.026 | n/a | 0.000 | 276.638 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.665 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000001d8a6 | 276.636 | 0.032 | n/a | 0.000 | 276.603 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.635 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000001c321 | 126.861 | 0.014 | n/a | 0.000 | 126.847 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 126.860 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000001c320 | 126.854 | 0.016 | n/a | 0.000 | 126.836 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 126.853 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000001c31f | 126.824 | 0.032 | n/a | 0.000 | 126.791 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 126.823 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 9b2d1be72a8e0513000000000001c31e | 126.810 | 0.030 | n/a | 0.000 | 126.778 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 126.808 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / tail / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.030 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.000 | 0.000 | 0.030 |
| p99 | 0.090 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b2d1be72a8e0513000000000002eaf5 | 0.090 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | uncovered | none observed |
| 9b2d1be72a8e0513000000000002eaf1 | 0.058 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.058 | 0.000 | 0.000 | 0.058 | uncovered | none observed |
| 9b2d1be72a8e0513000000000002eaf4 | 0.030 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.000 | 0.000 | 0.030 | uncovered | none observed |
| 9b2d1be72a8e0513000000000002eaf2 | 0.019 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.000 | 0.000 | 0.019 | uncovered | none observed |
| 9b2d1be72a8e0513000000000002eaf3 | 0.018 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 | uncovered | none observed |

## P3 / outside-phases / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.353 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.317 | 201.281 | 0.018 | n/a | 0.154 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 |
| p99 | 204.678 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.243 | 202.414 | 0.241 | n/a | 1.327 | 0.000 | n/a | n/a | 0.721 | 0.000 | 0.000 | 0.721 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 849179ec20b5f3770000000000000005 | 204.678 | 0.000 | n/a | 0.000 | 0.000 | 2.156 | 200.607 | 0.241 | n/a | 1.327 | 0.000 | n/a | n/a | 0.348 | 0.000 | 0.000 | 0.348 | gw-r/thread-45/journal/page | none observed |
| 849179ec20b5f3770000000000000007 | 203.974 | 0.000 | n/a | 0.000 | 0.000 | 1.309 | 202.414 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-44/journal/page | none observed |
| 849179ec20b5f3770000000000000030 | 203.367 | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 201.854 | 0.031 | n/a | 0.154 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-42/journal/page | none observed |
| 849179ec20b5f3770000000000000006 | 203.353 | 0.000 | n/a | 0.000 | 0.000 | 1.525 | 201.393 | 0.014 | n/a | 0.186 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-47/journal/page | none observed |
| 849179ec20b5f377000000000000002e | 202.994 | 0.000 | n/a | 0.000 | 0.000 | 1.317 | 201.281 | 0.018 | n/a | 0.157 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-63/journal/page | none observed |
| 849179ec20b5f377000000000000002f | 202.536 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 201.112 | 0.016 | n/a | 0.152 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-66/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000002 | 56.622 | 0.000 | n/a | 0.000 | 0.000 | 3.243 | 52.449 | 0.122 | n/a | 0.087 | 0.000 | n/a | n/a | 0.721 | 0.000 | 0.000 | 0.721 | gw-r/thread-45/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1003.252 | n/a | n/a | n/a | 0.217 | n/a | 0.000 | 0.000 | 2.202 | 1001.144 | 0.013 | n/a | 0.159 | 0.000 | n/a | n/a | 1.104 | 0.217 | 0.000 | 1.104 |
| p99 | 1005.674 | n/a | n/a | n/a | 11.711 | n/a | 0.000 | 0.000 | 4.998 | 1001.278 | 0.415 | n/a | 0.287 | 0.000 | n/a | n/a | 1.259 | 11.711 | 0.079 | 1.259 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 39fbc84b3d72f00e0000000000000018 | 1005.674 | 0.154 | n/a | 0.000 | 0.000 | 3.082 | 1001.208 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 1.111 | 0.154 | 0.000 | 1.111 | gw-r/thread-42/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000017 | 1005.522 | 0.217 | n/a | 0.000 | 0.000 | 2.202 | 1001.144 | 0.415 | n/a | 0.287 | 0.000 | n/a | n/a | 1.259 | 0.217 | 0.000 | 1.259 | gw-r/thread-42/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000019 | 1003.252 | 0.138 | n/a | 0.000 | 0.000 | 0.593 | 1001.278 | 0.013 | n/a | 0.127 | 0.000 | n/a | n/a | 1.104 | 0.138 | 0.000 | 1.104 | gw-r/thread-61/journal/page | none observed |
| 39fbc84b3d72f00e000000000000002a | 148.928 | 11.711 | n/a | 0.000 | 0.000 | 4.998 | 131.938 | 0.022 | n/a | 0.159 | 0.000 | n/a | n/a | 0.100 | 11.711 | 0.079 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000030 | 123.529 | 4.028 | n/a | 0.000 | 0.000 | 1.662 | 117.553 | 0.012 | n/a | 0.170 | 0.000 | n/a | n/a | 0.104 | 4.028 | 0.033 | 0.104 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 286.711 | n/a | n/a | n/a | 2.598 | n/a | 0.000 | 0.000 | 4.585 | 277.863 | 0.017 | n/a | 0.089 | 0.000 | n/a | n/a | 0.140 | 2.598 | 0.006 | 0.140 |
| p99 | 685.697 | n/a | n/a | n/a | 53.575 | n/a | 0.000 | 0.000 | 8.528 | 676.844 | 0.063 | n/a | 0.111 | 0.000 | n/a | n/a | 0.327 | 53.575 | 0.228 | 0.327 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 39fbc84b3d72f00e000000000000001d | 685.697 | 2.242 | n/a | 0.000 | 0.000 | 6.263 | 676.844 | 0.063 | n/a | 0.111 | 0.000 | n/a | n/a | 0.174 | 2.242 | 0.003 | 0.174 | gw-r/thread-64/journal/page | none observed |
| 39fbc84b3d72f00e000000000000001c | 400.751 | 2.598 | n/a | 0.000 | 0.000 | 8.528 | 389.415 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.108 | 2.598 | 0.006 | 0.108 | gw-r/thread-61/journal/page | none observed |
| 39fbc84b3d72f00e000000000000001e | 286.711 | 7.989 | n/a | 0.000 | 0.000 | 0.603 | 277.863 | 0.017 | n/a | 0.100 | 0.000 | n/a | n/a | 0.140 | 7.989 | 0.028 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 39fbc84b3d72f00e000000000000001a | 235.384 | 53.575 | n/a | 0.000 | 0.000 | 4.585 | 176.811 | 0.017 | n/a | 0.068 | 0.000 | n/a | n/a | 0.327 | 53.575 | 0.228 | 0.327 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 273.160 | n/a | n/a | n/a | 2.237 | n/a | 0.000 | 0.000 | 1.245 | 265.440 | 0.011 | n/a | 0.140 | 0.000 | n/a | n/a | 0.095 | 2.237 | 0.003 | 0.095 |
| p99 | 918.116 | n/a | n/a | n/a | 5.575 | n/a | 0.000 | 0.000 | 1.753 | 915.244 | 0.025 | n/a | 0.654 | 0.000 | n/a | n/a | 0.242 | 5.575 | 0.025 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 39fbc84b3d72f00e0000000000000023 | 918.116 | 1.784 | n/a | 0.000 | 0.000 | 0.841 | 915.244 | 0.020 | n/a | 0.140 | 0.000 | n/a | n/a | 0.087 | 1.784 | 0.002 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000020 | 722.267 | 2.237 | n/a | 0.000 | 0.000 | 1.579 | 717.547 | 0.009 | n/a | 0.654 | 0.000 | n/a | n/a | 0.242 | 2.237 | 0.003 | 0.242 | gw-r/thread-62/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000022 | 273.160 | 5.575 | n/a | 0.000 | 0.000 | 1.753 | 265.440 | 0.025 | n/a | 0.166 | 0.000 | n/a | n/a | 0.201 | 5.575 | 0.020 | 0.201 | gw-r/thread-42/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000025 | 107.692 | 2.687 | n/a | 0.000 | 0.000 | 1.245 | 103.550 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.095 | 2.687 | 0.025 | 0.095 | gw-r/thread-64/journal/page | none observed |

## P3 / L4 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 761.174 | n/a | n/a | n/a | 4.043 | n/a | 0.000 | 0.000 | 0.907 | 753.383 | 0.016 | n/a | 0.202 | 0.000 | n/a | n/a | 0.086 | 4.043 | 0.009 | 0.086 |
| p99 | 1001.550 | n/a | n/a | n/a | 6.664 | n/a | 0.000 | 0.000 | 2.647 | 997.704 | 0.058 | n/a | 0.377 | 0.000 | n/a | n/a | 0.128 | 6.664 | 0.020 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 39fbc84b3d72f00e0000000000000029 | 1001.550 | 2.635 | n/a | 0.000 | 0.000 | 0.907 | 997.704 | 0.016 | n/a | 0.202 | 0.000 | n/a | n/a | 0.086 | 2.635 | 0.003 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000027 | 761.174 | 6.664 | n/a | 0.000 | 0.000 | 0.564 | 753.383 | 0.058 | n/a | 0.377 | 0.000 | n/a | n/a | 0.128 | 6.664 | 0.009 | 0.128 | gw-r/thread-66/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000026 | 202.118 | 4.043 | n/a | 0.000 | 0.000 | 2.647 | 195.235 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.086 | 4.043 | 0.020 | 0.086 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 431.631 | n/a | n/a | n/a | 6.484 | n/a | 0.000 | 0.000 | 1.720 | 423.730 | 0.025 | n/a | 0.147 | 0.000 | n/a | n/a | 0.119 | 6.484 | 0.015 | 0.119 |
| p99 | 1028.950 | n/a | n/a | n/a | 9.292 | n/a | 0.000 | 0.000 | 5.695 | 1023.495 | 0.079 | n/a | 0.189 | 0.000 | n/a | n/a | 3.402 | 9.292 | 0.022 | 3.402 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 39fbc84b3d72f00e000000000000002f | 1028.950 | 0.131 | n/a | 0.000 | 0.000 | 1.720 | 1023.495 | 0.079 | n/a | 0.123 | 0.000 | n/a | n/a | 3.402 | 0.131 | 0.000 | 3.402 | gw-r/thread-49/journal/page | none observed |
| 39fbc84b3d72f00e000000000000002c | 431.631 | 6.484 | n/a | 0.000 | 0.000 | 1.126 | 423.730 | 0.025 | n/a | 0.147 | 0.000 | n/a | n/a | 0.119 | 6.484 | 0.015 | 0.119 | gw-r/thread-63/journal/page | none observed |
| 39fbc84b3d72f00e000000000000002e | 427.597 | 9.292 | n/a | 0.000 | 0.000 | 5.695 | 412.303 | 0.020 | n/a | 0.189 | 0.000 | n/a | n/a | 0.098 | 9.292 | 0.022 | 0.098 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 333.513 | n/a | n/a | n/a | 2.089 | n/a | 0.000 | 0.000 | 0.803 | 330.802 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 0.088 | 2.089 | 0.006 | 0.088 |
| p99 | 1006.029 | n/a | n/a | n/a | 9.498 | n/a | 0.619 | 0.000 | 3.394 | 1001.459 | 0.036 | n/a | 0.138 | 0.000 | n/a | n/a | 10.302 | 10.117 | 0.162 | 10.302 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 39fbc84b3d72f00e000000000000003c | 1006.029 | 0.138 | n/a | 0.000 | 0.000 | 3.213 | 1001.459 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 1.101 | 0.138 | 0.000 | 1.101 | gw-r/thread-49/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000031 | 995.990 | 4.704 | n/a | 0.000 | 0.000 | 2.460 | 988.555 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.172 | 4.704 | 0.005 | 0.172 | gw-r/thread-45/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000036 | 730.411 | 2.526 | n/a | 0.000 | 0.000 | 3.394 | 724.247 | 0.036 | n/a | 0.119 | 0.000 | n/a | n/a | 0.088 | 2.526 | 0.003 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000037 | 646.354 | 9.498 | n/a | 0.619 | 0.000 | 0.803 | 635.203 | 0.016 | n/a | 0.107 | 0.000 | n/a | n/a | 0.108 | 10.117 | 0.016 | 0.108 | gw-r/thread-66/journal/page | none observed |
| 39fbc84b3d72f00e000000000000003a | 333.513 | 2.033 | n/a | 0.000 | 0.000 | 0.514 | 330.802 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.079 | 2.033 | 0.006 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000039 | 328.110 | 2.534 | n/a | 0.000 | 0.000 | 0.668 | 324.727 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 0.081 | 2.534 | 0.008 | 0.081 | gw-r/thread-62/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000034 | 140.135 | 1.893 | n/a | 0.000 | 0.000 | 2.281 | 135.724 | 0.017 | n/a | 0.138 | 0.000 | n/a | n/a | 0.083 | 1.893 | 0.014 | 0.083 | gw-r/thread-62/journal/page | none observed |
| 39fbc84b3d72f00e0000000000000033 | 12.888 | 2.089 | n/a | 0.000 | 0.000 | 0.496 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.302 | 2.089 | 0.162 | 10.302 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.283 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.175 | 200.991 | 0.021 | n/a | 0.152 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 |
| p99 | 206.635 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.579 | 202.939 | 13.488 | n/a | 0.291 | 0.000 | n/a | n/a | 1.160 | 0.000 | 0.000 | 1.160 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 849179ec20b5f3770000000000000009 | 206.635 | 0.000 | n/a | 0.000 | 0.000 | 2.175 | 202.939 | 0.070 | n/a | 0.291 | 0.000 | n/a | n/a | 1.160 | 0.000 | 0.000 | 1.160 | gw-r/thread-49/journal/page | none observed |
| 849179ec20b5f377000000000000000d | 205.182 | 0.000 | n/a | 0.000 | 0.000 | 1.971 | 202.830 | 0.021 | n/a | 0.201 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-42/journal/page | none observed |
| 849179ec20b5f377000000000000000e | 204.362 | 0.000 | n/a | 0.000 | 0.000 | 3.037 | 201.066 | 0.012 | n/a | 0.138 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 849179ec20b5f377000000000000000b | 203.788 | 0.000 | n/a | 0.000 | 0.000 | 2.489 | 200.991 | 0.024 | n/a | 0.152 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-63/journal/page | none observed |
| 849179ec20b5f3770000000000000008 | 203.283 | 0.000 | n/a | 0.000 | 0.000 | 2.169 | 200.868 | 0.010 | n/a | 0.118 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 849179ec20b5f3770000000000000011 | 202.951 | 0.000 | n/a | 0.000 | 0.000 | 1.373 | 201.229 | 0.019 | n/a | 0.174 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-49/journal/page | none observed |
| 849179ec20b5f377000000000000000f | 201.990 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 200.832 | 0.013 | n/a | 0.139 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 849179ec20b5f377000000000000000c | 144.742 | 0.000 | n/a | 0.000 | 0.000 | 3.129 | 141.279 | 0.021 | n/a | 0.168 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-65/journal/page | none observed |
| 849179ec20b5f377000000000000000a | 71.860 | 0.000 | n/a | 0.000 | 0.000 | 9.579 | 48.484 | 13.488 | n/a | 0.070 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.252 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 201.135 | 0.017 | n/a | 0.143 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 202.702 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 201.650 | 0.019 | n/a | 0.167 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 849179ec20b5f3770000000000000015 | 202.702 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 201.650 | 0.012 | n/a | 0.143 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-65/journal/page | none observed |
| 849179ec20b5f3770000000000000014 | 202.252 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 201.135 | 0.017 | n/a | 0.167 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-63/journal/page | none observed |
| 849179ec20b5f3770000000000000013 | 201.732 | 0.000 | n/a | 0.000 | 0.000 | 0.584 | 200.895 | 0.019 | n/a | 0.129 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.635 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 201.240 | 0.033 | n/a | 0.156 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 206.358 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.138 | 203.528 | 13.497 | n/a | 0.842 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 849179ec20b5f3770000000000000026 | 206.358 | 0.000 | n/a | 0.000 | 0.000 | 4.138 | 201.918 | 0.016 | n/a | 0.156 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 849179ec20b5f3770000000000000022 | 205.226 | 0.000 | n/a | 0.000 | 0.000 | 1.233 | 203.528 | 0.017 | n/a | 0.248 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-45/journal/page | none observed |
| 849179ec20b5f3770000000000000025 | 204.563 | 0.000 | n/a | 0.000 | 0.000 | 0.746 | 203.441 | 0.074 | n/a | 0.205 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-63/journal/page | none observed |
| 849179ec20b5f3770000000000000023 | 203.109 | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 201.516 | 0.033 | n/a | 0.195 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-42/journal/page | none observed |
| 849179ec20b5f3770000000000000021 | 202.960 | 0.000 | n/a | 0.000 | 0.000 | 1.372 | 201.266 | 0.018 | n/a | 0.143 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-61/journal/page | none observed |
| 849179ec20b5f377000000000000002d | 202.848 | 0.000 | n/a | 0.000 | 0.000 | 1.169 | 201.403 | 0.012 | n/a | 0.141 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-65/journal/page | none observed |
| 849179ec20b5f377000000000000002c | 202.635 | 0.000 | n/a | 0.000 | 0.000 | 1.324 | 201.017 | 0.024 | n/a | 0.133 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-44/journal/page | none observed |
| 849179ec20b5f3770000000000000028 | 202.099 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 201.071 | 0.014 | n/a | 0.140 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 849179ec20b5f377000000000000002a | 201.917 | 0.000 | n/a | 0.000 | 0.000 | 0.384 | 201.240 | 0.050 | n/a | 0.156 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-42/journal/page | none observed |
| 849179ec20b5f3770000000000000027 | 184.673 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 178.073 | 5.760 | n/a | 0.060 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 849179ec20b5f377000000000000002b | 108.362 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 100.647 | 6.786 | n/a | 0.160 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-64/journal/page | none observed |
| 849179ec20b5f3770000000000000029 | 108.011 | 0.000 | n/a | 0.000 | 0.000 | 1.215 | 102.237 | 3.542 | n/a | 0.842 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-61/journal/page | none observed |
| 849179ec20b5f3770000000000000024 | 54.196 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 39.980 | 13.497 | n/a | 0.052 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-65/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

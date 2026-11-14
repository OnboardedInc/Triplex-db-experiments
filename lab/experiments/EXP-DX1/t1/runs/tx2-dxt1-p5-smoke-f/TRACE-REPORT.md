# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-92/peer.transact-await (includes order/network/storage)` (123.377 ms, trace `ccc60d8cfc9d6ddd0000000000000053`); `gw-w/thread-105/peer.transact-await (includes order/network/storage)` (115.037 ms, trace `ccc60d8cfc9d6ddd0000000000000056`); `gw-w/thread-114/peer.transact-await (includes order/network/storage)` (67.366 ms, trace `ccc60d8cfc9d6ddd0000000000000058`); `node-158/thread-8/worker.probe.transact` (7.809 ms, trace `ccc60d8cfc9d6ddd0000000000000039`); `gw-w/thread-96/peer.transact-await (includes order/network/storage)` (31.963 ms, trace `ccc60d8cfc9d6ddd0000000000000045`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-smoke-f`; source `b9edaff6b4d3a619eb8c8b9cc01e9698c6c6b30e`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 22/22 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 22/22. Raw trace bytes: 63450361.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 62 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-44-0.jsonl.gz: unexpected end of file. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1416.662 | 209.366 | 11.274 | 39 |
| L1 | 1 | 1979.133 | 139.653 | 1.122 | 30 |
| L4 | 4 | 1980.113 | 278.338 | 3.653 | 44 |
| L16 | 16 | 1976.266 | 227.156 | 12.994 | 44 |
| tail | 0 | 3312.338 | 65.889 | 1.152 | 85 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| ccc60d8cfc9d6ddd0000000000000053 | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |
| ccc60d8cfc9d6ddd0000000000000053 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace ccc60d8cfc9d6ddd0000000000000053 waited: []

| ccc60d8cfc9d6ddd0000000000000056 | driver.queue.scheduler-dispatch | 0.119 | none | 0 / 32 |
| ccc60d8cfc9d6ddd0000000000000056 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace ccc60d8cfc9d6ddd0000000000000056 waited: []

| ccc60d8cfc9d6ddd0000000000000058 | driver.queue.scheduler-dispatch | 0.130 | none | 0 / 32 |
| ccc60d8cfc9d6ddd0000000000000058 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace ccc60d8cfc9d6ddd0000000000000058 waited: []

| ccc60d8cfc9d6ddd0000000000000039 | driver.queue.scheduler-dispatch | 0.102 | none | 0 / 32 |
| ccc60d8cfc9d6ddd0000000000000039 | driver.queue.scheduler-late | 0.047 | none | 0 / 32 |

Observed active steps while trace ccc60d8cfc9d6ddd0000000000000039 waited: []

| ccc60d8cfc9d6ddd0000000000000045 | driver.queue.scheduler-late | 0.391 | none | 0 / 32 |
| ccc60d8cfc9d6ddd0000000000000045 | driver.queue.scheduler-dispatch | 0.071 | none | 0 / 32 |

Observed active steps while trace ccc60d8cfc9d6ddd0000000000000045 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.278 | 0.137 | 0.000 | 0.708 | 5.777 | 0.539 | 0.000 | 0.149 | 0.933 | 1.419 | 0.025 | n/a | 0.070 | 6.552 | n/a | n/a | 0.077 | 6.130 | 0.287 | 0.077 |
| p99 | 40.499 | 2.580 | 0.000 | 3.601 | 20.864 | n/a | 0.000 | 1.039 | 4.391 | 6.967 | 0.037 | n/a | 0.152 | 8.557 | n/a | n/a | 0.447 | 21.552 | 0.597 | 0.447 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd0000000000000039 | 40.499 | 20.864 | 0.539 | 0.000 | 0.149 | 4.005 | 6.967 | 0.025 | n/a | 0.152 | 7.708 | n/a | n/a | 0.089 | 21.552 | 0.532 | 0.089 | node-158/thread-8/worker.probe.transact | none observed |
| ccc60d8cfc9d6ddd0000000000000037 | 23.385 | 12.938 | n/a | 0.000 | 1.026 | 0.933 | 1.419 | 0.015 | n/a | 0.055 | 6.552 | n/a | n/a | 0.447 | 13.964 | 0.597 | 0.447 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd000000000000003d | 22.278 | 5.777 | 0.242 | 0.000 | 0.112 | 4.391 | 5.987 | 0.037 | n/a | 0.070 | 5.586 | n/a | n/a | 0.077 | 6.130 | 0.275 | 0.077 | gw-w/thread-114/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd000000000000003b | 15.224 | 3.327 | n/a | 0.000 | 1.039 | 0.757 | 1.365 | 0.026 | n/a | 0.096 | 8.557 | n/a | n/a | 0.057 | 4.366 | 0.287 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.224 | 0.383 | 0.000 | 1.765 | 3.327 | n/a | 0.000 | 1.039 | 0.757 | 1.365 | 0.026 | n/a | 0.096 | 8.557 | n/a | n/a | 0.057 | 4.366 | 0.287 | 0.057 |
| p99 | 15.224 | 0.383 | 0.000 | 1.765 | 3.327 | n/a | 0.000 | 1.039 | 0.757 | 1.365 | 0.026 | n/a | 0.096 | 8.557 | n/a | n/a | 0.057 | 4.366 | 0.287 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd000000000000003b | 15.224 | 3.327 | n/a | 0.000 | 1.039 | 0.757 | 1.365 | 0.026 | n/a | 0.096 | 8.557 | n/a | n/a | 0.057 | 4.366 | 0.287 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.074 | 0.894 | 0.000 | 0.644 | 6.092 | 0.343 | 0.000 | 0.062 | 1.992 | 1.598 | 0.020 | n/a | 0.301 | 4.465 | n/a | n/a | 0.113 | 6.346 | 0.487 | 0.113 |
| p99 | 21.195 | 1.490 | 0.000 | 2.393 | 10.527 | n/a | 0.000 | 0.254 | 3.712 | 4.767 | 0.021 | n/a | 0.320 | 6.467 | n/a | n/a | 0.182 | 10.920 | 0.515 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd0000000000000044 | 21.195 | 10.527 | 0.343 | 0.000 | 0.049 | 3.712 | 1.598 | 0.021 | n/a | 0.301 | 4.460 | n/a | n/a | 0.182 | 10.920 | 0.515 | 0.182 | node-158/thread-8/client.persist-and-resolve | none observed |
| ccc60d8cfc9d6ddd0000000000000041 | 19.074 | 5.155 | 0.259 | 0.000 | 0.062 | 1.992 | 4.767 | 0.020 | n/a | 0.275 | 6.467 | n/a | n/a | 0.077 | 5.476 | 0.287 | 0.077 | gw-w/thread-99/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd000000000000003f | 13.039 | 6.092 | n/a | 0.000 | 0.254 | 0.911 | 0.866 | 0.017 | n/a | 0.320 | 4.465 | n/a | n/a | 0.113 | 6.346 | 0.487 | 0.113 | gw-w/thread-121/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.039 | 1.490 | 0.000 | 2.393 | 6.092 | n/a | 0.000 | 0.254 | 0.911 | 0.866 | 0.017 | n/a | 0.320 | 4.465 | n/a | n/a | 0.113 | 6.346 | 0.487 | 0.113 |
| p99 | 13.039 | 1.490 | 0.000 | 2.393 | 6.092 | n/a | 0.000 | 0.254 | 0.911 | 0.866 | 0.017 | n/a | 0.320 | 4.465 | n/a | n/a | 0.113 | 6.346 | 0.487 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd000000000000003f | 13.039 | 6.092 | n/a | 0.000 | 0.254 | 0.911 | 0.866 | 0.017 | n/a | 0.320 | 4.465 | n/a | n/a | 0.113 | 6.346 | 0.487 | 0.113 | gw-w/thread-121/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.319 | 0.000 | 0.000 | 0.638 | 5.000 | 0.228 | 0.000 | 0.235 | 1.037 | 1.634 | 0.019 | n/a | 0.170 | 9.400 | n/a | n/a | 0.051 | 5.355 | 0.264 | 0.051 |
| p99 | 37.292 | 2.935 | 0.004 | 2.207 | 6.372 | n/a | 0.000 | 0.462 | 1.649 | 4.695 | 0.027 | n/a | 0.460 | 31.963 | n/a | n/a | 0.083 | 6.892 | 0.312 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd0000000000000045 | 37.292 | 3.357 | n/a | 0.000 | 0.462 | 0.561 | 0.704 | 0.012 | n/a | 0.170 | 31.963 | n/a | n/a | 0.063 | 3.819 | 0.102 | 0.063 | gw-w/thread-96/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd000000000000004d | 24.358 | 6.372 | 0.212 | 0.000 | 0.308 | 1.649 | 1.634 | 0.023 | n/a | 0.313 | 13.797 | n/a | n/a | 0.051 | 6.892 | 0.283 | 0.051 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd000000000000004a | 20.319 | 5.000 | 0.228 | 0.000 | 0.127 | 1.298 | 4.695 | 0.019 | n/a | 0.460 | 8.409 | n/a | n/a | 0.083 | 5.355 | 0.264 | 0.083 | gw-w/thread-112/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd0000000000000047 | 18.304 | 5.474 | n/a | 0.000 | 0.235 | 1.037 | 1.915 | 0.027 | n/a | 0.167 | 9.400 | n/a | n/a | 0.049 | 5.708 | 0.312 | 0.049 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.292 | 0.475 | 0.004 | 1.698 | 3.357 | n/a | 0.000 | 0.462 | 0.561 | 0.704 | 0.012 | n/a | 0.170 | 31.963 | n/a | n/a | 0.063 | 3.819 | 0.102 | 0.063 |
| p99 | 37.292 | 0.475 | 0.004 | 1.698 | 3.357 | n/a | 0.000 | 0.462 | 0.561 | 0.704 | 0.012 | n/a | 0.170 | 31.963 | n/a | n/a | 0.063 | 3.819 | 0.102 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd0000000000000045 | 37.292 | 3.357 | n/a | 0.000 | 0.462 | 0.561 | 0.704 | 0.012 | n/a | 0.170 | 31.963 | n/a | n/a | 0.063 | 3.819 | 0.102 | 0.063 | gw-w/thread-96/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.650 | 0.462 | 0.000 | 0.509 | 6.521 | 0.335 | 0.000 | 0.122 | 1.299 | 1.415 | 0.019 | n/a | 0.091 | 16.744 | n/a | n/a | 0.039 | 6.857 | 0.070 | 0.039 |
| p99 | 170.594 | 2.385 | 0.158 | 3.119 | 11.709 | n/a | 0.000 | 0.563 | 4.382 | 30.714 | 0.047 | n/a | 0.284 | 123.377 | n/a | n/a | 0.072 | 11.948 | 0.339 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd0000000000000053 | 170.594 | 11.709 | 0.174 | 0.000 | 0.065 | 4.382 | 30.714 | 0.047 | n/a | 0.089 | 123.377 | n/a | n/a | 0.036 | 11.948 | 0.070 | 0.036 | gw-w/thread-92/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd0000000000000056 | 137.083 | 6.527 | 0.335 | 0.000 | 0.122 | 1.467 | 13.414 | 0.026 | n/a | 0.091 | 115.037 | n/a | n/a | 0.063 | 6.985 | 0.051 | 0.063 | gw-w/thread-105/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd000000000000004e | 26.650 | 6.521 | n/a | 0.000 | 0.336 | 1.299 | 1.415 | 0.012 | n/a | 0.284 | 16.744 | n/a | n/a | 0.039 | 6.857 | 0.257 | 0.039 | gw-w/thread-116/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd0000000000000051 | 15.879 | 4.815 | n/a | 0.000 | 0.563 | 0.964 | 1.210 | 0.019 | n/a | 0.104 | 8.133 | n/a | n/a | 0.072 | 5.377 | 0.339 | 0.072 | gw-w/thread-87/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.451 | 0.340 | 0.000 | 1.473 | 4.619 | n/a | 0.000 | 0.145 | 0.792 | 1.624 | 0.015 | n/a | 0.056 | 10.769 | n/a | n/a | 0.051 | 5.127 | 0.272 | 0.051 |
| p99 | 90.067 | 2.157 | 0.006 | 2.449 | 7.089 | n/a | 0.000 | 0.938 | 1.850 | 13.279 | 0.022 | n/a | 0.088 | 67.366 | n/a | n/a | 0.058 | 7.425 | 0.340 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd0000000000000058 | 90.067 | 7.089 | 0.202 | 0.000 | 0.134 | 1.850 | 13.279 | 0.022 | n/a | 0.071 | 67.366 | n/a | n/a | 0.055 | 7.425 | 0.082 | 0.055 | gw-w/thread-114/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd000000000000005e | 23.631 | 4.644 | 0.253 | 0.000 | 0.138 | 1.130 | 6.396 | 0.018 | n/a | 0.048 | 10.950 | n/a | n/a | 0.055 | 5.035 | 0.213 | 0.055 | gw-w/thread-104/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd0000000000000062 | 23.062 | 4.063 | 0.214 | 0.000 | 0.145 | 1.085 | 6.653 | 0.021 | n/a | 0.054 | 10.769 | n/a | n/a | 0.058 | 4.422 | 0.192 | 0.058 | gw-w/thread-96/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd0000000000000060 | 21.451 | 5.973 | n/a | 0.000 | 0.636 | 0.792 | 1.624 | 0.015 | n/a | 0.057 | 12.302 | n/a | n/a | 0.051 | 6.610 | 0.308 | 0.051 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd000000000000005c | 16.340 | 4.619 | n/a | 0.000 | 0.938 | 0.750 | 0.844 | 0.011 | n/a | 0.088 | 9.041 | n/a | n/a | 0.048 | 5.558 | 0.340 | 0.048 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd0000000000000059 | 15.962 | 4.273 | n/a | 0.000 | 0.854 | 0.708 | 0.802 | 0.010 | n/a | 0.051 | 9.219 | n/a | n/a | 0.045 | 5.127 | 0.321 | 0.045 | gw-w/thread-115/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd0000000000000064 | 12.860 | 3.364 | n/a | 0.000 | 0.139 | 0.589 | 0.752 | 0.012 | n/a | 0.056 | 7.909 | n/a | n/a | 0.040 | 3.503 | 0.272 | 0.040 | gw-w/thread-106/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.962 | 1.254 | 0.000 | 1.715 | 4.273 | n/a | 0.000 | 0.854 | 0.708 | 0.802 | 0.011 | n/a | 0.056 | 9.041 | n/a | n/a | 0.045 | 5.127 | 0.321 | 0.045 |
| p99 | 16.340 | 1.763 | 0.006 | 2.449 | 4.619 | n/a | 0.000 | 0.938 | 0.750 | 0.844 | 0.012 | n/a | 0.088 | 9.219 | n/a | n/a | 0.048 | 5.558 | 0.340 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd000000000000005c | 16.340 | 4.619 | n/a | 0.000 | 0.938 | 0.750 | 0.844 | 0.011 | n/a | 0.088 | 9.041 | n/a | n/a | 0.048 | 5.558 | 0.340 | 0.048 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd0000000000000059 | 15.962 | 4.273 | n/a | 0.000 | 0.854 | 0.708 | 0.802 | 0.010 | n/a | 0.051 | 9.219 | n/a | n/a | 0.045 | 5.127 | 0.321 | 0.045 | gw-w/thread-115/peer.transact-await (includes order/network/storage) | none observed |
| ccc60d8cfc9d6ddd0000000000000064 | 12.860 | 3.364 | n/a | 0.000 | 0.139 | 0.589 | 0.752 | 0.012 | n/a | 0.056 | 7.909 | n/a | n/a | 0.040 | 3.503 | 0.272 | 0.040 | gw-w/thread-106/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.807 | n/a | n/a | n/a | 0.427 | 1.139 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 2.786 | 0.994 | 0.017 |
| p99 | 25.333 | n/a | n/a | n/a | 24.211 | 18.297 | 0.970 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.054 | 25.321 | 1.000 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccc60d8cfc9d6ddd0000000000000061 | 25.333 | 24.211 | 0.140 | 0.970 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 25.321 | 1.000 | 0.012 | node-158/thread-2/replica.pull-at | none observed |
| ccc60d8cfc9d6ddd0000000000000038 | 20.438 | 2.087 | 18.297 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.054 | 20.384 | 0.997 | 0.054 | node-158/thread-0/rpc.replica.observe | none observed |
| ccc60d8cfc9d6ddd000000000000005a | 10.456 | 10.363 | 0.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 10.443 | 0.999 | 0.013 | node-158/thread-2/replica.pull-at | none observed |
| ccc60d8cfc9d6ddd0000000000000065 | 7.017 | 6.517 | 0.125 | 0.354 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 6.995 | 0.997 | 0.022 | node-158/thread-2/replica.pull-at | none observed |
| ccc60d8cfc9d6ddd0000000000000049 | 6.208 | 0.427 | 5.769 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 6.196 | 0.998 | 0.011 | node-158/thread-0/rpc.replica.observe | none observed |
| ccc60d8cfc9d6ddd000000000000005d | 2.807 | 0.507 | 2.279 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 2.786 | 0.992 | 0.021 | node-158/thread-0/rpc.replica.observe | none observed |
| ccc60d8cfc9d6ddd0000000000000052 | 1.924 | 0.276 | 1.620 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 1.895 | 0.985 | 0.028 | node-158/thread-0/rpc.replica.observe | none observed |
| ccc60d8cfc9d6ddd000000000000003c | 1.704 | 0.224 | 1.471 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 1.695 | 0.994 | 0.010 | node-158/thread-0/rpc.replica.observe | none observed |
| ccc60d8cfc9d6ddd0000000000000040 | 1.327 | 0.171 | 1.139 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 1.310 | 0.987 | 0.017 | node-158/thread-0/rpc.replica.observe | none observed |
| ccc60d8cfc9d6ddd000000000000004f | 1.314 | 0.381 | 0.898 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.035 | 1.279 | 0.973 | 0.035 | node-158/thread-0/rpc.replica.observe | none observed |
| ccc60d8cfc9d6ddd0000000000000046 | 0.930 | 0.324 | 0.596 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.921 | 0.990 | 0.010 | node-158/thread-0/rpc.replica.observe | none observed |

## P1 / warmup / read (234 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 271.121 | n/a | n/a | n/a | 36.293 | n/a | 7.529 | 271.061 | 3.826 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.599 | 271.118 | 1.000 | 7.599 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3a5f0750b33f5bb10000000000000bbf | 271.274 | 0.360 | n/a | 0.000 | 270.909 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 271.269 | 1.000 | 0.005 | node-158/thread-5/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb10000000000000bc0 | 271.127 | 0.044 | n/a | 0.000 | 271.080 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.124 | 1.000 | 0.003 | node-158/thread-5/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb10000000000000bc2 | 271.121 | 0.057 | n/a | 0.000 | 271.061 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.118 | 1.000 | 0.003 | node-158/thread-5/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb10000000000000bc1 | 271.117 | 0.020 | n/a | 0.000 | 271.094 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.115 | 1.000 | 0.003 | node-158/thread-5/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b30000000000000ab2 | 270.875 | 0.631 | n/a | 0.000 | 270.236 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 270.867 | 1.000 | 0.008 | node-158/thread-4/reader.straddle-await-ack | none observed |
| e0920be97447f3400000000000000fa9 | 270.591 | 0.017 | n/a | 0.000 | 270.573 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.590 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f3400000000000000fa8 | 270.582 | 0.018 | n/a | 0.000 | 270.563 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.581 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f3400000000000000fa5 | 270.573 | 0.291 | n/a | 0.000 | 270.279 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.570 | 1.000 | 0.002 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f3400000000000000fa7 | 270.569 | 0.021 | n/a | 0.000 | 270.546 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.568 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f3400000000000000fa6 | 270.559 | 0.051 | n/a | 0.000 | 270.507 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.558 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb10000000000000bce | 270.534 | 0.108 | n/a | 0.000 | 270.422 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 270.530 | 1.000 | 0.004 | node-158/thread-5/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b30000000000000ab3 | 270.512 | 0.079 | n/a | 0.000 | 270.426 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 270.505 | 1.000 | 0.007 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b30000000000000ab4 | 270.467 | 0.032 | n/a | 0.000 | 270.429 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 270.462 | 1.000 | 0.005 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b30000000000000acc | 269.545 | 0.057 | n/a | 0.000 | 269.483 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 269.540 | 1.000 | 0.005 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b30000000000000acd | 269.491 | 0.023 | n/a | 0.000 | 269.463 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 269.487 | 1.000 | 0.004 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b30000000000000ace | 269.476 | 0.023 | n/a | 0.000 | 269.448 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 269.471 | 1.000 | 0.004 | node-158/thread-4/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb1000000000000ce90 | 265.625 | 0.252 | n/a | 0.000 | 265.367 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 265.619 | 1.000 | 0.006 | node-158/thread-5/reader.straddle-await-ack | none observed |
| e0920be97447f340000000000000dc70 | 265.016 | 0.032 | n/a | 0.000 | 264.983 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.015 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f340000000000000dc6f | 264.979 | 0.171 | n/a | 0.000 | 264.807 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.978 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f340000000000000dc6e | 264.805 | 0.046 | n/a | 0.000 | 264.757 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.804 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1 / read (115 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 262.455 | n/a | n/a | n/a | 2.408 | n/a | 0.000 | 262.217 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.479 | 262.451 | 1.000 | 0.479 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a8227a5f3e2236b30000000000023e49 | 286.534 | 0.085 | n/a | 0.000 | 286.447 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.532 | 1.000 | 0.002 | node-158/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| a8227a5f3e2236b3000000000001686f | 262.455 | 0.235 | n/a | 0.000 | 262.217 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 262.451 | 1.000 | 0.003 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b3000000000000f3f7 | 7.678 | 4.704 | n/a | 0.000 | 0.000 | 0.576 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.399 | 4.704 | 0.613 | 2.399 | node-158/thread-4/reader.execute | none observed |
| a8227a5f3e2236b3000000000000fd09 | 2.412 | 2.408 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.408 | 0.998 | 0.004 | node-158/thread-4/reader.execute | none observed |
| a8227a5f3e2236b3000000000000fc4c | 0.479 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.479 | 0.000 | 0.000 | 0.479 | uncovered | none observed |
| a8227a5f3e2236b3000000000000f971 | 0.431 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.431 | 0.000 | 0.000 | 0.431 | uncovered | none observed |
| a8227a5f3e2236b3000000000000fcca | 0.430 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.430 | 0.000 | 0.000 | 0.430 | uncovered | none observed |
| a8227a5f3e2236b30000000000019be5 | 0.345 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.345 | 0.000 | 0.000 | 0.345 | uncovered | none observed |
| a8227a5f3e2236b30000000000012cfb | 0.330 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.330 | 0.000 | 0.000 | 0.330 | uncovered | none observed |
| a8227a5f3e2236b30000000000012da8 | 0.303 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.303 | 0.000 | 0.000 | 0.303 | uncovered | none observed |
| a8227a5f3e2236b3000000000001d166 | 0.301 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.301 | 0.000 | 0.000 | 0.301 | uncovered | none observed |
| a8227a5f3e2236b30000000000020fd7 | 0.291 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.291 | 0.000 | 0.000 | 0.291 | uncovered | none observed |
| a8227a5f3e2236b300000000000143c7 | 0.290 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.290 | 0.000 | 0.000 | 0.290 | uncovered | none observed |
| a8227a5f3e2236b3000000000000fa74 | 0.287 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.287 | 0.000 | 0.000 | 0.287 | uncovered | none observed |
| a8227a5f3e2236b3000000000000fa54 | 0.277 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 | uncovered | none observed |
| a8227a5f3e2236b30000000000012d18 | 0.277 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 | uncovered | none observed |
| a8227a5f3e2236b3000000000001d151 | 0.274 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | uncovered | none observed |
| a8227a5f3e2236b3000000000001295d | 0.273 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.273 | 0.000 | 0.000 | 0.273 | uncovered | none observed |
| a8227a5f3e2236b30000000000022ba4 | 0.270 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | uncovered | none observed |
| a8227a5f3e2236b3000000000000f7b1 | 0.268 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | uncovered | none observed |

## P1 / L4 / read (273 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 278.242 | n/a | n/a | n/a | 5.049 | n/a | 0.000 | 278.140 | 0.409 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.927 | 278.240 | 1.000 | 1.927 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3a5f0750b33f5bb1000000000001f36e | 281.120 | 0.169 | n/a | 0.000 | 280.947 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 281.116 | 1.000 | 0.004 | node-158/thread-5/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| a8227a5f3e2236b300000000000396f1 | 278.279 | 0.020 | n/a | 0.000 | 278.259 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.278 | 1.000 | 0.001 | node-158/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| a8227a5f3e2236b300000000000396f0 | 278.242 | 0.100 | n/a | 0.000 | 278.140 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.240 | 1.000 | 0.002 | node-158/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| e0920be97447f3400000000000020be5 | 274.964 | 0.148 | n/a | 0.000 | 274.814 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.962 | 1.000 | 0.002 | node-158/thread-6/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| a8227a5f3e2236b30000000000023f1a | 266.095 | 0.027 | n/a | 0.000 | 266.066 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.093 | 1.000 | 0.002 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b30000000000023f19 | 266.078 | 0.154 | n/a | 0.000 | 265.920 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 266.074 | 1.000 | 0.004 | node-158/thread-4/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb1000000000000e7e5 | 264.822 | 0.212 | n/a | 0.000 | 264.544 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.065 | 264.757 | 1.000 | 0.065 | node-158/thread-5/reader.straddle-await-ack | none observed |
| e0920be97447f340000000000000f4ea | 250.395 | 0.253 | n/a | 0.000 | 250.134 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 250.387 | 1.000 | 0.008 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f340000000000000f4d4 | 62.598 | 0.348 | n/a | 0.000 | 62.239 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 62.587 | 1.000 | 0.011 | node-158/thread-6/reader.straddle-await-ack | replica.apply-delta 0.025ms |
| a8227a5f3e2236b30000000000023e4c | 62.394 | 0.050 | n/a | 0.000 | 62.342 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 62.392 | 1.000 | 0.002 | node-158/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 3a5f0750b33f5bb1000000000000e7a1 | 61.394 | 0.194 | n/a | 0.000 | 61.197 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 61.391 | 1.000 | 0.004 | node-158/thread-5/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| e0920be97447f340000000000000f4dd | 27.155 | 18.246 | n/a | 1.822 | 0.000 | 5.721 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.365 | 20.068 | 0.739 | 1.365 | node-158/thread-6/reader.execute | none observed |
| a8227a5f3e2236b30000000000023e91 | 6.633 | 2.077 | n/a | 0.000 | 0.000 | 0.409 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.147 | 2.077 | 0.313 | 4.147 | node-158/thread-4/socket.wait-first-byte | none observed |
| 3a5f0750b33f5bb1000000000000e7db | 5.299 | 2.898 | n/a | 0.000 | 0.000 | 0.474 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.927 | 2.898 | 0.547 | 1.927 | node-158/thread-5/reader.execute | none observed |
| a8227a5f3e2236b3000000000002b79e | 5.172 | 5.168 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.168 | 0.999 | 0.003 | node-158/thread-4/replica.pull-at | none observed |
| 3a5f0750b33f5bb1000000000000e7f0 | 5.055 | 5.049 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 5.049 | 0.999 | 0.006 | node-158/thread-5/replica.pull-at | replica.apply-delta 0.185ms |
| a8227a5f3e2236b3000000000002b302 | 4.057 | 4.045 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 4.045 | 0.997 | 0.013 | node-158/thread-4/reader.execute | none observed |
| a8227a5f3e2236b30000000000023f1b | 3.540 | 3.535 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.535 | 0.999 | 0.005 | node-158/thread-4/replica.pull-at | replica.apply-delta 0.095ms |
| a8227a5f3e2236b30000000000023f1d | 3.406 | 3.398 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 3.398 | 0.998 | 0.008 | node-158/thread-4/replica.pull-at | replica.apply-delta 0.095ms |
| e0920be97447f340000000000000f4eb | 3.180 | 3.175 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.175 | 0.999 | 0.005 | node-158/thread-6/replica.pull-at | replica.apply-delta 0.100ms |

## P1 / L16 / read (272 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.021 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 265.621 | n/a | n/a | n/a | 5.271 | n/a | 0.000 | 265.599 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.125 | 265.620 | 1.000 | 3.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a8227a5f3e2236b3000000000003ade3 | 265.642 | 0.015 | n/a | 0.000 | 265.625 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.640 | 1.000 | 0.002 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b3000000000003ade2 | 265.635 | 0.014 | n/a | 0.000 | 265.620 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.634 | 1.000 | 0.001 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b3000000000003ade1 | 265.621 | 0.021 | n/a | 0.000 | 265.599 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.620 | 1.000 | 0.001 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b3000000000003ade0 | 265.607 | 0.021 | n/a | 0.000 | 265.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.606 | 1.000 | 0.001 | node-158/thread-4/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b3000000000003addf | 265.594 | 0.049 | n/a | 0.000 | 265.544 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.593 | 1.000 | 0.001 | node-158/thread-4/reader.straddle-await-ack | none observed |
| e0920be97447f3400000000000022511 | 265.287 | 0.035 | n/a | 0.000 | 265.251 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.286 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f3400000000000022510 | 265.236 | 0.036 | n/a | 0.000 | 265.199 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.235 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f340000000000002250f | 265.178 | 0.042 | n/a | 0.000 | 265.135 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.177 | 1.000 | 0.001 | node-158/thread-6/reader.straddle-await-ack | none observed |
| e0920be97447f340000000000002250e | 265.134 | 0.053 | n/a | 0.000 | 265.079 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.132 | 1.000 | 0.002 | node-158/thread-6/reader.straddle-await-ack | none observed |
| a8227a5f3e2236b3000000000003adde | 265.106 | 0.128 | n/a | 0.000 | 264.976 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.104 | 1.000 | 0.002 | node-158/thread-4/reader.straddle-await-ack | none observed |
| e0920be97447f340000000000002250d | 265.025 | 0.142 | n/a | 0.000 | 264.880 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 265.022 | 1.000 | 0.003 | node-158/thread-6/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb1000000000002010d | 264.105 | 0.062 | n/a | 0.000 | 264.041 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.104 | 1.000 | 0.002 | node-158/thread-5/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb1000000000002010c | 264.058 | 0.174 | n/a | 0.000 | 263.882 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 264.055 | 1.000 | 0.003 | node-158/thread-5/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb1000000000002012e | 263.713 | 0.030 | n/a | 0.000 | 263.682 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.712 | 1.000 | 0.001 | node-158/thread-5/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb1000000000002012d | 263.682 | 0.026 | n/a | 0.000 | 263.656 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.681 | 1.000 | 0.001 | node-158/thread-5/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb1000000000002012c | 263.657 | 0.034 | n/a | 0.000 | 263.622 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.656 | 1.000 | 0.001 | node-158/thread-5/reader.straddle-await-ack | none observed |
| 3a5f0750b33f5bb1000000000001f37e | 241.593 | 0.040 | n/a | 0.000 | 241.550 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 241.590 | 1.000 | 0.003 | node-158/thread-5/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 3a5f0750b33f5bb1000000000001f38f | 240.837 | 0.043 | n/a | 0.000 | 240.791 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 240.835 | 1.000 | 0.003 | node-158/thread-5/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 3a5f0750b33f5bb1000000000001f390 | 240.809 | 0.022 | n/a | 0.000 | 240.786 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 240.808 | 1.000 | 0.002 | node-158/thread-5/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 3a5f0750b33f5bb1000000000001f391 | 240.801 | 0.021 | n/a | 0.000 | 240.778 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 240.799 | 1.000 | 0.002 | node-158/thread-5/reader.straddle-await-ack | replica.apply-delta 0.046ms |

## P1 / tail / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.021 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.000 | 0.000 | 0.021 |
| p99 | 0.056 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.056 | 0.000 | 0.000 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0920be97447f3400000000000031e8e | 0.056 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.056 | 0.000 | 0.000 | 0.056 | uncovered | none observed |
| a8227a5f3e2236b3000000000004b09e | 0.053 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 0.000 | 0.000 | 0.053 | uncovered | none observed |
| a8227a5f3e2236b3000000000004b0a0 | 0.037 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.037 | 0.000 | 0.000 | 0.037 | uncovered | none observed |
| e0920be97447f3400000000000031e90 | 0.023 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 0.000 | 0.000 | 0.023 | uncovered | none observed |
| e0920be97447f3400000000000031e8f | 0.021 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.000 | 0.000 | 0.021 | uncovered | none observed |
| a8227a5f3e2236b3000000000004b0a2 | 0.020 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 0.000 | 0.000 | 0.020 | uncovered | none observed |
| a8227a5f3e2236b3000000000004b0a1 | 0.019 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.000 | 0.000 | 0.019 | uncovered | none observed |
| a8227a5f3e2236b3000000000004b09f | 0.015 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 | uncovered | none observed |

## P3 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.954 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 200.741 | 0.013 | n/a | 0.056 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 |
| p99 | 223.024 | n/a | n/a | n/a | 0.914 | n/a | 0.000 | 0.000 | 7.685 | 214.108 | 0.105 | n/a | 0.086 | 0.000 | n/a | n/a | 2.989 | 0.914 | 0.004 | 2.989 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d011553a60da24b0000000000000058 | 223.024 | 0.914 | n/a | 0.000 | 0.000 | 7.685 | 214.108 | 0.105 | n/a | 0.083 | 0.000 | n/a | n/a | 0.128 | 0.914 | 0.004 | 0.128 | gw-r/thread-48/gateway.admitted-work | none observed |
| 10455675bdf218210000000000000007 | 203.860 | 0.000 | n/a | 0.000 | 0.000 | 1.186 | 202.421 | 0.013 | n/a | 0.056 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-42/journal/page | none observed |
| 10455675bdf21821000000000000002f | 202.407 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 201.045 | 0.016 | n/a | 0.057 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-45/journal/page | none observed |
| 10455675bdf218210000000000000005 | 202.170 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 200.955 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 10455675bdf218210000000000000031 | 201.954 | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 200.713 | 0.014 | n/a | 0.037 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-46/journal/page | none observed |
| 10455675bdf218210000000000000006 | 201.893 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 200.719 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-49/journal/page | none observed |
| 10455675bdf218210000000000000030 | 201.727 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 200.741 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-42/journal/page | none observed |
| cbd1883d6ba513d10000000000000002 | 3.583 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.989 | 0.000 | 0.000 | 2.989 | node-158/thread-2/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (4577 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 366.768 | n/a | n/a | n/a | 3.811 | n/a | 0.000 | 0.000 | 191.793 | 98.051 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.110 | 4.406 | 0.013 | 0.110 |
| p99 | 1140.990 | n/a | n/a | n/a | 14.981 | n/a | 3.951 | 0.000 | 843.491 | 569.576 | 0.028 | n/a | 0.148 | 0.000 | n/a | n/a | 442.013 | 17.592 | 0.086 | 442.013 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d011553a60da24b000000000000621f | 1517.297 | 8.060 | n/a | 0.000 | 0.000 | 952.766 | 556.341 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.072 | 8.060 | 0.005 | 0.072 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 4.924ms; client.parse 2.670ms; client.reach-decode-and-cache 1.521ms; client.reach-decode-and-cache 1.311ms |
| 6d011553a60da24b0000000000000376 | 1516.697 | 6.032 | n/a | 2.549 | 0.000 | 1196.738 | 311.066 | 0.024 | n/a | 0.197 | 0.000 | n/a | n/a | 0.089 | 8.582 | 0.006 | 0.089 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 4.419ms; client.reach-decode-and-cache 3.309ms; client.reach-decode-and-cache 2.844ms; client.reach-decode-and-cache 2.785ms; client.reach-decode-and-cache 2.674ms |
| 6d011553a60da24b0000000000011593 | 1474.187 | 7.333 | n/a | 0.000 | 0.000 | 569.328 | 897.257 | 0.003 | n/a | 0.048 | 0.000 | n/a | n/a | 0.218 | 7.333 | 0.005 | 0.218 | gw-r/thread-49/journal/page | client.reach-decode-and-cache 3.626ms |
| 6d011553a60da24b000000000000067a | 1401.410 | 6.746 | n/a | 2.937 | 0.000 | 787.073 | 604.388 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.163 | 9.682 | 0.007 | 0.163 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 4.222ms; client.parse 3.305ms; client.reach-decode-and-cache 3.094ms; client.reach-decode-and-cache 2.967ms; client.reach-decode-and-cache 2.234ms |
| 6d011553a60da24b0000000000028667 | 1341.261 | 2.570 | n/a | 0.000 | 0.000 | 974.498 | 364.050 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.086 | 2.570 | 0.002 | 0.086 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 1.649ms; client.reach-decode-and-cache 1.267ms; client.reach-decode-and-cache 1.257ms |
| 6d011553a60da24b000000000000c73c | 1337.733 | 2.360 | n/a | 0.000 | 0.000 | 915.251 | 420.005 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.068 | 2.360 | 0.002 | 0.068 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 5.766ms; client.parse 2.205ms; client.reach-decode-and-cache 2.087ms; client.reach-decode-and-cache 1.484ms; client.reach-decode-and-cache 1.281ms |
| 6d011553a60da24b000000000001a346 | 1299.804 | 8.833 | n/a | 0.000 | 0.000 | 814.981 | 475.699 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.251 | 8.833 | 0.007 | 0.251 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 2.476ms; client.reach-decode-and-cache 1.862ms; client.reach-decode-and-cache 1.581ms; client.reach-decode-and-cache 1.490ms; client.reach-decode-and-cache 1.428ms |
| 6d011553a60da24b000000000002b01a | 1280.034 | 9.879 | n/a | 2.380 | 0.000 | 295.280 | 972.172 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.287 | 12.259 | 0.010 | 0.287 | gw-r/thread-49/journal/page | client.reach-decode-and-cache 1.382ms; client.reach-decode-and-cache 1.255ms; client.reach-decode-and-cache 1.194ms |
| 6d011553a60da24b000000000002c04e | 1275.230 | 4.680 | n/a | 4.066 | 0.000 | 1026.020 | 240.289 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.137 | 8.746 | 0.007 | 0.137 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 3.249ms; client.reach-decode-and-cache 2.176ms; client.reach-decode-and-cache 1.686ms; client.reach-decode-and-cache 1.162ms; client.reach-decode-and-cache 1.032ms |
| 6d011553a60da24b00000000000170ab | 1269.878 | 23.623 | n/a | 12.891 | 0.000 | 999.980 | 232.290 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 1.061 | 36.514 | 0.029 | 1.061 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 1.287ms; client.reach-decode-and-cache 1.243ms; client.reach-decode-and-cache 1.185ms; client.reach-decode-and-cache 1.175ms; client.reach-decode-and-cache 1.170ms |
| 6d011553a60da24b000000000001fc15 | 1266.911 | 6.787 | n/a | 0.000 | 0.000 | 1083.060 | 176.873 | 0.010 | n/a | 0.039 | 0.000 | n/a | n/a | 0.142 | 6.787 | 0.005 | 0.142 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 1.532ms; client.reach-decode-and-cache 1.486ms; client.reach-decode-and-cache 1.482ms; client.reach-decode-and-cache 1.478ms; client.reach-decode-and-cache 1.477ms |
| 6d011553a60da24b000000000002151f | 1256.948 | 18.879 | n/a | 2.777 | 0.000 | 816.970 | 418.031 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.257 | 21.656 | 0.017 | 0.257 | node-139/thread-0/socket.wait-first-byte | client.parse 3.582ms; client.reach-decode-and-cache 1.742ms; client.reach-decode-and-cache 1.403ms; client.reach-decode-and-cache 1.381ms; client.reach-decode-and-cache 1.271ms |
| 6d011553a60da24b0000000000031cc0 | 1252.860 | 2.854 | n/a | 0.000 | 0.000 | 1065.024 | 184.863 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.088 | 2.854 | 0.002 | 0.088 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 1.188ms; client.reach-decode-and-cache 1.127ms; client.reach-decode-and-cache 1.119ms; client.reach-decode-and-cache 1.029ms |
| 6d011553a60da24b0000000000006a3f | 1246.660 | 2.029 | n/a | 0.000 | 0.000 | 1040.239 | 204.259 | 0.005 | n/a | 0.074 | 0.000 | n/a | n/a | 0.054 | 2.029 | 0.002 | 0.054 | node-139/thread-0/socket.wait-first-byte | client.parse 2.026ms; client.reach-decode-and-cache 1.490ms; client.reach-decode-and-cache 1.386ms; client.reach-decode-and-cache 1.308ms; client.reach-decode-and-cache 1.142ms |
| 6d011553a60da24b000000000000ad3c | 1245.861 | 4.155 | n/a | 0.000 | 0.000 | 387.189 | 854.354 | 0.017 | n/a | 0.083 | 0.000 | n/a | n/a | 0.064 | 4.155 | 0.003 | 0.064 | gw-r/thread-45/journal/page | client.reach-decode-and-cache 1.348ms |
| 6d011553a60da24b0000000000007f8a | 1245.695 | 8.906 | n/a | 0.000 | 0.000 | 977.707 | 258.804 | 0.005 | n/a | 0.089 | 0.000 | n/a | n/a | 0.184 | 8.906 | 0.007 | 0.184 | node-139/thread-0/socket.wait-first-byte | none observed |
| 6d011553a60da24b00000000000177a1 | 1244.521 | 5.228 | n/a | 0.000 | 0.000 | 875.068 | 363.935 | 0.015 | n/a | 0.074 | 0.000 | n/a | n/a | 0.201 | 5.228 | 0.004 | 0.201 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 3.717ms; client.reach-decode-and-cache 1.349ms; client.reach-decode-and-cache 1.347ms; client.reach-decode-and-cache 1.182ms |
| 6d011553a60da24b0000000000015c3f | 1243.713 | 4.095 | n/a | 2.626 | 0.000 | 901.594 | 335.251 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.112 | 6.721 | 0.005 | 0.112 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 1.677ms; client.reach-decode-and-cache 1.415ms; client.reach-decode-and-cache 1.195ms; client.reach-decode-and-cache 1.178ms; client.reach-decode-and-cache 1.137ms |
| 6d011553a60da24b000000000003097e | 1230.267 | 3.959 | n/a | 2.877 | 0.000 | 283.188 | 940.089 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.114 | 6.836 | 0.006 | 0.114 | gw-r/thread-47/journal/page | client.parse 200.101ms; client.reach-decode-and-cache 6.126ms; client.reach-decode-and-cache 5.341ms; client.reach-decode-and-cache 5.159ms; client.parse 3.670ms |
| 6d011553a60da24b00000000000001db | 1228.602 | 4.424 | n/a | 0.000 | 0.000 | 917.371 | 306.507 | 0.015 | n/a | 0.097 | 0.000 | n/a | n/a | 0.189 | 4.424 | 0.004 | 0.189 | node-139/thread-0/socket.wait-first-byte | client.reach-decode-and-cache 13.285ms; client.reach-decode-and-cache 10.263ms; client.reach-decode-and-cache 3.357ms; client.reach-decode-and-cache 3.128ms; client.reach-decode-and-cache 2.496ms |

## P3 / warmup / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 414.712 | n/a | n/a | n/a | 2.333 | n/a | 0.000 | 0.000 | 1.162 | 411.081 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.101 | 2.333 | 0.006 | 0.101 |
| p99 | 811.955 | n/a | n/a | n/a | 5.858 | n/a | 0.000 | 0.000 | 3.698 | 809.063 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.424 | 5.858 | 0.033 | 0.424 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cbd1883d6ba513d1000000000000001c | 811.955 | 2.242 | n/a | 0.000 | 0.000 | 0.523 | 809.063 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.087 | 2.242 | 0.003 | 0.087 | gw-r/thread-46/journal/page | none observed |
| cbd1883d6ba513d1000000000000001a | 414.712 | 2.333 | n/a | 0.000 | 0.000 | 1.162 | 411.081 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.101 | 2.333 | 0.006 | 0.101 | gw-r/thread-45/journal/page | none observed |
| cbd1883d6ba513d1000000000000001d | 175.008 | 5.858 | n/a | 0.000 | 0.000 | 3.698 | 164.985 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.424 | 5.858 | 0.033 | 0.424 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 833.758 | n/a | n/a | n/a | 2.504 | n/a | 0.000 | 0.000 | 0.829 | 829.959 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.081 | 2.504 | 0.003 | 0.081 |
| p99 | 1000.200 | n/a | n/a | n/a | 2.646 | n/a | 0.000 | 0.000 | 1.267 | 997.022 | 0.010 | n/a | 0.032 | 0.000 | n/a | n/a | 0.283 | 2.646 | 0.015 | 0.283 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cbd1883d6ba513d10000000000000022 | 1000.200 | 2.504 | n/a | 0.000 | 0.000 | 0.552 | 997.022 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.081 | 2.504 | 0.003 | 0.081 | gw-r/thread-45/journal/page | none observed |
| cbd1883d6ba513d1000000000000001f | 833.758 | 2.646 | n/a | 0.000 | 0.000 | 0.829 | 829.959 | 0.010 | n/a | 0.032 | 0.000 | n/a | n/a | 0.283 | 2.646 | 0.003 | 0.283 | gw-r/thread-48/journal/page | none observed |
| cbd1883d6ba513d10000000000000020 | 159.405 | 2.395 | n/a | 0.000 | 0.000 | 1.267 | 155.623 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.079 | 2.395 | 0.015 | 0.079 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 283.447 | n/a | n/a | n/a | 2.397 | n/a | 0.000 | 0.000 | 1.267 | 270.747 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.084 | 2.397 | 0.004 | 0.084 |
| p99 | 1006.127 | n/a | n/a | n/a | 6.303 | n/a | 0.000 | 0.000 | 6.241 | 1002.214 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 47.147 | 6.303 | 0.032 | 47.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cbd1883d6ba513d10000000000000028 | 1006.127 | 2.521 | n/a | 0.000 | 0.000 | 1.267 | 1002.214 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.072 | 2.521 | 0.003 | 0.072 | gw-r/thread-42/journal/page | none observed |
| cbd1883d6ba513d10000000000000026 | 670.211 | 2.397 | n/a | 0.000 | 0.000 | 4.164 | 663.520 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.084 | 2.397 | 0.004 | 0.084 | gw-r/thread-47/journal/page | none observed |
| cbd1883d6ba513d10000000000000024 | 283.447 | 6.303 | n/a | 0.000 | 0.000 | 6.241 | 270.747 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.093 | 6.303 | 0.022 | 0.093 | gw-r/thread-42/journal/page | none observed |
| cbd1883d6ba513d10000000000000023 | 49.055 | 1.568 | n/a | 0.000 | 0.000 | 0.340 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.147 | 1.568 | 0.032 | 47.147 | node-158/thread-2/socket.wait-first-byte | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 433.689 | n/a | n/a | n/a | 3.064 | n/a | 0.000 | 0.000 | 0.571 | 430.176 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.091 | 3.064 | 0.006 | 0.091 |
| p99 | 964.577 | n/a | n/a | n/a | 4.999 | n/a | 0.000 | 0.000 | 5.530 | 960.313 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.195 | 4.999 | 0.023 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cbd1883d6ba513d1000000000000002e | 964.577 | 3.064 | n/a | 0.000 | 0.000 | 1.006 | 960.313 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.140 | 3.064 | 0.003 | 0.140 | gw-r/thread-42/journal/page | none observed |
| cbd1883d6ba513d1000000000000002c | 506.482 | 3.333 | n/a | 0.000 | 0.000 | 5.530 | 497.380 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.195 | 3.333 | 0.007 | 0.195 | gw-r/thread-44/journal/page | none observed |
| cbd1883d6ba513d1000000000000002a | 433.689 | 2.801 | n/a | 0.000 | 0.000 | 0.571 | 430.176 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.091 | 2.801 | 0.006 | 0.091 | gw-r/thread-49/journal/page | none observed |
| cbd1883d6ba513d10000000000000029 | 218.823 | 4.999 | n/a | 0.000 | 0.000 | 0.557 | 213.140 | 0.009 | n/a | 0.027 | 0.000 | n/a | n/a | 0.091 | 4.999 | 0.023 | 0.091 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 416.119 | n/a | n/a | n/a | 2.984 | n/a | 0.000 | 0.000 | 0.680 | 411.642 | 0.011 | n/a | 0.032 | 0.000 | n/a | n/a | 0.123 | 2.984 | 0.009 | 0.123 |
| p99 | 1004.938 | n/a | n/a | n/a | 20.774 | n/a | 0.970 | 0.000 | 2.827 | 1000.810 | 0.016 | n/a | 0.054 | 0.000 | n/a | n/a | 1.106 | 21.744 | 0.038 | 1.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cbd1883d6ba513d1000000000000003a | 1004.938 | 0.136 | n/a | 0.000 | 0.000 | 2.827 | 1000.810 | 0.013 | n/a | 0.046 | 0.000 | n/a | n/a | 1.106 | 0.136 | 0.000 | 1.106 | gw-r/thread-48/journal/page | none observed |
| cbd1883d6ba513d1000000000000002f | 951.857 | 2.984 | n/a | 0.000 | 0.000 | 0.680 | 948.047 | 0.011 | n/a | 0.035 | 0.000 | n/a | n/a | 0.100 | 2.984 | 0.003 | 0.100 | gw-r/thread-48/journal/page | none observed |
| cbd1883d6ba513d10000000000000035 | 788.894 | 20.774 | n/a | 0.970 | 0.000 | 2.052 | 764.780 | 0.009 | n/a | 0.016 | 0.000 | n/a | n/a | 0.292 | 21.744 | 0.028 | 0.292 | gw-r/thread-49/journal/page | none observed |
| cbd1883d6ba513d10000000000000033 | 598.034 | 2.517 | n/a | 0.000 | 0.000 | 2.158 | 593.220 | 0.010 | n/a | 0.026 | 0.000 | n/a | n/a | 0.103 | 2.517 | 0.004 | 0.103 | gw-r/thread-47/journal/page | none observed |
| cbd1883d6ba513d10000000000000038 | 416.119 | 3.285 | n/a | 0.354 | 0.000 | 0.666 | 411.642 | 0.016 | n/a | 0.034 | 0.000 | n/a | n/a | 0.123 | 3.639 | 0.009 | 0.123 | gw-r/thread-49/journal/page | none observed |
| cbd1883d6ba513d10000000000000032 | 240.055 | 4.344 | n/a | 0.000 | 0.000 | 0.499 | 235.021 | 0.010 | n/a | 0.021 | 0.000 | n/a | n/a | 0.159 | 4.344 | 0.018 | 0.159 | gw-r/thread-49/journal/page | none observed |
| cbd1883d6ba513d10000000000000037 | 222.041 | 7.692 | n/a | 0.645 | 0.000 | 0.691 | 212.690 | 0.015 | n/a | 0.054 | 0.000 | n/a | n/a | 0.254 | 8.337 | 0.038 | 0.254 | gw-r/thread-46/journal/page | none observed |
| cbd1883d6ba513d10000000000000030 | 85.608 | 2.936 | n/a | 0.000 | 0.000 | 0.425 | 82.102 | 0.013 | n/a | 0.032 | 0.000 | n/a | n/a | 0.100 | 2.936 | 0.034 | 0.100 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.677 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 200.697 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 205.336 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.895 | 203.948 | 0.025 | n/a | 0.060 | 0.000 | n/a | n/a | 0.682 | 0.000 | 0.000 | 0.682 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10455675bdf21821000000000000000e | 205.336 | 0.000 | n/a | 0.000 | 0.000 | 1.078 | 203.948 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-44/journal/page | none observed |
| 10455675bdf218210000000000000009 | 203.496 | 0.000 | n/a | 0.000 | 0.000 | 1.895 | 200.834 | 0.025 | n/a | 0.060 | 0.000 | n/a | n/a | 0.682 | 0.000 | 0.000 | 0.682 | gw-r/thread-48/journal/page | none observed |
| 10455675bdf218210000000000000008 | 201.806 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 200.803 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 10455675bdf21821000000000000000b | 201.679 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 200.808 | 0.014 | n/a | 0.048 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-44/journal/page | none observed |
| 10455675bdf21821000000000000000f | 201.677 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 200.697 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 10455675bdf21821000000000000000d | 201.558 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 200.558 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-42/journal/page | none observed |
| 10455675bdf21821000000000000000c | 160.425 | 0.000 | n/a | 0.000 | 0.000 | 0.671 | 159.625 | 0.003 | n/a | 0.015 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 10455675bdf218210000000000000011 | 160.032 | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 159.053 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-49/journal/page | none observed |
| 10455675bdf218210000000000000010 | 137.219 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 136.032 | 0.010 | n/a | 0.020 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.359 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 200.591 | 0.012 | n/a | 0.036 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 201.525 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 200.759 | 0.015 | n/a | 0.050 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10455675bdf218210000000000000013 | 201.525 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 200.759 | 0.014 | n/a | 0.050 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 10455675bdf218210000000000000014 | 201.498 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 200.591 | 0.015 | n/a | 0.036 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 10455675bdf218210000000000000012 | 201.359 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.624 | 0.012 | n/a | 0.044 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 10455675bdf218210000000000000015 | 167.009 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 166.175 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-42/journal/page | none observed |

## P3 / tail / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.952 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 200.887 | 0.014 | n/a | 0.043 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 205.955 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.942 | 203.884 | 3.387 | n/a | 0.089 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 10455675bdf218210000000000000029 | 205.955 | 0.000 | n/a | 0.000 | 0.000 | 4.942 | 200.777 | 0.011 | n/a | 0.046 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-47/journal/page | none observed |
| 10455675bdf218210000000000000023 | 204.658 | 0.000 | n/a | 0.000 | 0.000 | 0.515 | 203.884 | 0.026 | n/a | 0.089 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 10455675bdf21821000000000000002d | 203.325 | 0.000 | n/a | 0.000 | 0.000 | 2.189 | 200.932 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 10455675bdf218210000000000000027 | 202.961 | 0.000 | n/a | 0.000 | 0.000 | 1.378 | 201.325 | 0.038 | n/a | 0.063 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| 10455675bdf218210000000000000026 | 202.224 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 200.911 | 0.015 | n/a | 0.044 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-48/journal/page | none observed |
| 10455675bdf21821000000000000002e | 202.186 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 200.927 | 0.012 | n/a | 0.043 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-47/journal/page | none observed |
| 10455675bdf218210000000000000022 | 201.952 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 200.787 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-44/journal/page | none observed |
| 10455675bdf218210000000000000020 | 201.877 | 0.000 | n/a | 0.000 | 0.000 | 0.618 | 201.092 | 0.014 | n/a | 0.047 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-42/journal/page | none observed |
| 10455675bdf21821000000000000002b | 201.855 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 200.887 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 10455675bdf218210000000000000025 | 201.612 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 200.673 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-42/journal/page | none observed |
| 10455675bdf21821000000000000002c | 190.600 | 0.000 | n/a | 0.000 | 0.000 | 0.449 | 187.908 | 2.122 | n/a | 0.020 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 10455675bdf218210000000000000024 | 147.973 | 0.000 | n/a | 0.000 | 0.000 | 0.567 | 144.515 | 2.737 | n/a | 0.016 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-46/journal/page | none observed |
| 10455675bdf218210000000000000028 | 98.057 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 93.546 | 3.387 | n/a | 0.014 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-45/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

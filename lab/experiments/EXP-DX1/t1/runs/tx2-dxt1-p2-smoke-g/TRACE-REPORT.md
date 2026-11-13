# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (284.187 ms, trace `af9df8f9d7d04c4e00000000000000b2`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (131.618 ms, trace `af9df8f9d7d04c4e00000000000000f5`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (115.978 ms, trace `af9df8f9d7d04c4e00000000000000b5`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (80.688 ms, trace `af9df8f9d7d04c4e0000000000000145`); `gw-w/thread-62/peer.transact-await (includes order/network/storage)` (75.447 ms, trace `af9df8f9d7d04c4e0000000000000144`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-smoke-g`; source `f9f51d85bab0e75977e71edd735d1cb80ffeeb58`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 788322.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 100 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1411.540 | 178.106 | 269.427 | 39 |
| baseline | 0 | 1970.123 | 32.761 | 0.219 | 30 |
| L1 | 1 | 1976.604 | 150.531 | 15.204 | 44 |
| L4 | 4 | 1972.195 | 233.980 | 230.649 | 44 |
| L16 | 16 | 999.640 | 89.617 | 81.494 | 39 |
| L64 | 16 | 1903.164 | 229.323 | 220.404 | 44 |
| L256 | 16 | 1700.775 | 185.396 | 172.996 | 58 |
| L1024 | 16 | 1000.137 | 126.657 | 169.695 | 11 |
| recovery | 16 | 1855.853 | 162.705 | 211.834 | 44 |
| p4mix | 1 | 1943.476 | 38.423 | 24.610 | 43 |
| p4h1 | 1 | 1031.086 | 20.412 | 17.741 | 16 |
| grow3 | 0 | 1215.700 | 158.551 | 5.050 | 39 |
| p4h3 | 1 | 2216.857 | 72.448 | 44.228 | 122 |
| grow10 | 0 | 81.465 | 32.289 | 8.750 | 22 |
| p4h10 | 1 | 1716.672 | 38.910 | 38.477 | 58 |
| presweep | 16 | 1367.579 | 131.328 | 237.780 | 44 |
| sweep | 16 | 151.195 | 41.632 | 59.690 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000b2 | driver.queue.scheduler-dispatch | 0.109 | none | 0 / 32 |
| af9df8f9d7d04c4e00000000000000b2 | driver.queue.scheduler-late | 0.006 | none | 0 / 32 |

Observed active steps while trace af9df8f9d7d04c4e00000000000000b2 waited: []

| af9df8f9d7d04c4e00000000000000f5 | driver.queue.scheduler-dispatch | 0.119 | none | 0 / 32 |
| af9df8f9d7d04c4e00000000000000f5 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace af9df8f9d7d04c4e00000000000000f5 waited: []

| af9df8f9d7d04c4e00000000000000b5 | driver.queue.scheduler-late | 0.552 | none | 1 / 32 |
| af9df8f9d7d04c4e00000000000000b5 | driver.queue.scheduler-dispatch | 0.111 | none | 1 / 32 |

Observed active steps while trace af9df8f9d7d04c4e00000000000000b5 waited: []

| af9df8f9d7d04c4e0000000000000145 | driver.queue.scheduler-dispatch | 0.019 | none | 9 / 32 |
| af9df8f9d7d04c4e0000000000000145 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace af9df8f9d7d04c4e0000000000000145 waited: []

| af9df8f9d7d04c4e0000000000000144 | driver.queue.scheduler-dispatch | 0.006 | none | 8 / 32 |
| af9df8f9d7d04c4e0000000000000144 | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace af9df8f9d7d04c4e0000000000000144 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.348 | 0.907 | 0.000 | 1.928 | 7.861 | 0.021 | 0.000 | 0.103 | 1.885 | 5.793 | 0.101 | n/a | 1.822 | 17.806 | n/a | n/a | 0.066 | 8.822 | 0.283 | 0.066 |
| p99 | 88.114 | 3.863 | 1.093 | 5.963 | 36.548 | 2.584 | 0.000 | 0.764 | 9.832 | 16.749 | 0.662 | n/a | 6.594 | 22.925 | n/a | n/a | 0.507 | 39.235 | 0.445 | 0.507 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e0000000000000094 | 88.114 | 36.548 | 2.584 | 0.000 | 0.103 | 9.832 | 16.749 | 0.662 | n/a | 2.711 | 18.850 | n/a | n/a | 0.075 | 39.235 | 0.445 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000092 | 50.756 | 14.860 | 0.021 | 0.000 | 0.764 | 1.228 | 3.754 | 0.101 | n/a | 6.594 | 22.925 | n/a | n/a | 0.507 | 15.645 | 0.308 | 0.507 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000096 | 31.348 | 4.301 | 0.006 | 0.000 | 0.193 | 1.885 | 6.528 | 0.092 | n/a | 0.478 | 17.806 | n/a | n/a | 0.059 | 4.500 | 0.144 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000098 | 31.182 | 7.861 | 0.894 | 0.000 | 0.067 | 2.934 | 5.793 | 0.137 | n/a | 1.822 | 11.609 | n/a | n/a | 0.066 | 8.822 | 0.283 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.348 | 0.907 | 0.000 | 1.928 | 4.301 | 0.006 | 0.000 | 0.193 | 1.885 | 6.528 | 0.092 | n/a | 0.478 | 17.806 | n/a | n/a | 0.059 | 4.500 | 0.144 | 0.059 |
| p99 | 31.348 | 0.907 | 0.000 | 1.928 | 4.301 | 0.006 | 0.000 | 0.193 | 1.885 | 6.528 | 0.092 | n/a | 0.478 | 17.806 | n/a | n/a | 0.059 | 4.500 | 0.144 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e0000000000000096 | 31.348 | 4.301 | 0.006 | 0.000 | 0.193 | 1.885 | 6.528 | 0.092 | n/a | 0.478 | 17.806 | n/a | n/a | 0.059 | 4.500 | 0.144 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.298 | 0.649 | 0.000 | 0.901 | 5.406 | 0.215 | 0.000 | 0.141 | 2.147 | 5.449 | 0.100 | n/a | 0.696 | 9.113 | n/a | n/a | 0.092 | 5.696 | 0.234 | 0.092 |
| p99 | 25.670 | 0.697 | 0.000 | 1.915 | 6.394 | 0.324 | 0.000 | 0.725 | 2.637 | 7.432 | 0.181 | n/a | 1.476 | 11.092 | n/a | n/a | 0.120 | 6.859 | 0.267 | 0.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e000000000000009c | 25.670 | 6.394 | 0.324 | 0.000 | 0.141 | 2.147 | 7.432 | 0.100 | n/a | 0.507 | 8.506 | n/a | n/a | 0.120 | 6.859 | 0.267 | 0.120 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e000000000000009e | 24.298 | 5.406 | 0.215 | 0.000 | 0.075 | 2.637 | 4.032 | 0.056 | n/a | 0.696 | 11.092 | n/a | n/a | 0.090 | 5.696 | 0.234 | 0.090 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e000000000000009a | 23.326 | 4.695 | 0.007 | 0.000 | 0.725 | 1.589 | 5.449 | 0.181 | n/a | 1.476 | 9.113 | n/a | n/a | 0.092 | 5.427 | 0.233 | 0.092 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.326 | 0.649 | 0.000 | 1.915 | 4.695 | 0.007 | 0.000 | 0.725 | 1.589 | 5.449 | 0.181 | n/a | 1.476 | 9.113 | n/a | n/a | 0.092 | 5.427 | 0.233 | 0.092 |
| p99 | 23.326 | 0.649 | 0.000 | 1.915 | 4.695 | 0.007 | 0.000 | 0.725 | 1.589 | 5.449 | 0.181 | n/a | 1.476 | 9.113 | n/a | n/a | 0.092 | 5.427 | 0.233 | 0.092 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e000000000000009a | 23.326 | 4.695 | 0.007 | 0.000 | 0.725 | 1.589 | 5.449 | 0.181 | n/a | 1.476 | 9.113 | n/a | n/a | 0.092 | 5.427 | 0.233 | 0.092 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.204 | 0.348 | 0.000 | 0.377 | 4.527 | 0.018 | 0.000 | 0.159 | 1.351 | 2.114 | 0.051 | n/a | 0.427 | 13.833 | n/a | n/a | 0.049 | 5.526 | 0.220 | 0.049 |
| p99 | 28.992 | 1.425 | 0.008 | 2.823 | 8.407 | 0.191 | 0.000 | 0.992 | 4.196 | 3.337 | 0.105 | n/a | 1.322 | 18.172 | n/a | n/a | 0.107 | 8.677 | 0.385 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000a4 | 28.992 | 6.116 | 0.175 | 0.000 | 0.076 | 4.196 | 3.122 | 0.105 | n/a | 1.322 | 13.833 | n/a | n/a | 0.049 | 6.367 | 0.220 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000a2 | 28.831 | 8.407 | 0.018 | 0.000 | 0.252 | 1.351 | 2.114 | 0.051 | n/a | 0.367 | 16.176 | n/a | n/a | 0.095 | 8.677 | 0.301 | 0.095 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000a7 | 28.204 | 4.287 | 0.191 | 0.000 | 0.159 | 1.490 | 3.337 | 0.104 | n/a | 0.427 | 18.172 | n/a | n/a | 0.037 | 4.637 | 0.164 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e000000000000009f | 14.361 | 4.527 | 0.007 | 0.000 | 0.992 | 1.229 | 1.342 | 0.039 | n/a | 0.544 | 5.574 | n/a | n/a | 0.107 | 5.526 | 0.385 | 0.107 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.361 | 0.846 | 0.008 | 2.094 | 4.527 | 0.007 | 0.000 | 0.992 | 1.229 | 1.342 | 0.039 | n/a | 0.544 | 5.574 | n/a | n/a | 0.107 | 5.526 | 0.385 | 0.107 |
| p99 | 14.361 | 0.846 | 0.008 | 2.094 | 4.527 | 0.007 | 0.000 | 0.992 | 1.229 | 1.342 | 0.039 | n/a | 0.544 | 5.574 | n/a | n/a | 0.107 | 5.526 | 0.385 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e000000000000009f | 14.361 | 4.527 | 0.007 | 0.000 | 0.992 | 1.229 | 1.342 | 0.039 | n/a | 0.544 | 5.574 | n/a | n/a | 0.107 | 5.526 | 0.385 | 0.107 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.089 | 0.226 | 0.000 | 0.383 | 5.521 | 0.010 | 0.000 | 0.078 | 1.332 | 2.134 | 0.042 | n/a | 1.333 | 12.331 | n/a | n/a | 0.038 | 6.359 | 0.198 | 0.038 |
| p99 | 53.195 | 1.240 | 0.000 | 2.576 | 7.200 | 0.437 | 0.548 | 1.251 | 5.923 | 9.576 | 0.174 | n/a | 6.401 | 31.615 | n/a | n/a | 0.057 | 7.812 | 0.336 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000ad | 53.195 | 5.698 | 0.413 | 0.000 | 0.078 | 2.763 | 9.576 | 0.174 | n/a | 2.838 | 31.615 | n/a | n/a | 0.040 | 6.189 | 0.116 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000b0 | 33.089 | 5.521 | 0.437 | 0.548 | 0.057 | 5.923 | 3.747 | 0.107 | n/a | 1.333 | 15.385 | n/a | n/a | 0.031 | 6.563 | 0.198 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 2.404ms |
| af9df8f9d7d04c4e00000000000000a9 | 30.089 | 7.200 | 0.010 | 0.000 | 0.602 | 1.332 | 2.134 | 0.042 | n/a | 6.401 | 12.331 | n/a | n/a | 0.038 | 7.812 | 0.260 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000ab | 18.943 | 5.099 | 0.009 | 0.000 | 1.251 | 0.925 | 1.640 | 0.041 | n/a | 0.923 | 8.998 | n/a | n/a | 0.057 | 6.359 | 0.336 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 120.420 | 0.000 | 0.000 | 0.425 | 4.998 | 0.012 | 0.000 | 0.114 | 2.059 | 9.198 | 0.087 | n/a | 0.415 | 73.838 | n/a | n/a | 0.050 | 5.375 | 0.033 | 0.050 |
| p99 | 304.184 | 1.600 | 0.000 | 2.368 | 9.760 | 0.437 | 2.503 | 0.663 | 2.702 | 34.185 | 0.137 | n/a | 2.718 | 284.187 | n/a | n/a | 0.055 | 12.578 | 0.158 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000b2 | 304.184 | 7.015 | 0.437 | 0.000 | 0.114 | 2.702 | 9.198 | 0.063 | n/a | 0.415 | 284.187 | n/a | n/a | 0.053 | 7.566 | 0.025 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000b5 | 158.908 | 4.536 | 0.012 | 0.000 | 0.663 | 2.628 | 34.185 | 0.087 | n/a | 0.764 | 115.978 | n/a | n/a | 0.055 | 5.211 | 0.033 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000b9 | 120.420 | 9.760 | 0.256 | 2.503 | 0.058 | 2.059 | 31.460 | 0.137 | n/a | 0.312 | 73.838 | n/a | n/a | 0.036 | 12.578 | 0.104 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 0.862ms |
| af9df8f9d7d04c4e00000000000000b7 | 33.983 | 4.998 | 0.004 | 0.000 | 0.373 | 1.157 | 3.463 | 0.090 | n/a | 2.718 | 21.131 | n/a | n/a | 0.050 | 5.375 | 0.158 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.983 | 0.582 | 0.000 | 1.716 | 4.536 | 0.004 | 0.000 | 0.373 | 1.157 | 3.463 | 0.087 | n/a | 0.764 | 21.131 | n/a | n/a | 0.050 | 5.211 | 0.033 | 0.050 |
| p99 | 158.908 | 1.600 | 0.000 | 2.368 | 4.998 | 0.012 | 0.000 | 0.663 | 2.628 | 34.185 | 0.090 | n/a | 2.718 | 115.978 | n/a | n/a | 0.055 | 5.375 | 0.158 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000b5 | 158.908 | 4.536 | 0.012 | 0.000 | 0.663 | 2.628 | 34.185 | 0.087 | n/a | 0.764 | 115.978 | n/a | n/a | 0.055 | 5.211 | 0.033 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000b7 | 33.983 | 4.998 | 0.004 | 0.000 | 0.373 | 1.157 | 3.463 | 0.090 | n/a | 2.718 | 21.131 | n/a | n/a | 0.050 | 5.375 | 0.158 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.606 | 0.287 | 0.000 | 0.757 | 5.921 | 0.005 | 0.000 | 0.073 | 1.339 | 11.896 | 0.076 | n/a | 1.378 | 29.363 | n/a | n/a | 0.042 | 6.247 | 0.144 | 0.042 |
| p99 | 71.429 | 1.556 | 0.000 | 2.682 | 6.065 | 7.258 | 0.467 | 0.318 | 3.165 | 24.239 | 0.126 | n/a | 4.905 | 48.934 | n/a | n/a | 0.053 | 13.716 | 0.192 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000be | 71.429 | 5.921 | 7.258 | 0.467 | 0.071 | 3.165 | 19.955 | 0.076 | n/a | 4.905 | 29.560 | n/a | n/a | 0.053 | 13.716 | 0.192 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000bb | 68.746 | 5.944 | 0.005 | 0.000 | 0.297 | 1.326 | 11.896 | 0.053 | n/a | 0.248 | 48.934 | n/a | n/a | 0.042 | 6.247 | 0.091 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000c3 | 68.606 | 6.065 | 3.968 | 0.327 | 0.073 | 2.197 | 24.239 | 0.126 | n/a | 2.209 | 29.363 | n/a | n/a | 0.039 | 10.434 | 0.152 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000c1 | 31.165 | 4.163 | 0.005 | 0.000 | 0.318 | 1.339 | 2.680 | 0.116 | n/a | 1.378 | 21.113 | n/a | n/a | 0.052 | 4.486 | 0.144 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.872 | n/a | n/a | n/a | 6.994 | 1.357 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.857 | 0.998 | 0.015 |
| p99 | 177.955 | n/a | n/a | n/a | 39.275 | 54.363 | 1.803 | 0.000 | 0.713 | 114.066 | 0.020 | n/a | 0.258 | 0.000 | n/a | n/a | 36.807 | 64.432 | 1.000 | 36.807 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000bc | 177.955 | 39.275 | 21.801 | 1.803 | 0.000 | 0.713 | 114.066 | 0.020 | n/a | 0.258 | 0.000 | n/a | n/a | 0.020 | 62.879 | 0.353 | 0.020 | gw-w/thread-45/gateway.admitted-work | none observed |
| af9df8f9d7d04c4e000000000000011a | 64.447 | 9.094 | 54.363 | 0.976 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 64.432 | 1.000 | 0.015 | node-14/thread-0/rpc.replica.observe | none observed |
| af9df8f9d7d04c4e00000000000000c6 | 50.916 | 12.582 | 1.178 | 0.000 | 0.000 | 0.349 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.807 | 13.760 | 0.270 | 36.807 | node-14/thread-0/socket.wait-first-byte | none observed |
| af9df8f9d7d04c4e0000000000000093 | 27.875 | 1.570 | 26.237 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.069 | 27.806 | 0.998 | 0.069 | node-14/thread-0/rpc.replica.observe | driver.worker-message 0.873ms |
| af9df8f9d7d04c4e0000000000000107 | 20.431 | 19.457 | 0.955 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 20.412 | 0.999 | 0.019 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e00000000000000e5 | 15.728 | 15.575 | 0.138 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 15.714 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e000000000000012b | 13.579 | 12.193 | 1.357 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 13.551 | 0.998 | 0.029 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e00000000000000d9 | 13.039 | 12.376 | 0.650 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 13.025 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e00000000000000aa | 10.802 | 0.523 | 10.263 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 10.787 | 0.999 | 0.015 | node-14/thread-0/rpc.replica.observe | none observed |
| af9df8f9d7d04c4e0000000000000101 | 10.351 | 10.250 | 0.081 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 10.331 | 0.998 | 0.020 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e00000000000000b8 | 8.872 | 7.163 | 1.695 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.857 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e00000000000000c2 | 8.621 | 6.994 | 1.613 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.606 | 0.998 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e0000000000000111 | 8.078 | 7.957 | 0.107 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.064 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e000000000000012e | 7.476 | 0.653 | 6.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.462 | 0.998 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| af9df8f9d7d04c4e000000000000010b | 7.290 | 6.903 | 0.342 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.046 | 7.245 | 0.994 | 0.046 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e0000000000000105 | 6.785 | 0.504 | 6.257 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 6.761 | 0.996 | 0.024 | node-14/thread-0/rpc.replica.observe | none observed |
| af9df8f9d7d04c4e00000000000000ff | 6.309 | 6.154 | 0.142 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 6.295 | 0.998 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e00000000000000fb | 6.066 | 0.174 | 5.879 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 6.053 | 0.998 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| af9df8f9d7d04c4e00000000000000b6 | 5.738 | 5.606 | 0.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 5.723 | 0.997 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| af9df8f9d7d04c4e00000000000000ce | 5.522 | 0.443 | 5.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.506 | 0.997 | 0.017 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.165 | 0.287 | 0.000 | 2.200 | 4.163 | 0.005 | 0.000 | 0.318 | 1.339 | 2.680 | 0.116 | n/a | 1.378 | 21.113 | n/a | n/a | 0.052 | 4.486 | 0.144 | 0.052 |
| p99 | 31.165 | 0.287 | 0.000 | 2.200 | 4.163 | 0.005 | 0.000 | 0.318 | 1.339 | 2.680 | 0.116 | n/a | 1.378 | 21.113 | n/a | n/a | 0.052 | 4.486 | 0.144 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000c1 | 31.165 | 4.163 | 0.005 | 0.000 | 0.318 | 1.339 | 2.680 | 0.116 | n/a | 1.378 | 21.113 | n/a | n/a | 0.052 | 4.486 | 0.144 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.331 | 0.384 | 0.000 | 1.464 | 5.967 | 0.036 | 0.000 | 0.498 | 2.395 | 10.385 | 0.089 | n/a | 1.386 | 34.866 | n/a | n/a | 0.048 | 6.561 | 0.121 | 0.048 |
| p99 | 100.898 | 1.399 | 0.179 | 5.268 | 9.252 | 0.465 | 0.680 | 0.696 | 4.865 | 20.837 | 0.154 | n/a | 4.015 | 84.944 | n/a | n/a | 0.064 | 9.941 | 0.212 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000cb | 100.898 | 9.252 | 0.018 | 0.000 | 0.671 | 2.222 | 2.489 | 0.064 | n/a | 1.175 | 84.944 | n/a | n/a | 0.064 | 9.941 | 0.099 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000c5 | 89.055 | 5.967 | 0.036 | 0.000 | 0.498 | 4.865 | 10.385 | 0.154 | n/a | 4.015 | 63.087 | n/a | n/a | 0.047 | 6.501 | 0.073 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000cf | 68.331 | 7.411 | 0.465 | 0.298 | 0.101 | 3.896 | 20.837 | 0.089 | n/a | 0.319 | 34.866 | n/a | n/a | 0.048 | 8.275 | 0.121 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000c8 | 35.165 | 5.503 | 0.286 | 0.680 | 0.093 | 2.395 | 12.073 | 0.100 | n/a | 1.386 | 12.608 | n/a | n/a | 0.041 | 6.561 | 0.187 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000cd | 20.702 | 3.691 | 0.011 | 0.000 | 0.696 | 0.921 | 1.411 | 0.040 | n/a | 3.315 | 10.562 | n/a | n/a | 0.054 | 4.398 | 0.212 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 89.055 | 0.962 | 0.000 | 2.260 | 5.967 | 0.018 | 0.000 | 0.671 | 2.222 | 2.489 | 0.064 | n/a | 3.315 | 63.087 | n/a | n/a | 0.054 | 6.501 | 0.099 | 0.054 |
| p99 | 100.898 | 1.399 | 0.179 | 5.268 | 9.252 | 0.036 | 0.000 | 0.696 | 4.865 | 10.385 | 0.154 | n/a | 4.015 | 84.944 | n/a | n/a | 0.064 | 9.941 | 0.212 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000cb | 100.898 | 9.252 | 0.018 | 0.000 | 0.671 | 2.222 | 2.489 | 0.064 | n/a | 1.175 | 84.944 | n/a | n/a | 0.064 | 9.941 | 0.099 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000c5 | 89.055 | 5.967 | 0.036 | 0.000 | 0.498 | 4.865 | 10.385 | 0.154 | n/a | 4.015 | 63.087 | n/a | n/a | 0.047 | 6.501 | 0.073 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000cd | 20.702 | 3.691 | 0.011 | 0.000 | 0.696 | 0.921 | 1.411 | 0.040 | n/a | 3.315 | 10.562 | n/a | n/a | 0.054 | 4.398 | 0.212 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 59.172 | 0.688 | 0.000 | 0.696 | 6.326 | 0.428 | 0.000 | 0.063 | 2.151 | 16.767 | 0.085 | n/a | 0.310 | 30.412 | n/a | n/a | 0.072 | 8.025 | 0.056 | 0.072 |
| p99 | 145.084 | 0.989 | 0.000 | 0.912 | 7.144 | 0.899 | 1.180 | 0.091 | 2.550 | 46.498 | 0.167 | n/a | 1.261 | 87.775 | n/a | n/a | 0.077 | 8.106 | 0.136 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000d4 | 145.084 | 7.144 | 0.899 | 0.000 | 0.063 | 2.151 | 46.498 | 0.167 | n/a | 0.310 | 87.775 | n/a | n/a | 0.077 | 8.106 | 0.056 | 0.077 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000d1 | 59.172 | 6.326 | 0.428 | 1.180 | 0.091 | 2.550 | 16.767 | 0.085 | n/a | 1.261 | 30.412 | n/a | n/a | 0.072 | 8.025 | 0.136 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.293 | 0.000 | 0.000 | 0.371 | 4.101 | 0.011 | 0.000 | 0.074 | 1.398 | 7.349 | 0.076 | n/a | 0.521 | 24.721 | n/a | n/a | 0.044 | 5.395 | 0.092 | 0.044 |
| p99 | 84.590 | 0.810 | 0.000 | 1.975 | 6.097 | 2.429 | 0.310 | 1.004 | 1.989 | 17.074 | 0.150 | n/a | 1.300 | 60.991 | n/a | n/a | 0.088 | 6.856 | 0.153 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000dc | 84.590 | 4.065 | 0.196 | 0.310 | 0.066 | 1.465 | 17.074 | 0.076 | n/a | 0.306 | 60.991 | n/a | n/a | 0.040 | 4.637 | 0.055 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000d8 | 68.963 | 6.097 | 0.011 | 0.000 | 0.207 | 1.204 | 7.349 | 0.052 | n/a | 0.840 | 53.157 | n/a | n/a | 0.044 | 6.316 | 0.092 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000d6 | 48.293 | 4.101 | 2.429 | 0.252 | 0.074 | 1.989 | 13.226 | 0.150 | n/a | 1.300 | 24.721 | n/a | n/a | 0.051 | 6.856 | 0.142 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000da | 35.273 | 4.385 | 0.005 | 0.000 | 1.004 | 1.398 | 6.193 | 0.124 | n/a | 0.521 | 21.555 | n/a | n/a | 0.088 | 5.395 | 0.153 | 0.088 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.273 | 0.709 | 0.000 | 1.975 | 4.385 | 0.005 | 0.000 | 1.004 | 1.398 | 6.193 | 0.124 | n/a | 0.521 | 21.555 | n/a | n/a | 0.088 | 5.395 | 0.153 | 0.088 |
| p99 | 35.273 | 0.709 | 0.000 | 1.975 | 4.385 | 0.005 | 0.000 | 1.004 | 1.398 | 6.193 | 0.124 | n/a | 0.521 | 21.555 | n/a | n/a | 0.088 | 5.395 | 0.153 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000da | 35.273 | 4.385 | 0.005 | 0.000 | 1.004 | 1.398 | 6.193 | 0.124 | n/a | 0.521 | 21.555 | n/a | n/a | 0.088 | 5.395 | 0.153 | 0.088 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.708 | 0.000 | 0.000 | 0.358 | 5.538 | 0.251 | 0.449 | 0.072 | 1.698 | 13.794 | 0.075 | n/a | 0.885 | 14.303 | n/a | n/a | 0.061 | 6.630 | 0.176 | 0.061 |
| p99 | 55.575 | 0.000 | 0.000 | 0.433 | 7.146 | 0.361 | 0.466 | 1.107 | 6.003 | 30.140 | 0.123 | n/a | 2.829 | 14.470 | n/a | n/a | 0.117 | 8.028 | 0.301 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000df | 55.575 | 5.538 | 0.251 | 0.466 | 0.068 | 1.698 | 30.140 | 0.075 | n/a | 2.829 | 14.470 | n/a | n/a | 0.040 | 6.323 | 0.114 | 0.040 | gw-w/thread-48/gateway.admitted-work | none observed |
| af9df8f9d7d04c4e00000000000000de | 37.708 | 5.518 | 0.005 | 0.000 | 1.107 | 6.003 | 13.794 | 0.123 | n/a | 0.885 | 10.213 | n/a | n/a | 0.061 | 6.630 | 0.176 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000e1 | 26.663 | 7.146 | 0.361 | 0.449 | 0.072 | 1.695 | 2.061 | 0.063 | n/a | 0.396 | 14.303 | n/a | n/a | 0.117 | 8.028 | 0.301 | 0.117 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.708 | 0.000 | 0.000 | 0.264 | 5.518 | 0.005 | 0.000 | 1.107 | 6.003 | 13.794 | 0.123 | n/a | 0.885 | 10.213 | n/a | n/a | 0.061 | 6.630 | 0.176 | 0.061 |
| p99 | 37.708 | 0.000 | 0.000 | 0.264 | 5.518 | 0.005 | 0.000 | 1.107 | 6.003 | 13.794 | 0.123 | n/a | 0.885 | 10.213 | n/a | n/a | 0.061 | 6.630 | 0.176 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000de | 37.708 | 5.518 | 0.005 | 0.000 | 1.107 | 6.003 | 13.794 | 0.123 | n/a | 0.885 | 10.213 | n/a | n/a | 0.061 | 6.630 | 0.176 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.968 | 0.372 | 0.000 | 0.698 | 4.628 | 0.012 | 0.000 | 0.083 | 1.332 | 6.206 | 0.052 | n/a | 0.368 | 12.868 | n/a | n/a | 0.047 | 5.280 | 0.165 | 0.047 |
| p99 | 48.642 | 1.622 | 0.134 | 5.050 | 8.344 | 0.558 | 0.248 | 0.792 | 6.599 | 24.112 | 0.162 | n/a | 0.925 | 21.690 | n/a | n/a | 0.076 | 8.885 | 0.288 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000e6 | 48.642 | 6.492 | 0.280 | 0.248 | 0.069 | 2.137 | 24.112 | 0.162 | n/a | 0.620 | 14.475 | n/a | n/a | 0.047 | 7.089 | 0.146 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000126 | 38.718 | 5.739 | 0.558 | 0.000 | 0.083 | 2.740 | 7.431 | 0.045 | n/a | 0.368 | 21.690 | n/a | n/a | 0.063 | 6.380 | 0.165 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000fa | 35.976 | 8.344 | 0.005 | 0.000 | 0.537 | 1.196 | 6.206 | 0.047 | n/a | 0.881 | 18.718 | n/a | n/a | 0.043 | 8.885 | 0.247 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000e4 | 34.456 | 5.723 | 0.005 | 0.000 | 0.068 | 3.038 | 5.988 | 0.077 | n/a | 0.335 | 19.182 | n/a | n/a | 0.039 | 5.796 | 0.168 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000124 | 34.227 | 4.260 | 0.012 | 0.000 | 0.792 | 1.082 | 10.417 | 0.061 | n/a | 0.329 | 17.198 | n/a | n/a | 0.076 | 5.063 | 0.148 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000122 | 25.968 | 3.577 | 0.380 | 0.000 | 0.082 | 6.599 | 6.471 | 0.052 | n/a | 0.275 | 8.483 | n/a | n/a | 0.049 | 4.038 | 0.156 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000f8 | 24.680 | 4.628 | 0.006 | 0.000 | 0.646 | 0.875 | 5.302 | 0.045 | n/a | 0.262 | 12.868 | n/a | n/a | 0.047 | 5.280 | 0.214 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000128 | 22.770 | 5.163 | 0.335 | 0.000 | 0.088 | 1.811 | 5.640 | 0.108 | n/a | 0.541 | 9.024 | n/a | n/a | 0.059 | 5.587 | 0.245 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000fc | 21.282 | 3.119 | 0.187 | 0.000 | 0.075 | 1.332 | 7.479 | 0.135 | n/a | 0.925 | 7.999 | n/a | n/a | 0.032 | 3.380 | 0.159 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000fe | 12.306 | 3.134 | 0.005 | 0.000 | 0.411 | 0.735 | 1.068 | 0.047 | n/a | 0.670 | 6.196 | n/a | n/a | 0.041 | 3.550 | 0.288 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.345 | 0.275 | 0.000 | 0.810 | 5.358 | 0.271 | 0.372 | 0.060 | 1.069 | 5.487 | 0.078 | n/a | 0.423 | 18.182 | n/a | n/a | 0.045 | 6.061 | 0.056 | 0.045 |
| p99 | 126.935 | 0.816 | 0.000 | 0.829 | 6.089 | 0.295 | 0.479 | 0.297 | 3.141 | 43.340 | 0.333 | n/a | 0.837 | 71.984 | n/a | n/a | 0.140 | 7.160 | 0.193 | 0.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000e8 | 126.935 | 6.089 | 0.295 | 0.479 | 0.297 | 3.141 | 43.340 | 0.333 | n/a | 0.837 | 71.984 | n/a | n/a | 0.140 | 7.160 | 0.056 | 0.140 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000ea | 31.345 | 5.358 | 0.271 | 0.372 | 0.060 | 1.069 | 5.487 | 0.078 | n/a | 0.423 | 18.182 | n/a | n/a | 0.045 | 6.061 | 0.193 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 61.075 | 0.475 | 0.000 | 0.593 | 5.965 | 0.007 | 0.000 | 0.123 | 2.489 | 1.696 | 0.037 | n/a | 0.274 | 44.015 | n/a | n/a | 0.044 | 6.257 | 0.103 | 0.044 |
| p99 | 168.964 | 1.821 | 0.000 | 2.957 | 9.689 | 13.228 | 0.372 | 1.186 | 7.736 | 2.658 | 1.380 | n/a | 3.572 | 131.618 | n/a | n/a | 0.066 | 23.412 | 0.180 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000f5 | 168.964 | 9.689 | 13.228 | 0.372 | 0.123 | 7.736 | 2.495 | 0.065 | n/a | 3.572 | 131.618 | n/a | n/a | 0.066 | 23.412 | 0.139 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000ed | 79.449 | 7.403 | 0.007 | 0.000 | 0.801 | 1.614 | 1.696 | 0.037 | n/a | 0.192 | 67.638 | n/a | n/a | 0.062 | 8.211 | 0.103 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000ef | 61.075 | 5.965 | 0.188 | 0.000 | 0.104 | 6.447 | 2.658 | 1.380 | n/a | 0.274 | 44.015 | n/a | n/a | 0.044 | 6.257 | 0.102 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000f1 | 29.641 | 4.130 | 0.005 | 0.000 | 1.186 | 2.489 | 1.175 | 0.033 | n/a | 0.331 | 20.252 | n/a | n/a | 0.040 | 5.322 | 0.180 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.641 | 0.475 | 0.000 | 2.083 | 4.130 | 0.005 | 0.000 | 1.186 | 2.489 | 1.175 | 0.033 | n/a | 0.331 | 20.252 | n/a | n/a | 0.040 | 5.322 | 0.180 | 0.040 |
| p99 | 29.641 | 0.475 | 0.000 | 2.083 | 4.130 | 0.005 | 0.000 | 1.186 | 2.489 | 1.175 | 0.033 | n/a | 0.331 | 20.252 | n/a | n/a | 0.040 | 5.322 | 0.180 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e00000000000000f1 | 29.641 | 4.130 | 0.005 | 0.000 | 1.186 | 2.489 | 1.175 | 0.033 | n/a | 0.331 | 20.252 | n/a | n/a | 0.040 | 5.322 | 0.180 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.306 | 0.280 | 0.000 | 1.543 | 3.134 | 0.005 | 0.000 | 0.411 | 0.735 | 1.068 | 0.047 | n/a | 0.329 | 6.196 | n/a | n/a | 0.041 | 3.550 | 0.148 | 0.041 |
| p99 | 34.227 | 1.421 | 0.000 | 1.968 | 4.260 | 0.012 | 0.000 | 0.792 | 1.082 | 10.417 | 0.061 | n/a | 0.670 | 17.198 | n/a | n/a | 0.076 | 5.063 | 0.288 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e0000000000000124 | 34.227 | 4.260 | 0.012 | 0.000 | 0.792 | 1.082 | 10.417 | 0.061 | n/a | 0.329 | 17.198 | n/a | n/a | 0.076 | 5.063 | 0.148 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e00000000000000fe | 12.306 | 3.134 | 0.005 | 0.000 | 0.411 | 0.735 | 1.068 | 0.047 | n/a | 0.670 | 6.196 | n/a | n/a | 0.041 | 3.550 | 0.288 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.917 | 0.569 | 0.000 | 1.873 | 4.588 | 0.006 | 0.000 | 1.003 | 1.117 | 3.357 | 0.093 | n/a | 0.455 | 14.858 | n/a | n/a | 0.054 | 5.597 | 0.165 | 0.054 |
| p99 | 53.631 | 3.020 | 0.012 | 2.531 | 6.024 | 0.606 | 0.713 | 3.457 | 5.407 | 16.812 | 0.157 | n/a | 3.686 | 41.088 | n/a | n/a | 0.068 | 7.103 | 0.344 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e0000000000000100 | 53.631 | 3.950 | 0.006 | 0.000 | 1.078 | 0.797 | 5.531 | 0.102 | n/a | 1.026 | 41.088 | n/a | n/a | 0.052 | 5.034 | 0.094 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000102 | 43.330 | 4.907 | 0.606 | 0.713 | 0.107 | 5.407 | 11.633 | 0.155 | n/a | 0.455 | 19.298 | n/a | n/a | 0.049 | 6.333 | 0.146 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000106 | 33.964 | 4.588 | 0.006 | 0.000 | 1.003 | 1.117 | 5.922 | 0.157 | n/a | 0.991 | 20.112 | n/a | n/a | 0.068 | 5.597 | 0.165 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000104 | 33.530 | 5.079 | 0.005 | 0.000 | 0.145 | 1.229 | 3.357 | 0.093 | n/a | 3.686 | 19.880 | n/a | n/a | 0.055 | 5.230 | 0.156 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e000000000000010e | 31.548 | 5.360 | 0.227 | 0.000 | 0.118 | 1.850 | 9.110 | 0.129 | n/a | 1.949 | 12.751 | n/a | n/a | 0.054 | 5.705 | 0.181 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000112 | 30.917 | 4.042 | 0.251 | 0.594 | 0.063 | 1.539 | 16.812 | 0.103 | n/a | 0.260 | 7.211 | n/a | n/a | 0.042 | 4.950 | 0.160 | 0.042 | gw-w/thread-49/gateway.admitted-work | none observed |
| af9df8f9d7d04c4e0000000000000110 | 29.266 | 6.024 | 0.007 | 0.000 | 1.005 | 0.984 | 2.493 | 0.047 | n/a | 0.286 | 18.362 | n/a | n/a | 0.058 | 7.037 | 0.240 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e000000000000010c | 24.941 | 3.640 | 0.006 | 0.000 | 3.457 | 1.363 | 1.058 | 0.052 | n/a | 0.451 | 14.858 | n/a | n/a | 0.056 | 7.103 | 0.285 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e000000000000010a | 18.374 | 4.675 | 0.004 | 0.000 | 1.037 | 0.798 | 1.205 | 0.041 | n/a | 0.231 | 10.339 | n/a | n/a | 0.043 | 5.716 | 0.311 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000108 | 13.022 | 3.351 | 0.005 | 0.000 | 1.122 | 0.746 | 1.123 | 0.040 | n/a | 0.564 | 6.003 | n/a | n/a | 0.068 | 4.478 | 0.344 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.022 | 0.569 | 0.000 | 1.813 | 3.351 | 0.005 | 0.000 | 1.122 | 0.746 | 1.058 | 0.040 | n/a | 0.451 | 6.003 | n/a | n/a | 0.056 | 4.478 | 0.285 | 0.056 |
| p99 | 24.941 | 1.161 | 0.012 | 2.103 | 3.640 | 0.006 | 0.000 | 3.457 | 1.363 | 1.123 | 0.052 | n/a | 0.564 | 14.858 | n/a | n/a | 0.068 | 7.103 | 0.344 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e000000000000010c | 24.941 | 3.640 | 0.006 | 0.000 | 3.457 | 1.363 | 1.058 | 0.052 | n/a | 0.451 | 14.858 | n/a | n/a | 0.056 | 7.103 | 0.285 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000108 | 13.022 | 3.351 | 0.005 | 0.000 | 1.122 | 0.746 | 1.123 | 0.040 | n/a | 0.564 | 6.003 | n/a | n/a | 0.068 | 4.478 | 0.344 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 50.848 | 0.368 | 0.000 | 0.588 | 4.483 | 2.806 | 0.000 | 0.030 | 1.951 | 1.356 | 0.048 | n/a | 0.244 | 15.858 | n/a | n/a | 0.039 | 7.318 | 0.144 | 0.039 |
| p99 | 73.574 | 2.249 | 1.630 | 3.352 | 5.763 | 27.842 | 0.000 | 11.545 | 4.787 | 22.547 | 0.108 | n/a | 0.429 | 24.540 | n/a | n/a | 0.045 | 45.150 | 0.614 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e0000000000000117 | 73.574 | 5.763 | 27.842 | 0.000 | 11.545 | 1.951 | 1.356 | 0.108 | n/a | 0.429 | 24.540 | n/a | n/a | 0.039 | 45.150 | 0.614 | 0.039 | node-14/thread-0/client.commit-send-queue | client.encode 4.220ms |
| af9df8f9d7d04c4e0000000000000119 | 50.848 | 4.483 | 2.806 | 0.000 | 0.030 | 4.787 | 22.547 | 0.048 | n/a | 0.244 | 15.858 | n/a | n/a | 0.045 | 7.318 | 0.144 | 0.045 | gw-w/thread-45/gateway.admitted-work | driver.publication 2.639ms |

## P4 / p4h10 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.399 | 0.841 | 0.000 | 2.134 | 5.498 | 0.006 | 0.000 | 0.610 | 1.927 | 3.720 | 0.045 | n/a | 0.734 | 14.252 | n/a | n/a | 0.049 | 6.938 | 0.181 | 0.049 |
| p99 | 74.377 | 1.860 | 0.523 | 3.266 | 6.007 | 0.918 | 0.000 | 8.845 | 3.550 | 14.657 | 0.100 | n/a | 3.303 | 62.099 | n/a | n/a | 0.061 | 12.184 | 0.443 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e000000000000012a | 74.377 | 5.865 | 0.005 | 0.000 | 1.068 | 0.947 | 3.720 | 0.070 | n/a | 0.542 | 62.099 | n/a | n/a | 0.061 | 6.938 | 0.093 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000132 | 38.654 | 6.007 | 0.918 | 0.000 | 0.064 | 1.927 | 14.657 | 0.045 | n/a | 0.734 | 14.252 | n/a | n/a | 0.049 | 6.990 | 0.181 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000130 | 28.399 | 4.380 | 0.242 | 0.000 | 0.110 | 1.934 | 10.885 | 0.100 | n/a | 1.003 | 9.692 | n/a | n/a | 0.053 | 4.732 | 0.167 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e000000000000012c | 27.935 | 5.498 | 0.006 | 0.000 | 0.610 | 3.550 | 1.961 | 0.039 | n/a | 0.272 | 15.954 | n/a | n/a | 0.045 | 6.114 | 0.219 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e000000000000012d | 27.528 | 3.334 | 0.004 | 0.000 | 8.845 | 0.792 | 1.147 | 0.042 | n/a | 3.303 | 10.019 | n/a | n/a | 0.042 | 12.184 | 0.443 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.237ms |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.528 | 0.841 | 0.523 | 2.134 | 3.334 | 0.004 | 0.000 | 8.845 | 0.792 | 1.147 | 0.042 | n/a | 3.303 | 10.019 | n/a | n/a | 0.042 | 12.184 | 0.443 | 0.042 |
| p99 | 27.528 | 0.841 | 0.523 | 2.134 | 3.334 | 0.004 | 0.000 | 8.845 | 0.792 | 1.147 | 0.042 | n/a | 3.303 | 10.019 | n/a | n/a | 0.042 | 12.184 | 0.443 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e000000000000012d | 27.528 | 3.334 | 0.004 | 0.000 | 8.845 | 0.792 | 1.147 | 0.042 | n/a | 3.303 | 10.019 | n/a | n/a | 0.042 | 12.184 | 0.443 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.237ms |

## P5 / presweep / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.973 | 0.000 | 0.000 | 0.324 | 4.663 | 0.015 | 0.000 | 0.104 | 1.150 | 1.784 | 0.049 | n/a | 0.276 | 9.502 | n/a | n/a | 0.052 | 5.582 | 0.286 | 0.052 |
| p99 | 30.761 | 1.235 | 0.000 | 3.058 | 6.914 | 1.784 | 0.000 | 1.327 | 2.094 | 6.358 | 0.093 | n/a | 0.549 | 13.103 | n/a | n/a | 0.081 | 8.808 | 0.305 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e0000000000000136 | 30.761 | 6.914 | 1.784 | 0.000 | 0.110 | 2.094 | 6.358 | 0.070 | n/a | 0.276 | 13.103 | n/a | n/a | 0.052 | 8.808 | 0.286 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000134 | 19.970 | 4.981 | 0.006 | 0.000 | 0.102 | 0.672 | 1.784 | 0.049 | n/a | 0.289 | 12.034 | n/a | n/a | 0.052 | 5.089 | 0.255 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000138 | 18.973 | 4.442 | 0.015 | 0.000 | 1.327 | 1.150 | 2.124 | 0.093 | n/a | 0.549 | 9.193 | n/a | n/a | 0.081 | 5.784 | 0.305 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e000000000000013a | 18.339 | 4.663 | 0.815 | 0.000 | 0.104 | 1.773 | 1.118 | 0.043 | n/a | 0.271 | 9.502 | n/a | n/a | 0.050 | 5.582 | 0.304 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.973 | 0.482 | 0.000 | 2.438 | 4.442 | 0.006 | 0.000 | 0.102 | 0.672 | 1.784 | 0.049 | n/a | 0.289 | 9.193 | n/a | n/a | 0.052 | 5.089 | 0.255 | 0.052 |
| p99 | 19.970 | 1.235 | 0.000 | 3.058 | 4.981 | 0.015 | 0.000 | 1.327 | 1.150 | 2.124 | 0.093 | n/a | 0.549 | 12.034 | n/a | n/a | 0.081 | 5.784 | 0.305 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e0000000000000134 | 19.970 | 4.981 | 0.006 | 0.000 | 0.102 | 0.672 | 1.784 | 0.049 | n/a | 0.289 | 12.034 | n/a | n/a | 0.052 | 5.089 | 0.255 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| af9df8f9d7d04c4e0000000000000138 | 18.973 | 4.442 | 0.015 | 0.000 | 1.327 | 1.150 | 2.124 | 0.093 | n/a | 0.549 | 9.193 | n/a | n/a | 0.081 | 5.784 | 0.305 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 98.939 | 0.878 | 0.056 | 3.652 | 9.838 | 7.809 | 0.000 | 0.007 | 7.688 | 2.009 | 21.220 | n/a | 0.242 | 47.965 | n/a | n/a | 0.028 | 18.503 | 0.186 | 0.028 |
| p99 | 150.256 | 1.648 | 7.226 | 10.710 | 16.608 | 19.352 | 0.000 | 0.048 | 16.802 | 5.671 | 34.135 | n/a | 7.004 | 80.688 | n/a | n/a | 0.071 | 31.191 | 0.231 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| af9df8f9d7d04c4e0000000000000145 | 150.256 | 9.980 | 19.352 | 0.000 | 0.019 | 16.802 | 2.009 | 21.220 | n/a | 0.115 | 80.688 | n/a | n/a | 0.071 | 29.351 | 0.195 | 0.071 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 10.069ms; driver.publication 6.297ms; driver.publication 5.459ms; driver.publication 4.332ms; driver.publication 3.302ms |
| af9df8f9d7d04c4e0000000000000144 | 145.145 | 9.115 | 17.010 | 0.000 | 0.006 | 13.744 | 1.265 | 28.408 | n/a | 0.117 | 75.447 | n/a | n/a | 0.034 | 26.130 | 0.180 | 0.034 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 10.069ms; driver.publication 6.297ms; driver.publication 5.459ms; driver.publication 4.332ms; driver.publication 3.302ms |
| af9df8f9d7d04c4e0000000000000143 | 134.796 | 16.608 | 14.578 | 0.000 | 0.005 | 12.460 | 1.058 | 27.554 | n/a | 0.063 | 62.436 | n/a | n/a | 0.034 | 31.191 | 0.231 | 0.034 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 6.297ms; driver.publication 5.459ms; driver.publication 4.332ms; driver.publication 3.302ms; driver.publication 3.009ms |
| af9df8f9d7d04c4e0000000000000142 | 123.074 | 9.838 | 13.030 | 0.000 | 0.008 | 12.462 | 4.856 | 27.045 | n/a | 0.104 | 55.709 | n/a | n/a | 0.021 | 22.876 | 0.186 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 6.297ms; driver.publication 5.459ms; driver.publication 4.332ms; driver.publication 3.009ms; driver.publication 1.418ms |
| af9df8f9d7d04c4e0000000000000141 | 117.553 | 13.394 | 11.284 | 0.000 | 0.006 | 7.688 | 2.243 | 34.135 | n/a | 0.377 | 48.402 | n/a | n/a | 0.023 | 24.684 | 0.210 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 5.459ms; driver.publication 4.332ms; driver.publication 3.009ms; driver.publication 1.418ms; driver.publication 1.294ms |
| af9df8f9d7d04c4e0000000000000140 | 98.939 | 10.687 | 7.809 | 0.000 | 0.006 | 8.417 | 2.711 | 19.903 | n/a | 1.819 | 47.551 | n/a | n/a | 0.035 | 18.503 | 0.187 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 5.459ms; driver.publication 4.332ms; driver.publication 1.418ms; driver.publication 1.294ms |
| af9df8f9d7d04c4e000000000000013f | 88.170 | 5.907 | 6.370 | 0.000 | 0.007 | 3.330 | 2.989 | 26.783 | n/a | 0.950 | 41.810 | n/a | n/a | 0.024 | 12.284 | 0.139 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.459ms; driver.publication 4.332ms; driver.publication 1.418ms |
| af9df8f9d7d04c4e000000000000013e | 75.588 | 10.205 | 3.768 | 0.000 | 0.007 | 6.604 | 5.671 | 1.097 | n/a | 0.242 | 47.965 | n/a | n/a | 0.028 | 13.980 | 0.185 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.332ms; driver.publication 1.418ms |
| af9df8f9d7d04c4e000000000000013d | 53.804 | 6.727 | 2.643 | 0.000 | 0.012 | 2.604 | 1.100 | 0.046 | n/a | 7.004 | 33.642 | n/a | n/a | 0.026 | 9.383 | 0.174 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.332ms |
| af9df8f9d7d04c4e000000000000013c | 43.348 | 8.173 | 0.013 | 0.000 | 0.048 | 3.750 | 1.190 | 0.047 | n/a | 0.247 | 29.833 | n/a | n/a | 0.048 | 8.234 | 0.190 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 297.455 | n/a | n/a | n/a | 44.119 | n/a | 8.087 | 297.434 | 2.687 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 71.624 | 297.454 | 1.000 | 71.624 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d9cd2f715a3e34f0000000000001618 | 297.493 | 0.017 | n/a | 0.000 | 297.476 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.492 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000001617 | 297.479 | 0.020 | n/a | 0.000 | 297.458 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.478 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000001616 | 297.455 | 0.021 | n/a | 0.000 | 297.434 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.454 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000001615 | 297.433 | 0.058 | n/a | 0.000 | 297.373 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.431 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000001614 | 296.135 | 0.456 | n/a | 0.000 | 295.675 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 296.130 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd0000000000001a5c | 296.070 | 0.028 | n/a | 0.000 | 296.042 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 296.069 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd0000000000001a5b | 296.037 | 0.018 | n/a | 0.000 | 296.018 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 296.036 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd0000000000001a5a | 296.024 | 0.021 | n/a | 0.000 | 296.002 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 296.023 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd0000000000001a58 | 296.017 | 0.337 | n/a | 0.000 | 295.673 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 296.011 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd0000000000001a59 | 296.004 | 0.046 | n/a | 0.000 | 295.956 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.002 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000000f68 | 295.700 | 0.020 | n/a | 0.000 | 295.678 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.698 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000000f63 | 295.681 | 0.377 | n/a | 0.000 | 295.301 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 295.678 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000000f67 | 295.674 | 0.024 | n/a | 0.000 | 295.649 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.673 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000000f66 | 295.646 | 0.023 | n/a | 0.000 | 295.622 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.646 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000000f65 | 295.627 | 0.025 | n/a | 0.000 | 295.602 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.626 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000000f64 | 295.596 | 0.073 | n/a | 0.000 | 295.522 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.595 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000000916f | 281.777 | 0.092 | n/a | 0.000 | 281.683 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.776 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000000916e | 281.691 | 0.024 | n/a | 0.000 | 281.666 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.690 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000000916c | 281.682 | 0.192 | n/a | 0.000 | 281.488 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.679 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000000916d | 281.675 | 0.033 | n/a | 0.000 | 281.642 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.674 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 279.312 | n/a | n/a | n/a | 2.083 | n/a | 0.000 | 279.111 | 0.473 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.295 | 279.309 | 1.000 | 1.295 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5094a159281b6eb2000000000001e09c | 279.312 | 0.198 | n/a | 0.000 | 279.111 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.309 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| 5094a159281b6eb2000000000000b719 | 276.399 | 0.269 | n/a | 0.000 | 276.123 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 276.393 | 1.000 | 0.007 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb2000000000000b32f | 42.760 | 0.330 | n/a | 0.000 | 42.423 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 42.754 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 5094a159281b6eb2000000000000b35d | 3.851 | 2.083 | n/a | 0.000 | 0.000 | 0.473 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.295 | 2.083 | 0.541 | 1.295 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb2000000000001988d | 1.527 | 1.522 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.522 | 0.997 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb200000000000108f7 | 0.806 | 0.804 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.804 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000001be39 | 0.703 | 0.701 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.701 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000001b9cf | 0.594 | 0.588 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.588 | 0.990 | 0.006 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb200000000000119be | 0.569 | 0.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.568 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000000b6c7 | 0.561 | 0.558 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.558 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000000ea0d | 0.415 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.415 | 0.000 | 0.000 | 0.415 | uncovered | none observed |
| 5094a159281b6eb2000000000001d424 | 0.413 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.413 | 0.000 | 0.000 | 0.413 | uncovered | none observed |
| 5094a159281b6eb20000000000014f58 | 0.366 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.366 | 0.000 | 0.000 | 0.366 | uncovered | none observed |
| 5094a159281b6eb20000000000019253 | 0.366 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.366 | 0.000 | 0.000 | 0.366 | uncovered | none observed |
| 5094a159281b6eb20000000000012386 | 0.344 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 | uncovered | none observed |
| 5094a159281b6eb2000000000000d575 | 0.334 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.334 | 0.000 | 0.000 | 0.334 | uncovered | none observed |
| 5094a159281b6eb20000000000017c60 | 0.333 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.333 | 0.000 | 0.000 | 0.333 | uncovered | none observed |
| 5094a159281b6eb2000000000001666b | 0.333 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.333 | 0.000 | 0.000 | 0.333 | uncovered | none observed |
| 5094a159281b6eb2000000000000b732 | 0.327 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.327 | 0.000 | 0.000 | 0.327 | uncovered | none observed |
| 5094a159281b6eb2000000000001def0 | 0.326 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.326 | 0.000 | 0.000 | 0.326 | uncovered | none observed |

## P1 / L4 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 268.566 | n/a | n/a | n/a | 4.026 | n/a | 0.000 | 268.298 | 0.291 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.235 | 268.563 | 1.000 | 3.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5094a159281b6eb2000000000001f2c5 | 271.524 | 0.098 | n/a | 0.000 | 271.422 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.520 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000000b4e7 | 268.634 | 0.331 | n/a | 0.000 | 268.298 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 268.629 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000000b75e | 268.566 | 0.115 | n/a | 0.000 | 268.448 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 268.563 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5094a159281b6eb2000000000001f2c4 | 268.100 | 0.174 | n/a | 0.000 | 267.922 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 268.096 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000000ad12 | 248.171 | 0.295 | n/a | 0.000 | 247.865 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 248.160 | 1.000 | 0.011 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 5094a159281b6eb2000000000001e09f | 245.373 | 0.075 | n/a | 0.000 | 245.296 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 245.371 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| 5d9cd2f715a3e34f000000000000a73a | 244.368 | 0.193 | n/a | 0.000 | 244.171 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 244.364 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| a6b9abc146f2edfd000000000000ad1b | 25.928 | 20.403 | n/a | 1.778 | 0.000 | 0.512 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.235 | 22.181 | 0.855 | 3.235 | node-14/thread-5/reader.execute | replica.apply-delta 0.018ms |
| 5094a159281b6eb2000000000001e14b | 6.146 | 1.543 | n/a | 0.000 | 0.000 | 0.564 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.039 | 1.543 | 0.251 | 4.039 | node-14/thread-3/socket.wait-first-byte | none observed |
| 5d9cd2f715a3e34f000000000000a774 | 6.105 | 2.179 | n/a | 0.000 | 0.000 | 0.291 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.635 | 2.179 | 0.357 | 3.635 | node-14/thread-4/socket.wait-first-byte | none observed |
| 5d9cd2f715a3e34f000000000000a770 | 4.141 | 4.138 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.138 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.023ms |
| 5d9cd2f715a3e34f000000000000e5a9 | 4.029 | 4.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.026 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 5094a159281b6eb2000000000001fe40 | 3.390 | 3.386 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.386 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000001e13e | 3.152 | 3.151 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.151 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.028ms |
| 5094a159281b6eb2000000000001e13f | 3.138 | 3.133 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.133 | 0.998 | 0.005 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.028ms |
| 5094a159281b6eb2000000000001e335 | 3.048 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.048 | 0.000 | 0.000 | 3.048 | uncovered | none observed |
| 5094a159281b6eb200000000000208ff | 2.945 | 2.944 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.944 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5d9cd2f715a3e34f000000000000a787 | 2.519 | 2.518 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.518 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 5d9cd2f715a3e34f000000000000e5e2 | 2.001 | 1.998 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.998 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 5d9cd2f715a3e34f000000000001381f | 1.940 | 1.937 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.937 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |

## P1 / L16 / read (248 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 405.504 | n/a | n/a | n/a | 10.228 | n/a | 1.246 | 405.488 | 0.436 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.346 | 405.503 | 1.000 | 2.346 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5094a159281b6eb20000000000036498 | 405.534 | 0.046 | n/a | 0.000 | 405.488 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 405.533 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 5094a159281b6eb20000000000036499 | 405.531 | 0.013 | n/a | 0.000 | 405.517 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 405.531 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 5094a159281b6eb20000000000036497 | 405.504 | 0.014 | n/a | 0.000 | 405.489 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 405.503 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 5094a159281b6eb20000000000036496 | 405.490 | 0.016 | n/a | 0.000 | 405.474 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 405.490 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 5094a159281b6eb20000000000036495 | 405.480 | 0.075 | n/a | 0.000 | 405.404 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 405.479 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 5094a159281b6eb20000000000036494 | 405.415 | 0.263 | n/a | 0.000 | 405.150 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 405.412 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| a6b9abc146f2edfd000000000001ec3a | 404.788 | 0.065 | n/a | 0.000 | 404.720 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 404.785 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| a6b9abc146f2edfd000000000001ec3b | 404.775 | 0.024 | n/a | 0.000 | 404.746 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 404.771 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| a6b9abc146f2edfd000000000001ec3c | 404.770 | 0.019 | n/a | 0.000 | 404.749 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 404.768 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| a6b9abc146f2edfd000000000001ec3d | 404.766 | 0.019 | n/a | 0.000 | 404.746 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 404.764 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| a6b9abc146f2edfd000000000001ec39 | 403.980 | 0.445 | n/a | 0.000 | 403.520 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 403.965 | 1.000 | 0.015 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 5d9cd2f715a3e34f000000000001f55b | 403.636 | 0.486 | n/a | 0.000 | 403.135 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 403.621 | 1.000 | 0.014 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 5d9cd2f715a3e34f000000000001f55f | 403.586 | 0.105 | n/a | 0.000 | 403.479 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 403.584 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 5d9cd2f715a3e34f000000000001f55d | 403.552 | 0.153 | n/a | 0.000 | 403.397 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 403.550 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 5d9cd2f715a3e34f000000000001f55e | 403.525 | 0.045 | n/a | 0.000 | 403.479 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 403.524 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 5d9cd2f715a3e34f000000000001f55c | 403.483 | 0.053 | n/a | 0.000 | 403.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 403.481 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| a6b9abc146f2edfd000000000001ec6d | 123.557 | 0.029 | n/a | 0.000 | 123.526 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 123.555 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| a6b9abc146f2edfd000000000001ec6c | 123.506 | 0.034 | n/a | 0.000 | 123.471 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 123.505 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| a6b9abc146f2edfd000000000001ec6b | 123.408 | 0.090 | n/a | 0.000 | 123.316 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 123.406 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| a6b9abc146f2edfd000000000001ec8d | 123.104 | 0.030 | n/a | 0.000 | 123.073 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 123.103 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.024ms |

## P1 / L64 / read (205 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 317.234 | n/a | n/a | n/a | 7.539 | n/a | 0.000 | 317.204 | 0.448 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.244 | 317.233 | 1.000 | 0.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a6b9abc146f2edfd000000000002a3fd | 317.296 | 0.027 | n/a | 0.000 | 317.266 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 317.293 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000002a3fc | 317.267 | 0.026 | n/a | 0.000 | 317.240 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.266 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000002a3fb | 317.234 | 0.029 | n/a | 0.000 | 317.204 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.233 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000002a3fa | 317.208 | 0.046 | n/a | 0.000 | 317.160 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.206 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000002a3f9 | 317.188 | 0.311 | n/a | 0.000 | 316.874 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 317.184 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000041c7d | 317.100 | 0.240 | n/a | 0.000 | 316.858 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.098 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000041c7e | 317.062 | 0.088 | n/a | 0.000 | 316.973 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.061 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000041c7f | 317.023 | 0.030 | n/a | 0.000 | 316.992 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.022 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000041c81 | 317.011 | 0.013 | n/a | 0.000 | 316.997 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.010 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000041c80 | 317.010 | 0.016 | n/a | 0.000 | 316.993 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.009 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000002a752 | 316.997 | 0.160 | n/a | 0.000 | 316.837 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.996 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000002a751 | 316.964 | 0.016 | n/a | 0.000 | 316.948 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.963 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000002a750 | 316.946 | 0.021 | n/a | 0.000 | 316.922 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 316.944 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000002a753 | 316.884 | 0.014 | n/a | 0.000 | 316.869 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.883 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000002a74f | 316.840 | 0.128 | n/a | 0.000 | 316.709 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 316.837 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000041c91 | 315.769 | 0.038 | n/a | 0.000 | 315.729 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 315.767 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000044b08 | 282.543 | 0.055 | n/a | 0.000 | 282.487 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.542 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000044b07 | 282.487 | 0.070 | n/a | 0.000 | 282.416 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.486 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000044b06 | 282.430 | 0.223 | n/a | 0.000 | 282.206 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.428 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000044b05 | 282.205 | 0.417 | n/a | 0.000 | 281.786 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.203 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L256 / read (189 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.046 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 353.339 | n/a | n/a | n/a | 11.001 | n/a | 0.954 | 353.300 | 0.890 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.400 | 353.336 | 1.000 | 21.400 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a6b9abc146f2edfd000000000003c138 | 353.346 | 0.093 | n/a | 0.000 | 353.244 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 353.336 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000003c13a | 353.339 | 0.020 | n/a | 0.000 | 353.318 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 353.337 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000003c139 | 353.331 | 0.029 | n/a | 0.000 | 353.300 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 353.329 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000003c13b | 353.326 | 0.108 | n/a | 0.000 | 353.214 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 353.322 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000003cb28 | 351.307 | 0.031 | n/a | 0.000 | 351.275 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 351.305 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000003cb27 | 351.295 | 0.037 | n/a | 0.000 | 351.256 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 351.292 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000003cb26 | 351.283 | 0.229 | n/a | 0.000 | 351.047 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 351.276 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000003c137 | 351.241 | 0.138 | n/a | 0.000 | 351.099 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 351.237 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5094a159281b6eb200000000000546bd | 351.086 | 0.049 | n/a | 0.000 | 351.036 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.085 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb200000000000546bc | 351.047 | 0.051 | n/a | 0.000 | 350.995 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.046 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb200000000000546bb | 351.002 | 0.022 | n/a | 0.000 | 350.979 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.001 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb200000000000546ba | 350.966 | 0.030 | n/a | 0.000 | 350.935 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 350.965 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb200000000000546be | 350.928 | 0.054 | n/a | 0.000 | 350.872 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 350.927 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb200000000000546b9 | 350.899 | 0.184 | n/a | 0.000 | 350.712 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 350.896 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000003cb2c | 350.844 | 0.056 | n/a | 0.000 | 350.786 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 350.842 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000003cb2d | 350.823 | 0.023 | n/a | 0.000 | 350.798 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 350.822 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000033538 | 338.152 | 0.031 | n/a | 0.000 | 338.119 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 338.150 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000033537 | 338.124 | 0.035 | n/a | 0.000 | 338.087 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 338.122 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000033539 | 338.101 | 0.073 | n/a | 0.000 | 338.024 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 338.097 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000033536 | 338.088 | 0.053 | n/a | 0.000 | 338.033 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 338.086 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (309 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 3.572 | n/a | n/a | n/a | 3.559 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.127 | 3.559 | 0.999 | 1.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d9cd2f715a3e34f000000000003de6b | 13.730 | 7.509 | n/a | 0.000 | 0.000 | 1.115 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.106 | 7.509 | 0.547 | 5.106 | node-14/thread-4/socket.wait-first-byte | none observed |
| 5094a159281b6eb20000000000055a54 | 13.280 | 1.628 | n/a | 0.000 | 0.000 | 0.866 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.786 | 1.628 | 0.123 | 10.786 | node-14/thread-3/socket.wait-first-byte | replica.apply-delta 0.039ms |
| a6b9abc146f2edfd000000000003d513 | 13.198 | 8.688 | n/a | 1.891 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.265 | 10.580 | 0.802 | 2.265 | node-14/thread-5/reader.execute | none observed |
| 5094a159281b6eb200000000000661dc | 3.572 | 3.559 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.559 | 0.996 | 0.013 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb200000000000661db | 3.571 | 3.567 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.567 | 0.999 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb200000000000661dd | 3.516 | 3.501 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.501 | 0.996 | 0.015 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb200000000000661de | 3.506 | 3.490 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.490 | 0.996 | 0.015 | node-14/thread-3/reader.execute | none observed |
| a6b9abc146f2edfd0000000000040e10 | 3.376 | 3.370 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 3.370 | 0.998 | 0.007 | node-14/thread-5/reader.execute | none observed |
| a6b9abc146f2edfd0000000000040e11 | 3.366 | 3.353 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.353 | 0.996 | 0.014 | node-14/thread-5/reader.execute | none observed |
| a6b9abc146f2edfd0000000000040e12 | 3.354 | 3.341 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.341 | 0.996 | 0.013 | node-14/thread-5/reader.execute | none observed |
| a6b9abc146f2edfd0000000000040e13 | 3.344 | 3.330 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.330 | 0.996 | 0.014 | node-14/thread-5/reader.execute | none observed |
| 5d9cd2f715a3e34f0000000000047631 | 3.055 | 3.053 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.053 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 5094a159281b6eb2000000000006125c | 2.678 | 2.650 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 2.650 | 0.990 | 0.028 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000006125b | 2.656 | 2.653 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.653 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| a6b9abc146f2edfd000000000004c8a9 | 2.580 | 2.579 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.579 | 0.999 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 5d9cd2f715a3e34f0000000000041fb4 | 2.564 | 2.562 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.562 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a6b9abc146f2edfd0000000000040ea6 | 2.147 | 2.145 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.145 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| a6b9abc146f2edfd0000000000040ea7 | 2.145 | 2.134 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 2.134 | 0.995 | 0.010 | node-14/thread-5/replica.pull-at | none observed |
| a6b9abc146f2edfd0000000000040ea8 | 2.130 | 2.119 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.119 | 0.995 | 0.011 | node-14/thread-5/replica.pull-at | none observed |
| a6b9abc146f2edfd0000000000040ea9 | 2.115 | 2.103 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 2.103 | 0.994 | 0.012 | node-14/thread-5/replica.pull-at | none observed |

## P1 / recovery / read (217 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 318.635 | n/a | n/a | n/a | 6.150 | n/a | 0.000 | 318.604 | 0.595 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.827 | 318.634 | 1.000 | 9.827 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5d9cd2f715a3e34f000000000005c75a | 318.707 | 0.025 | n/a | 0.000 | 318.681 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.706 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000005c759 | 318.668 | 0.026 | n/a | 0.000 | 318.642 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.667 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000005c758 | 318.635 | 0.030 | n/a | 0.000 | 318.604 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.634 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000005c757 | 318.590 | 0.083 | n/a | 0.000 | 318.506 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.589 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000005c756 | 318.401 | 0.228 | n/a | 0.000 | 318.170 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 318.398 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000005c502 | 318.134 | 0.015 | n/a | 0.000 | 318.118 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.133 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000005c501 | 318.126 | 0.018 | n/a | 0.000 | 318.107 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.125 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000005c500 | 318.093 | 0.021 | n/a | 0.000 | 318.071 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.092 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000005c4ff | 318.073 | 0.028 | n/a | 0.000 | 318.043 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 318.072 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000005c4fe | 318.010 | 0.171 | n/a | 0.000 | 317.837 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 318.007 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000076a87 | 316.858 | 0.081 | n/a | 0.000 | 316.775 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 316.856 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000076a88 | 316.831 | 0.025 | n/a | 0.000 | 316.805 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 316.830 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000076a89 | 316.824 | 0.018 | n/a | 0.000 | 316.804 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 316.823 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000076a8a | 316.810 | 0.019 | n/a | 0.000 | 316.789 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 316.808 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000076a86 | 316.794 | 0.149 | n/a | 0.000 | 316.642 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 316.791 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000076a8d | 316.558 | 0.035 | n/a | 0.000 | 316.520 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 316.556 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000005d6dc | 284.613 | 0.034 | n/a | 0.000 | 284.578 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.612 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000005d6db | 284.581 | 0.050 | n/a | 0.000 | 284.531 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.580 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f000000000005d6da | 284.536 | 0.126 | n/a | 0.000 | 284.409 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.535 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000077e83 | 284.371 | 0.039 | n/a | 0.000 | 284.331 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.370 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (140 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 4.988 | n/a | n/a | n/a | 1.448 | n/a | 0.000 | 0.000 | 0.588 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.952 | 1.448 | 0.997 | 2.952 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5094a159281b6eb20000000000084141 | 28.899 | 17.627 | n/a | 1.249 | 0.000 | 0.778 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.245 | 18.876 | 0.653 | 9.245 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.032ms |
| 5094a159281b6eb20000000000079d67 | 4.988 | 1.448 | n/a | 0.000 | 0.000 | 0.588 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.952 | 1.448 | 0.290 | 2.952 | node-14/thread-3/socket.wait-first-byte | replica.apply-delta 0.032ms |
| 5094a159281b6eb2000000000007a10a | 1.287 | 1.287 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.287 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000007ab40 | 0.733 | 0.730 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.730 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000993a9 | 0.692 | 0.685 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.685 | 0.991 | 0.006 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb20000000000081e15 | 0.687 | 0.685 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.685 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000007d91e | 0.605 | 0.604 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.604 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb20000000000080716 | 0.568 | 0.566 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.566 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000007cdd8 | 0.566 | 0.552 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.552 | 0.975 | 0.014 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000009225b | 0.564 | 0.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.563 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000008076e | 0.485 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.485 | 0.000 | 0.000 | 0.485 | uncovered | none observed |
| 5094a159281b6eb200000000000845a7 | 0.481 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.481 | 0.000 | 0.000 | 0.481 | uncovered | none observed |
| 5094a159281b6eb20000000000092255 | 0.450 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.450 | 0.000 | 0.000 | 0.450 | uncovered | none observed |
| 5094a159281b6eb20000000000091ad4 | 0.443 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.443 | 0.000 | 0.000 | 0.443 | uncovered | none observed |
| 5094a159281b6eb2000000000007ab07 | 0.441 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.441 | 0.000 | 0.000 | 0.441 | uncovered | none observed |
| 5094a159281b6eb20000000000092f0b | 0.434 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.434 | 0.000 | 0.000 | 0.434 | uncovered | none observed |
| 5094a159281b6eb2000000000007ab41 | 0.428 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.428 | 0.000 | 0.000 | 0.428 | uncovered | none observed |
| 5094a159281b6eb2000000000007c1f9 | 0.423 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.423 | 0.000 | 0.000 | 0.423 | uncovered | none observed |
| 5094a159281b6eb20000000000083934 | 0.419 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.419 | 0.000 | 0.000 | 0.419 | uncovered | none observed |
| 5094a159281b6eb200000000000845a8 | 0.416 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 | uncovered | none observed |

## P4 / p4h1 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 2.193 | n/a | n/a | n/a | 1.786 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.773 | 1.786 | 0.999 | 0.773 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5094a159281b6eb2000000000009a480 | 7.293 | 1.616 | n/a | 0.000 | 0.000 | 0.433 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.244 | 1.616 | 0.222 | 5.244 | node-14/thread-3/socket.wait-first-byte | none observed |
| 5094a159281b6eb2000000000009f73d | 2.193 | 2.188 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.188 | 0.998 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000009f73c | 1.788 | 1.786 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.786 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000a0673 | 1.347 | 0.573 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.773 | 0.573 | 0.426 | 0.773 | uncovered | none observed |
| 5094a159281b6eb200000000000a06be | 1.258 | 1.247 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 1.247 | 0.991 | 0.011 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000a08e3 | 1.135 | 1.130 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 1.130 | 0.995 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000009df88 | 0.974 | 0.972 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.972 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000a1467 | 0.939 | 0.938 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.938 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000a10f3 | 0.938 | 0.918 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 0.918 | 0.979 | 0.020 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000a7500 | 0.916 | 0.914 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.914 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000009f791 | 0.839 | 0.835 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.835 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000009df96 | 0.765 | 0.750 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.750 | 0.981 | 0.015 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb200000000000a0cd9 | 0.765 | 0.763 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.763 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000009f720 | 0.759 | 0.757 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.757 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000009df94 | 0.706 | 0.705 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.705 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000a2af6 | 0.700 | 0.697 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.697 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000009fd15 | 0.697 | 0.690 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.690 | 0.989 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb2000000000009feac | 0.666 | 0.661 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.661 | 0.993 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000a0fa7 | 0.620 | 0.614 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.614 | 0.991 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000a10d3 | 0.614 | 0.612 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.612 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (166 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 8.174 | n/a | n/a | n/a | 7.940 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.287 | 7.940 | 1.000 | 0.287 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5094a159281b6eb200000000000ba889 | 8.353 | 1.743 | n/a | 0.000 | 0.000 | 0.803 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.807 | 1.743 | 0.209 | 5.807 | node-14/thread-3/socket.wait-first-byte | none observed |
| 5094a159281b6eb200000000000bd237 | 8.174 | 8.171 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 8.171 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.036ms |
| 5094a159281b6eb200000000000c3b68 | 7.947 | 7.940 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 7.940 | 0.999 | 0.007 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb200000000000c945c | 6.381 | 6.379 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 6.379 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.040ms |
| 5094a159281b6eb200000000000c3020 | 4.356 | 4.354 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.354 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c182f | 3.933 | 3.929 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.929 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c320d | 1.388 | 1.379 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 1.379 | 0.993 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c3017 | 1.339 | 1.337 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.337 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c13f2 | 0.969 | 0.968 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.968 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c301b | 0.826 | 0.823 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.823 | 0.996 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c326a | 0.783 | 0.782 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.782 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000ca377 | 0.745 | 0.744 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.744 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c0df9 | 0.743 | 0.650 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.094 | 0.650 | 0.874 | 0.094 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000cfd68 | 0.700 | 0.698 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.698 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c490c | 0.683 | 0.680 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.680 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c312d | 0.681 | 0.655 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 0.655 | 0.962 | 0.026 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c3303 | 0.666 | 0.664 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.664 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c2bc9 | 0.631 | 0.628 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.628 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000bb2de | 0.570 | 0.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.568 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000c3807 | 0.561 | 0.558 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.558 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (161 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 3.131 | n/a | n/a | n/a | 3.069 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.492 | 3.069 | 0.997 | 0.492 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5094a159281b6eb200000000000db8d9 | 10.603 | 3.069 | n/a | 0.000 | 0.000 | 1.327 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.207 | 3.069 | 0.289 | 6.207 | node-14/thread-3/socket.wait-first-byte | none observed |
| 5094a159281b6eb200000000000e7f45 | 3.131 | 3.127 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.127 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| 5094a159281b6eb200000000000df46f | 1.218 | 1.209 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 1.209 | 0.993 | 0.009 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb200000000000eb75f | 0.680 | 0.679 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.679 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 5094a159281b6eb200000000000f419c | 0.562 | 0.560 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.560 | 0.995 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 5094a159281b6eb200000000000f1b62 | 0.492 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.492 | 0.000 | 0.000 | 0.492 | uncovered | none observed |
| 5094a159281b6eb200000000000e0814 | 0.481 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.481 | 0.000 | 0.000 | 0.481 | uncovered | none observed |
| 5094a159281b6eb200000000000f5629 | 0.469 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.469 | 0.000 | 0.000 | 0.469 | uncovered | none observed |
| 5094a159281b6eb200000000000db88f | 0.468 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.468 | 0.000 | 0.000 | 0.468 | uncovered | none observed |
| 5094a159281b6eb200000000000e09ac | 0.464 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.464 | 0.000 | 0.000 | 0.464 | uncovered | none observed |
| 5094a159281b6eb200000000000db892 | 0.445 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.445 | 0.000 | 0.000 | 0.445 | uncovered | none observed |
| 5094a159281b6eb200000000000e22ea | 0.409 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.409 | 0.000 | 0.000 | 0.409 | uncovered | none observed |
| 5094a159281b6eb200000000000f3ef7 | 0.404 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.404 | 0.000 | 0.000 | 0.404 | uncovered | none observed |
| 5094a159281b6eb200000000000e77c4 | 0.395 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.395 | 0.000 | 0.000 | 0.395 | uncovered | none observed |
| 5094a159281b6eb200000000000dfeb6 | 0.393 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.393 | 0.000 | 0.000 | 0.393 | uncovered | none observed |
| 5094a159281b6eb200000000000e0959 | 0.389 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.389 | 0.000 | 0.000 | 0.389 | uncovered | none observed |
| 5094a159281b6eb200000000000df251 | 0.385 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.385 | 0.000 | 0.000 | 0.385 | uncovered | none observed |
| 5094a159281b6eb200000000000e7f44 | 0.385 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.385 | 0.000 | 0.000 | 0.385 | uncovered | none observed |
| 5094a159281b6eb200000000000ec16d | 0.383 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.383 | 0.000 | 0.000 | 0.383 | uncovered | none observed |
| 5094a159281b6eb200000000000db8c8 | 0.380 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.380 | 0.000 | 0.000 | 0.380 | uncovered | none observed |

## P5 / presweep / read (184 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.055 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 250.028 | n/a | n/a | n/a | 16.284 | n/a | 1.923 | 249.906 | 0.625 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.868 | 250.024 | 1.000 | 7.868 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a6b9abc146f2edfd000000000006532b | 250.227 | 0.283 | n/a | 0.000 | 249.906 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.038 | 250.189 | 1.000 | 0.038 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000104735 | 250.028 | 0.047 | n/a | 0.000 | 249.977 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 250.024 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000064d4e | 249.966 | 0.088 | n/a | 0.000 | 249.873 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 249.960 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000104734 | 249.939 | 0.144 | n/a | 0.000 | 249.788 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 249.932 | 1.000 | 0.007 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000064d4d | 249.430 | 0.279 | n/a | 0.000 | 249.071 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.080 | 249.350 | 1.000 | 0.080 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000064d4f | 249.422 | 0.052 | n/a | 0.000 | 249.366 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 249.417 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd0000000000065333 | 247.137 | 0.145 | n/a | 0.000 | 246.980 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 247.125 | 1.000 | 0.012 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000064d5e | 244.002 | 0.069 | n/a | 0.000 | 243.929 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 243.999 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000006533b | 243.005 | 0.091 | n/a | 0.000 | 242.904 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 242.995 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000006533c | 242.972 | 0.230 | n/a | 0.000 | 242.738 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 242.968 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000104752 | 242.823 | 0.032 | n/a | 0.000 | 242.790 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 242.822 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000104753 | 242.810 | 0.017 | n/a | 0.000 | 242.791 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 242.808 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000104755 | 242.285 | 0.118 | n/a | 0.000 | 242.162 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 242.280 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb20000000000104756 | 242.159 | 0.021 | n/a | 0.000 | 242.136 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 242.157 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5d9cd2f715a3e34f0000000000064d74 | 242.002 | 0.078 | n/a | 0.000 | 241.915 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 241.992 | 1.000 | 0.010 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd0000000000065350 | 240.140 | 0.727 | n/a | 0.000 | 239.342 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.071 | 240.069 | 1.000 | 0.071 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000005f747 | 121.145 | 0.083 | n/a | 0.000 | 121.057 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 121.140 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a6b9abc146f2edfd000000000005f746 | 120.920 | 0.278 | n/a | 0.000 | 120.629 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 120.907 | 1.000 | 0.013 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 5094a159281b6eb200000000000fe3bf | 120.216 | 0.050 | n/a | 0.000 | 120.164 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 120.215 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 5094a159281b6eb200000000000fe3be | 120.173 | 0.156 | n/a | 0.000 | 120.014 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 120.170 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P5 / sweep / read (85 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 3.454 | n/a | n/a | n/a | 3.370 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.370 | 0.995 | 0.019 |
| p99 | 103.518 | n/a | n/a | n/a | 47.195 | n/a | 17.462 | 0.000 | 1.255 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.606 | 64.656 | 1.000 | 37.606 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a6b9abc146f2edfd000000000006b5a7 | 103.518 | 47.195 | n/a | 17.462 | 0.000 | 1.255 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.606 | 64.656 | 0.625 | 37.606 | node-14/thread-5/reader.execute | none observed |
| 5094a159281b6eb2000000000010a58e | 62.774 | 46.551 | n/a | 11.460 | 0.000 | 1.113 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.650 | 58.011 | 0.924 | 3.650 | node-14/thread-3/reader.execute | none observed |
| 2c6e3974b357ba300000000000000113 | 13.471 | 13.415 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.056 | 13.415 | 0.996 | 0.056 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba300000000000000114 | 13.406 | 13.338 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.068 | 13.338 | 0.995 | 0.068 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba300000000000000115 | 13.344 | 13.275 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.069 | 13.275 | 0.995 | 0.069 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba300000000000000116 | 13.276 | 13.205 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.071 | 13.205 | 0.995 | 0.071 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba300000000000000117 | 13.219 | 13.148 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.071 | 13.148 | 0.995 | 0.071 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba300000000000000118 | 13.161 | 13.088 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.072 | 13.088 | 0.995 | 0.072 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba300000000000000119 | 13.097 | 13.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.074 | 13.023 | 0.994 | 0.074 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba30000000000000011a | 13.019 | 12.946 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.073 | 12.946 | 0.994 | 0.073 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba30000000000000011b | 12.943 | 12.902 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.041 | 12.902 | 0.997 | 0.041 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba30000000000000011c | 12.828 | 12.787 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.042 | 12.787 | 0.997 | 0.042 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba30000000000000011d | 12.787 | 12.743 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.044 | 12.743 | 0.997 | 0.044 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba30000000000000011e | 12.742 | 12.694 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.048 | 12.694 | 0.996 | 0.048 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba30000000000000011f | 12.676 | 12.626 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.050 | 12.626 | 0.996 | 0.050 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba300000000000000120 | 12.636 | 12.585 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.051 | 12.585 | 0.996 | 0.051 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba300000000000000121 | 12.600 | 12.548 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.052 | 12.548 | 0.996 | 0.052 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba300000000000000122 | 12.569 | 12.514 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.055 | 12.514 | 0.996 | 0.055 | node-14/thread-6/reader.execute | none observed |
| 2c6e3974b357ba3000000000000000c3 | 10.183 | 10.161 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 10.161 | 0.998 | 0.022 | node-14/thread-6/replica.pull-at | none observed |
| 2c6e3974b357ba3000000000000000c4 | 10.058 | 10.029 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 10.029 | 0.997 | 0.030 | node-14/thread-6/replica.pull-at | none observed |

## P1 / baseline / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.000 | 0.000 | 0.022 |
| p99 | 0.084 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a6b9abc146f2edfd000000000000ad0d | 0.084 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | uncovered | none observed |
| 5094a159281b6eb2000000000000b31d | 0.059 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.059 | 0.000 | 0.000 | 0.059 | uncovered | none observed |
| 5d9cd2f715a3e34f000000000000a722 | 0.055 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.055 | 0.000 | 0.000 | 0.055 | uncovered | none observed |
| 5d9cd2f715a3e34f000000000000a723 | 0.024 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 0.000 | 0.000 | 0.024 | uncovered | none observed |
| a6b9abc146f2edfd000000000000ad0e | 0.022 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.000 | 0.000 | 0.022 | uncovered | none observed |
| a6b9abc146f2edfd000000000000ad0f | 0.018 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 | uncovered | none observed |
| a6b9abc146f2edfd000000000000ad10 | 0.013 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 | uncovered | none observed |
| a6b9abc146f2edfd000000000000ad11 | 0.012 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 | uncovered | none observed |
| 5d9cd2f715a3e34f000000000000a724 | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 | uncovered | none observed |

## P1 / outside-phases / read (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.119 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 0.243 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a6b9abc146f2edfd000000000006bb54 | 0.243 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | uncovered | none observed |
| 5d9cd2f715a3e34f000000000006ae4e | 0.226 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | uncovered | none observed |
| 5d9cd2f715a3e34f000000000006ae4f | 0.208 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | uncovered | none observed |
| 5d9cd2f715a3e34f000000000006ae50 | 0.167 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | uncovered | none observed |
| 5094a159281b6eb2000000000010ad03 | 0.162 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | uncovered | none observed |
| a6b9abc146f2edfd000000000006bb55 | 0.147 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | uncovered | none observed |
| 5d9cd2f715a3e34f000000000006ae51 | 0.145 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | uncovered | none observed |
| 5d9cd2f715a3e34f000000000006ae52 | 0.122 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | uncovered | none observed |
| a6b9abc146f2edfd000000000006bb56 | 0.119 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | uncovered | none observed |
| 5094a159281b6eb2000000000010ad04 | 0.117 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | uncovered | none observed |
| 5094a159281b6eb2000000000010ad05 | 0.104 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | uncovered | none observed |
| a6b9abc146f2edfd000000000006bb57 | 0.097 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | uncovered | none observed |
| 5094a159281b6eb2000000000010ad06 | 0.092 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | uncovered | none observed |
| 5094a159281b6eb2000000000010ad07 | 0.084 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | uncovered | none observed |
| a6b9abc146f2edfd000000000006bb58 | 0.084 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | uncovered | none observed |
| 5094a159281b6eb2000000000010ad08 | 0.060 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.060 | 0.000 | 0.000 | 0.060 | uncovered | none observed |

## P3 / outside-phases / read (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.293 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 201.079 | 0.023 | n/a | 0.136 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 |
| p99 | 208.142 | n/a | n/a | n/a | 0.671 | n/a | 0.000 | 0.000 | 3.883 | 204.660 | 2.336 | n/a | 0.333 | 0.000 | n/a | n/a | 0.480 | 0.671 | 0.011 | 0.480 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced390000000000000007 | 208.142 | 0.000 | n/a | 0.000 | 0.000 | 3.883 | 203.917 | 0.022 | n/a | 0.126 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced39000000000000007c | 205.521 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 204.660 | 0.024 | n/a | 0.123 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced39000000000000009c | 203.435 | 0.000 | n/a | 0.000 | 0.000 | 1.591 | 201.171 | 0.021 | n/a | 0.172 | 0.000 | n/a | n/a | 0.480 | 0.000 | 0.000 | 0.480 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced3900000000000000ca | 203.402 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 202.089 | 0.138 | n/a | 0.183 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced3900000000000000c8 | 203.263 | 0.000 | n/a | 0.000 | 0.000 | 1.089 | 201.735 | 0.040 | n/a | 0.249 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced39000000000000005c | 203.261 | 0.000 | n/a | 0.000 | 0.000 | 1.479 | 201.413 | 0.021 | n/a | 0.169 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced390000000000000005 | 203.139 | 0.000 | n/a | 0.000 | 0.000 | 1.168 | 201.375 | 0.067 | n/a | 0.214 | 0.000 | n/a | n/a | 0.316 | 0.000 | 0.000 | 0.316 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced39000000000000003b | 203.120 | 0.000 | n/a | 0.000 | 0.000 | 1.510 | 201.219 | 0.030 | n/a | 0.193 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced390000000000000006 | 202.998 | 0.000 | n/a | 0.000 | 0.000 | 1.093 | 201.409 | 0.030 | n/a | 0.210 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced390000000000000079 | 202.986 | 0.000 | n/a | 0.000 | 0.000 | 1.129 | 201.510 | 0.036 | n/a | 0.193 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced390000000000000075 | 202.845 | 0.000 | n/a | 0.000 | 0.000 | 1.231 | 201.111 | 0.016 | n/a | 0.333 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced3900000000000000a2 | 202.655 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 201.376 | 0.047 | n/a | 0.179 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced3900000000000000a1 | 202.541 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 201.232 | 0.046 | n/a | 0.133 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced39000000000000009b | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 201.210 | 0.028 | n/a | 0.167 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced39000000000000007a | 202.344 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 201.195 | 0.022 | n/a | 0.180 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced39000000000000009d | 202.314 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 200.895 | 0.016 | n/a | 0.113 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced3900000000000000a3 | 202.293 | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 201.009 | 0.023 | n/a | 0.124 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced3900000000000000c9 | 202.231 | 0.000 | n/a | 0.000 | 0.000 | 1.009 | 200.886 | 0.018 | n/a | 0.123 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced3900000000000000c7 | 202.216 | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 200.958 | 0.024 | n/a | 0.146 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced390000000000000076 | 202.182 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 201.250 | 0.022 | n/a | 0.165 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |

## P3 / outside-phases / internal (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 592.429 | n/a | n/a | n/a | 2.713 | n/a | 0.000 | 0.000 | 0.853 | 580.967 | 0.025 | n/a | 0.110 | 0.000 | n/a | n/a | 0.185 | 2.713 | 0.006 | 0.185 |
| p99 | 1004.737 | n/a | n/a | n/a | 9.312 | n/a | 0.000 | 0.000 | 1.720 | 1001.311 | 3.747 | n/a | 0.499 | 0.000 | n/a | n/a | 26.237 | 9.312 | 0.640 | 26.237 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000017 | 1004.737 | 0.293 | n/a | 0.000 | 0.000 | 1.720 | 1000.841 | 0.022 | n/a | 0.499 | 0.000 | n/a | n/a | 1.362 | 0.293 | 0.000 | 1.362 | gw-r/thread-47/journal/page | none observed |
| 638f7df791917d8a0000000000000053 | 1004.293 | 0.310 | n/a | 0.000 | 0.000 | 1.337 | 1001.302 | 0.026 | n/a | 0.141 | 0.000 | n/a | n/a | 1.177 | 0.310 | 0.000 | 1.177 | gw-r/thread-72/journal/page | none observed |
| 638f7df791917d8a0000000000000030 | 1003.766 | 0.162 | n/a | 0.000 | 0.000 | 1.146 | 1001.129 | 0.023 | n/a | 0.204 | 0.000 | n/a | n/a | 1.102 | 0.162 | 0.000 | 1.102 | gw-r/thread-46/journal/page | none observed |
| 638f7df791917d8a0000000000000018 | 1003.696 | 0.184 | n/a | 0.000 | 0.000 | 0.755 | 1001.311 | 0.046 | n/a | 0.166 | 0.000 | n/a | n/a | 1.234 | 0.184 | 0.000 | 1.234 | gw-r/thread-49/journal/page | none observed |
| 638f7df791917d8a0000000000000019 | 1003.135 | 0.134 | n/a | 0.000 | 0.000 | 0.637 | 1001.002 | 0.017 | n/a | 0.156 | 0.000 | n/a | n/a | 1.188 | 0.134 | 0.000 | 1.188 | gw-r/thread-48/journal/page | none observed |
| 638f7df791917d8a0000000000000082 | 983.540 | 2.713 | n/a | 0.000 | 0.000 | 0.652 | 979.990 | 0.013 | n/a | 0.088 | 0.000 | n/a | n/a | 0.084 | 2.713 | 0.003 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 638f7df791917d8a000000000000007f | 755.930 | 2.629 | n/a | 0.000 | 0.000 | 0.750 | 752.317 | 0.025 | n/a | 0.138 | 0.000 | n/a | n/a | 0.071 | 2.629 | 0.003 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 638f7df791917d8a0000000000000062 | 642.676 | 3.588 | n/a | 0.000 | 0.000 | 0.754 | 637.905 | 0.151 | n/a | 0.110 | 0.000 | n/a | n/a | 0.167 | 3.588 | 0.006 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 638f7df791917d8a000000000000005e | 592.429 | 9.312 | n/a | 0.000 | 0.000 | 1.533 | 580.967 | 0.333 | n/a | 0.171 | 0.000 | n/a | n/a | 0.114 | 9.312 | 0.016 | 0.114 | gw-r/thread-71/journal/page | none observed |
| 638f7df791917d8a0000000000000052 | 522.781 | 6.423 | n/a | 0.000 | 0.000 | 0.913 | 515.049 | 0.034 | n/a | 0.109 | 0.000 | n/a | n/a | 0.254 | 6.423 | 0.012 | 0.254 | gw-r/thread-47/journal/page | none observed |
| 638f7df791917d8a0000000000000083 | 383.735 | 4.174 | n/a | 0.000 | 0.000 | 0.859 | 378.498 | 0.017 | n/a | 0.103 | 0.000 | n/a | n/a | 0.083 | 4.174 | 0.011 | 0.083 | gw-r/thread-71/journal/page | none observed |
| 638f7df791917d8a0000000000000080 | 235.443 | 4.327 | n/a | 0.000 | 0.000 | 0.891 | 229.839 | 0.075 | n/a | 0.126 | 0.000 | n/a | n/a | 0.185 | 4.327 | 0.018 | 0.185 | gw-r/thread-48/journal/page | none observed |
| 638f7df791917d8a0000000000000064 | 211.963 | 2.877 | n/a | 0.000 | 0.000 | 1.009 | 204.145 | 3.747 | n/a | 0.107 | 0.000 | n/a | n/a | 0.079 | 2.877 | 0.014 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 638f7df791917d8a000000000000005d | 122.490 | 3.208 | n/a | 0.000 | 0.000 | 0.853 | 117.113 | 1.120 | n/a | 0.108 | 0.000 | n/a | n/a | 0.087 | 3.208 | 0.026 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 638f7df791917d8a0000000000000060 | 28.623 | 2.087 | n/a | 0.000 | 0.000 | 0.298 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.237 | 2.087 | 0.073 | 26.237 | node-14/thread-2/socket.wait-first-byte | none observed |
| 638f7df791917d8a000000000000007e | 5.967 | 3.822 | n/a | 0.000 | 0.000 | 0.401 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.745 | 3.822 | 0.640 | 1.745 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 335.894 | n/a | n/a | n/a | 3.682 | n/a | 0.000 | 0.000 | 1.085 | 308.606 | 0.052 | n/a | 0.124 | 0.000 | n/a | n/a | 0.175 | 3.682 | 0.020 | 0.175 |
| p99 | 790.472 | n/a | n/a | n/a | 24.735 | n/a | 0.747 | 0.000 | 1.933 | 785.781 | 0.917 | n/a | 0.328 | 0.000 | n/a | n/a | 0.285 | 25.481 | 0.076 | 0.285 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a000000000000001d | 790.472 | 2.309 | n/a | 0.000 | 0.000 | 1.933 | 785.781 | 0.052 | n/a | 0.223 | 0.000 | n/a | n/a | 0.175 | 2.309 | 0.003 | 0.175 | gw-r/thread-46/journal/page | none observed |
| 638f7df791917d8a000000000000001b | 420.390 | 8.242 | n/a | 0.000 | 0.000 | 1.366 | 409.359 | 0.917 | n/a | 0.328 | 0.000 | n/a | n/a | 0.177 | 8.242 | 0.020 | 0.177 | gw-r/thread-50/journal/page | none observed |
| 638f7df791917d8a000000000000001a | 335.894 | 24.735 | n/a | 0.747 | 0.000 | 1.085 | 308.606 | 0.313 | n/a | 0.124 | 0.000 | n/a | n/a | 0.285 | 25.481 | 0.076 | 0.285 | gw-r/thread-49/journal/page | none observed |
| 638f7df791917d8a000000000000001f | 154.692 | 3.682 | n/a | 0.000 | 0.000 | 0.820 | 149.897 | 0.015 | n/a | 0.114 | 0.000 | n/a | n/a | 0.164 | 3.682 | 0.024 | 0.164 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 846.007 | n/a | n/a | n/a | 3.721 | n/a | 0.000 | 0.000 | 0.722 | 842.231 | 0.021 | n/a | 0.126 | 0.000 | n/a | n/a | 0.122 | 3.721 | 0.005 | 0.122 |
| p99 | 1003.398 | n/a | n/a | n/a | 5.081 | n/a | 0.000 | 0.000 | 0.745 | 997.272 | 0.021 | n/a | 0.137 | 0.000 | n/a | n/a | 0.152 | 5.081 | 0.025 | 0.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000023 | 1003.398 | 5.081 | n/a | 0.000 | 0.000 | 0.745 | 997.272 | 0.021 | n/a | 0.126 | 0.000 | n/a | n/a | 0.152 | 5.081 | 0.005 | 0.152 | gw-r/thread-48/journal/page | none observed |
| 638f7df791917d8a0000000000000020 | 846.007 | 2.847 | n/a | 0.000 | 0.000 | 0.647 | 842.231 | 0.021 | n/a | 0.137 | 0.000 | n/a | n/a | 0.122 | 2.847 | 0.003 | 0.122 | gw-r/thread-51/journal/page | none observed |
| 638f7df791917d8a0000000000000021 | 149.711 | 3.721 | n/a | 0.000 | 0.000 | 0.722 | 145.039 | 0.018 | n/a | 0.114 | 0.000 | n/a | n/a | 0.097 | 3.721 | 0.025 | 0.097 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 313.470 | n/a | n/a | n/a | 3.030 | n/a | 0.000 | 0.000 | 0.849 | 308.426 | 0.020 | n/a | 0.142 | 0.000 | n/a | n/a | 0.086 | 3.030 | 0.004 | 0.086 |
| p99 | 992.907 | n/a | n/a | n/a | 4.139 | n/a | 0.000 | 0.000 | 2.851 | 987.087 | 0.024 | n/a | 0.150 | 0.000 | n/a | n/a | 19.492 | 4.139 | 0.132 | 19.492 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000029 | 992.907 | 4.139 | n/a | 0.000 | 0.000 | 1.411 | 987.087 | 0.022 | n/a | 0.149 | 0.000 | n/a | n/a | 0.097 | 4.139 | 0.004 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 638f7df791917d8a0000000000000027 | 670.060 | 2.376 | n/a | 0.000 | 0.000 | 2.851 | 664.585 | 0.020 | n/a | 0.142 | 0.000 | n/a | n/a | 0.086 | 2.376 | 0.004 | 0.086 | gw-r/thread-51/journal/page | none observed |
| 638f7df791917d8a0000000000000025 | 313.470 | 3.937 | n/a | 0.000 | 0.000 | 0.849 | 308.426 | 0.024 | n/a | 0.150 | 0.000 | n/a | n/a | 0.084 | 3.937 | 0.013 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 638f7df791917d8a0000000000000024 | 22.966 | 3.030 | n/a | 0.000 | 0.000 | 0.444 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.492 | 3.030 | 0.132 | 19.492 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 366.020 | n/a | n/a | n/a | 2.843 | n/a | 0.000 | 0.000 | 0.859 | 362.246 | 0.020 | n/a | 0.137 | 0.000 | n/a | n/a | 0.092 | 2.843 | 0.007 | 0.092 |
| p99 | 976.086 | n/a | n/a | n/a | 7.594 | n/a | 0.000 | 0.000 | 1.589 | 971.925 | 0.025 | n/a | 0.192 | 0.000 | n/a | n/a | 0.134 | 7.594 | 0.033 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a000000000000002f | 976.086 | 3.079 | n/a | 0.000 | 0.000 | 0.748 | 971.925 | 0.025 | n/a | 0.192 | 0.000 | n/a | n/a | 0.116 | 3.079 | 0.003 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 638f7df791917d8a000000000000002b | 428.359 | 2.843 | n/a | 0.000 | 0.000 | 1.589 | 423.658 | 0.022 | n/a | 0.164 | 0.000 | n/a | n/a | 0.081 | 2.843 | 0.007 | 0.081 | gw-r/thread-50/journal/page | none observed |
| 638f7df791917d8a000000000000002d | 366.020 | 2.477 | n/a | 0.000 | 0.000 | 1.054 | 362.246 | 0.014 | n/a | 0.137 | 0.000 | n/a | n/a | 0.092 | 2.477 | 0.007 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 638f7df791917d8a000000000000002a | 232.803 | 7.594 | n/a | 0.000 | 0.000 | 0.859 | 224.075 | 0.020 | n/a | 0.121 | 0.000 | n/a | n/a | 0.134 | 7.594 | 0.033 | 0.134 | gw-r/thread-50/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 125.417 | n/a | n/a | n/a | 2.191 | n/a | 0.000 | 0.000 | 0.939 | 118.722 | 0.027 | n/a | 0.101 | 0.000 | n/a | n/a | 0.118 | 2.191 | 0.017 | 0.118 |
| p99 | 702.088 | n/a | n/a | n/a | 4.937 | n/a | 0.000 | 0.000 | 3.858 | 695.816 | 0.840 | n/a | 0.142 | 0.000 | n/a | n/a | 9.472 | 4.937 | 0.176 | 9.472 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000036 | 702.088 | 2.191 | n/a | 0.000 | 0.000 | 3.858 | 695.816 | 0.027 | n/a | 0.101 | 0.000 | n/a | n/a | 0.095 | 2.191 | 0.003 | 0.095 | gw-r/thread-51/journal/page | none observed |
| 638f7df791917d8a0000000000000031 | 284.583 | 4.937 | n/a | 0.000 | 0.000 | 0.939 | 278.332 | 0.030 | n/a | 0.128 | 0.000 | n/a | n/a | 0.217 | 4.937 | 0.017 | 0.217 | gw-r/thread-49/journal/page | none observed |
| 638f7df791917d8a0000000000000034 | 125.417 | 3.262 | n/a | 0.000 | 0.000 | 2.333 | 118.722 | 0.840 | n/a | 0.142 | 0.000 | n/a | n/a | 0.118 | 3.262 | 0.026 | 0.118 | gw-r/thread-44/journal/page | none observed |
| 638f7df791917d8a0000000000000032 | 12.115 | 2.137 | n/a | 0.000 | 0.000 | 0.507 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.472 | 2.137 | 0.176 | 9.472 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 378.653 | n/a | n/a | n/a | 4.199 | n/a | 0.000 | 0.000 | 2.103 | 373.116 | 0.018 | n/a | 0.121 | 0.000 | n/a | n/a | 0.117 | 4.199 | 0.011 | 0.117 |
| p99 | 700.940 | n/a | n/a | n/a | 7.518 | n/a | 0.000 | 0.000 | 4.466 | 691.011 | 0.322 | n/a | 0.208 | 0.000 | n/a | n/a | 0.175 | 7.518 | 0.026 | 0.175 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000037 | 700.940 | 7.518 | n/a | 0.000 | 0.000 | 2.103 | 691.011 | 0.013 | n/a | 0.121 | 0.000 | n/a | n/a | 0.175 | 7.518 | 0.011 | 0.175 | gw-r/thread-47/journal/page | none observed |
| 638f7df791917d8a000000000000003c | 610.661 | 3.625 | n/a | 0.000 | 0.000 | 2.147 | 604.548 | 0.033 | n/a | 0.191 | 0.000 | n/a | n/a | 0.117 | 3.625 | 0.006 | 0.117 | gw-r/thread-71/journal/page | none observed |
| 638f7df791917d8a000000000000003a | 378.653 | 4.199 | n/a | 0.000 | 0.000 | 0.820 | 373.116 | 0.322 | n/a | 0.096 | 0.000 | n/a | n/a | 0.100 | 4.199 | 0.011 | 0.100 | gw-r/thread-70/journal/page | none observed |
| 638f7df791917d8a0000000000000039 | 238.766 | 6.306 | n/a | 0.000 | 0.000 | 4.466 | 227.644 | 0.018 | n/a | 0.208 | 0.000 | n/a | n/a | 0.125 | 6.306 | 0.026 | 0.125 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 400.362 | n/a | n/a | n/a | 2.704 | n/a | 0.000 | 0.000 | 1.079 | 391.726 | 0.021 | n/a | 0.105 | 0.000 | n/a | n/a | 0.123 | 2.704 | 0.009 | 0.123 |
| p99 | 688.544 | n/a | n/a | n/a | 4.229 | n/a | 0.000 | 0.000 | 3.040 | 681.078 | 3.897 | n/a | 0.154 | 0.000 | n/a | n/a | 2.039 | 4.229 | 0.019 | 2.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000040 | 688.544 | 4.229 | n/a | 0.000 | 0.000 | 1.079 | 681.078 | 0.017 | n/a | 0.102 | 0.000 | n/a | n/a | 2.039 | 4.229 | 0.006 | 2.039 | gw-r/thread-44/journal/page | none observed |
| 638f7df791917d8a000000000000003f | 585.441 | 2.704 | n/a | 0.000 | 0.000 | 1.843 | 580.616 | 0.021 | n/a | 0.139 | 0.000 | n/a | n/a | 0.118 | 2.704 | 0.005 | 0.118 | gw-r/thread-72/journal/page | none observed |
| 638f7df791917d8a000000000000003d | 400.362 | 3.625 | n/a | 0.000 | 0.000 | 0.817 | 391.726 | 3.897 | n/a | 0.154 | 0.000 | n/a | n/a | 0.143 | 3.625 | 0.009 | 0.143 | gw-r/thread-44/journal/page | none observed |
| 638f7df791917d8a0000000000000041 | 192.804 | 2.506 | n/a | 0.000 | 0.000 | 0.974 | 188.942 | 0.155 | n/a | 0.105 | 0.000 | n/a | n/a | 0.123 | 2.506 | 0.013 | 0.123 | gw-r/thread-70/journal/page | none observed |
| 638f7df791917d8a0000000000000043 | 138.115 | 2.688 | n/a | 0.000 | 0.000 | 3.040 | 132.177 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.094 | 2.688 | 0.019 | 0.094 | gw-r/thread-72/journal/page | none observed |

## P3 / L1024 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 987.769 | n/a | n/a | n/a | 2.511 | n/a | 0.000 | 0.000 | 0.969 | 979.976 | 0.489 | n/a | 0.143 | 0.000 | n/a | n/a | 0.112 | 2.511 | 0.005 | 0.112 |
| p99 | 1004.481 | n/a | n/a | n/a | 4.955 | n/a | 0.000 | 0.000 | 1.956 | 1001.093 | 1.643 | n/a | 0.167 | 0.000 | n/a | n/a | 1.128 | 4.955 | 0.030 | 1.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000046 | 1004.481 | 0.137 | n/a | 0.000 | 0.000 | 1.956 | 1001.093 | 0.025 | n/a | 0.143 | 0.000 | n/a | n/a | 1.128 | 0.137 | 0.000 | 1.128 | gw-r/thread-50/journal/page | none observed |
| 638f7df791917d8a0000000000000045 | 987.769 | 4.955 | n/a | 0.000 | 0.000 | 0.969 | 979.976 | 1.643 | n/a | 0.115 | 0.000 | n/a | n/a | 0.112 | 4.955 | 0.005 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 638f7df791917d8a0000000000000047 | 84.716 | 2.511 | n/a | 0.000 | 0.000 | 0.801 | 80.645 | 0.489 | n/a | 0.167 | 0.000 | n/a | n/a | 0.103 | 2.511 | 0.030 | 0.103 | gw-r/thread-47/journal/page | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 398.218 | n/a | n/a | n/a | 3.020 | n/a | 0.000 | 0.000 | 0.861 | 394.363 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.113 | 3.020 | 0.007 | 0.113 |
| p99 | 895.642 | n/a | n/a | n/a | 6.576 | n/a | 0.000 | 0.000 | 2.531 | 891.758 | 0.035 | n/a | 0.201 | 0.000 | n/a | n/a | 0.212 | 6.576 | 0.016 | 0.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000048 | 895.642 | 3.020 | n/a | 0.000 | 0.000 | 0.517 | 891.758 | 0.035 | n/a | 0.201 | 0.000 | n/a | n/a | 0.111 | 3.020 | 0.003 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 638f7df791917d8a0000000000000049 | 424.184 | 6.576 | n/a | 0.000 | 0.000 | 2.531 | 414.836 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.124 | 6.576 | 0.016 | 0.124 | gw-r/thread-70/journal/page | none observed |
| 638f7df791917d8a000000000000004b | 398.218 | 2.691 | n/a | 0.000 | 0.000 | 0.932 | 394.363 | 0.020 | n/a | 0.098 | 0.000 | n/a | n/a | 0.113 | 2.691 | 0.007 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 638f7df791917d8a000000000000004d | 209.415 | 3.093 | n/a | 0.000 | 0.000 | 0.861 | 205.068 | 0.014 | n/a | 0.167 | 0.000 | n/a | n/a | 0.212 | 3.093 | 0.015 | 0.212 | gw-r/thread-44/journal/page | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 953.945 | n/a | n/a | n/a | 2.333 | n/a | 0.000 | 0.000 | 1.403 | 949.993 | 0.050 | n/a | 0.151 | 0.000 | n/a | n/a | 0.095 | 2.333 | 0.002 | 0.095 |
| p99 | 987.630 | n/a | n/a | n/a | 8.806 | n/a | 0.000 | 0.000 | 1.430 | 983.403 | 0.258 | n/a | 0.154 | 0.000 | n/a | n/a | 0.254 | 8.806 | 0.018 | 0.254 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a000000000000004e | 987.630 | 2.333 | n/a | 0.000 | 0.000 | 1.403 | 983.403 | 0.258 | n/a | 0.137 | 0.000 | n/a | n/a | 0.095 | 2.333 | 0.002 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 638f7df791917d8a000000000000004f | 953.945 | 2.238 | n/a | 0.000 | 0.000 | 1.430 | 949.993 | 0.050 | n/a | 0.151 | 0.000 | n/a | n/a | 0.083 | 2.238 | 0.002 | 0.083 | gw-r/thread-50/journal/page | none observed |
| 638f7df791917d8a0000000000000050 | 496.011 | 8.806 | n/a | 0.000 | 0.000 | 1.240 | 485.534 | 0.024 | n/a | 0.154 | 0.000 | n/a | n/a | 0.254 | 8.806 | 0.018 | 0.254 | gw-r/thread-47/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 826.549 | n/a | n/a | n/a | 4.009 | n/a | 0.000 | 0.000 | 0.826 | 819.044 | 0.021 | n/a | 0.063 | 0.000 | n/a | n/a | 0.157 | 4.009 | 0.008 | 0.157 |
| p99 | 899.625 | n/a | n/a | n/a | 6.326 | n/a | 0.000 | 0.000 | 1.042 | 894.738 | 3.917 | n/a | 0.095 | 0.000 | n/a | n/a | 0.238 | 6.326 | 0.042 | 0.238 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000055 | 899.625 | 4.009 | n/a | 0.000 | 0.000 | 0.683 | 894.738 | 0.021 | n/a | 0.045 | 0.000 | n/a | n/a | 0.129 | 4.009 | 0.004 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 638f7df791917d8a0000000000000056 | 826.549 | 6.326 | n/a | 0.000 | 0.000 | 0.826 | 819.044 | 0.020 | n/a | 0.095 | 0.000 | n/a | n/a | 0.238 | 6.326 | 0.008 | 0.238 | gw-r/thread-70/journal/page | none observed |
| 638f7df791917d8a0000000000000054 | 85.155 | 3.546 | n/a | 0.000 | 0.000 | 1.042 | 76.430 | 3.917 | n/a | 0.063 | 0.000 | n/a | n/a | 0.157 | 3.546 | 0.042 | 0.157 | gw-r/thread-48/journal/page | none observed |

## P3 / grow3 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 160.545 | n/a | n/a | n/a | 3.752 | n/a | 0.000 | 0.000 | 1.067 | 156.605 | 0.015 | n/a | 0.093 | 0.000 | n/a | n/a | 0.211 | 3.752 | 0.020 | 0.211 |
| p99 | 923.371 | n/a | n/a | n/a | 130.741 | n/a | 8.337 | 0.000 | 1.292 | 778.564 | 0.022 | n/a | 0.167 | 0.000 | n/a | n/a | 42.787 | 139.079 | 0.695 | 42.787 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a000000000000005a | 923.371 | 130.741 | n/a | 8.337 | 0.000 | 1.067 | 778.564 | 0.015 | n/a | 0.167 | 0.000 | n/a | n/a | 4.479 | 139.079 | 0.151 | 4.479 | gw-r/thread-44/journal/page | none observed |
| 638f7df791917d8a0000000000000057 | 184.059 | 3.752 | n/a | 0.000 | 0.000 | 1.221 | 178.720 | 0.022 | n/a | 0.132 | 0.000 | n/a | n/a | 0.211 | 3.752 | 0.020 | 0.211 | gw-r/thread-72/journal/page | none observed |
| 638f7df791917d8a0000000000000059 | 160.545 | 2.750 | n/a | 0.000 | 0.000 | 0.972 | 156.605 | 0.015 | n/a | 0.093 | 0.000 | n/a | n/a | 0.109 | 2.750 | 0.017 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 638f7df791917d8a000000000000005c | 144.629 | 96.425 | n/a | 4.126 | 0.000 | 1.292 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.787 | 100.551 | 0.695 | 42.787 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 231.025 | n/a | n/a | n/a | 4.788 | n/a | 0.000 | 0.000 | 0.901 | 227.083 | 0.025 | n/a | 0.120 | 0.000 | n/a | n/a | 0.152 | 4.788 | 0.028 | 0.152 |
| p99 | 806.771 | n/a | n/a | n/a | 144.682 | n/a | 8.444 | 0.000 | 2.792 | 649.723 | 0.162 | n/a | 0.201 | 0.000 | n/a | n/a | 21.927 | 153.126 | 0.204 | 21.927 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000075 | 806.771 | 144.682 | n/a | 8.444 | 0.000 | 1.052 | 649.723 | 0.021 | n/a | 0.138 | 0.000 | n/a | n/a | 2.711 | 153.126 | 0.190 | 2.711 | gw-r/thread-72/journal/page | none observed |
| 638f7df791917d8a0000000000000072 | 562.145 | 7.111 | n/a | 0.000 | 0.000 | 0.618 | 554.138 | 0.021 | n/a | 0.106 | 0.000 | n/a | n/a | 0.152 | 7.111 | 0.013 | 0.152 | gw-r/thread-72/journal/page | none observed |
| 638f7df791917d8a0000000000000074 | 436.493 | 4.708 | n/a | 0.000 | 0.000 | 1.059 | 430.367 | 0.055 | n/a | 0.201 | 0.000 | n/a | n/a | 0.103 | 4.708 | 0.011 | 0.103 | gw-r/thread-51/journal/page | none observed |
| 638f7df791917d8a0000000000000068 | 321.777 | 7.454 | n/a | 0.000 | 0.000 | 1.464 | 312.509 | 0.025 | n/a | 0.120 | 0.000 | n/a | n/a | 0.204 | 7.454 | 0.023 | 0.204 | gw-r/thread-44/journal/page | none observed |
| 638f7df791917d8a0000000000000067 | 252.841 | 7.397 | n/a | 0.000 | 0.000 | 0.750 | 244.273 | 0.065 | n/a | 0.176 | 0.000 | n/a | n/a | 0.180 | 7.397 | 0.029 | 0.180 | gw-r/thread-44/journal/page | none observed |
| 638f7df791917d8a000000000000006b | 231.025 | 2.349 | n/a | 0.000 | 0.000 | 1.220 | 227.083 | 0.158 | n/a | 0.145 | 0.000 | n/a | n/a | 0.070 | 2.349 | 0.010 | 0.070 | gw-r/thread-44/journal/page | none observed |
| 638f7df791917d8a0000000000000066 | 171.353 | 4.788 | n/a | 0.000 | 0.000 | 0.756 | 165.450 | 0.162 | n/a | 0.053 | 0.000 | n/a | n/a | 0.143 | 4.788 | 0.028 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 638f7df791917d8a0000000000000070 | 97.065 | 3.863 | n/a | 0.000 | 0.000 | 2.792 | 90.091 | 0.052 | n/a | 0.144 | 0.000 | n/a | n/a | 0.122 | 3.863 | 0.040 | 0.122 | gw-r/thread-46/journal/page | none observed |
| 638f7df791917d8a000000000000006f | 57.113 | 4.313 | n/a | 0.000 | 0.000 | 0.901 | 51.624 | 0.017 | n/a | 0.066 | 0.000 | n/a | n/a | 0.192 | 4.313 | 0.076 | 0.192 | gw-r/thread-70/journal/page | none observed |
| 638f7df791917d8a000000000000006c | 27.911 | 5.701 | n/a | 0.000 | 0.000 | 0.282 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.927 | 5.701 | 0.204 | 21.927 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 130.460 | n/a | n/a | n/a | 84.361 | n/a | 3.845 | 0.000 | 1.149 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.983 | 88.205 | 0.704 | 15.983 |
| p99 | 530.959 | n/a | n/a | n/a | 102.878 | n/a | 5.895 | 0.000 | 1.899 | 443.157 | 0.018 | n/a | 0.109 | 0.000 | n/a | n/a | 38.431 | 107.363 | 0.828 | 38.431 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a000000000000007a | 530.959 | 81.909 | n/a | 2.458 | 0.000 | 1.149 | 443.157 | 0.018 | n/a | 0.109 | 0.000 | n/a | n/a | 2.158 | 84.367 | 0.159 | 2.158 | gw-r/thread-44/journal/page | none observed |
| 638f7df791917d8a000000000000007c | 169.973 | 86.846 | n/a | 3.893 | 0.000 | 1.899 | 75.230 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 2.045 | 90.739 | 0.534 | 2.045 | node-14/thread-2/replica.fetch-feed | none observed |
| 638f7df791917d8a0000000000000076 | 147.063 | 102.878 | n/a | 4.485 | 0.000 | 1.269 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.431 | 107.363 | 0.730 | 38.431 | node-14/thread-2/replica.fetch-feed | none observed |
| 638f7df791917d8a000000000000007d | 130.460 | 85.925 | n/a | 5.895 | 0.000 | 1.010 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.629 | 91.821 | 0.704 | 37.629 | node-14/thread-2/replica.fetch-feed | none observed |
| 638f7df791917d8a000000000000007b | 113.995 | 84.361 | n/a | 3.845 | 0.000 | 0.887 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.902 | 88.205 | 0.774 | 24.902 | node-14/thread-2/replica.fetch-feed | none observed |
| 638f7df791917d8a0000000000000077 | 101.370 | 80.282 | n/a | 3.693 | 0.000 | 1.412 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.983 | 83.975 | 0.828 | 15.983 | node-14/thread-2/replica.fetch-feed | none observed |
| 638f7df791917d8a0000000000000078 | 10.946 | 6.599 | n/a | 0.000 | 0.000 | 0.584 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.762 | 6.599 | 0.603 | 3.762 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 404.551 | n/a | n/a | n/a | 2.705 | n/a | 0.000 | 0.000 | 0.740 | 394.272 | 0.047 | n/a | 0.116 | 0.000 | n/a | n/a | 0.142 | 2.705 | 0.013 | 0.142 |
| p99 | 1008.039 | n/a | n/a | n/a | 9.219 | n/a | 0.000 | 0.000 | 0.919 | 1004.220 | 0.174 | n/a | 0.125 | 0.000 | n/a | n/a | 10.724 | 9.219 | 0.162 | 10.724 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a000000000000008a | 1008.039 | 2.995 | n/a | 0.000 | 0.000 | 0.510 | 1004.220 | 0.047 | n/a | 0.125 | 0.000 | n/a | n/a | 0.142 | 2.995 | 0.003 | 0.142 | gw-r/thread-70/journal/page | none observed |
| 638f7df791917d8a000000000000008b | 631.293 | 2.705 | n/a | 0.000 | 0.000 | 0.919 | 627.296 | 0.174 | n/a | 0.116 | 0.000 | n/a | n/a | 0.083 | 2.705 | 0.004 | 0.083 | gw-r/thread-71/journal/page | none observed |
| 638f7df791917d8a0000000000000085 | 404.551 | 9.219 | n/a | 0.000 | 0.000 | 0.797 | 394.272 | 0.014 | n/a | 0.101 | 0.000 | n/a | n/a | 0.148 | 9.219 | 0.023 | 0.148 | gw-r/thread-72/journal/page | none observed |
| 638f7df791917d8a0000000000000088 | 208.131 | 2.618 | n/a | 0.000 | 0.000 | 0.740 | 204.427 | 0.165 | n/a | 0.117 | 0.000 | n/a | n/a | 0.064 | 2.618 | 0.013 | 0.064 | gw-r/thread-70/journal/page | none observed |
| 638f7df791917d8a0000000000000086 | 13.563 | 2.202 | n/a | 0.000 | 0.000 | 0.637 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.724 | 2.202 | 0.162 | 10.724 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 358.201 | n/a | n/a | n/a | 3.985 | n/a | 0.000 | 0.000 | 0.723 | 353.276 | 0.050 | n/a | 0.141 | 0.000 | n/a | n/a | 0.091 | 3.985 | 0.011 | 0.091 |
| p99 | 791.384 | n/a | n/a | n/a | 8.711 | n/a | 0.000 | 0.000 | 1.260 | 787.610 | 0.184 | n/a | 0.187 | 0.000 | n/a | n/a | 0.139 | 8.711 | 0.031 | 0.139 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a000000000000008e | 791.384 | 2.232 | n/a | 0.000 | 0.000 | 1.260 | 787.610 | 0.050 | n/a | 0.141 | 0.000 | n/a | n/a | 0.091 | 2.232 | 0.003 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 638f7df791917d8a0000000000000091 | 585.181 | 8.711 | n/a | 0.000 | 0.000 | 1.133 | 575.033 | 0.031 | n/a | 0.187 | 0.000 | n/a | n/a | 0.087 | 8.711 | 0.015 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 638f7df791917d8a000000000000008c | 358.201 | 3.985 | n/a | 0.000 | 0.000 | 0.518 | 353.276 | 0.134 | n/a | 0.151 | 0.000 | n/a | n/a | 0.139 | 3.985 | 0.011 | 0.139 | gw-r/thread-70/journal/page | none observed |
| 638f7df791917d8a000000000000008f | 203.064 | 6.377 | n/a | 0.000 | 0.000 | 0.723 | 195.549 | 0.184 | n/a | 0.110 | 0.000 | n/a | n/a | 0.122 | 6.377 | 0.031 | 0.122 | gw-r/thread-51/journal/page | none observed |

## P3 / sweep / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.900 | n/a | n/a | n/a | 3.000 | n/a | 0.000 | 0.000 | 0.440 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.035 | 3.000 | 0.203 | 6.035 |
| p99 | 1003.832 | n/a | n/a | n/a | 13.406 | n/a | 0.000 | 0.000 | 4.096 | 1001.610 | 0.071 | n/a | 0.262 | 0.000 | n/a | n/a | 15.159 | 13.406 | 0.601 | 15.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 638f7df791917d8a0000000000000099 | 1003.832 | 0.197 | n/a | 0.000 | 0.000 | 0.569 | 1001.610 | 0.071 | n/a | 0.262 | 0.000 | n/a | n/a | 1.123 | 0.197 | 0.000 | 1.123 | gw-r/thread-51/journal/page | none observed |
| 638f7df791917d8a0000000000000094 | 22.312 | 13.406 | n/a | 0.000 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.415 | 13.406 | 0.601 | 8.415 | node-14/thread-2/replica.fetch-feed | none observed |
| 638f7df791917d8a0000000000000093 | 19.761 | 4.010 | n/a | 0.000 | 0.000 | 0.593 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.159 | 4.010 | 0.203 | 15.159 | node-14/thread-2/socket.wait-first-byte | none observed |
| 638f7df791917d8a0000000000000096 | 14.128 | 7.666 | n/a | 0.000 | 0.000 | 0.427 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.035 | 7.666 | 0.543 | 6.035 | node-14/thread-2/socket.wait-first-byte | none observed |
| 638f7df791917d8a0000000000000098 | 12.900 | 1.854 | n/a | 0.000 | 0.000 | 4.096 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.950 | 1.854 | 0.144 | 6.950 | node-14/thread-2/socket.wait-first-byte | none observed |
| 638f7df791917d8a0000000000000092 | 12.610 | 7.278 | n/a | 0.000 | 0.000 | 0.440 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.892 | 7.278 | 0.577 | 4.892 | node-14/thread-2/socket.wait-first-byte | none observed |
| 638f7df791917d8a0000000000000095 | 12.196 | 2.031 | n/a | 0.000 | 0.000 | 0.378 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.787 | 2.031 | 0.166 | 9.787 | node-14/thread-2/socket.wait-first-byte | none observed |
| 638f7df791917d8a0000000000000097 | 7.325 | 3.000 | n/a | 0.000 | 0.000 | 0.395 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.930 | 3.000 | 0.410 | 3.930 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.840 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.671 | 201.274 | 0.021 | n/a | 0.184 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 |
| p99 | 206.056 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.412 | 201.775 | 0.982 | n/a | 1.934 | 0.000 | n/a | n/a | 0.331 | 0.000 | 0.000 | 0.331 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced39000000000000000b | 206.056 | 0.000 | n/a | 0.000 | 0.000 | 4.412 | 201.274 | 0.021 | n/a | 0.184 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced39000000000000000d | 204.081 | 0.000 | n/a | 0.000 | 0.000 | 1.766 | 201.775 | 0.094 | n/a | 0.224 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced390000000000000009 | 203.846 | 0.000 | n/a | 0.000 | 0.000 | 1.780 | 201.572 | 0.017 | n/a | 0.147 | 0.000 | n/a | n/a | 0.331 | 0.000 | 0.000 | 0.331 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced39000000000000000e | 203.495 | 0.000 | n/a | 0.000 | 0.000 | 1.448 | 201.649 | 0.021 | n/a | 0.208 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced390000000000000008 | 202.840 | 0.000 | n/a | 0.000 | 0.000 | 1.671 | 200.857 | 0.014 | n/a | 0.148 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced39000000000000000f | 202.657 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 201.415 | 0.022 | n/a | 0.196 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced39000000000000000c | 181.045 | 0.000 | n/a | 0.000 | 0.000 | 1.227 | 178.483 | 0.982 | n/a | 0.118 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced390000000000000011 | 150.007 | 0.000 | n/a | 0.000 | 0.000 | 0.998 | 148.777 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced390000000000000010 | 105.488 | 0.000 | n/a | 0.000 | 0.000 | 2.173 | 101.257 | 0.015 | n/a | 1.934 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-70/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.315 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 201.132 | 0.024 | n/a | 0.197 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 202.797 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.175 | 201.436 | 4.288 | n/a | 0.264 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced390000000000000012 | 202.797 | 0.000 | n/a | 0.000 | 0.000 | 1.175 | 201.222 | 0.015 | n/a | 0.264 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced390000000000000013 | 202.485 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 201.436 | 0.024 | n/a | 0.197 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000014 | 202.315 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 201.132 | 0.030 | n/a | 0.203 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000015 | 176.749 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 171.560 | 4.288 | n/a | 0.069 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.952 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 201.199 | 0.028 | n/a | 0.166 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 |
| p99 | 207.583 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.168 | 206.243 | 0.045 | n/a | 3.656 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced390000000000000021 | 207.583 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 206.243 | 0.028 | n/a | 0.212 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000023 | 205.871 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 201.199 | 0.045 | n/a | 3.656 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000022 | 202.952 | 0.000 | n/a | 0.000 | 0.000 | 1.168 | 201.389 | 0.030 | n/a | 0.166 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced390000000000000020 | 113.659 | 0.000 | n/a | 0.000 | 0.000 | 0.993 | 112.261 | 0.028 | n/a | 0.158 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.982 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.343 | 201.384 | 0.027 | n/a | 0.206 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 |
| p99 | 213.899 | n/a | n/a | n/a | 1.093 | n/a | 0.000 | 0.000 | 1.928 | 205.193 | 0.123 | n/a | 6.538 | 0.000 | n/a | n/a | 0.336 | 1.093 | 0.005 | 0.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced39000000000000002b | 213.899 | 1.093 | n/a | 0.000 | 0.000 | 0.774 | 205.193 | 0.123 | n/a | 6.538 | 0.000 | n/a | n/a | 0.179 | 1.093 | 0.005 | 0.179 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000025 | 205.180 | 0.000 | n/a | 0.000 | 0.000 | 1.179 | 203.488 | 0.020 | n/a | 0.157 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced39000000000000002e | 203.591 | 0.000 | n/a | 0.000 | 0.000 | 1.806 | 201.384 | 0.032 | n/a | 0.206 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced39000000000000002d | 203.535 | 0.000 | n/a | 0.000 | 0.000 | 1.343 | 201.794 | 0.028 | n/a | 0.246 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced390000000000000026 | 202.982 | 0.000 | n/a | 0.000 | 0.000 | 1.651 | 201.043 | 0.022 | n/a | 0.154 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced390000000000000027 | 202.778 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 201.479 | 0.017 | n/a | 0.244 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000029 | 202.625 | 0.000 | n/a | 0.000 | 0.000 | 1.084 | 201.210 | 0.027 | n/a | 0.186 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced39000000000000002f | 166.004 | 0.000 | n/a | 0.000 | 0.000 | 1.928 | 160.297 | 0.034 | n/a | 3.581 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced39000000000000002c | 136.311 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 134.608 | 0.016 | n/a | 0.093 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.401 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.517 | 201.090 | 0.033 | n/a | 0.194 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 |
| p99 | 206.716 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.582 | 202.617 | 21.263 | n/a | 0.490 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced390000000000000030 | 206.716 | 0.000 | n/a | 0.000 | 0.000 | 3.565 | 202.617 | 0.048 | n/a | 0.225 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000037 | 204.270 | 0.000 | n/a | 0.000 | 0.000 | 1.517 | 202.234 | 0.048 | n/a | 0.227 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced390000000000000035 | 203.762 | 0.000 | n/a | 0.000 | 0.000 | 1.651 | 201.374 | 0.037 | n/a | 0.490 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced390000000000000036 | 202.961 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.639 | 0.029 | n/a | 0.322 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced390000000000000032 | 202.444 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 201.199 | 0.033 | n/a | 0.194 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced390000000000000033 | 202.401 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.090 | 0.026 | n/a | 0.175 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced390000000000000039 | 192.020 | 0.000 | n/a | 0.000 | 0.000 | 1.827 | 189.630 | 0.024 | n/a | 0.294 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced390000000000000031 | 158.335 | 0.000 | n/a | 0.000 | 0.000 | 1.542 | 156.344 | 0.026 | n/a | 0.138 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000034 | 142.904 | 0.000 | n/a | 0.000 | 0.000 | 0.986 | 120.440 | 21.263 | n/a | 0.047 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced39000000000000003a | 132.542 | 0.000 | n/a | 0.000 | 0.000 | 4.582 | 127.560 | 0.058 | n/a | 0.188 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.949 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.176 | 201.254 | 0.023 | n/a | 0.147 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 |
| p99 | 209.683 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 8.447 | 202.770 | 0.093 | n/a | 0.380 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced39000000000000003e | 209.683 | 0.000 | n/a | 0.000 | 0.000 | 8.447 | 200.930 | 0.037 | n/a | 0.141 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000041 | 203.973 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 202.271 | 0.093 | n/a | 0.380 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000040 | 203.819 | 0.000 | n/a | 0.000 | 0.000 | 0.746 | 202.770 | 0.022 | n/a | 0.147 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000042 | 203.599 | 0.000 | n/a | 0.000 | 0.000 | 1.249 | 201.939 | 0.026 | n/a | 0.238 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000043 | 202.949 | 0.000 | n/a | 0.000 | 0.000 | 1.280 | 201.363 | 0.021 | n/a | 0.162 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced39000000000000003d | 202.812 | 0.000 | n/a | 0.000 | 0.000 | 1.176 | 201.254 | 0.023 | n/a | 0.153 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced39000000000000003c | 202.477 | 0.000 | n/a | 0.000 | 0.000 | 1.100 | 201.035 | 0.024 | n/a | 0.129 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000044 | 186.839 | 0.000 | n/a | 0.000 | 0.000 | 1.404 | 185.054 | 0.020 | n/a | 0.111 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced39000000000000003f | 76.076 | 0.000 | n/a | 0.000 | 0.000 | 1.109 | 74.710 | 0.015 | n/a | 0.078 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-50/journal/page | none observed |

## P3 / recovery / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.635 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.262 | 0.033 | n/a | 0.144 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 |
| p99 | 204.265 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.976 | 202.613 | 7.936 | n/a | 0.184 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced390000000000000045 | 204.265 | 0.000 | n/a | 0.000 | 0.000 | 1.579 | 202.287 | 0.039 | n/a | 0.184 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced39000000000000004a | 204.132 | 0.000 | n/a | 0.000 | 0.000 | 1.157 | 202.613 | 0.015 | n/a | 0.138 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced390000000000000046 | 203.269 | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 202.151 | 0.017 | n/a | 0.144 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced39000000000000004c | 202.810 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 201.489 | 0.015 | n/a | 0.156 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced390000000000000047 | 202.635 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.262 | 0.017 | n/a | 0.170 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced390000000000000048 | 202.110 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 200.995 | 0.033 | n/a | 0.163 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced39000000000000004e | 201.623 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 197.883 | 2.585 | n/a | 0.047 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced39000000000000004b | 187.814 | 0.000 | n/a | 0.000 | 0.000 | 1.408 | 178.250 | 7.936 | n/a | 0.049 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced39000000000000004d | 173.202 | 0.000 | n/a | 0.000 | 0.000 | 2.976 | 166.760 | 3.216 | n/a | 0.034 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-46/journal/page | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.585 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 201.082 | 0.021 | n/a | 0.155 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 214.739 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 13.251 | 201.437 | 2.418 | n/a | 0.219 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced390000000000000054 | 214.739 | 0.000 | n/a | 0.000 | 0.000 | 13.251 | 201.214 | 0.015 | n/a | 0.144 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced390000000000000052 | 205.275 | 0.000 | n/a | 0.000 | 0.000 | 3.488 | 201.358 | 0.025 | n/a | 0.219 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced390000000000000050 | 202.820 | 0.000 | n/a | 0.000 | 0.000 | 1.208 | 201.279 | 0.016 | n/a | 0.163 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced390000000000000056 | 202.782 | 0.000 | n/a | 0.000 | 0.000 | 0.993 | 201.437 | 0.021 | n/a | 0.215 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000059 | 202.604 | 0.000 | n/a | 0.000 | 0.000 | 1.237 | 201.082 | 0.028 | n/a | 0.157 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced39000000000000004f | 202.585 | 0.000 | n/a | 0.000 | 0.000 | 1.276 | 200.904 | 0.021 | n/a | 0.178 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000051 | 202.469 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 201.147 | 0.014 | n/a | 0.155 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000057 | 202.253 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 200.927 | 0.019 | n/a | 0.142 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000055 | 202.185 | 0.000 | n/a | 0.000 | 0.000 | 0.939 | 200.977 | 0.016 | n/a | 0.141 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000053 | 70.154 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 68.979 | 0.025 | n/a | 0.076 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000058 | 65.403 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 61.761 | 2.418 | n/a | 0.054 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-71/journal/page | none observed |

## P3 / p4h1 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.323 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.968 | 201.020 | 0.019 | n/a | 0.157 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 |
| p99 | 211.542 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.513 | 204.885 | 0.091 | n/a | 0.856 | 0.000 | n/a | n/a | 0.314 | 0.000 | 0.000 | 0.314 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced390000000000000062 | 211.542 | 0.000 | n/a | 0.000 | 0.000 | 7.513 | 203.479 | 0.027 | n/a | 0.247 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced390000000000000061 | 207.533 | 0.000 | n/a | 0.000 | 0.000 | 1.386 | 204.885 | 0.091 | n/a | 0.856 | 0.000 | n/a | n/a | 0.314 | 0.000 | 0.000 | 0.314 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced390000000000000065 | 202.591 | 0.000 | n/a | 0.000 | 0.000 | 1.226 | 201.026 | 0.019 | n/a | 0.184 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced39000000000000006a | 202.516 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 201.266 | 0.030 | n/a | 0.180 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced390000000000000069 | 202.420 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.020 | 0.019 | n/a | 0.150 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced390000000000000066 | 202.323 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 201.090 | 0.022 | n/a | 0.155 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced39000000000000006b | 202.162 | 0.000 | n/a | 0.000 | 0.000 | 0.968 | 200.908 | 0.017 | n/a | 0.126 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced390000000000000060 | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 200.941 | 0.018 | n/a | 0.136 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced390000000000000067 | 201.980 | 0.000 | n/a | 0.000 | 0.000 | 0.709 | 200.989 | 0.016 | n/a | 0.150 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced390000000000000064 | 201.964 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 200.922 | 0.015 | n/a | 0.160 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced390000000000000063 | 171.614 | 0.000 | n/a | 0.000 | 0.000 | 1.391 | 169.738 | 0.022 | n/a | 0.157 | 0.000 | n/a | n/a | 0.305 | 0.000 | 0.000 | 0.305 | gw-r/thread-46/journal/page | none observed |

## P3 / grow3 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 180.645 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.967 | 175.027 | 2.173 | n/a | 0.139 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 |
| p99 | 336.042 | n/a | n/a | n/a | 0.936 | n/a | 0.000 | 0.000 | 2.348 | 201.802 | 153.516 | n/a | 0.201 | 0.000 | n/a | n/a | 0.274 | 0.936 | 0.011 | 0.274 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced390000000000000071 | 336.042 | 0.595 | n/a | 0.000 | 0.000 | 0.794 | 180.841 | 153.516 | n/a | 0.139 | 0.000 | n/a | n/a | 0.156 | 0.595 | 0.002 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced39000000000000006f | 203.832 | 0.000 | n/a | 0.000 | 0.000 | 2.348 | 201.074 | 0.022 | n/a | 0.201 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000070 | 203.056 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 201.802 | 0.024 | n/a | 0.145 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced39000000000000006d | 180.645 | 0.000 | n/a | 0.000 | 0.000 | 1.267 | 175.027 | 4.084 | n/a | 0.111 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced39000000000000006c | 152.160 | 0.000 | n/a | 0.000 | 0.000 | 0.967 | 148.693 | 2.173 | n/a | 0.054 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced39000000000000006e | 144.762 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 140.600 | 3.154 | n/a | 0.073 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced390000000000000072 | 83.913 | 0.936 | n/a | 0.000 | 0.000 | 1.670 | 80.897 | 0.022 | n/a | 0.149 | 0.000 | n/a | n/a | 0.239 | 0.936 | 0.011 | 0.239 | gw-r/thread-51/journal/page | none observed |

## P3 / p4h3 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.104 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.033 | 0.045 | n/a | 0.142 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 |
| p99 | 203.839 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.423 | 201.854 | 15.761 | n/a | 0.241 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced390000000000000082 | 203.839 | 0.000 | n/a | 0.000 | 0.000 | 1.423 | 201.854 | 0.061 | n/a | 0.241 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000080 | 202.979 | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 201.375 | 0.057 | n/a | 0.205 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced39000000000000007e | 202.836 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.464 | 0.026 | n/a | 0.213 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced39000000000000008b | 202.456 | 0.000 | n/a | 0.000 | 0.000 | 1.040 | 201.037 | 0.031 | n/a | 0.200 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced39000000000000008d | 202.227 | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 200.927 | 0.022 | n/a | 0.115 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced390000000000000087 | 202.119 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 201.047 | 0.017 | n/a | 0.130 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced390000000000000088 | 202.104 | 0.000 | n/a | 0.000 | 0.000 | 0.746 | 201.033 | 0.045 | n/a | 0.175 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced39000000000000008a | 201.846 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 201.054 | 0.019 | n/a | 0.131 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced39000000000000007d | 166.380 | 0.000 | n/a | 0.000 | 0.000 | 0.963 | 165.111 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced390000000000000089 | 112.169 | 0.000 | n/a | 0.000 | 0.000 | 1.291 | 106.584 | 3.972 | n/a | 0.177 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced390000000000000081 | 92.910 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 75.722 | 15.761 | n/a | 0.101 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000086 | 90.272 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 85.563 | 3.490 | n/a | 0.063 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced390000000000000085 | 54.445 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 52.309 | 0.907 | n/a | 0.142 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-72/journal/page | none observed |

## P3 / grow10 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 195.208 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 86.953 | 0.018 | n/a | 0.134 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 202.417 | n/a | n/a | n/a | 0.749 | n/a | 0.000 | 0.000 | 1.167 | 201.087 | 144.020 | n/a | 4.274 | 0.000 | n/a | n/a | 0.600 | 0.749 | 0.012 | 0.600 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced39000000000000008e | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 201.087 | 0.021 | n/a | 0.144 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced390000000000000095 | 201.932 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.920 | 0.018 | n/a | 0.126 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced390000000000000094 | 201.885 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 200.928 | 0.015 | n/a | 0.135 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced39000000000000008f | 195.208 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 45.398 | 144.020 | n/a | 4.274 | 0.000 | n/a | n/a | 0.600 | 0.000 | 0.000 | 0.600 | gw-r/thread-49/gateway.admission-wait | none observed |
| 0df7326fae1ced390000000000000098 | 88.504 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 86.953 | 0.017 | n/a | 0.098 | 0.000 | n/a | n/a | 0.543 | 0.000 | 0.000 | 0.543 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced390000000000000099 | 87.425 | 0.573 | n/a | 0.000 | 0.000 | 0.776 | 85.790 | 0.032 | n/a | 0.104 | 0.000 | n/a | n/a | 0.149 | 0.573 | 0.007 | 0.149 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced390000000000000091 | 61.266 | 0.749 | n/a | 0.000 | 0.000 | 1.167 | 59.066 | 0.018 | n/a | 0.134 | 0.000 | n/a | n/a | 0.131 | 0.749 | 0.012 | 0.131 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h10 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.422 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 200.695 | 0.019 | n/a | 0.111 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 |
| p99 | 203.161 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.367 | 201.450 | 11.306 | n/a | 0.176 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced3900000000000000ac | 203.161 | 0.000 | n/a | 0.000 | 0.000 | 1.367 | 201.450 | 0.016 | n/a | 0.176 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced3900000000000000b2 | 202.551 | 0.000 | n/a | 0.000 | 0.000 | 1.133 | 201.078 | 0.020 | n/a | 0.146 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced3900000000000000a8 | 202.411 | 0.000 | n/a | 0.000 | 0.000 | 1.091 | 201.015 | 0.017 | n/a | 0.118 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced3900000000000000af | 202.189 | 0.000 | n/a | 0.000 | 0.000 | 0.951 | 200.857 | 0.015 | n/a | 0.125 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced3900000000000000ad | 202.176 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.052 | 0.021 | n/a | 0.136 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced3900000000000000ae | 202.078 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 200.915 | 0.019 | n/a | 0.142 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 0df7326fae1ced3900000000000000b1 | 201.422 | 0.000 | n/a | 0.000 | 0.000 | 0.479 | 200.695 | 0.016 | n/a | 0.111 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced3900000000000000ab | 200.563 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 199.827 | 0.019 | n/a | 0.082 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced3900000000000000b3 | 181.075 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 180.058 | 0.019 | n/a | 0.081 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-70/journal/page | none observed |
| 0df7326fae1ced3900000000000000a9 | 169.667 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 166.817 | 1.814 | n/a | 0.038 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced3900000000000000a7 | 154.339 | 0.000 | n/a | 0.000 | 0.000 | 1.139 | 141.654 | 11.306 | n/a | 0.057 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced3900000000000000b0 | 118.449 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 114.496 | 2.876 | n/a | 0.059 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-49/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.789 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 200.864 | 0.021 | n/a | 0.118 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 203.720 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.053 | 201.448 | 4.083 | n/a | 0.194 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced3900000000000000bc | 203.720 | 0.000 | n/a | 0.000 | 0.000 | 2.053 | 201.268 | 0.033 | n/a | 0.170 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-71/journal/page | none observed |
| 0df7326fae1ced3900000000000000bb | 202.708 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 201.448 | 0.023 | n/a | 0.194 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-72/journal/page | none observed |
| 0df7326fae1ced3900000000000000b8 | 202.542 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.150 | 0.018 | n/a | 0.180 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-51/journal/page | none observed |
| 0df7326fae1ced3900000000000000b4 | 202.188 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 200.918 | 0.020 | n/a | 0.119 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-44/journal/page | none observed |
| 0df7326fae1ced3900000000000000b7 | 202.027 | 0.000 | n/a | 0.000 | 0.000 | 0.748 | 200.996 | 0.026 | n/a | 0.140 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-50/journal/page | none observed |
| 0df7326fae1ced3900000000000000b6 | 201.789 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 200.864 | 0.021 | n/a | 0.118 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced3900000000000000ba | 191.312 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 190.326 | 0.014 | n/a | 0.054 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-46/journal/page | none observed |
| 0df7326fae1ced3900000000000000bd | 128.668 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 123.246 | 4.083 | n/a | 0.093 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-48/journal/page | none observed |
| 0df7326fae1ced3900000000000000b5 | 128.328 | 0.000 | n/a | 0.000 | 0.000 | 1.720 | 126.384 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 0df7326fae1ced3900000000000000b9 | 121.058 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 119.642 | 0.065 | n/a | 0.113 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-47/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.468 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.474 | 200.759 | 0.014 | n/a | 0.112 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 201.468 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.474 | 200.759 | 0.014 | n/a | 0.112 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df7326fae1ced3900000000000000c6 | 201.468 | 0.000 | n/a | 0.000 | 0.000 | 0.474 | 200.759 | 0.014 | n/a | 0.112 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

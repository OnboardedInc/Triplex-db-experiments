# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (181.692 ms, trace `637eded203a66937000000000000005a`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (166.739 ms, trace `637eded203a66937000000000000005b`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (25.840 ms, trace `637eded203a669370000000000000062`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (40.707 ms, trace `637eded203a669370000000000000051`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (34.740 ms, trace `637eded203a669370000000000000038`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-smoke-j`; source `190b6e0e7ec52709f06f2bea97cc9c725567edd7`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 22/22 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 22/22. Raw trace bytes: 280612.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 65 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1437.337 | 173.028 | 12.441 | 55 |
| L1 | 1 | 1970.211 | 134.252 | 0.759 | 44 |
| L4 | 4 | 1990.902 | 272.937 | 7.637 | 64 |
| L16 | 16 | 1949.364 | 224.646 | 10.469 | 64 |
| tail | 0 | 3417.650 | 67.975 | 6.180 | 125 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 637eded203a66937000000000000005a | driver.queue.scheduler-dispatch | 0.075 | none | 0 / 32 |
| 637eded203a66937000000000000005a | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 637eded203a66937000000000000005a waited: []

| 637eded203a66937000000000000005b | driver.queue.scheduler-dispatch | 0.077 | none | 1 / 32 |
| 637eded203a66937000000000000005b | driver.queue.scheduler-late | 0.051 | none | 1 / 32 |

Observed active steps while trace 637eded203a66937000000000000005b waited: []

| 637eded203a669370000000000000062 | driver.queue.scheduler-dispatch | 0.076 | none | 0 / 32 |
| 637eded203a669370000000000000062 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 637eded203a669370000000000000062 waited: []

| 637eded203a669370000000000000051 | driver.queue.scheduler-late | 0.412 | none | 0 / 32 |
| 637eded203a669370000000000000051 | driver.queue.scheduler-dispatch | 0.252 | none | 0 / 32 |

Observed active steps while trace 637eded203a669370000000000000051 waited: []

| 637eded203a669370000000000000038 | driver.queue.scheduler-late | 0.232 | none | 0 / 32 |
| 637eded203a669370000000000000038 | driver.queue.scheduler-dispatch | 0.169 | none | 0 / 32 |

Observed active steps while trace 637eded203a669370000000000000038 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.236 | 0.140 | 0.000 | 0.483 | 5.057 | 0.462 | 0.000 | 0.134 | 2.465 | 4.176 | 0.040 | n/a | 0.779 | 9.949 | n/a | n/a | 0.088 | 5.419 | 0.173 | 0.088 |
| p99 | 54.940 | 2.998 | 0.000 | 2.176 | 19.398 | n/a | 0.000 | 0.973 | 4.641 | 10.639 | 0.144 | n/a | 0.951 | 34.740 | n/a | n/a | 0.454 | 19.993 | 0.441 | 0.454 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a669370000000000000038 | 54.940 | 7.429 | n/a | 0.000 | 0.401 | 1.026 | 10.639 | 0.040 | n/a | 0.212 | 34.740 | n/a | n/a | 0.454 | 7.830 | 0.143 | 0.454 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a66937000000000000003b | 45.299 | 19.398 | 0.462 | 0.000 | 0.134 | 4.641 | 9.551 | 0.144 | n/a | 0.951 | 9.949 | n/a | n/a | 0.070 | 19.993 | 0.441 | 0.070 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a66937000000000000003f | 31.236 | 5.057 | 0.238 | 0.000 | 0.124 | 4.450 | 4.176 | 0.092 | n/a | 0.779 | 16.233 | n/a | n/a | 0.088 | 5.419 | 0.173 | 0.088 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a66937000000000000003d | 20.102 | 3.475 | n/a | 0.000 | 0.973 | 2.465 | 2.786 | 0.021 | n/a | 0.896 | 9.191 | n/a | n/a | 0.294 | 4.448 | 0.221 | 0.294 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.131 | n/a | n/a | n/a | 7.726 | 0.819 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 11.116 | 0.997 | 0.020 |
| p99 | 118.108 | n/a | n/a | n/a | 99.135 | 7.952 | 8.922 | 0.000 | 1.998 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.119 | 110.471 | 0.999 | 22.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a669370000000000000039 | 118.108 | 99.135 | 2.413 | 8.922 | 0.000 | 1.998 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.640 | 110.471 | 0.935 | 5.640 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.882ms |
| 637eded203a66937000000000000005d | 70.593 | 45.816 | 0.495 | 2.476 | 0.000 | 0.694 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.112 | 48.787 | 0.691 | 21.112 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.355ms |
| 637eded203a669370000000000000060 | 39.145 | 16.225 | 0.311 | 0.000 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.119 | 16.536 | 0.422 | 22.119 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.847ms |
| 637eded203a669370000000000000048 | 15.502 | 7.518 | 7.952 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 15.470 | 0.998 | 0.031 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 1.330ms |
| 637eded203a669370000000000000065 | 12.611 | 12.490 | 0.108 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 12.598 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | driver.publication.persist-deferred 1.250ms |
| 637eded203a669370000000000000052 | 11.131 | 10.297 | 0.819 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 11.116 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | driver.publication.persist-deferred 1.626ms |
| 637eded203a669370000000000000069 | 7.831 | 7.726 | 0.089 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 7.815 | 0.998 | 0.016 | node-14/thread-2/replica.pull-at | driver.publication.persist-deferred 3.483ms |
| 637eded203a66937000000000000004b | 5.673 | 0.605 | 5.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 5.654 | 0.997 | 0.020 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 2.113ms |
| 637eded203a669370000000000000054 | 4.518 | 0.259 | 4.246 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 4.504 | 0.997 | 0.014 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 1.533ms |
| 637eded203a66937000000000000003e | 3.759 | 3.635 | 0.114 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 3.750 | 0.997 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.persist-deferred 1.532ms |
| 637eded203a669370000000000000042 | 2.292 | 0.191 | 2.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 2.270 | 0.991 | 0.021 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 1.838ms |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.102 | 0.897 | 0.000 | 0.718 | 3.475 | n/a | 0.000 | 0.973 | 2.465 | 2.786 | 0.021 | n/a | 0.896 | 9.191 | n/a | n/a | 0.294 | 4.448 | 0.221 | 0.294 |
| p99 | 20.102 | 0.897 | 0.000 | 0.718 | 3.475 | n/a | 0.000 | 0.973 | 2.465 | 2.786 | 0.021 | n/a | 0.896 | 9.191 | n/a | n/a | 0.294 | 4.448 | 0.221 | 0.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a66937000000000000003d | 20.102 | 3.475 | n/a | 0.000 | 0.973 | 2.465 | 2.786 | 0.021 | n/a | 0.896 | 9.191 | n/a | n/a | 0.294 | 4.448 | 0.221 | 0.294 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.203 | 0.400 | 0.000 | 0.854 | 5.111 | 0.291 | 0.000 | 0.072 | 2.192 | 6.928 | 0.080 | n/a | 0.465 | 14.016 | n/a | n/a | 0.075 | 5.474 | 0.177 | 0.075 |
| p99 | 36.618 | 1.424 | 0.000 | 1.167 | 5.228 | n/a | 0.000 | 1.063 | 2.622 | 9.958 | 0.084 | n/a | 5.587 | 15.849 | n/a | n/a | 0.118 | 5.525 | 0.185 | 0.118 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a669370000000000000046 | 36.618 | 5.111 | 0.291 | 0.000 | 0.072 | 2.622 | 6.928 | 0.084 | n/a | 5.587 | 15.849 | n/a | n/a | 0.075 | 5.474 | 0.149 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000043 | 31.203 | 5.228 | 0.233 | 0.000 | 0.063 | 2.192 | 9.958 | 0.080 | n/a | 0.465 | 12.932 | n/a | n/a | 0.052 | 5.525 | 0.177 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000041 | 20.862 | 2.797 | n/a | 0.000 | 1.063 | 0.941 | 1.732 | 0.033 | n/a | 0.162 | 14.016 | n/a | n/a | 0.118 | 3.860 | 0.185 | 0.118 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.862 | 1.424 | 0.000 | 1.167 | 2.797 | n/a | 0.000 | 1.063 | 0.941 | 1.732 | 0.033 | n/a | 0.162 | 14.016 | n/a | n/a | 0.118 | 3.860 | 0.185 | 0.118 |
| p99 | 20.862 | 1.424 | 0.000 | 1.167 | 2.797 | n/a | 0.000 | 1.063 | 0.941 | 1.732 | 0.033 | n/a | 0.162 | 14.016 | n/a | n/a | 0.118 | 3.860 | 0.185 | 0.118 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a669370000000000000041 | 20.862 | 2.797 | n/a | 0.000 | 1.063 | 0.941 | 1.732 | 0.033 | n/a | 0.162 | 14.016 | n/a | n/a | 0.118 | 3.860 | 0.185 | 0.118 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.107 | 0.486 | 0.000 | 0.457 | 4.906 | 0.215 | 0.000 | 0.104 | 1.309 | 2.079 | 0.062 | n/a | 0.193 | 27.158 | n/a | n/a | 0.058 | 5.090 | 0.136 | 0.058 |
| p99 | 51.449 | 3.385 | 0.000 | 1.994 | 6.687 | n/a | 0.000 | 0.492 | 6.077 | 11.811 | 0.084 | n/a | 0.552 | 31.357 | n/a | n/a | 0.447 | 6.997 | 0.141 | 0.447 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a66937000000000000004f | 51.449 | 6.687 | 0.215 | 0.000 | 0.096 | 3.322 | 9.249 | 0.067 | n/a | 0.407 | 31.357 | n/a | n/a | 0.050 | 6.997 | 0.136 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a66937000000000000004c | 47.183 | 6.370 | 0.158 | 0.000 | 0.104 | 6.077 | 11.811 | 0.084 | n/a | 0.552 | 21.969 | n/a | n/a | 0.058 | 6.632 | 0.141 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a66937000000000000004a | 37.107 | 4.906 | n/a | 0.000 | 0.184 | 1.309 | 1.822 | 0.022 | n/a | 0.123 | 28.643 | n/a | n/a | 0.098 | 5.090 | 0.137 | 0.098 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000047 | 35.802 | 4.266 | n/a | 0.000 | 0.492 | 1.106 | 2.079 | 0.062 | n/a | 0.193 | 27.158 | n/a | n/a | 0.447 | 4.758 | 0.133 | 0.447 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.802 | 1.001 | 0.000 | 1.477 | 4.266 | n/a | 0.000 | 0.492 | 1.106 | 2.079 | 0.062 | n/a | 0.193 | 27.158 | n/a | n/a | 0.447 | 4.758 | 0.133 | 0.447 |
| p99 | 35.802 | 1.001 | 0.000 | 1.477 | 4.266 | n/a | 0.000 | 0.492 | 1.106 | 2.079 | 0.062 | n/a | 0.193 | 27.158 | n/a | n/a | 0.447 | 4.758 | 0.133 | 0.447 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a669370000000000000047 | 35.802 | 4.266 | n/a | 0.000 | 0.492 | 1.106 | 2.079 | 0.062 | n/a | 0.193 | 27.158 | n/a | n/a | 0.447 | 4.758 | 0.133 | 0.447 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.260 | 0.000 | 0.000 | 0.715 | 7.443 | 0.406 | 0.000 | 0.316 | 2.606 | 4.734 | 0.073 | n/a | 0.608 | 20.820 | n/a | n/a | 0.065 | 8.107 | 0.138 | 0.065 |
| p99 | 58.930 | 1.993 | 0.000 | 1.773 | 10.126 | n/a | 0.461 | 0.987 | 3.492 | 8.547 | 0.124 | n/a | 1.069 | 40.707 | n/a | n/a | 0.127 | 10.608 | 0.323 | 0.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a669370000000000000051 | 58.930 | 7.443 | n/a | 0.000 | 0.664 | 2.941 | 5.883 | 0.122 | n/a | 1.069 | 40.707 | n/a | n/a | 0.103 | 8.107 | 0.138 | 0.103 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000055 | 42.376 | 10.126 | 0.406 | 0.000 | 0.075 | 3.492 | 3.760 | 0.055 | n/a | 0.608 | 23.812 | n/a | n/a | 0.042 | 10.608 | 0.250 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000053 | 31.260 | 2.722 | n/a | 0.000 | 0.987 | 0.885 | 4.734 | 0.124 | n/a | 0.924 | 20.820 | n/a | n/a | 0.065 | 3.709 | 0.119 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000058 | 28.215 | 7.970 | 0.374 | 0.461 | 0.316 | 2.606 | 8.547 | 0.073 | n/a | 0.201 | 7.539 | n/a | n/a | 0.127 | 9.121 | 0.323 | 0.127 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.776 | 0.000 | 0.000 | 0.648 | 4.515 | n/a | 0.000 | 0.128 | 1.199 | 11.436 | 0.039 | n/a | 1.319 | 23.592 | n/a | n/a | 0.057 | 4.647 | 0.103 | 0.057 |
| p99 | 221.917 | 1.697 | 0.000 | 1.219 | 7.756 | n/a | 0.366 | 0.792 | 4.414 | 30.492 | 0.100 | n/a | 5.001 | 181.692 | n/a | n/a | 0.101 | 8.413 | 0.139 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a66937000000000000005a | 221.917 | 5.201 | 0.285 | 0.302 | 0.077 | 3.617 | 30.492 | 0.063 | n/a | 0.146 | 181.692 | n/a | n/a | 0.041 | 5.865 | 0.026 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a66937000000000000005b | 175.651 | 2.023 | n/a | 0.000 | 0.128 | 1.133 | 1.953 | 0.034 | n/a | 3.584 | 166.739 | n/a | n/a | 0.057 | 2.151 | 0.012 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000062 | 62.398 | 7.756 | 0.212 | 0.366 | 0.079 | 4.414 | 21.456 | 0.100 | n/a | 2.133 | 25.840 | n/a | n/a | 0.042 | 8.413 | 0.135 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000066 | 52.776 | 4.819 | 0.258 | 0.299 | 0.078 | 1.821 | 21.076 | 0.075 | n/a | 5.001 | 19.295 | n/a | n/a | 0.053 | 5.455 | 0.103 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a66937000000000000005f | 38.078 | 3.240 | n/a | 0.000 | 0.792 | 1.199 | 11.436 | 0.039 | n/a | 1.319 | 19.987 | n/a | n/a | 0.067 | 4.032 | 0.106 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000064 | 33.431 | 4.515 | n/a | 0.000 | 0.132 | 1.069 | 3.528 | 0.025 | n/a | 0.506 | 23.592 | n/a | n/a | 0.065 | 4.647 | 0.139 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000068 | 29.328 | 2.471 | n/a | 0.000 | 0.277 | 1.137 | 2.054 | 0.022 | n/a | 0.483 | 22.783 | n/a | n/a | 0.101 | 2.748 | 0.094 | 0.101 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.078 | 1.002 | 0.000 | 0.764 | 2.471 | n/a | 0.000 | 0.277 | 1.137 | 2.054 | 0.034 | n/a | 1.319 | 22.783 | n/a | n/a | 0.067 | 2.748 | 0.094 | 0.067 |
| p99 | 175.651 | 1.697 | 0.000 | 0.824 | 3.240 | n/a | 0.000 | 0.792 | 1.199 | 11.436 | 0.039 | n/a | 3.584 | 166.739 | n/a | n/a | 0.101 | 4.032 | 0.106 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 637eded203a66937000000000000005b | 175.651 | 2.023 | n/a | 0.000 | 0.128 | 1.133 | 1.953 | 0.034 | n/a | 3.584 | 166.739 | n/a | n/a | 0.057 | 2.151 | 0.012 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a66937000000000000005f | 38.078 | 3.240 | n/a | 0.000 | 0.792 | 1.199 | 11.436 | 0.039 | n/a | 1.319 | 19.987 | n/a | n/a | 0.067 | 4.032 | 0.106 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 637eded203a669370000000000000068 | 29.328 | 2.471 | n/a | 0.000 | 0.277 | 1.137 | 2.054 | 0.022 | n/a | 0.483 | 22.783 | n/a | n/a | 0.101 | 2.748 | 0.094 | 0.101 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (207 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.031 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 307.330 | n/a | n/a | n/a | 60.176 | n/a | 6.883 | 307.241 | 6.781 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 122.216 | 307.325 | 1.000 | 122.216 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df05f7b019446fb0000000000000804 | 307.598 | 0.731 | n/a | 0.000 | 306.863 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 307.594 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000000808 | 307.337 | 0.037 | n/a | 0.000 | 307.296 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 307.333 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000000807 | 307.330 | 0.038 | n/a | 0.000 | 307.287 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 307.325 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000000806 | 307.318 | 0.071 | n/a | 0.000 | 307.241 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 307.312 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000000805 | 307.313 | 0.108 | n/a | 0.000 | 307.196 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 307.303 | 1.000 | 0.010 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000000818 | 306.685 | 0.063 | n/a | 0.000 | 306.617 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 306.680 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb6120000000000000c3b | 303.297 | 0.401 | n/a | 0.000 | 302.893 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 303.294 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb6120000000000000c3f | 303.157 | 0.017 | n/a | 0.000 | 303.139 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.156 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb6120000000000000c3e | 303.150 | 0.018 | n/a | 0.000 | 303.130 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.148 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb6120000000000000c3c | 303.145 | 0.044 | n/a | 0.000 | 303.097 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 303.141 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb6120000000000000c3d | 303.141 | 0.020 | n/a | 0.000 | 303.119 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.139 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 33d8c823783364d00000000000000ded | 303.103 | 0.511 | n/a | 0.000 | 302.588 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 303.099 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 33d8c823783364d00000000000000dee | 303.003 | 0.066 | n/a | 0.000 | 302.934 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 302.999 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 33d8c823783364d00000000000000e07 | 302.500 | 0.036 | n/a | 0.000 | 302.461 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.498 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 33d8c823783364d00000000000000e06 | 302.476 | 0.040 | n/a | 0.000 | 302.434 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.474 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 33d8c823783364d00000000000000e05 | 302.466 | 0.118 | n/a | 0.000 | 302.346 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.464 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb612000000000000a805 | 272.657 | 0.154 | n/a | 0.000 | 272.503 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.656 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb612000000000000a807 | 272.582 | 0.037 | n/a | 0.000 | 272.544 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.581 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb612000000000000a804 | 272.494 | 0.042 | n/a | 0.000 | 272.451 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.493 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb612000000000000a803 | 272.448 | 0.055 | n/a | 0.000 | 272.391 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.447 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 269.864 | n/a | n/a | n/a | 1.493 | n/a | 0.000 | 269.642 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.591 | 269.861 | 1.000 | 0.591 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0df05f7b019446fb00000000000205ba | 283.982 | 0.236 | n/a | 0.000 | 283.743 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.979 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000014c97 | 269.864 | 0.219 | n/a | 0.000 | 269.642 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 269.861 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb000000000000d3f6 | 5.123 | 2.729 | n/a | 0.000 | 0.000 | 0.375 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.020 | 2.729 | 0.533 | 2.020 | node-14/thread-4/reader.execute | none observed |
| 0df05f7b019446fb000000000000d68d | 1.503 | 1.493 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 1.493 | 0.993 | 0.010 | node-14/thread-4/reader.execute | none observed |
| 0df05f7b019446fb0000000000019a84 | 1.201 | 1.198 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.198 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 0df05f7b019446fb000000000001bede | 0.948 | 0.942 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.942 | 0.994 | 0.006 | node-14/thread-4/reader.execute | none observed |
| 0df05f7b019446fb000000000001ba40 | 0.908 | 0.906 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.906 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 0df05f7b019446fb000000000001be62 | 0.826 | 0.817 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.817 | 0.990 | 0.009 | node-14/thread-4/replica.pull-at | none observed |
| 0df05f7b019446fb000000000001c19c | 0.642 | 0.639 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.639 | 0.995 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 0df05f7b019446fb000000000001be57 | 0.591 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.591 | 0.000 | 0.000 | 0.591 | uncovered | none observed |
| 0df05f7b019446fb000000000001beba | 0.490 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.490 | 0.000 | 0.000 | 0.490 | uncovered | none observed |
| 0df05f7b019446fb000000000001d982 | 0.477 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.477 | 0.000 | 0.000 | 0.477 | uncovered | none observed |
| 0df05f7b019446fb000000000001beb2 | 0.473 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.473 | 0.000 | 0.000 | 0.473 | uncovered | none observed |
| 0df05f7b019446fb000000000001be58 | 0.470 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.470 | 0.000 | 0.000 | 0.470 | uncovered | none observed |
| 0df05f7b019446fb0000000000016a99 | 0.464 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.464 | 0.000 | 0.000 | 0.464 | uncovered | none observed |
| 0df05f7b019446fb000000000001c917 | 0.425 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.425 | 0.000 | 0.000 | 0.425 | uncovered | none observed |
| 0df05f7b019446fb0000000000016760 | 0.416 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 | uncovered | none observed |
| 0df05f7b019446fb000000000001d972 | 0.392 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.392 | 0.000 | 0.000 | 0.392 | uncovered | none observed |
| 0df05f7b019446fb000000000001c63b | 0.382 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 | uncovered | none observed |
| 0df05f7b019446fb000000000000d793 | 0.357 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.357 | 0.000 | 0.000 | 0.357 | uncovered | none observed |

## P1 / L4 / read (260 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 307.675 | n/a | n/a | n/a | 4.285 | n/a | 0.000 | 307.503 | 0.410 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.838 | 307.672 | 1.000 | 2.838 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 33d8c823783364d0000000000001b60f | 307.771 | 0.264 | n/a | 0.000 | 307.504 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 307.768 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.151ms |
| 0df05f7b019446fb0000000000034aa6 | 307.692 | 0.056 | n/a | 0.000 | 307.634 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.690 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| eadf3d8f98dbb612000000000001c820 | 307.675 | 0.169 | n/a | 0.000 | 307.503 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.672 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 0df05f7b019446fb0000000000034aa5 | 307.670 | 0.164 | n/a | 0.000 | 307.503 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 307.667 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| eadf3d8f98dbb612000000000000d0e6 | 267.050 | 0.129 | n/a | 0.000 | 266.908 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 267.038 | 1.000 | 0.012 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000020613 | 264.893 | 0.122 | n/a | 0.000 | 264.768 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.890 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 0df05f7b019446fb0000000000020614 | 264.826 | 0.038 | n/a | 0.000 | 264.787 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.825 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 33d8c823783364d0000000000000c26c | 253.627 | 0.123 | n/a | 0.000 | 253.501 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 253.623 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb612000000000000d0a2 | 40.615 | 0.124 | n/a | 0.000 | 40.487 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 40.612 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 33d8c823783364d0000000000000c25f | 39.510 | 25.375 | n/a | 1.241 | 0.000 | 0.527 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.366 | 26.616 | 0.674 | 12.366 | node-14/thread-6/reader.execute | replica.apply-delta 0.040ms |
| 0df05f7b019446fb00000000000205bd | 38.328 | 0.091 | n/a | 0.000 | 38.235 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 38.326 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 33d8c823783364d0000000000000c256 | 38.209 | 0.364 | n/a | 0.000 | 37.836 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 38.199 | 1.000 | 0.010 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb00000000000205d0 | 31.789 | 23.252 | n/a | 4.542 | 0.000 | 1.157 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.838 | 27.794 | 0.874 | 2.838 | node-14/thread-4/reader.execute | replica.apply-delta 0.031ms |
| eadf3d8f98dbb612000000000000d0dc | 19.373 | 2.776 | n/a | 0.000 | 0.000 | 0.410 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.187 | 2.776 | 0.143 | 16.187 | node-14/thread-5/socket.wait-first-byte | replica.apply-delta 0.039ms |
| eadf3d8f98dbb612000000000001c416 | 4.289 | 4.285 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 4.285 | 0.999 | 0.004 | node-14/thread-5/replica.pull-at | none observed |
| 0df05f7b019446fb00000000000206af | 3.594 | 3.593 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.593 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 33d8c823783364d00000000000011e8f | 3.288 | 3.287 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.287 | 1.000 | 0.001 | node-14/thread-6/replica.pull-at | none observed |
| 0df05f7b019446fb0000000000034365 | 3.265 | 3.262 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.262 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 33d8c823783364d0000000000001af40 | 3.264 | 3.259 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.259 | 0.999 | 0.005 | node-14/thread-6/replica.pull-at | none observed |
| 33d8c823783364d0000000000000ccd3 | 2.955 | 2.954 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.954 | 1.000 | 0.001 | node-14/thread-6/replica.pull-at | none observed |

## P1 / L16 / read (276 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 281.188 | n/a | n/a | n/a | 15.256 | n/a | 0.000 | 281.116 | 0.534 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.649 | 281.185 | 1.000 | 5.649 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eadf3d8f98dbb612000000000001d6ff | 282.290 | 0.140 | n/a | 0.000 | 282.147 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 282.287 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb612000000000001d700 | 282.266 | 0.050 | n/a | 0.000 | 282.214 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.263 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb612000000000001d726 | 281.188 | 0.069 | n/a | 0.000 | 281.116 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.185 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb612000000000001d727 | 281.132 | 0.026 | n/a | 0.000 | 281.104 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.130 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eadf3d8f98dbb612000000000001d728 | 281.119 | 0.017 | n/a | 0.000 | 281.101 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.118 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000035c23 | 280.512 | 0.114 | n/a | 0.000 | 280.396 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.510 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 33d8c823783364d0000000000001c7d8 | 280.367 | 0.026 | n/a | 0.000 | 280.339 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.365 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 33d8c823783364d0000000000001c7d9 | 280.365 | 0.018 | n/a | 0.000 | 280.345 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.364 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 33d8c823783364d0000000000001c7d7 | 280.360 | 0.113 | n/a | 0.000 | 280.243 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.357 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 33d8c823783364d0000000000001c7da | 280.358 | 0.038 | n/a | 0.000 | 280.318 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.356 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000035c6e | 279.694 | 0.013 | n/a | 0.000 | 279.680 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.693 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000035c6d | 279.684 | 0.021 | n/a | 0.000 | 279.662 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.683 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000035c6b | 279.682 | 0.042 | n/a | 0.000 | 279.638 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.680 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000035c6a | 279.681 | 0.039 | n/a | 0.000 | 279.641 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.680 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000035c6c | 279.675 | 0.020 | n/a | 0.000 | 279.653 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.673 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 33d8c823783364d0000000000001c7dd | 278.734 | 0.042 | n/a | 0.000 | 278.685 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 278.727 | 1.000 | 0.007 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 0df05f7b019446fb0000000000034acc | 249.101 | 0.177 | n/a | 0.000 | 248.921 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 249.098 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 0df05f7b019446fb0000000000034aca | 249.001 | 0.365 | n/a | 0.000 | 248.635 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 249.001 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 0df05f7b019446fb0000000000034acb | 248.950 | 0.096 | n/a | 0.000 | 248.853 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 248.949 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 33d8c823783364d0000000000001b627 | 248.897 | 0.068 | n/a | 0.000 | 248.826 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 248.895 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.151ms |

## P1 / tail / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 0.000 | 0.000 | 0.025 |
| p99 | 0.298 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.298 | 0.000 | 0.000 | 0.298 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eadf3d8f98dbb612000000000002db0f | 0.298 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.298 | 0.000 | 0.000 | 0.298 | uncovered | none observed |
| eadf3d8f98dbb612000000000002db11 | 0.136 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | uncovered | none observed |
| eadf3d8f98dbb612000000000002db12 | 0.063 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.063 | 0.000 | 0.000 | 0.063 | uncovered | none observed |
| 0df05f7b019446fb0000000000046508 | 0.048 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.048 | 0.000 | 0.000 | 0.048 | uncovered | none observed |
| 33d8c823783364d0000000000002cca9 | 0.026 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 0.000 | 0.000 | 0.026 | uncovered | none observed |
| eadf3d8f98dbb612000000000002db10 | 0.025 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 0.000 | 0.000 | 0.025 | uncovered | none observed |
| eadf3d8f98dbb612000000000002db13 | 0.019 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.000 | 0.000 | 0.019 | uncovered | none observed |
| 33d8c823783364d0000000000002ccac | 0.016 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 | uncovered | none observed |
| 33d8c823783364d0000000000002ccab | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 | uncovered | none observed |
| 33d8c823783364d0000000000002ccaa | 0.008 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 | uncovered | none observed |

## P3 / outside-phases / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 201.229 | 0.018 | n/a | 0.158 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 |
| p99 | 208.620 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.513 | 207.337 | 0.044 | n/a | 0.190 | 0.000 | n/a | n/a | 52.040 | 0.000 | 0.000 | 52.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b232303bbc4481800000000000000007 | 208.620 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 207.337 | 0.042 | n/a | 0.190 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-44/journal/page | none observed |
| b232303bbc448180000000000000002f | 205.574 | 0.000 | n/a | 0.000 | 0.000 | 3.513 | 201.771 | 0.021 | n/a | 0.167 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-69/journal/page | none observed |
| b232303bbc448180000000000000002e | 203.064 | 0.000 | n/a | 0.000 | 0.000 | 1.406 | 201.229 | 0.018 | n/a | 0.158 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-59/journal/page | none observed |
| b232303bbc4481800000000000000005 | 203.014 | 0.000 | n/a | 0.000 | 0.000 | 1.860 | 200.856 | 0.011 | n/a | 0.102 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-45/journal/page | none observed |
| b232303bbc4481800000000000000006 | 202.724 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 201.335 | 0.044 | n/a | 0.186 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-46/journal/page | none observed |
| b232303bbc448180000000000000002d | 201.876 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 201.059 | 0.016 | n/a | 0.118 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 4d060ed36b7665510000000000000002 | 52.777 | 0.000 | n/a | 0.000 | 0.000 | 0.737 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.040 | 0.000 | 0.000 | 52.040 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1005.846 | n/a | n/a | n/a | 0.194 | n/a | 0.000 | 0.000 | 1.840 | 1001.828 | 0.013 | n/a | 0.130 | 0.000 | n/a | n/a | 1.139 | 0.194 | 0.000 | 1.139 |
| p99 | 1006.988 | n/a | n/a | n/a | 0.239 | n/a | 0.000 | 0.000 | 3.517 | 1002.171 | 0.415 | n/a | 0.338 | 0.000 | n/a | n/a | 1.231 | 0.239 | 0.000 | 1.231 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d060ed36b7665510000000000000018 | 1006.988 | 0.131 | n/a | 0.000 | 0.000 | 3.517 | 1002.171 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 1.100 | 0.131 | 0.000 | 1.100 | gw-r/thread-48/journal/page | none observed |
| 4d060ed36b7665510000000000000017 | 1005.846 | 0.194 | n/a | 0.000 | 0.000 | 1.840 | 1001.828 | 0.415 | n/a | 0.338 | 0.000 | n/a | n/a | 1.231 | 0.194 | 0.000 | 1.231 | gw-r/thread-48/journal/page | none observed |
| 4d060ed36b7665510000000000000019 | 1003.602 | 0.239 | n/a | 0.000 | 0.000 | 1.185 | 1000.897 | 0.013 | n/a | 0.130 | 0.000 | n/a | n/a | 1.139 | 0.239 | 0.000 | 1.139 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 206.567 | n/a | n/a | n/a | 2.922 | n/a | 0.000 | 0.000 | 3.354 | 190.636 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.123 | 2.922 | 0.008 | 0.123 |
| p99 | 787.655 | n/a | n/a | n/a | 31.488 | n/a | 1.991 | 0.000 | 6.938 | 778.542 | 0.023 | n/a | 0.133 | 0.000 | n/a | n/a | 0.917 | 33.479 | 0.352 | 0.917 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d060ed36b766551000000000000001d | 787.655 | 2.087 | n/a | 0.000 | 0.000 | 6.718 | 778.542 | 0.023 | n/a | 0.133 | 0.000 | n/a | n/a | 0.153 | 2.087 | 0.003 | 0.153 | gw-r/thread-42/journal/page | none observed |
| 4d060ed36b766551000000000000001c | 382.758 | 2.922 | n/a | 0.000 | 0.000 | 6.938 | 372.663 | 0.015 | n/a | 0.096 | 0.000 | n/a | n/a | 0.123 | 2.922 | 0.008 | 0.123 | gw-r/thread-61/journal/page | none observed |
| 4d060ed36b766551000000000000001f | 206.567 | 12.352 | n/a | 0.000 | 0.000 | 3.354 | 190.636 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.108 | 12.352 | 0.060 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 4d060ed36b766551000000000000001a | 95.211 | 31.488 | n/a | 1.991 | 0.000 | 1.455 | 59.277 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.917 | 33.479 | 0.352 | 0.917 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 803.407 | n/a | n/a | n/a | 3.083 | n/a | 0.000 | 0.000 | 1.117 | 799.274 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.224 | 3.083 | 0.008 | 0.224 |
| p99 | 1014.380 | n/a | n/a | n/a | 7.921 | n/a | 0.000 | 0.000 | 2.259 | 1003.721 | 0.011 | n/a | 0.130 | 0.000 | n/a | n/a | 0.337 | 7.921 | 0.017 | 0.337 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d060ed36b7665510000000000000023 | 1014.380 | 7.921 | n/a | 0.000 | 0.000 | 2.259 | 1003.721 | 0.011 | n/a | 0.130 | 0.000 | n/a | n/a | 0.337 | 7.921 | 0.008 | 0.337 | gw-r/thread-61/journal/page | none observed |
| 4d060ed36b7665510000000000000020 | 803.407 | 2.847 | n/a | 0.000 | 0.000 | 0.978 | 799.274 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.224 | 2.847 | 0.004 | 0.224 | gw-r/thread-62/journal/page | none observed |
| 4d060ed36b7665510000000000000021 | 184.811 | 3.083 | n/a | 0.000 | 0.000 | 1.117 | 180.408 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.100 | 3.083 | 0.017 | 0.100 | gw-r/thread-61/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 288.376 | n/a | n/a | n/a | 3.965 | n/a | 0.000 | 0.000 | 1.677 | 276.252 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.144 | 3.965 | 0.006 | 0.144 |
| p99 | 1000.626 | n/a | n/a | n/a | 5.707 | n/a | 0.000 | 0.000 | 6.451 | 989.193 | 0.021 | n/a | 0.185 | 0.000 | n/a | n/a | 10.557 | 5.707 | 0.152 | 10.557 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d060ed36b7665510000000000000029 | 1000.626 | 5.707 | n/a | 0.000 | 0.000 | 5.488 | 989.193 | 0.017 | n/a | 0.110 | 0.000 | n/a | n/a | 0.111 | 5.707 | 0.006 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 4d060ed36b7665510000000000000027 | 698.796 | 3.965 | n/a | 0.000 | 0.000 | 1.677 | 692.804 | 0.021 | n/a | 0.185 | 0.000 | n/a | n/a | 0.144 | 3.965 | 0.006 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 4d060ed36b7665510000000000000026 | 288.376 | 5.346 | n/a | 0.000 | 0.000 | 6.451 | 276.252 | 0.011 | n/a | 0.111 | 0.000 | n/a | n/a | 0.205 | 5.346 | 0.019 | 0.205 | gw-r/thread-46/journal/page | none observed |
| 4d060ed36b7665510000000000000024 | 13.178 | 2.005 | n/a | 0.000 | 0.000 | 0.616 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.557 | 2.005 | 0.152 | 10.557 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 371.970 | n/a | n/a | n/a | 3.663 | n/a | 0.000 | 0.000 | 1.303 | 361.127 | 0.021 | n/a | 0.168 | 0.000 | n/a | n/a | 0.108 | 3.663 | 0.009 | 0.108 |
| p99 | 990.308 | n/a | n/a | n/a | 8.822 | n/a | 0.000 | 0.000 | 2.393 | 984.678 | 0.093 | n/a | 0.486 | 0.000 | n/a | n/a | 0.142 | 8.822 | 0.040 | 0.142 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d060ed36b766551000000000000002f | 990.308 | 3.563 | n/a | 0.000 | 0.000 | 1.401 | 984.678 | 0.093 | n/a | 0.486 | 0.000 | n/a | n/a | 0.087 | 3.563 | 0.004 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 4d060ed36b766551000000000000002c | 408.862 | 3.663 | n/a | 0.000 | 0.000 | 1.303 | 403.609 | 0.021 | n/a | 0.159 | 0.000 | n/a | n/a | 0.108 | 3.663 | 0.009 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 4d060ed36b766551000000000000002d | 371.970 | 8.098 | n/a | 0.000 | 0.000 | 2.393 | 361.127 | 0.071 | n/a | 0.168 | 0.000 | n/a | n/a | 0.113 | 8.098 | 0.022 | 0.113 | gw-r/thread-64/journal/page | none observed |
| 4d060ed36b766551000000000000002a | 220.014 | 8.822 | n/a | 0.000 | 0.000 | 1.102 | 209.713 | 0.019 | n/a | 0.216 | 0.000 | n/a | n/a | 0.142 | 8.822 | 0.040 | 0.142 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 391.254 | n/a | n/a | n/a | 2.697 | n/a | 0.000 | 0.000 | 0.893 | 388.529 | 0.020 | n/a | 0.120 | 0.000 | n/a | n/a | 0.160 | 2.697 | 0.008 | 0.160 |
| p99 | 1034.461 | n/a | n/a | n/a | 6.066 | n/a | 0.000 | 0.000 | 2.163 | 1031.095 | 0.116 | n/a | 0.247 | 0.000 | n/a | n/a | 1.129 | 6.066 | 0.050 | 1.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4d060ed36b7665510000000000000030 | 1034.461 | 0.155 | n/a | 0.000 | 0.000 | 1.719 | 1031.095 | 0.116 | n/a | 0.247 | 0.000 | n/a | n/a | 1.129 | 0.155 | 0.000 | 1.129 | gw-r/thread-48/journal/page | none observed |
| 4d060ed36b766551000000000000003c | 1004.330 | 0.141 | n/a | 0.000 | 0.000 | 2.163 | 1000.870 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 1.103 | 0.141 | 0.000 | 1.103 | gw-r/thread-64/journal/page | none observed |
| 4d060ed36b7665510000000000000037 | 723.502 | 6.066 | n/a | 0.000 | 0.000 | 0.889 | 716.254 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.183 | 6.066 | 0.008 | 0.183 | gw-r/thread-44/journal/page | none observed |
| 4d060ed36b7665510000000000000036 | 624.164 | 4.484 | n/a | 0.000 | 0.000 | 0.550 | 618.824 | 0.022 | n/a | 0.125 | 0.000 | n/a | n/a | 0.160 | 4.484 | 0.007 | 0.160 | gw-r/thread-48/journal/page | none observed |
| 4d060ed36b766551000000000000003a | 391.254 | 1.950 | n/a | 0.000 | 0.000 | 0.570 | 388.529 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.101 | 1.950 | 0.005 | 0.101 | gw-r/thread-42/journal/page | none observed |
| 4d060ed36b7665510000000000000039 | 264.963 | 2.697 | n/a | 0.000 | 0.000 | 0.893 | 261.134 | 0.031 | n/a | 0.120 | 0.000 | n/a | n/a | 0.088 | 2.697 | 0.010 | 0.088 | gw-r/thread-59/journal/page | none observed |
| 4d060ed36b7665510000000000000031 | 176.396 | 3.540 | n/a | 0.000 | 0.000 | 0.747 | 171.851 | 0.020 | n/a | 0.098 | 0.000 | n/a | n/a | 0.142 | 3.540 | 0.020 | 0.142 | gw-r/thread-62/journal/page | none observed |
| 4d060ed36b7665510000000000000034 | 108.303 | 1.988 | n/a | 0.000 | 0.000 | 1.729 | 104.349 | 0.027 | n/a | 0.132 | 0.000 | n/a | n/a | 0.078 | 1.988 | 0.018 | 0.078 | gw-r/thread-59/journal/page | none observed |
| 4d060ed36b7665510000000000000032 | 88.697 | 4.397 | n/a | 0.000 | 0.000 | 0.940 | 83.016 | 0.014 | n/a | 0.157 | 0.000 | n/a | n/a | 0.173 | 4.397 | 0.050 | 0.173 | gw-r/thread-64/journal/page | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.348 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.347 | 200.963 | 0.015 | n/a | 0.126 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 206.034 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.216 | 202.999 | 5.717 | n/a | 0.168 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b232303bbc4481800000000000000008 | 206.034 | 0.000 | n/a | 0.000 | 0.000 | 4.216 | 201.508 | 0.010 | n/a | 0.112 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-46/journal/page | none observed |
| b232303bbc4481800000000000000009 | 204.931 | 0.000 | n/a | 0.000 | 0.000 | 1.379 | 202.999 | 0.011 | n/a | 0.124 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | gw-r/thread-44/journal/page | none observed |
| b232303bbc448180000000000000000f | 203.121 | 0.000 | n/a | 0.000 | 0.000 | 1.347 | 201.489 | 0.015 | n/a | 0.159 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-63/journal/page | none observed |
| b232303bbc448180000000000000000e | 202.580 | 0.000 | n/a | 0.000 | 0.000 | 1.145 | 201.149 | 0.017 | n/a | 0.168 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-64/journal/page | none observed |
| b232303bbc448180000000000000000d | 202.348 | 0.000 | n/a | 0.000 | 0.000 | 1.090 | 200.963 | 0.013 | n/a | 0.158 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |
| b232303bbc448180000000000000000b | 201.982 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 200.945 | 0.013 | n/a | 0.149 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-65/journal/page | none observed |
| b232303bbc4481800000000000000011 | 193.828 | 0.000 | n/a | 0.000 | 0.000 | 0.458 | 193.121 | 0.020 | n/a | 0.126 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-42/journal/page | none observed |
| b232303bbc448180000000000000000c | 132.916 | 0.000 | n/a | 0.000 | 0.000 | 2.100 | 130.401 | 0.118 | n/a | 0.091 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-47/journal/page | none observed |
| b232303bbc4481800000000000000010 | 103.721 | 0.000 | n/a | 0.000 | 0.000 | 1.409 | 96.398 | 5.717 | n/a | 0.097 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.052 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.346 | 201.349 | 0.011 | n/a | 0.153 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |
| p99 | 206.092 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.164 | 201.750 | 0.020 | n/a | 0.241 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b232303bbc4481800000000000000014 | 206.092 | 0.000 | n/a | 0.000 | 0.000 | 4.164 | 201.520 | 0.020 | n/a | 0.241 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-65/journal/page | none observed |
| b232303bbc4481800000000000000013 | 203.486 | 0.000 | n/a | 0.000 | 0.000 | 1.430 | 201.750 | 0.011 | n/a | 0.153 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-60/journal/page | none observed |
| b232303bbc4481800000000000000012 | 203.052 | 0.000 | n/a | 0.000 | 0.000 | 1.346 | 201.349 | 0.014 | n/a | 0.164 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-59/journal/page | none observed |
| b232303bbc4481800000000000000015 | 131.501 | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 130.760 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.695 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 201.068 | 0.028 | n/a | 0.142 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 206.853 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.678 | 202.380 | 16.119 | n/a | 3.792 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b232303bbc4481800000000000000020 | 206.853 | 0.000 | n/a | 0.000 | 0.000 | 4.678 | 201.841 | 0.043 | n/a | 0.188 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| b232303bbc4481800000000000000027 | 205.257 | 0.000 | n/a | 0.000 | 0.000 | 1.553 | 202.380 | 0.948 | n/a | 0.282 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| b232303bbc448180000000000000002c | 204.091 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 199.358 | 0.021 | n/a | 3.792 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-62/journal/page | none observed |
| b232303bbc4481800000000000000023 | 204.051 | 0.000 | n/a | 0.000 | 0.000 | 2.070 | 201.667 | 0.021 | n/a | 0.140 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-64/journal/page | none observed |
| b232303bbc4481800000000000000021 | 204.027 | 0.000 | n/a | 0.000 | 0.000 | 1.468 | 202.154 | 0.014 | n/a | 0.178 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-63/journal/page | none observed |
| b232303bbc4481800000000000000025 | 203.354 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 202.343 | 0.028 | n/a | 0.174 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-65/journal/page | none observed |
| b232303bbc4481800000000000000029 | 202.695 | 0.000 | n/a | 0.000 | 0.000 | 1.087 | 201.299 | 0.012 | n/a | 0.114 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-63/journal/page | none observed |
| b232303bbc4481800000000000000024 | 202.385 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 201.065 | 0.041 | n/a | 0.175 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-46/journal/page | none observed |
| b232303bbc448180000000000000002b | 202.095 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 201.068 | 0.013 | n/a | 0.142 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| b232303bbc4481800000000000000022 | 166.784 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 158.370 | 7.470 | n/a | 0.072 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-62/journal/page | none observed |
| b232303bbc448180000000000000002a | 163.998 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 160.422 | 2.592 | n/a | 0.058 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-60/journal/page | none observed |
| b232303bbc448180000000000000001f | 83.575 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 66.377 | 16.119 | n/a | 0.083 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

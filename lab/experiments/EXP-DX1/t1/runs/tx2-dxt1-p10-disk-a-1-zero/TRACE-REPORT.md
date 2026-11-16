# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (91.039 ms, trace `28a43e4149888733000000000000013e`); `node-14/thread-0/driver.queue.subject` (107.109 ms, trace `28a43e414988873300000000000011bc`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (48.731 ms, trace `28a43e414988873300000000000011ba`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (66.145 ms, trace `28a43e414988873300000000000011bd`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (72.849 ms, trace `28a43e41498887330000000000001e87`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-disk-a-1-zero`; source `0d95e5721572bbafaa54630aa6265d188d8e3d26`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4258/4259 (99.977%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 10672216.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 288 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13394.362 | 530.531 | 5.104 | 454 |
| L1 | 0 | 44967.286 | 809.416 | 26.273 | 1476 |
| L4 | 0 | 44971.204 | 847.241 | 22.675 | 1762 |
| L16 | 0 | 44975.869 | 8538.018 | 73.037 | 34266 |
| L64 | 0 | 44580.927 | 8733.553 | 65.654 | 35833 |
| L256 | 0 | 44777.666 | 934.643 | 18.972 | 1560 |
| L1024 | 0 | 44016.846 | 1100.833 | 17.475 | 1598 |
| tail | 0 | 164353.205 | 4001.198 | 94.642 | 6125 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 28a43e4149888733000000000000013e | driver.queue.scheduler-dispatch | 0.047 | none | 0 / 32 |
| 28a43e4149888733000000000000013e | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 28a43e4149888733000000000000013e waited: []

| 28a43e414988873300000000000011bc | driver.queue.subject | 107.109 | 28a43e414988873300000000000011ba | 4 / 32 |
| 28a43e414988873300000000000011bc | driver.queue.scheduler-late | 0.603 | none | 4 / 32 |
| 28a43e414988873300000000000011bc | driver.queue.scheduler-dispatch | 0.117 | none | 0 / 32 |

Observed active steps while trace 28a43e414988873300000000000011bc waited: [{"at":1794792570064.4358,"inFlight":4,"capacity":32,"active":[{"traceId":"28a43e414988873300000000000011b9","step":"client.http"},{"traceId":"28a43e414988873300000000000011ba","step":"client.http"},{"traceId":"28a43e414988873300000000000011bb","step":"client.http"},{"traceId":"28a43e414988873300000000000011bd","step":"client.http"}]},{"at":1794792570085.966,"inFlight":5,"capacity":32,"active":[{"traceId":"28a43e414988873300000000000011ba","step":"client.http"},{"traceId":"28a43e414988873300000000000011bb","step":"client.http"},{"traceId":"28a43e414988873300000000000011bd","step":"client.http"},{"traceId":"28a43e414988873300000000000011bf","step":"client.http"},{"traceId":"28a43e414988873300000000000011c0","step":"client.http"}]},{"at":1794792570105.9707,"inFlight":5,"capacity":32,"active":[{"traceId":"28a43e414988873300000000000011ba","step":"client.http"},{"traceId":"28a43e414988873300000000000011bd","step":"client.http"},{"traceId":"28a43e414988873300000000000011bf","step":"client.http"},{"traceId":"28a43e414988873300000000000011c0","step":"client.http"},{"traceId":"28a43e414988873300000000000011c2","step":"client.http"}]},{"at":1794792570131.934,"inFlight":2,"capacity":32,"active":[{"traceId":"28a43e414988873300000000000011ba","step":"triplex.transact"},{"traceId":"28a43e414988873300000000000011c3","step":"client.http"}]}]

| 28a43e414988873300000000000011ba | driver.queue.scheduler-dispatch | 0.030 | none | 2 / 32 |
| 28a43e414988873300000000000011ba | driver.queue.scheduler-late | 0.003 | none | 2 / 32 |

Observed active steps while trace 28a43e414988873300000000000011ba waited: []

| 28a43e414988873300000000000011bd | driver.queue.scheduler-late | 0.851 | none | 4 / 32 |
| 28a43e414988873300000000000011bd | driver.queue.scheduler-dispatch | 0.042 | none | 4 / 32 |

Observed active steps while trace 28a43e414988873300000000000011bd waited: []

| 28a43e41498887330000000000001e87 | driver.queue.scheduler-dispatch | 0.137 | none | 0 / 32 |
| 28a43e41498887330000000000001e87 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 28a43e41498887330000000000001e87 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.843 | 0.604 | 0.000 | 0.618 | 4.666 | 0.448 | 0.000 | 0.089 | 1.551 | 6.506 | 0.033 | n/a | 0.425 | 15.827 | n/a | n/a | 0.030 | 5.373 | 0.177 | 0.030 |
| p99 | 79.020 | 5.930 | 0.000 | 5.999 | 17.869 | n/a | 4.712 | 2.541 | 4.015 | 21.090 | 0.313 | n/a | 3.707 | 35.494 | n/a | n/a | 0.322 | 23.101 | 0.374 | 0.322 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e414988873300000000000000f4 | 79.020 | 17.869 | 0.448 | 4.712 | 0.071 | 3.617 | 16.443 | 0.313 | n/a | 3.707 | 31.806 | n/a | n/a | 0.033 | 23.101 | 0.292 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.008ms |
| 28a43e414988873300000000000000f1 | 55.110 | 11.146 | n/a | 0.000 | 0.576 | 0.917 | 6.506 | 0.028 | n/a | 0.122 | 35.494 | n/a | n/a | 0.322 | 11.722 | 0.213 | 0.322 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000000fe | 50.413 | 7.917 | 0.329 | 0.000 | 0.069 | 4.015 | 15.599 | 0.035 | n/a | 0.357 | 22.060 | n/a | n/a | 0.031 | 8.315 | 0.165 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 28a43e41498887330000000000000110 | 49.093 | 5.797 | 0.316 | 0.000 | 0.095 | 2.250 | 20.818 | 0.031 | n/a | 1.967 | 17.791 | n/a | n/a | 0.030 | 6.208 | 0.126 | 0.030 | gw-w/thread-42/gateway.admitted-work | driver.reader-basis.broadcast 0.026ms |
| 28a43e41498887330000000000000126 | 45.265 | 6.023 | 0.183 | 0.259 | 0.062 | 3.140 | 12.882 | 0.043 | n/a | 0.545 | 22.104 | n/a | n/a | 0.024 | 6.527 | 0.144 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.045ms; driver.reader-basis.broadcast 0.029ms; driver.publication.persist-deferred 0.020ms |
| 28a43e4149888733000000000000010c | 42.439 | 5.032 | 0.277 | 0.000 | 0.057 | 1.590 | 21.090 | 0.034 | n/a | 0.103 | 14.236 | n/a | n/a | 0.019 | 5.367 | 0.126 | 0.019 | gw-w/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.024ms |
| 28a43e41498887330000000000000106 | 39.750 | 6.669 | 0.278 | 0.000 | 0.089 | 1.551 | 7.724 | 0.034 | n/a | 0.093 | 23.284 | n/a | n/a | 0.027 | 7.036 | 0.177 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 28a43e41498887330000000000000116 | 37.806 | 7.530 | 0.426 | 0.000 | 0.082 | 3.278 | 12.625 | 0.056 | n/a | 0.441 | 13.345 | n/a | n/a | 0.023 | 8.038 | 0.213 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 28a43e41498887330000000000000104 | 37.781 | 4.693 | 0.316 | 0.000 | 0.247 | 1.326 | 10.967 | 0.031 | n/a | 2.745 | 17.364 | n/a | n/a | 0.092 | 5.256 | 0.139 | 0.092 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 28a43e41498887330000000000000118 | 36.873 | 4.922 | n/a | 2.106 | 0.595 | 0.783 | 1.605 | 0.020 | n/a | 0.584 | 26.239 | n/a | n/a | 0.019 | 7.623 | 0.207 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000011e | 34.500 | 4.324 | 0.216 | 0.000 | 0.086 | 2.481 | 11.210 | 0.044 | n/a | 0.235 | 15.871 | n/a | n/a | 0.032 | 4.626 | 0.134 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 28a43e4149888733000000000000011f | 34.018 | 3.612 | n/a | 0.000 | 0.085 | 1.335 | 1.864 | 0.033 | n/a | 3.156 | 23.900 | n/a | n/a | 0.034 | 3.697 | 0.109 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000011a | 32.736 | 4.629 | 0.281 | 0.385 | 0.077 | 1.698 | 9.112 | 0.047 | n/a | 0.132 | 16.350 | n/a | n/a | 0.024 | 5.373 | 0.164 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 28a43e41498887330000000000000122 | 32.386 | 3.784 | 0.187 | 0.000 | 0.089 | 2.004 | 7.281 | 0.030 | n/a | 0.122 | 18.863 | n/a | n/a | 0.025 | 4.060 | 0.125 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 28a43e414988873300000000000000fc | 31.843 | 4.904 | 0.326 | 0.000 | 0.110 | 1.828 | 13.127 | 0.028 | n/a | 0.113 | 11.369 | n/a | n/a | 0.037 | 5.340 | 0.168 | 0.037 | gw-w/thread-43/gateway.admitted-work | driver.reader-basis.broadcast 0.017ms |
| 28a43e414988873300000000000000f8 | 30.417 | 7.238 | 0.256 | 0.000 | 0.103 | 2.142 | 10.743 | 0.040 | n/a | 0.620 | 9.241 | n/a | n/a | 0.035 | 7.596 | 0.250 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 28a43e414988873300000000000000fa | 28.481 | 4.666 | n/a | 0.000 | 2.541 | 1.286 | 3.629 | 0.023 | n/a | 0.477 | 15.827 | n/a | n/a | 0.032 | 7.207 | 0.253 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| 28a43e4149888733000000000000010e | 27.439 | 4.109 | 0.365 | 0.000 | 0.240 | 2.316 | 9.581 | 0.070 | n/a | 0.151 | 10.539 | n/a | n/a | 0.069 | 4.714 | 0.172 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 28a43e414988873300000000000000f6 | 27.373 | 2.793 | n/a | 1.284 | 2.426 | 0.780 | 1.992 | 0.020 | n/a | 0.421 | 17.532 | n/a | n/a | 0.125 | 6.503 | 0.238 | 0.125 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| 28a43e4149888733000000000000010a | 26.331 | 3.005 | n/a | 1.910 | 0.048 | 2.317 | 2.233 | 0.057 | n/a | 0.198 | 16.540 | n/a | n/a | 0.023 | 4.963 | 0.188 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.940 | 1.004 | 0.000 | 1.143 | 2.793 | n/a | 0.000 | 0.238 | 1.072 | 1.992 | 0.025 | n/a | 0.483 | 11.747 | n/a | n/a | 0.033 | 4.250 | 0.238 | 0.033 |
| p99 | 34.018 | 2.891 | 0.000 | 2.441 | 4.738 | n/a | 1.928 | 2.541 | 1.636 | 6.067 | 0.078 | n/a | 3.156 | 23.900 | n/a | n/a | 0.125 | 7.207 | 0.322 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e4149888733000000000000011f | 34.018 | 3.612 | n/a | 0.000 | 0.085 | 1.335 | 1.864 | 0.033 | n/a | 3.156 | 23.900 | n/a | n/a | 0.034 | 3.697 | 0.109 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000000fa | 28.481 | 4.666 | n/a | 0.000 | 2.541 | 1.286 | 3.629 | 0.023 | n/a | 0.477 | 15.827 | n/a | n/a | 0.032 | 7.207 | 0.253 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| 28a43e414988873300000000000000f6 | 27.373 | 2.793 | n/a | 1.284 | 2.426 | 0.780 | 1.992 | 0.020 | n/a | 0.421 | 17.532 | n/a | n/a | 0.125 | 6.503 | 0.238 | 0.125 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| 28a43e41498887330000000000000124 | 21.962 | 4.738 | n/a | 0.000 | 0.238 | 1.636 | 2.800 | 0.078 | n/a | 0.347 | 12.026 | n/a | n/a | 0.100 | 4.976 | 0.227 | 0.100 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 28a43e414988873300000000000000ff | 20.940 | 3.088 | n/a | 1.206 | 1.682 | 1.193 | 6.067 | 0.051 | n/a | 0.676 | 6.929 | n/a | n/a | 0.048 | 5.976 | 0.285 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000127 | 17.842 | 2.208 | n/a | 0.000 | 0.014 | 0.825 | 1.476 | 0.023 | n/a | 1.542 | 11.747 | n/a | n/a | 0.008 | 2.222 | 0.125 | 0.008 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000113 | 16.576 | 2.532 | n/a | 0.000 | 0.057 | 1.014 | 1.237 | 0.025 | n/a | 0.483 | 11.201 | n/a | n/a | 0.026 | 2.590 | 0.156 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000111 | 13.211 | 2.250 | n/a | 1.928 | 0.072 | 0.996 | 1.169 | 0.020 | n/a | 0.405 | 6.345 | n/a | n/a | 0.024 | 4.250 | 0.322 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000011b | 12.807 | 1.979 | n/a | 0.000 | 1.582 | 1.072 | 2.007 | 0.048 | n/a | 0.809 | 5.278 | n/a | n/a | 0.033 | 3.560 | 0.278 | 0.033 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.460 | 0.000 | 0.000 | 0.333 | 3.678 | 0.225 | 0.000 | 0.037 | 1.592 | 3.384 | 0.019 | n/a | 0.062 | 12.148 | n/a | n/a | 0.029 | 4.017 | 0.179 | 0.029 |
| p99 | 34.780 | 0.248 | 0.000 | 0.411 | 8.250 | 0.302 | 1.023 | 0.075 | 1.597 | 10.897 | 0.038 | n/a | 0.498 | 13.358 | n/a | n/a | 0.029 | 9.573 | 0.275 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e4149888733000000000000012a | 34.780 | 8.250 | 0.225 | 1.023 | 0.075 | 1.597 | 10.897 | 0.038 | n/a | 0.498 | 12.148 | n/a | n/a | 0.029 | 9.573 | 0.275 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 28a43e41498887330000000000001f57 | 22.460 | 3.678 | 0.302 | 0.000 | 0.037 | 1.592 | 3.384 | 0.019 | n/a | 0.062 | 13.358 | n/a | n/a | 0.029 | 4.017 | 0.179 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.151 | 0.000 | 0.000 | 0.454 | 3.780 | n/a | 0.000 | 0.068 | 1.338 | 4.989 | 0.034 | n/a | 0.364 | 11.635 | n/a | n/a | 0.028 | 4.263 | 0.164 | 0.028 |
| p99 | 125.746 | 2.430 | 0.000 | 4.640 | 9.976 | n/a | 2.910 | 8.096 | 5.139 | 32.383 | 0.411 | n/a | 3.484 | 91.039 | n/a | n/a | 0.081 | 11.125 | 0.491 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e4149888733000000000000013e | 125.746 | 6.341 | 0.184 | 0.802 | 0.048 | 2.244 | 24.929 | 0.035 | n/a | 0.103 | 91.039 | n/a | n/a | 0.021 | 7.375 | 0.059 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 28a43e4149888733000000000000019e | 75.829 | 4.966 | n/a | 0.000 | 0.115 | 0.860 | 1.350 | 0.021 | n/a | 0.076 | 68.382 | n/a | n/a | 0.060 | 5.081 | 0.067 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 28a43e414988873300000000000001a8 | 56.631 | 4.099 | 0.315 | 0.213 | 0.055 | 1.406 | 29.486 | 0.076 | n/a | 0.159 | 20.796 | n/a | n/a | 0.025 | 4.682 | 0.083 | 0.025 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.051ms |
| 28a43e41498887330000000000000140 | 54.029 | 3.600 | 0.176 | 0.422 | 0.065 | 2.116 | 23.274 | 0.061 | n/a | 0.628 | 23.657 | n/a | n/a | 0.028 | 4.263 | 0.079 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 28a43e41498887330000000000000135 | 53.969 | 4.133 | 0.263 | 0.000 | 0.073 | 3.582 | 9.783 | 0.036 | n/a | 0.099 | 35.969 | n/a | n/a | 0.032 | 4.469 | 0.083 | 0.032 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 28a43e41498887330000000000000166 | 50.512 | 5.169 | 0.411 | 0.427 | 0.059 | 2.776 | 32.383 | 0.063 | n/a | 0.152 | 9.045 | n/a | n/a | 0.026 | 6.066 | 0.120 | 0.026 | gw-w/thread-45/gateway.admitted-work | none observed |
| 28a43e4149888733000000000000016c | 48.766 | 6.366 | 0.240 | 0.000 | 0.177 | 3.571 | 18.969 | 0.093 | n/a | 0.380 | 18.916 | n/a | n/a | 0.054 | 6.783 | 0.139 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001d6 | 47.741 | 4.626 | 0.237 | 0.470 | 0.157 | 2.325 | 21.198 | 0.030 | n/a | 1.510 | 17.135 | n/a | n/a | 0.052 | 5.491 | 0.115 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000146 | 44.383 | 3.884 | 0.276 | 0.469 | 0.056 | 1.600 | 14.036 | 0.072 | n/a | 0.266 | 23.704 | n/a | n/a | 0.020 | 4.685 | 0.106 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001a0 | 43.956 | 3.621 | 0.235 | 0.253 | 0.123 | 2.136 | 15.044 | 0.034 | n/a | 0.097 | 22.370 | n/a | n/a | 0.043 | 4.231 | 0.096 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000190 | 43.549 | 7.889 | 0.234 | 0.700 | 0.061 | 3.182 | 16.327 | 0.082 | n/a | 0.909 | 14.139 | n/a | n/a | 0.027 | 8.883 | 0.204 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000142 | 43.199 | 3.350 | 0.200 | 0.000 | 0.081 | 1.750 | 13.035 | 0.031 | n/a | 0.397 | 24.319 | n/a | n/a | 0.034 | 3.631 | 0.084 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000170 | 41.207 | 3.783 | 0.285 | 0.000 | 0.151 | 1.608 | 14.937 | 0.050 | n/a | 0.435 | 19.914 | n/a | n/a | 0.043 | 4.219 | 0.102 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001ca | 41.073 | 6.634 | 0.279 | 0.254 | 0.135 | 1.667 | 23.775 | 0.032 | n/a | 0.117 | 8.151 | n/a | n/a | 0.029 | 7.302 | 0.178 | 0.029 | gw-w/thread-47/gateway.admitted-work | none observed |
| 28a43e41498887330000000000000186 | 40.882 | 5.950 | 0.442 | 0.762 | 0.079 | 2.258 | 7.641 | 0.035 | n/a | 0.207 | 23.464 | n/a | n/a | 0.042 | 7.235 | 0.177 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000168 | 39.550 | 4.854 | 0.310 | 0.396 | 0.161 | 2.151 | 17.349 | 0.034 | n/a | 3.250 | 10.992 | n/a | n/a | 0.052 | 5.721 | 0.145 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000172 | 39.510 | 7.542 | 0.312 | 0.254 | 0.063 | 3.143 | 12.367 | 0.126 | n/a | 0.240 | 15.436 | n/a | n/a | 0.026 | 8.172 | 0.207 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001d2 | 39.123 | 4.610 | n/a | 0.000 | 0.264 | 3.425 | 1.438 | 0.014 | n/a | 3.310 | 26.053 | n/a | n/a | 0.010 | 4.874 | 0.125 | 0.010 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.015ms; driver.reader-basis.broadcast 0.011ms |
| 28a43e414988873300000000000001a4 | 38.756 | 7.307 | 0.370 | 0.267 | 0.055 | 2.786 | 10.020 | 0.050 | n/a | 0.151 | 17.725 | n/a | n/a | 0.025 | 7.999 | 0.206 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001b2 | 38.384 | 3.952 | 0.162 | 0.347 | 0.049 | 2.064 | 18.792 | 0.078 | n/a | 2.378 | 10.538 | n/a | n/a | 0.023 | 4.510 | 0.118 | 0.023 | gw-w/thread-43/gateway.admitted-work | none observed |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.273 | 0.000 | 0.000 | 0.448 | 2.363 | n/a | 0.000 | 0.068 | 0.909 | 1.294 | 0.023 | n/a | 0.156 | 7.918 | n/a | n/a | 0.024 | 2.667 | 0.188 | 0.024 |
| p99 | 38.085 | 2.001 | 0.000 | 1.380 | 8.055 | n/a | 0.000 | 8.096 | 3.936 | 4.989 | 0.080 | n/a | 3.484 | 32.608 | n/a | n/a | 0.081 | 11.125 | 0.491 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e41498887330000000000000133 | 38.085 | 2.363 | n/a | 0.000 | 0.054 | 0.907 | 1.929 | 0.041 | n/a | 0.156 | 32.608 | n/a | n/a | 0.024 | 2.417 | 0.063 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 28a43e414988873300000000000001d1 | 26.732 | 2.399 | n/a | 0.000 | 2.024 | 3.936 | 1.861 | 0.026 | n/a | 0.135 | 16.320 | n/a | n/a | 0.032 | 4.423 | 0.165 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| 28a43e4149888733000000000000017e | 25.832 | 2.171 | n/a | 0.000 | 0.046 | 0.783 | 4.989 | 0.080 | n/a | 3.484 | 14.263 | n/a | n/a | 0.016 | 2.217 | 0.086 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 28a43e41498887330000000000000136 | 23.129 | 8.055 | n/a | 0.000 | 0.071 | 3.051 | 4.575 | 0.063 | n/a | 0.733 | 6.537 | n/a | n/a | 0.043 | 8.126 | 0.351 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 28a43e41498887330000000000000177 | 22.642 | 3.030 | n/a | 0.000 | 8.096 | 0.969 | 1.670 | 0.063 | n/a | 3.274 | 5.524 | n/a | n/a | 0.016 | 11.125 | 0.491 | 0.016 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.102ms; driver.publication.readback 0.105ms; driver.publication.persist-deferred 0.021ms |
| 28a43e41498887330000000000000194 | 22.268 | 3.507 | n/a | 0.000 | 0.671 | 0.909 | 0.908 | 0.017 | n/a | 0.481 | 15.745 | n/a | n/a | 0.030 | 4.178 | 0.188 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001c5 | 20.292 | 3.514 | n/a | 0.000 | 0.154 | 1.012 | 1.161 | 0.023 | n/a | 0.133 | 14.215 | n/a | n/a | 0.081 | 3.669 | 0.181 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 28a43e414988873300000000000001cd | 19.384 | 2.354 | n/a | 0.000 | 0.073 | 0.918 | 1.787 | 0.034 | n/a | 0.146 | 14.032 | n/a | n/a | 0.040 | 2.427 | 0.125 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000147 | 18.882 | 2.848 | n/a | 0.000 | 0.051 | 0.921 | 1.205 | 0.022 | n/a | 0.157 | 13.657 | n/a | n/a | 0.022 | 2.898 | 0.154 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000015c | 18.037 | 2.072 | n/a | 0.000 | 1.468 | 0.756 | 4.116 | 0.025 | n/a | 0.095 | 9.482 | n/a | n/a | 0.024 | 3.540 | 0.196 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000018b | 17.120 | 1.992 | n/a | 0.000 | 0.051 | 0.637 | 1.031 | 0.019 | n/a | 3.467 | 9.903 | n/a | n/a | 0.021 | 2.043 | 0.119 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000016e | 14.273 | 2.942 | n/a | 0.000 | 0.068 | 0.839 | 1.199 | 0.025 | n/a | 0.137 | 9.035 | n/a | n/a | 0.028 | 3.010 | 0.211 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000182 | 13.678 | 1.985 | n/a | 0.000 | 0.059 | 1.170 | 2.009 | 0.022 | n/a | 0.489 | 7.918 | n/a | n/a | 0.026 | 2.044 | 0.149 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001cb | 13.028 | 1.816 | n/a | 0.000 | 0.074 | 1.123 | 1.868 | 0.052 | n/a | 0.177 | 7.888 | n/a | n/a | 0.031 | 1.891 | 0.145 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000192 | 12.811 | 3.022 | n/a | 0.000 | 0.115 | 0.496 | 1.180 | 0.019 | n/a | 0.126 | 7.816 | n/a | n/a | 0.037 | 3.136 | 0.245 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001bd | 12.465 | 1.548 | n/a | 0.000 | 0.039 | 0.496 | 1.322 | 0.020 | n/a | 0.122 | 8.896 | n/a | n/a | 0.022 | 1.587 | 0.127 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001af | 12.089 | 2.519 | n/a | 0.000 | 0.060 | 1.046 | 1.558 | 0.041 | n/a | 0.125 | 6.709 | n/a | n/a | 0.031 | 2.579 | 0.213 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 28a43e414988873300000000000001d9 | 11.353 | 1.992 | n/a | 0.000 | 0.433 | 1.336 | 1.153 | 0.021 | n/a | 1.186 | 5.212 | n/a | n/a | 0.020 | 2.425 | 0.214 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001c7 | 10.983 | 1.837 | n/a | 0.000 | 1.496 | 0.640 | 0.920 | 0.020 | n/a | 0.105 | 5.943 | n/a | n/a | 0.022 | 3.333 | 0.303 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000152 | 10.114 | 2.622 | n/a | 0.000 | 0.045 | 0.534 | 1.294 | 0.025 | n/a | 0.473 | 5.101 | n/a | n/a | 0.020 | 2.667 | 0.264 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.481 | 0.000 | 0.000 | 0.500 | 3.508 | n/a | 0.000 | 0.054 | 1.158 | 2.670 | 0.031 | n/a | 0.269 | 8.995 | n/a | n/a | 0.026 | 3.878 | 0.188 | 0.026 |
| p99 | 66.802 | 2.004 | 0.000 | 1.762 | 9.193 | n/a | 0.754 | 2.302 | 6.077 | 23.233 | 0.106 | n/a | 4.163 | 49.769 | n/a | n/a | 0.087 | 10.752 | 0.417 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e414988873300000000000001f1 | 71.330 | 4.986 | 0.160 | 0.394 | 0.050 | 1.457 | 13.446 | 0.028 | n/a | 0.078 | 50.709 | n/a | n/a | 0.023 | 5.589 | 0.078 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| 28a43e414988873300000000000002a5 | 66.802 | 8.441 | 0.238 | 0.542 | 0.065 | 1.890 | 5.692 | 0.026 | n/a | 0.116 | 49.769 | n/a | n/a | 0.023 | 9.286 | 0.139 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000240 | 63.944 | 3.711 | 0.210 | 0.230 | 0.100 | 1.219 | 10.389 | 0.023 | n/a | 0.390 | 47.625 | n/a | n/a | 0.045 | 4.251 | 0.066 | 0.045 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001ee | 61.031 | 14.422 | n/a | 0.000 | 0.060 | 9.038 | 25.094 | 0.089 | n/a | 1.052 | 11.246 | n/a | n/a | 0.031 | 14.482 | 0.237 | 0.031 | gw-w/thread-44/gateway.admitted-work | none observed |
| 28a43e414988873300000000000002a9 | 48.723 | 4.576 | 0.234 | 0.437 | 0.046 | 1.382 | 20.482 | 0.022 | n/a | 0.293 | 21.230 | n/a | n/a | 0.021 | 5.293 | 0.109 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000020d | 45.678 | 4.773 | 0.177 | 0.400 | 0.051 | 1.599 | 23.233 | 0.075 | n/a | 0.121 | 15.223 | n/a | n/a | 0.026 | 5.401 | 0.118 | 0.026 | gw-w/thread-42/gateway.admitted-work | none observed |
| 28a43e4149888733000000000000024c | 42.925 | 6.098 | 0.344 | 0.433 | 0.049 | 2.449 | 22.360 | 0.025 | n/a | 0.345 | 10.798 | n/a | n/a | 0.023 | 6.924 | 0.161 | 0.023 | gw-w/thread-40/gateway.request-parse | none observed |
| 28a43e41498887330000000000000275 | 37.619 | 3.614 | 0.343 | 0.000 | 0.202 | 1.458 | 11.163 | 0.039 | n/a | 0.648 | 20.065 | n/a | n/a | 0.087 | 4.159 | 0.111 | 0.087 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000028f | 35.836 | 3.525 | 0.172 | 0.405 | 0.052 | 5.292 | 10.937 | 0.049 | n/a | 0.132 | 15.248 | n/a | n/a | 0.025 | 4.154 | 0.116 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000021d | 34.650 | 4.025 | 0.391 | 0.267 | 0.051 | 2.059 | 18.364 | 0.106 | n/a | 0.565 | 8.782 | n/a | n/a | 0.039 | 4.734 | 0.137 | 0.039 | gw-w/thread-44/gateway.admitted-work | none observed |
| 28a43e41498887330000000000000205 | 33.773 | 6.306 | 0.427 | 0.239 | 0.186 | 1.409 | 12.466 | 0.031 | n/a | 0.076 | 12.579 | n/a | n/a | 0.055 | 7.157 | 0.212 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000295 | 33.401 | 4.642 | 0.190 | 0.359 | 0.042 | 6.077 | 13.088 | 0.023 | n/a | 0.372 | 8.584 | n/a | n/a | 0.022 | 5.234 | 0.157 | 0.022 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001f9 | 33.296 | 3.837 | 0.169 | 0.231 | 0.049 | 1.261 | 18.284 | 0.030 | n/a | 0.419 | 8.995 | n/a | n/a | 0.021 | 4.286 | 0.129 | 0.021 | gw-w/thread-45/gateway.admitted-work | none observed |
| 28a43e41498887330000000000000267 | 32.990 | 9.193 | 0.254 | 1.240 | 0.066 | 5.851 | 7.706 | 0.041 | n/a | 0.223 | 8.391 | n/a | n/a | 0.026 | 10.752 | 0.326 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000025a | 32.406 | 2.961 | 0.150 | 0.230 | 0.039 | 1.041 | 15.614 | 0.044 | n/a | 0.375 | 11.934 | n/a | n/a | 0.018 | 3.380 | 0.104 | 0.018 | gw-w/thread-44/gateway.admitted-work | none observed |
| 28a43e4149888733000000000000023c | 31.434 | 4.385 | 0.175 | 0.402 | 0.044 | 1.431 | 12.221 | 0.299 | n/a | 4.327 | 8.127 | n/a | n/a | 0.022 | 5.007 | 0.159 | 0.022 | gw-w/thread-43/gateway.admitted-work | none observed |
| 28a43e41498887330000000000000219 | 31.364 | 5.127 | 0.289 | 0.429 | 0.044 | 1.775 | 7.789 | 0.052 | n/a | 0.379 | 15.454 | n/a | n/a | 0.025 | 5.889 | 0.188 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000230 | 31.306 | 5.772 | 0.430 | 0.480 | 0.053 | 2.380 | 12.445 | 0.058 | n/a | 0.477 | 9.186 | n/a | n/a | 0.024 | 6.736 | 0.215 | 0.024 | gw-w/thread-46/gateway.admitted-work | none observed |
| 28a43e41498887330000000000000201 | 31.099 | 5.098 | 0.185 | 0.302 | 0.056 | 1.158 | 6.266 | 0.037 | n/a | 0.078 | 17.895 | n/a | n/a | 0.025 | 5.641 | 0.181 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001ec | 30.868 | 3.700 | 0.257 | 0.247 | 0.055 | 1.716 | 6.828 | 0.030 | n/a | 0.088 | 17.923 | n/a | n/a | 0.025 | 4.258 | 0.138 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.424 | 0.000 | 0.000 | 0.466 | 2.178 | n/a | 0.000 | 0.053 | 0.866 | 1.732 | 0.025 | n/a | 0.267 | 7.904 | n/a | n/a | 0.026 | 2.246 | 0.187 | 0.026 |
| p99 | 25.117 | 2.693 | 0.000 | 1.827 | 6.207 | n/a | 0.000 | 2.302 | 2.830 | 8.617 | 0.077 | n/a | 4.163 | 20.639 | n/a | n/a | 0.184 | 6.440 | 0.379 | 0.184 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e414988873300000000000001e3 | 25.117 | 1.680 | n/a | 0.000 | 0.047 | 0.784 | 1.753 | 0.047 | n/a | 0.135 | 20.639 | n/a | n/a | 0.032 | 1.728 | 0.069 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000022b | 22.137 | 1.845 | n/a | 0.000 | 0.064 | 1.750 | 5.183 | 0.019 | n/a | 0.092 | 13.158 | n/a | n/a | 0.025 | 1.910 | 0.086 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000227 | 21.182 | 1.741 | n/a | 0.000 | 0.042 | 0.585 | 4.942 | 0.016 | n/a | 0.294 | 13.542 | n/a | n/a | 0.018 | 1.783 | 0.084 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000278 | 20.978 | 2.178 | n/a | 0.000 | 0.068 | 0.853 | 1.807 | 0.028 | n/a | 0.171 | 15.829 | n/a | n/a | 0.045 | 2.246 | 0.107 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.090ms |
| 28a43e41498887330000000000000246 | 20.674 | 1.642 | n/a | 0.000 | 0.022 | 1.408 | 1.405 | 0.012 | n/a | 0.099 | 16.074 | n/a | n/a | 0.012 | 1.664 | 0.080 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.182ms; driver.publication.persist-deferred 0.021ms |
| 28a43e4149888733000000000000021f | 19.481 | 6.207 | n/a | 0.000 | 0.042 | 2.830 | 7.288 | 0.048 | n/a | 0.388 | 2.652 | n/a | n/a | 0.026 | 6.249 | 0.321 | 0.026 | node-14/thread-0/driver.execute | none observed |
| 28a43e41498887330000000000000265 | 19.453 | 4.771 | n/a | 0.000 | 0.057 | 2.659 | 8.617 | 0.056 | n/a | 0.273 | 2.982 | n/a | n/a | 0.040 | 4.828 | 0.248 | 0.040 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.016ms |
| 28a43e414988873300000000000001e7 | 18.053 | 2.327 | n/a | 0.000 | 0.051 | 1.025 | 3.698 | 0.053 | n/a | 0.267 | 10.601 | n/a | n/a | 0.032 | 2.378 | 0.132 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000223 | 17.835 | 2.003 | n/a | 0.000 | 0.051 | 0.576 | 4.375 | 0.020 | n/a | 0.077 | 10.710 | n/a | n/a | 0.023 | 2.054 | 0.115 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000020a | 17.437 | 3.497 | n/a | 0.000 | 0.136 | 1.304 | 1.285 | 0.025 | n/a | 0.149 | 10.981 | n/a | n/a | 0.058 | 3.633 | 0.208 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001f4 | 16.971 | 4.139 | n/a | 0.000 | 2.302 | 1.053 | 1.281 | 0.022 | n/a | 4.163 | 3.975 | n/a | n/a | 0.038 | 6.440 | 0.379 | 0.038 | gw-w/thread-42/d/transact-async | none observed |
| 28a43e41498887330000000000000298 | 16.864 | 2.500 | n/a | 0.000 | 0.048 | 1.055 | 1.700 | 0.032 | n/a | 0.117 | 11.388 | n/a | n/a | 0.023 | 2.548 | 0.151 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000210 | 16.306 | 2.913 | n/a | 0.000 | 0.132 | 0.911 | 1.732 | 0.077 | n/a | 0.158 | 10.329 | n/a | n/a | 0.054 | 3.045 | 0.187 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001e1 | 15.941 | 3.363 | n/a | 0.000 | 1.610 | 0.797 | 1.036 | 0.020 | n/a | 0.529 | 8.558 | n/a | n/a | 0.028 | 4.973 | 0.312 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000021a | 15.775 | 2.230 | n/a | 0.000 | 2.169 | 1.124 | 2.219 | 0.070 | n/a | 1.941 | 6.001 | n/a | n/a | 0.022 | 4.399 | 0.279 | 0.022 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001e5 | 15.718 | 2.082 | n/a | 0.000 | 0.050 | 0.909 | 1.248 | 0.026 | n/a | 0.140 | 11.234 | n/a | n/a | 0.029 | 2.132 | 0.136 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000202 | 15.186 | 2.004 | n/a | 0.000 | 0.053 | 1.217 | 1.923 | 0.049 | n/a | 0.236 | 9.679 | n/a | n/a | 0.025 | 2.057 | 0.135 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000000206 | 14.424 | 2.367 | n/a | 0.000 | 1.159 | 0.759 | 1.394 | 0.020 | n/a | 0.077 | 8.630 | n/a | n/a | 0.018 | 3.526 | 0.244 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000001fe | 14.236 | 2.366 | n/a | 0.000 | 0.046 | 0.823 | 1.809 | 0.062 | n/a | 0.553 | 8.555 | n/a | n/a | 0.020 | 2.412 | 0.169 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000027c | 14.216 | 3.744 | n/a | 0.000 | 0.077 | 1.608 | 2.190 | 0.053 | n/a | 0.300 | 6.199 | n/a | n/a | 0.044 | 3.822 | 0.269 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1702 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.279 | 0.348 | 0.000 | 0.511 | 2.188 | n/a | 0.000 | 0.044 | 0.606 | 1.019 | 0.012 | n/a | 0.108 | 5.581 | n/a | n/a | 0.015 | 2.525 | 0.236 | 0.015 |
| p99 | 44.472 | 2.009 | 0.045 | 2.055 | 6.980 | n/a | 0.000 | 12.888 | 6.919 | 9.325 | 0.062 | n/a | 3.555 | 31.565 | n/a | n/a | 0.050 | 15.572 | 0.619 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e41498887330000000000000367 | 61.614 | 2.460 | n/a | 0.000 | 1.736 | 2.394 | 3.652 | 0.020 | n/a | 3.758 | 47.586 | n/a | n/a | 0.008 | 4.196 | 0.068 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.188ms; driver.publication.readback 0.106ms; driver.publication.readback 0.092ms; driver.reader-basis.broadcast 0.087ms; driver.publication.readback 0.059ms |
| 28a43e414988873300000000000003f3 | 58.004 | 1.665 | n/a | 0.000 | 0.030 | 0.429 | 5.677 | 0.017 | n/a | 0.975 | 49.193 | n/a | n/a | 0.017 | 1.695 | 0.029 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.018ms |
| 28a43e4149888733000000000000095d | 55.585 | 3.982 | 0.462 | 0.000 | 0.034 | 1.457 | 30.567 | 0.026 | n/a | 0.307 | 18.735 | n/a | n/a | 0.015 | 4.478 | 0.081 | 0.015 | gw-w/thread-44/gateway.admitted-work | driver.publication.readback 0.094ms; driver.publication.readback 0.044ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| 28a43e414988873300000000000003fe | 54.496 | 5.282 | n/a | 0.000 | 4.753 | 0.539 | 1.733 | 0.020 | n/a | 0.099 | 42.046 | n/a | n/a | 0.024 | 10.034 | 0.184 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.057ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.029ms |
| 28a43e414988873300000000000003f9 | 53.953 | 2.042 | n/a | 0.000 | 0.014 | 2.167 | 1.001 | 0.016 | n/a | 0.050 | 48.652 | n/a | n/a | 0.010 | 2.057 | 0.038 | 0.010 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.113ms; driver.publication.readback 0.050ms; driver.publication.readback 0.044ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.039ms |
| 28a43e414988873300000000000003f4 | 52.653 | 1.492 | n/a | 0.000 | 1.028 | 0.349 | 0.552 | 0.007 | n/a | 0.269 | 48.948 | n/a | n/a | 0.008 | 2.520 | 0.048 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 28a43e414988873300000000000003ff | 51.493 | 1.687 | n/a | 0.000 | 0.026 | 0.277 | 2.903 | 0.018 | n/a | 0.082 | 46.484 | n/a | n/a | 0.016 | 1.712 | 0.033 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.readback 0.057ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.034ms |
| 28a43e4149888733000000000000095f | 51.063 | 9.209 | n/a | 0.000 | 0.052 | 15.400 | 2.879 | 0.031 | n/a | 0.388 | 23.084 | n/a | n/a | 0.020 | 9.261 | 0.181 | 0.020 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.105ms; driver.publication.readback 0.094ms; driver.publication.readback 0.044ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.017ms |
| 28a43e4149888733000000000000054d | 49.289 | 14.422 | n/a | 0.000 | 0.036 | 9.039 | 13.345 | 0.070 | n/a | 1.003 | 11.357 | n/a | n/a | 0.018 | 14.458 | 0.293 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.018ms |
| 28a43e41498887330000000000000902 | 48.465 | 2.271 | n/a | 0.000 | 30.360 | 0.400 | 1.374 | 0.012 | n/a | 0.065 | 13.967 | n/a | n/a | 0.015 | 32.631 | 0.673 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.099ms; driver.publication.readback 0.079ms; driver.publication.readback 0.070ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.041ms |
| 28a43e41498887330000000000000d5a | 48.258 | 1.553 | n/a | 0.000 | 1.186 | 39.898 | 0.840 | 0.013 | n/a | 0.051 | 4.711 | n/a | n/a | 0.006 | 2.739 | 0.057 | 0.006 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.186ms; driver.publication.readback 0.069ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.022ms |
| 28a43e41498887330000000000000ae4 | 46.716 | 4.279 | n/a | 0.000 | 22.048 | 0.680 | 3.064 | 0.034 | n/a | 5.814 | 10.785 | n/a | n/a | 0.011 | 26.327 | 0.564 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.060ms; driver.publication.readback 0.059ms; driver.publication.readback 0.037ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.025ms |
| 28a43e41498887330000000000000409 | 46.685 | 1.327 | n/a | 0.000 | 26.564 | 1.417 | 0.763 | 0.016 | n/a | 2.195 | 14.392 | n/a | n/a | 0.011 | 27.891 | 0.597 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.052ms; driver.publication.readback 0.052ms; driver.publication.readback 0.043ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.020ms |
| 28a43e4149888733000000000000036a | 46.101 | 1.895 | n/a | 0.000 | 37.064 | 0.697 | 1.274 | 0.029 | n/a | 1.918 | 3.210 | n/a | n/a | 0.013 | 38.959 | 0.845 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.117ms; driver.publication.readback 0.092ms; driver.publication.readback 0.059ms; driver.publication.readback 0.042ms; driver.publication.readback 0.033ms |
| 28a43e41498887330000000000000959 | 45.706 | 4.580 | n/a | 0.000 | 6.212 | 0.670 | 0.995 | 0.013 | n/a | 0.081 | 33.141 | n/a | n/a | 0.012 | 10.792 | 0.236 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.568ms; driver.reader-basis.broadcast 0.117ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.043ms; driver.publication.readback 0.037ms |
| 28a43e4149888733000000000000050b | 44.739 | 2.181 | n/a | 0.000 | 0.012 | 0.733 | 1.281 | 0.027 | n/a | 0.107 | 40.386 | n/a | n/a | 0.010 | 2.193 | 0.049 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.012ms |
| 28a43e41498887330000000000000328 | 44.486 | 2.006 | n/a | 0.000 | 30.645 | 0.523 | 1.049 | 0.018 | n/a | 0.062 | 10.161 | n/a | n/a | 0.022 | 32.651 | 0.734 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.051ms; driver.reader-basis.broadcast 0.045ms; driver.publication.readback 0.044ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.018ms |
| 28a43e41498887330000000000000d5c | 44.472 | 2.224 | n/a | 0.000 | 3.545 | 23.792 | 0.616 | 0.005 | n/a | 0.019 | 14.265 | n/a | n/a | 0.008 | 5.769 | 0.130 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.003ms; driver.reader-basis.broadcast 0.186ms; driver.publication.readback 0.069ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.025ms |
| 28a43e41498887330000000000000c04 | 44.134 | 2.890 | n/a | 0.000 | 0.066 | 0.730 | 0.794 | 0.011 | n/a | 0.067 | 39.552 | n/a | n/a | 0.023 | 2.957 | 0.067 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms |
| 28a43e41498887330000000000000d5d | 43.648 | 5.583 | n/a | 0.000 | 3.754 | 25.909 | 1.441 | 0.014 | n/a | 0.065 | 6.877 | n/a | n/a | 0.004 | 9.337 | 0.214 | 0.004 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.186ms; driver.publication.readback 0.069ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.016ms |

## P2 / L16 / commit / 5-10 facts (990 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.795 | 0.000 | 0.000 | 0.402 | 1.758 | n/a | 0.000 | 0.045 | 0.594 | 0.862 | 0.012 | n/a | 0.105 | 4.978 | n/a | n/a | 0.015 | 2.055 | 0.215 | 0.015 |
| p99 | 42.892 | 2.002 | 0.046 | 0.958 | 4.646 | n/a | 0.000 | 14.034 | 6.919 | 5.432 | 0.052 | n/a | 3.177 | 31.637 | n/a | n/a | 0.054 | 15.572 | 0.627 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e41498887330000000000000367 | 61.614 | 2.460 | n/a | 0.000 | 1.736 | 2.394 | 3.652 | 0.020 | n/a | 3.758 | 47.586 | n/a | n/a | 0.008 | 4.196 | 0.068 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.188ms; driver.publication.readback 0.106ms; driver.publication.readback 0.092ms; driver.reader-basis.broadcast 0.087ms; driver.publication.readback 0.059ms |
| 28a43e414988873300000000000003f3 | 58.004 | 1.665 | n/a | 0.000 | 0.030 | 0.429 | 5.677 | 0.017 | n/a | 0.975 | 49.193 | n/a | n/a | 0.017 | 1.695 | 0.029 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.018ms |
| 28a43e414988873300000000000003f4 | 52.653 | 1.492 | n/a | 0.000 | 1.028 | 0.349 | 0.552 | 0.007 | n/a | 0.269 | 48.948 | n/a | n/a | 0.008 | 2.520 | 0.048 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 28a43e41498887330000000000000d5a | 48.258 | 1.553 | n/a | 0.000 | 1.186 | 39.898 | 0.840 | 0.013 | n/a | 0.051 | 4.711 | n/a | n/a | 0.006 | 2.739 | 0.057 | 0.006 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.186ms; driver.publication.readback 0.069ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.022ms |
| 28a43e41498887330000000000000409 | 46.685 | 1.327 | n/a | 0.000 | 26.564 | 1.417 | 0.763 | 0.016 | n/a | 2.195 | 14.392 | n/a | n/a | 0.011 | 27.891 | 0.597 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.052ms; driver.publication.readback 0.052ms; driver.publication.readback 0.043ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.020ms |
| 28a43e4149888733000000000000036a | 46.101 | 1.895 | n/a | 0.000 | 37.064 | 0.697 | 1.274 | 0.029 | n/a | 1.918 | 3.210 | n/a | n/a | 0.013 | 38.959 | 0.845 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.117ms; driver.publication.readback 0.092ms; driver.publication.readback 0.059ms; driver.publication.readback 0.042ms; driver.publication.readback 0.033ms |
| 28a43e4149888733000000000000050b | 44.739 | 2.181 | n/a | 0.000 | 0.012 | 0.733 | 1.281 | 0.027 | n/a | 0.107 | 40.386 | n/a | n/a | 0.010 | 2.193 | 0.049 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.012ms |
| 28a43e41498887330000000000000328 | 44.486 | 2.006 | n/a | 0.000 | 30.645 | 0.523 | 1.049 | 0.018 | n/a | 0.062 | 10.161 | n/a | n/a | 0.022 | 32.651 | 0.734 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.051ms; driver.reader-basis.broadcast 0.045ms; driver.publication.readback 0.044ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.018ms |
| 28a43e41498887330000000000000c04 | 44.134 | 2.890 | n/a | 0.000 | 0.066 | 0.730 | 0.794 | 0.011 | n/a | 0.067 | 39.552 | n/a | n/a | 0.023 | 2.957 | 0.067 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms |
| 28a43e41498887330000000000000d5e | 42.892 | 2.723 | n/a | 0.000 | 0.042 | 24.954 | 1.475 | 0.023 | n/a | 0.064 | 13.601 | n/a | n/a | 0.010 | 2.765 | 0.064 | 0.010 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.003ms; driver.publication.readback 0.069ms; driver.publication.readback 0.067ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.030ms |
| 28a43e41498887330000000000000905 | 42.636 | 1.606 | n/a | 0.000 | 33.719 | 0.568 | 0.924 | 0.012 | n/a | 0.090 | 5.703 | n/a | n/a | 0.013 | 35.325 | 0.829 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.263ms; driver.reader-basis.broadcast 0.120ms; driver.publication.readback 0.099ms; driver.publication.readback 0.081ms; driver.publication.readback 0.079ms |
| 28a43e414988873300000000000006e8 | 42.342 | 2.930 | n/a | 0.000 | 0.204 | 3.466 | 0.943 | 0.013 | n/a | 0.073 | 34.660 | n/a | n/a | 0.054 | 3.135 | 0.074 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.147ms; driver.reader-basis.broadcast 0.076ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.010ms |
| 28a43e41498887330000000000000466 | 41.484 | 1.372 | n/a | 0.000 | 0.224 | 2.815 | 1.233 | 0.020 | n/a | 0.817 | 34.995 | n/a | n/a | 0.007 | 1.596 | 0.038 | 0.007 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.255ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.020ms |
| 28a43e41498887330000000000000ae1 | 38.829 | 1.546 | n/a | 0.000 | 22.786 | 0.361 | 1.040 | 0.010 | n/a | 0.055 | 13.021 | n/a | n/a | 0.010 | 24.332 | 0.627 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.139ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.054ms; driver.publication.readback 0.049ms; driver.publication.readback 0.037ms |
| 28a43e414988873300000000000003f6 | 38.326 | 1.563 | n/a | 0.000 | 0.053 | 0.483 | 0.805 | 0.019 | n/a | 2.247 | 33.124 | n/a | n/a | 0.031 | 1.617 | 0.042 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.113ms; driver.publication.readback 0.050ms; driver.publication.readback 0.042ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.018ms |
| 28a43e414988873300000000000003fd | 37.591 | 2.914 | n/a | 0.000 | 0.086 | 0.943 | 1.542 | 0.036 | n/a | 0.462 | 31.565 | n/a | n/a | 0.042 | 3.000 | 0.080 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.039ms |
| 28a43e414988873300000000000006e5 | 37.012 | 2.129 | n/a | 0.000 | 0.069 | 0.461 | 0.864 | 0.014 | n/a | 0.055 | 33.391 | n/a | n/a | 0.029 | 2.198 | 0.059 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.031ms |
| 28a43e414988873300000000000006ed | 36.663 | 3.115 | n/a | 0.000 | 0.035 | 0.978 | 0.821 | 0.011 | n/a | 0.046 | 31.637 | n/a | n/a | 0.017 | 3.151 | 0.086 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.148ms; driver.publication.readback 0.107ms; driver.publication.readback 0.098ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.056ms |
| 28a43e41498887330000000000000812 | 35.878 | 1.538 | n/a | 0.000 | 14.034 | 4.319 | 0.741 | 0.013 | n/a | 1.171 | 14.050 | n/a | n/a | 0.013 | 15.572 | 0.434 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | client.encode 2.683ms; driver.expected-state.bind-receipt 1.207ms; driver.publication.readback 0.262ms; driver.publication.persist-deferred 0.069ms; driver.publication.readback 0.049ms |
| 28a43e4149888733000000000000095c | 35.102 | 1.956 | n/a | 0.000 | 1.790 | 0.403 | 0.540 | 0.006 | n/a | 0.063 | 30.324 | n/a | n/a | 0.020 | 3.746 | 0.107 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.117ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.037ms; driver.publication.readback 0.014ms |

## P2/P4 / read-your-own-write / read (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.688 | n/a | n/a | n/a | 28.187 | 3.047 | 1.548 | 0.000 | 0.385 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.417 | 47.390 | 0.727 | 14.417 |
| p99 | 165.098 | n/a | n/a | n/a | 93.965 | 94.111 | 11.039 | 0.000 | 51.576 | 83.259 | 88.211 | n/a | 0.009 | 0.000 | n/a | n/a | 127.081 | 123.075 | 1.000 | 127.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e4149888733000000000000120f | 165.098 | 17.097 | 4.324 | 1.953 | 0.000 | 51.576 | 1.927 | 88.211 | n/a | 0.003 | 0.000 | n/a | n/a | 0.008 | 23.375 | 0.142 | 0.008 | gw-r/thread-47/gateway.admission-wait | driver.reader-basis.broadcast 0.509ms; driver.reader-basis.broadcast 0.205ms; driver.publication.readback 0.168ms; driver.publication.readback 0.095ms; driver.publication.readback 0.072ms |
| 28a43e4149888733000000000000120e | 155.527 | 32.781 | 0.507 | 1.548 | 0.000 | 33.290 | 5.813 | 81.573 | n/a | 0.003 | 0.000 | n/a | n/a | 0.012 | 34.836 | 0.224 | 0.012 | gw-r/thread-46/gateway.admission-wait | driver.reader-basis.broadcast 0.509ms; driver.publication.readback 0.445ms; driver.publication.persist-deferred 0.268ms; driver.reader-basis.broadcast 0.205ms; driver.publication.readback 0.168ms |
| 28a43e41498887330000000000001210 | 155.152 | 16.413 | 3.452 | 0.000 | 0.000 | 46.959 | 1.248 | 87.071 | n/a | 0.003 | 0.000 | n/a | n/a | 0.006 | 19.865 | 0.128 | 0.006 | gw-r/thread-62/gateway.admission-wait | driver.reader-basis.broadcast 0.509ms; driver.reader-basis.broadcast 0.205ms; driver.publication.readback 0.168ms; driver.publication.readback 0.095ms; driver.publication.readback 0.072ms |
| 28a43e41498887330000000000001c2b | 149.413 | 18.913 | 0.717 | 2.544 | 0.000 | 0.157 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 127.081 | 22.175 | 0.148 | 127.081 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.363ms; driver.reader-basis.broadcast 0.317ms; driver.publication.persist-deferred 0.221ms; driver.publication.readback 0.068ms; driver.publication.readback 0.065ms |
| 28a43e41498887330000000000001216 | 148.040 | 13.471 | 94.111 | 0.000 | 0.000 | 0.262 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.196 | 107.582 | 0.727 | 40.196 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.509ms; driver.publication.readback 0.072ms; driver.publication.readback 0.065ms; driver.publication.readback 0.060ms; driver.publication.readback 0.057ms |
| 28a43e41498887330000000000001e89 | 146.307 | 50.432 | 2.534 | 5.843 | 0.000 | 15.053 | 72.427 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 0.010 | 58.809 | 0.402 | 0.010 | gw-r/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.344ms; driver.publication.readback 0.107ms; driver.publication.persist-deferred 0.032ms |
| 28a43e41498887330000000000001c2a | 145.479 | 41.447 | 0.198 | 2.351 | 0.000 | 0.474 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 101.009 | 43.996 | 0.302 | 101.009 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.363ms; driver.publication.persist-deferred 0.221ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.publication.readback 0.065ms |
| 28a43e41498887330000000000001177 | 139.844 | 75.571 | 33.517 | 9.667 | 0.000 | 0.509 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.580 | 118.755 | 0.849 | 20.580 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.readback 0.296ms; driver.reader-basis.broadcast 0.191ms; driver.publication.readback 0.189ms; driver.publication.readback 0.110ms; driver.publication.readback 0.099ms |
| 28a43e41498887330000000000001c3d | 137.959 | 48.382 | 71.112 | 3.582 | 0.000 | 0.311 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.572 | 123.075 | 0.892 | 14.572 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.317ms; driver.publication.readback 0.107ms; driver.publication.readback 0.061ms; driver.publication.readback 0.060ms; driver.publication.readback 0.057ms |
| 28a43e4149888733000000000000120c | 134.633 | 21.628 | 0.895 | 0.937 | 0.000 | 27.885 | 83.259 | 0.017 | n/a | 0.008 | 0.000 | n/a | n/a | 0.004 | 23.460 | 0.174 | 0.004 | gw-r/thread-67/gateway.admitted-work | driver.reader-basis.broadcast 0.509ms; driver.publication.readback 0.445ms; driver.publication.persist-deferred 0.268ms; driver.reader-basis.broadcast 0.205ms; driver.publication.readback 0.168ms |
| 28a43e41498887330000000000001c26 | 131.977 | 93.965 | 0.240 | 11.039 | 0.000 | 0.574 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.160 | 105.243 | 0.797 | 26.160 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.363ms; driver.publication.readback 0.281ms; driver.publication.persist-deferred 0.221ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms |
| 28a43e41498887330000000000002133 | 129.079 | 58.131 | 0.381 | 7.648 | 0.000 | 2.645 | 60.252 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.012 | 66.160 | 0.513 | 0.012 | gw-r/thread-67/gateway.admitted-work | driver.reader-basis.broadcast 0.398ms; driver.reader-basis.broadcast 0.367ms; driver.publication.readback 0.140ms; driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.031ms |
| 28a43e41498887330000000000001169 | 121.235 | 17.569 | 32.539 | 0.000 | 0.000 | 0.263 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 70.864 | 50.107 | 0.413 | 70.864 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.491ms; driver.publication.readback 0.296ms; driver.publication.readback 0.189ms; driver.publication.readback 0.121ms; driver.publication.readback 0.110ms |
| 28a43e4149888733000000000000116c | 101.325 | 49.446 | 20.562 | 5.335 | 0.000 | 0.280 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.703 | 75.343 | 0.744 | 25.703 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.491ms; driver.publication.readback 0.296ms; driver.publication.readback 0.189ms; driver.publication.readback 0.121ms; driver.publication.readback 0.110ms |
| 28a43e41498887330000000000001161 | 100.350 | 31.901 | 6.292 | 3.443 | 0.000 | 3.975 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.738 | 41.637 | 0.415 | 54.738 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.491ms; driver.publication.readback 0.296ms; driver.publication.readback 0.189ms; driver.publication.readback 0.135ms; driver.publication.readback 0.121ms |
| 28a43e41498887330000000000001c3c | 100.220 | 17.485 | 70.844 | 0.888 | 0.000 | 0.312 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.691 | 89.217 | 0.890 | 10.691 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.317ms; driver.publication.readback 0.061ms; driver.publication.readback 0.057ms; driver.publication.readback 0.049ms; driver.publication.readback 0.044ms |
| 28a43e4149888733000000000000081e | 98.307 | 81.721 | 1.544 | 6.578 | 0.000 | 2.289 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.176 | 89.842 | 0.914 | 6.176 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.102ms; driver.publication.readback 0.100ms; driver.publication.readback 0.071ms; driver.publication.readback 0.061ms; driver.publication.readback 0.055ms |
| 28a43e41498887330000000000001a3f | 93.497 | 18.163 | 4.561 | 1.260 | 0.000 | 33.907 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.605 | 23.984 | 0.257 | 35.605 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.303ms; driver.publication.readback 0.076ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.publication.readback 0.068ms |
| 28a43e41498887330000000000001723 | 85.258 | 42.181 | 0.258 | 3.899 | 0.000 | 0.338 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.581 | 46.338 | 0.544 | 38.581 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.175ms; driver.publication.readback 0.171ms; driver.publication.readback 0.106ms; driver.publication.readback 0.069ms |
| 28a43e41498887330000000000001a40 | 79.759 | 24.241 | 3.950 | 2.672 | 0.000 | 0.189 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.707 | 30.863 | 0.387 | 48.707 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.303ms; driver.publication.readback 0.076ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.publication.readback 0.068ms |

## P2 / L64 / commit (1775 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.926 | 0.251 | 0.000 | 0.511 | 2.164 | n/a | 0.000 | 0.037 | 0.525 | 0.912 | 0.012 | n/a | 0.078 | 4.835 | n/a | n/a | 0.013 | 2.448 | 0.252 | 0.013 |
| p99 | 41.948 | 2.005 | 0.043 | 2.090 | 7.215 | n/a | 0.248 | 11.755 | 5.707 | 6.716 | 0.048 | n/a | 1.994 | 31.337 | n/a | n/a | 0.039 | 15.387 | 0.638 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e414988873300000000000011bc | 118.379 | 1.791 | n/a | 0.000 | 107.828 | 0.378 | 4.647 | 0.022 | n/a | 0.146 | 3.542 | n/a | n/a | 0.024 | 109.620 | 0.926 | 0.024 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.395ms; driver.expected-state.bind-receipt 1.083ms; driver.reader-basis.broadcast 0.210ms; driver.reader-basis.broadcast 0.200ms; driver.publication.readback 0.124ms |
| 28a43e414988873300000000000011ba | 111.097 | 4.406 | n/a | 0.000 | 0.032 | 13.706 | 29.448 | 0.143 | n/a | 5.812 | 57.537 | n/a | n/a | 0.012 | 4.439 | 0.040 | 0.012 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.395ms; driver.expected-state.bind-receipt 1.083ms; driver.reader-basis.broadcast 0.200ms; driver.publication.readback 0.124ms; driver.publication.readback 0.088ms |
| 28a43e414988873300000000000011bd | 82.208 | 4.521 | n/a | 0.000 | 0.893 | 8.726 | 1.802 | 0.024 | n/a | 0.079 | 66.145 | n/a | n/a | 0.018 | 5.414 | 0.066 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.395ms; driver.reader-basis.broadcast 0.200ms; driver.publication.readback 0.124ms; driver.publication.readback 0.088ms; driver.publication.readback 0.067ms |
| 28a43e414988873300000000000011c0 | 59.815 | 2.392 | n/a | 0.000 | 0.034 | 13.861 | 0.948 | 0.023 | n/a | 0.085 | 42.457 | n/a | n/a | 0.014 | 2.426 | 0.041 | 0.014 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.395ms; driver.expected-state.bind-receipt 1.083ms; driver.publication.readback 0.124ms; driver.publication.readback 0.088ms; driver.publication.readback 0.067ms |
| 28a43e414988873300000000000014c6 | 57.165 | 4.007 | n/a | 0.000 | 23.604 | 4.724 | 3.484 | 0.015 | n/a | 1.700 | 19.619 | n/a | n/a | 0.012 | 27.611 | 0.483 | 0.012 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.644ms; driver.reader-basis.broadcast 0.244ms; driver.publication.readback 0.234ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.015ms |
| 28a43e41498887330000000000001155 | 56.755 | 12.968 | n/a | 0.000 | 15.476 | 2.388 | 7.134 | 0.094 | n/a | 0.322 | 18.357 | n/a | n/a | 0.017 | 28.443 | 0.501 | 0.017 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.230ms; driver.publication.readback 0.181ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.018ms |
| 28a43e414988873300000000000011bb | 56.269 | 2.060 | n/a | 0.000 | 0.017 | 0.396 | 0.701 | 0.005 | n/a | 0.034 | 53.050 | n/a | n/a | 0.006 | 2.077 | 0.037 | 0.006 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.395ms; driver.reader-basis.broadcast 0.200ms; driver.publication.readback 0.067ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.029ms |
| 28a43e414988873300000000000011b9 | 55.204 | 5.227 | n/a | 0.000 | 0.033 | 0.487 | 1.253 | 0.010 | n/a | 0.062 | 48.116 | n/a | n/a | 0.015 | 5.260 | 0.095 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.200ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.015ms |
| 28a43e414988873300000000000011bf | 52.041 | 3.047 | n/a | 0.000 | 0.047 | 0.571 | 1.094 | 0.014 | n/a | 2.727 | 44.522 | n/a | n/a | 0.020 | 3.094 | 0.059 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.395ms; driver.publication.readback 0.088ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.020ms |
| 28a43e414988873300000000000011c3 | 50.064 | 2.595 | n/a | 0.000 | 37.622 | 0.478 | 1.242 | 0.025 | n/a | 0.395 | 7.681 | n/a | n/a | 0.027 | 40.217 | 0.803 | 0.027 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.083ms; driver.publication.readback 0.124ms; driver.publication.readback 0.088ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.029ms |
| 28a43e41498887330000000000001bb9 | 46.169 | 2.159 | n/a | 0.000 | 0.051 | 38.806 | 0.831 | 0.010 | n/a | 0.079 | 4.184 | n/a | n/a | 0.049 | 2.210 | 0.048 | 0.049 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.202ms |
| 28a43e414988873300000000000011c2 | 44.633 | 1.917 | n/a | 0.000 | 13.234 | 10.270 | 10.755 | 0.007 | n/a | 0.156 | 8.283 | n/a | n/a | 0.011 | 15.152 | 0.339 | 0.011 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.083ms; driver.expected-state.bind-receipt 1.044ms; driver.publication.readback 0.124ms; driver.publication.readback 0.088ms; driver.publication.readback 0.067ms |
| 28a43e41498887330000000000001ce9 | 44.278 | 5.535 | n/a | 0.000 | 0.021 | 1.912 | 1.973 | 0.024 | n/a | 0.119 | 34.682 | n/a | n/a | 0.012 | 5.556 | 0.125 | 0.012 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.177ms |
| 28a43e41498887330000000000001cea | 43.640 | 2.662 | n/a | 0.000 | 0.037 | 1.024 | 2.540 | 0.034 | n/a | 0.080 | 37.239 | n/a | n/a | 0.026 | 2.699 | 0.062 | 0.026 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.364ms; driver.expected-state.bind-receipt 1.130ms; driver.publication.readback 0.177ms; driver.publication.persist-deferred 0.026ms |
| 28a43e414988873300000000000014c7 | 43.455 | 8.181 | n/a | 0.000 | 17.319 | 3.074 | 1.110 | 0.006 | n/a | 0.020 | 13.739 | n/a | n/a | 0.005 | 25.500 | 0.587 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.244ms |
| 28a43e41498887330000000000001647 | 43.278 | 5.329 | n/a | 0.000 | 0.066 | 0.487 | 2.010 | 0.025 | n/a | 0.088 | 35.245 | n/a | n/a | 0.027 | 5.395 | 0.125 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.577ms; driver.publication.readback 0.100ms; driver.publication.persist-deferred 0.013ms |
| 28a43e4149888733000000000000106f | 42.312 | 3.461 | n/a | 0.000 | 0.034 | 0.682 | 1.216 | 0.014 | n/a | 0.104 | 36.785 | n/a | n/a | 0.015 | 3.496 | 0.083 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001070 | 41.948 | 4.458 | n/a | 0.000 | 1.239 | 1.178 | 1.168 | 0.009 | n/a | 0.344 | 33.541 | n/a | n/a | 0.012 | 5.697 | 0.136 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.027ms |
| 28a43e414988873300000000000017e6 | 41.760 | 4.159 | n/a | 0.000 | 0.069 | 3.370 | 4.455 | 0.013 | n/a | 0.040 | 29.623 | n/a | n/a | 0.030 | 4.228 | 0.101 | 0.030 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.013ms |
| 28a43e4149888733000000000000131c | 41.104 | 2.147 | n/a | 0.000 | 0.029 | 0.501 | 1.054 | 0.012 | n/a | 0.059 | 37.290 | n/a | n/a | 0.012 | 2.175 | 0.053 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.123ms; driver.publication.readback 0.029ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.013ms |

## P2 / L64 / commit / 5-10 facts (1060 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.624 | 0.000 | 0.000 | 0.382 | 1.699 | n/a | 0.000 | 0.035 | 0.514 | 0.783 | 0.012 | n/a | 0.077 | 4.295 | n/a | n/a | 0.013 | 1.924 | 0.233 | 0.013 |
| p99 | 34.560 | 1.991 | 0.032 | 0.930 | 5.001 | n/a | 0.000 | 10.240 | 5.859 | 4.700 | 0.048 | n/a | 1.994 | 25.368 | n/a | n/a | 0.038 | 11.819 | 0.634 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e414988873300000000000011bc | 118.379 | 1.791 | n/a | 0.000 | 107.828 | 0.378 | 4.647 | 0.022 | n/a | 0.146 | 3.542 | n/a | n/a | 0.024 | 109.620 | 0.926 | 0.024 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.395ms; driver.expected-state.bind-receipt 1.083ms; driver.reader-basis.broadcast 0.210ms; driver.reader-basis.broadcast 0.200ms; driver.publication.readback 0.124ms |
| 28a43e414988873300000000000011ba | 111.097 | 4.406 | n/a | 0.000 | 0.032 | 13.706 | 29.448 | 0.143 | n/a | 5.812 | 57.537 | n/a | n/a | 0.012 | 4.439 | 0.040 | 0.012 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.395ms; driver.expected-state.bind-receipt 1.083ms; driver.reader-basis.broadcast 0.200ms; driver.publication.readback 0.124ms; driver.publication.readback 0.088ms |
| 28a43e41498887330000000000001bb9 | 46.169 | 2.159 | n/a | 0.000 | 0.051 | 38.806 | 0.831 | 0.010 | n/a | 0.079 | 4.184 | n/a | n/a | 0.049 | 2.210 | 0.048 | 0.049 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.202ms |
| 28a43e414988873300000000000011c2 | 44.633 | 1.917 | n/a | 0.000 | 13.234 | 10.270 | 10.755 | 0.007 | n/a | 0.156 | 8.283 | n/a | n/a | 0.011 | 15.152 | 0.339 | 0.011 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.083ms; driver.expected-state.bind-receipt 1.044ms; driver.publication.readback 0.124ms; driver.publication.readback 0.088ms; driver.publication.readback 0.067ms |
| 28a43e41498887330000000000001cea | 43.640 | 2.662 | n/a | 0.000 | 0.037 | 1.024 | 2.540 | 0.034 | n/a | 0.080 | 37.239 | n/a | n/a | 0.026 | 2.699 | 0.062 | 0.026 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.364ms; driver.expected-state.bind-receipt 1.130ms; driver.publication.readback 0.177ms; driver.publication.persist-deferred 0.026ms |
| 28a43e4149888733000000000000131c | 41.104 | 2.147 | n/a | 0.000 | 0.029 | 0.501 | 1.054 | 0.012 | n/a | 0.059 | 37.290 | n/a | n/a | 0.012 | 2.175 | 0.053 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.123ms; driver.publication.readback 0.029ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.013ms |
| 28a43e4149888733000000000000193e | 40.991 | 1.535 | n/a | 0.000 | 0.013 | 0.896 | 0.607 | 0.007 | n/a | 0.023 | 37.903 | n/a | n/a | 0.007 | 1.549 | 0.038 | 0.007 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.012ms |
| 28a43e414988873300000000000010cf | 38.291 | 2.491 | n/a | 0.000 | 2.707 | 0.603 | 1.121 | 0.012 | n/a | 0.114 | 31.229 | n/a | n/a | 0.014 | 5.198 | 0.136 | 0.014 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.343ms; driver.reader-basis.broadcast 0.435ms; driver.publication.readback 0.101ms; driver.publication.persist-deferred 0.035ms |
| 28a43e41498887330000000000001cf3 | 37.339 | 2.542 | n/a | 0.000 | 0.038 | 0.616 | 1.039 | 0.013 | n/a | 0.233 | 32.841 | n/a | n/a | 0.017 | 2.580 | 0.069 | 0.017 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.341ms |
| 28a43e41498887330000000000001dd4 | 35.841 | 3.510 | n/a | 0.000 | 0.062 | 0.765 | 27.702 | 0.014 | n/a | 0.046 | 3.713 | n/a | n/a | 0.029 | 3.572 | 0.100 | 0.029 | gw-w/thread-46/gateway.request-parse | driver.reader-basis.broadcast 0.330ms |
| 28a43e4149888733000000000000110e | 34.560 | 3.170 | n/a | 0.000 | 0.115 | 0.756 | 1.608 | 0.025 | n/a | 0.106 | 28.743 | n/a | n/a | 0.036 | 3.285 | 0.095 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.241ms |
| 28a43e41498887330000000000001af8 | 34.101 | 1.750 | n/a | 0.000 | 1.564 | 4.402 | 0.637 | 0.010 | n/a | 0.174 | 25.553 | n/a | n/a | 0.011 | 3.314 | 0.097 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.018ms |
| 28a43e4149888733000000000000164a | 34.051 | 1.813 | n/a | 0.000 | 0.050 | 2.958 | 0.654 | 0.013 | n/a | 0.063 | 28.484 | n/a | n/a | 0.017 | 1.862 | 0.055 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.228ms; driver.publication.persist-deferred 0.028ms |
| 28a43e414988873300000000000014c9 | 32.688 | 1.386 | n/a | 0.000 | 0.023 | 8.036 | 0.528 | 0.003 | n/a | 0.011 | 22.690 | n/a | n/a | 0.010 | 1.409 | 0.043 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.644ms; driver.publication.readback 0.234ms; driver.publication.readback 0.227ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.015ms |
| 28a43e414988873300000000000017e5 | 31.415 | 1.505 | n/a | 0.000 | 0.014 | 0.294 | 4.235 | 0.010 | n/a | 0.033 | 25.317 | n/a | n/a | 0.008 | 1.518 | 0.048 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms |
| 28a43e414988873300000000000011e8 | 31.125 | 6.842 | n/a | 0.000 | 0.011 | 5.462 | 3.288 | 0.052 | n/a | 0.271 | 15.190 | n/a | n/a | 0.008 | 6.853 | 0.220 | 0.008 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.469ms; driver.publication.readback 0.088ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.026ms |
| 28a43e414988873300000000000011b8 | 30.646 | 1.411 | n/a | 0.000 | 0.028 | 0.435 | 3.156 | 0.012 | n/a | 0.222 | 25.368 | n/a | n/a | 0.012 | 1.439 | 0.047 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.200ms |
| 28a43e414988873300000000000011e2 | 30.626 | 7.215 | n/a | 0.000 | 0.033 | 13.939 | 4.509 | 0.100 | n/a | 0.569 | 4.247 | n/a | n/a | 0.014 | 7.248 | 0.237 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.027ms |
| 28a43e414988873300000000000018b3 | 30.060 | 2.132 | n/a | 0.000 | 1.896 | 0.277 | 0.520 | 0.005 | n/a | 0.026 | 25.198 | n/a | n/a | 0.006 | 4.028 | 0.134 | 0.006 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.102ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.017ms |
| 28a43e41498887330000000000001550 | 30.033 | 1.765 | n/a | 0.000 | 23.195 | 0.511 | 1.141 | 0.018 | n/a | 0.101 | 3.291 | n/a | n/a | 0.011 | 24.959 | 0.831 | 0.011 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.582ms; driver.publication.readback 0.099ms; driver.publication.readback 0.091ms; driver.publication.readback 0.059ms; driver.publication.readback 0.040ms |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.049 | 0.000 | 0.000 | 0.381 | 3.146 | n/a | 0.000 | 0.045 | 0.872 | 1.938 | 0.019 | n/a | 0.080 | 6.301 | n/a | n/a | 0.020 | 3.486 | 0.234 | 0.020 |
| p99 | 79.157 | 1.999 | 0.000 | 2.321 | 8.801 | n/a | 0.612 | 2.159 | 1.917 | 10.450 | 0.059 | n/a | 1.063 | 72.849 | n/a | n/a | 0.055 | 9.739 | 0.440 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e41498887330000000000001e87 | 79.157 | 3.255 | 0.418 | 0.000 | 0.141 | 0.853 | 1.508 | 0.021 | n/a | 0.078 | 72.849 | n/a | n/a | 0.034 | 3.814 | 0.048 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.619ms; driver.publication.persist-deferred 0.032ms |
| 28a43e41498887330000000000001e85 | 47.419 | 5.906 | 0.255 | 0.000 | 0.128 | 0.873 | 3.727 | 0.019 | n/a | 0.070 | 36.403 | n/a | n/a | 0.039 | 6.289 | 0.133 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e88 | 34.418 | 2.418 | n/a | 0.000 | 0.072 | 0.534 | 0.793 | 0.012 | n/a | 0.054 | 30.492 | n/a | n/a | 0.043 | 2.490 | 0.072 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.619ms |
| 28a43e41498887330000000000001ddf | 28.813 | 3.474 | 0.190 | 0.275 | 0.045 | 0.850 | 10.450 | 0.021 | n/a | 0.344 | 13.124 | n/a | n/a | 0.041 | 3.984 | 0.138 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e1d | 24.864 | 3.500 | n/a | 0.000 | 0.038 | 1.427 | 1.290 | 0.014 | n/a | 0.055 | 18.518 | n/a | n/a | 0.023 | 3.538 | 0.142 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e90 | 22.874 | 3.729 | 0.402 | 0.000 | 0.034 | 1.298 | 7.817 | 0.022 | n/a | 0.060 | 9.495 | n/a | n/a | 0.018 | 4.164 | 0.182 | 0.018 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e73 | 22.114 | 8.801 | n/a | 0.000 | 0.937 | 1.334 | 2.939 | 0.032 | n/a | 0.174 | 7.845 | n/a | n/a | 0.050 | 9.739 | 0.440 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e39 | 22.031 | 3.715 | 0.306 | 0.000 | 0.040 | 1.346 | 7.125 | 0.025 | n/a | 0.085 | 9.370 | n/a | n/a | 0.019 | 4.060 | 0.184 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e67 | 21.772 | 2.714 | 0.219 | 0.000 | 0.095 | 0.994 | 2.389 | 0.033 | n/a | 0.130 | 15.174 | n/a | n/a | 0.024 | 3.028 | 0.139 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001de7 | 21.303 | 1.934 | n/a | 0.000 | 0.030 | 0.474 | 4.110 | 0.017 | n/a | 0.066 | 14.655 | n/a | n/a | 0.017 | 1.964 | 0.092 | 0.017 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e63 | 20.794 | 4.107 | 0.178 | 0.000 | 0.045 | 1.520 | 6.726 | 0.023 | n/a | 0.066 | 8.110 | n/a | n/a | 0.019 | 4.331 | 0.208 | 0.019 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001de3 | 20.762 | 3.381 | 0.306 | 0.251 | 0.051 | 1.185 | 8.802 | 0.026 | n/a | 0.076 | 6.665 | n/a | n/a | 0.019 | 3.989 | 0.192 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e6d | 20.459 | 3.100 | 0.180 | 0.000 | 0.045 | 1.105 | 9.595 | 0.058 | n/a | 0.062 | 6.296 | n/a | n/a | 0.017 | 3.326 | 0.163 | 0.017 | gw-w/thread-40/gateway.admitted-work | none observed |
| 28a43e41498887330000000000001dda | 20.431 | 3.647 | 0.169 | 0.270 | 0.040 | 1.256 | 8.367 | 0.024 | n/a | 0.356 | 6.287 | n/a | n/a | 0.016 | 4.125 | 0.202 | 0.016 | gw-w/thread-47/gateway.admitted-work | none observed |
| 28a43e41498887330000000000001e4f | 19.955 | 3.121 | 0.319 | 0.000 | 0.045 | 1.040 | 6.146 | 0.016 | n/a | 0.283 | 8.967 | n/a | n/a | 0.017 | 3.486 | 0.175 | 0.017 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e1f | 19.855 | 3.088 | 0.242 | 0.000 | 0.036 | 1.216 | 5.199 | 0.020 | n/a | 0.080 | 9.960 | n/a | n/a | 0.015 | 3.366 | 0.170 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e27 | 19.464 | 4.405 | 0.292 | 0.000 | 0.107 | 1.608 | 4.696 | 0.028 | n/a | 0.411 | 7.888 | n/a | n/a | 0.030 | 4.803 | 0.247 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001dfd | 19.298 | 4.093 | n/a | 0.000 | 0.047 | 1.755 | 2.466 | 0.037 | n/a | 1.063 | 9.814 | n/a | n/a | 0.023 | 4.140 | 0.215 | 0.023 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e15 | 19.245 | 4.047 | 0.174 | 0.000 | 0.044 | 1.300 | 7.485 | 0.020 | n/a | 0.073 | 6.087 | n/a | n/a | 0.016 | 4.265 | 0.222 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e0f | 19.146 | 3.725 | 0.282 | 0.000 | 0.119 | 1.338 | 5.323 | 0.031 | n/a | 0.079 | 8.210 | n/a | n/a | 0.039 | 4.126 | 0.216 | 0.039 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.918 | 0.557 | 0.000 | 0.424 | 2.196 | n/a | 0.000 | 0.049 | 0.564 | 0.976 | 0.016 | n/a | 0.095 | 5.262 | n/a | n/a | 0.021 | 2.353 | 0.241 | 0.021 |
| p99 | 34.418 | 1.999 | 0.000 | 0.869 | 4.352 | n/a | 0.000 | 1.902 | 1.349 | 4.755 | 0.043 | n/a | 0.626 | 30.492 | n/a | n/a | 0.055 | 4.508 | 0.409 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e41498887330000000000001e88 | 34.418 | 2.418 | n/a | 0.000 | 0.072 | 0.534 | 0.793 | 0.012 | n/a | 0.054 | 30.492 | n/a | n/a | 0.043 | 2.490 | 0.072 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.619ms |
| 28a43e41498887330000000000001de7 | 21.303 | 1.934 | n/a | 0.000 | 0.030 | 0.474 | 4.110 | 0.017 | n/a | 0.066 | 14.655 | n/a | n/a | 0.017 | 1.964 | 0.092 | 0.017 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e51 | 18.334 | 4.352 | n/a | 0.000 | 0.156 | 1.216 | 2.666 | 0.043 | n/a | 0.611 | 9.236 | n/a | n/a | 0.055 | 4.508 | 0.246 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001de9 | 16.709 | 3.614 | n/a | 0.000 | 0.038 | 0.920 | 4.755 | 0.032 | n/a | 0.134 | 7.197 | n/a | n/a | 0.019 | 3.653 | 0.219 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001def | 15.903 | 2.493 | n/a | 0.000 | 0.076 | 0.504 | 1.069 | 0.013 | n/a | 0.054 | 11.655 | n/a | n/a | 0.039 | 2.569 | 0.162 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e45 | 15.766 | 2.175 | n/a | 0.000 | 0.046 | 0.980 | 1.929 | 0.036 | n/a | 0.144 | 10.428 | n/a | n/a | 0.028 | 2.221 | 0.141 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e1b | 13.977 | 2.498 | n/a | 0.000 | 0.052 | 0.715 | 0.976 | 0.018 | n/a | 0.067 | 9.624 | n/a | n/a | 0.027 | 2.550 | 0.182 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e77 | 12.483 | 3.977 | n/a | 0.000 | 0.056 | 1.349 | 1.239 | 0.023 | n/a | 0.082 | 5.731 | n/a | n/a | 0.024 | 4.033 | 0.323 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.927ms |
| 28a43e41498887330000000000001e71 | 11.696 | 3.501 | n/a | 0.000 | 0.043 | 1.164 | 2.079 | 0.038 | n/a | 0.155 | 4.694 | n/a | n/a | 0.021 | 3.544 | 0.303 | 0.021 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e5b | 11.404 | 3.253 | n/a | 0.000 | 0.094 | 0.595 | 2.032 | 0.027 | n/a | 0.096 | 5.262 | n/a | n/a | 0.046 | 3.347 | 0.293 | 0.046 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e25 | 11.094 | 3.155 | n/a | 0.000 | 0.095 | 0.711 | 0.782 | 0.013 | n/a | 0.073 | 6.224 | n/a | n/a | 0.041 | 3.250 | 0.293 | 0.041 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.110ms |
| 28a43e41498887330000000000001df9 | 10.689 | 2.715 | n/a | 0.000 | 0.059 | 1.134 | 0.886 | 0.012 | n/a | 0.626 | 5.232 | n/a | n/a | 0.024 | 2.774 | 0.259 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ded | 10.680 | 1.842 | n/a | 0.000 | 0.049 | 1.243 | 1.385 | 0.025 | n/a | 0.077 | 6.040 | n/a | n/a | 0.020 | 1.891 | 0.177 | 0.020 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e8e | 10.469 | 1.875 | n/a | 0.000 | 0.030 | 0.413 | 1.067 | 0.012 | n/a | 0.048 | 7.010 | n/a | n/a | 0.015 | 1.905 | 0.182 | 0.015 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e03 | 10.437 | 1.537 | n/a | 0.000 | 0.028 | 0.416 | 0.907 | 0.013 | n/a | 0.268 | 7.251 | n/a | n/a | 0.015 | 1.565 | 0.150 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e6e | 10.408 | 1.886 | n/a | 0.000 | 1.902 | 0.394 | 0.737 | 0.013 | n/a | 0.045 | 5.417 | n/a | n/a | 0.015 | 3.788 | 0.364 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e11 | 9.983 | 1.930 | n/a | 0.000 | 0.038 | 0.400 | 0.826 | 0.014 | n/a | 0.056 | 6.695 | n/a | n/a | 0.026 | 1.968 | 0.197 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001dd8 | 9.918 | 3.416 | n/a | 0.000 | 0.109 | 0.794 | 0.989 | 0.016 | n/a | 0.408 | 4.146 | n/a | n/a | 0.041 | 3.524 | 0.355 | 0.041 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e0d | 9.907 | 1.718 | n/a | 0.000 | 0.032 | 0.303 | 1.141 | 0.016 | n/a | 0.323 | 6.361 | n/a | n/a | 0.015 | 1.750 | 0.177 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.415ms |
| 28a43e41498887330000000000001e17 | 9.842 | 2.560 | n/a | 0.000 | 0.053 | 0.765 | 1.083 | 0.014 | n/a | 0.053 | 5.292 | n/a | n/a | 0.022 | 2.613 | 0.266 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.197 | 0.000 | 0.000 | 0.387 | 3.004 | n/a | 0.000 | 0.046 | 0.808 | 1.735 | 0.017 | n/a | 0.094 | 6.920 | n/a | n/a | 0.021 | 3.288 | 0.230 | 0.021 |
| p99 | 57.235 | 2.910 | 0.000 | 2.514 | 5.967 | n/a | 1.470 | 3.140 | 4.171 | 41.421 | 0.186 | n/a | 3.593 | 30.108 | n/a | n/a | 0.087 | 8.813 | 0.438 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e41498887330000000000001efd | 57.235 | 3.103 | 0.157 | 0.000 | 0.033 | 1.129 | 41.421 | 0.016 | n/a | 0.053 | 11.307 | n/a | n/a | 0.014 | 3.293 | 0.058 | 0.014 | gw-w/thread-45/gateway.admitted-work | none observed |
| 28a43e41498887330000000000001ef1 | 41.816 | 4.614 | 0.259 | 0.000 | 0.051 | 1.323 | 5.340 | 0.022 | n/a | 0.081 | 30.108 | n/a | n/a | 0.020 | 4.924 | 0.118 | 0.020 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ea3 | 30.027 | 4.335 | 0.341 | 0.000 | 0.036 | 1.059 | 16.157 | 0.016 | n/a | 0.038 | 8.031 | n/a | n/a | 0.014 | 4.712 | 0.157 | 0.014 | gw-w/thread-40/gateway.admitted-work | none observed |
| 28a43e41498887330000000000001eb5 | 27.659 | 3.991 | 0.163 | 0.000 | 0.022 | 1.106 | 10.451 | 0.017 | n/a | 0.084 | 11.815 | n/a | n/a | 0.010 | 4.177 | 0.151 | 0.010 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.024ms |
| 28a43e41498887330000000000001eb0 | 25.233 | 2.963 | 0.175 | 0.000 | 0.033 | 1.120 | 5.448 | 0.021 | n/a | 0.082 | 15.374 | n/a | n/a | 0.017 | 3.172 | 0.126 | 0.017 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001eaf | 23.327 | 5.507 | n/a | 0.000 | 0.056 | 1.888 | 11.604 | 0.019 | n/a | 0.070 | 4.156 | n/a | n/a | 0.028 | 5.563 | 0.238 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f37 | 21.224 | 2.917 | 0.240 | 0.000 | 0.039 | 1.261 | 4.545 | 0.016 | n/a | 0.069 | 12.119 | n/a | n/a | 0.018 | 3.196 | 0.151 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ee5 | 21.224 | 3.724 | 0.183 | 0.000 | 0.045 | 1.463 | 9.362 | 0.027 | n/a | 0.070 | 6.330 | n/a | n/a | 0.020 | 3.952 | 0.186 | 0.020 | gw-w/thread-45/gateway.admitted-work | none observed |
| 28a43e41498887330000000000001f0d | 21.010 | 2.936 | 0.192 | 0.000 | 0.050 | 4.171 | 2.590 | 0.022 | n/a | 0.062 | 10.968 | n/a | n/a | 0.018 | 3.178 | 0.151 | 0.018 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ec2 | 20.754 | 2.750 | 0.161 | 0.000 | 0.029 | 1.099 | 3.747 | 0.016 | n/a | 3.593 | 9.345 | n/a | n/a | 0.013 | 2.941 | 0.142 | 0.013 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f52 | 20.713 | 5.967 | n/a | 1.470 | 1.376 | 0.797 | 1.403 | 0.016 | n/a | 0.291 | 9.334 | n/a | n/a | 0.059 | 8.813 | 0.425 | 0.059 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ed2 | 20.342 | 3.568 | 0.334 | 0.000 | 0.033 | 1.547 | 2.052 | 0.038 | n/a | 3.517 | 9.238 | n/a | n/a | 0.015 | 3.935 | 0.193 | 0.015 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f2f | 20.207 | 3.029 | 0.220 | 0.000 | 0.085 | 1.136 | 4.312 | 0.017 | n/a | 0.283 | 11.100 | n/a | n/a | 0.025 | 3.333 | 0.165 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001eab | 19.515 | 3.427 | 0.238 | 0.000 | 0.048 | 0.888 | 4.094 | 0.016 | n/a | 0.236 | 10.554 | n/a | n/a | 0.015 | 3.713 | 0.190 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001eb4 | 19.303 | 2.479 | n/a | 0.000 | 1.918 | 0.831 | 4.660 | 0.025 | n/a | 0.124 | 9.240 | n/a | n/a | 0.025 | 4.398 | 0.228 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f11 | 19.241 | 2.915 | 0.189 | 0.000 | 0.046 | 1.214 | 8.001 | 0.025 | n/a | 0.360 | 6.469 | n/a | n/a | 0.021 | 3.149 | 0.164 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ea5 | 19.094 | 1.655 | n/a | 0.000 | 0.042 | 0.570 | 1.280 | 0.017 | n/a | 0.047 | 15.464 | n/a | n/a | 0.019 | 1.697 | 0.089 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f4b | 19.027 | 3.832 | 0.240 | 0.000 | 0.042 | 1.172 | 6.447 | 0.018 | n/a | 0.748 | 6.495 | n/a | n/a | 0.034 | 4.115 | 0.216 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ea9 | 18.924 | 4.576 | n/a | 0.000 | 0.061 | 1.642 | 1.221 | 0.014 | n/a | 0.053 | 11.332 | n/a | n/a | 0.025 | 4.636 | 0.245 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f35 | 18.460 | 3.404 | 0.182 | 0.000 | 0.047 | 1.271 | 6.553 | 0.036 | n/a | 0.287 | 6.663 | n/a | n/a | 0.018 | 3.633 | 0.197 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.328 | 0.000 | 0.000 | 0.427 | 2.276 | n/a | 0.000 | 0.052 | 0.606 | 1.126 | 0.015 | n/a | 0.097 | 5.742 | n/a | n/a | 0.023 | 2.415 | 0.238 | 0.023 |
| p99 | 23.327 | 2.910 | 0.000 | 1.961 | 5.507 | n/a | 1.273 | 3.140 | 1.944 | 11.604 | 0.186 | n/a | 0.567 | 15.464 | n/a | n/a | 0.087 | 5.738 | 0.431 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e41498887330000000000001eaf | 23.327 | 5.507 | n/a | 0.000 | 0.056 | 1.888 | 11.604 | 0.019 | n/a | 0.070 | 4.156 | n/a | n/a | 0.028 | 5.563 | 0.238 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ea5 | 19.094 | 1.655 | n/a | 0.000 | 0.042 | 0.570 | 1.280 | 0.017 | n/a | 0.047 | 15.464 | n/a | n/a | 0.019 | 1.697 | 0.089 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ed8 | 18.426 | 3.889 | n/a | 0.000 | 0.058 | 1.862 | 9.288 | 0.038 | n/a | 0.567 | 2.702 | n/a | n/a | 0.022 | 3.947 | 0.214 | 0.022 | gw-w/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.216ms |
| 28a43e41498887330000000000001e9c | 15.520 | 2.276 | n/a | 0.000 | 0.031 | 1.944 | 1.735 | 0.027 | n/a | 0.175 | 9.318 | n/a | n/a | 0.015 | 2.307 | 0.149 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f4d | 15.515 | 3.703 | n/a | 0.000 | 1.590 | 0.606 | 1.004 | 0.015 | n/a | 0.321 | 8.188 | n/a | n/a | 0.087 | 5.293 | 0.341 | 0.087 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f2c | 15.411 | 2.060 | n/a | 0.000 | 3.140 | 0.804 | 0.620 | 0.013 | n/a | 0.035 | 8.726 | n/a | n/a | 0.013 | 5.200 | 0.337 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001eef | 15.135 | 1.641 | n/a | 0.000 | 0.043 | 0.606 | 1.426 | 0.021 | n/a | 0.098 | 11.277 | n/a | n/a | 0.022 | 1.684 | 0.111 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ed6 | 14.654 | 2.009 | n/a | 0.000 | 0.035 | 0.386 | 1.142 | 0.016 | n/a | 0.074 | 10.977 | n/a | n/a | 0.015 | 2.043 | 0.139 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f38 | 14.520 | 1.966 | n/a | 0.000 | 0.034 | 0.512 | 1.194 | 0.014 | n/a | 0.086 | 10.696 | n/a | n/a | 0.019 | 2.000 | 0.138 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ec0 | 13.768 | 3.190 | n/a | 0.000 | 2.547 | 0.688 | 1.021 | 0.019 | n/a | 0.060 | 6.224 | n/a | n/a | 0.019 | 5.738 | 0.417 | 0.019 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f25 | 13.102 | 4.227 | n/a | 0.000 | 0.056 | 0.895 | 1.126 | 0.014 | n/a | 0.071 | 6.687 | n/a | n/a | 0.027 | 4.282 | 0.327 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001edb | 13.038 | 2.179 | n/a | 0.000 | 0.052 | 1.044 | 2.387 | 0.186 | n/a | 0.219 | 6.945 | n/a | n/a | 0.027 | 2.231 | 0.171 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f33 | 12.863 | 3.921 | n/a | 0.000 | 0.046 | 1.076 | 2.118 | 0.040 | n/a | 0.169 | 5.468 | n/a | n/a | 0.025 | 3.967 | 0.308 | 0.025 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ecc | 12.632 | 2.037 | n/a | 0.000 | 0.052 | 1.088 | 1.591 | 0.023 | n/a | 0.101 | 7.713 | n/a | n/a | 0.028 | 2.088 | 0.165 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e98 | 12.268 | 2.353 | n/a | 0.000 | 0.062 | 0.672 | 1.205 | 0.022 | n/a | 0.135 | 7.796 | n/a | n/a | 0.025 | 2.415 | 0.197 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ea0 | 11.947 | 3.082 | n/a | 0.000 | 0.091 | 0.747 | 0.923 | 0.015 | n/a | 0.089 | 6.966 | n/a | n/a | 0.034 | 3.173 | 0.266 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.360ms |
| 28a43e41498887330000000000001ec8 | 11.356 | 4.247 | n/a | 0.000 | 0.128 | 0.666 | 0.944 | 0.015 | n/a | 0.310 | 5.021 | n/a | n/a | 0.025 | 4.375 | 0.385 | 0.025 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001e9e | 11.328 | 2.322 | n/a | 0.000 | 0.045 | 0.561 | 1.132 | 0.017 | n/a | 0.057 | 7.175 | n/a | n/a | 0.020 | 2.366 | 0.209 | 0.020 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001edd | 11.148 | 2.179 | n/a | 0.000 | 0.053 | 0.623 | 1.241 | 0.022 | n/a | 0.291 | 6.711 | n/a | n/a | 0.027 | 2.232 | 0.200 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001eb8 | 11.131 | 2.261 | n/a | 0.000 | 0.036 | 0.592 | 1.945 | 0.015 | n/a | 0.071 | 6.189 | n/a | n/a | 0.021 | 2.297 | 0.206 | 0.021 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (365 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.044 | 0.000 | 0.000 | 0.488 | 3.122 | n/a | 0.000 | 0.046 | 0.820 | 1.405 | 0.018 | n/a | 0.080 | 5.344 | n/a | n/a | 0.030 | 3.474 | 0.285 | 0.030 |
| p99 | 38.050 | 3.377 | 0.000 | 3.036 | 7.524 | n/a | 2.247 | 1.884 | 4.147 | 11.357 | 0.052 | n/a | 3.342 | 27.171 | n/a | n/a | 0.086 | 9.111 | 0.525 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e41498887330000000000001fd6 | 62.497 | 3.594 | n/a | 0.000 | 0.115 | 1.534 | 0.993 | 0.015 | n/a | 0.343 | 55.842 | n/a | n/a | 0.062 | 3.709 | 0.059 | 0.062 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000020ae | 54.406 | 1.598 | n/a | 0.000 | 0.032 | 0.411 | 0.938 | 0.013 | n/a | 0.253 | 51.141 | n/a | n/a | 0.020 | 1.630 | 0.030 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000209e | 47.159 | 3.188 | 0.181 | 0.000 | 0.043 | 0.928 | 30.944 | 0.017 | n/a | 0.084 | 11.746 | n/a | n/a | 0.028 | 3.412 | 0.072 | 0.028 | gw-w/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.932ms |
| 28a43e414988873300000000000021d2 | 38.050 | 3.914 | 0.145 | 0.000 | 0.039 | 0.535 | 1.079 | 0.015 | n/a | 0.059 | 32.237 | n/a | n/a | 0.027 | 4.097 | 0.108 | 0.027 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000201b | 35.748 | 3.464 | 0.265 | 0.000 | 0.058 | 1.023 | 3.630 | 0.019 | n/a | 0.089 | 27.171 | n/a | n/a | 0.029 | 3.787 | 0.106 | 0.029 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.357ms |
| 28a43e41498887330000000000001f8a | 33.978 | 5.956 | n/a | 0.000 | 0.032 | 2.740 | 23.247 | 0.029 | n/a | 0.235 | 1.706 | n/a | n/a | 0.034 | 5.988 | 0.176 | 0.034 | gw-w/thread-63/gateway.response-write | none observed |
| 28a43e41498887330000000000001fb8 | 32.293 | 5.332 | 0.315 | 0.000 | 0.049 | 1.687 | 6.096 | 0.016 | n/a | 0.068 | 18.698 | n/a | n/a | 0.030 | 5.697 | 0.176 | 0.030 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.373ms |
| 28a43e41498887330000000000002221 | 31.070 | 4.040 | 0.244 | 0.000 | 0.034 | 1.406 | 11.357 | 0.018 | n/a | 0.264 | 13.684 | n/a | n/a | 0.023 | 4.318 | 0.139 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000020d2 | 27.835 | 4.770 | 0.445 | 0.000 | 0.045 | 1.831 | 4.650 | 0.017 | n/a | 0.293 | 15.753 | n/a | n/a | 0.031 | 5.260 | 0.189 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000020af | 27.050 | 3.835 | 0.149 | 0.000 | 0.054 | 0.842 | 3.169 | 0.016 | n/a | 0.055 | 18.902 | n/a | n/a | 0.027 | 4.038 | 0.149 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.019ms |
| 28a43e41498887330000000000002161 | 26.830 | 3.543 | 0.439 | 0.000 | 0.013 | 2.318 | 6.529 | 0.020 | n/a | 1.890 | 12.063 | n/a | n/a | 0.016 | 3.995 | 0.149 | 0.016 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.019ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.059ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.015ms |
| 28a43e41498887330000000000001ff1 | 25.459 | 4.801 | 0.179 | 0.000 | 0.047 | 0.919 | 4.294 | 0.015 | n/a | 0.042 | 15.137 | n/a | n/a | 0.025 | 5.027 | 0.197 | 0.025 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.821ms |
| 28a43e41498887330000000000001f92 | 25.336 | 5.553 | n/a | 0.000 | 1.694 | 0.895 | 2.634 | 0.030 | n/a | 0.134 | 14.369 | n/a | n/a | 0.028 | 7.246 | 0.286 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001fed | 24.430 | 4.375 | 0.585 | 0.000 | 0.034 | 1.584 | 5.261 | 0.029 | n/a | 0.075 | 12.461 | n/a | n/a | 0.025 | 4.994 | 0.204 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.802ms |
| 28a43e41498887330000000000002181 | 24.192 | 2.827 | 0.161 | 0.000 | 0.033 | 0.736 | 16.323 | 0.030 | n/a | 0.058 | 3.996 | n/a | n/a | 0.027 | 3.022 | 0.125 | 0.027 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 28a43e41498887330000000000002035 | 24.129 | 2.833 | 0.225 | 0.000 | 0.118 | 3.062 | 8.579 | 0.023 | n/a | 0.064 | 9.178 | n/a | n/a | 0.047 | 3.176 | 0.132 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.349ms |
| 28a43e41498887330000000000001fda | 23.905 | 4.100 | 0.165 | 0.000 | 0.046 | 1.447 | 4.910 | 0.021 | n/a | 0.074 | 13.110 | n/a | n/a | 0.031 | 4.311 | 0.180 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.389ms |
| 28a43e41498887330000000000002187 | 22.742 | 3.122 | 0.314 | 0.000 | 0.039 | 1.162 | 8.900 | 0.049 | n/a | 0.497 | 8.633 | n/a | n/a | 0.026 | 3.474 | 0.153 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000002088 | 22.396 | 3.679 | 0.260 | 0.000 | 0.103 | 0.911 | 4.523 | 0.017 | n/a | 0.042 | 12.808 | n/a | n/a | 0.053 | 4.043 | 0.181 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000021e9 | 21.957 | 3.284 | 0.291 | 0.000 | 0.155 | 0.841 | 8.833 | 0.017 | n/a | 0.269 | 8.216 | n/a | n/a | 0.050 | 3.730 | 0.170 | 0.050 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.258 | 0.000 | 0.000 | 0.452 | 2.439 | n/a | 0.000 | 0.051 | 0.682 | 1.029 | 0.016 | n/a | 0.091 | 4.655 | n/a | n/a | 0.031 | 2.683 | 0.263 | 0.031 |
| p99 | 54.406 | 1.999 | 0.000 | 0.973 | 5.956 | n/a | 0.000 | 2.393 | 4.059 | 4.885 | 0.052 | n/a | 3.344 | 51.141 | n/a | n/a | 0.086 | 6.778 | 0.440 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28a43e41498887330000000000001fd6 | 62.497 | 3.594 | n/a | 0.000 | 0.115 | 1.534 | 0.993 | 0.015 | n/a | 0.343 | 55.842 | n/a | n/a | 0.062 | 3.709 | 0.059 | 0.062 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000020ae | 54.406 | 1.598 | n/a | 0.000 | 0.032 | 0.411 | 0.938 | 0.013 | n/a | 0.253 | 51.141 | n/a | n/a | 0.020 | 1.630 | 0.030 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f8a | 33.978 | 5.956 | n/a | 0.000 | 0.032 | 2.740 | 23.247 | 0.029 | n/a | 0.235 | 1.706 | n/a | n/a | 0.034 | 5.988 | 0.176 | 0.034 | gw-w/thread-63/gateway.response-write | none observed |
| 28a43e4149888733000000000000207e | 21.562 | 1.822 | n/a | 0.000 | 0.472 | 0.571 | 1.025 | 0.015 | n/a | 0.064 | 17.570 | n/a | n/a | 0.023 | 2.294 | 0.106 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.411ms |
| 28a43e4149888733000000000000208c | 18.857 | 6.727 | n/a | 0.000 | 0.051 | 2.509 | 3.001 | 0.052 | n/a | 0.220 | 6.267 | n/a | n/a | 0.030 | 6.778 | 0.359 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000002043 | 18.240 | 2.460 | n/a | 0.000 | 1.229 | 1.074 | 2.163 | 0.166 | n/a | 0.469 | 10.654 | n/a | n/a | 0.027 | 3.689 | 0.202 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000216a | 17.939 | 2.063 | n/a | 0.000 | 1.293 | 0.710 | 1.614 | 0.021 | n/a | 0.371 | 11.838 | n/a | n/a | 0.027 | 3.357 | 0.187 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001fd8 | 16.117 | 1.675 | n/a | 0.000 | 0.049 | 0.563 | 0.791 | 0.014 | n/a | 0.194 | 12.788 | n/a | n/a | 0.045 | 1.723 | 0.107 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001f7b | 15.675 | 2.238 | n/a | 0.000 | 0.042 | 0.767 | 1.394 | 0.049 | n/a | 0.613 | 10.541 | n/a | n/a | 0.032 | 2.280 | 0.145 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001ff5 | 14.995 | 1.597 | n/a | 0.000 | 0.051 | 4.147 | 0.749 | 0.013 | n/a | 3.344 | 5.068 | n/a | n/a | 0.027 | 1.648 | 0.110 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.354ms |
| 28a43e4149888733000000000000205e | 14.743 | 2.768 | n/a | 0.000 | 0.086 | 4.059 | 0.796 | 0.013 | n/a | 3.342 | 3.629 | n/a | n/a | 0.049 | 2.854 | 0.194 | 0.049 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000021ba | 14.553 | 3.394 | n/a | 0.000 | 0.045 | 1.071 | 3.304 | 0.020 | n/a | 0.048 | 6.639 | n/a | n/a | 0.032 | 3.439 | 0.236 | 0.032 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000002188 | 14.384 | 5.662 | n/a | 0.000 | 0.138 | 1.718 | 3.798 | 0.052 | n/a | 0.792 | 2.139 | n/a | n/a | 0.086 | 5.800 | 0.403 | 0.086 | node-14/thread-0/driver.execute | none observed |
| 28a43e41498887330000000000001f8e | 14.165 | 4.876 | n/a | 0.000 | 2.807 | 0.917 | 1.049 | 0.016 | n/a | 0.077 | 4.344 | n/a | n/a | 0.077 | 7.684 | 0.542 | 0.077 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.758ms |
| 28a43e4149888733000000000000200f | 13.964 | 2.580 | n/a | 0.000 | 0.045 | 0.521 | 1.147 | 0.018 | n/a | 0.065 | 9.556 | n/a | n/a | 0.032 | 2.625 | 0.188 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001fa6 | 13.731 | 2.803 | n/a | 0.000 | 0.066 | 0.998 | 1.282 | 0.021 | n/a | 0.093 | 8.422 | n/a | n/a | 0.045 | 2.869 | 0.209 | 0.045 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e414988873300000000000021d4 | 13.641 | 3.935 | n/a | 0.000 | 0.127 | 0.593 | 1.361 | 0.023 | n/a | 0.086 | 7.440 | n/a | n/a | 0.076 | 4.062 | 0.298 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e41498887330000000000001fde | 13.086 | 4.518 | n/a | 0.000 | 0.099 | 1.651 | 4.885 | 0.032 | n/a | 0.091 | 1.752 | n/a | n/a | 0.058 | 4.617 | 0.353 | 0.058 | gw-w/thread-43/gateway.admitted-work | none observed |
| 28a43e41498887330000000000001f9d | 13.026 | 2.900 | n/a | 0.000 | 0.808 | 0.499 | 1.083 | 0.014 | n/a | 0.069 | 7.621 | n/a | n/a | 0.032 | 3.708 | 0.285 | 0.032 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 28a43e4149888733000000000000204f | 12.884 | 4.324 | n/a | 0.000 | 0.096 | 2.315 | 3.709 | 0.044 | n/a | 0.492 | 1.842 | n/a | n/a | 0.060 | 4.421 | 0.343 | 0.060 | node-14/thread-0/driver.execute | none observed |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.692 | n/a | n/a | n/a | 2.655 | n/a | 0.000 | 0.000 | 1.131 | 200.319 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.227 | 2.655 | 0.007 | 0.227 |
| p99 | 382.085 | n/a | n/a | n/a | 19.821 | n/a | 1.879 | 0.000 | 11.615 | 378.090 | 0.103 | n/a | 0.159 | 0.000 | n/a | n/a | 42.958 | 20.901 | 0.320 | 42.958 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd940000000000000002 | 382.085 | 2.655 | n/a | 0.000 | 0.000 | 0.844 | 378.090 | 0.103 | n/a | 0.085 | 0.000 | n/a | n/a | 0.309 | 2.655 | 0.007 | 0.309 | gw-r/thread-45/gateway.admitted-work | none observed |
| 13add84c02e22bc80000000000000006 | 206.486 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 205.367 | 0.055 | n/a | 0.159 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000005 | 202.373 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 200.973 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-45/journal/page | none observed |
| 13add84c02e22bc80000000000001479 | 200.887 | 0.000 | n/a | 0.000 | 0.000 | 0.323 | 200.489 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.055 | 0.000 | 0.000 | 0.055 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc8000000000000147a | 200.692 | 0.000 | n/a | 0.000 | 0.000 | 0.291 | 200.319 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.058 | 0.000 | 0.000 | 0.058 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc8000000000000147f | 91.618 | 17.514 | n/a | 0.000 | 0.000 | 3.759 | 70.109 | 0.004 | n/a | 0.005 | 0.000 | n/a | n/a | 0.227 | 17.514 | 0.191 | 0.227 | gw-r/thread-62/gateway.admitted-work | none observed |
| 13add84c02e22bc8000000000000147d | 73.995 | 19.022 | n/a | 1.879 | 0.000 | 11.615 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.479 | 20.901 | 0.282 | 41.479 | node-14/thread-5/socket.wait-first-byte | none observed |
| 13add84c02e22bc80000000000001480 | 63.576 | 12.903 | n/a | 1.301 | 0.000 | 6.414 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.958 | 14.204 | 0.223 | 42.958 | node-14/thread-5/socket.wait-first-byte | none observed |
| 13add84c02e22bc8000000000000147e | 61.966 | 19.821 | n/a | 0.000 | 0.000 | 5.707 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.437 | 19.821 | 0.320 | 36.437 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 821.805 | n/a | n/a | n/a | 2.031 | n/a | 0.000 | 0.000 | 0.650 | 805.494 | 0.007 | n/a | 0.137 | 0.000 | n/a | n/a | 1.223 | 2.031 | 0.019 | 1.223 |
| p99 | 1006.967 | n/a | n/a | n/a | 15.256 | n/a | 0.000 | 0.000 | 1.290 | 1003.952 | 0.019 | n/a | 0.272 | 0.000 | n/a | n/a | 18.140 | 15.256 | 0.100 | 18.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd9400000000000000a4 | 1006.967 | 0.212 | n/a | 0.000 | 0.000 | 1.290 | 1003.952 | 0.019 | n/a | 0.272 | 0.000 | n/a | n/a | 1.223 | 0.212 | 0.000 | 1.223 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd9400000000000000a5 | 821.805 | 15.256 | n/a | 0.000 | 0.000 | 0.650 | 805.494 | 0.007 | n/a | 0.137 | 0.000 | n/a | n/a | 0.261 | 15.256 | 0.019 | 0.261 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000000e47 | 20.379 | 2.031 | n/a | 0.000 | 0.000 | 0.208 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.140 | 2.031 | 0.100 | 18.140 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 441.079 | n/a | n/a | n/a | 2.595 | n/a | 0.000 | 0.000 | 0.929 | 437.036 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.099 | 2.595 | 0.007 | 0.099 |
| p99 | 1005.459 | n/a | n/a | n/a | 5.939 | n/a | 0.000 | 0.000 | 4.351 | 1001.612 | 0.502 | n/a | 0.253 | 0.000 | n/a | n/a | 20.768 | 5.939 | 0.149 | 20.768 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd9400000000000000ae | 1005.459 | 0.126 | n/a | 0.000 | 0.000 | 2.449 | 1001.612 | 0.019 | n/a | 0.154 | 0.000 | n/a | n/a | 1.099 | 0.126 | 0.000 | 1.099 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd9400000000000000bc | 1005.035 | 0.150 | n/a | 0.000 | 0.000 | 1.446 | 1001.147 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 2.165 | 0.150 | 0.000 | 2.165 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd9400000000000000b5 | 997.141 | 2.669 | n/a | 0.000 | 0.000 | 0.528 | 993.770 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.087 | 2.669 | 0.003 | 0.087 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd9400000000000000d1 | 988.832 | 2.520 | n/a | 0.000 | 0.000 | 3.147 | 982.976 | 0.018 | n/a | 0.102 | 0.000 | n/a | n/a | 0.069 | 2.520 | 0.003 | 0.069 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd9400000000000000bb | 986.600 | 5.569 | n/a | 0.000 | 0.000 | 0.767 | 980.044 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.143 | 5.569 | 0.006 | 0.143 | gw-r/thread-45/journal/page | none observed |
| 2977df9f30a8fd9400000000000000ab | 910.251 | 2.710 | n/a | 0.000 | 0.000 | 1.341 | 906.027 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.117 | 2.710 | 0.003 | 0.117 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd9400000000000000a8 | 853.551 | 2.095 | n/a | 0.000 | 0.000 | 2.200 | 848.893 | 0.011 | n/a | 0.253 | 0.000 | n/a | n/a | 0.099 | 2.095 | 0.002 | 0.099 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd9400000000000000c3 | 840.527 | 5.939 | n/a | 0.000 | 0.000 | 1.602 | 832.742 | 0.020 | n/a | 0.090 | 0.000 | n/a | n/a | 0.133 | 5.939 | 0.007 | 0.133 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd9400000000000000cc | 709.780 | 2.125 | n/a | 0.000 | 0.000 | 0.925 | 706.483 | 0.017 | n/a | 0.148 | 0.000 | n/a | n/a | 0.082 | 2.125 | 0.003 | 0.082 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd9400000000000000b3 | 624.299 | 2.697 | n/a | 0.000 | 0.000 | 0.454 | 620.959 | 0.017 | n/a | 0.104 | 0.000 | n/a | n/a | 0.069 | 2.697 | 0.004 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd9400000000000000cb | 551.378 | 4.677 | n/a | 0.000 | 0.000 | 0.796 | 545.610 | 0.009 | n/a | 0.120 | 0.000 | n/a | n/a | 0.166 | 4.677 | 0.008 | 0.166 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd9400000000000000c2 | 539.864 | 4.412 | n/a | 0.000 | 0.000 | 1.133 | 534.081 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.128 | 4.412 | 0.008 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd9400000000000000c8 | 509.713 | 2.576 | n/a | 0.000 | 0.000 | 0.567 | 506.393 | 0.038 | n/a | 0.069 | 0.000 | n/a | n/a | 0.070 | 2.576 | 0.005 | 0.070 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd9400000000000000c6 | 494.559 | 2.000 | n/a | 0.000 | 0.000 | 3.179 | 489.156 | 0.021 | n/a | 0.134 | 0.000 | n/a | n/a | 0.068 | 2.000 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd9400000000000000c9 | 453.893 | 2.152 | n/a | 0.000 | 0.000 | 0.624 | 450.999 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.067 | 2.152 | 0.005 | 0.067 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd9400000000000000b8 | 441.079 | 2.806 | n/a | 0.000 | 0.000 | 1.004 | 437.036 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.087 | 2.806 | 0.006 | 0.087 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd9400000000000000a7 | 344.886 | 3.683 | n/a | 0.000 | 0.000 | 4.351 | 336.393 | 0.025 | n/a | 0.146 | 0.000 | n/a | n/a | 0.288 | 3.683 | 0.011 | 0.288 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd9400000000000000b2 | 299.010 | 4.076 | n/a | 0.000 | 0.000 | 1.093 | 293.641 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.109 | 4.076 | 0.014 | 0.109 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd9400000000000000ba | 281.269 | 2.595 | n/a | 0.000 | 0.000 | 0.929 | 277.558 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.084 | 2.595 | 0.009 | 0.084 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd9400000000000000b6 | 276.669 | 5.149 | n/a | 0.000 | 0.000 | 0.468 | 270.361 | 0.502 | n/a | 0.093 | 0.000 | n/a | n/a | 0.096 | 5.149 | 0.019 | 0.096 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 404.074 | n/a | n/a | n/a | 3.227 | n/a | 0.000 | 0.000 | 0.618 | 399.197 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.084 | 3.567 | 0.010 | 0.084 |
| p99 | 1008.613 | n/a | n/a | n/a | 14.089 | n/a | 1.844 | 0.000 | 5.532 | 1000.952 | 0.136 | n/a | 0.126 | 0.000 | n/a | n/a | 41.899 | 14.744 | 0.695 | 41.899 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd9400000000000000d2 | 1008.613 | 10.185 | n/a | 0.733 | 0.000 | 1.585 | 995.896 | 0.012 | n/a | 0.070 | 0.000 | n/a | n/a | 0.132 | 10.918 | 0.011 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd94000000000000010d | 1008.330 | 5.987 | n/a | 0.000 | 0.000 | 1.181 | 1000.952 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.170 | 5.987 | 0.006 | 0.170 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd94000000000000011d | 1004.278 | 0.159 | n/a | 0.000 | 0.000 | 2.105 | 1000.811 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 1.125 | 0.159 | 0.000 | 1.125 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000000114 | 1002.543 | 0.166 | n/a | 0.000 | 0.000 | 0.661 | 1000.562 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 1.105 | 0.166 | 0.000 | 1.105 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd940000000000000105 | 1000.010 | 7.209 | n/a | 0.737 | 0.000 | 0.706 | 991.101 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.182 | 7.946 | 0.008 | 0.182 | gw-r/thread-45/journal/page | none observed |
| 2977df9f30a8fd94000000000000012c | 995.517 | 3.256 | n/a | 0.000 | 0.000 | 0.593 | 991.553 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.071 | 3.256 | 0.003 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd9400000000000000d3 | 995.490 | 3.878 | n/a | 0.976 | 0.000 | 0.447 | 990.014 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.082 | 4.854 | 0.005 | 0.082 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd9400000000000000da | 995.254 | 3.061 | n/a | 0.521 | 0.000 | 2.683 | 988.785 | 0.024 | n/a | 0.110 | 0.000 | n/a | n/a | 0.070 | 3.582 | 0.004 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd94000000000000012b | 994.730 | 5.786 | n/a | 0.000 | 0.000 | 0.583 | 988.127 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.170 | 5.786 | 0.006 | 0.170 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000000127 | 992.190 | 3.007 | n/a | 0.000 | 0.000 | 0.514 | 988.550 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.074 | 3.007 | 0.003 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd9400000000000000fe | 988.718 | 6.263 | n/a | 0.746 | 0.000 | 0.639 | 980.760 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 0.208 | 7.009 | 0.007 | 0.208 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000000138 | 988.560 | 2.636 | n/a | 0.000 | 0.000 | 0.743 | 985.053 | 0.004 | n/a | 0.056 | 0.000 | n/a | n/a | 0.068 | 2.636 | 0.003 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000000154 | 986.528 | 2.896 | n/a | 0.000 | 0.000 | 0.813 | 982.704 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.073 | 2.896 | 0.003 | 0.073 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd9400000000000000df | 984.750 | 2.968 | n/a | 0.392 | 0.000 | 3.447 | 977.757 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.102 | 3.360 | 0.003 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000000101 | 972.038 | 2.879 | n/a | 0.000 | 0.000 | 0.532 | 968.501 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.062 | 2.879 | 0.003 | 0.062 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd9400000000000000d9 | 961.611 | 3.436 | n/a | 0.519 | 0.000 | 0.396 | 957.117 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.083 | 3.955 | 0.004 | 0.083 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd9400000000000000de | 930.201 | 4.053 | n/a | 0.733 | 0.000 | 0.673 | 924.551 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.078 | 4.787 | 0.005 | 0.078 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000000141 | 907.085 | 2.932 | n/a | 0.000 | 0.000 | 0.622 | 903.399 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.082 | 2.932 | 0.003 | 0.082 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000000111 | 896.870 | 2.367 | n/a | 0.584 | 0.000 | 0.442 | 893.326 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.081 | 2.951 | 0.003 | 0.081 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000000128 | 862.924 | 5.232 | n/a | 0.707 | 0.000 | 0.416 | 856.417 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.110 | 5.938 | 0.007 | 0.110 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / internal (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 341.659 | n/a | n/a | n/a | 2.815 | n/a | 0.000 | 0.000 | 0.615 | 337.749 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.070 | 2.869 | 0.008 | 0.070 |
| p99 | 1003.250 | n/a | n/a | n/a | 8.743 | n/a | 0.000 | 0.000 | 4.548 | 1001.078 | 0.116 | n/a | 0.092 | 0.000 | n/a | n/a | 17.456 | 8.743 | 0.702 | 17.456 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd940000000000000186 | 1003.719 | 0.118 | n/a | 0.000 | 0.000 | 0.978 | 1001.449 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 1.104 | 0.118 | 0.000 | 1.104 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000000164 | 1003.250 | 0.161 | n/a | 0.000 | 0.000 | 0.816 | 1001.078 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 1.130 | 0.161 | 0.000 | 1.130 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd94000000000000016e | 1002.574 | 0.181 | n/a | 0.000 | 0.000 | 0.652 | 1000.569 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 1.137 | 0.181 | 0.000 | 1.137 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd9400000000000001c3 | 1002.423 | 0.191 | n/a | 0.000 | 0.000 | 0.486 | 1000.542 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.161 | 0.191 | 0.000 | 1.161 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd9400000000000001ea | 1000.553 | 2.265 | n/a | 0.000 | 0.000 | 0.388 | 997.755 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.076 | 2.265 | 0.002 | 0.076 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd9400000000000001a7 | 996.921 | 2.324 | n/a | 0.000 | 0.000 | 0.463 | 994.016 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.056 | 2.324 | 0.002 | 0.056 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000000185 | 995.935 | 2.809 | n/a | 0.000 | 0.000 | 0.735 | 992.289 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.064 | 2.809 | 0.003 | 0.064 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd94000000000000019a | 989.354 | 2.815 | n/a | 0.000 | 0.000 | 1.039 | 985.379 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.065 | 2.815 | 0.003 | 0.065 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd9400000000000001c5 | 985.953 | 3.753 | n/a | 0.000 | 0.000 | 0.660 | 981.417 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.067 | 3.753 | 0.004 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd94000000000000018b | 983.843 | 2.943 | n/a | 0.000 | 0.000 | 0.473 | 980.324 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.065 | 2.943 | 0.003 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd94000000000000017f | 980.783 | 2.432 | n/a | 0.000 | 0.000 | 0.660 | 977.591 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.062 | 2.432 | 0.002 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd9400000000000001a6 | 963.293 | 2.679 | n/a | 0.000 | 0.000 | 1.308 | 959.216 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.060 | 2.679 | 0.003 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd9400000000000001a4 | 911.776 | 2.583 | n/a | 0.000 | 0.000 | 0.492 | 908.609 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.062 | 2.583 | 0.003 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000000175 | 907.132 | 4.866 | n/a | 0.000 | 0.000 | 0.316 | 901.856 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.065 | 4.866 | 0.005 | 0.065 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd94000000000000019c | 838.614 | 4.113 | n/a | 0.000 | 0.000 | 0.454 | 833.936 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.068 | 4.113 | 0.005 | 0.068 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd9400000000000001f7 | 808.049 | 4.877 | n/a | 0.000 | 0.000 | 0.486 | 802.398 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.250 | 4.877 | 0.006 | 0.250 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd9400000000000001d5 | 804.892 | 3.486 | n/a | 0.000 | 0.000 | 0.621 | 800.599 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.146 | 3.486 | 0.004 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd9400000000000001dd | 772.136 | 2.766 | n/a | 0.000 | 0.000 | 3.000 | 766.276 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.066 | 2.766 | 0.004 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd9400000000000001f0 | 768.592 | 1.911 | n/a | 0.000 | 0.000 | 0.770 | 765.775 | 0.005 | n/a | 0.073 | 0.000 | n/a | n/a | 0.059 | 1.911 | 0.002 | 0.059 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd94000000000000017a | 749.497 | 2.733 | n/a | 0.000 | 0.000 | 1.204 | 745.420 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.066 | 2.733 | 0.004 | 0.066 | gw-r/thread-42/journal/page | none observed |

## P3 / L16 / internal (1533 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.200 | n/a | n/a | n/a | 3.239 | n/a | 0.000 | 0.000 | 0.219 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.217 | 3.256 | 0.265 | 7.217 |
| p99 | 244.405 | n/a | n/a | n/a | 12.060 | n/a | 1.014 | 0.000 | 0.921 | 238.753 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 47.916 | 12.522 | 0.835 | 47.916 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd940000000000000211 | 1008.606 | 4.126 | n/a | 0.000 | 0.000 | 0.696 | 1003.661 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.074 | 4.126 | 0.004 | 0.074 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000000218 | 1002.850 | 0.169 | n/a | 0.000 | 0.000 | 0.453 | 1001.057 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 1.116 | 0.169 | 0.000 | 1.116 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000000216 | 1002.390 | 0.122 | n/a | 0.000 | 0.000 | 0.416 | 1000.684 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 1.104 | 0.122 | 0.000 | 1.104 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000000212 | 999.846 | 2.308 | n/a | 0.000 | 0.000 | 0.398 | 997.051 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.057 | 2.308 | 0.002 | 0.057 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd9400000000000001fe | 994.499 | 2.204 | n/a | 0.000 | 0.000 | 0.385 | 991.793 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.058 | 2.204 | 0.002 | 0.058 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000000225 | 985.047 | 2.462 | n/a | 0.000 | 0.000 | 0.406 | 982.077 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.062 | 2.462 | 0.002 | 0.062 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000000215 | 928.442 | 2.895 | n/a | 0.000 | 0.000 | 0.525 | 924.924 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.064 | 2.895 | 0.003 | 0.064 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000000226 | 921.924 | 6.102 | n/a | 0.000 | 0.000 | 0.628 | 914.631 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.519 | 6.102 | 0.007 | 0.519 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd94000000000000021a | 898.698 | 1.624 | n/a | 0.000 | 0.000 | 0.498 | 896.418 | 0.028 | n/a | 0.059 | 0.000 | n/a | n/a | 0.070 | 1.624 | 0.002 | 0.070 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000000207 | 896.037 | 5.423 | n/a | 0.000 | 0.000 | 0.662 | 889.761 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.159 | 5.423 | 0.006 | 0.159 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd9400000000000001ff | 853.219 | 2.037 | n/a | 0.000 | 0.000 | 1.546 | 849.501 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.065 | 2.037 | 0.002 | 0.065 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000000221 | 789.653 | 2.484 | n/a | 0.000 | 0.000 | 0.347 | 786.706 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.055 | 2.484 | 0.003 | 0.055 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000000202 | 778.272 | 2.368 | n/a | 0.000 | 0.000 | 0.377 | 775.387 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.080 | 2.368 | 0.003 | 0.080 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd94000000000000021d | 765.538 | 2.131 | n/a | 0.000 | 0.000 | 0.511 | 762.787 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.063 | 2.131 | 0.003 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd94000000000000020f | 445.982 | 2.556 | n/a | 0.000 | 0.000 | 0.460 | 442.797 | 0.014 | n/a | 0.097 | 0.000 | n/a | n/a | 0.058 | 2.556 | 0.006 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd94000000000000021e | 244.405 | 4.742 | n/a | 0.000 | 0.000 | 0.643 | 238.753 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.231 | 4.742 | 0.019 | 0.231 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd94000000000000020e | 240.212 | 3.765 | n/a | 0.000 | 0.000 | 0.990 | 235.363 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.068 | 3.765 | 0.016 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000000203 | 218.646 | 2.790 | n/a | 0.000 | 0.000 | 0.603 | 215.145 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.065 | 2.790 | 0.013 | 0.065 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000000224 | 216.016 | 2.593 | n/a | 0.000 | 0.000 | 1.109 | 212.222 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.064 | 2.593 | 0.012 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd940000000000000208 | 176.401 | 3.375 | n/a | 0.000 | 0.000 | 0.528 | 172.239 | 0.085 | n/a | 0.011 | 0.000 | n/a | n/a | 0.163 | 3.375 | 0.019 | 0.163 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (1581 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.882 | n/a | n/a | n/a | 3.952 | n/a | 0.000 | 0.000 | 0.204 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.023 | 3.981 | 0.340 | 6.023 |
| p99 | 386.183 | n/a | n/a | n/a | 15.218 | n/a | 1.359 | 0.000 | 1.459 | 377.845 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 45.073 | 15.936 | 0.857 | 45.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd940000000000001acd | 1001.940 | 0.083 | n/a | 0.000 | 0.000 | 0.269 | 1000.465 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 1.090 | 0.083 | 0.000 | 1.090 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000001ad2 | 989.175 | 2.302 | n/a | 0.000 | 0.000 | 0.276 | 986.515 | 0.008 | n/a | 0.023 | 0.000 | n/a | n/a | 0.052 | 2.302 | 0.002 | 0.052 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001ad6 | 963.905 | 2.356 | n/a | 0.000 | 0.000 | 0.236 | 961.213 | 0.011 | n/a | 0.034 | 0.000 | n/a | n/a | 0.055 | 2.356 | 0.002 | 0.055 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000001aef | 941.120 | 2.854 | n/a | 0.000 | 0.000 | 0.585 | 937.582 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.056 | 2.854 | 0.003 | 0.056 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001acf | 933.451 | 7.762 | n/a | 1.081 | 0.000 | 0.338 | 923.652 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 0.564 | 8.843 | 0.009 | 0.564 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001ae0 | 930.026 | 4.327 | n/a | 0.000 | 0.000 | 0.433 | 925.148 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.095 | 4.327 | 0.005 | 0.095 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001acb | 868.859 | 2.143 | n/a | 0.000 | 0.000 | 0.365 | 866.263 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.054 | 2.143 | 0.002 | 0.054 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001af2 | 717.262 | 2.632 | n/a | 0.000 | 0.000 | 0.638 | 713.870 | 0.011 | n/a | 0.045 | 0.000 | n/a | n/a | 0.066 | 2.632 | 0.004 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000001ad8 | 667.614 | 1.824 | n/a | 0.000 | 0.000 | 0.411 | 665.277 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.072 | 1.824 | 0.003 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd940000000000001af4 | 644.168 | 12.450 | n/a | 0.000 | 0.000 | 0.419 | 630.859 | 0.007 | n/a | 0.023 | 0.000 | n/a | n/a | 0.410 | 12.450 | 0.019 | 0.410 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000001aed | 634.771 | 4.867 | n/a | 0.000 | 0.000 | 0.650 | 629.112 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.099 | 4.867 | 0.008 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd940000000000001ae8 | 541.416 | 2.601 | n/a | 0.000 | 0.000 | 0.403 | 538.320 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.056 | 2.601 | 0.005 | 0.056 | gw-r/thread-47/journal/page | none observed |
| 2977df9f30a8fd940000000000001b02 | 533.929 | 3.173 | n/a | 0.000 | 0.000 | 1.815 | 528.846 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.064 | 3.173 | 0.006 | 0.064 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001b07 | 508.789 | 3.176 | n/a | 0.000 | 0.000 | 0.543 | 504.981 | 0.005 | n/a | 0.016 | 0.000 | n/a | n/a | 0.067 | 3.176 | 0.006 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001b0a | 428.845 | 2.518 | n/a | 0.000 | 0.000 | 0.558 | 425.665 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.062 | 2.518 | 0.006 | 0.062 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000001b01 | 386.183 | 6.764 | n/a | 0.000 | 0.000 | 1.459 | 377.845 | 0.012 | n/a | 0.038 | 0.000 | n/a | n/a | 0.065 | 6.764 | 0.018 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000001ae6 | 374.739 | 1.515 | n/a | 0.000 | 0.000 | 0.262 | 372.865 | 0.011 | n/a | 0.034 | 0.000 | n/a | n/a | 0.052 | 1.515 | 0.004 | 0.052 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001b04 | 342.439 | 3.070 | n/a | 0.000 | 0.000 | 0.333 | 338.809 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 0.194 | 3.070 | 0.009 | 0.194 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000001afe | 307.859 | 3.103 | n/a | 0.000 | 0.000 | 0.312 | 304.319 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.082 | 3.103 | 0.010 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000001af5 | 291.849 | 2.458 | n/a | 0.000 | 0.000 | 0.394 | 288.884 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.084 | 2.458 | 0.008 | 0.084 | gw-r/thread-62/journal/page | none observed |

## P3 / L256 / internal (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 342.448 | n/a | n/a | n/a | 3.477 | n/a | 0.000 | 0.000 | 0.483 | 335.145 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.094 | 3.562 | 0.011 | 0.094 |
| p99 | 1009.579 | n/a | n/a | n/a | 12.931 | n/a | 2.434 | 0.000 | 4.835 | 1000.582 | 0.383 | n/a | 0.062 | 0.000 | n/a | n/a | 47.392 | 15.365 | 0.613 | 47.392 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd940000000000001b61 | 1009.579 | 8.807 | n/a | 1.810 | 0.000 | 0.454 | 998.323 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.158 | 10.617 | 0.011 | 0.158 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001b7f | 1005.647 | 4.386 | n/a | 0.741 | 0.000 | 0.340 | 1000.010 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.153 | 5.127 | 0.005 | 0.153 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000001b6d | 1005.027 | 3.508 | n/a | 0.518 | 0.000 | 0.501 | 1000.386 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.086 | 4.027 | 0.004 | 0.086 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001b8d | 1004.219 | 2.494 | n/a | 0.712 | 0.000 | 0.416 | 1000.472 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.095 | 3.206 | 0.003 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000001b65 | 1003.095 | 4.912 | n/a | 0.649 | 0.000 | 0.714 | 996.552 | 0.121 | n/a | 0.043 | 0.000 | n/a | n/a | 0.102 | 5.561 | 0.006 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000001b51 | 1002.763 | 0.081 | n/a | 0.000 | 0.000 | 1.105 | 1000.455 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 1.091 | 0.081 | 0.000 | 1.091 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001b91 | 1002.385 | 0.155 | n/a | 0.000 | 0.000 | 0.490 | 1000.582 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.112 | 0.155 | 0.000 | 1.112 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000001b93 | 1002.265 | 0.101 | n/a | 0.000 | 0.000 | 0.501 | 1000.515 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 1.086 | 0.101 | 0.000 | 1.086 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001b5f | 1001.946 | 0.078 | n/a | 0.000 | 0.000 | 0.322 | 1000.434 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 1.080 | 0.078 | 0.000 | 1.080 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001b56 | 1000.056 | 2.388 | n/a | 0.000 | 0.000 | 0.379 | 997.205 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.057 | 2.388 | 0.002 | 0.057 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001b15 | 995.021 | 2.345 | n/a | 0.000 | 0.000 | 0.262 | 992.314 | 0.011 | n/a | 0.032 | 0.000 | n/a | n/a | 0.056 | 2.345 | 0.002 | 0.056 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001b66 | 993.925 | 3.677 | n/a | 0.864 | 0.000 | 0.945 | 988.300 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.094 | 4.542 | 0.005 | 0.094 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001b24 | 941.976 | 2.762 | n/a | 0.000 | 0.000 | 0.618 | 938.492 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.062 | 2.762 | 0.003 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000001b77 | 938.406 | 5.705 | n/a | 0.643 | 0.000 | 0.490 | 931.401 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.140 | 6.348 | 0.007 | 0.140 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001b7c | 933.699 | 4.779 | n/a | 0.000 | 0.000 | 3.021 | 925.712 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.145 | 4.779 | 0.005 | 0.145 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001b8f | 927.183 | 2.510 | n/a | 0.000 | 0.000 | 0.337 | 924.247 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.071 | 2.510 | 0.003 | 0.071 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001b6a | 923.538 | 3.420 | n/a | 0.560 | 0.000 | 0.540 | 918.907 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.073 | 3.980 | 0.004 | 0.073 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001b10 | 904.225 | 2.598 | n/a | 0.000 | 0.000 | 0.492 | 901.050 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.061 | 2.598 | 0.003 | 0.061 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001b8a | 899.323 | 7.601 | n/a | 0.000 | 0.000 | 3.102 | 888.401 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.206 | 7.601 | 0.008 | 0.206 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000001b62 | 882.436 | 3.759 | n/a | 0.555 | 0.000 | 1.885 | 876.144 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.073 | 4.314 | 0.005 | 0.073 | gw-r/thread-62/journal/page | none observed |

## P3 / L1024 / internal (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 390.200 | n/a | n/a | n/a | 3.088 | n/a | 0.000 | 0.000 | 0.472 | 381.055 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.093 | 3.088 | 0.010 | 0.093 |
| p99 | 1004.221 | n/a | n/a | n/a | 12.275 | n/a | 1.094 | 0.000 | 4.962 | 1000.809 | 0.369 | n/a | 0.072 | 0.000 | n/a | n/a | 47.183 | 12.275 | 0.762 | 47.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd940000000000001bfe | 1004.221 | 2.702 | n/a | 0.000 | 0.000 | 0.605 | 1000.792 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.084 | 2.702 | 0.003 | 0.084 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001c1a | 1003.452 | 2.250 | n/a | 0.000 | 0.000 | 0.289 | 1000.809 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.068 | 2.250 | 0.002 | 0.068 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000001c32 | 1002.469 | 0.151 | n/a | 0.000 | 0.000 | 0.607 | 1000.542 | 0.003 | n/a | 0.040 | 0.000 | n/a | n/a | 1.126 | 0.151 | 0.000 | 1.126 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000001bed | 1002.454 | 0.153 | n/a | 0.000 | 0.000 | 0.472 | 1000.542 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 1.260 | 0.153 | 0.000 | 1.260 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001bf5 | 1001.087 | 2.888 | n/a | 0.000 | 0.000 | 1.087 | 997.009 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.074 | 2.888 | 0.003 | 0.074 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001bd0 | 999.292 | 2.613 | n/a | 0.000 | 0.000 | 0.434 | 996.137 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.066 | 2.613 | 0.003 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001c20 | 998.530 | 2.611 | n/a | 0.000 | 0.000 | 0.451 | 995.386 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.065 | 2.611 | 0.003 | 0.065 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001c04 | 996.872 | 4.952 | n/a | 0.000 | 0.000 | 0.456 | 991.306 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.137 | 4.952 | 0.005 | 0.137 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001c05 | 996.860 | 2.407 | n/a | 0.000 | 0.000 | 0.502 | 993.857 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.070 | 2.407 | 0.002 | 0.070 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001c16 | 993.540 | 3.103 | n/a | 0.000 | 0.000 | 0.389 | 989.943 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.063 | 3.103 | 0.003 | 0.063 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001bfd | 992.838 | 2.546 | n/a | 0.000 | 0.000 | 0.344 | 989.861 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.062 | 2.546 | 0.003 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000001bf6 | 990.795 | 2.356 | n/a | 0.000 | 0.000 | 0.359 | 987.979 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.058 | 2.356 | 0.002 | 0.058 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000001bcd | 946.080 | 3.581 | n/a | 0.000 | 0.000 | 0.396 | 941.990 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.076 | 3.581 | 0.004 | 0.076 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001bf2 | 926.709 | 12.275 | n/a | 0.000 | 0.000 | 0.781 | 913.331 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.278 | 12.275 | 0.013 | 0.278 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001c0a | 918.430 | 2.767 | n/a | 0.000 | 0.000 | 0.422 | 915.155 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.069 | 2.767 | 0.003 | 0.069 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001c25 | 916.486 | 2.906 | n/a | 0.000 | 0.000 | 0.482 | 913.004 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.060 | 2.906 | 0.003 | 0.060 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001c30 | 856.403 | 2.186 | n/a | 0.000 | 0.000 | 0.476 | 853.635 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.186 | 0.003 | 0.063 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000001bca | 841.750 | 4.683 | n/a | 0.000 | 0.000 | 1.350 | 835.501 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.162 | 4.683 | 0.006 | 0.162 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001ba1 | 830.604 | 2.230 | n/a | 0.000 | 0.000 | 0.367 | 827.897 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.060 | 2.230 | 0.003 | 0.060 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001bfc | 810.692 | 4.860 | n/a | 0.000 | 0.000 | 0.464 | 805.250 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.094 | 4.860 | 0.006 | 0.094 | gw-r/thread-67/journal/page | none observed |

## P3 / tail / internal (371 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 350.355 | n/a | n/a | n/a | 3.146 | n/a | 0.000 | 0.000 | 0.433 | 342.123 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.100 | 3.146 | 0.012 | 0.100 |
| p99 | 1003.495 | n/a | n/a | n/a | 11.467 | n/a | 1.105 | 0.000 | 3.313 | 1000.643 | 0.155 | n/a | 0.052 | 0.000 | n/a | n/a | 47.289 | 12.307 | 0.775 | 47.289 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2977df9f30a8fd940000000000001d4d | 1005.786 | 5.323 | n/a | 0.000 | 0.000 | 0.483 | 999.833 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.115 | 5.323 | 0.005 | 0.115 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000001e25 | 1004.670 | 4.702 | n/a | 0.000 | 0.000 | 0.283 | 999.509 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.143 | 4.702 | 0.005 | 0.143 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001ddb | 1003.900 | 2.503 | n/a | 0.000 | 0.000 | 0.304 | 1000.998 | 0.002 | n/a | 0.023 | 0.000 | n/a | n/a | 0.070 | 2.503 | 0.002 | 0.070 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001c38 | 1003.495 | 2.364 | n/a | 0.000 | 0.000 | 0.433 | 1000.597 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.070 | 2.364 | 0.002 | 0.070 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001c37 | 1002.791 | 5.072 | n/a | 0.000 | 0.000 | 0.531 | 997.038 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.123 | 5.072 | 0.005 | 0.123 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001d3b | 1002.751 | 0.095 | n/a | 0.000 | 0.000 | 1.119 | 1000.414 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 1.089 | 0.095 | 0.000 | 1.089 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000001d09 | 1002.722 | 0.074 | n/a | 0.000 | 0.000 | 0.266 | 1001.245 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 1.087 | 0.074 | 0.000 | 1.087 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000001da1 | 1002.720 | 2.790 | n/a | 0.000 | 0.000 | 0.414 | 999.425 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.066 | 2.790 | 0.003 | 0.066 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001e39 | 1002.702 | 0.082 | n/a | 0.000 | 0.000 | 0.834 | 1000.655 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 1.086 | 0.082 | 0.000 | 1.086 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001e64 | 1002.462 | 0.215 | n/a | 0.000 | 0.000 | 0.735 | 1000.357 | 0.003 | n/a | 0.013 | 0.000 | n/a | n/a | 1.139 | 0.215 | 0.000 | 1.139 | gw-r/thread-46/journal/page | none observed |
| 2977df9f30a8fd940000000000001dfe | 1002.388 | 2.476 | n/a | 0.000 | 0.000 | 0.355 | 999.450 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.066 | 2.476 | 0.002 | 0.066 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001c4c | 1002.227 | 0.085 | n/a | 0.000 | 0.000 | 0.355 | 1000.643 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 1.094 | 0.085 | 0.000 | 1.094 | gw-r/thread-62/journal/page | none observed |
| 2977df9f30a8fd940000000000001d5e | 1002.225 | 0.092 | n/a | 0.000 | 0.000 | 0.361 | 1000.628 | 0.012 | n/a | 0.045 | 0.000 | n/a | n/a | 1.087 | 0.092 | 0.000 | 1.087 | gw-r/thread-40/journal/page | none observed |
| 2977df9f30a8fd940000000000001cbb | 1002.178 | 0.138 | n/a | 0.000 | 0.000 | 0.429 | 1000.472 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 1.104 | 0.138 | 0.000 | 1.104 | gw-r/thread-42/journal/page | none observed |
| 2977df9f30a8fd940000000000001ce1 | 1002.164 | 0.099 | n/a | 0.000 | 0.000 | 0.487 | 1000.453 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.087 | 0.099 | 0.000 | 1.087 | gw-r/thread-44/journal/page | none observed |
| 2977df9f30a8fd940000000000001d96 | 1002.156 | 0.082 | n/a | 0.000 | 0.000 | 0.451 | 1000.502 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 1.088 | 0.082 | 0.000 | 1.088 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001cbe | 1002.122 | 0.095 | n/a | 0.000 | 0.000 | 0.378 | 1000.538 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 1.086 | 0.095 | 0.000 | 1.086 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001e52 | 1002.101 | 0.081 | n/a | 0.000 | 0.000 | 0.263 | 1000.623 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.087 | 0.081 | 0.000 | 1.087 | gw-r/thread-67/journal/page | none observed |
| 2977df9f30a8fd940000000000001d90 | 1002.020 | 0.150 | n/a | 0.000 | 0.000 | 0.416 | 1000.314 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 1.119 | 0.150 | 0.000 | 1.119 | gw-r/thread-43/journal/page | none observed |
| 2977df9f30a8fd940000000000001e45 | 1001.977 | 0.086 | n/a | 0.000 | 0.000 | 0.435 | 1000.345 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 1.083 | 0.086 | 0.000 | 1.083 | gw-r/thread-43/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.380 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 201.124 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 214.062 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.622 | 212.654 | 5.101 | n/a | 1.118 | 0.000 | n/a | n/a | 50.356 | 0.000 | 0.000 | 50.356 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13add84c02e22bc8000000000000000e | 214.062 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 212.654 | 0.013 | n/a | 0.144 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc8000000000000000d | 208.509 | 0.000 | n/a | 0.000 | 0.000 | 5.433 | 202.725 | 0.015 | n/a | 0.158 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc8000000000000001b | 207.654 | 0.000 | n/a | 0.000 | 0.000 | 3.666 | 203.722 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000015 | 207.584 | 0.000 | n/a | 0.000 | 0.000 | 1.368 | 206.018 | 0.021 | n/a | 0.088 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc8000000000000000f | 207.142 | 0.000 | n/a | 0.000 | 0.000 | 1.545 | 205.344 | 0.015 | n/a | 0.127 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000000034 | 206.892 | 0.000 | n/a | 0.000 | 0.000 | 5.622 | 200.931 | 0.014 | n/a | 0.121 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000037 | 206.328 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 205.257 | 0.022 | n/a | 0.114 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000000048 | 206.189 | 0.000 | n/a | 0.000 | 0.000 | 0.464 | 201.928 | 3.579 | n/a | 0.137 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc8000000000000000b | 205.718 | 0.000 | n/a | 0.000 | 0.000 | 3.825 | 201.689 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000057 | 205.642 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 204.449 | 0.013 | n/a | 0.141 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000031 | 205.623 | 0.000 | n/a | 0.000 | 0.000 | 4.125 | 201.150 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000030 | 205.003 | 0.000 | n/a | 0.000 | 0.000 | 0.589 | 204.072 | 0.024 | n/a | 0.178 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000035 | 204.926 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 203.903 | 0.012 | n/a | 0.057 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000040 | 204.594 | 0.000 | n/a | 0.000 | 0.000 | 2.469 | 201.777 | 0.015 | n/a | 0.131 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000021 | 204.234 | 0.000 | n/a | 0.000 | 0.000 | 0.670 | 203.229 | 0.027 | n/a | 0.195 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc8000000000000004d | 204.223 | 0.000 | n/a | 0.000 | 0.000 | 2.978 | 201.010 | 0.014 | n/a | 0.126 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000009 | 203.970 | 0.000 | n/a | 0.000 | 0.000 | 2.196 | 201.153 | 0.011 | n/a | 0.133 | 0.000 | n/a | n/a | 0.476 | 0.000 | 0.000 | 0.476 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000000050 | 203.938 | 0.000 | n/a | 0.000 | 0.000 | 2.404 | 201.274 | 0.013 | n/a | 0.143 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc80000000000000059 | 203.635 | 0.000 | n/a | 0.000 | 0.000 | 1.265 | 201.981 | 0.070 | n/a | 0.147 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc8000000000000004a | 203.563 | 0.000 | n/a | 0.000 | 0.000 | 2.397 | 200.931 | 0.017 | n/a | 0.115 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-42/journal/page | none observed |

## P3 / L1 / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.801 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 200.829 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 207.428 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.233 | 204.696 | 3.857 | n/a | 1.892 | 0.000 | n/a | n/a | 0.303 | 0.000 | 0.000 | 0.303 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13add84c02e22bc8000000000000008e | 209.665 | 0.000 | n/a | 0.000 | 0.000 | 3.648 | 205.580 | 0.021 | n/a | 0.209 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-45/journal/page | none observed |
| 13add84c02e22bc8000000000000013d | 209.274 | 0.000 | n/a | 0.000 | 0.000 | 8.357 | 200.746 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000088 | 207.428 | 0.000 | n/a | 0.000 | 0.000 | 2.562 | 204.510 | 0.075 | n/a | 0.126 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000062 | 207.050 | 0.000 | n/a | 0.000 | 0.000 | 1.147 | 205.552 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc800000000000000b6 | 206.425 | 0.000 | n/a | 0.000 | 0.000 | 4.233 | 201.784 | 0.017 | n/a | 0.188 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000156 | 206.347 | 0.000 | n/a | 0.000 | 0.000 | 1.574 | 204.462 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc800000000000000db | 205.804 | 0.000 | n/a | 0.000 | 0.000 | 4.667 | 200.944 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000113 | 205.656 | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 204.404 | 0.019 | n/a | 0.176 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000000157 | 205.609 | 0.000 | n/a | 0.000 | 0.000 | 3.992 | 198.262 | 0.013 | n/a | 3.236 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc8000000000000007a | 205.498 | 0.000 | n/a | 0.000 | 0.000 | 1.730 | 203.574 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc800000000000000a9 | 205.482 | 0.000 | n/a | 0.000 | 0.000 | 0.591 | 204.696 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc800000000000000a8 | 204.871 | 0.000 | n/a | 0.000 | 0.000 | 3.917 | 200.771 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc800000000000000e6 | 204.840 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 203.721 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc800000000000000cc | 204.512 | 0.000 | n/a | 0.000 | 0.000 | 0.679 | 203.646 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 13add84c02e22bc800000000000000d6 | 204.251 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 203.298 | 0.019 | n/a | 0.148 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000070 | 204.215 | 0.000 | n/a | 0.000 | 0.000 | 1.084 | 202.764 | 0.020 | n/a | 0.158 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc80000000000000083 | 203.884 | 0.000 | n/a | 0.000 | 0.000 | 2.002 | 199.858 | 0.019 | n/a | 1.892 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc800000000000000ad | 203.869 | 0.000 | n/a | 0.000 | 0.000 | 2.348 | 201.274 | 0.014 | n/a | 0.128 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc800000000000000d0 | 203.844 | 0.000 | n/a | 0.000 | 0.000 | 1.515 | 201.886 | 0.015 | n/a | 0.148 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc8000000000000012f | 203.766 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 202.363 | 0.020 | n/a | 0.140 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (225 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.496 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.634 | 200.769 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 204.842 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.736 | 203.410 | 2.152 | n/a | 0.127 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13add84c02e22bc800000000000001e7 | 205.320 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 204.473 | 0.011 | n/a | 0.077 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc800000000000001a0 | 204.947 | 0.000 | n/a | 0.000 | 0.000 | 0.379 | 204.378 | 0.022 | n/a | 0.073 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc8000000000000017a | 204.842 | 0.000 | n/a | 0.000 | 0.000 | 3.420 | 201.077 | 0.016 | n/a | 0.091 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000246 | 204.773 | 0.000 | n/a | 0.000 | 0.000 | 3.420 | 201.000 | 0.012 | n/a | 0.236 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc800000000000001b6 | 204.356 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 201.479 | 2.067 | n/a | 0.023 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc80000000000000169 | 204.049 | 0.000 | n/a | 0.000 | 0.000 | 0.448 | 203.410 | 0.030 | n/a | 0.074 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc8000000000000022d | 203.766 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 202.544 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc8000000000000016c | 203.755 | 0.000 | n/a | 0.000 | 0.000 | 2.736 | 200.735 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc800000000000001e8 | 203.341 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 202.487 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc8000000000000021e | 203.215 | 0.000 | n/a | 0.000 | 0.000 | 1.500 | 201.516 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc8000000000000020d | 203.020 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 201.860 | 0.014 | n/a | 0.127 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc8000000000000023d | 202.943 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 201.714 | 0.185 | n/a | 0.015 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000177 | 202.932 | 0.000 | n/a | 0.000 | 0.000 | 1.878 | 200.894 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc800000000000001a8 | 202.878 | 0.000 | n/a | 0.000 | 0.000 | 1.223 | 201.409 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000199 | 202.792 | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 201.401 | 0.006 | n/a | 0.087 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc800000000000001c6 | 202.715 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 201.965 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000183 | 202.677 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 201.912 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000198 | 202.662 | 0.000 | n/a | 0.000 | 0.000 | 1.270 | 200.940 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.384 | 0.000 | 0.000 | 0.384 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc8000000000000024c | 202.652 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 201.311 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc800000000000001ca | 202.642 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 201.190 | 0.010 | n/a | 0.604 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (158 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 76.352 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.519 | 75.736 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 205.561 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.565 | 203.826 | 1.811 | n/a | 0.116 | 0.000 | n/a | n/a | 49.881 | 0.000 | 0.000 | 49.881 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13add84c02e22bc80000000000000263 | 206.473 | 0.000 | n/a | 0.000 | 0.000 | 3.565 | 202.747 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000271 | 205.561 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 204.497 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000000273 | 205.463 | 0.000 | n/a | 0.000 | 0.000 | 4.296 | 200.948 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000268 | 204.837 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 203.826 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000000266 | 203.110 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 202.204 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000278 | 203.007 | 0.000 | n/a | 0.000 | 0.000 | 2.297 | 200.587 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc8000000000000025c | 202.891 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 201.781 | 0.038 | n/a | 0.116 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc8000000000000025b | 202.880 | 0.000 | n/a | 0.000 | 0.000 | 1.893 | 200.799 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000258 | 202.865 | 0.000 | n/a | 0.000 | 0.000 | 1.160 | 201.426 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc8000000000000029e | 202.636 | 0.000 | n/a | 0.000 | 0.000 | 0.829 | 201.598 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc8000000000000025a | 202.475 | 0.000 | n/a | 0.000 | 0.000 | 0.523 | 201.745 | 0.015 | n/a | 0.108 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc8000000000000029b | 202.316 | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 201.185 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000000257 | 202.305 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 201.374 | 0.016 | n/a | 0.088 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000293 | 202.270 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.004 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000261 | 202.219 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 201.069 | 0.009 | n/a | 0.104 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000279 | 202.136 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 201.135 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000294 | 202.124 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 201.313 | 0.014 | n/a | 0.124 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000296 | 202.080 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 201.206 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc8000000000000027e | 202.068 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 200.868 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000275 | 202.004 | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 201.132 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-62/journal/page | none observed |

## P3 / L64 / read (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 91.036 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.432 | 86.359 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 202.787 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.032 | 201.349 | 2.558 | n/a | 0.072 | 0.000 | n/a | n/a | 49.874 | 0.000 | 0.000 | 49.874 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13add84c02e22bc80000000000000eb2 | 203.447 | 0.000 | n/a | 0.000 | 0.000 | 1.386 | 201.890 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc80000000000000e8d | 202.787 | 0.000 | n/a | 0.000 | 0.000 | 2.079 | 200.465 | 0.007 | n/a | 0.017 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000000e87 | 202.159 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 200.958 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000e62 | 201.948 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 201.019 | 0.017 | n/a | 0.066 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000e6d | 201.932 | 0.000 | n/a | 0.000 | 0.000 | 0.410 | 201.349 | 0.015 | n/a | 0.072 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000e95 | 201.763 | 0.000 | n/a | 0.000 | 0.000 | 0.353 | 201.236 | 0.015 | n/a | 0.063 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000e90 | 201.741 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.975 | 0.017 | n/a | 0.065 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-67/journal/page | none observed |
| 13add84c02e22bc80000000000000e63 | 201.729 | 0.000 | n/a | 0.000 | 0.000 | 0.412 | 201.132 | 0.016 | n/a | 0.065 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000ebd | 201.678 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 200.777 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000000e7a | 201.643 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 200.640 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000e9b | 201.616 | 0.000 | n/a | 0.000 | 0.000 | 0.509 | 200.927 | 0.014 | n/a | 0.058 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000eae | 201.605 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 200.659 | 0.013 | n/a | 0.071 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000e9a | 201.545 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 200.792 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000000e71 | 201.543 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.765 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000e7f | 201.526 | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 200.740 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000e79 | 201.518 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 200.847 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000e9c | 201.514 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.753 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-67/journal/page | none observed |
| 13add84c02e22bc80000000000000ea1 | 201.467 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 200.560 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-67/journal/page | none observed |
| 13add84c02e22bc80000000000000e8f | 201.456 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 200.760 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000e96 | 201.450 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 200.661 | 0.008 | n/a | 0.023 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.116 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.468 | 200.495 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 |
| p99 | 204.517 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.295 | 203.631 | 3.090 | n/a | 0.083 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13add84c02e22bc80000000000000fb5 | 207.308 | 0.000 | n/a | 0.000 | 0.000 | 17.807 | 189.390 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000ed4 | 206.262 | 0.000 | n/a | 0.000 | 0.000 | 0.384 | 205.722 | 0.019 | n/a | 0.035 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc80000000000000f2e | 204.517 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 203.631 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000f12 | 204.470 | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 203.763 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000000ee4 | 204.235 | 0.000 | n/a | 0.000 | 0.000 | 3.295 | 200.778 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000000fb7 | 203.911 | 0.000 | n/a | 0.000 | 0.000 | 3.401 | 200.386 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000000f56 | 203.662 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 202.899 | 0.004 | n/a | 0.054 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000000f13 | 203.105 | 0.000 | n/a | 0.000 | 0.000 | 0.460 | 202.488 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000f60 | 202.585 | 0.000 | n/a | 0.000 | 0.000 | 1.523 | 200.915 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000000f46 | 202.531 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 201.441 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000000fb8 | 202.304 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.194 | 0.009 | n/a | 0.122 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000000f22 | 202.266 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 200.963 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.273 | 0.000 | 0.000 | 0.273 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000ec8 | 202.265 | 0.000 | n/a | 0.000 | 0.000 | 0.632 | 201.408 | 0.009 | n/a | 0.029 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000f33 | 202.159 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 201.118 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc80000000000000eed | 202.044 | 0.000 | n/a | 0.000 | 0.000 | 1.294 | 200.530 | 0.009 | n/a | 0.025 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000000fba | 202.018 | 0.000 | n/a | 0.000 | 0.000 | 1.175 | 200.654 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000ef9 | 202.009 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 200.814 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 13add84c02e22bc80000000000000f54 | 202.005 | 0.000 | n/a | 0.000 | 0.000 | 0.470 | 201.302 | 0.009 | n/a | 0.127 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000ec6 | 201.973 | 0.000 | n/a | 0.000 | 0.000 | 0.473 | 201.336 | 0.013 | n/a | 0.056 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000000ed1 | 201.943 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 200.930 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-43/journal/page | none observed |

## P3 / L1024 / read (229 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.111 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.453 | 200.515 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 |
| p99 | 202.859 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.818 | 201.282 | 3.073 | n/a | 0.106 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13add84c02e22bc80000000000000fd6 | 204.524 | 0.000 | n/a | 0.000 | 0.000 | 3.861 | 200.541 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000fd5 | 202.984 | 0.000 | n/a | 0.000 | 0.000 | 0.502 | 202.336 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000000fc2 | 202.859 | 0.000 | n/a | 0.000 | 0.000 | 1.818 | 200.792 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000000ff0 | 202.553 | 0.000 | n/a | 0.000 | 0.000 | 2.064 | 200.391 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000001085 | 202.296 | 0.000 | n/a | 0.000 | 0.000 | 1.772 | 200.399 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000001068 | 202.185 | 0.000 | n/a | 0.000 | 0.000 | 1.671 | 200.417 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-67/journal/page | none observed |
| 13add84c02e22bc80000000000001017 | 202.129 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 201.282 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-67/journal/page | none observed |
| 13add84c02e22bc80000000000000fd8 | 202.064 | 0.000 | n/a | 0.000 | 0.000 | 0.498 | 201.384 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc8000000000000100d | 202.029 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 200.867 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000001059 | 201.939 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 200.794 | 0.018 | n/a | 0.053 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000001069 | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 200.879 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc8000000000000103e | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 201.204 | 0.009 | n/a | 0.100 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000001044 | 201.867 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.941 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-67/journal/page | none observed |
| 13add84c02e22bc80000000000001057 | 201.821 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 200.918 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc800000000000010a1 | 201.786 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 200.856 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000001070 | 201.746 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 200.994 | 0.016 | n/a | 0.042 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000001048 | 201.743 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 200.926 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc80000000000000fc8 | 201.735 | 0.000 | n/a | 0.000 | 0.000 | 0.659 | 200.803 | 0.028 | n/a | 0.061 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000001052 | 201.701 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 201.005 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc8000000000000100a | 201.686 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 200.828 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-43/journal/page | none observed |

## P3 / tail / read (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.051 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 200.475 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 |
| p99 | 202.695 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.073 | 201.208 | 1.677 | n/a | 0.084 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13add84c02e22bc80000000000001149 | 220.093 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 219.380 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000001205 | 205.357 | 0.000 | n/a | 0.000 | 0.000 | 4.245 | 200.707 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.347 | 0.000 | 0.000 | 0.347 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000001380 | 204.695 | 0.000 | n/a | 0.000 | 0.000 | 4.144 | 200.413 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-67/journal/page | none observed |
| 13add84c02e22bc80000000000001264 | 204.319 | 0.000 | n/a | 0.000 | 0.000 | 2.740 | 201.406 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc80000000000001155 | 203.912 | 0.000 | n/a | 0.000 | 0.000 | 3.241 | 200.505 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-42/journal/page | none observed |
| 13add84c02e22bc80000000000001167 | 203.787 | 0.000 | n/a | 0.000 | 0.000 | 2.414 | 201.208 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000001293 | 202.883 | 0.000 | n/a | 0.000 | 0.000 | 1.838 | 200.792 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-46/journal/page | none observed |
| 13add84c02e22bc800000000000010e3 | 202.750 | 0.000 | n/a | 0.000 | 0.000 | 1.838 | 200.764 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc80000000000001238 | 202.695 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 202.067 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc8000000000000123e | 202.649 | 0.000 | n/a | 0.000 | 0.000 | 1.653 | 200.795 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc800000000000010ca | 202.448 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 201.162 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc8000000000000129f | 202.445 | 0.000 | n/a | 0.000 | 0.000 | 0.962 | 201.168 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc800000000000011aa | 202.441 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 201.664 | 0.003 | n/a | 0.038 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc80000000000001410 | 202.405 | 0.000 | n/a | 0.000 | 0.000 | 1.852 | 200.406 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-67/journal/page | none observed |
| 13add84c02e22bc800000000000011da | 202.357 | 0.000 | n/a | 0.000 | 0.000 | 1.285 | 200.933 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 13add84c02e22bc80000000000001281 | 202.317 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.344 | 0.009 | n/a | 0.102 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-62/journal/page | none observed |
| 13add84c02e22bc800000000000013ab | 202.310 | 0.000 | n/a | 0.000 | 0.000 | 1.494 | 200.693 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-67/journal/page | none observed |
| 13add84c02e22bc80000000000001309 | 202.203 | 0.000 | n/a | 0.000 | 0.000 | 0.598 | 201.393 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-43/journal/page | none observed |
| 13add84c02e22bc8000000000000118d | 202.169 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 201.110 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-40/journal/page | none observed |
| 13add84c02e22bc800000000000011ea | 202.142 | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 200.826 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-42/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3707 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.646 ms; post-ACK p50/p99: 0.386/1.883 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.586 | 10.102 | 9.867 | reported |
| All-primary p99 ms | 43.640 | 42.883 | 41.665 | <=50 |
| L256 5-10 p50Ms | 9.983 | 9.727 | 9.663 | <=10 |
| L256 5-10 p99Ms | 34.418 | 33.890 | 33.887 | <=50 |
| L256 11-25 p50Ms | 14.079 | 13.503 | 13.503 | <=10 |
| L256 11-25 p99Ms | 19.298 | 18.776 | 18.774 | <=50 |
| L256 26-50 p50Ms | 15.615 | 14.975 | 14.975 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 24.864 | 24.058 | 24.058 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.087 | 8.767 | 8.575 | <=10 |
| Burst 11-25 p50 ms | 11.199 | 10.623 | 10.303 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 34.418 | 33.890 | 33.887 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 20.713 | 18.895 | 18.872 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 54.534/54.534 | 53.190 | 35.614 | 88.527 | 1.684/0.093 |
| 5-10 | 250-1000 | 133 | 11.226/54.374 | 10.844 | 6.265 | 14.974 | 0.073/0.020 |
| 5-10 | 50-100 | 79 | 8.969/21.140 | 8.647 | 4.951 | 12.280 | 0.053/0.018 |
| 11-25 | 250-1000 | 83 | 13.505/75.714 | 12.823 | 6.970 | 16.795 | 0.077/0.020 |
| 26-50 | 100-250 | 12 | 15.386/30.442 | 14.526 | 6.452 | 19.214 | 0.076/0.022 |
| 5-10 | 100-250 | 70 | 10.210/34.444 | 9.824 | 5.868 | 14.083 | 0.058/0.019 |
| 26-50 | 250-1000 | 21 | 18.864/60.971 | 16.757 | 8.792 | 22.263 | 0.090/0.022 |
| 5-10 | overlap | 829 | 10.197/41.076 | 9.879 | 6.129 | 13.942 | 0.032/0.017 |
| 26-50 | 0-50 | 193 | 13.770/42.278 | 12.652 | 6.472 | 16.560 | 0.059/0.019 |
| 11-25 | 100-250 | 27 | 12.218/20.839 | 11.745 | 6.224 | 16.836 | 0.075/0.020 |
| 11-25 | 0-50 | 534 | 10.190/33.328 | 9.583 | 5.115 | 12.901 | 0.048/0.018 |
| 5-10 | 0-50 | 1121 | 7.971/30.534 | 7.650 | 4.251 | 10.624 | 0.040/0.017 |
| 26-50 | overlap | 156 | 15.892/59.781 | 14.761 | 8.908 | 21.671 | 0.048/0.018 |
| 11-25 | 50-100 | 43 | 9.928/28.168 | 9.421 | 4.862 | 12.076 | 0.057/0.018 |
| 11-25 | overlap | 389 | 12.274/51.467 | 11.696 | 7.129 | 16.531 | 0.038/0.017 |
| 26-50 | 50-100 | 16 | 13.234/24.826 | 12.430 | 6.707 | 16.500 | 0.069/0.019 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1845 | 12 | 829.936 |
| burst | 1862 | 10 | 561.209 |

## Writer heap, GC and scheduler stalls

Source 0d95e5721572bbafaa54630aa6265d188d8e3d26; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 481.612 / 535.650 |
| GC events / total duration / maximum ms | 865 / 2019.109 / 48.598 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":847,"4":9,"8":9} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 43.640 / 22 / 1391.145 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

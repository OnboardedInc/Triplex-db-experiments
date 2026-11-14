# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (63.182 ms, trace `417bfc4f9929a22c000000000000082b`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (134.268 ms, trace `417bfc4f9929a22c00000000000001fe`); `node-14/thread-0/driver.queue.subject` (60.652 ms, trace `417bfc4f9929a22c0000000000000826`); `gw-w/thread-47/gateway.admitted-work` (111.251 ms, trace `417bfc4f9929a22c000000000000022b`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (104.931 ms, trace `417bfc4f9929a22c00000000000001a2`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-defer-b-1-baseline`; source `3ff6db5ae859a18b9afcf85c58ee7cd70c829800`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 7695442.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 229 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14568.724 | 612.583 | 11.926 | 457 |
| L1 | 0 | 19963.928 | 505.037 | 25.258 | 668 |
| L4 | 0 | 19975.876 | 432.792 | 30.145 | 628 |
| L16 | 0 | 19964.031 | 405.541 | 6.121 | 686 |
| L64 | 0 | 19973.544 | 481.078 | 13.913 | 870 |
| L256 | 0 | 19969.542 | 628.762 | 9.134 | 696 |
| L1024 | 0 | 19993.289 | 4064.130 | 44.286 | 17347 |
| tail | 0 | 64397.826 | 11656.892 | 104.215 | 52645 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 417bfc4f9929a22c000000000000082b | driver.queue.scheduler-late | 4.974 | none | 3 / 32 |
| 417bfc4f9929a22c000000000000082b | driver.queue.scheduler-dispatch | 0.032 | none | 3 / 32 |

Observed active steps while trace 417bfc4f9929a22c000000000000082b waited: []

| 417bfc4f9929a22c00000000000001fe | driver.queue.scheduler-late | 0.160 | none | 0 / 32 |
| 417bfc4f9929a22c00000000000001fe | driver.queue.scheduler-dispatch | 0.080 | none | 0 / 32 |

Observed active steps while trace 417bfc4f9929a22c00000000000001fe waited: []

| 417bfc4f9929a22c0000000000000826 | driver.queue.subject | 60.652 | 417bfc4f9929a22c0000000000000824 | 2 / 32 |
| 417bfc4f9929a22c0000000000000826 | driver.queue.scheduler-late | 7.720 | none | 2 / 32 |
| 417bfc4f9929a22c0000000000000826 | driver.queue.scheduler-dispatch | 0.096 | none | 4 / 32 |

Observed active steps while trace 417bfc4f9929a22c0000000000000826 waited: [{"at":1794640146898.4744,"inFlight":5,"capacity":32,"active":[{"traceId":"417bfc4f9929a22c0000000000000824","step":"client.http"},{"traceId":"417bfc4f9929a22c0000000000000827","step":"client.http"},{"traceId":"417bfc4f9929a22c0000000000000828","step":"client.http"},{"traceId":"417bfc4f9929a22c000000000000082b","step":"client.http"},{"traceId":"417bfc4f9929a22c000000000000082c","step":"client.http"}]},{"at":1794640146919.4998,"inFlight":5,"capacity":32,"active":[{"traceId":"417bfc4f9929a22c0000000000000824","step":"client.http"},{"traceId":"417bfc4f9929a22c0000000000000827","step":"client.http"},{"traceId":"417bfc4f9929a22c0000000000000828","step":"client.http"},{"traceId":"417bfc4f9929a22c000000000000082b","step":"client.http"},{"traceId":"417bfc4f9929a22c000000000000082c","step":"client.http"}]}]

| 417bfc4f9929a22c000000000000022b | driver.queue.scheduler-dispatch | 0.068 | none | 0 / 32 |
| 417bfc4f9929a22c000000000000022b | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 417bfc4f9929a22c000000000000022b waited: []

| 417bfc4f9929a22c00000000000001a2 | driver.queue.scheduler-dispatch | 0.066 | none | 0 / 32 |
| 417bfc4f9929a22c00000000000001a2 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 417bfc4f9929a22c00000000000001a2 waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.588 | 0.648 | 0.000 | 1.112 | 6.011 | 0.176 | 0.000 | 0.174 | 1.665 | 10.389 | 0.076 | n/a | 0.565 | 16.224 | n/a | n/a | 0.062 | 6.844 | 0.195 | 0.062 |
| p99 | 101.212 | 4.936 | 0.011 | 5.143 | 16.570 | 0.845 | 3.611 | 1.223 | 4.474 | 35.622 | 0.484 | n/a | 6.300 | 50.292 | n/a | n/a | 0.390 | 20.711 | 0.412 | 0.390 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c00000000000000f4 | 101.212 | 14.836 | 0.845 | 0.000 | 0.137 | 4.474 | 35.622 | 0.484 | n/a | 4.461 | 40.296 | n/a | n/a | 0.056 | 15.818 | 0.156 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000100 | 90.876 | 12.778 | 0.375 | 0.000 | 0.139 | 3.292 | 23.220 | 0.152 | n/a | 0.308 | 50.292 | n/a | n/a | 0.320 | 13.292 | 0.146 | 0.320 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000106 | 61.743 | 7.191 | 0.338 | 0.000 | 0.326 | 1.723 | 27.643 | 0.056 | n/a | 0.131 | 24.232 | n/a | n/a | 0.104 | 7.855 | 0.127 | 0.104 | gw-w/thread-43/gateway.admitted-work | none observed |
| 417bfc4f9929a22c0000000000000104 | 60.708 | 7.851 | 0.331 | 0.000 | 0.174 | 2.626 | 20.716 | 0.211 | n/a | 2.391 | 26.304 | n/a | n/a | 0.104 | 8.355 | 0.138 | 0.104 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000000f8 | 55.542 | 8.845 | 0.364 | 0.000 | 0.135 | 2.931 | 16.878 | 0.063 | n/a | 3.725 | 22.517 | n/a | n/a | 0.083 | 9.344 | 0.168 | 0.083 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000010c | 53.095 | 10.147 | 0.176 | 0.000 | 0.089 | 2.488 | 9.210 | 0.058 | n/a | 0.482 | 30.399 | n/a | n/a | 0.045 | 10.412 | 0.196 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000000f1 | 52.469 | 13.402 | 0.021 | 0.000 | 1.164 | 1.092 | 9.839 | 0.097 | n/a | 4.232 | 22.232 | n/a | n/a | 0.390 | 14.587 | 0.278 | 0.390 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000110 | 52.375 | 9.417 | 0.450 | 0.492 | 0.080 | 3.186 | 15.554 | 0.076 | n/a | 3.451 | 19.607 | n/a | n/a | 0.062 | 10.439 | 0.199 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.661ms |
| 417bfc4f9929a22c0000000000000107 | 52.154 | 16.570 | 0.012 | 3.251 | 0.877 | 1.844 | 21.262 | 0.084 | n/a | 0.121 | 8.070 | n/a | n/a | 0.061 | 20.711 | 0.397 | 0.061 | gw-w/thread-45/commit.prepare-and-validate | none observed |
| 417bfc4f9929a22c00000000000000f9 | 47.717 | 7.257 | 0.015 | 3.611 | 0.718 | 1.223 | 4.623 | 0.047 | n/a | 0.635 | 29.272 | n/a | n/a | 0.318 | 11.600 | 0.243 | 0.318 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000116 | 45.126 | 4.754 | 0.422 | 0.000 | 0.086 | 2.566 | 20.852 | 0.104 | n/a | 0.945 | 15.353 | n/a | n/a | 0.044 | 5.262 | 0.117 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000010e | 42.764 | 6.319 | 0.437 | 0.000 | 0.088 | 3.260 | 17.131 | 0.099 | n/a | 3.473 | 11.902 | n/a | n/a | 0.054 | 6.844 | 0.160 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000101 | 38.358 | 6.011 | 0.005 | 2.627 | 0.465 | 1.202 | 1.915 | 0.046 | n/a | 0.123 | 25.900 | n/a | n/a | 0.065 | 9.108 | 0.237 | 0.065 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000011f | 37.756 | 6.209 | 0.008 | 1.751 | 1.067 | 1.316 | 2.943 | 0.113 | n/a | 0.185 | 24.054 | n/a | n/a | 0.111 | 9.035 | 0.239 | 0.111 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000012a | 37.588 | 4.802 | 0.373 | 0.000 | 0.081 | 1.920 | 13.293 | 0.088 | n/a | 0.161 | 16.826 | n/a | n/a | 0.044 | 5.256 | 0.140 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000011a | 36.149 | 4.943 | 0.236 | 0.345 | 0.085 | 1.898 | 12.729 | 0.112 | n/a | 0.206 | 15.548 | n/a | n/a | 0.047 | 5.609 | 0.155 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000117 | 35.158 | 8.043 | 0.006 | 1.414 | 1.201 | 1.180 | 3.840 | 0.042 | n/a | 0.087 | 19.275 | n/a | n/a | 0.068 | 10.665 | 0.303 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000122 | 35.000 | 5.069 | 0.322 | 0.000 | 0.084 | 1.665 | 11.869 | 0.091 | n/a | 0.498 | 15.338 | n/a | n/a | 0.063 | 5.475 | 0.156 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000011e | 34.703 | 4.721 | 0.485 | 0.000 | 0.141 | 1.662 | 11.101 | 0.116 | n/a | 0.192 | 16.224 | n/a | n/a | 0.062 | 5.347 | 0.154 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000128 | 34.098 | 5.014 | 0.360 | 0.000 | 0.096 | 2.279 | 10.712 | 0.055 | n/a | 0.714 | 14.814 | n/a | n/a | 0.053 | 5.470 | 0.160 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.503 | 1.304 | 0.000 | 2.048 | 5.365 | 0.008 | 0.000 | 0.718 | 0.978 | 2.284 | 0.048 | n/a | 0.565 | 11.198 | n/a | n/a | 0.060 | 6.247 | 0.274 | 0.060 |
| p99 | 47.717 | 4.114 | 0.011 | 4.848 | 7.257 | 0.015 | 3.611 | 1.223 | 1.316 | 5.872 | 0.113 | n/a | 0.792 | 29.272 | n/a | n/a | 0.318 | 11.600 | 0.412 | 0.318 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c00000000000000f9 | 47.717 | 7.257 | 0.015 | 3.611 | 0.718 | 1.223 | 4.623 | 0.047 | n/a | 0.635 | 29.272 | n/a | n/a | 0.318 | 11.600 | 0.243 | 0.318 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000011f | 37.756 | 6.209 | 0.008 | 1.751 | 1.067 | 1.316 | 2.943 | 0.113 | n/a | 0.185 | 24.054 | n/a | n/a | 0.111 | 9.035 | 0.239 | 0.111 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000113 | 32.351 | 4.770 | 0.006 | 0.000 | 0.578 | 0.854 | 5.872 | 0.104 | n/a | 0.792 | 19.327 | n/a | n/a | 0.047 | 5.354 | 0.165 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000000f5 | 25.986 | 6.647 | 0.012 | 0.000 | 0.458 | 1.015 | 1.852 | 0.042 | n/a | 0.565 | 15.099 | n/a | n/a | 0.294 | 7.118 | 0.274 | 0.294 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000111 | 20.503 | 5.365 | 0.005 | 0.000 | 0.878 | 0.594 | 1.666 | 0.048 | n/a | 0.695 | 11.198 | n/a | n/a | 0.054 | 6.247 | 0.305 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000011b | 16.052 | 5.377 | 0.010 | 0.000 | 1.223 | 1.104 | 2.937 | 0.051 | n/a | 0.313 | 4.960 | n/a | n/a | 0.078 | 6.610 | 0.412 | 0.078 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000123 | 15.148 | 3.438 | 0.004 | 0.000 | 0.166 | 0.939 | 1.747 | 0.038 | n/a | 0.633 | 8.139 | n/a | n/a | 0.044 | 3.608 | 0.238 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000000fe | 14.158 | 3.712 | 0.008 | 0.000 | 0.882 | 0.978 | 1.401 | 0.060 | n/a | 0.124 | 6.934 | n/a | n/a | 0.060 | 4.602 | 0.325 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000125 | 12.162 | 3.536 | 0.005 | 0.000 | 0.201 | 0.938 | 2.284 | 0.036 | n/a | 0.103 | 5.001 | n/a | n/a | 0.057 | 3.742 | 0.308 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.638 | 0.788 | 0.000 | 1.252 | 5.042 | 0.025 | 0.000 | 0.146 | 1.763 | 8.936 | 0.065 | n/a | 0.304 | 14.677 | n/a | n/a | 0.066 | 5.698 | 0.162 | 0.066 |
| p99 | 118.354 | 4.168 | 0.092 | 7.950 | 17.467 | 0.379 | 1.874 | 9.958 | 21.278 | 60.929 | 0.328 | n/a | 3.175 | 89.657 | n/a | n/a | 0.517 | 18.653 | 0.545 | 0.517 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c0000000000000140 | 118.354 | 6.881 | 0.337 | 0.294 | 0.080 | 2.199 | 18.611 | 0.098 | n/a | 0.153 | 89.657 | n/a | n/a | 0.043 | 7.592 | 0.064 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000015b | 95.701 | 11.855 | 0.007 | 0.000 | 0.867 | 14.543 | 14.436 | 0.229 | n/a | 0.468 | 53.183 | n/a | n/a | 0.113 | 12.729 | 0.133 | 0.113 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000146 | 92.857 | 4.541 | 0.271 | 0.476 | 0.146 | 3.601 | 60.929 | 0.328 | n/a | 0.140 | 22.369 | n/a | n/a | 0.055 | 5.434 | 0.059 | 0.055 | gw-w/thread-45/gateway.admitted-work | driver.publication 1.333ms |
| 417bfc4f9929a22c000000000000015c | 84.151 | 10.779 | 0.009 | 0.000 | 0.533 | 21.278 | 5.536 | 0.124 | n/a | 1.174 | 44.200 | n/a | n/a | 0.517 | 11.321 | 0.135 | 0.517 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 5.833ms; driver.expected-state.bind-receipt 1.764ms |
| 417bfc4f9929a22c000000000000015d | 70.763 | 17.467 | 0.025 | 0.000 | 1.161 | 17.319 | 16.992 | 0.110 | n/a | 0.304 | 17.234 | n/a | n/a | 0.151 | 18.653 | 0.264 | 0.151 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 5.833ms; driver.publication 2.746ms; driver.expected-state.bind-receipt 1.764ms; driver.expected-state.bind-receipt 1.000ms |
| 417bfc4f9929a22c0000000000000166 | 65.359 | 7.831 | 0.335 | 0.000 | 0.187 | 2.059 | 42.672 | 0.086 | n/a | 0.404 | 11.707 | n/a | n/a | 0.077 | 8.353 | 0.128 | 0.077 | gw-w/thread-46/gateway.admitted-work | none observed |
| 417bfc4f9929a22c000000000000014d | 62.132 | 7.755 | 0.005 | 1.421 | 0.271 | 1.081 | 26.331 | 0.079 | n/a | 0.138 | 24.971 | n/a | n/a | 0.081 | 9.452 | 0.152 | 0.081 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000170 | 59.408 | 4.556 | 0.287 | 0.258 | 0.087 | 2.112 | 20.502 | 0.091 | n/a | 1.307 | 30.155 | n/a | n/a | 0.053 | 5.188 | 0.087 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000138 | 54.993 | 5.123 | 0.269 | 0.000 | 0.140 | 1.795 | 14.956 | 0.130 | n/a | 1.043 | 31.463 | n/a | n/a | 0.075 | 5.532 | 0.101 | 0.075 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000012e | 50.439 | 4.789 | 0.361 | 0.000 | 0.088 | 1.912 | 11.213 | 0.054 | n/a | 0.109 | 31.855 | n/a | n/a | 0.056 | 5.239 | 0.104 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000162 | 47.579 | 6.960 | 0.379 | 0.000 | 0.206 | 2.065 | 23.833 | 0.102 | n/a | 0.147 | 13.792 | n/a | n/a | 0.095 | 7.545 | 0.159 | 0.095 | gw-w/thread-43/gateway.admitted-work | none observed |
| 417bfc4f9929a22c000000000000012c | 47.082 | 5.925 | 0.267 | 0.507 | 0.134 | 1.763 | 17.514 | 0.050 | n/a | 0.116 | 20.689 | n/a | n/a | 0.117 | 6.832 | 0.145 | 0.117 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000013e | 45.891 | 3.982 | 0.213 | 0.000 | 0.078 | 1.566 | 8.936 | 0.056 | n/a | 0.088 | 30.927 | n/a | n/a | 0.044 | 4.273 | 0.093 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000147 | 44.255 | 4.211 | 0.005 | 0.000 | 1.033 | 5.764 | 12.923 | 0.094 | n/a | 0.152 | 20.010 | n/a | n/a | 0.063 | 5.249 | 0.119 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000135 | 43.761 | 5.904 | 0.319 | 0.766 | 0.104 | 2.254 | 13.932 | 0.124 | n/a | 1.547 | 18.751 | n/a | n/a | 0.060 | 7.093 | 0.162 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000132 | 43.333 | 3.740 | 0.005 | 0.000 | 0.815 | 1.079 | 2.555 | 0.084 | n/a | 0.474 | 34.508 | n/a | n/a | 0.072 | 4.561 | 0.105 | 0.072 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000143 | 40.796 | 9.168 | 0.015 | 0.000 | 0.340 | 1.482 | 2.831 | 0.050 | n/a | 0.164 | 26.640 | n/a | n/a | 0.107 | 9.523 | 0.233 | 0.107 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000173 | 40.376 | 7.802 | 0.007 | 0.000 | 0.162 | 0.956 | 6.611 | 0.115 | n/a | 0.226 | 24.446 | n/a | n/a | 0.052 | 7.971 | 0.197 | 0.052 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000172 | 39.396 | 6.409 | 0.268 | 0.000 | 0.112 | 2.202 | 10.243 | 0.060 | n/a | 0.140 | 19.896 | n/a | n/a | 0.067 | 6.789 | 0.172 | 0.067 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000014b | 37.376 | 4.273 | 0.005 | 0.000 | 0.546 | 0.947 | 2.050 | 0.045 | n/a | 1.029 | 28.438 | n/a | n/a | 0.043 | 4.825 | 0.129 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.209 | 0.938 | 0.000 | 1.878 | 4.310 | 0.006 | 0.000 | 1.004 | 1.433 | 2.555 | 0.084 | n/a | 0.410 | 14.677 | n/a | n/a | 0.073 | 5.910 | 0.199 | 0.073 |
| p99 | 95.701 | 4.168 | 0.092 | 7.950 | 17.467 | 0.025 | 0.000 | 9.958 | 17.319 | 16.992 | 0.229 | n/a | 0.662 | 53.183 | n/a | n/a | 0.151 | 18.653 | 0.545 | 0.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c000000000000015b | 95.701 | 11.855 | 0.007 | 0.000 | 0.867 | 14.543 | 14.436 | 0.229 | n/a | 0.468 | 53.183 | n/a | n/a | 0.113 | 12.729 | 0.133 | 0.113 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000015d | 70.763 | 17.467 | 0.025 | 0.000 | 1.161 | 17.319 | 16.992 | 0.110 | n/a | 0.304 | 17.234 | n/a | n/a | 0.151 | 18.653 | 0.264 | 0.151 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 5.833ms; driver.publication 2.746ms; driver.expected-state.bind-receipt 1.764ms; driver.expected-state.bind-receipt 1.000ms |
| 417bfc4f9929a22c0000000000000147 | 44.255 | 4.211 | 0.005 | 0.000 | 1.033 | 5.764 | 12.923 | 0.094 | n/a | 0.152 | 20.010 | n/a | n/a | 0.063 | 5.249 | 0.119 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000132 | 43.333 | 3.740 | 0.005 | 0.000 | 0.815 | 1.079 | 2.555 | 0.084 | n/a | 0.474 | 34.508 | n/a | n/a | 0.072 | 4.561 | 0.105 | 0.072 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000176 | 26.209 | 4.310 | 0.005 | 0.000 | 9.958 | 0.759 | 1.383 | 0.039 | n/a | 0.139 | 9.542 | n/a | n/a | 0.074 | 14.273 | 0.545 | 0.074 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.891ms; driver.publication 1.496ms |
| 417bfc4f9929a22c0000000000000136 | 23.693 | 8.616 | 0.010 | 0.000 | 1.004 | 2.123 | 5.732 | 0.127 | n/a | 0.662 | 5.344 | n/a | n/a | 0.074 | 9.631 | 0.406 | 0.074 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000151 | 23.509 | 3.531 | 0.006 | 0.000 | 1.130 | 1.195 | 2.435 | 0.073 | n/a | 0.410 | 14.677 | n/a | n/a | 0.051 | 4.667 | 0.199 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000016d | 15.460 | 5.042 | 0.007 | 0.000 | 0.862 | 1.433 | 2.063 | 0.059 | n/a | 0.610 | 5.312 | n/a | n/a | 0.073 | 5.910 | 0.382 | 0.073 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 110.194 | n/a | n/a | n/a | 31.329 | 8.389 | 1.840 | 0.000 | 0.407 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.048 | 51.481 | 0.625 | 36.048 |
| p99 | 227.995 | n/a | n/a | n/a | 89.209 | 137.569 | 29.263 | 0.000 | 20.061 | 42.642 | 13.595 | n/a | 0.015 | 0.000 | n/a | n/a | 161.657 | 201.682 | 1.000 | 161.657 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c000000000000121b | 227.995 | 54.234 | 137.569 | 9.879 | 0.000 | 0.642 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.671 | 201.682 | 0.885 | 25.671 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.215ms; driver.expected-state.bind-receipt 2.028ms; driver.publication 1.682ms; driver.publication 1.410ms; driver.publication 1.339ms |
| 417bfc4f9929a22c0000000000001221 | 222.344 | 19.669 | 77.065 | 0.000 | 0.000 | 0.354 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 125.256 | 96.735 | 0.435 | 125.256 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.215ms; driver.publication 1.682ms; driver.publication 1.339ms; driver.publication 1.334ms; driver.publication 1.148ms |
| 417bfc4f9929a22c0000000000001a5e | 212.903 | 53.987 | 119.923 | 6.489 | 0.000 | 0.494 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.011 | 180.398 | 0.847 | 32.011 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 4.409ms; driver.publication 3.843ms; driver.expected-state.bind-receipt 3.192ms; driver.publication 1.883ms; driver.publication 1.222ms |
| 417bfc4f9929a22c0000000000001222 | 209.014 | 28.515 | 112.617 | 1.284 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.245 | 142.416 | 0.681 | 66.245 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.215ms; driver.publication 1.682ms; driver.publication 1.339ms; driver.publication 1.037ms; driver.publication 1.035ms |
| 417bfc4f9929a22c0000000000000af6 | 204.259 | 31.410 | 65.604 | 3.597 | 0.000 | 0.681 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 102.968 | 100.611 | 0.493 | 102.968 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.091ms; driver.expected-state.bind-receipt 1.490ms; driver.publication 1.396ms; driver.publication 1.283ms; driver.publication 1.281ms |
| 417bfc4f9929a22c0000000000000af9 | 200.047 | 17.656 | 69.112 | 0.000 | 0.000 | 0.331 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 112.949 | 86.767 | 0.434 | 112.949 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.091ms; driver.expected-state.bind-receipt 1.490ms; driver.publication 1.396ms; driver.publication 1.283ms; driver.publication 1.281ms |
| 417bfc4f9929a22c0000000000000af5 | 196.132 | 32.959 | 0.268 | 0.969 | 0.000 | 0.280 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 161.657 | 34.196 | 0.174 | 161.657 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.091ms; driver.expected-state.bind-receipt 1.490ms; driver.publication 1.396ms; driver.publication 1.283ms; driver.publication 1.282ms |
| 417bfc4f9929a22c0000000000000af1 | 192.396 | 75.737 | 7.401 | 9.301 | 0.000 | 0.463 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 99.495 | 92.439 | 0.480 | 99.495 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.091ms; driver.publication 1.603ms; driver.expected-state.bind-receipt 1.490ms; driver.publication 1.396ms; driver.publication 1.283ms |
| 417bfc4f9929a22c0000000000001a9f | 186.705 | 68.543 | 42.942 | 5.760 | 0.000 | 0.506 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.954 | 117.245 | 0.628 | 68.954 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.039ms; driver.publication 1.754ms; driver.publication 1.105ms; driver.publication 1.040ms; driver.publication 1.023ms |
| 417bfc4f9929a22c0000000000001218 | 181.816 | 19.425 | 2.287 | 2.155 | 0.000 | 0.326 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 157.623 | 23.867 | 0.131 | 157.623 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 2.028ms; driver.publication 1.410ms; driver.publication 1.339ms; driver.publication 1.148ms; driver.publication 1.037ms |
| 417bfc4f9929a22c0000000000001a97 | 178.166 | 50.837 | 118.700 | 1.768 | 0.000 | 0.498 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.363 | 171.305 | 0.961 | 6.363 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.039ms; driver.publication 1.321ms; driver.publication 1.105ms; driver.publication 1.090ms |
| 417bfc4f9929a22c0000000000001215 | 177.380 | 23.104 | 9.081 | 0.000 | 0.000 | 0.491 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 144.705 | 32.185 | 0.181 | 144.705 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 2.028ms; driver.publication 1.410ms; driver.publication 1.339ms; driver.publication 1.148ms; driver.publication 1.051ms |
| 417bfc4f9929a22c0000000000001213 | 169.568 | 38.479 | 0.238 | 1.713 | 0.000 | 0.494 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 128.645 | 40.429 | 0.238 | 128.645 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 2.028ms; driver.publication 1.410ms; driver.publication 1.339ms; driver.publication 1.148ms; driver.publication 1.064ms |
| 417bfc4f9929a22c0000000000001a5c | 166.751 | 26.120 | 78.169 | 0.000 | 0.000 | 0.825 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.637 | 104.289 | 0.625 | 61.637 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 4.409ms; driver.publication 3.843ms; driver.expected-state.bind-receipt 3.192ms; driver.publication 1.883ms; driver.publication 1.222ms |
| 417bfc4f9929a22c0000000000001a56 | 163.569 | 18.223 | 18.802 | 2.582 | 0.000 | 0.264 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 123.697 | 39.607 | 0.242 | 123.697 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 4.409ms; driver.publication 3.843ms; driver.expected-state.bind-receipt 3.192ms; driver.publication 1.883ms; driver.publication 1.222ms |
| 417bfc4f9929a22c0000000000001a5b | 160.110 | 23.552 | 113.574 | 0.000 | 0.000 | 0.365 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.618 | 137.126 | 0.856 | 22.618 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 4.409ms; driver.publication 3.843ms; driver.expected-state.bind-receipt 3.192ms; driver.publication 1.883ms; driver.publication 1.222ms |
| 417bfc4f9929a22c0000000000001a57 | 159.942 | 14.438 | 105.495 | 0.000 | 0.000 | 0.428 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.582 | 119.933 | 0.750 | 39.582 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 4.409ms; driver.publication 3.843ms; driver.expected-state.bind-receipt 3.192ms; driver.publication 1.883ms; driver.publication 1.222ms |
| 417bfc4f9929a22c00000000000012d0 | 158.603 | 17.608 | 85.816 | 0.000 | 0.000 | 0.407 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.772 | 103.424 | 0.652 | 54.772 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.329ms; driver.publication 1.968ms; driver.publication 1.576ms; driver.publication 1.470ms; driver.publication 1.293ms |
| 417bfc4f9929a22c00000000000003b2 | 151.570 | 11.571 | 79.198 | 0.000 | 0.000 | 0.283 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.519 | 90.769 | 0.599 | 60.519 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.369ms; driver.publication 1.114ms; driver.publication 1.087ms; driver.publication 1.075ms |
| 417bfc4f9929a22c000000000000122b | 149.776 | 14.596 | 48.673 | 0.000 | 0.000 | 0.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.249 | 63.270 | 0.422 | 86.249 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.215ms; driver.publication 1.682ms; driver.publication 1.334ms; driver.publication 1.039ms; driver.publication 1.037ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.004 | 0.953 | 0.000 | 1.228 | 5.885 | 0.195 | 0.000 | 0.140 | 1.503 | 7.277 | 0.056 | n/a | 0.292 | 14.425 | n/a | n/a | 0.057 | 6.423 | 0.222 | 0.057 |
| p99 | 125.946 | 12.404 | 0.017 | 6.311 | 19.052 | 0.616 | 0.605 | 1.107 | 5.206 | 21.878 | 0.547 | n/a | 3.283 | 104.931 | n/a | n/a | 0.131 | 19.861 | 0.472 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c00000000000001a2 | 125.946 | 5.969 | 0.413 | 0.605 | 0.068 | 1.855 | 11.721 | 0.115 | n/a | 0.208 | 104.931 | n/a | n/a | 0.060 | 7.056 | 0.056 | 0.060 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001ba | 56.621 | 14.416 | 0.413 | 0.593 | 0.125 | 2.817 | 18.111 | 0.084 | n/a | 0.151 | 19.804 | n/a | n/a | 0.108 | 15.546 | 0.275 | 0.108 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000198 | 54.427 | 8.371 | 0.335 | 0.340 | 0.103 | 2.192 | 19.712 | 0.547 | n/a | 0.788 | 21.907 | n/a | n/a | 0.131 | 9.149 | 0.168 | 0.131 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000192 | 49.375 | 4.969 | 0.410 | 0.352 | 0.077 | 2.218 | 13.505 | 0.109 | n/a | 0.292 | 27.368 | n/a | n/a | 0.075 | 5.808 | 0.118 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001c1 | 47.394 | 6.230 | 0.250 | 0.426 | 0.079 | 2.133 | 19.663 | 0.082 | n/a | 0.176 | 18.292 | n/a | n/a | 0.064 | 6.985 | 0.147 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000019e | 46.524 | 5.240 | 0.416 | 0.523 | 0.075 | 1.503 | 15.803 | 0.059 | n/a | 0.621 | 22.225 | n/a | n/a | 0.061 | 6.253 | 0.134 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000019f | 42.059 | 19.052 | 0.006 | 0.000 | 0.803 | 1.235 | 2.345 | 0.051 | n/a | 0.167 | 18.327 | n/a | n/a | 0.073 | 19.861 | 0.472 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001a4 | 42.045 | 4.413 | 0.196 | 0.377 | 0.048 | 1.669 | 16.447 | 0.054 | n/a | 0.111 | 18.687 | n/a | n/a | 0.045 | 5.033 | 0.120 | 0.045 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000185 | 41.706 | 5.012 | 0.616 | 0.000 | 0.140 | 1.947 | 12.134 | 0.114 | n/a | 0.167 | 21.517 | n/a | n/a | 0.060 | 5.768 | 0.138 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001b4 | 41.450 | 4.982 | 0.297 | 0.409 | 0.094 | 1.955 | 21.878 | 0.075 | n/a | 0.120 | 11.583 | n/a | n/a | 0.057 | 5.782 | 0.139 | 0.057 | gw-w/thread-42/gateway.admitted-work | none observed |
| 417bfc4f9929a22c00000000000001b0 | 38.445 | 5.002 | 0.219 | 0.268 | 0.103 | 1.436 | 12.862 | 0.044 | n/a | 0.248 | 18.207 | n/a | n/a | 0.057 | 5.592 | 0.145 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001cb | 37.891 | 8.650 | 0.228 | 0.320 | 0.190 | 2.536 | 8.120 | 0.158 | n/a | 0.808 | 16.800 | n/a | n/a | 0.082 | 9.387 | 0.248 | 0.082 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001aa | 37.874 | 4.237 | 0.248 | 0.269 | 0.108 | 1.506 | 12.613 | 0.071 | n/a | 0.267 | 18.500 | n/a | n/a | 0.056 | 4.862 | 0.128 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001a6 | 37.785 | 3.569 | 0.195 | 0.244 | 0.046 | 1.409 | 15.807 | 0.087 | n/a | 0.154 | 16.239 | n/a | n/a | 0.035 | 4.054 | 0.107 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000181 | 37.233 | 6.003 | 0.281 | 0.000 | 0.065 | 1.813 | 11.880 | 0.072 | n/a | 0.094 | 16.984 | n/a | n/a | 0.041 | 6.349 | 0.171 | 0.041 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000188 | 36.354 | 6.118 | 0.348 | 0.000 | 0.141 | 1.640 | 16.802 | 0.053 | n/a | 0.462 | 10.660 | n/a | n/a | 0.128 | 6.608 | 0.182 | 0.128 | gw-w/thread-40/gateway.admitted-work | none observed |
| 417bfc4f9929a22c0000000000000190 | 33.933 | 6.043 | 0.286 | 0.463 | 0.114 | 1.951 | 14.908 | 0.083 | n/a | 0.421 | 9.607 | n/a | n/a | 0.056 | 6.906 | 0.204 | 0.056 | gw-w/thread-40/gateway.admitted-work | none observed |
| 417bfc4f9929a22c0000000000000189 | 31.248 | 5.885 | 0.006 | 0.000 | 0.533 | 1.231 | 8.823 | 0.042 | n/a | 0.447 | 14.238 | n/a | n/a | 0.043 | 6.424 | 0.206 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001c5 | 30.910 | 7.256 | 0.007 | 0.000 | 0.858 | 1.317 | 1.516 | 0.046 | n/a | 0.210 | 19.644 | n/a | n/a | 0.056 | 8.120 | 0.263 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000018d | 30.004 | 5.763 | 0.006 | 0.000 | 0.120 | 3.850 | 1.442 | 0.038 | n/a | 0.113 | 18.603 | n/a | n/a | 0.069 | 5.889 | 0.196 | 0.069 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.059 | 1.176 | 0.000 | 2.103 | 5.763 | 0.007 | 0.000 | 0.631 | 1.067 | 1.516 | 0.043 | n/a | 0.355 | 8.188 | n/a | n/a | 0.053 | 6.221 | 0.303 | 0.053 |
| p99 | 30.910 | 2.048 | 0.014 | 5.321 | 9.258 | 0.021 | 0.000 | 1.107 | 3.850 | 2.263 | 0.094 | n/a | 3.283 | 19.644 | n/a | n/a | 0.093 | 10.383 | 0.412 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c00000000000001c5 | 30.910 | 7.256 | 0.007 | 0.000 | 0.858 | 1.317 | 1.516 | 0.046 | n/a | 0.210 | 19.644 | n/a | n/a | 0.056 | 8.120 | 0.263 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000018d | 30.004 | 5.763 | 0.006 | 0.000 | 0.120 | 3.850 | 1.442 | 0.038 | n/a | 0.113 | 18.603 | n/a | n/a | 0.069 | 5.889 | 0.196 | 0.069 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001bd | 26.015 | 7.236 | 0.021 | 0.000 | 0.631 | 1.188 | 1.902 | 0.048 | n/a | 0.472 | 14.425 | n/a | n/a | 0.093 | 7.887 | 0.303 | 0.093 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000182 | 25.247 | 9.258 | 0.018 | 0.000 | 1.107 | 1.733 | 2.208 | 0.078 | n/a | 0.557 | 10.196 | n/a | n/a | 0.093 | 10.383 | 0.411 | 0.093 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000193 | 20.865 | 5.892 | 0.007 | 0.000 | 0.876 | 1.067 | 1.461 | 0.043 | n/a | 3.283 | 8.188 | n/a | n/a | 0.047 | 6.775 | 0.325 | 0.047 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000195 | 18.059 | 6.486 | 0.008 | 0.000 | 0.443 | 1.067 | 1.698 | 0.053 | n/a | 0.530 | 7.722 | n/a | n/a | 0.052 | 6.937 | 0.384 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000017e | 17.553 | 3.771 | 0.006 | 0.000 | 0.139 | 0.758 | 1.830 | 0.037 | n/a | 0.355 | 10.611 | n/a | n/a | 0.046 | 3.916 | 0.223 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001a7 | 17.544 | 3.950 | 0.007 | 0.000 | 0.374 | 1.259 | 2.263 | 0.094 | n/a | 1.531 | 8.012 | n/a | n/a | 0.055 | 4.331 | 0.247 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001b1 | 15.083 | 5.173 | 0.009 | 0.000 | 1.039 | 1.005 | 1.480 | 0.034 | n/a | 0.096 | 6.193 | n/a | n/a | 0.053 | 6.221 | 0.412 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001c9 | 12.917 | 3.229 | 0.005 | 0.000 | 0.964 | 0.738 | 1.197 | 0.038 | n/a | 0.328 | 6.375 | n/a | n/a | 0.045 | 4.198 | 0.325 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.663 | 0.470 | 0.000 | 1.206 | 5.272 | 0.018 | 0.000 | 0.161 | 1.501 | 4.429 | 0.062 | n/a | 0.383 | 12.408 | n/a | n/a | 0.065 | 5.903 | 0.203 | 0.065 |
| p99 | 143.316 | 6.377 | 0.014 | 6.278 | 14.211 | 0.369 | 1.973 | 1.215 | 8.842 | 31.702 | 0.758 | n/a | 7.715 | 134.268 | n/a | n/a | 0.130 | 17.003 | 0.358 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c00000000000001fe | 143.316 | 5.816 | 0.015 | 0.000 | 0.240 | 1.225 | 1.495 | 0.048 | n/a | 0.124 | 134.268 | n/a | n/a | 0.085 | 6.072 | 0.042 | 0.085 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001f0 | 72.245 | 14.211 | 0.017 | 1.973 | 0.802 | 5.026 | 31.702 | 0.156 | n/a | 0.650 | 17.639 | n/a | n/a | 0.069 | 17.003 | 0.235 | 0.069 | gw-w/thread-40/gateway.admitted-work | none observed |
| 417bfc4f9929a22c00000000000001de | 70.239 | 5.943 | 0.314 | 0.447 | 0.070 | 1.919 | 31.349 | 0.123 | n/a | 3.215 | 26.790 | n/a | n/a | 0.069 | 6.774 | 0.096 | 0.069 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.483ms; driver.expected-state.bind-receipt 1.034ms |
| 417bfc4f9929a22c00000000000001d7 | 58.129 | 7.006 | 0.369 | 0.377 | 0.155 | 4.228 | 25.302 | 0.079 | n/a | 0.199 | 20.313 | n/a | n/a | 0.101 | 7.908 | 0.136 | 0.101 | gw-w/thread-47/gateway.admitted-work | none observed |
| 417bfc4f9929a22c0000000000000202 | 49.604 | 5.562 | 0.363 | 0.440 | 0.114 | 1.851 | 16.519 | 0.054 | n/a | 0.124 | 24.517 | n/a | n/a | 0.061 | 6.479 | 0.131 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001df | 48.313 | 5.778 | 0.006 | 0.000 | 1.215 | 0.646 | 2.713 | 0.072 | n/a | 0.097 | 37.765 | n/a | n/a | 0.022 | 6.998 | 0.145 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000206 | 46.064 | 3.934 | 0.258 | 0.271 | 0.070 | 8.842 | 15.465 | 0.095 | n/a | 0.230 | 16.854 | n/a | n/a | 0.046 | 4.532 | 0.098 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001ee | 46.025 | 4.131 | 0.348 | 0.258 | 0.118 | 2.520 | 21.415 | 0.107 | n/a | 0.187 | 16.857 | n/a | n/a | 0.084 | 4.856 | 0.106 | 0.084 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000020a | 43.699 | 6.770 | 0.313 | 0.298 | 0.069 | 1.917 | 17.223 | 0.148 | n/a | 0.765 | 16.118 | n/a | n/a | 0.077 | 7.450 | 0.170 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001f4 | 39.539 | 5.532 | 0.291 | 0.415 | 0.069 | 1.868 | 12.991 | 0.109 | n/a | 3.659 | 14.560 | n/a | n/a | 0.045 | 6.307 | 0.160 | 0.045 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001d4 | 38.933 | 7.140 | 0.013 | 0.000 | 0.528 | 1.084 | 4.429 | 0.062 | n/a | 0.142 | 25.465 | n/a | n/a | 0.069 | 7.682 | 0.197 | 0.069 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 2.365ms |
| 417bfc4f9929a22c00000000000001f8 | 38.911 | 5.198 | 0.333 | 0.284 | 0.140 | 1.645 | 11.587 | 0.127 | n/a | 0.268 | 19.226 | n/a | n/a | 0.103 | 5.955 | 0.153 | 0.103 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000210 | 33.251 | 3.885 | 0.357 | 0.000 | 0.069 | 1.927 | 8.921 | 0.049 | n/a | 0.361 | 17.628 | n/a | n/a | 0.054 | 4.312 | 0.130 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001ff | 33.125 | 7.278 | 0.351 | 0.258 | 0.113 | 1.602 | 3.180 | 0.073 | n/a | 0.217 | 19.963 | n/a | n/a | 0.090 | 8.000 | 0.242 | 0.090 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.961ms |
| 417bfc4f9929a22c00000000000001d3 | 32.014 | 4.645 | 0.007 | 0.000 | 1.085 | 3.169 | 1.606 | 0.062 | n/a | 0.581 | 20.794 | n/a | n/a | 0.066 | 5.736 | 0.179 | 0.066 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001dc | 31.663 | 3.479 | 0.006 | 0.000 | 0.485 | 1.490 | 10.393 | 0.046 | n/a | 1.544 | 14.168 | n/a | n/a | 0.051 | 3.970 | 0.125 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001fa | 31.326 | 5.461 | 0.231 | 0.279 | 0.115 | 1.838 | 10.749 | 0.065 | n/a | 0.496 | 12.020 | n/a | n/a | 0.071 | 6.087 | 0.194 | 0.071 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001da | 30.491 | 5.699 | 0.268 | 0.349 | 0.067 | 1.947 | 9.323 | 0.089 | n/a | 0.694 | 11.948 | n/a | n/a | 0.108 | 6.383 | 0.209 | 0.108 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000020e | 29.990 | 5.791 | 0.247 | 0.000 | 0.062 | 2.381 | 5.788 | 0.057 | n/a | 0.441 | 15.179 | n/a | n/a | 0.043 | 6.100 | 0.203 | 0.043 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001e2 | 29.962 | 6.090 | 0.018 | 0.000 | 0.836 | 1.043 | 4.170 | 0.054 | n/a | 0.521 | 17.098 | n/a | n/a | 0.130 | 6.945 | 0.232 | 0.130 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.998 | 0.603 | 0.000 | 1.769 | 4.031 | 0.007 | 0.000 | 0.485 | 1.009 | 1.513 | 0.047 | n/a | 0.437 | 11.824 | n/a | n/a | 0.065 | 4.757 | 0.251 | 0.065 |
| p99 | 143.316 | 1.887 | 0.014 | 2.840 | 6.347 | 0.018 | 0.000 | 1.085 | 3.169 | 10.393 | 0.068 | n/a | 7.715 | 134.268 | n/a | n/a | 0.130 | 6.945 | 0.358 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c00000000000001fe | 143.316 | 5.816 | 0.015 | 0.000 | 0.240 | 1.225 | 1.495 | 0.048 | n/a | 0.124 | 134.268 | n/a | n/a | 0.085 | 6.072 | 0.042 | 0.085 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001d3 | 32.014 | 4.645 | 0.007 | 0.000 | 1.085 | 3.169 | 1.606 | 0.062 | n/a | 0.581 | 20.794 | n/a | n/a | 0.066 | 5.736 | 0.179 | 0.066 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001dc | 31.663 | 3.479 | 0.006 | 0.000 | 0.485 | 1.490 | 10.393 | 0.046 | n/a | 1.544 | 14.168 | n/a | n/a | 0.051 | 3.970 | 0.125 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001e2 | 29.962 | 6.090 | 0.018 | 0.000 | 0.836 | 1.043 | 4.170 | 0.054 | n/a | 0.521 | 17.098 | n/a | n/a | 0.130 | 6.945 | 0.232 | 0.130 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001f6 | 24.889 | 6.347 | 0.010 | 0.000 | 0.367 | 1.009 | 1.510 | 0.041 | n/a | 3.716 | 11.824 | n/a | n/a | 0.065 | 6.724 | 0.270 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000020c | 23.149 | 4.031 | 0.011 | 0.000 | 0.161 | 1.042 | 1.818 | 0.051 | n/a | 7.715 | 8.278 | n/a | n/a | 0.043 | 4.203 | 0.182 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001ea | 22.646 | 5.567 | 0.010 | 0.000 | 0.853 | 1.250 | 1.887 | 0.068 | n/a | 0.766 | 12.164 | n/a | n/a | 0.081 | 6.430 | 0.284 | 0.081 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000204 | 20.998 | 5.204 | 0.018 | 0.000 | 0.274 | 0.959 | 1.594 | 0.052 | n/a | 0.434 | 12.408 | n/a | n/a | 0.056 | 5.496 | 0.262 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001cd | 18.498 | 3.332 | 0.006 | 0.000 | 0.957 | 0.796 | 2.707 | 0.046 | n/a | 0.350 | 10.250 | n/a | n/a | 0.056 | 4.295 | 0.232 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001e6 | 17.731 | 3.019 | 0.006 | 0.000 | 0.435 | 0.582 | 1.138 | 0.042 | n/a | 0.383 | 12.087 | n/a | n/a | 0.040 | 3.460 | 0.195 | 0.040 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001cf | 17.085 | 3.839 | 0.007 | 0.000 | 0.911 | 1.090 | 1.513 | 0.047 | n/a | 0.406 | 9.206 | n/a | n/a | 0.066 | 4.757 | 0.278 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000212 | 16.128 | 3.876 | 0.007 | 0.000 | 0.167 | 0.689 | 1.263 | 0.042 | n/a | 0.116 | 9.893 | n/a | n/a | 0.074 | 4.051 | 0.251 | 0.074 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000021c | 14.116 | 4.042 | 0.010 | 0.000 | 0.731 | 0.654 | 1.290 | 0.065 | n/a | 0.137 | 7.133 | n/a | n/a | 0.053 | 4.783 | 0.339 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000208 | 11.991 | 2.821 | 0.005 | 0.000 | 0.548 | 0.713 | 1.109 | 0.035 | n/a | 0.437 | 6.219 | n/a | n/a | 0.104 | 3.374 | 0.281 | 0.104 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000001e8 | 11.906 | 4.012 | 0.006 | 0.000 | 0.245 | 0.777 | 1.300 | 0.042 | n/a | 0.470 | 4.997 | n/a | n/a | 0.057 | 4.263 | 0.358 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.290 | 0.811 | 0.000 | 1.669 | 4.993 | 0.010 | 0.000 | 0.316 | 1.422 | 3.433 | 0.049 | n/a | 0.385 | 11.254 | n/a | n/a | 0.057 | 5.359 | 0.232 | 0.057 |
| p99 | 134.383 | 2.954 | 0.014 | 5.083 | 11.981 | 0.381 | 0.000 | 1.370 | 11.711 | 117.364 | 3.500 | n/a | 3.045 | 65.887 | n/a | n/a | 0.207 | 13.236 | 0.502 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c000000000000022b | 134.383 | 3.763 | 0.217 | 0.000 | 0.071 | 1.422 | 117.364 | 0.091 | n/a | 0.124 | 11.290 | n/a | n/a | 0.043 | 4.051 | 0.030 | 0.043 | gw-w/thread-47/gateway.admitted-work | none observed |
| 417bfc4f9929a22c000000000000025a | 82.574 | 8.512 | 0.008 | 0.000 | 0.316 | 1.159 | 6.491 | 0.038 | n/a | 0.086 | 65.887 | n/a | n/a | 0.077 | 8.836 | 0.107 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000025c | 79.986 | 11.855 | 0.011 | 0.000 | 1.370 | 11.711 | 8.243 | 0.482 | n/a | 1.884 | 44.223 | n/a | n/a | 0.207 | 13.236 | 0.165 | 0.207 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.292ms |
| 417bfc4f9929a22c0000000000000236 | 58.685 | 4.536 | 0.286 | 0.000 | 0.137 | 2.273 | 25.860 | 0.067 | n/a | 2.938 | 22.525 | n/a | n/a | 0.063 | 4.959 | 0.084 | 0.063 | gw-w/thread-43/gateway.admitted-work | none observed |
| 417bfc4f9929a22c000000000000025d | 55.269 | 11.981 | 0.015 | 0.000 | 1.003 | 1.476 | 3.795 | 0.068 | n/a | 0.322 | 36.445 | n/a | n/a | 0.166 | 12.999 | 0.235 | 0.166 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000022e | 47.392 | 3.734 | 0.005 | 0.000 | 0.765 | 1.025 | 1.359 | 0.037 | n/a | 0.724 | 39.665 | n/a | n/a | 0.076 | 4.505 | 0.095 | 0.076 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000232 | 43.858 | 4.855 | 0.371 | 0.000 | 0.070 | 2.084 | 19.999 | 0.738 | n/a | 0.381 | 15.313 | n/a | n/a | 0.047 | 5.296 | 0.121 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000249 | 39.481 | 3.835 | 0.003 | 0.000 | 0.335 | 0.636 | 1.452 | 3.500 | n/a | 0.032 | 29.644 | n/a | n/a | 0.044 | 4.173 | 0.106 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.084ms |
| 417bfc4f9929a22c0000000000000283 | 35.489 | 5.016 | 0.298 | 0.000 | 0.071 | 1.873 | 9.668 | 0.045 | n/a | 0.109 | 18.358 | n/a | n/a | 0.051 | 5.385 | 0.152 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000024e | 35.327 | 4.615 | 0.210 | 0.000 | 0.054 | 5.208 | 8.064 | 0.064 | n/a | 0.171 | 16.898 | n/a | n/a | 0.042 | 4.879 | 0.138 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000242 | 34.836 | 3.445 | 0.289 | 0.000 | 0.069 | 1.889 | 13.886 | 0.072 | n/a | 0.738 | 14.403 | n/a | n/a | 0.046 | 3.803 | 0.109 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000277 | 34.630 | 6.865 | 0.381 | 0.000 | 0.111 | 2.244 | 12.866 | 0.046 | n/a | 1.872 | 10.201 | n/a | n/a | 0.043 | 7.357 | 0.212 | 0.043 | gw-w/thread-47/gateway.admitted-work | driver.publication 2.474ms; driver.expected-state.bind-receipt 1.406ms |
| 417bfc4f9929a22c0000000000000244 | 33.950 | 5.668 | 0.254 | 0.000 | 0.117 | 1.935 | 11.898 | 0.042 | n/a | 0.434 | 13.535 | n/a | n/a | 0.067 | 6.039 | 0.178 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000248 | 33.131 | 4.845 | 0.006 | 0.000 | 0.456 | 7.019 | 0.984 | 1.758 | n/a | 0.199 | 17.793 | n/a | n/a | 0.070 | 5.307 | 0.160 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000269 | 32.560 | 4.311 | 0.317 | 0.000 | 0.073 | 3.009 | 6.345 | 0.042 | n/a | 0.168 | 18.230 | n/a | n/a | 0.065 | 4.701 | 0.144 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000262 | 29.776 | 6.523 | 0.298 | 0.000 | 0.052 | 1.934 | 8.680 | 0.068 | n/a | 0.132 | 12.006 | n/a | n/a | 0.082 | 6.874 | 0.231 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000221 | 29.531 | 3.263 | 0.300 | 0.000 | 0.067 | 1.471 | 11.177 | 0.066 | n/a | 0.172 | 12.975 | n/a | n/a | 0.041 | 3.630 | 0.123 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000266 | 28.645 | 6.635 | 0.247 | 0.000 | 0.096 | 1.709 | 5.758 | 0.089 | n/a | 0.196 | 13.830 | n/a | n/a | 0.085 | 6.979 | 0.244 | 0.085 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000271 | 28.488 | 3.897 | 0.221 | 0.000 | 0.067 | 1.714 | 9.646 | 0.067 | n/a | 1.575 | 11.254 | n/a | n/a | 0.045 | 4.186 | 0.147 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000278 | 27.560 | 9.059 | 0.014 | 0.000 | 0.479 | 0.893 | 1.329 | 0.038 | n/a | 0.070 | 15.630 | n/a | n/a | 0.047 | 9.553 | 0.347 | 0.047 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.654 | 0.904 | 0.000 | 1.923 | 4.140 | 0.006 | 0.000 | 0.727 | 0.812 | 1.978 | 0.041 | n/a | 0.322 | 10.761 | n/a | n/a | 0.057 | 4.836 | 0.234 | 0.057 |
| p99 | 79.986 | 2.954 | 0.007 | 5.083 | 11.981 | 0.015 | 0.000 | 1.370 | 11.711 | 9.793 | 3.500 | n/a | 1.884 | 44.223 | n/a | n/a | 0.207 | 13.236 | 0.388 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c000000000000025c | 79.986 | 11.855 | 0.011 | 0.000 | 1.370 | 11.711 | 8.243 | 0.482 | n/a | 1.884 | 44.223 | n/a | n/a | 0.207 | 13.236 | 0.165 | 0.207 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.292ms |
| 417bfc4f9929a22c000000000000025d | 55.269 | 11.981 | 0.015 | 0.000 | 1.003 | 1.476 | 3.795 | 0.068 | n/a | 0.322 | 36.445 | n/a | n/a | 0.166 | 12.999 | 0.235 | 0.166 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000022e | 47.392 | 3.734 | 0.005 | 0.000 | 0.765 | 1.025 | 1.359 | 0.037 | n/a | 0.724 | 39.665 | n/a | n/a | 0.076 | 4.505 | 0.095 | 0.076 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000249 | 39.481 | 3.835 | 0.003 | 0.000 | 0.335 | 0.636 | 1.452 | 3.500 | n/a | 0.032 | 29.644 | n/a | n/a | 0.044 | 4.173 | 0.106 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.084ms |
| 417bfc4f9929a22c0000000000000268 | 24.478 | 5.365 | 0.006 | 0.000 | 0.445 | 5.434 | 8.110 | 0.064 | n/a | 0.498 | 4.499 | n/a | n/a | 0.057 | 5.815 | 0.238 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000027b | 23.378 | 4.993 | 0.007 | 0.000 | 0.360 | 1.002 | 2.420 | 0.104 | n/a | 0.159 | 14.206 | n/a | n/a | 0.128 | 5.359 | 0.229 | 0.128 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000225 | 23.369 | 4.134 | 0.006 | 0.000 | 0.426 | 1.207 | 2.119 | 0.058 | n/a | 0.388 | 14.967 | n/a | n/a | 0.065 | 4.565 | 0.195 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000220 | 23.026 | 4.507 | 0.006 | 0.000 | 0.170 | 3.333 | 9.793 | 0.191 | n/a | 0.767 | 4.194 | n/a | n/a | 0.066 | 4.682 | 0.203 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000023e | 22.654 | 7.752 | 0.008 | 0.000 | 1.027 | 0.686 | 1.978 | 0.036 | n/a | 0.079 | 10.985 | n/a | n/a | 0.102 | 8.788 | 0.388 | 0.102 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000026d | 21.100 | 4.004 | 0.005 | 0.000 | 0.827 | 0.614 | 1.443 | 0.034 | n/a | 0.408 | 13.720 | n/a | n/a | 0.045 | 4.836 | 0.229 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000027f | 20.414 | 7.121 | 0.009 | 0.000 | 0.778 | 1.306 | 2.163 | 0.069 | n/a | 0.263 | 8.649 | n/a | n/a | 0.056 | 7.908 | 0.387 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000229 | 20.257 | 6.498 | 0.006 | 0.000 | 0.727 | 0.742 | 1.341 | 0.041 | n/a | 0.100 | 10.761 | n/a | n/a | 0.042 | 7.231 | 0.357 | 0.042 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000263 | 16.085 | 4.140 | 0.005 | 0.000 | 1.179 | 0.812 | 1.357 | 0.032 | n/a | 0.139 | 8.363 | n/a | n/a | 0.058 | 5.324 | 0.331 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000252 | 15.386 | 2.957 | 0.005 | 0.000 | 1.034 | 0.678 | 1.302 | 0.033 | n/a | 0.389 | 8.937 | n/a | n/a | 0.051 | 3.996 | 0.260 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000275 | 15.306 | 3.412 | 0.006 | 0.000 | 0.104 | 0.622 | 3.270 | 0.034 | n/a | 0.385 | 7.431 | n/a | n/a | 0.042 | 3.521 | 0.230 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000234 | 13.165 | 2.781 | 0.005 | 0.000 | 0.301 | 0.682 | 1.321 | 0.033 | n/a | 0.103 | 7.896 | n/a | n/a | 0.042 | 3.087 | 0.234 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000281 | 11.681 | 3.711 | 0.010 | 0.000 | 0.221 | 0.554 | 1.227 | 0.034 | n/a | 0.287 | 5.592 | n/a | n/a | 0.044 | 3.942 | 0.338 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.220 | 0.680 | 0.000 | 1.077 | 4.749 | 0.027 | 0.000 | 0.325 | 1.424 | 4.405 | 0.046 | n/a | 0.168 | 9.978 | n/a | n/a | 0.068 | 5.427 | 0.261 | 0.068 |
| p99 | 76.884 | 4.105 | 0.010 | 5.300 | 13.759 | n/a | 0.000 | 1.101 | 5.260 | 59.234 | 0.184 | n/a | 8.676 | 55.475 | n/a | n/a | 0.156 | 14.858 | 0.442 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c00000000000002c3 | 76.884 | 4.988 | 0.330 | 0.000 | 0.077 | 1.822 | 13.882 | 0.082 | n/a | 0.168 | 55.475 | n/a | n/a | 0.060 | 5.394 | 0.070 | 0.060 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002a5 | 75.781 | 4.108 | 0.322 | 0.000 | 0.057 | 1.643 | 59.234 | 0.046 | n/a | 0.171 | 10.151 | n/a | n/a | 0.048 | 4.487 | 0.059 | 0.048 | gw-w/thread-47/gateway.admitted-work | none observed |
| 417bfc4f9929a22c0000000000000293 | 75.352 | 7.928 | 0.016 | 0.000 | 0.803 | 3.220 | 15.752 | 0.184 | n/a | 1.453 | 45.943 | n/a | n/a | 0.054 | 8.746 | 0.116 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002a9 | 47.187 | 4.956 | 0.406 | 0.000 | 0.220 | 1.774 | 20.308 | 0.055 | n/a | 0.371 | 19.017 | n/a | n/a | 0.079 | 5.583 | 0.118 | 0.079 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.631ms |
| 417bfc4f9929a22c00000000000002cb | 45.104 | 3.882 | 0.266 | 0.000 | 0.066 | 1.340 | 31.458 | 0.036 | n/a | 0.122 | 7.879 | n/a | n/a | 0.054 | 4.215 | 0.093 | 0.054 | gw-w/thread-44/gateway.admitted-work | none observed |
| 417bfc4f9929a22c0000000000000287 | 42.579 | 8.692 | 0.206 | 0.000 | 0.068 | 3.731 | 10.713 | 0.057 | n/a | 0.156 | 18.905 | n/a | n/a | 0.052 | 8.966 | 0.211 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002b9 | 40.472 | 3.511 | 0.224 | 0.000 | 0.104 | 1.236 | 25.727 | 0.035 | n/a | 0.072 | 9.488 | n/a | n/a | 0.074 | 3.840 | 0.095 | 0.074 | gw-w/thread-46/gateway.admitted-work | none observed |
| 417bfc4f9929a22c0000000000000299 | 37.799 | 4.918 | 0.353 | 0.000 | 0.070 | 4.959 | 6.912 | 0.046 | n/a | 0.103 | 20.366 | n/a | n/a | 0.071 | 5.342 | 0.141 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000292 | 37.743 | 6.233 | 0.289 | 0.000 | 0.082 | 2.423 | 10.173 | 0.030 | n/a | 0.114 | 18.348 | n/a | n/a | 0.050 | 6.604 | 0.175 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002ad | 37.198 | 4.645 | 0.311 | 0.000 | 0.123 | 1.717 | 10.443 | 0.090 | n/a | 0.742 | 18.995 | n/a | n/a | 0.132 | 5.079 | 0.137 | 0.132 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002d4 | 36.085 | 13.759 | 0.432 | 0.000 | 0.668 | 3.996 | 7.525 | 0.079 | n/a | 0.276 | 9.194 | n/a | n/a | 0.156 | 14.858 | 0.412 | 0.156 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002d6 | 35.731 | 5.883 | 0.447 | 0.000 | 0.138 | 1.941 | 10.191 | 0.038 | n/a | 0.128 | 16.884 | n/a | n/a | 0.082 | 6.467 | 0.181 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002b5 | 33.418 | 5.240 | 0.325 | 0.000 | 0.179 | 5.260 | 9.741 | 0.048 | n/a | 0.387 | 12.130 | n/a | n/a | 0.106 | 5.745 | 0.172 | 0.106 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002bf | 32.515 | 4.749 | 0.357 | 0.000 | 0.113 | 1.583 | 6.385 | 0.047 | n/a | 0.132 | 19.066 | n/a | n/a | 0.084 | 5.219 | 0.161 | 0.084 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002aa | 31.441 | 10.350 | 0.027 | 0.000 | 0.022 | 1.425 | 3.035 | 0.068 | n/a | 8.676 | 7.797 | n/a | n/a | 0.040 | 10.399 | 0.331 | 0.040 | gw-w/thread-46/d/transact-async | none observed |
| 417bfc4f9929a22c0000000000000289 | 31.050 | 7.320 | 0.013 | 0.000 | 0.517 | 0.934 | 1.487 | 0.038 | n/a | 0.111 | 20.543 | n/a | n/a | 0.086 | 7.850 | 0.253 | 0.086 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002d8 | 30.748 | 5.170 | 0.255 | 0.000 | 0.108 | 1.818 | 5.884 | 0.042 | n/a | 0.859 | 16.543 | n/a | n/a | 0.068 | 5.533 | 0.180 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002af | 29.315 | 10.241 | 0.012 | 0.000 | 0.475 | 0.921 | 1.387 | 0.041 | n/a | 0.157 | 15.986 | n/a | n/a | 0.096 | 10.728 | 0.366 | 0.096 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002b3 | 27.654 | 4.086 | 0.194 | 0.000 | 0.071 | 1.759 | 8.794 | 0.086 | n/a | 0.165 | 12.456 | n/a | n/a | 0.045 | 4.350 | 0.157 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000029b | 25.831 | 4.500 | 0.355 | 0.000 | 0.125 | 1.880 | 7.904 | 0.041 | n/a | 0.456 | 10.464 | n/a | n/a | 0.106 | 4.980 | 0.193 | 0.106 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.695 | 1.041 | 0.000 | 1.976 | 4.227 | 0.009 | 0.000 | 0.703 | 0.894 | 1.428 | 0.041 | n/a | 0.126 | 5.890 | n/a | n/a | 0.066 | 5.053 | 0.339 | 0.066 |
| p99 | 75.352 | 1.959 | 0.010 | 5.300 | 10.241 | n/a | 0.000 | 1.101 | 3.220 | 15.752 | 0.184 | n/a | 1.453 | 45.943 | n/a | n/a | 0.128 | 10.728 | 0.401 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c0000000000000293 | 75.352 | 7.928 | 0.016 | 0.000 | 0.803 | 3.220 | 15.752 | 0.184 | n/a | 1.453 | 45.943 | n/a | n/a | 0.054 | 8.746 | 0.116 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002af | 29.315 | 10.241 | 0.012 | 0.000 | 0.475 | 0.921 | 1.387 | 0.041 | n/a | 0.157 | 15.986 | n/a | n/a | 0.096 | 10.728 | 0.366 | 0.096 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002bd | 23.855 | 6.052 | 0.009 | 0.000 | 0.703 | 0.792 | 1.343 | 0.030 | n/a | 0.325 | 14.536 | n/a | n/a | 0.066 | 6.763 | 0.284 | 0.066 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002c1 | 18.409 | 6.331 | 0.012 | 0.000 | 0.622 | 1.071 | 4.405 | 0.054 | n/a | 0.124 | 5.701 | n/a | n/a | 0.090 | 6.964 | 0.378 | 0.090 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002a3 | 16.534 | 3.832 | 0.006 | 0.000 | 1.023 | 0.787 | 1.091 | 0.039 | n/a | 0.118 | 9.591 | n/a | n/a | 0.048 | 4.861 | 0.294 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002bb | 15.126 | 4.227 | 0.007 | 0.000 | 0.900 | 0.982 | 2.317 | 0.079 | n/a | 0.998 | 5.492 | n/a | n/a | 0.125 | 5.134 | 0.339 | 0.125 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002c6 | 15.003 | 4.533 | 0.010 | 0.000 | 0.884 | 0.917 | 2.102 | 0.047 | n/a | 0.125 | 6.336 | n/a | n/a | 0.049 | 5.427 | 0.362 | 0.049 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.298ms |
| 417bfc4f9929a22c00000000000002c9 | 14.695 | 3.921 | 0.011 | 0.000 | 0.958 | 0.852 | 2.300 | 0.053 | n/a | 0.113 | 6.450 | n/a | n/a | 0.036 | 4.891 | 0.333 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000029c | 13.740 | 4.391 | 0.006 | 0.000 | 1.101 | 0.610 | 1.289 | 0.030 | n/a | 0.352 | 5.890 | n/a | n/a | 0.071 | 5.498 | 0.400 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000000285 | 13.592 | 3.191 | 0.005 | 0.000 | 0.807 | 0.517 | 0.944 | 0.030 | n/a | 0.091 | 7.970 | n/a | n/a | 0.037 | 4.003 | 0.294 | 0.037 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002a6 | 12.611 | 4.470 | 0.005 | 0.000 | 0.577 | 0.761 | 1.526 | 0.050 | n/a | 0.126 | 5.025 | n/a | n/a | 0.070 | 5.053 | 0.401 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002b7 | 12.352 | 4.221 | 0.005 | 0.000 | 0.325 | 1.010 | 1.428 | 0.038 | n/a | 0.130 | 5.106 | n/a | n/a | 0.088 | 4.552 | 0.368 | 0.088 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c000000000000029f | 12.148 | 3.978 | 0.009 | 0.000 | 0.549 | 0.894 | 0.957 | 0.030 | n/a | 0.353 | 5.321 | n/a | n/a | 0.057 | 4.536 | 0.373 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000002cd | 11.749 | 2.916 | n/a | 0.000 | 0.586 | 1.886 | 6.128 | 0.042 | n/a | 0.062 | 0.000 | n/a | n/a | 0.128 | 3.502 | 0.298 | 0.128 | gw-w/thread-46/storage/begin-command! | none observed |

## P2 / L1024 / commit (862 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.077 | 0.907 | 0.000 | 1.745 | 3.984 | 0.005 | 0.000 | 0.810 | 0.876 | 1.311 | 0.037 | n/a | 0.134 | 8.138 | n/a | n/a | 0.041 | 5.070 | 0.308 | 0.041 |
| p99 | 85.811 | 3.208 | 0.039 | 5.962 | 12.430 | 2.345 | 0.000 | 39.471 | 17.602 | 16.453 | 4.063 | n/a | 4.229 | 53.034 | n/a | n/a | 0.127 | 47.428 | 0.709 | 0.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c000000000000082b | 161.087 | 26.095 | 0.032 | 0.000 | 5.006 | 65.076 | 6.835 | 0.136 | n/a | 0.666 | 57.173 | n/a | n/a | 0.068 | 31.133 | 0.193 | 0.068 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.377ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 3.139ms; driver.publication 2.596ms |
| 417bfc4f9929a22c0000000000000826 | 134.762 | 4.137 | 0.008 | 0.000 | 68.468 | 36.010 | 3.013 | 0.068 | n/a | 5.305 | 17.717 | n/a | n/a | 0.036 | 72.613 | 0.539 | 0.036 | node-14/thread-0/driver.queue.subject | driver.publication 5.985ms; driver.publication 5.377ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 2.596ms |
| 417bfc4f9929a22c0000000000000829 | 125.676 | 13.466 | 0.008 | 3.079 | 71.427 | 11.397 | 2.879 | 0.050 | n/a | 0.160 | 23.143 | n/a | n/a | 0.066 | 87.980 | 0.700 | 0.066 | node-14/thread-0/driver.queue.subject | driver.publication 5.985ms; driver.publication 5.377ms; driver.publication 4.609ms; driver.publication 2.596ms; driver.expected-state.bind-receipt 1.956ms |
| 417bfc4f9929a22c000000000000082d | 117.794 | 5.176 | 0.003 | 0.000 | 87.333 | 0.654 | 1.330 | 0.032 | n/a | 0.268 | 22.962 | n/a | n/a | 0.035 | 92.512 | 0.785 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 5.985ms; driver.publication 5.377ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 2.596ms |
| 417bfc4f9929a22c00000000000003e8 | 96.270 | 7.711 | 0.009 | 0.000 | 0.939 | 7.200 | 35.525 | 0.066 | n/a | 0.101 | 44.677 | n/a | n/a | 0.042 | 8.659 | 0.090 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.359ms; driver.publication 1.010ms |
| 417bfc4f9929a22c0000000000000828 | 94.831 | 10.275 | 0.184 | 0.000 | 4.964 | 22.601 | 2.659 | 0.054 | n/a | 0.092 | 53.943 | n/a | n/a | 0.058 | 15.423 | 0.163 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.377ms; client.encode 3.807ms; driver.publication 1.846ms; driver.publication 1.674ms; driver.expected-state.bind-receipt 1.269ms |
| 417bfc4f9929a22c000000000000082c | 94.531 | 12.493 | 0.008 | 0.000 | 0.421 | 36.922 | 2.760 | 0.060 | n/a | 0.252 | 41.537 | n/a | n/a | 0.079 | 12.922 | 0.137 | 0.079 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 5.985ms; driver.publication 5.377ms; client.encode 3.807ms; driver.publication 2.596ms; driver.expected-state.bind-receipt 1.956ms |
| 417bfc4f9929a22c000000000000035d | 92.339 | 3.870 | 0.010 | 0.000 | 0.835 | 9.721 | 40.369 | 4.773 | n/a | 0.348 | 32.354 | n/a | n/a | 0.058 | 4.715 | 0.051 | 0.058 | gw-w/thread-42/gateway.admitted-work | driver.publication 1.330ms; driver.publication 1.214ms; driver.publication 1.155ms; driver.publication 1.075ms; driver.publication 1.070ms |
| 417bfc4f9929a22c0000000000000394 | 85.811 | 3.807 | 2.345 | 0.000 | 0.034 | 1.510 | 22.522 | 0.083 | n/a | 0.185 | 55.294 | n/a | n/a | 0.032 | 6.185 | 0.072 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.803ms; driver.publication 1.099ms; driver.publication 1.075ms; driver.publication 1.033ms; driver.publication 1.022ms |
| 417bfc4f9929a22c0000000000000834 | 82.382 | 6.737 | 1.380 | 0.000 | 41.619 | 9.504 | 1.419 | 6.391 | n/a | 0.114 | 15.180 | n/a | n/a | 0.038 | 49.736 | 0.604 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.985ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 2.596ms; driver.expected-state.bind-receipt 1.956ms |
| 417bfc4f9929a22c0000000000000836 | 81.720 | 8.289 | 3.317 | 0.000 | 31.165 | 4.192 | 2.908 | 2.969 | n/a | 0.381 | 28.476 | n/a | n/a | 0.024 | 42.771 | 0.523 | 0.024 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.985ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 3.139ms; driver.publication 2.596ms |
| 417bfc4f9929a22c0000000000000358 | 78.174 | 8.544 | 0.011 | 0.000 | 1.077 | 0.577 | 2.140 | 0.059 | n/a | 0.164 | 65.558 | n/a | n/a | 0.045 | 9.631 | 0.123 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.167ms; driver.publication 1.155ms |
| 417bfc4f9929a22c0000000000000827 | 77.332 | 6.235 | 0.005 | 0.000 | 7.299 | 14.792 | 1.472 | 0.049 | n/a | 0.101 | 47.307 | n/a | n/a | 0.073 | 13.539 | 0.175 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 5.377ms; driver.publication 1.846ms; driver.expected-state.bind-receipt 1.122ms; driver.expected-state.bind-receipt 1.110ms |
| 417bfc4f9929a22c0000000000000357 | 76.971 | 4.849 | 0.010 | 0.000 | 1.023 | 2.577 | 0.994 | 0.027 | n/a | 0.696 | 66.731 | n/a | n/a | 0.063 | 5.882 | 0.076 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.167ms |
| 417bfc4f9929a22c0000000000000833 | 76.942 | 4.605 | 0.008 | 0.000 | 42.815 | 6.267 | 2.023 | 0.050 | n/a | 4.300 | 16.835 | n/a | n/a | 0.039 | 47.428 | 0.616 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.985ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 2.596ms; driver.expected-state.bind-receipt 1.956ms |
| 417bfc4f9929a22c000000000000038f | 76.513 | 6.687 | 0.118 | 0.000 | 1.144 | 2.142 | 0.882 | 0.018 | n/a | 0.029 | 65.422 | n/a | n/a | 0.072 | 7.948 | 0.104 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.155ms; driver.publication 1.099ms |
| 417bfc4f9929a22c0000000000000913 | 76.105 | 3.420 | 0.005 | 0.000 | 20.454 | 3.358 | 1.755 | 0.044 | n/a | 0.106 | 46.938 | n/a | n/a | 0.024 | 23.879 | 0.314 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.470ms; driver.publication 1.645ms; driver.publication 1.417ms; driver.publication 1.308ms; driver.publication 1.269ms |
| 417bfc4f9929a22c000000000000082f | 75.615 | 3.986 | 0.006 | 0.000 | 8.540 | 29.107 | 2.539 | 3.332 | n/a | 0.112 | 27.953 | n/a | n/a | 0.040 | 12.531 | 0.166 | 0.040 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.985ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 3.469ms; driver.publication 2.596ms |
| 417bfc4f9929a22c00000000000006cb | 75.246 | 22.752 | 0.288 | 0.000 | 2.183 | 25.559 | 6.966 | 0.043 | n/a | 2.334 | 15.065 | n/a | n/a | 0.056 | 25.224 | 0.335 | 0.056 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.293ms; driver.publication 1.622ms; driver.publication 1.490ms; driver.publication 1.223ms; driver.expected-state.bind-receipt 0.482ms |
| 417bfc4f9929a22c0000000000000361 | 71.994 | 4.814 | 0.008 | 0.000 | 26.103 | 9.349 | 1.350 | 0.031 | n/a | 0.300 | 30.003 | n/a | n/a | 0.037 | 30.925 | 0.430 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.350ms; driver.publication 1.330ms; driver.publication 1.214ms; driver.publication 1.155ms; driver.publication 1.075ms |

## P2 / L1024 / commit / 5-10 facts (503 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.299 | 0.738 | 0.000 | 1.575 | 3.417 | 0.005 | 0.000 | 0.823 | 0.880 | 1.141 | 0.037 | n/a | 0.128 | 7.464 | n/a | n/a | 0.041 | 4.539 | 0.299 | 0.041 |
| p99 | 77.332 | 2.226 | 0.037 | 4.657 | 9.288 | 1.380 | 0.000 | 39.471 | 14.536 | 10.513 | 4.063 | n/a | 4.229 | 47.307 | n/a | n/a | 0.119 | 41.983 | 0.708 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c0000000000000826 | 134.762 | 4.137 | 0.008 | 0.000 | 68.468 | 36.010 | 3.013 | 0.068 | n/a | 5.305 | 17.717 | n/a | n/a | 0.036 | 72.613 | 0.539 | 0.036 | node-14/thread-0/driver.queue.subject | driver.publication 5.985ms; driver.publication 5.377ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 2.596ms |
| 417bfc4f9929a22c000000000000082d | 117.794 | 5.176 | 0.003 | 0.000 | 87.333 | 0.654 | 1.330 | 0.032 | n/a | 0.268 | 22.962 | n/a | n/a | 0.035 | 92.512 | 0.785 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 5.985ms; driver.publication 5.377ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 2.596ms |
| 417bfc4f9929a22c00000000000003e8 | 96.270 | 7.711 | 0.009 | 0.000 | 0.939 | 7.200 | 35.525 | 0.066 | n/a | 0.101 | 44.677 | n/a | n/a | 0.042 | 8.659 | 0.090 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.359ms; driver.publication 1.010ms |
| 417bfc4f9929a22c000000000000035d | 92.339 | 3.870 | 0.010 | 0.000 | 0.835 | 9.721 | 40.369 | 4.773 | n/a | 0.348 | 32.354 | n/a | n/a | 0.058 | 4.715 | 0.051 | 0.058 | gw-w/thread-42/gateway.admitted-work | driver.publication 1.330ms; driver.publication 1.214ms; driver.publication 1.155ms; driver.publication 1.075ms; driver.publication 1.070ms |
| 417bfc4f9929a22c0000000000000834 | 82.382 | 6.737 | 1.380 | 0.000 | 41.619 | 9.504 | 1.419 | 6.391 | n/a | 0.114 | 15.180 | n/a | n/a | 0.038 | 49.736 | 0.604 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.985ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 2.596ms; driver.expected-state.bind-receipt 1.956ms |
| 417bfc4f9929a22c0000000000000827 | 77.332 | 6.235 | 0.005 | 0.000 | 7.299 | 14.792 | 1.472 | 0.049 | n/a | 0.101 | 47.307 | n/a | n/a | 0.073 | 13.539 | 0.175 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 5.377ms; driver.publication 1.846ms; driver.expected-state.bind-receipt 1.122ms; driver.expected-state.bind-receipt 1.110ms |
| 417bfc4f9929a22c0000000000000357 | 76.971 | 4.849 | 0.010 | 0.000 | 1.023 | 2.577 | 0.994 | 0.027 | n/a | 0.696 | 66.731 | n/a | n/a | 0.063 | 5.882 | 0.076 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.167ms |
| 417bfc4f9929a22c0000000000000833 | 76.942 | 4.605 | 0.008 | 0.000 | 42.815 | 6.267 | 2.023 | 0.050 | n/a | 4.300 | 16.835 | n/a | n/a | 0.039 | 47.428 | 0.616 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.985ms; driver.publication 4.609ms; client.encode 3.807ms; driver.publication 2.596ms; driver.expected-state.bind-receipt 1.956ms |
| 417bfc4f9929a22c0000000000000913 | 76.105 | 3.420 | 0.005 | 0.000 | 20.454 | 3.358 | 1.755 | 0.044 | n/a | 0.106 | 46.938 | n/a | n/a | 0.024 | 23.879 | 0.314 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.470ms; driver.publication 1.645ms; driver.publication 1.417ms; driver.publication 1.308ms; driver.publication 1.269ms |
| 417bfc4f9929a22c000000000000035a | 68.386 | 4.522 | 0.010 | 0.000 | 0.690 | 6.006 | 1.071 | 0.033 | n/a | 0.081 | 55.936 | n/a | n/a | 0.037 | 5.222 | 0.076 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.214ms; driver.publication 1.167ms; driver.publication 1.155ms |
| 417bfc4f9929a22c000000000000035e | 67.961 | 4.548 | 0.006 | 0.000 | 1.033 | 12.372 | 10.513 | 0.142 | n/a | 4.229 | 35.059 | n/a | n/a | 0.060 | 5.586 | 0.082 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.330ms; driver.publication 1.214ms; driver.publication 1.155ms; driver.publication 1.075ms |
| 417bfc4f9929a22c0000000000000370 | 65.377 | 2.551 | 0.005 | 0.000 | 55.524 | 0.640 | 1.005 | 0.050 | n/a | 0.152 | 5.418 | n/a | n/a | 0.032 | 58.080 | 0.888 | 0.032 | node-14/thread-0/driver.queue.subject | driver.publication 1.350ms; driver.publication 1.247ms; driver.publication 1.149ms |
| 417bfc4f9929a22c000000000000051f | 63.477 | 2.471 | 0.002 | 0.000 | 0.944 | 2.190 | 1.519 | 0.056 | n/a | 0.074 | 56.200 | n/a | n/a | 0.022 | 3.417 | 0.054 | 0.022 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 2.926ms; driver.publication 1.117ms |
| 417bfc4f9929a22c000000000000094d | 60.991 | 2.223 | 0.004 | 0.000 | 5.081 | 11.033 | 24.042 | 0.011 | n/a | 0.059 | 18.514 | n/a | n/a | 0.025 | 7.307 | 0.120 | 0.025 | gw-w/thread-44/commit.prepare-and-validate | driver.publication 2.874ms |
| 417bfc4f9929a22c0000000000000912 | 60.833 | 5.164 | 0.010 | 0.000 | 5.047 | 0.710 | 0.792 | 0.023 | n/a | 0.053 | 48.989 | n/a | n/a | 0.045 | 10.220 | 0.168 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.470ms; driver.publication 1.417ms; driver.publication 1.308ms; driver.publication 1.086ms |
| 417bfc4f9929a22c000000000000048c | 59.646 | 6.688 | 0.017 | 0.000 | 0.810 | 2.751 | 8.012 | 0.104 | n/a | 0.159 | 41.060 | n/a | n/a | 0.046 | 7.514 | 0.126 | 0.046 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.135ms |
| 417bfc4f9929a22c000000000000094f | 57.825 | 6.750 | 0.003 | 0.000 | 1.044 | 7.002 | 24.917 | 0.565 | n/a | 0.029 | 17.492 | n/a | n/a | 0.023 | 7.797 | 0.135 | 0.023 | gw-w/thread-47/gateway.request-parse | driver.publication 2.874ms |
| 417bfc4f9929a22c0000000000000917 | 56.700 | 4.664 | 0.008 | 0.000 | 5.251 | 0.687 | 1.615 | 0.052 | n/a | 0.540 | 43.841 | n/a | n/a | 0.044 | 9.922 | 0.175 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.269ms; driver.publication 1.086ms |
| 417bfc4f9929a22c00000000000006c0 | 56.661 | 7.171 | 0.009 | 0.000 | 33.806 | 3.967 | 1.634 | 0.063 | n/a | 0.227 | 9.656 | n/a | n/a | 0.128 | 40.986 | 0.723 | 0.128 | node-14/thread-0/driver.queue.subject | driver.publication 15.430ms; driver.publication 3.939ms; driver.publication 1.889ms |
| 417bfc4f9929a22c000000000000035f | 56.295 | 4.401 | 0.007 | 0.000 | 0.575 | 4.440 | 1.373 | 11.550 | n/a | 0.171 | 33.725 | n/a | n/a | 0.052 | 4.983 | 0.089 | 0.052 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.214ms; driver.publication 1.155ms; driver.publication 1.075ms |

## P2 / tail / commit (2606 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.759 | 0.782 | 0.000 | 1.653 | 3.654 | 0.005 | 0.000 | 0.721 | 0.722 | 1.151 | 0.030 | n/a | 0.104 | 5.499 | n/a | n/a | 0.035 | 4.656 | 0.359 | 0.035 |
| p99 | 54.514 | 3.155 | 0.071 | 5.142 | 10.963 | 0.461 | 0.000 | 17.263 | 11.734 | 8.614 | 2.003 | n/a | 2.331 | 34.775 | n/a | n/a | 0.105 | 23.005 | 0.696 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c0000000000001490 | 75.205 | 9.647 | 0.017 | 0.000 | 40.535 | 9.239 | 6.024 | 0.119 | n/a | 2.326 | 7.255 | n/a | n/a | 0.042 | 50.200 | 0.668 | 0.042 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.774ms; driver.publication 1.652ms; driver.publication 1.165ms; driver.publication 1.131ms |
| 417bfc4f9929a22c0000000000001a89 | 74.842 | 8.004 | 0.006 | 0.000 | 14.499 | 0.796 | 31.319 | 0.031 | n/a | 0.056 | 20.045 | n/a | n/a | 0.086 | 22.509 | 0.301 | 0.086 | gw-w/thread-47/gateway.request-parse | driver.publication 1.257ms |
| 417bfc4f9929a22c00000000000018b3 | 72.677 | 5.837 | 0.004 | 0.000 | 3.491 | 2.904 | 1.514 | 2.003 | n/a | 0.873 | 56.010 | n/a | n/a | 0.039 | 9.333 | 0.128 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 6.061ms; driver.expected-state.bind-receipt 1.036ms |
| 417bfc4f9929a22c0000000000001daf | 71.048 | 3.689 | 0.006 | 0.000 | 0.104 | 0.656 | 1.215 | 0.044 | n/a | 0.346 | 64.936 | n/a | n/a | 0.052 | 3.799 | 0.053 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000011bf | 70.035 | 3.217 | 0.006 | 0.000 | 53.549 | 2.475 | 3.594 | 0.031 | n/a | 1.084 | 6.042 | n/a | n/a | 0.037 | 56.771 | 0.811 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 3.411ms; driver.publication 1.941ms; driver.expected-state.bind-receipt 1.862ms; driver.publication 1.564ms; driver.publication 1.555ms |
| 417bfc4f9929a22c00000000000018b2 | 69.589 | 12.860 | 0.004 | 0.000 | 1.471 | 1.551 | 4.586 | 0.064 | n/a | 0.139 | 48.882 | n/a | n/a | 0.031 | 14.335 | 0.206 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 0.613ms |
| 417bfc4f9929a22c0000000000000bdd | 66.821 | 2.840 | 0.004 | 0.000 | 57.024 | 0.562 | 1.323 | 0.041 | n/a | 0.580 | 4.419 | n/a | n/a | 0.029 | 59.867 | 0.896 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.598ms; driver.publication 1.129ms; driver.publication 1.093ms; driver.publication 1.044ms; driver.expected-state.bind-receipt 1.040ms |
| 417bfc4f9929a22c0000000000001883 | 66.560 | 3.629 | 0.003 | 0.000 | 1.186 | 1.663 | 1.310 | 0.027 | n/a | 0.638 | 58.080 | n/a | n/a | 0.024 | 4.818 | 0.072 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000001a8c | 64.745 | 3.379 | 0.077 | 0.000 | 2.941 | 27.480 | 5.485 | 0.009 | n/a | 0.007 | 25.341 | n/a | n/a | 0.026 | 6.397 | 0.099 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.556ms; driver.publication 1.525ms; driver.publication 1.281ms |
| 417bfc4f9929a22c0000000000001a8b | 63.356 | 3.427 | 0.006 | 0.000 | 3.293 | 27.165 | 0.963 | 4.951 | n/a | 0.012 | 23.488 | n/a | n/a | 0.052 | 6.726 | 0.106 | 0.052 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.556ms; driver.publication 1.525ms |
| 417bfc4f9929a22c0000000000000e90 | 62.672 | 3.558 | 0.004 | 0.000 | 19.443 | 0.635 | 2.101 | 0.045 | n/a | 0.109 | 36.750 | n/a | n/a | 0.027 | 23.005 | 0.367 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.271ms; driver.publication 1.170ms; driver.publication 0.958ms |
| 417bfc4f9929a22c00000000000018b4 | 62.427 | 7.424 | 0.011 | 0.000 | 1.011 | 7.427 | 1.110 | 0.026 | n/a | 0.262 | 45.087 | n/a | n/a | 0.070 | 8.446 | 0.135 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 6.061ms; driver.publication 3.963ms; driver.expected-state.bind-receipt 1.036ms |
| 417bfc4f9929a22c0000000000000bdb | 61.726 | 5.964 | 0.004 | 0.000 | 40.882 | 7.620 | 2.504 | 0.049 | n/a | 1.633 | 3.028 | n/a | n/a | 0.042 | 46.850 | 0.759 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 1.598ms; driver.publication 1.129ms; driver.publication 1.093ms; driver.publication 1.044ms; driver.expected-state.bind-receipt 1.040ms |
| 417bfc4f9929a22c000000000000197a | 60.565 | 9.047 | 13.327 | 0.000 | 0.057 | 1.601 | 8.614 | 0.064 | n/a | 1.018 | 26.743 | n/a | n/a | 0.096 | 22.431 | 0.370 | 0.096 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.358ms; driver.publication 1.974ms; driver.publication 1.736ms; driver.publication 1.458ms |
| 417bfc4f9929a22c000000000000151d | 59.924 | 5.680 | 0.223 | 0.000 | 0.799 | 0.440 | 0.690 | 0.011 | n/a | 0.029 | 52.024 | n/a | n/a | 0.027 | 6.702 | 0.112 | 0.027 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.191ms; driver.publication 1.129ms |
| 417bfc4f9929a22c0000000000001a8e | 59.151 | 5.669 | 0.010 | 0.000 | 41.416 | 1.006 | 1.764 | 0.063 | n/a | 0.685 | 8.511 | n/a | n/a | 0.026 | 47.094 | 0.796 | 0.026 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.556ms; driver.publication 1.525ms; driver.publication 1.281ms |
| 417bfc4f9929a22c0000000000001678 | 58.427 | 4.212 | 0.005 | 0.000 | 41.901 | 4.187 | 2.175 | 0.050 | n/a | 0.585 | 5.273 | n/a | n/a | 0.038 | 46.119 | 0.789 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 1.556ms; driver.publication 1.377ms; driver.publication 1.324ms; driver.publication 1.322ms; driver.publication 1.290ms |
| 417bfc4f9929a22c0000000000001a8d | 57.393 | 4.724 | 0.005 | 0.000 | 0.666 | 24.314 | 1.358 | 0.019 | n/a | 0.030 | 26.236 | n/a | n/a | 0.040 | 5.396 | 0.094 | 0.040 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.556ms; driver.publication 1.525ms; driver.publication 1.281ms |
| 417bfc4f9929a22c0000000000000e4f | 57.277 | 4.526 | 0.006 | 0.000 | 5.208 | 0.502 | 33.325 | 0.034 | n/a | 0.053 | 13.592 | n/a | n/a | 0.031 | 9.740 | 0.170 | 0.031 | gw-w/thread-40/commit.prepare-and-validate | driver.publication 1.511ms |
| 417bfc4f9929a22c0000000000001658 | 57.054 | 6.705 | 0.125 | 0.000 | 5.758 | 11.751 | 1.743 | 0.113 | n/a | 0.079 | 30.750 | n/a | n/a | 0.032 | 12.587 | 0.221 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.438ms; driver.expected-state.bind-receipt 1.141ms; driver.publication 1.050ms |

## P2 / tail / commit / 5-10 facts (1545 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.328 | 0.655 | 0.000 | 1.519 | 3.232 | 0.005 | 0.000 | 0.760 | 0.712 | 0.980 | 0.029 | n/a | 0.102 | 5.052 | n/a | n/a | 0.035 | 4.108 | 0.352 | 0.035 |
| p99 | 54.579 | 2.401 | 0.068 | 4.466 | 9.160 | 0.181 | 0.000 | 17.649 | 12.431 | 4.918 | 2.275 | n/a | 2.085 | 34.521 | n/a | n/a | 0.098 | 22.475 | 0.715 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 417bfc4f9929a22c0000000000001490 | 75.205 | 9.647 | 0.017 | 0.000 | 40.535 | 9.239 | 6.024 | 0.119 | n/a | 2.326 | 7.255 | n/a | n/a | 0.042 | 50.200 | 0.668 | 0.042 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.774ms; driver.publication 1.652ms; driver.publication 1.165ms; driver.publication 1.131ms |
| 417bfc4f9929a22c00000000000018b3 | 72.677 | 5.837 | 0.004 | 0.000 | 3.491 | 2.904 | 1.514 | 2.003 | n/a | 0.873 | 56.010 | n/a | n/a | 0.039 | 9.333 | 0.128 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 6.061ms; driver.expected-state.bind-receipt 1.036ms |
| 417bfc4f9929a22c0000000000001daf | 71.048 | 3.689 | 0.006 | 0.000 | 0.104 | 0.656 | 1.215 | 0.044 | n/a | 0.346 | 64.936 | n/a | n/a | 0.052 | 3.799 | 0.053 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c00000000000011bf | 70.035 | 3.217 | 0.006 | 0.000 | 53.549 | 2.475 | 3.594 | 0.031 | n/a | 1.084 | 6.042 | n/a | n/a | 0.037 | 56.771 | 0.811 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 3.411ms; driver.publication 1.941ms; driver.expected-state.bind-receipt 1.862ms; driver.publication 1.564ms; driver.publication 1.555ms |
| 417bfc4f9929a22c0000000000000bdd | 66.821 | 2.840 | 0.004 | 0.000 | 57.024 | 0.562 | 1.323 | 0.041 | n/a | 0.580 | 4.419 | n/a | n/a | 0.029 | 59.867 | 0.896 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 1.598ms; driver.publication 1.129ms; driver.publication 1.093ms; driver.publication 1.044ms; driver.expected-state.bind-receipt 1.040ms |
| 417bfc4f9929a22c0000000000001a8c | 64.745 | 3.379 | 0.077 | 0.000 | 2.941 | 27.480 | 5.485 | 0.009 | n/a | 0.007 | 25.341 | n/a | n/a | 0.026 | 6.397 | 0.099 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.556ms; driver.publication 1.525ms; driver.publication 1.281ms |
| 417bfc4f9929a22c0000000000001a8b | 63.356 | 3.427 | 0.006 | 0.000 | 3.293 | 27.165 | 0.963 | 4.951 | n/a | 0.012 | 23.488 | n/a | n/a | 0.052 | 6.726 | 0.106 | 0.052 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.556ms; driver.publication 1.525ms |
| 417bfc4f9929a22c0000000000000bdb | 61.726 | 5.964 | 0.004 | 0.000 | 40.882 | 7.620 | 2.504 | 0.049 | n/a | 1.633 | 3.028 | n/a | n/a | 0.042 | 46.850 | 0.759 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 1.598ms; driver.publication 1.129ms; driver.publication 1.093ms; driver.publication 1.044ms; driver.expected-state.bind-receipt 1.040ms |
| 417bfc4f9929a22c000000000000151d | 59.924 | 5.680 | 0.223 | 0.000 | 0.799 | 0.440 | 0.690 | 0.011 | n/a | 0.029 | 52.024 | n/a | n/a | 0.027 | 6.702 | 0.112 | 0.027 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.191ms; driver.publication 1.129ms |
| 417bfc4f9929a22c0000000000001a8e | 59.151 | 5.669 | 0.010 | 0.000 | 41.416 | 1.006 | 1.764 | 0.063 | n/a | 0.685 | 8.511 | n/a | n/a | 0.026 | 47.094 | 0.796 | 0.026 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.556ms; driver.publication 1.525ms; driver.publication 1.281ms |
| 417bfc4f9929a22c0000000000001658 | 57.054 | 6.705 | 0.125 | 0.000 | 5.758 | 11.751 | 1.743 | 0.113 | n/a | 0.079 | 30.750 | n/a | n/a | 0.032 | 12.587 | 0.221 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.438ms; driver.expected-state.bind-receipt 1.141ms; driver.publication 1.050ms |
| 417bfc4f9929a22c00000000000011bd | 56.770 | 10.800 | 0.012 | 0.000 | 1.378 | 21.378 | 3.628 | 3.344 | n/a | 0.181 | 15.999 | n/a | n/a | 0.050 | 12.190 | 0.215 | 0.050 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.411ms; driver.expected-state.bind-receipt 1.862ms; driver.publication 1.564ms; driver.publication 1.342ms; driver.publication 1.239ms |
| 417bfc4f9929a22c00000000000018c5 | 56.054 | 10.057 | 1.623 | 0.000 | 5.056 | 14.138 | 12.565 | 0.050 | n/a | 0.838 | 11.713 | n/a | n/a | 0.014 | 16.736 | 0.299 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.998ms; driver.publication 1.512ms; driver.publication 1.338ms; driver.publication 1.040ms |
| 417bfc4f9929a22c0000000000001152 | 55.482 | 4.323 | 0.009 | 0.000 | 37.622 | 5.162 | 0.783 | 0.043 | n/a | 0.058 | 7.452 | n/a | n/a | 0.031 | 41.954 | 0.756 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 1.584ms; driver.publication 1.460ms; driver.publication 1.317ms; driver.expected-state.bind-receipt 1.123ms |
| 417bfc4f9929a22c00000000000018b5 | 54.839 | 6.312 | 0.010 | 0.000 | 0.502 | 10.772 | 2.021 | 0.369 | n/a | 0.550 | 34.041 | n/a | n/a | 0.262 | 6.823 | 0.124 | 0.262 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 6.061ms; driver.publication 3.963ms; driver.publication 1.130ms; driver.expected-state.bind-receipt 1.036ms |
| 417bfc4f9929a22c0000000000001a4c | 54.579 | 3.599 | 0.005 | 0.000 | 1.551 | 1.721 | 0.615 | 0.017 | n/a | 0.053 | 46.998 | n/a | n/a | 0.020 | 5.155 | 0.094 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.757ms |
| 417bfc4f9929a22c000000000000197d | 54.287 | 16.951 | 0.016 | 0.000 | 3.172 | 9.248 | 5.265 | 0.107 | n/a | 1.025 | 18.450 | n/a | n/a | 0.053 | 20.139 | 0.371 | 0.053 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 3.538ms; driver.expected-state.bind-receipt 2.731ms; driver.expected-state.bind-receipt 2.206ms; driver.publication 1.974ms |
| 417bfc4f9929a22c0000000000001252 | 54.053 | 4.076 | 0.003 | 0.000 | 1.049 | 27.996 | 0.740 | 0.024 | n/a | 0.065 | 20.071 | n/a | n/a | 0.029 | 5.128 | 0.095 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.214ms |
| 417bfc4f9929a22c0000000000001bec | 53.867 | 3.052 | 0.006 | 0.000 | 0.984 | 0.541 | 0.879 | 0.028 | n/a | 0.294 | 48.048 | n/a | n/a | 0.035 | 4.042 | 0.075 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 417bfc4f9929a22c0000000000001a4b | 53.071 | 3.971 | 0.006 | 0.000 | 0.528 | 0.427 | 0.830 | 0.021 | n/a | 0.064 | 47.193 | n/a | n/a | 0.028 | 4.506 | 0.085 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.453 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.370 | 200.810 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 |
| p99 | 386.698 | n/a | n/a | n/a | 55.628 | n/a | 1.142 | 0.000 | 8.193 | 380.630 | 0.132 | n/a | 0.254 | 0.000 | n/a | n/a | 42.812 | 55.628 | 0.396 | 42.812 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e20000000000000002 | 386.698 | 3.572 | n/a | 0.000 | 0.000 | 1.929 | 380.630 | 0.132 | n/a | 0.100 | 0.000 | n/a | n/a | 0.335 | 3.572 | 0.009 | 0.335 | gw-r/thread-46/gateway.admitted-work | none observed |
| 6f8067b35dd9749a0000000000000007 | 205.870 | 0.000 | n/a | 0.000 | 0.000 | 3.795 | 201.587 | 0.012 | n/a | 0.146 | 0.000 | n/a | n/a | 0.330 | 0.000 | 0.000 | 0.330 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000006 | 203.567 | 0.000 | n/a | 0.000 | 0.000 | 1.370 | 201.678 | 0.058 | n/a | 0.227 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000005 | 203.512 | 0.000 | n/a | 0.000 | 0.000 | 1.254 | 201.653 | 0.024 | n/a | 0.254 | 0.000 | n/a | n/a | 0.327 | 0.000 | 0.000 | 0.327 | gw-r/thread-46/journal/page | none observed |
| 6f8067b35dd9749a0000000000000f17 | 201.483 | 0.000 | n/a | 0.000 | 0.000 | 0.437 | 200.866 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-67/journal/page | none observed |
| 6f8067b35dd9749a0000000000000f16 | 201.453 | 0.000 | n/a | 0.000 | 0.000 | 0.453 | 200.810 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000f18 | 201.351 | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 200.666 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000f15 | 201.152 | 0.000 | n/a | 0.000 | 0.000 | 0.401 | 200.599 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000f1d | 140.435 | 55.628 | n/a | 0.000 | 0.000 | 8.193 | 76.203 | 0.039 | n/a | 0.043 | 0.000 | n/a | n/a | 0.330 | 55.628 | 0.396 | 0.330 | gw-r/thread-41/gateway.admitted-work | none observed |
| 6f8067b35dd9749a0000000000000f1b | 80.622 | 17.970 | n/a | 1.142 | 0.000 | 6.510 | 54.822 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.172 | 19.112 | 0.237 | 0.172 | gw-r/thread-67/gateway.admitted-work | none observed |
| 6f8067b35dd9749a0000000000000f1c | 63.878 | 14.652 | n/a | 0.000 | 0.000 | 6.414 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.812 | 14.652 | 0.229 | 42.812 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 816.228 | n/a | n/a | n/a | 5.324 | n/a | 0.000 | 0.000 | 1.752 | 788.104 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 1.253 | 5.324 | 0.031 | 1.253 |
| p99 | 1006.667 | n/a | n/a | n/a | 19.804 | n/a | 5.711 | 0.000 | 2.140 | 1002.724 | 0.021 | n/a | 0.593 | 0.000 | n/a | n/a | 3.885 | 25.515 | 0.557 | 3.885 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e200000000000000a4 | 1006.667 | 0.336 | n/a | 0.000 | 0.000 | 1.752 | 1002.724 | 0.009 | n/a | 0.593 | 0.000 | n/a | n/a | 1.253 | 0.336 | 0.000 | 1.253 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000000a5 | 816.228 | 19.804 | n/a | 5.711 | 0.000 | 2.140 | 788.104 | 0.021 | n/a | 0.073 | 0.000 | n/a | n/a | 0.375 | 25.515 | 0.031 | 0.375 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e20000000000000838 | 9.565 | 5.324 | n/a | 0.000 | 0.000 | 0.356 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.885 | 5.324 | 0.557 | 3.885 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 487.220 | n/a | n/a | n/a | 3.181 | n/a | 0.000 | 0.000 | 0.941 | 482.418 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.118 | 3.181 | 0.007 | 0.118 |
| p99 | 1006.118 | n/a | n/a | n/a | 8.198 | n/a | 0.000 | 0.000 | 3.996 | 1001.896 | 0.059 | n/a | 0.565 | 0.000 | n/a | n/a | 22.156 | 8.198 | 0.132 | 22.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e200000000000000cf | 1006.118 | 2.956 | n/a | 0.000 | 0.000 | 0.992 | 1001.896 | 0.022 | n/a | 0.175 | 0.000 | n/a | n/a | 0.077 | 2.956 | 0.003 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 3498c8947ae604e200000000000000ba | 995.000 | 2.975 | n/a | 0.000 | 0.000 | 1.091 | 990.710 | 0.026 | n/a | 0.078 | 0.000 | n/a | n/a | 0.119 | 2.975 | 0.003 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e200000000000000bb | 985.629 | 5.853 | n/a | 0.000 | 0.000 | 3.882 | 975.489 | 0.012 | n/a | 0.154 | 0.000 | n/a | n/a | 0.239 | 5.853 | 0.006 | 0.239 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000000b4 | 980.865 | 4.274 | n/a | 0.000 | 0.000 | 2.395 | 973.694 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.409 | 4.274 | 0.004 | 0.409 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e200000000000000b2 | 868.671 | 2.608 | n/a | 0.000 | 0.000 | 1.200 | 864.643 | 0.032 | n/a | 0.111 | 0.000 | n/a | n/a | 0.077 | 2.608 | 0.003 | 0.077 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000000ae | 857.770 | 3.870 | n/a | 0.000 | 0.000 | 1.615 | 852.022 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.164 | 3.870 | 0.005 | 0.164 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e200000000000000c8 | 767.933 | 3.181 | n/a | 0.000 | 0.000 | 1.136 | 763.372 | 0.033 | n/a | 0.101 | 0.000 | n/a | n/a | 0.111 | 3.181 | 0.004 | 0.111 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e200000000000000bf | 755.023 | 2.947 | n/a | 0.000 | 0.000 | 0.704 | 751.214 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.087 | 2.947 | 0.004 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 3498c8947ae604e200000000000000c6 | 730.843 | 3.621 | n/a | 0.000 | 0.000 | 0.528 | 726.413 | 0.059 | n/a | 0.071 | 0.000 | n/a | n/a | 0.151 | 3.621 | 0.005 | 0.151 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e200000000000000ab | 681.357 | 2.708 | n/a | 0.000 | 0.000 | 0.683 | 677.268 | 0.015 | n/a | 0.565 | 0.000 | n/a | n/a | 0.118 | 2.708 | 0.004 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 3498c8947ae604e200000000000000c1 | 615.066 | 7.841 | n/a | 0.000 | 0.000 | 1.297 | 605.676 | 0.017 | n/a | 0.081 | 0.000 | n/a | n/a | 0.155 | 7.841 | 0.013 | 0.155 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e200000000000000a7 | 601.806 | 2.728 | n/a | 0.000 | 0.000 | 0.742 | 597.954 | 0.019 | n/a | 0.178 | 0.000 | n/a | n/a | 0.186 | 2.728 | 0.005 | 0.186 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000000a8 | 595.509 | 2.570 | n/a | 0.000 | 0.000 | 0.557 | 592.143 | 0.017 | n/a | 0.112 | 0.000 | n/a | n/a | 0.111 | 2.570 | 0.004 | 0.111 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000000b9 | 501.013 | 3.746 | n/a | 0.000 | 0.000 | 0.941 | 496.065 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.147 | 3.746 | 0.007 | 0.147 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000000ca | 487.220 | 3.904 | n/a | 0.000 | 0.000 | 0.663 | 482.418 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.159 | 3.904 | 0.008 | 0.159 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000000b6 | 419.984 | 4.457 | n/a | 0.000 | 0.000 | 0.734 | 414.605 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.100 | 4.457 | 0.011 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000000c2 | 379.011 | 2.808 | n/a | 0.000 | 0.000 | 1.166 | 374.868 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.083 | 2.808 | 0.007 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e200000000000000a9 | 351.670 | 5.889 | n/a | 0.000 | 0.000 | 0.730 | 344.545 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.400 | 5.889 | 0.017 | 0.400 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e200000000000000ac | 295.626 | 3.363 | n/a | 0.000 | 0.000 | 0.638 | 291.388 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.140 | 3.363 | 0.011 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e200000000000000cb | 271.736 | 1.873 | n/a | 0.000 | 0.000 | 2.884 | 266.780 | 0.037 | n/a | 0.088 | 0.000 | n/a | n/a | 0.074 | 1.873 | 0.007 | 0.074 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 389.005 | n/a | n/a | n/a | 4.478 | n/a | 0.000 | 0.000 | 1.055 | 379.617 | 0.016 | n/a | 0.084 | 0.000 | n/a | n/a | 0.163 | 4.478 | 0.013 | 0.163 |
| p99 | 1007.753 | n/a | n/a | n/a | 28.512 | n/a | 1.145 | 0.000 | 15.781 | 1001.309 | 1.356 | n/a | 3.795 | 0.000 | n/a | n/a | 40.940 | 28.512 | 0.676 | 40.940 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e200000000000000d0 | 1007.753 | 3.096 | n/a | 0.000 | 0.000 | 3.863 | 1000.606 | 0.018 | n/a | 0.084 | 0.000 | n/a | n/a | 0.087 | 3.096 | 0.003 | 0.087 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000000d1 | 1005.902 | 4.598 | n/a | 0.000 | 0.000 | 0.641 | 1000.426 | 0.026 | n/a | 0.098 | 0.000 | n/a | n/a | 0.113 | 4.598 | 0.005 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000000dd | 1004.441 | 0.115 | n/a | 0.000 | 0.000 | 2.288 | 1000.819 | 0.020 | n/a | 0.094 | 0.000 | n/a | n/a | 1.105 | 0.115 | 0.000 | 1.105 | gw-r/thread-46/journal/page | none observed |
| 3498c8947ae604e200000000000000d7 | 1004.436 | 0.163 | n/a | 0.000 | 0.000 | 1.674 | 1001.309 | 0.016 | n/a | 0.134 | 0.000 | n/a | n/a | 1.140 | 0.163 | 0.000 | 1.140 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e20000000000000101 | 1002.233 | 3.075 | n/a | 0.000 | 0.000 | 0.667 | 998.271 | 0.016 | n/a | 0.083 | 0.000 | n/a | n/a | 0.121 | 3.075 | 0.003 | 0.121 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e2000000000000010d | 988.189 | 2.933 | n/a | 0.000 | 0.000 | 3.922 | 981.102 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.125 | 2.933 | 0.003 | 0.125 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000105 | 975.796 | 4.946 | n/a | 0.000 | 0.000 | 2.819 | 967.403 | 0.012 | n/a | 0.338 | 0.000 | n/a | n/a | 0.279 | 4.946 | 0.005 | 0.279 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000000d9 | 963.656 | 2.999 | n/a | 0.000 | 0.000 | 1.053 | 959.389 | 0.011 | n/a | 0.118 | 0.000 | n/a | n/a | 0.086 | 2.999 | 0.003 | 0.086 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000000e5 | 937.048 | 2.696 | n/a | 0.000 | 0.000 | 1.073 | 933.031 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.163 | 2.696 | 0.003 | 0.163 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e200000000000000df | 912.770 | 3.124 | n/a | 0.000 | 0.000 | 0.541 | 908.889 | 0.017 | n/a | 0.069 | 0.000 | n/a | n/a | 0.131 | 3.124 | 0.003 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e200000000000000fe | 802.476 | 9.969 | n/a | 0.000 | 0.000 | 0.810 | 791.275 | 0.017 | n/a | 0.079 | 0.000 | n/a | n/a | 0.326 | 9.969 | 0.012 | 0.326 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000000db | 671.739 | 3.102 | n/a | 0.000 | 0.000 | 2.168 | 666.265 | 0.014 | n/a | 0.101 | 0.000 | n/a | n/a | 0.088 | 3.102 | 0.005 | 0.088 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e200000000000000e0 | 656.909 | 4.478 | n/a | 0.000 | 0.000 | 5.035 | 647.240 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.082 | 4.478 | 0.007 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e20000000000000102 | 626.534 | 2.590 | n/a | 0.000 | 0.000 | 0.690 | 623.076 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.092 | 2.590 | 0.004 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e200000000000000fc | 603.660 | 5.297 | n/a | 0.000 | 0.000 | 3.520 | 594.552 | 0.020 | n/a | 0.084 | 0.000 | n/a | n/a | 0.186 | 5.297 | 0.009 | 0.186 | gw-r/thread-46/journal/page | none observed |
| 3498c8947ae604e200000000000000e7 | 599.815 | 9.402 | n/a | 1.145 | 0.000 | 1.493 | 587.569 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.118 | 10.547 | 0.018 | 0.118 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000000eb | 505.726 | 2.990 | n/a | 0.000 | 0.000 | 0.558 | 498.288 | 0.018 | n/a | 3.795 | 0.000 | n/a | n/a | 0.078 | 2.990 | 0.006 | 0.078 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e200000000000000d3 | 462.869 | 4.896 | n/a | 0.000 | 0.000 | 1.055 | 456.503 | 0.036 | n/a | 0.115 | 0.000 | n/a | n/a | 0.264 | 4.896 | 0.011 | 0.264 | gw-r/thread-46/journal/page | none observed |
| 3498c8947ae604e20000000000000107 | 458.337 | 14.281 | n/a | 0.000 | 0.000 | 0.709 | 443.004 | 0.015 | n/a | 0.077 | 0.000 | n/a | n/a | 0.251 | 14.281 | 0.031 | 0.251 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000104 | 406.563 | 9.455 | n/a | 0.000 | 0.000 | 2.370 | 394.443 | 0.021 | n/a | 0.118 | 0.000 | n/a | n/a | 0.156 | 9.455 | 0.023 | 0.156 | gw-r/thread-63/journal/page | none observed |

## P3 / L4 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 494.272 | n/a | n/a | n/a | 3.502 | n/a | 0.000 | 0.000 | 0.810 | 487.917 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.117 | 3.502 | 0.008 | 0.117 |
| p99 | 1003.030 | n/a | n/a | n/a | 8.808 | n/a | 0.000 | 0.000 | 6.749 | 1000.973 | 0.142 | n/a | 0.127 | 0.000 | n/a | n/a | 41.342 | 8.808 | 0.191 | 41.342 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e2000000000000011c | 1003.030 | 0.147 | n/a | 0.000 | 0.000 | 0.599 | 1000.973 | 0.028 | n/a | 0.123 | 0.000 | n/a | n/a | 1.161 | 0.147 | 0.000 | 1.161 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e20000000000000126 | 1002.565 | 0.186 | n/a | 0.000 | 0.000 | 0.531 | 1000.650 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 1.122 | 0.186 | 0.000 | 1.122 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e20000000000000114 | 996.113 | 2.689 | n/a | 0.000 | 0.000 | 0.652 | 992.572 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.110 | 2.689 | 0.003 | 0.110 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e2000000000000012c | 985.135 | 3.018 | n/a | 0.000 | 0.000 | 0.682 | 981.159 | 0.142 | n/a | 0.049 | 0.000 | n/a | n/a | 0.083 | 3.018 | 0.003 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e20000000000000138 | 983.590 | 5.071 | n/a | 0.000 | 0.000 | 2.224 | 976.164 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.078 | 5.071 | 0.005 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000000141 | 981.448 | 3.581 | n/a | 0.000 | 0.000 | 0.577 | 977.114 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.092 | 3.581 | 0.004 | 0.092 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e2000000000000012b | 924.337 | 3.980 | n/a | 0.000 | 0.000 | 1.293 | 918.758 | 0.018 | n/a | 0.038 | 0.000 | n/a | n/a | 0.251 | 3.980 | 0.004 | 0.251 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e20000000000000148 | 914.063 | 3.502 | n/a | 0.000 | 0.000 | 2.650 | 907.545 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.299 | 3.502 | 0.004 | 0.299 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000133 | 878.115 | 2.614 | n/a | 0.000 | 0.000 | 0.398 | 874.985 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.076 | 2.614 | 0.003 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e20000000000000124 | 831.196 | 5.807 | n/a | 0.000 | 0.000 | 0.810 | 824.297 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.205 | 5.807 | 0.007 | 0.205 | gw-r/thread-46/journal/page | none observed |
| 3498c8947ae604e2000000000000012e | 813.215 | 4.451 | n/a | 0.000 | 0.000 | 4.746 | 803.853 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.119 | 4.451 | 0.005 | 0.119 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e2000000000000013d | 780.807 | 4.034 | n/a | 0.000 | 0.000 | 0.857 | 775.726 | 0.021 | n/a | 0.057 | 0.000 | n/a | n/a | 0.111 | 4.034 | 0.005 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e20000000000000111 | 670.882 | 3.100 | n/a | 0.000 | 0.000 | 0.975 | 666.485 | 0.015 | n/a | 0.076 | 0.000 | n/a | n/a | 0.231 | 3.100 | 0.005 | 0.231 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e2000000000000013a | 625.836 | 2.748 | n/a | 0.000 | 0.000 | 0.972 | 621.912 | 0.016 | n/a | 0.104 | 0.000 | n/a | n/a | 0.083 | 2.748 | 0.004 | 0.083 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e20000000000000128 | 582.408 | 4.919 | n/a | 0.000 | 0.000 | 3.282 | 573.987 | 0.035 | n/a | 0.069 | 0.000 | n/a | n/a | 0.115 | 4.919 | 0.008 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e2000000000000011e | 568.065 | 1.932 | n/a | 0.000 | 0.000 | 0.450 | 565.547 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.067 | 1.932 | 0.003 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e2000000000000011a | 533.950 | 3.785 | n/a | 0.000 | 0.000 | 0.623 | 529.391 | 0.021 | n/a | 0.046 | 0.000 | n/a | n/a | 0.084 | 3.785 | 0.007 | 0.084 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e2000000000000010e | 518.274 | 5.446 | n/a | 0.000 | 0.000 | 1.054 | 511.486 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.218 | 5.446 | 0.011 | 0.218 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000000135 | 512.646 | 2.855 | n/a | 0.000 | 0.000 | 0.563 | 509.069 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.104 | 2.855 | 0.006 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000000129 | 499.221 | 3.409 | n/a | 0.000 | 0.000 | 1.873 | 493.707 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.168 | 3.409 | 0.007 | 0.168 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 362.893 | n/a | n/a | n/a | 2.869 | n/a | 0.000 | 0.000 | 0.672 | 353.746 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.130 | 2.869 | 0.009 | 0.130 |
| p99 | 1003.812 | n/a | n/a | n/a | 9.851 | n/a | 1.406 | 0.000 | 4.933 | 1001.129 | 1.173 | n/a | 0.106 | 0.000 | n/a | n/a | 31.645 | 9.851 | 0.450 | 31.645 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e20000000000000187 | 1003.812 | 3.842 | n/a | 0.000 | 0.000 | 1.917 | 997.847 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.170 | 3.842 | 0.004 | 0.170 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e20000000000000174 | 1003.379 | 0.171 | n/a | 0.000 | 0.000 | 0.841 | 1001.129 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 1.139 | 0.171 | 0.000 | 1.139 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e20000000000000164 | 1002.862 | 0.174 | n/a | 0.000 | 0.000 | 0.643 | 1000.787 | 0.025 | n/a | 0.091 | 0.000 | n/a | n/a | 1.142 | 0.174 | 0.000 | 1.142 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e2000000000000017f | 1002.619 | 0.208 | n/a | 0.000 | 0.000 | 0.497 | 1000.740 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 1.116 | 0.208 | 0.000 | 1.116 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000186 | 999.946 | 4.380 | n/a | 0.000 | 0.000 | 0.508 | 994.854 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.148 | 4.380 | 0.004 | 0.148 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e2000000000000016e | 992.635 | 2.716 | n/a | 0.000 | 0.000 | 0.790 | 988.980 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.083 | 2.716 | 0.003 | 0.083 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000154 | 971.181 | 4.384 | n/a | 0.000 | 0.000 | 0.706 | 965.919 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.119 | 4.384 | 0.005 | 0.119 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e2000000000000017b | 970.054 | 3.608 | n/a | 0.000 | 0.000 | 0.577 | 965.651 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.162 | 3.608 | 0.004 | 0.162 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e2000000000000015a | 815.262 | 2.636 | n/a | 0.000 | 0.000 | 0.646 | 811.857 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.078 | 2.636 | 0.003 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e2000000000000016d | 801.596 | 3.758 | n/a | 0.000 | 0.000 | 1.187 | 796.484 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.113 | 3.758 | 0.005 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e20000000000000184 | 798.014 | 2.660 | n/a | 0.000 | 0.000 | 4.933 | 790.301 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.063 | 2.660 | 0.003 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e20000000000000177 | 771.546 | 2.650 | n/a | 0.000 | 0.000 | 2.484 | 766.285 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.070 | 2.650 | 0.003 | 0.070 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000189 | 750.322 | 2.869 | n/a | 0.000 | 0.000 | 0.516 | 746.802 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.079 | 2.869 | 0.004 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e20000000000000170 | 747.352 | 2.639 | n/a | 0.000 | 0.000 | 0.562 | 744.025 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.065 | 2.639 | 0.004 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e2000000000000017e | 733.524 | 2.723 | n/a | 0.000 | 0.000 | 0.418 | 730.229 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.111 | 2.723 | 0.004 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e20000000000000155 | 584.464 | 2.516 | n/a | 0.000 | 0.000 | 0.469 | 581.345 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.088 | 2.516 | 0.004 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e20000000000000152 | 577.759 | 4.924 | n/a | 0.000 | 0.000 | 0.822 | 571.677 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.273 | 4.924 | 0.009 | 0.273 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e20000000000000167 | 528.065 | 3.882 | n/a | 0.000 | 0.000 | 3.174 | 520.868 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.087 | 3.882 | 0.007 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e2000000000000014d | 456.980 | 2.613 | n/a | 0.000 | 0.000 | 0.774 | 453.417 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.121 | 2.613 | 0.006 | 0.121 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000000162 | 454.687 | 2.521 | n/a | 0.000 | 0.000 | 0.524 | 451.491 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.081 | 2.521 | 0.006 | 0.081 | gw-r/thread-44/journal/page | none observed |

## P3 / L64 / internal (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 329.281 | n/a | n/a | n/a | 3.324 | n/a | 0.000 | 0.000 | 0.574 | 321.917 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.091 | 3.324 | 0.013 | 0.091 |
| p99 | 1002.679 | n/a | n/a | n/a | 9.627 | n/a | 2.086 | 0.000 | 4.867 | 1000.780 | 0.083 | n/a | 0.099 | 0.000 | n/a | n/a | 40.577 | 11.167 | 0.730 | 40.577 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e200000000000001c4 | 1002.679 | 0.132 | n/a | 0.000 | 0.000 | 0.582 | 1000.780 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 1.126 | 0.132 | 0.000 | 1.126 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e200000000000001a5 | 1002.660 | 0.145 | n/a | 0.000 | 0.000 | 0.669 | 1000.665 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 1.122 | 0.145 | 0.000 | 1.122 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e2000000000000018b | 1000.377 | 2.679 | n/a | 0.000 | 0.000 | 4.867 | 992.714 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.070 | 2.679 | 0.003 | 0.070 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e200000000000001a7 | 995.154 | 2.998 | n/a | 0.000 | 0.000 | 0.745 | 991.295 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.076 | 2.998 | 0.003 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000001a8 | 991.833 | 2.383 | n/a | 0.000 | 0.000 | 0.553 | 988.792 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.062 | 2.383 | 0.002 | 0.062 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e200000000000001c6 | 977.600 | 5.254 | n/a | 0.000 | 0.000 | 0.546 | 971.647 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.076 | 5.254 | 0.005 | 0.076 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e200000000000001c2 | 954.708 | 4.003 | n/a | 0.000 | 0.000 | 0.626 | 949.962 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.076 | 4.003 | 0.004 | 0.076 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e2000000000000019a | 839.532 | 1.821 | n/a | 0.000 | 0.000 | 1.817 | 835.791 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.068 | 1.821 | 0.002 | 0.068 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000001b6 | 836.990 | 2.449 | n/a | 0.000 | 0.000 | 1.186 | 833.229 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.084 | 2.449 | 0.003 | 0.084 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000001cf | 738.990 | 3.735 | n/a | 0.000 | 0.000 | 0.471 | 734.652 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.071 | 3.735 | 0.005 | 0.071 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e2000000000000019d | 685.173 | 7.401 | n/a | 0.000 | 0.000 | 0.400 | 677.105 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.212 | 7.401 | 0.011 | 0.212 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000198 | 672.405 | 2.921 | n/a | 0.000 | 0.000 | 2.901 | 666.391 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.126 | 2.921 | 0.004 | 0.126 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e200000000000001ba | 600.574 | 7.239 | n/a | 0.000 | 0.000 | 2.305 | 590.614 | 0.056 | n/a | 0.086 | 0.000 | n/a | n/a | 0.274 | 7.239 | 0.012 | 0.274 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e200000000000001d6 | 587.188 | 2.240 | n/a | 0.000 | 0.000 | 0.647 | 584.149 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.067 | 2.240 | 0.004 | 0.067 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e200000000000001d3 | 537.786 | 2.471 | n/a | 0.000 | 0.000 | 0.458 | 534.630 | 0.007 | n/a | 0.099 | 0.000 | n/a | n/a | 0.121 | 2.471 | 0.005 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e20000000000000193 | 486.935 | 5.201 | n/a | 0.000 | 0.000 | 0.453 | 481.026 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.190 | 5.201 | 0.011 | 0.190 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e200000000000001a0 | 481.827 | 5.421 | n/a | 0.000 | 0.000 | 1.300 | 474.973 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.096 | 5.421 | 0.011 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e200000000000001af | 478.815 | 2.473 | n/a | 0.000 | 0.000 | 1.944 | 474.283 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.070 | 2.473 | 0.005 | 0.070 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000001c7 | 459.660 | 5.061 | n/a | 0.000 | 0.000 | 0.680 | 453.748 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.137 | 5.061 | 0.011 | 0.137 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e200000000000001d4 | 451.590 | 3.166 | n/a | 0.000 | 0.000 | 1.244 | 447.040 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.078 | 3.166 | 0.007 | 0.078 | gw-r/thread-43/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 435.682 | n/a | n/a | n/a | 4.745 | n/a | 0.811 | 0.000 | 0.634 | 433.197 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.146 | 5.470 | 0.013 | 0.146 |
| p99 | 1004.494 | n/a | n/a | n/a | 15.730 | n/a | 4.554 | 0.000 | 3.752 | 1002.446 | 0.771 | n/a | 0.083 | 0.000 | n/a | n/a | 47.268 | 15.886 | 0.852 | 47.268 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e20000000000000216 | 1004.494 | 0.225 | n/a | 0.000 | 0.000 | 0.579 | 1002.446 | 0.022 | n/a | 0.065 | 0.000 | n/a | n/a | 1.156 | 0.225 | 0.000 | 1.156 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e200000000000001ff | 1002.799 | 3.822 | n/a | 0.000 | 0.000 | 0.460 | 998.368 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.090 | 3.822 | 0.004 | 0.090 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e20000000000000219 | 995.785 | 4.297 | n/a | 0.844 | 0.000 | 0.656 | 989.728 | 0.024 | n/a | 0.046 | 0.000 | n/a | n/a | 0.190 | 5.141 | 0.005 | 0.190 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e200000000000001eb | 990.188 | 3.463 | n/a | 0.783 | 0.000 | 1.598 | 984.174 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.106 | 4.246 | 0.004 | 0.106 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e200000000000001f9 | 990.130 | 6.632 | n/a | 1.448 | 0.000 | 0.825 | 980.998 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.181 | 8.080 | 0.008 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e20000000000000218 | 980.467 | 4.058 | n/a | 0.000 | 0.000 | 2.713 | 973.469 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.148 | 4.058 | 0.004 | 0.148 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e20000000000000212 | 972.983 | 6.248 | n/a | 1.206 | 0.000 | 0.577 | 964.529 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.373 | 7.454 | 0.008 | 0.373 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e20000000000000208 | 961.242 | 4.980 | n/a | 0.000 | 0.000 | 0.899 | 955.053 | 0.012 | n/a | 0.058 | 0.000 | n/a | n/a | 0.240 | 4.980 | 0.005 | 0.240 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e200000000000001f5 | 873.662 | 8.778 | n/a | 2.438 | 0.000 | 1.210 | 860.928 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.216 | 11.215 | 0.013 | 0.216 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e20000000000000213 | 850.248 | 10.064 | n/a | 0.813 | 0.000 | 0.961 | 838.216 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.126 | 10.877 | 0.013 | 0.126 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000001ea | 837.345 | 3.473 | n/a | 0.825 | 0.000 | 0.467 | 832.374 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.156 | 4.298 | 0.005 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e20000000000000210 | 696.568 | 6.633 | n/a | 0.000 | 0.000 | 0.919 | 688.784 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.182 | 6.633 | 0.010 | 0.182 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000001ef | 660.284 | 5.895 | n/a | 2.406 | 0.000 | 0.551 | 651.166 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.229 | 8.301 | 0.013 | 0.229 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e20000000000000200 | 617.702 | 3.176 | n/a | 0.966 | 0.000 | 0.531 | 612.835 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.138 | 4.142 | 0.007 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000001dc | 582.796 | 14.226 | n/a | 1.517 | 0.000 | 2.054 | 564.824 | 0.013 | n/a | 0.053 | 0.000 | n/a | n/a | 0.109 | 15.743 | 0.027 | 0.109 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000203 | 552.405 | 4.929 | n/a | 1.313 | 0.000 | 1.002 | 544.946 | 0.013 | n/a | 0.057 | 0.000 | n/a | n/a | 0.146 | 6.242 | 0.011 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e200000000000001f1 | 535.915 | 4.136 | n/a | 0.000 | 0.000 | 0.719 | 530.796 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.217 | 4.136 | 0.008 | 0.217 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e200000000000001de | 535.414 | 4.872 | n/a | 0.838 | 0.000 | 1.306 | 528.302 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.075 | 5.710 | 0.011 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e200000000000001e4 | 522.822 | 4.677 | n/a | 0.858 | 0.000 | 0.840 | 516.237 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.144 | 5.536 | 0.011 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e200000000000001f2 | 509.446 | 6.740 | n/a | 0.792 | 0.000 | 0.686 | 501.040 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.150 | 7.532 | 0.015 | 0.150 | gw-r/thread-43/journal/page | none observed |

## P3 / L1024 / internal (748 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.150 | n/a | n/a | n/a | 3.663 | n/a | 0.000 | 0.000 | 0.277 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.641 | 3.672 | 0.278 | 7.641 |
| p99 | 248.311 | n/a | n/a | n/a | 17.882 | n/a | 1.297 | 0.000 | 1.446 | 244.594 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 47.235 | 18.089 | 0.826 | 47.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e20000000000000225 | 1004.648 | 0.217 | n/a | 0.000 | 0.000 | 1.665 | 1001.451 | 0.039 | n/a | 0.095 | 0.000 | n/a | n/a | 1.182 | 0.217 | 0.000 | 1.182 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e2000000000000021a | 690.401 | 2.369 | n/a | 0.000 | 0.000 | 1.925 | 685.963 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.100 | 2.369 | 0.003 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000000227 | 627.608 | 3.954 | n/a | 0.000 | 0.000 | 1.446 | 622.006 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.117 | 3.954 | 0.006 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000000222 | 564.484 | 2.506 | n/a | 0.000 | 0.000 | 0.619 | 561.229 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.079 | 2.506 | 0.004 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e2000000000000021d | 536.950 | 2.798 | n/a | 0.000 | 0.000 | 0.471 | 533.543 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.083 | 2.798 | 0.005 | 0.083 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e20000000000000223 | 438.312 | 3.373 | n/a | 0.000 | 0.000 | 0.557 | 434.244 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.082 | 3.373 | 0.008 | 0.082 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e2000000000000021b | 300.731 | 2.950 | n/a | 0.000 | 0.000 | 0.582 | 296.969 | 0.015 | n/a | 0.093 | 0.000 | n/a | n/a | 0.122 | 2.950 | 0.010 | 0.122 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e2000000000000021e | 248.311 | 2.961 | n/a | 0.000 | 0.000 | 0.574 | 244.594 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.131 | 2.961 | 0.012 | 0.131 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000220 | 220.811 | 3.234 | n/a | 0.000 | 0.000 | 1.195 | 216.223 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.106 | 3.234 | 0.015 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e200000000000004df | 115.966 | 6.714 | n/a | 0.000 | 0.000 | 0.569 | 108.525 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.105 | 6.714 | 0.058 | 0.105 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000004e7 | 109.452 | 2.314 | n/a | 0.000 | 0.000 | 0.652 | 106.356 | 0.002 | n/a | 0.020 | 0.000 | n/a | n/a | 0.108 | 2.314 | 0.021 | 0.108 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e20000000000000488 | 91.815 | 3.724 | n/a | 0.000 | 0.000 | 0.471 | 87.510 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.074 | 3.724 | 0.041 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e20000000000000745 | 89.803 | 4.031 | n/a | 0.000 | 0.000 | 0.635 | 85.033 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.074 | 4.031 | 0.045 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e200000000000002ea | 89.694 | 7.842 | n/a | 0.926 | 0.000 | 0.653 | 80.002 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.212 | 8.768 | 0.098 | 0.212 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000000304 | 85.003 | 4.091 | n/a | 0.000 | 0.000 | 0.623 | 80.139 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.089 | 4.091 | 0.048 | 0.089 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e2000000000000078a | 84.987 | 2.103 | n/a | 0.000 | 0.000 | 0.383 | 82.361 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.087 | 2.103 | 0.025 | 0.087 | gw-r/thread-43/journal/page | none observed |
| 3498c8947ae604e200000000000002ad | 80.583 | 5.456 | n/a | 0.000 | 0.000 | 1.069 | 73.815 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.191 | 5.456 | 0.068 | 0.191 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e2000000000000061f | 79.575 | 3.315 | n/a | 0.000 | 0.000 | 1.097 | 75.018 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.107 | 3.315 | 0.042 | 0.107 | gw-r/thread-67/journal/page | none observed |
| 3498c8947ae604e20000000000000763 | 79.040 | 13.528 | n/a | 2.021 | 0.000 | 1.099 | 62.054 | 0.004 | n/a | 0.067 | 0.000 | n/a | n/a | 0.268 | 15.549 | 0.197 | 0.268 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000000753 | 78.288 | 4.204 | n/a | 0.000 | 0.000 | 0.390 | 73.531 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.137 | 4.204 | 0.054 | 0.137 | gw-r/thread-67/journal/page | none observed |

## P3 / tail / internal (2240 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.026 | n/a | n/a | n/a | 4.400 | n/a | 0.000 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.419 | 4.420 | 0.352 | 6.419 |
| p99 | 345.891 | n/a | n/a | n/a | 19.004 | n/a | 1.717 | 0.000 | 1.785 | 342.117 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 46.979 | 19.941 | 0.845 | 46.979 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3498c8947ae604e20000000000001a56 | 1003.767 | 3.308 | n/a | 0.000 | 0.000 | 0.519 | 999.833 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.069 | 3.308 | 0.003 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e20000000000001a57 | 1003.052 | 0.212 | n/a | 0.000 | 0.000 | 0.586 | 1001.062 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 1.130 | 0.212 | 0.000 | 1.130 | gw-r/thread-67/journal/page | none observed |
| 3498c8947ae604e20000000000001a7b | 1002.830 | 0.149 | n/a | 0.000 | 0.000 | 0.504 | 1000.958 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 1.147 | 0.149 | 0.000 | 1.147 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e20000000000001aa5 | 1002.817 | 0.280 | n/a | 0.000 | 0.000 | 0.650 | 1000.682 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 1.170 | 0.280 | 0.000 | 1.170 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000001a61 | 1002.639 | 0.127 | n/a | 0.000 | 0.000 | 0.571 | 1000.786 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 1.103 | 0.127 | 0.000 | 1.103 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000001a9d | 999.094 | 2.280 | n/a | 0.000 | 0.000 | 0.351 | 996.355 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.074 | 2.280 | 0.002 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e20000000000001aa1 | 998.709 | 5.639 | n/a | 0.000 | 0.000 | 0.636 | 992.306 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.103 | 5.639 | 0.006 | 0.103 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000001a7f | 953.730 | 2.696 | n/a | 0.000 | 0.000 | 0.432 | 950.475 | 0.009 | n/a | 0.034 | 0.000 | n/a | n/a | 0.084 | 2.696 | 0.003 | 0.084 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000001a5c | 778.673 | 7.707 | n/a | 0.000 | 0.000 | 0.860 | 769.855 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.201 | 7.707 | 0.010 | 0.201 | gw-r/thread-47/journal/page | none observed |
| 3498c8947ae604e20000000000001a6c | 764.606 | 11.796 | n/a | 0.000 | 0.000 | 1.312 | 751.230 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.232 | 11.796 | 0.015 | 0.232 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000001a77 | 706.087 | 2.039 | n/a | 0.000 | 0.000 | 0.850 | 703.072 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.091 | 2.039 | 0.003 | 0.091 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000001a59 | 700.646 | 9.103 | n/a | 0.000 | 0.000 | 0.447 | 690.782 | 0.004 | n/a | 0.013 | 0.000 | n/a | n/a | 0.297 | 9.103 | 0.013 | 0.297 | gw-r/thread-41/journal/page | none observed |
| 3498c8947ae604e20000000000001a96 | 695.137 | 2.433 | n/a | 0.000 | 0.000 | 0.327 | 692.269 | 0.002 | n/a | 0.028 | 0.000 | n/a | n/a | 0.078 | 2.433 | 0.004 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000001a72 | 690.732 | 9.293 | n/a | 0.000 | 0.000 | 0.465 | 680.611 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.321 | 9.293 | 0.013 | 0.321 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e20000000000001a8c | 612.021 | 2.295 | n/a | 0.000 | 0.000 | 0.386 | 609.215 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.076 | 2.295 | 0.004 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 3498c8947ae604e20000000000001a9e | 596.465 | 2.184 | n/a | 0.000 | 0.000 | 0.536 | 593.605 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.100 | 2.184 | 0.004 | 0.100 | gw-r/thread-67/journal/page | none observed |
| 3498c8947ae604e20000000000001a63 | 480.688 | 2.124 | n/a | 0.000 | 0.000 | 0.398 | 478.034 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.086 | 2.124 | 0.004 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 3498c8947ae604e20000000000001a99 | 452.378 | 2.337 | n/a | 0.000 | 0.000 | 0.484 | 449.444 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.080 | 2.337 | 0.005 | 0.080 | gw-r/thread-63/journal/page | none observed |
| 3498c8947ae604e20000000000001a98 | 420.190 | 4.626 | n/a | 0.000 | 0.000 | 0.728 | 414.688 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.116 | 4.626 | 0.011 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 3498c8947ae604e20000000000001a9f | 405.552 | 2.204 | n/a | 0.000 | 0.000 | 0.487 | 402.771 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.067 | 2.204 | 0.005 | 0.067 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.217 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 201.002 | 0.014 | n/a | 0.124 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 208.671 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.520 | 204.788 | 6.939 | n/a | 0.701 | 0.000 | n/a | n/a | 0.497 | 0.000 | 0.000 | 0.497 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f8067b35dd9749a000000000000000e | 208.671 | 0.000 | n/a | 0.000 | 0.000 | 4.214 | 204.114 | 0.018 | n/a | 0.190 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000056 | 206.006 | 0.000 | n/a | 0.000 | 0.000 | 4.146 | 201.630 | 0.014 | n/a | 0.097 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a0000000000000054 | 205.785 | 0.000 | n/a | 0.000 | 0.000 | 0.878 | 201.224 | 3.413 | n/a | 0.102 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000012 | 205.486 | 0.000 | n/a | 0.000 | 0.000 | 0.423 | 204.788 | 0.012 | n/a | 0.157 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000020 | 204.563 | 0.000 | n/a | 0.000 | 0.000 | 1.740 | 202.403 | 0.014 | n/a | 0.158 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000030 | 204.428 | 0.000 | n/a | 0.000 | 0.000 | 1.231 | 202.679 | 0.054 | n/a | 0.247 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a000000000000001e | 203.974 | 0.000 | n/a | 0.000 | 0.000 | 0.588 | 203.050 | 0.017 | n/a | 0.155 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-46/journal/page | none observed |
| 6f8067b35dd9749a0000000000000010 | 203.858 | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 202.452 | 0.012 | n/a | 0.170 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a000000000000003e | 203.772 | 0.000 | n/a | 0.000 | 0.000 | 2.167 | 201.353 | 0.015 | n/a | 0.136 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000049 | 203.666 | 0.000 | n/a | 0.000 | 0.000 | 2.209 | 201.198 | 0.013 | n/a | 0.138 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000043 | 203.333 | 0.000 | n/a | 0.000 | 0.000 | 2.064 | 201.040 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a000000000000002f | 203.188 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 201.754 | 0.014 | n/a | 0.139 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-46/journal/page | none observed |
| 6f8067b35dd9749a0000000000000019 | 203.128 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 202.048 | 0.027 | n/a | 0.166 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a0000000000000008 | 203.086 | 0.000 | n/a | 0.000 | 0.000 | 1.785 | 200.975 | 0.013 | n/a | 0.091 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a000000000000003c | 203.054 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.457 | 0.049 | n/a | 0.143 | 0.000 | n/a | n/a | 0.447 | 0.000 | 0.000 | 0.447 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a000000000000000b | 202.877 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 201.500 | 0.015 | n/a | 0.164 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a000000000000004d | 202.849 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.652 | 0.025 | n/a | 0.170 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a000000000000003b | 202.768 | 0.000 | n/a | 0.000 | 0.000 | 1.103 | 201.407 | 0.017 | n/a | 0.132 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a0000000000000052 | 202.759 | 0.000 | n/a | 0.000 | 0.000 | 1.693 | 200.833 | 0.017 | n/a | 0.116 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000004c | 202.712 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 201.650 | 0.103 | n/a | 0.165 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-63/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.205 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.052 | 0.017 | n/a | 0.122 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |
| p99 | 238.603 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 37.307 | 211.436 | 5.602 | n/a | 3.772 | 0.000 | n/a | n/a | 0.614 | 0.000 | 0.000 | 0.614 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f8067b35dd9749a00000000000000bc | 238.603 | 0.000 | n/a | 0.000 | 0.000 | 37.307 | 201.037 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000007c | 212.460 | 0.000 | n/a | 0.000 | 0.000 | 0.683 | 211.436 | 0.063 | n/a | 0.105 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a00000000000000be | 208.611 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 207.616 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a00000000000000c0 | 208.139 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 206.750 | 0.051 | n/a | 0.325 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a00000000000000a5 | 206.978 | 0.000 | n/a | 0.000 | 0.000 | 5.006 | 201.661 | 0.022 | n/a | 0.173 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a00000000000000b5 | 206.842 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 205.547 | 0.116 | n/a | 0.546 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000079 | 206.180 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 204.969 | 0.106 | n/a | 0.204 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a00000000000000a0 | 205.696 | 0.000 | n/a | 0.000 | 0.000 | 1.220 | 203.328 | 0.115 | n/a | 0.448 | 0.000 | n/a | n/a | 0.584 | 0.000 | 0.000 | 0.584 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a00000000000000b2 | 205.529 | 0.000 | n/a | 0.000 | 0.000 | 3.277 | 201.792 | 0.018 | n/a | 0.242 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a000000000000005d | 204.268 | 0.000 | n/a | 0.000 | 0.000 | 1.089 | 202.865 | 0.060 | n/a | 0.149 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000008f | 204.174 | 0.000 | n/a | 0.000 | 0.000 | 1.954 | 201.838 | 0.042 | n/a | 0.188 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000078 | 204.089 | 0.000 | n/a | 0.000 | 0.000 | 2.959 | 200.836 | 0.016 | n/a | 0.109 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a0000000000000081 | 203.553 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 201.946 | 0.015 | n/a | 0.152 | 0.000 | n/a | n/a | 0.614 | 0.000 | 0.000 | 0.614 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a00000000000000bf | 203.528 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 202.060 | 0.015 | n/a | 0.126 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000089 | 203.316 | 0.000 | n/a | 0.000 | 0.000 | 1.196 | 201.658 | 0.023 | n/a | 0.200 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a00000000000000a7 | 203.255 | 0.000 | n/a | 0.000 | 0.000 | 1.894 | 201.076 | 0.022 | n/a | 0.126 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a00000000000000b8 | 203.226 | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 201.631 | 0.079 | n/a | 0.140 | 0.000 | n/a | n/a | 0.281 | 0.000 | 0.000 | 0.281 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000091 | 203.141 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 202.132 | 0.017 | n/a | 0.122 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000088 | 203.064 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.469 | 1.569 | n/a | 0.031 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a000000000000005b | 202.978 | 0.000 | n/a | 0.000 | 0.000 | 1.697 | 201.047 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.286 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 201.154 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 209.854 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 8.618 | 207.345 | 6.686 | n/a | 0.427 | 0.000 | n/a | n/a | 0.322 | 0.000 | 0.000 | 0.322 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f8067b35dd9749a0000000000000127 | 209.854 | 0.000 | n/a | 0.000 | 0.000 | 8.618 | 200.994 | 0.008 | n/a | 0.104 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a00000000000000fe | 208.294 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 207.345 | 0.009 | n/a | 0.109 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a00000000000000e4 | 206.983 | 0.000 | n/a | 0.000 | 0.000 | 1.664 | 205.083 | 0.018 | n/a | 0.107 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a00000000000000de | 205.172 | 0.000 | n/a | 0.000 | 0.000 | 1.655 | 203.227 | 0.034 | n/a | 0.127 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a00000000000000fc | 204.778 | 0.000 | n/a | 0.000 | 0.000 | 0.979 | 203.571 | 0.008 | n/a | 0.096 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000101 | 204.584 | 0.000 | n/a | 0.000 | 0.000 | 3.632 | 200.774 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a000000000000011c | 204.183 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 202.863 | 0.007 | n/a | 0.117 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a00000000000000d0 | 204.132 | 0.000 | n/a | 0.000 | 0.000 | 2.694 | 201.084 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.258 | 0.000 | 0.000 | 0.258 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a00000000000000d2 | 204.057 | 0.000 | n/a | 0.000 | 0.000 | 1.908 | 201.738 | 0.016 | n/a | 0.132 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a00000000000000d1 | 203.690 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 202.243 | 0.031 | n/a | 0.177 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-46/journal/page | none observed |
| 6f8067b35dd9749a000000000000011d | 203.447 | 0.000 | n/a | 0.000 | 0.000 | 1.321 | 201.897 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a00000000000000ee | 203.335 | 0.000 | n/a | 0.000 | 0.000 | 1.490 | 201.449 | 0.016 | n/a | 0.097 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a00000000000000fd | 203.314 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 202.201 | 0.048 | n/a | 0.219 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a00000000000000c4 | 203.306 | 0.000 | n/a | 0.000 | 0.000 | 1.269 | 201.698 | 0.008 | n/a | 0.118 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a000000000000011a | 203.234 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 201.918 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a00000000000000cd | 203.221 | 0.000 | n/a | 0.000 | 0.000 | 1.430 | 201.450 | 0.014 | n/a | 0.123 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000128 | 203.161 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 201.750 | 0.007 | n/a | 0.137 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a00000000000000f1 | 203.122 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 201.522 | 0.017 | n/a | 0.230 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a00000000000000ed | 203.114 | 0.000 | n/a | 0.000 | 0.000 | 0.836 | 201.783 | 0.031 | n/a | 0.141 | 0.000 | n/a | n/a | 0.322 | 0.000 | 0.000 | 0.322 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a00000000000000c7 | 202.949 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 201.983 | 0.023 | n/a | 0.107 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.792 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 200.854 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 209.034 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.786 | 205.409 | 3.153 | n/a | 3.141 | 0.000 | n/a | n/a | 0.334 | 0.000 | 0.000 | 0.334 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f8067b35dd9749a0000000000000154 | 209.034 | 0.000 | n/a | 0.000 | 0.000 | 4.786 | 200.902 | 0.025 | n/a | 3.141 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a000000000000012f | 206.660 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 205.409 | 0.017 | n/a | 0.227 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000158 | 204.777 | 0.000 | n/a | 0.000 | 0.000 | 3.476 | 201.106 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a000000000000013e | 204.678 | 0.000 | n/a | 0.000 | 0.000 | 0.445 | 204.004 | 0.019 | n/a | 0.095 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a0000000000000181 | 203.575 | 0.000 | n/a | 0.000 | 0.000 | 1.889 | 201.223 | 0.006 | n/a | 0.123 | 0.000 | n/a | n/a | 0.334 | 0.000 | 0.000 | 0.334 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000194 | 202.825 | 0.000 | n/a | 0.000 | 0.000 | 1.458 | 201.046 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000174 | 202.798 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.582 | 0.011 | n/a | 0.111 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000015d | 202.789 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 201.744 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000137 | 202.708 | 0.000 | n/a | 0.000 | 0.000 | 1.151 | 201.337 | 0.023 | n/a | 0.083 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000151 | 202.682 | 0.000 | n/a | 0.000 | 0.000 | 0.446 | 202.042 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000169 | 202.681 | 0.000 | n/a | 0.000 | 0.000 | 1.238 | 201.130 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000145 | 202.620 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 201.412 | 0.016 | n/a | 0.139 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a000000000000016a | 202.596 | 0.000 | n/a | 0.000 | 0.000 | 0.986 | 201.346 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000180 | 202.562 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 201.486 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000016c | 202.543 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 201.484 | 0.020 | n/a | 0.132 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a000000000000018c | 202.509 | 0.000 | n/a | 0.000 | 0.000 | 1.303 | 201.033 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000193 | 202.473 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 201.341 | 0.009 | n/a | 0.125 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000013c | 202.459 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.235 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000016f | 202.454 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 201.359 | 0.008 | n/a | 0.095 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000189 | 202.399 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 201.234 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.650 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.821 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 205.202 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.492 | 203.969 | 1.153 | n/a | 0.135 | 0.000 | n/a | n/a | 0.373 | 0.000 | 0.000 | 0.373 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f8067b35dd9749a00000000000001de | 208.802 | 0.000 | n/a | 0.000 | 0.000 | 2.208 | 205.252 | 0.019 | n/a | 0.103 | 0.000 | n/a | n/a | 1.220 | 0.000 | 0.000 | 1.220 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a00000000000001a7 | 205.202 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 203.969 | 0.020 | n/a | 0.074 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a00000000000001a5 | 203.514 | 0.000 | n/a | 0.000 | 0.000 | 0.598 | 202.755 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a00000000000001bd | 203.421 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 202.062 | 0.016 | n/a | 0.143 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000199 | 203.371 | 0.000 | n/a | 0.000 | 0.000 | 2.232 | 200.976 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a00000000000001be | 203.366 | 0.000 | n/a | 0.000 | 0.000 | 1.452 | 201.637 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a00000000000001a0 | 203.358 | 0.000 | n/a | 0.000 | 0.000 | 2.221 | 200.941 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a00000000000001d8 | 203.303 | 0.000 | n/a | 0.000 | 0.000 | 1.979 | 201.059 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000206 | 203.148 | 0.000 | n/a | 0.000 | 0.000 | 2.134 | 200.758 | 0.006 | n/a | 0.109 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a00000000000001eb | 202.888 | 0.000 | n/a | 0.000 | 0.000 | 0.615 | 201.974 | 0.018 | n/a | 0.135 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a00000000000001f6 | 202.822 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 201.940 | 0.029 | n/a | 0.119 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a00000000000001bc | 202.644 | 0.000 | n/a | 0.000 | 0.000 | 1.095 | 201.206 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a00000000000001af | 202.634 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 201.589 | 0.007 | n/a | 0.094 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a00000000000001ea | 202.509 | 0.000 | n/a | 0.000 | 0.000 | 1.059 | 201.192 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a00000000000001bb | 202.458 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 201.644 | 0.012 | n/a | 0.103 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a00000000000001ec | 202.429 | 0.000 | n/a | 0.000 | 0.000 | 1.125 | 201.048 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a00000000000001e6 | 202.365 | 0.000 | n/a | 0.000 | 0.000 | 0.923 | 201.212 | 0.008 | n/a | 0.107 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a00000000000001b2 | 202.306 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 201.213 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a00000000000001fc | 202.240 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 201.079 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a00000000000001e7 | 202.225 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 200.796 | 0.025 | n/a | 0.053 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.954 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 200.914 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 205.797 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.313 | 204.050 | 2.903 | n/a | 0.168 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f8067b35dd9749a0000000000000242 | 207.795 | 0.000 | n/a | 0.000 | 0.000 | 3.537 | 204.050 | 0.016 | n/a | 0.073 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000227 | 205.797 | 0.000 | n/a | 0.000 | 0.000 | 4.322 | 201.158 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000221 | 205.332 | 0.000 | n/a | 0.000 | 0.000 | 4.313 | 200.822 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000210 | 205.152 | 0.000 | n/a | 0.000 | 0.000 | 2.634 | 202.354 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a000000000000023d | 204.808 | 0.000 | n/a | 0.000 | 0.000 | 0.449 | 204.117 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000262 | 204.562 | 0.000 | n/a | 0.000 | 0.000 | 0.438 | 203.900 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a000000000000022e | 203.774 | 0.000 | n/a | 0.000 | 0.000 | 1.716 | 201.679 | 0.010 | n/a | 0.168 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000231 | 203.531 | 0.000 | n/a | 0.000 | 0.000 | 0.457 | 202.908 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000275 | 203.300 | 0.000 | n/a | 0.000 | 0.000 | 1.340 | 201.616 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a000000000000025b | 203.284 | 0.000 | n/a | 0.000 | 0.000 | 2.065 | 200.986 | 0.015 | n/a | 0.073 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000271 | 203.234 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 201.779 | 0.023 | n/a | 0.130 | 0.000 | n/a | n/a | 0.263 | 0.000 | 0.000 | 0.263 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000272 | 202.995 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 201.529 | 0.008 | n/a | 0.113 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a0000000000000226 | 202.951 | 0.000 | n/a | 0.000 | 0.000 | 1.268 | 201.339 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000021d | 202.920 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 201.943 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000022d | 202.844 | 0.000 | n/a | 0.000 | 0.000 | 0.588 | 201.798 | 0.019 | n/a | 0.248 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000244 | 202.822 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 201.920 | 0.030 | n/a | 0.085 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000238 | 202.742 | 0.000 | n/a | 0.000 | 0.000 | 1.082 | 201.395 | 0.018 | n/a | 0.096 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000278 | 202.697 | 0.000 | n/a | 0.000 | 0.000 | 1.184 | 201.261 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a000000000000027c | 202.585 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 201.742 | 0.015 | n/a | 0.134 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000253 | 202.557 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.400 | 0.009 | n/a | 0.102 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-41/journal/page | none observed |

## P3 / L1024 / read (67 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.340 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.670 | 69.688 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |
| p99 | 206.548 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.505 | 205.522 | 2.181 | n/a | 0.176 | 0.000 | n/a | n/a | 50.274 | 0.000 | 0.000 | 50.274 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f8067b35dd9749a0000000000000298 | 206.548 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 205.522 | 0.011 | n/a | 0.115 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a000000000000028a | 203.958 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 202.896 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000295 | 203.458 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 202.259 | 0.049 | n/a | 0.147 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a0000000000000292 | 203.240 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 202.239 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000297 | 202.771 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 201.524 | 0.007 | n/a | 0.176 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000293 | 202.746 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 201.510 | 0.026 | n/a | 0.127 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000285 | 202.652 | 0.000 | n/a | 0.000 | 0.000 | 1.390 | 201.023 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000294 | 202.641 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.414 | 0.017 | n/a | 0.099 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a000000000000027f | 202.516 | 0.000 | n/a | 0.000 | 0.000 | 1.354 | 200.894 | 0.022 | n/a | 0.070 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a000000000000028d | 202.302 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 201.284 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 6f8067b35dd9749a0000000000000280 | 202.261 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 201.176 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a000000000000028c | 202.003 | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 201.239 | 0.027 | n/a | 0.115 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000286 | 201.919 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 200.924 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000290 | 201.880 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 201.030 | 0.027 | n/a | 0.069 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-43/journal/page | none observed |
| 6f8067b35dd9749a0000000000000281 | 201.878 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 200.876 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a000000000000028f | 201.427 | 0.000 | n/a | 0.000 | 0.000 | 0.510 | 200.730 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000283 | 201.417 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 200.736 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000288 | 201.382 | 0.000 | n/a | 0.000 | 0.000 | 0.443 | 200.750 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000299 | 189.238 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 188.276 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000296 | 119.294 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 117.786 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 | gw-r/thread-63/journal/page | none observed |

## P3 / tail / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 85.026 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.516 | 81.789 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 203.050 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.834 | 201.836 | 3.832 | n/a | 0.070 | 0.000 | n/a | n/a | 50.724 | 0.000 | 0.000 | 50.724 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f8067b35dd9749a0000000000000ed7 | 203.286 | 0.000 | n/a | 0.000 | 0.000 | 2.326 | 200.782 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ee4 | 203.239 | 0.000 | n/a | 0.000 | 0.000 | 1.905 | 201.159 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000f07 | 203.050 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 202.075 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ee9 | 202.867 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 201.836 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000eec | 202.745 | 0.000 | n/a | 0.000 | 0.000 | 0.488 | 202.115 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000efe | 202.335 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 200.976 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ec2 | 202.220 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.287 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-67/journal/page | none observed |
| 6f8067b35dd9749a0000000000000eee | 202.076 | 0.000 | n/a | 0.000 | 0.000 | 1.199 | 200.724 | 0.014 | n/a | 0.053 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-67/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ec4 | 201.939 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 200.897 | 0.017 | n/a | 0.069 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ecb | 201.867 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 200.897 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ef2 | 201.864 | 0.000 | n/a | 0.000 | 0.000 | 1.204 | 200.489 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-67/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ecc | 201.814 | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 200.865 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-67/journal/page | none observed |
| 6f8067b35dd9749a0000000000000eb8 | 201.794 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 200.790 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ea6 | 201.781 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 200.884 | 0.007 | n/a | 0.086 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-48/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ef4 | 201.747 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 200.661 | 0.025 | n/a | 0.045 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-41/journal/page | none observed |
| 6f8067b35dd9749a0000000000000eb9 | 201.739 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 200.654 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-63/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ed2 | 201.732 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 200.842 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-44/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ea7 | 201.711 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 200.940 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000e9d | 201.709 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 200.881 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 6f8067b35dd9749a0000000000000ec3 | 201.698 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 200.816 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

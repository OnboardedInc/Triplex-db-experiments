# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (131.424 ms, trace `94ea9f68e99879d40000000000000142`); `node-13/thread-0/driver.queue.subject` (95.078 ms, trace `94ea9f68e99879d400000000000002fc`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (81.940 ms, trace `94ea9f68e99879d400000000000002f7`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (121.288 ms, trace `94ea9f68e99879d400000000000001d1`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (104.539 ms, trace `94ea9f68e99879d4000000000000015a`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-defer-a-1-baseline`; source `5c315e43102d54fcc193e8baaab318166f8b6c12`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 7285153.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 217 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14503.246 | 632.675 | 13.126 | 457 |
| L1 | 0 | 19944.371 | 498.191 | 14.793 | 668 |
| L4 | 0 | 19973.535 | 411.829 | 12.256 | 628 |
| L16 | 0 | 19976.598 | 392.401 | 15.289 | 686 |
| L64 | 0 | 19975.611 | 435.968 | 6.302 | 870 |
| L256 | 0 | 19966.414 | 545.254 | 9.828 | 688 |
| L1024 | 0 | 19983.650 | 4023.584 | 37.246 | 17173 |
| tail | 0 | 64478.263 | 11700.795 | 104.151 | 52795 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 94ea9f68e99879d40000000000000142 | driver.queue.scheduler-dispatch | 0.058 | none | 0 / 32 |
| 94ea9f68e99879d40000000000000142 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 94ea9f68e99879d40000000000000142 waited: []

| 94ea9f68e99879d400000000000002fc | driver.queue.subject | 95.078 | 94ea9f68e99879d400000000000002f7 | 3 / 32 |
| 94ea9f68e99879d400000000000002fc | driver.queue.scheduler-late | 14.445 | none | 3 / 32 |
| 94ea9f68e99879d400000000000002fc | driver.queue.scheduler-dispatch | 0.100 | none | 4 / 32 |

Observed active steps while trace 94ea9f68e99879d400000000000002fc waited: [{"at":1794636619160.951,"inFlight":2,"capacity":32,"active":[{"traceId":"94ea9f68e99879d400000000000002f9","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002f7","step":"client.http"}]},{"at":1794636619181.221,"inFlight":4,"capacity":32,"active":[{"traceId":"94ea9f68e99879d400000000000002f9","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002f7","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002fe","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002ff","step":"client.http"}]},{"at":1794636619200.6243,"inFlight":4,"capacity":32,"active":[{"traceId":"94ea9f68e99879d400000000000002f9","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002f7","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002fe","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002ff","step":"client.http"}]},{"at":1794636619221.2004,"inFlight":5,"capacity":32,"active":[{"traceId":"94ea9f68e99879d400000000000002f9","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002f7","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002fe","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002ff","step":"client.http"},{"traceId":"94ea9f68e99879d40000000000000300","step":"client.http"}]}]

| 94ea9f68e99879d400000000000002f7 | driver.queue.subject | 31.561 | 94ea9f68e99879d400000000000002f6 | 2 / 32 |
| 94ea9f68e99879d400000000000002f7 | driver.queue.scheduler-late | 15.060 | none | 2 / 32 |
| 94ea9f68e99879d400000000000002f7 | driver.queue.scheduler-dispatch | 0.077 | none | 2 / 32 |

Observed active steps while trace 94ea9f68e99879d400000000000002f7 waited: [{"at":1794636619113.9214,"inFlight":2,"capacity":32,"active":[{"traceId":"94ea9f68e99879d400000000000002f5","step":"client.http"},{"traceId":"94ea9f68e99879d400000000000002f6","step":"client.http"}]}]

| 94ea9f68e99879d400000000000001d1 | driver.queue.scheduler-late | 0.641 | none | 0 / 32 |
| 94ea9f68e99879d400000000000001d1 | driver.queue.scheduler-dispatch | 0.071 | none | 0 / 32 |

Observed active steps while trace 94ea9f68e99879d400000000000001d1 waited: []

| 94ea9f68e99879d4000000000000015a | driver.queue.scheduler-late | 0.118 | none | 0 / 32 |
| 94ea9f68e99879d4000000000000015a | driver.queue.scheduler-dispatch | 0.088 | none | 0 / 32 |

Observed active steps while trace 94ea9f68e99879d4000000000000015a waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.469 | 0.715 | 0.000 | 1.487 | 6.140 | 0.228 | 0.000 | 0.161 | 2.324 | 9.825 | 0.083 | n/a | 0.546 | 17.212 | n/a | n/a | 0.074 | 6.636 | 0.202 | 0.074 |
| p99 | 101.767 | 8.523 | 0.012 | 9.751 | 23.234 | 48.610 | 8.686 | 1.974 | 23.341 | 61.429 | 0.446 | n/a | 4.633 | 77.007 | n/a | n/a | 0.445 | 55.958 | 0.550 | 0.445 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d400000000000000fa | 101.767 | 7.258 | 48.610 | 0.000 | 0.091 | 3.560 | 12.195 | 0.112 | n/a | 3.936 | 25.911 | n/a | n/a | 0.096 | 55.958 | 0.550 | 0.096 | node-13/thread-0/rpc.probe.transact | none observed |
| 94ea9f68e99879d400000000000000f6 | 96.312 | 20.551 | 1.170 | 0.000 | 0.074 | 4.239 | 40.374 | 0.440 | n/a | 0.783 | 28.602 | n/a | n/a | 0.080 | 21.795 | 0.226 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000000fe | 94.871 | 6.140 | 0.434 | 0.000 | 0.052 | 2.546 | 8.064 | 0.087 | n/a | 0.486 | 77.007 | n/a | n/a | 0.054 | 6.626 | 0.070 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000103 | 92.039 | 23.234 | 0.065 | 8.686 | 1.974 | 4.242 | 9.825 | 0.270 | n/a | 3.528 | 39.891 | n/a | n/a | 0.324 | 33.958 | 0.369 | 0.324 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000120 | 90.751 | 8.035 | 0.269 | 0.000 | 0.061 | 2.470 | 51.627 | 0.244 | n/a | 4.633 | 23.352 | n/a | n/a | 0.060 | 8.365 | 0.092 | 0.060 | gw-w/thread-43/gateway.admitted-work | none observed |
| 94ea9f68e99879d40000000000000112 | 88.586 | 6.241 | 0.621 | 0.439 | 0.054 | 2.710 | 61.429 | 0.065 | n/a | 0.211 | 16.759 | n/a | n/a | 0.056 | 7.355 | 0.083 | 0.056 | gw-w/thread-48/gateway.admitted-work | none observed |
| 94ea9f68e99879d40000000000000102 | 70.820 | 12.395 | 0.451 | 0.000 | 0.089 | 3.576 | 19.313 | 0.099 | n/a | 3.003 | 31.677 | n/a | n/a | 0.216 | 12.935 | 0.183 | 0.216 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000000fb | 62.522 | 5.250 | 0.009 | 0.000 | 0.106 | 23.341 | 1.403 | 0.037 | n/a | 0.874 | 31.326 | n/a | n/a | 0.177 | 5.365 | 0.086 | 0.177 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000012c | 56.331 | 3.944 | 0.228 | 0.000 | 0.155 | 1.352 | 30.944 | 0.121 | n/a | 0.201 | 19.311 | n/a | n/a | 0.074 | 4.327 | 0.077 | 0.074 | gw-w/thread-46/gateway.admitted-work | none observed |
| 94ea9f68e99879d400000000000000f2 | 54.148 | 12.950 | 0.012 | 0.000 | 0.726 | 1.417 | 14.037 | 0.083 | n/a | 0.546 | 23.932 | n/a | n/a | 0.445 | 13.688 | 0.253 | 0.445 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000106 | 53.371 | 6.761 | 0.281 | 0.000 | 0.167 | 2.324 | 14.331 | 0.104 | n/a | 3.221 | 26.084 | n/a | n/a | 0.099 | 7.209 | 0.135 | 0.099 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000010e | 52.173 | 12.399 | 0.312 | 0.000 | 0.056 | 2.222 | 12.426 | 0.102 | n/a | 0.166 | 24.444 | n/a | n/a | 0.047 | 12.767 | 0.245 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000108 | 51.724 | 9.265 | 0.425 | 0.000 | 0.307 | 2.655 | 20.676 | 0.131 | n/a | 1.176 | 17.003 | n/a | n/a | 0.086 | 9.997 | 0.193 | 0.086 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000011c | 38.091 | 5.527 | 0.262 | 0.514 | 0.052 | 2.745 | 11.643 | 0.170 | n/a | 0.184 | 16.950 | n/a | n/a | 0.043 | 6.355 | 0.167 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000124 | 37.469 | 6.952 | 0.355 | 0.000 | 0.161 | 2.849 | 8.971 | 0.060 | n/a | 0.549 | 17.481 | n/a | n/a | 0.093 | 7.468 | 0.199 | 0.093 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000119 | 35.995 | 7.661 | 0.006 | 1.525 | 1.097 | 0.986 | 5.016 | 0.041 | n/a | 0.286 | 19.326 | n/a | n/a | 0.049 | 10.290 | 0.286 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000109 | 35.947 | 14.504 | 0.013 | 1.773 | 0.566 | 1.539 | 2.344 | 0.058 | n/a | 3.589 | 11.502 | n/a | n/a | 0.060 | 16.856 | 0.469 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000012a | 35.651 | 4.901 | 0.373 | 0.000 | 0.117 | 2.222 | 10.334 | 0.159 | n/a | 0.189 | 17.212 | n/a | n/a | 0.143 | 5.391 | 0.151 | 0.143 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000110 | 33.370 | 5.677 | 0.292 | 0.000 | 0.048 | 7.722 | 11.478 | 0.081 | n/a | 0.138 | 7.893 | n/a | n/a | 0.042 | 6.016 | 0.180 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000121 | 31.626 | 3.969 | 0.005 | 0.000 | 0.118 | 1.299 | 6.677 | 0.046 | n/a | 0.594 | 18.876 | n/a | n/a | 0.042 | 4.092 | 0.129 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.569 | 0.739 | 0.000 | 2.063 | 4.216 | 0.009 | 0.000 | 0.390 | 1.387 | 1.779 | 0.046 | n/a | 0.451 | 10.028 | n/a | n/a | 0.066 | 4.873 | 0.253 | 0.066 |
| p99 | 62.522 | 1.426 | 0.012 | 3.355 | 6.579 | 0.019 | 0.000 | 1.181 | 23.341 | 6.794 | 0.446 | n/a | 0.896 | 31.326 | n/a | n/a | 0.189 | 6.778 | 0.338 | 0.189 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d400000000000000fb | 62.522 | 5.250 | 0.009 | 0.000 | 0.106 | 23.341 | 1.403 | 0.037 | n/a | 0.874 | 31.326 | n/a | n/a | 0.177 | 5.365 | 0.086 | 0.177 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000121 | 31.626 | 3.969 | 0.005 | 0.000 | 0.118 | 1.299 | 6.677 | 0.046 | n/a | 0.594 | 18.876 | n/a | n/a | 0.042 | 4.092 | 0.129 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000113 | 27.369 | 3.685 | 0.007 | 0.000 | 1.181 | 5.906 | 6.794 | 0.102 | n/a | 0.196 | 9.452 | n/a | n/a | 0.046 | 4.873 | 0.178 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000115 | 25.928 | 6.579 | 0.012 | 0.000 | 0.188 | 1.651 | 3.926 | 0.047 | n/a | 0.130 | 13.331 | n/a | n/a | 0.066 | 6.778 | 0.261 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000127 | 20.569 | 5.117 | 0.005 | 0.000 | 0.390 | 1.235 | 1.598 | 0.046 | n/a | 0.896 | 11.236 | n/a | n/a | 0.045 | 5.513 | 0.268 | 0.045 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000125 | 19.660 | 5.928 | 0.012 | 0.000 | 0.696 | 1.254 | 1.278 | 0.046 | n/a | 0.876 | 9.493 | n/a | n/a | 0.077 | 6.636 | 0.338 | 0.077 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000100 | 18.587 | 3.812 | 0.019 | 0.000 | 0.879 | 1.387 | 1.779 | 0.044 | n/a | 0.451 | 10.028 | n/a | n/a | 0.189 | 4.709 | 0.253 | 0.189 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000011d | 18.156 | 4.216 | 0.009 | 0.000 | 0.354 | 4.915 | 1.699 | 0.446 | n/a | 0.122 | 6.350 | n/a | n/a | 0.045 | 4.579 | 0.252 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000000f7 | 15.139 | 3.504 | 0.007 | 0.000 | 0.809 | 0.881 | 1.891 | 0.046 | n/a | 0.143 | 7.681 | n/a | n/a | 0.178 | 4.320 | 0.285 | 0.178 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.297 | 0.829 | 0.000 | 1.366 | 5.561 | 0.015 | 0.000 | 0.120 | 1.490 | 5.122 | 0.056 | n/a | 0.379 | 15.933 | n/a | n/a | 0.062 | 6.461 | 0.194 | 0.062 |
| p99 | 161.471 | 5.024 | 0.022 | 8.469 | 15.716 | 0.487 | 2.441 | 4.739 | 6.207 | 35.107 | 0.559 | n/a | 3.476 | 131.424 | n/a | n/a | 0.122 | 15.934 | 0.516 | 0.122 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d40000000000000142 | 161.471 | 4.381 | 0.203 | 0.565 | 0.059 | 2.114 | 21.858 | 0.125 | n/a | 0.696 | 131.424 | n/a | n/a | 0.047 | 5.208 | 0.032 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000015a | 127.513 | 15.716 | 0.012 | 0.000 | 0.207 | 1.242 | 4.435 | 0.129 | n/a | 1.170 | 104.539 | n/a | n/a | 0.063 | 15.934 | 0.125 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000175 | 68.404 | 7.489 | 0.487 | 0.000 | 0.059 | 6.207 | 35.107 | 0.117 | n/a | 0.701 | 18.192 | n/a | n/a | 0.045 | 8.034 | 0.117 | 0.045 | gw-w/thread-45/gateway.admitted-work | none observed |
| 94ea9f68e99879d40000000000000134 | 62.583 | 5.990 | 0.009 | 0.000 | 0.170 | 0.851 | 1.737 | 0.050 | n/a | 0.182 | 53.525 | n/a | n/a | 0.069 | 6.169 | 0.099 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000173 | 59.507 | 7.301 | 0.324 | 0.562 | 0.109 | 2.202 | 16.364 | 0.123 | n/a | 2.542 | 29.890 | n/a | n/a | 0.089 | 8.296 | 0.139 | 0.089 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000140 | 58.478 | 6.955 | 0.258 | 0.000 | 0.054 | 2.376 | 23.979 | 0.156 | n/a | 0.171 | 24.461 | n/a | n/a | 0.069 | 7.267 | 0.124 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000130 | 57.982 | 4.796 | 0.299 | 0.000 | 0.050 | 1.876 | 23.961 | 0.047 | n/a | 0.089 | 26.811 | n/a | n/a | 0.052 | 5.145 | 0.089 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000148 | 51.362 | 5.732 | 0.238 | 0.384 | 0.108 | 1.116 | 9.099 | 0.055 | n/a | 0.159 | 34.396 | n/a | n/a | 0.075 | 6.461 | 0.126 | 0.075 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000137 | 47.708 | 6.456 | 0.304 | 0.788 | 0.053 | 2.066 | 8.294 | 0.051 | n/a | 0.142 | 29.505 | n/a | n/a | 0.049 | 7.602 | 0.159 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000169 | 46.926 | 7.032 | 0.474 | 0.000 | 0.053 | 1.847 | 21.680 | 0.047 | n/a | 0.423 | 15.313 | n/a | n/a | 0.055 | 7.560 | 0.161 | 0.055 | gw-w/thread-50/gateway.admitted-work | none observed |
| 94ea9f68e99879d40000000000000159 | 44.320 | 4.485 | 0.388 | 0.000 | 0.045 | 5.103 | 18.727 | 0.068 | n/a | 0.118 | 15.331 | n/a | n/a | 0.057 | 4.917 | 0.111 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000144 | 43.953 | 5.082 | 0.309 | 0.000 | 0.047 | 2.467 | 16.000 | 0.088 | n/a | 0.178 | 19.737 | n/a | n/a | 0.045 | 5.438 | 0.124 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000013a | 43.086 | 3.837 | 0.213 | 0.000 | 0.057 | 1.460 | 9.083 | 0.046 | n/a | 2.055 | 26.288 | n/a | n/a | 0.049 | 4.106 | 0.095 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000012e | 43.051 | 4.586 | 0.227 | 0.410 | 0.120 | 1.490 | 7.178 | 0.054 | n/a | 0.111 | 28.799 | n/a | n/a | 0.076 | 5.343 | 0.124 | 0.076 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000013d | 43.037 | 9.284 | 0.008 | 2.441 | 0.583 | 1.537 | 3.067 | 0.097 | n/a | 0.257 | 25.683 | n/a | n/a | 0.081 | 12.315 | 0.286 | 0.081 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000016f | 40.197 | 6.719 | 0.438 | 0.000 | 0.057 | 2.282 | 12.988 | 0.129 | n/a | 0.909 | 16.610 | n/a | n/a | 0.065 | 7.214 | 0.179 | 0.065 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000017d | 37.254 | 6.799 | 0.377 | 0.000 | 0.057 | 1.544 | 10.245 | 0.089 | n/a | 0.151 | 17.924 | n/a | n/a | 0.068 | 7.233 | 0.194 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000166 | 34.999 | 6.969 | 0.007 | 0.000 | 0.585 | 1.414 | 2.521 | 0.039 | n/a | 0.551 | 22.824 | n/a | n/a | 0.088 | 7.561 | 0.216 | 0.088 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000014c | 34.760 | 5.259 | 0.383 | 0.000 | 0.106 | 1.315 | 14.872 | 0.119 | n/a | 0.295 | 12.324 | n/a | n/a | 0.086 | 5.747 | 0.165 | 0.086 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000165 | 34.490 | 4.188 | 0.264 | 0.000 | 0.047 | 1.577 | 18.638 | 0.109 | n/a | 0.146 | 9.459 | n/a | n/a | 0.061 | 4.500 | 0.130 | 0.061 | gw-w/thread-45/gateway.admitted-work | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.526 | 0.873 | 0.000 | 1.768 | 4.291 | 0.006 | 0.000 | 0.472 | 1.082 | 1.722 | 0.050 | n/a | 0.250 | 7.978 | n/a | n/a | 0.062 | 6.169 | 0.303 | 0.062 |
| p99 | 62.583 | 2.117 | 0.007 | 2.484 | 9.102 | 0.015 | 0.000 | 4.739 | 3.336 | 5.122 | 0.559 | n/a | 3.476 | 53.525 | n/a | n/a | 0.077 | 9.312 | 0.499 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d40000000000000134 | 62.583 | 5.990 | 0.009 | 0.000 | 0.170 | 0.851 | 1.737 | 0.050 | n/a | 0.182 | 53.525 | n/a | n/a | 0.069 | 6.169 | 0.099 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000149 | 30.047 | 5.471 | 0.010 | 0.000 | 1.110 | 1.740 | 3.172 | 0.559 | n/a | 0.627 | 17.296 | n/a | n/a | 0.062 | 6.591 | 0.219 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000138 | 29.454 | 9.102 | 0.006 | 0.000 | 0.204 | 3.336 | 5.122 | 0.072 | n/a | 3.476 | 8.068 | n/a | n/a | 0.068 | 9.312 | 0.316 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000154 | 20.533 | 5.158 | 0.015 | 0.000 | 1.058 | 1.399 | 1.660 | 0.046 | n/a | 3.142 | 7.978 | n/a | n/a | 0.077 | 6.231 | 0.303 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000015e | 18.526 | 4.291 | 0.005 | 0.000 | 0.769 | 1.082 | 1.474 | 0.049 | n/a | 0.100 | 10.697 | n/a | n/a | 0.060 | 5.065 | 0.273 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000179 | 17.604 | 4.039 | 0.005 | 0.000 | 4.739 | 0.914 | 1.722 | 0.069 | n/a | 0.250 | 5.811 | n/a | n/a | 0.056 | 8.783 | 0.499 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.594ms; driver.publication 1.086ms |
| 94ea9f68e99879d40000000000000170 | 13.262 | 3.963 | 0.008 | 0.000 | 0.472 | 1.166 | 2.256 | 0.080 | n/a | 0.928 | 4.323 | n/a | n/a | 0.066 | 4.444 | 0.335 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000162 | 9.091 | 3.075 | 0.005 | 0.000 | 0.430 | 0.658 | 1.096 | 0.038 | n/a | 0.082 | 3.671 | n/a | n/a | 0.036 | 3.510 | 0.386 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.030 | 0.609 | 0.000 | 1.347 | 5.735 | 0.181 | 0.000 | 0.137 | 1.513 | 5.732 | 0.063 | n/a | 0.404 | 12.638 | n/a | n/a | 0.065 | 6.494 | 0.225 | 0.065 |
| p99 | 53.415 | 4.500 | 0.004 | 5.487 | 9.056 | 1.259 | 0.888 | 1.226 | 5.223 | 27.922 | 1.187 | n/a | 4.287 | 23.059 | n/a | n/a | 0.126 | 10.185 | 0.430 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d40000000000000187 | 53.415 | 5.969 | 0.294 | 0.000 | 0.059 | 1.614 | 26.801 | 0.052 | n/a | 0.411 | 18.125 | n/a | n/a | 0.090 | 6.322 | 0.118 | 0.090 | gw-w/thread-46/gateway.admitted-work | none observed |
| 94ea9f68e99879d40000000000000192 | 49.913 | 4.533 | 0.268 | 0.323 | 0.045 | 1.513 | 27.922 | 0.241 | n/a | 0.123 | 14.862 | n/a | n/a | 0.083 | 5.169 | 0.104 | 0.083 | gw-w/thread-50/gateway.admitted-work | none observed |
| 94ea9f68e99879d400000000000001c2 | 49.359 | 3.792 | 0.276 | 0.238 | 0.056 | 5.223 | 17.258 | 0.139 | n/a | 2.324 | 20.007 | n/a | n/a | 0.046 | 4.362 | 0.088 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001a0 | 45.471 | 8.805 | 0.371 | 0.888 | 0.121 | 2.642 | 14.262 | 0.065 | n/a | 0.159 | 18.055 | n/a | n/a | 0.102 | 10.185 | 0.224 | 0.102 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000019a | 44.782 | 4.342 | 0.328 | 0.259 | 0.137 | 3.518 | 16.775 | 0.054 | n/a | 0.113 | 19.176 | n/a | n/a | 0.082 | 5.066 | 0.113 | 0.082 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000018a | 44.771 | 4.275 | 0.250 | 0.000 | 0.164 | 1.186 | 17.456 | 0.063 | n/a | 0.108 | 21.193 | n/a | n/a | 0.078 | 4.688 | 0.105 | 0.078 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001a8 | 43.964 | 6.872 | 0.242 | 0.631 | 0.063 | 1.823 | 19.902 | 0.125 | n/a | 0.233 | 14.006 | n/a | n/a | 0.068 | 7.808 | 0.178 | 0.068 | gw-w/thread-45/gateway.admitted-work | none observed |
| 94ea9f68e99879d40000000000000183 | 43.006 | 4.501 | 0.299 | 0.000 | 0.061 | 2.043 | 15.107 | 0.109 | n/a | 3.921 | 16.907 | n/a | n/a | 0.058 | 4.861 | 0.113 | 0.058 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000019e | 42.959 | 6.115 | 0.426 | 0.288 | 0.105 | 1.886 | 14.299 | 0.061 | n/a | 0.130 | 19.552 | n/a | n/a | 0.098 | 6.934 | 0.161 | 0.098 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001c3 | 41.076 | 7.284 | 0.250 | 0.472 | 0.055 | 2.071 | 8.902 | 0.050 | n/a | 0.439 | 21.483 | n/a | n/a | 0.071 | 8.061 | 0.196 | 0.071 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000194 | 39.315 | 6.748 | 0.626 | 0.461 | 0.191 | 2.713 | 9.859 | 0.086 | n/a | 0.382 | 18.141 | n/a | n/a | 0.108 | 8.026 | 0.204 | 0.108 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001a6 | 38.692 | 7.007 | 0.346 | 0.248 | 0.087 | 1.694 | 5.911 | 0.102 | n/a | 0.149 | 23.059 | n/a | n/a | 0.089 | 7.689 | 0.199 | 0.089 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001b8 | 37.719 | 4.529 | 1.259 | 0.356 | 0.067 | 2.007 | 10.027 | 0.086 | n/a | 0.201 | 19.134 | n/a | n/a | 0.054 | 6.211 | 0.165 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001a4 | 37.339 | 6.810 | 0.300 | 0.244 | 0.052 | 1.365 | 8.811 | 0.050 | n/a | 0.123 | 19.458 | n/a | n/a | 0.126 | 7.407 | 0.198 | 0.126 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001ac | 36.815 | 5.735 | 0.328 | 0.371 | 0.060 | 3.118 | 15.508 | 0.139 | n/a | 0.368 | 11.107 | n/a | n/a | 0.081 | 6.494 | 0.176 | 0.081 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001b6 | 33.801 | 4.120 | 0.246 | 0.248 | 0.087 | 1.614 | 9.388 | 0.079 | n/a | 0.223 | 17.737 | n/a | n/a | 0.061 | 4.700 | 0.139 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001c8 | 33.556 | 5.919 | 0.345 | 0.455 | 0.138 | 2.761 | 5.732 | 0.079 | n/a | 0.475 | 17.534 | n/a | n/a | 0.117 | 6.858 | 0.204 | 0.117 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.787ms |
| 94ea9f68e99879d4000000000000018b | 31.610 | 8.588 | 0.011 | 0.000 | 0.572 | 1.391 | 3.887 | 0.033 | n/a | 0.415 | 16.664 | n/a | n/a | 0.048 | 9.171 | 0.290 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001c7 | 29.876 | 4.573 | 0.008 | 0.000 | 1.095 | 1.314 | 1.531 | 0.064 | n/a | 0.621 | 20.610 | n/a | n/a | 0.059 | 5.677 | 0.190 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001cd | 28.030 | 5.438 | 0.386 | 0.358 | 0.117 | 2.208 | 8.750 | 0.057 | n/a | 0.635 | 9.987 | n/a | n/a | 0.094 | 6.300 | 0.225 | 0.094 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.817 | 1.167 | 0.000 | 1.951 | 4.631 | 0.008 | 0.000 | 0.937 | 1.073 | 1.443 | 0.043 | n/a | 0.401 | 6.872 | n/a | n/a | 0.059 | 5.579 | 0.305 | 0.059 |
| p99 | 29.876 | 4.500 | 0.004 | 5.487 | 8.669 | 0.015 | 0.000 | 1.095 | 1.314 | 4.254 | 1.187 | n/a | 4.287 | 20.610 | n/a | n/a | 0.108 | 9.719 | 0.430 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d400000000000001c7 | 29.876 | 4.573 | 0.008 | 0.000 | 1.095 | 1.314 | 1.531 | 0.064 | n/a | 0.621 | 20.610 | n/a | n/a | 0.059 | 5.677 | 0.190 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000184 | 24.894 | 8.669 | 0.010 | 0.000 | 1.041 | 1.198 | 1.238 | 0.037 | n/a | 4.287 | 8.307 | n/a | n/a | 0.108 | 9.719 | 0.390 | 0.108 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000197 | 23.814 | 5.590 | 0.006 | 0.000 | 1.037 | 1.266 | 1.984 | 0.072 | n/a | 1.039 | 12.781 | n/a | n/a | 0.039 | 6.633 | 0.279 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000180 | 19.996 | 4.970 | 0.015 | 0.000 | 0.184 | 1.163 | 1.573 | 1.187 | n/a | 0.150 | 10.709 | n/a | n/a | 0.046 | 5.169 | 0.258 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000018f | 18.302 | 4.631 | 0.011 | 0.000 | 0.937 | 0.849 | 1.443 | 0.034 | n/a | 0.412 | 9.932 | n/a | n/a | 0.053 | 5.579 | 0.305 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001a9 | 15.817 | 6.087 | 0.011 | 0.000 | 0.582 | 1.198 | 1.150 | 0.041 | n/a | 0.401 | 6.262 | n/a | n/a | 0.085 | 6.680 | 0.422 | 0.085 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001b3 | 15.038 | 5.417 | 0.012 | 0.000 | 1.041 | 0.815 | 1.135 | 0.037 | n/a | 0.107 | 6.396 | n/a | n/a | 0.079 | 6.470 | 0.430 | 0.079 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001cb | 14.497 | 3.544 | 0.005 | 0.000 | 0.127 | 0.750 | 4.254 | 0.043 | n/a | 0.080 | 5.623 | n/a | n/a | 0.070 | 3.676 | 0.254 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000195 | 14.282 | 4.114 | 0.007 | 0.000 | 0.630 | 1.073 | 1.333 | 0.050 | n/a | 0.129 | 6.872 | n/a | n/a | 0.074 | 4.751 | 0.333 | 0.074 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001bf | 13.383 | 3.174 | 0.007 | 0.000 | 0.966 | 0.927 | 1.990 | 0.083 | n/a | 1.020 | 5.167 | n/a | n/a | 0.050 | 4.146 | 0.310 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.648 | 0.563 | 0.000 | 1.444 | 4.215 | 0.017 | 0.000 | 0.213 | 1.473 | 6.011 | 0.066 | n/a | 0.349 | 14.123 | n/a | n/a | 0.060 | 4.859 | 0.196 | 0.060 |
| p99 | 128.228 | 3.785 | 0.009 | 5.093 | 13.471 | 0.474 | 1.654 | 1.199 | 6.084 | 39.119 | 0.420 | n/a | 4.473 | 121.288 | n/a | n/a | 0.137 | 15.550 | 0.364 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d400000000000001d1 | 128.228 | 3.708 | 0.006 | 0.000 | 0.712 | 0.897 | 1.409 | 0.034 | n/a | 0.116 | 121.288 | n/a | n/a | 0.058 | 4.425 | 0.035 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001d3 | 64.919 | 4.274 | 0.188 | 0.337 | 0.059 | 5.497 | 39.119 | 0.076 | n/a | 1.438 | 13.880 | n/a | n/a | 0.051 | 4.859 | 0.075 | 0.051 | gw-w/thread-48/gateway.admitted-work | none observed |
| 94ea9f68e99879d40000000000000208 | 48.540 | 6.677 | 0.213 | 0.558 | 0.053 | 2.355 | 17.715 | 0.086 | n/a | 0.244 | 20.593 | n/a | n/a | 0.047 | 7.500 | 0.155 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001fa | 45.999 | 4.634 | 0.474 | 0.000 | 0.058 | 2.357 | 15.738 | 0.105 | n/a | 1.063 | 21.496 | n/a | n/a | 0.073 | 5.166 | 0.112 | 0.073 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001fc | 44.395 | 3.831 | 0.287 | 0.000 | 0.047 | 1.424 | 23.025 | 0.052 | n/a | 0.349 | 15.316 | n/a | n/a | 0.064 | 4.165 | 0.094 | 0.064 | gw-w/thread-45/gateway.admitted-work | none observed |
| 94ea9f68e99879d400000000000001f2 | 42.693 | 13.471 | 0.013 | 1.654 | 0.412 | 2.605 | 13.357 | 0.102 | n/a | 0.726 | 10.289 | n/a | n/a | 0.063 | 15.550 | 0.364 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000212 | 41.827 | 5.857 | 0.237 | 0.000 | 0.311 | 5.423 | 7.104 | 0.043 | n/a | 0.101 | 22.618 | n/a | n/a | 0.134 | 6.404 | 0.153 | 0.134 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001dc | 41.708 | 4.040 | 0.190 | 0.247 | 0.063 | 2.499 | 8.254 | 0.063 | n/a | 0.143 | 26.138 | n/a | n/a | 0.071 | 4.540 | 0.109 | 0.071 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001d6 | 41.067 | 11.476 | 0.017 | 0.000 | 0.789 | 3.819 | 6.011 | 0.031 | n/a | 1.843 | 16.945 | n/a | n/a | 0.137 | 12.281 | 0.299 | 0.137 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.871ms |
| 94ea9f68e99879d40000000000000218 | 40.516 | 3.966 | 0.210 | 0.000 | 0.060 | 2.071 | 10.469 | 0.064 | n/a | 0.096 | 23.505 | n/a | n/a | 0.073 | 4.237 | 0.105 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001f0 | 40.338 | 8.187 | 0.222 | 0.347 | 0.081 | 2.446 | 9.366 | 0.135 | n/a | 0.600 | 18.897 | n/a | n/a | 0.059 | 8.836 | 0.219 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001d9 | 38.744 | 3.981 | 0.280 | 0.375 | 0.064 | 1.730 | 10.090 | 0.139 | n/a | 1.607 | 20.423 | n/a | n/a | 0.055 | 4.700 | 0.121 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000021a | 37.878 | 5.311 | 0.292 | 0.000 | 0.058 | 6.084 | 19.339 | 0.144 | n/a | 0.423 | 6.175 | n/a | n/a | 0.052 | 5.661 | 0.149 | 0.052 | gw-w/thread-48/gateway.admitted-work | none observed |
| 94ea9f68e99879d400000000000001e0 | 37.647 | 5.390 | 0.197 | 0.383 | 0.063 | 1.596 | 15.326 | 0.059 | n/a | 0.942 | 13.638 | n/a | n/a | 0.052 | 6.033 | 0.160 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000020c | 36.967 | 4.179 | 0.267 | 0.226 | 0.069 | 1.474 | 11.358 | 0.119 | n/a | 0.146 | 19.058 | n/a | n/a | 0.069 | 4.742 | 0.128 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000204 | 35.050 | 8.881 | 0.330 | 0.733 | 0.049 | 2.388 | 8.412 | 0.081 | n/a | 0.209 | 13.902 | n/a | n/a | 0.065 | 9.993 | 0.285 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001f6 | 32.317 | 4.215 | 0.251 | 0.000 | 0.068 | 4.505 | 10.324 | 0.188 | n/a | 0.321 | 12.368 | n/a | n/a | 0.077 | 4.534 | 0.140 | 0.077 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000220 | 32.245 | 4.844 | 0.362 | 0.000 | 0.084 | 1.771 | 9.563 | 0.103 | n/a | 0.319 | 15.065 | n/a | n/a | 0.134 | 5.291 | 0.164 | 0.134 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001ec | 30.347 | 6.188 | 0.008 | 0.000 | 0.328 | 0.988 | 1.292 | 0.045 | n/a | 0.417 | 20.991 | n/a | n/a | 0.091 | 6.524 | 0.215 | 0.091 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000020a | 27.672 | 4.209 | 0.010 | 0.000 | 0.760 | 0.834 | 1.260 | 0.033 | n/a | 0.153 | 20.355 | n/a | n/a | 0.058 | 4.979 | 0.180 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.841 | 0.878 | 0.000 | 1.712 | 4.012 | 0.006 | 0.000 | 0.632 | 0.944 | 1.855 | 0.048 | n/a | 0.320 | 14.123 | n/a | n/a | 0.056 | 4.467 | 0.215 | 0.056 |
| p99 | 128.228 | 2.368 | 0.000 | 3.578 | 6.188 | 0.014 | 0.000 | 0.875 | 2.013 | 8.838 | 0.139 | n/a | 4.473 | 121.288 | n/a | n/a | 0.091 | 6.698 | 0.359 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d400000000000001d1 | 128.228 | 3.708 | 0.006 | 0.000 | 0.712 | 0.897 | 1.409 | 0.034 | n/a | 0.116 | 121.288 | n/a | n/a | 0.058 | 4.425 | 0.035 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001ec | 30.347 | 6.188 | 0.008 | 0.000 | 0.328 | 0.988 | 1.292 | 0.045 | n/a | 0.417 | 20.991 | n/a | n/a | 0.091 | 6.524 | 0.215 | 0.091 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000020a | 27.672 | 4.209 | 0.010 | 0.000 | 0.760 | 0.834 | 1.260 | 0.033 | n/a | 0.153 | 20.355 | n/a | n/a | 0.058 | 4.979 | 0.180 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000206 | 26.705 | 4.468 | 0.007 | 0.000 | 0.645 | 1.297 | 1.855 | 0.087 | n/a | 0.449 | 17.840 | n/a | n/a | 0.056 | 5.120 | 0.192 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001d5 | 26.004 | 6.091 | 0.014 | 0.000 | 0.594 | 2.013 | 1.875 | 0.048 | n/a | 1.079 | 14.206 | n/a | n/a | 0.085 | 6.698 | 0.258 | 0.085 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001e8 | 23.962 | 4.815 | 0.006 | 0.000 | 0.682 | 1.122 | 1.934 | 0.064 | n/a | 0.224 | 15.057 | n/a | n/a | 0.060 | 5.502 | 0.230 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001de | 23.408 | 4.039 | 0.005 | 0.000 | 0.172 | 0.944 | 8.838 | 0.094 | n/a | 0.211 | 9.043 | n/a | n/a | 0.062 | 4.216 | 0.180 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000200 | 20.841 | 3.704 | 0.008 | 0.000 | 0.875 | 1.260 | 2.279 | 0.139 | n/a | 0.411 | 12.113 | n/a | n/a | 0.052 | 4.587 | 0.220 | 0.052 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000214 | 20.797 | 3.163 | 0.006 | 0.000 | 0.213 | 0.848 | 1.115 | 0.037 | n/a | 0.427 | 14.947 | n/a | n/a | 0.041 | 3.381 | 0.163 | 0.041 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001e4 | 20.633 | 3.579 | 0.006 | 0.000 | 0.461 | 0.906 | 1.311 | 0.044 | n/a | 0.156 | 14.123 | n/a | n/a | 0.045 | 4.046 | 0.196 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000020e | 20.274 | 3.088 | 0.006 | 0.000 | 0.745 | 1.414 | 2.127 | 0.073 | n/a | 4.473 | 8.299 | n/a | n/a | 0.048 | 3.839 | 0.189 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001f8 | 19.063 | 4.012 | 0.006 | 0.000 | 0.703 | 0.708 | 1.134 | 0.037 | n/a | 0.079 | 12.336 | n/a | n/a | 0.048 | 4.720 | 0.248 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001cf | 14.320 | 2.917 | 0.006 | 0.000 | 0.632 | 0.906 | 1.852 | 0.077 | n/a | 0.766 | 7.115 | n/a | n/a | 0.050 | 3.554 | 0.248 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000021e | 12.458 | 4.096 | 0.010 | 0.000 | 0.361 | 0.716 | 1.996 | 0.034 | n/a | 0.320 | 4.868 | n/a | n/a | 0.056 | 4.467 | 0.359 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000001ea | 11.711 | 2.882 | 0.006 | 0.000 | 0.249 | 0.996 | 1.942 | 0.066 | n/a | 0.185 | 5.308 | n/a | n/a | 0.077 | 3.137 | 0.268 | 0.077 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.677 | 0.789 | 0.000 | 1.637 | 4.442 | 0.010 | 0.000 | 0.240 | 1.281 | 3.420 | 0.042 | n/a | 0.363 | 9.149 | n/a | n/a | 0.054 | 5.058 | 0.237 | 0.054 |
| p99 | 116.584 | 2.905 | 0.012 | 8.892 | 13.095 | 0.667 | 0.344 | 1.116 | 5.884 | 95.808 | 0.235 | n/a | 3.844 | 42.238 | n/a | n/a | 0.137 | 13.895 | 0.426 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d40000000000000232 | 116.584 | 4.398 | 0.006 | 0.000 | 1.116 | 0.725 | 95.808 | 0.056 | n/a | 0.061 | 14.375 | n/a | n/a | 0.040 | 5.520 | 0.047 | 0.040 | gw-w/thread-50/commit.prepare-and-validate | none observed |
| 94ea9f68e99879d4000000000000022d | 55.613 | 5.461 | 0.326 | 0.000 | 0.074 | 1.609 | 5.343 | 0.035 | n/a | 0.390 | 42.238 | n/a | n/a | 0.137 | 5.861 | 0.105 | 0.137 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000027b | 54.974 | 5.024 | 0.006 | 0.000 | 0.452 | 1.683 | 26.344 | 0.089 | n/a | 0.186 | 21.151 | n/a | n/a | 0.040 | 5.482 | 0.100 | 0.040 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 94ea9f68e99879d40000000000000234 | 43.876 | 5.302 | 0.667 | 0.000 | 0.221 | 2.718 | 18.922 | 0.073 | n/a | 0.431 | 15.444 | n/a | n/a | 0.097 | 6.191 | 0.141 | 0.097 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000223 | 40.616 | 3.545 | 0.186 | 0.000 | 0.046 | 1.591 | 17.626 | 0.069 | n/a | 3.359 | 14.150 | n/a | n/a | 0.044 | 3.777 | 0.093 | 0.044 | gw-w/thread-47/gateway.admitted-work | none observed |
| 94ea9f68e99879d40000000000000242 | 39.744 | 4.290 | 0.212 | 0.000 | 0.013 | 1.729 | 10.700 | 0.068 | n/a | 0.728 | 21.970 | n/a | n/a | 0.033 | 4.515 | 0.114 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000286 | 38.488 | 5.486 | 0.395 | 0.000 | 0.048 | 1.702 | 17.278 | 0.035 | n/a | 0.120 | 13.363 | n/a | n/a | 0.061 | 5.929 | 0.154 | 0.061 | gw-w/thread-43/gateway.admitted-work | none observed |
| 94ea9f68e99879d4000000000000023a | 38.340 | 13.095 | 0.009 | 0.000 | 0.790 | 2.292 | 4.126 | 0.124 | n/a | 0.503 | 17.339 | n/a | n/a | 0.062 | 13.895 | 0.362 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000024b | 38.154 | 3.204 | 0.005 | 0.000 | 0.563 | 1.342 | 1.491 | 0.027 | n/a | 0.063 | 31.417 | n/a | n/a | 0.041 | 3.772 | 0.099 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.038ms |
| 94ea9f68e99879d40000000000000262 | 37.885 | 3.600 | 0.237 | 0.000 | 0.135 | 1.241 | 10.922 | 0.032 | n/a | 3.844 | 17.762 | n/a | n/a | 0.112 | 3.972 | 0.105 | 0.112 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000023e | 35.722 | 8.916 | 0.007 | 0.000 | 0.804 | 1.399 | 3.137 | 0.078 | n/a | 3.596 | 17.734 | n/a | n/a | 0.051 | 9.727 | 0.272 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000246 | 33.103 | 3.416 | 0.188 | 0.000 | 0.054 | 1.326 | 6.860 | 0.054 | n/a | 0.652 | 20.505 | n/a | n/a | 0.050 | 3.658 | 0.110 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000244 | 31.584 | 3.219 | 0.191 | 0.000 | 0.055 | 1.795 | 12.968 | 0.060 | n/a | 0.111 | 13.138 | n/a | n/a | 0.047 | 3.465 | 0.110 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000024a | 30.925 | 6.354 | 0.010 | 0.000 | 0.318 | 1.024 | 1.731 | 0.036 | n/a | 0.097 | 21.290 | n/a | n/a | 0.064 | 6.683 | 0.216 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000263 | 30.417 | 4.260 | 0.005 | 0.000 | 0.600 | 0.460 | 0.908 | 0.018 | n/a | 0.045 | 24.072 | n/a | n/a | 0.049 | 4.865 | 0.160 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000025c | 29.454 | 7.184 | 0.006 | 0.000 | 0.861 | 1.126 | 1.933 | 0.034 | n/a | 0.161 | 18.054 | n/a | n/a | 0.094 | 8.052 | 0.273 | 0.094 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000027a | 28.347 | 3.272 | 0.182 | 0.000 | 0.056 | 4.563 | 8.725 | 0.077 | n/a | 0.126 | 11.257 | n/a | n/a | 0.088 | 3.511 | 0.124 | 0.088 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000238 | 26.710 | 4.237 | 0.356 | 0.000 | 0.047 | 1.732 | 10.002 | 0.084 | n/a | 0.723 | 9.451 | n/a | n/a | 0.077 | 4.640 | 0.174 | 0.077 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000280 | 26.133 | 3.291 | 0.171 | 0.000 | 0.045 | 1.179 | 12.172 | 0.050 | n/a | 0.523 | 8.658 | n/a | n/a | 0.043 | 3.507 | 0.134 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000026b | 25.930 | 4.696 | 0.006 | 0.000 | 1.026 | 5.884 | 10.986 | 0.096 | n/a | 0.591 | 2.599 | n/a | n/a | 0.045 | 5.728 | 0.221 | 0.045 | node-13/thread-0/socket.wait-first-byte | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.025 | 0.925 | 0.000 | 1.734 | 4.507 | 0.006 | 0.000 | 0.570 | 0.916 | 1.491 | 0.039 | n/a | 0.363 | 5.302 | n/a | n/a | 0.054 | 4.999 | 0.318 | 0.054 |
| p99 | 38.154 | 2.591 | 0.005 | 3.652 | 6.469 | 0.013 | 0.000 | 1.026 | 5.884 | 10.986 | 0.235 | n/a | 1.467 | 31.417 | n/a | n/a | 0.094 | 7.210 | 0.426 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d4000000000000024b | 38.154 | 3.204 | 0.005 | 0.000 | 0.563 | 1.342 | 1.491 | 0.027 | n/a | 0.063 | 31.417 | n/a | n/a | 0.041 | 3.772 | 0.099 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.038ms |
| 94ea9f68e99879d4000000000000026b | 25.930 | 4.696 | 0.006 | 0.000 | 1.026 | 5.884 | 10.986 | 0.096 | n/a | 0.591 | 2.599 | n/a | n/a | 0.045 | 5.728 | 0.221 | 0.045 | node-13/thread-0/socket.wait-first-byte | none observed |
| 94ea9f68e99879d40000000000000230 | 25.466 | 4.507 | 0.010 | 0.000 | 0.638 | 0.761 | 1.117 | 0.031 | n/a | 0.140 | 18.203 | n/a | n/a | 0.059 | 5.155 | 0.202 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000270 | 21.935 | 5.697 | 0.007 | 0.000 | 0.570 | 0.916 | 1.202 | 0.037 | n/a | 0.133 | 13.320 | n/a | n/a | 0.054 | 6.274 | 0.286 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000022b | 19.816 | 4.828 | 0.005 | 0.000 | 0.166 | 2.529 | 1.177 | 0.031 | n/a | 0.369 | 10.635 | n/a | n/a | 0.076 | 4.999 | 0.252 | 0.076 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000222 | 19.799 | 6.160 | 0.010 | 0.000 | 0.920 | 2.339 | 6.817 | 0.235 | n/a | 0.213 | 3.040 | n/a | n/a | 0.065 | 7.090 | 0.358 | 0.065 | node-13/thread-0/driver.execute | none observed |
| 94ea9f68e99879d4000000000000025e | 19.295 | 6.469 | 0.007 | 0.000 | 0.734 | 3.811 | 2.294 | 0.115 | n/a | 0.483 | 5.302 | n/a | n/a | 0.079 | 7.210 | 0.374 | 0.079 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000240 | 17.101 | 5.042 | 0.006 | 0.000 | 0.133 | 0.696 | 1.613 | 0.032 | n/a | 0.434 | 9.102 | n/a | n/a | 0.044 | 5.180 | 0.303 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000236 | 17.025 | 3.176 | 0.007 | 0.000 | 0.231 | 0.892 | 2.018 | 0.034 | n/a | 1.467 | 9.149 | n/a | n/a | 0.052 | 3.413 | 0.200 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000227 | 16.878 | 5.948 | 0.013 | 0.000 | 0.441 | 1.229 | 1.112 | 0.033 | n/a | 0.438 | 7.596 | n/a | n/a | 0.067 | 6.402 | 0.379 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000282 | 16.441 | 5.425 | 0.012 | 0.000 | 0.220 | 1.125 | 1.808 | 0.040 | n/a | 0.108 | 7.608 | n/a | n/a | 0.094 | 5.657 | 0.344 | 0.094 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000284 | 13.727 | 3.299 | 0.006 | 0.000 | 0.920 | 0.732 | 3.420 | 0.039 | n/a | 0.139 | 5.126 | n/a | n/a | 0.044 | 4.226 | 0.308 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000254 | 12.385 | 3.296 | 0.007 | 0.000 | 0.717 | 1.058 | 1.412 | 0.057 | n/a | 0.630 | 5.161 | n/a | n/a | 0.046 | 4.020 | 0.325 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000027e | 11.162 | 3.302 | 0.006 | 0.000 | 0.240 | 0.896 | 1.564 | 0.040 | n/a | 0.609 | 4.457 | n/a | n/a | 0.049 | 3.547 | 0.318 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000260 | 11.058 | 3.995 | 0.005 | 0.000 | 0.711 | 0.872 | 0.987 | 0.045 | n/a | 0.089 | 4.311 | n/a | n/a | 0.042 | 4.711 | 0.426 | 0.042 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000278 | 10.885 | 2.904 | 0.006 | 0.000 | 0.564 | 0.853 | 1.430 | 0.041 | n/a | 0.112 | 4.919 | n/a | n/a | 0.056 | 3.474 | 0.319 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000266 | 10.113 | 3.420 | 0.005 | 0.000 | 0.781 | 0.821 | 0.949 | 0.029 | n/a | 0.363 | 3.664 | n/a | n/a | 0.081 | 4.206 | 0.416 | 0.081 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.853 | 0.501 | 0.000 | 1.151 | 4.108 | 0.013 | 0.000 | 0.124 | 1.102 | 3.858 | 0.042 | n/a | 0.168 | 8.588 | n/a | n/a | 0.057 | 4.740 | 0.242 | 0.057 |
| p99 | 93.057 | 3.058 | 0.030 | 3.935 | 11.195 | n/a | 0.000 | 1.091 | 4.056 | 57.954 | 0.092 | n/a | 3.561 | 70.701 | n/a | n/a | 0.267 | 11.329 | 0.457 | 0.267 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d40000000000000295 | 93.057 | 3.639 | 2.633 | 0.000 | 0.071 | 2.063 | 13.375 | 0.053 | n/a | 0.453 | 70.701 | n/a | n/a | 0.068 | 6.343 | 0.068 | 0.068 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.947ms |
| 94ea9f68e99879d400000000000002bb | 82.875 | 10.704 | 0.280 | 0.000 | 0.102 | 4.056 | 57.954 | 0.045 | n/a | 0.431 | 9.198 | n/a | n/a | 0.104 | 11.086 | 0.134 | 0.104 | gw-w/thread-43/gateway.admitted-work | none observed |
| 94ea9f68e99879d400000000000002ab | 39.199 | 5.958 | 0.310 | 0.000 | 0.366 | 2.527 | 14.836 | 0.092 | n/a | 0.205 | 14.693 | n/a | n/a | 0.213 | 6.634 | 0.169 | 0.213 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000029b | 36.407 | 6.480 | 0.382 | 0.000 | 0.183 | 1.398 | 10.617 | 0.044 | n/a | 0.434 | 16.772 | n/a | n/a | 0.097 | 7.045 | 0.193 | 0.097 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002a7 | 31.488 | 5.524 | 0.322 | 0.000 | 0.075 | 1.931 | 8.027 | 0.042 | n/a | 0.128 | 15.172 | n/a | n/a | 0.267 | 5.921 | 0.188 | 0.267 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002b7 | 30.815 | 5.317 | 0.272 | 0.000 | 0.068 | 2.030 | 6.317 | 0.046 | n/a | 0.105 | 16.590 | n/a | n/a | 0.069 | 5.658 | 0.184 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002b5 | 28.458 | 3.550 | 0.316 | 0.000 | 0.124 | 1.061 | 5.505 | 0.042 | n/a | 0.123 | 17.652 | n/a | n/a | 0.085 | 3.989 | 0.140 | 0.085 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002ac | 28.329 | 11.195 | 0.013 | 0.000 | 0.121 | 1.347 | 2.348 | 0.070 | n/a | 0.153 | 12.967 | n/a | n/a | 0.116 | 11.329 | 0.400 | 0.116 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000293 | 27.149 | 5.641 | 0.006 | 0.000 | 0.914 | 1.332 | 4.906 | 0.070 | n/a | 3.524 | 10.716 | n/a | n/a | 0.041 | 6.561 | 0.242 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002cd | 26.436 | 3.861 | 0.241 | 0.000 | 0.122 | 2.153 | 8.179 | 0.071 | n/a | 3.561 | 8.173 | n/a | n/a | 0.074 | 4.225 | 0.160 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000029d | 26.358 | 5.396 | 0.448 | 0.000 | 0.062 | 2.561 | 9.070 | 0.066 | n/a | 0.105 | 8.588 | n/a | n/a | 0.063 | 5.906 | 0.224 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002da | 26.296 | 3.320 | 0.233 | 0.000 | 0.049 | 1.269 | 9.121 | 0.038 | n/a | 0.397 | 11.822 | n/a | n/a | 0.048 | 3.602 | 0.137 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002d8 | 25.792 | 3.145 | 0.184 | 0.000 | 0.063 | 1.038 | 8.406 | 0.059 | n/a | 0.762 | 12.086 | n/a | n/a | 0.048 | 3.392 | 0.132 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002af | 22.866 | 4.635 | 0.366 | 0.000 | 0.111 | 1.400 | 5.368 | 0.037 | n/a | 0.082 | 10.769 | n/a | n/a | 0.099 | 5.112 | 0.224 | 0.099 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000296 | 22.081 | 4.637 | 0.006 | 0.000 | 0.921 | 0.607 | 0.842 | 0.040 | n/a | 0.416 | 14.542 | n/a | n/a | 0.070 | 5.563 | 0.252 | 0.070 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000028e | 22.041 | 8.003 | 0.273 | 0.000 | 0.049 | 1.769 | 3.980 | 0.051 | n/a | 0.102 | 7.767 | n/a | n/a | 0.047 | 8.325 | 0.378 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002c1 | 21.696 | 3.170 | 0.262 | 0.000 | 0.037 | 1.286 | 8.332 | 0.036 | n/a | 0.096 | 8.440 | n/a | n/a | 0.038 | 3.470 | 0.160 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002d4 | 21.625 | 2.904 | 0.183 | 0.000 | 0.056 | 1.102 | 7.343 | 0.045 | n/a | 0.468 | 9.479 | n/a | n/a | 0.046 | 3.143 | 0.145 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002c3 | 21.177 | 4.108 | 0.283 | 0.000 | 0.061 | 1.700 | 6.129 | 0.042 | n/a | 0.115 | 8.693 | n/a | n/a | 0.047 | 4.452 | 0.210 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000028a | 20.952 | 3.635 | 0.253 | 0.000 | 0.053 | 1.402 | 7.450 | 0.085 | n/a | 0.111 | 7.905 | n/a | n/a | 0.058 | 3.941 | 0.188 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.154 | 0.894 | 0.000 | 1.720 | 3.595 | 0.006 | 0.000 | 0.774 | 0.751 | 1.433 | 0.038 | n/a | 0.303 | 6.663 | n/a | n/a | 0.046 | 4.475 | 0.268 | 0.046 |
| p99 | 22.081 | 1.211 | 0.000 | 3.935 | 5.628 | n/a | 0.000 | 1.091 | 3.696 | 5.260 | 0.070 | n/a | 0.842 | 14.542 | n/a | n/a | 0.088 | 5.896 | 0.433 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d40000000000000296 | 22.081 | 4.637 | 0.006 | 0.000 | 0.921 | 0.607 | 0.842 | 0.040 | n/a | 0.416 | 14.542 | n/a | n/a | 0.070 | 5.563 | 0.252 | 0.070 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002a9 | 20.926 | 3.873 | 0.006 | 0.000 | 0.717 | 1.077 | 1.953 | 0.070 | n/a | 0.842 | 12.344 | n/a | n/a | 0.045 | 4.596 | 0.220 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002c8 | 17.801 | 2.806 | 0.005 | 0.000 | 1.023 | 0.570 | 5.260 | 0.030 | n/a | 0.104 | 7.971 | n/a | n/a | 0.032 | 3.834 | 0.215 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002bf | 16.428 | 4.020 | 0.011 | 0.000 | 0.956 | 1.064 | 1.215 | 0.043 | n/a | 0.405 | 8.654 | n/a | n/a | 0.060 | 4.988 | 0.304 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002cb | 16.347 | 3.595 | 0.005 | 0.000 | 0.774 | 0.728 | 3.858 | 0.050 | n/a | 0.131 | 7.164 | n/a | n/a | 0.041 | 4.375 | 0.268 | 0.041 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002a5 | 16.291 | 3.130 | 0.006 | 0.000 | 0.207 | 0.688 | 5.086 | 0.038 | n/a | 0.446 | 6.646 | n/a | n/a | 0.046 | 3.342 | 0.205 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002b9 | 15.517 | 4.658 | 0.013 | 0.000 | 0.826 | 0.802 | 1.562 | 0.040 | n/a | 0.180 | 7.346 | n/a | n/a | 0.088 | 5.498 | 0.354 | 0.088 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002bd | 15.154 | 4.868 | 0.010 | 0.000 | 0.848 | 1.067 | 1.300 | 0.041 | n/a | 0.585 | 6.367 | n/a | n/a | 0.068 | 5.726 | 0.378 | 0.068 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000288 | 13.936 | 3.414 | 0.005 | 0.000 | 1.091 | 0.794 | 0.978 | 0.032 | n/a | 0.160 | 7.420 | n/a | n/a | 0.042 | 4.510 | 0.324 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d4000000000000029f | 13.611 | 5.628 | 0.006 | 0.000 | 0.263 | 0.751 | 1.065 | 0.030 | n/a | 0.799 | 5.027 | n/a | n/a | 0.043 | 5.896 | 0.433 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002b1 | 12.411 | 3.623 | 0.006 | 0.000 | 0.484 | 0.693 | 1.433 | 0.031 | n/a | 0.117 | 5.960 | n/a | n/a | 0.065 | 4.113 | 0.331 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002c4 | 11.844 | 2.953 | 0.005 | 0.000 | 0.092 | 0.590 | 1.167 | 0.029 | n/a | 0.303 | 6.663 | n/a | n/a | 0.041 | 3.050 | 0.258 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002a1 | 11.034 | 3.446 | 0.005 | 0.000 | 1.023 | 0.942 | 1.481 | 0.054 | n/a | 0.716 | 3.310 | n/a | n/a | 0.056 | 4.475 | 0.406 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000002cf | 10.936 | 1.896 | n/a | 0.000 | 0.323 | 3.696 | 4.904 | 0.015 | n/a | 0.047 | 0.000 | n/a | n/a | 0.055 | 2.219 | 0.203 | 0.055 | node-13/thread-0/socket.wait-first-byte | none observed |

## P2 / L1024 / commit (853 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.081 | 0.939 | 0.000 | 1.739 | 3.834 | 0.005 | 0.000 | 0.808 | 0.843 | 1.281 | 0.037 | n/a | 0.179 | 7.438 | n/a | n/a | 0.041 | 4.901 | 0.321 | 0.041 |
| p99 | 82.286 | 3.478 | 0.095 | 5.356 | 12.290 | 1.914 | 0.000 | 27.117 | 13.348 | 11.512 | 3.028 | n/a | 3.792 | 53.034 | n/a | n/a | 0.104 | 35.446 | 0.703 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d400000000000002fc | 143.391 | 6.057 | 0.007 | 0.000 | 109.623 | 0.505 | 2.276 | 0.047 | n/a | 0.114 | 24.720 | n/a | n/a | 0.043 | 115.687 | 0.807 | 0.043 | node-13/thread-0/driver.queue.subject | driver.publication 1.465ms; driver.publication 1.289ms; driver.publication 1.179ms; driver.publication 1.141ms; driver.publication 1.019ms |
| 94ea9f68e99879d400000000000002f7 | 142.782 | 3.453 | 3.113 | 0.000 | 46.698 | 5.473 | 1.036 | 0.896 | n/a | 0.121 | 81.940 | n/a | n/a | 0.053 | 53.263 | 0.373 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 11.533ms; driver.publication 1.465ms; driver.expected-state.bind-receipt 1.310ms; driver.publication 1.289ms; driver.publication 1.179ms |
| 94ea9f68e99879d400000000000002f9 | 110.633 | 6.463 | 0.010 | 0.000 | 0.836 | 17.269 | 2.437 | 0.061 | n/a | 2.152 | 81.319 | n/a | n/a | 0.086 | 7.309 | 0.066 | 0.086 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.465ms; driver.publication 1.179ms; driver.publication 1.141ms |
| 94ea9f68e99879d400000000000003ad | 105.139 | 5.166 | 0.013 | 0.000 | 0.489 | 8.757 | 1.364 | 0.045 | n/a | 0.089 | 89.150 | n/a | n/a | 0.069 | 5.667 | 0.054 | 0.069 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.580ms; driver.publication 1.299ms; driver.publication 1.114ms; driver.publication 1.002ms |
| 94ea9f68e99879d40000000000000828 | 101.361 | 19.940 | 0.016 | 0.000 | 0.060 | 48.979 | 6.881 | 0.118 | n/a | 0.314 | 25.027 | n/a | n/a | 0.025 | 20.016 | 0.197 | 0.025 | node-13/thread-0/socket.wait-first-byte | driver.publication 7.057ms; driver.publication 6.819ms; driver.publication 2.633ms; driver.expected-state.bind-receipt 1.899ms; driver.publication 1.770ms |
| 94ea9f68e99879d400000000000002f2 | 89.796 | 62.325 | 0.008 | 0.000 | 0.802 | 0.781 | 6.954 | 0.059 | n/a | 0.514 | 18.297 | n/a | n/a | 0.057 | 63.134 | 0.703 | 0.057 | node-13/thread-0/driver.publication | driver.publication 8.345ms |
| 94ea9f68e99879d400000000000002eb | 86.501 | 5.171 | 0.452 | 0.000 | 0.140 | 6.462 | 58.319 | 0.061 | n/a | 0.182 | 15.571 | n/a | n/a | 0.142 | 5.763 | 0.067 | 0.142 | gw-w/thread-47/gateway.admitted-work | none observed |
| 94ea9f68e99879d400000000000003b0 | 83.777 | 11.641 | 0.019 | 0.000 | 4.443 | 7.173 | 1.511 | 0.047 | n/a | 0.598 | 58.248 | n/a | n/a | 0.098 | 16.103 | 0.192 | 0.098 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.299ms; driver.publication 1.114ms |
| 94ea9f68e99879d400000000000002f5 | 82.286 | 6.662 | 0.081 | 0.000 | 58.505 | 3.354 | 3.085 | 0.139 | n/a | 0.933 | 9.470 | n/a | n/a | 0.057 | 65.248 | 0.793 | 0.057 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 55.936ms; driver.expected-state.bind-receipt 1.310ms |
| 94ea9f68e99879d400000000000003af | 81.729 | 6.225 | 0.016 | 0.000 | 0.810 | 0.980 | 2.625 | 0.059 | n/a | 0.535 | 70.411 | n/a | n/a | 0.068 | 7.051 | 0.086 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.299ms |
| 94ea9f68e99879d40000000000000826 | 79.737 | 8.649 | 0.006 | 0.000 | 46.565 | 4.143 | 4.332 | 0.050 | n/a | 0.126 | 15.804 | n/a | n/a | 0.060 | 55.220 | 0.693 | 0.060 | node-13/thread-0/driver.queue.subject | driver.publication 7.057ms; driver.publication 6.819ms; driver.publication 1.639ms; driver.publication 1.609ms; driver.publication 1.456ms |
| 94ea9f68e99879d400000000000003ab | 79.583 | 4.695 | 0.007 | 0.000 | 4.499 | 2.068 | 2.982 | 0.094 | n/a | 0.255 | 64.954 | n/a | n/a | 0.029 | 9.200 | 0.116 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.580ms; driver.publication 1.345ms |
| 94ea9f68e99879d400000000000002fe | 75.891 | 6.668 | 0.011 | 0.000 | 0.349 | 3.188 | 5.903 | 0.054 | n/a | 0.465 | 59.194 | n/a | n/a | 0.058 | 7.029 | 0.093 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.289ms; driver.publication 1.019ms |
| 94ea9f68e99879d400000000000008fa | 73.682 | 10.043 | 0.016 | 0.000 | 14.628 | 1.083 | 2.781 | 0.070 | n/a | 0.281 | 44.604 | n/a | n/a | 0.176 | 24.688 | 0.335 | 0.176 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000823 | 69.470 | 5.952 | 0.007 | 0.000 | 40.055 | 13.710 | 2.007 | 0.046 | n/a | 0.472 | 7.177 | n/a | n/a | 0.044 | 46.014 | 0.662 | 0.044 | node-13/thread-0/driver.queue.subject | driver.publication 7.057ms; driver.publication 6.819ms; driver.publication 1.456ms; driver.publication 1.454ms; driver.expected-state.bind-receipt 1.430ms |
| 94ea9f68e99879d400000000000002ff | 66.589 | 3.481 | 0.018 | 0.000 | 0.402 | 2.349 | 1.323 | 0.026 | n/a | 0.236 | 58.722 | n/a | n/a | 0.033 | 3.901 | 0.059 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.289ms; driver.publication 1.019ms |
| 94ea9f68e99879d40000000000000865 | 64.687 | 5.016 | 2.856 | 0.000 | 0.082 | 1.314 | 13.687 | 0.039 | n/a | 0.097 | 41.546 | n/a | n/a | 0.050 | 7.954 | 0.123 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.205ms |
| 94ea9f68e99879d40000000000000415 | 62.115 | 4.019 | 0.007 | 0.000 | 29.284 | 0.781 | 4.890 | 0.070 | n/a | 0.106 | 22.922 | n/a | n/a | 0.036 | 33.310 | 0.536 | 0.036 | node-13/thread-0/driver.queue.subject | driver.publication 2.566ms; driver.publication 1.651ms; driver.publication 1.636ms; driver.publication 1.392ms; driver.publication 1.264ms |
| 94ea9f68e99879d40000000000000470 | 61.232 | 4.243 | 0.696 | 0.000 | 1.273 | 0.597 | 0.572 | 0.647 | n/a | 0.139 | 53.034 | n/a | n/a | 0.031 | 6.212 | 0.101 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.125ms |
| 94ea9f68e99879d40000000000000645 | 60.740 | 7.657 | 0.964 | 0.000 | 1.059 | 4.218 | 1.089 | 1.979 | n/a | 0.255 | 43.497 | n/a | n/a | 0.022 | 9.680 | 0.159 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.400ms; driver.publication 1.373ms; driver.publication 1.354ms; driver.publication 1.349ms; driver.publication 0.001ms |

## P2 / L1024 / commit / 5-10 facts (496 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.511 | 0.760 | 0.000 | 1.570 | 3.402 | 0.005 | 0.000 | 0.814 | 0.830 | 1.086 | 0.036 | n/a | 0.169 | 6.878 | n/a | n/a | 0.041 | 4.370 | 0.313 | 0.041 |
| p99 | 66.589 | 2.718 | 0.077 | 4.065 | 8.121 | 0.696 | 0.000 | 29.284 | 10.921 | 5.807 | 3.344 | n/a | 3.855 | 44.604 | n/a | n/a | 0.108 | 35.446 | 0.688 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d400000000000002f7 | 142.782 | 3.453 | 3.113 | 0.000 | 46.698 | 5.473 | 1.036 | 0.896 | n/a | 0.121 | 81.940 | n/a | n/a | 0.053 | 53.263 | 0.373 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 11.533ms; driver.publication 1.465ms; driver.expected-state.bind-receipt 1.310ms; driver.publication 1.289ms; driver.publication 1.179ms |
| 94ea9f68e99879d400000000000002f5 | 82.286 | 6.662 | 0.081 | 0.000 | 58.505 | 3.354 | 3.085 | 0.139 | n/a | 0.933 | 9.470 | n/a | n/a | 0.057 | 65.248 | 0.793 | 0.057 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 55.936ms; driver.expected-state.bind-receipt 1.310ms |
| 94ea9f68e99879d400000000000008fa | 73.682 | 10.043 | 0.016 | 0.000 | 14.628 | 1.083 | 2.781 | 0.070 | n/a | 0.281 | 44.604 | n/a | n/a | 0.176 | 24.688 | 0.335 | 0.176 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000000823 | 69.470 | 5.952 | 0.007 | 0.000 | 40.055 | 13.710 | 2.007 | 0.046 | n/a | 0.472 | 7.177 | n/a | n/a | 0.044 | 46.014 | 0.662 | 0.044 | node-13/thread-0/driver.queue.subject | driver.publication 7.057ms; driver.publication 6.819ms; driver.publication 1.456ms; driver.publication 1.454ms; driver.expected-state.bind-receipt 1.430ms |
| 94ea9f68e99879d400000000000002ff | 66.589 | 3.481 | 0.018 | 0.000 | 0.402 | 2.349 | 1.323 | 0.026 | n/a | 0.236 | 58.722 | n/a | n/a | 0.033 | 3.901 | 0.059 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.289ms; driver.publication 1.019ms |
| 94ea9f68e99879d40000000000000415 | 62.115 | 4.019 | 0.007 | 0.000 | 29.284 | 0.781 | 4.890 | 0.070 | n/a | 0.106 | 22.922 | n/a | n/a | 0.036 | 33.310 | 0.536 | 0.036 | node-13/thread-0/driver.queue.subject | driver.publication 2.566ms; driver.publication 1.651ms; driver.publication 1.636ms; driver.publication 1.392ms; driver.publication 1.264ms |
| 94ea9f68e99879d40000000000000470 | 61.232 | 4.243 | 0.696 | 0.000 | 1.273 | 0.597 | 0.572 | 0.647 | n/a | 0.139 | 53.034 | n/a | n/a | 0.031 | 6.212 | 0.101 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.125ms |
| 94ea9f68e99879d40000000000000308 | 60.450 | 5.746 | 0.007 | 0.000 | 0.684 | 9.910 | 2.504 | 0.049 | n/a | 0.092 | 41.386 | n/a | n/a | 0.072 | 6.436 | 0.106 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.958ms; driver.publication 2.350ms; driver.publication 1.693ms; driver.expected-state.bind-receipt 1.550ms; driver.expected-state.bind-receipt 1.009ms |
| 94ea9f68e99879d400000000000002f6 | 59.162 | 8.075 | 0.254 | 0.000 | 27.117 | 10.921 | 0.677 | 2.209 | n/a | 0.200 | 9.660 | n/a | n/a | 0.050 | 35.446 | 0.599 | 0.050 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 24.044ms; driver.expected-state.bind-receipt 1.310ms; driver.publication 1.179ms |
| 94ea9f68e99879d40000000000000644 | 57.698 | 5.162 | 2.453 | 0.000 | 3.419 | 3.848 | 1.556 | 3.028 | n/a | 0.422 | 37.765 | n/a | n/a | 0.045 | 11.034 | 0.191 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.400ms; driver.publication 1.373ms; driver.publication 1.354ms; driver.publication 1.195ms |
| 94ea9f68e99879d40000000000000539 | 52.966 | 4.060 | 0.007 | 0.000 | 1.026 | 1.021 | 1.149 | 0.039 | n/a | 0.325 | 45.278 | n/a | n/a | 0.063 | 5.093 | 0.096 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000008fb | 52.918 | 24.300 | 0.010 | 0.000 | 2.094 | 2.630 | 1.541 | 0.063 | n/a | 0.137 | 22.093 | n/a | n/a | 0.050 | 26.404 | 0.499 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.249ms |
| 94ea9f68e99879d40000000000000643 | 52.797 | 4.001 | 0.007 | 0.000 | 4.151 | 3.463 | 1.958 | 0.063 | n/a | 3.590 | 35.537 | n/a | n/a | 0.029 | 8.158 | 0.155 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.400ms; driver.publication 1.373ms; driver.publication 1.195ms |
| 94ea9f68e99879d40000000000000824 | 52.570 | 9.311 | 0.004 | 0.000 | 2.841 | 22.308 | 0.577 | 1.265 | n/a | 0.170 | 16.062 | n/a | n/a | 0.032 | 12.155 | 0.231 | 0.032 | node-13/thread-0/socket.wait-first-byte | driver.publication 7.057ms; driver.publication 1.454ms; driver.expected-state.bind-receipt 1.430ms; driver.publication 1.024ms |
| 94ea9f68e99879d400000000000004ab | 50.726 | 4.232 | 0.095 | 0.000 | 0.437 | 5.417 | 1.420 | 2.178 | n/a | 0.050 | 36.869 | n/a | n/a | 0.027 | 4.764 | 0.094 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.382ms; driver.publication 1.153ms; driver.publication 1.011ms |
| 94ea9f68e99879d400000000000003c7 | 49.876 | 3.035 | 0.009 | 0.000 | 1.046 | 6.648 | 1.431 | 0.071 | n/a | 4.419 | 33.167 | n/a | n/a | 0.049 | 4.090 | 0.082 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.265ms; driver.publication 1.107ms |
| 94ea9f68e99879d400000000000006e6 | 49.198 | 6.445 | 0.242 | 0.000 | 1.485 | 2.928 | 0.671 | 0.566 | n/a | 0.207 | 36.625 | n/a | n/a | 0.029 | 8.171 | 0.166 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.444ms; driver.publication 1.293ms |
| 94ea9f68e99879d4000000000000053d | 48.921 | 3.028 | 0.002 | 0.000 | 2.831 | 6.921 | 0.727 | 0.349 | n/a | 0.057 | 34.979 | n/a | n/a | 0.026 | 5.861 | 0.120 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.434ms; driver.publication 1.349ms; driver.expected-state.bind-receipt 1.096ms |
| 94ea9f68e99879d400000000000006e5 | 48.409 | 5.725 | 0.010 | 0.000 | 2.131 | 2.317 | 1.798 | 0.021 | n/a | 0.363 | 35.976 | n/a | n/a | 0.067 | 7.866 | 0.162 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.444ms |
| 94ea9f68e99879d4000000000000082e | 48.160 | 3.593 | 0.004 | 0.000 | 22.054 | 10.692 | 1.675 | 0.041 | n/a | 0.136 | 9.916 | n/a | n/a | 0.049 | 25.651 | 0.533 | 0.049 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 4.249ms; driver.publication 2.633ms; driver.expected-state.bind-receipt 1.899ms; driver.publication 1.639ms; driver.publication 1.609ms |

## P2/P4 / read-your-own-write / read (115 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 135.833 | n/a | n/a | n/a | 32.757 | 29.076 | 2.297 | 0.000 | 0.362 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.691 | 71.204 | 0.802 | 26.691 |
| p99 | 468.970 | n/a | n/a | n/a | 76.578 | 373.036 | 13.360 | 0.000 | 105.972 | 91.744 | 112.158 | n/a | 0.026 | 0.000 | n/a | n/a | 137.259 | 415.075 | 1.000 | 137.259 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d40000000000001556 | 491.283 | 58.742 | 349.046 | 3.372 | 0.000 | 0.276 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 79.847 | 411.160 | 0.837 | 79.847 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.786ms; driver.publication 2.066ms; driver.publication 1.936ms; driver.publication 1.846ms; driver.publication 1.717ms |
| 94ea9f68e99879d40000000000001554 | 468.970 | 38.661 | 373.036 | 5.806 | 0.000 | 0.363 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.105 | 417.502 | 0.890 | 51.105 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.786ms; driver.publication 2.066ms; driver.publication 1.936ms; driver.publication 1.468ms; driver.publication 1.452ms |
| 94ea9f68e99879d40000000000001542 | 460.702 | 56.865 | 268.636 | 3.854 | 0.000 | 0.617 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 130.728 | 329.356 | 0.715 | 130.728 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 2.066ms; driver.publication 1.936ms; driver.publication 1.813ms; driver.publication 1.452ms; driver.publication 1.415ms |
| 94ea9f68e99879d4000000000000154a | 457.893 | 14.427 | 377.120 | 0.000 | 0.000 | 0.249 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.097 | 391.547 | 0.855 | 66.097 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 2.066ms; driver.publication 1.936ms; driver.publication 1.452ms; driver.publication 1.415ms; driver.publication 1.352ms |
| 94ea9f68e99879d4000000000000154c | 443.316 | 46.415 | 342.876 | 1.144 | 0.000 | 0.324 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.557 | 390.435 | 0.881 | 52.557 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 2.066ms; driver.publication 1.936ms; driver.publication 1.452ms; driver.publication 1.415ms; driver.publication 1.352ms |
| 94ea9f68e99879d40000000000001550 | 436.309 | 41.926 | 372.224 | 0.926 | 0.000 | 0.472 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.762 | 415.075 | 0.951 | 20.762 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 2.066ms; driver.publication 1.936ms; driver.publication 1.452ms; driver.publication 1.352ms; driver.publication 1.313ms |
| 94ea9f68e99879d40000000000001540 | 422.117 | 17.256 | 364.104 | 0.000 | 0.000 | 0.279 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.478 | 381.360 | 0.903 | 40.478 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 2.066ms; driver.publication 1.936ms; driver.publication 1.813ms; driver.publication 1.452ms; driver.publication 1.415ms |
| 94ea9f68e99879d4000000000000152e | 421.888 | 24.731 | 322.163 | 6.006 | 0.000 | 0.269 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.719 | 352.900 | 0.836 | 68.719 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.776ms; driver.publication 1.936ms; driver.publication 1.813ms; driver.publication 1.452ms; driver.publication 1.415ms |
| 94ea9f68e99879d4000000000000153f | 420.716 | 42.982 | 302.612 | 5.371 | 0.000 | 0.548 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 69.203 | 350.965 | 0.834 | 69.203 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 2.066ms; driver.publication 1.936ms; driver.publication 1.813ms; driver.publication 1.452ms; driver.publication 1.415ms |
| 94ea9f68e99879d4000000000000152c | 375.271 | 29.914 | 317.538 | 0.000 | 0.000 | 0.275 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.544 | 347.452 | 0.926 | 27.544 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 1.936ms; driver.publication 1.813ms; driver.publication 1.452ms |
| 94ea9f68e99879d40000000000001524 | 374.361 | 32.017 | 296.029 | 2.511 | 0.000 | 0.446 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.359 | 330.557 | 0.883 | 43.359 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 1.936ms; driver.publication 1.813ms; driver.publication 1.452ms |
| 94ea9f68e99879d40000000000001505 | 358.538 | 15.559 | 290.022 | 0.000 | 0.000 | 0.416 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.542 | 305.581 | 0.852 | 52.542 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 3.277ms; driver.publication 2.056ms; driver.publication 1.813ms |
| 94ea9f68e99879d40000000000001575 | 357.641 | 12.938 | 287.382 | 0.000 | 0.000 | 0.253 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 57.069 | 300.320 | 0.840 | 57.069 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.786ms; driver.publication 2.985ms; driver.publication 2.066ms; driver.publication 1.846ms; driver.publication 1.717ms |
| 94ea9f68e99879d40000000000001522 | 356.118 | 28.839 | 279.510 | 1.701 | 0.000 | 0.469 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.600 | 310.050 | 0.871 | 45.600 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 1.936ms; driver.publication 1.813ms; driver.publication 1.452ms |
| 94ea9f68e99879d40000000000001503 | 350.612 | 40.268 | 161.054 | 11.347 | 0.000 | 0.684 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 137.259 | 212.669 | 0.607 | 137.259 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 3.277ms; driver.publication 2.056ms; driver.publication 1.813ms |
| 94ea9f68e99879d4000000000000151b | 348.510 | 32.757 | 283.141 | 2.574 | 0.000 | 0.233 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.805 | 318.472 | 0.914 | 29.805 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 1.936ms; driver.publication 1.813ms; driver.publication 1.464ms |
| 94ea9f68e99879d40000000000001512 | 342.760 | 32.612 | 278.392 | 2.058 | 0.000 | 0.362 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.336 | 313.062 | 0.913 | 29.336 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 3.277ms; driver.publication 1.813ms; driver.publication 1.464ms |
| 94ea9f68e99879d40000000000001526 | 341.850 | 37.943 | 290.917 | 0.000 | 0.000 | 0.407 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.583 | 328.860 | 0.962 | 12.583 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 1.936ms; driver.publication 1.813ms; driver.publication 1.452ms |
| 94ea9f68e99879d40000000000001510 | 338.669 | 40.966 | 187.980 | 2.058 | 0.000 | 0.398 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 107.267 | 231.004 | 0.682 | 107.267 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 3.277ms; driver.publication 2.056ms; driver.publication 1.813ms |
| 94ea9f68e99879d40000000000001516 | 329.295 | 32.386 | 286.802 | 1.130 | 0.000 | 0.429 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.547 | 320.319 | 0.973 | 8.547 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.939ms; driver.publication 3.776ms; driver.publication 3.277ms; driver.publication 1.813ms; driver.publication 1.464ms |

## P2 / tail / commit (2615 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.727 | 0.801 | 0.000 | 1.696 | 3.669 | 0.005 | 0.000 | 0.743 | 0.695 | 1.125 | 0.029 | n/a | 0.109 | 5.372 | n/a | n/a | 0.036 | 4.646 | 0.361 | 0.036 |
| p99 | 63.454 | 3.279 | 0.050 | 5.054 | 11.723 | 0.331 | 0.000 | 15.104 | 12.216 | 9.437 | 1.844 | n/a | 2.381 | 41.943 | n/a | n/a | 0.102 | 21.704 | 0.695 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d400000000000012c1 | 107.659 | 5.250 | 0.416 | 0.000 | 0.032 | 2.745 | 14.339 | 0.150 | n/a | 0.534 | 84.149 | n/a | n/a | 0.044 | 5.698 | 0.053 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.713ms; driver.publication 1.606ms; driver.publication 1.537ms; driver.publication 1.239ms; driver.expected-state.bind-receipt 1.222ms |
| 94ea9f68e99879d400000000000009bd | 105.014 | 7.943 | 0.114 | 0.000 | 0.910 | 0.528 | 1.251 | 0.016 | n/a | 0.388 | 93.818 | n/a | n/a | 0.047 | 8.967 | 0.085 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.957ms; driver.expected-state.bind-receipt 1.752ms; driver.publication 1.664ms; driver.publication 1.575ms; driver.publication 1.408ms |
| 94ea9f68e99879d400000000000015ca | 101.832 | 32.311 | 7.916 | 4.557 | 3.950 | 5.007 | 9.315 | 5.193 | n/a | 0.065 | 33.489 | n/a | n/a | 0.031 | 48.733 | 0.479 | 0.031 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 3.017ms; driver.expected-state.bind-receipt 2.667ms; driver.publication 2.342ms; driver.publication 1.958ms; client.encode 1.685ms |
| 94ea9f68e99879d400000000000009bc | 101.041 | 4.264 | 0.007 | 0.000 | 3.187 | 2.378 | 1.121 | 0.045 | n/a | 0.297 | 89.677 | n/a | n/a | 0.066 | 7.458 | 0.074 | 0.066 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.957ms; driver.expected-state.bind-receipt 1.752ms; driver.publication 1.664ms; driver.publication 1.408ms; driver.publication 1.362ms |
| 94ea9f68e99879d400000000000009bf | 95.523 | 4.727 | 0.006 | 0.000 | 0.326 | 4.607 | 1.341 | 0.049 | n/a | 0.186 | 84.242 | n/a | n/a | 0.039 | 5.059 | 0.053 | 0.039 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.664ms; driver.publication 1.581ms; driver.publication 1.575ms; driver.publication 1.408ms; driver.publication 1.362ms |
| 94ea9f68e99879d400000000000009c1 | 92.249 | 2.899 | 0.004 | 0.000 | 3.123 | 9.792 | 1.272 | 0.048 | n/a | 0.471 | 74.613 | n/a | n/a | 0.026 | 6.025 | 0.065 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.664ms; driver.publication 1.581ms; driver.publication 1.575ms; driver.publication 1.408ms; driver.publication 1.362ms |
| 94ea9f68e99879d400000000000015c9 | 90.523 | 25.283 | 19.730 | 0.000 | 3.931 | 1.268 | 15.752 | 0.036 | n/a | 1.379 | 23.109 | n/a | n/a | 0.035 | 48.945 | 0.541 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 3.017ms; driver.publication 2.342ms; driver.publication 1.958ms; driver.publication 1.784ms; client.encode 1.685ms |
| 94ea9f68e99879d400000000000015cc | 90.445 | 5.576 | 0.009 | 0.000 | 38.160 | 6.774 | 2.214 | 2.872 | n/a | 0.032 | 34.779 | n/a | n/a | 0.030 | 43.744 | 0.484 | 0.030 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 3.017ms; driver.expected-state.bind-receipt 2.667ms; driver.publication 2.342ms; driver.publication 1.958ms; client.encode 1.685ms |
| 94ea9f68e99879d400000000000014f5 | 84.560 | 8.055 | 0.134 | 0.000 | 1.621 | 7.671 | 10.227 | 0.049 | n/a | 0.103 | 56.659 | n/a | n/a | 0.040 | 9.811 | 0.116 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 6.652ms; driver.publication 2.910ms; driver.publication 1.538ms; client.encode 1.358ms |
| 94ea9f68e99879d400000000000014f4 | 83.669 | 6.141 | 0.008 | 0.000 | 5.218 | 3.363 | 3.335 | 0.038 | n/a | 3.527 | 61.966 | n/a | n/a | 0.075 | 11.366 | 0.136 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 6.652ms; driver.publication 3.525ms; driver.publication 2.910ms; client.encode 1.358ms |
| 94ea9f68e99879d400000000000015c8 | 82.992 | 10.573 | 29.741 | 0.000 | 4.742 | 9.199 | 1.522 | 0.045 | n/a | 0.059 | 27.067 | n/a | n/a | 0.043 | 45.056 | 0.543 | 0.043 | node-13/thread-0/client.commit-send-queue | driver.publication 2.837ms; driver.publication 2.342ms; driver.publication 1.958ms; driver.expected-state.bind-receipt 1.322ms; client.encode 1.278ms |
| 94ea9f68e99879d400000000000015c2 | 79.628 | 6.096 | 0.005 | 0.000 | 0.248 | 48.839 | 1.274 | 0.033 | n/a | 0.070 | 23.001 | n/a | n/a | 0.062 | 6.350 | 0.080 | 0.062 | node-13/thread-0/socket.wait-first-byte | driver.publication 5.066ms; driver.publication 3.164ms; client.encode 1.685ms; driver.publication 1.420ms; driver.publication 1.338ms |
| 94ea9f68e99879d400000000000015c7 | 79.235 | 7.363 | 0.006 | 0.000 | 6.054 | 37.483 | 2.534 | 0.086 | n/a | 0.274 | 25.326 | n/a | n/a | 0.109 | 13.424 | 0.169 | 0.109 | node-13/thread-0/socket.queue-and-write | driver.publication 3.164ms; driver.publication 1.958ms; client.encode 1.685ms; driver.expected-state.bind-receipt 1.322ms; client.encode 1.278ms |
| 94ea9f68e99879d4000000000000159c | 77.516 | 3.021 | 0.005 | 0.000 | 25.098 | 2.876 | 40.160 | 0.019 | n/a | 0.082 | 6.214 | n/a | n/a | 0.043 | 28.123 | 0.363 | 0.043 | gw-w/thread-50/commit.prepare-and-validate | driver.publication 3.786ms; driver.publication 1.468ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.073ms |
| 94ea9f68e99879d400000000000014e3 | 75.146 | 4.319 | 0.005 | 0.000 | 0.767 | 0.480 | 33.728 | 0.640 | n/a | 1.810 | 33.346 | n/a | n/a | 0.050 | 5.091 | 0.068 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d40000000000001de5 | 74.286 | 5.640 | 0.198 | 0.000 | 0.045 | 1.415 | 5.811 | 0.039 | n/a | 0.109 | 60.972 | n/a | n/a | 0.057 | 5.883 | 0.079 | 0.057 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000009bb | 72.878 | 6.431 | 0.208 | 0.000 | 2.410 | 1.005 | 0.694 | 0.600 | n/a | 0.154 | 61.326 | n/a | n/a | 0.049 | 9.049 | 0.124 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.957ms; driver.expected-state.bind-receipt 1.752ms; driver.publication 1.408ms; driver.publication 1.362ms; driver.publication 1.096ms |
| 94ea9f68e99879d400000000000014bb | 71.168 | 4.007 | 0.009 | 0.000 | 8.118 | 5.408 | 47.411 | 0.061 | n/a | 0.078 | 6.026 | n/a | n/a | 0.049 | 12.134 | 0.171 | 0.049 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| 94ea9f68e99879d400000000000012c6 | 71.101 | 5.461 | 0.010 | 0.000 | 0.103 | 0.799 | 2.059 | 0.050 | n/a | 2.597 | 59.988 | n/a | n/a | 0.033 | 5.574 | 0.078 | 0.033 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.239ms |
| 94ea9f68e99879d400000000000014bc | 68.638 | 9.560 | 0.140 | 0.000 | 2.155 | 1.540 | 2.189 | 44.550 | n/a | 0.022 | 8.456 | n/a | n/a | 0.026 | 11.856 | 0.173 | 0.026 | gw-w/thread-48/gateway.commit-order-wait | driver.publication 1.111ms |

## P2 / tail / commit / 5-10 facts (1552 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.173 | 0.645 | 0.000 | 1.538 | 3.196 | 0.005 | 0.000 | 0.754 | 0.688 | 0.964 | 0.028 | n/a | 0.109 | 5.016 | n/a | n/a | 0.036 | 4.103 | 0.350 | 0.036 |
| p99 | 64.055 | 2.341 | 0.046 | 4.662 | 9.346 | 0.157 | 0.000 | 16.495 | 13.339 | 5.193 | 1.844 | n/a | 2.483 | 42.806 | n/a | n/a | 0.105 | 23.455 | 0.715 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94ea9f68e99879d400000000000009bc | 101.041 | 4.264 | 0.007 | 0.000 | 3.187 | 2.378 | 1.121 | 0.045 | n/a | 0.297 | 89.677 | n/a | n/a | 0.066 | 7.458 | 0.074 | 0.066 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.957ms; driver.expected-state.bind-receipt 1.752ms; driver.publication 1.664ms; driver.publication 1.408ms; driver.publication 1.362ms |
| 94ea9f68e99879d400000000000009bf | 95.523 | 4.727 | 0.006 | 0.000 | 0.326 | 4.607 | 1.341 | 0.049 | n/a | 0.186 | 84.242 | n/a | n/a | 0.039 | 5.059 | 0.053 | 0.039 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.664ms; driver.publication 1.581ms; driver.publication 1.575ms; driver.publication 1.408ms; driver.publication 1.362ms |
| 94ea9f68e99879d400000000000009c1 | 92.249 | 2.899 | 0.004 | 0.000 | 3.123 | 9.792 | 1.272 | 0.048 | n/a | 0.471 | 74.613 | n/a | n/a | 0.026 | 6.025 | 0.065 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.664ms; driver.publication 1.581ms; driver.publication 1.575ms; driver.publication 1.408ms; driver.publication 1.362ms |
| 94ea9f68e99879d400000000000015cc | 90.445 | 5.576 | 0.009 | 0.000 | 38.160 | 6.774 | 2.214 | 2.872 | n/a | 0.032 | 34.779 | n/a | n/a | 0.030 | 43.744 | 0.484 | 0.030 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 3.017ms; driver.expected-state.bind-receipt 2.667ms; driver.publication 2.342ms; driver.publication 1.958ms; client.encode 1.685ms |
| 94ea9f68e99879d400000000000014f5 | 84.560 | 8.055 | 0.134 | 0.000 | 1.621 | 7.671 | 10.227 | 0.049 | n/a | 0.103 | 56.659 | n/a | n/a | 0.040 | 9.811 | 0.116 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 6.652ms; driver.publication 2.910ms; driver.publication 1.538ms; client.encode 1.358ms |
| 94ea9f68e99879d400000000000014f4 | 83.669 | 6.141 | 0.008 | 0.000 | 5.218 | 3.363 | 3.335 | 0.038 | n/a | 3.527 | 61.966 | n/a | n/a | 0.075 | 11.366 | 0.136 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 6.652ms; driver.publication 3.525ms; driver.publication 2.910ms; client.encode 1.358ms |
| 94ea9f68e99879d400000000000015c8 | 82.992 | 10.573 | 29.741 | 0.000 | 4.742 | 9.199 | 1.522 | 0.045 | n/a | 0.059 | 27.067 | n/a | n/a | 0.043 | 45.056 | 0.543 | 0.043 | node-13/thread-0/client.commit-send-queue | driver.publication 2.837ms; driver.publication 2.342ms; driver.publication 1.958ms; driver.expected-state.bind-receipt 1.322ms; client.encode 1.278ms |
| 94ea9f68e99879d400000000000015c7 | 79.235 | 7.363 | 0.006 | 0.000 | 6.054 | 37.483 | 2.534 | 0.086 | n/a | 0.274 | 25.326 | n/a | n/a | 0.109 | 13.424 | 0.169 | 0.109 | node-13/thread-0/socket.queue-and-write | driver.publication 3.164ms; driver.publication 1.958ms; client.encode 1.685ms; driver.expected-state.bind-receipt 1.322ms; client.encode 1.278ms |
| 94ea9f68e99879d4000000000000159c | 77.516 | 3.021 | 0.005 | 0.000 | 25.098 | 2.876 | 40.160 | 0.019 | n/a | 0.082 | 6.214 | n/a | n/a | 0.043 | 28.123 | 0.363 | 0.043 | gw-w/thread-50/commit.prepare-and-validate | driver.publication 3.786ms; driver.publication 1.468ms; driver.expected-state.bind-receipt 1.305ms; driver.publication 1.073ms |
| 94ea9f68e99879d400000000000014e3 | 75.146 | 4.319 | 0.005 | 0.000 | 0.767 | 0.480 | 33.728 | 0.640 | n/a | 1.810 | 33.346 | n/a | n/a | 0.050 | 5.091 | 0.068 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000009bb | 72.878 | 6.431 | 0.208 | 0.000 | 2.410 | 1.005 | 0.694 | 0.600 | n/a | 0.154 | 61.326 | n/a | n/a | 0.049 | 9.049 | 0.124 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.957ms; driver.expected-state.bind-receipt 1.752ms; driver.publication 1.408ms; driver.publication 1.362ms; driver.publication 1.096ms |
| 94ea9f68e99879d400000000000014bb | 71.168 | 4.007 | 0.009 | 0.000 | 8.118 | 5.408 | 47.411 | 0.061 | n/a | 0.078 | 6.026 | n/a | n/a | 0.049 | 12.134 | 0.171 | 0.049 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| 94ea9f68e99879d40000000000000df6 | 67.692 | 14.496 | 0.016 | 0.000 | 0.106 | 18.448 | 2.704 | 0.052 | n/a | 0.152 | 31.673 | n/a | n/a | 0.045 | 14.618 | 0.216 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.886ms; driver.publication 1.503ms; driver.publication 1.325ms; driver.publication 1.246ms; driver.expected-state.bind-receipt 1.197ms |
| 94ea9f68e99879d400000000000014e5 | 64.763 | 12.467 | 0.010 | 0.000 | 1.839 | 18.143 | 1.897 | 0.033 | n/a | 2.280 | 28.045 | n/a | n/a | 0.048 | 14.317 | 0.221 | 0.048 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.451ms |
| 94ea9f68e99879d400000000000014f8 | 64.134 | 5.443 | 0.005 | 0.000 | 11.404 | 0.654 | 2.878 | 0.059 | n/a | 2.692 | 40.903 | n/a | n/a | 0.096 | 16.851 | 0.263 | 0.096 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 6.652ms; driver.publication 2.221ms; driver.publication 1.538ms; client.encode 1.358ms; driver.publication 1.170ms |
| 94ea9f68e99879d40000000000001a04 | 64.055 | 5.414 | 0.009 | 0.000 | 0.917 | 0.645 | 1.165 | 0.041 | n/a | 0.219 | 55.604 | n/a | n/a | 0.041 | 6.339 | 0.099 | 0.041 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 94ea9f68e99879d400000000000014f7 | 63.454 | 3.587 | 0.004 | 0.000 | 3.464 | 3.906 | 6.631 | 0.047 | n/a | 0.391 | 45.355 | n/a | n/a | 0.069 | 7.056 | 0.111 | 0.069 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 6.652ms; driver.publication 2.221ms; driver.publication 2.175ms; driver.publication 1.538ms; client.encode 1.358ms |
| 94ea9f68e99879d400000000000014f2 | 62.604 | 14.908 | 0.243 | 0.000 | 4.095 | 6.775 | 1.755 | 0.061 | n/a | 0.085 | 34.655 | n/a | n/a | 0.028 | 19.246 | 0.307 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 5.058ms; driver.publication 2.910ms |
| 94ea9f68e99879d400000000000015a2 | 62.553 | 5.082 | 0.006 | 0.000 | 6.266 | 37.020 | 1.550 | 1.071 | n/a | 0.028 | 11.463 | n/a | n/a | 0.068 | 11.354 | 0.182 | 0.068 | node-13/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.305ms; driver.publication 1.212ms; driver.publication 1.073ms; driver.publication 0.444ms |
| 94ea9f68e99879d4000000000000146f | 62.122 | 6.276 | 0.005 | 0.000 | 0.265 | 0.899 | 2.993 | 0.048 | n/a | 0.094 | 51.492 | n/a | n/a | 0.050 | 6.546 | 0.105 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.538ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.361 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.521 | 200.573 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 |
| p99 | 448.696 | n/a | n/a | n/a | 22.868 | n/a | 0.000 | 0.000 | 9.546 | 437.528 | 0.301 | n/a | 0.449 | 0.000 | n/a | n/a | 41.805 | 22.868 | 0.334 | 41.805 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a30000000000000002 | 448.696 | 4.607 | n/a | 0.000 | 0.000 | 5.712 | 437.528 | 0.301 | n/a | 0.124 | 0.000 | n/a | n/a | 0.424 | 4.607 | 0.010 | 0.424 | gw-r/thread-48/gateway.admitted-work | none observed |
| 9e401c26bca4621a0000000000000005 | 203.124 | 0.000 | n/a | 0.000 | 0.000 | 1.521 | 201.188 | 0.009 | n/a | 0.110 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a0000000000000006 | 202.567 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 200.933 | 0.014 | n/a | 0.449 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000f05 | 201.535 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 200.771 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000f03 | 201.398 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 200.573 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000f06 | 201.361 | 0.000 | n/a | 0.000 | 0.000 | 0.492 | 200.707 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000f04 | 201.244 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 200.526 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a0000000000000f0b | 68.554 | 22.868 | n/a | 0.000 | 0.000 | 8.406 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.280 | 22.868 | 0.334 | 37.280 | node-13/thread-4/socket.wait-first-byte | none observed |
| 9e401c26bca4621a0000000000000f0a | 65.096 | 19.070 | n/a | 0.000 | 0.000 | 7.036 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.990 | 19.070 | 0.293 | 38.990 | node-13/thread-4/socket.wait-first-byte | none observed |
| 9e401c26bca4621a0000000000000f09 | 65.035 | 16.839 | n/a | 0.000 | 0.000 | 6.391 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.805 | 16.839 | 0.259 | 41.805 | node-13/thread-4/socket.wait-first-byte | none observed |
| 9e401c26bca4621a0000000000000f0c | 58.406 | 7.972 | n/a | 0.000 | 0.000 | 9.546 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.889 | 7.972 | 0.136 | 40.889 | node-13/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 853.622 | n/a | n/a | n/a | 3.486 | n/a | 0.000 | 0.000 | 0.724 | 812.930 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 1.273 | 3.486 | 0.046 | 1.273 |
| p99 | 1005.556 | n/a | n/a | n/a | 33.861 | n/a | 5.755 | 0.000 | 2.175 | 1001.350 | 0.015 | n/a | 0.557 | 0.000 | n/a | n/a | 25.369 | 39.616 | 0.120 | 25.369 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a300000000000000a4 | 1005.556 | 0.186 | n/a | 0.000 | 0.000 | 2.175 | 1001.350 | 0.015 | n/a | 0.557 | 0.000 | n/a | n/a | 1.273 | 0.186 | 0.000 | 1.273 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a300000000000000a5 | 853.622 | 33.861 | n/a | 5.755 | 0.000 | 0.724 | 812.930 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.266 | 39.616 | 0.046 | 0.266 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a30000000000000823 | 29.100 | 3.486 | n/a | 0.000 | 0.000 | 0.245 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.369 | 3.486 | 0.120 | 25.369 | node-13/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 444.624 | n/a | n/a | n/a | 2.627 | n/a | 0.000 | 0.000 | 0.830 | 440.949 | 0.016 | n/a | 0.112 | 0.000 | n/a | n/a | 0.109 | 2.627 | 0.007 | 0.109 |
| p99 | 1007.079 | n/a | n/a | n/a | 13.071 | n/a | 0.000 | 0.000 | 7.140 | 1004.498 | 4.632 | n/a | 0.379 | 0.000 | n/a | n/a | 45.411 | 13.071 | 0.314 | 45.411 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a300000000000000bb | 1007.079 | 0.278 | n/a | 0.000 | 0.000 | 0.945 | 1004.498 | 0.050 | n/a | 0.133 | 0.000 | n/a | n/a | 1.176 | 0.278 | 0.000 | 1.176 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a300000000000000d0 | 1003.476 | 0.138 | n/a | 0.000 | 0.000 | 0.830 | 1001.246 | 0.016 | n/a | 0.142 | 0.000 | n/a | n/a | 1.104 | 0.138 | 0.000 | 1.104 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000000b4 | 993.616 | 4.305 | n/a | 0.000 | 0.000 | 4.054 | 984.949 | 0.018 | n/a | 0.114 | 0.000 | n/a | n/a | 0.176 | 4.305 | 0.004 | 0.176 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a300000000000000ba | 988.379 | 2.435 | n/a | 0.000 | 0.000 | 3.785 | 981.888 | 0.015 | n/a | 0.168 | 0.000 | n/a | n/a | 0.086 | 2.435 | 0.002 | 0.086 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000000ae | 871.419 | 1.831 | n/a | 0.000 | 0.000 | 0.562 | 868.820 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.073 | 1.831 | 0.002 | 0.073 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a300000000000000ab | 736.482 | 2.725 | n/a | 0.000 | 0.000 | 0.762 | 732.536 | 0.015 | n/a | 0.218 | 0.000 | n/a | n/a | 0.227 | 2.725 | 0.004 | 0.227 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000000c6 | 716.060 | 3.549 | n/a | 0.000 | 0.000 | 7.140 | 705.162 | 0.016 | n/a | 0.093 | 0.000 | n/a | n/a | 0.100 | 3.549 | 0.005 | 0.100 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000000ca | 713.028 | 2.483 | n/a | 0.000 | 0.000 | 0.769 | 704.655 | 4.632 | n/a | 0.379 | 0.000 | n/a | n/a | 0.109 | 2.483 | 0.003 | 0.109 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000000b3 | 711.303 | 5.437 | n/a | 0.000 | 0.000 | 0.691 | 704.950 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.107 | 5.437 | 0.008 | 0.107 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a300000000000000c2 | 687.029 | 6.096 | n/a | 0.000 | 0.000 | 0.612 | 680.108 | 0.014 | n/a | 0.087 | 0.000 | n/a | n/a | 0.112 | 6.096 | 0.009 | 0.112 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000000c0 | 685.819 | 2.431 | n/a | 0.000 | 0.000 | 2.736 | 680.441 | 0.086 | n/a | 0.049 | 0.000 | n/a | n/a | 0.075 | 2.431 | 0.004 | 0.075 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a300000000000000a8 | 667.426 | 2.219 | n/a | 0.000 | 0.000 | 0.800 | 663.946 | 0.017 | n/a | 0.331 | 0.000 | n/a | n/a | 0.114 | 2.219 | 0.003 | 0.114 | gw-r/thread-65/journal/page | none observed |
| dd86797d643366a300000000000000cb | 547.854 | 2.293 | n/a | 0.000 | 0.000 | 1.657 | 543.734 | 0.015 | n/a | 0.082 | 0.000 | n/a | n/a | 0.073 | 2.293 | 0.004 | 0.073 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000000a7 | 488.523 | 2.483 | n/a | 0.000 | 0.000 | 0.954 | 484.848 | 0.025 | n/a | 0.092 | 0.000 | n/a | n/a | 0.121 | 2.483 | 0.005 | 0.121 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000000b8 | 444.624 | 2.918 | n/a | 0.000 | 0.000 | 0.548 | 440.949 | 0.018 | n/a | 0.089 | 0.000 | n/a | n/a | 0.101 | 2.918 | 0.007 | 0.101 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a300000000000000b7 | 416.794 | 2.769 | n/a | 0.000 | 0.000 | 0.632 | 413.230 | 0.017 | n/a | 0.069 | 0.000 | n/a | n/a | 0.077 | 2.769 | 0.007 | 0.077 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000000c5 | 330.947 | 2.038 | n/a | 0.000 | 0.000 | 2.706 | 326.025 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.079 | 2.038 | 0.006 | 0.079 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a300000000000000c3 | 316.250 | 2.346 | n/a | 0.000 | 0.000 | 0.685 | 312.968 | 0.022 | n/a | 0.142 | 0.000 | n/a | n/a | 0.086 | 2.346 | 0.007 | 0.086 | gw-r/thread-65/journal/page | none observed |
| dd86797d643366a300000000000000ac | 297.316 | 2.822 | n/a | 0.000 | 0.000 | 1.335 | 292.969 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.097 | 2.822 | 0.009 | 0.097 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000000aa | 291.635 | 2.627 | n/a | 0.000 | 0.000 | 0.785 | 287.858 | 0.014 | n/a | 0.112 | 0.000 | n/a | n/a | 0.240 | 2.627 | 0.009 | 0.240 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 318.708 | n/a | n/a | n/a | 4.031 | n/a | 0.000 | 0.000 | 0.831 | 312.969 | 0.014 | n/a | 0.087 | 0.000 | n/a | n/a | 0.153 | 4.031 | 0.014 | 0.153 |
| p99 | 1011.000 | n/a | n/a | n/a | 18.077 | n/a | 1.589 | 0.000 | 16.899 | 1007.854 | 1.332 | n/a | 0.200 | 0.000 | n/a | n/a | 28.285 | 19.666 | 0.424 | 28.285 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a300000000000000df | 1011.000 | 0.263 | n/a | 0.000 | 0.000 | 1.602 | 1007.854 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 1.174 | 0.263 | 0.000 | 1.174 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a30000000000000108 | 1007.207 | 3.316 | n/a | 0.000 | 0.000 | 2.344 | 1001.351 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 0.084 | 3.316 | 0.003 | 0.084 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000000d3 | 1006.357 | 0.157 | n/a | 0.000 | 0.000 | 2.656 | 1002.168 | 0.041 | n/a | 0.200 | 0.000 | n/a | n/a | 1.134 | 0.157 | 0.000 | 1.134 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a30000000000000103 | 1003.248 | 0.157 | n/a | 0.000 | 0.000 | 0.619 | 1001.136 | 0.020 | n/a | 0.143 | 0.000 | n/a | n/a | 1.173 | 0.157 | 0.000 | 1.173 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000000da | 1001.129 | 6.852 | n/a | 0.000 | 0.000 | 0.876 | 993.089 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.234 | 6.852 | 0.007 | 0.234 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000110 | 991.246 | 2.811 | n/a | 0.000 | 0.000 | 0.977 | 987.301 | 0.016 | n/a | 0.078 | 0.000 | n/a | n/a | 0.063 | 2.811 | 0.003 | 0.063 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a300000000000000d2 | 986.384 | 2.886 | n/a | 0.000 | 0.000 | 0.671 | 982.621 | 0.020 | n/a | 0.087 | 0.000 | n/a | n/a | 0.099 | 2.886 | 0.003 | 0.099 | gw-r/thread-65/journal/page | none observed |
| dd86797d643366a300000000000000db | 985.997 | 8.243 | n/a | 0.000 | 0.000 | 16.899 | 960.430 | 0.016 | n/a | 0.097 | 0.000 | n/a | n/a | 0.313 | 8.243 | 0.008 | 0.313 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000000e6 | 894.517 | 4.421 | n/a | 0.000 | 0.000 | 1.957 | 887.913 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.141 | 4.421 | 0.005 | 0.141 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000100 | 883.407 | 9.799 | n/a | 0.000 | 0.000 | 2.832 | 870.482 | 0.016 | n/a | 0.115 | 0.000 | n/a | n/a | 0.162 | 9.799 | 0.011 | 0.162 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000000e1 | 861.678 | 7.640 | n/a | 0.000 | 0.000 | 0.706 | 852.879 | 0.041 | n/a | 0.101 | 0.000 | n/a | n/a | 0.312 | 7.640 | 0.009 | 0.312 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000000e2 | 691.928 | 5.615 | n/a | 0.000 | 0.000 | 1.018 | 684.998 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.173 | 5.615 | 0.008 | 0.173 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000105 | 681.676 | 2.593 | n/a | 0.000 | 0.000 | 0.831 | 678.032 | 0.014 | n/a | 0.079 | 0.000 | n/a | n/a | 0.127 | 2.593 | 0.004 | 0.127 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000000dd | 598.523 | 6.773 | n/a | 0.000 | 0.000 | 0.620 | 590.654 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.397 | 6.773 | 0.011 | 0.397 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000000ea | 587.247 | 18.077 | n/a | 1.589 | 0.000 | 0.648 | 566.691 | 0.024 | n/a | 0.092 | 0.000 | n/a | n/a | 0.126 | 19.666 | 0.033 | 0.126 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000000ed | 563.240 | 2.030 | n/a | 0.000 | 0.000 | 0.821 | 560.121 | 0.027 | n/a | 0.132 | 0.000 | n/a | n/a | 0.109 | 2.030 | 0.004 | 0.109 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000000fe | 519.234 | 3.537 | n/a | 0.000 | 0.000 | 2.501 | 512.972 | 0.018 | n/a | 0.119 | 0.000 | n/a | n/a | 0.088 | 3.537 | 0.007 | 0.088 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000000fd | 492.203 | 4.337 | n/a | 0.000 | 0.000 | 0.567 | 486.361 | 0.762 | n/a | 0.076 | 0.000 | n/a | n/a | 0.100 | 4.337 | 0.009 | 0.100 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000000d7 | 484.367 | 2.529 | n/a | 0.000 | 0.000 | 0.762 | 480.945 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.083 | 2.529 | 0.005 | 0.083 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a3000000000000010a | 459.615 | 8.686 | n/a | 0.000 | 0.000 | 0.928 | 449.792 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.112 | 8.686 | 0.019 | 0.112 | gw-r/thread-42/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 462.150 | n/a | n/a | n/a | 3.573 | n/a | 0.000 | 0.000 | 0.810 | 458.753 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.121 | 3.573 | 0.007 | 0.121 |
| p99 | 1010.481 | n/a | n/a | n/a | 7.842 | n/a | 0.000 | 0.000 | 4.460 | 1004.894 | 1.858 | n/a | 0.105 | 0.000 | n/a | n/a | 43.709 | 7.842 | 0.526 | 43.709 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a30000000000000128 | 1010.481 | 4.760 | n/a | 0.000 | 0.000 | 0.631 | 1004.894 | 0.032 | n/a | 0.075 | 0.000 | n/a | n/a | 0.090 | 4.760 | 0.005 | 0.090 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a3000000000000012c | 1006.785 | 5.066 | n/a | 0.000 | 0.000 | 0.810 | 1000.626 | 0.015 | n/a | 0.069 | 0.000 | n/a | n/a | 0.199 | 5.066 | 0.005 | 0.199 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000139 | 1006.434 | 0.135 | n/a | 0.000 | 0.000 | 3.697 | 1001.357 | 0.008 | n/a | 0.105 | 0.000 | n/a | n/a | 1.132 | 0.135 | 0.000 | 1.132 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a3000000000000012d | 1001.678 | 2.535 | n/a | 0.000 | 0.000 | 2.701 | 996.255 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.100 | 2.535 | 0.003 | 0.100 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000143 | 994.636 | 6.108 | n/a | 0.000 | 0.000 | 0.909 | 987.319 | 0.022 | n/a | 0.084 | 0.000 | n/a | n/a | 0.195 | 6.108 | 0.006 | 0.195 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000117 | 992.683 | 3.298 | n/a | 0.000 | 0.000 | 0.719 | 988.426 | 0.041 | n/a | 0.084 | 0.000 | n/a | n/a | 0.115 | 3.298 | 0.003 | 0.115 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a3000000000000011f | 992.273 | 2.630 | n/a | 0.000 | 0.000 | 0.839 | 988.558 | 0.032 | n/a | 0.079 | 0.000 | n/a | n/a | 0.136 | 2.630 | 0.003 | 0.136 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a3000000000000014a | 831.872 | 3.451 | n/a | 0.000 | 0.000 | 0.758 | 827.463 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.139 | 3.451 | 0.004 | 0.139 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000134 | 796.633 | 3.819 | n/a | 0.000 | 0.000 | 0.638 | 791.984 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.130 | 3.819 | 0.005 | 0.130 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000126 | 788.467 | 2.798 | n/a | 0.000 | 0.000 | 0.826 | 784.706 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.078 | 2.798 | 0.004 | 0.078 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a3000000000000013f | 769.019 | 3.914 | n/a | 0.000 | 0.000 | 1.225 | 763.685 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.121 | 3.914 | 0.005 | 0.121 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000130 | 742.813 | 4.160 | n/a | 0.000 | 0.000 | 0.666 | 737.671 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.256 | 4.160 | 0.006 | 0.256 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000114 | 734.594 | 2.097 | n/a | 0.000 | 0.000 | 1.592 | 730.745 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.094 | 2.097 | 0.003 | 0.094 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a30000000000000129 | 638.424 | 4.492 | n/a | 0.000 | 0.000 | 2.948 | 630.823 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.074 | 4.492 | 0.007 | 0.074 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000120 | 636.036 | 2.033 | n/a | 0.000 | 0.000 | 0.391 | 633.467 | 0.012 | n/a | 0.055 | 0.000 | n/a | n/a | 0.079 | 2.033 | 0.003 | 0.079 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a30000000000000111 | 589.446 | 2.794 | n/a | 0.000 | 0.000 | 1.299 | 585.192 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 0.095 | 2.794 | 0.005 | 0.095 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a30000000000000136 | 589.253 | 5.130 | n/a | 0.000 | 0.000 | 2.713 | 581.080 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.267 | 5.130 | 0.009 | 0.267 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a3000000000000013c | 535.326 | 2.886 | n/a | 0.000 | 0.000 | 3.199 | 529.086 | 0.019 | n/a | 0.061 | 0.000 | n/a | n/a | 0.075 | 2.886 | 0.005 | 0.075 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000144 | 509.916 | 4.129 | n/a | 0.000 | 0.000 | 1.131 | 504.460 | 0.004 | n/a | 0.063 | 0.000 | n/a | n/a | 0.129 | 4.129 | 0.008 | 0.129 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a3000000000000011d | 498.177 | 3.031 | n/a | 0.000 | 0.000 | 0.685 | 494.315 | 0.012 | n/a | 0.057 | 0.000 | n/a | n/a | 0.077 | 3.031 | 0.006 | 0.077 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 363.742 | n/a | n/a | n/a | 2.701 | n/a | 0.000 | 0.000 | 0.618 | 357.490 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.096 | 2.701 | 0.007 | 0.096 |
| p99 | 1004.711 | n/a | n/a | n/a | 6.613 | n/a | 1.966 | 0.000 | 4.228 | 1001.366 | 0.149 | n/a | 0.112 | 0.000 | n/a | n/a | 49.481 | 8.496 | 0.351 | 49.481 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a30000000000000156 | 1004.711 | 5.485 | n/a | 0.000 | 0.000 | 2.131 | 996.752 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.257 | 5.485 | 0.005 | 0.257 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000170 | 1003.748 | 2.372 | n/a | 0.000 | 0.000 | 0.495 | 1000.671 | 0.030 | n/a | 0.108 | 0.000 | n/a | n/a | 0.072 | 2.372 | 0.002 | 0.072 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000181 | 1003.241 | 0.112 | n/a | 0.000 | 0.000 | 0.835 | 1001.101 | 0.018 | n/a | 0.074 | 0.000 | n/a | n/a | 1.101 | 0.112 | 0.000 | 1.101 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a30000000000000166 | 1003.171 | 0.121 | n/a | 0.000 | 0.000 | 0.516 | 1001.366 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 1.105 | 0.121 | 0.000 | 1.105 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000176 | 1002.824 | 0.179 | n/a | 0.000 | 0.000 | 0.601 | 1000.806 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 1.145 | 0.179 | 0.000 | 1.145 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000188 | 991.078 | 2.849 | n/a | 0.000 | 0.000 | 0.808 | 987.285 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.085 | 2.849 | 0.003 | 0.085 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a30000000000000189 | 990.898 | 2.701 | n/a | 0.000 | 0.000 | 1.449 | 986.604 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.061 | 2.701 | 0.003 | 0.061 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a3000000000000017c | 891.447 | 4.716 | n/a | 0.000 | 0.000 | 0.735 | 885.759 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.174 | 4.716 | 0.005 | 0.174 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a3000000000000015b | 854.741 | 2.408 | n/a | 0.000 | 0.000 | 0.625 | 851.583 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.061 | 2.408 | 0.003 | 0.061 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a3000000000000016e | 745.990 | 2.556 | n/a | 0.000 | 0.000 | 0.476 | 742.814 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.086 | 2.556 | 0.003 | 0.086 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000187 | 741.589 | 5.373 | n/a | 0.000 | 0.000 | 0.749 | 735.254 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.164 | 5.373 | 0.007 | 0.164 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000179 | 703.574 | 2.392 | n/a | 0.000 | 0.000 | 0.676 | 700.365 | 0.012 | n/a | 0.055 | 0.000 | n/a | n/a | 0.073 | 2.392 | 0.003 | 0.073 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a3000000000000018b | 691.390 | 2.629 | n/a | 0.000 | 0.000 | 0.618 | 687.972 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.099 | 2.629 | 0.004 | 0.099 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a3000000000000017f | 669.956 | 3.037 | n/a | 0.000 | 0.000 | 4.080 | 662.674 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.110 | 3.037 | 0.005 | 0.110 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a30000000000000157 | 631.509 | 2.101 | n/a | 0.000 | 0.000 | 0.837 | 628.391 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.087 | 2.101 | 0.003 | 0.087 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000172 | 626.120 | 2.507 | n/a | 0.000 | 0.000 | 0.890 | 622.563 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.087 | 2.507 | 0.004 | 0.087 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a30000000000000169 | 526.665 | 3.684 | n/a | 0.000 | 0.000 | 0.462 | 522.388 | 0.012 | n/a | 0.041 | 0.000 | n/a | n/a | 0.078 | 3.684 | 0.007 | 0.078 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000154 | 491.608 | 3.010 | n/a | 0.000 | 0.000 | 0.516 | 487.950 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.084 | 3.010 | 0.006 | 0.084 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000151 | 464.152 | 2.483 | n/a | 0.000 | 0.000 | 0.530 | 460.989 | 0.012 | n/a | 0.048 | 0.000 | n/a | n/a | 0.090 | 2.483 | 0.005 | 0.090 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a3000000000000014d | 441.384 | 2.358 | n/a | 0.000 | 0.000 | 0.709 | 438.181 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.078 | 2.358 | 0.005 | 0.078 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 329.796 | n/a | n/a | n/a | 3.064 | n/a | 0.000 | 0.000 | 0.640 | 323.905 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.085 | 3.064 | 0.012 | 0.085 |
| p99 | 1007.925 | n/a | n/a | n/a | 7.817 | n/a | 1.430 | 0.000 | 23.357 | 1001.649 | 0.023 | n/a | 0.091 | 0.000 | n/a | n/a | 42.551 | 7.817 | 0.375 | 42.551 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a3000000000000018d | 1007.925 | 3.395 | n/a | 0.000 | 0.000 | 23.357 | 981.053 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.082 | 3.395 | 0.003 | 0.082 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a300000000000001a8 | 1006.695 | 4.223 | n/a | 0.000 | 0.000 | 0.664 | 1001.649 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.112 | 4.223 | 0.004 | 0.112 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000001c6 | 1002.027 | 2.352 | n/a | 0.000 | 0.000 | 0.437 | 999.108 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.070 | 2.352 | 0.002 | 0.070 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a300000000000001c5 | 991.551 | 3.064 | n/a | 0.000 | 0.000 | 0.553 | 987.713 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.122 | 3.064 | 0.003 | 0.122 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000001a9 | 987.356 | 2.929 | n/a | 0.000 | 0.000 | 0.485 | 983.794 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.079 | 2.929 | 0.003 | 0.079 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000001a7 | 986.266 | 2.771 | n/a | 0.000 | 0.000 | 3.866 | 979.439 | 0.023 | n/a | 0.033 | 0.000 | n/a | n/a | 0.133 | 2.771 | 0.003 | 0.133 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a3000000000000019c | 918.210 | 1.734 | n/a | 0.000 | 0.000 | 1.313 | 915.052 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.063 | 1.734 | 0.002 | 0.063 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000001c4 | 890.052 | 2.336 | n/a | 0.000 | 0.000 | 0.605 | 887.003 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.078 | 2.336 | 0.003 | 0.078 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a3000000000000019f | 787.958 | 5.480 | n/a | 0.000 | 0.000 | 0.690 | 781.572 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.159 | 5.480 | 0.007 | 0.159 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000001b8 | 764.112 | 2.338 | n/a | 0.000 | 0.000 | 0.544 | 761.103 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.074 | 2.338 | 0.003 | 0.074 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a300000000000001cf | 678.002 | 2.462 | n/a | 0.000 | 0.000 | 0.584 | 674.843 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.066 | 2.462 | 0.004 | 0.066 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a300000000000001d6 | 643.771 | 1.750 | n/a | 0.000 | 0.000 | 0.658 | 641.255 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.067 | 1.750 | 0.003 | 0.067 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000001bb | 596.402 | 2.330 | n/a | 0.000 | 0.000 | 0.420 | 593.451 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.126 | 2.330 | 0.004 | 0.126 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a300000000000001a2 | 548.702 | 5.030 | n/a | 0.000 | 0.000 | 0.508 | 543.027 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.096 | 5.030 | 0.009 | 0.096 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000001c7 | 521.524 | 3.211 | n/a | 0.000 | 0.000 | 0.666 | 517.460 | 0.021 | n/a | 0.070 | 0.000 | n/a | n/a | 0.095 | 3.211 | 0.006 | 0.095 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000001d2 | 509.573 | 2.772 | n/a | 0.000 | 0.000 | 0.440 | 506.240 | 0.002 | n/a | 0.035 | 0.000 | n/a | n/a | 0.085 | 2.772 | 0.005 | 0.085 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a3000000000000019b | 496.705 | 2.500 | n/a | 0.000 | 0.000 | 0.483 | 493.580 | 0.016 | n/a | 0.047 | 0.000 | n/a | n/a | 0.079 | 2.500 | 0.005 | 0.079 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000001b1 | 489.108 | 4.934 | n/a | 0.000 | 0.000 | 0.928 | 483.106 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.104 | 4.934 | 0.010 | 0.104 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000001aa | 483.219 | 3.207 | n/a | 0.000 | 0.000 | 0.605 | 479.229 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.082 | 3.207 | 0.007 | 0.082 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000001a3 | 425.686 | 1.981 | n/a | 0.000 | 0.000 | 0.821 | 422.756 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.074 | 1.981 | 0.005 | 0.074 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 479.808 | n/a | n/a | n/a | 3.882 | n/a | 0.000 | 0.000 | 0.621 | 474.142 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.092 | 4.219 | 0.008 | 0.092 |
| p99 | 1010.081 | n/a | n/a | n/a | 15.980 | n/a | 1.914 | 0.000 | 3.772 | 1002.522 | 0.371 | n/a | 0.061 | 0.000 | n/a | n/a | 45.074 | 16.922 | 0.241 | 45.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a30000000000000216 | 1010.081 | 6.227 | n/a | 0.000 | 0.000 | 1.023 | 1002.522 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.244 | 6.227 | 0.006 | 0.244 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a300000000000001fe | 1004.249 | 4.703 | n/a | 0.859 | 0.000 | 0.455 | 998.103 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.091 | 5.562 | 0.006 | 0.091 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000217 | 998.369 | 3.530 | n/a | 0.689 | 0.000 | 0.642 | 993.283 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.171 | 4.219 | 0.004 | 0.171 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000215 | 993.935 | 5.252 | n/a | 1.040 | 0.000 | 3.446 | 983.999 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.147 | 6.292 | 0.006 | 0.147 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000207 | 992.014 | 3.178 | n/a | 0.660 | 0.000 | 0.533 | 987.507 | 0.018 | n/a | 0.026 | 0.000 | n/a | n/a | 0.092 | 3.838 | 0.004 | 0.092 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000001ea | 991.601 | 2.226 | n/a | 0.000 | 0.000 | 0.586 | 988.682 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.064 | 2.226 | 0.002 | 0.064 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000211 | 987.488 | 3.502 | n/a | 0.694 | 0.000 | 0.366 | 982.810 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.083 | 4.196 | 0.004 | 0.083 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000001f7 | 937.329 | 2.685 | n/a | 0.000 | 0.000 | 0.569 | 933.887 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.140 | 2.685 | 0.003 | 0.140 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000212 | 921.074 | 13.593 | n/a | 1.899 | 0.000 | 0.499 | 904.774 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.267 | 15.492 | 0.017 | 0.267 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a300000000000001f5 | 820.535 | 3.780 | n/a | 0.000 | 0.000 | 0.489 | 815.966 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.242 | 3.780 | 0.005 | 0.242 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000001e8 | 790.419 | 3.559 | n/a | 0.000 | 0.000 | 0.942 | 785.743 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.104 | 3.559 | 0.005 | 0.104 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a300000000000001ff | 681.416 | 3.011 | n/a | 0.689 | 0.000 | 1.014 | 676.563 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.091 | 3.700 | 0.005 | 0.091 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000001de | 620.940 | 7.219 | n/a | 0.000 | 0.000 | 1.832 | 611.688 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.167 | 7.219 | 0.012 | 0.167 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a3000000000000020f | 620.262 | 4.098 | n/a | 0.785 | 0.000 | 0.778 | 614.496 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.065 | 4.883 | 0.008 | 0.065 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000001f0 | 605.521 | 1.781 | n/a | 0.000 | 0.000 | 0.386 | 603.248 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.071 | 1.781 | 0.003 | 0.071 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000001ee | 587.834 | 4.180 | n/a | 0.000 | 0.000 | 0.621 | 582.574 | 0.371 | n/a | 0.018 | 0.000 | n/a | n/a | 0.070 | 4.180 | 0.007 | 0.070 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000202 | 561.521 | 3.671 | n/a | 0.744 | 0.000 | 2.177 | 554.797 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.089 | 4.415 | 0.008 | 0.089 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000001e4 | 524.077 | 4.372 | n/a | 0.000 | 0.000 | 0.625 | 518.917 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.105 | 4.372 | 0.008 | 0.105 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a300000000000001db | 495.544 | 2.919 | n/a | 0.000 | 0.000 | 1.551 | 490.926 | 0.011 | n/a | 0.054 | 0.000 | n/a | n/a | 0.083 | 2.919 | 0.006 | 0.083 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a300000000000001dc | 487.150 | 2.369 | n/a | 0.000 | 0.000 | 0.589 | 484.076 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.070 | 2.369 | 0.005 | 0.070 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / internal (736 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.204 | n/a | n/a | n/a | 3.606 | n/a | 0.000 | 0.000 | 0.259 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.434 | 3.606 | 0.301 | 7.434 |
| p99 | 251.453 | n/a | n/a | n/a | 19.620 | n/a | 2.004 | 0.000 | 2.366 | 246.440 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 46.664 | 19.620 | 0.817 | 46.664 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a30000000000000223 | 1005.496 | 0.519 | n/a | 0.000 | 0.000 | 1.806 | 1001.711 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 1.336 | 0.519 | 0.001 | 1.336 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a30000000000000218 | 745.128 | 2.451 | n/a | 0.000 | 0.000 | 3.721 | 738.844 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.071 | 2.451 | 0.003 | 0.071 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a30000000000000225 | 674.768 | 3.809 | n/a | 0.000 | 0.000 | 0.644 | 670.120 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.146 | 3.809 | 0.006 | 0.146 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000000220 | 636.177 | 5.892 | n/a | 0.000 | 0.000 | 1.370 | 628.618 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.241 | 5.892 | 0.009 | 0.241 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a3000000000000021b | 590.911 | 2.501 | n/a | 0.000 | 0.000 | 2.366 | 585.903 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.098 | 2.501 | 0.004 | 0.098 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a30000000000000221 | 380.557 | 3.218 | n/a | 0.000 | 0.000 | 0.660 | 376.541 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.093 | 3.218 | 0.008 | 0.093 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000219 | 252.392 | 3.064 | n/a | 0.000 | 0.000 | 0.535 | 248.643 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.117 | 3.064 | 0.012 | 0.117 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a3000000000000021c | 251.453 | 4.332 | n/a | 0.000 | 0.000 | 0.574 | 246.440 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.062 | 4.332 | 0.017 | 0.062 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a3000000000000021e | 152.750 | 3.357 | n/a | 0.000 | 0.000 | 0.392 | 148.894 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.086 | 3.357 | 0.022 | 0.086 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a300000000000004d6 | 110.588 | 7.024 | n/a | 0.000 | 0.000 | 0.870 | 102.494 | 0.005 | n/a | 0.081 | 0.000 | n/a | n/a | 0.114 | 7.024 | 0.064 | 0.114 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000000305 | 105.859 | 3.441 | n/a | 0.000 | 0.000 | 0.607 | 101.688 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.075 | 3.441 | 0.033 | 0.075 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000000233 | 103.071 | 11.829 | n/a | 1.324 | 0.000 | 2.428 | 87.249 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.211 | 13.153 | 0.128 | 0.211 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000007a2 | 102.958 | 4.066 | n/a | 0.000 | 0.000 | 0.683 | 98.088 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.105 | 4.066 | 0.039 | 0.105 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a300000000000002ea | 90.711 | 9.722 | n/a | 0.000 | 0.000 | 3.318 | 76.525 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 1.115 | 9.722 | 0.107 | 1.115 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a30000000000000458 | 87.654 | 4.376 | n/a | 0.000 | 0.000 | 0.476 | 82.608 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.139 | 4.376 | 0.050 | 0.139 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a3000000000000061f | 87.425 | 8.314 | n/a | 0.000 | 0.000 | 0.513 | 78.352 | 0.009 | n/a | 0.034 | 0.000 | n/a | n/a | 0.203 | 8.314 | 0.095 | 0.203 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a30000000000000780 | 85.361 | 2.894 | n/a | 0.000 | 0.000 | 0.407 | 81.883 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.164 | 2.894 | 0.034 | 0.164 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a300000000000004df | 81.618 | 4.043 | n/a | 0.000 | 0.000 | 0.451 | 76.903 | 0.002 | n/a | 0.018 | 0.000 | n/a | n/a | 0.202 | 4.043 | 0.050 | 0.202 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a3000000000000071c | 78.542 | 3.348 | n/a | 0.000 | 0.000 | 3.217 | 71.837 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.102 | 3.348 | 0.043 | 0.102 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a3000000000000022c | 77.636 | 6.176 | n/a | 1.157 | 0.000 | 9.184 | 60.801 | 0.018 | n/a | 0.037 | 0.000 | n/a | n/a | 0.262 | 7.333 | 0.094 | 0.262 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / internal (2235 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.106 | n/a | n/a | n/a | 4.214 | n/a | 0.000 | 0.000 | 0.239 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.340 | 4.245 | 0.351 | 6.340 |
| p99 | 328.852 | n/a | n/a | n/a | 19.605 | n/a | 1.602 | 0.000 | 2.151 | 323.313 | 0.011 | n/a | 0.036 | 0.000 | n/a | n/a | 46.375 | 20.901 | 0.837 | 46.375 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| dd86797d643366a30000000000001a46 | 1004.091 | 3.379 | n/a | 0.000 | 0.000 | 0.480 | 1000.122 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.080 | 3.379 | 0.003 | 0.080 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a30000000000001a4f | 1003.492 | 0.116 | n/a | 0.000 | 0.000 | 1.439 | 1000.765 | 0.019 | n/a | 0.048 | 0.000 | n/a | n/a | 1.105 | 0.116 | 0.000 | 1.105 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000001a92 | 1002.292 | 0.154 | n/a | 0.000 | 0.000 | 0.469 | 1000.503 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 1.126 | 0.154 | 0.000 | 1.126 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a30000000000001a8a | 1000.631 | 2.370 | n/a | 0.000 | 0.000 | 2.151 | 995.978 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.062 | 2.370 | 0.002 | 0.062 | gw-r/thread-68/journal/page | none observed |
| dd86797d643366a30000000000001a69 | 996.224 | 2.483 | n/a | 0.000 | 0.000 | 0.287 | 993.365 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.063 | 2.483 | 0.002 | 0.063 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a30000000000001a45 | 993.704 | 7.511 | n/a | 0.000 | 0.000 | 0.663 | 985.315 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.182 | 7.511 | 0.008 | 0.182 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000001a8e | 993.588 | 4.975 | n/a | 0.000 | 0.000 | 0.428 | 988.021 | 0.011 | n/a | 0.035 | 0.000 | n/a | n/a | 0.118 | 4.975 | 0.005 | 0.118 | gw-r/thread-47/journal/page | none observed |
| dd86797d643366a30000000000001a6b | 897.244 | 3.115 | n/a | 0.000 | 0.000 | 0.568 | 893.433 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.080 | 3.115 | 0.003 | 0.080 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000001a4a | 847.448 | 8.095 | n/a | 0.000 | 0.000 | 0.954 | 838.180 | 0.010 | n/a | 0.031 | 0.000 | n/a | n/a | 0.178 | 8.095 | 0.010 | 0.178 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000001a5a | 803.681 | 8.604 | n/a | 0.000 | 0.000 | 0.823 | 794.018 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.195 | 8.604 | 0.011 | 0.195 | gw-r/thread-49/journal/page | none observed |
| dd86797d643366a30000000000001a47 | 763.457 | 10.929 | n/a | 0.000 | 0.000 | 0.364 | 751.828 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.303 | 10.929 | 0.014 | 0.303 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a30000000000001a65 | 709.590 | 2.354 | n/a | 0.000 | 0.000 | 0.578 | 706.538 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.080 | 2.354 | 0.003 | 0.080 | gw-r/thread-68/journal/page | none observed |
| dd86797d643366a30000000000001a60 | 680.164 | 5.198 | n/a | 0.000 | 0.000 | 0.453 | 674.331 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.153 | 5.198 | 0.008 | 0.153 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000001a8b | 661.491 | 2.181 | n/a | 0.000 | 0.000 | 2.404 | 656.803 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.069 | 2.181 | 0.003 | 0.069 | gw-r/thread-42/journal/page | none observed |
| dd86797d643366a30000000000001a83 | 641.360 | 2.945 | n/a | 0.000 | 0.000 | 1.138 | 637.170 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.065 | 2.945 | 0.005 | 0.065 | gw-r/thread-46/journal/page | none observed |
| dd86797d643366a30000000000001a79 | 580.246 | 3.747 | n/a | 0.000 | 0.000 | 0.580 | 575.786 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.085 | 3.747 | 0.006 | 0.085 | gw-r/thread-48/journal/page | none observed |
| dd86797d643366a30000000000001a85 | 479.461 | 2.577 | n/a | 0.000 | 0.000 | 0.591 | 476.172 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.081 | 2.577 | 0.005 | 0.081 | gw-r/thread-45/journal/page | none observed |
| dd86797d643366a30000000000001a51 | 477.881 | 5.949 | n/a | 0.000 | 0.000 | 0.362 | 471.407 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 0.126 | 5.949 | 0.012 | 0.126 | gw-r/thread-44/journal/page | none observed |
| dd86797d643366a30000000000001a6d | 465.512 | 12.325 | n/a | 1.324 | 0.000 | 0.650 | 450.733 | 0.006 | n/a | 0.018 | 0.000 | n/a | n/a | 0.456 | 13.649 | 0.029 | 0.456 | gw-r/thread-68/journal/page | none observed |
| dd86797d643366a30000000000001a86 | 449.427 | 2.765 | n/a | 0.000 | 0.000 | 0.764 | 445.744 | 0.073 | n/a | 0.010 | 0.000 | n/a | n/a | 0.071 | 2.765 | 0.006 | 0.071 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (72 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.740 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.936 | 201.275 | 0.015 | n/a | 0.139 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 208.825 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.418 | 206.371 | 8.014 | n/a | 30.380 | 0.000 | n/a | n/a | 49.491 | 0.000 | 0.000 | 49.491 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9e401c26bca4621a000000000000001e | 208.825 | 0.000 | n/a | 0.000 | 0.000 | 1.647 | 205.409 | 0.108 | n/a | 1.447 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000048 | 207.406 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 206.371 | 0.016 | n/a | 0.171 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000031 | 206.974 | 0.000 | n/a | 0.000 | 0.000 | 0.923 | 205.653 | 0.025 | n/a | 0.264 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000058 | 206.864 | 0.000 | n/a | 0.000 | 0.000 | 5.366 | 201.153 | 0.018 | n/a | 0.130 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a000000000000000f | 206.694 | 0.000 | n/a | 0.000 | 0.000 | 0.483 | 205.734 | 0.052 | n/a | 0.318 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a0000000000000020 | 206.639 | 0.000 | n/a | 0.000 | 0.000 | 5.418 | 200.889 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a000000000000002a | 206.313 | 0.000 | n/a | 0.000 | 0.000 | 1.667 | 204.128 | 0.014 | n/a | 0.379 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-65/journal/page | none observed |
| 9e401c26bca4621a000000000000004a | 206.192 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 204.527 | 0.073 | n/a | 0.148 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-65/journal/page | none observed |
| 9e401c26bca4621a0000000000000030 | 205.850 | 0.000 | n/a | 0.000 | 0.000 | 2.681 | 202.883 | 0.012 | n/a | 0.139 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a0000000000000049 | 205.712 | 0.000 | n/a | 0.000 | 0.000 | 1.371 | 201.714 | 2.281 | n/a | 0.200 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a000000000000000d | 205.661 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 204.565 | 0.014 | n/a | 0.129 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000036 | 205.545 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 204.618 | 0.020 | n/a | 0.158 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a0000000000000021 | 205.431 | 0.000 | n/a | 0.000 | 0.000 | 0.963 | 204.177 | 0.014 | n/a | 0.127 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a000000000000003e | 204.861 | 0.000 | n/a | 0.000 | 0.000 | 2.920 | 201.616 | 0.015 | n/a | 0.132 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-65/journal/page | none observed |
| 9e401c26bca4621a0000000000000046 | 204.847 | 0.000 | n/a | 0.000 | 0.000 | 3.240 | 201.330 | 0.018 | n/a | 0.150 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000025 | 204.769 | 0.000 | n/a | 0.000 | 0.000 | 1.301 | 203.057 | 0.014 | n/a | 0.192 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a000000000000005a | 204.216 | 0.000 | n/a | 0.000 | 0.000 | 1.153 | 202.768 | 0.010 | n/a | 0.124 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-65/journal/page | none observed |
| 9e401c26bca4621a0000000000000015 | 203.724 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 200.970 | 1.569 | n/a | 0.102 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-65/journal/page | none observed |
| 9e401c26bca4621a0000000000000052 | 203.674 | 0.000 | n/a | 0.000 | 0.000 | 2.055 | 201.275 | 0.025 | n/a | 0.196 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000040 | 203.631 | 0.000 | n/a | 0.000 | 0.000 | 0.491 | 202.847 | 0.051 | n/a | 0.137 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.420 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 201.108 | 0.015 | n/a | 0.111 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 |
| p99 | 225.775 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 17.688 | 217.901 | 10.573 | n/a | 3.808 | 0.000 | n/a | n/a | 0.487 | 0.000 | 0.000 | 0.487 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9e401c26bca4621a0000000000000081 | 225.775 | 0.000 | n/a | 0.000 | 0.000 | 17.688 | 207.803 | 0.010 | n/a | 0.116 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000072 | 219.536 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 217.901 | 0.023 | n/a | 0.259 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a000000000000007c | 206.344 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 205.366 | 0.012 | n/a | 0.103 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000062 | 206.170 | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 204.780 | 0.019 | n/a | 0.170 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a00000000000000be | 206.112 | 0.000 | n/a | 0.000 | 0.000 | 0.467 | 201.411 | 3.641 | n/a | 0.454 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a00000000000000ba | 205.626 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 204.650 | 0.019 | n/a | 0.183 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a000000000000007e | 204.877 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 203.436 | 0.041 | n/a | 0.239 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a00000000000000ab | 204.304 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 203.227 | 0.017 | n/a | 0.092 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000073 | 204.254 | 0.000 | n/a | 0.000 | 0.000 | 1.182 | 202.754 | 0.016 | n/a | 0.193 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-65/journal/page | none observed |
| 9e401c26bca4621a000000000000006a | 204.132 | 0.000 | n/a | 0.000 | 0.000 | 2.151 | 201.622 | 0.016 | n/a | 0.098 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a000000000000008c | 204.091 | 0.000 | n/a | 0.000 | 0.000 | 1.941 | 201.652 | 0.052 | n/a | 0.202 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a0000000000000063 | 203.947 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 202.853 | 0.127 | n/a | 0.242 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a000000000000006c | 203.757 | 0.000 | n/a | 0.000 | 0.000 | 0.694 | 202.809 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000077 | 203.712 | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 202.406 | 0.060 | n/a | 0.305 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a000000000000006d | 203.520 | 0.000 | n/a | 0.000 | 0.000 | 1.878 | 201.276 | 0.024 | n/a | 0.136 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a000000000000007a | 203.414 | 0.000 | n/a | 0.000 | 0.000 | 1.513 | 201.620 | 0.016 | n/a | 0.130 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a00000000000000a9 | 203.392 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 198.645 | 0.029 | n/a | 3.808 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000069 | 203.348 | 0.000 | n/a | 0.000 | 0.000 | 2.367 | 200.765 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-65/journal/page | none observed |
| 9e401c26bca4621a000000000000008f | 203.276 | 0.000 | n/a | 0.000 | 0.000 | 1.252 | 201.638 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.279 | 0.000 | 0.000 | 0.279 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000093 | 203.265 | 0.000 | n/a | 0.000 | 0.000 | 2.042 | 200.927 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.240 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 201.081 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 206.286 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.621 | 204.563 | 5.898 | n/a | 0.514 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9e401c26bca4621a00000000000000fe | 206.286 | 0.000 | n/a | 0.000 | 0.000 | 3.732 | 202.192 | 0.018 | n/a | 0.190 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a000000000000010d | 206.227 | 0.000 | n/a | 0.000 | 0.000 | 4.621 | 201.304 | 0.008 | n/a | 0.103 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a00000000000000e2 | 206.129 | 0.000 | n/a | 0.000 | 0.000 | 1.211 | 204.563 | 0.032 | n/a | 0.110 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000113 | 205.778 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 204.438 | 0.091 | n/a | 0.206 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000103 | 205.599 | 0.000 | n/a | 0.000 | 0.000 | 0.988 | 204.227 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a00000000000000fb | 205.296 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 204.052 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a000000000000010c | 205.231 | 0.000 | n/a | 0.000 | 0.000 | 4.338 | 200.723 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a00000000000000ca | 204.591 | 0.000 | n/a | 0.000 | 0.000 | 1.885 | 202.488 | 0.008 | n/a | 0.093 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a00000000000000f1 | 204.407 | 0.000 | n/a | 0.000 | 0.000 | 1.952 | 202.035 | 0.014 | n/a | 0.129 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a000000000000011a | 204.358 | 0.000 | n/a | 0.000 | 0.000 | 1.904 | 202.051 | 0.019 | n/a | 0.141 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a00000000000000fd | 203.974 | 0.000 | n/a | 0.000 | 0.000 | 1.188 | 202.371 | 0.022 | n/a | 0.166 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000111 | 203.964 | 0.000 | n/a | 0.000 | 0.000 | 1.471 | 202.230 | 0.029 | n/a | 0.115 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a00000000000000e7 | 203.910 | 0.000 | n/a | 0.000 | 0.000 | 1.110 | 202.642 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a000000000000011e | 203.271 | 0.000 | n/a | 0.000 | 0.000 | 2.068 | 200.979 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a00000000000000d2 | 203.255 | 0.000 | n/a | 0.000 | 0.000 | 1.071 | 201.529 | 0.008 | n/a | 0.400 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a00000000000000ee | 203.213 | 0.000 | n/a | 0.000 | 0.000 | 1.853 | 201.163 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a00000000000000dc | 203.017 | 0.000 | n/a | 0.000 | 0.000 | 1.938 | 200.843 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-65/journal/page | none observed |
| 9e401c26bca4621a00000000000000e8 | 203.014 | 0.000 | n/a | 0.000 | 0.000 | 1.385 | 201.326 | 0.014 | n/a | 0.098 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a00000000000000fc | 202.979 | 0.000 | n/a | 0.000 | 0.000 | 1.241 | 201.372 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a00000000000000d0 | 202.976 | 0.000 | n/a | 0.000 | 0.000 | 1.637 | 201.081 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.768 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 200.912 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 |
| p99 | 207.387 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.719 | 204.195 | 3.774 | n/a | 0.148 | 0.000 | n/a | n/a | 0.341 | 0.000 | 0.000 | 0.341 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9e401c26bca4621a000000000000013d | 207.387 | 0.000 | n/a | 0.000 | 0.000 | 4.719 | 202.421 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a0000000000000150 | 205.032 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 204.195 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a0000000000000174 | 204.636 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 203.684 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000155 | 204.290 | 0.000 | n/a | 0.000 | 0.000 | 0.829 | 203.271 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a000000000000013b | 203.945 | 0.000 | n/a | 0.000 | 0.000 | 2.038 | 201.695 | 0.011 | n/a | 0.046 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a000000000000012c | 203.701 | 0.000 | n/a | 0.000 | 0.000 | 1.424 | 201.907 | 0.036 | n/a | 0.148 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a000000000000016e | 203.501 | 0.000 | n/a | 0.000 | 0.000 | 1.095 | 202.093 | 0.012 | n/a | 0.126 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000149 | 203.389 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 202.327 | 0.016 | n/a | 0.123 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a000000000000012a | 203.350 | 0.000 | n/a | 0.000 | 0.000 | 1.935 | 201.138 | 0.014 | n/a | 0.090 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000163 | 203.158 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 202.107 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000139 | 203.008 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 201.960 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a000000000000018d | 202.740 | 0.000 | n/a | 0.000 | 0.000 | 1.059 | 201.381 | 0.017 | n/a | 0.120 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000192 | 202.733 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 201.313 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a000000000000016d | 202.700 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 201.261 | 0.008 | n/a | 0.108 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000188 | 202.675 | 0.000 | n/a | 0.000 | 0.000 | 0.666 | 201.570 | 0.015 | n/a | 0.090 | 0.000 | n/a | n/a | 0.334 | 0.000 | 0.000 | 0.334 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000156 | 202.603 | 0.000 | n/a | 0.000 | 0.000 | 1.314 | 200.975 | 0.012 | n/a | 0.062 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000167 | 202.561 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 201.349 | 0.008 | n/a | 0.106 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a000000000000015e | 202.504 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 201.175 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000173 | 202.495 | 0.000 | n/a | 0.000 | 0.000 | 1.248 | 200.997 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a000000000000017f | 202.479 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 201.442 | 0.018 | n/a | 0.130 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.643 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 200.836 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 206.347 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.010 | 205.373 | 3.891 | n/a | 0.226 | 0.000 | n/a | n/a | 0.486 | 0.000 | 0.000 | 0.486 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9e401c26bca4621a00000000000001a3 | 206.597 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 205.373 | 0.021 | n/a | 0.063 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a00000000000001d7 | 206.347 | 0.000 | n/a | 0.000 | 0.000 | 0.453 | 205.706 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a00000000000001a9 | 205.752 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 204.539 | 0.018 | n/a | 0.076 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a00000000000001eb | 205.715 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 204.548 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a00000000000001ba | 205.571 | 0.000 | n/a | 0.000 | 0.000 | 1.233 | 204.162 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a00000000000001af | 204.289 | 0.000 | n/a | 0.000 | 0.000 | 1.843 | 202.013 | 0.031 | n/a | 0.108 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a00000000000001ae | 203.937 | 0.710 | n/a | 0.000 | 0.000 | 1.101 | 201.752 | 0.023 | n/a | 0.099 | 0.000 | n/a | n/a | 0.252 | 0.710 | 0.003 | 0.252 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a00000000000001b0 | 203.354 | 0.000 | n/a | 0.000 | 0.000 | 1.264 | 201.469 | 0.008 | n/a | 0.127 | 0.000 | n/a | n/a | 0.486 | 0.000 | 0.000 | 0.486 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a00000000000001a8 | 202.830 | 0.000 | n/a | 0.000 | 0.000 | 1.469 | 201.099 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a00000000000001ab | 202.706 | 0.000 | n/a | 0.000 | 0.000 | 0.981 | 201.420 | 0.021 | n/a | 0.103 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a00000000000001b4 | 202.622 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 201.349 | 0.006 | n/a | 0.094 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a00000000000001c1 | 202.507 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 201.479 | 0.009 | n/a | 0.134 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000198 | 202.478 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.204 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a00000000000001e6 | 202.474 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 201.396 | 0.006 | n/a | 0.113 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a00000000000001bc | 202.435 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 201.176 | 0.013 | n/a | 0.060 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a00000000000001d0 | 202.430 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 201.264 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a00000000000001f6 | 202.399 | 0.000 | n/a | 0.000 | 0.000 | 1.229 | 200.889 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a00000000000001e4 | 202.392 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 201.384 | 0.005 | n/a | 0.226 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a00000000000001cf | 202.389 | 0.000 | n/a | 0.000 | 0.000 | 1.154 | 201.008 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a00000000000001d9 | 202.331 | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 201.274 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.726 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 200.835 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 204.795 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.304 | 203.718 | 3.521 | n/a | 0.145 | 0.000 | n/a | n/a | 0.489 | 0.000 | 0.000 | 0.489 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9e401c26bca4621a000000000000021b | 208.108 | 0.000 | n/a | 0.000 | 0.000 | 2.869 | 205.065 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000268 | 204.795 | 0.000 | n/a | 0.000 | 0.000 | 3.304 | 201.194 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000245 | 204.746 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 203.718 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000221 | 204.065 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 202.816 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a0000000000000223 | 203.761 | 0.000 | n/a | 0.000 | 0.000 | 2.624 | 200.951 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000249 | 203.643 | 0.000 | n/a | 0.000 | 0.000 | 2.676 | 200.738 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a0000000000000234 | 203.625 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 201.983 | 0.013 | n/a | 0.305 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000235 | 203.383 | 0.000 | n/a | 0.000 | 0.000 | 1.312 | 201.830 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a000000000000021f | 202.909 | 0.000 | n/a | 0.000 | 0.000 | 0.468 | 202.282 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000269 | 202.804 | 0.000 | n/a | 0.000 | 0.000 | 1.305 | 201.196 | 0.007 | n/a | 0.106 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000236 | 202.799 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 201.644 | 0.023 | n/a | 0.133 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a000000000000020c | 202.699 | 0.000 | n/a | 0.000 | 0.000 | 1.573 | 200.940 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a0000000000000210 | 202.629 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 201.547 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a000000000000026d | 202.627 | 0.000 | n/a | 0.000 | 0.000 | 1.329 | 201.028 | 0.012 | n/a | 0.090 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a000000000000022c | 202.590 | 0.000 | n/a | 0.000 | 0.000 | 1.374 | 201.007 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a000000000000023c | 202.570 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 201.411 | 0.021 | n/a | 0.106 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a000000000000023b | 202.545 | 0.000 | n/a | 0.000 | 0.000 | 1.045 | 201.135 | 0.009 | n/a | 0.112 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000244 | 202.535 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 201.552 | 0.037 | n/a | 0.076 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a000000000000024b | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 201.382 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000256 | 202.351 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 201.208 | 0.039 | n/a | 0.079 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-42/journal/page | none observed |

## P3 / L1024 / read (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.898 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.634 | 71.062 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 207.113 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.367 | 205.214 | 2.318 | n/a | 0.336 | 0.000 | n/a | n/a | 0.469 | 0.000 | 0.000 | 0.469 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9e401c26bca4621a0000000000000290 | 207.113 | 0.000 | n/a | 0.000 | 0.000 | 1.033 | 205.214 | 0.061 | n/a | 0.336 | 0.000 | n/a | n/a | 0.469 | 0.000 | 0.000 | 0.469 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a000000000000028d | 206.025 | 0.000 | n/a | 0.000 | 0.000 | 4.023 | 201.776 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a000000000000028f | 205.027 | 0.000 | n/a | 0.000 | 0.000 | 2.111 | 202.403 | 0.019 | n/a | 0.200 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a000000000000027c | 203.784 | 0.000 | n/a | 0.000 | 0.000 | 2.637 | 200.972 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000289 | 203.076 | 0.000 | n/a | 0.000 | 0.000 | 1.137 | 201.637 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a000000000000028e | 202.947 | 0.000 | n/a | 0.000 | 0.000 | 1.188 | 201.478 | 0.023 | n/a | 0.068 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000288 | 202.618 | 0.000 | n/a | 0.000 | 0.000 | 1.117 | 201.236 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000285 | 202.357 | 0.000 | n/a | 0.000 | 0.000 | 1.127 | 201.017 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a000000000000028b | 202.290 | 0.000 | n/a | 0.000 | 0.000 | 1.229 | 200.808 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a0000000000000294 | 202.141 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 200.857 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a0000000000000293 | 202.050 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 200.919 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000282 | 201.905 | 0.000 | n/a | 0.000 | 0.000 | 0.494 | 201.193 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a000000000000027d | 201.819 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 200.914 | 0.014 | n/a | 0.067 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a0000000000000292 | 201.610 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 200.691 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a000000000000027e | 201.552 | 0.000 | n/a | 0.000 | 0.000 | 0.634 | 200.754 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000283 | 201.406 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 200.692 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000280 | 201.081 | 0.000 | n/a | 0.000 | 0.000 | 0.364 | 200.587 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a000000000000028a | 185.353 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 184.234 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 9e401c26bca4621a000000000000028c | 158.780 | 0.000 | n/a | 0.000 | 0.000 | 0.538 | 155.688 | 2.318 | n/a | 0.039 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000287 | 149.475 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 148.862 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / read (221 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.848 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 86.153 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 205.946 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.285 | 201.580 | 2.186 | n/a | 0.128 | 0.000 | n/a | n/a | 51.385 | 0.000 | 0.000 | 51.385 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9e401c26bca4621a0000000000000ee4 | 212.333 | 0.000 | n/a | 0.000 | 0.000 | 7.973 | 204.143 | 0.015 | n/a | 0.054 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000ea1 | 210.387 | 0.000 | n/a | 0.000 | 0.000 | 6.759 | 201.456 | 0.026 | n/a | 1.132 | 0.000 | n/a | n/a | 1.014 | 0.000 | 0.000 | 1.014 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000ea2 | 205.946 | 0.000 | n/a | 0.000 | 0.000 | 4.285 | 201.263 | 0.008 | n/a | 0.195 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a0000000000000e8b | 203.230 | 0.000 | n/a | 0.000 | 0.000 | 1.769 | 201.222 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000edf | 203.050 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 201.992 | 0.011 | n/a | 0.128 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000ed8 | 202.975 | 0.000 | n/a | 0.000 | 0.000 | 1.910 | 200.760 | 0.018 | n/a | 0.120 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000eee | 202.636 | 0.000 | n/a | 0.000 | 0.000 | 1.921 | 200.585 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000e9b | 202.506 | 0.000 | n/a | 0.000 | 0.000 | 1.291 | 201.021 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000ed9 | 202.419 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 201.580 | 0.029 | n/a | 0.106 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a0000000000000eb4 | 202.268 | 0.000 | n/a | 0.000 | 0.000 | 1.305 | 200.815 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000eeb | 202.134 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 200.891 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000e92 | 201.954 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 201.105 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000eb7 | 201.929 | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 200.947 | 0.012 | n/a | 0.054 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-48/journal/page | none observed |
| 9e401c26bca4621a0000000000000eea | 201.913 | 0.000 | n/a | 0.000 | 0.000 | 0.560 | 201.162 | 0.015 | n/a | 0.064 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 9e401c26bca4621a0000000000000efc | 201.846 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 200.882 | 0.013 | n/a | 0.058 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-45/journal/page | none observed |
| 9e401c26bca4621a0000000000000eca | 201.846 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 200.841 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-44/journal/page | none observed |
| 9e401c26bca4621a0000000000000efa | 201.796 | 0.000 | n/a | 0.000 | 0.000 | 0.589 | 200.963 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-42/journal/page | none observed |
| 9e401c26bca4621a0000000000000ec9 | 201.787 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 200.844 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000ee5 | 201.777 | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 200.834 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |
| 9e401c26bca4621a0000000000000ecf | 201.762 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 200.837 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

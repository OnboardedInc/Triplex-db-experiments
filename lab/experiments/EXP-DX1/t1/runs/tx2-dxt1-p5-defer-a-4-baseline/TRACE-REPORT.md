# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (124.562 ms, trace `1348aeeee24ee8ff00000000000014c9`); `node-14/thread-0/driver.queue.subject` (99.524 ms, trace `1348aeeee24ee8ff00000000000014d1`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (48.902 ms, trace `1348aeeee24ee8ff0000000000000101`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (124.401 ms, trace `1348aeeee24ee8ff0000000000000230`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (34.901 ms, trace `1348aeeee24ee8ff00000000000014c3`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-defer-a-4-baseline`; source `5c315e43102d54fcc193e8baaab318166f8b6c12`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 7277771.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 229 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13658.032 | 357.240 | 15.730 | 462 |
| L1 | 0 | 19968.054 | 398.581 | 6.832 | 668 |
| L4 | 0 | 19976.635 | 445.294 | 22.760 | 628 |
| L16 | 0 | 19879.535 | 568.295 | 9.656 | 686 |
| L64 | 0 | 19967.952 | 416.249 | 13.975 | 870 |
| L256 | 0 | 19977.381 | 395.029 | 9.906 | 688 |
| L1024 | 0 | 19986.053 | 3856.332 | 32.071 | 17455 |
| tail | 0 | 64352.625 | 11870.510 | 111.485 | 52531 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 1348aeeee24ee8ff00000000000014c9 | driver.queue.subject | 124.562 | 1348aeeee24ee8ff00000000000014c8 | 6 / 32 |
| 1348aeeee24ee8ff00000000000014c9 | driver.queue.scheduler-late | 0.498 | none | 6 / 32 |
| 1348aeeee24ee8ff00000000000014c9 | driver.queue.scheduler-dispatch | 0.117 | none | 4 / 32 |

Observed active steps while trace 1348aeeee24ee8ff00000000000014c9 waited: [{"at":1794637763427.9697,"inFlight":5,"capacity":32,"active":[{"traceId":"1348aeeee24ee8ff00000000000014c4","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014c5","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014c6","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014c7","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014cc","step":"client.http"}]},{"at":1794637763467.1477,"inFlight":3,"capacity":32,"active":[{"traceId":"1348aeeee24ee8ff00000000000014c7","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014cc","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014c8","step":"client.http"}]},{"at":1794637763516.3228,"inFlight":5,"capacity":32,"active":[{"traceId":"1348aeeee24ee8ff00000000000014c8","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014d0","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014d2","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014da","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014dc","step":"client.http"}]}]

| 1348aeeee24ee8ff00000000000014d1 | driver.queue.subject | 99.524 | 1348aeeee24ee8ff00000000000014c9 | 4 / 32 |
| 1348aeeee24ee8ff00000000000014d1 | driver.queue.scheduler-late | 23.368 | none | 4 / 32 |
| 1348aeeee24ee8ff00000000000014d1 | driver.queue.scheduler-dispatch | 0.132 | none | 3 / 32 |

Observed active steps while trace 1348aeeee24ee8ff00000000000014d1 waited: [{"at":1794637763467.1477,"inFlight":3,"capacity":32,"active":[{"traceId":"1348aeeee24ee8ff00000000000014c7","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014cc","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014c8","step":"client.http"}]},{"at":1794637763516.3228,"inFlight":5,"capacity":32,"active":[{"traceId":"1348aeeee24ee8ff00000000000014c8","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014d0","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014d2","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014da","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014dc","step":"client.http"}]},{"at":1794637763554.7866,"inFlight":3,"capacity":32,"active":[{"traceId":"1348aeeee24ee8ff00000000000014c9","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014df","step":"client.http"},{"traceId":"1348aeeee24ee8ff00000000000014db","step":"client.http"}]}]

| 1348aeeee24ee8ff0000000000000101 | driver.queue.scheduler-dispatch | 0.513 | none | 0 / 32 |
| 1348aeeee24ee8ff0000000000000101 | driver.queue.scheduler-late | 0.007 | none | 0 / 32 |

Observed active steps while trace 1348aeeee24ee8ff0000000000000101 waited: []

| 1348aeeee24ee8ff0000000000000230 | driver.queue.scheduler-late | 0.814 | none | 0 / 32 |
| 1348aeeee24ee8ff0000000000000230 | driver.queue.scheduler-dispatch | 0.094 | none | 0 / 32 |

Observed active steps while trace 1348aeeee24ee8ff0000000000000230 waited: []

| 1348aeeee24ee8ff00000000000014c3 | driver.queue.scheduler-late | 30.573 | none | 1 / 32 |
| 1348aeeee24ee8ff00000000000014c3 | driver.queue.scheduler-dispatch | 0.550 | none | 1 / 32 |

Observed active steps while trace 1348aeeee24ee8ff00000000000014c3 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.495 | 0.617 | 0.000 | 1.075 | 5.678 | 0.016 | 0.000 | 0.198 | 1.835 | 9.683 | 0.079 | n/a | 0.254 | 17.201 | n/a | n/a | 0.061 | 6.775 | 0.201 | 0.061 |
| p99 | 131.239 | 5.505 | 0.023 | 9.032 | 17.137 | 4.189 | 4.900 | 1.301 | 6.161 | 59.030 | 0.493 | n/a | 4.991 | 113.658 | n/a | n/a | 0.476 | 20.859 | 0.357 | 0.476 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff0000000000000101 | 131.239 | 7.965 | 4.189 | 0.000 | 0.520 | 6.161 | 59.030 | 0.159 | n/a | 4.064 | 48.902 | n/a | n/a | 0.250 | 12.674 | 0.097 | 0.250 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 5.399ms |
| 1348aeeee24ee8ff00000000000000fa | 126.704 | 5.234 | 0.006 | 0.000 | 0.519 | 1.901 | 4.501 | 0.080 | n/a | 0.725 | 113.658 | n/a | n/a | 0.081 | 5.759 | 0.045 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000108 | 100.994 | 14.827 | 0.011 | 1.730 | 0.485 | 2.571 | 28.530 | 0.162 | n/a | 4.991 | 47.643 | n/a | n/a | 0.043 | 17.053 | 0.169 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000000f5 | 75.228 | 15.863 | 0.723 | 0.000 | 0.088 | 5.078 | 17.884 | 0.191 | n/a | 0.254 | 35.089 | n/a | n/a | 0.058 | 16.674 | 0.222 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000107 | 74.201 | 6.227 | 0.345 | 0.000 | 0.330 | 1.807 | 25.652 | 0.058 | n/a | 0.108 | 39.594 | n/a | n/a | 0.079 | 6.902 | 0.093 | 0.079 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000000f1 | 68.965 | 17.137 | 0.016 | 3.089 | 0.616 | 0.990 | 8.820 | 0.130 | n/a | 2.918 | 34.772 | n/a | n/a | 0.476 | 20.859 | 0.302 | 0.476 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000000f9 | 60.977 | 11.611 | 0.451 | 0.000 | 0.178 | 2.870 | 18.124 | 0.106 | n/a | 2.584 | 24.914 | n/a | n/a | 0.139 | 12.240 | 0.201 | 0.139 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000105 | 58.146 | 5.461 | 0.312 | 0.000 | 0.094 | 2.094 | 28.384 | 0.119 | n/a | 0.215 | 21.324 | n/a | n/a | 0.141 | 5.867 | 0.101 | 0.141 | gw-w/thread-48/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff000000000000011f | 53.747 | 5.079 | 0.388 | 0.000 | 0.085 | 3.046 | 29.296 | 0.091 | n/a | 0.237 | 15.472 | n/a | n/a | 0.052 | 5.553 | 0.103 | 0.052 | gw-w/thread-41/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff000000000000011b | 51.602 | 6.114 | 0.317 | 0.539 | 0.085 | 5.005 | 19.207 | 0.079 | n/a | 0.133 | 20.060 | n/a | n/a | 0.061 | 7.055 | 0.137 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000102 | 49.446 | 12.561 | 0.011 | 4.900 | 0.198 | 1.248 | 4.983 | 0.104 | n/a | 2.014 | 23.293 | n/a | n/a | 0.133 | 17.670 | 0.357 | 0.133 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000000fd | 45.002 | 5.023 | 0.212 | 0.000 | 0.058 | 3.932 | 19.220 | 0.046 | n/a | 0.123 | 16.334 | n/a | n/a | 0.052 | 5.294 | 0.118 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000113 | 44.018 | 7.622 | 0.555 | 0.000 | 0.080 | 5.172 | 16.101 | 0.050 | n/a | 0.464 | 13.915 | n/a | n/a | 0.061 | 8.256 | 0.188 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000010d | 43.091 | 7.576 | 0.313 | 0.000 | 0.120 | 2.281 | 12.964 | 0.127 | n/a | 1.715 | 17.902 | n/a | n/a | 0.093 | 8.009 | 0.186 | 0.093 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000010a | 40.495 | 3.815 | 0.005 | 0.000 | 0.435 | 0.830 | 8.078 | 0.041 | n/a | 0.098 | 27.141 | n/a | n/a | 0.052 | 4.255 | 0.105 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000117 | 37.735 | 6.416 | 0.315 | 0.000 | 0.077 | 1.933 | 14.004 | 0.069 | n/a | 0.457 | 14.411 | n/a | n/a | 0.055 | 6.808 | 0.180 | 0.055 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000118 | 36.782 | 7.103 | 0.006 | 1.765 | 0.764 | 1.775 | 2.229 | 0.039 | n/a | 0.091 | 22.967 | n/a | n/a | 0.043 | 9.638 | 0.262 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000010f | 35.477 | 10.975 | 0.449 | 0.000 | 0.078 | 1.835 | 9.954 | 0.097 | n/a | 0.137 | 11.892 | n/a | n/a | 0.059 | 11.503 | 0.324 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000000fe | 35.169 | 8.401 | 0.009 | 0.000 | 1.301 | 1.810 | 1.562 | 0.050 | n/a | 0.575 | 21.341 | n/a | n/a | 0.121 | 9.711 | 0.276 | 0.121 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000123 | 35.164 | 5.156 | 0.299 | 0.367 | 0.132 | 1.924 | 9.683 | 0.115 | n/a | 0.230 | 17.201 | n/a | n/a | 0.056 | 5.955 | 0.169 | 0.056 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.195 | 0.884 | 0.000 | 1.801 | 4.735 | 0.008 | 0.000 | 0.857 | 1.086 | 1.723 | 0.050 | n/a | 0.483 | 12.578 | n/a | n/a | 0.064 | 5.759 | 0.233 | 0.064 |
| p99 | 126.704 | 2.077 | 0.023 | 3.414 | 8.401 | 0.012 | 0.000 | 1.301 | 2.793 | 4.501 | 0.493 | n/a | 0.725 | 113.658 | n/a | n/a | 0.316 | 9.711 | 0.311 | 0.316 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff00000000000000fa | 126.704 | 5.234 | 0.006 | 0.000 | 0.519 | 1.901 | 4.501 | 0.080 | n/a | 0.725 | 113.658 | n/a | n/a | 0.081 | 5.759 | 0.045 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000000fe | 35.169 | 8.401 | 0.009 | 0.000 | 1.301 | 1.810 | 1.562 | 0.050 | n/a | 0.575 | 21.341 | n/a | n/a | 0.121 | 9.711 | 0.276 | 0.121 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000114 | 22.462 | 5.597 | 0.012 | 0.000 | 1.166 | 1.074 | 1.418 | 0.045 | n/a | 0.528 | 12.578 | n/a | n/a | 0.045 | 6.775 | 0.302 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000000f6 | 22.255 | 5.509 | 0.011 | 0.000 | 0.356 | 1.057 | 1.752 | 0.044 | n/a | 0.483 | 12.726 | n/a | n/a | 0.316 | 5.876 | 0.264 | 0.316 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000120 | 21.195 | 3.596 | 0.012 | 0.000 | 0.918 | 0.634 | 1.651 | 0.036 | n/a | 0.405 | 13.879 | n/a | n/a | 0.064 | 4.526 | 0.214 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000111 | 19.198 | 4.735 | 0.008 | 0.000 | 1.232 | 2.793 | 2.152 | 0.091 | n/a | 0.688 | 7.424 | n/a | n/a | 0.075 | 5.975 | 0.311 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000126 | 18.357 | 3.269 | 0.006 | 0.000 | 0.857 | 0.822 | 1.607 | 0.050 | n/a | 0.121 | 11.586 | n/a | n/a | 0.040 | 4.131 | 0.225 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000011c | 18.328 | 3.867 | 0.006 | 0.000 | 0.396 | 1.086 | 1.850 | 0.493 | n/a | 0.149 | 10.432 | n/a | n/a | 0.050 | 4.269 | 0.233 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000124 | 17.113 | 3.676 | 0.006 | 0.000 | 0.192 | 1.482 | 1.723 | 0.062 | n/a | 0.176 | 9.746 | n/a | n/a | 0.052 | 3.874 | 0.226 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.768 | 0.952 | 0.000 | 1.461 | 4.696 | 0.007 | 0.000 | 0.284 | 0.724 | 1.028 | 0.049 | n/a | 0.094 | 11.712 | n/a | n/a | 0.047 | 4.987 | 0.264 | 0.047 |
| p99 | 34.632 | 1.466 | 0.000 | 1.574 | 5.264 | 0.275 | 0.000 | 1.365 | 1.758 | 11.140 | 0.085 | n/a | 2.296 | 15.832 | n/a | n/a | 0.069 | 5.654 | 0.307 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff000000000000012b | 34.632 | 5.264 | 0.275 | 0.000 | 0.114 | 1.758 | 11.140 | 0.085 | n/a | 0.094 | 15.832 | n/a | n/a | 0.069 | 5.654 | 0.163 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000009a2 | 17.768 | 3.325 | 0.007 | 0.000 | 1.365 | 0.614 | 0.632 | 0.049 | n/a | 0.031 | 11.712 | n/a | n/a | 0.032 | 4.697 | 0.264 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.119ms |
| 1348aeeee24ee8ff00000000000009a1 | 16.247 | 4.696 | 0.007 | 0.000 | 0.284 | 0.724 | 1.028 | 0.029 | n/a | 2.296 | 7.136 | n/a | n/a | 0.047 | 4.987 | 0.307 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.119ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.315 | 0.500 | 0.000 | 1.037 | 4.345 | 0.017 | 0.000 | 0.171 | 1.428 | 5.632 | 0.062 | n/a | 0.183 | 13.104 | n/a | n/a | 0.056 | 5.044 | 0.183 | 0.056 |
| p99 | 119.491 | 3.187 | 0.005 | 4.450 | 8.165 | 0.341 | 2.624 | 8.198 | 5.366 | 42.238 | 0.372 | n/a | 2.157 | 90.543 | n/a | n/a | 0.111 | 13.594 | 0.549 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff0000000000000141 | 119.491 | 6.243 | 0.340 | 0.387 | 0.144 | 2.131 | 19.446 | 0.077 | n/a | 0.103 | 90.543 | n/a | n/a | 0.076 | 7.115 | 0.060 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000136 | 61.548 | 4.359 | 0.318 | 0.358 | 0.100 | 1.659 | 17.347 | 0.067 | n/a | 1.504 | 35.787 | n/a | n/a | 0.048 | 5.135 | 0.083 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000151 | 59.739 | 3.861 | 0.271 | 0.284 | 0.085 | 1.690 | 42.238 | 0.053 | n/a | 0.147 | 11.065 | n/a | n/a | 0.045 | 4.500 | 0.075 | 0.045 | gw-w/thread-44/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff0000000000000157 | 56.390 | 3.528 | 0.234 | 0.284 | 0.072 | 4.492 | 34.968 | 0.103 | n/a | 2.157 | 10.507 | n/a | n/a | 0.045 | 4.118 | 0.073 | 0.045 | gw-w/thread-45/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff000000000000012f | 54.241 | 4.640 | 0.259 | 0.000 | 0.085 | 2.211 | 26.549 | 0.130 | n/a | 0.147 | 20.145 | n/a | n/a | 0.075 | 4.984 | 0.092 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000167 | 53.053 | 3.745 | 0.217 | 0.237 | 0.089 | 1.541 | 36.686 | 0.089 | n/a | 0.154 | 10.247 | n/a | n/a | 0.047 | 4.288 | 0.081 | 0.047 | gw-w/thread-41/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff000000000000015a | 51.032 | 7.384 | 0.017 | 0.000 | 0.615 | 1.199 | 1.936 | 0.053 | n/a | 0.147 | 39.586 | n/a | n/a | 0.094 | 8.016 | 0.157 | 0.094 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000013c | 46.868 | 5.176 | 0.004 | 0.000 | 0.552 | 0.954 | 5.632 | 0.038 | n/a | 1.102 | 33.345 | n/a | n/a | 0.064 | 5.733 | 0.122 | 0.064 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000139 | 46.634 | 3.876 | 0.249 | 0.000 | 0.171 | 1.678 | 13.837 | 0.167 | n/a | 0.238 | 26.355 | n/a | n/a | 0.063 | 4.296 | 0.092 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000012d | 43.952 | 4.859 | 0.275 | 0.347 | 0.123 | 3.521 | 12.458 | 0.103 | n/a | 0.198 | 21.988 | n/a | n/a | 0.081 | 5.603 | 0.127 | 0.081 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000143 | 40.602 | 3.288 | 0.254 | 0.000 | 0.104 | 1.428 | 14.071 | 0.112 | n/a | 1.604 | 19.672 | n/a | n/a | 0.069 | 3.646 | 0.090 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000016d | 39.459 | 4.071 | 0.341 | 0.237 | 0.080 | 1.489 | 15.565 | 0.077 | n/a | 0.211 | 17.335 | n/a | n/a | 0.054 | 4.729 | 0.120 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000013f | 39.089 | 4.319 | 0.305 | 0.000 | 0.088 | 1.656 | 16.092 | 0.113 | n/a | 0.204 | 16.260 | n/a | n/a | 0.053 | 4.712 | 0.121 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000148 | 36.841 | 3.384 | 0.233 | 0.270 | 0.114 | 2.507 | 14.828 | 0.053 | n/a | 0.125 | 15.265 | n/a | n/a | 0.063 | 4.000 | 0.109 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.060ms |
| 1348aeeee24ee8ff000000000000016b | 34.947 | 4.879 | 0.213 | 0.426 | 0.074 | 3.562 | 6.149 | 0.055 | n/a | 0.132 | 19.392 | n/a | n/a | 0.063 | 5.593 | 0.160 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000173 | 33.629 | 5.012 | 0.198 | 0.407 | 0.071 | 5.366 | 8.878 | 0.104 | n/a | 0.439 | 13.104 | n/a | n/a | 0.051 | 5.688 | 0.169 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000171 | 32.838 | 4.144 | 0.271 | 0.343 | 0.079 | 1.395 | 12.609 | 0.047 | n/a | 0.179 | 13.723 | n/a | n/a | 0.047 | 4.837 | 0.147 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000163 | 31.974 | 6.636 | 0.320 | 0.256 | 0.097 | 1.549 | 9.932 | 0.062 | n/a | 0.451 | 12.623 | n/a | n/a | 0.048 | 7.309 | 0.229 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000014e | 30.444 | 8.165 | 0.007 | 0.000 | 0.803 | 1.400 | 2.800 | 0.054 | n/a | 0.183 | 16.990 | n/a | n/a | 0.042 | 8.975 | 0.295 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000131 | 29.701 | 6.233 | 0.008 | 0.000 | 0.270 | 1.220 | 2.541 | 0.084 | n/a | 0.171 | 19.087 | n/a | n/a | 0.087 | 6.511 | 0.219 | 0.087 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.973 | 0.423 | 0.000 | 1.683 | 3.265 | 0.006 | 0.000 | 0.927 | 0.970 | 1.684 | 0.043 | n/a | 0.204 | 5.619 | n/a | n/a | 0.048 | 4.380 | 0.290 | 0.048 |
| p99 | 27.562 | 2.969 | 0.000 | 4.450 | 6.457 | 0.007 | 2.624 | 8.198 | 2.775 | 7.078 | 0.372 | n/a | 0.636 | 19.186 | n/a | n/a | 0.098 | 13.594 | 0.549 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff0000000000000133 | 27.562 | 3.934 | 0.005 | 0.000 | 1.104 | 0.998 | 1.665 | 0.042 | n/a | 0.579 | 19.186 | n/a | n/a | 0.048 | 5.044 | 0.183 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000177 | 24.772 | 2.767 | 0.006 | 2.624 | 8.198 | 1.462 | 1.633 | 0.041 | n/a | 0.107 | 7.886 | n/a | n/a | 0.049 | 13.594 | 0.549 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.089ms; driver.publication 1.084ms |
| 1348aeeee24ee8ff0000000000000147 | 22.600 | 3.265 | 0.006 | 0.000 | 1.110 | 0.840 | 2.679 | 0.372 | n/a | 0.438 | 13.850 | n/a | n/a | 0.041 | 4.380 | 0.194 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000015c | 21.074 | 5.995 | 0.006 | 0.000 | 0.111 | 0.698 | 3.383 | 0.038 | n/a | 0.150 | 10.656 | n/a | n/a | 0.038 | 6.112 | 0.290 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000137 | 19.973 | 6.457 | 0.005 | 0.000 | 0.927 | 2.775 | 7.078 | 0.096 | n/a | 0.636 | 1.930 | n/a | n/a | 0.067 | 7.389 | 0.370 | 0.067 | node-14/thread-0/driver.execute | none observed |
| 1348aeeee24ee8ff0000000000000152 | 16.952 | 3.123 | 0.007 | 0.000 | 1.016 | 1.597 | 5.281 | 0.060 | n/a | 0.204 | 5.619 | n/a | n/a | 0.046 | 4.145 | 0.245 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000016e | 11.371 | 3.786 | 0.006 | 0.000 | 0.259 | 0.970 | 1.684 | 0.071 | n/a | 0.213 | 4.285 | n/a | n/a | 0.098 | 4.051 | 0.356 | 0.098 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000160 | 10.442 | 3.004 | 0.005 | 0.000 | 0.885 | 0.573 | 1.553 | 0.043 | n/a | 0.125 | 4.190 | n/a | n/a | 0.064 | 3.894 | 0.373 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.218 | 0.718 | 0.000 | 0.791 | 5.145 | 0.201 | 0.000 | 0.136 | 1.598 | 6.856 | 0.065 | n/a | 0.473 | 11.807 | n/a | n/a | 0.061 | 6.035 | 0.198 | 0.061 |
| p99 | 122.997 | 3.647 | 0.007 | 7.316 | 15.761 | 0.597 | 1.869 | 1.283 | 4.971 | 31.912 | 0.212 | n/a | 4.868 | 109.577 | n/a | n/a | 0.279 | 16.374 | 0.434 | 0.279 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff00000000000001ce | 122.997 | 4.482 | 0.222 | 0.312 | 0.048 | 2.383 | 4.954 | 0.094 | n/a | 0.883 | 109.577 | n/a | n/a | 0.042 | 5.063 | 0.041 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001ab | 77.200 | 5.691 | 0.262 | 0.000 | 0.123 | 1.716 | 31.912 | 0.115 | n/a | 4.868 | 32.430 | n/a | n/a | 0.082 | 6.076 | 0.079 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 4.900ms; driver.expected-state.bind-receipt 1.709ms |
| 1348aeeee24ee8ff0000000000000185 | 64.160 | 4.243 | 0.280 | 0.309 | 0.083 | 3.825 | 9.452 | 0.088 | n/a | 0.183 | 45.652 | n/a | n/a | 0.045 | 4.915 | 0.077 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000019d | 53.628 | 9.012 | 0.597 | 1.869 | 0.135 | 2.260 | 16.240 | 0.080 | n/a | 0.463 | 22.869 | n/a | n/a | 0.103 | 11.613 | 0.217 | 0.103 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001ac | 51.690 | 15.761 | 0.007 | 0.000 | 0.605 | 3.446 | 6.382 | 0.064 | n/a | 3.704 | 21.600 | n/a | n/a | 0.120 | 16.374 | 0.317 | 0.120 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000199 | 51.144 | 7.722 | 0.462 | 0.000 | 0.148 | 2.580 | 12.817 | 0.120 | n/a | 1.119 | 26.078 | n/a | n/a | 0.098 | 8.332 | 0.163 | 0.098 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000196 | 45.214 | 8.724 | 0.009 | 0.000 | 0.075 | 1.190 | 4.079 | 0.111 | n/a | 0.851 | 29.895 | n/a | n/a | 0.279 | 8.808 | 0.195 | 0.279 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001c1 | 41.515 | 5.333 | 0.288 | 0.643 | 0.127 | 3.796 | 12.189 | 0.057 | n/a | 1.793 | 17.228 | n/a | n/a | 0.062 | 6.391 | 0.154 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001b5 | 40.490 | 8.834 | 0.326 | 0.000 | 0.097 | 2.792 | 14.621 | 0.212 | n/a | 0.335 | 13.184 | n/a | n/a | 0.090 | 9.256 | 0.229 | 0.090 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000191 | 39.448 | 4.484 | 0.358 | 0.000 | 0.063 | 2.775 | 19.644 | 0.097 | n/a | 0.161 | 11.807 | n/a | n/a | 0.059 | 4.905 | 0.124 | 0.059 | gw-w/thread-47/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff000000000000019f | 39.270 | 4.840 | 0.266 | 0.000 | 0.071 | 1.664 | 20.609 | 0.056 | n/a | 0.585 | 11.121 | n/a | n/a | 0.057 | 5.177 | 0.132 | 0.057 | gw-w/thread-41/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff00000000000001a0 | 35.917 | 7.704 | 0.007 | 0.000 | 0.859 | 0.898 | 6.738 | 0.070 | n/a | 3.590 | 15.949 | n/a | n/a | 0.100 | 8.571 | 0.239 | 0.100 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001b8 | 35.899 | 7.176 | 0.007 | 0.000 | 0.360 | 1.632 | 8.187 | 0.153 | n/a | 0.219 | 18.102 | n/a | n/a | 0.061 | 7.544 | 0.210 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000189 | 35.138 | 6.183 | 0.009 | 0.000 | 0.778 | 0.714 | 8.315 | 0.042 | n/a | 0.069 | 18.967 | n/a | n/a | 0.060 | 6.970 | 0.198 | 0.060 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001bb | 35.091 | 4.890 | 0.417 | 0.292 | 0.053 | 1.598 | 11.059 | 0.057 | n/a | 0.910 | 15.758 | n/a | n/a | 0.056 | 5.652 | 0.161 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001a7 | 33.496 | 4.104 | 0.205 | 0.378 | 0.052 | 1.575 | 14.925 | 0.074 | n/a | 0.516 | 11.569 | n/a | n/a | 0.099 | 4.739 | 0.141 | 0.099 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000181 | 32.903 | 4.309 | 0.234 | 0.241 | 0.136 | 1.485 | 11.288 | 0.060 | n/a | 0.119 | 14.967 | n/a | n/a | 0.066 | 4.919 | 0.149 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001c7 | 30.980 | 8.391 | 0.016 | 0.000 | 0.371 | 1.085 | 1.577 | 0.042 | n/a | 0.930 | 18.470 | n/a | n/a | 0.097 | 8.778 | 0.283 | 0.097 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000188 | 30.502 | 3.549 | 0.206 | 0.305 | 0.084 | 1.387 | 13.467 | 0.053 | n/a | 0.419 | 10.994 | n/a | n/a | 0.038 | 4.144 | 0.136 | 0.038 | gw-w/thread-47/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff00000000000001b7 | 30.218 | 4.196 | 0.201 | 0.380 | 0.053 | 1.673 | 10.558 | 0.086 | n/a | 0.666 | 12.364 | n/a | n/a | 0.041 | 4.829 | 0.160 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.063 | 1.035 | 0.000 | 2.007 | 5.889 | 0.009 | 0.000 | 0.598 | 1.190 | 1.567 | 0.046 | n/a | 0.851 | 10.360 | n/a | n/a | 0.092 | 6.722 | 0.270 | 0.092 |
| p99 | 45.214 | 3.224 | 0.007 | 5.965 | 9.755 | 0.025 | 0.000 | 1.283 | 2.988 | 4.079 | 0.147 | n/a | 3.935 | 29.895 | n/a | n/a | 0.279 | 10.442 | 0.413 | 0.279 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff0000000000000196 | 45.214 | 8.724 | 0.009 | 0.000 | 0.075 | 1.190 | 4.079 | 0.111 | n/a | 0.851 | 29.895 | n/a | n/a | 0.279 | 8.808 | 0.195 | 0.279 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001c7 | 30.980 | 8.391 | 0.016 | 0.000 | 0.371 | 1.085 | 1.577 | 0.042 | n/a | 0.930 | 18.470 | n/a | n/a | 0.097 | 8.778 | 0.283 | 0.097 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000194 | 25.259 | 9.755 | 0.025 | 0.000 | 0.663 | 1.896 | 3.677 | 0.065 | n/a | 0.176 | 8.906 | n/a | n/a | 0.097 | 10.442 | 0.413 | 0.097 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000182 | 25.059 | 5.889 | 0.011 | 0.000 | 1.283 | 1.179 | 1.417 | 0.043 | n/a | 0.473 | 14.671 | n/a | n/a | 0.093 | 7.183 | 0.287 | 0.093 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001cb | 21.256 | 6.347 | 0.006 | 0.000 | 0.369 | 0.771 | 1.352 | 0.037 | n/a | 3.935 | 8.345 | n/a | n/a | 0.094 | 6.722 | 0.316 | 0.094 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001b2 | 21.063 | 4.117 | 0.009 | 0.000 | 0.977 | 2.988 | 1.567 | 0.046 | n/a | 0.145 | 11.150 | n/a | n/a | 0.064 | 5.103 | 0.242 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001be | 19.586 | 7.692 | 0.018 | 0.000 | 0.183 | 1.620 | 1.531 | 0.047 | n/a | 0.977 | 7.426 | n/a | n/a | 0.092 | 7.893 | 0.403 | 0.092 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000017e | 19.513 | 3.800 | 0.006 | 0.000 | 0.692 | 1.123 | 2.364 | 0.147 | n/a | 0.979 | 10.360 | n/a | n/a | 0.042 | 4.498 | 0.230 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000018e | 17.505 | 2.831 | 0.005 | 0.000 | 0.598 | 1.836 | 1.427 | 0.045 | n/a | 0.107 | 10.616 | n/a | n/a | 0.040 | 3.434 | 0.196 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001a8 | 14.882 | 3.135 | 0.005 | 0.000 | 0.882 | 1.375 | 1.640 | 0.053 | n/a | 3.297 | 4.451 | n/a | n/a | 0.043 | 4.022 | 0.270 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (141 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 115.458 | n/a | n/a | n/a | 38.210 | 31.322 | 1.887 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.880 | 75.932 | 0.878 | 21.880 |
| p99 | 520.292 | n/a | n/a | n/a | 97.904 | 443.073 | 17.244 | 0.000 | 43.392 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 173.051 | 482.582 | 1.000 | 173.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff00000000000014f5 | 524.404 | 61.171 | 402.085 | 4.639 | 0.000 | 0.342 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 56.166 | 467.896 | 0.892 | 56.166 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 2.188ms |
| 1348aeeee24ee8ff00000000000014fa | 520.292 | 59.023 | 412.121 | 5.218 | 0.000 | 0.319 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.611 | 476.363 | 0.916 | 43.611 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 1.978ms |
| 1348aeeee24ee8ff000000000000150b | 513.253 | 64.900 | 414.328 | 3.354 | 0.000 | 0.475 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.196 | 482.582 | 0.940 | 30.196 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 1.978ms |
| 1348aeeee24ee8ff0000000000001502 | 509.196 | 26.126 | 443.073 | 6.230 | 0.000 | 0.226 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.542 | 475.428 | 0.934 | 33.542 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 1.978ms |
| 1348aeeee24ee8ff000000000000150e | 506.070 | 36.570 | 424.345 | 1.393 | 0.000 | 0.371 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.390 | 462.308 | 0.914 | 43.390 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 1.978ms |
| 1348aeeee24ee8ff00000000000014f3 | 504.663 | 42.570 | 394.185 | 4.188 | 0.000 | 0.244 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.476 | 440.943 | 0.874 | 63.476 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 2.188ms |
| 1348aeeee24ee8ff000000000000151a | 497.274 | 33.734 | 448.201 | 1.113 | 0.000 | 0.592 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.635 | 483.048 | 0.971 | 13.635 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 1.978ms |
| 1348aeeee24ee8ff000000000000151c | 491.116 | 39.061 | 422.613 | 1.117 | 0.000 | 0.274 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.050 | 462.791 | 0.942 | 28.050 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 1.978ms; driver.publication 1.919ms |
| 1348aeeee24ee8ff00000000000014ee | 474.187 | 53.041 | 331.647 | 4.751 | 0.000 | 0.428 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 84.321 | 389.439 | 0.821 | 84.321 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.expected-state.bind-receipt 2.900ms; driver.publication 2.587ms |
| 1348aeeee24ee8ff00000000000014f9 | 467.061 | 85.275 | 344.022 | 6.022 | 0.000 | 0.496 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.245 | 435.320 | 0.932 | 31.245 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 1.978ms |
| 1348aeeee24ee8ff00000000000014e6 | 462.210 | 41.076 | 290.929 | 2.950 | 0.000 | 0.378 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 126.877 | 334.955 | 0.725 | 126.877 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.expected-state.bind-receipt 2.900ms; driver.publication 2.587ms |
| 1348aeeee24ee8ff00000000000014f2 | 434.849 | 92.786 | 288.953 | 17.244 | 0.000 | 0.891 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.975 | 398.983 | 0.918 | 34.975 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 2.188ms |
| 1348aeeee24ee8ff0000000000001528 | 430.792 | 17.274 | 408.303 | 0.000 | 0.000 | 0.409 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.806 | 425.577 | 0.988 | 4.806 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 1.978ms; driver.publication 1.919ms; driver.publication 1.813ms |
| 1348aeeee24ee8ff000000000000152b | 430.763 | 15.245 | 406.989 | 0.000 | 0.000 | 0.476 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.054 | 422.233 | 0.980 | 8.054 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 1.978ms; driver.publication 1.919ms; driver.publication 1.813ms |
| 1348aeeee24ee8ff00000000000014e0 | 416.641 | 30.229 | 287.911 | 6.515 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 91.495 | 324.656 | 0.779 | 91.495 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 3.074ms; driver.expected-state.bind-receipt 2.935ms |
| 1348aeeee24ee8ff0000000000001508 | 401.024 | 32.091 | 357.595 | 1.393 | 0.000 | 0.226 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.719 | 391.079 | 0.975 | 9.719 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 1.978ms |
| 1348aeeee24ee8ff0000000000001541 | 396.190 | 31.550 | 349.775 | 2.372 | 0.000 | 0.330 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.164 | 383.697 | 0.968 | 12.164 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.978ms; driver.publication 1.616ms; driver.publication 1.602ms; driver.publication 1.475ms; driver.expected-state.bind-receipt 1.463ms |
| 1348aeeee24ee8ff0000000000001519 | 382.684 | 16.920 | 335.972 | 0.000 | 0.000 | 0.199 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.592 | 352.893 | 0.922 | 29.592 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 2.587ms; driver.publication 1.978ms |
| 1348aeeee24ee8ff00000000000014dd | 380.479 | 38.793 | 242.918 | 11.350 | 0.000 | 0.436 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.981 | 293.062 | 0.770 | 86.981 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 3.074ms; driver.expected-state.bind-receipt 2.935ms |
| 1348aeeee24ee8ff00000000000014e2 | 379.678 | 19.205 | 337.047 | 0.000 | 0.000 | 0.298 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.128 | 356.252 | 0.938 | 23.128 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.853ms; driver.publication 4.874ms; driver.publication 3.450ms; driver.publication 3.074ms; driver.expected-state.bind-receipt 2.900ms |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.841 | 0.638 | 0.000 | 1.385 | 4.774 | 0.017 | 0.000 | 0.127 | 1.393 | 4.297 | 0.062 | n/a | 0.440 | 12.627 | n/a | n/a | 0.052 | 5.304 | 0.223 | 0.052 |
| p99 | 75.284 | 3.445 | 0.024 | 6.532 | 22.082 | 0.344 | 0.506 | 2.803 | 5.865 | 62.224 | 0.563 | n/a | 6.942 | 35.164 | n/a | n/a | 0.132 | 22.477 | 0.489 | 0.132 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff00000000000001f6 | 75.284 | 3.575 | 0.277 | 0.294 | 0.076 | 1.078 | 62.224 | 0.050 | n/a | 0.110 | 7.550 | n/a | n/a | 0.050 | 4.222 | 0.056 | 0.050 | gw-w/thread-48/commit.prepare-and-validate | none observed |
| 1348aeeee24ee8ff00000000000001d9 | 60.588 | 5.240 | 0.308 | 0.354 | 0.069 | 2.029 | 15.929 | 0.117 | n/a | 1.296 | 35.164 | n/a | n/a | 0.083 | 5.971 | 0.099 | 0.083 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000021c | 57.902 | 17.844 | 0.344 | 0.000 | 0.069 | 5.865 | 11.434 | 0.139 | n/a | 6.942 | 15.192 | n/a | n/a | 0.073 | 18.257 | 0.315 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001f2 | 57.609 | 22.082 | 0.013 | 0.000 | 0.382 | 3.843 | 18.656 | 0.133 | n/a | 0.823 | 11.639 | n/a | n/a | 0.039 | 22.477 | 0.390 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001fc | 49.601 | 3.898 | 0.221 | 0.248 | 0.073 | 1.670 | 31.733 | 0.083 | n/a | 0.731 | 10.896 | n/a | n/a | 0.047 | 4.440 | 0.090 | 0.047 | gw-w/thread-47/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff00000000000001f0 | 39.096 | 5.694 | 0.259 | 0.000 | 0.106 | 1.910 | 10.851 | 0.052 | n/a | 0.371 | 19.720 | n/a | n/a | 0.132 | 6.060 | 0.155 | 0.132 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001dc | 38.721 | 3.900 | 0.209 | 0.331 | 0.066 | 1.422 | 11.163 | 0.090 | n/a | 2.499 | 18.986 | n/a | n/a | 0.055 | 4.507 | 0.116 | 0.055 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001d6 | 36.898 | 9.046 | 0.006 | 0.000 | 2.803 | 2.263 | 7.968 | 0.053 | n/a | 3.609 | 11.102 | n/a | n/a | 0.048 | 11.855 | 0.321 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.182ms |
| 1348aeeee24ee8ff0000000000000220 | 35.762 | 5.621 | 0.170 | 0.000 | 0.066 | 1.572 | 10.287 | 0.041 | n/a | 0.160 | 17.801 | n/a | n/a | 0.045 | 5.857 | 0.164 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001e2 | 34.566 | 3.865 | 0.266 | 0.000 | 0.052 | 1.923 | 15.369 | 0.074 | n/a | 0.323 | 12.627 | n/a | n/a | 0.066 | 4.183 | 0.121 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000020c | 32.980 | 3.475 | 0.205 | 0.228 | 0.069 | 1.103 | 5.690 | 0.062 | n/a | 3.361 | 18.742 | n/a | n/a | 0.048 | 3.976 | 0.121 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000206 | 32.909 | 4.294 | 0.005 | 0.000 | 0.612 | 0.735 | 1.032 | 0.047 | n/a | 0.145 | 25.988 | n/a | n/a | 0.050 | 4.911 | 0.149 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000218 | 32.515 | 7.101 | 0.332 | 0.000 | 0.066 | 1.709 | 9.174 | 0.563 | n/a | 0.550 | 12.975 | n/a | n/a | 0.046 | 7.498 | 0.231 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000204 | 32.496 | 4.651 | 0.277 | 0.309 | 0.067 | 1.660 | 7.095 | 0.080 | n/a | 0.756 | 17.541 | n/a | n/a | 0.061 | 5.304 | 0.163 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000209 | 30.777 | 4.893 | 0.292 | 0.299 | 0.013 | 1.393 | 10.777 | 0.087 | n/a | 0.391 | 12.593 | n/a | n/a | 0.039 | 5.498 | 0.179 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.692ms |
| 1348aeeee24ee8ff00000000000001d5 | 30.423 | 4.226 | 0.006 | 0.000 | 0.278 | 1.909 | 2.597 | 0.068 | n/a | 2.394 | 18.878 | n/a | n/a | 0.067 | 4.510 | 0.148 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000212 | 30.009 | 3.484 | 0.227 | 0.000 | 0.097 | 1.480 | 7.922 | 0.056 | n/a | 0.125 | 16.524 | n/a | n/a | 0.094 | 3.808 | 0.127 | 0.094 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001e0 | 29.470 | 9.911 | 0.005 | 0.000 | 0.933 | 0.750 | 1.882 | 0.044 | n/a | 0.144 | 15.746 | n/a | n/a | 0.054 | 10.850 | 0.368 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001fa | 29.055 | 3.741 | 0.206 | 0.249 | 0.072 | 1.267 | 7.505 | 0.041 | n/a | 0.387 | 15.544 | n/a | n/a | 0.042 | 4.268 | 0.147 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001d1 | 27.430 | 5.819 | 0.006 | 0.000 | 1.142 | 4.774 | 2.001 | 0.090 | n/a | 0.152 | 13.348 | n/a | n/a | 0.098 | 6.967 | 0.254 | 0.098 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.409 | 1.050 | 0.000 | 1.909 | 4.226 | 0.006 | 0.000 | 0.836 | 0.957 | 1.929 | 0.047 | n/a | 0.505 | 13.223 | n/a | n/a | 0.058 | 4.911 | 0.243 | 0.058 |
| p99 | 32.909 | 2.076 | 0.024 | 3.063 | 6.685 | 0.017 | 0.000 | 1.397 | 4.774 | 4.484 | 0.137 | n/a | 2.394 | 25.988 | n/a | n/a | 0.113 | 7.886 | 0.489 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff0000000000000206 | 32.909 | 4.294 | 0.005 | 0.000 | 0.612 | 0.735 | 1.032 | 0.047 | n/a | 0.145 | 25.988 | n/a | n/a | 0.050 | 4.911 | 0.149 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001d5 | 30.423 | 4.226 | 0.006 | 0.000 | 0.278 | 1.909 | 2.597 | 0.068 | n/a | 2.394 | 18.878 | n/a | n/a | 0.067 | 4.510 | 0.148 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001d1 | 27.430 | 5.819 | 0.006 | 0.000 | 1.142 | 4.774 | 2.001 | 0.090 | n/a | 0.152 | 13.348 | n/a | n/a | 0.098 | 6.967 | 0.254 | 0.098 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001de | 26.597 | 6.685 | 0.014 | 0.000 | 1.188 | 1.320 | 4.484 | 0.045 | n/a | 0.085 | 12.663 | n/a | n/a | 0.113 | 7.886 | 0.297 | 0.113 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000213 | 26.414 | 3.846 | 0.009 | 0.000 | 1.163 | 1.404 | 4.297 | 0.042 | n/a | 0.066 | 15.539 | n/a | n/a | 0.049 | 5.018 | 0.190 | 0.049 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000200 | 25.281 | 4.981 | 0.009 | 0.000 | 1.397 | 0.958 | 1.929 | 0.063 | n/a | 0.511 | 15.358 | n/a | n/a | 0.073 | 6.387 | 0.253 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000208 | 24.216 | 3.799 | 0.005 | 0.000 | 0.134 | 0.875 | 4.106 | 0.035 | n/a | 0.050 | 15.173 | n/a | n/a | 0.039 | 3.938 | 0.163 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001ec | 22.409 | 3.909 | 0.006 | 0.000 | 0.201 | 1.137 | 1.606 | 0.040 | n/a | 0.357 | 15.108 | n/a | n/a | 0.043 | 4.117 | 0.184 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001e4 | 22.012 | 5.530 | 0.006 | 0.000 | 0.258 | 0.728 | 1.628 | 0.049 | n/a | 0.532 | 13.223 | n/a | n/a | 0.058 | 5.793 | 0.263 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000020e | 18.810 | 3.350 | 0.006 | 0.000 | 0.836 | 1.146 | 2.497 | 0.137 | n/a | 1.385 | 9.401 | n/a | n/a | 0.052 | 4.191 | 0.223 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001e6 | 17.926 | 2.983 | 0.005 | 0.000 | 0.369 | 0.616 | 1.733 | 0.083 | n/a | 0.711 | 11.385 | n/a | n/a | 0.041 | 3.357 | 0.187 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001f8 | 17.392 | 3.896 | 0.008 | 0.000 | 0.940 | 0.781 | 0.994 | 0.034 | n/a | 0.401 | 10.263 | n/a | n/a | 0.073 | 4.845 | 0.279 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001ea | 17.340 | 5.083 | 0.012 | 0.000 | 1.086 | 0.939 | 1.382 | 0.045 | n/a | 0.505 | 8.202 | n/a | n/a | 0.084 | 6.182 | 0.357 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000001cf | 15.685 | 3.684 | 0.006 | 0.000 | 0.127 | 0.957 | 1.975 | 0.119 | n/a | 1.616 | 7.158 | n/a | n/a | 0.042 | 3.817 | 0.243 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000021e | 14.074 | 5.909 | 0.017 | 0.000 | 0.949 | 0.900 | 1.106 | 0.033 | n/a | 0.963 | 4.132 | n/a | n/a | 0.063 | 6.875 | 0.489 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.154 | 0.566 | 0.000 | 1.499 | 4.451 | 0.011 | 0.000 | 0.300 | 1.327 | 2.981 | 0.041 | n/a | 0.307 | 9.616 | n/a | n/a | 0.054 | 4.926 | 0.245 | 0.054 |
| p99 | 131.160 | 2.080 | 0.007 | 5.198 | 8.448 | 0.389 | 0.000 | 1.508 | 6.366 | 21.664 | 0.087 | n/a | 3.624 | 124.401 | n/a | n/a | 0.110 | 9.518 | 0.457 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff0000000000000230 | 131.160 | 3.698 | 0.009 | 0.000 | 0.908 | 0.751 | 1.002 | 0.030 | n/a | 0.307 | 124.401 | n/a | n/a | 0.055 | 4.615 | 0.035 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000022d | 64.869 | 5.478 | 0.304 | 0.000 | 0.073 | 5.626 | 8.727 | 0.063 | n/a | 0.517 | 44.038 | n/a | n/a | 0.042 | 5.855 | 0.090 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000244 | 41.908 | 5.603 | 0.330 | 0.000 | 0.067 | 2.026 | 14.051 | 0.048 | n/a | 0.112 | 19.624 | n/a | n/a | 0.048 | 6.000 | 0.143 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000248 | 41.283 | 3.640 | 0.265 | 0.000 | 0.065 | 2.400 | 21.664 | 0.067 | n/a | 3.604 | 9.520 | n/a | n/a | 0.059 | 3.970 | 0.096 | 0.059 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000234 | 40.235 | 4.618 | 0.272 | 0.000 | 0.071 | 1.704 | 13.855 | 0.061 | n/a | 0.123 | 19.454 | n/a | n/a | 0.077 | 4.961 | 0.123 | 0.077 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000273 | 37.387 | 6.333 | 0.290 | 0.000 | 0.072 | 1.906 | 11.956 | 0.048 | n/a | 3.294 | 13.425 | n/a | n/a | 0.063 | 6.695 | 0.179 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000224 | 33.202 | 5.220 | 0.194 | 0.000 | 0.016 | 1.977 | 13.118 | 0.043 | n/a | 0.123 | 12.479 | n/a | n/a | 0.031 | 5.430 | 0.164 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.549ms |
| 1348aeeee24ee8ff0000000000000250 | 32.426 | 4.590 | 0.269 | 0.000 | 0.067 | 1.895 | 6.579 | 0.064 | n/a | 0.734 | 18.168 | n/a | n/a | 0.061 | 4.925 | 0.152 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000238 | 32.268 | 5.826 | 0.389 | 0.000 | 0.354 | 2.461 | 9.637 | 0.057 | n/a | 0.185 | 13.249 | n/a | n/a | 0.110 | 6.570 | 0.204 | 0.110 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000246 | 31.884 | 4.806 | 0.218 | 0.000 | 0.073 | 1.730 | 10.692 | 0.041 | n/a | 0.494 | 13.781 | n/a | n/a | 0.048 | 5.097 | 0.160 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000229 | 30.988 | 6.302 | 0.017 | 0.000 | 0.918 | 1.538 | 5.451 | 0.043 | n/a | 0.112 | 16.530 | n/a | n/a | 0.077 | 7.236 | 0.234 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000024b | 30.949 | 4.450 | 0.005 | 0.000 | 1.508 | 3.333 | 0.900 | 0.020 | n/a | 0.229 | 20.452 | n/a | n/a | 0.052 | 5.963 | 0.193 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.290ms |
| 1348aeeee24ee8ff000000000000027b | 30.795 | 3.244 | 0.177 | 0.000 | 0.053 | 1.459 | 13.146 | 0.075 | n/a | 0.136 | 12.465 | n/a | n/a | 0.041 | 3.474 | 0.113 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000024a | 30.309 | 5.691 | 0.012 | 0.000 | 0.221 | 1.055 | 5.731 | 0.062 | n/a | 0.137 | 17.317 | n/a | n/a | 0.083 | 5.924 | 0.195 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000026a | 29.076 | 8.448 | 0.014 | 0.000 | 1.056 | 6.366 | 10.669 | 0.063 | n/a | 0.410 | 1.943 | n/a | n/a | 0.107 | 9.518 | 0.327 | 0.107 | node-14/thread-0/socket.wait-first-byte | none observed |
| 1348aeeee24ee8ff0000000000000242 | 27.790 | 4.774 | 0.290 | 0.000 | 0.096 | 1.492 | 7.182 | 0.036 | n/a | 0.404 | 13.415 | n/a | n/a | 0.101 | 5.161 | 0.186 | 0.101 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000266 | 26.727 | 3.815 | 0.192 | 0.000 | 0.012 | 1.042 | 5.097 | 0.034 | n/a | 0.085 | 16.417 | n/a | n/a | 0.032 | 4.019 | 0.150 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000285 | 25.437 | 3.938 | 0.201 | 0.000 | 0.074 | 1.589 | 5.765 | 0.063 | n/a | 0.146 | 13.614 | n/a | n/a | 0.047 | 4.212 | 0.166 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000026d | 25.134 | 3.339 | 0.259 | 0.000 | 0.066 | 1.133 | 6.061 | 0.058 | n/a | 0.100 | 14.067 | n/a | n/a | 0.052 | 3.664 | 0.146 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000027f | 24.581 | 4.063 | 0.330 | 0.000 | 0.064 | 1.832 | 9.540 | 0.043 | n/a | 0.103 | 8.551 | n/a | n/a | 0.055 | 4.457 | 0.181 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.616 | 0.794 | 0.000 | 1.696 | 3.904 | 0.006 | 0.000 | 0.521 | 0.855 | 1.302 | 0.037 | n/a | 0.324 | 6.192 | n/a | n/a | 0.055 | 4.469 | 0.318 | 0.055 |
| p99 | 131.160 | 1.930 | 0.007 | 3.052 | 8.448 | 0.020 | 0.000 | 1.508 | 6.366 | 10.669 | 0.087 | n/a | 0.712 | 124.401 | n/a | n/a | 0.107 | 9.518 | 0.457 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff0000000000000230 | 131.160 | 3.698 | 0.009 | 0.000 | 0.908 | 0.751 | 1.002 | 0.030 | n/a | 0.307 | 124.401 | n/a | n/a | 0.055 | 4.615 | 0.035 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000024b | 30.949 | 4.450 | 0.005 | 0.000 | 1.508 | 3.333 | 0.900 | 0.020 | n/a | 0.229 | 20.452 | n/a | n/a | 0.052 | 5.963 | 0.193 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.290ms |
| 1348aeeee24ee8ff000000000000026a | 29.076 | 8.448 | 0.014 | 0.000 | 1.056 | 6.366 | 10.669 | 0.063 | n/a | 0.410 | 1.943 | n/a | n/a | 0.107 | 9.518 | 0.327 | 0.107 | node-14/thread-0/socket.wait-first-byte | none observed |
| 1348aeeee24ee8ff000000000000022b | 21.154 | 3.904 | 0.005 | 0.000 | 0.560 | 0.855 | 2.024 | 0.031 | n/a | 0.431 | 13.299 | n/a | n/a | 0.043 | 4.469 | 0.211 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000025e | 19.568 | 5.690 | 0.012 | 0.000 | 0.521 | 1.415 | 2.496 | 0.087 | n/a | 0.324 | 8.944 | n/a | n/a | 0.078 | 6.223 | 0.318 | 0.078 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000277 | 17.935 | 5.315 | 0.008 | 0.000 | 0.987 | 0.994 | 1.852 | 0.075 | n/a | 0.712 | 7.925 | n/a | n/a | 0.067 | 6.310 | 0.352 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000236 | 15.978 | 4.722 | 0.010 | 0.000 | 1.181 | 0.706 | 1.521 | 0.039 | n/a | 0.143 | 7.582 | n/a | n/a | 0.074 | 5.914 | 0.370 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000222 | 15.779 | 4.029 | 0.005 | 0.000 | 0.352 | 2.559 | 5.695 | 0.050 | n/a | 0.455 | 2.579 | n/a | n/a | 0.054 | 4.386 | 0.278 | 0.054 | gw-w/thread-44/gateway.route | none observed |
| 1348aeeee24ee8ff0000000000000283 | 14.616 | 3.322 | 0.006 | 0.000 | 0.200 | 2.971 | 1.880 | 0.052 | n/a | 0.153 | 5.988 | n/a | n/a | 0.043 | 3.529 | 0.241 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000240 | 13.131 | 3.556 | 0.005 | 0.000 | 0.300 | 0.728 | 1.056 | 0.031 | n/a | 0.412 | 6.977 | n/a | n/a | 0.065 | 3.861 | 0.294 | 0.065 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000026f | 12.836 | 3.863 | 0.009 | 0.000 | 0.610 | 0.849 | 1.773 | 0.053 | n/a | 0.217 | 5.408 | n/a | n/a | 0.056 | 4.482 | 0.349 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000281 | 12.662 | 5.434 | 0.020 | 0.000 | 0.334 | 0.726 | 1.131 | 0.037 | n/a | 0.390 | 4.532 | n/a | n/a | 0.059 | 5.789 | 0.457 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000254 | 12.500 | 3.218 | 0.006 | 0.000 | 0.191 | 0.872 | 1.133 | 0.039 | n/a | 0.461 | 6.523 | n/a | n/a | 0.057 | 3.414 | 0.273 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000227 | 12.481 | 3.326 | 0.005 | 0.000 | 0.388 | 0.901 | 1.130 | 0.032 | n/a | 0.466 | 6.192 | n/a | n/a | 0.041 | 3.719 | 0.298 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000027d | 11.462 | 3.924 | 0.006 | 0.000 | 0.417 | 0.717 | 1.302 | 0.036 | n/a | 0.073 | 4.932 | n/a | n/a | 0.054 | 4.347 | 0.379 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000260 | 10.491 | 3.079 | 0.006 | 0.000 | 1.015 | 0.671 | 1.109 | 0.034 | n/a | 0.102 | 4.425 | n/a | n/a | 0.050 | 4.101 | 0.391 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000264 | 8.484 | 2.833 | 0.006 | 0.000 | 0.183 | 0.650 | 0.943 | 0.030 | n/a | 0.093 | 3.708 | n/a | n/a | 0.038 | 3.022 | 0.356 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.386 | 0.508 | 0.000 | 1.013 | 4.621 | 0.014 | 0.000 | 0.293 | 1.293 | 2.755 | 0.046 | n/a | 0.169 | 8.886 | n/a | n/a | 0.061 | 5.241 | 0.221 | 0.061 |
| p99 | 113.290 | 2.606 | 0.022 | 3.260 | 10.887 | n/a | 0.000 | 2.738 | 10.562 | 47.112 | 0.183 | n/a | 4.851 | 60.970 | n/a | n/a | 0.161 | 11.687 | 0.488 | 0.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff000000000000029a | 113.290 | 3.388 | 0.200 | 0.000 | 0.056 | 1.403 | 47.112 | 0.036 | n/a | 0.075 | 60.970 | n/a | n/a | 0.050 | 3.645 | 0.032 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002c4 | 73.695 | 10.881 | 0.326 | 0.000 | 0.093 | 4.378 | 16.970 | 0.183 | n/a | 4.851 | 35.953 | n/a | n/a | 0.061 | 11.300 | 0.153 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.626ms; driver.publication 1.091ms |
| 1348aeeee24ee8ff0000000000000296 | 54.161 | 6.987 | 0.254 | 0.000 | 0.115 | 10.562 | 13.380 | 0.034 | n/a | 0.071 | 22.678 | n/a | n/a | 0.080 | 7.357 | 0.136 | 0.080 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002ba | 48.440 | 4.730 | 0.255 | 0.000 | 0.100 | 1.670 | 29.879 | 0.049 | n/a | 0.104 | 11.574 | n/a | n/a | 0.079 | 5.085 | 0.105 | 0.079 | gw-w/thread-47/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff00000000000002a6 | 40.829 | 6.537 | 0.313 | 0.000 | 0.106 | 1.940 | 14.676 | 0.079 | n/a | 0.215 | 16.888 | n/a | n/a | 0.074 | 6.956 | 0.170 | 0.074 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002d3 | 36.862 | 6.141 | 0.418 | 0.000 | 0.080 | 2.350 | 10.640 | 0.069 | n/a | 0.113 | 16.985 | n/a | n/a | 0.067 | 6.639 | 0.180 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002ae | 34.282 | 3.701 | 0.276 | 0.000 | 0.072 | 1.474 | 20.043 | 0.051 | n/a | 0.155 | 8.457 | n/a | n/a | 0.053 | 4.049 | 0.118 | 0.053 | gw-w/thread-43/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff00000000000002d7 | 33.501 | 5.847 | 0.339 | 0.000 | 0.078 | 2.479 | 12.091 | 0.105 | n/a | 0.197 | 12.304 | n/a | n/a | 0.061 | 6.264 | 0.187 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002ac | 32.540 | 4.423 | 0.241 | 0.000 | 0.056 | 1.635 | 7.462 | 0.045 | n/a | 0.163 | 18.452 | n/a | n/a | 0.063 | 4.720 | 0.145 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002d9 | 28.870 | 5.651 | 0.266 | 0.000 | 0.061 | 1.374 | 9.100 | 0.050 | n/a | 0.089 | 12.217 | n/a | n/a | 0.061 | 5.979 | 0.207 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002a2 | 28.374 | 5.026 | 0.410 | 0.000 | 0.293 | 2.230 | 9.657 | 0.105 | n/a | 1.274 | 9.251 | n/a | n/a | 0.126 | 5.730 | 0.202 | 0.126 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000029c | 27.090 | 3.910 | 0.199 | 0.000 | 0.071 | 1.893 | 8.583 | 0.061 | n/a | 1.036 | 11.284 | n/a | n/a | 0.053 | 4.181 | 0.154 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002b6 | 26.813 | 4.824 | 0.402 | 0.000 | 0.156 | 1.862 | 8.123 | 0.047 | n/a | 0.126 | 11.167 | n/a | n/a | 0.106 | 5.382 | 0.201 | 0.106 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000028d | 26.234 | 4.370 | 0.005 | 0.000 | 0.396 | 0.777 | 1.223 | 0.033 | n/a | 0.099 | 19.289 | n/a | n/a | 0.042 | 4.771 | 0.182 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002b2 | 25.772 | 4.621 | 0.007 | 0.000 | 1.066 | 1.201 | 2.949 | 0.109 | n/a | 0.240 | 15.509 | n/a | n/a | 0.071 | 5.693 | 0.221 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002c0 | 25.284 | 3.680 | 0.165 | 0.000 | 0.066 | 1.495 | 8.873 | 0.046 | n/a | 0.136 | 10.777 | n/a | n/a | 0.047 | 3.911 | 0.155 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002b4 | 24.155 | 3.821 | 0.281 | 0.000 | 0.088 | 1.555 | 8.642 | 0.042 | n/a | 0.097 | 9.574 | n/a | n/a | 0.055 | 4.190 | 0.173 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002d1 | 23.983 | 10.887 | 0.008 | 0.000 | 0.792 | 1.293 | 2.755 | 0.072 | n/a | 0.225 | 7.790 | n/a | n/a | 0.161 | 11.687 | 0.487 | 0.161 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000289 | 23.401 | 3.474 | 0.282 | 0.000 | 0.078 | 1.303 | 5.912 | 0.070 | n/a | 0.220 | 11.986 | n/a | n/a | 0.077 | 3.833 | 0.164 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000028b | 23.034 | 4.635 | 0.005 | 0.000 | 0.224 | 0.691 | 1.104 | 0.031 | n/a | 0.143 | 16.128 | n/a | n/a | 0.072 | 4.864 | 0.211 | 0.072 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.573 | 0.976 | 0.000 | 1.683 | 3.949 | 0.008 | 0.000 | 0.848 | 1.087 | 1.518 | 0.034 | n/a | 0.202 | 6.638 | n/a | n/a | 0.065 | 4.969 | 0.350 | 0.065 |
| p99 | 20.815 | 2.536 | 0.022 | 2.802 | 7.526 | n/a | 0.000 | 2.738 | 3.476 | 6.183 | 0.079 | n/a | 0.753 | 12.192 | n/a | n/a | 0.114 | 8.378 | 0.488 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff00000000000002c7 | 20.815 | 4.695 | 0.006 | 0.000 | 2.738 | 1.279 | 0.953 | 0.026 | n/a | 0.753 | 10.309 | n/a | n/a | 0.056 | 7.438 | 0.357 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002be | 20.597 | 3.772 | 0.006 | 0.000 | 0.989 | 1.201 | 2.119 | 0.067 | n/a | 0.202 | 12.192 | n/a | n/a | 0.048 | 4.768 | 0.231 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002ca | 17.805 | 4.789 | 0.012 | 0.000 | 0.822 | 1.087 | 2.476 | 0.079 | n/a | 0.340 | 8.150 | n/a | n/a | 0.050 | 5.624 | 0.316 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002a4 | 17.642 | 7.248 | 0.013 | 0.000 | 1.117 | 1.094 | 1.218 | 0.041 | n/a | 0.165 | 6.638 | n/a | n/a | 0.110 | 8.378 | 0.475 | 0.110 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002b8 | 16.792 | 7.526 | 0.014 | 0.000 | 0.586 | 1.270 | 1.953 | 0.041 | n/a | 0.192 | 5.113 | n/a | n/a | 0.097 | 8.126 | 0.484 | 0.097 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002b0 | 16.537 | 3.949 | 0.007 | 0.000 | 0.920 | 1.995 | 2.267 | 0.065 | n/a | 0.236 | 7.032 | n/a | n/a | 0.065 | 4.877 | 0.295 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002c2 | 16.414 | 4.640 | 0.008 | 0.000 | 1.092 | 0.838 | 1.182 | 0.033 | n/a | 0.357 | 8.196 | n/a | n/a | 0.070 | 5.740 | 0.350 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002bc | 14.573 | 5.835 | 0.007 | 0.000 | 0.848 | 1.096 | 1.577 | 0.046 | n/a | 0.554 | 4.519 | n/a | n/a | 0.092 | 6.690 | 0.459 | 0.092 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002a7 | 14.463 | 3.791 | 0.014 | 0.000 | 0.322 | 0.703 | 1.988 | 0.040 | n/a | 0.497 | 7.061 | n/a | n/a | 0.047 | 4.127 | 0.285 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002a0 | 14.145 | 3.847 | 0.009 | 0.000 | 1.113 | 0.802 | 1.011 | 0.030 | n/a | 0.100 | 7.162 | n/a | n/a | 0.072 | 4.969 | 0.351 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000002ce | 12.706 | 2.185 | n/a | 0.000 | 0.737 | 3.476 | 6.183 | 0.016 | n/a | 0.042 | 0.000 | n/a | n/a | 0.067 | 2.922 | 0.230 | 0.067 | gw-w/thread-45/gateway.admitted-work | none observed |
| 1348aeeee24ee8ff0000000000000287 | 12.133 | 5.257 | 0.011 | 0.000 | 0.647 | 0.775 | 1.036 | 0.034 | n/a | 0.102 | 4.157 | n/a | n/a | 0.114 | 5.915 | 0.488 | 0.114 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff000000000000029d | 11.933 | 2.948 | 0.005 | 0.000 | 0.734 | 0.675 | 1.043 | 0.031 | n/a | 0.415 | 6.050 | n/a | n/a | 0.031 | 3.687 | 0.309 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000294 | 10.291 | 2.814 | 0.005 | 0.000 | 1.090 | 0.619 | 1.518 | 0.030 | n/a | 0.103 | 4.069 | n/a | n/a | 0.043 | 3.909 | 0.380 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (867 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.645 | 0.848 | 0.000 | 1.713 | 3.722 | 0.005 | 0.000 | 0.746 | 0.845 | 1.252 | 0.033 | n/a | 0.143 | 7.267 | n/a | n/a | 0.041 | 4.782 | 0.311 | 0.041 |
| p99 | 80.671 | 3.246 | 0.068 | 4.584 | 10.441 | 2.969 | 0.000 | 25.716 | 11.519 | 11.372 | 3.607 | n/a | 3.563 | 57.923 | n/a | n/a | 0.122 | 29.718 | 0.722 | 0.122 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff000000000000067b | 104.122 | 4.620 | 0.012 | 0.000 | 72.006 | 9.454 | 11.372 | 0.067 | n/a | 0.389 | 6.162 | n/a | n/a | 0.040 | 76.638 | 0.736 | 0.040 | node-14/thread-0/driver.queue.subject | driver.publication 1.392ms; driver.publication 1.264ms; driver.publication 1.212ms; driver.expected-state.bind-receipt 1.110ms; driver.publication 1.107ms |
| 1348aeeee24ee8ff0000000000000677 | 99.311 | 8.345 | 0.005 | 0.000 | 38.739 | 1.960 | 3.057 | 0.038 | n/a | 0.568 | 46.546 | n/a | n/a | 0.052 | 47.090 | 0.474 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 6.644ms; driver.publication 1.392ms; driver.publication 1.212ms |
| 1348aeeee24ee8ff0000000000000681 | 96.562 | 3.827 | 0.006 | 0.000 | 86.457 | 0.570 | 0.799 | 0.022 | n/a | 0.067 | 4.773 | n/a | n/a | 0.041 | 90.290 | 0.935 | 0.041 | node-14/thread-0/driver.queue.subject | driver.publication 1.264ms; driver.publication 1.164ms; driver.expected-state.bind-receipt 1.110ms; driver.publication 1.107ms; driver.publication 1.029ms |
| 1348aeeee24ee8ff000000000000075d | 88.458 | 4.018 | 0.008 | 0.000 | 5.838 | 2.443 | 0.619 | 0.016 | n/a | 0.219 | 75.255 | n/a | n/a | 0.043 | 9.864 | 0.112 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.490ms; driver.publication 0.566ms |
| 1348aeeee24ee8ff0000000000000680 | 86.747 | 3.586 | 0.006 | 0.000 | 69.603 | 3.911 | 2.002 | 0.044 | n/a | 0.441 | 7.105 | n/a | n/a | 0.048 | 73.195 | 0.844 | 0.048 | node-14/thread-0/driver.queue.subject | driver.publication 1.264ms; driver.expected-state.bind-receipt 1.110ms; driver.publication 1.107ms |
| 1348aeeee24ee8ff0000000000000416 | 86.297 | 3.708 | 0.007 | 0.000 | 51.377 | 0.727 | 3.074 | 1.384 | n/a | 1.039 | 24.926 | n/a | n/a | 0.056 | 55.091 | 0.638 | 0.056 | node-14/thread-0/driver.queue.subject | driver.publication 4.548ms; driver.publication 1.506ms; driver.publication 1.457ms; driver.expected-state.bind-receipt 1.443ms; driver.publication 1.287ms |
| 1348aeeee24ee8ff0000000000000758 | 86.017 | 5.695 | 0.007 | 0.000 | 9.872 | 0.675 | 1.628 | 0.026 | n/a | 0.047 | 68.027 | n/a | n/a | 0.040 | 15.574 | 0.181 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.711ms; driver.publication 1.490ms; driver.publication 1.134ms; driver.publication 1.058ms |
| 1348aeeee24ee8ff0000000000000678 | 82.123 | 3.925 | 0.008 | 0.000 | 0.681 | 2.550 | 2.034 | 0.093 | n/a | 0.426 | 72.353 | n/a | n/a | 0.055 | 4.614 | 0.056 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 6.644ms; driver.publication 1.392ms; driver.publication 1.212ms |
| 1348aeeee24ee8ff000000000000040d | 80.671 | 7.217 | 7.959 | 0.000 | 0.062 | 5.891 | 9.441 | 0.078 | n/a | 0.314 | 49.653 | n/a | n/a | 0.057 | 15.238 | 0.189 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.548ms; driver.publication 1.813ms; driver.publication 1.723ms; driver.publication 1.575ms; driver.publication 1.457ms |
| 1348aeeee24ee8ff000000000000067e | 80.181 | 5.017 | 0.011 | 0.000 | 11.778 | 1.747 | 0.967 | 0.020 | n/a | 0.074 | 60.525 | n/a | n/a | 0.042 | 16.806 | 0.210 | 0.042 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.264ms; driver.publication 1.212ms; driver.expected-state.bind-receipt 1.110ms; driver.publication 1.092ms |
| 1348aeeee24ee8ff000000000000075f | 78.908 | 4.073 | 0.009 | 0.000 | 2.932 | 3.736 | 0.690 | 0.023 | n/a | 0.273 | 67.110 | n/a | n/a | 0.062 | 7.013 | 0.089 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.490ms; driver.publication 1.021ms |
| 1348aeeee24ee8ff000000000000067f | 77.234 | 6.159 | 0.203 | 0.000 | 1.304 | 2.037 | 3.339 | 0.011 | n/a | 0.021 | 64.119 | n/a | n/a | 0.040 | 7.666 | 0.099 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.264ms; driver.expected-state.bind-receipt 1.110ms; driver.publication 1.107ms |
| 1348aeeee24ee8ff00000000000004ad | 72.025 | 2.970 | 0.003 | 0.000 | 2.243 | 0.435 | 1.338 | 0.052 | n/a | 0.099 | 64.856 | n/a | n/a | 0.030 | 5.216 | 0.072 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.854ms; driver.expected-state.bind-receipt 1.291ms; driver.publication 1.044ms |
| 1348aeeee24ee8ff000000000000067a | 70.772 | 3.483 | 0.007 | 0.000 | 9.257 | 1.988 | 1.918 | 0.052 | n/a | 0.162 | 53.856 | n/a | n/a | 0.048 | 12.747 | 0.180 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 6.644ms; driver.publication 1.392ms; driver.publication 1.212ms |
| 1348aeeee24ee8ff00000000000004ac | 70.034 | 5.158 | 0.005 | 0.000 | 8.986 | 0.757 | 1.244 | 0.026 | n/a | 0.093 | 53.714 | n/a | n/a | 0.051 | 14.149 | 0.202 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.291ms; driver.publication 1.044ms; driver.publication 1.041ms |
| 1348aeeee24ee8ff00000000000004af | 69.317 | 4.031 | 0.020 | 0.000 | 5.396 | 0.994 | 0.855 | 0.020 | n/a | 0.044 | 57.923 | n/a | n/a | 0.035 | 9.446 | 0.136 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.886ms; driver.publication 1.854ms; driver.expected-state.bind-receipt 1.291ms; driver.publication 1.065ms; driver.publication 1.044ms |
| 1348aeeee24ee8ff00000000000004b1 | 67.787 | 3.565 | 0.004 | 0.000 | 53.068 | 0.438 | 1.537 | 0.030 | n/a | 0.053 | 9.062 | n/a | n/a | 0.030 | 56.638 | 0.836 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 3.018ms; driver.publication 2.886ms; driver.publication 1.854ms; driver.expected-state.bind-receipt 1.291ms; driver.publication 1.065ms |
| 1348aeeee24ee8ff000000000000031d | 67.741 | 3.605 | 0.006 | 0.000 | 0.366 | 0.615 | 1.143 | 0.027 | n/a | 0.067 | 61.870 | n/a | n/a | 0.041 | 3.977 | 0.059 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff00000000000004ae | 66.955 | 9.320 | 0.016 | 0.000 | 0.174 | 0.822 | 1.302 | 0.025 | n/a | 0.100 | 55.164 | n/a | n/a | 0.033 | 9.510 | 0.142 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.854ms; driver.expected-state.bind-receipt 1.291ms; driver.publication 1.065ms; driver.publication 1.044ms |
| 1348aeeee24ee8ff0000000000000417 | 66.104 | 5.087 | 0.010 | 0.000 | 43.267 | 0.760 | 4.432 | 0.100 | n/a | 3.454 | 8.914 | n/a | n/a | 0.081 | 48.364 | 0.732 | 0.081 | node-14/thread-0/driver.queue.subject | driver.publication 4.548ms; driver.publication 1.506ms; driver.publication 1.457ms; driver.expected-state.bind-receipt 1.443ms; driver.publication 1.248ms |

## P2 / L1024 / commit / 5-10 facts (506 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.882 | 0.712 | 0.000 | 1.543 | 3.312 | 0.005 | 0.000 | 0.765 | 0.814 | 1.079 | 0.033 | n/a | 0.139 | 6.843 | n/a | n/a | 0.040 | 4.195 | 0.299 | 0.040 |
| p99 | 80.181 | 2.097 | 0.037 | 4.042 | 7.503 | 0.251 | 0.000 | 23.805 | 10.267 | 5.825 | 3.607 | n/a | 3.563 | 60.525 | n/a | n/a | 0.114 | 27.296 | 0.722 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff000000000000067b | 104.122 | 4.620 | 0.012 | 0.000 | 72.006 | 9.454 | 11.372 | 0.067 | n/a | 0.389 | 6.162 | n/a | n/a | 0.040 | 76.638 | 0.736 | 0.040 | node-14/thread-0/driver.queue.subject | driver.publication 1.392ms; driver.publication 1.264ms; driver.publication 1.212ms; driver.expected-state.bind-receipt 1.110ms; driver.publication 1.107ms |
| 1348aeeee24ee8ff0000000000000681 | 96.562 | 3.827 | 0.006 | 0.000 | 86.457 | 0.570 | 0.799 | 0.022 | n/a | 0.067 | 4.773 | n/a | n/a | 0.041 | 90.290 | 0.935 | 0.041 | node-14/thread-0/driver.queue.subject | driver.publication 1.264ms; driver.publication 1.164ms; driver.expected-state.bind-receipt 1.110ms; driver.publication 1.107ms; driver.publication 1.029ms |
| 1348aeeee24ee8ff000000000000075d | 88.458 | 4.018 | 0.008 | 0.000 | 5.838 | 2.443 | 0.619 | 0.016 | n/a | 0.219 | 75.255 | n/a | n/a | 0.043 | 9.864 | 0.112 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.490ms; driver.publication 0.566ms |
| 1348aeeee24ee8ff0000000000000416 | 86.297 | 3.708 | 0.007 | 0.000 | 51.377 | 0.727 | 3.074 | 1.384 | n/a | 1.039 | 24.926 | n/a | n/a | 0.056 | 55.091 | 0.638 | 0.056 | node-14/thread-0/driver.queue.subject | driver.publication 4.548ms; driver.publication 1.506ms; driver.publication 1.457ms; driver.expected-state.bind-receipt 1.443ms; driver.publication 1.287ms |
| 1348aeeee24ee8ff0000000000000678 | 82.123 | 3.925 | 0.008 | 0.000 | 0.681 | 2.550 | 2.034 | 0.093 | n/a | 0.426 | 72.353 | n/a | n/a | 0.055 | 4.614 | 0.056 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 6.644ms; driver.publication 1.392ms; driver.publication 1.212ms |
| 1348aeeee24ee8ff000000000000067e | 80.181 | 5.017 | 0.011 | 0.000 | 11.778 | 1.747 | 0.967 | 0.020 | n/a | 0.074 | 60.525 | n/a | n/a | 0.042 | 16.806 | 0.210 | 0.042 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.264ms; driver.publication 1.212ms; driver.expected-state.bind-receipt 1.110ms; driver.publication 1.092ms |
| 1348aeeee24ee8ff000000000000075f | 78.908 | 4.073 | 0.009 | 0.000 | 2.932 | 3.736 | 0.690 | 0.023 | n/a | 0.273 | 67.110 | n/a | n/a | 0.062 | 7.013 | 0.089 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.490ms; driver.publication 1.021ms |
| 1348aeeee24ee8ff000000000000067f | 77.234 | 6.159 | 0.203 | 0.000 | 1.304 | 2.037 | 3.339 | 0.011 | n/a | 0.021 | 64.119 | n/a | n/a | 0.040 | 7.666 | 0.099 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.264ms; driver.expected-state.bind-receipt 1.110ms; driver.publication 1.107ms |
| 1348aeeee24ee8ff000000000000067a | 70.772 | 3.483 | 0.007 | 0.000 | 9.257 | 1.988 | 1.918 | 0.052 | n/a | 0.162 | 53.856 | n/a | n/a | 0.048 | 12.747 | 0.180 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 6.644ms; driver.publication 1.392ms; driver.publication 1.212ms |
| 1348aeeee24ee8ff00000000000004af | 69.317 | 4.031 | 0.020 | 0.000 | 5.396 | 0.994 | 0.855 | 0.020 | n/a | 0.044 | 57.923 | n/a | n/a | 0.035 | 9.446 | 0.136 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.886ms; driver.publication 1.854ms; driver.expected-state.bind-receipt 1.291ms; driver.publication 1.065ms; driver.publication 1.044ms |
| 1348aeeee24ee8ff000000000000031d | 67.741 | 3.605 | 0.006 | 0.000 | 0.366 | 0.615 | 1.143 | 0.027 | n/a | 0.067 | 61.870 | n/a | n/a | 0.041 | 3.977 | 0.059 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000000417 | 66.104 | 5.087 | 0.010 | 0.000 | 43.267 | 0.760 | 4.432 | 0.100 | n/a | 3.454 | 8.914 | n/a | n/a | 0.081 | 48.364 | 0.732 | 0.081 | node-14/thread-0/driver.queue.subject | driver.publication 4.548ms; driver.publication 1.506ms; driver.publication 1.457ms; driver.expected-state.bind-receipt 1.443ms; driver.publication 1.248ms |
| 1348aeeee24ee8ff00000000000004b0 | 62.850 | 4.973 | 0.006 | 0.000 | 1.032 | 1.600 | 1.427 | 0.045 | n/a | 0.110 | 53.604 | n/a | n/a | 0.052 | 6.010 | 0.096 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.886ms; driver.publication 1.854ms; driver.expected-state.bind-receipt 1.291ms; driver.publication 1.065ms; driver.publication 1.044ms |
| 1348aeeee24ee8ff0000000000000675 | 61.335 | 4.186 | 0.003 | 0.000 | 2.332 | 11.519 | 1.528 | 3.000 | n/a | 0.027 | 38.675 | n/a | n/a | 0.065 | 6.521 | 0.106 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 6.644ms |
| 1348aeeee24ee8ff0000000000000413 | 60.432 | 4.017 | 0.009 | 0.000 | 8.770 | 9.592 | 1.550 | 0.087 | n/a | 4.180 | 32.183 | n/a | n/a | 0.045 | 12.795 | 0.212 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 4.548ms; driver.publication 1.813ms; driver.publication 1.457ms; driver.publication 1.400ms |
| 1348aeeee24ee8ff00000000000003d3 | 56.969 | 4.009 | 0.004 | 0.000 | 0.344 | 0.625 | 5.285 | 0.053 | n/a | 0.120 | 46.485 | n/a | n/a | 0.042 | 4.358 | 0.076 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.516ms; driver.publication 1.355ms |
| 1348aeeee24ee8ff00000000000006ed | 56.415 | 2.643 | 0.004 | 0.000 | 0.421 | 4.103 | 0.899 | 0.030 | n/a | 0.073 | 48.206 | n/a | n/a | 0.037 | 3.067 | 0.054 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.962ms; client.encode 1.695ms; driver.publication 1.167ms; driver.publication 1.160ms |
| 1348aeeee24ee8ff0000000000000322 | 54.601 | 3.939 | 0.009 | 0.000 | 0.730 | 5.960 | 1.598 | 0.972 | n/a | 1.197 | 40.133 | n/a | n/a | 0.063 | 4.678 | 0.086 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.071ms; driver.publication 1.142ms |
| 1348aeeee24ee8ff0000000000000400 | 52.831 | 8.447 | 0.275 | 0.000 | 1.979 | 2.194 | 1.376 | 0.027 | n/a | 0.341 | 38.159 | n/a | n/a | 0.033 | 10.701 | 0.203 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.555ms |
| 1348aeeee24ee8ff00000000000006ee | 51.582 | 4.769 | 0.003 | 0.000 | 2.561 | 0.814 | 0.845 | 0.023 | n/a | 0.276 | 42.257 | n/a | n/a | 0.034 | 7.333 | 0.142 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.962ms; driver.publication 1.160ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.768 | 1.466 | 0.000 | 1.461 | 3.325 | 0.007 | 0.000 | 1.365 | 0.614 | 0.632 | 0.049 | n/a | 0.031 | 11.712 | n/a | n/a | 0.032 | 4.697 | 0.264 | 0.032 |
| p99 | 17.768 | 1.466 | 0.000 | 1.461 | 3.325 | 0.007 | 0.000 | 1.365 | 0.614 | 0.632 | 0.049 | n/a | 0.031 | 11.712 | n/a | n/a | 0.032 | 4.697 | 0.264 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff00000000000009a2 | 17.768 | 3.325 | 0.007 | 0.000 | 1.365 | 0.614 | 0.632 | 0.049 | n/a | 0.031 | 11.712 | n/a | n/a | 0.032 | 4.697 | 0.264 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.119ms |

## P2 / tail / commit (2599 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.893 | 0.839 | 0.000 | 1.685 | 3.716 | 0.005 | 0.000 | 0.746 | 0.722 | 1.124 | 0.030 | n/a | 0.107 | 5.587 | n/a | n/a | 0.037 | 4.705 | 0.360 | 0.037 |
| p99 | 83.369 | 3.433 | 0.070 | 5.750 | 11.916 | 0.829 | 0.000 | 25.910 | 19.075 | 8.838 | 2.691 | n/a | 3.063 | 49.251 | n/a | n/a | 0.109 | 35.288 | 0.721 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff00000000000014c9 | 169.651 | 7.664 | 0.013 | 0.000 | 125.177 | 21.227 | 1.483 | 0.034 | n/a | 0.111 | 13.891 | n/a | n/a | 0.052 | 132.854 | 0.783 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 6.179ms; driver.publication 5.961ms; driver.publication 4.327ms; driver.publication 3.886ms; driver.publication 3.829ms |
| 1348aeeee24ee8ff00000000000014d1 | 153.858 | 11.880 | 0.009 | 0.000 | 123.023 | 0.989 | 4.011 | 0.082 | n/a | 0.274 | 13.546 | n/a | n/a | 0.043 | 134.912 | 0.877 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 6.179ms; driver.publication 3.886ms; driver.publication 3.074ms; driver.expected-state.bind-receipt 2.935ms; driver.publication 2.724ms |
| 1348aeeee24ee8ff00000000000014c3 | 131.072 | 32.290 | 0.009 | 0.000 | 31.123 | 11.883 | 5.277 | 0.037 | n/a | 15.470 | 34.901 | n/a | n/a | 0.082 | 63.422 | 0.484 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 4.029ms; driver.publication 3.829ms; client.encode 2.041ms; driver.expected-state.bind-receipt 1.642ms |
| 1348aeeee24ee8ff0000000000001bd6 | 128.531 | 13.216 | 0.020 | 0.000 | 67.364 | 22.162 | 1.908 | 0.073 | n/a | 0.225 | 23.479 | n/a | n/a | 0.084 | 80.600 | 0.627 | 0.084 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.164ms; driver.publication 5.982ms; driver.publication 5.483ms; driver.publication 3.107ms; driver.publication 2.852ms |
| 1348aeeee24ee8ff00000000000014c8 | 127.387 | 17.998 | 0.017 | 0.000 | 39.947 | 35.106 | 2.491 | 0.070 | n/a | 0.177 | 31.501 | n/a | n/a | 0.081 | 57.962 | 0.455 | 0.081 | node-14/thread-0/driver.queue.subject | driver.publication 6.179ms; driver.publication 5.961ms; driver.publication 4.327ms; driver.publication 3.886ms; driver.publication 3.829ms |
| 1348aeeee24ee8ff00000000000014c2 | 126.316 | 33.943 | 1.568 | 0.000 | 0.641 | 10.711 | 13.209 | 0.766 | n/a | 6.090 | 59.327 | n/a | n/a | 0.061 | 36.152 | 0.286 | 0.061 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | client.encode 2.041ms |
| 1348aeeee24ee8ff00000000000014c7 | 125.251 | 14.226 | 0.182 | 0.000 | 26.991 | 44.423 | 1.595 | 0.035 | n/a | 0.059 | 36.949 | n/a | n/a | 0.790 | 41.399 | 0.331 | 0.790 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.179ms; driver.publication 5.961ms; driver.publication 4.327ms; driver.publication 3.886ms; driver.publication 3.829ms |
| 1348aeeee24ee8ff00000000000014c6 | 113.915 | 11.408 | 0.029 | 0.000 | 29.821 | 37.489 | 2.352 | 0.035 | n/a | 0.090 | 32.573 | n/a | n/a | 0.118 | 41.258 | 0.362 | 0.118 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.179ms; driver.publication 5.961ms; driver.publication 4.327ms; driver.publication 3.829ms; driver.expected-state.bind-receipt 2.181ms |
| 1348aeeee24ee8ff00000000000014c5 | 110.913 | 40.365 | 0.213 | 0.000 | 2.293 | 26.689 | 2.456 | 0.037 | n/a | 0.058 | 38.734 | n/a | n/a | 0.068 | 42.871 | 0.387 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.961ms; driver.publication 4.327ms; driver.publication 3.829ms; driver.expected-state.bind-receipt 2.091ms; driver.expected-state.bind-receipt 1.642ms |
| 1348aeeee24ee8ff00000000000014c4 | 101.155 | 19.600 | 0.022 | 0.000 | 15.524 | 20.586 | 1.919 | 0.029 | n/a | 1.675 | 41.695 | n/a | n/a | 0.104 | 35.147 | 0.347 | 0.104 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 5.961ms; driver.publication 3.829ms; driver.expected-state.bind-receipt 2.091ms; client.encode 2.041ms; driver.expected-state.bind-receipt 1.642ms |
| 1348aeeee24ee8ff00000000000009e7 | 97.648 | 2.875 | 0.004 | 0.000 | 1.001 | 1.532 | 0.719 | 0.016 | n/a | 0.113 | 91.354 | n/a | n/a | 0.035 | 3.879 | 0.040 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.087ms; driver.expected-state.bind-receipt 1.701ms; driver.publication 1.228ms; driver.publication 1.225ms; driver.publication 1.151ms |
| 1348aeeee24ee8ff00000000000014d0 | 94.519 | 12.899 | 0.008 | 0.000 | 29.212 | 37.352 | 2.473 | 0.051 | n/a | 0.078 | 12.192 | n/a | n/a | 0.254 | 42.119 | 0.446 | 0.254 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.179ms; driver.publication 3.886ms; driver.publication 2.724ms; driver.expected-state.bind-receipt 2.386ms; driver.expected-state.bind-receipt 2.181ms |
| 1348aeeee24ee8ff0000000000001bd5 | 94.133 | 11.732 | 3.597 | 0.000 | 44.810 | 7.640 | 1.453 | 3.919 | n/a | 0.018 | 20.918 | n/a | n/a | 0.045 | 60.139 | 0.639 | 0.045 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.483ms; driver.publication 2.852ms |
| 1348aeeee24ee8ff00000000000014db | 93.444 | 9.363 | 0.007 | 0.000 | 49.234 | 17.707 | 2.923 | 0.041 | n/a | 0.076 | 14.056 | n/a | n/a | 0.036 | 58.604 | 0.627 | 0.036 | node-14/thread-0/driver.queue.subject | driver.publication 3.074ms; driver.expected-state.bind-receipt 2.935ms; driver.publication 2.724ms; driver.expected-state.bind-receipt 2.386ms; driver.expected-state.bind-receipt 2.084ms |
| 1348aeeee24ee8ff00000000000009e8 | 93.043 | 2.594 | 0.003 | 0.000 | 0.443 | 2.450 | 1.200 | 0.032 | n/a | 0.301 | 85.988 | n/a | n/a | 0.031 | 3.041 | 0.033 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.087ms; driver.expected-state.bind-receipt 1.701ms; driver.publication 1.228ms; driver.publication 1.225ms; driver.publication 1.151ms |
| 1348aeeee24ee8ff0000000000001d71 | 92.732 | 3.528 | 0.006 | 0.000 | 1.196 | 7.268 | 8.628 | 1.201 | n/a | 0.215 | 70.680 | n/a | n/a | 0.011 | 4.730 | 0.051 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.549ms; driver.publication 1.461ms; driver.publication 1.046ms |
| 1348aeeee24ee8ff0000000000001bd4 | 92.417 | 8.499 | 0.013 | 0.000 | 47.034 | 15.791 | 6.044 | 0.042 | n/a | 0.117 | 14.792 | n/a | n/a | 0.084 | 55.546 | 0.601 | 0.084 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.483ms |
| 1348aeeee24ee8ff0000000000001d6f | 90.918 | 4.841 | 0.008 | 0.000 | 0.793 | 3.268 | 2.996 | 0.124 | n/a | 3.574 | 75.273 | n/a | n/a | 0.040 | 5.642 | 0.062 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.461ms |
| 1348aeeee24ee8ff0000000000001619 | 90.613 | 5.613 | 0.009 | 0.000 | 69.019 | 6.188 | 1.572 | 0.038 | n/a | 0.098 | 8.024 | n/a | n/a | 0.053 | 74.641 | 0.824 | 0.053 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.669ms; driver.publication 1.459ms; driver.publication 1.430ms; driver.publication 1.330ms; driver.publication 1.234ms |
| 1348aeeee24ee8ff0000000000001bdf | 90.451 | 4.490 | 0.010 | 0.000 | 33.982 | 8.061 | 2.003 | 0.078 | n/a | 0.162 | 41.620 | n/a | n/a | 0.046 | 38.482 | 0.425 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 8.230ms; driver.publication 5.982ms; driver.publication 5.862ms; driver.publication 4.080ms; driver.publication 3.107ms |

## P2 / tail / commit / 5-10 facts (1541 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.654 | 0.704 | 0.000 | 1.568 | 3.260 | 0.005 | 0.000 | 0.784 | 0.720 | 0.981 | 0.030 | n/a | 0.105 | 5.042 | n/a | n/a | 0.036 | 4.214 | 0.353 | 0.036 |
| p99 | 79.972 | 2.401 | 0.070 | 5.606 | 10.312 | 0.154 | 0.000 | 19.812 | 21.227 | 5.244 | 2.814 | n/a | 2.853 | 49.045 | n/a | n/a | 0.104 | 27.807 | 0.721 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1348aeeee24ee8ff00000000000014c9 | 169.651 | 7.664 | 0.013 | 0.000 | 125.177 | 21.227 | 1.483 | 0.034 | n/a | 0.111 | 13.891 | n/a | n/a | 0.052 | 132.854 | 0.783 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 6.179ms; driver.publication 5.961ms; driver.publication 4.327ms; driver.publication 3.886ms; driver.publication 3.829ms |
| 1348aeeee24ee8ff0000000000001bd6 | 128.531 | 13.216 | 0.020 | 0.000 | 67.364 | 22.162 | 1.908 | 0.073 | n/a | 0.225 | 23.479 | n/a | n/a | 0.084 | 80.600 | 0.627 | 0.084 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 6.164ms; driver.publication 5.982ms; driver.publication 5.483ms; driver.publication 3.107ms; driver.publication 2.852ms |
| 1348aeeee24ee8ff00000000000014c2 | 126.316 | 33.943 | 1.568 | 0.000 | 0.641 | 10.711 | 13.209 | 0.766 | n/a | 6.090 | 59.327 | n/a | n/a | 0.061 | 36.152 | 0.286 | 0.061 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | client.encode 2.041ms |
| 1348aeeee24ee8ff00000000000014c6 | 113.915 | 11.408 | 0.029 | 0.000 | 29.821 | 37.489 | 2.352 | 0.035 | n/a | 0.090 | 32.573 | n/a | n/a | 0.118 | 41.258 | 0.362 | 0.118 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.179ms; driver.publication 5.961ms; driver.publication 4.327ms; driver.publication 3.829ms; driver.expected-state.bind-receipt 2.181ms |
| 1348aeeee24ee8ff00000000000014c4 | 101.155 | 19.600 | 0.022 | 0.000 | 15.524 | 20.586 | 1.919 | 0.029 | n/a | 1.675 | 41.695 | n/a | n/a | 0.104 | 35.147 | 0.347 | 0.104 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 5.961ms; driver.publication 3.829ms; driver.expected-state.bind-receipt 2.091ms; client.encode 2.041ms; driver.expected-state.bind-receipt 1.642ms |
| 1348aeeee24ee8ff00000000000009e7 | 97.648 | 2.875 | 0.004 | 0.000 | 1.001 | 1.532 | 0.719 | 0.016 | n/a | 0.113 | 91.354 | n/a | n/a | 0.035 | 3.879 | 0.040 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.087ms; driver.expected-state.bind-receipt 1.701ms; driver.publication 1.228ms; driver.publication 1.225ms; driver.publication 1.151ms |
| 1348aeeee24ee8ff0000000000001d71 | 92.732 | 3.528 | 0.006 | 0.000 | 1.196 | 7.268 | 8.628 | 1.201 | n/a | 0.215 | 70.680 | n/a | n/a | 0.011 | 4.730 | 0.051 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.549ms; driver.publication 1.461ms; driver.publication 1.046ms |
| 1348aeeee24ee8ff0000000000001bd4 | 92.417 | 8.499 | 0.013 | 0.000 | 47.034 | 15.791 | 6.044 | 0.042 | n/a | 0.117 | 14.792 | n/a | n/a | 0.084 | 55.546 | 0.601 | 0.084 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 5.483ms |
| 1348aeeee24ee8ff0000000000001d6f | 90.918 | 4.841 | 0.008 | 0.000 | 0.793 | 3.268 | 2.996 | 0.124 | n/a | 3.574 | 75.273 | n/a | n/a | 0.040 | 5.642 | 0.062 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.461ms |
| 1348aeeee24ee8ff0000000000001bdf | 90.451 | 4.490 | 0.010 | 0.000 | 33.982 | 8.061 | 2.003 | 0.078 | n/a | 0.162 | 41.620 | n/a | n/a | 0.046 | 38.482 | 0.425 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 8.230ms; driver.publication 5.982ms; driver.publication 5.862ms; driver.publication 4.080ms; driver.publication 3.107ms |
| 1348aeeee24ee8ff00000000000009ea | 87.792 | 2.326 | 0.004 | 0.000 | 3.142 | 5.195 | 0.711 | 0.027 | n/a | 0.076 | 76.285 | n/a | n/a | 0.026 | 5.472 | 0.062 | 0.026 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 2.087ms; driver.expected-state.bind-receipt 1.701ms; driver.publication 1.228ms; driver.publication 1.225ms; driver.publication 1.185ms |
| 1348aeeee24ee8ff00000000000017fb | 87.281 | 2.944 | 0.006 | 0.000 | 50.847 | 1.892 | 1.652 | 0.048 | n/a | 0.098 | 29.762 | n/a | n/a | 0.033 | 53.797 | 0.616 | 0.033 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.049ms; driver.publication 1.566ms; driver.publication 1.121ms; driver.publication 1.077ms |
| 1348aeeee24ee8ff00000000000014cc | 82.343 | 7.228 | 0.006 | 0.000 | 5.821 | 31.890 | 5.724 | 0.187 | n/a | 0.297 | 31.139 | n/a | n/a | 0.051 | 13.055 | 0.159 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 6.179ms; driver.publication 4.327ms; driver.publication 3.886ms; driver.expected-state.bind-receipt 2.181ms; driver.publication 2.119ms |
| 1348aeeee24ee8ff0000000000001d72 | 81.827 | 3.541 | 0.003 | 0.000 | 0.379 | 0.408 | 0.656 | 0.021 | n/a | 0.170 | 76.614 | n/a | n/a | 0.034 | 3.924 | 0.048 | 0.034 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 1348aeeee24ee8ff0000000000001bd3 | 81.103 | 53.843 | 0.008 | 0.000 | 0.376 | 6.417 | 2.257 | 0.073 | n/a | 0.531 | 17.529 | n/a | n/a | 0.069 | 54.227 | 0.669 | 0.069 | node-14/thread-0/client.validation-and-staging | none observed |
| 1348aeeee24ee8ff0000000000001bdb | 79.972 | 12.923 | 0.009 | 0.000 | 11.747 | 28.171 | 1.512 | 0.090 | n/a | 0.834 | 24.615 | n/a | n/a | 0.070 | 24.679 | 0.309 | 0.070 | node-14/thread-0/socket.wait-first-byte | driver.publication 8.230ms; driver.publication 6.164ms; driver.publication 5.982ms; driver.publication 5.483ms; driver.publication 3.107ms |
| 1348aeeee24ee8ff0000000000001d74 | 78.780 | 3.948 | 0.003 | 0.000 | 0.926 | 0.267 | 0.846 | 0.020 | n/a | 0.052 | 72.664 | n/a | n/a | 0.053 | 4.877 | 0.062 | 0.053 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.549ms; driver.publication 1.461ms; driver.publication 1.046ms |
| 1348aeeee24ee8ff00000000000009e6 | 77.153 | 6.352 | 0.008 | 0.000 | 0.733 | 3.219 | 0.848 | 0.025 | n/a | 0.281 | 65.633 | n/a | n/a | 0.055 | 7.093 | 0.092 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.087ms; driver.expected-state.bind-receipt 1.701ms; driver.publication 1.228ms; driver.publication 1.225ms; driver.publication 1.151ms |
| 1348aeeee24ee8ff00000000000014da | 77.148 | 4.591 | 0.009 | 0.000 | 36.351 | 22.860 | 1.159 | 0.034 | n/a | 0.105 | 11.977 | n/a | n/a | 0.063 | 40.950 | 0.531 | 0.063 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.724ms; driver.expected-state.bind-receipt 2.386ms; driver.publication 2.119ms; driver.expected-state.bind-receipt 2.084ms; driver.publication 1.804ms |
| 1348aeeee24ee8ff00000000000009e2 | 76.286 | 2.779 | 0.002 | 0.000 | 1.722 | 2.266 | 1.066 | 0.057 | n/a | 3.076 | 65.294 | n/a | n/a | 0.024 | 4.503 | 0.059 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.087ms; driver.expected-state.bind-receipt 1.701ms; driver.publication 1.228ms; driver.publication 1.008ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.638 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.944 | 200.909 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 |
| p99 | 424.209 | n/a | n/a | n/a | 20.227 | n/a | 2.315 | 0.000 | 5.081 | 419.184 | 0.167 | n/a | 0.241 | 0.000 | n/a | n/a | 0.474 | 22.542 | 0.248 | 0.474 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae890000000000000002 | 424.209 | 2.911 | n/a | 0.000 | 0.000 | 1.351 | 419.184 | 0.167 | n/a | 0.124 | 0.000 | n/a | n/a | 0.474 | 2.911 | 0.007 | 0.474 | gw-r/thread-47/gateway.admitted-work | none observed |
| 3e5abd04f50064a10000000000000f0c | 204.381 | 0.000 | n/a | 0.000 | 0.000 | 0.601 | 203.627 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000007 | 203.819 | 0.000 | n/a | 0.000 | 0.000 | 1.580 | 201.688 | 0.051 | n/a | 0.230 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-42/journal/page | none observed |
| 3e5abd04f50064a10000000000000005 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 200.909 | 0.011 | n/a | 0.114 | 0.000 | n/a | n/a | 0.448 | 0.000 | 0.000 | 0.448 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000006 | 202.453 | 0.000 | n/a | 0.000 | 0.000 | 0.944 | 201.005 | 0.010 | n/a | 0.241 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000f0a | 201.638 | 0.000 | n/a | 0.000 | 0.000 | 0.700 | 200.778 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-67/journal/page | none observed |
| 3e5abd04f50064a10000000000000f0b | 201.633 | 0.000 | n/a | 0.000 | 0.000 | 0.381 | 201.060 | 0.018 | n/a | 0.080 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000f0f | 90.787 | 20.227 | n/a | 2.315 | 0.000 | 4.731 | 63.339 | 0.006 | n/a | 0.003 | 0.000 | n/a | n/a | 0.167 | 22.542 | 0.248 | 0.167 | gw-r/thread-67/gateway.admitted-work | none observed |
| 3e5abd04f50064a10000000000000f11 | 80.641 | 16.730 | n/a | 1.234 | 0.000 | 0.710 | 61.775 | 0.006 | n/a | 0.009 | 0.000 | n/a | n/a | 0.177 | 17.964 | 0.223 | 0.177 | gw-r/thread-65/gateway.admitted-work | none observed |
| 3e5abd04f50064a10000000000000f10 | 76.414 | 15.931 | n/a | 0.000 | 0.000 | 5.081 | 55.206 | 0.006 | n/a | 0.010 | 0.000 | n/a | n/a | 0.180 | 15.931 | 0.208 | 0.180 | gw-r/thread-46/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 848.229 | n/a | n/a | n/a | 0.371 | n/a | 0.000 | 0.000 | 0.826 | 819.103 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.341 | 0.371 | 0.000 | 0.341 |
| p99 | 1012.372 | n/a | n/a | n/a | 15.755 | n/a | 9.904 | 0.000 | 7.974 | 1003.346 | 0.022 | n/a | 0.319 | 0.000 | n/a | n/a | 2.523 | 25.659 | 0.030 | 2.523 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae8900000000000000a4 | 1012.372 | 0.371 | n/a | 0.000 | 0.000 | 7.974 | 1003.346 | 0.022 | n/a | 0.319 | 0.000 | n/a | n/a | 0.341 | 0.371 | 0.000 | 0.341 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000a5 | 848.229 | 15.755 | n/a | 9.904 | 0.000 | 0.826 | 819.103 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 2.523 | 25.659 | 0.030 | 2.523 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 439.858 | n/a | n/a | n/a | 3.390 | n/a | 0.000 | 0.000 | 0.833 | 436.945 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.106 | 3.390 | 0.009 | 0.106 |
| p99 | 1021.292 | n/a | n/a | n/a | 16.503 | n/a | 1.097 | 0.000 | 3.539 | 1001.999 | 0.193 | n/a | 0.165 | 0.000 | n/a | n/a | 38.605 | 17.600 | 0.403 | 38.605 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae8900000000000000d0 | 1021.292 | 16.503 | n/a | 1.097 | 0.000 | 1.490 | 1001.999 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.171 | 17.600 | 0.017 | 0.171 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000b4 | 1003.933 | 0.176 | n/a | 0.000 | 0.000 | 0.737 | 1001.744 | 0.016 | n/a | 0.112 | 0.000 | n/a | n/a | 1.148 | 0.176 | 0.000 | 1.148 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000bb | 986.297 | 2.770 | n/a | 0.000 | 0.000 | 0.813 | 982.509 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.116 | 2.770 | 0.003 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000bc | 940.980 | 4.057 | n/a | 0.000 | 0.000 | 1.239 | 935.489 | 0.012 | n/a | 0.080 | 0.000 | n/a | n/a | 0.103 | 4.057 | 0.004 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000b2 | 896.791 | 2.747 | n/a | 0.000 | 0.000 | 0.640 | 893.170 | 0.024 | n/a | 0.130 | 0.000 | n/a | n/a | 0.079 | 2.747 | 0.003 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000ca | 837.908 | 3.626 | n/a | 0.000 | 0.000 | 0.960 | 833.103 | 0.013 | n/a | 0.114 | 0.000 | n/a | n/a | 0.092 | 3.626 | 0.004 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000c6 | 815.820 | 2.515 | n/a | 0.000 | 0.000 | 0.579 | 812.571 | 0.017 | n/a | 0.061 | 0.000 | n/a | n/a | 0.077 | 2.515 | 0.003 | 0.077 | gw-r/thread-42/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000ae | 815.288 | 3.601 | n/a | 0.000 | 0.000 | 1.096 | 810.346 | 0.023 | n/a | 0.131 | 0.000 | n/a | n/a | 0.091 | 3.601 | 0.004 | 0.091 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000c1 | 812.336 | 3.529 | n/a | 0.000 | 0.000 | 0.673 | 807.941 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.110 | 3.529 | 0.004 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000ab | 699.782 | 2.706 | n/a | 0.000 | 0.000 | 1.014 | 695.811 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.134 | 2.706 | 0.004 | 0.134 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000a7 | 596.321 | 3.089 | n/a | 0.000 | 0.000 | 0.833 | 592.103 | 0.043 | n/a | 0.115 | 0.000 | n/a | n/a | 0.138 | 3.089 | 0.005 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000c2 | 573.765 | 14.095 | n/a | 0.000 | 0.000 | 3.346 | 556.031 | 0.022 | n/a | 0.072 | 0.000 | n/a | n/a | 0.199 | 14.095 | 0.025 | 0.199 | gw-r/thread-42/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000a8 | 570.288 | 2.391 | n/a | 0.000 | 0.000 | 0.826 | 566.801 | 0.014 | n/a | 0.150 | 0.000 | n/a | n/a | 0.106 | 2.391 | 0.004 | 0.106 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000ba | 547.140 | 5.546 | n/a | 0.000 | 0.000 | 1.031 | 540.257 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.192 | 5.546 | 0.010 | 0.192 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000c4 | 439.858 | 2.334 | n/a | 0.000 | 0.000 | 0.439 | 436.945 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.075 | 2.334 | 0.005 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000cb | 430.595 | 4.281 | n/a | 0.000 | 0.000 | 1.920 | 424.082 | 0.193 | n/a | 0.020 | 0.000 | n/a | n/a | 0.099 | 4.281 | 0.010 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000aa | 408.926 | 3.390 | n/a | 0.000 | 0.000 | 0.630 | 404.589 | 0.015 | n/a | 0.099 | 0.000 | n/a | n/a | 0.203 | 3.390 | 0.008 | 0.203 | gw-r/thread-42/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000b8 | 373.333 | 4.785 | n/a | 0.000 | 0.000 | 1.080 | 367.249 | 0.015 | n/a | 0.090 | 0.000 | n/a | n/a | 0.113 | 4.785 | 0.013 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000ce | 288.093 | 2.527 | n/a | 0.000 | 0.000 | 2.367 | 283.009 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.076 | 2.527 | 0.009 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000ac | 286.764 | 3.233 | n/a | 0.000 | 0.000 | 2.620 | 280.701 | 0.024 | n/a | 0.105 | 0.000 | n/a | n/a | 0.080 | 3.233 | 0.011 | 0.080 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 404.768 | n/a | n/a | n/a | 4.850 | n/a | 0.611 | 0.000 | 0.797 | 398.478 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.135 | 5.445 | 0.013 | 0.135 |
| p99 | 1008.523 | n/a | n/a | n/a | 11.359 | n/a | 1.870 | 0.000 | 3.834 | 1003.880 | 2.383 | n/a | 0.679 | 0.000 | n/a | n/a | 39.230 | 12.509 | 0.346 | 39.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae890000000000000105 | 1008.523 | 5.359 | n/a | 0.702 | 0.000 | 1.018 | 1001.247 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.104 | 6.060 | 0.006 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000dd | 1008.102 | 0.128 | n/a | 0.000 | 0.000 | 2.839 | 1003.880 | 0.017 | n/a | 0.136 | 0.000 | n/a | n/a | 1.103 | 0.128 | 0.000 | 1.103 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000101 | 1007.547 | 5.827 | n/a | 0.000 | 0.000 | 0.853 | 1000.579 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.162 | 5.827 | 0.006 | 0.162 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000d2 | 1004.265 | 4.671 | n/a | 1.017 | 0.000 | 0.861 | 997.458 | 0.011 | n/a | 0.112 | 0.000 | n/a | n/a | 0.135 | 5.688 | 0.006 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000d1 | 1001.476 | 9.225 | n/a | 1.870 | 0.000 | 1.076 | 988.927 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.289 | 11.095 | 0.011 | 0.289 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000010d | 1000.916 | 4.850 | n/a | 0.000 | 0.000 | 0.792 | 995.132 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.064 | 4.850 | 0.005 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000e5 | 988.696 | 3.006 | n/a | 0.468 | 0.000 | 0.526 | 984.490 | 0.020 | n/a | 0.083 | 0.000 | n/a | n/a | 0.102 | 3.474 | 0.004 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000d8 | 985.860 | 3.983 | n/a | 1.444 | 0.000 | 0.824 | 979.280 | 0.021 | n/a | 0.106 | 0.000 | n/a | n/a | 0.202 | 5.427 | 0.006 | 0.202 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000d9 | 976.784 | 5.423 | n/a | 0.535 | 0.000 | 0.499 | 970.146 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.113 | 5.958 | 0.006 | 0.113 | gw-r/thread-42/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000df | 913.376 | 6.064 | n/a | 0.611 | 0.000 | 1.117 | 905.224 | 0.018 | n/a | 0.160 | 0.000 | n/a | n/a | 0.183 | 6.675 | 0.007 | 0.183 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000fe | 740.753 | 5.087 | n/a | 0.643 | 0.000 | 0.863 | 734.046 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.083 | 5.730 | 0.008 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000db | 711.952 | 3.446 | n/a | 0.568 | 0.000 | 3.834 | 703.923 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.102 | 4.014 | 0.006 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000fd | 652.998 | 3.893 | n/a | 0.000 | 0.000 | 0.508 | 648.392 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.158 | 3.893 | 0.006 | 0.158 | gw-r/thread-42/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000e8 | 593.822 | 11.359 | n/a | 1.150 | 0.000 | 0.825 | 580.220 | 0.019 | n/a | 0.095 | 0.000 | n/a | n/a | 0.154 | 12.509 | 0.021 | 0.154 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000e0 | 569.220 | 4.822 | n/a | 0.496 | 0.000 | 0.797 | 562.947 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.100 | 5.317 | 0.009 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000102 | 554.932 | 2.512 | n/a | 0.552 | 0.000 | 1.078 | 550.627 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.092 | 3.064 | 0.006 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000107 | 462.341 | 9.021 | n/a | 0.603 | 0.000 | 1.002 | 451.571 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.113 | 9.624 | 0.021 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000d4 | 439.859 | 4.049 | n/a | 0.938 | 0.000 | 0.699 | 433.974 | 0.018 | n/a | 0.095 | 0.000 | n/a | n/a | 0.087 | 4.987 | 0.011 | 0.087 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000104 | 429.088 | 5.144 | n/a | 0.000 | 0.000 | 0.698 | 423.102 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.078 | 5.144 | 0.012 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000000ee | 420.290 | 6.252 | n/a | 0.721 | 0.000 | 0.582 | 411.807 | 0.045 | n/a | 0.679 | 0.000 | n/a | n/a | 0.203 | 6.973 | 0.017 | 0.203 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / internal (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 471.073 | n/a | n/a | n/a | 3.713 | n/a | 0.000 | 0.000 | 0.788 | 465.251 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.141 | 4.103 | 0.010 | 0.141 |
| p99 | 1006.161 | n/a | n/a | n/a | 16.134 | n/a | 1.903 | 0.000 | 8.416 | 1001.042 | 5.681 | n/a | 0.295 | 0.000 | n/a | n/a | 46.412 | 18.037 | 0.329 | 46.412 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae890000000000000129 | 1006.161 | 4.250 | n/a | 0.983 | 0.000 | 0.479 | 1000.239 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.157 | 5.233 | 0.005 | 0.157 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000146 | 1003.088 | 0.153 | n/a | 0.000 | 0.000 | 0.675 | 1001.042 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 1.129 | 0.153 | 0.000 | 1.129 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000012a | 1002.481 | 3.255 | n/a | 0.000 | 0.000 | 0.429 | 998.606 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.103 | 3.255 | 0.003 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000136 | 996.292 | 3.161 | n/a | 0.000 | 0.000 | 0.788 | 991.355 | 0.007 | n/a | 0.119 | 0.000 | n/a | n/a | 0.863 | 3.161 | 0.003 | 0.863 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000011c | 988.687 | 4.681 | n/a | 0.541 | 0.000 | 0.761 | 982.554 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.094 | 5.222 | 0.005 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000125 | 987.133 | 3.164 | n/a | 1.313 | 0.000 | 0.650 | 981.800 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.138 | 4.477 | 0.005 | 0.138 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000013f | 986.078 | 2.724 | n/a | 0.000 | 0.000 | 1.675 | 981.311 | 0.011 | n/a | 0.281 | 0.000 | n/a | n/a | 0.077 | 2.724 | 0.003 | 0.077 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000114 | 975.379 | 4.219 | n/a | 0.667 | 0.000 | 0.722 | 969.630 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.111 | 4.887 | 0.005 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000131 | 925.372 | 5.229 | n/a | 0.000 | 0.000 | 1.154 | 918.804 | 0.017 | n/a | 0.092 | 0.000 | n/a | n/a | 0.075 | 5.229 | 0.006 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000012c | 911.818 | 12.475 | n/a | 0.722 | 0.000 | 0.836 | 897.523 | 0.018 | n/a | 0.064 | 0.000 | n/a | n/a | 0.180 | 13.197 | 0.014 | 0.180 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000124 | 905.132 | 4.760 | n/a | 0.000 | 0.000 | 1.031 | 899.100 | 0.007 | n/a | 0.108 | 0.000 | n/a | n/a | 0.125 | 4.760 | 0.005 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000013c | 771.641 | 3.355 | n/a | 0.000 | 0.000 | 0.773 | 767.279 | 0.019 | n/a | 0.067 | 0.000 | n/a | n/a | 0.147 | 3.355 | 0.004 | 0.147 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000139 | 643.079 | 2.855 | n/a | 0.000 | 0.000 | 0.990 | 639.037 | 0.023 | n/a | 0.090 | 0.000 | n/a | n/a | 0.083 | 2.855 | 0.004 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000111 | 616.083 | 3.493 | n/a | 0.674 | 0.000 | 0.589 | 611.155 | 0.013 | n/a | 0.064 | 0.000 | n/a | n/a | 0.095 | 4.167 | 0.007 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000011a | 612.234 | 3.028 | n/a | 0.000 | 0.000 | 2.007 | 607.065 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.066 | 3.028 | 0.005 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000134 | 546.315 | 2.854 | n/a | 0.000 | 0.000 | 0.822 | 542.374 | 0.005 | n/a | 0.138 | 0.000 | n/a | n/a | 0.121 | 2.854 | 0.005 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000010f | 541.063 | 3.714 | n/a | 0.000 | 0.000 | 0.643 | 536.580 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.068 | 3.714 | 0.007 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000011d | 537.427 | 9.688 | n/a | 0.000 | 0.000 | 1.376 | 525.778 | 0.017 | n/a | 0.295 | 0.000 | n/a | n/a | 0.273 | 9.688 | 0.018 | 0.273 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000126 | 534.382 | 8.680 | n/a | 0.000 | 0.000 | 0.781 | 524.641 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.228 | 8.680 | 0.016 | 0.228 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000140 | 471.073 | 4.712 | n/a | 0.000 | 0.000 | 0.920 | 465.251 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.141 | 4.712 | 0.010 | 0.141 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (47 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 300.351 | n/a | n/a | n/a | 2.705 | n/a | 0.000 | 0.000 | 0.624 | 291.865 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.127 | 2.804 | 0.013 | 0.127 |
| p99 | 1009.493 | n/a | n/a | n/a | 13.580 | n/a | 0.960 | 0.000 | 3.871 | 1005.194 | 0.209 | n/a | 0.561 | 0.000 | n/a | n/a | 44.594 | 13.580 | 0.637 | 44.594 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae890000000000000187 | 1009.493 | 0.159 | n/a | 0.000 | 0.000 | 2.909 | 1005.194 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 1.159 | 0.159 | 0.000 | 1.159 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000017f | 1003.979 | 0.104 | n/a | 0.000 | 0.000 | 0.602 | 1002.061 | 0.033 | n/a | 0.072 | 0.000 | n/a | n/a | 1.108 | 0.104 | 0.000 | 1.108 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000016d | 1003.202 | 0.097 | n/a | 0.000 | 0.000 | 0.624 | 1001.308 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 1.104 | 0.097 | 0.000 | 1.104 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000174 | 1003.167 | 0.110 | n/a | 0.000 | 0.000 | 0.640 | 1000.736 | 0.006 | n/a | 0.561 | 0.000 | n/a | n/a | 1.114 | 0.110 | 0.000 | 1.114 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000163 | 1002.804 | 0.136 | n/a | 0.000 | 0.000 | 0.550 | 1000.907 | 0.018 | n/a | 0.064 | 0.000 | n/a | n/a | 1.128 | 0.136 | 0.000 | 1.128 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000017b | 1002.305 | 2.624 | n/a | 0.000 | 0.000 | 0.369 | 999.187 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.080 | 2.624 | 0.003 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000186 | 990.381 | 3.886 | n/a | 0.000 | 0.000 | 0.823 | 985.541 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.063 | 3.886 | 0.004 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000153 | 976.663 | 3.231 | n/a | 0.000 | 0.000 | 1.790 | 971.436 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.142 | 3.231 | 0.003 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000184 | 862.826 | 2.804 | n/a | 0.000 | 0.000 | 0.768 | 859.118 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.076 | 2.804 | 0.003 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000016c | 853.298 | 2.831 | n/a | 0.000 | 0.000 | 0.562 | 849.784 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.081 | 2.831 | 0.003 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000018a | 815.196 | 2.292 | n/a | 0.000 | 0.000 | 0.972 | 811.807 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.082 | 2.292 | 0.003 | 0.082 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000017d | 796.089 | 2.520 | n/a | 0.000 | 0.000 | 0.795 | 792.640 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.101 | 2.520 | 0.003 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000177 | 795.665 | 2.653 | n/a | 0.000 | 0.000 | 3.871 | 789.011 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.093 | 2.653 | 0.003 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000159 | 789.761 | 3.347 | n/a | 0.000 | 0.000 | 0.537 | 785.725 | 0.013 | n/a | 0.071 | 0.000 | n/a | n/a | 0.069 | 3.347 | 0.004 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000152 | 630.556 | 4.663 | n/a | 0.000 | 0.000 | 0.482 | 625.140 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.193 | 4.663 | 0.007 | 0.193 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000171 | 629.675 | 2.673 | n/a | 0.000 | 0.000 | 1.171 | 625.717 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.073 | 2.673 | 0.004 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000166 | 523.419 | 6.250 | n/a | 0.000 | 0.000 | 0.653 | 516.260 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.212 | 6.250 | 0.012 | 0.212 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000154 | 518.110 | 2.571 | n/a | 0.000 | 0.000 | 3.840 | 511.502 | 0.027 | n/a | 0.054 | 0.000 | n/a | n/a | 0.116 | 2.571 | 0.005 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000014d | 511.548 | 6.593 | n/a | 0.000 | 0.000 | 0.860 | 503.806 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.207 | 6.593 | 0.013 | 0.207 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000161 | 508.980 | 2.705 | n/a | 0.000 | 0.000 | 0.825 | 505.317 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.085 | 2.705 | 0.005 | 0.085 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / internal (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 346.717 | n/a | n/a | n/a | 2.853 | n/a | 0.000 | 0.000 | 0.635 | 341.256 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.098 | 2.998 | 0.014 | 0.098 |
| p99 | 1004.437 | n/a | n/a | n/a | 10.408 | n/a | 1.275 | 0.000 | 3.754 | 1002.230 | 0.181 | n/a | 0.083 | 0.000 | n/a | n/a | 21.123 | 11.683 | 0.420 | 21.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae8900000000000001a6 | 1004.437 | 0.178 | n/a | 0.000 | 0.000 | 0.802 | 1002.230 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 1.157 | 0.178 | 0.000 | 1.157 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001c6 | 1004.034 | 0.114 | n/a | 0.000 | 0.000 | 1.587 | 1001.144 | 0.020 | n/a | 0.066 | 0.000 | n/a | n/a | 1.104 | 0.114 | 0.000 | 1.104 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001a9 | 1000.121 | 3.129 | n/a | 0.000 | 0.000 | 0.658 | 996.205 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.062 | 3.129 | 0.003 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001c5 | 994.707 | 2.490 | n/a | 0.000 | 0.000 | 1.919 | 990.153 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.066 | 2.490 | 0.003 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001a8 | 993.444 | 2.517 | n/a | 0.749 | 0.000 | 0.569 | 989.432 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.115 | 3.266 | 0.003 | 0.115 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001c4 | 993.164 | 3.127 | n/a | 0.000 | 0.000 | 0.635 | 989.289 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.067 | 3.127 | 0.003 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000018c | 986.689 | 5.955 | n/a | 0.841 | 0.000 | 0.724 | 979.011 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.120 | 6.796 | 0.007 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001b7 | 888.447 | 2.753 | n/a | 0.000 | 0.000 | 1.163 | 884.419 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.073 | 2.753 | 0.003 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000019b | 795.148 | 2.100 | n/a | 0.000 | 0.000 | 0.607 | 792.330 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.078 | 2.100 | 0.003 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001d0 | 723.338 | 3.515 | n/a | 0.000 | 0.000 | 0.361 | 719.337 | 0.013 | n/a | 0.043 | 0.000 | n/a | n/a | 0.068 | 3.515 | 0.005 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000199 | 719.334 | 4.779 | n/a | 0.000 | 0.000 | 2.763 | 711.654 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.090 | 4.779 | 0.007 | 0.090 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000019e | 652.422 | 9.160 | n/a | 0.000 | 0.000 | 2.486 | 640.515 | 0.018 | n/a | 0.064 | 0.000 | n/a | n/a | 0.179 | 9.160 | 0.014 | 0.179 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001bb | 603.074 | 3.704 | n/a | 0.000 | 0.000 | 2.801 | 596.406 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.109 | 3.704 | 0.006 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001af | 524.855 | 2.428 | n/a | 0.000 | 0.000 | 0.464 | 521.859 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.064 | 2.428 | 0.005 | 0.064 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001d5 | 523.682 | 2.391 | n/a | 0.000 | 0.000 | 0.455 | 520.714 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.062 | 2.391 | 0.005 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001d7 | 523.017 | 1.704 | n/a | 0.000 | 0.000 | 0.607 | 520.553 | 0.032 | n/a | 0.035 | 0.000 | n/a | n/a | 0.085 | 1.704 | 0.003 | 0.085 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000195 | 471.085 | 2.658 | n/a | 0.000 | 0.000 | 0.959 | 467.294 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.080 | 2.658 | 0.006 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001d4 | 469.357 | 2.374 | n/a | 0.000 | 0.000 | 0.599 | 466.246 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.114 | 2.374 | 0.005 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001a2 | 438.439 | 2.506 | n/a | 0.000 | 0.000 | 1.546 | 434.271 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.082 | 2.506 | 0.006 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001a1 | 412.403 | 5.255 | n/a | 0.859 | 0.000 | 0.687 | 405.426 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.117 | 6.114 | 0.015 | 0.117 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 455.323 | n/a | n/a | n/a | 3.675 | n/a | 0.000 | 0.000 | 0.542 | 450.604 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.129 | 3.675 | 0.008 | 0.129 |
| p99 | 1003.803 | n/a | n/a | n/a | 8.093 | n/a | 0.000 | 0.000 | 3.074 | 1001.662 | 0.034 | n/a | 0.200 | 0.000 | n/a | n/a | 31.452 | 8.093 | 0.249 | 31.452 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae890000000000000218 | 1003.803 | 0.179 | n/a | 0.000 | 0.000 | 0.715 | 1001.662 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 1.143 | 0.179 | 0.000 | 1.143 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000200 | 1001.829 | 3.644 | n/a | 0.000 | 0.000 | 0.536 | 997.506 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.095 | 3.644 | 0.004 | 0.095 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001fa | 995.874 | 3.540 | n/a | 0.000 | 0.000 | 2.122 | 990.079 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.083 | 3.540 | 0.004 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000213 | 994.163 | 4.167 | n/a | 0.000 | 0.000 | 0.354 | 989.381 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.219 | 4.167 | 0.004 | 0.219 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001ea | 992.796 | 2.229 | n/a | 0.000 | 0.000 | 0.486 | 989.926 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.095 | 2.229 | 0.002 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000021a | 987.561 | 3.111 | n/a | 0.000 | 0.000 | 0.641 | 983.611 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.141 | 3.111 | 0.003 | 0.141 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000217 | 977.166 | 4.697 | n/a | 0.000 | 0.000 | 0.609 | 971.621 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.177 | 4.697 | 0.005 | 0.177 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001ec | 914.156 | 4.610 | n/a | 0.000 | 0.000 | 0.608 | 908.742 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.129 | 4.610 | 0.005 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000209 | 909.327 | 2.541 | n/a | 0.000 | 0.000 | 0.515 | 906.131 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.089 | 2.541 | 0.003 | 0.089 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001f7 | 865.395 | 8.093 | n/a | 0.000 | 0.000 | 0.791 | 856.316 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.158 | 8.093 | 0.009 | 0.158 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000214 | 798.764 | 8.030 | n/a | 0.000 | 0.000 | 0.630 | 789.887 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.153 | 8.030 | 0.010 | 0.153 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000211 | 730.891 | 3.428 | n/a | 0.000 | 0.000 | 0.604 | 726.735 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.102 | 3.428 | 0.005 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001f0 | 725.541 | 5.272 | n/a | 0.000 | 0.000 | 1.163 | 718.851 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.163 | 5.272 | 0.007 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001dd | 615.520 | 4.251 | n/a | 0.000 | 0.000 | 0.594 | 610.560 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.074 | 4.251 | 0.007 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000201 | 567.304 | 3.498 | n/a | 0.000 | 0.000 | 0.748 | 562.847 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.155 | 3.498 | 0.006 | 0.155 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001f4 | 531.946 | 6.204 | n/a | 0.000 | 0.000 | 0.756 | 524.611 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.323 | 6.204 | 0.012 | 0.323 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001e5 | 513.069 | 3.675 | n/a | 0.000 | 0.000 | 0.560 | 508.565 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.208 | 3.675 | 0.007 | 0.208 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001df | 496.902 | 2.763 | n/a | 0.000 | 0.000 | 0.438 | 493.569 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.076 | 2.763 | 0.006 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000204 | 480.555 | 3.451 | n/a | 0.000 | 0.000 | 0.542 | 476.400 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.109 | 3.451 | 0.007 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000001f2 | 473.029 | 1.970 | n/a | 0.000 | 0.000 | 1.504 | 469.395 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.081 | 1.970 | 0.004 | 0.081 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (753 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.117 | n/a | n/a | n/a | 3.394 | n/a | 0.000 | 0.000 | 0.254 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.030 | 3.394 | 0.289 | 7.030 |
| p99 | 288.714 | n/a | n/a | n/a | 17.760 | n/a | 1.077 | 0.000 | 1.312 | 282.861 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 46.594 | 18.316 | 0.815 | 46.594 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae890000000000000226 | 1004.230 | 4.085 | n/a | 0.000 | 0.000 | 0.605 | 999.287 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.206 | 4.085 | 0.004 | 0.206 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000021b | 629.755 | 2.521 | n/a | 0.000 | 0.000 | 0.591 | 626.461 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.129 | 2.521 | 0.004 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000227 | 603.365 | 4.285 | n/a | 0.000 | 0.000 | 0.561 | 598.390 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.089 | 4.285 | 0.007 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000223 | 510.257 | 2.317 | n/a | 0.000 | 0.000 | 0.542 | 507.194 | 0.036 | n/a | 0.056 | 0.000 | n/a | n/a | 0.113 | 2.317 | 0.005 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000224 | 488.732 | 4.200 | n/a | 0.000 | 0.000 | 0.780 | 483.534 | 0.010 | n/a | 0.130 | 0.000 | n/a | n/a | 0.078 | 4.200 | 0.009 | 0.078 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000021e | 478.934 | 2.140 | n/a | 0.000 | 0.000 | 0.507 | 476.133 | 0.018 | n/a | 0.064 | 0.000 | n/a | n/a | 0.071 | 2.140 | 0.004 | 0.071 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000021c | 358.662 | 2.961 | n/a | 0.000 | 0.000 | 0.813 | 354.601 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.214 | 2.961 | 0.008 | 0.214 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000221 | 288.714 | 5.101 | n/a | 0.000 | 0.000 | 0.481 | 282.861 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.200 | 5.101 | 0.018 | 0.200 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000021f | 246.773 | 2.956 | n/a | 0.000 | 0.000 | 0.609 | 243.076 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.073 | 2.956 | 0.012 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000004df | 112.334 | 6.331 | n/a | 0.702 | 0.000 | 1.687 | 103.422 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.155 | 7.033 | 0.063 | 0.155 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae89000000000000030a | 92.526 | 3.509 | n/a | 0.000 | 0.000 | 5.028 | 83.819 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.086 | 3.509 | 0.038 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000002ef | 91.944 | 7.301 | n/a | 0.000 | 0.000 | 0.714 | 83.786 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.085 | 7.301 | 0.079 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000741 | 90.671 | 2.602 | n/a | 0.000 | 0.000 | 0.317 | 87.667 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.074 | 2.602 | 0.029 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000621 | 87.516 | 8.198 | n/a | 0.000 | 0.000 | 0.710 | 78.417 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.142 | 8.198 | 0.094 | 0.142 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000787 | 85.035 | 2.363 | n/a | 0.000 | 0.000 | 0.586 | 81.974 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.067 | 2.363 | 0.028 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000004e8 | 82.274 | 2.300 | n/a | 0.000 | 0.000 | 1.364 | 78.490 | 0.007 | n/a | 0.016 | 0.000 | n/a | n/a | 0.097 | 2.300 | 0.028 | 0.097 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae8900000000000005dc | 80.125 | 4.799 | n/a | 0.000 | 0.000 | 0.587 | 74.650 | 0.002 | n/a | 0.030 | 0.000 | n/a | n/a | 0.057 | 4.799 | 0.060 | 0.057 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000651 | 78.300 | 4.788 | n/a | 0.734 | 0.000 | 0.303 | 72.358 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.081 | 5.522 | 0.071 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000489 | 76.750 | 3.998 | n/a | 0.000 | 0.000 | 0.639 | 72.002 | 0.009 | n/a | 0.022 | 0.000 | n/a | n/a | 0.080 | 3.998 | 0.052 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000000576 | 75.812 | 3.761 | n/a | 0.000 | 0.000 | 1.312 | 70.627 | 0.002 | n/a | 0.024 | 0.000 | n/a | n/a | 0.086 | 3.761 | 0.050 | 0.086 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / internal (2197 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.380 | n/a | n/a | n/a | 4.211 | n/a | 0.000 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.561 | 4.239 | 0.354 | 6.561 |
| p99 | 351.377 | n/a | n/a | n/a | 24.528 | n/a | 2.242 | 0.000 | 1.378 | 348.918 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 47.272 | 26.391 | 0.849 | 47.272 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d0b962ca0d0ae890000000000001a32 | 1003.536 | 4.033 | n/a | 0.000 | 0.000 | 0.648 | 998.762 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.056 | 4.033 | 0.004 | 0.056 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a7f | 1003.011 | 0.187 | n/a | 0.000 | 0.000 | 0.558 | 1001.021 | 0.016 | n/a | 0.072 | 0.000 | n/a | n/a | 1.158 | 0.187 | 0.000 | 1.158 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a33 | 1002.476 | 0.098 | n/a | 0.000 | 0.000 | 0.387 | 1000.831 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 1.103 | 0.098 | 0.000 | 1.103 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a77 | 992.879 | 2.787 | n/a | 0.000 | 0.000 | 0.357 | 989.624 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 0.071 | 2.787 | 0.003 | 0.071 | gw-r/thread-67/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a3d | 988.263 | 4.322 | n/a | 0.000 | 0.000 | 0.938 | 982.752 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.207 | 4.322 | 0.004 | 0.207 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a59 | 985.338 | 4.627 | n/a | 0.000 | 0.000 | 0.556 | 979.970 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.149 | 4.627 | 0.005 | 0.149 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a56 | 983.178 | 19.749 | n/a | 1.476 | 0.000 | 0.321 | 961.219 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.362 | 21.224 | 0.022 | 0.362 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a7b | 972.548 | 4.618 | n/a | 0.000 | 0.000 | 0.388 | 967.295 | 0.010 | n/a | 0.039 | 0.000 | n/a | n/a | 0.198 | 4.618 | 0.005 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a70 | 758.660 | 3.013 | n/a | 0.000 | 0.000 | 0.570 | 754.949 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.080 | 3.013 | 0.004 | 0.080 | gw-r/thread-65/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a47 | 733.222 | 9.571 | n/a | 0.000 | 0.000 | 0.575 | 722.710 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.336 | 9.571 | 0.013 | 0.336 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a4d | 732.250 | 6.803 | n/a | 0.000 | 0.000 | 0.536 | 724.646 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.208 | 6.803 | 0.009 | 0.208 | gw-r/thread-47/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a38 | 713.351 | 3.305 | n/a | 0.000 | 0.000 | 1.782 | 708.115 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.121 | 3.305 | 0.005 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a52 | 702.338 | 2.558 | n/a | 0.000 | 0.000 | 0.396 | 699.226 | 0.016 | n/a | 0.042 | 0.000 | n/a | n/a | 0.102 | 2.558 | 0.004 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a66 | 679.485 | 2.963 | n/a | 0.000 | 0.000 | 0.472 | 675.935 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.071 | 2.963 | 0.004 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a35 | 622.646 | 7.645 | n/a | 0.000 | 0.000 | 0.451 | 614.290 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.230 | 7.645 | 0.012 | 0.230 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a78 | 539.401 | 2.241 | n/a | 0.000 | 0.000 | 0.681 | 536.346 | 0.010 | n/a | 0.036 | 0.000 | n/a | n/a | 0.086 | 2.241 | 0.004 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a79 | 482.479 | 3.411 | n/a | 0.000 | 0.000 | 0.573 | 478.374 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.071 | 3.411 | 0.007 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a73 | 456.721 | 2.248 | n/a | 0.000 | 0.000 | 0.572 | 453.812 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.061 | 2.248 | 0.005 | 0.061 | gw-r/thread-46/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a6b | 423.827 | 2.695 | n/a | 0.000 | 0.000 | 0.375 | 420.644 | 0.010 | n/a | 0.031 | 0.000 | n/a | n/a | 0.072 | 2.695 | 0.006 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 6d0b962ca0d0ae890000000000001a36 | 367.839 | 2.230 | n/a | 0.000 | 0.000 | 0.376 | 365.137 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.051 | 2.230 | 0.006 | 0.051 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.818 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 201.235 | 0.018 | n/a | 0.142 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 209.713 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.922 | 208.935 | 14.897 | n/a | 3.057 | 0.000 | n/a | n/a | 50.016 | 0.000 | 0.000 | 50.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5abd04f50064a10000000000000050 | 209.713 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 208.935 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a1000000000000004b | 208.226 | 0.000 | n/a | 0.000 | 0.000 | 5.922 | 201.978 | 0.014 | n/a | 0.153 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-42/journal/page | none observed |
| 3e5abd04f50064a10000000000000030 | 207.439 | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 205.850 | 0.019 | n/a | 0.239 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a1000000000000003b | 206.953 | 0.000 | n/a | 0.000 | 0.000 | 5.276 | 201.235 | 0.014 | n/a | 0.223 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a1000000000000001c | 206.625 | 0.000 | n/a | 0.000 | 0.000 | 2.310 | 203.380 | 0.203 | n/a | 0.427 | 0.000 | n/a | n/a | 0.305 | 0.000 | 0.000 | 0.305 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000016 | 206.620 | 0.000 | n/a | 0.000 | 0.000 | 3.539 | 202.817 | 0.013 | n/a | 0.139 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000057 | 206.129 | 0.000 | n/a | 0.000 | 0.000 | 4.525 | 201.298 | 0.011 | n/a | 0.155 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000027 | 205.991 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 205.023 | 0.020 | n/a | 0.180 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a1000000000000000e | 205.508 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.429 | 0.020 | n/a | 3.057 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000037 | 205.020 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 204.059 | 0.014 | n/a | 0.111 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000048 | 205.019 | 0.000 | n/a | 0.000 | 0.000 | 3.450 | 201.266 | 0.024 | n/a | 0.136 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a1000000000000002f | 204.834 | 0.000 | n/a | 0.000 | 0.000 | 3.420 | 201.106 | 0.019 | n/a | 0.159 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000031 | 204.671 | 0.000 | n/a | 0.000 | 0.000 | 1.996 | 201.539 | 0.019 | n/a | 0.873 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000008 | 204.636 | 0.000 | n/a | 0.000 | 0.000 | 1.475 | 202.456 | 0.047 | n/a | 0.411 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000020 | 204.497 | 0.000 | n/a | 0.000 | 0.000 | 1.113 | 201.000 | 0.019 | n/a | 2.227 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000018 | 204.165 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 202.689 | 0.012 | n/a | 0.221 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a1000000000000000b | 204.159 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 203.189 | 0.030 | n/a | 0.173 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000022 | 203.696 | 0.000 | n/a | 0.000 | 0.000 | 1.606 | 201.690 | 0.021 | n/a | 0.190 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000019 | 203.671 | 0.000 | n/a | 0.000 | 0.000 | 1.073 | 202.203 | 0.017 | n/a | 0.245 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a1000000000000003d | 203.665 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 202.390 | 0.034 | n/a | 0.083 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.350 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.970 | 201.052 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 |
| p99 | 206.616 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.811 | 204.710 | 6.329 | n/a | 0.587 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5abd04f50064a1000000000000007c | 206.616 | 0.000 | n/a | 0.000 | 0.000 | 1.517 | 204.710 | 0.025 | n/a | 0.138 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000078 | 206.172 | 0.000 | n/a | 0.000 | 0.000 | 4.758 | 201.105 | 0.014 | n/a | 0.162 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000076 | 206.111 | 0.000 | n/a | 0.000 | 0.000 | 1.527 | 204.249 | 0.010 | n/a | 0.163 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a100000000000000a9 | 205.698 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 201.425 | 3.285 | n/a | 0.203 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a1000000000000007a | 205.446 | 0.000 | n/a | 0.000 | 0.000 | 0.852 | 203.461 | 0.868 | n/a | 0.094 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a100000000000000b4 | 205.438 | 0.000 | n/a | 0.000 | 0.000 | 4.453 | 200.742 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a100000000000000bd | 205.349 | 0.000 | n/a | 0.000 | 0.000 | 1.343 | 203.198 | 0.019 | n/a | 0.587 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a100000000000000ab | 205.095 | 0.000 | n/a | 0.000 | 0.000 | 2.475 | 202.379 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a100000000000000a1 | 204.839 | 0.000 | n/a | 0.000 | 0.000 | 3.744 | 200.895 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a100000000000000be | 204.318 | 0.000 | n/a | 0.000 | 0.000 | 1.041 | 202.989 | 0.011 | n/a | 0.133 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a100000000000000b2 | 204.110 | 0.000 | n/a | 0.000 | 0.000 | 2.418 | 201.364 | 0.011 | n/a | 0.126 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a1000000000000006a | 204.043 | 0.000 | n/a | 0.000 | 0.000 | 2.530 | 201.217 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a1000000000000008d | 203.862 | 0.000 | n/a | 0.000 | 0.000 | 1.386 | 202.079 | 0.010 | n/a | 0.162 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-42/journal/page | none observed |
| 3e5abd04f50064a1000000000000007b | 203.683 | 0.000 | n/a | 0.000 | 0.000 | 1.020 | 202.247 | 0.023 | n/a | 0.159 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000074 | 203.525 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 202.593 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a1000000000000005f | 203.506 | 0.000 | n/a | 0.000 | 0.000 | 2.120 | 201.108 | 0.011 | n/a | 0.123 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a1000000000000009d | 203.496 | 0.000 | n/a | 0.000 | 0.000 | 2.202 | 201.043 | 0.017 | n/a | 0.120 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000080 | 203.344 | 0.000 | n/a | 0.000 | 0.000 | 1.912 | 201.191 | 0.010 | n/a | 0.116 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a100000000000000b7 | 203.340 | 0.000 | n/a | 0.000 | 0.000 | 1.977 | 201.098 | 0.017 | n/a | 0.141 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000061 | 203.206 | 0.000 | n/a | 0.000 | 0.000 | 1.059 | 201.831 | 0.029 | n/a | 0.140 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.133 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.009 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 252.245 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.559 | 237.513 | 4.078 | n/a | 10.209 | 0.000 | n/a | n/a | 0.451 | 0.000 | 0.000 | 0.451 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5abd04f50064a100000000000000e2 | 252.245 | 0.000 | n/a | 0.000 | 0.000 | 2.903 | 237.513 | 1.213 | n/a | 10.209 | 0.000 | n/a | n/a | 0.407 | 0.000 | 0.000 | 0.407 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000120 | 230.159 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 229.033 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a100000000000000c3 | 208.645 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 207.643 | 0.015 | n/a | 0.112 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000101 | 205.827 | 0.000 | n/a | 0.000 | 0.000 | 4.578 | 200.960 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a100000000000000fa | 205.502 | 0.000 | n/a | 0.000 | 0.000 | 2.021 | 203.132 | 0.019 | n/a | 0.141 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000127 | 205.471 | 0.000 | n/a | 0.000 | 0.000 | 4.255 | 200.937 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a100000000000000d3 | 205.314 | 0.000 | n/a | 0.000 | 0.000 | 3.591 | 201.487 | 0.013 | n/a | 0.098 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000114 | 204.669 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 203.318 | 0.014 | n/a | 0.170 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a100000000000000cb | 204.296 | 0.000 | n/a | 0.000 | 0.000 | 0.473 | 203.595 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a100000000000000e6 | 204.210 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 203.091 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a100000000000000cd | 203.907 | 0.000 | n/a | 0.000 | 0.000 | 2.552 | 201.123 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a100000000000000df | 203.879 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 202.250 | 0.028 | n/a | 0.190 | 0.000 | n/a | n/a | 0.342 | 0.000 | 0.000 | 0.342 | gw-r/thread-42/journal/page | none observed |
| 3e5abd04f50064a1000000000000010a | 203.844 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 202.643 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a100000000000000f3 | 203.795 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 202.739 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-42/journal/page | none observed |
| 3e5abd04f50064a100000000000000ef | 203.710 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 202.527 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a100000000000000f2 | 203.616 | 0.000 | n/a | 0.000 | 0.000 | 2.239 | 201.141 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a100000000000000eb | 203.218 | 0.000 | n/a | 0.000 | 0.000 | 1.568 | 201.228 | 0.054 | n/a | 0.089 | 0.000 | n/a | n/a | 0.279 | 0.000 | 0.000 | 0.279 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a100000000000000f0 | 203.172 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 201.933 | 0.017 | n/a | 0.172 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000113 | 203.048 | 0.000 | n/a | 0.000 | 0.000 | 1.730 | 200.967 | 0.013 | n/a | 0.123 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000110 | 202.911 | 0.000 | n/a | 0.000 | 0.000 | 1.318 | 201.248 | 0.007 | n/a | 0.099 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.816 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 200.835 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 |
| p99 | 209.538 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.655 | 205.982 | 3.997 | n/a | 3.019 | 0.000 | n/a | n/a | 50.410 | 0.000 | 0.000 | 50.410 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5abd04f50064a1000000000000016f | 209.538 | 0.000 | n/a | 0.000 | 0.000 | 2.843 | 205.982 | 0.014 | n/a | 0.540 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a1000000000000013c | 206.560 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 204.847 | 0.046 | n/a | 0.427 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a1000000000000016c | 206.108 | 0.000 | n/a | 0.000 | 0.000 | 4.655 | 201.182 | 0.010 | n/a | 0.107 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000150 | 205.863 | 0.000 | n/a | 0.000 | 0.000 | 1.200 | 204.427 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000151 | 205.036 | 0.000 | n/a | 0.000 | 0.000 | 3.665 | 201.094 | 0.042 | n/a | 0.071 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000181 | 204.809 | 0.000 | n/a | 0.000 | 0.000 | 3.907 | 200.732 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a1000000000000014a | 204.277 | 0.000 | n/a | 0.000 | 0.000 | 1.278 | 202.838 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000156 | 203.873 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 203.082 | 0.021 | n/a | 0.092 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a1000000000000013f | 203.592 | 0.000 | n/a | 0.000 | 0.000 | 2.026 | 201.277 | 0.012 | n/a | 0.119 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000131 | 203.360 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 202.582 | 0.013 | n/a | 0.071 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000139 | 202.948 | 0.000 | n/a | 0.000 | 0.000 | 1.404 | 201.267 | 0.014 | n/a | 0.125 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000188 | 202.863 | 0.000 | n/a | 0.000 | 0.000 | 1.242 | 201.402 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000177 | 202.835 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 201.628 | 0.010 | n/a | 0.161 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a1000000000000012f | 202.739 | 0.000 | n/a | 0.000 | 0.000 | 0.941 | 201.504 | 0.015 | n/a | 0.104 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000155 | 202.642 | 0.000 | n/a | 0.000 | 0.000 | 1.061 | 201.248 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000169 | 202.615 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 201.337 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a1000000000000013d | 202.557 | 0.000 | n/a | 0.000 | 0.000 | 0.545 | 201.695 | 0.015 | n/a | 0.122 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a1000000000000016b | 202.479 | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 201.029 | 0.006 | n/a | 0.074 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000187 | 202.470 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 201.210 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a1000000000000016a | 202.382 | 0.000 | n/a | 0.000 | 0.000 | 1.098 | 200.940 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.458 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 200.683 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 206.073 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.510 | 203.982 | 4.342 | n/a | 0.122 | 0.000 | n/a | n/a | 0.273 | 0.000 | 0.000 | 0.273 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5abd04f50064a1000000000000019f | 208.822 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 206.886 | 0.006 | n/a | 0.945 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000192 | 206.073 | 0.000 | n/a | 0.000 | 0.000 | 5.038 | 200.854 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a100000000000001a3 | 205.219 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 203.982 | 0.014 | n/a | 0.085 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a100000000000001af | 203.635 | 0.020 | n/a | 0.484 | 0.000 | 2.239 | 200.718 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.120 | 0.504 | 0.002 | 0.120 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a100000000000001a1 | 203.479 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 202.359 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a100000000000001ee | 202.897 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.622 | 0.019 | n/a | 0.064 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a1000000000000019a | 202.715 | 0.000 | n/a | 0.000 | 0.000 | 1.394 | 200.988 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a100000000000001bf | 202.639 | 0.000 | n/a | 0.000 | 0.000 | 0.977 | 201.465 | 0.005 | n/a | 0.073 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a100000000000001d6 | 202.567 | 0.000 | n/a | 0.000 | 0.000 | 1.090 | 201.277 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000191 | 202.318 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 201.244 | 0.014 | n/a | 0.084 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a100000000000001a0 | 202.316 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 201.109 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000193 | 202.297 | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 201.238 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a100000000000001fa | 202.199 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.122 | 0.009 | n/a | 0.085 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a100000000000001ea | 202.176 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 201.108 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a100000000000001e5 | 202.176 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 201.307 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a100000000000001c9 | 202.149 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 201.325 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a100000000000001f9 | 202.096 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.026 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a100000000000001d2 | 202.095 | 0.000 | n/a | 0.000 | 0.000 | 0.976 | 200.857 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a100000000000001c7 | 202.095 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 201.156 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a100000000000001a4 | 202.079 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 200.914 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.815 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 200.863 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 206.074 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.833 | 202.418 | 2.675 | n/a | 0.299 | 0.000 | n/a | n/a | 1.131 | 0.000 | 0.000 | 1.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5abd04f50064a10000000000000242 | 207.260 | 0.000 | n/a | 0.000 | 0.000 | 5.599 | 201.355 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000227 | 206.074 | 0.000 | n/a | 0.000 | 0.000 | 1.978 | 203.363 | 0.057 | n/a | 0.299 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a1000000000000022a | 203.646 | 0.000 | n/a | 0.000 | 0.000 | 2.487 | 200.963 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a1000000000000024c | 203.610 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 202.418 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000231 | 203.564 | 0.000 | n/a | 0.000 | 0.000 | 1.282 | 202.074 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000266 | 203.417 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 201.174 | 0.011 | n/a | 0.119 | 0.000 | n/a | n/a | 1.131 | 0.000 | 0.000 | 1.131 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a1000000000000022d | 203.388 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 201.568 | 0.019 | n/a | 0.604 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a1000000000000023f | 203.296 | 0.000 | n/a | 0.000 | 0.000 | 2.043 | 200.971 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a1000000000000025d | 202.970 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.743 | 0.017 | n/a | 0.122 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a1000000000000024d | 202.948 | 0.000 | n/a | 0.000 | 0.000 | 0.562 | 202.014 | 0.040 | n/a | 0.198 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000228 | 202.774 | 0.000 | n/a | 0.000 | 0.000 | 1.100 | 201.394 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000212 | 202.661 | 0.000 | n/a | 0.000 | 0.000 | 1.625 | 200.804 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a1000000000000025c | 202.592 | 0.000 | n/a | 0.000 | 0.000 | 0.564 | 201.742 | 0.030 | n/a | 0.108 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000254 | 202.519 | 0.000 | n/a | 0.000 | 0.000 | 0.795 | 201.525 | 0.015 | n/a | 0.081 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000247 | 202.470 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 201.295 | 0.007 | n/a | 0.099 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a1000000000000021a | 202.469 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 201.219 | 0.009 | n/a | 0.100 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000272 | 202.450 | 0.000 | n/a | 0.000 | 0.000 | 1.154 | 201.082 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000271 | 202.438 | 0.000 | n/a | 0.000 | 0.000 | 1.030 | 201.113 | 0.007 | n/a | 0.090 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000246 | 202.395 | 0.000 | n/a | 0.000 | 0.000 | 0.441 | 201.734 | 0.011 | n/a | 0.121 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a1000000000000022b | 202.377 | 0.000 | n/a | 0.000 | 0.000 | 1.116 | 200.973 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / read (67 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.344 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 69.762 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 206.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.892 | 205.106 | 5.152 | n/a | 0.132 | 0.000 | n/a | n/a | 50.838 | 0.000 | 0.000 | 50.838 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5abd04f50064a1000000000000028c | 206.008 | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 205.106 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000280 | 205.161 | 0.000 | n/a | 0.000 | 0.000 | 0.489 | 204.408 | 0.013 | n/a | 0.057 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a1000000000000028d | 202.777 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 201.735 | 0.034 | n/a | 0.115 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a1000000000000028e | 202.522 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.384 | 0.009 | n/a | 0.091 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000284 | 202.100 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 201.104 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000289 | 202.079 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 200.996 | 0.005 | n/a | 0.118 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000282 | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 0.952 | 200.797 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000291 | 202.062 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 201.095 | 0.028 | n/a | 0.080 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a1000000000000028a | 201.913 | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 200.979 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000287 | 201.816 | 0.000 | n/a | 0.000 | 0.000 | 0.737 | 200.796 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a1000000000000027d | 201.700 | 0.000 | n/a | 0.000 | 0.000 | 0.539 | 200.949 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a1000000000000027f | 201.650 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.734 | 0.005 | n/a | 0.072 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a1000000000000027a | 201.569 | 0.000 | n/a | 0.000 | 0.000 | 0.461 | 200.932 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000286 | 201.561 | 0.000 | n/a | 0.000 | 0.000 | 0.487 | 200.900 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000292 | 201.501 | 0.000 | n/a | 0.000 | 0.000 | 0.491 | 200.839 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a1000000000000028f | 201.483 | 0.000 | n/a | 0.000 | 0.000 | 0.545 | 200.775 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a1000000000000027b | 201.351 | 0.000 | n/a | 0.000 | 0.000 | 0.468 | 200.721 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a1000000000000027c | 184.975 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 183.070 | 0.917 | n/a | 0.038 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000293 | 157.892 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 157.017 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a1000000000000027e | 131.471 | 0.000 | n/a | 0.000 | 0.000 | 0.970 | 130.314 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / read (221 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.358 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.566 | 87.182 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 202.865 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.431 | 201.806 | 1.727 | n/a | 0.121 | 0.000 | n/a | n/a | 50.295 | 0.000 | 0.000 | 50.295 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3e5abd04f50064a10000000000000ecb | 205.463 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 204.237 | 0.017 | n/a | 0.090 | 0.000 | n/a | n/a | 0.311 | 0.000 | 0.000 | 0.311 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000ea5 | 204.529 | 0.000 | n/a | 0.000 | 0.000 | 1.914 | 202.025 | 0.034 | n/a | 0.337 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-47/journal/page | none observed |
| 3e5abd04f50064a10000000000000f01 | 202.865 | 0.000 | n/a | 0.000 | 0.000 | 1.469 | 201.065 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000ea7 | 202.835 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 201.806 | 0.027 | n/a | 0.084 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-46/journal/page | none observed |
| 3e5abd04f50064a10000000000000edc | 202.562 | 0.000 | n/a | 0.000 | 0.000 | 1.729 | 200.631 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000eb9 | 202.318 | 0.000 | n/a | 0.000 | 0.000 | 1.305 | 200.865 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000efe | 202.282 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 201.269 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-65/journal/page | none observed |
| 3e5abd04f50064a10000000000000f02 | 202.226 | 0.000 | n/a | 0.000 | 0.000 | 0.923 | 201.033 | 0.015 | n/a | 0.067 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000ece | 202.142 | 0.000 | n/a | 0.000 | 0.000 | 1.364 | 200.639 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-67/journal/page | none observed |
| 3e5abd04f50064a10000000000000ed5 | 202.121 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 200.979 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000ea9 | 202.098 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 200.868 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-67/journal/page | none observed |
| 3e5abd04f50064a10000000000000eb2 | 202.091 | 0.000 | n/a | 0.000 | 0.000 | 1.150 | 200.673 | 0.012 | n/a | 0.047 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000ee0 | 202.043 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.082 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| 3e5abd04f50064a10000000000000ec9 | 202.034 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 201.084 | 0.015 | n/a | 0.071 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-67/journal/page | none observed |
| 3e5abd04f50064a10000000000000eca | 202.014 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 201.015 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 3e5abd04f50064a10000000000000ef2 | 202.003 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 201.170 | 0.016 | n/a | 0.059 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000ea8 | 201.964 | 0.000 | n/a | 0.000 | 0.000 | 0.568 | 201.164 | 0.018 | n/a | 0.084 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000edf | 201.937 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 200.969 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-45/journal/page | none observed |
| 3e5abd04f50064a10000000000000e99 | 201.926 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 201.052 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-48/journal/page | none observed |
| 3e5abd04f50064a10000000000000ebd | 201.882 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 201.050 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

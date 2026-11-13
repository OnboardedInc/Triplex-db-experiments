# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (150.488 ms, trace `cceaf0dccd4dc00900000000000006c2`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (129.727 ms, trace `cceaf0dccd4dc00900000000000006c5`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (134.491 ms, trace `cceaf0dccd4dc00900000000000006c4`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (65.293 ms, trace `cceaf0dccd4dc00900000000000006d1`); `node-14/thread-0/driver.queue.subject` (89.723 ms, trace `cceaf0dccd4dc00900000000000006c9`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-log-zero-a-4-baseline`; source `ef7473361c138176ead9c0222b2ccc53e33dde11`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6682759.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 245 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14458.918 | 615.255 | 53.314 | 311 |
| L1 | 0 | 19961.105 | 465.651 | 23.241 | 462 |
| L4 | 0 | 19974.703 | 410.206 | 10.578 | 426 |
| L16 | 0 | 19975.375 | 395.899 | 6.946 | 474 |
| L64 | 0 | 19974.540 | 450.636 | 11.138 | 610 |
| L256 | 0 | 19972.118 | 388.454 | 16.962 | 472 |
| L1024 | 0 | 19987.424 | 3871.030 | 204.853 | 12043 |
| tail | 0 | 64501.344 | 11460.744 | 716.362 | 37346 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| cceaf0dccd4dc00900000000000006c2 | driver.queue.scheduler-late | 0.278 | none | 5 / 32 |
| cceaf0dccd4dc00900000000000006c2 | driver.queue.scheduler-dispatch | 0.105 | none | 5 / 32 |

Observed active steps while trace cceaf0dccd4dc00900000000000006c2 waited: []

| cceaf0dccd4dc00900000000000006c5 | driver.queue.scheduler-late | 3.932 | none | 6 / 32 |
| cceaf0dccd4dc00900000000000006c5 | driver.queue.scheduler-dispatch | 0.109 | none | 6 / 32 |

Observed active steps while trace cceaf0dccd4dc00900000000000006c5 waited: []

| cceaf0dccd4dc00900000000000006c4 | driver.queue.scheduler-late | 0.292 | none | 5 / 32 |
| cceaf0dccd4dc00900000000000006c4 | driver.queue.scheduler-dispatch | 0.058 | none | 5 / 32 |

Observed active steps while trace cceaf0dccd4dc00900000000000006c4 waited: []

| cceaf0dccd4dc00900000000000006d1 | driver.queue.subject | 63.161 | cceaf0dccd4dc00900000000000006c9 | 6 / 32 |
| cceaf0dccd4dc00900000000000006d1 | driver.queue.scheduler-late | 0.979 | none | 6 / 32 |
| cceaf0dccd4dc00900000000000006d1 | driver.queue.scheduler-dispatch | 0.066 | none | 4 / 32 |

Observed active steps while trace cceaf0dccd4dc00900000000000006d1 waited: [{"at":1794609676949.3035,"inFlight":5,"capacity":32,"active":[{"traceId":"cceaf0dccd4dc00900000000000006c5","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c6","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c7","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cb","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cf","step":"client.http"}]},{"at":1794609676968.8997,"inFlight":6,"capacity":32,"active":[{"traceId":"cceaf0dccd4dc00900000000000006c7","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cb","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cf","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006d3","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c9","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006d5","step":"client.http"}]}]

| cceaf0dccd4dc00900000000000006c9 | driver.queue.subject | 89.723 | cceaf0dccd4dc00900000000000006c5 | 7 / 32 |
| cceaf0dccd4dc00900000000000006c9 | driver.queue.scheduler-dispatch | 0.107 | none | 5 / 32 |
| cceaf0dccd4dc00900000000000006c9 | driver.queue.scheduler-late | 0.053 | none | 7 / 32 |

Observed active steps while trace cceaf0dccd4dc00900000000000006c9 waited: [{"at":1794609676886.818,"inFlight":7,"capacity":32,"active":[{"traceId":"cceaf0dccd4dc00900000000000006c1","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c2","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c4","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c5","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c6","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c7","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cb","step":"client.http"}]},{"at":1794609676907.974,"inFlight":6,"capacity":32,"active":[{"traceId":"cceaf0dccd4dc00900000000000006c2","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c4","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c5","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c6","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c7","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cb","step":"client.http"}]},{"at":1794609676927.9333,"inFlight":7,"capacity":32,"active":[{"traceId":"cceaf0dccd4dc00900000000000006c2","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c4","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c5","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c6","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c7","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cb","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cf","step":"client.http"}]},{"at":1794609676949.3035,"inFlight":5,"capacity":32,"active":[{"traceId":"cceaf0dccd4dc00900000000000006c5","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c6","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006c7","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cb","step":"client.http"},{"traceId":"cceaf0dccd4dc00900000000000006cf","step":"client.http"}]}]

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.844 | 0.653 | 0.000 | 1.358 | 5.160 | 0.213 | 0.000 | 0.207 | 1.581 | 10.086 | 0.067 | n/a | 0.586 | 16.158 | n/a | n/a | 0.058 | 6.282 | 0.207 | 0.058 |
| p99 | 76.281 | 3.815 | 0.782 | 6.904 | 16.731 | 0.834 | 3.051 | 1.024 | 8.215 | 24.145 | 0.419 | n/a | 3.957 | 35.014 | n/a | n/a | 0.347 | 17.664 | 0.352 | 0.347 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000000f0 | 76.281 | 16.731 | 0.834 | 0.000 | 0.099 | 3.006 | 24.145 | 0.419 | n/a | 0.468 | 30.515 | n/a | n/a | 0.063 | 17.664 | 0.232 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000000ee | 61.856 | 12.770 | 0.011 | 0.000 | 0.476 | 1.009 | 8.839 | 0.111 | n/a | 3.280 | 35.014 | n/a | n/a | 0.347 | 13.256 | 0.214 | 0.347 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000000f4 | 58.097 | 6.998 | 0.663 | 0.000 | 0.081 | 5.414 | 17.610 | 0.085 | n/a | 3.957 | 23.167 | n/a | n/a | 0.122 | 7.742 | 0.133 | 0.122 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000011a | 52.052 | 4.006 | 0.213 | 0.276 | 0.076 | 1.494 | 12.662 | 0.076 | n/a | 0.264 | 32.936 | n/a | n/a | 0.048 | 4.572 | 0.088 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000112 | 50.466 | 9.635 | 0.441 | 0.559 | 0.075 | 5.737 | 17.740 | 0.093 | n/a | 2.723 | 13.396 | n/a | n/a | 0.066 | 10.711 | 0.212 | 0.066 | gw-w/thread-43/gateway.admitted-work | none observed |
| cceaf0dccd4dc0090000000000000116 | 47.218 | 7.062 | 0.222 | 0.277 | 0.065 | 2.320 | 10.086 | 0.062 | n/a | 0.689 | 26.391 | n/a | n/a | 0.044 | 7.626 | 0.162 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000114 | 45.696 | 7.349 | 0.005 | 1.305 | 0.212 | 0.768 | 6.123 | 0.040 | n/a | 0.627 | 29.228 | n/a | n/a | 0.038 | 8.871 | 0.194 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000000fe | 45.619 | 9.965 | 0.007 | 1.608 | 0.993 | 0.971 | 3.864 | 0.206 | n/a | 0.430 | 27.379 | n/a | n/a | 0.196 | 12.573 | 0.276 | 0.196 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000126 | 45.062 | 5.160 | 0.355 | 0.000 | 0.074 | 2.065 | 20.838 | 0.094 | n/a | 0.271 | 16.158 | n/a | n/a | 0.046 | 5.589 | 0.124 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000102 | 43.310 | 7.945 | 0.247 | 0.000 | 0.213 | 2.799 | 11.961 | 0.051 | n/a | 0.477 | 19.564 | n/a | n/a | 0.054 | 8.404 | 0.194 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000010c | 43.131 | 6.531 | 0.248 | 0.345 | 0.067 | 3.677 | 15.680 | 0.085 | n/a | 1.083 | 15.369 | n/a | n/a | 0.045 | 7.191 | 0.167 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000010a | 42.014 | 8.784 | 0.601 | 0.463 | 0.090 | 8.215 | 14.202 | 0.071 | n/a | 0.337 | 9.178 | n/a | n/a | 0.072 | 9.939 | 0.237 | 0.072 | gw-w/thread-46/gateway.admitted-work | none observed |
| cceaf0dccd4dc009000000000000011e | 41.162 | 4.938 | 0.462 | 0.408 | 0.097 | 1.681 | 16.189 | 0.138 | n/a | 2.453 | 14.711 | n/a | n/a | 0.083 | 5.906 | 0.143 | 0.083 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000108 | 41.157 | 5.586 | 0.305 | 0.000 | 0.078 | 1.581 | 15.530 | 0.059 | n/a | 0.591 | 17.391 | n/a | n/a | 0.037 | 5.969 | 0.145 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000000f8 | 40.844 | 4.337 | 0.241 | 2.671 | 0.068 | 1.860 | 16.053 | 0.061 | n/a | 1.359 | 14.131 | n/a | n/a | 0.063 | 7.317 | 0.179 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000100 | 40.321 | 4.681 | 0.261 | 0.000 | 0.168 | 1.827 | 11.731 | 0.054 | n/a | 0.293 | 21.237 | n/a | n/a | 0.070 | 5.109 | 0.127 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000104 | 39.777 | 10.595 | 0.012 | 3.051 | 0.330 | 1.555 | 6.733 | 0.051 | n/a | 0.240 | 17.169 | n/a | n/a | 0.042 | 13.987 | 0.352 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000000fb | 36.409 | 4.799 | 0.319 | 0.000 | 0.042 | 2.785 | 12.293 | 0.067 | n/a | 0.510 | 15.542 | n/a | n/a | 0.052 | 5.160 | 0.142 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.467ms |
| cceaf0dccd4dc00900000000000000f6 | 35.846 | 8.916 | 0.009 | 2.263 | 1.024 | 1.111 | 1.518 | 0.041 | n/a | 0.586 | 20.247 | n/a | n/a | 0.133 | 12.212 | 0.341 | 0.133 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000124 | 34.425 | 3.764 | 0.256 | 0.262 | 0.155 | 1.626 | 14.295 | 0.096 | n/a | 0.360 | 13.552 | n/a | n/a | 0.058 | 4.437 | 0.129 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.316 | 0.653 | 0.000 | 2.033 | 4.006 | 0.009 | 0.000 | 0.781 | 1.090 | 1.518 | 0.054 | n/a | 0.586 | 10.865 | n/a | n/a | 0.060 | 5.756 | 0.272 | 0.060 |
| p99 | 35.846 | 2.314 | 0.000 | 3.108 | 8.916 | 0.011 | 2.263 | 1.024 | 2.412 | 5.035 | 0.110 | n/a | 1.066 | 20.247 | n/a | n/a | 0.265 | 12.212 | 0.341 | 0.265 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000000f6 | 35.846 | 8.916 | 0.009 | 2.263 | 1.024 | 1.111 | 1.518 | 0.041 | n/a | 0.586 | 20.247 | n/a | n/a | 0.133 | 12.212 | 0.341 | 0.133 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000110 | 26.870 | 5.432 | 0.010 | 0.000 | 0.844 | 1.139 | 1.402 | 0.040 | n/a | 0.584 | 17.359 | n/a | n/a | 0.060 | 6.286 | 0.234 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000120 | 23.627 | 4.552 | 0.010 | 1.500 | 0.221 | 0.927 | 5.035 | 0.110 | n/a | 0.356 | 10.865 | n/a | n/a | 0.052 | 6.282 | 0.266 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000000f2 | 21.642 | 4.925 | 0.011 | 0.000 | 0.949 | 1.139 | 2.052 | 0.056 | n/a | 0.750 | 11.494 | n/a | n/a | 0.265 | 5.885 | 0.272 | 0.265 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000000fa | 21.316 | 3.978 | 0.005 | 1.298 | 0.475 | 1.090 | 3.203 | 0.074 | n/a | 1.066 | 10.056 | n/a | n/a | 0.071 | 5.756 | 0.270 | 0.071 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000011c | 21.104 | 3.907 | 0.005 | 0.000 | 0.460 | 0.810 | 4.588 | 0.054 | n/a | 0.254 | 10.977 | n/a | n/a | 0.048 | 4.373 | 0.207 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000010e | 14.968 | 3.857 | 0.004 | 0.000 | 0.781 | 2.412 | 1.273 | 0.037 | n/a | 0.882 | 5.685 | n/a | n/a | 0.036 | 4.643 | 0.310 | 0.036 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000118 | 14.896 | 4.006 | 0.010 | 0.000 | 0.971 | 1.007 | 1.377 | 0.062 | n/a | 0.844 | 6.542 | n/a | n/a | 0.077 | 4.987 | 0.335 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000122 | 11.369 | 2.935 | 0.005 | 0.000 | 0.207 | 0.798 | 1.253 | 0.040 | n/a | 0.476 | 5.602 | n/a | n/a | 0.054 | 3.147 | 0.277 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.201 | n/a | n/a | n/a | 36.126 | 11.961 | 1.761 | 0.000 | 0.388 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.484 | 64.067 | 0.905 | 4.484 |
| p99 | 289.699 | n/a | n/a | n/a | 123.128 | 177.277 | 28.398 | 0.000 | 107.252 | 59.228 | 0.002 | n/a | 0.050 | 0.000 | n/a | n/a | 163.785 | 206.836 | 1.000 | 163.785 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc009000000000000144a | 289.699 | 123.128 | 2.233 | 28.398 | 0.000 | 0.733 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 135.207 | 153.760 | 0.531 | 135.207 | node-14/thread-3/socket.wait-first-byte | driver.publication 8.197ms; driver.publication 6.250ms; driver.publication 4.562ms; driver.publication 3.838ms; driver.publication 2.367ms |
| cceaf0dccd4dc0090000000000001455 | 254.909 | 54.052 | 52.744 | 6.065 | 0.000 | 0.340 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 141.709 | 112.860 | 0.443 | 141.709 | node-14/thread-3/socket.wait-first-byte | driver.publication 8.197ms; driver.publication 6.250ms; driver.publication 4.562ms; driver.publication 3.838ms; driver.publication 2.367ms |
| cceaf0dccd4dc0090000000000001ad8 | 246.550 | 29.234 | 47.203 | 5.975 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 163.785 | 82.412 | 0.334 | 163.785 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.230ms; driver.publication 2.313ms; driver.publication 1.596ms; driver.publication 1.500ms; driver.publication 1.470ms |
| cceaf0dccd4dc0090000000000001ae0 | 231.021 | 41.971 | 112.045 | 1.605 | 0.000 | 0.510 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 74.889 | 155.621 | 0.674 | 74.889 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.230ms; driver.publication 1.500ms; driver.publication 1.470ms; driver.publication 1.441ms; driver.publication 1.385ms |
| cceaf0dccd4dc0090000000000001ae2 | 230.365 | 22.499 | 168.864 | 1.802 | 0.000 | 0.377 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.823 | 193.165 | 0.839 | 36.823 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.230ms; driver.publication 1.500ms; driver.publication 1.470ms; driver.publication 1.441ms; driver.publication 1.385ms |
| cceaf0dccd4dc0090000000000001a2b | 229.226 | 34.628 | 130.038 | 4.647 | 0.000 | 0.481 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.431 | 169.313 | 0.739 | 59.431 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 9.018ms; driver.publication 2.404ms; driver.publication 2.123ms; driver.expected-state.bind-receipt 1.918ms; driver.publication 1.762ms |
| cceaf0dccd4dc0090000000000001d3e | 216.853 | 107.912 | 4.698 | 17.201 | 0.000 | 0.847 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.194 | 129.812 | 0.599 | 86.194 | node-14/thread-3/socket.wait-first-byte | driver.publication 7.110ms; driver.publication 6.550ms; driver.publication 4.991ms; driver.publication 4.695ms; driver.publication 3.712ms |
| cceaf0dccd4dc0090000000000001ad9 | 216.245 | 15.962 | 107.892 | 0.000 | 0.000 | 0.388 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 92.004 | 123.854 | 0.573 | 92.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.230ms; driver.publication 2.313ms; driver.publication 1.500ms; driver.publication 1.470ms; driver.publication 1.441ms |
| cceaf0dccd4dc0090000000000001a31 | 209.243 | 28.027 | 177.277 | 1.531 | 0.000 | 0.388 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.019 | 206.836 | 0.988 | 2.019 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.123ms; driver.expected-state.bind-receipt 1.918ms; driver.publication 1.762ms; driver.publication 1.375ms; driver.publication 1.316ms |
| cceaf0dccd4dc009000000000000039b | 206.115 | 71.970 | 0.552 | 21.345 | 0.000 | 52.955 | 59.228 | 0.002 | n/a | 0.050 | 0.000 | n/a | n/a | 0.013 | 93.867 | 0.455 | 0.013 | gw-r/thread-48/gateway.admitted-work | driver.publication 6.921ms; driver.publication 6.506ms; driver.publication 3.474ms; driver.publication 2.133ms; driver.publication 1.823ms |
| cceaf0dccd4dc0090000000000001adb | 204.969 | 49.496 | 51.846 | 1.442 | 0.000 | 0.466 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 101.719 | 102.784 | 0.501 | 101.719 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.230ms; driver.publication 2.313ms; driver.publication 1.500ms; driver.publication 1.470ms; driver.publication 1.441ms |
| cceaf0dccd4dc0090000000000001a2f | 200.018 | 27.881 | 87.709 | 0.000 | 0.000 | 0.370 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 84.058 | 115.590 | 0.578 | 84.058 | node-14/thread-3/socket.wait-first-byte | driver.publication 9.018ms; driver.publication 2.123ms; driver.expected-state.bind-receipt 1.918ms; driver.publication 1.375ms; driver.publication 1.316ms |
| cceaf0dccd4dc0090000000000001a2a | 194.453 | 61.670 | 6.287 | 4.631 | 0.000 | 0.571 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 121.294 | 72.588 | 0.373 | 121.294 | node-14/thread-3/socket.wait-first-byte | driver.publication 9.018ms; driver.publication 2.404ms; driver.publication 2.123ms; driver.expected-state.bind-receipt 1.918ms; driver.publication 1.728ms |
| cceaf0dccd4dc0090000000000001a1f | 192.865 | 48.750 | 25.558 | 4.125 | 0.000 | 0.594 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 113.836 | 78.434 | 0.407 | 113.836 | node-14/thread-3/socket.wait-first-byte | driver.publication 9.018ms; driver.publication 3.061ms; driver.publication 2.574ms; driver.publication 2.404ms; driver.publication 2.135ms |
| cceaf0dccd4dc0090000000000001ad7 | 181.483 | 55.845 | 2.517 | 5.705 | 0.000 | 0.908 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 116.508 | 64.067 | 0.353 | 116.508 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.230ms; driver.publication 2.313ms; driver.publication 1.596ms; driver.publication 1.500ms; driver.publication 1.470ms |
| cceaf0dccd4dc0090000000000001acd | 170.111 | 54.894 | 5.190 | 3.712 | 0.000 | 0.337 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 105.978 | 63.796 | 0.375 | 105.978 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.812ms; driver.publication 2.313ms; driver.publication 1.596ms; driver.publication 1.441ms; driver.publication 1.425ms |
| cceaf0dccd4dc0090000000000001476 | 157.450 | 22.123 | 20.889 | 0.000 | 0.000 | 107.252 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.187 | 43.012 | 0.273 | 7.187 | node-14/thread-3/socket.queue-and-write | driver.publication 3.540ms; driver.publication 2.760ms; driver.publication 2.004ms; driver.publication 1.378ms; driver.publication 1.161ms |
| cceaf0dccd4dc0090000000000001449 | 152.504 | 25.205 | 4.138 | 2.257 | 0.000 | 0.659 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 120.243 | 31.601 | 0.207 | 120.243 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.066ms; driver.expected-state.bind-receipt 1.673ms; driver.publication 1.534ms; driver.expected-state.bind-receipt 1.517ms; driver.publication 1.339ms |
| cceaf0dccd4dc009000000000000146b | 148.413 | 54.347 | 80.089 | 4.531 | 0.000 | 0.494 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.951 | 138.968 | 0.936 | 8.951 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 8.197ms; driver.publication 6.250ms; driver.publication 2.760ms; driver.publication 2.004ms; driver.publication 1.161ms |
| cceaf0dccd4dc0090000000000001d3b | 136.825 | 80.319 | 19.477 | 9.291 | 0.000 | 0.575 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.164 | 109.086 | 0.797 | 27.164 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 6.550ms; driver.publication 4.991ms; driver.publication 4.695ms; driver.publication 4.671ms; driver.publication 1.993ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.464 | 0.819 | 0.000 | 1.255 | 4.622 | 0.011 | 0.000 | 0.137 | 1.652 | 7.198 | 0.060 | n/a | 0.618 | 13.838 | n/a | n/a | 0.057 | 5.719 | 0.174 | 0.057 |
| p99 | 95.427 | 4.431 | 0.007 | 6.088 | 14.297 | 1.566 | 2.060 | 76.422 | 5.588 | 24.028 | 0.269 | n/a | 4.747 | 77.044 | n/a | n/a | 1.335 | 80.269 | 0.858 | 1.335 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc0090000000000000172 | 95.427 | 8.258 | 0.005 | 2.060 | 0.450 | 3.861 | 2.530 | 0.042 | n/a | 1.100 | 77.044 | n/a | n/a | 0.077 | 10.773 | 0.113 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000173 | 93.549 | 3.841 | 0.006 | 0.000 | 76.422 | 0.951 | 2.579 | 0.100 | n/a | 0.490 | 9.080 | n/a | n/a | 0.080 | 80.269 | 0.858 | 0.080 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 4.347ms; driver.publication 1.241ms |
| cceaf0dccd4dc009000000000000014a | 73.737 | 14.297 | 0.008 | 0.000 | 1.058 | 3.426 | 24.028 | 0.269 | n/a | 1.762 | 28.775 | n/a | n/a | 0.115 | 15.363 | 0.208 | 0.115 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000138 | 61.799 | 7.448 | 0.010 | 0.000 | 0.263 | 0.816 | 10.875 | 0.052 | n/a | 0.311 | 41.969 | n/a | n/a | 0.055 | 7.721 | 0.125 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000131 | 56.544 | 4.031 | 0.261 | 0.000 | 0.069 | 5.588 | 7.198 | 0.060 | n/a | 1.706 | 37.565 | n/a | n/a | 0.065 | 4.362 | 0.077 | 0.065 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000012a | 44.920 | 6.982 | 0.285 | 0.364 | 0.079 | 2.486 | 14.142 | 0.117 | n/a | 0.433 | 19.963 | n/a | n/a | 0.069 | 7.709 | 0.172 | 0.069 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000013a | 43.574 | 3.694 | 0.193 | 0.000 | 0.071 | 2.107 | 12.937 | 0.074 | n/a | 0.957 | 23.487 | n/a | n/a | 0.053 | 3.959 | 0.091 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000146 | 42.336 | 4.582 | 0.827 | 0.312 | 0.081 | 2.196 | 15.752 | 0.092 | n/a | 0.338 | 18.104 | n/a | n/a | 0.052 | 5.802 | 0.137 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000013e | 41.204 | 6.004 | 0.198 | 0.000 | 0.071 | 2.654 | 14.133 | 0.070 | n/a | 0.793 | 17.236 | n/a | n/a | 0.044 | 6.273 | 0.152 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000134 | 40.949 | 4.134 | 0.258 | 0.296 | 0.077 | 2.714 | 13.625 | 0.051 | n/a | 0.687 | 19.060 | n/a | n/a | 0.047 | 4.766 | 0.116 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000015e | 40.501 | 4.119 | 0.201 | 0.907 | 0.061 | 4.988 | 16.561 | 0.111 | n/a | 2.823 | 10.688 | n/a | n/a | 0.042 | 5.288 | 0.131 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000128 | 39.316 | 4.622 | 0.465 | 0.000 | 0.081 | 2.366 | 11.851 | 0.061 | n/a | 0.619 | 19.188 | n/a | n/a | 0.064 | 5.168 | 0.131 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000013c | 38.645 | 3.970 | 0.212 | 0.000 | 0.079 | 3.075 | 11.340 | 0.120 | n/a | 1.876 | 17.924 | n/a | n/a | 0.048 | 4.261 | 0.110 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000016c | 37.073 | 3.813 | 0.226 | 0.300 | 0.106 | 4.053 | 12.269 | 0.054 | n/a | 2.252 | 13.945 | n/a | n/a | 0.055 | 4.445 | 0.120 | 0.055 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000168 | 36.823 | 5.384 | 0.326 | 0.330 | 0.083 | 1.948 | 9.041 | 0.056 | n/a | 0.616 | 18.982 | n/a | n/a | 0.058 | 6.122 | 0.166 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000014c | 36.533 | 4.900 | 0.286 | 0.402 | 0.039 | 1.667 | 14.740 | 0.172 | n/a | 1.171 | 13.100 | n/a | n/a | 0.055 | 5.627 | 0.154 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000142 | 36.184 | 4.065 | 0.275 | 0.404 | 0.065 | 4.260 | 8.704 | 0.061 | n/a | 0.279 | 18.014 | n/a | n/a | 0.057 | 4.808 | 0.133 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000014e | 34.015 | 9.607 | 0.007 | 0.000 | 1.080 | 2.189 | 6.691 | 0.129 | n/a | 0.604 | 13.602 | n/a | n/a | 0.107 | 10.694 | 0.314 | 0.107 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000148 | 32.824 | 5.520 | 0.007 | 0.000 | 0.192 | 1.095 | 2.353 | 0.044 | n/a | 1.085 | 22.460 | n/a | n/a | 0.068 | 5.719 | 0.174 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000166 | 32.210 | 5.266 | 0.289 | 0.386 | 0.126 | 1.317 | 11.311 | 0.054 | n/a | 0.496 | 12.907 | n/a | n/a | 0.057 | 6.068 | 0.188 | 0.057 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.748 | 1.036 | 0.000 | 1.684 | 3.841 | 0.005 | 0.000 | 0.771 | 1.220 | 2.100 | 0.059 | n/a | 0.490 | 9.080 | n/a | n/a | 0.057 | 4.786 | 0.291 | 0.057 |
| p99 | 93.549 | 2.970 | 0.000 | 6.049 | 9.607 | 0.010 | 0.000 | 76.422 | 3.014 | 6.691 | 0.129 | n/a | 3.070 | 15.016 | n/a | n/a | 1.335 | 80.269 | 0.858 | 1.335 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc0090000000000000173 | 93.549 | 3.841 | 0.006 | 0.000 | 76.422 | 0.951 | 2.579 | 0.100 | n/a | 0.490 | 9.080 | n/a | n/a | 0.080 | 80.269 | 0.858 | 0.080 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 4.347ms; driver.publication 1.241ms |
| cceaf0dccd4dc009000000000000014e | 34.015 | 9.607 | 0.007 | 0.000 | 1.080 | 2.189 | 6.691 | 0.129 | n/a | 0.604 | 13.602 | n/a | n/a | 0.107 | 10.694 | 0.314 | 0.107 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000133 | 27.966 | 8.970 | 0.010 | 0.000 | 0.771 | 3.014 | 5.529 | 0.107 | n/a | 0.852 | 8.626 | n/a | n/a | 0.087 | 9.751 | 0.349 | 0.087 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000144 | 23.877 | 3.636 | 0.005 | 0.000 | 0.137 | 2.015 | 3.187 | 0.055 | n/a | 3.070 | 11.745 | n/a | n/a | 0.029 | 3.778 | 0.158 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000012f | 23.748 | 3.787 | 0.005 | 0.000 | 0.514 | 0.970 | 1.846 | 0.044 | n/a | 0.231 | 15.016 | n/a | n/a | 1.335 | 4.306 | 0.181 | 1.335 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000158 | 18.942 | 3.885 | 0.005 | 0.000 | 0.896 | 1.517 | 1.550 | 0.059 | n/a | 0.295 | 10.678 | n/a | n/a | 0.057 | 4.786 | 0.253 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000016a | 17.725 | 4.133 | 0.006 | 0.000 | 1.013 | 1.220 | 2.100 | 0.095 | n/a | 1.417 | 7.699 | n/a | n/a | 0.043 | 5.151 | 0.291 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000015c | 11.781 | 3.353 | 0.005 | 0.000 | 0.704 | 0.802 | 1.122 | 0.043 | n/a | 0.216 | 5.483 | n/a | n/a | 0.053 | 4.062 | 0.345 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.885 | 0.565 | 0.000 | 1.376 | 4.958 | 0.176 | 0.000 | 0.121 | 1.522 | 5.310 | 0.058 | n/a | 0.593 | 12.933 | n/a | n/a | 0.065 | 5.853 | 0.184 | 0.065 |
| p99 | 119.509 | 4.184 | 0.012 | 4.580 | 11.531 | 0.423 | 1.235 | 1.165 | 6.190 | 73.119 | 4.484 | n/a | 24.676 | 33.250 | n/a | n/a | 0.134 | 12.182 | 0.459 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000001a1 | 119.509 | 4.776 | 0.214 | 0.253 | 0.070 | 1.820 | 73.119 | 0.083 | n/a | 24.676 | 14.437 | n/a | n/a | 0.059 | 5.314 | 0.044 | 0.059 | gw-w/thread-43/gateway.admitted-work | none observed |
| cceaf0dccd4dc0090000000000000197 | 71.744 | 3.895 | 0.297 | 0.224 | 0.074 | 1.606 | 32.026 | 0.105 | n/a | 0.213 | 33.250 | n/a | n/a | 0.054 | 4.489 | 0.063 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001b1 | 48.000 | 5.545 | 0.412 | 0.528 | 0.101 | 2.465 | 15.625 | 0.121 | n/a | 4.063 | 19.074 | n/a | n/a | 0.065 | 6.586 | 0.137 | 0.065 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001af | 45.886 | 4.792 | 0.375 | 0.487 | 0.152 | 2.490 | 21.955 | 0.192 | n/a | 0.571 | 14.766 | n/a | n/a | 0.107 | 5.806 | 0.127 | 0.107 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000180 | 45.753 | 5.845 | 0.236 | 0.417 | 0.072 | 2.345 | 18.501 | 0.082 | n/a | 0.265 | 17.944 | n/a | n/a | 0.045 | 6.570 | 0.144 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000017c | 44.555 | 4.035 | 0.176 | 0.258 | 0.077 | 1.561 | 24.569 | 0.058 | n/a | 0.842 | 12.933 | n/a | n/a | 0.045 | 4.546 | 0.102 | 0.045 | gw-w/thread-45/gateway.admitted-work | none observed |
| cceaf0dccd4dc00900000000000001ba | 43.541 | 3.913 | 0.199 | 0.361 | 0.020 | 1.617 | 24.019 | 0.089 | n/a | 0.242 | 13.051 | n/a | n/a | 0.030 | 4.494 | 0.103 | 0.030 | gw-w/thread-44/gateway.admitted-work | driver.publication 1.434ms |
| cceaf0dccd4dc009000000000000018b | 41.322 | 5.591 | 0.277 | 0.261 | 0.085 | 1.573 | 20.787 | 0.054 | n/a | 0.558 | 12.065 | n/a | n/a | 0.071 | 6.214 | 0.150 | 0.071 | gw-w/thread-44/gateway.admitted-work | none observed |
| cceaf0dccd4dc009000000000000019f | 40.704 | 6.041 | 0.344 | 1.235 | 0.115 | 2.389 | 13.226 | 0.101 | n/a | 0.393 | 16.793 | n/a | n/a | 0.066 | 7.736 | 0.190 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000185 | 39.516 | 6.565 | 0.037 | 0.000 | 0.119 | 0.971 | 3.621 | 4.484 | n/a | 0.471 | 23.201 | n/a | n/a | 0.048 | 6.720 | 0.170 | 0.048 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001bd | 39.153 | 6.451 | 0.317 | 0.000 | 0.087 | 6.108 | 8.527 | 0.085 | n/a | 1.476 | 15.968 | n/a | n/a | 0.134 | 6.855 | 0.175 | 0.134 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000193 | 36.795 | 3.937 | 0.239 | 0.367 | 0.082 | 1.272 | 8.490 | 0.056 | n/a | 0.222 | 22.075 | n/a | n/a | 0.057 | 4.624 | 0.126 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001b5 | 36.617 | 5.838 | 0.226 | 0.406 | 0.097 | 2.377 | 16.830 | 0.135 | n/a | 0.918 | 9.735 | n/a | n/a | 0.056 | 6.566 | 0.179 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001a5 | 36.325 | 5.339 | 0.299 | 0.436 | 0.062 | 2.215 | 14.410 | 0.081 | n/a | 0.752 | 12.666 | n/a | n/a | 0.065 | 6.137 | 0.169 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000018d | 35.246 | 3.903 | 0.289 | 0.288 | 0.069 | 6.190 | 9.342 | 0.047 | n/a | 0.226 | 14.846 | n/a | n/a | 0.046 | 4.549 | 0.129 | 0.046 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000183 | 34.137 | 3.529 | 0.254 | 0.342 | 0.121 | 1.534 | 7.724 | 0.110 | n/a | 1.056 | 19.400 | n/a | n/a | 0.067 | 4.246 | 0.124 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000019d | 32.174 | 5.424 | 0.213 | 0.484 | 0.080 | 2.024 | 10.057 | 0.092 | n/a | 1.382 | 12.352 | n/a | n/a | 0.067 | 6.200 | 0.193 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001b3 | 31.062 | 7.625 | 0.008 | 0.000 | 0.658 | 1.690 | 4.025 | 0.048 | n/a | 0.740 | 16.216 | n/a | n/a | 0.053 | 8.290 | 0.267 | 0.053 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001bf | 30.443 | 9.106 | 0.012 | 0.000 | 1.072 | 1.139 | 1.787 | 0.058 | n/a | 0.333 | 16.861 | n/a | n/a | 0.074 | 10.191 | 0.335 | 0.074 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000199 | 29.885 | 3.736 | 0.193 | 0.381 | 0.067 | 1.463 | 11.315 | 0.066 | n/a | 0.797 | 11.807 | n/a | n/a | 0.061 | 4.376 | 0.146 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.903 | 0.565 | 0.000 | 1.989 | 4.376 | 0.006 | 0.000 | 0.489 | 0.938 | 1.642 | 0.049 | n/a | 0.434 | 11.661 | n/a | n/a | 0.063 | 4.695 | 0.196 | 0.063 |
| p99 | 27.035 | 1.872 | 0.012 | 2.527 | 5.303 | 0.012 | 0.000 | 1.010 | 1.266 | 5.310 | 0.150 | n/a | 5.818 | 18.135 | n/a | n/a | 0.113 | 6.067 | 0.412 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000001a3 | 27.035 | 4.380 | 0.012 | 0.000 | 0.580 | 0.969 | 1.594 | 0.050 | n/a | 3.811 | 15.587 | n/a | n/a | 0.052 | 4.972 | 0.184 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000017a | 26.129 | 4.376 | 0.005 | 0.000 | 0.313 | 1.266 | 1.642 | 0.049 | n/a | 0.287 | 18.135 | n/a | n/a | 0.056 | 4.695 | 0.180 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000017e | 24.138 | 4.529 | 0.006 | 0.000 | 0.646 | 0.996 | 5.310 | 0.059 | n/a | 0.862 | 11.661 | n/a | n/a | 0.069 | 5.180 | 0.215 | 0.069 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001c2 | 22.470 | 3.948 | 0.005 | 0.000 | 0.111 | 0.737 | 2.952 | 0.043 | n/a | 5.818 | 8.792 | n/a | n/a | 0.063 | 4.064 | 0.181 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000189 | 20.875 | 3.165 | 0.005 | 0.000 | 0.165 | 0.993 | 2.078 | 0.090 | n/a | 0.910 | 13.431 | n/a | n/a | 0.038 | 3.334 | 0.160 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000191 | 19.903 | 5.112 | 0.007 | 0.000 | 0.489 | 0.751 | 1.289 | 0.038 | n/a | 0.434 | 11.697 | n/a | n/a | 0.086 | 5.608 | 0.282 | 0.086 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001b9 | 19.693 | 3.497 | 0.006 | 0.000 | 0.348 | 0.909 | 1.866 | 0.150 | n/a | 0.564 | 12.295 | n/a | n/a | 0.058 | 3.851 | 0.196 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001c4 | 17.852 | 4.930 | 0.011 | 0.000 | 1.010 | 0.929 | 1.246 | 0.045 | n/a | 0.222 | 9.381 | n/a | n/a | 0.078 | 5.950 | 0.333 | 0.078 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001ad | 15.296 | 3.678 | 0.007 | 0.000 | 0.887 | 0.938 | 1.825 | 0.055 | n/a | 0.356 | 7.436 | n/a | n/a | 0.113 | 4.572 | 0.299 | 0.113 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000018f | 14.713 | 5.303 | 0.010 | 0.000 | 0.753 | 0.957 | 1.238 | 0.039 | n/a | 0.258 | 6.088 | n/a | n/a | 0.067 | 6.067 | 0.412 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.766 | 0.552 | 0.000 | 1.447 | 4.176 | 0.023 | 0.000 | 0.151 | 1.205 | 5.206 | 0.057 | n/a | 0.538 | 12.371 | n/a | n/a | 0.061 | 4.753 | 0.208 | 0.061 |
| p99 | 83.031 | 2.608 | 0.000 | 3.101 | 14.335 | 1.794 | 0.000 | 1.156 | 3.276 | 14.447 | 3.739 | n/a | 5.057 | 75.941 | n/a | n/a | 0.098 | 14.675 | 0.396 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000001c9 | 83.031 | 4.080 | 0.006 | 0.000 | 0.284 | 0.837 | 1.245 | 0.044 | n/a | 0.541 | 75.941 | n/a | n/a | 0.054 | 4.369 | 0.053 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000213 | 59.021 | 3.804 | 0.326 | 0.000 | 0.097 | 1.999 | 7.253 | 0.142 | n/a | 0.418 | 44.923 | n/a | n/a | 0.061 | 4.227 | 0.072 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001ed | 45.102 | 14.335 | 0.012 | 0.000 | 0.328 | 3.097 | 14.447 | 0.134 | n/a | 0.822 | 11.883 | n/a | n/a | 0.045 | 14.675 | 0.325 | 0.045 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001d0 | 43.410 | 6.526 | 0.006 | 0.000 | 0.277 | 2.748 | 8.440 | 0.142 | n/a | 4.136 | 21.075 | n/a | n/a | 0.060 | 6.809 | 0.157 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.711ms |
| cceaf0dccd4dc00900000000000001da | 42.273 | 4.113 | 0.225 | 0.000 | 0.083 | 1.855 | 8.922 | 0.149 | n/a | 5.057 | 21.778 | n/a | n/a | 0.091 | 4.420 | 0.105 | 0.091 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001d6 | 41.255 | 4.094 | 0.287 | 0.000 | 0.087 | 3.276 | 13.760 | 0.049 | n/a | 0.217 | 19.419 | n/a | n/a | 0.067 | 4.468 | 0.108 | 0.067 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000203 | 38.061 | 5.116 | 0.346 | 0.000 | 0.084 | 2.429 | 10.722 | 0.058 | n/a | 0.249 | 18.996 | n/a | n/a | 0.060 | 5.547 | 0.146 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000217 | 37.416 | 4.748 | 0.207 | 0.000 | 0.075 | 2.557 | 13.470 | 0.096 | n/a | 4.001 | 12.204 | n/a | n/a | 0.058 | 5.030 | 0.134 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001d3 | 36.189 | 3.496 | 0.198 | 0.000 | 0.069 | 3.107 | 7.672 | 0.052 | n/a | 3.959 | 17.587 | n/a | n/a | 0.050 | 3.763 | 0.104 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001cb | 31.669 | 4.046 | 0.006 | 0.000 | 0.326 | 1.463 | 2.539 | 0.307 | n/a | 1.977 | 20.948 | n/a | n/a | 0.058 | 4.378 | 0.138 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001f5 | 30.513 | 4.919 | 0.220 | 0.000 | 0.082 | 2.113 | 9.784 | 0.058 | n/a | 0.957 | 12.322 | n/a | n/a | 0.058 | 5.221 | 0.171 | 0.058 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001ef | 29.553 | 3.619 | 0.232 | 0.000 | 0.125 | 1.132 | 9.385 | 0.057 | n/a | 0.299 | 14.634 | n/a | n/a | 0.071 | 3.976 | 0.135 | 0.071 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000207 | 28.407 | 4.240 | 0.227 | 0.000 | 0.094 | 1.854 | 7.675 | 0.124 | n/a | 0.540 | 13.586 | n/a | n/a | 0.065 | 4.562 | 0.161 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000021b | 28.086 | 4.721 | 1.602 | 0.000 | 0.083 | 2.087 | 7.316 | 0.059 | n/a | 0.961 | 11.204 | n/a | n/a | 0.052 | 6.407 | 0.228 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000020d | 27.718 | 3.584 | 0.225 | 0.000 | 0.101 | 1.344 | 7.566 | 0.067 | n/a | 0.538 | 14.228 | n/a | n/a | 0.065 | 3.909 | 0.141 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001cd | 27.213 | 5.948 | 0.240 | 0.000 | 0.151 | 1.286 | 5.371 | 0.051 | n/a | 0.528 | 13.559 | n/a | n/a | 0.078 | 6.339 | 0.233 | 0.078 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001f7 | 27.113 | 5.283 | 0.165 | 0.000 | 0.073 | 1.582 | 9.651 | 0.077 | n/a | 0.519 | 9.716 | n/a | n/a | 0.048 | 5.521 | 0.204 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000020b | 26.665 | 4.153 | 0.326 | 0.000 | 0.113 | 1.741 | 5.961 | 0.051 | n/a | 0.641 | 13.602 | n/a | n/a | 0.078 | 4.591 | 0.172 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000020e | 26.275 | 3.906 | 0.006 | 0.000 | 0.410 | 0.927 | 5.159 | 0.088 | n/a | 0.382 | 15.333 | n/a | n/a | 0.064 | 4.322 | 0.165 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001db | 26.265 | 5.751 | 0.006 | 0.000 | 0.629 | 0.749 | 2.227 | 0.077 | n/a | 1.207 | 15.567 | n/a | n/a | 0.052 | 6.386 | 0.243 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.955 | 1.081 | 0.000 | 1.804 | 4.080 | 0.007 | 0.000 | 0.546 | 0.968 | 1.302 | 0.044 | n/a | 0.532 | 11.121 | n/a | n/a | 0.058 | 4.607 | 0.246 | 0.058 |
| p99 | 83.031 | 2.054 | 0.000 | 2.392 | 5.850 | 0.023 | 0.000 | 1.156 | 1.463 | 5.159 | 0.307 | n/a | 1.977 | 75.941 | n/a | n/a | 0.098 | 7.020 | 0.396 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000001c9 | 83.031 | 4.080 | 0.006 | 0.000 | 0.284 | 0.837 | 1.245 | 0.044 | n/a | 0.541 | 75.941 | n/a | n/a | 0.054 | 4.369 | 0.053 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001cb | 31.669 | 4.046 | 0.006 | 0.000 | 0.326 | 1.463 | 2.539 | 0.307 | n/a | 1.977 | 20.948 | n/a | n/a | 0.058 | 4.378 | 0.138 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000020e | 26.275 | 3.906 | 0.006 | 0.000 | 0.410 | 0.927 | 5.159 | 0.088 | n/a | 0.382 | 15.333 | n/a | n/a | 0.064 | 4.322 | 0.165 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001cf | 25.766 | 5.475 | 0.012 | 0.000 | 0.546 | 0.968 | 1.298 | 0.041 | n/a | 0.230 | 17.131 | n/a | n/a | 0.066 | 6.033 | 0.234 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001e2 | 21.355 | 3.746 | 0.005 | 0.000 | 1.002 | 1.005 | 2.403 | 0.057 | n/a | 0.743 | 12.350 | n/a | n/a | 0.045 | 4.753 | 0.223 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001df | 21.252 | 5.850 | 0.014 | 0.000 | 1.156 | 0.971 | 1.302 | 0.047 | n/a | 0.691 | 11.121 | n/a | n/a | 0.098 | 7.020 | 0.330 | 0.098 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001e7 | 20.750 | 4.146 | 0.007 | 0.000 | 0.454 | 0.898 | 1.084 | 0.040 | n/a | 0.540 | 13.533 | n/a | n/a | 0.048 | 4.607 | 0.222 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001f3 | 18.955 | 4.502 | 0.013 | 0.000 | 0.291 | 0.739 | 3.281 | 0.045 | n/a | 0.532 | 9.492 | n/a | n/a | 0.061 | 4.805 | 0.253 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001d8 | 18.858 | 4.569 | 0.014 | 0.000 | 0.298 | 1.040 | 2.169 | 0.042 | n/a | 1.256 | 9.418 | n/a | n/a | 0.051 | 4.881 | 0.259 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001fb | 18.853 | 3.746 | 0.006 | 0.000 | 0.548 | 0.818 | 1.006 | 0.040 | n/a | 0.244 | 12.371 | n/a | n/a | 0.077 | 4.299 | 0.228 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000201 | 18.433 | 4.176 | 0.010 | 0.000 | 1.095 | 1.176 | 1.648 | 0.087 | n/a | 0.330 | 9.833 | n/a | n/a | 0.078 | 5.281 | 0.286 | 0.078 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000219 | 17.204 | 5.216 | 0.011 | 0.000 | 1.087 | 0.968 | 1.092 | 0.035 | n/a | 0.499 | 8.210 | n/a | n/a | 0.086 | 6.314 | 0.367 | 0.086 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000209 | 16.727 | 3.571 | 0.006 | 0.000 | 0.548 | 1.191 | 1.639 | 0.084 | n/a | 0.472 | 9.166 | n/a | n/a | 0.050 | 4.125 | 0.247 | 0.050 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000204 | 15.812 | 3.475 | 0.006 | 0.000 | 0.415 | 0.742 | 1.059 | 0.042 | n/a | 0.399 | 9.625 | n/a | n/a | 0.049 | 3.897 | 0.246 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000001e5 | 10.232 | 3.046 | 0.023 | 0.000 | 0.979 | 0.811 | 0.981 | 0.039 | n/a | 0.542 | 3.770 | n/a | n/a | 0.042 | 4.048 | 0.396 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.877 | 0.682 | 0.000 | 1.644 | 4.579 | 0.011 | 0.000 | 0.231 | 1.365 | 3.651 | 0.046 | n/a | 0.496 | 9.938 | n/a | n/a | 0.060 | 4.947 | 0.239 | 0.060 |
| p99 | 72.114 | 3.098 | 0.928 | 4.073 | 12.678 | 0.348 | 0.000 | 1.194 | 4.766 | 59.354 | 8.029 | n/a | 5.178 | 43.439 | n/a | n/a | 0.146 | 12.981 | 0.460 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc0090000000000000265 | 72.114 | 6.835 | 0.011 | 0.000 | 1.024 | 2.371 | 59.354 | 0.067 | n/a | 0.224 | 2.148 | n/a | n/a | 0.079 | 7.871 | 0.109 | 0.079 | gw-w/thread-45/storage/begin-command! | none observed |
| cceaf0dccd4dc009000000000000026e | 54.398 | 4.020 | 0.287 | 0.000 | 0.050 | 1.398 | 4.668 | 0.055 | n/a | 0.435 | 43.439 | n/a | n/a | 0.044 | 4.357 | 0.080 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000023b | 38.843 | 4.581 | 0.306 | 0.000 | 0.060 | 2.659 | 5.715 | 3.444 | n/a | 0.326 | 21.705 | n/a | n/a | 0.047 | 4.947 | 0.127 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000027c | 38.832 | 12.678 | 0.021 | 0.000 | 0.282 | 1.528 | 5.949 | 0.185 | n/a | 0.702 | 17.354 | n/a | n/a | 0.134 | 12.981 | 0.334 | 0.134 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000266 | 35.319 | 3.680 | 0.207 | 0.000 | 0.060 | 2.914 | 14.226 | 0.097 | n/a | 3.697 | 10.326 | n/a | n/a | 0.112 | 3.947 | 0.112 | 0.112 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000246 | 33.358 | 3.541 | 0.006 | 0.000 | 0.231 | 0.719 | 1.203 | 8.029 | n/a | 0.056 | 19.534 | n/a | n/a | 0.039 | 3.778 | 0.113 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.079ms |
| cceaf0dccd4dc0090000000000000228 | 31.233 | 4.977 | 0.196 | 0.000 | 0.067 | 1.477 | 9.037 | 0.041 | n/a | 0.455 | 14.900 | n/a | n/a | 0.083 | 5.240 | 0.168 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000024b | 30.267 | 3.782 | 0.209 | 0.000 | 0.062 | 1.442 | 8.000 | 0.044 | n/a | 5.114 | 11.566 | n/a | n/a | 0.049 | 4.053 | 0.134 | 0.049 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000021e | 30.158 | 3.713 | 0.203 | 0.000 | 0.075 | 1.520 | 6.377 | 0.047 | n/a | 0.276 | 17.885 | n/a | n/a | 0.063 | 3.990 | 0.132 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000022d | 29.844 | 7.052 | 0.011 | 0.000 | 0.690 | 1.426 | 8.735 | 0.034 | n/a | 0.162 | 11.674 | n/a | n/a | 0.060 | 7.754 | 0.260 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000280 | 29.689 | 4.182 | 0.225 | 0.000 | 0.097 | 1.365 | 11.827 | 0.044 | n/a | 0.852 | 11.028 | n/a | n/a | 0.070 | 4.504 | 0.152 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000245 | 29.612 | 5.711 | 0.007 | 0.000 | 0.710 | 1.427 | 4.451 | 3.327 | n/a | 5.178 | 8.761 | n/a | n/a | 0.040 | 6.427 | 0.217 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000023f | 28.945 | 5.010 | 0.232 | 0.000 | 0.077 | 1.418 | 6.949 | 0.045 | n/a | 0.624 | 14.531 | n/a | n/a | 0.058 | 5.319 | 0.184 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000025c | 27.105 | 3.821 | 0.188 | 0.000 | 0.057 | 1.361 | 10.909 | 0.066 | n/a | 0.308 | 10.309 | n/a | n/a | 0.086 | 4.066 | 0.150 | 0.086 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.096ms |
| cceaf0dccd4dc0090000000000000222 | 27.097 | 6.254 | 0.012 | 0.000 | 0.623 | 1.642 | 1.312 | 3.140 | n/a | 0.245 | 13.779 | n/a | n/a | 0.089 | 6.889 | 0.254 | 0.089 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000022f | 25.188 | 3.745 | 0.264 | 0.000 | 0.071 | 1.444 | 9.155 | 0.044 | n/a | 0.519 | 9.858 | n/a | n/a | 0.089 | 4.079 | 0.162 | 0.089 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000243 | 25.037 | 5.128 | 0.323 | 0.000 | 0.080 | 1.263 | 9.704 | 0.038 | n/a | 0.202 | 8.243 | n/a | n/a | 0.056 | 5.531 | 0.221 | 0.056 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000257 | 24.885 | 6.488 | 0.005 | 0.000 | 0.671 | 0.802 | 2.912 | 0.046 | n/a | 0.238 | 13.682 | n/a | n/a | 0.042 | 7.165 | 0.288 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000268 | 24.883 | 3.298 | 0.255 | 0.000 | 0.110 | 4.766 | 8.498 | 0.043 | n/a | 0.507 | 7.341 | n/a | n/a | 0.065 | 3.663 | 0.147 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000232 | 24.648 | 3.795 | 0.265 | 0.000 | 0.109 | 1.440 | 5.328 | 0.055 | n/a | 0.486 | 13.114 | n/a | n/a | 0.056 | 4.169 | 0.169 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.256ms |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.802 | 0.774 | 0.000 | 1.765 | 4.311 | 0.006 | 0.000 | 0.629 | 0.908 | 1.203 | 0.042 | n/a | 0.492 | 7.421 | n/a | n/a | 0.062 | 4.798 | 0.305 | 0.062 |
| p99 | 72.114 | 2.121 | 0.928 | 4.073 | 12.678 | 0.021 | 0.000 | 1.167 | 4.417 | 59.354 | 8.029 | n/a | 3.740 | 19.534 | n/a | n/a | 0.134 | 12.981 | 0.456 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc0090000000000000265 | 72.114 | 6.835 | 0.011 | 0.000 | 1.024 | 2.371 | 59.354 | 0.067 | n/a | 0.224 | 2.148 | n/a | n/a | 0.079 | 7.871 | 0.109 | 0.079 | gw-w/thread-45/storage/begin-command! | none observed |
| cceaf0dccd4dc009000000000000027c | 38.832 | 12.678 | 0.021 | 0.000 | 0.282 | 1.528 | 5.949 | 0.185 | n/a | 0.702 | 17.354 | n/a | n/a | 0.134 | 12.981 | 0.334 | 0.134 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000246 | 33.358 | 3.541 | 0.006 | 0.000 | 0.231 | 0.719 | 1.203 | 8.029 | n/a | 0.056 | 19.534 | n/a | n/a | 0.039 | 3.778 | 0.113 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.079ms |
| cceaf0dccd4dc0090000000000000222 | 27.097 | 6.254 | 0.012 | 0.000 | 0.623 | 1.642 | 1.312 | 3.140 | n/a | 0.245 | 13.779 | n/a | n/a | 0.089 | 6.889 | 0.254 | 0.089 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000022b | 24.149 | 3.102 | 0.006 | 0.000 | 0.499 | 0.378 | 1.709 | 0.034 | n/a | 3.740 | 14.650 | n/a | n/a | 0.031 | 3.607 | 0.149 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000025b | 22.830 | 5.875 | 0.010 | 0.000 | 1.073 | 0.806 | 1.939 | 0.212 | n/a | 0.327 | 12.498 | n/a | n/a | 0.088 | 6.959 | 0.305 | 0.088 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000231 | 21.209 | 3.600 | 0.006 | 0.000 | 0.763 | 1.054 | 1.054 | 0.042 | n/a | 2.181 | 12.462 | n/a | n/a | 0.048 | 4.369 | 0.206 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000021d | 19.190 | 6.166 | 0.006 | 0.000 | 0.383 | 2.888 | 5.694 | 0.058 | n/a | 0.620 | 3.280 | n/a | n/a | 0.095 | 6.555 | 0.342 | 0.095 | gw-w/thread-45/gateway.admitted-work | none observed |
| cceaf0dccd4dc0090000000000000226 | 17.802 | 3.362 | 0.006 | 0.000 | 1.014 | 0.754 | 0.979 | 0.033 | n/a | 0.478 | 11.131 | n/a | n/a | 0.045 | 4.382 | 0.246 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000023c | 17.362 | 3.056 | 0.006 | 0.000 | 1.167 | 4.417 | 0.924 | 0.040 | n/a | 0.234 | 7.477 | n/a | n/a | 0.040 | 4.230 | 0.244 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000027e | 15.100 | 3.806 | 0.005 | 0.000 | 0.629 | 0.914 | 2.489 | 0.074 | n/a | 0.403 | 6.728 | n/a | n/a | 0.050 | 4.441 | 0.294 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000024f | 14.937 | 4.606 | 0.011 | 0.000 | 0.140 | 0.905 | 1.182 | 0.041 | n/a | 2.561 | 5.411 | n/a | n/a | 0.080 | 4.757 | 0.318 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000278 | 14.713 | 3.669 | 0.006 | 0.000 | 1.123 | 0.701 | 1.117 | 0.038 | n/a | 0.566 | 7.421 | n/a | n/a | 0.072 | 4.798 | 0.326 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000272 | 12.765 | 4.591 | 0.006 | 0.000 | 0.688 | 0.734 | 1.063 | 0.035 | n/a | 0.608 | 4.978 | n/a | n/a | 0.062 | 5.285 | 0.414 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000259 | 12.666 | 4.311 | 0.006 | 0.000 | 0.990 | 0.908 | 1.067 | 0.037 | n/a | 0.492 | 4.812 | n/a | n/a | 0.043 | 5.307 | 0.419 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000026a | 12.126 | 3.689 | 0.006 | 0.000 | 0.183 | 0.892 | 1.641 | 0.063 | n/a | 0.895 | 4.712 | n/a | n/a | 0.045 | 3.879 | 0.320 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000260 | 11.720 | 5.165 | 0.007 | 0.000 | 0.175 | 1.044 | 0.977 | 0.034 | n/a | 0.206 | 4.033 | n/a | n/a | 0.079 | 5.347 | 0.456 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.170 | 0.793 | 0.000 | 0.896 | 4.306 | 0.016 | 0.000 | 0.147 | 1.207 | 3.220 | 0.056 | n/a | 0.431 | 10.058 | n/a | n/a | 0.062 | 4.731 | 0.224 | 0.062 |
| p99 | 90.598 | 3.539 | 0.000 | 4.417 | 9.190 | n/a | 0.000 | 5.119 | 6.095 | 26.290 | 2.865 | n/a | 2.218 | 64.928 | n/a | n/a | 0.125 | 9.816 | 0.524 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000002ba | 90.598 | 8.212 | 0.375 | 0.000 | 0.064 | 3.158 | 12.081 | 0.107 | n/a | 1.612 | 64.928 | n/a | n/a | 0.062 | 8.651 | 0.095 | 0.062 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 2.708ms |
| cceaf0dccd4dc009000000000000028f | 43.630 | 3.756 | 0.301 | 0.000 | 0.067 | 1.327 | 15.716 | 2.865 | n/a | 0.200 | 19.336 | n/a | n/a | 0.062 | 4.124 | 0.095 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002d3 | 40.788 | 4.217 | 0.328 | 0.000 | 0.104 | 1.892 | 10.605 | 0.095 | n/a | 0.444 | 23.026 | n/a | n/a | 0.075 | 4.650 | 0.114 | 0.075 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002b2 | 38.134 | 3.510 | 0.806 | 0.000 | 0.076 | 1.412 | 11.856 | 0.079 | n/a | 0.375 | 19.967 | n/a | n/a | 0.052 | 4.392 | 0.115 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002ca | 36.163 | 3.158 | n/a | 0.000 | 0.455 | 6.095 | 26.290 | 0.021 | n/a | 0.054 | 0.000 | n/a | n/a | 0.091 | 3.613 | 0.100 | 0.091 | gw-w/thread-40/gateway.admitted-work | none observed |
| cceaf0dccd4dc0090000000000000297 | 33.532 | 7.731 | 0.206 | 0.000 | 0.063 | 2.004 | 10.746 | 0.049 | n/a | 0.230 | 12.438 | n/a | n/a | 0.066 | 8.000 | 0.239 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000288 | 32.213 | 5.042 | 1.597 | 0.000 | 0.118 | 1.101 | 13.887 | 0.069 | n/a | 0.217 | 10.116 | n/a | n/a | 0.067 | 6.757 | 0.210 | 0.067 | gw-w/thread-44/gateway.admitted-work | none observed |
| cceaf0dccd4dc0090000000000000284 | 31.302 | 4.290 | 0.227 | 0.000 | 0.111 | 1.533 | 9.389 | 0.075 | n/a | 0.446 | 15.163 | n/a | n/a | 0.068 | 4.628 | 0.148 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002be | 30.026 | 4.360 | 0.286 | 0.000 | 0.085 | 1.959 | 6.033 | 0.079 | n/a | 1.043 | 16.134 | n/a | n/a | 0.047 | 4.731 | 0.158 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000029d | 29.378 | 5.518 | 0.326 | 0.000 | 0.088 | 2.322 | 9.514 | 0.060 | n/a | 0.701 | 10.766 | n/a | n/a | 0.084 | 5.932 | 0.202 | 0.084 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002ad | 27.736 | 4.654 | 0.006 | 0.000 | 0.283 | 1.177 | 5.240 | 0.081 | n/a | 0.403 | 15.822 | n/a | n/a | 0.070 | 4.943 | 0.178 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002d5 | 27.182 | 4.246 | 0.363 | 0.000 | 0.136 | 1.746 | 6.550 | 0.051 | n/a | 0.681 | 13.317 | n/a | n/a | 0.093 | 4.745 | 0.175 | 0.093 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000029b | 26.475 | 5.316 | 0.012 | 0.000 | 0.591 | 3.881 | 1.369 | 0.036 | n/a | 0.205 | 14.939 | n/a | n/a | 0.125 | 5.919 | 0.224 | 0.125 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002a5 | 26.300 | 4.214 | 0.262 | 0.000 | 0.072 | 2.878 | 6.012 | 0.047 | n/a | 0.214 | 12.495 | n/a | n/a | 0.106 | 4.548 | 0.173 | 0.106 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002a9 | 24.540 | 3.946 | 0.391 | 0.000 | 0.064 | 1.400 | 8.328 | 0.064 | n/a | 0.229 | 10.058 | n/a | n/a | 0.061 | 4.400 | 0.179 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002c1 | 24.151 | 9.190 | 0.006 | 0.000 | 0.336 | 1.245 | 1.401 | 0.035 | n/a | 0.482 | 11.379 | n/a | n/a | 0.078 | 9.531 | 0.395 | 0.078 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002b0 | 23.899 | 4.846 | 0.295 | 0.000 | 0.048 | 1.730 | 6.249 | 0.043 | n/a | 0.189 | 10.457 | n/a | n/a | 0.041 | 5.189 | 0.217 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002cd | 23.350 | 7.100 | 0.006 | 0.000 | 0.919 | 0.899 | 3.039 | 0.094 | n/a | 0.530 | 10.706 | n/a | n/a | 0.056 | 8.025 | 0.344 | 0.056 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000295 | 23.158 | 4.364 | 0.234 | 0.000 | 0.114 | 1.207 | 5.670 | 0.068 | n/a | 0.848 | 10.558 | n/a | n/a | 0.094 | 4.712 | 0.203 | 0.094 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002a1 | 22.431 | 3.615 | 0.268 | 0.000 | 0.147 | 1.391 | 6.145 | 0.045 | n/a | 0.575 | 10.166 | n/a | n/a | 0.080 | 4.029 | 0.180 | 0.080 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.794 | 1.044 | 0.000 | 1.771 | 3.538 | 0.006 | 0.000 | 0.591 | 0.829 | 1.702 | 0.056 | n/a | 0.431 | 8.210 | n/a | n/a | 0.046 | 4.237 | 0.264 | 0.046 |
| p99 | 36.163 | 1.934 | 0.000 | 3.259 | 5.527 | n/a | 0.000 | 5.119 | 6.095 | 26.290 | 0.130 | n/a | 2.218 | 14.939 | n/a | n/a | 0.125 | 8.968 | 0.445 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000002ca | 36.163 | 3.158 | n/a | 0.000 | 0.455 | 6.095 | 26.290 | 0.021 | n/a | 0.054 | 0.000 | n/a | n/a | 0.091 | 3.613 | 0.100 | 0.091 | gw-w/thread-40/gateway.admitted-work | none observed |
| cceaf0dccd4dc009000000000000029b | 26.475 | 5.316 | 0.012 | 0.000 | 0.591 | 3.881 | 1.369 | 0.036 | n/a | 0.205 | 14.939 | n/a | n/a | 0.125 | 5.919 | 0.224 | 0.125 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002bb | 21.170 | 5.102 | 0.006 | 0.000 | 0.476 | 1.354 | 1.096 | 0.017 | n/a | 0.626 | 12.463 | n/a | n/a | 0.032 | 5.583 | 0.264 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002c3 | 20.153 | 3.844 | 0.005 | 0.000 | 5.119 | 0.999 | 1.702 | 0.049 | n/a | 0.271 | 8.126 | n/a | n/a | 0.038 | 8.968 | 0.445 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 2.555ms; driver.expected-state.bind-receipt 1.417ms |
| cceaf0dccd4dc0090000000000000282 | 20.124 | 3.449 | 0.006 | 0.000 | 0.405 | 0.804 | 2.015 | 0.077 | n/a | 0.325 | 12.984 | n/a | n/a | 0.059 | 3.860 | 0.192 | 0.059 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002c6 | 19.432 | 4.845 | 0.007 | 0.000 | 0.689 | 0.635 | 4.364 | 0.092 | n/a | 0.508 | 8.210 | n/a | n/a | 0.082 | 5.541 | 0.285 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002b4 | 17.824 | 4.332 | 0.006 | 0.000 | 0.592 | 0.661 | 2.990 | 0.056 | n/a | 0.547 | 8.582 | n/a | n/a | 0.059 | 4.929 | 0.277 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002ab | 15.794 | 3.086 | 0.006 | 0.000 | 0.903 | 0.854 | 2.046 | 0.079 | n/a | 0.431 | 8.347 | n/a | n/a | 0.041 | 3.995 | 0.253 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002bf | 15.533 | 3.263 | 0.005 | 0.000 | 0.639 | 0.655 | 1.961 | 0.113 | n/a | 0.270 | 8.586 | n/a | n/a | 0.042 | 3.907 | 0.252 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000029f | 15.363 | 3.692 | 0.007 | 0.000 | 0.539 | 0.829 | 1.159 | 0.043 | n/a | 0.781 | 8.267 | n/a | n/a | 0.047 | 4.237 | 0.276 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002a2 | 14.962 | 3.384 | 0.005 | 0.000 | 0.616 | 0.780 | 1.560 | 0.060 | n/a | 2.218 | 6.292 | n/a | n/a | 0.046 | 4.006 | 0.268 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc00900000000000002b8 | 14.627 | 5.527 | 0.012 | 0.000 | 0.368 | 1.198 | 1.302 | 0.130 | n/a | 1.169 | 4.842 | n/a | n/a | 0.078 | 5.907 | 0.404 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000290 | 14.359 | 3.538 | 0.005 | 0.000 | 0.076 | 0.826 | 3.220 | 0.056 | n/a | 0.881 | 5.716 | n/a | n/a | 0.040 | 3.619 | 0.252 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000298 | 13.283 | 3.520 | 0.006 | 0.000 | 0.988 | 0.997 | 1.408 | 0.043 | n/a | 0.272 | 6.007 | n/a | n/a | 0.042 | 4.513 | 0.340 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (850 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.466 | 0.839 | 0.000 | 1.654 | 3.784 | 0.005 | 0.000 | 0.770 | 0.928 | 1.306 | 0.038 | n/a | 0.332 | 8.282 | n/a | n/a | 0.041 | 4.972 | 0.291 | 0.041 |
| p99 | 125.382 | 2.916 | 2.394 | 7.171 | 12.138 | 1.956 | 0.000 | 26.209 | 15.422 | 11.715 | 5.441 | n/a | 4.876 | 86.167 | n/a | n/a | 0.119 | 33.193 | 0.686 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000006c2 | 162.856 | 4.847 | 0.008 | 0.000 | 0.384 | 1.148 | 0.996 | 0.035 | n/a | 4.876 | 150.488 | n/a | n/a | 0.074 | 5.239 | 0.032 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.912ms; driver.expected-state.bind-receipt 1.631ms |
| cceaf0dccd4dc00900000000000006c5 | 157.822 | 5.122 | 0.006 | 0.000 | 4.041 | 13.882 | 1.114 | 0.033 | n/a | 3.758 | 129.727 | n/a | n/a | 0.137 | 9.169 | 0.058 | 0.137 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.299ms; driver.publication 1.084ms |
| cceaf0dccd4dc00900000000000006c4 | 151.492 | 5.179 | 0.007 | 0.000 | 0.350 | 2.476 | 1.483 | 0.067 | n/a | 7.383 | 134.491 | n/a | n/a | 0.055 | 5.537 | 0.037 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.084ms; driver.expected-state.bind-receipt 1.074ms |
| cceaf0dccd4dc00900000000000006d1 | 142.655 | 4.595 | 0.004 | 0.000 | 64.206 | 0.532 | 1.777 | 5.441 | n/a | 0.699 | 65.293 | n/a | n/a | 0.108 | 68.805 | 0.482 | 0.108 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.469ms; client.encode 3.317ms; driver.publication 1.975ms; driver.publication 1.435ms; driver.expected-state.bind-receipt 1.415ms |
| cceaf0dccd4dc00900000000000006c9 | 142.197 | 2.846 | 0.004 | 0.000 | 89.883 | 18.474 | 1.759 | 0.055 | n/a | 0.281 | 28.847 | n/a | n/a | 0.047 | 92.734 | 0.652 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 6.804ms; driver.publication 3.469ms; client.encode 3.317ms; driver.publication 2.739ms; driver.publication 1.975ms |
| cceaf0dccd4dc00900000000000006c7 | 136.361 | 4.219 | 0.005 | 0.000 | 0.910 | 13.910 | 1.703 | 0.035 | n/a | 2.049 | 113.463 | n/a | n/a | 0.066 | 5.134 | 0.038 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 4.269ms; driver.publication 3.469ms; driver.publication 2.739ms; driver.publication 1.975ms |
| cceaf0dccd4dc00900000000000006c1 | 133.379 | 10.359 | 0.012 | 0.000 | 0.329 | 1.061 | 1.497 | 2.059 | n/a | 1.581 | 116.350 | n/a | n/a | 0.130 | 10.699 | 0.080 | 0.130 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.912ms; driver.expected-state.bind-receipt 1.631ms; driver.expected-state.bind-receipt 1.074ms |
| cceaf0dccd4dc00900000000000006c6 | 130.345 | 7.762 | 0.005 | 0.000 | 2.171 | 4.142 | 1.343 | 0.035 | n/a | 1.746 | 113.075 | n/a | n/a | 0.065 | 9.939 | 0.076 | 0.065 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.975ms; driver.publication 1.299ms |
| cceaf0dccd4dc00900000000000006cb | 125.382 | 10.719 | 0.010 | 0.000 | 0.826 | 12.961 | 1.698 | 0.037 | n/a | 0.257 | 98.833 | n/a | n/a | 0.043 | 11.554 | 0.092 | 0.043 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 3.469ms; client.encode 3.317ms; driver.publication 1.975ms; driver.publication 1.299ms |
| cceaf0dccd4dc00900000000000006e2 | 122.774 | 3.534 | 0.003 | 0.000 | 91.026 | 3.434 | 1.558 | 2.892 | n/a | 0.933 | 19.356 | n/a | n/a | 0.038 | 94.563 | 0.770 | 0.038 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.415ms; driver.publication 1.146ms; driver.publication 1.137ms; driver.publication 1.063ms; driver.publication 1.058ms |
| cceaf0dccd4dc00900000000000006df | 118.416 | 2.474 | 0.003 | 0.000 | 98.250 | 3.686 | 1.140 | 0.125 | n/a | 1.545 | 11.156 | n/a | n/a | 0.035 | 100.727 | 0.851 | 0.035 | node-14/thread-0/driver.queue.subject | client.encode 3.317ms; driver.publication 1.435ms; driver.expected-state.bind-receipt 1.415ms; driver.publication 1.146ms; driver.publication 1.137ms |
| cceaf0dccd4dc00900000000000006c0 | 117.717 | 9.168 | 0.006 | 0.000 | 0.665 | 0.975 | 2.271 | 7.235 | n/a | 3.227 | 94.103 | n/a | n/a | 0.067 | 9.839 | 0.084 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 4.269ms; driver.publication 1.912ms; driver.expected-state.bind-receipt 1.631ms |
| cceaf0dccd4dc00900000000000006d7 | 117.164 | 3.931 | 0.004 | 0.000 | 36.657 | 2.549 | 2.018 | 4.668 | n/a | 0.215 | 67.088 | n/a | n/a | 0.033 | 40.593 | 0.346 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | client.encode 3.317ms; driver.publication 1.435ms; driver.expected-state.bind-receipt 1.415ms; driver.publication 1.053ms; driver.publication 1.042ms |
| cceaf0dccd4dc00900000000000006d8 | 111.956 | 6.773 | 0.004 | 2.913 | 21.333 | 0.625 | 10.855 | 0.055 | n/a | 3.461 | 65.902 | n/a | n/a | 0.035 | 31.023 | 0.277 | 0.035 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.435ms; driver.publication 1.053ms; driver.publication 1.042ms |
| cceaf0dccd4dc00900000000000006bf | 108.005 | 7.660 | 0.004 | 0.000 | 0.590 | 0.774 | 1.083 | 10.882 | n/a | 0.783 | 86.167 | n/a | n/a | 0.059 | 8.255 | 0.076 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.912ms; driver.expected-state.bind-receipt 1.631ms |
| cceaf0dccd4dc00900000000000006cf | 105.671 | 8.657 | 0.006 | 0.000 | 0.484 | 31.237 | 7.374 | 0.093 | n/a | 1.259 | 56.430 | n/a | n/a | 0.132 | 9.146 | 0.087 | 0.132 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.469ms; client.encode 3.317ms; driver.publication 1.975ms; driver.publication 1.435ms; driver.publication 1.299ms |
| cceaf0dccd4dc00900000000000006e0 | 81.068 | 4.280 | 0.005 | 0.000 | 2.563 | 2.520 | 2.497 | 2.834 | n/a | 1.157 | 65.171 | n/a | n/a | 0.042 | 6.847 | 0.084 | 0.042 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.415ms; driver.publication 1.146ms; driver.publication 1.042ms |
| cceaf0dccd4dc00900000000000004a0 | 74.701 | 3.004 | 0.006 | 0.000 | 1.163 | 7.119 | 1.361 | 0.064 | n/a | 0.292 | 61.651 | n/a | n/a | 0.041 | 4.173 | 0.056 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.245ms; driver.expected-state.bind-receipt 1.175ms; driver.publication 1.095ms; driver.publication 1.023ms; driver.publication 0.134ms |
| cceaf0dccd4dc009000000000000043f | 74.421 | 7.347 | 0.015 | 0.000 | 2.266 | 4.087 | 1.993 | 0.091 | n/a | 0.216 | 58.373 | n/a | n/a | 0.032 | 9.628 | 0.129 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.125ms; driver.publication 1.030ms |
| cceaf0dccd4dc0090000000000000592 | 72.389 | 3.758 | 0.005 | 0.000 | 26.943 | 3.919 | 1.433 | 0.069 | n/a | 0.517 | 35.693 | n/a | n/a | 0.052 | 30.706 | 0.424 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.348ms; driver.publication 1.171ms |

## P2 / L1024 / commit / 5-10 facts (493 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.305 | 0.677 | 0.000 | 1.525 | 3.295 | 0.005 | 0.000 | 0.829 | 0.944 | 1.117 | 0.038 | n/a | 0.320 | 7.299 | n/a | n/a | 0.040 | 4.400 | 0.292 | 0.040 |
| p99 | 133.379 | 2.413 | 1.407 | 6.561 | 10.450 | 0.222 | 0.000 | 26.943 | 15.422 | 6.655 | 5.257 | n/a | 5.187 | 113.075 | n/a | n/a | 0.119 | 30.706 | 0.665 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000006c2 | 162.856 | 4.847 | 0.008 | 0.000 | 0.384 | 1.148 | 0.996 | 0.035 | n/a | 4.876 | 150.488 | n/a | n/a | 0.074 | 5.239 | 0.032 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.912ms; driver.expected-state.bind-receipt 1.631ms |
| cceaf0dccd4dc00900000000000006c5 | 157.822 | 5.122 | 0.006 | 0.000 | 4.041 | 13.882 | 1.114 | 0.033 | n/a | 3.758 | 129.727 | n/a | n/a | 0.137 | 9.169 | 0.058 | 0.137 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.299ms; driver.publication 1.084ms |
| cceaf0dccd4dc00900000000000006c4 | 151.492 | 5.179 | 0.007 | 0.000 | 0.350 | 2.476 | 1.483 | 0.067 | n/a | 7.383 | 134.491 | n/a | n/a | 0.055 | 5.537 | 0.037 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.084ms; driver.expected-state.bind-receipt 1.074ms |
| cceaf0dccd4dc00900000000000006c9 | 142.197 | 2.846 | 0.004 | 0.000 | 89.883 | 18.474 | 1.759 | 0.055 | n/a | 0.281 | 28.847 | n/a | n/a | 0.047 | 92.734 | 0.652 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 6.804ms; driver.publication 3.469ms; client.encode 3.317ms; driver.publication 2.739ms; driver.publication 1.975ms |
| cceaf0dccd4dc00900000000000006c1 | 133.379 | 10.359 | 0.012 | 0.000 | 0.329 | 1.061 | 1.497 | 2.059 | n/a | 1.581 | 116.350 | n/a | n/a | 0.130 | 10.699 | 0.080 | 0.130 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.912ms; driver.expected-state.bind-receipt 1.631ms; driver.expected-state.bind-receipt 1.074ms |
| cceaf0dccd4dc00900000000000006c6 | 130.345 | 7.762 | 0.005 | 0.000 | 2.171 | 4.142 | 1.343 | 0.035 | n/a | 1.746 | 113.075 | n/a | n/a | 0.065 | 9.939 | 0.076 | 0.065 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 4.269ms; driver.publication 2.739ms; driver.publication 1.975ms; driver.publication 1.299ms |
| cceaf0dccd4dc00900000000000006cb | 125.382 | 10.719 | 0.010 | 0.000 | 0.826 | 12.961 | 1.698 | 0.037 | n/a | 0.257 | 98.833 | n/a | n/a | 0.043 | 11.554 | 0.092 | 0.043 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 6.804ms; driver.publication 3.469ms; client.encode 3.317ms; driver.publication 1.975ms; driver.publication 1.299ms |
| cceaf0dccd4dc00900000000000006df | 118.416 | 2.474 | 0.003 | 0.000 | 98.250 | 3.686 | 1.140 | 0.125 | n/a | 1.545 | 11.156 | n/a | n/a | 0.035 | 100.727 | 0.851 | 0.035 | node-14/thread-0/driver.queue.subject | client.encode 3.317ms; driver.publication 1.435ms; driver.expected-state.bind-receipt 1.415ms; driver.publication 1.146ms; driver.publication 1.137ms |
| cceaf0dccd4dc00900000000000006d7 | 117.164 | 3.931 | 0.004 | 0.000 | 36.657 | 2.549 | 2.018 | 4.668 | n/a | 0.215 | 67.088 | n/a | n/a | 0.033 | 40.593 | 0.346 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | client.encode 3.317ms; driver.publication 1.435ms; driver.expected-state.bind-receipt 1.415ms; driver.publication 1.053ms; driver.publication 1.042ms |
| cceaf0dccd4dc00900000000000006bf | 108.005 | 7.660 | 0.004 | 0.000 | 0.590 | 0.774 | 1.083 | 10.882 | n/a | 0.783 | 86.167 | n/a | n/a | 0.059 | 8.255 | 0.076 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.912ms; driver.expected-state.bind-receipt 1.631ms |
| cceaf0dccd4dc0090000000000000592 | 72.389 | 3.758 | 0.005 | 0.000 | 26.943 | 3.919 | 1.433 | 0.069 | n/a | 0.517 | 35.693 | n/a | n/a | 0.052 | 30.706 | 0.424 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.348ms; driver.publication 1.171ms |
| cceaf0dccd4dc0090000000000000736 | 67.670 | 5.272 | 0.005 | 0.000 | 23.427 | 4.687 | 1.358 | 0.037 | n/a | 0.325 | 32.518 | n/a | n/a | 0.041 | 28.704 | 0.424 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.914ms; driver.publication 1.625ms; driver.publication 1.573ms; driver.expected-state.bind-receipt 1.194ms |
| cceaf0dccd4dc0090000000000000440 | 67.663 | 7.391 | 0.135 | 0.000 | 1.411 | 2.560 | 4.209 | 0.027 | n/a | 0.102 | 51.803 | n/a | n/a | 0.024 | 8.937 | 0.132 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc0090000000000000442 | 66.896 | 3.951 | 0.005 | 0.000 | 1.020 | 9.451 | 1.281 | 6.848 | n/a | 3.619 | 40.685 | n/a | n/a | 0.037 | 4.975 | 0.074 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.533ms; driver.publication 1.125ms |
| cceaf0dccd4dc00900000000000004a2 | 65.833 | 4.141 | 0.009 | 0.000 | 5.664 | 5.801 | 2.006 | 0.103 | n/a | 2.088 | 45.972 | n/a | n/a | 0.049 | 9.813 | 0.149 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.245ms; driver.expected-state.bind-receipt 1.175ms; driver.publication 1.095ms; driver.publication 1.023ms |
| cceaf0dccd4dc009000000000000039c | 57.588 | 7.237 | 0.012 | 0.000 | 0.046 | 1.210 | 1.154 | 1.487 | n/a | 0.779 | 45.626 | n/a | n/a | 0.038 | 7.295 | 0.127 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.823ms; driver.expected-state.bind-receipt 1.738ms; driver.publication 1.606ms; driver.publication 1.170ms |
| cceaf0dccd4dc00900000000000002f5 | 56.377 | 4.223 | 0.008 | 0.000 | 0.107 | 20.211 | 2.507 | 0.095 | n/a | 1.632 | 27.525 | n/a | n/a | 0.071 | 4.337 | 0.077 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.609ms |
| cceaf0dccd4dc00900000000000004a5 | 56.187 | 2.183 | 0.005 | 0.000 | 0.603 | 7.848 | 0.649 | 0.031 | n/a | 0.085 | 44.760 | n/a | n/a | 0.023 | 2.792 | 0.050 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.245ms; driver.expected-state.bind-receipt 1.175ms; driver.publication 1.023ms; driver.publication 1.023ms |
| cceaf0dccd4dc0090000000000000549 | 54.067 | 2.778 | 0.003 | 0.000 | 15.242 | 6.156 | 1.499 | 0.285 | n/a | 0.267 | 27.806 | n/a | n/a | 0.031 | 18.023 | 0.333 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.133ms; driver.publication 1.096ms; driver.publication 1.014ms |
| cceaf0dccd4dc0090000000000000598 | 53.083 | 2.798 | 0.002 | 0.000 | 0.175 | 7.344 | 0.709 | 0.036 | n/a | 0.151 | 41.830 | n/a | n/a | 0.038 | 2.975 | 0.056 | 0.038 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.862ms; driver.publication 1.578ms; driver.publication 1.341ms |

## P2 / tail / commit (2617 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.722 | 0.780 | 0.000 | 1.664 | 3.698 | 0.005 | 0.000 | 0.736 | 0.760 | 1.131 | 0.030 | n/a | 0.229 | 6.102 | n/a | n/a | 0.034 | 4.753 | 0.341 | 0.034 |
| p99 | 78.481 | 2.990 | 2.732 | 5.640 | 11.235 | 1.086 | 0.000 | 20.504 | 13.204 | 12.195 | 3.404 | n/a | 4.156 | 60.842 | n/a | n/a | 0.100 | 25.971 | 0.721 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc00900000000000018f5 | 139.775 | 11.794 | 0.007 | 0.000 | 1.169 | 19.313 | 2.439 | 0.042 | n/a | 0.139 | 104.793 | n/a | n/a | 0.079 | 12.969 | 0.093 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 4.644ms; driver.publication 2.686ms; driver.expected-state.bind-receipt 1.810ms; driver.publication 1.606ms; driver.publication 1.562ms |
| cceaf0dccd4dc009000000000000186f | 129.119 | 3.906 | 0.005 | 0.000 | 1.267 | 4.267 | 4.478 | 0.039 | n/a | 1.126 | 113.991 | n/a | n/a | 0.040 | 5.178 | 0.040 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.777ms; driver.publication 1.154ms; driver.publication 1.020ms |
| cceaf0dccd4dc00900000000000018f3 | 127.255 | 5.390 | 0.007 | 0.000 | 2.772 | 0.791 | 1.446 | 0.031 | n/a | 0.126 | 116.627 | n/a | n/a | 0.065 | 8.169 | 0.064 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.065ms; driver.publication 0.769ms |
| cceaf0dccd4dc009000000000000186e | 127.024 | 3.947 | 0.005 | 0.000 | 0.532 | 0.393 | 1.131 | 0.028 | n/a | 5.285 | 115.649 | n/a | n/a | 0.054 | 4.484 | 0.035 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.777ms; driver.publication 1.020ms |
| cceaf0dccd4dc00900000000000012a7 | 116.595 | 3.468 | 0.005 | 0.000 | 45.833 | 2.229 | 1.758 | 0.052 | n/a | 7.062 | 56.144 | n/a | n/a | 0.044 | 49.306 | 0.423 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.599ms; driver.publication 1.330ms; driver.publication 1.311ms; driver.publication 1.285ms; driver.publication 1.267ms |
| cceaf0dccd4dc0090000000000001872 | 115.220 | 3.961 | 0.006 | 0.000 | 0.868 | 0.736 | 1.301 | 0.049 | n/a | 0.533 | 107.731 | n/a | n/a | 0.035 | 4.835 | 0.042 | 0.035 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.389ms; driver.publication 1.154ms |
| cceaf0dccd4dc00900000000000012b6 | 102.802 | 4.332 | 0.006 | 0.000 | 30.374 | 2.420 | 2.365 | 0.046 | n/a | 0.196 | 62.992 | n/a | n/a | 0.072 | 34.712 | 0.338 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.497ms; driver.publication 2.033ms; driver.publication 1.690ms; driver.publication 1.664ms; driver.publication 1.599ms |
| cceaf0dccd4dc00900000000000012a2 | 99.374 | 3.018 | 0.006 | 0.000 | 1.146 | 1.368 | 1.150 | 0.035 | n/a | 0.131 | 92.480 | n/a | n/a | 0.040 | 4.170 | 0.042 | 0.040 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.656ms; driver.publication 1.311ms; driver.publication 1.285ms; driver.expected-state.bind-receipt 1.270ms; driver.publication 1.124ms |
| cceaf0dccd4dc0090000000000001359 | 97.641 | 39.730 | 0.007 | 0.000 | 15.852 | 4.012 | 1.369 | 0.437 | n/a | 0.570 | 35.390 | n/a | n/a | 0.274 | 55.589 | 0.569 | 0.274 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 17.370ms; driver.expected-state.bind-receipt 1.549ms |
| cceaf0dccd4dc00900000000000018f6 | 97.596 | 10.260 | 0.007 | 0.000 | 1.144 | 0.578 | 3.413 | 0.037 | n/a | 0.615 | 81.496 | n/a | n/a | 0.048 | 11.411 | 0.117 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.562ms |
| cceaf0dccd4dc009000000000000129a | 96.273 | 3.644 | 0.273 | 0.347 | 0.084 | 3.455 | 17.296 | 0.061 | n/a | 3.875 | 67.189 | n/a | n/a | 0.047 | 4.348 | 0.045 | 0.047 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 1.852ms; driver.publication 1.656ms; driver.publication 1.389ms; driver.expected-state.bind-receipt 1.270ms; driver.publication 1.075ms |
| cceaf0dccd4dc00900000000000012b1 | 95.895 | 10.224 | 0.010 | 0.000 | 1.088 | 7.070 | 2.058 | 0.061 | n/a | 7.945 | 67.390 | n/a | n/a | 0.049 | 11.322 | 0.118 | 0.049 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 2.033ms; driver.publication 1.664ms; driver.publication 1.599ms |
| cceaf0dccd4dc009000000000000135a | 95.853 | 5.981 | 0.017 | 0.000 | 0.512 | 18.635 | 3.127 | 0.038 | n/a | 1.790 | 65.718 | n/a | n/a | 0.037 | 6.509 | 0.068 | 0.037 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 34.944ms; driver.publication 17.370ms; driver.expected-state.bind-receipt 1.549ms; client.encode 1.134ms |
| cceaf0dccd4dc009000000000000191f | 95.156 | 2.879 | 0.002 | 0.000 | 1.869 | 0.293 | 0.595 | 19.841 | n/a | 0.039 | 69.617 | n/a | n/a | 0.021 | 4.750 | 0.050 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.280ms |
| cceaf0dccd4dc00900000000000012a1 | 93.005 | 2.951 | 0.005 | 0.000 | 3.600 | 0.683 | 0.996 | 0.026 | n/a | 3.016 | 81.691 | n/a | n/a | 0.037 | 6.557 | 0.071 | 0.037 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.852ms; driver.publication 1.656ms; driver.publication 1.311ms; driver.expected-state.bind-receipt 1.270ms |
| cceaf0dccd4dc00900000000000012ba | 91.319 | 3.683 | 0.006 | 0.000 | 0.262 | 1.644 | 3.091 | 0.050 | n/a | 0.193 | 82.360 | n/a | n/a | 0.031 | 3.951 | 0.043 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 3.497ms; driver.publication 2.033ms; driver.publication 1.690ms; driver.publication 1.379ms; driver.publication 1.304ms |
| cceaf0dccd4dc009000000000000191e | 91.011 | 5.844 | 0.006 | 0.000 | 1.754 | 0.885 | 21.160 | 0.111 | n/a | 0.239 | 60.977 | n/a | n/a | 0.035 | 7.604 | 0.084 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cceaf0dccd4dc009000000000000135b | 90.706 | 4.908 | 0.007 | 0.000 | 0.528 | 12.361 | 5.556 | 0.048 | n/a | 0.225 | 66.955 | n/a | n/a | 0.117 | 5.443 | 0.060 | 0.117 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 34.944ms; driver.publication 17.370ms; driver.expected-state.bind-receipt 1.549ms; driver.publication 1.189ms; client.encode 1.134ms |
| cceaf0dccd4dc00900000000000012b2 | 90.425 | 9.196 | 0.090 | 0.000 | 0.784 | 6.283 | 3.770 | 9.279 | n/a | 0.144 | 60.842 | n/a | n/a | 0.036 | 10.070 | 0.111 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.664ms; driver.publication 1.599ms |
| cceaf0dccd4dc00900000000000018f7 | 89.859 | 9.301 | 0.006 | 0.000 | 0.143 | 7.065 | 1.189 | 0.027 | n/a | 0.121 | 71.966 | n/a | n/a | 0.041 | 9.449 | 0.105 | 0.041 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 2.686ms; driver.expected-state.bind-receipt 1.810ms; driver.publication 1.562ms |

## P2 / tail / commit / 5-10 facts (1555 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.415 | 0.655 | 0.000 | 1.516 | 3.244 | 0.005 | 0.000 | 0.737 | 0.740 | 0.941 | 0.030 | n/a | 0.226 | 5.608 | n/a | n/a | 0.034 | 4.181 | 0.330 | 0.034 |
| p99 | 70.119 | 2.250 | 2.560 | 4.909 | 9.141 | 0.175 | 0.000 | 20.504 | 12.640 | 5.753 | 3.476 | n/a | 3.740 | 52.754 | n/a | n/a | 0.099 | 25.971 | 0.718 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc009000000000000186f | 129.119 | 3.906 | 0.005 | 0.000 | 1.267 | 4.267 | 4.478 | 0.039 | n/a | 1.126 | 113.991 | n/a | n/a | 0.040 | 5.178 | 0.040 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.777ms; driver.publication 1.154ms; driver.publication 1.020ms |
| cceaf0dccd4dc00900000000000012a7 | 116.595 | 3.468 | 0.005 | 0.000 | 45.833 | 2.229 | 1.758 | 0.052 | n/a | 7.062 | 56.144 | n/a | n/a | 0.044 | 49.306 | 0.423 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.599ms; driver.publication 1.330ms; driver.publication 1.311ms; driver.publication 1.285ms; driver.publication 1.267ms |
| cceaf0dccd4dc0090000000000001872 | 115.220 | 3.961 | 0.006 | 0.000 | 0.868 | 0.736 | 1.301 | 0.049 | n/a | 0.533 | 107.731 | n/a | n/a | 0.035 | 4.835 | 0.042 | 0.035 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.389ms; driver.publication 1.154ms |
| cceaf0dccd4dc00900000000000012a2 | 99.374 | 3.018 | 0.006 | 0.000 | 1.146 | 1.368 | 1.150 | 0.035 | n/a | 0.131 | 92.480 | n/a | n/a | 0.040 | 4.170 | 0.042 | 0.040 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.656ms; driver.publication 1.311ms; driver.publication 1.285ms; driver.expected-state.bind-receipt 1.270ms; driver.publication 1.124ms |
| cceaf0dccd4dc0090000000000001359 | 97.641 | 39.730 | 0.007 | 0.000 | 15.852 | 4.012 | 1.369 | 0.437 | n/a | 0.570 | 35.390 | n/a | n/a | 0.274 | 55.589 | 0.569 | 0.274 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 17.370ms; driver.expected-state.bind-receipt 1.549ms |
| cceaf0dccd4dc009000000000000191f | 95.156 | 2.879 | 0.002 | 0.000 | 1.869 | 0.293 | 0.595 | 19.841 | n/a | 0.039 | 69.617 | n/a | n/a | 0.021 | 4.750 | 0.050 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.280ms |
| cceaf0dccd4dc00900000000000012a1 | 93.005 | 2.951 | 0.005 | 0.000 | 3.600 | 0.683 | 0.996 | 0.026 | n/a | 3.016 | 81.691 | n/a | n/a | 0.037 | 6.557 | 0.071 | 0.037 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.852ms; driver.publication 1.656ms; driver.publication 1.311ms; driver.expected-state.bind-receipt 1.270ms |
| cceaf0dccd4dc00900000000000012b2 | 90.425 | 9.196 | 0.090 | 0.000 | 0.784 | 6.283 | 3.770 | 9.279 | n/a | 0.144 | 60.842 | n/a | n/a | 0.036 | 10.070 | 0.111 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.664ms; driver.publication 1.599ms |
| cceaf0dccd4dc009000000000000129f | 85.294 | 3.335 | 0.006 | 0.000 | 0.753 | 0.873 | 0.805 | 0.024 | n/a | 2.749 | 76.717 | n/a | n/a | 0.032 | 4.094 | 0.048 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.852ms; driver.publication 1.656ms; driver.expected-state.bind-receipt 1.270ms |
| cceaf0dccd4dc00900000000000009df | 83.044 | 4.584 | 0.008 | 0.000 | 1.104 | 0.914 | 2.145 | 0.058 | n/a | 0.886 | 73.283 | n/a | n/a | 0.061 | 5.697 | 0.069 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.525ms; driver.publication 1.356ms; driver.publication 1.330ms; driver.publication 1.308ms; driver.expected-state.bind-receipt 1.114ms |
| cceaf0dccd4dc00900000000000012b5 | 81.672 | 3.211 | 0.006 | 0.000 | 0.968 | 4.409 | 2.559 | 0.551 | n/a | 0.029 | 69.906 | n/a | n/a | 0.034 | 4.185 | 0.051 | 0.034 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 3.497ms; driver.publication 2.033ms; driver.publication 1.664ms; driver.publication 1.599ms; driver.publication 1.379ms |
| cceaf0dccd4dc00900000000000009e4 | 74.498 | 5.163 | 0.007 | 0.000 | 1.904 | 0.994 | 0.934 | 0.032 | n/a | 4.254 | 61.177 | n/a | n/a | 0.033 | 7.074 | 0.095 | 0.033 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.330ms; driver.publication 1.308ms; driver.publication 1.252ms; driver.publication 1.177ms; driver.expected-state.bind-receipt 1.114ms |
| cceaf0dccd4dc00900000000000009e1 | 74.173 | 7.399 | 0.010 | 0.000 | 0.193 | 1.015 | 1.422 | 0.035 | n/a | 4.048 | 60.003 | n/a | n/a | 0.048 | 7.603 | 0.102 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.525ms; driver.publication 1.356ms; driver.publication 1.330ms; driver.publication 1.308ms; driver.publication 1.252ms |
| cceaf0dccd4dc00900000000000012b8 | 72.829 | 3.021 | 0.005 | 0.000 | 0.893 | 0.656 | 5.161 | 0.030 | n/a | 0.120 | 62.895 | n/a | n/a | 0.049 | 3.919 | 0.054 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 3.497ms; driver.publication 2.033ms; driver.publication 1.690ms; driver.publication 1.664ms; driver.publication 1.379ms |
| cceaf0dccd4dc0090000000000000e0e | 72.302 | 3.128 | 0.003 | 0.000 | 26.962 | 0.560 | 27.203 | 3.494 | n/a | 0.142 | 10.783 | n/a | n/a | 0.027 | 30.093 | 0.416 | 0.027 | gw-w/thread-45/commit.prepare-and-validate | driver.publication 1.053ms; driver.publication 1.043ms |
| cceaf0dccd4dc00900000000000009de | 70.119 | 4.306 | 0.010 | 0.000 | 1.134 | 1.799 | 0.851 | 0.024 | n/a | 1.553 | 60.384 | n/a | n/a | 0.059 | 5.449 | 0.078 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.525ms; driver.publication 1.356ms; driver.publication 1.330ms; driver.publication 1.308ms; driver.expected-state.bind-receipt 1.114ms |
| cceaf0dccd4dc00900000000000012ac | 69.347 | 4.280 | 0.005 | 0.000 | 2.707 | 0.859 | 1.609 | 0.061 | n/a | 0.371 | 59.390 | n/a | n/a | 0.065 | 6.991 | 0.101 | 0.065 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 1.330ms; driver.publication 1.285ms; driver.publication 1.267ms; driver.publication 1.124ms |
| cceaf0dccd4dc0090000000000001920 | 67.532 | 2.552 | 0.005 | 0.000 | 43.831 | 0.899 | 1.187 | 0.029 | n/a | 0.437 | 18.554 | n/a | n/a | 0.038 | 46.388 | 0.687 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 3.968ms; driver.publication 3.283ms; driver.publication 3.280ms; driver.publication 1.796ms; driver.publication 1.424ms |
| cceaf0dccd4dc009000000000000128d | 65.151 | 4.437 | 0.008 | 0.000 | 0.360 | 6.168 | 1.031 | 0.031 | n/a | 0.312 | 52.754 | n/a | n/a | 0.051 | 4.804 | 0.074 | 0.051 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 2.109ms; driver.publication 1.259ms; driver.expected-state.bind-receipt 1.250ms; driver.publication 1.085ms |
| cceaf0dccd4dc00900000000000009d9 | 64.975 | 4.749 | 0.003 | 0.000 | 3.202 | 3.858 | 5.271 | 1.111 | n/a | 0.467 | 46.285 | n/a | n/a | 0.028 | 7.954 | 0.122 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.478ms; driver.publication 1.356ms; driver.publication 1.255ms |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.278 | 0.000 | 0.000 | 0.476 | 6.262 | 2.242 | 0.000 | 0.049 | 5.087 | 17.275 | 0.032 | n/a | 0.155 | 16.133 | n/a | n/a | 0.044 | 8.552 | 0.181 | 0.044 |
| p99 | 47.278 | 0.000 | 0.000 | 0.476 | 6.262 | 2.242 | 0.000 | 0.049 | 5.087 | 17.275 | 0.032 | n/a | 0.155 | 16.133 | n/a | n/a | 0.044 | 8.552 | 0.181 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cceaf0dccd4dc0090000000000000971 | 47.278 | 6.262 | 2.242 | 0.000 | 0.049 | 5.087 | 17.275 | 0.032 | n/a | 0.155 | 16.133 | n/a | n/a | 0.044 | 8.552 | 0.181 | 0.044 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 3.363ms; driver.publication 2.676ms; driver.publication 1.989ms; driver.publication 1.575ms; driver.publication 1.247ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.755 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 200.722 | 0.018 | n/a | 0.072 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 |
| p99 | 203.042 | n/a | n/a | n/a | 23.020 | n/a | 1.583 | 0.000 | 13.225 | 201.484 | 0.151 | n/a | 0.211 | 0.000 | n/a | n/a | 45.666 | 23.020 | 0.294 | 45.666 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a176070d62de2f90000000000000006 | 203.042 | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 201.484 | 0.044 | n/a | 0.211 | 0.000 | n/a | n/a | 0.421 | 0.000 | 0.000 | 0.421 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000005 | 202.673 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 201.484 | 0.023 | n/a | 0.136 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000007 | 202.231 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 201.044 | 0.012 | n/a | 0.146 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000f0b | 201.798 | 0.000 | n/a | 0.000 | 0.000 | 0.285 | 201.288 | 0.025 | n/a | 0.115 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000f0d | 201.781 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 200.722 | 0.018 | n/a | 0.072 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000f0e | 201.755 | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 200.995 | 0.013 | n/a | 0.058 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000f0c | 201.471 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 200.714 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e30000000000000002 | 175.394 | 2.841 | n/a | 0.000 | 0.000 | 1.063 | 170.847 | 0.151 | n/a | 0.194 | 0.000 | n/a | n/a | 0.299 | 2.841 | 0.016 | 0.299 | gw-r/thread-46/gateway.admitted-work | none observed |
| 7a176070d62de2f90000000000000f12 | 91.568 | 21.163 | n/a | 0.000 | 0.000 | 3.450 | 66.584 | 0.022 | n/a | 0.008 | 0.000 | n/a | n/a | 0.341 | 21.163 | 0.231 | 0.341 | gw-r/thread-45/gateway.admitted-work | none observed |
| 7a176070d62de2f90000000000000f11 | 89.055 | 23.020 | n/a | 0.000 | 0.000 | 13.225 | 52.647 | 0.008 | n/a | 0.007 | 0.000 | n/a | n/a | 0.148 | 23.020 | 0.258 | 0.148 | gw-r/thread-45/gateway.admitted-work | none observed |
| 7a176070d62de2f90000000000000f13 | 71.918 | 19.593 | n/a | 1.583 | 0.000 | 5.076 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.666 | 21.177 | 0.294 | 45.666 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 821.590 | n/a | n/a | n/a | 6.921 | n/a | 0.000 | 0.000 | 0.516 | 807.950 | 0.011 | n/a | 0.473 | 0.000 | n/a | n/a | 1.224 | 6.921 | 0.013 | 1.224 |
| p99 | 1004.231 | n/a | n/a | n/a | 10.828 | n/a | 0.000 | 0.000 | 1.205 | 1001.126 | 0.049 | n/a | 1.951 | 0.000 | n/a | n/a | 8.135 | 10.828 | 0.450 | 8.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d64728e968304e300000000000000a4 | 1004.231 | 0.193 | n/a | 0.000 | 0.000 | 1.205 | 1001.126 | 0.011 | n/a | 0.473 | 0.000 | n/a | n/a | 1.224 | 0.193 | 0.000 | 1.224 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000a5 | 821.590 | 10.828 | n/a | 0.000 | 0.000 | 0.516 | 807.950 | 0.049 | n/a | 1.951 | 0.000 | n/a | n/a | 0.295 | 10.828 | 0.013 | 0.295 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e30000000000000827 | 15.387 | 6.921 | n/a | 0.000 | 0.000 | 0.331 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.135 | 6.921 | 0.450 | 8.135 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 428.482 | n/a | n/a | n/a | 3.001 | n/a | 0.000 | 0.000 | 0.854 | 419.385 | 0.023 | n/a | 0.107 | 0.000 | n/a | n/a | 0.103 | 3.001 | 0.008 | 0.103 |
| p99 | 1072.924 | n/a | n/a | n/a | 14.367 | n/a | 0.889 | 0.000 | 55.919 | 1001.257 | 0.931 | n/a | 1.964 | 0.000 | n/a | n/a | 27.721 | 15.256 | 0.189 | 27.721 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d64728e968304e300000000000000cf | 1072.924 | 14.367 | n/a | 0.889 | 0.000 | 55.919 | 1001.257 | 0.212 | n/a | 0.075 | 0.000 | n/a | n/a | 0.205 | 15.256 | 0.014 | 0.205 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000000ba | 1002.664 | 3.457 | n/a | 0.000 | 0.000 | 0.874 | 997.440 | 0.658 | n/a | 0.136 | 0.000 | n/a | n/a | 0.099 | 3.457 | 0.003 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e300000000000000b4 | 1000.561 | 7.043 | n/a | 0.000 | 0.000 | 0.995 | 991.998 | 0.202 | n/a | 0.111 | 0.000 | n/a | n/a | 0.212 | 7.043 | 0.007 | 0.212 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e300000000000000bb | 998.507 | 3.908 | n/a | 0.000 | 0.000 | 1.106 | 993.095 | 0.023 | n/a | 0.282 | 0.000 | n/a | n/a | 0.092 | 3.908 | 0.004 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000ae | 949.813 | 3.893 | n/a | 0.000 | 0.000 | 1.003 | 944.582 | 0.011 | n/a | 0.125 | 0.000 | n/a | n/a | 0.200 | 3.893 | 0.004 | 0.200 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000ab | 778.853 | 2.610 | n/a | 0.000 | 0.000 | 5.315 | 770.693 | 0.017 | n/a | 0.107 | 0.000 | n/a | n/a | 0.111 | 2.610 | 0.003 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000000a8 | 734.432 | 2.443 | n/a | 0.000 | 0.000 | 0.761 | 731.012 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.121 | 2.443 | 0.003 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e300000000000000c1 | 727.386 | 6.426 | n/a | 0.000 | 0.000 | 1.298 | 719.353 | 0.032 | n/a | 0.155 | 0.000 | n/a | n/a | 0.121 | 6.426 | 0.009 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000000b2 | 709.997 | 2.961 | n/a | 0.000 | 0.000 | 2.303 | 704.341 | 0.227 | n/a | 0.079 | 0.000 | n/a | n/a | 0.085 | 2.961 | 0.004 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e300000000000000c9 | 674.688 | 2.436 | n/a | 0.000 | 0.000 | 0.854 | 671.048 | 0.049 | n/a | 0.213 | 0.000 | n/a | n/a | 0.088 | 2.436 | 0.004 | 0.088 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e300000000000000c0 | 649.048 | 2.807 | n/a | 0.000 | 0.000 | 0.604 | 645.451 | 0.014 | n/a | 0.072 | 0.000 | n/a | n/a | 0.101 | 2.807 | 0.004 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000c5 | 643.883 | 4.931 | n/a | 0.000 | 0.000 | 0.696 | 637.960 | 0.035 | n/a | 0.169 | 0.000 | n/a | n/a | 0.092 | 4.931 | 0.008 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000ca | 596.055 | 3.553 | n/a | 0.000 | 0.000 | 0.715 | 591.531 | 0.014 | n/a | 0.096 | 0.000 | n/a | n/a | 0.145 | 3.553 | 0.006 | 0.145 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e300000000000000a7 | 455.417 | 2.551 | n/a | 0.000 | 0.000 | 0.850 | 451.770 | 0.021 | n/a | 0.103 | 0.000 | n/a | n/a | 0.122 | 2.551 | 0.006 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000b6 | 428.482 | 5.628 | n/a | 0.000 | 0.000 | 1.269 | 419.385 | 0.021 | n/a | 1.964 | 0.000 | n/a | n/a | 0.215 | 5.628 | 0.013 | 0.215 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000b8 | 387.594 | 4.870 | n/a | 0.000 | 0.000 | 0.986 | 381.447 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.199 | 4.870 | 0.013 | 0.199 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e300000000000000c4 | 318.532 | 1.950 | n/a | 0.000 | 0.000 | 0.807 | 315.599 | 0.021 | n/a | 0.081 | 0.000 | n/a | n/a | 0.074 | 1.950 | 0.006 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000000c2 | 315.791 | 2.761 | n/a | 0.000 | 0.000 | 0.975 | 311.837 | 0.019 | n/a | 0.129 | 0.000 | n/a | n/a | 0.071 | 2.761 | 0.009 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000c7 | 312.183 | 2.426 | n/a | 0.000 | 0.000 | 0.661 | 307.924 | 0.931 | n/a | 0.137 | 0.000 | n/a | n/a | 0.103 | 2.426 | 0.008 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e300000000000000b1 | 291.886 | 7.067 | n/a | 0.000 | 0.000 | 1.390 | 282.934 | 0.264 | n/a | 0.074 | 0.000 | n/a | n/a | 0.156 | 7.067 | 0.024 | 0.156 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 443.530 | n/a | n/a | n/a | 4.387 | n/a | 0.554 | 0.000 | 0.836 | 437.889 | 0.019 | n/a | 0.081 | 0.000 | n/a | n/a | 0.123 | 5.034 | 0.012 | 0.123 |
| p99 | 1012.004 | n/a | n/a | n/a | 16.443 | n/a | 2.130 | 0.000 | 2.816 | 1005.284 | 2.276 | n/a | 0.258 | 0.000 | n/a | n/a | 38.621 | 18.573 | 0.242 | 38.621 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d64728e968304e300000000000000dd | 1012.004 | 5.084 | n/a | 0.554 | 0.000 | 0.538 | 1005.284 | 0.059 | n/a | 0.258 | 0.000 | n/a | n/a | 0.227 | 5.638 | 0.006 | 0.227 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e300000000000000d1 | 1008.390 | 6.202 | n/a | 1.062 | 0.000 | 0.949 | 999.889 | 0.016 | n/a | 0.087 | 0.000 | n/a | n/a | 0.186 | 7.264 | 0.007 | 0.186 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e300000000000000ff | 1005.594 | 6.912 | n/a | 0.000 | 0.000 | 0.772 | 997.621 | 0.029 | n/a | 0.079 | 0.000 | n/a | n/a | 0.182 | 6.912 | 0.007 | 0.182 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e3000000000000010b | 1000.931 | 3.641 | n/a | 0.000 | 0.000 | 2.816 | 994.333 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.070 | 3.641 | 0.004 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000000dc | 993.311 | 3.164 | n/a | 0.545 | 0.000 | 0.804 | 988.472 | 0.182 | n/a | 0.069 | 0.000 | n/a | n/a | 0.076 | 3.708 | 0.004 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e30000000000000103 | 990.911 | 5.017 | n/a | 1.320 | 0.000 | 1.293 | 982.883 | 0.185 | n/a | 0.085 | 0.000 | n/a | n/a | 0.128 | 6.337 | 0.006 | 0.128 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e300000000000000d7 | 984.341 | 6.094 | n/a | 1.069 | 0.000 | 0.956 | 975.913 | 0.041 | n/a | 0.128 | 0.000 | n/a | n/a | 0.140 | 7.163 | 0.007 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000000d8 | 983.652 | 7.323 | n/a | 0.650 | 0.000 | 0.702 | 974.730 | 0.018 | n/a | 0.087 | 0.000 | n/a | n/a | 0.140 | 7.974 | 0.008 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000000fc | 942.339 | 6.519 | n/a | 0.918 | 0.000 | 0.978 | 933.424 | 0.270 | n/a | 0.064 | 0.000 | n/a | n/a | 0.166 | 7.438 | 0.008 | 0.166 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000d0 | 930.267 | 4.026 | n/a | 1.117 | 0.000 | 2.049 | 922.472 | 0.340 | n/a | 0.124 | 0.000 | n/a | n/a | 0.139 | 5.143 | 0.006 | 0.139 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000000e2 | 857.432 | 3.359 | n/a | 0.544 | 0.000 | 0.794 | 852.339 | 0.211 | n/a | 0.096 | 0.000 | n/a | n/a | 0.088 | 3.903 | 0.005 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e300000000000000de | 748.394 | 6.882 | n/a | 1.114 | 0.000 | 0.881 | 739.322 | 0.020 | n/a | 0.063 | 0.000 | n/a | n/a | 0.113 | 7.995 | 0.011 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000000100 | 731.510 | 2.939 | n/a | 0.604 | 0.000 | 1.098 | 726.673 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.103 | 3.543 | 0.005 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e300000000000000e6 | 627.329 | 16.443 | n/a | 2.130 | 0.000 | 1.615 | 606.628 | 0.062 | n/a | 0.139 | 0.000 | n/a | n/a | 0.313 | 18.573 | 0.030 | 0.313 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e300000000000000e9 | 615.674 | 6.950 | n/a | 0.000 | 0.000 | 1.020 | 607.312 | 0.022 | n/a | 0.152 | 0.000 | n/a | n/a | 0.218 | 6.950 | 0.011 | 0.218 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000000f9 | 529.297 | 4.387 | n/a | 0.000 | 0.000 | 2.105 | 522.444 | 0.191 | n/a | 0.055 | 0.000 | n/a | n/a | 0.115 | 4.387 | 0.008 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e30000000000000105 | 524.689 | 10.139 | n/a | 0.726 | 0.000 | 0.740 | 512.816 | 0.014 | n/a | 0.130 | 0.000 | n/a | n/a | 0.123 | 10.866 | 0.021 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e300000000000000db | 519.482 | 4.513 | n/a | 0.500 | 0.000 | 1.261 | 512.808 | 0.201 | n/a | 0.105 | 0.000 | n/a | n/a | 0.094 | 5.013 | 0.010 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e300000000000000d9 | 497.802 | 6.473 | n/a | 0.847 | 0.000 | 1.841 | 486.112 | 2.276 | n/a | 0.108 | 0.000 | n/a | n/a | 0.145 | 7.320 | 0.015 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000000fa | 454.645 | 4.160 | n/a | 0.000 | 0.000 | 0.789 | 449.370 | 0.156 | n/a | 0.092 | 0.000 | n/a | n/a | 0.078 | 4.160 | 0.009 | 0.078 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 438.069 | n/a | n/a | n/a | 4.127 | n/a | 0.000 | 0.000 | 0.727 | 433.172 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.143 | 4.207 | 0.011 | 0.143 |
| p99 | 1006.327 | n/a | n/a | n/a | 11.223 | n/a | 1.313 | 0.000 | 22.607 | 1000.837 | 0.529 | n/a | 0.159 | 0.000 | n/a | n/a | 49.846 | 11.967 | 0.143 | 49.846 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d64728e968304e30000000000000127 | 1006.327 | 7.357 | n/a | 1.119 | 0.000 | 0.796 | 996.743 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.214 | 8.476 | 0.008 | 0.214 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e30000000000000135 | 1004.708 | 4.120 | n/a | 1.297 | 0.000 | 1.063 | 997.827 | 0.131 | n/a | 0.069 | 0.000 | n/a | n/a | 0.200 | 5.418 | 0.005 | 0.200 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e30000000000000128 | 1002.976 | 0.208 | n/a | 0.000 | 0.000 | 0.704 | 1000.837 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 1.148 | 0.208 | 0.000 | 1.148 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e3000000000000013e | 996.998 | 3.148 | n/a | 0.000 | 0.000 | 2.567 | 990.755 | 0.344 | n/a | 0.063 | 0.000 | n/a | n/a | 0.120 | 3.148 | 0.003 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e3000000000000011a | 994.328 | 3.180 | n/a | 0.651 | 0.000 | 0.771 | 989.555 | 0.016 | n/a | 0.073 | 0.000 | n/a | n/a | 0.082 | 3.831 | 0.004 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000000112 | 988.155 | 5.362 | n/a | 0.666 | 0.000 | 0.887 | 981.034 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.146 | 6.028 | 0.006 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000000123 | 964.265 | 3.260 | n/a | 0.909 | 0.000 | 1.139 | 958.724 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.174 | 4.169 | 0.004 | 0.174 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000000145 | 793.103 | 5.101 | n/a | 0.000 | 0.000 | 0.968 | 786.717 | 0.014 | n/a | 0.159 | 0.000 | n/a | n/a | 0.145 | 5.101 | 0.006 | 0.145 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000000121 | 770.776 | 3.146 | n/a | 0.000 | 0.000 | 22.607 | 744.886 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.077 | 3.146 | 0.004 | 0.077 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e3000000000000010f | 768.770 | 4.305 | n/a | 0.755 | 0.000 | 0.460 | 762.942 | 0.148 | n/a | 0.032 | 0.000 | n/a | n/a | 0.127 | 5.061 | 0.007 | 0.127 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e3000000000000013a | 767.813 | 3.794 | n/a | 0.000 | 0.000 | 0.954 | 762.714 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.260 | 3.794 | 0.005 | 0.260 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e30000000000000130 | 757.425 | 3.982 | n/a | 0.000 | 0.000 | 0.572 | 752.546 | 0.163 | n/a | 0.046 | 0.000 | n/a | n/a | 0.115 | 3.982 | 0.005 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e3000000000000012b | 695.575 | 6.893 | n/a | 0.000 | 0.000 | 0.734 | 687.605 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.273 | 6.893 | 0.010 | 0.273 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000000124 | 692.060 | 5.398 | n/a | 0.000 | 0.000 | 0.935 | 685.532 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.145 | 5.398 | 0.008 | 0.145 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e3000000000000011b | 681.108 | 2.794 | n/a | 0.000 | 0.000 | 0.448 | 677.744 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.080 | 2.794 | 0.004 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e3000000000000010c | 632.396 | 2.971 | n/a | 0.708 | 0.000 | 0.545 | 628.009 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.117 | 3.679 | 0.006 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e30000000000000132 | 627.990 | 2.669 | n/a | 0.000 | 0.000 | 0.769 | 624.374 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.113 | 2.669 | 0.004 | 0.113 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e3000000000000013f | 568.633 | 6.650 | n/a | 0.000 | 0.000 | 1.266 | 560.377 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.280 | 6.650 | 0.012 | 0.280 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e30000000000000136 | 491.383 | 9.587 | n/a | 0.000 | 0.000 | 1.417 | 480.171 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.136 | 9.587 | 0.020 | 0.136 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000000137 | 490.937 | 3.227 | n/a | 0.000 | 0.000 | 0.720 | 486.817 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.102 | 3.227 | 0.007 | 0.102 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 374.294 | n/a | n/a | n/a | 3.083 | n/a | 0.000 | 0.000 | 0.682 | 371.042 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.103 | 3.083 | 0.008 | 0.103 |
| p99 | 1003.735 | n/a | n/a | n/a | 9.710 | n/a | 4.197 | 0.000 | 3.386 | 1000.718 | 0.702 | n/a | 0.105 | 0.000 | n/a | n/a | 27.111 | 10.780 | 0.381 | 27.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d64728e968304e30000000000000180 | 1003.735 | 0.119 | n/a | 0.000 | 0.000 | 1.726 | 1000.718 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 1.117 | 0.119 | 0.000 | 1.117 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e3000000000000016f | 1003.556 | 2.559 | n/a | 0.000 | 0.000 | 0.736 | 999.882 | 0.218 | n/a | 0.070 | 0.000 | n/a | n/a | 0.092 | 2.559 | 0.003 | 0.092 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e30000000000000161 | 1001.538 | 2.523 | n/a | 0.000 | 0.000 | 0.606 | 998.276 | 0.019 | n/a | 0.037 | 0.000 | n/a | n/a | 0.078 | 2.523 | 0.003 | 0.078 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000000179 | 999.624 | 2.542 | n/a | 0.000 | 0.000 | 0.766 | 996.184 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.076 | 2.542 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e3000000000000016a | 996.418 | 4.577 | n/a | 0.000 | 0.000 | 0.575 | 991.019 | 0.115 | n/a | 0.057 | 0.000 | n/a | n/a | 0.076 | 4.577 | 0.005 | 0.076 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000000151 | 992.612 | 2.916 | n/a | 0.000 | 0.000 | 0.769 | 988.734 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.139 | 2.916 | 0.003 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e3000000000000017f | 964.823 | 2.460 | n/a | 0.000 | 0.000 | 0.580 | 961.533 | 0.137 | n/a | 0.055 | 0.000 | n/a | n/a | 0.058 | 2.460 | 0.003 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e30000000000000174 | 844.491 | 2.787 | n/a | 0.000 | 0.000 | 0.903 | 840.590 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.097 | 2.787 | 0.003 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e30000000000000157 | 824.041 | 5.521 | n/a | 0.000 | 0.000 | 0.568 | 816.977 | 0.702 | n/a | 0.080 | 0.000 | n/a | n/a | 0.192 | 5.521 | 0.007 | 0.192 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e3000000000000017d | 718.278 | 2.334 | n/a | 0.000 | 0.000 | 0.766 | 715.032 | 0.015 | n/a | 0.062 | 0.000 | n/a | n/a | 0.069 | 2.334 | 0.003 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000000169 | 693.318 | 4.160 | n/a | 0.000 | 0.000 | 0.604 | 688.439 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.078 | 4.160 | 0.006 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e30000000000000152 | 683.448 | 3.527 | n/a | 0.000 | 0.000 | 0.654 | 679.137 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.081 | 3.527 | 0.005 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e30000000000000171 | 653.401 | 2.850 | n/a | 0.000 | 0.000 | 0.528 | 649.884 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.092 | 2.850 | 0.004 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e30000000000000183 | 639.449 | 3.652 | n/a | 0.000 | 0.000 | 0.806 | 634.719 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.226 | 3.652 | 0.006 | 0.226 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e3000000000000016c | 634.286 | 4.934 | n/a | 0.000 | 0.000 | 0.754 | 628.263 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.269 | 4.934 | 0.008 | 0.269 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000000177 | 632.108 | 4.904 | n/a | 0.000 | 0.000 | 0.467 | 626.545 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.142 | 4.904 | 0.008 | 0.142 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e3000000000000014c | 542.218 | 2.575 | n/a | 0.000 | 0.000 | 0.746 | 538.727 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.106 | 2.575 | 0.005 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000000163 | 512.870 | 4.720 | n/a | 0.000 | 0.000 | 0.782 | 507.217 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.108 | 4.720 | 0.009 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000000162 | 493.871 | 9.710 | n/a | 1.070 | 0.000 | 0.602 | 482.121 | 0.143 | n/a | 0.039 | 0.000 | n/a | n/a | 0.186 | 10.780 | 0.022 | 0.186 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e3000000000000014f | 440.130 | 6.519 | n/a | 0.000 | 0.000 | 0.750 | 432.602 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.206 | 6.519 | 0.015 | 0.206 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 316.734 | n/a | n/a | n/a | 3.368 | n/a | 0.000 | 0.000 | 0.608 | 310.053 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.103 | 3.615 | 0.014 | 0.103 |
| p99 | 1006.081 | n/a | n/a | n/a | 9.791 | n/a | 1.721 | 0.000 | 3.977 | 1000.808 | 0.423 | n/a | 0.077 | 0.000 | n/a | n/a | 21.972 | 10.778 | 0.435 | 21.972 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d64728e968304e300000000000001bd | 1006.081 | 0.111 | n/a | 0.000 | 0.000 | 3.977 | 1000.808 | 0.016 | n/a | 0.060 | 0.000 | n/a | n/a | 1.110 | 0.111 | 0.000 | 1.110 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e30000000000000185 | 1004.895 | 2.651 | n/a | 1.721 | 0.000 | 0.704 | 999.522 | 0.127 | n/a | 0.050 | 0.000 | n/a | n/a | 0.120 | 4.372 | 0.004 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000001a1 | 1001.239 | 2.692 | n/a | 0.000 | 0.000 | 0.775 | 997.538 | 0.128 | n/a | 0.030 | 0.000 | n/a | n/a | 0.075 | 2.692 | 0.003 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e300000000000001bf | 991.782 | 4.622 | n/a | 0.000 | 0.000 | 0.493 | 986.514 | 0.020 | n/a | 0.059 | 0.000 | n/a | n/a | 0.074 | 4.622 | 0.005 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000001a0 | 989.986 | 3.022 | n/a | 0.714 | 0.000 | 0.616 | 985.491 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.100 | 3.736 | 0.004 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000000194 | 985.596 | 2.228 | n/a | 0.000 | 0.000 | 0.450 | 982.333 | 0.423 | n/a | 0.039 | 0.000 | n/a | n/a | 0.124 | 2.228 | 0.002 | 0.124 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e3000000000000019e | 981.694 | 2.472 | n/a | 0.000 | 0.000 | 0.646 | 978.421 | 0.005 | n/a | 0.077 | 0.000 | n/a | n/a | 0.074 | 2.472 | 0.003 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000001bb | 850.668 | 3.968 | n/a | 0.000 | 0.000 | 0.740 | 845.835 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.075 | 3.968 | 0.005 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e30000000000000197 | 819.564 | 4.769 | n/a | 0.000 | 0.000 | 0.899 | 813.772 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.082 | 4.769 | 0.006 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e300000000000001cf | 718.164 | 2.283 | n/a | 0.000 | 0.000 | 0.468 | 715.188 | 0.090 | n/a | 0.049 | 0.000 | n/a | n/a | 0.086 | 2.283 | 0.003 | 0.086 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e300000000000001af | 713.835 | 2.813 | n/a | 0.000 | 0.000 | 0.995 | 709.901 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.069 | 2.813 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000001c8 | 626.394 | 2.627 | n/a | 0.000 | 0.000 | 0.550 | 623.010 | 0.107 | n/a | 0.026 | 0.000 | n/a | n/a | 0.073 | 2.627 | 0.004 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000001b2 | 595.472 | 4.088 | n/a | 0.000 | 0.000 | 0.873 | 590.369 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.075 | 4.088 | 0.007 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e3000000000000019a | 585.885 | 6.744 | n/a | 0.777 | 0.000 | 0.811 | 577.376 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.145 | 7.521 | 0.013 | 0.145 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e300000000000001c0 | 550.363 | 3.997 | n/a | 0.000 | 0.000 | 0.578 | 545.635 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.103 | 3.997 | 0.007 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000001cb | 540.267 | 2.660 | n/a | 0.000 | 0.000 | 0.557 | 536.787 | 0.126 | n/a | 0.033 | 0.000 | n/a | n/a | 0.104 | 2.660 | 0.005 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e300000000000001a2 | 533.503 | 3.461 | n/a | 0.000 | 0.000 | 0.472 | 529.409 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.108 | 3.461 | 0.006 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e30000000000000193 | 522.055 | 2.938 | n/a | 0.000 | 0.000 | 0.657 | 518.187 | 0.145 | n/a | 0.040 | 0.000 | n/a | n/a | 0.087 | 2.938 | 0.006 | 0.087 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e300000000000001a9 | 519.202 | 4.429 | n/a | 0.661 | 0.000 | 0.566 | 513.363 | 0.021 | n/a | 0.044 | 0.000 | n/a | n/a | 0.118 | 5.090 | 0.010 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e3000000000000019b | 431.179 | 2.985 | n/a | 0.000 | 0.000 | 0.392 | 427.677 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.069 | 2.985 | 0.007 | 0.069 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 426.481 | n/a | n/a | n/a | 3.407 | n/a | 0.000 | 0.000 | 0.678 | 423.278 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.089 | 3.407 | 0.008 | 0.089 |
| p99 | 1006.910 | n/a | n/a | n/a | 13.447 | n/a | 0.000 | 0.000 | 4.827 | 1003.734 | 0.929 | n/a | 0.069 | 0.000 | n/a | n/a | 30.069 | 13.447 | 0.556 | 30.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d64728e968304e300000000000001e4 | 1006.910 | 2.564 | n/a | 0.000 | 0.000 | 0.458 | 1003.734 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 0.089 | 2.564 | 0.003 | 0.089 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000000211 | 1002.980 | 0.174 | n/a | 0.000 | 0.000 | 0.680 | 1000.932 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 1.124 | 0.174 | 0.000 | 1.124 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000001f8 | 1002.487 | 0.125 | n/a | 0.000 | 0.000 | 0.509 | 1000.679 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 1.113 | 0.125 | 0.000 | 1.113 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e3000000000000020c | 1002.071 | 5.976 | n/a | 0.000 | 0.000 | 4.827 | 991.009 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.181 | 5.976 | 0.006 | 0.181 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000000210 | 996.655 | 2.857 | n/a | 0.000 | 0.000 | 0.431 | 993.242 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.077 | 2.857 | 0.003 | 0.077 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000000213 | 991.305 | 3.621 | n/a | 0.000 | 0.000 | 3.227 | 984.264 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.136 | 3.621 | 0.004 | 0.136 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e3000000000000020d | 966.321 | 13.447 | n/a | 0.000 | 0.000 | 0.726 | 951.872 | 0.026 | n/a | 0.036 | 0.000 | n/a | n/a | 0.213 | 13.447 | 0.014 | 0.213 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000000202 | 943.358 | 3.382 | n/a | 0.000 | 0.000 | 2.034 | 937.802 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.081 | 3.382 | 0.004 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000001f1 | 892.046 | 5.536 | n/a | 0.000 | 0.000 | 0.649 | 885.611 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.217 | 5.536 | 0.006 | 0.217 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e300000000000001ee | 761.521 | 3.802 | n/a | 0.000 | 0.000 | 0.635 | 756.033 | 0.929 | n/a | 0.034 | 0.000 | n/a | n/a | 0.087 | 3.802 | 0.005 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e300000000000001e2 | 730.023 | 5.963 | n/a | 0.000 | 0.000 | 1.260 | 722.420 | 0.115 | n/a | 0.032 | 0.000 | n/a | n/a | 0.232 | 5.963 | 0.008 | 0.232 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e300000000000001fa | 729.712 | 2.410 | n/a | 0.000 | 0.000 | 0.643 | 726.406 | 0.113 | n/a | 0.036 | 0.000 | n/a | n/a | 0.105 | 2.410 | 0.003 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e300000000000001fd | 678.658 | 2.435 | n/a | 0.000 | 0.000 | 0.678 | 675.433 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.085 | 2.435 | 0.004 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e300000000000001d7 | 652.662 | 3.157 | n/a | 0.000 | 0.000 | 0.689 | 648.657 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.095 | 3.157 | 0.005 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e300000000000001ea | 644.998 | 3.407 | n/a | 0.000 | 0.000 | 0.783 | 640.685 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.066 | 3.407 | 0.005 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000001d4 | 558.308 | 2.658 | n/a | 0.000 | 0.000 | 0.875 | 554.635 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.062 | 2.658 | 0.005 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e3000000000000020a | 556.335 | 2.737 | n/a | 0.000 | 0.000 | 0.530 | 552.942 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.074 | 2.737 | 0.005 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e300000000000001e8 | 542.849 | 2.544 | n/a | 0.000 | 0.000 | 0.533 | 539.637 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.084 | 2.544 | 0.005 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e300000000000001db | 473.633 | 4.959 | n/a | 0.000 | 0.000 | 0.573 | 467.744 | 0.227 | n/a | 0.047 | 0.000 | n/a | n/a | 0.082 | 4.959 | 0.010 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e300000000000001f3 | 462.299 | 3.489 | n/a | 0.000 | 0.000 | 0.863 | 457.822 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.086 | 3.489 | 0.008 | 0.086 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (749 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.168 | n/a | n/a | n/a | 3.315 | n/a | 0.000 | 0.000 | 0.270 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.558 | 3.315 | 0.274 | 7.558 |
| p99 | 182.418 | n/a | n/a | n/a | 16.565 | n/a | 1.316 | 0.000 | 1.043 | 178.749 | 0.186 | n/a | 0.054 | 0.000 | n/a | n/a | 47.132 | 17.629 | 0.837 | 47.132 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d64728e968304e3000000000000021f | 1005.423 | 0.118 | n/a | 0.000 | 0.000 | 2.695 | 1001.356 | 0.018 | n/a | 0.132 | 0.000 | n/a | n/a | 1.104 | 0.118 | 0.000 | 1.104 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000000214 | 796.127 | 3.768 | n/a | 0.000 | 0.000 | 1.057 | 791.137 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.090 | 3.768 | 0.005 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e30000000000000221 | 751.932 | 12.958 | n/a | 0.000 | 0.000 | 0.748 | 738.049 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.122 | 12.958 | 0.017 | 0.122 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e3000000000000021c | 685.723 | 2.171 | n/a | 0.000 | 0.000 | 0.579 | 682.842 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.086 | 2.171 | 0.003 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e30000000000000217 | 657.216 | 2.363 | n/a | 0.000 | 0.000 | 0.531 | 654.208 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.068 | 2.363 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e3000000000000021d | 319.113 | 3.700 | n/a | 0.000 | 0.000 | 0.891 | 314.103 | 0.274 | n/a | 0.054 | 0.000 | n/a | n/a | 0.091 | 3.700 | 0.012 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e30000000000000218 | 250.311 | 2.469 | n/a | 0.000 | 0.000 | 0.470 | 247.211 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.094 | 2.469 | 0.010 | 0.094 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000000215 | 182.418 | 2.938 | n/a | 0.000 | 0.000 | 0.594 | 178.749 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.079 | 2.938 | 0.016 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e300000000000004e3 | 120.128 | 13.661 | n/a | 1.748 | 0.000 | 0.940 | 101.863 | 0.005 | n/a | 0.080 | 0.000 | n/a | n/a | 1.831 | 15.410 | 0.128 | 1.831 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e300000000000005df | 108.985 | 4.794 | n/a | 0.000 | 0.000 | 0.345 | 103.536 | 0.186 | n/a | 0.042 | 0.000 | n/a | n/a | 0.082 | 4.794 | 0.044 | 0.082 | gw-r/thread-67/journal/page | none observed |
| 7d64728e968304e3000000000000021a | 105.063 | 2.824 | n/a | 0.000 | 0.000 | 0.546 | 101.536 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.112 | 2.824 | 0.027 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e3000000000000030b | 104.638 | 2.450 | n/a | 0.000 | 0.000 | 0.362 | 101.680 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.085 | 2.450 | 0.023 | 0.085 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000002ef | 99.180 | 8.959 | n/a | 2.123 | 0.000 | 6.654 | 81.212 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.180 | 11.082 | 0.112 | 0.180 | gw-r/thread-48/journal/page | none observed |
| 7d64728e968304e3000000000000065b | 92.530 | 4.501 | n/a | 0.000 | 0.000 | 0.971 | 86.937 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.090 | 4.501 | 0.049 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000000749 | 86.578 | 3.159 | n/a | 0.000 | 0.000 | 0.316 | 83.000 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.076 | 3.159 | 0.036 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e3000000000000078e | 85.783 | 4.907 | n/a | 0.000 | 0.000 | 0.759 | 79.878 | 0.084 | n/a | 0.021 | 0.000 | n/a | n/a | 0.134 | 4.907 | 0.057 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e300000000000005c8 | 79.807 | 9.429 | n/a | 0.000 | 0.000 | 0.902 | 66.705 | 2.478 | n/a | 0.108 | 0.000 | n/a | n/a | 0.185 | 9.429 | 0.118 | 0.185 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e3000000000000077c | 78.308 | 8.846 | n/a | 0.721 | 0.000 | 0.757 | 67.764 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.174 | 9.568 | 0.122 | 0.174 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000000812 | 77.726 | 6.915 | n/a | 0.000 | 0.000 | 0.537 | 69.822 | 0.132 | n/a | 0.028 | 0.000 | n/a | n/a | 0.293 | 6.915 | 0.089 | 0.293 | gw-r/thread-67/journal/page | none observed |
| 7d64728e968304e300000000000004ec | 77.343 | 2.141 | n/a | 0.000 | 0.000 | 1.191 | 73.887 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.094 | 2.141 | 0.028 | 0.094 | gw-r/thread-67/journal/page | none observed |

## P3 / tail / internal (2263 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.930 | n/a | n/a | n/a | 4.247 | n/a | 0.000 | 0.000 | 0.253 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.242 | 4.285 | 0.351 | 6.242 |
| p99 | 343.262 | n/a | n/a | n/a | 20.341 | n/a | 2.006 | 0.000 | 1.065 | 340.638 | 0.112 | n/a | 0.032 | 0.000 | n/a | n/a | 46.762 | 21.708 | 0.840 | 46.762 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7d64728e968304e30000000000001a6a | 1005.438 | 0.177 | n/a | 0.000 | 0.000 | 3.106 | 1000.783 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 1.305 | 0.177 | 0.000 | 1.305 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000001aaf | 1004.152 | 4.595 | n/a | 0.000 | 0.000 | 0.321 | 999.103 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.102 | 4.595 | 0.005 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000001ab7 | 1002.498 | 0.103 | n/a | 0.000 | 0.000 | 0.441 | 1000.763 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 1.112 | 0.103 | 0.000 | 1.112 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e30000000000001a8d | 1002.450 | 0.139 | n/a | 0.000 | 0.000 | 0.489 | 1000.676 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 1.103 | 0.139 | 0.000 | 1.103 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000001a69 | 1000.749 | 2.658 | n/a | 0.000 | 0.000 | 0.363 | 996.827 | 0.812 | n/a | 0.037 | 0.000 | n/a | n/a | 0.052 | 2.658 | 0.003 | 0.052 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e30000000000001ab3 | 996.296 | 2.838 | n/a | 0.000 | 0.000 | 0.329 | 992.926 | 0.112 | n/a | 0.032 | 0.000 | n/a | n/a | 0.060 | 2.838 | 0.003 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 7d64728e968304e30000000000001a74 | 979.966 | 4.103 | n/a | 0.000 | 0.000 | 0.281 | 975.462 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.085 | 4.103 | 0.004 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000001a7e | 880.868 | 6.769 | n/a | 0.000 | 0.000 | 0.624 | 873.285 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.158 | 6.769 | 0.008 | 0.158 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000001a91 | 866.200 | 2.732 | n/a | 0.000 | 0.000 | 0.642 | 862.731 | 0.011 | n/a | 0.024 | 0.000 | n/a | n/a | 0.060 | 2.732 | 0.003 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e30000000000001a6f | 860.518 | 5.528 | n/a | 0.000 | 0.000 | 0.712 | 854.139 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.092 | 5.528 | 0.006 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 7d64728e968304e30000000000001a6c | 750.562 | 9.819 | n/a | 0.000 | 0.000 | 0.500 | 739.851 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.345 | 9.819 | 0.013 | 0.345 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000001a89 | 711.652 | 2.144 | n/a | 0.000 | 0.000 | 0.409 | 708.901 | 0.092 | n/a | 0.022 | 0.000 | n/a | n/a | 0.083 | 2.144 | 0.003 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e30000000000001ab0 | 684.568 | 5.480 | n/a | 0.000 | 0.000 | 2.350 | 676.511 | 0.083 | n/a | 0.018 | 0.000 | n/a | n/a | 0.126 | 5.480 | 0.008 | 0.126 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000001a84 | 681.985 | 6.330 | n/a | 0.000 | 0.000 | 0.423 | 674.936 | 0.092 | n/a | 0.031 | 0.000 | n/a | n/a | 0.173 | 6.330 | 0.009 | 0.173 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000001aa8 | 595.972 | 3.249 | n/a | 0.000 | 0.000 | 0.512 | 592.087 | 0.012 | n/a | 0.045 | 0.000 | n/a | n/a | 0.067 | 3.249 | 0.005 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 7d64728e968304e30000000000001a9e | 526.026 | 4.441 | n/a | 0.000 | 0.000 | 0.349 | 521.064 | 0.104 | n/a | 0.020 | 0.000 | n/a | n/a | 0.049 | 4.441 | 0.008 | 0.049 | gw-r/thread-44/journal/page | none observed |
| 7d64728e968304e30000000000001a75 | 513.373 | 3.418 | n/a | 0.000 | 0.000 | 0.528 | 509.326 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 3.418 | 0.007 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 7d64728e968304e30000000000001aaa | 504.000 | 2.759 | n/a | 0.000 | 0.000 | 0.399 | 500.715 | 0.010 | n/a | 0.031 | 0.000 | n/a | n/a | 0.086 | 2.759 | 0.005 | 0.086 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000001a92 | 495.064 | 11.649 | n/a | 1.477 | 0.000 | 0.479 | 480.927 | 0.097 | n/a | 0.032 | 0.000 | n/a | n/a | 0.402 | 13.126 | 0.027 | 0.402 | gw-r/thread-42/journal/page | none observed |
| 7d64728e968304e30000000000001aab | 460.188 | 4.396 | n/a | 0.000 | 0.000 | 0.653 | 454.996 | 0.017 | n/a | 0.051 | 0.000 | n/a | n/a | 0.076 | 4.396 | 0.010 | 0.076 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.154 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 201.021 | 0.020 | n/a | 0.134 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 215.002 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.737 | 202.053 | 22.982 | n/a | 1.021 | 0.000 | n/a | n/a | 52.362 | 0.000 | 0.000 | 52.362 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a176070d62de2f90000000000000018 | 215.002 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 191.265 | 22.982 | n/a | 0.040 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f9000000000000004e | 204.721 | 0.000 | n/a | 0.000 | 0.000 | 2.737 | 201.587 | 0.023 | n/a | 0.167 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000030 | 203.601 | 0.000 | n/a | 0.000 | 0.000 | 1.385 | 201.720 | 0.025 | n/a | 0.238 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000009 | 203.576 | 0.000 | n/a | 0.000 | 0.000 | 1.476 | 201.428 | 0.101 | n/a | 0.254 | 0.000 | n/a | n/a | 0.317 | 0.000 | 0.000 | 0.317 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000028 | 203.347 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 202.053 | 0.077 | n/a | 0.273 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f9000000000000004d | 203.322 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 201.686 | 0.054 | n/a | 0.331 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000031 | 203.202 | 0.000 | n/a | 0.000 | 0.000 | 1.406 | 201.309 | 0.022 | n/a | 0.236 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000008 | 203.197 | 0.000 | n/a | 0.000 | 0.000 | 1.173 | 201.682 | 0.020 | n/a | 0.198 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000034 | 202.989 | 0.000 | n/a | 0.000 | 0.000 | 1.153 | 201.415 | 0.015 | n/a | 0.161 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f9000000000000000e | 202.906 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 201.583 | 0.036 | n/a | 0.200 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f9000000000000002f | 202.887 | 0.000 | n/a | 0.000 | 0.000 | 1.020 | 201.417 | 0.027 | n/a | 0.197 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f9000000000000004a | 202.834 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 201.657 | 0.049 | n/a | 0.188 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000021 | 202.772 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 201.323 | 0.015 | n/a | 0.182 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000023 | 202.745 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 201.507 | 0.047 | n/a | 0.187 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000051 | 202.740 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 201.240 | 0.017 | n/a | 0.160 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000026 | 202.738 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 201.287 | 0.023 | n/a | 0.176 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000032 | 202.601 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 201.341 | 0.017 | n/a | 0.147 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000043 | 202.555 | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 201.153 | 0.015 | n/a | 0.144 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000022 | 202.549 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 201.071 | 0.017 | n/a | 0.133 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000050 | 202.540 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 201.288 | 0.035 | n/a | 0.175 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-42/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.161 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 200.984 | 0.018 | n/a | 0.110 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 205.050 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.821 | 203.780 | 6.612 | n/a | 0.276 | 0.000 | n/a | n/a | 0.315 | 0.000 | 0.000 | 0.315 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a176070d62de2f90000000000000076 | 205.050 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 203.780 | 0.018 | n/a | 0.140 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000088 | 204.771 | 0.000 | n/a | 0.000 | 0.000 | 1.699 | 202.576 | 0.083 | n/a | 0.247 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000065 | 203.766 | 0.000 | n/a | 0.000 | 0.000 | 1.267 | 202.065 | 0.018 | n/a | 0.161 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f900000000000000bd | 203.328 | 0.000 | n/a | 0.000 | 0.000 | 2.118 | 200.963 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f9000000000000008a | 203.324 | 0.000 | n/a | 0.000 | 0.000 | 1.602 | 201.332 | 0.025 | n/a | 0.152 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000097 | 203.244 | 0.000 | n/a | 0.000 | 0.000 | 1.054 | 201.662 | 0.023 | n/a | 0.246 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000077 | 203.142 | 0.000 | n/a | 0.000 | 0.000 | 1.218 | 201.589 | 0.018 | n/a | 0.140 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000087 | 203.109 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 201.810 | 0.032 | n/a | 0.220 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000098 | 202.844 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 201.346 | 0.016 | n/a | 0.129 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f9000000000000006a | 202.836 | 0.000 | n/a | 0.000 | 0.000 | 1.367 | 201.223 | 0.016 | n/a | 0.120 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f9000000000000005b | 202.800 | 0.000 | n/a | 0.000 | 0.000 | 0.850 | 201.556 | 0.028 | n/a | 0.148 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f9000000000000007a | 202.777 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 201.703 | 0.066 | n/a | 0.255 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f900000000000000b7 | 202.713 | 0.000 | n/a | 0.000 | 0.000 | 1.373 | 201.071 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f900000000000000b5 | 202.652 | 0.000 | n/a | 0.000 | 0.000 | 1.740 | 200.660 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000081 | 202.643 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 201.307 | 0.036 | n/a | 0.276 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000079 | 202.635 | 0.000 | n/a | 0.000 | 0.000 | 1.125 | 201.173 | 0.015 | n/a | 0.137 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000086 | 202.594 | 0.000 | n/a | 0.000 | 0.000 | 1.300 | 200.931 | 0.021 | n/a | 0.104 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f900000000000000a6 | 202.594 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 201.307 | 0.036 | n/a | 0.181 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f900000000000000af | 202.586 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 201.299 | 0.019 | n/a | 0.174 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f9000000000000006e | 202.578 | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 201.282 | 0.022 | n/a | 0.155 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.861 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.748 | 200.883 | 0.011 | n/a | 0.077 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |
| p99 | 226.332 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.822 | 225.410 | 5.510 | n/a | 0.271 | 0.000 | n/a | n/a | 0.348 | 0.000 | 0.000 | 0.348 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a176070d62de2f900000000000000ec | 226.332 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 225.410 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f900000000000000d6 | 206.298 | 0.000 | n/a | 0.000 | 0.000 | 2.822 | 203.082 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.314 | 0.000 | 0.000 | 0.314 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000116 | 204.214 | 0.000 | n/a | 0.000 | 0.000 | 1.984 | 201.707 | 0.013 | n/a | 0.162 | 0.000 | n/a | n/a | 0.348 | 0.000 | 0.000 | 0.348 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000123 | 202.972 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 201.798 | 0.058 | n/a | 0.271 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f900000000000000f3 | 202.968 | 0.000 | n/a | 0.000 | 0.000 | 1.024 | 201.693 | 0.012 | n/a | 0.133 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f900000000000000c7 | 202.875 | 0.000 | n/a | 0.000 | 0.000 | 1.284 | 201.287 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f900000000000000c6 | 202.852 | 0.000 | n/a | 0.000 | 0.000 | 1.365 | 201.249 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000118 | 202.788 | 0.000 | n/a | 0.000 | 0.000 | 1.221 | 201.251 | 0.013 | n/a | 0.098 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000102 | 202.720 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 201.672 | 0.028 | n/a | 0.129 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000117 | 202.666 | 0.000 | n/a | 0.000 | 0.000 | 1.272 | 201.088 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f900000000000000ee | 202.659 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 201.607 | 0.044 | n/a | 0.167 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f900000000000000d3 | 202.559 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 201.420 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000100 | 202.557 | 0.000 | n/a | 0.000 | 0.000 | 1.009 | 201.230 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f900000000000000dc | 202.547 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 201.225 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f9000000000000011f | 202.537 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 201.358 | 0.008 | n/a | 0.112 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000119 | 202.531 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 201.299 | 0.010 | n/a | 0.156 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f900000000000000fc | 202.480 | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 201.261 | 0.009 | n/a | 0.101 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000120 | 202.436 | 0.000 | n/a | 0.000 | 0.000 | 1.217 | 200.940 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000114 | 202.426 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 201.237 | 0.025 | n/a | 0.116 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f900000000000000db | 202.410 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 201.405 | 0.022 | n/a | 0.098 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.678 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 200.783 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 206.202 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.347 | 204.582 | 4.631 | n/a | 0.146 | 0.000 | n/a | n/a | 0.433 | 0.000 | 0.000 | 0.433 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a176070d62de2f90000000000000140 | 206.202 | 0.000 | n/a | 0.000 | 0.000 | 1.085 | 204.582 | 0.023 | n/a | 0.079 | 0.000 | n/a | n/a | 0.433 | 0.000 | 0.000 | 0.433 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000147 | 202.769 | 0.000 | n/a | 0.000 | 0.000 | 0.786 | 201.638 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f9000000000000018e | 202.655 | 0.000 | n/a | 0.000 | 0.000 | 1.103 | 201.228 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000130 | 202.555 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 201.330 | 0.015 | n/a | 0.099 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f9000000000000017d | 202.523 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 201.309 | 0.011 | n/a | 0.127 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000182 | 202.470 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 201.198 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f9000000000000013d | 202.469 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 201.385 | 0.016 | n/a | 0.104 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000144 | 202.389 | 0.000 | n/a | 0.000 | 0.000 | 1.128 | 200.962 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000159 | 202.385 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 201.319 | 0.037 | n/a | 0.125 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000162 | 202.365 | 0.000 | n/a | 0.000 | 0.000 | 1.076 | 201.015 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000156 | 202.358 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 201.190 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000132 | 202.226 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 200.985 | 0.014 | n/a | 0.146 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f9000000000000013e | 202.174 | 0.000 | n/a | 0.000 | 0.000 | 0.992 | 200.975 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f9000000000000016c | 202.118 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 201.131 | 0.006 | n/a | 0.084 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f9000000000000017b | 202.103 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 201.023 | 0.006 | n/a | 0.074 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f9000000000000018d | 202.090 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 200.966 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000138 | 202.077 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 201.025 | 0.028 | n/a | 0.100 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000194 | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.659 | 201.171 | 0.013 | n/a | 0.091 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000135 | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 200.906 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000181 | 202.059 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 200.931 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (108 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.587 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 200.749 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 202.548 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.685 | 201.431 | 2.710 | n/a | 0.139 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a176070d62de2f90000000000000204 | 202.685 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 201.724 | 0.017 | n/a | 0.132 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f900000000000001cf | 202.548 | 0.000 | n/a | 0.000 | 0.000 | 1.685 | 200.698 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f900000000000001c1 | 202.466 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 201.431 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000199 | 202.428 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 201.394 | 0.008 | n/a | 0.098 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f900000000000001af | 202.388 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 201.252 | 0.020 | n/a | 0.087 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f900000000000001bf | 202.365 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 200.908 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f900000000000001bb | 202.230 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 201.114 | 0.006 | n/a | 0.075 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f900000000000001b0 | 202.218 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 201.336 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f900000000000001de | 202.208 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 201.170 | 0.037 | n/a | 0.084 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f900000000000001e5 | 202.204 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 201.147 | 0.016 | n/a | 0.094 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f900000000000001a5 | 202.183 | 0.000 | n/a | 0.000 | 0.000 | 1.073 | 200.850 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f900000000000001b7 | 202.141 | 0.000 | n/a | 0.000 | 0.000 | 0.670 | 201.215 | 0.010 | n/a | 0.139 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f900000000000001ab | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 200.977 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f900000000000001ee | 202.118 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 201.290 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000206 | 202.113 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 201.073 | 0.008 | n/a | 0.091 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000196 | 202.104 | 0.000 | n/a | 0.000 | 0.000 | 0.722 | 201.183 | 0.020 | n/a | 0.057 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f900000000000001a9 | 202.086 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 200.929 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f900000000000001b4 | 202.082 | 0.000 | n/a | 0.000 | 0.000 | 0.847 | 200.968 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f900000000000001c8 | 202.077 | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 201.229 | 0.028 | n/a | 0.133 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f900000000000001ea | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 201.091 | 0.007 | n/a | 0.086 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.676 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 200.803 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 |
| p99 | 203.179 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.320 | 201.546 | 3.700 | n/a | 0.143 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a176070d62de2f9000000000000021a | 205.600 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 204.663 | 0.020 | n/a | 0.066 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000276 | 203.179 | 0.000 | n/a | 0.000 | 0.000 | 1.722 | 201.138 | 0.007 | n/a | 0.102 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f9000000000000020c | 202.671 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.509 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f9000000000000020b | 202.661 | 0.000 | n/a | 0.000 | 0.000 | 0.756 | 201.546 | 0.010 | n/a | 0.141 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000277 | 202.621 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 200.737 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 1.164 | 0.000 | 0.000 | 1.164 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000279 | 202.567 | 0.000 | n/a | 0.000 | 0.000 | 1.320 | 201.023 | 0.018 | n/a | 0.107 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000214 | 202.465 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 199.966 | 0.006 | n/a | 1.457 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f9000000000000025f | 202.406 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 201.500 | 0.021 | n/a | 0.104 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f9000000000000021f | 202.374 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 201.435 | 0.022 | n/a | 0.085 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000235 | 202.333 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 201.098 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000275 | 202.328 | 0.000 | n/a | 0.000 | 0.000 | 0.852 | 201.155 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000271 | 202.264 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 201.031 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000236 | 202.162 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 200.969 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f9000000000000026a | 202.148 | 0.000 | n/a | 0.000 | 0.000 | 0.670 | 201.264 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000254 | 202.129 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 200.947 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000212 | 202.122 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 201.172 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f9000000000000024c | 202.112 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 200.886 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f9000000000000022e | 202.100 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 200.962 | 0.005 | n/a | 0.091 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000224 | 202.093 | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 201.132 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000218 | 202.086 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 201.007 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / read (66 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.207 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 70.399 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 206.053 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.204 | 205.274 | 0.727 | n/a | 0.359 | 0.000 | n/a | n/a | 49.898 | 0.000 | 0.000 | 49.898 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a176070d62de2f90000000000000290 | 206.053 | 0.000 | n/a | 0.000 | 0.000 | 0.577 | 205.274 | 0.013 | n/a | 0.061 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000284 | 202.096 | 0.000 | n/a | 0.000 | 0.000 | 0.962 | 200.936 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f9000000000000027e | 201.945 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 201.120 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000280 | 201.926 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 200.781 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f9000000000000028c | 201.849 | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 200.935 | 0.013 | n/a | 0.120 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000297 | 201.806 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 200.980 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000296 | 201.794 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 200.747 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f9000000000000028b | 201.688 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 200.694 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000291 | 201.685 | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 200.862 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f9000000000000028e | 201.660 | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 200.879 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f9000000000000028a | 201.657 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 200.814 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000292 | 201.651 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 200.695 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f9000000000000027f | 201.620 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 200.755 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000293 | 201.573 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 200.660 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000283 | 201.478 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 200.771 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000295 | 201.443 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 200.646 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000285 | 201.275 | 0.000 | n/a | 0.000 | 0.000 | 0.424 | 200.681 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000287 | 201.125 | 0.000 | n/a | 0.000 | 0.000 | 0.309 | 200.657 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000282 | 176.889 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 175.706 | 0.332 | n/a | 0.035 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000294 | 145.547 | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 144.877 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / read (215 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.939 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.481 | 86.377 | 0.008 | n/a | 0.030 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 |
| p99 | 202.335 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.589 | 201.107 | 4.073 | n/a | 0.073 | 0.000 | n/a | n/a | 49.805 | 0.000 | 0.000 | 49.805 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a176070d62de2f90000000000000ed3 | 211.920 | 0.000 | n/a | 0.000 | 0.000 | 11.691 | 195.972 | 4.073 | n/a | 0.034 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000ed4 | 206.228 | 0.000 | n/a | 0.000 | 0.000 | 0.199 | 205.868 | 0.015 | n/a | 0.059 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 7a176070d62de2f90000000000000ed5 | 202.335 | 0.000 | n/a | 0.000 | 0.000 | 1.041 | 201.083 | 0.019 | n/a | 0.065 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000ed0 | 201.896 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 200.753 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000ebf | 201.837 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 200.923 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000f0a | 201.825 | 0.000 | n/a | 0.000 | 0.000 | 0.503 | 201.107 | 0.014 | n/a | 0.091 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000ead | 201.813 | 0.000 | n/a | 0.000 | 0.000 | 1.093 | 200.596 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000f04 | 201.743 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 200.983 | 0.015 | n/a | 0.062 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000ef6 | 201.636 | 0.000 | n/a | 0.000 | 0.000 | 0.317 | 201.136 | 0.019 | n/a | 0.064 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000eae | 201.628 | 0.000 | n/a | 0.000 | 0.000 | 0.621 | 200.787 | 0.012 | n/a | 0.051 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000ef3 | 201.577 | 0.000 | n/a | 0.000 | 0.000 | 0.344 | 201.072 | 0.020 | n/a | 0.060 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-44/journal/page | none observed |
| 7a176070d62de2f90000000000000ef9 | 201.565 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 200.639 | 0.013 | n/a | 0.031 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000ed9 | 201.554 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 200.827 | 0.017 | n/a | 0.049 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000e99 | 201.548 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 200.639 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-46/journal/page | none observed |
| 7a176070d62de2f90000000000000ee0 | 201.517 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 200.670 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-42/journal/page | none observed |
| 7a176070d62de2f90000000000000eec | 201.509 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 200.808 | 0.016 | n/a | 0.049 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 7a176070d62de2f90000000000000ebc | 201.494 | 0.000 | n/a | 0.000 | 0.000 | 0.432 | 200.902 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-49/journal/page | none observed |
| 7a176070d62de2f90000000000000ea3 | 201.473 | 0.000 | n/a | 0.000 | 0.000 | 0.691 | 200.574 | 0.008 | n/a | 0.030 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-67/journal/page | none observed |
| 7a176070d62de2f90000000000000ef8 | 201.467 | 0.000 | n/a | 0.000 | 0.000 | 0.498 | 200.796 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 7a176070d62de2f90000000000000ec0 | 201.444 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 200.604 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-42/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

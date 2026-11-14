# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-42/commit.prepare-and-validate` (236.078 ms, trace `89b151bc2882e61c0000000000001dc0`); `gw-w/thread-40/commit.prepare-and-validate` (145.474 ms, trace `89b151bc2882e61c00000000000002d5`); `node-14/thread-0/driver.queue.subject` (61.220 ms, trace `89b151bc2882e61c0000000000000631`); `node-14/thread-0/driver.queue.subject` (101.348 ms, trace `89b151bc2882e61c0000000000001c29`); `node-14/thread-0/driver.queue.subject` (88.708 ms, trace `89b151bc2882e61c0000000000001c2b`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p4-core-zero-a-2-candidate`; source `04dd61f7ae9431b4ea3053f191c001a944c8a7d8`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6725487.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 226 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14596.186 | 661.969 | 13.271 | 311 |
| L1 | 0 | 19955.646 | 459.477 | 16.483 | 462 |
| L4 | 0 | 19972.562 | 385.988 | 11.585 | 426 |
| L16 | 0 | 19971.637 | 439.268 | 17.097 | 474 |
| L64 | 0 | 19965.662 | 530.651 | 21.838 | 610 |
| L256 | 0 | 19969.843 | 373.216 | 9.829 | 472 |
| L1024 | 0 | 19995.828 | 3942.858 | 37.465 | 12261 |
| tail | 0 | 64383.120 | 11661.523 | 141.039 | 37168 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 89b151bc2882e61c0000000000001dc0 | driver.queue.scheduler-late | 0.305 | none | 0 / 32 |
| 89b151bc2882e61c0000000000001dc0 | driver.queue.scheduler-dispatch | 0.079 | none | 0 / 32 |

Observed active steps while trace 89b151bc2882e61c0000000000001dc0 waited: []

| 89b151bc2882e61c00000000000002d5 | driver.queue.scheduler-dispatch | 0.079 | none | 0 / 32 |
| 89b151bc2882e61c00000000000002d5 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 89b151bc2882e61c00000000000002d5 waited: []

| 89b151bc2882e61c0000000000000631 | driver.queue.subject | 61.220 | 89b151bc2882e61c000000000000062f | 3 / 32 |
| 89b151bc2882e61c0000000000000631 | driver.queue.scheduler-late | 0.722 | none | 3 / 32 |
| 89b151bc2882e61c0000000000000631 | driver.queue.scheduler-dispatch | 0.075 | none | 4 / 32 |

Observed active steps while trace 89b151bc2882e61c0000000000000631 waited: [{"at":1794619953493.6484,"inFlight":5,"capacity":32,"active":[{"traceId":"89b151bc2882e61c000000000000062e","step":"client.http"},{"traceId":"89b151bc2882e61c000000000000062f","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000000630","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000000632","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000000633","step":"client.http"}]},{"at":1794619953513.5906,"inFlight":5,"capacity":32,"active":[{"traceId":"89b151bc2882e61c000000000000062e","step":"client.http"},{"traceId":"89b151bc2882e61c000000000000062f","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000000630","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000000632","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000000633","step":"client.http"}]}]

| 89b151bc2882e61c0000000000001c29 | driver.queue.subject | 101.348 | 89b151bc2882e61c0000000000001c27 | 2 / 32 |
| 89b151bc2882e61c0000000000001c29 | driver.queue.scheduler-late | 24.448 | none | 2 / 32 |
| 89b151bc2882e61c0000000000001c29 | driver.queue.scheduler-dispatch | 0.125 | none | 2 / 32 |

Observed active steps while trace 89b151bc2882e61c0000000000001c29 waited: [{"at":1794620003541.015,"inFlight":2,"capacity":32,"active":[{"traceId":"89b151bc2882e61c0000000000001c22","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c20","step":"client.http"}]},{"at":1794620003568.2336,"inFlight":5,"capacity":32,"active":[{"traceId":"89b151bc2882e61c0000000000001c20","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c2c","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c2d","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c25","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c2f","step":"client.http"}]},{"at":1794620003598.9492,"inFlight":3,"capacity":32,"active":[{"traceId":"89b151bc2882e61c0000000000001c28","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c24","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c37","step":"client.http"}]},{"at":1794620003637.714,"inFlight":2,"capacity":32,"active":[{"traceId":"89b151bc2882e61c0000000000001c27","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c2b","step":"client.http"}]}]

| 89b151bc2882e61c0000000000001c2b | driver.queue.subject | 88.708 | 89b151bc2882e61c0000000000001c2a | 2 / 32 |
| 89b151bc2882e61c0000000000001c2b | driver.queue.scheduler-late | 22.015 | none | 2 / 32 |
| 89b151bc2882e61c0000000000001c2b | driver.queue.scheduler-dispatch | 5.474 | none | 1 / 32 |

Observed active steps while trace 89b151bc2882e61c0000000000001c2b waited: [{"at":1794620003541.015,"inFlight":2,"capacity":32,"active":[{"traceId":"89b151bc2882e61c0000000000001c22","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c20","step":"client.http"}]},{"at":1794620003568.2336,"inFlight":5,"capacity":32,"active":[{"traceId":"89b151bc2882e61c0000000000001c20","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c2c","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c2d","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c25","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c2f","step":"client.http"}]},{"at":1794620003598.9492,"inFlight":3,"capacity":32,"active":[{"traceId":"89b151bc2882e61c0000000000001c28","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c24","step":"client.http"},{"traceId":"89b151bc2882e61c0000000000001c37","step":"client.http"}]}]

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.499 | 0.582 | 0.000 | 1.081 | 5.984 | 0.192 | 0.000 | 0.169 | 1.434 | 9.743 | 0.061 | n/a | 0.393 | 15.523 | n/a | n/a | 0.061 | 6.686 | 0.230 | 0.061 |
| p99 | 108.503 | 6.719 | 0.000 | 8.887 | 19.620 | 9.621 | 4.753 | 42.159 | 5.284 | 35.547 | 0.563 | n/a | 1.168 | 47.753 | n/a | n/a | 0.544 | 54.559 | 0.797 | 0.544 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c00000000000000f4 | 108.503 | 18.875 | 0.546 | 0.000 | 0.104 | 4.125 | 35.547 | 0.319 | n/a | 1.168 | 47.753 | n/a | n/a | 0.065 | 19.525 | 0.180 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000000f1 | 94.118 | 19.620 | 0.017 | 0.000 | 1.397 | 1.280 | 23.315 | 0.260 | n/a | 0.190 | 47.495 | n/a | n/a | 0.544 | 21.034 | 0.223 | 0.544 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000000fd | 68.447 | 8.623 | 0.026 | 3.752 | 42.159 | 1.611 | 1.859 | 0.062 | n/a | 0.552 | 9.311 | n/a | n/a | 0.493 | 54.559 | 0.797 | 0.493 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 89b151bc2882e61c0000000000000106 | 66.847 | 6.549 | 9.621 | 0.000 | 0.361 | 1.550 | 12.352 | 0.049 | n/a | 0.489 | 35.826 | n/a | n/a | 0.051 | 16.531 | 0.247 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 5.841ms; driver.expected-state.add-commit 1.806ms |
| 89b151bc2882e61c0000000000000104 | 65.584 | 4.951 | 0.280 | 0.000 | 0.128 | 1.559 | 29.212 | 0.117 | n/a | 0.155 | 29.112 | n/a | n/a | 0.070 | 5.359 | 0.082 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000000f8 | 65.357 | 9.536 | 0.385 | 0.000 | 0.082 | 2.955 | 33.535 | 0.089 | n/a | 0.146 | 18.565 | n/a | n/a | 0.064 | 10.003 | 0.153 | 0.064 | gw-w/thread-43/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000100 | 45.549 | 6.449 | 0.356 | 0.000 | 0.074 | 2.558 | 12.458 | 0.078 | n/a | 0.171 | 23.294 | n/a | n/a | 0.110 | 6.879 | 0.151 | 0.110 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000128 | 45.265 | 4.130 | 0.229 | 0.275 | 0.096 | 0.970 | 12.099 | 0.053 | n/a | 0.109 | 27.251 | n/a | n/a | 0.054 | 4.729 | 0.104 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000012a | 45.058 | 3.858 | 0.309 | 0.238 | 0.052 | 1.434 | 24.114 | 0.073 | n/a | 0.132 | 14.806 | n/a | n/a | 0.044 | 4.456 | 0.099 | 0.044 | gw-w/thread-46/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000000fc | 43.601 | 4.999 | 0.369 | 0.000 | 0.088 | 2.265 | 18.598 | 0.056 | n/a | 0.755 | 16.417 | n/a | n/a | 0.055 | 5.455 | 0.125 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000010c | 42.342 | 6.049 | 0.228 | 0.000 | 0.146 | 1.725 | 20.371 | 0.086 | n/a | 0.166 | 13.510 | n/a | n/a | 0.061 | 6.424 | 0.152 | 0.061 | gw-w/thread-42/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000122 | 41.406 | 7.420 | 0.192 | 0.369 | 0.070 | 1.792 | 13.811 | 0.138 | n/a | 0.195 | 17.368 | n/a | n/a | 0.051 | 8.051 | 0.194 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000111 | 39.796 | 4.664 | 1.939 | 0.379 | 0.058 | 3.691 | 16.786 | 0.057 | n/a | 0.393 | 11.792 | n/a | n/a | 0.037 | 7.040 | 0.177 | 0.037 | gw-w/thread-42/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000117 | 39.038 | 7.661 | 0.006 | 1.787 | 0.169 | 5.284 | 4.641 | 0.166 | n/a | 0.208 | 19.055 | n/a | n/a | 0.062 | 9.622 | 0.246 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000000f9 | 38.499 | 8.688 | 0.009 | 0.000 | 0.903 | 1.323 | 5.288 | 0.058 | n/a | 0.594 | 21.555 | n/a | n/a | 0.081 | 9.599 | 0.249 | 0.081 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000109 | 36.041 | 6.394 | 0.010 | 1.675 | 0.213 | 1.203 | 1.997 | 0.055 | n/a | 0.610 | 23.820 | n/a | n/a | 0.065 | 8.292 | 0.230 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000011e | 33.279 | 3.853 | 0.217 | 0.331 | 0.082 | 1.274 | 11.154 | 0.127 | n/a | 0.676 | 15.523 | n/a | n/a | 0.041 | 4.483 | 0.135 | 0.041 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000101 | 33.158 | 10.261 | 0.029 | 2.270 | 1.136 | 0.705 | 2.637 | 0.038 | n/a | 0.095 | 15.866 | n/a | n/a | 0.121 | 13.696 | 0.413 | 0.121 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000011a | 31.047 | 3.982 | 0.317 | 0.250 | 0.131 | 1.367 | 10.423 | 0.054 | n/a | 0.123 | 14.355 | n/a | n/a | 0.045 | 4.681 | 0.151 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000000f5 | 30.006 | 8.321 | 0.008 | 0.000 | 0.679 | 0.826 | 2.235 | 0.061 | n/a | 0.600 | 17.083 | n/a | n/a | 0.194 | 9.008 | 0.300 | 0.194 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.057 | 0.949 | 0.000 | 1.700 | 5.169 | 0.007 | 0.000 | 0.679 | 1.155 | 2.092 | 0.061 | n/a | 0.552 | 9.980 | n/a | n/a | 0.052 | 5.567 | 0.300 | 0.052 |
| p99 | 68.447 | 3.989 | 0.000 | 5.371 | 8.688 | 0.026 | 3.752 | 42.159 | 1.611 | 5.288 | 0.563 | n/a | 0.735 | 21.555 | n/a | n/a | 0.493 | 54.559 | 0.797 | 0.493 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c00000000000000fd | 68.447 | 8.623 | 0.026 | 3.752 | 42.159 | 1.611 | 1.859 | 0.062 | n/a | 0.552 | 9.311 | n/a | n/a | 0.493 | 54.559 | 0.797 | 0.493 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 89b151bc2882e61c00000000000000f9 | 38.499 | 8.688 | 0.009 | 0.000 | 0.903 | 1.323 | 5.288 | 0.058 | n/a | 0.594 | 21.555 | n/a | n/a | 0.081 | 9.599 | 0.249 | 0.081 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000000f5 | 30.006 | 8.321 | 0.008 | 0.000 | 0.679 | 0.826 | 2.235 | 0.061 | n/a | 0.600 | 17.083 | n/a | n/a | 0.194 | 9.008 | 0.300 | 0.194 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000011f | 23.264 | 5.169 | 0.010 | 0.000 | 0.389 | 0.923 | 4.341 | 0.045 | n/a | 0.126 | 12.195 | n/a | n/a | 0.066 | 5.567 | 0.239 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000113 | 21.057 | 5.984 | 0.007 | 0.000 | 0.472 | 1.360 | 1.617 | 0.048 | n/a | 0.217 | 11.302 | n/a | n/a | 0.052 | 6.463 | 0.307 | 0.052 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000110 | 18.501 | 3.579 | 0.006 | 0.000 | 0.672 | 1.155 | 2.406 | 0.084 | n/a | 0.571 | 9.980 | n/a | n/a | 0.048 | 4.257 | 0.230 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000123 | 15.355 | 4.475 | 0.005 | 0.000 | 1.035 | 1.470 | 1.702 | 0.051 | n/a | 0.399 | 6.177 | n/a | n/a | 0.041 | 5.515 | 0.359 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000011b | 13.811 | 3.157 | 0.006 | 0.000 | 0.498 | 0.809 | 1.483 | 0.563 | n/a | 0.466 | 6.784 | n/a | n/a | 0.046 | 3.660 | 0.265 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000125 | 13.702 | 3.297 | 0.006 | 0.000 | 1.027 | 1.140 | 2.092 | 0.106 | n/a | 0.735 | 5.252 | n/a | n/a | 0.047 | 4.330 | 0.316 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.745 | 0.740 | 0.000 | 1.316 | 4.729 | 0.015 | 0.229 | 0.275 | 1.356 | 5.997 | 0.060 | n/a | 0.420 | 12.391 | n/a | n/a | 0.069 | 5.680 | 0.200 | 0.069 |
| p99 | 117.052 | 5.503 | 0.056 | 7.090 | 16.431 | 0.375 | 2.842 | 7.670 | 4.888 | 28.109 | 0.142 | n/a | 3.534 | 85.583 | n/a | n/a | 0.143 | 19.146 | 0.522 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000000140 | 117.052 | 8.319 | 0.197 | 0.331 | 0.055 | 1.960 | 20.355 | 0.072 | n/a | 0.121 | 85.583 | n/a | n/a | 0.058 | 8.902 | 0.076 | 0.058 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000143 | 63.130 | 7.315 | 0.007 | 0.000 | 0.283 | 1.170 | 2.169 | 0.051 | n/a | 2.356 | 49.704 | n/a | n/a | 0.073 | 7.606 | 0.120 | 0.073 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000135 | 61.219 | 6.332 | 0.375 | 0.895 | 0.313 | 4.517 | 25.282 | 0.057 | n/a | 0.483 | 22.838 | n/a | n/a | 0.126 | 7.916 | 0.129 | 0.126 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000146 | 58.772 | 4.326 | 0.264 | 0.290 | 0.048 | 1.608 | 26.552 | 0.091 | n/a | 1.930 | 23.623 | n/a | n/a | 0.039 | 4.928 | 0.084 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.456ms |
| 89b151bc2882e61c000000000000014a | 52.080 | 4.950 | 0.278 | 0.274 | 0.097 | 1.253 | 28.109 | 0.077 | n/a | 0.110 | 16.832 | n/a | n/a | 0.101 | 5.598 | 0.107 | 0.101 | gw-w/thread-46/gateway.admitted-work | none observed |
| 89b151bc2882e61c000000000000012e | 49.209 | 4.729 | 0.219 | 0.497 | 0.082 | 1.954 | 24.635 | 0.079 | n/a | 0.674 | 16.287 | n/a | n/a | 0.053 | 5.527 | 0.112 | 0.053 | gw-w/thread-43/gateway.admitted-work | none observed |
| 89b151bc2882e61c000000000000013e | 48.651 | 4.971 | 0.207 | 0.385 | 0.067 | 1.125 | 16.836 | 0.063 | n/a | 0.157 | 24.796 | n/a | n/a | 0.044 | 5.629 | 0.116 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000173 | 46.951 | 4.130 | 0.202 | 0.353 | 0.090 | 1.552 | 15.948 | 0.060 | n/a | 3.437 | 21.131 | n/a | n/a | 0.048 | 4.776 | 0.102 | 0.048 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000132 | 46.016 | 4.436 | 0.006 | 1.398 | 0.275 | 1.229 | 2.654 | 0.111 | n/a | 0.757 | 35.082 | n/a | n/a | 0.069 | 6.114 | 0.133 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000016d | 44.505 | 8.207 | 0.245 | 0.492 | 0.091 | 3.272 | 19.387 | 0.064 | n/a | 0.285 | 12.409 | n/a | n/a | 0.053 | 9.035 | 0.203 | 0.053 | gw-w/thread-42/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000164 | 43.107 | 8.279 | 0.187 | 0.313 | 0.049 | 1.784 | 20.557 | 0.079 | n/a | 0.143 | 11.682 | n/a | n/a | 0.036 | 8.828 | 0.205 | 0.036 | gw-w/thread-40/gateway.admitted-work | none observed |
| 89b151bc2882e61c000000000000012c | 43.034 | 5.857 | 0.317 | 0.000 | 0.159 | 1.572 | 22.475 | 0.051 | n/a | 0.123 | 12.391 | n/a | n/a | 0.089 | 6.333 | 0.147 | 0.089 | gw-w/thread-40/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000167 | 39.971 | 3.905 | 0.277 | 0.272 | 0.177 | 1.455 | 24.506 | 0.098 | n/a | 0.138 | 9.053 | n/a | n/a | 0.090 | 4.631 | 0.116 | 0.090 | gw-w/thread-44/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000138 | 37.583 | 4.623 | 0.343 | 0.229 | 0.083 | 1.409 | 9.709 | 0.055 | n/a | 0.368 | 20.646 | n/a | n/a | 0.117 | 5.279 | 0.140 | 0.117 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000014e | 36.647 | 16.431 | 0.011 | 1.868 | 0.836 | 1.100 | 2.289 | 0.038 | n/a | 0.687 | 13.301 | n/a | n/a | 0.086 | 19.146 | 0.522 | 0.086 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000013b | 36.631 | 9.055 | 0.008 | 0.000 | 0.763 | 1.531 | 2.355 | 0.049 | n/a | 0.210 | 22.549 | n/a | n/a | 0.110 | 9.827 | 0.268 | 0.110 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000171 | 34.946 | 4.302 | 0.258 | 0.000 | 0.107 | 1.356 | 16.896 | 0.074 | n/a | 0.519 | 11.364 | n/a | n/a | 0.070 | 4.667 | 0.134 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000158 | 33.100 | 4.436 | 0.197 | 0.361 | 0.058 | 1.189 | 10.126 | 0.048 | n/a | 0.109 | 16.524 | n/a | n/a | 0.051 | 5.052 | 0.153 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000147 | 32.638 | 5.634 | 0.011 | 0.000 | 0.465 | 0.792 | 1.382 | 0.038 | n/a | 0.158 | 24.052 | n/a | n/a | 0.105 | 6.110 | 0.187 | 0.105 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000175 | 31.542 | 4.259 | 0.006 | 0.000 | 0.447 | 0.954 | 2.078 | 0.038 | n/a | 0.727 | 22.992 | n/a | n/a | 0.042 | 4.711 | 0.149 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.610 | 0.843 | 0.000 | 1.534 | 4.345 | 0.006 | 0.000 | 0.465 | 1.096 | 2.133 | 0.093 | n/a | 0.423 | 6.912 | n/a | n/a | 0.069 | 5.680 | 0.240 | 0.069 |
| p99 | 46.016 | 1.312 | 0.016 | 2.192 | 7.003 | 0.011 | 1.398 | 7.670 | 4.888 | 5.997 | 0.142 | n/a | 3.534 | 35.082 | n/a | n/a | 0.131 | 10.674 | 0.518 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000000132 | 46.016 | 4.436 | 0.006 | 1.398 | 0.275 | 1.229 | 2.654 | 0.111 | n/a | 0.757 | 35.082 | n/a | n/a | 0.069 | 6.114 | 0.133 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000147 | 32.638 | 5.634 | 0.011 | 0.000 | 0.465 | 0.792 | 1.382 | 0.038 | n/a | 0.158 | 24.052 | n/a | n/a | 0.105 | 6.110 | 0.187 | 0.105 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000136 | 26.240 | 7.003 | 0.006 | 0.000 | 0.656 | 2.774 | 5.997 | 0.098 | n/a | 0.423 | 9.198 | n/a | n/a | 0.086 | 7.664 | 0.292 | 0.086 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000016f | 23.626 | 4.794 | 0.008 | 0.000 | 0.878 | 4.888 | 2.354 | 0.127 | n/a | 3.534 | 6.912 | n/a | n/a | 0.131 | 5.680 | 0.240 | 0.131 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000178 | 20.610 | 3.000 | 0.005 | 0.000 | 7.670 | 1.288 | 2.326 | 0.093 | n/a | 0.764 | 5.421 | n/a | n/a | 0.045 | 10.674 | 0.518 | 0.045 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.950ms; driver.publication 1.198ms |
| 89b151bc2882e61c000000000000015d | 18.009 | 3.954 | 0.007 | 0.000 | 0.356 | 1.080 | 2.133 | 0.142 | n/a | 1.729 | 8.538 | n/a | n/a | 0.069 | 4.318 | 0.240 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000153 | 15.077 | 4.345 | 0.010 | 0.000 | 0.352 | 1.096 | 2.082 | 0.049 | n/a | 0.420 | 6.646 | n/a | n/a | 0.076 | 4.707 | 0.312 | 0.076 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000161 | 12.605 | 3.071 | 0.006 | 0.000 | 0.753 | 0.821 | 1.503 | 0.038 | n/a | 0.115 | 6.252 | n/a | n/a | 0.048 | 3.829 | 0.304 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 100.727 | n/a | n/a | n/a | 39.979 | 28.605 | 2.109 | 0.000 | 0.322 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.627 | 71.690 | 0.839 | 20.627 |
| p99 | 405.272 | n/a | n/a | n/a | 143.924 | 303.879 | 17.091 | 0.000 | 41.577 | 105.376 | 58.094 | n/a | 0.017 | 0.000 | n/a | n/a | 265.776 | 382.351 | 1.000 | 265.776 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000001c4c | 405.272 | 59.615 | 245.000 | 2.920 | 0.000 | 0.442 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 97.296 | 307.535 | 0.759 | 97.296 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.025ms; driver.publication 2.433ms; driver.publication 1.782ms; driver.publication 1.419ms; driver.publication 1.345ms |
| 89b151bc2882e61c0000000000001c4f | 393.722 | 109.420 | 264.274 | 8.656 | 0.000 | 0.397 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.974 | 382.351 | 0.971 | 10.974 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.025ms; driver.publication 2.433ms; driver.publication 1.782ms; driver.publication 1.419ms; driver.publication 1.345ms |
| 89b151bc2882e61c0000000000001c4e | 367.731 | 47.051 | 238.959 | 3.873 | 0.000 | 0.252 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.596 | 289.883 | 0.788 | 77.596 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.025ms; driver.publication 2.433ms; driver.publication 1.782ms; driver.publication 1.419ms; driver.publication 1.345ms |
| 89b151bc2882e61c00000000000003af | 357.343 | 38.962 | 130.434 | 3.633 | 0.000 | 3.081 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 181.233 | 173.029 | 0.484 | 181.233 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.462ms; driver.publication 2.398ms; driver.publication 1.868ms; driver.publication 1.775ms; driver.publication 1.760ms |
| 89b151bc2882e61c0000000000001c5d | 351.155 | 31.779 | 303.879 | 0.712 | 0.000 | 0.399 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.386 | 336.370 | 0.958 | 14.386 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.025ms; driver.publication 2.433ms; driver.publication 1.782ms; driver.publication 1.419ms; driver.publication 1.345ms |
| 89b151bc2882e61c00000000000003b5 | 345.037 | 28.963 | 226.175 | 6.584 | 0.000 | 0.470 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 82.844 | 261.723 | 0.759 | 82.844 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.462ms; driver.publication 2.398ms; driver.publication 1.868ms; driver.publication 1.775ms; driver.publication 1.760ms |
| 89b151bc2882e61c0000000000001c48 | 330.527 | 62.973 | 165.868 | 8.091 | 0.000 | 0.236 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 93.358 | 236.933 | 0.717 | 93.358 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.025ms; driver.publication 2.433ms; driver.publication 1.782ms; driver.publication 1.400ms; driver.publication 1.345ms |
| 89b151bc2882e61c0000000000001c5f | 329.473 | 31.588 | 256.344 | 1.926 | 0.000 | 0.243 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.371 | 289.859 | 0.880 | 39.371 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.025ms; driver.publication 2.433ms; driver.publication 1.782ms; driver.publication 1.419ms; driver.publication 1.331ms |
| 89b151bc2882e61c00000000000003ae | 314.833 | 38.400 | 247.605 | 7.149 | 0.000 | 1.052 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.627 | 293.154 | 0.931 | 20.627 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.462ms; driver.publication 2.398ms; driver.publication 1.868ms; driver.publication 1.775ms; driver.publication 1.760ms |
| 89b151bc2882e61c00000000000003b0 | 313.272 | 17.614 | 248.133 | 0.000 | 0.000 | 0.472 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.054 | 265.746 | 0.848 | 47.054 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.462ms; driver.publication 2.398ms; driver.publication 1.868ms; driver.publication 1.775ms; driver.publication 1.760ms |
| 89b151bc2882e61c0000000000001c3d | 307.891 | 66.319 | 178.562 | 14.013 | 0.000 | 0.446 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.552 | 258.894 | 0.841 | 48.552 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.025ms; driver.publication 2.433ms; driver.publication 1.792ms; driver.publication 1.782ms; driver.publication 1.400ms |
| 89b151bc2882e61c00000000000003a1 | 307.107 | 106.322 | 1.332 | 17.091 | 0.000 | 2.577 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 179.785 | 124.745 | 0.406 | 179.785 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.462ms; driver.publication 2.398ms; driver.publication 1.868ms; driver.publication 1.775ms; driver.publication 1.760ms |
| 89b151bc2882e61c0000000000001c42 | 295.857 | 98.643 | 166.902 | 14.013 | 0.000 | 0.183 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.116 | 279.559 | 0.945 | 16.116 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.025ms; driver.publication 2.433ms; driver.publication 1.792ms; driver.publication 1.782ms; driver.publication 1.400ms |
| 89b151bc2882e61c00000000000003a9 | 292.763 | 19.140 | 3.175 | 1.281 | 0.000 | 3.389 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 265.776 | 23.597 | 0.081 | 265.776 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.462ms; driver.publication 2.398ms; driver.publication 1.868ms; driver.publication 1.775ms; driver.publication 1.760ms |
| 89b151bc2882e61c0000000000001c54 | 289.984 | 50.612 | 121.668 | 2.675 | 0.000 | 0.347 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 114.682 | 174.954 | 0.603 | 114.682 | node-14/thread-3/socket.wait-first-byte | driver.publication 3.025ms; driver.publication 2.433ms; driver.publication 1.782ms; driver.publication 1.345ms; driver.publication 1.331ms |
| 89b151bc2882e61c00000000000003a8 | 286.069 | 18.560 | 5.921 | 0.000 | 0.000 | 4.410 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 257.177 | 24.481 | 0.086 | 257.177 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.462ms; driver.publication 2.398ms; driver.publication 1.868ms; driver.publication 1.775ms; driver.publication 1.760ms |
| 89b151bc2882e61c0000000000001c1a | 266.403 | 64.504 | 33.353 | 7.157 | 0.000 | 41.577 | 61.698 | 58.094 | n/a | 0.008 | 0.000 | n/a | n/a | 0.012 | 105.014 | 0.394 | 0.012 | gw-r/thread-66/gateway.admitted-work | driver.publication 11.719ms; driver.publication 7.747ms; driver.publication 5.772ms; driver.publication 4.338ms; client.encode 3.350ms |
| 89b151bc2882e61c0000000000001c3a | 242.386 | 36.130 | 124.774 | 1.547 | 0.000 | 1.923 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 78.012 | 162.451 | 0.670 | 78.012 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 7.747ms; driver.publication 1.792ms; driver.publication 1.782ms; driver.publication 1.400ms; driver.publication 1.345ms |
| 89b151bc2882e61c0000000000001c19 | 220.657 | 51.526 | 47.655 | 8.637 | 0.000 | 7.416 | 105.376 | 0.017 | n/a | 0.017 | 0.000 | n/a | n/a | 0.011 | 107.819 | 0.489 | 0.011 | gw-r/thread-44/gateway.admitted-work | driver.publication 11.719ms; driver.publication 5.772ms; driver.publication 4.338ms; client.encode 3.350ms; driver.publication 2.729ms |
| 89b151bc2882e61c0000000000001c3b | 210.487 | 55.240 | 70.712 | 1.413 | 0.000 | 0.651 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 82.470 | 127.365 | 0.605 | 82.470 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.792ms; driver.publication 1.782ms; driver.publication 1.400ms; driver.publication 1.345ms; driver.publication 1.264ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.643 | 0.491 | 0.000 | 1.225 | 4.804 | 0.163 | 0.000 | 0.156 | 1.530 | 8.167 | 0.052 | n/a | 0.386 | 11.957 | n/a | n/a | 0.063 | 5.536 | 0.187 | 0.063 |
| p99 | 104.766 | 3.049 | 0.000 | 5.487 | 10.171 | 1.411 | 0.528 | 1.257 | 5.427 | 67.731 | 0.195 | n/a | 3.910 | 93.592 | n/a | n/a | 0.114 | 10.948 | 0.375 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c00000000000001bc | 104.766 | 4.804 | 0.004 | 0.000 | 1.019 | 0.652 | 4.486 | 0.039 | n/a | 0.120 | 93.592 | n/a | n/a | 0.050 | 5.827 | 0.056 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000185 | 96.778 | 4.188 | 0.219 | 0.288 | 0.078 | 1.435 | 67.731 | 0.051 | n/a | 3.910 | 18.829 | n/a | n/a | 0.048 | 4.774 | 0.049 | 0.048 | gw-w/thread-42/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000190 | 69.474 | 3.619 | 0.289 | 0.310 | 0.081 | 4.292 | 50.871 | 0.108 | n/a | 0.186 | 9.649 | n/a | n/a | 0.068 | 4.300 | 0.062 | 0.068 | gw-w/thread-45/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000188 | 49.325 | 4.586 | 0.163 | 0.000 | 0.068 | 1.433 | 19.052 | 0.110 | n/a | 0.147 | 23.716 | n/a | n/a | 0.051 | 4.817 | 0.098 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000017f | 48.504 | 7.280 | 0.018 | 0.000 | 1.257 | 4.182 | 10.661 | 0.195 | n/a | 0.920 | 23.877 | n/a | n/a | 0.114 | 8.555 | 0.176 | 0.114 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001a4 | 42.248 | 6.746 | 0.390 | 0.528 | 0.144 | 2.401 | 20.850 | 0.057 | n/a | 0.531 | 10.500 | n/a | n/a | 0.101 | 7.807 | 0.185 | 0.101 | gw-w/thread-42/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000001c0 | 41.324 | 6.236 | 1.411 | 0.000 | 0.073 | 4.592 | 12.580 | 0.079 | n/a | 0.141 | 16.165 | n/a | n/a | 0.047 | 7.720 | 0.187 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000198 | 40.772 | 4.349 | 0.245 | 0.317 | 0.104 | 1.689 | 11.491 | 0.076 | n/a | 0.107 | 22.335 | n/a | n/a | 0.059 | 5.015 | 0.123 | 0.059 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001a2 | 38.058 | 3.813 | 0.276 | 0.247 | 0.095 | 1.549 | 17.920 | 0.072 | n/a | 0.129 | 13.893 | n/a | n/a | 0.064 | 4.430 | 0.116 | 0.064 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000181 | 37.626 | 3.831 | 0.215 | 0.000 | 0.084 | 4.955 | 13.348 | 0.076 | n/a | 0.140 | 14.918 | n/a | n/a | 0.058 | 4.130 | 0.110 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000019e | 37.023 | 3.663 | 0.294 | 0.286 | 0.077 | 1.684 | 16.625 | 0.124 | n/a | 0.473 | 13.731 | n/a | n/a | 0.065 | 4.321 | 0.117 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001a6 | 36.006 | 4.498 | 0.224 | 0.460 | 0.085 | 2.211 | 16.289 | 0.063 | n/a | 0.099 | 12.024 | n/a | n/a | 0.052 | 5.267 | 0.146 | 0.052 | gw-w/thread-40/gateway.admitted-work | none observed |
| 89b151bc2882e61c000000000000019a | 35.005 | 10.171 | 0.011 | 0.000 | 0.766 | 1.301 | 2.210 | 0.040 | n/a | 0.624 | 19.817 | n/a | n/a | 0.066 | 10.948 | 0.313 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001ba | 34.449 | 4.975 | 0.406 | 0.000 | 0.155 | 1.530 | 15.173 | 0.051 | n/a | 0.125 | 11.957 | n/a | n/a | 0.078 | 5.536 | 0.161 | 0.078 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001b0 | 34.193 | 6.090 | 0.247 | 0.000 | 0.084 | 1.334 | 15.346 | 0.070 | n/a | 0.093 | 10.844 | n/a | n/a | 0.084 | 6.421 | 0.188 | 0.084 | gw-w/thread-40/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000001aa | 33.912 | 5.364 | 0.244 | 0.000 | 0.082 | 5.427 | 12.123 | 0.060 | n/a | 0.881 | 9.684 | n/a | n/a | 0.048 | 5.690 | 0.168 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001b6 | 33.895 | 3.605 | 0.250 | 0.000 | 0.168 | 1.394 | 15.860 | 0.051 | n/a | 0.125 | 12.353 | n/a | n/a | 0.090 | 4.022 | 0.119 | 0.090 | gw-w/thread-40/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000001b4 | 32.309 | 2.976 | 0.190 | 0.000 | 0.065 | 1.232 | 17.518 | 0.079 | n/a | 0.639 | 9.566 | n/a | n/a | 0.043 | 3.231 | 0.100 | 0.043 | gw-w/thread-43/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000001c2 | 32.260 | 3.860 | 0.219 | 0.000 | 0.071 | 1.352 | 14.469 | 0.050 | n/a | 1.455 | 10.733 | n/a | n/a | 0.052 | 4.150 | 0.129 | 0.052 | gw-w/thread-44/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000001cc | 30.643 | 5.271 | 0.254 | 0.000 | 0.069 | 1.866 | 10.482 | 0.121 | n/a | 3.375 | 9.152 | n/a | n/a | 0.051 | 5.594 | 0.183 | 0.051 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.659 | 0.843 | 0.000 | 1.842 | 5.076 | 0.009 | 0.000 | 0.693 | 0.972 | 1.475 | 0.048 | n/a | 0.404 | 8.926 | n/a | n/a | 0.077 | 5.670 | 0.296 | 0.077 |
| p99 | 48.504 | 2.201 | 0.000 | 5.487 | 8.091 | 0.018 | 0.000 | 1.257 | 4.182 | 10.661 | 0.195 | n/a | 3.796 | 23.877 | n/a | n/a | 0.114 | 8.609 | 0.375 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c000000000000017f | 48.504 | 7.280 | 0.018 | 0.000 | 1.257 | 4.182 | 10.661 | 0.195 | n/a | 0.920 | 23.877 | n/a | n/a | 0.114 | 8.555 | 0.176 | 0.114 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000183 | 28.659 | 8.091 | 0.007 | 0.000 | 0.512 | 2.037 | 2.837 | 0.103 | n/a | 0.632 | 14.365 | n/a | n/a | 0.077 | 8.609 | 0.300 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001c6 | 25.395 | 6.317 | 0.010 | 0.000 | 0.724 | 1.114 | 1.278 | 0.038 | n/a | 0.404 | 15.429 | n/a | n/a | 0.082 | 7.050 | 0.278 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000196 | 24.962 | 5.171 | 0.011 | 0.000 | 0.711 | 1.088 | 1.925 | 0.089 | n/a | 3.796 | 12.084 | n/a | n/a | 0.086 | 5.894 | 0.236 | 0.086 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000018e | 21.131 | 3.002 | 0.006 | 0.000 | 0.662 | 3.446 | 1.897 | 0.048 | n/a | 0.114 | 11.916 | n/a | n/a | 0.040 | 3.670 | 0.174 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000194 | 17.659 | 5.251 | 0.012 | 0.000 | 0.406 | 0.972 | 1.475 | 0.043 | n/a | 0.474 | 8.923 | n/a | n/a | 0.102 | 5.670 | 0.321 | 0.102 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001b2 | 17.317 | 5.076 | 0.011 | 0.000 | 1.083 | 0.757 | 1.243 | 0.053 | n/a | 0.086 | 8.926 | n/a | n/a | 0.082 | 6.170 | 0.356 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001be | 16.237 | 4.111 | 0.009 | 0.000 | 0.693 | 0.915 | 1.638 | 0.073 | n/a | 0.273 | 8.450 | n/a | n/a | 0.075 | 4.813 | 0.296 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001a8 | 11.821 | 3.031 | 0.005 | 0.000 | 0.818 | 0.767 | 1.312 | 0.044 | n/a | 0.409 | 5.388 | n/a | n/a | 0.046 | 3.854 | 0.326 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001c9 | 10.332 | 3.458 | 0.005 | 0.000 | 0.408 | 0.787 | 1.104 | 0.036 | n/a | 0.399 | 4.086 | n/a | n/a | 0.050 | 3.871 | 0.375 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.921 | 0.584 | 0.000 | 1.479 | 4.252 | 0.021 | 0.000 | 0.188 | 1.415 | 4.480 | 0.053 | n/a | 0.330 | 11.271 | n/a | n/a | 0.068 | 4.924 | 0.190 | 0.068 |
| p99 | 82.402 | 3.051 | 0.005 | 5.984 | 16.566 | 1.230 | 0.000 | 1.318 | 5.248 | 41.430 | 0.247 | n/a | 4.013 | 26.987 | n/a | n/a | 0.230 | 17.904 | 0.421 | 0.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c00000000000001d8 | 82.402 | 10.136 | 1.230 | 0.000 | 0.441 | 3.716 | 41.430 | 0.233 | n/a | 0.310 | 24.676 | n/a | n/a | 0.230 | 11.808 | 0.143 | 0.230 | gw-w/thread-43/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000001f1 | 57.475 | 16.566 | 0.021 | 0.000 | 1.318 | 3.722 | 25.449 | 0.247 | n/a | 0.478 | 9.606 | n/a | n/a | 0.068 | 17.904 | 0.312 | 0.068 | gw-w/thread-45/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000001db | 51.673 | 5.565 | 0.267 | 0.000 | 0.107 | 2.026 | 30.829 | 0.048 | n/a | 0.511 | 12.255 | n/a | n/a | 0.066 | 5.938 | 0.115 | 0.066 | gw-w/thread-47/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000211 | 45.424 | 4.828 | 0.229 | 0.000 | 0.085 | 1.846 | 10.747 | 0.055 | n/a | 0.576 | 26.987 | n/a | n/a | 0.071 | 5.142 | 0.113 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001d5 | 44.443 | 6.400 | 0.006 | 0.000 | 0.728 | 5.248 | 6.321 | 0.129 | n/a | 0.844 | 24.708 | n/a | n/a | 0.059 | 7.134 | 0.161 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.700ms |
| 89b151bc2882e61c000000000000021b | 42.139 | 4.309 | 0.235 | 0.000 | 0.086 | 1.831 | 18.016 | 0.073 | n/a | 0.506 | 17.025 | n/a | n/a | 0.059 | 4.630 | 0.110 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001fb | 41.228 | 3.662 | 0.201 | 0.000 | 0.080 | 3.144 | 20.294 | 0.075 | n/a | 0.097 | 13.614 | n/a | n/a | 0.062 | 3.943 | 0.096 | 0.062 | gw-w/thread-42/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000217 | 41.067 | 3.983 | 0.223 | 0.000 | 0.115 | 1.415 | 18.442 | 0.078 | n/a | 0.137 | 16.605 | n/a | n/a | 0.068 | 4.321 | 0.105 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000219 | 39.667 | 5.361 | 0.319 | 0.000 | 0.075 | 4.935 | 15.590 | 0.053 | n/a | 2.962 | 10.246 | n/a | n/a | 0.125 | 5.755 | 0.145 | 0.125 | gw-w/thread-47/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000001df | 39.322 | 9.866 | 0.007 | 0.000 | 0.981 | 1.350 | 2.211 | 0.049 | n/a | 0.146 | 24.646 | n/a | n/a | 0.066 | 10.855 | 0.276 | 0.066 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001e0 | 37.806 | 4.461 | 0.278 | 0.000 | 0.140 | 1.656 | 17.252 | 0.058 | n/a | 0.478 | 13.408 | n/a | n/a | 0.075 | 4.879 | 0.129 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.459ms; driver.expected-state.bind-receipt 1.656ms |
| 89b151bc2882e61c00000000000001f5 | 37.799 | 4.638 | 0.210 | 0.000 | 0.075 | 1.733 | 20.692 | 0.138 | n/a | 0.131 | 10.059 | n/a | n/a | 0.124 | 4.924 | 0.130 | 0.124 | gw-w/thread-42/gateway.admitted-work | none observed |
| 89b151bc2882e61c000000000000021f | 35.496 | 4.701 | 0.297 | 0.000 | 0.153 | 1.754 | 13.753 | 0.056 | n/a | 0.462 | 14.182 | n/a | n/a | 0.137 | 5.151 | 0.145 | 0.137 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001ef | 32.969 | 4.013 | 0.258 | 0.000 | 0.139 | 1.411 | 15.428 | 0.053 | n/a | 0.141 | 11.439 | n/a | n/a | 0.086 | 4.411 | 0.134 | 0.086 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000020f | 31.711 | 5.314 | 0.232 | 0.000 | 0.084 | 2.103 | 11.873 | 0.111 | n/a | 0.164 | 11.755 | n/a | n/a | 0.074 | 5.631 | 0.178 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000203 | 31.599 | 3.978 | 0.220 | 0.000 | 0.110 | 1.380 | 12.993 | 0.096 | n/a | 0.206 | 12.568 | n/a | n/a | 0.048 | 4.308 | 0.136 | 0.048 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001f9 | 31.134 | 4.059 | 0.212 | 0.000 | 0.086 | 1.435 | 10.413 | 0.059 | n/a | 0.123 | 14.692 | n/a | n/a | 0.054 | 4.357 | 0.140 | 0.054 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000212 | 28.343 | 4.422 | 0.009 | 0.000 | 1.072 | 1.102 | 1.833 | 0.082 | n/a | 4.013 | 15.747 | n/a | n/a | 0.064 | 5.503 | 0.194 | 0.064 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001d4 | 27.986 | 4.864 | 0.009 | 0.000 | 0.188 | 1.020 | 1.425 | 0.037 | n/a | 0.396 | 19.974 | n/a | n/a | 0.073 | 5.062 | 0.181 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001e5 | 27.145 | 4.730 | 0.288 | 0.000 | 0.136 | 1.728 | 14.452 | 0.085 | n/a | 0.204 | 5.425 | n/a | n/a | 0.095 | 5.155 | 0.190 | 0.095 | gw-w/thread-45/gateway.admitted-work | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.039 | 0.727 | 0.000 | 1.685 | 4.221 | 0.009 | 0.000 | 0.692 | 0.940 | 1.444 | 0.043 | n/a | 0.400 | 9.624 | n/a | n/a | 0.070 | 4.953 | 0.268 | 0.070 |
| p99 | 28.343 | 1.549 | 0.000 | 4.359 | 7.136 | 0.021 | 0.000 | 1.154 | 1.865 | 4.480 | 0.082 | n/a | 4.013 | 19.974 | n/a | n/a | 0.157 | 7.691 | 0.421 | 0.157 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000000212 | 28.343 | 4.422 | 0.009 | 0.000 | 1.072 | 1.102 | 1.833 | 0.082 | n/a | 4.013 | 15.747 | n/a | n/a | 0.064 | 5.503 | 0.194 | 0.064 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001d4 | 27.986 | 4.864 | 0.009 | 0.000 | 0.188 | 1.020 | 1.425 | 0.037 | n/a | 0.396 | 19.974 | n/a | n/a | 0.073 | 5.062 | 0.181 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001d0 | 24.711 | 7.136 | 0.009 | 0.000 | 0.546 | 1.865 | 1.444 | 0.043 | n/a | 0.259 | 13.333 | n/a | n/a | 0.075 | 7.691 | 0.311 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001dd | 20.898 | 4.635 | 0.010 | 0.000 | 1.030 | 0.772 | 4.480 | 0.040 | n/a | 1.069 | 8.816 | n/a | n/a | 0.047 | 5.674 | 0.272 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001e3 | 19.822 | 4.376 | 0.010 | 0.000 | 0.855 | 0.940 | 1.996 | 0.062 | n/a | 0.153 | 11.271 | n/a | n/a | 0.157 | 5.242 | 0.264 | 0.157 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001ff | 19.066 | 3.975 | 0.006 | 0.000 | 0.504 | 0.780 | 1.295 | 0.038 | n/a | 0.435 | 11.952 | n/a | n/a | 0.081 | 4.485 | 0.235 | 0.081 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001e6 | 18.226 | 4.174 | 0.007 | 0.000 | 0.577 | 0.776 | 1.219 | 0.043 | n/a | 0.658 | 10.720 | n/a | n/a | 0.053 | 4.758 | 0.261 | 0.053 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001eb | 18.039 | 4.091 | 0.007 | 0.000 | 0.382 | 1.478 | 1.762 | 0.049 | n/a | 0.144 | 10.070 | n/a | n/a | 0.055 | 4.481 | 0.248 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000021d | 17.177 | 2.930 | 0.006 | 0.000 | 0.985 | 1.103 | 1.463 | 0.048 | n/a | 0.886 | 9.624 | n/a | n/a | 0.133 | 3.921 | 0.228 | 0.133 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001f7 | 16.133 | 3.923 | 0.010 | 0.000 | 0.389 | 0.826 | 2.438 | 0.045 | n/a | 0.108 | 8.345 | n/a | n/a | 0.049 | 4.323 | 0.268 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000205 | 16.078 | 4.452 | 0.011 | 0.000 | 0.386 | 0.765 | 1.173 | 0.037 | n/a | 0.175 | 9.008 | n/a | n/a | 0.071 | 4.849 | 0.302 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001ce | 14.857 | 3.913 | 0.009 | 0.000 | 1.154 | 1.079 | 2.096 | 0.059 | n/a | 0.460 | 6.021 | n/a | n/a | 0.067 | 5.076 | 0.342 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000001e9 | 12.815 | 4.221 | 0.006 | 0.000 | 1.105 | 0.881 | 1.259 | 0.044 | n/a | 0.758 | 4.469 | n/a | n/a | 0.070 | 5.333 | 0.416 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000208 | 12.474 | 3.470 | 0.021 | 0.000 | 0.872 | 0.871 | 1.141 | 0.036 | n/a | 0.330 | 5.676 | n/a | n/a | 0.058 | 4.363 | 0.350 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000020d | 11.752 | 4.252 | 0.009 | 0.000 | 0.692 | 1.043 | 1.144 | 0.039 | n/a | 0.400 | 4.103 | n/a | n/a | 0.070 | 4.953 | 0.421 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.708 | 1.002 | 0.000 | 1.722 | 4.794 | 0.012 | 0.000 | 0.364 | 1.454 | 4.506 | 0.053 | n/a | 0.364 | 10.296 | n/a | n/a | 0.064 | 5.404 | 0.233 | 0.064 |
| p99 | 140.043 | 4.710 | 0.008 | 6.396 | 11.532 | 0.428 | 0.000 | 4.965 | 5.475 | 28.327 | 3.718 | n/a | 3.887 | 131.670 | n/a | n/a | 0.140 | 12.229 | 0.469 | 0.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000000223 | 140.043 | 4.585 | 0.007 | 0.000 | 0.723 | 0.820 | 2.011 | 0.070 | n/a | 0.108 | 131.670 | n/a | n/a | 0.050 | 5.315 | 0.038 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000242 | 55.579 | 6.143 | 0.428 | 0.000 | 0.135 | 2.770 | 28.327 | 0.089 | n/a | 0.760 | 16.810 | n/a | n/a | 0.117 | 6.705 | 0.121 | 0.117 | gw-w/thread-45/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000246 | 47.887 | 4.052 | 0.282 | 0.000 | 0.098 | 1.752 | 12.378 | 0.063 | n/a | 0.721 | 28.453 | n/a | n/a | 0.088 | 4.432 | 0.093 | 0.088 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000234 | 47.016 | 4.984 | 0.318 | 0.000 | 0.072 | 1.502 | 23.494 | 0.048 | n/a | 0.426 | 16.116 | n/a | n/a | 0.056 | 5.374 | 0.114 | 0.056 | gw-w/thread-45/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000244 | 46.061 | 6.524 | 0.333 | 0.000 | 0.072 | 2.602 | 22.472 | 0.065 | n/a | 0.342 | 13.560 | n/a | n/a | 0.092 | 6.928 | 0.150 | 0.092 | gw-w/thread-43/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000273 | 43.314 | 4.041 | 0.223 | 0.000 | 0.080 | 1.350 | 18.255 | 0.080 | n/a | 0.173 | 19.067 | n/a | n/a | 0.045 | 4.344 | 0.100 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000024b | 42.984 | 4.575 | 0.009 | 0.000 | 1.375 | 2.365 | 1.240 | 3.718 | n/a | 0.070 | 29.589 | n/a | n/a | 0.043 | 5.959 | 0.139 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.857ms |
| 89b151bc2882e61c0000000000000222 | 42.310 | 4.212 | 0.244 | 0.000 | 0.140 | 1.501 | 13.590 | 0.061 | n/a | 0.152 | 22.311 | n/a | n/a | 0.098 | 4.596 | 0.109 | 0.098 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000024a | 40.591 | 7.976 | 0.034 | 0.000 | 1.457 | 3.151 | 4.506 | 0.050 | n/a | 3.887 | 19.455 | n/a | n/a | 0.075 | 9.467 | 0.233 | 0.075 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000022c | 39.154 | 4.223 | 0.221 | 0.000 | 0.108 | 2.354 | 10.822 | 0.048 | n/a | 0.938 | 20.351 | n/a | n/a | 0.088 | 4.552 | 0.116 | 0.088 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000027f | 38.581 | 6.441 | 0.422 | 0.000 | 0.072 | 2.007 | 13.614 | 0.049 | n/a | 0.134 | 15.787 | n/a | n/a | 0.054 | 6.935 | 0.180 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000025c | 37.667 | 8.707 | 0.005 | 0.000 | 0.077 | 0.804 | 6.807 | 0.054 | n/a | 0.567 | 20.611 | n/a | n/a | 0.035 | 8.789 | 0.233 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000264 | 37.133 | 4.469 | 0.360 | 0.000 | 0.048 | 1.051 | 12.056 | 0.050 | n/a | 0.396 | 18.649 | n/a | n/a | 0.053 | 4.877 | 0.131 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000027b | 36.084 | 3.592 | 0.217 | 0.000 | 0.027 | 1.208 | 13.333 | 0.053 | n/a | 0.370 | 17.253 | n/a | n/a | 0.032 | 3.835 | 0.106 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000231 | 35.499 | 4.855 | 0.006 | 0.000 | 0.404 | 1.063 | 9.972 | 0.036 | n/a | 0.457 | 18.656 | n/a | n/a | 0.049 | 5.266 | 0.148 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000250 | 32.100 | 4.351 | 0.360 | 0.000 | 0.066 | 1.609 | 13.470 | 0.062 | n/a | 0.191 | 11.918 | n/a | n/a | 0.073 | 4.777 | 0.149 | 0.073 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000023e | 32.026 | 5.931 | 0.008 | 0.000 | 4.965 | 2.346 | 4.695 | 0.130 | n/a | 0.276 | 13.605 | n/a | n/a | 0.069 | 10.904 | 0.340 | 0.069 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000025a | 30.996 | 4.653 | 0.221 | 0.000 | 0.096 | 1.835 | 16.509 | 0.094 | n/a | 0.102 | 7.428 | n/a | n/a | 0.057 | 4.971 | 0.160 | 0.057 | gw-w/thread-40/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000285 | 30.942 | 3.909 | 0.275 | 0.000 | 0.150 | 1.454 | 11.663 | 0.049 | n/a | 0.146 | 13.221 | n/a | n/a | 0.075 | 4.333 | 0.140 | 0.075 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000023c | 30.892 | 5.231 | 0.252 | 0.000 | 0.108 | 1.767 | 8.766 | 0.797 | n/a | 0.212 | 13.693 | n/a | n/a | 0.068 | 5.591 | 0.181 | 0.068 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.248 | 1.092 | 0.000 | 1.820 | 4.340 | 0.006 | 0.000 | 0.920 | 1.015 | 1.677 | 0.053 | n/a | 0.400 | 6.417 | n/a | n/a | 0.061 | 5.277 | 0.286 | 0.061 |
| p99 | 42.984 | 1.936 | 0.008 | 2.464 | 5.586 | 0.018 | 0.000 | 1.375 | 5.475 | 15.829 | 3.718 | n/a | 3.503 | 29.589 | n/a | n/a | 0.140 | 6.495 | 0.414 | 0.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c000000000000024b | 42.984 | 4.575 | 0.009 | 0.000 | 1.375 | 2.365 | 1.240 | 3.718 | n/a | 0.070 | 29.589 | n/a | n/a | 0.043 | 5.959 | 0.139 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.857ms |
| 89b151bc2882e61c000000000000026a | 30.088 | 4.794 | 0.005 | 0.000 | 1.124 | 5.475 | 15.829 | 0.070 | n/a | 0.250 | 2.499 | n/a | n/a | 0.044 | 5.923 | 0.197 | 0.044 | gw-w/thread-40/gateway.admitted-work | none observed |
| 89b151bc2882e61c000000000000022e | 23.599 | 3.514 | 0.006 | 0.000 | 0.369 | 1.015 | 1.841 | 0.071 | n/a | 3.503 | 13.234 | n/a | n/a | 0.048 | 3.888 | 0.165 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000221 | 22.415 | 4.815 | 0.007 | 0.000 | 0.978 | 4.367 | 8.679 | 0.586 | n/a | 0.500 | 2.426 | n/a | n/a | 0.058 | 5.799 | 0.259 | 0.058 | node-14/thread-0/socket.wait-first-byte | none observed |
| 89b151bc2882e61c0000000000000265 | 18.856 | 3.642 | 0.006 | 0.000 | 1.104 | 2.092 | 2.111 | 0.081 | n/a | 1.875 | 7.899 | n/a | n/a | 0.046 | 4.752 | 0.252 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000277 | 18.667 | 5.586 | 0.013 | 0.000 | 0.689 | 0.974 | 1.757 | 0.073 | n/a | 0.434 | 9.052 | n/a | n/a | 0.087 | 6.289 | 0.337 | 0.087 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000254 | 18.476 | 5.364 | 0.013 | 0.000 | 1.008 | 1.198 | 4.564 | 0.097 | n/a | 0.239 | 5.896 | n/a | n/a | 0.096 | 6.385 | 0.346 | 0.096 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000027d | 18.387 | 3.897 | 0.005 | 0.000 | 1.049 | 0.808 | 1.467 | 0.034 | n/a | 0.389 | 10.677 | n/a | n/a | 0.061 | 4.951 | 0.269 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000022a | 17.248 | 3.604 | 0.006 | 0.000 | 0.364 | 1.091 | 1.352 | 0.039 | n/a | 0.362 | 10.368 | n/a | n/a | 0.063 | 3.974 | 0.230 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000240 | 17.040 | 4.340 | 0.018 | 0.000 | 0.920 | 3.942 | 1.630 | 0.039 | n/a | 0.402 | 5.698 | n/a | n/a | 0.052 | 5.277 | 0.310 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000025e | 16.167 | 5.475 | 0.010 | 0.000 | 1.010 | 0.945 | 1.432 | 0.038 | n/a | 1.334 | 5.854 | n/a | n/a | 0.069 | 6.495 | 0.402 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000236 | 16.078 | 4.330 | 0.010 | 0.000 | 0.332 | 0.990 | 1.277 | 0.038 | n/a | 0.400 | 8.562 | n/a | n/a | 0.140 | 4.671 | 0.291 | 0.140 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000260 | 15.167 | 4.753 | 0.004 | 0.000 | 1.109 | 0.851 | 3.746 | 0.044 | n/a | 0.085 | 4.517 | n/a | n/a | 0.057 | 5.867 | 0.387 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000226 | 14.727 | 3.209 | 0.006 | 0.000 | 0.607 | 0.894 | 1.741 | 0.053 | n/a | 0.517 | 7.657 | n/a | n/a | 0.042 | 3.822 | 0.259 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000283 | 14.162 | 3.905 | 0.006 | 0.000 | 0.139 | 0.900 | 1.677 | 0.053 | n/a | 1.669 | 5.749 | n/a | n/a | 0.064 | 4.050 | 0.286 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000026f | 13.860 | 4.894 | 0.006 | 0.000 | 0.835 | 1.368 | 1.333 | 0.040 | n/a | 0.182 | 5.105 | n/a | n/a | 0.095 | 5.735 | 0.414 | 0.095 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000281 | 13.599 | 3.821 | 0.005 | 0.000 | 0.790 | 0.806 | 1.530 | 0.039 | n/a | 0.113 | 6.417 | n/a | n/a | 0.078 | 4.616 | 0.339 | 0.078 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.968 | 0.523 | 0.000 | 0.953 | 4.191 | 0.012 | 0.000 | 0.119 | 1.239 | 4.951 | 0.050 | n/a | 0.201 | 10.639 | n/a | n/a | 0.064 | 4.781 | 0.202 | 0.064 |
| p99 | 174.524 | 2.906 | 0.005 | 4.477 | 8.697 | n/a | 0.000 | 1.836 | 5.099 | 146.952 | 0.209 | n/a | 3.906 | 36.564 | n/a | n/a | 0.115 | 8.973 | 0.409 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c00000000000002d5 | 174.524 | 3.875 | 0.224 | 0.000 | 0.082 | 1.348 | 146.952 | 0.104 | n/a | 0.201 | 21.684 | n/a | n/a | 0.055 | 4.180 | 0.024 | 0.055 | gw-w/thread-40/commit.prepare-and-validate | none observed |
| 89b151bc2882e61c0000000000000295 | 65.419 | 8.697 | 0.260 | 0.000 | 0.017 | 1.490 | 18.166 | 0.068 | n/a | 0.104 | 36.564 | n/a | n/a | 0.053 | 8.973 | 0.137 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.163ms |
| 89b151bc2882e61c000000000000029a | 47.585 | 4.162 | 0.301 | 0.000 | 0.160 | 2.504 | 27.497 | 0.069 | n/a | 0.617 | 12.169 | n/a | n/a | 0.107 | 4.623 | 0.097 | 0.107 | gw-w/thread-46/gateway.admitted-work | none observed |
| 89b151bc2882e61c00000000000002c4 | 44.797 | 4.639 | 0.364 | 0.000 | 0.095 | 1.346 | 13.790 | 0.049 | n/a | 0.078 | 24.342 | n/a | n/a | 0.093 | 5.099 | 0.114 | 0.093 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002c0 | 40.194 | 5.130 | 0.242 | 0.000 | 0.107 | 1.635 | 14.596 | 0.046 | n/a | 3.521 | 14.857 | n/a | n/a | 0.060 | 5.479 | 0.136 | 0.060 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002b4 | 39.044 | 7.706 | 0.202 | 0.000 | 0.079 | 1.573 | 11.342 | 0.045 | n/a | 0.081 | 17.963 | n/a | n/a | 0.053 | 7.987 | 0.205 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000289 | 38.240 | 3.348 | 0.270 | 0.000 | 0.114 | 2.223 | 19.017 | 0.060 | n/a | 0.193 | 12.947 | n/a | n/a | 0.067 | 3.733 | 0.098 | 0.067 | gw-w/thread-40/gateway.admitted-work | none observed |
| 89b151bc2882e61c000000000000029c | 37.071 | 5.311 | 0.230 | 0.000 | 0.081 | 5.099 | 12.374 | 0.056 | n/a | 3.054 | 10.789 | n/a | n/a | 0.076 | 5.623 | 0.152 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002ae | 36.891 | 3.791 | 0.312 | 0.000 | 0.075 | 1.637 | 13.702 | 0.052 | n/a | 0.464 | 16.811 | n/a | n/a | 0.047 | 4.178 | 0.113 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002cc | 33.690 | 4.722 | 0.229 | 0.000 | 0.119 | 1.760 | 12.974 | 0.059 | n/a | 0.210 | 13.551 | n/a | n/a | 0.067 | 5.069 | 0.150 | 0.067 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002ac | 32.955 | 4.365 | 0.189 | 0.000 | 0.021 | 2.496 | 11.247 | 0.060 | n/a | 0.208 | 14.335 | n/a | n/a | 0.034 | 4.575 | 0.139 | 0.034 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002a6 | 30.705 | 3.410 | 0.187 | 0.000 | 0.064 | 1.365 | 14.265 | 0.062 | n/a | 0.131 | 11.161 | n/a | n/a | 0.060 | 3.661 | 0.119 | 0.060 | gw-w/thread-46/gateway.admitted-work | none observed |
| 89b151bc2882e61c000000000000028e | 30.212 | 4.563 | 0.360 | 0.000 | 0.019 | 1.425 | 10.984 | 0.050 | n/a | 0.912 | 11.845 | n/a | n/a | 0.054 | 4.942 | 0.164 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.133ms; driver.expected-state.bind-receipt 1.039ms |
| 89b151bc2882e61c00000000000002a2 | 28.580 | 3.881 | 0.266 | 0.000 | 0.094 | 1.557 | 15.513 | 0.065 | n/a | 0.198 | 6.918 | n/a | n/a | 0.089 | 4.240 | 0.148 | 0.089 | gw-w/thread-40/gateway.admitted-work | none observed |
| 89b151bc2882e61c0000000000000294 | 28.578 | 3.971 | 0.010 | 0.000 | 0.438 | 1.384 | 2.623 | 0.209 | n/a | 0.781 | 19.111 | n/a | n/a | 0.051 | 4.419 | 0.155 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002d7 | 27.711 | 3.539 | 0.316 | 0.000 | 0.067 | 1.353 | 11.185 | 0.048 | n/a | 0.304 | 10.832 | n/a | n/a | 0.065 | 3.923 | 0.142 | 0.065 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002d3 | 27.505 | 3.604 | 0.291 | 0.000 | 0.107 | 1.197 | 10.475 | 0.081 | n/a | 0.241 | 11.395 | n/a | n/a | 0.115 | 4.002 | 0.145 | 0.115 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000292 | 26.816 | 6.217 | 0.010 | 0.000 | 0.576 | 2.515 | 3.145 | 0.137 | n/a | 3.906 | 10.260 | n/a | n/a | 0.052 | 6.803 | 0.254 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002ba | 26.780 | 3.641 | 0.285 | 0.000 | 0.103 | 1.260 | 15.573 | 0.084 | n/a | 0.217 | 5.539 | n/a | n/a | 0.079 | 4.029 | 0.150 | 0.079 | gw-w/thread-47/gateway.admitted-work | none observed |
| 89b151bc2882e61c000000000000028d | 26.765 | 6.419 | 0.007 | 0.000 | 0.073 | 0.741 | 1.592 | 0.041 | n/a | 0.114 | 17.692 | n/a | n/a | 0.087 | 6.498 | 0.243 | 0.087 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.383 | 0.833 | 0.000 | 1.606 | 3.900 | 0.010 | 0.000 | 0.542 | 0.904 | 1.330 | 0.042 | n/a | 0.144 | 6.517 | n/a | n/a | 0.064 | 4.781 | 0.299 | 0.064 |
| p99 | 28.578 | 2.071 | 0.005 | 2.110 | 5.431 | n/a | 0.000 | 1.836 | 4.684 | 5.985 | 0.209 | n/a | 1.655 | 19.111 | n/a | n/a | 0.088 | 6.488 | 0.409 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000000294 | 28.578 | 3.971 | 0.010 | 0.000 | 0.438 | 1.384 | 2.623 | 0.209 | n/a | 0.781 | 19.111 | n/a | n/a | 0.051 | 4.419 | 0.155 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002ca | 20.257 | 4.404 | 0.010 | 0.000 | 0.865 | 0.969 | 1.985 | 0.054 | n/a | 1.655 | 10.251 | n/a | n/a | 0.064 | 5.279 | 0.261 | 0.064 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002be | 18.106 | 5.049 | 0.011 | 0.000 | 0.171 | 0.822 | 1.203 | 0.035 | n/a | 0.109 | 10.639 | n/a | n/a | 0.068 | 5.230 | 0.289 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002c2 | 16.679 | 5.431 | 0.010 | 0.000 | 1.046 | 1.005 | 1.196 | 0.033 | n/a | 1.316 | 6.554 | n/a | n/a | 0.088 | 6.488 | 0.389 | 0.088 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002b8 | 16.273 | 3.069 | 0.006 | 0.000 | 1.836 | 0.808 | 4.348 | 0.067 | n/a | 0.138 | 5.956 | n/a | n/a | 0.044 | 4.911 | 0.302 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002bc | 15.978 | 4.739 | 0.012 | 0.000 | 0.534 | 0.863 | 1.198 | 0.054 | n/a | 0.119 | 8.373 | n/a | n/a | 0.085 | 5.285 | 0.331 | 0.085 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002a4 | 15.253 | 5.195 | 0.011 | 0.000 | 0.542 | 0.904 | 1.183 | 0.047 | n/a | 0.144 | 7.154 | n/a | n/a | 0.075 | 5.748 | 0.377 | 0.075 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002b0 | 14.383 | 3.136 | 0.006 | 0.000 | 1.152 | 0.576 | 1.180 | 0.042 | n/a | 0.092 | 8.112 | n/a | n/a | 0.086 | 4.294 | 0.299 | 0.086 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002ce | 13.352 | 1.808 | n/a | 0.000 | 0.764 | 4.684 | 5.985 | 0.018 | n/a | 0.045 | 0.000 | n/a | n/a | 0.048 | 2.572 | 0.193 | 0.048 | node-14/thread-0/socket.wait-first-byte | none observed |
| 89b151bc2882e61c000000000000029d | 13.081 | 3.631 | 0.005 | 0.000 | 0.796 | 0.987 | 1.917 | 0.062 | n/a | 0.826 | 4.816 | n/a | n/a | 0.041 | 4.432 | 0.339 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000287 | 12.581 | 3.900 | 0.008 | 0.000 | 0.873 | 1.023 | 1.330 | 0.043 | n/a | 0.438 | 4.893 | n/a | n/a | 0.073 | 4.781 | 0.380 | 0.073 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002a7 | 11.917 | 2.959 | 0.005 | 0.000 | 0.260 | 0.633 | 1.363 | 0.034 | n/a | 0.104 | 6.517 | n/a | n/a | 0.042 | 3.224 | 0.271 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002a0 | 11.827 | 4.451 | 0.010 | 0.000 | 0.370 | 0.941 | 1.215 | 0.036 | n/a | 0.438 | 4.297 | n/a | n/a | 0.070 | 4.832 | 0.409 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c00000000000002c7 | 9.897 | 2.595 | 0.005 | 0.000 | 0.102 | 0.548 | 1.951 | 0.033 | n/a | 0.378 | 4.252 | n/a | n/a | 0.032 | 2.702 | 0.273 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (865 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.363 | 0.834 | 0.000 | 1.639 | 3.676 | 0.005 | 0.000 | 0.732 | 0.836 | 1.245 | 0.036 | n/a | 0.146 | 7.105 | n/a | n/a | 0.039 | 4.767 | 0.307 | 0.039 |
| p99 | 86.105 | 3.242 | 0.064 | 4.284 | 10.441 | 0.546 | 0.000 | 28.353 | 17.230 | 14.371 | 3.459 | n/a | 3.425 | 59.939 | n/a | n/a | 0.140 | 33.260 | 0.675 | 0.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000000631 | 157.949 | 2.691 | 0.004 | 0.000 | 62.016 | 40.141 | 1.625 | 0.054 | n/a | 0.260 | 51.128 | n/a | n/a | 0.030 | 64.711 | 0.410 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.585ms; driver.publication 1.558ms; driver.publication 1.541ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms |
| 89b151bc2882e61c0000000000000635 | 118.728 | 4.803 | 0.004 | 0.000 | 104.472 | 0.864 | 1.491 | 0.056 | n/a | 0.224 | 6.767 | n/a | n/a | 0.046 | 109.280 | 0.920 | 0.046 | node-14/thread-0/driver.queue.subject | driver.publication 1.585ms; driver.publication 1.558ms; driver.publication 1.541ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms |
| 89b151bc2882e61c0000000000000634 | 110.003 | 9.356 | 0.009 | 0.000 | 0.590 | 47.261 | 2.542 | 0.033 | n/a | 0.077 | 50.062 | n/a | n/a | 0.073 | 9.954 | 0.090 | 0.073 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.585ms; driver.publication 1.558ms; driver.publication 1.541ms; driver.publication 1.265ms; driver.publication 1.123ms |
| 89b151bc2882e61c0000000000000639 | 101.411 | 4.352 | 0.009 | 0.000 | 6.816 | 46.774 | 3.253 | 0.052 | n/a | 0.969 | 39.143 | n/a | n/a | 0.042 | 11.178 | 0.110 | 0.042 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.558ms; driver.publication 1.541ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms; driver.publication 1.123ms |
| 89b151bc2882e61c000000000000063a | 100.083 | 9.325 | 0.233 | 0.000 | 2.910 | 46.883 | 0.737 | 0.417 | n/a | 0.186 | 39.356 | n/a | n/a | 0.036 | 12.468 | 0.125 | 0.036 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.558ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms; driver.publication 1.123ms; driver.publication 1.087ms |
| 89b151bc2882e61c0000000000000453 | 88.463 | 2.845 | 0.005 | 0.000 | 4.653 | 0.416 | 1.026 | 0.037 | n/a | 0.093 | 79.361 | n/a | n/a | 0.028 | 7.503 | 0.085 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.707ms; driver.publication 1.079ms; driver.publication 1.048ms; driver.publication 1.041ms |
| 89b151bc2882e61c000000000000062e | 88.124 | 5.542 | 0.008 | 0.000 | 0.161 | 0.938 | 1.106 | 0.029 | n/a | 0.133 | 80.143 | n/a | n/a | 0.063 | 5.711 | 0.065 | 0.063 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000099f | 86.248 | 6.719 | 0.012 | 0.000 | 26.529 | 5.098 | 4.406 | 3.459 | n/a | 2.359 | 37.641 | n/a | n/a | 0.024 | 33.260 | 0.386 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.493ms; driver.publication 2.060ms; driver.publication 1.186ms; driver.publication 1.124ms; driver.publication 1.098ms |
| 89b151bc2882e61c000000000000063d | 86.105 | 2.653 | 0.004 | 0.000 | 8.952 | 45.431 | 0.838 | 0.030 | n/a | 0.380 | 27.790 | n/a | n/a | 0.027 | 11.610 | 0.135 | 0.027 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.558ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms; driver.publication 1.123ms; driver.publication 1.087ms |
| 89b151bc2882e61c00000000000004fa | 85.361 | 16.573 | 0.010 | 0.000 | 0.052 | 9.728 | 1.494 | 0.037 | n/a | 1.548 | 55.859 | n/a | n/a | 0.060 | 16.635 | 0.195 | 0.060 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 1.875ms; driver.publication 1.458ms |
| 89b151bc2882e61c000000000000062f | 84.941 | 4.531 | 0.005 | 0.000 | 0.485 | 3.500 | 1.609 | 0.035 | n/a | 0.181 | 74.546 | n/a | n/a | 0.049 | 5.021 | 0.059 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.585ms |
| 89b151bc2882e61c0000000000000473 | 84.569 | 2.456 | 0.005 | 0.000 | 17.591 | 2.940 | 0.737 | 0.039 | n/a | 0.128 | 60.646 | n/a | n/a | 0.026 | 20.053 | 0.237 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.107ms; driver.publication 1.341ms; driver.publication 1.304ms; driver.publication 1.151ms; driver.publication 1.137ms |
| 89b151bc2882e61c0000000000000632 | 83.600 | 9.533 | 0.011 | 0.000 | 0.877 | 21.349 | 2.393 | 0.080 | n/a | 0.185 | 49.084 | n/a | n/a | 0.090 | 10.421 | 0.125 | 0.090 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.585ms; driver.publication 1.541ms; driver.publication 1.265ms |
| 89b151bc2882e61c0000000000000477 | 82.124 | 4.839 | 0.223 | 0.000 | 1.870 | 6.297 | 0.635 | 0.031 | n/a | 0.058 | 68.155 | n/a | n/a | 0.017 | 6.931 | 0.084 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.107ms; driver.publication 1.304ms; driver.publication 1.151ms; driver.publication 1.137ms; driver.publication 1.012ms |
| 89b151bc2882e61c000000000000063e | 81.559 | 2.990 | 0.003 | 0.000 | 66.716 | 0.545 | 0.851 | 0.022 | n/a | 0.203 | 10.191 | n/a | n/a | 0.038 | 69.709 | 0.855 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 2.370ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms; driver.publication 1.087ms; driver.publication 1.037ms |
| 89b151bc2882e61c0000000000000451 | 80.112 | 6.871 | 0.006 | 0.000 | 1.098 | 0.815 | 1.506 | 0.036 | n/a | 0.086 | 69.659 | n/a | n/a | 0.036 | 7.974 | 0.100 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.079ms; driver.publication 1.041ms |
| 89b151bc2882e61c0000000000000633 | 79.557 | 4.561 | 0.005 | 0.000 | 1.120 | 17.230 | 1.396 | 0.031 | n/a | 0.076 | 55.100 | n/a | n/a | 0.038 | 5.686 | 0.071 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.585ms; driver.publication 1.558ms; driver.publication 1.541ms; driver.publication 1.265ms |
| 89b151bc2882e61c0000000000000456 | 78.356 | 6.411 | 0.009 | 0.000 | 2.689 | 3.139 | 5.906 | 0.100 | n/a | 0.131 | 59.939 | n/a | n/a | 0.033 | 9.108 | 0.116 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.707ms; driver.publication 1.048ms; driver.publication 1.000ms |
| 89b151bc2882e61c0000000000000455 | 77.125 | 5.553 | 0.011 | 0.000 | 0.204 | 1.541 | 1.713 | 0.046 | n/a | 0.451 | 67.543 | n/a | n/a | 0.062 | 5.768 | 0.075 | 0.062 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.707ms; driver.publication 1.048ms; driver.publication 1.000ms |
| 89b151bc2882e61c00000000000004fb | 75.308 | 3.887 | 0.006 | 0.000 | 1.112 | 13.417 | 1.352 | 0.039 | n/a | 0.365 | 55.067 | n/a | n/a | 0.063 | 5.005 | 0.066 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 12.832ms; driver.publication 1.875ms; driver.publication 1.458ms |

## P2 / L1024 / commit / 5-10 facts (506 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.690 | 0.682 | 0.000 | 1.483 | 3.200 | 0.004 | 0.000 | 0.742 | 0.837 | 1.061 | 0.036 | n/a | 0.142 | 6.498 | n/a | n/a | 0.039 | 4.184 | 0.298 | 0.039 |
| p99 | 84.569 | 2.124 | 0.057 | 3.784 | 7.130 | 0.223 | 0.000 | 33.135 | 13.417 | 6.559 | 3.305 | n/a | 2.999 | 51.128 | n/a | n/a | 0.140 | 36.760 | 0.676 | 0.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000000631 | 157.949 | 2.691 | 0.004 | 0.000 | 62.016 | 40.141 | 1.625 | 0.054 | n/a | 0.260 | 51.128 | n/a | n/a | 0.030 | 64.711 | 0.410 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.585ms; driver.publication 1.558ms; driver.publication 1.541ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms |
| 89b151bc2882e61c0000000000000635 | 118.728 | 4.803 | 0.004 | 0.000 | 104.472 | 0.864 | 1.491 | 0.056 | n/a | 0.224 | 6.767 | n/a | n/a | 0.046 | 109.280 | 0.920 | 0.046 | node-14/thread-0/driver.queue.subject | driver.publication 1.585ms; driver.publication 1.558ms; driver.publication 1.541ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms |
| 89b151bc2882e61c0000000000000639 | 101.411 | 4.352 | 0.009 | 0.000 | 6.816 | 46.774 | 3.253 | 0.052 | n/a | 0.969 | 39.143 | n/a | n/a | 0.042 | 11.178 | 0.110 | 0.042 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.558ms; driver.publication 1.541ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms; driver.publication 1.123ms |
| 89b151bc2882e61c0000000000000453 | 88.463 | 2.845 | 0.005 | 0.000 | 4.653 | 0.416 | 1.026 | 0.037 | n/a | 0.093 | 79.361 | n/a | n/a | 0.028 | 7.503 | 0.085 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.707ms; driver.publication 1.079ms; driver.publication 1.048ms; driver.publication 1.041ms |
| 89b151bc2882e61c000000000000063d | 86.105 | 2.653 | 0.004 | 0.000 | 8.952 | 45.431 | 0.838 | 0.030 | n/a | 0.380 | 27.790 | n/a | n/a | 0.027 | 11.610 | 0.135 | 0.027 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.558ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms; driver.publication 1.123ms; driver.publication 1.087ms |
| 89b151bc2882e61c0000000000000473 | 84.569 | 2.456 | 0.005 | 0.000 | 17.591 | 2.940 | 0.737 | 0.039 | n/a | 0.128 | 60.646 | n/a | n/a | 0.026 | 20.053 | 0.237 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.107ms; driver.publication 1.341ms; driver.publication 1.304ms; driver.publication 1.151ms; driver.publication 1.137ms |
| 89b151bc2882e61c0000000000000477 | 82.124 | 4.839 | 0.223 | 0.000 | 1.870 | 6.297 | 0.635 | 0.031 | n/a | 0.058 | 68.155 | n/a | n/a | 0.017 | 6.931 | 0.084 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.107ms; driver.publication 1.304ms; driver.publication 1.151ms; driver.publication 1.137ms; driver.publication 1.012ms |
| 89b151bc2882e61c000000000000063e | 81.559 | 2.990 | 0.003 | 0.000 | 66.716 | 0.545 | 0.851 | 0.022 | n/a | 0.203 | 10.191 | n/a | n/a | 0.038 | 69.709 | 0.855 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 2.370ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms; driver.publication 1.087ms; driver.publication 1.037ms |
| 89b151bc2882e61c00000000000004fb | 75.308 | 3.887 | 0.006 | 0.000 | 1.112 | 13.417 | 1.352 | 0.039 | n/a | 0.365 | 55.067 | n/a | n/a | 0.063 | 5.005 | 0.066 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 12.832ms; driver.publication 1.875ms; driver.publication 1.458ms |
| 89b151bc2882e61c0000000000000630 | 74.290 | 4.375 | 0.004 | 0.000 | 0.340 | 7.674 | 0.760 | 0.030 | n/a | 0.131 | 60.917 | n/a | n/a | 0.061 | 4.719 | 0.064 | 0.061 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 1.585ms; driver.publication 1.265ms |
| 89b151bc2882e61c000000000000063f | 63.356 | 3.764 | 0.007 | 0.000 | 51.078 | 0.695 | 0.897 | 0.034 | n/a | 0.083 | 6.721 | n/a | n/a | 0.078 | 54.849 | 0.866 | 0.078 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.370ms; driver.publication 1.411ms; driver.expected-state.bind-receipt 1.333ms; driver.publication 1.181ms; driver.publication 1.087ms |
| 89b151bc2882e61c000000000000082b | 61.447 | 3.521 | 0.004 | 0.000 | 41.256 | 4.362 | 2.408 | 0.032 | n/a | 0.103 | 9.711 | n/a | n/a | 0.051 | 44.781 | 0.729 | 0.051 | node-14/thread-0/driver.queue.subject | driver.publication 2.848ms; driver.publication 1.951ms; driver.publication 1.881ms; driver.publication 1.214ms; driver.publication 1.068ms |
| 89b151bc2882e61c000000000000041c | 59.559 | 2.881 | 0.005 | 0.000 | 33.135 | 0.861 | 6.559 | 0.095 | n/a | 0.102 | 15.877 | n/a | n/a | 0.044 | 36.021 | 0.605 | 0.044 | node-14/thread-0/driver.queue.subject | driver.publication 2.457ms; driver.expected-state.bind-receipt 1.754ms; driver.publication 1.202ms; driver.publication 1.147ms; driver.publication 1.114ms |
| 89b151bc2882e61c0000000000000424 | 56.463 | 6.412 | 0.115 | 0.000 | 5.042 | 3.994 | 0.804 | 3.340 | n/a | 0.267 | 36.465 | n/a | n/a | 0.023 | 11.569 | 0.205 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.754ms; driver.publication 1.582ms; driver.publication 1.147ms; driver.publication 1.059ms; driver.publication 1.019ms |
| 89b151bc2882e61c0000000000000718 | 53.700 | 3.457 | 0.004 | 0.000 | 0.926 | 1.897 | 2.310 | 0.041 | n/a | 0.411 | 44.586 | n/a | n/a | 0.067 | 4.387 | 0.082 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000000719 | 50.905 | 3.294 | 0.005 | 0.000 | 0.615 | 9.062 | 2.197 | 0.031 | n/a | 1.593 | 34.044 | n/a | n/a | 0.064 | 3.914 | 0.077 | 0.064 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 1.157ms |
| 89b151bc2882e61c0000000000000746 | 50.335 | 4.592 | 0.003 | 0.000 | 32.166 | 3.483 | 0.688 | 0.026 | n/a | 0.103 | 9.250 | n/a | n/a | 0.024 | 36.760 | 0.730 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication 1.324ms; driver.publication 1.178ms |
| 89b151bc2882e61c000000000000038a | 48.348 | 3.526 | 0.007 | 0.000 | 0.584 | 1.174 | 2.784 | 0.027 | n/a | 0.093 | 40.112 | n/a | n/a | 0.040 | 4.117 | 0.085 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c000000000000082c | 44.491 | 3.069 | 0.004 | 0.000 | 4.152 | 4.910 | 0.778 | 0.032 | n/a | 0.062 | 31.454 | n/a | n/a | 0.031 | 7.224 | 0.162 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.881ms; driver.publication 1.068ms; driver.publication 1.010ms |
| 89b151bc2882e61c000000000000038c | 43.376 | 3.366 | 0.010 | 0.000 | 0.140 | 5.550 | 1.146 | 0.047 | n/a | 0.079 | 32.991 | n/a | n/a | 0.047 | 3.516 | 0.081 | 0.047 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.716ms; driver.publication 1.224ms |

## P2 / tail / commit (2603 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.775 | 0.775 | 0.000 | 1.657 | 3.640 | 0.005 | 0.000 | 0.723 | 0.722 | 1.141 | 0.031 | n/a | 0.110 | 5.473 | n/a | n/a | 0.035 | 4.590 | 0.360 | 0.035 |
| p99 | 66.838 | 3.236 | 0.058 | 5.538 | 11.813 | 0.829 | 0.000 | 24.896 | 12.471 | 11.109 | 2.095 | n/a | 2.813 | 35.637 | n/a | n/a | 0.110 | 28.992 | 0.753 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000001dc0 | 262.316 | 6.641 | 0.006 | 0.000 | 0.383 | 0.958 | 237.239 | 0.277 | n/a | 0.438 | 16.305 | n/a | n/a | 0.069 | 7.030 | 0.027 | 0.069 | gw-w/thread-42/commit.prepare-and-validate | none observed |
| 89b151bc2882e61c0000000000001c29 | 140.431 | 4.004 | 0.008 | 0.000 | 125.922 | 2.037 | 0.838 | 0.028 | n/a | 0.052 | 7.486 | n/a | n/a | 0.056 | 129.934 | 0.925 | 0.056 | node-14/thread-0/driver.queue.subject | driver.publication 7.747ms; client.encode 3.350ms; driver.publication 2.655ms; client.encode 1.569ms; driver.publication 1.562ms |
| 89b151bc2882e61c0000000000001c2b | 140.369 | 3.921 | 0.008 | 0.000 | 116.197 | 11.119 | 0.794 | 0.031 | n/a | 0.310 | 7.931 | n/a | n/a | 0.059 | 120.125 | 0.856 | 0.059 | node-14/thread-0/driver.queue.subject | driver.publication 7.747ms; client.encode 3.350ms; driver.publication 2.655ms; client.encode 1.569ms; driver.publication 1.562ms |
| 89b151bc2882e61c0000000000001c24 | 139.701 | 7.003 | 0.008 | 0.000 | 118.893 | 0.665 | 1.910 | 0.058 | n/a | 1.790 | 9.337 | n/a | n/a | 0.039 | 125.903 | 0.901 | 0.039 | node-14/thread-0/driver.queue.subject | driver.publication 4.338ms; client.encode 3.350ms; driver.publication 2.655ms; driver.expected-state.bind-receipt 1.722ms; client.encode 1.569ms |
| 89b151bc2882e61c0000000000001c20 | 138.474 | 28.624 | 0.007 | 0.000 | 81.405 | 13.963 | 2.208 | 0.045 | n/a | 0.784 | 11.381 | n/a | n/a | 0.057 | 110.036 | 0.795 | 0.057 | node-14/thread-0/driver.queue.subject | driver.publication 5.772ms; driver.publication 4.338ms; driver.publication 2.655ms; driver.expected-state.bind-receipt 2.161ms; driver.expected-state.bind-receipt 1.722ms |
| 89b151bc2882e61c0000000000001c27 | 135.466 | 2.840 | 0.004 | 0.000 | 104.410 | 20.759 | 1.108 | 0.056 | n/a | 0.517 | 5.736 | n/a | n/a | 0.035 | 107.254 | 0.792 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 7.747ms; client.encode 3.350ms; driver.publication 2.655ms; driver.expected-state.bind-receipt 1.722ms; client.encode 1.569ms |
| 89b151bc2882e61c0000000000001c23 | 123.827 | 4.725 | 0.008 | 0.000 | 104.323 | 5.695 | 1.878 | 0.062 | n/a | 1.126 | 5.973 | n/a | n/a | 0.037 | 109.056 | 0.881 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 4.338ms; client.encode 3.350ms; driver.publication 2.655ms; driver.expected-state.bind-receipt 1.722ms; client.encode 1.569ms |
| 89b151bc2882e61c0000000000001c2a | 111.376 | 14.113 | 0.005 | 0.000 | 83.298 | 3.528 | 2.200 | 0.053 | n/a | 2.945 | 5.169 | n/a | n/a | 0.065 | 97.416 | 0.875 | 0.065 | node-14/thread-0/driver.queue.subject | client.encode 3.350ms; driver.publication 2.655ms; client.encode 1.569ms; driver.publication 1.562ms; driver.expected-state.bind-receipt 1.547ms |
| 89b151bc2882e61c0000000000001878 | 102.255 | 3.688 | 0.003 | 0.000 | 0.060 | 0.248 | 0.708 | 0.018 | n/a | 0.303 | 97.166 | n/a | n/a | 0.061 | 3.751 | 0.037 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 89b151bc2882e61c0000000000001c22 | 101.523 | 16.502 | 0.010 | 0.000 | 2.275 | 38.807 | 11.115 | 0.320 | n/a | 6.003 | 26.383 | n/a | n/a | 0.110 | 18.786 | 0.185 | 0.110 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.338ms; client.encode 3.350ms; driver.expected-state.bind-receipt 1.722ms; driver.expected-state.bind-receipt 0.962ms |
| 89b151bc2882e61c0000000000001c25 | 101.503 | 4.470 | 0.006 | 0.000 | 73.511 | 7.198 | 0.984 | 0.032 | n/a | 0.126 | 15.082 | n/a | n/a | 0.094 | 77.988 | 0.768 | 0.094 | node-14/thread-0/driver.queue.subject | driver.publication 4.338ms; client.encode 3.350ms; driver.publication 2.655ms; driver.expected-state.bind-receipt 1.722ms; client.encode 1.569ms |
| 89b151bc2882e61c0000000000001c34 | 96.218 | 4.602 | 0.005 | 0.000 | 79.781 | 3.213 | 2.381 | 0.029 | n/a | 1.169 | 4.998 | n/a | n/a | 0.040 | 84.388 | 0.877 | 0.040 | node-14/thread-0/driver.queue.subject | driver.publication 7.747ms; driver.publication 1.792ms; driver.publication 1.513ms; driver.publication 1.442ms; driver.publication 1.418ms |
| 89b151bc2882e61c0000000000001c1d | 93.746 | 16.010 | 0.829 | 0.000 | 8.739 | 12.471 | 3.545 | 0.046 | n/a | 5.750 | 46.276 | n/a | n/a | 0.079 | 25.579 | 0.273 | 0.079 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 5.861ms; driver.publication 5.772ms; driver.expected-state.bind-receipt 2.161ms; client.encode 1.496ms |
| 89b151bc2882e61c0000000000001c28 | 90.239 | 4.949 | 0.009 | 0.000 | 70.765 | 2.094 | 1.529 | 0.040 | n/a | 0.370 | 10.427 | n/a | n/a | 0.056 | 75.723 | 0.839 | 0.056 | node-14/thread-0/driver.queue.subject | client.encode 3.350ms; driver.publication 2.655ms; client.encode 1.569ms; driver.publication 1.562ms; driver.expected-state.bind-receipt 1.547ms |
| 89b151bc2882e61c000000000000187c | 81.631 | 4.067 | 0.003 | 0.000 | 1.372 | 7.953 | 1.051 | 0.284 | n/a | 0.130 | 66.744 | n/a | n/a | 0.028 | 5.441 | 0.067 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.264ms |
| 89b151bc2882e61c0000000000001828 | 81.503 | 2.414 | 0.005 | 0.000 | 67.194 | 3.553 | 0.961 | 0.028 | n/a | 0.693 | 6.625 | n/a | n/a | 0.030 | 69.613 | 0.854 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.705ms; driver.publication 1.438ms; driver.expected-state.bind-receipt 1.362ms; driver.publication 1.281ms; driver.publication 1.195ms |
| 89b151bc2882e61c000000000000187b | 80.285 | 2.089 | 0.002 | 0.000 | 0.705 | 7.606 | 1.007 | 0.733 | n/a | 1.526 | 66.599 | n/a | n/a | 0.019 | 2.795 | 0.035 | 0.019 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.264ms |
| 89b151bc2882e61c0000000000000bb2 | 77.265 | 14.448 | 0.183 | 0.000 | 7.923 | 12.394 | 2.256 | 0.047 | n/a | 0.121 | 39.833 | n/a | n/a | 0.061 | 22.554 | 0.292 | 0.061 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 3.933ms; driver.publication 2.513ms; driver.publication 1.979ms; driver.expected-state.bind-receipt 1.616ms; driver.publication 1.233ms |
| 89b151bc2882e61c000000000000187a | 77.165 | 3.640 | 0.005 | 0.000 | 0.552 | 1.797 | 1.553 | 0.050 | n/a | 1.321 | 68.188 | n/a | n/a | 0.059 | 4.197 | 0.054 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.264ms |
| 89b151bc2882e61c0000000000000bb6 | 77.155 | 7.901 | 0.014 | 0.000 | 31.691 | 14.155 | 1.831 | 0.068 | n/a | 0.153 | 21.296 | n/a | n/a | 0.046 | 39.606 | 0.513 | 0.046 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.130ms; driver.publication 1.979ms; driver.publication 1.924ms; driver.expected-state.bind-receipt 1.857ms; driver.publication 1.737ms |

## P2 / tail / commit / 5-10 facts (1542 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.385 | 0.634 | 0.000 | 1.523 | 3.208 | 0.004 | 0.000 | 0.730 | 0.706 | 0.970 | 0.031 | n/a | 0.106 | 5.053 | n/a | n/a | 0.035 | 4.046 | 0.350 | 0.035 |
| p99 | 65.594 | 2.512 | 0.043 | 4.716 | 10.398 | 0.214 | 0.000 | 25.979 | 13.234 | 4.560 | 2.381 | n/a | 2.955 | 34.529 | n/a | n/a | 0.102 | 33.599 | 0.768 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 89b151bc2882e61c0000000000001c29 | 140.431 | 4.004 | 0.008 | 0.000 | 125.922 | 2.037 | 0.838 | 0.028 | n/a | 0.052 | 7.486 | n/a | n/a | 0.056 | 129.934 | 0.925 | 0.056 | node-14/thread-0/driver.queue.subject | driver.publication 7.747ms; client.encode 3.350ms; driver.publication 2.655ms; client.encode 1.569ms; driver.publication 1.562ms |
| 89b151bc2882e61c0000000000001c2b | 140.369 | 3.921 | 0.008 | 0.000 | 116.197 | 11.119 | 0.794 | 0.031 | n/a | 0.310 | 7.931 | n/a | n/a | 0.059 | 120.125 | 0.856 | 0.059 | node-14/thread-0/driver.queue.subject | driver.publication 7.747ms; client.encode 3.350ms; driver.publication 2.655ms; client.encode 1.569ms; driver.publication 1.562ms |
| 89b151bc2882e61c0000000000001c27 | 135.466 | 2.840 | 0.004 | 0.000 | 104.410 | 20.759 | 1.108 | 0.056 | n/a | 0.517 | 5.736 | n/a | n/a | 0.035 | 107.254 | 0.792 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 7.747ms; client.encode 3.350ms; driver.publication 2.655ms; driver.expected-state.bind-receipt 1.722ms; client.encode 1.569ms |
| 89b151bc2882e61c0000000000001c23 | 123.827 | 4.725 | 0.008 | 0.000 | 104.323 | 5.695 | 1.878 | 0.062 | n/a | 1.126 | 5.973 | n/a | n/a | 0.037 | 109.056 | 0.881 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication 4.338ms; client.encode 3.350ms; driver.publication 2.655ms; driver.expected-state.bind-receipt 1.722ms; client.encode 1.569ms |
| 89b151bc2882e61c0000000000001c25 | 101.503 | 4.470 | 0.006 | 0.000 | 73.511 | 7.198 | 0.984 | 0.032 | n/a | 0.126 | 15.082 | n/a | n/a | 0.094 | 77.988 | 0.768 | 0.094 | node-14/thread-0/driver.queue.subject | driver.publication 4.338ms; client.encode 3.350ms; driver.publication 2.655ms; driver.expected-state.bind-receipt 1.722ms; client.encode 1.569ms |
| 89b151bc2882e61c0000000000001c1d | 93.746 | 16.010 | 0.829 | 0.000 | 8.739 | 12.471 | 3.545 | 0.046 | n/a | 5.750 | 46.276 | n/a | n/a | 0.079 | 25.579 | 0.273 | 0.079 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 5.861ms; driver.publication 5.772ms; driver.expected-state.bind-receipt 2.161ms; client.encode 1.496ms |
| 89b151bc2882e61c0000000000001c28 | 90.239 | 4.949 | 0.009 | 0.000 | 70.765 | 2.094 | 1.529 | 0.040 | n/a | 0.370 | 10.427 | n/a | n/a | 0.056 | 75.723 | 0.839 | 0.056 | node-14/thread-0/driver.queue.subject | client.encode 3.350ms; driver.publication 2.655ms; client.encode 1.569ms; driver.publication 1.562ms; driver.expected-state.bind-receipt 1.547ms |
| 89b151bc2882e61c000000000000187c | 81.631 | 4.067 | 0.003 | 0.000 | 1.372 | 7.953 | 1.051 | 0.284 | n/a | 0.130 | 66.744 | n/a | n/a | 0.028 | 5.441 | 0.067 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.264ms |
| 89b151bc2882e61c0000000000001828 | 81.503 | 2.414 | 0.005 | 0.000 | 67.194 | 3.553 | 0.961 | 0.028 | n/a | 0.693 | 6.625 | n/a | n/a | 0.030 | 69.613 | 0.854 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.705ms; driver.publication 1.438ms; driver.expected-state.bind-receipt 1.362ms; driver.publication 1.281ms; driver.publication 1.195ms |
| 89b151bc2882e61c000000000000187b | 80.285 | 2.089 | 0.002 | 0.000 | 0.705 | 7.606 | 1.007 | 0.733 | n/a | 1.526 | 66.599 | n/a | n/a | 0.019 | 2.795 | 0.035 | 0.019 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.264ms |
| 89b151bc2882e61c0000000000000bb6 | 77.155 | 7.901 | 0.014 | 0.000 | 31.691 | 14.155 | 1.831 | 0.068 | n/a | 0.153 | 21.296 | n/a | n/a | 0.046 | 39.606 | 0.513 | 0.046 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.130ms; driver.publication 1.979ms; driver.publication 1.924ms; driver.expected-state.bind-receipt 1.857ms; driver.publication 1.737ms |
| 89b151bc2882e61c0000000000000bb8 | 76.059 | 5.843 | 0.006 | 0.000 | 54.295 | 0.919 | 2.509 | 0.047 | n/a | 0.102 | 12.277 | n/a | n/a | 0.063 | 60.144 | 0.791 | 0.063 | node-14/thread-0/driver.queue.subject | driver.publication 4.130ms; driver.publication 3.579ms; driver.publication 1.979ms; driver.publication 1.924ms; driver.expected-state.bind-receipt 1.857ms |
| 89b151bc2882e61c0000000000001265 | 69.104 | 10.001 | 1.495 | 0.000 | 6.764 | 12.800 | 1.766 | 2.075 | n/a | 0.103 | 34.077 | n/a | n/a | 0.022 | 18.261 | 0.264 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.929ms; driver.publication 3.796ms; driver.publication 2.588ms; driver.expected-state.bind-receipt 2.544ms; driver.expected-state.bind-receipt 2.324ms |
| 89b151bc2882e61c000000000000187d | 66.838 | 3.706 | 0.005 | 0.000 | 1.047 | 10.208 | 0.709 | 0.019 | n/a | 0.046 | 51.072 | n/a | n/a | 0.026 | 4.758 | 0.071 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.077ms; driver.publication 1.264ms |
| 89b151bc2882e61c0000000000001264 | 66.215 | 10.956 | 0.845 | 0.000 | 7.685 | 8.046 | 2.033 | 3.517 | n/a | 0.614 | 32.491 | n/a | n/a | 0.028 | 19.486 | 0.294 | 0.028 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.796ms; driver.publication 3.122ms; driver.publication 2.588ms; driver.expected-state.bind-receipt 2.544ms; driver.expected-state.bind-receipt 2.324ms |
| 89b151bc2882e61c00000000000012ab | 65.594 | 3.961 | 0.005 | 0.000 | 0.560 | 1.204 | 1.583 | 0.047 | n/a | 1.683 | 56.497 | n/a | n/a | 0.055 | 4.526 | 0.069 | 0.055 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.277ms; driver.publication 1.262ms |
| 89b151bc2882e61c0000000000000bb1 | 65.097 | 10.635 | 0.012 | 0.000 | 10.827 | 15.476 | 1.390 | 0.040 | n/a | 0.096 | 26.548 | n/a | n/a | 0.074 | 21.474 | 0.330 | 0.074 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.933ms; driver.publication 2.513ms; driver.publication 1.730ms; driver.expected-state.bind-receipt 1.616ms; driver.publication 1.233ms |
| 89b151bc2882e61c0000000000001813 | 64.948 | 7.420 | 0.012 | 0.000 | 12.876 | 12.082 | 3.453 | 0.098 | n/a | 1.101 | 27.853 | n/a | n/a | 0.055 | 20.308 | 0.313 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 5.767ms; driver.publication 2.862ms; driver.publication 1.664ms; driver.expected-state.bind-receipt 1.118ms |
| 89b151bc2882e61c0000000000001811 | 64.116 | 16.037 | 0.438 | 0.000 | 1.299 | 8.022 | 1.990 | 1.458 | n/a | 0.293 | 34.529 | n/a | n/a | 0.050 | 17.773 | 0.277 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 5.767ms; driver.publication 1.664ms; driver.expected-state.bind-receipt 1.118ms |
| 89b151bc2882e61c0000000000000bb7 | 62.959 | 7.586 | 0.921 | 0.000 | 25.092 | 9.828 | 2.044 | 0.066 | n/a | 0.104 | 17.281 | n/a | n/a | 0.037 | 33.599 | 0.534 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.130ms; driver.publication 1.979ms; driver.publication 1.924ms; driver.expected-state.bind-receipt 1.857ms; driver.publication 1.284ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.759 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.336 | 201.146 | 0.013 | n/a | 0.079 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 |
| p99 | 436.023 | n/a | n/a | n/a | 32.607 | n/a | 0.000 | 0.000 | 12.330 | 425.883 | 0.254 | n/a | 0.347 | 0.000 | n/a | n/a | 0.400 | 32.607 | 0.368 | 0.400 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d020000000000000002 | 436.023 | 3.345 | n/a | 0.000 | 0.000 | 6.011 | 425.883 | 0.254 | n/a | 0.129 | 0.000 | n/a | n/a | 0.400 | 3.345 | 0.008 | 0.400 | gw-r/thread-44/gateway.admitted-work | none observed |
| 06a3029f21895bfe0000000000000006 | 204.942 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 203.372 | 0.017 | n/a | 0.347 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe0000000000000f18 | 203.787 | 0.000 | n/a | 0.000 | 0.000 | 1.987 | 201.552 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000007 | 203.144 | 0.000 | n/a | 0.000 | 0.000 | 1.445 | 201.274 | 0.010 | n/a | 0.128 | 0.000 | n/a | n/a | 0.286 | 0.000 | 0.000 | 0.286 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000f1a | 202.790 | 0.000 | n/a | 0.000 | 0.000 | 1.336 | 201.146 | 0.009 | n/a | 0.130 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe0000000000000005 | 202.759 | 0.000 | n/a | 0.000 | 0.000 | 1.109 | 201.273 | 0.019 | n/a | 0.133 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe0000000000000f19 | 202.155 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 200.913 | 0.018 | n/a | 0.079 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000f1b | 201.731 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 200.745 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe0000000000000f1f | 117.396 | 26.372 | n/a | 0.000 | 0.000 | 4.356 | 86.365 | 0.013 | n/a | 0.005 | 0.000 | n/a | n/a | 0.284 | 26.372 | 0.225 | 0.284 | gw-r/thread-48/gateway.admitted-work | none observed |
| 06a3029f21895bfe0000000000000f1e | 115.816 | 21.939 | n/a | 0.000 | 0.000 | 12.330 | 81.183 | 0.004 | n/a | 0.007 | 0.000 | n/a | n/a | 0.353 | 21.939 | 0.189 | 0.353 | gw-r/thread-46/gateway.admitted-work | none observed |
| 06a3029f21895bfe0000000000000f20 | 88.625 | 32.607 | n/a | 0.000 | 0.000 | 0.766 | 55.035 | 0.006 | n/a | 0.006 | 0.000 | n/a | n/a | 0.205 | 32.607 | 0.368 | 0.205 | gw-r/thread-44/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 863.215 | n/a | n/a | n/a | 0.294 | n/a | 0.000 | 0.000 | 0.794 | 831.485 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.275 | 0.294 | 0.000 | 0.275 |
| p99 | 1007.945 | n/a | n/a | n/a | 30.541 | n/a | 0.000 | 0.000 | 3.902 | 1001.823 | 0.014 | n/a | 0.538 | 0.000 | n/a | n/a | 1.377 | 30.541 | 0.035 | 1.377 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d0200000000000000a4 | 1007.945 | 0.294 | n/a | 0.000 | 0.000 | 3.902 | 1001.823 | 0.012 | n/a | 0.538 | 0.000 | n/a | n/a | 1.377 | 0.294 | 0.000 | 1.377 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000000a5 | 863.215 | 30.541 | n/a | 0.000 | 0.000 | 0.794 | 831.485 | 0.014 | n/a | 0.106 | 0.000 | n/a | n/a | 0.275 | 30.541 | 0.035 | 0.275 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 455.834 | n/a | n/a | n/a | 3.078 | n/a | 0.000 | 0.000 | 0.873 | 452.486 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 0.105 | 3.078 | 0.007 | 0.105 |
| p99 | 1020.079 | n/a | n/a | n/a | 20.476 | n/a | 2.423 | 0.000 | 2.514 | 995.118 | 0.035 | n/a | 0.175 | 0.000 | n/a | n/a | 35.407 | 22.898 | 0.395 | 35.407 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d0200000000000000cf | 1020.079 | 20.476 | n/a | 2.423 | 0.000 | 1.793 | 995.118 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.192 | 22.898 | 0.022 | 0.192 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000000b4 | 992.535 | 4.435 | n/a | 0.000 | 0.000 | 1.539 | 986.275 | 0.020 | n/a | 0.109 | 0.000 | n/a | n/a | 0.158 | 4.435 | 0.004 | 0.158 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d0200000000000000ba | 985.615 | 7.289 | n/a | 0.000 | 0.000 | 0.873 | 977.230 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.115 | 7.289 | 0.007 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d0200000000000000bb | 975.789 | 6.268 | n/a | 0.000 | 0.000 | 0.874 | 968.444 | 0.014 | n/a | 0.085 | 0.000 | n/a | n/a | 0.103 | 6.268 | 0.006 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000000b2 | 887.132 | 3.140 | n/a | 0.000 | 0.000 | 1.139 | 882.644 | 0.015 | n/a | 0.095 | 0.000 | n/a | n/a | 0.099 | 3.140 | 0.004 | 0.099 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000000ae | 860.312 | 4.284 | n/a | 0.000 | 0.000 | 2.094 | 853.705 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 0.121 | 4.284 | 0.005 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000000c8 | 811.902 | 3.390 | n/a | 0.000 | 0.000 | 2.022 | 806.308 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.090 | 3.390 | 0.004 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000000bf | 780.812 | 3.997 | n/a | 0.000 | 0.000 | 0.585 | 776.026 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.121 | 3.997 | 0.005 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000000c6 | 757.094 | 2.599 | n/a | 0.000 | 0.000 | 0.421 | 753.920 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.069 | 2.599 | 0.003 | 0.069 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d0200000000000000ab | 632.736 | 3.895 | n/a | 0.000 | 0.000 | 0.739 | 627.671 | 0.022 | n/a | 0.175 | 0.000 | n/a | n/a | 0.234 | 3.895 | 0.006 | 0.234 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000000c1 | 608.988 | 11.207 | n/a | 0.000 | 0.000 | 0.960 | 596.543 | 0.022 | n/a | 0.135 | 0.000 | n/a | n/a | 0.120 | 11.207 | 0.018 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000000a7 | 579.901 | 2.702 | n/a | 0.000 | 0.000 | 0.788 | 576.089 | 0.011 | n/a | 0.130 | 0.000 | n/a | n/a | 0.181 | 2.702 | 0.005 | 0.181 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d0200000000000000a8 | 571.415 | 2.179 | n/a | 0.000 | 0.000 | 0.656 | 568.268 | 0.035 | n/a | 0.172 | 0.000 | n/a | n/a | 0.105 | 2.179 | 0.004 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000000b8 | 532.565 | 2.993 | n/a | 0.000 | 0.000 | 0.920 | 528.455 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.111 | 2.993 | 0.006 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d0200000000000000ca | 455.834 | 2.183 | n/a | 0.000 | 0.000 | 1.029 | 452.486 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.076 | 2.183 | 0.005 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000000b7 | 431.009 | 3.056 | n/a | 0.000 | 0.000 | 0.683 | 427.119 | 0.011 | n/a | 0.038 | 0.000 | n/a | n/a | 0.102 | 3.056 | 0.007 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000000c3 | 389.772 | 2.869 | n/a | 0.000 | 0.000 | 1.282 | 385.454 | 0.011 | n/a | 0.077 | 0.000 | n/a | n/a | 0.080 | 2.869 | 0.007 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000000a9 | 388.400 | 3.467 | n/a | 0.000 | 0.000 | 0.570 | 384.042 | 0.022 | n/a | 0.133 | 0.000 | n/a | n/a | 0.166 | 3.467 | 0.009 | 0.166 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000000ac | 351.824 | 2.865 | n/a | 0.000 | 0.000 | 0.602 | 348.120 | 0.024 | n/a | 0.129 | 0.000 | n/a | n/a | 0.084 | 2.865 | 0.008 | 0.084 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000000ce | 275.996 | 2.779 | n/a | 0.000 | 0.000 | 1.415 | 271.566 | 0.027 | n/a | 0.135 | 0.000 | n/a | n/a | 0.074 | 2.779 | 0.010 | 0.074 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 363.771 | n/a | n/a | n/a | 5.447 | n/a | 0.740 | 0.000 | 0.757 | 357.458 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.158 | 6.188 | 0.019 | 0.158 |
| p99 | 1012.471 | n/a | n/a | n/a | 12.163 | n/a | 3.697 | 0.000 | 4.902 | 1001.350 | 1.285 | n/a | 0.625 | 0.000 | n/a | n/a | 39.958 | 14.201 | 0.551 | 39.958 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d0200000000000000d1 | 1012.471 | 9.032 | n/a | 1.679 | 0.000 | 2.366 | 999.177 | 0.016 | n/a | 0.090 | 0.000 | n/a | n/a | 0.110 | 10.711 | 0.011 | 0.110 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000000105 | 1004.053 | 2.918 | n/a | 0.000 | 0.000 | 0.550 | 1000.446 | 0.015 | n/a | 0.058 | 0.000 | n/a | n/a | 0.067 | 2.918 | 0.003 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000000dc | 1003.879 | 0.261 | n/a | 0.000 | 0.000 | 0.960 | 1001.350 | 0.018 | n/a | 0.123 | 0.000 | n/a | n/a | 1.167 | 0.261 | 0.000 | 1.167 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000000100 | 1003.759 | 0.124 | n/a | 0.000 | 0.000 | 1.302 | 1001.100 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 1.110 | 0.124 | 0.000 | 1.110 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d02000000000000010d | 996.721 | 2.795 | n/a | 0.000 | 0.000 | 2.527 | 991.146 | 0.023 | n/a | 0.150 | 0.000 | n/a | n/a | 0.080 | 2.795 | 0.003 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d0200000000000000e4 | 995.897 | 5.168 | n/a | 0.740 | 0.000 | 0.541 | 989.040 | 0.020 | n/a | 0.092 | 0.000 | n/a | n/a | 0.296 | 5.908 | 0.006 | 0.296 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000000d8 | 991.480 | 6.536 | n/a | 1.265 | 0.000 | 0.520 | 982.878 | 0.008 | n/a | 0.024 | 0.000 | n/a | n/a | 0.249 | 7.801 | 0.008 | 0.249 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000000d0 | 978.396 | 4.066 | n/a | 0.941 | 0.000 | 0.828 | 972.041 | 0.015 | n/a | 0.069 | 0.000 | n/a | n/a | 0.435 | 5.008 | 0.005 | 0.435 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d0200000000000000d7 | 972.696 | 5.447 | n/a | 1.172 | 0.000 | 1.052 | 964.759 | 0.012 | n/a | 0.146 | 0.000 | n/a | n/a | 0.108 | 6.618 | 0.007 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d0200000000000000de | 906.894 | 4.004 | n/a | 0.583 | 0.000 | 0.769 | 901.305 | 0.021 | n/a | 0.068 | 0.000 | n/a | n/a | 0.146 | 4.587 | 0.005 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000000fd | 790.639 | 9.408 | n/a | 0.767 | 0.000 | 0.516 | 779.710 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.158 | 10.175 | 0.013 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d0200000000000000da | 694.297 | 6.963 | n/a | 0.669 | 0.000 | 1.541 | 684.922 | 0.013 | n/a | 0.076 | 0.000 | n/a | n/a | 0.113 | 7.632 | 0.011 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000000df | 655.083 | 5.935 | n/a | 1.169 | 0.000 | 0.824 | 646.891 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 0.166 | 7.104 | 0.011 | 0.166 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000000fc | 607.732 | 7.166 | n/a | 0.877 | 0.000 | 0.898 | 598.405 | 0.031 | n/a | 0.126 | 0.000 | n/a | n/a | 0.228 | 8.043 | 0.013 | 0.228 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000000e7 | 607.227 | 10.142 | n/a | 2.098 | 0.000 | 1.935 | 592.810 | 0.015 | n/a | 0.096 | 0.000 | n/a | n/a | 0.132 | 12.240 | 0.020 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d020000000000000102 | 606.955 | 2.738 | n/a | 0.000 | 0.000 | 0.642 | 602.864 | 0.012 | n/a | 0.625 | 0.000 | n/a | n/a | 0.073 | 2.738 | 0.005 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000000ea | 475.895 | 2.648 | n/a | 0.000 | 0.000 | 0.830 | 472.229 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.108 | 2.648 | 0.006 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d020000000000000107 | 466.447 | 12.163 | n/a | 2.038 | 0.000 | 0.587 | 451.454 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.120 | 14.201 | 0.030 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000000d3 | 458.171 | 6.896 | n/a | 1.719 | 0.000 | 0.851 | 448.459 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.135 | 8.615 | 0.019 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d0200000000000000fa | 399.278 | 8.402 | n/a | 3.697 | 0.000 | 2.434 | 384.458 | 0.021 | n/a | 0.109 | 0.000 | n/a | n/a | 0.156 | 12.099 | 0.030 | 0.156 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 492.891 | n/a | n/a | n/a | 3.747 | n/a | 0.000 | 0.000 | 0.738 | 486.905 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.101 | 3.747 | 0.008 | 0.101 |
| p99 | 1011.515 | n/a | n/a | n/a | 10.149 | n/a | 1.023 | 0.000 | 3.428 | 1004.867 | 7.917 | n/a | 1.530 | 0.000 | n/a | n/a | 44.014 | 10.149 | 0.206 | 44.014 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d020000000000000125 | 1011.515 | 3.747 | n/a | 0.000 | 0.000 | 1.271 | 1004.867 | 0.016 | n/a | 1.530 | 0.000 | n/a | n/a | 0.085 | 3.747 | 0.004 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d020000000000000129 | 1008.987 | 6.465 | n/a | 0.000 | 0.000 | 2.775 | 999.423 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.246 | 6.465 | 0.006 | 0.246 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000000136 | 996.976 | 2.658 | n/a | 0.000 | 0.000 | 0.411 | 993.792 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.070 | 2.658 | 0.003 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d02000000000000013f | 996.250 | 3.296 | n/a | 0.000 | 0.000 | 0.584 | 992.160 | 0.019 | n/a | 0.080 | 0.000 | n/a | n/a | 0.111 | 3.296 | 0.003 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d02000000000000012a | 991.730 | 4.695 | n/a | 0.000 | 0.000 | 0.723 | 986.072 | 0.017 | n/a | 0.067 | 0.000 | n/a | n/a | 0.157 | 4.695 | 0.005 | 0.157 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d02000000000000011c | 954.206 | 3.070 | n/a | 0.000 | 0.000 | 2.205 | 948.739 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 0.127 | 3.070 | 0.003 | 0.127 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000000114 | 945.955 | 2.967 | n/a | 0.000 | 0.000 | 1.544 | 941.286 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.094 | 2.967 | 0.003 | 0.094 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000000146 | 937.487 | 2.438 | n/a | 0.000 | 0.000 | 0.467 | 934.394 | 0.014 | n/a | 0.080 | 0.000 | n/a | n/a | 0.094 | 2.438 | 0.003 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000000131 | 897.265 | 2.636 | n/a | 0.000 | 0.000 | 0.445 | 894.014 | 0.020 | n/a | 0.061 | 0.000 | n/a | n/a | 0.089 | 2.636 | 0.003 | 0.089 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000000124 | 849.539 | 3.570 | n/a | 0.000 | 0.000 | 1.240 | 844.540 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.117 | 3.570 | 0.004 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d02000000000000012d | 831.051 | 3.548 | n/a | 0.000 | 0.000 | 1.106 | 826.210 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.099 | 3.548 | 0.004 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d02000000000000013b | 692.256 | 2.718 | n/a | 0.000 | 0.000 | 0.924 | 688.446 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.065 | 2.718 | 0.004 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d020000000000000111 | 636.033 | 2.557 | n/a | 0.000 | 0.000 | 0.989 | 632.337 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.094 | 2.557 | 0.004 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d020000000000000138 | 625.272 | 5.334 | n/a | 0.000 | 0.000 | 0.893 | 618.788 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.193 | 5.334 | 0.009 | 0.193 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d02000000000000011a | 604.473 | 2.808 | n/a | 0.784 | 0.000 | 3.428 | 597.281 | 0.016 | n/a | 0.051 | 0.000 | n/a | n/a | 0.104 | 3.592 | 0.006 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d02000000000000011d | 564.742 | 3.505 | n/a | 0.000 | 0.000 | 0.771 | 560.286 | 0.017 | n/a | 0.091 | 0.000 | n/a | n/a | 0.071 | 3.505 | 0.006 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d020000000000000126 | 553.907 | 7.910 | n/a | 0.000 | 0.000 | 0.613 | 545.159 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.155 | 7.910 | 0.014 | 0.155 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d02000000000000010e | 519.033 | 4.344 | n/a | 0.000 | 0.000 | 1.363 | 513.126 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.101 | 4.344 | 0.008 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d020000000000000134 | 513.301 | 2.767 | n/a | 0.000 | 0.000 | 1.515 | 508.848 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.087 | 2.767 | 0.005 | 0.087 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d02000000000000010f | 492.891 | 4.467 | n/a | 0.748 | 0.000 | 0.761 | 486.670 | 0.053 | n/a | 0.071 | 0.000 | n/a | n/a | 0.120 | 5.215 | 0.011 | 0.120 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 352.395 | n/a | n/a | n/a | 3.314 | n/a | 0.000 | 0.000 | 0.635 | 344.283 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.112 | 3.314 | 0.011 | 0.112 |
| p99 | 1003.541 | n/a | n/a | n/a | 22.930 | n/a | 1.135 | 0.000 | 4.375 | 1001.235 | 0.047 | n/a | 0.095 | 0.000 | n/a | n/a | 16.167 | 22.930 | 0.604 | 16.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d02000000000000016c | 1003.541 | 0.123 | n/a | 0.000 | 0.000 | 1.142 | 1001.094 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 1.114 | 0.123 | 0.000 | 1.114 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d02000000000000017e | 1003.174 | 0.142 | n/a | 0.000 | 0.000 | 0.629 | 1001.186 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 1.127 | 0.142 | 0.000 | 1.127 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d020000000000000173 | 1003.147 | 0.141 | n/a | 0.000 | 0.000 | 1.100 | 1000.729 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 1.115 | 0.141 | 0.000 | 1.115 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d020000000000000162 | 1003.096 | 0.154 | n/a | 0.000 | 0.000 | 0.514 | 1001.235 | 0.021 | n/a | 0.091 | 0.000 | n/a | n/a | 1.083 | 0.154 | 0.000 | 1.083 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000000185 | 1000.313 | 2.979 | n/a | 0.000 | 0.000 | 2.230 | 994.951 | 0.011 | n/a | 0.030 | 0.000 | n/a | n/a | 0.112 | 2.979 | 0.003 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000000186 | 999.795 | 3.314 | n/a | 0.000 | 0.000 | 0.555 | 995.796 | 0.014 | n/a | 0.038 | 0.000 | n/a | n/a | 0.077 | 3.314 | 0.003 | 0.077 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d020000000000000179 | 985.018 | 3.527 | n/a | 0.000 | 0.000 | 0.601 | 980.750 | 0.016 | n/a | 0.046 | 0.000 | n/a | n/a | 0.079 | 3.527 | 0.004 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d020000000000000152 | 960.865 | 3.925 | n/a | 0.000 | 0.000 | 2.325 | 954.189 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.360 | 3.925 | 0.004 | 0.360 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d02000000000000016b | 829.384 | 2.570 | n/a | 0.000 | 0.000 | 0.470 | 826.222 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.074 | 2.570 | 0.003 | 0.074 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d020000000000000184 | 823.955 | 2.810 | n/a | 0.000 | 0.000 | 0.755 | 820.254 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.076 | 2.810 | 0.003 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d020000000000000158 | 815.351 | 4.095 | n/a | 0.000 | 0.000 | 1.540 | 809.592 | 0.011 | n/a | 0.037 | 0.000 | n/a | n/a | 0.075 | 4.095 | 0.005 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d020000000000000176 | 782.921 | 3.182 | n/a | 0.000 | 0.000 | 0.780 | 778.820 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.087 | 3.182 | 0.004 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d02000000000000017c | 779.879 | 3.398 | n/a | 0.000 | 0.000 | 0.326 | 775.960 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.145 | 3.398 | 0.004 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000000189 | 778.044 | 3.437 | n/a | 0.767 | 0.000 | 0.673 | 773.010 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.095 | 4.204 | 0.005 | 0.095 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d02000000000000016f | 631.586 | 4.301 | n/a | 0.000 | 0.000 | 0.775 | 626.343 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.104 | 4.301 | 0.007 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d020000000000000150 | 615.163 | 7.343 | n/a | 0.000 | 0.000 | 1.364 | 606.047 | 0.016 | n/a | 0.093 | 0.000 | n/a | n/a | 0.301 | 7.343 | 0.012 | 0.301 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000000153 | 528.150 | 2.841 | n/a | 0.000 | 0.000 | 0.591 | 524.559 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.107 | 2.841 | 0.005 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d020000000000000165 | 516.416 | 2.602 | n/a | 0.000 | 0.000 | 4.375 | 509.298 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.081 | 2.602 | 0.005 | 0.081 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000000160 | 480.128 | 2.848 | n/a | 0.000 | 0.000 | 0.645 | 476.504 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.083 | 2.848 | 0.006 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d02000000000000014b | 479.538 | 3.751 | n/a | 0.000 | 0.000 | 0.635 | 474.973 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.101 | 3.751 | 0.008 | 0.101 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 374.934 | n/a | n/a | n/a | 4.119 | n/a | 0.000 | 0.000 | 0.699 | 372.442 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.113 | 4.155 | 0.017 | 0.113 |
| p99 | 1005.162 | n/a | n/a | n/a | 13.276 | n/a | 1.394 | 0.000 | 3.129 | 999.028 | 0.413 | n/a | 0.122 | 0.000 | n/a | n/a | 44.823 | 13.276 | 0.763 | 44.823 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d02000000000000018a | 1005.162 | 4.518 | n/a | 0.000 | 0.000 | 1.482 | 999.028 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.090 | 4.518 | 0.004 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000001a5 | 1001.140 | 4.452 | n/a | 0.000 | 0.000 | 0.485 | 996.021 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.113 | 4.452 | 0.004 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000001c3 | 999.836 | 3.363 | n/a | 0.000 | 0.000 | 0.472 | 995.843 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.111 | 3.363 | 0.003 | 0.111 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000001c2 | 991.423 | 3.207 | n/a | 0.000 | 0.000 | 2.785 | 985.243 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 0.135 | 3.207 | 0.003 | 0.135 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000001a4 | 988.498 | 8.302 | n/a | 0.000 | 0.000 | 0.870 | 979.082 | 0.020 | n/a | 0.066 | 0.000 | n/a | n/a | 0.158 | 8.302 | 0.008 | 0.158 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000001c0 | 984.350 | 7.648 | n/a | 0.000 | 0.000 | 0.793 | 975.759 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.097 | 7.648 | 0.008 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d0200000000000001a6 | 976.987 | 4.026 | n/a | 1.394 | 0.000 | 0.478 | 970.938 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.113 | 5.420 | 0.006 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000001b4 | 866.184 | 2.429 | n/a | 0.000 | 0.000 | 0.367 | 863.229 | 0.011 | n/a | 0.044 | 0.000 | n/a | n/a | 0.103 | 2.429 | 0.003 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d020000000000000199 | 822.165 | 1.826 | n/a | 0.000 | 0.000 | 1.759 | 818.453 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.072 | 1.826 | 0.002 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d0200000000000001cc | 727.419 | 4.758 | n/a | 0.000 | 0.000 | 0.945 | 721.548 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.106 | 4.758 | 0.007 | 0.106 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d02000000000000019c | 688.195 | 5.345 | n/a | 0.000 | 0.000 | 0.712 | 681.580 | 0.413 | n/a | 0.047 | 0.000 | n/a | n/a | 0.098 | 5.345 | 0.008 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000000198 | 657.840 | 4.569 | n/a | 0.000 | 0.000 | 0.660 | 652.437 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.114 | 4.569 | 0.007 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d0200000000000001b7 | 587.895 | 3.450 | n/a | 0.000 | 0.000 | 0.659 | 583.605 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.105 | 3.450 | 0.006 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000001d3 | 537.160 | 2.240 | n/a | 0.000 | 0.000 | 2.182 | 532.589 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.101 | 2.240 | 0.004 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000001d0 | 511.710 | 4.850 | n/a | 0.000 | 0.000 | 0.653 | 505.929 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.228 | 4.850 | 0.009 | 0.228 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000001d1 | 499.457 | 5.804 | n/a | 0.000 | 0.000 | 0.439 | 492.907 | 0.016 | n/a | 0.061 | 0.000 | n/a | n/a | 0.230 | 5.804 | 0.012 | 0.230 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d0200000000000001ac | 497.519 | 3.065 | n/a | 0.000 | 0.000 | 0.685 | 493.633 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.074 | 3.065 | 0.006 | 0.074 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d02000000000000019f | 451.246 | 8.025 | n/a | 0.000 | 0.000 | 0.955 | 442.091 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.115 | 8.025 | 0.018 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d0200000000000001a0 | 426.892 | 3.404 | n/a | 0.000 | 0.000 | 1.102 | 422.075 | 0.132 | n/a | 0.067 | 0.000 | n/a | n/a | 0.111 | 3.404 | 0.008 | 0.111 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000001c4 | 425.746 | 2.975 | n/a | 0.000 | 0.000 | 0.736 | 421.863 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.097 | 2.975 | 0.007 | 0.097 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 454.016 | n/a | n/a | n/a | 2.936 | n/a | 0.000 | 0.000 | 0.591 | 445.867 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.109 | 2.936 | 0.008 | 0.109 |
| p99 | 1003.750 | n/a | n/a | n/a | 15.297 | n/a | 0.000 | 0.000 | 3.396 | 1001.023 | 0.017 | n/a | 0.139 | 0.000 | n/a | n/a | 45.166 | 15.297 | 0.521 | 45.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d0200000000000001f6 | 1003.750 | 2.552 | n/a | 0.000 | 0.000 | 1.046 | 999.997 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.116 | 2.552 | 0.003 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000000213 | 1002.356 | 0.240 | n/a | 0.000 | 0.000 | 0.863 | 1001.023 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.139 | 0.240 | 0.000 | 0.139 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d0200000000000001fc | 994.668 | 5.819 | n/a | 0.000 | 0.000 | 2.282 | 986.288 | 0.007 | n/a | 0.097 | 0.000 | n/a | n/a | 0.175 | 5.819 | 0.006 | 0.175 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d020000000000000216 | 992.333 | 3.003 | n/a | 0.000 | 0.000 | 0.227 | 988.915 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.148 | 3.003 | 0.003 | 0.148 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000001e8 | 991.504 | 2.800 | n/a | 0.000 | 0.000 | 2.645 | 985.900 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.090 | 2.800 | 0.003 | 0.090 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d02000000000000020f | 977.247 | 3.057 | n/a | 0.000 | 0.000 | 0.762 | 973.283 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.105 | 3.057 | 0.003 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d020000000000000205 | 932.778 | 2.276 | n/a | 0.000 | 0.000 | 0.413 | 929.959 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.085 | 2.276 | 0.002 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000001e6 | 879.156 | 3.371 | n/a | 0.000 | 0.000 | 0.779 | 874.697 | 0.014 | n/a | 0.139 | 0.000 | n/a | n/a | 0.157 | 3.371 | 0.004 | 0.157 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000001f2 | 872.769 | 5.273 | n/a | 0.000 | 0.000 | 0.548 | 866.832 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.071 | 5.273 | 0.006 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d020000000000000215 | 859.133 | 2.283 | n/a | 0.000 | 0.000 | 0.458 | 856.221 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.104 | 2.283 | 0.003 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d020000000000000210 | 841.016 | 15.297 | n/a | 0.000 | 0.000 | 1.255 | 824.179 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.226 | 15.297 | 0.018 | 0.226 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d02000000000000020d | 705.368 | 4.469 | n/a | 0.000 | 0.000 | 0.604 | 700.120 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 0.110 | 4.469 | 0.006 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d0200000000000001ec | 682.362 | 3.009 | n/a | 0.000 | 0.000 | 0.503 | 678.677 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.085 | 3.009 | 0.004 | 0.085 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d0200000000000001fd | 603.994 | 3.274 | n/a | 0.000 | 0.000 | 0.498 | 600.048 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.112 | 3.274 | 0.005 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000001da | 599.008 | 5.391 | n/a | 0.000 | 0.000 | 2.147 | 591.231 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.161 | 5.391 | 0.009 | 0.161 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000000200 | 546.165 | 2.229 | n/a | 0.000 | 0.000 | 0.306 | 543.457 | 0.017 | n/a | 0.067 | 0.000 | n/a | n/a | 0.088 | 2.229 | 0.004 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d0200000000000001e1 | 519.359 | 6.892 | n/a | 0.000 | 0.000 | 0.725 | 511.424 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.263 | 6.892 | 0.013 | 0.263 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d0200000000000001ee | 513.914 | 1.821 | n/a | 0.000 | 0.000 | 0.798 | 511.146 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.076 | 1.821 | 0.004 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000001db | 510.246 | 3.182 | n/a | 0.000 | 0.000 | 0.416 | 506.510 | 0.010 | n/a | 0.039 | 0.000 | n/a | n/a | 0.087 | 3.182 | 0.006 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d0200000000000001f0 | 488.256 | 2.478 | n/a | 0.000 | 0.000 | 0.591 | 485.063 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.073 | 2.478 | 0.005 | 0.073 | gw-r/thread-42/journal/page | none observed |

## P3 / L1024 / internal (750 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.624 | n/a | n/a | n/a | 3.444 | n/a | 0.000 | 0.000 | 0.259 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.050 | 3.444 | 0.289 | 7.050 |
| p99 | 251.768 | n/a | n/a | n/a | 17.926 | n/a | 1.366 | 0.000 | 1.286 | 248.271 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 47.063 | 18.409 | 0.826 | 47.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d020000000000000222 | 984.823 | 2.530 | n/a | 0.000 | 0.000 | 0.713 | 980.032 | 1.405 | n/a | 0.052 | 0.000 | n/a | n/a | 0.091 | 2.530 | 0.003 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d020000000000000217 | 669.710 | 2.168 | n/a | 0.000 | 0.000 | 2.283 | 665.140 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.075 | 2.168 | 0.003 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d020000000000000223 | 639.921 | 4.450 | n/a | 0.000 | 0.000 | 2.527 | 632.789 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.085 | 4.450 | 0.007 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d02000000000000021f | 540.329 | 2.147 | n/a | 0.000 | 0.000 | 0.668 | 537.358 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.096 | 2.147 | 0.004 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d02000000000000021a | 518.618 | 3.272 | n/a | 0.000 | 0.000 | 0.441 | 514.766 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.072 | 3.272 | 0.006 | 0.072 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000000220 | 483.768 | 5.151 | n/a | 0.000 | 0.000 | 0.836 | 477.443 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.265 | 5.151 | 0.011 | 0.265 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d020000000000000218 | 324.633 | 4.095 | n/a | 0.000 | 0.000 | 0.720 | 319.620 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.127 | 4.095 | 0.013 | 0.127 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d02000000000000021c | 251.768 | 2.421 | n/a | 0.000 | 0.000 | 0.917 | 248.271 | 0.022 | n/a | 0.049 | 0.000 | n/a | n/a | 0.089 | 2.421 | 0.010 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d02000000000000021d | 245.536 | 4.949 | n/a | 0.000 | 0.000 | 0.799 | 239.517 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.213 | 4.949 | 0.020 | 0.213 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000004d6 | 111.104 | 9.149 | n/a | 0.829 | 0.000 | 1.371 | 99.536 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.181 | 9.978 | 0.090 | 0.181 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d02000000000000050f | 110.302 | 16.768 | n/a | 0.000 | 0.000 | 1.035 | 92.227 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.245 | 16.768 | 0.152 | 0.245 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d020000000000000301 | 104.680 | 3.506 | n/a | 0.000 | 0.000 | 0.544 | 100.475 | 0.017 | n/a | 0.021 | 0.000 | n/a | n/a | 0.117 | 3.506 | 0.033 | 0.117 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d0200000000000002ca | 103.624 | 9.647 | n/a | 0.000 | 0.000 | 0.360 | 93.464 | 0.004 | n/a | 0.010 | 0.000 | n/a | n/a | 0.139 | 9.647 | 0.093 | 0.139 | gw-r/thread-45/gateway.admitted-work | none observed |
| 2e64f97a4f196d02000000000000064d | 93.183 | 6.746 | n/a | 0.000 | 0.000 | 0.798 | 85.408 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.219 | 6.746 | 0.072 | 0.219 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d0200000000000005d2 | 92.418 | 5.539 | n/a | 0.000 | 0.000 | 0.506 | 86.272 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.079 | 5.539 | 0.060 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d02000000000000061d | 90.334 | 5.703 | n/a | 0.000 | 0.000 | 0.486 | 83.903 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.192 | 5.703 | 0.063 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d020000000000000781 | 89.956 | 3.900 | n/a | 0.000 | 0.000 | 0.458 | 85.475 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.101 | 3.900 | 0.043 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d02000000000000073d | 87.679 | 2.762 | n/a | 0.000 | 0.000 | 0.407 | 84.403 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.072 | 2.762 | 0.032 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d02000000000000075b | 83.088 | 17.035 | n/a | 1.374 | 0.000 | 0.663 | 63.831 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.169 | 18.409 | 0.222 | 0.169 | gw-r/thread-45/journal/page | none observed |
| 2e64f97a4f196d0200000000000004de | 82.993 | 2.213 | n/a | 0.000 | 0.000 | 0.715 | 79.905 | 0.012 | n/a | 0.056 | 0.000 | n/a | n/a | 0.091 | 2.213 | 0.027 | 0.091 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / internal (2251 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.756 | n/a | n/a | n/a | 4.289 | n/a | 0.000 | 0.000 | 0.249 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.228 | 4.323 | 0.366 | 6.228 |
| p99 | 347.835 | n/a | n/a | n/a | 22.031 | n/a | 1.726 | 0.000 | 1.377 | 336.673 | 0.012 | n/a | 0.039 | 0.000 | n/a | n/a | 47.425 | 23.432 | 0.845 | 47.425 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2e64f97a4f196d020000000000001a6c | 1004.877 | 4.052 | n/a | 0.000 | 0.000 | 0.656 | 1000.062 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.071 | 4.052 | 0.004 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000001a62 | 1004.766 | 0.105 | n/a | 0.000 | 0.000 | 2.572 | 1000.863 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 1.177 | 0.105 | 0.000 | 1.177 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000001aae | 1003.044 | 0.150 | n/a | 0.000 | 0.000 | 0.626 | 1001.110 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 1.107 | 0.150 | 0.000 | 1.107 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000001a61 | 995.274 | 2.118 | n/a | 0.000 | 0.000 | 0.354 | 992.703 | 0.011 | n/a | 0.039 | 0.000 | n/a | n/a | 0.049 | 2.118 | 0.002 | 0.049 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d020000000000001aa6 | 992.815 | 4.188 | n/a | 0.000 | 0.000 | 0.615 | 987.789 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.188 | 4.188 | 0.004 | 0.188 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000001aaa | 982.826 | 2.839 | n/a | 0.000 | 0.000 | 0.447 | 979.400 | 0.013 | n/a | 0.049 | 0.000 | n/a | n/a | 0.078 | 2.839 | 0.003 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 2e64f97a4f196d020000000000001a85 | 982.767 | 16.639 | n/a | 1.218 | 0.000 | 0.523 | 964.018 | 0.016 | n/a | 0.034 | 0.000 | n/a | n/a | 0.318 | 17.857 | 0.018 | 0.318 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000001a88 | 948.343 | 6.636 | n/a | 0.000 | 0.000 | 1.052 | 940.424 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.190 | 6.636 | 0.007 | 0.190 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d020000000000001a9f | 744.463 | 2.432 | n/a | 0.000 | 0.000 | 0.321 | 741.561 | 0.011 | n/a | 0.032 | 0.000 | n/a | n/a | 0.106 | 2.432 | 0.003 | 0.106 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000001a76 | 744.086 | 7.830 | n/a | 0.000 | 0.000 | 0.533 | 735.492 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.202 | 7.830 | 0.011 | 0.202 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000001a67 | 722.465 | 6.364 | n/a | 0.000 | 0.000 | 1.464 | 714.317 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.287 | 6.364 | 0.009 | 0.287 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d020000000000001a7c | 689.125 | 8.046 | n/a | 0.000 | 0.000 | 0.798 | 679.985 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.261 | 8.046 | 0.012 | 0.261 | gw-r/thread-47/journal/page | none observed |
| 2e64f97a4f196d020000000000001a95 | 668.527 | 3.102 | n/a | 0.000 | 0.000 | 0.813 | 664.478 | 0.015 | n/a | 0.042 | 0.000 | n/a | n/a | 0.077 | 3.102 | 0.005 | 0.077 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d020000000000001a64 | 598.377 | 11.436 | n/a | 0.000 | 0.000 | 0.628 | 585.947 | 0.029 | n/a | 0.021 | 0.000 | n/a | n/a | 0.316 | 11.436 | 0.019 | 0.316 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000001aa7 | 542.658 | 2.778 | n/a | 0.000 | 0.000 | 0.563 | 539.156 | 0.016 | n/a | 0.051 | 0.000 | n/a | n/a | 0.094 | 2.778 | 0.005 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 2e64f97a4f196d020000000000001a81 | 471.015 | 7.398 | n/a | 0.000 | 0.000 | 0.832 | 462.519 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.200 | 7.398 | 0.016 | 0.200 | gw-r/thread-46/journal/page | none observed |
| 2e64f97a4f196d020000000000001aa8 | 470.920 | 3.077 | n/a | 0.000 | 0.000 | 0.479 | 467.250 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.077 | 3.077 | 0.007 | 0.077 | gw-r/thread-42/journal/page | none observed |
| 2e64f97a4f196d020000000000001aa2 | 452.930 | 2.614 | n/a | 0.000 | 0.000 | 0.469 | 449.746 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.072 | 2.614 | 0.006 | 0.072 | gw-r/thread-66/journal/page | none observed |
| 2e64f97a4f196d020000000000001a9b | 424.650 | 2.483 | n/a | 0.000 | 0.000 | 0.438 | 421.592 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.089 | 2.483 | 0.006 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 2e64f97a4f196d020000000000001a6d | 375.231 | 2.129 | n/a | 0.000 | 0.000 | 0.375 | 372.612 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.070 | 2.129 | 0.006 | 0.070 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.632 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.988 | 201.241 | 0.014 | n/a | 0.119 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 207.037 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.432 | 204.733 | 6.170 | n/a | 0.769 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 06a3029f21895bfe000000000000002b | 207.037 | 0.000 | n/a | 0.000 | 0.000 | 5.432 | 201.171 | 0.044 | n/a | 0.183 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000035 | 206.591 | 0.000 | n/a | 0.000 | 0.000 | 1.280 | 204.733 | 0.015 | n/a | 0.119 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000041 | 206.328 | 0.000 | n/a | 0.000 | 0.000 | 5.047 | 201.035 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe0000000000000019 | 205.975 | 0.000 | n/a | 0.000 | 0.000 | 2.540 | 202.884 | 0.029 | n/a | 0.194 | 0.000 | n/a | n/a | 0.329 | 0.000 | 0.000 | 0.329 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000058 | 205.725 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 204.561 | 0.013 | n/a | 0.116 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe0000000000000015 | 205.710 | 0.000 | n/a | 0.000 | 0.000 | 1.179 | 204.264 | 0.014 | n/a | 0.145 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe000000000000001e | 205.634 | 0.000 | n/a | 0.000 | 0.000 | 1.715 | 203.660 | 0.027 | n/a | 0.114 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000038 | 205.453 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 204.461 | 0.014 | n/a | 0.157 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe000000000000003c | 205.250 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 204.205 | 0.022 | n/a | 0.139 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe0000000000000045 | 205.036 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 204.201 | 0.013 | n/a | 0.114 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe0000000000000024 | 204.760 | 0.000 | n/a | 0.000 | 0.000 | 2.144 | 202.195 | 0.034 | n/a | 0.172 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000013 | 204.751 | 0.000 | n/a | 0.000 | 0.000 | 1.128 | 202.534 | 0.030 | n/a | 0.763 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe0000000000000056 | 204.342 | 0.000 | n/a | 0.000 | 0.000 | 0.724 | 203.304 | 0.015 | n/a | 0.152 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000029 | 204.236 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 203.119 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.302 | 0.000 | 0.000 | 0.302 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe000000000000002f | 204.189 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 203.216 | 0.021 | n/a | 0.163 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe0000000000000047 | 204.011 | 0.000 | n/a | 0.000 | 0.000 | 1.554 | 202.078 | 0.025 | n/a | 0.189 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe0000000000000012 | 203.942 | 0.000 | n/a | 0.000 | 0.000 | 2.622 | 201.036 | 0.013 | n/a | 0.153 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe0000000000000017 | 203.604 | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 202.088 | 0.014 | n/a | 0.153 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe000000000000000d | 203.568 | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 202.034 | 0.018 | n/a | 0.124 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000046 | 203.353 | 0.000 | n/a | 0.000 | 0.000 | 1.230 | 201.638 | 0.021 | n/a | 0.253 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.402 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 201.071 | 0.017 | n/a | 0.115 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 |
| p99 | 217.883 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.263 | 211.692 | 40.340 | n/a | 3.003 | 0.000 | n/a | n/a | 0.326 | 0.000 | 0.000 | 0.326 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 06a3029f21895bfe000000000000007a | 217.883 | 0.000 | n/a | 0.000 | 0.000 | 5.820 | 211.692 | 0.062 | n/a | 0.168 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe0000000000000068 | 207.323 | 0.000 | n/a | 0.000 | 0.000 | 6.263 | 200.815 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000064 | 206.960 | 0.000 | n/a | 0.000 | 0.000 | 1.302 | 205.312 | 0.016 | n/a | 0.134 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe00000000000000a3 | 206.480 | 0.000 | n/a | 0.000 | 0.000 | 4.379 | 201.688 | 0.045 | n/a | 0.243 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe000000000000007f | 205.873 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 204.881 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe00000000000000bd | 205.828 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 204.916 | 0.021 | n/a | 0.134 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe0000000000000091 | 205.820 | 0.000 | n/a | 0.000 | 0.000 | 1.216 | 204.177 | 0.035 | n/a | 0.279 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe000000000000007d | 205.209 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 203.923 | 0.018 | n/a | 0.123 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe000000000000005a | 205.069 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 203.888 | 0.040 | n/a | 0.113 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe00000000000000a5 | 205.068 | 0.000 | n/a | 0.000 | 0.000 | 2.800 | 201.636 | 0.013 | n/a | 0.354 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe000000000000006c | 204.143 | 0.000 | n/a | 0.000 | 0.000 | 1.280 | 202.345 | 0.025 | n/a | 0.292 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe00000000000000be | 204.133 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 202.912 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe000000000000006a | 203.831 | 0.000 | n/a | 0.000 | 0.000 | 1.009 | 202.164 | 0.078 | n/a | 0.376 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe000000000000007c | 203.778 | 0.000 | n/a | 0.000 | 0.000 | 1.256 | 202.027 | 0.033 | n/a | 0.273 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe000000000000007b | 203.766 | 0.000 | n/a | 0.000 | 0.000 | 1.565 | 201.679 | 0.029 | n/a | 0.229 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000066 | 203.632 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 199.433 | 0.030 | n/a | 3.003 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe0000000000000062 | 203.542 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 202.500 | 0.021 | n/a | 0.292 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe0000000000000090 | 203.541 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 202.261 | 0.049 | n/a | 0.225 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe00000000000000b1 | 203.522 | 0.000 | n/a | 0.000 | 0.000 | 1.576 | 201.552 | 0.018 | n/a | 0.156 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe00000000000000b7 | 203.459 | 0.000 | n/a | 0.000 | 0.000 | 2.260 | 200.924 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.128 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 200.955 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 206.762 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.179 | 204.744 | 7.543 | n/a | 0.712 | 0.000 | n/a | n/a | 0.343 | 0.000 | 0.000 | 0.343 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 06a3029f21895bfe00000000000000cc | 206.762 | 0.000 | n/a | 0.000 | 0.000 | 4.801 | 201.675 | 0.012 | n/a | 0.142 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe00000000000000d8 | 206.257 | 0.000 | n/a | 0.000 | 0.000 | 5.179 | 200.778 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000125 | 206.057 | 0.000 | n/a | 0.000 | 0.000 | 1.012 | 204.744 | 0.036 | n/a | 0.089 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe00000000000000d6 | 205.789 | 0.000 | n/a | 0.000 | 0.000 | 1.159 | 204.430 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe00000000000000d5 | 205.719 | 0.000 | n/a | 0.000 | 0.000 | 4.543 | 200.971 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000118 | 205.612 | 0.000 | n/a | 0.000 | 0.000 | 0.698 | 204.666 | 0.008 | n/a | 0.107 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe00000000000000d2 | 205.559 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 204.420 | 0.014 | n/a | 0.109 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe000000000000011c | 204.537 | 0.000 | n/a | 0.000 | 0.000 | 0.988 | 203.323 | 0.010 | n/a | 0.107 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe00000000000000cd | 204.403 | 0.000 | n/a | 0.000 | 0.000 | 2.246 | 201.854 | 0.014 | n/a | 0.120 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe000000000000011e | 204.181 | 0.000 | n/a | 0.000 | 0.000 | 1.764 | 202.143 | 0.035 | n/a | 0.122 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000106 | 203.673 | 0.000 | n/a | 0.000 | 0.000 | 2.458 | 201.009 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe00000000000000c7 | 203.552 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 202.596 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe00000000000000c2 | 203.540 | 0.000 | n/a | 0.000 | 0.000 | 1.175 | 201.848 | 0.017 | n/a | 0.157 | 0.000 | n/a | n/a | 0.343 | 0.000 | 0.000 | 0.343 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000107 | 203.515 | 0.000 | n/a | 0.000 | 0.000 | 2.317 | 200.955 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe0000000000000123 | 203.368 | 0.000 | n/a | 0.000 | 0.000 | 0.570 | 202.520 | 0.017 | n/a | 0.060 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe00000000000000fa | 203.342 | 0.000 | n/a | 0.000 | 0.000 | 1.306 | 201.735 | 0.039 | n/a | 0.135 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe00000000000000e8 | 203.325 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 202.184 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe000000000000010d | 203.144 | 0.000 | n/a | 0.000 | 0.000 | 1.044 | 201.871 | 0.007 | n/a | 0.090 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe0000000000000119 | 203.127 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 202.081 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000112 | 203.125 | 0.000 | n/a | 0.000 | 0.000 | 1.602 | 201.083 | 0.007 | n/a | 0.093 | 0.000 | n/a | n/a | 0.340 | 0.000 | 0.000 | 0.340 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.939 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 200.914 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 234.000 | n/a | n/a | n/a | 0.823 | n/a | 0.000 | 0.000 | 12.609 | 214.035 | 4.036 | n/a | 2.987 | 0.000 | n/a | n/a | 6.454 | 0.823 | 0.004 | 6.454 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 06a3029f21895bfe0000000000000132 | 234.000 | 0.823 | n/a | 0.000 | 0.000 | 9.681 | 214.035 | 0.020 | n/a | 2.987 | 0.000 | n/a | n/a | 6.454 | 0.823 | 0.004 | 6.454 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000139 | 207.671 | 0.000 | n/a | 0.000 | 0.000 | 4.613 | 202.881 | 0.013 | n/a | 0.046 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe000000000000013d | 204.976 | 0.000 | n/a | 0.000 | 0.000 | 4.698 | 195.909 | 4.014 | n/a | 0.091 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe0000000000000160 | 204.760 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 203.669 | 0.009 | n/a | 0.078 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe000000000000018c | 203.984 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 202.883 | 0.025 | n/a | 0.150 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe000000000000013f | 203.983 | 0.000 | n/a | 0.000 | 0.000 | 1.810 | 201.927 | 0.018 | n/a | 0.117 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe0000000000000134 | 203.841 | 0.000 | n/a | 0.000 | 0.000 | 0.852 | 201.172 | 1.555 | n/a | 0.080 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000150 | 203.824 | 0.000 | n/a | 0.000 | 0.000 | 0.488 | 203.150 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe0000000000000141 | 203.638 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 202.251 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe000000000000015e | 203.583 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 202.342 | 0.014 | n/a | 0.052 | 0.000 | n/a | n/a | 0.299 | 0.000 | 0.000 | 0.299 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000180 | 203.287 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 202.050 | 0.030 | n/a | 0.111 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe0000000000000131 | 203.221 | 0.000 | n/a | 0.000 | 0.000 | 1.537 | 201.319 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe000000000000014d | 203.119 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 202.377 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe0000000000000179 | 202.999 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 201.775 | 0.028 | n/a | 0.099 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe000000000000012e | 202.985 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.667 | 0.037 | n/a | 0.122 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe000000000000013a | 202.891 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 201.731 | 0.010 | n/a | 0.111 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe000000000000017a | 202.881 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 202.018 | 0.009 | n/a | 0.078 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe000000000000013c | 202.742 | 0.000 | n/a | 0.000 | 0.000 | 1.826 | 200.658 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe000000000000014e | 202.723 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 201.472 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe000000000000016d | 202.717 | 0.000 | n/a | 0.000 | 0.000 | 1.352 | 201.075 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.852 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 200.826 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 |
| p99 | 208.254 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.061 | 206.894 | 4.671 | n/a | 0.373 | 0.000 | n/a | n/a | 0.507 | 0.000 | 0.000 | 0.507 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 06a3029f21895bfe00000000000001ac | 226.649 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 224.573 | 0.055 | n/a | 0.256 | 0.000 | n/a | n/a | 0.507 | 0.000 | 0.000 | 0.507 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe00000000000001aa | 208.254 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 206.894 | 0.051 | n/a | 0.149 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe00000000000001b2 | 207.329 | 0.000 | n/a | 0.000 | 0.000 | 6.061 | 201.071 | 0.016 | n/a | 0.060 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe00000000000001b4 | 205.394 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 204.291 | 0.008 | n/a | 0.119 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000196 | 204.972 | 0.000 | n/a | 0.000 | 0.000 | 2.230 | 202.488 | 0.054 | n/a | 0.087 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe00000000000001f7 | 204.603 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 202.912 | 0.331 | n/a | 0.125 | 0.000 | n/a | n/a | 0.356 | 0.000 | 0.000 | 0.356 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe00000000000001b3 | 204.342 | 0.000 | n/a | 0.000 | 0.000 | 1.650 | 202.272 | 0.007 | n/a | 0.098 | 0.000 | n/a | n/a | 0.314 | 0.000 | 0.000 | 0.314 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe00000000000001de | 204.167 | 0.000 | n/a | 0.000 | 0.000 | 1.723 | 201.875 | 0.009 | n/a | 0.175 | 0.000 | n/a | n/a | 0.385 | 0.000 | 0.000 | 0.385 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe00000000000001d4 | 204.087 | 0.000 | n/a | 0.000 | 0.000 | 2.743 | 201.071 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe00000000000001b6 | 203.638 | 0.000 | n/a | 0.000 | 0.000 | 2.444 | 200.957 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe00000000000001ea | 203.589 | 0.000 | n/a | 0.000 | 0.000 | 1.692 | 201.559 | 0.017 | n/a | 0.115 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe00000000000001ff | 203.543 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 200.760 | 0.315 | n/a | 1.245 | 0.000 | n/a | n/a | 0.584 | 0.000 | 0.000 | 0.584 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe00000000000001af | 203.465 | 0.000 | n/a | 0.000 | 0.000 | 1.439 | 199.422 | 2.440 | n/a | 0.023 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe00000000000001c4 | 203.064 | 0.000 | n/a | 0.000 | 0.000 | 2.004 | 200.823 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe00000000000001fc | 203.025 | 0.000 | n/a | 0.000 | 0.000 | 1.637 | 201.126 | 0.026 | n/a | 0.120 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe000000000000018f | 202.957 | 0.000 | n/a | 0.000 | 0.000 | 1.642 | 201.106 | 0.028 | n/a | 0.080 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe00000000000001a1 | 202.941 | 0.000 | n/a | 0.000 | 0.000 | 1.400 | 201.257 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000190 | 202.764 | 0.000 | n/a | 0.000 | 0.000 | 1.088 | 201.246 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.314 | 0.000 | 0.000 | 0.314 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe00000000000001fd | 202.711 | 0.000 | n/a | 0.000 | 0.000 | 0.847 | 201.554 | 0.019 | n/a | 0.140 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe00000000000001ae | 202.642 | 0.000 | n/a | 0.000 | 0.000 | 0.981 | 201.419 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.787 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 200.869 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 |
| p99 | 205.023 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.917 | 204.296 | 6.319 | n/a | 0.135 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 06a3029f21895bfe0000000000000261 | 205.816 | 0.000 | n/a | 0.000 | 0.000 | 0.506 | 205.073 | 0.014 | n/a | 0.120 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe0000000000000219 | 205.023 | 0.000 | n/a | 0.000 | 0.000 | 0.564 | 204.296 | 0.013 | n/a | 0.048 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000250 | 204.958 | 0.000 | n/a | 0.000 | 0.000 | 3.917 | 200.869 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe000000000000022e | 204.303 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 203.419 | 0.021 | n/a | 0.060 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe000000000000020f | 203.138 | 0.000 | n/a | 0.000 | 0.000 | 0.795 | 202.075 | 0.028 | n/a | 0.128 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe000000000000023d | 203.130 | 0.000 | n/a | 0.000 | 0.000 | 1.741 | 201.008 | 0.013 | n/a | 0.075 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe0000000000000240 | 203.097 | 0.000 | n/a | 0.000 | 0.000 | 1.697 | 201.073 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000235 | 202.942 | 0.000 | n/a | 0.000 | 0.000 | 1.399 | 201.263 | 0.006 | n/a | 0.074 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe000000000000021a | 202.916 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 201.612 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe0000000000000223 | 202.901 | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 201.330 | 0.015 | n/a | 0.083 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000212 | 202.848 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 201.622 | 0.011 | n/a | 0.135 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe0000000000000237 | 202.761 | 0.000 | n/a | 0.000 | 0.000 | 1.645 | 200.913 | 0.026 | n/a | 0.064 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe0000000000000262 | 202.745 | 0.000 | n/a | 0.000 | 0.000 | 1.211 | 201.320 | 0.006 | n/a | 0.107 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000270 | 202.682 | 0.000 | n/a | 0.000 | 0.000 | 0.878 | 201.513 | 0.026 | n/a | 0.097 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe000000000000023f | 202.677 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 201.423 | 0.021 | n/a | 0.127 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000258 | 202.451 | 0.000 | n/a | 0.000 | 0.000 | 0.986 | 201.280 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe0000000000000268 | 202.410 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 201.252 | 0.019 | n/a | 0.086 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000243 | 202.400 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.327 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe000000000000026c | 202.380 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 201.407 | 0.009 | n/a | 0.112 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000272 | 202.377 | 0.000 | n/a | 0.000 | 0.000 | 0.847 | 201.221 | 0.022 | n/a | 0.185 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-42/journal/page | none observed |

## P3 / L1024 / read (70 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.543 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.514 | 68.880 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 206.673 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.963 | 203.771 | 1.147 | n/a | 0.873 | 0.000 | n/a | n/a | 83.856 | 0.000 | 0.000 | 83.856 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 06a3029f21895bfe0000000000000287 | 206.673 | 0.000 | n/a | 0.000 | 0.000 | 2.693 | 203.771 | 0.014 | n/a | 0.075 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe0000000000000284 | 205.984 | 0.000 | n/a | 0.000 | 0.000 | 1.858 | 202.674 | 0.013 | n/a | 0.873 | 0.000 | n/a | n/a | 0.566 | 0.000 | 0.000 | 0.566 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000285 | 204.603 | 0.000 | n/a | 0.000 | 0.000 | 2.154 | 202.067 | 0.009 | n/a | 0.116 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe000000000000027d | 203.168 | 0.000 | n/a | 0.000 | 0.000 | 1.033 | 201.817 | 0.010 | n/a | 0.130 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe000000000000027b | 202.592 | 0.000 | n/a | 0.000 | 0.000 | 1.073 | 201.253 | 0.006 | n/a | 0.090 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe000000000000028d | 202.442 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 201.404 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000281 | 202.361 | 0.000 | n/a | 0.000 | 0.000 | 1.175 | 200.949 | 0.013 | n/a | 0.081 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe0000000000000282 | 202.060 | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 200.962 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe0000000000000289 | 201.972 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 200.850 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000275 | 201.958 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 201.018 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 06a3029f21895bfe0000000000000274 | 201.918 | 0.000 | n/a | 0.000 | 0.000 | 0.402 | 201.283 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe000000000000028a | 201.685 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 200.822 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000288 | 201.659 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 200.928 | 0.017 | n/a | 0.065 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000276 | 201.585 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 200.843 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe000000000000027f | 201.572 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 200.955 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe000000000000028c | 201.560 | 0.000 | n/a | 0.000 | 0.000 | 0.498 | 200.817 | 0.025 | n/a | 0.098 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-42/journal/page | none observed |
| 06a3029f21895bfe000000000000027a | 201.394 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 200.707 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000278 | 201.193 | 0.000 | n/a | 0.000 | 0.000 | 0.377 | 200.661 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe000000000000028e | 192.682 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 191.816 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe00000000000003da | 104.039 | 0.000 | n/a | 0.000 | 0.000 | 3.763 | 100.103 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (225 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 85.490 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 79.867 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 204.605 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 18.756 | 202.025 | 0.730 | n/a | 0.192 | 0.000 | n/a | n/a | 50.312 | 0.000 | 0.000 | 50.312 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 06a3029f21895bfe0000000000000ede | 219.996 | 0.000 | n/a | 0.000 | 0.000 | 19.047 | 200.711 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-66/journal/page | none observed |
| 06a3029f21895bfe0000000000000ed1 | 207.480 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 205.815 | 0.021 | n/a | 0.491 | 0.000 | n/a | n/a | 0.396 | 0.000 | 0.000 | 0.396 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000ed4 | 204.605 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 203.557 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-66/journal/page | none observed |
| 06a3029f21895bfe0000000000000eef | 203.009 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 201.570 | 0.018 | n/a | 0.192 | 0.000 | n/a | n/a | 0.366 | 0.000 | 0.000 | 0.366 | gw-r/thread-46/journal/page | none observed |
| 06a3029f21895bfe0000000000000eee | 202.994 | 0.000 | n/a | 0.000 | 0.000 | 2.226 | 200.526 | 0.009 | n/a | 0.034 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-66/journal/page | none observed |
| 06a3029f21895bfe0000000000000f14 | 202.978 | 0.000 | n/a | 0.000 | 0.000 | 2.109 | 200.652 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-66/journal/page | none observed |
| 06a3029f21895bfe0000000000000ed6 | 202.828 | 0.000 | n/a | 0.000 | 0.000 | 1.494 | 201.075 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000f07 | 202.720 | 0.000 | n/a | 0.000 | 0.000 | 0.513 | 202.025 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-66/journal/page | none observed |
| 06a3029f21895bfe0000000000000eb9 | 202.160 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 201.259 | 0.024 | n/a | 0.120 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000efb | 202.119 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 200.972 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000f09 | 202.088 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 200.634 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000ebc | 202.063 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 200.947 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 06a3029f21895bfe0000000000000f05 | 202.038 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 201.112 | 0.035 | n/a | 0.060 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000f17 | 202.012 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 200.991 | 0.047 | n/a | 0.160 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-66/journal/page | none observed |
| 06a3029f21895bfe0000000000000f06 | 202.011 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 200.874 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000ec4 | 202.004 | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 200.795 | 0.024 | n/a | 0.096 | 0.000 | n/a | n/a | 0.273 | 0.000 | 0.000 | 0.273 | gw-r/thread-49/journal/page | none observed |
| 06a3029f21895bfe0000000000000ee3 | 202.000 | 0.000 | n/a | 0.000 | 0.000 | 1.310 | 200.540 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000eb7 | 201.976 | 0.000 | n/a | 0.000 | 0.000 | 1.244 | 200.576 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 06a3029f21895bfe0000000000000ed3 | 201.918 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 200.991 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 06a3029f21895bfe0000000000000f04 | 201.903 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 200.879 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

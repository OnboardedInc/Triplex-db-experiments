# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (50.367 ms, trace `47bb2b3d052fd0de0000000000001271`); `node-14/thread-0/driver.queue.subject` (82.480 ms, trace `47bb2b3d052fd0de0000000000001275`); `node-14/thread-0/socket.wait-first-byte` (80.547 ms, trace `47bb2b3d052fd0de000000000000043a`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (43.345 ms, trace `47bb2b3d052fd0de00000000000006ba`); `gw-w/thread-48/gateway.admitted-work` (62.931 ms, trace `47bb2b3d052fd0de00000000000004b7`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-seed-a-1-baseline`; source `647da7a8545c6ff0acd545de48fde57601c3de71`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 7175173.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 214 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13492.599 | 594.189 | 69.554 | 308 |
| L1 | 0 | 18990.299 | 428.117 | 17.009 | 459 |
| L4 | 0 | 19204.822 | 375.175 | 11.664 | 423 |
| L16 | 0 | 19967.307 | 374.601 | 10.404 | 474 |
| L64 | 0 | 19970.414 | 436.717 | 14.184 | 610 |
| L256 | 0 | 19973.662 | 386.795 | 10.240 | 472 |
| L1024 | 0 | 19971.080 | 3919.542 | 132.080 | 12050 |
| tail | 0 | 64530.337 | 10727.392 | 556.524 | 37379 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 47bb2b3d052fd0de0000000000001271 | driver.queue.scheduler-late | 1.302 | none | 2 / 32 |
| 47bb2b3d052fd0de0000000000001271 | driver.queue.scheduler-dispatch | 0.024 | none | 2 / 32 |

Observed active steps while trace 47bb2b3d052fd0de0000000000001271 waited: []

| 47bb2b3d052fd0de0000000000001275 | driver.queue.subject | 82.480 | 47bb2b3d052fd0de0000000000001274 | 4 / 32 |
| 47bb2b3d052fd0de0000000000001275 | driver.queue.scheduler-late | 1.245 | none | 4 / 32 |
| 47bb2b3d052fd0de0000000000001275 | driver.queue.scheduler-dispatch | 0.055 | none | 4 / 32 |

Observed active steps while trace 47bb2b3d052fd0de0000000000001275 waited: [{"at":1794605438407.8928,"inFlight":4,"capacity":32,"active":[{"traceId":"47bb2b3d052fd0de000000000000126f","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001270","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001271","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001273","step":"client.http"}]},{"at":1794605438432.946,"inFlight":5,"capacity":32,"active":[{"traceId":"47bb2b3d052fd0de0000000000001270","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001271","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001273","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001276","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001278","step":"client.http"}]},{"at":1794605438455.2725,"inFlight":3,"capacity":32,"active":[{"traceId":"47bb2b3d052fd0de0000000000001271","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001278","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001272","step":"client.http"}]},{"at":1794605438475.333,"inFlight":6,"capacity":32,"active":[{"traceId":"47bb2b3d052fd0de0000000000001271","step":"client.http"},{"traceId":"47bb2b3d052fd0de000000000000127c","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001274","step":"client.http"},{"traceId":"47bb2b3d052fd0de000000000000127f","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001280","step":"client.http"},{"traceId":"47bb2b3d052fd0de0000000000001281","step":"client.http"}]}]

| 47bb2b3d052fd0de000000000000043a | driver.queue.scheduler-late | 0.814 | none | 0 / 32 |
| 47bb2b3d052fd0de000000000000043a | driver.queue.scheduler-dispatch | 0.075 | none | 0 / 32 |

Observed active steps while trace 47bb2b3d052fd0de000000000000043a waited: []

| 47bb2b3d052fd0de00000000000006ba | driver.queue.scheduler-late | 0.766 | none | 4 / 32 |
| 47bb2b3d052fd0de00000000000006ba | driver.queue.scheduler-dispatch | 0.105 | none | 4 / 32 |

Observed active steps while trace 47bb2b3d052fd0de00000000000006ba waited: []

| 47bb2b3d052fd0de00000000000004b7 | driver.queue.scheduler-dispatch | 0.068 | none | 0 / 32 |
| 47bb2b3d052fd0de00000000000004b7 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 47bb2b3d052fd0de00000000000004b7 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.713 | 0.508 | 0.000 | 1.565 | 5.301 | 0.030 | 0.000 | 0.188 | 1.354 | 9.874 | 0.040 | n/a | 0.440 | 13.525 | n/a | n/a | 0.055 | 6.131 | 0.210 | 0.055 |
| p99 | 115.121 | 5.828 | 0.017 | 6.529 | 18.969 | 0.930 | 5.789 | 1.065 | 86.012 | 38.060 | 0.232 | n/a | 3.534 | 43.934 | n/a | n/a | 0.426 | 25.588 | 0.450 | 0.426 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de000000000000043a | 115.121 | 9.521 | 0.011 | 0.000 | 0.889 | 86.012 | 1.738 | 0.031 | n/a | 0.273 | 16.609 | n/a | n/a | 0.037 | 10.421 | 0.091 | 0.037 | node-14/thread-0/socket.wait-first-byte | none observed |
| 47bb2b3d052fd0de0000000000000424 | 80.487 | 14.516 | 0.760 | 0.000 | 0.080 | 1.937 | 38.060 | 0.232 | n/a | 1.300 | 23.547 | n/a | n/a | 0.055 | 15.356 | 0.191 | 0.055 | gw-w/thread-45/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de0000000000000436 | 68.981 | 4.307 | 0.323 | 0.000 | 0.188 | 1.856 | 17.240 | 0.077 | n/a | 1.005 | 43.934 | n/a | n/a | 0.051 | 4.818 | 0.070 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000422 | 67.872 | 18.969 | 0.030 | 5.789 | 0.800 | 1.601 | 15.435 | 0.090 | n/a | 1.295 | 23.437 | n/a | n/a | 0.426 | 25.588 | 0.377 | 0.426 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000428 | 61.180 | 7.768 | 0.503 | 0.000 | 0.098 | 3.099 | 24.873 | 0.076 | n/a | 3.534 | 21.137 | n/a | n/a | 0.093 | 8.368 | 0.137 | 0.093 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000042f | 58.447 | 5.301 | 0.305 | 0.000 | 0.071 | 4.489 | 29.370 | 0.037 | n/a | 0.630 | 18.145 | n/a | n/a | 0.100 | 5.677 | 0.097 | 0.100 | gw-w/thread-42/gateway.admitted-work | driver.publication 1.401ms |
| 47bb2b3d052fd0de0000000000000446 | 43.112 | 5.665 | 0.234 | 0.511 | 0.062 | 1.819 | 15.525 | 0.035 | n/a | 0.225 | 19.001 | n/a | n/a | 0.034 | 6.472 | 0.150 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000043c | 42.635 | 5.726 | 0.258 | 2.592 | 0.061 | 1.227 | 10.757 | 0.059 | n/a | 0.431 | 21.484 | n/a | n/a | 0.042 | 8.636 | 0.203 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000042c | 39.714 | 5.003 | 0.364 | 0.000 | 0.070 | 4.916 | 15.958 | 0.050 | n/a | 0.625 | 12.647 | n/a | n/a | 0.081 | 5.437 | 0.137 | 0.081 | gw-w/thread-48/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de0000000000000448 | 39.389 | 8.028 | 0.005 | 4.978 | 0.684 | 1.042 | 2.472 | 0.042 | n/a | 1.225 | 20.857 | n/a | n/a | 0.057 | 13.695 | 0.348 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000440 | 38.982 | 7.568 | 0.930 | 0.343 | 0.063 | 1.683 | 16.578 | 0.046 | n/a | 0.249 | 11.482 | n/a | n/a | 0.040 | 8.905 | 0.228 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000452 | 38.383 | 4.301 | 0.193 | 0.254 | 0.063 | 1.354 | 14.591 | 0.039 | n/a | 2.210 | 15.339 | n/a | n/a | 0.039 | 4.811 | 0.125 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000458 | 35.854 | 4.263 | 0.306 | 0.347 | 0.103 | 1.341 | 15.917 | 0.040 | n/a | 0.220 | 13.254 | n/a | n/a | 0.063 | 5.018 | 0.140 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000434 | 35.298 | 5.362 | 0.282 | 0.000 | 0.066 | 1.709 | 15.279 | 0.053 | n/a | 0.233 | 12.242 | n/a | n/a | 0.073 | 5.710 | 0.162 | 0.073 | gw-w/thread-44/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de0000000000000432 | 34.713 | 6.728 | 0.006 | 0.000 | 0.540 | 1.343 | 7.487 | 0.061 | n/a | 1.026 | 17.262 | n/a | n/a | 0.259 | 7.274 | 0.210 | 0.259 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000044a | 33.907 | 4.061 | 0.259 | 0.264 | 0.046 | 1.025 | 15.536 | 0.088 | n/a | 0.411 | 12.173 | n/a | n/a | 0.043 | 4.630 | 0.137 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000044e | 33.701 | 9.668 | 0.248 | 0.238 | 0.062 | 1.480 | 10.824 | 0.049 | n/a | 0.211 | 10.884 | n/a | n/a | 0.037 | 10.216 | 0.303 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000043e | 31.635 | 4.616 | 0.545 | 0.385 | 0.075 | 1.353 | 9.874 | 0.037 | n/a | 0.427 | 14.288 | n/a | n/a | 0.035 | 5.621 | 0.178 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000042a | 28.910 | 5.964 | 0.006 | 0.000 | 0.412 | 0.833 | 2.273 | 0.044 | n/a | 0.961 | 18.354 | n/a | n/a | 0.063 | 6.381 | 0.221 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000441 | 27.330 | 4.679 | 0.009 | 1.512 | 0.770 | 1.932 | 4.543 | 0.037 | n/a | 0.301 | 13.513 | n/a | n/a | 0.035 | 6.970 | 0.255 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.259 | 0.544 | 0.000 | 1.871 | 4.237 | 0.007 | 0.000 | 0.770 | 0.953 | 1.481 | 0.031 | n/a | 0.529 | 10.798 | n/a | n/a | 0.063 | 5.879 | 0.255 | 0.063 |
| p99 | 28.910 | 2.286 | 0.017 | 3.206 | 5.964 | 0.012 | 1.512 | 1.065 | 3.966 | 4.543 | 0.044 | n/a | 0.961 | 18.354 | n/a | n/a | 0.170 | 6.970 | 0.450 | 0.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de000000000000042a | 28.910 | 5.964 | 0.006 | 0.000 | 0.412 | 0.833 | 2.273 | 0.044 | n/a | 0.961 | 18.354 | n/a | n/a | 0.063 | 6.381 | 0.221 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000441 | 27.330 | 4.679 | 0.009 | 1.512 | 0.770 | 1.932 | 4.543 | 0.037 | n/a | 0.301 | 13.513 | n/a | n/a | 0.035 | 6.970 | 0.255 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000444 | 23.379 | 4.108 | 0.005 | 1.245 | 0.521 | 0.680 | 1.264 | 0.026 | n/a | 0.539 | 14.950 | n/a | n/a | 0.041 | 5.879 | 0.251 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000426 | 21.905 | 4.212 | 0.007 | 0.000 | 1.065 | 3.966 | 1.438 | 0.034 | n/a | 0.214 | 10.798 | n/a | n/a | 0.170 | 5.284 | 0.241 | 0.170 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000450 | 20.259 | 5.229 | 0.010 | 0.000 | 0.893 | 0.953 | 2.622 | 0.031 | n/a | 0.226 | 10.250 | n/a | n/a | 0.045 | 6.131 | 0.303 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000042e | 19.611 | 4.237 | 0.010 | 0.000 | 0.840 | 0.805 | 1.237 | 0.024 | n/a | 0.558 | 11.829 | n/a | n/a | 0.070 | 5.086 | 0.259 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000456 | 16.916 | 3.234 | 0.006 | 0.000 | 0.650 | 0.945 | 1.709 | 0.044 | n/a | 0.658 | 9.635 | n/a | n/a | 0.034 | 3.890 | 0.230 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000044c | 15.055 | 4.184 | 0.007 | 0.000 | 0.997 | 1.143 | 1.232 | 0.031 | n/a | 0.440 | 6.957 | n/a | n/a | 0.063 | 5.189 | 0.345 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000454 | 14.149 | 5.920 | 0.012 | 0.000 | 0.441 | 1.910 | 1.481 | 0.031 | n/a | 0.529 | 3.720 | n/a | n/a | 0.104 | 6.373 | 0.450 | 0.104 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.552 | 0.239 | 0.000 | 0.434 | 4.590 | 0.180 | 0.000 | 0.084 | 2.008 | 11.080 | 0.044 | n/a | 0.380 | 14.466 | n/a | n/a | 0.051 | 5.029 | 0.145 | 0.051 |
| p99 | 43.897 | 1.950 | 0.000 | 2.986 | 5.816 | 0.355 | 0.368 | 8.800 | 4.338 | 19.205 | 0.083 | n/a | 0.855 | 24.703 | n/a | n/a | 0.071 | 14.620 | 0.334 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de000000000000045a | 43.897 | 4.649 | 0.230 | 0.368 | 0.090 | 1.668 | 19.205 | 0.083 | n/a | 0.265 | 17.287 | n/a | n/a | 0.051 | 5.337 | 0.122 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000c9c | 43.811 | 5.816 | 0.004 | 0.000 | 8.800 | 2.325 | 1.307 | 0.029 | n/a | 0.769 | 24.703 | n/a | n/a | 0.058 | 14.620 | 0.334 | 0.058 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.269ms; driver.publication 1.096ms |
| 47bb2b3d052fd0de00000000000004fb | 33.552 | 4.590 | 0.355 | 0.000 | 0.084 | 2.008 | 11.080 | 0.044 | n/a | 0.855 | 14.466 | n/a | n/a | 0.071 | 5.029 | 0.150 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004ac | 33.282 | 4.258 | 0.180 | 0.330 | 0.057 | 4.338 | 13.277 | 0.082 | n/a | 0.380 | 10.338 | n/a | n/a | 0.042 | 4.825 | 0.145 | 0.042 | gw-w/thread-46/gateway.admitted-work | none observed |

## P2 / L1 / commit (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.764 | 0.406 | 0.000 | 0.911 | 4.540 | 0.012 | 0.235 | 0.129 | 1.206 | 9.118 | 0.041 | n/a | 0.397 | 11.141 | n/a | n/a | 0.054 | 5.805 | 0.205 | 0.054 |
| p99 | 63.647 | 3.280 | 0.189 | 3.725 | 9.835 | 1.597 | 2.833 | 3.691 | 5.349 | 21.104 | 0.083 | n/a | 3.500 | 42.814 | n/a | n/a | 0.177 | 12.798 | 0.562 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de0000000000000468 | 63.647 | 6.392 | 0.200 | 0.224 | 0.066 | 2.897 | 13.586 | 0.041 | n/a | 2.125 | 38.070 | n/a | n/a | 0.046 | 6.882 | 0.108 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000046c | 62.836 | 6.132 | 0.007 | 1.480 | 0.673 | 0.937 | 10.523 | 0.032 | n/a | 0.187 | 42.814 | n/a | n/a | 0.052 | 8.292 | 0.132 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000047a | 47.881 | 3.585 | 0.161 | 0.253 | 0.078 | 1.183 | 12.110 | 0.060 | n/a | 0.877 | 29.530 | n/a | n/a | 0.043 | 4.077 | 0.085 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004a2 | 44.785 | 6.222 | 0.483 | 0.366 | 0.088 | 2.056 | 21.104 | 0.073 | n/a | 0.382 | 13.917 | n/a | n/a | 0.096 | 7.159 | 0.160 | 0.096 | gw-w/thread-42/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de000000000000049c | 44.697 | 5.051 | 0.254 | 0.439 | 0.061 | 1.561 | 17.220 | 0.070 | n/a | 0.327 | 19.665 | n/a | n/a | 0.048 | 5.805 | 0.130 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000045e | 44.331 | 4.284 | 0.209 | 0.242 | 0.071 | 2.074 | 19.323 | 0.069 | n/a | 0.284 | 17.726 | n/a | n/a | 0.050 | 4.806 | 0.108 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004a0 | 43.157 | 4.228 | 0.335 | 0.244 | 0.146 | 3.898 | 16.052 | 0.046 | n/a | 0.279 | 17.841 | n/a | n/a | 0.089 | 4.952 | 0.115 | 0.089 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000047e | 40.928 | 8.502 | 0.008 | 2.098 | 0.286 | 4.216 | 11.985 | 0.049 | n/a | 0.798 | 12.933 | n/a | n/a | 0.054 | 10.894 | 0.266 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000472 | 37.049 | 3.521 | 0.309 | 0.331 | 0.100 | 4.478 | 11.076 | 0.038 | n/a | 0.429 | 16.697 | n/a | n/a | 0.069 | 4.261 | 0.115 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000467 | 36.638 | 8.467 | 0.010 | 0.000 | 1.104 | 5.349 | 9.118 | 0.083 | n/a | 1.236 | 11.141 | n/a | n/a | 0.131 | 9.581 | 0.261 | 0.131 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000465 | 35.923 | 4.540 | 0.242 | 0.313 | 0.069 | 1.595 | 11.956 | 0.034 | n/a | 0.224 | 16.913 | n/a | n/a | 0.037 | 5.163 | 0.144 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000045c | 35.112 | 3.957 | 0.182 | 0.000 | 0.066 | 1.467 | 18.989 | 0.053 | n/a | 0.308 | 10.054 | n/a | n/a | 0.036 | 4.205 | 0.120 | 0.036 | gw-w/thread-42/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de000000000000046a | 34.035 | 6.300 | 0.216 | 0.377 | 0.095 | 1.439 | 8.068 | 0.075 | n/a | 0.397 | 16.993 | n/a | n/a | 0.076 | 6.989 | 0.205 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000470 | 32.858 | 3.469 | 0.193 | 0.235 | 0.064 | 1.206 | 16.319 | 0.065 | n/a | 0.845 | 10.420 | n/a | n/a | 0.042 | 3.961 | 0.121 | 0.042 | gw-w/thread-47/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de0000000000000476 | 32.837 | 5.094 | 0.191 | 0.385 | 0.081 | 1.587 | 10.989 | 0.041 | n/a | 3.500 | 10.931 | n/a | n/a | 0.038 | 5.751 | 0.175 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000486 | 32.245 | 4.835 | 0.255 | 0.441 | 0.100 | 1.622 | 12.209 | 0.037 | n/a | 0.201 | 12.490 | n/a | n/a | 0.054 | 5.631 | 0.175 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000463 | 32.195 | 5.826 | 0.010 | 0.000 | 1.099 | 1.297 | 1.353 | 0.026 | n/a | 1.380 | 21.147 | n/a | n/a | 0.056 | 6.935 | 0.215 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000492 | 30.811 | 5.283 | 0.253 | 0.492 | 0.063 | 1.565 | 12.795 | 0.053 | n/a | 0.350 | 9.906 | n/a | n/a | 0.051 | 6.092 | 0.198 | 0.051 | gw-w/thread-44/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000004aa | 30.441 | 4.194 | 0.275 | 0.298 | 0.121 | 1.200 | 10.847 | 0.036 | n/a | 0.200 | 13.178 | n/a | n/a | 0.091 | 4.888 | 0.161 | 0.091 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000480 | 28.786 | 5.394 | 0.262 | 0.233 | 0.054 | 1.653 | 12.552 | 0.061 | n/a | 0.343 | 8.179 | n/a | n/a | 0.056 | 5.943 | 0.206 | 0.056 | gw-w/thread-49/gateway.admitted-work | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.621 | 0.563 | 0.000 | 1.446 | 4.141 | 0.008 | 0.000 | 1.099 | 0.812 | 1.358 | 0.029 | n/a | 0.620 | 7.149 | n/a | n/a | 0.052 | 6.368 | 0.301 | 0.052 |
| p99 | 36.638 | 1.478 | 0.189 | 2.058 | 8.467 | 0.010 | 1.909 | 3.691 | 5.349 | 9.118 | 0.083 | n/a | 1.732 | 21.147 | n/a | n/a | 0.177 | 9.581 | 0.483 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de0000000000000467 | 36.638 | 8.467 | 0.010 | 0.000 | 1.104 | 5.349 | 9.118 | 0.083 | n/a | 1.236 | 11.141 | n/a | n/a | 0.131 | 9.581 | 0.261 | 0.131 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000463 | 32.195 | 5.826 | 0.010 | 0.000 | 1.099 | 1.297 | 1.353 | 0.026 | n/a | 1.380 | 21.147 | n/a | n/a | 0.056 | 6.935 | 0.215 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000478 | 22.042 | 4.485 | 0.009 | 1.909 | 0.831 | 1.043 | 1.560 | 0.030 | n/a | 0.620 | 11.515 | n/a | n/a | 0.040 | 7.233 | 0.328 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004a8 | 17.040 | 2.991 | 0.004 | 0.000 | 3.691 | 0.807 | 1.922 | 0.059 | n/a | 0.385 | 7.149 | n/a | n/a | 0.031 | 6.686 | 0.392 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.417ms; driver.publication 1.286ms |
| 47bb2b3d052fd0de000000000000048c | 16.621 | 4.141 | 0.008 | 0.000 | 0.860 | 0.667 | 1.115 | 0.027 | n/a | 0.243 | 9.483 | n/a | n/a | 0.077 | 5.008 | 0.301 | 0.077 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000482 | 15.156 | 4.374 | 0.006 | 0.000 | 1.202 | 0.804 | 1.439 | 0.033 | n/a | 0.208 | 6.914 | n/a | n/a | 0.177 | 5.582 | 0.368 | 0.177 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000049e | 13.746 | 3.565 | 0.006 | 0.000 | 0.129 | 0.915 | 1.358 | 0.029 | n/a | 1.732 | 5.960 | n/a | n/a | 0.052 | 3.700 | 0.269 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000490 | 13.197 | 3.803 | 0.010 | 0.000 | 2.555 | 0.812 | 1.035 | 0.028 | n/a | 1.469 | 3.443 | n/a | n/a | 0.042 | 6.368 | 0.483 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.931 | 0.465 | 0.000 | 0.863 | 4.507 | 0.014 | 0.000 | 0.119 | 1.322 | 4.855 | 0.032 | n/a | 0.262 | 11.170 | n/a | n/a | 0.052 | 5.092 | 0.208 | 0.052 |
| p99 | 96.333 | 5.166 | 0.000 | 5.683 | 8.147 | 0.747 | 2.385 | 1.370 | 2.496 | 65.201 | 0.376 | n/a | 0.722 | 71.462 | n/a | n/a | 0.113 | 10.631 | 0.449 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de00000000000004b7 | 96.333 | 5.454 | 0.747 | 0.355 | 0.071 | 1.680 | 65.201 | 0.046 | n/a | 0.192 | 22.547 | n/a | n/a | 0.040 | 6.627 | 0.069 | 0.040 | gw-w/thread-48/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000004e5 | 86.515 | 4.095 | 0.607 | 0.000 | 0.082 | 1.337 | 8.560 | 0.033 | n/a | 0.228 | 71.462 | n/a | n/a | 0.112 | 4.784 | 0.055 | 0.112 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004cd | 56.066 | 3.444 | 0.182 | 0.289 | 0.058 | 1.403 | 37.116 | 0.058 | n/a | 0.405 | 13.074 | n/a | n/a | 0.037 | 3.973 | 0.071 | 0.037 | gw-w/thread-49/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000004df | 45.267 | 4.742 | 0.363 | 0.000 | 0.093 | 2.496 | 18.381 | 0.036 | n/a | 0.189 | 18.906 | n/a | n/a | 0.061 | 5.198 | 0.115 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004cb | 37.133 | 4.728 | 0.215 | 0.451 | 0.082 | 1.591 | 17.417 | 0.060 | n/a | 0.184 | 12.342 | n/a | n/a | 0.064 | 5.475 | 0.147 | 0.064 | gw-w/thread-48/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000004f5 | 35.778 | 5.752 | 0.317 | 0.000 | 0.086 | 1.471 | 12.361 | 0.067 | n/a | 0.274 | 15.406 | n/a | n/a | 0.043 | 6.155 | 0.172 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004d9 | 35.428 | 6.001 | 0.376 | 0.526 | 0.066 | 1.819 | 13.797 | 0.031 | n/a | 0.381 | 12.390 | n/a | n/a | 0.041 | 6.969 | 0.197 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004b0 | 34.408 | 3.802 | 0.176 | 0.296 | 0.064 | 1.522 | 15.672 | 0.059 | n/a | 0.439 | 12.333 | n/a | n/a | 0.043 | 4.338 | 0.126 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004d3 | 34.024 | 5.656 | 0.196 | 0.503 | 0.062 | 1.869 | 8.954 | 0.044 | n/a | 0.278 | 16.423 | n/a | n/a | 0.041 | 6.417 | 0.189 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004e7 | 33.507 | 8.147 | 0.010 | 0.000 | 0.494 | 0.939 | 2.063 | 0.035 | n/a | 0.299 | 21.469 | n/a | n/a | 0.052 | 8.651 | 0.258 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004cf | 33.333 | 4.225 | 0.007 | 0.000 | 0.256 | 0.588 | 1.250 | 0.023 | n/a | 0.227 | 26.718 | n/a | n/a | 0.040 | 4.487 | 0.135 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004da | 32.625 | 7.098 | 0.007 | 2.385 | 1.140 | 0.806 | 1.469 | 0.024 | n/a | 0.186 | 19.435 | n/a | n/a | 0.072 | 10.631 | 0.326 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004ae | 32.165 | 6.236 | 0.010 | 0.000 | 0.646 | 1.630 | 7.821 | 0.040 | n/a | 0.320 | 15.386 | n/a | n/a | 0.076 | 6.892 | 0.214 | 0.076 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004d1 | 31.062 | 3.820 | 0.307 | 0.279 | 0.067 | 1.316 | 14.797 | 0.031 | n/a | 0.250 | 10.156 | n/a | n/a | 0.039 | 4.473 | 0.144 | 0.039 | gw-w/thread-46/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000004c7 | 31.046 | 3.518 | 0.247 | 0.260 | 0.119 | 1.071 | 11.818 | 0.029 | n/a | 0.383 | 13.540 | n/a | n/a | 0.060 | 4.145 | 0.133 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004d5 | 30.388 | 5.227 | 0.302 | 0.442 | 0.115 | 1.622 | 12.761 | 0.037 | n/a | 0.220 | 9.588 | n/a | n/a | 0.075 | 6.085 | 0.200 | 0.075 | gw-w/thread-49/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000004ee | 29.707 | 4.680 | 0.299 | 0.000 | 0.058 | 1.861 | 14.704 | 0.064 | n/a | 0.481 | 7.520 | n/a | n/a | 0.041 | 5.037 | 0.170 | 0.041 | gw-w/thread-47/gateway.admitted-work | driver.publication 1.279ms |
| 47bb2b3d052fd0de00000000000004c1 | 29.377 | 4.835 | 0.328 | 0.322 | 0.068 | 1.524 | 11.098 | 0.376 | n/a | 0.222 | 10.549 | n/a | n/a | 0.054 | 5.553 | 0.189 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004b9 | 29.120 | 5.909 | 0.007 | 0.000 | 0.214 | 1.327 | 4.855 | 0.044 | n/a | 0.375 | 16.325 | n/a | n/a | 0.065 | 6.130 | 0.211 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004bf | 28.931 | 3.886 | 0.278 | 0.270 | 0.115 | 1.396 | 11.235 | 0.030 | n/a | 0.200 | 11.448 | n/a | n/a | 0.072 | 4.550 | 0.157 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.193 | 0.654 | 0.000 | 1.844 | 4.069 | 0.007 | 0.000 | 0.475 | 0.781 | 0.989 | 0.025 | n/a | 0.262 | 10.542 | n/a | n/a | 0.052 | 4.353 | 0.242 | 0.052 |
| p99 | 32.165 | 2.617 | 0.000 | 2.225 | 6.236 | 0.010 | 0.000 | 1.107 | 1.630 | 7.821 | 0.054 | n/a | 0.646 | 15.386 | n/a | n/a | 0.113 | 6.892 | 0.449 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de00000000000004ae | 32.165 | 6.236 | 0.010 | 0.000 | 0.646 | 1.630 | 7.821 | 0.040 | n/a | 0.320 | 15.386 | n/a | n/a | 0.076 | 6.892 | 0.214 | 0.076 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004bd | 22.075 | 4.595 | 0.010 | 0.000 | 0.746 | 0.816 | 0.989 | 0.025 | n/a | 0.193 | 14.643 | n/a | n/a | 0.058 | 5.352 | 0.242 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004e1 | 19.241 | 4.507 | 0.007 | 0.000 | 1.107 | 0.803 | 0.929 | 0.025 | n/a | 0.646 | 11.170 | n/a | n/a | 0.049 | 5.621 | 0.292 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004b2 | 19.156 | 3.872 | 0.006 | 0.000 | 0.475 | 1.029 | 1.185 | 0.026 | n/a | 0.271 | 12.239 | n/a | n/a | 0.052 | 4.353 | 0.227 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004ed | 17.391 | 3.655 | 0.006 | 0.000 | 0.440 | 0.698 | 1.100 | 0.025 | n/a | 0.216 | 11.136 | n/a | n/a | 0.113 | 4.101 | 0.236 | 0.113 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004f9 | 16.193 | 4.219 | 0.009 | 0.000 | 0.334 | 1.080 | 0.940 | 0.024 | n/a | 0.210 | 9.325 | n/a | n/a | 0.052 | 4.562 | 0.282 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004d7 | 15.971 | 4.069 | 0.006 | 0.000 | 0.152 | 0.781 | 1.828 | 0.054 | n/a | 0.582 | 8.458 | n/a | n/a | 0.042 | 4.227 | 0.265 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004f6 | 15.548 | 3.149 | 0.005 | 0.000 | 0.087 | 0.549 | 0.893 | 0.023 | n/a | 0.262 | 10.542 | n/a | n/a | 0.037 | 3.241 | 0.208 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004c5 | 15.490 | 3.546 | 0.007 | 0.000 | 0.638 | 0.688 | 1.022 | 0.023 | n/a | 0.188 | 9.323 | n/a | n/a | 0.053 | 4.191 | 0.271 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004c3 | 11.145 | 4.291 | 0.008 | 0.000 | 0.704 | 0.780 | 0.885 | 0.025 | n/a | 0.458 | 3.928 | n/a | n/a | 0.067 | 5.002 | 0.449 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.951 | 0.393 | 0.000 | 1.413 | 3.954 | 0.088 | 0.000 | 0.221 | 1.297 | 2.577 | 0.032 | n/a | 0.324 | 10.671 | n/a | n/a | 0.052 | 4.720 | 0.198 | 0.052 |
| p99 | 55.110 | 3.427 | 0.009 | 3.227 | 17.226 | 0.490 | 0.000 | 1.070 | 4.477 | 34.407 | 0.099 | n/a | 1.823 | 39.872 | n/a | n/a | 0.225 | 17.881 | 0.430 | 0.225 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de0000000000000536 | 55.110 | 3.954 | 0.249 | 0.000 | 0.106 | 1.436 | 9.186 | 0.032 | n/a | 0.221 | 39.872 | n/a | n/a | 0.055 | 4.308 | 0.078 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000520 | 50.160 | 17.226 | 0.088 | 0.000 | 0.567 | 3.986 | 16.557 | 0.099 | n/a | 1.823 | 9.751 | n/a | n/a | 0.063 | 17.881 | 0.356 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000507 | 49.624 | 9.368 | 0.380 | 0.000 | 0.069 | 2.116 | 25.458 | 0.049 | n/a | 0.324 | 11.802 | n/a | n/a | 0.059 | 9.816 | 0.198 | 0.059 | gw-w/thread-42/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de000000000000052f | 47.070 | 3.899 | 0.199 | 0.000 | 0.059 | 1.297 | 34.407 | 0.076 | n/a | 0.835 | 6.249 | n/a | n/a | 0.048 | 4.157 | 0.088 | 0.048 | gw-w/thread-47/gateway.admitted-work | driver.publication 2.542ms |
| 47bb2b3d052fd0de000000000000052e | 38.085 | 6.487 | 0.010 | 0.000 | 0.591 | 0.868 | 0.902 | 0.025 | n/a | 0.219 | 28.865 | n/a | n/a | 0.117 | 7.089 | 0.186 | 0.117 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000050e | 35.731 | 3.813 | 0.212 | 0.000 | 0.082 | 2.253 | 19.021 | 0.069 | n/a | 0.985 | 9.256 | n/a | n/a | 0.041 | 4.107 | 0.115 | 0.041 | gw-w/thread-45/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de0000000000000501 | 34.386 | 3.500 | 0.223 | 0.000 | 0.074 | 1.542 | 12.453 | 0.086 | n/a | 0.356 | 16.108 | n/a | n/a | 0.043 | 3.797 | 0.110 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000532 | 33.340 | 5.194 | 0.291 | 0.000 | 0.076 | 1.740 | 13.522 | 0.032 | n/a | 0.208 | 12.232 | n/a | n/a | 0.044 | 5.561 | 0.167 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000541 | 32.252 | 4.625 | 0.006 | 0.000 | 1.070 | 0.949 | 1.211 | 0.029 | n/a | 1.048 | 23.255 | n/a | n/a | 0.060 | 5.701 | 0.177 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000050a | 31.923 | 3.669 | 0.300 | 0.000 | 0.075 | 1.702 | 10.354 | 0.047 | n/a | 0.351 | 15.383 | n/a | n/a | 0.041 | 4.045 | 0.127 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000054e | 31.006 | 5.219 | 0.365 | 0.000 | 0.063 | 2.293 | 11.984 | 0.055 | n/a | 0.310 | 10.671 | n/a | n/a | 0.046 | 5.647 | 0.182 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000548 | 30.948 | 6.534 | 0.306 | 0.000 | 0.062 | 1.766 | 11.968 | 0.044 | n/a | 0.393 | 9.832 | n/a | n/a | 0.042 | 6.902 | 0.223 | 0.042 | gw-w/thread-42/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de000000000000053a | 30.326 | 8.211 | 0.339 | 0.000 | 0.301 | 1.528 | 9.990 | 0.031 | n/a | 0.210 | 9.491 | n/a | n/a | 0.225 | 8.851 | 0.292 | 0.225 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000053e | 29.686 | 5.462 | 0.266 | 0.000 | 0.060 | 1.769 | 7.310 | 0.032 | n/a | 0.229 | 14.520 | n/a | n/a | 0.040 | 5.788 | 0.195 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000052a | 29.026 | 3.921 | 0.219 | 0.000 | 0.080 | 1.381 | 13.138 | 0.032 | n/a | 0.214 | 9.993 | n/a | n/a | 0.049 | 4.219 | 0.145 | 0.049 | gw-w/thread-42/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de0000000000000546 | 28.800 | 5.172 | 0.238 | 0.000 | 0.106 | 1.673 | 7.163 | 0.032 | n/a | 0.439 | 13.911 | n/a | n/a | 0.066 | 5.516 | 0.192 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000051e | 28.239 | 3.906 | 0.305 | 0.000 | 0.104 | 1.490 | 13.262 | 0.036 | n/a | 0.196 | 8.886 | n/a | n/a | 0.053 | 4.315 | 0.153 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000504 | 28.177 | 6.139 | 0.004 | 0.000 | 0.857 | 4.477 | 2.577 | 0.043 | n/a | 0.808 | 13.236 | n/a | n/a | 0.037 | 7.000 | 0.248 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.000ms |
| 47bb2b3d052fd0de0000000000000522 | 28.027 | 4.110 | 0.302 | 0.000 | 0.107 | 1.279 | 8.260 | 0.046 | n/a | 0.432 | 13.423 | n/a | n/a | 0.069 | 4.519 | 0.161 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000514 | 27.227 | 4.373 | 0.276 | 0.000 | 0.105 | 1.548 | 15.183 | 0.038 | n/a | 0.494 | 5.151 | n/a | n/a | 0.060 | 4.753 | 0.175 | 0.060 | gw-w/thread-45/gateway.admitted-work | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.321 | 0.804 | 0.000 | 1.715 | 3.738 | 0.006 | 0.000 | 0.591 | 0.818 | 1.327 | 0.029 | n/a | 0.287 | 11.790 | n/a | n/a | 0.051 | 4.461 | 0.217 | 0.051 |
| p99 | 38.085 | 1.521 | 0.000 | 3.227 | 6.487 | 0.021 | 0.000 | 1.070 | 3.332 | 1.876 | 0.041 | n/a | 1.048 | 28.865 | n/a | n/a | 0.117 | 7.089 | 0.430 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de000000000000052e | 38.085 | 6.487 | 0.010 | 0.000 | 0.591 | 0.868 | 0.902 | 0.025 | n/a | 0.219 | 28.865 | n/a | n/a | 0.117 | 7.089 | 0.186 | 0.117 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000541 | 32.252 | 4.625 | 0.006 | 0.000 | 1.070 | 0.949 | 1.211 | 0.029 | n/a | 1.048 | 23.255 | n/a | n/a | 0.060 | 5.701 | 0.177 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000051a | 26.951 | 3.483 | 0.006 | 0.000 | 0.790 | 0.761 | 1.542 | 0.039 | n/a | 0.287 | 20.004 | n/a | n/a | 0.038 | 4.279 | 0.159 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004fd | 24.382 | 3.873 | 0.006 | 0.000 | 0.552 | 0.750 | 0.920 | 0.026 | n/a | 0.492 | 17.694 | n/a | n/a | 0.070 | 4.431 | 0.182 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000503 | 23.912 | 3.855 | 0.006 | 0.000 | 0.959 | 1.386 | 1.382 | 0.040 | n/a | 0.829 | 15.417 | n/a | n/a | 0.040 | 4.820 | 0.202 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000526 | 20.088 | 3.082 | 0.006 | 0.000 | 0.932 | 0.591 | 0.870 | 0.025 | n/a | 0.223 | 14.317 | n/a | n/a | 0.042 | 4.020 | 0.200 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000534 | 18.909 | 3.910 | 0.007 | 0.000 | 0.572 | 0.679 | 1.500 | 0.031 | n/a | 0.264 | 11.875 | n/a | n/a | 0.069 | 4.490 | 0.237 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000004ff | 18.321 | 3.344 | 0.021 | 0.000 | 0.221 | 0.981 | 1.327 | 0.038 | n/a | 0.546 | 11.790 | n/a | n/a | 0.052 | 3.586 | 0.196 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000050c | 17.155 | 3.738 | 0.008 | 0.000 | 0.715 | 3.332 | 1.697 | 0.021 | n/a | 0.148 | 7.409 | n/a | n/a | 0.087 | 4.461 | 0.260 | 0.087 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000512 | 16.470 | 3.468 | 0.006 | 0.000 | 0.539 | 0.599 | 0.948 | 0.041 | n/a | 0.540 | 10.291 | n/a | n/a | 0.038 | 4.013 | 0.244 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000515 | 15.097 | 2.827 | 0.006 | 0.000 | 0.437 | 0.639 | 1.522 | 0.041 | n/a | 0.628 | 8.953 | n/a | n/a | 0.044 | 3.270 | 0.217 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000537 | 12.703 | 4.747 | 0.012 | 0.000 | 0.507 | 1.000 | 1.483 | 0.041 | n/a | 0.397 | 4.465 | n/a | n/a | 0.051 | 5.266 | 0.415 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000054c | 12.037 | 3.259 | 0.006 | 0.000 | 0.098 | 0.584 | 1.876 | 0.025 | n/a | 0.178 | 5.970 | n/a | n/a | 0.040 | 3.364 | 0.279 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000518 | 11.328 | 4.255 | 0.013 | 0.000 | 0.603 | 0.861 | 0.906 | 0.029 | n/a | 0.231 | 4.366 | n/a | n/a | 0.064 | 4.871 | 0.430 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000053c | 11.097 | 3.673 | 0.006 | 0.000 | 1.041 | 0.818 | 0.784 | 0.025 | n/a | 0.192 | 4.514 | n/a | n/a | 0.044 | 4.720 | 0.425 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.786 | 0.546 | 0.000 | 1.460 | 4.257 | 0.010 | 0.000 | 0.250 | 1.126 | 4.858 | 0.031 | n/a | 0.451 | 9.687 | n/a | n/a | 0.048 | 4.849 | 0.237 | 0.048 |
| p99 | 76.945 | 2.617 | 0.008 | 3.154 | 8.895 | 0.464 | 0.000 | 1.129 | 3.716 | 45.517 | 0.163 | n/a | 3.964 | 30.133 | n/a | n/a | 0.129 | 9.286 | 0.459 | 0.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de0000000000000562 | 76.945 | 5.009 | 0.265 | 0.000 | 0.066 | 1.617 | 45.517 | 0.050 | n/a | 3.679 | 20.702 | n/a | n/a | 0.040 | 5.340 | 0.069 | 0.040 | gw-w/thread-49/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de0000000000000596 | 45.856 | 8.895 | 0.260 | 0.000 | 0.131 | 1.763 | 13.344 | 0.031 | n/a | 0.192 | 21.175 | n/a | n/a | 0.066 | 9.286 | 0.203 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000590 | 44.271 | 3.755 | 0.240 | 0.000 | 0.117 | 1.191 | 17.428 | 0.120 | n/a | 0.299 | 21.068 | n/a | n/a | 0.053 | 4.112 | 0.093 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000584 | 39.745 | 3.630 | 0.188 | 0.000 | 0.065 | 1.255 | 18.480 | 0.093 | n/a | 0.280 | 15.711 | n/a | n/a | 0.043 | 3.883 | 0.098 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000582 | 37.818 | 4.687 | 0.011 | 0.000 | 0.645 | 0.852 | 0.930 | 0.025 | n/a | 0.480 | 30.133 | n/a | n/a | 0.054 | 5.343 | 0.141 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000059b | 35.884 | 5.280 | 0.254 | 0.000 | 0.055 | 1.677 | 12.772 | 0.075 | n/a | 0.466 | 15.258 | n/a | n/a | 0.046 | 5.589 | 0.156 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000551 | 34.864 | 3.289 | 0.231 | 0.000 | 0.097 | 1.373 | 15.507 | 0.036 | n/a | 0.181 | 14.093 | n/a | n/a | 0.055 | 3.617 | 0.104 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000557 | 33.770 | 6.883 | 0.008 | 0.000 | 0.324 | 1.126 | 2.345 | 0.163 | n/a | 0.908 | 21.948 | n/a | n/a | 0.065 | 7.214 | 0.214 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005a1 | 32.320 | 4.446 | 0.317 | 0.000 | 0.050 | 1.557 | 9.952 | 0.030 | n/a | 0.432 | 15.436 | n/a | n/a | 0.099 | 4.814 | 0.149 | 0.099 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000056a | 31.119 | 3.927 | 0.277 | 0.000 | 0.045 | 1.422 | 11.191 | 0.069 | n/a | 0.333 | 13.802 | n/a | n/a | 0.052 | 4.249 | 0.137 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000588 | 31.042 | 6.763 | 0.215 | 0.000 | 0.071 | 1.461 | 15.571 | 0.034 | n/a | 0.455 | 6.417 | n/a | n/a | 0.056 | 7.049 | 0.227 | 0.056 | gw-w/thread-44/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000005a7 | 30.732 | 6.318 | 0.464 | 0.000 | 0.101 | 1.826 | 9.413 | 0.037 | n/a | 0.688 | 11.806 | n/a | n/a | 0.079 | 6.883 | 0.224 | 0.079 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000055b | 30.262 | 4.523 | 0.308 | 0.000 | 0.060 | 1.655 | 13.088 | 0.032 | n/a | 0.449 | 10.106 | n/a | n/a | 0.042 | 4.891 | 0.162 | 0.042 | gw-w/thread-47/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000005b3 | 29.558 | 5.672 | 0.282 | 0.000 | 0.048 | 1.580 | 8.880 | 0.034 | n/a | 0.494 | 12.529 | n/a | n/a | 0.039 | 6.002 | 0.203 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005a2 | 29.373 | 5.838 | 0.007 | 0.000 | 1.112 | 0.780 | 4.858 | 0.027 | n/a | 0.179 | 16.492 | n/a | n/a | 0.082 | 6.956 | 0.237 | 0.082 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000599 | 26.873 | 3.838 | 0.300 | 0.000 | 0.073 | 1.404 | 9.177 | 0.035 | n/a | 0.501 | 11.487 | n/a | n/a | 0.057 | 4.212 | 0.157 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000058a | 26.121 | 5.427 | 0.006 | 0.000 | 1.040 | 0.534 | 5.226 | 0.028 | n/a | 0.181 | 13.640 | n/a | n/a | 0.040 | 6.473 | 0.248 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005ad | 25.856 | 4.257 | 0.288 | 0.000 | 0.124 | 1.672 | 9.845 | 0.033 | n/a | 0.452 | 9.137 | n/a | n/a | 0.048 | 4.669 | 0.181 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000056e | 25.379 | 3.393 | 0.195 | 0.000 | 0.058 | 1.195 | 9.907 | 0.028 | n/a | 0.353 | 10.208 | n/a | n/a | 0.041 | 3.646 | 0.144 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000576 | 25.053 | 4.147 | 0.266 | 0.000 | 0.052 | 1.659 | 8.597 | 0.052 | n/a | 0.306 | 9.921 | n/a | n/a | 0.053 | 4.464 | 0.178 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.910 | 0.728 | 0.000 | 1.695 | 3.648 | 0.007 | 0.000 | 0.606 | 0.816 | 1.001 | 0.025 | n/a | 0.480 | 5.229 | n/a | n/a | 0.048 | 4.536 | 0.304 | 0.048 |
| p99 | 37.818 | 2.617 | 0.006 | 2.586 | 5.431 | 0.012 | 0.000 | 1.092 | 1.876 | 7.769 | 0.095 | n/a | 1.252 | 30.133 | n/a | n/a | 0.118 | 6.144 | 0.459 | 0.118 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de0000000000000582 | 37.818 | 4.687 | 0.011 | 0.000 | 0.645 | 0.852 | 0.930 | 0.025 | n/a | 0.480 | 30.133 | n/a | n/a | 0.054 | 5.343 | 0.141 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000055e | 22.437 | 3.339 | 0.007 | 0.000 | 1.072 | 0.464 | 5.167 | 0.028 | n/a | 0.230 | 12.082 | n/a | n/a | 0.048 | 4.417 | 0.197 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000579 | 18.522 | 4.161 | 0.012 | 0.000 | 0.946 | 0.884 | 1.001 | 0.028 | n/a | 0.563 | 10.891 | n/a | n/a | 0.036 | 5.119 | 0.276 | 0.036 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 2.417ms |
| 47bb2b3d052fd0de0000000000000598 | 16.688 | 3.758 | 0.006 | 0.000 | 0.817 | 1.876 | 7.769 | 0.042 | n/a | 0.513 | 1.866 | n/a | n/a | 0.042 | 4.580 | 0.274 | 0.042 | gw-w/thread-48/storage/begin-command! | none observed |
| 47bb2b3d052fd0de0000000000000559 | 16.609 | 4.110 | 0.011 | 0.000 | 0.728 | 0.858 | 0.903 | 0.025 | n/a | 0.225 | 9.687 | n/a | n/a | 0.063 | 4.849 | 0.292 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000564 | 16.590 | 2.825 | 0.006 | 0.000 | 0.574 | 0.687 | 0.883 | 0.023 | n/a | 0.439 | 11.112 | n/a | n/a | 0.041 | 3.406 | 0.205 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005ab | 15.946 | 5.431 | 0.008 | 0.000 | 0.175 | 0.835 | 1.774 | 0.045 | n/a | 0.863 | 6.724 | n/a | n/a | 0.092 | 5.614 | 0.352 | 0.092 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000059d | 15.756 | 5.198 | 0.007 | 0.000 | 0.939 | 0.798 | 1.443 | 0.040 | n/a | 1.252 | 5.961 | n/a | n/a | 0.118 | 6.144 | 0.390 | 0.118 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000550 | 14.910 | 3.640 | 0.006 | 0.000 | 0.193 | 1.203 | 6.705 | 0.042 | n/a | 0.183 | 2.890 | n/a | n/a | 0.049 | 3.839 | 0.257 | 0.049 | gw-w/thread-49/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de0000000000000555 | 13.077 | 3.648 | 0.006 | 0.000 | 0.326 | 0.548 | 0.909 | 0.025 | n/a | 0.493 | 7.067 | n/a | n/a | 0.055 | 3.980 | 0.304 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005a5 | 12.309 | 5.148 | 0.007 | 0.000 | 0.497 | 0.901 | 0.968 | 0.024 | n/a | 0.808 | 3.891 | n/a | n/a | 0.065 | 5.652 | 0.459 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000056f | 11.994 | 3.290 | 0.007 | 0.000 | 0.569 | 0.816 | 1.546 | 0.051 | n/a | 0.442 | 5.229 | n/a | n/a | 0.042 | 3.866 | 0.322 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005b1 | 11.652 | 3.581 | 0.006 | 0.000 | 1.092 | 0.644 | 1.081 | 0.024 | n/a | 0.451 | 4.730 | n/a | n/a | 0.043 | 4.678 | 0.402 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005af | 11.603 | 2.949 | 0.006 | 0.000 | 0.219 | 1.018 | 1.502 | 0.095 | n/a | 0.729 | 5.036 | n/a | n/a | 0.048 | 3.175 | 0.274 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000058c | 11.439 | 3.694 | 0.007 | 0.000 | 0.606 | 0.780 | 0.908 | 0.021 | n/a | 0.517 | 4.861 | n/a | n/a | 0.045 | 4.307 | 0.376 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000593 | 9.925 | 3.478 | 0.011 | 0.000 | 1.048 | 0.776 | 0.957 | 0.024 | n/a | 0.174 | 3.419 | n/a | n/a | 0.039 | 4.536 | 0.457 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000058e | 8.634 | 2.904 | 0.005 | 0.000 | 0.218 | 0.580 | 0.839 | 0.024 | n/a | 0.351 | 3.676 | n/a | n/a | 0.038 | 3.126 | 0.362 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.625 | 0.526 | 0.000 | 0.833 | 4.196 | 0.014 | 0.000 | 0.131 | 1.156 | 3.127 | 0.033 | n/a | 0.374 | 8.886 | n/a | n/a | 0.051 | 4.571 | 0.235 | 0.051 |
| p99 | 75.777 | 3.061 | 0.000 | 6.217 | 10.664 | n/a | 0.000 | 1.116 | 2.112 | 55.227 | 0.089 | n/a | 3.759 | 33.057 | n/a | n/a | 0.150 | 11.202 | 0.477 | 0.150 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de00000000000005f0 | 75.777 | 3.784 | 0.343 | 0.000 | 0.140 | 1.282 | 55.227 | 0.036 | n/a | 0.610 | 14.277 | n/a | n/a | 0.077 | 4.267 | 0.056 | 0.077 | gw-w/thread-46/gateway.request-parse | none observed |
| 47bb2b3d052fd0de00000000000005ec | 57.535 | 4.837 | 0.336 | 0.000 | 0.243 | 2.112 | 17.681 | 0.064 | n/a | 0.656 | 31.503 | n/a | n/a | 0.102 | 5.417 | 0.094 | 0.102 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.195ms |
| 47bb2b3d052fd0de00000000000005c0 | 50.250 | 6.411 | 0.007 | 0.000 | 0.130 | 1.235 | 33.384 | 0.043 | n/a | 0.195 | 8.792 | n/a | n/a | 0.053 | 6.548 | 0.130 | 0.053 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 47bb2b3d052fd0de00000000000005ca | 47.451 | 3.750 | 0.183 | 0.000 | 0.060 | 1.596 | 8.263 | 0.031 | n/a | 0.472 | 33.057 | n/a | n/a | 0.041 | 3.992 | 0.084 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000605 | 47.328 | 7.440 | 0.230 | 0.000 | 0.077 | 1.973 | 16.399 | 0.041 | n/a | 3.759 | 17.364 | n/a | n/a | 0.044 | 7.747 | 0.164 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005c2 | 45.564 | 4.083 | 0.222 | 0.000 | 0.057 | 1.754 | 22.560 | 0.038 | n/a | 0.433 | 16.376 | n/a | n/a | 0.043 | 4.362 | 0.096 | 0.043 | gw-w/thread-42/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000005ed | 39.433 | 6.578 | 0.013 | 0.000 | 0.484 | 0.956 | 2.321 | 0.089 | n/a | 3.659 | 25.201 | n/a | n/a | 0.133 | 7.074 | 0.179 | 0.133 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000607 | 35.816 | 6.522 | 0.221 | 0.000 | 0.074 | 1.709 | 17.001 | 0.041 | n/a | 0.515 | 9.671 | n/a | n/a | 0.062 | 6.817 | 0.190 | 0.062 | gw-w/thread-46/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de0000000000000601 | 32.412 | 7.659 | 0.221 | 0.000 | 0.101 | 1.533 | 12.455 | 0.042 | n/a | 0.264 | 10.077 | n/a | n/a | 0.060 | 7.981 | 0.246 | 0.060 | gw-w/thread-44/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000005b7 | 31.973 | 3.564 | 0.291 | 0.000 | 0.068 | 1.353 | 13.151 | 0.034 | n/a | 0.218 | 13.252 | n/a | n/a | 0.043 | 3.923 | 0.123 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005ea | 27.930 | 10.664 | 0.009 | 0.000 | 0.529 | 1.419 | 3.127 | 0.071 | n/a | 0.510 | 11.529 | n/a | n/a | 0.072 | 11.202 | 0.401 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005d4 | 27.135 | 3.364 | 0.254 | 0.000 | 0.048 | 1.368 | 12.458 | 0.051 | n/a | 0.506 | 9.041 | n/a | n/a | 0.045 | 3.666 | 0.135 | 0.045 | gw-w/thread-48/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000005dc | 26.249 | 5.303 | 0.295 | 0.000 | 0.052 | 2.084 | 8.218 | 0.036 | n/a | 0.441 | 9.772 | n/a | n/a | 0.048 | 5.650 | 0.215 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005fa | 26.136 | 3.422 | 0.204 | 0.000 | 0.070 | 1.303 | 12.098 | 0.030 | n/a | 0.229 | 8.730 | n/a | n/a | 0.050 | 3.696 | 0.141 | 0.050 | gw-w/thread-42/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000005e2 | 25.880 | 3.403 | 0.200 | 0.000 | 0.114 | 1.414 | 11.712 | 0.039 | n/a | 0.189 | 8.737 | n/a | n/a | 0.072 | 3.717 | 0.144 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005c8 | 25.626 | 3.568 | 0.291 | 0.000 | 0.065 | 1.153 | 10.496 | 0.031 | n/a | 0.458 | 9.499 | n/a | n/a | 0.065 | 3.924 | 0.153 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005d8 | 24.896 | 4.292 | 0.237 | 0.000 | 0.041 | 1.406 | 7.777 | 0.033 | n/a | 0.386 | 10.682 | n/a | n/a | 0.041 | 4.571 | 0.184 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005e4 | 23.622 | 3.985 | 0.310 | 0.000 | 0.075 | 1.659 | 9.023 | 0.032 | n/a | 0.456 | 8.022 | n/a | n/a | 0.060 | 4.370 | 0.185 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005bb | 22.893 | 4.322 | 0.270 | 0.000 | 0.073 | 1.862 | 9.126 | 0.031 | n/a | 0.296 | 6.847 | n/a | n/a | 0.065 | 4.666 | 0.204 | 0.065 | gw-w/thread-49/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000005ff | 22.849 | 8.064 | 0.014 | 0.000 | 0.589 | 1.019 | 2.473 | 0.057 | n/a | 0.348 | 10.165 | n/a | n/a | 0.121 | 8.667 | 0.379 | 0.121 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.279 | 0.875 | 0.000 | 1.921 | 3.990 | 0.007 | 0.000 | 0.484 | 0.814 | 0.978 | 0.028 | n/a | 0.374 | 7.538 | n/a | n/a | 0.060 | 4.402 | 0.308 | 0.060 |
| p99 | 39.433 | 3.061 | 0.000 | 6.217 | 10.664 | n/a | 0.000 | 1.025 | 1.819 | 12.027 | 0.089 | n/a | 3.659 | 25.201 | n/a | n/a | 0.150 | 11.202 | 0.456 | 0.150 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de00000000000005ed | 39.433 | 6.578 | 0.013 | 0.000 | 0.484 | 0.956 | 2.321 | 0.089 | n/a | 3.659 | 25.201 | n/a | n/a | 0.133 | 7.074 | 0.179 | 0.133 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005ea | 27.930 | 10.664 | 0.009 | 0.000 | 0.529 | 1.419 | 3.127 | 0.071 | n/a | 0.510 | 11.529 | n/a | n/a | 0.072 | 11.202 | 0.401 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005f1 | 22.818 | 5.106 | 0.007 | 0.000 | 0.997 | 1.101 | 1.764 | 0.045 | n/a | 0.666 | 13.084 | n/a | n/a | 0.048 | 6.110 | 0.268 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005fc | 17.863 | 3.658 | n/a | 0.000 | 0.141 | 1.819 | 12.027 | 0.026 | n/a | 0.042 | 0.000 | n/a | n/a | 0.150 | 3.799 | 0.213 | 0.150 | gw-w/thread-48/gateway.admitted-work | none observed |
| 47bb2b3d052fd0de00000000000005d2 | 15.998 | 4.196 | 0.007 | 0.000 | 0.145 | 1.156 | 0.978 | 0.026 | n/a | 0.203 | 9.211 | n/a | n/a | 0.077 | 4.348 | 0.272 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005b5 | 15.345 | 4.777 | 0.010 | 0.000 | 0.548 | 0.814 | 0.845 | 0.024 | n/a | 0.411 | 7.840 | n/a | n/a | 0.076 | 5.335 | 0.348 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005de | 14.549 | 4.416 | 0.010 | 0.000 | 0.306 | 0.666 | 0.822 | 0.025 | n/a | 0.205 | 8.039 | n/a | n/a | 0.060 | 4.732 | 0.325 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005d5 | 14.279 | 3.530 | 0.006 | 0.000 | 0.676 | 0.887 | 1.311 | 0.028 | n/a | 0.252 | 7.538 | n/a | n/a | 0.051 | 4.212 | 0.295 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005cb | 13.729 | 3.990 | 0.007 | 0.000 | 0.235 | 0.683 | 1.182 | 0.028 | n/a | 0.463 | 7.075 | n/a | n/a | 0.065 | 4.232 | 0.308 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005f5 | 12.778 | 2.911 | 0.005 | 0.000 | 0.084 | 0.577 | 0.932 | 0.032 | n/a | 0.135 | 8.022 | n/a | n/a | 0.080 | 2.999 | 0.235 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005e6 | 12.242 | 4.552 | 0.006 | 0.000 | 1.025 | 0.670 | 0.912 | 0.023 | n/a | 0.448 | 4.560 | n/a | n/a | 0.046 | 5.583 | 0.456 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005c3 | 11.404 | 3.835 | 0.006 | 0.000 | 0.610 | 0.563 | 0.943 | 0.024 | n/a | 0.469 | 4.913 | n/a | n/a | 0.040 | 4.452 | 0.390 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005f8 | 11.088 | 3.060 | 0.006 | 0.000 | 0.394 | 0.526 | 1.844 | 0.039 | n/a | 0.204 | 4.966 | n/a | n/a | 0.049 | 3.461 | 0.312 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de00000000000005ce | 9.956 | 3.748 | 0.005 | 0.000 | 0.648 | 0.940 | 0.883 | 0.043 | n/a | 0.374 | 3.263 | n/a | n/a | 0.050 | 4.402 | 0.442 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (849 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.414 | 0.800 | 0.000 | 1.795 | 3.857 | 0.006 | 0.000 | 0.761 | 0.843 | 1.217 | 0.033 | n/a | 0.284 | 7.524 | n/a | n/a | 0.040 | 4.990 | 0.315 | 0.040 |
| p99 | 68.973 | 2.785 | 0.814 | 5.262 | 10.536 | 3.861 | 0.000 | 27.210 | 15.497 | 18.080 | 3.692 | n/a | 5.539 | 47.326 | n/a | n/a | 0.103 | 31.985 | 0.709 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de00000000000006ba | 99.425 | 6.751 | 0.014 | 0.000 | 0.870 | 4.994 | 15.251 | 0.070 | n/a | 2.007 | 69.398 | n/a | n/a | 0.069 | 7.635 | 0.077 | 0.069 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms; driver.publication 1.312ms; driver.publication 1.308ms; driver.publication 1.290ms; driver.publication 1.137ms |
| 47bb2b3d052fd0de00000000000008e0 | 95.632 | 11.847 | 0.008 | 0.000 | 0.733 | 48.964 | 7.700 | 0.098 | n/a | 3.120 | 23.115 | n/a | n/a | 0.047 | 12.587 | 0.132 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 10.429ms; driver.publication 2.175ms; driver.publication 1.656ms; driver.publication 1.139ms |
| 47bb2b3d052fd0de0000000000000b9b | 81.939 | 2.758 | 0.004 | 0.000 | 0.489 | 0.454 | 0.906 | 0.013 | n/a | 0.231 | 77.048 | n/a | n/a | 0.036 | 3.251 | 0.040 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.534ms; driver.publication 1.258ms; driver.publication 1.248ms |
| 47bb2b3d052fd0de00000000000006a3 | 80.200 | 4.273 | 0.012 | 0.000 | 60.901 | 1.419 | 0.927 | 0.033 | n/a | 0.197 | 12.392 | n/a | n/a | 0.047 | 65.186 | 0.813 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 1.347ms; driver.publication 1.250ms; driver.publication 1.237ms; driver.publication 0.004ms |
| 47bb2b3d052fd0de000000000000087c | 76.703 | 6.373 | 5.319 | 0.000 | 0.084 | 5.028 | 23.972 | 0.047 | n/a | 0.202 | 35.595 | n/a | n/a | 0.082 | 11.776 | 0.154 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.218ms; driver.publication 1.731ms; driver.publication 1.283ms; driver.expected-state.bind-receipt 1.277ms; driver.publication 1.063ms |
| 47bb2b3d052fd0de0000000000000699 | 76.249 | 4.048 | 0.005 | 0.000 | 36.308 | 0.664 | 1.761 | 0.129 | n/a | 3.958 | 29.328 | n/a | n/a | 0.049 | 40.360 | 0.529 | 0.049 | node-14/thread-0/driver.queue.subject | driver.publication 1.619ms; driver.publication 1.347ms; driver.publication 1.305ms; driver.expected-state.bind-receipt 1.226ms; driver.publication 1.208ms |
| 47bb2b3d052fd0de00000000000007d6 | 75.558 | 5.634 | 0.944 | 0.000 | 1.334 | 5.464 | 10.338 | 4.801 | n/a | 0.038 | 46.982 | n/a | n/a | 0.022 | 7.912 | 0.105 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.662ms; driver.publication 1.121ms; driver.publication 0.599ms |
| 47bb2b3d052fd0de00000000000006b8 | 70.954 | 3.902 | 0.207 | 0.000 | 0.047 | 5.975 | 32.632 | 0.045 | n/a | 2.644 | 25.463 | n/a | n/a | 0.040 | 4.156 | 0.059 | 0.040 | gw-w/thread-49/gateway.admitted-work | driver.publication 1.308ms; driver.publication 1.290ms; driver.publication 1.137ms |
| 47bb2b3d052fd0de00000000000007d9 | 68.973 | 2.580 | 0.002 | 0.000 | 2.049 | 12.440 | 0.600 | 0.060 | n/a | 0.052 | 51.167 | n/a | n/a | 0.023 | 4.631 | 0.067 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 4.425ms; driver.publication 1.662ms; driver.publication 1.498ms; driver.publication 1.446ms; driver.publication 1.121ms |
| 47bb2b3d052fd0de00000000000007d7 | 68.487 | 4.503 | 0.007 | 0.000 | 0.442 | 11.162 | 0.514 | 4.210 | n/a | 0.073 | 47.516 | n/a | n/a | 0.060 | 4.952 | 0.072 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.662ms; driver.publication 1.498ms; driver.publication 1.121ms |
| 47bb2b3d052fd0de00000000000008df | 67.893 | 4.791 | 0.008 | 0.000 | 0.706 | 25.678 | 1.190 | 0.031 | n/a | 4.005 | 31.395 | n/a | n/a | 0.089 | 5.505 | 0.081 | 0.089 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de0000000000000618 | 67.043 | 3.809 | 0.239 | 0.000 | 0.134 | 1.535 | 39.322 | 0.051 | n/a | 0.238 | 21.591 | n/a | n/a | 0.125 | 4.181 | 0.062 | 0.125 | gw-w/thread-48/gateway.route | none observed |
| 47bb2b3d052fd0de00000000000006bf | 66.810 | 5.493 | 0.100 | 0.000 | 1.181 | 2.624 | 1.316 | 2.310 | n/a | 1.212 | 52.544 | n/a | n/a | 0.030 | 6.774 | 0.101 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms |
| 47bb2b3d052fd0de00000000000007d8 | 65.629 | 8.289 | 0.006 | 0.000 | 0.720 | 5.810 | 1.133 | 0.020 | n/a | 1.720 | 47.893 | n/a | n/a | 0.038 | 9.015 | 0.137 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.662ms; driver.publication 1.498ms; driver.publication 1.446ms; driver.publication 1.121ms |
| 47bb2b3d052fd0de00000000000007db | 65.590 | 3.773 | 0.006 | 0.000 | 51.737 | 0.595 | 1.152 | 0.026 | n/a | 0.165 | 8.100 | n/a | n/a | 0.035 | 55.517 | 0.846 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 4.425ms; driver.publication 1.671ms; driver.publication 1.662ms; driver.publication 1.498ms; driver.publication 1.446ms |
| 47bb2b3d052fd0de00000000000007d5 | 65.583 | 5.339 | 0.522 | 0.000 | 3.259 | 0.436 | 2.624 | 15.118 | n/a | 0.042 | 38.220 | n/a | n/a | 0.023 | 9.120 | 0.139 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.370ms; driver.publication 1.662ms |
| 47bb2b3d052fd0de00000000000006a2 | 62.551 | 4.285 | 0.005 | 0.000 | 42.126 | 0.651 | 1.436 | 0.036 | n/a | 0.229 | 13.719 | n/a | n/a | 0.066 | 46.416 | 0.742 | 0.066 | node-14/thread-0/driver.queue.subject | driver.publication 1.347ms; driver.publication 1.237ms; driver.publication 1.162ms |
| 47bb2b3d052fd0de00000000000006b5 | 62.282 | 4.105 | 0.005 | 0.000 | 5.410 | 0.893 | 7.752 | 0.039 | n/a | 0.228 | 43.802 | n/a | n/a | 0.048 | 9.521 | 0.153 | 0.048 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.257ms; driver.publication 1.137ms |
| 47bb2b3d052fd0de000000000000069b | 62.010 | 5.127 | 9.977 | 0.000 | 0.870 | 2.031 | 1.801 | 5.540 | n/a | 0.718 | 35.921 | n/a | n/a | 0.025 | 15.974 | 0.258 | 0.025 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.619ms; driver.publication 1.305ms; driver.expected-state.bind-receipt 1.226ms; driver.publication 1.208ms; driver.publication 1.162ms |
| 47bb2b3d052fd0de0000000000000b9a | 61.467 | 4.981 | 0.090 | 0.000 | 0.788 | 0.741 | 1.193 | 1.931 | n/a | 0.055 | 51.648 | n/a | n/a | 0.039 | 5.859 | 0.095 | 0.039 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.258ms; driver.publication 1.248ms |

## P2 / L1024 / commit / 5-10 facts (493 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.320 | 0.711 | 0.000 | 1.640 | 3.417 | 0.006 | 0.000 | 0.808 | 0.824 | 1.055 | 0.033 | n/a | 0.281 | 7.023 | n/a | n/a | 0.040 | 4.473 | 0.306 | 0.040 |
| p99 | 68.973 | 2.295 | 0.814 | 4.531 | 8.416 | 0.303 | 0.000 | 27.210 | 15.497 | 10.651 | 3.498 | n/a | 5.859 | 51.167 | n/a | n/a | 0.122 | 31.985 | 0.714 | 0.122 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de00000000000006ba | 99.425 | 6.751 | 0.014 | 0.000 | 0.870 | 4.994 | 15.251 | 0.070 | n/a | 2.007 | 69.398 | n/a | n/a | 0.069 | 7.635 | 0.077 | 0.069 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms; driver.publication 1.312ms; driver.publication 1.308ms; driver.publication 1.290ms; driver.publication 1.137ms |
| 47bb2b3d052fd0de00000000000008e0 | 95.632 | 11.847 | 0.008 | 0.000 | 0.733 | 48.964 | 7.700 | 0.098 | n/a | 3.120 | 23.115 | n/a | n/a | 0.047 | 12.587 | 0.132 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 10.429ms; driver.publication 2.175ms; driver.publication 1.656ms; driver.publication 1.139ms |
| 47bb2b3d052fd0de0000000000000b9b | 81.939 | 2.758 | 0.004 | 0.000 | 0.489 | 0.454 | 0.906 | 0.013 | n/a | 0.231 | 77.048 | n/a | n/a | 0.036 | 3.251 | 0.040 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.534ms; driver.publication 1.258ms; driver.publication 1.248ms |
| 47bb2b3d052fd0de00000000000006a3 | 80.200 | 4.273 | 0.012 | 0.000 | 60.901 | 1.419 | 0.927 | 0.033 | n/a | 0.197 | 12.392 | n/a | n/a | 0.047 | 65.186 | 0.813 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 1.347ms; driver.publication 1.250ms; driver.publication 1.237ms; driver.publication 0.004ms |
| 47bb2b3d052fd0de00000000000007d9 | 68.973 | 2.580 | 0.002 | 0.000 | 2.049 | 12.440 | 0.600 | 0.060 | n/a | 0.052 | 51.167 | n/a | n/a | 0.023 | 4.631 | 0.067 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 4.425ms; driver.publication 1.662ms; driver.publication 1.498ms; driver.publication 1.446ms; driver.publication 1.121ms |
| 47bb2b3d052fd0de00000000000008df | 67.893 | 4.791 | 0.008 | 0.000 | 0.706 | 25.678 | 1.190 | 0.031 | n/a | 4.005 | 31.395 | n/a | n/a | 0.089 | 5.505 | 0.081 | 0.089 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 47bb2b3d052fd0de000000000000069b | 62.010 | 5.127 | 9.977 | 0.000 | 0.870 | 2.031 | 1.801 | 5.540 | n/a | 0.718 | 35.921 | n/a | n/a | 0.025 | 15.974 | 0.258 | 0.025 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.619ms; driver.publication 1.305ms; driver.expected-state.bind-receipt 1.226ms; driver.publication 1.208ms; driver.publication 1.162ms |
| 47bb2b3d052fd0de0000000000000b9a | 61.467 | 4.981 | 0.090 | 0.000 | 0.788 | 0.741 | 1.193 | 1.931 | n/a | 0.055 | 51.648 | n/a | n/a | 0.039 | 5.859 | 0.095 | 0.039 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.258ms; driver.publication 1.248ms |
| 47bb2b3d052fd0de00000000000007da | 60.676 | 3.229 | 0.005 | 0.000 | 0.519 | 3.925 | 0.723 | 0.018 | n/a | 0.227 | 51.979 | n/a | n/a | 0.052 | 3.752 | 0.062 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.425ms; driver.publication 1.662ms; driver.publication 1.498ms; driver.publication 1.446ms; driver.publication 1.370ms |
| 47bb2b3d052fd0de0000000000000b9f | 58.661 | 3.911 | 0.004 | 0.000 | 2.388 | 1.652 | 1.459 | 0.051 | n/a | 21.333 | 27.833 | n/a | n/a | 0.029 | 6.303 | 0.107 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.534ms; driver.publication 1.210ms |
| 47bb2b3d052fd0de0000000000000ba0 | 58.212 | 3.460 | 0.004 | 0.000 | 1.434 | 2.692 | 20.381 | 1.793 | n/a | 2.240 | 26.165 | n/a | n/a | 0.042 | 4.898 | 0.084 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.222ms; driver.publication 1.210ms |
| 47bb2b3d052fd0de00000000000008e1 | 57.934 | 6.298 | 0.021 | 0.000 | 0.969 | 30.039 | 1.064 | 0.034 | n/a | 0.248 | 19.199 | n/a | n/a | 0.062 | 7.288 | 0.126 | 0.062 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.656ms |
| 47bb2b3d052fd0de0000000000000951 | 57.924 | 3.045 | 0.004 | 0.000 | 34.423 | 11.359 | 0.717 | 0.027 | n/a | 2.816 | 5.497 | n/a | n/a | 0.036 | 37.472 | 0.647 | 0.036 | node-14/thread-0/driver.queue.subject | driver.publication 2.630ms; driver.publication 1.331ms; driver.publication 1.190ms; driver.publication 1.146ms |
| 47bb2b3d052fd0de0000000000000b48 | 55.157 | 4.766 | 0.009 | 0.000 | 27.210 | 15.497 | 1.563 | 0.055 | n/a | 0.401 | 5.618 | n/a | n/a | 0.038 | 31.985 | 0.580 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 2.451ms; driver.expected-state.bind-receipt 1.952ms; driver.publication 1.858ms; driver.publication 1.587ms; driver.publication 1.545ms |
| 47bb2b3d052fd0de0000000000000706 | 54.591 | 2.474 | 0.005 | 0.000 | 36.232 | 0.427 | 6.964 | 0.073 | n/a | 0.288 | 8.100 | n/a | n/a | 0.027 | 38.712 | 0.709 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 3.842ms; driver.publication 1.485ms |
| 47bb2b3d052fd0de000000000000069a | 54.432 | 3.264 | 0.008 | 0.000 | 0.688 | 11.762 | 1.681 | 0.051 | n/a | 3.296 | 33.633 | n/a | n/a | 0.049 | 3.961 | 0.073 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.619ms; driver.publication 1.305ms; driver.expected-state.bind-receipt 1.226ms; driver.publication 1.208ms; driver.publication 1.162ms |
| 47bb2b3d052fd0de0000000000000692 | 54.117 | 3.291 | 0.004 | 0.000 | 2.796 | 1.055 | 1.058 | 0.038 | n/a | 0.279 | 45.555 | n/a | n/a | 0.042 | 6.090 | 0.113 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.595ms; driver.plan-and-encode-command 1.541ms; driver.publication 1.227ms |
| 47bb2b3d052fd0de00000000000006c0 | 53.236 | 2.936 | 0.004 | 0.000 | 0.847 | 3.393 | 1.432 | 0.023 | n/a | 2.845 | 41.721 | n/a | n/a | 0.035 | 3.787 | 0.071 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms; driver.publication 2.417ms; driver.publication 1.312ms |
| 47bb2b3d052fd0de0000000000000705 | 52.899 | 3.279 | 0.077 | 0.000 | 0.342 | 1.080 | 0.655 | 0.295 | n/a | 0.074 | 47.080 | n/a | n/a | 0.017 | 3.698 | 0.070 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.485ms |
| 47bb2b3d052fd0de000000000000086c | 52.535 | 4.606 | 0.085 | 0.000 | 0.318 | 3.872 | 3.860 | 0.021 | n/a | 0.167 | 39.583 | n/a | n/a | 0.024 | 5.009 | 0.095 | 0.024 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.201ms; driver.publication 1.144ms |

## P2/P4 / read-your-own-write / read (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.182 | n/a | n/a | n/a | 37.661 | 9.179 | 2.176 | 0.000 | 0.453 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.809 | 60.866 | 0.898 | 5.809 |
| p99 | 304.005 | n/a | n/a | n/a | 135.419 | 149.903 | 24.725 | 0.000 | 51.417 | 78.343 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 178.169 | 241.842 | 1.000 | 178.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de0000000000001ef8 | 304.005 | 111.094 | 0.604 | 13.265 | 0.000 | 0.872 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 178.169 | 124.963 | 0.411 | 178.169 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 4.523ms; driver.publication 3.151ms; driver.publication 3.016ms; driver.publication 1.344ms; driver.publication 1.334ms |
| 47bb2b3d052fd0de0000000000001f14 | 252.481 | 80.660 | 149.903 | 11.280 | 0.000 | 0.497 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.142 | 241.842 | 0.958 | 10.142 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.161ms; driver.publication 2.931ms; driver.publication 2.521ms; driver.publication 1.344ms; driver.publication 1.281ms |
| 47bb2b3d052fd0de000000000000128e | 243.216 | 135.419 | 55.917 | 24.725 | 0.000 | 1.373 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.782 | 216.061 | 0.888 | 25.782 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.774ms; driver.publication 3.729ms; driver.publication 3.012ms; driver.publication 2.189ms; driver.publication 2.173ms |
| 47bb2b3d052fd0de0000000000001ef3 | 209.906 | 113.600 | 16.928 | 18.422 | 0.000 | 0.964 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.990 | 148.951 | 0.710 | 59.990 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 4.523ms; driver.publication 3.151ms; driver.publication 3.016ms; driver.publication 1.742ms; driver.publication 1.334ms |
| 47bb2b3d052fd0de0000000000001f13 | 187.130 | 34.350 | 147.793 | 2.171 | 0.000 | 0.604 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.213 | 184.313 | 0.985 | 2.213 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.344ms; driver.publication 1.281ms; driver.publication 1.054ms; driver.publication 1.025ms |
| 47bb2b3d052fd0de0000000000000635 | 175.596 | 46.693 | 24.057 | 12.291 | 0.000 | 51.417 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.139 | 83.040 | 0.473 | 41.139 | node-14/thread-3/socket.body-read | driver.publication 3.748ms; driver.publication 1.926ms; driver.publication 1.556ms; driver.publication 1.434ms; driver.expected-state.bind-receipt 1.202ms |
| 47bb2b3d052fd0de000000000000062e | 161.978 | 50.206 | 0.364 | 10.296 | 0.000 | 22.676 | 78.343 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.019 | 60.866 | 0.376 | 0.019 | gw-r/thread-46/gateway.response-write | driver.publication 3.748ms; driver.publication 1.926ms; driver.publication 1.434ms; driver.publication 1.311ms; driver.publication 1.078ms |
| 47bb2b3d052fd0de00000000000013a0 | 153.129 | 65.802 | 5.838 | 8.941 | 0.000 | 0.967 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 71.581 | 80.581 | 0.526 | 71.581 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.590ms; driver.publication 1.301ms; driver.publication 1.214ms; driver.publication 1.129ms; driver.publication 1.098ms |
| 47bb2b3d052fd0de00000000000013a6 | 135.135 | 15.973 | 0.234 | 0.000 | 0.000 | 0.331 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 118.597 | 16.208 | 0.120 | 118.597 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.590ms; driver.publication 1.301ms; driver.publication 1.129ms; driver.publication 1.015ms |
| 47bb2b3d052fd0de0000000000001287 | 128.126 | 64.419 | 5.631 | 13.237 | 0.000 | 0.715 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.124 | 83.287 | 0.650 | 44.124 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.189ms; driver.publication 2.173ms; driver.publication 1.710ms; driver.publication 1.628ms; driver.publication 1.575ms |
| 47bb2b3d052fd0de000000000000062d | 108.120 | 35.014 | 0.945 | 3.753 | 0.000 | 2.037 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.371 | 39.713 | 0.367 | 66.371 | node-14/thread-3/socket.wait-first-byte | driver.publication 3.748ms; driver.publication 2.436ms; driver.publication 1.311ms; driver.publication 1.054ms |
| 47bb2b3d052fd0de0000000000000629 | 105.375 | 34.394 | 6.323 | 2.712 | 0.000 | 1.472 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.474 | 43.429 | 0.412 | 60.474 | node-14/thread-3/socket.wait-first-byte | driver.publication 3.748ms; driver.publication 2.436ms; driver.publication 1.311ms; driver.publication 1.158ms; driver.publication 1.054ms |
| 47bb2b3d052fd0de0000000000001ef7 | 91.607 | 44.840 | 23.011 | 7.771 | 0.000 | 0.535 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.450 | 75.622 | 0.826 | 15.450 | node-14/thread-3/worker.gateway-observer.observe | driver.publication 3.151ms; driver.publication 1.334ms; driver.publication 1.316ms; driver.publication 1.300ms; driver.publication 1.286ms |
| 47bb2b3d052fd0de0000000000001efe | 84.964 | 42.125 | 40.732 | 2.088 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 84.946 | 1.000 | 0.019 | node-14/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 4.523ms; driver.publication 3.151ms; driver.publication 1.286ms; driver.publication 1.283ms; driver.publication 1.262ms |
| 47bb2b3d052fd0de0000000000001eff | 82.182 | 42.096 | 37.984 | 2.088 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 82.168 | 1.000 | 0.013 | node-14/thread-2/replica.pull-at | driver.expected-state.bind-receipt 4.523ms; driver.publication 3.151ms; driver.publication 1.286ms; driver.publication 1.262ms; driver.publication 1.240ms |
| 47bb2b3d052fd0de0000000000000634 | 81.090 | 21.169 | 0.726 | 1.379 | 0.000 | 1.044 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 56.773 | 23.274 | 0.287 | 56.773 | node-14/thread-3/socket.wait-first-byte | driver.publication 3.748ms; driver.publication 1.054ms |
| 47bb2b3d052fd0de000000000000191f | 77.441 | 64.366 | 0.293 | 6.519 | 0.000 | 0.453 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.809 | 71.178 | 0.919 | 5.809 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.463ms; driver.publication 1.259ms; driver.publication 1.111ms |
| 47bb2b3d052fd0de0000000000001f00 | 76.747 | 42.331 | 32.321 | 2.088 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 76.740 | 1.000 | 0.007 | node-14/thread-2/replica.pull-at | driver.expected-state.bind-receipt 4.523ms; driver.publication 3.151ms; driver.publication 1.286ms; driver.publication 1.262ms; driver.publication 1.240ms |
| 47bb2b3d052fd0de0000000000001f03 | 69.935 | 37.661 | 30.473 | 1.785 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 69.919 | 1.000 | 0.016 | node-14/thread-2/replica.pull-at | driver.expected-state.bind-receipt 4.523ms; driver.publication 3.016ms; driver.publication 1.286ms; driver.publication 1.286ms; driver.publication 1.262ms |
| 47bb2b3d052fd0de00000000000013a1 | 62.792 | 37.158 | 0.494 | 2.176 | 0.000 | 0.375 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.589 | 39.828 | 0.634 | 22.589 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.214ms |

## P2 / tail / commit (2618 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.338 | 0.728 | 0.000 | 1.684 | 3.642 | 0.005 | 0.000 | 0.723 | 0.696 | 1.073 | 0.028 | n/a | 0.185 | 5.875 | n/a | n/a | 0.034 | 4.614 | 0.345 | 0.034 |
| p99 | 57.188 | 2.861 | 2.048 | 5.530 | 10.317 | 1.146 | 0.000 | 17.688 | 14.190 | 12.082 | 2.171 | n/a | 3.721 | 28.696 | n/a | n/a | 0.090 | 24.329 | 0.722 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de0000000000001271 | 124.388 | 12.611 | 0.008 | 0.000 | 1.326 | 51.806 | 5.847 | 4.068 | n/a | 4.967 | 43.718 | n/a | n/a | 0.037 | 13.945 | 0.112 | 0.037 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.867ms; driver.publication 3.589ms; driver.publication 1.656ms; driver.expected-state.bind-receipt 1.516ms; driver.publication 1.498ms |
| 47bb2b3d052fd0de0000000000001275 | 115.780 | 4.187 | 0.006 | 0.000 | 83.779 | 6.780 | 0.793 | 0.025 | n/a | 2.339 | 17.827 | n/a | n/a | 0.043 | 87.972 | 0.760 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 4.867ms; driver.publication 3.589ms; driver.publication 1.925ms; driver.publication 1.768ms; driver.expected-state.bind-receipt 1.686ms |
| 47bb2b3d052fd0de0000000000001274 | 94.882 | 3.533 | 0.005 | 0.000 | 65.425 | 1.805 | 0.947 | 0.031 | n/a | 0.587 | 22.519 | n/a | n/a | 0.029 | 68.964 | 0.727 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication 4.867ms; driver.publication 3.589ms; driver.publication 1.925ms; driver.expected-state.bind-receipt 1.686ms; driver.publication 1.656ms |
| 47bb2b3d052fd0de000000000000127f | 83.865 | 11.903 | 0.012 | 0.000 | 0.385 | 32.364 | 10.185 | 0.206 | n/a | 3.692 | 25.088 | n/a | n/a | 0.032 | 12.300 | 0.147 | 0.032 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.768ms; driver.publication 1.710ms; driver.expected-state.bind-receipt 1.686ms; driver.publication 1.628ms; driver.publication 1.377ms |
| 47bb2b3d052fd0de000000000000126f | 80.975 | 6.461 | 0.005 | 0.000 | 1.464 | 35.359 | 1.838 | 0.035 | n/a | 0.173 | 35.600 | n/a | n/a | 0.040 | 7.929 | 0.098 | 0.040 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 0.915ms |
| 47bb2b3d052fd0de0000000000001285 | 77.949 | 6.213 | 0.009 | 0.000 | 36.198 | 3.540 | 1.809 | 0.058 | n/a | 8.844 | 21.230 | n/a | n/a | 0.048 | 42.420 | 0.544 | 0.048 | node-14/thread-0/driver.queue.subject | driver.publication 1.768ms; driver.publication 1.710ms; driver.publication 1.628ms; driver.publication 1.377ms; driver.publication 1.236ms |
| 47bb2b3d052fd0de0000000000001270 | 76.132 | 6.937 | 0.007 | 0.000 | 0.892 | 27.908 | 1.536 | 2.083 | n/a | 0.037 | 36.683 | n/a | n/a | 0.049 | 7.835 | 0.103 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.516ms; driver.publication 1.262ms |
| 47bb2b3d052fd0de0000000000001dcb | 74.919 | 3.201 | 0.005 | 0.000 | 0.777 | 0.433 | 0.887 | 0.021 | n/a | 0.360 | 69.206 | n/a | n/a | 0.029 | 3.983 | 0.053 | 0.029 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.368ms; driver.publication 1.113ms |
| 47bb2b3d052fd0de0000000000001272 | 74.207 | 3.705 | 0.005 | 0.000 | 49.062 | 3.235 | 1.199 | 0.028 | n/a | 0.516 | 16.426 | n/a | n/a | 0.030 | 52.772 | 0.711 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 4.867ms; driver.publication 3.589ms; driver.publication 1.925ms; driver.expected-state.bind-receipt 1.516ms; driver.publication 1.498ms |
| 47bb2b3d052fd0de00000000000014da | 72.369 | 3.332 | 0.007 | 0.000 | 58.822 | 1.358 | 0.839 | 0.064 | n/a | 0.175 | 7.736 | n/a | n/a | 0.038 | 62.160 | 0.859 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 4.766ms; driver.publication 3.536ms; driver.publication 1.788ms; driver.publication 1.376ms; driver.publication 1.154ms |
| 47bb2b3d052fd0de000000000000190a | 72.034 | 4.580 | 0.004 | 0.000 | 59.446 | 4.355 | 2.033 | 0.046 | n/a | 0.115 | 1.429 | n/a | n/a | 0.025 | 64.030 | 0.889 | 0.025 | node-14/thread-0/driver.queue.subject | driver.publication 6.507ms; driver.publication 4.539ms; driver.publication 1.734ms; driver.publication 1.217ms; driver.publication 1.052ms |
| 47bb2b3d052fd0de0000000000001dce | 68.292 | 3.016 | 0.075 | 0.000 | 3.150 | 5.265 | 0.918 | 0.820 | n/a | 0.048 | 54.963 | n/a | n/a | 0.037 | 6.241 | 0.091 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.005ms; driver.publication 1.148ms |
| 47bb2b3d052fd0de0000000000001124 | 67.049 | 3.565 | 0.007 | 0.000 | 4.780 | 49.552 | 1.263 | 0.036 | n/a | 0.438 | 7.361 | n/a | n/a | 0.047 | 8.352 | 0.125 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.894ms; driver.publication 4.100ms; driver.publication 2.767ms |
| 47bb2b3d052fd0de000000000000170d | 66.317 | 2.854 | 0.233 | 0.000 | 0.033 | 1.101 | 39.827 | 0.025 | n/a | 0.086 | 22.129 | n/a | n/a | 0.028 | 3.120 | 0.047 | 0.028 | gw-w/thread-44/gateway.admitted-work | driver.publication 1.363ms |
| 47bb2b3d052fd0de000000000000112b | 65.836 | 7.313 | 0.006 | 0.000 | 38.817 | 12.816 | 0.862 | 0.028 | n/a | 1.075 | 4.887 | n/a | n/a | 0.034 | 46.135 | 0.701 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.625ms; driver.publication 3.243ms; client.encode 3.161ms; driver.publication 1.310ms |
| 47bb2b3d052fd0de0000000000001dcd | 65.815 | 3.451 | 0.006 | 0.000 | 3.229 | 1.986 | 2.274 | 0.021 | n/a | 0.213 | 54.608 | n/a | n/a | 0.028 | 6.685 | 0.102 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.148ms |
| 47bb2b3d052fd0de00000000000014d8 | 62.046 | 8.709 | 0.017 | 0.000 | 0.859 | 20.544 | 6.178 | 0.095 | n/a | 5.287 | 20.310 | n/a | n/a | 0.047 | 9.585 | 0.154 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.766ms; driver.publication 3.536ms; driver.publication 1.788ms; driver.publication 1.376ms |
| 47bb2b3d052fd0de0000000000001129 | 61.779 | 15.583 | 0.172 | 0.000 | 5.383 | 27.768 | 0.572 | 1.029 | n/a | 0.378 | 10.853 | n/a | n/a | 0.041 | 21.139 | 0.342 | 0.041 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.243ms; driver.publication 3.134ms; driver.publication 1.310ms |
| 47bb2b3d052fd0de000000000000170f | 61.408 | 4.166 | 0.007 | 0.000 | 0.489 | 14.190 | 12.647 | 0.085 | n/a | 5.438 | 24.350 | n/a | n/a | 0.036 | 4.662 | 0.076 | 0.036 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.163ms |
| 47bb2b3d052fd0de0000000000001909 | 60.876 | 10.999 | 0.005 | 0.000 | 35.729 | 4.604 | 2.384 | 0.032 | n/a | 0.146 | 6.950 | n/a | n/a | 0.027 | 46.732 | 0.768 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 4.539ms; driver.publication 1.217ms; driver.publication 1.052ms |

## P2 / tail / commit / 5-10 facts (1555 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.912 | 0.640 | 0.000 | 1.552 | 3.245 | 0.005 | 0.000 | 0.716 | 0.680 | 0.921 | 0.028 | n/a | 0.188 | 5.317 | n/a | n/a | 0.034 | 4.136 | 0.339 | 0.034 |
| p99 | 54.217 | 2.166 | 2.008 | 5.458 | 9.750 | 0.192 | 0.000 | 16.677 | 13.798 | 6.113 | 2.189 | n/a | 3.600 | 24.823 | n/a | n/a | 0.090 | 20.311 | 0.717 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 47bb2b3d052fd0de0000000000001275 | 115.780 | 4.187 | 0.006 | 0.000 | 83.779 | 6.780 | 0.793 | 0.025 | n/a | 2.339 | 17.827 | n/a | n/a | 0.043 | 87.972 | 0.760 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 4.867ms; driver.publication 3.589ms; driver.publication 1.925ms; driver.publication 1.768ms; driver.expected-state.bind-receipt 1.686ms |
| 47bb2b3d052fd0de00000000000014da | 72.369 | 3.332 | 0.007 | 0.000 | 58.822 | 1.358 | 0.839 | 0.064 | n/a | 0.175 | 7.736 | n/a | n/a | 0.038 | 62.160 | 0.859 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 4.766ms; driver.publication 3.536ms; driver.publication 1.788ms; driver.publication 1.376ms; driver.publication 1.154ms |
| 47bb2b3d052fd0de0000000000001dce | 68.292 | 3.016 | 0.075 | 0.000 | 3.150 | 5.265 | 0.918 | 0.820 | n/a | 0.048 | 54.963 | n/a | n/a | 0.037 | 6.241 | 0.091 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.005ms; driver.publication 1.148ms |
| 47bb2b3d052fd0de0000000000001124 | 67.049 | 3.565 | 0.007 | 0.000 | 4.780 | 49.552 | 1.263 | 0.036 | n/a | 0.438 | 7.361 | n/a | n/a | 0.047 | 8.352 | 0.125 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.894ms; driver.publication 4.100ms; driver.publication 2.767ms |
| 47bb2b3d052fd0de000000000000112b | 65.836 | 7.313 | 0.006 | 0.000 | 38.817 | 12.816 | 0.862 | 0.028 | n/a | 1.075 | 4.887 | n/a | n/a | 0.034 | 46.135 | 0.701 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.625ms; driver.publication 3.243ms; client.encode 3.161ms; driver.publication 1.310ms |
| 47bb2b3d052fd0de0000000000001dcd | 65.815 | 3.451 | 0.006 | 0.000 | 3.229 | 1.986 | 2.274 | 0.021 | n/a | 0.213 | 54.608 | n/a | n/a | 0.028 | 6.685 | 0.102 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.148ms |
| 47bb2b3d052fd0de00000000000014d8 | 62.046 | 8.709 | 0.017 | 0.000 | 0.859 | 20.544 | 6.178 | 0.095 | n/a | 5.287 | 20.310 | n/a | n/a | 0.047 | 9.585 | 0.154 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.766ms; driver.publication 3.536ms; driver.publication 1.788ms; driver.publication 1.376ms |
| 47bb2b3d052fd0de0000000000001129 | 61.779 | 15.583 | 0.172 | 0.000 | 5.383 | 27.768 | 0.572 | 1.029 | n/a | 0.378 | 10.853 | n/a | n/a | 0.041 | 21.139 | 0.342 | 0.041 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.243ms; driver.publication 3.134ms; driver.publication 1.310ms |
| 47bb2b3d052fd0de000000000000170f | 61.408 | 4.166 | 0.007 | 0.000 | 0.489 | 14.190 | 12.647 | 0.085 | n/a | 5.438 | 24.350 | n/a | n/a | 0.036 | 4.662 | 0.076 | 0.036 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.163ms |
| 47bb2b3d052fd0de0000000000001710 | 58.499 | 3.711 | 0.006 | 0.000 | 0.692 | 5.609 | 10.226 | 14.828 | n/a | 0.697 | 22.714 | n/a | n/a | 0.017 | 4.409 | 0.075 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.163ms |
| 47bb2b3d052fd0de000000000000110c | 56.919 | 8.337 | 0.014 | 0.000 | 0.712 | 21.942 | 4.969 | 0.097 | n/a | 1.140 | 19.662 | n/a | n/a | 0.045 | 9.063 | 0.159 | 0.045 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 2.776ms; driver.publication 2.279ms; driver.publication 1.296ms; driver.publication 1.107ms; driver.publication 1.026ms |
| 47bb2b3d052fd0de0000000000001f34 | 56.631 | 2.661 | 0.005 | 0.000 | 44.473 | 1.157 | 0.956 | 0.029 | n/a | 0.357 | 6.964 | n/a | n/a | 0.028 | 47.139 | 0.832 | 0.028 | node-14/thread-0/driver.queue.subject | driver.publication 9.464ms; driver.publication 4.161ms; driver.publication 3.829ms; driver.publication 2.931ms; driver.publication 2.548ms |
| 47bb2b3d052fd0de0000000000001db3 | 55.947 | 2.511 | 0.004 | 0.000 | 0.110 | 5.072 | 0.626 | 0.117 | n/a | 0.336 | 47.141 | n/a | n/a | 0.030 | 2.625 | 0.047 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.171ms |
| 47bb2b3d052fd0de0000000000001eef | 55.705 | 13.051 | 0.003 | 6.060 | 0.710 | 21.723 | 3.982 | 0.535 | n/a | 0.059 | 9.507 | n/a | n/a | 0.074 | 19.824 | 0.356 | 0.074 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 2.115ms; driver.publication 1.787ms; driver.publication 1.742ms; driver.publication 1.729ms; driver.expected-state.bind-receipt 1.477ms |
| 47bb2b3d052fd0de000000000000196d | 55.407 | 10.290 | 0.008 | 0.000 | 0.697 | 25.018 | 3.672 | 0.066 | n/a | 1.940 | 13.698 | n/a | n/a | 0.019 | 10.994 | 0.198 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.609ms; driver.publication 1.522ms; driver.publication 1.479ms; driver.publication 1.251ms; driver.publication 1.238ms |
| 47bb2b3d052fd0de0000000000001db6 | 54.217 | 3.272 | 0.006 | 0.000 | 3.142 | 5.418 | 1.251 | 0.046 | n/a | 5.738 | 35.320 | n/a | n/a | 0.023 | 6.419 | 0.118 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.257ms; driver.publication 1.240ms; driver.publication 1.171ms |
| 47bb2b3d052fd0de0000000000001db7 | 49.890 | 3.126 | 0.006 | 0.000 | 0.749 | 6.878 | 9.951 | 0.054 | n/a | 0.578 | 28.525 | n/a | n/a | 0.022 | 3.881 | 0.078 | 0.022 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.257ms; driver.publication 1.242ms; driver.publication 1.240ms |
| 47bb2b3d052fd0de0000000000001ef4 | 49.566 | 3.864 | 0.005 | 0.000 | 29.482 | 4.776 | 1.670 | 0.133 | n/a | 0.247 | 9.343 | n/a | n/a | 0.047 | 33.351 | 0.673 | 0.047 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.115ms; driver.publication 1.742ms; driver.publication 1.729ms; driver.publication 1.334ms; driver.publication 1.316ms |
| 47bb2b3d052fd0de0000000000001907 | 47.731 | 2.844 | 0.004 | 0.000 | 5.954 | 27.988 | 2.206 | 0.046 | n/a | 0.629 | 8.024 | n/a | n/a | 0.037 | 8.802 | 0.184 | 0.037 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.399ms |
| 47bb2b3d052fd0de0000000000000ebe | 46.777 | 4.154 | 0.004 | 0.000 | 0.568 | 0.424 | 2.354 | 0.022 | n/a | 0.099 | 39.127 | n/a | n/a | 0.027 | 4.725 | 0.101 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.004 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.299 | 200.479 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.322 | 0.000 | 0.000 | 0.322 |
| p99 | 203.902 | n/a | n/a | n/a | 28.398 | n/a | 2.290 | 0.000 | 10.186 | 201.918 | 0.108 | n/a | 0.260 | 0.000 | n/a | n/a | 36.065 | 30.688 | 0.409 | 36.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c7bfa7b2c952c460000000000000005 | 203.902 | 0.000 | n/a | 0.000 | 0.000 | 1.299 | 201.836 | 0.053 | n/a | 0.163 | 0.000 | n/a | n/a | 0.550 | 0.000 | 0.000 | 0.550 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000006 | 203.687 | 0.000 | n/a | 0.000 | 0.000 | 1.278 | 201.918 | 0.037 | n/a | 0.260 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000007 | 203.423 | 0.000 | n/a | 0.000 | 0.000 | 1.555 | 201.359 | 0.012 | n/a | 0.161 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000f05 | 203.140 | 0.000 | n/a | 0.000 | 0.000 | 2.450 | 200.510 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000f03 | 201.381 | 0.000 | n/a | 0.000 | 0.000 | 0.628 | 200.588 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000f04 | 201.004 | 0.000 | n/a | 0.000 | 0.000 | 0.396 | 200.479 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-67/journal/page | none observed |
| 85a77a867a0fd56a0000000000000002 | 170.289 | 1.200 | n/a | 0.000 | 0.000 | 1.122 | 167.449 | 0.108 | n/a | 0.088 | 0.000 | n/a | n/a | 0.322 | 1.200 | 0.007 | 0.322 | gw-r/thread-47/gateway.admitted-work | none observed |
| 7c7bfa7b2c952c460000000000000f08 | 75.122 | 28.398 | n/a | 2.290 | 0.000 | 10.186 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.248 | 30.688 | 0.409 | 34.248 | node-14/thread-4/socket.wait-first-byte | none observed |
| 7c7bfa7b2c952c460000000000000f09 | 56.600 | 15.360 | n/a | 0.000 | 0.000 | 5.174 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.065 | 15.360 | 0.271 | 36.065 | node-14/thread-4/socket.wait-first-byte | none observed |
| 7c7bfa7b2c952c460000000000000f0a | 53.356 | 15.934 | n/a | 0.000 | 0.000 | 4.662 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.760 | 15.934 | 0.299 | 32.760 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 825.276 | n/a | n/a | n/a | 0.200 | n/a | 0.000 | 0.000 | 1.732 | 810.405 | 0.019 | n/a | 0.110 | 0.000 | n/a | n/a | 0.330 | 0.200 | 0.000 | 0.330 |
| p99 | 1005.645 | n/a | n/a | n/a | 12.678 | n/a | 0.000 | 0.000 | 1.742 | 1001.734 | 0.021 | n/a | 0.718 | 0.000 | n/a | n/a | 1.232 | 12.678 | 0.015 | 1.232 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a77a867a0fd56a00000000000000a4 | 1005.645 | 0.200 | n/a | 0.000 | 0.000 | 1.742 | 1001.734 | 0.019 | n/a | 0.718 | 0.000 | n/a | n/a | 1.232 | 0.200 | 0.000 | 1.232 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a00000000000000a5 | 825.276 | 12.678 | n/a | 0.000 | 0.000 | 1.732 | 810.405 | 0.021 | n/a | 0.110 | 0.000 | n/a | n/a | 0.330 | 12.678 | 0.015 | 0.330 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 451.507 | n/a | n/a | n/a | 2.939 | n/a | 0.000 | 0.000 | 0.927 | 445.961 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 0.106 | 2.939 | 0.007 | 0.106 |
| p99 | 1057.990 | n/a | n/a | n/a | 15.134 | n/a | 0.586 | 0.000 | 40.890 | 1001.139 | 0.664 | n/a | 0.358 | 0.000 | n/a | n/a | 46.514 | 15.720 | 0.055 | 46.514 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a77a867a0fd56a00000000000000d0 | 1057.990 | 15.134 | n/a | 0.586 | 0.000 | 40.890 | 1001.139 | 0.016 | n/a | 0.090 | 0.000 | n/a | n/a | 0.135 | 15.720 | 0.015 | 0.135 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a00000000000000b4 | 1003.762 | 0.280 | n/a | 0.000 | 0.000 | 0.962 | 1001.115 | 0.021 | n/a | 0.150 | 0.000 | n/a | n/a | 1.233 | 0.280 | 0.000 | 1.233 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000000bc | 1002.541 | 2.773 | n/a | 0.000 | 0.000 | 0.662 | 998.934 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.086 | 2.773 | 0.003 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a00000000000000bb | 999.391 | 3.160 | n/a | 0.000 | 0.000 | 0.571 | 995.409 | 0.044 | n/a | 0.118 | 0.000 | n/a | n/a | 0.089 | 3.160 | 0.003 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a00000000000000ae | 964.517 | 2.055 | n/a | 0.000 | 0.000 | 1.140 | 961.107 | 0.019 | n/a | 0.108 | 0.000 | n/a | n/a | 0.088 | 2.055 | 0.002 | 0.088 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a00000000000000ab | 784.802 | 4.162 | n/a | 0.000 | 0.000 | 1.157 | 779.129 | 0.015 | n/a | 0.191 | 0.000 | n/a | n/a | 0.149 | 4.162 | 0.005 | 0.149 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000000a8 | 733.043 | 2.886 | n/a | 0.000 | 0.000 | 1.260 | 728.558 | 0.010 | n/a | 0.223 | 0.000 | n/a | n/a | 0.106 | 2.886 | 0.004 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a00000000000000c2 | 727.647 | 7.311 | n/a | 0.000 | 0.000 | 0.603 | 719.495 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.150 | 7.311 | 0.010 | 0.150 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000000b2 | 714.920 | 3.531 | n/a | 0.000 | 0.000 | 0.734 | 710.361 | 0.012 | n/a | 0.177 | 0.000 | n/a | n/a | 0.106 | 3.531 | 0.005 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a00000000000000c9 | 667.368 | 2.864 | n/a | 0.000 | 0.000 | 0.989 | 663.299 | 0.014 | n/a | 0.073 | 0.000 | n/a | n/a | 0.130 | 2.864 | 0.004 | 0.130 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a00000000000000c0 | 646.073 | 3.068 | n/a | 0.000 | 0.000 | 0.542 | 642.293 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.083 | 3.068 | 0.005 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a00000000000000c6 | 615.410 | 2.276 | n/a | 0.000 | 0.000 | 0.927 | 611.797 | 0.269 | n/a | 0.067 | 0.000 | n/a | n/a | 0.076 | 2.276 | 0.004 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a00000000000000cb | 596.814 | 2.510 | n/a | 0.000 | 0.000 | 0.822 | 593.277 | 0.049 | n/a | 0.062 | 0.000 | n/a | n/a | 0.093 | 2.510 | 0.004 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000000a7 | 455.002 | 2.965 | n/a | 0.000 | 0.000 | 1.057 | 450.392 | 0.028 | n/a | 0.358 | 0.000 | n/a | n/a | 0.202 | 2.965 | 0.007 | 0.202 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a00000000000000b7 | 451.507 | 4.247 | n/a | 0.000 | 0.000 | 1.143 | 445.961 | 0.013 | n/a | 0.048 | 0.000 | n/a | n/a | 0.093 | 4.247 | 0.009 | 0.093 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000000c5 | 378.524 | 2.397 | n/a | 0.000 | 0.000 | 1.030 | 374.940 | 0.014 | n/a | 0.067 | 0.000 | n/a | n/a | 0.075 | 2.397 | 0.006 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000000b9 | 374.225 | 2.465 | n/a | 0.000 | 0.000 | 0.700 | 370.827 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.129 | 2.465 | 0.007 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a00000000000000c8 | 342.627 | 4.618 | n/a | 0.000 | 0.000 | 1.043 | 336.577 | 0.018 | n/a | 0.141 | 0.000 | n/a | n/a | 0.230 | 4.618 | 0.013 | 0.230 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a00000000000000cc | 276.665 | 1.997 | n/a | 0.000 | 0.000 | 0.578 | 273.890 | 0.014 | n/a | 0.113 | 0.000 | n/a | n/a | 0.072 | 1.997 | 0.007 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a00000000000000c3 | 264.007 | 2.824 | n/a | 0.000 | 0.000 | 0.968 | 260.008 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.088 | 2.824 | 0.011 | 0.088 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 351.450 | n/a | n/a | n/a | 4.469 | n/a | 0.625 | 0.000 | 0.694 | 343.876 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.173 | 5.057 | 0.023 | 0.173 |
| p99 | 1012.374 | n/a | n/a | n/a | 15.994 | n/a | 2.623 | 0.000 | 1.866 | 1001.323 | 2.448 | n/a | 0.146 | 0.000 | n/a | n/a | 40.823 | 18.617 | 0.506 | 40.823 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a77a867a0fd56a00000000000000d2 | 1012.374 | 8.590 | n/a | 1.544 | 0.000 | 0.840 | 1001.059 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.265 | 10.134 | 0.010 | 0.265 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a0000000000000102 | 1003.565 | 0.121 | n/a | 0.000 | 0.000 | 0.838 | 1001.323 | 0.021 | n/a | 0.146 | 0.000 | n/a | n/a | 1.117 | 0.121 | 0.000 | 1.117 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000000de | 1003.322 | 0.097 | n/a | 0.000 | 0.000 | 0.896 | 1001.096 | 0.020 | n/a | 0.106 | 0.000 | n/a | n/a | 1.108 | 0.097 | 0.000 | 1.108 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a00000000000000d8 | 1002.866 | 0.206 | n/a | 0.000 | 0.000 | 0.688 | 1000.716 | 0.014 | n/a | 0.092 | 0.000 | n/a | n/a | 1.149 | 0.206 | 0.000 | 1.149 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a00000000000000e0 | 1002.848 | 5.769 | n/a | 0.733 | 0.000 | 0.946 | 995.109 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 0.198 | 6.502 | 0.006 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a000000000000010f | 1001.275 | 2.768 | n/a | 0.000 | 0.000 | 0.513 | 997.812 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.111 | 2.768 | 0.003 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a0000000000000107 | 998.094 | 6.830 | n/a | 0.000 | 0.000 | 1.103 | 989.876 | 0.019 | n/a | 0.100 | 0.000 | n/a | n/a | 0.167 | 6.830 | 0.007 | 0.167 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a00000000000000da | 967.259 | 4.432 | n/a | 0.625 | 0.000 | 0.954 | 961.017 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.135 | 5.057 | 0.005 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a00000000000000d1 | 942.035 | 4.036 | n/a | 0.969 | 0.000 | 1.005 | 935.824 | 0.015 | n/a | 0.094 | 0.000 | n/a | n/a | 0.091 | 5.005 | 0.005 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a00000000000000ff | 936.602 | 4.307 | n/a | 0.000 | 0.000 | 1.866 | 929.537 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.795 | 4.307 | 0.005 | 0.795 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a00000000000000e5 | 864.624 | 3.184 | n/a | 0.542 | 0.000 | 0.317 | 860.400 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.110 | 3.726 | 0.004 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000000e1 | 749.038 | 4.469 | n/a | 0.797 | 0.000 | 0.824 | 742.346 | 0.402 | n/a | 0.087 | 0.000 | n/a | n/a | 0.112 | 5.266 | 0.007 | 0.112 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a0000000000000104 | 724.184 | 6.278 | n/a | 0.000 | 0.000 | 0.632 | 716.983 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.209 | 6.278 | 0.009 | 0.209 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000000ec | 606.088 | 3.258 | n/a | 0.000 | 0.000 | 0.691 | 601.928 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.140 | 3.258 | 0.005 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000000e9 | 596.983 | 15.994 | n/a | 2.623 | 0.000 | 0.788 | 577.065 | 0.136 | n/a | 0.076 | 0.000 | n/a | n/a | 0.301 | 18.617 | 0.031 | 0.301 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a00000000000000fc | 548.917 | 6.091 | n/a | 0.612 | 0.000 | 0.694 | 541.357 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.073 | 6.703 | 0.012 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000000db | 505.370 | 10.914 | n/a | 1.311 | 0.000 | 0.812 | 489.504 | 2.448 | n/a | 0.097 | 0.000 | n/a | n/a | 0.285 | 12.224 | 0.024 | 0.285 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a00000000000000dd | 491.284 | 3.015 | n/a | 0.762 | 0.000 | 0.928 | 486.349 | 0.021 | n/a | 0.118 | 0.000 | n/a | n/a | 0.090 | 3.777 | 0.008 | 0.090 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a0000000000000109 | 466.489 | 14.121 | n/a | 1.606 | 0.000 | 0.578 | 449.496 | 0.384 | n/a | 0.084 | 0.000 | n/a | n/a | 0.219 | 15.727 | 0.034 | 0.219 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a00000000000000d4 | 457.926 | 9.557 | n/a | 1.031 | 0.000 | 0.494 | 445.803 | 0.788 | n/a | 0.053 | 0.000 | n/a | n/a | 0.200 | 10.588 | 0.023 | 0.200 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 426.557 | n/a | n/a | n/a | 3.220 | n/a | 0.000 | 0.000 | 0.659 | 422.074 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.116 | 3.296 | 0.010 | 0.116 |
| p99 | 1004.830 | n/a | n/a | n/a | 10.565 | n/a | 1.329 | 0.000 | 3.048 | 1001.379 | 0.168 | n/a | 0.154 | 0.000 | n/a | n/a | 46.978 | 11.296 | 0.258 | 46.978 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a77a867a0fd56a000000000000012d | 1004.830 | 3.296 | n/a | 0.000 | 0.000 | 0.432 | 1000.921 | 0.014 | n/a | 0.064 | 0.000 | n/a | n/a | 0.103 | 3.296 | 0.003 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a0000000000000128 | 1004.201 | 0.102 | n/a | 0.000 | 0.000 | 1.775 | 1001.067 | 0.032 | n/a | 0.120 | 0.000 | n/a | n/a | 1.104 | 0.102 | 0.000 | 1.104 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a000000000000011f | 1003.806 | 4.862 | n/a | 0.000 | 0.000 | 1.384 | 997.195 | 0.160 | n/a | 0.081 | 0.000 | n/a | n/a | 0.124 | 4.862 | 0.005 | 0.124 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a000000000000013a | 1003.502 | 0.163 | n/a | 0.000 | 0.000 | 0.659 | 1001.379 | 0.031 | n/a | 0.141 | 0.000 | n/a | n/a | 1.130 | 0.163 | 0.000 | 1.130 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a0000000000000116 | 1002.651 | 0.142 | n/a | 0.000 | 0.000 | 0.510 | 1000.768 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 1.125 | 0.142 | 0.000 | 1.125 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a0000000000000144 | 995.507 | 2.893 | n/a | 0.000 | 0.000 | 0.713 | 991.597 | 0.034 | n/a | 0.154 | 0.000 | n/a | n/a | 0.116 | 2.893 | 0.003 | 0.116 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a000000000000012e | 993.805 | 4.597 | n/a | 0.000 | 0.000 | 0.710 | 988.286 | 0.009 | n/a | 0.101 | 0.000 | n/a | n/a | 0.102 | 4.597 | 0.005 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a000000000000014b | 799.958 | 3.296 | n/a | 1.005 | 0.000 | 0.863 | 794.582 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.147 | 4.301 | 0.005 | 0.147 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000113 | 781.130 | 2.261 | n/a | 0.000 | 0.000 | 1.608 | 777.114 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.074 | 2.261 | 0.003 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a0000000000000136 | 779.174 | 2.828 | n/a | 0.000 | 0.000 | 0.616 | 775.548 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.108 | 2.828 | 0.004 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a0000000000000140 | 776.188 | 3.110 | n/a | 0.000 | 0.000 | 0.626 | 772.210 | 0.023 | n/a | 0.120 | 0.000 | n/a | n/a | 0.099 | 3.110 | 0.004 | 0.099 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000126 | 739.543 | 3.269 | n/a | 0.000 | 0.000 | 0.480 | 735.556 | 0.120 | n/a | 0.055 | 0.000 | n/a | n/a | 0.063 | 3.269 | 0.004 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a0000000000000130 | 697.395 | 3.081 | n/a | 0.000 | 0.000 | 0.516 | 693.654 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.076 | 3.081 | 0.004 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a0000000000000120 | 686.140 | 2.836 | n/a | 0.000 | 0.000 | 0.605 | 682.415 | 0.040 | n/a | 0.087 | 0.000 | n/a | n/a | 0.158 | 2.836 | 0.004 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a000000000000012a | 684.357 | 6.228 | n/a | 1.329 | 0.000 | 0.574 | 675.891 | 0.144 | n/a | 0.091 | 0.000 | n/a | n/a | 0.100 | 7.557 | 0.011 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a0000000000000110 | 642.310 | 5.691 | n/a | 0.857 | 0.000 | 0.460 | 634.851 | 0.150 | n/a | 0.089 | 0.000 | n/a | n/a | 0.213 | 6.548 | 0.010 | 0.213 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a0000000000000137 | 620.037 | 6.752 | n/a | 0.904 | 0.000 | 0.754 | 611.400 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.147 | 7.656 | 0.012 | 0.147 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000145 | 580.027 | 6.788 | n/a | 1.095 | 0.000 | 0.718 | 571.123 | 0.022 | n/a | 0.136 | 0.000 | n/a | n/a | 0.145 | 7.883 | 0.014 | 0.145 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a000000000000013d | 477.815 | 3.220 | n/a | 0.000 | 0.000 | 0.938 | 473.484 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.093 | 3.220 | 0.007 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a000000000000013c | 459.355 | 9.653 | n/a | 0.766 | 0.000 | 0.626 | 448.121 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.118 | 10.419 | 0.023 | 0.118 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 360.569 | n/a | n/a | n/a | 2.925 | n/a | 0.000 | 0.000 | 0.653 | 355.802 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.101 | 3.024 | 0.008 | 0.101 |
| p99 | 1009.485 | n/a | n/a | n/a | 9.101 | n/a | 2.051 | 0.000 | 3.812 | 1000.771 | 1.134 | n/a | 0.129 | 0.000 | n/a | n/a | 38.805 | 9.101 | 0.569 | 38.805 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a77a867a0fd56a0000000000000188 | 1009.485 | 6.699 | n/a | 0.000 | 0.000 | 3.442 | 999.086 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.213 | 6.699 | 0.007 | 0.213 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a0000000000000167 | 1002.854 | 0.166 | n/a | 0.000 | 0.000 | 0.676 | 1000.771 | 0.020 | n/a | 0.058 | 0.000 | n/a | n/a | 1.162 | 0.166 | 0.000 | 1.162 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a0000000000000171 | 1002.755 | 0.212 | n/a | 0.000 | 0.000 | 0.676 | 1000.633 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 1.176 | 0.212 | 0.000 | 1.176 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000182 | 997.992 | 2.739 | n/a | 0.000 | 0.000 | 0.897 | 994.195 | 0.005 | n/a | 0.073 | 0.000 | n/a | n/a | 0.084 | 2.739 | 0.003 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000157 | 988.522 | 5.797 | n/a | 0.000 | 0.000 | 3.812 | 978.167 | 0.439 | n/a | 0.081 | 0.000 | n/a | n/a | 0.226 | 5.797 | 0.006 | 0.226 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000178 | 988.338 | 4.000 | n/a | 0.000 | 0.000 | 2.165 | 982.034 | 0.018 | n/a | 0.054 | 0.000 | n/a | n/a | 0.067 | 4.000 | 0.004 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a0000000000000189 | 988.247 | 3.196 | n/a | 0.000 | 0.000 | 1.029 | 983.768 | 0.137 | n/a | 0.043 | 0.000 | n/a | n/a | 0.073 | 3.196 | 0.003 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a000000000000015c | 856.907 | 4.244 | n/a | 0.000 | 0.000 | 0.476 | 851.734 | 0.353 | n/a | 0.026 | 0.000 | n/a | n/a | 0.074 | 4.244 | 0.005 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a000000000000017d | 849.407 | 2.788 | n/a | 0.000 | 0.000 | 0.438 | 845.839 | 0.227 | n/a | 0.039 | 0.000 | n/a | n/a | 0.076 | 2.788 | 0.003 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a0000000000000187 | 681.609 | 3.343 | n/a | 0.000 | 0.000 | 0.629 | 677.354 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.217 | 3.343 | 0.005 | 0.217 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a0000000000000170 | 674.463 | 3.215 | n/a | 0.000 | 0.000 | 0.645 | 670.388 | 0.042 | n/a | 0.093 | 0.000 | n/a | n/a | 0.079 | 3.215 | 0.005 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a0000000000000158 | 673.356 | 2.200 | n/a | 0.000 | 0.000 | 1.841 | 669.151 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.104 | 2.200 | 0.003 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a000000000000017a | 672.682 | 2.802 | n/a | 0.000 | 0.000 | 0.529 | 669.234 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.091 | 2.802 | 0.004 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a000000000000018b | 646.532 | 2.705 | n/a | 2.051 | 0.000 | 0.554 | 641.077 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.109 | 4.756 | 0.007 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a0000000000000180 | 642.407 | 4.767 | n/a | 0.000 | 0.000 | 0.719 | 636.543 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.330 | 4.767 | 0.007 | 0.330 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a0000000000000174 | 636.666 | 2.022 | n/a | 0.000 | 0.000 | 0.455 | 634.077 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.080 | 2.022 | 0.003 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000152 | 528.000 | 1.844 | n/a | 0.000 | 0.000 | 0.401 | 525.440 | 0.199 | n/a | 0.050 | 0.000 | n/a | n/a | 0.065 | 1.844 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a000000000000016a | 507.961 | 3.899 | n/a | 0.000 | 0.000 | 0.585 | 502.599 | 0.745 | n/a | 0.031 | 0.000 | n/a | n/a | 0.101 | 3.899 | 0.008 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a0000000000000169 | 489.793 | 9.101 | n/a | 0.000 | 0.000 | 0.736 | 479.552 | 0.156 | n/a | 0.031 | 0.000 | n/a | n/a | 0.217 | 9.101 | 0.019 | 0.217 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000155 | 469.441 | 2.434 | n/a | 0.000 | 0.000 | 0.792 | 466.093 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.079 | 2.434 | 0.005 | 0.079 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 345.467 | n/a | n/a | n/a | 3.649 | n/a | 0.000 | 0.000 | 0.667 | 337.162 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.117 | 3.649 | 0.013 | 0.117 |
| p99 | 1004.317 | n/a | n/a | n/a | 12.652 | n/a | 0.000 | 0.000 | 4.183 | 1001.047 | 2.943 | n/a | 0.126 | 0.000 | n/a | n/a | 48.691 | 12.652 | 0.549 | 48.691 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a77a867a0fd56a000000000000018d | 1004.317 | 2.781 | n/a | 0.000 | 0.000 | 4.183 | 997.243 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.064 | 2.781 | 0.003 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a00000000000001c6 | 1001.976 | 0.162 | n/a | 0.000 | 0.000 | 0.484 | 1001.047 | 0.017 | n/a | 0.126 | 0.000 | n/a | n/a | 0.139 | 0.162 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000001a8 | 1000.350 | 2.466 | n/a | 0.000 | 0.000 | 0.449 | 997.328 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.070 | 2.466 | 0.002 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000001a9 | 997.870 | 2.336 | n/a | 0.000 | 0.000 | 0.462 | 994.868 | 0.113 | n/a | 0.031 | 0.000 | n/a | n/a | 0.061 | 2.336 | 0.002 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000001c5 | 990.720 | 2.622 | n/a | 0.000 | 0.000 | 1.818 | 986.084 | 0.005 | n/a | 0.090 | 0.000 | n/a | n/a | 0.100 | 2.622 | 0.003 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000001a6 | 977.900 | 2.483 | n/a | 0.000 | 0.000 | 1.038 | 974.152 | 0.112 | n/a | 0.040 | 0.000 | n/a | n/a | 0.076 | 2.483 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a000000000000019c | 929.965 | 3.742 | n/a | 0.000 | 0.000 | 2.129 | 923.937 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.118 | 3.742 | 0.004 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a00000000000001c3 | 864.960 | 2.543 | n/a | 0.000 | 0.000 | 0.589 | 861.589 | 0.127 | n/a | 0.041 | 0.000 | n/a | n/a | 0.071 | 2.543 | 0.003 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a000000000000019f | 817.876 | 6.255 | n/a | 0.000 | 0.000 | 0.894 | 810.499 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.161 | 6.255 | 0.008 | 0.161 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000001b7 | 735.296 | 4.776 | n/a | 0.000 | 0.000 | 0.658 | 729.656 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.166 | 4.776 | 0.006 | 0.166 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000001d7 | 688.284 | 2.292 | n/a | 0.000 | 0.000 | 1.880 | 683.990 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.084 | 2.292 | 0.003 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a00000000000001d0 | 630.946 | 4.148 | n/a | 0.000 | 0.000 | 0.561 | 626.002 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.168 | 4.148 | 0.007 | 0.168 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a00000000000001ba | 597.336 | 2.946 | n/a | 0.000 | 0.000 | 0.715 | 593.463 | 0.115 | n/a | 0.032 | 0.000 | n/a | n/a | 0.066 | 2.946 | 0.005 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a000000000000019b | 579.722 | 2.094 | n/a | 0.000 | 0.000 | 0.409 | 576.970 | 0.152 | n/a | 0.038 | 0.000 | n/a | n/a | 0.061 | 2.094 | 0.004 | 0.061 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a00000000000001a2 | 569.550 | 3.824 | n/a | 0.000 | 0.000 | 0.865 | 564.750 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.070 | 3.824 | 0.007 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a00000000000001d3 | 543.513 | 5.622 | n/a | 0.000 | 0.000 | 0.723 | 536.945 | 0.016 | n/a | 0.052 | 0.000 | n/a | n/a | 0.154 | 5.622 | 0.010 | 0.154 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a00000000000001c8 | 538.908 | 6.152 | n/a | 0.000 | 0.000 | 0.801 | 531.363 | 0.284 | n/a | 0.049 | 0.000 | n/a | n/a | 0.259 | 6.152 | 0.011 | 0.259 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000001b1 | 529.802 | 7.313 | n/a | 0.000 | 0.000 | 1.009 | 521.174 | 0.133 | n/a | 0.055 | 0.000 | n/a | n/a | 0.117 | 7.313 | 0.014 | 0.117 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a00000000000001aa | 514.686 | 3.168 | n/a | 0.000 | 0.000 | 2.935 | 508.440 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.105 | 3.168 | 0.006 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a00000000000001a3 | 424.572 | 4.417 | n/a | 0.000 | 0.000 | 0.667 | 419.115 | 0.245 | n/a | 0.042 | 0.000 | n/a | n/a | 0.086 | 4.417 | 0.010 | 0.086 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 356.155 | n/a | n/a | n/a | 2.911 | n/a | 0.000 | 0.000 | 0.528 | 351.117 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.121 | 2.911 | 0.010 | 0.121 |
| p99 | 1003.120 | n/a | n/a | n/a | 9.337 | n/a | 0.000 | 0.000 | 2.501 | 1000.935 | 2.690 | n/a | 0.118 | 0.000 | n/a | n/a | 50.363 | 9.337 | 0.484 | 50.363 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a77a867a0fd56a00000000000001ec | 1003.120 | 0.224 | n/a | 0.000 | 0.000 | 0.723 | 1000.935 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 1.159 | 0.224 | 0.000 | 1.159 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a000000000000021a | 1003.069 | 0.252 | n/a | 0.000 | 0.000 | 0.627 | 1000.934 | 0.016 | n/a | 0.058 | 0.000 | n/a | n/a | 1.182 | 0.252 | 0.000 | 1.182 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a000000000000020a | 1002.865 | 0.124 | n/a | 0.000 | 0.000 | 0.704 | 1000.869 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 1.100 | 0.124 | 0.000 | 1.100 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000201 | 997.637 | 2.532 | n/a | 0.000 | 0.000 | 0.501 | 994.466 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.067 | 2.532 | 0.003 | 0.067 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000215 | 996.945 | 2.689 | n/a | 0.000 | 0.000 | 1.712 | 992.401 | 0.010 | n/a | 0.035 | 0.000 | n/a | n/a | 0.097 | 2.689 | 0.003 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a000000000000021c | 989.585 | 2.854 | n/a | 0.000 | 0.000 | 2.501 | 983.775 | 0.173 | n/a | 0.118 | 0.000 | n/a | n/a | 0.164 | 2.854 | 0.003 | 0.164 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000219 | 985.891 | 3.126 | n/a | 0.000 | 0.000 | 0.521 | 981.802 | 0.298 | n/a | 0.053 | 0.000 | n/a | n/a | 0.091 | 3.126 | 0.003 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a0000000000000216 | 958.967 | 9.337 | n/a | 0.000 | 0.000 | 0.528 | 948.644 | 0.258 | n/a | 0.036 | 0.000 | n/a | n/a | 0.165 | 9.337 | 0.010 | 0.165 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a00000000000001fa | 897.606 | 4.625 | n/a | 0.000 | 0.000 | 0.460 | 892.252 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.238 | 4.625 | 0.005 | 0.238 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000001f7 | 761.864 | 5.793 | n/a | 0.000 | 0.000 | 0.529 | 755.291 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.192 | 5.793 | 0.008 | 0.192 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000202 | 734.746 | 2.450 | n/a | 0.000 | 0.000 | 0.492 | 731.626 | 0.015 | n/a | 0.054 | 0.000 | n/a | n/a | 0.108 | 2.450 | 0.003 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a00000000000001ea | 726.813 | 2.760 | n/a | 0.000 | 0.000 | 1.485 | 722.365 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.145 | 2.760 | 0.004 | 0.145 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000205 | 689.768 | 4.150 | n/a | 0.000 | 0.000 | 0.521 | 684.672 | 0.018 | n/a | 0.066 | 0.000 | n/a | n/a | 0.341 | 4.150 | 0.006 | 0.341 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a00000000000001df | 664.464 | 6.477 | n/a | 0.000 | 0.000 | 0.595 | 657.207 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.121 | 6.477 | 0.010 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a00000000000001f3 | 661.754 | 1.818 | n/a | 0.000 | 0.000 | 0.503 | 659.292 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.083 | 1.818 | 0.003 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a0000000000000213 | 571.541 | 2.612 | n/a | 0.000 | 0.000 | 0.608 | 568.227 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.059 | 2.612 | 0.005 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a00000000000001dc | 553.911 | 2.301 | n/a | 0.000 | 0.000 | 0.626 | 550.841 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 2.301 | 0.004 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000001f1 | 535.043 | 2.400 | n/a | 0.000 | 0.000 | 0.351 | 532.032 | 0.133 | n/a | 0.053 | 0.000 | n/a | n/a | 0.074 | 2.400 | 0.004 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000001e3 | 499.104 | 4.913 | n/a | 0.000 | 0.000 | 0.632 | 493.323 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.163 | 4.913 | 0.010 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a00000000000001fc | 461.620 | 3.458 | n/a | 0.000 | 0.000 | 0.724 | 457.305 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.091 | 3.458 | 0.007 | 0.091 | gw-r/thread-46/journal/page | none observed |

## P3 / L1024 / internal (748 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.564 | n/a | n/a | n/a | 3.354 | n/a | 0.000 | 0.000 | 0.268 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.456 | 3.354 | 0.271 | 7.456 |
| p99 | 195.060 | n/a | n/a | n/a | 16.142 | n/a | 1.228 | 0.000 | 0.858 | 191.977 | 0.108 | n/a | 0.052 | 0.000 | n/a | n/a | 46.986 | 16.353 | 0.812 | 46.986 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a77a867a0fd56a0000000000000228 | 1004.660 | 0.135 | n/a | 0.000 | 0.000 | 2.019 | 1001.271 | 0.022 | n/a | 0.090 | 0.000 | n/a | n/a | 1.122 | 0.135 | 0.000 | 1.122 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a000000000000021d | 789.809 | 4.474 | n/a | 0.000 | 0.000 | 0.743 | 784.377 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.130 | 4.474 | 0.006 | 0.130 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a000000000000022a | 744.692 | 2.794 | n/a | 0.000 | 0.000 | 0.931 | 740.776 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.090 | 2.794 | 0.004 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a0000000000000225 | 689.442 | 4.646 | n/a | 0.000 | 0.000 | 0.646 | 683.967 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.131 | 4.646 | 0.007 | 0.131 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000220 | 648.769 | 5.164 | n/a | 0.000 | 0.000 | 0.631 | 642.785 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.138 | 5.164 | 0.008 | 0.138 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a0000000000000226 | 320.564 | 3.314 | n/a | 0.000 | 0.000 | 0.666 | 316.354 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.172 | 3.314 | 0.010 | 0.172 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a0000000000000221 | 246.142 | 2.142 | n/a | 0.000 | 0.000 | 0.564 | 243.298 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.083 | 2.142 | 0.009 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 85a77a867a0fd56a000000000000021e | 195.060 | 2.456 | n/a | 0.000 | 0.000 | 0.481 | 191.977 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.103 | 2.456 | 0.013 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a00000000000004e5 | 115.572 | 7.536 | n/a | 0.000 | 0.000 | 0.699 | 107.016 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.248 | 7.536 | 0.065 | 0.248 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a000000000000030d | 103.928 | 2.502 | n/a | 0.000 | 0.000 | 0.658 | 100.650 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.076 | 2.502 | 0.024 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000000223 | 98.827 | 3.068 | n/a | 0.000 | 0.000 | 0.466 | 95.135 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.115 | 3.068 | 0.031 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a00000000000002f4 | 97.711 | 8.267 | n/a | 0.000 | 0.000 | 0.534 | 87.970 | 0.829 | n/a | 0.015 | 0.000 | n/a | n/a | 0.095 | 8.267 | 0.085 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a0000000000000237 | 95.465 | 3.025 | n/a | 0.000 | 0.000 | 0.408 | 91.801 | 0.107 | n/a | 0.038 | 0.000 | n/a | n/a | 0.087 | 3.025 | 0.032 | 0.087 | gw-r/thread-47/gateway.admitted-work | none observed |
| 85a77a867a0fd56a0000000000000794 | 91.270 | 2.324 | n/a | 0.000 | 0.000 | 0.335 | 88.495 | 0.006 | n/a | 0.017 | 0.000 | n/a | n/a | 0.093 | 2.324 | 0.025 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a00000000000005e6 | 91.128 | 5.652 | n/a | 0.000 | 0.000 | 0.605 | 84.621 | 0.135 | n/a | 0.032 | 0.000 | n/a | n/a | 0.083 | 5.652 | 0.062 | 0.083 | gw-r/thread-67/journal/page | none observed |
| 85a77a867a0fd56a00000000000007e3 | 89.246 | 2.012 | n/a | 0.000 | 0.000 | 0.296 | 86.790 | 0.074 | n/a | 0.013 | 0.000 | n/a | n/a | 0.060 | 2.012 | 0.023 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a000000000000065e | 86.085 | 8.346 | n/a | 0.000 | 0.000 | 0.701 | 76.765 | 0.109 | n/a | 0.048 | 0.000 | n/a | n/a | 0.116 | 8.346 | 0.097 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a0000000000000782 | 83.192 | 12.558 | n/a | 0.909 | 0.000 | 0.793 | 68.625 | 0.096 | n/a | 0.018 | 0.000 | n/a | n/a | 0.192 | 13.467 | 0.162 | 0.192 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a000000000000062d | 79.315 | 3.302 | n/a | 0.000 | 0.000 | 0.580 | 75.282 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.108 | 3.302 | 0.042 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a000000000000081a | 74.786 | 4.407 | n/a | 0.000 | 0.000 | 0.818 | 69.093 | 0.199 | n/a | 0.037 | 0.000 | n/a | n/a | 0.232 | 4.407 | 0.059 | 0.232 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / internal (2303 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.897 | n/a | n/a | n/a | 4.010 | n/a | 0.000 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.533 | 4.036 | 0.333 | 6.533 |
| p99 | 335.853 | n/a | n/a | n/a | 16.515 | n/a | 1.785 | 0.000 | 0.998 | 332.575 | 0.109 | n/a | 0.033 | 0.000 | n/a | n/a | 46.216 | 17.408 | 0.852 | 46.216 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 85a77a867a0fd56a0000000000001adc | 1002.473 | 0.095 | n/a | 0.000 | 0.000 | 0.405 | 1000.759 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 1.163 | 0.095 | 0.000 | 1.163 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a0000000000001ae6 | 1002.369 | 0.086 | n/a | 0.000 | 0.000 | 0.401 | 1000.686 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 1.154 | 0.086 | 0.000 | 1.154 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a0000000000001a98 | 1002.285 | 0.115 | n/a | 0.000 | 0.000 | 0.440 | 1000.590 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.097 | 0.115 | 0.000 | 1.097 | gw-r/thread-45/journal/page | none observed |
| 85a77a867a0fd56a0000000000001ae1 | 1002.147 | 0.138 | n/a | 0.000 | 0.000 | 0.461 | 1000.417 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 1.099 | 0.138 | 0.000 | 1.099 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000001abb | 1000.961 | 2.802 | n/a | 0.000 | 0.000 | 0.608 | 997.373 | 0.084 | n/a | 0.033 | 0.000 | n/a | n/a | 0.061 | 2.802 | 0.003 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 85a77a867a0fd56a0000000000001aa2 | 999.390 | 2.512 | n/a | 0.000 | 0.000 | 0.374 | 996.335 | 0.083 | n/a | 0.027 | 0.000 | n/a | n/a | 0.059 | 2.512 | 0.003 | 0.059 | gw-r/thread-68/journal/page | none observed |
| 85a77a867a0fd56a0000000000001a97 | 991.156 | 2.985 | n/a | 0.000 | 0.000 | 0.314 | 987.756 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.080 | 2.985 | 0.003 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000001aac | 891.898 | 5.834 | n/a | 0.000 | 0.000 | 0.273 | 885.521 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.246 | 5.834 | 0.007 | 0.246 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a0000000000001a9d | 870.226 | 3.741 | n/a | 0.000 | 0.000 | 0.366 | 866.006 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.093 | 3.741 | 0.004 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a0000000000001abd | 865.122 | 2.181 | n/a | 0.000 | 0.000 | 0.533 | 862.307 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.057 | 2.181 | 0.003 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a0000000000001a9a | 797.153 | 13.165 | n/a | 0.000 | 0.000 | 0.542 | 783.116 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.289 | 13.165 | 0.017 | 0.289 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000001ab7 | 710.737 | 2.591 | n/a | 0.000 | 0.000 | 0.500 | 707.427 | 0.083 | n/a | 0.034 | 0.000 | n/a | n/a | 0.103 | 2.591 | 0.004 | 0.103 | gw-r/thread-68/journal/page | none observed |
| 85a77a867a0fd56a0000000000001ab2 | 690.022 | 7.943 | n/a | 0.000 | 0.000 | 0.493 | 681.270 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.296 | 7.943 | 0.012 | 0.296 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000001ade | 665.667 | 3.237 | n/a | 0.000 | 0.000 | 0.409 | 661.913 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.078 | 3.237 | 0.005 | 0.078 | gw-r/thread-67/journal/page | none observed |
| 85a77a867a0fd56a0000000000001ad5 | 596.361 | 2.476 | n/a | 0.000 | 0.000 | 0.692 | 592.736 | 0.316 | n/a | 0.034 | 0.000 | n/a | n/a | 0.107 | 2.476 | 0.004 | 0.107 | gw-r/thread-50/journal/page | none observed |
| 85a77a867a0fd56a0000000000001aa3 | 525.470 | 2.594 | n/a | 0.000 | 0.000 | 0.345 | 522.359 | 0.078 | n/a | 0.021 | 0.000 | n/a | n/a | 0.073 | 2.594 | 0.005 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 85a77a867a0fd56a0000000000001ad7 | 517.883 | 2.902 | n/a | 0.000 | 0.000 | 0.463 | 514.288 | 0.114 | n/a | 0.021 | 0.000 | n/a | n/a | 0.096 | 2.902 | 0.006 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a0000000000001acb | 515.172 | 2.452 | n/a | 0.000 | 0.000 | 0.448 | 512.170 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.067 | 2.452 | 0.005 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 85a77a867a0fd56a0000000000001abf | 495.944 | 10.282 | n/a | 0.000 | 0.000 | 1.326 | 483.969 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.333 | 10.282 | 0.021 | 0.333 | gw-r/thread-49/journal/page | none observed |
| 85a77a867a0fd56a0000000000001ad8 | 460.489 | 4.040 | n/a | 0.000 | 0.000 | 0.508 | 455.730 | 0.081 | n/a | 0.017 | 0.000 | n/a | n/a | 0.112 | 4.040 | 0.009 | 0.112 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.098 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 200.965 | 0.014 | n/a | 0.134 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 |
| p99 | 210.364 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 27.541 | 201.942 | 3.834 | n/a | 0.783 | 0.000 | n/a | n/a | 51.806 | 0.000 | 0.000 | 51.806 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c7bfa7b2c952c460000000000000031 | 210.364 | 0.000 | n/a | 0.000 | 0.000 | 8.819 | 201.258 | 0.019 | n/a | 0.160 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000009 | 205.162 | 0.000 | n/a | 0.000 | 0.000 | 2.246 | 201.859 | 0.035 | n/a | 0.429 | 0.000 | n/a | n/a | 0.593 | 0.000 | 0.000 | 0.593 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000027 | 203.752 | 0.000 | n/a | 0.000 | 0.000 | 2.020 | 201.348 | 0.023 | n/a | 0.195 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000000e | 203.563 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 201.548 | 0.046 | n/a | 0.783 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000008 | 203.090 | 0.000 | n/a | 0.000 | 0.000 | 1.251 | 201.427 | 0.020 | n/a | 0.221 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000033 | 203.059 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 201.837 | 0.018 | n/a | 0.300 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000000f | 203.040 | 0.000 | n/a | 0.000 | 0.000 | 1.171 | 201.502 | 0.016 | n/a | 0.219 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000012 | 203.017 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.942 | 0.038 | n/a | 0.186 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000001b | 202.825 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 201.431 | 0.019 | n/a | 0.187 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000005a | 202.814 | 0.000 | n/a | 0.000 | 0.000 | 1.168 | 201.303 | 0.010 | n/a | 0.178 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000032 | 202.718 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 201.541 | 0.053 | n/a | 0.174 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000004f | 202.710 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 201.326 | 0.018 | n/a | 0.156 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000014 | 202.684 | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 201.486 | 0.055 | n/a | 0.183 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000000b | 202.676 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 201.363 | 0.020 | n/a | 0.173 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000000c | 202.659 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 201.369 | 0.061 | n/a | 0.227 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000054 | 202.599 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.441 | 0.031 | n/a | 0.147 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000028 | 202.579 | 0.000 | n/a | 0.000 | 0.000 | 1.207 | 201.028 | 0.015 | n/a | 0.185 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000021 | 202.525 | 0.000 | n/a | 0.000 | 0.000 | 1.125 | 200.941 | 0.030 | n/a | 0.255 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000022 | 202.519 | 0.000 | n/a | 0.000 | 0.000 | 1.380 | 200.828 | 0.012 | n/a | 0.124 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000038 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 1.185 | 201.068 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.833 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 200.829 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 206.081 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.257 | 204.839 | 2.994 | n/a | 0.374 | 0.000 | n/a | n/a | 0.327 | 0.000 | 0.000 | 0.327 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c7bfa7b2c952c460000000000000076 | 206.081 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 204.839 | 0.018 | n/a | 0.103 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000b7 | 204.373 | 0.000 | n/a | 0.000 | 0.000 | 1.194 | 202.548 | 0.062 | n/a | 0.374 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000066 | 203.438 | 0.000 | n/a | 0.000 | 0.000 | 1.498 | 201.413 | 0.014 | n/a | 0.186 | 0.000 | n/a | n/a | 0.327 | 0.000 | 0.000 | 0.327 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000b5 | 203.421 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 202.131 | 0.073 | n/a | 0.220 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000bf | 203.300 | 0.000 | n/a | 0.000 | 0.000 | 2.257 | 200.746 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000c2 | 203.213 | 0.000 | n/a | 0.000 | 0.000 | 1.579 | 201.256 | 0.010 | n/a | 0.127 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000064 | 203.031 | 0.000 | n/a | 0.000 | 0.000 | 1.096 | 201.556 | 0.018 | n/a | 0.219 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000b4 | 203.018 | 0.000 | n/a | 0.000 | 0.000 | 1.310 | 201.332 | 0.015 | n/a | 0.153 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000071 | 202.826 | 0.000 | n/a | 0.000 | 0.000 | 1.782 | 200.779 | 0.011 | n/a | 0.100 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000a7 | 202.794 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 201.692 | 0.151 | n/a | 0.188 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000073 | 202.595 | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 201.139 | 0.019 | n/a | 0.130 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000a9 | 202.580 | 0.000 | n/a | 0.000 | 0.000 | 0.528 | 201.811 | 0.026 | n/a | 0.119 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000aa | 202.568 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 201.163 | 0.020 | n/a | 0.163 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000007a | 202.553 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 201.337 | 0.017 | n/a | 0.164 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000082 | 202.546 | 0.000 | n/a | 0.000 | 0.000 | 1.065 | 201.230 | 0.011 | n/a | 0.133 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000b6 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 1.170 | 201.007 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000b9 | 202.502 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 201.177 | 0.016 | n/a | 0.139 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000081 | 202.488 | 0.000 | n/a | 0.000 | 0.000 | 1.078 | 201.139 | 0.018 | n/a | 0.140 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000077 | 202.480 | 0.000 | n/a | 0.000 | 0.000 | 1.061 | 201.083 | 0.020 | n/a | 0.139 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000084 | 202.440 | 0.000 | n/a | 0.000 | 0.000 | 1.086 | 201.070 | 0.010 | n/a | 0.117 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.813 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 200.796 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 203.173 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.917 | 201.475 | 3.127 | n/a | 0.247 | 0.000 | n/a | n/a | 0.384 | 0.000 | 0.000 | 0.384 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c7bfa7b2c952c4600000000000000ea | 203.173 | 0.000 | n/a | 0.000 | 0.000 | 1.109 | 201.475 | 0.030 | n/a | 0.175 | 0.000 | n/a | n/a | 0.384 | 0.000 | 0.000 | 0.384 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000d6 | 203.145 | 0.000 | n/a | 0.000 | 0.000 | 1.977 | 200.878 | 0.010 | n/a | 0.109 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000f9 | 202.759 | 0.000 | n/a | 0.000 | 0.000 | 1.352 | 201.025 | 0.009 | n/a | 0.171 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000011d | 202.652 | 0.000 | n/a | 0.000 | 0.000 | 0.988 | 201.310 | 0.038 | n/a | 0.160 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000d1 | 202.616 | 0.000 | n/a | 0.000 | 0.000 | 1.141 | 201.140 | 0.015 | n/a | 0.132 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000c7 | 202.595 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 201.332 | 0.053 | n/a | 0.247 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000f3 | 202.590 | 0.000 | n/a | 0.000 | 0.000 | 1.125 | 201.110 | 0.015 | n/a | 0.133 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000dd | 202.572 | 0.000 | n/a | 0.000 | 0.000 | 0.972 | 201.310 | 0.014 | n/a | 0.149 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000011b | 202.465 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 201.148 | 0.010 | n/a | 0.128 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000e0 | 202.411 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 201.174 | 0.009 | n/a | 0.120 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000010b | 202.399 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 201.461 | 0.022 | n/a | 0.182 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000eb | 202.393 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 201.298 | 0.016 | n/a | 0.165 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000120 | 202.384 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 201.018 | 0.011 | n/a | 0.114 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000dc | 202.372 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.221 | 0.014 | n/a | 0.145 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000e2 | 202.366 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 201.248 | 0.037 | n/a | 0.162 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000ee | 202.343 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 201.221 | 0.029 | n/a | 0.191 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000f4 | 202.330 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.194 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000c9 | 202.279 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.023 | 0.010 | n/a | 0.130 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000f2 | 202.274 | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 201.238 | 0.014 | n/a | 0.149 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000000f6 | 202.272 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 201.168 | 0.018 | n/a | 0.146 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.709 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 200.810 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 |
| p99 | 204.282 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.508 | 202.475 | 1.515 | n/a | 0.188 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c7bfa7b2c952c46000000000000016c | 204.282 | 0.000 | n/a | 0.000 | 0.000 | 3.508 | 200.608 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000013c | 203.088 | 0.000 | n/a | 0.000 | 0.000 | 0.464 | 202.475 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000144 | 202.687 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.429 | 0.011 | n/a | 0.124 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000016f | 202.683 | 0.000 | n/a | 0.000 | 0.000 | 1.261 | 201.172 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000013e | 202.665 | 0.000 | n/a | 0.000 | 0.000 | 1.419 | 201.030 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000018c | 202.607 | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 201.379 | 0.009 | n/a | 0.092 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000164 | 202.455 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 201.047 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000154 | 202.385 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 201.192 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000171 | 202.293 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 200.965 | 0.007 | n/a | 0.099 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000155 | 202.281 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 201.205 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000150 | 202.277 | 0.000 | n/a | 0.000 | 0.000 | 1.225 | 200.811 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000185 | 202.250 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 201.335 | 0.010 | n/a | 0.121 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000135 | 202.197 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 201.301 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000012e | 202.187 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 201.239 | 0.009 | n/a | 0.188 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000187 | 202.155 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 201.198 | 0.009 | n/a | 0.091 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000016d | 202.091 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 201.112 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000166 | 202.076 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 200.943 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000013d | 202.057 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 200.861 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000149 | 202.038 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 200.915 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000174 | 202.019 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 201.111 | 0.019 | n/a | 0.081 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.662 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 200.743 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 203.550 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.711 | 201.727 | 2.392 | n/a | 0.157 | 0.000 | n/a | n/a | 0.448 | 0.000 | 0.000 | 0.448 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c7bfa7b2c952c4600000000000001eb | 206.250 | 0.000 | n/a | 0.000 | 0.000 | 1.750 | 203.577 | 0.016 | n/a | 0.525 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001f9 | 203.550 | 0.000 | n/a | 0.000 | 0.000 | 1.711 | 201.224 | 0.008 | n/a | 0.157 | 0.000 | n/a | n/a | 0.448 | 0.000 | 0.000 | 0.448 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001ec | 203.099 | 0.000 | n/a | 0.000 | 0.000 | 1.085 | 201.727 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001ed | 202.829 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 201.562 | 0.013 | n/a | 0.108 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001ff | 202.701 | 0.000 | n/a | 0.000 | 0.000 | 1.036 | 201.359 | 0.010 | n/a | 0.118 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001a6 | 202.593 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 201.341 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000196 | 202.569 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 201.512 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001b7 | 202.498 | 0.000 | n/a | 0.000 | 0.000 | 1.081 | 201.169 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001ef | 202.408 | 0.000 | n/a | 0.000 | 0.000 | 0.981 | 201.187 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000019a | 202.359 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 201.405 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001fc | 202.286 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 200.852 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001f2 | 202.268 | 0.000 | n/a | 0.000 | 0.000 | 0.968 | 201.033 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000203 | 202.266 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.106 | 0.015 | n/a | 0.072 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001bb | 202.265 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 200.730 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.519 | 0.000 | 0.000 | 0.519 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001b1 | 202.259 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 201.224 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001f8 | 202.235 | 0.000 | n/a | 0.000 | 0.000 | 0.951 | 201.018 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000193 | 202.226 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 201.004 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001c5 | 202.202 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 201.193 | 0.021 | n/a | 0.082 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000019f | 202.176 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 200.786 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c4600000000000001f5 | 202.168 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 200.911 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.671 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 200.802 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 204.359 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.553 | 202.361 | 0.707 | n/a | 0.220 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c7bfa7b2c952c46000000000000026a | 204.438 | 0.000 | n/a | 0.000 | 0.000 | 1.901 | 201.887 | 0.019 | n/a | 0.252 | 0.000 | n/a | n/a | 0.379 | 0.000 | 0.000 | 0.379 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000253 | 204.359 | 0.000 | n/a | 0.000 | 0.000 | 1.401 | 202.528 | 0.014 | n/a | 0.220 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000218 | 203.525 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 202.361 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000026b | 202.879 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 201.545 | 0.008 | n/a | 0.091 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000251 | 202.756 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.343 | 0.029 | n/a | 0.093 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000024d | 202.677 | 0.000 | n/a | 0.000 | 0.000 | 1.553 | 200.886 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000222 | 202.491 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 201.307 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000027b | 202.381 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.281 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000026e | 202.349 | 0.000 | n/a | 0.000 | 0.000 | 1.029 | 201.121 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000238 | 202.187 | 0.000 | n/a | 0.000 | 0.000 | 0.973 | 200.948 | 0.013 | n/a | 0.069 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000270 | 202.180 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 201.293 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000276 | 202.148 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 201.151 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000261 | 202.147 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.059 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000220 | 202.106 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 201.190 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000231 | 202.038 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.108 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000245 | 201.997 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 201.055 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000257 | 201.987 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 200.889 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000223 | 201.983 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 200.941 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000256 | 201.979 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 201.091 | 0.011 | n/a | 0.075 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000258 | 201.976 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 201.193 | 0.012 | n/a | 0.070 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (66 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.082 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 70.754 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 207.341 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.771 | 205.709 | 3.682 | n/a | 0.136 | 0.000 | n/a | n/a | 77.698 | 0.000 | 0.000 | 77.698 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c7bfa7b2c952c46000000000000028e | 207.341 | 0.000 | n/a | 0.000 | 0.000 | 1.425 | 205.709 | 0.024 | n/a | 0.062 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000027e | 202.928 | 0.000 | n/a | 0.000 | 0.000 | 1.771 | 200.982 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000285 | 202.437 | 0.000 | n/a | 0.000 | 0.000 | 1.138 | 201.050 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000282 | 202.351 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 201.357 | 0.010 | n/a | 0.136 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000027d | 202.213 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 201.114 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000291 | 202.106 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 201.020 | 0.006 | n/a | 0.112 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000028f | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.691 | 201.092 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000283 | 201.851 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.837 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000027f | 201.816 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 200.971 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000293 | 201.705 | 0.000 | n/a | 0.000 | 0.000 | 0.648 | 200.803 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000290 | 201.685 | 0.000 | n/a | 0.000 | 0.000 | 0.670 | 200.788 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000028a | 201.667 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 200.759 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000294 | 201.618 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 200.735 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000289 | 201.603 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 200.689 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c46000000000000028c | 201.548 | 0.000 | n/a | 0.000 | 0.000 | 0.665 | 200.649 | 0.011 | n/a | 0.046 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000295 | 201.375 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 200.720 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000288 | 201.320 | 0.000 | n/a | 0.000 | 0.000 | 0.411 | 200.727 | 0.012 | n/a | 0.070 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000284 | 200.642 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 198.710 | 0.560 | n/a | 0.060 | 0.000 | n/a | n/a | 0.369 | 0.000 | 0.000 | 0.369 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000281 | 191.518 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 190.739 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000292 | 141.705 | 0.000 | n/a | 0.000 | 0.000 | 0.606 | 140.963 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / read (221 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.978 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.467 | 82.162 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 201.924 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.203 | 200.950 | 1.190 | n/a | 0.075 | 0.000 | n/a | n/a | 50.113 | 0.000 | 0.000 | 50.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c7bfa7b2c952c460000000000000eb4 | 202.020 | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 200.585 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-68/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000ebc | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 201.226 | 0.007 | n/a | 0.086 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000efc | 201.924 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 200.848 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000ec7 | 201.773 | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 201.018 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000ea0 | 201.736 | 0.000 | n/a | 0.000 | 0.000 | 1.121 | 200.500 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000eeb | 201.633 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 200.826 | 0.004 | n/a | 0.060 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-67/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000e8d | 201.586 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 200.814 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-68/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000ed6 | 201.582 | 0.000 | n/a | 0.000 | 0.000 | 0.476 | 200.950 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000ecf | 201.560 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 200.892 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-68/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000eb8 | 201.556 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 200.658 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-68/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000e9a | 201.533 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 200.715 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000eca | 201.514 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 200.687 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-68/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000e91 | 201.499 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 200.760 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000e9b | 201.478 | 0.000 | n/a | 0.000 | 0.000 | 0.588 | 200.717 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000e90 | 201.439 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 200.571 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000e9c | 201.417 | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 200.717 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000ec2 | 201.413 | 0.000 | n/a | 0.000 | 0.000 | 0.533 | 200.732 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000e93 | 201.410 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 200.708 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000ee7 | 201.386 | 0.000 | n/a | 0.000 | 0.000 | 0.352 | 200.830 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 7c7bfa7b2c952c460000000000000ed8 | 201.382 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 200.629 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (59.873 ms, trace `289771b70f08f9670000000000000f3d`); `node-14/thread-0/driver.queue.subject` (119.291 ms, trace `289771b70f08f9670000000000000f43`); `node-14/thread-0/driver.queue.subject` (105.481 ms, trace `289771b70f08f9670000000000000f41`); `node-14/thread-0/socket.queue-and-write` (45.212 ms, trace `289771b70f08f9670000000000000356`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (104.673 ms, trace `289771b70f08f9670000000000000108`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-log-zero-a-2-candidate`; source `ef7473361c138176ead9c0222b2ccc53e33dde11`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6666444.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 215 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13477.805 | 581.988 | 71.963 | 308 |
| L1 | 0 | 19947.207 | 476.363 | 19.390 | 462 |
| L4 | 0 | 19968.463 | 396.309 | 9.354 | 426 |
| L16 | 0 | 19974.869 | 407.054 | 13.996 | 474 |
| L64 | 0 | 19933.707 | 434.866 | 20.174 | 610 |
| L256 | 0 | 19946.639 | 365.078 | 11.769 | 472 |
| L1024 | 0 | 19971.665 | 3759.253 | 156.228 | 12043 |
| tail | 0 | 64533.658 | 11732.563 | 501.235 | 37405 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 289771b70f08f9670000000000000f3d | driver.queue.scheduler-late | 2.553 | none | 3 / 32 |
| 289771b70f08f9670000000000000f3d | driver.queue.scheduler-dispatch | 0.033 | none | 3 / 32 |

Observed active steps while trace 289771b70f08f9670000000000000f3d waited: []

| 289771b70f08f9670000000000000f43 | driver.queue.subject | 119.291 | 289771b70f08f9670000000000000f41 | 4 / 32 |
| 289771b70f08f9670000000000000f43 | driver.queue.scheduler-late | 16.615 | none | 4 / 32 |
| 289771b70f08f9670000000000000f43 | driver.queue.scheduler-dispatch | 0.085 | none | 1 / 32 |

Observed active steps while trace 289771b70f08f9670000000000000f43 waited: [{"at":1794608986437.0725,"inFlight":5,"capacity":32,"active":[{"traceId":"289771b70f08f9670000000000000f3d","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f3c","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f40","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f44","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f46","step":"client.http"}]},{"at":1794608986485.9285,"inFlight":8,"capacity":32,"active":[{"traceId":"289771b70f08f9670000000000000f3d","step":"triplex.transact"},{"traceId":"289771b70f08f9670000000000000f46","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f3e","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f48","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4b","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4c","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4d","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4e","step":"client.http"}]},{"at":1794608986506.0642,"inFlight":6,"capacity":32,"active":[{"traceId":"289771b70f08f9670000000000000f3d","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4b","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4c","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4d","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4e","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f41","step":"client.http"}]},{"at":1794608986525.9175,"inFlight":2,"capacity":32,"active":[{"traceId":"289771b70f08f9670000000000000f4b","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f41","step":"client.http"}]}]

| 289771b70f08f9670000000000000f41 | driver.queue.subject | 105.481 | 289771b70f08f9670000000000000f3e | 5 / 32 |
| 289771b70f08f9670000000000000f41 | driver.queue.scheduler-late | 7.932 | none | 5 / 32 |
| 289771b70f08f9670000000000000f41 | driver.queue.scheduler-dispatch | 0.184 | none | 6 / 32 |

Observed active steps while trace 289771b70f08f9670000000000000f41 waited: [{"at":1794608986437.0725,"inFlight":5,"capacity":32,"active":[{"traceId":"289771b70f08f9670000000000000f3d","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f3c","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f40","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f44","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f46","step":"client.http"}]},{"at":1794608986485.9285,"inFlight":8,"capacity":32,"active":[{"traceId":"289771b70f08f9670000000000000f3d","step":"triplex.transact"},{"traceId":"289771b70f08f9670000000000000f46","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f3e","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f48","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4b","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4c","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4d","step":"client.http"},{"traceId":"289771b70f08f9670000000000000f4e","step":"client.http"}]}]

| 289771b70f08f9670000000000000356 | driver.queue.scheduler-late | 21.358 | none | 4 / 32 |
| 289771b70f08f9670000000000000356 | driver.queue.scheduler-dispatch | 0.070 | none | 4 / 32 |

Observed active steps while trace 289771b70f08f9670000000000000356 waited: []

| 289771b70f08f9670000000000000108 | driver.queue.scheduler-dispatch | 0.070 | none | 0 / 32 |
| 289771b70f08f9670000000000000108 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 289771b70f08f9670000000000000108 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.461 | 0.540 | 0.000 | 1.538 | 4.998 | 0.042 | 0.000 | 0.164 | 1.519 | 6.979 | 0.052 | n/a | 0.424 | 13.853 | n/a | n/a | 0.056 | 6.076 | 0.194 | 0.056 |
| p99 | 136.192 | 6.591 | 0.000 | 7.115 | 17.594 | 1.128 | 4.346 | 1.120 | 3.949 | 32.524 | 0.346 | n/a | 4.213 | 104.673 | n/a | n/a | 0.307 | 22.487 | 0.487 | 0.307 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000108 | 136.192 | 8.979 | 1.128 | 0.000 | 0.072 | 1.386 | 16.638 | 0.054 | n/a | 3.224 | 104.673 | n/a | n/a | 0.039 | 10.179 | 0.075 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000000f0 | 68.819 | 15.302 | 0.697 | 0.000 | 0.113 | 3.949 | 18.810 | 0.346 | n/a | 0.479 | 29.046 | n/a | n/a | 0.076 | 16.112 | 0.234 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000100 | 66.670 | 5.463 | 0.361 | 0.000 | 0.164 | 2.806 | 32.524 | 0.055 | n/a | 0.126 | 24.985 | n/a | n/a | 0.186 | 5.988 | 0.090 | 0.186 | gw-w/thread-46/gateway.admitted-work | none observed |
| 289771b70f08f9670000000000000102 | 55.926 | 6.345 | 0.239 | 0.000 | 0.160 | 1.635 | 17.868 | 0.070 | n/a | 0.104 | 29.460 | n/a | n/a | 0.044 | 6.744 | 0.121 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000000f4 | 50.011 | 5.400 | 0.337 | 0.000 | 0.082 | 2.118 | 22.547 | 0.066 | n/a | 4.213 | 15.159 | n/a | n/a | 0.089 | 5.819 | 0.116 | 0.089 | gw-w/thread-46/gateway.admitted-work | none observed |
| 289771b70f08f96700000000000000f8 | 49.720 | 5.459 | 0.319 | 0.000 | 0.076 | 2.012 | 27.488 | 0.060 | n/a | 0.385 | 13.853 | n/a | n/a | 0.068 | 5.854 | 0.118 | 0.068 | gw-w/thread-45/gateway.admitted-work | none observed |
| 289771b70f08f9670000000000000117 | 46.128 | 17.594 | 0.042 | 4.346 | 0.505 | 2.650 | 5.365 | 0.101 | n/a | 0.841 | 14.537 | n/a | n/a | 0.148 | 22.487 | 0.487 | 0.148 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000000ee | 41.893 | 14.133 | 0.019 | 0.000 | 0.441 | 0.916 | 6.800 | 0.049 | n/a | 0.966 | 18.262 | n/a | n/a | 0.307 | 14.593 | 0.348 | 0.307 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000000fa | 41.826 | 8.274 | 0.280 | 0.000 | 0.071 | 3.345 | 18.707 | 0.106 | n/a | 0.411 | 10.427 | n/a | n/a | 0.206 | 8.624 | 0.206 | 0.206 | gw-w/thread-44/gateway.admitted-work | driver.publication 1.269ms |
| 289771b70f08f967000000000000011e | 37.820 | 4.193 | 0.282 | 0.325 | 0.074 | 1.787 | 15.233 | 0.066 | n/a | 0.573 | 15.251 | n/a | n/a | 0.036 | 4.874 | 0.129 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000010c | 36.669 | 4.647 | 0.718 | 0.336 | 0.102 | 2.462 | 10.517 | 0.046 | n/a | 0.647 | 17.136 | n/a | n/a | 0.058 | 5.803 | 0.158 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000011a | 35.319 | 4.998 | 0.740 | 3.835 | 0.076 | 1.519 | 10.849 | 0.064 | n/a | 0.144 | 13.040 | n/a | n/a | 0.054 | 9.649 | 0.273 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000010a | 34.445 | 5.028 | 0.326 | 0.977 | 0.078 | 2.088 | 21.077 | 0.052 | n/a | 0.518 | 4.265 | n/a | n/a | 0.036 | 6.409 | 0.186 | 0.036 | gw-w/thread-45/gateway.admitted-work | none observed |
| 289771b70f08f9670000000000000112 | 34.141 | 4.226 | 0.293 | 0.325 | 0.104 | 3.179 | 11.696 | 0.052 | n/a | 0.091 | 14.117 | n/a | n/a | 0.059 | 4.948 | 0.145 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000000fd | 31.461 | 5.844 | 0.005 | 0.000 | 0.226 | 1.234 | 6.979 | 0.067 | n/a | 0.117 | 16.934 | n/a | n/a | 0.055 | 6.076 | 0.193 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000000f6 | 29.900 | 6.917 | 0.010 | 0.000 | 0.326 | 1.021 | 1.323 | 0.035 | n/a | 0.449 | 19.718 | n/a | n/a | 0.101 | 7.252 | 0.243 | 0.101 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000114 | 29.834 | 8.197 | 0.006 | 0.000 | 0.996 | 1.005 | 3.721 | 0.042 | n/a | 0.118 | 15.691 | n/a | n/a | 0.056 | 9.199 | 0.308 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000116 | 28.858 | 3.795 | 0.225 | 0.284 | 0.113 | 3.148 | 9.034 | 0.045 | n/a | 0.105 | 12.046 | n/a | n/a | 0.062 | 4.417 | 0.153 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000124 | 28.334 | 3.820 | 0.472 | 0.260 | 0.113 | 1.147 | 10.352 | 0.044 | n/a | 0.095 | 11.981 | n/a | n/a | 0.049 | 4.665 | 0.165 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000106 | 28.117 | 4.581 | 0.008 | 0.000 | 0.307 | 0.975 | 1.813 | 0.142 | n/a | 0.994 | 19.185 | n/a | n/a | 0.113 | 4.896 | 0.174 | 0.113 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.886 | 1.643 | 0.000 | 1.968 | 4.256 | 0.010 | 0.000 | 0.661 | 0.949 | 1.323 | 0.038 | n/a | 0.438 | 10.542 | n/a | n/a | 0.043 | 6.294 | 0.304 | 0.043 |
| p99 | 46.128 | 6.591 | 0.000 | 7.115 | 17.594 | 0.042 | 4.346 | 1.120 | 2.650 | 5.365 | 0.101 | n/a | 2.289 | 19.718 | n/a | n/a | 0.163 | 22.487 | 0.487 | 0.163 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000117 | 46.128 | 17.594 | 0.042 | 4.346 | 0.505 | 2.650 | 5.365 | 0.101 | n/a | 0.841 | 14.537 | n/a | n/a | 0.148 | 22.487 | 0.487 | 0.148 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000000f6 | 29.900 | 6.917 | 0.010 | 0.000 | 0.326 | 1.021 | 1.323 | 0.035 | n/a | 0.449 | 19.718 | n/a | n/a | 0.101 | 7.252 | 0.243 | 0.101 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000010f | 23.805 | 3.607 | 0.006 | 0.000 | 0.998 | 0.698 | 4.814 | 0.038 | n/a | 0.438 | 13.169 | n/a | n/a | 0.036 | 4.612 | 0.194 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000011b | 22.879 | 4.765 | 0.012 | 1.363 | 0.503 | 1.343 | 1.205 | 0.041 | n/a | 0.132 | 13.473 | n/a | n/a | 0.042 | 6.643 | 0.290 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000000fb | 21.886 | 4.665 | 0.010 | 0.000 | 0.773 | 0.949 | 2.521 | 0.074 | n/a | 2.289 | 10.542 | n/a | n/a | 0.063 | 5.449 | 0.249 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000120 | 15.512 | 4.187 | 0.006 | 1.441 | 0.661 | 1.741 | 1.237 | 0.049 | n/a | 0.707 | 5.440 | n/a | n/a | 0.043 | 6.294 | 0.406 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000122 | 15.325 | 4.135 | 0.010 | 1.479 | 1.019 | 0.921 | 1.494 | 0.036 | n/a | 0.120 | 6.074 | n/a | n/a | 0.038 | 6.642 | 0.433 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000000f2 | 15.236 | 4.256 | 0.007 | 0.000 | 1.120 | 0.918 | 1.175 | 0.036 | n/a | 0.424 | 7.138 | n/a | n/a | 0.163 | 5.383 | 0.353 | 0.163 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000010d | 12.067 | 3.295 | 0.006 | 0.000 | 0.373 | 0.826 | 1.190 | 0.036 | n/a | 0.395 | 5.910 | n/a | n/a | 0.037 | 3.674 | 0.304 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 46.583 | 0.000 | 0.000 | 0.630 | 4.548 | 0.269 | 0.000 | 0.130 | 4.353 | 24.039 | 0.083 | n/a | 0.113 | 16.288 | n/a | n/a | 0.056 | 5.660 | 0.165 | 0.056 |
| p99 | 52.711 | 1.796 | 0.000 | 2.108 | 6.535 | 1.081 | 0.000 | 2.092 | 4.458 | 26.001 | 1.497 | n/a | 0.128 | 19.096 | n/a | n/a | 0.079 | 7.671 | 0.197 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000126 | 52.711 | 4.548 | 0.269 | 0.000 | 0.130 | 4.353 | 24.039 | 0.083 | n/a | 0.113 | 19.096 | n/a | n/a | 0.079 | 4.948 | 0.094 | 0.079 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000965 | 46.583 | 6.535 | 1.081 | 0.000 | 0.054 | 1.851 | 26.001 | 0.045 | n/a | 0.128 | 10.831 | n/a | n/a | 0.056 | 7.671 | 0.165 | 0.056 | gw-w/thread-48/gateway.admitted-work | driver.publication 2.417ms; driver.publication 1.618ms; driver.publication 1.552ms |
| 289771b70f08f9670000000000000968 | 28.784 | 3.565 | 0.003 | 0.000 | 2.092 | 4.458 | 0.833 | 1.497 | n/a | 0.012 | 16.288 | n/a | n/a | 0.035 | 5.660 | 0.197 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.552ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.062 | 0.521 | 0.000 | 1.482 | 4.869 | 0.030 | 0.261 | 0.188 | 1.553 | 8.460 | 0.060 | n/a | 0.378 | 13.312 | n/a | n/a | 0.052 | 5.883 | 0.182 | 0.052 |
| p99 | 88.777 | 5.030 | 0.013 | 6.079 | 14.488 | 0.911 | 4.512 | 11.665 | 9.708 | 20.649 | 0.309 | n/a | 4.941 | 64.492 | n/a | n/a | 0.154 | 19.719 | 0.529 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000138 | 88.777 | 7.637 | 0.006 | 1.831 | 1.045 | 1.395 | 12.177 | 0.051 | n/a | 0.096 | 64.492 | n/a | n/a | 0.048 | 10.519 | 0.118 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000160 | 68.793 | 14.488 | 0.030 | 0.000 | 0.573 | 3.438 | 2.759 | 0.058 | n/a | 0.376 | 46.917 | n/a | n/a | 0.154 | 15.091 | 0.219 | 0.154 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000146 | 68.384 | 6.114 | 0.437 | 0.445 | 0.188 | 3.204 | 19.172 | 0.119 | n/a | 0.291 | 38.309 | n/a | n/a | 0.105 | 7.184 | 0.105 | 0.105 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000016c | 54.169 | 6.944 | 0.288 | 0.284 | 0.234 | 6.475 | 18.769 | 0.207 | n/a | 0.964 | 19.904 | n/a | n/a | 0.100 | 7.750 | 0.143 | 0.100 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000131 | 52.552 | 5.930 | 0.201 | 0.000 | 0.076 | 4.750 | 17.115 | 0.049 | n/a | 0.131 | 24.251 | n/a | n/a | 0.050 | 6.207 | 0.118 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000012f | 49.187 | 5.243 | 0.007 | 1.539 | 1.137 | 0.919 | 1.214 | 0.037 | n/a | 0.432 | 38.602 | n/a | n/a | 0.058 | 7.927 | 0.161 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000166 | 45.375 | 5.416 | 0.209 | 0.662 | 0.071 | 2.275 | 20.649 | 0.135 | n/a | 0.332 | 15.587 | n/a | n/a | 0.040 | 6.358 | 0.140 | 0.040 | gw-w/thread-46/gateway.admitted-work | none observed |
| 289771b70f08f967000000000000012a | 44.470 | 4.869 | 0.203 | 0.357 | 0.075 | 1.419 | 12.896 | 0.053 | n/a | 0.095 | 24.465 | n/a | n/a | 0.038 | 5.504 | 0.124 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000142 | 44.258 | 3.239 | 0.220 | 0.268 | 0.071 | 4.386 | 15.118 | 0.044 | n/a | 0.153 | 20.722 | n/a | n/a | 0.037 | 3.798 | 0.086 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000014a | 43.684 | 14.143 | 0.018 | 4.512 | 1.046 | 1.604 | 4.131 | 0.111 | n/a | 0.977 | 17.056 | n/a | n/a | 0.085 | 19.719 | 0.451 | 0.085 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000015e | 42.615 | 4.458 | 0.911 | 0.435 | 0.078 | 3.766 | 16.978 | 0.107 | n/a | 0.203 | 15.637 | n/a | n/a | 0.041 | 5.883 | 0.138 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000176 | 42.175 | 3.596 | 0.284 | 0.253 | 0.072 | 4.029 | 18.492 | 0.083 | n/a | 1.750 | 13.574 | n/a | n/a | 0.043 | 4.205 | 0.100 | 0.043 | gw-w/thread-46/gateway.admitted-work | none observed |
| 289771b70f08f967000000000000016e | 41.896 | 4.940 | 0.214 | 0.400 | 0.075 | 1.722 | 16.036 | 0.102 | n/a | 0.357 | 17.998 | n/a | n/a | 0.052 | 5.629 | 0.134 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000134 | 40.196 | 4.295 | 0.434 | 0.000 | 0.090 | 4.861 | 13.990 | 0.048 | n/a | 1.230 | 15.194 | n/a | n/a | 0.055 | 4.818 | 0.120 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000013c | 39.535 | 4.881 | 0.208 | 0.000 | 0.086 | 1.530 | 13.609 | 0.056 | n/a | 0.339 | 18.781 | n/a | n/a | 0.044 | 5.175 | 0.131 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000013a | 35.970 | 3.701 | 0.176 | 0.000 | 0.070 | 2.517 | 15.002 | 0.073 | n/a | 1.587 | 12.790 | n/a | n/a | 0.054 | 3.947 | 0.110 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000132 | 35.546 | 8.061 | 0.006 | 1.610 | 0.103 | 9.708 | 9.899 | 0.183 | n/a | 4.941 | 0.911 | n/a | n/a | 0.125 | 9.780 | 0.275 | 0.125 | node-14/thread-0/socket.wait-first-byte | none observed |
| 289771b70f08f967000000000000016f | 32.735 | 4.903 | 0.007 | 0.000 | 1.045 | 0.814 | 6.295 | 0.126 | n/a | 0.194 | 19.303 | n/a | n/a | 0.049 | 5.954 | 0.182 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000128 | 32.268 | 3.762 | 0.231 | 0.000 | 0.123 | 1.526 | 11.467 | 0.049 | n/a | 0.107 | 14.950 | n/a | n/a | 0.052 | 4.116 | 0.128 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000168 | 32.173 | 4.123 | 0.272 | 0.311 | 0.082 | 1.518 | 12.265 | 0.107 | n/a | 0.130 | 13.315 | n/a | n/a | 0.049 | 4.788 | 0.149 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.734 | 0.521 | 0.000 | 1.630 | 3.488 | 0.006 | 0.000 | 0.653 | 0.919 | 1.847 | 0.071 | n/a | 0.432 | 7.345 | n/a | n/a | 0.054 | 5.917 | 0.255 | 0.054 |
| p99 | 49.187 | 2.004 | 0.000 | 2.236 | 8.061 | 0.016 | 1.610 | 11.665 | 9.708 | 9.899 | 0.309 | n/a | 4.941 | 38.602 | n/a | n/a | 0.125 | 14.647 | 0.529 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f967000000000000012f | 49.187 | 5.243 | 0.007 | 1.539 | 1.137 | 0.919 | 1.214 | 0.037 | n/a | 0.432 | 38.602 | n/a | n/a | 0.058 | 7.927 | 0.161 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000132 | 35.546 | 8.061 | 0.006 | 1.610 | 0.103 | 9.708 | 9.899 | 0.183 | n/a | 4.941 | 0.911 | n/a | n/a | 0.125 | 9.780 | 0.275 | 0.125 | node-14/thread-0/socket.wait-first-byte | none observed |
| 289771b70f08f9670000000000000173 | 27.671 | 2.977 | 0.005 | 0.000 | 11.665 | 0.720 | 1.302 | 0.041 | n/a | 2.910 | 8.010 | n/a | n/a | 0.042 | 14.647 | 0.529 | 0.042 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 4.605ms; driver.publication 1.010ms |
| 289771b70f08f9670000000000000143 | 25.707 | 3.410 | 0.006 | 1.425 | 0.901 | 0.780 | 5.094 | 0.309 | n/a | 0.404 | 13.312 | n/a | n/a | 0.066 | 5.742 | 0.223 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000016a | 17.734 | 5.756 | 0.016 | 0.000 | 0.281 | 1.846 | 2.439 | 0.052 | n/a | 0.748 | 6.520 | n/a | n/a | 0.075 | 6.054 | 0.341 | 0.075 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000015c | 17.249 | 3.207 | 0.007 | 0.000 | 0.653 | 1.006 | 1.847 | 0.081 | n/a | 0.246 | 10.165 | n/a | n/a | 0.038 | 3.867 | 0.224 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000014e | 17.232 | 3.494 | 0.007 | 1.254 | 1.162 | 0.988 | 4.479 | 0.071 | n/a | 0.196 | 5.526 | n/a | n/a | 0.054 | 5.917 | 0.343 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000158 | 16.186 | 3.488 | 0.006 | 0.000 | 0.631 | 0.781 | 1.835 | 0.073 | n/a | 1.982 | 7.345 | n/a | n/a | 0.046 | 4.125 | 0.255 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.101 | 0.569 | 0.000 | 1.034 | 4.377 | 0.198 | 0.209 | 0.148 | 1.337 | 6.462 | 0.056 | n/a | 0.235 | 13.109 | n/a | n/a | 0.055 | 5.035 | 0.179 | 0.055 |
| p99 | 116.475 | 4.247 | 0.000 | 4.529 | 8.807 | 0.493 | 1.982 | 1.095 | 5.700 | 46.326 | 0.657 | n/a | 3.406 | 86.202 | n/a | n/a | 0.121 | 11.072 | 0.428 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f96700000000000001be | 116.475 | 5.890 | 0.258 | 0.000 | 0.091 | 1.707 | 20.852 | 0.040 | n/a | 1.370 | 86.202 | n/a | n/a | 0.066 | 6.240 | 0.054 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000018c | 67.558 | 4.414 | 0.311 | 0.221 | 0.076 | 1.415 | 46.326 | 0.069 | n/a | 0.565 | 14.114 | n/a | n/a | 0.048 | 5.021 | 0.074 | 0.048 | gw-w/thread-48/gateway.admitted-work | none observed |
| 289771b70f08f96700000000000001ba | 57.336 | 8.194 | 0.248 | 0.253 | 0.144 | 5.700 | 15.146 | 0.137 | n/a | 3.406 | 24.041 | n/a | n/a | 0.068 | 8.839 | 0.154 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.731ms |
| 289771b70f08f967000000000000018e | 46.123 | 4.452 | 0.493 | 0.353 | 0.241 | 2.180 | 17.344 | 0.076 | n/a | 0.510 | 20.353 | n/a | n/a | 0.121 | 5.540 | 0.120 | 0.121 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000181 | 45.199 | 4.083 | 0.286 | 0.302 | 0.086 | 1.823 | 16.128 | 0.048 | n/a | 0.194 | 22.202 | n/a | n/a | 0.046 | 4.759 | 0.105 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000184 | 40.689 | 3.755 | 0.198 | 0.351 | 0.148 | 1.280 | 15.820 | 0.166 | n/a | 0.166 | 18.725 | n/a | n/a | 0.082 | 4.451 | 0.109 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000194 | 40.483 | 4.334 | 0.229 | 0.432 | 0.135 | 1.512 | 9.295 | 0.052 | n/a | 0.578 | 23.863 | n/a | n/a | 0.054 | 5.130 | 0.127 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000017c | 38.347 | 4.574 | 0.301 | 0.251 | 0.146 | 1.337 | 19.703 | 0.153 | n/a | 0.744 | 11.067 | n/a | n/a | 0.071 | 5.271 | 0.137 | 0.071 | gw-w/thread-47/gateway.admitted-work | none observed |
| 289771b70f08f96700000000000001a2 | 37.012 | 4.601 | 0.390 | 0.312 | 0.128 | 1.374 | 16.867 | 0.057 | n/a | 0.080 | 13.135 | n/a | n/a | 0.069 | 5.430 | 0.147 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001b4 | 36.865 | 8.807 | 0.007 | 1.739 | 0.519 | 0.816 | 2.525 | 0.043 | n/a | 0.138 | 22.194 | n/a | n/a | 0.078 | 11.072 | 0.300 | 0.078 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000198 | 35.861 | 4.596 | 0.206 | 0.366 | 0.087 | 3.157 | 11.678 | 0.088 | n/a | 0.124 | 15.478 | n/a | n/a | 0.083 | 5.255 | 0.147 | 0.083 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000019a | 34.078 | 4.377 | 0.309 | 0.260 | 0.088 | 1.836 | 11.152 | 0.066 | n/a | 0.302 | 15.632 | n/a | n/a | 0.055 | 5.035 | 0.148 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001ac | 33.354 | 3.650 | 0.199 | 0.209 | 0.071 | 1.521 | 13.566 | 0.657 | n/a | 0.590 | 12.850 | n/a | n/a | 0.040 | 4.129 | 0.124 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001b0 | 33.141 | 5.226 | 0.239 | 0.383 | 0.142 | 1.602 | 12.109 | 0.096 | n/a | 0.174 | 13.109 | n/a | n/a | 0.061 | 5.990 | 0.181 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000185 | 32.735 | 5.244 | 0.007 | 0.000 | 0.199 | 0.706 | 7.743 | 0.040 | n/a | 0.079 | 18.667 | n/a | n/a | 0.052 | 5.450 | 0.166 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001a0 | 31.739 | 4.652 | 0.338 | 0.262 | 0.141 | 1.535 | 12.225 | 0.055 | n/a | 0.347 | 12.090 | n/a | n/a | 0.093 | 5.394 | 0.170 | 0.093 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001b6 | 31.496 | 4.629 | 0.248 | 0.242 | 0.083 | 1.912 | 12.027 | 0.057 | n/a | 0.139 | 12.105 | n/a | n/a | 0.055 | 5.202 | 0.165 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001b2 | 30.333 | 4.283 | 0.219 | 0.296 | 0.138 | 1.365 | 11.148 | 0.043 | n/a | 0.111 | 12.656 | n/a | n/a | 0.074 | 4.936 | 0.163 | 0.074 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000195 | 29.991 | 6.772 | 0.007 | 0.000 | 0.869 | 1.135 | 4.082 | 0.098 | n/a | 0.259 | 16.714 | n/a | n/a | 0.055 | 7.648 | 0.255 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001a6 | 29.101 | 3.911 | 0.248 | 0.319 | 0.105 | 1.341 | 10.906 | 0.087 | n/a | 0.106 | 12.021 | n/a | n/a | 0.057 | 4.583 | 0.157 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.146 | 1.100 | 0.000 | 1.803 | 4.003 | 0.006 | 0.000 | 0.463 | 0.857 | 1.251 | 0.039 | n/a | 0.166 | 9.890 | n/a | n/a | 0.051 | 4.386 | 0.243 | 0.051 |
| p99 | 26.790 | 1.922 | 0.000 | 2.414 | 5.714 | 0.011 | 0.000 | 1.095 | 1.405 | 1.464 | 0.057 | n/a | 0.532 | 19.527 | n/a | n/a | 0.119 | 6.107 | 0.428 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f967000000000000017e | 26.790 | 4.643 | 0.008 | 0.000 | 0.137 | 0.711 | 1.464 | 0.039 | n/a | 0.156 | 19.527 | n/a | n/a | 0.105 | 4.788 | 0.179 | 0.105 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001bb | 23.611 | 4.266 | 0.006 | 0.000 | 1.010 | 1.405 | 0.994 | 0.031 | n/a | 0.053 | 15.796 | n/a | n/a | 0.051 | 5.281 | 0.224 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000017a | 19.530 | 4.236 | 0.008 | 0.000 | 0.494 | 1.009 | 1.405 | 0.042 | n/a | 0.532 | 11.756 | n/a | n/a | 0.049 | 4.737 | 0.243 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001c3 | 18.581 | 3.112 | 0.006 | 0.000 | 0.624 | 0.857 | 1.192 | 0.037 | n/a | 0.382 | 12.324 | n/a | n/a | 0.047 | 3.742 | 0.201 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000190 | 16.149 | 4.084 | 0.006 | 0.000 | 0.463 | 0.892 | 1.285 | 0.057 | n/a | 0.153 | 9.145 | n/a | n/a | 0.064 | 4.553 | 0.282 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000018a | 16.146 | 3.496 | 0.006 | 0.000 | 0.594 | 0.643 | 1.258 | 0.036 | n/a | 0.166 | 9.890 | n/a | n/a | 0.057 | 4.095 | 0.254 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000192 | 16.138 | 3.481 | 0.006 | 0.000 | 0.377 | 0.777 | 1.251 | 0.039 | n/a | 0.141 | 10.031 | n/a | n/a | 0.034 | 3.864 | 0.239 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001a3 | 14.270 | 5.714 | 0.011 | 0.000 | 0.382 | 1.004 | 1.056 | 0.036 | n/a | 0.339 | 5.622 | n/a | n/a | 0.103 | 6.107 | 0.428 | 0.103 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001ae | 13.507 | 4.003 | 0.007 | 0.000 | 0.376 | 0.922 | 1.312 | 0.041 | n/a | 0.167 | 6.559 | n/a | n/a | 0.119 | 4.386 | 0.325 | 0.119 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001c5 | 10.133 | 2.808 | 0.007 | 0.000 | 1.095 | 0.854 | 1.066 | 0.045 | n/a | 0.409 | 3.801 | n/a | n/a | 0.049 | 3.909 | 0.386 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.296 | 0.614 | 0.000 | 1.361 | 4.309 | 0.019 | 0.000 | 0.125 | 1.369 | 5.166 | 0.051 | n/a | 0.320 | 11.447 | n/a | n/a | 0.056 | 4.710 | 0.189 | 0.056 |
| p99 | 67.670 | 3.693 | 0.000 | 4.254 | 20.624 | 3.217 | 0.373 | 1.171 | 5.202 | 31.458 | 0.773 | n/a | 3.755 | 43.504 | n/a | n/a | 0.105 | 21.552 | 0.366 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f96700000000000001ec | 67.670 | 20.624 | 0.019 | 0.000 | 0.909 | 4.815 | 31.458 | 0.140 | n/a | 0.976 | 8.640 | n/a | n/a | 0.089 | 21.552 | 0.318 | 0.089 | gw-w/thread-42/storage/begin-command! | none observed |
| 289771b70f08f967000000000000021c | 66.496 | 5.494 | 0.280 | 0.000 | 0.079 | 1.487 | 15.276 | 0.102 | n/a | 0.220 | 43.504 | n/a | n/a | 0.054 | 5.853 | 0.088 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001db | 50.911 | 8.918 | 0.398 | 0.373 | 0.094 | 2.279 | 12.823 | 0.065 | n/a | 0.357 | 25.550 | n/a | n/a | 0.054 | 9.783 | 0.192 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001d4 | 48.646 | 5.295 | 0.389 | 0.000 | 0.125 | 1.601 | 22.536 | 0.080 | n/a | 0.096 | 18.453 | n/a | n/a | 0.072 | 5.809 | 0.119 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001d7 | 40.837 | 5.789 | 1.199 | 0.000 | 0.122 | 2.105 | 16.755 | 0.094 | n/a | 0.144 | 14.557 | n/a | n/a | 0.073 | 7.110 | 0.174 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000204 | 38.213 | 5.546 | 3.217 | 0.000 | 0.108 | 1.958 | 10.915 | 0.051 | n/a | 0.320 | 15.997 | n/a | n/a | 0.099 | 8.872 | 0.232 | 0.099 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000218 | 34.903 | 4.044 | 0.271 | 0.000 | 0.078 | 1.631 | 13.725 | 0.773 | n/a | 0.187 | 14.151 | n/a | n/a | 0.044 | 4.392 | 0.126 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001e0 | 33.835 | 4.031 | 0.223 | 0.372 | 0.084 | 1.469 | 22.748 | 0.144 | n/a | 0.416 | 4.299 | n/a | n/a | 0.050 | 4.710 | 0.139 | 0.050 | gw-w/thread-48/gateway.admitted-work | driver.publication 1.134ms |
| 289771b70f08f9670000000000000214 | 33.237 | 3.573 | 0.320 | 0.000 | 0.080 | 5.202 | 12.402 | 0.051 | n/a | 0.116 | 11.447 | n/a | n/a | 0.047 | 3.973 | 0.120 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001f8 | 32.834 | 7.695 | 0.006 | 0.000 | 0.643 | 0.823 | 1.376 | 0.036 | n/a | 0.103 | 22.046 | n/a | n/a | 0.105 | 8.344 | 0.254 | 0.105 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000020e | 32.313 | 4.118 | 0.196 | 0.000 | 0.087 | 1.765 | 14.826 | 0.126 | n/a | 0.645 | 10.509 | n/a | n/a | 0.041 | 4.401 | 0.136 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001f7 | 31.228 | 4.780 | 0.217 | 0.000 | 0.130 | 1.875 | 9.352 | 0.056 | n/a | 0.125 | 14.624 | n/a | n/a | 0.069 | 5.127 | 0.164 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001cc | 29.626 | 5.731 | 0.010 | 0.000 | 0.689 | 1.052 | 1.103 | 0.035 | n/a | 0.339 | 20.574 | n/a | n/a | 0.094 | 6.430 | 0.217 | 0.094 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001dc | 28.240 | 8.802 | 0.012 | 0.000 | 1.171 | 0.998 | 1.751 | 0.042 | n/a | 0.566 | 14.828 | n/a | n/a | 0.070 | 9.985 | 0.354 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001ce | 27.714 | 3.978 | 0.262 | 0.000 | 0.077 | 1.540 | 7.605 | 0.052 | n/a | 3.331 | 10.813 | n/a | n/a | 0.055 | 4.317 | 0.156 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001df | 27.543 | 3.572 | 0.006 | 0.000 | 1.142 | 0.777 | 2.462 | 0.106 | n/a | 3.755 | 15.682 | n/a | n/a | 0.042 | 4.720 | 0.171 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001e7 | 26.725 | 3.417 | 0.007 | 0.000 | 0.091 | 0.750 | 7.332 | 0.045 | n/a | 0.119 | 14.919 | n/a | n/a | 0.045 | 3.515 | 0.132 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001d1 | 26.183 | 7.864 | 0.014 | 0.000 | 1.009 | 2.085 | 2.743 | 0.071 | n/a | 0.734 | 11.638 | n/a | n/a | 0.026 | 8.886 | 0.339 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.055ms |
| 289771b70f08f9670000000000000208 | 26.162 | 4.378 | 0.209 | 0.000 | 0.088 | 1.351 | 9.645 | 0.047 | n/a | 0.302 | 10.096 | n/a | n/a | 0.045 | 4.676 | 0.179 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001c9 | 25.992 | 3.960 | 0.007 | 0.000 | 0.122 | 1.020 | 1.549 | 0.128 | n/a | 0.332 | 18.805 | n/a | n/a | 0.069 | 4.089 | 0.157 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.195 | 0.943 | 0.000 | 1.628 | 3.960 | 0.008 | 0.000 | 0.689 | 1.020 | 1.532 | 0.039 | n/a | 0.362 | 13.013 | n/a | n/a | 0.069 | 4.367 | 0.217 | 0.069 |
| p99 | 29.626 | 1.864 | 0.000 | 2.520 | 5.881 | 0.015 | 0.000 | 1.162 | 1.788 | 7.332 | 0.128 | n/a | 3.755 | 20.574 | n/a | n/a | 0.103 | 6.657 | 0.366 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f96700000000000001cc | 29.626 | 5.731 | 0.010 | 0.000 | 0.689 | 1.052 | 1.103 | 0.035 | n/a | 0.339 | 20.574 | n/a | n/a | 0.094 | 6.430 | 0.217 | 0.094 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001df | 27.543 | 3.572 | 0.006 | 0.000 | 1.142 | 0.777 | 2.462 | 0.106 | n/a | 3.755 | 15.682 | n/a | n/a | 0.042 | 4.720 | 0.171 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001e7 | 26.725 | 3.417 | 0.007 | 0.000 | 0.091 | 0.750 | 7.332 | 0.045 | n/a | 0.119 | 14.919 | n/a | n/a | 0.045 | 3.515 | 0.132 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001c9 | 25.992 | 3.960 | 0.007 | 0.000 | 0.122 | 1.020 | 1.549 | 0.128 | n/a | 0.332 | 18.805 | n/a | n/a | 0.069 | 4.089 | 0.157 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001fd | 24.999 | 2.994 | 0.006 | 0.000 | 1.162 | 1.531 | 1.190 | 0.037 | n/a | 0.110 | 17.924 | n/a | n/a | 0.043 | 4.163 | 0.167 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001f2 | 24.052 | 5.320 | 0.011 | 0.000 | 0.797 | 0.966 | 1.251 | 0.036 | n/a | 0.994 | 14.573 | n/a | n/a | 0.103 | 6.128 | 0.255 | 0.103 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001d9 | 22.527 | 5.881 | 0.011 | 0.000 | 0.764 | 1.079 | 3.664 | 0.041 | n/a | 0.391 | 10.607 | n/a | n/a | 0.088 | 6.657 | 0.296 | 0.088 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001d0 | 21.195 | 3.016 | 0.006 | 0.000 | 0.902 | 1.135 | 1.765 | 0.087 | n/a | 0.813 | 13.418 | n/a | n/a | 0.052 | 3.924 | 0.185 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000020f | 20.479 | 3.058 | 0.007 | 0.000 | 0.435 | 1.066 | 2.133 | 0.086 | n/a | 0.639 | 13.013 | n/a | n/a | 0.043 | 3.500 | 0.171 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000201 | 18.922 | 3.381 | 0.006 | 0.000 | 0.094 | 1.242 | 1.051 | 0.036 | n/a | 0.099 | 12.962 | n/a | n/a | 0.051 | 3.481 | 0.184 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001e2 | 17.746 | 4.157 | 0.010 | 0.000 | 0.200 | 0.946 | 2.345 | 0.039 | n/a | 0.372 | 9.617 | n/a | n/a | 0.059 | 4.367 | 0.246 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000209 | 16.561 | 3.829 | 0.011 | 0.000 | 0.203 | 0.790 | 1.511 | 0.036 | n/a | 0.101 | 10.006 | n/a | n/a | 0.072 | 4.044 | 0.244 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000219 | 16.536 | 4.819 | 0.015 | 0.000 | 0.784 | 1.788 | 1.532 | 0.055 | n/a | 0.362 | 7.106 | n/a | n/a | 0.074 | 5.618 | 0.340 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000205 | 16.523 | 4.722 | 0.008 | 0.000 | 0.306 | 0.674 | 1.054 | 0.037 | n/a | 0.149 | 9.472 | n/a | n/a | 0.102 | 5.035 | 0.305 | 0.102 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000001e4 | 13.277 | 4.014 | 0.011 | 0.000 | 0.830 | 0.931 | 1.231 | 0.036 | n/a | 0.397 | 5.748 | n/a | n/a | 0.079 | 4.855 | 0.366 | 0.079 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.876 | 0.588 | 0.000 | 1.543 | 4.363 | 0.011 | 0.000 | 0.331 | 1.205 | 4.554 | 0.050 | n/a | 0.389 | 8.726 | n/a | n/a | 0.052 | 5.006 | 0.254 | 0.052 |
| p99 | 76.672 | 5.286 | 0.014 | 5.818 | 8.806 | 0.366 | 0.000 | 1.225 | 6.441 | 35.202 | 0.528 | n/a | 4.361 | 46.305 | n/a | n/a | 0.115 | 9.470 | 0.500 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000229 | 76.672 | 4.941 | 0.201 | 0.000 | 0.053 | 2.113 | 19.555 | 0.060 | n/a | 3.373 | 46.305 | n/a | n/a | 0.073 | 5.195 | 0.068 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000281 | 56.161 | 6.199 | 0.366 | 0.000 | 0.069 | 1.810 | 32.710 | 0.087 | n/a | 0.232 | 14.599 | n/a | n/a | 0.088 | 6.634 | 0.118 | 0.088 | gw-w/thread-48/gateway.admitted-work | none observed |
| 289771b70f08f9670000000000000222 | 52.393 | 4.972 | 0.006 | 0.000 | 0.495 | 0.706 | 35.202 | 0.071 | n/a | 0.089 | 10.780 | n/a | n/a | 0.072 | 5.472 | 0.104 | 0.072 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| 289771b70f08f967000000000000022b | 46.869 | 3.553 | 0.009 | 0.000 | 1.225 | 0.946 | 4.609 | 0.085 | n/a | 0.144 | 36.223 | n/a | n/a | 0.075 | 4.787 | 0.102 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000025c | 43.191 | 4.751 | 0.220 | 0.000 | 0.088 | 6.441 | 18.977 | 0.066 | n/a | 1.095 | 11.475 | n/a | n/a | 0.078 | 5.060 | 0.117 | 0.078 | gw-w/thread-46/gateway.admitted-work | none observed |
| 289771b70f08f967000000000000021f | 36.255 | 4.914 | 0.252 | 0.000 | 0.138 | 1.899 | 13.701 | 0.068 | n/a | 0.144 | 15.086 | n/a | n/a | 0.052 | 5.304 | 0.146 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000232 | 33.729 | 3.569 | 0.259 | 0.000 | 0.072 | 1.324 | 14.572 | 0.083 | n/a | 0.130 | 13.681 | n/a | n/a | 0.040 | 3.900 | 0.116 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.101ms |
| 289771b70f08f9670000000000000230 | 32.843 | 3.672 | 0.189 | 0.000 | 0.070 | 1.284 | 14.030 | 0.046 | n/a | 0.089 | 13.394 | n/a | n/a | 0.070 | 3.931 | 0.120 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000240 | 32.746 | 4.164 | 0.351 | 0.000 | 0.080 | 2.035 | 10.505 | 0.041 | n/a | 0.677 | 14.847 | n/a | n/a | 0.046 | 4.595 | 0.140 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000024c | 30.813 | 4.515 | 0.291 | 0.000 | 0.103 | 2.360 | 11.720 | 0.113 | n/a | 0.444 | 11.194 | n/a | n/a | 0.072 | 4.910 | 0.159 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000257 | 29.140 | 6.732 | 0.009 | 0.000 | 0.349 | 0.967 | 4.554 | 0.077 | n/a | 0.722 | 15.669 | n/a | n/a | 0.061 | 7.089 | 0.243 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000022d | 28.789 | 6.363 | 0.007 | 0.000 | 0.702 | 0.832 | 9.893 | 0.056 | n/a | 1.403 | 9.491 | n/a | n/a | 0.042 | 7.072 | 0.246 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000027b | 28.623 | 3.935 | 0.332 | 0.000 | 0.105 | 1.255 | 13.293 | 0.042 | n/a | 0.376 | 9.215 | n/a | n/a | 0.069 | 4.372 | 0.153 | 0.069 | gw-w/thread-48/gateway.admitted-work | none observed |
| 289771b70f08f9670000000000000275 | 27.583 | 3.783 | 0.236 | 0.000 | 0.066 | 1.377 | 11.175 | 0.046 | n/a | 0.110 | 10.739 | n/a | n/a | 0.052 | 4.085 | 0.148 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000246 | 27.444 | 4.104 | 0.005 | 0.000 | 0.196 | 0.521 | 1.603 | 0.034 | n/a | 3.933 | 17.014 | n/a | n/a | 0.035 | 4.305 | 0.157 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.400ms |
| 289771b70f08f9670000000000000270 | 26.157 | 4.597 | 0.006 | 0.000 | 0.638 | 0.603 | 1.346 | 0.037 | n/a | 0.389 | 18.487 | n/a | n/a | 0.054 | 5.241 | 0.200 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000225 | 25.651 | 8.806 | 0.008 | 0.000 | 0.656 | 1.111 | 2.481 | 0.114 | n/a | 1.052 | 11.377 | n/a | n/a | 0.046 | 9.470 | 0.369 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000023c | 25.260 | 4.265 | 0.288 | 0.000 | 0.186 | 1.450 | 7.353 | 0.037 | n/a | 0.420 | 11.200 | n/a | n/a | 0.062 | 4.739 | 0.188 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000244 | 24.780 | 4.793 | 0.269 | 0.000 | 0.077 | 1.661 | 4.944 | 0.043 | n/a | 2.935 | 10.013 | n/a | n/a | 0.046 | 5.140 | 0.207 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000256 | 23.701 | 3.188 | 0.185 | 0.000 | 0.048 | 1.197 | 13.331 | 0.062 | n/a | 0.345 | 5.290 | n/a | n/a | 0.055 | 3.421 | 0.144 | 0.055 | gw-w/thread-49/gateway.admitted-work | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.809 | 0.626 | 0.000 | 1.768 | 4.104 | 0.007 | 0.000 | 0.751 | 0.863 | 1.713 | 0.043 | n/a | 0.345 | 7.406 | n/a | n/a | 0.052 | 4.787 | 0.267 | 0.052 |
| p99 | 52.393 | 2.013 | 0.001 | 3.101 | 6.232 | 0.025 | 0.000 | 1.225 | 2.643 | 35.202 | 0.528 | n/a | 3.933 | 36.223 | n/a | n/a | 0.115 | 7.098 | 0.413 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000222 | 52.393 | 4.972 | 0.006 | 0.000 | 0.495 | 0.706 | 35.202 | 0.071 | n/a | 0.089 | 10.780 | n/a | n/a | 0.072 | 5.472 | 0.104 | 0.072 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| 289771b70f08f967000000000000022b | 46.869 | 3.553 | 0.009 | 0.000 | 1.225 | 0.946 | 4.609 | 0.085 | n/a | 0.144 | 36.223 | n/a | n/a | 0.075 | 4.787 | 0.102 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000246 | 27.444 | 4.104 | 0.005 | 0.000 | 0.196 | 0.521 | 1.603 | 0.034 | n/a | 3.933 | 17.014 | n/a | n/a | 0.035 | 4.305 | 0.157 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.400ms |
| 289771b70f08f9670000000000000265 | 22.737 | 4.363 | 0.007 | 0.000 | 0.923 | 2.497 | 10.525 | 0.077 | n/a | 0.164 | 4.132 | n/a | n/a | 0.049 | 5.292 | 0.233 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000279 | 20.416 | 5.510 | 0.011 | 0.000 | 0.331 | 0.769 | 2.249 | 0.042 | n/a | 0.413 | 10.977 | n/a | n/a | 0.115 | 5.852 | 0.287 | 0.115 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000027f | 18.622 | 6.232 | 0.025 | 0.000 | 0.840 | 0.723 | 1.279 | 0.038 | n/a | 0.101 | 9.305 | n/a | n/a | 0.078 | 7.098 | 0.381 | 0.078 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000021e | 18.582 | 4.773 | 0.007 | 0.000 | 0.679 | 2.643 | 4.771 | 0.528 | n/a | 0.126 | 5.004 | n/a | n/a | 0.051 | 5.458 | 0.294 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000227 | 17.616 | 3.552 | 0.006 | 0.000 | 0.992 | 0.670 | 2.785 | 0.038 | n/a | 0.623 | 8.897 | n/a | n/a | 0.052 | 4.551 | 0.258 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000233 | 16.809 | 3.322 | 0.006 | 0.000 | 1.049 | 1.205 | 1.031 | 0.038 | n/a | 0.084 | 10.028 | n/a | n/a | 0.047 | 4.377 | 0.260 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000025d | 16.117 | 4.028 | 0.012 | 0.000 | 0.751 | 1.954 | 1.432 | 0.039 | n/a | 0.471 | 7.406 | n/a | n/a | 0.024 | 4.791 | 0.297 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000250 | 16.113 | 5.480 | 0.012 | 0.000 | 0.915 | 1.042 | 1.237 | 0.043 | n/a | 0.478 | 6.857 | n/a | n/a | 0.050 | 6.407 | 0.398 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000023d | 15.140 | 2.982 | 0.007 | 0.000 | 1.058 | 0.627 | 5.017 | 0.033 | n/a | 1.071 | 4.293 | n/a | n/a | 0.053 | 4.047 | 0.267 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000025a | 14.835 | 4.985 | 0.011 | 0.000 | 1.134 | 1.050 | 1.618 | 0.058 | n/a | 0.650 | 5.260 | n/a | n/a | 0.070 | 6.130 | 0.413 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000261 | 14.662 | 2.959 | 0.007 | 0.000 | 0.349 | 0.863 | 1.713 | 0.057 | n/a | 0.160 | 8.512 | n/a | n/a | 0.043 | 3.315 | 0.226 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000027d | 14.479 | 3.408 | 0.006 | 0.000 | 0.120 | 0.853 | 4.574 | 0.076 | n/a | 0.544 | 4.856 | n/a | n/a | 0.041 | 3.534 | 0.244 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000026a | 13.801 | 4.347 | 0.006 | 0.000 | 0.240 | 1.009 | 1.673 | 0.068 | n/a | 0.345 | 6.043 | n/a | n/a | 0.069 | 4.594 | 0.333 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000272 | 11.528 | 3.917 | 0.008 | 0.000 | 0.305 | 0.605 | 1.171 | 0.034 | n/a | 0.335 | 5.099 | n/a | n/a | 0.054 | 4.229 | 0.367 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (59 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.230 | n/a | n/a | n/a | 39.274 | 10.350 | 2.530 | 0.000 | 0.372 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.017 | 60.957 | 0.892 | 6.017 |
| p99 | 176.920 | n/a | n/a | n/a | 100.242 | 137.575 | 14.380 | 0.000 | 53.885 | 52.687 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 105.390 | 160.698 | 1.000 | 105.390 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000001c5e | 176.920 | 100.242 | 0.620 | 9.423 | 0.000 | 0.939 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 65.696 | 110.285 | 0.623 | 65.696 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.771ms; driver.publication 1.639ms; driver.publication 1.487ms; driver.publication 1.405ms; driver.publication 1.385ms |
| 289771b70f08f9670000000000001cef | 167.837 | 49.124 | 107.174 | 4.400 | 0.000 | 0.372 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.768 | 160.698 | 0.957 | 6.768 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.624ms; driver.publication 1.338ms; driver.publication 1.142ms; driver.publication 1.080ms; driver.publication 1.059ms |
| 289771b70f08f9670000000000001c64 | 163.212 | 19.937 | 137.575 | 0.891 | 0.000 | 0.349 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.460 | 158.403 | 0.971 | 4.460 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.771ms; driver.publication 1.639ms; driver.publication 1.487ms; driver.publication 1.405ms; driver.publication 1.385ms |
| 289771b70f08f9670000000000000479 | 148.809 | 72.055 | 0.318 | 8.746 | 0.000 | 14.970 | 52.687 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.010 | 81.119 | 0.545 | 0.010 | gw-r/thread-50/gateway.response-write | driver.publication 2.491ms; driver.publication 2.112ms; driver.publication 1.380ms; driver.publication 1.101ms; driver.publication 1.056ms |
| 289771b70f08f9670000000000000eb8 | 144.077 | 83.550 | 1.208 | 9.912 | 0.000 | 1.012 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.395 | 94.670 | 0.657 | 48.395 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.917ms; driver.publication 1.198ms; driver.publication 1.020ms; driver.publication 1.016ms |
| 289771b70f08f9670000000000001cec | 137.826 | 21.749 | 10.409 | 0.000 | 0.000 | 0.277 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 105.390 | 32.158 | 0.233 | 105.390 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.624ms; driver.publication 1.142ms; driver.publication 1.080ms; driver.publication 1.059ms |
| 289771b70f08f9670000000000001ceb | 130.436 | 40.427 | 63.753 | 4.131 | 0.000 | 0.460 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.665 | 108.311 | 0.830 | 21.665 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.624ms; driver.publication 1.142ms; driver.publication 1.080ms; driver.publication 1.059ms |
| 289771b70f08f967000000000000154f | 123.373 | 40.844 | 50.570 | 3.007 | 0.000 | 0.180 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.772 | 94.421 | 0.765 | 28.772 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.633ms; driver.publication 3.181ms; driver.publication 2.034ms; driver.publication 1.315ms; driver.publication 1.232ms |
| 289771b70f08f9670000000000001cdf | 120.252 | 52.824 | 5.777 | 6.730 | 0.000 | 0.819 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.102 | 65.331 | 0.543 | 54.102 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.850ms; driver.expected-state.bind-receipt 1.763ms; driver.publication 1.572ms; driver.publication 1.438ms; driver.publication 1.142ms |
| 289771b70f08f9670000000000001ce2 | 118.948 | 24.878 | 0.317 | 0.000 | 0.000 | 0.369 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 93.383 | 25.195 | 0.212 | 93.383 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.850ms; driver.publication 1.142ms; driver.publication 1.142ms; driver.publication 1.059ms |
| 289771b70f08f9670000000000000fdc | 111.443 | 33.004 | 24.351 | 2.530 | 0.000 | 0.258 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.300 | 59.885 | 0.537 | 51.300 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.325ms; driver.publication 1.018ms |
| 289771b70f08f9670000000000001973 | 109.406 | 82.966 | 0.665 | 11.956 | 0.000 | 0.711 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.109 | 95.587 | 0.874 | 13.109 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 3.508ms; driver.publication 1.518ms; driver.publication 1.227ms; driver.publication 1.015ms |
| 289771b70f08f96700000000000012a3 | 106.908 | 39.274 | 64.275 | 1.228 | 0.000 | 0.349 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.782 | 104.777 | 0.980 | 1.782 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.414ms; driver.publication 1.394ms; driver.publication 1.343ms; driver.publication 1.077ms; driver.publication 1.061ms |
| 289771b70f08f9670000000000001554 | 105.334 | 15.481 | 35.117 | 0.000 | 0.000 | 53.885 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.851 | 50.598 | 0.480 | 0.851 | node-14/thread-3/socket.queue-and-write | driver.publication 3.181ms; driver.publication 2.034ms; driver.publication 1.315ms; driver.publication 1.232ms; driver.publication 1.040ms |
| 289771b70f08f967000000000000154d | 100.751 | 41.832 | 50.154 | 4.637 | 0.000 | 0.293 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.835 | 96.624 | 0.959 | 3.835 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.633ms; driver.publication 2.034ms; driver.publication 1.232ms; driver.publication 1.176ms; driver.publication 1.040ms |
| 289771b70f08f9670000000000001cea | 98.258 | 16.712 | 0.360 | 0.000 | 0.000 | 0.506 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 80.679 | 17.072 | 0.174 | 80.679 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.142ms; driver.publication 1.142ms; driver.publication 1.059ms |
| 289771b70f08f9670000000000000c98 | 97.604 | 52.015 | 39.158 | 4.171 | 0.000 | 0.549 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.712 | 95.343 | 0.977 | 1.712 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.240ms; driver.publication 1.055ms |
| 289771b70f08f9670000000000000f42 | 94.549 | 50.513 | 39.842 | 4.184 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 94.539 | 1.000 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication 10.098ms; driver.publication 4.865ms; driver.publication 3.660ms; driver.publication 3.030ms; driver.publication 2.953ms |
| 289771b70f08f9670000000000000f57 | 93.667 | 61.451 | 4.968 | 9.973 | 0.000 | 0.683 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.593 | 76.392 | 0.816 | 16.593 | node-14/thread-2/replica.pull-at | driver.publication 4.895ms; driver.publication 4.354ms; driver.publication 3.767ms; driver.publication 1.868ms; driver.publication 1.326ms |
| 289771b70f08f9670000000000000fdb | 92.948 | 44.807 | 25.142 | 1.945 | 0.000 | 0.570 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.483 | 71.895 | 0.773 | 20.483 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.325ms; driver.publication 1.018ms |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.737 | 0.559 | 0.000 | 1.345 | 3.816 | 0.019 | 0.000 | 0.121 | 1.179 | 5.169 | 0.047 | n/a | 0.150 | 9.023 | n/a | n/a | 0.043 | 4.352 | 0.207 | 0.043 |
| p99 | 54.759 | 2.190 | 0.349 | 4.434 | 7.427 | n/a | 0.000 | 1.238 | 4.880 | 18.090 | 0.114 | n/a | 3.614 | 41.702 | n/a | n/a | 0.096 | 7.845 | 0.471 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000298 | 54.759 | 7.427 | 0.346 | 0.000 | 0.071 | 4.880 | 13.762 | 0.072 | n/a | 0.098 | 28.034 | n/a | n/a | 0.068 | 7.845 | 0.143 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000287 | 51.705 | 3.539 | 0.006 | 0.000 | 0.548 | 0.498 | 5.169 | 0.078 | n/a | 0.127 | 41.702 | n/a | n/a | 0.038 | 4.093 | 0.079 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000290 | 38.315 | 4.747 | 0.359 | 0.000 | 0.126 | 1.642 | 18.090 | 0.114 | n/a | 0.138 | 13.004 | n/a | n/a | 0.096 | 5.231 | 0.137 | 0.096 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002ba | 33.006 | 4.459 | 0.249 | 0.000 | 0.058 | 1.519 | 10.039 | 0.043 | n/a | 0.367 | 16.186 | n/a | n/a | 0.087 | 4.766 | 0.144 | 0.087 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002d5 | 30.871 | 3.565 | 0.244 | 0.000 | 0.121 | 1.179 | 10.554 | 0.054 | n/a | 0.459 | 14.634 | n/a | n/a | 0.061 | 3.931 | 0.127 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002be | 28.468 | 4.552 | 0.299 | 0.000 | 0.095 | 1.325 | 10.684 | 0.037 | n/a | 0.090 | 11.313 | n/a | n/a | 0.073 | 4.946 | 0.174 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002d3 | 28.209 | 3.816 | 0.184 | 0.000 | 0.054 | 1.272 | 12.908 | 0.047 | n/a | 0.099 | 9.789 | n/a | n/a | 0.039 | 4.055 | 0.144 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002b2 | 27.701 | 3.260 | 0.228 | 0.000 | 0.117 | 1.226 | 13.840 | 0.064 | n/a | 0.195 | 8.710 | n/a | n/a | 0.061 | 3.604 | 0.130 | 0.061 | gw-w/thread-42/gateway.admitted-work | none observed |
| 289771b70f08f96700000000000002b6 | 27.256 | 3.836 | 0.191 | 0.000 | 0.087 | 1.640 | 11.119 | 0.065 | n/a | 0.464 | 9.799 | n/a | n/a | 0.055 | 4.115 | 0.151 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002b0 | 26.802 | 4.104 | 0.260 | 0.000 | 0.072 | 1.696 | 9.413 | 0.058 | n/a | 0.078 | 11.081 | n/a | n/a | 0.040 | 4.436 | 0.166 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000293 | 26.577 | 5.701 | 0.007 | 0.000 | 0.226 | 1.245 | 5.236 | 0.039 | n/a | 0.087 | 13.969 | n/a | n/a | 0.068 | 5.935 | 0.223 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002a6 | 26.259 | 3.467 | 0.271 | 0.000 | 0.061 | 1.313 | 11.826 | 0.041 | n/a | 0.083 | 9.157 | n/a | n/a | 0.040 | 3.800 | 0.145 | 0.040 | gw-w/thread-49/gateway.admitted-work | none observed |
| 289771b70f08f9670000000000000285 | 26.045 | 3.185 | 0.203 | 0.000 | 0.063 | 1.380 | 7.974 | 0.039 | n/a | 0.090 | 13.071 | n/a | n/a | 0.041 | 3.451 | 0.132 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000296 | 26.031 | 4.091 | 0.290 | 0.000 | 0.090 | 1.246 | 12.028 | 0.063 | n/a | 0.591 | 7.553 | n/a | n/a | 0.079 | 4.470 | 0.172 | 0.079 | gw-w/thread-47/gateway.admitted-work | none observed |
| 289771b70f08f96700000000000002c8 | 25.147 | 4.875 | 0.397 | 0.000 | 0.075 | 2.208 | 7.259 | 0.076 | n/a | 0.202 | 10.001 | n/a | n/a | 0.054 | 5.348 | 0.213 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002aa | 24.831 | 4.064 | 0.289 | 0.000 | 0.100 | 1.340 | 9.825 | 0.044 | n/a | 0.073 | 9.023 | n/a | n/a | 0.072 | 4.454 | 0.179 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000028d | 24.447 | 5.778 | 0.008 | 0.000 | 0.682 | 0.813 | 2.422 | 0.078 | n/a | 0.697 | 13.896 | n/a | n/a | 0.074 | 6.467 | 0.265 | 0.074 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002ae | 23.247 | 3.509 | 0.006 | 0.000 | 1.082 | 0.955 | 1.911 | 0.068 | n/a | 0.561 | 15.117 | n/a | n/a | 0.038 | 4.596 | 0.198 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002d1 | 22.612 | 3.611 | 0.321 | 0.000 | 0.058 | 1.337 | 5.606 | 0.050 | n/a | 0.181 | 11.409 | n/a | n/a | 0.040 | 3.989 | 0.176 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002a2 | 22.453 | 3.123 | 0.273 | 0.000 | 0.061 | 1.196 | 7.714 | 0.042 | n/a | 0.099 | 9.904 | n/a | n/a | 0.042 | 3.457 | 0.154 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.702 | 0.776 | 0.000 | 1.772 | 3.660 | 0.007 | 0.000 | 0.530 | 0.730 | 1.426 | 0.043 | n/a | 0.123 | 6.317 | n/a | n/a | 0.044 | 4.151 | 0.311 | 0.044 |
| p99 | 20.694 | 2.190 | 0.005 | 4.434 | 6.140 | n/a | 0.000 | 1.238 | 4.822 | 8.495 | 0.076 | n/a | 1.310 | 12.755 | n/a | n/a | 0.069 | 6.344 | 0.471 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f96700000000000002bb | 20.694 | 3.811 | 0.007 | 0.000 | 0.334 | 0.763 | 1.590 | 0.062 | n/a | 1.310 | 12.755 | n/a | n/a | 0.062 | 4.153 | 0.201 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002b4 | 19.676 | 6.140 | 0.007 | 0.000 | 0.198 | 0.725 | 2.117 | 0.073 | n/a | 0.123 | 10.256 | n/a | n/a | 0.037 | 6.344 | 0.322 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002c5 | 15.836 | 3.359 | 0.006 | 0.000 | 0.585 | 0.626 | 1.095 | 0.049 | n/a | 0.102 | 9.971 | n/a | n/a | 0.042 | 3.950 | 0.249 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002c9 | 15.378 | 1.891 | n/a | 0.000 | 0.071 | 4.822 | 8.495 | 0.014 | n/a | 0.041 | 0.000 | n/a | n/a | 0.045 | 1.962 | 0.128 | 0.045 | node-14/thread-0/socket.wait-first-byte | none observed |
| 289771b70f08f96700000000000002bf | 15.032 | 4.400 | 0.012 | 0.000 | 0.530 | 0.885 | 1.465 | 0.037 | n/a | 0.095 | 7.566 | n/a | n/a | 0.043 | 4.941 | 0.329 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002b8 | 14.983 | 4.503 | 0.019 | 0.000 | 0.993 | 1.170 | 1.426 | 0.044 | n/a | 0.476 | 6.317 | n/a | n/a | 0.035 | 5.515 | 0.368 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002ab | 14.869 | 3.310 | 0.006 | 0.000 | 1.036 | 0.927 | 1.713 | 0.076 | n/a | 0.195 | 7.559 | n/a | n/a | 0.046 | 4.352 | 0.293 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002a0 | 14.702 | 3.600 | 0.006 | 0.000 | 0.965 | 0.576 | 1.053 | 0.035 | n/a | 0.397 | 8.000 | n/a | n/a | 0.069 | 4.571 | 0.311 | 0.069 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000282 | 13.516 | 3.660 | 0.007 | 0.000 | 0.193 | 0.717 | 1.307 | 0.036 | n/a | 0.117 | 7.428 | n/a | n/a | 0.049 | 3.861 | 0.286 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002c3 | 13.339 | 2.909 | 0.004 | 0.000 | 1.238 | 0.730 | 1.568 | 0.061 | n/a | 1.160 | 5.642 | n/a | n/a | 0.028 | 4.151 | 0.311 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f967000000000000029b | 11.791 | 3.028 | 0.007 | 0.000 | 0.646 | 1.044 | 1.991 | 0.064 | n/a | 0.692 | 4.259 | n/a | n/a | 0.060 | 3.681 | 0.312 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000291 | 10.877 | 3.859 | 0.007 | 0.000 | 0.079 | 0.645 | 1.001 | 0.043 | n/a | 0.105 | 5.096 | n/a | n/a | 0.044 | 3.945 | 0.363 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000002a3 | 10.628 | 3.773 | 0.006 | 0.000 | 0.332 | 0.775 | 1.025 | 0.036 | n/a | 0.083 | 4.559 | n/a | n/a | 0.039 | 4.111 | 0.387 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000000299 | 10.621 | 4.335 | 0.007 | 0.000 | 0.660 | 0.714 | 0.987 | 0.040 | n/a | 0.430 | 3.379 | n/a | n/a | 0.069 | 5.003 | 0.471 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (848 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.517 | 0.794 | 0.000 | 1.644 | 3.683 | 0.005 | 0.000 | 0.762 | 0.827 | 1.226 | 0.033 | n/a | 0.143 | 6.684 | n/a | n/a | 0.039 | 4.717 | 0.319 | 0.039 |
| p99 | 76.421 | 3.269 | 2.509 | 5.993 | 11.703 | 2.856 | 0.000 | 32.756 | 17.976 | 16.701 | 5.513 | n/a | 3.957 | 39.791 | n/a | n/a | 0.103 | 43.292 | 0.744 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000356 | 138.948 | 4.561 | 0.007 | 0.000 | 21.429 | 49.898 | 23.072 | 0.033 | n/a | 0.093 | 39.791 | n/a | n/a | 0.065 | 25.996 | 0.187 | 0.065 | node-14/thread-0/socket.queue-and-write | driver.publication 6.712ms; driver.publication 4.374ms; driver.publication 2.416ms; driver.publication 1.815ms; driver.publication 1.773ms |
| 289771b70f08f9670000000000000365 | 107.637 | 3.955 | 0.011 | 0.000 | 83.689 | 2.951 | 0.858 | 0.036 | n/a | 0.070 | 16.023 | n/a | n/a | 0.044 | 87.656 | 0.814 | 0.044 | node-14/thread-0/driver.queue.subject | driver.publication 2.884ms; driver.publication 2.416ms; driver.publication 1.833ms; driver.publication 1.815ms; driver.publication 1.773ms |
| 289771b70f08f9670000000000000955 | 99.905 | 4.995 | 0.005 | 0.000 | 76.520 | 1.010 | 5.057 | 0.032 | n/a | 0.071 | 12.172 | n/a | n/a | 0.044 | 81.520 | 0.816 | 0.044 | node-14/thread-0/driver.queue.subject | driver.publication 2.411ms; driver.publication 2.297ms; driver.publication 1.886ms; driver.publication 1.682ms; driver.publication 1.658ms |
| 289771b70f08f9670000000000000361 | 93.492 | 4.568 | 0.007 | 0.000 | 60.911 | 0.763 | 1.187 | 0.033 | n/a | 0.077 | 25.906 | n/a | n/a | 0.041 | 65.486 | 0.700 | 0.041 | node-14/thread-0/driver.queue.subject | driver.publication 3.699ms; driver.publication 2.416ms; driver.publication 1.815ms; driver.publication 1.773ms; driver.publication 1.761ms |
| 289771b70f08f9670000000000000364 | 85.351 | 3.753 | 0.005 | 0.000 | 59.360 | 1.460 | 5.562 | 0.030 | n/a | 0.083 | 15.056 | n/a | n/a | 0.043 | 63.117 | 0.740 | 0.043 | node-14/thread-0/driver.queue.subject | driver.publication 2.416ms; driver.publication 1.833ms; driver.publication 1.815ms; driver.publication 1.773ms; driver.publication 1.761ms |
| 289771b70f08f9670000000000000954 | 80.475 | 4.979 | 0.006 | 0.000 | 44.361 | 3.739 | 1.725 | 0.044 | n/a | 8.846 | 16.738 | n/a | n/a | 0.038 | 49.346 | 0.613 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 2.297ms; driver.publication 1.886ms; driver.publication 1.658ms; driver.publication 1.569ms; driver.publication 1.352ms |
| 289771b70f08f967000000000000035d | 80.415 | 10.565 | 16.847 | 0.000 | 16.176 | 4.405 | 1.890 | 11.734 | n/a | 0.462 | 18.302 | n/a | n/a | 0.033 | 43.588 | 0.542 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 6.712ms; driver.publication 4.374ms; driver.publication 1.815ms; driver.publication 1.773ms; driver.expected-state.bind-receipt 1.456ms |
| 289771b70f08f9670000000000000357 | 78.874 | 5.492 | 0.016 | 0.000 | 3.083 | 42.150 | 1.826 | 0.068 | n/a | 5.672 | 20.529 | n/a | n/a | 0.037 | 8.591 | 0.109 | 0.037 | node-14/thread-0/socket.queue-and-write | driver.publication 6.712ms; driver.publication 4.374ms; driver.expected-state.bind-receipt 1.456ms; driver.publication 1.165ms; driver.publication 1.141ms |
| 289771b70f08f967000000000000054d | 76.421 | 20.774 | 0.014 | 0.000 | 0.144 | 13.462 | 7.482 | 0.095 | n/a | 0.267 | 34.138 | n/a | n/a | 0.044 | 20.933 | 0.274 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.734ms; driver.publication 1.222ms; driver.publication 1.174ms; driver.publication 1.146ms; driver.publication 1.126ms |
| 289771b70f08f967000000000000035c | 75.325 | 8.375 | 17.607 | 0.000 | 16.706 | 5.633 | 1.089 | 9.883 | n/a | 0.034 | 15.972 | n/a | n/a | 0.026 | 42.689 | 0.567 | 0.026 | node-14/thread-0/client.commit-send-queue | driver.publication 6.712ms; driver.publication 4.374ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.456ms; driver.publication 1.437ms |
| 289771b70f08f9670000000000000958 | 72.900 | 12.550 | 0.015 | 0.000 | 0.565 | 21.942 | 5.428 | 0.100 | n/a | 3.354 | 28.891 | n/a | n/a | 0.053 | 13.131 | 0.180 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.411ms; driver.publication 2.297ms; driver.publication 1.886ms; driver.publication 1.682ms; driver.publication 1.658ms |
| 289771b70f08f967000000000000035b | 72.501 | 4.490 | 20.531 | 0.000 | 16.442 | 6.653 | 0.674 | 8.559 | n/a | 0.051 | 15.069 | n/a | n/a | 0.031 | 41.464 | 0.572 | 0.031 | node-14/thread-0/client.commit-send-queue | driver.publication 6.712ms; driver.publication 4.374ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.456ms; driver.publication 1.141ms |
| 289771b70f08f9670000000000000355 | 72.063 | 9.451 | 0.009 | 0.000 | 4.650 | 29.783 | 1.065 | 0.036 | n/a | 0.152 | 26.867 | n/a | n/a | 0.051 | 14.110 | 0.196 | 0.051 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.712ms; driver.expected-state.bind-receipt 1.456ms; driver.publication 1.165ms; driver.publication 1.141ms |
| 289771b70f08f967000000000000035f | 68.827 | 7.100 | 2.856 | 0.000 | 15.764 | 6.755 | 1.273 | 8.964 | n/a | 0.036 | 26.046 | n/a | n/a | 0.034 | 25.720 | 0.374 | 0.034 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 4.374ms; driver.publication 2.416ms; driver.publication 1.815ms; driver.publication 1.773ms; driver.publication 1.437ms |
| 289771b70f08f96700000000000002dd | 67.057 | 9.496 | 0.012 | 0.000 | 0.632 | 2.783 | 36.960 | 0.140 | n/a | 0.274 | 16.722 | n/a | n/a | 0.039 | 10.140 | 0.151 | 0.039 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 289771b70f08f9670000000000000351 | 66.786 | 14.450 | 0.162 | 0.000 | 2.124 | 4.208 | 1.699 | 1.765 | n/a | 0.113 | 42.196 | n/a | n/a | 0.069 | 16.737 | 0.251 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 5.049ms; driver.publication 1.165ms |
| 289771b70f08f9670000000000000363 | 64.358 | 3.160 | 1.141 | 0.000 | 3.146 | 8.448 | 1.479 | 1.850 | n/a | 0.010 | 45.038 | n/a | n/a | 0.086 | 7.446 | 0.116 | 0.086 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.416ms; driver.publication 1.815ms; driver.publication 1.773ms; driver.publication 1.761ms; driver.publication 1.437ms |
| 289771b70f08f96700000000000004a3 | 64.229 | 8.320 | 0.309 | 0.000 | 0.632 | 16.309 | 0.656 | 0.010 | n/a | 0.014 | 37.960 | n/a | n/a | 0.020 | 9.261 | 0.144 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.310ms |
| 289771b70f08f9670000000000000360 | 63.541 | 6.482 | 2.847 | 0.000 | 8.658 | 10.223 | 0.544 | 7.541 | n/a | 0.067 | 27.142 | n/a | n/a | 0.038 | 17.987 | 0.283 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.374ms; driver.publication 2.416ms; driver.publication 1.815ms; driver.publication 1.773ms; driver.publication 1.761ms |
| 289771b70f08f9670000000000000817 | 62.888 | 8.938 | 0.012 | 0.000 | 4.119 | 27.813 | 3.559 | 0.091 | n/a | 1.113 | 17.214 | n/a | n/a | 0.030 | 13.070 | 0.208 | 0.030 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.068ms; driver.publication 1.445ms; driver.publication 1.382ms; driver.publication 1.349ms; driver.expected-state.bind-receipt 1.249ms |

## P2 / L1024 / commit / 5-10 facts (492 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.139 | 0.656 | 0.000 | 1.518 | 3.208 | 0.005 | 0.000 | 0.789 | 0.818 | 1.058 | 0.033 | n/a | 0.140 | 6.089 | n/a | n/a | 0.039 | 4.201 | 0.309 | 0.039 |
| p99 | 67.057 | 2.315 | 2.515 | 5.439 | 10.090 | 1.912 | 0.000 | 24.198 | 16.309 | 12.013 | 5.513 | n/a | 3.531 | 39.169 | n/a | n/a | 0.104 | 35.781 | 0.767 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000356 | 138.948 | 4.561 | 0.007 | 0.000 | 21.429 | 49.898 | 23.072 | 0.033 | n/a | 0.093 | 39.791 | n/a | n/a | 0.065 | 25.996 | 0.187 | 0.065 | node-14/thread-0/socket.queue-and-write | driver.publication 6.712ms; driver.publication 4.374ms; driver.publication 2.416ms; driver.publication 1.815ms; driver.publication 1.773ms |
| 289771b70f08f9670000000000000365 | 107.637 | 3.955 | 0.011 | 0.000 | 83.689 | 2.951 | 0.858 | 0.036 | n/a | 0.070 | 16.023 | n/a | n/a | 0.044 | 87.656 | 0.814 | 0.044 | node-14/thread-0/driver.queue.subject | driver.publication 2.884ms; driver.publication 2.416ms; driver.publication 1.833ms; driver.publication 1.815ms; driver.publication 1.773ms |
| 289771b70f08f9670000000000000357 | 78.874 | 5.492 | 0.016 | 0.000 | 3.083 | 42.150 | 1.826 | 0.068 | n/a | 5.672 | 20.529 | n/a | n/a | 0.037 | 8.591 | 0.109 | 0.037 | node-14/thread-0/socket.queue-and-write | driver.publication 6.712ms; driver.publication 4.374ms; driver.expected-state.bind-receipt 1.456ms; driver.publication 1.165ms; driver.publication 1.141ms |
| 289771b70f08f967000000000000035b | 72.501 | 4.490 | 20.531 | 0.000 | 16.442 | 6.653 | 0.674 | 8.559 | n/a | 0.051 | 15.069 | n/a | n/a | 0.031 | 41.464 | 0.572 | 0.031 | node-14/thread-0/client.commit-send-queue | driver.publication 6.712ms; driver.publication 4.374ms; driver.publication 1.815ms; driver.expected-state.bind-receipt 1.456ms; driver.publication 1.141ms |
| 289771b70f08f96700000000000002dd | 67.057 | 9.496 | 0.012 | 0.000 | 0.632 | 2.783 | 36.960 | 0.140 | n/a | 0.274 | 16.722 | n/a | n/a | 0.039 | 10.140 | 0.151 | 0.039 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 289771b70f08f9670000000000000363 | 64.358 | 3.160 | 1.141 | 0.000 | 3.146 | 8.448 | 1.479 | 1.850 | n/a | 0.010 | 45.038 | n/a | n/a | 0.086 | 7.446 | 0.116 | 0.086 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.416ms; driver.publication 1.815ms; driver.publication 1.773ms; driver.publication 1.761ms; driver.publication 1.437ms |
| 289771b70f08f96700000000000004a3 | 64.229 | 8.320 | 0.309 | 0.000 | 0.632 | 16.309 | 0.656 | 0.010 | n/a | 0.014 | 37.960 | n/a | n/a | 0.020 | 9.261 | 0.144 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.310ms |
| 289771b70f08f9670000000000000360 | 63.541 | 6.482 | 2.847 | 0.000 | 8.658 | 10.223 | 0.544 | 7.541 | n/a | 0.067 | 27.142 | n/a | n/a | 0.038 | 17.987 | 0.283 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.374ms; driver.publication 2.416ms; driver.publication 1.815ms; driver.publication 1.773ms; driver.publication 1.761ms |
| 289771b70f08f9670000000000000812 | 62.144 | 3.019 | 0.006 | 0.000 | 32.756 | 14.839 | 4.297 | 0.031 | n/a | 0.199 | 6.962 | n/a | n/a | 0.036 | 35.781 | 0.576 | 0.036 | node-14/thread-0/driver.queue.subject | driver.publication 3.068ms; driver.publication 1.449ms; driver.publication 1.445ms; driver.publication 1.382ms; driver.publication 1.349ms |
| 289771b70f08f9670000000000000350 | 61.098 | 5.103 | 0.012 | 0.000 | 5.667 | 3.975 | 1.124 | 0.032 | n/a | 3.365 | 41.768 | n/a | n/a | 0.050 | 10.782 | 0.176 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.049ms |
| 289771b70f08f9670000000000000362 | 59.046 | 2.978 | 0.687 | 0.000 | 3.123 | 4.417 | 2.340 | 6.287 | n/a | 0.011 | 39.169 | n/a | n/a | 0.033 | 6.788 | 0.115 | 0.033 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 2.416ms; driver.publication 1.815ms; driver.publication 1.773ms; driver.publication 1.761ms; driver.publication 1.437ms |
| 289771b70f08f9670000000000000952 | 58.044 | 3.876 | 0.004 | 0.000 | 0.622 | 0.688 | 31.907 | 0.052 | n/a | 0.079 | 20.753 | n/a | n/a | 0.062 | 4.502 | 0.078 | 0.062 | gw-w/thread-66/commit.prepare-and-validate | driver.publication 1.352ms |
| 289771b70f08f9670000000000000354 | 57.862 | 3.601 | 0.006 | 0.000 | 0.443 | 19.168 | 1.028 | 0.044 | n/a | 0.116 | 33.412 | n/a | n/a | 0.045 | 4.050 | 0.070 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 6.712ms; driver.expected-state.bind-receipt 1.456ms; driver.publication 1.165ms |
| 289771b70f08f96700000000000004a4 | 57.569 | 3.017 | 0.008 | 0.000 | 0.784 | 9.596 | 0.854 | 1.185 | n/a | 0.017 | 42.063 | n/a | n/a | 0.047 | 3.809 | 0.066 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.310ms; driver.publication 1.035ms |
| 289771b70f08f9670000000000000930 | 57.404 | 37.079 | 0.002 | 0.000 | 0.565 | 9.290 | 2.344 | 0.459 | n/a | 0.272 | 7.364 | n/a | n/a | 0.029 | 37.646 | 0.656 | 0.029 | node-14/thread-0/driver.publication | driver.publication 7.332ms |
| 289771b70f08f9670000000000000902 | 53.158 | 2.630 | 0.004 | 0.000 | 43.044 | 0.479 | 1.000 | 0.023 | n/a | 0.297 | 5.655 | n/a | n/a | 0.027 | 45.678 | 0.859 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication 1.479ms; driver.publication 1.204ms; driver.publication 1.120ms; driver.publication 1.092ms |
| 289771b70f08f967000000000000064c | 48.923 | 4.182 | 0.005 | 0.000 | 19.938 | 15.245 | 5.386 | 0.043 | n/a | 0.278 | 3.802 | n/a | n/a | 0.043 | 24.125 | 0.493 | 0.043 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.868ms; driver.publication 1.247ms |
| 289771b70f08f9670000000000000956 | 47.291 | 3.866 | 0.008 | 0.000 | 1.088 | 14.272 | 0.672 | 2.648 | n/a | 0.085 | 24.608 | n/a | n/a | 0.042 | 4.962 | 0.105 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.658ms; driver.publication 1.352ms; driver.expected-state.bind-receipt 1.219ms; driver.publication 1.096ms |
| 289771b70f08f9670000000000000935 | 45.161 | 8.894 | 0.803 | 0.000 | 2.823 | 3.986 | 0.571 | 4.743 | n/a | 0.029 | 23.281 | n/a | n/a | 0.032 | 12.520 | 0.277 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 2.573ms; driver.publication 1.475ms; driver.publication 1.382ms; driver.expected-state.bind-receipt 1.333ms |
| 289771b70f08f96700000000000003fa | 42.518 | 3.705 | 0.004 | 0.000 | 0.470 | 2.502 | 0.581 | 0.020 | n/a | 0.060 | 35.146 | n/a | n/a | 0.028 | 4.180 | 0.098 | 0.028 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.161ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.784 | 1.796 | 0.000 | 2.108 | 3.565 | 0.003 | 0.000 | 2.092 | 4.458 | 0.833 | 1.497 | n/a | 0.012 | 16.288 | n/a | n/a | 0.035 | 5.660 | 0.197 | 0.035 |
| p99 | 28.784 | 1.796 | 0.000 | 2.108 | 3.565 | 0.003 | 0.000 | 2.092 | 4.458 | 0.833 | 1.497 | n/a | 0.012 | 16.288 | n/a | n/a | 0.035 | 5.660 | 0.197 | 0.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000968 | 28.784 | 3.565 | 0.003 | 0.000 | 2.092 | 4.458 | 0.833 | 1.497 | n/a | 0.012 | 16.288 | n/a | n/a | 0.035 | 5.660 | 0.197 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.552ms |

## P2 / tail / commit (2618 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.471 | 0.795 | 0.000 | 1.617 | 3.719 | 0.005 | 0.000 | 0.729 | 0.743 | 1.143 | 0.030 | n/a | 0.123 | 5.760 | n/a | n/a | 0.034 | 4.668 | 0.349 | 0.034 |
| p99 | 66.365 | 3.093 | 1.938 | 5.633 | 12.765 | 0.979 | 0.000 | 20.813 | 15.045 | 13.603 | 3.258 | n/a | 4.113 | 34.725 | n/a | n/a | 0.101 | 29.249 | 0.715 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000f3d | 171.031 | 45.983 | 0.016 | 0.000 | 2.586 | 62.394 | 5.946 | 0.120 | n/a | 7.142 | 46.797 | n/a | n/a | 0.048 | 48.585 | 0.284 | 0.048 | node-14/thread-0/socket.wait-first-byte | driver.publication 10.098ms; driver.publication 9.714ms; driver.publication 4.865ms; driver.publication 3.660ms; driver.publication 2.953ms |
| 289771b70f08f9670000000000000f43 | 160.333 | 6.112 | 0.006 | 0.000 | 135.990 | 4.409 | 1.392 | 0.036 | n/a | 3.134 | 9.201 | n/a | n/a | 0.054 | 142.108 | 0.886 | 0.054 | node-14/thread-0/driver.queue.subject | driver.publication 10.098ms; driver.publication 9.714ms; driver.publication 4.865ms; driver.publication 3.660ms; driver.publication 3.030ms |
| 289771b70f08f9670000000000000f41 | 147.069 | 5.245 | 0.010 | 0.000 | 113.596 | 8.132 | 3.484 | 0.037 | n/a | 1.438 | 15.062 | n/a | n/a | 0.065 | 118.852 | 0.808 | 0.065 | node-14/thread-0/driver.queue.subject | driver.publication 10.098ms; driver.publication 9.714ms; driver.publication 4.865ms; driver.publication 3.660ms; driver.publication 3.030ms |
| 289771b70f08f9670000000000000f3e | 122.297 | 7.728 | 0.010 | 0.000 | 70.122 | 18.984 | 2.169 | 0.040 | n/a | 2.136 | 21.040 | n/a | n/a | 0.069 | 77.860 | 0.637 | 0.069 | node-14/thread-0/driver.queue.subject | driver.publication 10.098ms; driver.publication 9.714ms; driver.publication 4.865ms; driver.publication 3.660ms; driver.publication 3.030ms |
| 289771b70f08f9670000000000000f2e | 112.406 | 11.741 | 1.107 | 0.000 | 18.601 | 2.091 | 4.155 | 7.319 | n/a | 0.978 | 66.361 | n/a | n/a | 0.055 | 31.449 | 0.280 | 0.055 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 19.089ms; driver.publication 2.724ms; driver.expected-state.bind-receipt 2.706ms; driver.publication 2.573ms; driver.expected-state.bind-receipt 1.173ms |
| 289771b70f08f9670000000000000f2d | 109.449 | 9.917 | 0.021 | 0.000 | 22.398 | 3.018 | 2.375 | 0.042 | n/a | 9.497 | 62.121 | n/a | n/a | 0.062 | 32.335 | 0.295 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 19.089ms; driver.publication 2.724ms; driver.expected-state.bind-receipt 2.706ms; driver.expected-state.bind-receipt 1.173ms |
| 289771b70f08f9670000000000000f52 | 108.091 | 9.504 | 0.011 | 0.000 | 80.744 | 2.484 | 2.539 | 0.052 | n/a | 0.149 | 12.557 | n/a | n/a | 0.050 | 90.260 | 0.835 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 3.767ms; driver.publication 2.953ms; driver.publication 1.579ms; driver.publication 1.193ms; driver.publication 1.126ms |
| 289771b70f08f9670000000000000f2f | 102.188 | 11.654 | 2.433 | 0.000 | 5.404 | 4.629 | 2.150 | 4.207 | n/a | 3.725 | 67.914 | n/a | n/a | 0.073 | 19.490 | 0.191 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 19.089ms; driver.publication 2.724ms; driver.expected-state.bind-receipt 2.706ms; driver.publication 2.573ms; driver.publication 1.843ms |
| 289771b70f08f9670000000000000f3c | 97.187 | 11.555 | 0.012 | 0.000 | 34.937 | 12.483 | 7.761 | 0.098 | n/a | 2.637 | 27.650 | n/a | n/a | 0.054 | 46.504 | 0.478 | 0.054 | node-14/thread-0/driver.queue.subject | driver.publication 10.098ms; driver.publication 9.714ms; driver.publication 3.030ms; driver.expected-state.bind-receipt 2.881ms; driver.publication 2.676ms |
| 289771b70f08f9670000000000000f3a | 93.594 | 22.094 | 0.014 | 0.000 | 0.504 | 16.916 | 8.467 | 0.068 | n/a | 2.410 | 42.873 | n/a | n/a | 0.248 | 22.612 | 0.242 | 0.248 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 9.714ms; driver.publication 4.608ms; driver.expected-state.bind-receipt 2.881ms; driver.publication 2.288ms; driver.expected-state.bind-receipt 1.061ms |
| 289771b70f08f9670000000000000f39 | 93.511 | 22.221 | 0.355 | 0.000 | 4.215 | 12.570 | 1.426 | 3.860 | n/a | 0.159 | 48.661 | n/a | n/a | 0.044 | 26.791 | 0.286 | 0.044 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 4.608ms; driver.expected-state.bind-receipt 2.881ms; driver.publication 2.288ms; driver.expected-state.bind-receipt 1.061ms |
| 289771b70f08f9670000000000000f4b | 92.620 | 14.899 | 0.017 | 0.000 | 17.911 | 23.822 | 10.703 | 0.153 | n/a | 5.735 | 19.246 | n/a | n/a | 0.134 | 32.827 | 0.354 | 0.134 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 4.865ms; driver.publication 2.953ms; driver.publication 1.579ms; driver.publication 1.126ms; driver.publication 1.108ms |
| 289771b70f08f9670000000000000d51 | 89.633 | 4.919 | 0.005 | 0.000 | 1.085 | 31.521 | 31.191 | 6.369 | n/a | 0.203 | 14.293 | n/a | n/a | 0.048 | 6.008 | 0.067 | 0.048 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.748ms; driver.publication 1.612ms; driver.publication 1.334ms; driver.publication 1.209ms; driver.publication 1.158ms |
| 289771b70f08f9670000000000000f2c | 86.475 | 53.428 | 0.011 | 0.000 | 0.979 | 2.308 | 6.704 | 0.050 | n/a | 0.110 | 22.786 | n/a | n/a | 0.099 | 54.419 | 0.629 | 0.099 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 2.724ms; driver.expected-state.bind-receipt 1.173ms |
| 289771b70f08f9670000000000000ee7 | 85.717 | 5.201 | 0.008 | 0.000 | 20.309 | 7.107 | 2.515 | 0.044 | n/a | 0.123 | 50.373 | n/a | n/a | 0.038 | 25.518 | 0.298 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 18.975ms |
| 289771b70f08f9670000000000000f40 | 83.945 | 12.186 | 0.010 | 0.000 | 13.126 | 13.973 | 6.764 | 0.066 | n/a | 3.052 | 34.720 | n/a | n/a | 0.047 | 25.322 | 0.302 | 0.047 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 10.098ms; driver.publication 9.714ms; driver.publication 3.660ms; driver.publication 3.030ms; driver.publication 2.288ms |
| 289771b70f08f9670000000000001430 | 78.241 | 4.889 | 0.007 | 0.000 | 0.412 | 0.799 | 1.600 | 0.041 | n/a | 0.063 | 70.377 | n/a | n/a | 0.053 | 5.308 | 0.068 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.629ms |
| 289771b70f08f9670000000000000f46 | 78.126 | 6.526 | 0.007 | 0.000 | 22.003 | 28.095 | 2.239 | 1.740 | n/a | 1.169 | 16.296 | n/a | n/a | 0.050 | 28.536 | 0.365 | 0.050 | node-14/thread-0/socket.wait-first-byte | driver.publication 10.098ms; driver.publication 4.865ms; driver.publication 3.660ms; driver.publication 3.030ms; driver.publication 2.178ms |
| 289771b70f08f9670000000000000f44 | 76.256 | 8.085 | 0.006 | 0.000 | 16.127 | 24.095 | 1.269 | 0.034 | n/a | 0.284 | 26.323 | n/a | n/a | 0.033 | 24.218 | 0.318 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 10.098ms; driver.publication 9.714ms; driver.publication 3.660ms; driver.publication 3.030ms; driver.publication 2.178ms |
| 289771b70f08f9670000000000000d72 | 75.910 | 8.229 | 0.019 | 2.681 | 0.133 | 19.795 | 8.405 | 2.727 | n/a | 0.663 | 33.238 | n/a | n/a | 0.021 | 11.062 | 0.146 | 0.021 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 3.424ms; driver.publication 1.593ms; driver.publication 1.139ms; driver.publication 1.103ms; driver.publication 1.005ms |

## P2 / tail / commit / 5-10 facts (1555 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.749 | 0.654 | 0.000 | 1.487 | 3.202 | 0.005 | 0.000 | 0.732 | 0.723 | 0.962 | 0.029 | n/a | 0.124 | 5.218 | n/a | n/a | 0.034 | 4.132 | 0.344 | 0.034 |
| p99 | 56.047 | 2.254 | 1.757 | 4.959 | 9.929 | 0.269 | 0.000 | 19.342 | 13.736 | 6.948 | 3.908 | n/a | 3.736 | 34.330 | n/a | n/a | 0.104 | 25.690 | 0.724 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 289771b70f08f9670000000000000f43 | 160.333 | 6.112 | 0.006 | 0.000 | 135.990 | 4.409 | 1.392 | 0.036 | n/a | 3.134 | 9.201 | n/a | n/a | 0.054 | 142.108 | 0.886 | 0.054 | node-14/thread-0/driver.queue.subject | driver.publication 10.098ms; driver.publication 9.714ms; driver.publication 4.865ms; driver.publication 3.660ms; driver.publication 3.030ms |
| 289771b70f08f9670000000000000f2d | 109.449 | 9.917 | 0.021 | 0.000 | 22.398 | 3.018 | 2.375 | 0.042 | n/a | 9.497 | 62.121 | n/a | n/a | 0.062 | 32.335 | 0.295 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 19.089ms; driver.publication 2.724ms; driver.expected-state.bind-receipt 2.706ms; driver.expected-state.bind-receipt 1.173ms |
| 289771b70f08f9670000000000000f2f | 102.188 | 11.654 | 2.433 | 0.000 | 5.404 | 4.629 | 2.150 | 4.207 | n/a | 3.725 | 67.914 | n/a | n/a | 0.073 | 19.490 | 0.191 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 19.089ms; driver.publication 2.724ms; driver.expected-state.bind-receipt 2.706ms; driver.publication 2.573ms; driver.publication 1.843ms |
| 289771b70f08f9670000000000000f39 | 93.511 | 22.221 | 0.355 | 0.000 | 4.215 | 12.570 | 1.426 | 3.860 | n/a | 0.159 | 48.661 | n/a | n/a | 0.044 | 26.791 | 0.286 | 0.044 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 4.608ms; driver.expected-state.bind-receipt 2.881ms; driver.publication 2.288ms; driver.expected-state.bind-receipt 1.061ms |
| 289771b70f08f9670000000000000d51 | 89.633 | 4.919 | 0.005 | 0.000 | 1.085 | 31.521 | 31.191 | 6.369 | n/a | 0.203 | 14.293 | n/a | n/a | 0.048 | 6.008 | 0.067 | 0.048 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.748ms; driver.publication 1.612ms; driver.publication 1.334ms; driver.publication 1.209ms; driver.publication 1.158ms |
| 289771b70f08f9670000000000001430 | 78.241 | 4.889 | 0.007 | 0.000 | 0.412 | 0.799 | 1.600 | 0.041 | n/a | 0.063 | 70.377 | n/a | n/a | 0.053 | 5.308 | 0.068 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.629ms |
| 289771b70f08f9670000000000000f44 | 76.256 | 8.085 | 0.006 | 0.000 | 16.127 | 24.095 | 1.269 | 0.034 | n/a | 0.284 | 26.323 | n/a | n/a | 0.033 | 24.218 | 0.318 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 10.098ms; driver.publication 9.714ms; driver.publication 3.660ms; driver.publication 3.030ms; driver.publication 2.178ms |
| 289771b70f08f9670000000000000fc3 | 70.349 | 5.128 | 0.108 | 0.000 | 10.794 | 0.474 | 1.526 | 5.269 | n/a | 0.426 | 46.604 | n/a | n/a | 0.021 | 16.029 | 0.228 | 0.021 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 2.526ms; driver.expected-state.bind-receipt 1.484ms; driver.publication 1.177ms; driver.publication 1.123ms |
| 289771b70f08f9670000000000000f2b | 68.833 | 10.561 | 0.005 | 0.000 | 0.417 | 11.625 | 14.369 | 0.048 | n/a | 0.117 | 31.601 | n/a | n/a | 0.090 | 10.983 | 0.160 | 0.090 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f96700000000000011aa | 66.614 | 2.526 | 0.004 | 0.000 | 50.670 | 0.514 | 0.836 | 0.028 | n/a | 3.828 | 8.183 | n/a | n/a | 0.024 | 53.200 | 0.799 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication 1.263ms; driver.publication 1.188ms; driver.publication 1.185ms; driver.expected-state.bind-receipt 1.145ms |
| 289771b70f08f9670000000000001b51 | 64.250 | 4.907 | 0.105 | 0.000 | 2.809 | 3.032 | 2.111 | 4.370 | n/a | 0.084 | 46.808 | n/a | n/a | 0.025 | 7.821 | 0.122 | 0.025 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 11.188ms; driver.expected-state.bind-receipt 3.101ms; driver.publication 1.535ms |
| 289771b70f08f9670000000000000f4e | 63.557 | 12.029 | 3.506 | 0.000 | 9.584 | 10.008 | 1.033 | 1.634 | n/a | 0.027 | 25.711 | n/a | n/a | 0.024 | 25.119 | 0.395 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 4.865ms; driver.publication 2.953ms; driver.publication 1.579ms; driver.publication 1.193ms; driver.publication 1.108ms |
| 289771b70f08f9670000000000000ee8 | 61.036 | 4.714 | 0.010 | 0.000 | 1.137 | 2.621 | 2.206 | 0.064 | n/a | 0.163 | 50.071 | n/a | n/a | 0.049 | 5.861 | 0.096 | 0.049 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.406ms |
| 289771b70f08f9670000000000001b50 | 60.988 | 6.751 | 0.007 | 0.000 | 0.842 | 3.951 | 1.638 | 0.056 | n/a | 2.589 | 45.102 | n/a | n/a | 0.052 | 7.601 | 0.125 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 11.188ms; driver.expected-state.bind-receipt 3.101ms |
| 289771b70f08f9670000000000000f48 | 60.201 | 5.028 | 0.013 | 0.000 | 6.169 | 24.340 | 1.179 | 0.040 | n/a | 0.941 | 22.463 | n/a | n/a | 0.026 | 11.211 | 0.186 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.865ms; driver.publication 2.953ms; driver.publication 2.178ms; driver.publication 1.579ms; driver.publication 1.214ms |
| 289771b70f08f9670000000000001808 | 56.047 | 3.237 | 0.004 | 0.000 | 16.308 | 0.544 | 1.234 | 0.031 | n/a | 3.882 | 30.762 | n/a | n/a | 0.044 | 19.549 | 0.349 | 0.044 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 289771b70f08f9670000000000001433 | 55.284 | 3.954 | 0.006 | 0.000 | 0.331 | 6.479 | 1.619 | 0.048 | n/a | 0.101 | 42.689 | n/a | n/a | 0.057 | 4.291 | 0.078 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.516ms; driver.publication 1.261ms |
| 289771b70f08f9670000000000000f32 | 55.086 | 7.376 | 0.007 | 0.000 | 0.986 | 3.099 | 6.258 | 0.177 | n/a | 2.487 | 34.628 | n/a | n/a | 0.068 | 8.369 | 0.152 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.573ms; driver.publication 1.843ms; driver.publication 1.634ms; driver.expected-state.bind-receipt 1.050ms |
| 289771b70f08f9670000000000001432 | 54.891 | 3.893 | 0.010 | 0.000 | 0.392 | 2.173 | 1.260 | 0.033 | n/a | 0.074 | 47.020 | n/a | n/a | 0.035 | 4.295 | 0.078 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.516ms |
| 289771b70f08f9670000000000000d54 | 54.684 | 3.719 | 0.006 | 0.000 | 15.035 | 10.154 | 1.260 | 0.025 | n/a | 0.232 | 24.199 | n/a | n/a | 0.055 | 18.760 | 0.343 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.334ms; driver.publication 1.131ms; driver.publication 1.108ms; driver.publication 1.082ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.451 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.217 | 200.689 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 |
| p99 | 279.071 | n/a | n/a | n/a | 27.596 | n/a | 0.000 | 0.000 | 7.689 | 274.029 | 0.188 | n/a | 0.198 | 0.000 | n/a | n/a | 39.358 | 27.596 | 0.302 | 39.358 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c8126540000000000000002 | 279.071 | 2.814 | n/a | 0.000 | 0.000 | 1.451 | 274.029 | 0.188 | n/a | 0.198 | 0.000 | n/a | n/a | 0.390 | 2.814 | 0.010 | 0.390 | gw-r/thread-48/gateway.admitted-work | none observed |
| ade9f2c6d9686f1e0000000000000007 | 203.273 | 0.000 | n/a | 0.000 | 0.000 | 1.219 | 201.556 | 0.035 | n/a | 0.128 | 0.000 | n/a | n/a | 0.334 | 0.000 | 0.000 | 0.334 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000006 | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 1.217 | 200.960 | 0.012 | n/a | 0.129 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000005 | 202.485 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 201.404 | 0.060 | n/a | 0.151 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000f11 | 201.471 | 0.000 | n/a | 0.000 | 0.000 | 0.601 | 200.689 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000f14 | 201.451 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 200.625 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000f12 | 201.439 | 0.000 | n/a | 0.000 | 0.000 | 0.560 | 200.732 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000f13 | 201.231 | 0.000 | n/a | 0.000 | 0.000 | 0.488 | 200.594 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000f17 | 91.286 | 27.596 | n/a | 0.000 | 0.000 | 7.689 | 55.795 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.199 | 27.596 | 0.302 | 0.199 | gw-r/thread-47/gateway.admitted-work | none observed |
| ade9f2c6d9686f1e0000000000000f18 | 77.540 | 15.185 | n/a | 0.000 | 0.000 | 6.297 | 55.838 | 0.007 | n/a | 0.009 | 0.000 | n/a | n/a | 0.205 | 15.185 | 0.196 | 0.205 | gw-r/thread-46/gateway.admitted-work | none observed |
| ade9f2c6d9686f1e0000000000000f19 | 62.328 | 18.647 | n/a | 0.000 | 0.000 | 4.322 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.358 | 18.647 | 0.299 | 39.358 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 797.134 | n/a | n/a | n/a | 0.174 | n/a | 0.000 | 0.000 | 0.812 | 782.646 | 0.016 | n/a | 0.179 | 0.000 | n/a | n/a | 0.263 | 0.174 | 0.000 | 0.263 |
| p99 | 1004.761 | n/a | n/a | n/a | 13.217 | n/a | 0.000 | 0.000 | 1.319 | 1001.693 | 0.022 | n/a | 0.314 | 0.000 | n/a | n/a | 1.240 | 13.217 | 0.017 | 1.240 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c81265400000000000000a4 | 1004.761 | 0.174 | n/a | 0.000 | 0.000 | 1.319 | 1001.693 | 0.022 | n/a | 0.314 | 0.000 | n/a | n/a | 1.240 | 0.174 | 0.000 | 1.240 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000000a5 | 797.134 | 13.217 | n/a | 0.000 | 0.000 | 0.812 | 782.646 | 0.016 | n/a | 0.179 | 0.000 | n/a | n/a | 0.263 | 13.217 | 0.017 | 0.263 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 457.011 | n/a | n/a | n/a | 2.871 | n/a | 0.000 | 0.000 | 0.686 | 451.668 | 0.015 | n/a | 0.091 | 0.000 | n/a | n/a | 0.107 | 2.871 | 0.007 | 0.107 |
| p99 | 1001.941 | n/a | n/a | n/a | 10.298 | n/a | 0.000 | 0.000 | 1.628 | 1000.822 | 0.597 | n/a | 0.182 | 0.000 | n/a | n/a | 22.864 | 10.298 | 0.098 | 22.864 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c81265400000000000000cf | 1001.941 | 0.221 | n/a | 0.000 | 0.000 | 0.667 | 1000.822 | 0.021 | n/a | 0.091 | 0.000 | n/a | n/a | 0.120 | 0.221 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000000bb | 995.741 | 3.345 | n/a | 0.000 | 0.000 | 0.668 | 991.526 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.130 | 3.345 | 0.003 | 0.130 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c81265400000000000000b4 | 983.737 | 2.796 | n/a | 0.000 | 0.000 | 0.686 | 980.063 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.102 | 2.796 | 0.003 | 0.102 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c81265400000000000000ae | 970.585 | 2.003 | n/a | 0.000 | 0.000 | 0.551 | 967.872 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.090 | 2.003 | 0.002 | 0.090 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000000ba | 902.677 | 5.913 | n/a | 0.000 | 0.000 | 1.456 | 894.928 | 0.012 | n/a | 0.150 | 0.000 | n/a | n/a | 0.219 | 5.913 | 0.007 | 0.219 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c81265400000000000000ab | 790.869 | 2.829 | n/a | 0.000 | 0.000 | 0.523 | 787.305 | 0.016 | n/a | 0.088 | 0.000 | n/a | n/a | 0.107 | 2.829 | 0.004 | 0.107 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c81265400000000000000a8 | 752.954 | 2.117 | n/a | 0.000 | 0.000 | 0.538 | 750.085 | 0.015 | n/a | 0.090 | 0.000 | n/a | n/a | 0.108 | 2.117 | 0.003 | 0.108 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c81265400000000000000b2 | 737.096 | 2.966 | n/a | 0.000 | 0.000 | 0.815 | 733.044 | 0.018 | n/a | 0.101 | 0.000 | n/a | n/a | 0.152 | 2.966 | 0.004 | 0.152 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c81265400000000000000c1 | 736.770 | 6.656 | n/a | 0.000 | 0.000 | 0.593 | 729.278 | 0.015 | n/a | 0.078 | 0.000 | n/a | n/a | 0.150 | 6.656 | 0.009 | 0.150 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000000c8 | 664.150 | 4.111 | n/a | 0.000 | 0.000 | 0.589 | 659.240 | 0.019 | n/a | 0.104 | 0.000 | n/a | n/a | 0.087 | 4.111 | 0.006 | 0.087 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c81265400000000000000bf | 629.850 | 2.527 | n/a | 0.000 | 0.000 | 0.615 | 626.507 | 0.026 | n/a | 0.099 | 0.000 | n/a | n/a | 0.076 | 2.527 | 0.004 | 0.076 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c81265400000000000000ca | 603.008 | 3.069 | n/a | 0.000 | 0.000 | 0.731 | 598.989 | 0.052 | n/a | 0.075 | 0.000 | n/a | n/a | 0.092 | 3.069 | 0.005 | 0.092 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c81265400000000000000c5 | 577.768 | 3.146 | n/a | 0.000 | 0.000 | 1.258 | 573.182 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.092 | 3.146 | 0.005 | 0.092 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c81265400000000000000b9 | 470.441 | 5.558 | n/a | 0.000 | 0.000 | 1.073 | 463.292 | 0.146 | n/a | 0.120 | 0.000 | n/a | n/a | 0.253 | 5.558 | 0.012 | 0.253 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c81265400000000000000a7 | 457.011 | 4.093 | n/a | 0.000 | 0.000 | 0.984 | 451.668 | 0.013 | n/a | 0.118 | 0.000 | n/a | n/a | 0.135 | 4.093 | 0.009 | 0.135 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000000b6 | 441.275 | 2.719 | n/a | 0.000 | 0.000 | 0.587 | 437.591 | 0.091 | n/a | 0.182 | 0.000 | n/a | n/a | 0.105 | 2.719 | 0.006 | 0.105 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000000c4 | 423.631 | 4.288 | n/a | 0.000 | 0.000 | 0.750 | 417.729 | 0.597 | n/a | 0.137 | 0.000 | n/a | n/a | 0.132 | 4.288 | 0.010 | 0.132 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000000c7 | 346.466 | 2.568 | n/a | 0.000 | 0.000 | 0.632 | 343.106 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.073 | 2.568 | 0.007 | 0.073 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c81265400000000000000b1 | 286.706 | 5.362 | n/a | 0.000 | 0.000 | 1.117 | 279.790 | 0.170 | n/a | 0.101 | 0.000 | n/a | n/a | 0.167 | 5.362 | 0.019 | 0.167 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c81265400000000000000cb | 273.821 | 2.043 | n/a | 0.000 | 0.000 | 0.508 | 271.085 | 0.015 | n/a | 0.068 | 0.000 | n/a | n/a | 0.102 | 2.043 | 0.007 | 0.102 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 388.516 | n/a | n/a | n/a | 5.507 | n/a | 0.722 | 0.000 | 0.790 | 381.905 | 0.016 | n/a | 0.073 | 0.000 | n/a | n/a | 0.156 | 5.691 | 0.021 | 0.156 |
| p99 | 1035.326 | n/a | n/a | n/a | 18.597 | n/a | 3.142 | 0.000 | 1.510 | 1024.404 | 2.271 | n/a | 0.219 | 0.000 | n/a | n/a | 78.012 | 20.304 | 0.602 | 78.012 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c81265400000000000000d2 | 1035.326 | 7.006 | n/a | 1.815 | 0.000 | 0.781 | 1024.404 | 1.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.215 | 8.821 | 0.009 | 0.215 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000000dd | 997.553 | 3.163 | n/a | 0.589 | 0.000 | 0.512 | 993.149 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.071 | 3.752 | 0.004 | 0.071 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000000d9 | 990.277 | 6.544 | n/a | 1.035 | 0.000 | 0.610 | 981.778 | 0.012 | n/a | 0.062 | 0.000 | n/a | n/a | 0.235 | 7.579 | 0.008 | 0.235 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c81265400000000000000de | 989.671 | 3.268 | n/a | 0.572 | 0.000 | 0.662 | 984.973 | 0.019 | n/a | 0.086 | 0.000 | n/a | n/a | 0.090 | 3.841 | 0.004 | 0.090 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c8126540000000000000104 | 986.004 | 5.954 | n/a | 0.000 | 0.000 | 0.979 | 978.669 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.325 | 5.954 | 0.006 | 0.325 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c812654000000000000010c | 985.867 | 4.120 | n/a | 0.000 | 0.000 | 1.061 | 980.538 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.084 | 4.120 | 0.004 | 0.084 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000000100 | 984.689 | 4.030 | n/a | 0.681 | 0.000 | 0.930 | 978.739 | 0.017 | n/a | 0.116 | 0.000 | n/a | n/a | 0.177 | 4.711 | 0.005 | 0.177 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c81265400000000000000d8 | 982.018 | 3.541 | n/a | 2.156 | 0.000 | 1.064 | 974.854 | 0.015 | n/a | 0.189 | 0.000 | n/a | n/a | 0.198 | 5.697 | 0.006 | 0.198 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c81265400000000000000fd | 954.116 | 7.519 | n/a | 0.000 | 0.000 | 0.956 | 945.202 | 0.247 | n/a | 0.077 | 0.000 | n/a | n/a | 0.115 | 7.519 | 0.008 | 0.115 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c81265400000000000000d1 | 909.507 | 7.813 | n/a | 1.890 | 0.000 | 1.510 | 897.913 | 0.034 | n/a | 0.082 | 0.000 | n/a | n/a | 0.266 | 9.703 | 0.011 | 0.266 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c81265400000000000000e3 | 882.638 | 3.902 | n/a | 0.648 | 0.000 | 0.734 | 877.087 | 0.031 | n/a | 0.100 | 0.000 | n/a | n/a | 0.135 | 4.550 | 0.005 | 0.135 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c81265400000000000000df | 776.169 | 3.947 | n/a | 0.846 | 0.000 | 0.588 | 770.559 | 0.019 | n/a | 0.099 | 0.000 | n/a | n/a | 0.112 | 4.793 | 0.006 | 0.112 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000101 | 748.360 | 2.854 | n/a | 0.000 | 0.000 | 0.850 | 744.486 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.086 | 2.854 | 0.004 | 0.086 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c81265400000000000000ea | 619.456 | 2.309 | n/a | 0.000 | 0.000 | 1.191 | 615.800 | 0.016 | n/a | 0.061 | 0.000 | n/a | n/a | 0.079 | 2.309 | 0.004 | 0.079 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c81265400000000000000fa | 598.113 | 17.975 | n/a | 2.329 | 0.000 | 1.475 | 575.799 | 0.030 | n/a | 0.080 | 0.000 | n/a | n/a | 0.425 | 20.304 | 0.034 | 0.425 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c81265400000000000000e7 | 594.388 | 12.497 | n/a | 1.983 | 0.000 | 0.859 | 578.775 | 0.024 | n/a | 0.089 | 0.000 | n/a | n/a | 0.162 | 14.480 | 0.024 | 0.162 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c81265400000000000000da | 531.512 | 7.554 | n/a | 0.937 | 0.000 | 1.312 | 521.477 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.175 | 8.490 | 0.016 | 0.175 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c81265400000000000000dc | 477.143 | 4.311 | n/a | 0.584 | 0.000 | 0.844 | 471.209 | 0.018 | n/a | 0.082 | 0.000 | n/a | n/a | 0.096 | 4.895 | 0.010 | 0.096 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000000d4 | 469.521 | 8.747 | n/a | 1.632 | 0.000 | 0.547 | 458.324 | 0.014 | n/a | 0.055 | 0.000 | n/a | n/a | 0.204 | 10.378 | 0.022 | 0.204 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c8126540000000000000106 | 461.768 | 14.226 | n/a | 1.806 | 0.000 | 0.902 | 444.489 | 0.015 | n/a | 0.095 | 0.000 | n/a | n/a | 0.236 | 16.031 | 0.035 | 0.236 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 459.471 | n/a | n/a | n/a | 4.094 | n/a | 0.000 | 0.000 | 0.672 | 452.796 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.118 | 4.094 | 0.010 | 0.118 |
| p99 | 1006.614 | n/a | n/a | n/a | 12.907 | n/a | 1.559 | 0.000 | 5.786 | 1001.070 | 3.442 | n/a | 0.091 | 0.000 | n/a | n/a | 43.318 | 13.622 | 0.143 | 43.318 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c8126540000000000000128 | 1006.614 | 7.124 | n/a | 0.000 | 0.000 | 1.248 | 997.863 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.277 | 7.124 | 0.007 | 0.277 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000124 | 1003.561 | 4.725 | n/a | 0.000 | 0.000 | 0.712 | 997.954 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.112 | 4.725 | 0.005 | 0.112 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c812654000000000000013e | 1003.511 | 0.251 | n/a | 0.000 | 0.000 | 0.904 | 1001.070 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 1.192 | 0.251 | 0.000 | 1.192 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c8126540000000000000135 | 1001.771 | 3.520 | n/a | 0.000 | 0.000 | 2.603 | 995.513 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.079 | 3.520 | 0.004 | 0.079 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c8126540000000000000129 | 997.713 | 4.873 | n/a | 0.000 | 0.000 | 0.814 | 991.688 | 0.170 | n/a | 0.045 | 0.000 | n/a | n/a | 0.124 | 4.873 | 0.005 | 0.124 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000113 | 988.308 | 3.441 | n/a | 0.000 | 0.000 | 0.838 | 983.865 | 0.014 | n/a | 0.060 | 0.000 | n/a | n/a | 0.089 | 3.441 | 0.003 | 0.089 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c812654000000000000011b | 974.655 | 4.094 | n/a | 0.000 | 0.000 | 0.926 | 969.479 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.090 | 4.094 | 0.004 | 0.090 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c8126540000000000000110 | 810.671 | 3.255 | n/a | 0.000 | 0.000 | 0.458 | 806.844 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.065 | 3.255 | 0.004 | 0.065 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c8126540000000000000147 | 783.136 | 3.586 | n/a | 0.000 | 0.000 | 0.626 | 778.772 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.085 | 3.586 | 0.005 | 0.085 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c812654000000000000013a | 774.116 | 2.889 | n/a | 0.000 | 0.000 | 0.581 | 770.483 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.087 | 2.889 | 0.004 | 0.087 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000130 | 752.478 | 5.336 | n/a | 0.000 | 0.000 | 0.607 | 746.280 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.177 | 5.336 | 0.007 | 0.177 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000122 | 711.704 | 3.606 | n/a | 0.000 | 0.000 | 0.667 | 707.266 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.082 | 3.606 | 0.005 | 0.082 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000125 | 708.969 | 9.142 | n/a | 0.000 | 0.000 | 0.750 | 698.784 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.204 | 9.142 | 0.013 | 0.204 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c812654000000000000011c | 690.156 | 4.691 | n/a | 0.000 | 0.000 | 1.095 | 684.150 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.123 | 4.691 | 0.007 | 0.123 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c812654000000000000012b | 680.284 | 5.744 | n/a | 0.884 | 0.000 | 0.542 | 672.959 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.120 | 6.628 | 0.010 | 0.120 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c812654000000000000010d | 639.044 | 4.838 | n/a | 0.723 | 0.000 | 0.604 | 632.670 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.132 | 5.560 | 0.009 | 0.132 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000000132 | 631.550 | 3.775 | n/a | 0.000 | 0.000 | 0.576 | 626.922 | 0.149 | n/a | 0.046 | 0.000 | n/a | n/a | 0.082 | 3.775 | 0.006 | 0.082 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000136 | 537.266 | 11.855 | n/a | 0.658 | 0.000 | 0.811 | 523.723 | 0.023 | n/a | 0.060 | 0.000 | n/a | n/a | 0.136 | 12.513 | 0.023 | 0.136 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c8126540000000000000140 | 496.043 | 4.396 | n/a | 0.000 | 0.000 | 0.818 | 490.672 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.088 | 4.396 | 0.009 | 0.088 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000137 | 464.135 | 5.066 | n/a | 0.000 | 0.000 | 0.702 | 458.226 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 0.075 | 5.066 | 0.011 | 0.075 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 364.515 | n/a | n/a | n/a | 3.334 | n/a | 0.000 | 0.000 | 0.629 | 360.978 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.132 | 3.423 | 0.010 | 0.132 |
| p99 | 1007.112 | n/a | n/a | n/a | 11.483 | n/a | 1.276 | 0.000 | 5.389 | 1001.769 | 0.484 | n/a | 0.096 | 0.000 | n/a | n/a | 23.178 | 12.759 | 0.562 | 23.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c8126540000000000000162 | 1007.112 | 4.452 | n/a | 0.000 | 0.000 | 0.632 | 1001.769 | 0.015 | n/a | 0.045 | 0.000 | n/a | n/a | 0.199 | 4.452 | 0.004 | 0.199 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c812654000000000000017c | 1003.150 | 0.174 | n/a | 0.000 | 0.000 | 0.768 | 1000.950 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 1.184 | 0.174 | 0.000 | 1.184 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000184 | 1002.643 | 0.102 | n/a | 0.000 | 0.000 | 0.560 | 1000.812 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 1.097 | 0.102 | 0.000 | 1.097 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c812654000000000000016b | 1002.618 | 0.127 | n/a | 0.000 | 0.000 | 0.542 | 1000.756 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 1.117 | 0.127 | 0.000 | 1.117 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000000171 | 996.149 | 5.409 | n/a | 0.000 | 0.000 | 3.548 | 986.900 | 0.136 | n/a | 0.055 | 0.000 | n/a | n/a | 0.100 | 5.409 | 0.005 | 0.100 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000152 | 994.781 | 7.027 | n/a | 0.000 | 0.000 | 5.389 | 981.964 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.294 | 7.027 | 0.007 | 0.294 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000183 | 985.677 | 2.925 | n/a | 0.000 | 0.000 | 3.182 | 979.318 | 0.149 | n/a | 0.042 | 0.000 | n/a | n/a | 0.061 | 2.925 | 0.003 | 0.061 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000158 | 849.665 | 8.085 | n/a | 0.000 | 0.000 | 0.832 | 840.529 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.168 | 8.085 | 0.010 | 0.168 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c8126540000000000000178 | 831.060 | 4.141 | n/a | 0.000 | 0.000 | 1.393 | 825.328 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.102 | 4.141 | 0.005 | 0.102 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000000153 | 689.098 | 4.814 | n/a | 0.000 | 0.000 | 0.562 | 683.432 | 0.015 | n/a | 0.053 | 0.000 | n/a | n/a | 0.223 | 4.814 | 0.007 | 0.223 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000182 | 680.267 | 2.824 | n/a | 0.000 | 0.000 | 0.447 | 676.840 | 0.020 | n/a | 0.060 | 0.000 | n/a | n/a | 0.075 | 2.824 | 0.004 | 0.075 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000187 | 668.046 | 2.929 | n/a | 0.774 | 0.000 | 0.664 | 663.391 | 0.079 | n/a | 0.077 | 0.000 | n/a | n/a | 0.132 | 3.704 | 0.006 | 0.132 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c812654000000000000016a | 663.377 | 3.014 | n/a | 0.000 | 0.000 | 0.532 | 659.666 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.104 | 3.014 | 0.005 | 0.104 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000000174 | 641.594 | 3.397 | n/a | 0.000 | 0.000 | 0.486 | 637.555 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.104 | 3.397 | 0.005 | 0.104 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c812654000000000000017a | 614.142 | 2.944 | n/a | 0.000 | 0.000 | 0.651 | 610.200 | 0.150 | n/a | 0.067 | 0.000 | n/a | n/a | 0.130 | 2.944 | 0.005 | 0.130 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c812654000000000000016f | 588.128 | 3.334 | n/a | 0.000 | 0.000 | 0.578 | 583.619 | 0.441 | n/a | 0.049 | 0.000 | n/a | n/a | 0.107 | 3.334 | 0.006 | 0.107 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c812654000000000000014d | 554.033 | 4.442 | n/a | 0.000 | 0.000 | 0.629 | 548.478 | 0.280 | n/a | 0.036 | 0.000 | n/a | n/a | 0.168 | 4.442 | 0.008 | 0.168 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000163 | 513.968 | 6.762 | n/a | 0.000 | 0.000 | 3.477 | 503.348 | 0.205 | n/a | 0.044 | 0.000 | n/a | n/a | 0.133 | 6.762 | 0.013 | 0.133 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000164 | 484.488 | 3.069 | n/a | 0.000 | 0.000 | 0.496 | 480.783 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.091 | 3.069 | 0.006 | 0.091 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c8126540000000000000151 | 452.757 | 6.645 | n/a | 0.000 | 0.000 | 0.958 | 444.883 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.192 | 6.645 | 0.015 | 0.192 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 316.601 | n/a | n/a | n/a | 3.542 | n/a | 0.000 | 0.000 | 0.644 | 289.302 | 0.015 | n/a | 0.040 | 0.000 | n/a | n/a | 0.116 | 3.542 | 0.013 | 0.116 |
| p99 | 1002.995 | n/a | n/a | n/a | 25.055 | n/a | 0.000 | 0.000 | 3.540 | 1000.791 | 3.281 | n/a | 0.063 | 0.000 | n/a | n/a | 50.192 | 25.055 | 0.583 | 50.192 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c81265400000000000001a5 | 1002.995 | 0.135 | n/a | 0.000 | 0.000 | 0.898 | 1000.791 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 1.112 | 0.135 | 0.000 | 1.112 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000001c2 | 1000.435 | 3.595 | n/a | 0.000 | 0.000 | 2.763 | 993.888 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.152 | 3.595 | 0.004 | 0.152 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000001c3 | 995.835 | 2.758 | n/a | 0.000 | 0.000 | 0.493 | 992.359 | 0.098 | n/a | 0.053 | 0.000 | n/a | n/a | 0.073 | 2.758 | 0.003 | 0.073 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c8126540000000000000198 | 986.333 | 1.904 | n/a | 0.000 | 0.000 | 2.882 | 980.867 | 0.542 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 1.904 | 0.002 | 0.094 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000001a4 | 984.960 | 2.988 | n/a | 0.000 | 0.000 | 0.678 | 981.109 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.135 | 2.988 | 0.003 | 0.135 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000001a2 | 976.622 | 4.058 | n/a | 0.000 | 0.000 | 0.779 | 971.395 | 0.156 | n/a | 0.055 | 0.000 | n/a | n/a | 0.179 | 4.058 | 0.004 | 0.179 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000189 | 971.726 | 3.239 | n/a | 0.000 | 0.000 | 2.393 | 965.599 | 0.276 | n/a | 0.060 | 0.000 | n/a | n/a | 0.160 | 3.239 | 0.003 | 0.160 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c81265400000000000001c0 | 827.894 | 3.809 | n/a | 0.000 | 0.000 | 0.515 | 823.447 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.080 | 3.809 | 0.005 | 0.080 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c812654000000000000019b | 825.532 | 4.155 | n/a | 0.000 | 0.000 | 0.566 | 820.667 | 0.015 | n/a | 0.061 | 0.000 | n/a | n/a | 0.068 | 4.155 | 0.005 | 0.068 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c81265400000000000001b4 | 712.012 | 3.251 | n/a | 0.000 | 0.000 | 0.874 | 707.527 | 0.234 | n/a | 0.040 | 0.000 | n/a | n/a | 0.086 | 3.251 | 0.005 | 0.086 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c81265400000000000001d3 | 705.399 | 2.212 | n/a | 0.000 | 0.000 | 2.550 | 700.506 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.083 | 2.212 | 0.003 | 0.083 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000001cc | 617.133 | 3.323 | n/a | 0.000 | 0.000 | 0.471 | 613.082 | 0.133 | n/a | 0.049 | 0.000 | n/a | n/a | 0.074 | 3.323 | 0.005 | 0.074 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c812654000000000000019e | 604.727 | 5.437 | n/a | 0.000 | 0.000 | 0.781 | 598.220 | 0.145 | n/a | 0.063 | 0.000 | n/a | n/a | 0.082 | 5.437 | 0.009 | 0.082 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c81265400000000000001b7 | 593.386 | 3.189 | n/a | 0.000 | 0.000 | 0.902 | 589.042 | 0.110 | n/a | 0.050 | 0.000 | n/a | n/a | 0.094 | 3.189 | 0.005 | 0.094 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c81265400000000000001c4 | 576.242 | 2.962 | n/a | 0.000 | 0.000 | 0.412 | 572.723 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.097 | 2.962 | 0.005 | 0.097 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000001cf | 544.996 | 5.081 | n/a | 0.000 | 0.000 | 0.777 | 538.880 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.222 | 5.081 | 0.009 | 0.222 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000001ae | 537.488 | 11.219 | n/a | 0.000 | 0.000 | 0.734 | 525.219 | 0.154 | n/a | 0.047 | 0.000 | n/a | n/a | 0.114 | 11.219 | 0.021 | 0.114 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000001a7 | 529.053 | 4.295 | n/a | 0.000 | 0.000 | 1.449 | 522.996 | 0.180 | n/a | 0.041 | 0.000 | n/a | n/a | 0.092 | 4.295 | 0.008 | 0.092 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c8126540000000000000196 | 522.982 | 5.671 | n/a | 0.000 | 0.000 | 0.564 | 516.336 | 0.155 | n/a | 0.042 | 0.000 | n/a | n/a | 0.215 | 5.671 | 0.011 | 0.215 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c81265400000000000001c5 | 408.252 | 11.454 | n/a | 0.000 | 0.000 | 0.534 | 395.886 | 0.146 | n/a | 0.043 | 0.000 | n/a | n/a | 0.188 | 11.454 | 0.028 | 0.188 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 399.530 | n/a | n/a | n/a | 2.959 | n/a | 0.000 | 0.000 | 0.558 | 392.998 | 0.010 | n/a | 0.039 | 0.000 | n/a | n/a | 0.093 | 2.959 | 0.009 | 0.093 |
| p99 | 1006.207 | n/a | n/a | n/a | 14.363 | n/a | 0.000 | 0.000 | 2.899 | 1001.739 | 1.387 | n/a | 0.078 | 0.000 | n/a | n/a | 28.192 | 14.363 | 0.419 | 28.192 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c8126540000000000000216 | 1006.207 | 3.682 | n/a | 0.000 | 0.000 | 2.899 | 999.438 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.148 | 3.682 | 0.004 | 0.148 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000215 | 1006.042 | 3.618 | n/a | 0.000 | 0.000 | 0.515 | 1001.739 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.124 | 3.618 | 0.004 | 0.124 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000001e8 | 1002.776 | 0.142 | n/a | 0.000 | 0.000 | 0.430 | 1000.935 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 1.180 | 0.142 | 0.000 | 1.180 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000001fd | 1002.528 | 4.443 | n/a | 0.000 | 0.000 | 0.635 | 997.057 | 0.253 | n/a | 0.076 | 0.000 | n/a | n/a | 0.064 | 4.443 | 0.004 | 0.064 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000000214 | 1002.058 | 3.260 | n/a | 0.000 | 0.000 | 0.399 | 998.223 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.119 | 3.260 | 0.003 | 0.119 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000210 | 989.645 | 3.254 | n/a | 0.000 | 0.000 | 1.473 | 984.666 | 0.117 | n/a | 0.053 | 0.000 | n/a | n/a | 0.081 | 3.254 | 0.003 | 0.081 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c8126540000000000000205 | 985.228 | 3.167 | n/a | 0.000 | 0.000 | 1.080 | 980.753 | 0.121 | n/a | 0.043 | 0.000 | n/a | n/a | 0.063 | 3.167 | 0.003 | 0.063 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000000211 | 977.991 | 10.491 | n/a | 0.000 | 0.000 | 0.479 | 966.867 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.116 | 10.491 | 0.011 | 0.116 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c81265400000000000001f6 | 877.369 | 2.364 | n/a | 0.000 | 0.000 | 0.503 | 874.375 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.082 | 2.364 | 0.003 | 0.082 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c81265400000000000001f3 | 750.499 | 3.370 | n/a | 0.000 | 0.000 | 0.519 | 746.325 | 0.167 | n/a | 0.047 | 0.000 | n/a | n/a | 0.072 | 3.370 | 0.004 | 0.072 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c81265400000000000001fe | 745.425 | 2.502 | n/a | 0.000 | 0.000 | 0.478 | 742.145 | 0.166 | n/a | 0.037 | 0.000 | n/a | n/a | 0.096 | 2.502 | 0.003 | 0.096 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c81265400000000000001e6 | 711.611 | 3.686 | n/a | 0.000 | 0.000 | 1.539 | 706.098 | 0.152 | n/a | 0.037 | 0.000 | n/a | n/a | 0.098 | 3.686 | 0.005 | 0.098 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c81265400000000000001db | 707.470 | 4.257 | n/a | 0.000 | 0.000 | 0.488 | 702.375 | 0.117 | n/a | 0.027 | 0.000 | n/a | n/a | 0.206 | 4.257 | 0.006 | 0.206 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c8126540000000000000201 | 691.564 | 2.222 | n/a | 0.000 | 0.000 | 0.558 | 688.506 | 0.148 | n/a | 0.054 | 0.000 | n/a | n/a | 0.076 | 2.222 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000001ef | 670.201 | 2.184 | n/a | 0.000 | 0.000 | 0.621 | 667.295 | 0.009 | n/a | 0.025 | 0.000 | n/a | n/a | 0.066 | 2.184 | 0.003 | 0.066 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c812654000000000000020e | 548.107 | 2.567 | n/a | 0.000 | 0.000 | 0.452 | 544.980 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.063 | 2.567 | 0.005 | 0.063 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c81265400000000000001d8 | 538.843 | 2.287 | n/a | 0.000 | 0.000 | 0.784 | 535.665 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.061 | 2.287 | 0.004 | 0.061 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c81265400000000000001ed | 523.463 | 2.502 | n/a | 0.000 | 0.000 | 0.626 | 520.052 | 0.163 | n/a | 0.041 | 0.000 | n/a | n/a | 0.078 | 2.502 | 0.005 | 0.078 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c81265400000000000001df | 478.470 | 5.925 | n/a | 0.000 | 0.000 | 0.857 | 471.307 | 0.266 | n/a | 0.039 | 0.000 | n/a | n/a | 0.077 | 5.925 | 0.012 | 0.077 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c81265400000000000001f8 | 476.963 | 2.260 | n/a | 0.000 | 0.000 | 0.426 | 474.149 | 0.010 | n/a | 0.032 | 0.000 | n/a | n/a | 0.087 | 2.260 | 0.005 | 0.087 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / internal (753 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.077 | n/a | n/a | n/a | 3.683 | n/a | 0.000 | 0.000 | 0.263 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.492 | 3.699 | 0.282 | 7.492 |
| p99 | 173.518 | n/a | n/a | n/a | 14.933 | n/a | 1.210 | 0.000 | 1.394 | 169.445 | 0.123 | n/a | 0.056 | 0.000 | n/a | n/a | 47.351 | 15.602 | 0.836 | 47.351 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c8126540000000000000222 | 992.071 | 4.261 | n/a | 0.000 | 0.000 | 2.855 | 984.697 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.218 | 4.261 | 0.004 | 0.218 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c8126540000000000000217 | 803.713 | 2.001 | n/a | 0.000 | 0.000 | 0.620 | 800.937 | 0.009 | n/a | 0.078 | 0.000 | n/a | n/a | 0.068 | 2.001 | 0.002 | 0.068 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000223 | 777.613 | 2.576 | n/a | 0.000 | 0.000 | 0.639 | 774.265 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.088 | 2.576 | 0.003 | 0.088 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c812654000000000000021a | 668.355 | 2.417 | n/a | 0.000 | 0.000 | 0.622 | 665.208 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 2.417 | 0.004 | 0.062 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c812654000000000000021f | 665.652 | 1.905 | n/a | 0.000 | 0.000 | 0.621 | 663.003 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.073 | 1.905 | 0.003 | 0.073 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000000220 | 331.479 | 3.748 | n/a | 0.000 | 0.000 | 0.611 | 326.880 | 0.120 | n/a | 0.038 | 0.000 | n/a | n/a | 0.083 | 3.748 | 0.011 | 0.083 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c812654000000000000021b | 254.632 | 3.261 | n/a | 0.000 | 0.000 | 0.382 | 250.681 | 0.115 | n/a | 0.064 | 0.000 | n/a | n/a | 0.129 | 3.261 | 0.013 | 0.129 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000000218 | 173.518 | 3.152 | n/a | 0.000 | 0.000 | 0.646 | 169.445 | 0.126 | n/a | 0.054 | 0.000 | n/a | n/a | 0.095 | 3.152 | 0.018 | 0.095 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c812654000000000000021d | 118.463 | 2.952 | n/a | 0.000 | 0.000 | 0.887 | 114.338 | 0.125 | n/a | 0.044 | 0.000 | n/a | n/a | 0.116 | 2.952 | 0.025 | 0.116 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c812654000000000000081a | 108.708 | 4.482 | n/a | 0.000 | 0.000 | 0.584 | 103.300 | 0.124 | n/a | 0.040 | 0.000 | n/a | n/a | 0.178 | 4.482 | 0.041 | 0.178 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000004e5 | 108.500 | 5.790 | n/a | 1.112 | 0.000 | 0.672 | 100.744 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.143 | 6.902 | 0.064 | 0.143 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c81265400000000000002ee | 104.604 | 12.588 | n/a | 1.205 | 0.000 | 1.714 | 88.440 | 0.336 | n/a | 0.053 | 0.000 | n/a | n/a | 0.268 | 13.792 | 0.132 | 0.268 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c8126540000000000000307 | 103.077 | 3.349 | n/a | 0.000 | 0.000 | 1.623 | 97.972 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.078 | 3.349 | 0.032 | 0.078 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c812654000000000000065f | 92.401 | 14.933 | n/a | 0.000 | 0.000 | 0.593 | 76.505 | 0.123 | n/a | 0.017 | 0.000 | n/a | n/a | 0.231 | 14.933 | 0.162 | 0.231 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000000796 | 89.896 | 2.226 | n/a | 0.000 | 0.000 | 0.433 | 87.107 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.098 | 2.226 | 0.025 | 0.098 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c81265400000000000005e5 | 89.482 | 6.349 | n/a | 0.000 | 0.000 | 0.476 | 82.459 | 0.106 | n/a | 0.015 | 0.000 | n/a | n/a | 0.078 | 6.349 | 0.071 | 0.078 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c8126540000000000000750 | 86.539 | 2.764 | n/a | 0.000 | 0.000 | 0.533 | 83.038 | 0.061 | n/a | 0.065 | 0.000 | n/a | n/a | 0.078 | 2.764 | 0.032 | 0.078 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000004ee | 80.103 | 2.482 | n/a | 0.000 | 0.000 | 0.572 | 76.898 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.103 | 2.482 | 0.031 | 0.103 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c81265400000000000007fe | 78.715 | 15.497 | n/a | 0.000 | 0.000 | 1.058 | 61.869 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.249 | 15.497 | 0.197 | 0.249 | gw-r/thread-49/journal/page | none observed |
| eecf0d400c8126540000000000000782 | 77.136 | 8.616 | n/a | 0.000 | 0.000 | 0.395 | 67.789 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.286 | 8.616 | 0.112 | 0.286 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / internal (2257 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.975 | n/a | n/a | n/a | 4.351 | n/a | 0.000 | 0.000 | 0.251 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.078 | 4.390 | 0.358 | 6.078 |
| p99 | 346.003 | n/a | n/a | n/a | 18.806 | n/a | 2.039 | 0.000 | 0.965 | 342.824 | 0.108 | n/a | 0.037 | 0.000 | n/a | n/a | 46.414 | 18.949 | 0.856 | 46.414 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eecf0d400c8126540000000000001a8d | 1002.584 | 0.088 | n/a | 0.000 | 0.000 | 0.337 | 1001.008 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 1.089 | 0.088 | 0.000 | 1.089 | gw-r/thread-66/journal/page | none observed |
| eecf0d400c8126540000000000001a73 | 1002.268 | 0.110 | n/a | 0.000 | 0.000 | 0.389 | 1000.550 | 0.010 | n/a | 0.039 | 0.000 | n/a | n/a | 1.170 | 0.110 | 0.000 | 1.170 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000001a69 | 1002.199 | 0.114 | n/a | 0.000 | 0.000 | 0.426 | 1000.477 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 1.141 | 0.114 | 0.000 | 1.141 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000001ab7 | 1002.091 | 0.106 | n/a | 0.000 | 0.000 | 0.356 | 1000.504 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 1.085 | 0.106 | 0.000 | 1.085 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c8126540000000000001aaf | 1001.684 | 4.285 | n/a | 0.000 | 0.000 | 0.600 | 996.689 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.076 | 4.285 | 0.004 | 0.076 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000001ab3 | 994.021 | 3.330 | n/a | 0.000 | 0.000 | 0.541 | 989.961 | 0.108 | n/a | 0.032 | 0.000 | n/a | n/a | 0.049 | 3.330 | 0.003 | 0.049 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000001a68 | 984.629 | 4.697 | n/a | 0.000 | 0.000 | 0.508 | 979.283 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.113 | 4.697 | 0.005 | 0.113 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000001a7e | 904.377 | 4.963 | n/a | 0.000 | 0.000 | 0.496 | 898.718 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.156 | 4.963 | 0.005 | 0.156 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c8126540000000000001a6e | 878.823 | 3.001 | n/a | 0.000 | 0.000 | 0.434 | 875.281 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.083 | 3.001 | 0.003 | 0.083 | gw-r/thread-50/journal/page | none observed |
| eecf0d400c8126540000000000001a90 | 841.634 | 4.669 | n/a | 0.000 | 0.000 | 0.514 | 836.267 | 0.064 | n/a | 0.029 | 0.000 | n/a | n/a | 0.091 | 4.669 | 0.006 | 0.091 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c8126540000000000001a6b | 759.311 | 10.515 | n/a | 0.951 | 0.000 | 1.132 | 746.000 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.675 | 11.467 | 0.015 | 0.675 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000001ab0 | 707.554 | 3.143 | n/a | 0.000 | 0.000 | 0.358 | 703.967 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.065 | 3.143 | 0.004 | 0.065 | gw-r/thread-48/journal/page | none observed |
| eecf0d400c8126540000000000001a89 | 706.269 | 2.041 | n/a | 0.000 | 0.000 | 0.463 | 703.627 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.081 | 2.041 | 0.003 | 0.081 | gw-r/thread-66/journal/page | none observed |
| eecf0d400c8126540000000000001a84 | 690.826 | 5.012 | n/a | 0.000 | 0.000 | 0.518 | 685.089 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.175 | 5.012 | 0.007 | 0.175 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000001aa8 | 589.053 | 2.616 | n/a | 0.000 | 0.000 | 0.437 | 585.599 | 0.289 | n/a | 0.046 | 0.000 | n/a | n/a | 0.065 | 2.616 | 0.004 | 0.065 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c8126540000000000001a75 | 531.303 | 1.673 | n/a | 0.000 | 0.000 | 0.470 | 529.019 | 0.063 | n/a | 0.019 | 0.000 | n/a | n/a | 0.060 | 1.673 | 0.003 | 0.060 | gw-r/thread-43/journal/page | none observed |
| eecf0d400c8126540000000000001aaa | 525.349 | 2.476 | n/a | 0.000 | 0.000 | 0.443 | 522.344 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.054 | 2.476 | 0.005 | 0.054 | gw-r/thread-45/journal/page | none observed |
| eecf0d400c8126540000000000001a92 | 506.851 | 8.204 | n/a | 0.000 | 0.000 | 0.564 | 497.716 | 0.092 | n/a | 0.021 | 0.000 | n/a | n/a | 0.254 | 8.204 | 0.016 | 0.254 | gw-r/thread-46/journal/page | none observed |
| eecf0d400c8126540000000000001a9e | 501.679 | 2.460 | n/a | 0.000 | 0.000 | 0.631 | 498.391 | 0.100 | n/a | 0.041 | 0.000 | n/a | n/a | 0.056 | 2.460 | 0.005 | 0.056 | gw-r/thread-47/journal/page | none observed |
| eecf0d400c8126540000000000001aab | 452.991 | 2.410 | n/a | 0.000 | 0.000 | 0.396 | 450.004 | 0.083 | n/a | 0.040 | 0.000 | n/a | n/a | 0.060 | 2.410 | 0.005 | 0.060 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.947 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.892 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 |
| p99 | 203.816 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.055 | 203.013 | 0.672 | n/a | 0.286 | 0.000 | n/a | n/a | 0.449 | 0.000 | 0.000 | 0.449 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ade9f2c6d9686f1e0000000000000018 | 203.816 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 203.013 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000009 | 203.776 | 0.000 | n/a | 0.000 | 0.000 | 1.796 | 201.335 | 0.014 | n/a | 0.182 | 0.000 | n/a | n/a | 0.449 | 0.000 | 0.000 | 0.449 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e000000000000004a | 203.696 | 0.000 | n/a | 0.000 | 0.000 | 1.202 | 201.992 | 0.037 | n/a | 0.286 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000008 | 203.687 | 0.000 | n/a | 0.000 | 0.000 | 1.544 | 201.774 | 0.017 | n/a | 0.189 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e000000000000001b | 203.532 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 202.327 | 0.012 | n/a | 0.128 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000033 | 203.517 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 202.227 | 0.028 | n/a | 0.202 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000000c | 203.509 | 0.000 | n/a | 0.000 | 0.000 | 1.835 | 201.052 | 0.034 | n/a | 0.270 | 0.000 | n/a | n/a | 0.317 | 0.000 | 0.000 | 0.317 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000031 | 203.353 | 0.000 | n/a | 0.000 | 0.000 | 2.055 | 200.939 | 0.017 | n/a | 0.137 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000032 | 203.283 | 0.000 | n/a | 0.000 | 0.000 | 1.845 | 201.079 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000049 | 203.107 | 0.000 | n/a | 0.000 | 0.000 | 1.255 | 201.472 | 0.020 | n/a | 0.159 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e000000000000002f | 203.056 | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 201.635 | 0.055 | n/a | 0.195 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000022 | 202.939 | 0.000 | n/a | 0.000 | 0.000 | 1.093 | 201.420 | 0.016 | n/a | 0.170 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000034 | 202.777 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 201.458 | 0.011 | n/a | 0.144 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e000000000000001a | 202.730 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 201.399 | 0.019 | n/a | 0.187 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000002b | 202.509 | 0.000 | n/a | 0.000 | 0.000 | 1.047 | 201.104 | 0.013 | n/a | 0.133 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000023 | 202.493 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.279 | 0.012 | n/a | 0.130 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000043 | 202.481 | 0.000 | n/a | 0.000 | 0.000 | 1.041 | 201.085 | 0.014 | n/a | 0.123 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e000000000000001c | 202.445 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 201.201 | 0.023 | n/a | 0.258 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000028 | 202.429 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.375 | 0.019 | n/a | 0.166 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000015 | 202.404 | 0.000 | n/a | 0.000 | 0.000 | 1.263 | 200.830 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.862 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 200.860 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 220.769 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 19.183 | 203.752 | 8.598 | n/a | 0.310 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ade9f2c6d9686f1e0000000000000067 | 220.769 | 0.000 | n/a | 0.000 | 0.000 | 19.183 | 201.289 | 0.030 | n/a | 0.139 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000077 | 204.766 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 203.752 | 0.023 | n/a | 0.146 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000091 | 203.327 | 0.000 | n/a | 0.000 | 0.000 | 1.620 | 201.391 | 0.025 | n/a | 0.143 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000074 | 203.300 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 202.034 | 0.102 | n/a | 0.140 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000a9 | 203.286 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.809 | 0.116 | n/a | 0.310 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000ab | 202.776 | 0.000 | n/a | 0.000 | 0.000 | 1.319 | 201.107 | 0.010 | n/a | 0.143 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e000000000000005e | 202.763 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 201.426 | 0.017 | n/a | 0.161 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000084 | 202.657 | 0.000 | n/a | 0.000 | 0.000 | 1.201 | 200.980 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000c5 | 202.564 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 201.198 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000075 | 202.530 | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 201.272 | 0.022 | n/a | 0.133 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000c0 | 202.487 | 0.000 | n/a | 0.000 | 0.000 | 1.285 | 200.889 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000c4 | 202.475 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.440 | 0.011 | n/a | 0.144 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000b7 | 202.459 | 0.000 | n/a | 0.000 | 0.000 | 0.963 | 201.211 | 0.010 | n/a | 0.147 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000006d | 202.381 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 201.216 | 0.023 | n/a | 0.136 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e000000000000006f | 202.380 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.121 | 0.019 | n/a | 0.115 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000070 | 202.307 | 0.000 | n/a | 0.000 | 0.000 | 0.968 | 201.035 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e000000000000009d | 202.294 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.171 | 0.021 | n/a | 0.133 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000072 | 202.248 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 201.321 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000060 | 202.199 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 200.864 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000093 | 202.192 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 201.155 | 0.019 | n/a | 0.124 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.813 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 200.855 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 205.411 | n/a | n/a | n/a | 0.962 | n/a | 0.000 | 0.000 | 2.719 | 202.407 | 19.028 | n/a | 0.170 | 0.000 | n/a | n/a | 0.554 | 0.962 | 0.005 | 0.554 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ade9f2c6d9686f1e00000000000000d6 | 205.411 | 0.000 | n/a | 0.000 | 0.000 | 2.719 | 202.407 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000d8 | 203.505 | 0.962 | n/a | 0.000 | 0.000 | 0.669 | 201.321 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.452 | 0.962 | 0.005 | 0.452 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000114 | 203.377 | 0.000 | n/a | 0.000 | 0.000 | 1.527 | 201.418 | 0.014 | n/a | 0.170 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000011f | 202.948 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 201.956 | 0.021 | n/a | 0.108 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000105 | 202.770 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 201.547 | 0.007 | n/a | 0.107 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000dc | 202.649 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 201.330 | 0.008 | n/a | 0.091 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000e1 | 202.536 | 0.000 | n/a | 0.000 | 0.000 | 1.024 | 201.243 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000c8 | 202.463 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 201.206 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000120 | 202.373 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 201.293 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000de | 202.347 | 0.000 | n/a | 0.000 | 0.000 | 1.142 | 200.855 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000f2 | 202.331 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 201.300 | 0.016 | n/a | 0.105 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000f7 | 202.318 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 201.160 | 0.023 | n/a | 0.143 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000e4 | 202.293 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 201.041 | 0.007 | n/a | 0.125 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000119 | 202.228 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 201.303 | 0.013 | n/a | 0.131 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000118 | 202.204 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 201.184 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000e8 | 202.194 | 0.000 | n/a | 0.000 | 0.000 | 0.849 | 201.091 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000f5 | 202.149 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 200.964 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000100 | 202.147 | 0.000 | n/a | 0.000 | 0.000 | 1.128 | 200.812 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000df | 202.130 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 201.277 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e00000000000000cc | 202.123 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 201.018 | 0.007 | n/a | 0.107 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-50/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.721 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 200.870 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 207.337 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.504 | 205.619 | 3.686 | n/a | 0.134 | 0.000 | n/a | n/a | 0.488 | 0.000 | 0.000 | 0.488 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ade9f2c6d9686f1e0000000000000140 | 207.337 | 0.000 | n/a | 0.000 | 0.000 | 1.368 | 205.619 | 0.025 | n/a | 0.082 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e000000000000013d | 204.006 | 0.000 | n/a | 0.000 | 0.000 | 2.504 | 201.288 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000013e | 203.936 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 202.723 | 0.036 | n/a | 0.097 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e000000000000016a | 203.061 | 0.000 | n/a | 0.000 | 0.000 | 1.285 | 201.419 | 0.012 | n/a | 0.125 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000132 | 202.627 | 0.000 | n/a | 0.000 | 0.000 | 0.950 | 201.354 | 0.048 | n/a | 0.107 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000195 | 202.576 | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 201.272 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e000000000000015b | 202.559 | 0.000 | n/a | 0.000 | 0.000 | 1.019 | 201.207 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e000000000000018d | 202.556 | 0.000 | n/a | 0.000 | 0.000 | 1.069 | 201.259 | 0.018 | n/a | 0.080 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000178 | 202.522 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 201.498 | 0.013 | n/a | 0.126 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000139 | 202.481 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 201.258 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000144 | 202.468 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 201.436 | 0.021 | n/a | 0.087 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000148 | 202.446 | 0.000 | n/a | 0.000 | 0.000 | 1.004 | 201.135 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000181 | 202.392 | 0.000 | n/a | 0.000 | 0.000 | 1.095 | 201.005 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e000000000000012e | 202.369 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 201.075 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e000000000000018e | 202.344 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 201.265 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000191 | 202.343 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.111 | 0.007 | n/a | 0.091 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e000000000000016d | 202.275 | 0.000 | n/a | 0.000 | 0.000 | 0.605 | 201.423 | 0.012 | n/a | 0.119 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000142 | 202.263 | 0.000 | n/a | 0.000 | 0.000 | 0.528 | 201.522 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000158 | 202.224 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 201.243 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000155 | 202.215 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 200.977 | 0.013 | n/a | 0.118 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-43/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.550 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 200.760 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 202.926 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.254 | 201.608 | 1.346 | n/a | 0.114 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ade9f2c6d9686f1e00000000000001e7 | 203.349 | 0.000 | n/a | 0.000 | 0.000 | 2.176 | 200.951 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001be | 202.926 | 0.000 | n/a | 0.000 | 0.000 | 1.191 | 201.299 | 0.021 | n/a | 0.086 | 0.000 | n/a | n/a | 0.329 | 0.000 | 0.000 | 0.329 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000199 | 202.848 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 201.771 | 0.021 | n/a | 0.072 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001c2 | 202.611 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 201.608 | 0.013 | n/a | 0.114 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001fe | 202.570 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 201.530 | 0.014 | n/a | 0.091 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001df | 202.547 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 201.301 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001bd | 202.473 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 201.167 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001b1 | 202.372 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.076 | 0.016 | n/a | 0.090 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001d1 | 202.365 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 201.296 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001c5 | 202.354 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 201.493 | 0.012 | n/a | 0.114 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001a8 | 202.329 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 201.044 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001f5 | 202.288 | 0.000 | n/a | 0.000 | 0.000 | 1.254 | 200.862 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000208 | 202.258 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 201.253 | 0.021 | n/a | 0.087 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e000000000000019a | 202.253 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.272 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001f2 | 202.202 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 201.306 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001b2 | 202.125 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 201.045 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001bc | 202.119 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.053 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001c7 | 202.114 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 201.177 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001d7 | 202.102 | 0.000 | n/a | 0.000 | 0.000 | 1.114 | 200.730 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e00000000000001e6 | 202.092 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 201.145 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.614 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 200.767 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 202.813 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.176 | 201.566 | 3.708 | n/a | 0.096 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ade9f2c6d9686f1e000000000000021d | 204.128 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 202.814 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e000000000000023f | 202.813 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 200.862 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 1.197 | 0.000 | 0.000 | 1.197 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000022e | 202.597 | 0.581 | n/a | 0.000 | 0.000 | 0.961 | 200.848 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.135 | 0.581 | 0.003 | 0.135 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000265 | 202.514 | 0.000 | n/a | 0.000 | 0.000 | 0.962 | 201.202 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000022b | 202.511 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 201.566 | 0.035 | n/a | 0.085 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000025e | 202.393 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.117 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e000000000000026a | 202.290 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 201.102 | 0.007 | n/a | 0.092 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000214 | 202.260 | 0.000 | n/a | 0.000 | 0.000 | 1.346 | 200.688 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000245 | 202.238 | 0.000 | n/a | 0.000 | 0.000 | 1.010 | 200.938 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000024f | 202.182 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 201.363 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e000000000000025c | 202.143 | 0.000 | n/a | 0.000 | 0.000 | 1.176 | 200.669 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000266 | 202.137 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 201.097 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e000000000000024e | 202.099 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 200.913 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000269 | 202.089 | 0.000 | n/a | 0.000 | 0.000 | 0.581 | 201.290 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000238 | 202.079 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 201.135 | 0.018 | n/a | 0.081 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000223 | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 201.072 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000255 | 202.064 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 200.842 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000278 | 202.051 | 0.000 | n/a | 0.000 | 0.000 | 0.679 | 201.111 | 0.017 | n/a | 0.110 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000227 | 202.050 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 200.931 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000242 | 202.028 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.954 | 0.021 | n/a | 0.074 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / read (65 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.403 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 71.429 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 203.849 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.082 | 203.110 | 2.943 | n/a | 0.105 | 0.000 | n/a | n/a | 0.291 | 0.000 | 0.000 | 0.291 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ade9f2c6d9686f1e0000000000000294 | 203.849 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 203.110 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000282 | 202.242 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 201.177 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000297 | 202.149 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 201.133 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000290 | 201.997 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 200.865 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000288 | 201.996 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 200.925 | 0.018 | n/a | 0.095 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000029a | 201.980 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 200.824 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000295 | 201.953 | 0.000 | n/a | 0.000 | 0.000 | 0.675 | 201.057 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000296 | 201.920 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 200.967 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000283 | 201.807 | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 200.913 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000299 | 201.791 | 0.000 | n/a | 0.000 | 0.000 | 0.541 | 201.053 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e000000000000028b | 201.785 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.829 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e000000000000029b | 201.744 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 200.762 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000284 | 201.685 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 200.690 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e000000000000028f | 201.564 | 0.000 | n/a | 0.000 | 0.000 | 0.651 | 200.754 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e000000000000028e | 201.543 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 200.597 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000287 | 201.509 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 200.777 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000289 | 201.505 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.664 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000292 | 201.470 | 0.000 | n/a | 0.000 | 0.000 | 0.409 | 200.874 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000286 | 165.701 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 164.494 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000285 | 138.855 | 0.000 | n/a | 0.000 | 0.000 | 0.440 | 138.266 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (218 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.318 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 85.379 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 202.033 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.423 | 200.949 | 1.173 | n/a | 0.077 | 0.000 | n/a | n/a | 49.863 | 0.000 | 0.000 | 49.863 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ade9f2c6d9686f1e0000000000000ea9 | 202.134 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 201.123 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000f02 | 202.106 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.966 | 0.006 | n/a | 0.092 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-46/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000ec5 | 202.033 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 200.812 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000ee4 | 201.992 | 0.000 | n/a | 0.000 | 0.000 | 1.423 | 200.441 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-66/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000e96 | 201.960 | 0.000 | n/a | 0.000 | 0.000 | 0.967 | 200.767 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000ea1 | 201.919 | 0.000 | n/a | 0.000 | 0.000 | 0.746 | 200.949 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000eaa | 201.692 | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 200.741 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-66/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000e9a | 201.684 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 200.899 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000ea5 | 201.667 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 200.753 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000ef6 | 201.606 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 200.644 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000f10 | 201.604 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 200.860 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000eb0 | 201.604 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 200.695 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-43/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000ef8 | 201.595 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 200.644 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000f08 | 201.568 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 200.865 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000ed1 | 201.560 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 200.424 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-45/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000ee9 | 201.543 | 0.000 | n/a | 0.000 | 0.000 | 0.503 | 200.873 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000ec7 | 201.537 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 200.830 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000f0a | 201.523 | 0.000 | n/a | 0.000 | 0.000 | 0.445 | 200.765 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-50/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000eed | 201.427 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 200.717 | 0.017 | n/a | 0.051 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| ade9f2c6d9686f1e0000000000000efd | 201.422 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.712 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-43/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

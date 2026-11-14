# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (294.487 ms, trace `30448786e426464f00000000000000da`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (144.172 ms, trace `30448786e426464f0000000000000085`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (87.554 ms, trace `30448786e426464f0000000000000058`); `node-14/thread-0/driver.queue.subject` (71.468 ms, trace `30448786e426464f000000000000035a`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (77.481 ms, trace `30448786e426464f0000000000000128`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p7-journal-smoke-b`; source `f9e1c640004e77b4bb9b043bb80d4b37e6df84de`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8644454.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 206 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 14393.770 | 1535.775 | 28.727 | 451 |
| L1 | 1 | 19969.426 | 1088.166 | 30.819 | 666 |
| L4 | 4 | 19940.072 | 2024.008 | 35.569 | 626 |
| L16 | 16 | 19975.174 | 1666.187 | 41.947 | 686 |
| tail | 0 | 124592.218 | 12464.514 | 137.945 | 71347 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 30448786e426464f00000000000000da | driver.queue.scheduler-dispatch | 0.066 | none | 0 / 32 |
| 30448786e426464f00000000000000da | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 30448786e426464f00000000000000da waited: []

| 30448786e426464f0000000000000085 | driver.queue.scheduler-dispatch | 0.082 | none | 0 / 32 |
| 30448786e426464f0000000000000085 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 30448786e426464f0000000000000085 waited: []

| 30448786e426464f0000000000000058 | driver.queue.scheduler-late | 0.634 | none | 0 / 32 |
| 30448786e426464f0000000000000058 | driver.queue.scheduler-dispatch | 0.043 | none | 0 / 32 |

Observed active steps while trace 30448786e426464f0000000000000058 waited: []

| 30448786e426464f000000000000035a | driver.queue.subject | 71.468 | 30448786e426464f0000000000000359 | 3 / 32 |
| 30448786e426464f000000000000035a | driver.queue.scheduler-late | 0.235 | none | 3 / 32 |
| 30448786e426464f000000000000035a | driver.queue.scheduler-dispatch | 0.067 | none | 1 / 32 |

Observed active steps while trace 30448786e426464f000000000000035a waited: [{"at":1794688804328.351,"inFlight":2,"capacity":32,"active":[{"traceId":"30448786e426464f0000000000000358","step":"client.http"},{"traceId":"30448786e426464f000000000000035e","step":"client.http"}]},{"at":1794688804348.7517,"inFlight":3,"capacity":32,"active":[{"traceId":"30448786e426464f0000000000000358","step":"client.http"},{"traceId":"30448786e426464f000000000000035e","step":"client.http"},{"traceId":"30448786e426464f0000000000000360","step":"client.http"}]},{"at":1794688804368.6536,"inFlight":2,"capacity":32,"active":[{"traceId":"30448786e426464f000000000000035f","step":"client.http"},{"traceId":"30448786e426464f0000000000000359","step":"client.http"}]}]

| 30448786e426464f0000000000000128 | driver.queue.scheduler-late | 0.523 | none | 0 / 32 |
| 30448786e426464f0000000000000128 | driver.queue.scheduler-dispatch | 0.069 | none | 0 / 32 |

Observed active steps while trace 30448786e426464f0000000000000128 waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.608 | 0.000 | 0.000 | 0.407 | 4.391 | 1.498 | 0.000 | 0.127 | 1.593 | 5.189 | 0.041 | n/a | 0.464 | 10.366 | n/a | n/a | 0.029 | 4.814 | 0.184 | 0.029 |
| p99 | 95.833 | 2.100 | 0.000 | 1.737 | 20.819 | n/a | 2.026 | 1.252 | 9.720 | 15.145 | 0.160 | n/a | 3.530 | 87.554 | n/a | n/a | 0.131 | 21.281 | 0.470 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f0000000000000058 | 95.833 | 2.186 | n/a | 0.000 | 0.677 | 0.858 | 3.875 | 0.025 | n/a | 0.636 | 87.554 | n/a | n/a | 0.021 | 2.863 | 0.030 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.082ms |
| 30448786e426464f000000000000003b | 53.535 | 20.819 | 0.389 | 0.000 | 0.073 | 2.932 | 9.778 | 0.160 | n/a | 0.614 | 18.747 | n/a | n/a | 0.023 | 21.281 | 0.398 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000038 | 44.433 | 7.028 | n/a | 0.000 | 0.768 | 1.593 | 15.145 | 0.055 | n/a | 3.530 | 16.183 | n/a | n/a | 0.131 | 7.797 | 0.175 | 0.131 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000004b | 39.476 | 8.955 | 0.178 | 0.000 | 0.127 | 8.197 | 9.853 | 0.050 | n/a | 0.193 | 11.885 | n/a | n/a | 0.039 | 9.260 | 0.235 | 0.039 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000069 | 36.601 | 16.735 | 0.168 | 0.246 | 0.060 | 2.616 | 6.578 | 0.064 | n/a | 0.176 | 9.936 | n/a | n/a | 0.022 | 17.209 | 0.470 | 0.022 | node-14/thread-8/client.settle-and-cache | none observed |
| 30448786e426464f0000000000000065 | 35.710 | 4.017 | 0.169 | 0.302 | 0.091 | 9.720 | 10.064 | 0.084 | n/a | 0.953 | 10.274 | n/a | n/a | 0.035 | 4.580 | 0.128 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000043 | 35.359 | 5.930 | 0.183 | 0.000 | 0.114 | 5.495 | 12.145 | 0.061 | n/a | 0.550 | 10.841 | n/a | n/a | 0.041 | 6.227 | 0.176 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000003f | 33.854 | 6.833 | 0.232 | 0.000 | 0.116 | 4.256 | 6.973 | 0.064 | n/a | 0.181 | 15.146 | n/a | n/a | 0.054 | 7.180 | 0.212 | 0.054 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000071 | 33.520 | 5.767 | 1.498 | 2.026 | 0.107 | 4.877 | 9.974 | 0.050 | n/a | 0.151 | 9.032 | n/a | n/a | 0.039 | 9.397 | 0.280 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000005d | 31.450 | 10.439 | 0.206 | 0.421 | 0.086 | 2.197 | 3.000 | 0.056 | n/a | 0.639 | 14.374 | n/a | n/a | 0.031 | 11.152 | 0.355 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000061 | 31.030 | 5.113 | 0.217 | 0.294 | 0.090 | 2.204 | 11.896 | 0.096 | n/a | 0.202 | 10.884 | n/a | n/a | 0.033 | 5.714 | 0.184 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000053 | 30.768 | 9.400 | 0.214 | 0.000 | 0.063 | 7.105 | 5.915 | 0.060 | n/a | 0.911 | 7.082 | n/a | n/a | 0.019 | 9.676 | 0.314 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000057 | 29.920 | 4.391 | 0.112 | 0.263 | 0.048 | 1.957 | 7.997 | 0.068 | n/a | 0.183 | 14.884 | n/a | n/a | 0.017 | 4.814 | 0.161 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000048 | 28.592 | 5.099 | n/a | 0.000 | 0.173 | 0.912 | 2.992 | 0.025 | n/a | 1.982 | 17.361 | n/a | n/a | 0.049 | 5.272 | 0.184 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| 30448786e426464f000000000000004e | 27.608 | 3.087 | n/a | 0.000 | 0.864 | 0.735 | 3.168 | 0.024 | n/a | 0.127 | 19.580 | n/a | n/a | 0.022 | 3.951 | 0.143 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000003d | 25.267 | 2.449 | n/a | 0.000 | 0.859 | 1.007 | 4.531 | 0.027 | n/a | 0.187 | 16.178 | n/a | n/a | 0.029 | 3.308 | 0.131 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 30448786e426464f0000000000000045 | 24.565 | 5.836 | 0.209 | 0.000 | 0.055 | 1.968 | 6.933 | 0.040 | n/a | 0.142 | 9.352 | n/a | n/a | 0.029 | 6.100 | 0.248 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000055 | 21.599 | 7.187 | 0.788 | 0.000 | 0.064 | 2.788 | 3.516 | 0.038 | n/a | 0.464 | 6.727 | n/a | n/a | 0.027 | 8.039 | 0.372 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000005a | 21.520 | 4.548 | n/a | 0.000 | 0.611 | 1.280 | 4.328 | 0.027 | n/a | 0.131 | 10.505 | n/a | n/a | 0.090 | 5.159 | 0.240 | 0.090 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000004d | 20.279 | 3.493 | 0.151 | 0.000 | 0.058 | 1.253 | 5.842 | 0.043 | n/a | 0.146 | 9.274 | n/a | n/a | 0.020 | 3.701 | 0.183 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (86 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.761 | n/a | n/a | n/a | 41.248 | 6.367 | 1.924 | 0.000 | 0.351 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.635 | 58.083 | 0.799 | 14.635 |
| p99 | 179.462 | n/a | n/a | n/a | 110.384 | 68.066 | 17.322 | 0.000 | 6.757 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 108.410 | 139.160 | 1.000 | 108.410 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f0000000000000f4b | 179.462 | 34.978 | 34.487 | 1.385 | 0.000 | 0.203 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 108.410 | 70.849 | 0.395 | 108.410 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.151ms; driver.publication.persist-deferred 1.079ms; driver.publication.persist-deferred 1.028ms; driver.publication.persist-deferred 1.010ms; driver.publication.persist-deferred 0.961ms |
| 30448786e426464f0000000000001b2a | 162.441 | 54.043 | 38.190 | 5.477 | 0.000 | 0.331 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.400 | 97.710 | 0.602 | 64.400 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.473ms; driver.publication.persist-deferred 1.051ms; driver.publication.persist-deferred 0.986ms; driver.publication.persist-deferred 0.928ms; driver.publication.persist-deferred 0.734ms |
| 30448786e426464f0000000000000039 | 158.209 | 110.384 | 7.150 | 8.876 | 0.000 | 2.647 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.152 | 126.410 | 0.799 | 29.152 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.024ms; driver.reader-basis.broadcast 0.031ms; driver.reader-basis.broadcast 0.020ms |
| 30448786e426464f0000000000000f4c | 151.105 | 56.015 | 32.679 | 3.643 | 0.000 | 0.243 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 58.525 | 92.337 | 0.611 | 58.525 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.151ms; driver.publication.persist-deferred 1.079ms; driver.publication.persist-deferred 1.010ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.854ms |
| 30448786e426464f0000000000001b23 | 146.267 | 79.506 | 52.724 | 6.930 | 0.000 | 6.757 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.350 | 139.160 | 0.951 | 0.350 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.473ms; driver.publication.persist-deferred 1.051ms; driver.publication.persist-deferred 0.986ms; driver.publication.persist-deferred 0.914ms; driver.publication.persist-deferred 0.802ms |
| 30448786e426464f0000000000001c70 | 139.492 | 62.798 | 9.462 | 5.262 | 0.000 | 0.382 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.589 | 77.522 | 0.556 | 61.589 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.736ms; driver.publication.persist-deferred 0.881ms; driver.publication.persist-deferred 0.835ms; driver.publication.persist-deferred 0.705ms; driver.publication.persist-deferred 0.646ms |
| 30448786e426464f00000000000013a5 | 137.282 | 44.365 | 1.241 | 4.524 | 0.000 | 0.367 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.786 | 50.130 | 0.365 | 86.786 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.676ms; driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.179ms; driver.publication.persist-deferred 1.159ms; driver.publication.persist-deferred 1.134ms |
| 30448786e426464f00000000000008fd | 136.639 | 11.533 | 29.094 | 0.000 | 0.000 | 0.221 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 95.791 | 40.627 | 0.297 | 95.791 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.390ms; driver.publication.persist-deferred 1.446ms; driver.publication.persist-deferred 1.272ms; driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.039ms |
| 30448786e426464f0000000000001584 | 132.105 | 49.524 | 16.627 | 1.310 | 0.000 | 0.443 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.202 | 67.461 | 0.511 | 64.202 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.097ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.960ms; driver.publication.persist-deferred 0.851ms; driver.publication.persist-deferred 0.847ms |
| 30448786e426464f00000000000014a9 | 125.923 | 46.181 | 47.542 | 5.379 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.582 | 99.102 | 0.787 | 26.582 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.172ms; driver.publication.persist-deferred 1.152ms; driver.publication.persist-deferred 1.130ms; driver.publication.persist-deferred 1.085ms; driver.publication.persist-deferred 1.054ms |
| 30448786e426464f000000000000157d | 125.881 | 44.972 | 0.259 | 1.577 | 0.000 | 0.383 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 78.691 | 46.807 | 0.372 | 78.691 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.097ms; driver.publication.persist-deferred 1.093ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.960ms |
| 30448786e426464f0000000000000907 | 124.227 | 12.290 | 68.066 | 0.000 | 0.000 | 0.244 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.627 | 80.355 | 0.647 | 43.627 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.390ms; driver.publication.persist-deferred 1.272ms; driver.publication.persist-deferred 1.039ms; driver.publication.persist-deferred 0.987ms; driver.publication.persist-deferred 0.924ms |
| 30448786e426464f00000000000008ff | 123.391 | 42.429 | 27.101 | 1.653 | 0.000 | 0.319 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.889 | 71.183 | 0.577 | 51.889 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.390ms; driver.publication.persist-deferred 1.446ms; driver.publication.persist-deferred 1.272ms; driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.039ms |
| 30448786e426464f0000000000000906 | 122.354 | 17.821 | 54.294 | 0.000 | 0.000 | 0.363 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.877 | 72.115 | 0.589 | 49.877 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.390ms; driver.publication.persist-deferred 1.272ms; driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.039ms; driver.publication.persist-deferred 0.987ms |
| 30448786e426464f0000000000001993 | 121.940 | 63.359 | 49.282 | 3.615 | 0.000 | 0.735 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.949 | 116.255 | 0.953 | 4.949 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.118ms; driver.publication.persist-deferred 1.024ms; driver.publication.persist-deferred 0.909ms; driver.publication.persist-deferred 0.899ms; driver.publication.persist-deferred 0.859ms |
| 30448786e426464f0000000000001685 | 119.240 | 65.464 | 0.262 | 5.751 | 0.000 | 0.505 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.258 | 71.477 | 0.599 | 47.258 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.210ms; driver.publication.persist-deferred 1.201ms; driver.publication.persist-deferred 1.121ms; driver.publication.persist-deferred 1.073ms; driver.publication.persist-deferred 1.050ms |
| 30448786e426464f00000000000013a0 | 116.739 | 64.720 | 3.188 | 3.241 | 0.000 | 0.560 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.029 | 71.150 | 0.609 | 45.029 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.179ms; driver.publication.persist-deferred 1.040ms; driver.publication.persist-deferred 1.007ms; driver.reader-basis.broadcast 0.503ms |
| 30448786e426464f000000000000168a | 112.406 | 36.667 | 0.333 | 1.431 | 0.000 | 0.339 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 73.637 | 38.430 | 0.342 | 73.637 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.210ms; driver.publication.persist-deferred 1.208ms; driver.publication.persist-deferred 1.201ms; driver.publication.persist-deferred 1.121ms; driver.publication.persist-deferred 1.073ms |
| 30448786e426464f0000000000000f49 | 112.091 | 47.486 | 43.430 | 17.322 | 0.000 | 0.345 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.508 | 108.238 | 0.966 | 3.508 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.556ms; driver.publication.persist-deferred 1.151ms; driver.publication.persist-deferred 1.079ms; driver.publication.persist-deferred 1.028ms; driver.publication.persist-deferred 1.010ms |
| 30448786e426464f00000000000014bb | 111.250 | 57.116 | 0.364 | 3.792 | 0.000 | 0.242 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.736 | 61.272 | 0.551 | 49.736 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.486ms; driver.publication.persist-deferred 1.270ms; driver.publication.persist-deferred 1.155ms; driver.publication.persist-deferred 1.152ms; driver.publication.persist-deferred 1.043ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.733 | 0.464 | 0.000 | 0.557 | 2.292 | n/a | 0.000 | 0.677 | 1.007 | 4.000 | 0.028 | n/a | 0.590 | 10.041 | n/a | n/a | 0.030 | 3.069 | 0.164 | 0.030 |
| p99 | 95.833 | 1.623 | 0.000 | 1.201 | 4.548 | n/a | 0.000 | 1.252 | 1.422 | 5.899 | 0.041 | n/a | 0.713 | 87.554 | n/a | n/a | 0.090 | 5.159 | 0.287 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f0000000000000058 | 95.833 | 2.186 | n/a | 0.000 | 0.677 | 0.858 | 3.875 | 0.025 | n/a | 0.636 | 87.554 | n/a | n/a | 0.021 | 2.863 | 0.030 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.082ms |
| 30448786e426464f000000000000003d | 25.267 | 2.449 | n/a | 0.000 | 0.859 | 1.007 | 4.531 | 0.027 | n/a | 0.187 | 16.178 | n/a | n/a | 0.029 | 3.308 | 0.131 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 30448786e426464f000000000000005a | 21.520 | 4.548 | n/a | 0.000 | 0.611 | 1.280 | 4.328 | 0.027 | n/a | 0.131 | 10.505 | n/a | n/a | 0.090 | 5.159 | 0.240 | 0.090 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000062 | 18.938 | 1.819 | n/a | 0.000 | 0.505 | 0.935 | 2.515 | 0.030 | n/a | 0.713 | 12.384 | n/a | n/a | 0.038 | 2.324 | 0.123 | 0.038 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 30448786e426464f0000000000000041 | 18.733 | 2.223 | n/a | 0.000 | 0.846 | 0.869 | 4.000 | 0.027 | n/a | 0.698 | 10.041 | n/a | n/a | 0.029 | 3.069 | 0.164 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 30448786e426464f0000000000000066 | 17.319 | 2.995 | n/a | 0.000 | 0.776 | 0.992 | 5.899 | 0.033 | n/a | 0.621 | 5.963 | n/a | n/a | 0.039 | 3.771 | 0.218 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000006d | 15.949 | 3.326 | n/a | 0.000 | 1.252 | 1.422 | 2.034 | 0.028 | n/a | 0.517 | 7.293 | n/a | n/a | 0.078 | 4.578 | 0.287 | 0.078 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000006b | 14.301 | 1.768 | n/a | 0.000 | 0.349 | 1.138 | 1.510 | 0.041 | n/a | 0.368 | 9.109 | n/a | n/a | 0.018 | 2.117 | 0.148 | 0.018 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000046 | 14.202 | 2.292 | n/a | 0.000 | 0.659 | 1.274 | 5.189 | 0.036 | n/a | 0.590 | 4.132 | n/a | n/a | 0.030 | 2.951 | 0.208 | 0.030 | gw-w/thread-46/commit.prepare-and-validate | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.060 | 0.000 | 0.000 | 0.358 | 3.246 | n/a | 0.000 | 0.186 | 1.271 | 4.738 | 0.037 | n/a | 0.252 | 14.696 | n/a | n/a | 0.025 | 3.722 | 0.142 | 0.025 |
| p99 | 192.785 | 1.139 | 0.058 | 1.313 | 7.477 | n/a | 0.597 | 1.279 | 7.972 | 43.137 | 1.341 | n/a | 4.952 | 144.172 | n/a | n/a | 0.050 | 7.818 | 0.363 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f0000000000000085 | 192.785 | 3.438 | 0.172 | 0.000 | 0.084 | 1.493 | 43.137 | 0.091 | n/a | 0.164 | 144.172 | n/a | n/a | 0.036 | 3.693 | 0.019 | 0.036 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.098ms; driver.reader-basis.broadcast 0.078ms |
| 30448786e426464f00000000000000c5 | 60.170 | 3.534 | 0.127 | 0.000 | 0.061 | 7.096 | 13.027 | 0.048 | n/a | 0.110 | 36.142 | n/a | n/a | 0.024 | 3.722 | 0.062 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000097 | 56.222 | 3.241 | 0.182 | 0.597 | 0.062 | 7.972 | 23.933 | 0.059 | n/a | 0.137 | 20.017 | n/a | n/a | 0.023 | 4.081 | 0.073 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.175ms |
| 30448786e426464f000000000000008d | 44.146 | 4.096 | 0.201 | 0.429 | 0.049 | 1.750 | 21.673 | 0.089 | n/a | 0.126 | 15.713 | n/a | n/a | 0.019 | 4.775 | 0.108 | 0.019 | gw-w/thread-46/gateway.admitted-work | none observed |
| 30448786e426464f00000000000000aa | 43.765 | 3.178 | 0.188 | 0.261 | 0.050 | 4.149 | 17.242 | 0.039 | n/a | 0.123 | 18.511 | n/a | n/a | 0.025 | 3.676 | 0.084 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000b0 | 43.368 | 4.893 | 0.132 | 0.562 | 0.057 | 2.878 | 13.270 | 0.135 | n/a | 4.952 | 16.466 | n/a | n/a | 0.024 | 5.644 | 0.130 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.154ms |
| 30448786e426464f0000000000000091 | 42.786 | 3.419 | 0.128 | 0.000 | 0.049 | 1.632 | 23.367 | 0.055 | n/a | 0.439 | 13.675 | n/a | n/a | 0.021 | 3.596 | 0.084 | 0.021 | gw-w/thread-45/gateway.admitted-work | none observed |
| 30448786e426464f0000000000000087 | 42.439 | 3.305 | 0.170 | 0.297 | 0.050 | 1.577 | 10.913 | 0.066 | n/a | 0.400 | 25.641 | n/a | n/a | 0.021 | 3.822 | 0.090 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000092 | 41.458 | 2.251 | n/a | 0.000 | 0.689 | 1.101 | 6.782 | 1.341 | n/a | 0.920 | 28.351 | n/a | n/a | 0.022 | 2.940 | 0.071 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000b8 | 39.394 | 3.524 | 1.234 | 0.302 | 0.052 | 1.271 | 9.598 | 0.029 | n/a | 0.916 | 22.440 | n/a | n/a | 0.029 | 5.112 | 0.130 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000ac | 39.173 | 3.246 | n/a | 0.000 | 1.040 | 0.578 | 2.428 | 0.025 | n/a | 0.675 | 31.167 | n/a | n/a | 0.014 | 4.286 | 0.109 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000089 | 35.469 | 5.306 | 0.138 | 0.000 | 0.055 | 1.668 | 7.272 | 0.089 | n/a | 0.912 | 20.006 | n/a | n/a | 0.022 | 5.499 | 0.155 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000009e | 34.624 | 3.201 | 0.145 | 0.000 | 0.088 | 1.106 | 9.024 | 0.032 | n/a | 0.114 | 20.882 | n/a | n/a | 0.033 | 3.433 | 0.099 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000096 | 34.254 | 7.477 | n/a | 0.000 | 0.272 | 2.602 | 5.948 | 0.027 | n/a | 3.890 | 14.008 | n/a | n/a | 0.029 | 7.750 | 0.226 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000ba | 33.506 | 4.423 | 0.211 | 0.000 | 0.128 | 1.680 | 14.205 | 0.114 | n/a | 0.399 | 12.307 | n/a | n/a | 0.040 | 4.762 | 0.142 | 0.040 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000008b | 31.996 | 2.477 | n/a | 0.000 | 0.305 | 0.914 | 8.237 | 0.024 | n/a | 0.112 | 19.903 | n/a | n/a | 0.025 | 2.781 | 0.087 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000007c | 29.513 | 5.153 | 0.136 | 0.000 | 0.044 | 1.961 | 3.780 | 0.063 | n/a | 1.564 | 16.795 | n/a | n/a | 0.016 | 5.333 | 0.181 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000075 | 28.654 | 5.217 | 0.178 | 0.335 | 0.053 | 1.493 | 5.486 | 0.053 | n/a | 0.127 | 15.693 | n/a | n/a | 0.020 | 5.782 | 0.202 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000007a | 27.746 | 1.889 | n/a | 0.000 | 0.595 | 1.002 | 4.276 | 0.031 | n/a | 0.622 | 19.305 | n/a | n/a | 0.024 | 2.485 | 0.090 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000a6 | 26.822 | 2.833 | n/a | 0.000 | 0.494 | 2.531 | 2.350 | 0.051 | n/a | 0.169 | 18.359 | n/a | n/a | 0.036 | 3.327 | 0.124 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.660 | 0.626 | 0.000 | 0.382 | 2.281 | n/a | 0.000 | 0.508 | 1.002 | 1.659 | 0.023 | n/a | 0.540 | 8.590 | n/a | n/a | 0.025 | 2.871 | 0.155 | 0.025 |
| p99 | 27.746 | 1.005 | 0.000 | 0.555 | 7.460 | n/a | 0.000 | 1.279 | 4.109 | 5.131 | 0.251 | n/a | 0.960 | 19.305 | n/a | n/a | 0.048 | 7.818 | 0.363 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f000000000000007a | 27.746 | 1.889 | n/a | 0.000 | 0.595 | 1.002 | 4.276 | 0.031 | n/a | 0.622 | 19.305 | n/a | n/a | 0.024 | 2.485 | 0.090 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000007d | 21.514 | 7.460 | n/a | 0.000 | 0.358 | 2.842 | 5.131 | 0.063 | n/a | 0.960 | 4.677 | n/a | n/a | 0.023 | 7.818 | 0.363 | 0.023 | node-14/thread-0/driver.execute | none observed |
| 30448786e426464f000000000000008e | 20.538 | 2.671 | n/a | 0.000 | 0.508 | 1.063 | 4.750 | 0.023 | n/a | 0.115 | 11.365 | n/a | n/a | 0.044 | 3.179 | 0.155 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000b6 | 20.323 | 1.840 | n/a | 0.000 | 0.251 | 4.109 | 1.659 | 0.018 | n/a | 0.094 | 12.327 | n/a | n/a | 0.025 | 2.091 | 0.103 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000a8 | 15.660 | 1.725 | n/a | 0.000 | 0.310 | 0.669 | 1.520 | 0.251 | n/a | 0.540 | 10.613 | n/a | n/a | 0.033 | 2.034 | 0.130 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000a4 | 14.834 | 2.666 | n/a | 0.000 | 0.803 | 1.000 | 1.564 | 0.021 | n/a | 0.142 | 8.590 | n/a | n/a | 0.048 | 3.469 | 0.234 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000c0 | 13.141 | 2.489 | n/a | 0.000 | 1.279 | 0.822 | 1.120 | 0.020 | n/a | 0.669 | 6.715 | n/a | n/a | 0.027 | 3.768 | 0.287 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000009a | 12.196 | 2.281 | n/a | 0.000 | 0.590 | 1.150 | 1.981 | 0.051 | n/a | 0.704 | 5.419 | n/a | n/a | 0.021 | 2.871 | 0.235 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.129 | 0.000 | 0.000 | 0.358 | 3.759 | 1.950 | 0.000 | 0.185 | 1.346 | 2.284 | 0.032 | n/a | 0.404 | 11.782 | n/a | n/a | 0.026 | 4.579 | 0.197 | 0.026 |
| p99 | 317.478 | 2.009 | 0.088 | 1.272 | 11.795 | n/a | 4.015 | 1.104 | 7.906 | 20.778 | 0.127 | n/a | 3.497 | 294.487 | n/a | n/a | 0.066 | 11.987 | 0.370 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f00000000000000da | 317.478 | 4.677 | 0.217 | 0.000 | 0.067 | 3.834 | 13.686 | 0.077 | n/a | 0.404 | 294.487 | n/a | n/a | 0.029 | 4.962 | 0.016 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms; driver.reader-basis.broadcast 0.038ms; driver.reader-basis.broadcast 0.027ms |
| 30448786e426464f00000000000000ee | 50.565 | 6.424 | 0.139 | 0.453 | 0.067 | 4.521 | 20.778 | 0.057 | n/a | 1.084 | 17.013 | n/a | n/a | 0.028 | 7.084 | 0.140 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000e6 | 48.197 | 4.533 | 1.950 | 0.000 | 0.068 | 7.906 | 11.686 | 0.127 | n/a | 0.740 | 21.158 | n/a | n/a | 0.028 | 6.551 | 0.136 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000fa | 45.052 | 8.218 | 0.226 | 0.387 | 0.063 | 1.752 | 10.312 | 0.031 | n/a | 0.589 | 23.452 | n/a | n/a | 0.024 | 8.894 | 0.197 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000010c | 41.404 | 3.759 | 0.152 | 0.266 | 0.105 | 1.334 | 2.284 | 0.046 | n/a | 0.508 | 32.909 | n/a | n/a | 0.042 | 4.281 | 0.103 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000f0 | 39.620 | 11.795 | 0.129 | 0.000 | 0.062 | 4.008 | 11.938 | 0.036 | n/a | 0.107 | 11.518 | n/a | n/a | 0.027 | 11.987 | 0.303 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000d0 | 37.248 | 6.595 | 0.139 | 0.000 | 0.068 | 5.111 | 8.227 | 0.049 | n/a | 0.436 | 16.597 | n/a | n/a | 0.026 | 6.802 | 0.183 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000d8 | 35.725 | 4.577 | 0.186 | 0.361 | 0.108 | 2.040 | 13.705 | 0.071 | n/a | 2.356 | 12.283 | n/a | n/a | 0.039 | 5.231 | 0.146 | 0.039 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000e1 | 34.131 | 3.856 | 0.222 | 0.439 | 0.062 | 1.726 | 10.189 | 0.032 | n/a | 0.314 | 17.264 | n/a | n/a | 0.026 | 4.579 | 0.134 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000f5 | 34.002 | 4.388 | n/a | 0.000 | 0.293 | 0.870 | 1.851 | 0.020 | n/a | 0.645 | 25.915 | n/a | n/a | 0.021 | 4.681 | 0.138 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.108ms |
| 30448786e426464f00000000000000fe | 31.837 | 6.698 | 0.187 | 0.359 | 0.062 | 3.810 | 7.677 | 0.031 | n/a | 0.192 | 12.798 | n/a | n/a | 0.024 | 7.305 | 0.229 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000100 | 31.770 | 11.232 | 0.148 | 0.272 | 0.093 | 1.753 | 10.244 | 0.050 | n/a | 0.201 | 7.738 | n/a | n/a | 0.038 | 11.746 | 0.370 | 0.038 | node-14/thread-8/client.persist-and-resolve | none observed |
| 30448786e426464f00000000000000d1 | 31.576 | 2.650 | n/a | 0.000 | 0.602 | 0.979 | 5.474 | 0.066 | n/a | 0.237 | 21.544 | n/a | n/a | 0.024 | 3.252 | 0.103 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000e2 | 30.698 | 6.853 | n/a | 0.000 | 0.229 | 1.079 | 1.763 | 0.023 | n/a | 0.099 | 20.594 | n/a | n/a | 0.057 | 7.083 | 0.231 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000ec | 30.464 | 6.218 | 0.140 | 0.000 | 0.065 | 1.629 | 6.258 | 0.031 | n/a | 0.106 | 15.990 | n/a | n/a | 0.027 | 6.423 | 0.211 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000e8 | 30.263 | 5.892 | 0.225 | 0.359 | 0.075 | 3.054 | 8.304 | 0.031 | n/a | 0.112 | 12.174 | n/a | n/a | 0.036 | 6.551 | 0.216 | 0.036 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000c9 | 29.070 | 8.886 | 0.133 | 1.157 | 0.060 | 1.547 | 5.376 | 0.034 | n/a | 0.552 | 11.300 | n/a | n/a | 0.025 | 10.236 | 0.352 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000108 | 27.398 | 4.840 | 0.263 | 0.427 | 0.185 | 1.925 | 7.063 | 0.099 | n/a | 3.497 | 9.033 | n/a | n/a | 0.066 | 5.714 | 0.209 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000f4 | 26.635 | 3.615 | 1.231 | 0.426 | 0.068 | 1.410 | 11.764 | 0.038 | n/a | 0.122 | 7.937 | n/a | n/a | 0.026 | 5.339 | 0.200 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000104 | 25.129 | 4.142 | 0.215 | 0.299 | 0.068 | 1.901 | 9.985 | 0.085 | n/a | 0.174 | 8.231 | n/a | n/a | 0.026 | 4.725 | 0.188 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.776 | 0.000 | 0.000 | 0.366 | 1.761 | n/a | 0.000 | 0.869 | 0.805 | 1.583 | 0.021 | n/a | 0.455 | 8.731 | n/a | n/a | 0.024 | 2.688 | 0.157 | 0.024 |
| p99 | 24.371 | 0.734 | 0.000 | 0.456 | 3.350 | n/a | 0.000 | 1.104 | 1.346 | 2.144 | 0.074 | n/a | 1.714 | 17.760 | n/a | n/a | 0.043 | 3.643 | 0.310 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f00000000000000c7 | 24.371 | 3.350 | n/a | 0.000 | 0.293 | 1.346 | 1.961 | 0.074 | n/a | 0.930 | 16.373 | n/a | n/a | 0.042 | 3.643 | 0.149 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000109 | 23.285 | 1.672 | n/a | 0.000 | 0.958 | 0.736 | 1.323 | 0.019 | n/a | 0.794 | 17.760 | n/a | n/a | 0.024 | 2.630 | 0.113 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000111 | 22.293 | 2.224 | n/a | 0.000 | 1.092 | 1.122 | 1.765 | 0.048 | n/a | 1.714 | 14.305 | n/a | n/a | 0.025 | 3.316 | 0.149 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000dc | 17.126 | 1.761 | n/a | 0.000 | 0.927 | 0.621 | 1.583 | 0.018 | n/a | 0.455 | 11.738 | n/a | n/a | 0.023 | 2.688 | 0.157 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 30448786e426464f0000000000000113 | 15.887 | 1.524 | n/a | 0.000 | 0.444 | 0.852 | 1.099 | 0.021 | n/a | 0.138 | 11.782 | n/a | n/a | 0.029 | 1.968 | 0.124 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 30448786e426464f00000000000000cb | 14.776 | 2.000 | n/a | 0.000 | 1.039 | 0.805 | 1.602 | 0.021 | n/a | 0.553 | 8.731 | n/a | n/a | 0.024 | 3.040 | 0.206 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000fc | 14.400 | 1.861 | n/a | 0.000 | 0.516 | 1.010 | 2.144 | 0.044 | n/a | 0.218 | 8.584 | n/a | n/a | 0.023 | 2.377 | 0.165 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000d6 | 12.165 | 1.696 | n/a | 0.000 | 1.104 | 0.810 | 1.785 | 0.020 | n/a | 0.612 | 6.116 | n/a | n/a | 0.021 | 2.800 | 0.230 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000f1 | 11.558 | 2.714 | n/a | 0.000 | 0.869 | 0.800 | 1.315 | 0.021 | n/a | 0.138 | 5.659 | n/a | n/a | 0.043 | 3.583 | 0.310 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000000de | 8.377 | 1.743 | n/a | 0.000 | 0.611 | 0.640 | 1.205 | 0.018 | n/a | 0.077 | 4.063 | n/a | n/a | 0.021 | 2.354 | 0.281 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.149 | 0.000 | 0.000 | 0.379 | 3.752 | n/a | 0.000 | 0.105 | 1.566 | 4.606 | 0.033 | n/a | 0.412 | 11.221 | n/a | n/a | 0.028 | 4.111 | 0.178 | 0.028 |
| p99 | 84.183 | 0.999 | 0.000 | 0.917 | 15.280 | n/a | 9.523 | 1.079 | 13.872 | 15.437 | 0.393 | n/a | 3.926 | 77.481 | n/a | n/a | 0.080 | 16.846 | 0.558 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f0000000000000128 | 84.183 | 1.698 | n/a | 0.000 | 0.593 | 0.696 | 3.298 | 0.021 | n/a | 0.371 | 77.481 | n/a | n/a | 0.026 | 2.291 | 0.027 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| 30448786e426464f0000000000000157 | 63.306 | 5.245 | 0.219 | 9.523 | 0.078 | 10.125 | 5.777 | 0.034 | n/a | 0.107 | 32.170 | n/a | n/a | 0.027 | 15.065 | 0.238 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000013c | 47.733 | 8.040 | n/a | 0.000 | 0.852 | 2.743 | 14.475 | 0.118 | n/a | 1.118 | 20.362 | n/a | n/a | 0.025 | 8.892 | 0.186 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 30448786e426464f000000000000015d | 40.877 | 6.266 | 10.218 | 0.264 | 0.098 | 2.940 | 5.930 | 0.028 | n/a | 0.123 | 14.965 | n/a | n/a | 0.045 | 16.846 | 0.412 | 0.045 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000134 | 37.502 | 1.668 | n/a | 0.000 | 0.092 | 6.872 | 3.437 | 0.057 | n/a | 3.926 | 21.423 | n/a | n/a | 0.028 | 1.760 | 0.047 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000147 | 36.577 | 5.220 | 0.806 | 2.263 | 0.064 | 1.683 | 15.437 | 0.031 | n/a | 0.490 | 10.556 | n/a | n/a | 0.028 | 8.352 | 0.228 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000013b | 34.412 | 3.817 | 0.192 | 0.000 | 0.102 | 5.957 | 8.748 | 0.035 | n/a | 2.027 | 13.491 | n/a | n/a | 0.042 | 4.111 | 0.119 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000126 | 33.151 | 4.719 | 0.261 | 0.334 | 0.069 | 1.635 | 6.267 | 0.031 | n/a | 0.492 | 19.311 | n/a | n/a | 0.031 | 5.384 | 0.162 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000145 | 31.819 | 6.494 | 0.132 | 0.000 | 0.058 | 4.067 | 7.247 | 0.031 | n/a | 0.160 | 13.606 | n/a | n/a | 0.023 | 6.684 | 0.210 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000123 | 31.334 | 3.752 | 0.242 | 0.283 | 0.105 | 4.677 | 8.612 | 0.082 | n/a | 0.681 | 12.855 | n/a | n/a | 0.044 | 4.383 | 0.140 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000148 | 29.788 | 2.818 | n/a | 0.000 | 0.723 | 1.289 | 8.169 | 0.071 | n/a | 0.263 | 16.427 | n/a | n/a | 0.028 | 3.540 | 0.119 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000012f | 29.655 | 3.925 | 0.173 | 0.248 | 0.074 | 2.562 | 7.982 | 0.075 | n/a | 0.192 | 14.395 | n/a | n/a | 0.028 | 4.420 | 0.149 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000153 | 29.496 | 4.136 | 0.136 | 0.449 | 0.054 | 1.566 | 6.826 | 0.035 | n/a | 0.323 | 15.949 | n/a | n/a | 0.022 | 4.775 | 0.162 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000012b | 29.040 | 3.508 | 0.179 | 0.305 | 0.114 | 1.522 | 8.350 | 0.079 | n/a | 0.093 | 14.853 | n/a | n/a | 0.038 | 4.105 | 0.141 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000163 | 28.731 | 15.280 | 0.239 | 0.449 | 0.060 | 1.760 | 3.068 | 0.033 | n/a | 0.522 | 7.296 | n/a | n/a | 0.024 | 16.027 | 0.558 | 0.024 | node-14/thread-8/client.persist-and-resolve | none observed |
| 30448786e426464f0000000000000165 | 28.266 | 9.541 | 0.175 | 0.648 | 0.061 | 1.801 | 9.782 | 0.095 | n/a | 0.277 | 5.862 | n/a | n/a | 0.025 | 10.424 | 0.369 | 0.025 | gw-w/thread-46/gateway.admitted-work | none observed |
| 30448786e426464f000000000000011c | 27.239 | 4.672 | 0.227 | 0.261 | 0.067 | 13.872 | 2.032 | 0.033 | n/a | 0.512 | 5.534 | n/a | n/a | 0.029 | 5.227 | 0.192 | 0.029 | node-14/thread-8/socket.wait-first-byte | none observed |
| 30448786e426464f0000000000000139 | 26.968 | 9.441 | 0.171 | 0.585 | 0.059 | 2.739 | 5.478 | 0.032 | n/a | 1.314 | 7.128 | n/a | n/a | 0.022 | 10.255 | 0.380 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000012c | 26.246 | 2.589 | n/a | 0.000 | 1.079 | 0.704 | 1.435 | 0.020 | n/a | 0.583 | 19.813 | n/a | n/a | 0.023 | 3.668 | 0.140 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 30448786e426464f000000000000016b | 25.161 | 3.562 | 0.195 | 0.212 | 0.060 | 1.808 | 10.744 | 0.052 | n/a | 0.187 | 8.317 | n/a | n/a | 0.024 | 4.029 | 0.160 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.058 | 0.000 | 0.000 | 0.423 | 2.601 | n/a | 0.000 | 0.575 | 1.018 | 2.240 | 0.023 | n/a | 0.457 | 12.237 | n/a | n/a | 0.029 | 2.907 | 0.164 | 0.029 |
| p99 | 84.183 | 0.995 | 0.000 | 0.680 | 3.300 | n/a | 0.000 | 0.896 | 6.872 | 5.772 | 0.071 | n/a | 3.926 | 77.481 | n/a | n/a | 0.080 | 3.804 | 0.238 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f0000000000000128 | 84.183 | 1.698 | n/a | 0.000 | 0.593 | 0.696 | 3.298 | 0.021 | n/a | 0.371 | 77.481 | n/a | n/a | 0.026 | 2.291 | 0.027 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| 30448786e426464f0000000000000134 | 37.502 | 1.668 | n/a | 0.000 | 0.092 | 6.872 | 3.437 | 0.057 | n/a | 3.926 | 21.423 | n/a | n/a | 0.028 | 1.760 | 0.047 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000132 | 25.149 | 1.627 | n/a | 0.000 | 0.575 | 2.613 | 5.772 | 0.070 | n/a | 0.219 | 14.253 | n/a | n/a | 0.020 | 2.202 | 0.088 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000168 | 22.472 | 2.791 | n/a | 0.000 | 0.896 | 2.768 | 2.240 | 0.061 | n/a | 2.465 | 11.221 | n/a | n/a | 0.029 | 3.688 | 0.164 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000011a | 21.957 | 2.871 | n/a | 0.000 | 0.427 | 0.945 | 4.606 | 0.021 | n/a | 0.457 | 12.591 | n/a | n/a | 0.039 | 3.298 | 0.150 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000117 | 21.146 | 2.902 | n/a | 0.000 | 0.672 | 1.010 | 1.600 | 0.023 | n/a | 0.516 | 14.373 | n/a | n/a | 0.051 | 3.574 | 0.169 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000158 | 21.126 | 3.091 | n/a | 0.000 | 0.659 | 1.557 | 2.619 | 0.061 | n/a | 0.225 | 12.855 | n/a | n/a | 0.059 | 3.750 | 0.178 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000011d | 20.058 | 3.300 | n/a | 0.000 | 0.504 | 1.264 | 2.290 | 0.023 | n/a | 0.412 | 12.237 | n/a | n/a | 0.028 | 3.804 | 0.190 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000130 | 18.780 | 2.345 | n/a | 0.000 | 0.561 | 1.029 | 2.083 | 0.022 | n/a | 0.127 | 12.584 | n/a | n/a | 0.028 | 2.907 | 0.155 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000142 | 17.035 | 1.927 | n/a | 0.000 | 0.782 | 1.018 | 1.711 | 0.071 | n/a | 1.156 | 10.348 | n/a | n/a | 0.023 | 2.710 | 0.159 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 30448786e426464f0000000000000137 | 15.775 | 1.953 | n/a | 0.000 | 0.340 | 0.558 | 1.418 | 0.021 | n/a | 0.519 | 10.943 | n/a | n/a | 0.022 | 2.293 | 0.145 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000154 | 15.502 | 2.848 | n/a | 0.000 | 0.787 | 0.906 | 1.079 | 0.020 | n/a | 0.339 | 9.481 | n/a | n/a | 0.042 | 3.635 | 0.234 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000015e | 14.894 | 3.122 | n/a | 0.000 | 0.427 | 1.225 | 1.091 | 0.021 | n/a | 1.215 | 7.713 | n/a | n/a | 0.080 | 3.549 | 0.238 | 0.080 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f000000000000014c | 13.937 | 1.725 | n/a | 0.000 | 0.753 | 0.931 | 1.834 | 0.061 | n/a | 0.595 | 8.000 | n/a | n/a | 0.038 | 2.477 | 0.178 | 0.038 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000150 | 12.895 | 2.601 | n/a | 0.000 | 0.105 | 0.925 | 2.395 | 0.054 | n/a | 0.169 | 6.618 | n/a | n/a | 0.029 | 2.706 | 0.210 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.585 | 0.000 | 0.000 | 0.359 | 1.943 | n/a | 0.000 | 0.687 | 0.582 | 0.974 | 0.012 | n/a | 0.106 | 4.915 | n/a | n/a | 0.014 | 2.817 | 0.276 | 0.014 |
| p99 | 38.923 | 1.987 | 0.026 | 1.111 | 6.453 | n/a | 0.271 | 16.244 | 7.273 | 5.949 | 0.059 | n/a | 3.376 | 22.430 | n/a | n/a | 0.049 | 18.341 | 0.710 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f000000000000035a | 92.629 | 1.978 | n/a | 0.000 | 71.771 | 0.336 | 2.702 | 0.011 | n/a | 0.243 | 15.572 | n/a | n/a | 0.016 | 73.749 | 0.796 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.287ms; driver.publication.persist-deferred 1.136ms; driver.publication.persist-deferred 1.053ms; driver.publication.persist-deferred 0.999ms; driver.publication.persist-deferred 0.982ms |
| 30448786e426464f000000000000016f | 80.235 | 2.223 | n/a | 0.000 | 1.081 | 0.853 | 2.065 | 0.047 | n/a | 0.898 | 73.046 | n/a | n/a | 0.022 | 3.304 | 0.041 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms |
| 30448786e426464f000000000000051b | 73.179 | 1.478 | n/a | 0.000 | 45.208 | 2.706 | 0.983 | 0.038 | n/a | 0.197 | 22.555 | n/a | n/a | 0.015 | 46.685 | 0.638 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 8.163ms; driver.publication.persist-deferred 6.278ms; driver.publication.persist-deferred 2.632ms; driver.publication.persist-deferred 1.225ms; driver.publication.persist-deferred 0.863ms |
| 30448786e426464f00000000000001d4 | 73.019 | 2.197 | n/a | 0.000 | 0.667 | 0.940 | 1.915 | 0.050 | n/a | 0.225 | 67.003 | n/a | n/a | 0.021 | 2.864 | 0.039 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 30448786e426464f0000000000000359 | 72.940 | 2.303 | n/a | 0.000 | 55.481 | 0.515 | 1.011 | 0.019 | n/a | 0.148 | 13.442 | n/a | n/a | 0.021 | 57.783 | 0.792 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.287ms; driver.publication.persist-deferred 1.136ms; driver.publication.persist-deferred 0.999ms; driver.publication.persist-deferred 0.982ms; driver.publication.persist-deferred 0.972ms |
| 30448786e426464f00000000000001ef | 71.742 | 3.720 | 0.168 | 0.246 | 0.093 | 1.160 | 5.043 | 0.028 | n/a | 0.438 | 60.786 | n/a | n/a | 0.061 | 4.227 | 0.059 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.101ms |
| 30448786e426464f0000000000000250 | 68.222 | 1.840 | n/a | 0.000 | 0.220 | 0.686 | 55.986 | 0.018 | n/a | 0.404 | 9.050 | n/a | n/a | 0.017 | 2.061 | 0.030 | 0.017 | gw-w/thread-46/gateway.response-write | none observed |
| 30448786e426464f0000000000000358 | 64.746 | 4.384 | n/a | 0.000 | 24.672 | 6.684 | 5.252 | 0.027 | n/a | 2.717 | 20.994 | n/a | n/a | 0.016 | 29.056 | 0.449 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.287ms; driver.publication.persist-deferred 0.999ms; driver.publication.persist-deferred 0.972ms; driver.publication.persist-deferred 0.816ms; driver.reader-basis.broadcast 0.143ms |
| 30448786e426464f0000000000000251 | 62.842 | 1.733 | n/a | 0.000 | 0.024 | 1.454 | 0.820 | 0.011 | n/a | 0.328 | 58.458 | n/a | n/a | 0.012 | 1.758 | 0.028 | 0.012 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.280ms |
| 30448786e426464f000000000000018e | 61.744 | 3.166 | 0.156 | 0.274 | 0.056 | 1.080 | 2.248 | 0.032 | n/a | 0.131 | 54.575 | n/a | n/a | 0.027 | 3.652 | 0.059 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000252 | 61.076 | 1.417 | n/a | 0.000 | 53.227 | 0.462 | 0.939 | 0.023 | n/a | 0.500 | 4.493 | n/a | n/a | 0.016 | 54.644 | 0.895 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.280ms; driver.publication.persist-deferred 0.666ms; driver.publication.persist-deferred 0.450ms; driver.reader-basis.broadcast 0.138ms |
| 30448786e426464f000000000000051a | 57.096 | 1.886 | n/a | 0.000 | 28.103 | 6.372 | 0.812 | 0.014 | n/a | 0.071 | 19.826 | n/a | n/a | 0.012 | 29.989 | 0.525 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.278ms; driver.publication.persist-deferred 5.231ms |
| 30448786e426464f00000000000001a4 | 53.612 | 3.776 | 0.139 | 0.292 | 0.053 | 1.305 | 6.135 | 0.030 | n/a | 0.079 | 41.778 | n/a | n/a | 0.025 | 4.261 | 0.079 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f00000000000001b8 | 52.952 | 3.246 | n/a | 0.000 | 0.293 | 0.965 | 1.188 | 0.021 | n/a | 0.135 | 47.068 | n/a | n/a | 0.036 | 3.539 | 0.067 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000203 | 52.536 | 2.744 | 0.208 | 0.284 | 0.123 | 1.069 | 2.181 | 0.030 | n/a | 0.119 | 45.732 | n/a | n/a | 0.046 | 3.359 | 0.064 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 30448786e426464f0000000000001d0d | 52.296 | 3.428 | n/a | 0.000 | 0.878 | 0.806 | 1.712 | 0.020 | n/a | 0.083 | 45.355 | n/a | n/a | 0.015 | 4.306 | 0.082 | 0.015 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.710ms |
| 30448786e426464f0000000000000f1e | 49.834 | 1.243 | n/a | 0.000 | 23.333 | 0.348 | 0.767 | 0.010 | n/a | 0.059 | 24.066 | n/a | n/a | 0.008 | 24.576 | 0.493 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.529ms; driver.publication.persist-deferred 1.431ms; driver.publication.persist-deferred 1.150ms; driver.publication.persist-deferred 1.051ms; driver.publication.persist-deferred 0.760ms |
| 30448786e426464f000000000000035f | 48.149 | 4.090 | n/a | 0.000 | 26.661 | 0.853 | 1.405 | 0.023 | n/a | 0.073 | 15.029 | n/a | n/a | 0.016 | 30.750 | 0.639 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.287ms; driver.publication.persist-deferred 1.136ms; driver.publication.persist-deferred 0.671ms; driver.reader-basis.broadcast 0.143ms |
| 30448786e426464f000000000000051e | 47.991 | 5.030 | n/a | 0.000 | 2.471 | 4.772 | 15.005 | 0.019 | n/a | 0.534 | 20.152 | n/a | n/a | 0.008 | 7.501 | 0.156 | 0.008 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 8.163ms; driver.publication.persist-deferred 2.632ms; driver.publication.persist-deferred 2.093ms; driver.publication.persist-deferred 1.225ms; driver.reader-basis.broadcast 0.402ms |
| 30448786e426464f0000000000000244 | 47.370 | 4.520 | n/a | 0.000 | 4.795 | 2.479 | 6.917 | 0.040 | n/a | 0.115 | 28.476 | n/a | n/a | 0.029 | 9.315 | 0.197 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.142ms; driver.reader-basis.broadcast 0.864ms |

## P2 / tail / commit / 5-10 facts (2079 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.359 | 0.000 | 0.000 | 0.304 | 1.569 | n/a | 0.000 | 0.708 | 0.562 | 0.819 | 0.012 | n/a | 0.106 | 4.479 | n/a | n/a | 0.014 | 2.411 | 0.266 | 0.014 |
| p99 | 33.627 | 1.603 | 0.016 | 0.706 | 4.983 | n/a | 0.000 | 15.331 | 7.691 | 4.764 | 0.061 | n/a | 3.227 | 19.826 | n/a | n/a | 0.049 | 17.267 | 0.722 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 30448786e426464f000000000000035a | 92.629 | 1.978 | n/a | 0.000 | 71.771 | 0.336 | 2.702 | 0.011 | n/a | 0.243 | 15.572 | n/a | n/a | 0.016 | 73.749 | 0.796 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.287ms; driver.publication.persist-deferred 1.136ms; driver.publication.persist-deferred 1.053ms; driver.publication.persist-deferred 0.999ms; driver.publication.persist-deferred 0.982ms |
| 30448786e426464f000000000000051b | 73.179 | 1.478 | n/a | 0.000 | 45.208 | 2.706 | 0.983 | 0.038 | n/a | 0.197 | 22.555 | n/a | n/a | 0.015 | 46.685 | 0.638 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 8.163ms; driver.publication.persist-deferred 6.278ms; driver.publication.persist-deferred 2.632ms; driver.publication.persist-deferred 1.225ms; driver.publication.persist-deferred 0.863ms |
| 30448786e426464f0000000000000359 | 72.940 | 2.303 | n/a | 0.000 | 55.481 | 0.515 | 1.011 | 0.019 | n/a | 0.148 | 13.442 | n/a | n/a | 0.021 | 57.783 | 0.792 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.287ms; driver.publication.persist-deferred 1.136ms; driver.publication.persist-deferred 0.999ms; driver.publication.persist-deferred 0.982ms; driver.publication.persist-deferred 0.972ms |
| 30448786e426464f0000000000000250 | 68.222 | 1.840 | n/a | 0.000 | 0.220 | 0.686 | 55.986 | 0.018 | n/a | 0.404 | 9.050 | n/a | n/a | 0.017 | 2.061 | 0.030 | 0.017 | gw-w/thread-46/gateway.response-write | none observed |
| 30448786e426464f0000000000000252 | 61.076 | 1.417 | n/a | 0.000 | 53.227 | 0.462 | 0.939 | 0.023 | n/a | 0.500 | 4.493 | n/a | n/a | 0.016 | 54.644 | 0.895 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.280ms; driver.publication.persist-deferred 0.666ms; driver.publication.persist-deferred 0.450ms; driver.reader-basis.broadcast 0.138ms |
| 30448786e426464f000000000000051a | 57.096 | 1.886 | n/a | 0.000 | 28.103 | 6.372 | 0.812 | 0.014 | n/a | 0.071 | 19.826 | n/a | n/a | 0.012 | 29.989 | 0.525 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.278ms; driver.publication.persist-deferred 5.231ms |
| 30448786e426464f00000000000001b8 | 52.952 | 3.246 | n/a | 0.000 | 0.293 | 0.965 | 1.188 | 0.021 | n/a | 0.135 | 47.068 | n/a | n/a | 0.036 | 3.539 | 0.067 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 30448786e426464f0000000000000f1e | 49.834 | 1.243 | n/a | 0.000 | 23.333 | 0.348 | 0.767 | 0.010 | n/a | 0.059 | 24.066 | n/a | n/a | 0.008 | 24.576 | 0.493 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.529ms; driver.publication.persist-deferred 1.431ms; driver.publication.persist-deferred 1.150ms; driver.publication.persist-deferred 1.051ms; driver.publication.persist-deferred 0.760ms |
| 30448786e426464f000000000000051e | 47.991 | 5.030 | n/a | 0.000 | 2.471 | 4.772 | 15.005 | 0.019 | n/a | 0.534 | 20.152 | n/a | n/a | 0.008 | 7.501 | 0.156 | 0.008 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 8.163ms; driver.publication.persist-deferred 2.632ms; driver.publication.persist-deferred 2.093ms; driver.publication.persist-deferred 1.225ms; driver.reader-basis.broadcast 0.402ms |
| 30448786e426464f000000000000110d | 44.048 | 2.096 | n/a | 0.000 | 29.635 | 0.660 | 1.046 | 0.012 | n/a | 0.072 | 10.513 | n/a | n/a | 0.013 | 31.731 | 0.720 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.062ms; driver.publication.persist-deferred 0.980ms; driver.publication.persist-deferred 0.908ms; driver.publication.persist-deferred 0.850ms; driver.publication.persist-deferred 0.835ms |
| 30448786e426464f0000000000000253 | 41.333 | 1.776 | n/a | 0.000 | 0.317 | 32.805 | 1.792 | 0.018 | n/a | 0.066 | 4.530 | n/a | n/a | 0.029 | 2.093 | 0.051 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.280ms; driver.publication.persist-deferred 0.450ms |
| 30448786e426464f000000000000062c | 40.265 | 1.491 | n/a | 0.000 | 27.192 | 0.553 | 1.265 | 0.022 | n/a | 0.219 | 9.507 | n/a | n/a | 0.015 | 28.683 | 0.712 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.238ms; driver.publication.persist-deferred 0.905ms; driver.publication.persist-deferred 0.732ms; driver.reader-basis.broadcast 0.088ms |
| 30448786e426464f00000000000002eb | 38.923 | 2.522 | n/a | 0.000 | 0.522 | 13.222 | 1.495 | 0.030 | n/a | 3.643 | 17.446 | n/a | n/a | 0.044 | 3.044 | 0.078 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.745ms; driver.publication.persist-deferred 1.149ms |
| 30448786e426464f0000000000000bf9 | 38.334 | 1.385 | n/a | 0.000 | 24.161 | 0.355 | 0.772 | 0.009 | n/a | 0.261 | 11.383 | n/a | n/a | 0.009 | 25.545 | 0.666 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.139ms; driver.publication.persist-deferred 1.099ms; driver.publication.persist-deferred 1.030ms |
| 30448786e426464f00000000000015b3 | 38.228 | 9.727 | n/a | 1.595 | 0.588 | 12.277 | 2.265 | 0.031 | n/a | 0.096 | 11.640 | n/a | n/a | 0.009 | 11.909 | 0.312 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.330ms; driver.publication.persist-deferred 1.291ms; driver.publication.persist-deferred 1.291ms; driver.publication.persist-deferred 1.279ms; driver.publication.persist-deferred 1.049ms |
| 30448786e426464f00000000000014b2 | 37.558 | 2.761 | n/a | 0.000 | 29.587 | 0.592 | 0.465 | 0.008 | n/a | 0.060 | 4.068 | n/a | n/a | 0.018 | 32.348 | 0.861 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.172ms; driver.publication.persist-deferred 1.130ms; driver.publication.persist-deferred 1.085ms; driver.publication.persist-deferred 1.026ms |
| 30448786e426464f0000000000000612 | 36.990 | 3.043 | n/a | 0.000 | 10.611 | 4.800 | 1.433 | 0.022 | n/a | 0.510 | 16.534 | n/a | n/a | 0.037 | 13.654 | 0.369 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 10.481ms |
| 30448786e426464f00000000000007a1 | 34.670 | 0.915 | n/a | 0.000 | 1.241 | 5.131 | 1.155 | 0.021 | n/a | 0.097 | 26.104 | n/a | n/a | 0.007 | 2.156 | 0.062 | 0.007 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.096ms |
| 30448786e426464f00000000000010a6 | 34.645 | 2.962 | n/a | 0.000 | 1.028 | 19.553 | 1.054 | 0.015 | n/a | 0.044 | 9.977 | n/a | n/a | 0.012 | 3.990 | 0.115 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.166ms; driver.publication.persist-deferred 0.817ms |
| 30448786e426464f0000000000000766 | 33.948 | 2.592 | n/a | 0.000 | 22.982 | 0.749 | 3.031 | 0.010 | n/a | 0.050 | 4.512 | n/a | n/a | 0.021 | 25.574 | 0.753 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.919ms; driver.publication.persist-deferred 1.125ms; driver.publication.persist-deferred 1.066ms; driver.publication.persist-deferred 0.774ms; driver.publication.persist-deferred 0.680ms |

## P1 / warmup / read (2018 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.017 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 294.626 | n/a | n/a | n/a | 0.289 | n/a | 0.000 | 294.406 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.188 | 294.625 | 1.000 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2486e5d888849bc000000000005d623 | 347.181 | 0.301 | n/a | 0.000 | 346.878 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 347.178 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| f2486e5d888849bc000000000005d624 | 347.015 | 0.042 | n/a | 0.000 | 346.972 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 347.014 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| f2486e5d888849bc000000000005d625 | 346.987 | 0.019 | n/a | 0.000 | 346.967 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 346.986 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| f2486e5d888849bc000000000005d626 | 346.979 | 0.016 | n/a | 0.000 | 346.961 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 346.978 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| f2486e5d888849bc000000000005d627 | 346.970 | 0.017 | n/a | 0.000 | 346.952 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 346.969 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 73e0c0df0a9216c0000000000005ef94 | 344.975 | 0.194 | n/a | 0.000 | 344.779 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.973 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 59cbc264f965fc6e0000000000062ce4 | 344.968 | 0.102 | n/a | 0.000 | 344.864 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.967 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.059ms |
| 59cbc264f965fc6e0000000000062ce3 | 344.945 | 0.014 | n/a | 0.000 | 344.930 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.944 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.059ms |
| 73e0c0df0a9216c0000000000005ef98 | 344.941 | 0.013 | n/a | 0.000 | 344.928 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 344.940 | 1.000 | 0.000 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 73e0c0df0a9216c0000000000005ef97 | 344.934 | 0.012 | n/a | 0.000 | 344.921 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.933 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 59cbc264f965fc6e0000000000062ce2 | 344.931 | 0.019 | n/a | 0.000 | 344.911 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.930 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.059ms |
| 73e0c0df0a9216c0000000000005ef96 | 344.926 | 0.014 | n/a | 0.000 | 344.912 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.926 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 73e0c0df0a9216c0000000000005ef95 | 344.926 | 0.032 | n/a | 0.000 | 344.893 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.925 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 59cbc264f965fc6e0000000000062ce1 | 344.888 | 0.123 | n/a | 0.000 | 344.763 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.886 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.059ms |
| 59cbc264f965fc6e0000000000062cfd | 344.649 | 0.040 | n/a | 0.000 | 344.608 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.648 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.059ms |
| 59cbc264f965fc6e0000000000062cfc | 344.636 | 0.024 | n/a | 0.000 | 344.611 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.635 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.059ms |
| 73e0c0df0a9216c000000000000013b2 | 294.658 | 0.248 | n/a | 0.000 | 294.406 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 294.654 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c000000000000013b6 | 294.654 | 0.016 | n/a | 0.000 | 294.637 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.653 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c000000000000013b5 | 294.642 | 0.016 | n/a | 0.000 | 294.625 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.641 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c000000000000013b4 | 294.633 | 0.017 | n/a | 0.000 | 294.614 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.631 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1 / read (744 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 270.476 | n/a | n/a | n/a | 0.177 | n/a | 0.000 | 270.277 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.065 | 270.473 | 1.000 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 59cbc264f965fc6e00000000000fd9e2 | 291.141 | 0.115 | n/a | 0.000 | 291.023 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.138 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e000000000010acd3 | 288.826 | 0.132 | n/a | 0.000 | 288.692 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.824 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e0000000000100002 | 283.882 | 0.084 | n/a | 0.000 | 283.795 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.880 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000000f1bfa | 280.882 | 0.194 | n/a | 0.000 | 280.684 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 280.878 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000000b3cbc | 277.551 | 0.095 | n/a | 0.000 | 277.452 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 277.547 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000000b1ea2 | 272.148 | 0.222 | n/a | 0.000 | 271.924 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.146 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e000000000011712d | 270.502 | 0.146 | n/a | 0.000 | 270.353 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.499 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000000f301b | 270.476 | 0.195 | n/a | 0.000 | 270.277 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.473 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 59cbc264f965fc6e00000000001284b3 | 270.245 | 0.177 | n/a | 0.000 | 270.066 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.242 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000000cee23 | 267.857 | 0.193 | n/a | 0.000 | 267.662 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.855 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e0000000000106b95 | 267.761 | 0.127 | n/a | 0.000 | 267.630 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 267.757 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000001368ab | 267.574 | 0.097 | n/a | 0.000 | 267.476 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.573 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e0000000000138aae | 266.857 | 0.209 | n/a | 0.000 | 266.645 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 266.854 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000001064a9 | 266.148 | 0.170 | n/a | 0.000 | 265.974 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 266.144 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e0000000000106b99 | 265.190 | 0.155 | n/a | 0.000 | 265.032 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 265.187 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 59cbc264f965fc6e0000000000104ab0 | 262.033 | 0.191 | n/a | 0.000 | 261.839 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 262.031 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e0000000000104ab1 | 173.106 | 0.150 | n/a | 0.000 | 172.941 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 173.090 | 1.000 | 0.015 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 59cbc264f965fc6e00000000000fdbae | 60.771 | 17.244 | n/a | 0.000 | 0.000 | 0.774 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.753 | 17.244 | 0.284 | 42.753 | node-14/thread-4/socket.wait-first-byte | replica.apply-delta 0.025ms |
| 59cbc264f965fc6e0000000000106bbf | 44.142 | 0.095 | n/a | 0.000 | 44.045 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 44.139 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.026ms |
| 59cbc264f965fc6e0000000000106ba2 | 27.886 | 0.087 | n/a | 0.000 | 27.797 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 27.884 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L4 / read (1888 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 272.081 | n/a | n/a | n/a | 0.192 | n/a | 0.000 | 271.931 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.138 | 272.078 | 1.000 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2486e5d888849bc00000000000e53b5 | 284.747 | 0.200 | n/a | 0.000 | 284.543 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 284.744 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.063ms |
| 59cbc264f965fc6e00000000001ad488 | 283.492 | 0.100 | n/a | 0.000 | 283.389 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.489 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 59cbc264f965fc6e00000000001ad48c | 283.414 | 0.026 | n/a | 0.000 | 283.386 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.412 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 73e0c0df0a9216c000000000000eaf97 | 283.171 | 0.102 | n/a | 0.000 | 283.067 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.169 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 73e0c0df0a9216c000000000000a9562 | 281.296 | 0.166 | n/a | 0.000 | 281.128 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.293 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| f2486e5d888849bc00000000000a5b4a | 281.125 | 0.154 | n/a | 0.000 | 280.969 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.123 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e0000000000160a14 | 280.761 | 0.144 | n/a | 0.000 | 280.613 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 280.757 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e0000000000160a15 | 280.741 | 0.024 | n/a | 0.000 | 280.715 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.740 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c000000000000bc6f5 | 279.926 | 0.156 | n/a | 0.000 | 279.766 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 279.922 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000001773c0 | 279.672 | 0.165 | n/a | 0.000 | 279.503 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 279.668 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f2486e5d888849bc00000000000b8380 | 279.652 | 0.103 | n/a | 0.000 | 279.546 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.649 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000001773cc | 278.469 | 0.037 | n/a | 0.000 | 278.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 278.464 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000001496f4 | 274.433 | 0.034 | n/a | 0.000 | 274.398 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.432 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e00000000001496f3 | 274.343 | 0.194 | n/a | 0.000 | 274.146 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.340 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c000000000000960f4 | 274.141 | 0.128 | n/a | 0.000 | 274.011 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.139 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| f2486e5d888849bc0000000000093096 | 273.942 | 0.143 | n/a | 0.000 | 273.792 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 273.935 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f2486e5d888849bc00000000001068d6 | 272.931 | 0.142 | n/a | 0.000 | 272.786 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.928 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 73e0c0df0a9216c0000000000010c298 | 272.917 | 0.105 | n/a | 0.000 | 272.810 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.916 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.075ms |
| 59cbc264f965fc6e00000000001d4cb4 | 272.081 | 0.148 | n/a | 0.000 | 271.931 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.078 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.117ms |
| f2486e5d888849bc00000000001140fc | 271.864 | 0.158 | n/a | 0.000 | 271.701 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 271.859 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |

## P1 / L16 / read (2139 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.029 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 |
| p99 | 296.904 | n/a | n/a | n/a | 0.184 | n/a | 0.000 | 296.873 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.207 | 296.903 | 1.000 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2486e5d888849bc0000000000133a6d | 336.242 | 0.272 | n/a | 0.000 | 335.967 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 336.239 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f2486e5d888849bc0000000000133a6e | 336.127 | 0.062 | n/a | 0.000 | 336.063 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 336.125 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f2486e5d888849bc0000000000133a8b | 335.168 | 0.045 | n/a | 0.000 | 335.121 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 335.166 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f2486e5d888849bc0000000000133a8d | 335.140 | 0.027 | n/a | 0.000 | 335.112 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 335.138 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f2486e5d888849bc0000000000133a8c | 335.135 | 0.017 | n/a | 0.000 | 335.116 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 335.134 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c0000000000013ae3b | 333.909 | 0.038 | n/a | 0.000 | 333.869 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.908 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c0000000000013ae3a | 333.908 | 0.175 | n/a | 0.000 | 333.731 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 333.906 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e000000000020784e | 333.291 | 0.013 | n/a | 0.000 | 333.277 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.290 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e000000000020784d | 333.283 | 0.014 | n/a | 0.000 | 333.268 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.282 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e000000000020784c | 333.269 | 0.022 | n/a | 0.000 | 333.245 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.268 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e0000000000207852 | 333.250 | 0.026 | n/a | 0.000 | 333.223 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.249 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e000000000020784b | 333.247 | 0.021 | n/a | 0.000 | 333.225 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.246 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c0000000000013ae67 | 333.242 | 0.013 | n/a | 0.000 | 333.229 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.241 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c0000000000013ae66 | 333.235 | 0.018 | n/a | 0.000 | 333.216 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.234 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 73e0c0df0a9216c0000000000013ae65 | 333.229 | 0.027 | n/a | 0.000 | 333.201 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.228 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e000000000020784a | 333.200 | 0.128 | n/a | 0.000 | 333.070 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 333.198 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 59cbc264f965fc6e000000000021f135 | 297.034 | 0.031 | n/a | 0.000 | 297.001 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.032 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 59cbc264f965fc6e000000000021f134 | 297.022 | 0.054 | n/a | 0.000 | 296.966 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.020 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 59cbc264f965fc6e000000000021f133 | 296.975 | 0.174 | n/a | 0.000 | 296.796 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 296.970 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| f2486e5d888849bc0000000000149872 | 296.916 | 0.029 | n/a | 0.000 | 296.886 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 296.915 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |

## P1 / tail / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 0.244 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2486e5d888849bc00000000001aa576 | 0.244 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | uncovered | none observed |
| f2486e5d888849bc00000000001aa577 | 0.118 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | uncovered | none observed |
| 59cbc264f965fc6e00000000002852cb | 0.073 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | uncovered | none observed |
| 73e0c0df0a9216c000000000001b48d0 | 0.041 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.041 | 0.000 | 0.000 | 0.041 | uncovered | none observed |
| 59cbc264f965fc6e00000000002852c6 | 0.038 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.038 | 0.000 | 0.000 | 0.038 | uncovered | none observed |
| 59cbc264f965fc6e00000000002852ca | 0.031 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 0.000 | 0.000 | 0.031 | uncovered | none observed |
| f2486e5d888849bc00000000001aa578 | 0.020 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 0.000 | 0.000 | 0.020 | uncovered | none observed |
| 59cbc264f965fc6e00000000002852c9 | 0.014 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 | uncovered | none observed |
| 59cbc264f965fc6e00000000002852c7 | 0.013 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 | uncovered | none observed |
| 59cbc264f965fc6e00000000002852c8 | 0.011 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 | uncovered | none observed |
| 73e0c0df0a9216c000000000001b48d1 | 0.011 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 | uncovered | none observed |
| 73e0c0df0a9216c000000000001b48d2 | 0.011 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 | uncovered | none observed |
| 73e0c0df0a9216c000000000001b48d3 | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 | uncovered | none observed |
| 73e0c0df0a9216c000000000001b48d4 | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 | uncovered | none observed |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.083 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.977 | 200.431 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 |
| p99 | 206.237 | n/a | n/a | n/a | 21.300 | n/a | 1.272 | 0.000 | 9.537 | 202.544 | 0.423 | n/a | 0.147 | 0.000 | n/a | n/a | 37.934 | 21.300 | 0.329 | 37.934 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d6a56d3d78f732350000000000000006 | 206.237 | 0.000 | n/a | 0.000 | 0.000 | 3.761 | 202.000 | 0.022 | n/a | 0.147 | 0.000 | n/a | n/a | 0.305 | 0.000 | 0.000 | 0.305 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f732350000000000000007 | 203.640 | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 202.544 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-41/journal/page | none observed |
| d6a56d3d78f732350000000000000005 | 203.592 | 0.000 | n/a | 0.000 | 0.000 | 1.977 | 201.242 | 0.022 | n/a | 0.146 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-60/journal/page | none observed |
| d6a56d3d78f732350000000000000f44 | 201.900 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 200.882 | 0.004 | n/a | 0.055 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| d6a56d3d78f732350000000000000f42 | 201.651 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 200.521 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-47/journal/page | none observed |
| d6a56d3d78f732350000000000000f43 | 201.083 | 0.000 | n/a | 0.000 | 0.000 | 0.523 | 200.431 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e6740000000000000002 | 95.019 | 0.000 | n/a | 0.000 | 0.000 | 4.604 | 89.486 | 0.423 | n/a | 0.077 | 0.000 | n/a | n/a | 0.429 | 0.000 | 0.000 | 0.429 | gw-r/thread-41/gateway.admitted-work | none observed |
| d6a56d3d78f732350000000000000f48 | 64.666 | 21.300 | n/a | 0.000 | 0.000 | 7.394 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.971 | 21.300 | 0.329 | 35.971 | node-14/thread-7/socket.wait-first-byte | none observed |
| d6a56d3d78f732350000000000000f47 | 63.577 | 16.106 | n/a | 0.000 | 0.000 | 9.537 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.934 | 16.106 | 0.253 | 37.934 | node-14/thread-7/socket.wait-first-byte | none observed |
| d6a56d3d78f732350000000000000f49 | 52.154 | 15.068 | n/a | 1.272 | 0.000 | 4.582 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.232 | 16.340 | 0.313 | 31.232 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1007.491 | n/a | n/a | n/a | 0.127 | n/a | 0.000 | 0.000 | 1.380 | 1001.621 | 0.019 | n/a | 0.164 | 0.000 | n/a | n/a | 1.111 | 0.127 | 0.000 | 1.111 |
| p99 | 1017.904 | n/a | n/a | n/a | 0.238 | n/a | 0.000 | 0.000 | 14.383 | 1004.700 | 0.019 | n/a | 0.309 | 0.000 | n/a | n/a | 1.333 | 0.238 | 0.000 | 1.333 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c41836092c07e6740000000000000017 | 1017.904 | 0.238 | n/a | 0.000 | 0.000 | 14.383 | 1001.621 | 0.019 | n/a | 0.309 | 0.000 | n/a | n/a | 1.333 | 0.238 | 0.000 | 1.333 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e6740000000000000018 | 1007.491 | 0.127 | n/a | 0.000 | 0.000 | 1.380 | 1004.700 | 0.019 | n/a | 0.164 | 0.000 | n/a | n/a | 1.101 | 0.127 | 0.000 | 1.101 | gw-r/thread-45/journal/page | none observed |
| c41836092c07e6740000000000000019 | 1002.516 | 0.119 | n/a | 0.000 | 0.000 | 0.557 | 1000.655 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 1.111 | 0.119 | 0.000 | 1.111 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 437.258 | n/a | n/a | n/a | 2.578 | n/a | 0.000 | 0.000 | 2.527 | 430.684 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.102 | 2.578 | 0.008 | 0.102 |
| p99 | 1005.935 | n/a | n/a | n/a | 21.244 | n/a | 2.532 | 0.000 | 6.980 | 1001.037 | 0.039 | n/a | 0.305 | 0.000 | n/a | n/a | 48.119 | 22.066 | 0.305 | 48.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c41836092c07e6740000000000000044 | 1005.935 | 0.123 | n/a | 0.000 | 0.000 | 1.261 | 1001.037 | 0.014 | n/a | 0.106 | 0.000 | n/a | n/a | 3.394 | 0.123 | 0.000 | 3.394 | gw-r/thread-45/journal/page | none observed |
| c41836092c07e6740000000000000030 | 1000.928 | 2.449 | n/a | 0.000 | 0.000 | 0.995 | 997.306 | 0.016 | n/a | 0.079 | 0.000 | n/a | n/a | 0.083 | 2.449 | 0.002 | 0.083 | gw-r/thread-66/journal/page | none observed |
| c41836092c07e674000000000000002f | 999.163 | 3.804 | n/a | 0.000 | 0.000 | 5.384 | 989.625 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.251 | 3.804 | 0.004 | 0.251 | gw-r/thread-46/journal/page | none observed |
| c41836092c07e6740000000000000023 | 986.898 | 2.402 | n/a | 0.000 | 0.000 | 0.980 | 983.320 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.088 | 2.402 | 0.002 | 0.088 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e6740000000000000029 | 981.118 | 2.578 | n/a | 0.000 | 0.000 | 3.064 | 975.276 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.083 | 2.578 | 0.003 | 0.083 | gw-r/thread-46/journal/page | none observed |
| c41836092c07e6740000000000000020 | 851.859 | 2.301 | n/a | 0.000 | 0.000 | 5.084 | 844.086 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.278 | 2.301 | 0.003 | 0.278 | gw-r/thread-45/journal/page | none observed |
| c41836092c07e674000000000000001d | 825.902 | 2.566 | n/a | 0.000 | 0.000 | 1.540 | 821.527 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.166 | 2.566 | 0.003 | 0.166 | gw-r/thread-65/journal/page | none observed |
| c41836092c07e6740000000000000036 | 806.217 | 19.533 | n/a | 2.532 | 0.000 | 2.846 | 781.032 | 0.039 | n/a | 0.107 | 0.000 | n/a | n/a | 0.126 | 22.066 | 0.027 | 0.126 | gw-r/thread-63/journal/page | none observed |
| c41836092c07e674000000000000003f | 672.527 | 2.423 | n/a | 0.000 | 0.000 | 6.120 | 663.751 | 0.018 | n/a | 0.125 | 0.000 | n/a | n/a | 0.091 | 2.423 | 0.004 | 0.091 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e6740000000000000027 | 660.482 | 10.517 | n/a | 0.000 | 0.000 | 1.664 | 648.058 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.130 | 10.517 | 0.016 | 0.130 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e674000000000000003e | 590.690 | 2.255 | n/a | 0.000 | 0.000 | 3.984 | 584.197 | 0.019 | n/a | 0.133 | 0.000 | n/a | n/a | 0.103 | 2.255 | 0.004 | 0.103 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e6740000000000000034 | 575.913 | 2.322 | n/a | 0.000 | 0.000 | 3.972 | 569.435 | 0.012 | n/a | 0.088 | 0.000 | n/a | n/a | 0.086 | 2.322 | 0.004 | 0.086 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e674000000000000003a | 546.985 | 2.396 | n/a | 0.000 | 0.000 | 1.463 | 542.972 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.086 | 2.396 | 0.004 | 0.086 | gw-r/thread-46/journal/page | none observed |
| c41836092c07e6740000000000000039 | 451.995 | 3.609 | n/a | 0.000 | 0.000 | 6.980 | 435.106 | 0.012 | n/a | 0.057 | 0.000 | n/a | n/a | 6.231 | 3.609 | 0.008 | 6.231 | gw-r/thread-62/journal/page | none observed |
| c41836092c07e674000000000000002b | 437.258 | 2.570 | n/a | 0.000 | 0.000 | 3.762 | 430.684 | 0.021 | n/a | 0.139 | 0.000 | n/a | n/a | 0.083 | 2.570 | 0.006 | 0.083 | gw-r/thread-62/journal/page | none observed |
| c41836092c07e674000000000000003c | 398.169 | 2.256 | n/a | 0.000 | 0.000 | 3.447 | 392.248 | 0.021 | n/a | 0.118 | 0.000 | n/a | n/a | 0.080 | 2.256 | 0.006 | 0.080 | gw-r/thread-63/journal/page | none observed |
| c41836092c07e674000000000000001c | 361.058 | 2.612 | n/a | 0.000 | 0.000 | 2.527 | 355.647 | 0.011 | n/a | 0.126 | 0.000 | n/a | n/a | 0.135 | 2.612 | 0.007 | 0.135 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e674000000000000002e | 319.912 | 12.663 | n/a | 0.000 | 0.000 | 0.718 | 306.352 | 0.012 | n/a | 0.081 | 0.000 | n/a | n/a | 0.085 | 12.663 | 0.040 | 0.085 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e6740000000000000026 | 305.561 | 4.076 | n/a | 0.000 | 0.000 | 1.151 | 300.145 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.088 | 4.076 | 0.013 | 0.088 | gw-r/thread-45/journal/page | none observed |
| c41836092c07e6740000000000000041 | 273.659 | 3.905 | n/a | 0.000 | 0.000 | 1.074 | 268.433 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.146 | 3.905 | 0.014 | 0.146 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 438.357 | n/a | n/a | n/a | 2.716 | n/a | 0.253 | 0.000 | 0.736 | 433.904 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.095 | 2.928 | 0.010 | 0.095 |
| p99 | 1009.075 | n/a | n/a | n/a | 14.232 | n/a | 2.514 | 0.000 | 6.785 | 1005.561 | 0.064 | n/a | 0.517 | 0.000 | n/a | n/a | 39.825 | 14.629 | 0.591 | 39.825 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c41836092c07e6740000000000000047 | 1009.075 | 2.593 | n/a | 0.000 | 0.000 | 0.708 | 1005.561 | 0.042 | n/a | 0.081 | 0.000 | n/a | n/a | 0.090 | 2.593 | 0.003 | 0.090 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e6740000000000000072 | 1006.426 | 6.830 | n/a | 0.307 | 0.000 | 1.706 | 997.428 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.083 | 7.138 | 0.007 | 0.083 | gw-r/thread-64/journal/page | none observed |
| c41836092c07e6740000000000000081 | 1005.183 | 0.107 | n/a | 0.000 | 0.000 | 0.460 | 1003.474 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 1.099 | 0.107 | 0.000 | 1.099 | gw-r/thread-44/journal/page | none observed |
| c41836092c07e674000000000000004e | 999.315 | 6.459 | n/a | 0.284 | 0.000 | 0.743 | 991.562 | 0.024 | n/a | 0.115 | 0.000 | n/a | n/a | 0.127 | 6.743 | 0.007 | 0.127 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e674000000000000004d | 999.069 | 5.600 | n/a | 0.540 | 0.000 | 0.560 | 992.188 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.126 | 6.140 | 0.006 | 0.126 | gw-r/thread-65/journal/page | none observed |
| c41836092c07e6740000000000000079 | 997.696 | 2.909 | n/a | 0.000 | 0.000 | 0.499 | 993.631 | 0.064 | n/a | 0.100 | 0.000 | n/a | n/a | 0.491 | 2.909 | 0.003 | 0.491 | gw-r/thread-63/journal/page | none observed |
| c41836092c07e6740000000000000053 | 994.974 | 2.713 | n/a | 0.255 | 0.000 | 0.904 | 990.937 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.074 | 2.969 | 0.003 | 0.074 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e6740000000000000046 | 984.269 | 2.538 | n/a | 0.000 | 0.000 | 2.513 | 979.004 | 0.018 | n/a | 0.113 | 0.000 | n/a | n/a | 0.083 | 2.538 | 0.003 | 0.083 | gw-r/thread-64/journal/page | none observed |
| c41836092c07e6740000000000000075 | 980.560 | 2.446 | n/a | 0.000 | 0.000 | 0.467 | 977.445 | 0.022 | n/a | 0.099 | 0.000 | n/a | n/a | 0.080 | 2.446 | 0.002 | 0.080 | gw-r/thread-66/journal/page | none observed |
| c41836092c07e6740000000000000052 | 841.429 | 2.318 | n/a | 0.263 | 0.000 | 0.636 | 837.612 | 0.012 | n/a | 0.517 | 0.000 | n/a | n/a | 0.072 | 2.581 | 0.003 | 0.072 | gw-r/thread-64/journal/page | none observed |
| c41836092c07e6740000000000000054 | 821.480 | 3.465 | n/a | 0.373 | 0.000 | 3.651 | 813.815 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 0.079 | 3.838 | 0.005 | 0.079 | gw-r/thread-41/journal/page | none observed |
| c41836092c07e6740000000000000076 | 812.806 | 2.404 | n/a | 0.294 | 0.000 | 0.726 | 809.224 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.068 | 2.698 | 0.003 | 0.068 | gw-r/thread-46/journal/page | none observed |
| c41836092c07e6740000000000000059 | 799.951 | 3.724 | n/a | 0.283 | 0.000 | 1.797 | 794.006 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.079 | 4.007 | 0.005 | 0.079 | gw-r/thread-60/journal/page | none observed |
| c41836092c07e6740000000000000050 | 659.370 | 2.656 | n/a | 0.253 | 0.000 | 3.313 | 652.983 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.079 | 2.909 | 0.004 | 0.079 | gw-r/thread-60/journal/page | none observed |
| c41836092c07e674000000000000005f | 641.721 | 2.263 | n/a | 0.000 | 0.000 | 1.218 | 638.034 | 0.010 | n/a | 0.124 | 0.000 | n/a | n/a | 0.071 | 2.263 | 0.004 | 0.071 | gw-r/thread-66/journal/page | none observed |
| c41836092c07e674000000000000006f | 612.829 | 4.843 | n/a | 0.000 | 0.000 | 2.273 | 603.813 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 1.816 | 4.843 | 0.008 | 1.816 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e674000000000000005c | 557.518 | 8.760 | n/a | 2.514 | 0.000 | 6.785 | 539.229 | 0.017 | n/a | 0.100 | 0.000 | n/a | n/a | 0.113 | 11.275 | 0.020 | 0.113 | gw-r/thread-62/journal/page | none observed |
| c41836092c07e674000000000000004f | 516.351 | 7.893 | n/a | 0.679 | 0.000 | 0.558 | 504.865 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 2.283 | 8.573 | 0.017 | 2.283 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e674000000000000007c | 469.404 | 11.573 | n/a | 0.355 | 0.000 | 0.578 | 456.542 | 0.021 | n/a | 0.135 | 0.000 | n/a | n/a | 0.201 | 11.928 | 0.025 | 0.201 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e674000000000000004a | 445.881 | 3.866 | n/a | 0.359 | 0.000 | 0.840 | 440.658 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.114 | 4.226 | 0.009 | 0.114 | gw-r/thread-64/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 361.578 | n/a | n/a | n/a | 2.957 | n/a | 0.000 | 0.000 | 1.501 | 358.553 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.072 | 3.023 | 0.008 | 0.072 |
| p99 | 1022.481 | n/a | n/a | n/a | 10.199 | n/a | 3.765 | 0.000 | 5.976 | 1008.495 | 0.042 | n/a | 1.250 | 0.000 | n/a | n/a | 43.473 | 10.603 | 0.256 | 43.473 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c41836092c07e6740000000000000089 | 1022.481 | 7.844 | n/a | 0.000 | 0.000 | 5.976 | 1008.495 | 0.015 | n/a | 0.075 | 0.000 | n/a | n/a | 0.075 | 7.844 | 0.008 | 0.075 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e674000000000000009f | 1007.587 | 0.129 | n/a | 0.000 | 0.000 | 2.142 | 1002.291 | 0.023 | n/a | 0.082 | 0.000 | n/a | n/a | 2.920 | 0.129 | 0.000 | 2.920 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e6740000000000000091 | 1003.782 | 0.115 | n/a | 0.000 | 0.000 | 0.690 | 1000.594 | 0.023 | n/a | 1.250 | 0.000 | n/a | n/a | 1.110 | 0.115 | 0.000 | 1.110 | gw-r/thread-60/journal/page | none observed |
| c41836092c07e674000000000000009b | 1000.537 | 2.087 | n/a | 0.000 | 0.000 | 2.941 | 995.347 | 0.018 | n/a | 0.086 | 0.000 | n/a | n/a | 0.059 | 2.087 | 0.002 | 0.059 | gw-r/thread-65/journal/page | none observed |
| c41836092c07e67400000000000000ad | 996.473 | 2.348 | n/a | 0.000 | 0.000 | 1.501 | 992.507 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.057 | 2.348 | 0.002 | 0.057 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e67400000000000000a1 | 972.870 | 8.005 | n/a | 0.000 | 0.000 | 2.294 | 962.288 | 0.016 | n/a | 0.111 | 0.000 | n/a | n/a | 0.155 | 8.005 | 0.008 | 0.155 | gw-r/thread-64/journal/page | none observed |
| c41836092c07e67400000000000000b5 | 955.572 | 3.721 | n/a | 0.000 | 0.000 | 1.502 | 950.196 | 0.006 | n/a | 0.075 | 0.000 | n/a | n/a | 0.072 | 3.721 | 0.004 | 0.072 | gw-r/thread-63/journal/page | none observed |
| c41836092c07e6740000000000000086 | 844.667 | 3.303 | n/a | 0.000 | 0.000 | 1.640 | 839.572 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.072 | 3.303 | 0.004 | 0.072 | gw-r/thread-46/journal/page | none observed |
| c41836092c07e674000000000000009c | 752.042 | 5.363 | n/a | 0.000 | 0.000 | 2.073 | 744.356 | 0.036 | n/a | 0.116 | 0.000 | n/a | n/a | 0.098 | 5.363 | 0.007 | 0.098 | gw-r/thread-65/journal/page | none observed |
| c41836092c07e67400000000000000be | 720.420 | 2.114 | n/a | 0.000 | 0.000 | 4.729 | 713.448 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.064 | 2.114 | 0.003 | 0.064 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e67400000000000000a9 | 719.736 | 3.239 | n/a | 1.479 | 0.000 | 4.263 | 710.604 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.072 | 4.718 | 0.007 | 0.072 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e67400000000000000b3 | 714.199 | 3.023 | n/a | 0.000 | 0.000 | 1.618 | 709.419 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.067 | 3.023 | 0.004 | 0.067 | gw-r/thread-45/journal/page | none observed |
| c41836092c07e67400000000000000aa | 676.157 | 4.545 | n/a | 0.000 | 0.000 | 0.962 | 670.540 | 0.012 | n/a | 0.034 | 0.000 | n/a | n/a | 0.064 | 4.545 | 0.007 | 0.064 | gw-r/thread-62/journal/page | none observed |
| c41836092c07e6740000000000000083 | 663.216 | 2.219 | n/a | 0.308 | 0.000 | 2.376 | 658.166 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.061 | 2.528 | 0.004 | 0.061 | gw-r/thread-41/journal/page | none observed |
| c41836092c07e674000000000000009a | 660.763 | 2.353 | n/a | 0.000 | 0.000 | 0.817 | 657.434 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.060 | 2.353 | 0.004 | 0.060 | gw-r/thread-44/journal/page | none observed |
| c41836092c07e67400000000000000a4 | 633.390 | 2.957 | n/a | 0.000 | 0.000 | 0.972 | 629.305 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.061 | 2.957 | 0.005 | 0.061 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e67400000000000000b7 | 619.256 | 4.262 | n/a | 0.000 | 0.000 | 0.663 | 614.186 | 0.016 | n/a | 0.050 | 0.000 | n/a | n/a | 0.078 | 4.262 | 0.007 | 0.078 | gw-r/thread-66/journal/page | none observed |
| c41836092c07e67400000000000000ae | 577.245 | 9.867 | n/a | 0.000 | 0.000 | 1.395 | 565.813 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.120 | 9.867 | 0.017 | 0.120 | gw-r/thread-65/journal/page | none observed |
| c41836092c07e6740000000000000093 | 448.804 | 2.628 | n/a | 0.000 | 0.000 | 0.998 | 444.955 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.152 | 2.628 | 0.006 | 0.152 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e67400000000000000b0 | 422.401 | 2.459 | n/a | 0.000 | 0.000 | 2.885 | 416.926 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.059 | 2.459 | 0.006 | 0.059 | gw-r/thread-62/journal/page | none observed |

## P3 / L16 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.165 | n/a | n/a | n/a | 2.576 | n/a | 0.000 | 0.000 | 1.208 | 418.683 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.072 | 2.576 | 0.007 | 0.072 |
| p99 | 1021.883 | n/a | n/a | n/a | 17.339 | n/a | 3.926 | 0.000 | 8.085 | 1006.726 | 0.019 | n/a | 0.084 | 0.000 | n/a | n/a | 18.736 | 17.339 | 0.567 | 18.736 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c41836092c07e67400000000000000c9 | 1021.883 | 17.339 | n/a | 0.000 | 0.000 | 1.983 | 1002.299 | 0.012 | n/a | 0.080 | 0.000 | n/a | n/a | 0.171 | 17.339 | 0.017 | 0.171 | gw-r/thread-44/journal/page | none observed |
| c41836092c07e67400000000000000f2 | 1011.795 | 0.112 | n/a | 0.000 | 0.000 | 5.832 | 1004.660 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 1.106 | 0.112 | 0.000 | 1.106 | gw-r/thread-60/journal/page | none observed |
| c41836092c07e67400000000000000d9 | 1009.495 | 2.161 | n/a | 0.000 | 0.000 | 0.509 | 1006.726 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.057 | 2.161 | 0.002 | 0.057 | gw-r/thread-46/journal/page | none observed |
| c41836092c07e67400000000000000f9 | 1006.754 | 7.946 | n/a | 0.000 | 0.000 | 1.171 | 997.516 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.066 | 7.946 | 0.008 | 0.066 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e67400000000000000e2 | 1002.552 | 2.237 | n/a | 0.000 | 0.000 | 0.671 | 999.536 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.060 | 2.237 | 0.002 | 0.060 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e67400000000000000fa | 990.100 | 4.709 | n/a | 0.000 | 0.000 | 1.979 | 983.228 | 0.013 | n/a | 0.062 | 0.000 | n/a | n/a | 0.110 | 4.709 | 0.005 | 0.110 | gw-r/thread-60/journal/page | none observed |
| c41836092c07e67400000000000000e8 | 934.103 | 2.647 | n/a | 0.000 | 0.000 | 0.852 | 930.448 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.063 | 2.647 | 0.003 | 0.063 | gw-r/thread-66/journal/page | none observed |
| c41836092c07e67400000000000000cf | 823.957 | 5.359 | n/a | 0.579 | 0.000 | 0.292 | 817.484 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.193 | 5.938 | 0.007 | 0.193 | gw-r/thread-44/journal/page | none observed |
| c41836092c07e67400000000000000ee | 813.781 | 6.090 | n/a | 0.000 | 0.000 | 1.504 | 805.277 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.843 | 6.090 | 0.007 | 0.843 | gw-r/thread-66/journal/page | none observed |
| c41836092c07e67400000000000000ca | 807.834 | 1.903 | n/a | 0.000 | 0.000 | 0.985 | 804.817 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.066 | 1.903 | 0.002 | 0.066 | gw-r/thread-64/journal/page | none observed |
| c41836092c07e67400000000000000c4 | 625.241 | 4.399 | n/a | 0.000 | 0.000 | 0.404 | 620.271 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.116 | 4.399 | 0.007 | 0.116 | gw-r/thread-41/journal/page | none observed |
| c41836092c07e67400000000000000e1 | 623.882 | 2.431 | n/a | 0.000 | 0.000 | 3.158 | 617.499 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.730 | 2.431 | 0.004 | 0.730 | gw-r/thread-65/journal/page | none observed |
| c41836092c07e67400000000000000f7 | 613.692 | 2.461 | n/a | 0.000 | 0.000 | 0.641 | 610.456 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.076 | 2.461 | 0.004 | 0.076 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e67400000000000000ea | 588.582 | 2.576 | n/a | 0.000 | 0.000 | 2.692 | 583.199 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.060 | 2.576 | 0.004 | 0.060 | gw-r/thread-63/journal/page | none observed |
| c41836092c07e67400000000000000fc | 564.839 | 2.254 | n/a | 0.000 | 0.000 | 3.071 | 559.407 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.057 | 2.254 | 0.004 | 0.057 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e67400000000000000f0 | 550.365 | 2.640 | n/a | 0.000 | 0.000 | 2.878 | 544.724 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.073 | 2.640 | 0.005 | 0.073 | gw-r/thread-63/journal/page | none observed |
| c41836092c07e67400000000000000e5 | 546.144 | 2.505 | n/a | 0.000 | 0.000 | 0.641 | 542.878 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.062 | 2.505 | 0.005 | 0.062 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e67400000000000000da | 545.548 | 5.760 | n/a | 0.347 | 0.000 | 0.628 | 538.680 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.071 | 6.106 | 0.011 | 0.071 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e67400000000000000fb | 444.882 | 2.133 | n/a | 0.000 | 0.000 | 1.742 | 440.905 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.067 | 2.133 | 0.005 | 0.067 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e67400000000000000db | 440.939 | 2.346 | n/a | 0.000 | 0.000 | 0.606 | 437.858 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.055 | 2.346 | 0.005 | 0.055 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / internal (3119 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.356 | n/a | n/a | n/a | 4.150 | n/a | 0.000 | 0.000 | 0.235 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.787 | 4.171 | 0.339 | 5.787 |
| p99 | 804.689 | n/a | n/a | n/a | 18.187 | n/a | 1.200 | 0.000 | 1.396 | 797.752 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 46.885 | 19.360 | 0.849 | 46.885 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c41836092c07e6740000000000000136 | 1007.441 | 2.356 | n/a | 0.000 | 0.000 | 1.121 | 1003.859 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.056 | 2.356 | 0.002 | 0.056 | gw-r/thread-41/journal/page | none observed |
| c41836092c07e6740000000000001a3d | 1003.416 | 0.127 | n/a | 0.000 | 0.000 | 1.163 | 1000.846 | 0.006 | n/a | 0.103 | 0.000 | n/a | n/a | 1.172 | 0.127 | 0.000 | 1.172 | gw-r/thread-44/journal/page | none observed |
| c41836092c07e6740000000000001a39 | 1003.093 | 4.410 | n/a | 0.000 | 0.000 | 0.552 | 998.017 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.077 | 4.410 | 0.004 | 0.077 | gw-r/thread-60/journal/page | none observed |
| c41836092c07e6740000000000000183 | 1003.047 | 2.303 | n/a | 0.000 | 0.000 | 0.440 | 1000.193 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.067 | 2.303 | 0.002 | 0.067 | gw-r/thread-60/journal/page | none observed |
| c41836092c07e67400000000000019f3 | 1002.443 | 3.221 | n/a | 0.000 | 0.000 | 0.343 | 998.757 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.094 | 3.221 | 0.003 | 0.094 | gw-r/thread-46/journal/page | none observed |
| c41836092c07e6740000000000000170 | 1000.578 | 5.494 | n/a | 0.000 | 0.000 | 0.790 | 994.145 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.101 | 5.494 | 0.005 | 0.101 | gw-r/thread-44/journal/page | none observed |
| c41836092c07e674000000000000011a | 1000.271 | 5.154 | n/a | 0.000 | 0.000 | 0.828 | 994.140 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.106 | 5.154 | 0.005 | 0.106 | gw-r/thread-64/journal/page | none observed |
| c41836092c07e6740000000000000184 | 999.346 | 2.146 | n/a | 0.000 | 0.000 | 1.087 | 996.024 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.054 | 2.146 | 0.002 | 0.054 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e6740000000000000188 | 999.202 | 2.512 | n/a | 0.000 | 0.000 | 0.650 | 995.917 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.063 | 2.512 | 0.003 | 0.063 | gw-r/thread-47/journal/page | none observed |
| c41836092c07e6740000000000000195 | 997.906 | 5.598 | n/a | 0.000 | 0.000 | 1.822 | 990.312 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.112 | 5.598 | 0.006 | 0.112 | gw-r/thread-65/journal/page | none observed |
| c41836092c07e6740000000000000137 | 997.516 | 3.246 | n/a | 0.000 | 0.000 | 0.898 | 993.228 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.065 | 3.246 | 0.003 | 0.065 | gw-r/thread-60/journal/page | none observed |
| c41836092c07e67400000000000000fe | 997.340 | 2.622 | n/a | 0.000 | 0.000 | 0.493 | 994.106 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.060 | 2.622 | 0.003 | 0.060 | gw-r/thread-45/journal/page | none observed |
| c41836092c07e6740000000000000189 | 992.534 | 2.139 | n/a | 0.000 | 0.000 | 0.520 | 989.782 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.058 | 2.139 | 0.002 | 0.058 | gw-r/thread-63/journal/page | none observed |
| c41836092c07e67400000000000019fb | 987.399 | 2.575 | n/a | 0.000 | 0.000 | 0.513 | 984.223 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.053 | 2.575 | 0.003 | 0.053 | gw-r/thread-46/journal/page | none observed |
| c41836092c07e674000000000000010d | 981.067 | 3.722 | n/a | 0.000 | 0.000 | 0.609 | 976.558 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.104 | 3.722 | 0.004 | 0.104 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e674000000000000015c | 980.209 | 2.175 | n/a | 0.000 | 0.000 | 0.510 | 977.406 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.061 | 2.175 | 0.002 | 0.061 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e67400000000000019f7 | 979.129 | 4.981 | n/a | 0.000 | 0.000 | 0.474 | 973.458 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.188 | 4.981 | 0.005 | 0.188 | gw-r/thread-48/journal/page | none observed |
| c41836092c07e6740000000000001a05 | 972.869 | 8.950 | n/a | 0.000 | 0.000 | 0.289 | 963.272 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.313 | 8.950 | 0.009 | 0.313 | gw-r/thread-64/journal/page | none observed |
| c41836092c07e6740000000000000187 | 972.675 | 4.642 | n/a | 0.000 | 0.000 | 0.584 | 967.304 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.092 | 4.642 | 0.005 | 0.092 | gw-r/thread-43/journal/page | none observed |
| c41836092c07e6740000000000001a14 | 965.736 | 2.203 | n/a | 0.000 | 0.000 | 0.295 | 963.157 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.056 | 2.203 | 0.002 | 0.056 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.508 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.266 | 200.937 | 0.014 | n/a | 0.131 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 211.030 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 14.240 | 205.816 | 10.033 | n/a | 3.504 | 0.000 | n/a | n/a | 0.401 | 0.000 | 0.000 | 0.401 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d6a56d3d78f73235000000000000002a | 211.030 | 0.000 | n/a | 0.000 | 0.000 | 4.985 | 205.816 | 0.018 | n/a | 0.114 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f73235000000000000003a | 208.689 | 0.000 | n/a | 0.000 | 0.000 | 6.721 | 201.663 | 0.014 | n/a | 0.136 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| d6a56d3d78f732350000000000000009 | 206.790 | 0.000 | n/a | 0.000 | 0.000 | 4.872 | 201.371 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.401 | 0.000 | 0.000 | 0.401 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f73235000000000000003f | 206.225 | 0.000 | n/a | 0.000 | 0.000 | 1.560 | 204.296 | 0.014 | n/a | 0.154 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f73235000000000000001a | 205.830 | 0.000 | n/a | 0.000 | 0.000 | 1.306 | 204.226 | 0.024 | n/a | 0.153 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| d6a56d3d78f732350000000000000017 | 205.597 | 0.000 | n/a | 0.000 | 0.000 | 4.470 | 200.846 | 0.012 | n/a | 0.130 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f732350000000000000023 | 205.441 | 0.000 | n/a | 0.000 | 0.000 | 3.526 | 201.546 | 0.019 | n/a | 0.183 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-48/journal/page | none observed |
| d6a56d3d78f732350000000000000019 | 205.155 | 0.000 | n/a | 0.000 | 0.000 | 3.658 | 201.250 | 0.017 | n/a | 0.132 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-64/journal/page | none observed |
| d6a56d3d78f732350000000000000043 | 205.105 | 0.000 | n/a | 0.000 | 0.000 | 0.936 | 201.720 | 2.180 | n/a | 0.072 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-44/journal/page | none observed |
| d6a56d3d78f73235000000000000000d | 205.076 | 0.000 | n/a | 0.000 | 0.000 | 3.958 | 200.813 | 0.012 | n/a | 0.129 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f732350000000000000032 | 204.971 | 0.000 | n/a | 0.000 | 0.000 | 3.472 | 201.129 | 0.029 | n/a | 0.200 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-62/journal/page | none observed |
| d6a56d3d78f73235000000000000002e | 204.932 | 0.000 | n/a | 0.000 | 0.000 | 1.838 | 202.707 | 0.038 | n/a | 0.199 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| d6a56d3d78f732350000000000000008 | 204.762 | 0.000 | n/a | 0.000 | 0.000 | 2.418 | 201.923 | 0.022 | n/a | 0.246 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-45/journal/page | none observed |
| d6a56d3d78f732350000000000000057 | 204.750 | 0.000 | n/a | 0.000 | 0.000 | 3.601 | 200.912 | 0.014 | n/a | 0.115 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-41/journal/page | none observed |
| d6a56d3d78f73235000000000000000e | 204.697 | 0.000 | n/a | 0.000 | 0.000 | 3.494 | 200.887 | 0.012 | n/a | 0.136 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-62/journal/page | none observed |
| d6a56d3d78f73235000000000000004a | 204.562 | 0.000 | n/a | 0.000 | 0.000 | 2.632 | 201.685 | 0.017 | n/a | 0.137 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-45/journal/page | none observed |
| d6a56d3d78f732350000000000000025 | 204.393 | 0.000 | n/a | 0.000 | 0.000 | 1.993 | 202.113 | 0.032 | n/a | 0.156 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-41/journal/page | none observed |
| d6a56d3d78f73235000000000000004e | 204.214 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 203.217 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f73235000000000000001d | 204.189 | 0.000 | n/a | 0.000 | 0.000 | 2.360 | 201.157 | 0.035 | n/a | 0.515 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |
| d6a56d3d78f73235000000000000003d | 204.157 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 202.708 | 0.021 | n/a | 0.190 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.022 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 200.878 | 0.013 | n/a | 0.097 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 |
| p99 | 221.978 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.603 | 220.086 | 16.958 | n/a | 3.992 | 0.000 | n/a | n/a | 50.548 | 0.000 | 0.000 | 50.548 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d6a56d3d78f732350000000000000077 | 221.978 | 0.000 | n/a | 0.000 | 0.000 | 1.625 | 220.086 | 0.036 | n/a | 0.136 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-63/journal/page | none observed |
| d6a56d3d78f73235000000000000008e | 206.960 | 0.000 | n/a | 0.000 | 0.000 | 0.852 | 188.911 | 16.958 | n/a | 0.029 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-64/journal/page | none observed |
| d6a56d3d78f73235000000000000008d | 206.777 | 0.000 | n/a | 0.000 | 0.000 | 4.189 | 202.334 | 0.018 | n/a | 0.149 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| d6a56d3d78f73235000000000000007b | 206.331 | 0.000 | n/a | 0.000 | 0.000 | 1.201 | 201.194 | 0.054 | n/a | 3.785 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f732350000000000000081 | 205.823 | 0.000 | n/a | 0.000 | 0.000 | 4.151 | 201.409 | 0.015 | n/a | 0.124 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| d6a56d3d78f73235000000000000008f | 205.601 | 0.000 | n/a | 0.000 | 0.000 | 4.374 | 201.021 | 0.015 | n/a | 0.090 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-64/journal/page | none observed |
| d6a56d3d78f732350000000000000072 | 205.467 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 203.954 | 0.020 | n/a | 0.138 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| d6a56d3d78f732350000000000000070 | 205.376 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 204.330 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-41/journal/page | none observed |
| d6a56d3d78f73235000000000000005e | 205.220 | 0.000 | n/a | 0.000 | 0.000 | 2.056 | 202.909 | 0.018 | n/a | 0.140 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-62/journal/page | none observed |
| d6a56d3d78f732350000000000000059 | 204.579 | 0.000 | n/a | 0.000 | 0.000 | 3.604 | 200.749 | 0.011 | n/a | 0.112 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f7323500000000000000bc | 203.976 | 0.000 | n/a | 0.000 | 0.000 | 0.589 | 203.201 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f732350000000000000078 | 203.688 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 202.531 | 0.011 | n/a | 0.117 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f732350000000000000083 | 203.664 | 0.000 | n/a | 0.000 | 0.000 | 2.104 | 201.288 | 0.011 | n/a | 0.119 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f732350000000000000085 | 203.586 | 0.000 | n/a | 0.000 | 0.000 | 1.077 | 202.284 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| d6a56d3d78f732350000000000000064 | 203.397 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 198.570 | 0.022 | n/a | 3.992 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-63/journal/page | none observed |
| d6a56d3d78f7323500000000000000a6 | 203.340 | 0.000 | n/a | 0.000 | 0.000 | 1.122 | 202.041 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-44/journal/page | none observed |
| d6a56d3d78f7323500000000000000bd | 203.231 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 202.173 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f73235000000000000007a | 203.120 | 0.000 | n/a | 0.000 | 0.000 | 1.106 | 201.759 | 0.014 | n/a | 0.139 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-41/journal/page | none observed |
| d6a56d3d78f7323500000000000000a4 | 202.953 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 201.705 | 0.020 | n/a | 0.174 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| d6a56d3d78f7323500000000000000bb | 202.923 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.816 | 0.016 | n/a | 0.109 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.197 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 200.918 | 0.015 | n/a | 0.105 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 |
| p99 | 214.175 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 10.982 | 204.896 | 25.551 | n/a | 3.180 | 0.000 | n/a | n/a | 3.256 | 0.000 | 0.000 | 3.256 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d6a56d3d78f7323500000000000000e8 | 214.175 | 0.000 | n/a | 0.000 | 0.000 | 10.982 | 202.849 | 0.039 | n/a | 0.168 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-63/journal/page | none observed |
| d6a56d3d78f7323500000000000000c6 | 213.909 | 0.000 | n/a | 0.000 | 0.000 | 10.007 | 203.612 | 0.021 | n/a | 0.165 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f7323500000000000000e6 | 210.641 | 0.000 | n/a | 0.000 | 0.000 | 3.111 | 203.141 | 4.228 | n/a | 0.035 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f73235000000000000011b | 207.647 | 0.000 | n/a | 0.000 | 0.000 | 2.564 | 204.861 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f7323500000000000000d6 | 206.922 | 0.000 | n/a | 0.000 | 0.000 | 2.090 | 204.560 | 0.020 | n/a | 0.111 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f732350000000000000109 | 206.067 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 204.896 | 0.031 | n/a | 0.112 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f732350000000000000117 | 205.929 | 0.000 | n/a | 0.000 | 0.000 | 4.592 | 201.085 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| d6a56d3d78f7323500000000000000e5 | 205.866 | 0.000 | n/a | 0.000 | 0.000 | 1.152 | 204.444 | 0.021 | n/a | 0.139 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-41/journal/page | none observed |
| d6a56d3d78f732350000000000000111 | 205.633 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 204.646 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| d6a56d3d78f7323500000000000000c3 | 205.375 | 0.000 | n/a | 0.000 | 0.000 | 1.004 | 201.004 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 3.256 | 0.000 | 0.000 | 3.256 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f73235000000000000010f | 205.041 | 0.000 | n/a | 0.000 | 0.000 | 3.670 | 201.125 | 0.017 | n/a | 0.112 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-60/journal/page | none observed |
| d6a56d3d78f73235000000000000010c | 205.031 | 0.000 | n/a | 0.000 | 0.000 | 3.976 | 200.861 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f7323500000000000000cb | 204.918 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 203.950 | 0.014 | n/a | 0.098 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-41/journal/page | none observed |
| d6a56d3d78f7323500000000000000f0 | 204.821 | 0.000 | n/a | 0.000 | 0.000 | 3.676 | 200.885 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-62/journal/page | none observed |
| d6a56d3d78f7323500000000000000fc | 204.427 | 0.000 | n/a | 0.000 | 0.000 | 3.094 | 201.046 | 0.016 | n/a | 0.136 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-63/journal/page | none observed |
| d6a56d3d78f7323500000000000000e0 | 204.109 | 0.000 | n/a | 0.000 | 0.000 | 2.722 | 201.137 | 0.018 | n/a | 0.123 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f732350000000000000119 | 204.082 | 0.000 | n/a | 0.000 | 0.000 | 1.187 | 202.675 | 0.007 | n/a | 0.112 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-60/journal/page | none observed |
| d6a56d3d78f7323500000000000000d7 | 203.993 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 202.661 | 0.039 | n/a | 0.093 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f7323500000000000000da | 203.915 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 202.556 | 0.016 | n/a | 0.127 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-63/journal/page | none observed |
| d6a56d3d78f7323500000000000000fa | 203.677 | 0.000 | n/a | 0.000 | 0.000 | 2.448 | 200.948 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-62/journal/page | none observed |

## P3 / L16 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.758 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 200.787 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 216.815 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.398 | 215.776 | 11.540 | n/a | 2.294 | 0.000 | n/a | n/a | 51.770 | 0.000 | 0.000 | 51.770 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d6a56d3d78f732350000000000000137 | 216.815 | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 215.776 | 0.032 | n/a | 0.103 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f732350000000000000128 | 210.114 | 0.000 | n/a | 0.000 | 0.000 | 5.877 | 203.945 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| d6a56d3d78f73235000000000000012c | 206.748 | 0.000 | n/a | 0.000 | 0.000 | 4.670 | 201.824 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f732350000000000000164 | 206.253 | 0.000 | n/a | 0.000 | 0.000 | 5.080 | 200.948 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| d6a56d3d78f73235000000000000012d | 205.935 | 0.000 | n/a | 0.000 | 0.000 | 1.279 | 204.459 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-60/journal/page | none observed |
| d6a56d3d78f73235000000000000017e | 205.634 | 0.000 | n/a | 0.000 | 0.000 | 2.313 | 203.051 | 0.025 | n/a | 0.146 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |
| d6a56d3d78f732350000000000000183 | 204.720 | 0.000 | n/a | 0.000 | 0.000 | 2.889 | 201.637 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f73235000000000000015e | 204.222 | 0.000 | n/a | 0.000 | 0.000 | 3.662 | 196.951 | 3.365 | n/a | 0.044 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-44/journal/page | none observed |
| d6a56d3d78f732350000000000000181 | 204.143 | 0.000 | n/a | 0.000 | 0.000 | 2.932 | 201.022 | 0.006 | n/a | 0.082 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| d6a56d3d78f732350000000000000150 | 203.932 | 0.000 | n/a | 0.000 | 0.000 | 2.885 | 200.854 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| d6a56d3d78f73235000000000000017d | 203.656 | 0.000 | n/a | 0.000 | 0.000 | 1.448 | 201.993 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f732350000000000000185 | 203.627 | 0.000 | n/a | 0.000 | 0.000 | 0.588 | 202.848 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-44/journal/page | none observed |
| d6a56d3d78f732350000000000000126 | 203.595 | 0.000 | n/a | 0.000 | 0.000 | 1.968 | 201.393 | 0.028 | n/a | 0.112 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-62/journal/page | none observed |
| d6a56d3d78f732350000000000000155 | 203.594 | 0.000 | n/a | 0.000 | 0.000 | 1.719 | 200.774 | 0.009 | n/a | 0.948 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-44/journal/page | none observed |
| d6a56d3d78f732350000000000000132 | 203.375 | 0.000 | n/a | 0.000 | 0.000 | 1.325 | 201.855 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f73235000000000000016a | 203.353 | 0.000 | n/a | 0.000 | 0.000 | 1.818 | 201.308 | 0.017 | n/a | 0.112 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| d6a56d3d78f73235000000000000016f | 203.256 | 0.000 | n/a | 0.000 | 0.000 | 2.269 | 200.817 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-60/journal/page | none observed |
| d6a56d3d78f73235000000000000013e | 203.092 | 0.000 | n/a | 0.000 | 0.000 | 1.449 | 201.283 | 0.044 | n/a | 0.154 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-48/journal/page | none observed |
| d6a56d3d78f73235000000000000014b | 202.982 | 0.000 | n/a | 0.000 | 0.000 | 1.630 | 201.155 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f732350000000000000189 | 202.811 | 0.000 | n/a | 0.000 | 0.000 | 1.502 | 201.087 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-41/journal/page | none observed |

## P3 / tail / read (502 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 158.092 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 157.001 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 204.988 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.084 | 201.975 | 2.448 | n/a | 0.162 | 0.000 | n/a | n/a | 50.196 | 0.000 | 0.000 | 50.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d6a56d3d78f732350000000000000231 | 208.850 | 0.000 | n/a | 0.000 | 0.000 | 7.479 | 201.143 | 0.015 | n/a | 0.098 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| d6a56d3d78f73235000000000000022d | 206.948 | 0.000 | n/a | 0.000 | 0.000 | 5.598 | 201.075 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-60/journal/page | none observed |
| d6a56d3d78f7323500000000000001c4 | 206.021 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 204.458 | 0.063 | n/a | 0.407 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-41/journal/page | none observed |
| d6a56d3d78f7323500000000000001b8 | 205.339 | 0.000 | n/a | 0.000 | 0.000 | 4.549 | 200.604 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-60/journal/page | none observed |
| d6a56d3d78f7323500000000000001f7 | 205.307 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 204.474 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-45/journal/page | none observed |
| d6a56d3d78f73235000000000000026b | 204.988 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 203.874 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-60/journal/page | none observed |
| d6a56d3d78f732350000000000000273 | 204.984 | 0.000 | n/a | 0.000 | 0.000 | 4.091 | 200.742 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| d6a56d3d78f73235000000000000019a | 204.199 | 0.000 | n/a | 0.000 | 0.000 | 3.084 | 200.928 | 0.025 | n/a | 0.077 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-63/journal/page | none observed |
| d6a56d3d78f7323500000000000001af | 204.072 | 0.000 | n/a | 0.000 | 0.000 | 2.627 | 201.194 | 0.014 | n/a | 0.098 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-66/journal/page | none observed |
| d6a56d3d78f7323500000000000001da | 203.912 | 0.000 | n/a | 0.000 | 0.000 | 2.618 | 201.075 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-46/journal/page | none observed |
| d6a56d3d78f73235000000000000025b | 203.858 | 0.000 | n/a | 0.000 | 0.000 | 2.630 | 200.841 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.310 | 0.000 | 0.000 | 0.310 | gw-r/thread-44/journal/page | none observed |
| d6a56d3d78f7323500000000000001d8 | 203.811 | 0.000 | n/a | 0.000 | 0.000 | 2.995 | 200.653 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f732350000000000000279 | 203.627 | 0.000 | n/a | 0.000 | 0.000 | 2.795 | 200.595 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-43/journal/page | none observed |
| d6a56d3d78f7323500000000000001b9 | 203.576 | 0.000 | n/a | 0.000 | 0.000 | 1.035 | 201.975 | 0.086 | n/a | 0.230 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-48/journal/page | none observed |
| d6a56d3d78f732350000000000000ee1 | 203.244 | 0.000 | n/a | 0.000 | 0.000 | 2.323 | 200.680 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-64/journal/page | none observed |
| d6a56d3d78f732350000000000000288 | 203.146 | 0.000 | n/a | 0.000 | 0.000 | 0.441 | 202.404 | 0.020 | n/a | 0.184 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-44/journal/page | none observed |
| d6a56d3d78f7323500000000000001bb | 203.059 | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 202.390 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-65/journal/page | none observed |
| d6a56d3d78f732350000000000000276 | 202.841 | 0.000 | n/a | 0.000 | 0.000 | 1.180 | 201.292 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-47/journal/page | none observed |
| d6a56d3d78f73235000000000000022b | 202.763 | 0.000 | n/a | 0.000 | 0.000 | 1.927 | 200.633 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-63/journal/page | none observed |
| d6a56d3d78f73235000000000000019f | 202.754 | 0.000 | n/a | 0.000 | 0.000 | 0.998 | 201.537 | 0.008 | n/a | 0.124 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-66/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

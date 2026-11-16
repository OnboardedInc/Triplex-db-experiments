# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (181.942 ms, trace `19ce9be149b3ec4f000000000000015e`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (86.789 ms, trace `19ce9be149b3ec4f0000000000000153`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (86.943 ms, trace `19ce9be149b3ec4f0000000000000162`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (56.480 ms, trace `19ce9be149b3ec4f000000000000010e`); `gw-w/thread-44/gateway.admitted-work` (75.342 ms, trace `19ce9be149b3ec4f0000000000001ef7`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-disk-a-3-candidate`; source `0d95e5721572bbafaa54630aa6265d188d8e3d26`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4257/4259 (99.953%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 19065691.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 441 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 13635.275 | 1215.238 | 26.077 | 454 |
| L1 | 1 | 44815.987 | 2901.990 | 80.283 | 1493 |
| L4 | 4 | 44642.107 | 3679.975 | 86.625 | 1739 |
| L16 | 16 | 44972.631 | 9961.825 | 110.893 | 34471 |
| L64 | 64 | 44300.744 | 10554.894 | 198.314 | 35623 |
| L256 | 256 | 44496.849 | 2723.296 | 126.761 | 1560 |
| L1024 | 1024 | 44033.164 | 3536.944 | 117.869 | 1598 |
| tail | 0 | 164089.036 | 4141.684 | 118.459 | 6128 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 19ce9be149b3ec4f000000000000015e | driver.queue.scheduler-dispatch | 0.091 | none | 0 / 32 |
| 19ce9be149b3ec4f000000000000015e | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 19ce9be149b3ec4f000000000000015e waited: []

| 19ce9be149b3ec4f0000000000000153 | driver.queue.scheduler-dispatch | 0.095 | none | 0 / 32 |
| 19ce9be149b3ec4f0000000000000153 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 19ce9be149b3ec4f0000000000000153 waited: []

| 19ce9be149b3ec4f0000000000000162 | driver.queue.scheduler-dispatch | 0.097 | none | 0 / 32 |
| 19ce9be149b3ec4f0000000000000162 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 19ce9be149b3ec4f0000000000000162 waited: []

| 19ce9be149b3ec4f000000000000010e | driver.queue.scheduler-dispatch | 0.102 | none | 0 / 32 |
| 19ce9be149b3ec4f000000000000010e | driver.queue.scheduler-late | 0.023 | none | 0 / 32 |

Observed active steps while trace 19ce9be149b3ec4f000000000000010e waited: []

| 19ce9be149b3ec4f0000000000001ef7 | driver.queue.scheduler-dispatch | 0.043 | none | 0 / 32 |
| 19ce9be149b3ec4f0000000000001ef7 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 19ce9be149b3ec4f0000000000001ef7 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.524 | 0.507 | 0.000 | 0.723 | 5.571 | 1.781 | 0.000 | 0.085 | 1.664 | 6.865 | 0.044 | n/a | 0.507 | 18.868 | n/a | n/a | 0.040 | 6.247 | 0.181 | 0.040 |
| p99 | 131.748 | 5.003 | 0.000 | 4.790 | 31.911 | n/a | 1.783 | 1.956 | 10.472 | 33.411 | 1.336 | n/a | 4.083 | 74.875 | n/a | n/a | 0.177 | 32.610 | 0.407 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f000000000000010e | 131.748 | 31.911 | 0.574 | 0.000 | 0.125 | 5.310 | 33.411 | 0.281 | n/a | 3.603 | 56.480 | n/a | n/a | 0.053 | 32.610 | 0.248 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 19ce9be149b3ec4f000000000000012e | 93.892 | 6.870 | n/a | 0.000 | 0.142 | 1.271 | 9.756 | 0.061 | n/a | 0.874 | 74.875 | n/a | n/a | 0.043 | 7.012 | 0.075 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.156ms |
| 19ce9be149b3ec4f0000000000000112 | 90.626 | 17.765 | 0.355 | 0.000 | 0.084 | 3.145 | 31.062 | 0.093 | n/a | 3.604 | 34.477 | n/a | n/a | 0.042 | 18.203 | 0.201 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 19ce9be149b3ec4f0000000000000127 | 68.383 | 20.500 | 0.217 | 0.000 | 0.069 | 5.983 | 13.462 | 0.108 | n/a | 4.083 | 23.932 | n/a | n/a | 0.029 | 20.786 | 0.304 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000010a | 66.488 | 13.394 | n/a | 1.783 | 1.955 | 0.925 | 6.865 | 1.336 | n/a | 0.279 | 39.775 | n/a | n/a | 0.177 | 17.132 | 0.258 | 0.177 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000013d | 57.992 | 5.909 | 0.157 | 0.271 | 0.069 | 5.421 | 16.398 | 0.044 | n/a | 0.153 | 29.539 | n/a | n/a | 0.031 | 6.406 | 0.110 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000116 | 56.918 | 7.549 | 0.217 | 0.000 | 0.104 | 3.477 | 21.704 | 0.042 | n/a | 0.150 | 23.632 | n/a | n/a | 0.043 | 7.870 | 0.138 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000013e | 53.869 | 9.581 | n/a | 0.000 | 1.956 | 1.377 | 3.388 | 0.174 | n/a | 0.591 | 36.733 | n/a | n/a | 0.069 | 11.537 | 0.214 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.287ms |
| 19ce9be149b3ec4f000000000000011f | 50.837 | 5.168 | 1.781 | 0.000 | 0.180 | 1.600 | 18.103 | 0.045 | n/a | 0.173 | 23.715 | n/a | n/a | 0.072 | 7.130 | 0.140 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000139 | 43.150 | 8.275 | 0.279 | 0.450 | 0.117 | 1.665 | 12.701 | 0.080 | n/a | 0.669 | 18.868 | n/a | n/a | 0.046 | 9.120 | 0.211 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000135 | 42.725 | 4.420 | 0.641 | 0.267 | 0.075 | 2.573 | 17.937 | 0.044 | n/a | 0.147 | 16.589 | n/a | n/a | 0.032 | 5.402 | 0.126 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000129 | 42.368 | 14.085 | 0.418 | 0.000 | 0.060 | 10.472 | 4.310 | 0.137 | n/a | 1.494 | 11.366 | n/a | n/a | 0.026 | 14.563 | 0.344 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000143 | 39.861 | 5.103 | 0.226 | 0.000 | 0.068 | 5.590 | 8.764 | 0.041 | n/a | 0.545 | 19.486 | n/a | n/a | 0.040 | 5.397 | 0.135 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000113 | 39.457 | 5.251 | n/a | 0.000 | 0.078 | 1.200 | 5.377 | 0.084 | n/a | 3.329 | 24.104 | n/a | n/a | 0.034 | 5.329 | 0.135 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.082ms |
| 19ce9be149b3ec4f0000000000000131 | 38.524 | 5.571 | 0.228 | 0.362 | 0.085 | 1.975 | 10.390 | 0.083 | n/a | 0.483 | 19.310 | n/a | n/a | 0.036 | 6.247 | 0.162 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000011a | 36.321 | 5.094 | 0.280 | 0.000 | 0.076 | 3.214 | 12.743 | 0.080 | n/a | 0.121 | 14.666 | n/a | n/a | 0.045 | 5.451 | 0.150 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000012d | 33.245 | 6.754 | 0.750 | 0.000 | 0.016 | 4.158 | 8.154 | 0.031 | n/a | 0.474 | 12.896 | n/a | n/a | 0.012 | 7.520 | 0.226 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.146ms |
| 19ce9be149b3ec4f0000000000000121 | 31.002 | 4.321 | 0.248 | 0.000 | 0.069 | 1.781 | 9.639 | 0.103 | n/a | 1.077 | 13.731 | n/a | n/a | 0.035 | 4.637 | 0.150 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000013a | 30.860 | 3.947 | n/a | 0.000 | 0.119 | 3.193 | 2.032 | 0.067 | n/a | 2.118 | 19.343 | n/a | n/a | 0.042 | 4.066 | 0.132 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000011b | 30.358 | 4.695 | n/a | 0.000 | 1.317 | 0.887 | 5.617 | 0.044 | n/a | 0.722 | 17.049 | n/a | n/a | 0.027 | 6.012 | 0.198 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |

## P2/P4 / read-your-own-write / read (297 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.647 | n/a | n/a | n/a | 41.504 | 20.555 | 2.623 | 0.000 | 0.218 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.355 | 65.291 | 0.913 | 5.355 |
| p99 | 265.139 | n/a | n/a | n/a | 121.970 | 140.298 | 30.553 | 0.000 | 37.143 | 91.336 | 60.359 | n/a | 0.008 | 0.000 | n/a | n/a | 130.961 | 196.867 | 1.000 | 130.961 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f000000000000118a | 267.593 | 61.137 | 52.928 | 2.712 | 0.000 | 9.781 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 141.036 | 116.777 | 0.436 | 141.036 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.260ms; driver.reader-basis.broadcast 0.251ms; driver.publication.readback 0.118ms; driver.publication.readback 0.080ms |
| 19ce9be149b3ec4f0000000000001ccb | 266.417 | 29.654 | 98.152 | 7.356 | 0.000 | 0.295 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 130.961 | 135.161 | 0.507 | 130.961 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.368ms; driver.reader-basis.broadcast 0.352ms; driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.250ms; driver.publication.readback 0.234ms |
| 19ce9be149b3ec4f0000000000001ceb | 265.139 | 79.451 | 93.434 | 9.046 | 0.000 | 0.470 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 82.738 | 181.931 | 0.686 | 82.738 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.781ms; driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.250ms; driver.publication.readback 0.234ms; driver.publication.persist-deferred 0.220ms |
| 19ce9be149b3ec4f0000000000001cc7 | 255.275 | 83.672 | 64.962 | 9.892 | 0.000 | 0.202 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 96.547 | 158.527 | 0.621 | 96.547 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.368ms; driver.reader-basis.broadcast 0.352ms; driver.publication.readback 0.250ms; driver.publication.readback 0.111ms; driver.publication.readback 0.108ms |
| 19ce9be149b3ec4f0000000000001188 | 250.396 | 128.720 | 67.209 | 30.553 | 0.000 | 0.347 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.566 | 226.482 | 0.904 | 23.566 | node-13/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.260ms; driver.reader-basis.broadcast 0.251ms; driver.publication.readback 0.118ms; driver.publication.readback 0.070ms |
| 19ce9be149b3ec4f0000000000001e09 | 241.387 | 76.064 | 5.031 | 5.712 | 0.000 | 0.194 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 154.386 | 86.807 | 0.360 | 154.386 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.719ms; driver.reader-basis.broadcast 0.397ms; driver.publication.readback 0.131ms; driver.publication.readback 0.121ms; driver.publication.readback 0.118ms |
| 19ce9be149b3ec4f000000000000118f | 238.085 | 59.887 | 51.481 | 0.000 | 0.000 | 0.445 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 126.272 | 111.368 | 0.468 | 126.272 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.260ms; driver.reader-basis.broadcast 0.251ms; driver.publication.readback 0.118ms; driver.publication.readback 0.074ms |
| 19ce9be149b3ec4f00000000000012b9 | 236.323 | 51.993 | 2.870 | 2.289 | 0.000 | 34.083 | 2.306 | 142.762 | n/a | 0.007 | 0.000 | n/a | n/a | 0.012 | 57.153 | 0.242 | 0.012 | gw-r/thread-66/gateway.admission-wait | driver.reader-basis.broadcast 0.256ms; driver.reader-basis.broadcast 0.250ms; driver.publication.readback 0.110ms; driver.publication.readback 0.093ms; driver.publication.readback 0.087ms |
| 19ce9be149b3ec4f0000000000001a4d | 232.988 | 42.155 | 67.442 | 3.251 | 0.000 | 3.377 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 116.762 | 112.848 | 0.484 | 116.762 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.407ms; driver.reader-basis.broadcast 0.321ms; driver.reader-basis.broadcast 0.292ms; driver.publication.readback 0.144ms; driver.publication.readback 0.118ms |
| 19ce9be149b3ec4f000000000000084e | 230.582 | 38.419 | 94.223 | 12.969 | 0.000 | 0.457 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 84.514 | 145.611 | 0.631 | 84.514 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.405ms; driver.reader-basis.broadcast 0.278ms; driver.publication.readback 0.112ms; driver.publication.readback 0.079ms; driver.publication.readback 0.074ms |
| 19ce9be149b3ec4f0000000000000f0f | 230.089 | 64.029 | 61.681 | 17.922 | 0.000 | 0.366 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.091 | 143.632 | 0.624 | 86.091 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.499ms; driver.reader-basis.broadcast 0.224ms; driver.reader-basis.broadcast 0.212ms; driver.reader-basis.broadcast 0.207ms; driver.publication.readback 0.113ms |
| 19ce9be149b3ec4f0000000000001a51 | 226.554 | 26.728 | 165.137 | 0.000 | 0.000 | 0.252 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.437 | 191.865 | 0.847 | 34.437 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.407ms; driver.reader-basis.broadcast 0.321ms; driver.publication.readback 0.144ms; driver.publication.readback 0.077ms; driver.publication.readback 0.071ms |
| 19ce9be149b3ec4f00000000000012b6 | 225.690 | 46.652 | 2.546 | 10.105 | 0.000 | 20.642 | 101.211 | 44.521 | n/a | 0.002 | 0.000 | n/a | n/a | 0.012 | 59.303 | 0.263 | 0.012 | gw-r/thread-86/gateway.admitted-work | driver.reader-basis.broadcast 0.399ms; driver.reader-basis.broadcast 0.256ms; driver.reader-basis.broadcast 0.250ms; driver.publication.readback 0.168ms; driver.publication.readback 0.110ms |
| 19ce9be149b3ec4f0000000000001cea | 221.300 | 48.121 | 97.985 | 1.656 | 0.000 | 0.207 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 73.331 | 147.761 | 0.668 | 73.331 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.781ms; driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.250ms; driver.publication.readback 0.234ms; driver.publication.persist-deferred 0.220ms |
| 19ce9be149b3ec4f0000000000000850 | 218.585 | 32.094 | 94.698 | 12.969 | 0.000 | 0.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 78.566 | 139.762 | 0.639 | 78.566 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.405ms; driver.reader-basis.broadcast 0.278ms; driver.publication.readback 0.112ms; driver.publication.readback 0.079ms; driver.publication.readback 0.074ms |
| 19ce9be149b3ec4f0000000000001ce7 | 214.454 | 85.496 | 50.781 | 9.189 | 0.000 | 1.688 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 67.301 | 145.466 | 0.678 | 67.301 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.781ms; driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.250ms; driver.publication.readback 0.234ms; driver.publication.persist-deferred 0.220ms |
| 19ce9be149b3ec4f0000000000001a49 | 213.983 | 26.241 | 79.485 | 3.683 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 104.333 | 109.409 | 0.511 | 104.333 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.407ms; driver.reader-basis.broadcast 0.292ms; driver.publication.readback 0.120ms; driver.publication.readback 0.118ms; driver.publication.readback 0.081ms |
| 19ce9be149b3ec4f000000000000085d | 209.769 | 41.042 | 154.227 | 7.330 | 0.000 | 0.230 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.940 | 202.599 | 0.966 | 6.940 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.405ms; driver.reader-basis.broadcast 0.278ms; driver.publication.readback 0.112ms; driver.publication.readback 0.079ms; driver.publication.readback 0.073ms |
| 19ce9be149b3ec4f0000000000001f19 | 207.503 | 113.453 | 2.626 | 57.605 | 0.000 | 0.672 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.147 | 173.684 | 0.837 | 33.147 | node-13/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.802ms; driver.reader-basis.broadcast 0.370ms; driver.publication.readback 0.092ms; driver.publication.persist-deferred 0.029ms |
| 19ce9be149b3ec4f0000000000001195 | 207.403 | 48.918 | 125.358 | 0.000 | 0.000 | 0.439 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.687 | 174.276 | 0.840 | 32.687 | node-13/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.260ms; driver.publication.readback 0.118ms; driver.publication.readback 0.080ms; driver.publication.readback 0.074ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.867 | 1.005 | 0.000 | 0.933 | 5.251 | n/a | 0.000 | 0.119 | 1.271 | 2.025 | 0.028 | n/a | 0.874 | 13.487 | n/a | n/a | 0.042 | 5.329 | 0.181 | 0.042 |
| p99 | 93.892 | 3.569 | 0.000 | 3.784 | 9.581 | n/a | 0.000 | 1.956 | 3.193 | 9.756 | 0.174 | n/a | 3.768 | 74.875 | n/a | n/a | 0.094 | 11.537 | 0.407 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f000000000000012e | 93.892 | 6.870 | n/a | 0.000 | 0.142 | 1.271 | 9.756 | 0.061 | n/a | 0.874 | 74.875 | n/a | n/a | 0.043 | 7.012 | 0.075 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.156ms |
| 19ce9be149b3ec4f000000000000013e | 53.869 | 9.581 | n/a | 0.000 | 1.956 | 1.377 | 3.388 | 0.174 | n/a | 0.591 | 36.733 | n/a | n/a | 0.069 | 11.537 | 0.214 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.287ms |
| 19ce9be149b3ec4f0000000000000113 | 39.457 | 5.251 | n/a | 0.000 | 0.078 | 1.200 | 5.377 | 0.084 | n/a | 3.329 | 24.104 | n/a | n/a | 0.034 | 5.329 | 0.135 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.082ms |
| 19ce9be149b3ec4f000000000000013a | 30.860 | 3.947 | n/a | 0.000 | 0.119 | 3.193 | 2.032 | 0.067 | n/a | 2.118 | 19.343 | n/a | n/a | 0.042 | 4.066 | 0.132 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000010f | 26.867 | 6.118 | n/a | 0.000 | 0.230 | 1.120 | 2.025 | 0.025 | n/a | 3.768 | 13.487 | n/a | n/a | 0.094 | 6.348 | 0.236 | 0.094 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.295ms |
| 19ce9be149b3ec4f0000000000000140 | 20.672 | 8.271 | n/a | 0.000 | 0.147 | 1.664 | 1.396 | 0.021 | n/a | 1.363 | 7.756 | n/a | n/a | 0.053 | 8.418 | 0.407 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000012b | 16.172 | 2.706 | n/a | 0.000 | 0.091 | 0.827 | 1.250 | 0.020 | n/a | 0.507 | 10.740 | n/a | n/a | 0.032 | 2.796 | 0.173 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000118 | 14.140 | 2.467 | n/a | 0.000 | 0.099 | 1.352 | 1.932 | 0.021 | n/a | 0.427 | 7.799 | n/a | n/a | 0.042 | 2.566 | 0.181 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000136 | 14.000 | 3.098 | n/a | 0.000 | 0.075 | 0.902 | 1.310 | 0.028 | n/a | 0.378 | 8.180 | n/a | n/a | 0.028 | 3.173 | 0.227 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.008 | 0.376 | 0.000 | 0.764 | 6.530 | 1.710 | 0.273 | 0.054 | 1.862 | 8.159 | 0.078 | n/a | 0.510 | 13.692 | n/a | n/a | 0.027 | 9.381 | 0.207 | 0.027 |
| p99 | 48.188 | 0.656 | 0.000 | 0.880 | 13.630 | 2.428 | 0.362 | 0.061 | 3.502 | 18.967 | 0.090 | n/a | 0.528 | 17.423 | n/a | n/a | 0.028 | 15.668 | 0.392 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f0000000000000145 | 48.188 | 6.530 | 2.428 | 0.362 | 0.061 | 1.790 | 18.967 | 0.090 | n/a | 0.510 | 17.423 | n/a | n/a | 0.027 | 9.381 | 0.195 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000002ce | 40.008 | 13.630 | 1.710 | 0.273 | 0.054 | 3.502 | 6.538 | 0.052 | n/a | 0.528 | 13.692 | n/a | n/a | 0.028 | 15.668 | 0.392 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000201 | 20.561 | 3.955 | 0.256 | 0.000 | 0.047 | 1.862 | 8.159 | 0.078 | n/a | 0.261 | 5.921 | n/a | n/a | 0.022 | 4.258 | 0.207 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.511 | 0.476 | 0.000 | 0.691 | 4.647 | n/a | 0.000 | 0.100 | 1.425 | 5.807 | 0.056 | n/a | 0.262 | 15.667 | n/a | n/a | 0.038 | 5.124 | 0.165 | 0.038 |
| p99 | 201.398 | 4.004 | 0.000 | 3.079 | 41.910 | n/a | 2.716 | 14.806 | 6.221 | 49.724 | 0.493 | n/a | 4.274 | 181.942 | n/a | n/a | 0.080 | 42.240 | 0.572 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f000000000000015e | 201.398 | 6.470 | n/a | 0.000 | 0.094 | 1.468 | 11.255 | 0.050 | n/a | 0.088 | 181.942 | n/a | n/a | 0.033 | 6.563 | 0.033 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.103ms; driver.reader-basis.broadcast 0.077ms |
| 19ce9be149b3ec4f0000000000000153 | 172.281 | 41.910 | 0.233 | 0.000 | 0.097 | 3.081 | 39.792 | 0.093 | n/a | 0.241 | 86.789 | n/a | n/a | 0.044 | 42.240 | 0.245 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 0.664ms; driver.reader-basis.broadcast 0.068ms |
| 19ce9be149b3ec4f0000000000000162 | 143.453 | 13.471 | 0.435 | 0.599 | 0.100 | 3.130 | 37.563 | 0.148 | n/a | 1.021 | 86.943 | n/a | n/a | 0.043 | 14.605 | 0.102 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.288ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.142ms; driver.publication.persist-deferred 0.022ms |
| 19ce9be149b3ec4f0000000000000159 | 109.792 | 10.254 | 0.391 | 0.427 | 0.155 | 2.957 | 49.724 | 0.119 | n/a | 0.253 | 45.441 | n/a | n/a | 0.071 | 11.227 | 0.102 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.084ms; driver.reader-basis.broadcast 0.077ms |
| 19ce9be149b3ec4f00000000000001c6 | 86.031 | 5.027 | 0.166 | 0.324 | 0.077 | 1.315 | 16.259 | 0.094 | n/a | 0.177 | 62.565 | n/a | n/a | 0.027 | 5.594 | 0.065 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.114ms |
| 19ce9be149b3ec4f000000000000016c | 84.370 | 16.402 | 1.714 | 0.398 | 0.136 | 6.221 | 15.240 | 0.353 | n/a | 0.330 | 43.523 | n/a | n/a | 0.052 | 18.650 | 0.221 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| 19ce9be149b3ec4f0000000000000163 | 82.848 | 6.634 | n/a | 0.000 | 0.108 | 3.129 | 8.383 | 0.063 | n/a | 0.668 | 63.818 | n/a | n/a | 0.046 | 6.741 | 0.081 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000150 | 69.588 | 4.650 | 0.255 | 0.000 | 0.080 | 3.442 | 14.966 | 0.194 | n/a | 0.245 | 45.723 | n/a | n/a | 0.033 | 4.986 | 0.072 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000186 | 68.872 | 14.404 | 0.245 | 0.000 | 0.140 | 2.553 | 15.798 | 0.093 | n/a | 4.274 | 31.313 | n/a | n/a | 0.052 | 14.789 | 0.215 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.139ms |
| 19ce9be149b3ec4f0000000000000155 | 62.964 | 6.191 | 0.298 | 0.000 | 0.064 | 2.057 | 40.882 | 0.159 | n/a | 0.201 | 13.083 | n/a | n/a | 0.029 | 6.553 | 0.104 | 0.029 | gw-w/thread-45/commit.prepare-and-validate | driver.reader-basis.broadcast 0.064ms |
| 19ce9be149b3ec4f00000000000001d2 | 60.938 | 22.100 | 0.220 | 0.000 | 0.075 | 5.884 | 12.541 | 0.087 | n/a | 0.922 | 19.081 | n/a | n/a | 0.027 | 22.396 | 0.368 | 0.027 | node-13/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.218ms |
| 19ce9be149b3ec4f000000000000014d | 59.212 | 5.729 | n/a | 0.000 | 0.116 | 1.389 | 4.198 | 0.093 | n/a | 0.870 | 46.778 | n/a | n/a | 0.040 | 5.844 | 0.099 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.151ms |
| 19ce9be149b3ec4f0000000000000156 | 58.632 | 5.778 | n/a | 0.000 | 0.153 | 1.112 | 1.801 | 0.023 | n/a | 0.722 | 48.993 | n/a | n/a | 0.051 | 5.931 | 0.101 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000166 | 57.340 | 6.578 | 0.330 | 0.000 | 0.170 | 2.236 | 17.106 | 0.094 | n/a | 0.308 | 30.478 | n/a | n/a | 0.042 | 7.077 | 0.123 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.229ms |
| 19ce9be149b3ec4f0000000000000169 | 57.306 | 11.199 | n/a | 0.000 | 1.503 | 1.221 | 4.724 | 0.094 | n/a | 0.238 | 38.300 | n/a | n/a | 0.027 | 12.703 | 0.222 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.163ms |
| 19ce9be149b3ec4f00000000000001ec | 55.898 | 8.755 | n/a | 0.000 | 1.005 | 1.313 | 2.686 | 0.089 | n/a | 0.870 | 41.115 | n/a | n/a | 0.065 | 9.760 | 0.175 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.152ms |
| 19ce9be149b3ec4f00000000000001c0 | 54.050 | 5.513 | 0.245 | 0.596 | 0.122 | 1.994 | 10.582 | 0.044 | n/a | 0.436 | 34.479 | n/a | n/a | 0.041 | 6.476 | 0.120 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.076ms |
| 19ce9be149b3ec4f00000000000001c7 | 52.403 | 7.674 | n/a | 0.000 | 0.121 | 2.391 | 2.267 | 0.025 | n/a | 0.081 | 39.793 | n/a | n/a | 0.050 | 7.796 | 0.149 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000001f5 | 51.131 | 7.575 | 0.165 | 2.716 | 0.060 | 1.667 | 25.397 | 0.041 | n/a | 0.166 | 13.322 | n/a | n/a | 0.022 | 10.516 | 0.206 | 0.022 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.091ms |
| 19ce9be149b3ec4f00000000000001dd | 48.929 | 13.302 | 0.470 | 0.000 | 0.150 | 1.422 | 10.047 | 0.032 | n/a | 0.167 | 23.301 | n/a | n/a | 0.038 | 13.922 | 0.285 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |

## P2 / L1 / commit / 5-10 facts (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.835 | 0.999 | 0.000 | 0.687 | 3.158 | n/a | 0.000 | 0.105 | 1.042 | 2.314 | 0.048 | n/a | 0.668 | 11.124 | n/a | n/a | 0.036 | 3.281 | 0.173 | 0.036 |
| p99 | 82.848 | 1.989 | 0.000 | 1.450 | 10.715 | n/a | 0.000 | 14.806 | 3.913 | 9.098 | 0.108 | n/a | 3.406 | 63.818 | n/a | n/a | 0.065 | 17.739 | 0.572 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f0000000000000163 | 82.848 | 6.634 | n/a | 0.000 | 0.108 | 3.129 | 8.383 | 0.063 | n/a | 0.668 | 63.818 | n/a | n/a | 0.046 | 6.741 | 0.081 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000014d | 59.212 | 5.729 | n/a | 0.000 | 0.116 | 1.389 | 4.198 | 0.093 | n/a | 0.870 | 46.778 | n/a | n/a | 0.040 | 5.844 | 0.099 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.151ms |
| 19ce9be149b3ec4f00000000000001ec | 55.898 | 8.755 | n/a | 0.000 | 1.005 | 1.313 | 2.686 | 0.089 | n/a | 0.870 | 41.115 | n/a | n/a | 0.065 | 9.760 | 0.175 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.152ms |
| 19ce9be149b3ec4f0000000000000192 | 31.029 | 2.933 | n/a | 0.000 | 14.806 | 1.382 | 2.972 | 0.049 | n/a | 0.255 | 8.607 | n/a | n/a | 0.024 | 17.739 | 0.572 | 0.024 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.063ms; driver.publication.readback 0.285ms; driver.publication.persist-deferred 0.034ms |
| 19ce9be149b3ec4f0000000000000151 | 30.804 | 10.715 | n/a | 0.000 | 0.075 | 3.913 | 9.098 | 0.108 | n/a | 0.546 | 6.309 | n/a | n/a | 0.040 | 10.790 | 0.350 | 0.040 | node-13/thread-0/driver.execute | driver.reader-basis.broadcast 0.108ms |
| 19ce9be149b3ec4f00000000000001f0 | 28.463 | 1.904 | n/a | 0.000 | 0.121 | 0.792 | 1.880 | 0.026 | n/a | 0.135 | 23.571 | n/a | n/a | 0.034 | 2.025 | 0.071 | 0.034 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.071ms |
| 19ce9be149b3ec4f00000000000001ea | 27.902 | 2.426 | n/a | 0.000 | 0.078 | 0.892 | 1.881 | 0.033 | n/a | 0.651 | 21.905 | n/a | n/a | 0.035 | 2.504 | 0.090 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000001fe | 26.675 | 3.228 | n/a | 0.000 | 0.091 | 0.717 | 3.898 | 0.062 | n/a | 0.581 | 18.038 | n/a | n/a | 0.061 | 3.319 | 0.124 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000019b | 25.350 | 3.185 | n/a | 0.000 | 0.102 | 1.096 | 6.357 | 0.045 | n/a | 3.406 | 11.124 | n/a | n/a | 0.033 | 3.287 | 0.130 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 19ce9be149b3ec4f00000000000001e2 | 24.650 | 2.169 | n/a | 0.000 | 0.158 | 0.984 | 5.807 | 0.075 | n/a | 0.732 | 14.687 | n/a | n/a | 0.039 | 2.327 | 0.094 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000001af | 23.141 | 3.158 | n/a | 0.000 | 0.123 | 0.888 | 2.198 | 0.045 | n/a | 0.236 | 16.432 | n/a | n/a | 0.061 | 3.281 | 0.142 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000001a9 | 21.835 | 2.445 | n/a | 0.000 | 0.063 | 0.785 | 1.375 | 0.026 | n/a | 0.330 | 16.776 | n/a | n/a | 0.034 | 2.508 | 0.115 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000001cd | 20.769 | 4.417 | n/a | 0.000 | 0.125 | 0.948 | 1.781 | 0.022 | n/a | 0.120 | 13.300 | n/a | n/a | 0.056 | 4.542 | 0.219 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.113ms |
| 19ce9be149b3ec4f00000000000001da | 20.146 | 3.238 | n/a | 0.000 | 0.091 | 1.789 | 2.826 | 0.032 | n/a | 0.397 | 11.737 | n/a | n/a | 0.037 | 3.329 | 0.165 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000001b1 | 17.401 | 2.902 | n/a | 0.000 | 0.105 | 1.042 | 2.314 | 0.064 | n/a | 0.262 | 10.677 | n/a | n/a | 0.035 | 3.006 | 0.173 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000177 | 16.456 | 3.794 | n/a | 0.000 | 0.073 | 1.059 | 1.274 | 0.023 | n/a | 1.165 | 9.039 | n/a | n/a | 0.029 | 3.867 | 0.235 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000001c3 | 14.795 | 3.168 | n/a | 0.000 | 0.100 | 1.009 | 2.816 | 0.069 | n/a | 0.822 | 6.776 | n/a | n/a | 0.036 | 3.268 | 0.221 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000019f | 14.792 | 2.699 | n/a | 0.000 | 0.127 | 1.105 | 1.858 | 0.047 | n/a | 0.780 | 8.141 | n/a | n/a | 0.035 | 2.826 | 0.191 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000001e6 | 14.194 | 2.446 | n/a | 0.000 | 0.097 | 1.054 | 2.388 | 0.064 | n/a | 0.869 | 7.242 | n/a | n/a | 0.033 | 2.543 | 0.179 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000017b | 13.423 | 2.063 | n/a | 0.000 | 0.063 | 1.184 | 2.034 | 0.087 | n/a | 1.010 | 6.955 | n/a | n/a | 0.027 | 2.126 | 0.158 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.972 | 0.282 | 0.000 | 0.572 | 4.054 | n/a | 0.000 | 0.070 | 1.160 | 3.136 | 0.032 | n/a | 0.290 | 10.357 | n/a | n/a | 0.028 | 4.530 | 0.205 | 0.028 |
| p99 | 86.357 | 2.498 | 0.024 | 1.873 | 13.671 | n/a | 0.711 | 1.730 | 8.171 | 38.745 | 0.358 | n/a | 3.922 | 53.133 | n/a | n/a | 0.066 | 14.339 | 0.374 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f00000000000002c8 | 96.352 | 5.266 | 0.257 | 0.322 | 0.061 | 1.732 | 13.566 | 0.046 | n/a | 0.155 | 74.922 | n/a | n/a | 0.026 | 5.906 | 0.061 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 2.467ms; driver.worker-message 1.190ms; driver.reader-basis.broadcast 0.129ms |
| 19ce9be149b3ec4f000000000000020d | 86.357 | 10.990 | n/a | 0.000 | 0.070 | 10.052 | 38.745 | 0.262 | n/a | 3.716 | 22.493 | n/a | n/a | 0.029 | 11.060 | 0.128 | 0.029 | gw-w/thread-47/storage/begin-command! | driver.reader-basis.broadcast 0.140ms |
| 19ce9be149b3ec4f00000000000002a6 | 84.591 | 2.258 | n/a | 0.000 | 0.092 | 0.633 | 51.864 | 0.018 | n/a | 0.088 | 29.597 | n/a | n/a | 0.042 | 2.350 | 0.028 | 0.042 | gw-w/thread-49/gateway.request-parse | driver.reader-basis.broadcast 0.068ms |
| 19ce9be149b3ec4f000000000000024f | 69.174 | 4.105 | 0.157 | 0.264 | 0.058 | 1.768 | 9.204 | 0.025 | n/a | 0.438 | 53.133 | n/a | n/a | 0.022 | 4.584 | 0.066 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| 19ce9be149b3ec4f00000000000002a0 | 67.825 | 4.345 | 0.160 | 0.280 | 0.052 | 8.171 | 7.025 | 0.026 | n/a | 0.364 | 47.379 | n/a | n/a | 0.024 | 4.836 | 0.071 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| 19ce9be149b3ec4f000000000000023f | 64.337 | 11.967 | 0.404 | 0.711 | 0.176 | 2.812 | 14.727 | 0.038 | n/a | 3.246 | 30.197 | n/a | n/a | 0.059 | 13.258 | 0.206 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.191ms; driver.reader-basis.broadcast 0.088ms; driver.publication.persist-deferred 0.062ms |
| 19ce9be149b3ec4f00000000000002c6 | 60.823 | 6.741 | 0.205 | 0.404 | 0.046 | 6.047 | 18.568 | 0.099 | n/a | 1.285 | 27.409 | n/a | n/a | 0.020 | 7.396 | 0.122 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.109ms |
| 19ce9be149b3ec4f000000000000020b | 58.229 | 8.900 | 0.167 | 0.000 | 0.063 | 3.095 | 21.609 | 0.096 | n/a | 0.124 | 24.154 | n/a | n/a | 0.020 | 9.131 | 0.157 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.083ms |
| 19ce9be149b3ec4f0000000000000216 | 52.371 | 10.722 | 0.516 | 1.849 | 0.064 | 3.065 | 8.883 | 0.045 | n/a | 0.566 | 26.633 | n/a | n/a | 0.028 | 13.151 | 0.251 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| 19ce9be149b3ec4f000000000000025c | 52.274 | 5.502 | 0.809 | 0.322 | 0.055 | 2.506 | 11.704 | 0.027 | n/a | 0.447 | 30.880 | n/a | n/a | 0.021 | 6.688 | 0.128 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.049ms |
| 19ce9be149b3ec4f00000000000002b4 | 43.513 | 6.987 | 0.156 | 0.000 | 0.049 | 1.153 | 8.563 | 0.025 | n/a | 0.410 | 26.147 | n/a | n/a | 0.024 | 7.191 | 0.165 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000212 | 43.407 | 4.819 | 0.282 | 0.000 | 0.057 | 7.833 | 14.667 | 0.039 | n/a | 0.115 | 15.573 | n/a | n/a | 0.024 | 5.157 | 0.119 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms |
| 19ce9be149b3ec4f0000000000000260 | 41.086 | 13.838 | 0.171 | 0.272 | 0.058 | 2.249 | 10.390 | 0.026 | n/a | 0.133 | 13.928 | n/a | n/a | 0.022 | 14.339 | 0.349 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 19ce9be149b3ec4f000000000000022c | 39.802 | 11.371 | 0.284 | 0.285 | 0.052 | 3.791 | 7.239 | 0.100 | n/a | 3.698 | 12.958 | n/a | n/a | 0.025 | 11.991 | 0.301 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 19ce9be149b3ec4f0000000000000234 | 39.072 | 3.892 | 0.253 | 0.282 | 0.100 | 2.132 | 10.977 | 0.041 | n/a | 0.144 | 21.211 | n/a | n/a | 0.038 | 4.528 | 0.116 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.106ms |
| 19ce9be149b3ec4f0000000000000236 | 37.168 | 13.671 | 0.398 | 0.289 | 0.100 | 2.184 | 12.617 | 0.041 | n/a | 0.139 | 7.690 | n/a | n/a | 0.040 | 14.458 | 0.389 | 0.040 | node-13/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.093ms |
| 19ce9be149b3ec4f000000000000023c | 36.907 | 12.261 | 0.155 | 0.316 | 0.058 | 1.448 | 8.382 | 0.067 | n/a | 0.142 | 14.057 | n/a | n/a | 0.021 | 12.790 | 0.347 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 19ce9be149b3ec4f000000000000028e | 36.051 | 5.306 | 0.443 | 0.409 | 0.055 | 2.387 | 11.893 | 0.060 | n/a | 0.107 | 15.367 | n/a | n/a | 0.024 | 6.213 | 0.172 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000224 | 36.014 | 4.054 | 0.166 | 0.389 | 0.050 | 1.595 | 13.722 | 0.043 | n/a | 0.112 | 15.862 | n/a | n/a | 0.021 | 4.659 | 0.129 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 19ce9be149b3ec4f0000000000000296 | 35.013 | 5.855 | 0.221 | 0.496 | 0.053 | 1.480 | 7.531 | 0.028 | n/a | 0.120 | 19.205 | n/a | n/a | 0.025 | 6.624 | 0.189 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (34 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.730 | 0.662 | 0.000 | 0.526 | 2.489 | n/a | 0.000 | 0.071 | 0.819 | 1.656 | 0.031 | n/a | 0.290 | 7.324 | n/a | n/a | 0.028 | 2.562 | 0.191 | 0.028 |
| p99 | 31.135 | 1.676 | 0.039 | 1.104 | 6.865 | n/a | 0.000 | 2.259 | 4.963 | 10.202 | 0.358 | n/a | 5.586 | 21.992 | n/a | n/a | 0.106 | 6.975 | 0.345 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f0000000000000265 | 31.135 | 4.447 | n/a | 0.000 | 2.259 | 0.937 | 1.264 | 0.035 | n/a | 0.165 | 21.992 | n/a | n/a | 0.037 | 6.706 | 0.215 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.019ms |
| 19ce9be149b3ec4f000000000000024a | 28.209 | 1.860 | n/a | 0.000 | 0.062 | 0.658 | 1.089 | 0.015 | n/a | 3.847 | 20.651 | n/a | n/a | 0.026 | 1.922 | 0.068 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000023d | 27.718 | 6.865 | n/a | 0.000 | 0.110 | 4.737 | 9.934 | 0.358 | n/a | 0.842 | 4.764 | n/a | n/a | 0.106 | 6.975 | 0.252 | 0.106 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000246 | 23.904 | 1.931 | n/a | 0.000 | 0.067 | 1.310 | 1.907 | 0.031 | n/a | 3.922 | 14.709 | n/a | n/a | 0.028 | 1.998 | 0.084 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000206 | 23.592 | 2.680 | n/a | 0.000 | 0.091 | 0.676 | 2.124 | 0.050 | n/a | 0.156 | 17.773 | n/a | n/a | 0.042 | 2.771 | 0.117 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 19ce9be149b3ec4f0000000000000213 | 22.834 | 2.897 | n/a | 0.000 | 0.123 | 1.192 | 2.104 | 0.060 | n/a | 1.264 | 15.141 | n/a | n/a | 0.053 | 3.020 | 0.132 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000029e | 22.674 | 2.063 | n/a | 0.000 | 0.057 | 4.963 | 1.443 | 0.026 | n/a | 0.087 | 14.009 | n/a | n/a | 0.027 | 2.120 | 0.093 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000285 | 20.676 | 4.580 | n/a | 0.000 | 0.060 | 2.740 | 10.202 | 0.050 | n/a | 0.242 | 2.776 | n/a | n/a | 0.027 | 4.640 | 0.224 | 0.027 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.053ms |
| 19ce9be149b3ec4f0000000000000242 | 19.910 | 4.567 | n/a | 0.000 | 0.479 | 1.160 | 1.994 | 0.032 | n/a | 0.184 | 11.429 | n/a | n/a | 0.066 | 5.045 | 0.253 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000021b | 18.708 | 1.919 | n/a | 0.000 | 0.068 | 0.917 | 1.859 | 0.041 | n/a | 0.107 | 13.757 | n/a | n/a | 0.041 | 1.987 | 0.106 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000002be | 18.455 | 2.675 | n/a | 0.000 | 0.076 | 0.761 | 1.023 | 0.045 | n/a | 0.133 | 13.709 | n/a | n/a | 0.033 | 2.751 | 0.149 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000025a | 17.291 | 1.779 | n/a | 0.000 | 0.069 | 0.754 | 1.332 | 0.019 | n/a | 0.086 | 13.227 | n/a | n/a | 0.025 | 1.848 | 0.107 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000202 | 15.357 | 1.783 | n/a | 0.000 | 0.044 | 0.654 | 2.018 | 0.054 | n/a | 0.248 | 10.528 | n/a | n/a | 0.027 | 1.827 | 0.119 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 19ce9be149b3ec4f000000000000022f | 15.008 | 2.848 | n/a | 0.000 | 0.059 | 0.952 | 2.695 | 0.039 | n/a | 0.438 | 7.948 | n/a | n/a | 0.029 | 2.907 | 0.194 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000002b8 | 14.930 | 2.332 | n/a | 0.000 | 1.100 | 0.747 | 1.075 | 0.017 | n/a | 0.362 | 9.278 | n/a | n/a | 0.019 | 3.432 | 0.230 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000029c | 14.904 | 2.389 | n/a | 0.000 | 0.088 | 0.629 | 1.024 | 0.026 | n/a | 5.586 | 5.125 | n/a | n/a | 0.037 | 2.477 | 0.166 | 0.037 | gw-w/thread-46/d/db | none observed |
| 19ce9be149b3ec4f0000000000000221 | 14.798 | 2.384 | n/a | 0.000 | 0.071 | 1.058 | 1.335 | 0.022 | n/a | 0.358 | 9.543 | n/a | n/a | 0.027 | 2.454 | 0.166 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.072ms |
| 19ce9be149b3ec4f0000000000000229 | 14.730 | 2.692 | n/a | 0.000 | 0.115 | 0.911 | 3.803 | 0.043 | n/a | 0.449 | 6.669 | n/a | n/a | 0.049 | 2.807 | 0.191 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000000250 | 14.501 | 2.489 | n/a | 0.000 | 0.072 | 1.066 | 3.399 | 0.048 | n/a | 0.694 | 6.706 | n/a | n/a | 0.027 | 2.562 | 0.177 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000026e | 13.800 | 2.524 | n/a | 0.000 | 0.071 | 0.753 | 3.834 | 0.018 | n/a | 0.383 | 6.186 | n/a | n/a | 0.030 | 2.595 | 0.188 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1714 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.960 | 0.486 | 0.000 | 0.523 | 2.312 | n/a | 0.000 | 0.048 | 0.651 | 1.063 | 0.014 | n/a | 0.111 | 5.866 | n/a | n/a | 0.017 | 2.686 | 0.235 | 0.017 |
| p99 | 44.377 | 2.957 | 0.058 | 2.237 | 8.085 | n/a | 0.000 | 13.769 | 9.644 | 10.217 | 0.052 | n/a | 3.024 | 28.722 | n/a | n/a | 0.051 | 15.883 | 0.659 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f000000000000038d | 65.270 | 1.923 | n/a | 0.000 | 57.043 | 0.588 | 0.916 | 0.022 | n/a | 0.824 | 3.940 | n/a | n/a | 0.013 | 58.966 | 0.903 | 0.013 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.225ms; driver.publication.readback 0.130ms; driver.publication.readback 0.115ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.028ms |
| 19ce9be149b3ec4f000000000000038c | 58.704 | 1.875 | n/a | 0.000 | 15.773 | 1.575 | 1.888 | 0.036 | n/a | 0.821 | 36.725 | n/a | n/a | 0.012 | 17.648 | 0.301 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.014ms |
| 19ce9be149b3ec4f0000000000000842 | 57.780 | 4.127 | n/a | 2.698 | 33.872 | 0.535 | 1.442 | 0.010 | n/a | 2.641 | 12.441 | n/a | n/a | 0.014 | 40.697 | 0.704 | 0.014 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.795ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.102ms; driver.publication.readback 0.064ms; driver.publication.readback 0.054ms |
| 19ce9be149b3ec4f0000000000000890 | 56.215 | 8.283 | 0.320 | 0.000 | 0.013 | 2.179 | 8.288 | 0.023 | n/a | 0.070 | 37.026 | n/a | n/a | 0.012 | 8.616 | 0.153 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.014ms |
| 19ce9be149b3ec4f000000000000046e | 50.761 | 3.665 | n/a | 0.000 | 0.079 | 14.015 | 18.679 | 0.006 | n/a | 0.030 | 14.259 | n/a | n/a | 0.028 | 3.744 | 0.074 | 0.028 | gw-w/thread-47/commit.prepare-and-validate | driver.reader-basis.broadcast 0.172ms |
| 19ce9be149b3ec4f000000000000083f | 50.238 | 1.758 | n/a | 0.000 | 35.393 | 0.462 | 1.252 | 0.032 | n/a | 0.154 | 11.163 | n/a | n/a | 0.023 | 37.151 | 0.740 | 0.023 | node-13/thread-0/driver.queue.subject | client.encode 2.932ms; driver.expected-state.bind-receipt 1.795ms; driver.publication.readback 0.064ms; driver.publication.readback 0.054ms; driver.publication.readback 0.042ms |
| 19ce9be149b3ec4f0000000000000385 | 49.890 | 2.019 | n/a | 0.000 | 19.650 | 1.031 | 0.909 | 0.018 | n/a | 0.174 | 26.078 | n/a | n/a | 0.011 | 21.668 | 0.434 | 0.011 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.133ms; driver.publication.readback 0.126ms; driver.publication.readback 0.118ms; driver.reader-basis.broadcast 0.094ms; driver.publication.persist-deferred 0.065ms |
| 19ce9be149b3ec4f0000000000000792 | 48.611 | 2.882 | n/a | 0.000 | 0.526 | 3.555 | 3.548 | 0.003 | n/a | 0.016 | 38.062 | n/a | n/a | 0.020 | 3.408 | 0.070 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.042ms; driver.publication.persist-deferred 0.040ms |
| 19ce9be149b3ec4f0000000000000504 | 48.400 | 2.875 | n/a | 0.000 | 1.029 | 0.777 | 4.434 | 0.005 | n/a | 0.021 | 39.243 | n/a | n/a | 0.017 | 3.904 | 0.081 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms |
| 19ce9be149b3ec4f0000000000000426 | 46.786 | 3.887 | n/a | 0.000 | 3.779 | 3.178 | 6.359 | 0.035 | n/a | 3.553 | 25.973 | n/a | n/a | 0.022 | 7.666 | 0.164 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.207ms; driver.publication.readback 0.077ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.004ms |
| 19ce9be149b3ec4f00000000000002ef | 45.634 | 9.023 | 0.218 | 0.305 | 0.092 | 15.144 | 6.271 | 0.028 | n/a | 0.524 | 13.982 | n/a | n/a | 0.045 | 9.639 | 0.211 | 0.045 | node-13/thread-9/socket.wait-first-byte | none observed |
| 19ce9be149b3ec4f000000000000042d | 45.423 | 8.355 | n/a | 0.000 | 0.068 | 0.731 | 2.497 | 0.042 | n/a | 4.281 | 29.419 | n/a | n/a | 0.029 | 8.424 | 0.185 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.091ms; driver.publication.readback 0.069ms; driver.publication.readback 0.060ms; driver.publication.readback 0.050ms; driver.publication.readback 0.040ms |
| 19ce9be149b3ec4f00000000000009e2 | 45.067 | 3.788 | n/a | 0.000 | 0.012 | 0.610 | 18.936 | 0.008 | n/a | 0.040 | 21.664 | n/a | n/a | 0.010 | 3.800 | 0.084 | 0.010 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.183ms; driver.reader-basis.broadcast 0.160ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.069ms; driver.publication.readback 0.067ms |
| 19ce9be149b3ec4f0000000000000461 | 44.761 | 3.613 | n/a | 0.000 | 9.143 | 1.008 | 4.937 | 0.036 | n/a | 1.166 | 24.822 | n/a | n/a | 0.036 | 12.756 | 0.285 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.237ms; driver.reader-basis.broadcast 0.150ms; driver.publication.readback 0.063ms; driver.publication.readback 0.062ms; driver.publication.readback 0.061ms |
| 19ce9be149b3ec4f0000000000000843 | 44.518 | 5.188 | n/a | 0.000 | 0.017 | 13.261 | 5.356 | 0.073 | n/a | 0.528 | 20.083 | n/a | n/a | 0.012 | 5.205 | 0.117 | 0.012 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | client.encode 2.932ms; driver.expected-state.bind-receipt 1.795ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.064ms; driver.publication.readback 0.054ms |
| 19ce9be149b3ec4f000000000000042a | 44.435 | 1.297 | n/a | 0.000 | 24.545 | 0.394 | 1.187 | 0.012 | n/a | 0.030 | 16.959 | n/a | n/a | 0.010 | 25.842 | 0.582 | 0.010 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.091ms; driver.publication.readback 0.077ms; driver.publication.readback 0.050ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.029ms |
| 19ce9be149b3ec4f0000000000000793 | 44.417 | 2.643 | n/a | 0.000 | 2.353 | 0.865 | 0.774 | 0.010 | n/a | 0.683 | 37.063 | n/a | n/a | 0.026 | 4.996 | 0.112 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.040ms |
| 19ce9be149b3ec4f0000000000000b5a | 44.377 | 2.683 | n/a | 0.000 | 20.508 | 0.566 | 1.961 | 0.022 | n/a | 0.085 | 18.541 | n/a | n/a | 0.010 | 23.191 | 0.523 | 0.010 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.108ms; driver.publication.readback 0.063ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.019ms |
| 19ce9be149b3ec4f000000000000038e | 43.944 | 1.991 | n/a | 0.000 | 0.076 | 0.540 | 0.964 | 0.017 | n/a | 0.051 | 40.277 | n/a | n/a | 0.030 | 2.066 | 0.047 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.014ms |
| 19ce9be149b3ec4f00000000000002d9 | 43.875 | 2.262 | n/a | 0.000 | 0.071 | 0.929 | 15.450 | 0.086 | n/a | 0.116 | 24.928 | n/a | n/a | 0.033 | 2.333 | 0.053 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (999 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.484 | 0.000 | 0.000 | 0.413 | 1.861 | n/a | 0.000 | 0.049 | 0.646 | 0.924 | 0.014 | n/a | 0.112 | 5.232 | n/a | n/a | 0.017 | 2.163 | 0.218 | 0.017 |
| p99 | 42.350 | 2.004 | 0.037 | 1.049 | 5.172 | n/a | 0.000 | 13.769 | 8.847 | 6.603 | 0.049 | n/a | 2.966 | 28.384 | n/a | n/a | 0.051 | 15.421 | 0.680 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f000000000000038d | 65.270 | 1.923 | n/a | 0.000 | 57.043 | 0.588 | 0.916 | 0.022 | n/a | 0.824 | 3.940 | n/a | n/a | 0.013 | 58.966 | 0.903 | 0.013 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.225ms; driver.publication.readback 0.130ms; driver.publication.readback 0.115ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.028ms |
| 19ce9be149b3ec4f000000000000083f | 50.238 | 1.758 | n/a | 0.000 | 35.393 | 0.462 | 1.252 | 0.032 | n/a | 0.154 | 11.163 | n/a | n/a | 0.023 | 37.151 | 0.740 | 0.023 | node-13/thread-0/driver.queue.subject | client.encode 2.932ms; driver.expected-state.bind-receipt 1.795ms; driver.publication.readback 0.064ms; driver.publication.readback 0.054ms; driver.publication.readback 0.042ms |
| 19ce9be149b3ec4f0000000000000792 | 48.611 | 2.882 | n/a | 0.000 | 0.526 | 3.555 | 3.548 | 0.003 | n/a | 0.016 | 38.062 | n/a | n/a | 0.020 | 3.408 | 0.070 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.042ms; driver.publication.persist-deferred 0.040ms |
| 19ce9be149b3ec4f0000000000000504 | 48.400 | 2.875 | n/a | 0.000 | 1.029 | 0.777 | 4.434 | 0.005 | n/a | 0.021 | 39.243 | n/a | n/a | 0.017 | 3.904 | 0.081 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms |
| 19ce9be149b3ec4f0000000000000461 | 44.761 | 3.613 | n/a | 0.000 | 9.143 | 1.008 | 4.937 | 0.036 | n/a | 1.166 | 24.822 | n/a | n/a | 0.036 | 12.756 | 0.285 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.237ms; driver.reader-basis.broadcast 0.150ms; driver.publication.readback 0.063ms; driver.publication.readback 0.062ms; driver.publication.readback 0.061ms |
| 19ce9be149b3ec4f000000000000042a | 44.435 | 1.297 | n/a | 0.000 | 24.545 | 0.394 | 1.187 | 0.012 | n/a | 0.030 | 16.959 | n/a | n/a | 0.010 | 25.842 | 0.582 | 0.010 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.091ms; driver.publication.readback 0.077ms; driver.publication.readback 0.050ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.029ms |
| 19ce9be149b3ec4f0000000000000793 | 44.417 | 2.643 | n/a | 0.000 | 2.353 | 0.865 | 0.774 | 0.010 | n/a | 0.683 | 37.063 | n/a | n/a | 0.026 | 4.996 | 0.112 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.040ms |
| 19ce9be149b3ec4f000000000000038e | 43.944 | 1.991 | n/a | 0.000 | 0.076 | 0.540 | 0.964 | 0.017 | n/a | 0.051 | 40.277 | n/a | n/a | 0.030 | 2.066 | 0.047 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.014ms |
| 19ce9be149b3ec4f00000000000002d9 | 43.875 | 2.262 | n/a | 0.000 | 0.071 | 0.929 | 15.450 | 0.086 | n/a | 0.116 | 24.928 | n/a | n/a | 0.033 | 2.333 | 0.053 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000042b | 42.350 | 2.027 | n/a | 0.000 | 20.365 | 0.598 | 0.931 | 0.013 | n/a | 0.039 | 18.356 | n/a | n/a | 0.019 | 22.393 | 0.529 | 0.019 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.091ms; driver.publication.readback 0.077ms; driver.publication.readback 0.050ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.029ms |
| 19ce9be149b3ec4f0000000000000fc0 | 42.039 | 1.416 | n/a | 0.000 | 0.843 | 2.289 | 18.302 | 0.006 | n/a | 0.024 | 19.154 | n/a | n/a | 0.007 | 2.259 | 0.054 | 0.007 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.223ms; driver.publication.readback 0.142ms; driver.publication.readback 0.126ms; driver.publication.readback 0.052ms; driver.publication.readback 0.041ms |
| 19ce9be149b3ec4f000000000000045d | 41.895 | 1.851 | n/a | 0.000 | 4.862 | 0.829 | 1.162 | 0.023 | n/a | 0.235 | 32.923 | n/a | n/a | 0.010 | 6.712 | 0.160 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.150ms; driver.publication.readback 0.072ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.047ms; driver.publication.persist-deferred 0.026ms |
| 19ce9be149b3ec4f000000000000049c | 40.465 | 2.760 | n/a | 0.000 | 0.044 | 0.875 | 24.099 | 0.027 | n/a | 0.084 | 12.550 | n/a | n/a | 0.026 | 2.804 | 0.069 | 0.026 | gw-w/thread-45/gateway.route | driver.publication.readback 0.138ms; driver.publication.persist-deferred 0.020ms |
| 19ce9be149b3ec4f0000000000000840 | 39.851 | 2.119 | n/a | 0.000 | 3.817 | 12.888 | 0.483 | 0.005 | n/a | 1.617 | 18.911 | n/a | n/a | 0.011 | 5.936 | 0.149 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.795ms; driver.publication.readback 0.064ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.023ms |
| 19ce9be149b3ec4f0000000000000388 | 38.764 | 4.693 | n/a | 0.000 | 0.333 | 2.685 | 2.289 | 0.023 | n/a | 1.226 | 27.465 | n/a | n/a | 0.049 | 5.026 | 0.130 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.133ms; driver.publication.readback 0.118ms; driver.reader-basis.broadcast 0.094ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.051ms |
| 19ce9be149b3ec4f0000000000000c4d | 38.552 | 2.320 | n/a | 0.000 | 23.877 | 1.288 | 1.402 | 0.022 | n/a | 0.516 | 9.116 | n/a | n/a | 0.012 | 26.197 | 0.680 | 0.012 | node-13/thread-0/driver.queue.scheduler-late | none observed |
| 19ce9be149b3ec4f0000000000000d6e | 38.369 | 1.339 | n/a | 0.000 | 0.016 | 2.895 | 0.580 | 0.008 | n/a | 0.184 | 33.340 | n/a | n/a | 0.006 | 1.355 | 0.035 | 0.006 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.216ms; driver.publication.persist-deferred 0.019ms |
| 19ce9be149b3ec4f0000000000000427 | 37.497 | 5.621 | n/a | 0.000 | 2.076 | 5.582 | 0.844 | 0.009 | n/a | 3.704 | 19.650 | n/a | n/a | 0.012 | 7.696 | 0.205 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.207ms; driver.publication.readback 0.077ms; driver.publication.persist-deferred 0.024ms |
| 19ce9be149b3ec4f000000000000046f | 36.676 | 4.020 | n/a | 0.000 | 0.156 | 7.517 | 0.906 | 0.018 | n/a | 0.648 | 23.384 | n/a | n/a | 0.027 | 4.176 | 0.114 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 19ce9be149b3ec4f0000000000000432 | 35.370 | 1.536 | n/a | 0.000 | 0.028 | 3.875 | 1.195 | 0.021 | n/a | 1.916 | 26.781 | n/a | n/a | 0.017 | 1.564 | 0.044 | 0.017 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.123ms; driver.publication.persist-deferred 0.119ms; driver.publication.readback 0.091ms; driver.publication.readback 0.069ms; driver.publication.readback 0.060ms |

## P2 / L64 / commit (1763 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.125 | 0.257 | 0.000 | 0.543 | 2.392 | n/a | 0.000 | 0.044 | 0.601 | 1.013 | 0.014 | n/a | 0.094 | 5.456 | n/a | n/a | 0.015 | 2.751 | 0.258 | 0.015 |
| p99 | 48.254 | 2.993 | 0.055 | 2.249 | 8.134 | n/a | 0.232 | 13.644 | 8.835 | 8.842 | 0.058 | n/a | 3.258 | 34.701 | n/a | n/a | 0.044 | 17.773 | 0.649 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f0000000000001264 | 94.683 | 2.020 | n/a | 0.000 | 39.669 | 0.473 | 0.790 | 0.014 | n/a | 0.285 | 51.423 | n/a | n/a | 0.009 | 41.689 | 0.440 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.608ms; driver.publication.readback 0.073ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.067ms |
| 19ce9be149b3ec4f0000000000001213 | 89.953 | 1.406 | n/a | 0.000 | 57.485 | 0.265 | 1.471 | 0.014 | n/a | 0.106 | 29.195 | n/a | n/a | 0.009 | 58.892 | 0.655 | 0.009 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.545ms; driver.reader-basis.broadcast 0.650ms; driver.publication.readback 0.165ms; driver.publication.readback 0.161ms; driver.publication.persist-deferred 0.135ms |
| 19ce9be149b3ec4f0000000000001268 | 76.630 | 2.733 | n/a | 0.000 | 0.049 | 7.131 | 0.753 | 0.014 | n/a | 0.046 | 65.886 | n/a | n/a | 0.019 | 2.782 | 0.036 | 0.019 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.249ms; driver.publication.readback 0.073ms; driver.publication.readback 0.073ms; driver.publication.readback 0.066ms; driver.publication.readback 0.044ms |
| 19ce9be149b3ec4f000000000000126c | 71.850 | 6.653 | n/a | 0.000 | 43.261 | 0.599 | 2.935 | 0.038 | n/a | 0.923 | 17.424 | n/a | n/a | 0.016 | 49.915 | 0.695 | 0.016 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.267ms; driver.reader-basis.broadcast 0.249ms; driver.publication.readback 0.113ms; driver.publication.readback 0.073ms; driver.publication.readback 0.034ms |
| 19ce9be149b3ec4f0000000000001211 | 60.769 | 5.760 | n/a | 0.000 | 0.095 | 4.144 | 3.246 | 0.055 | n/a | 0.233 | 47.209 | n/a | n/a | 0.027 | 5.855 | 0.096 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.545ms; driver.publication.readback 0.165ms; driver.publication.persist-deferred 0.135ms; driver.publication.readback 0.101ms; driver.publication.readback 0.068ms |
| 19ce9be149b3ec4f000000000000125a | 57.969 | 2.719 | n/a | 0.000 | 28.511 | 0.642 | 1.108 | 0.016 | n/a | 0.321 | 24.639 | n/a | n/a | 0.011 | 31.230 | 0.539 | 0.011 | node-13/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.608ms; driver.publication.readback 0.104ms; driver.publication.readback 0.088ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.049ms |
| 19ce9be149b3ec4f0000000000001258 | 57.832 | 5.177 | n/a | 0.000 | 0.027 | 9.103 | 3.866 | 2.710 | n/a | 1.166 | 35.771 | n/a | n/a | 0.011 | 5.204 | 0.090 | 0.011 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.049ms; driver.publication.readback 0.034ms; driver.publication.persist-deferred 0.025ms |
| 19ce9be149b3ec4f0000000000001b3f | 55.426 | 3.341 | n/a | 0.000 | 46.725 | 1.338 | 1.296 | 0.029 | n/a | 0.172 | 2.516 | n/a | n/a | 0.010 | 50.065 | 0.903 | 0.010 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.readback 0.064ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.045ms |
| 19ce9be149b3ec4f000000000000146c | 54.677 | 3.654 | 0.196 | 0.232 | 0.019 | 6.381 | 21.823 | 0.012 | n/a | 0.042 | 22.308 | n/a | n/a | 0.010 | 4.101 | 0.075 | 0.010 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.worker-message 1.721ms; driver.reader-basis.broadcast 0.312ms; driver.publication.readback 0.171ms; driver.publication.readback 0.161ms; driver.publication.readback 0.156ms |
| 19ce9be149b3ec4f00000000000016dd | 52.292 | 7.741 | n/a | 0.000 | 0.020 | 21.235 | 4.219 | 0.072 | n/a | 0.422 | 18.574 | n/a | n/a | 0.009 | 7.761 | 0.148 | 0.009 | node-13/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.268ms; driver.publication.readback 0.168ms; driver.publication.readback 0.159ms; driver.publication.readback 0.135ms; driver.publication.readback 0.067ms |
| 19ce9be149b3ec4f0000000000001a9f | 52.083 | 3.139 | n/a | 0.000 | 0.096 | 39.443 | 1.972 | 0.023 | n/a | 0.069 | 7.315 | n/a | n/a | 0.026 | 3.236 | 0.062 | 0.026 | node-13/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.405ms |
| 19ce9be149b3ec4f0000000000001266 | 51.191 | 1.987 | n/a | 0.000 | 0.519 | 1.348 | 3.040 | 0.035 | n/a | 0.118 | 44.123 | n/a | n/a | 0.021 | 2.506 | 0.049 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.067ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.044ms |
| 19ce9be149b3ec4f0000000000001b3b | 51.067 | 1.789 | n/a | 0.000 | 3.287 | 1.039 | 0.998 | 0.017 | n/a | 3.129 | 40.795 | n/a | n/a | 0.013 | 5.076 | 0.099 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.039ms |
| 19ce9be149b3ec4f0000000000001b3d | 50.550 | 2.588 | n/a | 0.000 | 1.169 | 4.081 | 1.323 | 0.025 | n/a | 0.056 | 41.301 | n/a | n/a | 0.007 | 3.757 | 0.074 | 0.007 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.039ms |
| 19ce9be149b3ec4f0000000000001214 | 49.486 | 3.717 | n/a | 0.000 | 0.011 | 0.795 | 1.317 | 0.013 | n/a | 0.046 | 43.574 | n/a | n/a | 0.013 | 3.728 | 0.075 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.545ms; driver.publication.readback 0.165ms; driver.publication.persist-deferred 0.135ms; driver.publication.readback 0.101ms; driver.publication.readback 0.056ms |
| 19ce9be149b3ec4f0000000000001b3c | 49.352 | 2.294 | n/a | 0.000 | 0.355 | 2.594 | 0.824 | 0.012 | n/a | 0.036 | 43.231 | n/a | n/a | 0.006 | 2.650 | 0.054 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.039ms |
| 19ce9be149b3ec4f0000000000001b3e | 48.628 | 1.809 | n/a | 0.000 | 0.027 | 0.575 | 1.531 | 0.054 | n/a | 0.100 | 44.519 | n/a | n/a | 0.013 | 1.836 | 0.038 | 0.013 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.042ms |
| 19ce9be149b3ec4f0000000000001b40 | 48.254 | 1.435 | n/a | 0.000 | 0.005 | 1.066 | 1.292 | 0.018 | n/a | 0.432 | 43.998 | n/a | n/a | 0.008 | 1.440 | 0.030 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.042ms |
| 19ce9be149b3ec4f0000000000001219 | 47.583 | 3.931 | n/a | 0.000 | 2.052 | 1.062 | 1.343 | 0.014 | n/a | 1.488 | 37.677 | n/a | n/a | 0.016 | 5.983 | 0.126 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.135ms; driver.publication.readback 0.068ms; driver.publication.readback 0.066ms; driver.publication.readback 0.058ms; driver.publication.readback 0.056ms |
| 19ce9be149b3ec4f000000000000120c | 46.796 | 2.854 | n/a | 0.000 | 0.041 | 5.955 | 1.578 | 0.022 | n/a | 2.503 | 33.825 | n/a | n/a | 0.017 | 2.895 | 0.062 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.560ms; driver.publication.readback 0.182ms; driver.publication.persist-deferred 0.040ms |

## P2 / L64 / commit / 5-10 facts (1051 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.790 | 0.000 | 0.000 | 0.408 | 1.912 | n/a | 0.000 | 0.043 | 0.591 | 0.869 | 0.014 | n/a | 0.094 | 4.861 | n/a | n/a | 0.015 | 2.186 | 0.236 | 0.015 |
| p99 | 45.469 | 1.999 | 0.041 | 1.065 | 5.980 | n/a | 0.000 | 13.060 | 10.480 | 4.651 | 0.058 | n/a | 3.290 | 33.470 | n/a | n/a | 0.046 | 16.033 | 0.660 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f0000000000001264 | 94.683 | 2.020 | n/a | 0.000 | 39.669 | 0.473 | 0.790 | 0.014 | n/a | 0.285 | 51.423 | n/a | n/a | 0.009 | 41.689 | 0.440 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.608ms; driver.publication.readback 0.073ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.067ms |
| 19ce9be149b3ec4f0000000000001213 | 89.953 | 1.406 | n/a | 0.000 | 57.485 | 0.265 | 1.471 | 0.014 | n/a | 0.106 | 29.195 | n/a | n/a | 0.009 | 58.892 | 0.655 | 0.009 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.545ms; driver.reader-basis.broadcast 0.650ms; driver.publication.readback 0.165ms; driver.publication.readback 0.161ms; driver.publication.persist-deferred 0.135ms |
| 19ce9be149b3ec4f0000000000001211 | 60.769 | 5.760 | n/a | 0.000 | 0.095 | 4.144 | 3.246 | 0.055 | n/a | 0.233 | 47.209 | n/a | n/a | 0.027 | 5.855 | 0.096 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.545ms; driver.publication.readback 0.165ms; driver.publication.persist-deferred 0.135ms; driver.publication.readback 0.101ms; driver.publication.readback 0.068ms |
| 19ce9be149b3ec4f0000000000001258 | 57.832 | 5.177 | n/a | 0.000 | 0.027 | 9.103 | 3.866 | 2.710 | n/a | 1.166 | 35.771 | n/a | n/a | 0.011 | 5.204 | 0.090 | 0.011 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.049ms; driver.publication.readback 0.034ms; driver.publication.persist-deferred 0.025ms |
| 19ce9be149b3ec4f0000000000001b3f | 55.426 | 3.341 | n/a | 0.000 | 46.725 | 1.338 | 1.296 | 0.029 | n/a | 0.172 | 2.516 | n/a | n/a | 0.010 | 50.065 | 0.903 | 0.010 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.readback 0.064ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.045ms |
| 19ce9be149b3ec4f00000000000016dd | 52.292 | 7.741 | n/a | 0.000 | 0.020 | 21.235 | 4.219 | 0.072 | n/a | 0.422 | 18.574 | n/a | n/a | 0.009 | 7.761 | 0.148 | 0.009 | node-13/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.268ms; driver.publication.readback 0.168ms; driver.publication.readback 0.159ms; driver.publication.readback 0.135ms; driver.publication.readback 0.067ms |
| 19ce9be149b3ec4f0000000000001b3b | 51.067 | 1.789 | n/a | 0.000 | 3.287 | 1.039 | 0.998 | 0.017 | n/a | 3.129 | 40.795 | n/a | n/a | 0.013 | 5.076 | 0.099 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.039ms |
| 19ce9be149b3ec4f0000000000001b3c | 49.352 | 2.294 | n/a | 0.000 | 0.355 | 2.594 | 0.824 | 0.012 | n/a | 0.036 | 43.231 | n/a | n/a | 0.006 | 2.650 | 0.054 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.039ms |
| 19ce9be149b3ec4f0000000000001b3e | 48.628 | 1.809 | n/a | 0.000 | 0.027 | 0.575 | 1.531 | 0.054 | n/a | 0.100 | 44.519 | n/a | n/a | 0.013 | 1.836 | 0.038 | 0.013 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.130ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.042ms |
| 19ce9be149b3ec4f000000000000126d | 46.226 | 1.573 | n/a | 0.000 | 0.054 | 8.225 | 1.213 | 0.029 | n/a | 0.419 | 34.701 | n/a | n/a | 0.012 | 1.627 | 0.035 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.249ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.017ms |
| 19ce9be149b3ec4f0000000000001879 | 45.469 | 2.582 | n/a | 0.000 | 0.066 | 1.286 | 28.587 | 0.009 | n/a | 0.024 | 12.891 | n/a | n/a | 0.023 | 2.648 | 0.058 | 0.023 | gw-w/thread-45/commit.prepare-and-validate | driver.publication.persist-deferred 0.024ms |
| 19ce9be149b3ec4f000000000000187a | 44.744 | 2.227 | n/a | 0.000 | 1.478 | 22.962 | 0.943 | 0.021 | n/a | 0.079 | 17.023 | n/a | n/a | 0.011 | 3.704 | 0.083 | 0.011 | node-13/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 0.024ms |
| 19ce9be149b3ec4f000000000000140c | 43.658 | 13.650 | n/a | 2.570 | 0.086 | 13.486 | 3.438 | 0.046 | n/a | 0.201 | 10.145 | n/a | n/a | 0.037 | 16.306 | 0.373 | 0.037 | node-13/thread-0/socket.wait-first-byte | none observed |
| 19ce9be149b3ec4f0000000000001263 | 43.516 | 3.300 | n/a | 0.000 | 5.906 | 2.110 | 0.868 | 0.016 | n/a | 2.912 | 28.379 | n/a | n/a | 0.026 | 9.205 | 0.212 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.608ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.044ms |
| 19ce9be149b3ec4f0000000000001262 | 41.732 | 2.390 | n/a | 0.000 | 0.072 | 1.235 | 0.762 | 0.013 | n/a | 0.443 | 36.788 | n/a | n/a | 0.028 | 2.462 | 0.059 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.608ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.044ms |
| 19ce9be149b3ec4f0000000000001243 | 41.619 | 10.696 | n/a | 0.000 | 0.023 | 7.377 | 4.759 | 0.063 | n/a | 0.469 | 18.217 | n/a | n/a | 0.015 | 10.719 | 0.258 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.098ms; driver.publication.readback 0.071ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.017ms |
| 19ce9be149b3ec4f0000000000001148 | 41.590 | 2.595 | n/a | 0.000 | 4.397 | 3.667 | 0.954 | 0.019 | n/a | 0.050 | 29.903 | n/a | n/a | 0.005 | 6.992 | 0.168 | 0.005 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.082ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.037ms; driver.publication.persist-deferred 0.017ms |
| 19ce9be149b3ec4f0000000000001229 | 41.438 | 1.971 | n/a | 0.000 | 0.809 | 0.422 | 0.527 | 0.006 | n/a | 0.020 | 37.657 | n/a | n/a | 0.025 | 2.781 | 0.067 | 0.025 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.238ms; driver.publication.readback 0.097ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.022ms |
| 19ce9be149b3ec4f0000000000001c02 | 41.129 | 2.861 | n/a | 0.000 | 5.076 | 0.386 | 0.656 | 0.009 | n/a | 0.052 | 32.077 | n/a | n/a | 0.013 | 7.937 | 0.193 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.338ms; driver.publication.readback 0.123ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.023ms |
| 19ce9be149b3ec4f0000000000001aa1 | 41.014 | 2.616 | n/a | 0.000 | 22.230 | 3.242 | 1.411 | 0.015 | n/a | 0.047 | 11.438 | n/a | n/a | 0.015 | 24.846 | 0.606 | 0.015 | node-13/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.022ms |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.593 | 0.137 | 0.000 | 0.523 | 3.502 | n/a | 0.000 | 0.042 | 0.842 | 2.070 | 0.022 | n/a | 0.103 | 6.633 | n/a | n/a | 0.020 | 3.880 | 0.254 | 0.020 |
| p99 | 111.271 | 2.619 | 0.374 | 2.514 | 56.687 | n/a | 0.000 | 1.610 | 16.658 | 78.830 | 0.089 | n/a | 4.194 | 55.909 | n/a | n/a | 0.067 | 56.981 | 0.657 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f0000000000001ef7 | 111.271 | 9.813 | 0.277 | 0.000 | 0.045 | 3.795 | 78.830 | 0.089 | n/a | 4.194 | 14.211 | n/a | n/a | 0.016 | 10.135 | 0.091 | 0.016 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.342ms |
| 19ce9be149b3ec4f0000000000001ea5 | 86.696 | 56.687 | 0.242 | 0.000 | 0.052 | 1.928 | 2.375 | 0.034 | n/a | 0.108 | 25.249 | n/a | n/a | 0.021 | 56.981 | 0.657 | 0.021 | node-13/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.475ms; driver.publication.persist-deferred 0.034ms |
| 19ce9be149b3ec4f0000000000001e9f | 77.042 | 7.925 | 0.234 | 0.000 | 0.061 | 6.835 | 5.839 | 0.051 | n/a | 0.164 | 55.909 | n/a | n/a | 0.022 | 8.220 | 0.107 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.349ms |
| 19ce9be149b3ec4f0000000000001e9c | 49.551 | 12.590 | 0.230 | 0.000 | 0.045 | 16.658 | 11.442 | 0.041 | n/a | 0.316 | 8.208 | n/a | n/a | 0.021 | 12.865 | 0.260 | 0.021 | node-13/thread-9/socket.wait-first-byte | none observed |
| 19ce9be149b3ec4f0000000000001eae | 43.991 | 4.404 | 0.370 | 0.000 | 0.059 | 3.693 | 23.563 | 0.058 | n/a | 2.969 | 8.855 | n/a | n/a | 0.020 | 4.833 | 0.110 | 0.020 | gw-w/thread-64/gateway.admitted-work | driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.022ms |
| 19ce9be149b3ec4f0000000000001ea6 | 40.395 | 3.513 | n/a | 0.000 | 0.082 | 0.600 | 0.971 | 0.019 | n/a | 0.251 | 34.938 | n/a | n/a | 0.021 | 3.595 | 0.089 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ea3 | 38.649 | 13.512 | 0.305 | 0.000 | 0.081 | 1.980 | 12.083 | 0.051 | n/a | 0.562 | 10.048 | n/a | n/a | 0.028 | 13.898 | 0.360 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ecf | 36.420 | 8.184 | 0.334 | 0.000 | 0.043 | 5.811 | 3.504 | 0.077 | n/a | 0.079 | 18.371 | n/a | n/a | 0.017 | 8.562 | 0.235 | 0.017 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001eb7 | 36.063 | 5.161 | 0.461 | 0.000 | 0.059 | 5.243 | 9.214 | 0.065 | n/a | 0.232 | 15.611 | n/a | n/a | 0.018 | 5.681 | 0.158 | 0.018 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f38 | 34.875 | 14.120 | 0.331 | 0.000 | 0.049 | 1.755 | 13.224 | 0.030 | n/a | 0.436 | 4.914 | n/a | n/a | 0.016 | 14.500 | 0.416 | 0.016 | gw-w/thread-62/gateway.admitted-work | none observed |
| 19ce9be149b3ec4f0000000000001ef5 | 32.618 | 11.096 | 0.803 | 0.000 | 0.047 | 2.161 | 7.831 | 0.065 | n/a | 0.175 | 10.422 | n/a | n/a | 0.017 | 11.946 | 0.366 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ead | 31.094 | 2.153 | n/a | 0.000 | 1.147 | 0.440 | 6.481 | 0.022 | n/a | 0.060 | 20.778 | n/a | n/a | 0.012 | 3.300 | 0.106 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f52 | 29.720 | 8.933 | 0.217 | 0.000 | 0.049 | 1.667 | 12.060 | 0.053 | n/a | 0.120 | 6.581 | n/a | n/a | 0.040 | 9.199 | 0.310 | 0.040 | gw-w/thread-44/gateway.admitted-work | none observed |
| 19ce9be149b3ec4f0000000000001f26 | 28.917 | 9.083 | 0.173 | 0.000 | 0.042 | 1.491 | 9.657 | 0.031 | n/a | 0.420 | 8.007 | n/a | n/a | 0.013 | 9.298 | 0.322 | 0.013 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001eb9 | 28.185 | 5.766 | 0.344 | 0.000 | 0.046 | 1.598 | 11.342 | 0.042 | n/a | 0.167 | 8.860 | n/a | n/a | 0.019 | 6.156 | 0.218 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f0b | 27.753 | 3.200 | 0.624 | 0.000 | 0.077 | 4.518 | 10.299 | 0.040 | n/a | 0.164 | 8.805 | n/a | n/a | 0.027 | 3.901 | 0.141 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f01 | 27.681 | 10.484 | 0.434 | 0.000 | 0.047 | 5.532 | 2.904 | 0.030 | n/a | 0.108 | 8.115 | n/a | n/a | 0.028 | 10.965 | 0.396 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f11 | 25.926 | 8.234 | 0.206 | 0.000 | 0.033 | 2.209 | 6.358 | 0.036 | n/a | 0.090 | 8.740 | n/a | n/a | 0.020 | 8.473 | 0.327 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f2e | 25.343 | 6.162 | 0.164 | 0.000 | 0.044 | 1.518 | 6.002 | 0.026 | n/a | 0.083 | 11.330 | n/a | n/a | 0.014 | 6.370 | 0.251 | 0.014 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ebd | 25.194 | 4.728 | 0.184 | 0.000 | 0.034 | 1.416 | 8.977 | 0.039 | n/a | 0.072 | 9.723 | n/a | n/a | 0.023 | 4.946 | 0.196 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.051 | 0.000 | 0.000 | 0.502 | 2.438 | n/a | 0.000 | 0.037 | 0.575 | 1.119 | 0.015 | n/a | 0.074 | 5.466 | n/a | n/a | 0.019 | 2.506 | 0.253 | 0.019 |
| p99 | 40.395 | 1.998 | 0.000 | 0.892 | 5.857 | n/a | 0.000 | 1.610 | 3.432 | 6.481 | 0.036 | n/a | 0.573 | 34.938 | n/a | n/a | 0.067 | 6.222 | 0.367 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f0000000000001ea6 | 40.395 | 3.513 | n/a | 0.000 | 0.082 | 0.600 | 0.971 | 0.019 | n/a | 0.251 | 34.938 | n/a | n/a | 0.021 | 3.595 | 0.089 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ead | 31.094 | 2.153 | n/a | 0.000 | 1.147 | 0.440 | 6.481 | 0.022 | n/a | 0.060 | 20.778 | n/a | n/a | 0.012 | 3.300 | 0.106 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001e98 | 18.681 | 5.857 | n/a | 0.000 | 0.366 | 1.105 | 1.929 | 0.025 | n/a | 0.453 | 8.879 | n/a | n/a | 0.067 | 6.222 | 0.333 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ea9 | 16.593 | 3.203 | n/a | 0.000 | 0.080 | 0.472 | 1.368 | 0.017 | n/a | 0.096 | 11.335 | n/a | n/a | 0.021 | 3.282 | 0.198 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ec5 | 15.939 | 1.985 | n/a | 0.000 | 0.025 | 0.270 | 1.045 | 0.013 | n/a | 0.053 | 12.536 | n/a | n/a | 0.011 | 2.010 | 0.126 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f07 | 15.879 | 2.015 | n/a | 0.000 | 0.029 | 0.541 | 1.082 | 0.023 | n/a | 0.252 | 11.921 | n/a | n/a | 0.015 | 2.044 | 0.129 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001eab | 15.285 | 3.070 | n/a | 0.000 | 0.033 | 0.770 | 1.908 | 0.026 | n/a | 0.566 | 8.892 | n/a | n/a | 0.020 | 3.103 | 0.203 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f33 | 14.088 | 2.254 | n/a | 0.000 | 0.037 | 3.432 | 1.016 | 0.011 | n/a | 0.040 | 7.280 | n/a | n/a | 0.018 | 2.290 | 0.163 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ebb | 12.796 | 2.438 | n/a | 0.000 | 0.059 | 0.796 | 2.553 | 0.013 | n/a | 0.063 | 6.849 | n/a | n/a | 0.024 | 2.497 | 0.195 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ea1 | 12.115 | 2.234 | n/a | 0.000 | 1.610 | 0.502 | 1.044 | 0.014 | n/a | 0.064 | 6.633 | n/a | n/a | 0.015 | 3.844 | 0.317 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.266ms |
| 19ce9be149b3ec4f0000000000001eea | 11.627 | 3.318 | n/a | 0.000 | 0.012 | 0.568 | 1.013 | 0.013 | n/a | 0.260 | 6.436 | n/a | n/a | 0.008 | 3.329 | 0.286 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f4d | 11.380 | 2.390 | n/a | 0.000 | 0.010 | 0.842 | 2.070 | 0.012 | n/a | 0.050 | 5.999 | n/a | n/a | 0.007 | 2.400 | 0.211 | 0.007 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001efb | 11.295 | 2.052 | n/a | 0.000 | 0.047 | 0.513 | 1.065 | 0.018 | n/a | 0.356 | 7.222 | n/a | n/a | 0.022 | 2.099 | 0.186 | 0.022 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f53 | 10.997 | 2.637 | n/a | 0.000 | 0.047 | 0.514 | 0.988 | 0.013 | n/a | 0.074 | 6.701 | n/a | n/a | 0.024 | 2.684 | 0.244 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001ed5 | 10.653 | 3.310 | n/a | 0.000 | 0.062 | 0.450 | 2.235 | 0.019 | n/a | 0.306 | 4.236 | n/a | n/a | 0.036 | 3.372 | 0.317 | 0.036 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f20 | 10.570 | 2.196 | n/a | 0.000 | 0.040 | 0.778 | 1.752 | 0.036 | n/a | 0.172 | 5.573 | n/a | n/a | 0.022 | 2.237 | 0.212 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f3a | 10.149 | 3.083 | n/a | 0.000 | 0.026 | 0.684 | 1.722 | 0.024 | n/a | 0.573 | 4.024 | n/a | n/a | 0.015 | 3.109 | 0.306 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f13 | 10.051 | 2.379 | n/a | 0.000 | 0.031 | 0.640 | 1.628 | 0.026 | n/a | 0.103 | 5.230 | n/a | n/a | 0.014 | 2.409 | 0.240 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f4a | 9.962 | 1.906 | n/a | 0.000 | 0.030 | 0.589 | 1.338 | 0.022 | n/a | 0.070 | 5.991 | n/a | n/a | 0.016 | 1.936 | 0.194 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.448ms |
| 19ce9be149b3ec4f0000000000001f56 | 9.945 | 2.150 | n/a | 0.000 | 0.028 | 0.473 | 0.964 | 0.013 | n/a | 0.047 | 6.255 | n/a | n/a | 0.014 | 2.178 | 0.219 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.442 | 0.033 | 0.000 | 0.468 | 4.292 | n/a | 0.000 | 0.044 | 1.002 | 1.550 | 0.020 | n/a | 0.096 | 6.280 | n/a | n/a | 0.022 | 4.641 | 0.305 | 0.022 |
| p99 | 72.315 | 2.609 | 0.336 | 2.222 | 22.097 | n/a | 1.386 | 4.944 | 10.669 | 40.441 | 0.447 | n/a | 0.680 | 51.518 | n/a | n/a | 0.055 | 22.802 | 0.672 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f0000000000001fa7 | 72.315 | 19.800 | 0.163 | 0.000 | 0.043 | 5.247 | 40.441 | 0.023 | n/a | 0.291 | 6.280 | n/a | n/a | 0.025 | 20.007 | 0.277 | 0.025 | gw-w/thread-44/gateway.admitted-work | none observed |
| 19ce9be149b3ec4f0000000000001f7d | 65.062 | 7.941 | 0.199 | 0.000 | 0.014 | 3.931 | 1.261 | 0.017 | n/a | 0.174 | 51.518 | n/a | n/a | 0.007 | 8.155 | 0.125 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.126ms; driver.publication.persist-deferred 0.041ms |
| 19ce9be149b3ec4f0000000000001f7c | 55.672 | 5.979 | n/a | 0.000 | 0.068 | 0.573 | 3.519 | 0.012 | n/a | 0.045 | 45.445 | n/a | n/a | 0.031 | 6.046 | 0.109 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f6d | 39.602 | 7.703 | 1.317 | 0.000 | 0.044 | 4.782 | 10.688 | 0.038 | n/a | 0.117 | 14.899 | n/a | n/a | 0.014 | 9.064 | 0.229 | 0.014 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001fd6 | 39.097 | 8.474 | 0.162 | 0.000 | 0.044 | 0.966 | 25.109 | 0.021 | n/a | 0.249 | 4.058 | n/a | n/a | 0.014 | 8.679 | 0.222 | 0.014 | gw-w/thread-45/gateway.admitted-work | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.020ms |
| 19ce9be149b3ec4f0000000000001f72 | 38.850 | 3.887 | 0.382 | 0.000 | 0.044 | 1.284 | 14.493 | 0.050 | n/a | 0.437 | 18.256 | n/a | n/a | 0.017 | 4.313 | 0.111 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f90 | 37.977 | 22.097 | 0.664 | 0.000 | 0.040 | 1.609 | 7.527 | 0.025 | n/a | 0.381 | 5.619 | n/a | n/a | 0.014 | 22.802 | 0.600 | 0.014 | node-13/thread-9/client.persist-and-resolve | none observed |
| 19ce9be149b3ec4f000000000000200a | 37.075 | 14.715 | 1.276 | 0.000 | 0.045 | 5.647 | 5.852 | 0.023 | n/a | 0.088 | 9.393 | n/a | n/a | 0.034 | 16.037 | 0.433 | 0.034 | node-13/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.333ms |
| 19ce9be149b3ec4f0000000000001fbf | 36.905 | 16.502 | 0.190 | 0.000 | 0.068 | 3.761 | 6.426 | 0.021 | n/a | 0.327 | 9.579 | n/a | n/a | 0.032 | 16.760 | 0.454 | 0.032 | node-13/thread-9/client.persist-and-resolve | none observed |
| 19ce9be149b3ec4f0000000000001ff8 | 34.816 | 16.832 | 0.267 | 0.000 | 0.044 | 1.442 | 6.362 | 0.036 | n/a | 0.461 | 9.355 | n/a | n/a | 0.016 | 17.143 | 0.492 | 0.016 | node-13/thread-9/client.persist-and-resolve | none observed |
| 19ce9be149b3ec4f0000000000001fcf | 33.840 | 17.221 | 0.235 | 0.000 | 0.047 | 1.633 | 5.493 | 0.021 | n/a | 0.061 | 9.113 | n/a | n/a | 0.017 | 17.503 | 0.517 | 0.017 | node-13/thread-9/client.persist-and-resolve | none observed |
| 19ce9be149b3ec4f0000000000001ff2 | 32.494 | 8.470 | 0.172 | 0.000 | 0.062 | 5.479 | 5.894 | 0.020 | n/a | 0.315 | 12.044 | n/a | n/a | 0.037 | 8.704 | 0.268 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f5e | 30.973 | 4.404 | 0.195 | 0.000 | 0.042 | 10.669 | 8.979 | 0.024 | n/a | 0.076 | 6.566 | n/a | n/a | 0.017 | 4.641 | 0.150 | 0.017 | node-13/thread-9/socket.wait-first-byte | none observed |
| 19ce9be149b3ec4f0000000000002018 | 29.194 | 10.575 | 0.232 | 0.000 | 0.079 | 2.425 | 6.258 | 0.092 | n/a | 0.385 | 9.094 | n/a | n/a | 0.055 | 10.885 | 0.373 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 2.646ms |
| 19ce9be149b3ec4f0000000000001fb9 | 28.964 | 5.045 | 0.169 | 0.000 | 0.042 | 4.893 | 6.491 | 0.025 | n/a | 0.333 | 11.949 | n/a | n/a | 0.016 | 5.256 | 0.181 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001fd5 | 28.884 | 3.195 | n/a | 0.000 | 0.079 | 4.145 | 0.861 | 0.014 | n/a | 0.048 | 20.512 | n/a | n/a | 0.031 | 3.273 | 0.113 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001fbb | 28.681 | 4.926 | 0.224 | 0.000 | 0.044 | 6.255 | 9.169 | 0.026 | n/a | 0.366 | 7.655 | n/a | n/a | 0.017 | 5.193 | 0.181 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001fdb | 26.456 | 5.356 | 0.246 | 0.000 | 0.041 | 8.962 | 1.918 | 0.019 | n/a | 0.334 | 9.564 | n/a | n/a | 0.016 | 5.643 | 0.213 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001fe3 | 25.863 | 3.469 | 0.268 | 0.000 | 0.079 | 4.707 | 10.927 | 0.037 | n/a | 0.179 | 6.159 | n/a | n/a | 0.039 | 3.815 | 0.148 | 0.039 | gw-w/thread-46/gateway.admitted-work | none observed |
| 19ce9be149b3ec4f0000000000001f8c | 25.683 | 13.071 | 0.211 | 0.000 | 0.071 | 1.892 | 6.416 | 0.024 | n/a | 0.350 | 3.614 | n/a | n/a | 0.033 | 13.353 | 0.520 | 0.033 | node-13/thread-9/client.persist-and-resolve | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.378 | 0.000 | 0.000 | 0.474 | 3.195 | n/a | 0.000 | 0.040 | 0.610 | 1.094 | 0.013 | n/a | 0.071 | 4.894 | n/a | n/a | 0.023 | 3.283 | 0.301 | 0.023 |
| p99 | 28.884 | 2.176 | 0.172 | 1.178 | 6.668 | n/a | 1.386 | 4.944 | 7.876 | 10.348 | 0.059 | n/a | 0.611 | 20.512 | n/a | n/a | 0.053 | 6.837 | 0.562 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f0000000000001fd5 | 28.884 | 3.195 | n/a | 0.000 | 0.079 | 4.145 | 0.861 | 0.014 | n/a | 0.048 | 20.512 | n/a | n/a | 0.031 | 3.273 | 0.113 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f71 | 23.304 | 5.697 | n/a | 0.000 | 0.040 | 7.876 | 7.454 | 0.059 | n/a | 0.112 | 2.049 | n/a | n/a | 0.018 | 5.736 | 0.246 | 0.018 | node-13/thread-0/socket.wait-first-byte | none observed |
| 19ce9be149b3ec4f0000000000001f9a | 21.824 | 3.595 | n/a | 0.000 | 0.035 | 5.400 | 10.348 | 0.057 | n/a | 0.611 | 1.760 | n/a | n/a | 0.018 | 3.629 | 0.166 | 0.018 | gw-w/thread-42/storage/begin-command! | none observed |
| 19ce9be149b3ec4f0000000000002004 | 17.473 | 3.341 | n/a | 1.386 | 0.029 | 0.338 | 0.612 | 0.012 | n/a | 0.072 | 11.659 | n/a | n/a | 0.024 | 4.756 | 0.272 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.369ms |
| 19ce9be149b3ec4f0000000000001f8e | 16.156 | 2.442 | n/a | 0.000 | 0.031 | 0.577 | 1.296 | 0.022 | n/a | 0.509 | 11.261 | n/a | n/a | 0.017 | 2.472 | 0.153 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002006 | 16.090 | 6.668 | n/a | 0.000 | 0.068 | 0.829 | 0.809 | 0.012 | n/a | 0.277 | 7.375 | n/a | n/a | 0.051 | 6.736 | 0.419 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f82 | 14.143 | 2.624 | n/a | 0.000 | 0.039 | 0.655 | 1.187 | 0.018 | n/a | 0.098 | 9.507 | n/a | n/a | 0.016 | 2.662 | 0.188 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f62 | 13.555 | 3.567 | n/a | 0.000 | 0.054 | 2.362 | 1.285 | 0.019 | n/a | 0.275 | 5.969 | n/a | n/a | 0.024 | 3.622 | 0.267 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f88 | 13.304 | 2.194 | n/a | 0.000 | 0.037 | 0.516 | 1.116 | 0.015 | n/a | 0.065 | 9.342 | n/a | n/a | 0.019 | 2.231 | 0.168 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002010 | 12.526 | 2.977 | n/a | 0.000 | 0.030 | 0.627 | 1.423 | 0.024 | n/a | 0.541 | 6.881 | n/a | n/a | 0.023 | 3.007 | 0.240 | 0.023 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f96 | 12.476 | 2.658 | n/a | 0.000 | 0.033 | 0.424 | 0.914 | 0.012 | n/a | 0.068 | 8.352 | n/a | n/a | 0.014 | 2.692 | 0.216 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001fed | 12.156 | 1.893 | n/a | 0.000 | 4.944 | 0.750 | 1.281 | 0.026 | n/a | 0.090 | 3.157 | n/a | n/a | 0.014 | 6.837 | 0.562 | 0.014 | node-13/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.036ms |
| 19ce9be149b3ec4f000000000000200c | 11.994 | 3.908 | n/a | 0.000 | 0.069 | 3.546 | 0.814 | 0.012 | n/a | 0.052 | 3.540 | n/a | n/a | 0.053 | 3.978 | 0.332 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.485ms |
| 19ce9be149b3ec4f0000000000001fcb | 11.857 | 3.515 | n/a | 0.000 | 0.055 | 0.577 | 1.094 | 0.021 | n/a | 0.247 | 6.325 | n/a | n/a | 0.024 | 3.570 | 0.301 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f5a | 11.801 | 2.641 | n/a | 0.000 | 0.034 | 0.439 | 1.139 | 0.012 | n/a | 0.054 | 7.453 | n/a | n/a | 0.028 | 2.676 | 0.227 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f8a | 11.502 | 2.514 | n/a | 0.000 | 0.034 | 0.455 | 2.088 | 0.013 | n/a | 0.042 | 6.335 | n/a | n/a | 0.020 | 2.548 | 0.222 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001f9c | 11.468 | 3.379 | n/a | 0.000 | 0.032 | 0.559 | 0.818 | 0.013 | n/a | 0.050 | 6.602 | n/a | n/a | 0.014 | 3.411 | 0.297 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001fe1 | 11.378 | 4.535 | n/a | 0.000 | 0.064 | 0.592 | 0.813 | 0.013 | n/a | 0.075 | 5.259 | n/a | n/a | 0.028 | 4.599 | 0.404 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000001fab | 11.275 | 3.621 | n/a | 0.000 | 0.430 | 0.610 | 0.851 | 0.012 | n/a | 0.209 | 5.517 | n/a | n/a | 0.023 | 4.051 | 0.359 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.325ms |
| 19ce9be149b3ec4f0000000000001f9f | 10.627 | 4.194 | n/a | 0.000 | 0.030 | 0.633 | 0.784 | 0.013 | n/a | 0.054 | 4.894 | n/a | n/a | 0.026 | 4.224 | 0.397 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (366 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.158 | 0.137 | 0.000 | 0.456 | 3.467 | n/a | 0.000 | 0.052 | 0.904 | 1.640 | 0.022 | n/a | 0.093 | 5.761 | n/a | n/a | 0.035 | 3.773 | 0.271 | 0.035 |
| p99 | 53.687 | 3.320 | 0.000 | 2.730 | 15.522 | n/a | 1.969 | 1.906 | 3.441 | 13.150 | 0.076 | n/a | 1.081 | 35.996 | n/a | n/a | 0.104 | 15.752 | 0.581 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f00000000000020de | 61.230 | 9.180 | n/a | 0.000 | 0.115 | 0.835 | 1.710 | 0.017 | n/a | 0.064 | 49.249 | n/a | n/a | 0.059 | 9.295 | 0.152 | 0.059 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.223ms |
| 19ce9be149b3ec4f00000000000021b1 | 60.781 | 2.805 | n/a | 0.000 | 0.096 | 0.628 | 0.820 | 0.013 | n/a | 0.674 | 55.692 | n/a | n/a | 0.053 | 2.901 | 0.048 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.419ms |
| 19ce9be149b3ec4f0000000000002036 | 54.604 | 4.882 | n/a | 0.000 | 1.838 | 0.937 | 2.415 | 0.021 | n/a | 0.090 | 44.386 | n/a | n/a | 0.034 | 6.720 | 0.123 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002059 | 53.687 | 17.953 | 0.149 | 0.451 | 0.040 | 1.650 | 21.279 | 0.028 | n/a | 0.075 | 12.030 | n/a | n/a | 0.034 | 18.593 | 0.346 | 0.034 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.418ms |
| 19ce9be149b3ec4f00000000000020c0 | 45.140 | 3.578 | 0.170 | 0.000 | 0.037 | 1.732 | 8.333 | 19.874 | n/a | 0.101 | 11.284 | n/a | n/a | 0.031 | 3.785 | 0.084 | 0.031 | gw-w/thread-49/gateway.admission-wait | driver.reader-basis.broadcast 0.416ms |
| 19ce9be149b3ec4f0000000000002297 | 41.107 | 2.882 | 0.192 | 0.000 | 0.069 | 0.716 | 1.124 | 0.019 | n/a | 0.075 | 35.996 | n/a | n/a | 0.034 | 3.143 | 0.076 | 0.034 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002161 | 36.391 | 3.490 | 0.192 | 0.000 | 0.067 | 1.058 | 21.573 | 0.023 | n/a | 0.065 | 9.887 | n/a | n/a | 0.035 | 3.750 | 0.103 | 0.035 | gw-w/thread-42/gateway.admitted-work | none observed |
| 19ce9be149b3ec4f0000000000002048 | 35.975 | 17.538 | 0.291 | 0.000 | 0.046 | 1.712 | 3.301 | 0.033 | n/a | 0.073 | 12.948 | n/a | n/a | 0.033 | 17.874 | 0.497 | 0.033 | node-13/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.537ms |
| 19ce9be149b3ec4f0000000000002213 | 35.637 | 2.848 | 0.165 | 0.400 | 0.052 | 0.949 | 20.953 | 0.074 | n/a | 0.085 | 10.076 | n/a | n/a | 0.036 | 3.464 | 0.097 | 0.036 | gw-w/thread-64/commit.prepare-and-validate | none observed |
| 19ce9be149b3ec4f0000000000002235 | 32.696 | 5.163 | n/a | 1.470 | 0.035 | 0.667 | 1.386 | 0.014 | n/a | 0.076 | 23.855 | n/a | n/a | 0.029 | 6.669 | 0.204 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000022ec | 30.825 | 5.572 | 0.331 | 0.000 | 0.111 | 1.895 | 10.413 | 0.027 | n/a | 0.485 | 11.936 | n/a | n/a | 0.054 | 6.014 | 0.195 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.084ms |
| 19ce9be149b3ec4f0000000000002032 | 30.610 | 15.522 | 0.172 | 0.000 | 0.058 | 1.060 | 2.646 | 0.034 | n/a | 0.107 | 10.976 | n/a | n/a | 0.036 | 15.752 | 0.515 | 0.036 | node-13/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.370ms |
| 19ce9be149b3ec4f000000000000209f | 30.016 | 14.301 | 0.256 | 0.000 | 0.171 | 1.870 | 4.396 | 0.031 | n/a | 0.478 | 8.441 | n/a | n/a | 0.071 | 14.728 | 0.491 | 0.071 | node-13/thread-9/client.persist-and-resolve | none observed |
| 19ce9be149b3ec4f0000000000002108 | 28.239 | 3.570 | 0.164 | 0.000 | 0.044 | 1.365 | 13.150 | 0.024 | n/a | 0.090 | 9.802 | n/a | n/a | 0.030 | 3.777 | 0.134 | 0.030 | gw-w/thread-49/gateway.admitted-work | none observed |
| 19ce9be149b3ec4f0000000000002123 | 28.033 | 4.243 | 0.370 | 0.000 | 0.048 | 1.805 | 11.121 | 0.071 | n/a | 0.679 | 9.667 | n/a | n/a | 0.029 | 4.662 | 0.166 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002085 | 27.423 | 13.945 | 0.280 | 0.000 | 0.043 | 0.804 | 1.742 | 0.023 | n/a | 0.075 | 10.488 | n/a | n/a | 0.023 | 14.268 | 0.520 | 0.023 | node-13/thread-9/client.persist-and-resolve | none observed |
| 19ce9be149b3ec4f000000000000206b | 27.405 | 16.478 | 0.162 | 0.321 | 0.055 | 0.730 | 2.978 | 0.018 | n/a | 0.040 | 6.594 | n/a | n/a | 0.030 | 17.015 | 0.621 | 0.030 | node-13/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.423ms |
| 19ce9be149b3ec4f000000000000224c | 25.698 | 4.974 | 0.172 | 0.000 | 0.054 | 1.948 | 5.303 | 0.021 | n/a | 0.066 | 13.121 | n/a | n/a | 0.037 | 5.201 | 0.202 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002276 | 25.656 | 6.687 | n/a | 0.000 | 0.094 | 1.170 | 1.335 | 0.016 | n/a | 0.324 | 15.968 | n/a | n/a | 0.063 | 6.781 | 0.264 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000022de | 25.248 | 3.830 | 0.458 | 0.000 | 0.072 | 1.438 | 9.411 | 0.076 | n/a | 0.064 | 9.853 | n/a | n/a | 0.045 | 4.360 | 0.173 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.068ms |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.713 | 0.000 | 0.000 | 0.448 | 2.286 | n/a | 0.000 | 0.044 | 0.700 | 1.115 | 0.019 | n/a | 0.109 | 5.138 | n/a | n/a | 0.033 | 2.410 | 0.234 | 0.033 |
| p99 | 18.237 | 2.001 | 0.000 | 1.077 | 4.600 | n/a | 0.000 | 1.710 | 3.785 | 5.076 | 0.061 | n/a | 0.795 | 13.410 | n/a | n/a | 0.086 | 5.669 | 0.538 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 19ce9be149b3ec4f00000000000021b1 | 60.781 | 2.805 | n/a | 0.000 | 0.096 | 0.628 | 0.820 | 0.013 | n/a | 0.674 | 55.692 | n/a | n/a | 0.053 | 2.901 | 0.048 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.419ms |
| 19ce9be149b3ec4f0000000000002075 | 18.237 | 2.177 | n/a | 0.000 | 0.052 | 1.143 | 5.763 | 0.045 | n/a | 0.594 | 8.425 | n/a | n/a | 0.038 | 2.229 | 0.122 | 0.038 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002171 | 17.419 | 1.995 | n/a | 0.000 | 0.048 | 0.618 | 1.177 | 0.023 | n/a | 0.103 | 13.410 | n/a | n/a | 0.045 | 2.043 | 0.117 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002095 | 16.646 | 2.447 | n/a | 0.000 | 0.051 | 1.911 | 1.735 | 0.041 | n/a | 0.161 | 10.262 | n/a | n/a | 0.039 | 2.498 | 0.150 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.676ms |
| 19ce9be149b3ec4f000000000000204c | 16.599 | 4.600 | n/a | 0.000 | 0.049 | 1.882 | 5.076 | 0.068 | n/a | 0.237 | 4.646 | n/a | n/a | 0.041 | 4.649 | 0.280 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000022ce | 15.871 | 3.776 | n/a | 0.000 | 0.112 | 0.989 | 1.319 | 0.023 | n/a | 0.120 | 9.463 | n/a | n/a | 0.071 | 3.887 | 0.245 | 0.071 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000022a1 | 15.450 | 3.200 | n/a | 0.000 | 1.710 | 0.905 | 0.740 | 0.013 | n/a | 0.049 | 8.800 | n/a | n/a | 0.031 | 4.911 | 0.318 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000021bf | 15.396 | 4.043 | n/a | 0.000 | 0.076 | 0.772 | 0.835 | 0.015 | n/a | 0.099 | 9.504 | n/a | n/a | 0.051 | 4.119 | 0.268 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000020b8 | 15.139 | 1.605 | n/a | 0.000 | 0.042 | 0.531 | 0.905 | 0.019 | n/a | 0.075 | 11.933 | n/a | n/a | 0.029 | 1.647 | 0.109 | 0.029 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.388ms |
| 19ce9be149b3ec4f00000000000020ae | 15.013 | 1.856 | n/a | 0.000 | 0.029 | 0.650 | 4.273 | 0.019 | n/a | 0.049 | 8.116 | n/a | n/a | 0.021 | 1.885 | 0.126 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002176 | 14.838 | 3.437 | n/a | 0.000 | 0.120 | 1.364 | 1.604 | 0.015 | n/a | 0.274 | 7.960 | n/a | n/a | 0.064 | 3.558 | 0.240 | 0.064 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002051 | 14.750 | 4.155 | n/a | 0.000 | 0.104 | 3.785 | 1.370 | 0.018 | n/a | 0.074 | 5.168 | n/a | n/a | 0.076 | 4.259 | 0.289 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.361ms |
| 19ce9be149b3ec4f0000000000002223 | 14.376 | 3.888 | n/a | 0.000 | 0.119 | 3.355 | 0.977 | 0.019 | n/a | 0.096 | 5.838 | n/a | n/a | 0.086 | 4.006 | 0.279 | 0.086 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002187 | 14.338 | 3.137 | n/a | 0.000 | 0.077 | 0.694 | 0.708 | 0.013 | n/a | 0.262 | 9.398 | n/a | n/a | 0.049 | 3.214 | 0.224 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000203d | 14.079 | 1.902 | n/a | 0.000 | 0.033 | 0.482 | 0.801 | 0.014 | n/a | 0.292 | 10.524 | n/a | n/a | 0.031 | 1.935 | 0.137 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f00000000000021dd | 14.076 | 4.937 | n/a | 0.000 | 0.109 | 0.754 | 0.906 | 0.017 | n/a | 0.108 | 7.170 | n/a | n/a | 0.077 | 5.046 | 0.358 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.208ms |
| 19ce9be149b3ec4f0000000000002068 | 13.880 | 2.992 | n/a | 0.000 | 0.050 | 0.821 | 2.220 | 0.027 | n/a | 0.109 | 7.628 | n/a | n/a | 0.033 | 3.043 | 0.219 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002211 | 13.478 | 3.506 | n/a | 0.000 | 0.126 | 1.272 | 1.145 | 0.024 | n/a | 0.125 | 7.198 | n/a | n/a | 0.083 | 3.632 | 0.269 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f000000000000208c | 13.386 | 1.796 | n/a | 0.000 | 2.065 | 0.854 | 1.409 | 0.024 | n/a | 0.108 | 7.110 | n/a | n/a | 0.021 | 3.861 | 0.288 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 19ce9be149b3ec4f0000000000002246 | 13.234 | 3.733 | n/a | 0.000 | 0.105 | 0.879 | 1.178 | 0.019 | n/a | 0.186 | 7.069 | n/a | n/a | 0.065 | 3.839 | 0.290 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (880 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.097 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 0.000 | 0.000 | 0.026 |
| p99 | 319.745 | n/a | n/a | n/a | 38.890 | n/a | 4.442 | 319.629 | 5.072 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 74.669 | 319.742 | 1.000 | 74.669 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a4407b38ac6c903000000000000223a8 | 322.557 | 0.017 | n/a | 0.000 | 322.539 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.556 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.031ms |
| a4407b38ac6c903000000000000223a7 | 322.549 | 0.034 | n/a | 0.000 | 322.514 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.548 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.031ms |
| a4407b38ac6c903000000000000223ad | 322.512 | 0.014 | n/a | 0.000 | 322.497 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.511 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.031ms |
| a4407b38ac6c903000000000000223ac | 322.506 | 0.018 | n/a | 0.000 | 322.487 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.505 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.031ms |
| a4407b38ac6c903000000000000223a6 | 322.494 | 0.299 | n/a | 0.000 | 322.192 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 322.491 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.031ms |
| 4e3b1d59b4c06a2b0000000000020eb5 | 319.781 | 0.039 | n/a | 0.000 | 319.741 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.781 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.044ms; replica.apply-delta 0.034ms |
| 4e3b1d59b4c06a2b0000000000020eb7 | 319.767 | 0.014 | n/a | 0.000 | 319.752 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.766 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.044ms; replica.apply-delta 0.034ms |
| 4e3b1d59b4c06a2b0000000000020eb6 | 319.763 | 0.018 | n/a | 0.000 | 319.744 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.762 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.044ms; replica.apply-delta 0.034ms |
| 4e3b1d59b4c06a2b0000000000020eb4 | 319.745 | 0.113 | n/a | 0.000 | 319.629 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 319.742 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.044ms; replica.apply-delta 0.034ms |
| 4e3b1d59b4c06a2b0000000000020ebc | 319.633 | 0.035 | n/a | 0.000 | 319.596 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.632 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.044ms; replica.apply-delta 0.034ms |
| 441b9f675971555b0000000000020de3 | 316.329 | 0.169 | n/a | 0.000 | 316.155 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 316.324 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| 441b9f675971555b0000000000020df4 | 315.284 | 0.038 | n/a | 0.000 | 315.243 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 315.281 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| 441b9f675971555b0000000000020df5 | 315.255 | 0.040 | n/a | 0.000 | 315.203 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 315.243 | 1.000 | 0.012 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| 441b9f675971555b0000000000020df6 | 315.219 | 0.024 | n/a | 0.000 | 315.193 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 315.217 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| 441b9f675971555b0000000000020df7 | 315.212 | 0.096 | n/a | 0.000 | 315.114 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 315.210 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| 441b9f675971555b0000000000020df8 | 315.132 | 0.021 | n/a | 0.000 | 315.109 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 315.130 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| 441b9f675971555b00000000000001f0 | 309.232 | 0.523 | n/a | 0.000 | 308.704 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 309.227 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 1.226ms |
| 441b9f675971555b00000000000001f1 | 309.124 | 0.146 | n/a | 0.000 | 308.963 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 309.109 | 1.000 | 0.014 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 1.226ms |
| a4407b38ac6c90300000000000000319 | 308.438 | 0.277 | n/a | 0.000 | 308.158 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 308.435 | 1.000 | 0.004 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 441b9f675971555b0000000000000200 | 307.900 | 0.082 | n/a | 0.000 | 307.812 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 307.894 | 1.000 | 0.006 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 1.226ms |

## P1 / L1 / read (564 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.000 | 0.000 | 0.022 |
| p99 | 300.858 | n/a | n/a | n/a | 0.439 | n/a | 0.000 | 300.706 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.326 | 300.854 | 1.000 | 0.326 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 441b9f675971555b000000000004b458 | 450.026 | 0.235 | n/a | 0.000 | 449.788 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 450.023 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b0000000000042a4e | 309.638 | 0.570 | n/a | 0.000 | 309.065 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 309.635 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.075ms |
| 441b9f675971555b000000000003b0a1 | 307.067 | 0.253 | n/a | 0.000 | 306.811 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 307.063 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b00000000000acdd2 | 305.247 | 0.212 | n/a | 0.000 | 305.032 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 305.244 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b000000000004fc37 | 304.687 | 0.202 | n/a | 0.000 | 304.470 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 304.673 | 1.000 | 0.015 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b0000000000099197 | 300.858 | 0.149 | n/a | 0.000 | 300.706 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 300.854 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 441b9f675971555b00000000000a2c33 | 297.174 | 0.400 | n/a | 0.000 | 296.771 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 297.171 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b00000000000662bf | 282.482 | 0.092 | n/a | 0.000 | 282.387 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.480 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b0000000000077c0f | 282.153 | 0.145 | n/a | 0.000 | 282.005 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 282.150 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 441b9f675971555b0000000000051593 | 280.142 | 0.162 | n/a | 0.000 | 279.978 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.140 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 441b9f675971555b00000000000bb372 | 278.229 | 0.135 | n/a | 0.000 | 278.090 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 278.225 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b00000000000ae7de | 277.573 | 0.154 | n/a | 0.000 | 277.415 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 277.569 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b00000000000acbc3 | 277.433 | 0.186 | n/a | 0.000 | 277.243 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 277.429 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| 441b9f675971555b000000000009db6e | 275.983 | 1.483 | n/a | 0.000 | 274.497 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.980 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b000000000004b45d | 274.952 | 0.332 | n/a | 0.000 | 274.613 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 274.946 | 1.000 | 0.007 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 441b9f675971555b000000000004e935 | 274.555 | 0.223 | n/a | 0.000 | 274.330 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.553 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.087ms |
| 441b9f675971555b0000000000052ed2 | 274.312 | 0.126 | n/a | 0.000 | 274.184 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.309 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b00000000000a9eb4 | 273.976 | 0.171 | n/a | 0.000 | 273.799 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 273.970 | 1.000 | 0.006 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b00000000000a36ce | 273.899 | 0.267 | n/a | 0.000 | 273.623 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 273.889 | 1.000 | 0.010 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.187ms |
| 441b9f675971555b000000000006d375 | 273.708 | 0.319 | n/a | 0.000 | 273.386 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.705 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |

## P1 / L4 / read (1815 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.000 | 0.000 | 0.021 |
| p99 | 274.968 | n/a | n/a | n/a | 0.339 | n/a | 0.000 | 274.838 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.308 | 274.966 | 1.000 | 0.308 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a4407b38ac6c9030000000000003afcf | 337.554 | 0.163 | n/a | 0.000 | 337.388 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 337.551 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.063ms |
| 4e3b1d59b4c06a2b000000000003a18b | 334.682 | 0.132 | n/a | 0.000 | 334.547 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 334.679 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.073ms |
| 4e3b1d59b4c06a2b00000000000a1f81 | 334.148 | 0.140 | n/a | 0.000 | 334.006 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 334.146 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 441b9f675971555b000000000012b1f5 | 333.309 | 0.198 | n/a | 0.000 | 333.107 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 333.305 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b000000000012b1f6 | 333.304 | 0.077 | n/a | 0.000 | 333.224 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 333.301 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| a4407b38ac6c903000000000000a32b1 | 332.816 | 0.096 | n/a | 0.000 | 332.718 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 332.814 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 441b9f675971555b00000000000c1d67 | 331.701 | 0.042 | n/a | 0.000 | 331.657 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 331.699 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 441b9f675971555b00000000000c1d66 | 331.628 | 0.186 | n/a | 0.000 | 331.438 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 331.624 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 441b9f675971555b00000000000ee07e | 283.022 | 0.339 | n/a | 0.000 | 282.674 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 283.013 | 1.000 | 0.009 | node-13/thread-4/reader.straddle-await-ack | none observed |
| a4407b38ac6c90300000000000066c83 | 282.557 | 0.420 | n/a | 0.000 | 282.132 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 282.552 | 1.000 | 0.004 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 441b9f675971555b00000000000ee084 | 282.310 | 0.060 | n/a | 0.000 | 282.247 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 282.307 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b00000000000658db | 282.140 | 0.372 | n/a | 0.000 | 281.751 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 282.124 | 1.000 | 0.016 | node-13/thread-5/reader.straddle-await-ack | none observed |
| a4407b38ac6c90300000000000067b96 | 279.327 | 0.204 | n/a | 0.000 | 279.120 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.324 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.079ms |
| 4e3b1d59b4c06a2b0000000000066c05 | 277.849 | 0.155 | n/a | 0.000 | 277.690 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.846 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.096ms |
| 441b9f675971555b00000000000ef3f6 | 276.854 | 0.140 | n/a | 0.000 | 276.711 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.851 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 441b9f675971555b00000000000ef40e | 275.214 | 0.069 | n/a | 0.000 | 275.141 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 275.210 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| a4407b38ac6c903000000000000bad6f | 275.021 | 0.122 | n/a | 0.000 | 274.896 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.019 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 441b9f675971555b0000000000143b02 | 274.980 | 0.020 | n/a | 0.000 | 274.959 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.979 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b0000000000143b01 | 274.968 | 0.127 | n/a | 0.000 | 274.838 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.966 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b00000000000b9e8f | 274.769 | 0.140 | n/a | 0.000 | 274.626 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.766 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |

## P1 / L16 / read (2717 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.817 | n/a | n/a | n/a | 0.026 | n/a | 0.000 | 55.617 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 56.383 | 1.000 | 0.002 |
| p99 | 270.063 | n/a | n/a | n/a | 45.844 | n/a | 7.980 | 269.920 | 0.954 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 72.198 | 269.960 | 1.000 | 72.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e3b1d59b4c06a2b00000000001037eb | 377.665 | 14.912 | n/a | 0.000 | 0.000 | 0.267 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 362.486 | 14.912 | 0.039 | 362.486 | node-13/thread-5/socket.wait-first-byte | client.reach-decode-and-cache 32.020ms; reader.observe 18.073ms; reader.observe 6.073ms; client.parse 2.625ms; client.parse 1.146ms |
| a4407b38ac6c90300000000000104943 | 375.857 | 176.540 | n/a | 24.449 | 55.468 | 45.869 | 72.759 | 0.595 | n/a | 0.001 | 0.000 | n/a | n/a | 0.176 | 256.457 | 0.682 | 0.176 | node-13/thread-6/replica.pull-at | reader.observe 17.286ms; reader.observe 15.935ms; client.reach-decode-and-cache 10.017ms; client.reach-decode-and-cache 7.561ms; client.reach-decode-and-cache 6.318ms |
| 4e3b1d59b4c06a2b00000000001037ed | 374.119 | 179.616 | n/a | 31.052 | 59.104 | 0.988 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 103.359 | 269.772 | 0.721 | 103.359 | node-13/thread-5/socket.wait-first-byte | reader.observe 18.073ms; reader.observe 6.073ms; client.reach-decode-and-cache 1.119ms; replica.apply-delta 0.030ms; replica.apply-delta 0.024ms |
| 4e3b1d59b4c06a2b00000000000c4405 | 292.551 | 0.163 | n/a | 0.000 | 292.384 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 292.547 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b00000000000c4406 | 292.485 | 0.031 | n/a | 0.000 | 292.453 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.483 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 441b9f675971555b000000000014dc1c | 292.331 | 0.066 | n/a | 0.000 | 292.263 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.329 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| a4407b38ac6c903000000000000c5021 | 292.317 | 0.021 | n/a | 0.000 | 292.295 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.316 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| a4407b38ac6c903000000000000c5020 | 292.293 | 0.051 | n/a | 0.000 | 292.241 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.292 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 441b9f675971555b000000000014dc1b | 292.172 | 0.167 | n/a | 0.000 | 292.001 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.169 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| a4407b38ac6c903000000000000c501f | 292.142 | 0.163 | n/a | 0.000 | 291.975 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.139 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b00000000000c4414 | 291.648 | 0.039 | n/a | 0.000 | 291.608 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.647 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b00000000000c4413 | 291.646 | 0.021 | n/a | 0.000 | 291.624 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.646 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b00000000000c4415 | 291.632 | 0.013 | n/a | 0.000 | 291.618 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.631 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| a4407b38ac6c903000000000000c503a | 291.289 | 0.020 | n/a | 0.000 | 291.269 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.288 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| a4407b38ac6c903000000000000c5042 | 290.941 | 0.020 | n/a | 0.000 | 290.920 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.939 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 441b9f675971555b000000000014dc2c | 290.637 | 0.057 | n/a | 0.000 | 290.575 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 290.632 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | none observed |
| a4407b38ac6c9030000000000010493f | 287.192 | 41.946 | n/a | 5.844 | 0.000 | 0.788 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 238.615 | 47.790 | 0.166 | 238.615 | node-13/thread-6/socket.wait-first-byte | client.reach-decode-and-cache 77.310ms; reader.observe 17.286ms; client.parse 11.691ms; client.reach-decode-and-cache 10.017ms; client.reach-decode-and-cache 7.561ms |
| 441b9f675971555b000000000014dc51 | 287.130 | 0.088 | n/a | 0.000 | 287.039 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.127 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b000000000014dc52 | 287.115 | 0.042 | n/a | 0.000 | 287.071 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.113 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b000000000014dc5b | 286.391 | 0.043 | n/a | 0.000 | 286.345 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.388 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |

## P1 / L64 / read (6160 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 74.771 | n/a | n/a | n/a | 0.086 | n/a | 0.000 | 56.142 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 61.020 | 1.000 | 0.002 |
| p99 | 553.256 | n/a | n/a | n/a | 201.925 | n/a | 43.001 | 265.034 | 81.729 | 0.469 | 62.822 | n/a | 0.002 | 0.000 | n/a | n/a | 375.549 | 304.225 | 1.000 | 375.549 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a4407b38ac6c90300000000000120bba | 1449.024 | 217.344 | n/a | 41.511 | 7.452 | 1053.488 | 61.374 | 23.280 | n/a | 0.001 | 0.000 | n/a | n/a | 44.573 | 266.307 | 0.184 | 44.573 | node-13/thread-6/socket.body-read | reader.observe 15.727ms; client.reach-decode-and-cache 9.587ms; client.parse 6.505ms; client.parse 4.972ms; client.parse 4.117ms |
| a4407b38ac6c90300000000000120bbe | 1312.565 | 20.306 | n/a | 0.000 | 0.000 | 0.315 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1291.944 | 20.306 | 0.015 | 1291.944 | node-13/thread-6/socket.wait-first-byte | reader.observe 15.727ms; client.reach-decode-and-cache 9.587ms; client.parse 6.505ms; client.parse 4.972ms; client.parse 4.198ms |
| a4407b38ac6c90300000000000120bbc | 1192.742 | 224.026 | n/a | 59.640 | 441.342 | 359.420 | 42.231 | 27.281 | n/a | 0.005 | 0.000 | n/a | n/a | 38.797 | 725.008 | 0.608 | 38.797 | node-13/thread-6/reader.straddle-await-ack | reader.observe 15.727ms; client.reach-decode-and-cache 9.587ms; client.parse 6.505ms; client.parse 4.972ms; client.reach-decode-and-cache 3.786ms |
| 441b9f675971555b00000000001a7947 | 1148.468 | 183.894 | n/a | 39.504 | 252.385 | 484.012 | 55.114 | 6.253 | n/a | 0.005 | 0.000 | n/a | n/a | 127.300 | 475.783 | 0.414 | 127.300 | node-13/thread-4/socket.wait-first-byte | client.reach-decode-and-cache 27.119ms; reader.observe 21.711ms; client.parse 19.225ms; client.reach-decode-and-cache 16.819ms; client.parse 10.584ms |
| 441b9f675971555b00000000001aa997 | 1106.143 | 210.935 | n/a | 46.593 | 235.544 | 393.304 | 84.737 | 31.864 | n/a | 0.007 | 0.000 | n/a | n/a | 103.160 | 493.072 | 0.446 | 103.160 | node-13/thread-4/socket.wait-first-byte | client.reach-decode-and-cache 23.639ms; reader.observe 17.939ms; reader.observe 14.899ms; reader.observe 12.938ms; reader.observe 11.079ms |
| a4407b38ac6c90300000000000120bbd | 1092.930 | 234.734 | n/a | 54.946 | 495.964 | 174.059 | 75.253 | 34.062 | n/a | 0.002 | 0.000 | n/a | n/a | 23.912 | 785.643 | 0.719 | 23.912 | node-13/thread-6/reader.straddle-await-ack | reader.observe 15.727ms; client.parse 6.505ms; client.parse 4.117ms; client.reach-decode-and-cache 3.786ms; reader.observe 2.792ms |
| 441b9f675971555b00000000001a794a | 1050.524 | 336.654 | n/a | 155.728 | 250.877 | 4.777 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 302.488 | 743.259 | 0.708 | 302.488 | node-13/thread-4/socket.wait-first-byte | reader.observe 21.711ms; client.reach-decode-and-cache 16.819ms; client.parse 10.584ms; reader.observe 7.421ms; client.parse 7.350ms |
| a4407b38ac6c9030000000000011a371 | 1026.470 | 369.495 | n/a | 72.131 | 204.925 | 0.850 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 379.070 | 646.551 | 0.630 | 379.070 | node-13/thread-6/socket.wait-first-byte | reader.observe 27.637ms; reader.observe 21.662ms; reader.observe 15.824ms; reader.observe 13.853ms; reader.observe 13.754ms |
| a4407b38ac6c9030000000000011a36a | 1026.312 | 394.486 | n/a | 95.111 | 0.000 | 0.817 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 535.898 | 489.597 | 0.477 | 535.898 | node-13/thread-6/socket.wait-first-byte | reader.observe 27.637ms; reader.observe 21.662ms; reader.observe 15.824ms; reader.observe 13.853ms; reader.observe 13.754ms |
| 441b9f675971555b00000000001aa996 | 1023.062 | 222.224 | n/a | 43.001 | 283.348 | 289.367 | 54.671 | 27.806 | n/a | 0.005 | 0.000 | n/a | n/a | 102.639 | 548.573 | 0.536 | 102.639 | node-13/thread-4/socket.wait-first-byte | client.reach-decode-and-cache 23.639ms; reader.observe 17.939ms; reader.observe 14.899ms; reader.observe 12.938ms; reader.observe 11.079ms |
| a4407b38ac6c9030000000000011a36f | 1019.969 | 45.180 | n/a | 13.442 | 0.000 | 0.599 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 960.749 | 58.622 | 0.057 | 960.749 | node-13/thread-6/socket.wait-first-byte | reader.observe 27.637ms; reader.observe 21.662ms; reader.observe 15.824ms; reader.observe 13.853ms; reader.observe 13.754ms |
| a4407b38ac6c90300000000000120bbb | 986.830 | 390.623 | n/a | 138.900 | 323.145 | 22.345 | 41.700 | 26.008 | n/a | 0.011 | 0.000 | n/a | n/a | 44.098 | 852.668 | 0.864 | 44.098 | node-13/thread-6/reader.straddle-await-ack | reader.observe 15.727ms; client.reach-decode-and-cache 9.587ms; client.parse 4.972ms; client.parse 4.117ms; client.reach-decode-and-cache 3.786ms |
| a4407b38ac6c9030000000000011a36c | 983.759 | 395.993 | n/a | 92.927 | 0.000 | 0.871 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 493.967 | 488.921 | 0.497 | 493.967 | node-13/thread-6/socket.wait-first-byte | reader.observe 27.637ms; reader.observe 21.662ms; reader.observe 15.824ms; reader.observe 13.853ms; reader.observe 13.754ms |
| a4407b38ac6c9030000000000011a364 | 978.480 | 416.806 | n/a | 98.700 | 0.000 | 1.372 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 461.602 | 515.507 | 0.527 | 461.602 | node-13/thread-6/socket.wait-first-byte | reader.observe 27.637ms; reader.observe 21.662ms; reader.observe 13.853ms; reader.observe 13.754ms; reader.observe 12.053ms |
| a4407b38ac6c9030000000000011a36e | 944.319 | 35.186 | n/a | 6.705 | 0.000 | 0.613 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 901.816 | 41.891 | 0.044 | 901.816 | node-13/thread-6/socket.wait-first-byte | reader.observe 27.637ms; reader.observe 21.662ms; reader.observe 13.853ms; reader.observe 13.754ms; reader.observe 12.053ms |
| 441b9f675971555b00000000001a7948 | 935.612 | 255.202 | n/a | 77.563 | 382.480 | 1.670 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 218.697 | 715.245 | 0.764 | 218.697 | node-13/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 27.119ms; reader.observe 21.711ms; client.parse 19.225ms; client.reach-decode-and-cache 16.819ms; reader.observe 7.421ms |
| a4407b38ac6c9030000000000011a363 | 929.561 | 61.537 | n/a | 9.727 | 0.000 | 0.938 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 857.358 | 71.264 | 0.077 | 857.358 | node-13/thread-6/socket.wait-first-byte | reader.observe 21.662ms; reader.observe 13.853ms; reader.observe 13.754ms; reader.observe 12.053ms; client.parse 9.460ms |
| 441b9f675971555b00000000001aa994 | 909.059 | 261.806 | n/a | 40.561 | 306.826 | 116.344 | 85.447 | 25.267 | n/a | 0.010 | 0.000 | n/a | n/a | 72.798 | 609.193 | 0.670 | 72.798 | node-13/thread-4/reader.straddle-await-ack | reader.observe 17.939ms; reader.observe 14.899ms; reader.observe 12.938ms; reader.observe 11.079ms; reader.observe 9.638ms |
| 441b9f675971555b00000000001a2455 | 900.384 | 367.569 | n/a | 58.799 | 0.000 | 0.911 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 473.105 | 426.368 | 0.474 | 473.105 | node-13/thread-4/socket.wait-first-byte | reader.observe 43.504ms; client.reach-decode-and-cache 34.535ms; reader.observe 16.359ms; reader.observe 12.422ms; reader.observe 9.958ms |
| 441b9f675971555b00000000001a245a | 879.402 | 360.279 | n/a | 57.741 | 0.000 | 0.234 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 461.148 | 418.020 | 0.475 | 461.148 | node-13/thread-4/socket.wait-first-byte | reader.observe 43.504ms; client.reach-decode-and-cache 34.535ms; reader.observe 16.359ms; reader.observe 12.422ms; reader.observe 9.958ms |

## P1 / L256 / read (14177 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 228.302 | n/a | n/a | n/a | 0.030 | n/a | 0.000 | 227.582 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 227.679 | 1.000 | 0.001 |
| p99 | 307.060 | n/a | n/a | n/a | 29.538 | n/a | 2.207 | 266.472 | 4.232 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.234 | 267.371 | 1.000 | 66.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a4407b38ac6c903000000000001bfd64 | 1257.284 | 104.112 | n/a | 15.210 | 0.000 | 1056.728 | 55.790 | 0.001 | n/a | 0.002 | 0.000 | n/a | n/a | 25.441 | 119.322 | 0.095 | 25.441 | node-13/thread-6/socket.queue-and-write | reader.observe 20.952ms; reader.observe 16.381ms; reader.observe 14.242ms; reader.observe 12.949ms; reader.observe 12.529ms |
| 441b9f675971555b0000000000244b5f | 1215.386 | 47.218 | n/a | 4.360 | 0.000 | 1032.927 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 130.882 | 51.578 | 0.042 | 130.882 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| a4407b38ac6c903000000000001bfd60 | 1189.178 | 59.631 | n/a | 5.460 | 0.000 | 1067.691 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 56.395 | 65.092 | 0.055 | 56.395 | node-13/thread-6/socket.queue-and-write | reader.observe 20.952ms; reader.observe 16.381ms; reader.observe 14.242ms; reader.observe 12.949ms; reader.observe 12.529ms |
| 441b9f675971555b0000000000244b4d | 1187.936 | 31.169 | n/a | 0.000 | 0.000 | 1027.444 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 129.323 | 31.169 | 0.026 | 129.323 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b63 | 1184.196 | 843.885 | n/a | 134.258 | 0.000 | 115.468 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 90.585 | 978.143 | 0.826 | 90.585 | node-13/thread-4/client.reach | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b61 | 1181.042 | 645.290 | n/a | 86.605 | 0.000 | 111.860 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 337.288 | 731.895 | 0.620 | 337.288 | node-13/thread-4/client.reach | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b52 | 1172.625 | 65.198 | n/a | 5.176 | 0.000 | 1028.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 74.010 | 70.374 | 0.060 | 74.010 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b4f | 1170.180 | 63.814 | n/a | 5.176 | 0.000 | 1028.107 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 73.083 | 68.990 | 0.059 | 73.083 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b4c | 1168.956 | 30.050 | n/a | 2.076 | 0.000 | 1025.316 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 111.514 | 32.126 | 0.027 | 111.514 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| a4407b38ac6c903000000000001bfd51 | 1162.859 | 45.194 | n/a | 4.228 | 0.000 | 1052.188 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.249 | 49.422 | 0.043 | 61.249 | node-13/thread-6/socket.queue-and-write | reader.observe 20.952ms; reader.observe 16.381ms; reader.observe 14.242ms; reader.observe 12.529ms; reader.observe 12.301ms |
| 441b9f675971555b0000000000244b58 | 1162.042 | 63.922 | n/a | 5.176 | 0.000 | 1026.455 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.489 | 69.098 | 0.059 | 66.489 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b48 | 1159.645 | 67.230 | n/a | 8.031 | 0.000 | 1026.032 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 58.353 | 75.261 | 0.065 | 58.353 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b4a | 1142.662 | 52.144 | n/a | 5.176 | 0.000 | 1025.617 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.725 | 57.320 | 0.050 | 59.725 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b47 | 1136.861 | 30.592 | n/a | 2.812 | 0.000 | 1025.702 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.755 | 33.404 | 0.029 | 77.755 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| a4407b38ac6c903000000000001bfd59 | 1136.314 | 50.812 | n/a | 6.062 | 0.000 | 1019.564 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.876 | 56.874 | 0.050 | 59.876 | node-13/thread-6/socket.queue-and-write | reader.observe 20.952ms; reader.observe 16.381ms; reader.observe 14.242ms; reader.observe 12.529ms; reader.observe 12.301ms |
| 441b9f675971555b0000000000244b5a | 1129.403 | 43.714 | n/a | 0.000 | 0.000 | 1026.096 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.593 | 43.714 | 0.039 | 59.593 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b46 | 1125.768 | 26.961 | n/a | 0.000 | 0.000 | 1025.857 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 72.950 | 26.961 | 0.024 | 72.950 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b57 | 1123.698 | 39.167 | n/a | 0.000 | 0.000 | 1026.950 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 57.581 | 39.167 | 0.035 | 57.581 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b56 | 1122.748 | 37.853 | n/a | 0.000 | 0.000 | 1026.975 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 57.920 | 37.853 | 0.034 | 57.920 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |
| 441b9f675971555b0000000000244b50 | 1121.728 | 37.119 | n/a | 0.000 | 0.000 | 1027.496 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 57.113 | 37.119 | 0.033 | 57.113 | node-13/thread-4/socket.queue-and-write | reader.observe 47.070ms; reader.observe 15.867ms; reader.observe 15.295ms; reader.observe 15.024ms; client.reach-decode-and-cache 13.905ms |

## P1 / L1024 / read (46956 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 156.893 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 156.832 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 156.892 | 1.000 | 0.001 |
| p99 | 256.633 | n/a | n/a | n/a | 43.573 | n/a | 10.233 | 256.194 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.699 | 256.632 | 1.000 | 0.699 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 441b9f675971555b0000000000287dc0 | 298.774 | 0.017 | n/a | 0.000 | 298.757 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.774 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b0000000000287dbf | 298.757 | 0.022 | n/a | 0.000 | 298.734 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.756 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 441b9f675971555b0000000000287dbe | 298.746 | 0.126 | n/a | 0.000 | 298.617 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.743 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| a4407b38ac6c9030000000000020644a | 295.003 | 0.014 | n/a | 0.000 | 294.988 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.002 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| a4407b38ac6c90300000000000206449 | 294.994 | 0.013 | n/a | 0.000 | 294.980 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.993 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| a4407b38ac6c90300000000000206448 | 294.990 | 0.012 | n/a | 0.000 | 294.977 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.989 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| a4407b38ac6c90300000000000206447 | 294.982 | 0.013 | n/a | 0.000 | 294.968 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.981 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| a4407b38ac6c90300000000000206446 | 294.976 | 0.013 | n/a | 0.000 | 294.963 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.975 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| a4407b38ac6c90300000000000206445 | 294.967 | 0.014 | n/a | 0.000 | 294.952 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.966 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| a4407b38ac6c90300000000000206444 | 294.956 | 0.025 | n/a | 0.000 | 294.930 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.955 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| a4407b38ac6c90300000000000206443 | 294.956 | 0.133 | n/a | 0.000 | 294.820 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 294.954 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b0000000000206198 | 293.893 | 0.036 | n/a | 0.000 | 293.856 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.892 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b0000000000206197 | 293.865 | 0.024 | n/a | 0.000 | 293.840 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.864 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b0000000000206196 | 293.825 | 0.030 | n/a | 0.000 | 293.794 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.824 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b0000000000206195 | 293.789 | 0.042 | n/a | 0.000 | 293.746 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.788 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b0000000000206194 | 293.747 | 0.022 | n/a | 0.000 | 293.724 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.746 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b0000000000206193 | 293.719 | 0.026 | n/a | 0.000 | 293.691 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.718 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b0000000000206192 | 293.699 | 0.035 | n/a | 0.000 | 293.663 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.698 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b0000000000206191 | 293.674 | 0.029 | n/a | 0.000 | 293.645 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.673 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4e3b1d59b4c06a2b0000000000206190 | 293.654 | 0.053 | n/a | 0.000 | 293.600 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.653 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |

## P1 / tail / read (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 0.000 | 0.000 | 0.028 |
| p99 | 0.255 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a4407b38ac6c903000000000002a7672 | 0.255 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | uncovered | none observed |
| 441b9f675971555b0000000000324d12 | 0.144 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | uncovered | none observed |
| 441b9f675971555b0000000000324d11 | 0.143 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | uncovered | none observed |
| a4407b38ac6c903000000000002a766c | 0.119 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | uncovered | none observed |
| 4e3b1d59b4c06a2b00000000002a4d2d | 0.098 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | uncovered | none observed |
| 441b9f675971555b0000000000324d17 | 0.092 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | uncovered | none observed |
| 441b9f675971555b0000000000324d0c | 0.086 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | uncovered | none observed |
| 4e3b1d59b4c06a2b00000000002a4d30 | 0.073 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | uncovered | none observed |
| 441b9f675971555b0000000000324d19 | 0.058 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.058 | 0.000 | 0.000 | 0.058 | uncovered | none observed |
| 441b9f675971555b0000000000324d0f | 0.055 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.055 | 0.000 | 0.000 | 0.055 | uncovered | none observed |
| 441b9f675971555b0000000000324d0b | 0.054 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.054 | 0.000 | 0.000 | 0.054 | uncovered | none observed |
| 4e3b1d59b4c06a2b00000000002a4d35 | 0.053 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 0.000 | 0.000 | 0.053 | uncovered | none observed |
| 4e3b1d59b4c06a2b00000000002a4d3b | 0.051 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.051 | 0.000 | 0.000 | 0.051 | uncovered | none observed |
| 4e3b1d59b4c06a2b00000000002a4d3f | 0.050 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.050 | 0.000 | 0.000 | 0.050 | uncovered | none observed |
| a4407b38ac6c903000000000002a766b | 0.048 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.048 | 0.000 | 0.000 | 0.048 | uncovered | none observed |
| 441b9f675971555b0000000000324d0e | 0.043 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.043 | 0.000 | 0.000 | 0.043 | uncovered | none observed |
| 4e3b1d59b4c06a2b00000000002a4d38 | 0.043 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.043 | 0.000 | 0.000 | 0.043 | uncovered | none observed |
| 4e3b1d59b4c06a2b00000000002a4d33 | 0.038 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.038 | 0.000 | 0.000 | 0.038 | uncovered | none observed |
| 441b9f675971555b0000000000324d16 | 0.036 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 0.000 | 0.000 | 0.036 | uncovered | none observed |
| 4e3b1d59b4c06a2b00000000002a4d37 | 0.034 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.034 | 0.000 | 0.000 | 0.034 | uncovered | none observed |

## P3 / outside-phases / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.306 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.435 | 200.632 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 |
| p99 | 434.817 | n/a | n/a | n/a | 22.604 | n/a | 2.536 | 0.000 | 10.283 | 428.567 | 0.112 | n/a | 0.359 | 0.000 | n/a | n/a | 44.662 | 23.519 | 0.350 | 44.662 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b0000000000000002 | 434.817 | 2.796 | n/a | 0.000 | 0.000 | 2.658 | 428.567 | 0.112 | n/a | 0.359 | 0.000 | n/a | n/a | 0.323 | 2.796 | 0.006 | 0.323 | gw-r/thread-42/gateway.admitted-work | none observed |
| 3ce45bfd9d9e0c880000000000000006 | 204.482 | 0.000 | n/a | 0.000 | 0.000 | 1.435 | 202.453 | 0.070 | n/a | 0.230 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 | gw-r/thread-42/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000007 | 204.298 | 0.000 | n/a | 0.000 | 0.000 | 1.482 | 202.360 | 0.065 | n/a | 0.178 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-47/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000005 | 203.248 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 201.756 | 0.071 | n/a | 0.225 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 | gw-r/thread-48/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000013a4 | 201.705 | 0.000 | n/a | 0.000 | 0.000 | 0.698 | 200.791 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-72/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000013a1 | 201.313 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 200.553 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-94/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000013a3 | 201.306 | 0.000 | n/a | 0.000 | 0.000 | 0.578 | 200.588 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-108/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000013a2 | 201.273 | 0.000 | n/a | 0.000 | 0.000 | 0.440 | 200.698 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000013a0 | 201.031 | 0.000 | n/a | 0.000 | 0.000 | 0.292 | 200.632 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.060 | 0.000 | 0.000 | 0.060 | gw-r/thread-69/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000013a8 | 72.670 | 22.604 | n/a | 0.000 | 0.000 | 5.404 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.662 | 22.604 | 0.311 | 44.662 | node-13/thread-8/socket.wait-first-byte | none observed |
| 3ce45bfd9d9e0c8800000000000013aa | 69.499 | 20.173 | n/a | 1.486 | 0.000 | 7.170 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.670 | 21.659 | 0.312 | 40.670 | node-13/thread-8/socket.wait-first-byte | none observed |
| 3ce45bfd9d9e0c8800000000000013a7 | 67.103 | 20.983 | n/a | 2.536 | 0.000 | 6.773 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.811 | 23.519 | 0.350 | 36.811 | node-13/thread-8/socket.wait-first-byte | none observed |
| 3ce45bfd9d9e0c8800000000000013a9 | 65.370 | 15.470 | n/a | 1.041 | 0.000 | 10.283 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.577 | 16.510 | 0.253 | 38.577 | node-13/thread-8/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1005.430 | n/a | n/a | n/a | 0.214 | n/a | 0.000 | 0.000 | 1.607 | 1002.369 | 0.095 | n/a | 0.197 | 0.000 | n/a | n/a | 1.128 | 0.214 | 0.000 | 1.128 |
| p99 | 21733.788 | n/a | n/a | n/a | 0.240 | n/a | 0.000 | 0.000 | 20725.332 | 1006.292 | 0.378 | n/a | 0.368 | 0.000 | n/a | n/a | 1.504 | 0.240 | 0.000 | 1.504 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b00000000000000a4 | 21733.788 | 0.197 | n/a | 0.000 | 0.000 | 20725.332 | 1006.292 | 0.095 | n/a | 0.368 | 0.000 | n/a | n/a | 1.504 | 0.197 | 0.000 | 1.504 | node-13/thread-2/socket.wait-first-byte | none observed |
| 9d80869e72dcb96b00000000000000a5 | 1005.430 | 0.214 | n/a | 0.000 | 0.000 | 1.197 | 1002.369 | 0.378 | n/a | 0.144 | 0.000 | n/a | n/a | 1.128 | 0.214 | 0.000 | 1.128 | gw-r/thread-63/journal/page | none observed |
| 9d80869e72dcb96b00000000000000a6 | 1004.473 | 0.240 | n/a | 0.000 | 0.000 | 1.607 | 1001.318 | 0.012 | n/a | 0.197 | 0.000 | n/a | n/a | 1.100 | 0.240 | 0.000 | 1.100 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 482.481 | n/a | n/a | n/a | 6.136 | n/a | 0.814 | 0.000 | 1.519 | 477.959 | 0.018 | n/a | 0.101 | 0.000 | n/a | n/a | 0.169 | 7.764 | 0.018 | 0.169 |
| p99 | 1003.854 | n/a | n/a | n/a | 51.298 | n/a | 21.156 | 0.000 | 14.024 | 995.152 | 0.102 | n/a | 0.291 | 0.000 | n/a | n/a | 37.810 | 72.454 | 0.340 | 37.810 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b00000000000000d1 | 1003.854 | 4.088 | n/a | 3.674 | 0.000 | 0.709 | 995.152 | 0.013 | n/a | 0.088 | 0.000 | n/a | n/a | 0.130 | 7.762 | 0.008 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b00000000000000bd | 973.010 | 3.740 | n/a | 2.465 | 0.000 | 2.933 | 963.556 | 0.024 | n/a | 0.114 | 0.000 | n/a | n/a | 0.178 | 6.205 | 0.006 | 0.178 | gw-r/thread-66/journal/page | none observed |
| 9d80869e72dcb96b00000000000000b6 | 965.021 | 3.322 | n/a | 0.571 | 0.000 | 1.065 | 959.795 | 0.026 | n/a | 0.082 | 0.000 | n/a | n/a | 0.161 | 3.892 | 0.004 | 0.161 | gw-r/thread-72/journal/page | none observed |
| 9d80869e72dcb96b00000000000000bc | 964.240 | 10.445 | n/a | 0.552 | 0.000 | 1.093 | 951.920 | 0.018 | n/a | 0.095 | 0.000 | n/a | n/a | 0.117 | 10.997 | 0.011 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 9d80869e72dcb96b00000000000000b5 | 842.460 | 15.870 | n/a | 1.906 | 0.000 | 2.221 | 822.178 | 0.018 | n/a | 0.110 | 0.000 | n/a | n/a | 0.157 | 17.775 | 0.021 | 0.157 | gw-r/thread-69/journal/page | none observed |
| 9d80869e72dcb96b00000000000000b0 | 815.805 | 4.507 | n/a | 0.000 | 0.000 | 3.764 | 807.289 | 0.021 | n/a | 0.073 | 0.000 | n/a | n/a | 0.151 | 4.507 | 0.006 | 0.151 | gw-r/thread-71/journal/page | none observed |
| 9d80869e72dcb96b00000000000000cb | 814.673 | 7.006 | n/a | 0.934 | 0.000 | 1.713 | 804.684 | 0.016 | n/a | 0.118 | 0.000 | n/a | n/a | 0.201 | 7.940 | 0.010 | 0.201 | gw-r/thread-47/journal/page | none observed |
| 9d80869e72dcb96b00000000000000c8 | 770.001 | 7.895 | n/a | 0.000 | 0.000 | 1.519 | 760.190 | 0.013 | n/a | 0.084 | 0.000 | n/a | n/a | 0.300 | 7.895 | 0.010 | 0.300 | gw-r/thread-45/journal/page | none observed |
| 9d80869e72dcb96b00000000000000c1 | 733.795 | 11.024 | n/a | 7.101 | 0.000 | 8.045 | 707.340 | 0.021 | n/a | 0.140 | 0.000 | n/a | n/a | 0.125 | 18.125 | 0.025 | 0.125 | gw-r/thread-67/journal/page | none observed |
| 9d80869e72dcb96b00000000000000ad | 608.158 | 3.620 | n/a | 0.948 | 0.000 | 1.111 | 602.162 | 0.012 | n/a | 0.178 | 0.000 | n/a | n/a | 0.127 | 4.568 | 0.008 | 0.127 | gw-r/thread-63/journal/page | none observed |
| 9d80869e72dcb96b00000000000000c3 | 588.761 | 16.076 | n/a | 9.555 | 0.000 | 0.916 | 561.954 | 0.016 | n/a | 0.088 | 0.000 | n/a | n/a | 0.156 | 25.631 | 0.044 | 0.156 | gw-r/thread-72/journal/page | none observed |
| 9d80869e72dcb96b00000000000000ba | 569.162 | 3.313 | n/a | 0.509 | 0.000 | 5.376 | 559.557 | 0.098 | n/a | 0.137 | 0.000 | n/a | n/a | 0.172 | 3.822 | 0.007 | 0.172 | gw-r/thread-44/journal/page | none observed |
| 9d80869e72dcb96b00000000000000a9 | 566.543 | 8.205 | n/a | 1.099 | 0.000 | 14.024 | 542.775 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.337 | 9.304 | 0.016 | 0.337 | gw-r/thread-48/journal/page | none observed |
| 9d80869e72dcb96b00000000000000aa | 536.111 | 4.248 | n/a | 5.571 | 0.000 | 0.944 | 524.925 | 0.021 | n/a | 0.155 | 0.000 | n/a | n/a | 0.248 | 9.819 | 0.018 | 0.248 | gw-r/thread-66/journal/page | none observed |
| 9d80869e72dcb96b00000000000000cc | 482.481 | 3.104 | n/a | 0.000 | 0.000 | 1.012 | 477.959 | 0.019 | n/a | 0.291 | 0.000 | n/a | n/a | 0.095 | 3.104 | 0.006 | 0.095 | gw-r/thread-63/journal/page | none observed |
| 9d80869e72dcb96b00000000000000b9 | 420.270 | 4.093 | n/a | 0.814 | 0.000 | 8.109 | 407.043 | 0.016 | n/a | 0.068 | 0.000 | n/a | n/a | 0.126 | 4.908 | 0.012 | 0.126 | gw-r/thread-68/journal/page | none observed |
| 9d80869e72dcb96b00000000000000ac | 398.921 | 4.361 | n/a | 7.443 | 0.000 | 1.199 | 385.345 | 0.087 | n/a | 0.168 | 0.000 | n/a | n/a | 0.319 | 11.804 | 0.030 | 0.319 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b00000000000000c5 | 392.368 | 3.752 | n/a | 0.000 | 0.000 | 1.105 | 387.321 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.093 | 3.752 | 0.010 | 0.093 | gw-r/thread-66/journal/page | none observed |
| 9d80869e72dcb96b00000000000000ae | 356.349 | 6.697 | n/a | 4.961 | 0.000 | 0.764 | 343.557 | 0.013 | n/a | 0.105 | 0.000 | n/a | n/a | 0.251 | 11.658 | 0.033 | 0.251 | gw-r/thread-72/journal/page | none observed |
| 9d80869e72dcb96b00000000000000c0 | 285.909 | 4.276 | n/a | 1.735 | 0.000 | 8.217 | 271.346 | 0.019 | n/a | 0.113 | 0.000 | n/a | n/a | 0.203 | 6.011 | 0.021 | 0.203 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / internal (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 428.487 | n/a | n/a | n/a | 3.771 | n/a | 0.000 | 0.000 | 1.061 | 421.952 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.132 | 3.917 | 0.012 | 0.132 |
| p99 | 1004.646 | n/a | n/a | n/a | 35.871 | n/a | 2.221 | 0.000 | 5.756 | 1001.772 | 0.416 | n/a | 0.208 | 0.000 | n/a | n/a | 46.696 | 38.092 | 0.644 | 46.696 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b0000000000000138 | 1004.646 | 0.248 | n/a | 0.000 | 0.000 | 1.767 | 1001.343 | 0.007 | n/a | 0.091 | 0.000 | n/a | n/a | 1.190 | 0.248 | 0.000 | 1.190 | gw-r/thread-73/journal/page | none observed |
| 9d80869e72dcb96b00000000000000d9 | 1004.511 | 0.158 | n/a | 0.000 | 0.000 | 1.089 | 1001.772 | 0.159 | n/a | 0.147 | 0.000 | n/a | n/a | 1.185 | 0.158 | 0.000 | 1.185 | gw-r/thread-49/journal/page | none observed |
| 9d80869e72dcb96b0000000000000126 | 1004.259 | 2.793 | n/a | 0.000 | 0.000 | 0.823 | 1000.491 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.062 | 2.793 | 0.003 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 9d80869e72dcb96b000000000000011d | 1003.413 | 5.614 | n/a | 0.000 | 0.000 | 0.943 | 996.390 | 0.019 | n/a | 0.208 | 0.000 | n/a | n/a | 0.240 | 5.614 | 0.006 | 0.240 | gw-r/thread-47/journal/page | none observed |
| 9d80869e72dcb96b000000000000012a | 1002.981 | 0.129 | n/a | 0.000 | 0.000 | 0.777 | 1000.839 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 1.159 | 0.129 | 0.000 | 1.159 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b0000000000000115 | 1002.014 | 2.400 | n/a | 0.944 | 0.000 | 3.946 | 994.546 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.124 | 3.344 | 0.003 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 9d80869e72dcb96b00000000000000d3 | 1000.963 | 5.100 | n/a | 0.000 | 0.000 | 1.753 | 993.218 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.806 | 5.100 | 0.005 | 0.806 | gw-r/thread-68/journal/page | none observed |
| 9d80869e72dcb96b0000000000000106 | 997.458 | 3.313 | n/a | 0.000 | 0.000 | 2.085 | 991.877 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.108 | 3.313 | 0.003 | 0.108 | gw-r/thread-69/journal/page | none observed |
| 9d80869e72dcb96b00000000000000e0 | 997.185 | 7.288 | n/a | 0.000 | 0.000 | 1.927 | 987.611 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.250 | 7.288 | 0.007 | 0.250 | gw-r/thread-48/journal/page | none observed |
| 9d80869e72dcb96b0000000000000142 | 991.568 | 4.258 | n/a | 0.000 | 0.000 | 1.273 | 985.819 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.149 | 4.258 | 0.004 | 0.149 | gw-r/thread-68/journal/page | none observed |
| 9d80869e72dcb96b00000000000000d2 | 987.551 | 3.356 | n/a | 0.000 | 0.000 | 0.882 | 983.128 | 0.011 | n/a | 0.075 | 0.000 | n/a | n/a | 0.099 | 3.356 | 0.003 | 0.099 | gw-r/thread-73/journal/page | none observed |
| 9d80869e72dcb96b0000000000000155 | 984.873 | 2.882 | n/a | 0.000 | 0.000 | 2.971 | 978.850 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.113 | 2.882 | 0.003 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 9d80869e72dcb96b000000000000012c | 980.196 | 3.368 | n/a | 0.000 | 0.000 | 0.639 | 976.076 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.065 | 3.368 | 0.003 | 0.065 | gw-r/thread-72/journal/page | none observed |
| 9d80869e72dcb96b000000000000010e | 978.660 | 2.371 | n/a | 0.000 | 0.000 | 1.749 | 974.285 | 0.045 | n/a | 0.131 | 0.000 | n/a | n/a | 0.079 | 2.371 | 0.002 | 0.079 | gw-r/thread-66/journal/page | none observed |
| 9d80869e72dcb96b0000000000000102 | 966.517 | 6.797 | n/a | 0.000 | 0.000 | 1.409 | 957.909 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.325 | 6.797 | 0.007 | 0.325 | gw-r/thread-70/journal/page | none observed |
| 9d80869e72dcb96b0000000000000149 | 950.573 | 3.957 | n/a | 0.640 | 0.000 | 1.725 | 944.061 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.132 | 4.597 | 0.005 | 0.132 | gw-r/thread-45/journal/page | none observed |
| 9d80869e72dcb96b00000000000000db | 927.363 | 7.737 | n/a | 0.889 | 0.000 | 1.367 | 916.967 | 0.037 | n/a | 0.178 | 0.000 | n/a | n/a | 0.188 | 8.626 | 0.009 | 0.188 | gw-r/thread-63/journal/page | none observed |
| 9d80869e72dcb96b00000000000000df | 920.486 | 9.641 | n/a | 1.124 | 0.000 | 1.217 | 908.212 | 0.024 | n/a | 0.103 | 0.000 | n/a | n/a | 0.166 | 10.765 | 0.012 | 0.166 | gw-r/thread-67/journal/page | none observed |
| 9d80869e72dcb96b00000000000000e6 | 912.588 | 5.764 | n/a | 0.729 | 0.000 | 4.642 | 901.131 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.209 | 6.492 | 0.007 | 0.209 | gw-r/thread-49/journal/page | none observed |
| 9d80869e72dcb96b0000000000000133 | 889.433 | 3.662 | n/a | 0.000 | 0.000 | 0.750 | 884.753 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.202 | 3.662 | 0.004 | 0.202 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / internal (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 378.191 | n/a | n/a | n/a | 4.053 | n/a | 0.000 | 0.000 | 0.971 | 368.582 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.107 | 4.053 | 0.015 | 0.107 |
| p99 | 1007.905 | n/a | n/a | n/a | 14.351 | n/a | 0.000 | 0.000 | 5.590 | 1002.299 | 0.021 | n/a | 0.111 | 0.000 | n/a | n/a | 41.828 | 15.122 | 0.521 | 41.828 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b0000000000000175 | 1008.427 | 6.353 | n/a | 0.000 | 0.000 | 1.724 | 1000.080 | 0.006 | n/a | 0.085 | 0.000 | n/a | n/a | 0.180 | 6.353 | 0.006 | 0.180 | gw-r/thread-69/journal/page | none observed |
| 9d80869e72dcb96b00000000000001c3 | 1007.905 | 12.472 | n/a | 0.000 | 0.000 | 1.377 | 993.832 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.173 | 12.472 | 0.012 | 0.173 | gw-r/thread-63/journal/page | none observed |
| 9d80869e72dcb96b00000000000001f6 | 1006.236 | 0.190 | n/a | 0.000 | 0.000 | 2.247 | 1002.474 | 0.021 | n/a | 0.066 | 0.000 | n/a | n/a | 1.239 | 0.190 | 0.000 | 1.239 | gw-r/thread-48/journal/page | none observed |
| 9d80869e72dcb96b000000000000018a | 1006.087 | 0.350 | n/a | 0.000 | 0.000 | 2.991 | 1001.490 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 1.158 | 0.350 | 0.000 | 1.158 | gw-r/thread-48/journal/page | none observed |
| 9d80869e72dcb96b0000000000000165 | 1005.843 | 1.257 | n/a | 0.000 | 0.000 | 0.937 | 1002.299 | 0.007 | n/a | 0.103 | 0.000 | n/a | n/a | 1.240 | 1.257 | 0.001 | 1.240 | gw-r/thread-63/journal/page | none observed |
| 9d80869e72dcb96b00000000000001a5 | 1001.875 | 9.500 | n/a | 0.000 | 0.000 | 0.966 | 991.227 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.107 | 9.500 | 0.009 | 0.107 | gw-r/thread-63/journal/page | none observed |
| 9d80869e72dcb96b00000000000001c2 | 999.047 | 2.701 | n/a | 0.000 | 0.000 | 2.519 | 993.705 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.071 | 2.701 | 0.003 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 9d80869e72dcb96b0000000000000186 | 996.334 | 2.510 | n/a | 0.000 | 0.000 | 0.715 | 992.983 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.076 | 2.510 | 0.003 | 0.076 | gw-r/thread-69/journal/page | none observed |
| 9d80869e72dcb96b0000000000000185 | 995.670 | 12.406 | n/a | 0.000 | 0.000 | 1.156 | 981.941 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.112 | 12.406 | 0.012 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 9d80869e72dcb96b000000000000017a | 991.664 | 3.235 | n/a | 0.000 | 0.000 | 1.966 | 986.320 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.078 | 3.235 | 0.003 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 9d80869e72dcb96b00000000000001e8 | 988.488 | 2.331 | n/a | 0.000 | 0.000 | 0.504 | 985.550 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.058 | 2.331 | 0.002 | 0.058 | gw-r/thread-67/journal/page | none observed |
| 9d80869e72dcb96b00000000000001c0 | 984.960 | 4.953 | n/a | 0.000 | 0.000 | 0.803 | 979.050 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.079 | 4.953 | 0.005 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 9d80869e72dcb96b000000000000017f | 983.433 | 2.451 | n/a | 0.000 | 0.000 | 0.576 | 980.281 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.068 | 2.451 | 0.002 | 0.068 | gw-r/thread-70/journal/page | none observed |
| 9d80869e72dcb96b00000000000001a4 | 981.851 | 12.219 | n/a | 0.000 | 0.000 | 0.968 | 968.373 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.246 | 12.219 | 0.012 | 0.246 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b000000000000016f | 981.362 | 2.389 | n/a | 0.000 | 0.000 | 3.229 | 975.614 | 0.013 | n/a | 0.058 | 0.000 | n/a | n/a | 0.058 | 2.389 | 0.002 | 0.058 | gw-r/thread-66/journal/page | none observed |
| 9d80869e72dcb96b00000000000001a6 | 979.337 | 5.135 | n/a | 0.000 | 0.000 | 0.689 | 973.334 | 0.004 | n/a | 0.063 | 0.000 | n/a | n/a | 0.112 | 5.135 | 0.005 | 0.112 | gw-r/thread-67/journal/page | none observed |
| 9d80869e72dcb96b00000000000001f2 | 883.697 | 14.351 | n/a | 0.000 | 0.000 | 1.418 | 867.788 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.082 | 14.351 | 0.016 | 0.082 | gw-r/thread-68/journal/page | none observed |
| 9d80869e72dcb96b00000000000001e7 | 874.868 | 2.271 | n/a | 0.000 | 0.000 | 2.337 | 870.105 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.098 | 2.271 | 0.003 | 0.098 | gw-r/thread-68/journal/page | none observed |
| 9d80869e72dcb96b00000000000001b5 | 850.815 | 3.014 | n/a | 0.000 | 0.000 | 1.275 | 846.373 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.099 | 3.014 | 0.004 | 0.099 | gw-r/thread-70/journal/page | none observed |
| 9d80869e72dcb96b0000000000000183 | 839.318 | 2.490 | n/a | 0.000 | 0.000 | 2.681 | 834.014 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.078 | 2.490 | 0.003 | 0.078 | gw-r/thread-67/journal/page | none observed |

## P3 / L16 / internal (1475 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.663 | n/a | n/a | n/a | 3.671 | n/a | 0.000 | 0.000 | 0.254 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.790 | 3.680 | 0.294 | 6.790 |
| p99 | 514.251 | n/a | n/a | n/a | 20.963 | n/a | 3.192 | 0.000 | 4.109 | 510.545 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 47.781 | 22.526 | 0.853 | 47.781 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b0000000000000217 | 1010.867 | 9.336 | n/a | 0.000 | 0.000 | 0.870 | 1000.515 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.096 | 9.336 | 0.009 | 0.096 | gw-r/thread-66/journal/page | none observed |
| 9d80869e72dcb96b0000000000000215 | 1005.008 | 0.187 | n/a | 0.000 | 0.000 | 0.725 | 1001.590 | 0.025 | n/a | 0.061 | 0.000 | n/a | n/a | 2.420 | 0.187 | 0.000 | 2.420 | gw-r/thread-44/journal/page | none observed |
| 9d80869e72dcb96b0000000000000210 | 999.523 | 8.256 | n/a | 0.000 | 0.000 | 0.461 | 990.637 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.104 | 8.256 | 0.008 | 0.104 | gw-r/thread-67/journal/page | none observed |
| 9d80869e72dcb96b0000000000000223 | 994.480 | 2.219 | n/a | 0.000 | 0.000 | 0.699 | 991.470 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.061 | 2.219 | 0.002 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 9d80869e72dcb96b00000000000001fd | 992.401 | 2.936 | n/a | 0.000 | 0.000 | 2.208 | 987.066 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.141 | 2.936 | 0.003 | 0.141 | gw-r/thread-47/journal/page | none observed |
| 9d80869e72dcb96b0000000000000214 | 977.068 | 6.063 | n/a | 0.000 | 0.000 | 1.567 | 969.232 | 0.004 | n/a | 0.062 | 0.000 | n/a | n/a | 0.139 | 6.063 | 0.006 | 0.139 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b0000000000000206 | 938.957 | 2.211 | n/a | 0.000 | 0.000 | 0.642 | 935.959 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.081 | 2.211 | 0.002 | 0.081 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b0000000000000211 | 822.582 | 12.571 | n/a | 0.000 | 0.000 | 0.734 | 809.112 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.117 | 12.571 | 0.015 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 9d80869e72dcb96b000000000000020e | 695.917 | 6.004 | n/a | 0.000 | 0.000 | 7.228 | 682.517 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.113 | 6.004 | 0.009 | 0.113 | gw-r/thread-69/journal/page | none observed |
| 9d80869e72dcb96b0000000000000224 | 655.471 | 1.966 | n/a | 0.000 | 0.000 | 0.430 | 652.948 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.084 | 1.966 | 0.003 | 0.084 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b0000000000000218 | 652.512 | 5.450 | n/a | 0.000 | 0.000 | 2.387 | 644.494 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.143 | 5.450 | 0.008 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 9d80869e72dcb96b00000000000001fe | 593.673 | 2.219 | n/a | 0.000 | 0.000 | 0.972 | 590.321 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.095 | 2.219 | 0.004 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 9d80869e72dcb96b0000000000000220 | 550.903 | 4.508 | n/a | 0.000 | 0.000 | 5.821 | 540.417 | 0.023 | n/a | 0.062 | 0.000 | n/a | n/a | 0.072 | 4.508 | 0.008 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 9d80869e72dcb96b0000000000000201 | 519.474 | 6.299 | n/a | 0.000 | 0.000 | 0.789 | 512.178 | 0.003 | n/a | 0.075 | 0.000 | n/a | n/a | 0.130 | 6.299 | 0.012 | 0.130 | gw-r/thread-67/journal/page | none observed |
| 9d80869e72dcb96b000000000000021b | 514.251 | 2.936 | n/a | 0.000 | 0.000 | 0.577 | 510.545 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.142 | 2.936 | 0.006 | 0.142 | gw-r/thread-68/journal/page | none observed |
| 9d80869e72dcb96b0000000000000222 | 453.366 | 2.304 | n/a | 0.000 | 0.000 | 0.757 | 450.162 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.079 | 2.304 | 0.005 | 0.079 | gw-r/thread-66/journal/page | none observed |
| 9d80869e72dcb96b00000000000001ff | 422.833 | 6.238 | n/a | 0.000 | 0.000 | 1.365 | 414.956 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.162 | 6.238 | 0.015 | 0.162 | gw-r/thread-66/journal/page | none observed |
| 9d80869e72dcb96b0000000000000202 | 361.278 | 2.860 | n/a | 0.000 | 0.000 | 2.297 | 355.942 | 0.009 | n/a | 0.097 | 0.000 | n/a | n/a | 0.074 | 2.860 | 0.008 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 9d80869e72dcb96b000000000000021a | 323.572 | 2.382 | n/a | 0.000 | 0.000 | 2.338 | 318.701 | 0.015 | n/a | 0.052 | 0.000 | n/a | n/a | 0.084 | 2.382 | 0.007 | 0.084 | gw-r/thread-71/journal/page | none observed |
| 9d80869e72dcb96b000000000000021c | 250.125 | 2.579 | n/a | 0.000 | 0.000 | 2.553 | 244.866 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.071 | 2.579 | 0.010 | 0.071 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (1323 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.065 | n/a | n/a | n/a | 5.792 | n/a | 0.000 | 0.000 | 0.318 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.713 | 5.911 | 0.406 | 6.713 |
| p99 | 381.576 | n/a | n/a | n/a | 39.839 | n/a | 7.394 | 0.000 | 5.228 | 378.932 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 47.377 | 44.403 | 0.893 | 47.377 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b00000000000019b2 | 1014.814 | 20.538 | n/a | 1.736 | 0.000 | 2.480 | 989.505 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.518 | 22.273 | 0.022 | 0.518 | gw-r/thread-103/journal/page | none observed |
| 9d80869e72dcb96b0000000000001990 | 1005.749 | 3.940 | n/a | 0.000 | 0.000 | 0.551 | 1001.146 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.064 | 3.940 | 0.004 | 0.064 | gw-r/thread-106/journal/page | none observed |
| 9d80869e72dcb96b000000000000198e | 1002.261 | 0.100 | n/a | 0.000 | 0.000 | 0.412 | 1000.578 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.135 | 0.100 | 0.000 | 1.135 | gw-r/thread-100/journal/page | none observed |
| 9d80869e72dcb96b0000000000001999 | 992.795 | 6.393 | n/a | 0.000 | 0.000 | 0.542 | 985.775 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.063 | 6.393 | 0.006 | 0.063 | gw-r/thread-87/journal/page | none observed |
| 9d80869e72dcb96b00000000000019b5 | 984.787 | 2.493 | n/a | 0.000 | 0.000 | 0.532 | 981.576 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.127 | 2.493 | 0.003 | 0.127 | gw-r/thread-124/journal/page | none observed |
| 9d80869e72dcb96b00000000000019a3 | 755.214 | 10.851 | n/a | 0.000 | 0.000 | 0.761 | 743.314 | 0.014 | n/a | 0.027 | 0.000 | n/a | n/a | 0.247 | 10.851 | 0.014 | 0.247 | gw-r/thread-80/journal/page | none observed |
| 9d80869e72dcb96b00000000000019cc | 742.235 | 2.200 | n/a | 0.000 | 0.000 | 4.998 | 734.922 | 0.012 | n/a | 0.041 | 0.000 | n/a | n/a | 0.063 | 2.200 | 0.003 | 0.063 | gw-r/thread-78/journal/page | none observed |
| 9d80869e72dcb96b0000000000001994 | 715.537 | 6.561 | n/a | 0.000 | 0.000 | 0.685 | 708.027 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.228 | 6.561 | 0.009 | 0.228 | gw-r/thread-118/journal/page | none observed |
| 9d80869e72dcb96b00000000000019ae | 708.217 | 2.045 | n/a | 0.000 | 0.000 | 0.750 | 705.318 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.071 | 2.045 | 0.003 | 0.071 | gw-r/thread-86/journal/page | none observed |
| 9d80869e72dcb96b00000000000019a9 | 690.932 | 9.602 | n/a | 0.000 | 0.000 | 0.823 | 680.302 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.173 | 9.602 | 0.014 | 0.173 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b00000000000019c2 | 670.438 | 4.579 | n/a | 0.000 | 0.000 | 1.319 | 664.418 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.074 | 4.579 | 0.007 | 0.074 | gw-r/thread-80/journal/page | none observed |
| 9d80869e72dcb96b0000000000001991 | 640.710 | 11.895 | n/a | 0.000 | 0.000 | 0.723 | 627.768 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.277 | 11.895 | 0.019 | 0.277 | gw-r/thread-111/journal/page | none observed |
| 9d80869e72dcb96b00000000000019c7 | 401.115 | 2.241 | n/a | 0.000 | 0.000 | 0.414 | 398.335 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.082 | 2.241 | 0.006 | 0.082 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b000000000000199a | 381.576 | 1.901 | n/a | 0.000 | 0.000 | 0.595 | 378.932 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.099 | 1.901 | 0.005 | 0.099 | gw-r/thread-81/journal/page | none observed |
| 9d80869e72dcb96b00000000000019b6 | 355.220 | 9.194 | n/a | 0.000 | 0.000 | 0.476 | 345.157 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.359 | 9.194 | 0.026 | 0.359 | gw-r/thread-116/journal/page | none observed |
| 9d80869e72dcb96b0000000000001993 | 354.192 | 7.305 | n/a | 0.000 | 0.000 | 0.793 | 345.927 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.098 | 7.305 | 0.021 | 0.098 | gw-r/thread-110/journal/page | none observed |
| 9d80869e72dcb96b00000000000019b9 | 347.758 | 8.523 | n/a | 1.710 | 0.000 | 0.648 | 336.678 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.152 | 10.233 | 0.029 | 0.152 | gw-r/thread-72/journal/page | none observed |
| 9d80869e72dcb96b00000000000019c5 | 343.392 | 2.002 | n/a | 0.000 | 0.000 | 1.053 | 340.210 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.094 | 2.002 | 0.006 | 0.094 | gw-r/thread-100/journal/page | none observed |
| 9d80869e72dcb96b00000000000019c1 | 293.707 | 3.646 | n/a | 0.000 | 0.000 | 1.180 | 288.778 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.075 | 3.646 | 0.012 | 0.075 | gw-r/thread-85/journal/page | none observed |
| 9d80869e72dcb96b00000000000019b7 | 292.990 | 2.420 | n/a | 0.000 | 0.000 | 4.282 | 286.178 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.083 | 2.420 | 0.008 | 0.083 | gw-r/thread-73/journal/page | none observed |

## P3 / L256 / internal (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 382.501 | n/a | n/a | n/a | 3.111 | n/a | 0.000 | 0.000 | 0.747 | 379.519 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.084 | 3.111 | 0.011 | 0.084 |
| p99 | 1007.034 | n/a | n/a | n/a | 37.904 | n/a | 3.308 | 0.000 | 8.622 | 1001.253 | 0.129 | n/a | 0.116 | 0.000 | n/a | n/a | 43.138 | 37.904 | 0.400 | 43.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b0000000000001a3b | 1007.034 | 2.516 | n/a | 0.000 | 0.000 | 3.162 | 1001.253 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.077 | 2.516 | 0.002 | 0.077 | gw-r/thread-118/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a17 | 1003.199 | 6.506 | n/a | 0.000 | 0.000 | 1.519 | 995.044 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.103 | 6.506 | 0.006 | 0.103 | gw-r/thread-42/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a22 | 1002.617 | 3.062 | n/a | 0.000 | 0.000 | 0.781 | 998.630 | 0.026 | n/a | 0.052 | 0.000 | n/a | n/a | 0.066 | 3.062 | 0.003 | 0.066 | gw-r/thread-94/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a54 | 1002.586 | 8.393 | n/a | 0.000 | 0.000 | 1.043 | 993.021 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.104 | 8.393 | 0.008 | 0.104 | gw-r/thread-120/journal/page | none observed |
| 9d80869e72dcb96b00000000000019d3 | 1002.282 | 0.117 | n/a | 0.000 | 0.000 | 0.479 | 1000.553 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 1.098 | 0.117 | 0.000 | 1.098 | gw-r/thread-82/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a27 | 1002.112 | 0.120 | n/a | 0.000 | 0.000 | 0.336 | 1000.532 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 1.091 | 0.120 | 0.000 | 1.091 | gw-r/thread-99/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a18 | 1002.016 | 0.200 | n/a | 0.000 | 0.000 | 0.782 | 1000.918 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.055 | 0.200 | 0.000 | 0.055 | gw-r/thread-71/journal/page | none observed |
| 9d80869e72dcb96b00000000000019d8 | 1001.647 | 5.479 | n/a | 0.000 | 0.000 | 1.075 | 994.889 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.175 | 5.479 | 0.005 | 0.175 | gw-r/thread-95/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a30 | 998.885 | 2.284 | n/a | 0.000 | 0.000 | 0.926 | 995.579 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.061 | 2.284 | 0.002 | 0.061 | gw-r/thread-76/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a53 | 998.512 | 2.488 | n/a | 0.000 | 0.000 | 2.243 | 993.680 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.067 | 2.488 | 0.002 | 0.067 | gw-r/thread-69/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a23 | 997.397 | 3.540 | n/a | 0.000 | 0.000 | 0.449 | 993.299 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.078 | 3.540 | 0.004 | 0.078 | gw-r/thread-89/journal/page | none observed |
| 9d80869e72dcb96b00000000000019e7 | 993.456 | 2.550 | n/a | 0.000 | 0.000 | 0.518 | 990.289 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.067 | 2.550 | 0.003 | 0.067 | gw-r/thread-76/journal/page | none observed |
| 9d80869e72dcb96b00000000000019fa | 990.856 | 2.563 | n/a | 0.000 | 0.000 | 1.633 | 986.575 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.059 | 2.563 | 0.003 | 0.059 | gw-r/thread-100/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a29 | 987.202 | 2.477 | n/a | 0.000 | 0.000 | 0.579 | 984.052 | 0.001 | n/a | 0.020 | 0.000 | n/a | n/a | 0.073 | 2.477 | 0.003 | 0.073 | gw-r/thread-91/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a14 | 986.620 | 7.066 | n/a | 0.000 | 0.000 | 0.702 | 978.426 | 0.014 | n/a | 0.046 | 0.000 | n/a | n/a | 0.365 | 7.066 | 0.007 | 0.365 | gw-r/thread-91/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a21 | 912.836 | 3.174 | n/a | 0.000 | 0.000 | 1.658 | 907.893 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.072 | 3.174 | 0.003 | 0.072 | gw-r/thread-120/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a2b | 911.649 | 2.552 | n/a | 0.000 | 0.000 | 2.947 | 906.052 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.068 | 2.552 | 0.003 | 0.068 | gw-r/thread-110/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a02 | 877.987 | 4.595 | n/a | 0.000 | 0.000 | 0.743 | 872.526 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.084 | 4.595 | 0.005 | 0.084 | gw-r/thread-118/journal/page | none observed |
| 9d80869e72dcb96b00000000000019ec | 863.827 | 17.110 | n/a | 0.000 | 0.000 | 1.868 | 844.650 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.156 | 17.110 | 0.020 | 0.156 | gw-r/thread-81/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a5b | 818.977 | 2.343 | n/a | 0.000 | 0.000 | 1.011 | 815.521 | 0.015 | n/a | 0.028 | 0.000 | n/a | n/a | 0.058 | 2.343 | 0.003 | 0.058 | gw-r/thread-122/journal/page | none observed |

## P3 / L1024 / internal (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 401.529 | n/a | n/a | n/a | 3.382 | n/a | 0.000 | 0.000 | 0.834 | 388.973 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.080 | 3.382 | 0.010 | 0.080 |
| p99 | 1009.524 | n/a | n/a | n/a | 26.307 | n/a | 6.984 | 0.000 | 6.347 | 1001.702 | 0.030 | n/a | 0.063 | 0.000 | n/a | n/a | 33.181 | 26.307 | 0.792 | 33.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b0000000000001ac4 | 1009.524 | 6.929 | n/a | 0.000 | 0.000 | 5.110 | 997.372 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.085 | 6.929 | 0.007 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 9d80869e72dcb96b0000000000001ae7 | 1006.116 | 0.107 | n/a | 0.000 | 0.000 | 0.417 | 1000.510 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 5.046 | 0.107 | 0.000 | 5.046 | gw-r/thread-77/journal/page | none observed |
| 9d80869e72dcb96b0000000000001ae0 | 1004.204 | 0.118 | n/a | 0.000 | 0.000 | 1.218 | 1001.702 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 1.126 | 0.118 | 0.000 | 1.126 | gw-r/thread-119/journal/page | none observed |
| 9d80869e72dcb96b0000000000001abc | 1003.955 | 2.330 | n/a | 0.000 | 0.000 | 0.431 | 1001.101 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.060 | 2.330 | 0.002 | 0.060 | gw-r/thread-72/journal/page | none observed |
| 9d80869e72dcb96b0000000000001af3 | 1002.584 | 0.122 | n/a | 0.000 | 0.000 | 0.562 | 1000.752 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 1.095 | 0.122 | 0.000 | 1.095 | gw-r/thread-44/journal/page | none observed |
| 9d80869e72dcb96b0000000000001af5 | 1000.383 | 12.927 | n/a | 1.936 | 0.000 | 0.879 | 984.463 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.143 | 14.862 | 0.015 | 0.143 | gw-r/thread-100/journal/page | none observed |
| 9d80869e72dcb96b0000000000001aae | 999.230 | 3.951 | n/a | 0.000 | 0.000 | 0.276 | 994.902 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 0.068 | 3.951 | 0.004 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 9d80869e72dcb96b0000000000001abd | 997.195 | 2.243 | n/a | 0.000 | 0.000 | 0.516 | 994.341 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.055 | 2.243 | 0.002 | 0.055 | gw-r/thread-136/journal/page | none observed |
| 9d80869e72dcb96b0000000000001acb | 995.673 | 7.655 | n/a | 0.000 | 0.000 | 3.911 | 983.890 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.184 | 7.655 | 0.008 | 0.184 | gw-r/thread-135/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a94 | 995.411 | 2.295 | n/a | 0.000 | 0.000 | 0.500 | 992.518 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.071 | 2.295 | 0.002 | 0.071 | gw-r/thread-132/journal/page | none observed |
| 9d80869e72dcb96b0000000000001ab6 | 994.667 | 2.760 | n/a | 0.000 | 0.000 | 1.114 | 990.690 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.063 | 2.760 | 0.003 | 0.063 | gw-r/thread-97/journal/page | none observed |
| 9d80869e72dcb96b0000000000001ab5 | 993.779 | 4.669 | n/a | 0.000 | 0.000 | 0.827 | 988.170 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.082 | 4.669 | 0.005 | 0.082 | gw-r/thread-67/journal/page | none observed |
| 9d80869e72dcb96b0000000000001ad6 | 992.007 | 3.408 | n/a | 0.000 | 0.000 | 0.574 | 987.942 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.057 | 3.408 | 0.003 | 0.057 | gw-r/thread-122/journal/page | none observed |
| 9d80869e72dcb96b0000000000001ac3 | 982.549 | 2.831 | n/a | 0.000 | 0.000 | 1.103 | 978.510 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.061 | 2.831 | 0.003 | 0.061 | gw-r/thread-76/journal/page | none observed |
| 9d80869e72dcb96b0000000000001ad9 | 974.880 | 2.237 | n/a | 0.000 | 0.000 | 0.943 | 971.601 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.071 | 2.237 | 0.002 | 0.071 | gw-r/thread-101/journal/page | none observed |
| 9d80869e72dcb96b0000000000001ac5 | 974.279 | 3.743 | n/a | 0.000 | 0.000 | 0.491 | 969.929 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.075 | 3.743 | 0.004 | 0.075 | gw-r/thread-139/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a91 | 967.924 | 2.201 | n/a | 0.000 | 0.000 | 0.431 | 965.212 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.052 | 2.201 | 0.002 | 0.052 | gw-r/thread-111/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a80 | 955.477 | 2.235 | n/a | 0.000 | 0.000 | 1.986 | 951.171 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.054 | 2.235 | 0.002 | 0.054 | gw-r/thread-44/journal/page | none observed |
| 9d80869e72dcb96b0000000000001abe | 934.018 | 4.551 | n/a | 0.000 | 0.000 | 0.448 | 928.827 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.161 | 4.551 | 0.005 | 0.161 | gw-r/thread-81/journal/page | none observed |
| 9d80869e72dcb96b0000000000001a75 | 916.991 | 6.708 | n/a | 0.000 | 0.000 | 0.509 | 909.622 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.113 | 6.708 | 0.007 | 0.113 | gw-r/thread-69/journal/page | none observed |

## P3 / tail / internal (363 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 385.783 | n/a | n/a | n/a | 3.287 | n/a | 0.000 | 0.000 | 0.540 | 381.999 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.086 | 3.297 | 0.010 | 0.086 |
| p99 | 1004.028 | n/a | n/a | n/a | 14.774 | n/a | 1.509 | 0.000 | 3.480 | 1000.858 | 0.110 | n/a | 0.078 | 0.000 | n/a | n/a | 46.595 | 16.262 | 0.645 | 46.595 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9d80869e72dcb96b0000000000001b0e | 1019.190 | 2.961 | n/a | 0.000 | 0.000 | 0.447 | 1015.690 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.071 | 2.961 | 0.003 | 0.071 | gw-r/thread-118/journal/page | none observed |
| 9d80869e72dcb96b0000000000001c5b | 1005.175 | 3.007 | n/a | 0.000 | 0.000 | 0.461 | 1001.601 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.060 | 3.007 | 0.003 | 0.060 | gw-r/thread-95/journal/page | none observed |
| 9d80869e72dcb96b0000000000001c1f | 1004.670 | 2.964 | n/a | 0.000 | 0.000 | 0.744 | 1000.858 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.078 | 2.964 | 0.003 | 0.078 | gw-r/thread-134/journal/page | none observed |
| 9d80869e72dcb96b0000000000001b7e | 1004.028 | 6.042 | n/a | 0.000 | 0.000 | 1.492 | 996.320 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.137 | 6.042 | 0.006 | 0.137 | gw-r/thread-110/journal/page | none observed |
| 9d80869e72dcb96b0000000000001c4b | 1003.737 | 2.827 | n/a | 0.000 | 0.000 | 0.367 | 1000.413 | 0.022 | n/a | 0.040 | 0.000 | n/a | n/a | 0.068 | 2.827 | 0.003 | 0.068 | gw-r/thread-115/journal/page | none observed |
| 9d80869e72dcb96b0000000000001b7c | 1003.363 | 2.543 | n/a | 0.000 | 0.000 | 0.599 | 1000.086 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.086 | 2.543 | 0.003 | 0.086 | gw-r/thread-67/journal/page | none observed |
| 9d80869e72dcb96b0000000000001ced | 1003.330 | 0.192 | n/a | 0.000 | 0.000 | 1.298 | 1000.639 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 1.118 | 0.192 | 0.000 | 1.118 | gw-r/thread-135/journal/page | none observed |
| 9d80869e72dcb96b0000000000001c6a | 1003.262 | 0.107 | n/a | 0.000 | 0.000 | 1.330 | 1000.677 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 1.107 | 0.107 | 0.000 | 1.107 | gw-r/thread-63/journal/page | none observed |
| 9d80869e72dcb96b0000000000001bc6 | 1003.238 | 4.746 | n/a | 0.000 | 0.000 | 0.714 | 997.667 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.073 | 4.746 | 0.005 | 0.073 | gw-r/thread-128/journal/page | none observed |
| 9d80869e72dcb96b0000000000001d1c | 1003.049 | 0.116 | n/a | 0.000 | 0.000 | 0.552 | 1001.225 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 1.094 | 0.116 | 0.000 | 1.094 | gw-r/thread-68/journal/page | none observed |
| 9d80869e72dcb96b0000000000001d0c | 1002.857 | 0.140 | n/a | 0.000 | 0.000 | 1.004 | 1000.555 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 1.097 | 0.140 | 0.000 | 1.097 | gw-r/thread-72/journal/page | none observed |
| 9d80869e72dcb96b0000000000001bf7 | 1002.792 | 2.403 | n/a | 0.000 | 0.000 | 0.659 | 999.612 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.063 | 2.403 | 0.002 | 0.063 | gw-r/thread-117/journal/page | none observed |
| 9d80869e72dcb96b0000000000001cba | 1002.763 | 2.454 | n/a | 0.000 | 0.000 | 0.284 | 999.924 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.056 | 2.454 | 0.002 | 0.056 | gw-r/thread-122/journal/page | none observed |
| 9d80869e72dcb96b0000000000001d20 | 1002.639 | 0.273 | n/a | 0.000 | 0.000 | 0.722 | 1000.461 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.144 | 0.273 | 0.000 | 1.144 | gw-r/thread-121/journal/page | none observed |
| 9d80869e72dcb96b0000000000001bc7 | 1002.630 | 3.595 | n/a | 0.000 | 0.000 | 1.595 | 997.317 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 0.088 | 3.595 | 0.004 | 0.088 | gw-r/thread-66/journal/page | none observed |
| 9d80869e72dcb96b0000000000001c58 | 1002.468 | 0.134 | n/a | 0.000 | 0.000 | 0.372 | 1000.786 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 1.112 | 0.134 | 0.000 | 1.112 | gw-r/thread-108/journal/page | none observed |
| 9d80869e72dcb96b0000000000001b23 | 1002.442 | 0.188 | n/a | 0.000 | 0.000 | 0.619 | 1000.467 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.129 | 0.188 | 0.000 | 1.129 | gw-r/thread-110/journal/page | none observed |
| 9d80869e72dcb96b0000000000001cb2 | 1002.210 | 2.975 | n/a | 0.000 | 0.000 | 1.509 | 997.615 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.060 | 2.975 | 0.003 | 0.060 | gw-r/thread-77/journal/page | none observed |
| 9d80869e72dcb96b0000000000001af9 | 1001.993 | 4.873 | n/a | 0.000 | 0.000 | 0.472 | 995.771 | 0.010 | n/a | 0.026 | 0.000 | n/a | n/a | 0.840 | 4.873 | 0.005 | 0.840 | gw-r/thread-76/journal/page | none observed |
| 9d80869e72dcb96b0000000000001b78 | 1001.910 | 2.600 | n/a | 0.000 | 0.000 | 0.353 | 998.851 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.078 | 2.600 | 0.003 | 0.078 | gw-r/thread-142/journal/page | none observed |

## P3 / warmup / read (71 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.078 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.251 | 201.354 | 0.023 | n/a | 0.143 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 |
| p99 | 214.859 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.191 | 210.607 | 8.180 | n/a | 3.363 | 0.000 | n/a | n/a | 49.611 | 0.000 | 0.000 | 49.611 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ce45bfd9d9e0c880000000000000037 | 214.859 | 0.000 | n/a | 0.000 | 0.000 | 3.875 | 210.607 | 0.043 | n/a | 0.157 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-46/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000022 | 209.709 | 0.000 | n/a | 0.000 | 0.000 | 3.594 | 203.159 | 0.072 | n/a | 0.166 | 0.000 | n/a | n/a | 2.717 | 0.000 | 0.000 | 2.717 | gw-r/thread-48/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000002e | 209.477 | 0.000 | n/a | 0.000 | 0.000 | 1.280 | 207.864 | 0.061 | n/a | 0.134 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-45/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000034 | 209.362 | 0.000 | n/a | 0.000 | 0.000 | 1.054 | 204.766 | 0.023 | n/a | 3.363 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000004b | 208.887 | 0.000 | n/a | 0.000 | 0.000 | 5.974 | 202.373 | 0.050 | n/a | 0.300 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-66/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000002d | 208.220 | 0.000 | n/a | 0.000 | 0.000 | 6.174 | 201.706 | 0.034 | n/a | 0.128 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-49/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000021 | 206.976 | 0.000 | n/a | 0.000 | 0.000 | 5.610 | 201.109 | 0.020 | n/a | 0.130 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-68/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000004d | 205.802 | 0.000 | n/a | 0.000 | 0.000 | 3.252 | 202.162 | 0.066 | n/a | 0.162 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-69/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000032 | 205.652 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 204.139 | 0.059 | n/a | 0.171 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-72/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000000d | 205.614 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 204.553 | 0.030 | n/a | 0.178 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000056 | 205.523 | 0.000 | n/a | 0.000 | 0.000 | 1.783 | 203.343 | 0.017 | n/a | 0.202 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-66/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000055 | 205.513 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 204.249 | 0.029 | n/a | 0.221 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000012 | 205.184 | 0.000 | n/a | 0.000 | 0.000 | 3.038 | 201.766 | 0.023 | n/a | 0.202 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-70/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000019 | 205.075 | 0.000 | n/a | 0.000 | 0.000 | 1.937 | 202.786 | 0.028 | n/a | 0.164 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-46/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000002c | 205.014 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 204.100 | 0.022 | n/a | 0.120 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000031 | 204.979 | 0.000 | n/a | 0.000 | 0.000 | 2.513 | 202.005 | 0.036 | n/a | 0.193 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-68/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000023 | 204.857 | 0.000 | n/a | 0.000 | 0.000 | 2.917 | 201.591 | 0.028 | n/a | 0.189 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000054 | 204.755 | 0.000 | n/a | 0.000 | 0.000 | 1.467 | 202.924 | 0.016 | n/a | 0.124 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-49/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000008 | 204.696 | 0.000 | n/a | 0.000 | 0.000 | 3.190 | 201.265 | 0.012 | n/a | 0.070 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-63/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000024 | 204.300 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 202.399 | 0.024 | n/a | 0.545 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.359 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.049 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 |
| p99 | 211.448 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.257 | 205.296 | 7.443 | n/a | 3.141 | 0.000 | n/a | n/a | 0.516 | 0.000 | 0.000 | 0.516 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ce45bfd9d9e0c880000000000000142 | 224.393 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 223.358 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-72/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000084 | 212.931 | 0.000 | n/a | 0.000 | 0.000 | 3.017 | 196.343 | 0.027 | n/a | 13.357 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-70/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000011e | 211.448 | 0.000 | n/a | 0.000 | 0.000 | 5.779 | 205.358 | 0.007 | n/a | 0.093 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-46/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000078 | 208.959 | 0.000 | n/a | 0.000 | 0.000 | 4.297 | 203.749 | 0.086 | n/a | 0.643 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-47/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000000ec | 208.522 | 0.000 | n/a | 0.000 | 0.000 | 6.137 | 202.115 | 0.009 | n/a | 0.128 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000088 | 207.020 | 0.000 | n/a | 0.000 | 0.000 | 4.283 | 201.867 | 0.028 | n/a | 0.158 | 0.000 | n/a | n/a | 0.684 | 0.000 | 0.000 | 0.684 | gw-r/thread-67/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000080 | 206.612 | 0.000 | n/a | 0.000 | 0.000 | 4.751 | 201.247 | 0.258 | n/a | 0.144 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-71/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000000fc | 206.519 | 0.000 | n/a | 0.000 | 0.000 | 5.257 | 200.980 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-67/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000012c | 206.494 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 205.296 | 0.026 | n/a | 0.155 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000136 | 206.480 | 0.000 | n/a | 0.000 | 0.000 | 1.366 | 204.897 | 0.006 | n/a | 0.082 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-68/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000012e | 206.279 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 205.111 | 0.029 | n/a | 0.088 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-70/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000013e | 206.038 | 0.000 | n/a | 0.000 | 0.000 | 1.727 | 204.064 | 0.006 | n/a | 0.098 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000000fb | 205.891 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 204.894 | 0.024 | n/a | 0.099 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000007f | 205.854 | 0.000 | n/a | 0.000 | 0.000 | 4.334 | 198.070 | 0.087 | n/a | 3.141 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-46/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000010d | 205.662 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 204.329 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.289 | 0.000 | 0.000 | 0.289 | gw-r/thread-72/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000000f8 | 205.500 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 204.723 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000008b | 205.383 | 0.000 | n/a | 0.000 | 0.000 | 2.656 | 202.014 | 0.010 | n/a | 0.187 | 0.000 | n/a | n/a | 0.516 | 0.000 | 0.000 | 0.516 | gw-r/thread-45/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000060 | 205.297 | 0.000 | n/a | 0.000 | 0.000 | 3.788 | 201.224 | 0.014 | n/a | 0.152 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000009b | 205.226 | 0.000 | n/a | 0.000 | 0.000 | 3.513 | 201.499 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-67/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000000be | 205.163 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 204.233 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / read (219 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.061 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 200.964 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 208.037 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.199 | 205.947 | 3.185 | n/a | 0.246 | 0.000 | n/a | n/a | 0.566 | 0.000 | 0.000 | 0.566 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ce45bfd9d9e0c880000000000000248 | 211.462 | 0.000 | n/a | 0.000 | 0.000 | 9.956 | 201.275 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-72/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000016e | 209.179 | 0.000 | n/a | 0.000 | 0.000 | 7.388 | 201.520 | 0.006 | n/a | 0.133 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000163 | 208.037 | 0.000 | n/a | 0.000 | 0.000 | 0.748 | 207.042 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-66/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000159 | 207.874 | 0.000 | n/a | 0.000 | 0.000 | 6.033 | 201.625 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-67/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000019c | 207.470 | 0.000 | n/a | 0.000 | 0.000 | 0.949 | 206.243 | 0.019 | n/a | 0.079 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-72/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000022a | 207.248 | 0.000 | n/a | 0.000 | 0.000 | 3.694 | 203.059 | 0.263 | n/a | 0.052 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-42/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000001a2 | 206.885 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 205.947 | 0.016 | n/a | 0.155 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-68/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000001c9 | 205.511 | 0.000 | n/a | 0.000 | 0.000 | 4.262 | 201.082 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-66/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000019e | 205.472 | 0.000 | n/a | 0.000 | 0.000 | 1.249 | 203.978 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000001a1 | 205.311 | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 204.352 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-63/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000001d5 | 205.233 | 0.000 | n/a | 0.000 | 0.000 | 3.795 | 201.164 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-49/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000233 | 204.998 | 0.000 | n/a | 0.000 | 0.000 | 2.874 | 201.910 | 0.016 | n/a | 0.078 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-69/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000235 | 204.988 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 204.118 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-68/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000001a9 | 204.773 | 0.000 | n/a | 0.000 | 0.000 | 3.745 | 200.841 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000001ed | 204.545 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 203.520 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-69/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000001b6 | 204.377 | 0.000 | n/a | 0.000 | 0.000 | 2.305 | 201.886 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-69/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000183 | 204.178 | 0.000 | n/a | 0.000 | 0.000 | 2.257 | 201.648 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-48/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000168 | 204.052 | 0.000 | n/a | 0.000 | 0.000 | 2.661 | 201.148 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000186 | 204.037 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 202.986 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000001e5 | 204.023 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 202.981 | 0.009 | n/a | 0.089 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-72/journal/page | none observed |

## P3 / L16 / read (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.283 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 74.908 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 208.946 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.563 | 204.948 | 5.072 | n/a | 0.119 | 0.000 | n/a | n/a | 57.271 | 0.000 | 0.000 | 57.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ce45bfd9d9e0c88000000000000025b | 224.856 | 0.000 | n/a | 0.000 | 0.000 | 10.551 | 214.081 | 0.021 | n/a | 0.061 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000268 | 208.946 | 0.000 | n/a | 0.000 | 0.000 | 7.563 | 201.135 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-66/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000277 | 207.790 | 0.000 | n/a | 0.000 | 0.000 | 6.452 | 201.071 | 0.008 | n/a | 0.100 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-47/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000028b | 205.586 | 0.000 | n/a | 0.000 | 0.000 | 0.450 | 204.948 | 0.009 | n/a | 0.085 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-42/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000027f | 205.425 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 204.427 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-63/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000026d | 203.973 | 0.000 | n/a | 0.000 | 0.000 | 1.233 | 202.485 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000025e | 203.880 | 0.000 | n/a | 0.000 | 0.000 | 0.786 | 202.818 | 0.024 | n/a | 0.096 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-70/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000025f | 203.749 | 0.000 | n/a | 0.000 | 0.000 | 1.433 | 202.007 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-69/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000286 | 203.388 | 0.000 | n/a | 0.000 | 0.000 | 2.379 | 200.824 | 0.005 | n/a | 0.082 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000024f | 203.032 | 0.000 | n/a | 0.000 | 0.000 | 1.290 | 201.469 | 0.008 | n/a | 0.100 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-70/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000251 | 202.962 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 201.871 | 0.031 | n/a | 0.074 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-71/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000292 | 202.916 | 0.000 | n/a | 0.000 | 0.000 | 2.051 | 200.646 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-69/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000026f | 202.707 | 0.000 | n/a | 0.000 | 0.000 | 1.109 | 201.351 | 0.031 | n/a | 0.059 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-49/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000266 | 202.656 | 0.000 | n/a | 0.000 | 0.000 | 1.740 | 200.748 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000288 | 202.491 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 201.704 | 0.017 | n/a | 0.067 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000259 | 202.488 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 201.389 | 0.010 | n/a | 0.101 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-72/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000250 | 202.451 | 0.000 | n/a | 0.000 | 0.000 | 1.106 | 201.093 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-72/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000295 | 202.387 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 201.379 | 0.017 | n/a | 0.082 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000027e | 202.382 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 201.279 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000291 | 202.316 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 201.420 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-67/journal/page | none observed |

## P3 / L64 / read (122 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 141.521 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 140.906 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 |
| p99 | 204.905 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.032 | 202.830 | 1.860 | n/a | 0.098 | 0.000 | n/a | n/a | 51.033 | 0.000 | 0.000 | 51.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ce45bfd9d9e0c880000000000000dc5 | 209.111 | 0.000 | n/a | 0.000 | 0.000 | 7.523 | 201.414 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000d89 | 204.905 | 0.000 | n/a | 0.000 | 0.000 | 1.499 | 203.260 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-123/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000db8 | 204.082 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 202.830 | 0.010 | n/a | 0.136 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-107/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000db9 | 203.488 | 0.000 | n/a | 0.000 | 0.000 | 2.527 | 200.798 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-76/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000dba | 203.165 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 202.064 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-63/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000da7 | 202.933 | 0.000 | n/a | 0.000 | 0.000 | 0.556 | 202.199 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-83/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000dc1 | 202.679 | 0.000 | n/a | 0.000 | 0.000 | 1.744 | 200.797 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-120/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000da5 | 202.205 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 201.140 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-108/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000d9d | 202.181 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 201.348 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000d8c | 202.082 | 0.000 | n/a | 0.000 | 0.000 | 0.310 | 201.643 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-84/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000ddb | 202.040 | 0.000 | n/a | 0.000 | 0.000 | 1.332 | 200.584 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-86/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000dd2 | 201.933 | 0.000 | n/a | 0.000 | 0.000 | 1.159 | 200.675 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.069 | 0.000 | 0.000 | 0.069 | gw-r/thread-90/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000ddc | 201.807 | 0.000 | n/a | 0.000 | 0.000 | 0.822 | 200.780 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-84/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000d83 | 201.802 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 200.917 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-105/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000dc3 | 201.781 | 0.000 | n/a | 0.000 | 0.000 | 0.500 | 201.096 | 0.006 | n/a | 0.098 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-112/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000dd4 | 201.768 | 0.000 | n/a | 0.000 | 0.000 | 0.426 | 201.193 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-91/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000d9a | 201.750 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 200.926 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-116/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000da3 | 201.745 | 0.000 | n/a | 0.000 | 0.000 | 0.512 | 201.102 | 0.011 | n/a | 0.034 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-95/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000d84 | 201.713 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 200.706 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-97/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000dd0 | 201.678 | 0.000 | n/a | 0.000 | 0.000 | 0.570 | 200.968 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-68/journal/page | none observed |

## P3 / L256 / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.313 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 200.573 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 |
| p99 | 205.927 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.721 | 203.565 | 4.480 | n/a | 0.087 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ce45bfd9d9e0c880000000000000e00 | 212.112 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 211.161 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-84/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e0b | 209.254 | 0.000 | n/a | 0.000 | 0.000 | 8.597 | 200.527 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-124/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e31 | 205.927 | 0.000 | n/a | 0.000 | 0.000 | 2.886 | 198.456 | 4.480 | n/a | 0.016 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e6f | 204.974 | 0.000 | n/a | 0.000 | 0.000 | 4.145 | 200.643 | 0.004 | n/a | 0.056 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-117/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e40 | 204.884 | 0.000 | n/a | 0.000 | 0.000 | 4.050 | 200.697 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e2e | 204.779 | 0.000 | n/a | 0.000 | 0.000 | 4.079 | 200.522 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-96/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e32 | 204.652 | 0.000 | n/a | 0.000 | 0.000 | 3.823 | 200.639 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-112/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e52 | 204.522 | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 203.659 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-110/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000df3 | 204.487 | 0.000 | n/a | 0.000 | 0.000 | 3.540 | 200.792 | 0.016 | n/a | 0.050 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-69/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000ebc | 204.474 | 0.000 | n/a | 0.000 | 0.000 | 3.825 | 200.513 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-129/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000dea | 204.269 | 0.000 | n/a | 0.000 | 0.000 | 3.547 | 200.591 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-77/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000de8 | 204.235 | 0.000 | n/a | 0.000 | 0.000 | 0.545 | 203.565 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-87/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e02 | 203.795 | 0.000 | n/a | 0.000 | 0.000 | 2.935 | 200.696 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-110/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e58 | 203.695 | 0.000 | n/a | 0.000 | 0.000 | 2.869 | 200.655 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-118/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e9a | 203.680 | 0.000 | n/a | 0.000 | 0.000 | 2.810 | 200.678 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-137/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e71 | 203.606 | 0.000 | n/a | 0.000 | 0.000 | 2.866 | 200.604 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-90/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000eca | 203.373 | 0.000 | n/a | 0.000 | 0.000 | 2.302 | 200.875 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-97/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000de7 | 203.161 | 0.000 | n/a | 0.000 | 0.000 | 2.279 | 200.740 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-116/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000e24 | 202.822 | 0.000 | n/a | 0.000 | 0.000 | 1.840 | 200.826 | 0.014 | n/a | 0.054 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-106/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000ecd | 202.797 | 0.000 | n/a | 0.000 | 0.000 | 1.832 | 200.821 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-99/journal/page | none observed |

## P3 / L1024 / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.260 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.567 | 200.573 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 204.805 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.901 | 204.009 | 3.524 | n/a | 0.067 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ce45bfd9d9e0c880000000000000ef5 | 207.872 | 0.000 | n/a | 0.000 | 0.000 | 1.363 | 206.229 | 0.011 | n/a | 0.045 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-77/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000fb9 | 206.102 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 205.389 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-83/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f7a | 204.805 | 0.000 | n/a | 0.000 | 0.000 | 3.086 | 201.545 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-101/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f4f | 204.694 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 204.009 | 0.017 | n/a | 0.054 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-103/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f99 | 204.597 | 0.000 | n/a | 0.000 | 0.000 | 0.923 | 203.500 | 0.004 | n/a | 0.063 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-132/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000fa5 | 204.249 | 0.000 | n/a | 0.000 | 0.000 | 3.292 | 200.767 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-138/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f72 | 204.223 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 203.550 | 0.003 | n/a | 0.043 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-140/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f89 | 204.200 | 0.000 | n/a | 0.000 | 0.000 | 3.283 | 200.766 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-119/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f10 | 204.174 | 0.000 | n/a | 0.000 | 0.000 | 1.199 | 202.862 | 0.003 | n/a | 0.036 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-91/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f4b | 204.141 | 0.000 | n/a | 0.000 | 0.000 | 3.564 | 200.410 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-88/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000fe0 | 203.942 | 0.000 | n/a | 0.000 | 0.000 | 0.486 | 203.308 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-136/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f0d | 203.738 | 0.000 | n/a | 0.000 | 0.000 | 0.480 | 203.135 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-100/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f5d | 203.705 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 202.900 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-63/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000fb5 | 203.692 | 0.000 | n/a | 0.000 | 0.000 | 1.358 | 202.182 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-115/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000ef3 | 203.560 | 0.000 | n/a | 0.000 | 0.000 | 2.685 | 200.734 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-135/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f59 | 203.560 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 202.810 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-105/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f66 | 203.532 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 202.813 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-79/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f24 | 203.401 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 202.375 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-125/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f45 | 203.326 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 202.648 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-133/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000f43 | 203.188 | 0.000 | n/a | 0.000 | 0.000 | 2.286 | 200.720 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-101/journal/page | none observed |

## P3 / tail / read (838 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.121 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 200.490 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 202.978 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.367 | 201.506 | 1.262 | n/a | 0.100 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3ce45bfd9d9e0c8800000000000011a8 | 206.033 | 0.000 | n/a | 0.000 | 0.000 | 5.345 | 200.487 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-72/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000010d5 | 205.221 | 0.000 | n/a | 0.000 | 0.000 | 0.472 | 204.577 | 0.018 | n/a | 0.060 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-99/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000012d0 | 204.126 | 0.000 | n/a | 0.000 | 0.000 | 3.776 | 199.660 | 0.600 | n/a | 0.015 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-135/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000122f | 203.979 | 0.000 | n/a | 0.000 | 0.000 | 3.416 | 200.386 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-117/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000012d1 | 203.884 | 0.000 | n/a | 0.000 | 0.000 | 2.718 | 201.025 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-80/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000011d5 | 203.828 | 0.000 | n/a | 0.000 | 0.000 | 1.204 | 202.391 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-137/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000012ce | 203.497 | 0.000 | n/a | 0.000 | 0.000 | 0.420 | 202.920 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-137/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000000fef | 203.324 | 0.000 | n/a | 0.000 | 0.000 | 2.367 | 200.727 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-88/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000001151 | 202.978 | 0.000 | n/a | 0.000 | 0.000 | 2.286 | 200.542 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-95/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000010d6 | 202.924 | 0.000 | n/a | 0.000 | 0.000 | 0.478 | 202.210 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-134/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000001186 | 202.819 | 0.000 | n/a | 0.000 | 0.000 | 1.839 | 200.771 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-76/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000001020 | 202.808 | 0.000 | n/a | 0.000 | 0.000 | 0.443 | 202.203 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-84/journal/page | none observed |
| 3ce45bfd9d9e0c88000000000000122b | 202.801 | 0.000 | n/a | 0.000 | 0.000 | 2.111 | 200.495 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-105/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000011e0 | 202.795 | 0.000 | n/a | 0.000 | 0.000 | 1.345 | 201.053 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.310 | 0.000 | 0.000 | 0.310 | gw-r/thread-71/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000012db | 202.760 | 0.000 | n/a | 0.000 | 0.000 | 1.891 | 200.720 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-114/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000001200 | 202.748 | 0.000 | n/a | 0.000 | 0.000 | 2.273 | 200.356 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-73/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000011bd | 202.701 | 0.000 | n/a | 0.000 | 0.000 | 1.621 | 200.875 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-115/journal/page | none observed |
| 3ce45bfd9d9e0c8800000000000011c8 | 202.662 | 0.000 | n/a | 0.000 | 0.000 | 2.008 | 200.517 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-130/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000001280 | 202.640 | 0.000 | n/a | 0.000 | 0.000 | 1.240 | 201.116 | 0.024 | n/a | 0.115 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-106/journal/page | none observed |
| 3ce45bfd9d9e0c880000000000001377 | 202.514 | 0.000 | n/a | 0.000 | 0.000 | 1.866 | 200.539 | 0.003 | n/a | 0.036 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | gw-r/thread-103/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3707 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/5.140 ms; post-ACK p50/p99: 0.434/2.161 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.550 | 10.957 | 10.629 | reported |
| All-primary p99 ms | 48.611 | 48.062 | 47.408 | <=50 |
| L256 5-10 p50Ms | 10.111 | 9.471 | 9.471 | <=10 |
| L256 5-10 p99Ms | 40.395 | 39.187 | 39.186 | <=50 |
| L256 11-25 p50Ms | 12.735 | 11.775 | 11.775 | <=10 |
| L256 11-25 p99Ms | 20.322 | 18.485 | 18.485 | <=50 |
| L256 26-50 p50Ms | 14.399 | 12.479 | 12.479 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 19.234 | 17.193 | 17.193 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 10.111 | 9.727 | 9.279 | <=10 |
| Burst 11-25 p50 ms | 12.223 | 11.455 | 11.199 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 40.395 | 39.187 | 39.186 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 55.672 | 52.449 | 52.447 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 64.533/64.533 | 60.454 | 41.370 | 101.654 | 0.809/0.117 |
| 5-10 | 250-1000 | 139 | 11.665/59.096 | 11.072 | 6.289 | 15.540 | 0.073/0.021 |
| 11-25 | 100-250 | 31 | 14.140/29.041 | 13.204 | 7.565 | 15.845 | 0.083/0.023 |
| 26-50 | 0-50 | 190 | 14.511/35.169 | 13.400 | 7.477 | 18.681 | 0.064/0.020 |
| 11-25 | 250-1000 | 69 | 13.728/201.305 | 12.396 | 6.752 | 15.737 | 0.079/0.022 |
| 5-10 | 100-250 | 68 | 10.193/93.750 | 9.806 | 5.450 | 13.536 | 0.063/0.020 |
| 26-50 | 250-1000 | 28 | 16.326/86.287 | 15.357 | 9.755 | 23.460 | 0.087/0.027 |
| 5-10 | overlap | 886 | 11.294/47.780 | 10.931 | 6.742 | 15.291 | 0.036/0.017 |
| 11-25 | 50-100 | 51 | 11.880/33.515 | 11.130 | 6.306 | 15.206 | 0.057/0.020 |
| 11-25 | 0-50 | 503 | 10.681/40.385 | 10.016 | 5.417 | 13.693 | 0.050/0.019 |
| 5-10 | 0-50 | 1065 | 8.628/29.946 | 8.250 | 4.499 | 11.345 | 0.044/0.018 |
| 5-10 | 50-100 | 74 | 9.149/38.622 | 8.761 | 4.953 | 12.675 | 0.053/0.019 |
| 26-50 | 100-250 | 8 | 15.992/23.632 | 14.728 | 6.304 | 18.736 | 0.077/0.021 |
| 26-50 | overlap | 160 | 18.008/49.475 | 16.948 | 10.014 | 23.942 | 0.052/0.020 |
| 11-25 | overlap | 422 | 12.944/46.755 | 12.306 | 7.424 | 17.514 | 0.042/0.019 |
| 26-50 | 50-100 | 12 | 14.093/20.013 | 12.637 | 6.542 | 17.418 | 0.083/0.018 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1834 | 23 | 1604.487 |
| burst | 1873 | 10 | 630.316 |

## Writer heap, GC and scheduler stalls

Source 0d95e5721572bbafaa54630aa6265d188d8e3d26; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 497.814 / 553.909 |
| GC events / total duration / maximum ms | 924 / 2631.467 / 49.421 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":910,"4":7,"8":7} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 48.611 / 33 / 2234.803 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (81.292 ms, trace `ac4e91c3c91acb5c000000000000006d`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (83.462 ms, trace `ac4e91c3c91acb5c00000000000000b1`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (77.530 ms, trace `ac4e91c3c91acb5c0000000000000180`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (72.224 ms, trace `ac4e91c3c91acb5c00000000000000ef`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (69.563 ms, trace `ac4e91c3c91acb5c0000000000000133`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p11-replay-smoke-i`; source `f9a84dcb52993e2ceff0210533d12e885ceb6d0d`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3511/3512 (99.972%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3512/3512. Raw trace bytes: 22067407.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 234 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13371.210 | 282.376 | 5.530 | 280 |
| L1 | 0 | 16457.149 | 309.171 | 8.064 | 422 |
| L4 | 0 | 18596.910 | 338.989 | 15.058 | 382 |
| L16 | 0 | 19063.953 | 307.885 | 13.088 | 442 |
| L64 | 0 | 18842.729 | 381.835 | 9.042 | 604 |
| L256 | 0 | 17025.403 | 279.253 | 8.752 | 462 |
| L1024 | 0 | 18985.667 | 3925.703 | 32.246 | 16528 |
| tail | 0 | 64682.129 | 11907.006 | 112.087 | 52110 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| ac4e91c3c91acb5c000000000000006d | driver.queue.scheduler-dispatch | 0.085 | none | 0 / 32 |
| ac4e91c3c91acb5c000000000000006d | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace ac4e91c3c91acb5c000000000000006d waited: []

| ac4e91c3c91acb5c00000000000000b1 | driver.queue.scheduler-dispatch | 0.034 | none | 0 / 32 |
| ac4e91c3c91acb5c00000000000000b1 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace ac4e91c3c91acb5c00000000000000b1 waited: []

| ac4e91c3c91acb5c0000000000000180 | driver.queue.scheduler-late | 1.220 | none | 0 / 32 |
| ac4e91c3c91acb5c0000000000000180 | driver.queue.scheduler-dispatch | 0.089 | none | 0 / 32 |

Observed active steps while trace ac4e91c3c91acb5c0000000000000180 waited: []

| ac4e91c3c91acb5c00000000000000ef | driver.queue.scheduler-dispatch | 0.113 | none | 0 / 32 |
| ac4e91c3c91acb5c00000000000000ef | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace ac4e91c3c91acb5c00000000000000ef waited: []

| ac4e91c3c91acb5c0000000000000133 | driver.queue.scheduler-dispatch | 0.081 | none | 0 / 32 |
| ac4e91c3c91acb5c0000000000000133 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace ac4e91c3c91acb5c0000000000000133 waited: []

## P2 / warmup / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.056 | 0.991 | 0.000 | 0.966 | 2.747 | n/a | 0.000 | 0.089 | 1.026 | 2.344 | 0.029 | 0.000 | 0.484 | 10.867 | 1.290 | n/a | 0.036 | 3.320 | 0.147 | 0.036 |
| p99 | 50.053 | 2.922 | 0.000 | 2.077 | 9.333 | n/a | 1.553 | 0.402 | 2.410 | 7.619 | 0.084 | 0.000 | 6.713 | 22.202 | 4.847 | n/a | 0.157 | 9.607 | 0.249 | 0.157 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c0000000000000036 | 50.053 | 9.333 | n/a | 0.000 | 0.274 | 1.886 | 6.859 | 0.023 | 0.000 | 6.713 | 22.202 | 2.610 | n/a | 0.152 | 9.607 | 0.192 | 0.152 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000053 | 34.440 | 4.001 | n/a | 0.000 | 0.104 | 1.190 | 7.619 | 0.084 | 0.000 | 0.240 | 16.324 | 4.847 | n/a | 0.029 | 4.105 | 0.119 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000043 | 27.874 | 5.998 | n/a | 0.000 | 0.133 | 1.585 | 2.022 | 0.022 | 0.000 | 0.616 | 15.528 | 1.923 | n/a | 0.046 | 6.132 | 0.220 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| ac4e91c3c91acb5c000000000000003d | 26.571 | 2.478 | n/a | 0.000 | 0.076 | 2.410 | 2.711 | 0.028 | 0.000 | 0.975 | 16.530 | 1.290 | n/a | 0.073 | 2.554 | 0.096 | 0.073 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| ac4e91c3c91acb5c0000000000000047 | 24.651 | 3.909 | n/a | 0.000 | 0.089 | 1.026 | 2.094 | 0.030 | 0.000 | 0.180 | 14.872 | 2.420 | n/a | 0.030 | 3.998 | 0.162 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000003a | 21.461 | 2.747 | n/a | 0.000 | 0.062 | 1.355 | 5.488 | 0.053 | 0.000 | 0.488 | 8.050 | 3.192 | n/a | 0.026 | 2.809 | 0.131 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| ac4e91c3c91acb5c0000000000000050 | 20.695 | 3.975 | n/a | 0.000 | 0.402 | 0.965 | 7.061 | 0.029 | 0.000 | 0.191 | 7.537 | 0.483 | n/a | 0.054 | 4.377 | 0.211 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000059 | 20.056 | 3.289 | n/a | 1.553 | 0.144 | 0.904 | 1.867 | 0.034 | 0.000 | 0.707 | 9.371 | 2.146 | n/a | 0.042 | 4.985 | 0.249 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000005e | 19.396 | 1.928 | n/a | 0.438 | 0.046 | 0.740 | 2.275 | 0.023 | 0.000 | 0.484 | 12.971 | 0.474 | n/a | 0.017 | 2.412 | 0.124 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000004e | 19.293 | 2.014 | n/a | 0.000 | 0.059 | 1.682 | 3.001 | 0.081 | 0.000 | 0.970 | 10.867 | 0.577 | n/a | 0.043 | 2.073 | 0.107 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000056 | 18.994 | 2.615 | n/a | 1.365 | 0.101 | 0.945 | 6.395 | 0.042 | 0.000 | 0.137 | 6.826 | 0.533 | n/a | 0.036 | 4.081 | 0.215 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000041 | 17.047 | 2.183 | n/a | 0.000 | 0.053 | 0.651 | 1.120 | 0.020 | 0.000 | 0.122 | 11.618 | 1.251 | n/a | 0.028 | 2.236 | 0.131 | 0.028 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000049 | 16.977 | 2.412 | n/a | 0.000 | 0.092 | 0.890 | 1.760 | 0.023 | 0.000 | 0.129 | 10.034 | 1.480 | n/a | 0.157 | 2.503 | 0.147 | 0.157 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000005c | 15.355 | 3.256 | n/a | 0.000 | 0.064 | 2.319 | 2.344 | 0.036 | 0.000 | 0.929 | 5.475 | 0.905 | n/a | 0.026 | 3.320 | 0.216 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.417 | n/a | n/a | n/a | 41.376 | 3.685 | 2.607 | 0.000 | 3.573 | 4.405 | 0.003 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.006 | 59.272 | 0.831 | 0.006 |
| p99 | 281.111 | n/a | n/a | n/a | 98.768 | 216.824 | 13.761 | 0.000 | 115.665 | 43.102 | 34.656 | 23.275 | 5.431 | 0.000 | n/a | n/a | 0.055 | 273.584 | 1.000 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c0000000000001b0c | 281.111 | 52.831 | 216.824 | 3.928 | 0.000 | 0.534 | 6.964 | 0.006 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.007 | 273.584 | 0.973 | 0.007 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.270ms; driver.reader-basis.broadcast 0.533ms; driver.reader-basis.broadcast 0.280ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.122ms |
| ac4e91c3c91acb5c0000000000001b07 | 246.455 | 69.468 | 55.945 | 13.761 | 0.000 | 79.460 | 6.640 | 5.378 | 15.784 | 0.011 | 0.000 | n/a | n/a | 0.008 | 139.174 | 0.565 | 0.008 | node-15/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.270ms; driver.reader-basis.broadcast 0.280ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.122ms; driver.publication.readback 0.121ms |
| ac4e91c3c91acb5c0000000000001b0a | 220.747 | 52.551 | 52.691 | 3.198 | 0.000 | 81.772 | 14.722 | 0.006 | 15.784 | 0.015 | 0.000 | n/a | n/a | 0.006 | 108.441 | 0.491 | 0.006 | node-15/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.270ms; driver.reader-basis.broadcast 0.280ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.122ms; driver.publication.readback 0.121ms |
| ac4e91c3c91acb5c0000000000001862 | 169.915 | 54.033 | 0.295 | 4.630 | 0.000 | 98.487 | 7.106 | 5.354 | 0.000 | 0.002 | 0.000 | n/a | n/a | 0.009 | 58.957 | 0.347 | 0.009 | node-15/thread-3/socket.wait-first-byte | driver.publication.readback 0.348ms; driver.reader-basis.broadcast 0.253ms; driver.reader-basis.broadcast 0.211ms; driver.publication.readback 0.141ms; driver.publication.readback 0.122ms |
| ac4e91c3c91acb5c0000000000001253 | 169.569 | 35.810 | 0.232 | 1.415 | 0.000 | 115.665 | 10.583 | 5.854 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.005 | 37.457 | 0.221 | 0.005 | node-15/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.331ms; driver.publication.readback 0.177ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.138ms; driver.publication.readback 0.108ms |
| ac4e91c3c91acb5c00000000000019e5 | 169.561 | 56.514 | 38.466 | 3.100 | 0.000 | 64.081 | 7.390 | 0.002 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.005 | 98.080 | 0.578 | 0.005 | node-15/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.228ms; driver.reader-basis.broadcast 0.223ms; driver.publication.readback 0.121ms; driver.publication.readback 0.115ms; driver.publication.readback 0.098ms |
| ac4e91c3c91acb5c0000000000001250 | 161.873 | 46.444 | 1.666 | 6.771 | 0.000 | 61.023 | 22.680 | 0.003 | 23.275 | 0.006 | 0.000 | n/a | n/a | 0.005 | 54.881 | 0.339 | 0.005 | node-15/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.331ms; driver.publication.readback 0.177ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.138ms; driver.publication.readback 0.108ms |
| ac4e91c3c91acb5c0000000000001be5 | 160.977 | 57.935 | 60.605 | 5.430 | 0.000 | 26.323 | 10.676 | 0.002 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.004 | 123.970 | 0.770 | 0.004 | node-15/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.591ms; driver.publication.readback 0.121ms; driver.publication.readback 0.106ms; driver.publication.readback 0.057ms; driver.publication.readback 0.047ms |
| ac4e91c3c91acb5c0000000000001549 | 154.136 | 55.697 | 24.321 | 3.334 | 0.000 | 51.040 | 19.727 | 0.005 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.004 | 83.352 | 0.541 | 0.004 | node-15/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.192ms; driver.publication.readback 0.071ms; driver.publication.readback 0.057ms; driver.publication.readback 0.055ms; driver.publication.readback 0.055ms |
| ac4e91c3c91acb5c0000000000000dba | 144.162 | 68.371 | 0.504 | 6.007 | 0.000 | 55.882 | 13.383 | 0.004 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.005 | 74.882 | 0.519 | 0.005 | node-15/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.147ms; driver.publication.readback 0.124ms; driver.publication.readback 0.113ms; driver.publication.readback 0.058ms; driver.publication.readback 0.053ms |
| ac4e91c3c91acb5c000000000000154b | 142.178 | 98.768 | 17.961 | 7.150 | 0.000 | 3.189 | 1.701 | 7.976 | 0.000 | 5.431 | 0.000 | n/a | n/a | 0.003 | 123.878 | 0.871 | 0.003 | node-15/thread-3/client.reach | driver.reader-basis.broadcast 0.192ms; driver.publication.readback 0.055ms; driver.publication.readback 0.055ms; driver.publication.readback 0.054ms; driver.publication.readback 0.052ms |
| ac4e91c3c91acb5c000000000000125e | 142.106 | 22.413 | 90.031 | 1.489 | 0.000 | 17.497 | 6.773 | 3.877 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.007 | 113.933 | 0.802 | 0.007 | node-15/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.138ms; driver.publication.readback 0.137ms; driver.publication.readback 0.108ms; driver.publication.readback 0.107ms |
| ac4e91c3c91acb5c0000000000000dbe | 132.309 | 93.771 | 1.852 | 8.554 | 0.000 | 19.209 | 8.906 | 0.002 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.010 | 104.177 | 0.787 | 0.010 | node-15/thread-3/client.reach | driver.reader-basis.broadcast 0.147ms; driver.publication.readback 0.124ms; driver.publication.readback 0.113ms; driver.publication.readback 0.058ms; driver.publication.readback 0.052ms |
| ac4e91c3c91acb5c00000000000019d9 | 131.896 | 36.893 | 0.308 | 1.609 | 0.000 | 53.182 | 15.214 | 24.679 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.006 | 38.811 | 0.294 | 0.006 | node-15/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.115ms; driver.publication.readback 0.061ms; driver.publication.readback 0.060ms; driver.publication.readback 0.054ms |
| ac4e91c3c91acb5c00000000000009fb | 130.285 | 44.277 | 19.984 | 1.507 | 0.000 | 61.005 | 3.469 | 0.008 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.012 | 65.769 | 0.505 | 0.012 | node-15/thread-3/socket.wait-first-byte | client.encode 1.121ms; driver.publication.readback 0.108ms; driver.reader-basis.broadcast 0.105ms; driver.publication.persist-deferred 0.103ms; driver.publication.readback 0.097ms |
| ac4e91c3c91acb5c00000000000016f4 | 129.021 | 51.402 | 0.165 | 3.565 | 0.000 | 63.970 | 9.276 | 0.631 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.005 | 55.132 | 0.427 | 0.005 | node-15/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.499ms; driver.publication.readback 0.200ms; driver.publication.readback 0.120ms; driver.publication.readback 0.118ms; driver.publication.readback 0.117ms |
| ac4e91c3c91acb5c00000000000019e0 | 128.349 | 53.235 | 23.979 | 7.510 | 0.000 | 30.681 | 12.920 | 0.004 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.006 | 84.725 | 0.660 | 0.006 | node-15/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.115ms; driver.publication.readback 0.060ms; driver.publication.readback 0.048ms; driver.publication.readback 0.048ms |
| ac4e91c3c91acb5c0000000000001b09 | 125.617 | 15.458 | 55.503 | 0.000 | 0.000 | 45.089 | 5.596 | 3.959 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.005 | 70.961 | 0.565 | 0.005 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.270ms; driver.reader-basis.broadcast 0.280ms; driver.publication.readback 0.122ms; driver.publication.readback 0.121ms; driver.publication.readback 0.090ms |
| ac4e91c3c91acb5c0000000000001b08 | 123.845 | 34.485 | 59.664 | 4.664 | 0.000 | 19.651 | 1.244 | 4.128 | 0.000 | 0.002 | 0.000 | n/a | n/a | 0.006 | 98.813 | 0.798 | 0.006 | node-15/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.270ms; driver.reader-basis.broadcast 0.280ms; driver.publication.readback 0.122ms; driver.publication.readback 0.121ms; driver.publication.readback 0.090ms |
| ac4e91c3c91acb5c00000000000019e4 | 123.255 | 28.978 | 40.641 | 1.575 | 0.000 | 49.839 | 2.192 | 0.019 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.005 | 71.193 | 0.578 | 0.005 | node-15/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.228ms; driver.reader-basis.broadcast 0.223ms; driver.publication.readback 0.115ms; driver.publication.readback 0.098ms; driver.publication.readback 0.083ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.396 | 0.991 | 0.000 | 0.899 | 2.615 | n/a | 0.000 | 0.064 | 0.965 | 2.711 | 0.034 | 0.000 | 0.488 | 9.371 | 0.905 | n/a | 0.036 | 2.809 | 0.131 | 0.036 |
| p99 | 26.571 | 1.803 | 0.000 | 1.241 | 3.975 | n/a | 1.553 | 0.402 | 2.410 | 7.061 | 0.081 | 0.000 | 0.975 | 16.530 | 3.192 | n/a | 0.073 | 4.985 | 0.249 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c000000000000003d | 26.571 | 2.478 | n/a | 0.000 | 0.076 | 2.410 | 2.711 | 0.028 | 0.000 | 0.975 | 16.530 | 1.290 | n/a | 0.073 | 2.554 | 0.096 | 0.073 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| ac4e91c3c91acb5c000000000000003a | 21.461 | 2.747 | n/a | 0.000 | 0.062 | 1.355 | 5.488 | 0.053 | 0.000 | 0.488 | 8.050 | 3.192 | n/a | 0.026 | 2.809 | 0.131 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| ac4e91c3c91acb5c0000000000000050 | 20.695 | 3.975 | n/a | 0.000 | 0.402 | 0.965 | 7.061 | 0.029 | 0.000 | 0.191 | 7.537 | 0.483 | n/a | 0.054 | 4.377 | 0.211 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000059 | 20.056 | 3.289 | n/a | 1.553 | 0.144 | 0.904 | 1.867 | 0.034 | 0.000 | 0.707 | 9.371 | 2.146 | n/a | 0.042 | 4.985 | 0.249 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000005e | 19.396 | 1.928 | n/a | 0.438 | 0.046 | 0.740 | 2.275 | 0.023 | 0.000 | 0.484 | 12.971 | 0.474 | n/a | 0.017 | 2.412 | 0.124 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000004e | 19.293 | 2.014 | n/a | 0.000 | 0.059 | 1.682 | 3.001 | 0.081 | 0.000 | 0.970 | 10.867 | 0.577 | n/a | 0.043 | 2.073 | 0.107 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000056 | 18.994 | 2.615 | n/a | 1.365 | 0.101 | 0.945 | 6.395 | 0.042 | 0.000 | 0.137 | 6.826 | 0.533 | n/a | 0.036 | 4.081 | 0.215 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000041 | 17.047 | 2.183 | n/a | 0.000 | 0.053 | 0.651 | 1.120 | 0.020 | 0.000 | 0.122 | 11.618 | 1.251 | n/a | 0.028 | 2.236 | 0.131 | 0.028 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000005c | 15.355 | 3.256 | n/a | 0.000 | 0.064 | 2.319 | 2.344 | 0.036 | 0.000 | 0.929 | 5.475 | 0.905 | n/a | 0.026 | 3.320 | 0.216 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.134 | 0.972 | 0.000 | 0.753 | 3.471 | n/a | 0.000 | 0.070 | 1.444 | 4.232 | 0.048 | 0.000 | 0.604 | 10.851 | 2.769 | n/a | 0.025 | 4.159 | 0.147 | 0.025 |
| p99 | 144.226 | 3.283 | 0.012 | 3.787 | 9.938 | n/a | 1.364 | 23.527 | 13.177 | 14.048 | 3.586 | 0.000 | 4.591 | 81.292 | 39.574 | n/a | 0.087 | 26.094 | 0.556 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c000000000000006d | 144.226 | 5.681 | n/a | 1.153 | 0.086 | 1.820 | 14.048 | 0.041 | 0.000 | 0.500 | 81.292 | 39.574 | n/a | 0.032 | 6.919 | 0.048 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| ac4e91c3c91acb5c000000000000009f | 46.906 | 2.568 | n/a | 0.000 | 23.527 | 0.996 | 4.966 | 0.020 | 0.000 | 3.316 | 10.217 | 1.279 | n/a | 0.019 | 26.094 | 0.556 | 0.019 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.668ms; driver.publication.readback 0.104ms; driver.reader-basis.broadcast 0.051ms; driver.publication.persist-deferred 0.026ms |
| ac4e91c3c91acb5c000000000000007d | 45.805 | 7.217 | n/a | 1.364 | 0.187 | 1.418 | 3.292 | 3.586 | 0.000 | 0.203 | 21.756 | 6.757 | n/a | 0.025 | 8.767 | 0.191 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000091 | 44.803 | 4.270 | n/a | 0.000 | 0.062 | 1.659 | 5.442 | 0.058 | 0.000 | 0.284 | 24.371 | 8.631 | n/a | 0.025 | 4.332 | 0.097 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000009e | 42.571 | 9.938 | n/a | 0.000 | 0.092 | 2.086 | 8.883 | 0.118 | 0.000 | 1.719 | 14.531 | 5.161 | n/a | 0.042 | 10.030 | 0.236 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000077 | 40.673 | 2.044 | n/a | 0.000 | 0.048 | 0.993 | 4.232 | 0.096 | 0.000 | 1.480 | 21.963 | 9.799 | n/a | 0.019 | 2.092 | 0.051 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000007a | 36.715 | 2.792 | n/a | 0.601 | 0.069 | 1.119 | 2.357 | 0.028 | 0.000 | 0.156 | 19.726 | 9.838 | n/a | 0.028 | 3.462 | 0.094 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000006a | 35.752 | 7.249 | n/a | 0.000 | 0.039 | 13.177 | 7.012 | 0.151 | 0.000 | 4.591 | 3.055 | 0.458 | n/a | 0.019 | 7.289 | 0.204 | 0.019 | node-15/thread-0/socket.wait-first-byte | none observed |
| ac4e91c3c91acb5c0000000000000098 | 32.329 | 4.479 | n/a | 0.000 | 0.220 | 7.248 | 3.598 | 0.063 | 0.000 | 3.849 | 10.825 | 1.960 | n/a | 0.087 | 4.699 | 0.145 | 0.087 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000065 | 31.426 | 3.320 | n/a | 0.000 | 0.237 | 0.993 | 2.393 | 0.025 | 0.000 | 0.238 | 23.474 | 0.728 | n/a | 0.019 | 3.557 | 0.113 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000073 | 30.134 | 3.465 | n/a | 0.703 | 0.095 | 1.792 | 4.739 | 0.076 | 0.000 | 1.345 | 10.896 | 6.988 | n/a | 0.036 | 4.262 | 0.141 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000086 | 27.880 | 5.406 | n/a | 0.000 | 0.124 | 1.444 | 5.209 | 0.048 | 0.000 | 0.156 | 13.129 | 2.317 | n/a | 0.048 | 5.530 | 0.198 | 0.048 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000067 | 27.564 | 2.563 | n/a | 0.000 | 0.059 | 0.789 | 2.117 | 0.024 | 0.000 | 0.158 | 16.709 | 5.122 | n/a | 0.024 | 2.622 | 0.095 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000008b | 26.622 | 3.875 | n/a | 0.000 | 0.034 | 3.299 | 5.919 | 0.030 | 0.000 | 0.240 | 7.505 | 5.705 | n/a | 0.015 | 3.910 | 0.147 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.127ms; driver.publication.persist-deferred 0.037ms |
| ac4e91c3c91acb5c0000000000000094 | 23.930 | 3.471 | n/a | 0.581 | 0.065 | 1.699 | 6.571 | 0.022 | 0.000 | 0.604 | 8.595 | 2.293 | n/a | 0.029 | 4.118 | 0.172 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000081 | 22.568 | 5.387 | n/a | 0.000 | 0.049 | 1.403 | 2.986 | 0.062 | 0.000 | 2.053 | 9.645 | 0.962 | n/a | 0.020 | 5.436 | 0.241 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000008a | 22.338 | 2.189 | n/a | 0.000 | 0.055 | 1.458 | 4.897 | 0.050 | 0.000 | 3.335 | 9.030 | 1.301 | n/a | 0.023 | 2.244 | 0.100 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| ac4e91c3c91acb5c000000000000009c | 20.639 | 2.673 | n/a | 0.000 | 0.070 | 0.993 | 2.244 | 0.023 | 0.000 | 0.805 | 10.154 | 3.648 | n/a | 0.030 | 2.743 | 0.133 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| ac4e91c3c91acb5c0000000000000088 | 19.115 | 3.700 | n/a | 0.000 | 0.460 | 0.870 | 2.167 | 0.022 | 0.000 | 0.116 | 10.851 | 0.899 | n/a | 0.031 | 4.159 | 0.218 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000083 | 18.110 | 2.849 | n/a | 0.000 | 0.067 | 0.797 | 2.040 | 0.101 | 0.000 | 0.757 | 10.540 | 0.937 | n/a | 0.024 | 2.916 | 0.161 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.564 | 0.208 | 0.000 | 0.644 | 2.563 | n/a | 0.000 | 0.055 | 1.403 | 3.598 | 0.050 | 0.000 | 2.053 | 9.645 | 1.301 | n/a | 0.020 | 2.622 | 0.145 | 0.020 |
| p99 | 46.906 | 1.001 | 0.000 | 3.787 | 7.249 | n/a | 0.000 | 23.527 | 13.177 | 7.012 | 0.151 | 0.000 | 4.591 | 21.963 | 9.799 | n/a | 0.087 | 26.094 | 0.556 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c000000000000009f | 46.906 | 2.568 | n/a | 0.000 | 23.527 | 0.996 | 4.966 | 0.020 | 0.000 | 3.316 | 10.217 | 1.279 | n/a | 0.019 | 26.094 | 0.556 | 0.019 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.668ms; driver.publication.readback 0.104ms; driver.reader-basis.broadcast 0.051ms; driver.publication.persist-deferred 0.026ms |
| ac4e91c3c91acb5c0000000000000077 | 40.673 | 2.044 | n/a | 0.000 | 0.048 | 0.993 | 4.232 | 0.096 | 0.000 | 1.480 | 21.963 | 9.799 | n/a | 0.019 | 2.092 | 0.051 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000006a | 35.752 | 7.249 | n/a | 0.000 | 0.039 | 13.177 | 7.012 | 0.151 | 0.000 | 4.591 | 3.055 | 0.458 | n/a | 0.019 | 7.289 | 0.204 | 0.019 | node-15/thread-0/socket.wait-first-byte | none observed |
| ac4e91c3c91acb5c0000000000000098 | 32.329 | 4.479 | n/a | 0.000 | 0.220 | 7.248 | 3.598 | 0.063 | 0.000 | 3.849 | 10.825 | 1.960 | n/a | 0.087 | 4.699 | 0.145 | 0.087 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000067 | 27.564 | 2.563 | n/a | 0.000 | 0.059 | 0.789 | 2.117 | 0.024 | 0.000 | 0.158 | 16.709 | 5.122 | n/a | 0.024 | 2.622 | 0.095 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000081 | 22.568 | 5.387 | n/a | 0.000 | 0.049 | 1.403 | 2.986 | 0.062 | 0.000 | 2.053 | 9.645 | 0.962 | n/a | 0.020 | 5.436 | 0.241 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000008a | 22.338 | 2.189 | n/a | 0.000 | 0.055 | 1.458 | 4.897 | 0.050 | 0.000 | 3.335 | 9.030 | 1.301 | n/a | 0.023 | 2.244 | 0.100 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| ac4e91c3c91acb5c000000000000008e | 13.868 | 1.677 | n/a | 0.000 | 0.612 | 1.520 | 1.575 | 0.021 | 0.000 | 0.155 | 5.520 | 2.769 | n/a | 0.020 | 2.289 | 0.165 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (19 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.785 | 0.985 | 0.000 | 0.668 | 2.873 | n/a | 0.000 | 0.086 | 1.254 | 2.440 | 0.031 | 0.000 | 0.514 | 11.932 | 6.655 | n/a | 0.034 | 2.947 | 0.141 | 0.034 |
| p99 | 121.543 | 2.943 | 0.000 | 2.759 | 8.889 | n/a | 0.000 | 0.192 | 5.815 | 12.911 | 4.688 | 0.000 | 3.761 | 83.462 | 24.061 | n/a | 0.085 | 8.984 | 0.261 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c00000000000000b1 | 121.543 | 1.844 | n/a | 0.000 | 0.035 | 0.849 | 12.911 | 0.043 | 0.000 | 0.514 | 83.462 | 21.866 | n/a | 0.020 | 1.879 | 0.015 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| ac4e91c3c91acb5c00000000000000d5 | 47.594 | 2.873 | n/a | 0.000 | 0.074 | 1.345 | 5.047 | 0.076 | 0.000 | 0.319 | 13.777 | 24.061 | n/a | 0.023 | 2.947 | 0.062 | 0.023 | tx/thread-82/transactor.triplex-function | driver.reader-basis.broadcast 0.076ms |
| ac4e91c3c91acb5c00000000000000ad | 45.029 | 2.876 | n/a | 0.000 | 0.081 | 0.995 | 4.500 | 0.044 | 0.000 | 0.729 | 26.881 | 8.895 | n/a | 0.027 | 2.958 | 0.066 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000b6 | 44.074 | 4.404 | n/a | 0.000 | 0.192 | 5.815 | 3.854 | 4.688 | 0.000 | 0.308 | 16.055 | 8.674 | n/a | 0.085 | 4.596 | 0.104 | 0.085 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| ac4e91c3c91acb5c00000000000000d1 | 37.571 | 8.889 | n/a | 0.000 | 0.095 | 1.280 | 4.191 | 0.076 | 0.000 | 3.761 | 12.589 | 6.655 | n/a | 0.036 | 8.984 | 0.239 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| ac4e91c3c91acb5c00000000000000c8 | 35.666 | 6.347 | n/a | 0.000 | 0.177 | 1.604 | 6.751 | 0.027 | 0.000 | 1.224 | 11.932 | 7.541 | n/a | 0.062 | 6.524 | 0.183 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000c0 | 32.550 | 3.730 | n/a | 0.000 | 0.088 | 2.157 | 2.356 | 0.024 | 0.000 | 0.246 | 15.113 | 8.791 | n/a | 0.045 | 3.818 | 0.117 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| ac4e91c3c91acb5c00000000000000db | 28.885 | 4.560 | n/a | 0.000 | 0.124 | 1.312 | 1.810 | 0.021 | 0.000 | 0.115 | 15.609 | 5.282 | n/a | 0.052 | 4.684 | 0.162 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000a8 | 28.846 | 2.034 | n/a | 0.000 | 0.053 | 3.710 | 1.588 | 0.021 | 0.000 | 0.206 | 19.484 | 1.725 | n/a | 0.026 | 2.087 | 0.072 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000dd | 28.785 | 2.147 | n/a | 0.000 | 0.069 | 1.091 | 1.978 | 0.033 | 0.000 | 0.921 | 15.083 | 7.429 | n/a | 0.034 | 2.217 | 0.077 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| ac4e91c3c91acb5c00000000000000a4 | 28.242 | 4.349 | n/a | 0.000 | 0.165 | 1.461 | 2.079 | 0.025 | 0.000 | 0.554 | 11.013 | 8.529 | n/a | 0.067 | 4.513 | 0.160 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000af | 22.439 | 3.666 | n/a | 0.000 | 0.108 | 1.029 | 1.921 | 0.025 | 0.000 | 1.456 | 7.122 | 7.073 | n/a | 0.040 | 3.774 | 0.168 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000cd | 20.105 | 2.030 | n/a | 0.000 | 0.060 | 1.203 | 2.599 | 0.058 | 0.000 | 2.145 | 8.155 | 3.827 | n/a | 0.029 | 2.089 | 0.104 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000bb | 19.395 | 4.929 | n/a | 0.000 | 0.132 | 0.915 | 2.498 | 0.024 | 0.000 | 0.898 | 7.082 | 2.865 | n/a | 0.052 | 5.062 | 0.261 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000d7 | 18.845 | 2.565 | n/a | 0.000 | 0.094 | 1.271 | 3.188 | 0.033 | 0.000 | 0.248 | 8.413 | 2.996 | n/a | 0.037 | 2.658 | 0.141 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000e0 | 13.732 | 1.784 | n/a | 0.000 | 0.073 | 0.926 | 1.729 | 0.022 | 0.000 | 0.152 | 7.365 | 1.656 | n/a | 0.024 | 1.857 | 0.135 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000b8 | 13.315 | 2.070 | n/a | 0.000 | 0.063 | 1.254 | 2.440 | 0.039 | 0.000 | 0.625 | 5.953 | 0.848 | n/a | 0.024 | 2.133 | 0.160 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.105ms |
| ac4e91c3c91acb5c00000000000000c5 | 13.230 | 2.337 | n/a | 0.000 | 0.084 | 1.169 | 1.889 | 0.031 | 0.000 | 0.204 | 6.563 | 0.919 | n/a | 0.034 | 2.421 | 0.183 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000ca | 12.502 | 2.646 | n/a | 0.000 | 0.086 | 0.784 | 2.264 | 0.023 | 0.000 | 0.137 | 5.702 | 0.825 | n/a | 0.033 | 2.733 | 0.219 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.105 | 0.832 | 0.000 | 0.489 | 2.070 | n/a | 0.000 | 0.069 | 1.203 | 2.079 | 0.033 | 0.000 | 0.308 | 8.413 | 2.996 | n/a | 0.029 | 2.133 | 0.104 | 0.029 |
| p99 | 121.543 | 1.585 | 0.000 | 0.946 | 4.404 | n/a | 0.000 | 0.192 | 5.815 | 12.911 | 4.688 | 0.000 | 2.145 | 83.462 | 21.866 | n/a | 0.085 | 4.596 | 0.183 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c00000000000000b1 | 121.543 | 1.844 | n/a | 0.000 | 0.035 | 0.849 | 12.911 | 0.043 | 0.000 | 0.514 | 83.462 | 21.866 | n/a | 0.020 | 1.879 | 0.015 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| ac4e91c3c91acb5c00000000000000b6 | 44.074 | 4.404 | n/a | 0.000 | 0.192 | 5.815 | 3.854 | 4.688 | 0.000 | 0.308 | 16.055 | 8.674 | n/a | 0.085 | 4.596 | 0.104 | 0.085 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| ac4e91c3c91acb5c00000000000000a8 | 28.846 | 2.034 | n/a | 0.000 | 0.053 | 3.710 | 1.588 | 0.021 | 0.000 | 0.206 | 19.484 | 1.725 | n/a | 0.026 | 2.087 | 0.072 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000dd | 28.785 | 2.147 | n/a | 0.000 | 0.069 | 1.091 | 1.978 | 0.033 | 0.000 | 0.921 | 15.083 | 7.429 | n/a | 0.034 | 2.217 | 0.077 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| ac4e91c3c91acb5c00000000000000a4 | 28.242 | 4.349 | n/a | 0.000 | 0.165 | 1.461 | 2.079 | 0.025 | 0.000 | 0.554 | 11.013 | 8.529 | n/a | 0.067 | 4.513 | 0.160 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000cd | 20.105 | 2.030 | n/a | 0.000 | 0.060 | 1.203 | 2.599 | 0.058 | 0.000 | 2.145 | 8.155 | 3.827 | n/a | 0.029 | 2.089 | 0.104 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000d7 | 18.845 | 2.565 | n/a | 0.000 | 0.094 | 1.271 | 3.188 | 0.033 | 0.000 | 0.248 | 8.413 | 2.996 | n/a | 0.037 | 2.658 | 0.141 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000e0 | 13.732 | 1.784 | n/a | 0.000 | 0.073 | 0.926 | 1.729 | 0.022 | 0.000 | 0.152 | 7.365 | 1.656 | n/a | 0.024 | 1.857 | 0.135 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000b8 | 13.315 | 2.070 | n/a | 0.000 | 0.063 | 1.254 | 2.440 | 0.039 | 0.000 | 0.625 | 5.953 | 0.848 | n/a | 0.024 | 2.133 | 0.160 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.105ms |
| ac4e91c3c91acb5c00000000000000c5 | 13.230 | 2.337 | n/a | 0.000 | 0.084 | 1.169 | 1.889 | 0.031 | 0.000 | 0.204 | 6.563 | 0.919 | n/a | 0.034 | 2.421 | 0.183 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.812 | 0.673 | 0.000 | 0.675 | 2.818 | n/a | 0.000 | 0.070 | 1.367 | 2.550 | 0.027 | 0.000 | 0.600 | 8.733 | 2.701 | n/a | 0.028 | 2.971 | 0.139 | 0.028 |
| p99 | 110.891 | 2.431 | 0.000 | 2.314 | 10.126 | n/a | 0.652 | 1.600 | 8.133 | 24.972 | 0.483 | 0.000 | 5.227 | 72.224 | 20.043 | n/a | 0.063 | 10.852 | 0.180 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c00000000000000ef | 110.891 | 3.147 | n/a | 0.000 | 0.116 | 1.188 | 9.429 | 0.030 | 0.000 | 4.664 | 72.224 | 20.043 | n/a | 0.049 | 3.263 | 0.029 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| ac4e91c3c91acb5c00000000000000ff | 61.951 | 10.126 | n/a | 0.652 | 0.074 | 8.133 | 24.972 | 0.086 | 0.000 | 0.368 | 15.399 | 2.113 | n/a | 0.028 | 10.852 | 0.175 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| ac4e91c3c91acb5c0000000000000110 | 37.696 | 3.626 | n/a | 0.000 | 1.600 | 0.703 | 1.441 | 0.024 | 0.000 | 0.624 | 25.505 | 4.127 | n/a | 0.046 | 5.226 | 0.139 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000f1 | 30.575 | 4.881 | n/a | 0.000 | 0.082 | 1.562 | 3.095 | 0.027 | 0.000 | 3.761 | 9.358 | 7.780 | n/a | 0.028 | 4.963 | 0.162 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000e9 | 27.203 | 4.871 | n/a | 0.000 | 0.024 | 0.986 | 5.170 | 0.018 | 0.000 | 0.072 | 14.908 | 1.139 | n/a | 0.016 | 4.895 | 0.180 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000000e8 | 26.976 | 3.491 | n/a | 0.000 | 0.194 | 1.734 | 2.329 | 0.035 | 0.000 | 5.227 | 13.390 | 0.514 | n/a | 0.063 | 3.685 | 0.137 | 0.063 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000f4 | 24.453 | 2.142 | n/a | 0.000 | 0.759 | 1.438 | 3.206 | 0.108 | 0.000 | 1.480 | 10.705 | 4.593 | n/a | 0.023 | 2.900 | 0.119 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000108 | 24.435 | 2.813 | n/a | 0.000 | 0.056 | 1.093 | 4.852 | 0.023 | 0.000 | 0.107 | 8.733 | 6.731 | n/a | 0.026 | 2.870 | 0.117 | 0.026 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000114 | 23.334 | 2.818 | n/a | 0.000 | 0.153 | 1.733 | 2.550 | 0.066 | 0.000 | 0.871 | 13.620 | 1.466 | n/a | 0.059 | 2.971 | 0.127 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000e5 | 19.933 | 2.472 | n/a | 0.000 | 0.050 | 0.839 | 4.823 | 0.039 | 0.000 | 0.181 | 6.996 | 4.509 | n/a | 0.025 | 2.522 | 0.127 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000f9 | 18.812 | 3.035 | n/a | 0.000 | 0.145 | 1.248 | 2.037 | 0.025 | 0.000 | 1.378 | 7.573 | 3.319 | n/a | 0.053 | 3.180 | 0.169 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000011a | 18.723 | 3.249 | n/a | 0.000 | 0.061 | 1.367 | 1.597 | 0.021 | 0.000 | 0.119 | 7.848 | 4.438 | n/a | 0.023 | 3.310 | 0.177 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000010a | 18.705 | 1.695 | n/a | 0.000 | 0.053 | 3.746 | 1.416 | 0.022 | 0.000 | 0.104 | 9.084 | 2.556 | n/a | 0.028 | 1.748 | 0.093 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000101 | 18.512 | 3.010 | n/a | 0.000 | 0.061 | 1.373 | 3.190 | 0.061 | 0.000 | 1.418 | 7.154 | 2.217 | n/a | 0.028 | 3.071 | 0.166 | 0.028 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000fb | 18.020 | 3.105 | n/a | 0.000 | 0.108 | 0.968 | 3.421 | 0.119 | 0.000 | 0.428 | 6.564 | 3.262 | n/a | 0.044 | 3.213 | 0.178 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000011f | 17.949 | 2.492 | n/a | 0.000 | 0.070 | 4.937 | 1.662 | 0.024 | 0.000 | 0.390 | 7.231 | 1.115 | n/a | 0.027 | 2.562 | 0.143 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000e3 | 17.638 | 1.924 | n/a | 0.000 | 0.085 | 1.412 | 2.311 | 0.483 | 0.000 | 0.248 | 10.348 | 0.790 | n/a | 0.037 | 2.009 | 0.114 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000010e | 17.508 | 2.287 | n/a | 0.000 | 0.059 | 0.934 | 1.589 | 0.024 | 0.000 | 1.032 | 7.645 | 3.913 | n/a | 0.027 | 2.346 | 0.134 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000104 | 16.790 | 1.801 | n/a | 0.000 | 0.063 | 1.944 | 2.689 | 0.058 | 0.000 | 0.344 | 7.338 | 2.527 | n/a | 0.026 | 1.864 | 0.111 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000f6 | 14.028 | 2.304 | n/a | 0.000 | 0.055 | 0.959 | 1.480 | 0.024 | 0.000 | 0.600 | 5.880 | 2.701 | n/a | 0.025 | 2.359 | 0.168 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.705 | 0.713 | 0.000 | 0.483 | 2.472 | n/a | 0.000 | 0.085 | 1.248 | 2.311 | 0.030 | 0.000 | 0.624 | 7.645 | 2.701 | n/a | 0.028 | 2.562 | 0.134 | 0.028 |
| p99 | 110.891 | 1.425 | 0.000 | 0.800 | 3.626 | n/a | 0.000 | 1.600 | 4.937 | 9.429 | 0.483 | 0.000 | 5.227 | 72.224 | 20.043 | n/a | 0.063 | 5.226 | 0.178 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c00000000000000ef | 110.891 | 3.147 | n/a | 0.000 | 0.116 | 1.188 | 9.429 | 0.030 | 0.000 | 4.664 | 72.224 | 20.043 | n/a | 0.049 | 3.263 | 0.029 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| ac4e91c3c91acb5c0000000000000110 | 37.696 | 3.626 | n/a | 0.000 | 1.600 | 0.703 | 1.441 | 0.024 | 0.000 | 0.624 | 25.505 | 4.127 | n/a | 0.046 | 5.226 | 0.139 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000e8 | 26.976 | 3.491 | n/a | 0.000 | 0.194 | 1.734 | 2.329 | 0.035 | 0.000 | 5.227 | 13.390 | 0.514 | n/a | 0.063 | 3.685 | 0.137 | 0.063 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000f4 | 24.453 | 2.142 | n/a | 0.000 | 0.759 | 1.438 | 3.206 | 0.108 | 0.000 | 1.480 | 10.705 | 4.593 | n/a | 0.023 | 2.900 | 0.119 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000114 | 23.334 | 2.818 | n/a | 0.000 | 0.153 | 1.733 | 2.550 | 0.066 | 0.000 | 0.871 | 13.620 | 1.466 | n/a | 0.059 | 2.971 | 0.127 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000e5 | 19.933 | 2.472 | n/a | 0.000 | 0.050 | 0.839 | 4.823 | 0.039 | 0.000 | 0.181 | 6.996 | 4.509 | n/a | 0.025 | 2.522 | 0.127 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000f9 | 18.812 | 3.035 | n/a | 0.000 | 0.145 | 1.248 | 2.037 | 0.025 | 0.000 | 1.378 | 7.573 | 3.319 | n/a | 0.053 | 3.180 | 0.169 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000010a | 18.705 | 1.695 | n/a | 0.000 | 0.053 | 3.746 | 1.416 | 0.022 | 0.000 | 0.104 | 9.084 | 2.556 | n/a | 0.028 | 1.748 | 0.093 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000fb | 18.020 | 3.105 | n/a | 0.000 | 0.108 | 0.968 | 3.421 | 0.119 | 0.000 | 0.428 | 6.564 | 3.262 | n/a | 0.044 | 3.213 | 0.178 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000011f | 17.949 | 2.492 | n/a | 0.000 | 0.070 | 4.937 | 1.662 | 0.024 | 0.000 | 0.390 | 7.231 | 1.115 | n/a | 0.027 | 2.562 | 0.143 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000e3 | 17.638 | 1.924 | n/a | 0.000 | 0.085 | 1.412 | 2.311 | 0.483 | 0.000 | 0.248 | 10.348 | 0.790 | n/a | 0.037 | 2.009 | 0.114 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000010e | 17.508 | 2.287 | n/a | 0.000 | 0.059 | 0.934 | 1.589 | 0.024 | 0.000 | 1.032 | 7.645 | 3.913 | n/a | 0.027 | 2.346 | 0.134 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000104 | 16.790 | 1.801 | n/a | 0.000 | 0.063 | 1.944 | 2.689 | 0.058 | 0.000 | 0.344 | 7.338 | 2.527 | n/a | 0.026 | 1.864 | 0.111 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000000f6 | 14.028 | 2.304 | n/a | 0.000 | 0.055 | 0.959 | 1.480 | 0.024 | 0.000 | 0.600 | 5.880 | 2.701 | n/a | 0.025 | 2.359 | 0.168 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000118 | 10.395 | 1.657 | n/a | 0.000 | 0.052 | 0.708 | 1.460 | 0.026 | 0.000 | 0.674 | 5.224 | 0.573 | n/a | 0.021 | 1.709 | 0.164 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.337 | 0.595 | 0.000 | 0.627 | 2.643 | n/a | 0.000 | 0.072 | 0.980 | 2.180 | 0.024 | 0.000 | 0.162 | 8.683 | 1.424 | n/a | 0.032 | 2.799 | 0.158 | 0.032 |
| p99 | 103.490 | 1.943 | 0.000 | 2.524 | 6.709 | n/a | 0.000 | 1.021 | 4.288 | 9.985 | 1.490 | 21.251 | 1.345 | 69.563 | 20.235 | n/a | 0.087 | 6.776 | 0.319 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c0000000000000133 | 103.490 | 2.330 | n/a | 0.000 | 0.082 | 1.120 | 9.985 | 0.028 | 0.000 | 0.102 | 69.563 | 20.235 | n/a | 0.045 | 2.412 | 0.023 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| ac4e91c3c91acb5c0000000000000162 | 48.018 | 6.080 | n/a | 0.000 | 0.214 | 1.203 | 5.858 | 0.041 | 21.251 | 0.122 | 11.447 | 1.736 | n/a | 0.066 | 6.294 | 0.131 | 0.066 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.086ms |
| ac4e91c3c91acb5c0000000000000139 | 38.362 | 5.593 | n/a | 0.000 | 0.218 | 1.923 | 5.643 | 0.100 | 0.000 | 1.345 | 18.561 | 4.892 | n/a | 0.087 | 5.811 | 0.151 | 0.087 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000152 | 33.139 | 2.296 | n/a | 0.000 | 0.070 | 0.896 | 5.703 | 0.024 | 0.000 | 0.127 | 21.458 | 2.529 | n/a | 0.036 | 2.365 | 0.071 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| ac4e91c3c91acb5c0000000000000122 | 27.070 | 5.704 | n/a | 0.000 | 0.183 | 4.288 | 9.765 | 0.130 | 0.000 | 0.473 | 6.123 | 0.326 | n/a | 0.077 | 5.887 | 0.217 | 0.077 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000150 | 26.852 | 6.709 | n/a | 0.000 | 0.067 | 0.980 | 2.333 | 0.023 | 0.000 | 0.583 | 11.026 | 5.104 | n/a | 0.029 | 6.776 | 0.252 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms |
| ac4e91c3c91acb5c0000000000000148 | 25.944 | 4.015 | n/a | 0.000 | 0.087 | 1.052 | 5.619 | 0.058 | 0.000 | 0.151 | 13.902 | 1.021 | n/a | 0.040 | 4.102 | 0.158 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000142 | 24.539 | 3.059 | n/a | 0.000 | 0.072 | 0.643 | 0.968 | 0.013 | 0.000 | 0.080 | 8.790 | 10.884 | n/a | 0.032 | 3.131 | 0.128 | 0.032 | tx/thread-82/transactor.triplex-function | driver.publication.readback 0.114ms; driver.publication.persist-deferred 0.020ms |
| ac4e91c3c91acb5c0000000000000128 | 24.166 | 3.753 | n/a | 0.000 | 0.068 | 1.991 | 2.065 | 0.029 | 0.000 | 0.205 | 14.598 | 1.424 | n/a | 0.033 | 3.821 | 0.158 | 0.033 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000126 | 24.075 | 4.054 | n/a | 0.000 | 0.134 | 1.537 | 2.640 | 1.490 | 0.000 | 0.721 | 12.750 | 0.699 | n/a | 0.051 | 4.188 | 0.174 | 0.051 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| ac4e91c3c91acb5c0000000000000136 | 23.826 | 2.604 | n/a | 0.000 | 0.068 | 0.773 | 5.776 | 0.024 | 0.000 | 0.701 | 10.409 | 3.439 | n/a | 0.031 | 2.672 | 0.112 | 0.031 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000130 | 22.806 | 4.217 | n/a | 0.000 | 0.065 | 1.153 | 4.637 | 0.023 | 0.000 | 0.094 | 11.788 | 0.805 | n/a | 0.024 | 4.282 | 0.188 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000153 | 22.002 | 2.848 | n/a | 0.000 | 0.063 | 0.720 | 4.209 | 0.024 | 0.000 | 0.634 | 12.591 | 0.890 | n/a | 0.023 | 2.911 | 0.132 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.018ms |
| ac4e91c3c91acb5c0000000000000141 | 21.949 | 2.643 | n/a | 0.000 | 0.057 | 1.285 | 1.887 | 0.024 | 0.000 | 0.272 | 13.651 | 2.102 | n/a | 0.027 | 2.700 | 0.123 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000156 | 21.301 | 2.605 | n/a | 0.000 | 1.021 | 0.667 | 1.374 | 0.020 | 0.000 | 0.500 | 8.372 | 6.725 | n/a | 0.018 | 3.626 | 0.170 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| ac4e91c3c91acb5c000000000000016c | 20.337 | 2.104 | n/a | 0.000 | 0.077 | 1.130 | 4.591 | 0.026 | 0.000 | 0.152 | 8.747 | 3.469 | n/a | 0.041 | 2.180 | 0.107 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| ac4e91c3c91acb5c000000000000015d | 19.747 | 4.461 | n/a | 0.000 | 0.070 | 4.213 | 8.288 | 0.051 | 0.000 | 0.130 | 2.286 | 0.221 | n/a | 0.027 | 4.531 | 0.229 | 0.027 | gw-w/thread-53/storage/begin-command! | driver.reader-basis.broadcast 0.030ms |
| ac4e91c3c91acb5c0000000000000169 | 18.885 | 2.728 | n/a | 0.000 | 0.071 | 1.352 | 3.208 | 0.056 | 0.000 | 0.209 | 10.323 | 0.902 | n/a | 0.037 | 2.799 | 0.148 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000014a | 18.615 | 2.629 | n/a | 0.000 | 0.072 | 0.842 | 1.797 | 0.020 | 0.000 | 0.664 | 7.508 | 5.056 | n/a | 0.027 | 2.701 | 0.145 | 0.027 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000012e | 17.162 | 1.649 | n/a | 0.000 | 0.050 | 0.968 | 3.361 | 0.050 | 0.000 | 0.145 | 8.460 | 2.458 | n/a | 0.020 | 1.699 | 0.099 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.615 | 0.000 | 0.000 | 0.459 | 2.448 | n/a | 0.000 | 0.072 | 0.938 | 2.061 | 0.024 | 0.000 | 0.145 | 7.508 | 1.129 | n/a | 0.039 | 2.545 | 0.158 | 0.039 |
| p99 | 103.490 | 0.993 | 0.000 | 1.032 | 5.704 | n/a | 0.000 | 0.183 | 4.288 | 9.985 | 1.490 | 0.000 | 0.721 | 69.563 | 20.235 | n/a | 0.077 | 5.887 | 0.236 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c0000000000000133 | 103.490 | 2.330 | n/a | 0.000 | 0.082 | 1.120 | 9.985 | 0.028 | 0.000 | 0.102 | 69.563 | 20.235 | n/a | 0.045 | 2.412 | 0.023 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| ac4e91c3c91acb5c0000000000000152 | 33.139 | 2.296 | n/a | 0.000 | 0.070 | 0.896 | 5.703 | 0.024 | 0.000 | 0.127 | 21.458 | 2.529 | n/a | 0.036 | 2.365 | 0.071 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| ac4e91c3c91acb5c0000000000000122 | 27.070 | 5.704 | n/a | 0.000 | 0.183 | 4.288 | 9.765 | 0.130 | 0.000 | 0.473 | 6.123 | 0.326 | n/a | 0.077 | 5.887 | 0.217 | 0.077 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000142 | 24.539 | 3.059 | n/a | 0.000 | 0.072 | 0.643 | 0.968 | 0.013 | 0.000 | 0.080 | 8.790 | 10.884 | n/a | 0.032 | 3.131 | 0.128 | 0.032 | tx/thread-82/transactor.triplex-function | driver.publication.readback 0.114ms; driver.publication.persist-deferred 0.020ms |
| ac4e91c3c91acb5c0000000000000126 | 24.075 | 4.054 | n/a | 0.000 | 0.134 | 1.537 | 2.640 | 1.490 | 0.000 | 0.721 | 12.750 | 0.699 | n/a | 0.051 | 4.188 | 0.174 | 0.051 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| ac4e91c3c91acb5c0000000000000153 | 22.002 | 2.848 | n/a | 0.000 | 0.063 | 0.720 | 4.209 | 0.024 | 0.000 | 0.634 | 12.591 | 0.890 | n/a | 0.023 | 2.911 | 0.132 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.018ms |
| ac4e91c3c91acb5c000000000000016c | 20.337 | 2.104 | n/a | 0.000 | 0.077 | 1.130 | 4.591 | 0.026 | 0.000 | 0.152 | 8.747 | 3.469 | n/a | 0.041 | 2.180 | 0.107 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| ac4e91c3c91acb5c000000000000015d | 19.747 | 4.461 | n/a | 0.000 | 0.070 | 4.213 | 8.288 | 0.051 | 0.000 | 0.130 | 2.286 | 0.221 | n/a | 0.027 | 4.531 | 0.229 | 0.027 | gw-w/thread-53/storage/begin-command! | driver.reader-basis.broadcast 0.030ms |
| ac4e91c3c91acb5c000000000000014a | 18.615 | 2.629 | n/a | 0.000 | 0.072 | 0.842 | 1.797 | 0.020 | 0.000 | 0.664 | 7.508 | 5.056 | n/a | 0.027 | 2.701 | 0.145 | 0.027 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000012e | 17.162 | 1.649 | n/a | 0.000 | 0.050 | 0.968 | 3.361 | 0.050 | 0.000 | 0.145 | 8.460 | 2.458 | n/a | 0.020 | 1.699 | 0.099 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000170 | 15.509 | 2.924 | n/a | 0.000 | 0.140 | 0.842 | 1.298 | 0.021 | 0.000 | 0.414 | 8.683 | 1.129 | n/a | 0.060 | 3.064 | 0.198 | 0.060 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000012a | 13.778 | 2.702 | n/a | 0.000 | 0.108 | 0.844 | 1.295 | 0.021 | 0.000 | 0.087 | 7.507 | 1.172 | n/a | 0.041 | 2.811 | 0.204 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000160 | 13.778 | 2.370 | n/a | 0.000 | 0.055 | 0.938 | 1.515 | 0.024 | 0.000 | 0.120 | 6.238 | 2.478 | n/a | 0.039 | 2.425 | 0.176 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| ac4e91c3c91acb5c000000000000013b | 13.049 | 1.973 | n/a | 0.000 | 0.090 | 1.103 | 2.061 | 0.031 | 0.000 | 0.223 | 6.853 | 0.662 | n/a | 0.055 | 2.062 | 0.158 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000159 | 10.788 | 2.448 | n/a | 0.000 | 0.098 | 0.940 | 1.277 | 0.020 | 0.000 | 0.468 | 4.950 | 0.533 | n/a | 0.056 | 2.545 | 0.236 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.071ms |
| ac4e91c3c91acb5c0000000000000167 | 10.761 | 1.924 | n/a | 0.000 | 0.072 | 0.934 | 1.440 | 0.020 | 0.000 | 0.131 | 5.617 | 0.597 | n/a | 0.025 | 1.996 | 0.185 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.298 | 0.695 | 0.000 | 0.582 | 2.393 | n/a | 0.000 | 0.069 | 1.007 | 2.329 | 0.042 | 0.000 | 0.309 | 9.156 | 2.592 | n/a | 0.028 | 2.568 | 0.119 | 0.028 |
| p99 | 115.036 | 1.969 | 0.000 | 1.208 | 5.085 | n/a | 0.000 | 1.309 | 3.005 | 11.363 | 0.139 | 0.000 | 8.218 | 77.530 | 17.751 | n/a | 0.077 | 6.068 | 0.275 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c0000000000000180 | 115.036 | 3.224 | n/a | 0.000 | 1.309 | 0.912 | 11.363 | 0.069 | 0.000 | 2.843 | 77.530 | 17.751 | n/a | 0.034 | 4.533 | 0.039 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| ac4e91c3c91acb5c0000000000000186 | 32.181 | 2.953 | n/a | 0.000 | 0.077 | 2.047 | 4.766 | 0.075 | 0.000 | 3.473 | 12.864 | 5.886 | n/a | 0.039 | 3.030 | 0.094 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000178 | 28.771 | 2.332 | n/a | 0.000 | 0.069 | 1.084 | 2.530 | 0.048 | 0.000 | 0.838 | 12.267 | 9.572 | n/a | 0.030 | 2.401 | 0.083 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| ac4e91c3c91acb5c0000000000000183 | 27.448 | 2.334 | n/a | 0.000 | 0.037 | 0.759 | 2.329 | 0.042 | 0.000 | 0.722 | 14.617 | 6.589 | n/a | 0.018 | 2.372 | 0.086 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| ac4e91c3c91acb5c000000000000017b | 27.412 | 3.053 | n/a | 0.000 | 0.050 | 2.148 | 2.804 | 0.051 | 0.000 | 8.218 | 10.083 | 0.980 | n/a | 0.025 | 3.103 | 0.113 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001b0 | 26.948 | 4.076 | n/a | 0.000 | 0.054 | 0.858 | 8.827 | 0.027 | 0.000 | 0.118 | 7.794 | 5.168 | n/a | 0.024 | 4.130 | 0.153 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000018e | 24.714 | 2.855 | n/a | 0.000 | 0.093 | 1.592 | 4.104 | 0.059 | 0.000 | 0.843 | 12.142 | 2.987 | n/a | 0.041 | 2.947 | 0.119 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000017e | 24.691 | 2.513 | n/a | 0.000 | 0.055 | 1.031 | 6.454 | 0.046 | 0.000 | 0.975 | 11.549 | 2.041 | n/a | 0.028 | 2.568 | 0.104 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001ae | 22.048 | 5.085 | n/a | 0.000 | 0.983 | 3.005 | 9.573 | 0.077 | 0.000 | 0.674 | 2.304 | 0.322 | n/a | 0.025 | 6.068 | 0.275 | 0.025 | gw-w/thread-46/storage/begin-command! | none observed |
| ac4e91c3c91acb5c000000000000018c | 21.395 | 2.589 | n/a | 0.000 | 0.126 | 1.023 | 1.214 | 0.021 | 0.000 | 0.436 | 8.299 | 7.610 | n/a | 0.077 | 2.715 | 0.127 | 0.077 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000172 | 20.815 | 2.393 | n/a | 0.000 | 0.844 | 1.210 | 1.920 | 0.052 | 0.000 | 0.242 | 11.540 | 2.592 | n/a | 0.021 | 3.238 | 0.156 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001ab | 20.298 | 1.997 | n/a | 0.000 | 0.074 | 1.084 | 6.207 | 0.069 | 0.000 | 0.229 | 9.156 | 1.459 | n/a | 0.022 | 2.071 | 0.102 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001a1 | 20.201 | 2.353 | n/a | 0.000 | 0.079 | 1.117 | 1.630 | 0.033 | 0.000 | 0.272 | 11.024 | 3.658 | n/a | 0.034 | 2.432 | 0.120 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000019f | 19.522 | 1.940 | n/a | 0.000 | 0.060 | 1.202 | 2.154 | 0.066 | 0.000 | 0.205 | 11.395 | 2.474 | n/a | 0.026 | 2.000 | 0.102 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000198 | 19.210 | 2.112 | n/a | 0.000 | 0.073 | 0.948 | 3.856 | 0.019 | 0.000 | 0.127 | 7.232 | 4.810 | n/a | 0.033 | 2.185 | 0.114 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| ac4e91c3c91acb5c0000000000000189 | 18.919 | 1.758 | n/a | 0.000 | 0.060 | 0.729 | 5.348 | 0.027 | 0.000 | 0.130 | 8.289 | 2.554 | n/a | 0.023 | 1.818 | 0.096 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| ac4e91c3c91acb5c0000000000000192 | 17.167 | 3.279 | n/a | 0.000 | 0.052 | 0.845 | 2.108 | 0.139 | 0.000 | 0.464 | 9.257 | 0.986 | n/a | 0.037 | 3.332 | 0.194 | 0.037 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001a8 | 17.025 | 1.996 | n/a | 0.000 | 0.036 | 0.769 | 1.445 | 0.020 | 0.000 | 0.121 | 8.561 | 4.060 | n/a | 0.017 | 2.032 | 0.119 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001a4 | 15.347 | 2.114 | n/a | 0.000 | 0.088 | 0.945 | 1.960 | 0.031 | 0.000 | 0.309 | 7.120 | 2.743 | n/a | 0.038 | 2.201 | 0.143 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| ac4e91c3c91acb5c0000000000000175 | 14.687 | 2.327 | n/a | 0.000 | 0.050 | 0.923 | 1.228 | 0.022 | 0.000 | 0.162 | 8.763 | 1.182 | n/a | 0.030 | 2.377 | 0.162 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.201 | 0.762 | 0.000 | 0.522 | 2.353 | n/a | 0.000 | 0.077 | 1.023 | 1.960 | 0.035 | 0.000 | 0.272 | 8.763 | 2.592 | n/a | 0.030 | 2.432 | 0.120 | 0.030 |
| p99 | 115.036 | 1.904 | 0.000 | 0.868 | 5.085 | n/a | 0.000 | 1.309 | 3.005 | 11.363 | 0.077 | 0.000 | 3.473 | 77.530 | 17.751 | n/a | 0.077 | 6.068 | 0.275 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c0000000000000180 | 115.036 | 3.224 | n/a | 0.000 | 1.309 | 0.912 | 11.363 | 0.069 | 0.000 | 2.843 | 77.530 | 17.751 | n/a | 0.034 | 4.533 | 0.039 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| ac4e91c3c91acb5c0000000000000186 | 32.181 | 2.953 | n/a | 0.000 | 0.077 | 2.047 | 4.766 | 0.075 | 0.000 | 3.473 | 12.864 | 5.886 | n/a | 0.039 | 3.030 | 0.094 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000018e | 24.714 | 2.855 | n/a | 0.000 | 0.093 | 1.592 | 4.104 | 0.059 | 0.000 | 0.843 | 12.142 | 2.987 | n/a | 0.041 | 2.947 | 0.119 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001ae | 22.048 | 5.085 | n/a | 0.000 | 0.983 | 3.005 | 9.573 | 0.077 | 0.000 | 0.674 | 2.304 | 0.322 | n/a | 0.025 | 6.068 | 0.275 | 0.025 | gw-w/thread-46/storage/begin-command! | none observed |
| ac4e91c3c91acb5c000000000000018c | 21.395 | 2.589 | n/a | 0.000 | 0.126 | 1.023 | 1.214 | 0.021 | 0.000 | 0.436 | 8.299 | 7.610 | n/a | 0.077 | 2.715 | 0.127 | 0.077 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000172 | 20.815 | 2.393 | n/a | 0.000 | 0.844 | 1.210 | 1.920 | 0.052 | 0.000 | 0.242 | 11.540 | 2.592 | n/a | 0.021 | 3.238 | 0.156 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001ab | 20.298 | 1.997 | n/a | 0.000 | 0.074 | 1.084 | 6.207 | 0.069 | 0.000 | 0.229 | 9.156 | 1.459 | n/a | 0.022 | 2.071 | 0.102 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001a1 | 20.201 | 2.353 | n/a | 0.000 | 0.079 | 1.117 | 1.630 | 0.033 | 0.000 | 0.272 | 11.024 | 3.658 | n/a | 0.034 | 2.432 | 0.120 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c000000000000019f | 19.522 | 1.940 | n/a | 0.000 | 0.060 | 1.202 | 2.154 | 0.066 | 0.000 | 0.205 | 11.395 | 2.474 | n/a | 0.026 | 2.000 | 0.102 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000189 | 18.919 | 1.758 | n/a | 0.000 | 0.060 | 0.729 | 5.348 | 0.027 | 0.000 | 0.130 | 8.289 | 2.554 | n/a | 0.023 | 1.818 | 0.096 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| ac4e91c3c91acb5c00000000000001a8 | 17.025 | 1.996 | n/a | 0.000 | 0.036 | 0.769 | 1.445 | 0.020 | 0.000 | 0.121 | 8.561 | 4.060 | n/a | 0.017 | 2.032 | 0.119 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c00000000000001a4 | 15.347 | 2.114 | n/a | 0.000 | 0.088 | 0.945 | 1.960 | 0.031 | 0.000 | 0.309 | 7.120 | 2.743 | n/a | 0.038 | 2.201 | 0.143 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| ac4e91c3c91acb5c0000000000000175 | 14.687 | 2.327 | n/a | 0.000 | 0.050 | 0.923 | 1.228 | 0.022 | 0.000 | 0.162 | 8.763 | 1.182 | n/a | 0.030 | 2.377 | 0.162 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| ac4e91c3c91acb5c000000000000019c | 12.115 | 2.921 | n/a | 0.000 | 0.074 | 1.007 | 1.365 | 0.023 | 0.000 | 0.608 | 5.469 | 0.616 | n/a | 0.033 | 2.995 | 0.247 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000196 | 10.906 | 1.640 | n/a | 0.000 | 0.051 | 0.719 | 1.628 | 0.035 | 0.000 | 0.139 | 5.445 | 1.227 | n/a | 0.021 | 1.691 | 0.155 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (817 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.790 | 0.250 | 0.000 | 0.504 | 2.095 | n/a | 0.000 | 0.049 | 0.670 | 1.224 | 0.017 | 0.000 | 0.162 | 6.686 | 0.610 | n/a | 0.016 | 2.535 | 0.194 | 0.016 |
| p99 | 55.435 | 1.996 | 0.041 | 2.250 | 7.281 | n/a | 0.000 | 25.679 | 7.502 | 7.975 | 0.089 | 0.000 | 4.256 | 26.816 | 11.794 | n/a | 0.049 | 30.585 | 0.712 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c00000000000001c4 | 97.655 | 1.556 | n/a | 0.000 | 75.655 | 0.834 | 1.486 | 0.040 | 0.000 | 0.798 | 16.806 | 0.461 | n/a | 0.019 | 77.211 | 0.791 | 0.019 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.269ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000001c3 | 81.321 | 2.131 | n/a | 0.000 | 0.084 | 1.652 | 8.694 | 0.065 | 0.000 | 3.561 | 56.004 | 9.091 | n/a | 0.039 | 2.215 | 0.027 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| ac4e91c3c91acb5c00000000000001c5 | 80.395 | 2.147 | n/a | 0.000 | 0.010 | 1.709 | 1.513 | 0.012 | 0.000 | 0.914 | 67.718 | 6.362 | n/a | 0.011 | 2.157 | 0.027 | 0.011 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000006f0 | 78.161 | 4.809 | n/a | 0.000 | 60.998 | 0.466 | 1.369 | 0.009 | 0.000 | 0.540 | 7.257 | 2.701 | n/a | 0.010 | 65.807 | 0.842 | 0.010 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.057ms; driver.reader-basis.broadcast 0.053ms; driver.publication.readback 0.047ms; driver.publication.readback 0.047ms; driver.publication.readback 0.045ms |
| ac4e91c3c91acb5c00000000000001c6 | 77.902 | 3.446 | n/a | 0.000 | 62.234 | 1.744 | 1.875 | 0.035 | 0.000 | 0.095 | 7.666 | 0.792 | n/a | 0.015 | 65.680 | 0.843 | 0.015 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.269ms; driver.publication.readback 0.130ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.060ms; driver.publication.readback 0.048ms |
| ac4e91c3c91acb5c00000000000002ee | 70.239 | 1.368 | n/a | 0.000 | 47.088 | 3.868 | 1.069 | 0.023 | 0.000 | 0.075 | 15.792 | 0.943 | n/a | 0.013 | 48.456 | 0.690 | 0.013 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.204ms; driver.expected-state.add-commit 1.089ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.062ms |
| ac4e91c3c91acb5c00000000000006ee | 67.013 | 1.301 | n/a | 0.000 | 51.844 | 0.672 | 0.573 | 0.008 | 0.000 | 0.048 | 12.096 | 0.462 | n/a | 0.009 | 53.144 | 0.793 | 0.009 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.057ms; driver.reader-basis.broadcast 0.053ms; driver.publication.readback 0.047ms; driver.publication.readback 0.047ms; driver.publication.readback 0.043ms |
| ac4e91c3c91acb5c00000000000006f1 | 62.448 | 7.226 | n/a | 0.000 | 25.679 | 3.741 | 2.288 | 0.031 | 0.000 | 0.596 | 21.270 | 1.607 | n/a | 0.010 | 32.904 | 0.527 | 0.010 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.057ms; driver.reader-basis.broadcast 0.053ms; driver.publication.readback 0.047ms; driver.publication.readback 0.047ms; driver.publication.readback 0.043ms |
| ac4e91c3c91acb5c0000000000000289 | 55.435 | 2.879 | n/a | 0.000 | 0.039 | 0.578 | 1.626 | 0.021 | 0.000 | 0.086 | 31.937 | 18.248 | n/a | 0.021 | 2.917 | 0.053 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.152ms; driver.reader-basis.broadcast 0.097ms; driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c0000000000000248 | 53.369 | 2.029 | n/a | 0.000 | 15.917 | 0.714 | 2.258 | 0.059 | 0.000 | 5.816 | 25.322 | 1.242 | n/a | 0.012 | 17.946 | 0.336 | 0.012 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.293ms; driver.publication.readback 0.133ms; driver.publication.persist-deferred 0.096ms; driver.publication.readback 0.074ms; driver.reader-basis.broadcast 0.073ms |
| ac4e91c3c91acb5c00000000000006ed | 52.234 | 1.517 | n/a | 0.000 | 31.293 | 4.139 | 1.141 | 0.017 | 0.000 | 0.072 | 13.045 | 0.997 | n/a | 0.012 | 32.810 | 0.628 | 0.012 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.057ms; driver.reader-basis.broadcast 0.053ms; driver.publication.readback 0.047ms; driver.publication.readback 0.043ms; driver.publication.readback 0.037ms |
| ac4e91c3c91acb5c00000000000004fc | 51.381 | 3.661 | n/a | 0.000 | 5.181 | 5.190 | 2.747 | 0.045 | 0.000 | 4.418 | 11.675 | 18.453 | n/a | 0.011 | 8.842 | 0.172 | 0.011 | tx/thread-82/transactor.triplex-function | driver.reader-basis.broadcast 0.142ms; driver.publication.readback 0.057ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.014ms |
| ac4e91c3c91acb5c00000000000002bc | 49.104 | 5.973 | n/a | 0.000 | 0.094 | 2.689 | 18.312 | 0.138 | 0.000 | 1.032 | 19.517 | 1.306 | n/a | 0.042 | 6.067 | 0.124 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c00000000000002ed | 48.241 | 2.131 | n/a | 0.000 | 28.454 | 0.754 | 0.999 | 0.025 | 0.000 | 3.258 | 11.574 | 1.027 | n/a | 0.020 | 30.585 | 0.634 | 0.020 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.204ms; driver.expected-state.add-commit 1.089ms; driver.publication.persist-deferred 0.062ms; driver.publication.readback 0.054ms |
| ac4e91c3c91acb5c000000000000042c | 46.776 | 13.177 | n/a | 0.000 | 0.052 | 7.200 | 13.730 | 0.081 | 0.000 | 1.304 | 9.993 | 1.217 | n/a | 0.023 | 13.229 | 0.283 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.109ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.016ms |
| ac4e91c3c91acb5c00000000000004fe | 46.055 | 2.296 | n/a | 0.000 | 1.239 | 7.502 | 3.445 | 0.030 | 0.000 | 0.086 | 30.120 | 1.328 | n/a | 0.009 | 3.535 | 0.077 | 0.009 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.142ms; driver.publication.readback 0.057ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.014ms |
| ac4e91c3c91acb5c00000000000002f2 | 45.677 | 3.430 | n/a | 0.000 | 14.448 | 0.795 | 1.987 | 0.030 | 0.000 | 1.667 | 22.408 | 0.890 | n/a | 0.022 | 17.878 | 0.391 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.204ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.062ms; driver.publication.readback 0.054ms |
| ac4e91c3c91acb5c0000000000000251 | 45.634 | 1.719 | n/a | 0.000 | 35.445 | 0.576 | 1.030 | 0.029 | 0.000 | 0.081 | 6.326 | 0.417 | n/a | 0.012 | 37.163 | 0.814 | 0.012 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.146ms; driver.publication.readback 0.052ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.027ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c0000000000000287 | 45.442 | 2.086 | n/a | 0.000 | 1.007 | 0.529 | 1.224 | 0.021 | 0.000 | 0.757 | 30.823 | 8.985 | n/a | 0.011 | 3.093 | 0.068 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.022ms |
| ac4e91c3c91acb5c0000000000000234 | 44.085 | 3.770 | n/a | 0.000 | 0.023 | 0.653 | 2.841 | 0.052 | 0.000 | 3.165 | 31.762 | 1.806 | n/a | 0.012 | 3.793 | 0.086 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.113ms; driver.publication.readback 0.066ms; driver.publication.readback 0.065ms; driver.reader-basis.broadcast 0.064ms; driver.publication.persist-deferred 0.038ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.551 | 0.000 | 0.000 | 0.402 | 1.706 | n/a | 0.000 | 0.049 | 0.667 | 1.085 | 0.016 | 0.000 | 0.160 | 6.342 | 0.479 | n/a | 0.016 | 1.964 | 0.175 | 0.016 |
| p99 | 52.234 | 1.757 | 0.035 | 0.851 | 4.994 | n/a | 0.000 | 31.293 | 5.458 | 6.619 | 0.128 | 0.000 | 3.773 | 24.169 | 9.091 | n/a | 0.048 | 32.810 | 0.712 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c00000000000001c4 | 97.655 | 1.556 | n/a | 0.000 | 75.655 | 0.834 | 1.486 | 0.040 | 0.000 | 0.798 | 16.806 | 0.461 | n/a | 0.019 | 77.211 | 0.791 | 0.019 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.269ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000001c3 | 81.321 | 2.131 | n/a | 0.000 | 0.084 | 1.652 | 8.694 | 0.065 | 0.000 | 3.561 | 56.004 | 9.091 | n/a | 0.039 | 2.215 | 0.027 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| ac4e91c3c91acb5c00000000000002ee | 70.239 | 1.368 | n/a | 0.000 | 47.088 | 3.868 | 1.069 | 0.023 | 0.000 | 0.075 | 15.792 | 0.943 | n/a | 0.013 | 48.456 | 0.690 | 0.013 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.204ms; driver.expected-state.add-commit 1.089ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.062ms |
| ac4e91c3c91acb5c00000000000006ee | 67.013 | 1.301 | n/a | 0.000 | 51.844 | 0.672 | 0.573 | 0.008 | 0.000 | 0.048 | 12.096 | 0.462 | n/a | 0.009 | 53.144 | 0.793 | 0.009 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.057ms; driver.reader-basis.broadcast 0.053ms; driver.publication.readback 0.047ms; driver.publication.readback 0.047ms; driver.publication.readback 0.043ms |
| ac4e91c3c91acb5c00000000000006ed | 52.234 | 1.517 | n/a | 0.000 | 31.293 | 4.139 | 1.141 | 0.017 | 0.000 | 0.072 | 13.045 | 0.997 | n/a | 0.012 | 32.810 | 0.628 | 0.012 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.057ms; driver.reader-basis.broadcast 0.053ms; driver.publication.readback 0.047ms; driver.publication.readback 0.043ms; driver.publication.readback 0.037ms |
| ac4e91c3c91acb5c00000000000002bc | 49.104 | 5.973 | n/a | 0.000 | 0.094 | 2.689 | 18.312 | 0.138 | 0.000 | 1.032 | 19.517 | 1.306 | n/a | 0.042 | 6.067 | 0.124 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c00000000000002ed | 48.241 | 2.131 | n/a | 0.000 | 28.454 | 0.754 | 0.999 | 0.025 | 0.000 | 3.258 | 11.574 | 1.027 | n/a | 0.020 | 30.585 | 0.634 | 0.020 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.642ms; driver.expected-state.bind-receipt 1.204ms; driver.expected-state.add-commit 1.089ms; driver.publication.persist-deferred 0.062ms; driver.publication.readback 0.054ms |
| ac4e91c3c91acb5c0000000000000251 | 45.634 | 1.719 | n/a | 0.000 | 35.445 | 0.576 | 1.030 | 0.029 | 0.000 | 0.081 | 6.326 | 0.417 | n/a | 0.012 | 37.163 | 0.814 | 0.012 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.146ms; driver.publication.readback 0.052ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.027ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c0000000000000233 | 38.730 | 1.575 | n/a | 0.000 | 0.018 | 2.092 | 0.839 | 0.011 | 0.000 | 0.154 | 12.162 | 21.871 | n/a | 0.009 | 1.593 | 0.041 | 0.009 | tx/thread-82/transactor.triplex-function | driver.publication.readback 0.113ms; driver.publication.readback 0.066ms; driver.reader-basis.broadcast 0.064ms; driver.publication.persist-deferred 0.038ms; driver.publication.persist-deferred 0.035ms |
| ac4e91c3c91acb5c00000000000001bc | 38.305 | 8.375 | n/a | 0.000 | 0.891 | 5.801 | 5.458 | 0.077 | 0.000 | 0.549 | 14.363 | 2.762 | n/a | 0.028 | 9.267 | 0.242 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000373 | 38.207 | 1.661 | n/a | 0.000 | 16.618 | 1.950 | 0.979 | 0.024 | 0.000 | 0.425 | 15.569 | 0.969 | n/a | 0.012 | 18.279 | 0.478 | 0.012 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.205ms; driver.publication.readback 0.093ms; driver.publication.readback 0.067ms; driver.publication.readback 0.039ms; driver.publication.readback 0.039ms |
| ac4e91c3c91acb5c0000000000000564 | 37.684 | 2.333 | n/a | 0.000 | 1.579 | 0.453 | 0.735 | 0.008 | 0.000 | 0.185 | 25.347 | 7.028 | n/a | 0.016 | 3.912 | 0.104 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c00000000000001eb | 36.362 | 2.080 | n/a | 0.000 | 14.068 | 0.699 | 0.965 | 0.019 | 0.000 | 0.095 | 17.939 | 0.474 | n/a | 0.023 | 16.149 | 0.444 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.128ms; driver.publication.readback 0.122ms; driver.publication.persist-deferred 0.089ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.043ms |
| ac4e91c3c91acb5c00000000000001cf | 35.913 | 3.087 | n/a | 0.000 | 15.840 | 4.005 | 1.177 | 0.010 | 0.000 | 0.037 | 11.146 | 0.590 | n/a | 0.022 | 18.927 | 0.527 | 0.022 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.117ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.048ms; driver.publication.persist-deferred 0.047ms |
| ac4e91c3c91acb5c00000000000001c7 | 34.436 | 2.500 | n/a | 0.000 | 0.108 | 1.983 | 6.486 | 0.054 | 0.000 | 0.138 | 18.592 | 4.537 | n/a | 0.038 | 2.608 | 0.076 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.269ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.060ms; driver.reader-basis.broadcast 0.033ms; driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c0000000000000231 | 33.522 | 1.836 | n/a | 0.000 | 0.903 | 0.606 | 0.956 | 0.019 | 0.000 | 4.505 | 23.751 | 0.933 | n/a | 0.013 | 2.739 | 0.082 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms; driver.publication.persist-deferred 0.035ms |
| ac4e91c3c91acb5c00000000000002b1 | 33.330 | 1.792 | n/a | 0.000 | 1.301 | 3.175 | 1.589 | 0.043 | 0.000 | 0.110 | 22.934 | 2.364 | n/a | 0.022 | 3.094 | 0.093 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.075ms; driver.publication.readback 0.058ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c0000000000000504 | 31.694 | 1.316 | n/a | 0.000 | 11.603 | 2.560 | 1.708 | 0.026 | 0.000 | 0.079 | 12.027 | 2.362 | n/a | 0.014 | 12.919 | 0.408 | 0.014 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.publication.readback 0.063ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000006db | 31.533 | 2.848 | n/a | 0.000 | 4.365 | 2.056 | 0.773 | 0.010 | 0.000 | 1.083 | 7.602 | 12.775 | n/a | 0.021 | 7.213 | 0.229 | 0.021 | tx/thread-82/transactor.triplex-function | driver.expected-state.bind-receipt 1.394ms; driver.reader-basis.broadcast 0.126ms; driver.publication.readback 0.054ms; driver.publication.readback 0.050ms; driver.publication.readback 0.041ms |
| ac4e91c3c91acb5c0000000000000539 | 31.326 | 1.595 | n/a | 0.000 | 0.017 | 0.398 | 0.583 | 0.007 | 0.000 | 0.046 | 22.398 | 6.271 | n/a | 0.011 | 1.613 | 0.051 | 0.011 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.019ms |

## P2 / tail / commit (2567 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.401 | 0.240 | 0.000 | 0.495 | 2.063 | n/a | 0.000 | 0.038 | 0.538 | 0.951 | 0.012 | 0.000 | 0.103 | 4.573 | 0.582 | n/a | 0.013 | 2.362 | 0.236 | 0.013 |
| p99 | 39.158 | 2.005 | 0.054 | 1.988 | 6.829 | n/a | 0.000 | 17.122 | 5.611 | 4.465 | 0.045 | 0.000 | 3.239 | 20.866 | 5.270 | n/a | 0.046 | 19.108 | 0.728 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c00000000000019af | 89.681 | 1.698 | n/a | 0.000 | 0.039 | 0.448 | 0.936 | 0.012 | 0.000 | 0.101 | 85.959 | 0.474 | n/a | 0.015 | 1.737 | 0.019 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.237ms |
| ac4e91c3c91acb5c00000000000009b3 | 72.355 | 1.421 | n/a | 0.000 | 63.374 | 0.423 | 0.981 | 0.012 | 0.000 | 0.361 | 5.292 | 0.481 | n/a | 0.010 | 64.795 | 0.896 | 0.010 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.307ms; driver.publication.readback 0.107ms; driver.reader-basis.broadcast 0.101ms; driver.publication.readback 0.064ms; driver.publication.readback 0.046ms |
| ac4e91c3c91acb5c00000000000009b5 | 72.255 | 4.474 | n/a | 0.000 | 55.555 | 0.614 | 4.689 | 0.032 | 0.000 | 0.691 | 4.984 | 1.206 | n/a | 0.011 | 60.028 | 0.831 | 0.011 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.307ms; driver.publication.readback 0.107ms; driver.reader-basis.broadcast 0.101ms; driver.publication.readback 0.064ms; driver.publication.readback 0.058ms |
| ac4e91c3c91acb5c00000000000019b0 | 70.865 | 1.742 | n/a | 0.000 | 0.056 | 1.303 | 0.829 | 0.011 | 0.000 | 0.068 | 66.382 | 0.450 | n/a | 0.024 | 1.798 | 0.025 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.237ms; driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000009ae | 65.872 | 2.288 | n/a | 0.000 | 5.334 | 0.563 | 0.882 | 0.008 | 0.000 | 0.074 | 19.069 | 37.625 | n/a | 0.028 | 7.622 | 0.116 | 0.028 | tx/thread-82/transactor.triplex-function | driver.publication.readback 0.092ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c00000000000009b2 | 65.220 | 2.030 | n/a | 0.000 | 46.994 | 0.648 | 1.012 | 0.007 | 0.000 | 0.028 | 13.871 | 0.618 | n/a | 0.011 | 49.024 | 0.752 | 0.011 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.307ms; driver.reader-basis.broadcast 0.101ms; driver.publication.readback 0.072ms; driver.publication.readback 0.064ms; driver.publication.readback 0.043ms |
| ac4e91c3c91acb5c00000000000019b1 | 63.555 | 1.591 | n/a | 0.000 | 56.135 | 0.404 | 1.094 | 0.026 | 0.000 | 0.061 | 3.771 | 0.464 | n/a | 0.009 | 57.726 | 0.908 | 0.009 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.041ms; driver.publication.readback 0.034ms; driver.publication.readback 0.033ms; driver.publication.readback 0.023ms; driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000009b0 | 60.650 | 3.555 | n/a | 0.000 | 0.032 | 2.384 | 1.399 | 0.011 | 0.000 | 0.062 | 52.055 | 1.135 | n/a | 0.016 | 3.588 | 0.059 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c00000000000019b4 | 57.067 | 2.649 | n/a | 0.000 | 49.431 | 0.515 | 0.804 | 0.013 | 0.000 | 0.051 | 3.034 | 0.556 | n/a | 0.014 | 52.080 | 0.913 | 0.014 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.publication.readback 0.041ms; driver.publication.readback 0.034ms; driver.publication.readback 0.033ms; driver.publication.persist-deferred 0.033ms |
| ac4e91c3c91acb5c0000000000001417 | 49.536 | 1.222 | n/a | 0.000 | 42.876 | 0.407 | 0.731 | 0.012 | 0.000 | 0.275 | 3.531 | 0.474 | n/a | 0.008 | 44.099 | 0.890 | 0.008 | node-15/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.181ms; driver.publication.readback 0.116ms; driver.publication.readback 0.078ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.047ms |
| ac4e91c3c91acb5c000000000000184d | 49.244 | 6.932 | n/a | 0.000 | 0.068 | 1.903 | 2.355 | 0.021 | 0.000 | 0.090 | 36.831 | 1.014 | n/a | 0.030 | 7.000 | 0.142 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.033ms |
| ac4e91c3c91acb5c0000000000001a06 | 49.007 | 1.489 | n/a | 0.000 | 14.554 | 0.286 | 5.124 | 0.006 | 19.157 | 0.017 | 7.887 | 0.479 | n/a | 0.008 | 16.042 | 0.327 | 0.008 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.231ms; driver.publication.readback 0.117ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.020ms |
| ac4e91c3c91acb5c00000000000019b2 | 48.716 | 1.285 | n/a | 0.000 | 0.025 | 1.325 | 0.738 | 0.011 | 0.000 | 0.111 | 44.270 | 0.936 | n/a | 0.016 | 1.310 | 0.027 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c0000000000001529 | 48.245 | 5.160 | n/a | 0.000 | 18.539 | 1.407 | 0.797 | 0.009 | 0.000 | 0.350 | 11.447 | 10.519 | n/a | 0.018 | 23.699 | 0.491 | 0.018 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.099ms; driver.publication.readback 0.073ms; driver.publication.readback 0.053ms; driver.publication.readback 0.051ms; driver.publication.readback 0.050ms |
| ac4e91c3c91acb5c00000000000019b3 | 47.697 | 2.142 | n/a | 0.000 | 0.043 | 0.292 | 0.563 | 0.005 | 0.000 | 0.029 | 43.881 | 0.723 | n/a | 0.019 | 2.185 | 0.046 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.008ms |
| ac4e91c3c91acb5c0000000000000c54 | 46.618 | 8.408 | n/a | 0.000 | 0.062 | 2.503 | 3.050 | 0.041 | 0.000 | 1.341 | 17.386 | 13.801 | n/a | 0.026 | 8.471 | 0.182 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.220ms; driver.publication.readback 0.160ms; driver.publication.readback 0.054ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.018ms |
| ac4e91c3c91acb5c0000000000001088 | 44.879 | 1.783 | n/a | 0.000 | 36.412 | 0.302 | 0.820 | 0.010 | 0.000 | 0.250 | 4.868 | 0.405 | n/a | 0.030 | 38.195 | 0.851 | 0.030 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.054ms; driver.publication.readback 0.150ms; driver.publication.readback 0.139ms; driver.publication.readback 0.076ms; driver.publication.readback 0.061ms |
| ac4e91c3c91acb5c0000000000000bc1 | 44.774 | 1.725 | n/a | 0.000 | 36.507 | 0.478 | 1.038 | 0.010 | 0.000 | 0.266 | 4.296 | 0.444 | n/a | 0.009 | 38.233 | 0.854 | 0.009 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.103ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.048ms; driver.publication.readback 0.044ms |
| ac4e91c3c91acb5c0000000000001416 | 44.651 | 3.846 | n/a | 0.000 | 25.235 | 1.084 | 1.080 | 0.017 | 0.000 | 0.076 | 12.555 | 0.751 | n/a | 0.008 | 29.080 | 0.651 | 0.008 | node-15/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.181ms; driver.publication.readback 0.116ms; driver.publication.readback 0.078ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.047ms |
| ac4e91c3c91acb5c000000000000184f | 43.244 | 2.036 | n/a | 0.000 | 0.009 | 2.626 | 1.315 | 0.013 | 0.000 | 0.033 | 13.322 | 23.886 | n/a | 0.005 | 2.045 | 0.047 | 0.005 | tx/thread-82/transactor.triplex-function | driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.012ms |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.166 | 0.000 | 0.000 | 0.385 | 1.657 | n/a | 0.000 | 0.038 | 0.527 | 0.825 | 0.012 | 0.000 | 0.104 | 4.217 | 0.460 | n/a | 0.013 | 1.902 | 0.219 | 0.013 |
| p99 | 37.286 | 1.976 | 0.029 | 0.886 | 5.045 | n/a | 0.000 | 17.551 | 6.258 | 3.841 | 0.040 | 0.000 | 2.097 | 21.113 | 3.667 | n/a | 0.044 | 19.108 | 0.748 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac4e91c3c91acb5c00000000000019af | 89.681 | 1.698 | n/a | 0.000 | 0.039 | 0.448 | 0.936 | 0.012 | 0.000 | 0.101 | 85.959 | 0.474 | n/a | 0.015 | 1.737 | 0.019 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.237ms |
| ac4e91c3c91acb5c00000000000009b3 | 72.355 | 1.421 | n/a | 0.000 | 63.374 | 0.423 | 0.981 | 0.012 | 0.000 | 0.361 | 5.292 | 0.481 | n/a | 0.010 | 64.795 | 0.896 | 0.010 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.307ms; driver.publication.readback 0.107ms; driver.reader-basis.broadcast 0.101ms; driver.publication.readback 0.064ms; driver.publication.readback 0.046ms |
| ac4e91c3c91acb5c00000000000019b0 | 70.865 | 1.742 | n/a | 0.000 | 0.056 | 1.303 | 0.829 | 0.011 | 0.000 | 0.068 | 66.382 | 0.450 | n/a | 0.024 | 1.798 | 0.025 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.237ms; driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000009ae | 65.872 | 2.288 | n/a | 0.000 | 5.334 | 0.563 | 0.882 | 0.008 | 0.000 | 0.074 | 19.069 | 37.625 | n/a | 0.028 | 7.622 | 0.116 | 0.028 | tx/thread-82/transactor.triplex-function | driver.publication.readback 0.092ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.017ms |
| ac4e91c3c91acb5c00000000000019b1 | 63.555 | 1.591 | n/a | 0.000 | 56.135 | 0.404 | 1.094 | 0.026 | 0.000 | 0.061 | 3.771 | 0.464 | n/a | 0.009 | 57.726 | 0.908 | 0.009 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.041ms; driver.publication.readback 0.034ms; driver.publication.readback 0.033ms; driver.publication.readback 0.023ms; driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000019b4 | 57.067 | 2.649 | n/a | 0.000 | 49.431 | 0.515 | 0.804 | 0.013 | 0.000 | 0.051 | 3.034 | 0.556 | n/a | 0.014 | 52.080 | 0.913 | 0.014 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.publication.readback 0.041ms; driver.publication.readback 0.034ms; driver.publication.readback 0.033ms; driver.publication.persist-deferred 0.033ms |
| ac4e91c3c91acb5c0000000000001417 | 49.536 | 1.222 | n/a | 0.000 | 42.876 | 0.407 | 0.731 | 0.012 | 0.000 | 0.275 | 3.531 | 0.474 | n/a | 0.008 | 44.099 | 0.890 | 0.008 | node-15/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.181ms; driver.publication.readback 0.116ms; driver.publication.readback 0.078ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.047ms |
| ac4e91c3c91acb5c00000000000019b2 | 48.716 | 1.285 | n/a | 0.000 | 0.025 | 1.325 | 0.738 | 0.011 | 0.000 | 0.111 | 44.270 | 0.936 | n/a | 0.016 | 1.310 | 0.027 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| ac4e91c3c91acb5c00000000000019b3 | 47.697 | 2.142 | n/a | 0.000 | 0.043 | 0.292 | 0.563 | 0.005 | 0.000 | 0.029 | 43.881 | 0.723 | n/a | 0.019 | 2.185 | 0.046 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.008ms |
| ac4e91c3c91acb5c0000000000001088 | 44.879 | 1.783 | n/a | 0.000 | 36.412 | 0.302 | 0.820 | 0.010 | 0.000 | 0.250 | 4.868 | 0.405 | n/a | 0.030 | 38.195 | 0.851 | 0.030 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.054ms; driver.publication.readback 0.150ms; driver.publication.readback 0.139ms; driver.publication.readback 0.076ms; driver.publication.readback 0.061ms |
| ac4e91c3c91acb5c0000000000000bc1 | 44.774 | 1.725 | n/a | 0.000 | 36.507 | 0.478 | 1.038 | 0.010 | 0.000 | 0.266 | 4.296 | 0.444 | n/a | 0.009 | 38.233 | 0.854 | 0.009 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.103ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.048ms; driver.publication.readback 0.044ms |
| ac4e91c3c91acb5c000000000000184e | 43.099 | 1.847 | n/a | 0.000 | 1.475 | 2.251 | 0.910 | 0.010 | 0.000 | 0.021 | 36.249 | 0.326 | n/a | 0.010 | 3.322 | 0.077 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ac4e91c3c91acb5c0000000000000f4d | 42.765 | 1.926 | n/a | 0.000 | 34.672 | 0.593 | 0.816 | 0.014 | 0.000 | 0.350 | 3.496 | 0.878 | n/a | 0.020 | 36.598 | 0.856 | 0.020 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.592ms; driver.reader-basis.broadcast 0.148ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.033ms |
| ac4e91c3c91acb5c0000000000001523 | 42.727 | 7.944 | n/a | 0.000 | 0.024 | 16.242 | 1.959 | 0.021 | 0.000 | 0.074 | 16.124 | 0.332 | n/a | 0.007 | 7.968 | 0.186 | 0.007 | node-15/thread-0/socket.wait-first-byte | driver.publication.readback 0.099ms; driver.publication.readback 0.053ms; driver.publication.readback 0.051ms; driver.publication.readback 0.049ms; driver.publication.readback 0.046ms |
| ac4e91c3c91acb5c0000000000000aa7 | 38.539 | 1.619 | n/a | 0.000 | 19.505 | 1.379 | 1.354 | 0.018 | 0.000 | 0.087 | 13.276 | 1.293 | n/a | 0.007 | 21.124 | 0.548 | 0.007 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.061ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.016ms |
| ac4e91c3c91acb5c00000000000008ac | 37.286 | 4.200 | n/a | 0.000 | 1.212 | 2.058 | 2.275 | 0.004 | 0.000 | 0.025 | 20.663 | 6.840 | n/a | 0.008 | 5.413 | 0.145 | 0.008 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.301ms; driver.publication.readback 0.117ms; driver.publication.readback 0.055ms; driver.publication.readback 0.047ms; driver.publication.readback 0.040ms |
| ac4e91c3c91acb5c0000000000000bc0 | 37.280 | 2.139 | n/a | 0.000 | 28.469 | 1.181 | 1.119 | 0.016 | 0.000 | 0.073 | 3.880 | 0.387 | n/a | 0.015 | 30.608 | 0.821 | 0.015 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.103ms; driver.publication.persist-deferred 0.048ms; driver.publication.readback 0.044ms; driver.publication.readback 0.026ms |
| ac4e91c3c91acb5c0000000000000bbf | 34.970 | 2.289 | n/a | 0.000 | 16.600 | 0.601 | 1.381 | 0.029 | 0.000 | 0.146 | 13.330 | 0.586 | n/a | 0.008 | 18.889 | 0.540 | 0.008 | node-15/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.044ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.016ms |
| ac4e91c3c91acb5c0000000000001b4d | 34.384 | 2.715 | n/a | 0.000 | 0.070 | 1.157 | 0.841 | 0.011 | 0.000 | 0.102 | 28.537 | 0.920 | n/a | 0.030 | 2.785 | 0.081 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.576ms |
| ac4e91c3c91acb5c0000000000000d28 | 34.129 | 2.134 | n/a | 0.000 | 0.012 | 20.731 | 1.517 | 0.023 | 0.000 | 0.132 | 9.467 | 0.106 | n/a | 0.007 | 2.146 | 0.063 | 0.007 | node-15/thread-0/socket.wait-first-byte | driver.publication.readback 0.119ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.020ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.415 | n/a | n/a | n/a | 0.096 | n/a | 0.000 | 0.000 | 0.711 | 71.907 | 0.007 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.127 | 0.096 | 0.001 | 0.127 |
| p99 | 203.234 | n/a | n/a | n/a | 18.431 | n/a | 1.224 | 0.000 | 6.782 | 201.419 | 0.104 | 13.837 | 0.175 | 0.000 | n/a | n/a | 0.670 | 19.655 | 0.280 | 0.670 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeb3eb71579cbcc90000000000000006 | 203.234 | 0.131 | n/a | 0.000 | 0.000 | 1.287 | 201.419 | 0.021 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.284 | 0.131 | 0.001 | 0.284 | gw-r/thread-48/journal/page | none observed |
| aeb3eb71579cbcc90000000000000005 | 202.324 | 0.053 | n/a | 0.000 | 0.000 | 0.711 | 201.278 | 0.018 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.088 | 0.053 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000eb1 | 201.438 | 0.025 | n/a | 0.000 | 0.000 | 0.563 | 200.738 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.055 | 0.025 | 0.000 | 0.055 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000eb2 | 201.294 | 0.034 | n/a | 0.000 | 0.000 | 0.606 | 200.539 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.079 | 0.034 | 0.000 | 0.079 | gw-r/thread-68/journal/page | none observed |
| aeb3eb71579cbcc90000000000000eb3 | 201.094 | 0.031 | n/a | 0.000 | 0.000 | 0.495 | 200.447 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.083 | 0.031 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000eb6 | 87.415 | 18.431 | n/a | 1.224 | 0.000 | 5.419 | 48.275 | 0.007 | 13.837 | 0.006 | 0.000 | n/a | n/a | 0.216 | 19.655 | 0.225 | 0.216 | gw-r/thread-51/gateway.admitted-work | none observed |
| aeb3eb71579cbcc9000000000000053b | 72.838 | 0.096 | n/a | 0.000 | 0.000 | 0.685 | 71.907 | 0.006 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.127 | 0.096 | 0.001 | 0.127 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000eb7 | 61.132 | 16.147 | n/a | 0.000 | 0.000 | 6.384 | 37.921 | 0.004 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.670 | 16.147 | 0.264 | 0.670 | gw-r/thread-62/gateway.admitted-work | none observed |
| aeb3eb71579cbcc90000000000000eb8 | 60.641 | 15.843 | n/a | 1.114 | 0.000 | 6.782 | 36.733 | 0.007 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.154 | 16.957 | 0.280 | 0.154 | gw-r/thread-50/gateway.admitted-work | none observed |
| 668a1ae6ba8114e30000000000000002 | 54.978 | 0.178 | n/a | 0.000 | 0.000 | 3.251 | 51.094 | 0.104 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.260 | 0.178 | 0.003 | 0.260 | gw-r/thread-48/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1008.494 | n/a | n/a | n/a | 0.358 | n/a | 0.000 | 0.000 | 3.640 | 1002.899 | 0.016 | 0.000 | 0.255 | 0.000 | n/a | n/a | 1.326 | 0.358 | 0.000 | 1.326 |
| p99 | 1008.494 | n/a | n/a | n/a | 0.358 | n/a | 0.000 | 0.000 | 3.640 | 1002.899 | 0.016 | 0.000 | 0.255 | 0.000 | n/a | n/a | 1.326 | 0.358 | 0.000 | 1.326 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 668a1ae6ba8114e30000000000000017 | 1008.494 | 0.358 | n/a | 0.000 | 0.000 | 3.640 | 1002.899 | 0.016 | 0.000 | 0.255 | 0.000 | n/a | n/a | 1.326 | 0.358 | 0.000 | 1.326 | gw-r/thread-62/journal/page | none observed |

## P3 / warmup / internal (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 842.983 | n/a | n/a | n/a | 2.434 | n/a | 0.000 | 0.000 | 1.040 | 819.782 | 0.014 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.158 | 2.434 | 0.007 | 0.158 |
| p99 | 1006.394 | n/a | n/a | n/a | 21.494 | n/a | 0.591 | 0.000 | 3.844 | 1001.951 | 0.110 | 0.000 | 0.206 | 0.000 | n/a | n/a | 1.161 | 21.494 | 0.144 | 1.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 668a1ae6ba8114e30000000000000020 | 1006.394 | 0.131 | n/a | 0.000 | 0.000 | 3.538 | 1001.403 | 0.022 | 0.000 | 0.198 | 0.000 | n/a | n/a | 1.103 | 0.131 | 0.000 | 1.103 | gw-r/thread-48/journal/page | none observed |
| 668a1ae6ba8114e3000000000000002f | 1005.984 | 0.342 | n/a | 0.000 | 0.000 | 2.331 | 1001.948 | 0.024 | 0.000 | 0.206 | 0.000 | n/a | n/a | 1.133 | 0.342 | 0.000 | 1.133 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e3000000000000001a | 1005.782 | 0.202 | n/a | 0.000 | 0.000 | 2.315 | 1001.951 | 0.014 | 0.000 | 0.140 | 0.000 | n/a | n/a | 1.161 | 0.202 | 0.000 | 1.161 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000036 | 1005.266 | 0.139 | n/a | 0.000 | 0.000 | 2.781 | 1001.160 | 0.010 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.120 | 0.139 | 0.000 | 1.120 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e3000000000000001d | 1004.849 | 0.139 | n/a | 0.000 | 0.000 | 2.238 | 1001.215 | 0.012 | 0.000 | 0.127 | 0.000 | n/a | n/a | 1.119 | 0.139 | 0.000 | 1.119 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e3000000000000002a | 1003.919 | 0.127 | n/a | 0.000 | 0.000 | 0.955 | 1001.505 | 0.017 | 0.000 | 0.188 | 0.000 | n/a | n/a | 1.127 | 0.127 | 0.000 | 1.127 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e30000000000000024 | 1003.415 | 0.125 | n/a | 0.000 | 0.000 | 1.072 | 1000.911 | 0.023 | 0.000 | 0.159 | 0.000 | n/a | n/a | 1.125 | 0.125 | 0.000 | 1.125 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e3000000000000002b | 1003.342 | 0.178 | n/a | 0.000 | 0.000 | 0.717 | 1001.128 | 0.110 | 0.000 | 0.082 | 0.000 | n/a | n/a | 1.128 | 0.178 | 0.000 | 1.128 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e3000000000000003c | 1002.724 | 0.191 | n/a | 0.000 | 0.000 | 0.567 | 1000.704 | 0.014 | 0.000 | 0.117 | 0.000 | n/a | n/a | 1.131 | 0.191 | 0.000 | 1.131 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e30000000000000034 | 945.698 | 3.466 | n/a | 0.403 | 0.000 | 1.040 | 940.589 | 0.011 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.106 | 3.869 | 0.004 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 668a1ae6ba8114e30000000000000026 | 889.659 | 5.889 | n/a | 0.000 | 0.000 | 0.956 | 882.609 | 0.013 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.095 | 5.889 | 0.007 | 0.095 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000018 | 842.983 | 21.494 | n/a | 0.000 | 0.000 | 1.097 | 819.782 | 0.039 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.479 | 21.494 | 0.025 | 0.479 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e30000000000000033 | 645.734 | 6.801 | n/a | 0.591 | 0.000 | 1.039 | 637.063 | 0.014 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.137 | 7.392 | 0.011 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e3000000000000002c | 490.735 | 2.078 | n/a | 0.000 | 0.000 | 0.999 | 487.411 | 0.014 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.147 | 2.078 | 0.004 | 0.147 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000028 | 436.092 | 5.745 | n/a | 0.000 | 0.000 | 1.993 | 428.055 | 0.073 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.158 | 5.745 | 0.013 | 0.158 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000031 | 380.727 | 5.546 | n/a | 0.000 | 0.000 | 0.657 | 374.320 | 0.012 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.100 | 5.546 | 0.015 | 0.100 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000023 | 303.444 | 4.025 | n/a | 0.000 | 0.000 | 0.771 | 298.431 | 0.011 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.113 | 4.025 | 0.013 | 0.113 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000039 | 281.541 | 2.925 | n/a | 0.221 | 0.000 | 1.230 | 277.002 | 0.008 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.094 | 3.147 | 0.011 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e30000000000000038 | 262.885 | 3.201 | n/a | 0.572 | 0.000 | 0.504 | 258.416 | 0.012 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.081 | 3.773 | 0.014 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 668a1ae6ba8114e3000000000000002e | 243.297 | 3.255 | n/a | 0.000 | 0.000 | 3.844 | 236.024 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.096 | 3.255 | 0.013 | 0.096 | gw-r/thread-52/journal/page | none observed |

## P3 / L1 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 584.820 | n/a | n/a | n/a | 2.449 | n/a | 0.000 | 0.000 | 0.868 | 571.911 | 0.012 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.123 | 2.796 | 0.009 | 0.123 |
| p99 | 1011.119 | n/a | n/a | n/a | 12.216 | n/a | 3.529 | 0.000 | 8.350 | 1003.890 | 0.105 | 0.000 | 0.592 | 0.000 | n/a | n/a | 1.248 | 13.368 | 0.138 | 1.248 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 668a1ae6ba8114e30000000000000047 | 1011.119 | 0.196 | n/a | 0.000 | 0.000 | 8.350 | 1001.286 | 0.015 | 0.000 | 0.154 | 0.000 | n/a | n/a | 1.118 | 0.196 | 0.000 | 1.118 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e30000000000000066 | 1006.252 | 0.180 | n/a | 0.000 | 0.000 | 0.592 | 1003.890 | 0.079 | 0.000 | 0.264 | 0.000 | n/a | n/a | 1.248 | 0.180 | 0.000 | 1.248 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000049 | 1005.648 | 0.180 | n/a | 0.000 | 0.000 | 0.968 | 1003.073 | 0.105 | 0.000 | 0.197 | 0.000 | n/a | n/a | 1.125 | 0.180 | 0.000 | 1.125 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e3000000000000003e | 1004.432 | 0.120 | n/a | 0.000 | 0.000 | 0.921 | 1001.675 | 0.015 | 0.000 | 0.592 | 0.000 | n/a | n/a | 1.110 | 0.120 | 0.000 | 1.110 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e30000000000000048 | 1003.648 | 0.142 | n/a | 0.000 | 0.000 | 0.657 | 1001.532 | 0.045 | 0.000 | 0.151 | 0.000 | n/a | n/a | 1.121 | 0.142 | 0.000 | 1.121 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e3000000000000006f | 1003.546 | 0.112 | n/a | 0.000 | 0.000 | 0.542 | 1001.597 | 0.022 | 0.000 | 0.179 | 0.000 | n/a | n/a | 1.093 | 0.112 | 0.000 | 1.093 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e3000000000000004e | 1003.036 | 0.122 | n/a | 0.000 | 0.000 | 0.879 | 1000.865 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.110 | 0.122 | 0.000 | 1.110 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000044 | 1003.018 | 0.159 | n/a | 0.000 | 0.000 | 0.531 | 1001.097 | 0.017 | 0.000 | 0.092 | 0.000 | n/a | n/a | 1.123 | 0.159 | 0.000 | 1.123 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000068 | 1002.891 | 0.174 | n/a | 0.000 | 0.000 | 0.839 | 1000.711 | 0.010 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.118 | 0.174 | 0.000 | 1.118 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e30000000000000042 | 1002.780 | 0.136 | n/a | 0.000 | 0.000 | 0.570 | 1000.865 | 0.013 | 0.000 | 0.080 | 0.000 | n/a | n/a | 1.116 | 0.136 | 0.000 | 1.116 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e3000000000000003d | 1002.478 | 0.131 | n/a | 0.000 | 0.000 | 0.683 | 1000.490 | 0.009 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.129 | 0.131 | 0.000 | 1.129 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e30000000000000063 | 1002.422 | 0.117 | n/a | 0.000 | 0.000 | 0.430 | 1000.709 | 0.015 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.114 | 0.117 | 0.000 | 1.114 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e30000000000000067 | 806.047 | 2.796 | n/a | 0.000 | 0.000 | 1.830 | 801.203 | 0.013 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.116 | 2.796 | 0.003 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e30000000000000045 | 765.110 | 12.216 | n/a | 1.152 | 0.000 | 0.591 | 750.867 | 0.012 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.199 | 13.368 | 0.017 | 0.199 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e30000000000000061 | 687.756 | 7.715 | n/a | 0.363 | 0.000 | 0.868 | 678.644 | 0.011 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.094 | 8.078 | 0.012 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e30000000000000053 | 644.094 | 2.449 | n/a | 3.529 | 0.000 | 0.793 | 637.170 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.086 | 5.978 | 0.009 | 0.086 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e30000000000000051 | 584.820 | 9.446 | n/a | 2.245 | 0.000 | 0.940 | 571.911 | 0.021 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.121 | 11.690 | 0.020 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e3000000000000006a | 542.099 | 4.307 | n/a | 0.820 | 0.000 | 0.581 | 536.217 | 0.012 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.091 | 5.127 | 0.009 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e3000000000000003f | 484.830 | 3.827 | n/a | 0.810 | 0.000 | 1.145 | 478.844 | 0.020 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.080 | 4.637 | 0.010 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 668a1ae6ba8114e3000000000000006b | 479.234 | 8.716 | n/a | 0.756 | 0.000 | 3.918 | 465.628 | 0.012 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.123 | 9.472 | 0.020 | 0.123 | gw-r/thread-62/journal/page | none observed |

## P3 / L4 / internal (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 744.924 | n/a | n/a | n/a | 2.564 | n/a | 0.000 | 0.000 | 0.755 | 742.110 | 0.012 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.149 | 2.564 | 0.005 | 0.149 |
| p99 | 1006.118 | n/a | n/a | n/a | 13.117 | n/a | 2.717 | 0.000 | 3.774 | 1004.408 | 11.442 | 14.438 | 3.401 | 0.000 | n/a | n/a | 2.179 | 13.798 | 0.642 | 2.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 668a1ae6ba8114e30000000000000091 | 1006.118 | 0.113 | n/a | 0.000 | 0.000 | 0.407 | 1004.408 | 0.010 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.114 | 0.113 | 0.000 | 1.114 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e3000000000000009b | 1005.131 | 0.142 | n/a | 0.000 | 0.000 | 1.000 | 1002.807 | 0.013 | 0.000 | 0.062 | 0.000 | n/a | n/a | 1.106 | 0.142 | 0.000 | 1.106 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e30000000000000073 | 1004.298 | 0.139 | n/a | 0.000 | 0.000 | 0.525 | 1001.243 | 0.018 | 0.000 | 0.192 | 0.000 | n/a | n/a | 2.179 | 0.139 | 0.000 | 2.179 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e3000000000000007e | 1003.903 | 0.228 | n/a | 0.000 | 0.000 | 0.905 | 998.190 | 0.023 | 0.000 | 3.401 | 0.000 | n/a | n/a | 1.156 | 0.228 | 0.000 | 1.156 | gw-r/thread-48/journal/page | none observed |
| 668a1ae6ba8114e30000000000000088 | 1003.567 | 0.155 | n/a | 0.000 | 0.000 | 0.698 | 1001.554 | 0.009 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.113 | 0.155 | 0.000 | 1.113 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e300000000000000a2 | 1003.340 | 0.168 | n/a | 0.000 | 0.000 | 0.656 | 1001.278 | 0.020 | 0.000 | 0.107 | 0.000 | n/a | n/a | 1.111 | 0.168 | 0.000 | 1.111 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e30000000000000085 | 1003.172 | 0.117 | n/a | 0.000 | 0.000 | 0.881 | 1000.998 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 1.097 | 0.117 | 0.000 | 1.097 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e30000000000000094 | 1003.135 | 0.121 | n/a | 0.000 | 0.000 | 0.853 | 1000.954 | 0.012 | 0.000 | 0.081 | 0.000 | n/a | n/a | 1.114 | 0.121 | 0.000 | 1.114 | gw-r/thread-48/journal/page | none observed |
| 668a1ae6ba8114e3000000000000007d | 1003.133 | 0.162 | n/a | 0.000 | 0.000 | 0.755 | 1001.028 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.126 | 0.162 | 0.000 | 1.126 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e30000000000000076 | 1003.062 | 0.110 | n/a | 0.000 | 0.000 | 0.530 | 1001.198 | 0.020 | 0.000 | 0.104 | 0.000 | n/a | n/a | 1.101 | 0.110 | 0.000 | 1.101 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e3000000000000008a | 1002.979 | 0.117 | n/a | 0.000 | 0.000 | 0.839 | 1000.844 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.121 | 0.117 | 0.000 | 1.121 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e30000000000000086 | 1002.100 | 0.101 | n/a | 0.000 | 0.000 | 0.447 | 1000.424 | 0.008 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.100 | 0.101 | 0.000 | 1.100 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000095 | 915.533 | 13.117 | n/a | 0.682 | 0.000 | 0.568 | 886.479 | 0.010 | 14.438 | 0.074 | 0.000 | n/a | n/a | 0.166 | 13.798 | 0.015 | 0.166 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e3000000000000008d | 893.308 | 5.568 | n/a | 0.290 | 0.000 | 0.919 | 886.348 | 0.023 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.075 | 5.859 | 0.007 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e30000000000000071 | 857.059 | 4.922 | n/a | 2.717 | 0.000 | 3.774 | 838.757 | 0.019 | 6.606 | 0.137 | 0.000 | n/a | n/a | 0.128 | 7.639 | 0.009 | 0.128 | gw-r/thread-48/journal/page | none observed |
| 668a1ae6ba8114e30000000000000099 | 744.924 | 2.093 | n/a | 0.000 | 0.000 | 0.577 | 742.110 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.066 | 2.093 | 0.003 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e30000000000000097 | 685.475 | 2.740 | n/a | 0.000 | 0.000 | 1.481 | 681.077 | 0.009 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.091 | 2.740 | 0.004 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 668a1ae6ba8114e3000000000000008b | 591.815 | 2.247 | n/a | 0.000 | 0.000 | 0.336 | 589.049 | 0.015 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.080 | 2.247 | 0.004 | 0.080 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e3000000000000009c | 586.874 | 3.704 | n/a | 0.000 | 0.000 | 0.543 | 582.387 | 0.031 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.079 | 3.704 | 0.006 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000083 | 537.289 | 10.349 | n/a | 0.652 | 0.000 | 1.915 | 524.192 | 0.013 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.099 | 11.001 | 0.020 | 0.099 | gw-r/thread-51/journal/page | none observed |

## P3 / L16 / internal (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 828.532 | n/a | n/a | n/a | 2.286 | n/a | 0.000 | 0.000 | 0.656 | 825.612 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.107 | 2.301 | 0.005 | 0.107 |
| p99 | 1007.612 | n/a | n/a | n/a | 7.075 | n/a | 0.544 | 0.000 | 3.708 | 1005.786 | 0.019 | 9.469 | 9.048 | 0.000 | n/a | n/a | 2.159 | 7.446 | 0.579 | 2.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 668a1ae6ba8114e300000000000000c1 | 1007.612 | 0.138 | n/a | 0.000 | 0.000 | 0.556 | 1005.786 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.113 | 0.138 | 0.000 | 1.113 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e300000000000000b9 | 1005.962 | 0.161 | n/a | 0.000 | 0.000 | 0.662 | 1003.996 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.104 | 0.161 | 0.000 | 1.104 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e300000000000000ac | 1004.783 | 0.108 | n/a | 0.000 | 0.000 | 1.423 | 1002.010 | 0.013 | 0.000 | 0.125 | 0.000 | n/a | n/a | 1.104 | 0.108 | 0.000 | 1.104 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e300000000000000c5 | 1004.062 | 0.122 | n/a | 0.000 | 0.000 | 0.997 | 1000.735 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 2.159 | 0.122 | 0.000 | 2.159 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000d3 | 1003.848 | 0.127 | n/a | 0.000 | 0.000 | 1.745 | 1000.806 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.105 | 0.127 | 0.000 | 1.105 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000d4 | 1003.106 | 0.112 | n/a | 0.000 | 0.000 | 1.086 | 1000.752 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.101 | 0.112 | 0.000 | 1.101 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e300000000000000cb | 1002.913 | 0.130 | n/a | 0.000 | 0.000 | 0.519 | 1001.075 | 0.009 | 0.000 | 0.069 | 0.000 | n/a | n/a | 1.110 | 0.130 | 0.000 | 1.110 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e300000000000000c0 | 1002.802 | 0.111 | n/a | 0.000 | 0.000 | 0.699 | 1000.823 | 0.014 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.105 | 0.111 | 0.000 | 1.105 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000ce | 1002.777 | 0.169 | n/a | 0.000 | 0.000 | 0.974 | 1000.490 | 0.007 | 0.000 | 0.024 | 0.000 | n/a | n/a | 1.112 | 0.169 | 0.000 | 1.112 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e300000000000000d8 | 1002.623 | 0.176 | n/a | 0.000 | 0.000 | 0.543 | 1000.749 | 0.010 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.107 | 0.176 | 0.000 | 1.107 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e300000000000000d5 | 1002.486 | 0.150 | n/a | 0.000 | 0.000 | 0.564 | 1000.633 | 0.008 | 0.000 | 0.025 | 0.000 | n/a | n/a | 1.106 | 0.150 | 0.000 | 1.106 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e300000000000000ab | 1002.436 | 0.117 | n/a | 0.000 | 0.000 | 0.443 | 1000.674 | 0.009 | 0.000 | 0.085 | 0.000 | n/a | n/a | 1.107 | 0.117 | 0.000 | 1.107 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000a6 | 902.774 | 7.075 | n/a | 0.371 | 0.000 | 0.562 | 894.496 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.211 | 7.446 | 0.008 | 0.211 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e300000000000000b1 | 849.204 | 3.157 | n/a | 0.000 | 0.000 | 0.474 | 845.460 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.064 | 3.157 | 0.004 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e300000000000000cf | 840.899 | 2.958 | n/a | 0.000 | 0.000 | 0.694 | 837.134 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.076 | 2.958 | 0.004 | 0.076 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e300000000000000ba | 837.572 | 5.996 | n/a | 0.267 | 0.000 | 0.516 | 830.678 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.075 | 6.262 | 0.007 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e300000000000000c8 | 828.532 | 2.286 | n/a | 0.000 | 0.000 | 0.530 | 825.612 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.065 | 2.286 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000c4 | 618.054 | 4.121 | n/a | 0.000 | 0.000 | 0.988 | 612.830 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.071 | 4.121 | 0.007 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e300000000000000bb | 522.234 | 2.748 | n/a | 0.000 | 0.000 | 2.696 | 498.178 | 0.009 | 9.469 | 9.048 | 0.000 | n/a | n/a | 0.087 | 2.748 | 0.005 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e300000000000000c7 | 358.566 | 1.937 | n/a | 0.000 | 0.000 | 0.507 | 356.048 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.056 | 1.937 | 0.005 | 0.056 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / internal (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 430.640 | n/a | n/a | n/a | 2.575 | n/a | 0.000 | 0.000 | 0.695 | 424.035 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.087 | 2.575 | 0.007 | 0.087 |
| p99 | 1003.490 | n/a | n/a | n/a | 8.226 | n/a | 0.485 | 0.000 | 4.297 | 1001.204 | 0.015 | 8.722 | 0.068 | 0.000 | n/a | n/a | 3.085 | 8.711 | 0.321 | 3.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 668a1ae6ba8114e30000000000000117 | 1003.490 | 0.191 | n/a | 0.000 | 0.000 | 2.238 | 1000.901 | 0.011 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.087 | 0.191 | 0.000 | 0.087 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e30000000000000107 | 1003.416 | 0.147 | n/a | 0.000 | 0.000 | 1.600 | 1000.531 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.112 | 0.147 | 0.000 | 1.112 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000ef | 1002.998 | 0.101 | n/a | 0.000 | 0.000 | 0.695 | 1001.041 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.095 | 0.101 | 0.000 | 1.095 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e300000000000000fd | 1002.919 | 0.118 | n/a | 0.000 | 0.000 | 0.395 | 1001.204 | 0.013 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.129 | 0.118 | 0.000 | 1.129 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e300000000000000ed | 1002.868 | 0.137 | n/a | 0.000 | 0.000 | 0.641 | 1000.928 | 0.010 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.104 | 0.137 | 0.000 | 1.104 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e300000000000000f0 | 1002.821 | 0.126 | n/a | 0.000 | 0.000 | 0.670 | 1000.869 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.094 | 0.126 | 0.000 | 1.094 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000e4 | 1002.566 | 0.128 | n/a | 0.000 | 0.000 | 0.431 | 1000.876 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 1.101 | 0.128 | 0.000 | 1.101 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e30000000000000109 | 1002.435 | 0.111 | n/a | 0.000 | 0.000 | 0.427 | 1000.737 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.110 | 0.111 | 0.000 | 1.110 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e3000000000000010a | 1002.376 | 0.126 | n/a | 0.000 | 0.000 | 0.700 | 1000.429 | 0.005 | 0.000 | 0.014 | 0.000 | n/a | n/a | 1.101 | 0.126 | 0.000 | 1.101 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e300000000000000f7 | 893.803 | 4.759 | n/a | 0.000 | 0.000 | 1.873 | 887.054 | 0.009 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.066 | 4.759 | 0.005 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e300000000000000d9 | 785.805 | 3.528 | n/a | 0.000 | 0.000 | 0.887 | 781.272 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.071 | 3.528 | 0.004 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e300000000000000e9 | 779.337 | 3.545 | n/a | 0.403 | 0.000 | 1.115 | 774.133 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.106 | 3.948 | 0.005 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e300000000000000e8 | 747.813 | 4.984 | n/a | 0.000 | 0.000 | 0.230 | 742.371 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.193 | 4.984 | 0.007 | 0.193 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e30000000000000113 | 737.173 | 5.806 | n/a | 0.000 | 0.000 | 0.769 | 727.472 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 3.085 | 5.806 | 0.008 | 3.085 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000100 | 617.258 | 3.957 | n/a | 0.000 | 0.000 | 0.944 | 612.256 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.068 | 3.957 | 0.006 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000e6 | 606.248 | 2.759 | n/a | 0.000 | 0.000 | 2.735 | 600.605 | 0.015 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.065 | 2.759 | 0.005 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000e1 | 557.694 | 1.737 | n/a | 0.000 | 0.000 | 0.479 | 555.352 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.064 | 1.737 | 0.003 | 0.064 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000114 | 557.345 | 2.575 | n/a | 0.000 | 0.000 | 2.180 | 552.476 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.058 | 2.575 | 0.005 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000000f1 | 494.270 | 3.055 | n/a | 0.000 | 0.000 | 0.502 | 490.600 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.074 | 3.055 | 0.006 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e3000000000000010c | 430.640 | 5.577 | n/a | 0.278 | 0.000 | 0.607 | 424.035 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.109 | 5.854 | 0.014 | 0.109 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 601.528 | n/a | n/a | n/a | 2.136 | n/a | 0.000 | 0.000 | 0.541 | 598.997 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.080 | 2.174 | 0.004 | 0.080 |
| p99 | 1002.916 | n/a | n/a | n/a | 6.715 | n/a | 0.422 | 0.000 | 3.489 | 1001.194 | 0.012 | 0.000 | 0.104 | 0.000 | n/a | n/a | 1.136 | 6.715 | 0.066 | 1.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 668a1ae6ba8114e3000000000000014d | 1002.916 | 0.198 | n/a | 0.000 | 0.000 | 0.977 | 1000.578 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 1.136 | 0.198 | 0.000 | 1.136 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000141 | 1002.892 | 0.137 | n/a | 0.000 | 0.000 | 0.533 | 1001.046 | 0.011 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.106 | 0.137 | 0.000 | 1.106 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e30000000000000149 | 1002.850 | 0.148 | n/a | 0.000 | 0.000 | 0.917 | 1000.645 | 0.006 | 0.000 | 0.026 | 0.000 | n/a | n/a | 1.107 | 0.148 | 0.000 | 1.107 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e3000000000000013a | 1002.794 | 0.110 | n/a | 0.000 | 0.000 | 0.283 | 1001.194 | 0.010 | 0.000 | 0.078 | 0.000 | n/a | n/a | 1.119 | 0.110 | 0.000 | 1.119 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000135 | 1002.772 | 0.171 | n/a | 0.000 | 0.000 | 0.525 | 1000.894 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.118 | 0.171 | 0.000 | 1.118 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e3000000000000011d | 1002.740 | 0.133 | n/a | 0.000 | 0.000 | 0.491 | 1000.898 | 0.012 | 0.000 | 0.104 | 0.000 | n/a | n/a | 1.102 | 0.133 | 0.000 | 1.102 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e3000000000000012e | 1002.588 | 0.141 | n/a | 0.000 | 0.000 | 0.789 | 1000.510 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 1.118 | 0.141 | 0.000 | 1.118 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e3000000000000014f | 1002.574 | 0.134 | n/a | 0.000 | 0.000 | 0.558 | 1000.733 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.095 | 0.134 | 0.000 | 1.095 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000129 | 1002.463 | 0.107 | n/a | 0.000 | 0.000 | 0.506 | 1000.691 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.113 | 0.107 | 0.000 | 1.113 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e30000000000000150 | 1002.299 | 0.117 | n/a | 0.000 | 0.000 | 0.541 | 1000.517 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.098 | 0.117 | 0.000 | 1.098 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e3000000000000014b | 1002.039 | 0.117 | n/a | 0.000 | 0.000 | 0.472 | 1000.333 | 0.008 | 0.000 | 0.009 | 0.000 | n/a | n/a | 1.100 | 0.117 | 0.000 | 1.100 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e3000000000000013b | 967.356 | 2.450 | n/a | 0.000 | 0.000 | 3.489 | 961.307 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.068 | 2.450 | 0.003 | 0.068 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e3000000000000013c | 948.555 | 3.050 | n/a | 0.000 | 0.000 | 0.452 | 944.902 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.122 | 3.050 | 0.003 | 0.122 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e3000000000000012a | 936.030 | 2.386 | n/a | 0.000 | 0.000 | 0.509 | 933.033 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.066 | 2.386 | 0.003 | 0.066 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000000133 | 848.090 | 4.498 | n/a | 0.000 | 0.000 | 3.405 | 840.085 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.069 | 4.498 | 0.005 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e30000000000000124 | 618.795 | 2.389 | n/a | 0.000 | 0.000 | 0.596 | 615.708 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.058 | 2.389 | 0.004 | 0.058 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e3000000000000011c | 601.528 | 1.819 | n/a | 0.000 | 0.000 | 0.605 | 598.997 | 0.006 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.074 | 1.819 | 0.003 | 0.074 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e30000000000000131 | 598.943 | 2.174 | n/a | 0.000 | 0.000 | 0.318 | 596.356 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.064 | 2.174 | 0.004 | 0.064 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e3000000000000014c | 510.177 | 6.715 | n/a | 0.000 | 0.000 | 0.455 | 502.857 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.114 | 6.715 | 0.013 | 0.114 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000122 | 465.533 | 5.222 | n/a | 0.422 | 0.000 | 0.557 | 459.205 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.088 | 5.645 | 0.012 | 0.088 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / internal (742 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.539 | n/a | n/a | n/a | 3.198 | n/a | 0.000 | 0.000 | 0.553 | 9.219 | 0.004 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.079 | 3.198 | 0.274 | 0.079 |
| p99 | 117.099 | n/a | n/a | n/a | 14.318 | n/a | 0.838 | 0.000 | 4.291 | 105.147 | 0.020 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.732 | 14.318 | 0.841 | 0.732 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 668a1ae6ba8114e30000000000000158 | 1004.186 | 0.195 | n/a | 0.000 | 0.000 | 1.979 | 1000.725 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 1.219 | 0.195 | 0.000 | 1.219 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e3000000000000015a | 1002.380 | 0.148 | n/a | 0.000 | 0.000 | 0.587 | 1000.488 | 0.006 | 0.000 | 0.022 | 0.000 | n/a | n/a | 1.128 | 0.148 | 0.000 | 1.128 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000152 | 858.061 | 2.224 | n/a | 0.000 | 0.000 | 0.394 | 855.324 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.065 | 2.224 | 0.003 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e30000000000000151 | 837.386 | 2.364 | n/a | 0.000 | 0.000 | 0.448 | 834.465 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.078 | 2.364 | 0.003 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000156 | 780.772 | 2.357 | n/a | 0.000 | 0.000 | 0.572 | 777.694 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.100 | 2.357 | 0.003 | 0.100 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e30000000000000155 | 250.156 | 2.090 | n/a | 0.000 | 0.000 | 0.674 | 247.259 | 0.011 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.068 | 2.090 | 0.008 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e3000000000000015b | 159.131 | 2.497 | n/a | 0.000 | 0.000 | 0.513 | 156.004 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.078 | 2.497 | 0.016 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e30000000000000223 | 117.099 | 14.389 | n/a | 0.000 | 0.000 | 3.236 | 99.334 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.110 | 14.389 | 0.123 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e3000000000000041d | 111.750 | 6.150 | n/a | 0.000 | 0.000 | 0.293 | 105.147 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.151 | 6.150 | 0.055 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e30000000000000240 | 107.222 | 2.478 | n/a | 0.000 | 0.000 | 0.308 | 104.323 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.064 | 2.478 | 0.023 | 0.064 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e30000000000000688 | 87.075 | 3.037 | n/a | 0.000 | 0.000 | 0.345 | 83.603 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.082 | 3.037 | 0.035 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e3000000000000051f | 86.234 | 3.735 | n/a | 0.000 | 0.000 | 0.366 | 82.052 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.065 | 3.735 | 0.043 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e300000000000006cc | 85.988 | 2.965 | n/a | 0.000 | 0.000 | 0.527 | 82.367 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.116 | 2.965 | 0.034 | 0.116 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e3000000000000059a | 85.785 | 4.461 | n/a | 0.000 | 0.000 | 4.155 | 77.082 | 0.004 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.067 | 4.461 | 0.052 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000000751 | 82.184 | 4.391 | n/a | 0.000 | 0.000 | 0.348 | 77.242 | 0.009 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.149 | 4.391 | 0.053 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e30000000000000426 | 78.244 | 2.698 | n/a | 0.000 | 0.000 | 0.537 | 74.906 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.092 | 2.698 | 0.034 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e300000000000004ba | 78.101 | 2.912 | n/a | 0.000 | 0.000 | 0.362 | 74.683 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.106 | 2.912 | 0.037 | 0.106 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e300000000000003a0 | 77.700 | 3.109 | n/a | 0.000 | 0.000 | 0.294 | 74.238 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.048 | 3.109 | 0.040 | 0.048 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e30000000000000696 | 77.068 | 3.398 | n/a | 0.000 | 0.000 | 0.382 | 73.170 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.094 | 3.398 | 0.044 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e300000000000003c7 | 75.655 | 4.068 | n/a | 0.000 | 0.000 | 0.319 | 71.162 | 0.006 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.076 | 4.068 | 0.054 | 0.076 | gw-r/thread-51/journal/page | none observed |

## P3 / tail / internal (2223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.106 | n/a | n/a | n/a | 4.698 | n/a | 0.000 | 0.000 | 0.477 | 6.971 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.132 | 4.723 | 0.383 | 0.132 |
| p99 | 347.298 | n/a | n/a | n/a | 18.709 | n/a | 1.316 | 0.000 | 5.094 | 341.647 | 0.015 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.701 | 19.499 | 0.855 | 1.701 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 668a1ae6ba8114e3000000000000198a | 1002.637 | 0.238 | n/a | 0.000 | 0.000 | 0.665 | 1000.567 | 0.006 | 0.000 | 0.019 | 0.000 | n/a | n/a | 1.143 | 0.238 | 0.000 | 1.143 | gw-r/thread-68/journal/page | none observed |
| 668a1ae6ba8114e300000000000019c0 | 1002.560 | 0.201 | n/a | 0.000 | 0.000 | 0.493 | 1000.685 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.136 | 0.201 | 0.000 | 1.136 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000001985 | 1002.321 | 0.255 | n/a | 0.000 | 0.000 | 0.577 | 1000.305 | 0.004 | 0.000 | 0.012 | 0.000 | n/a | n/a | 1.169 | 0.255 | 0.000 | 1.169 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e30000000000001981 | 1002.288 | 0.104 | n/a | 0.000 | 0.000 | 0.397 | 1000.638 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.100 | 0.104 | 0.000 | 1.100 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e300000000000019c4 | 1002.287 | 0.157 | n/a | 0.000 | 0.000 | 0.442 | 1000.543 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 1.112 | 0.157 | 0.000 | 1.112 | gw-r/thread-62/journal/page | none observed |
| 668a1ae6ba8114e30000000000001983 | 1002.272 | 0.173 | n/a | 0.000 | 0.000 | 0.514 | 1000.431 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 1.135 | 0.173 | 0.000 | 1.135 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e300000000000019bc | 1002.222 | 0.158 | n/a | 0.000 | 0.000 | 0.436 | 1000.467 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.125 | 0.158 | 0.000 | 1.125 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e300000000000019a3 | 1002.187 | 0.096 | n/a | 0.000 | 0.000 | 0.393 | 1000.566 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.097 | 0.096 | 0.000 | 1.097 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000019b8 | 1001.974 | 0.119 | n/a | 0.000 | 0.000 | 0.335 | 1000.398 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 1.095 | 0.119 | 0.000 | 1.095 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e3000000000000199f | 1001.880 | 0.109 | n/a | 0.000 | 0.000 | 0.384 | 1000.291 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 1.081 | 0.109 | 0.000 | 1.081 | gw-r/thread-49/journal/page | none observed |
| 668a1ae6ba8114e30000000000001994 | 970.198 | 8.588 | n/a | 0.000 | 0.000 | 0.429 | 960.832 | 0.007 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.307 | 8.588 | 0.009 | 0.307 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e300000000000019b0 | 917.136 | 2.233 | n/a | 0.000 | 0.000 | 0.265 | 914.566 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.055 | 2.233 | 0.002 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e30000000000001984 | 809.707 | 9.251 | n/a | 0.000 | 0.000 | 0.551 | 799.562 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.322 | 9.251 | 0.011 | 0.322 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e300000000000019be | 725.597 | 4.582 | n/a | 0.000 | 0.000 | 0.891 | 719.988 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.107 | 4.582 | 0.006 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e3000000000000199e | 710.578 | 3.515 | n/a | 0.000 | 0.000 | 0.830 | 706.041 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.138 | 3.515 | 0.005 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 668a1ae6ba8114e30000000000001999 | 695.774 | 9.729 | n/a | 0.908 | 0.000 | 0.991 | 683.799 | 0.007 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.323 | 10.637 | 0.015 | 0.323 | gw-r/thread-50/journal/page | none observed |
| 668a1ae6ba8114e3000000000000198c | 634.260 | 4.317 | n/a | 0.000 | 0.000 | 0.419 | 629.370 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.128 | 4.317 | 0.007 | 0.128 | gw-r/thread-51/journal/page | none observed |
| 668a1ae6ba8114e300000000000019b3 | 632.997 | 4.373 | n/a | 0.000 | 0.000 | 0.675 | 627.777 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.139 | 4.373 | 0.007 | 0.139 | gw-r/thread-52/journal/page | none observed |
| 668a1ae6ba8114e300000000000019ba | 458.956 | 2.198 | n/a | 0.000 | 0.000 | 0.604 | 456.067 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.072 | 2.198 | 0.005 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 668a1ae6ba8114e300000000000019c1 | 458.228 | 6.469 | n/a | 0.000 | 0.000 | 0.637 | 450.787 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.272 | 6.469 | 0.014 | 0.272 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / read (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.865 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 1.014 | 201.268 | 0.017 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.084 | 0.040 | 0.000 | 0.084 |
| p99 | 207.539 | n/a | n/a | n/a | 0.120 | n/a | 0.000 | 0.000 | 4.618 | 206.274 | 0.264 | 0.000 | 1.522 | 0.000 | n/a | n/a | 0.271 | 0.120 | 0.001 | 0.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeb3eb71579cbcc90000000000000008 | 207.539 | 0.044 | n/a | 0.000 | 0.000 | 1.683 | 205.311 | 0.054 | 0.000 | 0.355 | 0.000 | n/a | n/a | 0.092 | 0.044 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000014 | 207.463 | 0.120 | n/a | 0.000 | 0.000 | 4.618 | 202.354 | 0.062 | 0.000 | 0.234 | 0.000 | n/a | n/a | 0.076 | 0.120 | 0.001 | 0.076 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000032 | 207.267 | 0.033 | n/a | 0.000 | 0.000 | 0.776 | 206.274 | 0.015 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.079 | 0.033 | 0.000 | 0.079 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000017 | 206.445 | 0.037 | n/a | 0.000 | 0.000 | 1.085 | 205.071 | 0.014 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.091 | 0.037 | 0.000 | 0.091 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc9000000000000003c | 206.435 | 0.035 | n/a | 0.000 | 0.000 | 1.355 | 204.877 | 0.011 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.084 | 0.035 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| aeb3eb71579cbcc90000000000000031 | 205.680 | 0.047 | n/a | 0.000 | 0.000 | 3.293 | 201.860 | 0.035 | 0.000 | 0.332 | 0.000 | n/a | n/a | 0.112 | 0.047 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| aeb3eb71579cbcc90000000000000019 | 205.604 | 0.040 | n/a | 0.000 | 0.000 | 3.002 | 202.175 | 0.049 | 0.000 | 0.249 | 0.000 | n/a | n/a | 0.090 | 0.040 | 0.000 | 0.090 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc9000000000000002f | 205.537 | 0.032 | n/a | 0.000 | 0.000 | 0.772 | 204.481 | 0.017 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.083 | 0.032 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc9000000000000004d | 205.394 | 0.029 | n/a | 0.000 | 0.000 | 1.180 | 203.954 | 0.023 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.070 | 0.029 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000016 | 205.174 | 0.029 | n/a | 0.000 | 0.000 | 3.809 | 201.077 | 0.031 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.062 | 0.029 | 0.000 | 0.062 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000050 | 204.975 | 0.067 | n/a | 0.000 | 0.000 | 2.032 | 202.491 | 0.023 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.190 | 0.067 | 0.000 | 0.190 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc9000000000000000b | 204.723 | 0.067 | n/a | 0.000 | 0.000 | 1.303 | 202.984 | 0.018 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.154 | 0.067 | 0.000 | 0.154 | gw-r/thread-48/journal/page | none observed |
| aeb3eb71579cbcc9000000000000000c | 204.608 | 0.031 | n/a | 0.000 | 0.000 | 1.612 | 202.669 | 0.016 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.080 | 0.031 | 0.000 | 0.080 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000013 | 204.595 | 0.054 | n/a | 0.000 | 0.000 | 1.014 | 203.242 | 0.025 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.096 | 0.054 | 0.000 | 0.096 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc9000000000000003b | 204.295 | 0.047 | n/a | 0.000 | 0.000 | 3.025 | 200.943 | 0.015 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.132 | 0.047 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000024 | 204.156 | 0.041 | n/a | 0.000 | 0.000 | 2.351 | 201.253 | 0.264 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.093 | 0.041 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000009 | 204.054 | 0.033 | n/a | 0.000 | 0.000 | 1.652 | 201.945 | 0.022 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.271 | 0.033 | 0.000 | 0.271 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000033 | 204.003 | 0.034 | n/a | 0.000 | 0.000 | 0.759 | 202.864 | 0.026 | 0.000 | 0.241 | 0.000 | n/a | n/a | 0.079 | 0.034 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000011 | 203.751 | 0.029 | n/a | 0.000 | 0.000 | 2.528 | 200.950 | 0.033 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| aeb3eb71579cbcc90000000000000042 | 203.750 | 0.042 | n/a | 0.000 | 0.000 | 2.647 | 200.835 | 0.014 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.089 | 0.042 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / read (84 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.344 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.912 | 201.076 | 0.015 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.091 | 0.040 | 0.000 | 0.091 |
| p99 | 221.006 | n/a | n/a | n/a | 0.076 | n/a | 0.000 | 0.000 | 4.941 | 220.104 | 11.683 | 6.761 | 2.589 | 0.000 | n/a | n/a | 0.190 | 0.076 | 0.001 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeb3eb71579cbcc90000000000000068 | 221.006 | 0.027 | n/a | 0.000 | 0.000 | 0.654 | 220.104 | 0.036 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.071 | 0.027 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000097 | 211.756 | 0.051 | n/a | 0.000 | 0.000 | 0.985 | 210.299 | 0.027 | 0.000 | 0.253 | 0.000 | n/a | n/a | 0.141 | 0.051 | 0.000 | 0.141 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc9000000000000007a | 207.139 | 0.045 | n/a | 0.000 | 0.000 | 1.029 | 205.471 | 0.338 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.102 | 0.045 | 0.000 | 0.102 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc9000000000000005c | 206.249 | 0.051 | n/a | 0.000 | 0.000 | 4.941 | 201.000 | 0.013 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.130 | 0.051 | 0.000 | 0.130 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000077 | 206.000 | 0.052 | n/a | 0.000 | 0.000 | 1.265 | 204.433 | 0.013 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.134 | 0.052 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| aeb3eb71579cbcc90000000000000070 | 205.371 | 0.029 | n/a | 0.000 | 0.000 | 0.912 | 204.199 | 0.015 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000086 | 205.136 | 0.030 | n/a | 0.000 | 0.000 | 4.024 | 200.877 | 0.013 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc9000000000000009b | 205.083 | 0.042 | n/a | 0.000 | 0.000 | 3.565 | 201.218 | 0.013 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.110 | 0.042 | 0.000 | 0.110 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc9000000000000007e | 205.028 | 0.032 | n/a | 0.000 | 0.000 | 3.988 | 200.836 | 0.012 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000069 | 204.350 | 0.053 | n/a | 0.000 | 0.000 | 1.029 | 202.895 | 0.025 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.149 | 0.053 | 0.000 | 0.149 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000054 | 203.905 | 0.041 | n/a | 0.000 | 0.000 | 2.753 | 200.932 | 0.017 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.096 | 0.041 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc9000000000000005d | 203.723 | 0.030 | n/a | 0.000 | 0.000 | 0.971 | 201.105 | 0.054 | 0.000 | 1.489 | 0.000 | n/a | n/a | 0.074 | 0.030 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000072 | 203.630 | 0.039 | n/a | 0.000 | 0.000 | 0.899 | 202.417 | 0.055 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.082 | 0.039 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000075 | 203.623 | 0.049 | n/a | 0.000 | 0.000 | 1.303 | 201.970 | 0.013 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.132 | 0.049 | 0.000 | 0.132 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000066 | 203.335 | 0.036 | n/a | 0.000 | 0.000 | 1.036 | 202.025 | 0.014 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.113 | 0.036 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| aeb3eb71579cbcc90000000000000056 | 203.330 | 0.060 | n/a | 0.000 | 0.000 | 1.146 | 201.672 | 0.028 | 0.000 | 0.267 | 0.000 | n/a | n/a | 0.157 | 0.060 | 0.000 | 0.157 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000080 | 203.253 | 0.029 | n/a | 0.000 | 0.000 | 0.910 | 202.103 | 0.013 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.070 | 0.029 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc9000000000000006b | 203.220 | 0.041 | n/a | 0.000 | 0.000 | 0.774 | 202.096 | 0.022 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.123 | 0.041 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000062 | 203.212 | 0.031 | n/a | 0.000 | 0.000 | 2.161 | 200.841 | 0.020 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc9000000000000005f | 203.211 | 0.032 | n/a | 0.000 | 0.000 | 1.333 | 201.665 | 0.011 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (83 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.339 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.842 | 201.150 | 0.013 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.079 | 0.037 | 0.000 | 0.079 |
| p99 | 207.780 | n/a | n/a | n/a | 0.069 | n/a | 0.000 | 0.000 | 4.210 | 206.215 | 12.166 | 14.438 | 0.281 | 0.000 | n/a | n/a | 0.193 | 0.069 | 0.001 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeb3eb71579cbcc900000000000000d5 | 207.780 | 0.060 | n/a | 0.000 | 0.000 | 4.210 | 203.251 | 0.010 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.143 | 0.060 | 0.000 | 0.143 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc900000000000000df | 207.723 | 0.059 | n/a | 0.000 | 0.000 | 1.232 | 206.215 | 0.015 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.081 | 0.059 | 0.000 | 0.081 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc9000000000000010b | 206.276 | 0.031 | n/a | 0.000 | 0.000 | 0.855 | 205.206 | 0.011 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc900000000000000f4 | 206.243 | 0.038 | n/a | 0.000 | 0.000 | 1.496 | 204.470 | 0.014 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.096 | 0.038 | 0.000 | 0.096 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc900000000000000c8 | 206.160 | 0.045 | n/a | 0.000 | 0.000 | 1.000 | 204.896 | 0.009 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.129 | 0.045 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc900000000000000cc | 206.030 | 0.031 | n/a | 0.000 | 0.000 | 0.881 | 204.892 | 0.013 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc900000000000000fd | 205.810 | 0.045 | n/a | 0.000 | 0.000 | 0.821 | 204.639 | 0.017 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.132 | 0.045 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc900000000000000d7 | 205.790 | 0.040 | n/a | 0.000 | 0.000 | 0.918 | 204.573 | 0.017 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.088 | 0.040 | 0.000 | 0.088 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc900000000000000c0 | 205.680 | 0.031 | n/a | 0.000 | 0.000 | 0.718 | 204.633 | 0.026 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.079 | 0.031 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc900000000000000c2 | 205.679 | 0.031 | n/a | 0.000 | 0.000 | 4.131 | 201.263 | 0.012 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.122 | 0.031 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc900000000000000e0 | 205.187 | 0.034 | n/a | 0.000 | 0.000 | 0.379 | 204.533 | 0.028 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc900000000000000b4 | 204.662 | 0.044 | n/a | 0.000 | 0.000 | 0.947 | 201.203 | 2.213 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.118 | 0.044 | 0.000 | 0.118 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc900000000000000c9 | 204.659 | 0.028 | n/a | 0.000 | 0.000 | 1.926 | 202.521 | 0.011 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.070 | 0.028 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc900000000000000f2 | 204.298 | 0.031 | n/a | 0.000 | 0.000 | 3.121 | 200.983 | 0.011 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.069 | 0.031 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc900000000000000b8 | 204.083 | 0.039 | n/a | 0.000 | 0.000 | 1.374 | 202.282 | 0.022 | 0.000 | 0.281 | 0.000 | n/a | n/a | 0.086 | 0.039 | 0.000 | 0.086 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc900000000000000f7 | 203.954 | 0.042 | n/a | 0.000 | 0.000 | 0.624 | 203.029 | 0.017 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.089 | 0.042 | 0.000 | 0.089 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc900000000000000ba | 203.892 | 0.044 | n/a | 0.000 | 0.000 | 1.098 | 202.541 | 0.010 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.124 | 0.044 | 0.000 | 0.124 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc900000000000000c7 | 203.625 | 0.045 | n/a | 0.000 | 0.000 | 2.310 | 200.997 | 0.032 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.081 | 0.045 | 0.000 | 0.081 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc900000000000000f3 | 203.254 | 0.042 | n/a | 0.000 | 0.000 | 1.644 | 201.324 | 0.018 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.088 | 0.042 | 0.000 | 0.088 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc900000000000000db | 203.127 | 0.033 | n/a | 0.000 | 0.000 | 1.084 | 201.698 | 0.031 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.081 | 0.033 | 0.000 | 0.081 | gw-r/thread-50/journal/page | none observed |

## P3 / L16 / read (85 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.971 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.719 | 200.987 | 0.009 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.085 | 0.042 | 0.000 | 0.085 |
| p99 | 211.831 | n/a | n/a | n/a | 0.090 | n/a | 0.000 | 0.000 | 3.310 | 210.827 | 5.894 | 0.000 | 0.439 | 0.000 | n/a | n/a | 0.212 | 0.090 | 0.001 | 0.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeb3eb71579cbcc90000000000000125 | 211.831 | 0.032 | n/a | 0.000 | 0.000 | 0.681 | 210.827 | 0.063 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000145 | 207.545 | 0.032 | n/a | 0.000 | 0.000 | 0.577 | 206.795 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.074 | 0.032 | 0.000 | 0.074 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000112 | 206.195 | 0.029 | n/a | 0.000 | 0.000 | 0.772 | 205.103 | 0.069 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.071 | 0.029 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000140 | 206.030 | 0.033 | n/a | 0.000 | 0.000 | 0.973 | 204.835 | 0.009 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000141 | 205.940 | 0.048 | n/a | 0.000 | 0.000 | 0.928 | 204.760 | 0.016 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.101 | 0.048 | 0.000 | 0.101 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000149 | 204.928 | 0.040 | n/a | 0.000 | 0.000 | 0.429 | 204.292 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000118 | 204.721 | 0.031 | n/a | 0.000 | 0.000 | 3.310 | 200.853 | 0.016 | 0.000 | 0.439 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000157 | 204.327 | 0.048 | n/a | 0.000 | 0.000 | 0.523 | 203.602 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.095 | 0.048 | 0.000 | 0.095 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000127 | 204.116 | 0.041 | n/a | 0.000 | 0.000 | 3.045 | 200.815 | 0.020 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.085 | 0.041 | 0.000 | 0.085 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000123 | 203.925 | 0.029 | n/a | 0.000 | 0.000 | 0.674 | 203.019 | 0.010 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.072 | 0.029 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000122 | 203.905 | 0.042 | n/a | 0.000 | 0.000 | 0.791 | 202.894 | 0.008 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.087 | 0.042 | 0.000 | 0.087 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc9000000000000014d | 203.903 | 0.063 | n/a | 0.000 | 0.000 | 1.091 | 202.541 | 0.009 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.132 | 0.063 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000161 | 203.465 | 0.076 | n/a | 0.000 | 0.000 | 1.377 | 201.720 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.212 | 0.076 | 0.000 | 0.212 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc9000000000000014c | 203.453 | 0.064 | n/a | 0.000 | 0.000 | 2.005 | 201.148 | 0.011 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.147 | 0.064 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000137 | 202.932 | 0.033 | n/a | 0.000 | 0.000 | 0.784 | 201.880 | 0.013 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000163 | 202.926 | 0.037 | n/a | 0.000 | 0.000 | 1.042 | 201.611 | 0.062 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.084 | 0.037 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000158 | 202.797 | 0.061 | n/a | 0.000 | 0.000 | 1.374 | 201.134 | 0.007 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.143 | 0.061 | 0.000 | 0.143 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000147 | 202.673 | 0.054 | n/a | 0.000 | 0.000 | 1.180 | 201.235 | 0.019 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.113 | 0.054 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000169 | 202.558 | 0.045 | n/a | 0.000 | 0.000 | 0.831 | 201.479 | 0.011 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.088 | 0.045 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000111 | 202.498 | 0.039 | n/a | 0.000 | 0.000 | 0.501 | 201.652 | 0.020 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.086 | 0.039 | 0.000 | 0.086 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.570 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.629 | 200.718 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 |
| p99 | 205.346 | n/a | n/a | n/a | 0.078 | n/a | 0.000 | 0.000 | 4.728 | 203.335 | 6.251 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.200 | 0.078 | 0.001 | 0.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeb3eb71579cbcc90000000000000197 | 206.073 | 0.050 | n/a | 0.000 | 0.000 | 4.728 | 201.093 | 0.008 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.124 | 0.050 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc9000000000000019b | 205.346 | 0.052 | n/a | 0.000 | 0.000 | 0.633 | 204.464 | 0.006 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.135 | 0.052 | 0.000 | 0.135 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc900000000000001a3 | 205.052 | 0.032 | n/a | 0.000 | 0.000 | 4.115 | 200.767 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc9000000000000018f | 204.452 | 0.078 | n/a | 0.000 | 0.000 | 3.197 | 201.014 | 0.010 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.077 | 0.078 | 0.000 | 0.077 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc900000000000001d1 | 204.433 | 0.030 | n/a | 0.000 | 0.000 | 3.536 | 200.742 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.070 | 0.030 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000195 | 204.342 | 0.047 | n/a | 0.000 | 0.000 | 3.415 | 200.706 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.121 | 0.047 | 0.000 | 0.121 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000183 | 204.003 | 0.032 | n/a | 0.000 | 0.000 | 0.532 | 203.335 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.070 | 0.032 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc900000000000001ba | 203.249 | 0.071 | n/a | 0.000 | 0.000 | 1.680 | 201.229 | 0.008 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.170 | 0.071 | 0.000 | 0.170 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc900000000000001c2 | 203.095 | 0.041 | n/a | 0.000 | 0.000 | 2.458 | 200.494 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.078 | 0.041 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc900000000000001a4 | 202.699 | 0.033 | n/a | 0.000 | 0.000 | 0.552 | 202.010 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc900000000000001cd | 202.696 | 0.029 | n/a | 0.000 | 0.000 | 2.038 | 200.520 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.073 | 0.029 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc9000000000000018d | 202.666 | 0.076 | n/a | 0.000 | 0.000 | 1.175 | 201.140 | 0.012 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.200 | 0.076 | 0.000 | 0.200 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc900000000000001d4 | 202.626 | 0.030 | n/a | 0.000 | 0.000 | 1.583 | 200.869 | 0.013 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.064 | 0.030 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc900000000000001ce | 202.592 | 0.020 | n/a | 0.000 | 0.000 | 0.852 | 201.526 | 0.011 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.040 | 0.020 | 0.000 | 0.040 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000198 | 202.586 | 0.042 | n/a | 0.000 | 0.000 | 0.607 | 201.681 | 0.027 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.116 | 0.042 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000194 | 202.532 | 0.035 | n/a | 0.000 | 0.000 | 1.016 | 201.340 | 0.009 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.057 | 0.035 | 0.000 | 0.057 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc900000000000001a5 | 202.529 | 0.048 | n/a | 0.000 | 0.000 | 1.280 | 201.021 | 0.007 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.107 | 0.048 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc900000000000001bc | 202.528 | 0.040 | n/a | 0.000 | 0.000 | 0.911 | 201.359 | 0.027 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.086 | 0.040 | 0.000 | 0.086 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc900000000000001be | 202.506 | 0.097 | n/a | 0.000 | 0.000 | 1.206 | 200.911 | 0.010 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.220 | 0.097 | 0.000 | 0.220 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc900000000000001cf | 202.489 | 0.041 | n/a | 0.000 | 0.000 | 0.554 | 201.656 | 0.015 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.099 | 0.041 | 0.000 | 0.099 | gw-r/thread-51/journal/page | none observed |

## P3 / L256 / read (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.607 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.669 | 200.717 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.079 | 0.040 | 0.000 | 0.079 |
| p99 | 206.922 | n/a | n/a | n/a | 0.099 | n/a | 0.000 | 0.000 | 6.168 | 204.798 | 7.074 | 0.000 | 1.198 | 0.000 | n/a | n/a | 0.208 | 0.099 | 0.001 | 0.208 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeb3eb71579cbcc90000000000000202 | 206.922 | 0.041 | n/a | 0.000 | 0.000 | 6.168 | 200.576 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.090 | 0.041 | 0.000 | 0.090 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000212 | 206.250 | 0.031 | n/a | 0.000 | 0.000 | 1.599 | 204.490 | 0.022 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.063 | 0.031 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc900000000000001ea | 205.770 | 0.034 | n/a | 0.000 | 0.000 | 0.811 | 204.798 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.070 | 0.034 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc900000000000001f7 | 203.503 | 0.050 | n/a | 0.000 | 0.000 | 0.607 | 202.667 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.118 | 0.050 | 0.000 | 0.118 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc9000000000000023b | 203.178 | 0.047 | n/a | 0.000 | 0.000 | 0.854 | 202.002 | 0.018 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.113 | 0.047 | 0.000 | 0.113 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000226 | 202.850 | 0.033 | n/a | 0.000 | 0.000 | 2.046 | 200.655 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.069 | 0.033 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc900000000000001e0 | 202.792 | 0.060 | n/a | 0.000 | 0.000 | 1.226 | 201.229 | 0.012 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.160 | 0.060 | 0.000 | 0.160 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000235 | 202.585 | 0.044 | n/a | 0.000 | 0.000 | 0.937 | 201.375 | 0.010 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.106 | 0.044 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000211 | 202.398 | 0.054 | n/a | 0.000 | 0.000 | 1.025 | 201.103 | 0.009 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.131 | 0.054 | 0.000 | 0.131 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000236 | 202.366 | 0.050 | n/a | 0.000 | 0.000 | 0.926 | 201.177 | 0.010 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.117 | 0.050 | 0.000 | 0.117 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000219 | 202.216 | 0.036 | n/a | 0.000 | 0.000 | 0.830 | 201.153 | 0.021 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.094 | 0.036 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc900000000000001e5 | 202.213 | 0.032 | n/a | 0.000 | 0.000 | 0.540 | 201.450 | 0.012 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc900000000000001e7 | 202.159 | 0.034 | n/a | 0.000 | 0.000 | 0.970 | 200.990 | 0.012 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000209 | 202.124 | 0.096 | n/a | 0.000 | 0.000 | 0.948 | 200.814 | 0.009 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.208 | 0.096 | 0.000 | 0.208 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000215 | 202.116 | 0.040 | n/a | 0.000 | 0.000 | 0.939 | 200.961 | 0.006 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.101 | 0.040 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000210 | 202.070 | 0.056 | n/a | 0.000 | 0.000 | 0.801 | 200.999 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.120 | 0.056 | 0.000 | 0.120 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000218 | 202.054 | 0.024 | n/a | 0.000 | 0.000 | 0.477 | 201.391 | 0.012 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.047 | 0.024 | 0.000 | 0.047 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000208 | 202.041 | 0.035 | n/a | 0.000 | 0.000 | 0.776 | 201.013 | 0.007 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.079 | 0.035 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000213 | 202.027 | 0.048 | n/a | 0.000 | 0.000 | 0.855 | 200.972 | 0.007 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.117 | 0.048 | 0.000 | 0.117 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000234 | 202.026 | 0.048 | n/a | 0.000 | 0.000 | 0.537 | 200.155 | 0.011 | 0.000 | 1.198 | 0.000 | n/a | n/a | 0.076 | 0.048 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (71 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.777 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 0.511 | 68.145 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.067 | 0.048 | 0.001 | 0.067 |
| p99 | 205.492 | n/a | n/a | n/a | 0.110 | n/a | 0.000 | 0.000 | 2.806 | 204.872 | 4.618 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.211 | 0.110 | 0.006 | 0.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeb3eb71579cbcc90000000000000250 | 205.492 | 0.031 | n/a | 0.000 | 0.000 | 0.464 | 204.872 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.063 | 0.031 | 0.000 | 0.063 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000254 | 205.409 | 0.040 | n/a | 0.000 | 0.000 | 0.724 | 204.459 | 0.020 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000247 | 203.981 | 0.040 | n/a | 0.000 | 0.000 | 0.636 | 203.163 | 0.009 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.086 | 0.040 | 0.000 | 0.086 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000257 | 202.268 | 0.074 | n/a | 0.000 | 0.000 | 0.900 | 201.089 | 0.008 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.110 | 0.074 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000244 | 202.264 | 0.088 | n/a | 0.000 | 0.000 | 1.341 | 200.589 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.211 | 0.088 | 0.000 | 0.211 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc9000000000000024c | 201.980 | 0.048 | n/a | 0.000 | 0.000 | 0.775 | 201.000 | 0.009 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.081 | 0.048 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc9000000000000024e | 201.962 | 0.045 | n/a | 0.000 | 0.000 | 0.877 | 200.869 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.104 | 0.045 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000256 | 201.814 | 0.055 | n/a | 0.000 | 0.000 | 0.768 | 200.769 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.133 | 0.055 | 0.000 | 0.133 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000255 | 201.752 | 0.041 | n/a | 0.000 | 0.000 | 0.795 | 200.775 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000258 | 201.741 | 0.035 | n/a | 0.000 | 0.000 | 0.426 | 201.114 | 0.014 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.067 | 0.035 | 0.000 | 0.067 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000248 | 201.730 | 0.032 | n/a | 0.000 | 0.000 | 0.374 | 201.158 | 0.011 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.070 | 0.032 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000252 | 201.714 | 0.074 | n/a | 0.000 | 0.000 | 0.793 | 200.650 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.132 | 0.074 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000241 | 201.571 | 0.030 | n/a | 0.000 | 0.000 | 0.462 | 201.003 | 0.004 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.058 | 0.030 | 0.000 | 0.058 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc9000000000000024a | 201.463 | 0.031 | n/a | 0.000 | 0.000 | 0.424 | 200.869 | 0.009 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc9000000000000024d | 201.458 | 0.039 | n/a | 0.000 | 0.000 | 0.537 | 200.745 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.072 | 0.039 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000253 | 201.401 | 0.039 | n/a | 0.000 | 0.000 | 0.508 | 200.732 | 0.009 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000246 | 201.365 | 0.046 | n/a | 0.000 | 0.000 | 0.572 | 200.606 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.086 | 0.046 | 0.000 | 0.086 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000251 | 201.365 | 0.035 | n/a | 0.000 | 0.000 | 0.595 | 200.584 | 0.009 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000243 | 201.331 | 0.044 | n/a | 0.000 | 0.000 | 0.491 | 200.669 | 0.007 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.087 | 0.044 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000242 | 201.170 | 0.025 | n/a | 0.000 | 0.000 | 0.362 | 200.668 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.062 | 0.025 | 0.000 | 0.062 | gw-r/thread-51/journal/page | none observed |

## P3 / tail / read (215 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.741 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.488 | 88.142 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.063 | 0.039 | 0.000 | 0.063 |
| p99 | 202.261 | n/a | n/a | n/a | 0.100 | n/a | 0.000 | 0.000 | 2.931 | 201.198 | 0.014 | 10.008 | 0.089 | 0.000 | n/a | n/a | 0.165 | 0.100 | 0.002 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aeb3eb71579cbcc90000000000000e59 | 204.978 | 0.032 | n/a | 0.000 | 0.000 | 3.731 | 201.078 | 0.011 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-52/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e4b | 202.378 | 0.032 | n/a | 0.000 | 0.000 | 0.684 | 201.492 | 0.011 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e96 | 202.261 | 0.071 | n/a | 0.000 | 0.000 | 0.792 | 201.132 | 0.011 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.173 | 0.071 | 0.000 | 0.173 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e8b | 202.254 | 0.030 | n/a | 0.000 | 0.000 | 0.725 | 201.305 | 0.013 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.084 | 0.030 | 0.000 | 0.084 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e97 | 202.202 | 0.043 | n/a | 0.000 | 0.000 | 1.004 | 200.991 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.095 | 0.043 | 0.000 | 0.095 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e91 | 201.903 | 0.058 | n/a | 0.000 | 0.000 | 1.159 | 200.505 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.133 | 0.058 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e5a | 201.893 | 0.031 | n/a | 0.000 | 0.000 | 0.475 | 201.198 | 0.012 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.089 | 0.031 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e58 | 201.870 | 0.022 | n/a | 0.000 | 0.000 | 0.759 | 200.966 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.057 | 0.022 | 0.000 | 0.057 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000ea4 | 201.833 | 0.049 | n/a | 0.000 | 0.000 | 0.868 | 200.762 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.107 | 0.049 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e64 | 201.825 | 0.024 | n/a | 0.000 | 0.000 | 0.537 | 201.119 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.069 | 0.024 | 0.000 | 0.069 | gw-r/thread-45/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e8d | 201.779 | 0.070 | n/a | 0.000 | 0.000 | 0.845 | 200.679 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.137 | 0.070 | 0.000 | 0.137 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e6c | 201.777 | 0.035 | n/a | 0.000 | 0.000 | 0.458 | 201.101 | 0.011 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.088 | 0.035 | 0.000 | 0.088 | gw-r/thread-51/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e80 | 201.729 | 0.033 | n/a | 0.000 | 0.000 | 0.806 | 200.772 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e9f | 201.727 | 0.052 | n/a | 0.000 | 0.000 | 0.714 | 200.784 | 0.009 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.099 | 0.052 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000ea3 | 201.717 | 0.043 | n/a | 0.000 | 0.000 | 0.739 | 200.790 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.092 | 0.043 | 0.000 | 0.092 | gw-r/thread-62/journal/page | none observed |
| aeb3eb71579cbcc90000000000000eb0 | 201.711 | 0.027 | n/a | 0.000 | 0.000 | 0.581 | 200.977 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.065 | 0.027 | 0.000 | 0.065 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e4d | 201.706 | 0.034 | n/a | 0.000 | 0.000 | 0.578 | 200.915 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.119 | 0.034 | 0.000 | 0.119 | gw-r/thread-68/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e99 | 201.705 | 0.051 | n/a | 0.000 | 0.000 | 0.958 | 200.597 | 0.003 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.070 | 0.051 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e73 | 201.693 | 0.029 | n/a | 0.000 | 0.000 | 0.688 | 200.844 | 0.014 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-68/journal/page | none observed |
| aeb3eb71579cbcc90000000000000e79 | 201.677 | 0.042 | n/a | 0.000 | 0.000 | 0.848 | 200.684 | 0.002 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.068 | 0.042 | 0.000 | 0.068 | gw-r/thread-68/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.009 ms; post-ACK p50/p99: 0.371/1.828 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.348 | 10.869 | 10.664 | reported |
| All-primary p99 ms | 48.241 | 47.448 | 47.238 | <=50 |
| L256 5-10 p50Ms | 19.583 | 19.199 | 19.199 | <=10 |
| L256 5-10 p99Ms | 115.036 | 114.639 | 113.419 | <=50 |
| L256 11-25 p50Ms | 24.703 | 24.191 | 24.191 | <=10 |
| L256 11-25 p99Ms | 27.448 | 26.971 | 26.969 | <=50 |
| L256 26-50 p50Ms | 17.279 | 16.511 | 16.511 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 26.948 | 26.031 | 26.029 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.791 | 9.471 | 9.343 | <=10 |
| Burst 11-25 p50 ms | 12.031 | 11.263 | 11.199 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 115.036 | 114.639 | 113.419 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 97.655 | 97.386 | 97.385 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 8 | 26.894/61.876 | 25.977 | 16.713 | 38.992 | 0.112/0.035 |
| 5-10 | >=1000 | 31 | 17.449/110.775 | 16.918 | 11.833 | 28.199 | 0.089/0.027 |
| 5-10 | 250-1000 | 36 | 19.350/113.727 | 18.509 | 12.268 | 31.104 | 0.068/0.021 |
| 11-25 | 250-1000 | 22 | 18.814/47.520 | 18.341 | 11.866 | 29.826 | 0.086/0.021 |
| 5-10 | 100-250 | 14 | 13.973/37.413 | 13.460 | 9.174 | 19.060 | 0.081/0.019 |
| 11-25 | >=1000 | 13 | 28.761/144.140 | 28.265 | 21.007 | 48.506 | 0.077/0.021 |
| 26-50 | 250-1000 | 8 | 30.493/47.803 | 29.842 | 13.318 | 49.141 | 0.141/0.022 |
| 11-25 | 100-250 | 8 | 14.344/22.741 | 13.968 | 8.667 | 19.875 | 0.078/0.021 |
| 11-25 | overlap | 371 | 13.143/46.556 | 12.670 | 8.172 | 18.766 | 0.040/0.016 |
| 5-10 | 0-50 | 1136 | 8.479/26.476 | 8.163 | 4.894 | 11.935 | 0.040/0.016 |
| 5-10 | 50-100 | 59 | 9.002/121.508 | 8.517 | 4.857 | 12.225 | 0.047/0.016 |
| 11-25 | 0-50 | 534 | 10.518/29.683 | 9.888 | 5.812 | 14.060 | 0.046/0.016 |
| 26-50 | overlap | 143 | 16.352/44.061 | 15.446 | 8.775 | 21.697 | 0.057/0.017 |
| 11-25 | 50-100 | 38 | 11.599/23.822 | 11.022 | 6.481 | 15.639 | 0.057/0.016 |
| 5-10 | overlap | 789 | 10.589/36.105 | 10.319 | 6.776 | 15.047 | 0.035/0.015 |
| 26-50 | 0-50 | 199 | 14.273/46.724 | 13.266 | 7.472 | 19.011 | 0.058/0.017 |
| 26-50 | 50-100 | 11 | 14.125/33.931 | 12.344 | 6.859 | 17.231 | 0.077/0.018 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 880 | 16 | 1240.356 |
| burst | 2540 | 12 | 911.906 |

## Writer heap, GC and scheduler stalls

Source f9a84dcb52993e2ceff0210533d12e885ceb6d0d; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 99.754 / 263.099 |
| GC events / total duration / maximum ms | 642 / 826.161 / 12.480 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":616,"4":13,"8":13} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 48.241 / 28 / 2152.262 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

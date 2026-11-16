# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (82.284 ms, trace `6aba8157a721bdb4000000000000006d`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (126.005 ms, trace `6aba8157a721bdb40000000000001a4e`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (71.363 ms, trace `6aba8157a721bdb400000000000000ad`); `node-14/thread-0/driver.queue.subject` (81.575 ms, trace `6aba8157a721bdb400000000000002ed`); `node-14/thread-0/driver.queue.subject` (73.688 ms, trace `6aba8157a721bdb400000000000001c5`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p11-replay-smoke-d`; source `d62b4e952e5d2b0c5570225ff6e612eabee2f38b`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3511/3512 (99.972%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3512/3512. Raw trace bytes: 20636049.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 231 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13379.659 | 301.685 | 7.897 | 280 |
| L1 | 0 | 16435.858 | 317.143 | 8.003 | 422 |
| L4 | 0 | 18597.433 | 325.156 | 8.716 | 382 |
| L16 | 0 | 19059.935 | 341.424 | 18.793 | 442 |
| L64 | 0 | 18838.695 | 380.561 | 5.430 | 604 |
| L256 | 0 | 17020.576 | 298.188 | 13.024 | 462 |
| L1024 | 0 | 18988.142 | 3984.335 | 38.338 | 16528 |
| tail | 0 | 64686.286 | 12040.095 | 107.058 | 52110 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 6aba8157a721bdb4000000000000006d | driver.queue.scheduler-dispatch | 0.281 | none | 0 / 32 |
| 6aba8157a721bdb4000000000000006d | driver.queue.scheduler-late | 0.021 | none | 0 / 32 |

Observed active steps while trace 6aba8157a721bdb4000000000000006d waited: []

| 6aba8157a721bdb40000000000001a4e | driver.queue.scheduler-dispatch | 0.038 | none | 0 / 32 |
| 6aba8157a721bdb40000000000001a4e | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 6aba8157a721bdb40000000000001a4e waited: []

| 6aba8157a721bdb400000000000000ad | driver.queue.scheduler-dispatch | 0.061 | none | 0 / 32 |
| 6aba8157a721bdb400000000000000ad | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 6aba8157a721bdb400000000000000ad waited: []

| 6aba8157a721bdb400000000000002ed | driver.queue.subject | 81.575 | 6aba8157a721bdb400000000000002eb | 2 / 32 |
| 6aba8157a721bdb400000000000002ed | driver.queue.scheduler-late | 1.484 | none | 2 / 32 |
| 6aba8157a721bdb400000000000002ed | driver.queue.scheduler-dispatch | 0.139 | none | 1 / 32 |

Observed active steps while trace 6aba8157a721bdb400000000000002ed waited: [{"at":1794824757420.1619,"inFlight":2,"capacity":32,"active":[{"traceId":"6aba8157a721bdb400000000000002ef","step":"client.http"},{"traceId":"6aba8157a721bdb400000000000002ea","step":"client.http"}]},{"at":1794824757440.419,"inFlight":3,"capacity":32,"active":[{"traceId":"6aba8157a721bdb400000000000002ef","step":"client.http"},{"traceId":"6aba8157a721bdb400000000000002ea","step":"client.http"},{"traceId":"6aba8157a721bdb400000000000002f2","step":"client.http"}]},{"at":1794824757462.94,"inFlight":3,"capacity":32,"active":[{"traceId":"6aba8157a721bdb400000000000002f2","step":"client.http"},{"traceId":"6aba8157a721bdb400000000000002f1","step":"client.http"},{"traceId":"6aba8157a721bdb400000000000002eb","step":"client.http"}]}]

| 6aba8157a721bdb400000000000001c5 | driver.queue.subject | 73.688 | 6aba8157a721bdb400000000000001c4 | 1 / 32 |
| 6aba8157a721bdb400000000000001c5 | driver.queue.scheduler-dispatch | 0.079 | none | 2 / 32 |
| 6aba8157a721bdb400000000000001c5 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace 6aba8157a721bdb400000000000001c5 waited: [{"at":1794824755017.5388,"inFlight":2,"capacity":32,"active":[{"traceId":"6aba8157a721bdb400000000000001c4","step":"client.http"},{"traceId":"6aba8157a721bdb400000000000001c6","step":"client.http"}]},{"at":1794824755037.7263,"inFlight":2,"capacity":32,"active":[{"traceId":"6aba8157a721bdb400000000000001c4","step":"client.http"},{"traceId":"6aba8157a721bdb400000000000001c6","step":"client.http"}]}]

## P2 / warmup / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.114 | 0.984 | 0.000 | 0.881 | 3.050 | n/a | 0.000 | 0.114 | 1.176 | 2.797 | 0.024 | 0.000 | 0.552 | 11.551 | 0.706 | n/a | 0.033 | 3.277 | 0.176 | 0.033 |
| p99 | 36.599 | 2.794 | 0.000 | 2.171 | 7.364 | n/a | 0.799 | 0.269 | 5.220 | 14.121 | 0.064 | 0.000 | 6.152 | 17.963 | 4.521 | n/a | 0.166 | 7.631 | 0.249 | 0.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb40000000000000036 | 36.599 | 7.364 | n/a | 0.000 | 0.267 | 1.097 | 14.121 | 0.035 | 0.000 | 0.138 | 10.804 | 2.607 | n/a | 0.166 | 7.631 | 0.208 | 0.166 | gw-w/thread-50/commit.prepare-and-validate | none observed |
| 6aba8157a721bdb40000000000000054 | 28.523 | 6.101 | n/a | 0.799 | 0.190 | 1.387 | 1.925 | 0.021 | 0.000 | 6.152 | 10.869 | 1.032 | n/a | 0.047 | 7.090 | 0.249 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000005f | 27.839 | 2.264 | n/a | 0.000 | 0.075 | 5.220 | 1.590 | 0.023 | 0.000 | 0.178 | 17.963 | 0.500 | n/a | 0.027 | 2.339 | 0.084 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 6aba8157a721bdb40000000000000043 | 27.623 | 3.050 | n/a | 0.000 | 0.071 | 0.856 | 5.920 | 0.021 | 0.000 | 1.698 | 14.244 | 1.732 | n/a | 0.031 | 3.121 | 0.113 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 6aba8157a721bdb40000000000000056 | 25.636 | 3.609 | n/a | 0.528 | 0.112 | 1.626 | 6.829 | 0.043 | 0.000 | 0.139 | 12.217 | 0.500 | n/a | 0.033 | 4.248 | 0.166 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 6aba8157a721bdb4000000000000003b | 24.634 | 2.567 | n/a | 0.000 | 0.137 | 1.176 | 3.450 | 0.025 | 0.000 | 0.679 | 12.038 | 4.521 | n/a | 0.042 | 2.704 | 0.110 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| 6aba8157a721bdb40000000000000047 | 23.441 | 4.101 | n/a | 0.000 | 0.099 | 1.486 | 3.844 | 0.064 | 0.000 | 0.700 | 12.104 | 1.012 | n/a | 0.031 | 4.200 | 0.179 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000003e | 23.114 | 2.542 | n/a | 0.000 | 0.083 | 1.761 | 5.275 | 0.022 | 0.000 | 0.135 | 12.446 | 0.816 | n/a | 0.033 | 2.625 | 0.114 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000050 | 20.348 | 3.469 | n/a | 0.000 | 0.193 | 1.023 | 3.592 | 0.024 | 0.000 | 0.489 | 11.029 | 0.501 | n/a | 0.029 | 3.661 | 0.180 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000004e | 20.341 | 2.811 | n/a | 0.000 | 0.147 | 1.291 | 2.797 | 0.056 | 0.000 | 0.527 | 12.118 | 0.518 | n/a | 0.076 | 2.958 | 0.145 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000041 | 20.134 | 3.278 | n/a | 0.000 | 0.259 | 2.015 | 2.252 | 0.036 | 0.000 | 0.825 | 10.669 | 0.704 | n/a | 0.095 | 3.537 | 0.176 | 0.095 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| 6aba8157a721bdb40000000000000059 | 19.752 | 3.510 | n/a | 0.364 | 0.269 | 0.990 | 1.945 | 0.023 | 0.000 | 0.552 | 11.551 | 0.526 | n/a | 0.021 | 4.144 | 0.210 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000005c | 17.141 | 3.010 | n/a | 0.215 | 0.052 | 1.024 | 1.828 | 0.022 | 0.000 | 1.481 | 8.099 | 1.392 | n/a | 0.020 | 3.277 | 0.191 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000049 | 15.000 | 2.810 | n/a | 0.000 | 0.114 | 1.086 | 2.039 | 0.031 | 0.000 | 0.790 | 7.380 | 0.706 | n/a | 0.044 | 2.924 | 0.195 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.091 | n/a | n/a | n/a | 43.077 | 2.042 | 3.382 | 0.000 | 17.461 | 4.674 | 0.003 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.006 | 59.090 | 0.747 | 0.006 |
| p99 | 364.225 | n/a | n/a | n/a | 108.257 | 299.126 | 10.753 | 0.000 | 163.047 | 34.427 | 74.188 | 60.698 | 0.039 | 0.000 | n/a | n/a | 0.094 | 332.268 | 1.000 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb40000000000001919 | 364.225 | 32.472 | 299.126 | 0.670 | 0.000 | 30.653 | 1.290 | 0.006 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.003 | 332.268 | 0.912 | 0.003 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.511ms; driver.reader-basis.broadcast 0.484ms; driver.publication.readback 0.367ms; driver.reader-basis.broadcast 0.278ms; driver.publication.readback 0.211ms |
| 6aba8157a721bdb4000000000000190d | 363.639 | 27.103 | 231.398 | 1.990 | 0.000 | 87.753 | 15.377 | 0.005 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.005 | 260.491 | 0.716 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.511ms; driver.reader-basis.broadcast 0.484ms; driver.publication.readback 0.367ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.278ms |
| 6aba8157a721bdb40000000000001918 | 352.975 | 34.897 | 207.413 | 2.243 | 0.000 | 107.355 | 1.043 | 0.009 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.004 | 244.553 | 0.693 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.511ms; driver.reader-basis.broadcast 0.484ms; driver.publication.readback 0.367ms; driver.reader-basis.broadcast 0.278ms; driver.publication.readback 0.211ms |
| 6aba8157a721bdb4000000000000190f | 336.404 | 46.993 | 199.580 | 4.641 | 0.000 | 82.298 | 2.872 | 0.006 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.004 | 251.214 | 0.747 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.511ms; driver.reader-basis.broadcast 0.484ms; driver.publication.readback 0.367ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.278ms |
| 6aba8157a721bdb4000000000000191a | 336.349 | 33.984 | 279.945 | 2.827 | 0.000 | 18.074 | 1.470 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.040 | 316.755 | 0.942 | 0.040 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.511ms; driver.reader-basis.broadcast 0.484ms; driver.publication.readback 0.367ms; driver.reader-basis.broadcast 0.278ms; driver.publication.readback 0.211ms |
| 6aba8157a721bdb4000000000000192b | 283.372 | 28.365 | 231.600 | 0.000 | 0.000 | 17.461 | 5.927 | 0.005 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.003 | 259.966 | 0.917 | 0.003 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.484ms; driver.publication.readback 0.367ms; driver.reader-basis.broadcast 0.278ms; driver.reader-basis.broadcast 0.212ms; driver.publication.readback 0.138ms |
| 6aba8157a721bdb4000000000000190c | 272.133 | 31.258 | 123.310 | 3.757 | 0.000 | 112.434 | 1.353 | 0.007 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.006 | 158.325 | 0.582 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.511ms; driver.publication.readback 0.367ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.278ms; driver.reader-basis.broadcast 0.225ms |
| 6aba8157a721bdb40000000000001903 | 267.706 | 108.257 | 102.422 | 8.850 | 0.000 | 44.165 | 3.991 | 0.005 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.009 | 219.529 | 0.820 | 0.009 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.511ms; driver.publication.readback 0.367ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.278ms; driver.reader-basis.broadcast 0.225ms |
| 6aba8157a721bdb4000000000000192a | 257.300 | 29.618 | 213.895 | 0.000 | 0.000 | 9.386 | 4.375 | 0.009 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.003 | 243.513 | 0.946 | 0.003 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.484ms; driver.publication.readback 0.367ms; driver.reader-basis.broadcast 0.278ms; driver.publication.readback 0.138ms; driver.publication.readback 0.119ms |
| 6aba8157a721bdb40000000000001905 | 245.265 | 48.337 | 41.673 | 5.133 | 0.000 | 132.734 | 17.356 | 0.014 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.009 | 95.144 | 0.388 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.511ms; driver.publication.readback 0.367ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.225ms; driver.publication.readback 0.211ms |
| 6aba8157a721bdb40000000000001c25 | 241.601 | 55.361 | 0.601 | 3.128 | 0.000 | 156.294 | 9.938 | 16.269 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.007 | 59.090 | 0.245 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.029ms; driver.reader-basis.broadcast 0.244ms; driver.reader-basis.broadcast 0.230ms; driver.reader-basis.broadcast 0.207ms; driver.publication.readback 0.144ms |
| 6aba8157a721bdb40000000000001914 | 229.719 | 26.765 | 145.992 | 3.382 | 0.000 | 52.414 | 1.143 | 0.005 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.006 | 176.139 | 0.767 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.511ms; driver.publication.readback 0.367ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.278ms; driver.reader-basis.broadcast 0.225ms |
| 6aba8157a721bdb40000000000001c23 | 200.537 | 61.021 | 0.300 | 3.936 | 0.000 | 113.935 | 14.712 | 6.621 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.005 | 65.257 | 0.325 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.029ms; driver.reader-basis.broadcast 0.230ms; driver.reader-basis.broadcast 0.207ms; driver.publication.readback 0.144ms; driver.publication.readback 0.136ms |
| 6aba8157a721bdb40000000000000ea9 | 193.964 | 22.978 | 6.432 | 0.000 | 0.000 | 163.047 | 1.460 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.003 | 29.410 | 0.152 | 0.003 | node-14/thread-3/socket.queue-and-write | driver.expected-state.bind-receipt 1.518ms; driver.reader-basis.broadcast 0.263ms; driver.reader-basis.broadcast 0.259ms; driver.publication.readback 0.146ms; driver.publication.readback 0.116ms |
| 6aba8157a721bdb4000000000000190b | 189.770 | 31.925 | 30.507 | 2.684 | 0.000 | 107.052 | 8.045 | 9.538 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.004 | 65.116 | 0.343 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.511ms; driver.publication.readback 0.367ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.225ms; driver.publication.readback 0.211ms |
| 6aba8157a721bdb400000000000018ff | 177.271 | 51.908 | 0.664 | 3.724 | 0.000 | 81.898 | 27.266 | 4.319 | 7.484 | 0.003 | 0.000 | n/a | n/a | 0.005 | 56.296 | 0.318 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.225ms; driver.publication.readback 0.211ms; driver.publication.readback 0.112ms; driver.publication.readback 0.072ms |
| 6aba8157a721bdb40000000000000eaa | 175.153 | 29.476 | 100.193 | 1.816 | 0.000 | 37.849 | 5.803 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.004 | 131.485 | 0.751 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.518ms; driver.reader-basis.broadcast 0.263ms; driver.reader-basis.broadcast 0.259ms; driver.publication.readback 0.146ms; driver.publication.readback 0.116ms |
| 6aba8157a721bdb40000000000000ea7 | 162.412 | 50.873 | 44.603 | 5.043 | 0.000 | 59.379 | 2.501 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.003 | 100.519 | 0.619 | 0.003 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.518ms; driver.reader-basis.broadcast 0.263ms; driver.publication.readback 0.146ms; driver.publication.readback 0.116ms; driver.publication.readback 0.094ms |
| 6aba8157a721bdb40000000000001c21 | 161.656 | 54.040 | 0.299 | 6.731 | 0.000 | 77.514 | 13.154 | 9.908 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.004 | 61.070 | 0.378 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.029ms; driver.reader-basis.broadcast 0.230ms; driver.reader-basis.broadcast 0.207ms; driver.publication.readback 0.144ms; driver.publication.readback 0.136ms |
| 6aba8157a721bdb40000000000001929 | 156.454 | 58.827 | 66.082 | 5.646 | 0.000 | 9.010 | 11.536 | 5.342 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.004 | 130.555 | 0.834 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.367ms; driver.reader-basis.broadcast 0.278ms; driver.publication.readback 0.119ms; driver.publication.readback 0.093ms; driver.publication.readback 0.072ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.348 | 0.984 | 0.000 | 0.720 | 3.010 | n/a | 0.000 | 0.137 | 1.291 | 2.797 | 0.024 | 0.000 | 0.527 | 12.038 | 0.526 | n/a | 0.033 | 3.277 | 0.166 | 0.033 |
| p99 | 27.839 | 1.982 | 0.000 | 1.227 | 3.609 | n/a | 0.528 | 0.269 | 5.220 | 6.829 | 0.056 | 0.000 | 1.481 | 17.963 | 4.521 | n/a | 0.095 | 4.248 | 0.210 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb4000000000000005f | 27.839 | 2.264 | n/a | 0.000 | 0.075 | 5.220 | 1.590 | 0.023 | 0.000 | 0.178 | 17.963 | 0.500 | n/a | 0.027 | 2.339 | 0.084 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 6aba8157a721bdb40000000000000056 | 25.636 | 3.609 | n/a | 0.528 | 0.112 | 1.626 | 6.829 | 0.043 | 0.000 | 0.139 | 12.217 | 0.500 | n/a | 0.033 | 4.248 | 0.166 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 6aba8157a721bdb4000000000000003b | 24.634 | 2.567 | n/a | 0.000 | 0.137 | 1.176 | 3.450 | 0.025 | 0.000 | 0.679 | 12.038 | 4.521 | n/a | 0.042 | 2.704 | 0.110 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| 6aba8157a721bdb4000000000000003e | 23.114 | 2.542 | n/a | 0.000 | 0.083 | 1.761 | 5.275 | 0.022 | 0.000 | 0.135 | 12.446 | 0.816 | n/a | 0.033 | 2.625 | 0.114 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000050 | 20.348 | 3.469 | n/a | 0.000 | 0.193 | 1.023 | 3.592 | 0.024 | 0.000 | 0.489 | 11.029 | 0.501 | n/a | 0.029 | 3.661 | 0.180 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000004e | 20.341 | 2.811 | n/a | 0.000 | 0.147 | 1.291 | 2.797 | 0.056 | 0.000 | 0.527 | 12.118 | 0.518 | n/a | 0.076 | 2.958 | 0.145 | 0.076 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000041 | 20.134 | 3.278 | n/a | 0.000 | 0.259 | 2.015 | 2.252 | 0.036 | 0.000 | 0.825 | 10.669 | 0.704 | n/a | 0.095 | 3.537 | 0.176 | 0.095 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| 6aba8157a721bdb40000000000000059 | 19.752 | 3.510 | n/a | 0.364 | 0.269 | 0.990 | 1.945 | 0.023 | 0.000 | 0.552 | 11.551 | 0.526 | n/a | 0.021 | 4.144 | 0.210 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000005c | 17.141 | 3.010 | n/a | 0.215 | 0.052 | 1.024 | 1.828 | 0.022 | 0.000 | 1.481 | 8.099 | 1.392 | n/a | 0.020 | 3.277 | 0.191 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.473 | 0.855 | 0.000 | 0.822 | 3.256 | n/a | 0.000 | 0.071 | 1.318 | 4.245 | 0.030 | 0.000 | 0.707 | 12.725 | 2.991 | n/a | 0.026 | 3.931 | 0.143 | 0.026 |
| p99 | 153.338 | 3.952 | 0.000 | 2.043 | 8.813 | n/a | 0.921 | 6.080 | 6.400 | 33.657 | 0.443 | 0.000 | 4.005 | 82.284 | 30.022 | n/a | 0.125 | 8.875 | 0.326 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb4000000000000006d | 153.338 | 4.624 | n/a | 0.921 | 0.301 | 1.254 | 33.657 | 0.044 | 0.000 | 0.105 | 82.284 | 30.022 | n/a | 0.125 | 5.846 | 0.038 | 0.125 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 6aba8157a721bdb4000000000000007d | 42.441 | 5.638 | n/a | 0.878 | 0.066 | 1.155 | 7.171 | 0.092 | 0.000 | 4.005 | 13.168 | 10.236 | n/a | 0.032 | 6.583 | 0.155 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000007a | 42.098 | 3.030 | n/a | 0.636 | 0.099 | 1.841 | 4.658 | 0.086 | 0.000 | 0.991 | 19.329 | 11.385 | n/a | 0.042 | 3.765 | 0.089 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000077 | 38.263 | 4.483 | n/a | 0.000 | 0.191 | 1.966 | 5.482 | 0.039 | 0.000 | 0.184 | 18.596 | 7.248 | n/a | 0.074 | 4.674 | 0.122 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000065 | 35.966 | 2.676 | n/a | 0.401 | 0.080 | 0.875 | 5.121 | 0.025 | 0.000 | 0.113 | 19.748 | 6.899 | n/a | 0.029 | 3.156 | 0.088 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000090 | 35.338 | 4.420 | n/a | 0.000 | 0.062 | 1.619 | 5.862 | 0.022 | 0.000 | 0.634 | 15.762 | 6.931 | n/a | 0.026 | 4.482 | 0.127 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000006a | 32.471 | 8.813 | n/a | 0.000 | 0.062 | 6.400 | 10.644 | 0.156 | 0.000 | 1.275 | 4.589 | 0.504 | n/a | 0.029 | 8.875 | 0.273 | 0.029 | node-14/thread-0/driver.execute | none observed |
| 6aba8157a721bdb4000000000000009b | 31.567 | 6.024 | n/a | 0.000 | 0.234 | 2.292 | 4.245 | 0.027 | 0.000 | 0.860 | 12.430 | 5.365 | n/a | 0.089 | 6.259 | 0.198 | 0.089 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 6aba8157a721bdb40000000000000085 | 31.165 | 3.878 | n/a | 0.000 | 0.053 | 5.238 | 3.006 | 0.054 | 0.000 | 2.752 | 15.013 | 1.148 | n/a | 0.022 | 3.931 | 0.126 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000074 | 30.013 | 4.997 | n/a | 0.000 | 0.152 | 2.686 | 1.573 | 0.023 | 0.000 | 0.123 | 16.139 | 4.276 | n/a | 0.044 | 5.149 | 0.172 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000009f | 25.473 | 2.228 | n/a | 0.000 | 6.080 | 0.579 | 1.971 | 0.068 | 0.000 | 0.711 | 8.930 | 4.887 | n/a | 0.019 | 8.308 | 0.326 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.020ms |
| 6aba8157a721bdb4000000000000009e | 25.134 | 5.958 | n/a | 0.000 | 0.045 | 1.374 | 4.789 | 0.024 | 0.000 | 1.111 | 10.179 | 1.637 | n/a | 0.018 | 6.002 | 0.239 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000008b | 23.954 | 3.256 | n/a | 0.000 | 0.057 | 2.207 | 1.357 | 0.020 | 0.000 | 0.194 | 13.491 | 3.341 | n/a | 0.030 | 3.314 | 0.138 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.018ms |
| 6aba8157a721bdb40000000000000087 | 23.786 | 2.605 | n/a | 0.000 | 0.047 | 2.062 | 1.839 | 0.021 | 0.000 | 0.141 | 15.629 | 1.423 | n/a | 0.019 | 2.652 | 0.112 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000094 | 23.195 | 4.080 | n/a | 0.652 | 0.086 | 1.010 | 6.203 | 0.026 | 0.000 | 0.233 | 9.826 | 1.046 | n/a | 0.032 | 4.818 | 0.208 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000098 | 22.356 | 2.666 | n/a | 0.000 | 0.532 | 1.318 | 2.504 | 0.080 | 0.000 | 1.196 | 12.500 | 1.541 | n/a | 0.018 | 3.198 | 0.143 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000068 | 21.272 | 2.236 | n/a | 0.000 | 0.043 | 0.745 | 1.435 | 0.021 | 0.000 | 1.057 | 12.725 | 2.991 | n/a | 0.018 | 2.279 | 0.107 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000008a | 20.247 | 1.717 | n/a | 0.000 | 0.044 | 1.277 | 6.413 | 0.044 | 0.000 | 1.105 | 8.990 | 0.637 | n/a | 0.021 | 1.761 | 0.087 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000080 | 18.983 | 2.869 | n/a | 0.000 | 0.071 | 1.257 | 2.615 | 0.443 | 0.000 | 0.707 | 10.302 | 0.692 | n/a | 0.026 | 2.941 | 0.155 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000008e | 13.625 | 2.550 | n/a | 0.000 | 0.372 | 0.819 | 1.127 | 0.019 | 0.000 | 0.491 | 7.672 | 0.548 | n/a | 0.026 | 2.922 | 0.214 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.272 | 0.000 | 0.000 | 0.625 | 2.550 | n/a | 0.000 | 0.071 | 1.257 | 2.504 | 0.044 | 0.000 | 0.711 | 8.990 | 0.692 | n/a | 0.021 | 2.941 | 0.143 | 0.021 |
| p99 | 38.263 | 1.689 | 0.000 | 0.868 | 8.813 | n/a | 0.000 | 6.080 | 6.400 | 10.644 | 0.443 | 0.000 | 1.275 | 18.596 | 7.248 | n/a | 0.074 | 8.875 | 0.326 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb40000000000000077 | 38.263 | 4.483 | n/a | 0.000 | 0.191 | 1.966 | 5.482 | 0.039 | 0.000 | 0.184 | 18.596 | 7.248 | n/a | 0.074 | 4.674 | 0.122 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000006a | 32.471 | 8.813 | n/a | 0.000 | 0.062 | 6.400 | 10.644 | 0.156 | 0.000 | 1.275 | 4.589 | 0.504 | n/a | 0.029 | 8.875 | 0.273 | 0.029 | node-14/thread-0/driver.execute | none observed |
| 6aba8157a721bdb4000000000000009f | 25.473 | 2.228 | n/a | 0.000 | 6.080 | 0.579 | 1.971 | 0.068 | 0.000 | 0.711 | 8.930 | 4.887 | n/a | 0.019 | 8.308 | 0.326 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.020ms |
| 6aba8157a721bdb40000000000000098 | 22.356 | 2.666 | n/a | 0.000 | 0.532 | 1.318 | 2.504 | 0.080 | 0.000 | 1.196 | 12.500 | 1.541 | n/a | 0.018 | 3.198 | 0.143 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000068 | 21.272 | 2.236 | n/a | 0.000 | 0.043 | 0.745 | 1.435 | 0.021 | 0.000 | 1.057 | 12.725 | 2.991 | n/a | 0.018 | 2.279 | 0.107 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000008a | 20.247 | 1.717 | n/a | 0.000 | 0.044 | 1.277 | 6.413 | 0.044 | 0.000 | 1.105 | 8.990 | 0.637 | n/a | 0.021 | 1.761 | 0.087 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000080 | 18.983 | 2.869 | n/a | 0.000 | 0.071 | 1.257 | 2.615 | 0.443 | 0.000 | 0.707 | 10.302 | 0.692 | n/a | 0.026 | 2.941 | 0.155 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000008e | 13.625 | 2.550 | n/a | 0.000 | 0.372 | 0.819 | 1.127 | 0.019 | 0.000 | 0.491 | 7.672 | 0.548 | n/a | 0.026 | 2.922 | 0.214 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (19 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.198 | 0.990 | 0.000 | 0.694 | 2.482 | n/a | 0.000 | 0.074 | 1.044 | 2.697 | 0.026 | 0.000 | 0.230 | 11.422 | 4.720 | n/a | 0.030 | 2.906 | 0.139 | 0.030 |
| p99 | 107.955 | 2.542 | 0.000 | 4.277 | 8.865 | n/a | 0.000 | 0.595 | 3.500 | 15.675 | 0.099 | 0.000 | 4.325 | 71.363 | 18.047 | n/a | 0.084 | 8.942 | 0.238 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb400000000000000ad | 107.955 | 2.482 | n/a | 0.000 | 0.063 | 0.879 | 15.675 | 0.031 | 0.000 | 0.106 | 71.363 | 17.329 | n/a | 0.027 | 2.544 | 0.024 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 6aba8157a721bdb400000000000000ab | 51.651 | 3.217 | n/a | 0.000 | 0.076 | 1.162 | 3.486 | 0.056 | 0.000 | 0.907 | 30.283 | 12.432 | n/a | 0.033 | 3.293 | 0.064 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000ba | 41.557 | 8.865 | n/a | 0.000 | 0.077 | 1.392 | 10.149 | 0.099 | 0.000 | 4.325 | 11.095 | 5.518 | n/a | 0.036 | 8.942 | 0.215 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000ae | 40.056 | 2.442 | n/a | 0.000 | 0.074 | 1.114 | 2.005 | 0.054 | 0.000 | 0.158 | 24.486 | 9.693 | n/a | 0.029 | 2.516 | 0.063 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.020ms |
| 6aba8157a721bdb400000000000000a3 | 37.317 | 1.983 | n/a | 0.000 | 0.060 | 1.056 | 1.782 | 0.021 | 0.000 | 0.182 | 14.158 | 18.047 | n/a | 0.027 | 2.043 | 0.055 | 0.027 | tx/thread-85/transactor.triplex-function | none observed |
| 6aba8157a721bdb400000000000000c6 | 36.479 | 3.845 | n/a | 0.000 | 0.069 | 1.044 | 4.870 | 0.026 | 0.000 | 0.111 | 17.314 | 9.173 | n/a | 0.026 | 3.914 | 0.107 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000d0 | 33.474 | 4.578 | n/a | 0.000 | 0.069 | 1.060 | 5.551 | 0.042 | 0.000 | 0.126 | 13.720 | 8.297 | n/a | 0.030 | 4.647 | 0.139 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 6aba8157a721bdb400000000000000da | 32.361 | 5.410 | n/a | 0.000 | 0.171 | 1.244 | 1.685 | 0.024 | 0.000 | 0.227 | 11.422 | 12.098 | n/a | 0.081 | 5.581 | 0.172 | 0.081 | tx/thread-85/transactor.triplex-function | none observed |
| 6aba8157a721bdb400000000000000be | 30.455 | 3.863 | n/a | 0.000 | 0.059 | 0.972 | 3.442 | 0.081 | 0.000 | 0.659 | 11.219 | 10.129 | n/a | 0.030 | 3.922 | 0.129 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 6aba8157a721bdb400000000000000d4 | 30.198 | 3.403 | n/a | 0.000 | 0.125 | 1.991 | 3.058 | 0.063 | 0.000 | 1.027 | 16.994 | 3.481 | n/a | 0.056 | 3.528 | 0.117 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 6aba8157a721bdb400000000000000d7 | 26.558 | 1.636 | n/a | 0.000 | 0.064 | 0.990 | 4.542 | 0.018 | 0.000 | 0.411 | 14.230 | 4.641 | n/a | 0.025 | 1.701 | 0.064 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000b5 | 25.727 | 3.736 | n/a | 0.000 | 0.128 | 3.500 | 1.399 | 0.021 | 0.000 | 0.111 | 12.694 | 4.054 | n/a | 0.084 | 3.863 | 0.150 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| 6aba8157a721bdb400000000000000cc | 18.361 | 2.187 | n/a | 0.000 | 0.068 | 0.939 | 2.221 | 0.036 | 0.000 | 0.654 | 8.562 | 3.667 | n/a | 0.028 | 2.256 | 0.123 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000c3 | 16.823 | 2.342 | n/a | 0.000 | 0.094 | 1.159 | 4.775 | 0.031 | 0.000 | 0.230 | 6.824 | 1.333 | n/a | 0.035 | 2.436 | 0.145 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 6aba8157a721bdb400000000000000dd | 16.610 | 2.391 | n/a | 0.000 | 0.082 | 0.975 | 1.223 | 0.026 | 0.000 | 0.167 | 6.983 | 4.720 | n/a | 0.045 | 2.472 | 0.149 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 6aba8157a721bdb400000000000000df | 14.146 | 2.312 | n/a | 0.000 | 0.595 | 1.010 | 1.320 | 0.023 | 0.000 | 0.278 | 7.993 | 0.591 | n/a | 0.023 | 2.906 | 0.205 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| 6aba8157a721bdb400000000000000b8 | 13.823 | 3.159 | n/a | 0.000 | 0.125 | 0.894 | 2.697 | 0.022 | 0.000 | 0.559 | 5.727 | 0.614 | n/a | 0.027 | 3.283 | 0.238 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000a7 | 13.230 | 1.872 | n/a | 0.000 | 0.049 | 0.781 | 1.246 | 0.020 | 0.000 | 0.177 | 8.440 | 0.626 | n/a | 0.020 | 1.921 | 0.145 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000c9 | 12.528 | 2.347 | n/a | 0.000 | 0.034 | 1.003 | 1.359 | 0.020 | 0.000 | 0.594 | 3.906 | 3.206 | n/a | 0.059 | 2.381 | 0.190 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.823 | 0.000 | 0.000 | 0.501 | 2.312 | n/a | 0.000 | 0.074 | 0.990 | 1.782 | 0.022 | 0.000 | 0.182 | 8.440 | 3.667 | n/a | 0.027 | 2.436 | 0.145 | 0.027 |
| p99 | 40.056 | 0.995 | 0.000 | 0.737 | 3.736 | n/a | 0.000 | 0.595 | 3.500 | 4.775 | 0.054 | 0.000 | 0.654 | 24.486 | 18.047 | n/a | 0.084 | 3.863 | 0.238 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb400000000000000ae | 40.056 | 2.442 | n/a | 0.000 | 0.074 | 1.114 | 2.005 | 0.054 | 0.000 | 0.158 | 24.486 | 9.693 | n/a | 0.029 | 2.516 | 0.063 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.020ms |
| 6aba8157a721bdb400000000000000a3 | 37.317 | 1.983 | n/a | 0.000 | 0.060 | 1.056 | 1.782 | 0.021 | 0.000 | 0.182 | 14.158 | 18.047 | n/a | 0.027 | 2.043 | 0.055 | 0.027 | tx/thread-85/transactor.triplex-function | none observed |
| 6aba8157a721bdb400000000000000d7 | 26.558 | 1.636 | n/a | 0.000 | 0.064 | 0.990 | 4.542 | 0.018 | 0.000 | 0.411 | 14.230 | 4.641 | n/a | 0.025 | 1.701 | 0.064 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000b5 | 25.727 | 3.736 | n/a | 0.000 | 0.128 | 3.500 | 1.399 | 0.021 | 0.000 | 0.111 | 12.694 | 4.054 | n/a | 0.084 | 3.863 | 0.150 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| 6aba8157a721bdb400000000000000cc | 18.361 | 2.187 | n/a | 0.000 | 0.068 | 0.939 | 2.221 | 0.036 | 0.000 | 0.654 | 8.562 | 3.667 | n/a | 0.028 | 2.256 | 0.123 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000c3 | 16.823 | 2.342 | n/a | 0.000 | 0.094 | 1.159 | 4.775 | 0.031 | 0.000 | 0.230 | 6.824 | 1.333 | n/a | 0.035 | 2.436 | 0.145 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 6aba8157a721bdb400000000000000dd | 16.610 | 2.391 | n/a | 0.000 | 0.082 | 0.975 | 1.223 | 0.026 | 0.000 | 0.167 | 6.983 | 4.720 | n/a | 0.045 | 2.472 | 0.149 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 6aba8157a721bdb400000000000000df | 14.146 | 2.312 | n/a | 0.000 | 0.595 | 1.010 | 1.320 | 0.023 | 0.000 | 0.278 | 7.993 | 0.591 | n/a | 0.023 | 2.906 | 0.205 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| 6aba8157a721bdb400000000000000b8 | 13.823 | 3.159 | n/a | 0.000 | 0.125 | 0.894 | 2.697 | 0.022 | 0.000 | 0.559 | 5.727 | 0.614 | n/a | 0.027 | 3.283 | 0.238 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000a7 | 13.230 | 1.872 | n/a | 0.000 | 0.049 | 0.781 | 1.246 | 0.020 | 0.000 | 0.177 | 8.440 | 0.626 | n/a | 0.020 | 1.921 | 0.145 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.782 | 0.160 | 0.000 | 0.491 | 2.629 | n/a | 0.000 | 0.084 | 1.118 | 1.575 | 0.023 | 0.000 | 0.356 | 9.907 | 2.577 | n/a | 0.030 | 2.773 | 0.139 | 0.030 |
| p99 | 92.989 | 1.991 | 0.000 | 1.978 | 12.358 | n/a | 0.000 | 0.520 | 4.099 | 23.637 | 0.106 | 0.000 | 3.802 | 65.233 | 15.666 | n/a | 0.062 | 12.448 | 0.316 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb400000000000000ee | 92.989 | 2.629 | n/a | 0.000 | 0.108 | 0.919 | 8.290 | 0.021 | 0.000 | 0.077 | 65.233 | 15.666 | n/a | 0.046 | 2.737 | 0.029 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.070ms |
| 6aba8157a721bdb40000000000000100 | 55.943 | 12.358 | n/a | 0.000 | 0.090 | 4.099 | 23.637 | 0.106 | 0.000 | 1.357 | 9.907 | 4.346 | n/a | 0.042 | 12.448 | 0.223 | 0.042 | gw-w/thread-52/storage/begin-command! | driver.reader-basis.broadcast 0.023ms |
| 6aba8157a721bdb400000000000000f5 | 42.237 | 3.922 | n/a | 0.000 | 0.092 | 2.280 | 6.291 | 0.102 | 0.000 | 0.244 | 20.572 | 8.701 | n/a | 0.033 | 4.014 | 0.095 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000109 | 32.602 | 4.899 | n/a | 0.000 | 0.108 | 1.160 | 7.063 | 0.103 | 0.000 | 0.206 | 11.036 | 7.977 | n/a | 0.051 | 5.007 | 0.154 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000e8 | 25.506 | 8.009 | n/a | 0.000 | 0.062 | 1.118 | 5.147 | 0.029 | 0.000 | 3.802 | 5.999 | 1.314 | n/a | 0.027 | 8.070 | 0.316 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.129ms; driver.publication.persist-deferred 0.021ms |
| 6aba8157a721bdb400000000000000f2 | 23.164 | 3.239 | n/a | 0.000 | 0.058 | 1.107 | 1.575 | 0.021 | 0.000 | 0.970 | 13.273 | 2.899 | n/a | 0.022 | 3.297 | 0.142 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000011b | 22.114 | 3.604 | n/a | 0.000 | 0.053 | 0.786 | 1.352 | 0.020 | 0.000 | 0.120 | 9.179 | 6.973 | n/a | 0.025 | 3.658 | 0.165 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000010f | 21.961 | 2.253 | n/a | 0.000 | 0.520 | 1.555 | 2.244 | 0.055 | 0.000 | 0.765 | 10.730 | 3.819 | n/a | 0.020 | 2.773 | 0.126 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000103 | 21.689 | 2.262 | n/a | 0.000 | 0.097 | 1.108 | 5.040 | 0.021 | 0.000 | 0.143 | 12.313 | 0.672 | n/a | 0.032 | 2.359 | 0.109 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| 6aba8157a721bdb400000000000000e7 | 21.021 | 2.718 | n/a | 0.000 | 0.063 | 1.955 | 1.234 | 0.032 | 0.000 | 0.438 | 10.523 | 4.031 | n/a | 0.028 | 2.780 | 0.132 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000fa | 20.782 | 3.240 | n/a | 0.000 | 0.118 | 1.238 | 1.424 | 0.023 | 0.000 | 0.578 | 9.040 | 5.060 | n/a | 0.062 | 3.358 | 0.162 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000f7 | 20.305 | 2.619 | n/a | 0.000 | 0.107 | 1.435 | 1.332 | 0.028 | 0.000 | 0.487 | 11.825 | 2.425 | n/a | 0.048 | 2.726 | 0.134 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000112 | 19.553 | 3.081 | n/a | 0.000 | 0.119 | 1.014 | 1.446 | 0.020 | 0.000 | 0.211 | 9.794 | 3.816 | n/a | 0.052 | 3.200 | 0.164 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000e4 | 17.692 | 2.368 | n/a | 0.000 | 0.050 | 1.304 | 2.303 | 0.053 | 0.000 | 0.393 | 9.951 | 1.246 | n/a | 0.023 | 2.418 | 0.137 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000e2 | 16.885 | 1.968 | n/a | 0.000 | 0.077 | 1.145 | 2.009 | 0.032 | 0.000 | 0.311 | 10.536 | 0.778 | n/a | 0.030 | 2.045 | 0.121 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.071ms |
| 6aba8157a721bdb400000000000000fc | 16.482 | 2.773 | n/a | 0.000 | 0.068 | 1.042 | 1.428 | 0.023 | 0.000 | 0.215 | 8.656 | 2.247 | n/a | 0.029 | 2.841 | 0.172 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000010c | 14.876 | 2.448 | n/a | 0.000 | 0.084 | 0.959 | 1.291 | 0.021 | 0.000 | 0.526 | 7.225 | 2.280 | n/a | 0.041 | 2.532 | 0.170 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000120 | 13.943 | 1.808 | n/a | 0.000 | 0.067 | 1.088 | 2.061 | 0.022 | 0.000 | 0.356 | 7.273 | 1.242 | n/a | 0.026 | 1.875 | 0.134 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000105 | 13.784 | 1.862 | n/a | 0.000 | 0.060 | 1.094 | 1.449 | 0.022 | 0.000 | 0.181 | 6.512 | 2.577 | n/a | 0.027 | 1.922 | 0.139 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000115 | 13.732 | 1.705 | n/a | 0.000 | 0.071 | 1.222 | 1.276 | 0.025 | 0.000 | 0.170 | 8.175 | 1.049 | n/a | 0.041 | 1.776 | 0.129 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.692 | 0.000 | 0.000 | 0.448 | 2.448 | n/a | 0.000 | 0.084 | 1.145 | 1.446 | 0.023 | 0.000 | 0.356 | 9.794 | 2.425 | n/a | 0.030 | 2.726 | 0.134 | 0.030 |
| p99 | 92.989 | 0.998 | 0.000 | 0.942 | 3.922 | n/a | 0.000 | 0.520 | 2.280 | 8.290 | 0.102 | 0.000 | 0.765 | 65.233 | 15.666 | n/a | 0.062 | 4.014 | 0.172 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb400000000000000ee | 92.989 | 2.629 | n/a | 0.000 | 0.108 | 0.919 | 8.290 | 0.021 | 0.000 | 0.077 | 65.233 | 15.666 | n/a | 0.046 | 2.737 | 0.029 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.070ms |
| 6aba8157a721bdb400000000000000f5 | 42.237 | 3.922 | n/a | 0.000 | 0.092 | 2.280 | 6.291 | 0.102 | 0.000 | 0.244 | 20.572 | 8.701 | n/a | 0.033 | 4.014 | 0.095 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000010f | 21.961 | 2.253 | n/a | 0.000 | 0.520 | 1.555 | 2.244 | 0.055 | 0.000 | 0.765 | 10.730 | 3.819 | n/a | 0.020 | 2.773 | 0.126 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000e7 | 21.021 | 2.718 | n/a | 0.000 | 0.063 | 1.955 | 1.234 | 0.032 | 0.000 | 0.438 | 10.523 | 4.031 | n/a | 0.028 | 2.780 | 0.132 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000fa | 20.782 | 3.240 | n/a | 0.000 | 0.118 | 1.238 | 1.424 | 0.023 | 0.000 | 0.578 | 9.040 | 5.060 | n/a | 0.062 | 3.358 | 0.162 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000f7 | 20.305 | 2.619 | n/a | 0.000 | 0.107 | 1.435 | 1.332 | 0.028 | 0.000 | 0.487 | 11.825 | 2.425 | n/a | 0.048 | 2.726 | 0.134 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000112 | 19.553 | 3.081 | n/a | 0.000 | 0.119 | 1.014 | 1.446 | 0.020 | 0.000 | 0.211 | 9.794 | 3.816 | n/a | 0.052 | 3.200 | 0.164 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000e4 | 17.692 | 2.368 | n/a | 0.000 | 0.050 | 1.304 | 2.303 | 0.053 | 0.000 | 0.393 | 9.951 | 1.246 | n/a | 0.023 | 2.418 | 0.137 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000000e2 | 16.885 | 1.968 | n/a | 0.000 | 0.077 | 1.145 | 2.009 | 0.032 | 0.000 | 0.311 | 10.536 | 0.778 | n/a | 0.030 | 2.045 | 0.121 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.071ms |
| 6aba8157a721bdb400000000000000fc | 16.482 | 2.773 | n/a | 0.000 | 0.068 | 1.042 | 1.428 | 0.023 | 0.000 | 0.215 | 8.656 | 2.247 | n/a | 0.029 | 2.841 | 0.172 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000010c | 14.876 | 2.448 | n/a | 0.000 | 0.084 | 0.959 | 1.291 | 0.021 | 0.000 | 0.526 | 7.225 | 2.280 | n/a | 0.041 | 2.532 | 0.170 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000120 | 13.943 | 1.808 | n/a | 0.000 | 0.067 | 1.088 | 2.061 | 0.022 | 0.000 | 0.356 | 7.273 | 1.242 | n/a | 0.026 | 1.875 | 0.134 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000105 | 13.784 | 1.862 | n/a | 0.000 | 0.060 | 1.094 | 1.449 | 0.022 | 0.000 | 0.181 | 6.512 | 2.577 | n/a | 0.027 | 1.922 | 0.139 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000115 | 13.732 | 1.705 | n/a | 0.000 | 0.071 | 1.222 | 1.276 | 0.025 | 0.000 | 0.170 | 8.175 | 1.049 | n/a | 0.041 | 1.776 | 0.129 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000119 | 12.129 | 1.700 | n/a | 0.000 | 0.151 | 0.730 | 1.069 | 0.021 | 0.000 | 0.507 | 6.969 | 0.962 | n/a | 0.020 | 1.851 | 0.153 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.008ms |

## P2 / L64 / commit (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.746 | 0.556 | 0.000 | 0.689 | 2.816 | n/a | 0.000 | 0.076 | 1.010 | 2.267 | 0.024 | 0.000 | 0.328 | 7.621 | 1.106 | n/a | 0.030 | 2.903 | 0.162 | 0.030 |
| p99 | 76.661 | 1.978 | 0.000 | 2.004 | 6.463 | n/a | 0.000 | 2.029 | 5.594 | 11.537 | 0.157 | 0.000 | 3.661 | 46.177 | 14.709 | n/a | 0.063 | 6.634 | 0.268 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb40000000000000135 | 76.661 | 1.667 | n/a | 0.000 | 0.057 | 4.399 | 9.498 | 0.036 | 0.000 | 0.096 | 46.177 | 14.709 | n/a | 0.021 | 1.724 | 0.022 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 6aba8157a721bdb40000000000000152 | 32.199 | 6.463 | n/a | 0.000 | 0.171 | 1.833 | 5.103 | 0.020 | 0.000 | 3.661 | 9.245 | 5.641 | n/a | 0.063 | 6.634 | 0.206 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 6aba8157a721bdb4000000000000015e | 31.222 | 5.615 | n/a | 0.000 | 0.083 | 4.439 | 10.402 | 0.098 | 0.000 | 2.519 | 7.331 | 0.694 | n/a | 0.041 | 5.698 | 0.182 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000016d | 29.941 | 2.500 | n/a | 0.000 | 0.067 | 0.932 | 2.225 | 0.023 | 0.000 | 0.111 | 17.907 | 6.150 | n/a | 0.028 | 2.567 | 0.086 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000124 | 29.844 | 3.821 | n/a | 0.000 | 0.051 | 5.594 | 11.537 | 0.157 | 0.000 | 0.560 | 7.621 | 0.482 | n/a | 0.022 | 3.872 | 0.130 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000131 | 28.694 | 5.426 | n/a | 0.000 | 0.097 | 1.196 | 2.574 | 0.044 | 0.000 | 0.155 | 18.200 | 0.961 | n/a | 0.040 | 5.523 | 0.192 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000138 | 27.383 | 3.714 | n/a | 0.000 | 0.094 | 1.240 | 4.357 | 0.037 | 0.000 | 1.388 | 10.578 | 5.936 | n/a | 0.040 | 3.807 | 0.139 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 6aba8157a721bdb4000000000000013b | 26.603 | 2.816 | n/a | 0.000 | 0.087 | 2.396 | 4.185 | 0.080 | 0.000 | 0.978 | 13.229 | 2.796 | n/a | 0.035 | 2.903 | 0.109 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000012f | 25.766 | 3.638 | n/a | 0.000 | 0.114 | 1.309 | 1.634 | 0.019 | 0.000 | 0.128 | 12.674 | 6.198 | n/a | 0.053 | 3.751 | 0.146 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000164 | 23.672 | 6.186 | n/a | 0.000 | 0.153 | 0.760 | 1.882 | 0.028 | 0.000 | 0.149 | 13.208 | 1.250 | n/a | 0.055 | 6.339 | 0.268 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000159 | 23.638 | 4.106 | n/a | 0.000 | 0.106 | 0.712 | 2.267 | 0.021 | 0.000 | 0.560 | 8.386 | 7.443 | n/a | 0.038 | 4.212 | 0.178 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000144 | 23.020 | 3.325 | n/a | 0.000 | 2.029 | 0.937 | 1.084 | 0.021 | 0.000 | 0.127 | 9.715 | 5.750 | n/a | 0.031 | 5.354 | 0.233 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.091ms; driver.publication.persist-deferred 0.016ms; driver.reader-basis.broadcast 0.009ms |
| 6aba8157a721bdb40000000000000147 | 21.870 | 2.972 | n/a | 0.000 | 0.045 | 0.933 | 1.290 | 0.020 | 0.000 | 0.125 | 11.375 | 5.085 | n/a | 0.024 | 3.018 | 0.138 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000155 | 20.332 | 2.522 | n/a | 0.000 | 0.076 | 1.023 | 3.109 | 0.022 | 0.000 | 0.571 | 7.583 | 5.397 | n/a | 0.030 | 2.598 | 0.128 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000166 | 18.350 | 2.327 | n/a | 0.000 | 0.064 | 0.878 | 2.116 | 0.023 | 0.000 | 0.700 | 10.324 | 1.888 | n/a | 0.031 | 2.391 | 0.130 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000014a | 17.746 | 3.559 | n/a | 0.000 | 0.073 | 1.421 | 2.783 | 0.058 | 0.000 | 0.903 | 5.283 | 3.636 | n/a | 0.030 | 3.632 | 0.205 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| 6aba8157a721bdb40000000000000143 | 17.643 | 2.549 | n/a | 0.000 | 0.062 | 0.869 | 1.995 | 0.023 | 0.000 | 0.328 | 10.890 | 0.899 | n/a | 0.028 | 2.611 | 0.148 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000016b | 17.595 | 2.761 | n/a | 0.000 | 0.103 | 1.687 | 3.957 | 0.113 | 0.000 | 0.402 | 7.519 | 1.003 | n/a | 0.050 | 2.865 | 0.163 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000125 | 17.263 | 4.301 | n/a | 0.000 | 0.055 | 1.010 | 2.432 | 0.025 | 0.000 | 0.126 | 6.580 | 2.703 | n/a | 0.030 | 4.356 | 0.252 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000014f | 16.162 | 3.325 | n/a | 0.000 | 0.084 | 1.225 | 2.121 | 0.029 | 0.000 | 0.213 | 8.158 | 0.966 | n/a | 0.040 | 3.409 | 0.211 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.790 | 0.000 | 0.000 | 0.469 | 2.470 | n/a | 0.000 | 0.074 | 0.932 | 1.947 | 0.023 | 0.000 | 0.205 | 7.101 | 0.694 | n/a | 0.026 | 2.567 | 0.149 | 0.026 |
| p99 | 76.661 | 1.956 | 0.000 | 0.877 | 5.615 | n/a | 0.000 | 2.029 | 5.594 | 11.537 | 0.157 | 0.000 | 2.519 | 46.177 | 14.709 | n/a | 0.057 | 5.698 | 0.239 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb40000000000000135 | 76.661 | 1.667 | n/a | 0.000 | 0.057 | 4.399 | 9.498 | 0.036 | 0.000 | 0.096 | 46.177 | 14.709 | n/a | 0.021 | 1.724 | 0.022 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 6aba8157a721bdb4000000000000015e | 31.222 | 5.615 | n/a | 0.000 | 0.083 | 4.439 | 10.402 | 0.098 | 0.000 | 2.519 | 7.331 | 0.694 | n/a | 0.041 | 5.698 | 0.182 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000016d | 29.941 | 2.500 | n/a | 0.000 | 0.067 | 0.932 | 2.225 | 0.023 | 0.000 | 0.111 | 17.907 | 6.150 | n/a | 0.028 | 2.567 | 0.086 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000124 | 29.844 | 3.821 | n/a | 0.000 | 0.051 | 5.594 | 11.537 | 0.157 | 0.000 | 0.560 | 7.621 | 0.482 | n/a | 0.022 | 3.872 | 0.130 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000012f | 25.766 | 3.638 | n/a | 0.000 | 0.114 | 1.309 | 1.634 | 0.019 | 0.000 | 0.128 | 12.674 | 6.198 | n/a | 0.053 | 3.751 | 0.146 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000144 | 23.020 | 3.325 | n/a | 0.000 | 2.029 | 0.937 | 1.084 | 0.021 | 0.000 | 0.127 | 9.715 | 5.750 | n/a | 0.031 | 5.354 | 0.233 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.091ms; driver.publication.persist-deferred 0.016ms; driver.reader-basis.broadcast 0.009ms |
| 6aba8157a721bdb40000000000000155 | 20.332 | 2.522 | n/a | 0.000 | 0.076 | 1.023 | 3.109 | 0.022 | 0.000 | 0.571 | 7.583 | 5.397 | n/a | 0.030 | 2.598 | 0.128 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000157 | 14.389 | 1.880 | n/a | 0.000 | 0.021 | 0.926 | 2.329 | 0.053 | 0.000 | 0.759 | 7.018 | 1.390 | n/a | 0.013 | 1.900 | 0.132 | 0.013 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms |
| 6aba8157a721bdb40000000000000127 | 13.790 | 1.976 | n/a | 0.000 | 0.074 | 0.727 | 1.431 | 0.019 | 0.000 | 0.357 | 8.074 | 1.106 | n/a | 0.026 | 2.050 | 0.149 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| 6aba8157a721bdb40000000000000161 | 13.335 | 1.853 | n/a | 0.000 | 0.302 | 0.644 | 1.536 | 0.019 | 0.000 | 0.971 | 7.101 | 0.890 | n/a | 0.020 | 2.155 | 0.162 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000015b | 12.835 | 2.470 | n/a | 0.000 | 0.104 | 0.874 | 4.748 | 0.024 | 0.000 | 0.090 | 3.938 | 0.547 | n/a | 0.040 | 2.574 | 0.201 | 0.040 | gw-w/thread-50/commit.prepare-and-validate | none observed |
| 6aba8157a721bdb40000000000000168 | 12.698 | 1.778 | n/a | 0.000 | 0.045 | 0.701 | 2.383 | 0.072 | 0.000 | 0.628 | 6.439 | 0.631 | n/a | 0.021 | 1.823 | 0.144 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000014d | 12.385 | 2.889 | n/a | 0.000 | 0.067 | 0.830 | 1.408 | 0.024 | 0.000 | 0.200 | 6.263 | 0.678 | n/a | 0.026 | 2.956 | 0.239 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000013e | 12.012 | 1.743 | n/a | 0.000 | 0.091 | 1.023 | 1.947 | 0.039 | 0.000 | 0.205 | 6.390 | 0.535 | n/a | 0.039 | 1.834 | 0.153 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000170 | 11.363 | 2.596 | n/a | 0.000 | 0.116 | 1.061 | 1.359 | 0.022 | 0.000 | 0.610 | 4.991 | 0.551 | n/a | 0.057 | 2.712 | 0.239 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000012b | 11.343 | 2.319 | n/a | 0.000 | 0.034 | 0.841 | 1.097 | 0.021 | 0.000 | 0.130 | 6.309 | 0.573 | n/a | 0.019 | 2.352 | 0.207 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |

## P2 / L256 / commit (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.831 | 0.671 | 0.000 | 0.654 | 3.001 | n/a | 0.000 | 0.078 | 1.116 | 1.931 | 0.024 | 0.000 | 0.457 | 10.698 | 2.773 | n/a | 0.035 | 3.077 | 0.127 | 0.035 |
| p99 | 95.117 | 1.355 | 0.000 | 1.562 | 5.826 | n/a | 0.000 | 0.341 | 3.909 | 11.855 | 0.196 | 14.107 | 1.494 | 61.252 | 22.771 | n/a | 0.073 | 5.958 | 0.294 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb40000000000000182 | 95.117 | 2.603 | n/a | 0.000 | 0.066 | 1.592 | 6.252 | 0.035 | 0.000 | 0.512 | 61.252 | 22.771 | n/a | 0.035 | 2.669 | 0.028 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 6aba8157a721bdb400000000000001a6 | 33.883 | 3.380 | n/a | 0.000 | 0.152 | 1.396 | 2.535 | 0.029 | 0.000 | 0.594 | 14.400 | 11.328 | n/a | 0.070 | 3.532 | 0.104 | 0.070 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000184 | 32.257 | 4.365 | n/a | 0.000 | 0.123 | 0.849 | 5.198 | 0.023 | 0.000 | 0.110 | 16.538 | 5.008 | n/a | 0.044 | 4.487 | 0.139 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000175 | 31.182 | 1.674 | n/a | 0.000 | 0.063 | 0.702 | 4.824 | 0.091 | 14.107 | 0.174 | 8.990 | 0.528 | n/a | 0.029 | 1.736 | 0.056 | 0.029 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 6aba8157a721bdb40000000000000190 | 29.293 | 2.164 | n/a | 0.000 | 0.077 | 1.471 | 2.926 | 0.087 | 0.000 | 1.150 | 15.442 | 5.941 | n/a | 0.035 | 2.241 | 0.077 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 6aba8157a721bdb40000000000000188 | 28.900 | 2.932 | n/a | 0.000 | 0.078 | 1.799 | 1.931 | 0.030 | 0.000 | 0.868 | 13.859 | 7.366 | n/a | 0.037 | 3.010 | 0.104 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001af | 27.439 | 5.826 | n/a | 0.000 | 0.131 | 2.984 | 11.855 | 0.092 | 0.000 | 0.581 | 5.689 | 0.225 | n/a | 0.055 | 5.958 | 0.217 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 6aba8157a721bdb4000000000000018a | 23.924 | 2.720 | n/a | 0.000 | 0.095 | 1.162 | 4.171 | 0.021 | 0.000 | 1.494 | 10.092 | 4.127 | n/a | 0.041 | 2.815 | 0.118 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001a8 | 23.903 | 4.236 | n/a | 0.000 | 0.092 | 1.023 | 5.132 | 0.036 | 0.000 | 0.132 | 12.399 | 0.819 | n/a | 0.035 | 4.328 | 0.181 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000194 | 23.025 | 4.590 | n/a | 0.000 | 0.082 | 1.333 | 1.903 | 0.030 | 0.000 | 0.301 | 10.957 | 3.781 | n/a | 0.048 | 4.672 | 0.203 | 0.048 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000019d | 22.860 | 2.604 | n/a | 0.000 | 0.053 | 3.909 | 1.598 | 0.196 | 0.000 | 0.457 | 12.324 | 1.689 | n/a | 0.031 | 2.656 | 0.116 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| 6aba8157a721bdb4000000000000018d | 22.831 | 1.760 | n/a | 0.000 | 0.061 | 0.743 | 1.209 | 0.021 | 0.000 | 0.550 | 16.207 | 2.253 | n/a | 0.027 | 1.821 | 0.080 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000199 | 22.444 | 2.281 | n/a | 0.000 | 0.053 | 0.870 | 1.483 | 0.024 | 0.000 | 0.158 | 10.698 | 6.852 | n/a | 0.025 | 2.334 | 0.104 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001a3 | 21.539 | 3.754 | n/a | 0.000 | 0.140 | 1.116 | 1.474 | 0.020 | 0.000 | 0.158 | 10.406 | 4.396 | n/a | 0.073 | 3.894 | 0.181 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001b2 | 21.324 | 4.800 | n/a | 0.000 | 0.140 | 0.472 | 4.472 | 0.022 | 0.000 | 0.596 | 9.567 | 1.202 | n/a | 0.053 | 4.939 | 0.232 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 6aba8157a721bdb40000000000000178 | 20.065 | 2.477 | n/a | 0.000 | 0.074 | 0.856 | 1.628 | 0.024 | 0.000 | 0.296 | 11.904 | 2.773 | n/a | 0.033 | 2.552 | 0.127 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000197 | 20.010 | 3.410 | n/a | 0.000 | 0.114 | 1.020 | 1.536 | 0.019 | 0.000 | 0.142 | 12.488 | 1.231 | n/a | 0.051 | 3.524 | 0.176 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001a0 | 18.854 | 3.415 | n/a | 0.000 | 0.130 | 0.959 | 1.550 | 0.038 | 0.000 | 0.134 | 9.406 | 3.163 | n/a | 0.059 | 3.545 | 0.188 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001a9 | 18.041 | 1.529 | n/a | 0.000 | 0.064 | 0.702 | 4.277 | 0.019 | 0.000 | 0.082 | 6.887 | 4.458 | n/a | 0.024 | 1.593 | 0.088 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.121ms; driver.publication.persist-deferred 0.018ms |
| 6aba8157a721bdb4000000000000017d | 17.898 | 3.001 | n/a | 0.000 | 0.076 | 1.383 | 1.775 | 0.021 | 0.000 | 0.564 | 10.234 | 0.813 | n/a | 0.032 | 3.077 | 0.172 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.860 | 0.658 | 0.000 | 0.547 | 2.720 | n/a | 0.000 | 0.078 | 1.162 | 2.086 | 0.030 | 0.000 | 0.512 | 10.406 | 3.163 | n/a | 0.037 | 2.815 | 0.116 | 0.037 |
| p99 | 95.117 | 1.355 | 0.000 | 0.935 | 5.826 | n/a | 0.000 | 0.341 | 3.909 | 11.855 | 0.196 | 14.107 | 1.494 | 61.252 | 22.771 | n/a | 0.073 | 5.958 | 0.294 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb40000000000000182 | 95.117 | 2.603 | n/a | 0.000 | 0.066 | 1.592 | 6.252 | 0.035 | 0.000 | 0.512 | 61.252 | 22.771 | n/a | 0.035 | 2.669 | 0.028 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 6aba8157a721bdb400000000000001a6 | 33.883 | 3.380 | n/a | 0.000 | 0.152 | 1.396 | 2.535 | 0.029 | 0.000 | 0.594 | 14.400 | 11.328 | n/a | 0.070 | 3.532 | 0.104 | 0.070 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000175 | 31.182 | 1.674 | n/a | 0.000 | 0.063 | 0.702 | 4.824 | 0.091 | 14.107 | 0.174 | 8.990 | 0.528 | n/a | 0.029 | 1.736 | 0.056 | 0.029 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 6aba8157a721bdb40000000000000190 | 29.293 | 2.164 | n/a | 0.000 | 0.077 | 1.471 | 2.926 | 0.087 | 0.000 | 1.150 | 15.442 | 5.941 | n/a | 0.035 | 2.241 | 0.077 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 6aba8157a721bdb40000000000000188 | 28.900 | 2.932 | n/a | 0.000 | 0.078 | 1.799 | 1.931 | 0.030 | 0.000 | 0.868 | 13.859 | 7.366 | n/a | 0.037 | 3.010 | 0.104 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001af | 27.439 | 5.826 | n/a | 0.000 | 0.131 | 2.984 | 11.855 | 0.092 | 0.000 | 0.581 | 5.689 | 0.225 | n/a | 0.055 | 5.958 | 0.217 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 6aba8157a721bdb4000000000000018a | 23.924 | 2.720 | n/a | 0.000 | 0.095 | 1.162 | 4.171 | 0.021 | 0.000 | 1.494 | 10.092 | 4.127 | n/a | 0.041 | 2.815 | 0.118 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000019d | 22.860 | 2.604 | n/a | 0.000 | 0.053 | 3.909 | 1.598 | 0.196 | 0.000 | 0.457 | 12.324 | 1.689 | n/a | 0.031 | 2.656 | 0.116 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| 6aba8157a721bdb4000000000000018d | 22.831 | 1.760 | n/a | 0.000 | 0.061 | 0.743 | 1.209 | 0.021 | 0.000 | 0.550 | 16.207 | 2.253 | n/a | 0.027 | 1.821 | 0.080 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001a3 | 21.539 | 3.754 | n/a | 0.000 | 0.140 | 1.116 | 1.474 | 0.020 | 0.000 | 0.158 | 10.406 | 4.396 | n/a | 0.073 | 3.894 | 0.181 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000197 | 20.010 | 3.410 | n/a | 0.000 | 0.114 | 1.020 | 1.536 | 0.019 | 0.000 | 0.142 | 12.488 | 1.231 | n/a | 0.051 | 3.524 | 0.176 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001a0 | 18.854 | 3.415 | n/a | 0.000 | 0.130 | 0.959 | 1.550 | 0.038 | 0.000 | 0.134 | 9.406 | 3.163 | n/a | 0.059 | 3.545 | 0.188 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb400000000000001a9 | 18.041 | 1.529 | n/a | 0.000 | 0.064 | 0.702 | 4.277 | 0.019 | 0.000 | 0.082 | 6.887 | 4.458 | n/a | 0.024 | 1.593 | 0.088 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.121ms; driver.publication.persist-deferred 0.018ms |
| 6aba8157a721bdb400000000000001ac | 15.947 | 4.348 | n/a | 0.000 | 0.341 | 1.095 | 1.550 | 0.022 | 0.000 | 0.149 | 7.447 | 0.948 | n/a | 0.046 | 4.689 | 0.294 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb40000000000000173 | 15.166 | 1.859 | n/a | 0.000 | 0.052 | 1.234 | 2.086 | 0.049 | 0.000 | 0.852 | 6.618 | 2.394 | n/a | 0.023 | 1.911 | 0.126 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |

## P2 / L1024 / commit (817 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.463 | 0.180 | 0.000 | 0.555 | 2.158 | n/a | 0.000 | 0.055 | 0.674 | 1.275 | 0.018 | 0.000 | 0.161 | 6.702 | 0.644 | n/a | 0.017 | 2.560 | 0.200 | 0.017 |
| p99 | 55.731 | 2.960 | 0.037 | 2.306 | 7.848 | n/a | 0.000 | 30.429 | 8.755 | 6.778 | 0.079 | 0.000 | 4.632 | 30.421 | 9.417 | n/a | 0.055 | 33.216 | 0.743 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb400000000000002ed | 99.527 | 2.613 | n/a | 0.000 | 83.199 | 3.723 | 1.019 | 0.018 | 0.000 | 0.108 | 8.137 | 0.691 | n/a | 0.021 | 85.811 | 0.862 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.738ms; driver.publication.readback 0.119ms; driver.publication.readback 0.095ms; driver.reader-basis.broadcast 0.077ms; driver.publication.persist-deferred 0.074ms |
| 6aba8157a721bdb400000000000001c5 | 97.854 | 2.014 | n/a | 0.000 | 73.769 | 0.487 | 0.859 | 0.012 | 0.000 | 0.250 | 19.411 | 1.031 | n/a | 0.020 | 75.784 | 0.774 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.115ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.017ms; driver.reader-basis.broadcast 0.016ms |
| 6aba8157a721bdb400000000000002eb | 84.296 | 1.931 | n/a | 0.000 | 64.391 | 0.665 | 1.197 | 0.030 | 0.000 | 0.145 | 9.597 | 6.327 | n/a | 0.014 | 66.322 | 0.787 | 0.014 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.738ms; driver.publication.readback 0.119ms; driver.reader-basis.broadcast 0.077ms; driver.publication.persist-deferred 0.074ms; driver.publication.readback 0.071ms |
| 6aba8157a721bdb400000000000001c6 | 79.569 | 2.042 | n/a | 0.000 | 0.018 | 0.489 | 1.318 | 0.015 | 0.000 | 1.063 | 69.975 | 4.629 | n/a | 0.019 | 2.060 | 0.026 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.022ms; driver.reader-basis.broadcast 0.016ms |
| 6aba8157a721bdb400000000000001c4 | 79.443 | 1.748 | n/a | 0.000 | 0.048 | 0.745 | 3.640 | 0.020 | 0.000 | 0.594 | 58.432 | 14.195 | n/a | 0.022 | 1.796 | 0.023 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 6aba8157a721bdb400000000000001c7 | 76.612 | 4.498 | n/a | 0.000 | 62.507 | 2.811 | 1.287 | 0.017 | 0.000 | 0.112 | 4.571 | 0.787 | n/a | 0.023 | 67.004 | 0.875 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.490ms; driver.publication.readback 0.115ms; driver.publication.readback 0.070ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.045ms |
| 6aba8157a721bdb400000000000002ea | 73.722 | 3.728 | n/a | 0.000 | 29.488 | 0.526 | 1.799 | 0.017 | 0.000 | 0.734 | 30.440 | 6.976 | n/a | 0.013 | 33.216 | 0.451 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.738ms; driver.publication.readback 0.119ms; driver.reader-basis.broadcast 0.077ms; driver.publication.persist-deferred 0.074ms; driver.publication.readback 0.071ms |
| 6aba8157a721bdb400000000000006f9 | 63.758 | 4.029 | n/a | 0.000 | 44.344 | 0.819 | 1.556 | 0.029 | 0.000 | 2.393 | 9.552 | 1.018 | n/a | 0.017 | 48.373 | 0.759 | 0.017 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.160ms; driver.publication.readback 0.093ms; driver.publication.readback 0.053ms; driver.publication.readback 0.047ms; driver.publication.readback 0.046ms |
| 6aba8157a721bdb400000000000002fb | 55.731 | 2.210 | n/a | 0.000 | 31.800 | 1.739 | 1.288 | 0.024 | 0.000 | 0.116 | 4.385 | 14.157 | n/a | 0.013 | 34.010 | 0.610 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.095ms; driver.publication.readback 0.061ms; driver.publication.readback 0.054ms; driver.publication.readback 0.054ms; driver.publication.readback 0.052ms |
| 6aba8157a721bdb400000000000002f1 | 55.703 | 4.117 | n/a | 0.000 | 30.013 | 4.886 | 1.604 | 0.021 | 0.000 | 0.161 | 13.991 | 0.882 | n/a | 0.028 | 34.130 | 0.613 | 0.028 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.738ms; driver.publication.readback 0.119ms; driver.reader-basis.broadcast 0.077ms; driver.publication.persist-deferred 0.074ms; driver.publication.readback 0.056ms |
| 6aba8157a721bdb400000000000005bd | 53.231 | 2.342 | n/a | 0.000 | 27.836 | 2.921 | 2.062 | 0.081 | 0.000 | 0.460 | 16.631 | 0.877 | n/a | 0.021 | 30.178 | 0.567 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.042ms; driver.reader-basis.broadcast 0.159ms; driver.publication.readback 0.132ms; driver.publication.readback 0.083ms; driver.publication.readback 0.054ms |
| 6aba8157a721bdb400000000000001ef | 52.460 | 1.648 | n/a | 0.000 | 8.499 | 0.518 | 0.872 | 0.050 | 0.000 | 0.069 | 40.442 | 0.353 | n/a | 0.011 | 10.147 | 0.193 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.145ms; driver.publication.readback 0.115ms; driver.publication.readback 0.074ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.031ms |
| 6aba8157a721bdb400000000000006f7 | 50.323 | 1.445 | n/a | 0.000 | 32.024 | 0.512 | 1.292 | 0.023 | 0.000 | 0.194 | 13.908 | 0.913 | n/a | 0.012 | 33.469 | 0.665 | 0.012 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.160ms; driver.publication.readback 0.093ms; driver.publication.readback 0.053ms; driver.publication.readback 0.047ms; driver.publication.readback 0.044ms |
| 6aba8157a721bdb400000000000006fb | 48.637 | 5.387 | n/a | 0.000 | 16.453 | 6.481 | 3.071 | 0.041 | 0.000 | 1.000 | 15.505 | 0.679 | n/a | 0.020 | 21.840 | 0.449 | 0.020 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.160ms; driver.publication.readback 0.093ms; driver.publication.readback 0.047ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms |
| 6aba8157a721bdb400000000000007e2 | 47.162 | 1.553 | n/a | 0.000 | 29.143 | 1.799 | 1.142 | 0.013 | 0.000 | 0.921 | 11.421 | 1.156 | n/a | 0.013 | 30.696 | 0.651 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.174ms; driver.publication.readback 0.065ms; driver.publication.readback 0.058ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.042ms |
| 6aba8157a721bdb400000000000001f2 | 46.538 | 2.883 | n/a | 0.000 | 0.034 | 1.311 | 1.283 | 0.025 | 0.000 | 4.034 | 30.421 | 6.530 | n/a | 0.018 | 2.917 | 0.063 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.145ms; driver.publication.readback 0.115ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.026ms |
| 6aba8157a721bdb4000000000000040e | 45.938 | 2.119 | n/a | 0.000 | 30.817 | 0.760 | 1.517 | 0.045 | 0.000 | 0.160 | 10.076 | 0.426 | n/a | 0.018 | 32.937 | 0.717 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.175ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.041ms |
| 6aba8157a721bdb400000000000005b9 | 45.505 | 8.559 | n/a | 0.000 | 6.140 | 4.610 | 7.515 | 0.014 | 0.000 | 1.656 | 15.299 | 1.687 | n/a | 0.024 | 14.699 | 0.323 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.159ms; driver.publication.readback 0.083ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.048ms; driver.publication.readback 0.046ms |
| 6aba8157a721bdb400000000000007bb | 45.396 | 4.610 | n/a | 0.000 | 0.031 | 0.813 | 2.642 | 0.027 | 0.000 | 3.504 | 12.655 | 21.100 | n/a | 0.015 | 4.641 | 0.102 | 0.015 | tx/thread-85/transactor.triplex-function | driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| 6aba8157a721bdb40000000000000431 | 45.374 | 11.546 | n/a | 0.000 | 0.025 | 5.676 | 12.038 | 0.079 | 0.000 | 0.778 | 13.119 | 2.101 | n/a | 0.013 | 11.572 | 0.255 | 0.013 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.018ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.175 | 0.000 | 0.000 | 0.422 | 1.837 | n/a | 0.000 | 0.059 | 0.673 | 1.108 | 0.017 | 0.000 | 0.162 | 6.474 | 0.470 | n/a | 0.016 | 2.191 | 0.187 | 0.016 |
| p99 | 53.231 | 1.964 | 0.021 | 0.865 | 5.229 | n/a | 0.000 | 30.817 | 8.755 | 5.819 | 0.081 | 0.000 | 4.066 | 27.733 | 8.156 | n/a | 0.055 | 32.937 | 0.756 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb400000000000002ed | 99.527 | 2.613 | n/a | 0.000 | 83.199 | 3.723 | 1.019 | 0.018 | 0.000 | 0.108 | 8.137 | 0.691 | n/a | 0.021 | 85.811 | 0.862 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.738ms; driver.publication.readback 0.119ms; driver.publication.readback 0.095ms; driver.reader-basis.broadcast 0.077ms; driver.publication.persist-deferred 0.074ms |
| 6aba8157a721bdb400000000000001c5 | 97.854 | 2.014 | n/a | 0.000 | 73.769 | 0.487 | 0.859 | 0.012 | 0.000 | 0.250 | 19.411 | 1.031 | n/a | 0.020 | 75.784 | 0.774 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.115ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.017ms; driver.reader-basis.broadcast 0.016ms |
| 6aba8157a721bdb400000000000002eb | 84.296 | 1.931 | n/a | 0.000 | 64.391 | 0.665 | 1.197 | 0.030 | 0.000 | 0.145 | 9.597 | 6.327 | n/a | 0.014 | 66.322 | 0.787 | 0.014 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.738ms; driver.publication.readback 0.119ms; driver.reader-basis.broadcast 0.077ms; driver.publication.persist-deferred 0.074ms; driver.publication.readback 0.071ms |
| 6aba8157a721bdb400000000000001c4 | 79.443 | 1.748 | n/a | 0.000 | 0.048 | 0.745 | 3.640 | 0.020 | 0.000 | 0.594 | 58.432 | 14.195 | n/a | 0.022 | 1.796 | 0.023 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 6aba8157a721bdb400000000000005bd | 53.231 | 2.342 | n/a | 0.000 | 27.836 | 2.921 | 2.062 | 0.081 | 0.000 | 0.460 | 16.631 | 0.877 | n/a | 0.021 | 30.178 | 0.567 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.042ms; driver.reader-basis.broadcast 0.159ms; driver.publication.readback 0.132ms; driver.publication.readback 0.083ms; driver.publication.readback 0.054ms |
| 6aba8157a721bdb400000000000001ef | 52.460 | 1.648 | n/a | 0.000 | 8.499 | 0.518 | 0.872 | 0.050 | 0.000 | 0.069 | 40.442 | 0.353 | n/a | 0.011 | 10.147 | 0.193 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.145ms; driver.publication.readback 0.115ms; driver.publication.readback 0.074ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.031ms |
| 6aba8157a721bdb400000000000006f7 | 50.323 | 1.445 | n/a | 0.000 | 32.024 | 0.512 | 1.292 | 0.023 | 0.000 | 0.194 | 13.908 | 0.913 | n/a | 0.012 | 33.469 | 0.665 | 0.012 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.160ms; driver.publication.readback 0.093ms; driver.publication.readback 0.053ms; driver.publication.readback 0.047ms; driver.publication.readback 0.044ms |
| 6aba8157a721bdb400000000000007e2 | 47.162 | 1.553 | n/a | 0.000 | 29.143 | 1.799 | 1.142 | 0.013 | 0.000 | 0.921 | 11.421 | 1.156 | n/a | 0.013 | 30.696 | 0.651 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.174ms; driver.publication.readback 0.065ms; driver.publication.readback 0.058ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.042ms |
| 6aba8157a721bdb4000000000000040e | 45.938 | 2.119 | n/a | 0.000 | 30.817 | 0.760 | 1.517 | 0.045 | 0.000 | 0.160 | 10.076 | 0.426 | n/a | 0.018 | 32.937 | 0.717 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.175ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.041ms |
| 6aba8157a721bdb400000000000002de | 44.591 | 2.584 | n/a | 0.000 | 0.950 | 3.031 | 2.247 | 0.058 | 0.000 | 3.962 | 27.199 | 4.489 | n/a | 0.071 | 3.534 | 0.079 | 0.071 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.092ms; driver.publication.readback 0.078ms; driver.publication.readback 0.062ms; driver.publication.readback 0.057ms; driver.publication.readback 0.048ms |
| 6aba8157a721bdb40000000000000300 | 43.683 | 1.280 | n/a | 0.000 | 28.943 | 0.445 | 0.913 | 0.024 | 0.000 | 0.372 | 10.470 | 1.224 | n/a | 0.012 | 30.223 | 0.692 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.058ms; driver.publication.readback 0.054ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.018ms |
| 6aba8157a721bdb400000000000001e5 | 42.853 | 2.385 | n/a | 0.000 | 14.783 | 0.690 | 7.264 | 0.017 | 0.000 | 0.312 | 15.050 | 2.330 | n/a | 0.021 | 17.168 | 0.401 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.131ms; driver.publication.readback 0.065ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.041ms; driver.publication.persist-deferred 0.018ms |
| 6aba8157a721bdb400000000000005b8 | 42.401 | 2.354 | n/a | 0.000 | 16.928 | 1.466 | 1.641 | 0.019 | 0.000 | 2.053 | 17.371 | 0.556 | n/a | 0.013 | 19.282 | 0.455 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.159ms; driver.publication.readback 0.083ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.028ms |
| 6aba8157a721bdb400000000000007bc | 41.788 | 2.962 | n/a | 0.000 | 1.754 | 1.251 | 1.093 | 0.011 | 0.000 | 0.048 | 33.714 | 0.932 | n/a | 0.021 | 4.717 | 0.113 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.017ms |
| 6aba8157a721bdb40000000000000619 | 41.776 | 1.663 | n/a | 0.000 | 0.051 | 0.571 | 1.215 | 0.017 | 0.000 | 0.093 | 37.461 | 0.686 | n/a | 0.019 | 1.713 | 0.041 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 6aba8157a721bdb4000000000000041a | 41.678 | 1.492 | n/a | 0.000 | 19.848 | 0.674 | 1.220 | 0.020 | 0.000 | 0.874 | 17.155 | 0.385 | n/a | 0.010 | 21.340 | 0.512 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 3.950ms; driver.publication.readback 0.119ms; driver.publication.readback 0.081ms; driver.reader-basis.broadcast 0.080ms; driver.publication.readback 0.062ms |
| 6aba8157a721bdb4000000000000061a | 40.653 | 1.891 | n/a | 0.000 | 0.815 | 27.302 | 0.795 | 0.016 | 0.000 | 0.052 | 8.351 | 1.416 | n/a | 0.015 | 2.706 | 0.067 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.018ms |
| 6aba8157a721bdb4000000000000061b | 39.980 | 1.089 | n/a | 0.000 | 0.020 | 25.138 | 0.728 | 0.009 | 0.000 | 0.083 | 12.439 | 0.465 | n/a | 0.009 | 1.109 | 0.028 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.050ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.018ms |
| 6aba8157a721bdb40000000000000303 | 39.910 | 1.599 | n/a | 0.000 | 24.743 | 0.499 | 0.775 | 0.020 | 0.000 | 0.133 | 8.319 | 3.810 | n/a | 0.014 | 26.342 | 0.660 | 0.014 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.132ms; driver.publication.readback 0.058ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.018ms |
| 6aba8157a721bdb400000000000002b0 | 39.819 | 3.572 | n/a | 0.000 | 19.763 | 3.287 | 1.057 | 0.068 | 0.000 | 0.185 | 9.508 | 2.355 | n/a | 0.024 | 23.334 | 0.586 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.372ms; driver.publication.readback 0.100ms; driver.publication.readback 0.046ms; driver.publication.readback 0.034ms; driver.publication.persist-deferred 0.032ms |

## P2 / tail / commit (2567 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.345 | 0.232 | 0.000 | 0.496 | 2.097 | n/a | 0.000 | 0.042 | 0.539 | 0.941 | 0.012 | 0.000 | 0.099 | 4.478 | 0.579 | n/a | 0.014 | 2.447 | 0.244 | 0.014 |
| p99 | 36.234 | 2.207 | 0.044 | 2.017 | 6.442 | n/a | 0.000 | 15.258 | 5.787 | 4.442 | 0.049 | 0.000 | 2.937 | 20.750 | 4.527 | n/a | 0.042 | 17.416 | 0.701 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb40000000000001a4e | 130.844 | 1.452 | n/a | 0.000 | 0.040 | 1.031 | 1.454 | 0.018 | 0.000 | 0.301 | 126.005 | 0.516 | n/a | 0.028 | 1.492 | 0.011 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.274ms |
| 6aba8157a721bdb40000000000001a4f | 93.312 | 1.466 | n/a | 0.000 | 0.044 | 1.761 | 0.829 | 0.012 | 0.000 | 0.069 | 88.116 | 0.990 | n/a | 0.024 | 1.510 | 0.016 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.274ms; driver.publication.persist-deferred 0.015ms |
| 6aba8157a721bdb40000000000000834 | 69.831 | 2.548 | n/a | 0.000 | 47.606 | 0.703 | 1.853 | 0.020 | 0.000 | 1.608 | 13.407 | 2.064 | n/a | 0.022 | 50.155 | 0.718 | 0.022 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.167ms; driver.publication.readback 0.117ms; driver.publication.readback 0.097ms; driver.publication.readback 0.076ms |
| 6aba8157a721bdb400000000000009bf | 62.157 | 4.211 | n/a | 0.000 | 44.509 | 0.797 | 2.445 | 0.018 | 0.000 | 1.271 | 7.756 | 1.137 | n/a | 0.013 | 48.720 | 0.784 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.420ms; driver.publication.readback 0.101ms; driver.publication.readback 0.063ms; driver.publication.readback 0.049ms; driver.publication.readback 0.039ms |
| 6aba8157a721bdb400000000000009bb | 61.294 | 2.231 | n/a | 0.000 | 31.924 | 0.465 | 4.008 | 0.013 | 0.000 | 2.092 | 19.441 | 1.102 | n/a | 0.019 | 34.155 | 0.557 | 0.019 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.420ms; driver.publication.readback 0.101ms; driver.publication.readback 0.097ms; driver.publication.readback 0.088ms; driver.publication.readback 0.039ms |
| 6aba8157a721bdb40000000000000838 | 58.217 | 1.847 | n/a | 0.000 | 47.131 | 0.492 | 1.049 | 0.015 | 0.000 | 0.102 | 7.054 | 0.512 | n/a | 0.014 | 48.978 | 0.841 | 0.014 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.167ms; driver.publication.readback 0.117ms; driver.publication.readback 0.097ms; driver.publication.readback 0.079ms |
| 6aba8157a721bdb40000000000001629 | 58.127 | 2.462 | n/a | 0.000 | 0.027 | 0.567 | 2.053 | 0.042 | 27.575 | 5.267 | 15.987 | 4.136 | n/a | 0.011 | 2.489 | 0.043 | 0.011 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.readback 0.360ms; driver.reader-basis.broadcast 0.182ms; driver.publication.readback 0.083ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.013ms |
| 6aba8157a721bdb40000000000000833 | 51.424 | 3.482 | n/a | 0.000 | 22.191 | 3.915 | 1.792 | 0.015 | 0.000 | 2.629 | 16.656 | 0.727 | n/a | 0.017 | 25.673 | 0.499 | 0.017 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.167ms; driver.publication.readback 0.117ms; driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.060ms |
| 6aba8157a721bdb40000000000000839 | 44.969 | 9.969 | n/a | 0.000 | 0.340 | 2.971 | 4.256 | 0.062 | 0.000 | 3.306 | 20.750 | 3.281 | n/a | 0.034 | 10.310 | 0.229 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.209ms; driver.publication.readback 0.167ms; driver.publication.readback 0.097ms; driver.publication.readback 0.079ms; driver.publication.readback 0.076ms |
| 6aba8157a721bdb40000000000001a52 | 44.658 | 2.242 | n/a | 0.000 | 36.725 | 1.929 | 0.559 | 0.009 | 0.000 | 0.040 | 2.688 | 0.454 | n/a | 0.012 | 38.967 | 0.873 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.040ms; driver.publication.readback 0.131ms; driver.publication.readback 0.078ms; driver.publication.readback 0.075ms; driver.publication.persist-deferred 0.043ms |
| 6aba8157a721bdb4000000000000162a | 44.102 | 1.256 | n/a | 0.000 | 0.015 | 29.073 | 0.744 | 0.011 | 0.000 | 0.038 | 12.551 | 0.406 | n/a | 0.008 | 1.270 | 0.029 | 0.008 | node-14/thread-0/socket.wait-first-byte | none observed |
| 6aba8157a721bdb40000000000001a10 | 43.794 | 2.101 | n/a | 0.000 | 0.031 | 0.712 | 1.371 | 0.029 | 0.000 | 1.127 | 36.601 | 1.803 | n/a | 0.020 | 2.132 | 0.049 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.247ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.016ms |
| 6aba8157a721bdb40000000000000832 | 42.244 | 2.083 | n/a | 0.000 | 0.014 | 1.183 | 1.144 | 0.012 | 0.000 | 0.081 | 35.215 | 2.505 | n/a | 0.009 | 2.097 | 0.050 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.117ms; driver.publication.persist-deferred 0.053ms; driver.publication.persist-deferred 0.050ms |
| 6aba8157a721bdb40000000000001628 | 42.129 | 2.977 | n/a | 0.000 | 0.051 | 2.053 | 2.223 | 0.035 | 27.575 | 5.125 | 1.881 | 0.185 | n/a | 0.022 | 3.028 | 0.072 | 0.022 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.182ms |
| 6aba8157a721bdb40000000000001a50 | 41.278 | 1.559 | n/a | 0.000 | 0.073 | 1.584 | 0.817 | 0.012 | 0.000 | 0.087 | 36.621 | 0.504 | n/a | 0.020 | 1.633 | 0.040 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.015ms |
| 6aba8157a721bdb40000000000001092 | 40.906 | 2.070 | n/a | 0.000 | 30.609 | 1.667 | 0.772 | 0.015 | 0.000 | 0.203 | 4.612 | 0.938 | n/a | 0.020 | 32.679 | 0.799 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.380ms; driver.reader-basis.broadcast 0.143ms; driver.publication.readback 0.067ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.043ms |
| 6aba8157a721bdb4000000000000083d | 40.839 | 1.568 | n/a | 0.000 | 32.084 | 0.407 | 1.395 | 0.031 | 0.000 | 0.757 | 4.101 | 0.482 | n/a | 0.013 | 33.652 | 0.824 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.097ms; driver.publication.readback 0.079ms; driver.publication.readback 0.061ms; driver.publication.readback 0.059ms; driver.publication.readback 0.049ms |
| 6aba8157a721bdb40000000000001a51 | 40.604 | 3.531 | n/a | 0.000 | 0.018 | 3.368 | 0.902 | 0.011 | 0.000 | 0.046 | 31.546 | 1.172 | n/a | 0.010 | 3.549 | 0.087 | 0.010 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.015ms |
| 6aba8157a721bdb40000000000000bcd | 38.547 | 8.113 | n/a | 0.000 | 0.055 | 4.948 | 2.884 | 0.038 | 0.000 | 0.199 | 22.114 | 0.167 | n/a | 0.028 | 8.168 | 0.212 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.126ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.027ms |
| 6aba8157a721bdb40000000000000bcc | 37.323 | 5.296 | n/a | 0.000 | 0.948 | 1.320 | 1.122 | 0.014 | 0.000 | 0.355 | 26.447 | 1.808 | n/a | 0.013 | 6.244 | 0.167 | 0.013 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.131ms; driver.publication.persist-deferred 0.047ms |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.117 | 0.000 | 0.000 | 0.390 | 1.659 | n/a | 0.000 | 0.042 | 0.539 | 0.822 | 0.011 | 0.000 | 0.102 | 4.184 | 0.460 | n/a | 0.014 | 1.927 | 0.223 | 0.014 |
| p99 | 33.052 | 1.920 | 0.047 | 0.865 | 4.500 | n/a | 0.000 | 15.345 | 5.183 | 3.972 | 0.046 | 0.000 | 3.040 | 19.446 | 4.191 | n/a | 0.041 | 17.006 | 0.727 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6aba8157a721bdb40000000000001a4e | 130.844 | 1.452 | n/a | 0.000 | 0.040 | 1.031 | 1.454 | 0.018 | 0.000 | 0.301 | 126.005 | 0.516 | n/a | 0.028 | 1.492 | 0.011 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.274ms |
| 6aba8157a721bdb40000000000001a4f | 93.312 | 1.466 | n/a | 0.000 | 0.044 | 1.761 | 0.829 | 0.012 | 0.000 | 0.069 | 88.116 | 0.990 | n/a | 0.024 | 1.510 | 0.016 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.274ms; driver.publication.persist-deferred 0.015ms |
| 6aba8157a721bdb400000000000009bb | 61.294 | 2.231 | n/a | 0.000 | 31.924 | 0.465 | 4.008 | 0.013 | 0.000 | 2.092 | 19.441 | 1.102 | n/a | 0.019 | 34.155 | 0.557 | 0.019 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.420ms; driver.publication.readback 0.101ms; driver.publication.readback 0.097ms; driver.publication.readback 0.088ms; driver.publication.readback 0.039ms |
| 6aba8157a721bdb40000000000000838 | 58.217 | 1.847 | n/a | 0.000 | 47.131 | 0.492 | 1.049 | 0.015 | 0.000 | 0.102 | 7.054 | 0.512 | n/a | 0.014 | 48.978 | 0.841 | 0.014 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.167ms; driver.publication.readback 0.117ms; driver.publication.readback 0.097ms; driver.publication.readback 0.079ms |
| 6aba8157a721bdb40000000000001a52 | 44.658 | 2.242 | n/a | 0.000 | 36.725 | 1.929 | 0.559 | 0.009 | 0.000 | 0.040 | 2.688 | 0.454 | n/a | 0.012 | 38.967 | 0.873 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.040ms; driver.publication.readback 0.131ms; driver.publication.readback 0.078ms; driver.publication.readback 0.075ms; driver.publication.persist-deferred 0.043ms |
| 6aba8157a721bdb4000000000000162a | 44.102 | 1.256 | n/a | 0.000 | 0.015 | 29.073 | 0.744 | 0.011 | 0.000 | 0.038 | 12.551 | 0.406 | n/a | 0.008 | 1.270 | 0.029 | 0.008 | node-14/thread-0/socket.wait-first-byte | none observed |
| 6aba8157a721bdb40000000000001a10 | 43.794 | 2.101 | n/a | 0.000 | 0.031 | 0.712 | 1.371 | 0.029 | 0.000 | 1.127 | 36.601 | 1.803 | n/a | 0.020 | 2.132 | 0.049 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.247ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.016ms |
| 6aba8157a721bdb40000000000001628 | 42.129 | 2.977 | n/a | 0.000 | 0.051 | 2.053 | 2.223 | 0.035 | 27.575 | 5.125 | 1.881 | 0.185 | n/a | 0.022 | 3.028 | 0.072 | 0.022 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.182ms |
| 6aba8157a721bdb40000000000001a50 | 41.278 | 1.559 | n/a | 0.000 | 0.073 | 1.584 | 0.817 | 0.012 | 0.000 | 0.087 | 36.621 | 0.504 | n/a | 0.020 | 1.633 | 0.040 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.015ms |
| 6aba8157a721bdb40000000000001092 | 40.906 | 2.070 | n/a | 0.000 | 30.609 | 1.667 | 0.772 | 0.015 | 0.000 | 0.203 | 4.612 | 0.938 | n/a | 0.020 | 32.679 | 0.799 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.380ms; driver.reader-basis.broadcast 0.143ms; driver.publication.readback 0.067ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.043ms |
| 6aba8157a721bdb4000000000000083d | 40.839 | 1.568 | n/a | 0.000 | 32.084 | 0.407 | 1.395 | 0.031 | 0.000 | 0.757 | 4.101 | 0.482 | n/a | 0.013 | 33.652 | 0.824 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.097ms; driver.publication.readback 0.079ms; driver.publication.readback 0.061ms; driver.publication.readback 0.059ms; driver.publication.readback 0.049ms |
| 6aba8157a721bdb40000000000001863 | 36.879 | 1.305 | n/a | 0.000 | 23.240 | 0.327 | 1.118 | 0.021 | 0.000 | 1.229 | 7.758 | 1.869 | n/a | 0.013 | 24.545 | 0.666 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.107ms; driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.061ms; driver.publication.readback 0.055ms; driver.publication.readback 0.044ms |
| 6aba8157a721bdb40000000000000835 | 35.830 | 4.508 | n/a | 0.000 | 0.138 | 1.119 | 1.550 | 0.032 | 0.000 | 3.230 | 16.140 | 9.067 | n/a | 0.046 | 4.646 | 0.130 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.329ms; driver.publication.readback 0.167ms; driver.publication.readback 0.117ms; driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.053ms |
| 6aba8157a721bdb40000000000001b0a | 35.284 | 1.263 | n/a | 0.000 | 26.738 | 0.339 | 0.765 | 0.015 | 0.000 | 0.156 | 5.508 | 0.490 | n/a | 0.010 | 28.001 | 0.794 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.058ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.049ms; driver.publication.readback 0.046ms; driver.publication.readback 0.042ms |
| 6aba8157a721bdb40000000000001a36 | 33.283 | 1.971 | n/a | 0.000 | 1.384 | 0.382 | 0.462 | 0.004 | 0.000 | 0.019 | 28.646 | 0.405 | n/a | 0.010 | 3.354 | 0.101 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.114ms; driver.publication.persist-deferred 0.031ms |
| 6aba8157a721bdb400000000000009b6 | 33.052 | 3.224 | n/a | 0.000 | 2.335 | 5.443 | 0.559 | 0.007 | 0.000 | 0.042 | 11.932 | 9.500 | n/a | 0.010 | 5.559 | 0.168 | 0.010 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.634ms; driver.publication.readback 0.110ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.037ms; driver.publication.persist-deferred 0.033ms |
| 6aba8157a721bdb40000000000000831 | 32.602 | 2.730 | n/a | 0.000 | 0.027 | 3.445 | 1.189 | 0.023 | 0.000 | 0.069 | 24.287 | 0.820 | n/a | 0.011 | 2.757 | 0.085 | 0.011 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.053ms |
| 6aba8157a721bdb40000000000000aa7 | 31.957 | 1.423 | n/a | 0.000 | 21.870 | 0.249 | 0.573 | 0.007 | 0.000 | 0.062 | 6.690 | 1.071 | n/a | 0.013 | 23.293 | 0.729 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.096ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.017ms |
| 6aba8157a721bdb400000000000013ba | 31.326 | 1.522 | n/a | 0.000 | 0.024 | 0.364 | 0.873 | 0.013 | 0.000 | 0.056 | 28.001 | 0.463 | n/a | 0.010 | 1.546 | 0.049 | 0.010 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.332ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.021ms |
| 6aba8157a721bdb400000000000010df | 30.559 | 1.706 | n/a | 0.000 | 22.382 | 0.430 | 0.743 | 0.013 | 0.000 | 0.259 | 4.541 | 0.473 | n/a | 0.012 | 24.088 | 0.788 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.078ms; driver.publication.readback 0.198ms; driver.publication.readback 0.081ms; driver.publication.readback 0.068ms; driver.publication.readback 0.036ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 75.851 | n/a | n/a | n/a | 0.055 | n/a | 0.000 | 0.000 | 1.111 | 75.149 | 0.003 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.126 | 0.055 | 0.001 | 0.126 |
| p99 | 207.241 | n/a | n/a | n/a | 19.082 | n/a | 1.438 | 0.000 | 4.683 | 205.761 | 0.465 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.293 | 19.082 | 0.318 | 0.293 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 176a2efd4fa994720000000000000005 | 207.241 | 0.055 | n/a | 0.000 | 0.000 | 1.111 | 205.761 | 0.026 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.109 | 0.055 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000006 | 206.245 | 0.220 | n/a | 0.000 | 0.000 | 3.539 | 202.205 | 0.012 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.132 | 0.220 | 0.001 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000e9b | 201.953 | 0.047 | n/a | 0.000 | 0.000 | 0.984 | 200.737 | 0.003 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.144 | 0.047 | 0.000 | 0.144 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000e9c | 201.269 | 0.037 | n/a | 0.000 | 0.000 | 0.640 | 200.494 | 0.003 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.063 | 0.037 | 0.000 | 0.063 | gw-r/thread-65/journal/page | none observed |
| 176a2efd4fa994720000000000000e9a | 201.213 | 0.036 | n/a | 0.000 | 0.000 | 0.575 | 200.493 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa994720000000000000530 | 75.851 | 0.054 | n/a | 0.000 | 0.000 | 0.541 | 75.149 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.055 | 0.054 | 0.001 | 0.055 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000e9f | 63.432 | 16.729 | n/a | 1.061 | 0.000 | 1.747 | 43.761 | 0.003 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.126 | 17.790 | 0.280 | 0.126 | gw-r/thread-47/gateway.admitted-work | none observed |
| 9711d877b83fdff30000000000000002 | 63.069 | 0.192 | n/a | 0.000 | 0.000 | 1.336 | 60.601 | 0.465 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.293 | 0.192 | 0.003 | 0.293 | gw-r/thread-48/gateway.admitted-work | none observed |
| 176a2efd4fa994720000000000000ea1 | 62.111 | 15.537 | n/a | 1.438 | 0.000 | 4.683 | 40.286 | 0.003 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.159 | 16.975 | 0.273 | 0.159 | gw-r/thread-65/gateway.admitted-work | none observed |
| 176a2efd4fa994720000000000000ea0 | 60.089 | 19.082 | n/a | 0.000 | 0.000 | 1.560 | 39.252 | 0.003 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.187 | 19.082 | 0.318 | 0.187 | gw-r/thread-45/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1007.137 | n/a | n/a | n/a | 0.376 | n/a | 0.000 | 0.000 | 2.194 | 999.016 | 0.016 | 0.000 | 4.171 | 0.000 | n/a | n/a | 1.365 | 0.376 | 0.000 | 1.365 |
| p99 | 1007.137 | n/a | n/a | n/a | 0.376 | n/a | 0.000 | 0.000 | 2.194 | 999.016 | 0.016 | 0.000 | 4.171 | 0.000 | n/a | n/a | 1.365 | 0.376 | 0.000 | 1.365 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9711d877b83fdff30000000000000017 | 1007.137 | 0.376 | n/a | 0.000 | 0.000 | 2.194 | 999.016 | 0.016 | 0.000 | 4.171 | 0.000 | n/a | n/a | 1.365 | 0.376 | 0.000 | 1.365 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / internal (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 815.252 | n/a | n/a | n/a | 2.431 | n/a | 0.000 | 0.000 | 1.086 | 789.149 | 0.013 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.185 | 2.431 | 0.005 | 0.185 |
| p99 | 1007.835 | n/a | n/a | n/a | 24.893 | n/a | 1.051 | 0.000 | 4.647 | 1001.807 | 0.091 | 0.000 | 0.316 | 0.000 | n/a | n/a | 1.813 | 24.893 | 0.031 | 1.813 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9711d877b83fdff30000000000000024 | 1007.835 | 0.464 | n/a | 0.000 | 0.000 | 4.647 | 1000.773 | 0.013 | 0.000 | 0.126 | 0.000 | n/a | n/a | 1.813 | 0.464 | 0.000 | 1.813 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff3000000000000001d | 1007.634 | 4.754 | n/a | 0.000 | 0.000 | 1.308 | 1001.364 | 0.011 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.105 | 4.754 | 0.005 | 0.105 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff3000000000000002e | 1005.930 | 0.136 | n/a | 0.000 | 0.000 | 3.829 | 1000.761 | 0.010 | 0.000 | 0.082 | 0.000 | n/a | n/a | 1.112 | 0.136 | 0.000 | 1.112 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff3000000000000001f | 1004.641 | 0.323 | n/a | 0.000 | 0.000 | 0.845 | 1001.760 | 0.085 | 0.000 | 0.316 | 0.000 | n/a | n/a | 1.312 | 0.323 | 0.000 | 1.312 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff30000000000000035 | 1004.317 | 0.125 | n/a | 0.000 | 0.000 | 0.926 | 1001.807 | 0.091 | 0.000 | 0.246 | 0.000 | n/a | n/a | 1.122 | 0.125 | 0.000 | 1.122 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff3000000000000001a | 1003.641 | 0.361 | n/a | 0.000 | 0.000 | 1.261 | 1000.766 | 0.015 | 0.000 | 0.063 | 0.000 | n/a | n/a | 1.176 | 0.361 | 0.000 | 1.176 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff30000000000000029 | 1003.600 | 0.218 | n/a | 0.000 | 0.000 | 1.062 | 1001.037 | 0.012 | 0.000 | 0.111 | 0.000 | n/a | n/a | 1.160 | 0.218 | 0.000 | 1.160 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff3000000000000002a | 1003.437 | 0.194 | n/a | 0.000 | 0.000 | 0.999 | 1000.910 | 0.019 | 0.000 | 0.181 | 0.000 | n/a | n/a | 1.134 | 0.194 | 0.000 | 1.134 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff3000000000000003a | 1002.953 | 0.125 | n/a | 0.000 | 0.000 | 0.694 | 1000.983 | 0.010 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.108 | 0.125 | 0.000 | 1.108 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000034 | 933.356 | 3.576 | n/a | 0.440 | 0.000 | 1.289 | 927.867 | 0.012 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.102 | 4.017 | 0.004 | 0.102 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff30000000000000025 | 875.956 | 5.552 | n/a | 0.000 | 0.000 | 1.086 | 868.893 | 0.018 | 0.000 | 0.222 | 0.000 | n/a | n/a | 0.185 | 5.552 | 0.006 | 0.185 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000018 | 815.252 | 24.893 | n/a | 0.000 | 0.000 | 0.815 | 789.149 | 0.015 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.268 | 24.893 | 0.031 | 0.268 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000032 | 661.873 | 5.813 | n/a | 1.051 | 0.000 | 0.618 | 654.007 | 0.012 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.291 | 6.864 | 0.010 | 0.291 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff3000000000000002b | 495.034 | 2.431 | n/a | 0.000 | 0.000 | 1.256 | 491.152 | 0.012 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.087 | 2.431 | 0.005 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff30000000000000027 | 434.551 | 2.630 | n/a | 0.000 | 0.000 | 0.669 | 431.074 | 0.011 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.081 | 2.630 | 0.006 | 0.081 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000030 | 372.538 | 5.511 | n/a | 0.000 | 0.000 | 2.516 | 364.290 | 0.021 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.102 | 5.511 | 0.015 | 0.102 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff30000000000000022 | 310.637 | 4.104 | n/a | 0.000 | 0.000 | 0.860 | 305.340 | 0.021 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.164 | 4.104 | 0.013 | 0.164 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000038 | 284.981 | 3.984 | n/a | 0.268 | 0.000 | 1.813 | 278.721 | 0.013 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.104 | 4.252 | 0.015 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff30000000000000037 | 268.371 | 4.426 | n/a | 0.585 | 0.000 | 2.671 | 260.405 | 0.013 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.153 | 5.011 | 0.019 | 0.153 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff3000000000000002d | 244.918 | 2.203 | n/a | 0.000 | 0.000 | 0.794 | 241.722 | 0.011 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.094 | 2.203 | 0.009 | 0.094 | gw-r/thread-52/journal/page | none observed |

## P3 / L1 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 584.812 | n/a | n/a | n/a | 2.250 | n/a | 0.000 | 0.000 | 0.707 | 566.311 | 0.012 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.100 | 2.482 | 0.008 | 0.100 |
| p99 | 1007.462 | n/a | n/a | n/a | 16.808 | n/a | 3.320 | 0.000 | 5.147 | 1001.760 | 0.041 | 8.257 | 2.372 | 0.000 | n/a | n/a | 1.217 | 17.759 | 0.135 | 1.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9711d877b83fdff3000000000000003d | 1007.462 | 0.226 | n/a | 0.000 | 0.000 | 4.955 | 1000.972 | 0.020 | 0.000 | 0.152 | 0.000 | n/a | n/a | 1.136 | 0.226 | 0.000 | 1.136 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000043 | 1005.053 | 0.181 | n/a | 0.000 | 0.000 | 0.707 | 1000.617 | 0.015 | 0.000 | 2.372 | 0.000 | n/a | n/a | 1.160 | 0.181 | 0.000 | 1.160 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff30000000000000048 | 1004.268 | 0.215 | n/a | 0.000 | 0.000 | 1.031 | 1001.749 | 0.013 | 0.000 | 0.089 | 0.000 | n/a | n/a | 1.171 | 0.215 | 0.000 | 1.171 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff3000000000000004d | 1003.661 | 0.312 | n/a | 0.000 | 0.000 | 0.910 | 1001.083 | 0.028 | 0.000 | 0.160 | 0.000 | n/a | n/a | 1.168 | 0.312 | 0.000 | 1.168 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff30000000000000041 | 1003.589 | 0.210 | n/a | 0.000 | 0.000 | 0.997 | 1001.115 | 0.012 | 0.000 | 0.110 | 0.000 | n/a | n/a | 1.145 | 0.210 | 0.000 | 1.145 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff30000000000000046 | 1003.418 | 0.140 | n/a | 0.000 | 0.000 | 1.276 | 1001.760 | 0.025 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.058 | 0.140 | 0.000 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff30000000000000068 | 1003.239 | 0.121 | n/a | 0.000 | 0.000 | 1.246 | 1000.697 | 0.010 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.123 | 0.121 | 0.000 | 1.123 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff30000000000000047 | 1003.105 | 0.125 | n/a | 0.000 | 0.000 | 0.487 | 1001.250 | 0.025 | 0.000 | 0.117 | 0.000 | n/a | n/a | 1.102 | 0.125 | 0.000 | 1.102 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff30000000000000065 | 1002.919 | 0.145 | n/a | 0.000 | 0.000 | 0.584 | 1000.951 | 0.014 | 0.000 | 0.124 | 0.000 | n/a | n/a | 1.101 | 0.145 | 0.000 | 1.101 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000062 | 1002.742 | 0.140 | n/a | 0.000 | 0.000 | 0.453 | 1000.923 | 0.012 | 0.000 | 0.144 | 0.000 | n/a | n/a | 1.070 | 0.140 | 0.000 | 1.070 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff3000000000000006f | 1002.562 | 0.118 | n/a | 0.000 | 0.000 | 0.542 | 1000.608 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 1.217 | 0.118 | 0.000 | 1.217 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff3000000000000003c | 1002.217 | 0.131 | n/a | 0.000 | 0.000 | 0.509 | 1000.420 | 0.008 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.119 | 0.131 | 0.000 | 1.119 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff30000000000000066 | 805.004 | 2.588 | n/a | 0.000 | 0.000 | 0.508 | 801.684 | 0.027 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.077 | 2.588 | 0.003 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff30000000000000044 | 794.771 | 9.919 | n/a | 0.869 | 0.000 | 0.939 | 782.705 | 0.025 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.214 | 10.788 | 0.014 | 0.214 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000060 | 676.914 | 5.601 | n/a | 0.230 | 0.000 | 0.666 | 670.135 | 0.012 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.192 | 5.831 | 0.009 | 0.192 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000052 | 646.119 | 2.231 | n/a | 0.251 | 0.000 | 0.802 | 642.668 | 0.012 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.078 | 2.482 | 0.004 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000050 | 584.812 | 16.808 | n/a | 0.951 | 0.000 | 0.561 | 566.311 | 0.012 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.095 | 17.759 | 0.030 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000069 | 557.931 | 4.075 | n/a | 1.573 | 0.000 | 0.607 | 551.529 | 0.010 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.086 | 5.647 | 0.010 | 0.086 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff3000000000000003e | 477.826 | 3.497 | n/a | 0.463 | 0.000 | 0.893 | 472.801 | 0.011 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.078 | 3.960 | 0.008 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000056 | 462.263 | 4.874 | n/a | 0.260 | 0.000 | 0.612 | 456.357 | 0.011 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.100 | 5.134 | 0.011 | 0.100 | gw-r/thread-52/journal/page | none observed |

## P3 / L4 / internal (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 773.479 | n/a | n/a | n/a | 2.405 | n/a | 0.000 | 0.000 | 0.825 | 768.114 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.120 | 2.405 | 0.007 | 0.120 |
| p99 | 1005.517 | n/a | n/a | n/a | 8.463 | n/a | 2.612 | 0.000 | 5.144 | 1003.321 | 0.068 | 15.829 | 0.219 | 0.000 | n/a | n/a | 1.193 | 10.980 | 0.145 | 1.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9711d877b83fdff30000000000000083 | 1005.517 | 0.251 | n/a | 0.000 | 0.000 | 0.603 | 1003.321 | 0.030 | 0.000 | 0.136 | 0.000 | n/a | n/a | 1.175 | 0.251 | 0.000 | 1.175 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000075 | 1005.328 | 0.125 | n/a | 0.000 | 0.000 | 2.853 | 1001.125 | 0.013 | 0.000 | 0.105 | 0.000 | n/a | n/a | 1.107 | 0.125 | 0.000 | 1.107 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff30000000000000090 | 1004.040 | 0.134 | n/a | 0.000 | 0.000 | 0.777 | 1001.761 | 0.024 | 0.000 | 0.219 | 0.000 | n/a | n/a | 1.125 | 0.134 | 0.000 | 1.125 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000072 | 1003.906 | 0.116 | n/a | 0.000 | 0.000 | 0.775 | 1001.671 | 0.068 | 0.000 | 0.175 | 0.000 | n/a | n/a | 1.102 | 0.116 | 0.000 | 1.102 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000087 | 1003.780 | 0.226 | n/a | 0.000 | 0.000 | 1.258 | 1001.019 | 0.015 | 0.000 | 0.119 | 0.000 | n/a | n/a | 1.143 | 0.226 | 0.000 | 1.143 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff3000000000000009a | 1003.721 | 0.156 | n/a | 0.000 | 0.000 | 1.486 | 1000.868 | 0.012 | 0.000 | 0.080 | 0.000 | n/a | n/a | 1.119 | 0.156 | 0.000 | 1.119 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff3000000000000007c | 1003.554 | 0.314 | n/a | 0.000 | 0.000 | 1.164 | 1000.817 | 0.014 | 0.000 | 0.065 | 0.000 | n/a | n/a | 1.180 | 0.314 | 0.000 | 1.180 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000085 | 1003.460 | 0.246 | n/a | 0.000 | 0.000 | 1.106 | 1000.909 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.144 | 0.246 | 0.000 | 1.144 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff3000000000000007d | 1003.444 | 0.166 | n/a | 0.000 | 0.000 | 0.921 | 1001.054 | 0.026 | 0.000 | 0.150 | 0.000 | n/a | n/a | 1.126 | 0.166 | 0.000 | 1.126 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff300000000000000a1 | 1003.273 | 0.211 | n/a | 0.000 | 0.000 | 1.274 | 1000.556 | 0.010 | 0.000 | 0.029 | 0.000 | n/a | n/a | 1.193 | 0.211 | 0.000 | 1.193 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff30000000000000093 | 1002.833 | 0.162 | n/a | 0.000 | 0.000 | 0.621 | 1000.830 | 0.014 | 0.000 | 0.086 | 0.000 | n/a | n/a | 1.119 | 0.162 | 0.000 | 1.119 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000089 | 1002.695 | 0.148 | n/a | 0.000 | 0.000 | 0.825 | 1000.573 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.109 | 0.148 | 0.000 | 1.109 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000094 | 908.715 | 8.463 | n/a | 2.518 | 0.000 | 0.634 | 881.095 | 0.011 | 15.829 | 0.067 | 0.000 | n/a | n/a | 0.098 | 10.980 | 0.012 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff3000000000000008c | 902.673 | 5.848 | n/a | 2.612 | 0.000 | 0.424 | 893.562 | 0.016 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.106 | 8.460 | 0.009 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000070 | 865.871 | 3.494 | n/a | 2.225 | 0.000 | 0.553 | 859.439 | 0.012 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.084 | 5.719 | 0.007 | 0.084 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000098 | 773.479 | 3.074 | n/a | 0.000 | 0.000 | 2.095 | 768.114 | 0.011 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.116 | 3.074 | 0.004 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff30000000000000096 | 678.503 | 2.596 | n/a | 0.000 | 0.000 | 1.085 | 674.658 | 0.012 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.070 | 2.596 | 0.004 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff3000000000000008a | 600.287 | 4.662 | n/a | 0.000 | 0.000 | 0.654 | 594.770 | 0.011 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.124 | 4.662 | 0.008 | 0.124 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff3000000000000009b | 580.844 | 4.643 | n/a | 0.000 | 0.000 | 0.734 | 575.325 | 0.011 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.087 | 4.643 | 0.008 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000082 | 545.292 | 6.594 | n/a | 2.340 | 0.000 | 0.749 | 535.456 | 0.011 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.076 | 8.934 | 0.016 | 0.076 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 799.078 | n/a | n/a | n/a | 1.928 | n/a | 0.000 | 0.000 | 0.732 | 796.462 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.080 | 1.928 | 0.005 | 0.080 |
| p99 | 1005.789 | n/a | n/a | n/a | 7.725 | n/a | 0.536 | 0.000 | 3.689 | 1001.168 | 7.969 | 12.859 | 0.157 | 0.000 | n/a | n/a | 1.196 | 8.028 | 0.340 | 1.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9711d877b83fdff300000000000000d2 | 1005.789 | 0.123 | n/a | 0.000 | 0.000 | 3.689 | 1000.799 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 1.108 | 0.123 | 0.000 | 1.108 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff300000000000000aa | 1003.391 | 0.214 | n/a | 0.000 | 0.000 | 0.754 | 1001.124 | 0.011 | 0.000 | 0.157 | 0.000 | n/a | n/a | 1.132 | 0.214 | 0.000 | 1.132 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000000c9 | 1003.300 | 0.193 | n/a | 0.000 | 0.000 | 0.734 | 1001.096 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.196 | 0.193 | 0.000 | 1.196 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff300000000000000d4 | 1003.073 | 0.114 | n/a | 0.000 | 0.000 | 0.604 | 1001.168 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 1.102 | 0.114 | 0.000 | 1.102 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff300000000000000b8 | 1003.056 | 0.147 | n/a | 0.000 | 0.000 | 0.587 | 1001.144 | 0.012 | 0.000 | 0.065 | 0.000 | n/a | n/a | 1.100 | 0.147 | 0.000 | 1.100 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff300000000000000cd | 1002.887 | 0.205 | n/a | 0.000 | 0.000 | 0.707 | 1000.783 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 1.158 | 0.205 | 0.000 | 1.158 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff300000000000000bf | 1002.789 | 0.146 | n/a | 0.000 | 0.000 | 0.930 | 1000.572 | 0.008 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.116 | 0.146 | 0.000 | 1.116 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000000c5 | 1002.769 | 0.123 | n/a | 0.000 | 0.000 | 0.478 | 1000.967 | 0.020 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.108 | 0.123 | 0.000 | 1.108 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff300000000000000d3 | 1002.739 | 0.108 | n/a | 0.000 | 0.000 | 0.530 | 1000.927 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 1.099 | 0.108 | 0.000 | 1.099 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff300000000000000c0 | 1002.697 | 0.224 | n/a | 0.000 | 0.000 | 0.804 | 1000.490 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 1.147 | 0.224 | 0.000 | 1.147 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff300000000000000ab | 1002.479 | 0.134 | n/a | 0.000 | 0.000 | 0.615 | 1000.580 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.110 | 0.134 | 0.000 | 1.110 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff300000000000000d6 | 1002.452 | 0.120 | n/a | 0.000 | 0.000 | 0.528 | 1000.663 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.105 | 0.120 | 0.000 | 1.105 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff300000000000000a5 | 890.632 | 1.801 | n/a | 0.000 | 0.000 | 1.157 | 887.491 | 0.009 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.089 | 1.801 | 0.002 | 0.089 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff300000000000000b0 | 875.300 | 3.466 | n/a | 0.000 | 0.000 | 3.125 | 855.736 | 0.005 | 12.859 | 0.045 | 0.000 | n/a | n/a | 0.064 | 3.466 | 0.004 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000000ce | 853.834 | 1.899 | n/a | 0.000 | 0.000 | 0.979 | 850.844 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.079 | 1.899 | 0.002 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000000b9 | 842.919 | 7.725 | n/a | 0.303 | 0.000 | 0.805 | 833.962 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.080 | 8.028 | 0.010 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff300000000000000c8 | 799.078 | 2.143 | n/a | 0.000 | 0.000 | 0.372 | 796.462 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.061 | 2.143 | 0.003 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff300000000000000c3 | 618.473 | 4.142 | n/a | 0.000 | 0.000 | 1.363 | 612.864 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.072 | 4.142 | 0.007 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff300000000000000ba | 521.324 | 2.728 | n/a | 0.000 | 0.000 | 0.759 | 517.714 | 0.009 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.075 | 2.728 | 0.005 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff300000000000000c6 | 365.590 | 2.164 | n/a | 0.000 | 0.000 | 0.452 | 362.877 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.059 | 2.164 | 0.006 | 0.059 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / internal (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.691 | n/a | n/a | n/a | 2.440 | n/a | 0.000 | 0.000 | 0.678 | 418.457 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.114 | 2.440 | 0.006 | 0.114 |
| p99 | 1003.254 | n/a | n/a | n/a | 10.059 | n/a | 0.587 | 0.000 | 5.937 | 1001.236 | 2.121 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.192 | 10.059 | 0.336 | 1.192 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9711d877b83fdff30000000000000109 | 1003.254 | 0.213 | n/a | 0.000 | 0.000 | 0.829 | 1001.011 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.150 | 0.213 | 0.000 | 1.150 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff30000000000000107 | 1003.073 | 0.118 | n/a | 0.000 | 0.000 | 0.527 | 1001.236 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.099 | 0.118 | 0.000 | 1.099 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000000ef | 1002.964 | 0.166 | n/a | 0.000 | 0.000 | 0.565 | 1001.038 | 0.038 | 0.000 | 0.014 | 0.000 | n/a | n/a | 1.142 | 0.166 | 0.000 | 1.142 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000000e3 | 1002.882 | 0.184 | n/a | 0.000 | 0.000 | 0.986 | 1000.499 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 1.184 | 0.184 | 0.000 | 1.184 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff300000000000000ed | 1002.752 | 0.112 | n/a | 0.000 | 0.000 | 0.742 | 1000.762 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.096 | 0.112 | 0.000 | 1.096 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff30000000000000108 | 1002.708 | 0.247 | n/a | 0.000 | 0.000 | 0.812 | 1000.438 | 0.004 | 0.000 | 0.015 | 0.000 | n/a | n/a | 1.192 | 0.247 | 0.000 | 1.192 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff300000000000000ee | 1002.666 | 0.207 | n/a | 0.000 | 0.000 | 0.678 | 1000.586 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.157 | 0.207 | 0.000 | 1.157 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff300000000000000fb | 1002.431 | 0.128 | n/a | 0.000 | 0.000 | 0.534 | 1000.601 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.111 | 0.128 | 0.000 | 1.111 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000116 | 1002.404 | 0.196 | n/a | 0.000 | 0.000 | 0.616 | 1000.430 | 0.006 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.135 | 0.196 | 0.000 | 1.135 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000000f6 | 870.670 | 4.067 | n/a | 0.000 | 0.000 | 5.937 | 860.548 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.073 | 4.067 | 0.005 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff300000000000000d8 | 798.727 | 6.113 | n/a | 0.000 | 0.000 | 0.463 | 792.050 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.071 | 6.113 | 0.008 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff300000000000000e7 | 778.940 | 5.629 | n/a | 0.000 | 0.000 | 0.545 | 772.533 | 0.011 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.195 | 5.629 | 0.007 | 0.195 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000000e9 | 760.347 | 3.917 | n/a | 0.000 | 0.000 | 0.581 | 755.688 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.123 | 3.917 | 0.005 | 0.123 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000112 | 728.259 | 3.332 | n/a | 0.000 | 0.000 | 0.538 | 723.865 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.454 | 3.332 | 0.005 | 0.454 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000000ff | 591.275 | 2.543 | n/a | 0.000 | 0.000 | 0.831 | 587.779 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.068 | 2.543 | 0.004 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff300000000000000e5 | 577.941 | 1.784 | n/a | 0.000 | 0.000 | 0.641 | 575.395 | 0.011 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.073 | 1.784 | 0.003 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff300000000000000e0 | 569.031 | 1.644 | n/a | 0.000 | 0.000 | 0.551 | 566.718 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.078 | 1.644 | 0.003 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff30000000000000114 | 557.843 | 2.312 | n/a | 0.000 | 0.000 | 0.533 | 554.893 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.055 | 2.312 | 0.004 | 0.055 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff300000000000000f0 | 502.762 | 10.059 | n/a | 0.000 | 0.000 | 0.640 | 491.041 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.968 | 10.059 | 0.020 | 0.968 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff300000000000000eb | 421.691 | 1.945 | n/a | 0.000 | 0.000 | 1.139 | 418.457 | 0.031 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.069 | 1.945 | 0.005 | 0.069 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 602.799 | n/a | n/a | n/a | 2.205 | n/a | 0.000 | 0.000 | 0.594 | 599.789 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.084 | 2.306 | 0.004 | 0.084 |
| p99 | 1005.731 | n/a | n/a | n/a | 11.456 | n/a | 0.646 | 0.000 | 4.039 | 1002.198 | 0.019 | 0.000 | 1.164 | 0.000 | n/a | n/a | 1.155 | 11.456 | 0.157 | 1.155 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9711d877b83fdff30000000000000128 | 1005.731 | 0.137 | n/a | 0.000 | 0.000 | 4.039 | 1000.428 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.102 | 0.137 | 0.000 | 1.102 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff30000000000000133 | 1004.228 | 0.152 | n/a | 0.000 | 0.000 | 0.747 | 1002.198 | 0.009 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.105 | 0.152 | 0.000 | 1.105 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000148 | 1002.957 | 0.138 | n/a | 0.000 | 0.000 | 0.700 | 1000.928 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.118 | 0.138 | 0.000 | 1.118 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff3000000000000014a | 1002.919 | 0.187 | n/a | 0.000 | 0.000 | 0.764 | 1000.781 | 0.007 | 0.000 | 0.026 | 0.000 | n/a | n/a | 1.155 | 0.187 | 0.000 | 1.155 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff3000000000000011c | 1002.747 | 0.201 | n/a | 0.000 | 0.000 | 0.727 | 1000.641 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.127 | 0.201 | 0.000 | 1.127 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000139 | 1002.475 | 0.111 | n/a | 0.000 | 0.000 | 0.509 | 1000.705 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.095 | 0.111 | 0.000 | 1.095 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff3000000000000012d | 1002.432 | 0.108 | n/a | 0.000 | 0.000 | 0.493 | 1000.674 | 0.012 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.090 | 0.108 | 0.000 | 1.090 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff3000000000000014d | 1002.416 | 0.112 | n/a | 0.000 | 0.000 | 0.439 | 1000.693 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.107 | 0.112 | 0.000 | 1.107 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff3000000000000014e | 1002.370 | 0.111 | n/a | 0.000 | 0.000 | 0.470 | 999.519 | 0.004 | 0.000 | 1.164 | 0.000 | n/a | n/a | 1.102 | 0.111 | 0.000 | 1.102 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000140 | 1002.370 | 0.116 | n/a | 0.000 | 0.000 | 0.378 | 1000.672 | 0.019 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.106 | 0.116 | 0.000 | 1.106 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff3000000000000014f | 1002.269 | 0.109 | n/a | 0.000 | 0.000 | 0.398 | 1000.614 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.095 | 0.109 | 0.000 | 1.095 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff3000000000000013a | 971.542 | 2.347 | n/a | 0.000 | 0.000 | 0.546 | 968.544 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.064 | 2.347 | 0.002 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff3000000000000013b | 944.631 | 2.809 | n/a | 0.000 | 0.000 | 1.124 | 940.495 | 0.012 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.142 | 2.809 | 0.003 | 0.142 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000129 | 925.080 | 2.524 | n/a | 0.000 | 0.000 | 0.475 | 921.971 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.078 | 2.524 | 0.003 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000132 | 845.759 | 4.457 | n/a | 0.000 | 0.000 | 2.143 | 839.041 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.082 | 4.457 | 0.005 | 0.082 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff3000000000000011b | 621.415 | 1.728 | n/a | 0.000 | 0.000 | 0.394 | 619.196 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.060 | 1.728 | 0.003 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff30000000000000123 | 602.799 | 2.306 | n/a | 0.000 | 0.000 | 0.609 | 599.789 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.055 | 2.306 | 0.004 | 0.055 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000130 | 602.530 | 2.387 | n/a | 0.000 | 0.000 | 0.566 | 599.461 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.075 | 2.387 | 0.004 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff3000000000000014b | 519.935 | 11.456 | n/a | 0.000 | 0.000 | 0.806 | 507.499 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.096 | 11.456 | 0.022 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff30000000000000121 | 472.299 | 4.381 | n/a | 0.646 | 0.000 | 0.594 | 466.546 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.085 | 5.026 | 0.011 | 0.085 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / internal (737 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.325 | n/a | n/a | n/a | 3.267 | n/a | 0.000 | 0.000 | 0.560 | 8.848 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.091 | 3.292 | 0.254 | 0.091 |
| p99 | 115.872 | n/a | n/a | n/a | 13.113 | n/a | 0.663 | 0.000 | 4.429 | 108.726 | 0.019 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.647 | 13.303 | 0.827 | 0.647 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9711d877b83fdff30000000000000157 | 1004.611 | 0.121 | n/a | 0.000 | 0.000 | 2.562 | 1000.763 | 0.007 | 0.000 | 0.061 | 0.000 | n/a | n/a | 1.096 | 0.121 | 0.000 | 1.096 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000159 | 1001.983 | 0.095 | n/a | 0.000 | 0.000 | 0.409 | 1000.362 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.092 | 0.095 | 0.000 | 1.092 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff30000000000000152 | 850.809 | 2.033 | n/a | 0.000 | 0.000 | 0.626 | 848.047 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.057 | 2.033 | 0.002 | 0.057 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff30000000000000150 | 834.818 | 2.182 | n/a | 0.000 | 0.000 | 0.339 | 832.194 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.068 | 2.182 | 0.003 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000155 | 783.619 | 2.120 | n/a | 0.000 | 0.000 | 0.510 | 780.869 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.074 | 2.120 | 0.003 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000154 | 248.013 | 1.968 | n/a | 0.000 | 0.000 | 0.565 | 245.376 | 0.007 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.061 | 1.968 | 0.008 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff3000000000000015a | 176.194 | 4.702 | n/a | 0.000 | 0.000 | 0.614 | 170.707 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.131 | 4.702 | 0.027 | 0.131 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000417 | 115.872 | 6.619 | n/a | 0.000 | 0.000 | 0.348 | 108.726 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.126 | 6.619 | 0.057 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff30000000000000242 | 99.720 | 2.577 | n/a | 0.000 | 0.000 | 0.466 | 96.542 | 0.009 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.065 | 2.577 | 0.026 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff30000000000000225 | 97.357 | 5.668 | n/a | 0.000 | 0.000 | 0.546 | 90.970 | 0.010 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.112 | 5.668 | 0.058 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff30000000000000591 | 95.427 | 4.324 | n/a | 0.494 | 0.000 | 0.716 | 89.753 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.116 | 4.818 | 0.050 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000006c7 | 85.702 | 2.952 | n/a | 0.000 | 0.000 | 0.399 | 82.190 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.135 | 2.952 | 0.034 | 0.135 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff30000000000000681 | 85.652 | 2.765 | n/a | 0.000 | 0.000 | 0.456 | 82.297 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.084 | 2.765 | 0.032 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff30000000000000420 | 85.092 | 2.266 | n/a | 0.000 | 0.000 | 0.401 | 82.313 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.102 | 2.266 | 0.027 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff3000000000000033c | 84.179 | 11.930 | n/a | 0.000 | 0.000 | 0.560 | 10.839 | 0.002 | 60.698 | 0.010 | 0.000 | n/a | n/a | 0.141 | 11.930 | 0.142 | 0.141 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| 9711d877b83fdff3000000000000074b | 83.298 | 6.301 | n/a | 0.000 | 0.000 | 0.578 | 76.003 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.363 | 6.301 | 0.076 | 0.363 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000000716 | 77.546 | 2.615 | n/a | 0.000 | 0.000 | 0.415 | 74.419 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.065 | 2.615 | 0.034 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff30000000000000516 | 75.463 | 4.182 | n/a | 0.000 | 0.000 | 0.500 | 70.671 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.093 | 4.182 | 0.055 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff3000000000000055e | 74.085 | 3.521 | n/a | 0.000 | 0.000 | 0.436 | 70.009 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.066 | 3.521 | 0.048 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff300000000000006b3 | 72.865 | 4.427 | n/a | 0.000 | 0.000 | 0.392 | 67.907 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.107 | 4.427 | 0.061 | 0.107 | gw-r/thread-51/journal/page | none observed |

## P3 / tail / internal (2222 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.186 | n/a | n/a | n/a | 4.586 | n/a | 0.000 | 0.000 | 0.473 | 7.145 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.138 | 4.623 | 0.377 | 0.138 |
| p99 | 343.559 | n/a | n/a | n/a | 18.322 | n/a | 1.407 | 0.000 | 4.242 | 337.867 | 0.019 | 9.817 | 0.047 | 0.000 | n/a | n/a | 1.703 | 19.451 | 0.842 | 1.703 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9711d877b83fdff300000000000019b5 | 1002.548 | 0.115 | n/a | 0.000 | 0.000 | 0.444 | 1000.844 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.089 | 0.115 | 0.000 | 1.089 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff3000000000000199b | 1002.448 | 0.167 | n/a | 0.000 | 0.000 | 0.551 | 1000.578 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.116 | 0.167 | 0.000 | 1.116 | gw-r/thread-45/journal/page | none observed |
| 9711d877b83fdff3000000000000197b | 1002.323 | 0.100 | n/a | 0.000 | 0.000 | 0.308 | 1000.769 | 0.009 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.090 | 0.100 | 0.000 | 1.090 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff3000000000000197c | 1002.096 | 0.094 | n/a | 0.000 | 0.000 | 0.428 | 1000.463 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.092 | 0.094 | 0.000 | 1.092 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff3000000000000197e | 1002.061 | 0.099 | n/a | 0.000 | 0.000 | 0.357 | 1000.476 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.092 | 0.099 | 0.000 | 1.092 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff30000000000001984 | 1001.962 | 0.103 | n/a | 0.000 | 0.000 | 0.353 | 1000.392 | 0.005 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.093 | 0.103 | 0.000 | 1.093 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000001998 | 1001.954 | 0.095 | n/a | 0.000 | 0.000 | 0.385 | 1000.370 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 1.085 | 0.095 | 0.000 | 1.085 | gw-r/thread-52/journal/page | none observed |
| 9711d877b83fdff300000000000019b9 | 1001.948 | 0.110 | n/a | 0.000 | 0.000 | 0.346 | 1000.383 | 0.004 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.088 | 0.110 | 0.000 | 1.088 | gw-r/thread-48/journal/page | none observed |
| 9711d877b83fdff300000000000019be | 1001.879 | 0.140 | n/a | 0.000 | 0.000 | 0.342 | 1000.289 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 1.090 | 0.140 | 0.000 | 1.090 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff300000000000019b0 | 1001.861 | 0.091 | n/a | 0.000 | 0.000 | 0.254 | 1000.399 | 0.003 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.083 | 0.091 | 0.000 | 1.083 | gw-r/thread-50/journal/page | none observed |
| 9711d877b83fdff3000000000000198d | 970.055 | 9.098 | n/a | 0.000 | 0.000 | 0.739 | 959.886 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.312 | 9.098 | 0.009 | 0.312 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff300000000000019a8 | 922.715 | 3.658 | n/a | 0.000 | 0.000 | 0.471 | 918.436 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.123 | 3.658 | 0.004 | 0.123 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff3000000000000197d | 816.408 | 11.242 | n/a | 0.000 | 0.000 | 0.543 | 804.201 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.384 | 11.242 | 0.014 | 0.384 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff300000000000019b7 | 729.926 | 5.416 | n/a | 0.000 | 0.000 | 0.588 | 723.657 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.213 | 5.416 | 0.007 | 0.213 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff30000000000001997 | 704.775 | 3.181 | n/a | 0.000 | 0.000 | 0.484 | 700.955 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.130 | 3.181 | 0.005 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 9711d877b83fdff30000000000001992 | 689.835 | 11.742 | n/a | 1.124 | 0.000 | 0.401 | 676.192 | 0.008 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.337 | 12.866 | 0.019 | 0.337 | gw-r/thread-51/journal/page | none observed |
| 9711d877b83fdff300000000000019ad | 627.793 | 3.545 | n/a | 0.000 | 0.000 | 0.414 | 623.697 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.104 | 3.545 | 0.006 | 0.104 | gw-r/thread-65/journal/page | none observed |
| 9711d877b83fdff30000000000001985 | 625.947 | 5.407 | n/a | 0.000 | 0.000 | 0.706 | 619.602 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.198 | 5.407 | 0.009 | 0.198 | gw-r/thread-65/journal/page | none observed |
| 9711d877b83fdff300000000000019b3 | 460.012 | 2.586 | n/a | 0.000 | 0.000 | 0.429 | 456.849 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.116 | 2.586 | 0.006 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 9711d877b83fdff300000000000019ba | 446.278 | 2.863 | n/a | 0.000 | 0.000 | 0.397 | 442.868 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.097 | 2.863 | 0.006 | 0.097 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / read (70 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.720 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 1.034 | 201.251 | 0.015 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.080 | 0.040 | 0.000 | 0.080 |
| p99 | 206.979 | n/a | n/a | n/a | 0.146 | n/a | 0.000 | 0.000 | 3.786 | 205.875 | 4.519 | 0.000 | 0.698 | 0.000 | n/a | n/a | 0.246 | 0.146 | 0.001 | 0.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 176a2efd4fa99472000000000000003c | 206.979 | 0.034 | n/a | 0.000 | 0.000 | 0.797 | 205.875 | 0.044 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.068 | 0.034 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa994720000000000000007 | 206.282 | 0.037 | n/a | 0.000 | 0.000 | 1.885 | 203.930 | 0.024 | 0.000 | 0.247 | 0.000 | n/a | n/a | 0.159 | 0.037 | 0.000 | 0.159 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa99472000000000000000a | 205.278 | 0.063 | n/a | 0.000 | 0.000 | 3.786 | 201.046 | 0.015 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.196 | 0.063 | 0.000 | 0.196 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000046 | 205.263 | 0.032 | n/a | 0.000 | 0.000 | 0.915 | 204.170 | 0.009 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa99472000000000000003f | 205.103 | 0.028 | n/a | 0.000 | 0.000 | 1.228 | 203.153 | 0.417 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.070 | 0.028 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000047 | 204.856 | 0.048 | n/a | 0.000 | 0.000 | 0.843 | 203.678 | 0.013 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.133 | 0.048 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa99472000000000000000c | 204.433 | 0.046 | n/a | 0.000 | 0.000 | 1.307 | 202.558 | 0.072 | 0.000 | 0.343 | 0.000 | n/a | n/a | 0.107 | 0.046 | 0.000 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa99472000000000000002a | 204.398 | 0.053 | n/a | 0.000 | 0.000 | 2.181 | 201.713 | 0.023 | 0.000 | 0.308 | 0.000 | n/a | n/a | 0.120 | 0.053 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000039 | 204.356 | 0.040 | n/a | 0.000 | 0.000 | 1.464 | 202.596 | 0.012 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.096 | 0.040 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa99472000000000000001f | 204.345 | 0.082 | n/a | 0.000 | 0.000 | 1.628 | 202.189 | 0.020 | 0.000 | 0.229 | 0.000 | n/a | n/a | 0.197 | 0.082 | 0.000 | 0.197 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000030 | 204.280 | 0.058 | n/a | 0.000 | 0.000 | 1.144 | 202.672 | 0.038 | 0.000 | 0.240 | 0.000 | n/a | n/a | 0.128 | 0.058 | 0.000 | 0.128 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa99472000000000000001e | 204.169 | 0.041 | n/a | 0.000 | 0.000 | 2.233 | 201.562 | 0.016 | 0.000 | 0.223 | 0.000 | n/a | n/a | 0.094 | 0.041 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000018 | 204.124 | 0.051 | n/a | 0.000 | 0.000 | 2.118 | 201.659 | 0.014 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.146 | 0.051 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000042 | 204.033 | 0.052 | n/a | 0.000 | 0.000 | 2.082 | 201.495 | 0.013 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.214 | 0.052 | 0.000 | 0.214 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa99472000000000000002e | 203.855 | 0.042 | n/a | 0.000 | 0.000 | 1.453 | 201.640 | 0.135 | 0.000 | 0.490 | 0.000 | n/a | n/a | 0.096 | 0.042 | 0.000 | 0.096 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa994720000000000000008 | 203.837 | 0.037 | n/a | 0.000 | 0.000 | 1.474 | 202.036 | 0.015 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.095 | 0.037 | 0.000 | 0.095 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa994720000000000000044 | 203.664 | 0.026 | n/a | 0.000 | 0.000 | 1.291 | 202.048 | 0.036 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.069 | 0.026 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa994720000000000000051 | 203.625 | 0.048 | n/a | 0.000 | 0.000 | 1.098 | 202.200 | 0.012 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.135 | 0.048 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000019 | 203.490 | 0.056 | n/a | 0.000 | 0.000 | 2.467 | 200.755 | 0.013 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.142 | 0.056 | 0.000 | 0.142 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa994720000000000000033 | 203.457 | 0.025 | n/a | 0.000 | 0.000 | 1.548 | 201.602 | 0.019 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.060 | 0.025 | 0.000 | 0.060 | gw-r/thread-51/journal/page | none observed |

## P3 / L1 / read (83 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.375 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.868 | 201.146 | 0.015 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.089 | 0.041 | 0.000 | 0.089 |
| p99 | 214.394 | n/a | n/a | n/a | 0.125 | n/a | 0.000 | 0.000 | 8.747 | 213.179 | 18.846 | 0.000 | 0.406 | 0.000 | n/a | n/a | 0.198 | 0.125 | 0.001 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 176a2efd4fa99472000000000000006b | 214.394 | 0.048 | n/a | 0.000 | 0.000 | 0.862 | 213.179 | 0.030 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.160 | 0.048 | 0.000 | 0.160 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000088 | 210.078 | 0.033 | n/a | 0.000 | 0.000 | 1.039 | 208.768 | 0.014 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa9947200000000000000a5 | 209.056 | 0.032 | n/a | 0.000 | 0.000 | 4.690 | 204.113 | 0.020 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.078 | 0.032 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa994720000000000000082 | 208.368 | 0.063 | n/a | 0.000 | 0.000 | 2.874 | 205.121 | 0.012 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.189 | 0.063 | 0.000 | 0.189 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000059 | 208.286 | 0.040 | n/a | 0.000 | 0.000 | 2.676 | 205.214 | 0.030 | 0.000 | 0.236 | 0.000 | n/a | n/a | 0.090 | 0.040 | 0.000 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000098 | 206.389 | 0.030 | n/a | 0.000 | 0.000 | 0.768 | 205.391 | 0.013 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.070 | 0.030 | 0.000 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000071 | 206.192 | 0.029 | n/a | 0.000 | 0.000 | 4.839 | 201.146 | 0.017 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.070 | 0.029 | 0.000 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000074 | 205.578 | 0.060 | n/a | 0.000 | 0.000 | 1.208 | 204.014 | 0.015 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.148 | 0.060 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000078 | 205.530 | 0.043 | n/a | 0.000 | 0.000 | 0.933 | 204.338 | 0.015 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.106 | 0.043 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa99472000000000000006e | 205.269 | 0.074 | n/a | 0.000 | 0.000 | 1.040 | 203.752 | 0.029 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.198 | 0.074 | 0.000 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000056 | 205.165 | 0.036 | n/a | 0.000 | 0.000 | 3.898 | 200.973 | 0.015 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.097 | 0.036 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa9947200000000000000ae | 205.142 | 0.029 | n/a | 0.000 | 0.000 | 0.782 | 204.154 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa99472000000000000007f | 204.692 | 0.046 | n/a | 0.000 | 0.000 | 2.882 | 201.476 | 0.016 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.101 | 0.046 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000085 | 204.004 | 0.062 | n/a | 0.000 | 0.000 | 1.152 | 202.544 | 0.012 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.155 | 0.062 | 0.000 | 0.155 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa99472000000000000007c | 203.745 | 0.042 | n/a | 0.000 | 0.000 | 2.555 | 200.944 | 0.015 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.089 | 0.042 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa99472000000000000009c | 203.682 | 0.047 | n/a | 0.000 | 0.000 | 1.414 | 201.914 | 0.013 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.126 | 0.047 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000052 | 203.595 | 0.048 | n/a | 0.000 | 0.000 | 1.112 | 202.125 | 0.021 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.103 | 0.048 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000087 | 203.545 | 0.060 | n/a | 0.000 | 0.000 | 1.238 | 201.892 | 0.029 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.142 | 0.060 | 0.000 | 0.142 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000057 | 203.537 | 0.044 | n/a | 0.000 | 0.000 | 2.198 | 201.008 | 0.015 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.107 | 0.044 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa99472000000000000009b | 203.287 | 0.041 | n/a | 0.000 | 0.000 | 0.842 | 202.067 | 0.015 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.092 | 0.041 | 0.000 | 0.092 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / read (85 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.175 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.792 | 201.038 | 0.015 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.084 | 0.039 | 0.000 | 0.084 |
| p99 | 212.057 | n/a | n/a | n/a | 0.097 | n/a | 0.000 | 0.000 | 2.597 | 209.531 | 21.885 | 15.829 | 3.910 | 0.000 | n/a | n/a | 0.198 | 0.097 | 0.002 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 176a2efd4fa9947200000000000000c2 | 212.057 | 0.031 | n/a | 0.000 | 0.000 | 2.202 | 209.531 | 0.070 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa9947200000000000000f5 | 209.662 | 0.051 | n/a | 0.000 | 0.000 | 2.539 | 206.783 | 0.026 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.103 | 0.051 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa9947200000000000000c5 | 206.589 | 0.030 | n/a | 0.000 | 0.000 | 1.709 | 204.714 | 0.011 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa9947200000000000000cd | 206.043 | 0.051 | n/a | 0.000 | 0.000 | 1.039 | 200.907 | 0.018 | 0.000 | 3.910 | 0.000 | n/a | n/a | 0.118 | 0.051 | 0.000 | 0.118 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa9947200000000000000d5 | 205.343 | 0.033 | n/a | 0.000 | 0.000 | 0.521 | 204.567 | 0.018 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa9947200000000000000e0 | 205.302 | 0.032 | n/a | 0.000 | 0.000 | 0.940 | 204.065 | 0.021 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.093 | 0.032 | 0.000 | 0.093 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa9947200000000000000ca | 205.258 | 0.049 | n/a | 0.000 | 0.000 | 2.512 | 202.516 | 0.014 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.099 | 0.049 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa9947200000000000000c8 | 205.240 | 0.039 | n/a | 0.000 | 0.000 | 0.729 | 204.237 | 0.017 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.084 | 0.039 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa9947200000000000000db | 205.190 | 0.057 | n/a | 0.000 | 0.000 | 0.794 | 204.058 | 0.021 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.198 | 0.057 | 0.000 | 0.198 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa9947200000000000000c7 | 204.562 | 0.048 | n/a | 0.000 | 0.000 | 0.850 | 203.373 | 0.018 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.135 | 0.048 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa9947200000000000000c6 | 204.470 | 0.042 | n/a | 0.000 | 0.000 | 0.604 | 203.543 | 0.022 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.120 | 0.042 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa9947200000000000000b7 | 203.786 | 0.046 | n/a | 0.000 | 0.000 | 2.177 | 201.229 | 0.018 | 0.000 | 0.187 | 0.000 | n/a | n/a | 0.129 | 0.046 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa99472000000000000010d | 203.768 | 0.040 | n/a | 0.000 | 0.000 | 2.597 | 200.911 | 0.015 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.093 | 0.040 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa9947200000000000000be | 203.720 | 0.041 | n/a | 0.000 | 0.000 | 2.337 | 201.110 | 0.014 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.102 | 0.041 | 0.000 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa9947200000000000000b5 | 203.492 | 0.043 | n/a | 0.000 | 0.000 | 1.626 | 201.509 | 0.028 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.095 | 0.043 | 0.000 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa9947200000000000000fd | 203.448 | 0.035 | n/a | 0.000 | 0.000 | 1.555 | 201.634 | 0.013 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa9947200000000000000f3 | 203.249 | 0.025 | n/a | 0.000 | 0.000 | 0.792 | 202.284 | 0.011 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.055 | 0.025 | 0.000 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa9947200000000000000d6 | 203.221 | 0.067 | n/a | 0.000 | 0.000 | 0.939 | 201.931 | 0.021 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.179 | 0.067 | 0.000 | 0.179 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa9947200000000000000d3 | 203.044 | 0.032 | n/a | 0.000 | 0.000 | 0.557 | 201.776 | 0.460 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.074 | 0.032 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa9947200000000000000d1 | 202.973 | 0.037 | n/a | 0.000 | 0.000 | 0.946 | 201.753 | 0.014 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.094 | 0.037 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |

## P3 / L16 / read (85 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.002 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.819 | 200.968 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 |
| p99 | 210.372 | n/a | n/a | n/a | 0.109 | n/a | 0.000 | 0.000 | 5.157 | 208.065 | 4.993 | 12.859 | 3.996 | 0.000 | n/a | n/a | 1.087 | 0.109 | 0.002 | 1.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 176a2efd4fa994720000000000000123 | 210.372 | 0.033 | n/a | 0.000 | 0.000 | 2.130 | 208.065 | 0.007 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.065 | 0.033 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000143 | 206.269 | 0.027 | n/a | 0.000 | 0.000 | 0.705 | 205.338 | 0.012 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.067 | 0.027 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa99472000000000000012a | 206.240 | 0.047 | n/a | 0.000 | 0.000 | 5.157 | 200.844 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.124 | 0.047 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000114 | 205.980 | 0.031 | n/a | 0.000 | 0.000 | 4.320 | 201.349 | 0.053 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000153 | 205.950 | 0.066 | n/a | 0.000 | 0.000 | 1.097 | 204.578 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.153 | 0.066 | 0.000 | 0.153 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000157 | 205.773 | 0.063 | n/a | 0.000 | 0.000 | 1.064 | 204.406 | 0.006 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.148 | 0.063 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa99472000000000000013c | 205.660 | 0.044 | n/a | 0.000 | 0.000 | 4.583 | 200.866 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.094 | 0.044 | 0.000 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa99472000000000000015c | 205.554 | 0.032 | n/a | 0.000 | 0.000 | 0.911 | 204.396 | 0.006 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.087 | 0.032 | 0.000 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000119 | 205.521 | 0.049 | n/a | 0.000 | 0.000 | 4.508 | 200.769 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.125 | 0.049 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa994720000000000000127 | 205.455 | 0.039 | n/a | 0.000 | 0.000 | 0.824 | 191.561 | 0.005 | 12.859 | 0.058 | 0.000 | n/a | n/a | 0.109 | 0.039 | 0.000 | 0.109 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa994720000000000000136 | 205.289 | 0.035 | n/a | 0.000 | 0.000 | 3.762 | 201.302 | 0.011 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa99472000000000000013b | 205.177 | 0.054 | n/a | 0.000 | 0.000 | 0.922 | 204.031 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.130 | 0.054 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa99472000000000000014f | 204.815 | 0.030 | n/a | 0.000 | 0.000 | 0.419 | 204.259 | 0.026 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.063 | 0.030 | 0.000 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa99472000000000000015e | 204.542 | 0.059 | n/a | 0.000 | 0.000 | 2.868 | 201.378 | 0.010 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.125 | 0.059 | 0.000 | 0.125 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa994720000000000000128 | 203.333 | 0.040 | n/a | 0.000 | 0.000 | 0.674 | 199.625 | 2.897 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.065 | 0.040 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000145 | 203.310 | 0.060 | n/a | 0.000 | 0.000 | 2.248 | 200.791 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.145 | 0.060 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa99472000000000000011a | 203.307 | 0.035 | n/a | 0.000 | 0.000 | 0.959 | 202.051 | 0.014 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000130 | 203.293 | 0.040 | n/a | 0.000 | 0.000 | 0.921 | 202.061 | 0.016 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.094 | 0.040 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa99472000000000000011d | 203.164 | 0.040 | n/a | 0.000 | 0.000 | 1.660 | 201.290 | 0.006 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.103 | 0.040 | 0.000 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa99472000000000000013e | 203.137 | 0.035 | n/a | 0.000 | 0.000 | 1.138 | 201.765 | 0.017 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.450 | n/a | n/a | n/a | 0.035 | n/a | 0.000 | 0.000 | 0.632 | 200.727 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.070 | 0.035 | 0.000 | 0.070 |
| p99 | 206.873 | n/a | n/a | n/a | 0.079 | n/a | 0.000 | 0.000 | 4.455 | 203.383 | 3.450 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.200 | 0.079 | 0.001 | 0.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 176a2efd4fa99472000000000000017f | 207.314 | 0.053 | n/a | 0.000 | 0.000 | 0.750 | 206.352 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.090 | 0.053 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000195 | 206.873 | 0.037 | n/a | 0.000 | 0.000 | 4.136 | 202.427 | 0.082 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.083 | 0.037 | 0.000 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa9947200000000000001a1 | 205.933 | 0.036 | n/a | 0.000 | 0.000 | 4.540 | 201.187 | 0.010 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.074 | 0.036 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa99472000000000000016c | 205.473 | 0.032 | n/a | 0.000 | 0.000 | 4.455 | 200.838 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.074 | 0.032 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa9947200000000000001a2 | 204.459 | 0.052 | n/a | 0.000 | 0.000 | 0.917 | 203.383 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.059 | 0.052 | 0.000 | 0.059 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa9947200000000000001b4 | 204.224 | 0.034 | n/a | 0.000 | 0.000 | 0.699 | 203.261 | 0.016 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.086 | 0.034 | 0.000 | 0.086 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa9947200000000000001ad | 204.155 | 0.053 | n/a | 0.000 | 0.000 | 0.731 | 203.197 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.127 | 0.053 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa99472000000000000019f | 204.008 | 0.035 | n/a | 0.000 | 0.000 | 3.088 | 200.758 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.065 | 0.035 | 0.000 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa99472000000000000019b | 203.445 | 0.032 | n/a | 0.000 | 0.000 | 1.556 | 201.670 | 0.009 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.075 | 0.032 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa9947200000000000001cf | 203.210 | 0.058 | n/a | 0.000 | 0.000 | 0.736 | 202.184 | 0.011 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.142 | 0.058 | 0.000 | 0.142 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa9947200000000000001c9 | 202.833 | 0.121 | n/a | 0.000 | 0.000 | 1.377 | 201.021 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.228 | 0.121 | 0.001 | 0.228 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa9947200000000000001ba | 202.747 | 0.079 | n/a | 0.000 | 0.000 | 1.343 | 201.039 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.200 | 0.079 | 0.000 | 0.200 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa9947200000000000001b5 | 202.678 | 0.051 | n/a | 0.000 | 0.000 | 0.880 | 201.530 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.151 | 0.051 | 0.000 | 0.151 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa9947200000000000001be | 202.384 | 0.071 | n/a | 0.000 | 0.000 | 0.968 | 201.078 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.178 | 0.071 | 0.000 | 0.178 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa99472000000000000018e | 202.352 | 0.031 | n/a | 0.000 | 0.000 | 1.174 | 200.995 | 0.007 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa9947200000000000001bc | 202.340 | 0.030 | n/a | 0.000 | 0.000 | 1.009 | 201.148 | 0.006 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.068 | 0.030 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa9947200000000000001cb | 202.297 | 0.030 | n/a | 0.000 | 0.000 | 1.385 | 200.755 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.058 | 0.030 | 0.000 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa9947200000000000001b3 | 202.277 | 0.033 | n/a | 0.000 | 0.000 | 0.960 | 201.127 | 0.007 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa99472000000000000018f | 202.271 | 0.041 | n/a | 0.000 | 0.000 | 0.775 | 201.246 | 0.010 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.101 | 0.041 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa9947200000000000001a3 | 202.243 | 0.052 | n/a | 0.000 | 0.000 | 1.248 | 200.742 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.134 | 0.052 | 0.000 | 0.134 | gw-r/thread-52/journal/page | none observed |

## P3 / L256 / read (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.739 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.663 | 200.801 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.077 | 0.037 | 0.000 | 0.077 |
| p99 | 207.503 | n/a | n/a | n/a | 0.081 | n/a | 0.000 | 0.000 | 4.647 | 206.766 | 8.486 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.188 | 0.081 | 0.001 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 176a2efd4fa9947200000000000001e3 | 207.503 | 0.033 | n/a | 0.000 | 0.000 | 0.495 | 206.766 | 0.015 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.106 | 0.033 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa9947200000000000001f4 | 206.124 | 0.068 | n/a | 0.000 | 0.000 | 4.647 | 201.153 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.168 | 0.068 | 0.000 | 0.168 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa9947200000000000001ec | 204.534 | 0.071 | n/a | 0.000 | 0.000 | 1.863 | 202.227 | 0.014 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.158 | 0.071 | 0.000 | 0.158 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa994720000000000000230 | 204.340 | 0.044 | n/a | 0.000 | 0.000 | 0.617 | 203.565 | 0.007 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.082 | 0.044 | 0.000 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa99472000000000000020e | 204.325 | 0.029 | n/a | 0.000 | 0.000 | 3.394 | 200.762 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa9947200000000000001e7 | 203.268 | 0.042 | n/a | 0.000 | 0.000 | 2.367 | 200.701 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.096 | 0.042 | 0.000 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa9947200000000000001dd | 203.114 | 0.081 | n/a | 0.000 | 0.000 | 1.164 | 201.675 | 0.021 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.109 | 0.081 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa9947200000000000001e9 | 203.050 | 0.046 | n/a | 0.000 | 0.000 | 1.002 | 201.689 | 0.034 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.094 | 0.046 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa9947200000000000001fd | 203.013 | 0.029 | n/a | 0.000 | 0.000 | 1.124 | 201.596 | 0.017 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.070 | 0.029 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000214 | 202.826 | 0.028 | n/a | 0.000 | 0.000 | 1.608 | 201.023 | 0.022 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.058 | 0.028 | 0.000 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa9947200000000000001db | 202.770 | 0.038 | n/a | 0.000 | 0.000 | 1.142 | 201.397 | 0.007 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.098 | 0.038 | 0.000 | 0.098 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa9947200000000000001d8 | 202.753 | 0.031 | n/a | 0.000 | 0.000 | 1.958 | 200.625 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa9947200000000000001f5 | 202.742 | 0.070 | n/a | 0.000 | 0.000 | 1.071 | 201.285 | 0.013 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.188 | 0.070 | 0.000 | 0.188 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000202 | 202.739 | 0.053 | n/a | 0.000 | 0.000 | 0.934 | 201.497 | 0.028 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.133 | 0.053 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa99472000000000000022e | 202.560 | 0.023 | n/a | 0.000 | 0.000 | 0.632 | 201.671 | 0.015 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.054 | 0.023 | 0.000 | 0.054 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa994720000000000000222 | 202.481 | 0.048 | n/a | 0.000 | 0.000 | 0.612 | 201.578 | 0.017 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.090 | 0.048 | 0.000 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa9947200000000000001eb | 202.471 | 0.073 | n/a | 0.000 | 0.000 | 1.069 | 201.048 | 0.010 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.181 | 0.073 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000234 | 202.469 | 0.054 | n/a | 0.000 | 0.000 | 1.071 | 201.128 | 0.007 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.115 | 0.054 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000223 | 202.425 | 0.035 | n/a | 0.000 | 0.000 | 0.703 | 201.466 | 0.014 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.080 | 0.035 | 0.000 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa994720000000000000203 | 202.327 | 0.035 | n/a | 0.000 | 0.000 | 0.688 | 201.347 | 0.011 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.072 | 0.035 | 0.000 | 0.072 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (67 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.679 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 0.511 | 66.969 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.064 | 0.048 | 0.001 | 0.064 |
| p99 | 204.126 | n/a | n/a | n/a | 0.113 | n/a | 0.000 | 0.000 | 3.897 | 203.331 | 13.555 | 60.698 | 0.176 | 0.000 | n/a | n/a | 0.135 | 0.113 | 0.002 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 176a2efd4fa994720000000000000249 | 204.126 | 0.049 | n/a | 0.000 | 0.000 | 0.588 | 203.331 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.087 | 0.049 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa994720000000000000240 | 202.724 | 0.042 | n/a | 0.000 | 0.000 | 0.603 | 201.882 | 0.010 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.094 | 0.042 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa99472000000000000024f | 202.247 | 0.037 | n/a | 0.000 | 0.000 | 0.550 | 201.382 | 0.016 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.085 | 0.037 | 0.000 | 0.085 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000241 | 202.171 | 0.029 | n/a | 0.000 | 0.000 | 0.792 | 201.200 | 0.006 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.064 | 0.029 | 0.000 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa994720000000000000250 | 202.014 | 0.054 | n/a | 0.000 | 0.000 | 0.997 | 200.778 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.125 | 0.054 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa99472000000000000024a | 201.766 | 0.030 | n/a | 0.000 | 0.000 | 0.471 | 201.133 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa99472000000000000023c | 201.721 | 0.068 | n/a | 0.000 | 0.000 | 0.794 | 200.716 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.096 | 0.068 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 176a2efd4fa99472000000000000023d | 201.671 | 0.049 | n/a | 0.000 | 0.000 | 0.713 | 200.721 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.118 | 0.049 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000245 | 201.635 | 0.031 | n/a | 0.000 | 0.000 | 0.616 | 200.861 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.062 | 0.031 | 0.000 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa99472000000000000024d | 201.566 | 0.033 | n/a | 0.000 | 0.000 | 0.567 | 200.814 | 0.011 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa994720000000000000247 | 201.490 | 0.025 | n/a | 0.000 | 0.000 | 0.497 | 200.843 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.051 | 0.025 | 0.000 | 0.051 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000251 | 201.490 | 0.032 | n/a | 0.000 | 0.000 | 0.673 | 200.649 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa99472000000000000024b | 201.427 | 0.026 | n/a | 0.000 | 0.000 | 0.535 | 200.745 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.059 | 0.026 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa99472000000000000024e | 201.400 | 0.032 | n/a | 0.000 | 0.000 | 0.607 | 200.618 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.091 | 0.032 | 0.000 | 0.091 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa994720000000000000246 | 201.357 | 0.031 | n/a | 0.000 | 0.000 | 0.484 | 200.703 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.079 | 0.031 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa99472000000000000023f | 201.331 | 0.044 | n/a | 0.000 | 0.000 | 0.641 | 200.493 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.098 | 0.044 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa99472000000000000023b | 201.324 | 0.033 | n/a | 0.000 | 0.000 | 0.361 | 200.788 | 0.009 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.079 | 0.033 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa99472000000000000024c | 201.172 | 0.028 | n/a | 0.000 | 0.000 | 0.438 | 200.598 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.062 | 0.028 | 0.000 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa99472000000000000023a | 201.043 | 0.027 | n/a | 0.000 | 0.000 | 0.478 | 200.455 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.057 | 0.027 | 0.000 | 0.057 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000243 | 200.944 | 0.030 | n/a | 0.000 | 0.000 | 0.349 | 200.463 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / read (221 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 84.470 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.482 | 81.470 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.059 | 0.037 | 0.000 | 0.059 |
| p99 | 203.707 | n/a | n/a | n/a | 0.101 | n/a | 0.000 | 0.000 | 5.977 | 201.313 | 0.012 | 7.576 | 0.092 | 0.000 | n/a | n/a | 0.129 | 0.101 | 0.006 | 0.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 176a2efd4fa994720000000000000e32 | 205.247 | 0.019 | n/a | 0.000 | 0.000 | 3.709 | 201.343 | 0.009 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.038 | 0.019 | 0.000 | 0.038 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000e65 | 204.902 | 0.023 | n/a | 0.000 | 0.000 | 4.209 | 200.574 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.059 | 0.023 | 0.000 | 0.059 | gw-r/thread-65/journal/page | none observed |
| 176a2efd4fa994720000000000000e8c | 203.707 | 0.047 | n/a | 0.000 | 0.000 | 2.820 | 200.658 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.127 | 0.047 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 176a2efd4fa994720000000000000e81 | 202.318 | 0.040 | n/a | 0.000 | 0.000 | 0.780 | 201.313 | 0.011 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-65/journal/page | none observed |
| 176a2efd4fa994720000000000000e33 | 202.211 | 0.051 | n/a | 0.000 | 0.000 | 0.690 | 201.183 | 0.012 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.193 | 0.051 | 0.000 | 0.193 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa994720000000000000e42 | 202.210 | 0.043 | n/a | 0.000 | 0.000 | 0.851 | 201.145 | 0.010 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.084 | 0.043 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000e66 | 202.138 | 0.036 | n/a | 0.000 | 0.000 | 1.458 | 200.526 | 0.003 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.074 | 0.036 | 0.000 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa994720000000000000e4d | 202.069 | 0.017 | n/a | 0.000 | 0.000 | 0.584 | 201.314 | 0.009 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.039 | 0.017 | 0.000 | 0.039 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000e84 | 201.926 | 0.039 | n/a | 0.000 | 0.000 | 1.299 | 200.456 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.095 | 0.039 | 0.000 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa994720000000000000e38 | 201.890 | 0.034 | n/a | 0.000 | 0.000 | 1.125 | 200.637 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.063 | 0.034 | 0.000 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000e85 | 201.867 | 0.059 | n/a | 0.000 | 0.000 | 1.020 | 200.617 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.119 | 0.059 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000e89 | 201.786 | 0.046 | n/a | 0.000 | 0.000 | 0.827 | 200.767 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.096 | 0.046 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 176a2efd4fa994720000000000000e3d | 201.707 | 0.031 | n/a | 0.000 | 0.000 | 0.649 | 200.899 | 0.011 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 176a2efd4fa994720000000000000e93 | 201.666 | 0.025 | n/a | 0.000 | 0.000 | 0.613 | 200.909 | 0.007 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.053 | 0.025 | 0.000 | 0.053 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa994720000000000000e6b | 201.659 | 0.040 | n/a | 0.000 | 0.000 | 0.571 | 200.880 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.100 | 0.040 | 0.000 | 0.100 | gw-r/thread-65/journal/page | none observed |
| 176a2efd4fa994720000000000000e82 | 201.652 | 0.039 | n/a | 0.000 | 0.000 | 0.768 | 200.709 | 0.003 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.094 | 0.039 | 0.000 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 176a2efd4fa994720000000000000e43 | 201.648 | 0.026 | n/a | 0.000 | 0.000 | 0.676 | 200.832 | 0.004 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.060 | 0.026 | 0.000 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000e76 | 201.615 | 0.047 | n/a | 0.000 | 0.000 | 0.701 | 200.706 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.097 | 0.047 | 0.000 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 176a2efd4fa994720000000000000e46 | 201.595 | 0.035 | n/a | 0.000 | 0.000 | 0.699 | 200.734 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 176a2efd4fa994720000000000000e45 | 201.581 | 0.052 | n/a | 0.000 | 0.000 | 0.803 | 200.574 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.111 | 0.052 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.327 ms; post-ACK p50/p99: 0.376/1.829 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.369 | 10.860 | 10.627 | reported |
| All-primary p99 ms | 45.374 | 44.167 | 43.853 | <=50 |
| L256 5-10 p50Ms | 22.911 | 22.271 | 22.271 | <=10 |
| L256 5-10 p99Ms | 95.117 | 94.467 | 94.466 | <=50 |
| L256 11-25 p50Ms | 22.527 | 22.143 | 22.143 | <=10 |
| L256 11-25 p99Ms | 32.257 | 31.313 | 31.294 | <=50 |
| L256 26-50 p50Ms | 21.375 | 20.479 | 20.479 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 23.025 | 21.697 | 21.697 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.855 | 9.471 | 9.343 | <=10 |
| Burst 11-25 p50 ms | 12.223 | 11.583 | 11.327 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 95.117 | 94.467 | 94.466 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 99.527 | 99.263 | 97.779 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 8 | 28.334/55.853 | 26.958 | 13.553 | 32.063 | 0.148/0.026 |
| 5-10 | >=1000 | 31 | 18.293/92.880 | 17.962 | 12.187 | 29.636 | 0.080/0.020 |
| 5-10 | 250-1000 | 35 | 19.483/95.051 | 19.148 | 12.723 | 31.410 | 0.080/0.027 |
| 11-25 | 250-1000 | 23 | 17.673/35.276 | 17.061 | 10.916 | 26.862 | 0.085/0.023 |
| 5-10 | 100-250 | 14 | 15.114/37.706 | 14.795 | 9.880 | 20.500 | 0.067/0.020 |
| 11-25 | >=1000 | 13 | 31.333/153.036 | 30.356 | 20.539 | 51.182 | 0.104/0.022 |
| 26-50 | 250-1000 | 8 | 23.519/42.375 | 22.469 | 15.037 | 35.839 | 0.100/0.022 |
| 11-25 | 100-250 | 7 | 13.310/107.893 | 12.788 | 8.206 | 20.859 | 0.080/0.022 |
| 11-25 | overlap | 375 | 12.646/44.629 | 12.047 | 7.809 | 18.090 | 0.042/0.016 |
| 5-10 | 0-50 | 1123 | 8.453/24.776 | 8.094 | 4.780 | 11.660 | 0.042/0.016 |
| 5-10 | overlap | 805 | 11.083/39.960 | 10.748 | 7.123 | 15.900 | 0.035/0.016 |
| 11-25 | 0-50 | 527 | 10.604/31.163 | 10.053 | 5.625 | 14.101 | 0.050/0.017 |
| 26-50 | overlap | 134 | 15.632/44.234 | 14.948 | 8.558 | 21.281 | 0.054/0.018 |
| 11-25 | 50-100 | 41 | 12.068/32.135 | 11.384 | 7.384 | 16.941 | 0.064/0.017 |
| 5-10 | 50-100 | 57 | 8.811/24.685 | 8.425 | 5.198 | 12.287 | 0.049/0.017 |
| 26-50 | 0-50 | 207 | 14.345/34.357 | 13.421 | 7.449 | 18.688 | 0.059/0.018 |
| 26-50 | 50-100 | 12 | 16.391/28.401 | 15.716 | 9.308 | 23.725 | 0.075/0.020 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 880 | 16 | 1247.346 |
| burst | 2540 | 12 | 893.743 |

## Writer heap, GC and scheduler stalls

Source d62b4e952e5d2b0c5570225ff6e612eabee2f38b; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 100.998 / 284.497 |
| GC events / total duration / maximum ms | 645 / 849.901 / 15.945 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":617,"4":14,"8":14} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 45.374 / 28 / 2141.089 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

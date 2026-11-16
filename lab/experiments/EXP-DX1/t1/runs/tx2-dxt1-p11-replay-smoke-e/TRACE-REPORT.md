# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (103.636 ms, trace `a1c2a16f4649cbe8000000000000006d`); `node-14/thread-0/driver.queue.subject` (85.967 ms, trace `a1c2a16f4649cbe800000000000001c4`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (84.057 ms, trace `a1c2a16f4649cbe800000000000000b1`); `node-14/thread-0/driver.queue.subject` (88.767 ms, trace `a1c2a16f4649cbe800000000000006ec`); `node-14/thread-0/driver.queue.subject` (85.885 ms, trace `a1c2a16f4649cbe800000000000001c6`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p11-replay-smoke-e`; source `d62b4e952e5d2b0c5570225ff6e612eabee2f38b`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3512/3512 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3512/3512. Raw trace bytes: 20697613.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 229 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13370.529 | 301.450 | 7.569 | 280 |
| L1 | 0 | 16428.377 | 315.170 | 10.739 | 422 |
| L4 | 0 | 18598.123 | 336.453 | 17.680 | 382 |
| L16 | 0 | 19059.510 | 307.054 | 8.075 | 442 |
| L64 | 0 | 18844.328 | 399.381 | 9.316 | 604 |
| L256 | 0 | 17017.361 | 286.199 | 17.866 | 462 |
| L1024 | 0 | 18985.609 | 3980.896 | 33.299 | 16528 |
| tail | 0 | 64684.419 | 11914.364 | 101.554 | 52110 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| a1c2a16f4649cbe8000000000000006d | driver.queue.scheduler-dispatch | 0.108 | none | 0 / 32 |
| a1c2a16f4649cbe8000000000000006d | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace a1c2a16f4649cbe8000000000000006d waited: []

| a1c2a16f4649cbe800000000000001c4 | driver.queue.subject | 85.967 | a1c2a16f4649cbe800000000000001c3 | 1 / 32 |
| a1c2a16f4649cbe800000000000001c4 | driver.queue.scheduler-dispatch | 0.081 | none | 2 / 32 |
| a1c2a16f4649cbe800000000000001c4 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace a1c2a16f4649cbe800000000000001c4 waited: [{"at":1794825095704.7834,"inFlight":2,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000001c3","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000001c5","step":"client.http"}]},{"at":1794825095725.152,"inFlight":2,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000001c3","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000001c5","step":"client.http"}]},{"at":1794825095745.623,"inFlight":3,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000001c3","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000001c5","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000001c7","step":"client.http"}]}]

| a1c2a16f4649cbe800000000000000b1 | driver.queue.scheduler-dispatch | 0.061 | none | 0 / 32 |
| a1c2a16f4649cbe800000000000000b1 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace a1c2a16f4649cbe800000000000000b1 waited: []

| a1c2a16f4649cbe800000000000006ec | driver.queue.subject | 88.767 | a1c2a16f4649cbe800000000000006ea | 4 / 32 |
| a1c2a16f4649cbe800000000000006ec | driver.queue.scheduler-dispatch | 0.091 | none | 3 / 32 |
| a1c2a16f4649cbe800000000000006ec | driver.queue.scheduler-late | 0.001 | none | 4 / 32 |

Observed active steps while trace a1c2a16f4649cbe800000000000006ec waited: [{"at":1794825107379.349,"inFlight":4,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000006e6","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006e7","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006e8","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006eb","step":"client.http"}]},{"at":1794825107402.075,"inFlight":4,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000006e8","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006eb","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006e9","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006ee","step":"client.http"}]},{"at":1794825107421.863,"inFlight":5,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000006ee","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006f2","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006f0","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006ed","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006ea","step":"client.http"}]},{"at":1794825107443.0933,"inFlight":4,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000006ed","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006ea","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006f8","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000006f7","step":"client.http"}]}]

| a1c2a16f4649cbe800000000000001c6 | driver.queue.subject | 85.885 | a1c2a16f4649cbe800000000000001c4 | 2 / 32 |
| a1c2a16f4649cbe800000000000001c6 | driver.queue.scheduler-dispatch | 0.149 | none | 0 / 32 |
| a1c2a16f4649cbe800000000000001c6 | driver.queue.scheduler-late | 0.003 | none | 2 / 32 |

Observed active steps while trace a1c2a16f4649cbe800000000000001c6 waited: [{"at":1794825095704.7834,"inFlight":2,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000001c3","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000001c5","step":"client.http"}]},{"at":1794825095725.152,"inFlight":2,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000001c3","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000001c5","step":"client.http"}]},{"at":1794825095745.623,"inFlight":3,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000001c3","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000001c5","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000001c7","step":"client.http"}]},{"at":1794825095765.4204,"inFlight":2,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000001c7","step":"client.http"},{"traceId":"a1c2a16f4649cbe800000000000001c4","step":"client.http"}]},{"at":1794825095785.4685,"inFlight":1,"capacity":32,"active":[{"traceId":"a1c2a16f4649cbe800000000000001c4","step":"client.http"}]}]

## P2 / warmup / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.494 | 0.991 | 0.000 | 0.858 | 2.802 | n/a | 0.000 | 0.082 | 1.112 | 2.186 | 0.028 | 0.000 | 0.479 | 9.838 | 0.977 | n/a | 0.030 | 3.384 | 0.155 | 0.030 |
| p99 | 51.685 | 3.818 | 0.030 | 2.331 | 9.325 | n/a | 0.568 | 1.186 | 4.050 | 15.277 | 0.097 | 0.000 | 4.417 | 18.805 | 8.656 | n/a | 0.288 | 9.849 | 0.216 | 0.288 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000000036 | 51.685 | 9.325 | n/a | 0.000 | 0.524 | 1.913 | 15.277 | 0.034 | 0.000 | 0.140 | 15.527 | 8.656 | n/a | 0.288 | 9.849 | 0.191 | 0.288 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000053 | 27.491 | 4.173 | n/a | 0.000 | 0.090 | 0.993 | 2.199 | 0.023 | 0.000 | 0.133 | 18.805 | 1.046 | n/a | 0.028 | 4.264 | 0.155 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000043 | 27.064 | 3.333 | n/a | 0.000 | 0.082 | 2.579 | 2.223 | 0.025 | 0.000 | 0.145 | 14.209 | 4.438 | n/a | 0.030 | 3.415 | 0.126 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| a1c2a16f4649cbe80000000000000041 | 25.628 | 1.820 | n/a | 0.000 | 0.070 | 1.452 | 1.691 | 0.039 | 0.000 | 0.479 | 12.092 | 7.957 | n/a | 0.028 | 1.890 | 0.074 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| a1c2a16f4649cbe80000000000000056 | 24.121 | 2.643 | n/a | 0.000 | 1.186 | 1.055 | 9.195 | 0.034 | 0.000 | 0.139 | 9.332 | 0.504 | n/a | 0.031 | 3.829 | 0.159 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| a1c2a16f4649cbe8000000000000003d | 24.021 | 2.355 | n/a | 0.000 | 0.092 | 1.112 | 3.055 | 0.050 | 0.000 | 4.417 | 11.077 | 1.837 | n/a | 0.027 | 2.447 | 0.102 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000003a | 23.291 | 3.240 | n/a | 0.000 | 0.144 | 1.041 | 1.698 | 0.021 | 0.000 | 1.283 | 13.938 | 1.873 | n/a | 0.053 | 3.384 | 0.145 | 0.053 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| a1c2a16f4649cbe80000000000000047 | 22.494 | 3.925 | n/a | 0.000 | 0.081 | 4.050 | 2.041 | 0.024 | 0.000 | 2.256 | 9.114 | 0.977 | n/a | 0.026 | 4.006 | 0.178 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000049 | 19.889 | 2.594 | n/a | 0.000 | 0.080 | 0.989 | 2.186 | 0.028 | 0.000 | 2.609 | 10.601 | 0.655 | n/a | 0.147 | 2.675 | 0.134 | 0.147 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000005e | 18.857 | 2.802 | n/a | 0.568 | 0.041 | 0.859 | 1.210 | 0.020 | 0.000 | 3.001 | 9.838 | 0.499 | n/a | 0.021 | 3.410 | 0.181 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000059 | 18.441 | 3.054 | n/a | 0.467 | 0.453 | 1.515 | 5.551 | 0.029 | 0.000 | 0.155 | 6.604 | 0.582 | n/a | 0.030 | 3.975 | 0.216 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000005c | 17.956 | 3.095 | n/a | 0.232 | 0.051 | 1.434 | 2.001 | 0.097 | 0.000 | 2.759 | 4.425 | 3.825 | n/a | 0.037 | 3.378 | 0.188 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| a1c2a16f4649cbe80000000000000050 | 16.382 | 2.336 | n/a | 0.000 | 0.170 | 1.416 | 2.627 | 0.053 | 0.000 | 1.129 | 8.139 | 0.485 | n/a | 0.026 | 2.507 | 0.153 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000004e | 14.943 | 2.610 | n/a | 0.000 | 0.068 | 0.811 | 1.405 | 0.022 | 0.000 | 0.469 | 9.000 | 0.519 | n/a | 0.038 | 2.678 | 0.179 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (86 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.339 | n/a | n/a | n/a | 39.638 | 1.801 | 2.718 | 0.000 | 5.396 | 2.843 | 0.004 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.006 | 53.580 | 0.755 | 0.006 |
| p99 | 166.318 | n/a | n/a | n/a | 117.365 | 118.174 | 13.235 | 0.000 | 88.479 | 42.990 | 6.791 | 17.842 | 0.039 | 0.000 | n/a | n/a | 0.030 | 137.548 | 1.000 | 0.030 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000001c11 | 166.318 | 52.884 | 29.108 | 4.612 | 0.000 | 69.245 | 9.281 | 1.172 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.005 | 86.604 | 0.521 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.261ms; driver.reader-basis.broadcast 0.229ms; driver.publication.readback 0.127ms; driver.publication.readback 0.073ms; driver.publication.readback 0.066ms |
| a1c2a16f4649cbe800000000000016ca | 150.883 | 68.874 | 19.382 | 5.427 | 0.000 | 53.165 | 4.021 | 0.003 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.006 | 93.684 | 0.621 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.198ms; driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.191ms; driver.publication.readback 0.124ms; driver.publication.readback 0.123ms |
| a1c2a16f4649cbe800000000000008ba | 148.393 | 22.167 | 71.228 | 0.000 | 0.000 | 48.535 | 6.431 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.018 | 93.396 | 0.629 | 0.018 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.143ms; driver.publication.readback 0.134ms; driver.publication.readback 0.070ms; driver.publication.readback 0.064ms |
| a1c2a16f4649cbe80000000000001c0e | 147.705 | 113.739 | 7.061 | 7.366 | 0.000 | 3.973 | 15.535 | 0.009 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.005 | 128.166 | 0.868 | 0.005 | node-14/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.261ms; driver.reader-basis.broadcast 0.229ms; driver.publication.readback 0.127ms; driver.publication.readback 0.073ms; driver.publication.readback 0.066ms |
| a1c2a16f4649cbe800000000000008b0 | 143.646 | 105.453 | 0.388 | 12.406 | 0.000 | 13.481 | 11.899 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.009 | 118.247 | 0.823 | 0.009 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.365ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.143ms; driver.publication.readback 0.064ms; driver.publication.readback 0.063ms |
| a1c2a16f4649cbe80000000000001ab7 | 140.300 | 46.098 | 22.288 | 3.126 | 0.000 | 61.864 | 4.813 | 2.088 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.009 | 71.512 | 0.510 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.488ms; driver.reader-basis.broadcast 0.514ms; driver.publication.readback 0.105ms; driver.publication.readback 0.064ms; driver.publication.readback 0.059ms |
| a1c2a16f4649cbe800000000000008b4 | 139.054 | 19.374 | 118.174 | 0.000 | 0.000 | 0.613 | 0.867 | 0.004 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.008 | 137.548 | 0.989 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.365ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.143ms; driver.publication.readback 0.064ms; driver.publication.readback 0.063ms |
| a1c2a16f4649cbe800000000000008b1 | 138.931 | 117.365 | 0.340 | 13.235 | 0.000 | 2.571 | 2.174 | 3.230 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.009 | 130.940 | 0.942 | 0.009 | node-14/thread-3/client.reach | driver.reader-basis.broadcast 0.365ms; driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.143ms; driver.publication.readback 0.064ms; driver.publication.readback 0.063ms |
| a1c2a16f4649cbe80000000000000fb9 | 138.750 | 40.612 | 0.311 | 3.220 | 0.000 | 86.836 | 1.477 | 6.284 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.007 | 44.143 | 0.318 | 0.007 | node-14/thread-3/socket.body-read | driver.reader-basis.broadcast 0.156ms; driver.publication.readback 0.115ms; driver.publication.readback 0.062ms; driver.publication.readback 0.061ms; driver.publication.readback 0.058ms |
| a1c2a16f4649cbe80000000000000baf | 134.184 | 33.284 | 0.245 | 1.999 | 0.000 | 88.479 | 5.625 | 4.530 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.013 | 35.529 | 0.265 | 0.013 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.103ms; driver.reader-basis.broadcast 0.234ms; driver.publication.readback 0.195ms; driver.publication.readback 0.110ms; driver.reader-basis.broadcast 0.100ms |
| a1c2a16f4649cbe80000000000001b29 | 125.413 | 55.801 | 0.236 | 4.617 | 0.000 | 44.318 | 20.411 | 0.002 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.009 | 60.655 | 0.484 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.556ms; driver.publication.readback 0.109ms; driver.publication.readback 0.095ms; driver.publication.readback 0.056ms; driver.publication.readback 0.053ms |
| a1c2a16f4649cbe800000000000008b9 | 123.690 | 39.173 | 72.198 | 5.301 | 0.000 | 5.782 | 1.212 | 0.002 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.018 | 116.672 | 0.943 | 0.018 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.228ms; driver.publication.readback 0.143ms; driver.publication.readback 0.134ms; driver.publication.readback 0.070ms; driver.publication.readback 0.064ms |
| a1c2a16f4649cbe80000000000001ab5 | 119.975 | 94.843 | 1.166 | 7.766 | 0.000 | 3.221 | 12.957 | 0.006 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.005 | 103.775 | 0.865 | 0.005 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 1.488ms; driver.reader-basis.broadcast 0.514ms; driver.publication.readback 0.105ms; driver.publication.readback 0.064ms; driver.publication.readback 0.059ms |
| a1c2a16f4649cbe80000000000001015 | 119.667 | 41.718 | 0.413 | 4.926 | 0.000 | 58.802 | 13.795 | 0.003 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.006 | 47.056 | 0.393 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.139ms; driver.publication.readback 0.130ms; driver.publication.readback 0.068ms; driver.publication.readback 0.067ms; driver.publication.readback 0.056ms |
| a1c2a16f4649cbe80000000000001743 | 118.880 | 55.214 | 1.801 | 4.563 | 0.000 | 42.535 | 9.192 | 5.568 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.005 | 61.577 | 0.518 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.221ms; driver.publication.readback 0.122ms; driver.publication.readback 0.043ms; driver.publication.readback 0.042ms; driver.publication.readback 0.041ms |
| a1c2a16f4649cbe800000000000019ce | 117.586 | 68.098 | 5.452 | 7.771 | 0.000 | 7.921 | 10.492 | 0.003 | 17.842 | 0.005 | 0.000 | n/a | n/a | 0.003 | 81.321 | 0.692 | 0.003 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.add-commit 1.417ms; driver.reader-basis.broadcast 0.923ms; driver.publication.readback 0.146ms; driver.publication.readback 0.108ms; driver.publication.readback 0.104ms |
| a1c2a16f4649cbe80000000000001c20 | 117.254 | 84.286 | 22.734 | 5.078 | 0.000 | 0.702 | 4.436 | 0.004 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.005 | 112.097 | 0.956 | 0.005 | node-14/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.256ms; driver.reader-basis.broadcast 0.229ms; driver.publication.readback 0.096ms; driver.publication.readback 0.065ms; driver.publication.readback 0.053ms |
| a1c2a16f4649cbe800000000000018a6 | 116.766 | 62.906 | 1.628 | 4.879 | 0.000 | 31.909 | 15.426 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.006 | 69.413 | 0.594 | 0.006 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.483ms; driver.publication.readback 0.105ms; driver.publication.readback 0.053ms; driver.publication.readback 0.042ms; driver.publication.readback 0.041ms |
| a1c2a16f4649cbe80000000000000fb7 | 114.672 | 56.933 | 1.091 | 4.662 | 0.000 | 40.747 | 7.743 | 3.490 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.003 | 62.685 | 0.547 | 0.003 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.156ms; driver.publication.readback 0.115ms; driver.publication.readback 0.062ms; driver.publication.readback 0.061ms; driver.publication.readback 0.050ms |
| a1c2a16f4649cbe80000000000001745 | 114.594 | 24.349 | 37.842 | 2.214 | 0.000 | 49.084 | 1.080 | 0.007 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.007 | 64.405 | 0.562 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.493ms; driver.reader-basis.broadcast 0.221ms; driver.publication.readback 0.122ms; driver.publication.readback 0.042ms; driver.publication.readback 0.041ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.857 | 0.440 | 0.000 | 0.671 | 2.643 | n/a | 0.000 | 0.092 | 1.112 | 2.001 | 0.034 | 0.000 | 1.129 | 9.332 | 0.582 | n/a | 0.030 | 3.378 | 0.159 | 0.030 |
| p99 | 25.628 | 2.401 | 0.000 | 1.643 | 3.240 | n/a | 0.568 | 1.186 | 1.515 | 9.195 | 0.097 | 0.000 | 4.417 | 13.938 | 7.957 | n/a | 0.053 | 3.975 | 0.216 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000000041 | 25.628 | 1.820 | n/a | 0.000 | 0.070 | 1.452 | 1.691 | 0.039 | 0.000 | 0.479 | 12.092 | 7.957 | n/a | 0.028 | 1.890 | 0.074 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| a1c2a16f4649cbe80000000000000056 | 24.121 | 2.643 | n/a | 0.000 | 1.186 | 1.055 | 9.195 | 0.034 | 0.000 | 0.139 | 9.332 | 0.504 | n/a | 0.031 | 3.829 | 0.159 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| a1c2a16f4649cbe8000000000000003d | 24.021 | 2.355 | n/a | 0.000 | 0.092 | 1.112 | 3.055 | 0.050 | 0.000 | 4.417 | 11.077 | 1.837 | n/a | 0.027 | 2.447 | 0.102 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000003a | 23.291 | 3.240 | n/a | 0.000 | 0.144 | 1.041 | 1.698 | 0.021 | 0.000 | 1.283 | 13.938 | 1.873 | n/a | 0.053 | 3.384 | 0.145 | 0.053 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.011ms |
| a1c2a16f4649cbe8000000000000005e | 18.857 | 2.802 | n/a | 0.568 | 0.041 | 0.859 | 1.210 | 0.020 | 0.000 | 3.001 | 9.838 | 0.499 | n/a | 0.021 | 3.410 | 0.181 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000059 | 18.441 | 3.054 | n/a | 0.467 | 0.453 | 1.515 | 5.551 | 0.029 | 0.000 | 0.155 | 6.604 | 0.582 | n/a | 0.030 | 3.975 | 0.216 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000005c | 17.956 | 3.095 | n/a | 0.232 | 0.051 | 1.434 | 2.001 | 0.097 | 0.000 | 2.759 | 4.425 | 3.825 | n/a | 0.037 | 3.378 | 0.188 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| a1c2a16f4649cbe80000000000000050 | 16.382 | 2.336 | n/a | 0.000 | 0.170 | 1.416 | 2.627 | 0.053 | 0.000 | 1.129 | 8.139 | 0.485 | n/a | 0.026 | 2.507 | 0.153 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000004e | 14.943 | 2.610 | n/a | 0.000 | 0.068 | 0.811 | 1.405 | 0.022 | 0.000 | 0.469 | 9.000 | 0.519 | n/a | 0.038 | 2.678 | 0.179 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.663 | 0.991 | 0.000 | 0.792 | 3.158 | n/a | 0.000 | 0.074 | 1.120 | 2.181 | 0.025 | 0.000 | 0.680 | 12.628 | 2.151 | n/a | 0.030 | 3.732 | 0.167 | 0.030 |
| p99 | 172.187 | 3.844 | 0.000 | 3.478 | 7.626 | n/a | 1.443 | 6.618 | 4.026 | 29.733 | 0.336 | 0.000 | 3.713 | 103.636 | 30.474 | n/a | 0.076 | 9.093 | 0.462 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe8000000000000006d | 172.187 | 5.692 | n/a | 1.344 | 0.112 | 1.031 | 29.733 | 0.035 | 0.000 | 0.093 | 103.636 | 30.474 | n/a | 0.036 | 7.148 | 0.042 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| a1c2a16f4649cbe8000000000000007d | 47.123 | 7.589 | n/a | 1.443 | 0.060 | 1.551 | 2.474 | 0.025 | 0.000 | 3.713 | 15.563 | 14.672 | n/a | 0.033 | 9.093 | 0.193 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| a1c2a16f4649cbe80000000000000077 | 43.337 | 2.761 | n/a | 0.531 | 0.074 | 1.120 | 3.049 | 0.023 | 0.000 | 0.537 | 27.883 | 7.330 | n/a | 0.028 | 3.366 | 0.078 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000073 | 39.091 | 4.312 | n/a | 0.617 | 0.070 | 4.026 | 1.791 | 0.024 | 0.000 | 3.328 | 17.614 | 7.280 | n/a | 0.030 | 4.999 | 0.128 | 0.030 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000090 | 38.970 | 6.434 | n/a | 0.000 | 0.173 | 2.932 | 2.903 | 0.031 | 0.000 | 0.864 | 17.497 | 8.068 | n/a | 0.068 | 6.607 | 0.170 | 0.068 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000007a | 34.637 | 2.651 | n/a | 0.000 | 0.057 | 1.018 | 2.647 | 0.025 | 0.000 | 0.732 | 18.341 | 9.144 | n/a | 0.023 | 2.708 | 0.078 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000006a | 30.149 | 7.626 | n/a | 0.000 | 0.076 | 3.396 | 9.981 | 0.336 | 0.000 | 2.722 | 5.544 | 0.435 | n/a | 0.032 | 7.703 | 0.255 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| a1c2a16f4649cbe80000000000000098 | 27.908 | 2.155 | n/a | 0.000 | 0.072 | 1.084 | 3.115 | 0.026 | 0.000 | 0.594 | 19.269 | 1.566 | n/a | 0.028 | 2.226 | 0.080 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000008b | 26.800 | 2.164 | n/a | 0.000 | 0.045 | 0.720 | 1.806 | 0.020 | 0.000 | 1.263 | 11.682 | 9.022 | n/a | 0.076 | 2.209 | 0.082 | 0.076 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| a1c2a16f4649cbe80000000000000093 | 25.744 | 3.332 | n/a | 0.000 | 0.047 | 0.749 | 2.181 | 0.021 | 0.000 | 0.114 | 18.234 | 1.029 | n/a | 0.037 | 3.379 | 0.131 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000009e | 25.663 | 5.339 | n/a | 0.000 | 0.160 | 1.782 | 3.822 | 0.029 | 0.000 | 0.631 | 10.124 | 3.710 | n/a | 0.065 | 5.499 | 0.214 | 0.065 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000082 | 22.509 | 2.781 | n/a | 0.650 | 0.074 | 1.248 | 2.099 | 0.025 | 0.000 | 0.922 | 12.628 | 2.054 | n/a | 0.027 | 3.506 | 0.156 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000065 | 21.651 | 2.424 | n/a | 0.213 | 0.049 | 0.928 | 1.384 | 0.020 | 0.000 | 0.862 | 12.203 | 3.548 | n/a | 0.019 | 2.686 | 0.124 | 0.019 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000085 | 21.398 | 4.085 | n/a | 0.000 | 0.080 | 1.395 | 1.864 | 0.024 | 0.000 | 0.125 | 12.884 | 0.911 | n/a | 0.030 | 4.166 | 0.195 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000067 | 21.133 | 3.158 | n/a | 0.000 | 0.574 | 1.143 | 1.435 | 0.021 | 0.000 | 0.593 | 13.233 | 0.956 | n/a | 0.021 | 3.732 | 0.177 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| a1c2a16f4649cbe8000000000000009c | 20.708 | 4.582 | n/a | 0.000 | 0.162 | 1.477 | 2.640 | 0.033 | 0.000 | 0.680 | 8.922 | 2.151 | n/a | 0.060 | 4.745 | 0.229 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000087 | 18.678 | 3.841 | n/a | 0.000 | 0.053 | 2.187 | 5.322 | 0.026 | 0.000 | 0.728 | 5.385 | 1.109 | n/a | 0.026 | 3.894 | 0.208 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000009f | 17.972 | 1.678 | n/a | 0.000 | 6.618 | 0.687 | 1.261 | 0.023 | 0.000 | 0.669 | 6.021 | 0.997 | n/a | 0.019 | 8.296 | 0.462 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.240ms; driver.publication.persist-deferred 0.021ms |
| a1c2a16f4649cbe80000000000000080 | 17.535 | 2.273 | n/a | 0.582 | 0.066 | 0.876 | 1.836 | 0.027 | 0.000 | 0.675 | 8.675 | 2.495 | n/a | 0.029 | 2.921 | 0.167 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| a1c2a16f4649cbe8000000000000008d | 15.744 | 2.419 | n/a | 0.000 | 0.085 | 0.917 | 1.188 | 0.019 | 0.000 | 1.066 | 9.485 | 0.517 | n/a | 0.047 | 2.505 | 0.159 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.972 | 0.957 | 0.000 | 0.503 | 2.419 | n/a | 0.000 | 0.074 | 0.947 | 1.816 | 0.023 | 0.000 | 0.594 | 8.675 | 0.956 | n/a | 0.028 | 2.921 | 0.167 | 0.028 |
| p99 | 43.337 | 1.651 | 0.000 | 0.837 | 7.626 | n/a | 0.582 | 6.618 | 3.396 | 9.981 | 0.336 | 0.000 | 2.722 | 27.883 | 7.330 | n/a | 0.047 | 8.296 | 0.462 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000000077 | 43.337 | 2.761 | n/a | 0.531 | 0.074 | 1.120 | 3.049 | 0.023 | 0.000 | 0.537 | 27.883 | 7.330 | n/a | 0.028 | 3.366 | 0.078 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000006a | 30.149 | 7.626 | n/a | 0.000 | 0.076 | 3.396 | 9.981 | 0.336 | 0.000 | 2.722 | 5.544 | 0.435 | n/a | 0.032 | 7.703 | 0.255 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| a1c2a16f4649cbe80000000000000098 | 27.908 | 2.155 | n/a | 0.000 | 0.072 | 1.084 | 3.115 | 0.026 | 0.000 | 0.594 | 19.269 | 1.566 | n/a | 0.028 | 2.226 | 0.080 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000067 | 21.133 | 3.158 | n/a | 0.000 | 0.574 | 1.143 | 1.435 | 0.021 | 0.000 | 0.593 | 13.233 | 0.956 | n/a | 0.021 | 3.732 | 0.177 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| a1c2a16f4649cbe8000000000000009f | 17.972 | 1.678 | n/a | 0.000 | 6.618 | 0.687 | 1.261 | 0.023 | 0.000 | 0.669 | 6.021 | 0.997 | n/a | 0.019 | 8.296 | 0.462 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.240ms; driver.publication.persist-deferred 0.021ms |
| a1c2a16f4649cbe80000000000000080 | 17.535 | 2.273 | n/a | 0.582 | 0.066 | 0.876 | 1.836 | 0.027 | 0.000 | 0.675 | 8.675 | 2.495 | n/a | 0.029 | 2.921 | 0.167 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| a1c2a16f4649cbe8000000000000008d | 15.744 | 2.419 | n/a | 0.000 | 0.085 | 0.917 | 1.188 | 0.019 | 0.000 | 1.066 | 9.485 | 0.517 | n/a | 0.047 | 2.505 | 0.159 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000089 | 12.432 | 2.522 | n/a | 0.000 | 0.057 | 0.947 | 1.816 | 0.022 | 0.000 | 0.472 | 5.960 | 0.609 | n/a | 0.026 | 2.580 | 0.207 | 0.026 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (19 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.584 | 0.913 | 0.000 | 0.683 | 3.372 | n/a | 0.000 | 0.077 | 1.241 | 2.319 | 0.027 | 0.000 | 0.240 | 10.879 | 4.667 | n/a | 0.033 | 3.610 | 0.156 | 0.033 |
| p99 | 118.317 | 2.814 | 0.000 | 3.266 | 8.121 | n/a | 0.826 | 1.945 | 4.395 | 15.785 | 0.292 | 0.000 | 4.291 | 84.057 | 21.126 | n/a | 0.104 | 8.267 | 0.282 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe800000000000000b1 | 118.317 | 1.924 | n/a | 0.000 | 0.064 | 0.731 | 15.785 | 0.045 | 0.000 | 0.078 | 84.057 | 15.609 | n/a | 0.026 | 1.988 | 0.017 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| a1c2a16f4649cbe800000000000000ac | 54.499 | 3.738 | n/a | 0.000 | 1.945 | 1.653 | 2.319 | 0.023 | 0.000 | 0.435 | 23.236 | 21.126 | n/a | 0.024 | 5.682 | 0.104 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000d1 | 43.907 | 8.121 | n/a | 0.000 | 0.146 | 1.896 | 4.891 | 0.094 | 0.000 | 0.317 | 18.201 | 10.163 | n/a | 0.078 | 8.267 | 0.188 | 0.078 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000a4 | 37.592 | 3.105 | n/a | 0.000 | 0.126 | 1.241 | 2.040 | 0.024 | 0.000 | 4.291 | 12.972 | 13.745 | n/a | 0.049 | 3.231 | 0.086 | 0.049 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.031ms |
| a1c2a16f4649cbe800000000000000bc | 33.226 | 5.863 | n/a | 0.826 | 0.055 | 0.932 | 8.469 | 0.021 | 0.000 | 0.112 | 10.844 | 6.079 | n/a | 0.025 | 6.744 | 0.203 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000db | 28.435 | 4.292 | n/a | 0.000 | 0.142 | 0.981 | 1.639 | 0.028 | 0.000 | 0.197 | 18.216 | 2.885 | n/a | 0.055 | 4.434 | 0.156 | 0.055 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000c8 | 28.020 | 4.416 | n/a | 0.000 | 0.050 | 0.669 | 4.669 | 0.292 | 0.000 | 0.155 | 11.792 | 5.957 | n/a | 0.020 | 4.466 | 0.159 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000d5 | 26.953 | 2.662 | n/a | 0.000 | 0.050 | 0.965 | 3.844 | 0.061 | 0.000 | 0.323 | 15.350 | 3.673 | n/a | 0.024 | 2.712 | 0.101 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000ae | 25.728 | 3.934 | n/a | 0.000 | 0.169 | 1.386 | 1.838 | 0.027 | 0.000 | 0.115 | 10.435 | 7.771 | n/a | 0.051 | 4.104 | 0.160 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000c0 | 25.584 | 4.818 | n/a | 0.000 | 0.080 | 1.066 | 2.292 | 0.131 | 0.000 | 0.240 | 10.879 | 6.036 | n/a | 0.041 | 4.899 | 0.191 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000a7 | 25.188 | 2.396 | n/a | 0.000 | 0.104 | 2.130 | 5.790 | 0.025 | 0.000 | 0.185 | 12.920 | 1.595 | n/a | 0.040 | 2.501 | 0.099 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000b6 | 23.248 | 4.039 | n/a | 0.000 | 0.172 | 1.331 | 3.671 | 0.029 | 0.000 | 0.145 | 9.133 | 4.667 | n/a | 0.061 | 4.211 | 0.181 | 0.061 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000dd | 19.813 | 1.777 | n/a | 0.000 | 0.077 | 4.395 | 1.645 | 0.283 | 0.000 | 0.118 | 7.101 | 4.385 | n/a | 0.033 | 1.854 | 0.094 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000c5 | 19.810 | 2.135 | n/a | 0.000 | 0.077 | 0.842 | 3.291 | 0.022 | 0.000 | 0.171 | 11.825 | 1.418 | n/a | 0.028 | 2.212 | 0.112 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000cd | 18.281 | 2.341 | n/a | 0.000 | 0.071 | 1.989 | 1.488 | 0.025 | 0.000 | 0.487 | 7.128 | 4.718 | n/a | 0.034 | 2.412 | 0.132 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| a1c2a16f4649cbe800000000000000d7 | 18.085 | 3.372 | n/a | 0.000 | 0.271 | 1.431 | 1.554 | 0.027 | 0.000 | 0.247 | 8.040 | 3.039 | n/a | 0.104 | 3.643 | 0.201 | 0.104 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000ca | 15.349 | 3.558 | n/a | 0.000 | 0.052 | 1.070 | 1.391 | 0.025 | 0.000 | 0.608 | 7.106 | 1.513 | n/a | 0.026 | 3.610 | 0.235 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| a1c2a16f4649cbe800000000000000e0 | 14.912 | 1.566 | n/a | 0.000 | 0.069 | 1.360 | 3.021 | 0.089 | 0.000 | 1.032 | 7.228 | 0.517 | n/a | 0.029 | 1.635 | 0.110 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000b9 | 10.568 | 2.902 | n/a | 0.000 | 0.076 | 0.815 | 1.453 | 0.022 | 0.000 | 0.457 | 4.173 | 0.638 | n/a | 0.033 | 2.978 | 0.282 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.810 | 0.000 | 0.000 | 0.466 | 2.341 | n/a | 0.000 | 0.077 | 1.331 | 2.040 | 0.025 | 0.000 | 0.185 | 8.040 | 3.039 | n/a | 0.033 | 2.412 | 0.110 | 0.033 |
| p99 | 118.317 | 0.998 | 0.000 | 0.848 | 4.039 | n/a | 0.000 | 0.271 | 4.395 | 15.785 | 0.283 | 0.000 | 4.291 | 84.057 | 15.609 | n/a | 0.104 | 4.211 | 0.282 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe800000000000000b1 | 118.317 | 1.924 | n/a | 0.000 | 0.064 | 0.731 | 15.785 | 0.045 | 0.000 | 0.078 | 84.057 | 15.609 | n/a | 0.026 | 1.988 | 0.017 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| a1c2a16f4649cbe800000000000000a4 | 37.592 | 3.105 | n/a | 0.000 | 0.126 | 1.241 | 2.040 | 0.024 | 0.000 | 4.291 | 12.972 | 13.745 | n/a | 0.049 | 3.231 | 0.086 | 0.049 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.031ms |
| a1c2a16f4649cbe800000000000000a7 | 25.188 | 2.396 | n/a | 0.000 | 0.104 | 2.130 | 5.790 | 0.025 | 0.000 | 0.185 | 12.920 | 1.595 | n/a | 0.040 | 2.501 | 0.099 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000b6 | 23.248 | 4.039 | n/a | 0.000 | 0.172 | 1.331 | 3.671 | 0.029 | 0.000 | 0.145 | 9.133 | 4.667 | n/a | 0.061 | 4.211 | 0.181 | 0.061 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000dd | 19.813 | 1.777 | n/a | 0.000 | 0.077 | 4.395 | 1.645 | 0.283 | 0.000 | 0.118 | 7.101 | 4.385 | n/a | 0.033 | 1.854 | 0.094 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000c5 | 19.810 | 2.135 | n/a | 0.000 | 0.077 | 0.842 | 3.291 | 0.022 | 0.000 | 0.171 | 11.825 | 1.418 | n/a | 0.028 | 2.212 | 0.112 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000cd | 18.281 | 2.341 | n/a | 0.000 | 0.071 | 1.989 | 1.488 | 0.025 | 0.000 | 0.487 | 7.128 | 4.718 | n/a | 0.034 | 2.412 | 0.132 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| a1c2a16f4649cbe800000000000000d7 | 18.085 | 3.372 | n/a | 0.000 | 0.271 | 1.431 | 1.554 | 0.027 | 0.000 | 0.247 | 8.040 | 3.039 | n/a | 0.104 | 3.643 | 0.201 | 0.104 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000e0 | 14.912 | 1.566 | n/a | 0.000 | 0.069 | 1.360 | 3.021 | 0.089 | 0.000 | 1.032 | 7.228 | 0.517 | n/a | 0.029 | 1.635 | 0.110 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000b9 | 10.568 | 2.902 | n/a | 0.000 | 0.076 | 0.815 | 1.453 | 0.022 | 0.000 | 0.457 | 4.173 | 0.638 | n/a | 0.033 | 2.978 | 0.282 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.713 | 0.413 | 0.000 | 0.480 | 2.477 | n/a | 0.000 | 0.078 | 1.028 | 2.337 | 0.024 | 0.000 | 0.183 | 9.500 | 3.973 | n/a | 0.031 | 2.550 | 0.141 | 0.031 |
| p99 | 95.465 | 1.007 | 0.000 | 1.407 | 10.696 | n/a | 0.000 | 1.084 | 4.303 | 28.015 | 0.147 | 0.000 | 1.699 | 65.690 | 17.856 | n/a | 0.087 | 11.099 | 0.226 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe800000000000000ef | 95.465 | 2.803 | n/a | 0.000 | 0.130 | 0.795 | 10.482 | 0.022 | 0.000 | 1.306 | 65.690 | 14.195 | n/a | 0.042 | 2.933 | 0.031 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| a1c2a16f4649cbe80000000000000100 | 60.698 | 10.696 | n/a | 0.000 | 0.404 | 4.303 | 28.015 | 0.147 | 0.000 | 1.124 | 10.635 | 5.347 | n/a | 0.028 | 11.099 | 0.183 | 0.028 | gw-w/thread-48/gateway.admitted-work | none observed |
| a1c2a16f4649cbe80000000000000109 | 34.293 | 4.777 | n/a | 0.000 | 0.101 | 1.260 | 3.903 | 0.033 | 0.000 | 0.144 | 20.003 | 4.029 | n/a | 0.044 | 4.878 | 0.142 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| a1c2a16f4649cbe800000000000000fc | 33.693 | 2.157 | n/a | 0.000 | 0.078 | 0.830 | 1.443 | 0.024 | 0.000 | 0.135 | 11.140 | 17.856 | n/a | 0.031 | 2.235 | 0.066 | 0.031 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.047ms |
| a1c2a16f4649cbe800000000000000f2 | 29.096 | 6.012 | n/a | 0.000 | 0.178 | 0.960 | 1.728 | 0.024 | 0.000 | 0.280 | 14.811 | 5.016 | n/a | 0.087 | 6.190 | 0.213 | 0.087 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000011c | 26.977 | 2.424 | n/a | 0.000 | 0.077 | 1.020 | 5.865 | 0.073 | 0.000 | 0.696 | 10.281 | 6.511 | n/a | 0.030 | 2.501 | 0.093 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000e5 | 23.770 | 2.051 | n/a | 0.000 | 0.076 | 1.654 | 1.429 | 0.022 | 0.000 | 0.164 | 17.389 | 0.951 | n/a | 0.033 | 2.127 | 0.089 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| a1c2a16f4649cbe800000000000000e9 | 22.755 | 3.521 | n/a | 0.000 | 0.021 | 1.303 | 5.333 | 0.019 | 0.000 | 0.085 | 10.521 | 1.940 | n/a | 0.012 | 3.542 | 0.156 | 0.012 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.019ms |
| a1c2a16f4649cbe800000000000000f5 | 22.409 | 3.070 | n/a | 0.000 | 0.079 | 1.238 | 4.879 | 0.034 | 0.000 | 0.152 | 7.616 | 5.294 | n/a | 0.046 | 3.149 | 0.141 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000110 | 21.898 | 3.095 | n/a | 0.000 | 0.066 | 1.160 | 5.027 | 0.027 | 0.000 | 0.183 | 7.976 | 4.335 | n/a | 0.029 | 3.161 | 0.144 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| a1c2a16f4649cbe800000000000000e8 | 21.713 | 1.750 | n/a | 0.000 | 0.061 | 0.759 | 1.738 | 0.020 | 0.000 | 0.167 | 16.492 | 0.700 | n/a | 0.025 | 1.810 | 0.083 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| a1c2a16f4649cbe80000000000000113 | 20.940 | 2.173 | n/a | 0.000 | 0.221 | 0.599 | 4.965 | 0.035 | 0.000 | 0.148 | 7.906 | 4.874 | n/a | 0.018 | 2.394 | 0.114 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| a1c2a16f4649cbe8000000000000010c | 20.306 | 2.103 | n/a | 0.000 | 0.071 | 1.206 | 1.936 | 0.027 | 0.000 | 0.175 | 9.384 | 5.369 | n/a | 0.036 | 2.174 | 0.107 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000fa | 19.376 | 1.795 | n/a | 0.000 | 0.082 | 0.860 | 2.337 | 0.021 | 0.000 | 0.630 | 10.874 | 2.747 | n/a | 0.031 | 1.876 | 0.097 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| a1c2a16f4649cbe800000000000000f8 | 18.212 | 3.041 | n/a | 0.000 | 1.084 | 1.028 | 1.977 | 0.023 | 0.000 | 1.699 | 6.885 | 2.437 | n/a | 0.040 | 4.124 | 0.226 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| a1c2a16f4649cbe80000000000000102 | 17.636 | 2.477 | n/a | 0.000 | 0.073 | 1.054 | 2.421 | 0.032 | 0.000 | 0.228 | 7.335 | 3.973 | n/a | 0.043 | 2.550 | 0.145 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000011a | 17.244 | 2.582 | n/a | 0.000 | 0.084 | 1.533 | 1.584 | 0.032 | 0.000 | 0.956 | 9.500 | 0.942 | n/a | 0.031 | 2.666 | 0.155 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000105 | 16.888 | 2.593 | n/a | 0.000 | 0.105 | 1.008 | 1.623 | 0.020 | 0.000 | 0.121 | 7.844 | 3.529 | n/a | 0.047 | 2.697 | 0.160 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000e3 | 14.629 | 1.879 | n/a | 0.000 | 0.060 | 0.866 | 1.342 | 0.027 | 0.000 | 0.237 | 8.932 | 1.259 | n/a | 0.028 | 1.939 | 0.133 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000121 | 13.498 | 1.986 | n/a | 0.000 | 0.075 | 1.291 | 2.532 | 0.024 | 0.000 | 0.150 | 6.231 | 1.175 | n/a | 0.034 | 2.061 | 0.153 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.306 | 0.206 | 0.000 | 0.443 | 2.157 | n/a | 0.000 | 0.078 | 1.008 | 1.936 | 0.024 | 0.000 | 0.175 | 8.932 | 2.747 | n/a | 0.031 | 2.235 | 0.133 | 0.031 |
| p99 | 95.465 | 1.000 | 0.000 | 0.837 | 3.095 | n/a | 0.000 | 1.084 | 1.654 | 10.482 | 0.035 | 0.000 | 1.699 | 65.690 | 17.856 | n/a | 0.047 | 4.124 | 0.226 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe800000000000000ef | 95.465 | 2.803 | n/a | 0.000 | 0.130 | 0.795 | 10.482 | 0.022 | 0.000 | 1.306 | 65.690 | 14.195 | n/a | 0.042 | 2.933 | 0.031 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| a1c2a16f4649cbe800000000000000fc | 33.693 | 2.157 | n/a | 0.000 | 0.078 | 0.830 | 1.443 | 0.024 | 0.000 | 0.135 | 11.140 | 17.856 | n/a | 0.031 | 2.235 | 0.066 | 0.031 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.047ms |
| a1c2a16f4649cbe800000000000000e5 | 23.770 | 2.051 | n/a | 0.000 | 0.076 | 1.654 | 1.429 | 0.022 | 0.000 | 0.164 | 17.389 | 0.951 | n/a | 0.033 | 2.127 | 0.089 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| a1c2a16f4649cbe800000000000000f5 | 22.409 | 3.070 | n/a | 0.000 | 0.079 | 1.238 | 4.879 | 0.034 | 0.000 | 0.152 | 7.616 | 5.294 | n/a | 0.046 | 3.149 | 0.141 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000110 | 21.898 | 3.095 | n/a | 0.000 | 0.066 | 1.160 | 5.027 | 0.027 | 0.000 | 0.183 | 7.976 | 4.335 | n/a | 0.029 | 3.161 | 0.144 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| a1c2a16f4649cbe800000000000000e8 | 21.713 | 1.750 | n/a | 0.000 | 0.061 | 0.759 | 1.738 | 0.020 | 0.000 | 0.167 | 16.492 | 0.700 | n/a | 0.025 | 1.810 | 0.083 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| a1c2a16f4649cbe80000000000000113 | 20.940 | 2.173 | n/a | 0.000 | 0.221 | 0.599 | 4.965 | 0.035 | 0.000 | 0.148 | 7.906 | 4.874 | n/a | 0.018 | 2.394 | 0.114 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| a1c2a16f4649cbe8000000000000010c | 20.306 | 2.103 | n/a | 0.000 | 0.071 | 1.206 | 1.936 | 0.027 | 0.000 | 0.175 | 9.384 | 5.369 | n/a | 0.036 | 2.174 | 0.107 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000fa | 19.376 | 1.795 | n/a | 0.000 | 0.082 | 0.860 | 2.337 | 0.021 | 0.000 | 0.630 | 10.874 | 2.747 | n/a | 0.031 | 1.876 | 0.097 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| a1c2a16f4649cbe800000000000000f8 | 18.212 | 3.041 | n/a | 0.000 | 1.084 | 1.028 | 1.977 | 0.023 | 0.000 | 1.699 | 6.885 | 2.437 | n/a | 0.040 | 4.124 | 0.226 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| a1c2a16f4649cbe8000000000000011a | 17.244 | 2.582 | n/a | 0.000 | 0.084 | 1.533 | 1.584 | 0.032 | 0.000 | 0.956 | 9.500 | 0.942 | n/a | 0.031 | 2.666 | 0.155 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000105 | 16.888 | 2.593 | n/a | 0.000 | 0.105 | 1.008 | 1.623 | 0.020 | 0.000 | 0.121 | 7.844 | 3.529 | n/a | 0.047 | 2.697 | 0.160 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000000e3 | 14.629 | 1.879 | n/a | 0.000 | 0.060 | 0.866 | 1.342 | 0.027 | 0.000 | 0.237 | 8.932 | 1.259 | n/a | 0.028 | 1.939 | 0.133 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000121 | 13.498 | 1.986 | n/a | 0.000 | 0.075 | 1.291 | 2.532 | 0.024 | 0.000 | 0.150 | 6.231 | 1.175 | n/a | 0.034 | 2.061 | 0.153 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| a1c2a16f4649cbe80000000000000116 | 13.037 | 1.703 | n/a | 0.000 | 0.078 | 0.853 | 1.387 | 0.023 | 0.000 | 0.569 | 7.693 | 0.700 | n/a | 0.030 | 1.781 | 0.137 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.630 | 0.000 | 0.000 | 0.664 | 2.922 | n/a | 0.000 | 0.085 | 1.185 | 2.542 | 0.026 | 0.000 | 0.440 | 10.216 | 1.159 | n/a | 0.032 | 3.042 | 0.151 | 0.032 |
| p99 | 88.222 | 3.946 | 0.000 | 3.340 | 10.903 | n/a | 0.000 | 0.499 | 3.078 | 15.869 | 4.284 | 0.000 | 3.128 | 57.271 | 36.138 | n/a | 0.637 | 11.030 | 0.353 | 0.637 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000000135 | 88.222 | 2.529 | n/a | 0.000 | 0.092 | 1.215 | 6.758 | 0.028 | 0.000 | 0.763 | 57.271 | 19.528 | n/a | 0.038 | 2.621 | 0.030 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000158 | 59.038 | 4.002 | n/a | 0.000 | 0.108 | 0.755 | 4.885 | 0.030 | 0.000 | 0.614 | 12.465 | 36.138 | n/a | 0.043 | 4.109 | 0.070 | 0.043 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.053ms |
| a1c2a16f4649cbe80000000000000144 | 40.002 | 2.419 | n/a | 0.000 | 0.040 | 0.616 | 1.015 | 0.014 | 0.000 | 0.124 | 26.020 | 9.736 | n/a | 0.018 | 2.458 | 0.061 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.127ms; driver.publication.persist-deferred 0.018ms |
| a1c2a16f4649cbe80000000000000154 | 34.017 | 3.005 | n/a | 0.000 | 0.085 | 1.952 | 8.456 | 0.023 | 0.000 | 0.135 | 11.565 | 8.759 | n/a | 0.038 | 3.090 | 0.091 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| a1c2a16f4649cbe8000000000000016d | 31.581 | 2.638 | n/a | 0.000 | 0.150 | 0.834 | 1.878 | 0.023 | 0.000 | 0.118 | 20.335 | 5.543 | n/a | 0.062 | 2.788 | 0.088 | 0.062 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000152 | 31.287 | 10.903 | n/a | 0.000 | 0.127 | 1.201 | 2.448 | 0.026 | 0.000 | 0.344 | 9.259 | 6.930 | n/a | 0.050 | 11.030 | 0.353 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000130 | 29.454 | 2.269 | n/a | 0.000 | 0.066 | 0.743 | 4.117 | 0.026 | 0.000 | 0.196 | 15.747 | 6.258 | n/a | 0.033 | 2.335 | 0.079 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000143 | 27.822 | 3.743 | n/a | 0.000 | 0.156 | 1.764 | 1.863 | 0.026 | 0.000 | 0.691 | 18.493 | 1.027 | n/a | 0.058 | 3.899 | 0.140 | 0.058 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000015e | 27.201 | 4.166 | n/a | 0.000 | 0.071 | 1.901 | 15.869 | 0.058 | 0.000 | 1.271 | 3.522 | 0.313 | n/a | 0.030 | 4.236 | 0.156 | 0.030 | gw-w/thread-53/gateway.admitted-work | none observed |
| a1c2a16f4649cbe80000000000000138 | 26.679 | 2.570 | n/a | 0.000 | 0.073 | 0.841 | 4.921 | 0.023 | 0.000 | 0.606 | 9.289 | 8.323 | n/a | 0.032 | 2.644 | 0.099 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000013b | 25.661 | 3.649 | n/a | 0.000 | 0.499 | 1.279 | 2.839 | 0.025 | 0.000 | 0.677 | 11.046 | 5.617 | n/a | 0.032 | 4.147 | 0.162 | 0.032 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| a1c2a16f4649cbe8000000000000015a | 24.705 | 1.553 | n/a | 0.000 | 0.062 | 0.673 | 1.694 | 0.021 | 0.000 | 0.440 | 19.106 | 1.129 | n/a | 0.025 | 1.615 | 0.065 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000126 | 24.635 | 5.157 | n/a | 0.000 | 0.159 | 1.050 | 3.476 | 0.086 | 0.000 | 0.762 | 10.464 | 3.413 | n/a | 0.069 | 5.316 | 0.216 | 0.069 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| a1c2a16f4649cbe80000000000000155 | 24.361 | 3.427 | n/a | 0.000 | 0.139 | 1.233 | 2.542 | 4.284 | 0.000 | 0.163 | 11.276 | 0.660 | n/a | 0.637 | 3.565 | 0.146 | 0.637 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.032ms |
| a1c2a16f4649cbe8000000000000013d | 24.149 | 2.153 | n/a | 0.000 | 0.062 | 1.331 | 2.672 | 0.054 | 0.000 | 0.684 | 15.916 | 1.235 | n/a | 0.041 | 2.215 | 0.092 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000014a | 23.630 | 6.232 | n/a | 0.000 | 0.113 | 1.151 | 3.568 | 0.089 | 0.000 | 0.969 | 9.262 | 2.198 | n/a | 0.046 | 6.346 | 0.269 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000128 | 21.366 | 1.998 | n/a | 0.000 | 0.059 | 1.185 | 3.505 | 0.052 | 0.000 | 0.394 | 12.881 | 1.264 | n/a | 0.027 | 2.057 | 0.096 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000012a | 20.941 | 3.066 | n/a | 0.000 | 0.094 | 2.132 | 5.889 | 0.056 | 0.000 | 0.587 | 8.123 | 0.939 | n/a | 0.056 | 3.161 | 0.151 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000161 | 20.801 | 4.289 | n/a | 0.000 | 0.087 | 3.078 | 1.660 | 0.022 | 0.000 | 0.534 | 10.216 | 0.885 | n/a | 0.032 | 4.376 | 0.210 | 0.032 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000163 | 20.605 | 6.389 | n/a | 0.000 | 0.153 | 1.219 | 2.274 | 0.025 | 0.000 | 0.897 | 8.422 | 1.159 | n/a | 0.067 | 6.542 | 0.318 | 0.067 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.149 | 0.000 | 0.000 | 0.486 | 2.529 | n/a | 0.000 | 0.072 | 1.058 | 2.064 | 0.026 | 0.000 | 0.216 | 11.276 | 1.129 | n/a | 0.032 | 2.621 | 0.096 | 0.032 |
| p99 | 88.222 | 1.984 | 0.000 | 1.097 | 5.264 | n/a | 0.000 | 0.150 | 3.078 | 15.869 | 4.284 | 0.000 | 1.402 | 57.271 | 19.528 | n/a | 0.637 | 5.412 | 0.318 | 0.637 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000000135 | 88.222 | 2.529 | n/a | 0.000 | 0.092 | 1.215 | 6.758 | 0.028 | 0.000 | 0.763 | 57.271 | 19.528 | n/a | 0.038 | 2.621 | 0.030 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000144 | 40.002 | 2.419 | n/a | 0.000 | 0.040 | 0.616 | 1.015 | 0.014 | 0.000 | 0.124 | 26.020 | 9.736 | n/a | 0.018 | 2.458 | 0.061 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.127ms; driver.publication.persist-deferred 0.018ms |
| a1c2a16f4649cbe80000000000000154 | 34.017 | 3.005 | n/a | 0.000 | 0.085 | 1.952 | 8.456 | 0.023 | 0.000 | 0.135 | 11.565 | 8.759 | n/a | 0.038 | 3.090 | 0.091 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| a1c2a16f4649cbe8000000000000016d | 31.581 | 2.638 | n/a | 0.000 | 0.150 | 0.834 | 1.878 | 0.023 | 0.000 | 0.118 | 20.335 | 5.543 | n/a | 0.062 | 2.788 | 0.088 | 0.062 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000130 | 29.454 | 2.269 | n/a | 0.000 | 0.066 | 0.743 | 4.117 | 0.026 | 0.000 | 0.196 | 15.747 | 6.258 | n/a | 0.033 | 2.335 | 0.079 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000015e | 27.201 | 4.166 | n/a | 0.000 | 0.071 | 1.901 | 15.869 | 0.058 | 0.000 | 1.271 | 3.522 | 0.313 | n/a | 0.030 | 4.236 | 0.156 | 0.030 | gw-w/thread-53/gateway.admitted-work | none observed |
| a1c2a16f4649cbe8000000000000015a | 24.705 | 1.553 | n/a | 0.000 | 0.062 | 0.673 | 1.694 | 0.021 | 0.000 | 0.440 | 19.106 | 1.129 | n/a | 0.025 | 1.615 | 0.065 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000155 | 24.361 | 3.427 | n/a | 0.000 | 0.139 | 1.233 | 2.542 | 4.284 | 0.000 | 0.163 | 11.276 | 0.660 | n/a | 0.637 | 3.565 | 0.146 | 0.637 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.032ms |
| a1c2a16f4649cbe8000000000000013d | 24.149 | 2.153 | n/a | 0.000 | 0.062 | 1.331 | 2.672 | 0.054 | 0.000 | 0.684 | 15.916 | 1.235 | n/a | 0.041 | 2.215 | 0.092 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000128 | 21.366 | 1.998 | n/a | 0.000 | 0.059 | 1.185 | 3.505 | 0.052 | 0.000 | 0.394 | 12.881 | 1.264 | n/a | 0.027 | 2.057 | 0.096 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000161 | 20.801 | 4.289 | n/a | 0.000 | 0.087 | 3.078 | 1.660 | 0.022 | 0.000 | 0.534 | 10.216 | 0.885 | n/a | 0.032 | 4.376 | 0.210 | 0.032 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000014c | 17.922 | 2.169 | n/a | 0.000 | 0.087 | 0.913 | 1.844 | 0.039 | 0.000 | 0.235 | 10.940 | 1.665 | n/a | 0.031 | 2.256 | 0.126 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000170 | 17.068 | 1.622 | n/a | 0.000 | 0.072 | 1.058 | 2.064 | 0.027 | 0.000 | 0.154 | 11.089 | 0.952 | n/a | 0.030 | 1.694 | 0.099 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000124 | 17.008 | 5.264 | n/a | 0.000 | 0.148 | 2.739 | 4.295 | 0.077 | 0.000 | 0.216 | 3.961 | 0.255 | n/a | 0.053 | 5.412 | 0.318 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| a1c2a16f4649cbe80000000000000168 | 16.167 | 2.637 | n/a | 0.000 | 0.061 | 0.830 | 1.526 | 0.025 | 0.000 | 1.402 | 9.007 | 0.654 | n/a | 0.025 | 2.698 | 0.167 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.106ms |
| a1c2a16f4649cbe8000000000000012c | 12.050 | 2.922 | n/a | 0.000 | 0.121 | 0.942 | 1.177 | 0.020 | 0.000 | 0.168 | 6.086 | 0.573 | n/a | 0.042 | 3.042 | 0.252 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.604 | 0.604 | 0.000 | 0.582 | 2.578 | n/a | 0.000 | 0.073 | 1.029 | 2.123 | 0.024 | 0.000 | 0.421 | 8.208 | 2.546 | n/a | 0.031 | 2.705 | 0.137 | 0.031 |
| p99 | 93.650 | 1.955 | 0.018 | 1.167 | 5.300 | n/a | 0.000 | 0.210 | 7.111 | 17.045 | 0.071 | 0.000 | 1.235 | 60.289 | 10.277 | n/a | 0.082 | 5.464 | 0.228 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000000180 | 93.650 | 4.046 | n/a | 0.000 | 0.129 | 1.264 | 17.045 | 0.057 | 0.000 | 0.489 | 60.289 | 10.277 | n/a | 0.054 | 4.175 | 0.045 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| a1c2a16f4649cbe800000000000001ae | 32.285 | 5.300 | n/a | 0.000 | 0.165 | 7.111 | 12.393 | 0.071 | 0.000 | 0.614 | 5.970 | 0.589 | n/a | 0.073 | 5.464 | 0.169 | 0.073 | gw-w/thread-50/storage/begin-command! | none observed |
| a1c2a16f4649cbe80000000000000178 | 25.954 | 2.357 | n/a | 0.000 | 0.183 | 0.854 | 1.663 | 0.024 | 0.000 | 0.110 | 13.256 | 7.439 | n/a | 0.069 | 2.540 | 0.098 | 0.069 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000018d | 25.250 | 3.184 | n/a | 0.000 | 0.210 | 1.636 | 2.123 | 0.029 | 0.000 | 0.742 | 10.604 | 6.640 | n/a | 0.082 | 3.395 | 0.134 | 0.082 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000187 | 25.129 | 2.927 | n/a | 0.000 | 0.088 | 0.879 | 3.501 | 0.021 | 0.000 | 0.507 | 11.912 | 5.250 | n/a | 0.043 | 3.015 | 0.120 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000192 | 24.983 | 3.410 | n/a | 0.000 | 0.072 | 1.029 | 3.923 | 0.031 | 0.000 | 0.840 | 11.911 | 3.737 | n/a | 0.031 | 3.481 | 0.139 | 0.031 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000184 | 24.940 | 3.196 | n/a | 0.000 | 0.042 | 0.777 | 1.790 | 0.021 | 0.000 | 0.655 | 13.979 | 4.460 | n/a | 0.021 | 3.238 | 0.130 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000001a1 | 21.656 | 2.578 | n/a | 0.000 | 0.136 | 0.813 | 1.423 | 0.024 | 0.000 | 0.735 | 13.433 | 2.457 | n/a | 0.058 | 2.714 | 0.125 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000017b | 21.520 | 2.644 | n/a | 0.000 | 0.061 | 0.670 | 9.059 | 0.031 | 0.000 | 0.099 | 8.115 | 0.812 | n/a | 0.029 | 2.705 | 0.126 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000198 | 21.380 | 2.549 | n/a | 0.000 | 0.105 | 2.130 | 3.851 | 0.034 | 0.000 | 1.235 | 6.804 | 4.631 | n/a | 0.041 | 2.655 | 0.124 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000018a | 19.793 | 2.516 | n/a | 0.000 | 0.091 | 1.041 | 5.026 | 0.021 | 0.000 | 0.094 | 7.413 | 3.553 | n/a | 0.039 | 2.607 | 0.132 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000196 | 18.604 | 2.506 | n/a | 0.000 | 0.073 | 4.441 | 1.266 | 0.021 | 0.000 | 0.137 | 8.208 | 1.922 | n/a | 0.029 | 2.579 | 0.139 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000001b0 | 18.108 | 4.083 | n/a | 0.000 | 0.052 | 0.800 | 2.124 | 0.022 | 0.000 | 0.178 | 9.690 | 1.133 | n/a | 0.026 | 4.135 | 0.228 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000190 | 18.024 | 2.181 | n/a | 0.000 | 0.035 | 1.073 | 1.061 | 0.021 | 0.000 | 0.513 | 10.360 | 2.765 | n/a | 0.016 | 2.217 | 0.123 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000019f | 17.580 | 1.741 | n/a | 0.000 | 0.051 | 1.214 | 2.153 | 0.042 | 0.000 | 0.550 | 7.601 | 4.206 | n/a | 0.022 | 1.792 | 0.102 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000001a8 | 16.925 | 2.246 | n/a | 0.000 | 0.065 | 0.630 | 1.363 | 0.019 | 0.000 | 0.108 | 8.808 | 3.659 | n/a | 0.027 | 2.312 | 0.137 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| a1c2a16f4649cbe8000000000000017e | 16.552 | 2.679 | n/a | 0.000 | 0.062 | 0.774 | 5.167 | 0.024 | 0.000 | 0.421 | 6.208 | 1.190 | n/a | 0.026 | 2.741 | 0.166 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.006ms |
| a1c2a16f4649cbe80000000000000175 | 16.074 | 2.107 | n/a | 0.000 | 0.092 | 1.089 | 1.720 | 0.032 | 0.000 | 0.160 | 9.601 | 1.230 | n/a | 0.042 | 2.199 | 0.137 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000172 | 15.999 | 3.192 | n/a | 0.000 | 0.051 | 1.024 | 1.733 | 0.023 | 0.000 | 0.101 | 7.570 | 2.278 | n/a | 0.027 | 3.243 | 0.203 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000019c | 15.466 | 2.328 | n/a | 0.000 | 0.125 | 1.203 | 2.452 | 0.067 | 0.000 | 1.079 | 7.558 | 0.606 | n/a | 0.048 | 2.454 | 0.159 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.024 | 0.000 | 0.000 | 0.461 | 2.506 | n/a | 0.000 | 0.088 | 1.083 | 1.733 | 0.024 | 0.000 | 0.489 | 8.208 | 2.546 | n/a | 0.040 | 2.579 | 0.137 | 0.040 |
| p99 | 93.650 | 1.084 | 0.000 | 1.010 | 5.300 | n/a | 0.000 | 0.210 | 7.111 | 17.045 | 0.071 | 0.000 | 1.079 | 60.289 | 10.277 | n/a | 0.082 | 5.464 | 0.203 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000000180 | 93.650 | 4.046 | n/a | 0.000 | 0.129 | 1.264 | 17.045 | 0.057 | 0.000 | 0.489 | 60.289 | 10.277 | n/a | 0.054 | 4.175 | 0.045 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| a1c2a16f4649cbe800000000000001ae | 32.285 | 5.300 | n/a | 0.000 | 0.165 | 7.111 | 12.393 | 0.071 | 0.000 | 0.614 | 5.970 | 0.589 | n/a | 0.073 | 5.464 | 0.169 | 0.073 | gw-w/thread-50/storage/begin-command! | none observed |
| a1c2a16f4649cbe8000000000000018d | 25.250 | 3.184 | n/a | 0.000 | 0.210 | 1.636 | 2.123 | 0.029 | 0.000 | 0.742 | 10.604 | 6.640 | n/a | 0.082 | 3.395 | 0.134 | 0.082 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000187 | 25.129 | 2.927 | n/a | 0.000 | 0.088 | 0.879 | 3.501 | 0.021 | 0.000 | 0.507 | 11.912 | 5.250 | n/a | 0.043 | 3.015 | 0.120 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000001a1 | 21.656 | 2.578 | n/a | 0.000 | 0.136 | 0.813 | 1.423 | 0.024 | 0.000 | 0.735 | 13.433 | 2.457 | n/a | 0.058 | 2.714 | 0.125 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000018a | 19.793 | 2.516 | n/a | 0.000 | 0.091 | 1.041 | 5.026 | 0.021 | 0.000 | 0.094 | 7.413 | 3.553 | n/a | 0.039 | 2.607 | 0.132 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000196 | 18.604 | 2.506 | n/a | 0.000 | 0.073 | 4.441 | 1.266 | 0.021 | 0.000 | 0.137 | 8.208 | 1.922 | n/a | 0.029 | 2.579 | 0.139 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000190 | 18.024 | 2.181 | n/a | 0.000 | 0.035 | 1.073 | 1.061 | 0.021 | 0.000 | 0.513 | 10.360 | 2.765 | n/a | 0.016 | 2.217 | 0.123 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000019f | 17.580 | 1.741 | n/a | 0.000 | 0.051 | 1.214 | 2.153 | 0.042 | 0.000 | 0.550 | 7.601 | 4.206 | n/a | 0.022 | 1.792 | 0.102 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000001a8 | 16.925 | 2.246 | n/a | 0.000 | 0.065 | 0.630 | 1.363 | 0.019 | 0.000 | 0.108 | 8.808 | 3.659 | n/a | 0.027 | 2.312 | 0.137 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| a1c2a16f4649cbe80000000000000175 | 16.074 | 2.107 | n/a | 0.000 | 0.092 | 1.089 | 1.720 | 0.032 | 0.000 | 0.160 | 9.601 | 1.230 | n/a | 0.042 | 2.199 | 0.137 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe80000000000000172 | 15.999 | 3.192 | n/a | 0.000 | 0.051 | 1.024 | 1.733 | 0.023 | 0.000 | 0.101 | 7.570 | 2.278 | n/a | 0.027 | 3.243 | 0.203 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe8000000000000019c | 15.466 | 2.328 | n/a | 0.000 | 0.125 | 1.203 | 2.452 | 0.067 | 0.000 | 1.079 | 7.558 | 0.606 | n/a | 0.048 | 2.454 | 0.159 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000001a4 | 14.251 | 2.090 | n/a | 0.000 | 0.078 | 1.083 | 1.623 | 0.027 | 0.000 | 0.213 | 6.551 | 2.546 | n/a | 0.040 | 2.168 | 0.152 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a1c2a16f4649cbe800000000000001ab | 12.703 | 1.841 | n/a | 0.000 | 0.055 | 0.704 | 1.258 | 0.020 | 0.000 | 0.111 | 8.158 | 0.533 | n/a | 0.023 | 1.896 | 0.149 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (817 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.984 | 0.392 | 0.000 | 0.528 | 2.178 | n/a | 0.000 | 0.051 | 0.667 | 1.285 | 0.017 | 0.000 | 0.158 | 6.741 | 0.595 | n/a | 0.017 | 2.547 | 0.200 | 0.017 |
| p99 | 78.874 | 2.000 | 0.047 | 2.004 | 6.859 | n/a | 0.000 | 55.602 | 7.968 | 8.362 | 0.089 | 0.000 | 3.969 | 42.973 | 11.723 | n/a | 0.053 | 60.676 | 0.769 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe800000000000001c4 | 121.397 | 1.868 | n/a | 0.000 | 86.049 | 0.583 | 4.185 | 0.022 | 0.000 | 0.251 | 21.993 | 6.425 | n/a | 0.020 | 87.917 | 0.724 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.104ms; driver.publication.readback 0.074ms; driver.publication.readback 0.050ms; driver.reader-basis.broadcast 0.045ms; driver.publication.persist-deferred 0.028ms |
| a1c2a16f4649cbe800000000000006ec | 114.005 | 3.661 | n/a | 0.000 | 88.859 | 0.350 | 1.306 | 0.009 | 0.000 | 0.475 | 18.304 | 1.029 | n/a | 0.012 | 92.520 | 0.812 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.113ms; driver.publication.readback 0.085ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.053ms |
| a1c2a16f4649cbe800000000000001c6 | 112.527 | 5.483 | n/a | 0.000 | 86.038 | 1.071 | 7.188 | 0.042 | 0.000 | 0.591 | 11.320 | 0.773 | n/a | 0.022 | 91.520 | 0.813 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.104ms; driver.publication.readback 0.101ms; driver.publication.readback 0.074ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.042ms |
| a1c2a16f4649cbe800000000000006ed | 104.691 | 7.033 | n/a | 0.000 | 55.602 | 6.327 | 2.505 | 0.036 | 0.000 | 2.843 | 29.730 | 0.607 | n/a | 0.008 | 62.635 | 0.598 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.113ms; driver.publication.readback 0.085ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.053ms |
| a1c2a16f4649cbe800000000000006ea | 94.834 | 1.324 | n/a | 0.000 | 69.039 | 1.862 | 0.985 | 0.007 | 0.000 | 0.064 | 20.147 | 1.398 | n/a | 0.008 | 70.363 | 0.742 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.053ms; driver.publication.readback 0.051ms; driver.publication.readback 0.046ms |
| a1c2a16f4649cbe800000000000001c5 | 92.010 | 2.729 | n/a | 0.000 | 0.027 | 0.523 | 1.729 | 0.015 | 0.000 | 0.081 | 82.115 | 4.771 | n/a | 0.020 | 2.756 | 0.030 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.reader-basis.broadcast 0.045ms; driver.publication.persist-deferred 0.020ms |
| a1c2a16f4649cbe800000000000001c3 | 91.721 | 2.104 | n/a | 0.000 | 0.094 | 0.966 | 4.403 | 0.026 | 0.000 | 0.155 | 65.200 | 18.735 | n/a | 0.038 | 2.198 | 0.024 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| a1c2a16f4649cbe800000000000001cc | 81.012 | 1.639 | n/a | 0.000 | 60.667 | 0.512 | 1.721 | 0.061 | 0.000 | 0.839 | 14.249 | 1.312 | n/a | 0.011 | 62.306 | 0.769 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.101ms; driver.publication.readback 0.063ms; driver.publication.readback 0.063ms; driver.publication.readback 0.050ms; driver.publication.readback 0.042ms |
| a1c2a16f4649cbe800000000000002ec | 78.874 | 1.869 | n/a | 0.000 | 58.807 | 3.076 | 0.934 | 0.018 | 0.000 | 0.068 | 13.155 | 0.931 | n/a | 0.016 | 60.676 | 0.769 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.068ms; driver.publication.readback 0.067ms; driver.publication.readback 0.057ms; driver.publication.readback 0.047ms; driver.publication.readback 0.046ms |
| a1c2a16f4649cbe800000000000001d0 | 78.541 | 3.437 | n/a | 0.000 | 47.889 | 0.589 | 3.670 | 0.028 | 0.000 | 0.089 | 18.834 | 3.991 | n/a | 0.014 | 51.326 | 0.653 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.273ms; driver.publication.readback 0.115ms; driver.publication.readback 0.063ms; driver.publication.readback 0.063ms; driver.publication.readback 0.042ms |
| a1c2a16f4649cbe80000000000000245 | 76.821 | 3.006 | n/a | 0.000 | 63.994 | 0.680 | 1.665 | 0.025 | 0.000 | 1.655 | 5.211 | 0.570 | n/a | 0.014 | 67.001 | 0.872 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.reader-basis.broadcast 0.062ms; driver.publication.readback 0.054ms |
| a1c2a16f4649cbe800000000000001ca | 73.073 | 1.662 | n/a | 0.000 | 49.352 | 6.109 | 0.840 | 0.020 | 0.000 | 0.056 | 14.505 | 0.509 | n/a | 0.021 | 51.014 | 0.698 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.101ms; driver.publication.readback 0.063ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.042ms; driver.publication.readback 0.041ms |
| a1c2a16f4649cbe8000000000000024a | 72.932 | 1.195 | n/a | 0.000 | 60.232 | 0.953 | 0.974 | 0.013 | 0.000 | 0.679 | 8.619 | 0.252 | n/a | 0.015 | 61.427 | 0.842 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.073ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.056ms |
| a1c2a16f4649cbe8000000000000023f | 69.797 | 2.706 | n/a | 0.000 | 1.385 | 5.666 | 16.417 | 0.053 | 0.000 | 3.326 | 31.061 | 9.174 | n/a | 0.010 | 4.091 | 0.059 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.359ms; driver.publication.readback 0.155ms; driver.publication.readback 0.070ms; driver.reader-basis.broadcast 0.062ms; driver.publication.persist-deferred 0.032ms |
| a1c2a16f4649cbe800000000000006e9 | 69.439 | 2.161 | n/a | 0.000 | 41.869 | 3.066 | 1.272 | 0.016 | 0.000 | 0.145 | 20.591 | 0.297 | n/a | 0.023 | 44.030 | 0.634 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.019ms |
| a1c2a16f4649cbe8000000000000027d | 69.281 | 2.908 | n/a | 0.000 | 6.921 | 0.673 | 6.431 | 0.056 | 0.000 | 9.948 | 41.587 | 0.746 | n/a | 0.012 | 9.829 | 0.142 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.098ms; driver.publication.persist-deferred 0.056ms; driver.publication.readback 0.048ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.044ms |
| a1c2a16f4649cbe80000000000000244 | 66.587 | 2.256 | n/a | 0.000 | 22.450 | 21.154 | 1.303 | 0.032 | 0.000 | 1.423 | 16.935 | 0.996 | n/a | 0.037 | 24.706 | 0.371 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.155ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.reader-basis.broadcast 0.062ms |
| a1c2a16f4649cbe800000000000006e8 | 66.246 | 3.950 | n/a | 0.000 | 0.027 | 2.159 | 2.741 | 0.024 | 0.000 | 2.112 | 54.195 | 1.022 | n/a | 0.016 | 3.977 | 0.060 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.113ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.019ms |
| a1c2a16f4649cbe800000000000006eb | 64.675 | 1.734 | n/a | 0.000 | 0.007 | 5.665 | 1.329 | 0.019 | 0.000 | 0.324 | 54.557 | 1.033 | n/a | 0.008 | 1.740 | 0.027 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.113ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.019ms |
| a1c2a16f4649cbe80000000000000249 | 61.886 | 2.924 | n/a | 0.000 | 42.904 | 2.465 | 4.644 | 0.031 | 0.000 | 2.834 | 5.496 | 0.565 | n/a | 0.023 | 45.828 | 0.741 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.056ms; driver.publication.readback 0.054ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.517 | 0.000 | 0.000 | 0.414 | 1.757 | n/a | 0.000 | 0.054 | 0.645 | 1.083 | 0.016 | 0.000 | 0.155 | 6.140 | 0.458 | n/a | 0.017 | 2.082 | 0.192 | 0.017 |
| p99 | 78.874 | 1.923 | 0.050 | 0.959 | 4.596 | n/a | 0.000 | 58.807 | 7.540 | 8.904 | 0.210 | 0.000 | 3.656 | 31.324 | 11.723 | n/a | 0.071 | 60.676 | 0.769 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe800000000000001c4 | 121.397 | 1.868 | n/a | 0.000 | 86.049 | 0.583 | 4.185 | 0.022 | 0.000 | 0.251 | 21.993 | 6.425 | n/a | 0.020 | 87.917 | 0.724 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.104ms; driver.publication.readback 0.074ms; driver.publication.readback 0.050ms; driver.reader-basis.broadcast 0.045ms; driver.publication.persist-deferred 0.028ms |
| a1c2a16f4649cbe800000000000006ea | 94.834 | 1.324 | n/a | 0.000 | 69.039 | 1.862 | 0.985 | 0.007 | 0.000 | 0.064 | 20.147 | 1.398 | n/a | 0.008 | 70.363 | 0.742 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.053ms; driver.publication.readback 0.051ms; driver.publication.readback 0.046ms |
| a1c2a16f4649cbe800000000000001c3 | 91.721 | 2.104 | n/a | 0.000 | 0.094 | 0.966 | 4.403 | 0.026 | 0.000 | 0.155 | 65.200 | 18.735 | n/a | 0.038 | 2.198 | 0.024 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| a1c2a16f4649cbe800000000000001cc | 81.012 | 1.639 | n/a | 0.000 | 60.667 | 0.512 | 1.721 | 0.061 | 0.000 | 0.839 | 14.249 | 1.312 | n/a | 0.011 | 62.306 | 0.769 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.101ms; driver.publication.readback 0.063ms; driver.publication.readback 0.063ms; driver.publication.readback 0.050ms; driver.publication.readback 0.042ms |
| a1c2a16f4649cbe800000000000002ec | 78.874 | 1.869 | n/a | 0.000 | 58.807 | 3.076 | 0.934 | 0.018 | 0.000 | 0.068 | 13.155 | 0.931 | n/a | 0.016 | 60.676 | 0.769 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.068ms; driver.publication.readback 0.067ms; driver.publication.readback 0.057ms; driver.publication.readback 0.047ms; driver.publication.readback 0.046ms |
| a1c2a16f4649cbe800000000000001ca | 73.073 | 1.662 | n/a | 0.000 | 49.352 | 6.109 | 0.840 | 0.020 | 0.000 | 0.056 | 14.505 | 0.509 | n/a | 0.021 | 51.014 | 0.698 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.101ms; driver.publication.readback 0.063ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.042ms; driver.publication.readback 0.041ms |
| a1c2a16f4649cbe8000000000000024a | 72.932 | 1.195 | n/a | 0.000 | 60.232 | 0.953 | 0.974 | 0.013 | 0.000 | 0.679 | 8.619 | 0.252 | n/a | 0.015 | 61.427 | 0.842 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.073ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.056ms |
| a1c2a16f4649cbe800000000000006e9 | 69.439 | 2.161 | n/a | 0.000 | 41.869 | 3.066 | 1.272 | 0.016 | 0.000 | 0.145 | 20.591 | 0.297 | n/a | 0.023 | 44.030 | 0.634 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.019ms |
| a1c2a16f4649cbe80000000000000244 | 66.587 | 2.256 | n/a | 0.000 | 22.450 | 21.154 | 1.303 | 0.032 | 0.000 | 1.423 | 16.935 | 0.996 | n/a | 0.037 | 24.706 | 0.371 | 0.037 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.155ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.reader-basis.broadcast 0.062ms |
| a1c2a16f4649cbe800000000000002eb | 59.971 | 1.413 | n/a | 0.000 | 35.676 | 4.060 | 1.788 | 0.048 | 0.000 | 0.127 | 16.399 | 0.445 | n/a | 0.015 | 37.089 | 0.618 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.068ms; driver.publication.readback 0.067ms; driver.publication.readback 0.057ms; driver.publication.readback 0.047ms; driver.publication.readback 0.046ms |
| a1c2a16f4649cbe800000000000006f6 | 55.395 | 2.013 | n/a | 0.000 | 46.371 | 0.594 | 1.355 | 0.029 | 0.000 | 0.700 | 3.839 | 0.481 | n/a | 0.013 | 48.384 | 0.873 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.094ms; driver.publication.readback 0.085ms; driver.publication.readback 0.052ms; driver.publication.readback 0.051ms |
| a1c2a16f4649cbe80000000000000321 | 54.077 | 2.081 | n/a | 0.000 | 3.229 | 1.158 | 0.633 | 0.014 | 0.000 | 0.033 | 46.494 | 0.410 | n/a | 0.025 | 5.310 | 0.098 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.151ms; driver.publication.readback 0.105ms; driver.publication.readback 0.093ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.019ms |
| a1c2a16f4649cbe800000000000001ea | 49.528 | 1.758 | n/a | 0.000 | 5.577 | 2.992 | 6.486 | 0.015 | 0.000 | 0.280 | 31.135 | 1.268 | n/a | 0.017 | 7.336 | 0.148 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.351ms; driver.publication.readback 0.090ms; driver.publication.readback 0.066ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.028ms |
| a1c2a16f4649cbe80000000000000372 | 48.172 | 1.348 | n/a | 0.000 | 30.815 | 0.825 | 1.095 | 0.075 | 0.000 | 0.046 | 12.833 | 1.119 | n/a | 0.015 | 32.163 | 0.668 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.119ms; driver.publication.readback 0.107ms; driver.publication.persist-deferred 0.067ms; driver.publication.readback 0.050ms; driver.publication.readback 0.047ms |
| a1c2a16f4649cbe80000000000000206 | 47.930 | 1.450 | n/a | 0.000 | 33.715 | 1.815 | 1.529 | 0.038 | 0.000 | 0.189 | 8.659 | 0.522 | n/a | 0.013 | 35.166 | 0.734 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.086ms; driver.publication.readback 0.051ms; driver.publication.readback 0.039ms; driver.publication.readback 0.037ms |
| a1c2a16f4649cbe8000000000000029d | 46.395 | 1.762 | n/a | 0.000 | 0.047 | 32.853 | 0.967 | 0.018 | 0.000 | 0.074 | 9.801 | 0.852 | n/a | 0.020 | 1.810 | 0.039 | 0.020 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.057ms |
| a1c2a16f4649cbe8000000000000029e | 45.151 | 1.201 | n/a | 0.000 | 0.028 | 31.993 | 0.678 | 0.010 | 0.000 | 0.099 | 10.680 | 0.446 | n/a | 0.015 | 1.229 | 0.027 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.057ms; driver.publication.persist-deferred 0.017ms |
| a1c2a16f4649cbe800000000000001c7 | 44.844 | 1.613 | n/a | 0.000 | 0.063 | 1.681 | 1.767 | 0.021 | 0.000 | 0.089 | 31.324 | 8.263 | n/a | 0.023 | 1.677 | 0.037 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.020ms |
| a1c2a16f4649cbe80000000000000247 | 44.564 | 3.142 | n/a | 0.000 | 3.010 | 7.540 | 1.728 | 0.020 | 0.000 | 0.171 | 28.567 | 0.351 | n/a | 0.035 | 6.152 | 0.138 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.reader-basis.broadcast 0.062ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.032ms |
| a1c2a16f4649cbe800000000000006f0 | 44.367 | 1.304 | n/a | 0.000 | 18.545 | 0.751 | 0.755 | 0.009 | 0.000 | 0.052 | 18.059 | 4.881 | n/a | 0.011 | 19.849 | 0.447 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms; driver.publication.readback 0.022ms |

## P2 / tail / commit (2567 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.187 | 0.125 | 0.000 | 0.510 | 2.076 | n/a | 0.000 | 0.037 | 0.532 | 0.931 | 0.012 | 0.000 | 0.097 | 4.494 | 0.585 | n/a | 0.014 | 2.361 | 0.241 | 0.014 |
| p99 | 31.807 | 2.235 | 0.044 | 2.068 | 6.989 | n/a | 0.000 | 13.190 | 5.576 | 4.376 | 0.044 | 0.000 | 2.764 | 20.287 | 4.172 | n/a | 0.039 | 15.877 | 0.707 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000001aec | 58.083 | 2.112 | n/a | 0.000 | 26.743 | 0.583 | 1.164 | 0.023 | 0.000 | 0.488 | 26.455 | 0.498 | n/a | 0.017 | 28.854 | 0.497 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.052ms; driver.publication.readback 0.049ms; driver.publication.readback 0.046ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.034ms |
| a1c2a16f4649cbe80000000000001081 | 52.465 | 1.935 | n/a | 0.000 | 38.930 | 0.430 | 0.726 | 0.011 | 0.000 | 0.385 | 8.536 | 1.490 | n/a | 0.022 | 40.865 | 0.779 | 0.022 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.500ms; driver.expected-state.bind-receipt 1.208ms; driver.publication.readback 0.140ms; driver.publication.readback 0.119ms; driver.publication.readback 0.108ms |
| a1c2a16f4649cbe80000000000000e19 | 47.723 | 9.435 | n/a | 0.000 | 1.013 | 7.325 | 5.274 | 0.041 | 0.000 | 0.306 | 22.570 | 1.733 | n/a | 0.025 | 10.448 | 0.219 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.126ms; driver.publication.readback 0.116ms; driver.publication.readback 0.061ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.020ms |
| a1c2a16f4649cbe800000000000018af | 45.541 | 3.766 | n/a | 0.000 | 0.035 | 6.680 | 7.041 | 0.028 | 19.569 | 0.057 | 8.223 | 0.122 | n/a | 0.020 | 3.801 | 0.083 | 0.020 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.244ms; driver.publication.readback 0.123ms; driver.publication.persist-deferred 0.014ms |
| a1c2a16f4649cbe8000000000000172e | 43.379 | 7.579 | n/a | 0.000 | 0.017 | 1.635 | 3.350 | 0.045 | 0.000 | 0.229 | 28.824 | 1.691 | n/a | 0.009 | 7.596 | 0.175 | 0.009 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.031ms |
| a1c2a16f4649cbe80000000000000f64 | 43.095 | 2.513 | n/a | 0.000 | 7.183 | 0.473 | 1.150 | 0.014 | 0.000 | 0.078 | 30.950 | 0.722 | n/a | 0.011 | 9.696 | 0.225 | 0.011 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.120ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.029ms |
| a1c2a16f4649cbe800000000000014b5 | 42.676 | 8.167 | n/a | 0.000 | 19.565 | 2.672 | 4.961 | 0.034 | 0.000 | 0.847 | 5.872 | 0.532 | n/a | 0.025 | 27.732 | 0.650 | 0.025 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.627ms; driver.reader-basis.broadcast 0.208ms; driver.publication.readback 0.138ms; driver.publication.readback 0.117ms; driver.publication.readback 0.049ms |
| a1c2a16f4649cbe800000000000011d9 | 41.598 | 1.612 | n/a | 0.000 | 9.428 | 0.327 | 0.931 | 0.011 | 0.000 | 0.059 | 26.322 | 2.897 | n/a | 0.011 | 11.040 | 0.265 | 0.011 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.207ms; driver.reader-basis.broadcast 0.383ms; driver.publication.readback 0.094ms; driver.publication.readback 0.057ms; driver.publication.readback 0.050ms |
| a1c2a16f4649cbe80000000000001080 | 39.759 | 2.873 | n/a | 0.000 | 26.497 | 0.381 | 0.782 | 0.012 | 0.000 | 0.067 | 6.737 | 2.397 | n/a | 0.012 | 29.370 | 0.739 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.500ms; driver.expected-state.bind-receipt 1.208ms; driver.publication.readback 0.140ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.054ms |
| a1c2a16f4649cbe800000000000018b1 | 38.843 | 3.432 | n/a | 0.000 | 24.796 | 0.380 | 1.157 | 0.012 | 0.000 | 2.925 | 5.157 | 0.973 | n/a | 0.011 | 28.228 | 0.727 | 0.011 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.244ms; driver.publication.readback 0.123ms; driver.publication.persist-deferred 0.014ms |
| a1c2a16f4649cbe80000000000001bf8 | 36.468 | 2.692 | n/a | 0.000 | 0.021 | 0.596 | 1.405 | 0.020 | 0.000 | 2.060 | 29.132 | 0.530 | n/a | 0.013 | 2.712 | 0.074 | 0.013 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.214ms; driver.publication.readback 0.112ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.056ms; driver.publication.persist-deferred 0.014ms |
| a1c2a16f4649cbe800000000000010ea | 35.605 | 2.407 | n/a | 0.000 | 4.222 | 2.546 | 0.783 | 0.014 | 0.000 | 0.258 | 24.195 | 1.158 | n/a | 0.021 | 6.629 | 0.186 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.048ms; driver.publication.persist-deferred 0.018ms |
| a1c2a16f4649cbe800000000000009f9 | 35.458 | 4.032 | n/a | 0.000 | 13.999 | 0.473 | 5.416 | 0.043 | 0.000 | 0.194 | 9.826 | 1.458 | n/a | 0.018 | 18.031 | 0.509 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.024ms |
| a1c2a16f4649cbe80000000000000f66 | 35.304 | 3.253 | n/a | 0.000 | 1.484 | 0.641 | 0.734 | 0.009 | 0.000 | 0.219 | 28.419 | 0.527 | n/a | 0.019 | 4.737 | 0.134 | 0.019 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.120ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.028ms |
| a1c2a16f4649cbe800000000000008a2 | 35.196 | 2.846 | n/a | 0.000 | 4.451 | 6.315 | 0.464 | 0.005 | 0.000 | 0.310 | 14.229 | 6.552 | n/a | 0.024 | 7.297 | 0.207 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.440ms; driver.publication.readback 0.101ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.035ms; driver.publication.readback 0.018ms |
| a1c2a16f4649cbe80000000000000e2a | 34.616 | 9.520 | n/a | 0.930 | 0.042 | 3.745 | 3.376 | 0.050 | 0.000 | 0.241 | 15.828 | 0.867 | n/a | 0.018 | 10.491 | 0.303 | 0.018 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.120ms; driver.publication.readback 0.085ms; driver.publication.readback 0.057ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.015ms |
| a1c2a16f4649cbe80000000000001b08 | 34.205 | 3.156 | n/a | 0.000 | 0.023 | 0.422 | 0.920 | 0.011 | 0.000 | 0.063 | 28.274 | 1.323 | n/a | 0.015 | 3.178 | 0.093 | 0.015 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.220ms |
| a1c2a16f4649cbe80000000000001515 | 33.958 | 4.454 | n/a | 0.000 | 0.011 | 13.627 | 2.412 | 0.043 | 0.000 | 0.205 | 12.381 | 0.818 | n/a | 0.006 | 4.465 | 0.131 | 0.006 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.283ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.046ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.034ms |
| a1c2a16f4649cbe800000000000018b3 | 33.589 | 1.977 | n/a | 0.000 | 22.235 | 0.502 | 0.746 | 0.011 | 0.000 | 0.268 | 7.237 | 0.600 | n/a | 0.013 | 24.212 | 0.721 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.178ms; driver.publication.persist-deferred 0.019ms |
| a1c2a16f4649cbe800000000000010ce | 33.344 | 1.425 | n/a | 0.000 | 23.023 | 0.436 | 0.795 | 0.012 | 0.000 | 0.078 | 6.519 | 1.046 | n/a | 0.010 | 24.448 | 0.733 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.313ms; driver.publication.readback 0.112ms; driver.publication.readback 0.107ms; driver.publication.persist-deferred 0.084ms; driver.publication.readback 0.055ms |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.109 | 0.000 | 0.000 | 0.390 | 1.676 | n/a | 0.000 | 0.038 | 0.536 | 0.804 | 0.011 | 0.000 | 0.097 | 4.206 | 0.460 | n/a | 0.014 | 1.942 | 0.221 | 0.014 |
| p99 | 31.130 | 1.969 | 0.037 | 0.878 | 4.515 | n/a | 0.000 | 14.034 | 5.824 | 3.968 | 0.044 | 0.000 | 2.631 | 18.450 | 3.766 | n/a | 0.042 | 15.828 | 0.707 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1c2a16f4649cbe80000000000001aec | 58.083 | 2.112 | n/a | 0.000 | 26.743 | 0.583 | 1.164 | 0.023 | 0.000 | 0.488 | 26.455 | 0.498 | n/a | 0.017 | 28.854 | 0.497 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.052ms; driver.publication.readback 0.049ms; driver.publication.readback 0.046ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.034ms |
| a1c2a16f4649cbe80000000000001081 | 52.465 | 1.935 | n/a | 0.000 | 38.930 | 0.430 | 0.726 | 0.011 | 0.000 | 0.385 | 8.536 | 1.490 | n/a | 0.022 | 40.865 | 0.779 | 0.022 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.500ms; driver.expected-state.bind-receipt 1.208ms; driver.publication.readback 0.140ms; driver.publication.readback 0.119ms; driver.publication.readback 0.108ms |
| a1c2a16f4649cbe800000000000018af | 45.541 | 3.766 | n/a | 0.000 | 0.035 | 6.680 | 7.041 | 0.028 | 19.569 | 0.057 | 8.223 | 0.122 | n/a | 0.020 | 3.801 | 0.083 | 0.020 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.244ms; driver.publication.readback 0.123ms; driver.publication.persist-deferred 0.014ms |
| a1c2a16f4649cbe800000000000010ea | 35.605 | 2.407 | n/a | 0.000 | 4.222 | 2.546 | 0.783 | 0.014 | 0.000 | 0.258 | 24.195 | 1.158 | n/a | 0.021 | 6.629 | 0.186 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.048ms; driver.publication.persist-deferred 0.018ms |
| a1c2a16f4649cbe80000000000000f66 | 35.304 | 3.253 | n/a | 0.000 | 1.484 | 0.641 | 0.734 | 0.009 | 0.000 | 0.219 | 28.419 | 0.527 | n/a | 0.019 | 4.737 | 0.134 | 0.019 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.120ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.028ms |
| a1c2a16f4649cbe800000000000008a2 | 35.196 | 2.846 | n/a | 0.000 | 4.451 | 6.315 | 0.464 | 0.005 | 0.000 | 0.310 | 14.229 | 6.552 | n/a | 0.024 | 7.297 | 0.207 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.440ms; driver.publication.readback 0.101ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.035ms; driver.publication.readback 0.018ms |
| a1c2a16f4649cbe80000000000001515 | 33.958 | 4.454 | n/a | 0.000 | 0.011 | 13.627 | 2.412 | 0.043 | 0.000 | 0.205 | 12.381 | 0.818 | n/a | 0.006 | 4.465 | 0.131 | 0.006 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.283ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.046ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.034ms |
| a1c2a16f4649cbe800000000000018b3 | 33.589 | 1.977 | n/a | 0.000 | 22.235 | 0.502 | 0.746 | 0.011 | 0.000 | 0.268 | 7.237 | 0.600 | n/a | 0.013 | 24.212 | 0.721 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.178ms; driver.publication.persist-deferred 0.019ms |
| a1c2a16f4649cbe800000000000010ce | 33.344 | 1.425 | n/a | 0.000 | 23.023 | 0.436 | 0.795 | 0.012 | 0.000 | 0.078 | 6.519 | 1.046 | n/a | 0.010 | 24.448 | 0.733 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.313ms; driver.publication.readback 0.112ms; driver.publication.readback 0.107ms; driver.publication.persist-deferred 0.084ms; driver.publication.readback 0.055ms |
| a1c2a16f4649cbe800000000000011dd | 33.273 | 1.306 | n/a | 0.000 | 0.431 | 1.418 | 0.533 | 0.005 | 0.000 | 0.034 | 28.350 | 1.191 | n/a | 0.006 | 1.738 | 0.052 | 0.006 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.207ms; driver.reader-basis.broadcast 0.383ms; driver.publication.readback 0.094ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.029ms |
| a1c2a16f4649cbe8000000000000141c | 33.205 | 1.577 | n/a | 0.000 | 23.384 | 0.378 | 1.018 | 0.021 | 0.000 | 1.423 | 4.953 | 0.441 | n/a | 0.010 | 24.961 | 0.752 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.176ms; driver.publication.readback 0.114ms; driver.publication.readback 0.083ms; driver.publication.readback 0.078ms; driver.publication.readback 0.046ms |
| a1c2a16f4649cbe80000000000001bfb | 33.003 | 1.490 | n/a | 0.000 | 20.170 | 1.062 | 0.701 | 0.011 | 0.000 | 0.956 | 7.621 | 0.982 | n/a | 0.010 | 21.660 | 0.656 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.214ms; driver.publication.readback 0.112ms; driver.publication.readback 0.093ms; driver.publication.readback 0.058ms; driver.publication.readback 0.058ms |
| a1c2a16f4649cbe80000000000001110 | 31.807 | 1.243 | n/a | 0.000 | 5.040 | 0.839 | 0.955 | 0.013 | 0.000 | 0.109 | 23.138 | 0.458 | n/a | 0.012 | 6.283 | 0.198 | 0.012 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.267ms; driver.publication.readback 0.086ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.042ms; driver.publication.persist-deferred 0.026ms |
| a1c2a16f4649cbe80000000000001912 | 31.407 | 1.550 | n/a | 0.000 | 2.687 | 4.325 | 0.666 | 0.005 | 0.000 | 0.122 | 21.493 | 0.552 | n/a | 0.007 | 4.237 | 0.135 | 0.007 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.038ms; driver.publication.readback 0.346ms; driver.reader-basis.broadcast 0.199ms; driver.publication.persist-deferred 0.036ms |
| a1c2a16f4649cbe80000000000001bf9 | 31.330 | 1.208 | n/a | 0.000 | 1.028 | 1.237 | 2.010 | 0.013 | 0.000 | 0.026 | 5.727 | 20.077 | n/a | 0.005 | 2.236 | 0.071 | 0.005 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.214ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.014ms |
| a1c2a16f4649cbe800000000000010c2 | 31.130 | 6.134 | n/a | 0.000 | 0.086 | 7.739 | 2.291 | 0.031 | 0.000 | 0.157 | 13.785 | 0.871 | n/a | 0.035 | 6.220 | 0.200 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.085ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.019ms |
| a1c2a16f4649cbe8000000000000087a | 30.841 | 3.421 | n/a | 0.000 | 8.104 | 5.737 | 0.411 | 0.004 | 0.000 | 0.011 | 12.739 | 0.390 | n/a | 0.024 | 11.525 | 0.374 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.696ms; driver.reader-basis.broadcast 0.170ms; driver.publication.readback 0.132ms; driver.publication.readback 0.053ms; driver.publication.readback 0.043ms |
| a1c2a16f4649cbe800000000000011a7 | 30.607 | 4.938 | n/a | 0.000 | 0.084 | 8.012 | 4.639 | 0.061 | 0.000 | 0.674 | 11.183 | 1.009 | n/a | 0.007 | 5.022 | 0.164 | 0.007 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.076ms; driver.publication.readback 0.074ms; driver.publication.readback 0.071ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.025ms |
| a1c2a16f4649cbe80000000000000cdd | 30.240 | 1.498 | n/a | 0.000 | 17.464 | 0.366 | 1.031 | 0.012 | 0.000 | 0.073 | 7.762 | 2.025 | n/a | 0.010 | 18.961 | 0.627 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.132ms; driver.publication.readback 0.104ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.044ms; driver.publication.readback 0.038ms |
| a1c2a16f4649cbe80000000000000fa0 | 29.635 | 1.427 | n/a | 0.000 | 3.273 | 0.332 | 0.578 | 0.013 | 0.000 | 1.310 | 21.752 | 0.941 | n/a | 0.009 | 4.700 | 0.159 | 0.009 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.113ms; driver.publication.readback 0.048ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.018ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.804 | n/a | n/a | n/a | 0.134 | n/a | 0.000 | 0.000 | 0.962 | 200.399 | 0.009 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.163 | 0.134 | 0.001 | 0.163 |
| p99 | 205.225 | n/a | n/a | n/a | 19.601 | n/a | 1.091 | 0.000 | 6.401 | 200.998 | 0.125 | 13.642 | 3.119 | 0.000 | n/a | n/a | 0.262 | 19.601 | 0.331 | 0.262 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cdd2cf6f6cd22c4e0000000000000005 | 205.225 | 0.053 | n/a | 0.000 | 0.000 | 0.848 | 200.998 | 0.044 | 0.000 | 3.119 | 0.000 | n/a | n/a | 0.163 | 0.053 | 0.000 | 0.163 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000006 | 203.179 | 0.134 | n/a | 0.000 | 0.000 | 1.892 | 200.904 | 0.015 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.104 | 0.134 | 0.001 | 0.104 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000eb3 | 202.008 | 0.057 | n/a | 0.000 | 0.000 | 1.091 | 200.648 | 0.008 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.167 | 0.057 | 0.000 | 0.167 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000eb4 | 201.172 | 0.035 | n/a | 0.000 | 0.000 | 0.489 | 200.513 | 0.015 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.087 | 0.035 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000eb2 | 200.804 | 0.024 | n/a | 0.000 | 0.000 | 0.305 | 200.399 | 0.008 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.051 | 0.024 | 0.000 | 0.051 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000eb8 | 79.879 | 19.601 | n/a | 0.000 | 0.000 | 0.708 | 45.725 | 0.006 | 13.642 | 0.008 | 0.000 | n/a | n/a | 0.188 | 19.601 | 0.245 | 0.188 | gw-r/thread-66/gateway.admitted-work | none observed |
| cdd2cf6f6cd22c4e0000000000000eb7 | 66.257 | 17.970 | n/a | 1.091 | 0.000 | 6.401 | 40.616 | 0.009 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.163 | 19.061 | 0.288 | 0.163 | gw-r/thread-51/gateway.admitted-work | none observed |
| cdd2cf6f6cd22c4e0000000000000eb9 | 56.595 | 18.739 | n/a | 0.000 | 0.000 | 2.635 | 34.948 | 0.006 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.262 | 18.739 | 0.331 | 0.262 | gw-r/thread-50/gateway.admitted-work | none observed |
| 9b83cb91c9bfdf2d0000000000000002 | 52.321 | 0.169 | n/a | 0.000 | 0.000 | 0.962 | 50.731 | 0.125 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.250 | 0.169 | 0.003 | 0.250 | gw-r/thread-47/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1006.409 | n/a | n/a | n/a | 0.247 | n/a | 0.000 | 0.000 | 2.154 | 1001.945 | 0.052 | 0.000 | 0.501 | 0.000 | n/a | n/a | 1.509 | 0.247 | 0.000 | 1.509 |
| p99 | 1006.409 | n/a | n/a | n/a | 0.247 | n/a | 0.000 | 0.000 | 2.154 | 1001.945 | 0.052 | 0.000 | 0.501 | 0.000 | n/a | n/a | 1.509 | 0.247 | 0.000 | 1.509 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b83cb91c9bfdf2d0000000000000017 | 1006.409 | 0.247 | n/a | 0.000 | 0.000 | 2.154 | 1001.945 | 0.052 | 0.000 | 0.501 | 0.000 | n/a | n/a | 1.509 | 0.247 | 0.000 | 1.509 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / internal (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 824.489 | n/a | n/a | n/a | 2.537 | n/a | 0.000 | 0.000 | 1.316 | 805.277 | 0.013 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.174 | 2.537 | 0.005 | 0.174 |
| p99 | 1012.595 | n/a | n/a | n/a | 18.268 | n/a | 1.594 | 0.000 | 10.188 | 1006.041 | 0.048 | 0.000 | 0.545 | 0.000 | n/a | n/a | 1.218 | 18.268 | 0.048 | 1.218 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b83cb91c9bfdf2d0000000000000023 | 1012.595 | 0.356 | n/a | 0.000 | 0.000 | 10.188 | 1000.759 | 0.013 | 0.000 | 0.062 | 0.000 | n/a | n/a | 1.218 | 0.356 | 0.000 | 1.218 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000001d | 1011.465 | 2.537 | n/a | 0.000 | 0.000 | 2.682 | 1006.041 | 0.012 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.086 | 2.537 | 0.003 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000001a | 1008.332 | 0.144 | n/a | 0.000 | 0.000 | 5.075 | 1001.785 | 0.019 | 0.000 | 0.198 | 0.000 | n/a | n/a | 1.110 | 0.144 | 0.000 | 1.110 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000002f | 1005.095 | 0.176 | n/a | 0.000 | 0.000 | 0.983 | 1002.142 | 0.041 | 0.000 | 0.545 | 0.000 | n/a | n/a | 1.209 | 0.176 | 0.000 | 1.209 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000002a | 1003.859 | 0.221 | n/a | 0.000 | 0.000 | 0.731 | 1001.510 | 0.048 | 0.000 | 0.188 | 0.000 | n/a | n/a | 1.161 | 0.221 | 0.000 | 1.161 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000029 | 1003.742 | 0.155 | n/a | 0.000 | 0.000 | 0.964 | 1001.427 | 0.011 | 0.000 | 0.070 | 0.000 | n/a | n/a | 1.115 | 0.155 | 0.000 | 1.115 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000003a | 1003.604 | 0.215 | n/a | 0.000 | 0.000 | 1.455 | 1000.688 | 0.011 | 0.000 | 0.122 | 0.000 | n/a | n/a | 1.113 | 0.215 | 0.000 | 1.113 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000035 | 1002.797 | 0.127 | n/a | 0.000 | 0.000 | 0.838 | 1000.603 | 0.028 | 0.000 | 0.063 | 0.000 | n/a | n/a | 1.139 | 0.127 | 0.000 | 1.139 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000001f | 1002.631 | 0.122 | n/a | 0.000 | 0.000 | 0.487 | 1000.709 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 1.212 | 0.122 | 0.000 | 1.212 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000033 | 946.130 | 4.372 | n/a | 0.484 | 0.000 | 0.910 | 940.158 | 0.012 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.102 | 4.856 | 0.005 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000025 | 880.924 | 5.146 | n/a | 0.000 | 0.000 | 1.316 | 874.191 | 0.018 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.116 | 5.146 | 0.006 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000018 | 824.489 | 18.268 | n/a | 0.000 | 0.000 | 0.593 | 805.277 | 0.017 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.249 | 18.268 | 0.022 | 0.249 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000031 | 658.688 | 3.042 | n/a | 0.332 | 0.000 | 1.597 | 653.480 | 0.011 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.096 | 3.374 | 0.005 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000002b | 478.659 | 2.299 | n/a | 0.000 | 0.000 | 1.534 | 474.603 | 0.012 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.091 | 2.299 | 0.005 | 0.091 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000027 | 441.870 | 5.451 | n/a | 0.000 | 0.000 | 0.741 | 435.299 | 0.023 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.213 | 5.451 | 0.012 | 0.213 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000030 | 363.560 | 5.597 | n/a | 0.000 | 0.000 | 2.587 | 355.140 | 0.010 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.099 | 5.597 | 0.015 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000022 | 293.658 | 3.961 | n/a | 0.000 | 0.000 | 5.533 | 283.897 | 0.011 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.169 | 3.961 | 0.013 | 0.169 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000037 | 278.628 | 12.481 | n/a | 0.779 | 0.000 | 2.325 | 262.855 | 0.018 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.091 | 13.260 | 0.048 | 0.091 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000038 | 265.927 | 2.868 | n/a | 1.594 | 0.000 | 0.696 | 260.587 | 0.012 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.086 | 4.463 | 0.017 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000002c | 254.800 | 4.577 | n/a | 0.000 | 0.000 | 1.644 | 248.252 | 0.023 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.174 | 4.577 | 0.018 | 0.174 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 584.841 | n/a | n/a | n/a | 2.836 | n/a | 0.000 | 0.000 | 0.860 | 574.555 | 0.013 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.134 | 3.375 | 0.008 | 0.134 |
| p99 | 1006.814 | n/a | n/a | n/a | 9.963 | n/a | 1.633 | 0.000 | 5.060 | 1003.772 | 0.088 | 10.041 | 3.847 | 0.000 | n/a | n/a | 2.261 | 10.508 | 0.536 | 2.261 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b83cb91c9bfdf2d0000000000000043 | 1006.814 | 0.122 | n/a | 0.000 | 0.000 | 0.536 | 1001.131 | 0.077 | 0.000 | 3.847 | 0.000 | n/a | n/a | 1.102 | 0.122 | 0.000 | 1.102 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000065 | 1006.690 | 0.191 | n/a | 0.000 | 0.000 | 2.947 | 1001.159 | 0.012 | 0.000 | 0.120 | 0.000 | n/a | n/a | 2.261 | 0.191 | 0.000 | 2.261 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000006f | 1006.676 | 0.138 | n/a | 0.000 | 0.000 | 3.603 | 1001.596 | 0.030 | 0.000 | 0.194 | 0.000 | n/a | n/a | 1.116 | 0.138 | 0.000 | 1.116 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000047 | 1005.571 | 0.105 | n/a | 0.000 | 0.000 | 0.490 | 1003.772 | 0.017 | 0.000 | 0.081 | 0.000 | n/a | n/a | 1.104 | 0.105 | 0.000 | 1.104 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000003d | 1005.191 | 0.122 | n/a | 0.000 | 0.000 | 0.895 | 1002.819 | 0.042 | 0.000 | 0.205 | 0.000 | n/a | n/a | 1.108 | 0.122 | 0.000 | 1.108 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000048 | 1004.524 | 0.249 | n/a | 0.000 | 0.000 | 0.924 | 1001.985 | 0.088 | 0.000 | 0.098 | 0.000 | n/a | n/a | 1.180 | 0.249 | 0.000 | 1.180 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000062 | 1004.087 | 0.167 | n/a | 0.000 | 0.000 | 1.977 | 1000.753 | 0.011 | 0.000 | 0.066 | 0.000 | n/a | n/a | 1.112 | 0.167 | 0.000 | 1.112 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000068 | 1003.930 | 0.215 | n/a | 0.000 | 0.000 | 0.887 | 1001.450 | 0.035 | 0.000 | 0.156 | 0.000 | n/a | n/a | 1.186 | 0.215 | 0.000 | 1.186 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000046 | 1003.101 | 0.152 | n/a | 0.000 | 0.000 | 0.787 | 1000.956 | 0.012 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.121 | 0.152 | 0.000 | 1.121 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000003c | 1003.082 | 0.123 | n/a | 0.000 | 0.000 | 0.699 | 1001.016 | 0.016 | 0.000 | 0.124 | 0.000 | n/a | n/a | 1.104 | 0.123 | 0.000 | 1.104 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000004d | 1003.004 | 0.208 | n/a | 0.000 | 0.000 | 0.716 | 1000.783 | 0.012 | 0.000 | 0.160 | 0.000 | n/a | n/a | 1.125 | 0.208 | 0.000 | 1.125 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000042 | 1002.744 | 0.121 | n/a | 0.000 | 0.000 | 0.478 | 1000.924 | 0.011 | 0.000 | 0.108 | 0.000 | n/a | n/a | 1.101 | 0.121 | 0.000 | 1.101 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000044 | 806.413 | 6.683 | n/a | 0.767 | 0.000 | 0.693 | 798.026 | 0.014 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.134 | 7.450 | 0.009 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000066 | 787.651 | 5.522 | n/a | 0.000 | 0.000 | 1.073 | 780.868 | 0.013 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.098 | 5.522 | 0.007 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000060 | 678.700 | 4.089 | n/a | 0.218 | 0.000 | 1.105 | 673.112 | 0.014 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.078 | 4.307 | 0.006 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000052 | 653.449 | 2.135 | n/a | 0.273 | 0.000 | 0.703 | 650.107 | 0.021 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.091 | 2.408 | 0.004 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000050 | 584.841 | 8.373 | n/a | 1.130 | 0.000 | 0.378 | 574.555 | 0.014 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.323 | 9.503 | 0.016 | 0.323 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000069 | 539.926 | 4.188 | n/a | 0.282 | 0.000 | 1.517 | 533.681 | 0.020 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.104 | 4.471 | 0.008 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000003e | 475.051 | 5.052 | n/a | 0.377 | 0.000 | 0.860 | 468.578 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.081 | 5.430 | 0.011 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000006a | 467.178 | 8.875 | n/a | 1.633 | 0.000 | 0.950 | 455.520 | 0.010 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.149 | 10.508 | 0.022 | 0.149 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / internal (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 763.771 | n/a | n/a | n/a | 2.148 | n/a | 0.000 | 0.000 | 0.778 | 760.387 | 0.011 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.088 | 2.148 | 0.004 | 0.088 |
| p99 | 1004.319 | n/a | n/a | n/a | 11.115 | n/a | 1.881 | 0.000 | 4.271 | 1001.748 | 9.322 | 9.385 | 0.131 | 0.000 | n/a | n/a | 1.130 | 11.576 | 0.198 | 1.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b83cb91c9bfdf2d000000000000007c | 1004.319 | 0.209 | n/a | 0.000 | 0.000 | 2.079 | 1000.792 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 1.130 | 0.209 | 0.000 | 1.130 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000072 | 1003.841 | 0.218 | n/a | 0.000 | 0.000 | 1.709 | 1000.764 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.087 | 0.218 | 0.000 | 1.087 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000090 | 1003.729 | 0.113 | n/a | 0.000 | 0.000 | 0.680 | 1001.748 | 0.014 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.097 | 0.113 | 0.000 | 1.097 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000087 | 1003.136 | 0.145 | n/a | 0.000 | 0.000 | 1.147 | 1000.676 | 0.009 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.116 | 0.145 | 0.000 | 1.116 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000a1 | 1003.045 | 0.123 | n/a | 0.000 | 0.000 | 0.671 | 1001.126 | 0.010 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.063 | 0.123 | 0.000 | 1.063 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000009a | 1002.919 | 0.139 | n/a | 0.000 | 0.000 | 0.574 | 1000.959 | 0.021 | 0.000 | 0.113 | 0.000 | n/a | n/a | 1.112 | 0.139 | 0.000 | 1.112 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000085 | 1002.719 | 0.102 | n/a | 0.000 | 0.000 | 0.498 | 1000.973 | 0.007 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.108 | 0.102 | 0.000 | 1.108 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000089 | 1002.690 | 0.139 | n/a | 0.000 | 0.000 | 0.522 | 1000.852 | 0.013 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.109 | 0.139 | 0.000 | 1.109 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000083 | 1002.581 | 0.143 | n/a | 0.000 | 0.000 | 0.532 | 1000.722 | 0.015 | 0.000 | 0.071 | 0.000 | n/a | n/a | 1.097 | 0.143 | 0.000 | 1.097 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000074 | 1002.530 | 0.120 | n/a | 0.000 | 0.000 | 0.449 | 1000.787 | 0.011 | 0.000 | 0.093 | 0.000 | n/a | n/a | 1.070 | 0.120 | 0.000 | 1.070 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000093 | 1002.310 | 0.150 | n/a | 0.000 | 0.000 | 0.490 | 1000.519 | 0.010 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.109 | 0.150 | 0.000 | 1.109 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000007d | 1001.748 | 0.208 | n/a | 0.000 | 0.000 | 0.688 | 1000.752 | 0.007 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.067 | 0.208 | 0.000 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000094 | 906.383 | 7.675 | n/a | 1.881 | 0.000 | 0.660 | 895.997 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.102 | 9.556 | 0.011 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000008c | 883.242 | 5.786 | n/a | 0.284 | 0.000 | 0.902 | 876.122 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.090 | 6.070 | 0.007 | 0.090 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000070 | 867.803 | 2.601 | n/a | 0.295 | 0.000 | 2.505 | 862.218 | 0.035 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.074 | 2.896 | 0.003 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000098 | 763.771 | 2.148 | n/a | 0.000 | 0.000 | 1.031 | 760.387 | 0.016 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.070 | 2.148 | 0.003 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000096 | 683.764 | 2.668 | n/a | 0.000 | 0.000 | 1.548 | 679.405 | 0.010 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.067 | 2.668 | 0.004 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000008a | 608.614 | 2.376 | n/a | 0.000 | 0.000 | 1.138 | 604.858 | 0.042 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.068 | 2.376 | 0.004 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000009b | 591.347 | 5.091 | n/a | 0.000 | 0.000 | 0.813 | 585.310 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.067 | 5.091 | 0.009 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000082 | 551.150 | 11.115 | n/a | 0.461 | 0.000 | 1.357 | 537.998 | 0.011 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.147 | 11.576 | 0.021 | 0.147 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 807.682 | n/a | n/a | n/a | 1.998 | n/a | 0.000 | 0.000 | 0.683 | 805.059 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.089 | 1.998 | 0.004 | 0.089 |
| p99 | 1003.043 | n/a | n/a | n/a | 13.437 | n/a | 2.517 | 0.000 | 3.657 | 1001.522 | 3.666 | 0.000 | 0.089 | 0.000 | n/a | n/a | 1.164 | 14.023 | 0.674 | 1.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b83cb91c9bfdf2d00000000000000d1 | 1003.043 | 0.175 | n/a | 0.000 | 0.000 | 0.714 | 1000.937 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.164 | 0.175 | 0.000 | 1.164 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000ca | 1002.970 | 0.116 | n/a | 0.000 | 0.000 | 0.953 | 1000.743 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.095 | 0.116 | 0.000 | 1.095 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000d7 | 1002.855 | 0.127 | n/a | 0.000 | 0.000 | 0.458 | 1001.079 | 0.012 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.106 | 0.127 | 0.000 | 1.106 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000cd | 1002.804 | 0.160 | n/a | 0.000 | 0.000 | 0.891 | 1001.522 | 0.008 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.154 | 0.160 | 0.000 | 0.154 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000b8 | 1002.603 | 0.152 | n/a | 0.000 | 0.000 | 0.564 | 1000.726 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.114 | 0.152 | 0.000 | 1.114 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000c0 | 1002.509 | 0.266 | n/a | 0.000 | 0.000 | 0.647 | 1000.443 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.133 | 0.266 | 0.000 | 1.133 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000aa | 1002.502 | 0.112 | n/a | 0.000 | 0.000 | 0.443 | 1000.793 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.095 | 0.112 | 0.000 | 1.095 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000ab | 1002.438 | 0.114 | n/a | 0.000 | 0.000 | 0.479 | 1000.703 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.101 | 0.114 | 0.000 | 1.101 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000d4 | 1002.307 | 0.126 | n/a | 0.000 | 0.000 | 0.406 | 1000.605 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.114 | 0.126 | 0.000 | 1.114 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000d3 | 1002.260 | 0.117 | n/a | 0.000 | 0.000 | 0.578 | 1000.439 | 0.003 | 0.000 | 0.018 | 0.000 | n/a | n/a | 1.106 | 0.117 | 0.000 | 1.106 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000bf | 1002.244 | 0.127 | n/a | 0.000 | 0.000 | 0.397 | 1000.562 | 0.015 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.105 | 0.127 | 0.000 | 1.105 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000c5 | 1002.207 | 0.106 | n/a | 0.000 | 0.000 | 0.404 | 1000.594 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.054 | 0.106 | 0.000 | 1.054 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000a6 | 885.421 | 3.369 | n/a | 0.000 | 0.000 | 1.142 | 880.722 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.123 | 3.369 | 0.004 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000ce | 859.401 | 1.783 | n/a | 0.000 | 0.000 | 1.748 | 855.735 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.062 | 1.783 | 0.002 | 0.062 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000b0 | 848.038 | 2.689 | n/a | 0.000 | 0.000 | 0.363 | 844.873 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.068 | 2.689 | 0.003 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000b9 | 831.865 | 13.437 | n/a | 0.586 | 0.000 | 0.871 | 816.740 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.193 | 14.023 | 0.017 | 0.193 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000c8 | 807.682 | 2.042 | n/a | 0.000 | 0.000 | 0.470 | 805.059 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.062 | 2.042 | 0.003 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000c3 | 610.013 | 2.172 | n/a | 0.000 | 0.000 | 0.683 | 607.046 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.064 | 2.172 | 0.004 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000ba | 516.419 | 3.688 | n/a | 0.000 | 0.000 | 1.034 | 511.596 | 0.002 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.079 | 3.688 | 0.007 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000c6 | 361.355 | 1.895 | n/a | 0.000 | 0.000 | 2.280 | 357.082 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.059 | 1.895 | 0.005 | 0.059 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 427.680 | n/a | n/a | n/a | 2.186 | n/a | 0.000 | 0.000 | 0.674 | 424.997 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.083 | 2.186 | 0.006 | 0.083 |
| p99 | 1005.621 | n/a | n/a | n/a | 7.146 | n/a | 0.387 | 0.000 | 3.952 | 1001.204 | 1.035 | 0.000 | 0.105 | 0.000 | n/a | n/a | 1.147 | 7.519 | 0.123 | 1.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b83cb91c9bfdf2d0000000000000106 | 1005.621 | 0.125 | n/a | 0.000 | 0.000 | 3.596 | 1000.744 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.095 | 0.125 | 0.000 | 1.095 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000116 | 1003.539 | 0.136 | n/a | 0.000 | 0.000 | 1.014 | 1001.204 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.118 | 0.136 | 0.000 | 1.118 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000e4 | 1003.269 | 0.171 | n/a | 0.000 | 0.000 | 0.855 | 1001.046 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.147 | 0.171 | 0.000 | 1.147 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000109 | 1003.035 | 0.123 | n/a | 0.000 | 0.000 | 0.526 | 1001.194 | 0.016 | 0.000 | 0.079 | 0.000 | n/a | n/a | 1.097 | 0.123 | 0.000 | 1.097 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000ef | 1002.848 | 0.200 | n/a | 0.000 | 0.000 | 0.788 | 1000.677 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.141 | 0.200 | 0.000 | 1.141 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000ec | 1002.805 | 0.117 | n/a | 0.000 | 0.000 | 0.674 | 1000.849 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.106 | 0.117 | 0.000 | 1.106 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000108 | 1002.548 | 0.113 | n/a | 0.000 | 0.000 | 0.427 | 1000.806 | 0.041 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.101 | 0.113 | 0.000 | 1.101 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000fb | 1002.276 | 0.115 | n/a | 0.000 | 0.000 | 0.421 | 1000.585 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 1.104 | 0.115 | 0.000 | 1.104 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000ee | 1002.118 | 0.114 | n/a | 0.000 | 0.000 | 0.493 | 1000.385 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 1.109 | 0.114 | 0.000 | 1.109 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000f6 | 886.745 | 4.104 | n/a | 0.000 | 0.000 | 2.141 | 880.395 | 0.006 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.075 | 4.104 | 0.005 | 0.075 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000d8 | 799.915 | 3.576 | n/a | 0.000 | 0.000 | 0.690 | 795.535 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.067 | 3.576 | 0.004 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000e8 | 769.128 | 5.911 | n/a | 0.000 | 0.000 | 1.778 | 761.214 | 0.005 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.167 | 5.911 | 0.008 | 0.167 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000e7 | 769.052 | 4.135 | n/a | 0.000 | 0.000 | 0.785 | 763.993 | 0.006 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.107 | 4.135 | 0.005 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000112 | 723.632 | 4.088 | n/a | 0.387 | 0.000 | 0.416 | 718.540 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.139 | 4.475 | 0.006 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000ff | 598.587 | 2.388 | n/a | 0.000 | 0.000 | 0.480 | 595.617 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.059 | 2.388 | 0.004 | 0.059 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000e5 | 595.672 | 3.406 | n/a | 0.000 | 0.000 | 0.448 | 591.676 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.105 | 3.406 | 0.006 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000df | 578.394 | 1.707 | n/a | 0.000 | 0.000 | 0.757 | 575.776 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.084 | 1.707 | 0.003 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000114 | 567.661 | 2.350 | n/a | 0.000 | 0.000 | 0.538 | 564.601 | 0.016 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.069 | 2.350 | 0.004 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000f0 | 494.923 | 5.056 | n/a | 0.000 | 0.000 | 0.904 | 488.803 | 0.019 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.090 | 5.056 | 0.010 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000000eb | 427.680 | 1.995 | n/a | 0.000 | 0.000 | 0.592 | 424.997 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.071 | 1.995 | 0.005 | 0.071 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 612.769 | n/a | n/a | n/a | 1.903 | n/a | 0.000 | 0.000 | 0.554 | 600.234 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.078 | 1.903 | 0.004 | 0.078 |
| p99 | 1004.835 | n/a | n/a | n/a | 11.427 | n/a | 2.555 | 0.000 | 2.918 | 1001.722 | 0.016 | 24.187 | 0.133 | 0.000 | n/a | n/a | 1.177 | 11.427 | 0.093 | 1.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b83cb91c9bfdf2d000000000000014d | 1004.835 | 0.125 | n/a | 0.000 | 0.000 | 2.918 | 981.889 | 0.007 | 18.748 | 0.036 | 0.000 | n/a | n/a | 1.114 | 0.125 | 0.000 | 1.114 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000011d | 1004.278 | 0.252 | n/a | 0.000 | 0.000 | 0.978 | 1001.722 | 0.016 | 0.000 | 0.133 | 0.000 | n/a | n/a | 1.177 | 0.252 | 0.000 | 1.177 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000128 | 1002.893 | 0.142 | n/a | 0.000 | 0.000 | 0.567 | 1000.997 | 0.010 | 0.000 | 0.071 | 0.000 | n/a | n/a | 1.105 | 0.142 | 0.000 | 1.105 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000134 | 1002.588 | 0.143 | n/a | 0.000 | 0.000 | 0.525 | 1000.742 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.115 | 0.143 | 0.000 | 1.115 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000149 | 1002.573 | 0.122 | n/a | 0.000 | 0.000 | 0.575 | 1000.720 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.095 | 0.122 | 0.000 | 1.095 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000014f | 1002.571 | 0.131 | n/a | 0.000 | 0.000 | 0.599 | 1000.638 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.158 | 0.131 | 0.000 | 1.158 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000139 | 1002.479 | 0.126 | n/a | 0.000 | 0.000 | 0.518 | 1000.665 | 0.006 | 0.000 | 0.062 | 0.000 | n/a | n/a | 1.103 | 0.126 | 0.000 | 1.103 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000014e | 1002.367 | 0.121 | n/a | 0.000 | 0.000 | 0.507 | 1000.601 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.096 | 0.121 | 0.000 | 1.096 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000140 | 1002.364 | 0.147 | n/a | 0.000 | 0.000 | 0.514 | 1000.561 | 0.007 | 0.000 | 0.024 | 0.000 | n/a | n/a | 1.111 | 0.147 | 0.000 | 1.111 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000012c | 1002.195 | 0.118 | n/a | 0.000 | 0.000 | 0.471 | 1000.482 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.098 | 0.118 | 0.000 | 1.098 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000014a | 1002.082 | 0.102 | n/a | 0.000 | 0.000 | 0.437 | 1000.429 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.091 | 0.102 | 0.000 | 1.091 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000013a | 969.007 | 3.265 | n/a | 0.000 | 0.000 | 0.813 | 964.816 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.071 | 3.265 | 0.003 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000013b | 947.756 | 2.712 | n/a | 0.000 | 0.000 | 0.594 | 944.270 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.126 | 2.712 | 0.003 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000129 | 928.131 | 2.388 | n/a | 0.000 | 0.000 | 0.554 | 925.076 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.067 | 2.388 | 0.003 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000132 | 874.573 | 4.634 | n/a | 0.000 | 0.000 | 0.510 | 869.302 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.064 | 4.634 | 0.005 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000124 | 630.822 | 4.455 | n/a | 0.000 | 0.000 | 1.826 | 600.234 | 0.007 | 24.187 | 0.048 | 0.000 | n/a | n/a | 0.065 | 4.455 | 0.007 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000011a | 612.769 | 1.779 | n/a | 0.000 | 0.000 | 0.602 | 610.258 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.062 | 1.779 | 0.003 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000130 | 581.944 | 2.211 | n/a | 0.000 | 0.000 | 0.442 | 579.166 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.070 | 2.211 | 0.004 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000014b | 520.360 | 11.427 | n/a | 0.000 | 0.000 | 0.675 | 508.120 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.105 | 11.427 | 0.022 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000122 | 467.076 | 4.331 | n/a | 2.555 | 0.000 | 0.563 | 459.479 | 0.011 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.082 | 6.886 | 0.015 | 0.082 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / internal (739 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.966 | n/a | n/a | n/a | 3.191 | n/a | 0.000 | 0.000 | 0.540 | 9.162 | 0.004 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.082 | 3.193 | 0.265 | 0.082 |
| p99 | 113.314 | n/a | n/a | n/a | 12.491 | n/a | 0.664 | 0.000 | 4.037 | 102.945 | 0.017 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.699 | 13.214 | 0.862 | 0.699 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b83cb91c9bfdf2d0000000000000157 | 1008.766 | 0.133 | n/a | 0.000 | 0.000 | 0.520 | 1006.973 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.104 | 0.133 | 0.000 | 1.104 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000159 | 1002.274 | 0.187 | n/a | 0.000 | 0.000 | 0.468 | 1000.446 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.149 | 0.187 | 0.000 | 1.149 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000151 | 847.154 | 2.162 | n/a | 0.000 | 0.000 | 0.534 | 844.359 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.068 | 2.162 | 0.003 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000150 | 839.408 | 4.032 | n/a | 0.000 | 0.000 | 1.044 | 834.127 | 0.017 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.115 | 4.032 | 0.005 | 0.115 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000155 | 777.806 | 2.087 | n/a | 0.000 | 0.000 | 0.693 | 774.891 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.072 | 2.087 | 0.003 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000154 | 254.310 | 3.446 | n/a | 0.000 | 0.000 | 0.728 | 250.028 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.066 | 3.446 | 0.014 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000015a | 170.930 | 2.418 | n/a | 0.000 | 0.000 | 0.403 | 166.656 | 1.369 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.075 | 2.418 | 0.014 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000415 | 113.314 | 9.234 | n/a | 0.512 | 0.000 | 0.449 | 102.945 | 0.003 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.152 | 9.746 | 0.086 | 0.152 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000021f | 100.285 | 6.475 | n/a | 0.000 | 0.000 | 1.067 | 92.519 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.164 | 6.475 | 0.065 | 0.164 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000519 | 93.139 | 4.663 | n/a | 0.000 | 0.000 | 0.421 | 87.954 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.079 | 4.663 | 0.050 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000006c7 | 91.575 | 5.337 | n/a | 0.000 | 0.000 | 0.743 | 85.309 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.134 | 5.337 | 0.058 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000023c | 90.853 | 2.461 | n/a | 0.000 | 0.000 | 0.585 | 87.710 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.073 | 2.461 | 0.027 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000397 | 86.628 | 3.130 | n/a | 0.000 | 0.000 | 0.313 | 83.109 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.057 | 3.130 | 0.036 | 0.057 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000683 | 84.927 | 3.384 | n/a | 0.000 | 0.000 | 0.495 | 80.957 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.076 | 3.384 | 0.040 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000041d | 84.425 | 2.333 | n/a | 0.000 | 0.000 | 0.543 | 81.410 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.084 | 2.333 | 0.028 | 0.084 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000074d | 83.445 | 6.716 | n/a | 0.000 | 0.000 | 0.331 | 76.192 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.160 | 6.716 | 0.080 | 0.160 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000691 | 79.862 | 6.270 | n/a | 0.000 | 0.000 | 0.529 | 72.890 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.141 | 6.270 | 0.079 | 0.141 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000006a0 | 79.072 | 9.999 | n/a | 0.000 | 0.000 | 0.588 | 68.327 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.120 | 9.999 | 0.126 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000594 | 78.101 | 5.825 | n/a | 0.468 | 0.000 | 0.310 | 71.354 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.133 | 6.293 | 0.081 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000000716 | 75.613 | 1.460 | n/a | 0.000 | 0.000 | 0.307 | 73.776 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.050 | 1.460 | 0.019 | 0.050 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / internal (2240 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.722 | n/a | n/a | n/a | 4.628 | n/a | 0.000 | 0.000 | 0.469 | 6.995 | 0.004 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.129 | 4.680 | 0.373 | 0.129 |
| p99 | 351.196 | n/a | n/a | n/a | 19.086 | n/a | 1.252 | 0.000 | 4.348 | 339.909 | 0.017 | 10.426 | 0.044 | 0.000 | n/a | n/a | 1.645 | 20.174 | 0.859 | 1.645 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b83cb91c9bfdf2d00000000000019c5 | 1005.206 | 0.193 | n/a | 0.000 | 0.000 | 0.465 | 1000.917 | 0.014 | 0.000 | 0.061 | 0.000 | n/a | n/a | 3.556 | 0.193 | 0.000 | 3.556 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019d1 | 1004.487 | 0.104 | n/a | 0.000 | 0.000 | 2.338 | 1000.879 | 0.012 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.096 | 0.104 | 0.000 | 1.096 | gw-r/thread-66/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000001992 | 1003.333 | 0.310 | n/a | 0.000 | 0.000 | 0.731 | 1001.094 | 0.012 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.146 | 0.310 | 0.000 | 1.146 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d000000000000198e | 1002.765 | 0.121 | n/a | 0.000 | 0.000 | 0.595 | 1000.881 | 0.014 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.098 | 0.121 | 0.000 | 1.098 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019af | 1002.736 | 0.156 | n/a | 0.000 | 0.000 | 0.493 | 1000.893 | 0.013 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.126 | 0.156 | 0.000 | 1.126 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019cc | 1002.562 | 0.145 | n/a | 0.000 | 0.000 | 0.628 | 1000.637 | 0.011 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.097 | 0.145 | 0.000 | 1.097 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000001990 | 1002.342 | 0.205 | n/a | 0.000 | 0.000 | 0.508 | 1000.485 | 0.004 | 0.000 | 0.019 | 0.000 | n/a | n/a | 1.122 | 0.205 | 0.000 | 1.122 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000001997 | 1002.213 | 0.196 | n/a | 0.000 | 0.000 | 0.510 | 1000.351 | 0.006 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.131 | 0.196 | 0.000 | 1.131 | gw-r/thread-51/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019ad | 1002.151 | 0.110 | n/a | 0.000 | 0.000 | 0.347 | 1000.563 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.086 | 0.110 | 0.000 | 1.086 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019c9 | 1001.919 | 0.099 | n/a | 0.000 | 0.000 | 0.351 | 1000.362 | 0.005 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.084 | 0.099 | 0.000 | 1.084 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019a0 | 975.358 | 9.739 | n/a | 0.000 | 0.000 | 0.650 | 964.607 | 0.018 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.306 | 9.739 | 0.010 | 0.306 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019bc | 919.046 | 3.115 | n/a | 0.000 | 0.000 | 0.449 | 915.396 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.059 | 3.115 | 0.003 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000001991 | 798.580 | 9.420 | n/a | 0.000 | 0.000 | 0.599 | 788.063 | 0.009 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.460 | 9.420 | 0.012 | 0.460 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019cb | 728.791 | 5.659 | n/a | 0.000 | 0.000 | 0.725 | 722.164 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.203 | 5.659 | 0.008 | 0.203 | gw-r/thread-48/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019aa | 715.147 | 3.423 | n/a | 0.000 | 0.000 | 0.316 | 711.214 | 0.011 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.148 | 3.423 | 0.005 | 0.148 | gw-r/thread-46/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019a7 | 692.121 | 13.096 | n/a | 0.844 | 0.000 | 0.459 | 677.040 | 0.012 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.638 | 13.941 | 0.020 | 0.638 | gw-r/thread-49/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019c0 | 631.924 | 6.989 | n/a | 0.000 | 0.000 | 0.669 | 624.044 | 0.006 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.196 | 6.989 | 0.011 | 0.196 | gw-r/thread-47/journal/page | none observed |
| 9b83cb91c9bfdf2d0000000000001999 | 622.233 | 2.715 | n/a | 0.000 | 0.000 | 0.604 | 618.753 | 0.006 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.135 | 2.715 | 0.004 | 0.135 | gw-r/thread-50/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019ce | 462.362 | 8.425 | n/a | 6.317 | 0.000 | 0.574 | 446.776 | 0.009 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.229 | 14.742 | 0.032 | 0.229 | gw-r/thread-66/journal/page | none observed |
| 9b83cb91c9bfdf2d00000000000019c7 | 458.334 | 2.083 | n/a | 0.000 | 0.000 | 0.298 | 455.877 | 0.004 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.061 | 2.083 | 0.005 | 0.061 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (69 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.906 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 1.062 | 201.252 | 0.016 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.087 | 0.040 | 0.000 | 0.087 |
| p99 | 209.240 | n/a | n/a | n/a | 0.130 | n/a | 0.000 | 0.000 | 4.259 | 207.129 | 9.334 | 12.710 | 0.923 | 0.000 | n/a | n/a | 0.260 | 0.130 | 0.001 | 0.260 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cdd2cf6f6cd22c4e0000000000000009 | 209.240 | 0.034 | n/a | 0.000 | 0.000 | 1.631 | 207.129 | 0.017 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.260 | 0.034 | 0.000 | 0.260 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000003f | 208.870 | 0.056 | n/a | 0.000 | 0.000 | 3.355 | 205.077 | 0.013 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.171 | 0.056 | 0.000 | 0.171 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000002d | 207.922 | 0.029 | n/a | 0.000 | 0.000 | 1.461 | 206.132 | 0.020 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.079 | 0.029 | 0.000 | 0.079 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000001f | 207.051 | 0.033 | n/a | 0.000 | 0.000 | 1.376 | 205.261 | 0.030 | 0.000 | 0.274 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000012 | 206.563 | 0.038 | n/a | 0.000 | 0.000 | 3.718 | 202.402 | 0.018 | 0.000 | 0.302 | 0.000 | n/a | n/a | 0.085 | 0.038 | 0.000 | 0.085 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000008 | 206.110 | 0.073 | n/a | 0.000 | 0.000 | 2.311 | 203.378 | 0.014 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.190 | 0.073 | 0.000 | 0.190 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000018 | 205.764 | 0.033 | n/a | 0.000 | 0.000 | 2.092 | 202.606 | 0.028 | 0.000 | 0.923 | 0.000 | n/a | n/a | 0.083 | 0.033 | 0.000 | 0.083 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000023 | 205.231 | 0.031 | n/a | 0.000 | 0.000 | 4.259 | 200.761 | 0.010 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000022 | 205.208 | 0.047 | n/a | 0.000 | 0.000 | 4.013 | 200.900 | 0.013 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.105 | 0.047 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000002c | 205.200 | 0.032 | n/a | 0.000 | 0.000 | 3.810 | 201.113 | 0.012 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.081 | 0.032 | 0.000 | 0.081 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000000c | 205.165 | 0.037 | n/a | 0.000 | 0.000 | 1.223 | 203.393 | 0.026 | 0.000 | 0.388 | 0.000 | n/a | n/a | 0.099 | 0.037 | 0.000 | 0.099 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000042 | 205.144 | 0.063 | n/a | 0.000 | 0.000 | 0.875 | 203.826 | 0.021 | 0.000 | 0.211 | 0.000 | n/a | n/a | 0.148 | 0.063 | 0.000 | 0.148 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000007 | 204.905 | 0.059 | n/a | 0.000 | 0.000 | 1.259 | 202.993 | 0.050 | 0.000 | 0.317 | 0.000 | n/a | n/a | 0.228 | 0.059 | 0.000 | 0.228 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000041 | 204.495 | 0.060 | n/a | 0.000 | 0.000 | 0.902 | 203.364 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.106 | 0.060 | 0.000 | 0.106 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000003c | 204.482 | 0.052 | n/a | 0.000 | 0.000 | 3.064 | 201.112 | 0.012 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.128 | 0.052 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000001c | 204.230 | 0.050 | n/a | 0.000 | 0.000 | 1.281 | 202.560 | 0.014 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.128 | 0.050 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000013 | 204.220 | 0.045 | n/a | 0.000 | 0.000 | 2.769 | 201.147 | 0.019 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.087 | 0.045 | 0.000 | 0.087 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000000b | 204.028 | 0.039 | n/a | 0.000 | 0.000 | 0.982 | 202.781 | 0.016 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.090 | 0.039 | 0.000 | 0.090 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000045 | 203.995 | 0.073 | n/a | 0.000 | 0.000 | 1.672 | 201.860 | 0.020 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.196 | 0.073 | 0.000 | 0.196 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000014 | 203.919 | 0.130 | n/a | 0.000 | 0.000 | 1.548 | 201.959 | 0.021 | 0.000 | 0.208 | 0.000 | n/a | n/a | 0.053 | 0.130 | 0.001 | 0.053 | gw-r/thread-51/journal/page | none observed |

## P3 / L1 / read (84 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.202 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.873 | 201.009 | 0.013 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.084 | 0.039 | 0.000 | 0.084 |
| p99 | 218.881 | n/a | n/a | n/a | 0.109 | n/a | 0.000 | 0.000 | 5.361 | 217.810 | 30.963 | 10.041 | 3.840 | 0.000 | n/a | n/a | 0.193 | 0.109 | 0.001 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cdd2cf6f6cd22c4e000000000000006d | 218.881 | 0.025 | n/a | 0.000 | 0.000 | 0.836 | 217.810 | 0.034 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.063 | 0.025 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000086 | 207.157 | 0.040 | n/a | 0.000 | 0.000 | 5.361 | 201.473 | 0.024 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.081 | 0.040 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000079 | 207.107 | 0.045 | n/a | 0.000 | 0.000 | 1.489 | 205.282 | 0.022 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.098 | 0.045 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000071 | 206.659 | 0.054 | n/a | 0.000 | 0.000 | 4.792 | 201.414 | 0.020 | 0.000 | 0.221 | 0.000 | n/a | n/a | 0.158 | 0.054 | 0.000 | 0.158 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000008b | 205.646 | 0.039 | n/a | 0.000 | 0.000 | 1.910 | 202.537 | 1.052 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.063 | 0.039 | 0.000 | 0.063 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000056 | 205.607 | 0.039 | n/a | 0.000 | 0.000 | 0.551 | 204.684 | 0.021 | 0.000 | 0.229 | 0.000 | n/a | n/a | 0.084 | 0.039 | 0.000 | 0.084 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000005d | 205.536 | 0.040 | n/a | 0.000 | 0.000 | 0.680 | 200.847 | 0.017 | 0.000 | 3.840 | 0.000 | n/a | n/a | 0.113 | 0.040 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000af | 205.488 | 0.037 | n/a | 0.000 | 0.000 | 0.769 | 201.066 | 3.354 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.086 | 0.037 | 0.000 | 0.086 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000006a | 205.046 | 0.045 | n/a | 0.000 | 0.000 | 1.720 | 203.015 | 0.013 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.133 | 0.045 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000a5 | 204.904 | 0.044 | n/a | 0.000 | 0.000 | 3.453 | 201.186 | 0.014 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.094 | 0.044 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000007c | 204.645 | 0.029 | n/a | 0.000 | 0.000 | 1.799 | 202.570 | 0.020 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.070 | 0.029 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000a8 | 204.405 | 0.031 | n/a | 0.000 | 0.000 | 0.859 | 203.219 | 0.023 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000007b | 204.266 | 0.031 | n/a | 0.000 | 0.000 | 1.468 | 202.333 | 0.028 | 0.000 | 0.331 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000096 | 204.205 | 0.060 | n/a | 0.000 | 0.000 | 0.743 | 203.043 | 0.051 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.159 | 0.060 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000090 | 203.967 | 0.042 | n/a | 0.000 | 0.000 | 2.712 | 200.965 | 0.013 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.116 | 0.042 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000054 | 203.961 | 0.061 | n/a | 0.000 | 0.000 | 2.738 | 200.875 | 0.013 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.164 | 0.061 | 0.000 | 0.164 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000059 | 203.781 | 0.029 | n/a | 0.000 | 0.000 | 1.054 | 200.771 | 0.012 | 0.000 | 1.840 | 0.000 | n/a | n/a | 0.075 | 0.029 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000089 | 203.641 | 0.032 | n/a | 0.000 | 0.000 | 0.844 | 202.432 | 0.039 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.084 | 0.032 | 0.000 | 0.084 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000009b | 203.547 | 0.053 | n/a | 0.000 | 0.000 | 1.258 | 201.871 | 0.043 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.160 | 0.053 | 0.000 | 0.160 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000074 | 203.505 | 0.042 | n/a | 0.000 | 0.000 | 1.281 | 201.886 | 0.014 | 0.000 | 0.187 | 0.000 | n/a | n/a | 0.095 | 0.042 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / read (83 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.026 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.788 | 200.998 | 0.012 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.086 | 0.037 | 0.000 | 0.086 |
| p99 | 207.001 | n/a | n/a | n/a | 0.104 | n/a | 0.000 | 0.000 | 5.856 | 205.068 | 7.430 | 0.000 | 0.222 | 0.000 | n/a | n/a | 0.195 | 0.104 | 0.001 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cdd2cf6f6cd22c4e00000000000000b7 | 207.001 | 0.033 | n/a | 0.000 | 0.000 | 5.856 | 200.914 | 0.012 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.075 | 0.033 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000f5 | 206.467 | 0.040 | n/a | 0.000 | 0.000 | 2.242 | 203.938 | 0.024 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.107 | 0.040 | 0.000 | 0.107 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000e5 | 206.202 | 0.042 | n/a | 0.000 | 0.000 | 0.744 | 205.068 | 0.022 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.151 | 0.042 | 0.000 | 0.151 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000db | 205.911 | 0.043 | n/a | 0.000 | 0.000 | 1.169 | 204.445 | 0.014 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.096 | 0.043 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000cd | 205.757 | 0.031 | n/a | 0.000 | 0.000 | 0.809 | 204.722 | 0.014 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.082 | 0.031 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000d7 | 205.347 | 0.051 | n/a | 0.000 | 0.000 | 1.222 | 203.814 | 0.015 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.141 | 0.051 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000c7 | 204.953 | 0.048 | n/a | 0.000 | 0.000 | 1.121 | 203.408 | 0.024 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.158 | 0.048 | 0.000 | 0.158 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000d1 | 204.288 | 0.046 | n/a | 0.000 | 0.000 | 0.451 | 203.477 | 0.049 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.126 | 0.046 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000f6 | 204.277 | 0.033 | n/a | 0.000 | 0.000 | 3.244 | 200.812 | 0.010 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000c8 | 203.996 | 0.044 | n/a | 0.000 | 0.000 | 1.145 | 202.592 | 0.011 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.097 | 0.044 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000e4 | 203.583 | 0.032 | n/a | 0.000 | 0.000 | 0.630 | 202.604 | 0.018 | 0.000 | 0.220 | 0.000 | n/a | n/a | 0.078 | 0.032 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000df | 203.543 | 0.031 | n/a | 0.000 | 0.000 | 0.486 | 202.852 | 0.010 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000105 | 203.206 | 0.023 | n/a | 0.000 | 0.000 | 0.952 | 201.933 | 0.064 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.057 | 0.023 | 0.000 | 0.057 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000010f | 203.182 | 0.047 | n/a | 0.000 | 0.000 | 0.806 | 201.983 | 0.021 | 0.000 | 0.222 | 0.000 | n/a | n/a | 0.102 | 0.047 | 0.000 | 0.102 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000e6 | 203.145 | 0.055 | n/a | 0.000 | 0.000 | 0.918 | 201.811 | 0.018 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.172 | 0.055 | 0.000 | 0.172 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000dd | 203.099 | 0.050 | n/a | 0.000 | 0.000 | 0.803 | 202.036 | 0.010 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.127 | 0.050 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000d5 | 202.945 | 0.036 | n/a | 0.000 | 0.000 | 1.027 | 201.635 | 0.012 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.088 | 0.036 | 0.000 | 0.088 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000f2 | 202.927 | 0.033 | n/a | 0.000 | 0.000 | 0.850 | 201.728 | 0.039 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.079 | 0.033 | 0.000 | 0.079 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000b9 | 202.913 | 0.051 | n/a | 0.000 | 0.000 | 1.294 | 201.256 | 0.012 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.154 | 0.051 | 0.000 | 0.154 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000000e7 | 202.865 | 0.035 | n/a | 0.000 | 0.000 | 0.812 | 201.815 | 0.012 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (85 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.949 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.740 | 200.963 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.081 | 0.038 | 0.000 | 0.081 |
| p99 | 210.160 | n/a | n/a | n/a | 0.091 | n/a | 0.000 | 0.000 | 5.764 | 209.171 | 9.193 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.836 | 0.091 | 0.001 | 0.836 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cdd2cf6f6cd22c4e0000000000000140 | 210.160 | 0.037 | n/a | 0.000 | 0.000 | 0.799 | 209.171 | 0.006 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000015b | 207.048 | 0.031 | n/a | 0.000 | 0.000 | 5.764 | 201.114 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000118 | 206.162 | 0.043 | n/a | 0.000 | 0.000 | 1.196 | 204.686 | 0.013 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.093 | 0.043 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000011b | 206.053 | 0.031 | n/a | 0.000 | 0.000 | 4.470 | 201.331 | 0.010 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000151 | 205.921 | 0.032 | n/a | 0.000 | 0.000 | 0.761 | 204.962 | 0.013 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.062 | 0.032 | 0.000 | 0.062 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000145 | 205.837 | 0.029 | n/a | 0.000 | 0.000 | 0.898 | 204.731 | 0.008 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.073 | 0.029 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000013d | 205.162 | 0.039 | n/a | 0.000 | 0.000 | 0.463 | 204.522 | 0.014 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.082 | 0.039 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000139 | 204.364 | 0.034 | n/a | 0.000 | 0.000 | 3.438 | 200.770 | 0.008 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.082 | 0.034 | 0.000 | 0.082 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000169 | 204.016 | 0.037 | n/a | 0.000 | 0.000 | 0.641 | 203.196 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.088 | 0.037 | 0.000 | 0.088 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000135 | 203.851 | 0.034 | n/a | 0.000 | 0.000 | 0.642 | 203.001 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000128 | 203.842 | 0.070 | n/a | 0.000 | 0.000 | 1.106 | 202.282 | 0.010 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.245 | 0.070 | 0.000 | 0.245 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000113 | 203.827 | 0.030 | n/a | 0.000 | 0.000 | 0.604 | 202.953 | 0.016 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.076 | 0.030 | 0.000 | 0.076 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000138 | 203.808 | 0.038 | n/a | 0.000 | 0.000 | 0.860 | 202.734 | 0.007 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.087 | 0.038 | 0.000 | 0.087 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000014c | 203.688 | 0.033 | n/a | 0.000 | 0.000 | 0.750 | 202.712 | 0.012 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000132 | 203.557 | 0.031 | n/a | 0.000 | 0.000 | 0.523 | 202.855 | 0.028 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000148 | 203.422 | 0.041 | n/a | 0.000 | 0.000 | 0.611 | 202.606 | 0.015 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.092 | 0.041 | 0.000 | 0.092 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000016a | 203.311 | 0.049 | n/a | 0.000 | 0.000 | 1.141 | 201.212 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.836 | 0.049 | 0.000 | 0.836 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000124 | 203.270 | 0.039 | n/a | 0.000 | 0.000 | 2.314 | 200.771 | 0.007 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.073 | 0.039 | 0.000 | 0.073 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000012f | 203.110 | 0.055 | n/a | 0.000 | 0.000 | 1.054 | 201.766 | 0.010 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.143 | 0.055 | 0.000 | 0.143 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000159 | 203.096 | 0.027 | n/a | 0.000 | 0.000 | 1.282 | 201.653 | 0.005 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.061 | 0.027 | 0.000 | 0.061 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.662 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.682 | 200.776 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 |
| p99 | 205.666 | n/a | n/a | n/a | 0.122 | n/a | 0.000 | 0.000 | 4.241 | 201.695 | 3.657 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.217 | 0.122 | 0.006 | 0.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cdd2cf6f6cd22c4e0000000000000181 | 206.271 | 0.029 | n/a | 0.000 | 0.000 | 0.417 | 205.656 | 0.005 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000196 | 205.666 | 0.034 | n/a | 0.000 | 0.000 | 4.694 | 200.805 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.073 | 0.034 | 0.000 | 0.073 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001b6 | 205.077 | 0.029 | n/a | 0.000 | 0.000 | 4.241 | 200.702 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001a2 | 204.789 | 0.031 | n/a | 0.000 | 0.000 | 3.912 | 200.711 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000194 | 204.244 | 0.064 | n/a | 0.000 | 0.000 | 3.566 | 200.511 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.078 | 0.064 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000018b | 202.996 | 0.077 | n/a | 0.000 | 0.000 | 1.260 | 201.283 | 0.009 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.278 | 0.077 | 0.000 | 0.278 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001b0 | 202.967 | 0.043 | n/a | 0.000 | 0.000 | 2.192 | 200.586 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.107 | 0.043 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001bc | 202.909 | 0.081 | n/a | 0.000 | 0.000 | 1.267 | 201.239 | 0.012 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.216 | 0.081 | 0.000 | 0.216 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001d0 | 202.717 | 0.040 | n/a | 0.000 | 0.000 | 1.489 | 201.018 | 0.007 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.089 | 0.040 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000189 | 202.684 | 0.054 | n/a | 0.000 | 0.000 | 0.815 | 201.621 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.136 | 0.054 | 0.000 | 0.136 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000019b | 202.663 | 0.047 | n/a | 0.000 | 0.000 | 0.702 | 201.695 | 0.014 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.106 | 0.047 | 0.000 | 0.106 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000171 | 202.591 | 0.040 | n/a | 0.000 | 0.000 | 0.768 | 201.595 | 0.011 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.088 | 0.040 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001a3 | 202.392 | 0.033 | n/a | 0.000 | 0.000 | 0.773 | 201.388 | 0.011 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.083 | 0.033 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000191 | 202.364 | 0.059 | n/a | 0.000 | 0.000 | 0.841 | 201.163 | 0.011 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.214 | 0.059 | 0.000 | 0.214 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001cd | 202.363 | 0.024 | n/a | 0.000 | 0.000 | 1.012 | 201.180 | 0.006 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.058 | 0.024 | 0.000 | 0.058 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000195 | 202.273 | 0.061 | n/a | 0.000 | 0.000 | 1.071 | 200.911 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.170 | 0.061 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001a5 | 202.268 | 0.028 | n/a | 0.000 | 0.000 | 0.838 | 201.289 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.065 | 0.028 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001bd | 202.216 | 0.032 | n/a | 0.000 | 0.000 | 0.737 | 201.251 | 0.011 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.074 | 0.032 | 0.000 | 0.074 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000170 | 202.183 | 0.053 | n/a | 0.000 | 0.000 | 1.110 | 200.851 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.114 | 0.053 | 0.000 | 0.114 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000193 | 202.177 | 0.042 | n/a | 0.000 | 0.000 | 0.906 | 201.013 | 0.006 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.111 | 0.042 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.525 | n/a | n/a | n/a | 0.035 | n/a | 0.000 | 0.000 | 0.619 | 200.729 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.073 | 0.035 | 0.000 | 0.073 |
| p99 | 224.132 | n/a | n/a | n/a | 0.100 | n/a | 0.000 | 0.000 | 4.290 | 210.125 | 40.950 | 18.748 | 3.758 | 0.000 | n/a | n/a | 0.178 | 0.100 | 0.001 | 0.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cdd2cf6f6cd22c4e0000000000000233 | 224.132 | 0.032 | n/a | 0.000 | 0.000 | 0.542 | 204.677 | 0.006 | 18.748 | 0.055 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001e8 | 212.849 | 0.059 | n/a | 0.000 | 0.000 | 2.404 | 210.125 | 0.016 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.134 | 0.059 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000235 | 207.487 | 0.048 | n/a | 0.000 | 0.000 | 0.781 | 202.761 | 0.032 | 0.000 | 3.758 | 0.000 | n/a | n/a | 0.106 | 0.048 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000201 | 205.469 | 0.041 | n/a | 0.000 | 0.000 | 4.290 | 201.017 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.075 | 0.041 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001e6 | 204.983 | 0.043 | n/a | 0.000 | 0.000 | 3.637 | 201.132 | 0.011 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.079 | 0.043 | 0.000 | 0.079 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000232 | 204.872 | 0.032 | n/a | 0.000 | 0.000 | 0.496 | 204.203 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.064 | 0.032 | 0.000 | 0.064 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000210 | 204.579 | 0.028 | n/a | 0.000 | 0.000 | 3.633 | 200.802 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.061 | 0.028 | 0.000 | 0.061 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000208 | 202.936 | 0.025 | n/a | 0.000 | 0.000 | 1.178 | 201.563 | 0.009 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.057 | 0.025 | 0.000 | 0.057 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001e5 | 202.751 | 0.034 | n/a | 0.000 | 0.000 | 1.301 | 201.285 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.064 | 0.034 | 0.000 | 0.064 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000207 | 202.736 | 0.048 | n/a | 0.000 | 0.000 | 0.753 | 201.693 | 0.017 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.111 | 0.048 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000202 | 202.692 | 0.029 | n/a | 0.000 | 0.000 | 1.170 | 201.337 | 0.008 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000213 | 202.633 | 0.042 | n/a | 0.000 | 0.000 | 1.134 | 201.297 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.087 | 0.042 | 0.000 | 0.087 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000228 | 202.462 | 0.035 | n/a | 0.000 | 0.000 | 0.648 | 201.604 | 0.012 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001ed | 202.308 | 0.027 | n/a | 0.000 | 0.000 | 0.837 | 201.266 | 0.011 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.060 | 0.027 | 0.000 | 0.060 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001f0 | 202.243 | 0.030 | n/a | 0.000 | 0.000 | 0.751 | 201.289 | 0.010 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000204 | 202.182 | 0.039 | n/a | 0.000 | 0.000 | 0.573 | 201.416 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.068 | 0.039 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000020e | 202.161 | 0.026 | n/a | 0.000 | 0.000 | 0.747 | 201.229 | 0.009 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.065 | 0.026 | 0.000 | 0.065 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000220 | 202.114 | 0.038 | n/a | 0.000 | 0.000 | 0.842 | 201.064 | 0.009 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.084 | 0.038 | 0.000 | 0.084 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e00000000000001df | 202.098 | 0.040 | n/a | 0.000 | 0.000 | 0.521 | 201.321 | 0.017 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.094 | 0.040 | 0.000 | 0.094 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000022f | 202.088 | 0.067 | n/a | 0.000 | 0.000 | 1.004 | 200.787 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.178 | 0.067 | 0.000 | 0.178 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (65 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 75.295 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 0.571 | 72.897 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.067 | 0.045 | 0.001 | 0.067 |
| p99 | 205.636 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 0.000 | 3.563 | 203.212 | 2.080 | 17.237 | 0.169 | 0.000 | n/a | n/a | 0.158 | 0.088 | 0.001 | 0.158 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cdd2cf6f6cd22c4e000000000000024e | 205.636 | 0.036 | n/a | 0.000 | 0.000 | 2.247 | 203.212 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.079 | 0.036 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000024a | 203.933 | 0.035 | n/a | 0.000 | 0.000 | 0.579 | 203.182 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.072 | 0.035 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000242 | 202.626 | 0.031 | n/a | 0.000 | 0.000 | 0.646 | 201.708 | 0.012 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.060 | 0.031 | 0.000 | 0.060 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000246 | 202.438 | 0.030 | n/a | 0.000 | 0.000 | 0.895 | 201.309 | 0.009 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000023f | 202.386 | 0.062 | n/a | 0.000 | 0.000 | 1.166 | 200.941 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.158 | 0.062 | 0.000 | 0.158 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000254 | 201.977 | 0.034 | n/a | 0.000 | 0.000 | 0.736 | 201.052 | 0.009 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000256 | 201.921 | 0.035 | n/a | 0.000 | 0.000 | 0.479 | 201.209 | 0.017 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.091 | 0.035 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000245 | 201.896 | 0.038 | n/a | 0.000 | 0.000 | 0.898 | 200.820 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.087 | 0.038 | 0.000 | 0.087 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000024f | 201.844 | 0.032 | n/a | 0.000 | 0.000 | 0.722 | 200.947 | 0.007 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.064 | 0.032 | 0.000 | 0.064 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000240 | 201.786 | 0.043 | n/a | 0.000 | 0.000 | 0.818 | 200.779 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.093 | 0.043 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000024b | 201.679 | 0.049 | n/a | 0.000 | 0.000 | 0.833 | 200.629 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.120 | 0.049 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e000000000000024c | 201.488 | 0.047 | n/a | 0.000 | 0.000 | 0.607 | 200.653 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.124 | 0.047 | 0.000 | 0.124 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000244 | 201.450 | 0.041 | n/a | 0.000 | 0.000 | 0.598 | 200.683 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000255 | 201.441 | 0.029 | n/a | 0.000 | 0.000 | 0.545 | 200.738 | 0.005 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.070 | 0.029 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000248 | 201.410 | 0.044 | n/a | 0.000 | 0.000 | 0.744 | 200.477 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.100 | 0.044 | 0.000 | 0.100 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000250 | 201.394 | 0.040 | n/a | 0.000 | 0.000 | 0.571 | 200.624 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.111 | 0.040 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000241 | 201.326 | 0.033 | n/a | 0.000 | 0.000 | 0.487 | 200.687 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000251 | 201.318 | 0.034 | n/a | 0.000 | 0.000 | 0.482 | 200.670 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.075 | 0.034 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000252 | 201.263 | 0.029 | n/a | 0.000 | 0.000 | 0.494 | 200.626 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000253 | 201.172 | 0.030 | n/a | 0.000 | 0.000 | 0.451 | 200.589 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.062 | 0.030 | 0.000 | 0.062 | gw-r/thread-51/journal/page | none observed |

## P3 / tail / read (205 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 90.763 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.459 | 90.269 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.060 | 0.037 | 0.000 | 0.060 |
| p99 | 201.912 | n/a | n/a | n/a | 0.098 | n/a | 0.000 | 0.000 | 4.252 | 200.927 | 0.020 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.156 | 0.098 | 0.001 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cdd2cf6f6cd22c4e0000000000000e77 | 205.432 | 0.022 | n/a | 0.000 | 0.000 | 3.850 | 201.358 | 0.020 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.069 | 0.022 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e85 | 202.214 | 0.034 | n/a | 0.000 | 0.000 | 1.300 | 200.725 | 0.015 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.083 | 0.034 | 0.000 | 0.083 | gw-r/thread-66/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e79 | 201.912 | 0.022 | n/a | 0.000 | 0.000 | 0.421 | 201.286 | 0.018 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.063 | 0.022 | 0.000 | 0.063 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e59 | 201.832 | 0.084 | n/a | 0.000 | 0.000 | 0.911 | 200.623 | 0.010 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.168 | 0.084 | 0.000 | 0.168 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e80 | 201.737 | 0.038 | n/a | 0.000 | 0.000 | 0.886 | 200.695 | 0.008 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-66/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e67 | 201.696 | 0.055 | n/a | 0.000 | 0.000 | 0.591 | 200.855 | 0.016 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.133 | 0.055 | 0.000 | 0.133 | gw-r/thread-51/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e99 | 201.670 | 0.046 | n/a | 0.000 | 0.000 | 0.873 | 200.609 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.107 | 0.046 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e65 | 201.665 | 0.039 | n/a | 0.000 | 0.000 | 0.722 | 200.757 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.095 | 0.039 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e45 | 201.650 | 0.027 | n/a | 0.000 | 0.000 | 0.726 | 200.769 | 0.009 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.073 | 0.027 | 0.000 | 0.073 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e8d | 201.646 | 0.032 | n/a | 0.000 | 0.000 | 0.557 | 200.900 | 0.013 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e7e | 201.642 | 0.064 | n/a | 0.000 | 0.000 | 0.900 | 200.446 | 0.008 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.203 | 0.064 | 0.000 | 0.203 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e4a | 201.625 | 0.040 | n/a | 0.000 | 0.000 | 0.486 | 200.927 | 0.014 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.110 | 0.040 | 0.000 | 0.110 | gw-r/thread-66/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e4e | 201.622 | 0.025 | n/a | 0.000 | 0.000 | 0.552 | 200.906 | 0.016 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.063 | 0.025 | 0.000 | 0.063 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e50 | 201.619 | 0.037 | n/a | 0.000 | 0.000 | 0.516 | 200.879 | 0.016 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.103 | 0.037 | 0.000 | 0.103 | gw-r/thread-66/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e58 | 201.613 | 0.040 | n/a | 0.000 | 0.000 | 0.458 | 200.917 | 0.016 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.118 | 0.040 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e53 | 201.563 | 0.058 | n/a | 0.000 | 0.000 | 0.876 | 200.446 | 0.008 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.156 | 0.058 | 0.000 | 0.156 | gw-r/thread-50/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000e9d | 201.530 | 0.040 | n/a | 0.000 | 0.000 | 0.763 | 200.557 | 0.009 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.116 | 0.040 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000ea9 | 201.512 | 0.022 | n/a | 0.000 | 0.000 | 0.735 | 200.655 | 0.013 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.056 | 0.022 | 0.000 | 0.056 | gw-r/thread-44/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000eae | 201.500 | 0.021 | n/a | 0.000 | 0.000 | 0.497 | 200.865 | 0.013 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.045 | 0.021 | 0.000 | 0.045 | gw-r/thread-49/journal/page | none observed |
| cdd2cf6f6cd22c4e0000000000000eb0 | 201.487 | 0.045 | n/a | 0.000 | 0.000 | 0.703 | 200.575 | 0.009 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.118 | 0.045 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.215 ms; post-ACK p50/p99: 0.383/1.861 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.165 | 10.687 | 10.491 | reported |
| All-primary p99 ms | 55.696 | 55.247 | 55.160 | <=50 |
| L256 5-10 p50Ms | 18.047 | 17.663 | 17.663 | <=10 |
| L256 5-10 p99Ms | 93.650 | 93.245 | 93.240 | <=50 |
| L256 11-25 p50Ms | 21.503 | 20.991 | 20.991 | <=10 |
| L256 11-25 p99Ms | 24.940 | 24.007 | 24.005 | <=50 |
| L256 26-50 p50Ms | 18.175 | 17.279 | 17.279 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 24.983 | 24.357 | 24.354 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.599 | 9.279 | 9.151 | <=10 |
| Burst 11-25 p50 ms | 11.903 | 11.327 | 11.071 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 93.650 | 93.245 | 93.240 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 121.397 | 120.896 | 120.894 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 8 | 27.401/60.295 | 26.553 | 12.342 | 28.884 | 0.122/0.028 |
| 5-10 | >=1000 | 31 | 18.210/95.335 | 17.658 | 11.636 | 26.703 | 0.090/0.020 |
| 5-10 | 250-1000 | 36 | 19.295/93.522 | 19.019 | 12.852 | 29.859 | 0.080/0.021 |
| 11-25 | 250-1000 | 23 | 19.809/38.797 | 19.385 | 9.654 | 31.882 | 0.085/0.023 |
| 5-10 | 100-250 | 14 | 14.843/34.200 | 14.601 | 8.836 | 15.813 | 0.072/0.018 |
| 11-25 | >=1000 | 13 | 27.666/172.075 | 27.241 | 20.807 | 45.306 | 0.096/0.020 |
| 26-50 | 250-1000 | 8 | 25.503/47.062 | 24.318 | 16.489 | 42.158 | 0.102/0.020 |
| 11-25 | 100-250 | 6 | 13.462/25.558 | 13.083 | 8.414 | 21.208 | 0.079/0.019 |
| 11-25 | 0-50 | 541 | 10.591/34.574 | 9.884 | 5.623 | 14.126 | 0.046/0.016 |
| 5-10 | 0-50 | 1140 | 8.411/24.643 | 8.098 | 4.753 | 11.801 | 0.042/0.016 |
| 5-10 | 50-100 | 56 | 9.118/118.253 | 8.785 | 5.310 | 13.004 | 0.048/0.016 |
| 26-50 | overlap | 140 | 16.087/62.361 | 14.987 | 8.983 | 21.581 | 0.052/0.016 |
| 11-25 | 50-100 | 38 | 11.779/58.930 | 10.878 | 6.727 | 15.928 | 0.056/0.016 |
| 5-10 | overlap | 788 | 10.737/41.554 | 10.396 | 6.893 | 15.282 | 0.035/0.015 |
| 11-25 | overlap | 365 | 12.770/57.712 | 12.272 | 8.087 | 18.462 | 0.038/0.015 |
| 26-50 | 0-50 | 200 | 14.276/31.609 | 12.941 | 6.970 | 18.128 | 0.059/0.017 |
| 26-50 | 50-100 | 13 | 14.201/36.994 | 13.440 | 6.855 | 17.046 | 0.073/0.018 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 880 | 35 | 2696.876 |
| burst | 2540 | 6 | 439.527 |

## Writer heap, GC and scheduler stalls

Source d62b4e952e5d2b0c5570225ff6e612eabee2f38b; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 99.330 / 269.416 |
| GC events / total duration / maximum ms | 639 / 836.847 / 18.508 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":613,"4":13,"8":13} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 55.696 / 41 / 3136.403 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

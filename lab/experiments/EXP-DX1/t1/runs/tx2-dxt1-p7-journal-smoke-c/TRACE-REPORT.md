# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (149.740 ms, trace `c148569f6187c6a60000000000000085`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (105.828 ms, trace `c148569f6187c6a600000000000000d9`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (83.507 ms, trace `c148569f6187c6a600000000000001fa`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (94.996 ms, trace `c148569f6187c6a6000000000000006a`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (82.528 ms, trace `c148569f6187c6a60000000000000127`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p7-journal-smoke-c`; source `0694cbe51eb2262caa62751a798757ba986bbf73`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8680995.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 199 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 13365.354 | 1411.703 | 42.380 | 448 |
| L1 | 1 | 19961.704 | 1095.156 | 24.886 | 666 |
| L4 | 4 | 19965.896 | 2067.625 | 44.577 | 626 |
| L16 | 16 | 19949.045 | 1648.832 | 39.904 | 686 |
| tail | 0 | 124640.914 | 12430.401 | 139.097 | 71347 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| c148569f6187c6a60000000000000085 | driver.queue.scheduler-dispatch | 0.056 | none | 0 / 32 |
| c148569f6187c6a60000000000000085 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace c148569f6187c6a60000000000000085 waited: []

| c148569f6187c6a600000000000000d9 | driver.queue.scheduler-dispatch | 0.061 | none | 0 / 32 |
| c148569f6187c6a600000000000000d9 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace c148569f6187c6a600000000000000d9 waited: []

| c148569f6187c6a600000000000001fa | driver.queue.scheduler-dispatch | 0.045 | none | 0 / 32 |
| c148569f6187c6a600000000000001fa | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace c148569f6187c6a600000000000001fa waited: []

| c148569f6187c6a6000000000000006a | driver.queue.scheduler-late | 0.275 | none | 0 / 32 |
| c148569f6187c6a6000000000000006a | driver.queue.scheduler-dispatch | 0.092 | none | 0 / 32 |

Observed active steps while trace c148569f6187c6a6000000000000006a waited: []

| c148569f6187c6a60000000000000127 | driver.queue.scheduler-dispatch | 0.101 | none | 0 / 32 |
| c148569f6187c6a60000000000000127 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace c148569f6187c6a60000000000000127 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.096 | 0.000 | 0.000 | 0.378 | 4.024 | 3.693 | 0.000 | 0.136 | 1.518 | 3.628 | 0.038 | n/a | 0.704 | 11.355 | n/a | n/a | 0.026 | 5.052 | 0.232 | 0.026 |
| p99 | 100.253 | 2.008 | 0.000 | 2.955 | 21.367 | n/a | 0.627 | 1.247 | 9.467 | 10.380 | 0.173 | n/a | 4.297 | 94.996 | n/a | n/a | 0.159 | 21.955 | 0.410 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a6000000000000006a | 100.253 | 2.003 | n/a | 0.000 | 0.367 | 0.900 | 1.233 | 0.021 | n/a | 0.704 | 94.996 | n/a | n/a | 0.030 | 2.370 | 0.024 | 0.030 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| c148569f6187c6a6000000000000003b | 53.561 | 21.367 | 0.452 | 0.000 | 0.136 | 9.467 | 7.427 | 0.173 | n/a | 3.144 | 11.355 | n/a | n/a | 0.040 | 21.955 | 0.410 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| c148569f6187c6a60000000000000037 | 42.370 | 8.450 | n/a | 0.000 | 1.028 | 1.206 | 10.380 | 0.052 | n/a | 0.151 | 20.944 | n/a | n/a | 0.159 | 9.478 | 0.224 | 0.159 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000057 | 34.746 | 4.585 | 0.121 | 0.287 | 0.058 | 3.712 | 7.743 | 0.070 | n/a | 3.860 | 14.289 | n/a | n/a | 0.020 | 5.052 | 0.145 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.135ms |
| c148569f6187c6a60000000000000069 | 33.502 | 7.749 | 3.693 | 0.257 | 0.090 | 2.058 | 3.214 | 0.049 | n/a | 3.658 | 12.705 | n/a | n/a | 0.030 | 11.788 | 0.352 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| c148569f6187c6a6000000000000003f | 32.912 | 9.049 | 0.305 | 0.000 | 0.113 | 2.507 | 2.518 | 0.036 | n/a | 0.386 | 17.948 | n/a | n/a | 0.050 | 9.467 | 0.288 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| c148569f6187c6a6000000000000004d | 32.719 | 7.391 | 0.138 | 0.000 | 0.067 | 2.440 | 5.962 | 0.038 | n/a | 4.297 | 12.366 | n/a | n/a | 0.019 | 7.596 | 0.232 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| c148569f6187c6a60000000000000061 | 31.910 | 4.024 | 3.003 | 0.309 | 0.058 | 1.845 | 7.347 | 0.042 | n/a | 0.176 | 15.082 | n/a | n/a | 0.023 | 7.395 | 0.232 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| c148569f6187c6a60000000000000055 | 31.482 | 10.675 | 0.281 | 0.627 | 0.063 | 4.829 | 4.626 | 0.073 | n/a | 0.968 | 9.319 | n/a | n/a | 0.021 | 11.646 | 0.370 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| c148569f6187c6a60000000000000053 | 27.447 | 6.578 | 0.211 | 0.000 | 0.070 | 2.487 | 3.397 | 0.044 | n/a | 0.164 | 14.476 | n/a | n/a | 0.020 | 6.859 | 0.250 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| c148569f6187c6a60000000000000043 | 26.196 | 4.671 | 2.934 | 0.000 | 0.064 | 2.012 | 6.354 | 0.074 | n/a | 0.604 | 9.461 | n/a | n/a | 0.022 | 7.669 | 0.293 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| c148569f6187c6a60000000000000048 | 25.427 | 6.177 | n/a | 0.000 | 1.247 | 1.044 | 5.878 | 0.031 | n/a | 0.140 | 10.864 | n/a | n/a | 0.046 | 7.424 | 0.292 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| c148569f6187c6a60000000000000065 | 25.325 | 3.758 | 0.173 | 0.246 | 0.062 | 6.269 | 3.495 | 0.042 | n/a | 0.170 | 11.091 | n/a | n/a | 0.018 | 4.239 | 0.167 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000004e | 24.880 | 3.416 | n/a | 0.000 | 0.908 | 1.170 | 2.565 | 0.027 | n/a | 1.854 | 14.921 | n/a | n/a | 0.019 | 4.324 | 0.174 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000041 | 24.096 | 2.728 | n/a | 0.000 | 0.915 | 0.682 | 3.123 | 0.022 | n/a | 0.125 | 16.484 | n/a | n/a | 0.019 | 3.642 | 0.151 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000003d | 24.094 | 2.273 | n/a | 0.000 | 0.703 | 1.180 | 2.738 | 0.032 | n/a | 0.144 | 16.995 | n/a | n/a | 0.028 | 2.977 | 0.124 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.076ms |
| c148569f6187c6a6000000000000005d | 23.371 | 6.353 | 0.179 | 0.370 | 0.063 | 1.582 | 5.545 | 0.060 | n/a | 1.466 | 7.730 | n/a | n/a | 0.023 | 6.965 | 0.298 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000004b | 22.744 | 6.807 | 0.452 | 0.000 | 0.081 | 1.463 | 4.187 | 0.042 | n/a | 1.041 | 8.639 | n/a | n/a | 0.030 | 7.341 | 0.323 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000005f | 22.585 | 4.977 | n/a | 0.000 | 0.554 | 0.569 | 1.529 | 0.020 | n/a | 0.117 | 14.790 | n/a | n/a | 0.030 | 5.531 | 0.245 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000006d | 21.788 | 5.638 | 0.283 | 0.000 | 0.062 | 1.861 | 6.811 | 0.036 | n/a | 0.744 | 6.327 | n/a | n/a | 0.026 | 5.983 | 0.275 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (126 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.138 | n/a | n/a | n/a | 39.742 | 5.686 | 2.779 | 0.000 | 0.378 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.539 | 56.956 | 0.750 | 22.539 |
| p99 | 281.734 | n/a | n/a | n/a | 99.658 | 155.916 | 16.503 | 0.000 | 30.435 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 130.364 | 209.300 | 1.000 | 130.364 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a6000000000000178f | 290.118 | 49.755 | 84.305 | 8.992 | 0.000 | 0.499 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 146.567 | 143.052 | 0.493 | 146.567 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.018ms; driver.publication.persist-deferred 1.578ms; driver.publication.persist-deferred 1.194ms; driver.publication.persist-deferred 1.167ms; driver.publication.persist-deferred 1.160ms |
| c148569f6187c6a600000000000015d7 | 281.734 | 36.737 | 199.494 | 1.308 | 0.000 | 0.309 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.885 | 237.540 | 0.843 | 43.885 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.118ms; driver.publication.persist-deferred 2.065ms; driver.publication.persist-deferred 1.171ms; driver.publication.persist-deferred 1.156ms; driver.publication.persist-deferred 1.098ms |
| c148569f6187c6a600000000000015d6 | 277.067 | 49.753 | 115.209 | 3.315 | 0.000 | 0.625 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 108.165 | 168.277 | 0.607 | 108.165 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.118ms; driver.publication.persist-deferred 2.065ms; driver.publication.persist-deferred 1.171ms; driver.publication.persist-deferred 1.156ms; driver.publication.persist-deferred 1.098ms |
| c148569f6187c6a6000000000000178c | 275.827 | 60.826 | 80.691 | 3.713 | 0.000 | 0.233 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 130.364 | 145.230 | 0.527 | 130.364 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.018ms; driver.publication.persist-deferred 1.578ms; driver.publication.persist-deferred 1.335ms; driver.publication.persist-deferred 1.194ms; driver.publication.persist-deferred 1.167ms |
| c148569f6187c6a600000000000015cb | 262.099 | 56.557 | 120.469 | 10.468 | 0.000 | 0.220 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 74.385 | 187.495 | 0.715 | 74.385 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.118ms; driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 1.196ms; driver.publication.persist-deferred 1.171ms; driver.publication.persist-deferred 1.156ms |
| c148569f6187c6a600000000000015dd | 256.117 | 49.706 | 155.916 | 3.678 | 0.000 | 0.323 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.494 | 209.300 | 0.817 | 46.494 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.118ms; driver.publication.persist-deferred 2.065ms; driver.publication.persist-deferred 1.171ms; driver.publication.persist-deferred 1.156ms; driver.publication.persist-deferred 1.045ms |
| c148569f6187c6a6000000000000178b | 232.446 | 50.482 | 91.685 | 4.852 | 0.000 | 0.234 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 85.192 | 147.019 | 0.632 | 85.192 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.018ms; driver.publication.persist-deferred 1.578ms; driver.publication.persist-deferred 1.335ms; driver.publication.persist-deferred 1.194ms; driver.publication.persist-deferred 1.167ms |
| c148569f6187c6a600000000000015dc | 226.275 | 26.816 | 149.123 | 0.689 | 0.000 | 0.461 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.185 | 176.629 | 0.781 | 49.185 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.118ms; driver.publication.persist-deferred 2.065ms; driver.publication.persist-deferred 1.171ms; driver.publication.persist-deferred 1.156ms; driver.publication.persist-deferred 1.098ms |
| c148569f6187c6a6000000000000191b | 220.587 | 75.557 | 61.403 | 4.323 | 0.000 | 0.431 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 78.874 | 141.282 | 0.640 | 78.874 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.992ms; driver.publication.persist-deferred 1.340ms; driver.publication.persist-deferred 1.185ms; driver.publication.persist-deferred 1.018ms; driver.publication.persist-deferred 0.924ms |
| c148569f6187c6a6000000000000179d | 217.962 | 36.422 | 74.527 | 6.199 | 0.000 | 0.291 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 100.523 | 117.148 | 0.537 | 100.523 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.018ms; driver.publication.persist-deferred 1.167ms; driver.publication.persist-deferred 1.160ms; driver.publication.persist-deferred 1.141ms; driver.publication.persist-deferred 1.126ms |
| c148569f6187c6a60000000000001784 | 210.045 | 77.350 | 82.884 | 4.207 | 0.000 | 0.508 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.097 | 164.441 | 0.783 | 45.097 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.578ms; driver.publication.persist-deferred 1.335ms; driver.publication.persist-deferred 1.194ms; driver.publication.persist-deferred 1.160ms; driver.publication.persist-deferred 1.109ms |
| c148569f6187c6a600000000000015d5 | 204.293 | 42.270 | 97.802 | 1.308 | 0.000 | 0.161 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 62.752 | 141.381 | 0.692 | 62.752 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.171ms; driver.publication.persist-deferred 1.156ms; driver.publication.persist-deferred 1.098ms; driver.publication.persist-deferred 1.045ms; driver.publication.persist-deferred 1.031ms |
| c148569f6187c6a600000000000015d3 | 197.015 | 67.247 | 102.128 | 4.766 | 0.000 | 0.335 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.539 | 174.141 | 0.884 | 22.539 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.196ms; driver.publication.persist-deferred 1.171ms; driver.publication.persist-deferred 1.156ms; driver.publication.persist-deferred 1.098ms; driver.publication.persist-deferred 1.051ms |
| c148569f6187c6a60000000000001912 | 191.030 | 45.859 | 51.094 | 4.470 | 0.000 | 0.346 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 89.261 | 101.423 | 0.531 | 89.261 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.992ms; driver.publication.persist-deferred 1.340ms; driver.publication.persist-deferred 1.185ms; driver.publication.persist-deferred 1.018ms; driver.publication.persist-deferred 0.995ms |
| c148569f6187c6a600000000000015c0 | 183.563 | 60.498 | 16.826 | 4.799 | 0.000 | 0.473 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 100.966 | 82.124 | 0.447 | 100.966 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 1.196ms; driver.publication.persist-deferred 1.156ms; driver.publication.persist-deferred 1.121ms; driver.publication.persist-deferred 1.108ms |
| c148569f6187c6a60000000000001843 | 183.037 | 47.896 | 52.550 | 2.810 | 0.000 | 0.228 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 79.554 | 103.255 | 0.564 | 79.554 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 0.976ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.855ms; driver.publication.persist-deferred 0.790ms; driver.publication.persist-deferred 0.782ms |
| c148569f6187c6a600000000000015c8 | 179.422 | 47.984 | 120.203 | 8.592 | 0.000 | 0.321 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.322 | 176.779 | 0.985 | 2.322 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 1.196ms; driver.publication.persist-deferred 1.171ms; driver.publication.persist-deferred 1.156ms; driver.publication.persist-deferred 1.108ms |
| c148569f6187c6a60000000000001783 | 175.645 | 52.161 | 3.513 | 1.523 | 0.000 | 0.226 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 118.223 | 57.197 | 0.326 | 118.223 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.578ms; driver.publication.persist-deferred 1.335ms; driver.publication.persist-deferred 1.194ms; driver.publication.persist-deferred 1.160ms; driver.publication.persist-deferred 1.109ms |
| c148569f6187c6a60000000000000038 | 170.535 | 127.778 | 6.585 | 16.503 | 0.000 | 5.245 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.424 | 150.866 | 0.885 | 14.424 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.761ms; client.encode 1.108ms; driver.reader-basis.broadcast 0.036ms; driver.reader-basis.broadcast 0.025ms |
| c148569f6187c6a600000000000014db | 159.531 | 47.921 | 0.106 | 3.776 | 0.000 | 0.267 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 107.461 | 51.803 | 0.325 | 107.461 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.863ms; driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.196ms; driver.publication.persist-deferred 1.106ms; driver.publication.persist-deferred 1.103ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.841 | 0.000 | 0.000 | 0.544 | 2.273 | n/a | 0.000 | 0.599 | 0.900 | 2.738 | 0.023 | n/a | 0.477 | 12.080 | n/a | n/a | 0.028 | 2.977 | 0.151 | 0.028 |
| p99 | 100.253 | 1.001 | 0.000 | 0.901 | 2.884 | n/a | 0.000 | 1.027 | 1.632 | 5.853 | 0.076 | n/a | 3.649 | 94.996 | n/a | n/a | 0.032 | 3.670 | 0.276 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a6000000000000006a | 100.253 | 2.003 | n/a | 0.000 | 0.367 | 0.900 | 1.233 | 0.021 | n/a | 0.704 | 94.996 | n/a | n/a | 0.030 | 2.370 | 0.024 | 0.030 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| c148569f6187c6a60000000000000041 | 24.096 | 2.728 | n/a | 0.000 | 0.915 | 0.682 | 3.123 | 0.022 | n/a | 0.125 | 16.484 | n/a | n/a | 0.019 | 3.642 | 0.151 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000003d | 24.094 | 2.273 | n/a | 0.000 | 0.703 | 1.180 | 2.738 | 0.032 | n/a | 0.144 | 16.995 | n/a | n/a | 0.028 | 2.977 | 0.124 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.076ms |
| c148569f6187c6a6000000000000005a | 21.323 | 2.884 | n/a | 0.000 | 0.153 | 1.358 | 3.628 | 0.076 | n/a | 1.119 | 12.080 | n/a | n/a | 0.026 | 3.037 | 0.142 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000058 | 20.841 | 1.829 | n/a | 0.000 | 0.599 | 0.777 | 4.429 | 0.023 | n/a | 0.421 | 12.740 | n/a | n/a | 0.022 | 2.427 | 0.116 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000062 | 15.321 | 1.912 | n/a | 0.000 | 0.420 | 1.632 | 2.589 | 0.065 | n/a | 1.550 | 7.123 | n/a | n/a | 0.030 | 2.332 | 0.152 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| c148569f6187c6a60000000000000046 | 14.804 | 2.280 | n/a | 0.000 | 0.191 | 0.835 | 5.853 | 0.023 | n/a | 0.477 | 5.118 | n/a | n/a | 0.028 | 2.471 | 0.167 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000006e | 14.281 | 2.273 | n/a | 0.000 | 1.027 | 0.707 | 0.927 | 0.019 | n/a | 3.649 | 5.646 | n/a | n/a | 0.032 | 3.301 | 0.231 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000066 | 13.276 | 2.817 | n/a | 0.000 | 0.853 | 1.223 | 1.393 | 0.032 | n/a | 0.169 | 6.769 | n/a | n/a | 0.019 | 3.670 | 0.276 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.603 | 0.222 | 0.000 | 0.345 | 7.645 | 1.840 | 0.352 | 0.050 | 1.757 | 6.467 | 0.033 | n/a | 2.349 | 18.092 | n/a | n/a | 0.019 | 9.886 | 0.256 | 0.019 |
| p99 | 38.603 | 0.222 | 0.000 | 0.345 | 7.645 | 1.840 | 0.352 | 0.050 | 1.757 | 6.467 | 0.033 | n/a | 2.349 | 18.092 | n/a | n/a | 0.019 | 9.886 | 0.256 | 0.019 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a60000000000000071 | 38.603 | 7.645 | 1.840 | 0.352 | 0.050 | 1.757 | 6.467 | 0.033 | n/a | 2.349 | 18.092 | n/a | n/a | 0.019 | 9.886 | 0.256 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.268 | 0.000 | 0.000 | 0.354 | 3.755 | n/a | 0.000 | 0.158 | 1.441 | 4.219 | 0.039 | n/a | 0.466 | 13.101 | n/a | n/a | 0.024 | 4.250 | 0.171 | 0.024 |
| p99 | 174.154 | 2.004 | 0.000 | 0.887 | 6.970 | n/a | 0.478 | 2.656 | 4.876 | 33.437 | 0.232 | n/a | 3.910 | 149.740 | n/a | n/a | 0.053 | 7.214 | 0.394 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a60000000000000085 | 174.154 | 3.708 | 0.189 | 0.000 | 0.057 | 1.346 | 18.877 | 0.053 | n/a | 0.162 | 149.740 | n/a | n/a | 0.022 | 3.954 | 0.023 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms; driver.reader-basis.broadcast 0.051ms |
| c148569f6187c6a600000000000000ae | 60.972 | 5.647 | 0.127 | 0.000 | 0.062 | 1.841 | 25.133 | 0.045 | n/a | 0.543 | 27.554 | n/a | n/a | 0.021 | 5.836 | 0.096 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.099ms |
| c148569f6187c6a60000000000000087 | 50.876 | 3.564 | 0.132 | 0.325 | 0.055 | 1.380 | 19.805 | 0.033 | n/a | 0.136 | 25.426 | n/a | n/a | 0.020 | 4.076 | 0.080 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.090ms |
| c148569f6187c6a600000000000000b0 | 47.451 | 5.098 | 0.153 | 0.413 | 0.062 | 1.862 | 19.736 | 0.031 | n/a | 0.512 | 19.560 | n/a | n/a | 0.023 | 5.726 | 0.121 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| c148569f6187c6a600000000000000a8 | 46.472 | 4.742 | 0.341 | 0.463 | 0.041 | 3.025 | 22.918 | 0.057 | n/a | 3.022 | 11.844 | n/a | n/a | 0.017 | 5.587 | 0.120 | 0.017 | gw-w/thread-45/gateway.admitted-work | driver.publication.persist-deferred 1.113ms; driver.reader-basis.broadcast 0.046ms |
| c148569f6187c6a600000000000000b4 | 45.737 | 3.632 | 0.173 | 0.000 | 0.058 | 1.974 | 33.437 | 0.041 | n/a | 0.228 | 6.172 | n/a | n/a | 0.022 | 3.863 | 0.084 | 0.022 | gw-w/thread-49/gateway.admitted-work | driver.reader-basis.broadcast 0.073ms |
| c148569f6187c6a60000000000000091 | 45.563 | 3.542 | 0.140 | 0.000 | 0.094 | 1.224 | 16.984 | 0.045 | n/a | 0.544 | 22.960 | n/a | n/a | 0.031 | 3.776 | 0.083 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| c148569f6187c6a600000000000000b8 | 44.274 | 5.175 | 0.134 | 0.478 | 0.070 | 2.311 | 25.119 | 0.058 | n/a | 0.945 | 9.960 | n/a | n/a | 0.024 | 5.856 | 0.132 | 0.024 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.110ms |
| c148569f6187c6a600000000000000ba | 42.771 | 6.970 | 0.148 | 0.000 | 0.096 | 2.151 | 12.566 | 0.067 | n/a | 0.211 | 20.527 | n/a | n/a | 0.035 | 7.214 | 0.169 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| c148569f6187c6a6000000000000008d | 41.447 | 3.512 | 0.204 | 0.272 | 0.063 | 1.762 | 16.775 | 0.039 | n/a | 0.115 | 18.677 | n/a | n/a | 0.028 | 4.051 | 0.098 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| c148569f6187c6a60000000000000096 | 36.255 | 4.018 | 0.309 | 0.247 | 0.098 | 1.511 | 12.866 | 0.057 | n/a | 0.727 | 16.387 | n/a | n/a | 0.035 | 4.672 | 0.129 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| c148569f6187c6a60000000000000092 | 35.173 | 2.995 | n/a | 0.000 | 0.500 | 1.507 | 10.692 | 0.052 | n/a | 0.233 | 19.172 | n/a | n/a | 0.022 | 3.496 | 0.099 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000c4 | 34.363 | 3.822 | 0.183 | 0.000 | 0.111 | 4.876 | 6.921 | 0.047 | n/a | 0.161 | 18.205 | n/a | n/a | 0.038 | 4.115 | 0.120 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000089 | 33.241 | 5.639 | 0.221 | 0.000 | 0.059 | 1.324 | 3.825 | 0.042 | n/a | 0.171 | 21.937 | n/a | n/a | 0.022 | 5.920 | 0.178 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| c148569f6187c6a600000000000000ab | 31.628 | 3.366 | n/a | 0.000 | 0.252 | 1.214 | 4.163 | 0.083 | n/a | 1.570 | 20.932 | n/a | n/a | 0.049 | 3.618 | 0.114 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000007f | 29.927 | 5.773 | 0.156 | 0.000 | 0.103 | 1.406 | 1.972 | 0.033 | n/a | 0.542 | 19.907 | n/a | n/a | 0.034 | 6.032 | 0.202 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| c148569f6187c6a6000000000000007c | 27.006 | 3.897 | 0.153 | 0.000 | 0.091 | 1.636 | 7.639 | 0.069 | n/a | 0.164 | 13.324 | n/a | n/a | 0.033 | 4.141 | 0.153 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000a6 | 26.649 | 1.715 | n/a | 0.000 | 0.498 | 0.647 | 1.718 | 0.232 | n/a | 0.974 | 20.852 | n/a | n/a | 0.015 | 2.212 | 0.083 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000009e | 25.619 | 5.093 | 0.208 | 0.000 | 0.061 | 1.726 | 2.869 | 0.034 | n/a | 0.175 | 15.430 | n/a | n/a | 0.024 | 5.362 | 0.209 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000099 | 25.421 | 3.365 | n/a | 0.000 | 0.989 | 1.082 | 4.509 | 0.024 | n/a | 0.123 | 15.292 | n/a | n/a | 0.038 | 4.353 | 0.171 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.481 | 0.000 | 0.000 | 0.354 | 1.946 | n/a | 0.000 | 0.782 | 1.082 | 1.927 | 0.024 | n/a | 0.152 | 11.084 | n/a | n/a | 0.022 | 4.353 | 0.186 | 0.022 |
| p99 | 25.421 | 1.002 | 0.000 | 0.601 | 4.744 | n/a | 0.000 | 2.656 | 2.351 | 4.960 | 0.073 | n/a | 2.423 | 15.292 | n/a | n/a | 0.039 | 5.051 | 0.394 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a60000000000000099 | 25.421 | 3.365 | n/a | 0.000 | 0.989 | 1.082 | 4.509 | 0.024 | n/a | 0.123 | 15.292 | n/a | n/a | 0.038 | 4.353 | 0.171 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000008e | 22.742 | 1.739 | n/a | 0.000 | 0.820 | 0.998 | 4.439 | 0.026 | n/a | 0.414 | 14.288 | n/a | n/a | 0.020 | 2.558 | 0.112 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000b5 | 22.233 | 3.976 | n/a | 0.000 | 0.681 | 1.328 | 4.960 | 0.024 | n/a | 0.152 | 11.084 | n/a | n/a | 0.028 | 4.657 | 0.209 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000007a | 20.919 | 3.755 | n/a | 0.000 | 0.650 | 1.259 | 1.546 | 0.021 | n/a | 0.547 | 13.101 | n/a | n/a | 0.039 | 4.405 | 0.211 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000007d | 20.481 | 4.744 | n/a | 0.000 | 0.307 | 1.970 | 4.207 | 0.044 | n/a | 1.289 | 7.897 | n/a | n/a | 0.022 | 5.051 | 0.247 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000a9 | 18.444 | 1.640 | n/a | 0.000 | 0.799 | 2.351 | 1.927 | 0.073 | n/a | 0.137 | 11.492 | n/a | n/a | 0.024 | 2.439 | 0.132 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000a4 | 13.039 | 1.649 | n/a | 0.000 | 0.782 | 0.730 | 1.616 | 0.023 | n/a | 2.423 | 5.796 | n/a | n/a | 0.019 | 2.431 | 0.186 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000bf | 11.673 | 1.946 | n/a | 0.000 | 2.656 | 0.708 | 1.297 | 0.019 | n/a | 0.123 | 4.911 | n/a | n/a | 0.012 | 4.602 | 0.394 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.220ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.154 | 0.000 | 0.000 | 0.379 | 4.157 | 1.044 | 0.000 | 0.105 | 1.357 | 4.506 | 0.042 | n/a | 0.358 | 12.728 | n/a | n/a | 0.027 | 4.728 | 0.180 | 0.027 |
| p99 | 135.575 | 2.001 | 0.000 | 1.007 | 11.927 | n/a | 0.830 | 1.348 | 15.667 | 20.058 | 0.119 | n/a | 6.858 | 105.828 | n/a | n/a | 0.054 | 12.128 | 0.355 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a600000000000000d9 | 135.575 | 10.191 | 0.138 | 0.509 | 0.062 | 5.470 | 13.153 | 0.065 | n/a | 0.136 | 105.828 | n/a | n/a | 0.023 | 10.900 | 0.080 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| c148569f6187c6a600000000000000f2 | 57.090 | 5.531 | 0.248 | 0.232 | 0.105 | 2.189 | 4.506 | 0.035 | n/a | 3.554 | 40.650 | n/a | n/a | 0.041 | 6.116 | 0.107 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| c148569f6187c6a600000000000000ec | 55.594 | 4.923 | 0.148 | 0.620 | 0.104 | 15.667 | 11.989 | 0.071 | n/a | 6.858 | 15.180 | n/a | n/a | 0.036 | 5.793 | 0.104 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| c148569f6187c6a60000000000000114 | 51.181 | 6.452 | 0.841 | 0.422 | 0.063 | 10.182 | 6.236 | 0.062 | n/a | 0.111 | 26.771 | n/a | n/a | 0.041 | 7.778 | 0.152 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| c148569f6187c6a600000000000000ee | 49.606 | 7.689 | 0.147 | 0.326 | 0.073 | 9.679 | 19.273 | 0.074 | n/a | 0.191 | 12.125 | n/a | n/a | 0.029 | 8.235 | 0.166 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| c148569f6187c6a600000000000000e5 | 49.534 | 11.927 | 0.134 | 0.000 | 0.067 | 1.321 | 16.956 | 0.031 | n/a | 0.415 | 18.658 | n/a | n/a | 0.024 | 12.128 | 0.245 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| c148569f6187c6a600000000000000fe | 48.429 | 9.070 | 0.132 | 0.585 | 0.078 | 2.049 | 7.681 | 0.049 | n/a | 0.589 | 28.169 | n/a | n/a | 0.028 | 9.864 | 0.204 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| c148569f6187c6a600000000000000e3 | 47.564 | 7.062 | 0.158 | 0.830 | 0.090 | 3.152 | 10.567 | 0.042 | n/a | 2.465 | 23.166 | n/a | n/a | 0.032 | 8.140 | 0.171 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| c148569f6187c6a600000000000000cf | 46.628 | 9.001 | 0.183 | 0.383 | 0.095 | 2.196 | 7.283 | 0.038 | n/a | 0.388 | 27.026 | n/a | n/a | 0.034 | 9.662 | 0.207 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| c148569f6187c6a600000000000000d7 | 40.831 | 5.119 | 0.169 | 0.000 | 0.065 | 1.890 | 11.940 | 0.037 | n/a | 0.326 | 21.262 | n/a | n/a | 0.023 | 5.354 | 0.131 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| c148569f6187c6a600000000000000ea | 39.008 | 4.869 | 0.171 | 0.415 | 0.062 | 3.969 | 8.258 | 0.032 | n/a | 1.856 | 19.349 | n/a | n/a | 0.026 | 5.517 | 0.141 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| c148569f6187c6a6000000000000010a | 38.879 | 4.486 | 0.177 | 0.254 | 0.064 | 1.574 | 20.058 | 0.076 | n/a | 0.142 | 12.023 | n/a | n/a | 0.025 | 4.982 | 0.128 | 0.025 | gw-w/thread-42/gateway.admitted-work | none observed |
| c148569f6187c6a60000000000000102 | 37.943 | 10.017 | 0.173 | 0.660 | 0.065 | 2.071 | 8.604 | 0.063 | n/a | 0.719 | 15.544 | n/a | n/a | 0.027 | 10.915 | 0.288 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000df | 36.595 | 6.128 | 1.044 | 0.000 | 0.102 | 2.903 | 9.212 | 0.069 | n/a | 0.642 | 16.442 | n/a | n/a | 0.052 | 7.274 | 0.199 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000f8 | 35.735 | 5.603 | 0.132 | 0.259 | 0.068 | 1.819 | 7.049 | 0.052 | n/a | 0.638 | 20.089 | n/a | n/a | 0.024 | 6.063 | 0.170 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000c8 | 31.163 | 4.157 | 0.132 | 0.379 | 0.060 | 2.178 | 10.564 | 0.067 | n/a | 0.257 | 13.340 | n/a | n/a | 0.028 | 4.728 | 0.152 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000fc | 26.732 | 3.344 | 0.181 | 0.255 | 0.058 | 1.623 | 9.862 | 0.033 | n/a | 1.096 | 10.257 | n/a | n/a | 0.023 | 3.838 | 0.144 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000f9 | 25.963 | 1.910 | n/a | 0.000 | 0.920 | 0.667 | 4.504 | 0.023 | n/a | 0.095 | 17.821 | n/a | n/a | 0.022 | 2.831 | 0.109 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000cc | 24.162 | 8.337 | 0.184 | 0.000 | 0.066 | 3.111 | 4.589 | 0.025 | n/a | 0.130 | 7.695 | n/a | n/a | 0.026 | 8.587 | 0.355 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000d0 | 24.154 | 3.248 | n/a | 0.000 | 0.540 | 0.778 | 1.290 | 0.020 | n/a | 0.125 | 18.109 | n/a | n/a | 0.045 | 3.788 | 0.157 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.328 | 0.000 | 0.000 | 0.427 | 2.311 | n/a | 0.000 | 0.849 | 0.958 | 1.630 | 0.023 | n/a | 0.294 | 11.427 | n/a | n/a | 0.025 | 3.235 | 0.180 | 0.025 |
| p99 | 25.963 | 1.000 | 0.000 | 0.595 | 2.990 | n/a | 0.000 | 1.348 | 1.601 | 4.504 | 0.054 | n/a | 0.922 | 17.821 | n/a | n/a | 0.054 | 4.180 | 0.267 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a600000000000000f9 | 25.963 | 1.910 | n/a | 0.000 | 0.920 | 0.667 | 4.504 | 0.023 | n/a | 0.095 | 17.821 | n/a | n/a | 0.022 | 2.831 | 0.109 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000c5 | 23.432 | 2.990 | n/a | 0.000 | 0.729 | 0.958 | 1.151 | 0.021 | n/a | 0.372 | 17.170 | n/a | n/a | 0.040 | 3.719 | 0.159 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000010f | 23.224 | 2.950 | n/a | 0.000 | 1.229 | 1.242 | 2.819 | 0.032 | n/a | 0.570 | 14.327 | n/a | n/a | 0.054 | 4.180 | 0.180 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000da | 22.315 | 2.311 | n/a | 0.000 | 1.081 | 0.913 | 1.630 | 0.019 | n/a | 0.358 | 15.981 | n/a | n/a | 0.022 | 3.392 | 0.152 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| c148569f6187c6a600000000000000ca | 19.609 | 2.468 | n/a | 0.000 | 1.348 | 1.601 | 1.823 | 0.046 | n/a | 0.166 | 12.143 | n/a | n/a | 0.015 | 3.816 | 0.195 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000d4 | 17.328 | 2.768 | n/a | 0.000 | 0.604 | 1.012 | 1.149 | 0.022 | n/a | 0.294 | 11.427 | n/a | n/a | 0.051 | 3.372 | 0.195 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000dc | 14.416 | 1.823 | n/a | 0.000 | 0.662 | 0.739 | 1.197 | 0.019 | n/a | 0.130 | 9.830 | n/a | n/a | 0.017 | 2.485 | 0.172 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000000ef | 13.037 | 1.854 | n/a | 0.000 | 1.013 | 1.271 | 2.285 | 0.054 | n/a | 0.922 | 5.610 | n/a | n/a | 0.027 | 2.867 | 0.220 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000111 | 12.108 | 2.464 | n/a | 0.000 | 0.771 | 1.164 | 1.063 | 0.035 | n/a | 0.469 | 6.117 | n/a | n/a | 0.025 | 3.235 | 0.267 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000107 | 10.358 | 1.637 | n/a | 0.000 | 0.849 | 0.759 | 1.906 | 0.050 | n/a | 0.205 | 4.927 | n/a | n/a | 0.025 | 2.486 | 0.240 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.118 | 0.000 | 0.000 | 0.346 | 3.717 | n/a | 0.000 | 0.099 | 1.333 | 3.997 | 0.037 | n/a | 0.281 | 10.903 | n/a | n/a | 0.024 | 4.194 | 0.184 | 0.024 |
| p99 | 97.358 | 1.928 | 0.000 | 1.195 | 10.499 | n/a | 3.556 | 0.988 | 10.359 | 21.337 | 0.208 | n/a | 4.012 | 82.528 | n/a | n/a | 0.065 | 14.248 | 0.481 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a60000000000000127 | 97.358 | 3.591 | 0.164 | 0.000 | 0.103 | 1.111 | 9.687 | 0.031 | n/a | 0.107 | 82.528 | n/a | n/a | 0.036 | 3.858 | 0.040 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| c148569f6187c6a60000000000000138 | 60.047 | 9.596 | n/a | 0.000 | 0.116 | 3.033 | 21.337 | 0.072 | n/a | 4.012 | 21.857 | n/a | n/a | 0.024 | 9.713 | 0.162 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| c148569f6187c6a60000000000000143 | 51.576 | 5.293 | 0.158 | 0.270 | 0.069 | 1.656 | 14.619 | 0.105 | n/a | 0.197 | 29.185 | n/a | n/a | 0.024 | 5.790 | 0.112 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| c148569f6187c6a60000000000000137 | 43.164 | 5.014 | 0.132 | 2.209 | 0.070 | 5.620 | 12.247 | 0.068 | n/a | 0.150 | 17.632 | n/a | n/a | 0.023 | 7.425 | 0.172 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| c148569f6187c6a60000000000000141 | 40.421 | 7.859 | 0.827 | 1.921 | 0.069 | 2.598 | 10.184 | 0.040 | n/a | 0.429 | 16.465 | n/a | n/a | 0.029 | 10.676 | 0.264 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000012c | 38.996 | 2.068 | n/a | 0.000 | 0.088 | 2.635 | 1.113 | 0.019 | n/a | 0.105 | 32.943 | n/a | n/a | 0.025 | 2.155 | 0.055 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000013b | 34.612 | 9.339 | 0.123 | 0.282 | 0.051 | 1.024 | 12.050 | 0.028 | n/a | 0.577 | 11.120 | n/a | n/a | 0.018 | 9.795 | 0.283 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000128 | 33.610 | 2.674 | n/a | 0.000 | 0.397 | 0.567 | 3.997 | 0.021 | n/a | 0.084 | 25.849 | n/a | n/a | 0.021 | 3.071 | 0.091 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms |
| c148569f6187c6a6000000000000011a | 32.397 | 3.606 | 0.143 | 0.274 | 0.064 | 10.359 | 3.015 | 0.055 | n/a | 0.170 | 14.689 | n/a | n/a | 0.023 | 4.087 | 0.126 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000159 | 31.615 | 5.363 | 0.123 | 0.488 | 0.060 | 5.789 | 10.307 | 0.062 | n/a | 0.550 | 8.852 | n/a | n/a | 0.022 | 6.034 | 0.191 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000135 | 30.625 | 5.581 | 0.175 | 0.000 | 0.059 | 3.831 | 7.699 | 0.037 | n/a | 0.107 | 13.113 | n/a | n/a | 0.023 | 5.815 | 0.190 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000012b | 30.395 | 3.717 | 0.198 | 0.473 | 0.040 | 0.906 | 6.868 | 0.031 | n/a | 0.446 | 17.699 | n/a | n/a | 0.017 | 4.428 | 0.146 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000167 | 29.691 | 3.726 | 0.152 | 0.254 | 0.060 | 1.801 | 13.464 | 0.045 | n/a | 0.150 | 10.014 | n/a | n/a | 0.025 | 4.192 | 0.141 | 0.025 | gw-w/thread-44/gateway.admitted-work | none observed |
| c148569f6187c6a60000000000000153 | 29.650 | 10.499 | 0.131 | 3.556 | 0.062 | 2.731 | 4.445 | 0.039 | n/a | 0.583 | 7.580 | n/a | n/a | 0.025 | 14.248 | 0.481 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000014b | 29.212 | 4.539 | 8.978 | 0.466 | 0.071 | 7.146 | 1.796 | 0.049 | n/a | 0.133 | 6.012 | n/a | n/a | 0.024 | 14.053 | 0.481 | 0.024 | node-14/thread-0/rpc.probe.transact | none observed |
| c148569f6187c6a60000000000000123 | 28.757 | 4.425 | 0.134 | 0.317 | 0.064 | 1.644 | 7.223 | 0.055 | n/a | 0.518 | 14.355 | n/a | n/a | 0.023 | 4.939 | 0.172 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000120 | 27.314 | 4.071 | 0.142 | 0.262 | 0.070 | 3.543 | 6.193 | 0.059 | n/a | 0.147 | 12.802 | n/a | n/a | 0.024 | 4.545 | 0.166 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000014f | 26.416 | 6.841 | 0.187 | 0.255 | 0.064 | 1.551 | 7.322 | 0.040 | n/a | 0.502 | 9.629 | n/a | n/a | 0.026 | 7.346 | 0.278 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000015f | 25.897 | 8.530 | 0.257 | 0.280 | 0.096 | 2.993 | 4.166 | 0.068 | n/a | 0.655 | 8.810 | n/a | n/a | 0.043 | 9.162 | 0.354 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000132 | 24.461 | 1.959 | n/a | 0.000 | 0.188 | 0.801 | 1.177 | 0.021 | n/a | 0.464 | 19.826 | n/a | n/a | 0.026 | 2.147 | 0.088 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.736 | 0.177 | 0.000 | 0.376 | 1.959 | n/a | 0.000 | 0.560 | 0.874 | 1.582 | 0.024 | n/a | 0.210 | 9.687 | n/a | n/a | 0.025 | 2.290 | 0.165 | 0.025 |
| p99 | 38.996 | 1.017 | 0.000 | 0.726 | 3.763 | n/a | 0.000 | 0.960 | 4.261 | 5.024 | 0.208 | n/a | 0.893 | 32.943 | n/a | n/a | 0.053 | 4.426 | 0.274 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a6000000000000012c | 38.996 | 2.068 | n/a | 0.000 | 0.088 | 2.635 | 1.113 | 0.019 | n/a | 0.105 | 32.943 | n/a | n/a | 0.025 | 2.155 | 0.055 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000132 | 24.461 | 1.959 | n/a | 0.000 | 0.188 | 0.801 | 1.177 | 0.021 | n/a | 0.464 | 19.826 | n/a | n/a | 0.026 | 2.147 | 0.088 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000164 | 20.782 | 3.233 | n/a | 0.000 | 0.960 | 2.770 | 2.181 | 0.068 | n/a | 0.210 | 11.310 | n/a | n/a | 0.050 | 4.194 | 0.202 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000130 | 19.520 | 1.810 | n/a | 0.000 | 0.270 | 4.261 | 1.258 | 0.024 | n/a | 0.113 | 11.760 | n/a | n/a | 0.024 | 2.079 | 0.107 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000150 | 18.541 | 2.938 | n/a | 0.000 | 0.490 | 0.861 | 5.024 | 0.023 | n/a | 0.513 | 8.669 | n/a | n/a | 0.022 | 3.427 | 0.185 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000115 | 18.500 | 1.847 | n/a | 0.000 | 0.424 | 0.874 | 4.527 | 0.029 | n/a | 0.114 | 10.658 | n/a | n/a | 0.027 | 2.271 | 0.123 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000117 | 18.384 | 1.764 | n/a | 0.000 | 0.745 | 0.988 | 1.424 | 0.024 | n/a | 0.784 | 12.633 | n/a | n/a | 0.022 | 2.509 | 0.136 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000014c | 17.736 | 2.513 | n/a | 0.000 | 0.743 | 1.006 | 3.620 | 0.023 | n/a | 0.118 | 9.687 | n/a | n/a | 0.025 | 3.257 | 0.184 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000011b | 16.148 | 3.763 | n/a | 0.000 | 0.663 | 1.299 | 1.716 | 0.027 | n/a | 0.603 | 8.025 | n/a | n/a | 0.053 | 4.426 | 0.274 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000124 | 15.653 | 2.311 | n/a | 0.000 | 0.917 | 1.195 | 1.828 | 0.054 | n/a | 0.893 | 8.431 | n/a | n/a | 0.025 | 3.227 | 0.206 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000013e | 15.532 | 1.683 | n/a | 0.000 | 0.431 | 0.703 | 1.182 | 0.022 | n/a | 0.449 | 11.038 | n/a | n/a | 0.023 | 2.114 | 0.136 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| c148569f6187c6a6000000000000015a | 14.777 | 1.615 | n/a | 0.000 | 0.675 | 0.592 | 3.895 | 0.022 | n/a | 0.100 | 7.860 | n/a | n/a | 0.019 | 2.290 | 0.155 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000148 | 12.593 | 2.591 | n/a | 0.000 | 0.611 | 0.818 | 0.907 | 0.208 | n/a | 0.108 | 7.324 | n/a | n/a | 0.025 | 3.203 | 0.254 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a60000000000000154 | 12.224 | 1.598 | n/a | 0.000 | 0.414 | 0.760 | 1.582 | 0.024 | n/a | 0.110 | 7.711 | n/a | n/a | 0.024 | 2.012 | 0.165 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a6000000000000012e | 11.704 | 1.521 | n/a | 0.000 | 0.560 | 0.599 | 0.966 | 0.020 | n/a | 0.365 | 7.653 | n/a | n/a | 0.020 | 2.081 | 0.178 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.727 | 0.000 | 0.000 | 0.358 | 1.977 | n/a | 0.000 | 0.670 | 0.586 | 0.957 | 0.012 | n/a | 0.103 | 5.054 | n/a | n/a | 0.014 | 2.832 | 0.275 | 0.014 |
| p99 | 48.826 | 1.996 | 0.022 | 1.062 | 6.174 | n/a | 0.288 | 16.691 | 6.991 | 6.615 | 0.060 | n/a | 3.290 | 29.148 | n/a | n/a | 0.048 | 19.921 | 0.719 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a600000000000001fa | 101.401 | 5.043 | 0.141 | 0.305 | 0.047 | 0.969 | 11.183 | 0.035 | n/a | 0.141 | 83.507 | n/a | n/a | 0.028 | 5.537 | 0.055 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| c148569f6187c6a6000000000000029e | 82.372 | 2.054 | n/a | 0.000 | 1.132 | 43.928 | 0.890 | 0.015 | n/a | 0.057 | 34.267 | n/a | n/a | 0.030 | 3.186 | 0.039 | 0.030 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.087ms; driver.reader-basis.broadcast 0.119ms |
| c148569f6187c6a60000000000000299 | 80.748 | 4.733 | n/a | 0.000 | 1.052 | 0.924 | 2.560 | 0.042 | n/a | 0.092 | 71.311 | n/a | n/a | 0.034 | 5.785 | 0.072 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.201ms; driver.publication.persist-deferred 0.990ms; driver.reader-basis.broadcast 0.119ms |
| c148569f6187c6a6000000000000029d | 74.269 | 2.195 | n/a | 0.000 | 0.881 | 43.968 | 5.124 | 0.019 | n/a | 0.070 | 21.993 | n/a | n/a | 0.019 | 3.076 | 0.041 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.087ms; driver.reader-basis.broadcast 0.119ms |
| c148569f6187c6a60000000000000298 | 74.171 | 2.656 | n/a | 0.000 | 0.481 | 0.581 | 0.910 | 0.014 | n/a | 0.328 | 69.153 | n/a | n/a | 0.048 | 3.137 | 0.042 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.201ms; driver.publication.persist-deferred 0.990ms; driver.reader-basis.broadcast 0.119ms |
| c148569f6187c6a600000000000002a8 | 68.537 | 5.159 | n/a | 0.000 | 49.874 | 0.447 | 0.903 | 0.015 | n/a | 1.276 | 10.849 | n/a | n/a | 0.014 | 55.033 | 0.803 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.780ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.041ms; driver.publication.persist-deferred 1.018ms; driver.publication.persist-deferred 0.998ms |
| c148569f6187c6a60000000000000804 | 64.625 | 1.448 | n/a | 0.000 | 0.906 | 4.503 | 2.148 | 0.025 | n/a | 0.117 | 55.428 | n/a | n/a | 0.050 | 2.354 | 0.036 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.211ms; driver.publication.persist-deferred 3.330ms |
| c148569f6187c6a6000000000000029f | 64.598 | 1.985 | n/a | 0.000 | 0.445 | 27.577 | 0.518 | 0.008 | n/a | 0.026 | 34.000 | n/a | n/a | 0.039 | 2.430 | 0.038 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.087ms; driver.publication.persist-deferred 0.946ms |
| c148569f6187c6a60000000000000494 | 63.503 | 12.637 | n/a | 0.000 | 1.073 | 5.929 | 10.630 | 0.059 | n/a | 8.954 | 24.200 | n/a | n/a | 0.021 | 13.710 | 0.216 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.050ms; driver.publication.persist-deferred 0.850ms |
| c148569f6187c6a60000000000000169 | 62.601 | 5.649 | 0.227 | 0.485 | 0.037 | 1.594 | 14.516 | 0.026 | n/a | 3.406 | 36.646 | n/a | n/a | 0.017 | 6.397 | 0.102 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| c148569f6187c6a60000000000000736 | 62.068 | 1.644 | n/a | 0.000 | 2.170 | 9.401 | 0.907 | 0.019 | n/a | 0.049 | 47.867 | n/a | n/a | 0.011 | 3.815 | 0.061 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 0.917ms; driver.reader-basis.broadcast 0.258ms |
| c148569f6187c6a6000000000000029c | 61.556 | 1.447 | n/a | 0.000 | 0.729 | 0.474 | 0.981 | 0.018 | n/a | 0.295 | 57.592 | n/a | n/a | 0.021 | 2.176 | 0.035 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.214ms; driver.reader-basis.broadcast 0.119ms |
| c148569f6187c6a600000000000002a0 | 61.380 | 2.207 | n/a | 0.000 | 0.857 | 19.237 | 0.533 | 0.011 | n/a | 0.033 | 38.481 | n/a | n/a | 0.020 | 3.064 | 0.050 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.087ms; driver.publication.persist-deferred 1.018ms |
| c148569f6187c6a600000000000002a2 | 61.092 | 2.007 | n/a | 0.000 | 19.281 | 2.150 | 0.825 | 0.009 | n/a | 0.077 | 36.734 | n/a | n/a | 0.009 | 21.288 | 0.348 | 0.009 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.087ms; driver.publication.persist-deferred 1.018ms |
| c148569f6187c6a60000000000000760 | 60.545 | 2.904 | n/a | 0.000 | 41.889 | 2.004 | 1.343 | 0.012 | n/a | 0.347 | 12.037 | n/a | n/a | 0.010 | 44.793 | 0.740 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.928ms; driver.reader-basis.broadcast 1.407ms; driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.205ms; driver.publication.persist-deferred 1.118ms |
| c148569f6187c6a60000000000000734 | 60.178 | 2.416 | n/a | 0.000 | 2.305 | 3.809 | 1.625 | 0.027 | n/a | 0.107 | 49.873 | n/a | n/a | 0.016 | 4.721 | 0.078 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 1.100ms; driver.publication.persist-deferred 0.917ms; driver.reader-basis.broadcast 0.258ms |
| c148569f6187c6a60000000000000354 | 59.843 | 2.434 | n/a | 0.000 | 43.032 | 0.628 | 0.926 | 0.015 | n/a | 0.069 | 12.721 | n/a | n/a | 0.019 | 45.466 | 0.760 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.152ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.074ms; driver.publication.persist-deferred 1.056ms |
| c148569f6187c6a600000000000002a1 | 59.742 | 3.156 | n/a | 0.000 | 1.619 | 17.060 | 0.732 | 0.007 | n/a | 0.023 | 37.138 | n/a | n/a | 0.007 | 4.775 | 0.080 | 0.007 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.087ms; driver.publication.persist-deferred 1.018ms |
| c148569f6187c6a60000000000000737 | 59.675 | 1.955 | n/a | 0.000 | 0.573 | 10.403 | 1.278 | 0.018 | n/a | 0.066 | 45.370 | n/a | n/a | 0.013 | 2.528 | 0.042 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 0.917ms; driver.reader-basis.broadcast 0.258ms |
| c148569f6187c6a60000000000000761 | 58.362 | 5.721 | n/a | 0.000 | 18.236 | 11.461 | 3.461 | 0.053 | n/a | 0.285 | 19.135 | n/a | n/a | 0.010 | 23.957 | 0.410 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 1.407ms; driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.205ms; driver.publication.persist-deferred 1.118ms; driver.publication.persist-deferred 1.098ms |

## P2 / tail / commit / 5-10 facts (2079 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.577 | 0.000 | 0.000 | 0.307 | 1.599 | n/a | 0.000 | 0.698 | 0.570 | 0.815 | 0.012 | n/a | 0.101 | 4.661 | n/a | n/a | 0.014 | 2.439 | 0.264 | 0.014 |
| p99 | 44.031 | 1.637 | 0.021 | 0.643 | 4.605 | n/a | 0.000 | 17.090 | 6.602 | 4.617 | 0.054 | n/a | 3.233 | 26.567 | n/a | n/a | 0.048 | 20.311 | 0.719 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c148569f6187c6a6000000000000029e | 82.372 | 2.054 | n/a | 0.000 | 1.132 | 43.928 | 0.890 | 0.015 | n/a | 0.057 | 34.267 | n/a | n/a | 0.030 | 3.186 | 0.039 | 0.030 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.087ms; driver.reader-basis.broadcast 0.119ms |
| c148569f6187c6a60000000000000298 | 74.171 | 2.656 | n/a | 0.000 | 0.481 | 0.581 | 0.910 | 0.014 | n/a | 0.328 | 69.153 | n/a | n/a | 0.048 | 3.137 | 0.042 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.201ms; driver.publication.persist-deferred 0.990ms; driver.reader-basis.broadcast 0.119ms |
| c148569f6187c6a60000000000000804 | 64.625 | 1.448 | n/a | 0.000 | 0.906 | 4.503 | 2.148 | 0.025 | n/a | 0.117 | 55.428 | n/a | n/a | 0.050 | 2.354 | 0.036 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.211ms; driver.publication.persist-deferred 3.330ms |
| c148569f6187c6a6000000000000029f | 64.598 | 1.985 | n/a | 0.000 | 0.445 | 27.577 | 0.518 | 0.008 | n/a | 0.026 | 34.000 | n/a | n/a | 0.039 | 2.430 | 0.038 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.087ms; driver.publication.persist-deferred 0.946ms |
| c148569f6187c6a60000000000000736 | 62.068 | 1.644 | n/a | 0.000 | 2.170 | 9.401 | 0.907 | 0.019 | n/a | 0.049 | 47.867 | n/a | n/a | 0.011 | 3.815 | 0.061 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 0.917ms; driver.reader-basis.broadcast 0.258ms |
| c148569f6187c6a6000000000000029c | 61.556 | 1.447 | n/a | 0.000 | 0.729 | 0.474 | 0.981 | 0.018 | n/a | 0.295 | 57.592 | n/a | n/a | 0.021 | 2.176 | 0.035 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.214ms; driver.reader-basis.broadcast 0.119ms |
| c148569f6187c6a600000000000002a0 | 61.380 | 2.207 | n/a | 0.000 | 0.857 | 19.237 | 0.533 | 0.011 | n/a | 0.033 | 38.481 | n/a | n/a | 0.020 | 3.064 | 0.050 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.827ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 1.087ms; driver.publication.persist-deferred 1.018ms |
| c148569f6187c6a60000000000000354 | 59.843 | 2.434 | n/a | 0.000 | 43.032 | 0.628 | 0.926 | 0.015 | n/a | 0.069 | 12.721 | n/a | n/a | 0.019 | 45.466 | 0.760 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.152ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.074ms; driver.publication.persist-deferred 1.056ms |
| c148569f6187c6a60000000000000735 | 56.892 | 2.770 | n/a | 0.000 | 1.991 | 2.628 | 2.190 | 0.016 | n/a | 0.066 | 47.223 | n/a | n/a | 0.009 | 4.760 | 0.084 | 0.009 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.100ms; driver.publication.persist-deferred 0.917ms; driver.reader-basis.broadcast 0.258ms |
| c148569f6187c6a600000000000002b2 | 56.523 | 1.909 | n/a | 0.000 | 47.730 | 0.890 | 0.850 | 0.487 | n/a | 0.120 | 4.526 | n/a | n/a | 0.011 | 49.640 | 0.878 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.780ms; driver.publication.persist-deferred 1.070ms; driver.publication.persist-deferred 1.041ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.836ms |
| c148569f6187c6a60000000000000805 | 53.121 | 2.609 | n/a | 0.000 | 6.246 | 1.542 | 1.057 | 0.013 | n/a | 0.117 | 41.508 | n/a | n/a | 0.028 | 8.855 | 0.167 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.211ms |
| c148569f6187c6a600000000000001cc | 53.019 | 1.779 | n/a | 0.000 | 0.165 | 0.796 | 1.256 | 0.024 | n/a | 0.110 | 48.868 | n/a | n/a | 0.022 | 1.944 | 0.037 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c148569f6187c6a600000000000002a7 | 52.402 | 1.461 | n/a | 0.000 | 36.219 | 4.419 | 0.896 | 0.022 | n/a | 0.097 | 9.277 | n/a | n/a | 0.010 | 37.680 | 0.719 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.780ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.018ms; driver.publication.persist-deferred 0.998ms; driver.publication.persist-deferred 0.946ms |
| c148569f6187c6a60000000000000738 | 52.399 | 2.918 | n/a | 0.000 | 1.015 | 4.266 | 3.707 | 0.027 | n/a | 0.071 | 40.358 | n/a | n/a | 0.037 | 3.933 | 0.075 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 0.917ms; driver.reader-basis.broadcast 0.258ms |
| c148569f6187c6a60000000000001108 | 51.852 | 1.511 | n/a | 0.000 | 41.670 | 4.397 | 0.750 | 0.012 | n/a | 0.299 | 3.201 | n/a | n/a | 0.010 | 43.182 | 0.833 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.292ms; driver.publication.persist-deferred 1.075ms; driver.publication.persist-deferred 1.016ms; driver.publication.persist-deferred 0.921ms; driver.publication.persist-deferred 0.790ms |
| c148569f6187c6a600000000000014af | 51.424 | 2.001 | n/a | 0.000 | 40.667 | 0.429 | 0.646 | 0.011 | n/a | 0.056 | 7.600 | n/a | n/a | 0.014 | 42.667 | 0.830 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.458ms; driver.publication.persist-deferred 1.332ms; driver.publication.persist-deferred 1.181ms; driver.publication.persist-deferred 0.866ms; driver.publication.persist-deferred 0.713ms |
| c148569f6187c6a600000000000003df | 49.455 | 1.251 | n/a | 0.000 | 6.622 | 1.078 | 1.974 | 0.068 | n/a | 0.062 | 38.390 | n/a | n/a | 0.010 | 7.873 | 0.159 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.209ms; driver.publication.persist-deferred 1.172ms; driver.publication.persist-deferred 1.029ms; driver.publication.persist-deferred 0.554ms; driver.reader-basis.broadcast 0.398ms |
| c148569f6187c6a600000000000003d9 | 48.336 | 1.299 | n/a | 0.000 | 15.413 | 0.808 | 4.823 | 0.040 | n/a | 0.122 | 25.818 | n/a | n/a | 0.013 | 16.712 | 0.346 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.176ms; driver.publication.persist-deferred 1.172ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.964ms; driver.publication.persist-deferred 0.554ms |
| c148569f6187c6a6000000000000075e | 47.897 | 2.153 | n/a | 0.000 | 33.815 | 2.588 | 0.761 | 0.010 | n/a | 0.260 | 8.294 | n/a | n/a | 0.017 | 35.968 | 0.751 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.928ms; driver.reader-basis.broadcast 1.407ms; driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.205ms; driver.publication.persist-deferred 1.118ms |
| c148569f6187c6a60000000000000352 | 44.142 | 2.091 | n/a | 0.000 | 20.536 | 0.652 | 0.687 | 0.008 | n/a | 0.023 | 20.134 | n/a | n/a | 0.012 | 22.627 | 0.513 | 0.012 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.152ms; driver.publication.persist-deferred 1.056ms; driver.publication.persist-deferred 0.879ms; driver.publication.persist-deferred 0.821ms |

## P1 / warmup / read (1993 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.017 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 292.225 | n/a | n/a | n/a | 0.389 | n/a | 0.000 | 290.298 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.271 | 292.222 | 1.000 | 0.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b635b74ddcfbb69000000000008c99d | 351.795 | 0.066 | n/a | 0.000 | 351.728 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.795 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6b635b74ddcfbb69000000000008c9ab | 351.701 | 0.026 | n/a | 0.000 | 351.674 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.700 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6b635b74ddcfbb69000000000008c99c | 351.699 | 0.165 | n/a | 0.000 | 351.532 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 351.697 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6b635b74ddcfbb69000000000008c9aa | 351.683 | 0.036 | n/a | 0.000 | 351.646 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.682 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6b635b74ddcfbb69000000000008c9a9 | 351.664 | 0.056 | n/a | 0.000 | 351.606 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.663 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000008cd60 | 349.893 | 0.057 | n/a | 0.000 | 349.834 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.891 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000008cd5f | 349.848 | 0.069 | n/a | 0.000 | 349.779 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.848 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000008cd5e | 349.788 | 0.026 | n/a | 0.000 | 349.761 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.787 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000008cd5d | 349.755 | 0.030 | n/a | 0.000 | 349.725 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.754 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000008cd5c | 349.719 | 0.033 | n/a | 0.000 | 349.685 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 349.718 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000008cd5b | 349.628 | 0.190 | n/a | 0.000 | 349.435 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 349.625 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 92c988d566505cce000000000008468a | 348.865 | 0.012 | n/a | 0.000 | 348.852 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 348.864 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 92c988d566505cce0000000000084688 | 348.857 | 0.036 | n/a | 0.000 | 348.820 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 348.856 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 92c988d566505cce0000000000084689 | 348.856 | 0.013 | n/a | 0.000 | 348.842 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 348.855 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 92c988d566505cce0000000000084687 | 348.837 | 0.051 | n/a | 0.000 | 348.785 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 348.836 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 92c988d566505cce0000000000084686 | 348.788 | 0.113 | n/a | 0.000 | 348.672 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 348.785 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 92c988d566505cce000000000000189d | 292.384 | 0.031 | n/a | 0.000 | 292.351 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.382 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 92c988d566505cce000000000000189c | 292.344 | 0.034 | n/a | 0.000 | 292.309 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.343 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 92c988d566505cce000000000000189b | 292.315 | 0.047 | n/a | 0.000 | 292.266 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.313 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 92c988d566505cce000000000000189a | 292.225 | 2.359 | n/a | 0.000 | 289.863 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.222 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1 / read (728 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 270.124 | n/a | n/a | n/a | 0.164 | n/a | 0.000 | 269.949 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.082 | 270.121 | 1.000 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9726492640b63f0000000000101794 | 284.792 | 0.220 | n/a | 0.000 | 284.569 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 284.789 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000011067c | 281.278 | 0.114 | n/a | 0.000 | 281.162 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.276 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f0000000000109a90 | 274.792 | 0.104 | n/a | 0.000 | 274.687 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.790 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| da9726492640b63f00000000000f561d | 274.779 | 0.164 | n/a | 0.000 | 274.612 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.776 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000012e775 | 271.999 | 0.121 | n/a | 0.000 | 271.876 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.997 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f00000000000f6972 | 271.442 | 0.156 | n/a | 0.000 | 271.283 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.439 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| da9726492640b63f00000000000b74ac | 270.800 | 0.092 | n/a | 0.000 | 270.706 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.797 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000013cc10 | 270.124 | 0.173 | n/a | 0.000 | 269.949 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.121 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f00000000001048af | 269.267 | 0.104 | n/a | 0.000 | 269.160 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 269.264 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.039ms |
| da9726492640b63f000000000010b9b3 | 269.135 | 0.137 | n/a | 0.000 | 268.996 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.133 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000013ee22 | 268.874 | 0.200 | n/a | 0.000 | 268.671 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.871 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000011d3a7 | 267.389 | 0.152 | n/a | 0.000 | 267.233 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 267.385 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| da9726492640b63f00000000000d1d13 | 266.975 | 0.266 | n/a | 0.000 | 266.705 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 266.972 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f00000000000b54f5 | 266.554 | 0.225 | n/a | 0.000 | 266.326 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 266.551 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000010c021 | 265.732 | 0.129 | n/a | 0.000 | 265.600 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 265.729 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000010c06b | 262.936 | 0.154 | n/a | 0.000 | 262.779 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.933 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f0000000000109a98 | 159.655 | 0.176 | n/a | 0.000 | 159.472 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 159.648 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000010c071 | 46.179 | 0.329 | n/a | 0.000 | 45.844 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 46.173 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000010c06c | 29.777 | 0.139 | n/a | 0.000 | 29.631 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 29.770 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms; replica.apply-delta 0.033ms |
| da9726492640b63f000000000013ee35 | 7.817 | 0.123 | n/a | 0.000 | 7.692 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 7.815 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L4 / read (1912 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 271.806 | n/a | n/a | n/a | 0.190 | n/a | 0.000 | 271.659 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.100 | 271.803 | 1.000 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 92c988d566505cce00000000000f3e98 | 275.346 | 0.105 | n/a | 0.000 | 275.238 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.343 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| da9726492640b63f00000000001c3af0 | 274.082 | 0.053 | n/a | 0.000 | 274.027 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.080 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f00000000001c3aef | 274.054 | 0.151 | n/a | 0.000 | 273.901 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.051 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 92c988d566505cce00000000000a773c | 273.840 | 0.169 | n/a | 0.000 | 273.668 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.837 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| da9726492640b63f0000000000167be4 | 273.811 | 0.177 | n/a | 0.000 | 273.632 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.808 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f0000000000167be5 | 273.743 | 0.038 | n/a | 0.000 | 273.703 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.741 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 6b635b74ddcfbb6900000000000afe6b | 273.657 | 0.160 | n/a | 0.000 | 273.494 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.654 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| da9726492640b63f0000000000150f39 | 273.423 | 0.032 | n/a | 0.000 | 273.390 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.422 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| da9726492640b63f0000000000150f38 | 273.341 | 0.190 | n/a | 0.000 | 273.148 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.339 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 92c988d566505cce000000000009456d | 273.205 | 0.135 | n/a | 0.000 | 273.066 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.201 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 92c988d566505cce0000000000118c92 | 273.196 | 0.166 | n/a | 0.000 | 273.026 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.193 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 6b635b74ddcfbb69000000000009c6f4 | 272.800 | 0.165 | n/a | 0.000 | 272.632 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.797 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| da9726492640b63f00000000001efd78 | 272.610 | 0.100 | n/a | 0.000 | 272.507 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.607 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| da9726492640b63f00000000001efd7d | 272.558 | 0.019 | n/a | 0.000 | 272.538 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.557 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 6b635b74ddcfbb6900000000000fe115 | 272.302 | 0.190 | n/a | 0.000 | 272.108 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 272.298 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6b635b74ddcfbb6900000000001240ba | 271.985 | 0.115 | n/a | 0.000 | 271.866 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.982 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 6b635b74ddcfbb6900000000000c06b1 | 271.930 | 0.185 | n/a | 0.000 | 271.743 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.928 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000017b630 | 271.849 | 0.019 | n/a | 0.000 | 271.829 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.848 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 92c988d566505cce00000000000b8307 | 271.846 | 0.146 | n/a | 0.000 | 271.695 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.842 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| da9726492640b63f000000000017b62f | 271.806 | 0.145 | n/a | 0.000 | 271.659 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.803 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L16 / read (2156 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.026 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 288.344 | n/a | n/a | n/a | 0.153 | n/a | 0.000 | 288.264 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.221 | 288.344 | 1.000 | 0.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da9726492640b63f000000000022cf3f | 310.959 | 0.111 | n/a | 0.000 | 310.844 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 310.955 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| da9726492640b63f000000000022cf60 | 310.301 | 0.013 | n/a | 0.000 | 310.287 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.301 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| da9726492640b63f000000000022cf5f | 310.292 | 0.013 | n/a | 0.000 | 310.278 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.291 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| da9726492640b63f000000000022cf5e | 310.286 | 0.014 | n/a | 0.000 | 310.270 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.285 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| da9726492640b63f000000000022cf5d | 310.269 | 0.015 | n/a | 0.000 | 310.253 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.268 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| da9726492640b63f000000000022cf5c | 310.265 | 0.026 | n/a | 0.000 | 310.239 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.264 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 92c988d566505cce000000000015111b | 309.292 | 0.018 | n/a | 0.000 | 309.273 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.291 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 92c988d566505cce000000000015111a | 309.255 | 0.088 | n/a | 0.000 | 309.165 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.253 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 6b635b74ddcfbb690000000000160fb8 | 309.047 | 0.021 | n/a | 0.000 | 309.023 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.045 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 6b635b74ddcfbb690000000000160fb7 | 309.036 | 0.094 | n/a | 0.000 | 308.939 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.034 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 92c988d566505cce0000000000151133 | 309.005 | 0.027 | n/a | 0.000 | 308.977 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.004 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 92c988d566505cce0000000000151132 | 308.993 | 0.014 | n/a | 0.000 | 308.978 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 308.992 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 92c988d566505cce0000000000151131 | 308.985 | 0.017 | n/a | 0.000 | 308.968 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 308.984 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 6b635b74ddcfbb690000000000160fcb | 308.397 | 0.019 | n/a | 0.000 | 308.376 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 308.395 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 6b635b74ddcfbb690000000000160fcc | 308.393 | 0.018 | n/a | 0.000 | 308.375 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 308.392 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 6b635b74ddcfbb690000000000160fcd | 308.387 | 0.016 | n/a | 0.000 | 308.370 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 308.386 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| da9726492640b63f000000000021c0bf | 288.399 | 0.028 | n/a | 0.000 | 288.371 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.398 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| da9726492640b63f000000000021c0be | 288.379 | 0.112 | n/a | 0.000 | 288.264 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.377 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 92c988d566505cce00000000001408f0 | 288.359 | 0.017 | n/a | 0.000 | 288.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.358 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 92c988d566505cce00000000001408ef | 288.353 | 0.019 | n/a | 0.000 | 288.333 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.352 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |

## P1 / tail / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.030 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.000 | 0.000 | 0.030 |
| p99 | 0.184 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 92c988d566505cce00000000001b4a15 | 0.184 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | uncovered | none observed |
| 6b635b74ddcfbb6900000000001caa97 | 0.077 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | uncovered | none observed |
| 92c988d566505cce00000000001b4a13 | 0.076 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | uncovered | none observed |
| 6b635b74ddcfbb6900000000001caa95 | 0.061 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.061 | 0.000 | 0.000 | 0.061 | uncovered | none observed |
| 92c988d566505cce00000000001b4a16 | 0.044 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.044 | 0.000 | 0.000 | 0.044 | uncovered | none observed |
| 92c988d566505cce00000000001b4a14 | 0.030 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.000 | 0.000 | 0.030 | uncovered | none observed |
| 6b635b74ddcfbb6900000000001caa98 | 0.026 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 0.000 | 0.000 | 0.026 | uncovered | none observed |
| 92c988d566505cce00000000001b4a17 | 0.015 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 | uncovered | none observed |
| 6b635b74ddcfbb6900000000001caa96 | 0.015 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 | uncovered | none observed |
| 6b635b74ddcfbb6900000000001caa99 | 0.011 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 | uncovered | none observed |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.168 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.413 | 200.569 | 0.014 | n/a | 0.087 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 |
| p99 | 205.162 | n/a | n/a | n/a | 16.192 | n/a | 1.631 | 0.000 | 9.755 | 203.851 | 3.845 | n/a | 3.096 | 0.000 | n/a | n/a | 44.079 | 17.443 | 0.234 | 44.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d8983daaa8b5d2940000000000000007 | 205.162 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 203.851 | 0.014 | n/a | 0.127 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-48/journal/page | none observed |
| d8983daaa8b5d2940000000000000f45 | 204.462 | 0.000 | n/a | 0.000 | 0.000 | 0.589 | 203.700 | 0.004 | n/a | 0.092 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-72/journal/page | none observed |
| d8983daaa8b5d2940000000000000005 | 202.871 | 0.000 | n/a | 0.000 | 0.000 | 1.413 | 201.085 | 0.014 | n/a | 0.169 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000006 | 202.265 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 200.954 | 0.011 | n/a | 0.138 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-45/journal/page | none observed |
| d8983daaa8b5d2940000000000000f44 | 201.953 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 200.726 | 0.021 | n/a | 0.073 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-71/journal/page | none observed |
| d8983daaa8b5d2940000000000000f43 | 201.168 | 0.000 | n/a | 0.000 | 0.000 | 0.477 | 200.569 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-41/journal/page | none observed |
| d8983daaa8b5d2940000000000000f4b | 82.237 | 8.983 | n/a | 0.000 | 0.000 | 4.372 | 64.829 | 3.845 | n/a | 0.012 | 0.000 | n/a | n/a | 0.196 | 8.983 | 0.109 | 0.196 | gw-r/thread-45/gateway.admitted-work | none observed |
| d8983daaa8b5d2940000000000000f4a | 77.347 | 14.958 | n/a | 1.631 | 0.000 | 2.651 | 54.806 | 0.016 | n/a | 3.096 | 0.000 | n/a | n/a | 0.188 | 16.589 | 0.214 | 0.188 | gw-r/thread-70/gateway.admitted-work | none observed |
| d8983daaa8b5d2940000000000000f48 | 74.466 | 16.192 | n/a | 1.251 | 0.000 | 3.348 | 53.510 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.157 | 17.443 | 0.234 | 0.157 | gw-r/thread-44/gateway.admitted-work | none observed |
| d8983daaa8b5d2940000000000000f49 | 69.033 | 15.199 | n/a | 0.000 | 0.000 | 9.755 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.079 | 15.199 | 0.220 | 44.079 | node-14/thread-7/socket.wait-first-byte | none observed |
| ee732b19bd17a7130000000000000002 | 67.861 | 0.000 | n/a | 0.000 | 0.000 | 4.637 | 62.578 | 0.120 | n/a | 0.087 | 0.000 | n/a | n/a | 0.438 | 0.000 | 0.000 | 0.438 | gw-r/thread-47/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1007.130 | n/a | n/a | n/a | 0.142 | n/a | 0.000 | 0.000 | 3.134 | 1002.587 | 0.012 | n/a | 0.166 | 0.000 | n/a | n/a | 1.114 | 0.142 | 0.000 | 1.114 |
| p99 | 1021.093 | n/a | n/a | n/a | 0.224 | n/a | 0.000 | 0.000 | 14.213 | 1005.096 | 0.018 | n/a | 0.298 | 0.000 | n/a | n/a | 1.245 | 0.224 | 0.000 | 1.245 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee732b19bd17a7130000000000000017 | 1021.093 | 0.224 | n/a | 0.000 | 0.000 | 14.213 | 1005.096 | 0.018 | n/a | 0.298 | 0.000 | n/a | n/a | 1.245 | 0.224 | 0.000 | 1.245 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a7130000000000000018 | 1007.130 | 0.136 | n/a | 0.000 | 0.000 | 3.134 | 1002.587 | 0.012 | n/a | 0.166 | 0.000 | n/a | n/a | 1.096 | 0.136 | 0.000 | 1.096 | gw-r/thread-41/journal/page | none observed |
| ee732b19bd17a7130000000000000019 | 1002.745 | 0.142 | n/a | 0.000 | 0.000 | 0.459 | 1000.927 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 1.114 | 0.142 | 0.000 | 1.114 | gw-r/thread-43/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 441.606 | n/a | n/a | n/a | 2.347 | n/a | 0.000 | 0.000 | 1.018 | 435.305 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.085 | 2.347 | 0.007 | 0.085 |
| p99 | 1003.733 | n/a | n/a | n/a | 30.009 | n/a | 9.872 | 0.000 | 10.748 | 1000.855 | 0.187 | n/a | 0.197 | 0.000 | n/a | n/a | 23.647 | 30.009 | 0.602 | 23.647 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee732b19bd17a7130000000000000029 | 1003.733 | 6.447 | n/a | 0.000 | 0.000 | 0.824 | 996.161 | 0.013 | n/a | 0.102 | 0.000 | n/a | n/a | 0.185 | 6.447 | 0.006 | 0.185 | gw-r/thread-59/journal/page | none observed |
| ee732b19bd17a7130000000000000030 | 1002.854 | 0.132 | n/a | 0.000 | 0.000 | 0.577 | 1000.855 | 0.051 | n/a | 0.136 | 0.000 | n/a | n/a | 1.104 | 0.132 | 0.000 | 1.104 | gw-r/thread-63/journal/page | none observed |
| ee732b19bd17a7130000000000000045 | 1002.619 | 2.602 | n/a | 0.000 | 0.000 | 2.470 | 997.332 | 0.019 | n/a | 0.118 | 0.000 | n/a | n/a | 0.078 | 2.602 | 0.003 | 0.078 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a713000000000000002f | 992.395 | 2.248 | n/a | 0.000 | 0.000 | 2.542 | 987.426 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.085 | 2.248 | 0.002 | 0.085 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a7130000000000000023 | 988.166 | 2.633 | n/a | 0.000 | 0.000 | 3.332 | 981.990 | 0.016 | n/a | 0.116 | 0.000 | n/a | n/a | 0.079 | 2.633 | 0.003 | 0.079 | gw-r/thread-67/journal/page | none observed |
| ee732b19bd17a7130000000000000020 | 908.712 | 2.459 | n/a | 0.000 | 0.000 | 0.763 | 905.154 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.227 | 2.459 | 0.003 | 0.227 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a7130000000000000037 | 875.199 | 11.516 | n/a | 9.872 | 0.000 | 0.582 | 852.939 | 0.014 | n/a | 0.091 | 0.000 | n/a | n/a | 0.186 | 21.388 | 0.024 | 0.186 | gw-r/thread-63/journal/page | none observed |
| ee732b19bd17a713000000000000001d | 872.915 | 2.091 | n/a | 0.000 | 0.000 | 1.584 | 868.857 | 0.019 | n/a | 0.197 | 0.000 | n/a | n/a | 0.169 | 2.091 | 0.002 | 0.169 | gw-r/thread-67/journal/page | none observed |
| ee732b19bd17a7130000000000000040 | 806.229 | 2.782 | n/a | 0.000 | 0.000 | 0.978 | 802.285 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.085 | 2.782 | 0.003 | 0.085 | gw-r/thread-66/journal/page | none observed |
| ee732b19bd17a7130000000000000028 | 586.899 | 2.333 | n/a | 0.000 | 0.000 | 3.274 | 581.073 | 0.011 | n/a | 0.130 | 0.000 | n/a | n/a | 0.078 | 2.333 | 0.004 | 0.078 | gw-r/thread-64/journal/page | none observed |
| ee732b19bd17a713000000000000003f | 552.435 | 2.187 | n/a | 0.000 | 0.000 | 3.253 | 546.842 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.075 | 2.187 | 0.004 | 0.075 | gw-r/thread-41/journal/page | none observed |
| ee732b19bd17a7130000000000000035 | 514.275 | 3.676 | n/a | 0.000 | 0.000 | 2.613 | 507.709 | 0.037 | n/a | 0.153 | 0.000 | n/a | n/a | 0.086 | 3.676 | 0.007 | 0.086 | gw-r/thread-59/journal/page | none observed |
| ee732b19bd17a713000000000000003a | 496.606 | 2.023 | n/a | 0.000 | 0.000 | 0.647 | 493.723 | 0.012 | n/a | 0.120 | 0.000 | n/a | n/a | 0.081 | 2.023 | 0.004 | 0.081 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a713000000000000003b | 494.373 | 2.301 | n/a | 0.000 | 0.000 | 1.708 | 490.191 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.085 | 2.301 | 0.005 | 0.085 | gw-r/thread-45/journal/page | none observed |
| ee732b19bd17a713000000000000003d | 454.058 | 2.028 | n/a | 0.000 | 0.000 | 0.944 | 450.934 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.080 | 2.028 | 0.004 | 0.080 | gw-r/thread-67/journal/page | none observed |
| ee732b19bd17a713000000000000002b | 441.606 | 2.629 | n/a | 0.000 | 0.000 | 3.424 | 435.305 | 0.022 | n/a | 0.145 | 0.000 | n/a | n/a | 0.081 | 2.629 | 0.006 | 0.081 | gw-r/thread-63/journal/page | none observed |
| ee732b19bd17a713000000000000001c | 315.958 | 9.284 | n/a | 0.000 | 0.000 | 0.689 | 305.653 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.222 | 9.284 | 0.029 | 0.222 | gw-r/thread-45/journal/page | none observed |
| ee732b19bd17a7130000000000000026 | 310.902 | 7.278 | n/a | 0.000 | 0.000 | 1.300 | 302.115 | 0.011 | n/a | 0.112 | 0.000 | n/a | n/a | 0.086 | 7.278 | 0.023 | 0.086 | gw-r/thread-45/journal/page | none observed |
| ee732b19bd17a713000000000000002a | 297.628 | 6.524 | n/a | 0.000 | 0.000 | 0.781 | 290.133 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.098 | 6.524 | 0.022 | 0.098 | gw-r/thread-66/journal/page | none observed |
| ee732b19bd17a713000000000000002e | 262.827 | 2.384 | n/a | 0.000 | 0.000 | 2.433 | 257.813 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.081 | 2.384 | 0.009 | 0.081 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 467.290 | n/a | n/a | n/a | 3.149 | n/a | 0.000 | 0.000 | 0.748 | 455.561 | 0.013 | n/a | 0.079 | 0.000 | n/a | n/a | 0.092 | 3.149 | 0.008 | 0.092 |
| p99 | 1005.677 | n/a | n/a | n/a | 10.087 | n/a | 0.828 | 0.000 | 4.102 | 1003.250 | 0.161 | n/a | 0.180 | 0.000 | n/a | n/a | 32.506 | 10.087 | 0.297 | 32.506 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee732b19bd17a7130000000000000081 | 1005.677 | 0.114 | n/a | 0.000 | 0.000 | 1.107 | 1003.250 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 1.113 | 0.114 | 0.000 | 1.113 | gw-r/thread-43/journal/page | none observed |
| ee732b19bd17a7130000000000000079 | 1004.913 | 3.669 | n/a | 0.000 | 0.000 | 0.791 | 1000.239 | 0.034 | n/a | 0.114 | 0.000 | n/a | n/a | 0.065 | 3.669 | 0.004 | 0.065 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a7130000000000000047 | 997.432 | 2.249 | n/a | 0.000 | 0.000 | 0.475 | 994.524 | 0.013 | n/a | 0.097 | 0.000 | n/a | n/a | 0.075 | 2.249 | 0.002 | 0.075 | gw-r/thread-47/journal/page | none observed |
| ee732b19bd17a713000000000000004e | 995.602 | 2.204 | n/a | 0.000 | 0.000 | 0.941 | 992.228 | 0.023 | n/a | 0.129 | 0.000 | n/a | n/a | 0.077 | 2.204 | 0.002 | 0.077 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a713000000000000004d | 994.966 | 2.420 | n/a | 0.000 | 0.000 | 0.660 | 991.719 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.086 | 2.420 | 0.002 | 0.086 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a7130000000000000072 | 990.954 | 2.219 | n/a | 0.000 | 0.000 | 0.722 | 987.884 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.064 | 2.219 | 0.002 | 0.064 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a7130000000000000046 | 988.817 | 2.105 | n/a | 0.000 | 0.000 | 0.618 | 985.936 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.080 | 2.105 | 0.002 | 0.080 | gw-r/thread-66/journal/page | none observed |
| ee732b19bd17a7130000000000000053 | 977.709 | 4.080 | n/a | 0.000 | 0.000 | 0.748 | 972.657 | 0.027 | n/a | 0.113 | 0.000 | n/a | n/a | 0.084 | 4.080 | 0.004 | 0.084 | gw-r/thread-41/journal/page | none observed |
| ee732b19bd17a7130000000000000075 | 956.138 | 2.153 | n/a | 0.000 | 0.000 | 0.677 | 953.139 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 0.062 | 2.153 | 0.002 | 0.062 | gw-r/thread-47/journal/page | none observed |
| ee732b19bd17a7130000000000000054 | 875.938 | 3.322 | n/a | 0.000 | 0.000 | 2.325 | 870.113 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.087 | 3.322 | 0.004 | 0.087 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a7130000000000000052 | 873.816 | 2.118 | n/a | 0.000 | 0.000 | 1.138 | 870.282 | 0.034 | n/a | 0.160 | 0.000 | n/a | n/a | 0.083 | 2.118 | 0.002 | 0.083 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a7130000000000000076 | 852.005 | 4.216 | n/a | 0.000 | 0.000 | 1.076 | 846.510 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.115 | 4.216 | 0.005 | 0.115 | gw-r/thread-41/journal/page | none observed |
| ee732b19bd17a7130000000000000059 | 744.718 | 2.198 | n/a | 0.000 | 0.000 | 0.581 | 741.732 | 0.021 | n/a | 0.109 | 0.000 | n/a | n/a | 0.076 | 2.198 | 0.003 | 0.076 | gw-r/thread-67/journal/page | none observed |
| ee732b19bd17a713000000000000005f | 684.676 | 3.920 | n/a | 0.000 | 0.000 | 1.044 | 679.498 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.129 | 3.920 | 0.006 | 0.129 | gw-r/thread-47/journal/page | none observed |
| ee732b19bd17a713000000000000006f | 661.167 | 3.565 | n/a | 0.000 | 0.000 | 0.917 | 656.520 | 0.017 | n/a | 0.083 | 0.000 | n/a | n/a | 0.065 | 3.565 | 0.005 | 0.065 | gw-r/thread-41/journal/page | none observed |
| ee732b19bd17a7130000000000000051 | 595.200 | 2.231 | n/a | 0.000 | 0.000 | 0.923 | 591.883 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.075 | 2.231 | 0.004 | 0.075 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a713000000000000004f | 572.293 | 4.554 | n/a | 0.000 | 0.000 | 2.039 | 565.483 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.126 | 4.554 | 0.008 | 0.126 | gw-r/thread-63/journal/page | none observed |
| ee732b19bd17a713000000000000005c | 514.269 | 4.500 | n/a | 0.000 | 0.000 | 0.672 | 508.919 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.085 | 4.500 | 0.009 | 0.085 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a7130000000000000048 | 492.894 | 4.105 | n/a | 0.000 | 0.000 | 0.823 | 487.709 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.142 | 4.105 | 0.008 | 0.142 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a713000000000000005a | 477.103 | 2.629 | n/a | 0.000 | 0.000 | 0.586 | 473.672 | 0.015 | n/a | 0.085 | 0.000 | n/a | n/a | 0.116 | 2.629 | 0.006 | 0.116 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 365.547 | n/a | n/a | n/a | 2.397 | n/a | 0.000 | 0.000 | 0.999 | 358.253 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.079 | 2.397 | 0.009 | 0.079 |
| p99 | 1013.188 | n/a | n/a | n/a | 11.530 | n/a | 0.000 | 0.000 | 3.866 | 1004.850 | 2.858 | n/a | 0.607 | 0.000 | n/a | n/a | 42.576 | 11.530 | 0.210 | 42.576 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee732b19bd17a71300000000000000a0 | 1013.188 | 0.126 | n/a | 0.000 | 0.000 | 0.822 | 1002.289 | 0.009 | n/a | 0.106 | 0.000 | n/a | n/a | 9.835 | 0.126 | 0.000 | 9.835 | gw-r/thread-67/journal/page | none observed |
| ee732b19bd17a7130000000000000089 | 1007.229 | 0.183 | n/a | 0.000 | 0.000 | 3.418 | 1002.144 | 0.045 | n/a | 0.151 | 0.000 | n/a | n/a | 1.289 | 0.183 | 0.000 | 1.289 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a7130000000000000092 | 1007.157 | 0.118 | n/a | 0.000 | 0.000 | 0.910 | 1004.850 | 0.016 | n/a | 0.146 | 0.000 | n/a | n/a | 1.117 | 0.118 | 0.000 | 1.117 | gw-r/thread-46/journal/page | none observed |
| ee732b19bd17a71300000000000000ae | 1003.282 | 0.190 | n/a | 0.000 | 0.000 | 1.054 | 1000.801 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 1.174 | 0.190 | 0.000 | 1.174 | gw-r/thread-45/journal/page | none observed |
| ee732b19bd17a713000000000000009c | 994.205 | 2.703 | n/a | 0.000 | 0.000 | 2.324 | 989.027 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.071 | 2.703 | 0.003 | 0.071 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a71300000000000000a2 | 982.722 | 2.159 | n/a | 0.000 | 0.000 | 3.212 | 977.185 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.063 | 2.159 | 0.002 | 0.063 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a71300000000000000b7 | 915.965 | 4.582 | n/a | 0.000 | 0.000 | 1.563 | 909.648 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.125 | 4.582 | 0.005 | 0.125 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a7130000000000000086 | 902.591 | 2.079 | n/a | 0.000 | 0.000 | 1.406 | 898.943 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.079 | 2.079 | 0.002 | 0.079 | gw-r/thread-47/journal/page | none observed |
| ee732b19bd17a713000000000000009d | 825.017 | 11.530 | n/a | 0.000 | 0.000 | 1.138 | 811.603 | 0.015 | n/a | 0.607 | 0.000 | n/a | n/a | 0.123 | 11.530 | 0.014 | 0.123 | gw-r/thread-46/journal/page | none observed |
| ee732b19bd17a71300000000000000ab | 756.868 | 3.945 | n/a | 0.000 | 0.000 | 0.717 | 752.040 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.096 | 3.945 | 0.005 | 0.096 | gw-r/thread-67/journal/page | none observed |
| ee732b19bd17a7130000000000000083 | 752.763 | 5.672 | n/a | 0.000 | 0.000 | 0.383 | 746.487 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.128 | 5.672 | 0.008 | 0.128 | gw-r/thread-45/journal/page | none observed |
| ee732b19bd17a7130000000000000094 | 700.505 | 2.022 | n/a | 0.000 | 0.000 | 0.647 | 697.656 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.077 | 2.022 | 0.003 | 0.077 | gw-r/thread-63/journal/page | none observed |
| ee732b19bd17a71300000000000000c0 | 685.597 | 2.397 | n/a | 0.000 | 0.000 | 0.422 | 682.669 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.064 | 2.397 | 0.003 | 0.064 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a71300000000000000b9 | 681.440 | 3.392 | n/a | 0.000 | 0.000 | 2.641 | 675.261 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.076 | 3.392 | 0.005 | 0.076 | gw-r/thread-67/journal/page | none observed |
| ee732b19bd17a71300000000000000b4 | 653.563 | 2.205 | n/a | 0.000 | 0.000 | 0.938 | 650.295 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.055 | 2.205 | 0.003 | 0.055 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a71300000000000000a9 | 642.856 | 4.629 | n/a | 0.000 | 0.000 | 0.432 | 637.688 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.069 | 4.629 | 0.007 | 0.069 | gw-r/thread-46/journal/page | none observed |
| ee732b19bd17a71300000000000000b0 | 620.249 | 6.791 | n/a | 0.000 | 0.000 | 2.346 | 610.938 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.117 | 6.791 | 0.011 | 0.117 | gw-r/thread-47/journal/page | none observed |
| ee732b19bd17a713000000000000009b | 618.996 | 2.057 | n/a | 0.000 | 0.000 | 1.468 | 615.326 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.070 | 2.057 | 0.003 | 0.070 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a71300000000000000a5 | 608.077 | 3.623 | n/a | 0.000 | 0.000 | 1.029 | 603.285 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.084 | 3.623 | 0.006 | 0.084 | gw-r/thread-67/journal/page | none observed |
| ee732b19bd17a71300000000000000a3 | 416.572 | 1.988 | n/a | 0.000 | 0.000 | 1.362 | 413.107 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.064 | 1.988 | 0.005 | 0.064 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 469.772 | n/a | n/a | n/a | 2.314 | n/a | 0.000 | 0.000 | 1.030 | 463.306 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.066 | 2.314 | 0.007 | 0.066 |
| p99 | 1011.543 | n/a | n/a | n/a | 9.400 | n/a | 0.771 | 0.000 | 8.733 | 1001.541 | 0.032 | n/a | 0.097 | 0.000 | n/a | n/a | 12.168 | 9.400 | 0.527 | 12.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee732b19bd17a71300000000000000fd | 1011.543 | 8.996 | n/a | 0.000 | 0.000 | 0.877 | 1001.541 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.069 | 8.996 | 0.009 | 0.069 | gw-r/thread-59/journal/page | none observed |
| ee732b19bd17a71300000000000000cb | 1007.376 | 2.185 | n/a | 0.000 | 0.000 | 3.915 | 1001.145 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.062 | 2.185 | 0.002 | 0.062 | gw-r/thread-63/journal/page | none observed |
| ee732b19bd17a71300000000000000f5 | 1004.399 | 0.152 | n/a | 0.000 | 0.000 | 2.087 | 1000.958 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 1.127 | 0.152 | 0.000 | 1.127 | gw-r/thread-66/journal/page | none observed |
| ee732b19bd17a71300000000000000db | 1003.369 | 0.123 | n/a | 0.000 | 0.000 | 0.947 | 1001.114 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 1.102 | 0.123 | 0.000 | 1.102 | gw-r/thread-66/journal/page | none observed |
| ee732b19bd17a71300000000000000e5 | 999.349 | 2.160 | n/a | 0.000 | 0.000 | 2.184 | 994.878 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.063 | 2.160 | 0.002 | 0.063 | gw-r/thread-47/journal/page | none observed |
| ee732b19bd17a71300000000000000fc | 996.141 | 2.253 | n/a | 0.000 | 0.000 | 0.601 | 993.151 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.103 | 2.253 | 0.002 | 0.103 | gw-r/thread-43/journal/page | none observed |
| ee732b19bd17a71300000000000000eb | 882.082 | 2.179 | n/a | 0.000 | 0.000 | 2.698 | 877.110 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.066 | 2.179 | 0.002 | 0.066 | gw-r/thread-43/journal/page | none observed |
| ee732b19bd17a71300000000000000cc | 793.005 | 1.882 | n/a | 0.000 | 0.000 | 0.955 | 790.052 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.069 | 1.882 | 0.002 | 0.069 | gw-r/thread-46/journal/page | none observed |
| ee732b19bd17a71300000000000000d1 | 757.530 | 3.387 | n/a | 0.000 | 0.000 | 2.671 | 751.369 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.061 | 3.387 | 0.004 | 0.061 | gw-r/thread-63/journal/page | none observed |
| ee732b19bd17a71300000000000000f0 | 712.241 | 2.161 | n/a | 0.000 | 0.000 | 1.283 | 708.700 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.058 | 2.161 | 0.003 | 0.058 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a71300000000000000c6 | 652.873 | 1.715 | n/a | 0.000 | 0.000 | 0.741 | 650.262 | 0.019 | n/a | 0.065 | 0.000 | n/a | n/a | 0.070 | 1.715 | 0.003 | 0.070 | gw-r/thread-64/journal/page | none observed |
| ee732b19bd17a71300000000000000dd | 605.095 | 6.431 | n/a | 0.771 | 0.000 | 0.665 | 597.022 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.120 | 7.201 | 0.012 | 0.120 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a71300000000000000e4 | 586.187 | 4.081 | n/a | 0.000 | 0.000 | 1.210 | 580.790 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.064 | 4.081 | 0.007 | 0.064 | gw-r/thread-41/journal/page | none observed |
| ee732b19bd17a71300000000000000fa | 558.012 | 5.270 | n/a | 0.000 | 0.000 | 1.268 | 551.365 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 5.270 | 0.009 | 0.062 | gw-r/thread-47/journal/page | none observed |
| ee732b19bd17a71300000000000000ee | 526.360 | 6.077 | n/a | 0.000 | 0.000 | 3.688 | 516.459 | 0.021 | n/a | 0.047 | 0.000 | n/a | n/a | 0.069 | 6.077 | 0.012 | 0.069 | gw-r/thread-46/journal/page | none observed |
| ee732b19bd17a7130000000000000100 | 509.896 | 3.196 | n/a | 0.000 | 0.000 | 0.765 | 505.768 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.114 | 3.196 | 0.006 | 0.114 | gw-r/thread-43/journal/page | none observed |
| ee732b19bd17a71300000000000000e8 | 502.598 | 2.499 | n/a | 0.000 | 0.000 | 0.757 | 499.218 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.060 | 2.499 | 0.005 | 0.060 | gw-r/thread-59/journal/page | none observed |
| ee732b19bd17a71300000000000000f3 | 499.330 | 2.346 | n/a | 0.000 | 0.000 | 2.019 | 494.859 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.063 | 2.346 | 0.005 | 0.063 | gw-r/thread-59/journal/page | none observed |
| ee732b19bd17a71300000000000000f2 | 492.123 | 1.968 | n/a | 0.000 | 0.000 | 0.548 | 489.496 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.071 | 1.968 | 0.004 | 0.071 | gw-r/thread-47/journal/page | none observed |
| ee732b19bd17a71300000000000000fe | 490.640 | 2.186 | n/a | 0.000 | 0.000 | 1.295 | 487.024 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.066 | 2.186 | 0.004 | 0.066 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / internal (3111 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.502 | n/a | n/a | n/a | 4.146 | n/a | 0.000 | 0.000 | 0.239 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.823 | 4.168 | 0.331 | 5.823 |
| p99 | 808.998 | n/a | n/a | n/a | 19.109 | n/a | 1.410 | 0.000 | 1.890 | 804.532 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 47.391 | 20.072 | 0.854 | 47.391 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ee732b19bd17a7130000000000000189 | 1004.479 | 5.006 | n/a | 0.467 | 0.000 | 0.716 | 998.179 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.068 | 5.472 | 0.005 | 0.068 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a7130000000000000101 | 1003.727 | 0.162 | n/a | 0.000 | 0.000 | 0.806 | 1000.770 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 1.930 | 0.162 | 0.000 | 1.930 | gw-r/thread-45/journal/page | none observed |
| ee732b19bd17a713000000000000019a | 1002.781 | 2.520 | n/a | 0.000 | 0.000 | 0.359 | 999.779 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.070 | 2.520 | 0.003 | 0.070 | gw-r/thread-63/journal/page | none observed |
| ee732b19bd17a71300000000000019ed | 1002.535 | 2.692 | n/a | 0.000 | 0.000 | 0.405 | 999.336 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.055 | 2.692 | 0.003 | 0.055 | gw-r/thread-64/journal/page | none observed |
| ee732b19bd17a7130000000000000174 | 1002.435 | 0.121 | n/a | 0.000 | 0.000 | 0.602 | 1000.570 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.096 | 0.121 | 0.000 | 1.096 | gw-r/thread-47/journal/page | none observed |
| ee732b19bd17a7130000000000001a38 | 1002.091 | 0.135 | n/a | 0.000 | 0.000 | 0.423 | 1000.375 | 0.035 | n/a | 0.016 | 0.000 | n/a | n/a | 1.107 | 0.135 | 0.000 | 1.107 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a71300000000000019f1 | 1001.906 | 3.265 | n/a | 0.000 | 0.000 | 0.292 | 998.247 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.063 | 3.265 | 0.003 | 0.063 | gw-r/thread-41/journal/page | none observed |
| ee732b19bd17a713000000000000018e | 1001.521 | 2.343 | n/a | 0.000 | 0.000 | 0.437 | 998.620 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.059 | 2.343 | 0.002 | 0.059 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a713000000000000018d | 1000.928 | 2.428 | n/a | 0.000 | 0.000 | 0.445 | 997.950 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.065 | 2.428 | 0.002 | 0.065 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a713000000000000013a | 1000.787 | 2.157 | n/a | 0.000 | 0.000 | 0.747 | 997.783 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.057 | 2.157 | 0.002 | 0.057 | gw-r/thread-41/journal/page | none observed |
| ee732b19bd17a7130000000000001a34 | 1000.172 | 5.044 | n/a | 0.000 | 0.000 | 0.439 | 994.547 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.116 | 5.044 | 0.005 | 0.116 | gw-r/thread-65/journal/page | none observed |
| ee732b19bd17a713000000000000011e | 999.206 | 2.687 | n/a | 0.000 | 0.000 | 0.552 | 995.871 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.060 | 2.687 | 0.003 | 0.060 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a713000000000000013b | 998.947 | 4.527 | n/a | 0.000 | 0.000 | 0.774 | 993.497 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.116 | 4.527 | 0.005 | 0.116 | gw-r/thread-66/journal/page | none observed |
| ee732b19bd17a7130000000000000188 | 996.326 | 2.344 | n/a | 0.000 | 0.000 | 0.742 | 993.085 | 0.005 | n/a | 0.083 | 0.000 | n/a | n/a | 0.067 | 2.344 | 0.002 | 0.067 | gw-r/thread-48/journal/page | none observed |
| ee732b19bd17a7130000000000000111 | 982.758 | 3.605 | n/a | 0.000 | 0.000 | 0.720 | 978.283 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.103 | 3.605 | 0.004 | 0.103 | gw-r/thread-44/journal/page | none observed |
| ee732b19bd17a713000000000000011d | 982.500 | 2.302 | n/a | 0.000 | 0.000 | 0.743 | 979.356 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.063 | 2.302 | 0.002 | 0.063 | gw-r/thread-45/journal/page | none observed |
| ee732b19bd17a7130000000000000160 | 981.232 | 3.802 | n/a | 0.333 | 0.000 | 0.777 | 976.198 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.084 | 4.135 | 0.004 | 0.084 | gw-r/thread-45/journal/page | none observed |
| ee732b19bd17a71300000000000019ee | 954.947 | 10.007 | n/a | 0.000 | 0.000 | 1.111 | 943.457 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.330 | 10.007 | 0.010 | 0.330 | gw-r/thread-63/journal/page | none observed |
| ee732b19bd17a71300000000000019f6 | 946.194 | 7.990 | n/a | 0.000 | 0.000 | 0.652 | 937.465 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.061 | 7.990 | 0.008 | 0.061 | gw-r/thread-46/journal/page | none observed |
| ee732b19bd17a713000000000000018f | 940.430 | 1.935 | n/a | 0.000 | 0.000 | 0.990 | 937.394 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.062 | 1.935 | 0.002 | 0.062 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.407 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 201.103 | 0.015 | n/a | 0.131 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 211.285 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.302 | 206.605 | 6.207 | n/a | 4.129 | 0.000 | n/a | n/a | 0.635 | 0.000 | 0.000 | 0.635 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d8983daaa8b5d294000000000000000b | 211.285 | 0.000 | n/a | 0.000 | 0.000 | 4.381 | 206.605 | 0.031 | n/a | 0.168 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000031 | 209.582 | 0.000 | n/a | 0.000 | 0.000 | 7.302 | 201.819 | 0.016 | n/a | 0.330 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-65/journal/page | none observed |
| d8983daaa8b5d294000000000000002d | 208.155 | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 206.391 | 0.016 | n/a | 0.463 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| d8983daaa8b5d2940000000000000025 | 207.825 | 0.000 | n/a | 0.000 | 0.000 | 4.556 | 202.896 | 0.019 | n/a | 0.197 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| d8983daaa8b5d2940000000000000053 | 207.511 | 0.000 | n/a | 0.000 | 0.000 | 2.177 | 205.043 | 0.020 | n/a | 0.162 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-59/journal/page | none observed |
| d8983daaa8b5d2940000000000000020 | 206.799 | 0.000 | n/a | 0.000 | 0.000 | 1.440 | 201.040 | 0.078 | n/a | 4.129 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-41/journal/page | none observed |
| d8983daaa8b5d2940000000000000036 | 206.632 | 0.000 | n/a | 0.000 | 0.000 | 5.313 | 201.043 | 0.012 | n/a | 0.144 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000052 | 206.153 | 0.000 | n/a | 0.000 | 0.000 | 2.358 | 203.493 | 0.012 | n/a | 0.129 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-63/journal/page | none observed |
| d8983daaa8b5d2940000000000000026 | 205.735 | 0.000 | n/a | 0.000 | 0.000 | 3.713 | 201.698 | 0.012 | n/a | 0.127 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000013 | 205.707 | 0.000 | n/a | 0.000 | 0.000 | 4.028 | 201.348 | 0.019 | n/a | 0.217 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| d8983daaa8b5d2940000000000000021 | 205.579 | 0.000 | n/a | 0.000 | 0.000 | 2.974 | 201.482 | 0.018 | n/a | 0.471 | 0.000 | n/a | n/a | 0.635 | 0.000 | 0.000 | 0.635 | gw-r/thread-63/journal/page | none observed |
| d8983daaa8b5d2940000000000000048 | 205.455 | 0.000 | n/a | 0.000 | 0.000 | 3.764 | 201.405 | 0.018 | n/a | 0.165 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-64/journal/page | none observed |
| d8983daaa8b5d294000000000000003e | 205.315 | 0.000 | n/a | 0.000 | 0.000 | 1.925 | 203.126 | 0.015 | n/a | 0.129 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d294000000000000001a | 205.150 | 0.000 | n/a | 0.000 | 0.000 | 3.872 | 200.965 | 0.012 | n/a | 0.151 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-59/journal/page | none observed |
| d8983daaa8b5d294000000000000000f | 205.128 | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 203.737 | 0.012 | n/a | 0.155 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-63/journal/page | none observed |
| d8983daaa8b5d2940000000000000023 | 205.057 | 0.000 | n/a | 0.000 | 0.000 | 3.614 | 201.103 | 0.027 | n/a | 0.211 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d2940000000000000009 | 204.996 | 0.000 | n/a | 0.000 | 0.000 | 2.874 | 201.602 | 0.012 | n/a | 0.130 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000042 | 204.976 | 0.000 | n/a | 0.000 | 0.000 | 2.707 | 201.612 | 0.021 | n/a | 0.524 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-66/journal/page | none observed |
| d8983daaa8b5d2940000000000000059 | 204.702 | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 203.256 | 0.011 | n/a | 0.117 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-64/journal/page | none observed |
| d8983daaa8b5d2940000000000000015 | 204.558 | 0.000 | n/a | 0.000 | 0.000 | 3.099 | 201.146 | 0.018 | n/a | 0.194 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.220 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 200.977 | 0.014 | n/a | 0.110 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 215.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.435 | 211.812 | 17.653 | n/a | 3.350 | 0.000 | n/a | n/a | 50.022 | 0.000 | 0.000 | 50.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d8983daaa8b5d294000000000000007a | 215.011 | 0.000 | n/a | 0.000 | 0.000 | 2.911 | 211.812 | 0.030 | n/a | 0.083 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-67/journal/page | none observed |
| d8983daaa8b5d29400000000000000a9 | 208.400 | 0.000 | n/a | 0.000 | 0.000 | 0.574 | 200.751 | 6.921 | n/a | 0.034 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000088 | 206.387 | 0.000 | n/a | 0.000 | 0.000 | 1.149 | 204.927 | 0.016 | n/a | 0.138 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-43/journal/page | none observed |
| d8983daaa8b5d29400000000000000b9 | 206.070 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 205.284 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-66/journal/page | none observed |
| d8983daaa8b5d29400000000000000bb | 205.611 | 0.000 | n/a | 0.000 | 0.000 | 3.435 | 198.654 | 0.010 | n/a | 3.350 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-44/journal/page | none observed |
| d8983daaa8b5d294000000000000007b | 205.147 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 203.970 | 0.026 | n/a | 0.164 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-66/journal/page | none observed |
| d8983daaa8b5d29400000000000000a2 | 204.710 | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 203.408 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d29400000000000000af | 204.665 | 0.000 | n/a | 0.000 | 0.000 | 1.635 | 201.218 | 1.471 | n/a | 0.136 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-44/journal/page | none observed |
| d8983daaa8b5d2940000000000000073 | 204.326 | 0.000 | n/a | 0.000 | 0.000 | 1.384 | 202.679 | 0.010 | n/a | 0.126 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-64/journal/page | none observed |
| d8983daaa8b5d29400000000000000ae | 204.238 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 203.136 | 0.033 | n/a | 0.110 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-67/journal/page | none observed |
| d8983daaa8b5d29400000000000000b7 | 204.217 | 0.000 | n/a | 0.000 | 0.000 | 2.950 | 201.057 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-65/journal/page | none observed |
| d8983daaa8b5d29400000000000000c2 | 203.822 | 0.000 | n/a | 0.000 | 0.000 | 2.509 | 201.085 | 0.012 | n/a | 0.110 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-66/journal/page | none observed |
| d8983daaa8b5d294000000000000007d | 203.735 | 0.000 | n/a | 0.000 | 0.000 | 1.779 | 201.629 | 0.022 | n/a | 0.184 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-64/journal/page | none observed |
| d8983daaa8b5d2940000000000000064 | 203.697 | 0.000 | n/a | 0.000 | 0.000 | 2.031 | 201.401 | 0.017 | n/a | 0.148 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-63/journal/page | none observed |
| d8983daaa8b5d2940000000000000095 | 203.429 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 202.189 | 0.040 | n/a | 0.182 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d2940000000000000066 | 203.384 | 0.000 | n/a | 0.000 | 0.000 | 1.488 | 199.025 | 0.012 | n/a | 2.701 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-43/journal/page | none observed |
| d8983daaa8b5d294000000000000005f | 203.374 | 0.000 | n/a | 0.000 | 0.000 | 2.418 | 200.743 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-67/journal/page | none observed |
| d8983daaa8b5d29400000000000000b4 | 203.355 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 202.000 | 0.009 | n/a | 0.117 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-59/journal/page | none observed |
| d8983daaa8b5d2940000000000000082 | 203.349 | 0.000 | n/a | 0.000 | 0.000 | 1.526 | 201.510 | 0.031 | n/a | 0.180 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d2940000000000000087 | 203.186 | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 201.613 | 0.020 | n/a | 0.178 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.212 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 200.874 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 211.849 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 10.267 | 205.993 | 17.339 | n/a | 2.454 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d8983daaa8b5d294000000000000010d | 211.849 | 0.000 | n/a | 0.000 | 0.000 | 10.267 | 201.346 | 0.013 | n/a | 0.092 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-43/journal/page | none observed |
| d8983daaa8b5d29400000000000000f9 | 210.958 | 0.000 | n/a | 0.000 | 0.000 | 7.227 | 203.452 | 0.046 | n/a | 0.130 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-41/journal/page | none observed |
| d8983daaa8b5d294000000000000012a | 209.679 | 0.000 | n/a | 0.000 | 0.000 | 8.331 | 201.103 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-64/journal/page | none observed |
| d8983daaa8b5d29400000000000000df | 209.110 | 0.000 | n/a | 0.000 | 0.000 | 7.210 | 201.684 | 0.014 | n/a | 0.098 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000114 | 208.880 | 0.000 | n/a | 0.000 | 0.000 | 7.918 | 200.795 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d29400000000000000e2 | 208.027 | 0.000 | n/a | 0.000 | 0.000 | 7.036 | 200.766 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-43/journal/page | none observed |
| d8983daaa8b5d29400000000000000dd | 207.096 | 0.000 | n/a | 0.000 | 0.000 | 1.707 | 205.164 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| d8983daaa8b5d29400000000000000fe | 206.942 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 205.993 | 0.009 | n/a | 0.095 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000113 | 205.662 | 0.000 | n/a | 0.000 | 0.000 | 4.468 | 201.007 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-65/journal/page | none observed |
| d8983daaa8b5d29400000000000000cc | 205.619 | 0.000 | n/a | 0.000 | 0.000 | 1.627 | 203.747 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d29400000000000000f4 | 205.566 | 0.000 | n/a | 0.000 | 0.000 | 3.666 | 201.594 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-44/journal/page | none observed |
| d8983daaa8b5d29400000000000000ff | 205.509 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 204.461 | 0.005 | n/a | 0.079 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-66/journal/page | none observed |
| d8983daaa8b5d29400000000000000ef | 205.484 | 0.000 | n/a | 0.000 | 0.000 | 1.263 | 203.948 | 0.015 | n/a | 0.123 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-45/journal/page | none observed |
| d8983daaa8b5d294000000000000011e | 205.106 | 0.000 | n/a | 0.000 | 0.000 | 3.995 | 200.929 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-59/journal/page | none observed |
| d8983daaa8b5d29400000000000000d3 | 204.776 | 0.000 | n/a | 0.000 | 0.000 | 3.386 | 201.132 | 0.013 | n/a | 0.116 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-41/journal/page | none observed |
| d8983daaa8b5d29400000000000000c7 | 204.743 | 0.000 | n/a | 0.000 | 0.000 | 1.415 | 202.934 | 0.014 | n/a | 0.115 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 | gw-r/thread-48/journal/page | none observed |
| d8983daaa8b5d29400000000000000d6 | 204.367 | 0.000 | n/a | 0.000 | 0.000 | 3.118 | 200.962 | 0.021 | n/a | 0.113 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-59/journal/page | none observed |
| d8983daaa8b5d2940000000000000120 | 204.022 | 0.000 | n/a | 0.000 | 0.000 | 3.035 | 200.781 | 0.026 | n/a | 0.065 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| d8983daaa8b5d29400000000000000de | 203.999 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 202.816 | 0.022 | n/a | 0.252 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-59/journal/page | none observed |
| d8983daaa8b5d294000000000000011b | 203.527 | 0.000 | n/a | 0.000 | 0.000 | 1.927 | 201.327 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-41/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.734 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 200.777 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 207.184 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.554 | 205.776 | 8.458 | n/a | 0.571 | 0.000 | n/a | n/a | 50.560 | 0.000 | 0.000 | 50.560 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d8983daaa8b5d2940000000000000145 | 207.184 | 0.000 | n/a | 0.000 | 0.000 | 2.232 | 204.757 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-64/journal/page | none observed |
| d8983daaa8b5d294000000000000015d | 206.634 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 205.776 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| d8983daaa8b5d294000000000000016d | 206.614 | 0.000 | n/a | 0.000 | 0.000 | 5.554 | 200.875 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-63/journal/page | none observed |
| d8983daaa8b5d2940000000000000161 | 206.503 | 0.000 | n/a | 0.000 | 0.000 | 3.182 | 203.060 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-66/journal/page | none observed |
| d8983daaa8b5d2940000000000000130 | 205.501 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 204.692 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-63/journal/page | none observed |
| d8983daaa8b5d2940000000000000187 | 205.150 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 204.167 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d294000000000000017a | 204.780 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 203.763 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-41/journal/page | none observed |
| d8983daaa8b5d2940000000000000141 | 204.645 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 203.600 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000180 | 204.495 | 0.000 | n/a | 0.000 | 0.000 | 3.466 | 200.836 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-43/journal/page | none observed |
| d8983daaa8b5d294000000000000015a | 204.300 | 0.000 | n/a | 0.000 | 0.000 | 3.379 | 200.740 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-43/journal/page | none observed |
| d8983daaa8b5d2940000000000000167 | 203.293 | 0.000 | n/a | 0.000 | 0.000 | 2.312 | 200.756 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d2940000000000000174 | 203.281 | 0.000 | n/a | 0.000 | 0.000 | 2.073 | 200.976 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-45/journal/page | none observed |
| d8983daaa8b5d294000000000000015f | 203.171 | 0.000 | n/a | 0.000 | 0.000 | 1.988 | 200.964 | 0.009 | n/a | 0.090 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-65/journal/page | none observed |
| d8983daaa8b5d2940000000000000152 | 202.928 | 0.000 | n/a | 0.000 | 0.000 | 1.457 | 201.220 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000192 | 202.897 | 0.000 | n/a | 0.000 | 0.000 | 1.635 | 201.014 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-66/journal/page | none observed |
| d8983daaa8b5d2940000000000000146 | 202.716 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.394 | 0.005 | n/a | 0.067 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-66/journal/page | none observed |
| d8983daaa8b5d2940000000000000150 | 202.715 | 0.000 | n/a | 0.000 | 0.000 | 1.505 | 200.953 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d2940000000000000151 | 202.697 | 0.000 | n/a | 0.000 | 0.000 | 1.037 | 201.422 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-65/journal/page | none observed |
| d8983daaa8b5d2940000000000000173 | 202.650 | 0.000 | n/a | 0.000 | 0.000 | 1.322 | 201.162 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d294000000000000014d | 202.626 | 0.000 | n/a | 0.000 | 0.000 | 1.437 | 200.953 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-64/journal/page | none observed |

## P3 / tail / read (489 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 179.870 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 179.383 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 204.932 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.702 | 202.717 | 2.494 | n/a | 0.140 | 0.000 | n/a | n/a | 50.379 | 0.000 | 0.000 | 50.379 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d8983daaa8b5d2940000000000000f2f | 212.311 | 0.000 | n/a | 0.000 | 0.000 | 11.600 | 200.575 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-64/journal/page | none observed |
| d8983daaa8b5d2940000000000000274 | 205.671 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 204.401 | 0.014 | n/a | 0.145 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-64/journal/page | none observed |
| d8983daaa8b5d294000000000000024f | 205.172 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 204.394 | 0.027 | n/a | 0.086 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-41/journal/page | none observed |
| d8983daaa8b5d294000000000000019d | 205.069 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 204.126 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-64/journal/page | none observed |
| d8983daaa8b5d29400000000000001a7 | 204.932 | 0.000 | n/a | 0.000 | 0.000 | 3.782 | 200.961 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d294000000000000022a | 204.681 | 0.000 | n/a | 0.000 | 0.000 | 2.529 | 201.929 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d29400000000000001b1 | 204.607 | 0.000 | n/a | 0.000 | 0.000 | 3.281 | 201.102 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-44/journal/page | none observed |
| d8983daaa8b5d2940000000000000236 | 204.550 | 0.000 | n/a | 0.000 | 0.000 | 3.771 | 200.637 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| d8983daaa8b5d2940000000000000290 | 204.260 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 203.574 | 0.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| d8983daaa8b5d29400000000000001a2 | 203.808 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 200.420 | 2.494 | n/a | 0.029 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-41/journal/page | none observed |
| d8983daaa8b5d2940000000000000eee | 203.534 | 0.000 | n/a | 0.000 | 0.000 | 2.951 | 200.464 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-44/journal/page | none observed |
| d8983daaa8b5d2940000000000000294 | 203.395 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 202.717 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| d8983daaa8b5d29400000000000001d9 | 203.382 | 0.000 | n/a | 0.000 | 0.000 | 1.206 | 201.899 | 0.014 | n/a | 0.085 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-63/journal/page | none observed |
| d8983daaa8b5d294000000000000020c | 203.176 | 0.000 | n/a | 0.000 | 0.000 | 1.879 | 200.952 | 0.016 | n/a | 0.143 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-43/journal/page | none observed |
| d8983daaa8b5d2940000000000000263 | 202.952 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.675 | 0.014 | n/a | 0.140 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d29400000000000001ad | 202.912 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 201.855 | 0.014 | n/a | 0.132 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-59/journal/page | none observed |
| d8983daaa8b5d29400000000000001e8 | 202.844 | 0.000 | n/a | 0.000 | 0.000 | 1.371 | 201.228 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-59/journal/page | none observed |
| d8983daaa8b5d29400000000000001dc | 202.797 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 201.608 | 0.009 | n/a | 0.106 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d294000000000000019a | 202.748 | 0.000 | n/a | 0.000 | 0.000 | 1.947 | 200.637 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| d8983daaa8b5d2940000000000000200 | 202.677 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 201.646 | 0.015 | n/a | 0.177 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

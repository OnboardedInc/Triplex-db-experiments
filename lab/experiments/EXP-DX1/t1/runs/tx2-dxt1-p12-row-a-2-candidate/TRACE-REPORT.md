# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-41/gateway.admitted-work` (136.343 ms, trace `9869415248c9e0bc000000000000017f`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (103.056 ms, trace `9869415248c9e0bc00000000000001a0`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (85.280 ms, trace `9869415248c9e0bc0000000000000141`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (91.770 ms, trace `9869415248c9e0bc00000000000004ad`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (99.708 ms, trace `9869415248c9e0bc0000000000000ec4`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p12-row-a-2-candidate`; source `2409bdada6be6cb7f17d1aa71f31da90a72f01af`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8780282.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 220 source calibrations, offsets preserved in raw traces and trace-summary.json. 0 JFR events without continuous-anchor proof are retained raw but not overlaid; Mac wall samples are whole-run context, not per-commit overlap evidence.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13774.202 | 305.099 | 7.608 | 454 |
| L1 | 0 | 19961.673 | 461.657 | 14.398 | 668 |
| L4 | 0 | 19826.351 | 388.653 | 14.293 | 628 |
| L16 | 0 | 19981.196 | 367.747 | 10.326 | 686 |
| L64 | 0 | 19978.350 | 449.829 | 9.806 | 870 |
| L256 | 0 | 19977.164 | 513.219 | 10.050 | 688 |
| L1024 | 0 | 19968.136 | 4304.982 | 38.378 | 17595 |
| tail | 0 | 64232.563 | 12752.413 | 103.118 | 52328 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 9869415248c9e0bc000000000000017f | driver.queue.scheduler-dispatch | 0.083 | none | 0 / 32 |
| 9869415248c9e0bc000000000000017f | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 9869415248c9e0bc000000000000017f waited: []

| 9869415248c9e0bc00000000000001a0 | driver.queue.scheduler-dispatch | 0.094 | none | 0 / 32 |
| 9869415248c9e0bc00000000000001a0 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 9869415248c9e0bc00000000000001a0 waited: []

| 9869415248c9e0bc0000000000000141 | driver.queue.scheduler-dispatch | 0.068 | none | 0 / 32 |
| 9869415248c9e0bc0000000000000141 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 9869415248c9e0bc0000000000000141 waited: []

| 9869415248c9e0bc00000000000004ad | driver.queue.scheduler-late | 6.147 | none | 3 / 32 |
| 9869415248c9e0bc00000000000004ad | driver.queue.scheduler-dispatch | 0.016 | none | 3 / 32 |

Observed active steps while trace 9869415248c9e0bc00000000000004ad waited: []

| 9869415248c9e0bc0000000000000ec4 | driver.queue.scheduler-dispatch | 0.033 | none | 0 / 32 |
| 9869415248c9e0bc0000000000000ec4 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 9869415248c9e0bc0000000000000ec4 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.255 | 0.321 | 0.000 | 0.580 | 4.583 | 0.798 | 0.000 | 0.087 | 1.245 | 6.406 | 0.024 | n/a | 0.402 | 15.101 | n/a | n/a | 0.033 | 5.205 | 0.163 | 0.033 |
| p99 | 81.161 | 9.166 | 0.000 | 7.862 | 15.263 | n/a | 4.482 | 4.180 | 5.491 | 22.847 | 0.160 | n/a | 6.405 | 49.311 | n/a | n/a | 0.150 | 20.355 | 0.407 | 0.150 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc00000000000000f7 | 81.161 | 15.263 | 0.798 | 0.000 | 0.075 | 4.536 | 22.847 | 0.160 | n/a | 0.307 | 37.145 | n/a | n/a | 0.029 | 16.137 | 0.199 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000000f4 | 79.957 | 13.423 | n/a | 2.753 | 4.180 | 0.786 | 2.930 | 0.020 | n/a | 6.405 | 49.311 | n/a | n/a | 0.150 | 20.355 | 0.255 | 0.150 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 9869415248c9e0bc000000000000010f | 55.969 | 10.271 | 0.318 | 0.000 | 0.123 | 1.780 | 7.266 | 0.020 | n/a | 0.700 | 35.442 | n/a | n/a | 0.049 | 10.712 | 0.191 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000000ff | 50.949 | 6.296 | 0.295 | 0.000 | 0.063 | 2.449 | 13.719 | 0.075 | n/a | 3.027 | 24.998 | n/a | n/a | 0.027 | 6.654 | 0.131 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000011d | 49.474 | 3.854 | 0.274 | 0.000 | 0.120 | 1.115 | 13.941 | 0.032 | n/a | 0.260 | 29.834 | n/a | n/a | 0.044 | 4.247 | 0.086 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 9869415248c9e0bc0000000000000104 | 48.273 | 5.718 | 0.244 | 0.000 | 0.036 | 5.465 | 16.362 | 0.023 | n/a | 0.729 | 19.677 | n/a | n/a | 0.019 | 5.998 | 0.124 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.076ms; driver.publication.readback 0.145ms; driver.publication.persist-deferred 0.028ms |
| 9869415248c9e0bc0000000000000103 | 44.382 | 4.106 | n/a | 1.489 | 1.421 | 0.587 | 13.061 | 0.019 | n/a | 0.083 | 23.585 | n/a | n/a | 0.031 | 7.017 | 0.158 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| 9869415248c9e0bc0000000000000107 | 40.406 | 6.338 | 0.186 | 0.000 | 0.075 | 1.322 | 13.529 | 0.034 | n/a | 0.376 | 18.518 | n/a | n/a | 0.028 | 6.599 | 0.163 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000010b | 39.477 | 4.746 | 0.273 | 0.000 | 0.054 | 1.351 | 8.913 | 0.024 | n/a | 0.308 | 23.788 | n/a | n/a | 0.021 | 5.073 | 0.128 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000000fb | 37.883 | 5.495 | 0.228 | 0.000 | 0.072 | 1.494 | 20.208 | 0.027 | n/a | 0.500 | 9.820 | n/a | n/a | 0.041 | 5.794 | 0.153 | 0.041 | gw-w/thread-47/gateway.admitted-work | none observed |
| 9869415248c9e0bc0000000000000119 | 37.366 | 4.576 | 0.200 | 0.000 | 0.072 | 4.249 | 10.313 | 0.030 | n/a | 0.127 | 17.765 | n/a | n/a | 0.034 | 4.848 | 0.130 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.008ms |
| 9869415248c9e0bc0000000000000115 | 35.492 | 5.435 | 0.132 | 0.000 | 0.068 | 5.491 | 11.438 | 0.057 | n/a | 0.380 | 12.467 | n/a | n/a | 0.025 | 5.635 | 0.159 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000125 | 33.006 | 4.583 | 0.416 | 0.000 | 0.206 | 1.661 | 7.327 | 0.025 | n/a | 0.403 | 18.298 | n/a | n/a | 0.086 | 5.205 | 0.158 | 0.086 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.067ms |
| 9869415248c9e0bc0000000000000109 | 32.631 | 8.558 | n/a | 4.482 | 0.244 | 1.244 | 6.406 | 0.037 | n/a | 0.205 | 11.385 | n/a | n/a | 0.070 | 13.284 | 0.407 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 9869415248c9e0bc000000000000011b | 31.255 | 5.986 | n/a | 3.695 | 0.061 | 1.061 | 5.750 | 0.036 | n/a | 1.193 | 13.448 | n/a | n/a | 0.025 | 9.742 | 0.312 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000121 | 29.950 | 5.359 | 0.329 | 0.000 | 0.087 | 1.378 | 5.777 | 0.020 | n/a | 1.867 | 15.101 | n/a | n/a | 0.033 | 5.774 | 0.193 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 9869415248c9e0bc000000000000010d | 26.814 | 3.224 | n/a | 2.309 | 0.059 | 0.433 | 4.493 | 0.018 | n/a | 0.545 | 15.713 | n/a | n/a | 0.020 | 5.593 | 0.209 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000111 | 26.358 | 4.620 | 0.447 | 0.000 | 0.056 | 1.669 | 12.814 | 0.030 | n/a | 0.085 | 6.600 | n/a | n/a | 0.036 | 5.123 | 0.194 | 0.036 | gw-w/thread-48/gateway.admitted-work | none observed |
| 9869415248c9e0bc000000000000012b | 26.176 | 3.635 | 0.242 | 0.000 | 0.125 | 0.980 | 9.330 | 0.031 | n/a | 0.596 | 11.190 | n/a | n/a | 0.046 | 4.003 | 0.153 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 9869415248c9e0bc00000000000000fd | 25.342 | 3.204 | n/a | 0.000 | 1.367 | 0.660 | 1.148 | 0.012 | n/a | 0.914 | 18.011 | n/a | n/a | 0.025 | 4.571 | 0.180 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.007 | 0.984 | 0.000 | 0.677 | 2.927 | n/a | 0.000 | 0.126 | 0.864 | 4.250 | 0.013 | n/a | 0.402 | 10.135 | n/a | n/a | 0.040 | 3.707 | 0.204 | 0.040 |
| p99 | 25.342 | 1.756 | 0.000 | 0.899 | 6.302 | n/a | 0.000 | 1.753 | 3.755 | 6.120 | 0.032 | n/a | 3.623 | 18.011 | n/a | n/a | 0.141 | 6.686 | 0.365 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc00000000000000fd | 25.342 | 3.204 | n/a | 0.000 | 1.367 | 0.660 | 1.148 | 0.012 | n/a | 0.914 | 18.011 | n/a | n/a | 0.025 | 4.571 | 0.180 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000000f9 | 24.708 | 2.927 | n/a | 0.000 | 0.101 | 0.609 | 4.925 | 0.013 | n/a | 0.095 | 15.898 | n/a | n/a | 0.141 | 3.028 | 0.123 | 0.141 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000101 | 23.835 | 6.302 | n/a | 0.000 | 0.385 | 1.261 | 5.616 | 0.024 | n/a | 0.158 | 10.001 | n/a | n/a | 0.088 | 6.686 | 0.281 | 0.088 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000122 | 22.343 | 2.853 | n/a | 0.000 | 0.061 | 1.245 | 6.120 | 0.032 | n/a | 0.094 | 11.912 | n/a | n/a | 0.027 | 2.913 | 0.130 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000113 | 22.007 | 2.885 | n/a | 0.000 | 1.753 | 0.638 | 4.250 | 0.016 | n/a | 0.402 | 12.039 | n/a | n/a | 0.023 | 4.638 | 0.211 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000116 | 18.536 | 2.449 | n/a | 0.000 | 0.126 | 3.755 | 1.554 | 0.023 | n/a | 0.448 | 10.135 | n/a | n/a | 0.045 | 2.575 | 0.139 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000011e | 18.179 | 2.434 | n/a | 0.000 | 1.273 | 0.523 | 4.603 | 0.012 | n/a | 0.111 | 9.184 | n/a | n/a | 0.040 | 3.707 | 0.204 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000127 | 14.207 | 3.583 | n/a | 0.000 | 0.049 | 0.962 | 1.102 | 0.013 | n/a | 3.623 | 4.851 | n/a | n/a | 0.023 | 3.632 | 0.256 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000129 | 11.915 | 4.239 | n/a | 0.000 | 0.115 | 0.864 | 0.820 | 0.012 | n/a | 0.728 | 5.094 | n/a | n/a | 0.044 | 4.353 | 0.365 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.180 | 0.253 | 0.000 | 0.421 | 6.570 | 0.194 | 0.000 | 0.090 | 1.366 | 15.346 | 0.022 | n/a | 0.349 | 16.203 | n/a | n/a | 0.040 | 6.854 | 0.171 | 0.040 |
| p99 | 40.180 | 0.253 | 0.000 | 0.421 | 6.570 | 0.194 | 0.000 | 0.090 | 1.366 | 15.346 | 0.022 | n/a | 0.349 | 16.203 | n/a | n/a | 0.040 | 6.854 | 0.171 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc000000000000012d | 40.180 | 6.570 | 0.194 | 0.000 | 0.090 | 1.366 | 15.346 | 0.022 | n/a | 0.349 | 16.203 | n/a | n/a | 0.040 | 6.854 | 0.171 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.453 | 0.421 | 0.000 | 0.636 | 4.246 | n/a | 0.000 | 0.077 | 1.349 | 4.375 | 0.026 | n/a | 0.349 | 14.458 | n/a | n/a | 0.034 | 4.931 | 0.155 | 0.034 |
| p99 | 175.528 | 3.004 | 0.000 | 5.622 | 13.789 | n/a | 3.859 | 12.104 | 4.529 | 140.164 | 2.283 | n/a | 4.042 | 85.280 | n/a | n/a | 0.134 | 19.099 | 0.613 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc000000000000017f | 175.528 | 7.402 | 0.562 | 0.000 | 0.086 | 2.729 | 140.164 | 0.105 | n/a | 0.409 | 24.025 | n/a | n/a | 0.047 | 8.050 | 0.046 | 0.047 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.197ms; driver.reader-basis.broadcast 0.078ms |
| 9869415248c9e0bc0000000000000141 | 114.573 | 4.765 | 0.326 | 0.248 | 0.070 | 4.348 | 17.167 | 2.283 | n/a | 0.057 | 85.280 | n/a | n/a | 0.030 | 5.408 | 0.047 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms; driver.reader-basis.broadcast 0.031ms |
| 9869415248c9e0bc000000000000016f | 66.711 | 6.498 | 0.357 | 0.000 | 0.075 | 2.031 | 22.174 | 0.020 | n/a | 3.419 | 32.098 | n/a | n/a | 0.037 | 6.931 | 0.104 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.113ms |
| 9869415248c9e0bc0000000000000169 | 65.015 | 3.992 | 0.264 | 0.000 | 0.216 | 1.584 | 50.460 | 0.046 | n/a | 0.144 | 8.211 | n/a | n/a | 0.098 | 4.471 | 0.069 | 0.098 | gw-w/thread-43/gateway.admitted-work | driver.reader-basis.broadcast 0.050ms |
| 9869415248c9e0bc0000000000000175 | 57.639 | 5.459 | 0.457 | 0.000 | 0.173 | 2.145 | 23.578 | 0.030 | n/a | 0.457 | 25.226 | n/a | n/a | 0.114 | 6.090 | 0.106 | 0.114 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.093ms; driver.publication.persist-deferred 0.039ms; driver.reader-basis.broadcast 0.037ms |
| 9869415248c9e0bc0000000000000131 | 54.120 | 5.615 | 0.208 | 0.476 | 0.161 | 1.359 | 18.420 | 0.022 | n/a | 0.101 | 27.696 | n/a | n/a | 0.063 | 6.460 | 0.119 | 0.063 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 9869415248c9e0bc0000000000000151 | 51.587 | 6.913 | n/a | 0.000 | 0.070 | 1.616 | 3.235 | 0.036 | n/a | 0.198 | 39.492 | n/a | n/a | 0.027 | 6.983 | 0.135 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000173 | 42.661 | 7.383 | 0.244 | 0.000 | 0.055 | 1.349 | 8.439 | 0.022 | n/a | 3.132 | 22.011 | n/a | n/a | 0.026 | 7.682 | 0.180 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| 9869415248c9e0bc0000000000000143 | 41.982 | 5.493 | 0.267 | 0.595 | 0.142 | 1.740 | 14.540 | 0.063 | n/a | 0.115 | 18.965 | n/a | n/a | 0.063 | 6.497 | 0.155 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 9869415248c9e0bc000000000000013b | 41.125 | 3.614 | 0.249 | 0.241 | 0.081 | 2.829 | 13.640 | 0.023 | n/a | 0.082 | 20.336 | n/a | n/a | 0.030 | 4.185 | 0.102 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 9869415248c9e0bc0000000000000145 | 40.419 | 3.727 | 0.291 | 0.218 | 0.354 | 1.354 | 14.809 | 0.024 | n/a | 0.529 | 19.051 | n/a | n/a | 0.061 | 4.590 | 0.114 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 9869415248c9e0bc000000000000017d | 34.494 | 3.863 | 0.177 | 0.000 | 0.072 | 1.429 | 14.783 | 0.058 | n/a | 4.042 | 10.029 | n/a | n/a | 0.041 | 4.112 | 0.119 | 0.041 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.175ms |
| 9869415248c9e0bc000000000000016d | 34.297 | 4.414 | 0.346 | 0.000 | 0.171 | 1.349 | 13.037 | 0.065 | n/a | 0.447 | 14.335 | n/a | n/a | 0.134 | 4.931 | 0.144 | 0.134 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 9869415248c9e0bc0000000000000165 | 34.156 | 5.280 | 0.356 | 0.000 | 0.071 | 4.024 | 14.039 | 0.034 | n/a | 0.075 | 10.238 | n/a | n/a | 0.038 | 5.707 | 0.167 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.070ms |
| 9869415248c9e0bc0000000000000138 | 34.015 | 3.738 | 0.268 | 0.249 | 0.066 | 0.928 | 5.934 | 0.026 | n/a | 0.099 | 22.678 | n/a | n/a | 0.030 | 4.320 | 0.127 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 9869415248c9e0bc000000000000013e | 32.391 | 5.548 | n/a | 3.859 | 0.197 | 0.810 | 2.712 | 0.016 | n/a | 0.093 | 19.112 | n/a | n/a | 0.045 | 9.604 | 0.296 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000159 | 31.594 | 3.408 | n/a | 0.000 | 0.083 | 0.636 | 1.317 | 0.017 | n/a | 3.199 | 22.901 | n/a | n/a | 0.034 | 3.491 | 0.110 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000179 | 31.132 | 13.789 | n/a | 0.000 | 5.310 | 0.579 | 2.545 | 0.024 | n/a | 0.069 | 8.773 | n/a | n/a | 0.043 | 19.099 | 0.613 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000012f | 30.765 | 3.862 | 0.223 | 0.354 | 0.077 | 1.188 | 9.702 | 0.021 | n/a | 0.362 | 14.948 | n/a | n/a | 0.030 | 4.515 | 0.147 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 9869415248c9e0bc000000000000017a | 30.454 | 2.370 | n/a | 0.000 | 12.104 | 0.593 | 1.897 | 0.028 | n/a | 0.114 | 13.320 | n/a | n/a | 0.028 | 14.474 | 0.475 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.841ms; driver.reader-basis.broadcast 0.098ms; driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.023ms |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.229 | 0.000 | 0.000 | 0.545 | 2.627 | n/a | 0.000 | 0.063 | 0.593 | 1.466 | 0.017 | n/a | 0.250 | 13.320 | n/a | n/a | 0.027 | 2.802 | 0.158 | 0.027 |
| p99 | 30.454 | 1.005 | 0.000 | 0.831 | 6.574 | n/a | 0.000 | 12.104 | 4.529 | 4.258 | 0.031 | n/a | 0.671 | 20.595 | n/a | n/a | 0.057 | 14.474 | 0.475 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc000000000000017a | 30.454 | 2.370 | n/a | 0.000 | 12.104 | 0.593 | 1.897 | 0.028 | n/a | 0.114 | 13.320 | n/a | n/a | 0.028 | 14.474 | 0.475 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.841ms; driver.reader-basis.broadcast 0.098ms; driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.023ms |
| 9869415248c9e0bc0000000000000139 | 28.892 | 6.574 | n/a | 0.000 | 0.063 | 4.529 | 4.045 | 0.031 | n/a | 0.250 | 13.373 | n/a | n/a | 0.027 | 6.638 | 0.230 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000136 | 25.626 | 2.421 | n/a | 0.000 | 0.077 | 0.563 | 1.576 | 0.013 | n/a | 0.349 | 20.595 | n/a | n/a | 0.032 | 2.498 | 0.097 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000149 | 21.364 | 2.596 | n/a | 0.000 | 0.054 | 1.142 | 0.857 | 0.012 | n/a | 0.127 | 16.548 | n/a | n/a | 0.027 | 2.650 | 0.124 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000015f | 20.229 | 2.627 | n/a | 0.000 | 0.056 | 0.900 | 1.466 | 0.029 | n/a | 0.671 | 14.458 | n/a | n/a | 0.022 | 2.684 | 0.133 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000155 | 17.722 | 2.743 | n/a | 0.000 | 0.059 | 0.409 | 4.258 | 0.017 | n/a | 0.070 | 10.146 | n/a | n/a | 0.020 | 2.802 | 0.158 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000171 | 13.418 | 4.152 | n/a | 0.000 | 0.145 | 0.499 | 1.398 | 0.021 | n/a | 0.590 | 6.558 | n/a | n/a | 0.057 | 4.296 | 0.320 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000163 | 9.696 | 4.051 | n/a | 0.000 | 0.107 | 0.736 | 0.925 | 0.014 | n/a | 0.362 | 3.458 | n/a | n/a | 0.043 | 4.158 | 0.429 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.688 | 0.371 | 0.000 | 0.638 | 4.144 | 0.407 | 0.000 | 0.069 | 1.035 | 4.212 | 0.021 | n/a | 0.219 | 12.430 | n/a | n/a | 0.036 | 4.353 | 0.198 | 0.036 |
| p99 | 120.438 | 2.002 | 0.000 | 1.846 | 11.561 | n/a | 0.000 | 3.209 | 4.053 | 26.968 | 0.060 | n/a | 2.853 | 103.056 | n/a | n/a | 0.094 | 11.859 | 0.333 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc00000000000001a0 | 120.438 | 4.921 | 0.221 | 0.000 | 0.098 | 1.243 | 10.721 | 0.027 | n/a | 0.101 | 103.056 | n/a | n/a | 0.050 | 5.239 | 0.044 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms; driver.reader-basis.broadcast 0.018ms |
| 9869415248c9e0bc000000000000018c | 66.874 | 4.945 | 0.187 | 0.000 | 0.053 | 1.556 | 14.330 | 0.040 | n/a | 0.076 | 45.664 | n/a | n/a | 0.022 | 5.186 | 0.078 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 9869415248c9e0bc00000000000001a8 | 55.955 | 11.561 | 0.230 | 0.000 | 0.068 | 2.650 | 25.092 | 0.019 | n/a | 0.344 | 15.930 | n/a | n/a | 0.061 | 11.859 | 0.212 | 0.061 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.023ms; driver.publication.persist-deferred 0.016ms |
| 9869415248c9e0bc0000000000000187 | 44.254 | 4.252 | 0.293 | 0.000 | 0.042 | 0.980 | 5.826 | 0.020 | n/a | 0.076 | 32.745 | n/a | n/a | 0.021 | 4.587 | 0.104 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 9869415248c9e0bc0000000000000192 | 43.262 | 3.929 | 0.206 | 0.000 | 0.116 | 1.088 | 26.968 | 0.022 | n/a | 0.348 | 10.541 | n/a | n/a | 0.045 | 4.251 | 0.098 | 0.045 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.019ms |
| 9869415248c9e0bc0000000000000194 | 41.958 | 6.165 | 0.247 | 0.000 | 0.077 | 2.448 | 11.380 | 0.041 | n/a | 0.622 | 20.935 | n/a | n/a | 0.044 | 6.489 | 0.155 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 9869415248c9e0bc00000000000001b9 | 35.505 | 8.012 | n/a | 0.000 | 2.133 | 2.409 | 2.901 | 0.034 | n/a | 0.147 | 19.830 | n/a | n/a | 0.039 | 10.145 | 0.286 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 9869415248c9e0bc00000000000001c2 | 34.820 | 4.745 | 0.407 | 0.000 | 0.050 | 1.665 | 18.728 | 0.016 | n/a | 0.080 | 9.058 | n/a | n/a | 0.071 | 5.202 | 0.149 | 0.071 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.083ms |
| 9869415248c9e0bc00000000000001b0 | 34.321 | 3.242 | 0.181 | 0.000 | 0.086 | 0.900 | 17.427 | 0.015 | n/a | 0.080 | 12.349 | n/a | n/a | 0.041 | 3.509 | 0.102 | 0.041 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.019ms |
| 9869415248c9e0bc00000000000001be | 32.996 | 6.764 | 0.342 | 0.000 | 0.038 | 1.207 | 11.699 | 0.025 | n/a | 0.148 | 12.744 | n/a | n/a | 0.030 | 7.144 | 0.217 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 9869415248c9e0bc000000000000019b | 29.554 | 3.884 | 0.218 | 0.000 | 0.250 | 1.212 | 11.836 | 0.030 | n/a | 0.084 | 11.989 | n/a | n/a | 0.051 | 4.353 | 0.147 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.019ms; driver.reader-basis.broadcast 0.014ms |
| 9869415248c9e0bc000000000000019a | 28.547 | 7.711 | n/a | 0.000 | 0.081 | 1.255 | 6.741 | 0.019 | n/a | 0.464 | 12.234 | n/a | n/a | 0.041 | 7.792 | 0.273 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001b2 | 28.271 | 5.270 | 0.249 | 0.000 | 0.065 | 1.743 | 8.888 | 0.020 | n/a | 0.394 | 11.598 | n/a | n/a | 0.043 | 5.584 | 0.198 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 9869415248c9e0bc00000000000001a4 | 28.193 | 3.500 | 0.323 | 0.000 | 0.056 | 1.181 | 10.760 | 0.023 | n/a | 0.076 | 12.243 | n/a | n/a | 0.031 | 3.879 | 0.138 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 9869415248c9e0bc0000000000000181 | 27.910 | 4.053 | n/a | 0.000 | 0.068 | 0.575 | 1.231 | 0.021 | n/a | 0.118 | 21.810 | n/a | n/a | 0.034 | 4.121 | 0.148 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001c4 | 27.552 | 3.805 | 0.240 | 0.000 | 0.048 | 1.491 | 8.111 | 0.028 | n/a | 0.120 | 13.688 | n/a | n/a | 0.022 | 4.093 | 0.149 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001a6 | 26.613 | 4.548 | 0.163 | 0.000 | 0.072 | 1.339 | 4.212 | 0.016 | n/a | 0.281 | 15.953 | n/a | n/a | 0.030 | 4.783 | 0.180 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 9869415248c9e0bc00000000000001b6 | 26.020 | 6.291 | 0.278 | 0.000 | 0.061 | 1.035 | 7.119 | 0.016 | n/a | 0.312 | 10.876 | n/a | n/a | 0.032 | 6.630 | 0.255 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 9869415248c9e0bc000000000000018a | 25.712 | 5.772 | n/a | 0.000 | 0.058 | 1.414 | 3.192 | 0.030 | n/a | 0.140 | 15.078 | n/a | n/a | 0.029 | 5.831 | 0.227 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000019e | 25.688 | 2.976 | 0.128 | 0.000 | 0.050 | 1.026 | 7.553 | 0.026 | n/a | 0.513 | 13.389 | n/a | n/a | 0.025 | 3.155 | 0.123 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.162 | 0.000 | 0.000 | 0.580 | 3.020 | n/a | 0.000 | 0.069 | 0.701 | 1.319 | 0.014 | n/a | 0.219 | 12.430 | n/a | n/a | 0.035 | 3.321 | 0.198 | 0.035 |
| p99 | 27.910 | 1.228 | 0.000 | 1.073 | 4.770 | n/a | 0.000 | 3.209 | 0.927 | 2.550 | 0.036 | n/a | 0.813 | 21.810 | n/a | n/a | 0.070 | 6.183 | 0.333 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc0000000000000181 | 27.910 | 4.053 | n/a | 0.000 | 0.068 | 0.575 | 1.231 | 0.021 | n/a | 0.118 | 21.810 | n/a | n/a | 0.034 | 4.121 | 0.148 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000018f | 24.609 | 4.770 | n/a | 0.000 | 0.102 | 0.731 | 2.550 | 0.014 | n/a | 0.067 | 16.333 | n/a | n/a | 0.043 | 4.872 | 0.198 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001c8 | 20.862 | 2.973 | n/a | 0.000 | 3.209 | 0.705 | 1.565 | 0.032 | n/a | 0.771 | 11.571 | n/a | n/a | 0.035 | 6.183 | 0.296 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001a9 | 20.033 | 2.303 | n/a | 0.000 | 1.916 | 0.466 | 0.460 | 0.008 | n/a | 0.315 | 14.546 | n/a | n/a | 0.020 | 4.218 | 0.211 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001c0 | 19.163 | 2.155 | n/a | 0.000 | 0.048 | 0.927 | 1.754 | 0.034 | n/a | 0.219 | 14.000 | n/a | n/a | 0.026 | 2.203 | 0.115 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000185 | 19.162 | 3.020 | n/a | 0.000 | 0.058 | 0.626 | 0.837 | 0.011 | n/a | 0.099 | 14.463 | n/a | n/a | 0.049 | 3.077 | 0.161 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 9869415248c9e0bc0000000000000198 | 18.290 | 3.160 | n/a | 0.000 | 0.069 | 0.891 | 1.319 | 0.023 | n/a | 0.368 | 12.430 | n/a | n/a | 0.029 | 3.229 | 0.177 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000196 | 12.154 | 3.199 | n/a | 0.000 | 0.122 | 0.727 | 1.475 | 0.036 | n/a | 0.813 | 5.729 | n/a | n/a | 0.054 | 3.321 | 0.273 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.006ms |
| 9869415248c9e0bc00000000000001ca | 11.199 | 3.608 | n/a | 0.000 | 0.118 | 0.701 | 2.350 | 0.013 | n/a | 0.293 | 4.046 | n/a | n/a | 0.070 | 3.726 | 0.333 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 9869415248c9e0bc00000000000001b3 | 9.844 | 2.277 | n/a | 0.000 | 0.051 | 0.568 | 0.916 | 0.013 | n/a | 0.102 | 5.881 | n/a | n/a | 0.036 | 2.328 | 0.237 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.324 | 0.541 | 0.000 | 0.561 | 3.484 | n/a | 0.000 | 0.051 | 0.939 | 4.100 | 0.017 | n/a | 0.332 | 10.121 | n/a | n/a | 0.029 | 3.693 | 0.192 | 0.029 |
| p99 | 47.700 | 2.886 | 0.005 | 1.620 | 9.461 | n/a | 0.000 | 0.203 | 4.820 | 20.717 | 0.044 | n/a | 3.630 | 42.494 | n/a | n/a | 0.073 | 9.505 | 0.326 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc00000000000001f2 | 47.700 | 9.461 | n/a | 0.000 | 0.044 | 4.220 | 17.899 | 0.044 | n/a | 1.981 | 14.027 | n/a | n/a | 0.022 | 9.505 | 0.199 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 9869415248c9e0bc0000000000000213 | 46.861 | 2.302 | n/a | 0.000 | 0.042 | 0.518 | 1.080 | 0.012 | n/a | 0.378 | 42.494 | n/a | n/a | 0.035 | 2.344 | 0.050 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000020b | 38.903 | 3.613 | 0.146 | 0.000 | 0.047 | 0.987 | 20.717 | 0.014 | n/a | 0.047 | 13.312 | n/a | n/a | 0.021 | 3.806 | 0.098 | 0.021 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.025ms |
| 9869415248c9e0bc00000000000001e1 | 38.026 | 3.710 | n/a | 0.000 | 0.051 | 0.882 | 9.793 | 0.028 | n/a | 0.561 | 22.971 | n/a | n/a | 0.028 | 3.761 | 0.099 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 9869415248c9e0bc00000000000001da | 35.944 | 3.229 | 0.174 | 0.000 | 0.061 | 1.015 | 5.534 | 0.020 | n/a | 0.347 | 25.529 | n/a | n/a | 0.036 | 3.463 | 0.096 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 9869415248c9e0bc00000000000001ef | 35.554 | 7.174 | 0.290 | 0.000 | 0.057 | 1.452 | 7.902 | 0.019 | n/a | 0.069 | 18.563 | n/a | n/a | 0.029 | 7.521 | 0.212 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001e9 | 33.009 | 5.120 | 0.196 | 0.000 | 0.065 | 1.123 | 19.969 | 0.015 | n/a | 0.311 | 6.184 | n/a | n/a | 0.025 | 5.381 | 0.163 | 0.025 | gw-w/thread-47/gateway.admitted-work | none observed |
| 9869415248c9e0bc00000000000001fb | 31.471 | 5.854 | 0.251 | 0.000 | 0.049 | 1.186 | 6.183 | 0.017 | n/a | 3.505 | 14.399 | n/a | n/a | 0.027 | 6.155 | 0.196 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000205 | 30.701 | 3.994 | 0.276 | 0.000 | 0.060 | 1.249 | 4.362 | 0.015 | n/a | 2.557 | 18.158 | n/a | n/a | 0.029 | 4.331 | 0.141 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000020d | 30.617 | 4.266 | 0.409 | 0.000 | 0.060 | 2.047 | 8.624 | 0.026 | n/a | 0.391 | 14.764 | n/a | n/a | 0.031 | 4.734 | 0.155 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001f1 | 28.348 | 3.444 | 0.167 | 0.000 | 0.049 | 1.017 | 11.665 | 0.016 | n/a | 0.059 | 11.905 | n/a | n/a | 0.027 | 3.661 | 0.129 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000215 | 25.579 | 3.830 | 0.202 | 0.000 | 0.030 | 0.925 | 7.522 | 0.015 | n/a | 0.215 | 12.823 | n/a | n/a | 0.016 | 4.062 | 0.159 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001d4 | 24.033 | 3.806 | 0.159 | 0.000 | 0.045 | 4.820 | 3.590 | 0.020 | n/a | 0.060 | 11.508 | n/a | n/a | 0.025 | 4.010 | 0.167 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000211 | 23.793 | 3.484 | 0.177 | 0.000 | 0.043 | 3.371 | 9.772 | 0.044 | n/a | 0.142 | 6.734 | n/a | n/a | 0.027 | 3.704 | 0.156 | 0.027 | gw-w/thread-47/gateway.admitted-work | none observed |
| 9869415248c9e0bc0000000000000221 | 23.426 | 4.091 | 0.324 | 0.000 | 0.148 | 3.362 | 5.933 | 0.025 | n/a | 0.074 | 9.399 | n/a | n/a | 0.070 | 4.563 | 0.195 | 0.070 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001e5 | 22.900 | 2.238 | n/a | 0.000 | 0.065 | 0.796 | 1.540 | 0.026 | n/a | 3.630 | 14.577 | n/a | n/a | 0.028 | 2.303 | 0.101 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001dd | 22.741 | 3.393 | 0.159 | 0.000 | 0.050 | 1.225 | 7.111 | 0.029 | n/a | 0.526 | 10.225 | n/a | n/a | 0.023 | 3.602 | 0.158 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001e3 | 22.452 | 4.488 | 0.185 | 0.000 | 0.115 | 1.196 | 5.968 | 0.016 | n/a | 0.063 | 10.371 | n/a | n/a | 0.050 | 4.788 | 0.213 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000206 | 21.889 | 2.378 | n/a | 0.000 | 0.045 | 0.524 | 0.801 | 0.011 | n/a | 0.289 | 17.809 | n/a | n/a | 0.031 | 2.423 | 0.111 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000219 | 21.281 | 3.855 | 0.222 | 0.000 | 0.203 | 1.297 | 7.871 | 0.029 | n/a | 0.640 | 7.105 | n/a | n/a | 0.058 | 4.281 | 0.201 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.491 | 0.575 | 0.000 | 0.493 | 2.238 | n/a | 0.000 | 0.046 | 0.578 | 1.198 | 0.014 | n/a | 0.332 | 7.985 | n/a | n/a | 0.030 | 2.303 | 0.179 | 0.030 |
| p99 | 46.861 | 1.625 | 0.000 | 0.965 | 3.448 | n/a | 0.000 | 0.143 | 0.949 | 4.100 | 0.034 | n/a | 3.630 | 42.494 | n/a | n/a | 0.067 | 3.591 | 0.246 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc0000000000000213 | 46.861 | 2.302 | n/a | 0.000 | 0.042 | 0.518 | 1.080 | 0.012 | n/a | 0.378 | 42.494 | n/a | n/a | 0.035 | 2.344 | 0.050 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001e5 | 22.900 | 2.238 | n/a | 0.000 | 0.065 | 0.796 | 1.540 | 0.026 | n/a | 3.630 | 14.577 | n/a | n/a | 0.028 | 2.303 | 0.101 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000206 | 21.889 | 2.378 | n/a | 0.000 | 0.045 | 0.524 | 0.801 | 0.011 | n/a | 0.289 | 17.809 | n/a | n/a | 0.031 | 2.423 | 0.111 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001d1 | 18.385 | 3.448 | n/a | 0.000 | 0.143 | 0.875 | 1.198 | 0.014 | n/a | 0.092 | 12.548 | n/a | n/a | 0.067 | 3.591 | 0.195 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001ec | 16.406 | 2.217 | n/a | 0.000 | 0.046 | 0.578 | 1.088 | 0.015 | n/a | 0.089 | 12.350 | n/a | n/a | 0.023 | 2.263 | 0.138 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001d5 | 16.277 | 1.821 | n/a | 0.000 | 0.042 | 0.518 | 1.024 | 0.012 | n/a | 0.332 | 12.506 | n/a | n/a | 0.022 | 1.863 | 0.114 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001e7 | 16.209 | 3.019 | n/a | 0.000 | 0.096 | 0.949 | 3.752 | 0.014 | n/a | 0.347 | 7.985 | n/a | n/a | 0.048 | 3.115 | 0.192 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000201 | 14.491 | 2.706 | n/a | 0.000 | 0.062 | 0.781 | 1.366 | 0.021 | n/a | 0.453 | 9.067 | n/a | n/a | 0.034 | 2.768 | 0.191 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001f8 | 13.877 | 1.816 | n/a | 0.000 | 0.036 | 0.562 | 4.100 | 0.019 | n/a | 0.110 | 7.205 | n/a | n/a | 0.030 | 1.852 | 0.133 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 9869415248c9e0bc0000000000000209 | 13.340 | 2.992 | n/a | 0.000 | 0.075 | 0.939 | 1.811 | 0.034 | n/a | 0.881 | 6.561 | n/a | n/a | 0.047 | 3.068 | 0.230 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001cf | 11.618 | 1.651 | n/a | 0.000 | 0.029 | 0.661 | 1.223 | 0.020 | n/a | 0.152 | 7.865 | n/a | n/a | 0.017 | 1.680 | 0.145 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001df | 10.352 | 1.799 | n/a | 0.000 | 0.056 | 0.514 | 0.826 | 0.012 | n/a | 0.093 | 7.030 | n/a | n/a | 0.022 | 1.855 | 0.179 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000020e | 9.847 | 2.332 | n/a | 0.000 | 0.095 | 0.815 | 2.699 | 0.025 | n/a | 0.533 | 3.311 | n/a | n/a | 0.037 | 2.427 | 0.246 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000021e | 8.301 | 1.765 | n/a | 0.000 | 0.037 | 0.463 | 0.729 | 0.012 | n/a | 0.346 | 4.932 | n/a | n/a | 0.017 | 1.802 | 0.217 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000001ea | 7.048 | 1.650 | n/a | 0.000 | 0.042 | 0.462 | 0.882 | 0.011 | n/a | 0.222 | 3.756 | n/a | n/a | 0.023 | 1.692 | 0.240 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.455 | 0.341 | 0.000 | 0.617 | 3.669 | n/a | 0.000 | 0.059 | 0.956 | 2.713 | 0.020 | n/a | 0.229 | 8.029 | n/a | n/a | 0.027 | 3.987 | 0.215 | 0.027 |
| p99 | 72.089 | 2.000 | 0.000 | 1.801 | 6.696 | n/a | 0.000 | 2.305 | 6.702 | 33.016 | 0.046 | n/a | 3.087 | 50.717 | n/a | n/a | 0.083 | 7.166 | 0.443 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc000000000000027c | 72.089 | 5.110 | 0.305 | 0.000 | 0.053 | 1.365 | 14.407 | 0.021 | n/a | 0.087 | 50.717 | n/a | n/a | 0.024 | 5.468 | 0.076 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.077ms |
| 9869415248c9e0bc0000000000000239 | 53.412 | 5.521 | 0.353 | 0.000 | 0.222 | 2.303 | 5.552 | 0.035 | n/a | 0.168 | 39.174 | n/a | n/a | 0.083 | 6.096 | 0.114 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 9869415248c9e0bc000000000000022e | 50.759 | 3.669 | 0.274 | 0.000 | 0.135 | 2.354 | 33.016 | 0.031 | n/a | 0.058 | 11.168 | n/a | n/a | 0.053 | 4.078 | 0.080 | 0.053 | gw-w/thread-48/commit.prepare-and-validate | driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.034ms; driver.reader-basis.broadcast 0.028ms |
| 9869415248c9e0bc0000000000000226 | 39.353 | 4.230 | 0.209 | 0.000 | 0.095 | 1.144 | 20.757 | 0.033 | n/a | 0.047 | 12.801 | n/a | n/a | 0.038 | 4.533 | 0.115 | 0.038 | gw-w/thread-46/gateway.admitted-work | none observed |
| 9869415248c9e0bc000000000000022f | 38.022 | 2.430 | n/a | 0.000 | 0.036 | 0.516 | 0.620 | 0.014 | n/a | 0.740 | 33.646 | n/a | n/a | 0.019 | 2.466 | 0.065 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000235 | 27.867 | 3.217 | 0.195 | 0.000 | 0.071 | 1.153 | 11.577 | 0.024 | n/a | 0.230 | 11.375 | n/a | n/a | 0.025 | 3.484 | 0.125 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000286 | 25.633 | 4.428 | 0.242 | 0.000 | 0.048 | 1.564 | 4.026 | 0.016 | n/a | 0.229 | 15.058 | n/a | n/a | 0.021 | 4.718 | 0.184 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000243 | 25.501 | 3.623 | 0.205 | 0.000 | 0.050 | 1.210 | 12.899 | 0.024 | n/a | 0.068 | 7.398 | n/a | n/a | 0.024 | 3.877 | 0.152 | 0.024 | gw-w/thread-44/gateway.admitted-work | none observed |
| 9869415248c9e0bc0000000000000280 | 24.654 | 3.891 | 0.180 | 0.000 | 0.054 | 1.275 | 9.519 | 0.033 | n/a | 0.552 | 9.113 | n/a | n/a | 0.036 | 4.126 | 0.167 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000026a | 23.760 | 4.503 | n/a | 0.000 | 1.939 | 5.402 | 8.653 | 0.025 | n/a | 0.335 | 2.885 | n/a | n/a | 0.019 | 6.442 | 0.271 | 0.019 | gw-w/thread-44/gateway.admitted-work | none observed |
| 9869415248c9e0bc0000000000000267 | 23.620 | 3.067 | 0.198 | 0.000 | 0.136 | 0.925 | 8.875 | 0.023 | n/a | 0.287 | 10.064 | n/a | n/a | 0.044 | 3.401 | 0.144 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000247 | 23.420 | 3.508 | 0.180 | 0.000 | 0.058 | 1.223 | 6.740 | 0.021 | n/a | 0.076 | 11.574 | n/a | n/a | 0.039 | 3.746 | 0.160 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000251 | 23.409 | 3.246 | 0.183 | 0.000 | 0.059 | 0.900 | 5.879 | 0.021 | n/a | 0.340 | 12.758 | n/a | n/a | 0.025 | 3.487 | 0.149 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000229 | 23.330 | 6.520 | n/a | 0.000 | 0.114 | 6.702 | 1.177 | 0.014 | n/a | 0.408 | 8.346 | n/a | n/a | 0.050 | 6.633 | 0.284 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000274 | 23.199 | 4.138 | n/a | 0.000 | 0.108 | 0.744 | 0.896 | 0.013 | n/a | 0.060 | 17.185 | n/a | n/a | 0.054 | 4.246 | 0.183 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000026c | 23.115 | 6.696 | 0.394 | 0.000 | 0.076 | 1.663 | 4.612 | 0.040 | n/a | 0.438 | 9.163 | n/a | n/a | 0.035 | 7.166 | 0.310 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000265 | 22.392 | 2.643 | n/a | 0.000 | 0.037 | 0.497 | 14.066 | 0.023 | n/a | 0.054 | 5.052 | n/a | n/a | 0.021 | 2.680 | 0.120 | 0.021 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 9869415248c9e0bc0000000000000249 | 22.308 | 3.490 | 0.233 | 0.000 | 0.123 | 1.177 | 3.440 | 0.024 | n/a | 3.087 | 10.662 | n/a | n/a | 0.071 | 3.846 | 0.172 | 0.071 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000275 | 22.183 | 3.990 | 0.159 | 0.000 | 0.058 | 1.510 | 8.099 | 0.020 | n/a | 0.228 | 8.095 | n/a | n/a | 0.023 | 4.207 | 0.190 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.019ms |
| 9869415248c9e0bc0000000000000245 | 20.945 | 4.352 | 0.150 | 0.000 | 0.038 | 1.308 | 4.559 | 0.015 | n/a | 0.235 | 10.262 | n/a | n/a | 0.025 | 4.540 | 0.217 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.072 | 0.000 | 0.000 | 0.571 | 2.619 | n/a | 0.000 | 0.052 | 0.680 | 0.897 | 0.014 | n/a | 0.241 | 6.254 | n/a | n/a | 0.026 | 2.680 | 0.209 | 0.026 |
| p99 | 38.022 | 1.653 | 0.000 | 1.119 | 4.669 | n/a | 0.000 | 1.939 | 5.402 | 14.066 | 0.025 | n/a | 3.033 | 33.646 | n/a | n/a | 0.047 | 6.442 | 0.443 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc000000000000022f | 38.022 | 2.430 | n/a | 0.000 | 0.036 | 0.516 | 0.620 | 0.014 | n/a | 0.740 | 33.646 | n/a | n/a | 0.019 | 2.466 | 0.065 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000026a | 23.760 | 4.503 | n/a | 0.000 | 1.939 | 5.402 | 8.653 | 0.025 | n/a | 0.335 | 2.885 | n/a | n/a | 0.019 | 6.442 | 0.271 | 0.019 | gw-w/thread-44/gateway.admitted-work | none observed |
| 9869415248c9e0bc0000000000000265 | 22.392 | 2.643 | n/a | 0.000 | 0.037 | 0.497 | 14.066 | 0.023 | n/a | 0.054 | 5.052 | n/a | n/a | 0.021 | 2.680 | 0.120 | 0.021 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 9869415248c9e0bc000000000000024b | 19.533 | 2.757 | n/a | 0.000 | 0.029 | 0.518 | 0.871 | 0.008 | n/a | 0.222 | 15.112 | n/a | n/a | 0.017 | 2.785 | 0.143 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.107ms; driver.reader-basis.broadcast 0.031ms; driver.publication.persist-deferred 0.016ms |
| 9869415248c9e0bc0000000000000227 | 16.143 | 1.830 | n/a | 0.000 | 0.029 | 2.012 | 1.163 | 0.012 | n/a | 3.033 | 8.048 | n/a | n/a | 0.016 | 1.860 | 0.115 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000284 | 14.330 | 2.201 | n/a | 0.000 | 0.047 | 0.515 | 0.897 | 0.017 | n/a | 0.108 | 10.518 | n/a | n/a | 0.026 | 2.248 | 0.157 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000025f | 13.896 | 4.669 | n/a | 0.000 | 0.072 | 1.119 | 1.176 | 0.021 | n/a | 0.131 | 6.669 | n/a | n/a | 0.037 | 4.742 | 0.341 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000022c | 13.159 | 3.527 | n/a | 0.000 | 1.897 | 0.633 | 0.680 | 0.011 | n/a | 0.271 | 6.105 | n/a | n/a | 0.033 | 5.424 | 0.412 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000223 | 13.072 | 3.827 | n/a | 0.000 | 0.059 | 1.230 | 5.795 | 0.022 | n/a | 0.380 | 1.732 | n/a | n/a | 0.026 | 3.886 | 0.297 | 0.026 | gw-w/thread-47/gateway.admitted-work | none observed |
| 9869415248c9e0bc000000000000026f | 12.292 | 2.172 | n/a | 0.000 | 0.046 | 0.669 | 1.888 | 0.021 | n/a | 0.118 | 7.354 | n/a | n/a | 0.024 | 2.218 | 0.180 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000255 | 11.549 | 2.120 | n/a | 0.000 | 0.065 | 0.680 | 1.269 | 0.018 | n/a | 0.362 | 7.000 | n/a | n/a | 0.035 | 2.185 | 0.189 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000027d | 11.280 | 2.219 | n/a | 0.000 | 0.050 | 0.568 | 0.880 | 0.015 | n/a | 0.399 | 7.123 | n/a | n/a | 0.026 | 2.268 | 0.201 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000237 | 10.919 | 2.619 | n/a | 0.000 | 0.101 | 0.748 | 1.074 | 0.012 | n/a | 0.064 | 6.254 | n/a | n/a | 0.047 | 2.720 | 0.249 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000241 | 9.066 | 3.112 | n/a | 0.000 | 0.052 | 0.951 | 0.828 | 0.014 | n/a | 0.566 | 3.517 | n/a | n/a | 0.027 | 3.164 | 0.349 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000261 | 8.988 | 3.899 | n/a | 0.000 | 0.086 | 0.820 | 0.787 | 0.012 | n/a | 0.241 | 3.104 | n/a | n/a | 0.038 | 3.986 | 0.443 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000281 | 8.897 | 1.798 | n/a | 0.000 | 0.063 | 0.654 | 0.895 | 0.014 | n/a | 0.080 | 5.359 | n/a | n/a | 0.035 | 1.861 | 0.209 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000277 | 7.332 | 1.883 | n/a | 0.000 | 0.035 | 0.688 | 0.798 | 0.012 | n/a | 0.063 | 3.833 | n/a | n/a | 0.020 | 1.918 | 0.262 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.405 | 0.271 | 0.000 | 0.527 | 3.513 | n/a | 0.000 | 0.061 | 0.932 | 1.501 | 0.016 | n/a | 0.097 | 8.796 | n/a | n/a | 0.033 | 3.673 | 0.185 | 0.033 |
| p99 | 59.453 | 3.382 | 0.000 | 2.398 | 6.916 | n/a | 0.000 | 1.583 | 4.358 | 26.637 | 0.040 | n/a | 3.391 | 39.674 | n/a | n/a | 0.097 | 7.204 | 0.496 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc00000000000002ae | 59.453 | 3.438 | 0.303 | 0.000 | 0.055 | 1.429 | 14.419 | 0.033 | n/a | 0.080 | 39.674 | n/a | n/a | 0.022 | 3.796 | 0.064 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002db | 44.312 | 3.988 | 0.199 | 0.000 | 0.064 | 1.591 | 26.637 | 0.021 | n/a | 0.083 | 11.691 | n/a | n/a | 0.039 | 4.250 | 0.096 | 0.039 | gw-w/thread-45/gateway.admitted-work | none observed |
| 9869415248c9e0bc000000000000029c | 39.405 | 4.023 | 0.192 | 0.000 | 0.046 | 1.512 | 25.198 | 0.021 | n/a | 0.311 | 8.068 | n/a | n/a | 0.033 | 4.261 | 0.108 | 0.033 | gw-w/thread-41/gateway.admitted-work | none observed |
| 9869415248c9e0bc0000000000000298 | 30.061 | 3.728 | 0.522 | 0.000 | 0.055 | 1.261 | 9.677 | 0.015 | n/a | 3.391 | 11.393 | n/a | n/a | 0.018 | 4.306 | 0.143 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.107ms; driver.publication.persist-deferred 0.017ms |
| 9869415248c9e0bc0000000000000290 | 26.633 | 3.806 | 0.238 | 0.000 | 0.096 | 0.895 | 7.549 | 0.017 | n/a | 0.044 | 13.948 | n/a | n/a | 0.040 | 4.140 | 0.155 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000297 | 26.444 | 4.219 | n/a | 0.000 | 0.080 | 0.833 | 9.198 | 0.016 | n/a | 0.040 | 12.021 | n/a | n/a | 0.038 | 4.299 | 0.163 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002b0 | 25.557 | 3.308 | 0.250 | 0.000 | 0.044 | 0.969 | 12.881 | 0.015 | n/a | 0.071 | 7.998 | n/a | n/a | 0.021 | 3.602 | 0.141 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002b8 | 24.806 | 3.636 | 0.187 | 0.000 | 0.065 | 1.070 | 10.869 | 0.032 | n/a | 0.642 | 8.273 | n/a | n/a | 0.033 | 3.888 | 0.157 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000028b | 24.746 | 4.371 | n/a | 0.000 | 0.051 | 1.650 | 1.011 | 0.016 | n/a | 0.066 | 17.552 | n/a | n/a | 0.028 | 4.422 | 0.179 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000028a | 24.516 | 3.987 | 0.220 | 0.000 | 0.068 | 1.389 | 6.793 | 0.030 | n/a | 0.097 | 11.896 | n/a | n/a | 0.035 | 4.275 | 0.174 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002bc | 24.489 | 6.916 | 0.248 | 0.000 | 0.040 | 1.174 | 7.416 | 0.018 | n/a | 0.325 | 8.329 | n/a | n/a | 0.022 | 7.204 | 0.294 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002b6 | 22.495 | 3.737 | 0.373 | 0.000 | 0.061 | 1.478 | 5.520 | 0.026 | n/a | 0.436 | 10.832 | n/a | n/a | 0.032 | 4.171 | 0.185 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002d9 | 22.390 | 3.802 | 0.165 | 0.000 | 0.055 | 0.930 | 5.206 | 0.017 | n/a | 0.051 | 12.131 | n/a | n/a | 0.035 | 4.022 | 0.180 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002c2 | 22.116 | 4.579 | 0.226 | 0.000 | 0.134 | 1.358 | 4.868 | 0.020 | n/a | 0.053 | 10.817 | n/a | n/a | 0.062 | 4.938 | 0.223 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002d5 | 21.781 | 3.558 | 0.219 | 0.000 | 0.045 | 1.094 | 7.833 | 0.022 | n/a | 0.075 | 8.907 | n/a | n/a | 0.026 | 3.822 | 0.175 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002aa | 21.458 | 3.278 | 0.153 | 0.000 | 0.028 | 4.350 | 4.959 | 0.031 | n/a | 0.074 | 8.563 | n/a | n/a | 0.022 | 3.458 | 0.161 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000029e | 21.060 | 3.078 | n/a | 0.000 | 0.063 | 1.022 | 1.968 | 0.040 | n/a | 0.668 | 14.179 | n/a | n/a | 0.040 | 3.142 | 0.149 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002a0 | 19.636 | 3.684 | 0.316 | 0.000 | 0.040 | 0.969 | 3.866 | 0.015 | n/a | 0.285 | 10.442 | n/a | n/a | 0.019 | 4.040 | 0.206 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002b3 | 18.873 | 2.131 | n/a | 0.000 | 0.041 | 4.358 | 1.052 | 0.011 | n/a | 0.044 | 11.216 | n/a | n/a | 0.021 | 2.172 | 0.115 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000028e | 17.485 | 5.268 | n/a | 0.000 | 0.165 | 0.919 | 1.501 | 0.016 | n/a | 0.077 | 9.467 | n/a | n/a | 0.073 | 5.432 | 0.311 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.034 | 0.000 | 0.000 | 0.546 | 2.204 | n/a | 0.000 | 0.064 | 0.614 | 1.097 | 0.014 | n/a | 0.292 | 5.466 | n/a | n/a | 0.031 | 2.255 | 0.210 | 0.031 |
| p99 | 21.060 | 1.661 | 0.000 | 0.698 | 3.382 | n/a | 0.000 | 0.209 | 1.141 | 2.406 | 0.040 | n/a | 0.668 | 14.179 | n/a | n/a | 0.097 | 3.591 | 0.347 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc000000000000029e | 21.060 | 3.078 | n/a | 0.000 | 0.063 | 1.022 | 1.968 | 0.040 | n/a | 0.668 | 14.179 | n/a | n/a | 0.040 | 3.142 | 0.149 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002c0 | 15.405 | 3.382 | n/a | 0.000 | 0.209 | 0.688 | 1.315 | 0.022 | n/a | 0.098 | 9.594 | n/a | n/a | 0.097 | 3.591 | 0.233 | 0.097 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002a5 | 14.380 | 1.929 | n/a | 0.000 | 0.064 | 0.614 | 0.888 | 0.015 | n/a | 0.430 | 10.406 | n/a | n/a | 0.034 | 1.993 | 0.139 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002b1 | 14.378 | 2.204 | n/a | 0.000 | 0.051 | 0.878 | 1.058 | 0.015 | n/a | 0.339 | 9.807 | n/a | n/a | 0.025 | 2.255 | 0.157 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000295 | 14.125 | 2.723 | n/a | 0.000 | 0.066 | 0.771 | 1.260 | 0.021 | n/a | 0.395 | 8.850 | n/a | n/a | 0.039 | 2.789 | 0.197 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002bd | 12.895 | 2.228 | n/a | 0.000 | 0.061 | 0.604 | 1.106 | 0.013 | n/a | 0.063 | 8.796 | n/a | n/a | 0.024 | 2.289 | 0.177 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002a8 | 11.990 | 1.944 | n/a | 0.000 | 0.051 | 0.428 | 1.119 | 0.013 | n/a | 0.318 | 8.090 | n/a | n/a | 0.027 | 1.995 | 0.166 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 9869415248c9e0bc00000000000002cb | 11.034 | 3.127 | n/a | 0.000 | 0.135 | 1.055 | 0.909 | 0.015 | n/a | 0.292 | 5.446 | n/a | n/a | 0.055 | 3.261 | 0.296 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002a1 | 10.755 | 3.225 | n/a | 0.000 | 0.112 | 0.759 | 1.043 | 0.014 | n/a | 0.329 | 5.215 | n/a | n/a | 0.057 | 3.337 | 0.310 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000287 | 9.454 | 2.992 | n/a | 0.000 | 0.104 | 0.535 | 1.675 | 0.013 | n/a | 0.052 | 4.037 | n/a | n/a | 0.045 | 3.096 | 0.327 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002b9 | 9.360 | 1.980 | n/a | 0.000 | 0.066 | 0.584 | 1.023 | 0.014 | n/a | 0.341 | 5.325 | n/a | n/a | 0.028 | 2.046 | 0.219 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002c4 | 9.327 | 1.893 | n/a | 0.000 | 0.069 | 0.523 | 1.097 | 0.012 | n/a | 0.236 | 5.466 | n/a | n/a | 0.031 | 1.962 | 0.210 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002c8 | 7.018 | 1.608 | n/a | 0.000 | 0.050 | 0.535 | 0.948 | 0.014 | n/a | 0.233 | 3.608 | n/a | n/a | 0.021 | 1.658 | 0.236 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000002cf | 5.524 | 1.857 | n/a | 0.000 | 0.061 | 1.141 | 2.406 | 0.009 | n/a | 0.022 | 0.000 | n/a | n/a | 0.029 | 1.917 | 0.347 | 0.029 | gw-w/thread-46/storage/begin-command! | none observed |

## P2 / L1024 / commit (874 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.469 | 0.383 | 0.000 | 0.541 | 2.211 | n/a | 0.000 | 0.052 | 0.569 | 0.923 | 0.010 | n/a | 0.087 | 5.722 | n/a | n/a | 0.018 | 2.510 | 0.231 | 0.018 |
| p99 | 60.535 | 2.673 | 0.041 | 2.271 | 7.375 | n/a | 0.000 | 21.156 | 7.753 | 11.407 | 0.056 | n/a | 4.041 | 50.990 | n/a | n/a | 0.061 | 24.835 | 0.679 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc00000000000004ad | 102.949 | 1.647 | n/a | 0.000 | 6.163 | 1.208 | 2.032 | 0.034 | n/a | 0.082 | 91.770 | n/a | n/a | 0.013 | 7.810 | 0.076 | 0.013 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.552ms; driver.expected-state.bind-receipt 1.131ms; driver.publication.readback 0.096ms; driver.publication.readback 0.087ms; driver.publication.readback 0.082ms |
| 9869415248c9e0bc00000000000004ab | 97.732 | 8.115 | n/a | 0.000 | 0.134 | 0.963 | 2.559 | 0.033 | n/a | 0.197 | 85.679 | n/a | n/a | 0.051 | 8.249 | 0.084 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.131ms; driver.publication.readback 0.096ms; driver.publication.readback 0.087ms; driver.reader-basis.broadcast 0.079ms; driver.publication.readback 0.062ms |
| 9869415248c9e0bc00000000000004af | 97.663 | 3.063 | n/a | 0.000 | 83.922 | 0.596 | 1.490 | 0.021 | n/a | 0.637 | 7.919 | n/a | n/a | 0.015 | 86.985 | 0.891 | 0.015 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.552ms; driver.expected-state.bind-receipt 1.131ms; driver.publication.readback 0.087ms; driver.publication.readback 0.082ms; driver.reader-basis.broadcast 0.079ms |
| 9869415248c9e0bc00000000000004ae | 93.246 | 2.407 | n/a | 0.000 | 0.056 | 0.435 | 0.846 | 0.015 | n/a | 0.216 | 89.240 | n/a | n/a | 0.031 | 2.463 | 0.026 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.552ms; driver.expected-state.bind-receipt 1.131ms; driver.publication.readback 0.087ms; driver.publication.readback 0.082ms; driver.reader-basis.broadcast 0.079ms |
| 9869415248c9e0bc0000000000000473 | 82.625 | 4.544 | n/a | 0.000 | 0.061 | 1.984 | 1.671 | 0.015 | n/a | 0.422 | 73.903 | n/a | n/a | 0.024 | 4.606 | 0.056 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.150ms; driver.publication.readback 0.062ms; driver.publication.readback 0.061ms; driver.reader-basis.broadcast 0.058ms; driver.publication.readback 0.045ms |
| 9869415248c9e0bc000000000000046b | 80.076 | 2.707 | n/a | 0.000 | 9.612 | 0.669 | 0.901 | 0.016 | n/a | 0.221 | 65.930 | n/a | n/a | 0.020 | 12.319 | 0.154 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.146ms; driver.publication.readback 0.107ms; driver.publication.readback 0.106ms; driver.publication.readback 0.062ms; driver.publication.readback 0.061ms |
| 9869415248c9e0bc0000000000000828 | 72.829 | 8.138 | n/a | 0.000 | 0.097 | 25.190 | 3.213 | 0.042 | n/a | 2.025 | 34.089 | n/a | n/a | 0.035 | 8.235 | 0.113 | 0.035 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.096ms; driver.publication.readback 0.091ms; driver.publication.persist-deferred 0.085ms; driver.publication.readback 0.069ms; driver.publication.readback 0.068ms |
| 9869415248c9e0bc000000000000042a | 60.755 | 2.894 | n/a | 0.000 | 31.569 | 2.911 | 1.359 | 0.050 | n/a | 0.668 | 21.282 | n/a | n/a | 0.022 | 34.463 | 0.567 | 0.022 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.636ms; driver.publication.persist-deferred 0.156ms; driver.publication.readback 0.130ms; driver.publication.readback 0.090ms; driver.publication.readback 0.057ms |
| 9869415248c9e0bc0000000000000422 | 60.535 | 4.756 | 3.364 | 0.000 | 0.098 | 2.231 | 26.039 | 0.039 | n/a | 0.052 | 23.921 | n/a | n/a | 0.036 | 8.217 | 0.136 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.751ms; driver.publication.readback 0.636ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.062ms; driver.publication.readback 0.057ms |
| 9869415248c9e0bc000000000000046f | 60.182 | 2.212 | n/a | 0.000 | 0.897 | 0.575 | 0.873 | 0.008 | n/a | 0.923 | 54.683 | n/a | n/a | 0.011 | 3.110 | 0.052 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.146ms; driver.publication.readback 0.107ms; driver.publication.readback 0.106ms; driver.publication.readback 0.062ms; driver.reader-basis.broadcast 0.058ms |
| 9869415248c9e0bc00000000000004aa | 60.156 | 2.326 | n/a | 0.000 | 0.024 | 0.548 | 1.304 | 0.010 | n/a | 0.052 | 55.876 | n/a | n/a | 0.015 | 2.350 | 0.039 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.131ms; driver.publication.readback 0.096ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.037ms; driver.publication.persist-deferred 0.030ms |
| 9869415248c9e0bc0000000000000425 | 58.208 | 3.459 | n/a | 0.000 | 0.802 | 18.215 | 1.180 | 0.007 | n/a | 0.015 | 34.519 | n/a | n/a | 0.011 | 4.261 | 0.073 | 0.011 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.751ms; driver.publication.readback 0.636ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.062ms; driver.publication.readback 0.057ms |
| 9869415248c9e0bc000000000000033a | 57.764 | 1.755 | n/a | 0.000 | 0.032 | 0.512 | 0.753 | 0.012 | n/a | 0.065 | 54.605 | n/a | n/a | 0.028 | 1.788 | 0.031 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 9869415248c9e0bc0000000000000472 | 55.740 | 2.949 | n/a | 0.000 | 0.104 | 0.656 | 0.935 | 0.012 | n/a | 0.052 | 50.990 | n/a | n/a | 0.041 | 3.054 | 0.055 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.150ms; driver.publication.readback 0.062ms; driver.publication.readback 0.061ms; driver.reader-basis.broadcast 0.058ms; driver.publication.persist-deferred 0.043ms |
| 9869415248c9e0bc000000000000046e | 55.392 | 3.814 | n/a | 0.000 | 0.155 | 2.356 | 4.374 | 0.014 | n/a | 0.454 | 44.216 | n/a | n/a | 0.010 | 3.969 | 0.072 | 0.010 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.146ms; driver.publication.readback 0.107ms; driver.publication.readback 0.106ms; driver.reader-basis.broadcast 0.058ms; driver.publication.readback 0.049ms |
| 9869415248c9e0bc000000000000043c | 53.915 | 2.720 | n/a | 0.000 | 1.322 | 0.496 | 0.777 | 0.011 | n/a | 0.207 | 48.365 | n/a | n/a | 0.017 | 4.042 | 0.075 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.077ms |
| 9869415248c9e0bc000000000000042c | 52.981 | 3.208 | n/a | 0.000 | 41.952 | 0.828 | 1.666 | 0.023 | n/a | 0.182 | 5.100 | n/a | n/a | 0.023 | 45.160 | 0.852 | 0.023 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.156ms; driver.publication.readback 0.130ms; driver.publication.readback 0.090ms; driver.publication.readback 0.081ms; driver.publication.readback 0.062ms |
| 9869415248c9e0bc000000000000033b | 51.964 | 1.413 | n/a | 0.000 | 0.014 | 1.126 | 0.992 | 0.017 | n/a | 0.353 | 48.021 | n/a | n/a | 0.028 | 1.427 | 0.027 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms; driver.publication.persist-deferred 0.020ms |
| 9869415248c9e0bc0000000000000827 | 51.761 | 3.892 | n/a | 0.000 | 12.197 | 0.508 | 2.962 | 0.031 | n/a | 0.076 | 32.084 | n/a | n/a | 0.011 | 16.090 | 0.311 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.114ms; driver.publication.readback 0.091ms; driver.publication.readback 0.069ms; driver.publication.readback 0.068ms; driver.publication.readback 0.046ms |
| 9869415248c9e0bc0000000000000358 | 51.617 | 4.062 | n/a | 0.000 | 0.023 | 10.355 | 7.311 | 0.010 | n/a | 2.111 | 27.732 | n/a | n/a | 0.013 | 4.084 | 0.079 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.295ms; driver.publication.readback 0.077ms; driver.publication.readback 0.064ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.025ms |

## P2 / L1024 / commit / 5-10 facts (511 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.848 | 0.000 | 0.000 | 0.419 | 1.788 | n/a | 0.000 | 0.054 | 0.561 | 0.778 | 0.010 | n/a | 0.082 | 4.960 | n/a | n/a | 0.018 | 2.133 | 0.220 | 0.018 |
| p99 | 57.764 | 2.000 | 0.035 | 1.011 | 4.262 | n/a | 0.000 | 21.334 | 5.735 | 6.831 | 0.054 | n/a | 3.727 | 48.021 | n/a | n/a | 0.056 | 24.835 | 0.708 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc00000000000004ad | 102.949 | 1.647 | n/a | 0.000 | 6.163 | 1.208 | 2.032 | 0.034 | n/a | 0.082 | 91.770 | n/a | n/a | 0.013 | 7.810 | 0.076 | 0.013 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.552ms; driver.expected-state.bind-receipt 1.131ms; driver.publication.readback 0.096ms; driver.publication.readback 0.087ms; driver.publication.readback 0.082ms |
| 9869415248c9e0bc00000000000004ae | 93.246 | 2.407 | n/a | 0.000 | 0.056 | 0.435 | 0.846 | 0.015 | n/a | 0.216 | 89.240 | n/a | n/a | 0.031 | 2.463 | 0.026 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.552ms; driver.expected-state.bind-receipt 1.131ms; driver.publication.readback 0.087ms; driver.publication.readback 0.082ms; driver.reader-basis.broadcast 0.079ms |
| 9869415248c9e0bc000000000000046b | 80.076 | 2.707 | n/a | 0.000 | 9.612 | 0.669 | 0.901 | 0.016 | n/a | 0.221 | 65.930 | n/a | n/a | 0.020 | 12.319 | 0.154 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.146ms; driver.publication.readback 0.107ms; driver.publication.readback 0.106ms; driver.publication.readback 0.062ms; driver.publication.readback 0.061ms |
| 9869415248c9e0bc000000000000042a | 60.755 | 2.894 | n/a | 0.000 | 31.569 | 2.911 | 1.359 | 0.050 | n/a | 0.668 | 21.282 | n/a | n/a | 0.022 | 34.463 | 0.567 | 0.022 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.636ms; driver.publication.persist-deferred 0.156ms; driver.publication.readback 0.130ms; driver.publication.readback 0.090ms; driver.publication.readback 0.057ms |
| 9869415248c9e0bc000000000000046f | 60.182 | 2.212 | n/a | 0.000 | 0.897 | 0.575 | 0.873 | 0.008 | n/a | 0.923 | 54.683 | n/a | n/a | 0.011 | 3.110 | 0.052 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.146ms; driver.publication.readback 0.107ms; driver.publication.readback 0.106ms; driver.publication.readback 0.062ms; driver.reader-basis.broadcast 0.058ms |
| 9869415248c9e0bc000000000000033a | 57.764 | 1.755 | n/a | 0.000 | 0.032 | 0.512 | 0.753 | 0.012 | n/a | 0.065 | 54.605 | n/a | n/a | 0.028 | 1.788 | 0.031 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 9869415248c9e0bc000000000000042c | 52.981 | 3.208 | n/a | 0.000 | 41.952 | 0.828 | 1.666 | 0.023 | n/a | 0.182 | 5.100 | n/a | n/a | 0.023 | 45.160 | 0.852 | 0.023 | node-13/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.156ms; driver.publication.readback 0.130ms; driver.publication.readback 0.090ms; driver.publication.readback 0.081ms; driver.publication.readback 0.062ms |
| 9869415248c9e0bc000000000000033b | 51.964 | 1.413 | n/a | 0.000 | 0.014 | 1.126 | 0.992 | 0.017 | n/a | 0.353 | 48.021 | n/a | n/a | 0.028 | 1.427 | 0.027 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms; driver.publication.persist-deferred 0.020ms |
| 9869415248c9e0bc0000000000000449 | 48.102 | 2.498 | n/a | 0.000 | 2.929 | 0.397 | 0.762 | 0.010 | n/a | 0.014 | 41.471 | n/a | n/a | 0.021 | 5.427 | 0.113 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.064ms; driver.publication.readback 0.139ms; driver.publication.readback 0.138ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.040ms |
| 9869415248c9e0bc000000000000038e | 47.301 | 1.657 | n/a | 0.000 | 0.033 | 1.514 | 1.416 | 0.045 | n/a | 2.393 | 40.222 | n/a | n/a | 0.021 | 1.690 | 0.036 | 0.021 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.017ms |
| 9869415248c9e0bc0000000000000357 | 45.233 | 3.288 | n/a | 0.000 | 0.044 | 12.359 | 1.221 | 0.011 | n/a | 3.656 | 24.583 | n/a | n/a | 0.071 | 3.333 | 0.074 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.295ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.025ms |
| 9869415248c9e0bc0000000000000629 | 44.637 | 1.467 | n/a | 0.000 | 0.042 | 0.470 | 1.824 | 0.016 | n/a | 0.290 | 40.509 | n/a | n/a | 0.020 | 1.509 | 0.034 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.014ms |
| 9869415248c9e0bc0000000000000355 | 41.974 | 2.823 | n/a | 0.000 | 0.087 | 0.996 | 16.693 | 0.014 | n/a | 0.054 | 21.268 | n/a | n/a | 0.039 | 2.909 | 0.069 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.025ms |
| 9869415248c9e0bc0000000000000421 | 40.762 | 2.540 | n/a | 0.000 | 0.061 | 4.016 | 2.313 | 4.836 | n/a | 0.111 | 26.857 | n/a | n/a | 0.028 | 2.601 | 0.064 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.044ms |
| 9869415248c9e0bc0000000000000430 | 40.121 | 1.983 | n/a | 0.000 | 27.314 | 0.495 | 1.401 | 0.038 | n/a | 0.067 | 8.804 | n/a | n/a | 0.017 | 29.298 | 0.730 | 0.017 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.081ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.055ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.048ms |
| 9869415248c9e0bc0000000000000356 | 39.508 | 2.781 | n/a | 0.000 | 1.499 | 10.446 | 0.891 | 0.016 | n/a | 0.039 | 23.820 | n/a | n/a | 0.017 | 4.280 | 0.108 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000447 | 39.437 | 2.156 | n/a | 0.000 | 1.549 | 0.782 | 0.663 | 0.005 | n/a | 0.133 | 34.139 | n/a | n/a | 0.010 | 3.705 | 0.094 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.138ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.020ms |
| 9869415248c9e0bc00000000000004b9 | 38.424 | 2.783 | n/a | 0.000 | 22.940 | 0.821 | 1.545 | 0.031 | n/a | 0.198 | 10.075 | n/a | n/a | 0.031 | 25.723 | 0.669 | 0.031 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.169ms; driver.publication.readback 0.078ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.053ms |
| 9869415248c9e0bc000000000000035b | 38.380 | 2.660 | n/a | 0.000 | 0.096 | 13.727 | 16.628 | 0.052 | n/a | 0.127 | 5.052 | n/a | n/a | 0.038 | 2.756 | 0.072 | 0.038 | node-13/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.227ms; driver.publication.readback 0.295ms; driver.publication.persist-deferred 0.130ms; driver.publication.readback 0.088ms; driver.reader-basis.broadcast 0.081ms |
| 9869415248c9e0bc00000000000004b6 | 37.824 | 3.500 | n/a | 0.000 | 21.334 | 0.804 | 0.946 | 0.011 | n/a | 0.072 | 11.132 | n/a | n/a | 0.024 | 24.835 | 0.657 | 0.024 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.074ms; driver.publication.readback 0.109ms; driver.publication.readback 0.078ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.048ms |

## P2/P4 / read-your-own-write / read (79 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 95.073 | n/a | n/a | n/a | 46.222 | 2.673 | 3.314 | 0.000 | 0.850 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.787 | 64.634 | 0.789 | 25.787 |
| p99 | 528.074 | n/a | n/a | n/a | 222.703 | 214.613 | 41.708 | 0.000 | 203.215 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 252.012 | 281.668 | 1.000 | 252.012 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc0000000000001ba2 | 528.074 | 222.703 | 0.503 | 41.708 | 0.000 | 203.215 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.945 | 264.915 | 0.502 | 59.945 | node-13/thread-3/socket.body-read | driver.expected-state.bind-receipt 1.956ms; driver.reader-basis.broadcast 0.911ms; driver.reader-basis.broadcast 0.835ms; driver.reader-basis.broadcast 0.810ms; driver.reader-basis.broadcast 0.348ms |
| 9869415248c9e0bc0000000000001be2 | 409.866 | 135.995 | 1.681 | 16.804 | 0.000 | 3.374 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 252.012 | 154.480 | 0.377 | 252.012 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.596ms; driver.expected-state.bind-receipt 1.296ms; driver.expected-state.bind-receipt 1.126ms; driver.expected-state.bind-receipt 1.100ms; driver.expected-state.bind-receipt 1.028ms |
| 9869415248c9e0bc0000000000001be4 | 326.055 | 136.099 | 0.862 | 12.617 | 0.000 | 4.416 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 172.061 | 149.578 | 0.459 | 172.061 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.596ms; driver.expected-state.bind-receipt 1.296ms; driver.expected-state.bind-receipt 1.028ms; driver.reader-basis.broadcast 0.810ms; driver.publication.readback 0.714ms |
| 9869415248c9e0bc0000000000001bde | 316.931 | 64.953 | 57.695 | 1.834 | 0.000 | 0.719 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 191.731 | 124.482 | 0.393 | 191.731 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.596ms; driver.expected-state.bind-receipt 1.296ms; driver.expected-state.bind-receipt 1.028ms; driver.reader-basis.broadcast 0.810ms; driver.publication.readback 0.714ms |
| 9869415248c9e0bc0000000000000e38 | 308.462 | 59.590 | 214.613 | 7.466 | 0.000 | 0.445 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.349 | 281.668 | 0.913 | 26.349 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.253ms; driver.expected-state.bind-receipt 1.119ms; driver.publication.readback 0.314ms; driver.reader-basis.broadcast 0.220ms; driver.reader-basis.broadcast 0.163ms |
| 9869415248c9e0bc0000000000000e2c | 305.057 | 59.455 | 182.251 | 2.848 | 0.000 | 0.691 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.812 | 244.554 | 0.802 | 59.812 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.472ms; driver.expected-state.bind-receipt 1.253ms; driver.expected-state.bind-receipt 1.119ms; driver.reader-basis.broadcast 0.968ms; driver.publication.readback 0.314ms |
| 9869415248c9e0bc0000000000001bdd | 301.894 | 171.305 | 41.882 | 19.382 | 0.000 | 1.835 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 67.490 | 232.569 | 0.770 | 67.490 | node-13/thread-3/client.reach | driver.expected-state.bind-receipt 1.596ms; driver.expected-state.bind-receipt 1.296ms; driver.expected-state.bind-receipt 1.028ms; driver.reader-basis.broadcast 0.810ms; driver.publication.readback 0.714ms |
| 9869415248c9e0bc0000000000001ba4 | 294.225 | 73.023 | 0.550 | 4.737 | 0.000 | 1.066 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 214.849 | 78.310 | 0.266 | 214.849 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.835ms; driver.reader-basis.broadcast 0.348ms; driver.reader-basis.broadcast 0.304ms; driver.publication.readback 0.146ms; driver.publication.readback 0.117ms |
| 9869415248c9e0bc0000000000000e33 | 290.740 | 70.733 | 129.777 | 7.054 | 0.000 | 5.494 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.682 | 207.563 | 0.714 | 77.682 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.472ms; driver.expected-state.bind-receipt 1.253ms; driver.expected-state.bind-receipt 1.119ms; driver.publication.readback 0.314ms; driver.reader-basis.broadcast 0.220ms |
| 9869415248c9e0bc0000000000000e29 | 287.303 | 21.536 | 198.551 | 0.000 | 0.000 | 0.387 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.829 | 220.087 | 0.766 | 66.829 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.472ms; driver.expected-state.bind-receipt 1.253ms; driver.expected-state.bind-receipt 1.119ms; driver.reader-basis.broadcast 0.968ms; driver.publication.readback 0.314ms |
| 9869415248c9e0bc000000000000178b | 279.732 | 36.464 | 0.554 | 0.889 | 0.000 | 51.632 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 190.193 | 37.907 | 0.136 | 190.193 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.252ms; driver.expected-state.bind-receipt 1.236ms; driver.reader-basis.broadcast 0.922ms; driver.reader-basis.broadcast 0.647ms; driver.publication.readback 0.455ms |
| 9869415248c9e0bc0000000000001ba6 | 276.565 | 69.661 | 0.313 | 6.069 | 0.000 | 0.858 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 199.664 | 76.043 | 0.275 | 199.664 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.835ms; driver.reader-basis.broadcast 0.348ms; driver.reader-basis.broadcast 0.304ms; driver.publication.readback 0.146ms; driver.publication.readback 0.117ms |
| 9869415248c9e0bc0000000000001996 | 271.086 | 222.114 | 0.288 | 24.384 | 0.000 | 2.238 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.063 | 246.786 | 0.910 | 22.063 | node-13/thread-3/client.reach | driver.publication.readback 0.281ms; driver.reader-basis.broadcast 0.280ms; driver.reader-basis.broadcast 0.273ms; driver.reader-basis.broadcast 0.253ms; driver.publication.readback 0.222ms |
| 9869415248c9e0bc00000000000017d7 | 266.696 | 217.082 | 1.178 | 24.771 | 0.000 | 1.330 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.335 | 243.031 | 0.911 | 22.335 | node-13/thread-3/client.reach | driver.expected-state.bind-receipt 1.248ms; driver.reader-basis.broadcast 0.571ms; driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.157ms; driver.publication.readback 0.150ms |
| 9869415248c9e0bc0000000000001d58 | 266.450 | 217.304 | 1.167 | 31.528 | 0.000 | 1.623 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.827 | 250.000 | 0.938 | 14.827 | node-13/thread-3/client.reach | driver.expected-state.bind-receipt 1.792ms; driver.reader-basis.broadcast 0.317ms; driver.reader-basis.broadcast 0.292ms; driver.reader-basis.broadcast 0.283ms; driver.publication.readback 0.140ms |
| 9869415248c9e0bc000000000000178c | 263.510 | 142.960 | 0.159 | 16.774 | 0.000 | 1.354 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 102.263 | 159.893 | 0.607 | 102.263 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.252ms; driver.expected-state.bind-receipt 1.236ms; driver.reader-basis.broadcast 0.922ms; driver.reader-basis.broadcast 0.647ms; driver.publication.readback 0.455ms |
| 9869415248c9e0bc0000000000001ba8 | 263.047 | 194.963 | 0.193 | 29.805 | 0.000 | 1.918 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.167 | 224.961 | 0.855 | 36.167 | node-13/thread-3/client.reach | driver.reader-basis.broadcast 0.835ms; driver.reader-basis.broadcast 0.348ms; driver.reader-basis.broadcast 0.304ms; driver.publication.readback 0.146ms; driver.publication.readback 0.117ms |
| 9869415248c9e0bc0000000000000e37 | 261.036 | 32.470 | 200.089 | 4.045 | 0.000 | 0.421 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.010 | 236.604 | 0.906 | 24.010 | node-13/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.472ms; driver.expected-state.bind-receipt 1.253ms; driver.expected-state.bind-receipt 1.119ms; driver.publication.readback 0.314ms; driver.reader-basis.broadcast 0.220ms |
| 9869415248c9e0bc0000000000000e1e | 255.001 | 43.099 | 0.519 | 4.023 | 0.000 | 0.710 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 206.650 | 47.641 | 0.187 | 206.650 | node-13/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.641ms; driver.expected-state.bind-receipt 1.472ms; driver.expected-state.bind-receipt 1.253ms; driver.expected-state.bind-receipt 1.119ms; driver.expected-state.bind-receipt 1.024ms |
| 9869415248c9e0bc0000000000001d5c | 251.134 | 27.166 | 17.284 | 1.329 | 0.000 | 0.529 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 204.827 | 45.778 | 0.182 | 204.827 | node-13/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.317ms; driver.reader-basis.broadcast 0.292ms; driver.reader-basis.broadcast 0.283ms; driver.publication.readback 0.140ms; driver.publication.readback 0.139ms |

## P2 / tail / commit (2594 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.034 | 0.410 | 0.000 | 0.523 | 2.146 | n/a | 0.000 | 0.038 | 0.507 | 0.878 | 0.008 | n/a | 0.058 | 4.321 | n/a | n/a | 0.013 | 2.443 | 0.272 | 0.013 |
| p99 | 47.862 | 2.555 | 0.045 | 2.099 | 6.878 | n/a | 0.000 | 10.153 | 6.955 | 7.404 | 0.042 | n/a | 1.653 | 37.295 | n/a | n/a | 0.049 | 13.713 | 0.642 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc0000000000000ec4 | 102.547 | 1.471 | n/a | 0.000 | 0.035 | 0.453 | 0.652 | 0.008 | n/a | 0.206 | 99.708 | n/a | n/a | 0.014 | 1.506 | 0.015 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms |
| 9869415248c9e0bc0000000000000ec5 | 102.108 | 1.479 | n/a | 0.000 | 0.018 | 0.414 | 0.425 | 0.005 | n/a | 0.136 | 99.625 | n/a | n/a | 0.007 | 1.496 | 0.015 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.018ms |
| 9869415248c9e0bc0000000000000ec8 | 97.040 | 4.063 | n/a | 0.000 | 1.043 | 6.218 | 0.888 | 0.007 | n/a | 0.027 | 84.777 | n/a | n/a | 0.016 | 5.106 | 0.053 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.018ms |
| 9869415248c9e0bc0000000000000ec7 | 95.654 | 2.132 | n/a | 0.000 | 0.019 | 4.819 | 0.436 | 0.005 | n/a | 0.134 | 88.098 | n/a | n/a | 0.010 | 2.151 | 0.022 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.018ms |
| 9869415248c9e0bc0000000000000ec6 | 93.553 | 1.815 | n/a | 0.000 | 0.025 | 1.308 | 0.417 | 0.005 | n/a | 0.153 | 89.818 | n/a | n/a | 0.012 | 1.840 | 0.020 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.018ms |
| 9869415248c9e0bc0000000000000ec9 | 87.674 | 2.371 | n/a | 0.000 | 0.035 | 7.627 | 0.682 | 0.020 | n/a | 0.066 | 76.861 | n/a | n/a | 0.012 | 2.406 | 0.027 | 0.012 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.018ms |
| 9869415248c9e0bc0000000000000d6c | 66.074 | 5.053 | n/a | 0.000 | 0.056 | 16.226 | 2.161 | 0.027 | n/a | 0.053 | 42.486 | n/a | n/a | 0.012 | 5.109 | 0.077 | 0.012 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.409ms; driver.publication.readback 0.212ms; driver.publication.readback 0.126ms; driver.publication.readback 0.053ms; driver.publication.readback 0.052ms |
| 9869415248c9e0bc00000000000017c1 | 63.044 | 2.071 | n/a | 0.000 | 2.018 | 3.567 | 1.083 | 0.016 | n/a | 1.457 | 52.821 | n/a | n/a | 0.011 | 4.088 | 0.065 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000017c0 | 61.649 | 3.021 | n/a | 0.000 | 0.065 | 2.975 | 2.657 | 0.014 | n/a | 0.043 | 52.848 | n/a | n/a | 0.025 | 3.087 | 0.050 | 0.025 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000197a | 60.082 | 1.425 | n/a | 0.000 | 0.013 | 0.333 | 0.755 | 0.007 | n/a | 0.052 | 57.487 | n/a | n/a | 0.009 | 1.438 | 0.024 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000115b | 59.294 | 14.203 | n/a | 0.000 | 1.829 | 3.186 | 8.740 | 0.045 | n/a | 7.607 | 23.640 | n/a | n/a | 0.043 | 16.032 | 0.270 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000009e2 | 58.447 | 2.761 | n/a | 0.000 | 0.013 | 14.403 | 12.920 | 0.016 | n/a | 0.023 | 28.302 | n/a | n/a | 0.008 | 2.775 | 0.047 | 0.008 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.541ms; driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.094ms; driver.publication.readback 0.052ms; driver.publication.readback 0.052ms |
| 9869415248c9e0bc0000000000000d6b | 57.785 | 5.659 | n/a | 0.000 | 3.616 | 2.087 | 2.676 | 0.024 | n/a | 0.036 | 43.669 | n/a | n/a | 0.019 | 9.275 | 0.161 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.409ms; driver.publication.readback 0.126ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.031ms |
| 9869415248c9e0bc0000000000000cb2 | 57.278 | 3.018 | n/a | 0.000 | 43.557 | 0.721 | 0.759 | 0.011 | n/a | 0.044 | 9.155 | n/a | n/a | 0.012 | 46.575 | 0.813 | 0.012 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.104ms; driver.reader-basis.broadcast 0.138ms; driver.publication.readback 0.098ms; driver.publication.readback 0.061ms; driver.publication.readback 0.055ms |
| 9869415248c9e0bc00000000000017c2 | 57.246 | 2.092 | n/a | 0.000 | 0.021 | 4.455 | 1.779 | 0.026 | n/a | 0.092 | 48.771 | n/a | n/a | 0.009 | 2.114 | 0.037 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000eca | 56.394 | 3.061 | n/a | 0.000 | 0.048 | 9.230 | 0.868 | 0.006 | n/a | 0.031 | 43.132 | n/a | n/a | 0.017 | 3.109 | 0.055 | 0.017 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.574ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.014ms |
| 9869415248c9e0bc0000000000001d2e | 54.275 | 2.428 | n/a | 0.000 | 0.023 | 1.511 | 1.696 | 0.006 | n/a | 0.035 | 48.566 | n/a | n/a | 0.010 | 2.451 | 0.045 | 0.010 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.301ms; driver.publication.persist-deferred 0.016ms |
| 9869415248c9e0bc0000000000000d67 | 53.059 | 4.754 | 0.256 | 0.000 | 0.028 | 1.531 | 6.573 | 0.034 | n/a | 0.072 | 39.801 | n/a | n/a | 0.011 | 5.038 | 0.095 | 0.011 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.409ms; driver.publication.readback 0.126ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.031ms |
| 9869415248c9e0bc0000000000000e24 | 52.363 | 5.257 | n/a | 0.000 | 29.528 | 1.003 | 2.150 | 0.030 | n/a | 0.085 | 14.260 | n/a | n/a | 0.050 | 34.785 | 0.664 | 0.050 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.641ms; driver.expected-state.bind-receipt 1.024ms; driver.publication.readback 0.559ms; driver.publication.persist-deferred 0.232ms; driver.publication.readback 0.230ms |
| 9869415248c9e0bc0000000000001b6f | 52.091 | 7.303 | 0.219 | 0.000 | 0.014 | 2.979 | 7.467 | 0.022 | n/a | 0.254 | 33.824 | n/a | n/a | 0.007 | 7.537 | 0.145 | 0.007 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.046ms; driver.publication.readback 0.032ms; driver.publication.readback 0.029ms |

## P2 / tail / commit / 5-10 facts (1537 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.730 | 0.000 | 0.000 | 0.403 | 1.693 | n/a | 0.000 | 0.038 | 0.491 | 0.727 | 0.008 | n/a | 0.059 | 3.822 | n/a | n/a | 0.013 | 1.962 | 0.255 | 0.013 |
| p99 | 47.541 | 1.996 | 0.039 | 1.058 | 5.717 | n/a | 0.000 | 11.598 | 6.955 | 3.224 | 0.043 | n/a | 1.516 | 37.891 | n/a | n/a | 0.049 | 15.376 | 0.659 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9869415248c9e0bc0000000000000ec4 | 102.547 | 1.471 | n/a | 0.000 | 0.035 | 0.453 | 0.652 | 0.008 | n/a | 0.206 | 99.708 | n/a | n/a | 0.014 | 1.506 | 0.015 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms |
| 9869415248c9e0bc0000000000000ec5 | 102.108 | 1.479 | n/a | 0.000 | 0.018 | 0.414 | 0.425 | 0.005 | n/a | 0.136 | 99.625 | n/a | n/a | 0.007 | 1.496 | 0.015 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.018ms |
| 9869415248c9e0bc0000000000000ec7 | 95.654 | 2.132 | n/a | 0.000 | 0.019 | 4.819 | 0.436 | 0.005 | n/a | 0.134 | 88.098 | n/a | n/a | 0.010 | 2.151 | 0.022 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.018ms |
| 9869415248c9e0bc0000000000000ec6 | 93.553 | 1.815 | n/a | 0.000 | 0.025 | 1.308 | 0.417 | 0.005 | n/a | 0.153 | 89.818 | n/a | n/a | 0.012 | 1.840 | 0.020 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.018ms |
| 9869415248c9e0bc0000000000000d6c | 66.074 | 5.053 | n/a | 0.000 | 0.056 | 16.226 | 2.161 | 0.027 | n/a | 0.053 | 42.486 | n/a | n/a | 0.012 | 5.109 | 0.077 | 0.012 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.409ms; driver.publication.readback 0.212ms; driver.publication.readback 0.126ms; driver.publication.readback 0.053ms; driver.publication.readback 0.052ms |
| 9869415248c9e0bc00000000000017c1 | 63.044 | 2.071 | n/a | 0.000 | 2.018 | 3.567 | 1.083 | 0.016 | n/a | 1.457 | 52.821 | n/a | n/a | 0.011 | 4.088 | 0.065 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc00000000000017c0 | 61.649 | 3.021 | n/a | 0.000 | 0.065 | 2.975 | 2.657 | 0.014 | n/a | 0.043 | 52.848 | n/a | n/a | 0.025 | 3.087 | 0.050 | 0.025 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000197a | 60.082 | 1.425 | n/a | 0.000 | 0.013 | 0.333 | 0.755 | 0.007 | n/a | 0.052 | 57.487 | n/a | n/a | 0.009 | 1.438 | 0.024 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc000000000000115b | 59.294 | 14.203 | n/a | 0.000 | 1.829 | 3.186 | 8.740 | 0.045 | n/a | 7.607 | 23.640 | n/a | n/a | 0.043 | 16.032 | 0.270 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000cb2 | 57.278 | 3.018 | n/a | 0.000 | 43.557 | 0.721 | 0.759 | 0.011 | n/a | 0.044 | 9.155 | n/a | n/a | 0.012 | 46.575 | 0.813 | 0.012 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.104ms; driver.reader-basis.broadcast 0.138ms; driver.publication.readback 0.098ms; driver.publication.readback 0.061ms; driver.publication.readback 0.055ms |
| 9869415248c9e0bc00000000000017c2 | 57.246 | 2.092 | n/a | 0.000 | 0.021 | 4.455 | 1.779 | 0.026 | n/a | 0.092 | 48.771 | n/a | n/a | 0.009 | 2.114 | 0.037 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 9869415248c9e0bc0000000000000e24 | 52.363 | 5.257 | n/a | 0.000 | 29.528 | 1.003 | 2.150 | 0.030 | n/a | 0.085 | 14.260 | n/a | n/a | 0.050 | 34.785 | 0.664 | 0.050 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.641ms; driver.expected-state.bind-receipt 1.024ms; driver.publication.readback 0.559ms; driver.publication.persist-deferred 0.232ms; driver.publication.readback 0.230ms |
| 9869415248c9e0bc0000000000000cb1 | 51.868 | 2.812 | n/a | 0.000 | 40.180 | 0.532 | 0.982 | 0.022 | n/a | 0.141 | 7.183 | n/a | n/a | 0.017 | 42.991 | 0.829 | 0.017 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.104ms; driver.reader-basis.broadcast 0.138ms; driver.publication.readback 0.061ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.028ms |
| 9869415248c9e0bc000000000000162b | 50.563 | 2.395 | n/a | 0.000 | 0.718 | 0.566 | 1.301 | 0.021 | n/a | 0.113 | 45.445 | n/a | n/a | 0.006 | 3.112 | 0.062 | 0.006 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.633ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.039ms |
| 9869415248c9e0bc0000000000001209 | 47.862 | 2.490 | n/a | 0.000 | 0.228 | 39.187 | 1.235 | 0.019 | n/a | 0.198 | 4.451 | n/a | n/a | 0.053 | 2.718 | 0.057 | 0.053 | node-13/thread-0/socket.wait-first-byte | none observed |
| 9869415248c9e0bc00000000000009e1 | 47.541 | 1.635 | n/a | 0.000 | 1.865 | 2.410 | 22.755 | 0.012 | n/a | 0.045 | 18.809 | n/a | n/a | 0.009 | 3.500 | 0.074 | 0.009 | gw-w/thread-43/gateway.request-parse | driver.reader-basis.broadcast 0.112ms; driver.publication.readback 0.052ms; driver.publication.readback 0.050ms; driver.publication.readback 0.034ms; driver.publication.persist-deferred 0.013ms |
| 9869415248c9e0bc0000000000001b6b | 47.162 | 1.832 | n/a | 0.000 | 0.009 | 0.296 | 0.967 | 0.005 | n/a | 0.165 | 43.880 | n/a | n/a | 0.007 | 1.841 | 0.039 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.018ms |
| 9869415248c9e0bc0000000000001b6e | 47.129 | 1.687 | n/a | 0.000 | 0.102 | 3.154 | 2.113 | 0.007 | n/a | 0.034 | 40.026 | n/a | n/a | 0.006 | 1.789 | 0.038 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.046ms |
| 9869415248c9e0bc0000000000001d2f | 46.442 | 1.993 | n/a | 0.000 | 0.047 | 0.752 | 0.583 | 0.005 | n/a | 0.030 | 43.014 | n/a | n/a | 0.019 | 2.041 | 0.044 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.301ms |
| 9869415248c9e0bc00000000000011f2 | 44.280 | 2.119 | n/a | 0.000 | 32.845 | 4.681 | 0.510 | 0.005 | n/a | 0.023 | 4.084 | n/a | n/a | 0.012 | 34.965 | 0.790 | 0.012 | node-13/thread-0/driver.queue.subject | driver.publication.readback 0.107ms; driver.publication.readback 0.062ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.015ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.400 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 200.723 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 |
| p99 | 292.776 | n/a | n/a | n/a | 23.137 | n/a | 1.157 | 0.000 | 7.240 | 286.470 | 0.107 | n/a | 0.107 | 0.000 | n/a | n/a | 45.415 | 23.137 | 0.288 | 45.415 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d00000000000000002 | 292.776 | 2.751 | n/a | 0.000 | 0.000 | 3.049 | 286.470 | 0.107 | n/a | 0.104 | 0.000 | n/a | n/a | 0.295 | 2.751 | 0.009 | 0.295 | gw-r/thread-49/gateway.admitted-work | none observed |
| f9a12d1019a59a900000000000000005 | 206.288 | 0.000 | n/a | 0.000 | 0.000 | 3.045 | 202.867 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.288 | 0.000 | 0.000 | 0.288 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000006 | 203.571 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 202.378 | 0.006 | n/a | 0.107 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a900000000000000007 | 202.583 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 201.217 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.425 | 0.000 | 0.000 | 0.425 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000f12 | 201.431 | 0.000 | n/a | 0.000 | 0.000 | 0.541 | 200.723 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000f14 | 201.400 | 0.000 | n/a | 0.000 | 0.000 | 0.487 | 200.734 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a900000000000000f13 | 201.315 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 200.531 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-68/journal/page | none observed |
| f9a12d1019a59a900000000000000f11 | 200.964 | 0.000 | n/a | 0.000 | 0.000 | 0.300 | 200.539 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-66/journal/page | none observed |
| f9a12d1019a59a900000000000000f17 | 119.561 | 21.683 | n/a | 1.157 | 0.000 | 6.832 | 89.726 | 0.006 | n/a | 0.008 | 0.000 | n/a | n/a | 0.148 | 22.840 | 0.191 | 0.148 | gw-r/thread-45/gateway.admitted-work | none observed |
| f9a12d1019a59a900000000000000f18 | 80.401 | 23.137 | n/a | 0.000 | 0.000 | 6.793 | 50.295 | 0.008 | n/a | 0.011 | 0.000 | n/a | n/a | 0.156 | 23.137 | 0.288 | 0.156 | gw-r/thread-64/gateway.admitted-work | none observed |
| f9a12d1019a59a900000000000000f19 | 73.274 | 19.583 | n/a | 1.037 | 0.000 | 7.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.415 | 20.620 | 0.281 | 45.415 | node-13/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 859.143 | n/a | n/a | n/a | 0.249 | n/a | 0.000 | 0.000 | 0.644 | 834.810 | 0.005 | n/a | 0.068 | 0.000 | n/a | n/a | 0.254 | 0.249 | 0.000 | 0.254 |
| p99 | 1008.278 | n/a | n/a | n/a | 23.362 | n/a | 0.000 | 0.000 | 3.713 | 1002.621 | 0.019 | n/a | 0.378 | 0.000 | n/a | n/a | 1.298 | 23.362 | 0.027 | 1.298 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d000000000000000a4 | 1008.278 | 0.249 | n/a | 0.000 | 0.000 | 3.713 | 1002.621 | 0.019 | n/a | 0.378 | 0.000 | n/a | n/a | 1.298 | 0.249 | 0.000 | 1.298 | gw-r/thread-46/journal/page | none observed |
| 25091db8ed0af6d000000000000000a5 | 859.143 | 23.362 | n/a | 0.000 | 0.000 | 0.644 | 834.810 | 0.005 | n/a | 0.068 | 0.000 | n/a | n/a | 0.254 | 23.362 | 0.027 | 0.254 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 500.024 | n/a | n/a | n/a | 2.652 | n/a | 0.000 | 0.000 | 0.641 | 492.316 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.108 | 2.652 | 0.006 | 0.108 |
| p99 | 1003.427 | n/a | n/a | n/a | 6.347 | n/a | 0.000 | 0.000 | 3.755 | 1001.419 | 0.585 | n/a | 5.795 | 0.000 | n/a | n/a | 34.620 | 6.347 | 0.548 | 34.620 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d000000000000000cf | 1003.427 | 0.141 | n/a | 0.000 | 0.000 | 0.641 | 1001.419 | 0.017 | n/a | 0.090 | 0.000 | n/a | n/a | 1.120 | 0.141 | 0.000 | 1.120 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d000000000000000b3 | 989.424 | 5.652 | n/a | 0.000 | 0.000 | 3.755 | 979.779 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.195 | 5.652 | 0.006 | 0.195 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d000000000000000ba | 969.444 | 2.405 | n/a | 0.000 | 0.000 | 1.557 | 965.356 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.087 | 2.405 | 0.002 | 0.087 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d000000000000000c8 | 958.009 | 2.421 | n/a | 0.000 | 0.000 | 0.495 | 954.361 | 0.585 | n/a | 0.053 | 0.000 | n/a | n/a | 0.093 | 2.421 | 0.003 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d000000000000000c0 | 934.854 | 2.320 | n/a | 0.000 | 0.000 | 2.126 | 930.277 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.069 | 2.320 | 0.002 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000000c5 | 918.974 | 5.437 | n/a | 0.000 | 0.000 | 0.561 | 912.725 | 0.035 | n/a | 0.034 | 0.000 | n/a | n/a | 0.182 | 5.437 | 0.006 | 0.182 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000000b4 | 878.805 | 6.347 | n/a | 0.000 | 0.000 | 1.282 | 871.051 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.090 | 6.347 | 0.007 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000000bb | 829.685 | 2.652 | n/a | 0.000 | 0.000 | 0.513 | 826.397 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.080 | 2.652 | 0.003 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000000a7 | 721.822 | 2.420 | n/a | 0.000 | 0.000 | 0.819 | 718.386 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.118 | 2.420 | 0.003 | 0.118 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000000b8 | 696.619 | 2.348 | n/a | 0.000 | 0.000 | 0.885 | 693.248 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.082 | 2.348 | 0.003 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000000ae | 667.985 | 2.012 | n/a | 0.000 | 0.000 | 0.543 | 665.307 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.086 | 2.012 | 0.003 | 0.086 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d000000000000000c2 | 576.145 | 2.654 | n/a | 0.000 | 0.000 | 0.637 | 572.731 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.070 | 2.654 | 0.005 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 25091db8ed0af6d000000000000000aa | 517.335 | 2.553 | n/a | 0.000 | 0.000 | 2.556 | 506.279 | 0.005 | n/a | 5.795 | 0.000 | n/a | n/a | 0.147 | 2.553 | 0.005 | 0.147 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d000000000000000ad | 506.178 | 2.792 | n/a | 0.000 | 0.000 | 0.571 | 502.638 | 0.014 | n/a | 0.080 | 0.000 | n/a | n/a | 0.084 | 2.792 | 0.006 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d000000000000000ab | 500.024 | 5.323 | n/a | 0.000 | 0.000 | 1.826 | 492.316 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.499 | 5.323 | 0.011 | 0.499 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000000a8 | 436.921 | 2.098 | n/a | 0.000 | 0.000 | 0.764 | 433.863 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.117 | 2.098 | 0.005 | 0.117 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d000000000000000c1 | 432.288 | 5.800 | n/a | 0.000 | 0.000 | 2.328 | 423.986 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.108 | 5.800 | 0.013 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d000000000000000ce | 411.544 | 3.583 | n/a | 0.000 | 0.000 | 0.602 | 407.217 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.085 | 3.583 | 0.009 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000000b0 | 325.250 | 6.081 | n/a | 0.000 | 0.000 | 0.441 | 318.469 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.203 | 6.081 | 0.019 | 0.203 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000000b7 | 315.852 | 5.220 | n/a | 0.000 | 0.000 | 0.726 | 309.723 | 0.016 | n/a | 0.031 | 0.000 | n/a | n/a | 0.136 | 5.220 | 0.017 | 0.136 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.955 | n/a | n/a | n/a | 2.965 | n/a | 0.000 | 0.000 | 0.599 | 418.601 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.095 | 2.965 | 0.010 | 0.095 |
| p99 | 1009.574 | n/a | n/a | n/a | 9.500 | n/a | 1.553 | 0.000 | 7.196 | 1006.168 | 0.023 | n/a | 0.113 | 0.000 | n/a | n/a | 41.241 | 9.500 | 0.506 | 41.241 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d000000000000000df | 1009.574 | 2.793 | n/a | 0.000 | 0.000 | 0.491 | 1006.168 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.077 | 2.793 | 0.003 | 0.077 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d00000000000000106 | 1006.548 | 5.583 | n/a | 0.000 | 0.000 | 0.679 | 1000.077 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.160 | 5.583 | 0.006 | 0.160 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000000e5 | 1005.714 | 3.653 | n/a | 0.000 | 0.000 | 1.026 | 1000.784 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.202 | 3.653 | 0.004 | 0.202 | gw-r/thread-46/journal/page | none observed |
| 25091db8ed0af6d00000000000000101 | 1004.625 | 0.174 | n/a | 0.000 | 0.000 | 0.526 | 1002.668 | 0.023 | n/a | 0.113 | 0.000 | n/a | n/a | 1.121 | 0.174 | 0.000 | 1.121 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000000d2 | 1003.361 | 0.133 | n/a | 0.000 | 0.000 | 0.539 | 1001.509 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 1.099 | 0.133 | 0.000 | 1.099 | gw-r/thread-46/journal/page | none observed |
| 25091db8ed0af6d0000000000000010e | 1003.112 | 0.160 | n/a | 0.000 | 0.000 | 0.452 | 1001.314 | 0.013 | n/a | 0.054 | 0.000 | n/a | n/a | 1.119 | 0.160 | 0.000 | 1.119 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d000000000000000d9 | 995.057 | 4.302 | n/a | 0.000 | 0.000 | 1.665 | 988.941 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.100 | 4.302 | 0.004 | 0.100 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d000000000000000d1 | 984.575 | 2.574 | n/a | 0.000 | 0.000 | 0.644 | 981.222 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.080 | 2.574 | 0.003 | 0.080 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d000000000000000da | 974.708 | 2.400 | n/a | 0.000 | 0.000 | 0.563 | 971.634 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.070 | 2.400 | 0.002 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 25091db8ed0af6d000000000000000dc | 952.017 | 3.878 | n/a | 0.000 | 0.000 | 5.089 | 942.918 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.094 | 3.878 | 0.004 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d000000000000000de | 897.970 | 2.360 | n/a | 0.000 | 0.000 | 0.360 | 895.152 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.073 | 2.360 | 0.003 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d000000000000000fc | 792.590 | 5.119 | n/a | 0.000 | 0.000 | 0.759 | 786.575 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.079 | 5.119 | 0.006 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000000e8 | 611.866 | 8.858 | n/a | 0.000 | 0.000 | 0.652 | 602.179 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.138 | 8.858 | 0.014 | 0.138 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d000000000000000fe | 607.579 | 4.466 | n/a | 0.000 | 0.000 | 0.899 | 602.113 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.063 | 4.466 | 0.007 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000000104 | 564.451 | 2.701 | n/a | 0.000 | 0.000 | 0.604 | 561.030 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.070 | 2.701 | 0.005 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 25091db8ed0af6d0000000000000010c | 517.405 | 3.938 | n/a | 0.000 | 0.000 | 0.735 | 512.634 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.064 | 3.938 | 0.008 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d000000000000000d7 | 496.287 | 2.941 | n/a | 0.000 | 0.000 | 0.564 | 492.637 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.077 | 2.941 | 0.006 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 25091db8ed0af6d00000000000000109 | 457.722 | 9.500 | n/a | 0.000 | 0.000 | 0.477 | 447.608 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.122 | 9.500 | 0.021 | 0.122 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d000000000000000ef | 457.284 | 6.768 | n/a | 1.553 | 0.000 | 0.694 | 448.082 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.147 | 8.321 | 0.018 | 0.147 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d000000000000000e0 | 440.418 | 6.248 | n/a | 0.000 | 0.000 | 0.908 | 433.158 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.083 | 6.248 | 0.014 | 0.083 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 386.376 | n/a | n/a | n/a | 2.527 | n/a | 0.000 | 0.000 | 0.562 | 383.365 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.086 | 2.527 | 0.008 | 0.086 |
| p99 | 1011.893 | n/a | n/a | n/a | 13.094 | n/a | 0.000 | 0.000 | 5.079 | 1005.371 | 0.020 | n/a | 0.183 | 0.000 | n/a | n/a | 44.232 | 13.094 | 0.415 | 44.232 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d0000000000000012c | 1011.893 | 5.738 | n/a | 0.000 | 0.000 | 0.603 | 1005.371 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.151 | 5.738 | 0.006 | 0.151 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d00000000000000127 | 1002.805 | 0.156 | n/a | 0.000 | 0.000 | 0.437 | 1000.832 | 0.014 | n/a | 0.183 | 0.000 | n/a | n/a | 1.183 | 0.156 | 0.000 | 1.183 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d0000000000000014b | 1002.417 | 0.100 | n/a | 0.000 | 0.000 | 0.470 | 1000.694 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 1.098 | 0.100 | 0.000 | 1.098 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d0000000000000012d | 1002.115 | 0.108 | n/a | 0.000 | 0.000 | 0.406 | 1000.459 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 1.104 | 0.108 | 0.000 | 1.104 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d0000000000000013a | 1001.095 | 2.452 | n/a | 0.000 | 0.000 | 0.425 | 998.112 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.067 | 2.452 | 0.002 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d00000000000000126 | 999.489 | 3.117 | n/a | 0.000 | 0.000 | 0.581 | 995.711 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.064 | 3.117 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d0000000000000011e | 997.503 | 2.704 | n/a | 0.000 | 0.000 | 0.606 | 994.057 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.093 | 2.704 | 0.003 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000000143 | 992.589 | 2.654 | n/a | 0.000 | 0.000 | 5.079 | 984.737 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.059 | 2.654 | 0.003 | 0.059 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d00000000000000136 | 985.269 | 2.253 | n/a | 0.000 | 0.000 | 0.939 | 981.969 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.055 | 2.253 | 0.002 | 0.055 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d00000000000000116 | 948.423 | 4.919 | n/a | 0.000 | 0.000 | 1.321 | 942.017 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.127 | 4.919 | 0.005 | 0.127 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d00000000000000131 | 863.388 | 5.984 | n/a | 0.000 | 0.000 | 0.580 | 856.690 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.102 | 5.984 | 0.007 | 0.102 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d0000000000000011d | 722.050 | 3.138 | n/a | 0.000 | 0.000 | 0.498 | 718.274 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.104 | 3.138 | 0.004 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d00000000000000140 | 696.766 | 1.480 | n/a | 0.000 | 0.000 | 0.374 | 694.819 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.056 | 1.480 | 0.002 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d0000000000000013c | 688.000 | 2.521 | n/a | 0.000 | 0.000 | 0.477 | 684.910 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.057 | 2.521 | 0.004 | 0.057 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d00000000000000111 | 656.286 | 5.109 | n/a | 0.000 | 0.000 | 0.621 | 650.383 | 0.004 | n/a | 0.013 | 0.000 | n/a | n/a | 0.156 | 5.109 | 0.008 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 25091db8ed0af6d00000000000000139 | 656.254 | 2.419 | n/a | 0.000 | 0.000 | 1.812 | 651.936 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.065 | 2.419 | 0.004 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d0000000000000012b | 582.720 | 2.887 | n/a | 0.000 | 0.000 | 1.584 | 578.126 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.088 | 2.887 | 0.005 | 0.088 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d00000000000000122 | 538.533 | 10.823 | n/a | 0.000 | 0.000 | 0.591 | 526.978 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.111 | 10.823 | 0.020 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d00000000000000115 | 523.438 | 2.415 | n/a | 0.000 | 0.000 | 0.357 | 520.546 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.087 | 2.415 | 0.005 | 0.087 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d00000000000000113 | 494.573 | 2.354 | n/a | 0.000 | 0.000 | 0.412 | 491.720 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.064 | 2.354 | 0.005 | 0.064 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 332.125 | n/a | n/a | n/a | 2.766 | n/a | 0.000 | 0.000 | 0.472 | 329.114 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.068 | 2.766 | 0.009 | 0.068 |
| p99 | 1005.445 | n/a | n/a | n/a | 8.403 | n/a | 0.000 | 0.000 | 3.500 | 1000.502 | 0.017 | n/a | 0.081 | 0.000 | n/a | n/a | 29.210 | 8.403 | 0.621 | 29.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d00000000000000187 | 1005.445 | 5.302 | n/a | 0.000 | 0.000 | 0.593 | 999.354 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.169 | 5.302 | 0.005 | 0.169 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d00000000000000176 | 1002.078 | 0.104 | n/a | 0.000 | 0.000 | 0.327 | 1000.502 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 1.101 | 0.104 | 0.000 | 1.101 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d00000000000000167 | 999.224 | 2.606 | n/a | 0.000 | 0.000 | 0.391 | 996.102 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.058 | 2.606 | 0.003 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000000188 | 997.692 | 3.338 | n/a | 0.000 | 0.000 | 1.605 | 992.634 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.068 | 3.338 | 0.003 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d0000000000000017d | 991.135 | 2.354 | n/a | 0.000 | 0.000 | 3.500 | 985.190 | 0.008 | n/a | 0.023 | 0.000 | n/a | n/a | 0.060 | 2.354 | 0.002 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d00000000000000157 | 990.124 | 2.793 | n/a | 0.000 | 0.000 | 0.446 | 986.749 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.069 | 2.793 | 0.003 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000000170 | 989.018 | 2.328 | n/a | 0.000 | 0.000 | 0.588 | 986.005 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.065 | 2.328 | 0.002 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d0000000000000016f | 985.580 | 4.315 | n/a | 0.000 | 0.000 | 0.374 | 980.695 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.164 | 4.315 | 0.004 | 0.164 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d00000000000000181 | 967.879 | 2.498 | n/a | 0.000 | 0.000 | 0.653 | 964.621 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.073 | 2.498 | 0.003 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000000186 | 966.868 | 2.327 | n/a | 0.000 | 0.000 | 0.499 | 963.943 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.060 | 2.327 | 0.002 | 0.060 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d0000000000000018a | 933.541 | 3.041 | n/a | 0.000 | 0.000 | 3.246 | 927.101 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.126 | 3.041 | 0.003 | 0.126 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d0000000000000017f | 928.702 | 5.586 | n/a | 0.000 | 0.000 | 0.472 | 922.125 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.486 | 5.586 | 0.006 | 0.486 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d00000000000000179 | 797.905 | 1.837 | n/a | 0.000 | 0.000 | 0.385 | 795.545 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.053 | 1.837 | 0.002 | 0.053 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000000155 | 755.761 | 3.080 | n/a | 0.000 | 0.000 | 0.443 | 752.148 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.062 | 3.080 | 0.004 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d0000000000000015d | 681.080 | 2.354 | n/a | 0.000 | 0.000 | 0.473 | 678.164 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.056 | 2.354 | 0.003 | 0.056 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d00000000000000165 | 652.006 | 2.354 | n/a | 0.000 | 0.000 | 0.547 | 648.950 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.063 | 2.354 | 0.004 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d00000000000000150 | 650.128 | 5.409 | n/a | 0.000 | 0.000 | 0.573 | 643.993 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.141 | 5.409 | 0.008 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d00000000000000172 | 630.534 | 2.322 | n/a | 0.000 | 0.000 | 0.349 | 627.776 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.058 | 2.322 | 0.004 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d00000000000000169 | 518.121 | 4.801 | n/a | 0.000 | 0.000 | 0.657 | 512.449 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.174 | 4.801 | 0.009 | 0.174 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d0000000000000015a | 448.517 | 4.715 | n/a | 0.000 | 0.000 | 1.133 | 442.573 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.062 | 4.715 | 0.011 | 0.062 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 336.259 | n/a | n/a | n/a | 3.439 | n/a | 0.000 | 0.000 | 0.590 | 329.555 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.100 | 3.439 | 0.014 | 0.100 |
| p99 | 1002.154 | n/a | n/a | n/a | 9.086 | n/a | 1.425 | 0.000 | 4.077 | 996.652 | 5.103 | n/a | 0.068 | 0.000 | n/a | n/a | 32.970 | 9.086 | 0.473 | 32.970 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d000000000000001c4 | 1002.154 | 4.535 | n/a | 0.000 | 0.000 | 4.077 | 993.354 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.152 | 4.535 | 0.005 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000001b7 | 1001.052 | 3.992 | n/a | 0.000 | 0.000 | 0.590 | 996.335 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.089 | 3.992 | 0.004 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d000000000000001a7 | 1000.367 | 3.189 | n/a | 0.000 | 0.000 | 0.401 | 996.652 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.088 | 3.189 | 0.003 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d000000000000001a8 | 999.866 | 3.192 | n/a | 0.000 | 0.000 | 0.396 | 996.154 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.089 | 3.192 | 0.003 | 0.089 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d000000000000001a6 | 995.920 | 4.121 | n/a | 0.000 | 0.000 | 0.813 | 990.856 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 0.096 | 4.121 | 0.004 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000001c5 | 993.517 | 3.061 | n/a | 0.000 | 0.000 | 0.438 | 989.881 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.086 | 3.061 | 0.003 | 0.086 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d000000000000001c3 | 992.172 | 2.830 | n/a | 0.000 | 0.000 | 0.412 | 988.792 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.092 | 2.830 | 0.003 | 0.092 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d0000000000000018c | 869.672 | 5.179 | n/a | 0.000 | 0.000 | 0.604 | 863.791 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.073 | 5.179 | 0.006 | 0.073 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d0000000000000019a | 830.795 | 2.459 | n/a | 0.000 | 0.000 | 1.179 | 827.035 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.068 | 2.459 | 0.003 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000001cf | 735.785 | 4.645 | n/a | 0.000 | 0.000 | 0.606 | 730.374 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.109 | 4.645 | 0.006 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d0000000000000019b | 673.465 | 3.572 | n/a | 0.000 | 0.000 | 1.245 | 668.524 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.094 | 3.572 | 0.005 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000001ae | 656.414 | 4.208 | n/a | 0.000 | 0.000 | 0.402 | 651.525 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 0.205 | 4.208 | 0.006 | 0.205 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d000000000000001d3 | 640.610 | 3.039 | n/a | 0.000 | 0.000 | 0.342 | 637.101 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.085 | 3.039 | 0.005 | 0.085 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d000000000000001b9 | 603.804 | 2.246 | n/a | 0.000 | 0.000 | 0.437 | 600.950 | 0.016 | n/a | 0.065 | 0.000 | n/a | n/a | 0.091 | 2.246 | 0.004 | 0.091 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d00000000000000195 | 547.957 | 1.938 | n/a | 0.000 | 0.000 | 0.402 | 545.517 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.065 | 1.938 | 0.004 | 0.065 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d0000000000000019e | 500.962 | 4.644 | n/a | 0.000 | 0.000 | 0.528 | 495.592 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.143 | 4.644 | 0.009 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d0000000000000019f | 459.383 | 2.610 | n/a | 0.000 | 0.000 | 0.699 | 455.945 | 0.003 | n/a | 0.049 | 0.000 | n/a | n/a | 0.077 | 2.610 | 0.006 | 0.077 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d000000000000001a2 | 436.952 | 2.104 | n/a | 0.000 | 0.000 | 0.629 | 434.069 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.093 | 2.104 | 0.005 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000001d5 | 403.284 | 3.969 | n/a | 0.000 | 0.000 | 0.681 | 398.491 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.100 | 3.969 | 0.010 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d000000000000001c8 | 399.166 | 6.558 | n/a | 1.425 | 0.000 | 0.534 | 390.501 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.112 | 7.983 | 0.020 | 0.112 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 373.245 | n/a | n/a | n/a | 3.588 | n/a | 0.000 | 0.000 | 0.520 | 369.692 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.101 | 4.084 | 0.011 | 0.101 |
| p99 | 1002.562 | n/a | n/a | n/a | 11.839 | n/a | 2.321 | 0.000 | 19.972 | 1000.677 | 5.843 | n/a | 0.059 | 0.000 | n/a | n/a | 48.847 | 14.160 | 0.383 | 48.847 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d00000000000000211 | 1002.562 | 3.451 | n/a | 0.634 | 0.000 | 0.340 | 997.981 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.133 | 4.084 | 0.004 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d00000000000000216 | 1002.534 | 0.135 | n/a | 0.000 | 0.000 | 0.571 | 1000.677 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.113 | 0.135 | 0.000 | 1.113 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d00000000000000218 | 1002.080 | 0.101 | n/a | 0.000 | 0.000 | 0.385 | 1000.450 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 1.093 | 0.101 | 0.000 | 1.093 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d000000000000001fe | 997.162 | 3.676 | n/a | 0.734 | 0.000 | 0.736 | 991.913 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.074 | 4.410 | 0.004 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d000000000000001e9 | 993.169 | 5.132 | n/a | 0.000 | 0.000 | 0.702 | 986.983 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.313 | 5.132 | 0.005 | 0.313 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d00000000000000215 | 987.262 | 3.588 | n/a | 0.597 | 0.000 | 0.461 | 982.517 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.074 | 4.185 | 0.004 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000001f8 | 974.291 | 3.800 | n/a | 1.010 | 0.000 | 1.687 | 967.635 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.101 | 4.810 | 0.005 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d000000000000001ea | 895.232 | 2.969 | n/a | 0.000 | 0.000 | 0.600 | 891.473 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.135 | 2.969 | 0.003 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d00000000000000210 | 845.083 | 3.361 | n/a | 0.626 | 0.000 | 0.362 | 840.624 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.085 | 3.987 | 0.005 | 0.085 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d000000000000001ef | 828.374 | 2.698 | n/a | 0.000 | 0.000 | 0.613 | 824.892 | 0.027 | n/a | 0.059 | 0.000 | n/a | n/a | 0.085 | 2.698 | 0.003 | 0.085 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d000000000000001f5 | 816.651 | 4.594 | n/a | 0.000 | 0.000 | 0.410 | 811.519 | 0.015 | n/a | 0.054 | 0.000 | n/a | n/a | 0.060 | 4.594 | 0.006 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d00000000000000207 | 784.257 | 2.888 | n/a | 0.617 | 0.000 | 0.392 | 780.243 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.087 | 3.505 | 0.004 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000001dc | 734.190 | 4.795 | n/a | 0.000 | 0.000 | 0.806 | 728.348 | 0.011 | n/a | 0.036 | 0.000 | n/a | n/a | 0.193 | 4.795 | 0.007 | 0.193 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d00000000000000212 | 672.630 | 11.839 | n/a | 2.321 | 0.000 | 0.461 | 657.863 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.110 | 14.160 | 0.021 | 0.110 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d000000000000001f1 | 586.095 | 2.953 | n/a | 0.000 | 0.000 | 0.454 | 582.557 | 0.014 | n/a | 0.028 | 0.000 | n/a | n/a | 0.089 | 2.953 | 0.005 | 0.089 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000000200 | 552.970 | 4.138 | n/a | 0.656 | 0.000 | 0.445 | 547.599 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.103 | 4.794 | 0.009 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d000000000000001fd | 520.684 | 4.953 | n/a | 0.629 | 0.000 | 0.503 | 514.348 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.212 | 5.582 | 0.011 | 0.212 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d000000000000001e4 | 512.747 | 3.207 | n/a | 0.000 | 0.000 | 0.547 | 508.842 | 0.018 | n/a | 0.042 | 0.000 | n/a | n/a | 0.091 | 3.207 | 0.006 | 0.091 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d000000000000001de | 457.874 | 5.146 | n/a | 0.000 | 0.000 | 0.559 | 452.024 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.082 | 5.146 | 0.011 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000001ff | 443.717 | 3.537 | n/a | 0.610 | 0.000 | 0.507 | 438.891 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.138 | 4.147 | 0.009 | 0.138 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (780 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.510 | n/a | n/a | n/a | 3.247 | n/a | 0.000 | 0.000 | 0.231 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.835 | 3.247 | 0.269 | 6.835 |
| p99 | 357.858 | n/a | n/a | n/a | 13.161 | n/a | 1.137 | 0.000 | 2.260 | 353.196 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 47.978 | 13.161 | 0.843 | 47.978 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d00000000000000225 | 1008.223 | 5.873 | n/a | 0.000 | 0.000 | 1.887 | 1000.232 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.185 | 5.873 | 0.006 | 0.185 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d00000000000000224 | 618.321 | 3.647 | n/a | 0.000 | 0.000 | 0.541 | 614.001 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.086 | 3.647 | 0.006 | 0.086 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d0000000000000021a | 485.392 | 2.016 | n/a | 0.000 | 0.000 | 0.595 | 482.677 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.063 | 2.016 | 0.004 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d0000000000000021c | 482.679 | 3.124 | n/a | 0.000 | 0.000 | 0.624 | 478.785 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.108 | 3.124 | 0.006 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000000226 | 480.287 | 7.676 | n/a | 0.801 | 0.000 | 1.034 | 470.607 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.145 | 8.477 | 0.018 | 0.145 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d00000000000000220 | 396.533 | 4.638 | n/a | 0.000 | 0.000 | 0.756 | 391.009 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.100 | 4.638 | 0.012 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000000222 | 393.191 | 2.453 | n/a | 0.000 | 0.000 | 3.304 | 387.287 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.105 | 2.453 | 0.006 | 0.105 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d0000000000000021d | 357.858 | 2.425 | n/a | 0.000 | 0.000 | 2.114 | 353.196 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.057 | 2.425 | 0.007 | 0.057 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d0000000000000021f | 255.848 | 3.433 | n/a | 0.000 | 0.000 | 0.351 | 251.916 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.111 | 3.433 | 0.013 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000004e6 | 99.834 | 8.623 | n/a | 0.908 | 0.000 | 2.697 | 87.438 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.128 | 9.531 | 0.095 | 0.128 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d000000000000002ef | 95.229 | 15.163 | n/a | 3.007 | 0.000 | 0.513 | 76.343 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 0.161 | 18.170 | 0.191 | 0.161 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d00000000000000666 | 91.652 | 4.639 | n/a | 0.000 | 0.000 | 0.265 | 86.510 | 0.162 | n/a | 0.008 | 0.000 | n/a | n/a | 0.068 | 4.639 | 0.051 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 25091db8ed0af6d0000000000000079d | 91.571 | 1.961 | n/a | 0.000 | 0.000 | 0.271 | 89.212 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.081 | 1.961 | 0.021 | 0.081 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d000000000000005e7 | 89.889 | 4.613 | n/a | 0.000 | 0.000 | 0.329 | 84.855 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.063 | 4.613 | 0.051 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d0000000000000030b | 88.204 | 2.257 | n/a | 0.000 | 0.000 | 0.525 | 85.292 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.098 | 2.257 | 0.026 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d000000000000004ef | 86.820 | 4.650 | n/a | 0.000 | 0.000 | 0.912 | 81.035 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.206 | 4.650 | 0.054 | 0.206 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d00000000000000758 | 86.815 | 3.591 | n/a | 0.000 | 0.000 | 0.461 | 82.669 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.083 | 3.591 | 0.041 | 0.083 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d00000000000000820 | 84.731 | 4.719 | n/a | 0.000 | 0.000 | 1.083 | 78.762 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.131 | 4.719 | 0.056 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d0000000000000046a | 83.009 | 4.267 | n/a | 0.000 | 0.000 | 2.310 | 76.294 | 0.001 | n/a | 0.011 | 0.000 | n/a | n/a | 0.125 | 4.267 | 0.051 | 0.125 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d00000000000000633 | 79.156 | 5.909 | n/a | 0.000 | 0.000 | 2.223 | 70.228 | 0.710 | n/a | 0.009 | 0.000 | n/a | n/a | 0.077 | 5.909 | 0.075 | 0.077 | gw-r/thread-42/journal/page | none observed |

## P3 / tail / internal (2254 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.016 | n/a | n/a | n/a | 3.973 | n/a | 0.000 | 0.000 | 0.213 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.035 | 3.980 | 0.341 | 6.035 |
| p99 | 340.409 | n/a | n/a | n/a | 18.524 | n/a | 1.540 | 0.000 | 1.626 | 337.466 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 46.639 | 20.412 | 0.854 | 46.639 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 25091db8ed0af6d00000000000001ad1 | 1003.353 | 0.133 | n/a | 0.000 | 0.000 | 0.943 | 1000.951 | 0.017 | n/a | 0.075 | 0.000 | n/a | n/a | 1.234 | 0.133 | 0.000 | 1.234 | gw-r/thread-44/journal/page | none observed |
| 25091db8ed0af6d00000000000001aaa | 1003.204 | 0.096 | n/a | 0.000 | 0.000 | 0.964 | 1001.000 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 1.091 | 0.096 | 0.000 | 1.091 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d00000000000001a84 | 1001.884 | 0.100 | n/a | 0.000 | 0.000 | 0.285 | 1000.367 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 1.105 | 0.100 | 0.000 | 1.105 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d00000000000001a8e | 1001.342 | 2.929 | n/a | 0.000 | 0.000 | 0.564 | 997.749 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.072 | 2.929 | 0.003 | 0.072 | gw-r/thread-66/journal/page | none observed |
| 25091db8ed0af6d00000000000001ac9 | 997.644 | 2.879 | n/a | 0.000 | 0.000 | 0.342 | 994.325 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.077 | 2.879 | 0.003 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000001a83 | 995.245 | 3.945 | n/a | 0.000 | 0.000 | 0.491 | 990.685 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.058 | 3.945 | 0.004 | 0.058 | gw-r/thread-64/journal/page | none observed |
| 25091db8ed0af6d00000000000001acd | 888.786 | 3.203 | n/a | 0.000 | 0.000 | 0.457 | 884.975 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.100 | 3.203 | 0.004 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000001aa7 | 878.909 | 16.015 | n/a | 0.000 | 0.000 | 1.071 | 861.559 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.237 | 16.015 | 0.018 | 0.237 | gw-r/thread-68/journal/page | none observed |
| 25091db8ed0af6d00000000000001ac2 | 857.948 | 2.781 | n/a | 0.000 | 0.000 | 0.653 | 854.380 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.095 | 2.781 | 0.003 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d00000000000001ab8 | 777.292 | 3.212 | n/a | 0.000 | 0.000 | 4.069 | 769.900 | 0.002 | n/a | 0.032 | 0.000 | n/a | n/a | 0.076 | 3.212 | 0.004 | 0.076 | gw-r/thread-68/journal/page | none observed |
| 25091db8ed0af6d00000000000001a9e | 690.199 | 6.822 | n/a | 1.007 | 0.000 | 0.599 | 681.483 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.257 | 7.830 | 0.011 | 0.257 | gw-r/thread-66/journal/page | none observed |
| 25091db8ed0af6d00000000000001aa4 | 671.245 | 2.839 | n/a | 0.000 | 0.000 | 0.442 | 667.833 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.093 | 2.839 | 0.004 | 0.093 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d00000000000001a98 | 628.871 | 6.590 | n/a | 0.000 | 0.000 | 0.645 | 621.475 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.140 | 6.590 | 0.010 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 25091db8ed0af6d00000000000001a89 | 586.417 | 3.722 | n/a | 0.000 | 0.000 | 0.399 | 582.160 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.104 | 3.722 | 0.006 | 0.104 | gw-r/thread-66/journal/page | none observed |
| 25091db8ed0af6d00000000000001acb | 569.022 | 2.553 | n/a | 0.000 | 0.000 | 0.443 | 565.933 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.055 | 2.553 | 0.004 | 0.055 | gw-r/thread-42/journal/page | none observed |
| 25091db8ed0af6d00000000000001a86 | 535.721 | 9.350 | n/a | 1.607 | 0.000 | 0.262 | 523.962 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.491 | 10.958 | 0.020 | 0.491 | gw-r/thread-49/journal/page | none observed |
| 25091db8ed0af6d00000000000001abe | 517.437 | 3.178 | n/a | 0.000 | 0.000 | 0.351 | 513.823 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.058 | 3.178 | 0.006 | 0.058 | gw-r/thread-67/journal/page | none observed |
| 25091db8ed0af6d00000000000001a88 | 479.494 | 2.922 | n/a | 0.000 | 0.000 | 0.434 | 476.048 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.063 | 2.922 | 0.006 | 0.063 | gw-r/thread-68/journal/page | none observed |
| 25091db8ed0af6d00000000000001ac5 | 454.972 | 2.327 | n/a | 0.000 | 0.000 | 0.347 | 452.206 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.067 | 2.327 | 0.005 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 25091db8ed0af6d00000000000001aca | 435.334 | 2.202 | n/a | 0.000 | 0.000 | 1.951 | 431.057 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.095 | 2.202 | 0.005 | 0.095 | gw-r/thread-64/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.884 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.670 | 200.896 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 210.702 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.207 | 209.416 | 6.633 | n/a | 1.280 | 0.000 | n/a | n/a | 0.446 | 0.000 | 0.000 | 0.446 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9a12d1019a59a90000000000000001c | 210.702 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 209.416 | 0.006 | n/a | 0.162 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-46/journal/page | none observed |
| f9a12d1019a59a90000000000000004a | 208.573 | 0.000 | n/a | 0.000 | 0.000 | 1.071 | 207.213 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-46/journal/page | none observed |
| f9a12d1019a59a90000000000000000c | 207.619 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 206.418 | 0.033 | n/a | 0.274 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a90000000000000003e | 207.266 | 0.000 | n/a | 0.000 | 0.000 | 0.976 | 206.025 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a90000000000000004f | 207.123 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 204.825 | 0.015 | n/a | 1.280 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| f9a12d1019a59a900000000000000024 | 206.248 | 0.000 | n/a | 0.000 | 0.000 | 0.348 | 205.701 | 0.036 | n/a | 0.061 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000036 | 205.749 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 205.001 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000012 | 205.498 | 0.000 | n/a | 0.000 | 0.000 | 1.532 | 203.768 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a90000000000000002d | 205.492 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 204.595 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a900000000000000022 | 205.477 | 0.000 | n/a | 0.000 | 0.000 | 4.207 | 201.080 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000018 | 205.441 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 204.545 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a90000000000000001e | 205.104 | 0.000 | n/a | 0.000 | 0.000 | 3.581 | 201.295 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000026 | 204.986 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 203.942 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a90000000000000002f | 204.942 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 203.945 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000017 | 204.918 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 204.222 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a90000000000000000b | 204.867 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 204.112 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000033 | 204.700 | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 203.864 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| f9a12d1019a59a90000000000000000e | 204.547 | 0.000 | n/a | 0.000 | 0.000 | 1.087 | 203.277 | 0.019 | n/a | 0.068 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000044 | 204.454 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 203.523 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a90000000000000001b | 204.419 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 203.581 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.598 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 200.717 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 |
| p99 | 210.348 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 10.112 | 206.512 | 4.987 | n/a | 2.611 | 0.000 | n/a | n/a | 49.800 | 0.000 | 0.000 | 49.800 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9a12d1019a59a900000000000000079 | 210.348 | 0.000 | n/a | 0.000 | 0.000 | 4.527 | 205.624 | 0.011 | n/a | 0.054 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a90000000000000008e | 208.797 | 0.000 | n/a | 0.000 | 0.000 | 0.359 | 206.512 | 0.007 | n/a | 1.811 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a9000000000000000a8 | 207.067 | 0.000 | n/a | 0.000 | 0.000 | 2.538 | 204.383 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a9000000000000000c6 | 206.290 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 205.244 | 0.009 | n/a | 0.143 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a900000000000000090 | 205.607 | 0.000 | n/a | 0.000 | 0.000 | 2.756 | 202.678 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a9000000000000000b7 | 205.113 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 203.992 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000085 | 205.044 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 203.945 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000063 | 204.823 | 0.000 | n/a | 0.000 | 0.000 | 3.892 | 200.740 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a9000000000000000b8 | 204.671 | 0.000 | n/a | 0.000 | 0.000 | 1.563 | 202.439 | 0.028 | n/a | 0.358 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a9000000000000000b4 | 204.462 | 0.000 | n/a | 0.000 | 0.000 | 3.350 | 200.866 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a9000000000000000ac | 204.406 | 0.000 | n/a | 0.000 | 0.000 | 1.173 | 203.006 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-46/journal/page | none observed |
| f9a12d1019a59a90000000000000007c | 204.391 | 0.000 | n/a | 0.000 | 0.000 | 0.577 | 203.641 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| f9a12d1019a59a900000000000000075 | 204.010 | 0.000 | n/a | 0.000 | 0.000 | 0.490 | 203.371 | 0.003 | n/a | 0.044 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a9000000000000000b9 | 203.832 | 0.000 | n/a | 0.000 | 0.000 | 1.694 | 201.810 | 0.016 | n/a | 0.104 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a90000000000000007a | 203.562 | 0.000 | n/a | 0.000 | 0.000 | 0.588 | 202.769 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a900000000000000065 | 203.031 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 201.847 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a900000000000000095 | 202.854 | 0.000 | n/a | 0.000 | 0.000 | 0.795 | 199.282 | 0.008 | n/a | 2.611 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a9000000000000000c7 | 202.844 | 0.000 | n/a | 0.000 | 0.000 | 0.944 | 201.644 | 0.036 | n/a | 0.056 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000084 | 202.694 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 201.491 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000081 | 202.281 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 201.196 | 0.005 | n/a | 0.070 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.385 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.557 | 200.629 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 208.754 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.366 | 207.805 | 5.457 | n/a | 3.751 | 0.000 | n/a | n/a | 49.828 | 0.000 | 0.000 | 49.828 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9a12d1019a59a9000000000000000cf | 208.754 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 207.805 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a9000000000000000fa | 204.657 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 203.849 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a90000000000000010d | 204.103 | 0.000 | n/a | 0.000 | 0.000 | 3.366 | 200.620 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a9000000000000000ce | 203.641 | 0.000 | n/a | 0.000 | 0.000 | 0.406 | 203.021 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a9000000000000000e9 | 203.476 | 0.000 | n/a | 0.000 | 0.000 | 2.329 | 200.900 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a9000000000000000cc | 202.774 | 0.000 | n/a | 0.000 | 0.000 | 1.029 | 201.253 | 0.008 | n/a | 0.314 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000104 | 202.764 | 0.000 | n/a | 0.000 | 0.000 | 1.188 | 201.255 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a900000000000000103 | 202.522 | 0.000 | n/a | 0.000 | 0.000 | 1.291 | 201.048 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a9000000000000000fd | 202.336 | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 201.056 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a9000000000000000ed | 202.320 | 0.000 | n/a | 0.000 | 0.000 | 0.567 | 201.533 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a9000000000000000f1 | 202.307 | 0.000 | n/a | 0.000 | 0.000 | 1.502 | 200.598 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a9000000000000000e2 | 202.219 | 0.000 | n/a | 0.000 | 0.000 | 0.469 | 201.485 | 0.014 | n/a | 0.130 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| f9a12d1019a59a9000000000000000ee | 202.171 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 201.118 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a900000000000000127 | 202.118 | 0.000 | n/a | 0.000 | 0.000 | 1.118 | 200.760 | 0.031 | n/a | 0.047 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a9000000000000000de | 202.117 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 200.916 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000121 | 202.012 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 200.949 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000108 | 202.012 | 0.000 | n/a | 0.000 | 0.000 | 1.089 | 200.747 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a9000000000000000f5 | 202.008 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 197.709 | 0.005 | n/a | 3.751 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a9000000000000000ff | 201.981 | 0.000 | n/a | 0.000 | 0.000 | 1.007 | 200.671 | 0.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.276 | 0.000 | 0.000 | 0.276 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a900000000000000128 | 201.897 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 200.865 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.321 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.539 | 200.602 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 209.162 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.313 | 207.735 | 4.540 | n/a | 0.211 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9a12d1019a59a900000000000000145 | 209.162 | 0.000 | n/a | 0.000 | 0.000 | 1.285 | 207.735 | 0.009 | n/a | 0.029 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000195 | 206.281 | 0.000 | n/a | 0.000 | 0.000 | 2.425 | 203.682 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000182 | 205.193 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 204.355 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a900000000000000177 | 205.155 | 0.000 | n/a | 0.000 | 0.000 | 4.313 | 200.623 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a90000000000000013c | 204.827 | 0.000 | n/a | 0.000 | 0.000 | 4.028 | 200.608 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000192 | 204.329 | 0.000 | n/a | 0.000 | 0.000 | 3.682 | 200.505 | 0.006 | n/a | 0.018 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000169 | 203.498 | 0.000 | n/a | 0.000 | 0.000 | 2.656 | 200.576 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a900000000000000196 | 203.072 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 202.406 | 0.039 | n/a | 0.013 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000174 | 202.368 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 201.181 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000191 | 202.344 | 0.000 | n/a | 0.000 | 0.000 | 0.979 | 201.034 | 0.011 | n/a | 0.048 | 0.000 | n/a | n/a | 0.272 | 0.000 | 0.000 | 0.272 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000172 | 202.177 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 201.082 | 0.014 | n/a | 0.070 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000185 | 202.080 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 201.179 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a90000000000000018c | 202.031 | 0.000 | n/a | 0.000 | 0.000 | 1.166 | 200.517 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000197 | 201.998 | 0.000 | n/a | 0.000 | 0.000 | 0.455 | 201.331 | 0.016 | n/a | 0.090 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000141 | 201.990 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 200.778 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000140 | 201.966 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 200.852 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a900000000000000173 | 201.952 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 201.186 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a90000000000000015b | 201.899 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 200.865 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000132 | 201.897 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 200.962 | 0.019 | n/a | 0.067 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a900000000000000171 | 201.862 | 0.000 | n/a | 0.000 | 0.000 | 0.724 | 200.763 | 0.010 | n/a | 0.211 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.250 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.525 | 200.591 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 208.462 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.856 | 204.219 | 5.920 | n/a | 0.109 | 0.000 | n/a | n/a | 0.423 | 0.000 | 0.000 | 0.423 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9a12d1019a59a9000000000000001c2 | 211.789 | 0.000 | n/a | 0.000 | 0.000 | 7.660 | 203.955 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a9000000000000001a8 | 208.462 | 0.000 | n/a | 0.000 | 0.000 | 4.856 | 203.413 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a9000000000000001ee | 206.644 | 0.000 | n/a | 0.000 | 0.000 | 2.549 | 203.929 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a9000000000000001bb | 205.475 | 0.000 | n/a | 0.000 | 0.000 | 0.403 | 204.878 | 0.034 | n/a | 0.067 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a9000000000000001e2 | 204.858 | 0.000 | n/a | 0.000 | 0.000 | 0.481 | 204.219 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a9000000000000001b6 | 204.381 | 0.000 | n/a | 0.000 | 0.000 | 0.355 | 203.854 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a9000000000000001d4 | 204.157 | 0.000 | n/a | 0.000 | 0.000 | 0.700 | 197.352 | 5.920 | n/a | 0.042 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a9000000000000001dc | 202.988 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 202.295 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000201 | 202.923 | 0.000 | n/a | 0.000 | 0.000 | 1.402 | 201.024 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.423 | 0.000 | 0.000 | 0.423 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a900000000000000202 | 202.720 | 0.000 | n/a | 0.000 | 0.000 | 1.442 | 200.955 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a9000000000000001ef | 202.594 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 201.655 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a9000000000000001ba | 202.544 | 0.000 | n/a | 0.000 | 0.000 | 0.598 | 201.788 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a900000000000000204 | 202.451 | 0.000 | n/a | 0.000 | 0.000 | 1.787 | 200.452 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a9000000000000001c1 | 202.385 | 0.000 | n/a | 0.000 | 0.000 | 1.146 | 200.916 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a9000000000000001f4 | 202.362 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.300 | 0.016 | n/a | 0.103 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a9000000000000001ad | 202.206 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 201.264 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a9000000000000001d5 | 202.204 | 0.000 | n/a | 0.000 | 0.000 | 0.539 | 201.439 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a9000000000000001aa | 202.161 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 200.974 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a9000000000000001bd | 202.122 | 0.000 | n/a | 0.000 | 0.000 | 0.453 | 201.381 | 0.114 | n/a | 0.067 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a9000000000000001ca | 202.094 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 201.134 | 0.016 | n/a | 0.108 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.273 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 200.540 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 |
| p99 | 202.209 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.000 | 201.261 | 6.575 | n/a | 0.096 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9a12d1019a59a900000000000000256 | 202.620 | 0.000 | n/a | 0.000 | 0.000 | 1.624 | 200.826 | 0.013 | n/a | 0.053 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a90000000000000021d | 202.209 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 200.936 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000215 | 202.164 | 0.000 | n/a | 0.000 | 0.000 | 1.295 | 200.656 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000271 | 202.144 | 0.000 | n/a | 0.000 | 0.000 | 1.234 | 200.673 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a90000000000000023e | 202.128 | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 201.076 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a90000000000000022b | 202.099 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 201.271 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a90000000000000025d | 202.098 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 200.863 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a900000000000000241 | 202.032 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.986 | 0.006 | n/a | 0.088 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a90000000000000025e | 201.927 | 0.000 | n/a | 0.000 | 0.000 | 0.448 | 201.261 | 0.050 | n/a | 0.052 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a900000000000000237 | 201.925 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 200.948 | 0.015 | n/a | 0.078 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a900000000000000240 | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 0.581 | 201.083 | 0.014 | n/a | 0.056 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a90000000000000021f | 201.890 | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 200.923 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a90000000000000026d | 201.844 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 200.912 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a90000000000000021a | 201.841 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 200.817 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a90000000000000022c | 201.813 | 0.000 | n/a | 0.000 | 0.000 | 0.354 | 201.246 | 0.021 | n/a | 0.096 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a90000000000000023a | 201.812 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 200.732 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a90000000000000024e | 201.787 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 200.925 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.067 | 0.000 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a900000000000000250 | 201.741 | 0.000 | n/a | 0.000 | 0.000 | 1.086 | 200.511 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000248 | 201.738 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 200.783 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000254 | 201.737 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 200.751 | 0.010 | n/a | 0.029 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (69 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.419 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.469 | 70.827 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 207.672 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.305 | 203.165 | 6.112 | n/a | 0.066 | 0.000 | n/a | n/a | 50.931 | 0.000 | 0.000 | 50.931 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9a12d1019a59a900000000000000293 | 207.672 | 0.000 | n/a | 0.000 | 0.000 | 4.305 | 203.165 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-64/journal/page | none observed |
| f9a12d1019a59a900000000000000283 | 203.911 | 0.000 | n/a | 0.000 | 0.000 | 3.241 | 200.412 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a900000000000000286 | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 1.900 | 200.489 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000294 | 202.097 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 201.338 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000296 | 201.834 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 200.875 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000295 | 201.823 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 200.621 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a900000000000000288 | 201.529 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.774 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000291 | 201.515 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 200.671 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000290 | 201.461 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 200.668 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a90000000000000028e | 201.389 | 0.000 | n/a | 0.000 | 0.000 | 0.469 | 200.731 | 0.017 | n/a | 0.038 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a900000000000000282 | 201.198 | 0.000 | n/a | 0.000 | 0.000 | 0.336 | 200.703 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a90000000000000028c | 201.155 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 200.442 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000298 | 201.153 | 0.000 | n/a | 0.000 | 0.000 | 0.427 | 200.587 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000285 | 201.145 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 200.343 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a90000000000000028a | 201.002 | 0.000 | n/a | 0.000 | 0.000 | 0.395 | 200.482 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000299 | 200.938 | 0.000 | n/a | 0.000 | 0.000 | 0.512 | 200.311 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000292 | 170.365 | 0.000 | n/a | 0.000 | 0.000 | 0.724 | 163.288 | 6.112 | n/a | 0.019 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a90000000000000028f | 166.221 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 165.291 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a90000000000000028d | 154.673 | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 154.030 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-42/journal/page | none observed |
| f9a12d1019a59a900000000000000289 | 130.816 | 0.000 | n/a | 0.000 | 0.000 | 0.445 | 130.261 | 0.003 | n/a | 0.015 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-64/journal/page | none observed |

## P3 / tail / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.743 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.410 | 86.568 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 202.772 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.416 | 201.044 | 1.406 | n/a | 0.100 | 0.000 | n/a | n/a | 50.470 | 0.000 | 0.000 | 50.470 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f9a12d1019a59a900000000000000ea6 | 203.217 | 0.000 | n/a | 0.000 | 0.000 | 2.416 | 200.584 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000eca | 202.844 | 0.000 | n/a | 0.000 | 0.000 | 2.139 | 200.458 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000f01 | 202.772 | 0.000 | n/a | 0.000 | 0.000 | 2.166 | 200.414 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000ed0 | 202.171 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 201.191 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000ecc | 202.075 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 201.044 | 0.007 | n/a | 0.122 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-66/journal/page | none observed |
| f9a12d1019a59a900000000000000ed5 | 201.812 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.846 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-67/journal/page | none observed |
| f9a12d1019a59a900000000000000ea4 | 201.810 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 200.960 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-67/journal/page | none observed |
| f9a12d1019a59a900000000000000ed2 | 201.779 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 200.542 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a900000000000000eb0 | 201.713 | 0.000 | n/a | 0.000 | 0.000 | 0.578 | 200.982 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-47/journal/page | none observed |
| f9a12d1019a59a900000000000000eff | 201.697 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 200.823 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000ee7 | 201.693 | 0.000 | n/a | 0.000 | 0.000 | 0.424 | 201.067 | 0.009 | n/a | 0.100 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a900000000000000eed | 201.693 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 200.707 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-49/journal/page | none observed |
| f9a12d1019a59a900000000000000ead | 201.680 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 200.580 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-44/journal/page | none observed |
| f9a12d1019a59a900000000000000eb2 | 201.535 | 0.000 | n/a | 0.000 | 0.000 | 0.475 | 200.913 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-67/journal/page | none observed |
| f9a12d1019a59a900000000000000ef3 | 201.535 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 200.689 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000e99 | 201.525 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 200.438 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-67/journal/page | none observed |
| f9a12d1019a59a900000000000000e97 | 201.520 | 0.000 | n/a | 0.000 | 0.000 | 0.453 | 200.921 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-45/journal/page | none observed |
| f9a12d1019a59a900000000000000eb1 | 201.515 | 0.000 | n/a | 0.000 | 0.000 | 0.399 | 200.882 | 0.005 | n/a | 0.148 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| f9a12d1019a59a900000000000000ebd | 201.480 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 200.474 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-67/journal/page | none observed |
| f9a12d1019a59a900000000000000f09 | 201.471 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 200.640 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-67/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions

Verdict: scheduled offer to the final receipt handed to the caller (ack/1, Sam 2026-11-16). Actual scheduler lateness counts. Legacy finish is reported, never judged. Corrected removes observed offer lateness, including GC/event-loop stalls, and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged. Commit-based bars need at least 500 primary commits, including both sides of a ratio.

Timer lateness p50/p99: 0.002/3.783 ms; post-ACK p50/p99: 0.408/1.968 ms.

| Measurement | verdict (ACK) | legacy finish | corrected diagnostic | bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 9.079 | 9.616 | 8.822 | reported |
| All-primary p99 ms | 51.615 | 51.964 | 51.256 | <=50 |
| L256 5-10 p50Ms | 11.711 | 12.031 | 11.711 | <=10 |
| L256 5-10 p99Ms | 20.573 | 21.060 | 20.570 | <=50 |
| L256 11-25 p50Ms | 13.887 | 14.655 | 13.887 | <=10 |
| L256 11-25 p99Ms | 25.654 | 26.444 | 25.652 | <=50 |
| L256 26-50 p50Ms | 12.479 | 14.207 | 11.903 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 13.388 | 14.505 | 12.437 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 7.679 | 8.031 | 7.423 | <=10 |
| Burst 11-25 p50 ms | 9.791 | 10.367 | 9.535 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 25.654 | 26.444 | 25.652 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 102.567 | 102.949 | 96.788 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 75.777/75.777 | 69.914 | 55.727 | 118.952 | 0.672/0.340 |
| 5-10 | 250-1000 | 49 | 12.833/46.819 | 12.361 | 7.456 | 17.789 | 0.084/0.022 |
| 11-25 | 250-1000 | 24 | 17.320/42.960 | 16.712 | 8.941 | 22.179 | 0.107/0.030 |
| 26-50 | 250-1000 | 12 | 22.717/51.517 | 21.817 | 9.107 | 24.265 | 0.108/0.028 |
| 5-10 | 0-50 | 1166 | 7.140/41.102 | 6.816 | 3.756 | 9.421 | 0.042/0.019 |
| 5-10 | 50-100 | 63 | 7.251/24.508 | 6.858 | 3.896 | 9.930 | 0.054/0.019 |
| 11-25 | 0-50 | 543 | 9.332/31.568 | 8.696 | 4.630 | 11.987 | 0.050/0.020 |
| 11-25 | 100-250 | 15 | 11.937/32.193 | 11.365 | 7.511 | 19.388 | 0.080/0.028 |
| 5-10 | 100-250 | 20 | 11.774/29.574 | 11.031 | 7.195 | 15.120 | 0.067/0.021 |
| 11-25 | overlap | 364 | 11.590/60.131 | 11.049 | 6.820 | 15.541 | 0.041/0.019 |
| 5-10 | overlap | 767 | 9.567/59.284 | 9.218 | 5.608 | 12.527 | 0.034/0.018 |
| 26-50 | 100-250 | 2 | 33.372/47.656 | 31.953 | 8.644 | 17.815 | 0.079/0.034 |
| 26-50 | overlap | 148 | 14.703/82.564 | 13.663 | 8.181 | 19.624 | 0.049/0.020 |
| 26-50 | 0-50 | 193 | 12.441/40.603 | 11.346 | 5.879 | 15.148 | 0.058/0.021 |
| 11-25 | 50-100 | 40 | 9.626/20.172 | 8.943 | 4.967 | 12.571 | 0.052/0.019 |
| 26-50 | 50-100 | 13 | 13.237/18.141 | 11.605 | 6.737 | 16.108 | 0.073/0.034 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 917 | 20 | 1357.639 |
| burst | 2503 | 19 | 1307.572 |

## Writer heap, GC and scheduler stalls

Source 2409bdada6be6cb7f17d1aa71f31da90a72f01af; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 340.905 / 492.165 |
| GC events / total duration / maximum ms | 589 / 1360.575 / 27.654 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":579,"4":5,"8":5} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 51.964 / 41 / 2799.401 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

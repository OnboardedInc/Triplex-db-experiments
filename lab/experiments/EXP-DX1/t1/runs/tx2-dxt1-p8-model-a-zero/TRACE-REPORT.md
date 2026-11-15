# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (84.000 ms, trace `5337a2eda9ab2a6c000000000000013f`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (68.436 ms, trace `5337a2eda9ab2a6c0000000000000143`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (76.507 ms, trace `5337a2eda9ab2a6c0000000000001eab`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (79.910 ms, trace `5337a2eda9ab2a6c000000000000013b`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (27.698 ms, trace `5337a2eda9ab2a6c00000000000000f4`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p8-model-a-zero`; source `15ed651621cd68e09be33a0dc42eb5b2329fa74f`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4258/4259 (99.977%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 10302906.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 278 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13378.398 | 513.314 | 5.047 | 454 |
| L1 | 0 | 44260.941 | 756.093 | 21.890 | 1473 |
| L4 | 0 | 44980.501 | 876.584 | 17.998 | 1762 |
| L16 | 0 | 44946.035 | 6664.723 | 70.790 | 34243 |
| L64 | 0 | 44580.096 | 6761.800 | 54.376 | 35856 |
| L256 | 0 | 44780.195 | 843.625 | 28.605 | 1560 |
| L1024 | 0 | 44019.766 | 1004.283 | 31.197 | 1598 |
| tail | 0 | 164369.331 | 3594.877 | 81.558 | 6128 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 5337a2eda9ab2a6c000000000000013f | driver.queue.scheduler-dispatch | 0.050 | none | 0 / 32 |
| 5337a2eda9ab2a6c000000000000013f | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 5337a2eda9ab2a6c000000000000013f waited: []

| 5337a2eda9ab2a6c0000000000000143 | driver.queue.scheduler-dispatch | 0.079 | none | 0 / 32 |
| 5337a2eda9ab2a6c0000000000000143 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 5337a2eda9ab2a6c0000000000000143 waited: []

| 5337a2eda9ab2a6c0000000000001eab | driver.queue.scheduler-dispatch | 0.036 | none | 0 / 32 |
| 5337a2eda9ab2a6c0000000000001eab | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 5337a2eda9ab2a6c0000000000001eab waited: []

| 5337a2eda9ab2a6c000000000000013b | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |
| 5337a2eda9ab2a6c000000000000013b | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 5337a2eda9ab2a6c000000000000013b waited: []

| 5337a2eda9ab2a6c00000000000000f4 | driver.queue.scheduler-dispatch | 0.058 | none | 0 / 32 |
| 5337a2eda9ab2a6c00000000000000f4 | driver.queue.scheduler-late | 0.012 | none | 0 / 32 |

Observed active steps while trace 5337a2eda9ab2a6c00000000000000f4 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.688 | 0.448 | 0.000 | 0.590 | 4.640 | 1.042 | 0.000 | 0.140 | 1.343 | 5.171 | 0.031 | n/a | 0.396 | 12.231 | n/a | n/a | 0.031 | 5.256 | 0.197 | 0.031 |
| p99 | 78.116 | 3.965 | 0.015 | 3.994 | 22.066 | n/a | 4.320 | 1.100 | 3.185 | 22.277 | 2.980 | n/a | 3.515 | 30.276 | n/a | n/a | 0.294 | 22.508 | 0.369 | 0.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c00000000000000f4 | 78.116 | 22.066 | 0.372 | 0.000 | 0.070 | 1.792 | 22.277 | 0.303 | n/a | 3.515 | 27.698 | n/a | n/a | 0.022 | 22.508 | 0.288 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 5337a2eda9ab2a6c00000000000000f0 | 49.019 | 8.625 | n/a | 0.000 | 1.044 | 1.450 | 6.382 | 0.036 | n/a | 0.913 | 30.276 | n/a | n/a | 0.294 | 9.668 | 0.197 | 0.294 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000110 | 43.611 | 5.043 | 0.260 | 0.289 | 0.076 | 1.932 | 18.170 | 0.031 | n/a | 0.454 | 17.329 | n/a | n/a | 0.027 | 5.668 | 0.130 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 5337a2eda9ab2a6c0000000000000127 | 43.229 | 5.415 | 1.042 | 0.000 | 0.127 | 1.343 | 6.142 | 0.029 | n/a | 0.607 | 28.486 | n/a | n/a | 0.038 | 6.584 | 0.152 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.822ms; driver.reader-basis.broadcast 0.024ms |
| 5337a2eda9ab2a6c00000000000000fe | 35.430 | 4.434 | 0.184 | 0.000 | 0.060 | 2.245 | 15.007 | 0.037 | n/a | 0.136 | 13.299 | n/a | n/a | 0.028 | 4.678 | 0.132 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 5337a2eda9ab2a6c0000000000000117 | 34.581 | 4.640 | 0.266 | 0.252 | 0.059 | 1.614 | 9.810 | 0.057 | n/a | 1.554 | 16.303 | n/a | n/a | 0.024 | 5.219 | 0.151 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 5337a2eda9ab2a6c0000000000000123 | 34.231 | 4.054 | 0.320 | 0.292 | 0.063 | 1.430 | 8.057 | 0.032 | n/a | 0.365 | 19.594 | n/a | n/a | 0.023 | 4.729 | 0.138 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000109 | 33.837 | 5.420 | n/a | 0.000 | 1.100 | 1.366 | 5.171 | 0.024 | n/a | 0.150 | 20.568 | n/a | n/a | 0.037 | 6.520 | 0.193 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000000fa | 33.471 | 5.128 | n/a | 4.320 | 0.143 | 0.858 | 3.374 | 0.021 | n/a | 0.111 | 19.489 | n/a | n/a | 0.027 | 9.591 | 0.287 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000106 | 31.814 | 6.261 | 0.299 | 0.000 | 0.082 | 2.416 | 11.130 | 0.032 | n/a | 0.347 | 11.216 | n/a | n/a | 0.031 | 6.642 | 0.209 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 5337a2eda9ab2a6c00000000000000fc | 31.692 | 5.438 | 0.235 | 0.000 | 0.110 | 2.164 | 12.732 | 0.036 | n/a | 0.294 | 10.642 | n/a | n/a | 0.041 | 5.782 | 0.182 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 5337a2eda9ab2a6c0000000000000101 | 30.942 | 6.559 | n/a | 3.859 | 0.304 | 1.138 | 3.282 | 0.023 | n/a | 0.494 | 15.245 | n/a | n/a | 0.037 | 10.722 | 0.347 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 5337a2eda9ab2a6c000000000000010c | 30.474 | 4.094 | 0.149 | 0.000 | 0.044 | 1.271 | 11.607 | 0.062 | n/a | 0.130 | 13.100 | n/a | n/a | 0.017 | 4.287 | 0.141 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 5337a2eda9ab2a6c0000000000000118 | 29.690 | 5.682 | n/a | 3.488 | 0.937 | 1.208 | 1.615 | 0.020 | n/a | 0.521 | 16.191 | n/a | n/a | 0.029 | 10.106 | 0.340 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000104 | 26.688 | 4.812 | 0.372 | 0.000 | 0.072 | 1.506 | 7.732 | 0.030 | n/a | 0.415 | 11.713 | n/a | n/a | 0.037 | 5.256 | 0.197 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000000f8 | 26.656 | 5.137 | 0.378 | 0.000 | 0.074 | 2.955 | 5.886 | 2.980 | n/a | 0.593 | 8.619 | n/a | n/a | 0.034 | 5.590 | 0.210 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 5337a2eda9ab2a6c0000000000000120 | 26.318 | 2.790 | n/a | 0.000 | 0.768 | 1.170 | 4.005 | 0.037 | n/a | 0.145 | 17.366 | n/a | n/a | 0.038 | 3.558 | 0.135 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000128 | 25.902 | 2.059 | n/a | 0.000 | 0.286 | 0.781 | 1.682 | 0.051 | n/a | 1.256 | 19.760 | n/a | n/a | 0.028 | 2.345 | 0.091 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 5337a2eda9ab2a6c000000000000011b | 23.969 | 4.156 | 0.326 | 0.238 | 0.055 | 1.326 | 6.331 | 0.026 | n/a | 0.396 | 11.088 | n/a | n/a | 0.027 | 4.775 | 0.199 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000011f | 23.547 | 3.622 | 0.257 | 0.254 | 0.166 | 1.542 | 6.799 | 0.079 | n/a | 1.225 | 9.556 | n/a | n/a | 0.047 | 4.300 | 0.183 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.725 | 1.001 | 0.000 | 0.758 | 2.840 | n/a | 0.000 | 0.401 | 0.858 | 1.682 | 0.025 | n/a | 0.354 | 9.453 | n/a | n/a | 0.032 | 3.508 | 0.250 | 0.032 |
| p99 | 33.471 | 2.994 | 0.000 | 3.914 | 5.128 | n/a | 4.320 | 0.771 | 1.491 | 5.008 | 0.051 | n/a | 1.256 | 19.760 | n/a | n/a | 0.038 | 9.591 | 0.369 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c00000000000000fa | 33.471 | 5.128 | n/a | 4.320 | 0.143 | 0.858 | 3.374 | 0.021 | n/a | 0.111 | 19.489 | n/a | n/a | 0.027 | 9.591 | 0.287 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000120 | 26.318 | 2.790 | n/a | 0.000 | 0.768 | 1.170 | 4.005 | 0.037 | n/a | 0.145 | 17.366 | n/a | n/a | 0.038 | 3.558 | 0.135 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000128 | 25.902 | 2.059 | n/a | 0.000 | 0.286 | 0.781 | 1.682 | 0.051 | n/a | 1.256 | 19.760 | n/a | n/a | 0.028 | 2.345 | 0.091 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 5337a2eda9ab2a6c0000000000000113 | 21.259 | 3.377 | n/a | 0.000 | 0.569 | 0.992 | 5.008 | 0.025 | n/a | 0.116 | 11.140 | n/a | n/a | 0.032 | 3.946 | 0.186 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000124 | 20.725 | 3.384 | n/a | 3.494 | 0.771 | 1.491 | 1.931 | 0.032 | n/a | 0.132 | 9.453 | n/a | n/a | 0.037 | 7.648 | 0.369 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000011c | 14.836 | 2.364 | n/a | 0.000 | 0.738 | 0.858 | 1.518 | 0.025 | n/a | 0.518 | 8.780 | n/a | n/a | 0.035 | 3.103 | 0.209 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000000f6 | 12.939 | 2.840 | n/a | 0.000 | 0.401 | 0.479 | 1.240 | 0.019 | n/a | 0.385 | 7.549 | n/a | n/a | 0.027 | 3.241 | 0.250 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 5337a2eda9ab2a6c00000000000000ff | 11.767 | 2.008 | n/a | 1.263 | 0.237 | 0.685 | 1.389 | 0.018 | n/a | 0.354 | 5.780 | n/a | n/a | 0.034 | 3.508 | 0.298 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000111 | 11.710 | 3.407 | n/a | 0.000 | 0.078 | 1.008 | 1.107 | 0.019 | n/a | 0.397 | 5.669 | n/a | n/a | 0.025 | 3.485 | 0.298 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.019 | 0.000 | 0.000 | 0.351 | 3.419 | 0.195 | 0.466 | 0.052 | 1.289 | 6.503 | 0.032 | n/a | 0.095 | 10.878 | n/a | n/a | 0.023 | 4.167 | 0.181 | 0.023 |
| p99 | 31.618 | 0.000 | 0.000 | 0.768 | 5.788 | 0.375 | 0.556 | 0.089 | 1.793 | 7.051 | 0.032 | n/a | 0.109 | 15.854 | n/a | n/a | 0.040 | 6.770 | 0.214 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c000000000000012b | 31.618 | 5.788 | 0.375 | 0.556 | 0.052 | 1.793 | 7.051 | 0.032 | n/a | 0.095 | 15.854 | n/a | n/a | 0.023 | 6.770 | 0.214 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001e2 | 23.019 | 3.419 | 0.195 | 0.466 | 0.089 | 1.289 | 6.503 | 0.032 | n/a | 0.109 | 10.878 | n/a | n/a | 0.040 | 4.167 | 0.181 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.827 | 0.266 | 0.000 | 0.555 | 3.698 | n/a | 0.000 | 0.137 | 1.288 | 4.516 | 0.031 | n/a | 0.354 | 11.996 | n/a | n/a | 0.029 | 4.360 | 0.184 | 0.029 |
| p99 | 106.605 | 3.919 | 0.000 | 3.052 | 10.169 | n/a | 1.714 | 16.288 | 5.728 | 45.182 | 0.098 | n/a | 3.642 | 84.000 | n/a | n/a | 0.104 | 18.782 | 0.539 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c000000000000013f | 106.605 | 5.690 | 0.282 | 0.000 | 0.052 | 1.141 | 12.991 | 0.045 | n/a | 2.384 | 84.000 | n/a | n/a | 0.021 | 6.023 | 0.056 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 5337a2eda9ab2a6c0000000000000143 | 105.564 | 6.115 | 0.254 | 0.000 | 0.083 | 1.609 | 28.872 | 0.055 | n/a | 0.109 | 68.436 | n/a | n/a | 0.031 | 6.451 | 0.061 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.107ms |
| 5337a2eda9ab2a6c000000000000013b | 88.994 | 3.629 | 0.178 | 0.000 | 0.065 | 2.235 | 2.765 | 0.070 | n/a | 0.114 | 79.910 | n/a | n/a | 0.027 | 3.873 | 0.044 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 5337a2eda9ab2a6c0000000000000139 | 76.002 | 5.535 | 0.216 | 0.000 | 0.132 | 2.003 | 45.182 | 0.029 | n/a | 0.354 | 22.512 | n/a | n/a | 0.040 | 5.883 | 0.077 | 0.040 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.038ms |
| 5337a2eda9ab2a6c0000000000000189 | 63.898 | 4.930 | 0.271 | 0.000 | 0.058 | 1.239 | 9.620 | 0.031 | n/a | 0.387 | 47.340 | n/a | n/a | 0.024 | 5.259 | 0.082 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 5337a2eda9ab2a6c00000000000001b8 | 58.551 | 10.169 | n/a | 0.000 | 0.770 | 1.626 | 4.260 | 0.088 | n/a | 1.283 | 40.252 | n/a | n/a | 0.104 | 10.939 | 0.187 | 0.104 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 5337a2eda9ab2a6c00000000000001e0 | 54.860 | 3.489 | n/a | 0.000 | 0.254 | 0.718 | 1.741 | 0.023 | n/a | 0.832 | 47.760 | n/a | n/a | 0.042 | 3.743 | 0.068 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 5337a2eda9ab2a6c00000000000001bf | 47.356 | 4.190 | 0.281 | 0.270 | 0.072 | 1.317 | 31.896 | 0.030 | n/a | 0.130 | 9.136 | n/a | n/a | 0.034 | 4.813 | 0.102 | 0.034 | gw-w/thread-43/gateway.admitted-work | none observed |
| 5337a2eda9ab2a6c0000000000000193 | 41.398 | 4.170 | 0.377 | 0.000 | 0.060 | 1.629 | 11.634 | 0.090 | n/a | 0.150 | 23.261 | n/a | n/a | 0.027 | 4.607 | 0.111 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001d5 | 40.572 | 3.552 | n/a | 0.000 | 1.016 | 3.171 | 2.897 | 0.049 | n/a | 3.169 | 26.708 | n/a | n/a | 0.010 | 4.567 | 0.113 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.094ms |
| 5337a2eda9ab2a6c0000000000000141 | 40.380 | 4.256 | 0.262 | 0.322 | 0.069 | 2.381 | 16.519 | 0.048 | n/a | 0.546 | 15.948 | n/a | n/a | 0.030 | 4.908 | 0.122 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 5337a2eda9ab2a6c000000000000012f | 37.173 | 4.969 | 0.259 | 0.328 | 0.138 | 1.484 | 10.983 | 0.041 | n/a | 2.187 | 16.747 | n/a | n/a | 0.038 | 5.694 | 0.153 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 5337a2eda9ab2a6c0000000000000173 | 37.128 | 6.046 | 0.163 | 0.674 | 0.051 | 1.338 | 5.922 | 0.032 | n/a | 0.102 | 22.776 | n/a | n/a | 0.023 | 6.934 | 0.187 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000178 | 35.328 | 7.410 | n/a | 0.000 | 0.912 | 4.227 | 6.458 | 0.069 | n/a | 0.119 | 16.107 | n/a | n/a | 0.025 | 8.323 | 0.236 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001d9 | 35.042 | 5.152 | 0.256 | 0.000 | 0.050 | 5.445 | 11.408 | 0.033 | n/a | 3.470 | 9.201 | n/a | n/a | 0.028 | 5.458 | 0.156 | 0.028 | gw-w/thread-45/gateway.admitted-work | none observed |
| 5337a2eda9ab2a6c00000000000001c4 | 34.887 | 3.516 | n/a | 0.000 | 0.457 | 1.662 | 1.809 | 0.031 | n/a | 0.144 | 27.224 | n/a | n/a | 0.045 | 3.973 | 0.114 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000179 | 34.846 | 2.494 | n/a | 0.000 | 16.288 | 0.914 | 1.253 | 0.021 | n/a | 2.800 | 11.051 | n/a | n/a | 0.026 | 18.782 | 0.539 | 0.026 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.985ms; driver.publication.persist-deferred 1.215ms |
| 5337a2eda9ab2a6c00000000000001a5 | 33.747 | 3.836 | 0.328 | 0.279 | 0.056 | 1.600 | 13.304 | 0.050 | n/a | 0.112 | 14.156 | n/a | n/a | 0.026 | 4.499 | 0.133 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000147 | 33.665 | 5.192 | 0.272 | 0.521 | 0.054 | 1.543 | 8.702 | 0.028 | n/a | 0.429 | 16.905 | n/a | n/a | 0.019 | 6.039 | 0.179 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000017d | 33.424 | 3.458 | 0.181 | 0.000 | 0.053 | 4.417 | 13.036 | 0.038 | n/a | 0.390 | 11.829 | n/a | n/a | 0.022 | 3.691 | 0.110 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.807 | 0.214 | 0.000 | 0.499 | 2.494 | n/a | 0.000 | 0.751 | 0.941 | 1.418 | 0.026 | n/a | 0.395 | 8.189 | n/a | n/a | 0.035 | 3.077 | 0.212 | 0.035 |
| p99 | 34.846 | 2.006 | 0.000 | 1.090 | 7.229 | n/a | 0.000 | 16.288 | 2.208 | 3.974 | 0.098 | n/a | 3.642 | 16.785 | n/a | n/a | 0.073 | 18.782 | 0.539 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c0000000000000179 | 34.846 | 2.494 | n/a | 0.000 | 16.288 | 0.914 | 1.253 | 0.021 | n/a | 2.800 | 11.051 | n/a | n/a | 0.026 | 18.782 | 0.539 | 0.026 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.985ms; driver.publication.persist-deferred 1.215ms |
| 5337a2eda9ab2a6c00000000000001d4 | 27.309 | 2.141 | n/a | 0.000 | 0.787 | 1.108 | 2.713 | 0.098 | n/a | 3.642 | 16.785 | n/a | n/a | 0.035 | 2.928 | 0.107 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000134 | 25.477 | 4.653 | n/a | 0.000 | 0.646 | 0.941 | 1.931 | 0.045 | n/a | 0.753 | 16.469 | n/a | n/a | 0.038 | 5.300 | 0.208 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000180 | 21.677 | 2.132 | n/a | 0.000 | 0.748 | 0.733 | 1.099 | 0.032 | n/a | 0.395 | 16.505 | n/a | n/a | 0.035 | 2.879 | 0.133 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000137 | 21.041 | 7.229 | n/a | 0.000 | 0.865 | 2.208 | 3.974 | 0.049 | n/a | 0.313 | 6.373 | n/a | n/a | 0.029 | 8.094 | 0.385 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000148 | 19.063 | 2.366 | n/a | 0.000 | 0.103 | 0.879 | 1.249 | 0.023 | n/a | 0.396 | 14.027 | n/a | n/a | 0.022 | 2.469 | 0.130 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001c8 | 18.044 | 3.495 | n/a | 0.000 | 0.137 | 0.996 | 1.022 | 0.020 | n/a | 0.397 | 11.918 | n/a | n/a | 0.057 | 3.632 | 0.201 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 5337a2eda9ab2a6c000000000000015d | 17.921 | 2.569 | n/a | 0.000 | 1.235 | 0.671 | 3.013 | 0.028 | n/a | 0.290 | 10.079 | n/a | n/a | 0.036 | 3.804 | 0.212 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 5337a2eda9ab2a6c0000000000000184 | 17.651 | 2.039 | n/a | 0.000 | 1.038 | 0.747 | 1.263 | 0.025 | n/a | 0.518 | 11.996 | n/a | n/a | 0.025 | 3.077 | 0.174 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001ce | 17.359 | 1.855 | n/a | 0.000 | 0.483 | 0.786 | 1.472 | 0.022 | n/a | 0.863 | 11.845 | n/a | n/a | 0.033 | 2.337 | 0.135 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 5337a2eda9ab2a6c00000000000001c0 | 17.137 | 2.134 | n/a | 0.000 | 0.751 | 0.915 | 1.651 | 0.056 | n/a | 0.198 | 11.398 | n/a | n/a | 0.034 | 2.885 | 0.168 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000018e | 15.807 | 2.476 | n/a | 0.000 | 0.155 | 0.799 | 1.063 | 0.020 | n/a | 0.104 | 11.169 | n/a | n/a | 0.021 | 2.631 | 0.166 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000152 | 15.651 | 3.126 | n/a | 0.000 | 0.891 | 2.048 | 2.390 | 0.062 | n/a | 0.979 | 6.113 | n/a | n/a | 0.043 | 4.016 | 0.257 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001d0 | 14.923 | 2.423 | n/a | 0.000 | 1.067 | 1.033 | 1.445 | 0.031 | n/a | 0.694 | 8.189 | n/a | n/a | 0.041 | 3.490 | 0.234 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001b2 | 13.879 | 4.208 | n/a | 0.000 | 0.996 | 1.188 | 1.196 | 0.026 | n/a | 0.535 | 5.657 | n/a | n/a | 0.073 | 5.204 | 0.375 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000196 | 13.443 | 2.836 | n/a | 0.000 | 0.590 | 0.836 | 1.501 | 0.021 | n/a | 0.114 | 7.517 | n/a | n/a | 0.029 | 3.426 | 0.255 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000170 | 12.989 | 3.271 | n/a | 0.000 | 1.230 | 1.265 | 1.547 | 0.026 | n/a | 0.165 | 5.448 | n/a | n/a | 0.038 | 4.501 | 0.347 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000164 | 12.505 | 1.511 | n/a | 0.000 | 0.258 | 1.288 | 1.549 | 0.050 | n/a | 0.183 | 7.649 | n/a | n/a | 0.017 | 1.770 | 0.142 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001a8 | 12.428 | 3.250 | n/a | 0.000 | 1.109 | 0.957 | 1.054 | 0.021 | n/a | 0.136 | 5.840 | n/a | n/a | 0.061 | 4.359 | 0.351 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 5337a2eda9ab2a6c0000000000000194 | 12.036 | 2.874 | n/a | 0.000 | 0.114 | 1.278 | 1.418 | 0.029 | n/a | 0.184 | 6.095 | n/a | n/a | 0.045 | 2.987 | 0.248 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.207 | 0.238 | 0.000 | 0.545 | 3.446 | n/a | 0.000 | 0.203 | 1.145 | 2.566 | 0.028 | n/a | 0.344 | 9.116 | n/a | n/a | 0.030 | 4.025 | 0.207 | 0.030 |
| p99 | 56.406 | 2.008 | 0.035 | 2.048 | 6.350 | n/a | 0.527 | 1.081 | 5.274 | 27.914 | 0.159 | n/a | 3.757 | 39.758 | n/a | n/a | 0.090 | 7.011 | 0.369 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c00000000000001f1 | 77.344 | 12.757 | n/a | 4.865 | 0.456 | 6.290 | 29.240 | 0.159 | n/a | 3.534 | 20.000 | n/a | n/a | 0.044 | 18.078 | 0.234 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.049ms |
| 5337a2eda9ab2a6c0000000000000299 | 56.406 | 6.004 | 0.361 | 0.343 | 0.063 | 1.708 | 11.240 | 0.045 | n/a | 0.543 | 36.055 | n/a | n/a | 0.045 | 6.771 | 0.120 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000262 | 46.944 | 2.390 | n/a | 0.000 | 0.507 | 0.813 | 1.920 | 0.029 | n/a | 0.166 | 41.103 | n/a | n/a | 0.017 | 2.896 | 0.062 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000022e | 45.781 | 1.914 | n/a | 0.000 | 1.079 | 0.996 | 1.776 | 0.035 | n/a | 0.195 | 39.758 | n/a | n/a | 0.029 | 2.993 | 0.065 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000291 | 45.116 | 6.350 | 0.168 | 0.000 | 0.050 | 1.820 | 10.456 | 0.034 | n/a | 3.109 | 23.104 | n/a | n/a | 0.026 | 6.568 | 0.146 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000266 | 42.224 | 4.997 | 0.247 | 0.411 | 0.106 | 2.035 | 27.914 | 0.024 | n/a | 0.344 | 6.101 | n/a | n/a | 0.044 | 5.761 | 0.136 | 0.044 | gw-w/thread-44/gateway.admitted-work | none observed |
| 5337a2eda9ab2a6c00000000000001ee | 39.477 | 5.065 | 0.237 | 0.461 | 0.080 | 1.324 | 9.202 | 0.029 | n/a | 0.211 | 22.825 | n/a | n/a | 0.043 | 5.843 | 0.148 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001f9 | 39.324 | 3.838 | 0.255 | 0.244 | 0.045 | 1.529 | 23.489 | 0.047 | n/a | 0.571 | 9.286 | n/a | n/a | 0.023 | 4.381 | 0.111 | 0.023 | gw-w/thread-45/gateway.admitted-work | none observed |
| 5337a2eda9ab2a6c0000000000000244 | 38.040 | 5.015 | 0.374 | 0.477 | 0.137 | 2.154 | 10.740 | 0.073 | n/a | 3.135 | 15.852 | n/a | n/a | 0.083 | 6.003 | 0.158 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001ff | 36.139 | 3.896 | 0.251 | 0.439 | 0.186 | 1.771 | 3.078 | 0.087 | n/a | 1.037 | 25.337 | n/a | n/a | 0.057 | 4.772 | 0.132 | 0.057 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000025c | 33.854 | 4.773 | 0.330 | 0.321 | 0.049 | 2.511 | 9.687 | 0.055 | n/a | 0.583 | 15.519 | n/a | n/a | 0.027 | 5.472 | 0.162 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000020b | 33.128 | 4.936 | 0.267 | 0.441 | 0.158 | 1.557 | 11.665 | 0.101 | n/a | 0.209 | 13.727 | n/a | n/a | 0.068 | 5.801 | 0.175 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000228 | 32.915 | 4.244 | n/a | 0.000 | 0.929 | 1.668 | 6.216 | 0.047 | n/a | 0.207 | 19.567 | n/a | n/a | 0.036 | 5.174 | 0.157 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000207 | 32.643 | 3.805 | 0.166 | 0.268 | 0.068 | 1.365 | 9.383 | 0.060 | n/a | 0.193 | 17.280 | n/a | n/a | 0.055 | 4.308 | 0.132 | 0.055 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000221 | 31.990 | 3.993 | 0.220 | 0.267 | 0.131 | 1.968 | 14.730 | 0.054 | n/a | 0.472 | 10.106 | n/a | n/a | 0.049 | 4.611 | 0.144 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000297 | 31.835 | 3.425 | 0.178 | 0.000 | 0.068 | 1.184 | 6.759 | 0.031 | n/a | 0.454 | 19.705 | n/a | n/a | 0.031 | 3.671 | 0.115 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000021f | 31.205 | 5.610 | 0.237 | 0.411 | 0.048 | 1.636 | 9.173 | 0.046 | n/a | 0.098 | 13.923 | n/a | n/a | 0.022 | 6.306 | 0.202 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000203 | 31.155 | 5.521 | 0.372 | 0.527 | 0.063 | 2.302 | 7.959 | 0.035 | n/a | 0.796 | 13.541 | n/a | n/a | 0.039 | 6.483 | 0.208 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000021b | 29.027 | 3.495 | 0.261 | 0.241 | 0.047 | 4.639 | 8.424 | 0.372 | n/a | 0.296 | 11.208 | n/a | n/a | 0.043 | 4.044 | 0.139 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000273 | 28.638 | 3.013 | n/a | 0.000 | 0.331 | 0.803 | 1.175 | 0.016 | n/a | 0.075 | 23.196 | n/a | n/a | 0.028 | 3.344 | 0.117 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.726 | 0.083 | 0.000 | 0.519 | 2.346 | n/a | 0.000 | 0.573 | 0.809 | 1.400 | 0.024 | n/a | 0.331 | 7.216 | n/a | n/a | 0.029 | 2.958 | 0.226 | 0.029 |
| p99 | 45.781 | 2.501 | 0.000 | 2.048 | 5.224 | n/a | 0.000 | 1.107 | 5.274 | 8.854 | 0.067 | n/a | 4.180 | 39.758 | n/a | n/a | 0.117 | 5.498 | 0.350 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c000000000000022e | 45.781 | 1.914 | n/a | 0.000 | 1.079 | 0.996 | 1.776 | 0.035 | n/a | 0.195 | 39.758 | n/a | n/a | 0.029 | 2.993 | 0.065 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001ea | 26.712 | 2.964 | n/a | 0.000 | 0.410 | 0.954 | 1.751 | 0.024 | n/a | 0.331 | 20.249 | n/a | n/a | 0.030 | 3.374 | 0.126 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000249 | 25.709 | 2.346 | n/a | 0.000 | 0.570 | 0.519 | 1.030 | 0.018 | n/a | 2.462 | 18.749 | n/a | n/a | 0.016 | 2.916 | 0.113 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.784ms; driver.reader-basis.broadcast 0.069ms |
| 5337a2eda9ab2a6c0000000000000205 | 19.820 | 3.185 | n/a | 0.000 | 0.702 | 1.124 | 1.930 | 0.041 | n/a | 0.151 | 12.640 | n/a | n/a | 0.047 | 3.886 | 0.196 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001e4 | 19.691 | 2.018 | n/a | 0.000 | 0.695 | 0.539 | 1.370 | 0.020 | n/a | 0.128 | 14.900 | n/a | n/a | 0.023 | 2.713 | 0.138 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000029b | 18.737 | 3.929 | n/a | 0.000 | 0.798 | 4.780 | 1.049 | 0.017 | n/a | 0.098 | 8.010 | n/a | n/a | 0.056 | 4.727 | 0.252 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000222 | 18.723 | 5.224 | n/a | 0.000 | 0.273 | 5.274 | 3.049 | 0.041 | n/a | 0.244 | 4.594 | n/a | n/a | 0.024 | 5.498 | 0.294 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001e6 | 18.424 | 3.470 | n/a | 0.000 | 1.081 | 1.610 | 2.669 | 0.067 | n/a | 0.325 | 9.172 | n/a | n/a | 0.031 | 4.551 | 0.247 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000213 | 18.306 | 3.104 | n/a | 0.000 | 0.427 | 0.869 | 0.994 | 0.020 | n/a | 0.359 | 12.481 | n/a | n/a | 0.052 | 3.531 | 0.193 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.068ms |
| 5337a2eda9ab2a6c000000000000027f | 18.058 | 3.971 | n/a | 0.000 | 0.582 | 1.168 | 4.553 | 0.050 | n/a | 3.342 | 4.345 | n/a | n/a | 0.046 | 4.553 | 0.252 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000268 | 17.726 | 3.539 | n/a | 0.000 | 0.667 | 1.515 | 8.854 | 0.062 | n/a | 0.217 | 2.844 | n/a | n/a | 0.029 | 4.206 | 0.237 | 0.029 | gw-w/thread-41/gateway.admitted-work | none observed |
| 5337a2eda9ab2a6c00000000000002a1 | 17.602 | 2.109 | n/a | 0.000 | 0.096 | 1.189 | 2.177 | 0.067 | n/a | 1.566 | 10.357 | n/a | n/a | 0.040 | 2.206 | 0.125 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 5337a2eda9ab2a6c000000000000026d | 16.980 | 4.689 | n/a | 0.000 | 0.775 | 1.145 | 1.400 | 0.028 | n/a | 0.133 | 8.728 | n/a | n/a | 0.083 | 5.464 | 0.322 | 0.083 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000027b | 15.998 | 4.137 | n/a | 0.000 | 0.692 | 1.299 | 1.390 | 0.022 | n/a | 0.138 | 8.231 | n/a | n/a | 0.089 | 4.829 | 0.302 | 0.089 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000001f7 | 15.833 | 1.895 | n/a | 0.000 | 0.281 | 0.727 | 1.476 | 0.024 | n/a | 4.180 | 7.216 | n/a | n/a | 0.033 | 2.177 | 0.137 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000264 | 15.555 | 2.356 | n/a | 0.000 | 0.934 | 0.870 | 1.415 | 0.028 | n/a | 0.140 | 9.787 | n/a | n/a | 0.026 | 3.290 | 0.212 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000022a | 15.094 | 2.454 | n/a | 0.000 | 0.336 | 0.984 | 1.013 | 0.016 | n/a | 0.358 | 9.914 | n/a | n/a | 0.019 | 2.790 | 0.185 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 5337a2eda9ab2a6c0000000000000275 | 14.726 | 2.196 | n/a | 0.000 | 0.846 | 0.503 | 0.983 | 0.017 | n/a | 0.076 | 10.086 | n/a | n/a | 0.019 | 3.042 | 0.207 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000201 | 14.050 | 1.799 | n/a | 0.000 | 1.047 | 0.575 | 1.911 | 0.028 | n/a | 0.373 | 8.296 | n/a | n/a | 0.022 | 2.846 | 0.203 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000236 | 13.772 | 2.191 | n/a | 0.000 | 0.726 | 0.765 | 1.034 | 0.017 | n/a | 0.368 | 8.646 | n/a | n/a | 0.026 | 2.917 | 0.212 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1700 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.128 | 0.365 | 0.000 | 0.516 | 2.262 | n/a | 0.000 | 0.701 | 0.652 | 0.978 | 0.012 | n/a | 0.115 | 5.432 | n/a | n/a | 0.016 | 3.179 | 0.277 | 0.016 |
| p99 | 47.208 | 2.004 | 0.030 | 2.009 | 7.964 | n/a | 0.278 | 14.813 | 8.732 | 7.625 | 0.051 | n/a | 3.400 | 36.583 | n/a | n/a | 0.054 | 17.632 | 0.686 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c00000000000002bc | 72.754 | 4.570 | 0.166 | 0.419 | 0.046 | 1.502 | 50.708 | 0.036 | n/a | 0.082 | 15.204 | n/a | n/a | 0.020 | 5.201 | 0.071 | 0.020 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.085ms |
| 5337a2eda9ab2a6c00000000000009b5 | 64.186 | 1.719 | n/a | 0.000 | 0.209 | 0.502 | 0.757 | 0.012 | n/a | 0.764 | 60.205 | n/a | n/a | 0.019 | 1.927 | 0.030 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.504ms; driver.publication.persist-deferred 1.158ms; driver.publication.persist-deferred 1.013ms; driver.publication.persist-deferred 0.971ms; driver.reader-basis.broadcast 0.120ms |
| 5337a2eda9ab2a6c00000000000009b7 | 63.654 | 6.217 | n/a | 0.000 | 2.826 | 0.867 | 1.194 | 0.014 | n/a | 0.434 | 52.069 | n/a | n/a | 0.033 | 9.043 | 0.142 | 0.033 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.504ms; driver.publication.persist-deferred 1.158ms; driver.publication.persist-deferred 1.023ms; driver.publication.persist-deferred 1.013ms; driver.publication.persist-deferred 0.971ms |
| 5337a2eda9ab2a6c0000000000000d63 | 59.314 | 4.870 | n/a | 0.000 | 1.893 | 1.105 | 0.976 | 0.005 | n/a | 0.024 | 50.436 | n/a | n/a | 0.006 | 6.763 | 0.114 | 0.006 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.120ms; driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 0.956ms; driver.reader-basis.broadcast 0.153ms |
| 5337a2eda9ab2a6c0000000000000d65 | 54.824 | 5.776 | n/a | 0.000 | 3.814 | 1.553 | 2.461 | 0.036 | n/a | 0.159 | 41.004 | n/a | n/a | 0.020 | 9.590 | 0.175 | 0.020 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.120ms; driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 0.956ms; driver.publication.persist-deferred 0.851ms; driver.reader-basis.broadcast 0.153ms |
| 5337a2eda9ab2a6c00000000000009b9 | 53.811 | 1.935 | n/a | 0.000 | 0.704 | 3.037 | 0.607 | 0.009 | n/a | 0.273 | 47.225 | n/a | n/a | 0.021 | 2.639 | 0.049 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.504ms; driver.publication.persist-deferred 1.369ms; driver.publication.persist-deferred 1.023ms; driver.publication.persist-deferred 1.013ms; driver.reader-basis.broadcast 0.120ms |
| 5337a2eda9ab2a6c0000000000000a97 | 53.696 | 7.284 | n/a | 2.578 | 0.592 | 18.830 | 1.325 | 0.021 | n/a | 0.185 | 22.863 | n/a | n/a | 0.019 | 10.454 | 0.195 | 0.019 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.351ms; driver.expected-state.bind-receipt 1.169ms; driver.publication.persist-deferred 1.163ms; driver.publication.persist-deferred 1.007ms; driver.publication.persist-deferred 0.854ms |
| 5337a2eda9ab2a6c000000000000032c | 52.309 | 2.005 | n/a | 0.000 | 30.615 | 0.533 | 1.494 | 0.038 | n/a | 0.892 | 16.715 | n/a | n/a | 0.018 | 32.619 | 0.624 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.430ms; driver.publication.persist-deferred 1.373ms; driver.publication.persist-deferred 0.999ms; driver.publication.persist-deferred 0.987ms; driver.reader-basis.broadcast 0.038ms |
| 5337a2eda9ab2a6c0000000000000512 | 51.986 | 8.757 | n/a | 0.000 | 0.470 | 29.271 | 4.765 | 0.018 | n/a | 0.058 | 8.613 | n/a | n/a | 0.034 | 9.227 | 0.177 | 0.034 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.101ms; driver.publication.persist-deferred 0.965ms; driver.publication.persist-deferred 0.373ms |
| 5337a2eda9ab2a6c000000000000040d | 51.124 | 2.756 | n/a | 0.000 | 26.167 | 0.987 | 0.788 | 0.016 | n/a | 0.049 | 20.339 | n/a | n/a | 0.023 | 28.923 | 0.566 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.216ms; driver.publication.persist-deferred 1.363ms; driver.publication.persist-deferred 1.316ms; driver.expected-state.bind-receipt 1.307ms; driver.publication.persist-deferred 1.100ms |
| 5337a2eda9ab2a6c0000000000000513 | 50.878 | 4.784 | n/a | 0.000 | 9.835 | 28.156 | 1.538 | 0.025 | n/a | 1.596 | 4.932 | n/a | n/a | 0.012 | 14.619 | 0.287 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.636ms; driver.publication.persist-deferred 1.101ms; driver.publication.persist-deferred 0.965ms |
| 5337a2eda9ab2a6c0000000000000376 | 50.652 | 3.781 | 1.990 | 0.000 | 0.073 | 1.386 | 5.208 | 0.021 | n/a | 0.318 | 37.845 | n/a | n/a | 0.030 | 5.845 | 0.115 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.080ms; driver.reader-basis.broadcast 0.034ms |
| 5337a2eda9ab2a6c00000000000006c9 | 49.242 | 2.423 | n/a | 0.000 | 0.709 | 0.633 | 0.892 | 0.011 | n/a | 0.356 | 44.189 | n/a | n/a | 0.028 | 3.132 | 0.064 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.622ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.621ms |
| 5337a2eda9ab2a6c0000000000000a95 | 48.825 | 3.583 | n/a | 0.000 | 0.932 | 7.323 | 0.819 | 0.011 | n/a | 0.848 | 35.276 | n/a | n/a | 0.033 | 4.515 | 0.092 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.163ms |
| 5337a2eda9ab2a6c000000000000040e | 48.144 | 2.273 | n/a | 0.000 | 20.086 | 1.265 | 1.779 | 0.021 | n/a | 3.437 | 19.272 | n/a | n/a | 0.010 | 22.359 | 0.464 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.216ms; driver.publication.persist-deferred 1.363ms; driver.publication.persist-deferred 1.316ms; driver.expected-state.bind-receipt 1.307ms; driver.publication.persist-deferred 1.100ms |
| 5337a2eda9ab2a6c0000000000000354 | 47.718 | 3.899 | n/a | 0.000 | 1.194 | 0.561 | 1.380 | 0.017 | n/a | 0.467 | 40.185 | n/a | n/a | 0.016 | 5.093 | 0.107 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.106ms; driver.publication.persist-deferred 1.089ms; driver.publication.persist-deferred 1.088ms; driver.reader-basis.broadcast 0.090ms |
| 5337a2eda9ab2a6c00000000000004f2 | 47.249 | 6.219 | n/a | 0.000 | 1.096 | 1.813 | 1.373 | 0.017 | n/a | 0.088 | 36.583 | n/a | n/a | 0.060 | 7.315 | 0.155 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000000366 | 47.208 | 2.229 | n/a | 0.000 | 25.824 | 1.231 | 1.780 | 0.044 | n/a | 0.141 | 15.948 | n/a | n/a | 0.009 | 28.053 | 0.594 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.262ms; driver.publication.persist-deferred 1.164ms; driver.publication.persist-deferred 0.994ms; driver.publication.persist-deferred 0.896ms; driver.publication.persist-deferred 0.791ms |
| 5337a2eda9ab2a6c0000000000000342 | 46.872 | 2.867 | n/a | 0.000 | 0.407 | 3.343 | 2.591 | 0.016 | n/a | 0.096 | 37.529 | n/a | n/a | 0.022 | 3.274 | 0.070 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000009b4 | 46.664 | 1.194 | n/a | 0.000 | 0.739 | 3.323 | 1.119 | 0.024 | n/a | 0.076 | 40.181 | n/a | n/a | 0.008 | 1.933 | 0.041 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.158ms; driver.publication.persist-deferred 1.013ms; driver.publication.persist-deferred 0.971ms |

## P2 / L16 / commit / 5-10 facts (989 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.781 | 0.000 | 0.000 | 0.408 | 1.795 | n/a | 0.000 | 0.741 | 0.637 | 0.827 | 0.011 | n/a | 0.111 | 4.945 | n/a | n/a | 0.016 | 2.676 | 0.266 | 0.016 |
| p99 | 46.664 | 1.668 | 0.016 | 1.004 | 5.540 | n/a | 0.000 | 17.940 | 8.481 | 5.036 | 0.055 | n/a | 3.336 | 37.529 | n/a | n/a | 0.052 | 19.914 | 0.700 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c00000000000009b5 | 64.186 | 1.719 | n/a | 0.000 | 0.209 | 0.502 | 0.757 | 0.012 | n/a | 0.764 | 60.205 | n/a | n/a | 0.019 | 1.927 | 0.030 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.504ms; driver.publication.persist-deferred 1.158ms; driver.publication.persist-deferred 1.013ms; driver.publication.persist-deferred 0.971ms; driver.reader-basis.broadcast 0.120ms |
| 5337a2eda9ab2a6c0000000000000d65 | 54.824 | 5.776 | n/a | 0.000 | 3.814 | 1.553 | 2.461 | 0.036 | n/a | 0.159 | 41.004 | n/a | n/a | 0.020 | 9.590 | 0.175 | 0.020 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.120ms; driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 0.956ms; driver.publication.persist-deferred 0.851ms; driver.reader-basis.broadcast 0.153ms |
| 5337a2eda9ab2a6c00000000000009b9 | 53.811 | 1.935 | n/a | 0.000 | 0.704 | 3.037 | 0.607 | 0.009 | n/a | 0.273 | 47.225 | n/a | n/a | 0.021 | 2.639 | 0.049 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.504ms; driver.publication.persist-deferred 1.369ms; driver.publication.persist-deferred 1.023ms; driver.publication.persist-deferred 1.013ms; driver.reader-basis.broadcast 0.120ms |
| 5337a2eda9ab2a6c0000000000000a97 | 53.696 | 7.284 | n/a | 2.578 | 0.592 | 18.830 | 1.325 | 0.021 | n/a | 0.185 | 22.863 | n/a | n/a | 0.019 | 10.454 | 0.195 | 0.019 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.351ms; driver.expected-state.bind-receipt 1.169ms; driver.publication.persist-deferred 1.163ms; driver.publication.persist-deferred 1.007ms; driver.publication.persist-deferred 0.854ms |
| 5337a2eda9ab2a6c000000000000032c | 52.309 | 2.005 | n/a | 0.000 | 30.615 | 0.533 | 1.494 | 0.038 | n/a | 0.892 | 16.715 | n/a | n/a | 0.018 | 32.619 | 0.624 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.430ms; driver.publication.persist-deferred 1.373ms; driver.publication.persist-deferred 0.999ms; driver.publication.persist-deferred 0.987ms; driver.reader-basis.broadcast 0.038ms |
| 5337a2eda9ab2a6c000000000000040d | 51.124 | 2.756 | n/a | 0.000 | 26.167 | 0.987 | 0.788 | 0.016 | n/a | 0.049 | 20.339 | n/a | n/a | 0.023 | 28.923 | 0.566 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.216ms; driver.publication.persist-deferred 1.363ms; driver.publication.persist-deferred 1.316ms; driver.expected-state.bind-receipt 1.307ms; driver.publication.persist-deferred 1.100ms |
| 5337a2eda9ab2a6c00000000000006c9 | 49.242 | 2.423 | n/a | 0.000 | 0.709 | 0.633 | 0.892 | 0.011 | n/a | 0.356 | 44.189 | n/a | n/a | 0.028 | 3.132 | 0.064 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.622ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.621ms |
| 5337a2eda9ab2a6c000000000000040e | 48.144 | 2.273 | n/a | 0.000 | 20.086 | 1.265 | 1.779 | 0.021 | n/a | 3.437 | 19.272 | n/a | n/a | 0.010 | 22.359 | 0.464 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.216ms; driver.publication.persist-deferred 1.363ms; driver.publication.persist-deferred 1.316ms; driver.expected-state.bind-receipt 1.307ms; driver.publication.persist-deferred 1.100ms |
| 5337a2eda9ab2a6c0000000000000342 | 46.872 | 2.867 | n/a | 0.000 | 0.407 | 3.343 | 2.591 | 0.016 | n/a | 0.096 | 37.529 | n/a | n/a | 0.022 | 3.274 | 0.070 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000009b4 | 46.664 | 1.194 | n/a | 0.000 | 0.739 | 3.323 | 1.119 | 0.024 | n/a | 0.076 | 40.181 | n/a | n/a | 0.008 | 1.933 | 0.041 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.158ms; driver.publication.persist-deferred 1.013ms; driver.publication.persist-deferred 0.971ms |
| 5337a2eda9ab2a6c00000000000009b3 | 46.512 | 1.645 | n/a | 0.000 | 1.171 | 0.595 | 1.260 | 0.024 | n/a | 0.101 | 41.705 | n/a | n/a | 0.012 | 2.816 | 0.061 | 0.012 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.158ms; driver.publication.persist-deferred 1.040ms; driver.publication.persist-deferred 0.971ms |
| 5337a2eda9ab2a6c00000000000009ba | 44.572 | 1.126 | n/a | 0.000 | 0.410 | 2.300 | 1.026 | 0.017 | n/a | 0.383 | 39.295 | n/a | n/a | 0.014 | 1.537 | 0.034 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.504ms; driver.publication.persist-deferred 1.369ms; driver.publication.persist-deferred 1.023ms; driver.publication.persist-deferred 1.013ms; driver.reader-basis.broadcast 0.120ms |
| 5337a2eda9ab2a6c0000000000000d68 | 43.865 | 1.533 | n/a | 0.000 | 0.498 | 0.987 | 0.736 | 0.006 | n/a | 0.025 | 40.073 | n/a | n/a | 0.007 | 2.031 | 0.046 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.120ms; driver.publication.persist-deferred 0.851ms; driver.publication.persist-deferred 0.830ms; driver.reader-basis.broadcast 0.153ms |
| 5337a2eda9ab2a6c0000000000000358 | 43.101 | 2.930 | n/a | 0.000 | 0.259 | 2.310 | 1.917 | 0.031 | n/a | 0.762 | 34.875 | n/a | n/a | 0.018 | 3.188 | 0.074 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.486ms; driver.publication.persist-deferred 1.359ms; driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 1.106ms |
| 5337a2eda9ab2a6c000000000000047d | 42.472 | 2.591 | n/a | 0.000 | 3.748 | 1.685 | 0.841 | 0.018 | n/a | 0.096 | 33.466 | n/a | n/a | 0.026 | 6.339 | 0.149 | 0.026 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.257ms; driver.publication.persist-deferred 1.161ms |
| 5337a2eda9ab2a6c000000000000047b | 42.260 | 2.045 | n/a | 0.000 | 0.687 | 0.457 | 0.767 | 0.011 | n/a | 0.074 | 38.210 | n/a | n/a | 0.009 | 2.732 | 0.065 | 0.009 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.161ms |
| 5337a2eda9ab2a6c000000000000032a | 40.170 | 1.643 | n/a | 0.000 | 0.701 | 0.315 | 0.915 | 0.014 | n/a | 0.082 | 36.485 | n/a | n/a | 0.016 | 2.343 | 0.058 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 5337a2eda9ab2a6c0000000000000d67 | 39.481 | 1.548 | n/a | 0.000 | 0.576 | 0.437 | 0.729 | 0.011 | n/a | 0.103 | 36.063 | n/a | n/a | 0.015 | 2.124 | 0.054 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.120ms; driver.publication.persist-deferred 0.851ms; driver.reader-basis.broadcast 0.153ms |
| 5337a2eda9ab2a6c000000000000034e | 39.238 | 2.172 | n/a | 0.000 | 0.752 | 0.540 | 1.119 | 0.028 | n/a | 0.319 | 34.291 | n/a | n/a | 0.017 | 2.924 | 0.075 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000081b | 39.106 | 4.030 | n/a | 0.000 | 23.339 | 4.635 | 0.881 | 0.010 | n/a | 0.084 | 6.104 | n/a | n/a | 0.023 | 27.368 | 0.700 | 0.023 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.658ms; driver.publication.persist-deferred 1.108ms; driver.publication.persist-deferred 1.033ms; driver.publication.persist-deferred 0.953ms; driver.publication.persist-deferred 0.846ms |

## P2/P4 / read-your-own-write / read (53 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.321 | n/a | n/a | n/a | 36.862 | 4.125 | 2.872 | 0.000 | 0.376 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.088 | 55.175 | 0.705 | 17.088 |
| p99 | 314.736 | n/a | n/a | n/a | 93.089 | 235.481 | 12.574 | 0.000 | 99.737 | 80.836 | 39.812 | n/a | 0.013 | 0.000 | n/a | n/a | 136.249 | 260.174 | 1.000 | 136.249 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c0000000000001c35 | 314.736 | 36.862 | 146.187 | 5.394 | 0.000 | 0.182 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 126.111 | 188.442 | 0.599 | 126.111 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 5.400ms; driver.publication.persist-deferred 4.270ms; driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.531ms; driver.publication.persist-deferred 1.232ms |
| 5337a2eda9ab2a6c0000000000001c3e | 314.384 | 35.124 | 160.016 | 6.233 | 0.000 | 0.285 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 112.726 | 201.373 | 0.641 | 112.726 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 5.400ms; driver.publication.persist-deferred 4.270ms; driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.531ms; driver.publication.persist-deferred 1.232ms |
| 5337a2eda9ab2a6c0000000000001c37 | 307.014 | 14.190 | 156.240 | 0.000 | 0.000 | 0.336 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 136.249 | 170.430 | 0.555 | 136.249 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 5.400ms; driver.publication.persist-deferred 4.270ms; driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.531ms; driver.publication.persist-deferred 1.232ms |
| 5337a2eda9ab2a6c0000000000001c36 | 287.172 | 79.307 | 150.611 | 5.506 | 0.000 | 0.189 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.559 | 235.424 | 0.820 | 51.559 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 5.400ms; driver.publication.persist-deferred 4.270ms; driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.531ms; driver.publication.persist-deferred 1.232ms |
| 5337a2eda9ab2a6c0000000000001c43 | 265.330 | 24.692 | 235.481 | 0.000 | 0.000 | 0.577 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.579 | 260.174 | 0.981 | 4.579 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 5.400ms; driver.publication.persist-deferred 4.270ms; driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.531ms; driver.publication.persist-deferred 1.144ms |
| 5337a2eda9ab2a6c0000000000001c31 | 223.607 | 50.286 | 150.093 | 6.279 | 0.000 | 0.337 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.613 | 206.657 | 0.924 | 16.613 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 5.400ms; driver.publication.persist-deferred 4.270ms; driver.publication.persist-deferred 1.531ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.231ms |
| 5337a2eda9ab2a6c0000000000001c24 | 205.764 | 53.930 | 1.802 | 9.583 | 0.000 | 87.922 | 12.708 | 39.812 | n/a | 0.003 | 0.000 | n/a | n/a | 0.004 | 65.316 | 0.317 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.270ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.231ms; driver.publication.persist-deferred 1.230ms; driver.publication.persist-deferred 1.144ms |
| 5337a2eda9ab2a6c0000000000001701 | 199.917 | 93.089 | 8.085 | 11.183 | 0.000 | 6.700 | 80.836 | 0.005 | n/a | 0.013 | 0.000 | n/a | n/a | 0.005 | 112.358 | 0.562 | 0.005 | gw-r/thread-47/gateway.admitted-work | driver.publication.persist-deferred 1.676ms; driver.publication.persist-deferred 1.375ms; driver.publication.persist-deferred 1.370ms; driver.publication.persist-deferred 1.118ms; driver.publication.persist-deferred 1.083ms |
| 5337a2eda9ab2a6c0000000000001c2e | 190.556 | 25.889 | 67.034 | 0.000 | 0.000 | 0.251 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 97.382 | 92.923 | 0.488 | 97.382 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.270ms; driver.publication.persist-deferred 1.531ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.231ms; driver.publication.persist-deferred 1.230ms |
| 5337a2eda9ab2a6c0000000000001c2d | 178.993 | 77.846 | 6.819 | 11.031 | 0.000 | 0.463 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 82.834 | 95.697 | 0.535 | 82.834 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.270ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.231ms; driver.publication.persist-deferred 1.230ms; driver.publication.persist-deferred 1.144ms |
| 5337a2eda9ab2a6c0000000000002063 | 151.439 | 85.258 | 0.498 | 12.574 | 0.000 | 0.768 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.342 | 98.330 | 0.649 | 52.342 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 7.018ms; driver.reader-basis.broadcast 0.915ms; driver.reader-basis.broadcast 0.384ms |
| 5337a2eda9ab2a6c0000000000001c59 | 137.697 | 41.119 | 56.736 | 3.809 | 0.000 | 0.297 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.736 | 101.664 | 0.738 | 35.736 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.141ms; driver.publication.persist-deferred 1.139ms; driver.publication.persist-deferred 1.138ms; driver.publication.persist-deferred 1.083ms |
| 5337a2eda9ab2a6c0000000000000eb6 | 124.776 | 49.629 | 0.196 | 6.031 | 0.000 | 0.334 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.586 | 55.856 | 0.448 | 68.586 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 9.477ms; driver.publication.persist-deferred 1.336ms; driver.publication.persist-deferred 1.066ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.874ms |
| 5337a2eda9ab2a6c000000000000061b | 119.870 | 18.184 | 0.234 | 0.000 | 0.000 | 99.737 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.715 | 18.418 | 0.154 | 1.715 | node-14/thread-3/socket.queue-and-write | driver.publication.persist-deferred 1.096ms; driver.publication.persist-deferred 1.060ms; driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 1.042ms; driver.publication.persist-deferred 0.978ms |
| 5337a2eda9ab2a6c0000000000001c23 | 116.222 | 66.145 | 0.818 | 7.731 | 0.000 | 0.874 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.654 | 74.694 | 0.643 | 40.654 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.231ms; driver.publication.persist-deferred 1.230ms; driver.publication.persist-deferred 1.097ms; driver.publication.persist-deferred 1.063ms |
| 5337a2eda9ab2a6c000000000000173b | 113.012 | 68.322 | 5.945 | 4.572 | 0.000 | 1.116 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.057 | 78.839 | 0.698 | 33.057 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.483ms; driver.publication.persist-deferred 1.349ms; driver.publication.persist-deferred 1.059ms; driver.publication.persist-deferred 1.054ms; driver.publication.persist-deferred 0.918ms |
| 5337a2eda9ab2a6c0000000000000619 | 112.041 | 54.101 | 0.343 | 4.088 | 0.000 | 0.287 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 53.222 | 58.531 | 0.522 | 53.222 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.096ms; driver.publication.persist-deferred 1.060ms; driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 1.042ms; driver.publication.persist-deferred 1.037ms |
| 5337a2eda9ab2a6c000000000000180c | 110.671 | 61.286 | 0.146 | 5.434 | 0.000 | 0.298 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.507 | 66.866 | 0.604 | 43.507 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.050ms; driver.publication.persist-deferred 1.033ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.971ms; driver.publication.persist-deferred 0.935ms |
| 5337a2eda9ab2a6c00000000000019ba | 109.107 | 37.833 | 2.345 | 1.740 | 0.000 | 0.335 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.853 | 41.918 | 0.384 | 66.853 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.087ms; driver.publication.persist-deferred 1.069ms; driver.publication.persist-deferred 0.860ms; driver.publication.persist-deferred 0.735ms; driver.reader-basis.broadcast 0.290ms |
| 5337a2eda9ab2a6c00000000000011d0 | 107.007 | 69.165 | 7.892 | 8.947 | 0.000 | 0.454 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.550 | 86.003 | 0.804 | 20.550 | node-14/thread-2/replica.pull-at | driver.publication.persist-deferred 1.162ms; driver.publication.persist-deferred 1.074ms; driver.publication.persist-deferred 1.010ms; driver.publication.persist-deferred 0.848ms; driver.reader-basis.broadcast 0.207ms |

## P2 / L64 / commit (1777 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.062 | 0.165 | 0.000 | 0.503 | 2.226 | n/a | 0.000 | 0.693 | 0.553 | 0.888 | 0.011 | n/a | 0.078 | 5.108 | n/a | n/a | 0.012 | 3.077 | 0.289 | 0.012 |
| p99 | 38.958 | 2.010 | 0.000 | 2.044 | 7.257 | n/a | 0.208 | 12.173 | 7.420 | 7.122 | 0.042 | n/a | 2.275 | 29.283 | n/a | n/a | 0.039 | 16.768 | 0.691 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c00000000000011ea | 76.717 | 10.087 | n/a | 0.000 | 0.807 | 11.771 | 26.392 | 0.038 | n/a | 3.307 | 24.294 | n/a | n/a | 0.022 | 10.893 | 0.142 | 0.022 | gw-w/thread-47/gateway.admitted-work | driver.publication.persist-deferred 1.208ms; driver.publication.persist-deferred 1.039ms; driver.publication.persist-deferred 1.019ms; driver.reader-basis.broadcast 0.200ms |
| 5337a2eda9ab2a6c00000000000011ed | 52.151 | 5.985 | n/a | 0.000 | 0.733 | 11.462 | 14.628 | 0.036 | n/a | 0.134 | 19.157 | n/a | n/a | 0.016 | 6.718 | 0.129 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.208ms; driver.publication.persist-deferred 1.111ms; driver.publication.persist-deferred 1.039ms; driver.publication.persist-deferred 1.019ms |
| 5337a2eda9ab2a6c0000000000001112 | 51.491 | 4.698 | n/a | 0.000 | 0.507 | 0.757 | 1.076 | 0.011 | n/a | 0.384 | 44.030 | n/a | n/a | 0.029 | 5.205 | 0.101 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.206ms |
| 5337a2eda9ab2a6c0000000000001113 | 49.595 | 2.402 | n/a | 0.000 | 1.209 | 2.247 | 0.440 | 0.006 | n/a | 0.163 | 43.109 | n/a | n/a | 0.020 | 3.611 | 0.073 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.892ms; driver.reader-basis.broadcast 0.206ms |
| 5337a2eda9ab2a6c0000000000001d19 | 47.314 | 4.620 | n/a | 0.000 | 0.360 | 3.805 | 1.731 | 0.025 | n/a | 0.075 | 36.665 | n/a | n/a | 0.033 | 4.980 | 0.105 | 0.033 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.192ms; driver.reader-basis.broadcast 0.317ms |
| 5337a2eda9ab2a6c00000000000011bf | 44.565 | 1.281 | n/a | 0.000 | 18.565 | 3.492 | 0.618 | 0.012 | n/a | 0.092 | 20.499 | n/a | n/a | 0.007 | 19.845 | 0.445 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.278ms; driver.publication.persist-deferred 1.109ms; driver.publication.persist-deferred 1.033ms; driver.publication.persist-deferred 1.010ms; driver.publication.persist-deferred 0.896ms |
| 5337a2eda9ab2a6c000000000000117a | 43.939 | 2.334 | n/a | 0.000 | 28.021 | 7.100 | 0.949 | 0.038 | n/a | 0.167 | 5.316 | n/a | n/a | 0.013 | 30.355 | 0.691 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.549ms; driver.publication.persist-deferred 1.213ms; driver.publication.persist-deferred 1.068ms; driver.publication.persist-deferred 0.993ms; driver.publication.persist-deferred 0.935ms |
| 5337a2eda9ab2a6c0000000000001869 | 43.793 | 2.208 | n/a | 0.000 | 0.852 | 0.467 | 1.016 | 0.015 | n/a | 0.282 | 38.940 | n/a | n/a | 0.014 | 3.060 | 0.070 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001474 | 43.363 | 5.200 | n/a | 0.000 | 0.138 | 8.304 | 2.160 | 0.031 | n/a | 0.476 | 27.045 | n/a | n/a | 0.009 | 5.338 | 0.123 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.110ms; driver.publication.persist-deferred 0.996ms; driver.reader-basis.broadcast 0.496ms; driver.publication.persist-deferred 0.090ms |
| 5337a2eda9ab2a6c00000000000019e1 | 42.992 | 3.580 | n/a | 0.000 | 18.561 | 9.113 | 0.882 | 0.021 | n/a | 0.049 | 10.773 | n/a | n/a | 0.015 | 22.140 | 0.515 | 0.015 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 1.350ms; driver.expected-state.bind-receipt 1.273ms |
| 5337a2eda9ab2a6c0000000000001b42 | 41.819 | 1.058 | n/a | 0.000 | 1.000 | 4.477 | 0.992 | 0.014 | n/a | 0.298 | 33.975 | n/a | n/a | 0.005 | 2.058 | 0.049 | 0.005 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.938ms; driver.reader-basis.broadcast 0.288ms |
| 5337a2eda9ab2a6c00000000000018ac | 41.670 | 3.878 | n/a | 0.000 | 2.980 | 2.638 | 0.794 | 0.009 | n/a | 1.471 | 29.893 | n/a | n/a | 0.007 | 6.859 | 0.165 | 0.007 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.142ms; driver.publication.persist-deferred 1.013ms; driver.publication.persist-deferred 0.969ms |
| 5337a2eda9ab2a6c0000000000001b41 | 41.651 | 2.904 | n/a | 0.000 | 0.952 | 0.555 | 2.079 | 0.023 | n/a | 0.125 | 35.001 | n/a | n/a | 0.011 | 3.856 | 0.093 | 0.011 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.288ms |
| 5337a2eda9ab2a6c0000000000001510 | 40.230 | 4.699 | n/a | 0.000 | 1.031 | 6.228 | 1.356 | 0.015 | n/a | 0.028 | 26.865 | n/a | n/a | 0.007 | 5.731 | 0.142 | 0.007 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.050ms; driver.publication.persist-deferred 1.049ms; driver.publication.persist-deferred 1.041ms; driver.publication.persist-deferred 0.939ms |
| 5337a2eda9ab2a6c0000000000001c0c | 40.029 | 5.872 | n/a | 0.000 | 0.324 | 7.336 | 0.944 | 0.011 | n/a | 0.047 | 25.472 | n/a | n/a | 0.022 | 6.196 | 0.155 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.065ms |
| 5337a2eda9ab2a6c00000000000019b1 | 39.467 | 2.658 | n/a | 0.000 | 0.457 | 0.494 | 1.702 | 0.018 | n/a | 0.077 | 34.049 | n/a | n/a | 0.012 | 3.115 | 0.079 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000138c | 39.120 | 2.918 | n/a | 0.000 | 19.956 | 2.837 | 0.919 | 0.015 | n/a | 0.066 | 12.394 | n/a | n/a | 0.015 | 22.874 | 0.585 | 0.015 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 5337a2eda9ab2a6c0000000000001414 | 38.958 | 3.323 | n/a | 0.000 | 3.056 | 1.245 | 1.292 | 0.015 | n/a | 0.729 | 29.283 | n/a | n/a | 0.015 | 6.379 | 0.164 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.002ms; driver.publication.persist-deferred 1.204ms; driver.publication.persist-deferred 0.966ms |
| 5337a2eda9ab2a6c00000000000011c1 | 38.398 | 3.060 | n/a | 0.000 | 2.955 | 0.506 | 2.024 | 0.027 | n/a | 0.160 | 29.651 | n/a | n/a | 0.015 | 6.015 | 0.157 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.278ms; driver.publication.persist-deferred 1.109ms; driver.publication.persist-deferred 0.896ms |
| 5337a2eda9ab2a6c000000000000197b | 38.397 | 4.410 | n/a | 0.000 | 0.386 | 0.648 | 2.587 | 0.025 | n/a | 0.128 | 30.188 | n/a | n/a | 0.023 | 4.796 | 0.125 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1061 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.600 | 0.000 | 0.000 | 0.387 | 1.775 | n/a | 0.000 | 0.702 | 0.536 | 0.767 | 0.011 | n/a | 0.078 | 4.584 | n/a | n/a | 0.012 | 2.578 | 0.274 | 0.012 |
| p99 | 37.399 | 1.732 | 0.000 | 0.926 | 4.839 | n/a | 0.000 | 11.921 | 7.420 | 4.572 | 0.042 | n/a | 2.248 | 24.862 | n/a | n/a | 0.040 | 13.219 | 0.691 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c00000000000011ea | 76.717 | 10.087 | n/a | 0.000 | 0.807 | 11.771 | 26.392 | 0.038 | n/a | 3.307 | 24.294 | n/a | n/a | 0.022 | 10.893 | 0.142 | 0.022 | gw-w/thread-47/gateway.admitted-work | driver.publication.persist-deferred 1.208ms; driver.publication.persist-deferred 1.039ms; driver.publication.persist-deferred 1.019ms; driver.reader-basis.broadcast 0.200ms |
| 5337a2eda9ab2a6c00000000000011ed | 52.151 | 5.985 | n/a | 0.000 | 0.733 | 11.462 | 14.628 | 0.036 | n/a | 0.134 | 19.157 | n/a | n/a | 0.016 | 6.718 | 0.129 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.208ms; driver.publication.persist-deferred 1.111ms; driver.publication.persist-deferred 1.039ms; driver.publication.persist-deferred 1.019ms |
| 5337a2eda9ab2a6c0000000000001113 | 49.595 | 2.402 | n/a | 0.000 | 1.209 | 2.247 | 0.440 | 0.006 | n/a | 0.163 | 43.109 | n/a | n/a | 0.020 | 3.611 | 0.073 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.892ms; driver.reader-basis.broadcast 0.206ms |
| 5337a2eda9ab2a6c00000000000011bf | 44.565 | 1.281 | n/a | 0.000 | 18.565 | 3.492 | 0.618 | 0.012 | n/a | 0.092 | 20.499 | n/a | n/a | 0.007 | 19.845 | 0.445 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.278ms; driver.publication.persist-deferred 1.109ms; driver.publication.persist-deferred 1.033ms; driver.publication.persist-deferred 1.010ms; driver.publication.persist-deferred 0.896ms |
| 5337a2eda9ab2a6c000000000000117a | 43.939 | 2.334 | n/a | 0.000 | 28.021 | 7.100 | 0.949 | 0.038 | n/a | 0.167 | 5.316 | n/a | n/a | 0.013 | 30.355 | 0.691 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.549ms; driver.publication.persist-deferred 1.213ms; driver.publication.persist-deferred 1.068ms; driver.publication.persist-deferred 0.993ms; driver.publication.persist-deferred 0.935ms |
| 5337a2eda9ab2a6c0000000000001474 | 43.363 | 5.200 | n/a | 0.000 | 0.138 | 8.304 | 2.160 | 0.031 | n/a | 0.476 | 27.045 | n/a | n/a | 0.009 | 5.338 | 0.123 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.110ms; driver.publication.persist-deferred 0.996ms; driver.reader-basis.broadcast 0.496ms; driver.publication.persist-deferred 0.090ms |
| 5337a2eda9ab2a6c0000000000001b42 | 41.819 | 1.058 | n/a | 0.000 | 1.000 | 4.477 | 0.992 | 0.014 | n/a | 0.298 | 33.975 | n/a | n/a | 0.005 | 2.058 | 0.049 | 0.005 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.938ms; driver.reader-basis.broadcast 0.288ms |
| 5337a2eda9ab2a6c000000000000138c | 39.120 | 2.918 | n/a | 0.000 | 19.956 | 2.837 | 0.919 | 0.015 | n/a | 0.066 | 12.394 | n/a | n/a | 0.015 | 22.874 | 0.585 | 0.015 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 5337a2eda9ab2a6c000000000000197c | 37.944 | 2.187 | n/a | 0.000 | 0.929 | 0.426 | 28.824 | 0.020 | n/a | 0.074 | 5.474 | n/a | n/a | 0.010 | 3.116 | 0.082 | 0.010 | gw-w/thread-44/gateway.request-parse | driver.publication.persist-deferred 1.095ms |
| 5337a2eda9ab2a6c0000000000001d3c | 37.768 | 2.552 | n/a | 0.000 | 0.831 | 0.401 | 0.996 | 0.012 | n/a | 1.260 | 31.681 | n/a | n/a | 0.036 | 3.383 | 0.090 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.953ms |
| 5337a2eda9ab2a6c0000000000001d1a | 37.399 | 2.034 | n/a | 0.000 | 0.840 | 0.501 | 1.186 | 0.022 | n/a | 0.058 | 32.743 | n/a | n/a | 0.015 | 2.874 | 0.077 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.317ms |
| 5337a2eda9ab2a6c00000000000013fe | 36.734 | 2.956 | n/a | 0.000 | 0.121 | 0.581 | 0.728 | 0.011 | n/a | 0.093 | 32.226 | n/a | n/a | 0.019 | 3.077 | 0.084 | 0.019 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001549 | 36.351 | 1.339 | n/a | 0.000 | 28.227 | 0.311 | 0.923 | 0.015 | n/a | 0.042 | 5.485 | n/a | n/a | 0.010 | 29.565 | 0.813 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.086ms; driver.publication.persist-deferred 0.975ms; driver.publication.persist-deferred 0.930ms; driver.publication.persist-deferred 0.758ms |
| 5337a2eda9ab2a6c00000000000010da | 36.038 | 1.696 | n/a | 0.000 | 1.010 | 0.360 | 0.796 | 0.014 | n/a | 0.115 | 32.032 | n/a | n/a | 0.015 | 2.706 | 0.075 | 0.015 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.977ms |
| 5337a2eda9ab2a6c0000000000001b44 | 33.756 | 1.905 | n/a | 0.000 | 1.043 | 2.308 | 0.607 | 0.008 | n/a | 0.063 | 27.811 | n/a | n/a | 0.012 | 2.948 | 0.087 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.938ms; driver.reader-basis.broadcast 0.288ms |
| 5337a2eda9ab2a6c0000000000001018 | 32.642 | 1.726 | n/a | 0.000 | 0.451 | 0.322 | 0.687 | 0.010 | n/a | 0.067 | 29.367 | n/a | n/a | 0.012 | 2.177 | 0.067 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.210ms |
| 5337a2eda9ab2a6c00000000000011eb | 31.662 | 2.330 | n/a | 0.000 | 1.071 | 2.238 | 1.073 | 0.017 | n/a | 0.054 | 24.862 | n/a | n/a | 0.016 | 3.401 | 0.107 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.019ms; driver.reader-basis.broadcast 0.200ms |
| 5337a2eda9ab2a6c00000000000011f0 | 31.559 | 1.938 | n/a | 0.000 | 0.291 | 0.482 | 0.801 | 0.010 | n/a | 0.034 | 27.988 | n/a | n/a | 0.015 | 2.229 | 0.071 | 0.015 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.239ms |
| 5337a2eda9ab2a6c0000000000001c0d | 29.593 | 1.820 | n/a | 0.000 | 3.399 | 15.280 | 1.131 | 0.017 | n/a | 0.053 | 7.879 | n/a | n/a | 0.013 | 5.219 | 0.176 | 0.013 | node-14/thread-0/socket.wait-first-byte | none observed |
| 5337a2eda9ab2a6c0000000000001be9 | 29.262 | 3.655 | n/a | 0.000 | 0.854 | 10.219 | 1.634 | 0.021 | n/a | 0.299 | 12.570 | n/a | n/a | 0.012 | 4.508 | 0.154 | 0.012 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.160ms; driver.publication.persist-deferred 1.106ms; driver.publication.persist-deferred 0.772ms |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.419 | 0.112 | 0.000 | 0.427 | 3.157 | n/a | 0.000 | 0.128 | 0.827 | 1.933 | 0.020 | n/a | 0.088 | 5.965 | n/a | n/a | 0.020 | 3.618 | 0.253 | 0.020 |
| p99 | 48.647 | 1.982 | 0.000 | 2.007 | 8.620 | n/a | 0.583 | 1.892 | 13.631 | 25.984 | 0.056 | n/a | 0.801 | 21.410 | n/a | n/a | 0.061 | 9.344 | 0.480 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c0000000000001e7f | 48.647 | 3.211 | 0.356 | 0.000 | 0.110 | 13.631 | 25.984 | 0.018 | n/a | 0.061 | 5.246 | n/a | n/a | 0.029 | 3.677 | 0.076 | 0.029 | gw-w/thread-43/gateway.admitted-work | driver.reader-basis.broadcast 0.375ms |
| 5337a2eda9ab2a6c0000000000001de7 | 28.292 | 3.044 | 0.220 | 0.258 | 0.086 | 4.612 | 11.866 | 0.041 | n/a | 0.131 | 8.011 | n/a | n/a | 0.024 | 3.608 | 0.128 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e31 | 27.632 | 3.916 | 0.279 | 0.000 | 0.061 | 3.888 | 9.599 | 0.018 | n/a | 0.059 | 9.796 | n/a | n/a | 0.017 | 4.256 | 0.154 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.428ms |
| 5337a2eda9ab2a6c0000000000001de3 | 27.291 | 1.851 | n/a | 0.000 | 0.128 | 0.481 | 3.328 | 0.012 | n/a | 0.052 | 21.410 | n/a | n/a | 0.027 | 1.979 | 0.073 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.702ms |
| 5337a2eda9ab2a6c0000000000001e2b | 25.988 | 3.448 | 1.723 | 0.000 | 0.072 | 1.456 | 14.749 | 0.033 | n/a | 0.085 | 4.395 | n/a | n/a | 0.027 | 5.242 | 0.202 | 0.027 | gw-w/thread-63/gateway.admitted-work | driver.reader-basis.broadcast 0.819ms |
| 5337a2eda9ab2a6c0000000000001e4b | 23.796 | 3.524 | 0.263 | 0.000 | 0.034 | 1.499 | 5.861 | 0.028 | n/a | 0.076 | 12.496 | n/a | n/a | 0.015 | 3.821 | 0.161 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.425ms |
| 5337a2eda9ab2a6c0000000000001def | 22.557 | 5.750 | 0.172 | 0.295 | 0.072 | 1.716 | 5.875 | 0.024 | n/a | 0.077 | 8.555 | n/a | n/a | 0.022 | 6.288 | 0.279 | 0.022 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e35 | 22.359 | 4.146 | 0.334 | 0.000 | 0.035 | 1.928 | 11.155 | 0.026 | n/a | 0.349 | 4.369 | n/a | n/a | 0.017 | 4.515 | 0.202 | 0.017 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.677ms |
| 5337a2eda9ab2a6c0000000000001e41 | 22.321 | 2.580 | n/a | 0.000 | 1.046 | 0.691 | 3.901 | 0.017 | n/a | 0.074 | 13.986 | n/a | n/a | 0.026 | 3.626 | 0.162 | 0.026 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001df3 | 22.203 | 3.753 | 1.942 | 0.334 | 0.115 | 1.350 | 7.678 | 0.022 | n/a | 0.071 | 6.906 | n/a | n/a | 0.032 | 6.144 | 0.277 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e11 | 21.833 | 2.965 | 0.172 | 0.000 | 0.037 | 1.029 | 8.764 | 0.026 | n/a | 0.096 | 8.729 | n/a | n/a | 0.016 | 3.174 | 0.145 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.150ms |
| 5337a2eda9ab2a6c0000000000001e6f | 21.411 | 8.620 | n/a | 0.000 | 0.724 | 0.861 | 1.423 | 0.014 | n/a | 0.064 | 9.665 | n/a | n/a | 0.041 | 9.344 | 0.436 | 0.041 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e71 | 21.125 | 5.060 | 0.233 | 0.000 | 0.041 | 1.784 | 8.803 | 0.020 | n/a | 0.061 | 5.107 | n/a | n/a | 0.017 | 5.334 | 0.253 | 0.017 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.384ms |
| 5337a2eda9ab2a6c0000000000001e45 | 20.074 | 3.714 | 0.168 | 0.000 | 0.043 | 1.520 | 5.689 | 0.028 | n/a | 0.109 | 8.787 | n/a | n/a | 0.016 | 3.925 | 0.196 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.398ms |
| 5337a2eda9ab2a6c0000000000001ddb | 19.946 | 7.051 | 1.768 | 0.267 | 0.034 | 1.194 | 3.503 | 0.025 | n/a | 0.116 | 5.965 | n/a | n/a | 0.022 | 9.121 | 0.457 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e8b | 19.813 | 4.128 | 0.207 | 0.000 | 0.055 | 1.430 | 8.033 | 0.021 | n/a | 0.263 | 5.656 | n/a | n/a | 0.020 | 4.389 | 0.222 | 0.020 | gw-w/thread-63/gateway.admitted-work | none observed |
| 5337a2eda9ab2a6c0000000000001df5 | 19.323 | 4.601 | n/a | 0.000 | 0.796 | 1.175 | 2.427 | 0.035 | n/a | 0.140 | 10.124 | n/a | n/a | 0.024 | 5.397 | 0.279 | 0.024 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.859ms |
| 5337a2eda9ab2a6c0000000000001df9 | 19.269 | 2.974 | n/a | 0.000 | 0.518 | 0.545 | 3.291 | 0.033 | n/a | 0.095 | 11.792 | n/a | n/a | 0.021 | 3.492 | 0.181 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e83 | 19.196 | 3.676 | 0.335 | 0.000 | 0.047 | 1.385 | 3.665 | 0.049 | n/a | 0.801 | 9.214 | n/a | n/a | 0.023 | 4.059 | 0.211 | 0.023 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e55 | 19.140 | 3.440 | 0.259 | 0.000 | 0.104 | 1.463 | 6.891 | 0.041 | n/a | 0.140 | 6.772 | n/a | n/a | 0.031 | 3.803 | 0.199 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.403ms |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.544 | 0.000 | 0.000 | 0.466 | 2.199 | n/a | 0.000 | 0.508 | 0.579 | 1.047 | 0.016 | n/a | 0.094 | 5.321 | n/a | n/a | 0.021 | 2.924 | 0.253 | 0.021 |
| p99 | 27.291 | 1.695 | 0.000 | 0.899 | 4.601 | n/a | 0.000 | 1.892 | 1.175 | 3.901 | 0.043 | n/a | 0.381 | 21.410 | n/a | n/a | 0.048 | 5.619 | 0.464 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c0000000000001de3 | 27.291 | 1.851 | n/a | 0.000 | 0.128 | 0.481 | 3.328 | 0.012 | n/a | 0.052 | 21.410 | n/a | n/a | 0.027 | 1.979 | 0.073 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.702ms |
| 5337a2eda9ab2a6c0000000000001e41 | 22.321 | 2.580 | n/a | 0.000 | 1.046 | 0.691 | 3.901 | 0.017 | n/a | 0.074 | 13.986 | n/a | n/a | 0.026 | 3.626 | 0.162 | 0.026 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001df5 | 19.323 | 4.601 | n/a | 0.000 | 0.796 | 1.175 | 2.427 | 0.035 | n/a | 0.140 | 10.124 | n/a | n/a | 0.024 | 5.397 | 0.279 | 0.024 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.859ms |
| 5337a2eda9ab2a6c0000000000001dff | 18.473 | 2.044 | n/a | 0.000 | 0.880 | 0.886 | 3.140 | 0.043 | n/a | 0.292 | 11.166 | n/a | n/a | 0.022 | 2.924 | 0.158 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e59 | 17.930 | 1.782 | n/a | 0.000 | 0.058 | 0.650 | 1.992 | 0.028 | n/a | 0.168 | 13.234 | n/a | n/a | 0.017 | 1.840 | 0.103 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.113ms |
| 5337a2eda9ab2a6c0000000000001de9 | 15.773 | 2.624 | n/a | 0.000 | 0.502 | 0.424 | 0.681 | 0.013 | n/a | 0.071 | 11.444 | n/a | n/a | 0.014 | 3.126 | 0.198 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e4d | 14.182 | 2.462 | n/a | 0.000 | 0.508 | 0.648 | 1.254 | 0.022 | n/a | 0.094 | 9.167 | n/a | n/a | 0.027 | 2.970 | 0.209 | 0.027 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e8f | 12.868 | 2.335 | n/a | 0.000 | 0.494 | 0.568 | 1.007 | 0.014 | n/a | 0.057 | 8.371 | n/a | n/a | 0.021 | 2.829 | 0.220 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001deb | 12.165 | 1.451 | n/a | 0.000 | 0.208 | 0.626 | 1.294 | 0.020 | n/a | 0.064 | 8.487 | n/a | n/a | 0.014 | 1.660 | 0.136 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e65 | 12.107 | 3.727 | n/a | 0.000 | 1.892 | 0.865 | 1.041 | 0.022 | n/a | 0.292 | 4.241 | n/a | n/a | 0.028 | 5.619 | 0.464 | 0.028 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e17 | 11.687 | 3.996 | n/a | 0.000 | 1.011 | 0.896 | 1.146 | 0.021 | n/a | 0.095 | 4.495 | n/a | n/a | 0.026 | 5.008 | 0.428 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e56 | 11.612 | 1.988 | n/a | 0.000 | 0.953 | 0.606 | 1.896 | 0.031 | n/a | 0.129 | 5.986 | n/a | n/a | 0.022 | 2.941 | 0.253 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e73 | 11.530 | 3.500 | n/a | 0.000 | 0.946 | 0.691 | 1.270 | 0.017 | n/a | 0.068 | 4.996 | n/a | n/a | 0.042 | 4.445 | 0.386 | 0.042 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001de5 | 11.451 | 2.163 | n/a | 0.000 | 0.904 | 0.497 | 0.925 | 0.013 | n/a | 0.078 | 6.850 | n/a | n/a | 0.020 | 3.068 | 0.268 | 0.020 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ddd | 11.190 | 1.754 | n/a | 0.000 | 0.712 | 0.576 | 1.257 | 0.019 | n/a | 0.146 | 6.705 | n/a | n/a | 0.021 | 2.466 | 0.220 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e37 | 10.974 | 3.246 | n/a | 0.000 | 0.427 | 0.647 | 0.782 | 0.015 | n/a | 0.337 | 5.473 | n/a | n/a | 0.046 | 3.673 | 0.335 | 0.046 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e6d | 10.859 | 2.351 | n/a | 0.000 | 0.234 | 0.526 | 1.047 | 0.016 | n/a | 0.075 | 6.588 | n/a | n/a | 0.022 | 2.585 | 0.238 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e89 | 10.544 | 3.434 | n/a | 0.000 | 0.150 | 0.621 | 1.007 | 0.013 | n/a | 0.065 | 5.223 | n/a | n/a | 0.031 | 3.584 | 0.340 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e5c | 10.226 | 1.566 | n/a | 0.000 | 0.398 | 0.412 | 0.711 | 0.012 | n/a | 0.066 | 7.044 | n/a | n/a | 0.015 | 1.965 | 0.192 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e03 | 10.150 | 1.713 | n/a | 0.000 | 0.331 | 0.517 | 1.459 | 0.020 | n/a | 0.247 | 5.844 | n/a | n/a | 0.021 | 2.043 | 0.201 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.758 | 0.102 | 0.000 | 0.408 | 3.004 | n/a | 0.000 | 0.137 | 0.834 | 1.605 | 0.018 | n/a | 0.105 | 7.054 | n/a | n/a | 0.018 | 3.412 | 0.229 | 0.018 |
| p99 | 90.822 | 2.955 | 0.021 | 3.256 | 5.924 | n/a | 2.143 | 1.119 | 4.324 | 11.819 | 1.990 | n/a | 2.492 | 76.507 | n/a | n/a | 0.096 | 8.152 | 0.482 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c0000000000001eab | 90.822 | 2.908 | 0.177 | 0.000 | 0.037 | 0.987 | 9.906 | 0.018 | n/a | 0.268 | 76.507 | n/a | n/a | 0.014 | 3.122 | 0.034 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.314ms |
| 5337a2eda9ab2a6c0000000000001e9f | 50.381 | 2.769 | n/a | 0.000 | 0.199 | 2.074 | 1.439 | 0.018 | n/a | 0.112 | 43.751 | n/a | n/a | 0.017 | 2.969 | 0.059 | 0.017 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001eff | 37.230 | 2.644 | 0.163 | 0.000 | 0.030 | 0.744 | 2.545 | 0.017 | n/a | 0.051 | 31.023 | n/a | n/a | 0.013 | 2.837 | 0.076 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f31 | 26.434 | 5.406 | 0.339 | 0.000 | 0.059 | 2.304 | 6.470 | 0.049 | n/a | 0.153 | 11.634 | n/a | n/a | 0.021 | 5.804 | 0.220 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f0d | 25.627 | 4.483 | 0.296 | 0.000 | 0.039 | 1.346 | 7.473 | 0.020 | n/a | 0.288 | 11.668 | n/a | n/a | 0.015 | 4.818 | 0.188 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ea6 | 25.512 | 3.240 | 0.218 | 0.000 | 0.049 | 1.213 | 4.834 | 0.019 | n/a | 0.071 | 15.852 | n/a | n/a | 0.017 | 3.507 | 0.137 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ea8 | 24.862 | 1.921 | n/a | 0.000 | 0.870 | 4.085 | 0.839 | 0.011 | n/a | 0.046 | 17.071 | n/a | n/a | 0.018 | 2.792 | 0.112 | 0.018 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f2b | 24.565 | 3.896 | 0.274 | 0.000 | 0.039 | 2.030 | 5.704 | 0.028 | n/a | 0.341 | 12.235 | n/a | n/a | 0.017 | 4.209 | 0.171 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001eaa | 24.319 | 3.735 | n/a | 0.000 | 0.939 | 4.007 | 10.158 | 1.990 | n/a | 0.466 | 2.999 | n/a | n/a | 0.024 | 4.675 | 0.192 | 0.024 | gw-w/thread-44/storage/begin-command! | driver.reader-basis.broadcast 0.324ms |
| 5337a2eda9ab2a6c0000000000001eb9 | 24.206 | 4.174 | 0.416 | 0.000 | 0.045 | 2.063 | 6.894 | 0.044 | n/a | 0.135 | 10.417 | n/a | n/a | 0.019 | 4.635 | 0.191 | 0.019 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f43 | 23.760 | 3.889 | 0.308 | 0.000 | 0.137 | 1.385 | 5.848 | 0.022 | n/a | 0.348 | 11.726 | n/a | n/a | 0.096 | 4.334 | 0.182 | 0.096 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f4e | 23.187 | 5.054 | n/a | 2.143 | 0.954 | 0.757 | 1.454 | 0.014 | n/a | 0.366 | 12.411 | n/a | n/a | 0.032 | 8.152 | 0.352 | 0.032 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ed3 | 22.661 | 5.924 | n/a | 0.000 | 0.403 | 2.092 | 11.819 | 0.041 | n/a | 0.170 | 2.174 | n/a | n/a | 0.039 | 6.327 | 0.279 | 0.039 | gw-w/thread-45/storage/begin-command! | none observed |
| 5337a2eda9ab2a6c0000000000001ea4 | 21.896 | 5.515 | n/a | 0.000 | 0.571 | 0.607 | 1.303 | 0.012 | n/a | 0.300 | 13.561 | n/a | n/a | 0.026 | 6.086 | 0.278 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f3b | 21.323 | 2.884 | 0.300 | 0.000 | 0.082 | 3.316 | 5.246 | 0.016 | n/a | 0.046 | 9.385 | n/a | n/a | 0.048 | 3.266 | 0.153 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ee0 | 20.985 | 3.044 | 0.254 | 0.000 | 0.099 | 1.138 | 8.815 | 0.025 | n/a | 0.080 | 7.498 | n/a | n/a | 0.031 | 3.397 | 0.162 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ec9 | 20.579 | 3.004 | 0.270 | 0.000 | 0.039 | 1.146 | 8.523 | 0.020 | n/a | 0.223 | 7.339 | n/a | n/a | 0.015 | 3.313 | 0.161 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001eb7 | 20.531 | 2.228 | n/a | 0.000 | 0.864 | 0.198 | 0.844 | 0.014 | n/a | 0.059 | 16.309 | n/a | n/a | 0.014 | 3.092 | 0.151 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ed4 | 20.430 | 4.619 | 0.300 | 0.000 | 0.036 | 2.109 | 4.262 | 0.028 | n/a | 0.102 | 8.958 | n/a | n/a | 0.016 | 4.955 | 0.243 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001eda | 20.131 | 3.222 | 0.279 | 0.000 | 0.031 | 1.003 | 5.148 | 0.016 | n/a | 0.049 | 10.372 | n/a | n/a | 0.012 | 3.531 | 0.175 | 0.012 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.175 | 0.000 | 0.000 | 0.412 | 2.204 | n/a | 0.000 | 0.597 | 0.570 | 1.073 | 0.016 | n/a | 0.111 | 6.192 | n/a | n/a | 0.022 | 2.807 | 0.253 | 0.022 |
| p99 | 50.381 | 2.346 | 0.000 | 2.645 | 5.924 | n/a | 1.641 | 1.115 | 4.007 | 11.819 | 1.990 | n/a | 0.699 | 43.751 | n/a | n/a | 0.060 | 6.327 | 0.482 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c0000000000001e9f | 50.381 | 2.769 | n/a | 0.000 | 0.199 | 2.074 | 1.439 | 0.018 | n/a | 0.112 | 43.751 | n/a | n/a | 0.017 | 2.969 | 0.059 | 0.017 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001eaa | 24.319 | 3.735 | n/a | 0.000 | 0.939 | 4.007 | 10.158 | 1.990 | n/a | 0.466 | 2.999 | n/a | n/a | 0.024 | 4.675 | 0.192 | 0.024 | gw-w/thread-44/storage/begin-command! | driver.reader-basis.broadcast 0.324ms |
| 5337a2eda9ab2a6c0000000000001ed3 | 22.661 | 5.924 | n/a | 0.000 | 0.403 | 2.092 | 11.819 | 0.041 | n/a | 0.170 | 2.174 | n/a | n/a | 0.039 | 6.327 | 0.279 | 0.039 | gw-w/thread-45/storage/begin-command! | none observed |
| 5337a2eda9ab2a6c0000000000001f21 | 18.816 | 4.847 | n/a | 0.000 | 1.115 | 0.570 | 1.052 | 0.017 | n/a | 0.260 | 10.919 | n/a | n/a | 0.037 | 5.961 | 0.317 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001e93 | 16.243 | 2.036 | n/a | 0.000 | 1.048 | 0.484 | 1.073 | 0.015 | n/a | 0.119 | 11.446 | n/a | n/a | 0.023 | 3.084 | 0.190 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ebb | 15.622 | 2.204 | n/a | 0.000 | 0.602 | 0.544 | 1.031 | 0.016 | n/a | 0.517 | 10.688 | n/a | n/a | 0.020 | 2.806 | 0.180 | 0.020 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001edc | 14.367 | 2.213 | n/a | 0.000 | 0.756 | 0.560 | 1.321 | 0.022 | n/a | 0.105 | 9.374 | n/a | n/a | 0.017 | 2.969 | 0.207 | 0.017 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f3d | 14.318 | 2.368 | n/a | 0.000 | 0.863 | 0.626 | 1.162 | 0.022 | n/a | 0.390 | 8.854 | n/a | n/a | 0.035 | 3.230 | 0.226 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ee5 | 14.270 | 3.268 | n/a | 0.000 | 0.408 | 0.666 | 1.132 | 0.014 | n/a | 0.069 | 8.678 | n/a | n/a | 0.035 | 3.676 | 0.258 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ee7 | 13.261 | 1.841 | n/a | 0.000 | 0.680 | 0.463 | 1.020 | 0.015 | n/a | 0.063 | 9.167 | n/a | n/a | 0.012 | 2.521 | 0.190 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ec1 | 13.136 | 2.421 | n/a | 0.000 | 0.203 | 0.666 | 0.769 | 0.013 | n/a | 0.057 | 8.973 | n/a | n/a | 0.034 | 2.624 | 0.200 | 0.034 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f2e | 12.926 | 2.692 | n/a | 0.000 | 0.115 | 1.150 | 2.097 | 0.040 | n/a | 0.699 | 6.110 | n/a | n/a | 0.024 | 2.807 | 0.217 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f49 | 12.836 | 2.924 | n/a | 1.641 | 0.396 | 0.538 | 0.812 | 0.012 | n/a | 0.276 | 6.200 | n/a | n/a | 0.037 | 4.960 | 0.386 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001eb3 | 12.582 | 2.244 | n/a | 0.000 | 0.942 | 0.738 | 1.505 | 0.024 | n/a | 0.102 | 7.003 | n/a | n/a | 0.024 | 3.186 | 0.253 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ed8 | 12.390 | 3.151 | n/a | 0.000 | 0.622 | 0.791 | 1.085 | 0.022 | n/a | 0.081 | 6.584 | n/a | n/a | 0.054 | 3.773 | 0.305 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ebf | 12.305 | 2.188 | n/a | 0.000 | 0.597 | 0.829 | 2.060 | 0.035 | n/a | 0.166 | 6.406 | n/a | n/a | 0.024 | 2.785 | 0.226 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f28 | 12.289 | 5.042 | n/a | 0.000 | 0.880 | 0.982 | 0.597 | 0.012 | n/a | 0.038 | 4.733 | n/a | n/a | 0.006 | 5.921 | 0.482 | 0.006 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ec3 | 12.175 | 2.542 | n/a | 0.000 | 1.003 | 0.570 | 1.270 | 0.022 | n/a | 0.328 | 6.382 | n/a | n/a | 0.060 | 3.545 | 0.291 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ec7 | 11.759 | 1.884 | n/a | 0.000 | 1.013 | 0.526 | 0.998 | 0.018 | n/a | 0.068 | 7.230 | n/a | n/a | 0.023 | 2.897 | 0.246 | 0.023 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms |
| 5337a2eda9ab2a6c0000000000001ed0 | 11.073 | 2.139 | n/a | 0.000 | 0.273 | 0.522 | 1.093 | 0.016 | n/a | 0.279 | 6.734 | n/a | n/a | 0.016 | 2.412 | 0.218 | 0.016 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (366 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.937 | 0.000 | 0.000 | 0.435 | 3.181 | n/a | 0.000 | 0.152 | 0.795 | 1.500 | 0.019 | n/a | 0.092 | 5.511 | n/a | n/a | 0.032 | 3.559 | 0.286 | 0.032 |
| p99 | 46.296 | 2.789 | 0.000 | 2.461 | 6.325 | n/a | 1.789 | 1.771 | 4.952 | 10.303 | 0.052 | n/a | 0.944 | 14.177 | n/a | n/a | 0.090 | 8.412 | 0.520 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c0000000000001fd6 | 66.906 | 3.273 | 0.204 | 0.000 | 0.017 | 0.837 | 2.888 | 0.017 | n/a | 0.303 | 59.350 | n/a | n/a | 0.017 | 3.494 | 0.052 | 0.017 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000002005 | 66.597 | 3.183 | 0.208 | 0.000 | 0.041 | 1.354 | 54.454 | 0.025 | n/a | 0.060 | 7.249 | n/a | n/a | 0.024 | 3.432 | 0.052 | 0.024 | gw-w/thread-47/gateway.admitted-work | none observed |
| 5337a2eda9ab2a6c000000000000209b | 50.976 | 3.484 | 0.291 | 0.000 | 0.088 | 0.871 | 4.787 | 0.042 | n/a | 0.121 | 41.238 | n/a | n/a | 0.054 | 3.863 | 0.076 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.353ms |
| 5337a2eda9ab2a6c0000000000002183 | 46.296 | 4.106 | 0.681 | 0.000 | 0.055 | 1.651 | 32.365 | 0.031 | n/a | 0.610 | 6.758 | n/a | n/a | 0.039 | 4.843 | 0.105 | 0.039 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.385ms |
| 5337a2eda9ab2a6c0000000000001f71 | 30.789 | 3.872 | 0.282 | 0.436 | 0.120 | 1.833 | 14.110 | 0.071 | n/a | 1.787 | 8.211 | n/a | n/a | 0.067 | 4.710 | 0.153 | 0.067 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000002065 | 30.177 | 7.289 | 0.678 | 0.000 | 0.159 | 4.172 | 3.986 | 0.018 | n/a | 0.291 | 13.533 | n/a | n/a | 0.051 | 8.126 | 0.269 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000205c | 28.484 | 4.053 | 0.179 | 0.000 | 0.044 | 5.103 | 8.632 | 0.018 | n/a | 0.219 | 10.212 | n/a | n/a | 0.025 | 4.276 | 0.150 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001fb4 | 26.592 | 4.502 | 0.262 | 0.000 | 0.098 | 3.989 | 8.087 | 0.017 | n/a | 0.802 | 8.745 | n/a | n/a | 0.089 | 4.862 | 0.183 | 0.089 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000206b | 26.374 | 4.306 | 0.197 | 0.000 | 0.041 | 1.738 | 5.753 | 0.035 | n/a | 0.097 | 14.177 | n/a | n/a | 0.029 | 4.544 | 0.172 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000021b0 | 25.300 | 3.406 | n/a | 0.000 | 9.571 | 0.923 | 0.855 | 0.013 | n/a | 0.060 | 10.413 | n/a | n/a | 0.059 | 12.977 | 0.513 | 0.059 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000002022 | 24.889 | 5.692 | n/a | 0.000 | 0.823 | 8.517 | 3.482 | 0.054 | n/a | 0.944 | 5.354 | n/a | n/a | 0.023 | 6.515 | 0.262 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 5337a2eda9ab2a6c0000000000002009 | 24.858 | 3.240 | 0.217 | 0.000 | 0.090 | 0.889 | 7.636 | 0.037 | n/a | 0.340 | 12.361 | n/a | n/a | 0.047 | 3.548 | 0.143 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001fd8 | 24.525 | 3.115 | 0.238 | 0.000 | 0.106 | 4.234 | 7.147 | 0.021 | n/a | 0.074 | 9.514 | n/a | n/a | 0.076 | 3.459 | 0.141 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000201e | 24.171 | 4.265 | 0.308 | 0.000 | 0.023 | 1.428 | 4.244 | 0.016 | n/a | 0.049 | 13.821 | n/a | n/a | 0.017 | 4.596 | 0.190 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000020a5 | 24.018 | 3.303 | 0.235 | 0.000 | 0.041 | 0.876 | 9.622 | 0.025 | n/a | 0.305 | 9.578 | n/a | n/a | 0.031 | 3.579 | 0.149 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.387ms |
| 5337a2eda9ab2a6c0000000000002085 | 23.304 | 3.021 | 0.183 | 0.000 | 0.039 | 0.927 | 6.066 | 0.017 | n/a | 0.055 | 12.968 | n/a | n/a | 0.028 | 3.243 | 0.139 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.051ms |
| 5337a2eda9ab2a6c0000000000001fce | 23.026 | 5.451 | 0.329 | 0.000 | 0.035 | 1.994 | 5.851 | 0.029 | n/a | 0.104 | 9.209 | n/a | n/a | 0.025 | 5.814 | 0.252 | 0.025 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000020f5 | 22.979 | 4.959 | 0.162 | 0.000 | 0.046 | 1.353 | 4.896 | 0.020 | n/a | 0.042 | 11.472 | n/a | n/a | 0.030 | 5.167 | 0.225 | 0.030 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.365ms |
| 5337a2eda9ab2a6c0000000000001fbe | 22.683 | 3.208 | 0.207 | 0.000 | 0.055 | 0.945 | 1.910 | 0.021 | n/a | 0.068 | 16.237 | n/a | n/a | 0.032 | 3.469 | 0.153 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001fed | 22.337 | 3.451 | 0.153 | 0.000 | 0.027 | 1.187 | 4.058 | 0.015 | n/a | 0.285 | 13.139 | n/a | n/a | 0.021 | 3.631 | 0.163 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.662 | 0.048 | 0.000 | 0.432 | 2.226 | n/a | 0.000 | 0.628 | 0.630 | 1.046 | 0.016 | n/a | 0.106 | 5.076 | n/a | n/a | 0.033 | 3.000 | 0.278 | 0.033 |
| p99 | 17.965 | 1.709 | 0.000 | 0.942 | 5.740 | n/a | 0.000 | 2.441 | 3.224 | 5.117 | 0.045 | n/a | 0.754 | 10.413 | n/a | n/a | 0.089 | 6.870 | 0.513 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5337a2eda9ab2a6c00000000000021b0 | 25.300 | 3.406 | n/a | 0.000 | 9.571 | 0.923 | 0.855 | 0.013 | n/a | 0.060 | 10.413 | n/a | n/a | 0.059 | 12.977 | 0.513 | 0.059 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000020a6 | 17.965 | 3.394 | n/a | 0.000 | 0.685 | 0.801 | 1.000 | 0.016 | n/a | 0.077 | 11.916 | n/a | n/a | 0.077 | 4.078 | 0.227 | 0.077 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001ff1 | 17.675 | 2.003 | n/a | 0.000 | 0.688 | 3.941 | 4.165 | 0.014 | n/a | 0.053 | 6.787 | n/a | n/a | 0.024 | 2.691 | 0.152 | 0.024 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000214f | 17.473 | 3.535 | n/a | 0.000 | 0.871 | 1.098 | 1.415 | 0.022 | n/a | 0.336 | 10.142 | n/a | n/a | 0.054 | 4.406 | 0.252 | 0.054 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f86 | 16.600 | 5.740 | n/a | 0.000 | 0.507 | 1.721 | 4.790 | 0.034 | n/a | 0.114 | 3.624 | n/a | n/a | 0.070 | 6.247 | 0.376 | 0.070 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000205a | 16.498 | 2.728 | n/a | 0.000 | 1.083 | 3.188 | 1.130 | 0.019 | n/a | 0.082 | 8.202 | n/a | n/a | 0.066 | 3.811 | 0.231 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000002224 | 16.138 | 4.380 | n/a | 0.000 | 0.286 | 1.162 | 1.511 | 0.022 | n/a | 0.320 | 8.369 | n/a | n/a | 0.088 | 4.665 | 0.289 | 0.088 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001fda | 15.995 | 5.847 | n/a | 0.000 | 1.023 | 1.168 | 4.425 | 0.031 | n/a | 0.443 | 2.990 | n/a | n/a | 0.068 | 6.870 | 0.430 | 0.068 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000021b5 | 15.563 | 2.968 | n/a | 0.000 | 0.200 | 1.255 | 6.477 | 0.036 | n/a | 0.115 | 4.473 | n/a | n/a | 0.041 | 3.167 | 0.204 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000021f9 | 15.244 | 4.566 | n/a | 0.000 | 0.261 | 0.966 | 1.037 | 0.021 | n/a | 0.323 | 7.982 | n/a | n/a | 0.089 | 4.827 | 0.317 | 0.089 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000201f | 14.949 | 1.887 | n/a | 0.000 | 0.602 | 0.781 | 5.117 | 0.021 | n/a | 0.059 | 6.445 | n/a | n/a | 0.037 | 2.489 | 0.166 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.582ms |
| 5337a2eda9ab2a6c0000000000001fcf | 14.834 | 1.764 | n/a | 0.000 | 0.186 | 0.615 | 4.845 | 0.022 | n/a | 0.052 | 7.322 | n/a | n/a | 0.026 | 1.950 | 0.131 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001f8a | 14.752 | 3.612 | n/a | 0.000 | 0.971 | 0.448 | 1.141 | 0.016 | n/a | 0.081 | 8.399 | n/a | n/a | 0.085 | 4.583 | 0.311 | 0.085 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000001faf | 14.448 | 2.894 | n/a | 0.000 | 0.647 | 0.569 | 0.933 | 0.011 | n/a | 0.094 | 9.245 | n/a | n/a | 0.054 | 3.542 | 0.245 | 0.054 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000002096 | 14.354 | 1.538 | n/a | 0.000 | 1.032 | 0.540 | 1.149 | 0.022 | n/a | 0.076 | 9.960 | n/a | n/a | 0.038 | 2.570 | 0.179 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c000000000000215b | 14.258 | 3.122 | n/a | 0.000 | 0.536 | 0.760 | 0.947 | 0.016 | n/a | 0.309 | 8.497 | n/a | n/a | 0.073 | 3.657 | 0.256 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000020cd | 14.216 | 1.930 | n/a | 0.000 | 0.512 | 0.593 | 0.938 | 0.014 | n/a | 0.061 | 10.127 | n/a | n/a | 0.041 | 2.443 | 0.172 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c0000000000002184 | 14.077 | 4.718 | n/a | 0.000 | 0.613 | 1.765 | 3.727 | 0.045 | n/a | 0.625 | 2.547 | n/a | n/a | 0.037 | 5.331 | 0.379 | 0.037 | node-14/thread-0/driver.execute | none observed |
| 5337a2eda9ab2a6c00000000000021fe | 14.053 | 2.090 | n/a | 0.000 | 1.027 | 0.708 | 1.913 | 0.031 | n/a | 0.136 | 8.122 | n/a | n/a | 0.027 | 3.116 | 0.222 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 5337a2eda9ab2a6c00000000000021e7 | 13.792 | 2.488 | n/a | 0.000 | 0.703 | 0.767 | 1.879 | 0.030 | n/a | 0.434 | 7.461 | n/a | n/a | 0.030 | 3.191 | 0.231 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.873 | n/a | n/a | n/a | 2.494 | n/a | 0.000 | 0.000 | 1.421 | 200.448 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.292 | 2.494 | 0.007 | 0.292 |
| p99 | 380.427 | n/a | n/a | n/a | 19.806 | n/a | 1.364 | 0.000 | 5.640 | 374.991 | 0.263 | n/a | 0.146 | 0.000 | n/a | n/a | 44.667 | 20.940 | 0.323 | 44.667 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a0000000000000002 | 380.427 | 2.494 | n/a | 0.000 | 0.000 | 2.238 | 374.991 | 0.263 | n/a | 0.146 | 0.000 | n/a | n/a | 0.295 | 2.494 | 0.007 | 0.295 | gw-r/thread-47/gateway.admitted-work | none observed |
| ccdf19d2be40a1e50000000000000005 | 202.788 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.720 | 0.022 | n/a | 0.140 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-45/journal/page | none observed |
| ccdf19d2be40a1e50000000000000006 | 202.239 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 200.880 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e5000000000000145a | 200.931 | 0.000 | n/a | 0.000 | 0.000 | 0.311 | 200.505 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e5000000000000145b | 200.873 | 0.000 | n/a | 0.000 | 0.000 | 0.330 | 200.448 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.059 | 0.000 | 0.000 | 0.059 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e5000000000000145f | 94.384 | 18.890 | n/a | 0.000 | 0.000 | 1.421 | 73.895 | 0.004 | n/a | 0.006 | 0.000 | n/a | n/a | 0.167 | 18.890 | 0.200 | 0.167 | gw-r/thread-49/gateway.admitted-work | none observed |
| ccdf19d2be40a1e5000000000000145e | 71.248 | 19.806 | n/a | 1.135 | 0.000 | 5.640 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.667 | 20.940 | 0.294 | 44.667 | node-14/thread-4/socket.wait-first-byte | none observed |
| ccdf19d2be40a1e50000000000001460 | 60.458 | 18.287 | n/a | 1.227 | 0.000 | 4.332 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.612 | 19.514 | 0.323 | 36.612 | node-14/thread-4/socket.wait-first-byte | none observed |
| ccdf19d2be40a1e50000000000001461 | 57.902 | 13.542 | n/a | 1.364 | 0.000 | 4.391 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.605 | 14.906 | 0.257 | 38.605 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 815.217 | n/a | n/a | n/a | 0.196 | n/a | 0.000 | 0.000 | 0.657 | 803.534 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.231 | 0.196 | 0.000 | 0.231 |
| p99 | 1008.109 | n/a | n/a | n/a | 10.744 | n/a | 0.000 | 0.000 | 1.487 | 1000.189 | 0.010 | n/a | 4.766 | 0.000 | n/a | n/a | 1.460 | 10.744 | 0.013 | 1.460 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a00000000000000a4 | 1008.109 | 0.196 | n/a | 0.000 | 0.000 | 1.487 | 1000.189 | 0.010 | n/a | 4.766 | 0.000 | n/a | n/a | 1.460 | 0.196 | 0.000 | 1.460 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a00000000000000a5 | 815.217 | 10.744 | n/a | 0.000 | 0.000 | 0.657 | 803.534 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.231 | 10.744 | 0.013 | 0.231 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 468.112 | n/a | n/a | n/a | 2.561 | n/a | 0.000 | 0.000 | 0.637 | 463.980 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.097 | 2.561 | 0.007 | 0.097 |
| p99 | 1004.575 | n/a | n/a | n/a | 6.789 | n/a | 0.000 | 0.000 | 4.924 | 1000.691 | 0.030 | n/a | 0.133 | 0.000 | n/a | n/a | 10.442 | 6.789 | 0.385 | 10.442 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a00000000000000bb | 1004.575 | 0.120 | n/a | 0.000 | 0.000 | 2.582 | 1000.691 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 1.100 | 0.120 | 0.000 | 1.100 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a00000000000000b4 | 1003.205 | 2.376 | n/a | 0.000 | 0.000 | 0.573 | 1000.069 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.084 | 2.376 | 0.002 | 0.084 | gw-r/thread-45/journal/page | none observed |
| cc8bc91992651a8a00000000000000ae | 1001.837 | 2.663 | n/a | 0.000 | 0.000 | 0.484 | 998.532 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.075 | 2.663 | 0.003 | 0.075 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a00000000000000ba | 991.019 | 2.561 | n/a | 0.000 | 0.000 | 1.201 | 987.053 | 0.019 | n/a | 0.102 | 0.000 | n/a | n/a | 0.083 | 2.561 | 0.003 | 0.083 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a00000000000000d0 | 982.949 | 2.577 | n/a | 0.000 | 0.000 | 4.924 | 975.308 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.072 | 2.577 | 0.003 | 0.072 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a00000000000000ab | 931.205 | 2.425 | n/a | 0.000 | 0.000 | 0.558 | 927.988 | 0.020 | n/a | 0.116 | 0.000 | n/a | n/a | 0.098 | 2.425 | 0.003 | 0.098 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a00000000000000a8 | 867.221 | 1.971 | n/a | 0.000 | 0.000 | 0.969 | 864.108 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.097 | 1.971 | 0.002 | 0.097 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a00000000000000c2 | 853.407 | 5.642 | n/a | 0.000 | 0.000 | 0.523 | 847.058 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.098 | 5.642 | 0.007 | 0.098 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a00000000000000cb | 722.898 | 3.933 | n/a | 0.000 | 0.000 | 0.394 | 718.315 | 0.030 | n/a | 0.105 | 0.000 | n/a | n/a | 0.121 | 3.933 | 0.005 | 0.121 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a00000000000000b2 | 586.542 | 2.840 | n/a | 0.000 | 0.000 | 0.893 | 582.594 | 0.011 | n/a | 0.133 | 0.000 | n/a | n/a | 0.071 | 2.840 | 0.005 | 0.071 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a00000000000000c9 | 545.773 | 2.451 | n/a | 0.000 | 0.000 | 0.495 | 542.684 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.081 | 2.451 | 0.004 | 0.081 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a00000000000000c5 | 507.082 | 1.804 | n/a | 0.000 | 0.000 | 0.656 | 504.468 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.071 | 1.804 | 0.004 | 0.071 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a00000000000000c7 | 490.241 | 2.354 | n/a | 0.000 | 0.000 | 0.534 | 487.196 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.067 | 2.354 | 0.005 | 0.067 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a00000000000000c1 | 489.563 | 2.321 | n/a | 0.000 | 0.000 | 0.631 | 486.432 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.081 | 2.321 | 0.005 | 0.081 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a00000000000000c8 | 468.112 | 3.453 | n/a | 0.000 | 0.000 | 0.452 | 463.980 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.169 | 3.453 | 0.007 | 0.169 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a00000000000000b7 | 447.500 | 2.523 | n/a | 0.000 | 0.000 | 0.697 | 444.129 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.073 | 2.523 | 0.006 | 0.073 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a00000000000000a7 | 327.717 | 3.142 | n/a | 0.000 | 0.000 | 4.525 | 319.804 | 0.011 | n/a | 0.126 | 0.000 | n/a | n/a | 0.109 | 3.142 | 0.010 | 0.109 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a00000000000000b1 | 314.078 | 4.086 | n/a | 0.000 | 0.000 | 0.479 | 309.312 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.115 | 4.086 | 0.013 | 0.115 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a00000000000000b5 | 301.666 | 6.789 | n/a | 0.000 | 0.000 | 0.647 | 294.072 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.083 | 6.789 | 0.023 | 0.083 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a00000000000000bf | 285.663 | 2.745 | n/a | 0.000 | 0.000 | 0.543 | 282.198 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.133 | 2.745 | 0.010 | 0.133 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 395.275 | n/a | n/a | n/a | 3.262 | n/a | 0.000 | 0.000 | 0.602 | 382.066 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.091 | 3.560 | 0.010 | 0.091 |
| p99 | 1006.065 | n/a | n/a | n/a | 17.063 | n/a | 4.854 | 0.000 | 7.058 | 1004.364 | 0.654 | n/a | 0.134 | 0.000 | n/a | n/a | 51.677 | 20.756 | 0.693 | 51.677 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a000000000000011f | 1006.065 | 2.981 | n/a | 0.000 | 0.000 | 2.140 | 1000.827 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.068 | 2.981 | 0.003 | 0.068 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a000000000000013a | 1006.038 | 0.095 | n/a | 0.000 | 0.000 | 0.401 | 1004.364 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.130 | 0.095 | 0.000 | 1.130 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000000128 | 1005.837 | 2.764 | n/a | 0.000 | 0.000 | 0.487 | 1002.472 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.064 | 2.764 | 0.003 | 0.064 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a00000000000000d1 | 1004.990 | 7.099 | n/a | 0.747 | 0.000 | 0.632 | 996.332 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.117 | 7.846 | 0.008 | 0.117 | gw-r/thread-45/journal/page | none observed |
| cc8bc91992651a8a00000000000000ff | 1004.370 | 0.140 | n/a | 0.000 | 0.000 | 1.872 | 1001.110 | 0.022 | n/a | 0.121 | 0.000 | n/a | n/a | 1.105 | 0.140 | 0.000 | 1.105 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a00000000000000d2 | 1003.601 | 3.891 | n/a | 0.000 | 0.000 | 0.445 | 998.625 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.564 | 3.891 | 0.004 | 0.564 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a00000000000000da | 1003.142 | 0.120 | n/a | 0.000 | 0.000 | 0.729 | 1001.017 | 0.034 | n/a | 0.134 | 0.000 | n/a | n/a | 1.108 | 0.120 | 0.000 | 1.108 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a00000000000000d8 | 1002.882 | 0.105 | n/a | 0.000 | 0.000 | 0.656 | 1000.908 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 1.094 | 0.105 | 0.000 | 1.094 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000000116 | 1002.772 | 0.148 | n/a | 0.000 | 0.000 | 0.588 | 1000.885 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 1.098 | 0.148 | 0.000 | 1.098 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a00000000000000e0 | 1002.565 | 0.115 | n/a | 0.000 | 0.000 | 0.421 | 1000.833 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 1.098 | 0.115 | 0.000 | 1.098 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a000000000000012c | 1001.789 | 0.103 | n/a | 0.000 | 0.000 | 0.488 | 1001.054 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.050 | 0.103 | 0.000 | 0.050 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a000000000000012e | 996.974 | 2.327 | n/a | 0.000 | 0.000 | 0.498 | 994.020 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.064 | 2.327 | 0.002 | 0.064 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a000000000000010f | 992.988 | 5.759 | n/a | 0.000 | 0.000 | 0.481 | 986.492 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.185 | 5.759 | 0.006 | 0.185 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000000157 | 992.137 | 5.023 | n/a | 0.000 | 0.000 | 0.773 | 986.097 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.200 | 5.023 | 0.005 | 0.200 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000000107 | 987.278 | 2.928 | n/a | 0.000 | 0.000 | 0.519 | 983.681 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.062 | 2.928 | 0.003 | 0.062 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000000103 | 947.268 | 5.755 | n/a | 0.698 | 0.000 | 0.652 | 939.951 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.156 | 6.452 | 0.007 | 0.156 | gw-r/thread-45/journal/page | none observed |
| cc8bc91992651a8a00000000000000df | 938.299 | 3.358 | n/a | 0.468 | 0.000 | 0.481 | 933.837 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.103 | 3.827 | 0.004 | 0.103 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000000113 | 915.115 | 2.735 | n/a | 0.000 | 0.000 | 0.432 | 911.814 | 0.021 | n/a | 0.056 | 0.000 | n/a | n/a | 0.057 | 2.735 | 0.003 | 0.057 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000000144 | 892.382 | 2.262 | n/a | 0.000 | 0.000 | 3.397 | 886.504 | 0.043 | n/a | 0.085 | 0.000 | n/a | n/a | 0.091 | 2.262 | 0.003 | 0.091 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000000104 | 856.915 | 2.515 | n/a | 0.000 | 0.000 | 1.363 | 852.907 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.075 | 2.515 | 0.003 | 0.075 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 355.365 | n/a | n/a | n/a | 2.632 | n/a | 0.000 | 0.000 | 0.527 | 353.260 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.068 | 2.680 | 0.009 | 0.068 |
| p99 | 1003.400 | n/a | n/a | n/a | 8.272 | n/a | 0.832 | 0.000 | 3.461 | 1000.722 | 0.043 | n/a | 0.075 | 0.000 | n/a | n/a | 30.770 | 9.062 | 0.154 | 30.770 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a0000000000000188 | 1004.941 | 3.755 | n/a | 0.000 | 0.000 | 1.185 | 999.891 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.068 | 3.755 | 0.004 | 0.068 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a00000000000001a7 | 1003.400 | 0.137 | n/a | 0.000 | 0.000 | 0.622 | 1001.422 | 0.043 | n/a | 0.067 | 0.000 | n/a | n/a | 1.109 | 0.137 | 0.000 | 1.109 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a0000000000000167 | 1003.026 | 0.105 | n/a | 0.000 | 0.000 | 1.122 | 1000.650 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 1.096 | 0.105 | 0.000 | 1.096 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a00000000000001eb | 1002.755 | 0.141 | n/a | 0.000 | 0.000 | 0.736 | 1000.722 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 1.106 | 0.141 | 0.000 | 1.106 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a000000000000018c | 1001.654 | 2.321 | n/a | 0.640 | 0.000 | 0.731 | 997.841 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.088 | 2.960 | 0.003 | 0.088 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a000000000000019b | 1001.512 | 2.680 | n/a | 0.000 | 0.000 | 0.325 | 998.417 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.061 | 2.680 | 0.003 | 0.061 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a00000000000001c6 | 1001.259 | 2.258 | n/a | 0.000 | 0.000 | 0.436 | 998.462 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.066 | 2.258 | 0.002 | 0.066 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000000181 | 1000.704 | 2.415 | n/a | 0.000 | 0.000 | 0.671 | 997.527 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.064 | 2.415 | 0.002 | 0.064 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a00000000000001a9 | 988.975 | 5.630 | n/a | 0.000 | 0.000 | 0.833 | 982.354 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.106 | 5.630 | 0.006 | 0.106 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000000187 | 988.034 | 2.930 | n/a | 0.000 | 0.000 | 0.884 | 984.085 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.063 | 2.930 | 0.003 | 0.063 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a0000000000000171 | 985.212 | 2.372 | n/a | 0.000 | 0.000 | 3.452 | 979.286 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.060 | 2.372 | 0.002 | 0.060 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a00000000000001c5 | 972.024 | 2.285 | n/a | 0.000 | 0.000 | 0.599 | 969.004 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.064 | 2.285 | 0.002 | 0.064 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000000176 | 896.350 | 2.353 | n/a | 0.000 | 0.000 | 0.313 | 893.471 | 0.004 | n/a | 0.150 | 0.000 | n/a | n/a | 0.060 | 2.353 | 0.003 | 0.060 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a00000000000001a6 | 861.829 | 3.366 | n/a | 0.000 | 0.000 | 0.337 | 858.012 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.064 | 3.366 | 0.004 | 0.064 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a000000000000019e | 840.487 | 8.222 | n/a | 0.000 | 0.000 | 0.668 | 831.405 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.153 | 8.222 | 0.010 | 0.153 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a00000000000001d6 | 824.337 | 1.627 | n/a | 0.000 | 0.000 | 0.417 | 822.187 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.066 | 1.627 | 0.002 | 0.066 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a00000000000001f2 | 789.904 | 1.671 | n/a | 0.000 | 0.000 | 1.718 | 786.397 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.049 | 1.671 | 0.002 | 0.049 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a00000000000001de | 787.334 | 3.453 | n/a | 0.000 | 0.000 | 0.685 | 783.094 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.064 | 3.453 | 0.004 | 0.064 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a00000000000001f9 | 772.131 | 5.949 | n/a | 0.000 | 0.000 | 0.469 | 765.524 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.154 | 5.949 | 0.008 | 0.154 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a00000000000001c3 | 742.114 | 3.737 | n/a | 0.000 | 0.000 | 0.527 | 737.757 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.059 | 3.737 | 0.005 | 0.059 | gw-r/thread-65/journal/page | none observed |

## P3 / L16 / internal (1531 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.524 | n/a | n/a | n/a | 3.169 | n/a | 0.000 | 0.000 | 0.216 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.589 | 3.169 | 0.255 | 7.589 |
| p99 | 245.662 | n/a | n/a | n/a | 12.258 | n/a | 1.065 | 0.000 | 1.089 | 237.106 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 46.664 | 12.984 | 0.828 | 46.664 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a0000000000000213 | 1003.213 | 0.144 | n/a | 0.000 | 0.000 | 0.411 | 1001.482 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 1.103 | 0.144 | 0.000 | 1.103 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000000226 | 1002.486 | 0.118 | n/a | 0.000 | 0.000 | 0.560 | 1000.659 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 1.104 | 0.118 | 0.000 | 1.104 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000000218 | 1002.390 | 0.099 | n/a | 0.000 | 0.000 | 0.451 | 1000.690 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 1.094 | 0.099 | 0.000 | 1.094 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000000212 | 1000.358 | 2.345 | n/a | 0.000 | 0.000 | 1.235 | 996.643 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.056 | 2.345 | 0.002 | 0.056 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a0000000000000200 | 999.984 | 2.335 | n/a | 0.000 | 0.000 | 0.493 | 997.059 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.062 | 2.335 | 0.002 | 0.062 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a000000000000021a | 990.978 | 2.199 | n/a | 0.000 | 0.000 | 0.356 | 988.317 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.068 | 2.199 | 0.002 | 0.068 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a000000000000021b | 924.140 | 1.632 | n/a | 0.000 | 0.000 | 0.429 | 921.980 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.065 | 1.632 | 0.002 | 0.065 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000000228 | 912.662 | 2.802 | n/a | 0.000 | 0.000 | 0.719 | 909.037 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.066 | 2.802 | 0.003 | 0.066 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000000216 | 909.598 | 3.219 | n/a | 0.000 | 0.000 | 0.392 | 905.901 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.063 | 3.219 | 0.004 | 0.063 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000000201 | 866.232 | 2.220 | n/a | 0.000 | 0.000 | 0.462 | 863.451 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 2.220 | 0.003 | 0.063 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000000209 | 853.766 | 2.262 | n/a | 0.000 | 0.000 | 0.338 | 851.079 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.057 | 2.262 | 0.003 | 0.057 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000000204 | 807.853 | 5.112 | n/a | 0.000 | 0.000 | 3.187 | 799.375 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.120 | 5.112 | 0.006 | 0.120 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000000222 | 792.809 | 3.755 | n/a | 0.000 | 0.000 | 0.482 | 788.448 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.077 | 3.755 | 0.005 | 0.077 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a000000000000021e | 788.691 | 1.979 | n/a | 0.000 | 0.000 | 0.304 | 786.232 | 0.015 | n/a | 0.091 | 0.000 | n/a | n/a | 0.070 | 1.979 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000000211 | 422.400 | 2.544 | n/a | 0.000 | 0.000 | 0.443 | 419.291 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.064 | 2.544 | 0.006 | 0.064 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000000206 | 245.662 | 2.359 | n/a | 0.000 | 0.000 | 6.065 | 237.106 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.061 | 2.359 | 0.010 | 0.061 | gw-r/thread-44/journal/page | none observed |
| cc8bc91992651a8a000000000000020f | 232.274 | 5.206 | n/a | 0.000 | 0.000 | 0.886 | 225.982 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.123 | 5.206 | 0.022 | 0.123 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000000220 | 220.796 | 2.218 | n/a | 0.000 | 0.000 | 0.626 | 217.815 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.061 | 2.218 | 0.010 | 0.061 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a000000000000020a | 200.869 | 2.309 | n/a | 0.000 | 0.000 | 0.444 | 198.021 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.066 | 2.309 | 0.011 | 0.066 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000000224 | 186.391 | 4.467 | n/a | 0.000 | 0.000 | 0.746 | 181.016 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.100 | 4.467 | 0.024 | 0.100 | gw-r/thread-42/journal/page | none observed |

## P3 / L64 / internal (1560 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.183 | n/a | n/a | n/a | 3.914 | n/a | 0.000 | 0.000 | 0.201 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.335 | 3.938 | 0.336 | 6.335 |
| p99 | 377.489 | n/a | n/a | n/a | 15.430 | n/a | 1.352 | 0.000 | 1.436 | 375.441 | 0.011 | n/a | 0.035 | 0.000 | n/a | n/a | 47.001 | 16.706 | 0.846 | 47.001 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a0000000000001ab7 | 1002.204 | 0.110 | n/a | 0.000 | 0.000 | 0.449 | 1000.508 | 0.011 | n/a | 0.034 | 0.000 | n/a | n/a | 1.093 | 0.110 | 0.000 | 1.093 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001abc | 995.125 | 4.860 | n/a | 0.000 | 0.000 | 0.478 | 989.662 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.096 | 4.860 | 0.005 | 0.096 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001ac0 | 967.277 | 4.197 | n/a | 0.000 | 0.000 | 0.338 | 962.651 | 0.002 | n/a | 0.021 | 0.000 | n/a | n/a | 0.068 | 4.197 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001ada | 942.212 | 3.933 | n/a | 0.000 | 0.000 | 0.399 | 937.791 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.059 | 3.933 | 0.004 | 0.059 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001aca | 934.508 | 2.462 | n/a | 0.000 | 0.000 | 0.418 | 931.538 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.054 | 2.462 | 0.003 | 0.054 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000001ab9 | 928.134 | 8.302 | n/a | 1.155 | 0.000 | 0.403 | 917.772 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.474 | 9.457 | 0.010 | 0.474 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001ab5 | 884.789 | 4.569 | n/a | 0.000 | 0.000 | 0.426 | 879.668 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.094 | 4.569 | 0.005 | 0.094 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001adc | 719.072 | 2.616 | n/a | 0.000 | 0.000 | 2.402 | 713.922 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.066 | 2.616 | 0.004 | 0.066 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001ac2 | 664.657 | 2.480 | n/a | 0.000 | 0.000 | 0.332 | 661.748 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.069 | 2.480 | 0.004 | 0.069 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001ad6 | 655.653 | 4.487 | n/a | 0.000 | 0.000 | 0.544 | 650.501 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.098 | 4.487 | 0.007 | 0.098 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000001ade | 641.891 | 9.393 | n/a | 0.000 | 0.000 | 0.938 | 631.260 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.250 | 9.393 | 0.015 | 0.250 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001ad2 | 552.222 | 2.879 | n/a | 0.000 | 0.000 | 0.968 | 548.271 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.070 | 2.879 | 0.005 | 0.070 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001aec | 541.620 | 2.684 | n/a | 0.000 | 0.000 | 0.283 | 538.573 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.057 | 2.684 | 0.005 | 0.057 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001af1 | 509.799 | 3.135 | n/a | 0.000 | 0.000 | 0.489 | 506.082 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.056 | 3.135 | 0.006 | 0.056 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001af5 | 452.109 | 2.503 | n/a | 0.000 | 0.000 | 0.388 | 449.138 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.054 | 2.503 | 0.006 | 0.054 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001aeb | 377.489 | 2.496 | n/a | 0.000 | 0.000 | 0.442 | 374.452 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.048 | 2.496 | 0.007 | 0.048 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000001acf | 377.245 | 1.429 | n/a | 0.000 | 0.000 | 0.283 | 375.441 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.048 | 1.429 | 0.004 | 0.048 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001aed | 343.407 | 1.969 | n/a | 0.000 | 0.000 | 0.422 | 340.902 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.061 | 1.969 | 0.006 | 0.061 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001ae8 | 304.541 | 3.038 | n/a | 0.000 | 0.000 | 0.583 | 300.797 | 0.009 | n/a | 0.032 | 0.000 | n/a | n/a | 0.082 | 3.038 | 0.010 | 0.082 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000001ae0 | 293.495 | 2.228 | n/a | 0.000 | 0.000 | 1.557 | 289.596 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.075 | 2.228 | 0.008 | 0.075 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 337.402 | n/a | n/a | n/a | 3.130 | n/a | 0.000 | 0.000 | 0.500 | 329.121 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.084 | 3.179 | 0.011 | 0.084 |
| p99 | 1003.108 | n/a | n/a | n/a | 9.472 | n/a | 3.506 | 0.000 | 4.151 | 1000.822 | 2.111 | n/a | 0.047 | 0.000 | n/a | n/a | 49.153 | 10.397 | 0.718 | 49.153 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a0000000000001b4a | 1003.108 | 3.151 | n/a | 0.000 | 0.000 | 0.432 | 999.428 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.065 | 3.151 | 0.003 | 0.065 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001b4f | 1002.831 | 0.171 | n/a | 0.000 | 0.000 | 0.658 | 1000.822 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.141 | 0.171 | 0.000 | 1.141 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000001b7e | 1002.760 | 2.728 | n/a | 0.000 | 0.000 | 0.350 | 999.583 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.070 | 2.728 | 0.003 | 0.070 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001b3b | 1002.431 | 0.105 | n/a | 0.000 | 0.000 | 0.423 | 1000.744 | 0.026 | n/a | 0.043 | 0.000 | n/a | n/a | 1.090 | 0.105 | 0.000 | 1.090 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001b58 | 1002.068 | 0.234 | n/a | 0.000 | 0.000 | 0.363 | 1000.319 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 1.130 | 0.234 | 0.000 | 1.130 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001b40 | 1001.990 | 0.090 | n/a | 0.000 | 0.000 | 0.375 | 1000.409 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 1.080 | 0.090 | 0.000 | 1.080 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000001b79 | 1001.086 | 4.909 | n/a | 0.000 | 0.000 | 0.500 | 995.528 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.122 | 4.909 | 0.005 | 0.122 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001b4b | 999.872 | 3.044 | n/a | 0.000 | 0.000 | 0.339 | 996.331 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.115 | 3.044 | 0.003 | 0.115 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000001b6b | 999.634 | 2.910 | n/a | 0.000 | 0.000 | 0.364 | 996.255 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.078 | 2.910 | 0.003 | 0.078 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001aff | 998.913 | 2.469 | n/a | 0.000 | 0.000 | 0.315 | 996.012 | 0.012 | n/a | 0.039 | 0.000 | n/a | n/a | 0.065 | 2.469 | 0.002 | 0.065 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001b51 | 994.637 | 3.259 | n/a | 0.000 | 0.000 | 0.519 | 990.741 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.062 | 3.259 | 0.003 | 0.062 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001b7b | 983.464 | 7.780 | n/a | 0.000 | 0.000 | 0.599 | 974.948 | 0.013 | n/a | 0.035 | 0.000 | n/a | n/a | 0.089 | 7.780 | 0.008 | 0.089 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001b0e | 963.750 | 2.470 | n/a | 0.000 | 0.000 | 0.404 | 960.775 | 0.012 | n/a | 0.035 | 0.000 | n/a | n/a | 0.053 | 2.470 | 0.003 | 0.053 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000001b7d | 959.838 | 3.130 | n/a | 0.000 | 0.000 | 0.562 | 956.053 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.064 | 3.130 | 0.003 | 0.064 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000001b63 | 939.676 | 4.074 | n/a | 0.000 | 0.000 | 0.328 | 935.110 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.136 | 4.074 | 0.004 | 0.136 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001b68 | 927.594 | 2.079 | n/a | 0.000 | 0.000 | 0.508 | 924.904 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.077 | 2.079 | 0.002 | 0.077 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001b55 | 907.069 | 2.476 | n/a | 0.701 | 0.000 | 0.427 | 903.363 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.081 | 3.177 | 0.004 | 0.081 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001afa | 892.103 | 2.111 | n/a | 0.000 | 0.000 | 0.325 | 889.601 | 0.002 | n/a | 0.011 | 0.000 | n/a | n/a | 0.053 | 2.111 | 0.002 | 0.053 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000001b4c | 885.954 | 1.785 | n/a | 0.000 | 0.000 | 0.496 | 883.581 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.066 | 1.785 | 0.002 | 0.066 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001b76 | 885.242 | 3.236 | n/a | 0.753 | 0.000 | 0.495 | 880.645 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.083 | 3.989 | 0.005 | 0.083 | gw-r/thread-68/journal/page | none observed |

## P3 / L1024 / internal (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 347.676 | n/a | n/a | n/a | 3.181 | n/a | 0.000 | 0.000 | 0.490 | 344.909 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.106 | 3.235 | 0.011 | 0.106 |
| p99 | 1002.206 | n/a | n/a | n/a | 9.436 | n/a | 1.104 | 0.000 | 2.888 | 1000.489 | 0.058 | n/a | 0.053 | 0.000 | n/a | n/a | 37.742 | 9.488 | 0.809 | 37.742 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a0000000000001bdf | 1002.475 | 0.118 | n/a | 0.000 | 0.000 | 0.650 | 1000.568 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 1.096 | 0.118 | 0.000 | 1.096 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000001bf0 | 1002.206 | 0.107 | n/a | 0.000 | 0.000 | 0.454 | 1000.489 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 1.111 | 0.107 | 0.000 | 1.111 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001c0d | 1002.141 | 0.131 | n/a | 0.000 | 0.000 | 0.541 | 1000.353 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 1.089 | 0.131 | 0.000 | 1.089 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001bd7 | 1002.016 | 0.101 | n/a | 0.000 | 0.000 | 0.365 | 1000.430 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 1.085 | 0.101 | 0.000 | 1.085 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000001be9 | 1002.015 | 0.105 | n/a | 0.000 | 0.000 | 0.339 | 1000.436 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.096 | 0.105 | 0.000 | 1.096 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000001bba | 1001.319 | 2.409 | n/a | 0.000 | 0.000 | 1.541 | 997.275 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.062 | 2.409 | 0.002 | 0.062 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001be8 | 1001.271 | 3.293 | n/a | 0.000 | 0.000 | 0.490 | 997.378 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.071 | 3.293 | 0.003 | 0.071 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001bf2 | 996.813 | 2.263 | n/a | 0.000 | 0.000 | 0.321 | 994.140 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.066 | 2.263 | 0.002 | 0.066 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001c20 | 994.497 | 4.912 | n/a | 0.506 | 0.000 | 0.637 | 988.272 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.146 | 5.418 | 0.005 | 0.146 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001c07 | 993.154 | 4.606 | n/a | 0.000 | 0.000 | 0.384 | 988.028 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.109 | 4.606 | 0.005 | 0.109 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001c03 | 988.304 | 3.181 | n/a | 0.000 | 0.000 | 0.710 | 984.313 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.072 | 3.181 | 0.003 | 0.072 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001be1 | 975.928 | 4.415 | n/a | 0.000 | 0.000 | 0.778 | 970.604 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.082 | 4.415 | 0.005 | 0.082 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001bdc | 956.778 | 8.724 | n/a | 0.000 | 0.000 | 0.462 | 947.252 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.281 | 8.724 | 0.009 | 0.281 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001bb7 | 942.172 | 3.657 | n/a | 0.000 | 0.000 | 0.385 | 938.020 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.070 | 3.657 | 0.004 | 0.070 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001c13 | 934.786 | 5.348 | n/a | 1.104 | 0.000 | 0.714 | 927.383 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.197 | 6.453 | 0.007 | 0.197 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001bf7 | 929.617 | 2.604 | n/a | 0.000 | 0.000 | 0.652 | 926.243 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.077 | 2.604 | 0.003 | 0.077 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001c1e | 861.929 | 4.660 | n/a | 0.616 | 0.000 | 0.429 | 856.034 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.147 | 5.275 | 0.006 | 0.147 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001bb4 | 835.049 | 3.649 | n/a | 0.000 | 0.000 | 2.888 | 828.384 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.082 | 3.649 | 0.004 | 0.082 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001b8b | 826.087 | 2.250 | n/a | 0.000 | 0.000 | 2.042 | 821.702 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.071 | 2.250 | 0.003 | 0.071 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001be7 | 814.663 | 3.914 | n/a | 0.000 | 0.000 | 0.614 | 810.013 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.095 | 3.914 | 0.005 | 0.095 | gw-r/thread-68/journal/page | none observed |

## P3 / tail / internal (368 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 342.706 | n/a | n/a | n/a | 2.997 | n/a | 0.000 | 0.000 | 0.432 | 333.087 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.092 | 3.037 | 0.011 | 0.092 |
| p99 | 1003.994 | n/a | n/a | n/a | 14.149 | n/a | 1.146 | 0.000 | 3.264 | 1000.656 | 0.175 | n/a | 0.066 | 0.000 | n/a | n/a | 45.159 | 14.955 | 0.734 | 45.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc8bc91992651a8a0000000000001e4d | 1005.631 | 5.948 | n/a | 0.000 | 0.000 | 0.391 | 999.154 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 0.104 | 5.948 | 0.006 | 0.104 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001e1e | 1004.736 | 2.873 | n/a | 0.000 | 0.000 | 0.756 | 1001.003 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.062 | 2.873 | 0.003 | 0.062 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001c4f | 1004.231 | 4.541 | n/a | 0.000 | 0.000 | 0.495 | 999.051 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.120 | 4.541 | 0.005 | 0.120 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001cce | 1003.994 | 2.560 | n/a | 0.000 | 0.000 | 0.361 | 1000.989 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.060 | 2.560 | 0.003 | 0.060 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001e3d | 1003.837 | 0.085 | n/a | 0.000 | 0.000 | 2.094 | 1000.520 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.102 | 0.085 | 0.000 | 1.102 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001de3 | 1003.764 | 3.730 | n/a | 0.000 | 0.000 | 0.832 | 999.102 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.071 | 3.730 | 0.004 | 0.071 | gw-r/thread-68/journal/page | none observed |
| cc8bc91992651a8a0000000000001ca8 | 1003.242 | 0.106 | n/a | 0.000 | 0.000 | 1.329 | 1000.638 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 1.116 | 0.106 | 0.000 | 1.116 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001d81 | 1003.241 | 0.120 | n/a | 0.000 | 0.000 | 1.221 | 1000.732 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 1.116 | 0.120 | 0.000 | 1.116 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001c64 | 1003.106 | 2.579 | n/a | 0.000 | 0.000 | 0.468 | 999.958 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.074 | 2.579 | 0.003 | 0.074 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001c45 | 1003.068 | 2.559 | n/a | 1.133 | 0.000 | 0.562 | 998.695 | 0.010 | n/a | 0.031 | 0.000 | n/a | n/a | 0.079 | 3.692 | 0.004 | 0.079 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001d39 | 1002.948 | 2.204 | n/a | 0.000 | 0.000 | 0.336 | 1000.291 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.072 | 2.204 | 0.002 | 0.072 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001e25 | 1002.500 | 0.137 | n/a | 0.000 | 0.000 | 0.708 | 1000.479 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.137 | 0.137 | 0.000 | 1.137 | gw-r/thread-48/journal/page | none observed |
| cc8bc91992651a8a0000000000001cf6 | 1002.149 | 0.121 | n/a | 0.000 | 0.000 | 0.453 | 1000.442 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.094 | 0.121 | 0.000 | 1.094 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000001ce5 | 1002.148 | 0.084 | n/a | 0.000 | 0.000 | 0.290 | 1000.600 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 1.124 | 0.084 | 0.000 | 1.124 | gw-r/thread-42/journal/page | none observed |
| cc8bc91992651a8a0000000000001d9b | 1002.142 | 0.083 | n/a | 0.000 | 0.000 | 0.259 | 1000.656 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 1.090 | 0.083 | 0.000 | 1.090 | gw-r/thread-47/journal/page | none observed |
| cc8bc91992651a8a0000000000001c70 | 1002.102 | 0.115 | n/a | 0.000 | 0.000 | 0.455 | 1000.412 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 1.085 | 0.115 | 0.000 | 1.085 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000001cab | 1002.089 | 0.145 | n/a | 0.000 | 0.000 | 0.404 | 1000.394 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 1.113 | 0.145 | 0.000 | 1.113 | gw-r/thread-46/journal/page | none observed |
| cc8bc91992651a8a0000000000001e4f | 1002.088 | 0.115 | n/a | 0.000 | 0.000 | 0.491 | 1000.369 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 1.095 | 0.115 | 0.000 | 1.095 | gw-r/thread-49/journal/page | none observed |
| cc8bc91992651a8a0000000000001c24 | 1002.026 | 0.109 | n/a | 0.000 | 0.000 | 0.344 | 1000.396 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 1.140 | 0.109 | 0.000 | 1.140 | gw-r/thread-65/journal/page | none observed |
| cc8bc91992651a8a0000000000001d63 | 1001.985 | 0.090 | n/a | 0.000 | 0.000 | 0.327 | 1000.447 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 1.086 | 0.090 | 0.000 | 1.086 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.063 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 200.945 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 |
| p99 | 206.404 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.258 | 204.624 | 2.246 | n/a | 3.088 | 0.000 | n/a | n/a | 49.543 | 0.000 | 0.000 | 49.543 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccdf19d2be40a1e50000000000000009 | 206.404 | 0.000 | n/a | 0.000 | 0.000 | 1.718 | 203.940 | 0.014 | n/a | 0.156 | 0.000 | n/a | n/a | 0.575 | 0.000 | 0.000 | 0.575 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000031 | 205.689 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 204.424 | 0.019 | n/a | 0.174 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e50000000000000024 | 205.637 | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 204.624 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e5000000000000001b | 205.360 | 0.000 | n/a | 0.000 | 0.000 | 4.258 | 200.927 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e5000000000000002a | 204.986 | 0.000 | n/a | 0.000 | 0.000 | 0.618 | 201.152 | 0.033 | n/a | 3.088 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e5000000000000004f | 204.500 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 203.489 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e5000000000000000f | 204.290 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 203.291 | 0.052 | n/a | 0.172 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000000048 | 204.244 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 200.933 | 2.246 | n/a | 0.089 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-45/journal/page | none observed |
| ccdf19d2be40a1e5000000000000002f | 203.648 | 0.000 | n/a | 0.000 | 0.000 | 1.737 | 201.604 | 0.025 | n/a | 0.183 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000041 | 203.546 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 202.588 | 0.009 | n/a | 0.034 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000034 | 203.427 | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 202.579 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-45/journal/page | none observed |
| ccdf19d2be40a1e50000000000000042 | 203.335 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 202.400 | 0.094 | n/a | 0.161 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000000059 | 203.302 | 0.000 | n/a | 0.000 | 0.000 | 1.512 | 201.389 | 0.016 | n/a | 0.168 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000036 | 203.245 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 202.322 | 0.020 | n/a | 0.208 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e5000000000000003b | 203.113 | 0.000 | n/a | 0.000 | 0.000 | 2.187 | 200.705 | 0.013 | n/a | 0.093 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| ccdf19d2be40a1e50000000000000018 | 202.904 | 0.000 | n/a | 0.000 | 0.000 | 0.294 | 202.307 | 0.022 | n/a | 0.193 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-45/journal/page | none observed |
| ccdf19d2be40a1e5000000000000002b | 202.892 | 0.000 | n/a | 0.000 | 0.000 | 1.283 | 201.321 | 0.013 | n/a | 0.182 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e50000000000000008 | 202.878 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.589 | 0.017 | n/a | 0.173 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000055 | 202.876 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 202.073 | 0.014 | n/a | 0.112 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000032 | 202.871 | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 201.411 | 0.026 | n/a | 0.850 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.819 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 200.828 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 206.336 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.572 | 204.895 | 5.491 | n/a | 0.361 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccdf19d2be40a1e50000000000000096 | 209.020 | 0.000 | n/a | 0.000 | 0.000 | 3.672 | 204.941 | 0.100 | n/a | 0.183 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000120 | 206.635 | 0.000 | n/a | 0.000 | 0.000 | 5.159 | 201.110 | 0.020 | n/a | 0.158 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000116 | 206.336 | 0.000 | n/a | 0.000 | 0.000 | 4.454 | 201.627 | 0.012 | n/a | 0.138 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000133 | 206.230 | 0.000 | n/a | 0.000 | 0.000 | 4.548 | 201.392 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e500000000000000ae | 206.180 | 0.000 | n/a | 0.000 | 0.000 | 5.097 | 200.813 | 0.012 | n/a | 0.103 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e5000000000000012d | 206.143 | 0.000 | n/a | 0.000 | 0.000 | 4.572 | 201.386 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e5000000000000007b | 206.027 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 205.156 | 0.027 | n/a | 0.177 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e5000000000000013f | 205.825 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 204.875 | 0.032 | n/a | 0.074 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e5000000000000012f | 205.730 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 204.895 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e5000000000000011c | 205.675 | 0.000 | n/a | 0.000 | 0.000 | 0.597 | 204.891 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e500000000000000a9 | 205.628 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 204.556 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000063 | 205.400 | 0.000 | n/a | 0.000 | 0.000 | 0.981 | 203.898 | 0.008 | n/a | 0.361 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e500000000000000a4 | 205.388 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 204.116 | 0.019 | n/a | 0.140 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e5000000000000010d | 205.293 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 204.339 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e5000000000000007c | 205.258 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 204.340 | 0.040 | n/a | 0.142 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e500000000000000ca | 205.170 | 0.000 | n/a | 0.000 | 0.000 | 4.016 | 200.957 | 0.008 | n/a | 0.095 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000153 | 205.011 | 0.000 | n/a | 0.000 | 0.000 | 0.615 | 204.166 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000000124 | 204.785 | 0.000 | n/a | 0.000 | 0.000 | 3.854 | 200.775 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e500000000000000ad | 204.758 | 0.000 | n/a | 0.000 | 0.000 | 0.703 | 203.790 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e5000000000000010b | 204.757 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 200.933 | 2.935 | n/a | 0.026 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-65/journal/page | none observed |

## P3 / L4 / read (225 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.402 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.657 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 205.199 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.478 | 203.661 | 2.047 | n/a | 0.147 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccdf19d2be40a1e50000000000000196 | 205.955 | 0.000 | n/a | 0.000 | 0.000 | 4.204 | 201.357 | 0.014 | n/a | 0.163 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000198 | 205.893 | 0.000 | n/a | 0.000 | 0.000 | 2.313 | 203.386 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000221 | 205.199 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 204.212 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000173 | 204.724 | 0.000 | n/a | 0.000 | 0.000 | 3.478 | 201.053 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e5000000000000021e | 204.584 | 0.000 | n/a | 0.000 | 0.000 | 0.659 | 203.713 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e500000000000001bb | 204.548 | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 203.661 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e5000000000000020b | 204.093 | 0.000 | n/a | 0.000 | 0.000 | 2.450 | 201.470 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e500000000000001c5 | 204.005 | 0.000 | n/a | 0.000 | 0.000 | 2.715 | 201.106 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e5000000000000016b | 203.771 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 202.567 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e500000000000001bd | 203.659 | 0.000 | n/a | 0.000 | 0.000 | 2.015 | 201.265 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e500000000000001c9 | 203.413 | 0.000 | n/a | 0.000 | 0.000 | 1.431 | 201.448 | 0.008 | n/a | 0.410 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000238 | 203.367 | 0.000 | n/a | 0.000 | 0.000 | 1.900 | 201.146 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000185 | 203.357 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 202.335 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e50000000000000171 | 203.293 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 201.821 | 0.014 | n/a | 0.141 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e5000000000000020e | 203.291 | 0.000 | n/a | 0.000 | 0.000 | 2.474 | 200.668 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000224 | 203.118 | 0.000 | n/a | 0.000 | 0.000 | 0.453 | 202.511 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e5000000000000022b | 203.111 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 202.196 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000242 | 202.953 | 0.000 | n/a | 0.000 | 0.000 | 1.116 | 201.567 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e5000000000000019e | 202.923 | 0.000 | n/a | 0.000 | 0.000 | 0.455 | 202.319 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e500000000000001ef | 202.913 | 0.000 | n/a | 0.000 | 0.000 | 1.605 | 201.057 | 0.020 | n/a | 0.065 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-42/journal/page | none observed |

## P3 / L16 / read (152 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 84.625 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 81.580 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 204.070 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.500 | 202.119 | 7.726 | n/a | 0.083 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccdf19d2be40a1e5000000000000027e | 205.447 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 204.403 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000265 | 204.070 | 0.000 | n/a | 0.000 | 0.000 | 1.790 | 202.119 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000298 | 202.356 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 201.334 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e5000000000000029a | 202.200 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 201.155 | 0.029 | n/a | 0.074 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e5000000000000026e | 202.144 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 201.009 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e5000000000000027f | 202.137 | 0.000 | n/a | 0.000 | 0.000 | 0.748 | 201.180 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e5000000000000029d | 202.061 | 0.000 | n/a | 0.000 | 0.000 | 0.804 | 201.061 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000268 | 201.940 | 0.000 | n/a | 0.000 | 0.000 | 0.597 | 201.103 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000287 | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 200.907 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000270 | 201.897 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 200.862 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e5000000000000028b | 201.895 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 200.911 | 0.014 | n/a | 0.060 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000259 | 201.879 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 200.791 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000286 | 201.879 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 200.846 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000272 | 201.859 | 0.000 | n/a | 0.000 | 0.000 | 0.439 | 201.247 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000261 | 201.817 | 0.000 | n/a | 0.000 | 0.000 | 0.651 | 200.962 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000275 | 201.802 | 0.000 | n/a | 0.000 | 0.000 | 0.453 | 201.152 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000000288 | 201.799 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 200.698 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e5000000000000025c | 201.791 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 200.942 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e5000000000000028d | 201.752 | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 201.053 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e5000000000000027d | 201.663 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 200.852 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 84.831 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.458 | 84.453 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 |
| p99 | 202.226 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.417 | 201.371 | 2.312 | n/a | 0.103 | 0.000 | n/a | n/a | 50.083 | 0.000 | 0.000 | 50.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccdf19d2be40a1e50000000000000ea1 | 202.655 | 0.000 | n/a | 0.000 | 0.000 | 0.479 | 202.006 | 0.013 | n/a | 0.070 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e71 | 202.226 | 0.000 | n/a | 0.000 | 0.000 | 1.238 | 200.853 | 0.014 | n/a | 0.051 | 0.000 | n/a | n/a | 0.071 | 0.000 | 0.000 | 0.071 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e5d | 202.160 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 201.161 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e9e | 202.112 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 201.135 | 0.017 | n/a | 0.062 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e4b | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.417 | 201.371 | 0.013 | n/a | 0.103 | 0.000 | n/a | n/a | 0.058 | 0.000 | 0.000 | 0.058 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e51 | 201.867 | 0.000 | n/a | 0.000 | 0.000 | 0.539 | 201.120 | 0.021 | n/a | 0.100 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e6d | 201.759 | 0.000 | n/a | 0.000 | 0.000 | 0.362 | 201.142 | 0.013 | n/a | 0.177 | 0.000 | n/a | n/a | 0.065 | 0.000 | 0.000 | 0.065 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e87 | 201.732 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 200.732 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e61 | 201.728 | 0.000 | n/a | 0.000 | 0.000 | 0.519 | 201.034 | 0.019 | n/a | 0.059 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e52 | 201.690 | 0.000 | n/a | 0.000 | 0.000 | 0.351 | 201.177 | 0.014 | n/a | 0.086 | 0.000 | n/a | n/a | 0.062 | 0.000 | 0.000 | 0.062 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e97 | 201.683 | 0.000 | n/a | 0.000 | 0.000 | 1.187 | 200.401 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.067 | 0.000 | 0.000 | 0.067 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e63 | 201.642 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 200.713 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e7e | 201.600 | 0.000 | n/a | 0.000 | 0.000 | 0.382 | 201.066 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.065 | 0.000 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e85 | 201.599 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 200.784 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e4d | 201.584 | 0.000 | n/a | 0.000 | 0.000 | 0.354 | 201.052 | 0.015 | n/a | 0.071 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e48 | 201.566 | 0.000 | n/a | 0.000 | 0.000 | 0.409 | 200.979 | 0.013 | n/a | 0.093 | 0.000 | n/a | n/a | 0.071 | 0.000 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e86 | 201.512 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 200.800 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e8c | 201.484 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 200.644 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e57 | 201.457 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 200.556 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |
| ccdf19d2be40a1e50000000000000e4c | 201.452 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 200.630 | 0.017 | n/a | 0.045 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.101 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.473 | 200.498 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 |
| p99 | 204.489 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.787 | 203.737 | 1.515 | n/a | 0.101 | 0.000 | n/a | n/a | 0.303 | 0.000 | 0.000 | 0.303 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccdf19d2be40a1e50000000000000f4c | 218.017 | 0.000 | n/a | 0.000 | 0.000 | 0.331 | 217.522 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000000eba | 210.610 | 0.000 | n/a | 0.000 | 0.000 | 6.660 | 203.831 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000eee | 204.489 | 0.000 | n/a | 0.000 | 0.000 | 3.809 | 200.557 | 0.009 | n/a | 0.026 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f1a | 204.341 | 0.000 | n/a | 0.000 | 0.000 | 3.787 | 200.436 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f1b | 204.213 | 0.000 | n/a | 0.000 | 0.000 | 0.373 | 203.737 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f01 | 202.872 | 0.000 | n/a | 0.000 | 0.000 | 1.738 | 200.950 | 0.032 | n/a | 0.066 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000000fa0 | 202.804 | 0.000 | n/a | 0.000 | 0.000 | 1.907 | 200.693 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f61 | 202.608 | 0.000 | n/a | 0.000 | 0.000 | 1.732 | 200.542 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.303 | 0.000 | 0.000 | 0.303 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f07 | 202.520 | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 201.485 | 0.010 | n/a | 0.110 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000ef3 | 202.461 | 0.000 | n/a | 0.000 | 0.000 | 1.142 | 201.078 | 0.013 | n/a | 0.064 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f3d | 202.431 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.266 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f05 | 202.304 | 0.000 | n/a | 0.000 | 0.000 | 1.591 | 200.499 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f8f | 202.252 | 0.000 | n/a | 0.000 | 0.000 | 1.618 | 200.514 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f81 | 202.168 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 201.315 | 0.008 | n/a | 0.109 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e50000000000000ed5 | 202.125 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 201.075 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000000ed2 | 202.092 | 0.000 | n/a | 0.000 | 0.000 | 1.352 | 200.607 | 0.011 | n/a | 0.046 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f64 | 202.074 | 0.000 | n/a | 0.000 | 0.000 | 1.425 | 200.507 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f62 | 202.007 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 201.064 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f68 | 202.000 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 200.717 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000000f1c | 201.988 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 201.020 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (233 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.059 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.460 | 200.487 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 |
| p99 | 203.839 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.953 | 201.163 | 1.693 | n/a | 0.097 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccdf19d2be40a1e50000000000001008 | 214.377 | 0.000 | n/a | 0.000 | 0.000 | 13.667 | 200.514 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000fbd | 208.149 | 0.000 | n/a | 0.000 | 0.000 | 0.324 | 207.705 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000001085 | 203.839 | 0.000 | n/a | 0.000 | 0.000 | 2.953 | 200.754 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e5000000000000107b | 203.429 | 0.000 | n/a | 0.000 | 0.000 | 2.730 | 200.515 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000001004 | 203.097 | 0.000 | n/a | 0.000 | 0.000 | 2.475 | 200.448 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000001015 | 202.827 | 0.000 | n/a | 0.000 | 0.000 | 1.703 | 200.881 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e5000000000000108c | 202.533 | 0.000 | n/a | 0.000 | 0.000 | 1.334 | 200.989 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000001023 | 202.498 | 0.000 | n/a | 0.000 | 0.000 | 1.922 | 200.439 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000001091 | 202.187 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 200.974 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000001031 | 202.097 | 0.000 | n/a | 0.000 | 0.000 | 1.338 | 200.633 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000001002 | 202.089 | 0.000 | n/a | 0.000 | 0.000 | 1.075 | 200.885 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e50000000000000ff4 | 202.021 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 200.782 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e50000000000000fde | 201.987 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 200.962 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e5000000000000102e | 201.927 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 200.635 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e5000000000000103b | 201.830 | 0.000 | n/a | 0.000 | 0.000 | 0.487 | 201.163 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000001020 | 201.827 | 0.000 | n/a | 0.000 | 0.000 | 0.402 | 201.257 | 0.007 | n/a | 0.102 | 0.000 | n/a | n/a | 0.060 | 0.000 | 0.000 | 0.060 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000000fdf | 201.813 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 200.916 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e50000000000001097 | 201.813 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 200.488 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e50000000000001076 | 201.796 | 0.000 | n/a | 0.000 | 0.000 | 0.443 | 201.134 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e5000000000000104e | 201.726 | 0.000 | n/a | 0.000 | 0.000 | 0.506 | 200.921 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-65/journal/page | none observed |

## P3 / tail / read (850 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.042 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.451 | 200.469 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 |
| p99 | 203.041 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.962 | 201.292 | 0.854 | n/a | 0.098 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ccdf19d2be40a1e50000000000001249 | 225.486 | 0.000 | n/a | 0.000 | 0.000 | 0.313 | 225.053 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.067 | 0.000 | 0.000 | 0.067 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e500000000000010b2 | 204.545 | 0.000 | n/a | 0.000 | 0.000 | 4.068 | 200.346 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| ccdf19d2be40a1e500000000000013aa | 204.197 | 0.000 | n/a | 0.000 | 0.000 | 3.713 | 200.358 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| ccdf19d2be40a1e5000000000000111f | 204.095 | 0.000 | n/a | 0.000 | 0.000 | 1.291 | 201.292 | 0.015 | n/a | 0.055 | 0.000 | n/a | n/a | 1.443 | 0.000 | 0.000 | 1.443 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000001205 | 204.059 | 0.000 | n/a | 0.000 | 0.000 | 3.176 | 200.513 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000001244 | 203.920 | 0.000 | n/a | 0.000 | 0.000 | 3.251 | 200.547 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e500000000000011f1 | 203.504 | 0.000 | n/a | 0.000 | 0.000 | 1.962 | 201.406 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e50000000000001181 | 203.281 | 0.000 | n/a | 0.000 | 0.000 | 2.407 | 200.697 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-65/journal/page | none observed |
| ccdf19d2be40a1e500000000000013c3 | 203.041 | 0.000 | n/a | 0.000 | 0.000 | 2.377 | 200.543 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000001341 | 202.788 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 201.954 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e500000000000010c3 | 202.748 | 0.000 | n/a | 0.000 | 0.000 | 1.799 | 200.792 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e500000000000010b4 | 202.744 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 201.764 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e500000000000010d0 | 202.693 | 0.000 | n/a | 0.000 | 0.000 | 2.127 | 200.408 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e50000000000001395 | 202.672 | 0.000 | n/a | 0.000 | 0.000 | 1.726 | 200.720 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e500000000000010f9 | 202.565 | 0.000 | n/a | 0.000 | 0.000 | 1.721 | 200.676 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e5000000000000118d | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 201.444 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-47/journal/page | none observed |
| ccdf19d2be40a1e500000000000012f9 | 202.508 | 0.000 | n/a | 0.000 | 0.000 | 1.853 | 200.550 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-68/journal/page | none observed |
| ccdf19d2be40a1e5000000000000131f | 202.500 | 0.000 | n/a | 0.000 | 0.000 | 1.694 | 200.607 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-48/journal/page | none observed |
| ccdf19d2be40a1e50000000000001141 | 202.484 | 0.000 | n/a | 0.000 | 0.000 | 1.078 | 201.166 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-42/journal/page | none observed |
| ccdf19d2be40a1e500000000000010c5 | 202.454 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.317 | 0.001 | n/a | 0.020 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

## Writer heap, GC and scheduler stalls

Source 15ed651621cd68e09be33a0dc42eb5b2329fa74f; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 480.053 / 563.069 |
| GC events / total duration / maximum ms | 670 / 1665.454 / 48.315 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":652,"4":9,"8":9} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 43.865 / 15 / 868.759 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

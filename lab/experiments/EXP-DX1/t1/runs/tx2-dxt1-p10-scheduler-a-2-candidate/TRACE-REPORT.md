# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (93.292 ms, trace `523b4e10f15ba865000000000000013d`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (79.537 ms, trace `523b4e10f15ba86500000000000000ef`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (95.401 ms, trace `523b4e10f15ba8650000000000000139`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (77.662 ms, trace `523b4e10f15ba86500000000000001a1`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (69.350 ms, trace `523b4e10f15ba865000000000000105e`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-scheduler-a-2-candidate`; source `236dd70bf8077ee0a91acba63376db723e078306`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8302313.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 188 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13378.010 | 271.337 | 11.141 | 454 |
| L1 | 0 | 19978.096 | 373.763 | 5.305 | 668 |
| L4 | 0 | 19985.128 | 358.468 | 11.035 | 628 |
| L16 | 0 | 19972.115 | 347.473 | 5.059 | 686 |
| L64 | 0 | 19979.411 | 514.249 | 10.947 | 850 |
| L256 | 0 | 19962.274 | 343.361 | 10.097 | 708 |
| L1024 | 0 | 19981.600 | 4149.304 | 24.277 | 16936 |
| tail | 0 | 64648.008 | 12966.275 | 103.938 | 53023 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 523b4e10f15ba865000000000000013d | driver.queue.scheduler-dispatch | 0.078 | none | 0 / 32 |
| 523b4e10f15ba865000000000000013d | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 523b4e10f15ba865000000000000013d waited: []

| 523b4e10f15ba86500000000000000ef | driver.queue.scheduler-late | 4.134 | none | 0 / 32 |
| 523b4e10f15ba86500000000000000ef | driver.queue.scheduler-dispatch | 0.266 | none | 0 / 32 |

Observed active steps while trace 523b4e10f15ba86500000000000000ef waited: []

| 523b4e10f15ba8650000000000000139 | driver.queue.scheduler-dispatch | 0.073 | none | 0 / 32 |
| 523b4e10f15ba8650000000000000139 | driver.queue.scheduler-late | 0.000 | none | 0 / 32 |

Observed active steps while trace 523b4e10f15ba8650000000000000139 waited: []

| 523b4e10f15ba86500000000000001a1 | driver.queue.scheduler-dispatch | 0.061 | none | 0 / 32 |
| 523b4e10f15ba86500000000000001a1 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 523b4e10f15ba86500000000000001a1 waited: []

| 523b4e10f15ba865000000000000105e | driver.queue.scheduler-dispatch | 0.019 | none | 3 / 32 |
| 523b4e10f15ba865000000000000105e | driver.queue.scheduler-late | 0.001 | none | 3 / 32 |

Observed active steps while trace 523b4e10f15ba865000000000000105e waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.147 | 0.156 | 0.000 | 0.489 | 4.490 | 0.444 | 0.000 | 0.113 | 1.389 | 5.753 | 0.031 | n/a | 0.456 | 14.019 | n/a | n/a | 0.037 | 5.662 | 0.180 | 0.037 |
| p99 | 112.055 | 3.947 | 0.050 | 5.026 | 17.974 | n/a | 1.394 | 4.400 | 2.688 | 39.294 | 0.228 | n/a | 6.243 | 79.537 | n/a | n/a | 0.236 | 18.489 | 0.390 | 0.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba86500000000000000ef | 112.055 | 12.467 | n/a | 1.394 | 4.400 | 1.168 | 6.580 | 0.031 | n/a | 6.243 | 79.537 | n/a | n/a | 0.236 | 18.260 | 0.163 | 0.236 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 523b4e10f15ba8650000000000000109 | 64.667 | 5.690 | 0.292 | 0.000 | 0.141 | 2.617 | 39.294 | 0.030 | n/a | 0.107 | 16.453 | n/a | n/a | 0.042 | 6.123 | 0.095 | 0.042 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.025ms |
| 523b4e10f15ba86500000000000000f1 | 62.704 | 17.974 | 0.444 | 0.000 | 0.071 | 2.291 | 13.544 | 0.140 | n/a | 4.244 | 23.971 | n/a | n/a | 0.026 | 18.489 | 0.295 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 523b4e10f15ba8650000000000000103 | 44.730 | 5.281 | 0.220 | 0.000 | 0.150 | 1.478 | 14.787 | 0.088 | n/a | 3.711 | 18.973 | n/a | n/a | 0.042 | 5.652 | 0.126 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 523b4e10f15ba8650000000000000123 | 38.586 | 4.490 | 0.173 | 0.507 | 0.071 | 1.333 | 11.531 | 0.027 | n/a | 0.106 | 20.321 | n/a | n/a | 0.027 | 5.241 | 0.136 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.reader-basis.broadcast 0.021ms; driver.publication.persist-deferred 0.021ms |
| 523b4e10f15ba865000000000000010d | 36.870 | 8.384 | 0.275 | 0.608 | 0.135 | 2.688 | 7.958 | 0.027 | n/a | 0.373 | 16.383 | n/a | n/a | 0.039 | 9.401 | 0.255 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 523b4e10f15ba86500000000000000fb | 36.328 | 5.161 | 0.320 | 0.000 | 0.181 | 2.529 | 13.673 | 0.031 | n/a | 0.343 | 14.019 | n/a | n/a | 0.072 | 5.662 | 0.156 | 0.072 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 523b4e10f15ba86500000000000000f9 | 33.844 | 3.875 | 0.208 | 0.000 | 0.090 | 1.632 | 13.446 | 0.027 | n/a | 0.102 | 14.437 | n/a | n/a | 0.029 | 4.172 | 0.123 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 523b4e10f15ba865000000000000011f | 33.508 | 5.525 | 0.441 | 0.000 | 0.073 | 1.860 | 9.224 | 0.034 | n/a | 0.579 | 15.738 | n/a | n/a | 0.032 | 6.040 | 0.180 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 523b4e10f15ba8650000000000000117 | 33.210 | 4.860 | 0.267 | 0.517 | 0.057 | 1.445 | 9.552 | 0.228 | n/a | 0.098 | 16.159 | n/a | n/a | 0.027 | 5.702 | 0.172 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 523b4e10f15ba865000000000000011b | 32.855 | 3.848 | 0.210 | 0.000 | 0.083 | 1.408 | 11.124 | 0.030 | n/a | 3.188 | 12.934 | n/a | n/a | 0.030 | 4.141 | 0.126 | 0.030 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 523b4e10f15ba8650000000000000101 | 32.829 | 6.782 | 0.183 | 0.000 | 0.091 | 1.475 | 7.365 | 0.049 | n/a | 0.212 | 16.635 | n/a | n/a | 0.037 | 7.057 | 0.215 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 523b4e10f15ba86500000000000000f5 | 28.266 | 7.129 | 0.388 | 0.000 | 0.141 | 1.830 | 11.352 | 0.032 | n/a | 0.954 | 6.377 | n/a | n/a | 0.062 | 7.658 | 0.271 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 523b4e10f15ba8650000000000000115 | 27.273 | 7.330 | n/a | 0.000 | 0.101 | 1.461 | 1.971 | 0.023 | n/a | 0.770 | 15.575 | n/a | n/a | 0.043 | 7.431 | 0.272 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000000ff | 27.147 | 7.060 | n/a | 0.000 | 1.541 | 0.947 | 1.450 | 0.020 | n/a | 0.383 | 15.706 | n/a | n/a | 0.042 | 8.600 | 0.317 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 523b4e10f15ba86500000000000000f7 | 25.535 | 3.071 | n/a | 0.000 | 0.493 | 0.718 | 2.154 | 0.021 | n/a | 0.501 | 18.538 | n/a | n/a | 0.040 | 3.564 | 0.140 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| 523b4e10f15ba8650000000000000105 | 23.844 | 9.066 | n/a | 0.000 | 0.238 | 1.909 | 1.979 | 0.022 | n/a | 0.615 | 9.970 | n/a | n/a | 0.044 | 9.305 | 0.390 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000113 | 23.715 | 4.413 | 0.294 | 0.000 | 0.071 | 1.290 | 6.651 | 0.033 | n/a | 0.456 | 10.483 | n/a | n/a | 0.025 | 4.778 | 0.201 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000000f3 | 23.103 | 3.460 | n/a | 0.000 | 2.272 | 1.386 | 2.963 | 0.089 | n/a | 0.980 | 11.800 | n/a | n/a | 0.152 | 5.732 | 0.248 | 0.152 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| 523b4e10f15ba865000000000000010b | 22.569 | 7.251 | 0.279 | 0.000 | 0.084 | 1.470 | 2.583 | 0.032 | n/a | 0.481 | 10.361 | n/a | n/a | 0.028 | 7.614 | 0.337 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.888 | 0.271 | 0.000 | 0.492 | 3.071 | n/a | 0.000 | 0.123 | 0.814 | 1.929 | 0.023 | n/a | 0.501 | 10.369 | n/a | n/a | 0.040 | 3.417 | 0.211 | 0.040 |
| p99 | 25.535 | 1.944 | 0.000 | 1.125 | 3.991 | n/a | 0.000 | 2.272 | 1.389 | 4.330 | 0.089 | n/a | 3.939 | 18.538 | n/a | n/a | 0.152 | 6.079 | 0.280 | 0.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba86500000000000000f7 | 25.535 | 3.071 | n/a | 0.000 | 0.493 | 0.718 | 2.154 | 0.021 | n/a | 0.501 | 18.538 | n/a | n/a | 0.040 | 3.564 | 0.140 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| 523b4e10f15ba86500000000000000f3 | 23.103 | 3.460 | n/a | 0.000 | 2.272 | 1.386 | 2.963 | 0.089 | n/a | 0.980 | 11.800 | n/a | n/a | 0.152 | 5.732 | 0.248 | 0.152 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| 523b4e10f15ba865000000000000011d | 21.870 | 2.129 | n/a | 0.000 | 0.051 | 0.813 | 3.965 | 0.022 | n/a | 0.421 | 14.438 | n/a | n/a | 0.030 | 2.181 | 0.100 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000010f | 21.675 | 3.991 | n/a | 0.000 | 2.088 | 0.687 | 1.357 | 0.021 | n/a | 3.939 | 9.560 | n/a | n/a | 0.031 | 6.079 | 0.280 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000124 | 18.888 | 1.957 | n/a | 0.000 | 1.308 | 1.134 | 1.461 | 0.043 | n/a | 1.178 | 11.793 | n/a | n/a | 0.013 | 3.265 | 0.173 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000111 | 16.409 | 2.407 | n/a | 0.000 | 0.055 | 1.385 | 1.929 | 0.050 | n/a | 0.190 | 10.369 | n/a | n/a | 0.025 | 2.461 | 0.150 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000121 | 15.479 | 3.396 | n/a | 0.000 | 0.113 | 0.814 | 1.522 | 0.020 | n/a | 0.623 | 8.947 | n/a | n/a | 0.044 | 3.509 | 0.227 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000000fc | 14.689 | 2.974 | n/a | 0.000 | 0.123 | 0.796 | 4.330 | 0.023 | n/a | 0.097 | 6.291 | n/a | n/a | 0.056 | 3.097 | 0.211 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000119 | 13.839 | 3.299 | n/a | 0.000 | 0.118 | 1.389 | 1.732 | 0.080 | n/a | 0.277 | 6.891 | n/a | n/a | 0.054 | 3.417 | 0.247 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.896 | 0.000 | 0.000 | 0.723 | 4.272 | 0.370 | 0.000 | 0.247 | 1.535 | 6.863 | 0.032 | n/a | 0.323 | 10.179 | n/a | n/a | 0.074 | 4.890 | 0.205 | 0.074 |
| p99 | 23.896 | 0.000 | 0.000 | 0.723 | 4.272 | 0.370 | 0.000 | 0.247 | 1.535 | 6.863 | 0.032 | n/a | 0.323 | 10.179 | n/a | n/a | 0.074 | 4.890 | 0.205 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba8650000000000000127 | 23.896 | 4.272 | 0.370 | 0.000 | 0.247 | 1.535 | 6.863 | 0.032 | n/a | 0.323 | 10.179 | n/a | n/a | 0.074 | 4.890 | 0.205 | 0.074 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.012 | 0.303 | 0.000 | 0.480 | 3.793 | n/a | 0.000 | 0.074 | 1.330 | 4.991 | 0.032 | n/a | 0.170 | 13.033 | n/a | n/a | 0.031 | 4.411 | 0.176 | 0.031 |
| p99 | 117.212 | 1.999 | 0.000 | 2.121 | 7.963 | n/a | 2.050 | 6.479 | 4.353 | 18.523 | 0.087 | n/a | 1.602 | 95.401 | n/a | n/a | 0.069 | 10.055 | 0.460 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba865000000000000013d | 117.212 | 6.464 | 0.379 | 0.000 | 0.080 | 2.469 | 13.915 | 0.061 | n/a | 0.513 | 93.292 | n/a | n/a | 0.038 | 6.923 | 0.059 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.078ms |
| 523b4e10f15ba8650000000000000139 | 107.469 | 5.315 | n/a | 0.000 | 0.073 | 0.842 | 5.337 | 0.021 | n/a | 0.449 | 95.401 | n/a | n/a | 0.031 | 5.388 | 0.050 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| 523b4e10f15ba8650000000000000132 | 41.727 | 3.829 | 0.229 | 0.000 | 0.074 | 1.592 | 11.462 | 0.037 | n/a | 0.103 | 24.377 | n/a | n/a | 0.023 | 4.133 | 0.099 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 523b4e10f15ba865000000000000014b | 41.402 | 5.682 | 0.241 | 0.000 | 0.059 | 1.897 | 18.523 | 0.044 | n/a | 0.395 | 14.532 | n/a | n/a | 0.028 | 5.982 | 0.144 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 523b4e10f15ba8650000000000000143 | 36.145 | 4.510 | 0.184 | 0.000 | 0.133 | 1.779 | 12.536 | 0.041 | n/a | 0.170 | 16.745 | n/a | n/a | 0.046 | 4.827 | 0.134 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 523b4e10f15ba8650000000000000129 | 34.190 | 5.890 | 0.186 | 0.552 | 0.131 | 1.561 | 16.985 | 0.030 | n/a | 0.104 | 8.698 | n/a | n/a | 0.053 | 6.758 | 0.198 | 0.053 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.058ms |
| 523b4e10f15ba865000000000000015d | 33.100 | 3.292 | 0.205 | 0.244 | 0.060 | 1.651 | 8.961 | 0.032 | n/a | 0.603 | 18.030 | n/a | n/a | 0.021 | 3.802 | 0.115 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.015ms |
| 523b4e10f15ba8650000000000000165 | 33.100 | 3.793 | 0.297 | 0.247 | 0.069 | 1.360 | 6.206 | 0.051 | n/a | 0.097 | 20.954 | n/a | n/a | 0.025 | 4.407 | 0.133 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000013f | 32.773 | 3.402 | 0.176 | 0.334 | 0.084 | 1.565 | 11.231 | 0.055 | n/a | 0.568 | 15.317 | n/a | n/a | 0.039 | 3.997 | 0.122 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000016d | 32.588 | 3.227 | 0.144 | 0.000 | 0.054 | 1.034 | 6.234 | 0.029 | n/a | 0.109 | 21.735 | n/a | n/a | 0.022 | 3.425 | 0.105 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000147 | 31.507 | 6.926 | 0.177 | 0.445 | 0.074 | 1.252 | 8.679 | 0.033 | n/a | 0.414 | 13.477 | n/a | n/a | 0.029 | 7.623 | 0.242 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000169 | 30.268 | 3.675 | 0.260 | 0.398 | 0.214 | 1.412 | 14.086 | 0.037 | n/a | 0.116 | 10.003 | n/a | n/a | 0.068 | 4.547 | 0.150 | 0.068 | gw-w/thread-48/gateway.admitted-work | none observed |
| 523b4e10f15ba865000000000000012b | 29.838 | 7.500 | 0.216 | 0.000 | 0.075 | 1.530 | 9.637 | 0.030 | n/a | 0.096 | 10.724 | n/a | n/a | 0.030 | 7.791 | 0.261 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000016f | 28.611 | 4.049 | 0.235 | 0.000 | 0.143 | 1.675 | 6.396 | 0.087 | n/a | 1.602 | 14.373 | n/a | n/a | 0.051 | 4.427 | 0.155 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000013b | 27.481 | 4.820 | 0.166 | 0.751 | 0.056 | 2.178 | 6.342 | 0.056 | n/a | 0.109 | 12.978 | n/a | n/a | 0.025 | 5.793 | 0.211 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000155 | 27.465 | 4.300 | n/a | 0.000 | 0.111 | 1.394 | 2.051 | 0.029 | n/a | 0.113 | 19.421 | n/a | n/a | 0.046 | 4.411 | 0.161 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000149 | 27.240 | 5.605 | n/a | 0.000 | 0.165 | 1.173 | 1.660 | 0.024 | n/a | 0.170 | 18.375 | n/a | n/a | 0.069 | 5.769 | 0.212 | 0.069 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000173 | 25.537 | 7.963 | n/a | 2.050 | 0.042 | 4.322 | 2.027 | 0.021 | n/a | 0.078 | 9.010 | n/a | n/a | 0.023 | 10.055 | 0.394 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000153 | 25.022 | 3.706 | 0.293 | 0.280 | 0.115 | 1.221 | 9.738 | 0.044 | n/a | 0.432 | 9.156 | n/a | n/a | 0.037 | 4.394 | 0.176 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000137 | 24.214 | 4.285 | 0.323 | 0.000 | 0.057 | 1.436 | 4.912 | 0.033 | n/a | 0.105 | 13.033 | n/a | n/a | 0.029 | 4.666 | 0.193 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.198 | 0.192 | 0.000 | 0.399 | 2.384 | n/a | 0.000 | 0.055 | 1.010 | 1.600 | 0.038 | n/a | 0.180 | 6.545 | n/a | n/a | 0.027 | 2.665 | 0.183 | 0.027 |
| p99 | 21.878 | 1.001 | 0.000 | 0.806 | 7.260 | n/a | 0.000 | 6.479 | 2.627 | 4.991 | 0.072 | n/a | 0.780 | 14.634 | n/a | n/a | 0.063 | 8.234 | 0.429 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba865000000000000016b | 21.878 | 2.319 | n/a | 0.000 | 0.055 | 2.627 | 2.327 | 0.051 | n/a | 0.180 | 14.292 | n/a | n/a | 0.027 | 2.374 | 0.108 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000130 | 20.809 | 3.689 | n/a | 0.000 | 0.118 | 0.914 | 1.590 | 0.021 | n/a | 0.468 | 13.947 | n/a | n/a | 0.063 | 3.807 | 0.183 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000134 | 19.959 | 7.260 | n/a | 0.000 | 0.060 | 2.388 | 3.821 | 0.042 | n/a | 0.599 | 5.758 | n/a | n/a | 0.031 | 7.320 | 0.367 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000145 | 19.405 | 2.619 | n/a | 0.000 | 0.047 | 0.738 | 1.225 | 0.021 | n/a | 0.101 | 14.634 | n/a | n/a | 0.022 | 2.665 | 0.137 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000174 | 19.198 | 1.755 | n/a | 0.000 | 6.479 | 0.841 | 4.991 | 0.022 | n/a | 0.088 | 5.005 | n/a | n/a | 0.017 | 8.234 | 0.429 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.077ms; driver.publication.persist-deferred 0.021ms |
| 523b4e10f15ba8650000000000000159 | 17.921 | 1.822 | n/a | 0.000 | 0.048 | 2.128 | 3.780 | 0.052 | n/a | 0.166 | 9.900 | n/a | n/a | 0.024 | 1.870 | 0.104 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 523b4e10f15ba865000000000000014f | 12.156 | 2.694 | n/a | 0.000 | 0.046 | 1.010 | 1.600 | 0.072 | n/a | 0.780 | 5.924 | n/a | n/a | 0.031 | 2.740 | 0.225 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000015e | 11.840 | 2.384 | n/a | 0.000 | 0.077 | 1.330 | 1.142 | 0.038 | n/a | 0.274 | 6.545 | n/a | n/a | 0.050 | 2.461 | 0.208 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.751 | 0.000 | 0.000 | 0.452 | 3.677 | 0.336 | 0.000 | 0.069 | 1.195 | 4.162 | 0.029 | n/a | 0.401 | 10.530 | n/a | n/a | 0.032 | 4.181 | 0.187 | 0.032 |
| p99 | 99.311 | 3.870 | 0.017 | 3.191 | 7.408 | n/a | 2.184 | 2.404 | 4.864 | 14.631 | 0.067 | n/a | 3.009 | 77.662 | n/a | n/a | 0.079 | 8.841 | 0.463 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba86500000000000001a1 | 99.311 | 7.167 | 0.336 | 0.327 | 0.062 | 1.818 | 10.915 | 0.037 | n/a | 0.958 | 77.662 | n/a | n/a | 0.029 | 7.893 | 0.079 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 523b4e10f15ba86500000000000001b5 | 39.464 | 7.408 | n/a | 0.000 | 0.137 | 4.864 | 2.222 | 0.024 | n/a | 0.091 | 24.640 | n/a | n/a | 0.079 | 7.545 | 0.191 | 0.079 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 523b4e10f15ba8650000000000000184 | 35.870 | 4.586 | 0.180 | 0.408 | 0.068 | 1.645 | 10.383 | 0.030 | n/a | 0.408 | 18.134 | n/a | n/a | 0.028 | 5.243 | 0.146 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001b3 | 34.390 | 5.050 | 0.193 | 0.421 | 0.068 | 1.695 | 11.368 | 0.028 | n/a | 0.111 | 15.424 | n/a | n/a | 0.032 | 5.731 | 0.167 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001a7 | 31.516 | 5.118 | 0.178 | 0.527 | 0.061 | 2.136 | 9.562 | 0.042 | n/a | 0.504 | 13.363 | n/a | n/a | 0.025 | 5.884 | 0.187 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001ad | 31.363 | 5.228 | 0.295 | 0.361 | 0.071 | 1.939 | 12.663 | 0.056 | n/a | 0.188 | 10.530 | n/a | n/a | 0.030 | 5.956 | 0.190 | 0.030 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000019b | 30.844 | 4.007 | 0.328 | 0.409 | 0.165 | 2.203 | 10.009 | 0.063 | n/a | 0.414 | 13.187 | n/a | n/a | 0.059 | 4.909 | 0.159 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000181 | 30.523 | 3.677 | 0.177 | 0.255 | 0.060 | 1.385 | 14.631 | 0.062 | n/a | 0.739 | 9.508 | n/a | n/a | 0.028 | 4.169 | 0.137 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001a3 | 28.912 | 3.438 | 0.268 | 0.242 | 0.179 | 1.178 | 11.739 | 0.028 | n/a | 0.105 | 11.679 | n/a | n/a | 0.058 | 4.126 | 0.143 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000199 | 28.363 | 3.922 | 0.172 | 0.349 | 0.061 | 1.470 | 9.236 | 0.039 | n/a | 0.105 | 12.982 | n/a | n/a | 0.027 | 4.504 | 0.159 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001c9 | 28.129 | 5.213 | 0.208 | 0.000 | 0.261 | 1.885 | 5.749 | 0.030 | n/a | 0.093 | 14.638 | n/a | n/a | 0.052 | 5.682 | 0.202 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001bb | 27.893 | 3.735 | 0.189 | 0.297 | 0.069 | 1.382 | 8.616 | 0.029 | n/a | 0.146 | 13.392 | n/a | n/a | 0.038 | 4.289 | 0.154 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000018d | 27.554 | 4.607 | 0.234 | 0.000 | 0.205 | 4.362 | 8.807 | 0.038 | n/a | 0.384 | 8.854 | n/a | n/a | 0.064 | 5.046 | 0.183 | 0.064 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000195 | 26.937 | 3.639 | 0.242 | 0.252 | 0.048 | 1.193 | 10.313 | 0.029 | n/a | 0.413 | 10.784 | n/a | n/a | 0.024 | 4.181 | 0.155 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001b7 | 24.428 | 3.540 | 0.136 | 0.349 | 0.061 | 1.144 | 9.610 | 0.030 | n/a | 0.805 | 8.726 | n/a | n/a | 0.028 | 4.086 | 0.167 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000186 | 23.445 | 3.173 | n/a | 0.000 | 1.382 | 0.730 | 2.084 | 0.020 | n/a | 0.414 | 15.621 | n/a | n/a | 0.021 | 4.555 | 0.194 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000197 | 23.053 | 6.437 | n/a | 0.000 | 2.404 | 0.892 | 1.520 | 0.021 | n/a | 0.441 | 11.304 | n/a | n/a | 0.035 | 8.841 | 0.384 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001bf | 22.972 | 3.548 | 0.175 | 0.000 | 0.065 | 1.354 | 7.918 | 0.028 | n/a | 0.401 | 9.451 | n/a | n/a | 0.032 | 3.788 | 0.165 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000018f | 22.811 | 3.263 | 0.195 | 0.327 | 0.148 | 1.692 | 6.342 | 0.056 | n/a | 0.138 | 10.593 | n/a | n/a | 0.057 | 3.932 | 0.172 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001c4 | 22.751 | 3.709 | n/a | 0.000 | 0.153 | 1.340 | 2.110 | 0.054 | n/a | 0.149 | 15.163 | n/a | n/a | 0.071 | 3.862 | 0.170 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.363 | 0.000 | 0.000 | 0.470 | 2.901 | n/a | 0.000 | 0.091 | 0.726 | 1.133 | 0.022 | n/a | 0.149 | 9.067 | n/a | n/a | 0.044 | 3.141 | 0.183 | 0.044 |
| p99 | 22.751 | 2.001 | 0.017 | 0.848 | 3.709 | n/a | 0.000 | 2.132 | 1.340 | 4.162 | 0.067 | n/a | 3.009 | 17.318 | n/a | n/a | 0.071 | 3.862 | 0.410 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba86500000000000001c4 | 22.751 | 3.709 | n/a | 0.000 | 0.153 | 1.340 | 2.110 | 0.054 | n/a | 0.149 | 15.163 | n/a | n/a | 0.071 | 3.862 | 0.170 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 523b4e10f15ba865000000000000018b | 21.124 | 1.798 | n/a | 0.000 | 0.063 | 0.704 | 1.125 | 0.021 | n/a | 0.070 | 17.318 | n/a | n/a | 0.026 | 1.860 | 0.088 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000017f | 17.725 | 3.407 | n/a | 0.000 | 0.120 | 0.792 | 1.131 | 0.023 | n/a | 0.491 | 11.715 | n/a | n/a | 0.046 | 3.528 | 0.199 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000017b | 17.332 | 3.078 | n/a | 0.000 | 0.085 | 0.893 | 1.133 | 0.021 | n/a | 3.009 | 9.067 | n/a | n/a | 0.046 | 3.163 | 0.183 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000193 | 17.186 | 1.877 | n/a | 0.000 | 0.045 | 0.677 | 4.162 | 0.022 | n/a | 0.072 | 10.308 | n/a | n/a | 0.023 | 1.923 | 0.112 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001af | 15.363 | 2.441 | n/a | 0.000 | 0.063 | 0.909 | 2.003 | 0.067 | n/a | 0.271 | 9.576 | n/a | n/a | 0.032 | 2.504 | 0.163 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001bc | 14.576 | 3.051 | n/a | 0.000 | 0.091 | 0.987 | 1.478 | 0.039 | n/a | 0.707 | 8.180 | n/a | n/a | 0.044 | 3.141 | 0.216 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001a5 | 12.672 | 3.285 | n/a | 0.000 | 0.133 | 0.636 | 3.943 | 0.021 | n/a | 0.085 | 4.510 | n/a | n/a | 0.057 | 3.418 | 0.270 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 523b4e10f15ba86500000000000001c7 | 9.322 | 1.693 | n/a | 0.000 | 2.132 | 0.643 | 0.956 | 0.019 | n/a | 0.076 | 3.780 | n/a | n/a | 0.023 | 3.824 | 0.410 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000191 | 9.280 | 2.901 | n/a | 0.000 | 0.120 | 0.726 | 1.126 | 0.023 | n/a | 0.476 | 3.858 | n/a | n/a | 0.050 | 3.021 | 0.326 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 62.725 | n/a | n/a | n/a | 33.047 | 3.053 | 2.523 | 0.000 | 0.335 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.960 | 51.294 | 0.854 | 7.960 |
| p99 | 246.747 | n/a | n/a | n/a | 131.418 | 93.901 | 23.271 | 0.000 | 129.965 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 155.614 | 181.998 | 1.000 | 155.614 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba8650000000000000cf0 | 246.747 | 33.047 | 54.799 | 2.826 | 0.000 | 0.461 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 155.614 | 90.672 | 0.367 | 155.614 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.319ms; driver.reader-basis.broadcast 0.235ms; driver.publication.readback 0.095ms; driver.publication.readback 0.071ms; driver.publication.readback 0.068ms |
| 523b4e10f15ba8650000000000000cf3 | 205.470 | 131.418 | 37.244 | 13.335 | 0.000 | 0.514 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.959 | 181.998 | 0.886 | 22.959 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.319ms; driver.reader-basis.broadcast 0.235ms; driver.publication.readback 0.095ms; driver.publication.readback 0.071ms; driver.publication.readback 0.068ms |
| 523b4e10f15ba86500000000000019a2 | 174.767 | 28.338 | 0.090 | 2.265 | 0.000 | 129.965 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.109 | 30.693 | 0.176 | 14.109 | node-14/thread-3/socket.queue-and-write | driver.reader-basis.broadcast 0.703ms; driver.reader-basis.broadcast 0.268ms; driver.publication.readback 0.153ms; driver.publication.readback 0.120ms; driver.publication.readback 0.078ms |
| 523b4e10f15ba86500000000000006e7 | 145.690 | 36.936 | 93.901 | 4.030 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.333 | 134.867 | 0.926 | 10.333 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.680ms; driver.publication.readback 0.541ms; driver.publication.readback 0.193ms; driver.publication.readback 0.138ms; driver.reader-basis.broadcast 0.104ms |
| 523b4e10f15ba86500000000000019a4 | 137.322 | 41.146 | 49.056 | 6.379 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.500 | 96.581 | 0.703 | 40.500 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.703ms; driver.reader-basis.broadcast 0.268ms; driver.publication.readback 0.153ms; driver.publication.readback 0.073ms; driver.publication.readback 0.068ms |
| 523b4e10f15ba86500000000000006e2 | 129.748 | 91.678 | 1.186 | 10.977 | 0.000 | 3.474 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.433 | 103.841 | 0.800 | 22.433 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.readback 0.541ms; driver.publication.readback 0.111ms; driver.reader-basis.broadcast 0.104ms; driver.publication.readback 0.066ms; driver.publication.readback 0.065ms |
| 523b4e10f15ba86500000000000019ab | 126.342 | 19.957 | 63.442 | 0.000 | 0.000 | 1.224 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.719 | 83.399 | 0.660 | 41.719 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.703ms; driver.reader-basis.broadcast 0.268ms; driver.publication.readback 0.153ms; driver.publication.readback 0.078ms; driver.publication.readback 0.073ms |
| 523b4e10f15ba865000000000000199c | 118.179 | 49.979 | 2.504 | 3.353 | 0.000 | 0.335 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 62.009 | 55.835 | 0.472 | 62.009 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.268ms; driver.publication.readback 0.130ms; driver.publication.readback 0.128ms; driver.publication.readback 0.120ms; driver.publication.readback 0.073ms |
| 523b4e10f15ba865000000000000199f | 111.221 | 13.876 | 12.250 | 0.000 | 0.000 | 0.249 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 84.846 | 26.126 | 0.235 | 84.846 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.268ms; driver.publication.readback 0.130ms; driver.publication.readback 0.120ms; driver.publication.readback 0.073ms; driver.publication.readback 0.068ms |
| 523b4e10f15ba8650000000000000cff | 108.424 | 14.701 | 43.690 | 23.271 | 0.000 | 0.335 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.426 | 81.663 | 0.753 | 26.426 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.366ms; driver.publication.readback 0.120ms; driver.publication.readback 0.095ms; driver.publication.readback 0.068ms; driver.publication.readback 0.066ms |
| 523b4e10f15ba8650000000000000d00 | 106.647 | 24.479 | 39.860 | 0.000 | 0.000 | 0.196 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.112 | 64.339 | 0.603 | 42.112 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.366ms; driver.publication.readback 0.120ms; driver.publication.readback 0.095ms; driver.publication.readback 0.068ms; driver.publication.readback 0.052ms |
| 523b4e10f15ba8650000000000000d01 | 103.258 | 26.442 | 56.725 | 0.000 | 0.000 | 0.351 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.740 | 83.167 | 0.805 | 19.740 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.366ms; driver.publication.readback 0.120ms; driver.publication.readback 0.068ms; driver.publication.readback 0.052ms; driver.publication.readback 0.051ms |
| 523b4e10f15ba8650000000000001999 | 92.763 | 53.422 | 2.203 | 5.217 | 0.000 | 0.359 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.563 | 60.842 | 0.656 | 31.563 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.268ms; driver.publication.readback 0.257ms; driver.publication.readback 0.130ms; driver.publication.readback 0.128ms; driver.publication.persist-deferred 0.121ms |
| 523b4e10f15ba865000000000000139d | 85.333 | 68.370 | 1.368 | 9.572 | 0.000 | 0.553 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.469 | 79.310 | 0.929 | 5.469 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.238ms; driver.publication.readback 0.066ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.034ms; driver.publication.persist-deferred 0.019ms |
| 523b4e10f15ba8650000000000000ceb | 80.634 | 57.355 | 0.765 | 18.591 | 0.000 | 0.601 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.323 | 76.710 | 0.951 | 3.323 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.235ms; driver.publication.readback 0.110ms; driver.publication.readback 0.092ms; driver.publication.readback 0.060ms; driver.publication.readback 0.059ms |
| 523b4e10f15ba86500000000000019aa | 79.781 | 13.404 | 60.927 | 0.000 | 0.000 | 0.276 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.174 | 74.331 | 0.932 | 5.174 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.268ms; driver.publication.readback 0.073ms; driver.publication.readback 0.068ms; driver.publication.readback 0.060ms; driver.publication.readback 0.059ms |
| 523b4e10f15ba865000000000000169a | 73.231 | 51.076 | 1.434 | 4.671 | 0.000 | 0.856 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.195 | 57.180 | 0.781 | 15.195 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.288ms; driver.publication.readback 0.085ms; driver.publication.readback 0.052ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.015ms |
| 523b4e10f15ba8650000000000001770 | 65.561 | 40.599 | 0.196 | 2.523 | 0.000 | 0.526 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.717 | 43.318 | 0.661 | 21.717 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.259ms; driver.publication.readback 0.068ms; driver.publication.readback 0.062ms; driver.publication.readback 0.059ms; driver.publication.readback 0.054ms |
| 523b4e10f15ba8650000000000001666 | 62.951 | 18.945 | 5.315 | 0.761 | 0.000 | 0.204 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.726 | 25.021 | 0.397 | 37.726 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.316ms; driver.publication.readback 0.469ms; driver.reader-basis.broadcast 0.245ms; driver.publication.readback 0.127ms; driver.publication.readback 0.124ms |
| 523b4e10f15ba8650000000000000e89 | 62.725 | 44.691 | 0.273 | 8.616 | 0.000 | 1.184 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.960 | 53.581 | 0.854 | 7.960 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 1.032ms; driver.publication.readback 0.111ms; driver.publication.readback 0.108ms; driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.063ms |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.767 | 0.000 | 0.000 | 0.433 | 3.525 | n/a | 0.000 | 0.057 | 1.249 | 4.900 | 0.031 | n/a | 0.326 | 11.794 | n/a | n/a | 0.026 | 4.188 | 0.165 | 0.026 |
| p99 | 83.701 | 2.056 | 0.057 | 2.297 | 11.986 | n/a | 0.587 | 2.729 | 5.268 | 36.552 | 0.451 | n/a | 37.406 | 63.727 | n/a | n/a | 0.078 | 12.135 | 0.371 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba86500000000000001d1 | 83.701 | 2.091 | n/a | 0.000 | 0.076 | 5.268 | 2.312 | 0.033 | n/a | 37.406 | 36.474 | n/a | n/a | 0.041 | 2.167 | 0.026 | 0.041 | gw-w/thread-45/d/transact-async | driver.expected-state.bind-receipt 2.479ms; driver.publication.readback 0.121ms; driver.publication.persist-deferred 0.022ms |
| 523b4e10f15ba86500000000000001f8 | 79.420 | 5.224 | 0.278 | 0.000 | 0.103 | 1.400 | 8.299 | 0.026 | n/a | 0.326 | 63.727 | n/a | n/a | 0.037 | 5.605 | 0.071 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 523b4e10f15ba86500000000000001d2 | 70.344 | 6.547 | n/a | 0.000 | 0.017 | 3.137 | 36.552 | 0.060 | n/a | 0.127 | 23.890 | n/a | n/a | 0.013 | 6.564 | 0.093 | 0.013 | gw-w/thread-44/gateway.request-parse | none observed |
| 523b4e10f15ba86500000000000001ee | 52.461 | 11.986 | n/a | 0.000 | 0.149 | 2.713 | 20.288 | 0.124 | n/a | 3.729 | 13.408 | n/a | n/a | 0.065 | 12.135 | 0.231 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 523b4e10f15ba8650000000000000214 | 48.777 | 3.796 | 0.301 | 0.352 | 0.051 | 1.448 | 33.393 | 0.031 | n/a | 0.361 | 9.019 | n/a | n/a | 0.026 | 4.500 | 0.092 | 0.026 | gw-w/thread-48/gateway.admitted-work | none observed |
| 523b4e10f15ba8650000000000000204 | 33.022 | 4.928 | 0.268 | 0.460 | 0.063 | 1.926 | 8.602 | 0.078 | n/a | 0.214 | 16.458 | n/a | n/a | 0.024 | 5.719 | 0.173 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001d5 | 31.360 | 3.980 | 0.262 | 0.000 | 0.077 | 1.386 | 11.464 | 0.050 | n/a | 0.326 | 13.775 | n/a | n/a | 0.038 | 4.319 | 0.138 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001d8 | 31.263 | 3.705 | 0.293 | 0.336 | 0.062 | 1.432 | 10.038 | 0.035 | n/a | 0.392 | 14.944 | n/a | n/a | 0.027 | 4.396 | 0.141 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000020e | 31.213 | 3.525 | 0.167 | 0.290 | 0.050 | 1.841 | 9.591 | 0.045 | n/a | 0.512 | 15.156 | n/a | n/a | 0.037 | 4.031 | 0.129 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000020c | 30.120 | 3.520 | 0.286 | 0.235 | 0.047 | 1.381 | 6.269 | 0.031 | n/a | 0.095 | 18.232 | n/a | n/a | 0.024 | 4.088 | 0.136 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001f6 | 29.204 | 4.696 | 0.186 | 0.539 | 0.073 | 1.552 | 9.145 | 0.045 | n/a | 0.933 | 12.010 | n/a | n/a | 0.026 | 5.494 | 0.188 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000218 | 28.936 | 3.281 | 0.238 | 0.391 | 0.130 | 3.226 | 9.199 | 0.046 | n/a | 0.103 | 12.275 | n/a | n/a | 0.047 | 4.039 | 0.140 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000200 | 28.252 | 3.670 | 0.180 | 0.294 | 0.052 | 1.522 | 10.393 | 0.051 | n/a | 0.144 | 11.923 | n/a | n/a | 0.022 | 4.197 | 0.149 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001dc | 27.362 | 5.768 | 0.177 | 0.000 | 0.051 | 1.320 | 6.842 | 0.051 | n/a | 0.182 | 12.948 | n/a | n/a | 0.024 | 5.995 | 0.219 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001da | 25.320 | 1.730 | n/a | 0.000 | 0.058 | 0.664 | 9.565 | 0.021 | n/a | 0.065 | 13.194 | n/a | n/a | 0.022 | 1.788 | 0.071 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001ec | 23.443 | 3.999 | 0.236 | 0.365 | 0.048 | 1.235 | 6.692 | 0.031 | n/a | 0.081 | 10.726 | n/a | n/a | 0.030 | 4.648 | 0.198 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000021c | 23.010 | 3.283 | 0.245 | 0.220 | 0.038 | 1.249 | 8.074 | 0.031 | n/a | 0.601 | 9.250 | n/a | n/a | 0.018 | 3.786 | 0.165 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000208 | 21.407 | 4.773 | 0.159 | 0.481 | 0.049 | 1.776 | 5.522 | 0.031 | n/a | 0.091 | 8.504 | n/a | n/a | 0.021 | 5.462 | 0.255 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001f1 | 20.076 | 4.132 | n/a | 0.000 | 2.319 | 0.843 | 2.256 | 0.021 | n/a | 0.110 | 10.375 | n/a | n/a | 0.020 | 6.452 | 0.321 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 523b4e10f15ba86500000000000001e0 | 19.776 | 5.237 | 0.286 | 0.526 | 0.056 | 1.786 | 7.374 | 0.030 | n/a | 0.089 | 4.362 | n/a | n/a | 0.031 | 6.105 | 0.309 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.234 | 0.000 | 0.000 | 0.444 | 2.055 | n/a | 0.000 | 0.060 | 0.830 | 1.574 | 0.025 | n/a | 0.483 | 11.794 | n/a | n/a | 0.027 | 2.109 | 0.137 | 0.027 |
| p99 | 83.701 | 1.939 | 0.000 | 0.907 | 4.301 | n/a | 0.000 | 2.729 | 5.268 | 9.565 | 0.050 | n/a | 37.406 | 36.474 | n/a | n/a | 0.078 | 4.723 | 0.371 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba86500000000000001d1 | 83.701 | 2.091 | n/a | 0.000 | 0.076 | 5.268 | 2.312 | 0.033 | n/a | 37.406 | 36.474 | n/a | n/a | 0.041 | 2.167 | 0.026 | 0.041 | gw-w/thread-45/d/transact-async | driver.expected-state.bind-receipt 2.479ms; driver.publication.readback 0.121ms; driver.publication.persist-deferred 0.022ms |
| 523b4e10f15ba86500000000000001da | 25.320 | 1.730 | n/a | 0.000 | 0.058 | 0.664 | 9.565 | 0.021 | n/a | 0.065 | 13.194 | n/a | n/a | 0.022 | 1.788 | 0.071 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001e8 | 19.767 | 2.642 | n/a | 0.000 | 0.063 | 0.849 | 1.126 | 0.020 | n/a | 0.313 | 14.724 | n/a | n/a | 0.031 | 2.705 | 0.137 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000210 | 19.759 | 3.804 | n/a | 0.000 | 0.180 | 1.029 | 1.917 | 0.026 | n/a | 0.836 | 11.889 | n/a | n/a | 0.078 | 3.984 | 0.202 | 0.078 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 523b4e10f15ba86500000000000001cd | 18.849 | 1.925 | n/a | 0.000 | 0.060 | 0.703 | 1.157 | 0.021 | n/a | 0.734 | 14.221 | n/a | n/a | 0.029 | 1.984 | 0.105 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000202 | 18.583 | 2.108 | n/a | 0.000 | 2.248 | 0.830 | 1.657 | 0.043 | n/a | 0.666 | 11.010 | n/a | n/a | 0.020 | 4.356 | 0.234 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000205 | 17.502 | 2.055 | n/a | 0.000 | 0.054 | 1.423 | 1.423 | 0.025 | n/a | 0.438 | 12.050 | n/a | n/a | 0.035 | 2.109 | 0.121 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001f4 | 17.234 | 2.450 | n/a | 0.000 | 0.040 | 0.769 | 1.103 | 0.021 | n/a | 0.960 | 11.866 | n/a | n/a | 0.025 | 2.490 | 0.145 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001e3 | 16.447 | 1.850 | n/a | 0.000 | 0.041 | 0.697 | 1.574 | 0.024 | n/a | 0.442 | 11.794 | n/a | n/a | 0.025 | 1.891 | 0.115 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001e1 | 14.234 | 2.057 | n/a | 0.000 | 0.040 | 0.529 | 2.354 | 0.020 | n/a | 0.411 | 8.796 | n/a | n/a | 0.027 | 2.097 | 0.147 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001cb | 13.884 | 1.807 | n/a | 0.000 | 0.081 | 0.738 | 1.101 | 0.020 | n/a | 0.428 | 9.676 | n/a | n/a | 0.033 | 1.888 | 0.136 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| 523b4e10f15ba86500000000000001fd | 13.297 | 1.999 | n/a | 0.000 | 0.040 | 1.131 | 1.572 | 0.043 | n/a | 0.210 | 8.282 | n/a | n/a | 0.021 | 2.038 | 0.153 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000020a | 13.142 | 1.700 | n/a | 0.000 | 0.054 | 0.730 | 1.591 | 0.025 | n/a | 0.764 | 8.252 | n/a | n/a | 0.025 | 1.754 | 0.133 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000001e6 | 12.719 | 1.995 | n/a | 0.000 | 2.729 | 1.669 | 1.619 | 0.050 | n/a | 0.483 | 4.153 | n/a | n/a | 0.022 | 4.723 | 0.371 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000021a | 12.377 | 4.301 | n/a | 0.000 | 0.107 | 1.179 | 1.242 | 0.049 | n/a | 0.695 | 4.757 | n/a | n/a | 0.047 | 4.408 | 0.356 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.042 | 0.000 | 0.000 | 0.576 | 3.508 | n/a | 0.000 | 0.059 | 1.034 | 2.640 | 0.022 | n/a | 0.293 | 8.130 | n/a | n/a | 0.026 | 3.851 | 0.214 | 0.026 |
| p99 | 51.039 | 2.006 | 0.000 | 1.479 | 8.698 | n/a | 0.445 | 2.456 | 3.895 | 19.549 | 1.660 | n/a | 7.962 | 43.615 | n/a | n/a | 0.079 | 9.322 | 0.358 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba8650000000000000242 | 51.039 | 3.261 | 0.159 | 0.225 | 0.042 | 0.944 | 2.640 | 0.022 | n/a | 0.108 | 43.615 | n/a | n/a | 0.021 | 3.688 | 0.072 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000230 | 43.223 | 5.201 | 0.175 | 0.445 | 0.051 | 1.953 | 16.049 | 0.025 | n/a | 0.406 | 18.892 | n/a | n/a | 0.026 | 5.872 | 0.136 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000027f | 39.488 | 5.092 | 0.207 | 0.430 | 0.059 | 1.593 | 19.549 | 0.042 | n/a | 0.126 | 12.363 | n/a | n/a | 0.027 | 5.788 | 0.147 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000275 | 36.613 | 3.800 | 0.271 | 0.240 | 0.080 | 1.566 | 8.052 | 0.033 | n/a | 0.409 | 22.134 | n/a | n/a | 0.028 | 4.391 | 0.120 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000024c | 35.599 | 8.698 | 0.327 | 0.256 | 0.042 | 1.687 | 9.343 | 0.024 | n/a | 0.073 | 15.127 | n/a | n/a | 0.023 | 9.322 | 0.262 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000246 | 33.115 | 6.061 | n/a | 0.000 | 0.194 | 2.066 | 1.575 | 0.027 | n/a | 7.962 | 15.151 | n/a | n/a | 0.079 | 6.255 | 0.189 | 0.079 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms; driver.publication.persist-deferred 0.052ms |
| 523b4e10f15ba8650000000000000232 | 31.291 | 3.867 | 0.327 | 0.344 | 0.071 | 1.312 | 12.711 | 0.020 | n/a | 1.704 | 10.909 | n/a | n/a | 0.026 | 4.610 | 0.147 | 0.026 | gw-w/thread-48/gateway.admitted-work | none observed |
| 523b4e10f15ba865000000000000027b | 28.227 | 3.487 | 0.183 | 0.266 | 0.100 | 1.150 | 4.706 | 0.021 | n/a | 0.062 | 18.214 | n/a | n/a | 0.038 | 4.036 | 0.143 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000256 | 27.448 | 4.616 | 0.216 | 0.445 | 0.164 | 1.810 | 7.741 | 0.031 | n/a | 0.434 | 11.947 | n/a | n/a | 0.046 | 5.441 | 0.198 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000023c | 27.114 | 4.237 | 0.290 | 0.363 | 0.051 | 1.595 | 11.032 | 0.024 | n/a | 0.119 | 9.378 | n/a | n/a | 0.026 | 4.940 | 0.182 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000021f | 27.029 | 5.074 | 0.241 | 0.415 | 0.019 | 1.371 | 10.515 | 0.029 | n/a | 0.063 | 9.291 | n/a | n/a | 0.012 | 5.748 | 0.213 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000258 | 26.448 | 7.877 | n/a | 0.000 | 0.053 | 0.938 | 1.752 | 0.016 | n/a | 0.105 | 15.677 | n/a | n/a | 0.029 | 7.930 | 0.300 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.070ms |
| 523b4e10f15ba8650000000000000247 | 25.276 | 3.406 | n/a | 0.000 | 0.043 | 3.895 | 0.996 | 0.012 | n/a | 0.059 | 16.840 | n/a | n/a | 0.025 | 3.449 | 0.136 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000229 | 25.161 | 3.680 | 0.263 | 0.246 | 0.043 | 1.144 | 5.243 | 0.024 | n/a | 0.881 | 13.621 | n/a | n/a | 0.018 | 4.231 | 0.168 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000022e | 25.098 | 4.053 | n/a | 0.000 | 0.056 | 1.091 | 7.489 | 0.023 | n/a | 0.062 | 12.258 | n/a | n/a | 0.067 | 4.109 | 0.164 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000240 | 23.194 | 3.611 | 0.181 | 0.428 | 0.052 | 1.424 | 8.114 | 0.026 | n/a | 0.515 | 8.817 | n/a | n/a | 0.026 | 4.271 | 0.184 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000025a | 22.793 | 3.379 | 0.166 | 0.402 | 0.046 | 1.109 | 5.786 | 0.025 | n/a | 0.087 | 11.773 | n/a | n/a | 0.021 | 3.993 | 0.175 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000225 | 21.513 | 5.235 | n/a | 0.000 | 0.100 | 2.229 | 2.283 | 0.043 | n/a | 1.019 | 10.565 | n/a | n/a | 0.039 | 5.335 | 0.248 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000236 | 20.131 | 3.944 | n/a | 0.000 | 2.456 | 0.792 | 7.140 | 0.017 | n/a | 0.105 | 5.654 | n/a | n/a | 0.023 | 6.399 | 0.318 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000267 | 19.601 | 3.283 | 0.176 | 0.252 | 0.053 | 3.863 | 4.230 | 0.022 | n/a | 0.072 | 7.627 | n/a | n/a | 0.024 | 3.763 | 0.192 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.358 | 0.000 | 0.000 | 0.524 | 2.630 | n/a | 0.000 | 0.066 | 0.806 | 1.311 | 0.017 | n/a | 0.293 | 5.970 | n/a | n/a | 0.033 | 2.706 | 0.216 | 0.033 |
| p99 | 25.276 | 0.994 | 0.000 | 0.950 | 3.787 | n/a | 0.000 | 0.157 | 3.895 | 5.364 | 1.660 | n/a | 3.504 | 16.840 | n/a | n/a | 0.052 | 3.836 | 0.355 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba8650000000000000247 | 25.276 | 3.406 | n/a | 0.000 | 0.043 | 3.895 | 0.996 | 0.012 | n/a | 0.059 | 16.840 | n/a | n/a | 0.025 | 3.449 | 0.136 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000279 | 19.303 | 2.204 | n/a | 0.000 | 0.066 | 0.967 | 4.984 | 0.023 | n/a | 0.127 | 10.895 | n/a | n/a | 0.037 | 2.270 | 0.118 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000022c | 15.908 | 2.522 | n/a | 0.000 | 0.048 | 0.734 | 1.311 | 0.016 | n/a | 0.396 | 10.857 | n/a | n/a | 0.025 | 2.570 | 0.162 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000223 | 15.795 | 3.275 | n/a | 0.000 | 0.131 | 0.806 | 1.421 | 0.019 | n/a | 3.504 | 6.592 | n/a | n/a | 0.048 | 3.407 | 0.216 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 523b4e10f15ba8650000000000000233 | 15.661 | 1.933 | n/a | 0.000 | 0.070 | 0.729 | 0.958 | 0.014 | n/a | 0.364 | 11.566 | n/a | n/a | 0.025 | 2.004 | 0.128 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000021e | 15.180 | 3.787 | n/a | 0.000 | 0.049 | 1.455 | 3.955 | 1.660 | n/a | 0.574 | 3.677 | n/a | n/a | 0.024 | 3.836 | 0.253 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000026b | 14.002 | 3.063 | n/a | 0.000 | 0.153 | 1.000 | 1.433 | 0.033 | n/a | 0.150 | 8.130 | n/a | n/a | 0.039 | 3.216 | 0.230 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000266 | 13.887 | 3.721 | n/a | 0.000 | 0.048 | 1.363 | 5.364 | 0.041 | n/a | 0.106 | 3.220 | n/a | n/a | 0.024 | 3.769 | 0.271 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000273 | 13.358 | 3.508 | n/a | 0.000 | 0.157 | 0.859 | 4.250 | 0.019 | n/a | 0.081 | 4.431 | n/a | n/a | 0.052 | 3.665 | 0.274 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000227 | 11.590 | 2.258 | n/a | 0.000 | 0.036 | 0.940 | 1.560 | 0.029 | n/a | 0.643 | 6.104 | n/a | n/a | 0.021 | 2.293 | 0.198 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000025b | 11.323 | 2.162 | n/a | 0.000 | 0.091 | 0.552 | 1.081 | 0.014 | n/a | 0.067 | 7.318 | n/a | n/a | 0.038 | 2.253 | 0.199 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000027d | 10.798 | 2.524 | n/a | 0.000 | 0.112 | 0.769 | 0.996 | 0.014 | n/a | 0.572 | 5.766 | n/a | n/a | 0.045 | 2.636 | 0.244 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000023d | 10.538 | 2.187 | n/a | 0.000 | 0.051 | 0.803 | 1.084 | 0.017 | n/a | 0.402 | 5.970 | n/a | n/a | 0.025 | 2.237 | 0.212 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba865000000000000025d | 8.875 | 2.800 | n/a | 0.000 | 0.066 | 0.557 | 0.906 | 0.015 | n/a | 0.293 | 4.203 | n/a | n/a | 0.033 | 2.866 | 0.323 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000251 | 8.798 | 3.046 | n/a | 0.000 | 0.075 | 0.813 | 1.435 | 0.017 | n/a | 0.399 | 2.977 | n/a | n/a | 0.037 | 3.120 | 0.355 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000261 | 8.387 | 2.630 | n/a | 0.000 | 0.076 | 0.679 | 1.143 | 0.015 | n/a | 0.094 | 3.715 | n/a | n/a | 0.034 | 2.706 | 0.323 | 0.034 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.753 | 0.000 | 0.000 | 0.442 | 3.220 | n/a | 0.000 | 0.053 | 1.006 | 2.423 | 0.024 | n/a | 0.161 | 8.249 | n/a | n/a | 0.025 | 3.467 | 0.189 | 0.025 |
| p99 | 58.485 | 1.688 | 0.010 | 1.417 | 6.218 | n/a | 0.486 | 2.213 | 4.927 | 18.632 | 0.063 | n/a | 4.409 | 44.776 | n/a | n/a | 0.061 | 6.823 | 0.455 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba86500000000000002cd | 58.485 | 3.812 | 1.073 | 0.308 | 0.062 | 1.329 | 6.742 | 0.031 | n/a | 0.325 | 44.776 | n/a | n/a | 0.027 | 5.255 | 0.090 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000290 | 36.950 | 2.995 | 0.164 | 0.263 | 0.045 | 1.053 | 14.586 | 0.063 | n/a | 4.409 | 13.354 | n/a | n/a | 0.018 | 3.467 | 0.094 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002ac | 35.069 | 1.826 | n/a | 0.000 | 0.055 | 1.418 | 1.232 | 0.017 | n/a | 0.364 | 30.129 | n/a | n/a | 0.028 | 1.882 | 0.054 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002b6 | 33.249 | 5.290 | 0.252 | 0.000 | 0.134 | 1.436 | 18.632 | 0.031 | n/a | 0.113 | 7.320 | n/a | n/a | 0.042 | 5.675 | 0.171 | 0.042 | gw-w/thread-46/gateway.admitted-work | none observed |
| 523b4e10f15ba86500000000000002be | 31.202 | 3.293 | 0.281 | 0.409 | 0.055 | 1.565 | 8.978 | 0.048 | n/a | 0.429 | 16.121 | n/a | n/a | 0.024 | 4.037 | 0.129 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000285 | 30.127 | 3.675 | 0.222 | 0.362 | 0.050 | 1.162 | 14.754 | 0.024 | n/a | 0.071 | 9.784 | n/a | n/a | 0.024 | 4.308 | 0.143 | 0.024 | gw-w/thread-49/gateway.admitted-work | none observed |
| 523b4e10f15ba865000000000000028e | 27.705 | 4.610 | n/a | 0.000 | 2.213 | 0.696 | 2.035 | 0.014 | n/a | 0.382 | 17.728 | n/a | n/a | 0.027 | 6.823 | 0.246 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002a6 | 26.888 | 4.907 | 0.294 | 0.000 | 0.137 | 1.576 | 6.502 | 0.023 | n/a | 0.118 | 13.286 | n/a | n/a | 0.044 | 5.339 | 0.199 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000289 | 26.864 | 4.557 | 0.180 | 0.411 | 0.045 | 1.571 | 6.391 | 0.033 | n/a | 0.493 | 13.161 | n/a | n/a | 0.021 | 5.193 | 0.193 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000298 | 26.491 | 3.220 | 0.222 | 0.409 | 0.122 | 1.013 | 8.751 | 0.026 | n/a | 0.306 | 12.377 | n/a | n/a | 0.045 | 3.973 | 0.150 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000287 | 26.434 | 2.912 | n/a | 0.000 | 0.052 | 0.897 | 5.202 | 0.037 | n/a | 0.115 | 17.195 | n/a | n/a | 0.025 | 2.964 | 0.112 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002d3 | 24.558 | 3.525 | 0.268 | 0.287 | 0.054 | 1.391 | 8.018 | 0.036 | n/a | 0.153 | 10.802 | n/a | n/a | 0.023 | 4.134 | 0.168 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002b2 | 24.427 | 3.060 | 0.162 | 0.000 | 0.049 | 1.068 | 5.282 | 0.023 | n/a | 0.073 | 14.690 | n/a | n/a | 0.022 | 3.270 | 0.134 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000296 | 23.396 | 5.342 | 0.363 | 0.486 | 0.052 | 2.079 | 5.816 | 0.043 | n/a | 0.156 | 9.036 | n/a | n/a | 0.025 | 6.242 | 0.267 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002aa | 23.209 | 3.696 | 0.221 | 0.000 | 0.098 | 1.006 | 4.797 | 0.021 | n/a | 0.092 | 13.233 | n/a | n/a | 0.045 | 4.015 | 0.173 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002a2 | 22.885 | 3.217 | 0.196 | 0.282 | 0.053 | 1.290 | 5.589 | 0.032 | n/a | 0.113 | 12.093 | n/a | n/a | 0.021 | 3.748 | 0.164 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002d5 | 22.043 | 3.491 | 0.233 | 0.389 | 0.043 | 1.212 | 3.023 | 0.044 | n/a | 0.281 | 13.303 | n/a | n/a | 0.024 | 4.156 | 0.189 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002ba | 20.558 | 4.870 | 0.159 | 0.000 | 0.053 | 1.645 | 4.692 | 0.022 | n/a | 0.363 | 8.729 | n/a | n/a | 0.025 | 5.083 | 0.247 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000294 | 18.937 | 3.346 | n/a | 0.000 | 0.035 | 0.551 | 1.360 | 0.015 | n/a | 0.118 | 13.490 | n/a | n/a | 0.022 | 3.381 | 0.179 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002b0 | 18.787 | 3.145 | 0.147 | 0.000 | 0.049 | 0.951 | 5.445 | 0.034 | n/a | 0.147 | 8.847 | n/a | n/a | 0.021 | 3.342 | 0.178 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.898 | 0.000 | 0.000 | 0.451 | 2.008 | n/a | 0.000 | 0.054 | 0.803 | 1.395 | 0.019 | n/a | 0.320 | 6.837 | n/a | n/a | 0.028 | 2.054 | 0.183 | 0.028 |
| p99 | 35.069 | 1.688 | 0.010 | 0.793 | 4.019 | n/a | 0.000 | 0.142 | 4.927 | 7.349 | 0.048 | n/a | 0.887 | 30.129 | n/a | n/a | 0.061 | 4.161 | 0.233 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba86500000000000002ac | 35.069 | 1.826 | n/a | 0.000 | 0.055 | 1.418 | 1.232 | 0.017 | n/a | 0.364 | 30.129 | n/a | n/a | 0.028 | 1.882 | 0.054 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000283 | 17.922 | 4.019 | n/a | 0.000 | 0.142 | 0.867 | 1.664 | 0.020 | n/a | 0.094 | 11.056 | n/a | n/a | 0.061 | 4.161 | 0.232 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000299 | 15.719 | 2.270 | n/a | 0.000 | 0.081 | 4.167 | 1.395 | 0.026 | n/a | 0.125 | 7.611 | n/a | n/a | 0.045 | 2.351 | 0.150 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002bb | 14.747 | 3.260 | n/a | 0.000 | 0.128 | 0.803 | 1.092 | 0.018 | n/a | 0.470 | 8.924 | n/a | n/a | 0.052 | 3.388 | 0.230 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002ca | 14.649 | 2.179 | n/a | 0.000 | 0.049 | 4.927 | 7.349 | 0.048 | n/a | 0.069 | 0.000 | n/a | n/a | 0.027 | 2.228 | 0.152 | 0.027 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.041ms |
| 523b4e10f15ba865000000000000029c | 12.188 | 2.068 | n/a | 0.000 | 0.119 | 1.807 | 2.712 | 0.037 | n/a | 0.887 | 4.504 | n/a | n/a | 0.054 | 2.187 | 0.179 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002a0 | 11.904 | 1.950 | n/a | 0.000 | 0.054 | 0.746 | 1.221 | 0.019 | n/a | 0.352 | 7.535 | n/a | n/a | 0.028 | 2.004 | 0.168 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 523b4e10f15ba86500000000000002b8 | 11.898 | 2.387 | n/a | 0.000 | 0.069 | 1.397 | 2.247 | 0.038 | n/a | 0.885 | 4.838 | n/a | n/a | 0.037 | 2.457 | 0.206 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002bf | 11.628 | 2.660 | n/a | 0.000 | 0.044 | 0.932 | 1.135 | 0.019 | n/a | 0.124 | 6.687 | n/a | n/a | 0.029 | 2.704 | 0.233 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002b4 | 11.488 | 1.847 | n/a | 0.000 | 0.057 | 0.619 | 1.285 | 0.015 | n/a | 0.320 | 7.318 | n/a | n/a | 0.025 | 1.905 | 0.166 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002a4 | 11.361 | 1.845 | n/a | 0.000 | 0.045 | 0.700 | 1.592 | 0.035 | n/a | 0.193 | 6.930 | n/a | n/a | 0.022 | 1.891 | 0.166 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000280 | 11.217 | 2.008 | n/a | 0.000 | 0.046 | 0.485 | 1.402 | 0.014 | n/a | 0.400 | 6.837 | n/a | n/a | 0.024 | 2.054 | 0.183 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 523b4e10f15ba8650000000000000291 | 9.875 | 1.978 | n/a | 0.000 | 0.054 | 0.573 | 1.212 | 0.019 | n/a | 0.429 | 5.580 | n/a | n/a | 0.029 | 2.032 | 0.206 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002c6 | 9.551 | 1.857 | n/a | 0.000 | 0.052 | 0.591 | 1.089 | 0.016 | n/a | 0.149 | 5.772 | n/a | n/a | 0.026 | 1.908 | 0.200 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000002c3 | 7.679 | 1.442 | n/a | 0.000 | 0.032 | 0.704 | 1.454 | 0.027 | n/a | 0.161 | 3.844 | n/a | n/a | 0.015 | 1.474 | 0.192 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (843 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.705 | 0.320 | 0.000 | 0.522 | 2.246 | n/a | 0.000 | 0.046 | 0.618 | 1.049 | 0.014 | n/a | 0.108 | 6.005 | n/a | n/a | 0.017 | 2.507 | 0.228 | 0.017 |
| p99 | 44.266 | 2.006 | 0.026 | 1.926 | 6.920 | n/a | 0.260 | 16.068 | 6.245 | 6.703 | 0.054 | n/a | 3.571 | 32.601 | n/a | n/a | 0.055 | 19.398 | 0.570 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba865000000000000032a | 75.131 | 2.224 | n/a | 0.000 | 29.808 | 0.366 | 0.748 | 0.013 | n/a | 0.047 | 41.884 | n/a | n/a | 0.042 | 32.031 | 0.426 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.057ms; driver.publication.readback 0.054ms; driver.publication.readback 0.052ms; driver.publication.readback 0.050ms; driver.publication.readback 0.034ms |
| 523b4e10f15ba86500000000000005cb | 52.257 | 1.413 | n/a | 0.000 | 26.762 | 0.567 | 1.512 | 0.026 | n/a | 0.132 | 21.835 | n/a | n/a | 0.010 | 28.175 | 0.539 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.151ms; driver.reader-basis.broadcast 0.060ms; driver.publication.readback 0.053ms; driver.publication.readback 0.049ms; driver.publication.readback 0.047ms |
| 523b4e10f15ba86500000000000002df | 51.236 | 7.953 | n/a | 0.000 | 0.047 | 3.801 | 6.277 | 0.090 | n/a | 0.446 | 32.601 | n/a | n/a | 0.022 | 8.000 | 0.156 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000504 | 48.421 | 3.477 | n/a | 0.000 | 26.255 | 5.881 | 1.153 | 0.023 | n/a | 1.330 | 10.258 | n/a | n/a | 0.043 | 29.732 | 0.614 | 0.043 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.137ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.018ms |
| 523b4e10f15ba86500000000000005c3 | 48.336 | 3.611 | n/a | 0.000 | 17.535 | 0.559 | 1.326 | 0.013 | n/a | 0.087 | 25.193 | n/a | n/a | 0.012 | 21.146 | 0.437 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.023ms |
| 523b4e10f15ba8650000000000000451 | 47.511 | 4.107 | n/a | 0.000 | 0.385 | 0.932 | 1.783 | 0.048 | n/a | 0.185 | 40.042 | n/a | n/a | 0.028 | 4.492 | 0.095 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.178ms; driver.publication.persist-deferred 0.054ms |
| 523b4e10f15ba8650000000000000892 | 45.877 | 2.338 | n/a | 0.000 | 0.026 | 0.779 | 1.783 | 0.016 | n/a | 1.131 | 39.789 | n/a | n/a | 0.015 | 2.364 | 0.052 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| 523b4e10f15ba8650000000000000503 | 44.928 | 3.332 | n/a | 0.000 | 0.420 | 33.601 | 1.133 | 0.024 | n/a | 0.335 | 6.063 | n/a | n/a | 0.020 | 3.753 | 0.084 | 0.020 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.087ms; driver.publication.persist-deferred 0.044ms |
| 523b4e10f15ba8650000000000000907 | 44.266 | 1.821 | n/a | 0.000 | 19.768 | 1.385 | 0.885 | 0.013 | n/a | 0.096 | 20.286 | n/a | n/a | 0.011 | 21.590 | 0.488 | 0.011 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.228ms; driver.publication.readback 0.149ms; driver.publication.readback 0.103ms; driver.publication.persist-deferred 0.091ms; driver.publication.readback 0.041ms |
| 523b4e10f15ba8650000000000000893 | 43.655 | 1.495 | n/a | 0.000 | 0.491 | 1.392 | 0.849 | 0.004 | n/a | 0.020 | 39.395 | n/a | n/a | 0.008 | 1.986 | 0.045 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000820 | 43.036 | 9.232 | n/a | 1.869 | 1.239 | 6.483 | 4.169 | 0.046 | n/a | 0.223 | 19.759 | n/a | n/a | 0.016 | 12.340 | 0.287 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.560ms; driver.publication.readback 0.283ms; driver.publication.readback 0.055ms; driver.publication.readback 0.046ms; driver.publication.readback 0.042ms |
| 523b4e10f15ba865000000000000090a | 42.051 | 1.733 | n/a | 0.000 | 29.495 | 0.408 | 0.780 | 0.013 | n/a | 0.083 | 9.528 | n/a | n/a | 0.012 | 31.228 | 0.743 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.149ms; driver.publication.persist-deferred 0.091ms; driver.publication.readback 0.063ms; driver.publication.readback 0.046ms; driver.publication.readback 0.041ms |
| 523b4e10f15ba86500000000000005c6 | 39.264 | 1.020 | n/a | 0.000 | 0.012 | 0.880 | 0.707 | 0.005 | n/a | 0.044 | 36.587 | n/a | n/a | 0.008 | 1.033 | 0.026 | 0.008 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.008ms |
| 523b4e10f15ba8650000000000000506 | 39.193 | 1.479 | n/a | 0.000 | 23.043 | 0.458 | 1.819 | 0.030 | n/a | 0.802 | 11.540 | n/a | n/a | 0.022 | 24.523 | 0.626 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.137ms; driver.publication.readback 0.058ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.018ms |
| 523b4e10f15ba86500000000000003b1 | 38.914 | 2.067 | n/a | 0.000 | 0.038 | 0.675 | 0.962 | 0.016 | n/a | 0.083 | 35.057 | n/a | n/a | 0.016 | 2.105 | 0.054 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000005c8 | 38.682 | 3.120 | n/a | 0.000 | 3.052 | 1.033 | 0.931 | 0.010 | n/a | 0.035 | 30.461 | n/a | n/a | 0.040 | 6.172 | 0.160 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.151ms; driver.publication.readback 0.056ms; driver.publication.readback 0.053ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.024ms |
| 523b4e10f15ba86500000000000005c7 | 38.515 | 5.999 | n/a | 0.000 | 0.081 | 0.957 | 2.542 | 0.029 | n/a | 0.686 | 28.186 | n/a | n/a | 0.037 | 6.080 | 0.158 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.readback 0.053ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.016ms |
| 523b4e10f15ba8650000000000000509 | 38.418 | 2.802 | n/a | 0.000 | 16.068 | 6.434 | 0.968 | 0.018 | n/a | 0.101 | 12.013 | n/a | n/a | 0.014 | 18.870 | 0.491 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.058ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.028ms; driver.publication.readback 0.026ms |
| 523b4e10f15ba865000000000000081f | 37.690 | 5.713 | n/a | 0.000 | 13.685 | 0.593 | 1.305 | 0.009 | n/a | 4.798 | 11.531 | n/a | n/a | 0.056 | 19.398 | 0.515 | 0.056 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.055ms; driver.publication.readback 0.046ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.018ms |
| 523b4e10f15ba865000000000000043e | 37.674 | 2.661 | n/a | 0.000 | 0.031 | 0.451 | 1.722 | 0.007 | n/a | 0.028 | 32.760 | n/a | n/a | 0.014 | 2.692 | 0.071 | 0.014 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.021ms |

## P2 / L1024 / commit / 5-10 facts (489 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.386 | 0.000 | 0.000 | 0.404 | 1.787 | n/a | 0.000 | 0.049 | 0.613 | 0.925 | 0.013 | n/a | 0.106 | 5.391 | n/a | n/a | 0.018 | 2.055 | 0.210 | 0.018 |
| p99 | 47.511 | 2.001 | 0.004 | 0.912 | 5.058 | n/a | 0.000 | 23.043 | 6.069 | 5.718 | 0.071 | n/a | 3.545 | 33.071 | n/a | n/a | 0.073 | 24.523 | 0.582 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba865000000000000032a | 75.131 | 2.224 | n/a | 0.000 | 29.808 | 0.366 | 0.748 | 0.013 | n/a | 0.047 | 41.884 | n/a | n/a | 0.042 | 32.031 | 0.426 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.057ms; driver.publication.readback 0.054ms; driver.publication.readback 0.052ms; driver.publication.readback 0.050ms; driver.publication.readback 0.034ms |
| 523b4e10f15ba86500000000000005cb | 52.257 | 1.413 | n/a | 0.000 | 26.762 | 0.567 | 1.512 | 0.026 | n/a | 0.132 | 21.835 | n/a | n/a | 0.010 | 28.175 | 0.539 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.151ms; driver.reader-basis.broadcast 0.060ms; driver.publication.readback 0.053ms; driver.publication.readback 0.049ms; driver.publication.readback 0.047ms |
| 523b4e10f15ba86500000000000002df | 51.236 | 7.953 | n/a | 0.000 | 0.047 | 3.801 | 6.277 | 0.090 | n/a | 0.446 | 32.601 | n/a | n/a | 0.022 | 8.000 | 0.156 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000504 | 48.421 | 3.477 | n/a | 0.000 | 26.255 | 5.881 | 1.153 | 0.023 | n/a | 1.330 | 10.258 | n/a | n/a | 0.043 | 29.732 | 0.614 | 0.043 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.137ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.018ms |
| 523b4e10f15ba8650000000000000451 | 47.511 | 4.107 | n/a | 0.000 | 0.385 | 0.932 | 1.783 | 0.048 | n/a | 0.185 | 40.042 | n/a | n/a | 0.028 | 4.492 | 0.095 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.178ms; driver.publication.persist-deferred 0.054ms |
| 523b4e10f15ba865000000000000090a | 42.051 | 1.733 | n/a | 0.000 | 29.495 | 0.408 | 0.780 | 0.013 | n/a | 0.083 | 9.528 | n/a | n/a | 0.012 | 31.228 | 0.743 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.149ms; driver.publication.persist-deferred 0.091ms; driver.publication.readback 0.063ms; driver.publication.readback 0.046ms; driver.publication.readback 0.041ms |
| 523b4e10f15ba86500000000000005c6 | 39.264 | 1.020 | n/a | 0.000 | 0.012 | 0.880 | 0.707 | 0.005 | n/a | 0.044 | 36.587 | n/a | n/a | 0.008 | 1.033 | 0.026 | 0.008 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.008ms |
| 523b4e10f15ba8650000000000000506 | 39.193 | 1.479 | n/a | 0.000 | 23.043 | 0.458 | 1.819 | 0.030 | n/a | 0.802 | 11.540 | n/a | n/a | 0.022 | 24.523 | 0.626 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.137ms; driver.publication.readback 0.058ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.018ms |
| 523b4e10f15ba86500000000000003b1 | 38.914 | 2.067 | n/a | 0.000 | 0.038 | 0.675 | 0.962 | 0.016 | n/a | 0.083 | 35.057 | n/a | n/a | 0.016 | 2.105 | 0.054 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba86500000000000005c8 | 38.682 | 3.120 | n/a | 0.000 | 3.052 | 1.033 | 0.931 | 0.010 | n/a | 0.035 | 30.461 | n/a | n/a | 0.040 | 6.172 | 0.160 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.151ms; driver.publication.readback 0.056ms; driver.publication.readback 0.053ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.024ms |
| 523b4e10f15ba86500000000000003b2 | 36.847 | 1.637 | n/a | 0.000 | 0.020 | 1.457 | 0.571 | 0.009 | n/a | 0.074 | 33.071 | n/a | n/a | 0.010 | 1.656 | 0.045 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.033ms |
| 523b4e10f15ba86500000000000007f3 | 35.834 | 4.427 | n/a | 0.000 | 0.404 | 7.574 | 4.730 | 0.006 | n/a | 0.017 | 18.666 | n/a | n/a | 0.010 | 4.830 | 0.135 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.148ms; driver.publication.readback 0.129ms; driver.publication.readback 0.115ms; driver.publication.readback 0.042ms |
| 523b4e10f15ba8650000000000000443 | 35.179 | 1.661 | n/a | 0.000 | 3.602 | 0.297 | 0.906 | 0.010 | n/a | 0.055 | 28.629 | n/a | n/a | 0.019 | 5.263 | 0.150 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.readback 0.064ms; driver.publication.readback 0.064ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.021ms |
| 523b4e10f15ba865000000000000050c | 34.689 | 2.046 | n/a | 0.000 | 0.025 | 8.103 | 0.625 | 0.014 | n/a | 0.093 | 23.769 | n/a | n/a | 0.014 | 2.072 | 0.060 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.018ms |
| 523b4e10f15ba865000000000000067e | 34.083 | 2.648 | n/a | 0.000 | 1.024 | 1.862 | 0.991 | 0.014 | n/a | 0.053 | 27.474 | n/a | n/a | 0.017 | 3.672 | 0.108 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.035ms |
| 523b4e10f15ba865000000000000081c | 33.052 | 1.690 | n/a | 0.000 | 17.532 | 0.484 | 1.530 | 0.019 | n/a | 0.161 | 11.624 | n/a | n/a | 0.013 | 19.222 | 0.582 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.330ms; driver.reader-basis.broadcast 0.098ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.031ms; driver.publication.readback 0.027ms |
| 523b4e10f15ba86500000000000005ce | 31.498 | 1.369 | n/a | 0.000 | 0.069 | 1.257 | 1.124 | 0.022 | n/a | 0.095 | 27.549 | n/a | n/a | 0.014 | 1.438 | 0.046 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.151ms; driver.reader-basis.broadcast 0.060ms; driver.publication.readback 0.049ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.018ms |
| 523b4e10f15ba8650000000000000909 | 30.480 | 2.354 | n/a | 0.000 | 0.053 | 0.717 | 3.448 | 0.013 | n/a | 0.521 | 23.348 | n/a | n/a | 0.026 | 2.406 | 0.079 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.publication.persist-deferred 0.091ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.021ms |
| 523b4e10f15ba8650000000000000328 | 30.455 | 1.524 | n/a | 0.000 | 0.026 | 0.332 | 1.491 | 0.036 | n/a | 0.168 | 26.865 | n/a | n/a | 0.013 | 1.550 | 0.051 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000000370 | 30.322 | 1.624 | n/a | 0.000 | 9.706 | 1.846 | 1.587 | 0.010 | n/a | 0.219 | 15.319 | n/a | n/a | 0.011 | 11.330 | 0.374 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.022ms |

## P2 / tail / commit (2625 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.488 | 0.242 | 0.000 | 0.513 | 2.181 | n/a | 0.000 | 0.037 | 0.541 | 0.926 | 0.012 | n/a | 0.085 | 4.595 | n/a | n/a | 0.013 | 2.452 | 0.264 | 0.013 |
| p99 | 44.913 | 2.014 | 0.041 | 1.998 | 6.748 | n/a | 0.000 | 12.278 | 6.276 | 6.282 | 0.047 | n/a | 2.031 | 30.927 | n/a | n/a | 0.042 | 14.828 | 0.653 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba865000000000000105e | 92.751 | 3.453 | 6.989 | 0.000 | 0.020 | 2.440 | 10.400 | 0.025 | n/a | 0.068 | 69.350 | n/a | n/a | 0.007 | 10.462 | 0.113 | 0.007 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms |
| 523b4e10f15ba8650000000000001063 | 86.241 | 2.170 | n/a | 0.000 | 51.738 | 0.308 | 0.795 | 0.007 | n/a | 0.056 | 31.158 | n/a | n/a | 0.009 | 53.908 | 0.625 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.112ms; driver.publication.readback 0.105ms |
| 523b4e10f15ba8650000000000001066 | 74.632 | 1.368 | n/a | 0.000 | 40.838 | 0.456 | 1.245 | 0.011 | n/a | 0.084 | 30.612 | n/a | n/a | 0.017 | 42.206 | 0.566 | 0.017 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.112ms; driver.publication.readback 0.105ms |
| 523b4e10f15ba865000000000000105f | 73.009 | 4.219 | n/a | 0.000 | 0.385 | 0.337 | 1.082 | 0.008 | n/a | 0.317 | 66.648 | n/a | n/a | 0.013 | 4.604 | 0.063 | 0.013 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.016ms |
| 523b4e10f15ba8650000000000000cfa | 62.574 | 5.038 | n/a | 0.000 | 0.054 | 47.225 | 2.331 | 0.034 | n/a | 0.118 | 7.759 | n/a | n/a | 0.015 | 5.092 | 0.081 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.071ms; driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.056ms; driver.publication.persist-deferred 0.018ms |
| 523b4e10f15ba8650000000000000cf8 | 62.415 | 4.440 | n/a | 0.000 | 0.037 | 45.210 | 1.599 | 0.032 | n/a | 0.203 | 10.877 | n/a | n/a | 0.017 | 4.477 | 0.072 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.020ms |
| 523b4e10f15ba8650000000000001c30 | 61.467 | 1.395 | n/a | 0.000 | 14.219 | 1.607 | 0.772 | 0.016 | n/a | 0.031 | 43.419 | n/a | n/a | 0.009 | 15.614 | 0.254 | 0.009 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.267ms; driver.publication.readback 0.076ms; driver.publication.readback 0.049ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.034ms |
| 523b4e10f15ba8650000000000001064 | 61.031 | 1.720 | n/a | 0.000 | 0.009 | 0.947 | 1.507 | 0.049 | n/a | 0.213 | 56.578 | n/a | n/a | 0.009 | 1.729 | 0.028 | 0.009 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.105ms; driver.publication.readback 0.054ms |
| 523b4e10f15ba865000000000000105b | 60.304 | 5.247 | n/a | 0.000 | 0.062 | 0.712 | 3.308 | 0.012 | n/a | 1.086 | 49.854 | n/a | n/a | 0.023 | 5.309 | 0.088 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.016ms |
| 523b4e10f15ba8650000000000001060 | 59.976 | 2.203 | n/a | 0.000 | 0.086 | 3.416 | 0.572 | 0.009 | n/a | 0.221 | 53.440 | n/a | n/a | 0.028 | 2.289 | 0.038 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms; driver.publication.readback 0.041ms |
| 523b4e10f15ba8650000000000001061 | 59.438 | 1.676 | n/a | 0.000 | 0.035 | 0.486 | 1.276 | 0.024 | n/a | 0.618 | 55.306 | n/a | n/a | 0.017 | 1.712 | 0.029 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms |
| 523b4e10f15ba8650000000000001065 | 58.471 | 1.777 | n/a | 0.000 | 0.028 | 1.981 | 0.935 | 0.043 | n/a | 1.436 | 52.260 | n/a | n/a | 0.011 | 1.805 | 0.031 | 0.011 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.112ms; driver.publication.readback 0.105ms |
| 523b4e10f15ba8650000000000001b1b | 56.647 | 5.445 | n/a | 0.000 | 0.115 | 41.782 | 2.253 | 0.021 | n/a | 0.057 | 6.956 | n/a | n/a | 0.018 | 5.560 | 0.098 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.687ms |
| 523b4e10f15ba8650000000000001b1d | 55.841 | 3.102 | n/a | 0.000 | 27.798 | 10.183 | 1.649 | 0.029 | n/a | 0.105 | 12.961 | n/a | n/a | 0.013 | 30.900 | 0.553 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.083ms; driver.reader-basis.broadcast 0.687ms; driver.publication.readback 0.064ms; driver.publication.readback 0.029ms; driver.publication.persist-deferred 0.021ms |
| 523b4e10f15ba8650000000000000cfb | 55.834 | 1.592 | n/a | 0.000 | 41.051 | 6.083 | 0.383 | 0.005 | n/a | 0.185 | 6.523 | n/a | n/a | 0.012 | 42.643 | 0.764 | 0.012 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.071ms; driver.publication.readback 0.068ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.056ms |
| 523b4e10f15ba8650000000000001b1e | 55.670 | 4.126 | n/a | 0.000 | 25.474 | 11.637 | 1.013 | 0.009 | n/a | 0.021 | 13.386 | n/a | n/a | 0.004 | 29.599 | 0.532 | 0.004 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.083ms; driver.reader-basis.broadcast 0.687ms; driver.publication.readback 0.064ms; driver.publication.readback 0.056ms; driver.publication.readback 0.029ms |
| 523b4e10f15ba86500000000000013a3 | 55.072 | 6.122 | n/a | 0.000 | 0.102 | 7.081 | 35.593 | 0.059 | n/a | 0.329 | 5.755 | n/a | n/a | 0.031 | 6.224 | 0.113 | 0.031 | gw-w/thread-47/journal/entity | driver.reader-basis.broadcast 0.560ms; driver.publication.readback 0.111ms; driver.publication.readback 0.085ms; driver.publication.persist-deferred 0.043ms; driver.publication.persist-deferred 0.017ms |
| 523b4e10f15ba865000000000000105d | 54.947 | 1.226 | n/a | 0.000 | 0.018 | 0.428 | 1.300 | 0.017 | n/a | 0.359 | 51.588 | n/a | n/a | 0.010 | 1.244 | 0.023 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.015ms |
| 523b4e10f15ba8650000000000000bf3 | 53.996 | 3.138 | 0.916 | 0.000 | 0.045 | 1.099 | 9.065 | 0.030 | n/a | 0.087 | 39.600 | n/a | n/a | 0.016 | 4.099 | 0.076 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.155ms; driver.publication.persist-deferred 0.017ms |
| 523b4e10f15ba8650000000000001b1c | 52.074 | 5.772 | n/a | 0.000 | 0.142 | 36.784 | 1.013 | 0.011 | n/a | 0.042 | 8.276 | n/a | n/a | 0.033 | 5.915 | 0.114 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.083ms; driver.reader-basis.broadcast 0.687ms |

## P2 / tail / commit / 5-10 facts (1559 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.410 | 0.000 | 0.000 | 0.393 | 1.737 | n/a | 0.000 | 0.036 | 0.531 | 0.793 | 0.012 | n/a | 0.087 | 4.174 | n/a | n/a | 0.013 | 1.957 | 0.239 | 0.013 |
| p99 | 39.866 | 1.991 | 0.038 | 0.948 | 5.232 | n/a | 0.000 | 10.726 | 5.880 | 3.737 | 0.049 | n/a | 1.714 | 25.197 | n/a | n/a | 0.041 | 13.510 | 0.665 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 523b4e10f15ba8650000000000001066 | 74.632 | 1.368 | n/a | 0.000 | 40.838 | 0.456 | 1.245 | 0.011 | n/a | 0.084 | 30.612 | n/a | n/a | 0.017 | 42.206 | 0.566 | 0.017 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.112ms; driver.publication.readback 0.105ms |
| 523b4e10f15ba8650000000000001c30 | 61.467 | 1.395 | n/a | 0.000 | 14.219 | 1.607 | 0.772 | 0.016 | n/a | 0.031 | 43.419 | n/a | n/a | 0.009 | 15.614 | 0.254 | 0.009 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.267ms; driver.publication.readback 0.076ms; driver.publication.readback 0.049ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.034ms |
| 523b4e10f15ba8650000000000001064 | 61.031 | 1.720 | n/a | 0.000 | 0.009 | 0.947 | 1.507 | 0.049 | n/a | 0.213 | 56.578 | n/a | n/a | 0.009 | 1.729 | 0.028 | 0.009 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.105ms; driver.publication.readback 0.054ms |
| 523b4e10f15ba8650000000000001060 | 59.976 | 2.203 | n/a | 0.000 | 0.086 | 3.416 | 0.572 | 0.009 | n/a | 0.221 | 53.440 | n/a | n/a | 0.028 | 2.289 | 0.038 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms; driver.publication.readback 0.041ms |
| 523b4e10f15ba8650000000000001061 | 59.438 | 1.676 | n/a | 0.000 | 0.035 | 0.486 | 1.276 | 0.024 | n/a | 0.618 | 55.306 | n/a | n/a | 0.017 | 1.712 | 0.029 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms |
| 523b4e10f15ba8650000000000001065 | 58.471 | 1.777 | n/a | 0.000 | 0.028 | 1.981 | 0.935 | 0.043 | n/a | 1.436 | 52.260 | n/a | n/a | 0.011 | 1.805 | 0.031 | 0.011 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.030ms; driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.165ms; driver.publication.readback 0.112ms; driver.publication.readback 0.105ms |
| 523b4e10f15ba8650000000000000cfb | 55.834 | 1.592 | n/a | 0.000 | 41.051 | 6.083 | 0.383 | 0.005 | n/a | 0.185 | 6.523 | n/a | n/a | 0.012 | 42.643 | 0.764 | 0.012 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.071ms; driver.publication.readback 0.068ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.056ms |
| 523b4e10f15ba86500000000000013a3 | 55.072 | 6.122 | n/a | 0.000 | 0.102 | 7.081 | 35.593 | 0.059 | n/a | 0.329 | 5.755 | n/a | n/a | 0.031 | 6.224 | 0.113 | 0.031 | gw-w/thread-47/journal/entity | driver.reader-basis.broadcast 0.560ms; driver.publication.readback 0.111ms; driver.publication.readback 0.085ms; driver.publication.persist-deferred 0.043ms; driver.publication.persist-deferred 0.017ms |
| 523b4e10f15ba865000000000000105d | 54.947 | 1.226 | n/a | 0.000 | 0.018 | 0.428 | 1.300 | 0.017 | n/a | 0.359 | 51.588 | n/a | n/a | 0.010 | 1.244 | 0.023 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.015ms |
| 523b4e10f15ba8650000000000001c34 | 50.305 | 1.792 | n/a | 0.000 | 0.273 | 2.800 | 1.485 | 0.022 | n/a | 0.064 | 43.861 | n/a | n/a | 0.008 | 2.065 | 0.041 | 0.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.076ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.018ms |
| 523b4e10f15ba8650000000000001447 | 48.216 | 1.326 | n/a | 0.000 | 32.735 | 2.041 | 0.853 | 0.015 | n/a | 1.328 | 9.907 | n/a | n/a | 0.011 | 34.061 | 0.706 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.019ms |
| 523b4e10f15ba8650000000000001c33 | 45.942 | 2.038 | n/a | 0.000 | 0.934 | 0.386 | 1.450 | 0.022 | n/a | 0.070 | 41.031 | n/a | n/a | 0.009 | 2.972 | 0.065 | 0.009 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.020ms |
| 523b4e10f15ba86500000000000018ab | 44.913 | 0.979 | n/a | 0.000 | 0.450 | 0.939 | 0.325 | 0.004 | n/a | 0.010 | 42.203 | n/a | n/a | 0.004 | 1.429 | 0.032 | 0.004 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.040ms; driver.publication.persist-deferred 0.019ms |
| 523b4e10f15ba8650000000000001b23 | 43.597 | 1.696 | n/a | 0.000 | 12.855 | 0.459 | 0.523 | 0.005 | n/a | 0.031 | 28.016 | n/a | n/a | 0.011 | 14.551 | 0.334 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.083ms; driver.reader-basis.broadcast 0.687ms; driver.publication.readback 0.130ms; driver.publication.readback 0.064ms; driver.publication.readback 0.063ms |
| 523b4e10f15ba8650000000000001548 | 41.523 | 1.318 | n/a | 0.000 | 32.575 | 0.350 | 0.704 | 0.012 | n/a | 0.083 | 6.468 | n/a | n/a | 0.013 | 33.893 | 0.816 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.286ms; driver.publication.readback 0.113ms; driver.publication.readback 0.064ms; driver.publication.readback 0.064ms; driver.publication.readback 0.051ms |
| 523b4e10f15ba8650000000000001448 | 39.866 | 2.008 | n/a | 0.000 | 25.054 | 2.647 | 0.673 | 0.005 | n/a | 1.019 | 8.455 | n/a | n/a | 0.004 | 27.063 | 0.679 | 0.004 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 523b4e10f15ba865000000000000137c | 37.285 | 2.771 | n/a | 0.000 | 0.075 | 1.045 | 0.779 | 0.011 | n/a | 0.190 | 32.390 | n/a | n/a | 0.025 | 2.846 | 0.076 | 0.025 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 523b4e10f15ba8650000000000001aa0 | 36.649 | 3.069 | n/a | 0.000 | 21.397 | 1.103 | 1.634 | 0.055 | n/a | 0.093 | 9.290 | n/a | n/a | 0.009 | 24.466 | 0.668 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.062ms; driver.publication.readback 0.052ms; driver.publication.readback 0.050ms; driver.publication.readback 0.026ms; driver.publication.readback 0.025ms |
| 523b4e10f15ba8650000000000000bec | 35.534 | 1.436 | n/a | 0.000 | 0.018 | 0.442 | 0.937 | 0.015 | n/a | 0.072 | 32.607 | n/a | n/a | 0.008 | 1.454 | 0.041 | 0.008 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.017ms |
| 523b4e10f15ba8650000000000001a9c | 34.821 | 1.208 | n/a | 0.000 | 0.006 | 0.821 | 0.460 | 0.003 | n/a | 0.009 | 32.309 | n/a | n/a | 0.006 | 1.213 | 0.035 | 0.006 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.138ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.016ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.642 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 200.569 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 |
| p99 | 408.514 | n/a | n/a | n/a | 21.488 | n/a | 1.208 | 0.000 | 12.182 | 402.014 | 0.128 | n/a | 0.150 | 0.000 | n/a | n/a | 38.024 | 21.488 | 0.373 | 38.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc40000000000000002 | 408.514 | 4.085 | n/a | 0.000 | 0.000 | 1.555 | 402.014 | 0.128 | n/a | 0.150 | 0.000 | n/a | n/a | 0.582 | 4.085 | 0.010 | 0.582 | gw-r/thread-49/gateway.admitted-work | none observed |
| bdc35559384789740000000000000006 | 202.360 | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 201.008 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-44/journal/page | none observed |
| bdc35559384789740000000000000005 | 202.083 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 200.997 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000f41 | 201.886 | 0.000 | n/a | 0.000 | 0.000 | 0.949 | 200.713 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000f42 | 201.642 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 200.569 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000f40 | 200.711 | 0.000 | n/a | 0.000 | 0.000 | 0.279 | 200.357 | 0.004 | n/a | 0.013 | 0.000 | n/a | n/a | 0.058 | 0.000 | 0.000 | 0.058 | gw-r/thread-46/journal/page | none observed |
| bdc35559384789740000000000000f45 | 64.061 | 16.369 | n/a | 1.208 | 0.000 | 8.460 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.024 | 17.577 | 0.274 | 38.024 | node-14/thread-5/socket.wait-first-byte | none observed |
| bdc35559384789740000000000000f46 | 57.652 | 21.488 | n/a | 0.000 | 0.000 | 5.483 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.681 | 21.488 | 0.373 | 30.681 | node-14/thread-5/socket.wait-first-byte | none observed |
| bdc35559384789740000000000000f47 | 55.101 | 16.897 | n/a | 0.000 | 0.000 | 12.182 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.021 | 16.897 | 0.307 | 26.021 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 871.292 | n/a | n/a | n/a | 4.868 | n/a | 0.000 | 0.000 | 1.996 | 848.903 | 0.011 | n/a | 0.252 | 0.000 | n/a | n/a | 2.847 | 4.868 | 0.022 | 2.847 |
| p99 | 1007.128 | n/a | n/a | n/a | 19.540 | n/a | 0.000 | 0.000 | 2.143 | 1001.748 | 0.011 | n/a | 0.416 | 0.000 | n/a | n/a | 3.998 | 19.540 | 0.534 | 3.998 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc400000000000000a4 | 1007.128 | 0.274 | n/a | 0.000 | 0.000 | 1.996 | 1001.748 | 0.011 | n/a | 0.252 | 0.000 | n/a | n/a | 2.847 | 0.274 | 0.000 | 2.847 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000000a5 | 871.292 | 19.540 | n/a | 0.000 | 0.000 | 2.143 | 848.903 | 0.011 | n/a | 0.416 | 0.000 | n/a | n/a | 0.279 | 19.540 | 0.022 | 0.279 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc4000000000000082e | 9.121 | 4.868 | n/a | 0.000 | 0.000 | 0.255 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.998 | 4.868 | 0.534 | 3.998 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 442.492 | n/a | n/a | n/a | 2.371 | n/a | 0.000 | 0.000 | 0.815 | 436.986 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.091 | 2.371 | 0.007 | 0.091 |
| p99 | 1007.861 | n/a | n/a | n/a | 6.376 | n/a | 0.000 | 0.000 | 24.809 | 1003.109 | 0.094 | n/a | 0.156 | 0.000 | n/a | n/a | 15.313 | 6.376 | 0.297 | 15.313 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc400000000000000ae | 1007.861 | 3.885 | n/a | 0.000 | 0.000 | 0.638 | 1003.109 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.137 | 3.885 | 0.004 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 66604079bc238fc400000000000000bc | 1004.480 | 0.162 | n/a | 0.000 | 0.000 | 1.844 | 1001.238 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 1.124 | 0.162 | 0.000 | 1.124 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000000b4 | 1004.156 | 0.111 | n/a | 0.000 | 0.000 | 0.831 | 1001.980 | 0.015 | n/a | 0.119 | 0.000 | n/a | n/a | 1.101 | 0.111 | 0.000 | 1.101 | gw-r/thread-48/journal/page | none observed |
| 66604079bc238fc400000000000000d1 | 981.826 | 2.322 | n/a | 0.000 | 0.000 | 3.841 | 975.523 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.083 | 2.322 | 0.002 | 0.083 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000000bb | 952.118 | 2.253 | n/a | 0.000 | 0.000 | 0.665 | 949.066 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.091 | 2.253 | 0.002 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc400000000000000ab | 924.616 | 4.612 | n/a | 0.000 | 0.000 | 0.474 | 919.365 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.109 | 4.612 | 0.005 | 0.109 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000000a8 | 862.027 | 1.905 | n/a | 0.000 | 0.000 | 0.553 | 859.380 | 0.014 | n/a | 0.087 | 0.000 | n/a | n/a | 0.089 | 1.905 | 0.002 | 0.089 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000000c3 | 850.626 | 5.640 | n/a | 0.000 | 0.000 | 0.537 | 844.259 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.107 | 5.640 | 0.007 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc400000000000000cc | 717.012 | 2.077 | n/a | 0.000 | 0.000 | 1.872 | 712.917 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.065 | 2.077 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc400000000000000b2 | 594.217 | 2.322 | n/a | 0.000 | 0.000 | 0.864 | 590.891 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.069 | 2.322 | 0.004 | 0.069 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000000ca | 549.399 | 2.324 | n/a | 0.000 | 0.000 | 1.201 | 545.708 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.086 | 2.324 | 0.004 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc400000000000000c1 | 523.563 | 2.304 | n/a | 0.000 | 0.000 | 2.083 | 519.012 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.074 | 2.304 | 0.004 | 0.074 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000000c8 | 511.203 | 2.315 | n/a | 0.000 | 0.000 | 0.548 | 508.018 | 0.094 | n/a | 0.156 | 0.000 | n/a | n/a | 0.072 | 2.315 | 0.005 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc400000000000000c6 | 491.232 | 1.901 | n/a | 0.000 | 0.000 | 0.445 | 488.735 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.072 | 1.901 | 0.004 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc400000000000000b8 | 444.308 | 5.112 | n/a | 0.000 | 0.000 | 1.910 | 436.986 | 0.019 | n/a | 0.122 | 0.000 | n/a | n/a | 0.158 | 5.112 | 0.012 | 0.158 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc400000000000000c9 | 442.492 | 2.634 | n/a | 0.000 | 0.000 | 2.139 | 437.556 | 0.011 | n/a | 0.077 | 0.000 | n/a | n/a | 0.075 | 2.634 | 0.006 | 0.075 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000000b1 | 307.223 | 6.376 | n/a | 0.000 | 0.000 | 0.634 | 300.029 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.095 | 6.376 | 0.021 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000000ba | 296.751 | 5.076 | n/a | 0.000 | 0.000 | 0.903 | 290.458 | 0.022 | n/a | 0.112 | 0.000 | n/a | n/a | 0.182 | 5.076 | 0.017 | 0.182 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000000a7 | 277.427 | 4.001 | n/a | 0.000 | 0.000 | 0.760 | 272.373 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.183 | 4.001 | 0.014 | 0.183 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000000cd | 275.758 | 1.859 | n/a | 0.000 | 0.000 | 0.547 | 273.206 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.077 | 1.859 | 0.007 | 0.077 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 423.022 | n/a | n/a | n/a | 3.886 | n/a | 0.499 | 0.000 | 0.680 | 414.770 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.123 | 4.067 | 0.014 | 0.123 |
| p99 | 1003.345 | n/a | n/a | n/a | 14.078 | n/a | 1.168 | 0.000 | 5.065 | 1001.023 | 0.732 | n/a | 3.257 | 0.000 | n/a | n/a | 45.180 | 15.092 | 0.471 | 45.180 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc400000000000000df | 1003.345 | 0.113 | n/a | 0.000 | 0.000 | 1.027 | 1000.961 | 0.019 | n/a | 0.123 | 0.000 | n/a | n/a | 1.101 | 0.113 | 0.000 | 1.101 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000000d2 | 1003.011 | 0.131 | n/a | 0.000 | 0.000 | 0.613 | 1001.023 | 0.017 | n/a | 0.131 | 0.000 | n/a | n/a | 1.097 | 0.131 | 0.000 | 1.097 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000100 | 1002.876 | 0.167 | n/a | 0.000 | 0.000 | 0.883 | 1000.615 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 1.125 | 0.167 | 0.000 | 1.125 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000000d4 | 999.626 | 8.038 | n/a | 0.623 | 0.000 | 0.685 | 989.982 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.213 | 8.661 | 0.009 | 0.213 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000000db | 998.370 | 3.301 | n/a | 0.508 | 0.000 | 2.263 | 992.108 | 0.018 | n/a | 0.093 | 0.000 | n/a | n/a | 0.079 | 3.809 | 0.004 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000000108 | 993.046 | 3.474 | n/a | 0.593 | 0.000 | 2.075 | 986.764 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.073 | 4.067 | 0.004 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000000110 | 987.240 | 3.438 | n/a | 0.000 | 0.000 | 0.431 | 983.273 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.057 | 3.438 | 0.003 | 0.057 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc400000000000000da | 981.097 | 3.418 | n/a | 0.500 | 0.000 | 0.366 | 976.598 | 0.017 | n/a | 0.075 | 0.000 | n/a | n/a | 0.123 | 3.918 | 0.004 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000000103 | 956.711 | 2.829 | n/a | 0.000 | 0.000 | 0.546 | 953.204 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.061 | 2.829 | 0.003 | 0.061 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000000e1 | 911.619 | 3.210 | n/a | 0.504 | 0.000 | 0.533 | 907.230 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.110 | 3.714 | 0.004 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc400000000000000e2 | 869.221 | 6.231 | n/a | 0.850 | 0.000 | 0.412 | 861.449 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.205 | 7.081 | 0.008 | 0.205 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000000105 | 865.920 | 4.865 | n/a | 0.763 | 0.000 | 1.786 | 858.277 | 0.013 | n/a | 0.091 | 0.000 | n/a | n/a | 0.124 | 5.628 | 0.006 | 0.124 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000000e7 | 742.030 | 3.925 | n/a | 0.499 | 0.000 | 2.153 | 734.610 | 0.732 | n/a | 0.034 | 0.000 | n/a | n/a | 0.077 | 4.424 | 0.006 | 0.077 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000000ed | 677.327 | 2.616 | n/a | 0.558 | 0.000 | 0.632 | 673.373 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.075 | 3.174 | 0.005 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc400000000000000dc | 669.571 | 14.078 | n/a | 1.014 | 0.000 | 0.617 | 653.572 | 0.013 | n/a | 0.068 | 0.000 | n/a | n/a | 0.209 | 15.092 | 0.023 | 0.209 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc400000000000000fd | 646.632 | 4.443 | n/a | 0.000 | 0.000 | 0.668 | 641.332 | 0.019 | n/a | 0.098 | 0.000 | n/a | n/a | 0.072 | 4.443 | 0.007 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc400000000000000ea | 538.245 | 3.122 | n/a | 1.168 | 0.000 | 0.680 | 533.103 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.104 | 4.290 | 0.008 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc400000000000000d5 | 481.223 | 4.367 | n/a | 0.474 | 0.000 | 0.989 | 475.168 | 0.018 | n/a | 0.108 | 0.000 | n/a | n/a | 0.098 | 4.841 | 0.010 | 0.098 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc400000000000000e8 | 474.621 | 7.598 | n/a | 0.673 | 0.000 | 0.849 | 465.267 | 0.018 | n/a | 0.049 | 0.000 | n/a | n/a | 0.167 | 8.271 | 0.017 | 0.167 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc4000000000000010b | 465.792 | 13.346 | n/a | 0.678 | 0.000 | 1.514 | 450.051 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.133 | 14.025 | 0.030 | 0.133 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 389.587 | n/a | n/a | n/a | 3.587 | n/a | 0.000 | 0.000 | 0.708 | 380.632 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.107 | 3.587 | 0.012 | 0.107 |
| p99 | 1012.798 | n/a | n/a | n/a | 11.436 | n/a | 1.262 | 0.000 | 8.875 | 1009.718 | 4.653 | n/a | 0.089 | 0.000 | n/a | n/a | 51.666 | 12.074 | 0.234 | 51.666 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc40000000000000128 | 1012.798 | 2.597 | n/a | 0.000 | 0.000 | 0.380 | 1009.718 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.059 | 2.597 | 0.003 | 0.059 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000000117 | 1004.258 | 4.096 | n/a | 0.634 | 0.000 | 0.538 | 998.798 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.122 | 4.730 | 0.005 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 66604079bc238fc4000000000000012c | 1003.134 | 0.121 | n/a | 0.000 | 0.000 | 0.574 | 1001.235 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 1.105 | 0.121 | 0.000 | 1.105 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc4000000000000013a | 1002.199 | 0.115 | n/a | 0.000 | 0.000 | 0.389 | 1000.555 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 1.099 | 0.115 | 0.000 | 1.099 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc4000000000000011f | 1000.207 | 2.841 | n/a | 0.508 | 0.000 | 1.899 | 994.826 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.073 | 3.349 | 0.003 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc4000000000000012e | 926.340 | 2.866 | n/a | 0.000 | 0.000 | 0.530 | 922.827 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.072 | 2.866 | 0.003 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 66604079bc238fc40000000000000114 | 907.057 | 4.620 | n/a | 0.638 | 0.000 | 0.745 | 900.868 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.123 | 5.258 | 0.006 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc40000000000000144 | 893.189 | 2.947 | n/a | 0.000 | 0.000 | 1.602 | 888.524 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.065 | 2.947 | 0.003 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc40000000000000129 | 807.822 | 8.674 | n/a | 1.262 | 0.000 | 0.668 | 796.976 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.191 | 9.936 | 0.012 | 0.191 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000000120 | 804.861 | 2.305 | n/a | 0.000 | 0.000 | 0.425 | 801.983 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.058 | 2.305 | 0.003 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000000111 | 754.074 | 2.755 | n/a | 0.579 | 0.000 | 0.410 | 750.201 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.093 | 3.334 | 0.004 | 0.093 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000000137 | 744.874 | 3.033 | n/a | 0.000 | 0.000 | 0.589 | 737.554 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 3.655 | 3.033 | 0.004 | 3.655 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc40000000000000145 | 689.680 | 6.017 | n/a | 0.668 | 0.000 | 0.665 | 682.197 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.081 | 6.685 | 0.010 | 0.081 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc4000000000000014c | 687.166 | 4.102 | n/a | 0.574 | 0.000 | 2.897 | 679.409 | 0.016 | n/a | 0.084 | 0.000 | n/a | n/a | 0.085 | 4.676 | 0.007 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc40000000000000140 | 669.707 | 5.594 | n/a | 0.000 | 0.000 | 0.891 | 663.044 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.115 | 5.594 | 0.008 | 0.115 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc40000000000000136 | 646.153 | 5.162 | n/a | 0.000 | 0.000 | 0.611 | 640.111 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.204 | 5.162 | 0.008 | 0.204 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc4000000000000013c | 644.264 | 11.436 | n/a | 0.638 | 0.000 | 0.708 | 631.312 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.092 | 12.074 | 0.019 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000126 | 611.653 | 3.214 | n/a | 0.000 | 0.000 | 1.737 | 606.593 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.068 | 3.214 | 0.005 | 0.068 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000131 | 582.475 | 5.316 | n/a | 0.000 | 0.000 | 0.729 | 576.212 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.171 | 5.316 | 0.009 | 0.171 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc4000000000000012f | 426.756 | 5.104 | n/a | 0.000 | 0.000 | 1.948 | 419.525 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.130 | 5.104 | 0.012 | 0.130 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 424.361 | n/a | n/a | n/a | 2.828 | n/a | 0.000 | 0.000 | 0.585 | 420.458 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.066 | 2.938 | 0.008 | 0.066 |
| p99 | 1023.129 | n/a | n/a | n/a | 7.119 | n/a | 0.749 | 0.000 | 2.002 | 1019.693 | 0.017 | n/a | 0.080 | 0.000 | n/a | n/a | 44.604 | 7.773 | 0.318 | 44.604 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc40000000000000157 | 1023.129 | 2.828 | n/a | 0.000 | 0.000 | 0.503 | 1019.693 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.065 | 2.828 | 0.003 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc40000000000000181 | 1003.919 | 2.318 | n/a | 0.000 | 0.000 | 0.562 | 1000.930 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.057 | 2.318 | 0.002 | 0.057 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc40000000000000167 | 1002.802 | 3.005 | n/a | 0.000 | 0.000 | 0.809 | 998.875 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.059 | 3.005 | 0.003 | 0.059 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000000188 | 1002.618 | 0.168 | n/a | 0.000 | 0.000 | 0.563 | 1000.710 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 1.127 | 0.168 | 0.000 | 1.127 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000170 | 1002.387 | 0.125 | n/a | 0.000 | 0.000 | 0.551 | 1000.559 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 1.103 | 0.125 | 0.000 | 1.103 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc40000000000000187 | 962.600 | 2.938 | n/a | 0.000 | 0.000 | 0.488 | 959.068 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.061 | 2.938 | 0.003 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc40000000000000176 | 901.374 | 3.705 | n/a | 0.000 | 0.000 | 0.572 | 896.913 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.158 | 3.705 | 0.004 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000000158 | 781.691 | 2.244 | n/a | 0.000 | 0.000 | 0.909 | 778.413 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.063 | 2.244 | 0.003 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc4000000000000015c | 770.720 | 2.948 | n/a | 0.000 | 0.000 | 0.599 | 767.074 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.060 | 2.948 | 0.004 | 0.060 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000000152 | 721.866 | 7.119 | n/a | 0.654 | 0.000 | 0.696 | 713.192 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.147 | 7.773 | 0.011 | 0.147 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc4000000000000017d | 720.985 | 5.298 | n/a | 0.000 | 0.000 | 1.102 | 714.476 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.061 | 5.298 | 0.007 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000168 | 617.058 | 5.550 | n/a | 0.000 | 0.000 | 1.808 | 609.547 | 0.014 | n/a | 0.073 | 0.000 | n/a | n/a | 0.066 | 5.550 | 0.009 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000000185 | 603.080 | 4.123 | n/a | 0.000 | 0.000 | 0.726 | 598.085 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.100 | 4.123 | 0.007 | 0.100 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc4000000000000016f | 573.634 | 4.920 | n/a | 0.000 | 0.000 | 0.988 | 567.521 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.164 | 4.920 | 0.009 | 0.164 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc40000000000000179 | 538.493 | 4.756 | n/a | 0.000 | 0.000 | 0.591 | 532.947 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.157 | 4.756 | 0.009 | 0.157 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc4000000000000018b | 523.733 | 2.312 | n/a | 0.553 | 0.000 | 0.479 | 520.278 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 0.078 | 2.865 | 0.005 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000180 | 519.908 | 2.358 | n/a | 0.000 | 0.000 | 0.527 | 516.901 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.091 | 2.358 | 0.005 | 0.091 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000000174 | 514.340 | 2.242 | n/a | 0.000 | 0.000 | 0.359 | 511.646 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.055 | 2.242 | 0.004 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc4000000000000017e | 483.650 | 1.949 | n/a | 0.000 | 0.000 | 0.289 | 481.287 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.058 | 1.949 | 0.004 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc40000000000000178 | 469.602 | 2.060 | n/a | 0.000 | 0.000 | 0.573 | 466.871 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.065 | 2.060 | 0.004 | 0.065 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 317.711 | n/a | n/a | n/a | 2.975 | n/a | 0.000 | 0.000 | 0.584 | 314.534 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.063 | 2.975 | 0.012 | 0.063 |
| p99 | 1005.730 | n/a | n/a | n/a | 8.629 | n/a | 0.000 | 0.000 | 3.083 | 1000.769 | 6.093 | n/a | 0.751 | 0.000 | n/a | n/a | 25.212 | 8.629 | 0.718 | 25.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc400000000000001c6 | 1005.730 | 4.792 | n/a | 0.000 | 0.000 | 0.736 | 999.988 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.162 | 4.792 | 0.005 | 0.162 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000001c7 | 1003.487 | 3.157 | n/a | 0.000 | 0.000 | 0.458 | 999.763 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.071 | 3.157 | 0.003 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc4000000000000018d | 1002.938 | 3.200 | n/a | 0.000 | 0.000 | 0.884 | 998.736 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.062 | 3.200 | 0.003 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000001a8 | 1002.701 | 0.125 | n/a | 0.000 | 0.000 | 0.641 | 1000.769 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 1.105 | 0.125 | 0.000 | 1.105 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc4000000000000019c | 976.860 | 5.326 | n/a | 0.000 | 0.000 | 0.569 | 970.844 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.068 | 5.326 | 0.005 | 0.068 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000001aa | 966.243 | 2.270 | n/a | 0.000 | 0.000 | 0.809 | 963.075 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.054 | 2.270 | 0.002 | 0.054 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000001a6 | 863.911 | 2.975 | n/a | 0.000 | 0.000 | 0.540 | 860.290 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.061 | 2.975 | 0.003 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc4000000000000019e | 839.632 | 3.427 | n/a | 0.000 | 0.000 | 2.534 | 833.563 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.061 | 3.427 | 0.004 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc400000000000001d7 | 804.205 | 1.598 | n/a | 0.000 | 0.000 | 0.371 | 802.124 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.060 | 1.598 | 0.002 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc400000000000001c5 | 727.921 | 2.243 | n/a | 0.000 | 0.000 | 0.449 | 725.128 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.059 | 2.243 | 0.003 | 0.059 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc400000000000001a2 | 702.758 | 5.336 | n/a | 0.000 | 0.000 | 0.622 | 696.681 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.061 | 5.336 | 0.008 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc400000000000001c8 | 671.084 | 2.535 | n/a | 0.000 | 0.000 | 0.452 | 668.008 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.067 | 2.535 | 0.004 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc400000000000001ab | 655.528 | 2.946 | n/a | 0.000 | 0.000 | 2.513 | 649.808 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.222 | 2.946 | 0.004 | 0.222 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc400000000000001b2 | 643.458 | 5.135 | n/a | 0.000 | 0.000 | 0.798 | 637.409 | 0.019 | n/a | 0.033 | 0.000 | n/a | n/a | 0.064 | 5.135 | 0.008 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000001b9 | 610.070 | 2.259 | n/a | 0.000 | 0.000 | 0.624 | 607.102 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.061 | 2.259 | 0.004 | 0.061 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000001d3 | 560.230 | 6.030 | n/a | 0.000 | 0.000 | 0.778 | 553.206 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.162 | 6.030 | 0.011 | 0.162 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000001bc | 522.981 | 2.641 | n/a | 0.000 | 0.000 | 0.715 | 519.463 | 0.006 | n/a | 0.097 | 0.000 | n/a | n/a | 0.059 | 2.641 | 0.005 | 0.059 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000001d1 | 509.757 | 2.192 | n/a | 0.000 | 0.000 | 1.176 | 506.288 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.056 | 2.192 | 0.004 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc400000000000001ba | 471.929 | 8.629 | n/a | 0.000 | 0.000 | 1.775 | 461.343 | 0.021 | n/a | 0.052 | 0.000 | n/a | n/a | 0.110 | 8.629 | 0.018 | 0.110 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc4000000000000019b | 429.428 | 4.699 | n/a | 0.000 | 0.000 | 0.513 | 424.053 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.129 | 4.699 | 0.011 | 0.129 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 312.327 | n/a | n/a | n/a | 2.394 | n/a | 0.000 | 0.000 | 0.490 | 309.371 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.394 | 0.007 | 0.063 |
| p99 | 1006.043 | n/a | n/a | n/a | 7.504 | n/a | 0.000 | 0.000 | 4.309 | 1000.792 | 0.017 | n/a | 0.070 | 0.000 | n/a | n/a | 47.055 | 7.504 | 0.364 | 47.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc400000000000001ec | 1006.043 | 4.608 | n/a | 0.000 | 0.000 | 0.599 | 1000.626 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.146 | 4.608 | 0.005 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000000214 | 1002.438 | 0.109 | n/a | 0.000 | 0.000 | 0.367 | 1000.792 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 1.097 | 0.109 | 0.000 | 1.097 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000000219 | 1001.276 | 0.107 | n/a | 0.000 | 0.000 | 0.323 | 1000.725 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.051 | 0.107 | 0.000 | 0.051 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc40000000000000200 | 1001.217 | 2.319 | n/a | 0.000 | 0.000 | 0.506 | 998.299 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.053 | 2.319 | 0.002 | 0.053 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000000213 | 999.726 | 4.809 | n/a | 0.000 | 0.000 | 0.663 | 994.040 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.135 | 4.809 | 0.005 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc4000000000000021b | 988.946 | 2.444 | n/a | 0.000 | 0.000 | 0.478 | 985.916 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.080 | 2.444 | 0.002 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000000217 | 926.464 | 4.331 | n/a | 0.000 | 0.000 | 0.622 | 921.395 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.063 | 4.331 | 0.005 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000000208 | 888.530 | 4.772 | n/a | 0.000 | 0.000 | 0.613 | 882.942 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.161 | 4.772 | 0.005 | 0.161 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000000201 | 853.824 | 2.826 | n/a | 0.000 | 0.000 | 0.588 | 850.229 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.137 | 2.826 | 0.003 | 0.137 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000204 | 786.428 | 2.071 | n/a | 0.000 | 0.000 | 0.521 | 783.735 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.058 | 2.071 | 0.003 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc400000000000001df | 783.025 | 3.054 | n/a | 0.000 | 0.000 | 4.309 | 775.557 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.062 | 3.054 | 0.004 | 0.062 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000001f2 | 778.164 | 2.160 | n/a | 0.000 | 0.000 | 1.572 | 774.305 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.052 | 2.160 | 0.003 | 0.052 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000001fa | 772.533 | 2.277 | n/a | 0.000 | 0.000 | 0.471 | 769.675 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.053 | 2.277 | 0.003 | 0.053 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc400000000000001f7 | 647.535 | 2.261 | n/a | 0.000 | 0.000 | 0.524 | 644.614 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.057 | 2.261 | 0.003 | 0.057 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc400000000000001dc | 617.528 | 1.982 | n/a | 0.000 | 0.000 | 0.575 | 614.853 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.059 | 1.982 | 0.003 | 0.059 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000001ea | 607.465 | 2.280 | n/a | 0.000 | 0.000 | 0.480 | 604.588 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.063 | 2.280 | 0.004 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc400000000000001fb | 602.258 | 2.240 | n/a | 0.000 | 0.000 | 2.652 | 597.251 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.052 | 2.240 | 0.004 | 0.052 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000001e4 | 494.030 | 7.504 | n/a | 0.000 | 0.000 | 1.319 | 485.041 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.125 | 7.504 | 0.015 | 0.125 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000211 | 442.160 | 2.394 | n/a | 0.000 | 0.000 | 0.460 | 439.188 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.056 | 2.394 | 0.005 | 0.056 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc400000000000001f0 | 416.169 | 2.177 | n/a | 0.000 | 0.000 | 0.438 | 413.452 | 0.017 | n/a | 0.034 | 0.000 | n/a | n/a | 0.051 | 2.177 | 0.005 | 0.051 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.592 | n/a | n/a | n/a | 3.007 | n/a | 0.000 | 0.000 | 0.226 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.525 | 3.007 | 0.236 | 7.525 |
| p99 | 97.587 | n/a | n/a | n/a | 12.270 | n/a | 1.081 | 0.000 | 0.816 | 90.413 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 48.256 | 13.274 | 0.811 | 48.256 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc40000000000000227 | 983.628 | 4.403 | n/a | 0.000 | 0.000 | 0.335 | 978.690 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.167 | 4.403 | 0.004 | 0.167 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc4000000000000021c | 920.627 | 2.706 | n/a | 0.000 | 0.000 | 0.428 | 917.351 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.104 | 2.706 | 0.003 | 0.104 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000000228 | 913.119 | 2.131 | n/a | 0.000 | 0.000 | 0.444 | 910.426 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.061 | 2.131 | 0.002 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc40000000000000223 | 778.460 | 2.427 | n/a | 0.000 | 0.000 | 0.503 | 775.394 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.082 | 2.427 | 0.003 | 0.082 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc4000000000000021f | 776.078 | 1.995 | n/a | 0.000 | 0.000 | 0.609 | 773.366 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.057 | 1.995 | 0.003 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000220 | 239.467 | 5.416 | n/a | 0.000 | 0.000 | 0.765 | 232.833 | 0.005 | n/a | 0.227 | 0.000 | n/a | n/a | 0.219 | 5.416 | 0.023 | 0.219 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000000225 | 207.896 | 2.228 | n/a | 0.000 | 0.000 | 0.525 | 205.030 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.060 | 2.228 | 0.011 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc400000000000004ee | 97.587 | 6.376 | n/a | 0.000 | 0.000 | 0.641 | 90.413 | 0.002 | n/a | 0.019 | 0.000 | n/a | n/a | 0.136 | 6.376 | 0.065 | 0.136 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000002fa | 93.868 | 5.723 | n/a | 0.000 | 0.000 | 0.367 | 87.649 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.075 | 5.723 | 0.061 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000000316 | 93.848 | 3.397 | n/a | 0.000 | 0.000 | 0.528 | 89.815 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.076 | 3.397 | 0.036 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc4000000000000075a | 92.167 | 2.615 | n/a | 0.000 | 0.000 | 2.948 | 86.528 | 0.002 | n/a | 0.014 | 0.000 | n/a | n/a | 0.061 | 2.615 | 0.028 | 0.061 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc40000000000000669 | 89.469 | 9.160 | n/a | 0.000 | 0.000 | 0.780 | 79.375 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.113 | 9.160 | 0.102 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc400000000000007a1 | 86.801 | 3.773 | n/a | 0.000 | 0.000 | 0.465 | 82.436 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.087 | 3.773 | 0.043 | 0.087 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc4000000000000049a | 82.626 | 7.284 | n/a | 0.684 | 0.000 | 0.480 | 73.979 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.162 | 7.967 | 0.096 | 0.162 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc400000000000005ed | 80.703 | 5.017 | n/a | 0.000 | 0.000 | 0.524 | 75.057 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.093 | 5.017 | 0.062 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000000472 | 79.337 | 6.003 | n/a | 0.000 | 0.000 | 0.648 | 72.527 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.119 | 6.003 | 0.076 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc4000000000000068b | 76.028 | 2.912 | n/a | 0.000 | 0.000 | 0.344 | 72.689 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.058 | 2.912 | 0.038 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc400000000000005d1 | 75.904 | 5.135 | n/a | 0.000 | 0.000 | 0.393 | 70.244 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.090 | 5.135 | 0.068 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000000768 | 75.304 | 3.711 | n/a | 0.000 | 0.000 | 0.425 | 71.042 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.115 | 3.711 | 0.049 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc400000000000004f6 | 75.157 | 4.318 | n/a | 0.000 | 0.000 | 0.429 | 70.212 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.185 | 4.318 | 0.057 | 0.185 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / internal (2358 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.871 | n/a | n/a | n/a | 3.678 | n/a | 0.000 | 0.000 | 0.201 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.468 | 3.694 | 0.314 | 6.468 |
| p99 | 335.421 | n/a | n/a | n/a | 14.608 | n/a | 1.271 | 0.000 | 1.348 | 332.688 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 47.238 | 15.402 | 0.848 | 47.238 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 66604079bc238fc40000000000001ad7 | 1004.309 | 0.155 | n/a | 0.000 | 0.000 | 2.519 | 1000.439 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 1.164 | 0.155 | 0.000 | 1.164 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000001b23 | 1002.697 | 0.196 | n/a | 0.000 | 0.000 | 0.537 | 1000.747 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 1.162 | 0.196 | 0.000 | 1.162 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000001adc | 997.212 | 2.412 | n/a | 0.000 | 0.000 | 0.280 | 994.435 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.058 | 2.412 | 0.002 | 0.058 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000001b1f | 994.712 | 2.592 | n/a | 0.000 | 0.000 | 0.462 | 991.582 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.058 | 2.592 | 0.003 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000001ad9 | 954.187 | 12.454 | n/a | 1.281 | 0.000 | 0.315 | 939.707 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.358 | 13.735 | 0.014 | 0.358 | gw-r/thread-46/journal/page | none observed |
| 66604079bc238fc40000000000001ae1 | 950.787 | 2.166 | n/a | 0.000 | 0.000 | 0.278 | 948.264 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.052 | 2.166 | 0.002 | 0.052 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000001aea | 938.614 | 4.559 | n/a | 0.000 | 0.000 | 0.279 | 933.660 | 0.002 | n/a | 0.023 | 0.000 | n/a | n/a | 0.091 | 4.559 | 0.005 | 0.091 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc40000000000001af9 | 924.190 | 5.202 | n/a | 0.000 | 0.000 | 0.286 | 918.559 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.115 | 5.202 | 0.006 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000001b1a | 873.756 | 3.890 | n/a | 0.000 | 0.000 | 0.387 | 869.362 | 0.003 | n/a | 0.013 | 0.000 | n/a | n/a | 0.103 | 3.890 | 0.004 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000001ad5 | 861.790 | 5.043 | n/a | 0.000 | 0.000 | 0.387 | 856.160 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.174 | 5.043 | 0.006 | 0.174 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000001b1c | 858.872 | 1.914 | n/a | 0.000 | 0.000 | 0.538 | 856.335 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.062 | 1.914 | 0.002 | 0.062 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000001afd | 701.709 | 3.132 | n/a | 0.000 | 0.000 | 0.467 | 698.009 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.072 | 3.132 | 0.004 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000001ae2 | 675.546 | 1.703 | n/a | 0.000 | 0.000 | 0.470 | 673.273 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 1.703 | 0.003 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 66604079bc238fc40000000000001b16 | 669.055 | 2.006 | n/a | 0.000 | 0.000 | 0.231 | 666.719 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.062 | 2.006 | 0.003 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 66604079bc238fc40000000000001afe | 656.307 | 7.524 | n/a | 0.000 | 0.000 | 0.397 | 648.141 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.210 | 7.524 | 0.011 | 0.210 | gw-r/thread-64/journal/page | none observed |
| 66604079bc238fc40000000000001af6 | 627.377 | 4.167 | n/a | 0.000 | 0.000 | 0.437 | 622.652 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.093 | 4.167 | 0.007 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 66604079bc238fc40000000000001b0c | 554.139 | 3.380 | n/a | 0.000 | 0.000 | 0.749 | 549.931 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.068 | 3.380 | 0.006 | 0.068 | gw-r/thread-42/journal/page | none observed |
| 66604079bc238fc40000000000001af2 | 535.422 | 2.954 | n/a | 0.000 | 0.000 | 0.255 | 532.132 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.053 | 2.954 | 0.006 | 0.053 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000001b11 | 527.063 | 2.929 | n/a | 0.000 | 0.000 | 0.475 | 523.577 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.057 | 2.929 | 0.006 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 66604079bc238fc40000000000001b14 | 440.760 | 2.960 | n/a | 0.000 | 0.000 | 0.318 | 437.405 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.055 | 2.960 | 0.007 | 0.055 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (77 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.186 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 200.939 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 207.036 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 23.223 | 205.520 | 3.765 | n/a | 3.113 | 0.000 | n/a | n/a | 50.227 | 0.000 | 0.000 | 50.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bdc35559384789740000000000000025 | 207.036 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 205.520 | 0.039 | n/a | 0.249 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000013 | 206.144 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 205.003 | 0.014 | n/a | 0.115 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| bdc35559384789740000000000000026 | 205.949 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 205.082 | 0.019 | n/a | 0.181 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000023 | 205.880 | 0.000 | n/a | 0.000 | 0.000 | 3.903 | 201.669 | 0.027 | n/a | 0.187 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000028 | 205.641 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 204.171 | 0.011 | n/a | 0.123 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-42/journal/page | none observed |
| bdc3555938478974000000000000001b | 205.353 | 0.000 | n/a | 0.000 | 0.000 | 0.675 | 204.422 | 0.017 | n/a | 0.129 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-44/journal/page | none observed |
| bdc3555938478974000000000000002a | 205.291 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 201.963 | 0.022 | n/a | 2.325 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-45/journal/page | none observed |
| bdc3555938478974000000000000000d | 205.058 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 204.232 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000058 | 204.830 | 0.000 | n/a | 0.000 | 0.000 | 3.428 | 201.160 | 0.019 | n/a | 0.137 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000030 | 204.361 | 0.000 | n/a | 0.000 | 0.000 | 3.328 | 200.821 | 0.011 | n/a | 0.112 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-44/journal/page | none observed |
| bdc35559384789740000000000000051 | 204.153 | 0.000 | n/a | 0.000 | 0.000 | 3.340 | 200.572 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-44/journal/page | none observed |
| bdc35559384789740000000000000059 | 204.136 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 202.851 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000042 | 203.687 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 202.252 | 0.070 | n/a | 0.158 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-64/journal/page | none observed |
| bdc3555938478974000000000000004b | 203.499 | 0.000 | n/a | 0.000 | 0.000 | 2.355 | 200.821 | 0.013 | n/a | 0.097 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-48/journal/page | none observed |
| bdc35559384789740000000000000032 | 203.433 | 0.000 | n/a | 0.000 | 0.000 | 1.016 | 201.905 | 0.021 | n/a | 0.305 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-48/journal/page | none observed |
| bdc35559384789740000000000000009 | 203.287 | 0.000 | n/a | 0.000 | 0.000 | 1.711 | 200.855 | 0.012 | n/a | 0.124 | 0.000 | n/a | n/a | 0.584 | 0.000 | 0.000 | 0.584 | gw-r/thread-48/journal/page | none observed |
| bdc35559384789740000000000000007 | 203.206 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.640 | 0.020 | n/a | 0.214 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 | gw-r/thread-64/journal/page | none observed |
| bdc3555938478974000000000000004f | 203.198 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 202.152 | 0.021 | n/a | 0.203 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| bdc35559384789740000000000000041 | 203.123 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 201.870 | 0.014 | n/a | 0.165 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000055 | 202.864 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 202.143 | 0.013 | n/a | 0.062 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.043 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 200.900 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 208.135 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.147 | 205.753 | 8.454 | n/a | 0.311 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bdc35559384789740000000000000085 | 208.135 | 0.000 | n/a | 0.000 | 0.000 | 1.834 | 205.753 | 0.122 | n/a | 0.131 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 | gw-r/thread-45/journal/page | none observed |
| bdc355593847897400000000000000a3 | 206.350 | 0.000 | n/a | 0.000 | 0.000 | 1.217 | 204.878 | 0.013 | n/a | 0.126 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| bdc3555938478974000000000000007b | 205.408 | 0.000 | n/a | 0.000 | 0.000 | 4.147 | 201.032 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| bdc3555938478974000000000000006a | 205.067 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 200.900 | 3.122 | n/a | 0.111 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-42/journal/page | none observed |
| bdc3555938478974000000000000007d | 204.844 | 0.000 | n/a | 0.000 | 0.000 | 0.333 | 204.254 | 0.027 | n/a | 0.129 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| bdc35559384789740000000000000065 | 204.746 | 0.000 | n/a | 0.000 | 0.000 | 1.150 | 203.030 | 0.012 | n/a | 0.311 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-42/journal/page | none observed |
| bdc3555938478974000000000000008e | 204.669 | 0.000 | n/a | 0.000 | 0.000 | 3.952 | 200.555 | 0.010 | n/a | 0.032 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000079 | 204.592 | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 203.798 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000078 | 204.553 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 203.677 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-44/journal/page | none observed |
| bdc355593847897400000000000000bd | 204.421 | 0.000 | n/a | 0.000 | 0.000 | 0.849 | 203.319 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| bdc3555938478974000000000000007e | 204.303 | 0.000 | n/a | 0.000 | 0.000 | 1.171 | 202.802 | 0.021 | n/a | 0.221 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-42/journal/page | none observed |
| bdc355593847897400000000000000c2 | 204.221 | 0.000 | n/a | 0.000 | 0.000 | 1.587 | 202.229 | 0.012 | n/a | 0.125 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-48/journal/page | none observed |
| bdc355593847897400000000000000c1 | 204.191 | 0.000 | n/a | 0.000 | 0.000 | 2.783 | 201.066 | 0.014 | n/a | 0.151 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-46/journal/page | none observed |
| bdc35559384789740000000000000073 | 204.191 | 0.000 | n/a | 0.000 | 0.000 | 3.423 | 200.581 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| bdc3555938478974000000000000005f | 203.645 | 0.000 | n/a | 0.000 | 0.000 | 1.839 | 201.485 | 0.034 | n/a | 0.185 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-45/journal/page | none observed |
| bdc355593847897400000000000000b7 | 203.503 | 0.000 | n/a | 0.000 | 0.000 | 2.128 | 201.132 | 0.013 | n/a | 0.129 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| bdc35559384789740000000000000074 | 203.260 | 0.000 | n/a | 0.000 | 0.000 | 1.521 | 201.343 | 0.021 | n/a | 0.126 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-46/journal/page | none observed |
| bdc355593847897400000000000000ab | 203.244 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 201.736 | 0.010 | n/a | 0.149 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-44/journal/page | none observed |
| bdc35559384789740000000000000093 | 203.225 | 0.000 | n/a | 0.000 | 0.000 | 1.612 | 201.259 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-48/journal/page | none observed |
| bdc35559384789740000000000000087 | 203.154 | 0.000 | n/a | 0.000 | 0.000 | 1.772 | 201.099 | 0.020 | n/a | 0.125 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.860 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.838 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 210.115 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.275 | 205.974 | 10.742 | n/a | 0.722 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bdc355593847897400000000000000d7 | 210.115 | 0.000 | n/a | 0.000 | 0.000 | 3.967 | 205.974 | 0.020 | n/a | 0.061 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-64/journal/page | none observed |
| bdc355593847897400000000000000e4 | 208.729 | 0.000 | n/a | 0.000 | 0.000 | 7.275 | 201.225 | 0.029 | n/a | 0.097 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-49/journal/page | none observed |
| bdc355593847897400000000000000de | 207.002 | 0.000 | n/a | 0.000 | 0.000 | 4.906 | 201.948 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |
| bdc355593847897400000000000000e5 | 205.417 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 204.412 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| bdc35559384789740000000000000125 | 204.902 | 0.000 | n/a | 0.000 | 0.000 | 3.917 | 200.785 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| bdc355593847897400000000000000d2 | 204.761 | 0.000 | n/a | 0.000 | 0.000 | 2.986 | 201.566 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-47/journal/page | none observed |
| bdc355593847897400000000000000cd | 203.798 | 0.000 | n/a | 0.000 | 0.000 | 0.932 | 202.645 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| bdc355593847897400000000000000e3 | 203.748 | 0.000 | n/a | 0.000 | 0.000 | 2.018 | 201.495 | 0.011 | n/a | 0.125 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000116 | 203.616 | 0.000 | n/a | 0.000 | 0.000 | 2.528 | 200.775 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-46/journal/page | none observed |
| bdc355593847897400000000000000fa | 203.505 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 202.721 | 0.021 | n/a | 0.110 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| bdc355593847897400000000000000f0 | 203.388 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 201.833 | 0.053 | n/a | 0.722 | 0.000 | n/a | n/a | 0.055 | 0.000 | 0.000 | 0.055 | gw-r/thread-45/journal/page | none observed |
| bdc355593847897400000000000000c8 | 203.217 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 202.085 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| bdc355593847897400000000000000f1 | 202.938 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 201.575 | 0.061 | n/a | 0.179 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| bdc3555938478974000000000000011d | 202.938 | 0.000 | n/a | 0.000 | 0.000 | 1.278 | 201.398 | 0.011 | n/a | 0.123 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-64/journal/page | none observed |
| bdc355593847897400000000000000ce | 202.650 | 0.000 | n/a | 0.000 | 0.000 | 1.228 | 201.203 | 0.011 | n/a | 0.102 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-64/journal/page | none observed |
| bdc355593847897400000000000000e1 | 202.637 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.441 | 0.011 | n/a | 0.120 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| bdc355593847897400000000000000f9 | 202.619 | 0.000 | n/a | 0.000 | 0.000 | 0.892 | 201.505 | 0.018 | n/a | 0.108 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| bdc3555938478974000000000000010f | 202.556 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 201.612 | 0.011 | n/a | 0.144 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000100 | 202.260 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 201.257 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-64/journal/page | none observed |
| bdc3555938478974000000000000010b | 202.232 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.175 | 0.006 | n/a | 0.086 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.539 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 200.653 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 214.438 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 11.805 | 202.351 | 5.999 | n/a | 3.559 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bdc3555938478974000000000000013f | 214.438 | 0.000 | n/a | 0.000 | 0.000 | 11.805 | 202.351 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-46/journal/page | none observed |
| bdc3555938478974000000000000013b | 206.617 | 0.000 | n/a | 0.000 | 0.000 | 4.559 | 201.879 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000152 | 205.276 | 0.000 | n/a | 0.000 | 0.000 | 3.781 | 201.298 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| bdc3555938478974000000000000016a | 204.656 | 0.000 | n/a | 0.000 | 0.000 | 3.811 | 200.683 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000133 | 202.885 | 0.000 | n/a | 0.000 | 0.000 | 1.378 | 201.322 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.069 | 0.000 | 0.000 | 0.069 | gw-r/thread-45/journal/page | none observed |
| bdc3555938478974000000000000013d | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 1.671 | 200.953 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000134 | 202.746 | 0.000 | n/a | 0.000 | 0.000 | 0.472 | 202.054 | 0.010 | n/a | 0.124 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-46/journal/page | none observed |
| bdc3555938478974000000000000015d | 202.454 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 201.332 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000170 | 202.347 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 201.344 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000188 | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 201.228 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| bdc35559384789740000000000000131 | 202.225 | 0.000 | n/a | 0.000 | 0.000 | 0.680 | 201.323 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-44/journal/page | none observed |
| bdc3555938478974000000000000013c | 202.175 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 201.398 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000173 | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 1.325 | 200.644 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| bdc3555938478974000000000000014c | 202.116 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 200.937 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000153 | 202.082 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 201.245 | 0.005 | n/a | 0.084 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-46/journal/page | none observed |
| bdc3555938478974000000000000012d | 202.081 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 197.783 | 0.015 | n/a | 3.559 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-44/journal/page | none observed |
| bdc3555938478974000000000000012e | 202.072 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 199.594 | 1.533 | n/a | 0.030 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000176 | 202.032 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 201.272 | 0.010 | n/a | 0.117 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| bdc3555938478974000000000000018f | 202.003 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 201.203 | 0.009 | n/a | 0.091 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000141 | 201.990 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 201.010 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.067 | 0.000 | 0.000 | 0.067 | gw-r/thread-64/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.490 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 200.754 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 203.358 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.307 | 202.716 | 3.716 | n/a | 0.118 | 0.000 | n/a | n/a | 0.302 | 0.000 | 0.000 | 0.302 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bdc355593847897400000000000001e9 | 204.767 | 0.000 | n/a | 0.000 | 0.000 | 0.381 | 204.235 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | gw-r/thread-64/journal/page | none observed |
| bdc355593847897400000000000001be | 203.358 | 0.000 | n/a | 0.000 | 0.000 | 0.446 | 202.716 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| bdc355593847897400000000000001ae | 203.127 | 0.000 | n/a | 0.000 | 0.000 | 2.307 | 200.614 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-47/journal/page | none observed |
| bdc355593847897400000000000001bc | 202.895 | 0.000 | n/a | 0.000 | 0.000 | 1.078 | 201.563 | 0.009 | n/a | 0.097 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-44/journal/page | none observed |
| bdc355593847897400000000000001af | 202.831 | 0.000 | n/a | 0.000 | 0.000 | 1.450 | 201.064 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-45/journal/page | none observed |
| bdc355593847897400000000000001a7 | 202.806 | 0.000 | n/a | 0.000 | 0.000 | 0.418 | 202.250 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |
| bdc355593847897400000000000001f0 | 202.764 | 0.000 | n/a | 0.000 | 0.000 | 1.224 | 201.315 | 0.006 | n/a | 0.088 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| bdc355593847897400000000000001ea | 202.613 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.246 | 0.010 | n/a | 0.111 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-44/journal/page | none observed |
| bdc355593847897400000000000001d5 | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 201.666 | 0.009 | n/a | 0.097 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| bdc355593847897400000000000001c3 | 202.358 | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 201.569 | 0.014 | n/a | 0.092 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| bdc355593847897400000000000001c6 | 202.251 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 201.057 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-46/journal/page | none observed |
| bdc355593847897400000000000001c0 | 202.184 | 0.000 | n/a | 0.000 | 0.000 | 0.314 | 201.669 | 0.026 | n/a | 0.118 | 0.000 | n/a | n/a | 0.057 | 0.000 | 0.000 | 0.057 | gw-r/thread-42/journal/page | none observed |
| bdc355593847897400000000000001aa | 202.165 | 0.000 | n/a | 0.000 | 0.000 | 1.191 | 200.875 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.055 | 0.000 | 0.000 | 0.055 | gw-r/thread-46/journal/page | none observed |
| bdc355593847897400000000000001e8 | 202.132 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 201.221 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-47/journal/page | none observed |
| bdc355593847897400000000000001a8 | 202.122 | 0.000 | n/a | 0.000 | 0.000 | 0.512 | 201.392 | 0.006 | n/a | 0.099 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| bdc355593847897400000000000001c4 | 202.115 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 201.103 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000207 | 202.081 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 200.855 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.302 | 0.000 | 0.000 | 0.302 | gw-r/thread-46/journal/page | none observed |
| bdc355593847897400000000000001cd | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 201.084 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000197 | 202.065 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 200.685 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-64/journal/page | none observed |
| bdc355593847897400000000000001fc | 202.036 | 0.000 | n/a | 0.000 | 0.000 | 0.399 | 201.436 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.302 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.635 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 205.241 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.827 | 203.466 | 0.797 | n/a | 0.101 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bdc35559384789740000000000000218 | 205.905 | 0.000 | n/a | 0.000 | 0.000 | 3.827 | 201.867 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000258 | 205.241 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 204.207 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000210 | 205.222 | 0.000 | n/a | 0.000 | 0.000 | 4.563 | 200.522 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| bdc35559384789740000000000000228 | 204.261 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 203.466 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000236 | 203.418 | 0.000 | n/a | 0.000 | 0.000 | 2.217 | 201.019 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000237 | 203.312 | 0.000 | n/a | 0.000 | 0.000 | 2.354 | 200.721 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-44/journal/page | none observed |
| bdc35559384789740000000000000257 | 202.402 | 0.000 | n/a | 0.000 | 0.000 | 1.096 | 200.997 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-46/journal/page | none observed |
| bdc35559384789740000000000000262 | 202.281 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.287 | 0.010 | n/a | 0.101 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000225 | 202.132 | 0.000 | n/a | 0.000 | 0.000 | 0.516 | 201.443 | 0.046 | n/a | 0.039 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000278 | 202.121 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 201.321 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-44/journal/page | none observed |
| bdc35559384789740000000000000263 | 202.119 | 0.000 | n/a | 0.000 | 0.000 | 0.526 | 201.428 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-42/journal/page | none observed |
| bdc3555938478974000000000000024a | 202.109 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 201.220 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.070 | 0.000 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| bdc3555938478974000000000000025d | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 1.016 | 200.910 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000212 | 201.956 | 0.000 | n/a | 0.000 | 0.000 | 0.422 | 201.376 | 0.014 | n/a | 0.079 | 0.000 | n/a | n/a | 0.064 | 0.000 | 0.000 | 0.064 | gw-r/thread-49/journal/page | none observed |
| bdc3555938478974000000000000021d | 201.950 | 0.000 | n/a | 0.000 | 0.000 | 0.361 | 201.448 | 0.010 | n/a | 0.036 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000230 | 201.930 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 200.757 | 0.010 | n/a | 0.030 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000246 | 201.917 | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 201.027 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000242 | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 201.172 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000255 | 201.903 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 200.951 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-44/journal/page | none observed |
| bdc3555938478974000000000000026a | 201.897 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 200.932 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-64/journal/page | none observed |

## P3 / L1024 / read (71 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.714 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.483 | 68.000 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 202.599 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.155 | 201.417 | 3.539 | n/a | 0.086 | 0.000 | n/a | n/a | 50.127 | 0.000 | 0.000 | 50.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bdc3555938478974000000000000028d | 202.599 | 0.000 | n/a | 0.000 | 0.000 | 0.483 | 198.434 | 3.539 | n/a | 0.017 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| bdc35559384789740000000000000294 | 202.166 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 201.302 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000290 | 202.078 | 0.000 | n/a | 0.000 | 0.000 | 0.478 | 201.417 | 0.020 | n/a | 0.086 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |
| bdc3555938478974000000000000028e | 202.051 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 201.302 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| bdc3555938478974000000000000027d | 201.971 | 0.000 | n/a | 0.000 | 0.000 | 0.901 | 200.873 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-44/journal/page | none observed |
| bdc35559384789740000000000000296 | 201.903 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 201.038 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000295 | 201.848 | 0.000 | n/a | 0.000 | 0.000 | 0.523 | 201.138 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-44/journal/page | none observed |
| bdc35559384789740000000000000284 | 201.834 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 200.801 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000289 | 201.813 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 200.937 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |
| bdc3555938478974000000000000028b | 201.743 | 0.000 | n/a | 0.000 | 0.000 | 0.703 | 200.912 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000283 | 201.709 | 0.000 | n/a | 0.000 | 0.000 | 0.675 | 200.869 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-46/journal/page | none observed |
| bdc3555938478974000000000000027f | 201.670 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 200.626 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-47/journal/page | none observed |
| bdc3555938478974000000000000027e | 201.668 | 0.000 | n/a | 0.000 | 0.000 | 0.691 | 200.762 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |
| bdc3555938478974000000000000028f | 201.668 | 0.000 | n/a | 0.000 | 0.000 | 0.368 | 201.105 | 0.022 | n/a | 0.085 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000291 | 201.651 | 0.000 | n/a | 0.000 | 0.000 | 0.606 | 200.816 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000286 | 201.346 | 0.000 | n/a | 0.000 | 0.000 | 0.294 | 200.878 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000293 | 201.312 | 0.000 | n/a | 0.000 | 0.000 | 0.433 | 200.717 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000282 | 201.282 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 200.626 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-64/journal/page | none observed |
| bdc3555938478974000000000000028a | 201.167 | 0.000 | n/a | 0.000 | 0.000 | 0.488 | 200.549 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-45/journal/page | none observed |
| bdc3555938478974000000000000027c | 200.774 | 0.000 | n/a | 0.000 | 0.000 | 0.281 | 200.383 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-42/journal/page | none observed |

## P3 / tail / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.883 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.442 | 80.392 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 |
| p99 | 201.798 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.626 | 201.022 | 1.183 | n/a | 0.075 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bdc35559384789740000000000000f1e | 202.347 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 201.341 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000ee5 | 202.054 | 0.000 | n/a | 0.000 | 0.000 | 1.076 | 200.812 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000ec6 | 201.798 | 0.000 | n/a | 0.000 | 0.000 | 0.700 | 200.527 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.535 | 0.000 | 0.000 | 0.535 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000f2c | 201.717 | 0.000 | n/a | 0.000 | 0.000 | 0.601 | 200.855 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000f30 | 201.706 | 0.000 | n/a | 0.000 | 0.000 | 0.849 | 200.624 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-46/journal/page | none observed |
| bdc35559384789740000000000000f05 | 201.703 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 200.874 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000f1d | 201.701 | 0.000 | n/a | 0.000 | 0.000 | 0.395 | 201.160 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.062 | 0.000 | 0.000 | 0.062 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000ede | 201.696 | 0.000 | n/a | 0.000 | 0.000 | 0.611 | 200.899 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000ed8 | 201.590 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 200.795 | 0.004 | n/a | 0.065 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-46/journal/page | none observed |
| bdc35559384789740000000000000ed5 | 201.581 | 0.000 | n/a | 0.000 | 0.000 | 0.468 | 200.896 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000ee1 | 201.577 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 200.653 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-42/journal/page | none observed |
| bdc35559384789740000000000000edf | 201.548 | 0.000 | n/a | 0.000 | 0.000 | 0.611 | 200.771 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000f2d | 201.547 | 0.000 | n/a | 0.000 | 0.000 | 0.438 | 200.949 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-45/journal/page | none observed |
| bdc35559384789740000000000000eff | 201.547 | 0.000 | n/a | 0.000 | 0.000 | 0.349 | 201.022 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| bdc35559384789740000000000000f3f | 201.514 | 0.000 | n/a | 0.000 | 0.000 | 0.475 | 200.892 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000ef3 | 201.510 | 0.000 | n/a | 0.000 | 0.000 | 0.338 | 201.013 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-64/journal/page | none observed |
| bdc35559384789740000000000000f06 | 201.482 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 200.742 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| bdc35559384789740000000000000ecc | 201.458 | 0.000 | n/a | 0.000 | 0.000 | 0.473 | 200.836 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000f15 | 201.451 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 200.354 | 0.004 | n/a | 0.016 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-49/journal/page | none observed |
| bdc35559384789740000000000000ef4 | 201.425 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 200.660 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.956 ms; post-ACK p50/p99: 0.389/1.806 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.001 | 9.537 | 9.306 | reported |
| All-primary p99 ms | 44.913 | 44.395 | 42.843 | <=50 |
| L256 5-10 p50Ms | 11.647 | 11.199 | 11.199 | <=10 |
| L256 5-10 p99Ms | 35.069 | 34.788 | 34.786 | <=50 |
| L256 11-25 p50Ms | 13.951 | 12.863 | 12.863 | <=10 |
| L256 11-25 p99Ms | 27.705 | 27.183 | 25.031 | <=50 |
| L256 26-50 p50Ms | 15.039 | 14.399 | 14.399 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 15.753 | 14.763 | 14.762 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.703 | 8.383 | 8.191 | <=10 |
| Burst 11-25 p50 ms | 10.815 | 10.175 | 9.983 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 35.069 | 34.788 | 34.786 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 75.131 | 74.888 | 74.886 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 107.656/107.656 | 103.884 | 85.780 | 189.461 | 1.148/0.163 |
| 5-10 | 250-1000 | 48 | 13.849/83.625 | 13.558 | 8.144 | 20.275 | 0.075/0.021 |
| 5-10 | 50-100 | 67 | 8.428/21.062 | 8.205 | 4.475 | 11.234 | 0.052/0.018 |
| 11-25 | 250-1000 | 30 | 19.409/107.396 | 18.362 | 11.585 | 27.300 | 0.087/0.021 |
| 26-50 | 100-250 | 3 | 18.780/23.605 | 18.148 | 10.590 | 25.427 | 0.094/0.021 |
| 5-10 | 100-250 | 20 | 11.584/22.598 | 10.961 | 6.365 | 16.044 | 0.071/0.019 |
| 26-50 | 250-1000 | 9 | 25.494/52.313 | 24.469 | 11.376 | 24.740 | 0.097/0.021 |
| 5-10 | overlap | 792 | 9.692/47.248 | 9.337 | 5.542 | 12.961 | 0.034/0.016 |
| 26-50 | 0-50 | 196 | 13.127/56.532 | 12.071 | 6.098 | 16.577 | 0.061/0.019 |
| 11-25 | 100-250 | 10 | 10.899/25.042 | 10.019 | 6.089 | 14.932 | 0.072/0.024 |
| 11-25 | 0-50 | 534 | 9.633/30.801 | 9.065 | 4.744 | 12.529 | 0.047/0.018 |
| 5-10 | 0-50 | 1138 | 7.868/23.888 | 7.545 | 4.054 | 10.319 | 0.042/0.017 |
| 26-50 | overlap | 144 | 15.979/70.326 | 14.669 | 8.411 | 21.080 | 0.052/0.018 |
| 11-25 | 50-100 | 40 | 10.102/16.426 | 9.680 | 5.219 | 13.425 | 0.060/0.018 |
| 26-50 | 50-100 | 16 | 14.758/38.453 | 13.875 | 7.367 | 19.573 | 0.063/0.018 |
| 11-25 | overlap | 372 | 12.019/44.072 | 11.317 | 6.964 | 16.073 | 0.038/0.017 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 886 | 5 | 398.148 |
| burst | 2534 | 20 | 1244.808 |

## Writer heap, GC and scheduler stalls

Source 236dd70bf8077ee0a91acba63376db723e078306; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 343.800 / 535.375 |
| GC events / total duration / maximum ms | 619 / 1332.749 / 44.378 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":609,"4":5,"8":5} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 44.913 / 25 / 1642.956 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

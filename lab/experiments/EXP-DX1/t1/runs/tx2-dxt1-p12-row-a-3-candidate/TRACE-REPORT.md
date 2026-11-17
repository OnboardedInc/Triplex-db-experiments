# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (178.468 ms, trace `aa8db026b97c97bd0000000000000193`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (152.678 ms, trace `aa8db026b97c97bd0000000000000108`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (87.663 ms, trace `aa8db026b97c97bd0000000000000142`); `gw-w/thread-44/gateway.admitted-work` (53.156 ms, trace `aa8db026b97c97bd000000000000016e`); `gw-w/thread-46/gateway.admitted-work` (52.565 ms, trace `aa8db026b97c97bd00000000000001fc`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p12-row-a-3-candidate`; source `2409bdada6be6cb7f17d1aa71f31da90a72f01af`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8797748.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 214 source calibrations, offsets preserved in raw traces and trace-summary.json. 0 JFR events without continuous-anchor proof are retained raw but not overlaid; Mac wall samples are whole-run context, not per-commit overlap evidence.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13572.524 | 604.656 | 7.148 | 454 |
| L1 | 0 | 19008.958 | 442.249 | 21.104 | 665 |
| L4 | 0 | 19102.994 | 387.766 | 9.563 | 625 |
| L16 | 0 | 19982.465 | 382.839 | 9.761 | 686 |
| L64 | 0 | 19973.503 | 469.821 | 10.776 | 870 |
| L256 | 0 | 19969.659 | 577.151 | 10.630 | 688 |
| L1024 | 0 | 19981.224 | 4384.563 | 48.422 | 17251 |
| tail | 0 | 64443.618 | 12877.970 | 120.687 | 52650 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| aa8db026b97c97bd0000000000000193 | driver.queue.scheduler-dispatch | 0.102 | none | 0 / 32 |
| aa8db026b97c97bd0000000000000193 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace aa8db026b97c97bd0000000000000193 waited: []

| aa8db026b97c97bd0000000000000108 | driver.queue.scheduler-dispatch | 0.231 | none | 0 / 32 |
| aa8db026b97c97bd0000000000000108 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace aa8db026b97c97bd0000000000000108 waited: []

| aa8db026b97c97bd0000000000000142 | driver.queue.scheduler-dispatch | 0.052 | none | 0 / 32 |
| aa8db026b97c97bd0000000000000142 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace aa8db026b97c97bd0000000000000142 waited: []

| aa8db026b97c97bd000000000000016e | driver.queue.scheduler-dispatch | 0.045 | none | 0 / 32 |
| aa8db026b97c97bd000000000000016e | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace aa8db026b97c97bd000000000000016e waited: []

| aa8db026b97c97bd00000000000001fc | driver.queue.scheduler-dispatch | 0.057 | none | 0 / 32 |
| aa8db026b97c97bd00000000000001fc | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace aa8db026b97c97bd00000000000001fc waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.194 | 0.758 | 0.000 | 0.914 | 5.009 | 0.500 | 0.000 | 0.080 | 1.394 | 5.936 | 0.024 | n/a | 0.311 | 16.518 | n/a | n/a | 0.034 | 5.336 | 0.184 | 0.034 |
| p99 | 177.277 | 4.880 | 0.025 | 3.464 | 19.458 | n/a | 8.653 | 0.751 | 6.895 | 23.951 | 0.138 | n/a | 4.469 | 152.678 | n/a | n/a | 0.209 | 19.770 | 0.386 | 0.209 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd0000000000000108 | 177.277 | 7.788 | 0.210 | 0.000 | 0.235 | 2.194 | 14.026 | 0.024 | n/a | 0.083 | 152.678 | n/a | n/a | 0.038 | 8.233 | 0.046 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.099ms; driver.publication.persist-deferred 0.073ms; driver.reader-basis.broadcast 0.063ms; driver.reader-basis.broadcast 0.038ms |
| aa8db026b97c97bd0000000000000109 | 90.517 | 4.457 | n/a | 0.000 | 0.110 | 1.208 | 2.219 | 0.031 | n/a | 4.419 | 78.043 | n/a | n/a | 0.030 | 4.566 | 0.050 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| aa8db026b97c97bd00000000000000f3 | 86.337 | 19.458 | n/a | 0.000 | 0.312 | 1.025 | 13.596 | 0.026 | n/a | 0.102 | 51.608 | n/a | n/a | 0.209 | 19.770 | 0.229 | 0.209 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| aa8db026b97c97bd00000000000000f6 | 71.872 | 13.115 | 0.500 | 0.000 | 0.064 | 1.756 | 22.306 | 0.138 | n/a | 0.948 | 33.020 | n/a | n/a | 0.025 | 13.679 | 0.190 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| aa8db026b97c97bd00000000000000fe | 52.288 | 5.009 | 0.262 | 0.000 | 0.058 | 2.064 | 18.707 | 0.018 | n/a | 0.102 | 26.042 | n/a | n/a | 0.025 | 5.329 | 0.102 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| aa8db026b97c97bd000000000000011c | 48.385 | 7.486 | n/a | 2.803 | 0.047 | 0.986 | 5.936 | 0.021 | n/a | 0.118 | 30.969 | n/a | n/a | 0.020 | 10.336 | 0.214 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| aa8db026b97c97bd0000000000000106 | 41.426 | 5.137 | 0.249 | 0.000 | 0.091 | 1.725 | 17.501 | 0.039 | n/a | 0.128 | 16.518 | n/a | n/a | 0.038 | 5.478 | 0.132 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| aa8db026b97c97bd0000000000000102 | 39.586 | 7.774 | 0.397 | 0.000 | 0.044 | 4.877 | 9.154 | 0.025 | n/a | 0.571 | 16.711 | n/a | n/a | 0.034 | 8.215 | 0.208 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| aa8db026b97c97bd00000000000000fa | 39.336 | 4.883 | 0.215 | 0.000 | 0.052 | 2.556 | 23.951 | 0.027 | n/a | 0.087 | 7.534 | n/a | n/a | 0.032 | 5.149 | 0.131 | 0.032 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.019ms |
| aa8db026b97c97bd000000000000011e | 38.666 | 4.279 | 0.236 | 0.000 | 0.167 | 1.573 | 12.018 | 0.024 | n/a | 0.340 | 19.973 | n/a | n/a | 0.057 | 4.681 | 0.121 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000110 | 38.075 | 5.287 | 0.298 | 0.000 | 0.063 | 1.600 | 9.566 | 0.034 | n/a | 0.532 | 20.672 | n/a | n/a | 0.023 | 5.647 | 0.148 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| aa8db026b97c97bd00000000000000f8 | 37.889 | 3.294 | n/a | 8.653 | 0.093 | 3.019 | 1.272 | 0.012 | n/a | 0.113 | 21.264 | n/a | n/a | 0.168 | 12.041 | 0.318 | 0.168 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| aa8db026b97c97bd0000000000000114 | 37.507 | 5.421 | 0.166 | 0.000 | 0.061 | 1.737 | 14.118 | 0.037 | n/a | 0.107 | 15.831 | n/a | n/a | 0.029 | 5.648 | 0.151 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000126 | 37.491 | 4.889 | 0.368 | 0.000 | 0.079 | 1.733 | 11.760 | 0.024 | n/a | 0.995 | 17.592 | n/a | n/a | 0.052 | 5.336 | 0.142 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000123 | 37.194 | 4.370 | n/a | 0.000 | 0.751 | 0.951 | 2.619 | 0.028 | n/a | 4.257 | 24.198 | n/a | n/a | 0.019 | 5.121 | 0.138 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| aa8db026b97c97bd0000000000000112 | 37.152 | 13.417 | 0.497 | 0.000 | 0.120 | 6.895 | 5.947 | 0.033 | n/a | 1.570 | 8.616 | n/a | n/a | 0.057 | 14.034 | 0.378 | 0.057 | node-14/thread-6/client.persist-and-resolve | driver.reader-basis.broadcast 0.020ms |
| aa8db026b97c97bd000000000000011a | 35.454 | 7.336 | 0.278 | 0.000 | 0.117 | 1.803 | 12.744 | 0.044 | n/a | 0.096 | 12.971 | n/a | n/a | 0.065 | 7.730 | 0.218 | 0.065 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000118 | 33.748 | 5.081 | n/a | 0.000 | 0.133 | 1.394 | 0.963 | 0.014 | n/a | 0.133 | 25.973 | n/a | n/a | 0.058 | 5.214 | 0.155 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000122 | 29.557 | 5.517 | 0.228 | 0.000 | 0.111 | 1.351 | 8.553 | 0.033 | n/a | 0.896 | 12.823 | n/a | n/a | 0.045 | 5.856 | 0.198 | 0.045 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000010d | 27.271 | 2.622 | n/a | 0.000 | 0.071 | 0.698 | 4.061 | 0.019 | n/a | 1.352 | 18.426 | n/a | n/a | 0.022 | 2.692 | 0.099 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.340 | 1.033 | 0.000 | 1.045 | 3.689 | n/a | 0.000 | 0.080 | 0.951 | 1.272 | 0.017 | n/a | 0.314 | 10.839 | n/a | n/a | 0.034 | 4.774 | 0.206 | 0.034 |
| p99 | 37.889 | 2.404 | 0.000 | 2.356 | 5.227 | n/a | 8.653 | 0.751 | 3.019 | 4.259 | 0.035 | n/a | 4.469 | 25.973 | n/a | n/a | 0.168 | 12.041 | 0.386 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd00000000000000f8 | 37.889 | 3.294 | n/a | 8.653 | 0.093 | 3.019 | 1.272 | 0.012 | n/a | 0.113 | 21.264 | n/a | n/a | 0.168 | 12.041 | 0.318 | 0.168 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| aa8db026b97c97bd0000000000000123 | 37.194 | 4.370 | n/a | 0.000 | 0.751 | 0.951 | 2.619 | 0.028 | n/a | 4.257 | 24.198 | n/a | n/a | 0.019 | 5.121 | 0.138 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| aa8db026b97c97bd0000000000000118 | 33.748 | 5.081 | n/a | 0.000 | 0.133 | 1.394 | 0.963 | 0.014 | n/a | 0.133 | 25.973 | n/a | n/a | 0.058 | 5.214 | 0.155 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000000fc | 24.510 | 3.884 | n/a | 0.000 | 0.061 | 1.053 | 2.543 | 0.035 | n/a | 4.469 | 12.436 | n/a | n/a | 0.029 | 3.945 | 0.161 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| aa8db026b97c97bd0000000000000120 | 20.340 | 5.227 | n/a | 1.729 | 0.136 | 0.906 | 4.216 | 0.013 | n/a | 0.311 | 7.762 | n/a | n/a | 0.041 | 7.092 | 0.349 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000012a | 16.588 | 3.340 | n/a | 0.000 | 0.080 | 0.927 | 1.196 | 0.022 | n/a | 0.150 | 10.839 | n/a | n/a | 0.034 | 3.420 | 0.206 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000100 | 15.850 | 2.858 | n/a | 0.000 | 0.080 | 0.935 | 4.259 | 0.017 | n/a | 0.393 | 7.271 | n/a | n/a | 0.039 | 2.938 | 0.185 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000128 | 12.355 | 3.281 | n/a | 1.441 | 0.052 | 0.761 | 1.021 | 0.019 | n/a | 0.314 | 5.432 | n/a | n/a | 0.034 | 4.774 | 0.386 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000115 | 11.985 | 3.689 | n/a | 0.000 | 0.073 | 1.721 | 0.901 | 0.014 | n/a | 1.037 | 4.522 | n/a | n/a | 0.028 | 3.762 | 0.314 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 106.859 | n/a | n/a | n/a | 44.734 | 3.056 | 3.376 | 0.000 | 0.711 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.998 | 68.646 | 0.743 | 28.998 |
| p99 | 715.229 | n/a | n/a | n/a | 262.600 | 381.496 | 31.639 | 0.000 | 35.727 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 414.594 | 428.679 | 1.000 | 414.594 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd0000000000001c5c | 731.581 | 38.961 | 381.496 | 8.222 | 0.000 | 0.640 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 302.261 | 428.679 | 0.586 | 302.261 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 1.614ms; driver.reader-basis.broadcast 0.786ms; driver.reader-basis.broadcast 0.597ms; driver.reader-basis.broadcast 0.354ms; driver.reader-basis.broadcast 0.316ms |
| aa8db026b97c97bd0000000000001c61 | 715.229 | 52.457 | 534.180 | 3.351 | 0.000 | 0.644 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 124.597 | 589.988 | 0.825 | 124.597 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 1.614ms; driver.reader-basis.broadcast 0.786ms; driver.reader-basis.broadcast 0.354ms; driver.reader-basis.broadcast 0.316ms; driver.reader-basis.broadcast 0.307ms |
| aa8db026b97c97bd0000000000001c60 | 694.698 | 109.070 | 157.879 | 11.832 | 0.000 | 1.322 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 414.594 | 278.782 | 0.401 | 414.594 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.614ms; driver.reader-basis.broadcast 0.786ms; driver.reader-basis.broadcast 0.354ms; driver.reader-basis.broadcast 0.316ms; driver.reader-basis.broadcast 0.307ms |
| aa8db026b97c97bd0000000000001c55 | 665.116 | 13.948 | 192.009 | 0.000 | 0.000 | 0.601 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 458.558 | 205.957 | 0.310 | 458.558 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.614ms; driver.reader-basis.broadcast 0.786ms; driver.reader-basis.broadcast 0.597ms; driver.reader-basis.broadcast 0.354ms; driver.reader-basis.broadcast 0.316ms |
| aa8db026b97c97bd0000000000001c54 | 630.203 | 242.157 | 0.134 | 28.211 | 0.000 | 2.184 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 357.516 | 270.503 | 0.429 | 357.516 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.614ms; driver.reader-basis.broadcast 0.786ms; driver.reader-basis.broadcast 0.597ms; driver.reader-basis.broadcast 0.354ms; driver.reader-basis.broadcast 0.316ms |
| aa8db026b97c97bd0000000000001a12 | 571.167 | 245.289 | 15.059 | 27.735 | 0.000 | 217.990 | 53.819 | 0.005 | n/a | 0.010 | 0.000 | n/a | n/a | 11.261 | 288.083 | 0.504 | 11.261 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.914ms; driver.reader-basis.broadcast 0.650ms; driver.reader-basis.broadcast 0.510ms; driver.reader-basis.broadcast 0.348ms; driver.publication.readback 0.301ms |
| aa8db026b97c97bd0000000000001c51 | 446.242 | 213.210 | 4.802 | 29.806 | 0.000 | 24.826 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 173.597 | 247.818 | 0.555 | 173.597 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.614ms; driver.reader-basis.broadcast 0.786ms; driver.reader-basis.broadcast 0.597ms; driver.reader-basis.broadcast 0.354ms; driver.publication.readback 0.295ms |
| aa8db026b97c97bd0000000000001d98 | 402.913 | 68.995 | 0.432 | 4.266 | 0.000 | 1.220 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 328.000 | 73.693 | 0.183 | 328.000 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.774ms; driver.reader-basis.broadcast 0.710ms; driver.reader-basis.broadcast 0.679ms; driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.214ms |
| aa8db026b97c97bd0000000000001a0f | 350.137 | 262.600 | 5.780 | 34.827 | 0.000 | 7.793 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.137 | 303.207 | 0.866 | 39.137 | node-14/thread-3/client.reach | driver.expected-state.bind-receipt 1.914ms; driver.reader-basis.broadcast 0.348ms; driver.reader-basis.broadcast 0.261ms; driver.reader-basis.broadcast 0.259ms; driver.publication.readback 0.163ms |
| aa8db026b97c97bd0000000000001d9c | 347.096 | 37.544 | 0.243 | 2.868 | 0.000 | 0.571 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 305.870 | 40.655 | 0.117 | 305.870 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.774ms; driver.reader-basis.broadcast 0.710ms; driver.reader-basis.broadcast 0.679ms; driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.121ms |
| aa8db026b97c97bd0000000000001d99 | 327.069 | 262.702 | 0.570 | 21.797 | 0.000 | 1.174 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.826 | 285.069 | 0.872 | 40.826 | node-14/thread-3/client.reach | driver.reader-basis.broadcast 0.774ms; driver.reader-basis.broadcast 0.710ms; driver.reader-basis.broadcast 0.679ms; driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.214ms |
| aa8db026b97c97bd000000000000114e | 293.333 | 113.263 | 3.326 | 10.436 | 0.000 | 4.721 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 161.586 | 127.025 | 0.433 | 161.586 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.602ms; driver.reader-basis.broadcast 0.530ms; driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.148ms; driver.publication.readback 0.130ms |
| aa8db026b97c97bd0000000000001809 | 285.529 | 230.761 | 0.961 | 31.639 | 0.000 | 2.111 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.056 | 263.362 | 0.922 | 20.056 | node-14/thread-3/client.reach | driver.reader-basis.broadcast 0.304ms; driver.publication.readback 0.289ms; driver.reader-basis.broadcast 0.264ms; driver.publication.readback 0.110ms; driver.publication.readback 0.109ms |
| aa8db026b97c97bd0000000000001c99 | 285.073 | 37.422 | 140.289 | 6.918 | 0.000 | 0.474 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 99.970 | 184.628 | 0.648 | 99.970 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.316ms; driver.reader-basis.broadcast 0.307ms; driver.reader-basis.broadcast 0.290ms; driver.publication.readback 0.185ms; driver.publication.readback 0.137ms |
| aa8db026b97c97bd0000000000001a40 | 256.818 | 37.067 | 214.453 | 2.621 | 0.000 | 0.424 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.253 | 254.141 | 0.990 | 2.253 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.650ms; driver.publication.readback 0.301ms; driver.reader-basis.broadcast 0.260ms; driver.publication.readback 0.125ms; driver.publication.readback 0.114ms |
| aa8db026b97c97bd00000000000018a5 | 248.901 | 51.439 | 0.379 | 31.107 | 0.000 | 0.676 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 165.300 | 82.924 | 0.333 | 165.300 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.647ms; driver.reader-basis.broadcast 0.260ms; driver.publication.readback 0.114ms; driver.publication.readback 0.106ms; driver.publication.readback 0.095ms |
| aa8db026b97c97bd0000000000001370 | 248.485 | 88.237 | 61.276 | 7.738 | 0.000 | 0.757 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 90.477 | 157.250 | 0.633 | 90.477 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.477ms; driver.reader-basis.broadcast 0.219ms; driver.reader-basis.broadcast 0.218ms; driver.publication.readback 0.160ms; driver.publication.readback 0.132ms |
| aa8db026b97c97bd000000000000067c | 234.094 | 55.297 | 96.364 | 8.669 | 0.000 | 4.462 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 69.301 | 160.330 | 0.685 | 69.301 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.577ms; driver.reader-basis.broadcast 0.209ms; driver.publication.readback 0.121ms; driver.publication.readback 0.116ms; driver.publication.readback 0.108ms |
| aa8db026b97c97bd0000000000001c53 | 226.566 | 57.440 | 1.081 | 10.125 | 0.000 | 1.122 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 156.797 | 68.646 | 0.303 | 156.797 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.614ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.295ms; driver.publication.readback 0.170ms; driver.publication.readback 0.130ms |
| aa8db026b97c97bd0000000000000687 | 223.517 | 18.599 | 181.594 | 1.726 | 0.000 | 0.284 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.314 | 201.918 | 0.903 | 21.314 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.209ms; driver.publication.readback 0.136ms; driver.publication.readback 0.121ms; driver.publication.readback 0.116ms; driver.publication.readback 0.108ms |

## P2 / outside-phases / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.432 | 0.336 | 0.000 | 0.399 | 4.159 | 0.250 | 0.000 | 0.049 | 1.326 | 5.373 | 0.019 | n/a | 0.078 | 7.620 | n/a | n/a | 0.022 | 4.588 | 0.215 | 0.022 |
| p99 | 36.649 | 1.523 | 0.000 | 0.808 | 4.911 | n/a | 0.000 | 0.079 | 1.696 | 13.840 | 0.028 | n/a | 0.451 | 16.008 | n/a | n/a | 0.037 | 5.197 | 0.241 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd0000000000000180 | 36.649 | 4.159 | 0.350 | 0.000 | 0.079 | 1.696 | 13.840 | 0.028 | n/a | 0.451 | 16.008 | n/a | n/a | 0.037 | 4.588 | 0.125 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000012e | 24.224 | 4.911 | 0.232 | 0.000 | 0.053 | 1.326 | 6.277 | 0.019 | n/a | 0.100 | 11.270 | n/a | n/a | 0.035 | 5.197 | 0.215 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001cf | 19.432 | 4.388 | 0.250 | 0.000 | 0.049 | 1.631 | 5.373 | 0.021 | n/a | 0.078 | 7.620 | n/a | n/a | 0.022 | 4.687 | 0.241 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.007ms |
| aa8db026b97c97bd0000000000000992 | 10.249 | 2.231 | n/a | 0.000 | 0.032 | 0.379 | 0.581 | 0.007 | n/a | 0.031 | 6.972 | n/a | n/a | 0.016 | 2.264 | 0.221 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms |

## P2 / L1 / commit (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.943 | 0.442 | 0.000 | 0.675 | 4.299 | n/a | 0.000 | 0.071 | 1.115 | 5.481 | 0.021 | n/a | 0.380 | 11.437 | n/a | n/a | 0.031 | 4.937 | 0.179 | 0.031 |
| p99 | 106.883 | 4.487 | 0.029 | 4.574 | 8.951 | n/a | 4.828 | 7.643 | 6.708 | 54.979 | 2.387 | n/a | 3.824 | 87.663 | n/a | n/a | 0.137 | 12.160 | 0.626 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd0000000000000142 | 106.883 | 3.660 | 0.206 | 0.000 | 0.054 | 1.425 | 11.146 | 2.387 | n/a | 0.306 | 87.663 | n/a | n/a | 0.036 | 3.920 | 0.037 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.079ms |
| aa8db026b97c97bd000000000000016e | 96.794 | 3.411 | 0.145 | 0.000 | 0.047 | 1.077 | 54.979 | 0.049 | n/a | 3.062 | 34.000 | n/a | n/a | 0.022 | 3.603 | 0.037 | 0.022 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.048ms |
| aa8db026b97c97bd0000000000000132 | 58.596 | 5.357 | 0.264 | 0.358 | 0.081 | 1.389 | 16.334 | 0.034 | n/a | 0.663 | 34.074 | n/a | n/a | 0.042 | 6.060 | 0.103 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000139 | 48.297 | 4.030 | 0.259 | 0.328 | 0.064 | 4.376 | 10.578 | 0.027 | n/a | 0.283 | 28.314 | n/a | n/a | 0.038 | 4.681 | 0.097 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000014a | 44.910 | 6.253 | 0.411 | 0.000 | 0.075 | 1.488 | 11.946 | 0.021 | n/a | 0.124 | 24.556 | n/a | n/a | 0.036 | 6.739 | 0.150 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000170 | 44.220 | 6.113 | 0.169 | 0.000 | 0.049 | 1.490 | 13.333 | 0.021 | n/a | 0.136 | 22.886 | n/a | n/a | 0.023 | 6.330 | 0.143 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000144 | 37.106 | 4.299 | 0.211 | 0.000 | 0.426 | 1.310 | 14.940 | 0.058 | n/a | 0.330 | 15.394 | n/a | n/a | 0.137 | 4.937 | 0.133 | 0.137 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000148 | 36.849 | 6.134 | n/a | 0.000 | 0.071 | 1.396 | 1.343 | 0.017 | n/a | 0.092 | 27.766 | n/a | n/a | 0.030 | 6.205 | 0.168 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| aa8db026b97c97bd0000000000000146 | 36.710 | 4.522 | 0.223 | 0.000 | 0.045 | 1.428 | 11.296 | 0.022 | n/a | 0.084 | 19.068 | n/a | n/a | 0.023 | 4.790 | 0.130 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000130 | 35.894 | 5.653 | 0.315 | 0.794 | 0.115 | 2.183 | 15.867 | 0.044 | n/a | 0.178 | 10.707 | n/a | n/a | 0.037 | 6.877 | 0.192 | 0.037 | gw-w/thread-44/gateway.admitted-work | none observed |
| aa8db026b97c97bd000000000000015a | 35.637 | 7.575 | 0.154 | 0.000 | 0.057 | 3.432 | 8.063 | 0.030 | n/a | 0.357 | 15.944 | n/a | n/a | 0.025 | 7.786 | 0.218 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000137 | 33.397 | 3.611 | n/a | 1.309 | 0.077 | 0.764 | 1.163 | 0.019 | n/a | 0.405 | 26.018 | n/a | n/a | 0.031 | 4.996 | 0.150 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000016a | 32.945 | 4.023 | 0.170 | 0.000 | 0.072 | 1.691 | 18.759 | 0.029 | n/a | 0.401 | 7.765 | n/a | n/a | 0.036 | 4.265 | 0.129 | 0.036 | gw-w/thread-41/gateway.admitted-work | none observed |
| aa8db026b97c97bd000000000000014e | 32.354 | 4.357 | 0.413 | 0.000 | 0.097 | 1.236 | 9.102 | 0.031 | n/a | 2.998 | 14.070 | n/a | n/a | 0.048 | 4.868 | 0.150 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000135 | 31.824 | 8.951 | n/a | 0.000 | 0.155 | 0.854 | 5.994 | 0.020 | n/a | 0.091 | 15.679 | n/a | n/a | 0.081 | 9.106 | 0.286 | 0.081 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000166 | 31.430 | 7.621 | 0.149 | 0.000 | 0.051 | 1.379 | 11.905 | 0.020 | n/a | 0.380 | 9.902 | n/a | n/a | 0.024 | 7.820 | 0.249 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000017e | 30.309 | 4.142 | 0.327 | 0.000 | 0.053 | 1.013 | 7.042 | 0.027 | n/a | 3.471 | 14.204 | n/a | n/a | 0.031 | 4.522 | 0.149 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000013a | 29.856 | 8.608 | n/a | 0.000 | 1.149 | 6.708 | 7.582 | 0.037 | n/a | 0.342 | 5.408 | n/a | n/a | 0.023 | 9.757 | 0.327 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000176 | 29.019 | 3.741 | 0.235 | 0.000 | 0.054 | 1.378 | 12.823 | 0.032 | n/a | 1.683 | 9.043 | n/a | n/a | 0.028 | 4.031 | 0.139 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000161 | 28.702 | 3.187 | n/a | 0.000 | 0.045 | 2.510 | 5.481 | 0.035 | n/a | 0.098 | 17.325 | n/a | n/a | 0.021 | 3.231 | 0.113 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.020ms |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.625 | 0.000 | 0.000 | 0.454 | 3.611 | n/a | 0.000 | 0.141 | 0.967 | 1.163 | 0.016 | n/a | 0.337 | 11.027 | n/a | n/a | 0.031 | 4.996 | 0.234 | 0.031 |
| p99 | 33.397 | 2.220 | 0.000 | 2.082 | 8.608 | n/a | 1.309 | 7.643 | 6.708 | 7.582 | 0.037 | n/a | 3.824 | 26.018 | n/a | n/a | 0.061 | 10.653 | 0.626 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd0000000000000137 | 33.397 | 3.611 | n/a | 1.309 | 0.077 | 0.764 | 1.163 | 0.019 | n/a | 0.405 | 26.018 | n/a | n/a | 0.031 | 4.996 | 0.150 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000013a | 29.856 | 8.608 | n/a | 0.000 | 1.149 | 6.708 | 7.582 | 0.037 | n/a | 0.342 | 5.408 | n/a | n/a | 0.023 | 9.757 | 0.327 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000156 | 22.728 | 5.186 | n/a | 0.000 | 0.141 | 1.102 | 0.974 | 0.014 | n/a | 3.824 | 11.437 | n/a | n/a | 0.050 | 5.327 | 0.234 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000160 | 20.681 | 2.035 | n/a | 0.000 | 0.140 | 0.967 | 1.021 | 0.016 | n/a | 0.337 | 16.104 | n/a | n/a | 0.061 | 2.176 | 0.105 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000014b | 20.625 | 2.170 | n/a | 0.000 | 0.048 | 0.487 | 0.951 | 0.010 | n/a | 0.292 | 16.645 | n/a | n/a | 0.021 | 2.218 | 0.108 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000172 | 20.225 | 4.033 | n/a | 0.000 | 2.562 | 1.115 | 1.287 | 0.016 | n/a | 0.155 | 11.027 | n/a | n/a | 0.031 | 6.594 | 0.326 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000017b | 17.025 | 3.010 | n/a | 0.000 | 7.643 | 0.572 | 1.895 | 0.025 | n/a | 0.137 | 3.722 | n/a | n/a | 0.022 | 10.653 | 0.626 | 0.022 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.865ms; driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.026ms |
| aa8db026b97c97bd0000000000000164 | 10.625 | 3.998 | n/a | 0.000 | 0.717 | 1.047 | 1.260 | 0.018 | n/a | 0.584 | 2.956 | n/a | n/a | 0.046 | 4.714 | 0.444 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.889 | 0.424 | 0.000 | 0.691 | 4.387 | 0.415 | 0.000 | 0.073 | 1.179 | 4.934 | 0.023 | n/a | 0.131 | 12.269 | n/a | n/a | 0.033 | 4.696 | 0.187 | 0.033 |
| p99 | 200.142 | 8.902 | 0.045 | 8.045 | 12.374 | n/a | 0.000 | 1.912 | 2.919 | 21.368 | 0.239 | n/a | 3.255 | 178.468 | n/a | n/a | 0.098 | 12.457 | 0.353 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd0000000000000193 | 200.142 | 4.524 | 0.293 | 0.000 | 0.105 | 1.512 | 14.408 | 0.033 | n/a | 0.744 | 178.468 | n/a | n/a | 0.054 | 4.922 | 0.025 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms; driver.reader-basis.broadcast 0.025ms |
| aa8db026b97c97bd000000000000018b | 49.444 | 3.798 | 0.187 | 0.000 | 0.075 | 1.601 | 20.526 | 0.043 | n/a | 0.120 | 23.062 | n/a | n/a | 0.033 | 4.060 | 0.082 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000019b | 46.782 | 5.136 | 0.288 | 0.000 | 0.049 | 1.583 | 21.368 | 0.098 | n/a | 0.311 | 17.922 | n/a | n/a | 0.028 | 5.473 | 0.117 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000018c | 43.102 | 12.374 | n/a | 0.000 | 0.083 | 1.047 | 11.133 | 0.239 | n/a | 0.096 | 18.093 | n/a | n/a | 0.038 | 12.457 | 0.289 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| aa8db026b97c97bd00000000000001a9 | 42.175 | 4.562 | 0.274 | 0.000 | 0.062 | 2.005 | 19.769 | 0.049 | n/a | 3.148 | 12.269 | n/a | n/a | 0.037 | 4.898 | 0.116 | 0.037 | gw-w/thread-41/gateway.admitted-work | none observed |
| aa8db026b97c97bd0000000000000188 | 38.533 | 5.438 | 0.226 | 0.000 | 0.048 | 1.069 | 6.728 | 0.021 | n/a | 0.059 | 24.924 | n/a | n/a | 0.022 | 5.712 | 0.148 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000019f | 37.681 | 4.429 | 0.197 | 0.000 | 0.070 | 1.451 | 20.497 | 0.025 | n/a | 0.083 | 10.896 | n/a | n/a | 0.033 | 4.696 | 0.125 | 0.033 | gw-w/thread-45/gateway.admitted-work | none observed |
| aa8db026b97c97bd00000000000001a7 | 36.641 | 8.016 | 0.324 | 0.000 | 0.108 | 1.471 | 5.807 | 0.018 | n/a | 0.349 | 20.450 | n/a | n/a | 0.098 | 8.448 | 0.231 | 0.098 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001bd | 36.084 | 4.151 | 0.345 | 0.000 | 0.156 | 1.596 | 18.978 | 0.032 | n/a | 0.125 | 10.618 | n/a | n/a | 0.081 | 4.653 | 0.129 | 0.081 | gw-w/thread-47/gateway.admitted-work | none observed |
| aa8db026b97c97bd0000000000000195 | 36.064 | 5.072 | 0.226 | 0.000 | 0.047 | 1.179 | 12.104 | 0.033 | n/a | 0.116 | 17.261 | n/a | n/a | 0.025 | 5.345 | 0.148 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001a1 | 34.412 | 4.526 | 0.248 | 0.000 | 0.108 | 1.531 | 6.063 | 0.029 | n/a | 3.255 | 18.607 | n/a | n/a | 0.047 | 4.881 | 0.142 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001ad | 33.380 | 4.115 | 0.180 | 0.000 | 0.069 | 1.375 | 10.563 | 0.037 | n/a | 0.732 | 16.270 | n/a | n/a | 0.040 | 4.364 | 0.131 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001a3 | 32.916 | 6.511 | n/a | 0.000 | 0.073 | 1.214 | 2.819 | 0.059 | n/a | 0.733 | 21.475 | n/a | n/a | 0.031 | 6.585 | 0.200 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001bb | 31.213 | 9.417 | n/a | 0.000 | 0.108 | 1.880 | 1.958 | 0.017 | n/a | 0.474 | 17.311 | n/a | n/a | 0.049 | 9.525 | 0.305 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001c5 | 31.143 | 7.564 | 0.415 | 0.000 | 0.132 | 1.698 | 9.573 | 0.044 | n/a | 0.223 | 11.421 | n/a | n/a | 0.073 | 8.111 | 0.260 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001b9 | 29.509 | 4.517 | 0.343 | 0.000 | 0.047 | 2.919 | 11.176 | 0.024 | n/a | 0.084 | 10.374 | n/a | n/a | 0.026 | 4.907 | 0.166 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001b3 | 29.063 | 3.981 | 0.319 | 0.000 | 0.061 | 1.585 | 12.159 | 0.023 | n/a | 0.086 | 10.814 | n/a | n/a | 0.035 | 4.360 | 0.150 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000182 | 27.729 | 3.816 | n/a | 0.000 | 0.113 | 0.873 | 1.901 | 0.029 | n/a | 0.151 | 20.787 | n/a | n/a | 0.059 | 3.929 | 0.142 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001c3 | 25.914 | 3.598 | 0.218 | 0.000 | 0.033 | 0.856 | 8.374 | 0.021 | n/a | 0.069 | 12.724 | n/a | n/a | 0.020 | 3.850 | 0.149 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000184 | 25.889 | 4.925 | 0.414 | 0.000 | 0.053 | 1.675 | 8.984 | 0.023 | n/a | 0.317 | 9.464 | n/a | n/a | 0.034 | 5.392 | 0.208 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.642 | 0.227 | 0.000 | 0.559 | 2.819 | n/a | 0.000 | 0.125 | 0.615 | 1.331 | 0.017 | n/a | 0.151 | 9.073 | n/a | n/a | 0.027 | 3.203 | 0.203 | 0.027 |
| p99 | 27.729 | 2.001 | 0.000 | 1.143 | 4.494 | n/a | 0.000 | 1.912 | 2.264 | 4.934 | 0.055 | n/a | 2.372 | 20.787 | n/a | n/a | 0.097 | 4.731 | 0.305 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd0000000000000182 | 27.729 | 3.816 | n/a | 0.000 | 0.113 | 0.873 | 1.901 | 0.029 | n/a | 0.151 | 20.787 | n/a | n/a | 0.059 | 3.929 | 0.142 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000199 | 23.336 | 2.819 | n/a | 0.000 | 1.912 | 0.518 | 1.224 | 0.013 | n/a | 0.092 | 16.738 | n/a | n/a | 0.020 | 4.731 | 0.203 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001c9 | 20.793 | 4.063 | n/a | 0.000 | 0.150 | 2.264 | 1.393 | 0.019 | n/a | 2.372 | 10.455 | n/a | n/a | 0.077 | 4.213 | 0.203 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000197 | 18.546 | 4.494 | n/a | 0.000 | 0.204 | 1.551 | 2.749 | 0.055 | n/a | 0.350 | 9.073 | n/a | n/a | 0.070 | 4.698 | 0.253 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001c1 | 17.118 | 3.048 | n/a | 0.000 | 0.156 | 0.875 | 1.409 | 0.020 | n/a | 0.131 | 11.383 | n/a | n/a | 0.097 | 3.203 | 0.187 | 0.097 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001b5 | 16.642 | 2.277 | n/a | 0.000 | 0.040 | 0.575 | 4.934 | 0.025 | n/a | 0.069 | 8.697 | n/a | n/a | 0.023 | 2.318 | 0.139 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000191 | 14.542 | 2.942 | n/a | 0.000 | 0.077 | 0.588 | 1.331 | 0.017 | n/a | 0.320 | 9.241 | n/a | n/a | 0.025 | 3.019 | 0.208 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| aa8db026b97c97bd0000000000000186 | 14.387 | 2.692 | n/a | 0.000 | 1.694 | 0.563 | 1.047 | 0.017 | n/a | 0.089 | 8.264 | n/a | n/a | 0.020 | 4.386 | 0.305 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001aa | 11.506 | 2.071 | n/a | 0.000 | 0.048 | 0.615 | 1.149 | 0.016 | n/a | 0.441 | 7.139 | n/a | n/a | 0.027 | 2.119 | 0.184 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001cc | 11.137 | 2.662 | n/a | 0.000 | 0.125 | 0.783 | 0.932 | 0.014 | n/a | 1.946 | 4.624 | n/a | n/a | 0.052 | 2.787 | 0.250 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.181 | 0.441 | 0.000 | 0.551 | 3.678 | n/a | 0.000 | 0.061 | 1.123 | 4.792 | 0.018 | n/a | 0.305 | 10.880 | n/a | n/a | 0.034 | 3.868 | 0.181 | 0.034 |
| p99 | 93.383 | 3.562 | 0.000 | 3.464 | 11.788 | n/a | 1.933 | 1.569 | 28.923 | 54.205 | 0.049 | n/a | 3.934 | 59.571 | n/a | n/a | 0.082 | 13.784 | 0.386 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd00000000000001fc | 93.383 | 4.125 | 0.294 | 0.000 | 0.059 | 15.003 | 54.205 | 0.031 | n/a | 0.084 | 19.542 | n/a | n/a | 0.040 | 4.478 | 0.048 | 0.040 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.126ms |
| aa8db026b97c97bd00000000000001e9 | 66.034 | 2.609 | n/a | 0.000 | 0.035 | 0.677 | 2.782 | 0.012 | n/a | 0.329 | 59.571 | n/a | n/a | 0.020 | 2.643 | 0.040 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| aa8db026b97c97bd00000000000001d8 | 58.300 | 4.087 | n/a | 0.000 | 0.031 | 28.923 | 1.556 | 0.004 | n/a | 0.017 | 23.661 | n/a | n/a | 0.021 | 4.118 | 0.071 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.063ms; driver.reader-basis.broadcast 0.058ms; driver.publication.persist-deferred 0.018ms |
| aa8db026b97c97bd00000000000001d7 | 53.264 | 2.183 | n/a | 0.000 | 0.063 | 0.703 | 33.973 | 0.014 | n/a | 0.064 | 16.238 | n/a | n/a | 0.026 | 2.246 | 0.042 | 0.026 | gw-w/thread-43/commit.prepare-and-validate | driver.reader-basis.broadcast 0.058ms |
| aa8db026b97c97bd00000000000001f4 | 51.866 | 11.788 | n/a | 1.933 | 0.063 | 3.383 | 19.595 | 0.049 | n/a | 3.444 | 11.582 | n/a | n/a | 0.029 | 13.784 | 0.266 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| aa8db026b97c97bd00000000000001de | 41.960 | 3.900 | 0.214 | 0.000 | 0.041 | 1.061 | 4.792 | 0.016 | n/a | 0.289 | 31.621 | n/a | n/a | 0.026 | 4.155 | 0.099 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| aa8db026b97c97bd00000000000001e2 | 36.930 | 6.200 | 0.309 | 0.000 | 0.064 | 1.979 | 10.849 | 0.023 | n/a | 0.312 | 17.159 | n/a | n/a | 0.034 | 6.574 | 0.178 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| aa8db026b97c97bd00000000000001db | 36.350 | 3.718 | 0.204 | 0.000 | 0.176 | 4.494 | 14.956 | 0.040 | n/a | 0.334 | 12.346 | n/a | n/a | 0.082 | 4.098 | 0.113 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| aa8db026b97c97bd000000000000020a | 34.188 | 3.514 | 0.196 | 0.000 | 0.074 | 1.082 | 11.992 | 0.017 | n/a | 0.048 | 17.229 | n/a | n/a | 0.035 | 3.785 | 0.111 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| aa8db026b97c97bd0000000000000214 | 32.363 | 5.000 | 0.206 | 0.000 | 0.060 | 2.090 | 9.574 | 0.038 | n/a | 0.476 | 14.882 | n/a | n/a | 0.036 | 5.267 | 0.163 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| aa8db026b97c97bd000000000000021e | 28.231 | 7.724 | 0.313 | 0.000 | 0.060 | 2.513 | 5.492 | 0.035 | n/a | 0.074 | 11.984 | n/a | n/a | 0.037 | 8.096 | 0.287 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| aa8db026b97c97bd0000000000000222 | 28.062 | 4.297 | 0.227 | 0.000 | 0.148 | 1.430 | 8.950 | 0.026 | n/a | 0.385 | 12.529 | n/a | n/a | 0.072 | 4.672 | 0.166 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| aa8db026b97c97bd00000000000001f0 | 27.778 | 4.438 | 0.224 | 0.000 | 0.064 | 2.025 | 12.426 | 0.027 | n/a | 0.106 | 8.416 | n/a | n/a | 0.052 | 4.726 | 0.170 | 0.052 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.015ms |
| aa8db026b97c97bd0000000000000206 | 27.706 | 3.494 | 0.221 | 0.000 | 0.092 | 3.490 | 10.134 | 0.024 | n/a | 0.063 | 10.147 | n/a | n/a | 0.042 | 3.806 | 0.137 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| aa8db026b97c97bd00000000000001d5 | 26.743 | 5.068 | 0.244 | 0.000 | 0.053 | 1.669 | 6.229 | 0.028 | n/a | 0.302 | 13.109 | n/a | n/a | 0.040 | 5.365 | 0.201 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| aa8db026b97c97bd00000000000001e3 | 26.437 | 3.344 | n/a | 0.000 | 0.042 | 0.820 | 0.994 | 0.009 | n/a | 0.276 | 20.929 | n/a | n/a | 0.023 | 3.386 | 0.128 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001f8 | 26.059 | 3.701 | 0.295 | 0.000 | 0.108 | 1.043 | 12.865 | 0.015 | n/a | 0.305 | 7.679 | n/a | n/a | 0.048 | 4.104 | 0.158 | 0.048 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.022ms |
| aa8db026b97c97bd00000000000001f2 | 25.767 | 3.786 | 0.171 | 0.000 | 0.051 | 1.508 | 8.489 | 0.025 | n/a | 0.093 | 11.614 | n/a | n/a | 0.029 | 4.008 | 0.156 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| aa8db026b97c97bd000000000000021a | 24.774 | 4.619 | 0.407 | 0.000 | 0.157 | 1.553 | 9.821 | 0.025 | n/a | 0.123 | 8.007 | n/a | n/a | 0.062 | 5.184 | 0.209 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| aa8db026b97c97bd00000000000001e6 | 22.885 | 2.615 | n/a | 0.000 | 0.068 | 0.886 | 1.390 | 0.020 | n/a | 3.934 | 13.936 | n/a | n/a | 0.035 | 2.683 | 0.117 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.594 | 0.774 | 0.000 | 0.548 | 2.183 | n/a | 0.000 | 0.063 | 0.832 | 1.229 | 0.014 | n/a | 0.329 | 8.844 | n/a | n/a | 0.027 | 2.618 | 0.181 | 0.027 |
| p99 | 66.034 | 1.010 | 0.000 | 0.855 | 3.845 | n/a | 0.000 | 1.569 | 3.832 | 33.973 | 0.031 | n/a | 3.934 | 59.571 | n/a | n/a | 0.056 | 4.010 | 0.348 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd00000000000001e9 | 66.034 | 2.609 | n/a | 0.000 | 0.035 | 0.677 | 2.782 | 0.012 | n/a | 0.329 | 59.571 | n/a | n/a | 0.020 | 2.643 | 0.040 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| aa8db026b97c97bd00000000000001d7 | 53.264 | 2.183 | n/a | 0.000 | 0.063 | 0.703 | 33.973 | 0.014 | n/a | 0.064 | 16.238 | n/a | n/a | 0.026 | 2.246 | 0.042 | 0.026 | gw-w/thread-43/commit.prepare-and-validate | driver.reader-basis.broadcast 0.058ms |
| aa8db026b97c97bd00000000000001e6 | 22.885 | 2.615 | n/a | 0.000 | 0.068 | 0.886 | 1.390 | 0.020 | n/a | 3.934 | 13.936 | n/a | n/a | 0.035 | 2.683 | 0.117 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001e0 | 22.181 | 2.153 | n/a | 0.000 | 0.063 | 3.824 | 1.717 | 0.015 | n/a | 0.060 | 14.324 | n/a | n/a | 0.026 | 2.216 | 0.100 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| aa8db026b97c97bd0000000000000207 | 19.133 | 2.557 | n/a | 0.000 | 0.061 | 0.570 | 0.939 | 0.011 | n/a | 0.316 | 14.654 | n/a | n/a | 0.024 | 2.618 | 0.137 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001d0 | 18.242 | 2.023 | n/a | 0.000 | 0.133 | 3.832 | 1.194 | 0.016 | n/a | 0.108 | 10.880 | n/a | n/a | 0.056 | 2.156 | 0.118 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001f9 | 15.993 | 2.082 | n/a | 0.000 | 0.053 | 1.177 | 0.873 | 0.016 | n/a | 0.333 | 11.421 | n/a | n/a | 0.037 | 2.135 | 0.133 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001d3 | 15.594 | 3.845 | n/a | 0.000 | 0.165 | 1.174 | 1.087 | 0.013 | n/a | 0.417 | 8.844 | n/a | n/a | 0.049 | 4.010 | 0.257 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001ee | 15.412 | 3.725 | n/a | 0.000 | 0.144 | 1.082 | 1.229 | 0.015 | n/a | 0.368 | 8.799 | n/a | n/a | 0.050 | 3.868 | 0.251 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000202 | 14.330 | 1.785 | n/a | 0.000 | 1.569 | 0.810 | 1.498 | 0.031 | n/a | 0.136 | 8.479 | n/a | n/a | 0.021 | 3.354 | 0.234 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| aa8db026b97c97bd0000000000000215 | 13.214 | 3.614 | n/a | 0.000 | 0.049 | 0.832 | 0.810 | 0.014 | n/a | 0.336 | 7.532 | n/a | n/a | 0.027 | 3.663 | 0.277 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000020b | 9.892 | 1.755 | n/a | 0.000 | 0.037 | 0.647 | 0.791 | 0.012 | n/a | 0.270 | 6.359 | n/a | n/a | 0.020 | 1.792 | 0.181 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000001ec | 8.328 | 2.806 | n/a | 0.000 | 0.095 | 0.861 | 0.781 | 0.014 | n/a | 0.330 | 3.396 | n/a | n/a | 0.045 | 2.901 | 0.348 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000020f | 8.164 | 1.930 | n/a | 0.000 | 0.079 | 0.649 | 1.372 | 0.014 | n/a | 0.304 | 3.788 | n/a | n/a | 0.027 | 2.009 | 0.246 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000021f | 8.151 | 2.169 | n/a | 0.000 | 0.049 | 0.593 | 1.266 | 0.018 | n/a | 0.567 | 3.467 | n/a | n/a | 0.021 | 2.219 | 0.272 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.109 | 0.697 | 0.000 | 0.774 | 4.110 | n/a | 0.000 | 0.063 | 0.951 | 2.478 | 0.021 | n/a | 0.164 | 8.974 | n/a | n/a | 0.034 | 4.441 | 0.224 | 0.034 |
| p99 | 81.164 | 2.005 | 0.043 | 1.975 | 7.456 | n/a | 0.000 | 1.537 | 5.871 | 34.474 | 0.068 | n/a | 3.723 | 69.073 | n/a | n/a | 0.119 | 8.133 | 0.449 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd000000000000023a | 81.164 | 4.110 | 0.180 | 0.000 | 0.040 | 1.000 | 6.394 | 0.022 | n/a | 0.323 | 69.073 | n/a | n/a | 0.022 | 4.330 | 0.053 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.114ms |
| aa8db026b97c97bd000000000000022f | 58.782 | 7.456 | 0.551 | 0.000 | 0.126 | 3.265 | 19.017 | 0.068 | n/a | 3.113 | 25.094 | n/a | n/a | 0.092 | 8.133 | 0.138 | 0.092 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| aa8db026b97c97bd0000000000000266 | 56.750 | 4.246 | 0.301 | 0.000 | 0.067 | 0.951 | 20.228 | 0.018 | n/a | 0.053 | 30.857 | n/a | n/a | 0.029 | 4.614 | 0.081 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| aa8db026b97c97bd0000000000000244 | 53.241 | 4.743 | 0.334 | 0.000 | 0.107 | 1.875 | 34.474 | 0.029 | n/a | 0.105 | 11.522 | n/a | n/a | 0.052 | 5.184 | 0.097 | 0.052 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.073ms |
| aa8db026b97c97bd0000000000000252 | 42.750 | 4.490 | 0.273 | 0.000 | 0.059 | 1.465 | 16.590 | 0.056 | n/a | 0.293 | 19.458 | n/a | n/a | 0.066 | 4.822 | 0.113 | 0.066 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| aa8db026b97c97bd0000000000000246 | 41.112 | 4.896 | 0.217 | 0.000 | 0.053 | 0.941 | 15.667 | 0.028 | n/a | 0.109 | 19.166 | n/a | n/a | 0.034 | 5.166 | 0.126 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms |
| aa8db026b97c97bd0000000000000281 | 38.300 | 3.185 | 0.174 | 0.000 | 0.077 | 1.141 | 17.811 | 0.018 | n/a | 0.059 | 15.787 | n/a | n/a | 0.048 | 3.436 | 0.090 | 0.048 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.037ms |
| aa8db026b97c97bd0000000000000236 | 36.161 | 6.161 | 0.354 | 0.000 | 0.244 | 5.354 | 13.235 | 0.020 | n/a | 0.083 | 10.591 | n/a | n/a | 0.119 | 6.759 | 0.187 | 0.119 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.051ms |
| aa8db026b97c97bd0000000000000287 | 32.817 | 4.703 | 0.341 | 0.000 | 0.128 | 0.973 | 13.458 | 0.019 | n/a | 0.056 | 13.082 | n/a | n/a | 0.059 | 5.172 | 0.158 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000025c | 31.522 | 5.632 | 0.220 | 0.000 | 0.049 | 1.528 | 7.185 | 0.020 | n/a | 0.067 | 16.797 | n/a | n/a | 0.025 | 5.900 | 0.187 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| aa8db026b97c97bd0000000000000233 | 28.867 | 6.380 | n/a | 0.000 | 0.069 | 0.588 | 10.542 | 0.025 | n/a | 0.077 | 11.156 | n/a | n/a | 0.029 | 6.449 | 0.223 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000225 | 28.229 | 3.542 | 0.184 | 0.000 | 0.048 | 1.078 | 9.321 | 0.024 | n/a | 0.364 | 13.639 | n/a | n/a | 0.029 | 3.774 | 0.134 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| aa8db026b97c97bd0000000000000248 | 26.438 | 3.789 | 0.224 | 0.000 | 0.056 | 1.503 | 9.012 | 0.025 | n/a | 0.499 | 11.295 | n/a | n/a | 0.035 | 4.069 | 0.154 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000022b | 26.211 | 5.250 | n/a | 0.000 | 0.123 | 4.258 | 1.251 | 0.013 | n/a | 0.058 | 15.214 | n/a | n/a | 0.045 | 5.372 | 0.205 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000024a | 25.440 | 5.887 | 0.251 | 0.000 | 0.049 | 1.546 | 8.470 | 0.039 | n/a | 0.178 | 8.974 | n/a | n/a | 0.045 | 6.188 | 0.243 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000026a | 25.005 | 4.107 | 0.302 | 0.000 | 0.063 | 1.479 | 5.295 | 0.030 | n/a | 0.320 | 13.377 | n/a | n/a | 0.032 | 4.472 | 0.179 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000026d | 22.570 | 5.339 | 0.212 | 0.000 | 0.147 | 1.299 | 2.726 | 0.023 | n/a | 0.297 | 12.465 | n/a | n/a | 0.062 | 5.699 | 0.253 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000022d | 20.868 | 5.965 | n/a | 0.000 | 0.073 | 1.272 | 1.311 | 0.025 | n/a | 0.418 | 11.777 | n/a | n/a | 0.026 | 6.038 | 0.289 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000027b | 20.804 | 3.455 | 0.239 | 0.000 | 0.044 | 0.938 | 4.588 | 0.017 | n/a | 0.063 | 11.419 | n/a | n/a | 0.042 | 3.737 | 0.180 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000026b | 19.905 | 4.997 | n/a | 0.000 | 0.059 | 5.871 | 5.206 | 0.034 | n/a | 0.127 | 3.584 | n/a | n/a | 0.027 | 5.056 | 0.254 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.761 | 0.697 | 0.000 | 0.657 | 2.839 | n/a | 0.000 | 0.070 | 0.821 | 1.361 | 0.022 | n/a | 0.368 | 5.346 | n/a | n/a | 0.026 | 3.069 | 0.240 | 0.026 |
| p99 | 20.868 | 2.005 | 0.000 | 1.384 | 5.965 | n/a | 0.000 | 1.537 | 5.871 | 5.206 | 0.044 | n/a | 3.723 | 14.076 | n/a | n/a | 0.082 | 6.038 | 0.356 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd000000000000022d | 20.868 | 5.965 | n/a | 0.000 | 0.073 | 1.272 | 1.311 | 0.025 | n/a | 0.418 | 11.777 | n/a | n/a | 0.026 | 6.038 | 0.289 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000026b | 19.905 | 4.997 | n/a | 0.000 | 0.059 | 5.871 | 5.206 | 0.034 | n/a | 0.127 | 3.584 | n/a | n/a | 0.027 | 5.056 | 0.254 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| aa8db026b97c97bd0000000000000256 | 18.601 | 4.471 | n/a | 0.000 | 0.114 | 0.899 | 1.383 | 0.023 | n/a | 0.094 | 11.535 | n/a | n/a | 0.082 | 4.585 | 0.246 | 0.082 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000231 | 18.109 | 4.254 | n/a | 0.000 | 0.096 | 0.562 | 0.919 | 0.012 | n/a | 3.723 | 8.505 | n/a | n/a | 0.038 | 4.351 | 0.240 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| aa8db026b97c97bd000000000000024d | 17.870 | 2.300 | n/a | 0.000 | 0.030 | 0.380 | 0.686 | 0.010 | n/a | 0.368 | 14.076 | n/a | n/a | 0.021 | 2.330 | 0.130 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.083ms; driver.publication.persist-deferred 0.022ms |
| aa8db026b97c97bd0000000000000228 | 16.525 | 2.839 | n/a | 0.000 | 0.047 | 0.912 | 4.675 | 0.035 | n/a | 2.944 | 5.051 | n/a | n/a | 0.023 | 2.886 | 0.175 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000224 | 14.264 | 5.009 | n/a | 0.000 | 0.070 | 4.195 | 2.478 | 0.044 | n/a | 0.492 | 1.931 | n/a | n/a | 0.046 | 5.079 | 0.356 | 0.046 | node-14/thread-0/socket.wait-first-byte | none observed |
| aa8db026b97c97bd0000000000000238 | 14.198 | 3.038 | n/a | 0.000 | 0.085 | 1.852 | 1.956 | 0.037 | n/a | 0.892 | 6.302 | n/a | n/a | 0.035 | 3.123 | 0.220 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000278 | 13.761 | 2.699 | n/a | 0.000 | 0.059 | 0.677 | 0.836 | 0.013 | n/a | 0.288 | 9.164 | n/a | n/a | 0.026 | 2.757 | 0.200 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000271 | 13.690 | 2.820 | n/a | 0.000 | 0.047 | 0.713 | 1.453 | 0.019 | n/a | 0.083 | 8.530 | n/a | n/a | 0.024 | 2.867 | 0.209 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000267 | 12.923 | 1.688 | n/a | 0.000 | 0.025 | 0.421 | 0.743 | 0.011 | n/a | 0.077 | 9.941 | n/a | n/a | 0.017 | 1.713 | 0.133 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000285 | 12.291 | 2.220 | n/a | 0.000 | 1.537 | 0.873 | 1.646 | 0.025 | n/a | 0.623 | 5.346 | n/a | n/a | 0.022 | 3.757 | 0.306 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000242 | 11.804 | 3.959 | n/a | 0.000 | 0.083 | 1.111 | 1.251 | 0.021 | n/a | 0.099 | 5.231 | n/a | n/a | 0.048 | 4.042 | 0.342 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000260 | 10.400 | 2.676 | n/a | 0.000 | 0.073 | 0.738 | 1.300 | 0.021 | n/a | 0.380 | 5.176 | n/a | n/a | 0.035 | 2.750 | 0.264 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000027f | 9.324 | 2.967 | n/a | 0.000 | 0.102 | 0.821 | 1.053 | 0.020 | n/a | 0.283 | 4.033 | n/a | n/a | 0.045 | 3.069 | 0.329 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000283 | 9.181 | 1.765 | n/a | 0.000 | 0.047 | 0.727 | 1.535 | 0.033 | n/a | 0.796 | 4.253 | n/a | n/a | 0.026 | 1.812 | 0.197 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000262 | 8.637 | 1.889 | n/a | 0.000 | 0.042 | 0.596 | 1.361 | 0.022 | n/a | 0.086 | 4.622 | n/a | n/a | 0.020 | 1.931 | 0.224 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.384 | 0.327 | 0.000 | 0.662 | 3.752 | n/a | 0.000 | 0.064 | 0.968 | 1.932 | 0.023 | n/a | 0.244 | 8.995 | n/a | n/a | 0.031 | 4.265 | 0.199 | 0.031 |
| p99 | 64.271 | 1.999 | 0.102 | 1.896 | 9.369 | n/a | 0.000 | 3.998 | 4.454 | 23.753 | 0.059 | n/a | 3.025 | 47.958 | n/a | n/a | 0.103 | 9.540 | 0.497 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd000000000000029c | 64.271 | 4.476 | 0.176 | 0.000 | 0.059 | 1.288 | 10.193 | 0.028 | n/a | 0.064 | 47.958 | n/a | n/a | 0.028 | 4.711 | 0.073 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| aa8db026b97c97bd00000000000002b0 | 40.463 | 5.126 | 0.398 | 0.000 | 0.054 | 1.734 | 23.753 | 0.020 | n/a | 0.326 | 9.020 | n/a | n/a | 0.031 | 5.579 | 0.138 | 0.031 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.054ms |
| aa8db026b97c97bd00000000000002b6 | 36.771 | 4.120 | 0.221 | 0.000 | 0.056 | 0.981 | 12.663 | 0.027 | n/a | 0.116 | 18.560 | n/a | n/a | 0.028 | 4.397 | 0.120 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002a8 | 35.673 | 5.123 | 0.297 | 0.000 | 0.076 | 1.693 | 14.907 | 0.030 | n/a | 2.102 | 11.407 | n/a | n/a | 0.038 | 5.496 | 0.154 | 0.038 | gw-w/thread-46/gateway.admitted-work | none observed |
| aa8db026b97c97bd0000000000000296 | 33.458 | 4.029 | 1.699 | 0.000 | 0.070 | 1.138 | 10.868 | 0.021 | n/a | 0.060 | 15.540 | n/a | n/a | 0.033 | 5.799 | 0.173 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000028b | 33.244 | 5.797 | 0.193 | 0.000 | 0.060 | 4.454 | 13.224 | 0.036 | n/a | 0.447 | 8.995 | n/a | n/a | 0.039 | 6.050 | 0.182 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| aa8db026b97c97bd000000000000029e | 31.753 | 4.060 | 0.260 | 0.000 | 0.069 | 1.196 | 9.595 | 0.025 | n/a | 0.079 | 16.428 | n/a | n/a | 0.041 | 4.389 | 0.138 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002c2 | 30.672 | 3.131 | 0.174 | 0.000 | 0.046 | 1.141 | 11.528 | 0.028 | n/a | 0.056 | 14.546 | n/a | n/a | 0.021 | 3.351 | 0.109 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002ac | 29.650 | 3.663 | 0.268 | 0.000 | 0.213 | 1.139 | 5.656 | 0.028 | n/a | 0.354 | 18.246 | n/a | n/a | 0.084 | 4.143 | 0.140 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002d3 | 28.345 | 9.369 | n/a | 0.000 | 0.171 | 1.547 | 3.614 | 0.055 | n/a | 1.165 | 12.344 | n/a | n/a | 0.080 | 9.540 | 0.337 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002d9 | 27.254 | 4.438 | 0.182 | 0.000 | 0.071 | 1.580 | 11.232 | 0.020 | n/a | 0.091 | 9.604 | n/a | n/a | 0.035 | 4.691 | 0.172 | 0.035 | gw-w/thread-44/gateway.admitted-work | none observed |
| aa8db026b97c97bd00000000000002b8 | 25.665 | 4.252 | 0.342 | 0.000 | 0.074 | 2.520 | 7.426 | 0.034 | n/a | 0.481 | 10.505 | n/a | n/a | 0.031 | 4.668 | 0.182 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002c5 | 24.236 | 3.114 | 0.182 | 0.000 | 0.021 | 1.514 | 10.905 | 0.020 | n/a | 0.084 | 8.384 | n/a | n/a | 0.012 | 3.317 | 0.137 | 0.012 | gw-w/thread-44/gateway.admitted-work | driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.020ms |
| aa8db026b97c97bd00000000000002d5 | 24.199 | 2.900 | 0.151 | 0.000 | 0.042 | 0.968 | 7.717 | 0.030 | n/a | 0.088 | 12.283 | n/a | n/a | 0.020 | 3.094 | 0.128 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000291 | 24.078 | 4.641 | n/a | 0.000 | 0.051 | 0.714 | 0.980 | 0.013 | n/a | 0.051 | 17.604 | n/a | n/a | 0.023 | 4.692 | 0.195 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002bc | 23.978 | 5.665 | 0.195 | 0.000 | 0.074 | 1.862 | 9.407 | 0.059 | n/a | 0.244 | 6.417 | n/a | n/a | 0.055 | 5.934 | 0.247 | 0.055 | gw-w/thread-48/gateway.admitted-work | none observed |
| aa8db026b97c97bd00000000000002db | 23.735 | 3.158 | 0.222 | 0.000 | 0.129 | 1.183 | 9.374 | 0.037 | n/a | 0.542 | 9.036 | n/a | n/a | 0.055 | 3.509 | 0.148 | 0.055 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002b4 | 22.910 | 2.750 | n/a | 0.000 | 0.057 | 0.537 | 1.231 | 0.017 | n/a | 3.025 | 15.262 | n/a | n/a | 0.030 | 2.807 | 0.123 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002d1 | 20.090 | 3.420 | 0.233 | 0.000 | 0.208 | 4.412 | 1.973 | 0.030 | n/a | 0.091 | 9.643 | n/a | n/a | 0.080 | 3.860 | 0.192 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002ad | 19.168 | 3.752 | n/a | 0.000 | 0.062 | 0.545 | 1.092 | 0.012 | n/a | 0.828 | 12.846 | n/a | n/a | 0.030 | 3.814 | 0.199 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.529 | 0.000 | 0.000 | 0.662 | 2.832 | n/a | 0.000 | 0.064 | 0.706 | 1.161 | 0.016 | n/a | 0.293 | 5.156 | n/a | n/a | 0.031 | 2.938 | 0.262 | 0.031 |
| p99 | 16.195 | 1.000 | 0.000 | 1.281 | 4.532 | n/a | 0.000 | 3.998 | 3.074 | 5.385 | 0.032 | n/a | 2.982 | 10.443 | n/a | n/a | 0.103 | 7.526 | 0.497 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd00000000000002c0 | 16.195 | 3.229 | n/a | 0.000 | 0.064 | 0.908 | 1.340 | 0.025 | n/a | 0.155 | 10.443 | n/a | n/a | 0.032 | 3.293 | 0.203 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002a6 | 15.134 | 3.528 | n/a | 0.000 | 3.998 | 0.706 | 0.770 | 0.014 | n/a | 0.085 | 5.983 | n/a | n/a | 0.050 | 7.526 | 0.497 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002a1 | 14.685 | 4.532 | n/a | 0.000 | 0.104 | 1.083 | 1.288 | 0.026 | n/a | 0.526 | 7.022 | n/a | n/a | 0.103 | 4.636 | 0.316 | 0.103 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002c4 | 14.272 | 2.388 | n/a | 0.000 | 0.066 | 0.746 | 1.417 | 0.022 | n/a | 0.521 | 9.075 | n/a | n/a | 0.036 | 2.454 | 0.172 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002b1 | 13.016 | 3.134 | n/a | 0.000 | 0.069 | 1.111 | 1.532 | 0.021 | n/a | 2.982 | 4.136 | n/a | n/a | 0.031 | 3.203 | 0.246 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002ba | 11.754 | 4.229 | n/a | 0.000 | 0.067 | 0.854 | 1.713 | 0.032 | n/a | 0.568 | 4.263 | n/a | n/a | 0.028 | 4.296 | 0.365 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002cb | 11.104 | 2.370 | n/a | 0.000 | 0.051 | 0.583 | 0.966 | 0.017 | n/a | 0.087 | 7.004 | n/a | n/a | 0.027 | 2.421 | 0.218 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000000289 | 10.529 | 2.832 | n/a | 0.000 | 0.107 | 0.512 | 0.764 | 0.013 | n/a | 0.293 | 5.963 | n/a | n/a | 0.046 | 2.938 | 0.279 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002d0 | 10.459 | 1.861 | n/a | 0.000 | 0.057 | 3.074 | 5.385 | 0.013 | n/a | 0.044 | 0.000 | n/a | n/a | 0.024 | 1.918 | 0.183 | 0.024 | gw-w/thread-48/gateway.route | none observed |
| aa8db026b97c97bd0000000000000297 | 10.140 | 4.157 | n/a | 0.000 | 0.122 | 0.708 | 0.753 | 0.013 | n/a | 0.049 | 4.270 | n/a | n/a | 0.068 | 4.278 | 0.422 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| aa8db026b97c97bd00000000000002be | 9.831 | 2.530 | n/a | 0.000 | 0.043 | 0.496 | 1.161 | 0.016 | n/a | 0.406 | 5.156 | n/a | n/a | 0.023 | 2.573 | 0.262 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002c9 | 9.734 | 2.336 | n/a | 0.000 | 0.042 | 0.637 | 1.211 | 0.023 | n/a | 0.134 | 5.330 | n/a | n/a | 0.023 | 2.377 | 0.244 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002a9 | 9.140 | 2.968 | n/a | 0.000 | 0.058 | 0.609 | 0.800 | 0.012 | n/a | 0.328 | 4.335 | n/a | n/a | 0.031 | 3.026 | 0.331 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000029f | 7.413 | 2.332 | n/a | 0.000 | 0.055 | 0.503 | 0.846 | 0.012 | n/a | 0.317 | 3.320 | n/a | n/a | 0.027 | 2.387 | 0.322 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (857 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.792 | 0.530 | 0.000 | 0.547 | 2.252 | n/a | 0.000 | 0.056 | 0.602 | 0.953 | 0.010 | n/a | 0.076 | 5.958 | n/a | n/a | 0.019 | 2.554 | 0.239 | 0.019 |
| p99 | 63.789 | 2.952 | 0.090 | 2.468 | 8.140 | n/a | 0.000 | 19.844 | 8.147 | 10.260 | 0.047 | n/a | 4.059 | 48.380 | n/a | n/a | 0.063 | 21.690 | 0.706 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd0000000000000673 | 80.194 | 8.460 | n/a | 0.000 | 39.646 | 0.868 | 4.176 | 0.014 | n/a | 0.035 | 26.972 | n/a | n/a | 0.021 | 48.106 | 0.600 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.644ms; driver.publication.readback 0.131ms; driver.publication.readback 0.130ms; driver.publication.readback 0.105ms; driver.publication.readback 0.084ms |
| aa8db026b97c97bd00000000000007b5 | 74.994 | 4.315 | n/a | 0.000 | 50.794 | 0.844 | 2.009 | 0.018 | n/a | 1.149 | 15.822 | n/a | n/a | 0.042 | 55.109 | 0.735 | 0.042 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.984ms; driver.expected-state.bind-receipt 1.619ms; driver.reader-basis.broadcast 0.326ms; driver.publication.readback 0.244ms; driver.publication.readback 0.198ms |
| aa8db026b97c97bd00000000000002ec | 71.193 | 3.215 | 0.169 | 0.000 | 0.069 | 5.330 | 9.479 | 0.039 | n/a | 0.998 | 51.842 | n/a | n/a | 0.052 | 3.453 | 0.049 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.100ms |
| aa8db026b97c97bd00000000000007b1 | 69.141 | 11.154 | n/a | 0.000 | 0.088 | 1.106 | 5.790 | 0.027 | n/a | 0.985 | 49.954 | n/a | n/a | 0.037 | 11.242 | 0.163 | 0.037 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.192ms; driver.publication.readback 0.179ms; driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.042ms; driver.publication.persist-deferred 0.025ms |
| aa8db026b97c97bd00000000000007b2 | 66.107 | 2.611 | n/a | 0.000 | 1.876 | 5.261 | 0.959 | 0.026 | n/a | 3.166 | 52.188 | n/a | n/a | 0.021 | 4.487 | 0.068 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.984ms; driver.expected-state.bind-receipt 1.192ms; driver.publication.readback 0.179ms; driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.053ms |
| aa8db026b97c97bd0000000000000668 | 65.483 | 5.580 | n/a | 0.000 | 0.124 | 0.815 | 2.942 | 0.005 | n/a | 0.328 | 55.656 | n/a | n/a | 0.034 | 5.703 | 0.087 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.131ms; driver.publication.readback 0.130ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.065ms; driver.publication.readback 0.063ms |
| aa8db026b97c97bd0000000000000679 | 64.896 | 1.654 | n/a | 0.000 | 52.927 | 0.796 | 5.144 | 0.040 | n/a | 0.035 | 4.283 | n/a | n/a | 0.017 | 54.581 | 0.841 | 0.017 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.644ms; driver.expected-state.bind-receipt 1.577ms; driver.publication.readback 0.131ms; driver.publication.readback 0.130ms; driver.publication.readback 0.105ms |
| aa8db026b97c97bd000000000000046c | 64.133 | 1.906 | n/a | 0.000 | 11.825 | 0.471 | 0.776 | 0.008 | n/a | 0.046 | 49.086 | n/a | n/a | 0.014 | 13.732 | 0.214 | 0.014 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.680ms; driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.074ms; driver.publication.readback 0.065ms; driver.publication.readback 0.055ms |
| aa8db026b97c97bd000000000000066a | 63.789 | 2.262 | n/a | 0.000 | 0.019 | 7.740 | 1.289 | 0.021 | n/a | 0.051 | 52.395 | n/a | n/a | 0.012 | 2.281 | 0.036 | 0.012 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.644ms; driver.publication.readback 0.131ms; driver.publication.readback 0.130ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.065ms |
| aa8db026b97c97bd000000000000038e | 63.096 | 2.009 | n/a | 0.000 | 1.145 | 0.295 | 0.669 | 0.007 | n/a | 0.257 | 58.705 | n/a | n/a | 0.010 | 3.154 | 0.050 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.021ms |
| aa8db026b97c97bd0000000000000390 | 60.947 | 2.944 | 0.198 | 0.000 | 0.070 | 1.961 | 10.620 | 0.017 | n/a | 0.234 | 44.874 | n/a | n/a | 0.029 | 3.212 | 0.053 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.reader-basis.broadcast 0.056ms; driver.publication.readback 0.056ms; driver.publication.readback 0.043ms; driver.publication.readback 0.026ms |
| aa8db026b97c97bd0000000000000469 | 58.570 | 3.574 | n/a | 0.000 | 0.038 | 2.920 | 2.032 | 0.019 | n/a | 0.075 | 49.889 | n/a | n/a | 0.021 | 3.612 | 0.062 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000004ba | 57.640 | 2.031 | n/a | 0.000 | 4.884 | 4.490 | 0.703 | 0.007 | n/a | 0.038 | 45.474 | n/a | n/a | 0.012 | 6.915 | 0.120 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.153ms; driver.publication.readback 0.048ms; driver.publication.readback 0.034ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.015ms |
| aa8db026b97c97bd0000000000000682 | 56.953 | 2.411 | n/a | 0.000 | 46.829 | 0.576 | 1.066 | 0.010 | n/a | 0.082 | 5.958 | n/a | n/a | 0.020 | 49.240 | 0.865 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.577ms; driver.publication.readback 0.116ms; driver.publication.readback 0.105ms; driver.publication.readback 0.088ms; driver.publication.readback 0.081ms |
| aa8db026b97c97bd00000000000007b6 | 55.968 | 7.763 | n/a | 0.000 | 1.297 | 11.643 | 1.788 | 0.013 | n/a | 0.463 | 32.923 | n/a | n/a | 0.077 | 9.060 | 0.162 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.984ms; driver.publication.readback 0.244ms; driver.publication.persist-deferred 0.053ms |
| aa8db026b97c97bd0000000000000394 | 53.775 | 3.426 | n/a | 0.000 | 0.087 | 6.666 | 1.552 | 0.028 | n/a | 0.089 | 41.879 | n/a | n/a | 0.048 | 3.513 | 0.065 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.083ms; driver.reader-basis.broadcast 0.056ms; driver.publication.readback 0.056ms; driver.publication.readback 0.043ms; driver.publication.readback 0.026ms |
| aa8db026b97c97bd0000000000000432 | 52.833 | 1.434 | n/a | 0.000 | 0.688 | 3.528 | 0.646 | 0.018 | n/a | 0.031 | 46.481 | n/a | n/a | 0.009 | 2.121 | 0.040 | 0.009 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.015ms |
| aa8db026b97c97bd0000000000000430 | 52.019 | 2.127 | n/a | 0.000 | 0.033 | 0.644 | 0.749 | 0.025 | n/a | 0.042 | 48.380 | n/a | n/a | 0.019 | 2.159 | 0.042 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd00000000000002e5 | 50.308 | 3.140 | 0.200 | 0.000 | 0.129 | 0.943 | 8.458 | 0.039 | n/a | 4.019 | 33.329 | n/a | n/a | 0.050 | 3.469 | 0.069 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| aa8db026b97c97bd000000000000045b | 50.135 | 4.308 | n/a | 0.000 | 1.720 | 0.849 | 1.215 | 0.012 | n/a | 0.058 | 41.924 | n/a | n/a | 0.048 | 6.029 | 0.120 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.109ms; driver.reader-basis.broadcast 0.107ms; driver.publication.persist-deferred 0.046ms |

## P2 / L1024 / commit / 5-10 facts (499 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.176 | 0.000 | 0.000 | 0.434 | 1.822 | n/a | 0.000 | 0.058 | 0.598 | 0.802 | 0.010 | n/a | 0.071 | 5.115 | n/a | n/a | 0.018 | 2.111 | 0.221 | 0.018 |
| p99 | 57.640 | 2.001 | 0.095 | 1.117 | 5.714 | n/a | 0.000 | 24.202 | 7.209 | 5.245 | 0.047 | n/a | 4.059 | 45.474 | n/a | n/a | 0.072 | 25.538 | 0.735 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd00000000000007b5 | 74.994 | 4.315 | n/a | 0.000 | 50.794 | 0.844 | 2.009 | 0.018 | n/a | 1.149 | 15.822 | n/a | n/a | 0.042 | 55.109 | 0.735 | 0.042 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.984ms; driver.expected-state.bind-receipt 1.619ms; driver.reader-basis.broadcast 0.326ms; driver.publication.readback 0.244ms; driver.publication.readback 0.198ms |
| aa8db026b97c97bd00000000000007b2 | 66.107 | 2.611 | n/a | 0.000 | 1.876 | 5.261 | 0.959 | 0.026 | n/a | 3.166 | 52.188 | n/a | n/a | 0.021 | 4.487 | 0.068 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.984ms; driver.expected-state.bind-receipt 1.192ms; driver.publication.readback 0.179ms; driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.053ms |
| aa8db026b97c97bd0000000000000679 | 64.896 | 1.654 | n/a | 0.000 | 52.927 | 0.796 | 5.144 | 0.040 | n/a | 0.035 | 4.283 | n/a | n/a | 0.017 | 54.581 | 0.841 | 0.017 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.644ms; driver.expected-state.bind-receipt 1.577ms; driver.publication.readback 0.131ms; driver.publication.readback 0.130ms; driver.publication.readback 0.105ms |
| aa8db026b97c97bd000000000000046c | 64.133 | 1.906 | n/a | 0.000 | 11.825 | 0.471 | 0.776 | 0.008 | n/a | 0.046 | 49.086 | n/a | n/a | 0.014 | 13.732 | 0.214 | 0.014 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.680ms; driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.074ms; driver.publication.readback 0.065ms; driver.publication.readback 0.055ms |
| aa8db026b97c97bd00000000000004ba | 57.640 | 2.031 | n/a | 0.000 | 4.884 | 4.490 | 0.703 | 0.007 | n/a | 0.038 | 45.474 | n/a | n/a | 0.012 | 6.915 | 0.120 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.153ms; driver.publication.readback 0.048ms; driver.publication.readback 0.034ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.015ms |
| aa8db026b97c97bd0000000000000682 | 56.953 | 2.411 | n/a | 0.000 | 46.829 | 0.576 | 1.066 | 0.010 | n/a | 0.082 | 5.958 | n/a | n/a | 0.020 | 49.240 | 0.865 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.577ms; driver.publication.readback 0.116ms; driver.publication.readback 0.105ms; driver.publication.readback 0.088ms; driver.publication.readback 0.081ms |
| aa8db026b97c97bd0000000000000432 | 52.833 | 1.434 | n/a | 0.000 | 0.688 | 3.528 | 0.646 | 0.018 | n/a | 0.031 | 46.481 | n/a | n/a | 0.009 | 2.121 | 0.040 | 0.009 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.015ms |
| aa8db026b97c97bd0000000000000430 | 52.019 | 2.127 | n/a | 0.000 | 0.033 | 0.644 | 0.749 | 0.025 | n/a | 0.042 | 48.380 | n/a | n/a | 0.019 | 2.159 | 0.042 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000045b | 50.135 | 4.308 | n/a | 0.000 | 1.720 | 0.849 | 1.215 | 0.012 | n/a | 0.058 | 41.924 | n/a | n/a | 0.048 | 6.029 | 0.120 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.109ms; driver.reader-basis.broadcast 0.107ms; driver.publication.persist-deferred 0.046ms |
| aa8db026b97c97bd0000000000000666 | 49.262 | 2.079 | n/a | 0.000 | 0.665 | 0.539 | 5.034 | 0.021 | n/a | 0.089 | 40.814 | n/a | n/a | 0.020 | 2.744 | 0.056 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.063ms; driver.publication.readback 0.034ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.006ms |
| aa8db026b97c97bd00000000000007b7 | 49.030 | 4.104 | n/a | 0.000 | 0.103 | 14.578 | 1.017 | 0.013 | n/a | 0.553 | 28.617 | n/a | n/a | 0.044 | 4.207 | 0.086 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.984ms; driver.expected-state.bind-receipt 1.619ms; driver.publication.readback 0.244ms; driver.publication.persist-deferred 0.053ms |
| aa8db026b97c97bd0000000000000847 | 48.529 | 2.116 | n/a | 0.000 | 0.077 | 1.193 | 0.969 | 0.010 | n/a | 0.078 | 44.054 | n/a | n/a | 0.032 | 2.194 | 0.045 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.110ms; driver.publication.readback 0.082ms; driver.publication.persist-deferred 0.027ms; driver.publication.persist-deferred 0.021ms |
| aa8db026b97c97bd0000000000000377 | 47.858 | 2.272 | n/a | 0.000 | 0.051 | 0.993 | 26.300 | 0.007 | n/a | 0.019 | 18.193 | n/a | n/a | 0.024 | 2.323 | 0.049 | 0.024 | gw-w/thread-44/commit.prepare-and-validate | driver.reader-basis.broadcast 0.104ms; driver.publication.readback 0.050ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.016ms |
| aa8db026b97c97bd0000000000000373 | 47.058 | 1.241 | n/a | 0.000 | 34.209 | 1.567 | 0.610 | 0.011 | n/a | 0.043 | 9.363 | n/a | n/a | 0.015 | 35.450 | 0.753 | 0.015 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.104ms; driver.publication.readback 0.050ms; driver.publication.readback 0.044ms; driver.publication.readback 0.044ms; driver.publication.readback 0.042ms |
| aa8db026b97c97bd000000000000069f | 47.037 | 2.722 | n/a | 0.000 | 3.354 | 0.528 | 0.625 | 0.011 | n/a | 0.180 | 39.584 | n/a | n/a | 0.032 | 6.075 | 0.129 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.136ms; driver.reader-basis.broadcast 0.082ms; driver.publication.persist-deferred 0.016ms |
| aa8db026b97c97bd0000000000000677 | 46.735 | 4.718 | n/a | 0.000 | 0.137 | 1.136 | 0.889 | 0.010 | n/a | 0.085 | 39.687 | n/a | n/a | 0.073 | 4.855 | 0.104 | 0.073 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.644ms; driver.publication.readback 0.131ms; driver.publication.readback 0.130ms; driver.publication.readback 0.077ms; driver.publication.persist-deferred 0.055ms |
| aa8db026b97c97bd0000000000000678 | 45.739 | 3.184 | n/a | 0.000 | 3.050 | 0.569 | 1.336 | 0.021 | n/a | 0.434 | 37.112 | n/a | n/a | 0.034 | 6.233 | 0.136 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.644ms; driver.publication.readback 0.131ms; driver.publication.readback 0.130ms; driver.publication.readback 0.084ms; driver.publication.readback 0.077ms |
| aa8db026b97c97bd0000000000000392 | 45.513 | 1.497 | n/a | 0.000 | 0.034 | 1.408 | 0.463 | 0.009 | n/a | 1.302 | 40.782 | n/a | n/a | 0.018 | 1.531 | 0.034 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.reader-basis.broadcast 0.056ms; driver.publication.readback 0.056ms; driver.publication.readback 0.043ms; driver.publication.readback 0.026ms |
| aa8db026b97c97bd000000000000046a | 45.345 | 2.348 | n/a | 0.000 | 0.048 | 22.455 | 1.016 | 0.014 | n/a | 0.410 | 19.028 | n/a | n/a | 0.027 | 2.396 | 0.053 | 0.027 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.680ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.027ms; driver.publication.persist-deferred 0.006ms |
| aa8db026b97c97bd000000000000038d | 45.237 | 1.605 | n/a | 0.000 | 0.055 | 0.506 | 0.698 | 0.012 | n/a | 0.077 | 42.260 | n/a | n/a | 0.023 | 1.660 | 0.037 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.249 | 1.523 | 0.000 | 0.808 | 2.231 | n/a | 0.000 | 0.032 | 0.379 | 0.581 | 0.007 | n/a | 0.031 | 6.972 | n/a | n/a | 0.016 | 2.264 | 0.221 | 0.016 |
| p99 | 10.249 | 1.523 | 0.000 | 0.808 | 2.231 | n/a | 0.000 | 0.032 | 0.379 | 0.581 | 0.007 | n/a | 0.031 | 6.972 | n/a | n/a | 0.016 | 2.264 | 0.221 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd0000000000000992 | 10.249 | 2.231 | n/a | 0.000 | 0.032 | 0.379 | 0.581 | 0.007 | n/a | 0.031 | 6.972 | n/a | n/a | 0.016 | 2.264 | 0.221 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms |

## P2 / tail / commit (2610 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.116 | 0.414 | 0.000 | 0.520 | 2.168 | n/a | 0.000 | 0.038 | 0.504 | 0.855 | 0.008 | n/a | 0.058 | 4.418 | n/a | n/a | 0.014 | 2.423 | 0.267 | 0.014 |
| p99 | 40.483 | 2.500 | 0.059 | 2.201 | 6.861 | n/a | 0.000 | 10.436 | 6.443 | 7.375 | 0.040 | n/a | 2.343 | 28.471 | n/a | n/a | 0.053 | 13.495 | 0.684 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd000000000000116a | 77.580 | 2.622 | n/a | 0.000 | 59.065 | 0.614 | 0.602 | 0.006 | n/a | 0.180 | 14.472 | n/a | n/a | 0.019 | 61.687 | 0.795 | 0.019 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.530ms; driver.publication.readback 0.127ms; driver.publication.persist-deferred 0.064ms; driver.publication.readback 0.063ms; driver.publication.readback 0.040ms |
| aa8db026b97c97bd0000000000001603 | 69.581 | 2.927 | 2.168 | 0.000 | 0.027 | 1.994 | 54.558 | 0.024 | n/a | 0.107 | 7.764 | n/a | n/a | 0.011 | 5.122 | 0.074 | 0.011 | gw-w/thread-44/gateway.admitted-work | driver.publication.persist-deferred 0.339ms; driver.reader-basis.broadcast 0.222ms; driver.publication.persist-deferred 0.140ms; driver.publication.readback 0.064ms; driver.publication.readback 0.037ms |
| aa8db026b97c97bd0000000000000cfd | 68.071 | 4.130 | n/a | 0.000 | 0.031 | 0.668 | 1.862 | 0.017 | n/a | 2.024 | 59.327 | n/a | n/a | 0.011 | 4.161 | 0.061 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.017ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.044ms |
| aa8db026b97c97bd0000000000000d01 | 61.078 | 3.813 | n/a | 0.000 | 51.566 | 0.549 | 1.076 | 0.009 | n/a | 0.331 | 3.703 | n/a | n/a | 0.031 | 55.379 | 0.907 | 0.031 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 1.017ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.085ms; driver.publication.readback 0.081ms; driver.publication.readback 0.070ms |
| aa8db026b97c97bd0000000000000cfe | 60.026 | 3.295 | n/a | 0.000 | 0.010 | 1.462 | 1.253 | 0.012 | n/a | 0.029 | 53.957 | n/a | n/a | 0.008 | 3.305 | 0.055 | 0.008 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.017ms |
| aa8db026b97c97bd0000000000001169 | 59.845 | 2.426 | n/a | 0.000 | 1.588 | 7.285 | 0.586 | 0.009 | n/a | 0.029 | 47.878 | n/a | n/a | 0.044 | 4.014 | 0.067 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.127ms; driver.publication.persist-deferred 0.038ms |
| aa8db026b97c97bd00000000000011d9 | 53.354 | 1.412 | n/a | 0.000 | 41.015 | 5.348 | 0.377 | 0.005 | n/a | 0.023 | 5.161 | n/a | n/a | 0.013 | 42.426 | 0.795 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.160ms; driver.reader-basis.broadcast 0.449ms; driver.publication.readback 0.123ms; driver.publication.readback 0.116ms; driver.publication.readback 0.115ms |
| aa8db026b97c97bd0000000000000a40 | 52.244 | 3.043 | n/a | 0.000 | 16.362 | 1.115 | 0.952 | 0.007 | n/a | 0.192 | 30.553 | n/a | n/a | 0.019 | 19.405 | 0.371 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.272ms; driver.publication.readback 0.128ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.015ms |
| aa8db026b97c97bd0000000000001aea | 52.212 | 1.729 | n/a | 0.000 | 0.585 | 6.395 | 0.550 | 0.007 | n/a | 0.355 | 42.586 | n/a | n/a | 0.004 | 2.314 | 0.044 | 0.004 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.441ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.040ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.022ms |
| aa8db026b97c97bd0000000000000fdf | 52.189 | 1.846 | n/a | 0.000 | 0.034 | 0.519 | 0.918 | 0.007 | n/a | 0.045 | 48.803 | n/a | n/a | 0.017 | 1.880 | 0.036 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.270ms |
| aa8db026b97c97bd0000000000000d00 | 52.115 | 2.688 | n/a | 0.000 | 39.872 | 0.538 | 0.662 | 0.010 | n/a | 0.050 | 8.268 | n/a | n/a | 0.025 | 42.560 | 0.817 | 0.025 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 1.017ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.085ms; driver.publication.readback 0.070ms; driver.publication.readback 0.069ms |
| aa8db026b97c97bd0000000000001ae9 | 46.919 | 2.002 | n/a | 0.000 | 0.738 | 1.363 | 0.476 | 0.004 | n/a | 0.018 | 42.311 | n/a | n/a | 0.008 | 2.740 | 0.058 | 0.008 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.065ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.022ms |
| aa8db026b97c97bd0000000000001604 | 46.822 | 1.470 | n/a | 0.000 | 0.025 | 17.218 | 1.528 | 0.021 | n/a | 0.073 | 26.477 | n/a | n/a | 0.010 | 1.495 | 0.032 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.339ms; driver.reader-basis.broadcast 0.222ms; driver.publication.persist-deferred 0.140ms |
| aa8db026b97c97bd0000000000000cff | 46.460 | 6.861 | n/a | 0.000 | 0.124 | 1.149 | 1.004 | 0.011 | n/a | 0.229 | 37.025 | n/a | n/a | 0.057 | 6.985 | 0.150 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.017ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.069ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.044ms |
| aa8db026b97c97bd0000000000001678 | 46.281 | 2.198 | n/a | 0.000 | 25.407 | 0.264 | 0.880 | 0.009 | n/a | 0.377 | 17.137 | n/a | n/a | 0.008 | 27.605 | 0.596 | 0.008 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.254ms; driver.publication.readback 0.162ms; driver.publication.readback 0.114ms; driver.publication.readback 0.100ms; driver.publication.readback 0.062ms |
| aa8db026b97c97bd0000000000000e42 | 46.266 | 3.767 | n/a | 0.000 | 0.019 | 0.429 | 1.175 | 0.007 | n/a | 0.056 | 40.803 | n/a | n/a | 0.010 | 3.785 | 0.082 | 0.010 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000001c92 | 44.958 | 4.036 | n/a | 0.000 | 0.051 | 0.509 | 0.961 | 0.008 | n/a | 0.059 | 39.313 | n/a | n/a | 0.023 | 4.087 | 0.091 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000117b | 44.748 | 8.880 | n/a | 0.000 | 13.748 | 2.028 | 7.286 | 0.039 | n/a | 0.127 | 12.624 | n/a | n/a | 0.017 | 22.628 | 0.506 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.200ms; driver.publication.readback 0.133ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.044ms; driver.publication.persist-deferred 0.019ms |
| aa8db026b97c97bd0000000000001931 | 44.621 | 5.069 | n/a | 0.000 | 0.061 | 4.582 | 1.663 | 0.025 | n/a | 0.080 | 33.120 | n/a | n/a | 0.021 | 5.130 | 0.115 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.120ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.029ms |
| aa8db026b97c97bd0000000000000d02 | 44.542 | 3.233 | n/a | 0.000 | 0.032 | 0.591 | 0.558 | 0.005 | n/a | 0.045 | 40.050 | n/a | n/a | 0.027 | 3.265 | 0.073 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.017ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.070ms; driver.publication.readback 0.069ms; driver.publication.readback 0.069ms |

## P2 / tail / commit / 5-10 facts (1548 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.926 | 0.000 | 0.000 | 0.407 | 1.718 | n/a | 0.000 | 0.038 | 0.488 | 0.721 | 0.008 | n/a | 0.058 | 3.949 | n/a | n/a | 0.013 | 1.959 | 0.252 | 0.013 |
| p99 | 41.357 | 1.999 | 0.053 | 1.028 | 4.918 | n/a | 0.000 | 10.510 | 7.011 | 3.136 | 0.041 | n/a | 1.905 | 29.450 | n/a | n/a | 0.047 | 12.434 | 0.716 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa8db026b97c97bd000000000000116a | 77.580 | 2.622 | n/a | 0.000 | 59.065 | 0.614 | 0.602 | 0.006 | n/a | 0.180 | 14.472 | n/a | n/a | 0.019 | 61.687 | 0.795 | 0.019 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.530ms; driver.publication.readback 0.127ms; driver.publication.persist-deferred 0.064ms; driver.publication.readback 0.063ms; driver.publication.readback 0.040ms |
| aa8db026b97c97bd0000000000000d01 | 61.078 | 3.813 | n/a | 0.000 | 51.566 | 0.549 | 1.076 | 0.009 | n/a | 0.331 | 3.703 | n/a | n/a | 0.031 | 55.379 | 0.907 | 0.031 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 1.017ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.085ms; driver.publication.readback 0.081ms; driver.publication.readback 0.070ms |
| aa8db026b97c97bd0000000000001169 | 59.845 | 2.426 | n/a | 0.000 | 1.588 | 7.285 | 0.586 | 0.009 | n/a | 0.029 | 47.878 | n/a | n/a | 0.044 | 4.014 | 0.067 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.127ms; driver.publication.persist-deferred 0.038ms |
| aa8db026b97c97bd00000000000011d9 | 53.354 | 1.412 | n/a | 0.000 | 41.015 | 5.348 | 0.377 | 0.005 | n/a | 0.023 | 5.161 | n/a | n/a | 0.013 | 42.426 | 0.795 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.160ms; driver.reader-basis.broadcast 0.449ms; driver.publication.readback 0.123ms; driver.publication.readback 0.116ms; driver.publication.readback 0.115ms |
| aa8db026b97c97bd0000000000001aea | 52.212 | 1.729 | n/a | 0.000 | 0.585 | 6.395 | 0.550 | 0.007 | n/a | 0.355 | 42.586 | n/a | n/a | 0.004 | 2.314 | 0.044 | 0.004 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.441ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.040ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.022ms |
| aa8db026b97c97bd0000000000000fdf | 52.189 | 1.846 | n/a | 0.000 | 0.034 | 0.519 | 0.918 | 0.007 | n/a | 0.045 | 48.803 | n/a | n/a | 0.017 | 1.880 | 0.036 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.270ms |
| aa8db026b97c97bd0000000000000d00 | 52.115 | 2.688 | n/a | 0.000 | 39.872 | 0.538 | 0.662 | 0.010 | n/a | 0.050 | 8.268 | n/a | n/a | 0.025 | 42.560 | 0.817 | 0.025 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 1.017ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.085ms; driver.publication.readback 0.070ms; driver.publication.readback 0.069ms |
| aa8db026b97c97bd0000000000001ae9 | 46.919 | 2.002 | n/a | 0.000 | 0.738 | 1.363 | 0.476 | 0.004 | n/a | 0.018 | 42.311 | n/a | n/a | 0.008 | 2.740 | 0.058 | 0.008 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.065ms; driver.publication.readback 0.036ms; driver.publication.persist-deferred 0.022ms |
| aa8db026b97c97bd0000000000001604 | 46.822 | 1.470 | n/a | 0.000 | 0.025 | 17.218 | 1.528 | 0.021 | n/a | 0.073 | 26.477 | n/a | n/a | 0.010 | 1.495 | 0.032 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.339ms; driver.reader-basis.broadcast 0.222ms; driver.publication.persist-deferred 0.140ms |
| aa8db026b97c97bd0000000000000cff | 46.460 | 6.861 | n/a | 0.000 | 0.124 | 1.149 | 1.004 | 0.011 | n/a | 0.229 | 37.025 | n/a | n/a | 0.057 | 6.985 | 0.150 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.017ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.069ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.044ms |
| aa8db026b97c97bd0000000000001931 | 44.621 | 5.069 | n/a | 0.000 | 0.061 | 4.582 | 1.663 | 0.025 | n/a | 0.080 | 33.120 | n/a | n/a | 0.021 | 5.130 | 0.115 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.120ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.029ms |
| aa8db026b97c97bd0000000000000d02 | 44.542 | 3.233 | n/a | 0.000 | 0.032 | 0.591 | 0.558 | 0.005 | n/a | 0.045 | 40.050 | n/a | n/a | 0.027 | 3.265 | 0.073 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.017ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.070ms; driver.publication.readback 0.069ms; driver.publication.readback 0.069ms |
| aa8db026b97c97bd00000000000011d7 | 44.226 | 7.615 | n/a | 0.000 | 0.009 | 9.615 | 6.279 | 0.041 | n/a | 0.123 | 20.537 | n/a | n/a | 0.008 | 7.624 | 0.172 | 0.008 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.160ms; driver.reader-basis.broadcast 0.449ms; driver.publication.readback 0.123ms; driver.publication.readback 0.116ms; driver.publication.readback 0.115ms |
| aa8db026b97c97bd0000000000000fe0 | 44.043 | 1.185 | n/a | 0.000 | 0.012 | 0.821 | 0.584 | 0.004 | n/a | 0.031 | 41.399 | n/a | n/a | 0.007 | 1.197 | 0.027 | 0.007 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.270ms; driver.publication.persist-deferred 0.029ms |
| aa8db026b97c97bd0000000000000d28 | 43.646 | 2.656 | n/a | 0.000 | 32.662 | 0.722 | 1.284 | 0.020 | n/a | 0.374 | 5.909 | n/a | n/a | 0.018 | 35.318 | 0.809 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.048ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.013ms |
| aa8db026b97c97bd0000000000000a56 | 41.357 | 3.930 | n/a | 0.000 | 3.137 | 4.648 | 1.478 | 0.025 | n/a | 1.823 | 26.283 | n/a | n/a | 0.032 | 7.068 | 0.171 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.195ms; driver.publication.readback 0.129ms; driver.publication.readback 0.105ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.053ms |
| aa8db026b97c97bd0000000000001469 | 40.721 | 1.293 | n/a | 0.000 | 0.022 | 0.351 | 0.581 | 0.006 | n/a | 0.141 | 38.314 | n/a | n/a | 0.011 | 1.315 | 0.032 | 0.011 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd000000000000177c | 40.406 | 1.239 | n/a | 0.000 | 0.022 | 0.191 | 1.215 | 0.004 | n/a | 0.018 | 37.704 | n/a | n/a | 0.012 | 1.261 | 0.031 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.127ms; driver.publication.persist-deferred 0.014ms |
| aa8db026b97c97bd0000000000001a35 | 40.057 | 3.379 | n/a | 0.000 | 0.100 | 7.212 | 1.604 | 0.024 | n/a | 0.104 | 27.590 | n/a | n/a | 0.042 | 3.479 | 0.087 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aa8db026b97c97bd0000000000001930 | 39.662 | 2.112 | n/a | 0.000 | 0.021 | 0.379 | 0.498 | 0.005 | n/a | 0.136 | 36.495 | n/a | n/a | 0.015 | 2.133 | 0.054 | 0.015 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.120ms; driver.publication.persist-deferred 0.021ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.491 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 200.731 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 |
| p99 | 311.703 | n/a | n/a | n/a | 21.353 | n/a | 1.439 | 0.000 | 2.373 | 304.670 | 0.113 | n/a | 0.102 | 0.000 | n/a | n/a | 0.559 | 21.353 | 0.265 | 0.559 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a0000000000000002 | 311.703 | 3.998 | n/a | 0.000 | 0.000 | 2.263 | 304.670 | 0.113 | n/a | 0.102 | 0.000 | n/a | n/a | 0.559 | 3.998 | 0.013 | 0.559 | gw-r/thread-44/gateway.admitted-work | none observed |
| 79e896c5e0209fb70000000000000006 | 204.166 | 0.000 | n/a | 0.000 | 0.000 | 1.563 | 202.137 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.386 | 0.000 | 0.000 | 0.386 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000f02 | 202.854 | 0.000 | n/a | 0.000 | 0.000 | 0.378 | 202.323 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000007 | 202.281 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 201.065 | 0.004 | n/a | 0.063 | 0.000 | n/a | n/a | 0.369 | 0.000 | 0.000 | 0.369 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000005 | 202.160 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 201.083 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb70000000000000f01 | 201.491 | 0.000 | n/a | 0.000 | 0.000 | 0.612 | 200.731 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000f00 | 200.970 | 0.000 | n/a | 0.000 | 0.000 | 0.375 | 200.504 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.069 | 0.000 | 0.000 | 0.069 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000f05 | 119.292 | 18.308 | n/a | 1.439 | 0.000 | 2.373 | 96.983 | 0.004 | n/a | 0.004 | 0.000 | n/a | n/a | 0.182 | 19.747 | 0.166 | 0.182 | gw-r/thread-67/gateway.admitted-work | none observed |
| 79e896c5e0209fb70000000000000f06 | 80.554 | 21.353 | n/a | 0.000 | 0.000 | 2.281 | 56.708 | 0.009 | n/a | 0.008 | 0.000 | n/a | n/a | 0.197 | 21.353 | 0.265 | 0.197 | gw-r/thread-64/gateway.admitted-work | none observed |
| 79e896c5e0209fb70000000000000f07 | 76.603 | 20.035 | n/a | 0.000 | 0.000 | 1.634 | 54.736 | 0.005 | n/a | 0.006 | 0.000 | n/a | n/a | 0.188 | 20.035 | 0.262 | 0.188 | gw-r/thread-48/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 884.573 | n/a | n/a | n/a | 1.950 | n/a | 0.000 | 0.000 | 0.648 | 863.964 | 0.003 | n/a | 0.150 | 0.000 | n/a | n/a | 1.248 | 1.950 | 0.022 | 1.248 |
| p99 | 1008.427 | n/a | n/a | n/a | 11.937 | n/a | 7.586 | 0.000 | 1.181 | 1005.505 | 0.005 | n/a | 0.287 | 0.000 | n/a | n/a | 8.566 | 19.523 | 0.178 | 8.566 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a00000000000000a4 | 1008.427 | 0.201 | n/a | 0.000 | 0.000 | 1.181 | 1005.505 | 0.005 | n/a | 0.287 | 0.000 | n/a | n/a | 1.248 | 0.201 | 0.000 | 1.248 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a00000000000000a5 | 884.573 | 11.937 | n/a | 7.586 | 0.000 | 0.648 | 863.964 | 0.003 | n/a | 0.150 | 0.000 | n/a | n/a | 0.285 | 19.523 | 0.022 | 0.285 | gw-r/thread-47/journal/page | none observed |
| 83e4236e7f254e7a000000000000083e | 10.929 | 1.950 | n/a | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.566 | 1.950 | 0.178 | 8.566 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 472.650 | n/a | n/a | n/a | 2.716 | n/a | 0.000 | 0.000 | 0.733 | 461.759 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.117 | 2.716 | 0.007 | 0.117 |
| p99 | 1009.343 | n/a | n/a | n/a | 16.618 | n/a | 2.093 | 0.000 | 9.957 | 1004.132 | 5.624 | n/a | 1.213 | 0.000 | n/a | n/a | 3.864 | 16.618 | 0.529 | 3.864 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a00000000000000d0 | 1009.343 | 3.741 | n/a | 0.900 | 0.000 | 2.911 | 1001.654 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.086 | 4.641 | 0.005 | 0.086 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000000bb | 1006.663 | 0.208 | n/a | 0.000 | 0.000 | 1.067 | 1004.132 | 0.007 | n/a | 0.086 | 0.000 | n/a | n/a | 1.163 | 0.208 | 0.000 | 1.163 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a00000000000000b4 | 1006.145 | 0.187 | n/a | 0.000 | 0.000 | 1.303 | 1003.440 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 1.147 | 0.187 | 0.000 | 1.147 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000000ba | 988.155 | 2.964 | n/a | 0.000 | 0.000 | 6.746 | 978.281 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.117 | 2.964 | 0.003 | 0.117 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a00000000000000ae | 848.298 | 1.786 | n/a | 0.000 | 0.000 | 0.733 | 845.640 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.077 | 1.786 | 0.002 | 0.077 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000000b3 | 814.186 | 5.290 | n/a | 0.000 | 0.000 | 0.712 | 807.910 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.238 | 5.290 | 0.006 | 0.238 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000000ca | 742.262 | 5.082 | n/a | 0.000 | 0.000 | 0.533 | 736.487 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.091 | 5.082 | 0.007 | 0.091 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000000c0 | 728.874 | 3.580 | n/a | 0.000 | 0.000 | 0.771 | 724.326 | 0.015 | n/a | 0.058 | 0.000 | n/a | n/a | 0.123 | 3.580 | 0.005 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 83e4236e7f254e7a00000000000000c6 | 708.217 | 2.439 | n/a | 0.000 | 0.000 | 1.563 | 704.089 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.081 | 2.439 | 0.003 | 0.081 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000000ab | 697.939 | 2.686 | n/a | 0.000 | 0.000 | 0.412 | 694.697 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.104 | 2.686 | 0.004 | 0.104 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000000a8 | 669.760 | 3.502 | n/a | 0.000 | 0.000 | 0.705 | 665.268 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.237 | 3.502 | 0.005 | 0.237 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a00000000000000c2 | 654.223 | 6.117 | n/a | 0.000 | 0.000 | 0.490 | 647.443 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.127 | 6.117 | 0.009 | 0.127 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000000cb | 498.420 | 2.404 | n/a | 0.000 | 0.000 | 0.431 | 495.456 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.092 | 2.404 | 0.005 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a00000000000000a7 | 475.494 | 2.933 | n/a | 0.000 | 0.000 | 1.531 | 470.849 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.135 | 2.933 | 0.006 | 0.135 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000000b9 | 472.650 | 2.253 | n/a | 0.000 | 0.000 | 2.909 | 461.759 | 5.624 | n/a | 0.023 | 0.000 | n/a | n/a | 0.082 | 2.253 | 0.005 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a00000000000000b7 | 365.259 | 3.543 | n/a | 0.000 | 0.000 | 9.957 | 351.576 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.110 | 3.543 | 0.010 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000000c4 | 349.537 | 4.431 | n/a | 0.000 | 0.000 | 0.747 | 344.134 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.177 | 4.431 | 0.013 | 0.177 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000000ad | 327.915 | 16.618 | n/a | 0.000 | 0.000 | 0.769 | 310.292 | 0.005 | n/a | 0.070 | 0.000 | n/a | n/a | 0.162 | 16.618 | 0.051 | 0.162 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a00000000000000aa | 300.586 | 2.716 | n/a | 0.000 | 0.000 | 2.292 | 295.323 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.197 | 2.716 | 0.009 | 0.197 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a00000000000000cc | 279.816 | 2.363 | n/a | 0.000 | 0.000 | 0.460 | 276.866 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.091 | 2.363 | 0.008 | 0.091 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 338.868 | n/a | n/a | n/a | 3.986 | n/a | 0.552 | 0.000 | 0.548 | 331.014 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.116 | 4.597 | 0.014 | 0.116 |
| p99 | 1010.113 | n/a | n/a | n/a | 12.469 | n/a | 2.085 | 0.000 | 6.770 | 1004.442 | 0.066 | n/a | 0.326 | 0.000 | n/a | n/a | 32.459 | 13.858 | 0.585 | 32.459 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a00000000000000d1 | 1010.113 | 4.504 | n/a | 1.031 | 0.000 | 0.530 | 1003.888 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.109 | 5.535 | 0.005 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a000000000000010e | 1006.235 | 0.099 | n/a | 0.000 | 0.000 | 0.560 | 1004.442 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 1.104 | 0.099 | 0.000 | 1.104 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a00000000000000df | 1005.848 | 3.598 | n/a | 0.503 | 0.000 | 0.461 | 1001.139 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.089 | 4.101 | 0.004 | 0.089 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000000d2 | 1003.618 | 0.202 | n/a | 0.000 | 0.000 | 1.657 | 1000.586 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.130 | 0.202 | 0.000 | 1.130 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a0000000000000105 | 1002.592 | 0.169 | n/a | 0.000 | 0.000 | 0.499 | 1000.684 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 1.183 | 0.169 | 0.000 | 1.183 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000000da | 995.646 | 4.274 | n/a | 0.575 | 0.000 | 0.399 | 990.219 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.120 | 4.849 | 0.005 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a0000000000000101 | 973.658 | 3.401 | n/a | 0.000 | 0.000 | 0.769 | 968.721 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.710 | 3.401 | 0.003 | 0.710 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a00000000000000d9 | 972.215 | 3.606 | n/a | 0.954 | 0.000 | 6.770 | 960.699 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.136 | 4.560 | 0.005 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 83e4236e7f254e7a00000000000000e5 | 950.157 | 5.167 | n/a | 0.487 | 0.000 | 0.939 | 943.395 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.112 | 5.654 | 0.006 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a00000000000000de | 928.942 | 3.599 | n/a | 0.616 | 0.000 | 0.485 | 924.110 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.098 | 4.215 | 0.005 | 0.098 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a00000000000000fe | 841.896 | 5.021 | n/a | 0.546 | 0.000 | 0.349 | 835.843 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.108 | 5.568 | 0.007 | 0.108 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000000dc | 724.375 | 4.552 | n/a | 0.552 | 0.000 | 1.638 | 717.387 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.185 | 5.103 | 0.007 | 0.185 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000000e0 | 657.508 | 3.986 | n/a | 0.808 | 0.000 | 0.340 | 652.248 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.104 | 4.793 | 0.007 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000102 | 635.955 | 4.424 | n/a | 0.000 | 0.000 | 1.440 | 629.964 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.069 | 4.424 | 0.007 | 0.069 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a00000000000000e8 | 585.286 | 10.442 | n/a | 1.468 | 0.000 | 3.603 | 569.606 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.111 | 11.910 | 0.020 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000000fc | 567.886 | 3.162 | n/a | 0.862 | 0.000 | 0.713 | 563.003 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.093 | 4.024 | 0.007 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a00000000000000eb | 521.559 | 3.418 | n/a | 0.000 | 0.000 | 1.090 | 516.900 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.113 | 3.418 | 0.007 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000109 | 465.982 | 9.332 | n/a | 1.465 | 0.000 | 0.691 | 454.324 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.141 | 10.797 | 0.023 | 0.141 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a00000000000000d5 | 439.758 | 4.946 | n/a | 1.086 | 0.000 | 0.936 | 432.637 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.116 | 6.032 | 0.014 | 0.116 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a00000000000000fb | 425.207 | 4.482 | n/a | 0.649 | 0.000 | 0.415 | 419.559 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.072 | 5.131 | 0.012 | 0.072 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 450.079 | n/a | n/a | n/a | 3.524 | n/a | 0.000 | 0.000 | 0.573 | 438.746 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.138 | 3.807 | 0.012 | 0.138 |
| p99 | 1007.358 | n/a | n/a | n/a | 16.572 | n/a | 4.502 | 0.000 | 12.316 | 1002.503 | 0.015 | n/a | 0.062 | 0.000 | n/a | n/a | 44.957 | 17.516 | 0.713 | 44.957 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a0000000000000128 | 1007.358 | 6.365 | n/a | 0.000 | 0.000 | 0.824 | 999.919 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.227 | 6.365 | 0.006 | 0.227 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a000000000000013a | 1005.913 | 2.511 | n/a | 0.000 | 0.000 | 0.767 | 1002.503 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.095 | 2.511 | 0.002 | 0.095 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a0000000000000143 | 1003.890 | 3.120 | n/a | 0.000 | 0.000 | 0.844 | 999.802 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.075 | 3.120 | 0.003 | 0.075 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a0000000000000116 | 1002.355 | 0.128 | n/a | 0.000 | 0.000 | 0.568 | 1000.508 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.108 | 0.128 | 0.000 | 1.108 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a000000000000012c | 1002.159 | 0.105 | n/a | 0.000 | 0.000 | 1.382 | 1000.574 | 0.011 | n/a | 0.034 | 0.000 | n/a | n/a | 0.052 | 0.105 | 0.000 | 0.052 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a000000000000012e | 998.754 | 3.407 | n/a | 0.000 | 0.000 | 0.425 | 994.630 | 0.007 | n/a | 0.023 | 0.000 | n/a | n/a | 0.260 | 3.407 | 0.003 | 0.260 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a000000000000014b | 877.552 | 3.479 | n/a | 0.000 | 0.000 | 0.561 | 873.290 | 0.009 | n/a | 0.029 | 0.000 | n/a | n/a | 0.185 | 3.479 | 0.004 | 0.185 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a0000000000000135 | 858.510 | 4.611 | n/a | 0.000 | 0.000 | 0.653 | 853.016 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.188 | 4.611 | 0.005 | 0.188 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a000000000000011f | 839.419 | 6.384 | n/a | 0.000 | 0.000 | 0.491 | 832.325 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.190 | 6.384 | 0.008 | 0.190 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000000126 | 828.436 | 4.529 | n/a | 0.000 | 0.000 | 0.736 | 823.021 | 0.009 | n/a | 0.029 | 0.000 | n/a | n/a | 0.112 | 4.529 | 0.005 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a0000000000000131 | 791.655 | 2.562 | n/a | 0.000 | 0.000 | 0.468 | 788.448 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.115 | 2.562 | 0.003 | 0.115 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000000140 | 770.818 | 3.896 | n/a | 0.000 | 0.000 | 0.685 | 766.012 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.162 | 3.896 | 0.005 | 0.162 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a000000000000011d | 695.121 | 4.400 | n/a | 0.662 | 0.000 | 1.306 | 688.635 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.085 | 5.062 | 0.007 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a0000000000000113 | 692.428 | 2.745 | n/a | 0.000 | 0.000 | 0.573 | 689.000 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.076 | 2.745 | 0.004 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000129 | 609.685 | 16.572 | n/a | 0.945 | 0.000 | 0.603 | 591.353 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.167 | 17.516 | 0.029 | 0.167 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a0000000000000120 | 598.410 | 4.610 | n/a | 4.502 | 0.000 | 0.576 | 588.518 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.143 | 9.112 | 0.015 | 0.143 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a000000000000013c | 584.689 | 4.159 | n/a | 0.000 | 0.000 | 1.001 | 579.393 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.087 | 4.159 | 0.007 | 0.087 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a0000000000000137 | 543.252 | 6.959 | n/a | 0.740 | 0.000 | 0.660 | 534.630 | 0.012 | n/a | 0.047 | 0.000 | n/a | n/a | 0.205 | 7.699 | 0.014 | 0.205 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a0000000000000110 | 534.133 | 6.544 | n/a | 0.000 | 0.000 | 1.731 | 525.671 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.138 | 6.544 | 0.012 | 0.138 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000000144 | 487.986 | 9.188 | n/a | 2.510 | 0.000 | 0.560 | 475.333 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.342 | 11.698 | 0.024 | 0.342 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 395.209 | n/a | n/a | n/a | 2.668 | n/a | 0.000 | 0.000 | 0.565 | 386.405 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.093 | 2.668 | 0.007 | 0.093 |
| p99 | 1005.287 | n/a | n/a | n/a | 7.002 | n/a | 1.082 | 0.000 | 4.974 | 1003.302 | 7.011 | n/a | 0.084 | 0.000 | n/a | n/a | 46.639 | 8.084 | 0.609 | 46.639 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a0000000000000176 | 1005.287 | 0.180 | n/a | 0.000 | 0.000 | 0.637 | 1003.302 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 1.134 | 0.180 | 0.000 | 1.134 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000000156 | 1003.544 | 0.110 | n/a | 0.000 | 0.000 | 0.481 | 1001.787 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 1.122 | 0.110 | 0.000 | 1.122 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000181 | 1002.970 | 0.274 | n/a | 0.000 | 0.000 | 0.789 | 1000.666 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 1.188 | 0.274 | 0.000 | 1.188 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000189 | 1002.488 | 0.117 | n/a | 0.000 | 0.000 | 0.384 | 1000.831 | 0.012 | n/a | 0.051 | 0.000 | n/a | n/a | 1.093 | 0.117 | 0.000 | 1.093 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000167 | 1000.546 | 3.974 | n/a | 0.000 | 0.000 | 0.702 | 995.769 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.075 | 3.974 | 0.004 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a0000000000000188 | 986.812 | 2.649 | n/a | 0.000 | 0.000 | 0.530 | 983.517 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.078 | 2.649 | 0.003 | 0.078 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a000000000000017c | 934.368 | 2.396 | n/a | 0.000 | 0.000 | 0.417 | 931.451 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.082 | 2.396 | 0.003 | 0.082 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a0000000000000170 | 926.997 | 2.434 | n/a | 0.000 | 0.000 | 0.504 | 923.955 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.068 | 2.434 | 0.003 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a000000000000016f | 851.489 | 6.259 | n/a | 0.000 | 0.000 | 0.729 | 844.289 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.168 | 6.259 | 0.007 | 0.168 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a000000000000015d | 847.365 | 2.340 | n/a | 0.000 | 0.000 | 0.944 | 843.134 | 0.825 | n/a | 0.041 | 0.000 | n/a | n/a | 0.082 | 2.340 | 0.003 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000000186 | 778.674 | 3.966 | n/a | 0.000 | 0.000 | 0.493 | 774.110 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.069 | 3.966 | 0.005 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000000179 | 748.244 | 3.968 | n/a | 0.000 | 0.000 | 0.573 | 743.603 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.074 | 3.968 | 0.005 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a000000000000018c | 742.295 | 3.244 | n/a | 0.000 | 0.000 | 0.565 | 738.319 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.126 | 3.244 | 0.004 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a0000000000000180 | 724.402 | 4.256 | n/a | 0.000 | 0.000 | 0.767 | 719.172 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.176 | 4.256 | 0.006 | 0.176 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000000172 | 627.917 | 2.355 | n/a | 0.000 | 0.000 | 0.938 | 624.526 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.056 | 2.355 | 0.004 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a0000000000000158 | 588.650 | 2.002 | n/a | 0.000 | 0.000 | 2.889 | 576.576 | 7.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.088 | 2.002 | 0.003 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a0000000000000169 | 521.599 | 3.812 | n/a | 0.000 | 0.000 | 0.582 | 517.087 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.074 | 3.812 | 0.007 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000000155 | 515.858 | 2.963 | n/a | 0.000 | 0.000 | 0.412 | 512.358 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.091 | 2.963 | 0.006 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000000151 | 477.273 | 2.252 | n/a | 0.000 | 0.000 | 1.342 | 473.542 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.092 | 2.252 | 0.005 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a000000000000014f | 452.079 | 3.268 | n/a | 0.000 | 0.000 | 0.604 | 448.080 | 0.010 | n/a | 0.024 | 0.000 | n/a | n/a | 0.093 | 3.268 | 0.007 | 0.093 | gw-r/thread-64/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 378.906 | n/a | n/a | n/a | 3.249 | n/a | 0.000 | 0.000 | 0.505 | 370.394 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.090 | 3.249 | 0.013 | 0.090 |
| p99 | 1004.862 | n/a | n/a | n/a | 15.561 | n/a | 1.532 | 0.000 | 7.178 | 1000.766 | 2.021 | n/a | 0.069 | 0.000 | n/a | n/a | 27.137 | 16.771 | 0.328 | 27.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a00000000000001aa | 1004.862 | 3.134 | n/a | 0.000 | 0.000 | 0.808 | 1000.766 | 0.025 | n/a | 0.069 | 0.000 | n/a | n/a | 0.061 | 3.134 | 0.003 | 0.061 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a000000000000018e | 997.941 | 4.027 | n/a | 0.000 | 0.000 | 0.402 | 993.391 | 0.006 | n/a | 0.016 | 0.000 | n/a | n/a | 0.099 | 4.027 | 0.004 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a00000000000001c7 | 997.141 | 3.095 | n/a | 0.000 | 0.000 | 0.456 | 993.481 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.070 | 3.095 | 0.003 | 0.070 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a00000000000001c6 | 997.025 | 2.793 | n/a | 0.000 | 0.000 | 0.526 | 993.596 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.076 | 2.793 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000001a8 | 987.791 | 2.652 | n/a | 0.000 | 0.000 | 0.504 | 984.536 | 0.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.071 | 2.652 | 0.003 | 0.071 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000001a9 | 983.184 | 2.772 | n/a | 0.000 | 0.000 | 0.369 | 979.918 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.087 | 2.772 | 0.003 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000001c4 | 939.651 | 3.131 | n/a | 0.000 | 0.000 | 0.742 | 935.675 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.072 | 3.131 | 0.003 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a000000000000019d | 878.919 | 6.167 | n/a | 0.000 | 0.000 | 1.276 | 871.309 | 0.006 | n/a | 0.020 | 0.000 | n/a | n/a | 0.141 | 6.167 | 0.007 | 0.141 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000001b8 | 819.571 | 3.186 | n/a | 0.000 | 0.000 | 0.388 | 815.870 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.091 | 3.186 | 0.004 | 0.091 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000001d1 | 703.889 | 2.663 | n/a | 0.000 | 0.000 | 0.505 | 700.615 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.066 | 2.663 | 0.004 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000001a0 | 672.327 | 7.030 | n/a | 0.846 | 0.000 | 0.405 | 663.910 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 0.103 | 7.876 | 0.012 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a000000000000019c | 615.229 | 4.245 | n/a | 0.000 | 0.000 | 0.371 | 610.475 | 0.010 | n/a | 0.031 | 0.000 | n/a | n/a | 0.095 | 4.245 | 0.007 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a00000000000001bb | 596.118 | 2.760 | n/a | 0.000 | 0.000 | 0.443 | 592.802 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.076 | 2.760 | 0.005 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a00000000000001d7 | 586.719 | 1.707 | n/a | 0.000 | 0.000 | 0.512 | 584.377 | 0.014 | n/a | 0.028 | 0.000 | n/a | n/a | 0.080 | 1.707 | 0.003 | 0.080 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a00000000000001d3 | 545.643 | 2.671 | n/a | 0.000 | 0.000 | 0.584 | 542.259 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.085 | 2.671 | 0.005 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a00000000000001a3 | 491.719 | 3.839 | n/a | 0.000 | 0.000 | 0.545 | 487.230 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.072 | 3.839 | 0.008 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000001b0 | 468.759 | 2.476 | n/a | 0.000 | 0.000 | 0.382 | 465.780 | 0.014 | n/a | 0.042 | 0.000 | n/a | n/a | 0.065 | 2.476 | 0.005 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000001c8 | 467.646 | 2.500 | n/a | 0.000 | 0.000 | 0.376 | 464.656 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.090 | 2.500 | 0.005 | 0.090 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a00000000000001d5 | 455.031 | 2.261 | n/a | 0.000 | 0.000 | 0.460 | 452.217 | 0.011 | n/a | 0.019 | 0.000 | n/a | n/a | 0.062 | 2.261 | 0.005 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000001a5 | 445.482 | 4.584 | n/a | 0.000 | 0.000 | 1.088 | 439.595 | 0.020 | n/a | 0.059 | 0.000 | n/a | n/a | 0.135 | 4.584 | 0.010 | 0.135 | gw-r/thread-64/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 447.668 | n/a | n/a | n/a | 2.710 | n/a | 0.000 | 0.000 | 0.482 | 444.067 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.091 | 2.710 | 0.008 | 0.091 |
| p99 | 1002.471 | n/a | n/a | n/a | 10.151 | n/a | 0.764 | 0.000 | 3.402 | 1000.618 | 0.024 | n/a | 0.069 | 0.000 | n/a | n/a | 40.988 | 10.916 | 0.659 | 40.988 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a0000000000000219 | 1002.471 | 0.136 | n/a | 0.000 | 0.000 | 0.556 | 1000.618 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 1.109 | 0.136 | 0.000 | 1.109 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000213 | 1002.400 | 0.152 | n/a | 0.000 | 0.000 | 0.394 | 1000.613 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 1.202 | 0.152 | 0.000 | 1.202 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a00000000000001fa | 992.316 | 3.375 | n/a | 0.000 | 0.000 | 0.784 | 988.003 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.085 | 3.375 | 0.003 | 0.085 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000000218 | 988.683 | 2.549 | n/a | 0.000 | 0.000 | 0.426 | 985.596 | 0.010 | n/a | 0.035 | 0.000 | n/a | n/a | 0.068 | 2.549 | 0.003 | 0.068 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a000000000000021b | 983.497 | 2.332 | n/a | 0.000 | 0.000 | 0.320 | 980.728 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.091 | 2.332 | 0.002 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000000200 | 981.762 | 3.579 | n/a | 0.000 | 0.000 | 0.561 | 977.490 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.090 | 3.579 | 0.004 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000209 | 977.095 | 2.459 | n/a | 0.000 | 0.000 | 0.542 | 973.963 | 0.011 | n/a | 0.041 | 0.000 | n/a | n/a | 0.079 | 2.459 | 0.003 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000001ec | 963.251 | 2.571 | n/a | 0.000 | 0.000 | 0.572 | 959.982 | 0.013 | n/a | 0.044 | 0.000 | n/a | n/a | 0.070 | 2.571 | 0.003 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a0000000000000215 | 879.766 | 10.151 | n/a | 0.764 | 0.000 | 0.520 | 868.204 | 0.008 | n/a | 0.012 | 0.000 | n/a | n/a | 0.105 | 10.916 | 0.012 | 0.105 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000001f6 | 861.631 | 2.788 | n/a | 0.000 | 0.000 | 0.379 | 858.343 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.084 | 2.788 | 0.003 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000001eb | 860.925 | 4.450 | n/a | 0.000 | 0.000 | 0.350 | 855.839 | 0.008 | n/a | 0.026 | 0.000 | n/a | n/a | 0.253 | 4.450 | 0.005 | 0.253 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a0000000000000201 | 645.147 | 2.697 | n/a | 0.000 | 0.000 | 3.402 | 638.847 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.143 | 2.697 | 0.004 | 0.143 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a0000000000000212 | 643.999 | 2.304 | n/a | 0.000 | 0.000 | 0.486 | 641.083 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.091 | 2.304 | 0.004 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a00000000000001f1 | 623.499 | 2.988 | n/a | 0.000 | 0.000 | 0.639 | 619.752 | 0.018 | n/a | 0.037 | 0.000 | n/a | n/a | 0.065 | 2.988 | 0.005 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000204 | 584.011 | 3.630 | n/a | 0.000 | 0.000 | 0.562 | 579.591 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.152 | 3.630 | 0.006 | 0.152 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000001f2 | 567.463 | 3.000 | n/a | 0.000 | 0.000 | 0.515 | 563.825 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.088 | 3.000 | 0.005 | 0.088 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a00000000000001df | 565.082 | 3.416 | n/a | 0.000 | 0.000 | 0.426 | 561.085 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.130 | 3.416 | 0.006 | 0.130 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a00000000000001de | 537.619 | 2.323 | n/a | 0.000 | 0.000 | 0.544 | 534.652 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.059 | 2.323 | 0.004 | 0.059 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000001e5 | 503.772 | 2.420 | n/a | 0.000 | 0.000 | 0.752 | 500.497 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.074 | 2.420 | 0.005 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a00000000000001e3 | 466.431 | 6.096 | n/a | 0.000 | 0.000 | 0.672 | 459.481 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.143 | 6.096 | 0.013 | 0.143 | gw-r/thread-46/journal/page | none observed |

## P3 / L1024 / internal (755 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.647 | n/a | n/a | n/a | 3.309 | n/a | 0.000 | 0.000 | 0.237 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.044 | 3.309 | 0.260 | 7.044 |
| p99 | 252.355 | n/a | n/a | n/a | 16.387 | n/a | 1.039 | 0.000 | 1.530 | 249.199 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 47.850 | 17.024 | 0.836 | 47.850 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a0000000000000227 | 1002.124 | 0.103 | n/a | 0.000 | 0.000 | 0.349 | 1000.521 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 1.108 | 0.103 | 0.000 | 1.108 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a000000000000021c | 707.121 | 1.799 | n/a | 0.000 | 0.000 | 0.354 | 704.828 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.064 | 1.799 | 0.003 | 0.064 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000000229 | 637.167 | 2.040 | n/a | 0.000 | 0.000 | 0.456 | 634.542 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.076 | 2.040 | 0.003 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a000000000000021f | 565.552 | 2.448 | n/a | 0.000 | 0.000 | 2.183 | 560.810 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.078 | 2.448 | 0.004 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a0000000000000224 | 564.315 | 2.157 | n/a | 0.000 | 0.000 | 0.408 | 561.633 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 0.082 | 2.157 | 0.004 | 0.082 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000000225 | 420.546 | 2.412 | n/a | 0.000 | 0.000 | 0.633 | 417.351 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.114 | 2.412 | 0.006 | 0.114 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a000000000000021e | 275.765 | 2.336 | n/a | 0.000 | 0.000 | 0.498 | 272.774 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.120 | 2.336 | 0.008 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000000220 | 252.355 | 2.383 | n/a | 0.000 | 0.000 | 0.647 | 249.199 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.083 | 2.383 | 0.009 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000222 | 221.122 | 5.021 | n/a | 0.000 | 0.000 | 0.750 | 215.196 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.117 | 5.021 | 0.023 | 0.117 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a000000000000055d | 134.462 | 5.187 | n/a | 0.000 | 0.000 | 0.398 | 128.613 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.222 | 5.187 | 0.039 | 0.222 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a00000000000004eb | 118.845 | 5.970 | n/a | 0.903 | 0.000 | 2.448 | 109.334 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.140 | 6.873 | 0.058 | 0.140 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000000314 | 108.774 | 2.300 | n/a | 0.000 | 0.000 | 0.651 | 105.738 | 0.009 | n/a | 0.014 | 0.000 | n/a | n/a | 0.063 | 2.300 | 0.021 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a0000000000000660 | 93.316 | 5.857 | n/a | 0.000 | 0.000 | 0.509 | 86.759 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.153 | 5.857 | 0.063 | 0.153 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000000751 | 88.702 | 3.219 | n/a | 0.000 | 0.000 | 0.456 | 84.934 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.084 | 3.219 | 0.036 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000000470 | 87.946 | 3.321 | n/a | 0.000 | 0.000 | 0.431 | 84.105 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.080 | 3.321 | 0.038 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a0000000000000684 | 86.675 | 7.198 | n/a | 0.000 | 0.000 | 0.932 | 78.375 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.117 | 7.198 | 0.083 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a00000000000004f5 | 86.201 | 4.510 | n/a | 0.000 | 0.000 | 0.477 | 80.998 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.175 | 4.510 | 0.052 | 0.175 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a00000000000002f7 | 85.552 | 5.752 | n/a | 0.000 | 0.000 | 0.560 | 79.117 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.079 | 5.752 | 0.067 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a00000000000005e3 | 84.741 | 4.116 | n/a | 0.000 | 0.000 | 0.614 | 79.923 | 0.004 | n/a | 0.006 | 0.000 | n/a | n/a | 0.079 | 4.116 | 0.049 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000000795 | 84.481 | 2.266 | n/a | 0.000 | 0.000 | 0.441 | 81.622 | 0.016 | n/a | 0.060 | 0.000 | n/a | n/a | 0.075 | 2.266 | 0.027 | 0.075 | gw-r/thread-64/journal/page | none observed |

## P3 / tail / internal (2313 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.133 | n/a | n/a | n/a | 3.840 | n/a | 0.000 | 0.000 | 0.202 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.033 | 3.857 | 0.327 | 6.033 |
| p99 | 344.301 | n/a | n/a | n/a | 16.756 | n/a | 1.560 | 0.000 | 1.317 | 340.929 | 0.051 | n/a | 0.035 | 0.000 | n/a | n/a | 47.212 | 18.012 | 0.853 | 47.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 83e4236e7f254e7a0000000000001aee | 1002.836 | 0.327 | n/a | 0.000 | 0.000 | 0.722 | 1000.527 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 1.200 | 0.327 | 0.000 | 1.200 | gw-r/thread-66/journal/page | none observed |
| 83e4236e7f254e7a0000000000001ab4 | 1002.715 | 2.397 | n/a | 0.000 | 0.000 | 0.313 | 999.888 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.072 | 2.397 | 0.002 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000001aaa | 1002.400 | 0.117 | n/a | 0.000 | 0.000 | 0.278 | 1000.833 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 1.100 | 0.117 | 0.000 | 1.100 | gw-r/thread-42/journal/page | none observed |
| 83e4236e7f254e7a0000000000001af7 | 1002.017 | 0.102 | n/a | 0.000 | 0.000 | 0.386 | 1000.418 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 1.088 | 0.102 | 0.000 | 1.088 | gw-r/thread-44/journal/page | none observed |
| 83e4236e7f254e7a0000000000001acd | 996.312 | 3.256 | n/a | 0.000 | 0.000 | 0.557 | 992.343 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 0.114 | 3.256 | 0.003 | 0.114 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a0000000000001aa9 | 992.479 | 2.543 | n/a | 0.000 | 0.000 | 0.321 | 989.489 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.093 | 2.543 | 0.003 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000001af3 | 977.738 | 3.019 | n/a | 0.000 | 0.000 | 0.423 | 974.189 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.083 | 3.019 | 0.003 | 0.083 | gw-r/thread-64/journal/page | none observed |
| 83e4236e7f254e7a0000000000001ad0 | 915.759 | 4.397 | n/a | 0.000 | 0.000 | 0.540 | 910.670 | 0.010 | n/a | 0.033 | 0.000 | n/a | n/a | 0.109 | 4.397 | 0.005 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a0000000000001abe | 851.517 | 11.302 | n/a | 0.000 | 0.000 | 0.738 | 839.223 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.227 | 11.302 | 0.013 | 0.227 | gw-r/thread-66/journal/page | none observed |
| 83e4236e7f254e7a0000000000001aaf | 812.897 | 4.763 | n/a | 0.000 | 0.000 | 0.564 | 807.438 | 0.017 | n/a | 0.021 | 0.000 | n/a | n/a | 0.095 | 4.763 | 0.006 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000001aac | 720.590 | 8.182 | n/a | 0.975 | 0.000 | 0.492 | 710.641 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.272 | 9.157 | 0.013 | 0.272 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000001aca | 700.907 | 2.333 | n/a | 0.000 | 0.000 | 0.384 | 698.071 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.089 | 2.333 | 0.003 | 0.089 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a0000000000001ac4 | 689.556 | 6.994 | n/a | 0.000 | 0.000 | 0.693 | 681.663 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.184 | 6.994 | 0.010 | 0.184 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a0000000000001ae7 | 654.726 | 5.852 | n/a | 0.000 | 0.000 | 0.762 | 647.919 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.163 | 5.852 | 0.009 | 0.163 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000001af0 | 624.358 | 3.270 | n/a | 0.000 | 0.000 | 0.446 | 620.528 | 0.009 | n/a | 0.026 | 0.000 | n/a | n/a | 0.080 | 3.270 | 0.005 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 83e4236e7f254e7a0000000000001ade | 570.493 | 2.322 | n/a | 0.000 | 0.000 | 0.340 | 567.706 | 0.015 | n/a | 0.044 | 0.000 | n/a | n/a | 0.066 | 2.322 | 0.004 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 83e4236e7f254e7a0000000000001aeb | 480.409 | 3.483 | n/a | 0.000 | 0.000 | 0.313 | 476.509 | 0.011 | n/a | 0.023 | 0.000 | n/a | n/a | 0.070 | 3.483 | 0.007 | 0.070 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a0000000000001ab5 | 466.907 | 1.817 | n/a | 0.000 | 0.000 | 0.312 | 464.670 | 0.005 | n/a | 0.016 | 0.000 | n/a | n/a | 0.087 | 1.817 | 0.004 | 0.087 | gw-r/thread-43/journal/page | none observed |
| 83e4236e7f254e7a0000000000001ae9 | 455.684 | 2.070 | n/a | 0.000 | 0.000 | 0.553 | 452.901 | 0.021 | n/a | 0.044 | 0.000 | n/a | n/a | 0.095 | 2.070 | 0.005 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 83e4236e7f254e7a0000000000001ad1 | 444.347 | 13.368 | n/a | 0.000 | 0.000 | 2.040 | 428.410 | 0.012 | n/a | 0.041 | 0.000 | n/a | n/a | 0.478 | 13.368 | 0.030 | 0.478 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / read (72 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.153 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 200.880 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 212.932 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.020 | 206.862 | 3.461 | n/a | 3.843 | 0.000 | n/a | n/a | 0.365 | 0.000 | 0.000 | 0.365 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 79e896c5e0209fb70000000000000029 | 212.932 | 0.000 | n/a | 0.000 | 0.000 | 9.020 | 203.672 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb70000000000000009 | 208.417 | 0.000 | n/a | 0.000 | 0.000 | 1.171 | 206.862 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.322 | 0.000 | 0.000 | 0.322 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb70000000000000011 | 208.201 | 0.000 | n/a | 0.000 | 0.000 | 7.096 | 200.951 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb7000000000000002b | 207.211 | 0.000 | n/a | 0.000 | 0.000 | 2.881 | 204.141 | 0.013 | n/a | 0.065 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb7000000000000003c | 206.759 | 0.000 | n/a | 0.000 | 0.000 | 4.586 | 201.704 | 0.015 | n/a | 0.233 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000025 | 206.392 | 0.000 | n/a | 0.000 | 0.000 | 1.626 | 204.499 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000036 | 206.255 | 0.000 | n/a | 0.000 | 0.000 | 1.224 | 204.727 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-47/journal/page | none observed |
| 79e896c5e0209fb70000000000000047 | 205.534 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 204.463 | 0.075 | n/a | 0.053 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000017 | 205.504 | 0.000 | n/a | 0.000 | 0.000 | 0.355 | 204.963 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb7000000000000001a | 205.478 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 204.604 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000026 | 205.421 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 204.375 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000019 | 205.236 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 204.346 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb70000000000000039 | 205.203 | 0.000 | n/a | 0.000 | 0.000 | 4.199 | 200.832 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000040 | 205.093 | 0.000 | n/a | 0.000 | 0.000 | 3.848 | 201.043 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000010 | 205.086 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 202.718 | 0.004 | n/a | 1.373 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-47/journal/page | none observed |
| 79e896c5e0209fb70000000000000021 | 204.333 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 203.504 | 0.011 | n/a | 0.118 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb7000000000000000b | 203.999 | 0.000 | n/a | 0.000 | 0.000 | 2.919 | 200.814 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000034 | 203.884 | 0.000 | n/a | 0.000 | 0.000 | 1.328 | 198.577 | 0.011 | n/a | 3.843 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb70000000000000024 | 203.425 | 0.000 | n/a | 0.000 | 0.000 | 2.552 | 200.700 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb7000000000000004d | 203.334 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 202.312 | 0.024 | n/a | 0.036 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.657 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 200.756 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 207.360 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.024 | 204.905 | 6.571 | n/a | 2.189 | 0.000 | n/a | n/a | 0.289 | 0.000 | 0.000 | 0.289 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 79e896c5e0209fb70000000000000078 | 207.360 | 0.000 | n/a | 0.000 | 0.000 | 3.744 | 203.444 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000084 | 206.237 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 204.905 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb70000000000000099 | 205.409 | 0.000 | n/a | 0.000 | 0.000 | 1.471 | 201.588 | 0.005 | n/a | 2.189 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb700000000000000b6 | 205.153 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 204.258 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb7000000000000008d | 205.052 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 204.017 | 0.003 | n/a | 0.047 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000094 | 204.894 | 0.000 | n/a | 0.000 | 0.000 | 4.024 | 200.592 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb700000000000000bb | 204.864 | 0.000 | n/a | 0.000 | 0.000 | 0.272 | 204.418 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb700000000000000c1 | 204.698 | 0.000 | n/a | 0.000 | 0.000 | 0.429 | 204.120 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb700000000000000c2 | 204.370 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 203.647 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb700000000000000b7 | 204.273 | 0.000 | n/a | 0.000 | 0.000 | 3.000 | 201.065 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000082 | 204.220 | 0.000 | n/a | 0.000 | 0.000 | 0.415 | 203.525 | 0.012 | n/a | 0.163 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000092 | 203.880 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 202.985 | 0.008 | n/a | 0.096 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb7000000000000005d | 203.659 | 0.000 | n/a | 0.000 | 0.000 | 1.199 | 202.260 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000079 | 203.631 | 0.000 | n/a | 0.000 | 0.000 | 0.598 | 202.838 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb700000000000000a9 | 203.344 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 200.650 | 0.008 | n/a | 1.771 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb700000000000000a5 | 203.231 | 0.000 | n/a | 0.000 | 0.000 | 0.499 | 202.548 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000083 | 203.010 | 0.000 | n/a | 0.000 | 0.000 | 1.255 | 201.388 | 0.011 | n/a | 0.117 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-47/journal/page | none observed |
| 79e896c5e0209fb7000000000000006a | 202.927 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 201.758 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.289 | 0.000 | 0.000 | 0.289 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000063 | 202.735 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.445 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb700000000000000b9 | 202.641 | 0.000 | n/a | 0.000 | 0.000 | 0.671 | 201.804 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.389 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 200.640 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 213.467 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 13.037 | 204.688 | 6.821 | n/a | 3.141 | 0.000 | n/a | n/a | 0.483 | 0.000 | 0.000 | 0.483 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 79e896c5e0209fb700000000000000c8 | 213.467 | 0.000 | n/a | 0.000 | 0.000 | 13.037 | 200.301 | 0.004 | n/a | 0.010 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb700000000000000d9 | 206.178 | 0.000 | n/a | 0.000 | 0.000 | 1.236 | 204.688 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb700000000000000cd | 204.998 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 203.899 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb700000000000000df | 203.730 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 202.515 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb700000000000000c5 | 203.326 | 0.000 | n/a | 0.000 | 0.000 | 2.364 | 200.771 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000126 | 203.191 | 0.000 | n/a | 0.000 | 0.000 | 1.294 | 201.693 | 0.016 | n/a | 0.063 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb700000000000000e8 | 202.932 | 0.000 | n/a | 0.000 | 0.000 | 0.446 | 202.339 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000101 | 202.629 | 0.000 | n/a | 0.000 | 0.000 | 1.837 | 200.592 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb700000000000000f4 | 202.609 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 198.515 | 0.007 | n/a | 3.141 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb700000000000000d2 | 202.557 | 0.000 | n/a | 0.000 | 0.000 | 1.179 | 200.833 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.483 | 0.000 | 0.000 | 0.483 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb700000000000000e2 | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 201.493 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb700000000000000fd | 202.282 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 201.406 | 0.015 | n/a | 0.096 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb700000000000000ee | 202.220 | 0.000 | n/a | 0.000 | 0.000 | 1.190 | 200.615 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.372 | 0.000 | 0.000 | 0.372 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb700000000000000f1 | 202.023 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 200.802 | 0.017 | n/a | 0.042 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000127 | 202.000 | 0.000 | n/a | 0.000 | 0.000 | 0.885 | 200.913 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000113 | 201.971 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 201.175 | 0.021 | n/a | 0.090 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb700000000000000fc | 201.898 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 200.981 | 0.028 | n/a | 0.043 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb700000000000000ed | 201.878 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 200.823 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb700000000000000f9 | 201.854 | 0.000 | n/a | 0.000 | 0.000 | 0.986 | 200.684 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000108 | 201.843 | 0.000 | n/a | 0.000 | 0.000 | 0.578 | 201.100 | 0.014 | n/a | 0.051 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-64/journal/page | none observed |

## P3 / L16 / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.533 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 200.701 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 |
| p99 | 246.962 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.320 | 240.405 | 1.074 | n/a | 0.109 | 0.000 | n/a | n/a | 50.262 | 0.000 | 0.000 | 50.262 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 79e896c5e0209fb7000000000000013e | 246.962 | 0.000 | n/a | 0.000 | 0.000 | 6.320 | 240.405 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb7000000000000013b | 206.555 | 0.000 | n/a | 0.000 | 0.000 | 1.590 | 204.796 | 0.013 | n/a | 0.056 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000166 | 205.812 | 0.000 | n/a | 0.000 | 0.000 | 4.413 | 201.173 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb7000000000000012b | 204.385 | 0.000 | n/a | 0.000 | 0.000 | 0.456 | 203.807 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000180 | 204.144 | 0.000 | n/a | 0.000 | 0.000 | 2.204 | 201.504 | 0.009 | n/a | 0.104 | 0.000 | n/a | n/a | 0.323 | 0.000 | 0.000 | 0.323 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb7000000000000018b | 204.079 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 203.405 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000168 | 203.735 | 0.000 | n/a | 0.000 | 0.000 | 2.629 | 200.848 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb7000000000000013f | 203.481 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 202.589 | 0.020 | n/a | 0.088 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000157 | 203.225 | 0.000 | n/a | 0.000 | 0.000 | 2.030 | 200.947 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb7000000000000013a | 202.968 | 0.000 | n/a | 0.000 | 0.000 | 2.089 | 200.686 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb7000000000000018e | 202.892 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 201.527 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000164 | 202.483 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 201.423 | 0.019 | n/a | 0.109 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb7000000000000018d | 202.303 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 201.093 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000145 | 202.303 | 0.000 | n/a | 0.000 | 0.000 | 0.535 | 201.606 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb7000000000000013c | 202.260 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 201.171 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000171 | 202.249 | 0.000 | n/a | 0.000 | 0.000 | 1.487 | 200.597 | 0.014 | n/a | 0.048 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb7000000000000016c | 202.190 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 201.465 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb7000000000000018c | 202.144 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 201.411 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000194 | 202.141 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 201.411 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000169 | 202.113 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 201.195 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-64/journal/page | none observed |

## P3 / L64 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.253 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.570 | 200.564 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 205.082 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.899 | 204.419 | 4.289 | n/a | 0.118 | 0.000 | n/a | n/a | 0.558 | 0.000 | 0.000 | 0.558 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 79e896c5e0209fb700000000000001b7 | 205.737 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 204.730 | 0.026 | n/a | 0.214 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb700000000000001dc | 205.082 | 0.000 | n/a | 0.000 | 0.000 | 0.515 | 204.419 | 0.013 | n/a | 0.039 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb700000000000001e9 | 204.985 | 0.000 | n/a | 0.000 | 0.000 | 4.181 | 200.664 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb700000000000001e3 | 204.888 | 0.000 | n/a | 0.000 | 0.000 | 0.304 | 204.360 | 0.044 | n/a | 0.061 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000196 | 204.604 | 0.000 | n/a | 0.000 | 0.000 | 0.451 | 203.998 | 0.011 | n/a | 0.038 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb700000000000001aa | 204.347 | 0.000 | n/a | 0.000 | 0.000 | 0.506 | 203.647 | 0.013 | n/a | 0.059 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb700000000000001a0 | 203.478 | 0.000 | n/a | 0.000 | 0.000 | 1.617 | 201.338 | 0.021 | n/a | 0.117 | 0.000 | n/a | n/a | 0.385 | 0.000 | 0.000 | 0.385 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000197 | 202.981 | 0.000 | n/a | 0.000 | 0.000 | 1.892 | 200.867 | 0.009 | n/a | 0.118 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000203 | 202.626 | 0.000 | n/a | 0.000 | 0.000 | 1.172 | 201.041 | 0.008 | n/a | 0.099 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb700000000000001a7 | 202.504 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 201.564 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000199 | 202.474 | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 201.177 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb700000000000001bb | 202.364 | 0.000 | n/a | 0.000 | 0.000 | 0.437 | 201.725 | 0.013 | n/a | 0.084 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb700000000000001bc | 202.265 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 201.033 | 0.013 | n/a | 0.082 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb700000000000001e6 | 202.263 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 201.126 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb700000000000001ea | 202.260 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 200.973 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb700000000000001c2 | 202.149 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 201.138 | 0.067 | n/a | 0.084 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb700000000000001c7 | 202.074 | 0.000 | n/a | 0.000 | 0.000 | 0.429 | 201.470 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb700000000000001f3 | 202.063 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.009 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000198 | 202.046 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 200.785 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb700000000000001ee | 201.978 | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 200.623 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-43/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.291 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 200.575 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 206.364 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.513 | 202.396 | 1.763 | n/a | 0.120 | 0.000 | n/a | n/a | 0.308 | 0.000 | 0.000 | 0.308 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 79e896c5e0209fb70000000000000276 | 214.316 | 0.000 | n/a | 0.000 | 0.000 | 13.521 | 200.641 | 0.010 | n/a | 0.039 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb70000000000000243 | 206.364 | 0.000 | n/a | 0.000 | 0.000 | 5.513 | 200.655 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb7000000000000021a | 206.258 | 0.000 | n/a | 0.000 | 0.000 | 1.401 | 204.704 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000217 | 203.576 | 0.000 | n/a | 0.000 | 0.000 | 2.863 | 200.478 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb7000000000000023f | 202.957 | 0.000 | n/a | 0.000 | 0.000 | 0.402 | 202.396 | 0.010 | n/a | 0.033 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb70000000000000229 | 202.894 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 201.326 | 0.006 | n/a | 0.158 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb70000000000000264 | 202.885 | 0.000 | n/a | 0.000 | 0.000 | 1.059 | 201.581 | 0.029 | n/a | 0.076 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb7000000000000024a | 202.799 | 0.000 | n/a | 0.000 | 0.000 | 1.854 | 200.645 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb7000000000000020f | 202.695 | 0.000 | n/a | 0.000 | 0.000 | 1.890 | 200.472 | 0.006 | n/a | 0.018 | 0.000 | n/a | n/a | 0.308 | 0.000 | 0.000 | 0.308 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000218 | 202.587 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 201.530 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000269 | 202.505 | 0.000 | n/a | 0.000 | 0.000 | 0.523 | 201.832 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb7000000000000026a | 202.270 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 201.298 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb7000000000000022c | 202.174 | 0.000 | n/a | 0.000 | 0.000 | 1.414 | 200.600 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb70000000000000226 | 202.045 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 200.855 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb7000000000000023d | 202.027 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 201.192 | 0.024 | n/a | 0.062 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb70000000000000247 | 201.882 | 0.000 | n/a | 0.000 | 0.000 | 0.471 | 201.217 | 0.010 | n/a | 0.120 | 0.000 | n/a | n/a | 0.064 | 0.000 | 0.000 | 0.064 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb7000000000000026d | 201.840 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 200.708 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000225 | 201.819 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 200.791 | 0.024 | n/a | 0.056 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000272 | 201.760 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 200.702 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb7000000000000023c | 201.731 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 200.671 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / read (69 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 73.743 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.473 | 72.697 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 204.267 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.198 | 203.571 | 42.996 | n/a | 0.062 | 0.000 | n/a | n/a | 50.336 | 0.000 | 0.000 | 50.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 79e896c5e0209fb7000000000000028a | 204.267 | 0.000 | n/a | 0.000 | 0.000 | 0.500 | 203.571 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000286 | 203.062 | 0.000 | n/a | 0.000 | 0.000 | 0.486 | 202.439 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb7000000000000027c | 202.919 | 0.000 | n/a | 0.000 | 0.000 | 2.268 | 200.491 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb7000000000000027f | 201.751 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.737 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb7000000000000028f | 201.540 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 200.594 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb7000000000000028e | 201.540 | 0.000 | n/a | 0.000 | 0.000 | 0.698 | 200.598 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000281 | 201.484 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 200.358 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb7000000000000028d | 201.359 | 0.000 | n/a | 0.000 | 0.000 | 0.402 | 200.783 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb7000000000000027b | 201.268 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 200.542 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb70000000000000292 | 201.217 | 0.000 | n/a | 0.000 | 0.000 | 0.632 | 200.417 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000287 | 201.217 | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 200.560 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb7000000000000027d | 201.187 | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 200.410 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb70000000000000284 | 201.102 | 0.000 | n/a | 0.000 | 0.000 | 0.532 | 200.431 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000288 | 200.954 | 0.000 | n/a | 0.000 | 0.000 | 0.349 | 200.474 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000291 | 200.896 | 0.000 | n/a | 0.000 | 0.000 | 0.339 | 200.430 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb7000000000000028c | 200.837 | 0.000 | n/a | 0.000 | 0.000 | 0.337 | 200.368 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000282 | 200.774 | 0.000 | n/a | 0.000 | 0.000 | 0.364 | 200.289 | 0.004 | n/a | 0.016 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb70000000000000293 | 196.931 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 196.043 | 0.018 | n/a | 0.026 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb7000000000000028b | 191.894 | 0.000 | n/a | 0.000 | 0.000 | 0.490 | 188.037 | 3.184 | n/a | 0.010 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000290 | 149.257 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 148.505 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (221 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.280 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.455 | 85.650 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 203.816 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.277 | 202.467 | 0.741 | n/a | 0.115 | 0.000 | n/a | n/a | 50.211 | 0.000 | 0.000 | 50.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 79e896c5e0209fb70000000000000ec2 | 206.698 | 0.000 | n/a | 0.000 | 0.000 | 5.126 | 201.300 | 0.006 | n/a | 0.111 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000ec1 | 203.863 | 0.000 | n/a | 0.000 | 0.000 | 2.154 | 201.402 | 0.021 | n/a | 0.067 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000ec0 | 203.816 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 202.867 | 0.019 | n/a | 0.180 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000ecb | 203.702 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 202.688 | 0.021 | n/a | 0.129 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000eee | 203.285 | 0.000 | n/a | 0.000 | 0.000 | 1.628 | 201.188 | 0.009 | n/a | 0.094 | 0.000 | n/a | n/a | 0.366 | 0.000 | 0.000 | 0.366 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000efc | 203.051 | 0.000 | n/a | 0.000 | 0.000 | 0.424 | 202.467 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000eef | 202.622 | 0.000 | n/a | 0.000 | 0.000 | 1.249 | 201.074 | 0.012 | n/a | 0.062 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000ead | 202.607 | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 201.543 | 0.009 | n/a | 0.115 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000ea2 | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 201.511 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-42/journal/page | none observed |
| 79e896c5e0209fb70000000000000eb2 | 202.278 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 201.039 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000ed4 | 202.261 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 201.455 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| 79e896c5e0209fb70000000000000ee4 | 202.226 | 0.000 | n/a | 0.000 | 0.000 | 3.277 | 198.724 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000ec7 | 202.017 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 201.007 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-43/journal/page | none observed |
| 79e896c5e0209fb70000000000000ee8 | 201.964 | 0.000 | n/a | 0.000 | 0.000 | 1.261 | 200.559 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-64/journal/page | none observed |
| 79e896c5e0209fb70000000000000ee6 | 201.926 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 200.803 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000e9b | 201.907 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 200.719 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-48/journal/page | none observed |
| 79e896c5e0209fb70000000000000ef8 | 201.899 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 200.861 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-46/journal/page | none observed |
| 79e896c5e0209fb70000000000000e8b | 201.887 | 0.000 | n/a | 0.000 | 0.000 | 0.489 | 201.263 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000ed6 | 201.857 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 200.954 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-45/journal/page | none observed |
| 79e896c5e0209fb70000000000000eac | 201.855 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 201.104 | 0.043 | n/a | 0.062 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions

Verdict: scheduled offer to the final receipt handed to the caller (ack/1, Sam 2026-11-16). Actual scheduler lateness counts. Legacy finish is reported, never judged. Corrected removes observed offer lateness, including GC/event-loop stalls, and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged. Commit-based bars need at least 500 primary commits, including both sides of a ratio.

Timer lateness p50/p99: 0.002/3.721 ms; post-ACK p50/p99: 0.403/2.103 ms.

| Measurement | verdict (ACK) | legacy finish | corrected diagnostic | bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 9.184 | 9.679 | 8.886 | reported |
| All-primary p99 ms | 48.636 | 49.030 | 48.165 | <=50 |
| L256 5-10 p50Ms | 10.687 | 11.135 | 10.687 | <=10 |
| L256 5-10 p99Ms | 15.500 | 16.195 | 15.499 | <=50 |
| L256 11-25 p50Ms | 16.255 | 17.663 | 16.255 | <=10 |
| L256 11-25 p99Ms | 23.355 | 24.078 | 23.353 | <=50 |
| L256 26-50 p50Ms | 18.303 | 19.199 | 18.303 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 26.953 | 28.345 | 26.950 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 7.967 | 8.319 | 7.679 | <=10 |
| Burst 11-25 p50 ms | 9.727 | 10.367 | 9.471 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 26.953 | 28.345 | 26.950 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 78.371 | 80.194 | 78.369 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 86.025/86.025 | 83.795 | 51.717 | 142.948 | 1.023/0.165 |
| 5-10 | 250-1000 | 52 | 12.760/53.200 | 12.358 | 7.549 | 18.395 | 0.088/0.028 |
| 11-25 | 100-250 | 17 | 14.476/43.019 | 13.935 | 8.404 | 19.242 | 0.089/0.039 |
| 26-50 | overlap | 147 | 15.339/69.054 | 14.375 | 8.018 | 20.673 | 0.052/0.023 |
| 11-25 | 250-1000 | 23 | 17.963/36.777 | 17.137 | 8.047 | 22.428 | 0.089/0.027 |
| 5-10 | overlap | 803 | 9.342/48.452 | 9.013 | 5.562 | 12.283 | 0.036/0.020 |
| 5-10 | 100-250 | 22 | 11.458/36.443 | 11.134 | 7.585 | 15.663 | 0.083/0.023 |
| 26-50 | 250-1000 | 7 | 28.175/51.802 | 26.782 | 9.330 | 21.848 | 0.125/0.030 |
| 5-10 | 0-50 | 1127 | 7.240/33.790 | 6.856 | 3.789 | 9.540 | 0.042/0.021 |
| 11-25 | overlap | 367 | 12.047/54.671 | 11.448 | 6.767 | 15.795 | 0.041/0.020 |
| 5-10 | 50-100 | 61 | 7.519/52.155 | 7.021 | 3.920 | 9.819 | 0.055/0.022 |
| 26-50 | 100-250 | 2 | 18.990/22.755 | 17.458 | 11.792 | 27.222 | 0.100/0.021 |
| 26-50 | 50-100 | 14 | 15.130/22.120 | 13.345 | 8.196 | 19.928 | 0.069/0.035 |
| 11-25 | 0-50 | 541 | 9.189/33.008 | 8.567 | 4.629 | 11.816 | 0.048/0.021 |
| 11-25 | 50-100 | 38 | 10.621/46.927 | 10.088 | 5.778 | 14.626 | 0.056/0.021 |
| 26-50 | 0-50 | 198 | 12.971/46.247 | 11.992 | 6.295 | 16.731 | 0.060/0.022 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 901 | 18 | 1156.099 |
| burst | 2519 | 14 | 809.901 |

## Writer heap, GC and scheduler stalls

Source 2409bdada6be6cb7f17d1aa71f31da90a72f01af; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 342.754 / 489.050 |
| GC events / total duration / maximum ms | 593 / 1488.000 / 74.548 |
| GC events >50 ms / total duration ms | 1 / 74.548 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":579,"4":7,"8":7} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 49.030 / 33 / 2044.755 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

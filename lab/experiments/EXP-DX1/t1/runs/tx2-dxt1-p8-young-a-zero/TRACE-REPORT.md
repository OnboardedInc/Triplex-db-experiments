# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (79.390 ms, trace `36d0e4fd06d89551000000000000013b`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (52.784 ms, trace `36d0e4fd06d895510000000000002217`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (55.085 ms, trace `36d0e4fd06d89551000000000000021b`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (66.547 ms, trace `36d0e4fd06d8955100000000000001ca`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (48.399 ms, trace `36d0e4fd06d895510000000000000165`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p8-young-a-zero`; source `37997257638b4703c176245ddb0a2a1d795258aa`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4258/4259 (99.977%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 10286885.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 277 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14377.395 | 269.847 | 11.470 | 457 |
| L1 | 0 | 44968.304 | 769.420 | 13.770 | 1476 |
| L4 | 0 | 44981.255 | 851.330 | 17.776 | 1762 |
| L16 | 0 | 44953.358 | 6423.832 | 50.964 | 34263 |
| L64 | 0 | 44550.653 | 6671.594 | 45.195 | 35836 |
| L256 | 0 | 44752.121 | 806.444 | 12.274 | 1560 |
| L1024 | 0 | 44054.768 | 824.253 | 24.577 | 1598 |
| tail | 0 | 164343.451 | 3328.965 | 53.917 | 6128 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 36d0e4fd06d89551000000000000013b | driver.queue.scheduler-dispatch | 0.057 | none | 0 / 32 |
| 36d0e4fd06d89551000000000000013b | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 36d0e4fd06d89551000000000000013b waited: []

| 36d0e4fd06d895510000000000002217 | driver.queue.scheduler-dispatch | 0.026 | none | 0 / 32 |
| 36d0e4fd06d895510000000000002217 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 36d0e4fd06d895510000000000002217 waited: []

| 36d0e4fd06d89551000000000000021b | driver.queue.scheduler-dispatch | 0.188 | none | 0 / 32 |
| 36d0e4fd06d89551000000000000021b | driver.queue.scheduler-late | 0.006 | none | 0 / 32 |

Observed active steps while trace 36d0e4fd06d89551000000000000021b waited: []

| 36d0e4fd06d8955100000000000001ca | driver.queue.scheduler-late | 0.319 | none | 0 / 32 |
| 36d0e4fd06d8955100000000000001ca | driver.queue.scheduler-dispatch | 0.062 | none | 0 / 32 |

Observed active steps while trace 36d0e4fd06d8955100000000000001ca waited: []

| 36d0e4fd06d895510000000000000165 | driver.queue.scheduler-dispatch | 0.091 | none | 0 / 32 |
| 36d0e4fd06d895510000000000000165 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 36d0e4fd06d895510000000000000165 waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.654 | 0.000 | 0.000 | 0.520 | 4.499 | 0.450 | 0.000 | 0.188 | 1.395 | 5.734 | 0.037 | n/a | 0.509 | 11.743 | n/a | n/a | 0.031 | 5.057 | 0.180 | 0.031 |
| p99 | 67.978 | 8.839 | 0.028 | 7.708 | 19.227 | n/a | 4.146 | 0.897 | 3.365 | 23.340 | 0.599 | n/a | 3.179 | 37.360 | n/a | n/a | 0.238 | 24.165 | 0.474 | 0.238 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d8955100000000000000f1 | 67.978 | 16.666 | 0.411 | 0.000 | 0.076 | 2.283 | 23.340 | 0.279 | n/a | 0.713 | 24.180 | n/a | n/a | 0.029 | 17.154 | 0.252 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000109 | 61.945 | 7.142 | 0.276 | 0.000 | 0.066 | 1.762 | 15.174 | 0.037 | n/a | 0.104 | 37.360 | n/a | n/a | 0.023 | 7.484 | 0.121 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000000ef | 51.005 | 19.227 | n/a | 4.146 | 0.792 | 1.391 | 5.734 | 0.029 | n/a | 0.090 | 19.359 | n/a | n/a | 0.238 | 24.165 | 0.474 | 0.238 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000101 | 43.944 | 3.982 | 0.240 | 0.000 | 0.168 | 1.178 | 17.805 | 0.086 | n/a | 0.177 | 20.243 | n/a | n/a | 0.065 | 4.390 | 0.100 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000010d | 42.912 | 4.558 | 0.238 | 0.000 | 0.147 | 1.618 | 13.068 | 0.087 | n/a | 3.179 | 19.974 | n/a | n/a | 0.043 | 4.942 | 0.115 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000000f7 | 41.627 | 3.538 | n/a | 2.886 | 0.897 | 1.367 | 3.670 | 0.028 | n/a | 0.737 | 28.443 | n/a | n/a | 0.061 | 7.322 | 0.176 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000000fb | 37.906 | 4.499 | 0.340 | 0.000 | 0.107 | 2.271 | 15.759 | 0.037 | n/a | 0.434 | 14.418 | n/a | n/a | 0.042 | 4.947 | 0.130 | 0.042 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000125 | 34.926 | 3.499 | 0.160 | 0.229 | 0.036 | 1.337 | 10.641 | 0.059 | n/a | 0.584 | 18.365 | n/a | n/a | 0.016 | 3.924 | 0.112 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000127 | 33.662 | 3.834 | 0.254 | 0.305 | 0.231 | 1.308 | 18.126 | 0.052 | n/a | 0.107 | 9.345 | n/a | n/a | 0.099 | 4.625 | 0.137 | 0.099 | gw-w/thread-45/gateway.admitted-work | none observed |
| 36d0e4fd06d89551000000000000011b | 31.941 | 6.186 | 0.260 | 0.563 | 0.072 | 3.234 | 9.695 | 0.100 | n/a | 0.901 | 10.900 | n/a | n/a | 0.031 | 7.080 | 0.222 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000000f9 | 31.885 | 4.923 | 0.433 | 0.000 | 0.054 | 1.490 | 11.351 | 0.030 | n/a | 0.109 | 13.472 | n/a | n/a | 0.024 | 5.410 | 0.170 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000103 | 31.733 | 6.019 | 0.235 | 0.000 | 0.138 | 1.698 | 5.699 | 0.032 | n/a | 0.656 | 17.208 | n/a | n/a | 0.049 | 6.392 | 0.201 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000011f | 31.569 | 4.452 | 0.335 | 0.000 | 0.075 | 2.219 | 11.249 | 0.062 | n/a | 2.383 | 10.754 | n/a | n/a | 0.042 | 4.861 | 0.154 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000000f5 | 30.386 | 5.710 | 0.450 | 0.000 | 0.052 | 2.410 | 11.024 | 0.029 | n/a | 0.122 | 10.554 | n/a | n/a | 0.034 | 6.212 | 0.204 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000107 | 29.654 | 4.733 | n/a | 0.000 | 0.324 | 1.395 | 2.029 | 0.025 | n/a | 0.578 | 20.525 | n/a | n/a | 0.044 | 5.057 | 0.171 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000011d | 26.335 | 2.386 | n/a | 0.000 | 0.188 | 3.365 | 1.314 | 0.025 | n/a | 0.104 | 18.925 | n/a | n/a | 0.028 | 2.574 | 0.098 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000113 | 26.330 | 7.022 | 0.304 | 0.396 | 0.077 | 1.704 | 6.751 | 0.037 | n/a | 0.411 | 9.591 | n/a | n/a | 0.035 | 7.800 | 0.296 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000117 | 26.224 | 5.215 | 0.149 | 0.463 | 0.060 | 1.960 | 6.188 | 0.040 | n/a | 0.381 | 11.743 | n/a | n/a | 0.024 | 5.887 | 0.224 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000115 | 23.772 | 5.049 | n/a | 1.701 | 0.251 | 0.984 | 2.909 | 0.599 | n/a | 1.177 | 11.073 | n/a | n/a | 0.030 | 7.001 | 0.295 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000010b | 23.041 | 4.926 | 0.416 | 0.000 | 0.066 | 2.569 | 8.265 | 0.061 | n/a | 0.448 | 6.267 | n/a | n/a | 0.023 | 5.409 | 0.235 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.703 | 0.979 | 0.000 | 0.543 | 2.697 | n/a | 0.000 | 0.519 | 1.042 | 2.254 | 0.025 | n/a | 0.509 | 10.507 | n/a | n/a | 0.031 | 3.103 | 0.176 | 0.031 |
| p99 | 41.627 | 1.002 | 0.000 | 0.937 | 3.884 | n/a | 2.886 | 0.897 | 3.365 | 5.036 | 0.053 | n/a | 2.165 | 28.443 | n/a | n/a | 0.061 | 7.322 | 0.332 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d8955100000000000000f7 | 41.627 | 3.538 | n/a | 2.886 | 0.897 | 1.367 | 3.670 | 0.028 | n/a | 0.737 | 28.443 | n/a | n/a | 0.061 | 7.322 | 0.176 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000011d | 26.335 | 2.386 | n/a | 0.000 | 0.188 | 3.365 | 1.314 | 0.025 | n/a | 0.104 | 18.925 | n/a | n/a | 0.028 | 2.574 | 0.098 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000000f3 | 19.475 | 2.697 | n/a | 0.000 | 0.406 | 1.128 | 2.714 | 0.033 | n/a | 0.509 | 11.954 | n/a | n/a | 0.033 | 3.103 | 0.159 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 36d0e4fd06d895510000000000000111 | 19.123 | 2.454 | n/a | 0.000 | 0.519 | 0.875 | 4.618 | 0.025 | n/a | 0.099 | 10.507 | n/a | n/a | 0.025 | 2.973 | 0.155 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000123 | 18.703 | 3.344 | n/a | 0.000 | 0.654 | 1.042 | 5.036 | 0.025 | n/a | 0.804 | 7.740 | n/a | n/a | 0.060 | 3.997 | 0.214 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000121 | 17.040 | 2.872 | n/a | 0.000 | 0.294 | 0.947 | 1.260 | 0.025 | n/a | 0.950 | 10.665 | n/a | n/a | 0.025 | 3.166 | 0.186 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000010f | 16.740 | 2.251 | n/a | 0.000 | 0.549 | 0.969 | 1.448 | 0.022 | n/a | 2.165 | 9.306 | n/a | n/a | 0.031 | 2.800 | 0.167 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000119 | 13.333 | 3.884 | n/a | 0.000 | 0.547 | 1.666 | 1.236 | 0.023 | n/a | 0.105 | 5.815 | n/a | n/a | 0.057 | 4.431 | 0.332 | 0.057 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000000fc | 12.299 | 1.725 | n/a | 0.000 | 0.492 | 0.869 | 2.254 | 0.053 | n/a | 0.147 | 6.729 | n/a | n/a | 0.029 | 2.217 | 0.180 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.742 | 0.157 | 0.000 | 0.489 | 3.893 | n/a | 0.000 | 0.208 | 1.494 | 4.354 | 0.033 | n/a | 0.203 | 12.290 | n/a | n/a | 0.035 | 4.534 | 0.189 | 0.035 |
| p99 | 112.290 | 3.884 | 0.000 | 4.045 | 10.647 | n/a | 2.352 | 6.643 | 5.630 | 31.690 | 0.544 | n/a | 4.938 | 79.390 | n/a | n/a | 0.096 | 11.590 | 0.537 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d89551000000000000013b | 112.290 | 4.089 | 0.233 | 0.000 | 0.059 | 2.005 | 25.965 | 0.089 | n/a | 0.433 | 79.390 | n/a | n/a | 0.026 | 4.382 | 0.039 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms; driver.reader-basis.broadcast 0.011ms |
| 36d0e4fd06d8955100000000000001ca | 71.654 | 1.820 | n/a | 0.000 | 0.381 | 1.582 | 1.143 | 0.023 | n/a | 0.128 | 66.547 | n/a | n/a | 0.030 | 2.201 | 0.031 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 36d0e4fd06d895510000000000000165 | 70.069 | 4.945 | 2.980 | 0.326 | 0.094 | 2.482 | 10.103 | 0.080 | n/a | 0.618 | 48.399 | n/a | n/a | 0.042 | 8.344 | 0.119 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.062ms; driver.reader-basis.broadcast 0.034ms |
| 36d0e4fd06d89551000000000000016d | 61.152 | 3.686 | 0.175 | 0.239 | 0.075 | 2.008 | 31.690 | 0.072 | n/a | 0.252 | 22.921 | n/a | n/a | 0.035 | 4.175 | 0.068 | 0.035 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.033ms |
| 36d0e4fd06d895510000000000000198 | 46.546 | 4.505 | 0.155 | 0.386 | 0.122 | 1.925 | 24.511 | 0.049 | n/a | 0.323 | 14.518 | n/a | n/a | 0.051 | 5.168 | 0.111 | 0.051 | gw-w/thread-42/gateway.admitted-work | driver.reader-basis.broadcast 0.020ms |
| 36d0e4fd06d89551000000000000012e | 45.956 | 4.626 | n/a | 0.000 | 1.162 | 1.550 | 4.837 | 0.047 | n/a | 0.128 | 33.563 | n/a | n/a | 0.042 | 5.788 | 0.126 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 36d0e4fd06d89551000000000000014b | 44.440 | 5.183 | 0.179 | 2.352 | 0.072 | 1.698 | 14.914 | 0.060 | n/a | 0.288 | 19.662 | n/a | n/a | 0.031 | 7.786 | 0.175 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.083ms |
| 36d0e4fd06d895510000000000000143 | 40.765 | 5.527 | 0.183 | 0.517 | 0.051 | 2.594 | 11.957 | 0.031 | n/a | 0.120 | 19.762 | n/a | n/a | 0.023 | 6.277 | 0.154 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 36d0e4fd06d895510000000000000166 | 39.070 | 4.374 | n/a | 0.000 | 0.530 | 0.702 | 4.354 | 0.025 | n/a | 0.402 | 28.637 | n/a | n/a | 0.047 | 4.903 | 0.125 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000013f | 37.996 | 4.921 | 0.322 | 0.000 | 0.071 | 1.326 | 9.950 | 0.035 | n/a | 0.401 | 20.942 | n/a | n/a | 0.027 | 5.314 | 0.140 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 36d0e4fd06d8955100000000000001ba | 37.988 | 4.949 | 0.190 | 0.408 | 0.077 | 2.332 | 14.649 | 0.063 | n/a | 0.127 | 15.151 | n/a | n/a | 0.041 | 5.625 | 0.148 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 36d0e4fd06d895510000000000000178 | 37.641 | 4.201 | 0.163 | 0.000 | 0.045 | 3.947 | 9.474 | 0.028 | n/a | 0.067 | 19.698 | n/a | n/a | 0.018 | 4.409 | 0.117 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 36d0e4fd06d895510000000000000135 | 37.635 | 3.858 | 0.306 | 0.000 | 0.093 | 1.219 | 6.409 | 0.030 | n/a | 0.117 | 25.567 | n/a | n/a | 0.037 | 4.257 | 0.113 | 0.037 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000130 | 37.004 | 2.519 | n/a | 0.000 | 0.398 | 0.920 | 2.140 | 0.044 | n/a | 0.882 | 30.073 | n/a | n/a | 0.029 | 2.917 | 0.079 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000014c | 35.573 | 6.552 | n/a | 0.000 | 0.995 | 0.579 | 6.932 | 0.544 | n/a | 0.887 | 19.063 | n/a | n/a | 0.021 | 7.547 | 0.212 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001a6 | 34.176 | 3.995 | 0.326 | 0.272 | 0.076 | 1.798 | 13.281 | 0.040 | n/a | 0.419 | 13.927 | n/a | n/a | 0.043 | 4.669 | 0.137 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 36d0e4fd06d89551000000000000018c | 33.965 | 4.964 | 0.153 | 0.548 | 0.054 | 1.599 | 17.699 | 0.053 | n/a | 0.411 | 8.460 | n/a | n/a | 0.024 | 5.719 | 0.168 | 0.024 | gw-w/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.018ms |
| 36d0e4fd06d8955100000000000001a0 | 33.635 | 5.243 | 0.201 | 0.379 | 0.075 | 2.202 | 12.665 | 0.124 | n/a | 0.542 | 12.171 | n/a | n/a | 0.033 | 5.899 | 0.175 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 36d0e4fd06d89551000000000000013d | 33.399 | 3.699 | 0.169 | 0.319 | 0.076 | 1.964 | 12.274 | 0.065 | n/a | 0.142 | 14.652 | n/a | n/a | 0.037 | 4.263 | 0.128 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| 36d0e4fd06d89551000000000000012b | 33.379 | 4.135 | 0.328 | 0.000 | 0.087 | 2.111 | 12.798 | 0.059 | n/a | 0.163 | 13.659 | n/a | n/a | 0.038 | 4.550 | 0.136 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.124 | 0.000 | 0.000 | 0.476 | 2.519 | n/a | 0.000 | 0.398 | 0.955 | 1.279 | 0.025 | n/a | 0.282 | 8.346 | n/a | n/a | 0.030 | 2.834 | 0.226 | 0.030 |
| p99 | 71.654 | 1.347 | 0.000 | 0.869 | 6.964 | n/a | 0.000 | 6.643 | 4.207 | 4.587 | 0.082 | n/a | 2.340 | 66.547 | n/a | n/a | 0.068 | 8.249 | 0.537 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d8955100000000000001ca | 71.654 | 1.820 | n/a | 0.000 | 0.381 | 1.582 | 1.143 | 0.023 | n/a | 0.128 | 66.547 | n/a | n/a | 0.030 | 2.201 | 0.031 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 36d0e4fd06d895510000000000000130 | 37.004 | 2.519 | n/a | 0.000 | 0.398 | 0.920 | 2.140 | 0.044 | n/a | 0.882 | 30.073 | n/a | n/a | 0.029 | 2.917 | 0.079 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000134 | 25.449 | 6.964 | n/a | 0.000 | 0.101 | 2.844 | 4.239 | 0.046 | n/a | 0.282 | 10.945 | n/a | n/a | 0.028 | 7.065 | 0.278 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001d0 | 24.398 | 2.322 | n/a | 0.000 | 0.431 | 0.955 | 1.996 | 0.035 | n/a | 0.140 | 18.477 | n/a | n/a | 0.043 | 2.752 | 0.113 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000016b | 23.093 | 3.273 | n/a | 0.000 | 0.870 | 2.260 | 1.479 | 0.021 | n/a | 0.136 | 14.985 | n/a | n/a | 0.068 | 4.144 | 0.179 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000159 | 22.936 | 1.967 | n/a | 0.000 | 0.559 | 4.207 | 1.182 | 0.025 | n/a | 0.095 | 14.872 | n/a | n/a | 0.030 | 2.526 | 0.110 | 0.030 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 36d0e4fd06d8955100000000000001cc | 18.608 | 2.747 | n/a | 0.000 | 0.058 | 1.627 | 1.215 | 0.025 | n/a | 0.092 | 12.819 | n/a | n/a | 0.026 | 2.805 | 0.151 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000180 | 18.593 | 2.525 | n/a | 0.000 | 0.232 | 0.906 | 4.587 | 0.034 | n/a | 0.132 | 10.126 | n/a | n/a | 0.051 | 2.757 | 0.148 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000017c | 18.277 | 2.500 | n/a | 0.000 | 0.109 | 1.405 | 2.430 | 0.082 | n/a | 0.907 | 10.813 | n/a | n/a | 0.031 | 2.609 | 0.143 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000192 | 17.239 | 3.195 | n/a | 0.000 | 0.709 | 0.991 | 1.150 | 0.027 | n/a | 0.115 | 11.006 | n/a | n/a | 0.047 | 3.904 | 0.226 | 0.047 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000174 | 15.366 | 1.606 | n/a | 0.000 | 6.643 | 0.434 | 0.992 | 0.019 | n/a | 2.083 | 3.572 | n/a | n/a | 0.018 | 8.249 | 0.537 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.235ms |
| 36d0e4fd06d8955100000000000001c3 | 15.124 | 2.858 | n/a | 0.000 | 0.859 | 0.852 | 1.279 | 0.020 | n/a | 0.334 | 8.874 | n/a | n/a | 0.048 | 3.717 | 0.246 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 36d0e4fd06d895510000000000000145 | 14.958 | 3.010 | n/a | 0.000 | 0.911 | 0.969 | 1.281 | 0.020 | n/a | 0.395 | 8.346 | n/a | n/a | 0.026 | 3.922 | 0.262 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000018a | 14.424 | 2.254 | n/a | 0.000 | 0.277 | 0.707 | 0.999 | 0.020 | n/a | 2.340 | 7.805 | n/a | n/a | 0.022 | 2.531 | 0.175 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001ae | 14.007 | 3.127 | n/a | 0.000 | 0.838 | 1.188 | 1.442 | 0.035 | n/a | 0.131 | 7.210 | n/a | n/a | 0.036 | 3.965 | 0.283 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001d8 | 13.766 | 2.420 | n/a | 0.000 | 0.843 | 1.605 | 2.473 | 0.074 | n/a | 0.993 | 5.319 | n/a | n/a | 0.038 | 3.263 | 0.237 | 0.038 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001a4 | 13.105 | 4.505 | n/a | 0.000 | 0.395 | 0.738 | 1.065 | 0.025 | n/a | 0.161 | 6.161 | n/a | n/a | 0.055 | 4.899 | 0.374 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 36d0e4fd06d89551000000000000014f | 12.894 | 2.836 | n/a | 0.000 | 0.268 | 1.296 | 2.095 | 0.061 | n/a | 1.120 | 5.194 | n/a | n/a | 0.023 | 3.104 | 0.241 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000190 | 12.164 | 2.323 | n/a | 0.000 | 0.192 | 0.903 | 1.324 | 0.032 | n/a | 0.617 | 6.735 | n/a | n/a | 0.038 | 2.516 | 0.207 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001bb | 11.553 | 2.620 | n/a | 0.000 | 0.213 | 0.685 | 1.142 | 0.019 | n/a | 0.652 | 6.169 | n/a | n/a | 0.052 | 2.834 | 0.245 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (52 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.934 | n/a | n/a | n/a | 33.416 | 3.642 | 2.408 | 0.000 | 0.387 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.991 | 51.669 | 0.810 | 9.991 |
| p99 | 300.063 | n/a | n/a | n/a | 81.151 | 190.876 | 13.041 | 0.000 | 141.788 | 146.027 | 139.509 | n/a | 0.012 | 0.000 | n/a | n/a | 130.774 | 244.728 | 1.000 | 130.774 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d8955100000000000011a5 | 300.063 | 81.151 | 2.864 | 9.491 | 0.000 | 46.678 | 20.355 | 139.509 | n/a | 0.008 | 0.000 | n/a | n/a | 0.006 | 93.506 | 0.312 | 0.006 | gw-r/thread-47/gateway.admission-wait | driver.publication.persist-deferred 1.299ms; driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.165ms |
| 36d0e4fd06d8955100000000000011ab | 290.131 | 26.120 | 3.309 | 1.113 | 0.000 | 121.124 | 1.254 | 137.197 | n/a | 0.006 | 0.000 | n/a | n/a | 0.008 | 30.542 | 0.105 | 0.008 | gw-r/thread-48/gateway.admission-wait | driver.publication.persist-deferred 1.299ms; driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.165ms |
| 36d0e4fd06d8955100000000000011c7 | 270.714 | 44.614 | 170.863 | 3.794 | 0.000 | 0.459 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.983 | 219.271 | 0.810 | 50.983 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.151ms; driver.publication.persist-deferred 1.077ms; driver.publication.persist-deferred 1.016ms |
| 36d0e4fd06d8955100000000000011c8 | 268.477 | 59.357 | 182.697 | 2.673 | 0.000 | 0.292 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.458 | 244.728 | 0.912 | 23.458 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.077ms; driver.publication.persist-deferred 1.016ms; driver.publication.persist-deferred 0.998ms |
| 36d0e4fd06d8955100000000000011ba | 262.072 | 26.295 | 103.658 | 1.070 | 0.000 | 0.275 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 130.774 | 131.022 | 0.500 | 130.774 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.151ms |
| 36d0e4fd06d8955100000000000011b3 | 250.935 | 33.416 | 4.457 | 2.360 | 0.000 | 141.788 | 1.357 | 67.535 | n/a | 0.012 | 0.000 | n/a | n/a | 0.011 | 40.232 | 0.160 | 0.011 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.151ms |
| 36d0e4fd06d8955100000000000011b7 | 248.396 | 15.357 | 190.876 | 0.000 | 0.000 | 0.305 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.858 | 206.233 | 0.830 | 41.858 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.151ms |
| 36d0e4fd06d8955100000000000011bc | 235.206 | 13.015 | 189.135 | 0.000 | 0.000 | 0.455 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.601 | 202.150 | 0.859 | 32.601 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.183ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.151ms; driver.publication.persist-deferred 1.077ms |
| 36d0e4fd06d8955100000000000011a6 | 217.745 | 63.223 | 2.378 | 3.993 | 0.000 | 2.101 | 146.027 | 0.005 | n/a | 0.012 | 0.000 | n/a | n/a | 0.006 | 69.594 | 0.320 | 0.006 | gw-r/thread-46/gateway.admitted-work | driver.publication.persist-deferred 1.299ms; driver.publication.persist-deferred 1.284ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.151ms; driver.ryow-dispatch 1.145ms |
| 36d0e4fd06d895510000000000001555 | 134.417 | 47.257 | 76.635 | 7.257 | 0.000 | 0.724 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.544 | 131.149 | 0.976 | 2.544 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.191ms; driver.publication.persist-deferred 1.437ms; driver.publication.persist-deferred 1.287ms; driver.publication.persist-deferred 1.173ms; driver.publication.persist-deferred 1.155ms |
| 36d0e4fd06d89551000000000000154d | 126.697 | 27.964 | 0.550 | 3.824 | 0.000 | 0.281 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 94.077 | 32.338 | 0.255 | 94.077 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 3.191ms; driver.publication.persist-deferred 3.066ms; driver.publication.persist-deferred 1.437ms; driver.publication.persist-deferred 1.287ms; driver.publication.persist-deferred 1.173ms |
| 36d0e4fd06d895510000000000001857 | 116.781 | 46.695 | 64.212 | 3.727 | 0.000 | 0.387 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.760 | 114.634 | 0.982 | 1.760 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.340ms; driver.publication.persist-deferred 1.240ms; driver.publication.persist-deferred 1.191ms; driver.expected-state.bind-receipt 1.138ms; driver.publication.persist-deferred 1.136ms |
| 36d0e4fd06d895510000000000001cc0 | 113.598 | 77.260 | 0.394 | 13.041 | 0.000 | 0.603 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.301 | 90.694 | 0.798 | 22.301 | node-14/thread-4/client.reach-decode-and-cache | driver.publication.persist-deferred 1.571ms; driver.publication.persist-deferred 1.089ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 1.012ms; driver.publication.persist-deferred 1.000ms |
| 36d0e4fd06d895510000000000001d45 | 112.162 | 61.569 | 2.710 | 4.035 | 0.000 | 0.205 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.643 | 68.314 | 0.609 | 43.643 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 1.060ms; driver.publication.persist-deferred 0.993ms; driver.publication.persist-deferred 0.902ms; driver.publication.persist-deferred 0.688ms; driver.publication.persist-deferred 0.622ms |
| 36d0e4fd06d89551000000000000181a | 110.374 | 62.633 | 4.996 | 4.837 | 0.000 | 0.910 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.998 | 72.467 | 0.657 | 36.998 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 1.442ms; driver.publication.persist-deferred 1.219ms; driver.publication.persist-deferred 1.198ms; driver.publication.persist-deferred 1.096ms; driver.publication.persist-deferred 0.946ms |
| 36d0e4fd06d895510000000000001d4b | 108.529 | 40.814 | 0.210 | 2.015 | 0.000 | 0.323 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 65.167 | 43.039 | 0.397 | 65.167 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 1.060ms; driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 0.993ms; driver.publication.persist-deferred 0.986ms; driver.publication.persist-deferred 0.908ms |
| 36d0e4fd06d895510000000000001821 | 106.895 | 24.501 | 53.452 | 2.405 | 0.000 | 0.291 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.246 | 80.358 | 0.752 | 26.246 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.546ms; driver.publication.persist-deferred 1.219ms; driver.publication.persist-deferred 1.096ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.946ms |
| 36d0e4fd06d89551000000000000181f | 103.068 | 35.398 | 4.126 | 1.726 | 0.000 | 0.289 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.529 | 41.250 | 0.400 | 61.529 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 1.546ms; driver.publication.persist-deferred 1.442ms; driver.publication.persist-deferred 1.219ms; driver.publication.persist-deferred 1.096ms; driver.publication.persist-deferred 1.011ms |
| 36d0e4fd06d895510000000000001853 | 102.641 | 32.962 | 3.642 | 1.118 | 0.000 | 0.513 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.406 | 37.721 | 0.368 | 64.406 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 1.340ms; driver.publication.persist-deferred 1.293ms; driver.publication.persist-deferred 1.136ms; driver.publication.persist-deferred 1.121ms; driver.publication.persist-deferred 1.097ms |
| 36d0e4fd06d89551000000000000154e | 100.931 | 63.673 | 4.259 | 6.942 | 0.000 | 0.387 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.670 | 74.874 | 0.742 | 25.670 | node-14/thread-4/client.reach-decode-and-cache | driver.publication.persist-deferred 3.191ms; driver.publication.persist-deferred 1.437ms; driver.publication.persist-deferred 1.287ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.938ms |

## P2 / L4 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.791 | 0.205 | 0.000 | 0.492 | 3.542 | n/a | 0.000 | 0.197 | 1.119 | 2.731 | 0.030 | n/a | 0.259 | 9.555 | n/a | n/a | 0.032 | 4.213 | 0.200 | 0.032 |
| p99 | 66.236 | 1.995 | 0.000 | 1.400 | 6.694 | n/a | 0.501 | 1.103 | 6.344 | 25.713 | 0.125 | n/a | 4.188 | 52.641 | n/a | n/a | 0.094 | 7.352 | 0.348 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d89551000000000000021b | 75.432 | 5.146 | 0.354 | 0.449 | 0.194 | 2.259 | 10.996 | 0.056 | n/a | 0.816 | 55.085 | n/a | n/a | 0.077 | 6.144 | 0.081 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 36d0e4fd06d8955100000000000001ed | 66.236 | 11.374 | n/a | 0.000 | 0.742 | 6.344 | 25.713 | 0.125 | n/a | 2.485 | 19.410 | n/a | n/a | 0.042 | 12.116 | 0.183 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 36d0e4fd06d895510000000000000284 | 65.814 | 5.287 | 0.199 | 0.000 | 0.061 | 1.301 | 6.142 | 0.029 | n/a | 0.125 | 52.641 | n/a | n/a | 0.029 | 5.548 | 0.084 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 36d0e4fd06d895510000000000000203 | 58.794 | 4.241 | 0.206 | 0.288 | 0.110 | 2.897 | 31.015 | 0.030 | n/a | 0.074 | 19.888 | n/a | n/a | 0.045 | 4.845 | 0.082 | 0.045 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.059ms |
| 36d0e4fd06d8955100000000000001ef | 46.553 | 3.572 | 0.251 | 0.000 | 0.061 | 1.776 | 24.869 | 0.073 | n/a | 0.778 | 15.120 | n/a | n/a | 0.053 | 3.884 | 0.083 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 36d0e4fd06d89551000000000000024b | 42.738 | 3.652 | 0.206 | 0.267 | 0.149 | 8.896 | 19.849 | 0.031 | n/a | 0.100 | 9.534 | n/a | n/a | 0.054 | 4.274 | 0.100 | 0.054 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.061ms |
| 36d0e4fd06d89551000000000000023f | 40.377 | 3.542 | 0.291 | 0.291 | 0.176 | 1.544 | 9.416 | 0.080 | n/a | 0.634 | 24.328 | n/a | n/a | 0.075 | 4.300 | 0.106 | 0.075 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.070ms |
| 36d0e4fd06d895510000000000000259 | 40.061 | 3.743 | 0.275 | 0.229 | 0.071 | 1.727 | 24.930 | 0.036 | n/a | 0.413 | 8.605 | n/a | n/a | 0.031 | 4.318 | 0.108 | 0.031 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.072ms |
| 36d0e4fd06d8955100000000000001ea | 36.033 | 3.905 | 0.269 | 0.000 | 0.196 | 1.331 | 7.077 | 0.043 | n/a | 0.568 | 22.568 | n/a | n/a | 0.077 | 4.370 | 0.121 | 0.077 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 36d0e4fd06d895510000000000000217 | 34.770 | 4.002 | 0.418 | 0.449 | 0.209 | 2.061 | 12.402 | 0.058 | n/a | 0.152 | 14.952 | n/a | n/a | 0.067 | 5.079 | 0.146 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 36d0e4fd06d895510000000000000243 | 33.917 | 4.697 | 0.386 | 0.548 | 0.062 | 2.881 | 15.484 | 0.042 | n/a | 0.146 | 9.634 | n/a | n/a | 0.038 | 5.693 | 0.168 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000294 | 33.844 | 3.756 | 0.202 | 0.391 | 0.057 | 1.116 | 10.269 | 0.026 | n/a | 0.101 | 17.898 | n/a | n/a | 0.027 | 4.407 | 0.130 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000002a8 | 33.745 | 4.506 | 0.321 | 0.416 | 0.070 | 1.760 | 12.370 | 0.038 | n/a | 0.160 | 14.069 | n/a | n/a | 0.035 | 5.313 | 0.157 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001ff | 33.450 | 5.526 | 0.340 | 0.383 | 0.146 | 2.128 | 5.990 | 0.036 | n/a | 0.101 | 18.731 | n/a | n/a | 0.070 | 6.394 | 0.191 | 0.070 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 36d0e4fd06d89551000000000000028e | 31.505 | 5.704 | 0.187 | 0.000 | 0.126 | 1.334 | 8.115 | 0.027 | n/a | 0.117 | 15.852 | n/a | n/a | 0.044 | 6.017 | 0.191 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000215 | 31.028 | 6.694 | 0.311 | 0.299 | 0.049 | 1.478 | 8.892 | 0.041 | n/a | 4.486 | 8.758 | n/a | n/a | 0.021 | 7.352 | 0.237 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 36d0e4fd06d89551000000000000023b | 30.346 | 3.620 | 0.229 | 0.345 | 0.179 | 1.336 | 10.050 | 0.031 | n/a | 0.365 | 14.109 | n/a | n/a | 0.083 | 4.373 | 0.144 | 0.083 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000027e | 30.166 | 4.607 | 0.202 | 0.000 | 0.132 | 1.269 | 6.282 | 0.022 | n/a | 0.337 | 17.268 | n/a | n/a | 0.047 | 4.940 | 0.164 | 0.047 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000020b | 30.004 | 3.432 | 0.307 | 0.238 | 0.128 | 1.275 | 6.277 | 0.106 | n/a | 0.206 | 17.992 | n/a | n/a | 0.043 | 4.105 | 0.137 | 0.043 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000022b | 29.897 | 3.403 | n/a | 0.000 | 0.932 | 0.809 | 0.850 | 0.018 | n/a | 0.108 | 23.737 | n/a | n/a | 0.041 | 4.334 | 0.145 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.217 | 0.000 | 0.000 | 0.459 | 2.126 | n/a | 0.000 | 0.599 | 0.818 | 1.479 | 0.027 | n/a | 0.259 | 8.744 | n/a | n/a | 0.025 | 2.904 | 0.213 | 0.025 |
| p99 | 29.897 | 1.995 | 0.000 | 0.806 | 4.160 | n/a | 0.000 | 1.116 | 4.243 | 7.395 | 0.078 | n/a | 4.188 | 23.737 | n/a | n/a | 0.145 | 4.963 | 0.355 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d89551000000000000022b | 29.897 | 3.403 | n/a | 0.000 | 0.932 | 0.809 | 0.850 | 0.018 | n/a | 0.108 | 23.737 | n/a | n/a | 0.041 | 4.334 | 0.145 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000021d | 25.401 | 4.005 | n/a | 0.000 | 0.958 | 1.820 | 7.395 | 0.078 | n/a | 0.218 | 10.898 | n/a | n/a | 0.028 | 4.963 | 0.195 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000246 | 24.453 | 3.246 | n/a | 0.000 | 1.116 | 0.501 | 0.840 | 0.009 | n/a | 4.188 | 14.514 | n/a | n/a | 0.038 | 4.362 | 0.178 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.240ms; driver.reader-basis.broadcast 0.026ms |
| 36d0e4fd06d8955100000000000002aa | 24.328 | 2.994 | n/a | 0.000 | 0.488 | 1.124 | 1.878 | 0.042 | n/a | 0.733 | 17.014 | n/a | n/a | 0.056 | 3.482 | 0.143 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 36d0e4fd06d895510000000000000232 | 20.847 | 1.990 | n/a | 0.000 | 0.400 | 0.743 | 4.909 | 0.019 | n/a | 0.066 | 12.698 | n/a | n/a | 0.021 | 2.391 | 0.115 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001e1 | 20.600 | 1.716 | n/a | 0.000 | 0.418 | 0.598 | 2.886 | 0.022 | n/a | 0.105 | 14.830 | n/a | n/a | 0.024 | 2.135 | 0.104 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000278 | 20.484 | 3.849 | n/a | 0.000 | 0.703 | 1.133 | 1.355 | 0.027 | n/a | 0.592 | 12.753 | n/a | n/a | 0.073 | 4.552 | 0.222 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001e6 | 18.791 | 2.445 | n/a | 0.000 | 0.305 | 3.036 | 3.170 | 0.024 | n/a | 0.129 | 9.648 | n/a | n/a | 0.034 | 2.750 | 0.146 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000028f | 18.671 | 3.725 | n/a | 0.000 | 1.103 | 1.083 | 2.283 | 0.053 | n/a | 0.211 | 10.135 | n/a | n/a | 0.078 | 4.828 | 0.259 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001f3 | 18.401 | 2.046 | n/a | 0.000 | 0.886 | 0.957 | 1.796 | 0.060 | n/a | 0.259 | 12.375 | n/a | n/a | 0.023 | 2.932 | 0.159 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001df | 17.977 | 3.368 | n/a | 0.000 | 1.093 | 0.838 | 1.079 | 0.028 | n/a | 0.065 | 11.488 | n/a | n/a | 0.018 | 4.461 | 0.248 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000250 | 17.725 | 3.306 | n/a | 0.000 | 0.907 | 0.796 | 3.848 | 0.026 | n/a | 0.071 | 8.744 | n/a | n/a | 0.027 | 4.213 | 0.238 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000282 | 17.535 | 2.141 | n/a | 0.000 | 0.766 | 0.684 | 1.570 | 0.027 | n/a | 0.107 | 12.207 | n/a | n/a | 0.033 | 2.907 | 0.166 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000222 | 16.145 | 1.914 | n/a | 0.000 | 0.848 | 0.826 | 1.963 | 0.031 | n/a | 0.580 | 9.963 | n/a | n/a | 0.020 | 2.762 | 0.171 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 36d0e4fd06d89551000000000000029a | 15.740 | 1.789 | n/a | 0.000 | 0.222 | 4.243 | 1.370 | 0.021 | n/a | 0.108 | 7.962 | n/a | n/a | 0.024 | 2.011 | 0.128 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000201 | 15.276 | 2.678 | n/a | 0.000 | 0.569 | 0.885 | 1.424 | 0.027 | n/a | 0.113 | 9.555 | n/a | n/a | 0.025 | 3.247 | 0.213 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000001e4 | 14.947 | 4.160 | n/a | 0.000 | 0.351 | 1.845 | 1.755 | 0.031 | n/a | 0.183 | 6.478 | n/a | n/a | 0.145 | 4.511 | 0.302 | 0.145 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000020f | 14.217 | 1.862 | n/a | 0.000 | 0.270 | 0.656 | 1.775 | 0.021 | n/a | 0.399 | 9.210 | n/a | n/a | 0.024 | 2.131 | 0.150 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.067ms |
| 36d0e4fd06d895510000000000000272 | 13.941 | 3.284 | n/a | 0.000 | 0.313 | 0.772 | 1.071 | 0.020 | n/a | 3.842 | 4.589 | n/a | n/a | 0.050 | 3.598 | 0.258 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000000227 | 13.616 | 1.784 | n/a | 0.000 | 0.306 | 0.583 | 0.966 | 0.015 | n/a | 0.346 | 9.599 | n/a | n/a | 0.017 | 2.090 | 0.154 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |

## P2 / L16 / commit (1701 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.739 | 0.287 | 0.000 | 0.494 | 2.186 | n/a | 0.000 | 0.697 | 0.631 | 0.972 | 0.012 | n/a | 0.110 | 5.329 | n/a | n/a | 0.015 | 3.071 | 0.273 | 0.015 |
| p99 | 45.563 | 2.042 | 0.045 | 1.955 | 7.154 | n/a | 0.258 | 11.685 | 7.728 | 9.323 | 0.050 | n/a | 3.192 | 34.743 | n/a | n/a | 0.046 | 15.186 | 0.648 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d89551000000000000034f | 69.479 | 1.163 | n/a | 0.000 | 1.336 | 2.662 | 1.043 | 0.016 | n/a | 0.077 | 63.175 | n/a | n/a | 0.007 | 2.500 | 0.036 | 0.007 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.320ms |
| 36d0e4fd06d895510000000000000354 | 68.483 | 2.088 | n/a | 0.000 | 0.737 | 4.885 | 1.615 | 0.028 | n/a | 0.291 | 58.828 | n/a | n/a | 0.009 | 2.825 | 0.041 | 0.009 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.178ms; driver.publication.persist-deferred 1.081ms; driver.publication.persist-deferred 1.065ms; driver.publication.persist-deferred 0.914ms; driver.publication.persist-deferred 0.894ms |
| 36d0e4fd06d895510000000000000350 | 65.853 | 1.252 | n/a | 0.000 | 0.012 | 3.026 | 0.686 | 0.010 | n/a | 0.208 | 60.654 | n/a | n/a | 0.006 | 1.264 | 0.019 | 0.006 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.320ms |
| 36d0e4fd06d895510000000000000351 | 65.628 | 3.907 | n/a | 0.000 | 1.067 | 3.435 | 1.354 | 0.016 | n/a | 0.098 | 55.740 | n/a | n/a | 0.011 | 4.974 | 0.076 | 0.011 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.320ms; driver.publication.persist-deferred 1.081ms; driver.publication.persist-deferred 0.914ms |
| 36d0e4fd06d8955100000000000009de | 61.373 | 2.170 | n/a | 0.000 | 0.444 | 5.755 | 1.052 | 0.010 | n/a | 0.273 | 51.656 | n/a | n/a | 0.014 | 2.614 | 0.043 | 0.014 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 27.966ms; driver.expected-state.bind-receipt 1.170ms; driver.publication.persist-deferred 1.018ms; driver.publication.persist-deferred 0.941ms; driver.reader-basis.broadcast 0.449ms |
| 36d0e4fd06d895510000000000000353 | 58.703 | 1.903 | n/a | 0.000 | 0.577 | 7.051 | 1.482 | 0.026 | n/a | 0.160 | 47.477 | n/a | n/a | 0.026 | 2.480 | 0.042 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.178ms; driver.publication.persist-deferred 1.081ms; driver.publication.persist-deferred 0.914ms |
| 36d0e4fd06d8955100000000000005f1 | 57.827 | 2.529 | n/a | 0.000 | 0.535 | 0.271 | 0.820 | 0.009 | n/a | 0.744 | 52.913 | n/a | n/a | 0.007 | 3.064 | 0.053 | 0.007 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.229ms; driver.publication.persist-deferred 0.983ms; driver.publication.persist-deferred 0.723ms; driver.reader-basis.broadcast 0.175ms |
| 36d0e4fd06d895510000000000000355 | 57.634 | 2.063 | n/a | 0.000 | 0.366 | 5.482 | 1.557 | 0.027 | n/a | 0.110 | 48.007 | n/a | n/a | 0.022 | 2.429 | 0.042 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.178ms; driver.publication.persist-deferred 1.081ms; driver.publication.persist-deferred 1.065ms; driver.publication.persist-deferred 0.914ms; driver.publication.persist-deferred 0.894ms |
| 36d0e4fd06d8955100000000000003ea | 57.220 | 4.211 | 3.230 | 0.436 | 0.034 | 1.238 | 10.460 | 0.016 | n/a | 0.243 | 37.333 | n/a | n/a | 0.016 | 7.912 | 0.138 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.004ms |
| 36d0e4fd06d8955100000000000009e1 | 55.592 | 1.625 | n/a | 0.000 | 0.586 | 0.513 | 0.981 | 0.013 | n/a | 0.313 | 51.542 | n/a | n/a | 0.017 | 2.211 | 0.040 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 27.966ms; driver.publication.persist-deferred 1.365ms; driver.expected-state.bind-receipt 1.170ms; driver.reader-basis.broadcast 0.449ms |
| 36d0e4fd06d895510000000000000619 | 52.393 | 4.401 | 1.938 | 0.402 | 0.038 | 1.313 | 9.396 | 0.017 | n/a | 0.122 | 34.743 | n/a | n/a | 0.023 | 6.779 | 0.129 | 0.023 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.092ms; driver.publication.persist-deferred 0.912ms |
| 36d0e4fd06d8955100000000000009e3 | 51.049 | 2.059 | n/a | 0.000 | 30.486 | 8.324 | 0.877 | 0.014 | n/a | 0.069 | 9.194 | n/a | n/a | 0.026 | 32.545 | 0.638 | 0.026 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 27.966ms; driver.publication.persist-deferred 1.365ms; driver.expected-state.bind-receipt 1.170ms; driver.publication.persist-deferred 1.015ms; driver.reader-basis.broadcast 0.449ms |
| 36d0e4fd06d895510000000000000405 | 49.133 | 6.318 | n/a | 0.000 | 0.720 | 3.828 | 1.012 | 0.007 | n/a | 0.023 | 37.220 | n/a | n/a | 0.006 | 7.038 | 0.143 | 0.006 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.039ms; driver.publication.persist-deferred 1.119ms; driver.reader-basis.broadcast 0.051ms |
| 36d0e4fd06d895510000000000000511 | 47.619 | 1.978 | n/a | 0.000 | 1.678 | 0.444 | 0.866 | 0.010 | n/a | 0.045 | 42.587 | n/a | n/a | 0.011 | 3.656 | 0.077 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 1.019ms |
| 36d0e4fd06d8955100000000000008a4 | 47.081 | 8.458 | n/a | 0.000 | 0.819 | 5.339 | 0.986 | 0.007 | n/a | 0.025 | 31.408 | n/a | n/a | 0.038 | 9.277 | 0.197 | 0.038 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.186ms; driver.publication.persist-deferred 0.746ms |
| 36d0e4fd06d895510000000000000c08 | 46.370 | 3.250 | n/a | 0.000 | 0.358 | 0.486 | 1.178 | 0.012 | n/a | 0.073 | 41.002 | n/a | n/a | 0.010 | 3.607 | 0.078 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000009e4 | 45.719 | 2.377 | n/a | 0.000 | 22.276 | 8.086 | 0.713 | 0.006 | n/a | 0.016 | 12.240 | n/a | n/a | 0.007 | 24.653 | 0.539 | 0.007 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 21.879ms; driver.publication.persist-deferred 1.365ms; driver.publication.persist-deferred 1.203ms; driver.publication.persist-deferred 1.015ms; driver.reader-basis.broadcast 0.449ms |
| 36d0e4fd06d895510000000000000ac0 | 45.563 | 3.153 | 0.836 | 0.000 | 0.016 | 1.146 | 6.894 | 0.023 | n/a | 0.074 | 33.413 | n/a | n/a | 0.009 | 4.005 | 0.088 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.101ms; driver.publication.persist-deferred 0.776ms; driver.reader-basis.broadcast 0.717ms |
| 36d0e4fd06d8955100000000000009af | 45.427 | 2.296 | n/a | 0.000 | 7.883 | 7.246 | 0.822 | 0.013 | n/a | 2.053 | 25.097 | n/a | n/a | 0.016 | 10.179 | 0.224 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.988ms; driver.expected-state.bind-receipt 1.528ms; driver.publication.persist-deferred 1.126ms; driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 1.071ms |
| 36d0e4fd06d8955100000000000002b9 | 45.185 | 3.774 | 0.282 | 0.268 | 0.042 | 1.171 | 20.210 | 0.087 | n/a | 0.134 | 19.197 | n/a | n/a | 0.020 | 4.366 | 0.097 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (990 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.126 | 0.000 | 0.000 | 0.395 | 1.726 | n/a | 0.000 | 0.725 | 0.616 | 0.834 | 0.012 | n/a | 0.111 | 4.768 | n/a | n/a | 0.015 | 2.557 | 0.264 | 0.015 |
| p99 | 43.963 | 1.945 | 0.020 | 0.942 | 5.491 | n/a | 0.000 | 11.629 | 8.086 | 5.649 | 0.049 | n/a | 3.186 | 32.235 | n/a | n/a | 0.047 | 15.186 | 0.628 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d89551000000000000034f | 69.479 | 1.163 | n/a | 0.000 | 1.336 | 2.662 | 1.043 | 0.016 | n/a | 0.077 | 63.175 | n/a | n/a | 0.007 | 2.500 | 0.036 | 0.007 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.320ms |
| 36d0e4fd06d895510000000000000350 | 65.853 | 1.252 | n/a | 0.000 | 0.012 | 3.026 | 0.686 | 0.010 | n/a | 0.208 | 60.654 | n/a | n/a | 0.006 | 1.264 | 0.019 | 0.006 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.320ms |
| 36d0e4fd06d8955100000000000009de | 61.373 | 2.170 | n/a | 0.000 | 0.444 | 5.755 | 1.052 | 0.010 | n/a | 0.273 | 51.656 | n/a | n/a | 0.014 | 2.614 | 0.043 | 0.014 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 27.966ms; driver.expected-state.bind-receipt 1.170ms; driver.publication.persist-deferred 1.018ms; driver.publication.persist-deferred 0.941ms; driver.reader-basis.broadcast 0.449ms |
| 36d0e4fd06d895510000000000000353 | 58.703 | 1.903 | n/a | 0.000 | 0.577 | 7.051 | 1.482 | 0.026 | n/a | 0.160 | 47.477 | n/a | n/a | 0.026 | 2.480 | 0.042 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.178ms; driver.publication.persist-deferred 1.081ms; driver.publication.persist-deferred 0.914ms |
| 36d0e4fd06d895510000000000000355 | 57.634 | 2.063 | n/a | 0.000 | 0.366 | 5.482 | 1.557 | 0.027 | n/a | 0.110 | 48.007 | n/a | n/a | 0.022 | 2.429 | 0.042 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.178ms; driver.publication.persist-deferred 1.081ms; driver.publication.persist-deferred 1.065ms; driver.publication.persist-deferred 0.914ms; driver.publication.persist-deferred 0.894ms |
| 36d0e4fd06d8955100000000000009e1 | 55.592 | 1.625 | n/a | 0.000 | 0.586 | 0.513 | 0.981 | 0.013 | n/a | 0.313 | 51.542 | n/a | n/a | 0.017 | 2.211 | 0.040 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 27.966ms; driver.publication.persist-deferred 1.365ms; driver.expected-state.bind-receipt 1.170ms; driver.reader-basis.broadcast 0.449ms |
| 36d0e4fd06d895510000000000000511 | 47.619 | 1.978 | n/a | 0.000 | 1.678 | 0.444 | 0.866 | 0.010 | n/a | 0.045 | 42.587 | n/a | n/a | 0.011 | 3.656 | 0.077 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 1.019ms |
| 36d0e4fd06d8955100000000000009e4 | 45.719 | 2.377 | n/a | 0.000 | 22.276 | 8.086 | 0.713 | 0.006 | n/a | 0.016 | 12.240 | n/a | n/a | 0.007 | 24.653 | 0.539 | 0.007 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 21.879ms; driver.publication.persist-deferred 1.365ms; driver.publication.persist-deferred 1.203ms; driver.publication.persist-deferred 1.015ms; driver.reader-basis.broadcast 0.449ms |
| 36d0e4fd06d8955100000000000009af | 45.427 | 2.296 | n/a | 0.000 | 7.883 | 7.246 | 0.822 | 0.013 | n/a | 2.053 | 25.097 | n/a | n/a | 0.016 | 10.179 | 0.224 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.988ms; driver.expected-state.bind-receipt 1.528ms; driver.publication.persist-deferred 1.126ms; driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 1.071ms |
| 36d0e4fd06d8955100000000000003ec | 43.963 | 5.491 | n/a | 0.000 | 11.975 | 1.677 | 11.789 | 0.051 | n/a | 3.569 | 9.385 | n/a | n/a | 0.027 | 17.466 | 0.397 | 0.027 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.095ms; driver.publication.persist-deferred 1.004ms; driver.reader-basis.broadcast 0.049ms |
| 36d0e4fd06d895510000000000000404 | 43.795 | 1.793 | n/a | 0.000 | 0.473 | 2.865 | 0.983 | 0.017 | n/a | 1.083 | 36.561 | n/a | n/a | 0.020 | 2.266 | 0.052 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.119ms; driver.reader-basis.broadcast 0.051ms |
| 36d0e4fd06d8955100000000000003eb | 43.518 | 2.016 | n/a | 0.000 | 0.702 | 0.370 | 4.774 | 0.016 | n/a | 0.054 | 35.572 | n/a | n/a | 0.015 | 2.717 | 0.062 | 0.015 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000008a5 | 42.859 | 7.067 | n/a | 0.000 | 2.306 | 0.533 | 0.907 | 0.015 | n/a | 1.727 | 30.290 | n/a | n/a | 0.016 | 9.373 | 0.219 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.186ms |
| 36d0e4fd06d895510000000000000c5c | 42.073 | 2.953 | n/a | 0.000 | 2.313 | 26.639 | 0.967 | 0.012 | n/a | 0.511 | 8.657 | n/a | n/a | 0.020 | 5.266 | 0.125 | 0.020 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.236ms; client.encode 1.034ms |
| 36d0e4fd06d8955100000000000009e5 | 40.823 | 7.727 | n/a | 0.000 | 11.503 | 3.284 | 0.762 | 0.005 | n/a | 0.018 | 17.520 | n/a | n/a | 0.005 | 19.230 | 0.471 | 0.005 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 11.026ms; driver.publication.persist-deferred 1.365ms; driver.publication.persist-deferred 1.254ms; driver.publication.persist-deferred 1.203ms; driver.publication.persist-deferred 1.015ms |
| 36d0e4fd06d895510000000000000c5d | 39.740 | 5.140 | n/a | 0.000 | 0.863 | 27.424 | 0.688 | 0.004 | n/a | 0.018 | 5.596 | n/a | n/a | 0.007 | 6.003 | 0.151 | 0.007 | node-14/thread-0/socket.wait-first-byte | client.encode 1.034ms; driver.publication.persist-deferred 0.405ms |
| 36d0e4fd06d8955100000000000002c5 | 39.208 | 3.425 | n/a | 0.000 | 1.188 | 0.744 | 1.092 | 0.019 | n/a | 0.455 | 32.235 | n/a | n/a | 0.050 | 4.614 | 0.118 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 36d0e4fd06d89551000000000000064d | 37.533 | 2.591 | n/a | 0.000 | 0.892 | 0.631 | 0.929 | 0.010 | n/a | 0.861 | 31.612 | n/a | n/a | 0.006 | 3.483 | 0.093 | 0.006 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.906ms; driver.publication.persist-deferred 1.036ms |
| 36d0e4fd06d89551000000000000061c | 36.708 | 1.793 | n/a | 0.000 | 1.043 | 1.312 | 0.819 | 0.011 | n/a | 0.087 | 31.628 | n/a | n/a | 0.014 | 2.837 | 0.077 | 0.014 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.912ms |
| 36d0e4fd06d895510000000000000dd6 | 35.280 | 1.689 | n/a | 0.000 | 1.859 | 3.950 | 18.487 | 0.014 | n/a | 0.909 | 8.358 | n/a | n/a | 0.013 | 3.548 | 0.101 | 0.013 | gw-w/thread-44/gateway.request-parse | driver.expected-state.bind-receipt 1.419ms; driver.publication.persist-deferred 1.416ms; driver.publication.persist-deferred 0.962ms; driver.reader-basis.broadcast 0.347ms |

## P2 / L64 / commit (1776 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.393 | 0.145 | 0.000 | 0.493 | 2.182 | n/a | 0.000 | 0.696 | 0.529 | 0.870 | 0.012 | n/a | 0.080 | 4.744 | n/a | n/a | 0.012 | 3.043 | 0.302 | 0.012 |
| p99 | 41.010 | 2.003 | 0.008 | 1.922 | 6.752 | n/a | 0.000 | 10.945 | 7.944 | 6.170 | 0.047 | n/a | 2.210 | 25.260 | n/a | n/a | 0.036 | 13.196 | 0.662 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d89551000000000000105d | 65.316 | 4.469 | 1.956 | 0.000 | 0.029 | 1.172 | 4.900 | 0.014 | n/a | 0.049 | 52.715 | n/a | n/a | 0.013 | 6.454 | 0.099 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 0.939ms; driver.publication.persist-deferred 0.792ms |
| 36d0e4fd06d895510000000000001060 | 62.797 | 2.340 | n/a | 0.000 | 5.424 | 2.355 | 0.522 | 0.004 | n/a | 0.014 | 52.123 | n/a | n/a | 0.016 | 7.764 | 0.124 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 0.939ms |
| 36d0e4fd06d895510000000000001061 | 59.372 | 3.225 | n/a | 0.000 | 0.914 | 1.820 | 0.494 | 0.019 | n/a | 0.930 | 51.966 | n/a | n/a | 0.005 | 4.139 | 0.070 | 0.005 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 0.939ms; driver.publication.persist-deferred 0.792ms |
| 36d0e4fd06d895510000000000001062 | 57.643 | 1.653 | n/a | 0.000 | 2.707 | 2.266 | 0.352 | 0.006 | n/a | 0.125 | 50.516 | n/a | n/a | 0.019 | 4.360 | 0.076 | 0.019 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 0.939ms; driver.publication.persist-deferred 0.792ms |
| 36d0e4fd06d895510000000000001c71 | 52.172 | 2.849 | n/a | 0.000 | 0.506 | 7.778 | 0.344 | 0.004 | n/a | 0.014 | 40.651 | n/a | n/a | 0.026 | 3.355 | 0.064 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.406ms |
| 36d0e4fd06d895510000000000001c72 | 47.848 | 5.091 | n/a | 0.000 | 0.632 | 0.413 | 0.934 | 0.013 | n/a | 0.795 | 39.964 | n/a | n/a | 0.006 | 5.723 | 0.120 | 0.006 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001dc7 | 47.086 | 3.095 | n/a | 0.000 | 0.107 | 0.425 | 0.953 | 0.010 | n/a | 0.051 | 42.418 | n/a | n/a | 0.026 | 3.202 | 0.068 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000190f | 46.615 | 3.152 | n/a | 0.000 | 0.043 | 0.440 | 1.039 | 0.010 | n/a | 0.048 | 41.862 | n/a | n/a | 0.020 | 3.195 | 0.069 | 0.020 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.279ms |
| 36d0e4fd06d89551000000000000129b | 45.595 | 2.931 | 2.740 | 0.000 | 0.033 | 0.984 | 7.978 | 2.887 | n/a | 0.225 | 27.805 | n/a | n/a | 0.011 | 5.704 | 0.125 | 0.011 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.479ms; driver.publication.persist-deferred 1.422ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.084ms |
| 36d0e4fd06d8955100000000000017a6 | 45.257 | 1.680 | n/a | 0.000 | 2.575 | 0.935 | 0.717 | 0.010 | n/a | 0.684 | 38.644 | n/a | n/a | 0.010 | 4.255 | 0.094 | 0.010 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.535ms; driver.publication.persist-deferred 0.945ms |
| 36d0e4fd06d895510000000000001cfd | 44.992 | 4.119 | n/a | 0.000 | 3.541 | 0.361 | 26.518 | 0.006 | n/a | 0.013 | 10.425 | n/a | n/a | 0.010 | 7.660 | 0.170 | 0.010 | gw-w/thread-63/gateway.route | driver.expected-state.bind-receipt 1.233ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.934ms; driver.publication.persist-deferred 0.905ms; driver.publication.persist-deferred 0.596ms |
| 36d0e4fd06d8955100000000000010d1 | 43.929 | 4.126 | n/a | 0.000 | 1.193 | 1.480 | 2.386 | 0.034 | n/a | 0.104 | 34.592 | n/a | n/a | 0.012 | 5.320 | 0.121 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000199c | 43.471 | 2.899 | n/a | 0.000 | 30.857 | 1.682 | 1.588 | 0.038 | n/a | 0.358 | 6.040 | n/a | n/a | 0.010 | 33.756 | 0.777 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.413ms; driver.publication.persist-deferred 1.334ms; driver.publication.persist-deferred 0.934ms; driver.publication.persist-deferred 0.769ms; driver.publication.persist-deferred 0.550ms |
| 36d0e4fd06d895510000000000001cfa | 43.414 | 4.585 | n/a | 0.000 | 4.544 | 0.370 | 0.884 | 0.010 | n/a | 0.366 | 32.640 | n/a | n/a | 0.015 | 9.129 | 0.210 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.755ms; driver.publication.persist-deferred 0.943ms; driver.publication.persist-deferred 0.596ms |
| 36d0e4fd06d895510000000000001999 | 43.297 | 5.045 | n/a | 0.000 | 0.595 | 31.072 | 4.437 | 0.075 | n/a | 0.168 | 1.882 | n/a | n/a | 0.023 | 5.640 | 0.130 | 0.023 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.270ms |
| 36d0e4fd06d895510000000000001154 | 41.367 | 11.122 | n/a | 0.000 | 13.523 | 3.447 | 3.887 | 0.050 | n/a | 0.208 | 9.120 | n/a | n/a | 0.010 | 24.645 | 0.596 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.098ms; driver.publication.persist-deferred 1.090ms; driver.reader-basis.broadcast 0.165ms |
| 36d0e4fd06d8955100000000000012eb | 41.348 | 2.543 | n/a | 0.000 | 0.491 | 2.194 | 1.109 | 0.010 | n/a | 0.335 | 34.653 | n/a | n/a | 0.013 | 3.035 | 0.073 | 0.013 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.446ms |
| 36d0e4fd06d8955100000000000017a8 | 41.010 | 1.339 | n/a | 0.000 | 0.360 | 0.884 | 0.657 | 0.005 | n/a | 0.026 | 37.733 | n/a | n/a | 0.006 | 1.698 | 0.041 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.945ms; driver.publication.persist-deferred 0.796ms |
| 36d0e4fd06d8955100000000000011b6 | 39.321 | 2.163 | n/a | 0.000 | 32.337 | 0.944 | 0.739 | 0.011 | n/a | 0.055 | 3.056 | n/a | n/a | 0.016 | 34.499 | 0.877 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.284ms; driver.ryow-dispatch 1.145ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.939ms; driver.publication.persist-deferred 0.761ms |
| 36d0e4fd06d895510000000000001069 | 39.267 | 1.720 | n/a | 0.000 | 0.719 | 0.529 | 23.915 | 0.019 | n/a | 0.068 | 12.282 | n/a | n/a | 0.015 | 2.439 | 0.062 | 0.015 | gw-w/thread-46/commit.prepare-and-validate | none observed |

## P2 / L64 / commit / 5-10 facts (1060 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.103 | 0.000 | 0.000 | 0.379 | 1.711 | n/a | 0.000 | 0.719 | 0.524 | 0.750 | 0.012 | n/a | 0.082 | 4.305 | n/a | n/a | 0.012 | 2.559 | 0.288 | 0.012 |
| p99 | 38.245 | 1.630 | 0.005 | 0.984 | 5.115 | n/a | 0.000 | 10.392 | 8.216 | 4.183 | 0.045 | n/a | 2.007 | 22.377 | n/a | n/a | 0.034 | 12.582 | 0.664 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d895510000000000001060 | 62.797 | 2.340 | n/a | 0.000 | 5.424 | 2.355 | 0.522 | 0.004 | n/a | 0.014 | 52.123 | n/a | n/a | 0.016 | 7.764 | 0.124 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 0.939ms |
| 36d0e4fd06d895510000000000001061 | 59.372 | 3.225 | n/a | 0.000 | 0.914 | 1.820 | 0.494 | 0.019 | n/a | 0.930 | 51.966 | n/a | n/a | 0.005 | 4.139 | 0.070 | 0.005 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 0.939ms; driver.publication.persist-deferred 0.792ms |
| 36d0e4fd06d895510000000000001062 | 57.643 | 1.653 | n/a | 0.000 | 2.707 | 2.266 | 0.352 | 0.006 | n/a | 0.125 | 50.516 | n/a | n/a | 0.019 | 4.360 | 0.076 | 0.019 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 0.939ms; driver.publication.persist-deferred 0.792ms |
| 36d0e4fd06d895510000000000001c71 | 52.172 | 2.849 | n/a | 0.000 | 0.506 | 7.778 | 0.344 | 0.004 | n/a | 0.014 | 40.651 | n/a | n/a | 0.026 | 3.355 | 0.064 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.406ms |
| 36d0e4fd06d8955100000000000017a6 | 45.257 | 1.680 | n/a | 0.000 | 2.575 | 0.935 | 0.717 | 0.010 | n/a | 0.684 | 38.644 | n/a | n/a | 0.010 | 4.255 | 0.094 | 0.010 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.535ms; driver.publication.persist-deferred 0.945ms |
| 36d0e4fd06d895510000000000001999 | 43.297 | 5.045 | n/a | 0.000 | 0.595 | 31.072 | 4.437 | 0.075 | n/a | 0.168 | 1.882 | n/a | n/a | 0.023 | 5.640 | 0.130 | 0.023 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.270ms |
| 36d0e4fd06d8955100000000000017a8 | 41.010 | 1.339 | n/a | 0.000 | 0.360 | 0.884 | 0.657 | 0.005 | n/a | 0.026 | 37.733 | n/a | n/a | 0.006 | 1.698 | 0.041 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.945ms; driver.publication.persist-deferred 0.796ms |
| 36d0e4fd06d8955100000000000011b6 | 39.321 | 2.163 | n/a | 0.000 | 32.337 | 0.944 | 0.739 | 0.011 | n/a | 0.055 | 3.056 | n/a | n/a | 0.016 | 34.499 | 0.877 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.284ms; driver.ryow-dispatch 1.145ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.939ms; driver.publication.persist-deferred 0.761ms |
| 36d0e4fd06d895510000000000001069 | 39.267 | 1.720 | n/a | 0.000 | 0.719 | 0.529 | 23.915 | 0.019 | n/a | 0.068 | 12.282 | n/a | n/a | 0.015 | 2.439 | 0.062 | 0.015 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| 36d0e4fd06d8955100000000000012ec | 38.657 | 1.239 | n/a | 0.000 | 0.245 | 4.571 | 0.493 | 0.008 | n/a | 0.148 | 31.946 | n/a | n/a | 0.009 | 1.483 | 0.038 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.740ms |
| 36d0e4fd06d895510000000000001657 | 38.245 | 4.498 | n/a | 0.000 | 0.361 | 17.994 | 2.874 | 0.035 | n/a | 0.845 | 11.633 | n/a | n/a | 0.005 | 4.859 | 0.127 | 0.005 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.263ms; driver.publication.persist-deferred 1.034ms; driver.publication.persist-deferred 0.978ms; driver.publication.persist-deferred 0.881ms; driver.publication.persist-deferred 0.811ms |
| 36d0e4fd06d89551000000000000199b | 35.802 | 2.184 | n/a | 0.000 | 1.358 | 24.045 | 0.707 | 0.010 | n/a | 0.132 | 7.359 | n/a | n/a | 0.007 | 3.542 | 0.099 | 0.007 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.270ms |
| 36d0e4fd06d8955100000000000011b4 | 35.487 | 6.538 | n/a | 0.000 | 0.419 | 8.652 | 6.066 | 0.043 | n/a | 1.885 | 11.862 | n/a | n/a | 0.023 | 6.957 | 0.196 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.284ms; driver.ryow-dispatch 1.145ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.761ms; driver.publication.persist-deferred 0.340ms |
| 36d0e4fd06d89551000000000000133c | 34.828 | 2.053 | n/a | 0.000 | 14.342 | 1.780 | 5.804 | 0.014 | n/a | 0.638 | 10.181 | n/a | n/a | 0.015 | 16.395 | 0.471 | 0.015 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 1.166ms |
| 36d0e4fd06d89551000000000000199d | 33.651 | 1.574 | n/a | 0.000 | 0.293 | 22.951 | 0.390 | 0.008 | n/a | 0.158 | 8.273 | n/a | n/a | 0.005 | 1.867 | 0.055 | 0.005 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.270ms |
| 36d0e4fd06d895510000000000001559 | 31.171 | 1.862 | n/a | 0.000 | 17.589 | 4.139 | 0.643 | 0.012 | n/a | 0.182 | 6.736 | n/a | n/a | 0.009 | 19.451 | 0.624 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.191ms; driver.publication.persist-deferred 1.437ms; driver.publication.persist-deferred 1.287ms; driver.publication.persist-deferred 0.959ms |
| 36d0e4fd06d8955100000000000017e0 | 31.144 | 1.620 | n/a | 0.000 | 0.372 | 3.235 | 21.862 | 0.032 | n/a | 0.068 | 3.934 | n/a | n/a | 0.022 | 1.991 | 0.064 | 0.022 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| 36d0e4fd06d8955100000000000010da | 30.821 | 1.143 | n/a | 0.000 | 1.335 | 2.351 | 0.483 | 0.006 | n/a | 0.013 | 25.484 | n/a | n/a | 0.008 | 2.478 | 0.080 | 0.008 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.097ms; driver.publication.persist-deferred 0.913ms; driver.reader-basis.broadcast 0.237ms |
| 36d0e4fd06d8955100000000000011e8 | 29.509 | 4.999 | n/a | 0.000 | 1.020 | 4.652 | 6.103 | 0.076 | n/a | 0.226 | 12.424 | n/a | n/a | 0.008 | 6.019 | 0.204 | 0.008 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.215ms; driver.reader-basis.broadcast 0.190ms |
| 36d0e4fd06d89551000000000000170a | 29.467 | 3.709 | n/a | 0.000 | 8.188 | 2.884 | 0.656 | 0.011 | n/a | 0.033 | 13.948 | n/a | n/a | 0.038 | 11.896 | 0.404 | 0.038 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.989ms; driver.publication.persist-deferred 2.218ms; driver.publication.persist-deferred 0.958ms |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.782 | 0.000 | 0.000 | 0.407 | 3.046 | n/a | 0.000 | 0.122 | 0.857 | 1.798 | 0.021 | n/a | 0.098 | 6.377 | n/a | n/a | 0.021 | 3.509 | 0.265 | 0.021 |
| p99 | 54.784 | 2.007 | 0.000 | 1.813 | 5.246 | n/a | 0.000 | 1.363 | 3.658 | 10.473 | 0.081 | n/a | 11.780 | 40.401 | n/a | n/a | 0.050 | 5.712 | 0.438 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d895510000000000001e61 | 54.784 | 3.712 | 0.219 | 0.000 | 0.039 | 1.421 | 8.646 | 0.029 | n/a | 0.304 | 40.401 | n/a | n/a | 0.012 | 3.970 | 0.072 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e45 | 25.788 | 4.373 | 0.211 | 0.000 | 0.092 | 1.358 | 6.329 | 0.020 | n/a | 0.081 | 13.297 | n/a | n/a | 0.029 | 4.675 | 0.181 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ddb | 25.384 | 2.715 | n/a | 0.000 | 0.580 | 0.681 | 7.206 | 0.017 | n/a | 0.041 | 14.118 | n/a | n/a | 0.026 | 3.295 | 0.130 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.671ms |
| 36d0e4fd06d895510000000000001dcf | 24.516 | 4.983 | 0.205 | 0.000 | 0.035 | 1.788 | 8.038 | 0.048 | n/a | 0.077 | 9.323 | n/a | n/a | 0.019 | 5.222 | 0.213 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e6f | 24.425 | 2.892 | 0.180 | 0.000 | 0.034 | 1.078 | 9.464 | 0.025 | n/a | 0.104 | 10.632 | n/a | n/a | 0.015 | 3.107 | 0.127 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e66 | 23.704 | 1.861 | n/a | 0.000 | 0.546 | 0.396 | 0.796 | 0.013 | n/a | 11.780 | 8.290 | n/a | n/a | 0.023 | 2.407 | 0.102 | 0.023 | gw-w/thread-64/d/transact-async | driver.reader-basis.broadcast 0.288ms |
| 36d0e4fd06d895510000000000001e63 | 23.671 | 3.823 | 0.348 | 0.000 | 0.054 | 1.854 | 6.322 | 0.041 | n/a | 0.129 | 11.078 | n/a | n/a | 0.022 | 4.225 | 0.178 | 0.022 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e4b | 23.388 | 3.461 | 0.185 | 0.000 | 0.049 | 1.435 | 9.376 | 0.039 | n/a | 0.145 | 8.676 | n/a | n/a | 0.021 | 3.695 | 0.158 | 0.021 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e0b | 23.024 | 2.857 | 1.133 | 0.000 | 0.026 | 1.076 | 10.473 | 0.034 | n/a | 0.436 | 6.973 | n/a | n/a | 0.016 | 4.016 | 0.174 | 0.016 | gw-w/thread-63/gateway.admitted-work | none observed |
| 36d0e4fd06d895510000000000001de1 | 22.202 | 3.555 | 0.251 | 0.000 | 0.041 | 1.439 | 8.858 | 0.037 | n/a | 0.105 | 7.899 | n/a | n/a | 0.018 | 3.847 | 0.173 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e15 | 21.961 | 3.234 | 0.247 | 0.000 | 0.029 | 3.658 | 6.598 | 0.018 | n/a | 0.054 | 8.112 | n/a | n/a | 0.011 | 3.509 | 0.160 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e3f | 19.860 | 4.466 | 0.335 | 0.000 | 0.046 | 1.520 | 5.235 | 0.022 | n/a | 0.085 | 8.130 | n/a | n/a | 0.021 | 4.846 | 0.244 | 0.021 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001dd4 | 19.511 | 4.584 | 0.238 | 0.000 | 0.086 | 1.259 | 4.630 | 0.023 | n/a | 0.261 | 8.399 | n/a | n/a | 0.031 | 4.908 | 0.252 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e41 | 19.401 | 5.030 | 0.317 | 0.000 | 0.048 | 2.056 | 1.853 | 0.030 | n/a | 0.101 | 9.944 | n/a | n/a | 0.023 | 5.395 | 0.278 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001de7 | 19.388 | 2.918 | n/a | 0.000 | 0.910 | 1.119 | 2.370 | 0.040 | n/a | 0.279 | 11.726 | n/a | n/a | 0.026 | 3.828 | 0.197 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e25 | 19.383 | 3.445 | 2.183 | 0.000 | 0.084 | 1.357 | 4.841 | 0.017 | n/a | 0.058 | 7.372 | n/a | n/a | 0.026 | 5.712 | 0.295 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001dff | 19.344 | 4.864 | 0.272 | 0.000 | 0.122 | 1.921 | 3.501 | 0.052 | n/a | 0.156 | 8.416 | n/a | n/a | 0.040 | 5.258 | 0.272 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e0f | 19.266 | 3.357 | 0.251 | 0.000 | 0.046 | 1.334 | 8.056 | 0.046 | n/a | 0.121 | 6.034 | n/a | n/a | 0.021 | 3.654 | 0.190 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e2b | 19.198 | 4.283 | 0.165 | 0.000 | 0.049 | 1.377 | 8.225 | 0.023 | n/a | 0.303 | 4.754 | n/a | n/a | 0.020 | 4.496 | 0.234 | 0.020 | gw-w/thread-63/gateway.admitted-work | none observed |
| 36d0e4fd06d895510000000000001dd8 | 18.807 | 4.526 | 0.209 | 0.000 | 0.039 | 1.406 | 4.847 | 0.018 | n/a | 0.052 | 7.693 | n/a | n/a | 0.017 | 4.774 | 0.254 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.884 | 0.000 | 0.000 | 0.452 | 2.343 | n/a | 0.000 | 0.580 | 0.597 | 1.045 | 0.017 | n/a | 0.087 | 5.730 | n/a | n/a | 0.021 | 2.960 | 0.269 | 0.021 |
| p99 | 25.384 | 1.465 | 0.000 | 1.284 | 3.875 | n/a | 0.000 | 1.363 | 1.067 | 7.206 | 0.055 | n/a | 11.780 | 14.118 | n/a | n/a | 0.050 | 4.524 | 0.438 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d895510000000000001ddb | 25.384 | 2.715 | n/a | 0.000 | 0.580 | 0.681 | 7.206 | 0.017 | n/a | 0.041 | 14.118 | n/a | n/a | 0.026 | 3.295 | 0.130 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.671ms |
| 36d0e4fd06d895510000000000001e66 | 23.704 | 1.861 | n/a | 0.000 | 0.546 | 0.396 | 0.796 | 0.013 | n/a | 11.780 | 8.290 | n/a | n/a | 0.023 | 2.407 | 0.102 | 0.023 | gw-w/thread-64/d/transact-async | driver.reader-basis.broadcast 0.288ms |
| 36d0e4fd06d895510000000000001e1b | 17.090 | 3.320 | n/a | 0.000 | 0.306 | 0.842 | 1.737 | 0.028 | n/a | 0.624 | 10.198 | n/a | n/a | 0.035 | 3.626 | 0.212 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e64 | 16.142 | 1.759 | n/a | 0.000 | 0.070 | 0.733 | 0.828 | 0.014 | n/a | 0.098 | 12.622 | n/a | n/a | 0.018 | 1.829 | 0.113 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.292ms |
| 36d0e4fd06d895510000000000001e30 | 14.959 | 3.191 | n/a | 0.000 | 0.221 | 0.821 | 1.359 | 0.044 | n/a | 0.532 | 8.750 | n/a | n/a | 0.040 | 3.413 | 0.228 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e47 | 14.827 | 2.422 | n/a | 0.000 | 0.846 | 0.587 | 1.136 | 0.022 | n/a | 0.368 | 9.423 | n/a | n/a | 0.022 | 3.268 | 0.220 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e53 | 14.149 | 3.875 | n/a | 0.000 | 0.649 | 0.902 | 1.149 | 0.021 | n/a | 0.090 | 7.420 | n/a | n/a | 0.042 | 4.524 | 0.320 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001df8 | 13.574 | 2.898 | n/a | 0.000 | 0.211 | 0.755 | 1.088 | 0.021 | n/a | 0.165 | 8.409 | n/a | n/a | 0.027 | 3.109 | 0.229 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e80 | 13.085 | 2.136 | n/a | 0.000 | 0.823 | 0.730 | 3.392 | 0.023 | n/a | 0.074 | 5.885 | n/a | n/a | 0.021 | 2.960 | 0.226 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e56 | 12.660 | 2.464 | n/a | 0.000 | 0.909 | 0.539 | 0.954 | 0.012 | n/a | 0.058 | 7.703 | n/a | n/a | 0.020 | 3.373 | 0.266 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e0c | 12.523 | 2.418 | n/a | 0.000 | 0.331 | 1.067 | 1.958 | 0.055 | n/a | 0.128 | 6.545 | n/a | n/a | 0.021 | 2.749 | 0.220 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e3b | 12.430 | 2.608 | n/a | 0.000 | 0.324 | 0.801 | 1.045 | 0.021 | n/a | 0.084 | 7.519 | n/a | n/a | 0.027 | 2.932 | 0.236 | 0.027 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e06 | 12.311 | 2.391 | n/a | 0.000 | 0.691 | 0.597 | 1.506 | 0.022 | n/a | 0.087 | 6.991 | n/a | n/a | 0.026 | 3.083 | 0.250 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001dee | 12.083 | 3.159 | n/a | 0.000 | 1.363 | 0.678 | 0.876 | 0.013 | n/a | 0.237 | 5.730 | n/a | n/a | 0.028 | 4.522 | 0.374 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.859ms |
| 36d0e4fd06d895510000000000001dcd | 11.744 | 2.824 | n/a | 0.000 | 0.969 | 0.604 | 2.021 | 0.028 | n/a | 0.118 | 5.130 | n/a | n/a | 0.050 | 3.793 | 0.323 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e1e | 11.181 | 2.025 | n/a | 0.000 | 0.223 | 0.601 | 0.829 | 0.015 | n/a | 0.289 | 7.182 | n/a | n/a | 0.018 | 2.248 | 0.201 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e6d | 11.084 | 2.266 | n/a | 0.000 | 0.867 | 0.663 | 1.485 | 0.018 | n/a | 0.300 | 5.465 | n/a | n/a | 0.020 | 3.133 | 0.283 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001de2 | 10.884 | 1.911 | n/a | 0.000 | 1.011 | 0.462 | 0.817 | 0.013 | n/a | 0.043 | 6.609 | n/a | n/a | 0.017 | 2.922 | 0.269 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ddf | 10.840 | 1.994 | n/a | 0.000 | 0.805 | 0.482 | 0.828 | 0.013 | n/a | 0.057 | 6.643 | n/a | n/a | 0.019 | 2.799 | 0.258 | 0.019 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001dd6 | 10.621 | 2.670 | n/a | 0.000 | 0.751 | 0.552 | 0.982 | 0.016 | n/a | 0.056 | 5.557 | n/a | n/a | 0.038 | 3.420 | 0.322 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.951 | 0.000 | 0.000 | 0.393 | 3.069 | n/a | 0.000 | 0.128 | 0.780 | 1.538 | 0.022 | n/a | 0.085 | 6.894 | n/a | n/a | 0.021 | 3.444 | 0.227 | 0.021 |
| p99 | 65.650 | 2.002 | 0.000 | 1.664 | 5.817 | n/a | 0.000 | 1.531 | 4.580 | 33.792 | 0.463 | n/a | 3.587 | 44.544 | n/a | n/a | 0.071 | 6.271 | 0.408 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d895510000000000001ea4 | 65.650 | 4.177 | n/a | 0.000 | 0.257 | 1.816 | 14.702 | 0.038 | n/a | 0.095 | 44.544 | n/a | n/a | 0.021 | 4.434 | 0.068 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.873ms |
| 36d0e4fd06d895510000000000001f4b | 48.133 | 3.916 | 0.299 | 0.000 | 0.131 | 1.286 | 33.792 | 0.019 | n/a | 0.063 | 8.587 | n/a | n/a | 0.041 | 4.346 | 0.090 | 0.041 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.915ms |
| 36d0e4fd06d895510000000000001e9b | 39.669 | 3.721 | n/a | 0.000 | 0.678 | 0.662 | 0.926 | 0.013 | n/a | 0.351 | 33.293 | n/a | n/a | 0.025 | 4.399 | 0.111 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.341ms |
| 36d0e4fd06d895510000000000001ea6 | 33.698 | 3.141 | n/a | 0.000 | 0.853 | 0.509 | 1.177 | 0.013 | n/a | 0.322 | 27.657 | n/a | n/a | 0.025 | 3.994 | 0.119 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ea5 | 32.395 | 3.846 | 0.225 | 0.000 | 0.031 | 1.006 | 6.279 | 0.020 | n/a | 0.301 | 20.674 | n/a | n/a | 0.013 | 4.102 | 0.127 | 0.013 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001eda | 28.189 | 3.555 | 0.212 | 0.000 | 0.046 | 1.862 | 11.227 | 0.034 | n/a | 0.091 | 11.139 | n/a | n/a | 0.023 | 3.813 | 0.135 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ea0 | 28.175 | 3.929 | 0.289 | 0.000 | 0.073 | 1.371 | 8.174 | 0.026 | n/a | 0.094 | 14.198 | n/a | n/a | 0.022 | 4.290 | 0.152 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ee6 | 26.818 | 5.330 | 0.352 | 0.000 | 0.054 | 0.774 | 4.471 | 0.018 | n/a | 0.042 | 15.753 | n/a | n/a | 0.023 | 5.736 | 0.214 | 0.023 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001f27 | 25.690 | 4.850 | 0.370 | 0.000 | 0.047 | 2.493 | 4.738 | 0.045 | n/a | 0.154 | 12.970 | n/a | n/a | 0.024 | 5.267 | 0.205 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.462ms |
| 36d0e4fd06d895510000000000001f15 | 24.332 | 3.157 | 0.199 | 0.000 | 0.047 | 1.383 | 8.683 | 0.035 | n/a | 0.083 | 10.722 | n/a | n/a | 0.023 | 3.403 | 0.140 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.381ms |
| 36d0e4fd06d895510000000000001e99 | 24.296 | 3.713 | n/a | 0.000 | 0.839 | 1.178 | 1.538 | 0.019 | n/a | 0.263 | 16.719 | n/a | n/a | 0.027 | 4.552 | 0.187 | 0.027 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001f35 | 22.938 | 3.364 | 0.289 | 0.000 | 0.046 | 1.095 | 5.011 | 0.022 | n/a | 0.054 | 13.028 | n/a | n/a | 0.028 | 3.699 | 0.161 | 0.028 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.399ms |
| 36d0e4fd06d895510000000000001e98 | 22.714 | 2.717 | 0.153 | 0.000 | 0.035 | 4.580 | 7.875 | 0.017 | n/a | 0.050 | 7.274 | n/a | n/a | 0.013 | 2.905 | 0.128 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ec9 | 22.160 | 3.267 | 0.256 | 0.000 | 0.138 | 1.278 | 8.712 | 0.047 | n/a | 3.587 | 4.805 | n/a | n/a | 0.069 | 3.661 | 0.165 | 0.069 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.874ms |
| 36d0e4fd06d895510000000000001f2b | 21.608 | 4.455 | 0.194 | 0.000 | 0.051 | 4.578 | 4.078 | 0.023 | n/a | 0.066 | 8.141 | n/a | n/a | 0.022 | 4.700 | 0.218 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.491ms |
| 36d0e4fd06d895510000000000001eef | 21.435 | 3.185 | 0.183 | 0.000 | 0.053 | 1.082 | 5.472 | 0.025 | n/a | 0.058 | 11.352 | n/a | n/a | 0.024 | 3.421 | 0.160 | 0.024 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ec7 | 21.092 | 3.014 | 0.176 | 0.000 | 0.032 | 1.507 | 4.856 | 0.019 | n/a | 0.059 | 11.415 | n/a | n/a | 0.013 | 3.222 | 0.153 | 0.013 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.334ms |
| 36d0e4fd06d895510000000000001f33 | 20.971 | 4.233 | 0.208 | 0.000 | 0.054 | 1.529 | 5.912 | 0.022 | n/a | 0.339 | 8.650 | n/a | n/a | 0.024 | 4.495 | 0.214 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.389ms |
| 36d0e4fd06d895510000000000001f39 | 20.910 | 5.817 | 0.396 | 0.000 | 0.057 | 1.684 | 3.426 | 0.029 | n/a | 0.301 | 9.174 | n/a | n/a | 0.025 | 6.271 | 0.300 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.406ms |
| 36d0e4fd06d895510000000000001edc | 20.613 | 3.118 | n/a | 0.000 | 0.713 | 0.738 | 1.062 | 0.016 | n/a | 0.078 | 14.854 | n/a | n/a | 0.035 | 3.830 | 0.186 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.563ms |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.446 | 0.000 | 0.000 | 0.424 | 2.143 | n/a | 0.000 | 0.318 | 0.712 | 1.187 | 0.021 | n/a | 0.099 | 5.779 | n/a | n/a | 0.020 | 2.638 | 0.226 | 0.020 |
| p99 | 65.650 | 2.002 | 0.000 | 1.664 | 4.887 | n/a | 0.000 | 1.531 | 3.771 | 14.702 | 0.054 | n/a | 0.642 | 44.544 | n/a | n/a | 0.052 | 5.514 | 0.405 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d895510000000000001ea4 | 65.650 | 4.177 | n/a | 0.000 | 0.257 | 1.816 | 14.702 | 0.038 | n/a | 0.095 | 44.544 | n/a | n/a | 0.021 | 4.434 | 0.068 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.873ms |
| 36d0e4fd06d895510000000000001e99 | 24.296 | 3.713 | n/a | 0.000 | 0.839 | 1.178 | 1.538 | 0.019 | n/a | 0.263 | 16.719 | n/a | n/a | 0.027 | 4.552 | 0.187 | 0.027 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001edc | 20.613 | 3.118 | n/a | 0.000 | 0.713 | 0.738 | 1.062 | 0.016 | n/a | 0.078 | 14.854 | n/a | n/a | 0.035 | 3.830 | 0.186 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.563ms |
| 36d0e4fd06d895510000000000001eb5 | 19.590 | 1.968 | n/a | 0.000 | 0.126 | 0.773 | 1.526 | 0.031 | n/a | 0.099 | 15.043 | n/a | n/a | 0.024 | 2.094 | 0.107 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ecd | 19.052 | 4.887 | n/a | 0.000 | 0.627 | 1.971 | 8.939 | 0.054 | n/a | 0.195 | 2.359 | n/a | n/a | 0.020 | 5.514 | 0.289 | 0.020 | gw-w/thread-40/gateway.admitted-work | none observed |
| 36d0e4fd06d895510000000000001ecf | 17.318 | 1.805 | n/a | 0.000 | 0.116 | 0.914 | 2.248 | 0.041 | n/a | 0.160 | 12.009 | n/a | n/a | 0.025 | 1.921 | 0.111 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001e8d | 16.859 | 3.955 | n/a | 0.000 | 1.084 | 0.920 | 1.140 | 0.022 | n/a | 0.127 | 9.560 | n/a | n/a | 0.052 | 5.038 | 0.299 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ed2 | 16.044 | 2.143 | n/a | 0.000 | 0.600 | 0.722 | 1.469 | 0.033 | n/a | 0.085 | 10.967 | n/a | n/a | 0.025 | 2.744 | 0.171 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.320ms |
| 36d0e4fd06d895510000000000001f36 | 13.905 | 2.585 | n/a | 0.000 | 0.135 | 0.712 | 1.259 | 0.021 | n/a | 0.077 | 9.092 | n/a | n/a | 0.024 | 2.719 | 0.196 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ee1 | 13.813 | 3.223 | n/a | 0.000 | 0.788 | 0.443 | 1.020 | 0.012 | n/a | 0.053 | 8.240 | n/a | n/a | 0.035 | 4.011 | 0.290 | 0.035 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001eca | 13.784 | 2.159 | n/a | 0.000 | 0.609 | 0.523 | 1.323 | 0.018 | n/a | 0.365 | 8.769 | n/a | n/a | 0.020 | 2.768 | 0.201 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ed5 | 13.774 | 2.470 | n/a | 0.000 | 0.176 | 1.020 | 2.123 | 0.040 | n/a | 0.158 | 7.750 | n/a | n/a | 0.037 | 2.646 | 0.192 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ec1 | 12.330 | 2.338 | n/a | 0.000 | 1.039 | 0.718 | 1.399 | 0.023 | n/a | 0.097 | 6.694 | n/a | n/a | 0.022 | 3.376 | 0.274 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001ebb | 12.137 | 1.548 | n/a | 0.000 | 0.336 | 0.742 | 1.149 | 0.023 | n/a | 0.466 | 7.858 | n/a | n/a | 0.015 | 1.884 | 0.155 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001f21 | 11.647 | 1.429 | n/a | 0.000 | 1.209 | 3.041 | 0.460 | 0.012 | n/a | 0.583 | 4.908 | n/a | n/a | 0.005 | 2.638 | 0.226 | 0.005 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.037ms |
| 36d0e4fd06d895510000000000001e90 | 11.635 | 1.919 | n/a | 0.000 | 1.531 | 0.717 | 1.703 | 0.025 | n/a | 0.122 | 5.600 | n/a | n/a | 0.018 | 3.450 | 0.297 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.454ms |
| 36d0e4fd06d895510000000000001eac | 11.465 | 2.810 | n/a | 0.000 | 1.173 | 0.460 | 0.854 | 0.015 | n/a | 0.337 | 5.779 | n/a | n/a | 0.038 | 3.982 | 0.347 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001edf | 11.446 | 1.719 | n/a | 0.000 | 0.247 | 0.406 | 1.183 | 0.015 | n/a | 0.069 | 7.790 | n/a | n/a | 0.018 | 1.966 | 0.172 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001f28 | 11.292 | 2.194 | n/a | 0.000 | 0.253 | 0.710 | 1.111 | 0.024 | n/a | 0.082 | 6.890 | n/a | n/a | 0.029 | 2.447 | 0.217 | 0.029 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001f3a | 11.160 | 2.174 | n/a | 0.000 | 0.531 | 0.490 | 0.806 | 0.014 | n/a | 0.046 | 7.084 | n/a | n/a | 0.015 | 2.706 | 0.242 | 0.015 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (366 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.788 | 0.000 | 0.000 | 0.447 | 3.128 | n/a | 0.000 | 0.142 | 0.746 | 1.499 | 0.020 | n/a | 0.092 | 5.859 | n/a | n/a | 0.021 | 3.614 | 0.284 | 0.021 |
| p99 | 48.514 | 2.008 | 0.000 | 1.713 | 7.631 | n/a | 0.484 | 1.345 | 4.345 | 15.197 | 0.054 | n/a | 2.277 | 42.925 | n/a | n/a | 0.061 | 8.012 | 0.501 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d895510000000000002217 | 77.375 | 3.005 | 0.153 | 0.000 | 0.028 | 0.757 | 20.566 | 0.017 | n/a | 0.043 | 52.784 | n/a | n/a | 0.021 | 3.187 | 0.041 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.375ms |
| 36d0e4fd06d895510000000000002127 | 60.794 | 4.935 | 0.325 | 0.488 | 0.059 | 1.359 | 1.456 | 0.023 | n/a | 0.091 | 52.041 | n/a | n/a | 0.017 | 5.807 | 0.096 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001f80 | 54.629 | 4.400 | n/a | 0.000 | 0.472 | 1.083 | 2.608 | 0.025 | n/a | 0.272 | 45.728 | n/a | n/a | 0.041 | 4.872 | 0.089 | 0.041 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.381ms |
| 36d0e4fd06d89551000000000000204d | 48.514 | 3.029 | 0.248 | 0.000 | 0.025 | 0.692 | 1.268 | 0.017 | n/a | 0.297 | 42.925 | n/a | n/a | 0.013 | 3.302 | 0.068 | 0.013 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000021ba | 40.909 | 4.395 | 0.257 | 0.000 | 0.093 | 1.311 | 25.386 | 0.018 | n/a | 0.043 | 9.374 | n/a | n/a | 0.032 | 4.744 | 0.116 | 0.032 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.589ms |
| 36d0e4fd06d895510000000000002042 | 34.251 | 2.873 | n/a | 0.000 | 0.931 | 0.537 | 23.687 | 0.030 | n/a | 0.058 | 6.121 | n/a | n/a | 0.014 | 3.804 | 0.111 | 0.014 | gw-w/thread-43/commit.prepare-and-validate | driver.reader-basis.broadcast 0.316ms |
| 36d0e4fd06d895510000000000001fc8 | 30.517 | 4.967 | 0.354 | 0.000 | 0.146 | 2.208 | 12.575 | 0.043 | n/a | 0.230 | 9.950 | n/a | n/a | 0.044 | 5.467 | 0.179 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001fed | 30.295 | 2.861 | 0.170 | 0.000 | 0.037 | 6.801 | 9.209 | 0.024 | n/a | 0.068 | 11.106 | n/a | n/a | 0.019 | 3.069 | 0.101 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000002056 | 29.915 | 3.847 | 0.345 | 0.000 | 0.058 | 5.225 | 12.923 | 0.034 | n/a | 0.087 | 7.375 | n/a | n/a | 0.020 | 4.250 | 0.142 | 0.020 | gw-w/thread-45/gateway.admitted-work | none observed |
| 36d0e4fd06d895510000000000001f6b | 28.708 | 3.084 | 0.152 | 0.000 | 0.035 | 0.832 | 15.197 | 0.028 | n/a | 0.145 | 9.219 | n/a | n/a | 0.016 | 3.271 | 0.114 | 0.016 | gw-w/thread-63/gateway.admitted-work | driver.reader-basis.broadcast 0.345ms |
| 36d0e4fd06d89551000000000000208e | 26.472 | 4.643 | 0.358 | 0.000 | 0.054 | 1.947 | 3.364 | 0.044 | n/a | 0.685 | 15.357 | n/a | n/a | 0.021 | 5.055 | 0.191 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000020ef | 26.423 | 4.217 | 0.220 | 0.000 | 0.111 | 1.067 | 5.797 | 0.035 | n/a | 0.090 | 14.859 | n/a | n/a | 0.028 | 4.548 | 0.172 | 0.028 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000021df | 25.661 | 4.717 | 0.288 | 0.000 | 0.038 | 1.625 | 9.981 | 0.021 | n/a | 0.259 | 8.716 | n/a | n/a | 0.016 | 5.042 | 0.196 | 0.016 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.325ms |
| 36d0e4fd06d8955100000000000021e9 | 25.622 | 4.042 | 0.165 | 0.000 | 0.046 | 1.479 | 6.236 | 0.031 | n/a | 0.397 | 13.206 | n/a | n/a | 0.019 | 4.254 | 0.166 | 0.019 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.658ms; driver.reader-basis.broadcast 0.390ms |
| 36d0e4fd06d8955100000000000020c9 | 25.575 | 3.189 | 0.158 | 0.000 | 0.034 | 1.976 | 8.754 | 0.025 | n/a | 0.091 | 11.333 | n/a | n/a | 0.015 | 3.382 | 0.132 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001fb2 | 24.815 | 4.247 | 0.212 | 0.000 | 0.047 | 4.345 | 4.417 | 0.019 | n/a | 3.727 | 7.780 | n/a | n/a | 0.023 | 4.506 | 0.182 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000203b | 24.719 | 2.907 | 0.223 | 0.000 | 0.042 | 5.115 | 8.646 | 0.017 | n/a | 0.118 | 7.637 | n/a | n/a | 0.015 | 3.172 | 0.128 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001fe7 | 24.293 | 4.953 | 0.277 | 0.000 | 0.028 | 1.139 | 7.252 | 0.026 | n/a | 0.412 | 10.193 | n/a | n/a | 0.014 | 5.258 | 0.216 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000002166 | 24.228 | 8.646 | n/a | 0.000 | 0.805 | 1.747 | 1.730 | 0.018 | n/a | 0.412 | 10.830 | n/a | n/a | 0.039 | 9.451 | 0.390 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000002207 | 23.810 | 3.345 | 1.200 | 0.000 | 0.042 | 1.057 | 4.612 | 0.019 | n/a | 0.041 | 13.469 | n/a | n/a | 0.026 | 4.587 | 0.193 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.370ms |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.790 | 0.000 | 0.000 | 0.448 | 2.227 | n/a | 0.000 | 0.568 | 0.612 | 1.137 | 0.018 | n/a | 0.095 | 5.221 | n/a | n/a | 0.023 | 2.926 | 0.275 | 0.023 |
| p99 | 20.341 | 1.785 | 0.000 | 1.180 | 4.813 | n/a | 0.000 | 1.345 | 1.519 | 3.758 | 0.048 | n/a | 0.906 | 16.974 | n/a | n/a | 0.087 | 5.622 | 0.462 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 36d0e4fd06d895510000000000001f80 | 54.629 | 4.400 | n/a | 0.000 | 0.472 | 1.083 | 2.608 | 0.025 | n/a | 0.272 | 45.728 | n/a | n/a | 0.041 | 4.872 | 0.089 | 0.041 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.381ms |
| 36d0e4fd06d895510000000000002073 | 20.341 | 1.482 | n/a | 0.000 | 0.429 | 0.403 | 0.951 | 0.014 | n/a | 0.074 | 16.974 | n/a | n/a | 0.013 | 1.911 | 0.094 | 0.013 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001f81 | 19.964 | 1.754 | n/a | 0.000 | 0.375 | 0.466 | 1.169 | 0.017 | n/a | 0.149 | 16.016 | n/a | n/a | 0.018 | 2.129 | 0.107 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001f70 | 17.862 | 3.140 | n/a | 0.000 | 0.821 | 1.097 | 2.342 | 0.048 | n/a | 0.216 | 10.170 | n/a | n/a | 0.029 | 3.960 | 0.222 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.316ms |
| 36d0e4fd06d895510000000000001fa9 | 17.634 | 2.822 | n/a | 0.000 | 0.029 | 0.676 | 0.716 | 0.011 | n/a | 0.073 | 13.294 | n/a | n/a | 0.014 | 2.850 | 0.162 | 0.014 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000002134 | 16.623 | 3.000 | n/a | 0.000 | 0.154 | 0.479 | 0.806 | 0.017 | n/a | 0.090 | 12.034 | n/a | n/a | 0.043 | 3.154 | 0.190 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000002195 | 16.226 | 2.509 | n/a | 0.000 | 0.587 | 0.903 | 2.016 | 0.040 | n/a | 0.131 | 10.015 | n/a | n/a | 0.026 | 3.096 | 0.191 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000002005 | 16.043 | 2.790 | n/a | 0.000 | 0.142 | 0.850 | 1.406 | 0.032 | n/a | 0.154 | 10.644 | n/a | n/a | 0.025 | 2.932 | 0.183 | 0.025 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000021af | 15.902 | 4.640 | n/a | 0.000 | 0.271 | 1.310 | 3.604 | 0.028 | n/a | 0.284 | 5.691 | n/a | n/a | 0.074 | 4.911 | 0.309 | 0.074 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000002082 | 15.800 | 4.007 | n/a | 0.000 | 0.472 | 1.119 | 3.014 | 0.048 | n/a | 0.128 | 6.994 | n/a | n/a | 0.017 | 4.480 | 0.284 | 0.017 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000221e | 15.322 | 4.813 | n/a | 0.000 | 0.809 | 1.085 | 1.265 | 0.023 | n/a | 0.437 | 6.832 | n/a | n/a | 0.059 | 5.622 | 0.367 | 0.059 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000002203 | 15.305 | 2.064 | n/a | 0.000 | 1.120 | 0.420 | 0.744 | 0.013 | n/a | 0.054 | 10.845 | n/a | n/a | 0.045 | 3.185 | 0.208 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001fd3 | 14.433 | 6.087 | n/a | 0.000 | 0.472 | 1.519 | 3.758 | 0.035 | n/a | 0.456 | 2.050 | n/a | n/a | 0.056 | 6.559 | 0.454 | 0.056 | node-14/thread-0/driver.execute | none observed |
| 36d0e4fd06d895510000000000002183 | 14.366 | 4.381 | n/a | 0.000 | 0.563 | 1.216 | 2.119 | 0.040 | n/a | 0.161 | 5.859 | n/a | n/a | 0.027 | 4.944 | 0.344 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000020b9 | 13.708 | 3.259 | n/a | 0.000 | 0.186 | 0.791 | 0.891 | 0.016 | n/a | 0.238 | 8.291 | n/a | n/a | 0.039 | 3.444 | 0.251 | 0.039 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d89551000000000000208f | 13.589 | 2.270 | n/a | 0.000 | 1.043 | 0.570 | 1.010 | 0.019 | n/a | 0.074 | 8.583 | n/a | n/a | 0.021 | 3.313 | 0.244 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000002039 | 13.449 | 2.726 | n/a | 0.000 | 0.727 | 0.594 | 1.045 | 0.016 | n/a | 2.277 | 6.046 | n/a | n/a | 0.019 | 3.453 | 0.257 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000021ee | 13.446 | 1.632 | n/a | 0.000 | 1.083 | 0.580 | 1.500 | 0.025 | n/a | 0.107 | 8.501 | n/a | n/a | 0.016 | 2.715 | 0.202 | 0.016 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d895510000000000001fac | 13.273 | 2.439 | n/a | 0.000 | 0.610 | 0.668 | 1.479 | 0.020 | n/a | 0.074 | 7.962 | n/a | n/a | 0.021 | 3.050 | 0.230 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 36d0e4fd06d8955100000000000021c5 | 13.236 | 4.276 | n/a | 0.000 | 1.150 | 0.844 | 1.373 | 0.019 | n/a | 0.151 | 5.379 | n/a | n/a | 0.043 | 5.426 | 0.410 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.754 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 200.428 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 |
| p99 | 358.468 | n/a | n/a | n/a | 18.435 | n/a | 1.576 | 0.000 | 6.980 | 353.690 | 0.109 | n/a | 0.179 | 0.000 | n/a | n/a | 47.204 | 18.435 | 0.270 | 47.204 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e0000000000000002 | 358.468 | 2.552 | n/a | 0.000 | 0.000 | 1.544 | 353.690 | 0.109 | n/a | 0.179 | 0.000 | n/a | n/a | 0.394 | 2.552 | 0.007 | 0.394 | gw-r/thread-46/gateway.admitted-work | none observed |
| 225e49f3d343b6900000000000000006 | 202.765 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 201.411 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000007 | 202.688 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 201.635 | 0.010 | n/a | 0.165 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000000005 | 202.021 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 200.900 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000001471 | 201.407 | 0.000 | n/a | 0.000 | 0.000 | 0.299 | 200.969 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.061 | 0.000 | 0.000 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000001472 | 200.754 | 0.000 | n/a | 0.000 | 0.000 | 0.235 | 200.428 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.045 | 0.000 | 0.000 | 0.045 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000001477 | 84.346 | 14.231 | n/a | 1.576 | 0.000 | 2.898 | 65.467 | 0.006 | n/a | 0.010 | 0.000 | n/a | n/a | 0.159 | 15.807 | 0.187 | 0.159 | gw-r/thread-65/gateway.admitted-work | none observed |
| 225e49f3d343b6900000000000001476 | 70.165 | 18.435 | n/a | 0.000 | 0.000 | 4.526 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.204 | 18.435 | 0.263 | 47.204 | node-14/thread-5/socket.wait-first-byte | none observed |
| 225e49f3d343b6900000000000001475 | 67.024 | 16.865 | n/a | 1.205 | 0.000 | 5.661 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.293 | 18.070 | 0.270 | 43.293 | node-14/thread-5/socket.wait-first-byte | none observed |
| 225e49f3d343b6900000000000001478 | 63.017 | 13.539 | n/a | 1.178 | 0.000 | 6.980 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.319 | 14.718 | 0.234 | 41.319 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 798.739 | n/a | n/a | n/a | 0.173 | n/a | 0.000 | 0.000 | 0.724 | 785.294 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.445 | 0.173 | 0.000 | 0.445 |
| p99 | 1011.484 | n/a | n/a | n/a | 12.177 | n/a | 0.000 | 0.000 | 1.354 | 1008.354 | 0.017 | n/a | 0.277 | 0.000 | n/a | n/a | 1.308 | 12.177 | 0.015 | 1.308 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e00000000000000a4 | 1011.484 | 0.173 | n/a | 0.000 | 0.000 | 1.354 | 1008.354 | 0.017 | n/a | 0.277 | 0.000 | n/a | n/a | 1.308 | 0.173 | 0.000 | 1.308 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e00000000000000a5 | 798.739 | 12.177 | n/a | 0.000 | 0.000 | 0.724 | 785.294 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.445 | 12.177 | 0.015 | 0.445 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 425.003 | n/a | n/a | n/a | 2.572 | n/a | 0.000 | 0.000 | 0.649 | 418.466 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.091 | 2.572 | 0.007 | 0.091 |
| p99 | 1006.769 | n/a | n/a | n/a | 7.466 | n/a | 0.000 | 0.000 | 4.058 | 1003.755 | 0.484 | n/a | 2.768 | 0.000 | n/a | n/a | 42.208 | 7.466 | 0.366 | 42.208 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e00000000000000bc | 1006.769 | 0.183 | n/a | 0.000 | 0.000 | 1.519 | 1003.755 | 0.012 | n/a | 0.158 | 0.000 | n/a | n/a | 1.141 | 0.183 | 0.000 | 1.141 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e00000000000000d1 | 1005.500 | 3.438 | n/a | 0.000 | 0.000 | 3.013 | 998.861 | 0.018 | n/a | 0.092 | 0.000 | n/a | n/a | 0.079 | 3.438 | 0.003 | 0.079 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e00000000000000ae | 1003.435 | 0.139 | n/a | 0.000 | 0.000 | 0.801 | 1001.287 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 1.108 | 0.139 | 0.000 | 1.108 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e00000000000000b5 | 987.454 | 2.340 | n/a | 0.000 | 0.000 | 1.385 | 983.563 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.083 | 2.340 | 0.002 | 0.083 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e00000000000000bb | 957.150 | 2.625 | n/a | 0.000 | 0.000 | 0.713 | 953.625 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.088 | 2.625 | 0.003 | 0.088 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e00000000000000ab | 895.153 | 2.572 | n/a | 0.000 | 0.000 | 0.649 | 891.678 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.150 | 2.572 | 0.003 | 0.150 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e00000000000000a8 | 829.531 | 4.441 | n/a | 0.000 | 0.000 | 0.940 | 823.865 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.195 | 4.441 | 0.005 | 0.195 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e00000000000000c3 | 818.331 | 5.590 | n/a | 0.000 | 0.000 | 0.468 | 812.042 | 0.017 | n/a | 0.115 | 0.000 | n/a | n/a | 0.097 | 5.590 | 0.007 | 0.097 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e00000000000000cc | 686.507 | 2.146 | n/a | 0.000 | 0.000 | 0.551 | 680.953 | 0.017 | n/a | 2.768 | 0.000 | n/a | n/a | 0.073 | 2.146 | 0.003 | 0.073 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e00000000000000b4 | 652.019 | 2.879 | n/a | 0.000 | 0.000 | 0.698 | 648.327 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.070 | 2.879 | 0.004 | 0.070 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e00000000000000cb | 574.052 | 2.261 | n/a | 0.000 | 0.000 | 0.607 | 571.032 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.074 | 2.261 | 0.004 | 0.074 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e00000000000000c1 | 553.282 | 2.311 | n/a | 0.000 | 0.000 | 0.627 | 550.180 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.084 | 2.311 | 0.004 | 0.084 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e00000000000000c7 | 541.111 | 2.216 | n/a | 0.000 | 0.000 | 0.673 | 538.068 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.068 | 2.216 | 0.004 | 0.068 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e00000000000000c6 | 460.946 | 1.811 | n/a | 0.000 | 0.000 | 4.058 | 454.263 | 0.009 | n/a | 0.736 | 0.000 | n/a | n/a | 0.068 | 1.811 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e00000000000000b8 | 451.088 | 2.567 | n/a | 0.000 | 0.000 | 0.577 | 447.731 | 0.017 | n/a | 0.121 | 0.000 | n/a | n/a | 0.075 | 2.567 | 0.006 | 0.075 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e00000000000000c9 | 425.003 | 4.142 | n/a | 0.000 | 0.000 | 2.142 | 418.466 | 0.039 | n/a | 0.086 | 0.000 | n/a | n/a | 0.128 | 4.142 | 0.010 | 0.128 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e00000000000000a7 | 380.506 | 7.466 | n/a | 0.000 | 0.000 | 0.962 | 371.633 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.339 | 7.466 | 0.020 | 0.339 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e00000000000000ba | 325.456 | 2.724 | n/a | 0.000 | 0.000 | 0.658 | 321.879 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.094 | 2.724 | 0.008 | 0.094 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e00000000000000b2 | 306.795 | 4.610 | n/a | 0.000 | 0.000 | 3.319 | 298.614 | 0.018 | n/a | 0.123 | 0.000 | n/a | n/a | 0.110 | 4.610 | 0.015 | 0.110 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e00000000000000ce | 272.619 | 1.785 | n/a | 0.000 | 0.000 | 0.555 | 270.112 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.091 | 1.785 | 0.007 | 0.091 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 406.444 | n/a | n/a | n/a | 3.212 | n/a | 0.000 | 0.000 | 0.646 | 402.519 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.082 | 3.634 | 0.009 | 0.082 |
| p99 | 1011.209 | n/a | n/a | n/a | 11.796 | n/a | 4.859 | 0.000 | 3.649 | 1005.448 | 1.034 | n/a | 3.694 | 0.000 | n/a | n/a | 48.703 | 13.087 | 0.733 | 48.703 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e00000000000000e0 | 1011.209 | 4.491 | n/a | 0.591 | 0.000 | 0.522 | 1005.448 | 0.012 | n/a | 0.064 | 0.000 | n/a | n/a | 0.080 | 5.082 | 0.005 | 0.080 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e00000000000000d3 | 1006.009 | 4.372 | n/a | 0.737 | 0.000 | 0.952 | 999.736 | 0.018 | n/a | 0.110 | 0.000 | n/a | n/a | 0.083 | 5.110 | 0.005 | 0.083 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e000000000000012b | 1003.656 | 2.421 | n/a | 0.000 | 0.000 | 0.522 | 1000.590 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.074 | 2.421 | 0.002 | 0.074 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e00000000000000ff | 1002.676 | 0.115 | n/a | 0.000 | 0.000 | 0.719 | 1000.650 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 1.096 | 0.115 | 0.000 | 1.096 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e00000000000000d9 | 1002.576 | 0.109 | n/a | 0.000 | 0.000 | 0.350 | 1000.900 | 0.018 | n/a | 0.103 | 0.000 | n/a | n/a | 1.095 | 0.109 | 0.000 | 1.095 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000000138 | 1002.509 | 0.103 | n/a | 0.000 | 0.000 | 0.563 | 1000.685 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 1.095 | 0.103 | 0.000 | 1.095 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e00000000000000d2 | 996.331 | 10.837 | n/a | 0.906 | 0.000 | 1.149 | 983.280 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.121 | 11.743 | 0.012 | 0.121 | gw-r/thread-46/journal/page | none observed |
| babdf23f0bf4a52e0000000000000116 | 995.750 | 5.410 | n/a | 0.000 | 0.000 | 0.676 | 989.524 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.067 | 5.410 | 0.005 | 0.067 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e000000000000012c | 995.635 | 2.450 | n/a | 0.758 | 0.000 | 0.552 | 991.740 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.090 | 3.208 | 0.003 | 0.090 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e000000000000010f | 995.421 | 4.028 | n/a | 0.000 | 0.000 | 1.092 | 990.019 | 0.011 | n/a | 0.118 | 0.000 | n/a | n/a | 0.153 | 4.028 | 0.004 | 0.153 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000000155 | 994.330 | 2.399 | n/a | 0.000 | 0.000 | 1.182 | 990.640 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.065 | 2.399 | 0.002 | 0.065 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e00000000000000db | 989.766 | 6.529 | n/a | 0.693 | 0.000 | 0.655 | 981.675 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.157 | 7.222 | 0.007 | 0.157 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e000000000000011e | 983.311 | 5.528 | n/a | 0.000 | 0.000 | 0.687 | 976.905 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.144 | 5.528 | 0.006 | 0.144 | gw-r/thread-46/journal/page | none observed |
| babdf23f0bf4a52e0000000000000127 | 979.728 | 4.348 | n/a | 0.000 | 0.000 | 0.822 | 974.430 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.069 | 4.348 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000000107 | 964.855 | 2.771 | n/a | 0.000 | 0.000 | 0.896 | 961.072 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.059 | 2.771 | 0.003 | 0.059 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000000103 | 950.490 | 5.724 | n/a | 0.834 | 0.000 | 0.715 | 943.019 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.136 | 6.557 | 0.007 | 0.136 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000000142 | 933.100 | 4.297 | n/a | 0.000 | 0.000 | 0.417 | 928.148 | 0.025 | n/a | 0.086 | 0.000 | n/a | n/a | 0.126 | 4.297 | 0.005 | 0.126 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e00000000000000df | 924.414 | 5.249 | n/a | 0.788 | 0.000 | 0.641 | 917.605 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.073 | 6.036 | 0.007 | 0.073 | gw-r/thread-46/journal/page | none observed |
| babdf23f0bf4a52e0000000000000113 | 872.410 | 5.377 | n/a | 0.000 | 0.000 | 0.649 | 866.192 | 0.020 | n/a | 0.069 | 0.000 | n/a | n/a | 0.102 | 5.377 | 0.006 | 0.102 | gw-r/thread-46/journal/page | none observed |
| babdf23f0bf4a52e0000000000000104 | 831.813 | 2.443 | n/a | 0.000 | 0.000 | 1.220 | 826.987 | 1.034 | n/a | 0.054 | 0.000 | n/a | n/a | 0.075 | 2.443 | 0.003 | 0.075 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 358.287 | n/a | n/a | n/a | 2.587 | n/a | 0.000 | 0.000 | 0.534 | 351.783 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.062 | 2.587 | 0.008 | 0.062 |
| p99 | 1003.227 | n/a | n/a | n/a | 7.993 | n/a | 1.096 | 0.000 | 1.948 | 1000.529 | 0.339 | n/a | 0.089 | 0.000 | n/a | n/a | 29.497 | 7.993 | 0.422 | 29.497 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e0000000000000165 | 1005.017 | 0.101 | n/a | 0.000 | 0.000 | 3.238 | 1000.529 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 1.094 | 0.101 | 0.000 | 1.094 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000000186 | 1003.227 | 0.214 | n/a | 0.000 | 0.000 | 0.779 | 1001.005 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 1.154 | 0.214 | 0.000 | 1.154 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e000000000000019a | 1002.261 | 2.402 | n/a | 0.000 | 0.000 | 0.439 | 999.314 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.402 | 0.002 | 0.063 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e00000000000001a7 | 1002.241 | 0.134 | n/a | 0.000 | 0.000 | 0.475 | 1000.491 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 1.105 | 0.134 | 0.000 | 1.105 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e00000000000001c4 | 1002.237 | 0.119 | n/a | 0.000 | 0.000 | 0.458 | 1000.526 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 1.101 | 0.119 | 0.000 | 1.101 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e000000000000017f | 1001.147 | 4.767 | n/a | 0.000 | 0.000 | 0.588 | 995.604 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.145 | 4.767 | 0.005 | 0.145 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000000185 | 997.255 | 3.378 | n/a | 0.000 | 0.000 | 1.165 | 992.575 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.072 | 3.378 | 0.003 | 0.072 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e000000000000016f | 995.731 | 2.587 | n/a | 0.000 | 0.000 | 0.507 | 992.541 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.057 | 2.587 | 0.003 | 0.057 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e00000000000001c6 | 990.979 | 2.200 | n/a | 0.000 | 0.000 | 0.433 | 988.230 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.059 | 2.200 | 0.002 | 0.059 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e00000000000001eb | 988.530 | 2.263 | n/a | 0.000 | 0.000 | 0.613 | 985.552 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.060 | 2.263 | 0.002 | 0.060 | gw-r/thread-46/journal/page | none observed |
| babdf23f0bf4a52e00000000000001a6 | 976.000 | 4.606 | n/a | 1.096 | 0.000 | 0.420 | 969.680 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.166 | 5.703 | 0.006 | 0.166 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e000000000000018b | 951.712 | 5.174 | n/a | 0.822 | 0.000 | 0.612 | 944.902 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.156 | 5.995 | 0.006 | 0.156 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000000175 | 940.361 | 2.252 | n/a | 0.000 | 0.000 | 0.420 | 937.587 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.059 | 2.252 | 0.002 | 0.059 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e00000000000001a5 | 919.919 | 4.715 | n/a | 0.000 | 0.000 | 0.868 | 914.156 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.145 | 4.715 | 0.005 | 0.145 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e000000000000019c | 830.448 | 4.719 | n/a | 0.000 | 0.000 | 0.500 | 825.081 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.062 | 4.719 | 0.006 | 0.062 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e00000000000001f8 | 818.461 | 2.929 | n/a | 0.000 | 0.000 | 0.727 | 814.696 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.057 | 2.929 | 0.004 | 0.057 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e00000000000001d6 | 777.208 | 1.572 | n/a | 0.000 | 0.000 | 0.328 | 775.198 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.060 | 1.572 | 0.002 | 0.060 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e000000000000017a | 761.427 | 2.182 | n/a | 0.000 | 0.000 | 0.475 | 758.615 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.058 | 2.182 | 0.003 | 0.058 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e00000000000001c2 | 759.116 | 2.249 | n/a | 0.000 | 0.000 | 0.577 | 756.198 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.057 | 2.249 | 0.003 | 0.057 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e00000000000001f1 | 737.442 | 1.768 | n/a | 0.000 | 0.000 | 1.114 | 734.461 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.057 | 1.768 | 0.002 | 0.057 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / internal (1539 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.064 | n/a | n/a | n/a | 3.148 | n/a | 0.000 | 0.000 | 0.211 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.435 | 3.148 | 0.259 | 7.435 |
| p99 | 280.657 | n/a | n/a | n/a | 13.464 | n/a | 1.010 | 0.000 | 1.192 | 277.935 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 47.538 | 13.464 | 0.833 | 47.538 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e000000000000021b | 1003.937 | 2.249 | n/a | 0.000 | 0.000 | 0.539 | 1001.027 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.076 | 2.249 | 0.002 | 0.076 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000000214 | 1003.722 | 0.104 | n/a | 0.000 | 0.000 | 0.617 | 1001.852 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 1.099 | 0.104 | 0.000 | 1.099 | gw-r/thread-46/journal/page | none observed |
| babdf23f0bf4a52e0000000000000212 | 1003.419 | 0.111 | n/a | 0.000 | 0.000 | 0.663 | 1001.371 | 0.020 | n/a | 0.086 | 0.000 | n/a | n/a | 1.167 | 0.111 | 0.000 | 1.167 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000000219 | 1002.690 | 0.108 | n/a | 0.000 | 0.000 | 0.643 | 1000.786 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 1.093 | 0.108 | 0.000 | 1.093 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000000227 | 999.873 | 2.415 | n/a | 0.000 | 0.000 | 0.321 | 997.006 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.071 | 2.415 | 0.002 | 0.071 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e00000000000001ff | 998.256 | 2.607 | n/a | 0.000 | 0.000 | 0.774 | 994.776 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.067 | 2.607 | 0.003 | 0.067 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000000218 | 951.845 | 2.980 | n/a | 0.000 | 0.000 | 0.425 | 948.346 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.056 | 2.980 | 0.003 | 0.056 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000000208 | 917.609 | 2.332 | n/a | 0.000 | 0.000 | 0.402 | 914.798 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.053 | 2.332 | 0.003 | 0.053 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e000000000000021c | 889.643 | 1.605 | n/a | 0.000 | 0.000 | 2.113 | 885.827 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.058 | 1.605 | 0.002 | 0.058 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000000228 | 870.032 | 2.696 | n/a | 0.000 | 0.000 | 0.625 | 866.603 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.065 | 2.696 | 0.003 | 0.065 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000000200 | 828.427 | 4.021 | n/a | 0.000 | 0.000 | 0.737 | 823.512 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.112 | 4.021 | 0.005 | 0.112 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000000224 | 767.132 | 2.900 | n/a | 0.000 | 0.000 | 0.364 | 763.786 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.059 | 2.900 | 0.004 | 0.059 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000000203 | 757.556 | 2.417 | n/a | 0.000 | 0.000 | 3.201 | 751.834 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.065 | 2.417 | 0.003 | 0.065 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e000000000000021f | 738.527 | 1.900 | n/a | 0.000 | 0.000 | 0.423 | 736.089 | 0.012 | n/a | 0.050 | 0.000 | n/a | n/a | 0.052 | 1.900 | 0.003 | 0.052 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000000211 | 426.886 | 2.223 | n/a | 0.000 | 0.000 | 0.510 | 424.024 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.056 | 2.223 | 0.005 | 0.056 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e000000000000020f | 280.657 | 2.149 | n/a | 0.000 | 0.000 | 0.449 | 277.935 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.064 | 2.149 | 0.008 | 0.064 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000000204 | 256.859 | 2.302 | n/a | 0.000 | 0.000 | 0.733 | 253.722 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.053 | 2.302 | 0.009 | 0.053 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000000221 | 247.529 | 2.849 | n/a | 0.000 | 0.000 | 0.772 | 243.820 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.057 | 2.849 | 0.012 | 0.057 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000000225 | 237.643 | 2.241 | n/a | 0.000 | 0.000 | 0.713 | 234.611 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.060 | 2.241 | 0.009 | 0.060 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000000202 | 180.869 | 4.496 | n/a | 0.000 | 0.000 | 0.714 | 175.476 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.151 | 4.496 | 0.025 | 0.151 | gw-r/thread-41/journal/page | none observed |

## P3 / L64 / internal (1564 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.540 | n/a | n/a | n/a | 3.786 | n/a | 0.000 | 0.000 | 0.193 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.670 | 3.832 | 0.305 | 6.670 |
| p99 | 424.009 | n/a | n/a | n/a | 15.695 | n/a | 1.342 | 0.000 | 1.405 | 421.125 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 45.783 | 16.140 | 0.845 | 45.783 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e0000000000001ac2 | 1002.438 | 0.157 | n/a | 0.000 | 0.000 | 0.420 | 1000.674 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 1.150 | 0.157 | 0.000 | 1.150 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000001acb | 999.079 | 5.305 | n/a | 0.000 | 0.000 | 0.250 | 993.374 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.128 | 5.305 | 0.005 | 0.128 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ac7 | 983.910 | 3.073 | n/a | 0.000 | 0.000 | 0.385 | 980.335 | 0.002 | n/a | 0.022 | 0.000 | n/a | n/a | 0.093 | 3.073 | 0.003 | 0.093 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ae4 | 969.911 | 2.147 | n/a | 0.000 | 0.000 | 0.496 | 966.917 | 0.008 | n/a | 0.294 | 0.000 | n/a | n/a | 0.049 | 2.147 | 0.002 | 0.049 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ad6 | 957.083 | 3.548 | n/a | 0.000 | 0.000 | 0.695 | 952.730 | 0.002 | n/a | 0.029 | 0.000 | n/a | n/a | 0.079 | 3.548 | 0.004 | 0.079 | gw-r/thread-46/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ac1 | 903.692 | 2.222 | n/a | 0.000 | 0.000 | 0.282 | 901.100 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.058 | 2.222 | 0.002 | 0.058 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ac4 | 899.603 | 7.501 | n/a | 0.798 | 0.000 | 0.328 | 890.724 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.233 | 8.299 | 0.009 | 0.233 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ae8 | 749.011 | 4.120 | n/a | 0.000 | 0.000 | 0.498 | 744.271 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.096 | 4.120 | 0.006 | 0.096 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ae2 | 666.359 | 3.158 | n/a | 0.000 | 0.000 | 0.395 | 662.706 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.070 | 3.158 | 0.005 | 0.070 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001acd | 630.367 | 1.900 | n/a | 0.000 | 0.000 | 0.444 | 627.932 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.068 | 1.900 | 0.003 | 0.068 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ae9 | 614.364 | 12.792 | n/a | 0.000 | 0.000 | 1.847 | 599.297 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.408 | 12.792 | 0.021 | 0.408 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001adc | 572.186 | 2.208 | n/a | 0.000 | 0.000 | 0.443 | 569.446 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.055 | 2.208 | 0.004 | 0.055 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001afc | 520.720 | 2.878 | n/a | 0.000 | 0.000 | 0.260 | 517.472 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.067 | 2.878 | 0.006 | 0.067 | gw-r/thread-46/journal/page | none observed |
| babdf23f0bf4a52e0000000000001af7 | 504.662 | 2.139 | n/a | 0.000 | 0.000 | 0.652 | 501.781 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.066 | 2.139 | 0.004 | 0.066 | gw-r/thread-65/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b00 | 463.991 | 2.135 | n/a | 0.000 | 0.000 | 0.389 | 461.394 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.059 | 2.135 | 0.005 | 0.059 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001af6 | 424.009 | 2.286 | n/a | 0.000 | 0.000 | 0.520 | 421.125 | 0.005 | n/a | 0.010 | 0.000 | n/a | n/a | 0.063 | 2.286 | 0.005 | 0.063 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ada | 374.315 | 1.570 | n/a | 0.000 | 0.000 | 0.518 | 372.143 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.062 | 1.570 | 0.004 | 0.062 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001af8 | 335.533 | 1.826 | n/a | 0.000 | 0.000 | 0.311 | 333.281 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.071 | 1.826 | 0.005 | 0.071 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001af3 | 305.724 | 2.997 | n/a | 0.000 | 0.000 | 0.360 | 302.250 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.080 | 2.997 | 0.010 | 0.080 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001aeb | 289.219 | 2.289 | n/a | 0.000 | 0.000 | 0.319 | 286.502 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.083 | 2.289 | 0.008 | 0.083 | gw-r/thread-41/journal/page | none observed |

## P3 / L256 / internal (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 343.252 | n/a | n/a | n/a | 3.099 | n/a | 0.000 | 0.000 | 0.408 | 339.628 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.089 | 3.099 | 0.009 | 0.089 |
| p99 | 1002.814 | n/a | n/a | n/a | 9.483 | n/a | 1.210 | 0.000 | 3.551 | 1001.070 | 0.086 | n/a | 0.092 | 0.000 | n/a | n/a | 47.077 | 10.492 | 0.747 | 47.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e0000000000001b5b | 1002.814 | 2.185 | n/a | 0.000 | 0.000 | 0.445 | 1000.091 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.065 | 2.185 | 0.002 | 0.065 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b63 | 1002.780 | 0.132 | n/a | 0.000 | 0.000 | 0.377 | 1001.070 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 1.097 | 0.132 | 0.000 | 1.097 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b55 | 1002.351 | 0.089 | n/a | 0.000 | 0.000 | 0.313 | 1000.786 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 1.091 | 0.089 | 0.000 | 1.091 | gw-r/thread-65/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b46 | 1002.282 | 0.093 | n/a | 0.000 | 0.000 | 0.336 | 1000.716 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 1.088 | 0.093 | 0.000 | 1.088 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b4b | 1002.281 | 0.214 | n/a | 0.000 | 0.000 | 0.486 | 1000.427 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 1.123 | 0.214 | 0.000 | 1.123 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b57 | 1000.158 | 2.939 | n/a | 0.000 | 0.000 | 0.236 | 996.891 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.065 | 2.939 | 0.003 | 0.065 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b88 | 999.175 | 2.760 | n/a | 0.000 | 0.000 | 0.408 | 995.915 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.055 | 2.760 | 0.003 | 0.055 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b89 | 998.936 | 2.248 | n/a | 0.000 | 0.000 | 3.551 | 993.037 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.061 | 2.248 | 0.002 | 0.061 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b5c | 998.247 | 2.196 | n/a | 0.000 | 0.000 | 0.329 | 995.635 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.058 | 2.196 | 0.002 | 0.058 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b84 | 997.454 | 3.737 | n/a | 0.000 | 0.000 | 0.501 | 993.112 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.058 | 3.737 | 0.004 | 0.058 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b0a | 997.182 | 2.171 | n/a | 0.000 | 0.000 | 1.659 | 993.267 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.065 | 2.171 | 0.002 | 0.065 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b19 | 981.441 | 2.849 | n/a | 0.000 | 0.000 | 0.283 | 978.205 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.056 | 2.849 | 0.003 | 0.056 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b76 | 965.974 | 2.158 | n/a | 0.000 | 0.000 | 0.487 | 963.212 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.084 | 2.158 | 0.002 | 0.084 | gw-r/thread-65/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b86 | 961.454 | 6.240 | n/a | 0.000 | 0.000 | 0.561 | 954.515 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.105 | 6.240 | 0.006 | 0.105 | gw-r/thread-65/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b6e | 954.448 | 2.176 | n/a | 0.000 | 0.000 | 0.486 | 951.700 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.061 | 2.176 | 0.002 | 0.061 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b05 | 920.941 | 3.212 | n/a | 0.000 | 0.000 | 0.457 | 917.180 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.071 | 3.212 | 0.003 | 0.071 | gw-r/thread-65/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b73 | 908.115 | 3.708 | n/a | 0.000 | 0.000 | 0.547 | 903.744 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.089 | 3.708 | 0.004 | 0.089 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b60 | 887.510 | 2.521 | n/a | 0.000 | 0.000 | 0.431 | 884.465 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.070 | 2.521 | 0.003 | 0.070 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b58 | 861.470 | 2.442 | n/a | 0.000 | 0.000 | 0.375 | 858.511 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.104 | 2.442 | 0.003 | 0.104 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b81 | 857.924 | 3.909 | n/a | 0.000 | 0.000 | 0.340 | 853.485 | 0.002 | n/a | 0.025 | 0.000 | n/a | n/a | 0.161 | 3.909 | 0.005 | 0.161 | gw-r/thread-43/journal/page | none observed |

## P3 / L1024 / internal (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 370.629 | n/a | n/a | n/a | 3.372 | n/a | 0.000 | 0.000 | 0.446 | 364.506 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.080 | 3.372 | 0.011 | 0.080 |
| p99 | 1005.454 | n/a | n/a | n/a | 9.754 | n/a | 1.304 | 0.000 | 2.700 | 1000.657 | 0.081 | n/a | 0.066 | 0.000 | n/a | n/a | 47.068 | 10.562 | 0.819 | 47.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e0000000000001be2 | 1005.454 | 4.546 | n/a | 0.000 | 0.000 | 0.544 | 1000.271 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.073 | 4.546 | 0.005 | 0.073 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000001c15 | 1003.818 | 3.072 | n/a | 0.000 | 0.000 | 0.469 | 1000.179 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.067 | 3.072 | 0.003 | 0.067 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000001bc5 | 1003.079 | 3.982 | n/a | 0.000 | 0.000 | 0.485 | 998.522 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.056 | 3.982 | 0.004 | 0.056 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001bf9 | 1002.951 | 2.259 | n/a | 0.000 | 0.000 | 0.421 | 1000.140 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.083 | 2.259 | 0.002 | 0.083 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001c0a | 1002.232 | 0.131 | n/a | 0.000 | 0.000 | 0.340 | 1000.657 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 1.071 | 0.131 | 0.000 | 1.071 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001be9 | 1002.182 | 0.101 | n/a | 0.000 | 0.000 | 0.398 | 1000.540 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.104 | 0.101 | 0.000 | 1.104 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001bf3 | 999.519 | 3.507 | n/a | 0.000 | 0.000 | 0.669 | 995.247 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.065 | 3.507 | 0.004 | 0.065 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000001bf2 | 996.822 | 2.402 | n/a | 0.000 | 0.000 | 0.568 | 993.760 | 0.002 | n/a | 0.025 | 0.000 | n/a | n/a | 0.063 | 2.402 | 0.002 | 0.063 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001c0f | 996.256 | 2.333 | n/a | 0.000 | 0.000 | 0.320 | 993.501 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.077 | 2.333 | 0.002 | 0.077 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001beb | 992.603 | 2.141 | n/a | 0.000 | 0.000 | 0.770 | 989.610 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.056 | 2.141 | 0.002 | 0.056 | gw-r/thread-65/journal/page | none observed |
| babdf23f0bf4a52e0000000000001bfa | 992.227 | 2.757 | n/a | 0.000 | 0.000 | 0.614 | 988.755 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.073 | 2.757 | 0.003 | 0.073 | gw-r/thread-65/journal/page | none observed |
| babdf23f0bf4a52e0000000000001c27 | 973.087 | 3.638 | n/a | 0.000 | 0.000 | 0.427 | 968.938 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.062 | 3.638 | 0.004 | 0.062 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001bff | 952.259 | 4.414 | n/a | 0.000 | 0.000 | 0.397 | 947.313 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.106 | 4.414 | 0.005 | 0.106 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001c1a | 948.063 | 2.262 | n/a | 0.000 | 0.000 | 0.356 | 945.368 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.052 | 2.262 | 0.002 | 0.052 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001be6 | 931.276 | 8.025 | n/a | 1.109 | 0.000 | 0.314 | 921.410 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.393 | 9.135 | 0.010 | 0.393 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001c25 | 929.480 | 3.131 | n/a | 0.000 | 0.000 | 1.209 | 925.060 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.054 | 3.131 | 0.003 | 0.054 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001bc2 | 925.099 | 6.582 | n/a | 0.000 | 0.000 | 0.482 | 917.900 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.115 | 6.582 | 0.007 | 0.115 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001bf0 | 840.852 | 2.328 | n/a | 0.000 | 0.000 | 0.429 | 838.030 | 0.001 | n/a | 0.006 | 0.000 | n/a | n/a | 0.058 | 2.328 | 0.003 | 0.058 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000001b96 | 813.581 | 4.790 | n/a | 0.000 | 0.000 | 0.510 | 808.128 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.108 | 4.790 | 0.006 | 0.108 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001bbf | 808.824 | 2.022 | n/a | 0.000 | 0.000 | 0.364 | 806.333 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.067 | 2.022 | 0.003 | 0.067 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / internal (371 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 327.518 | n/a | n/a | n/a | 2.999 | n/a | 0.000 | 0.000 | 0.395 | 320.773 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.085 | 3.006 | 0.010 | 0.085 |
| p99 | 1003.763 | n/a | n/a | n/a | 12.270 | n/a | 1.342 | 0.000 | 3.056 | 1001.032 | 0.123 | n/a | 0.066 | 0.000 | n/a | n/a | 49.171 | 12.270 | 0.740 | 49.171 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| babdf23f0bf4a52e0000000000001e2f | 1007.633 | 7.687 | n/a | 0.000 | 0.000 | 0.707 | 999.003 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.177 | 7.687 | 0.008 | 0.177 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001e57 | 1004.633 | 2.114 | n/a | 0.000 | 0.000 | 0.310 | 1002.122 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.062 | 2.114 | 0.002 | 0.062 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000001cb4 | 1003.945 | 2.593 | n/a | 0.000 | 0.000 | 0.288 | 1000.968 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.053 | 2.593 | 0.003 | 0.053 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001dec | 1003.763 | 2.129 | n/a | 0.000 | 0.000 | 0.508 | 1001.032 | 0.002 | n/a | 0.037 | 0.000 | n/a | n/a | 0.054 | 2.129 | 0.002 | 0.054 | gw-r/thread-48/journal/page | none observed |
| babdf23f0bf4a52e0000000000001c2c | 1003.704 | 2.121 | n/a | 0.000 | 0.000 | 0.372 | 1001.087 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.078 | 2.121 | 0.002 | 0.078 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001e59 | 1002.942 | 0.132 | n/a | 0.000 | 0.000 | 0.349 | 1001.265 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 1.097 | 0.132 | 0.000 | 1.097 | gw-r/thread-65/journal/page | none observed |
| babdf23f0bf4a52e0000000000001d8a | 1002.715 | 0.160 | n/a | 0.000 | 0.000 | 0.520 | 1000.841 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 1.130 | 0.160 | 0.000 | 1.130 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001c55 | 1002.672 | 0.102 | n/a | 0.000 | 0.000 | 0.487 | 1000.918 | 0.026 | n/a | 0.049 | 0.000 | n/a | n/a | 1.090 | 0.102 | 0.000 | 1.090 | gw-r/thread-44/journal/page | none observed |
| babdf23f0bf4a52e0000000000001d92 | 1002.439 | 0.102 | n/a | 0.000 | 0.000 | 0.455 | 1000.679 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 1.160 | 0.102 | 0.000 | 1.160 | gw-r/thread-47/journal/page | none observed |
| babdf23f0bf4a52e0000000000001ca9 | 1002.401 | 0.179 | n/a | 0.000 | 0.000 | 0.492 | 1000.558 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 1.127 | 0.179 | 0.000 | 1.127 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001e4f | 1002.301 | 0.079 | n/a | 0.000 | 0.000 | 0.278 | 1000.806 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 1.087 | 0.079 | 0.000 | 1.087 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001d20 | 1002.218 | 0.170 | n/a | 0.000 | 0.000 | 0.505 | 1000.375 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 1.144 | 0.170 | 0.000 | 1.144 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001cfe | 1002.081 | 3.166 | n/a | 0.000 | 0.000 | 0.395 | 998.429 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.063 | 3.166 | 0.003 | 0.063 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001c8d | 1002.073 | 0.101 | n/a | 0.000 | 0.000 | 0.373 | 1000.474 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 1.094 | 0.101 | 0.000 | 1.094 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001cff | 1002.059 | 0.137 | n/a | 0.000 | 0.000 | 0.402 | 1000.356 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 1.133 | 0.137 | 0.000 | 1.133 | gw-r/thread-43/journal/page | none observed |
| babdf23f0bf4a52e0000000000001d96 | 1002.027 | 0.116 | n/a | 0.000 | 0.000 | 0.395 | 1000.398 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 1.088 | 0.116 | 0.000 | 1.088 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001cb1 | 1002.018 | 0.118 | n/a | 0.000 | 0.000 | 0.399 | 1000.380 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 1.093 | 0.118 | 0.000 | 1.093 | gw-r/thread-45/journal/page | none observed |
| babdf23f0bf4a52e0000000000001d6c | 1001.981 | 0.099 | n/a | 0.000 | 0.000 | 0.414 | 1000.358 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 1.092 | 0.099 | 0.000 | 1.092 | gw-r/thread-65/journal/page | none observed |
| babdf23f0bf4a52e0000000000001e27 | 1001.947 | 0.090 | n/a | 0.000 | 0.000 | 0.327 | 1000.440 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 1.061 | 0.090 | 0.000 | 1.061 | gw-r/thread-41/journal/page | none observed |
| babdf23f0bf4a52e0000000000001cd6 | 1001.919 | 0.078 | n/a | 0.000 | 0.000 | 0.273 | 1000.456 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 1.084 | 0.078 | 0.000 | 1.084 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.066 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.915 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 |
| p99 | 206.640 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.849 | 204.847 | 3.901 | n/a | 0.792 | 0.000 | n/a | n/a | 0.387 | 0.000 | 0.000 | 0.387 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 225e49f3d343b6900000000000000059 | 206.640 | 0.000 | n/a | 0.000 | 0.000 | 2.236 | 204.078 | 0.013 | n/a | 0.052 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b690000000000000002d | 206.154 | 0.000 | n/a | 0.000 | 0.000 | 4.849 | 201.005 | 0.013 | n/a | 0.127 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b690000000000000002f | 205.862 | 0.000 | n/a | 0.000 | 0.000 | 3.858 | 201.683 | 0.021 | n/a | 0.194 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b6900000000000000018 | 205.679 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 204.335 | 0.014 | n/a | 0.400 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000031 | 205.621 | 0.000 | n/a | 0.000 | 0.000 | 0.474 | 204.847 | 0.028 | n/a | 0.174 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000025 | 205.320 | 0.000 | n/a | 0.000 | 0.000 | 1.029 | 203.804 | 0.054 | n/a | 0.341 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b690000000000000004f | 204.944 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 203.876 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000057 | 204.419 | 0.000 | n/a | 0.000 | 0.000 | 3.562 | 200.663 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000020 | 204.330 | 0.000 | n/a | 0.000 | 0.000 | 3.477 | 200.659 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000028 | 204.188 | 0.000 | n/a | 0.000 | 0.000 | 2.432 | 201.444 | 0.015 | n/a | 0.126 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000047 | 204.152 | 0.000 | n/a | 0.000 | 0.000 | 2.738 | 201.119 | 0.013 | n/a | 0.127 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000009 | 204.113 | 0.000 | n/a | 0.000 | 0.000 | 1.745 | 201.761 | 0.024 | n/a | 0.196 | 0.000 | n/a | n/a | 0.387 | 0.000 | 0.000 | 0.387 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000013 | 203.906 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 202.935 | 0.011 | n/a | 0.172 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b6900000000000000051 | 203.868 | 0.000 | n/a | 0.000 | 0.000 | 2.494 | 201.116 | 0.014 | n/a | 0.099 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b690000000000000004a | 203.828 | 0.000 | n/a | 0.000 | 0.000 | 1.921 | 201.573 | 0.103 | n/a | 0.139 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000000012 | 203.742 | 0.000 | n/a | 0.000 | 0.000 | 1.668 | 201.175 | 0.011 | n/a | 0.792 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000044 | 203.541 | 0.000 | n/a | 0.000 | 0.000 | 2.554 | 200.758 | 0.013 | n/a | 0.119 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b6900000000000000056 | 203.486 | 0.000 | n/a | 0.000 | 0.000 | 1.625 | 201.656 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000014 | 203.377 | 0.000 | n/a | 0.000 | 0.000 | 1.362 | 201.758 | 0.012 | n/a | 0.171 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000008 | 203.170 | 0.000 | n/a | 0.000 | 0.000 | 1.676 | 201.057 | 0.012 | n/a | 0.179 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.647 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 200.768 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 206.221 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.958 | 204.643 | 4.570 | n/a | 0.231 | 0.000 | n/a | n/a | 0.304 | 0.000 | 0.000 | 0.304 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 225e49f3d343b69000000000000000e5 | 207.257 | 0.000 | n/a | 0.000 | 0.000 | 3.958 | 203.116 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b69000000000000000bd | 206.503 | 0.000 | n/a | 0.000 | 0.000 | 3.857 | 202.295 | 0.018 | n/a | 0.145 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000079 | 206.221 | 0.000 | n/a | 0.000 | 0.000 | 2.428 | 203.589 | 0.014 | n/a | 0.094 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b69000000000000000fb | 205.650 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 204.762 | 0.013 | n/a | 0.126 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000062 | 205.613 | 0.000 | n/a | 0.000 | 0.000 | 0.739 | 204.662 | 0.012 | n/a | 0.055 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b690000000000000009f | 205.546 | 0.000 | n/a | 0.000 | 0.000 | 1.515 | 203.798 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b69000000000000000c3 | 205.498 | 0.000 | n/a | 0.000 | 0.000 | 3.748 | 201.469 | 0.013 | n/a | 0.091 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000102 | 205.441 | 0.000 | n/a | 0.000 | 0.000 | 4.404 | 200.768 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b69000000000000000e6 | 205.433 | 0.000 | n/a | 0.000 | 0.000 | 0.574 | 204.643 | 0.009 | n/a | 0.090 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b69000000000000000ad | 205.300 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 204.044 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.304 | 0.000 | 0.000 | 0.304 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000156 | 204.924 | 0.000 | n/a | 0.000 | 0.000 | 0.409 | 204.344 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b69000000000000000b1 | 204.608 | 0.000 | n/a | 0.000 | 0.000 | 1.706 | 202.645 | 0.014 | n/a | 0.128 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b690000000000000007c | 204.483 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 203.677 | 0.017 | n/a | 0.090 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b690000000000000011b | 204.390 | 0.000 | n/a | 0.000 | 0.000 | 2.774 | 201.368 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000098 | 204.217 | 0.000 | n/a | 0.000 | 0.000 | 0.683 | 203.283 | 0.025 | n/a | 0.116 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000061 | 203.940 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 202.823 | 0.025 | n/a | 0.242 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b690000000000000014b | 203.843 | 0.000 | n/a | 0.000 | 0.000 | 2.913 | 200.705 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b6900000000000000082 | 203.780 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 202.644 | 0.013 | n/a | 0.162 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000123 | 203.773 | 0.000 | n/a | 0.000 | 0.000 | 2.747 | 200.829 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000000076 | 203.598 | 0.000 | n/a | 0.000 | 0.000 | 2.323 | 201.002 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / read (222 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.413 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 200.654 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 205.068 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.055 | 203.184 | 2.293 | n/a | 0.122 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 225e49f3d343b6900000000000000177 | 205.839 | 0.000 | n/a | 0.000 | 0.000 | 0.375 | 205.301 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b690000000000000017a | 205.658 | 0.000 | n/a | 0.000 | 0.000 | 4.055 | 201.398 | 0.012 | n/a | 0.122 | 0.000 | n/a | n/a | 0.071 | 0.000 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b690000000000000017d | 205.068 | 0.000 | n/a | 0.000 | 0.000 | 4.288 | 200.570 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000235 | 204.802 | 0.000 | n/a | 0.000 | 0.000 | 0.408 | 204.285 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000196 | 204.106 | 0.000 | n/a | 0.000 | 0.000 | 0.710 | 203.184 | 0.011 | n/a | 0.077 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b69000000000000001a0 | 203.975 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 202.779 | 0.007 | n/a | 0.088 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000000238 | 203.821 | 0.000 | n/a | 0.000 | 0.000 | 2.772 | 200.884 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b69000000000000001eb | 203.514 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 202.551 | 0.013 | n/a | 0.059 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b690000000000000023a | 203.490 | 0.000 | n/a | 0.000 | 0.000 | 2.180 | 201.117 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b69000000000000001ce | 203.290 | 0.000 | n/a | 0.000 | 0.000 | 0.546 | 202.500 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b690000000000000019f | 203.144 | 0.000 | n/a | 0.000 | 0.000 | 2.480 | 200.529 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000208 | 203.087 | 0.000 | n/a | 0.000 | 0.000 | 1.619 | 201.224 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b69000000000000001e0 | 202.879 | 0.000 | n/a | 0.000 | 0.000 | 0.353 | 202.353 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000169 | 202.833 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 201.748 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000000222 | 202.788 | 0.000 | n/a | 0.000 | 0.000 | 1.691 | 200.783 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000172 | 202.757 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 201.352 | 0.013 | n/a | 0.117 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b69000000000000001ed | 202.744 | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 201.504 | 0.020 | n/a | 0.133 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000162 | 202.606 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 201.312 | 0.013 | n/a | 0.120 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b690000000000000020b | 202.550 | 0.000 | n/a | 0.000 | 0.000 | 1.500 | 200.894 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000183 | 202.541 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 201.569 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.887 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.519 | 81.325 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 |
| p99 | 206.334 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.185 | 203.831 | 2.244 | n/a | 0.140 | 0.000 | n/a | n/a | 50.257 | 0.000 | 0.000 | 50.257 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 225e49f3d343b690000000000000025b | 206.754 | 0.000 | n/a | 0.000 | 0.000 | 2.701 | 203.831 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000264 | 206.334 | 0.000 | n/a | 0.000 | 0.000 | 0.428 | 205.737 | 0.017 | n/a | 0.054 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000279 | 205.020 | 0.000 | n/a | 0.000 | 0.000 | 3.924 | 200.928 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000267 | 203.908 | 0.000 | n/a | 0.000 | 0.000 | 3.185 | 200.569 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000276 | 203.769 | 0.000 | n/a | 0.000 | 0.000 | 2.929 | 200.663 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000272 | 203.283 | 0.000 | n/a | 0.000 | 0.000 | 1.979 | 201.160 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b690000000000000027a | 202.592 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 201.747 | 0.011 | n/a | 0.153 | 0.000 | n/a | n/a | 0.056 | 0.000 | 0.000 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000299 | 202.406 | 0.000 | n/a | 0.000 | 0.000 | 0.287 | 201.950 | 0.014 | n/a | 0.075 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b690000000000000027b | 202.320 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 201.258 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000268 | 202.235 | 0.000 | n/a | 0.000 | 0.000 | 0.980 | 201.046 | 0.005 | n/a | 0.070 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b690000000000000029e | 202.230 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 201.322 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000274 | 202.221 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 200.990 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b690000000000000029a | 202.217 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 201.412 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000262 | 202.217 | 0.000 | n/a | 0.000 | 0.000 | 0.504 | 201.519 | 0.016 | n/a | 0.079 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000261 | 202.161 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 201.198 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000256 | 202.153 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 201.086 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b690000000000000026a | 202.068 | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 201.323 | 0.016 | n/a | 0.140 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000269 | 202.063 | 0.000 | n/a | 0.000 | 0.000 | 0.694 | 201.196 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b690000000000000028f | 202.058 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 200.898 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000000258 | 202.012 | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 200.794 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / read (147 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 93.691 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.427 | 93.332 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 204.092 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.377 | 202.317 | 4.136 | n/a | 0.075 | 0.000 | n/a | n/a | 50.812 | 0.000 | 0.000 | 50.812 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 225e49f3d343b6900000000000000e71 | 205.043 | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 204.400 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000eb0 | 204.092 | 0.000 | n/a | 0.000 | 0.000 | 3.377 | 200.499 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000eb4 | 202.763 | 0.000 | n/a | 0.000 | 0.000 | 0.291 | 202.317 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000ead | 202.361 | 0.000 | n/a | 0.000 | 0.000 | 1.712 | 200.440 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b6900000000000000ea9 | 201.956 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 201.193 | 0.002 | n/a | 0.030 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000e8a | 201.791 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 200.625 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b6900000000000000e94 | 201.622 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 200.580 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000e6a | 201.620 | 0.000 | n/a | 0.000 | 0.000 | 0.230 | 201.191 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000eaa | 201.610 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.928 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.071 | 0.000 | 0.000 | 0.071 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000e59 | 201.583 | 0.000 | n/a | 0.000 | 0.000 | 0.538 | 200.837 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000e5c | 201.570 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 200.856 | 0.015 | n/a | 0.052 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000e8d | 201.568 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.855 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000e5a | 201.551 | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 200.820 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-65/journal/page | none observed |
| 225e49f3d343b6900000000000000e87 | 201.547 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 200.730 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000e5b | 201.532 | 0.000 | n/a | 0.000 | 0.000 | 0.479 | 200.885 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000e8e | 201.532 | 0.000 | n/a | 0.000 | 0.000 | 0.417 | 200.953 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000e9d | 201.475 | 0.000 | n/a | 0.000 | 0.000 | 0.384 | 200.943 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b6900000000000000e84 | 201.427 | 0.000 | n/a | 0.000 | 0.000 | 0.588 | 200.671 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000e98 | 201.405 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 200.694 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-65/journal/page | none observed |
| 225e49f3d343b6900000000000000e6c | 201.380 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 200.662 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.072 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.436 | 200.494 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 |
| p99 | 203.949 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.098 | 202.297 | 1.952 | n/a | 0.099 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 225e49f3d343b6900000000000000f29 | 204.354 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 203.630 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000ecb | 204.353 | 0.000 | n/a | 0.000 | 0.000 | 0.546 | 203.652 | 0.013 | n/a | 0.041 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-65/journal/page | none observed |
| 225e49f3d343b6900000000000000fa5 | 203.949 | 0.000 | n/a | 0.000 | 0.000 | 3.227 | 200.645 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.058 | 0.000 | 0.000 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000f78 | 202.878 | 0.000 | n/a | 0.000 | 0.000 | 2.098 | 200.658 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000f02 | 202.786 | 0.000 | n/a | 0.000 | 0.000 | 0.342 | 202.297 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000ec3 | 202.782 | 0.000 | n/a | 0.000 | 0.000 | 1.789 | 200.846 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000ed4 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 201.763 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000f1b | 202.479 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 200.933 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000ec6 | 202.383 | 0.000 | n/a | 0.000 | 0.000 | 1.507 | 200.630 | 0.004 | n/a | 0.115 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| 225e49f3d343b6900000000000000f2d | 202.238 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 201.351 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000fb1 | 202.105 | 0.000 | n/a | 0.000 | 0.000 | 1.411 | 200.527 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000fa1 | 202.032 | 0.000 | n/a | 0.000 | 0.000 | 0.593 | 201.201 | 0.008 | n/a | 0.100 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000f23 | 202.029 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.022 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000f6e | 202.006 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 200.741 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.317 | 0.000 | 0.000 | 0.317 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000ecd | 201.999 | 0.000 | n/a | 0.000 | 0.000 | 0.456 | 201.398 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000ed9 | 201.954 | 0.000 | n/a | 0.000 | 0.000 | 0.683 | 201.054 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000f28 | 201.857 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 200.574 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000f6f | 201.834 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 201.115 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000ec9 | 201.788 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 200.552 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000000ebf | 201.740 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 200.990 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.065 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.422 | 200.484 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 |
| p99 | 202.611 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.264 | 201.995 | 3.536 | n/a | 0.086 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 225e49f3d343b6900000000000001074 | 203.786 | 0.000 | n/a | 0.000 | 0.000 | 3.249 | 200.434 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000000fcb | 202.665 | 0.000 | n/a | 0.000 | 0.000 | 0.408 | 202.140 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000001051 | 202.611 | 0.000 | n/a | 0.000 | 0.000 | 1.885 | 200.528 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000000ff4 | 202.594 | 0.000 | n/a | 0.000 | 0.000 | 0.489 | 201.948 | 0.006 | n/a | 0.086 | 0.000 | n/a | n/a | 0.066 | 0.000 | 0.000 | 0.066 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000001010 | 202.579 | 0.000 | n/a | 0.000 | 0.000 | 0.435 | 201.995 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-65/journal/page | none observed |
| 225e49f3d343b6900000000000000fd2 | 202.303 | 0.000 | n/a | 0.000 | 0.000 | 0.192 | 202.004 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.048 | 0.000 | 0.000 | 0.048 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000001000 | 202.049 | 0.000 | n/a | 0.000 | 0.000 | 0.420 | 201.475 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000fef | 202.025 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 201.193 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000001041 | 201.979 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 200.959 | 0.004 | n/a | 0.064 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000001038 | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 201.018 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000000fd6 | 201.946 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 200.952 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000001020 | 201.934 | 0.000 | n/a | 0.000 | 0.000 | 1.118 | 200.604 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b690000000000000104f | 201.839 | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 200.647 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b6900000000000000fbf | 201.835 | 0.000 | n/a | 0.000 | 0.000 | 0.488 | 201.192 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000000fb9 | 201.829 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 201.149 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000001084 | 201.813 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 200.982 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b69000000000000010b2 | 201.798 | 0.000 | n/a | 0.000 | 0.000 | 1.264 | 200.409 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b690000000000000103d | 201.788 | 0.000 | n/a | 0.000 | 0.000 | 0.274 | 201.338 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b69000000000000010a1 | 201.749 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 201.003 | 0.005 | n/a | 0.068 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b6900000000000000fdb | 201.711 | 0.000 | n/a | 0.000 | 0.000 | 0.392 | 201.149 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-41/journal/page | none observed |

## P3 / tail / read (850 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.425 | 200.469 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 |
| p99 | 203.518 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.282 | 201.308 | 1.233 | n/a | 0.092 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 225e49f3d343b690000000000000114e | 206.855 | 0.000 | n/a | 0.000 | 0.000 | 5.915 | 200.768 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| 225e49f3d343b6900000000000001205 | 205.083 | 0.000 | n/a | 0.000 | 0.000 | 3.969 | 200.896 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000001247 | 204.898 | 0.000 | n/a | 0.000 | 0.000 | 0.285 | 204.476 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b69000000000000012a5 | 204.727 | 0.000 | n/a | 0.000 | 0.000 | 0.466 | 204.102 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b6900000000000001162 | 204.590 | 0.000 | n/a | 0.000 | 0.000 | 0.453 | 204.018 | 0.007 | n/a | 0.017 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b69000000000000013aa | 204.514 | 0.000 | n/a | 0.000 | 0.000 | 3.732 | 200.566 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b690000000000000128f | 203.584 | 0.000 | n/a | 0.000 | 0.000 | 2.938 | 200.533 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b6900000000000001449 | 203.557 | 0.000 | n/a | 0.000 | 0.000 | 2.745 | 200.672 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-41/journal/page | none observed |
| 225e49f3d343b6900000000000001152 | 203.518 | 0.000 | n/a | 0.000 | 0.000 | 2.568 | 200.744 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-65/journal/page | none observed |
| 225e49f3d343b69000000000000011f8 | 203.420 | 0.000 | n/a | 0.000 | 0.000 | 2.640 | 200.656 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b6900000000000001384 | 203.028 | 0.000 | n/a | 0.000 | 0.000 | 2.090 | 200.804 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b690000000000000135b | 202.999 | 0.000 | n/a | 0.000 | 0.000 | 2.164 | 200.673 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 225e49f3d343b690000000000000128d | 202.996 | 0.000 | n/a | 0.000 | 0.000 | 2.097 | 200.753 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b690000000000000111b | 202.981 | 0.000 | n/a | 0.000 | 0.000 | 2.282 | 200.585 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-65/journal/page | none observed |
| 225e49f3d343b6900000000000001292 | 202.911 | 0.000 | n/a | 0.000 | 0.000 | 2.223 | 200.524 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b690000000000000138d | 202.734 | 0.000 | n/a | 0.000 | 0.000 | 2.058 | 200.556 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-43/journal/page | none observed |
| 225e49f3d343b69000000000000010c2 | 202.396 | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 201.374 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 225e49f3d343b69000000000000011f5 | 202.385 | 0.000 | n/a | 0.000 | 0.000 | 1.668 | 200.587 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 225e49f3d343b69000000000000012ce | 202.383 | 0.000 | n/a | 0.000 | 0.000 | 1.430 | 200.826 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 225e49f3d343b69000000000000012c4 | 202.370 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.301 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

## Writer heap, GC and scheduler stalls

Source 37997257638b4703c176245ddb0a2a1d795258aa; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 525.455 / 577.649 |
| GC events / total duration / maximum ms | 552 / 1346.682 / 32.159 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":540,"4":6,"8":6} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 42.073 / 17 / 1032.500 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

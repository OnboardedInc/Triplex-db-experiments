# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (30.245 ms, trace `4497799727c33d3700000000000002e9`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (19.476 ms, trace `4497799727c33d3700000000000000f1`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (36.498 ms, trace `4497799727c33d3700000000000002e8`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (36.103 ms, trace `4497799727c33d370000000000000549`); `node-14/thread-0/driver.queue.scheduler-late` (21.812 ms, trace `4497799727c33d370000000000000269`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-idle-b-2-sentinel`; source `a0785bcf96f7afea3965b3028db2e27f4fbef6a9`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 1249/1250 (99.920%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 1250/1250. Raw trace bytes: 20899446.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 4064 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 6001.894 | 1258.814 | 12.470 | 4049 |
| idle-10 | 0 | 2489.044 | 679.150 | 9.058 | 3042 |
| idle-25 | 0 | 4738.548 | 775.965 | 5.496 | 3034 |
| idle-50 | 0 | 8467.512 | 827.672 | 6.595 | 3034 |
| idle-100 | 0 | 15915.335 | 931.515 | 13.599 | 3034 |
| idle-250 | 0 | 38261.899 | 1242.531 | 27.980 | 3030 |
| idle-500 | 0 | 75510.375 | 1813.385 | 41.929 | 3034 |
| idle-1000 | 0 | 148008.082 | 2533.261 | 83.960 | 3012 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 4497799727c33d3700000000000002e9 | driver.queue.scheduler-dispatch | 0.052 | none | 1 / 32 |
| 4497799727c33d3700000000000002e9 | driver.queue.scheduler-late | 0.003 | none | 1 / 32 |

Observed active steps while trace 4497799727c33d3700000000000002e9 waited: []

| 4497799727c33d3700000000000000f1 | driver.queue.scheduler-late | 0.654 | none | 0 / 32 |
| 4497799727c33d3700000000000000f1 | driver.queue.scheduler-dispatch | 0.233 | none | 0 / 32 |

Observed active steps while trace 4497799727c33d3700000000000000f1 waited: []

| 4497799727c33d3700000000000002e8 | driver.queue.scheduler-late | 0.460 | none | 0 / 32 |
| 4497799727c33d3700000000000002e8 | driver.queue.scheduler-dispatch | 0.014 | none | 0 / 32 |

Observed active steps while trace 4497799727c33d3700000000000002e8 waited: []

| 4497799727c33d370000000000000549 | driver.queue.scheduler-dispatch | 0.048 | none | 0 / 32 |
| 4497799727c33d370000000000000549 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 4497799727c33d370000000000000549 waited: []

| 4497799727c33d370000000000000269 | driver.queue.scheduler-late | 21.812 | none | 0 / 32 |
| 4497799727c33d370000000000000269 | driver.queue.scheduler-dispatch | 0.042 | none | 0 / 32 |

Observed active steps while trace 4497799727c33d370000000000000269 waited: []

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.339 | 0.000 | 0.000 | 0.363 | 1.763 | n/a | 0.000 | 0.220 | 0.715 | 0.802 | 0.015 | 0.000 | 3.061 | 12.932 | 0.520 | n/a | 0.020 | 1.983 | 0.097 | 0.020 |
| p99 | 42.668 | 3.996 | 0.000 | 3.040 | 7.600 | n/a | 2.891 | 0.887 | 1.005 | 2.355 | 0.026 | 0.000 | 3.357 | 19.476 | 5.124 | n/a | 0.239 | 11.378 | 0.267 | 0.239 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d3700000000000000f1 | 42.668 | 7.600 | n/a | 2.891 | 0.887 | 0.715 | 2.355 | 0.026 | 0.000 | 3.357 | 19.476 | 5.124 | n/a | 0.239 | 11.378 | 0.267 | 0.239 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.008ms |
| 4497799727c33d37000000000000028c | 20.339 | 1.763 | n/a | 0.000 | 0.220 | 1.005 | 0.802 | 0.015 | 0.000 | 3.061 | 12.932 | 0.520 | n/a | 0.020 | 1.983 | 0.097 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms; driver.publication.persist-deferred 0.018ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.339 | 0.000 | 0.000 | 0.363 | 1.763 | n/a | 0.000 | 0.220 | 0.715 | 0.802 | 0.015 | 0.000 | 3.061 | 12.932 | 0.520 | n/a | 0.020 | 1.983 | 0.097 | 0.020 |
| p99 | 42.668 | 3.996 | 0.000 | 3.040 | 7.600 | n/a | 2.891 | 0.887 | 1.005 | 2.355 | 0.026 | 0.000 | 3.357 | 19.476 | 5.124 | n/a | 0.239 | 11.378 | 0.267 | 0.239 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d3700000000000000f1 | 42.668 | 7.600 | n/a | 2.891 | 0.887 | 0.715 | 2.355 | 0.026 | 0.000 | 3.357 | 19.476 | 5.124 | n/a | 0.239 | 11.378 | 0.267 | 0.239 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.008ms |
| 4497799727c33d37000000000000028c | 20.339 | 1.763 | n/a | 0.000 | 0.220 | 1.005 | 0.802 | 0.015 | 0.000 | 3.061 | 12.932 | 0.520 | n/a | 0.020 | 1.983 | 0.097 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms; driver.publication.persist-deferred 0.018ms |

## P2 / warmup / commit (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.231 | 0.573 | 0.000 | 0.529 | 2.261 | n/a | 0.000 | 0.048 | 0.770 | 1.424 | 0.020 | 0.000 | 0.160 | 5.470 | 0.585 | n/a | 0.021 | 2.399 | 0.201 | 0.021 |
| p99 | 31.255 | 2.005 | 0.019 | 1.814 | 4.681 | n/a | 1.346 | 1.388 | 2.760 | 5.789 | 0.114 | 0.000 | 3.546 | 18.199 | 5.709 | n/a | 0.058 | 5.129 | 0.364 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000269 | 35.333 | 2.147 | n/a | 0.000 | 21.854 | 0.987 | 2.772 | 0.021 | 0.000 | 0.082 | 6.865 | 0.583 | n/a | 0.023 | 24.001 | 0.679 | 0.023 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.100ms |
| 4497799727c33d3700000000000000f2 | 33.518 | 3.646 | n/a | 1.418 | 0.065 | 1.368 | 1.461 | 0.021 | 0.000 | 3.546 | 19.136 | 2.809 | n/a | 0.046 | 5.129 | 0.153 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.692ms; driver.publication.readback 0.341ms; driver.publication.persist-deferred 0.070ms |
| 4497799727c33d37000000000000019e | 31.255 | 3.244 | n/a | 0.000 | 0.079 | 0.989 | 5.194 | 0.020 | 14.814 | 0.070 | 6.263 | 0.523 | n/a | 0.058 | 3.323 | 0.106 | 0.058 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.088ms |
| 4497799727c33d37000000000000028b | 29.593 | 3.388 | n/a | 0.000 | 0.100 | 0.843 | 5.045 | 0.019 | 0.000 | 0.075 | 18.733 | 1.346 | n/a | 0.043 | 3.489 | 0.118 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms |
| 4497799727c33d3700000000000001f5 | 25.325 | 3.953 | n/a | 0.000 | 0.058 | 0.599 | 1.152 | 0.020 | 0.000 | 0.455 | 9.329 | 9.732 | n/a | 0.026 | 4.011 | 0.158 | 0.026 | tx/thread-84/transactor.triplex-function | none observed |
| 4497799727c33d3700000000000000f7 | 25.017 | 4.563 | n/a | 1.280 | 0.126 | 0.916 | 4.624 | 0.038 | 0.000 | 0.783 | 11.251 | 1.383 | n/a | 0.053 | 5.969 | 0.239 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000001d9 | 23.548 | 1.876 | n/a | 0.000 | 0.030 | 1.189 | 0.962 | 0.019 | 0.000 | 0.049 | 18.199 | 1.209 | n/a | 0.016 | 1.906 | 0.081 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000112 | 21.672 | 4.950 | n/a | 0.000 | 0.093 | 0.822 | 5.354 | 0.034 | 0.000 | 0.291 | 9.436 | 0.654 | n/a | 0.039 | 5.043 | 0.233 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 4497799727c33d370000000000000147 | 21.357 | 1.893 | n/a | 0.000 | 0.030 | 0.671 | 5.789 | 0.036 | 0.000 | 0.138 | 12.196 | 0.590 | n/a | 0.015 | 1.922 | 0.090 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000001f3 | 21.171 | 2.148 | n/a | 0.000 | 0.091 | 0.790 | 5.339 | 0.047 | 0.000 | 0.127 | 11.560 | 1.029 | n/a | 0.038 | 2.240 | 0.106 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000261 | 20.692 | 3.217 | n/a | 0.000 | 0.094 | 0.968 | 2.118 | 0.053 | 0.000 | 0.135 | 12.931 | 1.143 | n/a | 0.033 | 3.311 | 0.160 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| 4497799727c33d37000000000000013d | 20.668 | 2.702 | n/a | 0.000 | 0.067 | 1.743 | 1.239 | 0.020 | 0.000 | 0.082 | 13.453 | 1.334 | n/a | 0.029 | 2.769 | 0.134 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |
| 4497799727c33d37000000000000023b | 20.174 | 2.794 | n/a | 0.000 | 0.052 | 2.760 | 1.296 | 0.018 | 0.000 | 0.075 | 11.490 | 1.663 | n/a | 0.026 | 2.846 | 0.141 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000001fb | 20.103 | 1.887 | n/a | 0.000 | 0.043 | 0.631 | 1.395 | 0.018 | 0.000 | 0.093 | 14.851 | 1.165 | n/a | 0.020 | 1.930 | 0.096 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000235 | 19.969 | 3.199 | n/a | 0.000 | 0.075 | 0.801 | 1.572 | 0.017 | 0.000 | 0.296 | 7.159 | 6.819 | n/a | 0.031 | 3.274 | 0.164 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000000fa | 19.960 | 2.573 | n/a | 0.000 | 0.283 | 0.662 | 1.627 | 0.023 | 0.000 | 2.798 | 6.419 | 5.558 | n/a | 0.015 | 2.856 | 0.143 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.019ms; driver.reader-basis.broadcast 0.015ms |
| 4497799727c33d37000000000000023d | 19.743 | 2.545 | n/a | 0.000 | 0.062 | 0.880 | 2.242 | 0.044 | 0.000 | 0.218 | 12.593 | 1.125 | n/a | 0.034 | 2.607 | 0.132 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000222 | 19.711 | 2.458 | n/a | 0.000 | 0.023 | 0.758 | 1.569 | 0.049 | 0.000 | 0.156 | 10.892 | 3.791 | n/a | 0.015 | 2.480 | 0.126 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000116 | 19.438 | 2.371 | n/a | 0.000 | 0.055 | 0.948 | 5.147 | 0.067 | 0.000 | 0.225 | 6.944 | 3.656 | n/a | 0.024 | 2.426 | 0.125 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000288 | 19.424 | 4.681 | n/a | 0.000 | 0.093 | 1.037 | 5.331 | 0.037 | 0.000 | 0.593 | 7.057 | 0.552 | n/a | 0.042 | 4.774 | 0.246 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.231 | 0.573 | 0.000 | 0.529 | 2.261 | n/a | 0.000 | 0.048 | 0.770 | 1.424 | 0.020 | 0.000 | 0.160 | 5.470 | 0.585 | n/a | 0.021 | 2.399 | 0.201 | 0.021 |
| p99 | 31.255 | 2.005 | 0.019 | 1.814 | 4.681 | n/a | 1.346 | 1.388 | 2.760 | 5.789 | 0.114 | 0.000 | 3.546 | 18.199 | 5.709 | n/a | 0.058 | 5.129 | 0.364 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000269 | 35.333 | 2.147 | n/a | 0.000 | 21.854 | 0.987 | 2.772 | 0.021 | 0.000 | 0.082 | 6.865 | 0.583 | n/a | 0.023 | 24.001 | 0.679 | 0.023 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.100ms |
| 4497799727c33d3700000000000000f2 | 33.518 | 3.646 | n/a | 1.418 | 0.065 | 1.368 | 1.461 | 0.021 | 0.000 | 3.546 | 19.136 | 2.809 | n/a | 0.046 | 5.129 | 0.153 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.692ms; driver.publication.readback 0.341ms; driver.publication.persist-deferred 0.070ms |
| 4497799727c33d37000000000000019e | 31.255 | 3.244 | n/a | 0.000 | 0.079 | 0.989 | 5.194 | 0.020 | 14.814 | 0.070 | 6.263 | 0.523 | n/a | 0.058 | 3.323 | 0.106 | 0.058 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.088ms |
| 4497799727c33d37000000000000028b | 29.593 | 3.388 | n/a | 0.000 | 0.100 | 0.843 | 5.045 | 0.019 | 0.000 | 0.075 | 18.733 | 1.346 | n/a | 0.043 | 3.489 | 0.118 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms |
| 4497799727c33d3700000000000001f5 | 25.325 | 3.953 | n/a | 0.000 | 0.058 | 0.599 | 1.152 | 0.020 | 0.000 | 0.455 | 9.329 | 9.732 | n/a | 0.026 | 4.011 | 0.158 | 0.026 | tx/thread-84/transactor.triplex-function | none observed |
| 4497799727c33d3700000000000000f7 | 25.017 | 4.563 | n/a | 1.280 | 0.126 | 0.916 | 4.624 | 0.038 | 0.000 | 0.783 | 11.251 | 1.383 | n/a | 0.053 | 5.969 | 0.239 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000001d9 | 23.548 | 1.876 | n/a | 0.000 | 0.030 | 1.189 | 0.962 | 0.019 | 0.000 | 0.049 | 18.199 | 1.209 | n/a | 0.016 | 1.906 | 0.081 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000112 | 21.672 | 4.950 | n/a | 0.000 | 0.093 | 0.822 | 5.354 | 0.034 | 0.000 | 0.291 | 9.436 | 0.654 | n/a | 0.039 | 5.043 | 0.233 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 4497799727c33d370000000000000147 | 21.357 | 1.893 | n/a | 0.000 | 0.030 | 0.671 | 5.789 | 0.036 | 0.000 | 0.138 | 12.196 | 0.590 | n/a | 0.015 | 1.922 | 0.090 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000001f3 | 21.171 | 2.148 | n/a | 0.000 | 0.091 | 0.790 | 5.339 | 0.047 | 0.000 | 0.127 | 11.560 | 1.029 | n/a | 0.038 | 2.240 | 0.106 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000261 | 20.692 | 3.217 | n/a | 0.000 | 0.094 | 0.968 | 2.118 | 0.053 | 0.000 | 0.135 | 12.931 | 1.143 | n/a | 0.033 | 3.311 | 0.160 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| 4497799727c33d37000000000000013d | 20.668 | 2.702 | n/a | 0.000 | 0.067 | 1.743 | 1.239 | 0.020 | 0.000 | 0.082 | 13.453 | 1.334 | n/a | 0.029 | 2.769 | 0.134 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |
| 4497799727c33d37000000000000023b | 20.174 | 2.794 | n/a | 0.000 | 0.052 | 2.760 | 1.296 | 0.018 | 0.000 | 0.075 | 11.490 | 1.663 | n/a | 0.026 | 2.846 | 0.141 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000001fb | 20.103 | 1.887 | n/a | 0.000 | 0.043 | 0.631 | 1.395 | 0.018 | 0.000 | 0.093 | 14.851 | 1.165 | n/a | 0.020 | 1.930 | 0.096 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000235 | 19.969 | 3.199 | n/a | 0.000 | 0.075 | 0.801 | 1.572 | 0.017 | 0.000 | 0.296 | 7.159 | 6.819 | n/a | 0.031 | 3.274 | 0.164 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000000fa | 19.960 | 2.573 | n/a | 0.000 | 0.283 | 0.662 | 1.627 | 0.023 | 0.000 | 2.798 | 6.419 | 5.558 | n/a | 0.015 | 2.856 | 0.143 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.019ms; driver.reader-basis.broadcast 0.015ms |
| 4497799727c33d37000000000000023d | 19.743 | 2.545 | n/a | 0.000 | 0.062 | 0.880 | 2.242 | 0.044 | 0.000 | 0.218 | 12.593 | 1.125 | n/a | 0.034 | 2.607 | 0.132 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000222 | 19.711 | 2.458 | n/a | 0.000 | 0.023 | 0.758 | 1.569 | 0.049 | 0.000 | 0.156 | 10.892 | 3.791 | n/a | 0.015 | 2.480 | 0.126 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000116 | 19.438 | 2.371 | n/a | 0.000 | 0.055 | 0.948 | 5.147 | 0.067 | 0.000 | 0.225 | 6.944 | 3.656 | n/a | 0.024 | 2.426 | 0.125 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000288 | 19.424 | 4.681 | n/a | 0.000 | 0.093 | 1.037 | 5.331 | 0.037 | 0.000 | 0.593 | 7.057 | 0.552 | n/a | 0.042 | 4.774 | 0.246 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-10 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.391 | 0.000 | 0.000 | 0.461 | 1.970 | n/a | 0.000 | 0.048 | 0.719 | 1.293 | 0.020 | 0.000 | 0.179 | 5.780 | 0.503 | n/a | 0.019 | 2.230 | 0.180 | 0.019 |
| p99 | 42.139 | 1.966 | 0.052 | 0.919 | 3.778 | n/a | 0.000 | 2.334 | 5.430 | 4.549 | 0.059 | 0.000 | 3.336 | 30.245 | 6.356 | n/a | 0.065 | 4.524 | 0.401 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d3700000000000002e9 | 45.963 | 2.319 | n/a | 0.000 | 0.055 | 5.982 | 0.910 | 0.017 | 0.000 | 0.056 | 30.245 | 6.356 | n/a | 0.023 | 2.375 | 0.052 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.047ms; driver.publication.persist-deferred 0.018ms |
| 4497799727c33d3700000000000002e8 | 42.139 | 1.869 | n/a | 0.000 | 0.474 | 1.225 | 1.450 | 0.020 | 0.000 | 0.102 | 36.498 | 0.487 | n/a | 0.014 | 2.343 | 0.056 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.175ms; driver.publication.persist-deferred 0.025ms |
| 4497799727c33d3700000000000002ea | 30.988 | 2.440 | n/a | 0.000 | 0.057 | 0.707 | 1.110 | 0.028 | 0.000 | 0.395 | 25.464 | 0.760 | n/a | 0.026 | 2.498 | 0.081 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.018ms |
| 4497799727c33d3700000000000002eb | 25.173 | 2.191 | n/a | 0.000 | 0.048 | 5.430 | 0.772 | 0.015 | 0.000 | 0.325 | 15.945 | 0.422 | n/a | 0.024 | 2.239 | 0.089 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.047ms; driver.publication.persist-deferred 0.018ms |
| 4497799727c33d370000000000000348 | 20.900 | 3.053 | n/a | 0.000 | 0.080 | 0.734 | 0.955 | 0.015 | 0.000 | 0.049 | 15.317 | 0.661 | n/a | 0.036 | 3.133 | 0.150 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.031ms |
| 4497799727c33d37000000000000034c | 20.348 | 2.331 | n/a | 0.000 | 1.000 | 0.541 | 1.011 | 0.015 | 0.000 | 0.374 | 10.028 | 5.036 | n/a | 0.012 | 3.331 | 0.164 | 0.012 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d3700000000000002d6 | 19.769 | 2.649 | n/a | 0.000 | 0.085 | 0.754 | 1.946 | 0.017 | 0.000 | 0.061 | 13.162 | 1.085 | n/a | 0.010 | 2.734 | 0.138 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.082ms; driver.publication.readback 0.049ms |
| 4497799727c33d37000000000000034a | 19.755 | 1.754 | n/a | 0.000 | 0.048 | 0.843 | 1.370 | 0.015 | 0.000 | 1.104 | 7.453 | 7.147 | n/a | 0.022 | 1.802 | 0.091 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.018ms |
| 4497799727c33d37000000000000038f | 19.183 | 1.582 | n/a | 0.000 | 0.028 | 3.866 | 1.081 | 0.015 | 0.000 | 0.063 | 7.971 | 4.567 | n/a | 0.010 | 1.609 | 0.084 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.019ms |
| 4497799727c33d370000000000000390 | 18.600 | 1.682 | n/a | 0.000 | 0.034 | 0.422 | 1.408 | 0.059 | 0.000 | 0.055 | 14.476 | 0.448 | n/a | 0.016 | 1.716 | 0.092 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.015ms |
| 4497799727c33d3700000000000002a6 | 18.532 | 2.764 | n/a | 0.000 | 0.034 | 0.707 | 4.352 | 0.052 | 0.000 | 0.094 | 10.029 | 0.478 | n/a | 0.024 | 2.798 | 0.151 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.096ms |
| 4497799727c33d370000000000000293 | 18.372 | 2.482 | n/a | 0.000 | 0.033 | 0.717 | 2.022 | 0.112 | 0.000 | 0.121 | 12.336 | 0.533 | n/a | 0.016 | 2.515 | 0.137 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d370000000000000342 | 18.235 | 2.453 | n/a | 0.000 | 0.055 | 0.934 | 1.743 | 0.040 | 0.000 | 1.563 | 10.281 | 1.140 | n/a | 0.025 | 2.508 | 0.138 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d370000000000000299 | 17.719 | 1.801 | n/a | 0.000 | 0.030 | 0.645 | 1.681 | 0.050 | 0.000 | 0.103 | 12.941 | 0.451 | n/a | 0.018 | 1.831 | 0.103 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.017ms |
| 4497799727c33d370000000000000358 | 17.302 | 1.837 | n/a | 0.000 | 0.035 | 2.270 | 1.234 | 0.016 | 0.000 | 0.471 | 10.234 | 1.187 | n/a | 0.018 | 1.872 | 0.108 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.016ms |
| 4497799727c33d370000000000000389 | 16.920 | 3.653 | n/a | 0.000 | 0.055 | 0.971 | 1.068 | 0.020 | 0.000 | 0.164 | 10.488 | 0.469 | n/a | 0.034 | 3.708 | 0.219 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000002ec | 16.684 | 1.564 | n/a | 0.000 | 0.044 | 2.478 | 1.688 | 0.051 | 0.000 | 0.115 | 10.259 | 0.464 | n/a | 0.021 | 1.608 | 0.096 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.047ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.011ms; driver.publication.persist-deferred 0.004ms |
| 4497799727c33d370000000000000371 | 16.568 | 1.718 | n/a | 0.000 | 0.015 | 1.042 | 1.694 | 0.031 | 0.000 | 0.116 | 10.955 | 0.984 | n/a | 0.012 | 1.734 | 0.105 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms |
| 4497799727c33d3700000000000002a7 | 16.486 | 1.825 | n/a | 0.000 | 0.059 | 0.692 | 5.659 | 0.017 | 0.000 | 0.068 | 7.390 | 0.752 | n/a | 0.024 | 1.884 | 0.114 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.015ms |
| 4497799727c33d37000000000000028d | 16.379 | 3.069 | n/a | 0.000 | 0.090 | 4.655 | 2.873 | 0.018 | 0.000 | 0.361 | 4.808 | 0.468 | n/a | 0.038 | 3.159 | 0.193 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.076ms; driver.publication.readback 0.020ms; driver.publication.persist-deferred 0.018ms |

## P2 / idle-10 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.391 | 0.000 | 0.000 | 0.461 | 1.970 | n/a | 0.000 | 0.048 | 0.719 | 1.293 | 0.020 | 0.000 | 0.179 | 5.780 | 0.503 | n/a | 0.019 | 2.230 | 0.180 | 0.019 |
| p99 | 42.139 | 1.966 | 0.052 | 0.919 | 3.778 | n/a | 0.000 | 2.334 | 5.430 | 4.549 | 0.059 | 0.000 | 3.336 | 30.245 | 6.356 | n/a | 0.065 | 4.524 | 0.401 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d3700000000000002e9 | 45.963 | 2.319 | n/a | 0.000 | 0.055 | 5.982 | 0.910 | 0.017 | 0.000 | 0.056 | 30.245 | 6.356 | n/a | 0.023 | 2.375 | 0.052 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.047ms; driver.publication.persist-deferred 0.018ms |
| 4497799727c33d3700000000000002e8 | 42.139 | 1.869 | n/a | 0.000 | 0.474 | 1.225 | 1.450 | 0.020 | 0.000 | 0.102 | 36.498 | 0.487 | n/a | 0.014 | 2.343 | 0.056 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.175ms; driver.publication.persist-deferred 0.025ms |
| 4497799727c33d3700000000000002ea | 30.988 | 2.440 | n/a | 0.000 | 0.057 | 0.707 | 1.110 | 0.028 | 0.000 | 0.395 | 25.464 | 0.760 | n/a | 0.026 | 2.498 | 0.081 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.018ms |
| 4497799727c33d3700000000000002eb | 25.173 | 2.191 | n/a | 0.000 | 0.048 | 5.430 | 0.772 | 0.015 | 0.000 | 0.325 | 15.945 | 0.422 | n/a | 0.024 | 2.239 | 0.089 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.047ms; driver.publication.persist-deferred 0.018ms |
| 4497799727c33d370000000000000348 | 20.900 | 3.053 | n/a | 0.000 | 0.080 | 0.734 | 0.955 | 0.015 | 0.000 | 0.049 | 15.317 | 0.661 | n/a | 0.036 | 3.133 | 0.150 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.031ms |
| 4497799727c33d37000000000000034c | 20.348 | 2.331 | n/a | 0.000 | 1.000 | 0.541 | 1.011 | 0.015 | 0.000 | 0.374 | 10.028 | 5.036 | n/a | 0.012 | 3.331 | 0.164 | 0.012 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d3700000000000002d6 | 19.769 | 2.649 | n/a | 0.000 | 0.085 | 0.754 | 1.946 | 0.017 | 0.000 | 0.061 | 13.162 | 1.085 | n/a | 0.010 | 2.734 | 0.138 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.082ms; driver.publication.readback 0.049ms |
| 4497799727c33d37000000000000034a | 19.755 | 1.754 | n/a | 0.000 | 0.048 | 0.843 | 1.370 | 0.015 | 0.000 | 1.104 | 7.453 | 7.147 | n/a | 0.022 | 1.802 | 0.091 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.018ms |
| 4497799727c33d37000000000000038f | 19.183 | 1.582 | n/a | 0.000 | 0.028 | 3.866 | 1.081 | 0.015 | 0.000 | 0.063 | 7.971 | 4.567 | n/a | 0.010 | 1.609 | 0.084 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.019ms |
| 4497799727c33d370000000000000390 | 18.600 | 1.682 | n/a | 0.000 | 0.034 | 0.422 | 1.408 | 0.059 | 0.000 | 0.055 | 14.476 | 0.448 | n/a | 0.016 | 1.716 | 0.092 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.015ms |
| 4497799727c33d3700000000000002a6 | 18.532 | 2.764 | n/a | 0.000 | 0.034 | 0.707 | 4.352 | 0.052 | 0.000 | 0.094 | 10.029 | 0.478 | n/a | 0.024 | 2.798 | 0.151 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.096ms |
| 4497799727c33d370000000000000293 | 18.372 | 2.482 | n/a | 0.000 | 0.033 | 0.717 | 2.022 | 0.112 | 0.000 | 0.121 | 12.336 | 0.533 | n/a | 0.016 | 2.515 | 0.137 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d370000000000000342 | 18.235 | 2.453 | n/a | 0.000 | 0.055 | 0.934 | 1.743 | 0.040 | 0.000 | 1.563 | 10.281 | 1.140 | n/a | 0.025 | 2.508 | 0.138 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d370000000000000299 | 17.719 | 1.801 | n/a | 0.000 | 0.030 | 0.645 | 1.681 | 0.050 | 0.000 | 0.103 | 12.941 | 0.451 | n/a | 0.018 | 1.831 | 0.103 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.017ms |
| 4497799727c33d370000000000000358 | 17.302 | 1.837 | n/a | 0.000 | 0.035 | 2.270 | 1.234 | 0.016 | 0.000 | 0.471 | 10.234 | 1.187 | n/a | 0.018 | 1.872 | 0.108 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.100ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.016ms |
| 4497799727c33d370000000000000389 | 16.920 | 3.653 | n/a | 0.000 | 0.055 | 0.971 | 1.068 | 0.020 | 0.000 | 0.164 | 10.488 | 0.469 | n/a | 0.034 | 3.708 | 0.219 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000002ec | 16.684 | 1.564 | n/a | 0.000 | 0.044 | 2.478 | 1.688 | 0.051 | 0.000 | 0.115 | 10.259 | 0.464 | n/a | 0.021 | 1.608 | 0.096 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.047ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.011ms; driver.publication.persist-deferred 0.004ms |
| 4497799727c33d370000000000000371 | 16.568 | 1.718 | n/a | 0.000 | 0.015 | 1.042 | 1.694 | 0.031 | 0.000 | 0.116 | 10.955 | 0.984 | n/a | 0.012 | 1.734 | 0.105 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms |
| 4497799727c33d3700000000000002a7 | 16.486 | 1.825 | n/a | 0.000 | 0.059 | 0.692 | 5.659 | 0.017 | 0.000 | 0.068 | 7.390 | 0.752 | n/a | 0.024 | 1.884 | 0.114 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.015ms |
| 4497799727c33d37000000000000028d | 16.379 | 3.069 | n/a | 0.000 | 0.090 | 4.655 | 2.873 | 0.018 | 0.000 | 0.361 | 4.808 | 0.468 | n/a | 0.038 | 3.159 | 0.193 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.193ms; driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.076ms; driver.publication.readback 0.020ms; driver.publication.persist-deferred 0.018ms |

## P2/P4 / read-your-own-write / read (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.892 | n/a | n/a | n/a | 11.855 | 0.503 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 13.718 | 0.998 | 0.010 |
| p99 | 34.542 | n/a | n/a | n/a | 21.467 | 7.594 | 1.605 | 0.000 | 16.269 | 8.731 | 0.007 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.064 | 29.590 | 0.999 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000119 | 34.542 | 15.470 | 1.230 | 0.662 | 0.000 | 16.269 | 0.880 | 0.006 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.008 | 17.363 | 0.503 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.120ms; driver.publication.readback 0.062ms; driver.reader-basis.broadcast 0.031ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.015ms |
| 4497799727c33d3700000000000000f6 | 33.115 | 21.467 | 6.517 | 1.605 | 0.000 | 2.656 | 0.846 | 0.005 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.009 | 29.590 | 0.894 | 0.009 | node-14/thread-2/replica.pull-at | driver.expected-state.bind-receipt 1.640ms; driver.publication.readback 0.074ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.019ms |
| 4497799727c33d3700000000000001fc | 28.017 | 14.582 | 0.409 | 0.803 | 0.000 | 3.443 | 8.731 | 0.003 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.009 | 15.794 | 0.564 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.072ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| 4497799727c33d37000000000000011c | 25.790 | 16.264 | 5.778 | 1.159 | 0.000 | 1.814 | 0.733 | 0.007 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.017 | 23.201 | 0.900 | 0.017 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.120ms; driver.reader-basis.broadcast 0.031ms; driver.publication.persist-deferred 0.030ms |
| 4497799727c33d3700000000000007c3 | 20.253 | 15.919 | 0.503 | 0.855 | 0.000 | 1.288 | 1.650 | 0.001 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.013 | 17.277 | 0.853 | 0.013 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.021ms |
| 4497799727c33d37000000000000028f | 19.383 | 11.735 | 0.364 | 0.375 | 0.000 | 3.234 | 3.644 | 0.007 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.006 | 12.473 | 0.643 | 0.006 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.076ms; driver.publication.readback 0.071ms; driver.publication.readback 0.039ms; driver.publication.readback 0.020ms |
| 4497799727c33d3700000000000005c5 | 19.053 | 13.999 | 0.368 | 0.517 | 0.000 | 3.563 | 0.581 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.008 | 14.884 | 0.781 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.015ms |
| 4497799727c33d370000000000000291 | 15.061 | 14.024 | 1.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 15.053 | 0.999 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.071ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d370000000000000111 | 14.662 | 11.860 | 2.792 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 14.652 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d370000000000000144 | 14.550 | 12.250 | 2.290 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 14.540 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.016ms |
| 4497799727c33d37000000000000067e | 14.358 | 14.280 | 0.068 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 14.347 | 0.999 | 0.011 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d370000000000000105 | 13.892 | 11.149 | 2.734 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 13.883 | 0.999 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.144ms; driver.publication.persist-deferred 0.054ms |
| 4497799727c33d370000000000000262 | 13.729 | 6.124 | 7.594 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 13.718 | 0.999 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.131ms; driver.publication.persist-deferred 0.016ms |
| 4497799727c33d3700000000000000f3 | 13.657 | 12.867 | 0.753 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 13.620 | 0.997 | 0.037 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.341ms; driver.publication.persist-deferred 0.070ms |
| 4497799727c33d3700000000000001ff | 11.957 | 11.855 | 0.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 11.948 | 0.999 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.017ms |
| 4497799727c33d3700000000000001a7 | 11.634 | 11.569 | 0.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 11.626 | 0.999 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d370000000000000365 | 11.160 | 11.051 | 0.098 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 11.149 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.068ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.014ms; driver.publication.persist-deferred 0.013ms |
| 4497799727c33d370000000000000294 | 11.032 | 5.721 | 5.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 11.023 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.014ms |
| 4497799727c33d37000000000000012b | 10.308 | 10.165 | 0.079 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.064 | 10.244 | 0.994 | 0.064 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.021ms |
| 4497799727c33d37000000000000010d | 10.138 | 10.010 | 0.119 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 10.129 | 0.999 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.015ms |

## P2 / idle-25 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.046 | 0.159 | 0.000 | 0.487 | 2.026 | n/a | 0.000 | 0.039 | 0.674 | 1.242 | 0.015 | 0.000 | 0.181 | 4.218 | 0.470 | n/a | 0.019 | 2.149 | 0.221 | 0.019 |
| p99 | 20.580 | 1.999 | 0.029 | 1.133 | 3.792 | n/a | 0.000 | 1.315 | 3.531 | 5.436 | 0.052 | 0.000 | 3.208 | 13.304 | 1.650 | n/a | 0.045 | 4.542 | 0.434 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d3700000000000004b5 | 33.297 | 3.500 | n/a | 0.000 | 0.074 | 0.938 | 4.864 | 0.030 | 14.457 | 0.089 | 8.831 | 0.479 | n/a | 0.036 | 3.574 | 0.107 | 0.036 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 4497799727c33d3700000000000003db | 20.580 | 3.048 | n/a | 0.000 | 0.890 | 0.840 | 1.811 | 0.029 | 0.000 | 0.104 | 13.332 | 0.508 | n/a | 0.019 | 3.938 | 0.191 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000438 | 19.835 | 3.212 | n/a | 0.000 | 1.330 | 1.189 | 1.287 | 0.014 | 0.000 | 0.089 | 11.787 | 0.912 | n/a | 0.014 | 4.542 | 0.229 | 0.014 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000003d4 | 18.969 | 2.331 | n/a | 0.000 | 0.042 | 1.975 | 7.968 | 0.015 | 0.000 | 0.065 | 5.587 | 0.965 | n/a | 0.021 | 2.373 | 0.125 | 0.021 | gw-w/thread-48/gateway /v1/db/{db}/transact | driver.reader-basis.broadcast 0.048ms |
| 4497799727c33d3700000000000003d9 | 18.671 | 1.730 | n/a | 0.000 | 0.047 | 0.802 | 1.659 | 0.025 | 0.000 | 0.100 | 13.304 | 0.984 | n/a | 0.020 | 1.778 | 0.095 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000004ce | 17.998 | 2.933 | n/a | 0.000 | 0.073 | 2.176 | 4.877 | 0.028 | 0.000 | 0.105 | 6.813 | 0.963 | n/a | 0.030 | 3.006 | 0.167 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000003dd | 17.851 | 1.817 | n/a | 0.000 | 0.039 | 0.770 | 1.994 | 0.028 | 0.000 | 2.508 | 9.301 | 1.371 | n/a | 0.023 | 1.856 | 0.104 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 4497799727c33d3700000000000003f7 | 16.544 | 3.136 | n/a | 0.000 | 0.080 | 0.723 | 4.260 | 0.016 | 0.000 | 0.065 | 7.833 | 0.396 | n/a | 0.034 | 3.216 | 0.194 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000456 | 16.079 | 1.628 | n/a | 0.000 | 0.030 | 0.579 | 4.720 | 0.016 | 0.000 | 0.061 | 8.133 | 0.897 | n/a | 0.015 | 1.658 | 0.103 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 4497799727c33d370000000000000458 | 15.460 | 2.369 | n/a | 0.000 | 0.048 | 0.686 | 4.961 | 0.048 | 0.000 | 3.270 | 3.601 | 0.458 | n/a | 0.020 | 2.417 | 0.156 | 0.020 | gw-w/thread-51/commit.prepare-and-validate | none observed |
| 4497799727c33d3700000000000004bf | 14.987 | 1.773 | n/a | 0.000 | 0.028 | 0.386 | 4.996 | 0.014 | 0.000 | 0.062 | 7.259 | 0.455 | n/a | 0.014 | 1.801 | 0.120 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| 4497799727c33d3700000000000004da | 14.868 | 1.914 | n/a | 0.000 | 0.029 | 0.648 | 1.633 | 0.026 | 0.000 | 0.101 | 10.030 | 0.470 | n/a | 0.017 | 1.943 | 0.131 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000003d0 | 14.350 | 1.730 | n/a | 0.000 | 0.050 | 0.572 | 2.413 | 0.018 | 0.000 | 0.094 | 8.502 | 0.950 | n/a | 0.021 | 1.780 | 0.124 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000044a | 14.290 | 3.048 | n/a | 0.000 | 0.104 | 0.772 | 4.267 | 0.065 | 0.000 | 0.139 | 4.727 | 1.124 | n/a | 0.045 | 3.152 | 0.221 | 0.045 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000415 | 14.123 | 1.760 | n/a | 0.000 | 0.042 | 0.501 | 4.911 | 0.018 | 0.000 | 0.071 | 6.349 | 0.453 | n/a | 0.019 | 1.802 | 0.128 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 4497799727c33d370000000000000464 | 13.722 | 1.771 | n/a | 0.000 | 0.035 | 0.675 | 1.564 | 0.026 | 0.000 | 0.662 | 8.020 | 0.952 | n/a | 0.016 | 1.806 | 0.132 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000487 | 13.616 | 2.741 | n/a | 0.000 | 1.315 | 0.684 | 0.962 | 0.012 | 0.000 | 2.739 | 4.676 | 0.470 | n/a | 0.017 | 4.056 | 0.298 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.133ms |
| 4497799727c33d3700000000000004eb | 13.573 | 2.160 | n/a | 0.000 | 0.055 | 3.531 | 2.011 | 0.030 | 0.000 | 0.229 | 4.979 | 0.551 | n/a | 0.027 | 2.215 | 0.163 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000046e | 13.474 | 1.693 | n/a | 0.000 | 0.026 | 0.744 | 1.691 | 0.026 | 0.000 | 0.146 | 8.707 | 0.423 | n/a | 0.016 | 1.720 | 0.128 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 4497799727c33d3700000000000003bc | 13.350 | 2.885 | n/a | 0.000 | 0.072 | 0.642 | 1.128 | 0.016 | 0.000 | 1.691 | 5.670 | 1.215 | n/a | 0.032 | 2.957 | 0.221 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |

## P2 / idle-25 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.046 | 0.159 | 0.000 | 0.487 | 2.026 | n/a | 0.000 | 0.039 | 0.674 | 1.242 | 0.015 | 0.000 | 0.181 | 4.218 | 0.470 | n/a | 0.019 | 2.149 | 0.221 | 0.019 |
| p99 | 20.580 | 1.999 | 0.029 | 1.133 | 3.792 | n/a | 0.000 | 1.315 | 3.531 | 5.436 | 0.052 | 0.000 | 3.208 | 13.304 | 1.650 | n/a | 0.045 | 4.542 | 0.434 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d3700000000000004b5 | 33.297 | 3.500 | n/a | 0.000 | 0.074 | 0.938 | 4.864 | 0.030 | 14.457 | 0.089 | 8.831 | 0.479 | n/a | 0.036 | 3.574 | 0.107 | 0.036 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 4497799727c33d3700000000000003db | 20.580 | 3.048 | n/a | 0.000 | 0.890 | 0.840 | 1.811 | 0.029 | 0.000 | 0.104 | 13.332 | 0.508 | n/a | 0.019 | 3.938 | 0.191 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000438 | 19.835 | 3.212 | n/a | 0.000 | 1.330 | 1.189 | 1.287 | 0.014 | 0.000 | 0.089 | 11.787 | 0.912 | n/a | 0.014 | 4.542 | 0.229 | 0.014 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000003d4 | 18.969 | 2.331 | n/a | 0.000 | 0.042 | 1.975 | 7.968 | 0.015 | 0.000 | 0.065 | 5.587 | 0.965 | n/a | 0.021 | 2.373 | 0.125 | 0.021 | gw-w/thread-48/gateway /v1/db/{db}/transact | driver.reader-basis.broadcast 0.048ms |
| 4497799727c33d3700000000000003d9 | 18.671 | 1.730 | n/a | 0.000 | 0.047 | 0.802 | 1.659 | 0.025 | 0.000 | 0.100 | 13.304 | 0.984 | n/a | 0.020 | 1.778 | 0.095 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000004ce | 17.998 | 2.933 | n/a | 0.000 | 0.073 | 2.176 | 4.877 | 0.028 | 0.000 | 0.105 | 6.813 | 0.963 | n/a | 0.030 | 3.006 | 0.167 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000003dd | 17.851 | 1.817 | n/a | 0.000 | 0.039 | 0.770 | 1.994 | 0.028 | 0.000 | 2.508 | 9.301 | 1.371 | n/a | 0.023 | 1.856 | 0.104 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 4497799727c33d3700000000000003f7 | 16.544 | 3.136 | n/a | 0.000 | 0.080 | 0.723 | 4.260 | 0.016 | 0.000 | 0.065 | 7.833 | 0.396 | n/a | 0.034 | 3.216 | 0.194 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000456 | 16.079 | 1.628 | n/a | 0.000 | 0.030 | 0.579 | 4.720 | 0.016 | 0.000 | 0.061 | 8.133 | 0.897 | n/a | 0.015 | 1.658 | 0.103 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 4497799727c33d370000000000000458 | 15.460 | 2.369 | n/a | 0.000 | 0.048 | 0.686 | 4.961 | 0.048 | 0.000 | 3.270 | 3.601 | 0.458 | n/a | 0.020 | 2.417 | 0.156 | 0.020 | gw-w/thread-51/commit.prepare-and-validate | none observed |
| 4497799727c33d3700000000000004bf | 14.987 | 1.773 | n/a | 0.000 | 0.028 | 0.386 | 4.996 | 0.014 | 0.000 | 0.062 | 7.259 | 0.455 | n/a | 0.014 | 1.801 | 0.120 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| 4497799727c33d3700000000000004da | 14.868 | 1.914 | n/a | 0.000 | 0.029 | 0.648 | 1.633 | 0.026 | 0.000 | 0.101 | 10.030 | 0.470 | n/a | 0.017 | 1.943 | 0.131 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000003d0 | 14.350 | 1.730 | n/a | 0.000 | 0.050 | 0.572 | 2.413 | 0.018 | 0.000 | 0.094 | 8.502 | 0.950 | n/a | 0.021 | 1.780 | 0.124 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000044a | 14.290 | 3.048 | n/a | 0.000 | 0.104 | 0.772 | 4.267 | 0.065 | 0.000 | 0.139 | 4.727 | 1.124 | n/a | 0.045 | 3.152 | 0.221 | 0.045 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000415 | 14.123 | 1.760 | n/a | 0.000 | 0.042 | 0.501 | 4.911 | 0.018 | 0.000 | 0.071 | 6.349 | 0.453 | n/a | 0.019 | 1.802 | 0.128 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 4497799727c33d370000000000000464 | 13.722 | 1.771 | n/a | 0.000 | 0.035 | 0.675 | 1.564 | 0.026 | 0.000 | 0.662 | 8.020 | 0.952 | n/a | 0.016 | 1.806 | 0.132 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000487 | 13.616 | 2.741 | n/a | 0.000 | 1.315 | 0.684 | 0.962 | 0.012 | 0.000 | 2.739 | 4.676 | 0.470 | n/a | 0.017 | 4.056 | 0.298 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.133ms |
| 4497799727c33d3700000000000004eb | 13.573 | 2.160 | n/a | 0.000 | 0.055 | 3.531 | 2.011 | 0.030 | 0.000 | 0.229 | 4.979 | 0.551 | n/a | 0.027 | 2.215 | 0.163 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000046e | 13.474 | 1.693 | n/a | 0.000 | 0.026 | 0.744 | 1.691 | 0.026 | 0.000 | 0.146 | 8.707 | 0.423 | n/a | 0.016 | 1.720 | 0.128 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 4497799727c33d3700000000000003bc | 13.350 | 2.885 | n/a | 0.000 | 0.072 | 0.642 | 1.128 | 0.016 | 0.000 | 1.691 | 5.670 | 1.215 | n/a | 0.032 | 2.957 | 0.221 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |

## P2 / idle-50 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.188 | 0.000 | 0.000 | 0.499 | 2.221 | n/a | 0.000 | 0.045 | 0.640 | 1.022 | 0.012 | 0.000 | 0.151 | 3.854 | 0.469 | n/a | 0.022 | 2.266 | 0.245 | 0.022 |
| p99 | 19.658 | 1.786 | 0.000 | 1.292 | 3.694 | n/a | 0.000 | 1.628 | 4.318 | 4.783 | 0.045 | 0.000 | 2.598 | 10.632 | 1.159 | n/a | 0.042 | 4.237 | 0.417 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000549 | 40.189 | 1.732 | n/a | 0.000 | 0.050 | 0.491 | 1.196 | 0.012 | 0.000 | 0.124 | 36.103 | 0.458 | n/a | 0.024 | 1.782 | 0.044 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000004ff | 19.658 | 2.991 | n/a | 0.000 | 0.094 | 4.318 | 1.316 | 0.014 | 0.000 | 0.067 | 7.553 | 3.267 | n/a | 0.039 | 3.084 | 0.157 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000570 | 18.009 | 3.059 | n/a | 0.000 | 0.087 | 0.747 | 4.185 | 0.014 | 0.000 | 0.059 | 9.366 | 0.453 | n/a | 0.038 | 3.146 | 0.175 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000620 | 17.485 | 3.125 | n/a | 0.000 | 2.300 | 4.484 | 1.036 | 0.012 | 0.000 | 0.100 | 5.909 | 0.498 | n/a | 0.022 | 5.425 | 0.310 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000054d | 15.825 | 2.253 | n/a | 0.000 | 0.052 | 0.628 | 0.933 | 0.013 | 0.000 | 0.133 | 10.632 | 1.159 | n/a | 0.022 | 2.305 | 0.146 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000004f9 | 15.638 | 2.997 | n/a | 0.000 | 0.097 | 0.923 | 1.683 | 0.025 | 0.000 | 0.127 | 8.807 | 0.939 | n/a | 0.039 | 3.094 | 0.198 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000568 | 15.437 | 2.244 | n/a | 0.000 | 0.045 | 0.623 | 4.783 | 0.019 | 0.000 | 0.105 | 7.137 | 0.457 | n/a | 0.024 | 2.289 | 0.148 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000581 | 14.776 | 3.299 | n/a | 0.000 | 0.083 | 0.690 | 0.996 | 0.012 | 0.000 | 0.315 | 8.370 | 0.976 | n/a | 0.035 | 3.382 | 0.229 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000050e | 14.306 | 2.229 | n/a | 0.000 | 0.036 | 3.726 | 0.996 | 0.013 | 0.000 | 0.066 | 6.153 | 1.070 | n/a | 0.017 | 2.266 | 0.158 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000055e | 14.162 | 1.847 | n/a | 0.000 | 0.044 | 0.588 | 2.103 | 0.418 | 0.000 | 3.670 | 5.002 | 0.466 | n/a | 0.022 | 1.891 | 0.134 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000574 | 13.718 | 3.033 | n/a | 0.000 | 0.090 | 0.727 | 1.265 | 0.011 | 0.000 | 0.312 | 7.775 | 0.469 | n/a | 0.037 | 3.123 | 0.228 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005d8 | 13.273 | 1.785 | n/a | 0.000 | 0.047 | 3.551 | 3.589 | 0.019 | 0.000 | 0.104 | 3.688 | 0.468 | n/a | 0.024 | 1.832 | 0.138 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000510 | 13.199 | 3.191 | n/a | 0.000 | 0.037 | 0.741 | 0.927 | 0.012 | 0.000 | 0.058 | 7.753 | 0.459 | n/a | 0.020 | 3.228 | 0.245 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005be | 13.136 | 2.183 | n/a | 0.000 | 1.222 | 0.835 | 4.123 | 0.013 | 0.000 | 0.058 | 3.719 | 0.966 | n/a | 0.017 | 3.405 | 0.259 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005aa | 12.882 | 2.554 | n/a | 0.000 | 0.043 | 0.629 | 0.920 | 0.010 | 0.000 | 0.081 | 7.699 | 0.923 | n/a | 0.022 | 2.597 | 0.202 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005ff | 12.847 | 1.704 | n/a | 0.000 | 0.048 | 2.847 | 4.391 | 0.012 | 0.000 | 0.060 | 3.306 | 0.449 | n/a | 0.031 | 1.752 | 0.136 | 0.031 | gw-w/thread-50/gateway.route | none observed |
| 4497799727c33d37000000000000054b | 12.730 | 1.687 | n/a | 0.000 | 0.039 | 0.520 | 2.101 | 0.032 | 0.000 | 0.515 | 7.198 | 0.620 | n/a | 0.017 | 1.727 | 0.136 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000576 | 12.662 | 2.915 | n/a | 0.000 | 0.085 | 0.736 | 1.011 | 0.011 | 0.000 | 0.369 | 7.050 | 0.450 | n/a | 0.035 | 3.000 | 0.237 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005d1 | 12.550 | 3.072 | n/a | 0.000 | 0.036 | 1.382 | 0.703 | 0.011 | 0.000 | 0.320 | 6.579 | 0.429 | n/a | 0.017 | 3.108 | 0.248 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005d4 | 12.428 | 1.789 | n/a | 0.000 | 0.040 | 3.598 | 0.920 | 0.011 | 0.000 | 0.089 | 5.087 | 0.877 | n/a | 0.017 | 1.829 | 0.147 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.188 | 0.000 | 0.000 | 0.499 | 2.221 | n/a | 0.000 | 0.045 | 0.640 | 1.022 | 0.012 | 0.000 | 0.151 | 3.854 | 0.469 | n/a | 0.022 | 2.266 | 0.245 | 0.022 |
| p99 | 19.658 | 1.786 | 0.000 | 1.292 | 3.694 | n/a | 0.000 | 1.628 | 4.318 | 4.783 | 0.045 | 0.000 | 2.598 | 10.632 | 1.159 | n/a | 0.042 | 4.237 | 0.417 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000549 | 40.189 | 1.732 | n/a | 0.000 | 0.050 | 0.491 | 1.196 | 0.012 | 0.000 | 0.124 | 36.103 | 0.458 | n/a | 0.024 | 1.782 | 0.044 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000004ff | 19.658 | 2.991 | n/a | 0.000 | 0.094 | 4.318 | 1.316 | 0.014 | 0.000 | 0.067 | 7.553 | 3.267 | n/a | 0.039 | 3.084 | 0.157 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000570 | 18.009 | 3.059 | n/a | 0.000 | 0.087 | 0.747 | 4.185 | 0.014 | 0.000 | 0.059 | 9.366 | 0.453 | n/a | 0.038 | 3.146 | 0.175 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000620 | 17.485 | 3.125 | n/a | 0.000 | 2.300 | 4.484 | 1.036 | 0.012 | 0.000 | 0.100 | 5.909 | 0.498 | n/a | 0.022 | 5.425 | 0.310 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000054d | 15.825 | 2.253 | n/a | 0.000 | 0.052 | 0.628 | 0.933 | 0.013 | 0.000 | 0.133 | 10.632 | 1.159 | n/a | 0.022 | 2.305 | 0.146 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000004f9 | 15.638 | 2.997 | n/a | 0.000 | 0.097 | 0.923 | 1.683 | 0.025 | 0.000 | 0.127 | 8.807 | 0.939 | n/a | 0.039 | 3.094 | 0.198 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000568 | 15.437 | 2.244 | n/a | 0.000 | 0.045 | 0.623 | 4.783 | 0.019 | 0.000 | 0.105 | 7.137 | 0.457 | n/a | 0.024 | 2.289 | 0.148 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000581 | 14.776 | 3.299 | n/a | 0.000 | 0.083 | 0.690 | 0.996 | 0.012 | 0.000 | 0.315 | 8.370 | 0.976 | n/a | 0.035 | 3.382 | 0.229 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000050e | 14.306 | 2.229 | n/a | 0.000 | 0.036 | 3.726 | 0.996 | 0.013 | 0.000 | 0.066 | 6.153 | 1.070 | n/a | 0.017 | 2.266 | 0.158 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000055e | 14.162 | 1.847 | n/a | 0.000 | 0.044 | 0.588 | 2.103 | 0.418 | 0.000 | 3.670 | 5.002 | 0.466 | n/a | 0.022 | 1.891 | 0.134 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000574 | 13.718 | 3.033 | n/a | 0.000 | 0.090 | 0.727 | 1.265 | 0.011 | 0.000 | 0.312 | 7.775 | 0.469 | n/a | 0.037 | 3.123 | 0.228 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005d8 | 13.273 | 1.785 | n/a | 0.000 | 0.047 | 3.551 | 3.589 | 0.019 | 0.000 | 0.104 | 3.688 | 0.468 | n/a | 0.024 | 1.832 | 0.138 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000510 | 13.199 | 3.191 | n/a | 0.000 | 0.037 | 0.741 | 0.927 | 0.012 | 0.000 | 0.058 | 7.753 | 0.459 | n/a | 0.020 | 3.228 | 0.245 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005be | 13.136 | 2.183 | n/a | 0.000 | 1.222 | 0.835 | 4.123 | 0.013 | 0.000 | 0.058 | 3.719 | 0.966 | n/a | 0.017 | 3.405 | 0.259 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005aa | 12.882 | 2.554 | n/a | 0.000 | 0.043 | 0.629 | 0.920 | 0.010 | 0.000 | 0.081 | 7.699 | 0.923 | n/a | 0.022 | 2.597 | 0.202 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005ff | 12.847 | 1.704 | n/a | 0.000 | 0.048 | 2.847 | 4.391 | 0.012 | 0.000 | 0.060 | 3.306 | 0.449 | n/a | 0.031 | 1.752 | 0.136 | 0.031 | gw-w/thread-50/gateway.route | none observed |
| 4497799727c33d37000000000000054b | 12.730 | 1.687 | n/a | 0.000 | 0.039 | 0.520 | 2.101 | 0.032 | 0.000 | 0.515 | 7.198 | 0.620 | n/a | 0.017 | 1.727 | 0.136 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000576 | 12.662 | 2.915 | n/a | 0.000 | 0.085 | 0.736 | 1.011 | 0.011 | 0.000 | 0.369 | 7.050 | 0.450 | n/a | 0.035 | 3.000 | 0.237 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005d1 | 12.550 | 3.072 | n/a | 0.000 | 0.036 | 1.382 | 0.703 | 0.011 | 0.000 | 0.320 | 6.579 | 0.429 | n/a | 0.017 | 3.108 | 0.248 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000005d4 | 12.428 | 1.789 | n/a | 0.000 | 0.040 | 3.598 | 0.920 | 0.011 | 0.000 | 0.089 | 5.087 | 0.877 | n/a | 0.017 | 1.829 | 0.147 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.548 | 0.188 | 0.000 | 0.511 | 2.188 | n/a | 0.000 | 0.049 | 0.701 | 1.113 | 0.012 | 0.000 | 0.139 | 3.972 | 0.478 | n/a | 0.024 | 2.326 | 0.245 | 0.024 |
| p99 | 16.997 | 1.855 | 0.000 | 1.040 | 3.892 | n/a | 0.000 | 1.556 | 1.910 | 4.532 | 0.066 | 0.000 | 1.454 | 10.256 | 1.414 | n/a | 0.070 | 4.101 | 0.409 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d3700000000000006b8 | 21.361 | 3.347 | n/a | 0.000 | 0.103 | 0.681 | 1.928 | 0.025 | 0.000 | 0.815 | 13.386 | 1.033 | n/a | 0.042 | 3.450 | 0.162 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006b5 | 16.997 | 2.848 | n/a | 0.000 | 0.048 | 1.051 | 1.799 | 0.029 | 0.000 | 0.167 | 10.028 | 1.001 | n/a | 0.026 | 2.896 | 0.170 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000742 | 16.620 | 1.674 | n/a | 0.000 | 0.038 | 0.620 | 6.367 | 0.026 | 0.000 | 0.090 | 7.333 | 0.453 | n/a | 0.020 | 1.712 | 0.103 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006f9 | 15.627 | 2.188 | n/a | 0.000 | 0.813 | 0.546 | 1.454 | 0.022 | 0.000 | 0.216 | 9.888 | 0.482 | n/a | 0.017 | 3.001 | 0.192 | 0.017 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000075c | 15.338 | 3.582 | n/a | 0.000 | 0.184 | 1.075 | 1.770 | 0.028 | 0.000 | 0.350 | 7.763 | 0.523 | n/a | 0.064 | 3.765 | 0.245 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006a7 | 15.098 | 2.093 | n/a | 0.000 | 0.049 | 0.591 | 0.998 | 0.013 | 0.000 | 0.101 | 10.256 | 0.973 | n/a | 0.024 | 2.142 | 0.142 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006e2 | 14.901 | 1.899 | n/a | 0.000 | 0.063 | 0.701 | 1.670 | 0.016 | 0.000 | 0.080 | 9.527 | 0.918 | n/a | 0.028 | 1.961 | 0.132 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000072d | 14.710 | 2.208 | n/a | 0.000 | 0.040 | 1.910 | 1.619 | 0.028 | 0.000 | 0.559 | 7.865 | 0.461 | n/a | 0.021 | 2.248 | 0.153 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000661 | 14.466 | 3.229 | n/a | 0.000 | 0.082 | 0.876 | 4.486 | 0.012 | 0.000 | 0.073 | 4.242 | 1.414 | n/a | 0.052 | 3.310 | 0.229 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000063a | 14.306 | 3.127 | n/a | 0.000 | 0.117 | 1.476 | 1.113 | 0.013 | 0.000 | 0.154 | 7.759 | 0.501 | n/a | 0.045 | 3.244 | 0.227 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000694 | 14.301 | 2.063 | n/a | 0.000 | 0.051 | 0.608 | 2.247 | 0.066 | 0.000 | 0.214 | 8.569 | 0.460 | n/a | 0.025 | 2.113 | 0.148 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000069e | 13.898 | 1.917 | n/a | 0.000 | 0.038 | 0.574 | 1.008 | 0.012 | 0.000 | 0.136 | 9.358 | 0.835 | n/a | 0.020 | 1.955 | 0.141 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000064f | 13.250 | 3.892 | n/a | 0.000 | 0.111 | 0.834 | 1.320 | 0.012 | 0.000 | 0.097 | 5.969 | 0.968 | n/a | 0.047 | 4.002 | 0.302 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006f4 | 13.235 | 2.642 | n/a | 0.000 | 0.055 | 0.858 | 1.873 | 0.038 | 0.000 | 0.116 | 6.527 | 1.101 | n/a | 0.027 | 2.697 | 0.204 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006e6 | 13.164 | 3.900 | n/a | 0.000 | 0.117 | 1.212 | 1.726 | 0.023 | 0.000 | 0.208 | 4.773 | 1.135 | n/a | 0.070 | 4.016 | 0.305 | 0.070 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000071a | 13.158 | 2.405 | n/a | 0.000 | 0.048 | 0.752 | 1.434 | 0.017 | 0.000 | 0.084 | 7.914 | 0.478 | n/a | 0.027 | 2.452 | 0.186 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000062d | 13.088 | 2.911 | n/a | 0.000 | 1.188 | 0.477 | 4.419 | 0.012 | 0.000 | 0.099 | 3.490 | 0.462 | n/a | 0.031 | 4.098 | 0.313 | 0.031 | gw-w/thread-52/gateway.response-write | none observed |
| 4497799727c33d3700000000000006ec | 13.025 | 2.987 | n/a | 0.000 | 0.099 | 0.676 | 0.945 | 0.012 | 0.000 | 3.855 | 3.732 | 0.680 | n/a | 0.040 | 3.085 | 0.237 | 0.040 | gw-w/thread-52/d/transact-async | none observed |
| 4497799727c33d37000000000000068e | 13.020 | 3.240 | n/a | 0.000 | 0.116 | 0.882 | 1.585 | 0.022 | 0.000 | 0.113 | 6.080 | 0.940 | n/a | 0.042 | 3.356 | 0.258 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000655 | 12.830 | 1.993 | n/a | 0.000 | 0.107 | 1.340 | 4.532 | 0.025 | 0.000 | 0.140 | 4.180 | 0.469 | n/a | 0.044 | 2.100 | 0.164 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.548 | 0.188 | 0.000 | 0.511 | 2.188 | n/a | 0.000 | 0.049 | 0.701 | 1.113 | 0.012 | 0.000 | 0.139 | 3.972 | 0.478 | n/a | 0.024 | 2.326 | 0.245 | 0.024 |
| p99 | 16.997 | 1.855 | 0.000 | 1.040 | 3.892 | n/a | 0.000 | 1.556 | 1.910 | 4.532 | 0.066 | 0.000 | 1.454 | 10.256 | 1.414 | n/a | 0.070 | 4.101 | 0.409 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d3700000000000006b8 | 21.361 | 3.347 | n/a | 0.000 | 0.103 | 0.681 | 1.928 | 0.025 | 0.000 | 0.815 | 13.386 | 1.033 | n/a | 0.042 | 3.450 | 0.162 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006b5 | 16.997 | 2.848 | n/a | 0.000 | 0.048 | 1.051 | 1.799 | 0.029 | 0.000 | 0.167 | 10.028 | 1.001 | n/a | 0.026 | 2.896 | 0.170 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000742 | 16.620 | 1.674 | n/a | 0.000 | 0.038 | 0.620 | 6.367 | 0.026 | 0.000 | 0.090 | 7.333 | 0.453 | n/a | 0.020 | 1.712 | 0.103 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006f9 | 15.627 | 2.188 | n/a | 0.000 | 0.813 | 0.546 | 1.454 | 0.022 | 0.000 | 0.216 | 9.888 | 0.482 | n/a | 0.017 | 3.001 | 0.192 | 0.017 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000075c | 15.338 | 3.582 | n/a | 0.000 | 0.184 | 1.075 | 1.770 | 0.028 | 0.000 | 0.350 | 7.763 | 0.523 | n/a | 0.064 | 3.765 | 0.245 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006a7 | 15.098 | 2.093 | n/a | 0.000 | 0.049 | 0.591 | 0.998 | 0.013 | 0.000 | 0.101 | 10.256 | 0.973 | n/a | 0.024 | 2.142 | 0.142 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006e2 | 14.901 | 1.899 | n/a | 0.000 | 0.063 | 0.701 | 1.670 | 0.016 | 0.000 | 0.080 | 9.527 | 0.918 | n/a | 0.028 | 1.961 | 0.132 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000072d | 14.710 | 2.208 | n/a | 0.000 | 0.040 | 1.910 | 1.619 | 0.028 | 0.000 | 0.559 | 7.865 | 0.461 | n/a | 0.021 | 2.248 | 0.153 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000661 | 14.466 | 3.229 | n/a | 0.000 | 0.082 | 0.876 | 4.486 | 0.012 | 0.000 | 0.073 | 4.242 | 1.414 | n/a | 0.052 | 3.310 | 0.229 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000063a | 14.306 | 3.127 | n/a | 0.000 | 0.117 | 1.476 | 1.113 | 0.013 | 0.000 | 0.154 | 7.759 | 0.501 | n/a | 0.045 | 3.244 | 0.227 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000694 | 14.301 | 2.063 | n/a | 0.000 | 0.051 | 0.608 | 2.247 | 0.066 | 0.000 | 0.214 | 8.569 | 0.460 | n/a | 0.025 | 2.113 | 0.148 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000069e | 13.898 | 1.917 | n/a | 0.000 | 0.038 | 0.574 | 1.008 | 0.012 | 0.000 | 0.136 | 9.358 | 0.835 | n/a | 0.020 | 1.955 | 0.141 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000064f | 13.250 | 3.892 | n/a | 0.000 | 0.111 | 0.834 | 1.320 | 0.012 | 0.000 | 0.097 | 5.969 | 0.968 | n/a | 0.047 | 4.002 | 0.302 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006f4 | 13.235 | 2.642 | n/a | 0.000 | 0.055 | 0.858 | 1.873 | 0.038 | 0.000 | 0.116 | 6.527 | 1.101 | n/a | 0.027 | 2.697 | 0.204 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000006e6 | 13.164 | 3.900 | n/a | 0.000 | 0.117 | 1.212 | 1.726 | 0.023 | 0.000 | 0.208 | 4.773 | 1.135 | n/a | 0.070 | 4.016 | 0.305 | 0.070 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000071a | 13.158 | 2.405 | n/a | 0.000 | 0.048 | 0.752 | 1.434 | 0.017 | 0.000 | 0.084 | 7.914 | 0.478 | n/a | 0.027 | 2.452 | 0.186 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000062d | 13.088 | 2.911 | n/a | 0.000 | 1.188 | 0.477 | 4.419 | 0.012 | 0.000 | 0.099 | 3.490 | 0.462 | n/a | 0.031 | 4.098 | 0.313 | 0.031 | gw-w/thread-52/gateway.response-write | none observed |
| 4497799727c33d3700000000000006ec | 13.025 | 2.987 | n/a | 0.000 | 0.099 | 0.676 | 0.945 | 0.012 | 0.000 | 3.855 | 3.732 | 0.680 | n/a | 0.040 | 3.085 | 0.237 | 0.040 | gw-w/thread-52/d/transact-async | none observed |
| 4497799727c33d37000000000000068e | 13.020 | 3.240 | n/a | 0.000 | 0.116 | 0.882 | 1.585 | 0.022 | 0.000 | 0.113 | 6.080 | 0.940 | n/a | 0.042 | 3.356 | 0.258 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000655 | 12.830 | 1.993 | n/a | 0.000 | 0.107 | 1.340 | 4.532 | 0.025 | 0.000 | 0.140 | 4.180 | 0.469 | n/a | 0.044 | 2.100 | 0.164 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.288 | 0.417 | 0.000 | 0.523 | 2.295 | n/a | 0.000 | 0.060 | 0.715 | 1.125 | 0.014 | 0.000 | 0.131 | 4.317 | 0.511 | n/a | 0.029 | 2.490 | 0.245 | 0.029 |
| p99 | 29.191 | 2.006 | 0.000 | 1.136 | 4.635 | n/a | 0.000 | 2.476 | 1.871 | 7.138 | 0.057 | 0.000 | 2.427 | 23.230 | 2.582 | n/a | 0.061 | 6.667 | 0.448 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000838 | 32.414 | 1.927 | n/a | 0.000 | 0.056 | 0.652 | 1.021 | 0.011 | 0.000 | 0.137 | 28.113 | 0.474 | n/a | 0.023 | 1.983 | 0.061 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000007a7 | 29.191 | 3.404 | n/a | 0.000 | 0.093 | 0.833 | 1.017 | 0.011 | 0.000 | 0.092 | 23.230 | 0.470 | n/a | 0.043 | 3.496 | 0.120 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000077e | 17.151 | 1.946 | n/a | 0.000 | 0.055 | 0.715 | 1.745 | 0.021 | 0.000 | 4.122 | 7.408 | 1.104 | n/a | 0.036 | 2.000 | 0.117 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000865 | 17.010 | 3.333 | n/a | 0.000 | 0.123 | 0.837 | 7.985 | 0.039 | 0.000 | 0.185 | 3.981 | 0.477 | n/a | 0.051 | 3.456 | 0.203 | 0.051 | gw-w/thread-52/commit.prepare-and-validate | none observed |
| 4497799727c33d370000000000000877 | 16.945 | 4.191 | n/a | 0.000 | 2.476 | 1.303 | 2.078 | 0.057 | 0.000 | 0.130 | 6.169 | 0.485 | n/a | 0.056 | 6.667 | 0.393 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000845 | 16.837 | 3.665 | n/a | 0.000 | 0.054 | 0.889 | 1.112 | 0.011 | 0.000 | 0.387 | 10.249 | 0.447 | n/a | 0.023 | 3.719 | 0.221 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000007d7 | 16.697 | 3.214 | n/a | 0.000 | 0.114 | 1.871 | 2.094 | 0.047 | 0.000 | 0.289 | 8.526 | 0.500 | n/a | 0.043 | 3.327 | 0.199 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.087ms |
| 4497799727c33d3700000000000007cc | 16.534 | 4.021 | n/a | 0.000 | 0.109 | 0.927 | 1.255 | 0.012 | 0.000 | 0.104 | 9.587 | 0.474 | n/a | 0.044 | 4.130 | 0.250 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000804 | 16.133 | 3.362 | n/a | 0.000 | 0.117 | 0.561 | 1.330 | 0.012 | 0.000 | 0.107 | 10.108 | 0.490 | n/a | 0.043 | 3.480 | 0.216 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| 4497799727c33d3700000000000007f2 | 15.685 | 2.260 | n/a | 0.000 | 0.344 | 0.710 | 1.949 | 0.025 | 0.000 | 0.133 | 9.222 | 1.020 | n/a | 0.022 | 2.604 | 0.166 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.142ms |
| 4497799727c33d370000000000000811 | 15.663 | 2.011 | n/a | 0.000 | 0.057 | 0.828 | 2.055 | 0.028 | 0.000 | 0.148 | 10.002 | 0.507 | n/a | 0.026 | 2.068 | 0.132 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.115ms |
| 4497799727c33d3700000000000007e7 | 15.067 | 2.696 | n/a | 0.000 | 0.069 | 1.191 | 0.964 | 0.012 | 0.000 | 0.071 | 9.027 | 1.008 | n/a | 0.029 | 2.765 | 0.184 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000008a6 | 14.857 | 2.943 | n/a | 0.000 | 0.098 | 0.657 | 7.138 | 0.014 | 0.000 | 0.124 | 3.384 | 0.459 | n/a | 0.041 | 3.042 | 0.205 | 0.041 | gw-w/thread-49/storage/commit! | none observed |
| 4497799727c33d37000000000000076c | 14.828 | 2.024 | n/a | 0.000 | 0.055 | 0.611 | 4.369 | 0.015 | 0.000 | 0.115 | 7.109 | 0.496 | n/a | 0.034 | 2.079 | 0.140 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000007a4 | 14.720 | 2.670 | n/a | 0.000 | 0.058 | 0.784 | 2.083 | 0.032 | 0.000 | 2.427 | 5.277 | 1.364 | n/a | 0.026 | 2.728 | 0.185 | 0.026 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.099ms |
| 4497799727c33d370000000000000862 | 14.621 | 3.055 | n/a | 0.000 | 0.057 | 1.054 | 1.837 | 0.033 | 0.000 | 0.110 | 7.396 | 1.051 | n/a | 0.027 | 3.112 | 0.213 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000085e | 14.473 | 4.536 | n/a | 0.000 | 0.065 | 0.983 | 1.996 | 0.031 | 0.000 | 0.976 | 4.615 | 1.241 | n/a | 0.031 | 4.602 | 0.318 | 0.031 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000808 | 14.333 | 3.489 | n/a | 0.000 | 0.124 | 0.917 | 1.528 | 0.014 | 0.000 | 0.133 | 6.959 | 1.114 | n/a | 0.056 | 3.613 | 0.252 | 0.056 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.171ms |
| 4497799727c33d3700000000000008ad | 14.234 | 4.247 | n/a | 0.000 | 2.782 | 0.932 | 1.012 | 0.011 | 0.000 | 0.101 | 4.649 | 0.464 | n/a | 0.036 | 7.028 | 0.494 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000826 | 14.180 | 2.712 | n/a | 0.000 | 0.116 | 1.898 | 1.613 | 0.026 | 0.000 | 0.265 | 6.504 | 1.004 | n/a | 0.042 | 2.828 | 0.199 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.288 | 0.417 | 0.000 | 0.523 | 2.295 | n/a | 0.000 | 0.060 | 0.715 | 1.125 | 0.014 | 0.000 | 0.131 | 4.317 | 0.511 | n/a | 0.029 | 2.490 | 0.245 | 0.029 |
| p99 | 29.191 | 2.006 | 0.000 | 1.136 | 4.635 | n/a | 0.000 | 2.476 | 1.871 | 7.138 | 0.057 | 0.000 | 2.427 | 23.230 | 2.582 | n/a | 0.061 | 6.667 | 0.448 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000838 | 32.414 | 1.927 | n/a | 0.000 | 0.056 | 0.652 | 1.021 | 0.011 | 0.000 | 0.137 | 28.113 | 0.474 | n/a | 0.023 | 1.983 | 0.061 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000007a7 | 29.191 | 3.404 | n/a | 0.000 | 0.093 | 0.833 | 1.017 | 0.011 | 0.000 | 0.092 | 23.230 | 0.470 | n/a | 0.043 | 3.496 | 0.120 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000077e | 17.151 | 1.946 | n/a | 0.000 | 0.055 | 0.715 | 1.745 | 0.021 | 0.000 | 4.122 | 7.408 | 1.104 | n/a | 0.036 | 2.000 | 0.117 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000865 | 17.010 | 3.333 | n/a | 0.000 | 0.123 | 0.837 | 7.985 | 0.039 | 0.000 | 0.185 | 3.981 | 0.477 | n/a | 0.051 | 3.456 | 0.203 | 0.051 | gw-w/thread-52/commit.prepare-and-validate | none observed |
| 4497799727c33d370000000000000877 | 16.945 | 4.191 | n/a | 0.000 | 2.476 | 1.303 | 2.078 | 0.057 | 0.000 | 0.130 | 6.169 | 0.485 | n/a | 0.056 | 6.667 | 0.393 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000845 | 16.837 | 3.665 | n/a | 0.000 | 0.054 | 0.889 | 1.112 | 0.011 | 0.000 | 0.387 | 10.249 | 0.447 | n/a | 0.023 | 3.719 | 0.221 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000007d7 | 16.697 | 3.214 | n/a | 0.000 | 0.114 | 1.871 | 2.094 | 0.047 | 0.000 | 0.289 | 8.526 | 0.500 | n/a | 0.043 | 3.327 | 0.199 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.087ms |
| 4497799727c33d3700000000000007cc | 16.534 | 4.021 | n/a | 0.000 | 0.109 | 0.927 | 1.255 | 0.012 | 0.000 | 0.104 | 9.587 | 0.474 | n/a | 0.044 | 4.130 | 0.250 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000804 | 16.133 | 3.362 | n/a | 0.000 | 0.117 | 0.561 | 1.330 | 0.012 | 0.000 | 0.107 | 10.108 | 0.490 | n/a | 0.043 | 3.480 | 0.216 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| 4497799727c33d3700000000000007f2 | 15.685 | 2.260 | n/a | 0.000 | 0.344 | 0.710 | 1.949 | 0.025 | 0.000 | 0.133 | 9.222 | 1.020 | n/a | 0.022 | 2.604 | 0.166 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.142ms |
| 4497799727c33d370000000000000811 | 15.663 | 2.011 | n/a | 0.000 | 0.057 | 0.828 | 2.055 | 0.028 | 0.000 | 0.148 | 10.002 | 0.507 | n/a | 0.026 | 2.068 | 0.132 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.115ms |
| 4497799727c33d3700000000000007e7 | 15.067 | 2.696 | n/a | 0.000 | 0.069 | 1.191 | 0.964 | 0.012 | 0.000 | 0.071 | 9.027 | 1.008 | n/a | 0.029 | 2.765 | 0.184 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000008a6 | 14.857 | 2.943 | n/a | 0.000 | 0.098 | 0.657 | 7.138 | 0.014 | 0.000 | 0.124 | 3.384 | 0.459 | n/a | 0.041 | 3.042 | 0.205 | 0.041 | gw-w/thread-49/storage/commit! | none observed |
| 4497799727c33d37000000000000076c | 14.828 | 2.024 | n/a | 0.000 | 0.055 | 0.611 | 4.369 | 0.015 | 0.000 | 0.115 | 7.109 | 0.496 | n/a | 0.034 | 2.079 | 0.140 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000007a4 | 14.720 | 2.670 | n/a | 0.000 | 0.058 | 0.784 | 2.083 | 0.032 | 0.000 | 2.427 | 5.277 | 1.364 | n/a | 0.026 | 2.728 | 0.185 | 0.026 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.099ms |
| 4497799727c33d370000000000000862 | 14.621 | 3.055 | n/a | 0.000 | 0.057 | 1.054 | 1.837 | 0.033 | 0.000 | 0.110 | 7.396 | 1.051 | n/a | 0.027 | 3.112 | 0.213 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000085e | 14.473 | 4.536 | n/a | 0.000 | 0.065 | 0.983 | 1.996 | 0.031 | 0.000 | 0.976 | 4.615 | 1.241 | n/a | 0.031 | 4.602 | 0.318 | 0.031 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000808 | 14.333 | 3.489 | n/a | 0.000 | 0.124 | 0.917 | 1.528 | 0.014 | 0.000 | 0.133 | 6.959 | 1.114 | n/a | 0.056 | 3.613 | 0.252 | 0.056 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.171ms |
| 4497799727c33d3700000000000008ad | 14.234 | 4.247 | n/a | 0.000 | 2.782 | 0.932 | 1.012 | 0.011 | 0.000 | 0.101 | 4.649 | 0.464 | n/a | 0.036 | 7.028 | 0.494 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000826 | 14.180 | 2.712 | n/a | 0.000 | 0.116 | 1.898 | 1.613 | 0.026 | 0.000 | 0.265 | 6.504 | 1.004 | n/a | 0.042 | 2.828 | 0.199 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.869 | 0.306 | 0.000 | 0.533 | 2.474 | n/a | 0.000 | 0.067 | 0.765 | 1.174 | 0.015 | 0.000 | 0.145 | 4.680 | 0.528 | n/a | 0.035 | 2.655 | 0.247 | 0.035 |
| p99 | 19.093 | 1.966 | 0.000 | 1.511 | 5.219 | n/a | 0.000 | 2.263 | 1.876 | 5.425 | 0.053 | 0.000 | 1.098 | 10.837 | 3.361 | n/a | 0.119 | 6.073 | 0.448 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000975 | 20.341 | 4.656 | n/a | 0.000 | 0.158 | 1.259 | 1.841 | 0.031 | 0.000 | 0.123 | 8.840 | 3.361 | n/a | 0.072 | 4.813 | 0.237 | 0.072 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000096e | 19.093 | 3.854 | n/a | 0.000 | 0.119 | 0.910 | 2.505 | 0.017 | 0.000 | 0.325 | 10.837 | 0.476 | n/a | 0.049 | 3.974 | 0.208 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009f5 | 17.442 | 3.194 | n/a | 0.000 | 0.099 | 0.775 | 1.693 | 0.025 | 0.000 | 0.114 | 11.035 | 0.457 | n/a | 0.050 | 3.293 | 0.189 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000943 | 16.273 | 4.762 | n/a | 0.000 | 0.261 | 1.229 | 1.767 | 0.019 | 0.000 | 0.177 | 7.286 | 0.652 | n/a | 0.119 | 5.023 | 0.309 | 0.119 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000964 | 15.660 | 4.244 | n/a | 0.000 | 0.134 | 1.093 | 1.879 | 0.036 | 0.000 | 0.341 | 7.383 | 0.494 | n/a | 0.055 | 4.378 | 0.280 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009b4 | 15.547 | 2.652 | n/a | 0.000 | 0.056 | 0.929 | 7.543 | 0.022 | 0.000 | 0.089 | 3.747 | 0.481 | n/a | 0.027 | 2.709 | 0.174 | 0.027 | gw-w/thread-51/commit.prepare-and-validate | none observed |
| 4497799727c33d370000000000000a0b | 15.547 | 3.132 | n/a | 0.000 | 0.059 | 1.606 | 2.099 | 0.031 | 0.000 | 0.238 | 7.799 | 0.549 | n/a | 0.034 | 3.191 | 0.205 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009b1 | 15.318 | 5.878 | n/a | 0.000 | 0.196 | 1.292 | 1.745 | 0.019 | 0.000 | 0.158 | 5.283 | 0.663 | n/a | 0.084 | 6.073 | 0.397 | 0.084 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000092f | 15.309 | 3.291 | n/a | 0.000 | 0.094 | 1.666 | 2.711 | 0.053 | 0.000 | 0.359 | 6.383 | 0.708 | n/a | 0.044 | 3.385 | 0.221 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a15 | 15.240 | 2.252 | n/a | 0.000 | 0.051 | 0.645 | 1.088 | 0.013 | 0.000 | 0.078 | 10.168 | 0.920 | n/a | 0.025 | 2.303 | 0.151 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000008ee | 14.253 | 4.280 | n/a | 0.000 | 0.179 | 1.298 | 1.557 | 0.019 | 0.000 | 0.140 | 6.071 | 0.598 | n/a | 0.112 | 4.458 | 0.313 | 0.112 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009e8 | 14.158 | 2.596 | n/a | 0.000 | 0.077 | 1.290 | 1.322 | 0.020 | 0.000 | 2.126 | 5.398 | 1.284 | n/a | 0.045 | 2.673 | 0.189 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000093c | 14.081 | 3.943 | n/a | 0.000 | 0.259 | 1.053 | 1.917 | 0.027 | 0.000 | 0.138 | 6.138 | 0.491 | n/a | 0.115 | 4.202 | 0.298 | 0.115 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009ca | 13.927 | 4.045 | n/a | 0.000 | 0.154 | 0.978 | 1.906 | 0.037 | 0.000 | 0.212 | 5.995 | 0.533 | n/a | 0.068 | 4.199 | 0.302 | 0.068 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000905 | 13.844 | 2.206 | n/a | 0.000 | 0.063 | 0.875 | 1.062 | 0.013 | 0.000 | 0.112 | 8.497 | 0.985 | n/a | 0.031 | 2.269 | 0.164 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009a7 | 13.789 | 5.219 | n/a | 0.000 | 0.175 | 1.319 | 1.465 | 0.020 | 0.000 | 0.604 | 4.292 | 0.613 | n/a | 0.083 | 5.394 | 0.391 | 0.083 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000008f8 | 13.695 | 3.091 | n/a | 0.000 | 0.084 | 1.032 | 1.375 | 0.021 | 0.000 | 0.206 | 7.326 | 0.512 | n/a | 0.049 | 3.175 | 0.232 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000008d3 | 13.603 | 4.299 | n/a | 0.000 | 0.152 | 1.075 | 2.267 | 0.026 | 0.000 | 0.153 | 5.061 | 0.504 | n/a | 0.064 | 4.452 | 0.327 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009a5 | 13.492 | 2.039 | n/a | 0.000 | 0.059 | 0.565 | 4.275 | 0.014 | 0.000 | 0.072 | 5.523 | 0.914 | n/a | 0.031 | 2.098 | 0.155 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009cd | 13.479 | 2.350 | n/a | 0.000 | 1.305 | 0.556 | 4.071 | 0.013 | 0.000 | 0.350 | 4.344 | 0.466 | n/a | 0.023 | 3.656 | 0.271 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.869 | 0.306 | 0.000 | 0.533 | 2.474 | n/a | 0.000 | 0.067 | 0.765 | 1.174 | 0.015 | 0.000 | 0.145 | 4.680 | 0.528 | n/a | 0.035 | 2.655 | 0.247 | 0.035 |
| p99 | 19.093 | 1.966 | 0.000 | 1.511 | 5.219 | n/a | 0.000 | 2.263 | 1.876 | 5.425 | 0.053 | 0.000 | 1.098 | 10.837 | 3.361 | n/a | 0.119 | 6.073 | 0.448 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000975 | 20.341 | 4.656 | n/a | 0.000 | 0.158 | 1.259 | 1.841 | 0.031 | 0.000 | 0.123 | 8.840 | 3.361 | n/a | 0.072 | 4.813 | 0.237 | 0.072 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000096e | 19.093 | 3.854 | n/a | 0.000 | 0.119 | 0.910 | 2.505 | 0.017 | 0.000 | 0.325 | 10.837 | 0.476 | n/a | 0.049 | 3.974 | 0.208 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009f5 | 17.442 | 3.194 | n/a | 0.000 | 0.099 | 0.775 | 1.693 | 0.025 | 0.000 | 0.114 | 11.035 | 0.457 | n/a | 0.050 | 3.293 | 0.189 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000943 | 16.273 | 4.762 | n/a | 0.000 | 0.261 | 1.229 | 1.767 | 0.019 | 0.000 | 0.177 | 7.286 | 0.652 | n/a | 0.119 | 5.023 | 0.309 | 0.119 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000964 | 15.660 | 4.244 | n/a | 0.000 | 0.134 | 1.093 | 1.879 | 0.036 | 0.000 | 0.341 | 7.383 | 0.494 | n/a | 0.055 | 4.378 | 0.280 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009b4 | 15.547 | 2.652 | n/a | 0.000 | 0.056 | 0.929 | 7.543 | 0.022 | 0.000 | 0.089 | 3.747 | 0.481 | n/a | 0.027 | 2.709 | 0.174 | 0.027 | gw-w/thread-51/commit.prepare-and-validate | none observed |
| 4497799727c33d370000000000000a0b | 15.547 | 3.132 | n/a | 0.000 | 0.059 | 1.606 | 2.099 | 0.031 | 0.000 | 0.238 | 7.799 | 0.549 | n/a | 0.034 | 3.191 | 0.205 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009b1 | 15.318 | 5.878 | n/a | 0.000 | 0.196 | 1.292 | 1.745 | 0.019 | 0.000 | 0.158 | 5.283 | 0.663 | n/a | 0.084 | 6.073 | 0.397 | 0.084 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000092f | 15.309 | 3.291 | n/a | 0.000 | 0.094 | 1.666 | 2.711 | 0.053 | 0.000 | 0.359 | 6.383 | 0.708 | n/a | 0.044 | 3.385 | 0.221 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a15 | 15.240 | 2.252 | n/a | 0.000 | 0.051 | 0.645 | 1.088 | 0.013 | 0.000 | 0.078 | 10.168 | 0.920 | n/a | 0.025 | 2.303 | 0.151 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000008ee | 14.253 | 4.280 | n/a | 0.000 | 0.179 | 1.298 | 1.557 | 0.019 | 0.000 | 0.140 | 6.071 | 0.598 | n/a | 0.112 | 4.458 | 0.313 | 0.112 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009e8 | 14.158 | 2.596 | n/a | 0.000 | 0.077 | 1.290 | 1.322 | 0.020 | 0.000 | 2.126 | 5.398 | 1.284 | n/a | 0.045 | 2.673 | 0.189 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d37000000000000093c | 14.081 | 3.943 | n/a | 0.000 | 0.259 | 1.053 | 1.917 | 0.027 | 0.000 | 0.138 | 6.138 | 0.491 | n/a | 0.115 | 4.202 | 0.298 | 0.115 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009ca | 13.927 | 4.045 | n/a | 0.000 | 0.154 | 0.978 | 1.906 | 0.037 | 0.000 | 0.212 | 5.995 | 0.533 | n/a | 0.068 | 4.199 | 0.302 | 0.068 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000905 | 13.844 | 2.206 | n/a | 0.000 | 0.063 | 0.875 | 1.062 | 0.013 | 0.000 | 0.112 | 8.497 | 0.985 | n/a | 0.031 | 2.269 | 0.164 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009a7 | 13.789 | 5.219 | n/a | 0.000 | 0.175 | 1.319 | 1.465 | 0.020 | 0.000 | 0.604 | 4.292 | 0.613 | n/a | 0.083 | 5.394 | 0.391 | 0.083 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000008f8 | 13.695 | 3.091 | n/a | 0.000 | 0.084 | 1.032 | 1.375 | 0.021 | 0.000 | 0.206 | 7.326 | 0.512 | n/a | 0.049 | 3.175 | 0.232 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000008d3 | 13.603 | 4.299 | n/a | 0.000 | 0.152 | 1.075 | 2.267 | 0.026 | 0.000 | 0.153 | 5.061 | 0.504 | n/a | 0.064 | 4.452 | 0.327 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009a5 | 13.492 | 2.039 | n/a | 0.000 | 0.059 | 0.565 | 4.275 | 0.014 | 0.000 | 0.072 | 5.523 | 0.914 | n/a | 0.031 | 2.098 | 0.155 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d3700000000000009cd | 13.479 | 2.350 | n/a | 0.000 | 1.305 | 0.556 | 4.071 | 0.013 | 0.000 | 0.350 | 4.344 | 0.466 | n/a | 0.023 | 3.656 | 0.271 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.184 | 0.605 | 0.000 | 0.521 | 2.216 | n/a | 0.000 | 0.066 | 0.761 | 1.145 | 0.015 | 0.000 | 0.156 | 4.383 | 0.515 | n/a | 0.031 | 2.359 | 0.255 | 0.031 |
| p99 | 24.712 | 1.784 | 0.000 | 1.021 | 4.791 | n/a | 0.000 | 2.411 | 2.107 | 2.275 | 0.068 | 0.000 | 2.311 | 17.660 | 1.481 | n/a | 0.090 | 7.208 | 0.434 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000a7c | 26.732 | 1.946 | n/a | 0.000 | 0.060 | 0.764 | 1.823 | 0.019 | 0.000 | 0.422 | 21.220 | 0.450 | n/a | 0.027 | 2.006 | 0.075 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a91 | 24.712 | 3.205 | n/a | 0.000 | 0.099 | 0.938 | 1.674 | 0.026 | 0.000 | 0.620 | 17.660 | 0.451 | n/a | 0.040 | 3.304 | 0.134 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b74 | 18.622 | 2.375 | n/a | 0.000 | 0.084 | 1.205 | 5.975 | 0.043 | 0.000 | 0.444 | 7.157 | 1.294 | n/a | 0.044 | 2.460 | 0.132 | 0.044 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000ae8 | 16.625 | 4.797 | n/a | 0.000 | 2.411 | 1.009 | 1.142 | 0.015 | 0.000 | 0.135 | 6.103 | 0.972 | n/a | 0.041 | 7.208 | 0.434 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b68 | 15.602 | 4.221 | n/a | 0.000 | 0.140 | 1.134 | 1.870 | 0.025 | 0.000 | 0.144 | 6.955 | 1.061 | n/a | 0.053 | 4.361 | 0.279 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000abb | 15.417 | 3.312 | n/a | 0.000 | 0.066 | 0.962 | 1.604 | 0.025 | 0.000 | 3.765 | 5.154 | 0.498 | n/a | 0.031 | 3.378 | 0.219 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.137ms |
| 4497799727c33d370000000000000ba1 | 14.933 | 4.704 | n/a | 0.000 | 3.202 | 1.168 | 1.099 | 0.015 | 0.000 | 0.116 | 4.066 | 0.519 | n/a | 0.045 | 7.906 | 0.529 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b18 | 14.921 | 4.060 | n/a | 0.000 | 0.151 | 0.776 | 1.257 | 0.017 | 0.000 | 0.280 | 7.788 | 0.533 | n/a | 0.058 | 4.212 | 0.282 | 0.058 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b5f | 14.640 | 3.846 | n/a | 0.000 | 0.146 | 0.886 | 1.148 | 0.016 | 0.000 | 0.092 | 7.299 | 1.152 | n/a | 0.055 | 3.992 | 0.273 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b56 | 14.353 | 1.740 | n/a | 0.000 | 0.055 | 0.518 | 1.079 | 0.013 | 0.000 | 0.069 | 9.849 | 1.000 | n/a | 0.029 | 1.795 | 0.125 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b7d | 14.261 | 3.590 | n/a | 0.000 | 0.220 | 0.900 | 2.106 | 0.092 | 0.000 | 0.409 | 6.223 | 0.631 | n/a | 0.090 | 3.810 | 0.267 | 0.090 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000abe | 14.258 | 2.705 | n/a | 0.000 | 0.067 | 2.107 | 0.986 | 0.013 | 0.000 | 0.415 | 7.469 | 0.466 | n/a | 0.029 | 2.772 | 0.194 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b71 | 13.890 | 4.700 | n/a | 0.000 | 0.204 | 1.364 | 1.404 | 0.021 | 0.000 | 0.146 | 5.315 | 0.649 | n/a | 0.087 | 4.904 | 0.353 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a85 | 13.867 | 3.547 | n/a | 0.000 | 0.358 | 1.729 | 1.239 | 0.013 | 0.000 | 0.287 | 6.151 | 0.496 | n/a | 0.047 | 3.905 | 0.282 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a4c | 13.832 | 1.948 | n/a | 0.000 | 0.110 | 1.560 | 1.229 | 0.012 | 0.000 | 2.311 | 5.709 | 0.907 | n/a | 0.045 | 2.058 | 0.149 | 0.045 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000ad9 | 13.765 | 1.926 | n/a | 0.000 | 0.066 | 1.912 | 2.035 | 0.035 | 0.000 | 0.126 | 6.576 | 1.062 | n/a | 0.027 | 1.991 | 0.145 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a6a | 13.613 | 2.636 | n/a | 0.000 | 1.133 | 1.499 | 1.201 | 0.013 | 0.000 | 0.521 | 5.619 | 0.972 | n/a | 0.019 | 3.770 | 0.277 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000aca | 13.596 | 3.908 | n/a | 0.000 | 0.125 | 0.885 | 1.268 | 0.013 | 0.000 | 0.461 | 6.436 | 0.451 | n/a | 0.049 | 4.034 | 0.297 | 0.049 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b95 | 13.556 | 3.904 | n/a | 0.000 | 0.073 | 1.125 | 1.688 | 0.017 | 0.000 | 0.401 | 5.425 | 0.888 | n/a | 0.034 | 3.978 | 0.293 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b3e | 13.424 | 2.981 | n/a | 0.000 | 1.552 | 1.235 | 1.951 | 0.015 | 0.000 | 2.014 | 3.209 | 0.440 | n/a | 0.026 | 4.533 | 0.338 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.184 | 0.605 | 0.000 | 0.521 | 2.216 | n/a | 0.000 | 0.066 | 0.761 | 1.145 | 0.015 | 0.000 | 0.156 | 4.383 | 0.515 | n/a | 0.031 | 2.359 | 0.255 | 0.031 |
| p99 | 24.712 | 1.784 | 0.000 | 1.021 | 4.791 | n/a | 0.000 | 2.411 | 2.107 | 2.275 | 0.068 | 0.000 | 2.311 | 17.660 | 1.481 | n/a | 0.090 | 7.208 | 0.434 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4497799727c33d370000000000000a7c | 26.732 | 1.946 | n/a | 0.000 | 0.060 | 0.764 | 1.823 | 0.019 | 0.000 | 0.422 | 21.220 | 0.450 | n/a | 0.027 | 2.006 | 0.075 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a91 | 24.712 | 3.205 | n/a | 0.000 | 0.099 | 0.938 | 1.674 | 0.026 | 0.000 | 0.620 | 17.660 | 0.451 | n/a | 0.040 | 3.304 | 0.134 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b74 | 18.622 | 2.375 | n/a | 0.000 | 0.084 | 1.205 | 5.975 | 0.043 | 0.000 | 0.444 | 7.157 | 1.294 | n/a | 0.044 | 2.460 | 0.132 | 0.044 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000ae8 | 16.625 | 4.797 | n/a | 0.000 | 2.411 | 1.009 | 1.142 | 0.015 | 0.000 | 0.135 | 6.103 | 0.972 | n/a | 0.041 | 7.208 | 0.434 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b68 | 15.602 | 4.221 | n/a | 0.000 | 0.140 | 1.134 | 1.870 | 0.025 | 0.000 | 0.144 | 6.955 | 1.061 | n/a | 0.053 | 4.361 | 0.279 | 0.053 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000abb | 15.417 | 3.312 | n/a | 0.000 | 0.066 | 0.962 | 1.604 | 0.025 | 0.000 | 3.765 | 5.154 | 0.498 | n/a | 0.031 | 3.378 | 0.219 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.137ms |
| 4497799727c33d370000000000000ba1 | 14.933 | 4.704 | n/a | 0.000 | 3.202 | 1.168 | 1.099 | 0.015 | 0.000 | 0.116 | 4.066 | 0.519 | n/a | 0.045 | 7.906 | 0.529 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b18 | 14.921 | 4.060 | n/a | 0.000 | 0.151 | 0.776 | 1.257 | 0.017 | 0.000 | 0.280 | 7.788 | 0.533 | n/a | 0.058 | 4.212 | 0.282 | 0.058 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b5f | 14.640 | 3.846 | n/a | 0.000 | 0.146 | 0.886 | 1.148 | 0.016 | 0.000 | 0.092 | 7.299 | 1.152 | n/a | 0.055 | 3.992 | 0.273 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b56 | 14.353 | 1.740 | n/a | 0.000 | 0.055 | 0.518 | 1.079 | 0.013 | 0.000 | 0.069 | 9.849 | 1.000 | n/a | 0.029 | 1.795 | 0.125 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b7d | 14.261 | 3.590 | n/a | 0.000 | 0.220 | 0.900 | 2.106 | 0.092 | 0.000 | 0.409 | 6.223 | 0.631 | n/a | 0.090 | 3.810 | 0.267 | 0.090 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000abe | 14.258 | 2.705 | n/a | 0.000 | 0.067 | 2.107 | 0.986 | 0.013 | 0.000 | 0.415 | 7.469 | 0.466 | n/a | 0.029 | 2.772 | 0.194 | 0.029 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b71 | 13.890 | 4.700 | n/a | 0.000 | 0.204 | 1.364 | 1.404 | 0.021 | 0.000 | 0.146 | 5.315 | 0.649 | n/a | 0.087 | 4.904 | 0.353 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a85 | 13.867 | 3.547 | n/a | 0.000 | 0.358 | 1.729 | 1.239 | 0.013 | 0.000 | 0.287 | 6.151 | 0.496 | n/a | 0.047 | 3.905 | 0.282 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a4c | 13.832 | 1.948 | n/a | 0.000 | 0.110 | 1.560 | 1.229 | 0.012 | 0.000 | 2.311 | 5.709 | 0.907 | n/a | 0.045 | 2.058 | 0.149 | 0.045 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000ad9 | 13.765 | 1.926 | n/a | 0.000 | 0.066 | 1.912 | 2.035 | 0.035 | 0.000 | 0.126 | 6.576 | 1.062 | n/a | 0.027 | 1.991 | 0.145 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000a6a | 13.613 | 2.636 | n/a | 0.000 | 1.133 | 1.499 | 1.201 | 0.013 | 0.000 | 0.521 | 5.619 | 0.972 | n/a | 0.019 | 3.770 | 0.277 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000aca | 13.596 | 3.908 | n/a | 0.000 | 0.125 | 0.885 | 1.268 | 0.013 | 0.000 | 0.461 | 6.436 | 0.451 | n/a | 0.049 | 4.034 | 0.297 | 0.049 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b95 | 13.556 | 3.904 | n/a | 0.000 | 0.073 | 1.125 | 1.688 | 0.017 | 0.000 | 0.401 | 5.425 | 0.888 | n/a | 0.034 | 3.978 | 0.293 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 4497799727c33d370000000000000b3e | 13.424 | 2.981 | n/a | 0.000 | 1.552 | 1.235 | 1.951 | 0.015 | 0.000 | 2.014 | 3.209 | 0.440 | n/a | 0.026 | 4.533 | 0.338 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.583 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.658 | 200.711 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.105 | 0.039 | 0.000 | 0.105 |
| p99 | 379.963 | n/a | n/a | n/a | 13.299 | n/a | 1.517 | 0.000 | 1.504 | 375.872 | 0.101 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.305 | 14.816 | 0.168 | 0.305 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf0000000000000002 | 379.963 | 2.738 | n/a | 0.000 | 0.000 | 0.873 | 375.872 | 0.101 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.305 | 2.738 | 0.007 | 0.305 | gw-r/thread-44/gateway.admitted-work | none observed |
| 2f2ae7af6f6f22940000000000000005 | 203.104 | 0.066 | n/a | 0.000 | 0.000 | 1.214 | 201.521 | 0.036 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.105 | 0.066 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000091f | 201.730 | 0.033 | n/a | 0.000 | 0.000 | 0.658 | 200.877 | 0.012 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.097 | 0.033 | 0.000 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000920 | 201.611 | 0.034 | n/a | 0.000 | 0.000 | 0.583 | 200.846 | 0.010 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.094 | 0.034 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000921 | 201.583 | 0.039 | n/a | 0.000 | 0.000 | 0.766 | 200.622 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.117 | 0.039 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000922 | 201.249 | 0.021 | n/a | 0.000 | 0.000 | 0.408 | 200.711 | 0.009 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.049 | 0.021 | 0.000 | 0.049 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000006 | 113.715 | 0.200 | n/a | 0.000 | 0.000 | 1.504 | 111.644 | 0.011 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.168 | 0.200 | 0.002 | 0.168 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000925 | 88.371 | 13.299 | n/a | 1.517 | 0.000 | 0.636 | 72.757 | 0.004 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.155 | 14.816 | 0.168 | 0.155 | gw-r/thread-65/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.234 | n/a | n/a | n/a | 1.962 | n/a | 0.000 | 0.000 | 0.561 | 40.619 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.061 | 1.962 | 0.021 | 0.061 |
| p99 | 1004.473 | n/a | n/a | n/a | 3.069 | n/a | 0.000 | 0.000 | 1.440 | 1000.340 | 0.013 | 0.000 | 1.258 | 0.000 | n/a | n/a | 1.230 | 3.069 | 0.111 | 1.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf00000000000000a4 | 1004.473 | 0.193 | n/a | 0.000 | 0.000 | 1.440 | 1000.340 | 0.013 | 0.000 | 1.258 | 0.000 | n/a | n/a | 1.230 | 0.193 | 0.000 | 1.230 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000005ba | 93.936 | 2.011 | n/a | 0.000 | 0.000 | 0.525 | 91.271 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.068 | 2.011 | 0.021 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000048e | 43.234 | 1.962 | n/a | 0.000 | 0.000 | 0.561 | 40.619 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.048 | 1.962 | 0.045 | 0.048 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000361 | 27.671 | 3.069 | n/a | 0.000 | 0.000 | 0.593 | 23.928 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.061 | 3.069 | 0.111 | 0.061 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / internal (202 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.517 | n/a | n/a | n/a | 2.413 | n/a | 0.000 | 0.000 | 0.671 | 20.183 | 0.010 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.066 | 2.413 | 0.109 | 0.066 |
| p99 | 52.460 | n/a | n/a | n/a | 5.677 | n/a | 0.000 | 0.000 | 5.628 | 49.099 | 3.628 | 0.000 | 0.570 | 0.000 | n/a | n/a | 0.330 | 5.677 | 0.350 | 0.330 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf0000000000000234 | 1002.691 | 0.125 | n/a | 0.000 | 0.000 | 0.662 | 1000.735 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.103 | 0.125 | 0.000 | 1.103 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000214 | 53.365 | 2.719 | n/a | 0.000 | 0.000 | 1.202 | 49.323 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.061 | 2.719 | 0.051 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000000cb | 52.460 | 2.217 | n/a | 0.000 | 0.000 | 0.584 | 24.132 | 0.014 | 25.346 | 0.097 | 0.000 | n/a | n/a | 0.071 | 2.217 | 0.042 | 0.071 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| 4575ad38cc4ca3bf000000000000014d | 52.164 | 2.321 | n/a | 0.000 | 0.000 | 0.548 | 49.099 | 0.048 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.065 | 2.321 | 0.044 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000000a5 | 51.755 | 6.577 | n/a | 0.000 | 0.000 | 0.961 | 43.638 | 0.273 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.235 | 6.577 | 0.127 | 0.235 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000001a9 | 50.513 | 4.920 | n/a | 0.000 | 0.000 | 0.624 | 28.946 | 0.004 | 15.882 | 0.017 | 0.000 | n/a | n/a | 0.121 | 4.920 | 0.097 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000020d | 39.268 | 2.249 | n/a | 0.000 | 0.000 | 0.573 | 36.365 | 0.009 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.053 | 2.249 | 0.057 | 0.053 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000236 | 38.521 | 2.540 | n/a | 0.000 | 0.000 | 0.660 | 35.236 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.065 | 2.540 | 0.066 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000155 | 36.855 | 3.433 | n/a | 0.000 | 0.000 | 3.046 | 30.292 | 0.006 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.061 | 3.433 | 0.093 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000000ed | 36.565 | 2.718 | n/a | 0.000 | 0.000 | 0.587 | 33.031 | 0.027 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.072 | 2.718 | 0.074 | 0.072 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000000da | 35.408 | 2.240 | n/a | 0.000 | 0.000 | 0.744 | 32.224 | 0.022 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.066 | 2.240 | 0.063 | 0.066 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000000c8 | 35.029 | 4.193 | n/a | 0.000 | 0.000 | 0.666 | 30.005 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.087 | 4.193 | 0.120 | 0.087 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000190 | 34.749 | 3.581 | n/a | 0.000 | 0.000 | 0.416 | 30.571 | 0.016 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.063 | 3.581 | 0.103 | 0.063 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000229 | 33.688 | 2.692 | n/a | 0.000 | 0.000 | 0.435 | 30.456 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.059 | 2.692 | 0.080 | 0.059 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000001f4 | 32.923 | 4.512 | n/a | 0.000 | 0.000 | 0.669 | 27.554 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.131 | 4.512 | 0.137 | 0.131 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000001ce | 32.565 | 2.638 | n/a | 0.000 | 0.000 | 0.476 | 29.349 | 0.009 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.068 | 2.638 | 0.081 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000001a2 | 32.397 | 5.677 | n/a | 0.000 | 0.000 | 0.769 | 25.653 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.189 | 5.677 | 0.175 | 0.189 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000128 | 32.300 | 3.569 | n/a | 0.000 | 0.000 | 1.140 | 27.292 | 0.022 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.130 | 3.569 | 0.110 | 0.130 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000000f6 | 31.946 | 2.187 | n/a | 0.000 | 0.000 | 0.705 | 28.756 | 0.026 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.067 | 2.187 | 0.068 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000001df | 31.909 | 2.343 | n/a | 0.000 | 0.000 | 0.806 | 28.673 | 0.010 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.048 | 2.343 | 0.073 | 0.048 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-10 / internal (147 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.661 | n/a | n/a | n/a | 2.296 | n/a | 0.000 | 0.000 | 0.633 | 5.285 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.061 | 2.296 | 0.288 | 0.061 |
| p99 | 40.273 | n/a | n/a | n/a | 6.585 | n/a | 0.000 | 0.000 | 6.132 | 33.990 | 0.420 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.186 | 6.585 | 0.763 | 0.186 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf000000000000035f | 1008.058 | 2.226 | n/a | 0.000 | 0.000 | 2.988 | 1002.726 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.056 | 2.226 | 0.002 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000291 | 40.273 | 2.697 | n/a | 0.000 | 0.000 | 3.077 | 33.990 | 0.420 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.071 | 2.697 | 0.067 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000316 | 20.384 | 4.467 | n/a | 0.000 | 0.000 | 0.658 | 15.111 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.102 | 4.467 | 0.219 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000002ef | 20.169 | 3.811 | n/a | 0.000 | 0.000 | 0.620 | 15.631 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.062 | 3.811 | 0.189 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000334 | 19.083 | 2.204 | n/a | 0.000 | 0.000 | 0.454 | 16.288 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.063 | 2.204 | 0.115 | 0.063 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000002e9 | 17.908 | 4.423 | n/a | 0.000 | 0.000 | 0.642 | 12.720 | 0.004 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.062 | 4.423 | 0.247 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000002ff | 17.604 | 3.534 | n/a | 0.000 | 0.000 | 1.367 | 12.604 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.058 | 3.534 | 0.201 | 0.058 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000002a2 | 17.586 | 2.237 | n/a | 0.000 | 0.000 | 0.613 | 14.604 | 0.005 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.055 | 2.237 | 0.127 | 0.055 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000307 | 17.568 | 2.218 | n/a | 0.000 | 0.000 | 4.198 | 11.040 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.068 | 2.218 | 0.126 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000025c | 17.319 | 4.294 | n/a | 0.000 | 0.000 | 0.594 | 12.299 | 0.002 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.108 | 4.294 | 0.248 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000281 | 17.289 | 2.679 | n/a | 0.000 | 0.000 | 0.710 | 13.773 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.061 | 2.679 | 0.155 | 0.061 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000030a | 17.059 | 4.355 | n/a | 0.000 | 0.000 | 0.723 | 11.741 | 0.012 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.177 | 4.355 | 0.255 | 0.177 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000032f | 16.979 | 2.010 | n/a | 0.000 | 0.000 | 0.343 | 14.561 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.049 | 2.010 | 0.118 | 0.049 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000034d | 16.519 | 4.243 | n/a | 0.000 | 0.000 | 0.729 | 11.433 | 0.006 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.090 | 4.243 | 0.257 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000239 | 16.089 | 7.361 | n/a | 0.000 | 0.000 | 1.192 | 7.336 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.189 | 7.361 | 0.458 | 0.189 | node-14/thread-2/replica.fetch-feed | none observed |
| 4575ad38cc4ca3bf0000000000000244 | 15.852 | 4.653 | n/a | 0.000 | 0.000 | 0.572 | 10.440 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.135 | 4.653 | 0.294 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000250 | 15.821 | 4.451 | n/a | 0.000 | 0.000 | 0.543 | 10.702 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.099 | 4.451 | 0.281 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000028a | 15.643 | 4.817 | n/a | 0.000 | 0.000 | 0.657 | 10.002 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.126 | 4.817 | 0.308 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000002ca | 15.290 | 2.486 | n/a | 0.000 | 0.000 | 0.335 | 12.386 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.054 | 2.486 | 0.163 | 0.054 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000259 | 14.984 | 2.473 | n/a | 0.000 | 0.000 | 0.547 | 11.868 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.061 | 2.473 | 0.165 | 0.061 | gw-r/thread-44/journal/page | none observed |

## P3 / idle-25 / internal (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.762 | n/a | n/a | n/a | 2.224 | n/a | 0.000 | 0.000 | 0.532 | 21.381 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.055 | 2.224 | 0.096 | 0.055 |
| p99 | 49.695 | n/a | n/a | n/a | 4.716 | n/a | 0.000 | 0.000 | 5.163 | 44.988 | 0.307 | 0.000 | 0.225 | 0.000 | n/a | n/a | 0.183 | 4.716 | 0.214 | 0.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf000000000000048a | 1002.450 | 0.116 | n/a | 0.000 | 0.000 | 0.481 | 1000.696 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.104 | 0.116 | 0.000 | 1.104 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000457 | 49.695 | 4.025 | n/a | 0.000 | 0.000 | 0.574 | 44.988 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.093 | 4.025 | 0.081 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000046e | 34.787 | 1.941 | n/a | 0.000 | 0.000 | 0.494 | 32.272 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.048 | 1.941 | 0.056 | 0.048 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000003e8 | 32.266 | 2.611 | n/a | 0.000 | 0.000 | 0.417 | 29.141 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.054 | 2.611 | 0.081 | 0.054 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000036f | 31.673 | 4.616 | n/a | 0.000 | 0.000 | 1.985 | 24.901 | 0.079 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.083 | 4.616 | 0.146 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000003f9 | 31.251 | 1.915 | n/a | 0.000 | 0.000 | 0.256 | 28.974 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.052 | 1.915 | 0.061 | 0.052 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000003ed | 31.204 | 2.526 | n/a | 0.000 | 0.000 | 0.965 | 27.591 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.058 | 2.526 | 0.081 | 0.058 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000039a | 30.782 | 3.097 | n/a | 0.000 | 0.000 | 0.626 | 26.969 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.060 | 3.097 | 0.101 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000375 | 30.437 | 2.086 | n/a | 0.000 | 0.000 | 12.184 | 16.037 | 0.008 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.051 | 2.086 | 0.069 | 0.051 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000003b0 | 30.174 | 3.773 | n/a | 0.000 | 0.000 | 0.474 | 25.860 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.056 | 3.773 | 0.125 | 0.056 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000003a7 | 29.930 | 2.207 | n/a | 0.000 | 0.000 | 1.488 | 26.140 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.060 | 2.207 | 0.074 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000036b | 29.597 | 2.072 | n/a | 0.000 | 0.000 | 0.399 | 27.037 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.052 | 2.072 | 0.070 | 0.052 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000037c | 29.575 | 4.990 | n/a | 0.000 | 0.000 | 0.686 | 23.773 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.088 | 4.990 | 0.169 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000424 | 29.281 | 4.716 | n/a | 0.000 | 0.000 | 1.788 | 22.648 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.091 | 4.716 | 0.161 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000472 | 29.241 | 2.792 | n/a | 0.000 | 0.000 | 0.532 | 25.779 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.088 | 2.792 | 0.095 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000044d | 29.218 | 2.196 | n/a | 0.000 | 0.000 | 0.361 | 26.580 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.049 | 2.196 | 0.075 | 0.049 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000003b8 | 29.147 | 2.129 | n/a | 0.000 | 0.000 | 0.321 | 26.599 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.054 | 2.129 | 0.073 | 0.054 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000482 | 29.114 | 4.060 | n/a | 0.000 | 0.000 | 2.275 | 22.677 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.094 | 4.060 | 0.139 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000428 | 29.040 | 2.100 | n/a | 0.000 | 0.000 | 0.415 | 26.413 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.053 | 2.100 | 0.072 | 0.053 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000003c0 | 29.026 | 2.050 | n/a | 0.000 | 0.000 | 0.470 | 26.403 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.050 | 2.050 | 0.071 | 0.050 | gw-r/thread-44/journal/page | none observed |

## P3 / idle-50 / internal (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.912 | n/a | n/a | n/a | 2.136 | n/a | 0.000 | 0.000 | 0.522 | 46.887 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.056 | 2.136 | 0.045 | 0.056 |
| p99 | 79.813 | n/a | n/a | n/a | 4.188 | n/a | 0.000 | 0.000 | 3.992 | 76.738 | 0.281 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.109 | 4.188 | 0.088 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf00000000000005b7 | 1002.825 | 0.133 | n/a | 0.000 | 0.000 | 0.689 | 1000.827 | 0.004 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.115 | 0.133 | 0.000 | 1.115 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000004e7 | 79.813 | 2.430 | n/a | 0.000 | 0.000 | 0.531 | 76.738 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.067 | 2.430 | 0.030 | 0.067 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000055f | 62.528 | 2.050 | n/a | 0.000 | 0.000 | 0.393 | 49.842 | 0.007 | 10.135 | 0.045 | 0.000 | n/a | n/a | 0.056 | 2.050 | 0.033 | 0.056 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000050d | 59.957 | 1.984 | n/a | 0.000 | 0.000 | 0.989 | 56.880 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.053 | 1.984 | 0.033 | 0.053 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000049f | 59.673 | 2.000 | n/a | 0.000 | 0.000 | 0.395 | 57.171 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.049 | 2.000 | 0.034 | 0.049 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000499 | 57.482 | 2.051 | n/a | 0.000 | 0.000 | 0.622 | 54.697 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.057 | 2.051 | 0.036 | 0.057 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000056b | 57.115 | 4.127 | n/a | 0.000 | 0.000 | 1.312 | 51.542 | 0.010 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.103 | 4.127 | 0.072 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000004fc | 56.754 | 4.014 | n/a | 0.000 | 0.000 | 0.403 | 52.231 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.090 | 4.014 | 0.071 | 0.090 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000004f5 | 56.116 | 4.188 | n/a | 0.000 | 0.000 | 0.594 | 51.210 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.095 | 4.188 | 0.075 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000557 | 56.004 | 2.064 | n/a | 0.000 | 0.000 | 0.274 | 53.601 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.053 | 2.064 | 0.037 | 0.053 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000051e | 55.274 | 2.941 | n/a | 0.000 | 0.000 | 0.689 | 51.546 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.050 | 2.941 | 0.053 | 0.050 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000597 | 54.973 | 4.029 | n/a | 0.000 | 0.000 | 0.703 | 50.113 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.095 | 4.029 | 0.073 | 0.095 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000493 | 54.752 | 3.392 | n/a | 0.000 | 0.000 | 0.522 | 50.743 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.056 | 3.392 | 0.062 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000005b9 | 54.700 | 2.202 | n/a | 0.000 | 0.000 | 0.636 | 51.767 | 0.002 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.066 | 2.202 | 0.040 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000005a5 | 54.547 | 2.004 | n/a | 0.000 | 0.000 | 0.397 | 52.045 | 0.003 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.064 | 2.004 | 0.037 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000541 | 54.407 | 1.982 | n/a | 0.000 | 0.000 | 5.083 | 46.970 | 0.281 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.058 | 1.982 | 0.036 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000589 | 54.177 | 4.056 | n/a | 0.000 | 0.000 | 0.497 | 49.462 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.098 | 4.056 | 0.075 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000004ad | 53.935 | 4.020 | n/a | 0.000 | 0.000 | 0.547 | 49.258 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.100 | 4.020 | 0.075 | 0.100 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000567 | 53.825 | 3.701 | n/a | 0.000 | 0.000 | 0.601 | 49.427 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.061 | 3.701 | 0.069 | 0.061 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000004d1 | 53.413 | 3.196 | n/a | 0.000 | 0.000 | 0.544 | 49.516 | 0.010 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.090 | 3.196 | 0.060 | 0.090 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-100 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 99.925 | n/a | n/a | n/a | 2.249 | n/a | 0.000 | 0.000 | 0.540 | 96.844 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.062 | 2.249 | 0.023 | 0.062 |
| p99 | 240.817 | n/a | n/a | n/a | 5.597 | n/a | 0.000 | 0.000 | 2.230 | 237.949 | 0.198 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.143 | 5.597 | 0.054 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf00000000000006e4 | 1004.277 | 0.160 | n/a | 0.000 | 0.000 | 1.184 | 1000.737 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 2.155 | 0.160 | 0.000 | 2.155 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000006e8 | 240.817 | 2.135 | n/a | 0.000 | 0.000 | 0.631 | 237.949 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.066 | 2.135 | 0.009 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000611 | 112.457 | 12.782 | n/a | 0.000 | 0.000 | 0.620 | 98.924 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.074 | 12.782 | 0.114 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000646 | 109.227 | 2.135 | n/a | 0.000 | 0.000 | 0.412 | 106.536 | 0.017 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.066 | 2.135 | 0.020 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000638 | 109.137 | 3.188 | n/a | 0.000 | 0.000 | 0.578 | 105.264 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.068 | 3.188 | 0.029 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000005f7 | 107.987 | 2.043 | n/a | 0.000 | 0.000 | 0.391 | 105.462 | 0.003 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.057 | 2.043 | 0.019 | 0.057 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000065c | 107.071 | 4.468 | n/a | 0.000 | 0.000 | 0.522 | 101.894 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.127 | 4.468 | 0.042 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000620 | 106.155 | 4.940 | n/a | 0.000 | 0.000 | 0.626 | 100.431 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.116 | 4.940 | 0.047 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000627 | 106.006 | 4.192 | n/a | 0.000 | 0.000 | 0.535 | 101.164 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.094 | 4.192 | 0.040 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000006c0 | 105.855 | 3.958 | n/a | 0.000 | 0.000 | 1.559 | 100.191 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.084 | 3.958 | 0.037 | 0.084 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000060c | 105.079 | 4.584 | n/a | 0.000 | 0.000 | 0.506 | 99.843 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.111 | 4.584 | 0.044 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000616 | 104.845 | 4.096 | n/a | 0.000 | 0.000 | 0.521 | 100.084 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.103 | 4.096 | 0.039 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000608 | 104.724 | 2.156 | n/a | 0.000 | 0.000 | 0.497 | 101.964 | 0.003 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.063 | 2.156 | 0.021 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000006ac | 104.450 | 2.255 | n/a | 0.000 | 0.000 | 2.173 | 99.913 | 0.003 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.062 | 2.255 | 0.022 | 0.062 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000005d0 | 104.221 | 2.173 | n/a | 0.000 | 0.000 | 0.557 | 101.376 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.054 | 2.173 | 0.021 | 0.054 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000681 | 103.517 | 5.597 | n/a | 0.000 | 0.000 | 0.463 | 97.323 | 0.002 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.114 | 5.597 | 0.054 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000005e5 | 103.466 | 3.270 | n/a | 0.000 | 0.000 | 0.586 | 99.508 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.063 | 3.270 | 0.032 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000068a | 103.456 | 2.040 | n/a | 0.000 | 0.000 | 0.431 | 100.909 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.066 | 2.040 | 0.020 | 0.066 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000675 | 103.391 | 2.060 | n/a | 0.000 | 0.000 | 0.511 | 100.720 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.057 | 2.060 | 0.020 | 0.057 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000687 | 103.172 | 1.994 | n/a | 0.000 | 0.000 | 0.581 | 100.491 | 0.003 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.056 | 1.994 | 0.019 | 0.056 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-250 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 250.444 | n/a | n/a | n/a | 2.500 | n/a | 0.000 | 0.000 | 0.663 | 246.583 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.066 | 2.500 | 0.010 | 0.066 |
| p99 | 496.539 | n/a | n/a | n/a | 5.915 | n/a | 0.000 | 0.000 | 4.963 | 493.055 | 0.046 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.335 | 5.915 | 0.023 | 0.335 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf0000000000000811 | 1002.944 | 0.231 | n/a | 0.000 | 0.000 | 0.810 | 1000.675 | 0.005 | 0.000 | 0.061 | 0.000 | n/a | n/a | 1.162 | 0.231 | 0.000 | 1.162 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000814 | 496.539 | 2.859 | n/a | 0.000 | 0.000 | 0.489 | 493.055 | 0.003 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.103 | 2.859 | 0.006 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000007a8 | 273.984 | 3.098 | n/a | 0.000 | 0.000 | 2.659 | 268.099 | 0.002 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.060 | 3.098 | 0.011 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000727 | 263.524 | 2.439 | n/a | 0.000 | 0.000 | 0.431 | 260.558 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.060 | 2.439 | 0.009 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000740 | 262.807 | 2.909 | n/a | 0.000 | 0.000 | 0.538 | 247.530 | 0.003 | 11.722 | 0.009 | 0.000 | n/a | n/a | 0.096 | 2.909 | 0.011 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000007b3 | 259.977 | 2.151 | n/a | 0.000 | 0.000 | 0.411 | 257.308 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.054 | 2.151 | 0.008 | 0.054 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000007e0 | 259.156 | 5.673 | n/a | 0.000 | 0.000 | 1.441 | 251.782 | 0.003 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.222 | 5.673 | 0.022 | 0.222 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000751 | 257.756 | 2.419 | n/a | 0.000 | 0.000 | 5.144 | 250.059 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.085 | 2.419 | 0.009 | 0.085 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000077d | 257.416 | 3.623 | n/a | 0.000 | 0.000 | 0.698 | 252.978 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.066 | 3.623 | 0.014 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000007ce | 256.748 | 5.915 | n/a | 0.000 | 0.000 | 0.557 | 250.114 | 0.027 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.096 | 5.915 | 0.023 | 0.096 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000719 | 256.491 | 2.943 | n/a | 0.000 | 0.000 | 0.270 | 253.167 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.052 | 2.943 | 0.011 | 0.052 | gw-r/thread-51/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000007c7 | 255.385 | 4.351 | n/a | 0.000 | 0.000 | 0.779 | 250.089 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.109 | 4.351 | 0.017 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000795 | 255.274 | 3.441 | n/a | 0.000 | 0.000 | 0.761 | 250.960 | 0.009 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.063 | 3.441 | 0.013 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000701 | 255.178 | 4.304 | n/a | 0.000 | 0.000 | 1.171 | 249.500 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.162 | 4.304 | 0.017 | 0.162 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000007e7 | 255.062 | 2.191 | n/a | 0.000 | 0.000 | 0.531 | 252.241 | 0.003 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.062 | 2.191 | 0.009 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000006f4 | 254.881 | 2.063 | n/a | 0.000 | 0.000 | 1.105 | 251.608 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.059 | 2.063 | 0.008 | 0.059 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000007b0 | 254.810 | 4.544 | n/a | 0.000 | 0.000 | 0.519 | 249.576 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.118 | 4.544 | 0.018 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000747 | 254.613 | 2.450 | n/a | 0.000 | 0.000 | 4.963 | 247.084 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.067 | 2.450 | 0.010 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000076e | 254.479 | 4.743 | n/a | 0.000 | 0.000 | 0.702 | 248.855 | 0.003 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.147 | 4.743 | 0.019 | 0.147 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000731 | 254.327 | 4.307 | n/a | 0.000 | 0.000 | 1.017 | 248.851 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.120 | 4.307 | 0.017 | 0.120 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-500 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 500.276 | n/a | n/a | n/a | 2.564 | n/a | 0.000 | 0.000 | 0.660 | 496.246 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.067 | 2.564 | 0.005 | 0.067 |
| p99 | 998.921 | n/a | n/a | n/a | 5.473 | n/a | 0.000 | 0.000 | 3.291 | 996.263 | 0.023 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.165 | 5.473 | 0.011 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf000000000000093e | 1003.086 | 0.217 | n/a | 0.000 | 0.000 | 0.656 | 1000.982 | 0.017 | 0.000 | 0.074 | 0.000 | n/a | n/a | 1.140 | 0.217 | 0.000 | 1.140 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000941 | 998.921 | 2.110 | n/a | 0.000 | 0.000 | 0.430 | 996.263 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.060 | 2.110 | 0.002 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000008b0 | 512.103 | 4.926 | n/a | 0.000 | 0.000 | 0.744 | 506.266 | 0.003 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.132 | 4.926 | 0.010 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000938 | 509.454 | 4.440 | n/a | 0.000 | 0.000 | 0.688 | 504.220 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.056 | 4.440 | 0.009 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000008f4 | 508.241 | 4.880 | n/a | 0.000 | 0.000 | 3.291 | 499.826 | 0.009 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.105 | 4.880 | 0.010 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000888 | 508.003 | 4.420 | n/a | 0.000 | 0.000 | 1.055 | 502.370 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.106 | 4.420 | 0.009 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000008ab | 507.930 | 4.266 | n/a | 0.000 | 0.000 | 0.794 | 502.764 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.065 | 4.266 | 0.008 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000091d | 506.488 | 5.369 | n/a | 0.000 | 0.000 | 2.239 | 498.733 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.108 | 5.369 | 0.011 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000090c | 505.863 | 2.026 | n/a | 0.000 | 0.000 | 1.141 | 502.572 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.055 | 2.026 | 0.004 | 0.055 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000882 | 505.780 | 5.473 | n/a | 0.000 | 0.000 | 0.850 | 499.306 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.113 | 5.473 | 0.011 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000918 | 505.014 | 4.946 | n/a | 0.000 | 0.000 | 0.705 | 499.209 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.128 | 4.946 | 0.010 | 0.128 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000856 | 504.984 | 4.633 | n/a | 0.000 | 0.000 | 0.901 | 499.282 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.134 | 4.633 | 0.009 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000870 | 504.801 | 2.348 | n/a | 0.000 | 0.000 | 0.617 | 501.744 | 0.003 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.066 | 2.348 | 0.005 | 0.066 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000083a | 504.759 | 4.711 | n/a | 0.000 | 0.000 | 1.021 | 498.867 | 0.003 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.123 | 4.711 | 0.009 | 0.123 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000878 | 504.608 | 2.957 | n/a | 0.000 | 0.000 | 0.699 | 500.778 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.117 | 2.957 | 0.006 | 0.117 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000860 | 504.551 | 2.348 | n/a | 0.000 | 0.000 | 1.009 | 501.094 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.062 | 2.348 | 0.005 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000008c9 | 504.540 | 2.424 | n/a | 0.000 | 0.000 | 0.667 | 501.346 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.057 | 2.424 | 0.005 | 0.057 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000086c | 504.533 | 2.174 | n/a | 0.000 | 0.000 | 0.500 | 501.744 | 0.023 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.060 | 2.174 | 0.004 | 0.060 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000088c | 504.157 | 2.106 | n/a | 0.000 | 0.000 | 0.963 | 500.990 | 0.009 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.059 | 2.106 | 0.004 | 0.059 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf000000000000085a | 504.137 | 2.329 | n/a | 0.000 | 0.000 | 0.489 | 501.226 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.060 | 2.329 | 0.005 | 0.060 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-1000 / internal (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 999.815 | n/a | n/a | n/a | 3.211 | n/a | 0.000 | 0.000 | 0.681 | 995.147 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.079 | 3.549 | 0.004 | 0.079 |
| p99 | 1007.167 | n/a | n/a | n/a | 7.292 | n/a | 1.504 | 0.000 | 4.285 | 1000.844 | 0.012 | 0.000 | 0.075 | 0.000 | n/a | n/a | 1.177 | 8.797 | 0.362 | 1.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4575ad38cc4ca3bf0000000000000969 | 1008.687 | 7.292 | n/a | 1.504 | 0.000 | 0.531 | 999.131 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.201 | 8.797 | 0.009 | 0.201 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000a00 | 1007.167 | 5.925 | n/a | 0.000 | 0.000 | 0.743 | 1000.315 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.156 | 5.925 | 0.006 | 0.156 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000962 | 1006.744 | 5.433 | n/a | 0.930 | 0.000 | 1.476 | 998.620 | 0.010 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.198 | 6.363 | 0.006 | 0.198 | gw-r/thread-46/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000009b4 | 1006.592 | 6.413 | n/a | 0.000 | 0.000 | 1.141 | 998.888 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.118 | 6.413 | 0.006 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000009c0 | 1005.969 | 2.752 | n/a | 0.000 | 0.000 | 4.947 | 998.141 | 0.009 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.082 | 2.752 | 0.003 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000977 | 1005.451 | 6.036 | n/a | 0.877 | 0.000 | 0.635 | 997.745 | 0.009 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.109 | 6.913 | 0.007 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000009fa | 1004.967 | 3.743 | n/a | 0.000 | 0.000 | 0.725 | 1000.402 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.068 | 3.743 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000983 | 1004.741 | 3.299 | n/a | 0.605 | 0.000 | 0.389 | 1000.350 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.071 | 3.905 | 0.004 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000a66 | 1004.493 | 2.529 | n/a | 1.112 | 0.000 | 0.644 | 1000.052 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.095 | 3.641 | 0.004 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000009cc | 1004.491 | 5.723 | n/a | 0.922 | 0.000 | 0.877 | 996.774 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.137 | 6.645 | 0.007 | 0.137 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000a17 | 1004.454 | 2.566 | n/a | 0.000 | 0.000 | 0.635 | 1001.134 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.075 | 2.566 | 0.003 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000a45 | 1004.244 | 3.014 | n/a | 0.000 | 0.000 | 0.527 | 1000.573 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.095 | 3.014 | 0.003 | 0.095 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000a25 | 1004.237 | 4.793 | n/a | 0.000 | 0.000 | 0.790 | 998.503 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.115 | 4.793 | 0.005 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000a2d | 1004.221 | 7.153 | n/a | 0.999 | 0.000 | 0.580 | 995.188 | 0.008 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.254 | 8.152 | 0.008 | 0.254 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000009ac | 1004.193 | 4.573 | n/a | 0.786 | 0.000 | 0.565 | 998.152 | 0.006 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.085 | 5.359 | 0.005 | 0.085 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000009a8 | 1004.174 | 3.953 | n/a | 0.607 | 0.000 | 0.497 | 998.997 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.078 | 4.560 | 0.005 | 0.078 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000a5d | 1003.740 | 3.245 | n/a | 0.000 | 0.000 | 0.717 | 999.665 | 0.006 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.078 | 3.245 | 0.003 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000009e1 | 1003.676 | 2.921 | n/a | 0.000 | 0.000 | 1.675 | 998.970 | 0.007 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.070 | 2.921 | 0.003 | 0.070 | gw-r/thread-65/journal/page | none observed |
| 4575ad38cc4ca3bf00000000000009d6 | 1003.642 | 3.854 | n/a | 0.866 | 0.000 | 1.460 | 997.323 | 0.007 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.094 | 4.720 | 0.005 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 4575ad38cc4ca3bf0000000000000a69 | 1003.613 | 2.869 | n/a | 0.000 | 0.000 | 0.423 | 1000.188 | 0.011 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.075 | 2.869 | 0.003 | 0.075 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.721 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 0.717 | 200.770 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.112 | 0.045 | 0.000 | 0.112 |
| p99 | 202.104 | n/a | n/a | n/a | 0.067 | n/a | 0.000 | 0.000 | 4.060 | 201.068 | 33.407 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.135 | 0.067 | 0.001 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f2ae7af6f6f229400000000000000d0 | 202.104 | 0.041 | n/a | 0.000 | 0.000 | 0.806 | 201.068 | 0.011 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.090 | 0.041 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f229400000000000000ce | 201.778 | 0.041 | n/a | 0.000 | 0.000 | 0.613 | 200.918 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.113 | 0.041 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f229400000000000000cf | 201.739 | 0.046 | n/a | 0.000 | 0.000 | 0.722 | 200.770 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.135 | 0.046 | 0.000 | 0.135 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f229400000000000000cd | 201.721 | 0.045 | n/a | 0.000 | 0.000 | 0.717 | 200.780 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.117 | 0.045 | 0.000 | 0.117 | gw-r/thread-51/journal/page | none observed |
| 2f2ae7af6f6f229400000000000000d1 | 140.590 | 0.047 | n/a | 0.000 | 0.000 | 0.666 | 139.746 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.083 | 0.047 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000018 | 51.601 | 0.067 | n/a | 0.000 | 0.000 | 4.060 | 13.920 | 33.407 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.112 | 0.067 | 0.001 | 0.112 | gw-r/thread-50/gateway.admission-wait | none observed |

## P3 / idle-10 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.940 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.751 | 201.004 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.083 | 0.047 | 0.000 | 0.083 |
| p99 | 203.930 | n/a | n/a | n/a | 0.066 | n/a | 0.000 | 0.000 | 1.080 | 202.667 | 0.613 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.195 | 0.066 | 0.000 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f2ae7af6f6f22940000000000000162 | 203.930 | 0.047 | n/a | 0.000 | 0.000 | 1.080 | 202.667 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.083 | 0.047 | 0.000 | 0.083 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000165 | 202.211 | 0.066 | n/a | 0.000 | 0.000 | 0.858 | 201.004 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.195 | 0.066 | 0.000 | 0.195 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000164 | 201.940 | 0.060 | n/a | 0.000 | 0.000 | 0.751 | 200.933 | 0.007 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.132 | 0.060 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000163 | 201.934 | 0.031 | n/a | 0.000 | 0.000 | 0.517 | 201.233 | 0.011 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000166 | 114.524 | 0.046 | n/a | 0.000 | 0.000 | 0.687 | 113.079 | 0.613 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.072 | 0.046 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-25 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.127 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.699 | 201.211 | 0.009 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.081 | 0.036 | 0.000 | 0.081 |
| p99 | 202.490 | n/a | n/a | n/a | 0.106 | n/a | 0.000 | 0.000 | 0.849 | 201.599 | 0.010 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.126 | 0.106 | 0.001 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f2ae7af6f6f229400000000000001fd | 202.490 | 0.033 | n/a | 0.000 | 0.000 | 0.677 | 201.599 | 0.010 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.069 | 0.033 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f229400000000000001fe | 202.338 | 0.036 | n/a | 0.000 | 0.000 | 0.699 | 201.386 | 0.010 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.082 | 0.036 | 0.000 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f229400000000000001ff | 202.127 | 0.036 | n/a | 0.000 | 0.000 | 0.717 | 201.211 | 0.009 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.069 | 0.036 | 0.000 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f229400000000000001fc | 201.489 | 0.047 | n/a | 0.000 | 0.000 | 0.653 | 200.650 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.081 | 0.047 | 0.000 | 0.081 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000200 | 135.060 | 0.106 | n/a | 0.000 | 0.000 | 0.849 | 133.925 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.126 | 0.106 | 0.001 | 0.126 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-50 / read (24 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.436 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.626 | 50.641 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.060 | 0.042 | 0.001 | 0.060 |
| p99 | 202.494 | n/a | n/a | n/a | 0.084 | n/a | 0.000 | 0.000 | 3.434 | 201.412 | 14.522 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.123 | 0.084 | 0.001 | 0.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f2ae7af6f6f22940000000000000297 | 202.494 | 0.050 | n/a | 0.000 | 0.000 | 0.810 | 201.412 | 0.007 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.123 | 0.050 | 0.000 | 0.123 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000299 | 202.477 | 0.032 | n/a | 0.000 | 0.000 | 0.880 | 201.411 | 0.007 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.064 | 0.032 | 0.000 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000296 | 202.003 | 0.028 | n/a | 0.000 | 0.000 | 0.874 | 200.940 | 0.009 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.060 | 0.028 | 0.000 | 0.060 | gw-r/thread-51/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000298 | 201.874 | 0.035 | n/a | 0.000 | 0.000 | 0.717 | 200.946 | 0.004 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.097 | 0.035 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000029a | 163.289 | 0.054 | n/a | 0.000 | 0.000 | 0.681 | 162.416 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.100 | 0.054 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000022e | 77.230 | 0.070 | n/a | 0.000 | 0.000 | 0.481 | 76.602 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.064 | 0.070 | 0.001 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000026a | 60.264 | 0.058 | n/a | 0.000 | 0.000 | 0.425 | 45.168 | 14.522 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.079 | 0.058 | 0.001 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000241 | 58.190 | 0.084 | n/a | 0.000 | 0.000 | 0.736 | 57.229 | 0.009 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.108 | 0.084 | 0.001 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000020a | 57.260 | 0.064 | n/a | 0.000 | 0.000 | 0.476 | 56.515 | 0.079 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.100 | 0.064 | 0.001 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000207 | 53.672 | 0.052 | n/a | 0.000 | 0.000 | 0.658 | 52.866 | 0.003 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.068 | 0.052 | 0.001 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000238 | 52.008 | 0.042 | n/a | 0.000 | 0.000 | 0.471 | 51.398 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.054 | 0.042 | 0.001 | 0.054 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000249 | 51.770 | 0.042 | n/a | 0.000 | 0.000 | 0.809 | 50.842 | 0.002 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.052 | 0.042 | 0.001 | 0.052 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000028d | 51.436 | 0.061 | n/a | 0.000 | 0.000 | 0.466 | 50.798 | 0.002 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.094 | 0.061 | 0.001 | 0.094 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000281 | 51.356 | 0.041 | n/a | 0.000 | 0.000 | 0.708 | 50.519 | 0.008 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.055 | 0.041 | 0.001 | 0.055 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000266 | 51.178 | 0.043 | n/a | 0.000 | 0.000 | 0.391 | 50.641 | 0.017 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.056 | 0.043 | 0.001 | 0.056 | gw-r/thread-51/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000248 | 51.081 | 0.045 | n/a | 0.000 | 0.000 | 0.499 | 50.454 | 0.005 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.060 | 0.045 | 0.001 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000235 | 51.056 | 0.040 | n/a | 0.000 | 0.000 | 0.496 | 50.397 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.057 | 0.040 | 0.001 | 0.057 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000211 | 50.736 | 0.045 | n/a | 0.000 | 0.000 | 0.414 | 50.178 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.062 | 0.045 | 0.001 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000204 | 50.609 | 0.042 | n/a | 0.000 | 0.000 | 0.356 | 50.141 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.054 | 0.042 | 0.001 | 0.054 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000270 | 50.486 | 0.040 | n/a | 0.000 | 0.000 | 0.626 | 49.708 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.054 | 0.040 | 0.001 | 0.054 | gw-r/thread-46/journal/page | none observed |

## P3 / idle-100 / read (154 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.644 | n/a | n/a | n/a | 0.046 | n/a | 0.000 | 0.000 | 0.567 | 95.838 | 0.003 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.063 | 0.046 | 0.000 | 0.063 |
| p99 | 201.860 | n/a | n/a | n/a | 0.097 | n/a | 0.000 | 0.000 | 3.514 | 201.074 | 2.253 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.146 | 0.097 | 0.001 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f2ae7af6f6f22940000000000000333 | 201.934 | 0.043 | n/a | 0.000 | 0.000 | 0.617 | 201.074 | 0.007 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.093 | 0.043 | 0.000 | 0.093 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000332 | 201.860 | 0.036 | n/a | 0.000 | 0.000 | 0.474 | 201.175 | 0.009 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000330 | 201.612 | 0.033 | n/a | 0.000 | 0.000 | 0.600 | 200.840 | 0.004 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000331 | 201.504 | 0.037 | n/a | 0.000 | 0.000 | 0.672 | 200.668 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000334 | 201.402 | 0.032 | n/a | 0.000 | 0.000 | 0.591 | 200.670 | 0.003 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002e1 | 106.908 | 0.042 | n/a | 0.000 | 0.000 | 0.418 | 106.347 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.055 | 0.042 | 0.000 | 0.055 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002b9 | 103.359 | 0.042 | n/a | 0.000 | 0.000 | 0.440 | 102.809 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.052 | 0.042 | 0.000 | 0.052 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002da | 103.287 | 0.059 | n/a | 0.000 | 0.000 | 0.406 | 102.725 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.083 | 0.059 | 0.001 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002d1 | 102.334 | 0.059 | n/a | 0.000 | 0.000 | 0.627 | 101.497 | 0.018 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.084 | 0.059 | 0.001 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002a6 | 102.114 | 0.069 | n/a | 0.000 | 0.000 | 1.375 | 100.524 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.101 | 0.069 | 0.001 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002f8 | 101.221 | 0.037 | n/a | 0.000 | 0.000 | 0.466 | 100.657 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.049 | 0.037 | 0.000 | 0.049 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000301 | 101.164 | 0.038 | n/a | 0.000 | 0.000 | 0.789 | 100.261 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.057 | 0.038 | 0.000 | 0.057 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002ec | 100.958 | 0.046 | n/a | 0.000 | 0.000 | 0.315 | 100.476 | 0.040 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.055 | 0.046 | 0.000 | 0.055 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000323 | 100.802 | 0.042 | n/a | 0.000 | 0.000 | 0.434 | 100.257 | 0.002 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.049 | 0.042 | 0.000 | 0.049 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000030d | 100.592 | 0.072 | n/a | 0.000 | 0.000 | 0.617 | 99.735 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.128 | 0.072 | 0.001 | 0.128 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002c2 | 100.574 | 0.039 | n/a | 0.000 | 0.000 | 0.448 | 100.013 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.058 | 0.039 | 0.000 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002ce | 100.515 | 0.038 | n/a | 0.000 | 0.000 | 0.337 | 100.077 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.051 | 0.038 | 0.000 | 0.051 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000031e | 100.421 | 0.050 | n/a | 0.000 | 0.000 | 0.553 | 99.727 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.063 | 0.050 | 0.000 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000304 | 100.418 | 0.057 | n/a | 0.000 | 0.000 | 0.617 | 99.635 | 0.003 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.069 | 0.057 | 0.001 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f229400000000000002e8 | 100.063 | 0.069 | n/a | 0.000 | 0.000 | 0.620 | 99.183 | 0.004 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.081 | 0.069 | 0.001 | 0.081 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-250 / read (156 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.617 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.576 | 200.758 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.072 | 0.039 | 0.000 | 0.072 |
| p99 | 205.366 | n/a | n/a | n/a | 0.090 | n/a | 0.000 | 0.000 | 2.831 | 204.668 | 0.019 | 0.000 | 0.696 | 0.000 | n/a | n/a | 0.169 | 0.090 | 0.000 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f2ae7af6f6f22940000000000000438 | 208.602 | 0.056 | n/a | 0.000 | 0.000 | 2.145 | 206.260 | 0.004 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.079 | 0.056 | 0.000 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f229400000000000003de | 205.366 | 0.043 | n/a | 0.000 | 0.000 | 0.454 | 204.668 | 0.062 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.074 | 0.043 | 0.000 | 0.074 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f229400000000000003ec | 204.301 | 0.076 | n/a | 0.000 | 0.000 | 3.378 | 200.682 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.126 | 0.076 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000358 | 203.933 | 0.035 | n/a | 0.000 | 0.000 | 0.283 | 203.457 | 0.008 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.073 | 0.035 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f229400000000000003a8 | 203.577 | 0.036 | n/a | 0.000 | 0.000 | 2.831 | 200.589 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f229400000000000003a0 | 203.004 | 0.041 | n/a | 0.000 | 0.000 | 1.492 | 199.205 | 0.019 | 0.000 | 2.167 | 0.000 | n/a | n/a | 0.081 | 0.041 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000045e | 202.989 | 0.031 | n/a | 0.000 | 0.000 | 1.434 | 201.395 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.054 | 0.031 | 0.000 | 0.054 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000466 | 202.954 | 0.070 | n/a | 0.000 | 0.000 | 2.128 | 200.591 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.120 | 0.070 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000390 | 202.893 | 0.030 | n/a | 0.000 | 0.000 | 1.906 | 200.838 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.068 | 0.030 | 0.000 | 0.068 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000360 | 202.769 | 0.040 | n/a | 0.000 | 0.000 | 1.622 | 200.948 | 0.008 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000042a | 202.732 | 0.054 | n/a | 0.000 | 0.000 | 1.522 | 200.962 | 0.004 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.132 | 0.054 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000037e | 202.727 | 0.043 | n/a | 0.000 | 0.000 | 0.537 | 201.970 | 0.009 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.071 | 0.043 | 0.000 | 0.071 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000378 | 202.656 | 0.090 | n/a | 0.000 | 0.000 | 1.168 | 201.193 | 0.008 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.104 | 0.090 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f229400000000000003c0 | 202.621 | 0.035 | n/a | 0.000 | 0.000 | 1.563 | 200.888 | 0.004 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f229400000000000003f8 | 202.449 | 0.054 | n/a | 0.000 | 0.000 | 0.823 | 201.402 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.083 | 0.054 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f229400000000000003e2 | 202.427 | 0.111 | n/a | 0.000 | 0.000 | 1.004 | 201.099 | 0.007 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.123 | 0.111 | 0.001 | 0.123 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000396 | 202.426 | 0.038 | n/a | 0.000 | 0.000 | 0.624 | 201.564 | 0.008 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.078 | 0.038 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000037a | 202.386 | 0.035 | n/a | 0.000 | 0.000 | 0.367 | 201.817 | 0.008 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.067 | 0.035 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000034a | 202.320 | 0.031 | n/a | 0.000 | 0.000 | 1.079 | 201.064 | 0.007 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.059 | 0.031 | 0.000 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000033c | 202.319 | 0.027 | n/a | 0.000 | 0.000 | 1.501 | 200.675 | 0.004 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.058 | 0.027 | 0.000 | 0.058 | gw-r/thread-65/journal/page | none observed |

## P3 / idle-500 / read (405 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.533 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.634 | 200.701 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.078 | 0.044 | 0.000 | 0.078 |
| p99 | 204.841 | n/a | n/a | n/a | 0.090 | n/a | 0.000 | 0.000 | 2.718 | 203.011 | 0.155 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.170 | 0.090 | 0.001 | 0.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f2ae7af6f6f22940000000000000494 | 205.284 | 0.031 | n/a | 0.000 | 0.000 | 3.853 | 201.249 | 0.008 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000049a | 205.253 | 0.034 | n/a | 0.000 | 0.000 | 0.838 | 204.226 | 0.008 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f229400000000000004a5 | 205.120 | 0.039 | n/a | 0.000 | 0.000 | 3.963 | 200.967 | 0.004 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.072 | 0.039 | 0.000 | 0.072 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000616 | 204.846 | 0.037 | n/a | 0.000 | 0.000 | 3.771 | 200.918 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.069 | 0.037 | 0.000 | 0.069 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f229400000000000005bd | 204.841 | 0.044 | n/a | 0.000 | 0.000 | 0.479 | 204.158 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.095 | 0.044 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000620 | 204.750 | 0.041 | n/a | 0.000 | 0.000 | 0.650 | 203.947 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.075 | 0.041 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000062c | 204.018 | 0.036 | n/a | 0.000 | 0.000 | 0.349 | 203.534 | 0.003 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.066 | 0.036 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f229400000000000004ab | 203.938 | 0.033 | n/a | 0.000 | 0.000 | 2.718 | 200.990 | 0.010 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.063 | 0.033 | 0.000 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000061c | 203.828 | 0.039 | n/a | 0.000 | 0.000 | 2.348 | 201.278 | 0.008 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.084 | 0.039 | 0.000 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000053c | 203.781 | 0.042 | n/a | 0.000 | 0.000 | 0.876 | 202.683 | 0.004 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.106 | 0.042 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f229400000000000005b6 | 203.631 | 0.038 | n/a | 0.000 | 0.000 | 2.938 | 200.511 | 0.003 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000563 | 203.620 | 0.034 | n/a | 0.000 | 0.000 | 0.410 | 203.011 | 0.021 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000046c | 203.620 | 0.034 | n/a | 0.000 | 0.000 | 2.068 | 201.359 | 0.008 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000060d | 203.474 | 0.048 | n/a | 0.000 | 0.000 | 2.319 | 200.939 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.113 | 0.048 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f229400000000000004b5 | 203.297 | 0.119 | n/a | 0.000 | 0.000 | 1.056 | 201.858 | 0.005 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.195 | 0.119 | 0.001 | 0.195 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000057a | 203.217 | 0.057 | n/a | 0.000 | 0.000 | 1.486 | 201.473 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.125 | 0.057 | 0.000 | 0.125 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000557 | 203.159 | 0.041 | n/a | 0.000 | 0.000 | 2.194 | 200.792 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.075 | 0.041 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000502 | 203.135 | 0.064 | n/a | 0.000 | 0.000 | 1.507 | 201.346 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.170 | 0.064 | 0.000 | 0.170 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000529 | 203.128 | 0.054 | n/a | 0.000 | 0.000 | 1.886 | 201.013 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.128 | 0.054 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f229400000000000004bb | 203.080 | 0.058 | n/a | 0.000 | 0.000 | 0.904 | 201.835 | 0.039 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.136 | 0.058 | 0.000 | 0.136 | gw-r/thread-65/journal/page | none observed |

## P3 / idle-1000 / read (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.649 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.656 | 200.797 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.081 | 0.040 | 0.000 | 0.081 |
| p99 | 204.439 | n/a | n/a | n/a | 0.085 | n/a | 0.000 | 0.000 | 1.943 | 203.151 | 0.027 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.193 | 0.085 | 0.001 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2f2ae7af6f6f2294000000000000081c | 216.482 | 0.044 | n/a | 0.000 | 0.000 | 0.710 | 203.781 | 0.011 | 11.735 | 0.070 | 0.000 | n/a | n/a | 0.131 | 0.044 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f229400000000000006a4 | 207.217 | 0.038 | n/a | 0.000 | 0.000 | 6.254 | 200.792 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.079 | 0.038 | 0.000 | 0.079 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000697 | 205.732 | 0.072 | n/a | 0.000 | 0.000 | 0.915 | 204.486 | 0.009 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.191 | 0.072 | 0.000 | 0.191 | gw-r/thread-46/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000889 | 205.596 | 0.026 | n/a | 0.000 | 0.000 | 0.558 | 204.920 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.055 | 0.026 | 0.000 | 0.055 | gw-r/thread-49/journal/page | none observed |
| 2f2ae7af6f6f229400000000000007e7 | 205.149 | 0.030 | n/a | 0.000 | 0.000 | 0.548 | 204.422 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000762 | 204.946 | 0.048 | n/a | 0.000 | 0.000 | 3.392 | 201.349 | 0.011 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.073 | 0.048 | 0.000 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000717 | 204.542 | 0.048 | n/a | 0.000 | 0.000 | 1.055 | 203.248 | 0.012 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.118 | 0.048 | 0.000 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f229400000000000007db | 204.439 | 0.034 | n/a | 0.000 | 0.000 | 0.627 | 203.644 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.084 | 0.034 | 0.000 | 0.084 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000687 | 204.210 | 0.045 | n/a | 0.000 | 0.000 | 3.014 | 200.979 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.120 | 0.045 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f229400000000000006a5 | 204.165 | 0.030 | n/a | 0.000 | 0.000 | 0.487 | 203.527 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.070 | 0.030 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000679 | 204.163 | 0.043 | n/a | 0.000 | 0.000 | 2.836 | 201.120 | 0.009 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.091 | 0.043 | 0.000 | 0.091 | gw-r/thread-65/journal/page | none observed |
| 2f2ae7af6f6f229400000000000007ee | 204.134 | 0.032 | n/a | 0.000 | 0.000 | 1.056 | 202.909 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000783 | 203.905 | 0.054 | n/a | 0.000 | 0.000 | 0.995 | 202.677 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.117 | 0.054 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000706 | 203.902 | 0.037 | n/a | 0.000 | 0.000 | 0.574 | 203.151 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.083 | 0.037 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000834 | 203.860 | 0.027 | n/a | 0.000 | 0.000 | 2.947 | 200.781 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.057 | 0.027 | 0.000 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f229400000000000006f1 | 203.523 | 0.062 | n/a | 0.000 | 0.000 | 2.340 | 200.955 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.103 | 0.062 | 0.000 | 0.103 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f229400000000000007a1 | 203.394 | 0.034 | n/a | 0.000 | 0.000 | 1.159 | 202.028 | 0.012 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.073 | 0.034 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000084f | 203.343 | 0.051 | n/a | 0.000 | 0.000 | 1.820 | 201.255 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.139 | 0.051 | 0.000 | 0.139 | gw-r/thread-50/journal/page | none observed |
| 2f2ae7af6f6f22940000000000000750 | 203.304 | 0.064 | n/a | 0.000 | 0.000 | 1.069 | 201.954 | 0.016 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.107 | 0.064 | 0.000 | 0.107 | gw-r/thread-44/journal/page | none observed |
| 2f2ae7af6f6f2294000000000000072d | 203.275 | 0.070 | n/a | 0.000 | 0.000 | 1.064 | 201.895 | 0.016 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.124 | 0.070 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 1250 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/1.867 ms; post-ACK p50/p99: 0.337/0.943 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.574 | 10.162 | 10.037 | reported |
| All-primary p99 ms | 26.732 | 26.395 | 24.651 | <=50 |
| L256 5-10 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 5-10 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 11-25 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 11-25 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 26-50 p50Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| L256 26-50 p99Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| Burst 5-10 p50 ms | unavailable | unavailable | unavailable | <=10 |
| Burst 11-25 p50 ms | unavailable | unavailable | unavailable | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | unavailable | unavailable | unavailable | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | unavailable | unavailable | unavailable | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5-10 | >=1000 | 7 | 15.154/41.781 | 14.495 | 6.508 | 15.989 | 0.108/0.021 |
| 5-10 | overlap | 99 | 13.580/45.908 | 13.222 | 8.054 | 19.469 | 0.059/0.016 |
| 5-10 | 0-50 | 547 | 10.454/24.891 | 9.972 | 5.692 | 14.406 | 0.056/0.017 |
| 5-10 | 250-1000 | 299 | 10.264/20.183 | 9.883 | 5.392 | 13.804 | 0.077/0.018 |
| 5-10 | 50-100 | 149 | 9.493/16.949 | 9.116 | 4.705 | 12.698 | 0.062/0.018 |
| 5-10 | 100-250 | 149 | 10.212/29.099 | 9.848 | 5.104 | 13.389 | 0.073/0.019 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1250 | 0 | 0.000 |

## Writer heap, GC and scheduler stalls

Source a0785bcf96f7afea3965b3028db2e27f4fbef6a9; 1250 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 371.283 / 399.168 |
| GC events / total duration / maximum ms | 247 / 522.121 / 26.529 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":243,"4":2,"8":2} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 26.732 / 0 / 0.000 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

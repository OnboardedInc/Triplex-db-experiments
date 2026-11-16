# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (32.439 ms, trace `897a45717404390c0000000000000106`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (54.537 ms, trace `897a45717404390c000000000000064b`); `tx/thread-86/transactor.triplex-function` (42.646 ms, trace `897a45717404390c0000000000000297`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (21.493 ms, trace `897a45717404390c00000000000000f0`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (32.754 ms, trace `897a45717404390c0000000000000299`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-idle-b-7-plain`; source `a0785bcf96f7afea3965b3028db2e27f4fbef6a9`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 1250/1250 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 1250/1250. Raw trace bytes: 18595242.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 4067 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 5993.720 | 1387.044 | 10.118 | 4046 |
| idle-10 | 0 | 2493.409 | 690.613 | 9.812 | 3042 |
| idle-25 | 0 | 4738.268 | 770.941 | 5.558 | 3034 |
| idle-50 | 0 | 8459.637 | 810.371 | 5.507 | 3034 |
| idle-100 | 0 | 15912.192 | 915.206 | 12.399 | 3034 |
| idle-250 | 0 | 38262.445 | 1205.044 | 19.805 | 3030 |
| idle-500 | 0 | 75511.202 | 1784.356 | 42.584 | 3034 |
| idle-1000 | 0 | 148015.223 | 2516.757 | 74.155 | 3012 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 897a45717404390c0000000000000106 | driver.queue.scheduler-late | 32.439 | none | 0 / 32 |
| 897a45717404390c0000000000000106 | driver.queue.scheduler-dispatch | 0.078 | none | 0 / 32 |

Observed active steps while trace 897a45717404390c0000000000000106 waited: []

| 897a45717404390c000000000000064b | driver.queue.scheduler-dispatch | 0.062 | none | 0 / 32 |
| 897a45717404390c000000000000064b | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 897a45717404390c000000000000064b waited: []

| 897a45717404390c0000000000000297 | driver.queue.scheduler-late | 1.438 | none | 1 / 32 |
| 897a45717404390c0000000000000297 | driver.queue.scheduler-dispatch | 0.010 | none | 1 / 32 |

Observed active steps while trace 897a45717404390c0000000000000297 waited: []

| 897a45717404390c00000000000000f0 | driver.queue.scheduler-late | 0.869 | none | 0 / 32 |
| 897a45717404390c00000000000000f0 | driver.queue.scheduler-dispatch | 0.253 | none | 0 / 32 |

Observed active steps while trace 897a45717404390c00000000000000f0 waited: []

| 897a45717404390c0000000000000299 | driver.queue.scheduler-dispatch | 0.084 | none | 1 / 32 |
| 897a45717404390c0000000000000299 | driver.queue.scheduler-late | 0.007 | none | 1 / 32 |

Observed active steps while trace 897a45717404390c0000000000000299 waited: []

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.289 | 1.666 | 0.000 | 0.497 | 2.599 | n/a | 0.000 | 0.509 | 0.721 | 3.420 | 0.065 | 0.000 | 0.083 | 10.694 | 1.126 | n/a | 0.029 | 3.108 | 0.153 | 0.029 |
| p99 | 49.817 | 3.486 | 0.000 | 2.838 | 8.497 | n/a | 3.592 | 1.122 | 1.143 | 4.464 | 3.092 | 0.000 | 0.191 | 21.493 | 6.989 | n/a | 0.278 | 13.211 | 0.265 | 0.278 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c00000000000000f0 | 49.817 | 8.497 | n/a | 3.592 | 1.122 | 1.143 | 3.420 | 3.092 | 0.000 | 0.191 | 21.493 | 6.989 | n/a | 0.278 | 13.211 | 0.265 | 0.278 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| 897a45717404390c000000000000028b | 20.289 | 2.599 | n/a | 0.000 | 0.509 | 0.721 | 4.464 | 0.065 | 0.000 | 0.083 | 10.694 | 1.126 | n/a | 0.029 | 3.108 | 0.153 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.108ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.015ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.289 | 1.666 | 0.000 | 0.497 | 2.599 | n/a | 0.000 | 0.509 | 0.721 | 3.420 | 0.065 | 0.000 | 0.083 | 10.694 | 1.126 | n/a | 0.029 | 3.108 | 0.153 | 0.029 |
| p99 | 49.817 | 3.486 | 0.000 | 2.838 | 8.497 | n/a | 3.592 | 1.122 | 1.143 | 4.464 | 3.092 | 0.000 | 0.191 | 21.493 | 6.989 | n/a | 0.278 | 13.211 | 0.265 | 0.278 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c00000000000000f0 | 49.817 | 8.497 | n/a | 3.592 | 1.122 | 1.143 | 3.420 | 3.092 | 0.000 | 0.191 | 21.493 | 6.989 | n/a | 0.278 | 13.211 | 0.265 | 0.278 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| 897a45717404390c000000000000028b | 20.289 | 2.599 | n/a | 0.000 | 0.509 | 0.721 | 4.464 | 0.065 | 0.000 | 0.083 | 10.694 | 1.126 | n/a | 0.029 | 3.108 | 0.153 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.108ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.015ms |

## P2 / warmup / commit (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.109 | 0.185 | 0.000 | 0.492 | 2.165 | n/a | 0.000 | 0.043 | 0.780 | 1.355 | 0.020 | 0.000 | 0.295 | 5.559 | 0.613 | n/a | 0.020 | 2.392 | 0.196 | 0.020 |
| p99 | 37.901 | 2.999 | 0.051 | 2.378 | 5.974 | n/a | 2.952 | 2.397 | 5.630 | 5.479 | 0.080 | 0.000 | 3.452 | 13.585 | 7.429 | n/a | 0.110 | 13.612 | 0.513 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c0000000000000106 | 67.375 | 7.024 | n/a | 0.000 | 32.517 | 5.181 | 1.250 | 0.021 | 0.000 | 3.146 | 12.749 | 5.450 | n/a | 0.039 | 39.541 | 0.587 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.159ms; driver.publication.persist-deferred 0.042ms; driver.reader-basis.broadcast 0.022ms |
| 897a45717404390c0000000000000108 | 43.641 | 2.535 | n/a | 0.000 | 2.397 | 5.478 | 5.085 | 0.047 | 0.000 | 0.105 | 23.729 | 4.243 | n/a | 0.021 | 4.932 | 0.113 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.042ms; driver.reader-basis.broadcast 0.022ms; driver.publication.persist-deferred 0.013ms |
| 897a45717404390c0000000000000107 | 37.901 | 9.153 | n/a | 1.992 | 8.316 | 2.505 | 0.894 | 0.011 | 0.000 | 0.044 | 14.165 | 0.785 | n/a | 0.038 | 19.461 | 0.513 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.159ms |
| 897a45717404390c0000000000000100 | 36.124 | 5.229 | n/a | 8.185 | 0.198 | 5.630 | 1.322 | 0.021 | 0.000 | 1.714 | 13.028 | 0.744 | n/a | 0.052 | 13.612 | 0.377 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000000f1 | 34.323 | 3.126 | n/a | 1.057 | 1.805 | 8.404 | 1.520 | 0.025 | 0.000 | 3.121 | 12.856 | 2.382 | n/a | 0.026 | 5.988 | 0.174 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.155ms |
| 897a45717404390c00000000000000f8 | 33.767 | 4.271 | n/a | 0.000 | 0.091 | 11.251 | 6.344 | 0.024 | 0.000 | 0.436 | 6.298 | 5.012 | n/a | 0.040 | 4.362 | 0.129 | 0.040 | node-14/thread-0/socket.wait-first-byte | client.encode 3.663ms; driver.publication.readback 0.170ms |
| 897a45717404390c0000000000000248 | 32.498 | 2.355 | n/a | 0.000 | 0.037 | 0.598 | 5.002 | 0.055 | 12.348 | 0.084 | 11.479 | 0.523 | n/a | 0.016 | 2.392 | 0.074 | 0.016 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.198ms |
| 897a45717404390c0000000000000234 | 27.003 | 2.597 | n/a | 0.000 | 0.069 | 4.323 | 1.167 | 0.018 | 0.000 | 0.091 | 9.617 | 9.089 | n/a | 0.033 | 2.666 | 0.099 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000000f9 | 26.177 | 5.149 | n/a | 6.544 | 0.107 | 1.089 | 2.238 | 0.051 | 0.000 | 0.138 | 9.271 | 1.544 | n/a | 0.044 | 11.800 | 0.451 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.022ms; driver.reader-basis.broadcast 0.013ms |
| 897a45717404390c000000000000010b | 24.732 | 2.856 | n/a | 0.000 | 0.058 | 1.004 | 4.351 | 0.020 | 0.000 | 3.452 | 11.408 | 1.559 | n/a | 0.024 | 2.914 | 0.118 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.164ms; driver.publication.persist-deferred 0.014ms |
| 897a45717404390c00000000000000f3 | 23.062 | 3.926 | n/a | 1.940 | 1.102 | 0.762 | 5.772 | 0.080 | 0.000 | 0.904 | 4.905 | 3.499 | n/a | 0.174 | 6.968 | 0.302 | 0.174 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.398ms; driver.publication.readback 0.409ms; driver.publication.persist-deferred 0.155ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.022ms |
| 897a45717404390c00000000000000fc | 22.131 | 3.760 | n/a | 2.061 | 1.577 | 1.088 | 2.522 | 0.056 | 0.000 | 0.822 | 6.049 | 4.170 | n/a | 0.025 | 7.398 | 0.334 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.831ms; driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.026ms |
| 897a45717404390c000000000000013f | 21.086 | 1.997 | n/a | 0.000 | 1.305 | 0.759 | 1.154 | 0.019 | 0.000 | 0.362 | 7.739 | 7.734 | n/a | 0.017 | 3.302 | 0.157 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000011a | 20.734 | 2.777 | n/a | 0.000 | 0.396 | 1.020 | 1.921 | 0.041 | 0.000 | 1.038 | 8.629 | 4.894 | n/a | 0.018 | 3.172 | 0.153 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 897a45717404390c000000000000011e | 20.048 | 3.859 | n/a | 0.000 | 1.178 | 0.831 | 3.196 | 0.023 | 0.000 | 0.415 | 9.426 | 1.092 | n/a | 0.029 | 5.037 | 0.251 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000025e | 19.745 | 2.274 | n/a | 0.000 | 0.030 | 0.904 | 1.474 | 0.024 | 0.000 | 0.458 | 13.585 | 0.980 | n/a | 0.016 | 2.304 | 0.117 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000118 | 19.706 | 3.515 | n/a | 0.000 | 0.343 | 0.933 | 1.238 | 0.026 | 0.000 | 0.408 | 11.967 | 1.256 | n/a | 0.018 | 3.859 | 0.196 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000160 | 19.400 | 3.117 | n/a | 0.000 | 0.074 | 0.873 | 1.078 | 0.021 | 0.000 | 0.096 | 6.603 | 7.429 | n/a | 0.110 | 3.192 | 0.165 | 0.110 | tx/thread-86/transactor.triplex-function | none observed |
| 897a45717404390c0000000000000133 | 19.335 | 4.776 | n/a | 0.000 | 0.129 | 0.877 | 3.247 | 0.020 | 0.000 | 0.332 | 8.867 | 1.044 | n/a | 0.043 | 4.905 | 0.254 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 897a45717404390c00000000000001fa | 19.285 | 2.481 | n/a | 0.000 | 0.034 | 0.670 | 2.442 | 0.019 | 0.000 | 0.200 | 12.396 | 1.026 | n/a | 0.018 | 2.515 | 0.130 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.109 | 0.185 | 0.000 | 0.492 | 2.165 | n/a | 0.000 | 0.043 | 0.780 | 1.355 | 0.020 | 0.000 | 0.295 | 5.559 | 0.613 | n/a | 0.020 | 2.392 | 0.196 | 0.020 |
| p99 | 37.901 | 2.999 | 0.051 | 2.378 | 5.974 | n/a | 2.952 | 2.397 | 5.630 | 5.479 | 0.080 | 0.000 | 3.452 | 13.585 | 7.429 | n/a | 0.110 | 13.612 | 0.513 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c0000000000000106 | 67.375 | 7.024 | n/a | 0.000 | 32.517 | 5.181 | 1.250 | 0.021 | 0.000 | 3.146 | 12.749 | 5.450 | n/a | 0.039 | 39.541 | 0.587 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.159ms; driver.publication.persist-deferred 0.042ms; driver.reader-basis.broadcast 0.022ms |
| 897a45717404390c0000000000000108 | 43.641 | 2.535 | n/a | 0.000 | 2.397 | 5.478 | 5.085 | 0.047 | 0.000 | 0.105 | 23.729 | 4.243 | n/a | 0.021 | 4.932 | 0.113 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.042ms; driver.reader-basis.broadcast 0.022ms; driver.publication.persist-deferred 0.013ms |
| 897a45717404390c0000000000000107 | 37.901 | 9.153 | n/a | 1.992 | 8.316 | 2.505 | 0.894 | 0.011 | 0.000 | 0.044 | 14.165 | 0.785 | n/a | 0.038 | 19.461 | 0.513 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.159ms |
| 897a45717404390c0000000000000100 | 36.124 | 5.229 | n/a | 8.185 | 0.198 | 5.630 | 1.322 | 0.021 | 0.000 | 1.714 | 13.028 | 0.744 | n/a | 0.052 | 13.612 | 0.377 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000000f1 | 34.323 | 3.126 | n/a | 1.057 | 1.805 | 8.404 | 1.520 | 0.025 | 0.000 | 3.121 | 12.856 | 2.382 | n/a | 0.026 | 5.988 | 0.174 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.155ms |
| 897a45717404390c00000000000000f8 | 33.767 | 4.271 | n/a | 0.000 | 0.091 | 11.251 | 6.344 | 0.024 | 0.000 | 0.436 | 6.298 | 5.012 | n/a | 0.040 | 4.362 | 0.129 | 0.040 | node-14/thread-0/socket.wait-first-byte | client.encode 3.663ms; driver.publication.readback 0.170ms |
| 897a45717404390c0000000000000248 | 32.498 | 2.355 | n/a | 0.000 | 0.037 | 0.598 | 5.002 | 0.055 | 12.348 | 0.084 | 11.479 | 0.523 | n/a | 0.016 | 2.392 | 0.074 | 0.016 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.198ms |
| 897a45717404390c0000000000000234 | 27.003 | 2.597 | n/a | 0.000 | 0.069 | 4.323 | 1.167 | 0.018 | 0.000 | 0.091 | 9.617 | 9.089 | n/a | 0.033 | 2.666 | 0.099 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000000f9 | 26.177 | 5.149 | n/a | 6.544 | 0.107 | 1.089 | 2.238 | 0.051 | 0.000 | 0.138 | 9.271 | 1.544 | n/a | 0.044 | 11.800 | 0.451 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.022ms; driver.reader-basis.broadcast 0.013ms |
| 897a45717404390c000000000000010b | 24.732 | 2.856 | n/a | 0.000 | 0.058 | 1.004 | 4.351 | 0.020 | 0.000 | 3.452 | 11.408 | 1.559 | n/a | 0.024 | 2.914 | 0.118 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.164ms; driver.publication.persist-deferred 0.014ms |
| 897a45717404390c00000000000000f3 | 23.062 | 3.926 | n/a | 1.940 | 1.102 | 0.762 | 5.772 | 0.080 | 0.000 | 0.904 | 4.905 | 3.499 | n/a | 0.174 | 6.968 | 0.302 | 0.174 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.398ms; driver.publication.readback 0.409ms; driver.publication.persist-deferred 0.155ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.022ms |
| 897a45717404390c00000000000000fc | 22.131 | 3.760 | n/a | 2.061 | 1.577 | 1.088 | 2.522 | 0.056 | 0.000 | 0.822 | 6.049 | 4.170 | n/a | 0.025 | 7.398 | 0.334 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.831ms; driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.026ms |
| 897a45717404390c000000000000013f | 21.086 | 1.997 | n/a | 0.000 | 1.305 | 0.759 | 1.154 | 0.019 | 0.000 | 0.362 | 7.739 | 7.734 | n/a | 0.017 | 3.302 | 0.157 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000011a | 20.734 | 2.777 | n/a | 0.000 | 0.396 | 1.020 | 1.921 | 0.041 | 0.000 | 1.038 | 8.629 | 4.894 | n/a | 0.018 | 3.172 | 0.153 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 897a45717404390c000000000000011e | 20.048 | 3.859 | n/a | 0.000 | 1.178 | 0.831 | 3.196 | 0.023 | 0.000 | 0.415 | 9.426 | 1.092 | n/a | 0.029 | 5.037 | 0.251 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000025e | 19.745 | 2.274 | n/a | 0.000 | 0.030 | 0.904 | 1.474 | 0.024 | 0.000 | 0.458 | 13.585 | 0.980 | n/a | 0.016 | 2.304 | 0.117 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000118 | 19.706 | 3.515 | n/a | 0.000 | 0.343 | 0.933 | 1.238 | 0.026 | 0.000 | 0.408 | 11.967 | 1.256 | n/a | 0.018 | 3.859 | 0.196 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000160 | 19.400 | 3.117 | n/a | 0.000 | 0.074 | 0.873 | 1.078 | 0.021 | 0.000 | 0.096 | 6.603 | 7.429 | n/a | 0.110 | 3.192 | 0.165 | 0.110 | tx/thread-86/transactor.triplex-function | none observed |
| 897a45717404390c0000000000000133 | 19.335 | 4.776 | n/a | 0.000 | 0.129 | 0.877 | 3.247 | 0.020 | 0.000 | 0.332 | 8.867 | 1.044 | n/a | 0.043 | 4.905 | 0.254 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 897a45717404390c00000000000001fa | 19.285 | 2.481 | n/a | 0.000 | 0.034 | 0.670 | 2.442 | 0.019 | 0.000 | 0.200 | 12.396 | 1.026 | n/a | 0.018 | 2.515 | 0.130 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.059 | n/a | n/a | n/a | 13.187 | 2.543 | 0.236 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 17.616 | 0.999 | 0.009 |
| p99 | 58.574 | n/a | n/a | n/a | 26.274 | 32.290 | 2.116 | 0.000 | 21.382 | 17.427 | 0.007 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.051 | 58.564 | 1.000 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c00000000000000f7 | 58.574 | 26.274 | 32.290 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 58.564 | 1.000 | 0.010 | node-14/thread-0/rpc.replica.observe | client.encode 3.663ms; driver.expected-state.bind-receipt 3.603ms; driver.publication.readback 0.170ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.026ms |
| 897a45717404390c0000000000000bc7 | 42.212 | 25.431 | 0.513 | 1.775 | 0.000 | 12.826 | 1.640 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.006 | 27.719 | 0.657 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.087ms; driver.publication.persist-deferred 0.018ms |
| 897a45717404390c0000000000000105 | 41.035 | 8.999 | 32.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 41.024 | 1.000 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 0.020ms |
| 897a45717404390c0000000000000a7c | 39.740 | 16.624 | 0.490 | 0.502 | 0.000 | 21.382 | 0.719 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.010 | 17.616 | 0.443 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.160ms; driver.publication.persist-deferred 0.024ms |
| 897a45717404390c000000000000015c | 38.587 | 14.614 | 0.622 | 0.863 | 0.000 | 4.959 | 17.427 | 0.006 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.012 | 16.099 | 0.417 | 0.012 | gw-r/thread-50/storage/await-position | driver.publication.readback 0.076ms; driver.reader-basis.broadcast 0.062ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.016ms |
| 897a45717404390c00000000000000f4 | 32.397 | 13.187 | 11.618 | 0.236 | 0.000 | 4.266 | 3.044 | 0.007 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.011 | 25.041 | 0.773 | 0.011 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.409ms; driver.publication.readback 0.170ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.022ms |
| 897a45717404390c00000000000000f2 | 32.279 | 25.244 | 1.841 | 2.116 | 0.000 | 1.616 | 1.389 | 0.006 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.051 | 29.201 | 0.905 | 0.051 | node-14/thread-2/replica.pull-at | driver.expected-state.bind-receipt 1.398ms; driver.publication.readback 0.409ms; driver.publication.readback 0.170ms; driver.publication.persist-deferred 0.155ms; driver.publication.readback 0.108ms |
| 897a45717404390c000000000000037e | 26.241 | 13.975 | 6.370 | 0.811 | 0.000 | 4.005 | 1.057 | 0.003 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.014 | 21.156 | 0.806 | 0.014 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.613ms; driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.107ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.023ms |
| 897a45717404390c00000000000005b3 | 25.538 | 18.198 | 0.316 | 1.110 | 0.000 | 2.289 | 3.581 | 0.007 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.009 | 19.624 | 0.768 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.113ms; driver.reader-basis.broadcast 0.071ms; driver.publication.persist-deferred 0.016ms |
| 897a45717404390c00000000000002a3 | 23.304 | 12.878 | 10.418 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 23.296 | 1.000 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.107ms; driver.publication.readback 0.058ms; driver.publication.readback 0.051ms; driver.publication.readback 0.037ms; driver.publication.readback 0.030ms |
| 897a45717404390c00000000000000fa | 23.059 | 0.268 | 22.783 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 23.051 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | driver.expected-state.bind-receipt 3.603ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.022ms; driver.reader-basis.broadcast 0.013ms |
| 897a45717404390c000000000000020d | 22.346 | 14.339 | 0.312 | 0.554 | 0.000 | 6.442 | 0.684 | 0.003 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.008 | 15.204 | 0.680 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.015ms |
| 897a45717404390c000000000000029f | 18.373 | 13.230 | 3.344 | 1.789 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 18.364 | 1.000 | 0.009 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.107ms; driver.publication.readback 0.067ms; driver.publication.readback 0.056ms; driver.publication.readback 0.051ms; driver.publication.readback 0.047ms |
| 897a45717404390c000000000000038b | 17.644 | 12.335 | 0.257 | 0.227 | 0.000 | 4.030 | 0.762 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.008 | 12.819 | 0.727 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.064ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.015ms |
| 897a45717404390c00000000000002a0 | 16.706 | 13.187 | 1.724 | 1.789 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 16.700 | 1.000 | 0.006 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.107ms; driver.publication.readback 0.056ms; driver.publication.readback 0.051ms; driver.publication.readback 0.047ms; driver.publication.readback 0.042ms |
| 897a45717404390c00000000000002a5 | 16.201 | 12.788 | 3.406 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 16.194 | 1.000 | 0.006 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.058ms; driver.publication.readback 0.051ms; driver.publication.readback 0.037ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.019ms |
| 897a45717404390c0000000000000383 | 15.998 | 12.162 | 2.737 | 1.091 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 15.990 | 0.999 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.613ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.016ms |
| 897a45717404390c00000000000002a6 | 15.390 | 12.844 | 2.543 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 15.386 | 1.000 | 0.004 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.058ms; driver.publication.readback 0.051ms; driver.publication.readback 0.037ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.019ms |
| 897a45717404390c0000000000000380 | 15.145 | 14.235 | 0.899 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 15.134 | 0.999 | 0.011 | node-14/thread-2/replica.pull-at | driver.publication.readback 0.107ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.016ms |
| 897a45717404390c00000000000000ff | 14.853 | 0.163 | 14.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 14.844 | 0.999 | 0.009 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.133ms; driver.publication.persist-deferred 0.057ms |

## P2 / idle-10 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.994 | 0.000 | 0.000 | 0.473 | 1.970 | n/a | 0.000 | 0.049 | 0.694 | 1.153 | 0.019 | 0.000 | 0.140 | 5.270 | 0.497 | n/a | 0.019 | 2.144 | 0.190 | 0.019 |
| p99 | 46.571 | 1.064 | 0.038 | 0.956 | 4.388 | n/a | 0.000 | 1.979 | 4.898 | 5.277 | 1.298 | 0.000 | 3.367 | 30.443 | 3.765 | n/a | 0.062 | 6.259 | 0.367 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c0000000000000297 | 54.812 | 2.490 | n/a | 0.000 | 1.448 | 0.564 | 1.087 | 0.020 | 0.000 | 0.397 | 6.149 | 42.646 | n/a | 0.012 | 3.938 | 0.072 | 0.012 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.070ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.014ms |
| 897a45717404390c0000000000000299 | 46.571 | 6.168 | n/a | 0.000 | 0.091 | 1.165 | 1.715 | 3.343 | 0.000 | 0.171 | 32.754 | 1.114 | n/a | 0.049 | 6.259 | 0.134 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.persist-deferred 0.039ms |
| 897a45717404390c000000000000029a | 38.253 | 2.806 | n/a | 0.000 | 0.057 | 1.615 | 2.169 | 0.040 | 0.000 | 0.576 | 30.443 | 0.519 | n/a | 0.028 | 2.864 | 0.075 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.018ms |
| 897a45717404390c000000000000029b | 32.237 | 1.763 | n/a | 0.000 | 0.039 | 1.379 | 1.921 | 0.023 | 0.000 | 0.141 | 26.051 | 0.900 | n/a | 0.021 | 1.801 | 0.056 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.067ms; driver.publication.readback 0.047ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.039ms |
| 897a45717404390c0000000000000395 | 26.184 | 3.781 | n/a | 0.000 | 3.529 | 3.919 | 1.790 | 0.046 | 0.000 | 0.124 | 12.483 | 0.482 | n/a | 0.031 | 7.311 | 0.279 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.375ms; driver.reader-basis.broadcast 0.116ms; driver.publication.persist-deferred 0.037ms |
| 897a45717404390c00000000000002b3 | 25.423 | 2.832 | n/a | 0.000 | 0.079 | 2.841 | 5.077 | 0.057 | 0.000 | 0.101 | 13.476 | 0.919 | n/a | 0.041 | 2.911 | 0.115 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.090ms; driver.publication.persist-deferred 0.085ms; driver.publication.readback 0.052ms |
| 897a45717404390c00000000000002d9 | 25.386 | 2.924 | n/a | 0.000 | 0.089 | 1.694 | 4.698 | 0.018 | 0.000 | 0.068 | 15.421 | 0.434 | n/a | 0.041 | 3.012 | 0.119 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.105ms; driver.reader-basis.broadcast 0.102ms; driver.publication.persist-deferred 0.029ms |
| 897a45717404390c000000000000029c | 25.190 | 1.938 | n/a | 0.000 | 0.052 | 2.776 | 1.059 | 0.017 | 0.000 | 0.102 | 17.886 | 1.337 | n/a | 0.024 | 1.989 | 0.079 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.067ms; driver.publication.readback 0.056ms; driver.publication.readback 0.047ms; driver.publication.readback 0.042ms |
| 897a45717404390c00000000000002f5 | 24.143 | 2.147 | n/a | 0.000 | 0.136 | 3.196 | 1.126 | 0.034 | 0.000 | 0.371 | 16.202 | 0.914 | n/a | 0.017 | 2.283 | 0.095 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.067ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.023ms |
| 897a45717404390c000000000000029d | 22.428 | 1.696 | n/a | 0.000 | 0.029 | 7.175 | 1.994 | 0.021 | 0.000 | 0.203 | 10.886 | 0.408 | n/a | 0.016 | 1.725 | 0.077 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.107ms; driver.publication.readback 0.067ms; driver.publication.readback 0.056ms; driver.publication.readback 0.047ms |
| 897a45717404390c0000000000000294 | 21.339 | 3.444 | n/a | 0.000 | 0.397 | 1.954 | 1.750 | 0.041 | 0.000 | 0.100 | 12.766 | 0.866 | n/a | 0.021 | 3.841 | 0.180 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.034ms |
| 897a45717404390c00000000000002d7 | 19.850 | 2.417 | n/a | 0.000 | 0.042 | 0.795 | 3.363 | 0.017 | 0.000 | 0.054 | 12.697 | 0.444 | n/a | 0.021 | 2.458 | 0.124 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.022ms |
| 897a45717404390c00000000000002e0 | 19.102 | 1.677 | n/a | 0.000 | 0.011 | 0.654 | 1.740 | 0.052 | 0.000 | 0.106 | 12.348 | 2.501 | n/a | 0.011 | 1.688 | 0.088 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.189ms |
| 897a45717404390c00000000000002ec | 18.250 | 1.524 | n/a | 0.000 | 0.011 | 1.651 | 2.082 | 0.040 | 0.000 | 0.137 | 11.835 | 0.958 | n/a | 0.011 | 1.535 | 0.084 | 0.011 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.043ms |
| 897a45717404390c00000000000002b6 | 18.204 | 3.801 | n/a | 0.000 | 0.083 | 1.005 | 2.040 | 0.041 | 0.000 | 0.485 | 10.164 | 0.545 | n/a | 0.040 | 3.884 | 0.213 | 0.040 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.134ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.010ms |
| 897a45717404390c000000000000028d | 18.024 | 3.178 | n/a | 0.000 | 0.016 | 0.946 | 1.815 | 0.038 | 0.000 | 0.105 | 11.445 | 0.468 | n/a | 0.014 | 3.194 | 0.177 | 0.014 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.117ms; driver.reader-basis.broadcast 0.108ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.043ms |
| 897a45717404390c0000000000000332 | 17.978 | 1.847 | n/a | 0.000 | 0.042 | 1.343 | 5.277 | 0.029 | 0.000 | 0.111 | 8.832 | 0.476 | n/a | 0.022 | 1.888 | 0.105 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.015ms |
| 897a45717404390c0000000000000353 | 17.707 | 2.887 | n/a | 0.000 | 1.762 | 0.668 | 4.847 | 0.060 | 0.000 | 0.108 | 6.507 | 0.843 | n/a | 0.023 | 4.649 | 0.263 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.048ms; driver.publication.readback 0.048ms |
| 897a45717404390c00000000000003b2 | 17.376 | 2.125 | n/a | 0.000 | 1.892 | 0.444 | 1.264 | 0.016 | 0.000 | 0.094 | 10.602 | 0.923 | n/a | 0.016 | 4.016 | 0.231 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.016ms |
| 897a45717404390c00000000000002d5 | 17.233 | 1.904 | n/a | 0.000 | 0.044 | 1.680 | 5.096 | 0.021 | 0.000 | 0.065 | 7.982 | 0.419 | n/a | 0.022 | 1.947 | 0.113 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.135ms; driver.publication.persist-deferred 0.014ms |

## P2 / idle-10 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.994 | 0.000 | 0.000 | 0.473 | 1.970 | n/a | 0.000 | 0.049 | 0.694 | 1.153 | 0.019 | 0.000 | 0.140 | 5.270 | 0.497 | n/a | 0.019 | 2.144 | 0.190 | 0.019 |
| p99 | 46.571 | 1.064 | 0.038 | 0.956 | 4.388 | n/a | 0.000 | 1.979 | 4.898 | 5.277 | 1.298 | 0.000 | 3.367 | 30.443 | 3.765 | n/a | 0.062 | 6.259 | 0.367 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c0000000000000297 | 54.812 | 2.490 | n/a | 0.000 | 1.448 | 0.564 | 1.087 | 0.020 | 0.000 | 0.397 | 6.149 | 42.646 | n/a | 0.012 | 3.938 | 0.072 | 0.012 | tx/thread-86/transactor.triplex-function | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.070ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.014ms |
| 897a45717404390c0000000000000299 | 46.571 | 6.168 | n/a | 0.000 | 0.091 | 1.165 | 1.715 | 3.343 | 0.000 | 0.171 | 32.754 | 1.114 | n/a | 0.049 | 6.259 | 0.134 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.persist-deferred 0.039ms |
| 897a45717404390c000000000000029a | 38.253 | 2.806 | n/a | 0.000 | 0.057 | 1.615 | 2.169 | 0.040 | 0.000 | 0.576 | 30.443 | 0.519 | n/a | 0.028 | 2.864 | 0.075 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.018ms |
| 897a45717404390c000000000000029b | 32.237 | 1.763 | n/a | 0.000 | 0.039 | 1.379 | 1.921 | 0.023 | 0.000 | 0.141 | 26.051 | 0.900 | n/a | 0.021 | 1.801 | 0.056 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.067ms; driver.publication.readback 0.047ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.039ms |
| 897a45717404390c0000000000000395 | 26.184 | 3.781 | n/a | 0.000 | 3.529 | 3.919 | 1.790 | 0.046 | 0.000 | 0.124 | 12.483 | 0.482 | n/a | 0.031 | 7.311 | 0.279 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.375ms; driver.reader-basis.broadcast 0.116ms; driver.publication.persist-deferred 0.037ms |
| 897a45717404390c00000000000002b3 | 25.423 | 2.832 | n/a | 0.000 | 0.079 | 2.841 | 5.077 | 0.057 | 0.000 | 0.101 | 13.476 | 0.919 | n/a | 0.041 | 2.911 | 0.115 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.090ms; driver.publication.persist-deferred 0.085ms; driver.publication.readback 0.052ms |
| 897a45717404390c00000000000002d9 | 25.386 | 2.924 | n/a | 0.000 | 0.089 | 1.694 | 4.698 | 0.018 | 0.000 | 0.068 | 15.421 | 0.434 | n/a | 0.041 | 3.012 | 0.119 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.105ms; driver.reader-basis.broadcast 0.102ms; driver.publication.persist-deferred 0.029ms |
| 897a45717404390c000000000000029c | 25.190 | 1.938 | n/a | 0.000 | 0.052 | 2.776 | 1.059 | 0.017 | 0.000 | 0.102 | 17.886 | 1.337 | n/a | 0.024 | 1.989 | 0.079 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.067ms; driver.publication.readback 0.056ms; driver.publication.readback 0.047ms; driver.publication.readback 0.042ms |
| 897a45717404390c00000000000002f5 | 24.143 | 2.147 | n/a | 0.000 | 0.136 | 3.196 | 1.126 | 0.034 | 0.000 | 0.371 | 16.202 | 0.914 | n/a | 0.017 | 2.283 | 0.095 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.067ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.023ms |
| 897a45717404390c000000000000029d | 22.428 | 1.696 | n/a | 0.000 | 0.029 | 7.175 | 1.994 | 0.021 | 0.000 | 0.203 | 10.886 | 0.408 | n/a | 0.016 | 1.725 | 0.077 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.107ms; driver.publication.readback 0.067ms; driver.publication.readback 0.056ms; driver.publication.readback 0.047ms |
| 897a45717404390c0000000000000294 | 21.339 | 3.444 | n/a | 0.000 | 0.397 | 1.954 | 1.750 | 0.041 | 0.000 | 0.100 | 12.766 | 0.866 | n/a | 0.021 | 3.841 | 0.180 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.034ms |
| 897a45717404390c00000000000002d7 | 19.850 | 2.417 | n/a | 0.000 | 0.042 | 0.795 | 3.363 | 0.017 | 0.000 | 0.054 | 12.697 | 0.444 | n/a | 0.021 | 2.458 | 0.124 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.022ms |
| 897a45717404390c00000000000002e0 | 19.102 | 1.677 | n/a | 0.000 | 0.011 | 0.654 | 1.740 | 0.052 | 0.000 | 0.106 | 12.348 | 2.501 | n/a | 0.011 | 1.688 | 0.088 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.189ms |
| 897a45717404390c00000000000002ec | 18.250 | 1.524 | n/a | 0.000 | 0.011 | 1.651 | 2.082 | 0.040 | 0.000 | 0.137 | 11.835 | 0.958 | n/a | 0.011 | 1.535 | 0.084 | 0.011 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.043ms |
| 897a45717404390c00000000000002b6 | 18.204 | 3.801 | n/a | 0.000 | 0.083 | 1.005 | 2.040 | 0.041 | 0.000 | 0.485 | 10.164 | 0.545 | n/a | 0.040 | 3.884 | 0.213 | 0.040 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.134ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.010ms |
| 897a45717404390c000000000000028d | 18.024 | 3.178 | n/a | 0.000 | 0.016 | 0.946 | 1.815 | 0.038 | 0.000 | 0.105 | 11.445 | 0.468 | n/a | 0.014 | 3.194 | 0.177 | 0.014 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.117ms; driver.reader-basis.broadcast 0.108ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.043ms |
| 897a45717404390c0000000000000332 | 17.978 | 1.847 | n/a | 0.000 | 0.042 | 1.343 | 5.277 | 0.029 | 0.000 | 0.111 | 8.832 | 0.476 | n/a | 0.022 | 1.888 | 0.105 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.015ms |
| 897a45717404390c0000000000000353 | 17.707 | 2.887 | n/a | 0.000 | 1.762 | 0.668 | 4.847 | 0.060 | 0.000 | 0.108 | 6.507 | 0.843 | n/a | 0.023 | 4.649 | 0.263 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.048ms; driver.publication.readback 0.048ms |
| 897a45717404390c00000000000003b2 | 17.376 | 2.125 | n/a | 0.000 | 1.892 | 0.444 | 1.264 | 0.016 | 0.000 | 0.094 | 10.602 | 0.923 | n/a | 0.016 | 4.016 | 0.231 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.016ms |
| 897a45717404390c00000000000002d5 | 17.233 | 1.904 | n/a | 0.000 | 0.044 | 1.680 | 5.096 | 0.021 | 0.000 | 0.065 | 7.982 | 0.419 | n/a | 0.022 | 1.947 | 0.113 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.135ms; driver.publication.persist-deferred 0.014ms |

## P2 / idle-25 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.548 | 0.000 | 0.000 | 0.462 | 1.866 | n/a | 0.000 | 0.038 | 0.622 | 1.167 | 0.015 | 0.000 | 0.132 | 4.359 | 0.473 | n/a | 0.020 | 1.906 | 0.217 | 0.020 |
| p99 | 21.424 | 1.996 | 0.027 | 0.989 | 4.136 | n/a | 0.000 | 1.268 | 3.651 | 5.178 | 0.046 | 0.000 | 3.198 | 10.277 | 4.592 | n/a | 0.052 | 4.558 | 0.389 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c0000000000000456 | 21.992 | 4.523 | n/a | 0.000 | 0.036 | 0.935 | 4.717 | 0.018 | 0.000 | 0.062 | 7.087 | 4.592 | n/a | 0.023 | 4.558 | 0.207 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 897a45717404390c0000000000000458 | 21.424 | 3.004 | n/a | 0.000 | 0.072 | 0.680 | 10.811 | 0.020 | 0.000 | 0.062 | 6.306 | 0.433 | n/a | 0.036 | 3.076 | 0.144 | 0.036 | gw-w/thread-66/gateway.response-write | none observed |
| 897a45717404390c00000000000004ad | 17.119 | 2.961 | n/a | 0.000 | 0.119 | 0.696 | 1.239 | 0.014 | 0.000 | 0.053 | 11.121 | 0.833 | n/a | 0.083 | 3.080 | 0.180 | 0.083 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000003e3 | 16.502 | 3.433 | n/a | 0.000 | 0.119 | 1.040 | 1.985 | 0.039 | 0.000 | 0.335 | 8.263 | 1.244 | n/a | 0.044 | 3.552 | 0.215 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000004c0 | 16.121 | 2.819 | n/a | 0.000 | 0.042 | 0.416 | 3.807 | 0.015 | 0.000 | 0.080 | 8.537 | 0.384 | n/a | 0.021 | 2.860 | 0.177 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.115ms |
| 897a45717404390c0000000000000430 | 15.577 | 1.788 | n/a | 0.000 | 0.038 | 0.489 | 0.977 | 0.016 | 0.000 | 0.140 | 7.510 | 4.604 | n/a | 0.017 | 1.826 | 0.117 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000004bd | 15.231 | 2.244 | n/a | 0.000 | 0.045 | 0.503 | 4.387 | 0.016 | 0.000 | 0.082 | 7.490 | 0.442 | n/a | 0.023 | 2.289 | 0.150 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000475 | 15.071 | 3.066 | n/a | 0.000 | 0.087 | 0.772 | 1.624 | 0.026 | 0.000 | 3.198 | 5.582 | 0.678 | n/a | 0.037 | 3.153 | 0.209 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000043a | 14.954 | 2.447 | n/a | 0.000 | 0.033 | 0.828 | 1.059 | 0.025 | 0.000 | 0.089 | 6.642 | 3.812 | n/a | 0.018 | 2.480 | 0.166 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000044c | 14.927 | 1.821 | n/a | 0.000 | 0.052 | 0.752 | 2.052 | 0.032 | 0.000 | 0.108 | 8.958 | 1.125 | n/a | 0.026 | 1.873 | 0.125 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000450 | 14.905 | 1.726 | n/a | 0.000 | 0.046 | 0.551 | 5.178 | 0.041 | 0.000 | 1.273 | 5.170 | 0.898 | n/a | 0.021 | 1.772 | 0.119 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000046f | 14.743 | 1.584 | n/a | 0.000 | 0.019 | 0.433 | 1.704 | 0.026 | 0.000 | 0.239 | 10.277 | 0.449 | n/a | 0.013 | 1.603 | 0.109 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 897a45717404390c00000000000004d2 | 14.742 | 1.695 | n/a | 0.000 | 0.026 | 3.651 | 4.580 | 0.013 | 0.000 | 1.110 | 3.224 | 0.430 | n/a | 0.013 | 1.721 | 0.117 | 0.013 | gw-w/thread-50/gateway.response-write | none observed |
| 897a45717404390c0000000000000493 | 14.679 | 1.661 | n/a | 0.000 | 0.032 | 0.621 | 4.959 | 0.032 | 0.000 | 0.148 | 6.725 | 0.484 | n/a | 0.015 | 1.694 | 0.115 | 0.015 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000436 | 14.290 | 2.901 | n/a | 0.000 | 0.092 | 0.774 | 0.992 | 0.015 | 0.000 | 0.084 | 8.513 | 0.881 | n/a | 0.037 | 2.993 | 0.209 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.105ms |
| 897a45717404390c0000000000000452 | 14.219 | 2.995 | n/a | 0.000 | 0.083 | 0.963 | 1.789 | 0.037 | 0.000 | 0.171 | 7.665 | 0.477 | n/a | 0.041 | 3.078 | 0.216 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000003db | 14.050 | 2.441 | n/a | 0.000 | 0.047 | 0.773 | 1.971 | 0.028 | 0.000 | 0.104 | 8.242 | 0.421 | n/a | 0.022 | 2.488 | 0.177 | 0.022 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000044e | 13.907 | 3.685 | n/a | 0.000 | 0.104 | 0.832 | 3.427 | 0.040 | 0.000 | 0.159 | 5.127 | 0.481 | n/a | 0.052 | 3.789 | 0.272 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.106ms |
| 897a45717404390c00000000000004b5 | 13.878 | 1.750 | n/a | 0.000 | 0.034 | 0.481 | 1.785 | 0.019 | 0.000 | 0.064 | 8.881 | 0.845 | n/a | 0.018 | 1.785 | 0.129 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000004de | 13.869 | 1.789 | n/a | 0.000 | 0.035 | 3.676 | 0.948 | 0.011 | 0.000 | 0.047 | 6.888 | 0.458 | n/a | 0.016 | 1.824 | 0.132 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-25 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.548 | 0.000 | 0.000 | 0.462 | 1.866 | n/a | 0.000 | 0.038 | 0.622 | 1.167 | 0.015 | 0.000 | 0.132 | 4.359 | 0.473 | n/a | 0.020 | 1.906 | 0.217 | 0.020 |
| p99 | 21.424 | 1.996 | 0.027 | 0.989 | 4.136 | n/a | 0.000 | 1.268 | 3.651 | 5.178 | 0.046 | 0.000 | 3.198 | 10.277 | 4.592 | n/a | 0.052 | 4.558 | 0.389 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c0000000000000456 | 21.992 | 4.523 | n/a | 0.000 | 0.036 | 0.935 | 4.717 | 0.018 | 0.000 | 0.062 | 7.087 | 4.592 | n/a | 0.023 | 4.558 | 0.207 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 897a45717404390c0000000000000458 | 21.424 | 3.004 | n/a | 0.000 | 0.072 | 0.680 | 10.811 | 0.020 | 0.000 | 0.062 | 6.306 | 0.433 | n/a | 0.036 | 3.076 | 0.144 | 0.036 | gw-w/thread-66/gateway.response-write | none observed |
| 897a45717404390c00000000000004ad | 17.119 | 2.961 | n/a | 0.000 | 0.119 | 0.696 | 1.239 | 0.014 | 0.000 | 0.053 | 11.121 | 0.833 | n/a | 0.083 | 3.080 | 0.180 | 0.083 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000003e3 | 16.502 | 3.433 | n/a | 0.000 | 0.119 | 1.040 | 1.985 | 0.039 | 0.000 | 0.335 | 8.263 | 1.244 | n/a | 0.044 | 3.552 | 0.215 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000004c0 | 16.121 | 2.819 | n/a | 0.000 | 0.042 | 0.416 | 3.807 | 0.015 | 0.000 | 0.080 | 8.537 | 0.384 | n/a | 0.021 | 2.860 | 0.177 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.115ms |
| 897a45717404390c0000000000000430 | 15.577 | 1.788 | n/a | 0.000 | 0.038 | 0.489 | 0.977 | 0.016 | 0.000 | 0.140 | 7.510 | 4.604 | n/a | 0.017 | 1.826 | 0.117 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000004bd | 15.231 | 2.244 | n/a | 0.000 | 0.045 | 0.503 | 4.387 | 0.016 | 0.000 | 0.082 | 7.490 | 0.442 | n/a | 0.023 | 2.289 | 0.150 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000475 | 15.071 | 3.066 | n/a | 0.000 | 0.087 | 0.772 | 1.624 | 0.026 | 0.000 | 3.198 | 5.582 | 0.678 | n/a | 0.037 | 3.153 | 0.209 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000043a | 14.954 | 2.447 | n/a | 0.000 | 0.033 | 0.828 | 1.059 | 0.025 | 0.000 | 0.089 | 6.642 | 3.812 | n/a | 0.018 | 2.480 | 0.166 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000044c | 14.927 | 1.821 | n/a | 0.000 | 0.052 | 0.752 | 2.052 | 0.032 | 0.000 | 0.108 | 8.958 | 1.125 | n/a | 0.026 | 1.873 | 0.125 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000450 | 14.905 | 1.726 | n/a | 0.000 | 0.046 | 0.551 | 5.178 | 0.041 | 0.000 | 1.273 | 5.170 | 0.898 | n/a | 0.021 | 1.772 | 0.119 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000046f | 14.743 | 1.584 | n/a | 0.000 | 0.019 | 0.433 | 1.704 | 0.026 | 0.000 | 0.239 | 10.277 | 0.449 | n/a | 0.013 | 1.603 | 0.109 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 897a45717404390c00000000000004d2 | 14.742 | 1.695 | n/a | 0.000 | 0.026 | 3.651 | 4.580 | 0.013 | 0.000 | 1.110 | 3.224 | 0.430 | n/a | 0.013 | 1.721 | 0.117 | 0.013 | gw-w/thread-50/gateway.response-write | none observed |
| 897a45717404390c0000000000000493 | 14.679 | 1.661 | n/a | 0.000 | 0.032 | 0.621 | 4.959 | 0.032 | 0.000 | 0.148 | 6.725 | 0.484 | n/a | 0.015 | 1.694 | 0.115 | 0.015 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000436 | 14.290 | 2.901 | n/a | 0.000 | 0.092 | 0.774 | 0.992 | 0.015 | 0.000 | 0.084 | 8.513 | 0.881 | n/a | 0.037 | 2.993 | 0.209 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.105ms |
| 897a45717404390c0000000000000452 | 14.219 | 2.995 | n/a | 0.000 | 0.083 | 0.963 | 1.789 | 0.037 | 0.000 | 0.171 | 7.665 | 0.477 | n/a | 0.041 | 3.078 | 0.216 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000003db | 14.050 | 2.441 | n/a | 0.000 | 0.047 | 0.773 | 1.971 | 0.028 | 0.000 | 0.104 | 8.242 | 0.421 | n/a | 0.022 | 2.488 | 0.177 | 0.022 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000044e | 13.907 | 3.685 | n/a | 0.000 | 0.104 | 0.832 | 3.427 | 0.040 | 0.000 | 0.159 | 5.127 | 0.481 | n/a | 0.052 | 3.789 | 0.272 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.106ms |
| 897a45717404390c00000000000004b5 | 13.878 | 1.750 | n/a | 0.000 | 0.034 | 0.481 | 1.785 | 0.019 | 0.000 | 0.064 | 8.881 | 0.845 | n/a | 0.018 | 1.785 | 0.129 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000004de | 13.869 | 1.789 | n/a | 0.000 | 0.035 | 3.676 | 0.948 | 0.011 | 0.000 | 0.047 | 6.888 | 0.458 | n/a | 0.016 | 1.824 | 0.132 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.479 | 0.000 | 0.000 | 0.481 | 2.143 | n/a | 0.000 | 0.048 | 0.618 | 1.013 | 0.013 | 0.000 | 0.145 | 4.252 | 0.442 | n/a | 0.023 | 2.230 | 0.232 | 0.023 |
| p99 | 15.971 | 1.509 | 0.000 | 1.074 | 3.670 | n/a | 0.000 | 1.764 | 3.613 | 5.219 | 0.063 | 0.000 | 1.048 | 10.501 | 1.066 | n/a | 0.048 | 4.762 | 0.465 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c000000000000054b | 19.179 | 2.849 | n/a | 0.000 | 0.083 | 0.777 | 1.618 | 0.020 | 0.000 | 0.080 | 13.264 | 0.449 | n/a | 0.038 | 2.932 | 0.153 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000059f | 15.971 | 1.563 | n/a | 0.000 | 0.027 | 0.662 | 5.219 | 0.029 | 0.000 | 3.017 | 4.583 | 0.856 | n/a | 0.016 | 1.590 | 0.100 | 0.016 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005c1 | 15.352 | 1.630 | n/a | 0.000 | 0.027 | 0.419 | 4.804 | 0.012 | 0.000 | 0.063 | 7.931 | 0.449 | n/a | 0.016 | 1.657 | 0.108 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000558 | 14.939 | 1.835 | n/a | 0.000 | 0.062 | 0.574 | 1.158 | 0.014 | 0.000 | 0.387 | 10.501 | 0.381 | n/a | 0.027 | 1.898 | 0.127 | 0.027 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000595 | 14.573 | 2.569 | n/a | 0.000 | 0.042 | 0.778 | 7.255 | 0.011 | 0.000 | 0.072 | 3.394 | 0.432 | n/a | 0.020 | 2.612 | 0.179 | 0.020 | gw-w/thread-47/gateway.route | none observed |
| 897a45717404390c000000000000050c | 14.535 | 2.107 | n/a | 0.000 | 0.031 | 1.857 | 4.772 | 0.018 | 0.000 | 0.066 | 4.838 | 0.828 | n/a | 0.018 | 2.139 | 0.147 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000512 | 14.520 | 3.465 | n/a | 0.000 | 0.103 | 0.783 | 4.309 | 0.019 | 0.000 | 0.064 | 4.907 | 0.826 | n/a | 0.043 | 3.568 | 0.246 | 0.043 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000056c | 14.105 | 2.187 | n/a | 0.000 | 0.646 | 0.491 | 3.683 | 0.012 | 0.000 | 0.269 | 5.954 | 0.843 | n/a | 0.019 | 2.833 | 0.201 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000589 | 13.844 | 1.845 | n/a | 0.000 | 0.030 | 0.494 | 4.391 | 0.014 | 0.000 | 0.064 | 6.560 | 0.427 | n/a | 0.018 | 1.875 | 0.135 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000500 | 13.839 | 1.780 | n/a | 0.000 | 0.032 | 3.613 | 0.825 | 0.012 | 0.000 | 0.059 | 5.278 | 2.222 | n/a | 0.017 | 1.812 | 0.131 | 0.017 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005d4 | 13.312 | 3.442 | n/a | 0.000 | 0.096 | 0.913 | 1.529 | 0.021 | 0.000 | 0.223 | 6.611 | 0.436 | n/a | 0.040 | 3.539 | 0.266 | 0.040 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000055e | 13.103 | 2.192 | n/a | 0.000 | 1.012 | 0.497 | 1.062 | 0.459 | 0.000 | 0.070 | 7.361 | 0.435 | n/a | 0.016 | 3.203 | 0.244 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000056a | 12.961 | 2.391 | n/a | 0.000 | 0.057 | 0.698 | 1.646 | 0.029 | 0.000 | 0.626 | 7.060 | 0.423 | n/a | 0.031 | 2.448 | 0.189 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005b2 | 12.916 | 1.948 | n/a | 0.000 | 0.034 | 0.555 | 4.672 | 0.013 | 0.000 | 0.076 | 4.747 | 0.854 | n/a | 0.019 | 1.981 | 0.153 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005a1 | 12.322 | 2.737 | n/a | 0.000 | 1.201 | 0.726 | 1.562 | 0.020 | 0.000 | 0.720 | 4.924 | 0.413 | n/a | 0.019 | 3.938 | 0.320 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000543 | 12.235 | 2.398 | n/a | 0.000 | 1.995 | 0.938 | 1.149 | 0.014 | 0.000 | 0.094 | 4.799 | 0.830 | n/a | 0.017 | 4.393 | 0.359 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000051a | 12.008 | 2.684 | n/a | 0.000 | 0.075 | 0.831 | 1.728 | 0.022 | 0.000 | 0.100 | 5.689 | 0.846 | n/a | 0.033 | 2.759 | 0.230 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000053b | 12.004 | 3.089 | n/a | 0.000 | 0.100 | 0.743 | 1.232 | 0.013 | 0.000 | 0.092 | 6.227 | 0.466 | n/a | 0.042 | 3.189 | 0.266 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005d6 | 11.967 | 2.530 | n/a | 0.000 | 0.033 | 3.992 | 0.970 | 0.012 | 0.000 | 0.081 | 3.887 | 0.441 | n/a | 0.020 | 2.563 | 0.214 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000053d | 11.782 | 1.652 | n/a | 0.000 | 0.037 | 0.498 | 0.924 | 0.013 | 0.000 | 0.060 | 7.733 | 0.845 | n/a | 0.020 | 1.688 | 0.143 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.479 | 0.000 | 0.000 | 0.481 | 2.143 | n/a | 0.000 | 0.048 | 0.618 | 1.013 | 0.013 | 0.000 | 0.145 | 4.252 | 0.442 | n/a | 0.023 | 2.230 | 0.232 | 0.023 |
| p99 | 15.971 | 1.509 | 0.000 | 1.074 | 3.670 | n/a | 0.000 | 1.764 | 3.613 | 5.219 | 0.063 | 0.000 | 1.048 | 10.501 | 1.066 | n/a | 0.048 | 4.762 | 0.465 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c000000000000054b | 19.179 | 2.849 | n/a | 0.000 | 0.083 | 0.777 | 1.618 | 0.020 | 0.000 | 0.080 | 13.264 | 0.449 | n/a | 0.038 | 2.932 | 0.153 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000059f | 15.971 | 1.563 | n/a | 0.000 | 0.027 | 0.662 | 5.219 | 0.029 | 0.000 | 3.017 | 4.583 | 0.856 | n/a | 0.016 | 1.590 | 0.100 | 0.016 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005c1 | 15.352 | 1.630 | n/a | 0.000 | 0.027 | 0.419 | 4.804 | 0.012 | 0.000 | 0.063 | 7.931 | 0.449 | n/a | 0.016 | 1.657 | 0.108 | 0.016 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000558 | 14.939 | 1.835 | n/a | 0.000 | 0.062 | 0.574 | 1.158 | 0.014 | 0.000 | 0.387 | 10.501 | 0.381 | n/a | 0.027 | 1.898 | 0.127 | 0.027 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000595 | 14.573 | 2.569 | n/a | 0.000 | 0.042 | 0.778 | 7.255 | 0.011 | 0.000 | 0.072 | 3.394 | 0.432 | n/a | 0.020 | 2.612 | 0.179 | 0.020 | gw-w/thread-47/gateway.route | none observed |
| 897a45717404390c000000000000050c | 14.535 | 2.107 | n/a | 0.000 | 0.031 | 1.857 | 4.772 | 0.018 | 0.000 | 0.066 | 4.838 | 0.828 | n/a | 0.018 | 2.139 | 0.147 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000512 | 14.520 | 3.465 | n/a | 0.000 | 0.103 | 0.783 | 4.309 | 0.019 | 0.000 | 0.064 | 4.907 | 0.826 | n/a | 0.043 | 3.568 | 0.246 | 0.043 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000056c | 14.105 | 2.187 | n/a | 0.000 | 0.646 | 0.491 | 3.683 | 0.012 | 0.000 | 0.269 | 5.954 | 0.843 | n/a | 0.019 | 2.833 | 0.201 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000589 | 13.844 | 1.845 | n/a | 0.000 | 0.030 | 0.494 | 4.391 | 0.014 | 0.000 | 0.064 | 6.560 | 0.427 | n/a | 0.018 | 1.875 | 0.135 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000500 | 13.839 | 1.780 | n/a | 0.000 | 0.032 | 3.613 | 0.825 | 0.012 | 0.000 | 0.059 | 5.278 | 2.222 | n/a | 0.017 | 1.812 | 0.131 | 0.017 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005d4 | 13.312 | 3.442 | n/a | 0.000 | 0.096 | 0.913 | 1.529 | 0.021 | 0.000 | 0.223 | 6.611 | 0.436 | n/a | 0.040 | 3.539 | 0.266 | 0.040 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000055e | 13.103 | 2.192 | n/a | 0.000 | 1.012 | 0.497 | 1.062 | 0.459 | 0.000 | 0.070 | 7.361 | 0.435 | n/a | 0.016 | 3.203 | 0.244 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000056a | 12.961 | 2.391 | n/a | 0.000 | 0.057 | 0.698 | 1.646 | 0.029 | 0.000 | 0.626 | 7.060 | 0.423 | n/a | 0.031 | 2.448 | 0.189 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005b2 | 12.916 | 1.948 | n/a | 0.000 | 0.034 | 0.555 | 4.672 | 0.013 | 0.000 | 0.076 | 4.747 | 0.854 | n/a | 0.019 | 1.981 | 0.153 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005a1 | 12.322 | 2.737 | n/a | 0.000 | 1.201 | 0.726 | 1.562 | 0.020 | 0.000 | 0.720 | 4.924 | 0.413 | n/a | 0.019 | 3.938 | 0.320 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000543 | 12.235 | 2.398 | n/a | 0.000 | 1.995 | 0.938 | 1.149 | 0.014 | 0.000 | 0.094 | 4.799 | 0.830 | n/a | 0.017 | 4.393 | 0.359 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000051a | 12.008 | 2.684 | n/a | 0.000 | 0.075 | 0.831 | 1.728 | 0.022 | 0.000 | 0.100 | 5.689 | 0.846 | n/a | 0.033 | 2.759 | 0.230 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000053b | 12.004 | 3.089 | n/a | 0.000 | 0.100 | 0.743 | 1.232 | 0.013 | 0.000 | 0.092 | 6.227 | 0.466 | n/a | 0.042 | 3.189 | 0.266 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000005d6 | 11.967 | 2.530 | n/a | 0.000 | 0.033 | 3.992 | 0.970 | 0.012 | 0.000 | 0.081 | 3.887 | 0.441 | n/a | 0.020 | 2.563 | 0.214 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000053d | 11.782 | 1.652 | n/a | 0.000 | 0.037 | 0.498 | 0.924 | 0.013 | 0.000 | 0.060 | 7.733 | 0.845 | n/a | 0.020 | 1.688 | 0.143 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.089 | 0.501 | 0.000 | 0.503 | 2.172 | n/a | 0.000 | 0.047 | 0.662 | 1.156 | 0.013 | 0.000 | 0.122 | 4.345 | 0.457 | n/a | 0.025 | 2.262 | 0.238 | 0.025 |
| p99 | 28.620 | 1.614 | 0.000 | 1.077 | 4.130 | n/a | 0.000 | 2.552 | 3.462 | 5.455 | 0.059 | 0.000 | 0.914 | 23.400 | 1.502 | n/a | 0.068 | 6.592 | 0.449 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c000000000000064b | 60.242 | 2.966 | n/a | 0.000 | 0.065 | 0.506 | 0.905 | 0.011 | 0.000 | 0.305 | 54.537 | 0.916 | n/a | 0.032 | 3.031 | 0.050 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006db | 28.620 | 1.864 | n/a | 0.000 | 0.041 | 0.757 | 1.482 | 0.015 | 0.000 | 0.167 | 23.400 | 0.867 | n/a | 0.028 | 1.905 | 0.067 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000694 | 20.708 | 2.278 | n/a | 0.000 | 0.084 | 0.573 | 1.224 | 0.013 | 0.000 | 2.978 | 13.101 | 0.428 | n/a | 0.029 | 2.361 | 0.114 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000657 | 18.863 | 2.843 | n/a | 0.000 | 0.104 | 0.862 | 5.745 | 0.045 | 0.000 | 0.165 | 8.631 | 0.427 | n/a | 0.043 | 2.946 | 0.156 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006c2 | 16.363 | 4.112 | n/a | 0.000 | 0.063 | 0.751 | 1.082 | 0.012 | 0.000 | 0.067 | 9.326 | 0.917 | n/a | 0.033 | 4.176 | 0.255 | 0.033 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000729 | 15.900 | 2.665 | n/a | 0.000 | 0.041 | 0.662 | 1.894 | 0.026 | 0.000 | 0.185 | 9.996 | 0.411 | n/a | 0.023 | 2.705 | 0.170 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006e4 | 15.769 | 1.823 | n/a | 0.000 | 0.041 | 0.669 | 1.679 | 0.027 | 0.000 | 0.112 | 10.958 | 0.438 | n/a | 0.024 | 1.864 | 0.118 | 0.024 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000067d | 15.734 | 2.193 | n/a | 0.000 | 0.910 | 0.567 | 1.477 | 0.017 | 0.000 | 0.077 | 9.581 | 0.893 | n/a | 0.020 | 3.103 | 0.197 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000746 | 14.956 | 1.796 | n/a | 0.000 | 0.046 | 0.506 | 4.747 | 0.012 | 0.000 | 0.094 | 6.873 | 0.857 | n/a | 0.024 | 1.842 | 0.123 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000731 | 14.693 | 3.540 | n/a | 0.000 | 3.052 | 0.557 | 0.873 | 0.011 | 0.000 | 0.090 | 5.599 | 0.936 | n/a | 0.034 | 6.592 | 0.449 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000655 | 14.233 | 4.625 | n/a | 0.000 | 2.552 | 0.796 | 1.207 | 0.012 | 0.000 | 0.097 | 4.426 | 0.450 | n/a | 0.068 | 7.177 | 0.504 | 0.068 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000072d | 13.986 | 1.598 | n/a | 0.000 | 0.037 | 0.482 | 1.148 | 0.012 | 0.000 | 0.093 | 9.785 | 0.810 | n/a | 0.021 | 1.635 | 0.117 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006fd | 13.874 | 1.785 | n/a | 0.000 | 0.040 | 3.546 | 1.024 | 0.012 | 0.000 | 0.072 | 6.920 | 0.453 | n/a | 0.021 | 1.825 | 0.132 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000740 | 13.686 | 2.297 | n/a | 0.000 | 2.139 | 0.445 | 1.743 | 0.021 | 0.000 | 0.228 | 5.851 | 0.929 | n/a | 0.032 | 4.436 | 0.324 | 0.032 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000629 | 13.572 | 2.625 | n/a | 0.000 | 0.048 | 0.729 | 1.117 | 0.013 | 0.000 | 0.069 | 8.276 | 0.663 | n/a | 0.032 | 2.673 | 0.197 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006b8 | 13.273 | 2.730 | n/a | 0.000 | 0.049 | 0.839 | 1.137 | 0.011 | 0.000 | 0.082 | 7.669 | 0.731 | n/a | 0.025 | 2.779 | 0.209 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006ec | 13.231 | 2.472 | n/a | 0.000 | 0.148 | 0.522 | 1.082 | 0.012 | 0.000 | 0.566 | 7.960 | 0.449 | n/a | 0.021 | 2.620 | 0.198 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000744 | 12.964 | 1.942 | n/a | 0.000 | 0.045 | 0.852 | 5.455 | 0.021 | 0.000 | 0.530 | 3.661 | 0.433 | n/a | 0.024 | 1.988 | 0.153 | 0.024 | gw-w/thread-49/storage/commit! | none observed |
| 897a45717404390c0000000000000690 | 12.866 | 4.130 | n/a | 0.000 | 0.109 | 1.123 | 2.240 | 0.029 | 0.000 | 0.199 | 4.576 | 0.410 | n/a | 0.051 | 4.239 | 0.329 | 0.051 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000660 | 12.651 | 2.232 | n/a | 0.000 | 0.027 | 0.425 | 1.613 | 0.067 | 0.000 | 0.253 | 4.527 | 3.490 | n/a | 0.016 | 2.259 | 0.179 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.089 | 0.501 | 0.000 | 0.503 | 2.172 | n/a | 0.000 | 0.047 | 0.662 | 1.156 | 0.013 | 0.000 | 0.122 | 4.345 | 0.457 | n/a | 0.025 | 2.262 | 0.238 | 0.025 |
| p99 | 28.620 | 1.614 | 0.000 | 1.077 | 4.130 | n/a | 0.000 | 2.552 | 3.462 | 5.455 | 0.059 | 0.000 | 0.914 | 23.400 | 1.502 | n/a | 0.068 | 6.592 | 0.449 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c000000000000064b | 60.242 | 2.966 | n/a | 0.000 | 0.065 | 0.506 | 0.905 | 0.011 | 0.000 | 0.305 | 54.537 | 0.916 | n/a | 0.032 | 3.031 | 0.050 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006db | 28.620 | 1.864 | n/a | 0.000 | 0.041 | 0.757 | 1.482 | 0.015 | 0.000 | 0.167 | 23.400 | 0.867 | n/a | 0.028 | 1.905 | 0.067 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000694 | 20.708 | 2.278 | n/a | 0.000 | 0.084 | 0.573 | 1.224 | 0.013 | 0.000 | 2.978 | 13.101 | 0.428 | n/a | 0.029 | 2.361 | 0.114 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000657 | 18.863 | 2.843 | n/a | 0.000 | 0.104 | 0.862 | 5.745 | 0.045 | 0.000 | 0.165 | 8.631 | 0.427 | n/a | 0.043 | 2.946 | 0.156 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006c2 | 16.363 | 4.112 | n/a | 0.000 | 0.063 | 0.751 | 1.082 | 0.012 | 0.000 | 0.067 | 9.326 | 0.917 | n/a | 0.033 | 4.176 | 0.255 | 0.033 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000729 | 15.900 | 2.665 | n/a | 0.000 | 0.041 | 0.662 | 1.894 | 0.026 | 0.000 | 0.185 | 9.996 | 0.411 | n/a | 0.023 | 2.705 | 0.170 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006e4 | 15.769 | 1.823 | n/a | 0.000 | 0.041 | 0.669 | 1.679 | 0.027 | 0.000 | 0.112 | 10.958 | 0.438 | n/a | 0.024 | 1.864 | 0.118 | 0.024 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000067d | 15.734 | 2.193 | n/a | 0.000 | 0.910 | 0.567 | 1.477 | 0.017 | 0.000 | 0.077 | 9.581 | 0.893 | n/a | 0.020 | 3.103 | 0.197 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000746 | 14.956 | 1.796 | n/a | 0.000 | 0.046 | 0.506 | 4.747 | 0.012 | 0.000 | 0.094 | 6.873 | 0.857 | n/a | 0.024 | 1.842 | 0.123 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000731 | 14.693 | 3.540 | n/a | 0.000 | 3.052 | 0.557 | 0.873 | 0.011 | 0.000 | 0.090 | 5.599 | 0.936 | n/a | 0.034 | 6.592 | 0.449 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000655 | 14.233 | 4.625 | n/a | 0.000 | 2.552 | 0.796 | 1.207 | 0.012 | 0.000 | 0.097 | 4.426 | 0.450 | n/a | 0.068 | 7.177 | 0.504 | 0.068 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000072d | 13.986 | 1.598 | n/a | 0.000 | 0.037 | 0.482 | 1.148 | 0.012 | 0.000 | 0.093 | 9.785 | 0.810 | n/a | 0.021 | 1.635 | 0.117 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006fd | 13.874 | 1.785 | n/a | 0.000 | 0.040 | 3.546 | 1.024 | 0.012 | 0.000 | 0.072 | 6.920 | 0.453 | n/a | 0.021 | 1.825 | 0.132 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000740 | 13.686 | 2.297 | n/a | 0.000 | 2.139 | 0.445 | 1.743 | 0.021 | 0.000 | 0.228 | 5.851 | 0.929 | n/a | 0.032 | 4.436 | 0.324 | 0.032 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000629 | 13.572 | 2.625 | n/a | 0.000 | 0.048 | 0.729 | 1.117 | 0.013 | 0.000 | 0.069 | 8.276 | 0.663 | n/a | 0.032 | 2.673 | 0.197 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006b8 | 13.273 | 2.730 | n/a | 0.000 | 0.049 | 0.839 | 1.137 | 0.011 | 0.000 | 0.082 | 7.669 | 0.731 | n/a | 0.025 | 2.779 | 0.209 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000006ec | 13.231 | 2.472 | n/a | 0.000 | 0.148 | 0.522 | 1.082 | 0.012 | 0.000 | 0.566 | 7.960 | 0.449 | n/a | 0.021 | 2.620 | 0.198 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000744 | 12.964 | 1.942 | n/a | 0.000 | 0.045 | 0.852 | 5.455 | 0.021 | 0.000 | 0.530 | 3.661 | 0.433 | n/a | 0.024 | 1.988 | 0.153 | 0.024 | gw-w/thread-49/storage/commit! | none observed |
| 897a45717404390c0000000000000690 | 12.866 | 4.130 | n/a | 0.000 | 0.109 | 1.123 | 2.240 | 0.029 | 0.000 | 0.199 | 4.576 | 0.410 | n/a | 0.051 | 4.239 | 0.329 | 0.051 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000660 | 12.651 | 2.232 | n/a | 0.000 | 0.027 | 0.425 | 1.613 | 0.067 | 0.000 | 0.253 | 4.527 | 3.490 | n/a | 0.016 | 2.259 | 0.179 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.932 | 0.191 | 0.000 | 0.525 | 2.384 | n/a | 0.000 | 0.055 | 0.747 | 1.187 | 0.015 | 0.000 | 0.154 | 4.834 | 0.494 | n/a | 0.031 | 2.490 | 0.231 | 0.031 |
| p99 | 17.883 | 2.320 | 0.000 | 1.625 | 4.544 | n/a | 0.000 | 1.886 | 1.323 | 5.438 | 0.037 | 0.000 | 0.948 | 11.251 | 1.259 | n/a | 0.102 | 4.795 | 0.401 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c000000000000085f | 22.329 | 3.024 | n/a | 0.000 | 0.092 | 0.775 | 1.195 | 0.013 | 0.000 | 0.101 | 16.196 | 0.888 | n/a | 0.045 | 3.116 | 0.140 | 0.045 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000076e | 17.883 | 2.843 | n/a | 0.000 | 0.049 | 1.106 | 5.438 | 0.036 | 0.000 | 0.204 | 7.687 | 0.492 | n/a | 0.028 | 2.892 | 0.162 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000007e1 | 16.805 | 4.105 | n/a | 0.000 | 0.095 | 1.047 | 3.854 | 0.013 | 0.000 | 0.086 | 6.625 | 0.932 | n/a | 0.047 | 4.200 | 0.250 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000803 | 16.052 | 3.580 | n/a | 0.000 | 0.063 | 0.740 | 1.323 | 0.014 | 0.000 | 0.161 | 9.608 | 0.533 | n/a | 0.032 | 3.642 | 0.227 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms |
| 897a45717404390c00000000000007bf | 15.967 | 3.574 | n/a | 0.000 | 2.412 | 0.702 | 1.250 | 0.014 | 0.000 | 0.313 | 6.652 | 1.007 | n/a | 0.043 | 5.986 | 0.375 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.086ms |
| 897a45717404390c0000000000000827 | 15.895 | 2.047 | n/a | 0.000 | 0.063 | 0.644 | 1.306 | 0.015 | 0.000 | 0.118 | 11.251 | 0.421 | n/a | 0.030 | 2.110 | 0.133 | 0.030 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000864 | 15.876 | 3.590 | n/a | 0.000 | 0.100 | 0.969 | 5.616 | 0.034 | 0.000 | 0.174 | 4.833 | 0.505 | n/a | 0.056 | 3.689 | 0.232 | 0.056 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000881 | 15.575 | 2.897 | n/a | 0.000 | 0.053 | 1.063 | 1.984 | 0.033 | 0.000 | 0.168 | 8.364 | 0.979 | n/a | 0.035 | 2.950 | 0.189 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000852 | 15.503 | 3.261 | n/a | 0.000 | 0.099 | 0.886 | 1.147 | 0.015 | 0.000 | 0.165 | 8.855 | 1.025 | n/a | 0.050 | 3.360 | 0.217 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000891 | 15.337 | 2.500 | n/a | 0.000 | 0.052 | 0.683 | 1.277 | 0.015 | 0.000 | 0.084 | 9.751 | 0.939 | n/a | 0.035 | 2.553 | 0.166 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000768 | 15.328 | 2.117 | n/a | 0.000 | 0.065 | 0.747 | 1.654 | 0.020 | 0.000 | 0.135 | 9.300 | 1.259 | n/a | 0.032 | 2.183 | 0.142 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000007cb | 15.077 | 2.706 | n/a | 0.000 | 0.048 | 0.748 | 1.082 | 0.015 | 0.000 | 0.362 | 9.612 | 0.472 | n/a | 0.034 | 2.753 | 0.183 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000837 | 15.073 | 3.530 | n/a | 0.000 | 0.111 | 0.844 | 4.629 | 0.018 | 0.000 | 0.088 | 5.278 | 0.518 | n/a | 0.056 | 3.642 | 0.242 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000801 | 15.068 | 2.434 | n/a | 0.000 | 0.056 | 0.824 | 1.956 | 0.028 | 0.000 | 0.702 | 5.435 | 3.604 | n/a | 0.030 | 2.490 | 0.165 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000876 | 14.640 | 2.971 | n/a | 0.000 | 0.067 | 0.883 | 1.005 | 0.012 | 0.000 | 0.081 | 9.045 | 0.545 | n/a | 0.030 | 3.038 | 0.208 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000839 | 14.304 | 2.445 | n/a | 0.000 | 0.049 | 0.593 | 0.963 | 0.012 | 0.000 | 0.337 | 9.433 | 0.438 | n/a | 0.034 | 2.494 | 0.174 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000007a0 | 14.101 | 3.915 | n/a | 0.000 | 0.257 | 1.059 | 1.083 | 0.014 | 0.000 | 0.083 | 6.660 | 0.975 | n/a | 0.054 | 4.172 | 0.296 | 0.054 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.067ms |
| 897a45717404390c000000000000089c | 13.804 | 3.842 | n/a | 0.000 | 0.147 | 0.926 | 3.040 | 0.016 | 0.000 | 0.088 | 5.148 | 0.533 | n/a | 0.063 | 3.989 | 0.289 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000007dd | 13.772 | 3.067 | n/a | 0.000 | 0.081 | 0.775 | 4.474 | 0.034 | 0.000 | 0.167 | 4.704 | 0.426 | n/a | 0.043 | 3.148 | 0.229 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000883 | 13.643 | 1.828 | n/a | 0.000 | 0.041 | 0.618 | 3.840 | 0.012 | 0.000 | 0.303 | 6.532 | 0.447 | n/a | 0.022 | 1.868 | 0.137 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.932 | 0.191 | 0.000 | 0.525 | 2.384 | n/a | 0.000 | 0.055 | 0.747 | 1.187 | 0.015 | 0.000 | 0.154 | 4.834 | 0.494 | n/a | 0.031 | 2.490 | 0.231 | 0.031 |
| p99 | 17.883 | 2.320 | 0.000 | 1.625 | 4.544 | n/a | 0.000 | 1.886 | 1.323 | 5.438 | 0.037 | 0.000 | 0.948 | 11.251 | 1.259 | n/a | 0.102 | 4.795 | 0.401 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c000000000000085f | 22.329 | 3.024 | n/a | 0.000 | 0.092 | 0.775 | 1.195 | 0.013 | 0.000 | 0.101 | 16.196 | 0.888 | n/a | 0.045 | 3.116 | 0.140 | 0.045 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000076e | 17.883 | 2.843 | n/a | 0.000 | 0.049 | 1.106 | 5.438 | 0.036 | 0.000 | 0.204 | 7.687 | 0.492 | n/a | 0.028 | 2.892 | 0.162 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000007e1 | 16.805 | 4.105 | n/a | 0.000 | 0.095 | 1.047 | 3.854 | 0.013 | 0.000 | 0.086 | 6.625 | 0.932 | n/a | 0.047 | 4.200 | 0.250 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000803 | 16.052 | 3.580 | n/a | 0.000 | 0.063 | 0.740 | 1.323 | 0.014 | 0.000 | 0.161 | 9.608 | 0.533 | n/a | 0.032 | 3.642 | 0.227 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.081ms |
| 897a45717404390c00000000000007bf | 15.967 | 3.574 | n/a | 0.000 | 2.412 | 0.702 | 1.250 | 0.014 | 0.000 | 0.313 | 6.652 | 1.007 | n/a | 0.043 | 5.986 | 0.375 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.086ms |
| 897a45717404390c0000000000000827 | 15.895 | 2.047 | n/a | 0.000 | 0.063 | 0.644 | 1.306 | 0.015 | 0.000 | 0.118 | 11.251 | 0.421 | n/a | 0.030 | 2.110 | 0.133 | 0.030 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000864 | 15.876 | 3.590 | n/a | 0.000 | 0.100 | 0.969 | 5.616 | 0.034 | 0.000 | 0.174 | 4.833 | 0.505 | n/a | 0.056 | 3.689 | 0.232 | 0.056 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000881 | 15.575 | 2.897 | n/a | 0.000 | 0.053 | 1.063 | 1.984 | 0.033 | 0.000 | 0.168 | 8.364 | 0.979 | n/a | 0.035 | 2.950 | 0.189 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000852 | 15.503 | 3.261 | n/a | 0.000 | 0.099 | 0.886 | 1.147 | 0.015 | 0.000 | 0.165 | 8.855 | 1.025 | n/a | 0.050 | 3.360 | 0.217 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000891 | 15.337 | 2.500 | n/a | 0.000 | 0.052 | 0.683 | 1.277 | 0.015 | 0.000 | 0.084 | 9.751 | 0.939 | n/a | 0.035 | 2.553 | 0.166 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000768 | 15.328 | 2.117 | n/a | 0.000 | 0.065 | 0.747 | 1.654 | 0.020 | 0.000 | 0.135 | 9.300 | 1.259 | n/a | 0.032 | 2.183 | 0.142 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000007cb | 15.077 | 2.706 | n/a | 0.000 | 0.048 | 0.748 | 1.082 | 0.015 | 0.000 | 0.362 | 9.612 | 0.472 | n/a | 0.034 | 2.753 | 0.183 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000837 | 15.073 | 3.530 | n/a | 0.000 | 0.111 | 0.844 | 4.629 | 0.018 | 0.000 | 0.088 | 5.278 | 0.518 | n/a | 0.056 | 3.642 | 0.242 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000801 | 15.068 | 2.434 | n/a | 0.000 | 0.056 | 0.824 | 1.956 | 0.028 | 0.000 | 0.702 | 5.435 | 3.604 | n/a | 0.030 | 2.490 | 0.165 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000876 | 14.640 | 2.971 | n/a | 0.000 | 0.067 | 0.883 | 1.005 | 0.012 | 0.000 | 0.081 | 9.045 | 0.545 | n/a | 0.030 | 3.038 | 0.208 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000839 | 14.304 | 2.445 | n/a | 0.000 | 0.049 | 0.593 | 0.963 | 0.012 | 0.000 | 0.337 | 9.433 | 0.438 | n/a | 0.034 | 2.494 | 0.174 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000007a0 | 14.101 | 3.915 | n/a | 0.000 | 0.257 | 1.059 | 1.083 | 0.014 | 0.000 | 0.083 | 6.660 | 0.975 | n/a | 0.054 | 4.172 | 0.296 | 0.054 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.067ms |
| 897a45717404390c000000000000089c | 13.804 | 3.842 | n/a | 0.000 | 0.147 | 0.926 | 3.040 | 0.016 | 0.000 | 0.088 | 5.148 | 0.533 | n/a | 0.063 | 3.989 | 0.289 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000007dd | 13.772 | 3.067 | n/a | 0.000 | 0.081 | 0.775 | 4.474 | 0.034 | 0.000 | 0.167 | 4.704 | 0.426 | n/a | 0.043 | 3.148 | 0.229 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000883 | 13.643 | 1.828 | n/a | 0.000 | 0.041 | 0.618 | 3.840 | 0.012 | 0.000 | 0.303 | 6.532 | 0.447 | n/a | 0.022 | 1.868 | 0.137 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.482 | 0.000 | 0.000 | 0.540 | 2.573 | n/a | 0.000 | 0.062 | 0.823 | 1.232 | 0.015 | 0.000 | 0.159 | 5.195 | 0.544 | n/a | 0.035 | 2.689 | 0.238 | 0.035 |
| p99 | 21.722 | 2.004 | 0.000 | 1.284 | 4.647 | n/a | 0.000 | 2.723 | 2.132 | 4.893 | 0.039 | 0.000 | 1.563 | 9.564 | 1.277 | n/a | 0.094 | 6.367 | 0.456 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c00000000000008e6 | 35.171 | 2.770 | n/a | 0.000 | 0.069 | 0.749 | 1.017 | 0.014 | 0.000 | 0.107 | 4.285 | 26.128 | n/a | 0.033 | 2.838 | 0.081 | 0.033 | tx/thread-86/transactor.triplex-function | none observed |
| 897a45717404390c000000000000094a | 21.722 | 4.520 | n/a | 0.000 | 2.723 | 2.489 | 2.359 | 0.016 | 0.000 | 0.131 | 8.553 | 0.889 | n/a | 0.042 | 7.243 | 0.333 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a21 | 19.817 | 4.343 | n/a | 0.000 | 0.193 | 1.520 | 2.407 | 0.040 | 0.000 | 0.944 | 9.002 | 1.277 | n/a | 0.091 | 4.536 | 0.229 | 0.091 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000968 | 18.257 | 4.608 | n/a | 0.000 | 0.067 | 1.000 | 1.958 | 0.032 | 0.000 | 0.182 | 9.861 | 0.510 | n/a | 0.039 | 4.676 | 0.256 | 0.039 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009cc | 17.970 | 3.520 | n/a | 0.000 | 0.150 | 0.859 | 4.350 | 0.026 | 0.000 | 0.141 | 8.294 | 0.546 | n/a | 0.084 | 3.670 | 0.204 | 0.084 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000095e | 16.449 | 4.625 | n/a | 0.000 | 0.195 | 1.086 | 1.983 | 0.021 | 0.000 | 0.123 | 7.764 | 0.551 | n/a | 0.101 | 4.820 | 0.293 | 0.101 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009b5 | 15.978 | 2.867 | n/a | 0.000 | 1.442 | 0.966 | 4.105 | 0.013 | 0.000 | 0.078 | 5.643 | 0.839 | n/a | 0.025 | 4.309 | 0.270 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009ae | 15.836 | 2.647 | n/a | 0.000 | 0.069 | 1.107 | 1.337 | 0.020 | 0.000 | 0.529 | 8.961 | 1.118 | n/a | 0.050 | 2.716 | 0.171 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000008f5 | 15.727 | 4.107 | n/a | 0.000 | 0.147 | 0.813 | 1.606 | 0.020 | 0.000 | 0.246 | 7.562 | 1.138 | n/a | 0.087 | 4.255 | 0.271 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009e5 | 15.654 | 3.096 | n/a | 0.000 | 0.084 | 1.349 | 2.052 | 0.036 | 0.000 | 1.563 | 6.397 | 1.028 | n/a | 0.050 | 3.180 | 0.203 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000096d | 15.422 | 2.750 | n/a | 0.000 | 0.058 | 0.847 | 1.451 | 0.016 | 0.000 | 0.137 | 8.867 | 1.257 | n/a | 0.039 | 2.808 | 0.182 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000008f0 | 15.353 | 4.328 | n/a | 0.000 | 0.080 | 1.037 | 1.508 | 0.020 | 0.000 | 0.135 | 7.045 | 1.136 | n/a | 0.065 | 4.408 | 0.287 | 0.065 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000008b9 | 15.299 | 2.015 | n/a | 0.000 | 0.054 | 0.764 | 1.735 | 0.026 | 0.000 | 0.141 | 9.564 | 0.967 | n/a | 0.034 | 2.069 | 0.135 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000099f | 15.021 | 3.893 | n/a | 0.000 | 0.133 | 1.013 | 3.763 | 0.016 | 0.000 | 0.104 | 5.485 | 0.532 | n/a | 0.082 | 4.026 | 0.268 | 0.082 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a14 | 15.016 | 1.836 | n/a | 0.000 | 0.048 | 1.621 | 1.301 | 0.016 | 0.000 | 0.121 | 8.990 | 1.058 | n/a | 0.025 | 1.884 | 0.125 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000098d | 14.947 | 3.892 | n/a | 0.000 | 0.084 | 0.716 | 0.903 | 0.011 | 0.000 | 3.218 | 5.130 | 0.951 | n/a | 0.041 | 3.976 | 0.266 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000008d7 | 14.572 | 3.751 | n/a | 0.000 | 0.199 | 1.353 | 2.237 | 0.034 | 0.000 | 0.318 | 5.890 | 0.694 | n/a | 0.094 | 3.950 | 0.271 | 0.094 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009ec | 14.524 | 1.805 | n/a | 0.000 | 0.049 | 1.651 | 4.893 | 0.015 | 0.000 | 0.177 | 5.388 | 0.521 | n/a | 0.027 | 1.854 | 0.128 | 0.027 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009f4 | 14.339 | 4.202 | n/a | 0.000 | 0.185 | 1.152 | 1.314 | 0.020 | 0.000 | 0.462 | 6.315 | 0.601 | n/a | 0.089 | 4.387 | 0.306 | 0.089 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000092c | 14.333 | 2.451 | n/a | 0.000 | 0.076 | 0.763 | 5.463 | 0.019 | 0.000 | 0.109 | 4.876 | 0.523 | n/a | 0.052 | 2.527 | 0.176 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.482 | 0.000 | 0.000 | 0.540 | 2.573 | n/a | 0.000 | 0.062 | 0.823 | 1.232 | 0.015 | 0.000 | 0.159 | 5.195 | 0.544 | n/a | 0.035 | 2.689 | 0.238 | 0.035 |
| p99 | 21.722 | 2.004 | 0.000 | 1.284 | 4.647 | n/a | 0.000 | 2.723 | 2.132 | 4.893 | 0.039 | 0.000 | 1.563 | 9.564 | 1.277 | n/a | 0.094 | 6.367 | 0.456 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c00000000000008e6 | 35.171 | 2.770 | n/a | 0.000 | 0.069 | 0.749 | 1.017 | 0.014 | 0.000 | 0.107 | 4.285 | 26.128 | n/a | 0.033 | 2.838 | 0.081 | 0.033 | tx/thread-86/transactor.triplex-function | none observed |
| 897a45717404390c000000000000094a | 21.722 | 4.520 | n/a | 0.000 | 2.723 | 2.489 | 2.359 | 0.016 | 0.000 | 0.131 | 8.553 | 0.889 | n/a | 0.042 | 7.243 | 0.333 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a21 | 19.817 | 4.343 | n/a | 0.000 | 0.193 | 1.520 | 2.407 | 0.040 | 0.000 | 0.944 | 9.002 | 1.277 | n/a | 0.091 | 4.536 | 0.229 | 0.091 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000968 | 18.257 | 4.608 | n/a | 0.000 | 0.067 | 1.000 | 1.958 | 0.032 | 0.000 | 0.182 | 9.861 | 0.510 | n/a | 0.039 | 4.676 | 0.256 | 0.039 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009cc | 17.970 | 3.520 | n/a | 0.000 | 0.150 | 0.859 | 4.350 | 0.026 | 0.000 | 0.141 | 8.294 | 0.546 | n/a | 0.084 | 3.670 | 0.204 | 0.084 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000095e | 16.449 | 4.625 | n/a | 0.000 | 0.195 | 1.086 | 1.983 | 0.021 | 0.000 | 0.123 | 7.764 | 0.551 | n/a | 0.101 | 4.820 | 0.293 | 0.101 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009b5 | 15.978 | 2.867 | n/a | 0.000 | 1.442 | 0.966 | 4.105 | 0.013 | 0.000 | 0.078 | 5.643 | 0.839 | n/a | 0.025 | 4.309 | 0.270 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009ae | 15.836 | 2.647 | n/a | 0.000 | 0.069 | 1.107 | 1.337 | 0.020 | 0.000 | 0.529 | 8.961 | 1.118 | n/a | 0.050 | 2.716 | 0.171 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000008f5 | 15.727 | 4.107 | n/a | 0.000 | 0.147 | 0.813 | 1.606 | 0.020 | 0.000 | 0.246 | 7.562 | 1.138 | n/a | 0.087 | 4.255 | 0.271 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009e5 | 15.654 | 3.096 | n/a | 0.000 | 0.084 | 1.349 | 2.052 | 0.036 | 0.000 | 1.563 | 6.397 | 1.028 | n/a | 0.050 | 3.180 | 0.203 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000096d | 15.422 | 2.750 | n/a | 0.000 | 0.058 | 0.847 | 1.451 | 0.016 | 0.000 | 0.137 | 8.867 | 1.257 | n/a | 0.039 | 2.808 | 0.182 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000008f0 | 15.353 | 4.328 | n/a | 0.000 | 0.080 | 1.037 | 1.508 | 0.020 | 0.000 | 0.135 | 7.045 | 1.136 | n/a | 0.065 | 4.408 | 0.287 | 0.065 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000008b9 | 15.299 | 2.015 | n/a | 0.000 | 0.054 | 0.764 | 1.735 | 0.026 | 0.000 | 0.141 | 9.564 | 0.967 | n/a | 0.034 | 2.069 | 0.135 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000099f | 15.021 | 3.893 | n/a | 0.000 | 0.133 | 1.013 | 3.763 | 0.016 | 0.000 | 0.104 | 5.485 | 0.532 | n/a | 0.082 | 4.026 | 0.268 | 0.082 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a14 | 15.016 | 1.836 | n/a | 0.000 | 0.048 | 1.621 | 1.301 | 0.016 | 0.000 | 0.121 | 8.990 | 1.058 | n/a | 0.025 | 1.884 | 0.125 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000098d | 14.947 | 3.892 | n/a | 0.000 | 0.084 | 0.716 | 0.903 | 0.011 | 0.000 | 3.218 | 5.130 | 0.951 | n/a | 0.041 | 3.976 | 0.266 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000008d7 | 14.572 | 3.751 | n/a | 0.000 | 0.199 | 1.353 | 2.237 | 0.034 | 0.000 | 0.318 | 5.890 | 0.694 | n/a | 0.094 | 3.950 | 0.271 | 0.094 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009ec | 14.524 | 1.805 | n/a | 0.000 | 0.049 | 1.651 | 4.893 | 0.015 | 0.000 | 0.177 | 5.388 | 0.521 | n/a | 0.027 | 1.854 | 0.128 | 0.027 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c00000000000009f4 | 14.339 | 4.202 | n/a | 0.000 | 0.185 | 1.152 | 1.314 | 0.020 | 0.000 | 0.462 | 6.315 | 0.601 | n/a | 0.089 | 4.387 | 0.306 | 0.089 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c000000000000092c | 14.333 | 2.451 | n/a | 0.000 | 0.076 | 0.763 | 5.463 | 0.019 | 0.000 | 0.109 | 4.876 | 0.523 | n/a | 0.052 | 2.527 | 0.176 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.794 | 0.591 | 0.000 | 0.585 | 2.668 | n/a | 0.000 | 0.077 | 0.791 | 1.383 | 0.019 | 0.000 | 0.217 | 5.441 | 0.628 | n/a | 0.041 | 2.804 | 0.240 | 0.041 |
| p99 | 19.965 | 1.995 | 0.000 | 1.109 | 4.891 | n/a | 0.000 | 3.035 | 2.427 | 4.604 | 0.061 | 0.000 | 3.941 | 13.764 | 1.350 | n/a | 0.088 | 5.896 | 0.410 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c0000000000000afd | 40.011 | 3.960 | n/a | 0.000 | 0.133 | 1.161 | 1.947 | 0.029 | 0.000 | 0.158 | 31.481 | 1.083 | n/a | 0.059 | 4.092 | 0.102 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.130ms |
| 897a45717404390c0000000000000a72 | 19.965 | 2.994 | n/a | 0.000 | 0.078 | 1.432 | 5.591 | 0.044 | 0.000 | 0.258 | 8.722 | 0.802 | n/a | 0.045 | 3.072 | 0.154 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a7f | 19.846 | 2.412 | n/a | 0.000 | 0.077 | 4.470 | 2.224 | 0.041 | 0.000 | 2.526 | 7.533 | 0.519 | n/a | 0.044 | 2.489 | 0.125 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a54 | 19.840 | 3.049 | n/a | 0.000 | 0.083 | 0.796 | 1.374 | 0.021 | 0.000 | 0.119 | 13.764 | 0.591 | n/a | 0.043 | 3.132 | 0.158 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b0c | 19.190 | 3.351 | n/a | 0.000 | 0.101 | 0.857 | 1.964 | 0.030 | 0.000 | 0.577 | 11.005 | 1.258 | n/a | 0.046 | 3.451 | 0.180 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.136ms |
| 897a45717404390c0000000000000abb | 18.859 | 4.052 | n/a | 0.000 | 0.199 | 1.202 | 4.424 | 0.021 | 0.000 | 0.125 | 7.591 | 1.165 | n/a | 0.081 | 4.250 | 0.225 | 0.081 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000ae5 | 18.821 | 5.549 | n/a | 0.000 | 0.190 | 1.005 | 3.121 | 0.026 | 0.000 | 0.490 | 7.629 | 0.707 | n/a | 0.104 | 5.739 | 0.305 | 0.104 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.176ms |
| 897a45717404390c0000000000000a5a | 18.784 | 3.137 | n/a | 0.000 | 0.073 | 1.390 | 2.500 | 0.039 | 0.000 | 0.310 | 10.070 | 1.221 | n/a | 0.045 | 3.210 | 0.171 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b5d | 18.382 | 2.451 | n/a | 0.000 | 2.869 | 0.690 | 4.604 | 0.012 | 0.000 | 0.105 | 7.203 | 0.420 | n/a | 0.027 | 5.320 | 0.289 | 0.027 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b42 | 17.427 | 4.495 | n/a | 0.000 | 0.084 | 1.412 | 3.116 | 0.037 | 0.000 | 0.427 | 7.133 | 0.671 | n/a | 0.052 | 4.579 | 0.263 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b84 | 16.977 | 4.815 | n/a | 0.000 | 0.192 | 1.377 | 1.805 | 0.028 | 0.000 | 0.240 | 7.599 | 0.839 | n/a | 0.082 | 5.007 | 0.295 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b09 | 16.958 | 3.228 | n/a | 0.000 | 2.668 | 0.719 | 1.503 | 0.020 | 0.000 | 0.594 | 6.712 | 1.482 | n/a | 0.031 | 5.896 | 0.348 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000adf | 16.834 | 4.531 | n/a | 0.000 | 0.173 | 0.913 | 1.553 | 0.022 | 0.000 | 0.236 | 7.988 | 1.335 | n/a | 0.084 | 4.704 | 0.279 | 0.084 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.098ms |
| 897a45717404390c0000000000000a91 | 16.615 | 3.348 | n/a | 0.000 | 0.077 | 0.870 | 4.543 | 0.021 | 0.000 | 0.114 | 6.573 | 1.026 | n/a | 0.044 | 3.425 | 0.206 | 0.044 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000bbd | 15.684 | 3.987 | n/a | 0.000 | 0.121 | 0.633 | 1.618 | 0.015 | 0.000 | 0.105 | 7.934 | 1.218 | n/a | 0.054 | 4.107 | 0.262 | 0.054 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a85 | 15.396 | 3.046 | n/a | 0.000 | 0.073 | 0.907 | 1.383 | 0.020 | 0.000 | 0.273 | 8.550 | 1.098 | n/a | 0.046 | 3.119 | 0.203 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000be8 | 15.208 | 4.891 | n/a | 0.000 | 0.127 | 0.988 | 1.985 | 0.052 | 0.000 | 0.317 | 6.049 | 0.745 | n/a | 0.056 | 5.017 | 0.330 | 0.056 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000bd0 | 15.113 | 2.128 | n/a | 0.000 | 1.643 | 0.493 | 1.184 | 0.013 | 0.000 | 0.135 | 8.563 | 0.936 | n/a | 0.020 | 3.771 | 0.249 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a82 | 15.056 | 4.400 | n/a | 0.000 | 0.180 | 1.338 | 2.250 | 0.034 | 0.000 | 0.521 | 5.608 | 0.643 | n/a | 0.083 | 4.580 | 0.304 | 0.083 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000ac7 | 15.045 | 2.947 | n/a | 0.000 | 0.084 | 0.933 | 1.356 | 0.022 | 0.000 | 3.983 | 5.171 | 0.502 | n/a | 0.047 | 3.031 | 0.201 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.132ms |

## P2 / idle-1000 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.794 | 0.591 | 0.000 | 0.585 | 2.668 | n/a | 0.000 | 0.077 | 0.791 | 1.383 | 0.019 | 0.000 | 0.217 | 5.441 | 0.628 | n/a | 0.041 | 2.804 | 0.240 | 0.041 |
| p99 | 19.965 | 1.995 | 0.000 | 1.109 | 4.891 | n/a | 0.000 | 3.035 | 2.427 | 4.604 | 0.061 | 0.000 | 3.941 | 13.764 | 1.350 | n/a | 0.088 | 5.896 | 0.410 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 897a45717404390c0000000000000afd | 40.011 | 3.960 | n/a | 0.000 | 0.133 | 1.161 | 1.947 | 0.029 | 0.000 | 0.158 | 31.481 | 1.083 | n/a | 0.059 | 4.092 | 0.102 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.130ms |
| 897a45717404390c0000000000000a72 | 19.965 | 2.994 | n/a | 0.000 | 0.078 | 1.432 | 5.591 | 0.044 | 0.000 | 0.258 | 8.722 | 0.802 | n/a | 0.045 | 3.072 | 0.154 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a7f | 19.846 | 2.412 | n/a | 0.000 | 0.077 | 4.470 | 2.224 | 0.041 | 0.000 | 2.526 | 7.533 | 0.519 | n/a | 0.044 | 2.489 | 0.125 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a54 | 19.840 | 3.049 | n/a | 0.000 | 0.083 | 0.796 | 1.374 | 0.021 | 0.000 | 0.119 | 13.764 | 0.591 | n/a | 0.043 | 3.132 | 0.158 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b0c | 19.190 | 3.351 | n/a | 0.000 | 0.101 | 0.857 | 1.964 | 0.030 | 0.000 | 0.577 | 11.005 | 1.258 | n/a | 0.046 | 3.451 | 0.180 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.136ms |
| 897a45717404390c0000000000000abb | 18.859 | 4.052 | n/a | 0.000 | 0.199 | 1.202 | 4.424 | 0.021 | 0.000 | 0.125 | 7.591 | 1.165 | n/a | 0.081 | 4.250 | 0.225 | 0.081 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000ae5 | 18.821 | 5.549 | n/a | 0.000 | 0.190 | 1.005 | 3.121 | 0.026 | 0.000 | 0.490 | 7.629 | 0.707 | n/a | 0.104 | 5.739 | 0.305 | 0.104 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.176ms |
| 897a45717404390c0000000000000a5a | 18.784 | 3.137 | n/a | 0.000 | 0.073 | 1.390 | 2.500 | 0.039 | 0.000 | 0.310 | 10.070 | 1.221 | n/a | 0.045 | 3.210 | 0.171 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b5d | 18.382 | 2.451 | n/a | 0.000 | 2.869 | 0.690 | 4.604 | 0.012 | 0.000 | 0.105 | 7.203 | 0.420 | n/a | 0.027 | 5.320 | 0.289 | 0.027 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b42 | 17.427 | 4.495 | n/a | 0.000 | 0.084 | 1.412 | 3.116 | 0.037 | 0.000 | 0.427 | 7.133 | 0.671 | n/a | 0.052 | 4.579 | 0.263 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b84 | 16.977 | 4.815 | n/a | 0.000 | 0.192 | 1.377 | 1.805 | 0.028 | 0.000 | 0.240 | 7.599 | 0.839 | n/a | 0.082 | 5.007 | 0.295 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000b09 | 16.958 | 3.228 | n/a | 0.000 | 2.668 | 0.719 | 1.503 | 0.020 | 0.000 | 0.594 | 6.712 | 1.482 | n/a | 0.031 | 5.896 | 0.348 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000adf | 16.834 | 4.531 | n/a | 0.000 | 0.173 | 0.913 | 1.553 | 0.022 | 0.000 | 0.236 | 7.988 | 1.335 | n/a | 0.084 | 4.704 | 0.279 | 0.084 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.098ms |
| 897a45717404390c0000000000000a91 | 16.615 | 3.348 | n/a | 0.000 | 0.077 | 0.870 | 4.543 | 0.021 | 0.000 | 0.114 | 6.573 | 1.026 | n/a | 0.044 | 3.425 | 0.206 | 0.044 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000bbd | 15.684 | 3.987 | n/a | 0.000 | 0.121 | 0.633 | 1.618 | 0.015 | 0.000 | 0.105 | 7.934 | 1.218 | n/a | 0.054 | 4.107 | 0.262 | 0.054 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a85 | 15.396 | 3.046 | n/a | 0.000 | 0.073 | 0.907 | 1.383 | 0.020 | 0.000 | 0.273 | 8.550 | 1.098 | n/a | 0.046 | 3.119 | 0.203 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000be8 | 15.208 | 4.891 | n/a | 0.000 | 0.127 | 0.988 | 1.985 | 0.052 | 0.000 | 0.317 | 6.049 | 0.745 | n/a | 0.056 | 5.017 | 0.330 | 0.056 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000bd0 | 15.113 | 2.128 | n/a | 0.000 | 1.643 | 0.493 | 1.184 | 0.013 | 0.000 | 0.135 | 8.563 | 0.936 | n/a | 0.020 | 3.771 | 0.249 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000a82 | 15.056 | 4.400 | n/a | 0.000 | 0.180 | 1.338 | 2.250 | 0.034 | 0.000 | 0.521 | 5.608 | 0.643 | n/a | 0.083 | 4.580 | 0.304 | 0.083 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 897a45717404390c0000000000000ac7 | 15.045 | 2.947 | n/a | 0.000 | 0.084 | 0.933 | 1.356 | 0.022 | 0.000 | 3.983 | 5.171 | 0.502 | n/a | 0.047 | 3.031 | 0.201 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.132ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.356 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.932 | 200.678 | 0.004 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.101 | 0.042 | 0.000 | 0.101 |
| p99 | 422.768 | n/a | n/a | n/a | 15.937 | n/a | 2.570 | 0.000 | 6.127 | 416.046 | 0.247 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.579 | 18.507 | 0.189 | 0.579 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf4400000000000000002 | 422.768 | 2.688 | n/a | 0.000 | 0.000 | 3.424 | 416.046 | 0.247 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.283 | 2.688 | 0.006 | 0.283 | gw-r/thread-53/gateway.admitted-work | none observed |
| 86c7e5dd4a7a21bd0000000000000005 | 203.830 | 0.071 | n/a | 0.000 | 0.000 | 1.201 | 202.285 | 0.019 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.118 | 0.071 | 0.000 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000091c | 203.198 | 0.029 | n/a | 0.000 | 0.000 | 1.715 | 201.261 | 0.010 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.081 | 0.029 | 0.000 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000333 | 201.375 | 0.026 | n/a | 0.000 | 0.000 | 0.514 | 200.711 | 0.003 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.061 | 0.026 | 0.000 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000091f | 201.356 | 0.037 | n/a | 0.000 | 0.000 | 0.633 | 200.551 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.101 | 0.037 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000091d | 201.342 | 0.027 | n/a | 0.000 | 0.000 | 0.528 | 200.678 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.066 | 0.027 | 0.000 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000091e | 201.164 | 0.042 | n/a | 0.000 | 0.000 | 0.408 | 200.602 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.075 | 0.042 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000922 | 97.811 | 15.937 | n/a | 2.570 | 0.000 | 6.127 | 72.593 | 0.003 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.579 | 18.507 | 0.189 | 0.579 | gw-r/thread-67/gateway.admitted-work | none observed |
| 86c7e5dd4a7a21bd0000000000000006 | 59.133 | 0.131 | n/a | 0.000 | 0.000 | 0.932 | 57.828 | 0.019 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.112 | 0.131 | 0.002 | 0.112 | gw-r/thread-53/journal/page | none observed |

## P3 / outside-phases / internal (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1005.171 | n/a | n/a | n/a | 0.208 | n/a | 0.000 | 0.000 | 2.509 | 1000.794 | 0.010 | 0.000 | 0.375 | 0.000 | n/a | n/a | 1.275 | 0.208 | 0.000 | 1.275 |
| p99 | 1005.171 | n/a | n/a | n/a | 0.208 | n/a | 0.000 | 0.000 | 2.509 | 1000.794 | 0.010 | 0.000 | 0.375 | 0.000 | n/a | n/a | 1.275 | 0.208 | 0.000 | 1.275 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf44000000000000000a4 | 1005.171 | 0.208 | n/a | 0.000 | 0.000 | 2.509 | 1000.794 | 0.010 | 0.000 | 0.375 | 0.000 | n/a | n/a | 1.275 | 0.208 | 0.000 | 1.275 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.574 | n/a | n/a | n/a | 2.421 | n/a | 0.000 | 0.000 | 0.642 | 20.431 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.069 | 2.421 | 0.109 | 0.069 |
| p99 | 64.569 | n/a | n/a | n/a | 5.841 | n/a | 0.000 | 0.000 | 4.180 | 61.306 | 0.116 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.385 | 5.841 | 0.433 | 0.385 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf4400000000000000233 | 1006.063 | 0.119 | n/a | 0.000 | 0.000 | 4.180 | 1000.523 | 0.014 | 0.000 | 0.019 | 0.000 | n/a | n/a | 1.209 | 0.119 | 0.000 | 1.209 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000000a5 | 92.523 | 20.722 | n/a | 0.000 | 0.000 | 2.784 | 68.606 | 0.006 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.336 | 20.722 | 0.224 | 0.336 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf44000000000000000b7 | 64.569 | 2.502 | n/a | 0.000 | 0.000 | 0.632 | 61.306 | 0.010 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.081 | 2.502 | 0.039 | 0.081 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf440000000000000010b | 44.918 | 4.954 | n/a | 0.000 | 0.000 | 0.530 | 24.089 | 0.008 | 15.156 | 0.016 | 0.000 | n/a | n/a | 0.167 | 4.954 | 0.110 | 0.167 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000000e2 | 39.334 | 3.934 | n/a | 0.000 | 0.000 | 2.551 | 32.640 | 0.012 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.091 | 3.934 | 0.100 | 0.091 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf44000000000000001f2 | 37.724 | 2.207 | n/a | 0.000 | 0.000 | 0.337 | 35.079 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.051 | 2.207 | 0.058 | 0.051 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf44000000000000000fb | 36.979 | 4.319 | n/a | 0.000 | 0.000 | 3.767 | 28.621 | 0.016 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.121 | 4.319 | 0.117 | 0.121 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf4400000000000000109 | 36.667 | 2.198 | n/a | 0.000 | 0.000 | 0.479 | 33.900 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.062 | 2.198 | 0.060 | 0.062 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf44000000000000001b9 | 36.176 | 2.392 | n/a | 0.000 | 0.000 | 0.792 | 17.735 | 0.003 | 15.178 | 0.010 | 0.000 | n/a | n/a | 0.065 | 2.392 | 0.066 | 0.065 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf4400000000000000221 | 34.796 | 4.149 | n/a | 0.000 | 0.000 | 0.712 | 29.790 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.097 | 4.149 | 0.119 | 0.097 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000214 | 33.957 | 2.102 | n/a | 0.000 | 0.000 | 0.412 | 31.353 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.050 | 2.102 | 0.062 | 0.050 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf44000000000000001df | 33.895 | 2.218 | n/a | 0.000 | 0.000 | 0.545 | 31.030 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.058 | 2.218 | 0.065 | 0.058 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf4400000000000000191 | 33.785 | 4.821 | n/a | 0.000 | 0.000 | 0.574 | 28.222 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.143 | 4.821 | 0.143 | 0.143 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf4400000000000000209 | 33.238 | 2.152 | n/a | 0.000 | 0.000 | 0.417 | 30.581 | 0.003 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.059 | 2.152 | 0.065 | 0.059 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf44000000000000000cf | 33.056 | 2.156 | n/a | 0.000 | 0.000 | 0.469 | 30.222 | 0.017 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.062 | 2.156 | 0.065 | 0.062 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000001c7 | 32.846 | 2.241 | n/a | 0.000 | 0.000 | 0.938 | 29.604 | 0.002 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.049 | 2.241 | 0.068 | 0.049 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf44000000000000001ea | 32.845 | 3.538 | n/a | 0.000 | 0.000 | 0.610 | 28.478 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.168 | 3.538 | 0.108 | 0.168 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf44000000000000000b0 | 32.780 | 2.770 | n/a | 0.000 | 0.000 | 0.902 | 28.803 | 0.013 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.163 | 2.770 | 0.084 | 0.163 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf44000000000000001cd | 32.551 | 3.565 | n/a | 0.000 | 0.000 | 0.332 | 28.516 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.123 | 3.565 | 0.110 | 0.123 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000000c4 | 32.369 | 2.319 | n/a | 0.000 | 0.000 | 0.542 | 29.284 | 0.022 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.072 | 2.319 | 0.072 | 0.072 | gw-r/thread-67/journal/page | none observed |

## P3 / idle-10 / internal (146 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.752 | n/a | n/a | n/a | 2.308 | n/a | 0.000 | 0.000 | 0.723 | 5.088 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.061 | 2.308 | 0.289 | 0.061 |
| p99 | 55.336 | n/a | n/a | n/a | 8.609 | n/a | 0.000 | 0.000 | 12.815 | 50.172 | 0.030 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.603 | 9.624 | 0.732 | 0.603 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf440000000000000035a | 1004.118 | 0.115 | n/a | 0.000 | 0.000 | 2.194 | 989.271 | 0.006 | 11.380 | 0.047 | 0.000 | n/a | n/a | 1.104 | 0.115 | 0.000 | 1.104 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf4400000000000000241 | 55.336 | 4.304 | n/a | 0.000 | 0.000 | 0.657 | 50.172 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.136 | 4.304 | 0.078 | 0.136 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf4400000000000000320 | 32.176 | 3.884 | n/a | 0.000 | 0.000 | 23.238 | 4.923 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.085 | 3.884 | 0.121 | 0.085 | node-14/thread-2/socket.wait-first-byte | none observed |
| ab00150af1dcf440000000000000035d | 25.157 | 2.487 | n/a | 0.000 | 0.000 | 0.345 | 22.241 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.048 | 2.487 | 0.099 | 0.048 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000269 | 20.935 | 4.389 | n/a | 0.000 | 0.000 | 2.325 | 14.080 | 0.003 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.119 | 4.389 | 0.210 | 0.119 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf440000000000000027e | 20.455 | 2.336 | n/a | 0.000 | 0.000 | 0.478 | 17.496 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.080 | 2.336 | 0.114 | 0.080 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf4400000000000000286 | 18.423 | 2.102 | n/a | 0.000 | 0.000 | 0.409 | 15.772 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.066 | 2.102 | 0.114 | 0.066 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf440000000000000033b | 18.182 | 4.756 | n/a | 0.000 | 0.000 | 0.833 | 12.449 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.099 | 4.756 | 0.262 | 0.099 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf440000000000000023e | 17.604 | 3.599 | n/a | 0.000 | 0.000 | 2.151 | 11.711 | 0.013 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.070 | 3.599 | 0.204 | 0.070 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf44000000000000002f6 | 17.327 | 2.678 | n/a | 0.000 | 0.000 | 0.643 | 13.909 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.056 | 2.678 | 0.155 | 0.056 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf4400000000000000296 | 16.833 | 4.164 | n/a | 0.000 | 0.000 | 0.544 | 12.011 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.088 | 4.164 | 0.247 | 0.088 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000334 | 16.580 | 2.470 | n/a | 0.000 | 0.000 | 2.130 | 11.872 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.060 | 2.470 | 0.149 | 0.060 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf440000000000000032c | 16.334 | 2.077 | n/a | 0.000 | 0.000 | 12.815 | 1.329 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.052 | 2.077 | 0.127 | 0.052 | node-14/thread-2/socket.wait-first-byte | none observed |
| ab00150af1dcf44000000000000002d6 | 16.175 | 2.100 | n/a | 0.000 | 0.000 | 0.378 | 13.619 | 0.006 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.047 | 2.100 | 0.130 | 0.047 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000258 | 15.918 | 2.230 | n/a | 0.000 | 0.000 | 0.521 | 13.072 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.064 | 2.230 | 0.140 | 0.064 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf44000000000000002ef | 15.748 | 2.187 | n/a | 0.000 | 0.000 | 0.893 | 12.571 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.051 | 2.187 | 0.139 | 0.051 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf44000000000000002fa | 15.633 | 2.539 | n/a | 0.000 | 0.000 | 1.482 | 11.535 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.054 | 2.539 | 0.162 | 0.054 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000243 | 15.532 | 8.609 | n/a | 1.789 | 0.000 | 1.388 | 3.111 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.603 | 10.398 | 0.669 | 0.603 | node-14/thread-2/replica.fetch-feed | none observed |
| ab00150af1dcf440000000000000025b | 15.391 | 2.077 | n/a | 0.000 | 0.000 | 2.446 | 10.735 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.063 | 2.077 | 0.135 | 0.063 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000002cc | 14.792 | 2.322 | n/a | 0.000 | 0.000 | 0.494 | 11.884 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.060 | 2.322 | 0.157 | 0.060 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-25 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.784 | n/a | n/a | n/a | 2.204 | n/a | 0.000 | 0.000 | 0.517 | 21.129 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.055 | 2.204 | 0.096 | 0.055 |
| p99 | 45.740 | n/a | n/a | n/a | 6.654 | n/a | 0.000 | 0.000 | 2.898 | 43.042 | 0.141 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.127 | 6.654 | 0.239 | 0.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf4400000000000000487 | 1002.326 | 0.140 | n/a | 0.000 | 0.000 | 0.440 | 1000.594 | 0.007 | 0.000 | 0.026 | 0.000 | n/a | n/a | 1.120 | 0.140 | 0.000 | 1.120 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf440000000000000048a | 45.740 | 1.885 | n/a | 0.000 | 0.000 | 0.749 | 43.042 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.051 | 1.885 | 0.041 | 0.051 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf44000000000000003ce | 34.556 | 2.309 | n/a | 0.000 | 0.000 | 0.285 | 31.875 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.056 | 2.309 | 0.067 | 0.056 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf44000000000000003f5 | 32.955 | 3.179 | n/a | 0.000 | 0.000 | 0.630 | 29.071 | 0.002 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.059 | 3.179 | 0.096 | 0.059 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf4400000000000000484 | 32.368 | 2.047 | n/a | 0.000 | 0.000 | 0.496 | 29.750 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.056 | 2.047 | 0.063 | 0.056 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000412 | 31.972 | 3.251 | n/a | 0.000 | 0.000 | 1.055 | 27.599 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.054 | 3.251 | 0.102 | 0.054 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf44000000000000003d4 | 31.782 | 2.037 | n/a | 0.000 | 0.000 | 0.409 | 29.252 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.050 | 2.037 | 0.064 | 0.050 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf440000000000000045b | 31.162 | 2.337 | n/a | 0.000 | 0.000 | 0.812 | 27.909 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.087 | 2.337 | 0.075 | 0.087 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf440000000000000044a | 31.147 | 3.114 | n/a | 0.000 | 0.000 | 0.557 | 27.327 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.101 | 3.114 | 0.100 | 0.101 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf4400000000000000431 | 30.603 | 2.040 | n/a | 0.000 | 0.000 | 0.301 | 28.194 | 0.002 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.050 | 2.040 | 0.067 | 0.050 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf440000000000000041e | 30.501 | 4.064 | n/a | 0.000 | 0.000 | 0.462 | 25.853 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.092 | 4.064 | 0.133 | 0.092 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf4400000000000000416 | 30.366 | 4.116 | n/a | 0.000 | 0.000 | 2.170 | 23.980 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.085 | 4.116 | 0.136 | 0.085 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf4400000000000000461 | 30.267 | 7.724 | n/a | 0.000 | 0.000 | 0.526 | 21.890 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.081 | 7.724 | 0.255 | 0.081 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf4400000000000000472 | 30.156 | 3.250 | n/a | 0.000 | 0.000 | 0.835 | 25.959 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.059 | 3.250 | 0.108 | 0.059 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf44000000000000003ca | 30.017 | 2.033 | n/a | 0.000 | 0.000 | 0.367 | 27.528 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.052 | 2.033 | 0.068 | 0.052 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf440000000000000043f | 30.012 | 4.517 | n/a | 0.000 | 0.000 | 0.679 | 24.669 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.127 | 4.517 | 0.151 | 0.127 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf44000000000000003ae | 29.478 | 4.216 | n/a | 0.000 | 0.000 | 0.483 | 24.621 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.107 | 4.216 | 0.143 | 0.107 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf4400000000000000380 | 29.375 | 2.435 | n/a | 0.000 | 0.000 | 2.454 | 24.397 | 0.009 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.052 | 2.435 | 0.083 | 0.052 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000466 | 29.066 | 4.563 | n/a | 0.000 | 0.000 | 1.457 | 22.932 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.084 | 4.563 | 0.157 | 0.084 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf440000000000000043b | 29.060 | 3.428 | n/a | 0.000 | 0.000 | 0.474 | 25.047 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.054 | 3.428 | 0.118 | 0.054 | gw-r/thread-46/journal/page | none observed |

## P3 / idle-50 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.831 | n/a | n/a | n/a | 2.151 | n/a | 0.000 | 0.000 | 0.500 | 46.628 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.058 | 2.151 | 0.044 | 0.058 |
| p99 | 99.618 | n/a | n/a | n/a | 4.537 | n/a | 0.000 | 0.000 | 2.798 | 95.910 | 0.076 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.157 | 4.537 | 0.091 | 0.157 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf44000000000000005b3 | 1002.934 | 0.093 | n/a | 0.000 | 0.000 | 0.636 | 1001.034 | 0.007 | 0.000 | 0.070 | 0.000 | n/a | n/a | 1.095 | 0.093 | 0.000 | 1.095 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf44000000000000005b6 | 99.618 | 3.249 | n/a | 0.000 | 0.000 | 0.377 | 95.910 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.059 | 3.249 | 0.033 | 0.059 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf440000000000000054a | 68.327 | 2.652 | n/a | 0.000 | 0.000 | 0.458 | 52.115 | 0.007 | 12.989 | 0.046 | 0.000 | n/a | n/a | 0.059 | 2.652 | 0.039 | 0.059 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf4400000000000000538 | 58.545 | 2.272 | n/a | 0.000 | 0.000 | 0.356 | 55.829 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.049 | 2.272 | 0.039 | 0.049 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf44000000000000004ad | 58.127 | 2.296 | n/a | 0.000 | 0.000 | 0.384 | 55.331 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.063 | 2.296 | 0.040 | 0.063 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf44000000000000004e6 | 57.829 | 2.448 | n/a | 0.000 | 0.000 | 0.694 | 54.598 | 0.002 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.058 | 2.448 | 0.042 | 0.058 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf440000000000000052d | 57.439 | 3.409 | n/a | 0.000 | 0.000 | 0.601 | 53.294 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.098 | 3.409 | 0.059 | 0.098 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf440000000000000048b | 57.176 | 3.685 | n/a | 0.000 | 0.000 | 0.576 | 52.719 | 0.018 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.126 | 3.685 | 0.064 | 0.126 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf440000000000000053f | 56.970 | 4.457 | n/a | 0.000 | 0.000 | 0.471 | 51.915 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.102 | 4.457 | 0.078 | 0.102 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000505 | 55.922 | 1.909 | n/a | 0.000 | 0.000 | 0.345 | 53.550 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.064 | 1.909 | 0.034 | 0.064 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf44000000000000004f7 | 55.705 | 4.060 | n/a | 0.000 | 0.000 | 0.505 | 51.010 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.097 | 4.060 | 0.073 | 0.097 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf4400000000000000521 | 55.307 | 4.131 | n/a | 0.000 | 0.000 | 0.563 | 50.481 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.098 | 4.131 | 0.075 | 0.098 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf44000000000000004d7 | 54.480 | 4.671 | n/a | 0.000 | 0.000 | 0.516 | 49.119 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.120 | 4.671 | 0.086 | 0.120 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000491 | 54.429 | 4.494 | n/a | 0.000 | 0.000 | 0.587 | 49.258 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.056 | 4.494 | 0.083 | 0.056 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000559 | 54.361 | 1.978 | n/a | 0.000 | 0.000 | 0.423 | 51.855 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.062 | 1.978 | 0.036 | 0.062 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf440000000000000054d | 54.165 | 2.043 | n/a | 0.000 | 0.000 | 1.436 | 50.585 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.060 | 2.043 | 0.038 | 0.060 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000577 | 54.007 | 2.193 | n/a | 0.000 | 0.000 | 0.423 | 51.291 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.065 | 2.193 | 0.041 | 0.065 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf44000000000000004f1 | 53.862 | 1.868 | n/a | 0.000 | 0.000 | 0.276 | 51.588 | 0.076 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.046 | 1.868 | 0.035 | 0.046 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000527 | 53.756 | 1.978 | n/a | 0.000 | 0.000 | 0.576 | 51.108 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.054 | 1.978 | 0.037 | 0.054 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf440000000000000059b | 53.738 | 4.537 | n/a | 0.000 | 0.000 | 0.655 | 48.455 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.058 | 4.537 | 0.084 | 0.058 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-100 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 100.130 | n/a | n/a | n/a | 2.252 | n/a | 0.000 | 0.000 | 0.569 | 96.580 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.061 | 2.252 | 0.022 | 0.061 |
| p99 | 246.806 | n/a | n/a | n/a | 4.501 | n/a | 0.000 | 0.000 | 2.265 | 244.170 | 0.135 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.135 | 4.501 | 0.044 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf44000000000000006e0 | 1002.744 | 0.154 | n/a | 0.000 | 0.000 | 0.639 | 1000.787 | 0.004 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.108 | 0.154 | 0.000 | 1.108 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf44000000000000006e3 | 246.806 | 2.063 | n/a | 0.000 | 0.000 | 0.481 | 244.170 | 0.003 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.063 | 2.063 | 0.008 | 0.063 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf44000000000000005dd | 147.179 | 2.252 | n/a | 0.000 | 0.000 | 0.318 | 144.532 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.061 | 2.252 | 0.015 | 0.061 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000623 | 109.529 | 4.034 | n/a | 0.000 | 0.000 | 0.586 | 104.780 | 0.002 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.104 | 4.034 | 0.037 | 0.104 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000005e8 | 106.829 | 2.114 | n/a | 0.000 | 0.000 | 0.552 | 104.049 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.056 | 2.114 | 0.020 | 0.056 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000006b8 | 106.390 | 3.396 | n/a | 0.000 | 0.000 | 0.309 | 102.542 | 0.003 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.115 | 3.396 | 0.032 | 0.115 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf4400000000000000660 | 106.229 | 4.493 | n/a | 0.000 | 0.000 | 0.728 | 100.888 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.063 | 4.493 | 0.042 | 0.063 | gw-r/thread-52/journal/page | none observed |
| ab00150af1dcf4400000000000000674 | 106.005 | 3.969 | n/a | 0.000 | 0.000 | 0.312 | 101.564 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.102 | 3.969 | 0.037 | 0.102 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf4400000000000000681 | 105.453 | 2.740 | n/a | 0.000 | 0.000 | 0.699 | 101.896 | 0.003 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.071 | 2.740 | 0.026 | 0.071 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf440000000000000060c | 105.391 | 2.819 | n/a | 0.000 | 0.000 | 0.624 | 101.829 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.061 | 2.819 | 0.027 | 0.061 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf44000000000000006c6 | 105.343 | 2.439 | n/a | 0.000 | 0.000 | 0.735 | 102.050 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.061 | 2.439 | 0.023 | 0.061 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf44000000000000006b0 | 105.292 | 2.006 | n/a | 0.000 | 0.000 | 0.480 | 102.698 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.071 | 2.006 | 0.019 | 0.071 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf440000000000000062c | 104.487 | 2.475 | n/a | 0.000 | 0.000 | 0.744 | 101.184 | 0.002 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.058 | 2.475 | 0.024 | 0.058 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000006c3 | 104.406 | 3.849 | n/a | 0.000 | 0.000 | 1.180 | 99.226 | 0.004 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.099 | 3.849 | 0.037 | 0.099 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf44000000000000005fd | 104.264 | 4.444 | n/a | 0.000 | 0.000 | 0.520 | 99.150 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.113 | 4.444 | 0.043 | 0.113 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf4400000000000000652 | 104.251 | 2.303 | n/a | 0.000 | 0.000 | 0.536 | 101.294 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.055 | 2.303 | 0.022 | 0.055 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf440000000000000063a | 104.242 | 4.168 | n/a | 0.000 | 0.000 | 0.654 | 99.254 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.129 | 4.168 | 0.040 | 0.129 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000684 | 104.163 | 3.973 | n/a | 0.000 | 0.000 | 3.367 | 96.705 | 0.002 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.065 | 3.973 | 0.038 | 0.065 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf44000000000000005d1 | 104.110 | 4.437 | n/a | 0.000 | 0.000 | 0.552 | 98.969 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.110 | 4.437 | 0.043 | 0.110 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000006d4 | 104.025 | 2.103 | n/a | 0.000 | 0.000 | 0.366 | 101.448 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.054 | 2.103 | 0.020 | 0.054 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-250 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 249.748 | n/a | n/a | n/a | 2.215 | n/a | 0.000 | 0.000 | 0.569 | 246.421 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.067 | 2.215 | 0.009 | 0.067 |
| p99 | 497.691 | n/a | n/a | n/a | 5.076 | n/a | 0.000 | 0.000 | 2.318 | 492.671 | 0.025 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.180 | 5.076 | 0.019 | 0.180 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf440000000000000080e | 1003.371 | 0.131 | n/a | 0.000 | 0.000 | 0.569 | 1001.476 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.116 | 0.131 | 0.000 | 1.116 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf4400000000000000811 | 497.691 | 4.332 | n/a | 0.000 | 0.000 | 0.502 | 492.671 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.153 | 4.332 | 0.009 | 0.153 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf44000000000000006eb | 262.022 | 5.076 | n/a | 0.000 | 0.000 | 0.523 | 256.188 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.173 | 5.076 | 0.019 | 0.173 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf44000000000000007c8 | 261.375 | 2.529 | n/a | 0.000 | 0.000 | 0.636 | 258.096 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.066 | 2.529 | 0.010 | 0.066 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf44000000000000007dc | 260.283 | 4.614 | n/a | 0.000 | 0.000 | 0.526 | 254.939 | 0.025 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.130 | 4.614 | 0.018 | 0.130 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf4400000000000000758 | 258.917 | 4.429 | n/a | 0.000 | 0.000 | 0.606 | 253.715 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.129 | 4.429 | 0.017 | 0.129 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf44000000000000007a3 | 256.852 | 3.595 | n/a | 0.000 | 0.000 | 0.911 | 252.221 | 0.010 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.068 | 3.595 | 0.014 | 0.068 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000709 | 256.780 | 4.905 | n/a | 0.000 | 0.000 | 0.796 | 250.955 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.086 | 4.905 | 0.019 | 0.086 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf4400000000000000730 | 256.045 | 4.565 | n/a | 0.000 | 0.000 | 0.502 | 250.843 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.073 | 4.565 | 0.018 | 0.073 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf4400000000000000753 | 255.942 | 2.002 | n/a | 0.000 | 0.000 | 2.904 | 250.915 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.059 | 2.002 | 0.008 | 0.059 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf44000000000000007fd | 255.509 | 2.296 | n/a | 0.000 | 0.000 | 0.371 | 252.737 | 0.008 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.059 | 2.296 | 0.009 | 0.059 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000007e5 | 255.467 | 2.327 | n/a | 0.000 | 0.000 | 0.586 | 252.435 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.067 | 2.327 | 0.009 | 0.067 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf4400000000000000795 | 255.350 | 2.587 | n/a | 0.000 | 0.000 | 2.318 | 250.352 | 0.003 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.068 | 2.587 | 0.010 | 0.068 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf44000000000000006f2 | 255.046 | 2.053 | n/a | 0.000 | 0.000 | 0.532 | 252.347 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.057 | 2.053 | 0.008 | 0.057 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf44000000000000006e5 | 254.757 | 1.996 | n/a | 0.000 | 0.000 | 0.332 | 252.320 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.056 | 1.996 | 0.008 | 0.056 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf4400000000000000711 | 254.722 | 2.300 | n/a | 0.000 | 0.000 | 0.553 | 251.629 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.180 | 2.300 | 0.009 | 0.180 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000749 | 254.703 | 4.780 | n/a | 0.000 | 0.000 | 0.659 | 249.075 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.145 | 4.780 | 0.019 | 0.145 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf44000000000000007b3 | 254.667 | 4.229 | n/a | 0.000 | 0.000 | 0.704 | 249.600 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.111 | 4.229 | 0.017 | 0.111 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf44000000000000007bb | 254.485 | 2.171 | n/a | 0.000 | 0.000 | 0.504 | 251.685 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.082 | 2.171 | 0.009 | 0.082 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf440000000000000076d | 254.421 | 2.214 | n/a | 0.000 | 0.000 | 0.572 | 251.503 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.066 | 2.214 | 0.009 | 0.066 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-500 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 499.661 | n/a | n/a | n/a | 2.978 | n/a | 0.000 | 0.000 | 0.611 | 495.241 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.077 | 3.397 | 0.007 | 0.077 |
| p99 | 998.735 | n/a | n/a | n/a | 6.595 | n/a | 0.983 | 0.000 | 4.219 | 995.250 | 0.021 | 0.000 | 0.091 | 0.000 | n/a | n/a | 1.103 | 7.573 | 0.015 | 1.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf440000000000000093a | 1005.163 | 0.124 | n/a | 0.000 | 0.000 | 3.084 | 1000.806 | 0.009 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.103 | 0.124 | 0.000 | 1.103 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf440000000000000093d | 998.735 | 2.738 | n/a | 0.000 | 0.000 | 0.620 | 995.250 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.070 | 2.738 | 0.003 | 0.070 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf440000000000000083b | 520.996 | 2.114 | n/a | 0.000 | 0.000 | 0.490 | 518.314 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.060 | 2.114 | 0.004 | 0.060 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf440000000000000088a | 512.296 | 3.805 | n/a | 0.687 | 0.000 | 0.686 | 507.016 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.066 | 4.492 | 0.009 | 0.066 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000937 | 511.107 | 3.545 | n/a | 0.000 | 0.000 | 0.720 | 506.738 | 0.006 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.075 | 3.545 | 0.007 | 0.075 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf44000000000000008a1 | 510.289 | 4.187 | n/a | 0.752 | 0.000 | 2.634 | 502.557 | 0.013 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.117 | 4.939 | 0.010 | 0.117 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf440000000000000081e | 508.542 | 2.011 | n/a | 0.000 | 0.000 | 0.452 | 506.005 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.061 | 2.011 | 0.004 | 0.061 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf4400000000000000912 | 507.515 | 4.496 | n/a | 0.000 | 0.000 | 2.230 | 500.678 | 0.007 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.067 | 4.496 | 0.009 | 0.067 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf44000000000000008b7 | 506.458 | 6.426 | n/a | 0.948 | 0.000 | 0.613 | 498.231 | 0.010 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.175 | 7.374 | 0.015 | 0.175 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf44000000000000008b1 | 506.448 | 2.748 | n/a | 0.000 | 0.000 | 0.460 | 503.121 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.078 | 2.748 | 0.005 | 0.078 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf4400000000000000843 | 506.146 | 3.598 | n/a | 0.000 | 0.000 | 0.679 | 501.735 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.105 | 3.598 | 0.007 | 0.105 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf4400000000000000880 | 506.052 | 6.595 | n/a | 0.977 | 0.000 | 1.573 | 496.719 | 0.009 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.112 | 7.573 | 0.015 | 0.112 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf4400000000000000862 | 505.881 | 2.162 | n/a | 0.000 | 0.000 | 0.397 | 503.177 | 0.009 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.088 | 2.162 | 0.004 | 0.088 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf440000000000000088e | 505.612 | 6.110 | n/a | 0.818 | 0.000 | 0.402 | 498.098 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.146 | 6.927 | 0.014 | 0.146 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf440000000000000089b | 505.515 | 2.859 | n/a | 0.742 | 0.000 | 0.411 | 501.398 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.063 | 3.600 | 0.007 | 0.063 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf4400000000000000916 | 505.205 | 5.420 | n/a | 0.000 | 0.000 | 0.631 | 499.022 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.101 | 5.420 | 0.011 | 0.101 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf44000000000000008de | 505.043 | 5.060 | n/a | 0.983 | 0.000 | 1.068 | 497.735 | 0.011 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.157 | 6.043 | 0.012 | 0.157 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf440000000000000090a | 504.574 | 4.777 | n/a | 0.000 | 0.000 | 0.635 | 498.987 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.113 | 4.777 | 0.009 | 0.113 | gw-r/thread-51/journal/page | none observed |
| ab00150af1dcf440000000000000092b | 504.532 | 2.257 | n/a | 0.000 | 0.000 | 0.500 | 501.680 | 0.008 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.065 | 2.257 | 0.004 | 0.065 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf44000000000000008c0 | 504.474 | 3.099 | n/a | 0.000 | 0.000 | 0.441 | 500.828 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.065 | 3.099 | 0.006 | 0.065 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-1000 / internal (158 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 999.550 | n/a | n/a | n/a | 3.121 | n/a | 0.000 | 0.000 | 0.630 | 994.892 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.082 | 3.360 | 0.003 | 0.082 |
| p99 | 1026.366 | n/a | n/a | n/a | 7.040 | n/a | 1.166 | 0.000 | 3.628 | 1002.806 | 0.018 | 18.487 | 0.093 | 0.000 | n/a | n/a | 1.161 | 7.664 | 0.653 | 1.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab00150af1dcf4400000000000000977 | 1035.291 | 3.620 | n/a | 0.524 | 0.000 | 2.632 | 999.730 | 0.007 | 28.668 | 0.033 | 0.000 | n/a | n/a | 0.076 | 4.144 | 0.004 | 0.076 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000a56 | 1026.366 | 5.498 | n/a | 0.000 | 0.000 | 0.524 | 1001.720 | 0.004 | 18.487 | 0.024 | 0.000 | n/a | n/a | 0.110 | 5.498 | 0.005 | 0.110 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000a05 | 1010.002 | 6.085 | n/a | 0.000 | 0.000 | 0.894 | 1002.826 | 0.010 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.132 | 6.085 | 0.006 | 0.132 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf44000000000000009d7 | 1008.229 | 6.339 | n/a | 0.000 | 0.000 | 0.862 | 1000.849 | 0.006 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.148 | 6.339 | 0.006 | 0.148 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf44000000000000009aa | 1007.794 | 5.537 | n/a | 0.787 | 0.000 | 0.786 | 1000.508 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.144 | 6.324 | 0.006 | 0.144 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000009fd | 1006.537 | 2.564 | n/a | 0.599 | 0.000 | 0.438 | 1002.806 | 0.011 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.065 | 3.163 | 0.003 | 0.065 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf44000000000000009ba | 1005.669 | 2.848 | n/a | 0.000 | 0.000 | 1.137 | 1001.551 | 0.016 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.070 | 2.848 | 0.003 | 0.070 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf440000000000000099b | 1005.427 | 3.985 | n/a | 0.573 | 0.000 | 0.618 | 1000.149 | 0.007 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.064 | 4.558 | 0.005 | 0.064 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf4400000000000000a0b | 1005.363 | 5.916 | n/a | 0.000 | 0.000 | 0.734 | 998.538 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.138 | 5.916 | 0.006 | 0.138 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000a5c | 1005.140 | 2.884 | n/a | 0.000 | 0.000 | 0.611 | 1001.451 | 0.019 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.146 | 2.884 | 0.003 | 0.146 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000a13 | 1005.069 | 7.818 | n/a | 0.853 | 0.000 | 0.610 | 995.598 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.160 | 8.671 | 0.009 | 0.160 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf4400000000000000945 | 1005.009 | 5.571 | n/a | 0.000 | 0.000 | 0.994 | 998.282 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.122 | 5.571 | 0.006 | 0.122 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf44000000000000009a3 | 1004.719 | 3.197 | n/a | 0.582 | 0.000 | 0.996 | 999.768 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.140 | 3.779 | 0.004 | 0.140 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf4400000000000000a44 | 1003.999 | 5.933 | n/a | 1.265 | 0.000 | 2.185 | 994.387 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.202 | 7.198 | 0.007 | 0.202 | gw-r/thread-46/journal/page | none observed |
| ab00150af1dcf4400000000000000959 | 1003.726 | 0.121 | n/a | 0.000 | 0.000 | 1.718 | 1000.714 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.115 | 0.121 | 0.000 | 1.115 | gw-r/thread-48/journal/page | none observed |
| ab00150af1dcf44000000000000009cc | 1003.670 | 2.717 | n/a | 0.000 | 0.000 | 0.704 | 1000.137 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.063 | 2.717 | 0.003 | 0.063 | gw-r/thread-53/journal/page | none observed |
| ab00150af1dcf4400000000000000a21 | 1003.604 | 3.360 | n/a | 0.000 | 0.000 | 2.068 | 998.077 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.063 | 3.360 | 0.003 | 0.063 | gw-r/thread-49/journal/page | none observed |
| ab00150af1dcf44000000000000009f7 | 1003.458 | 2.935 | n/a | 0.000 | 0.000 | 0.622 | 999.749 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.099 | 2.935 | 0.003 | 0.099 | gw-r/thread-50/journal/page | none observed |
| ab00150af1dcf44000000000000009ce | 1003.375 | 0.209 | n/a | 0.000 | 0.000 | 0.757 | 1001.135 | 0.010 | 0.000 | 0.104 | 0.000 | n/a | n/a | 1.161 | 0.209 | 0.000 | 1.161 | gw-r/thread-67/journal/page | none observed |
| ab00150af1dcf44000000000000009ae | 1003.174 | 3.247 | n/a | 0.000 | 0.000 | 0.829 | 998.990 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.073 | 3.247 | 0.003 | 0.073 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.582 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.654 | 200.695 | 0.007 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.103 | 0.043 | 0.000 | 0.103 |
| p99 | 204.193 | n/a | n/a | n/a | 0.065 | n/a | 0.000 | 0.000 | 3.093 | 201.200 | 0.050 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.129 | 0.065 | 0.001 | 0.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 86c7e5dd4a7a21bd00000000000000cd | 204.193 | 0.047 | n/a | 0.000 | 0.000 | 3.093 | 200.854 | 0.007 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.119 | 0.047 | 0.000 | 0.119 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000000cf | 202.547 | 0.043 | n/a | 0.000 | 0.000 | 1.327 | 200.960 | 0.007 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.129 | 0.043 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000000d0 | 202.351 | 0.033 | n/a | 0.000 | 0.000 | 0.865 | 201.200 | 0.016 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.103 | 0.033 | 0.000 | 0.103 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000000ce | 201.582 | 0.044 | n/a | 0.000 | 0.000 | 0.654 | 200.695 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.123 | 0.044 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000000d1 | 132.885 | 0.042 | n/a | 0.000 | 0.000 | 0.546 | 132.136 | 0.010 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.076 | 0.042 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000000f | 66.886 | 0.065 | n/a | 0.000 | 0.000 | 0.613 | 65.956 | 0.050 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.098 | 0.065 | 0.001 | 0.098 | gw-r/thread-53/journal/page | none observed |

## P3 / idle-10 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.410 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.913 | 201.380 | 0.009 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.097 | 0.040 | 0.000 | 0.097 |
| p99 | 205.705 | n/a | n/a | n/a | 0.072 | n/a | 0.000 | 0.000 | 1.739 | 203.710 | 0.039 | 11.380 | 0.110 | 0.000 | n/a | n/a | 0.112 | 0.072 | 0.001 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 86c7e5dd4a7a21bd0000000000000161 | 205.705 | 0.040 | n/a | 0.000 | 0.000 | 1.739 | 203.710 | 0.009 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.097 | 0.040 | 0.000 | 0.097 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000162 | 202.745 | 0.040 | n/a | 0.000 | 0.000 | 1.122 | 201.405 | 0.009 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.084 | 0.040 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000015f | 202.410 | 0.044 | n/a | 0.000 | 0.000 | 0.906 | 189.860 | 0.039 | 11.380 | 0.080 | 0.000 | n/a | n/a | 0.101 | 0.044 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000160 | 202.210 | 0.032 | n/a | 0.000 | 0.000 | 0.616 | 201.380 | 0.012 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000163 | 114.146 | 0.072 | n/a | 0.000 | 0.000 | 0.913 | 113.020 | 0.003 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.112 | 0.072 | 0.001 | 0.112 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-25 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.818 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.857 | 201.114 | 0.009 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.081 | 0.047 | 0.000 | 0.081 |
| p99 | 203.060 | n/a | n/a | n/a | 0.076 | n/a | 0.000 | 0.000 | 1.093 | 201.895 | 0.013 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.189 | 0.076 | 0.000 | 0.189 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 86c7e5dd4a7a21bd00000000000001fc | 203.060 | 0.047 | n/a | 0.000 | 0.000 | 0.857 | 201.895 | 0.013 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.101 | 0.047 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000001fb | 202.572 | 0.076 | n/a | 0.000 | 0.000 | 1.093 | 201.114 | 0.008 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.189 | 0.076 | 0.000 | 0.189 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000001fa | 201.818 | 0.031 | n/a | 0.000 | 0.000 | 0.477 | 201.150 | 0.010 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000001f9 | 201.271 | 0.037 | n/a | 0.000 | 0.000 | 0.438 | 200.665 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000001fd | 129.711 | 0.060 | n/a | 0.000 | 0.000 | 0.864 | 128.637 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.081 | 0.060 | 0.000 | 0.081 | gw-r/thread-46/journal/page | none observed |

## P3 / idle-50 / read (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.102 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.511 | 50.454 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.065 | 0.042 | 0.001 | 0.065 |
| p99 | 201.906 | n/a | n/a | n/a | 0.082 | n/a | 0.000 | 0.000 | 2.687 | 201.099 | 4.306 | 12.989 | 0.085 | 0.000 | n/a | n/a | 0.125 | 0.082 | 0.002 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 86c7e5dd4a7a21bd0000000000000296 | 201.906 | 0.029 | n/a | 0.000 | 0.000 | 0.821 | 200.921 | 0.004 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000295 | 201.809 | 0.036 | n/a | 0.000 | 0.000 | 0.565 | 201.062 | 0.006 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000293 | 201.745 | 0.039 | n/a | 0.000 | 0.000 | 0.441 | 201.099 | 0.008 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.076 | 0.039 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000294 | 201.717 | 0.040 | n/a | 0.000 | 0.000 | 0.554 | 200.942 | 0.005 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.091 | 0.040 | 0.000 | 0.091 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000297 | 157.781 | 0.078 | n/a | 0.000 | 0.000 | 0.817 | 156.702 | 0.003 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.125 | 0.078 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000298 | 96.526 | 0.064 | n/a | 0.000 | 0.000 | 0.514 | 95.811 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.083 | 0.064 | 0.001 | 0.083 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000025e | 64.454 | 0.041 | n/a | 0.000 | 0.000 | 0.612 | 50.745 | 0.004 | 12.989 | 0.012 | 0.000 | n/a | n/a | 0.050 | 0.041 | 0.001 | 0.050 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000255 | 55.849 | 0.050 | n/a | 0.000 | 0.000 | 0.440 | 55.288 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.061 | 0.050 | 0.001 | 0.061 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000022c | 54.512 | 0.055 | n/a | 0.000 | 0.000 | 1.920 | 52.422 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.069 | 0.055 | 0.001 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000250 | 53.580 | 0.074 | n/a | 0.000 | 0.000 | 0.409 | 53.004 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.082 | 0.074 | 0.001 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000210 | 53.537 | 0.059 | n/a | 0.000 | 0.000 | 0.446 | 52.918 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.091 | 0.059 | 0.001 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000232 | 53.296 | 0.035 | n/a | 0.000 | 0.000 | 0.380 | 52.802 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.044 | 0.035 | 0.001 | 0.044 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000259 | 52.669 | 0.040 | n/a | 0.000 | 0.000 | 0.524 | 52.000 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.045 | 0.040 | 0.001 | 0.045 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000026e | 52.399 | 0.041 | n/a | 0.000 | 0.000 | 0.402 | 51.866 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.058 | 0.041 | 0.001 | 0.058 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000001ff | 51.818 | 0.040 | n/a | 0.000 | 0.000 | 0.567 | 46.811 | 4.306 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.052 | 0.040 | 0.001 | 0.052 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000206 | 51.688 | 0.060 | n/a | 0.000 | 0.000 | 0.642 | 50.855 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.087 | 0.060 | 0.001 | 0.087 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000023e | 51.102 | 0.064 | n/a | 0.000 | 0.000 | 0.432 | 50.454 | 0.017 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.101 | 0.064 | 0.001 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000275 | 51.060 | 0.039 | n/a | 0.000 | 0.000 | 0.321 | 50.637 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.051 | 0.039 | 0.001 | 0.051 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000027e | 50.846 | 0.037 | n/a | 0.000 | 0.000 | 0.438 | 50.283 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.050 | 0.037 | 0.001 | 0.050 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000024d | 50.522 | 0.042 | n/a | 0.000 | 0.000 | 0.320 | 49.289 | 0.810 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.052 | 0.042 | 0.001 | 0.052 | gw-r/thread-53/journal/page | none observed |

## P3 / idle-100 / read (152 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.700 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 0.578 | 95.945 | 0.003 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.062 | 0.045 | 0.000 | 0.062 |
| p99 | 201.917 | n/a | n/a | n/a | 0.083 | n/a | 0.000 | 0.000 | 3.267 | 200.890 | 1.144 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.122 | 0.083 | 0.001 | 0.122 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 86c7e5dd4a7a21bd000000000000032f | 201.928 | 0.054 | n/a | 0.000 | 0.000 | 0.790 | 200.890 | 0.005 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.116 | 0.054 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000032e | 201.917 | 0.041 | n/a | 0.000 | 0.000 | 0.733 | 200.984 | 0.004 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.090 | 0.041 | 0.000 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000032d | 201.732 | 0.034 | n/a | 0.000 | 0.000 | 0.980 | 200.598 | 0.003 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.063 | 0.034 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000330 | 201.721 | 0.057 | n/a | 0.000 | 0.000 | 0.885 | 200.619 | 0.003 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.119 | 0.057 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000331 | 201.599 | 0.043 | n/a | 0.000 | 0.000 | 0.670 | 200.701 | 0.003 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.141 | 0.043 | 0.000 | 0.141 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000002ab | 145.883 | 0.061 | n/a | 0.000 | 0.000 | 0.607 | 145.083 | 0.003 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.089 | 0.061 | 0.000 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000002ce | 106.424 | 0.057 | n/a | 0.000 | 0.000 | 0.744 | 105.502 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.071 | 0.057 | 0.001 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000002b1 | 103.833 | 0.069 | n/a | 0.000 | 0.000 | 0.502 | 103.127 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.099 | 0.069 | 0.001 | 0.099 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000319 | 103.769 | 0.062 | n/a | 0.000 | 0.000 | 0.595 | 103.010 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.083 | 0.062 | 0.001 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000320 | 102.567 | 0.039 | n/a | 0.000 | 0.000 | 0.310 | 101.010 | 1.144 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.051 | 0.039 | 0.000 | 0.051 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000002f7 | 102.513 | 0.040 | n/a | 0.000 | 0.000 | 0.952 | 101.448 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.047 | 0.040 | 0.000 | 0.047 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000315 | 101.896 | 0.074 | n/a | 0.000 | 0.000 | 0.620 | 101.087 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.101 | 0.074 | 0.001 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000002e4 | 101.760 | 0.066 | n/a | 0.000 | 0.000 | 0.717 | 100.835 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.091 | 0.066 | 0.001 | 0.091 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000002c9 | 101.717 | 0.036 | n/a | 0.000 | 0.000 | 0.430 | 101.147 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.047 | 0.036 | 0.000 | 0.047 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000002e6 | 101.026 | 0.040 | n/a | 0.000 | 0.000 | 0.655 | 100.222 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.052 | 0.040 | 0.000 | 0.052 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000327 | 101.021 | 0.040 | n/a | 0.000 | 0.000 | 0.961 | 98.681 | 1.277 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.049 | 0.040 | 0.000 | 0.049 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000030a | 101.019 | 0.039 | n/a | 0.000 | 0.000 | 0.404 | 100.482 | 0.013 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.048 | 0.039 | 0.000 | 0.048 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000308 | 100.888 | 0.064 | n/a | 0.000 | 0.000 | 0.716 | 99.974 | 0.003 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.093 | 0.064 | 0.001 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000002b0 | 100.867 | 0.044 | n/a | 0.000 | 0.000 | 0.412 | 100.308 | 0.003 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.071 | 0.044 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000002c3 | 100.774 | 0.057 | n/a | 0.000 | 0.000 | 0.616 | 99.991 | 0.008 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.071 | 0.057 | 0.001 | 0.071 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-250 / read (156 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.417 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.502 | 200.682 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 |
| p99 | 204.876 | n/a | n/a | n/a | 0.066 | n/a | 0.000 | 0.000 | 2.583 | 204.070 | 0.026 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.143 | 0.066 | 0.000 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 86c7e5dd4a7a21bd00000000000003bf | 205.375 | 0.032 | n/a | 0.000 | 0.000 | 0.918 | 204.305 | 0.004 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.062 | 0.032 | 0.000 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000003b5 | 204.876 | 0.037 | n/a | 0.000 | 0.000 | 0.635 | 204.070 | 0.004 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000037d | 204.556 | 0.031 | n/a | 0.000 | 0.000 | 1.556 | 202.890 | 0.003 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.058 | 0.031 | 0.000 | 0.058 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000003cb | 203.901 | 0.036 | n/a | 0.000 | 0.000 | 2.583 | 201.113 | 0.008 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000003af | 203.814 | 0.030 | n/a | 0.000 | 0.000 | 2.912 | 200.769 | 0.003 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.056 | 0.030 | 0.000 | 0.056 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000359 | 203.649 | 0.035 | n/a | 0.000 | 0.000 | 0.364 | 203.087 | 0.007 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.063 | 0.035 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000003ef | 203.221 | 0.034 | n/a | 0.000 | 0.000 | 2.086 | 200.959 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.061 | 0.034 | 0.000 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000041d | 203.063 | 0.043 | n/a | 0.000 | 0.000 | 1.627 | 201.205 | 0.026 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.069 | 0.043 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000003e5 | 202.745 | 0.038 | n/a | 0.000 | 0.000 | 1.981 | 200.604 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.070 | 0.038 | 0.000 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000347 | 202.501 | 0.031 | n/a | 0.000 | 0.000 | 1.277 | 201.059 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.060 | 0.031 | 0.000 | 0.060 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000003f3 | 202.381 | 0.053 | n/a | 0.000 | 0.000 | 1.439 | 200.724 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.109 | 0.053 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000003d1 | 202.274 | 0.033 | n/a | 0.000 | 0.000 | 1.184 | 200.915 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.066 | 0.033 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000460 | 202.196 | 0.042 | n/a | 0.000 | 0.000 | 0.451 | 201.512 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.081 | 0.042 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000439 | 202.189 | 0.043 | n/a | 0.000 | 0.000 | 0.719 | 201.275 | 0.008 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.068 | 0.043 | 0.000 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000003eb | 202.182 | 0.031 | n/a | 0.000 | 0.000 | 0.967 | 201.021 | 0.015 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.061 | 0.031 | 0.000 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000003a5 | 202.106 | 0.038 | n/a | 0.000 | 0.000 | 1.466 | 200.491 | 0.003 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.082 | 0.038 | 0.000 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000036d | 202.083 | 0.049 | n/a | 0.000 | 0.000 | 0.886 | 200.953 | 0.008 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.118 | 0.049 | 0.000 | 0.118 | gw-r/thread-52/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000461 | 202.076 | 0.044 | n/a | 0.000 | 0.000 | 0.781 | 201.100 | 0.005 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.086 | 0.044 | 0.000 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000383 | 202.023 | 0.034 | n/a | 0.000 | 0.000 | 0.457 | 201.364 | 0.010 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000391 | 201.973 | 0.054 | n/a | 0.000 | 0.000 | 0.993 | 200.666 | 0.004 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.193 | 0.054 | 0.000 | 0.193 | gw-r/thread-46/journal/page | none observed |

## P3 / idle-500 / read (410 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.561 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.616 | 200.750 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.077 | 0.041 | 0.000 | 0.077 |
| p99 | 204.768 | n/a | n/a | n/a | 0.099 | n/a | 0.000 | 0.000 | 2.647 | 202.195 | 0.616 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.184 | 0.099 | 0.002 | 0.184 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 86c7e5dd4a7a21bd00000000000004a8 | 205.970 | 0.031 | n/a | 0.000 | 0.000 | 4.824 | 200.976 | 0.014 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.058 | 0.031 | 0.000 | 0.058 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000005e0 | 205.895 | 0.049 | n/a | 0.000 | 0.000 | 0.684 | 205.024 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.075 | 0.049 | 0.000 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000005bf | 205.202 | 0.035 | n/a | 0.000 | 0.000 | 0.507 | 204.540 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000004b4 | 204.844 | 0.058 | n/a | 0.000 | 0.000 | 3.939 | 200.672 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.125 | 0.058 | 0.000 | 0.125 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000625 | 204.768 | 0.032 | n/a | 0.000 | 0.000 | 0.568 | 204.004 | 0.016 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.070 | 0.032 | 0.000 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000004f6 | 204.192 | 0.033 | n/a | 0.000 | 0.000 | 2.990 | 201.018 | 0.010 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.059 | 0.033 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000620 | 203.932 | 0.030 | n/a | 0.000 | 0.000 | 1.535 | 202.195 | 0.009 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.072 | 0.030 | 0.000 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000053c | 203.924 | 0.069 | n/a | 0.000 | 0.000 | 2.647 | 200.999 | 0.007 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.144 | 0.069 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000005e6 | 203.272 | 0.040 | n/a | 0.000 | 0.000 | 2.442 | 200.656 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000005b0 | 203.216 | 0.058 | n/a | 0.000 | 0.000 | 1.848 | 201.114 | 0.009 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.123 | 0.058 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000610 | 203.167 | 0.031 | n/a | 0.000 | 0.000 | 1.835 | 201.111 | 0.041 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.061 | 0.031 | 0.000 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000589 | 203.116 | 0.037 | n/a | 0.000 | 0.000 | 1.873 | 201.044 | 0.011 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.076 | 0.037 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000550 | 203.016 | 0.031 | n/a | 0.000 | 0.000 | 0.409 | 202.412 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.063 | 0.031 | 0.000 | 0.063 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000004af | 202.915 | 0.074 | n/a | 0.000 | 0.000 | 1.135 | 201.463 | 0.006 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.160 | 0.074 | 0.000 | 0.160 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000005f9 | 202.869 | 0.036 | n/a | 0.000 | 0.000 | 0.604 | 202.007 | 0.020 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000005e7 | 202.865 | 0.041 | n/a | 0.000 | 0.000 | 0.770 | 201.827 | 0.015 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.091 | 0.041 | 0.000 | 0.091 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000583 | 202.831 | 0.051 | n/a | 0.000 | 0.000 | 2.074 | 200.534 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.123 | 0.051 | 0.000 | 0.123 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000005d4 | 202.805 | 0.094 | n/a | 0.000 | 0.000 | 1.345 | 201.124 | 0.013 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.136 | 0.094 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000593 | 202.779 | 0.038 | n/a | 0.000 | 0.000 | 0.486 | 201.973 | 0.088 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.091 | 0.038 | 0.000 | 0.091 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000050b | 202.751 | 0.135 | n/a | 0.000 | 0.000 | 1.763 | 200.606 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.198 | 0.135 | 0.001 | 0.198 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-1000 / read (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.501 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.610 | 200.705 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.081 | 0.037 | 0.000 | 0.081 |
| p99 | 203.976 | n/a | n/a | n/a | 0.089 | n/a | 0.000 | 0.000 | 3.142 | 202.329 | 0.036 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.181 | 0.089 | 0.001 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 86c7e5dd4a7a21bd00000000000008db | 214.228 | 0.037 | n/a | 0.000 | 0.000 | 0.425 | 202.640 | 0.005 | 10.986 | 0.063 | 0.000 | n/a | n/a | 0.071 | 0.037 | 0.000 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000697 | 205.749 | 0.069 | n/a | 0.000 | 0.000 | 0.719 | 204.734 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.143 | 0.069 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000066d | 205.412 | 0.034 | n/a | 0.000 | 0.000 | 0.554 | 200.960 | 0.007 | 0.000 | 3.782 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000075b | 205.272 | 0.071 | n/a | 0.000 | 0.000 | 1.839 | 202.945 | 0.018 | 0.000 | 0.257 | 0.000 | n/a | n/a | 0.143 | 0.071 | 0.000 | 0.143 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000791 | 204.687 | 1.699 | n/a | 0.000 | 0.000 | 0.822 | 201.844 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.287 | 1.699 | 0.008 | 0.287 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000075a | 204.305 | 0.031 | n/a | 0.000 | 0.000 | 3.700 | 200.465 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.079 | 0.031 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000006ee | 204.267 | 0.063 | n/a | 0.000 | 0.000 | 3.364 | 200.651 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.143 | 0.063 | 0.000 | 0.143 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000006b0 | 203.976 | 0.032 | n/a | 0.000 | 0.000 | 3.388 | 200.447 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000069c | 203.906 | 0.036 | n/a | 0.000 | 0.000 | 3.098 | 200.641 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.074 | 0.036 | 0.000 | 0.074 | gw-r/thread-67/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000006bf | 203.900 | 0.069 | n/a | 0.000 | 0.000 | 3.212 | 200.499 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.085 | 0.069 | 0.000 | 0.085 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000086d | 203.899 | 0.031 | n/a | 0.000 | 0.000 | 3.142 | 200.596 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000008fe | 203.790 | 0.032 | n/a | 0.000 | 0.000 | 0.661 | 202.978 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.070 | 0.032 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000008ff | 203.786 | 0.035 | n/a | 0.000 | 0.000 | 0.733 | 202.870 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.090 | 0.035 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000062f | 203.610 | 0.056 | n/a | 0.000 | 0.000 | 0.714 | 202.629 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.144 | 0.056 | 0.000 | 0.144 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000006c9 | 203.544 | 0.051 | n/a | 0.000 | 0.000 | 2.860 | 200.476 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.117 | 0.051 | 0.000 | 0.117 | gw-r/thread-53/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000007a6 | 203.539 | 0.028 | n/a | 0.000 | 0.000 | 1.331 | 202.021 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.075 | 0.028 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000069f | 203.477 | 0.038 | n/a | 0.000 | 0.000 | 0.499 | 202.712 | 0.035 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.090 | 0.038 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 86c7e5dd4a7a21bd0000000000000841 | 203.475 | 0.028 | n/a | 0.000 | 0.000 | 2.566 | 200.728 | 0.006 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.081 | 0.028 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 86c7e5dd4a7a21bd00000000000006ea | 203.427 | 0.070 | n/a | 0.000 | 0.000 | 1.610 | 201.484 | 0.011 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.164 | 0.070 | 0.000 | 0.164 | gw-r/thread-50/journal/page | none observed |
| 86c7e5dd4a7a21bd000000000000089b | 203.373 | 0.049 | n/a | 0.000 | 0.000 | 0.757 | 202.329 | 0.021 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.151 | 0.049 | 0.000 | 0.151 | gw-r/thread-53/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 1250 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.003/2.377 ms; post-ACK p50/p99: 0.337/0.950 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.904 | 10.516 | 10.367 | reported |
| All-primary p99 ms | 33.767 | 32.180 | 31.338 | <=50 |
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
| 5-10 | >=1000 | 8 | 12.375/48.695 | 12.010 | 6.020 | 17.694 | 0.106/0.019 |
| 5-10 | overlap | 86 | 14.414/53.365 | 14.075 | 8.874 | 22.206 | 0.064/0.016 |
| 5-10 | 0-50 | 561 | 10.150/22.655 | 9.667 | 5.572 | 14.135 | 0.056/0.017 |
| 5-10 | 50-100 | 148 | 9.977/28.579 | 9.619 | 5.052 | 13.465 | 0.063/0.017 |
| 5-10 | 100-250 | 149 | 10.804/17.834 | 10.463 | 5.768 | 14.752 | 0.076/0.019 |
| 5-10 | 250-1000 | 298 | 11.540/19.888 | 11.082 | 6.151 | 15.540 | 0.086/0.021 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1250 | 3 | 182.430 |

## Writer heap, GC and scheduler stalls

Source a0785bcf96f7afea3965b3028db2e27f4fbef6a9; 1250 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 370.092 / 402.307 |
| GC events / total duration / maximum ms | 258 / 611.531 / 40.594 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":252,"4":3,"8":3} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 33.767 / 3 / 182.430 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

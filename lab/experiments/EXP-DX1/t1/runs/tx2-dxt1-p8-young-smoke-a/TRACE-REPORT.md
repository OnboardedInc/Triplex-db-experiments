# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (429.981 ms, trace `72b0616fc23aa55d0000000000000089`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (130.451 ms, trace `72b0616fc23aa55d0000000000000085`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (102.428 ms, trace `72b0616fc23aa55d00000000000000da`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (94.386 ms, trace `72b0616fc23aa55d0000000000000125`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (100.453 ms, trace `72b0616fc23aa55d0000000000000182`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p8-young-smoke-a`; source `033e438673ec231de375d841f8c5a0addd9c9ec6`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8752828.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 208 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 14340.364 | 1611.705 | 41.785 | 451 |
| L1 | 1 | 19975.492 | 1108.933 | 20.298 | 666 |
| L4 | 4 | 19967.330 | 2115.176 | 35.354 | 626 |
| L16 | 16 | 19960.291 | 1693.147 | 40.784 | 686 |
| tail | 0 | 124645.282 | 14010.041 | 140.097 | 71347 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 72b0616fc23aa55d0000000000000089 | driver.queue.scheduler-dispatch | 0.096 | none | 0 / 32 |
| 72b0616fc23aa55d0000000000000089 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 72b0616fc23aa55d0000000000000089 waited: []

| 72b0616fc23aa55d0000000000000085 | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |
| 72b0616fc23aa55d0000000000000085 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 72b0616fc23aa55d0000000000000085 waited: []

| 72b0616fc23aa55d00000000000000da | driver.queue.scheduler-dispatch | 0.071 | none | 0 / 32 |
| 72b0616fc23aa55d00000000000000da | driver.queue.scheduler-late | 0.009 | none | 0 / 32 |

Observed active steps while trace 72b0616fc23aa55d00000000000000da waited: []

| 72b0616fc23aa55d0000000000000125 | driver.queue.scheduler-late | 0.802 | none | 0 / 32 |
| 72b0616fc23aa55d0000000000000125 | driver.queue.scheduler-dispatch | 0.074 | none | 0 / 32 |

Observed active steps while trace 72b0616fc23aa55d0000000000000125 waited: []

| 72b0616fc23aa55d0000000000000182 | driver.queue.scheduler-late | 0.681 | none | 0 / 32 |
| 72b0616fc23aa55d0000000000000182 | driver.queue.scheduler-dispatch | 0.037 | none | 0 / 32 |

Observed active steps while trace 72b0616fc23aa55d0000000000000182 waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.947 | 0.276 | 0.000 | 0.457 | 4.276 | 3.184 | 0.000 | 0.081 | 1.479 | 3.589 | 0.049 | n/a | 0.542 | 10.313 | n/a | n/a | 0.024 | 4.814 | 0.203 | 0.024 |
| p99 | 62.017 | 3.000 | 0.086 | 3.830 | 21.177 | n/a | 0.537 | 0.938 | 8.068 | 15.326 | 0.129 | n/a | 5.114 | 46.892 | n/a | n/a | 0.190 | 21.686 | 0.521 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d000000000000003f | 62.017 | 5.214 | 2.015 | 0.000 | 0.070 | 3.432 | 3.589 | 0.057 | n/a | 0.714 | 46.892 | n/a | n/a | 0.034 | 7.299 | 0.118 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 72b0616fc23aa55d000000000000003b | 55.655 | 21.177 | 0.439 | 0.000 | 0.071 | 8.068 | 8.092 | 0.129 | n/a | 0.251 | 17.404 | n/a | n/a | 0.025 | 21.686 | 0.390 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 72b0616fc23aa55d0000000000000037 | 47.547 | 9.873 | n/a | 0.000 | 0.847 | 1.292 | 15.326 | 0.054 | n/a | 0.207 | 19.758 | n/a | n/a | 0.190 | 10.719 | 0.225 | 0.190 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000004b | 40.761 | 7.627 | 0.222 | 0.000 | 0.085 | 2.756 | 8.853 | 0.088 | n/a | 3.982 | 17.116 | n/a | n/a | 0.032 | 7.934 | 0.195 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 72b0616fc23aa55d000000000000004d | 36.046 | 16.429 | 0.236 | 0.000 | 0.069 | 2.056 | 7.751 | 0.049 | n/a | 0.201 | 9.230 | n/a | n/a | 0.024 | 16.735 | 0.464 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 72b0616fc23aa55d0000000000000053 | 34.178 | 16.626 | 1.126 | 0.000 | 0.066 | 1.427 | 6.516 | 0.107 | n/a | 0.233 | 8.054 | n/a | n/a | 0.021 | 17.818 | 0.521 | 0.021 | node-14/thread-9/client.persist-and-resolve | driver.reader-basis.broadcast 0.030ms |
| 72b0616fc23aa55d0000000000000061 | 33.392 | 4.841 | 3.184 | 0.331 | 0.061 | 7.201 | 5.669 | 0.036 | n/a | 0.149 | 11.900 | n/a | n/a | 0.020 | 8.417 | 0.252 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 72b0616fc23aa55d0000000000000055 | 31.916 | 4.569 | 0.182 | 0.000 | 0.063 | 4.958 | 7.755 | 0.058 | n/a | 0.217 | 14.091 | n/a | n/a | 0.023 | 4.814 | 0.151 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 72b0616fc23aa55d000000000000004e | 29.033 | 4.244 | n/a | 0.522 | 0.938 | 1.186 | 5.873 | 0.046 | n/a | 0.791 | 15.414 | n/a | n/a | 0.020 | 5.704 | 0.196 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| 72b0616fc23aa55d0000000000000069 | 27.814 | 6.965 | 0.201 | 0.000 | 0.062 | 2.973 | 4.345 | 0.057 | n/a | 0.720 | 12.467 | n/a | n/a | 0.025 | 7.228 | 0.260 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 72b0616fc23aa55d0000000000000065 | 27.688 | 6.810 | 0.260 | 0.354 | 0.059 | 4.637 | 3.018 | 0.066 | n/a | 0.263 | 12.200 | n/a | n/a | 0.021 | 7.482 | 0.270 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 72b0616fc23aa55d0000000000000045 | 25.427 | 6.054 | 0.216 | 0.000 | 0.065 | 2.521 | 4.033 | 0.033 | n/a | 5.114 | 7.355 | n/a | n/a | 0.034 | 6.335 | 0.249 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 72b0616fc23aa55d0000000000000071 | 25.071 | 6.070 | 0.133 | 0.296 | 0.065 | 1.679 | 3.969 | 0.066 | n/a | 0.476 | 12.293 | n/a | n/a | 0.024 | 6.564 | 0.262 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 72b0616fc23aa55d0000000000000043 | 24.428 | 4.276 | 0.170 | 0.000 | 0.079 | 1.737 | 3.369 | 0.035 | n/a | 0.464 | 14.272 | n/a | n/a | 0.027 | 4.526 | 0.185 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 72b0616fc23aa55d0000000000000057 | 23.947 | 4.385 | 0.125 | 0.288 | 0.058 | 1.452 | 7.657 | 0.034 | n/a | 1.850 | 8.076 | n/a | n/a | 0.022 | 4.856 | 0.203 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 72b0616fc23aa55d0000000000000048 | 23.742 | 3.479 | n/a | 0.000 | 0.619 | 0.784 | 3.163 | 0.028 | n/a | 0.542 | 15.101 | n/a | n/a | 0.026 | 4.098 | 0.173 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.093ms |
| 72b0616fc23aa55d0000000000000050 | 22.791 | 2.595 | n/a | 0.000 | 0.888 | 1.883 | 5.652 | 0.100 | n/a | 1.450 | 10.177 | n/a | n/a | 0.044 | 3.484 | 0.153 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000005f | 21.787 | 5.057 | n/a | 0.537 | 0.930 | 2.922 | 1.878 | 0.022 | n/a | 0.112 | 10.313 | n/a | n/a | 0.016 | 6.525 | 0.299 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000003d | 20.737 | 2.423 | n/a | 0.000 | 0.207 | 0.795 | 1.729 | 0.023 | n/a | 3.439 | 12.092 | n/a | n/a | 0.029 | 2.630 | 0.127 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| 72b0616fc23aa55d0000000000000062 | 18.100 | 1.841 | n/a | 0.000 | 0.097 | 0.985 | 1.911 | 0.045 | n/a | 1.698 | 11.493 | n/a | n/a | 0.030 | 1.938 | 0.107 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |

## P2/P4 / read-your-own-write / read (117 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.569 | n/a | n/a | n/a | 40.633 | 14.261 | 2.639 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.551 | 59.783 | 0.809 | 13.551 |
| p99 | 290.835 | n/a | n/a | n/a | 120.497 | 124.805 | 16.550 | 0.000 | 63.947 | 2.500 | 0.002 | n/a | 0.003 | 0.000 | n/a | n/a | 105.053 | 200.328 | 1.000 | 105.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d00000000000014e6 | 309.447 | 105.866 | 124.805 | 16.550 | 0.000 | 0.350 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.876 | 247.221 | 0.799 | 61.876 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.add-commit 3.522ms; driver.publication.persist-deferred 2.461ms; driver.publication.persist-deferred 1.900ms; driver.expected-state.bind-receipt 1.672ms; driver.publication.persist-deferred 1.615ms |
| 72b0616fc23aa55d00000000000014fc | 290.835 | 31.601 | 159.634 | 0.669 | 0.000 | 0.427 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 98.504 | 191.904 | 0.660 | 98.504 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.900ms; driver.expected-state.bind-receipt 1.672ms; driver.publication.persist-deferred 1.615ms; driver.publication.persist-deferred 1.427ms; driver.publication.persist-deferred 1.396ms |
| 72b0616fc23aa55d00000000000014f8 | 286.298 | 110.280 | 57.536 | 12.215 | 0.000 | 63.947 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.320 | 180.031 | 0.629 | 42.320 | node-14/thread-4/socket.body-read | driver.publication.persist-deferred 1.900ms; driver.expected-state.bind-receipt 1.672ms; driver.publication.persist-deferred 1.615ms; driver.publication.persist-deferred 1.427ms; driver.publication.persist-deferred 1.396ms |
| 72b0616fc23aa55d000000000000172f | 225.360 | 45.265 | 72.512 | 3.135 | 0.000 | 0.338 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 104.110 | 120.912 | 0.537 | 104.110 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 2.662ms; driver.expected-state.bind-receipt 1.558ms; driver.publication.persist-deferred 1.204ms; driver.publication.persist-deferred 1.166ms; driver.publication.persist-deferred 1.165ms |
| 72b0616fc23aa55d00000000000014e0 | 220.763 | 94.108 | 6.703 | 9.824 | 0.000 | 3.109 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 107.019 | 110.635 | 0.501 | 107.019 | node-14/thread-4/socket.wait-first-byte | driver.expected-state.add-commit 3.522ms; driver.publication.persist-deferred 2.461ms; driver.publication.persist-deferred 1.900ms; driver.publication.persist-deferred 1.666ms; driver.expected-state.bind-receipt 1.613ms |
| 72b0616fc23aa55d0000000000001b6a | 205.218 | 82.706 | 108.566 | 9.056 | 0.000 | 0.525 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.365 | 200.328 | 0.976 | 4.365 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.358ms; driver.publication.persist-deferred 1.544ms; driver.publication.persist-deferred 1.343ms; driver.publication.persist-deferred 1.333ms; driver.publication.persist-deferred 1.307ms |
| 72b0616fc23aa55d000000000000173e | 186.519 | 50.755 | 119.050 | 3.942 | 0.000 | 0.645 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.127 | 173.747 | 0.932 | 12.127 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.204ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.103ms; driver.publication.persist-deferred 1.003ms; driver.publication.persist-deferred 0.880ms |
| 72b0616fc23aa55d0000000000001721 | 180.284 | 47.975 | 11.861 | 5.383 | 0.000 | 87.191 | 10.845 | 17.017 | n/a | 0.003 | 0.000 | n/a | n/a | 0.009 | 65.219 | 0.362 | 0.009 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 2.662ms; driver.expected-state.bind-receipt 1.873ms; driver.expected-state.add-commit 1.625ms; driver.publication.persist-deferred 1.514ms; driver.publication.persist-deferred 1.416ms |
| 72b0616fc23aa55d00000000000014ee | 180.014 | 72.753 | 95.546 | 4.199 | 0.000 | 0.290 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.225 | 172.499 | 0.958 | 7.225 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.add-commit 3.522ms; driver.publication.persist-deferred 1.900ms; driver.publication.persist-deferred 1.615ms; driver.publication.persist-deferred 1.445ms; driver.publication.persist-deferred 1.273ms |
| 72b0616fc23aa55d000000000000173b | 174.120 | 22.729 | 45.080 | 0.969 | 0.000 | 0.289 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 105.053 | 68.777 | 0.395 | 105.053 | node-14/thread-4/socket.wait-first-byte | driver.expected-state.bind-receipt 1.558ms; driver.publication.persist-deferred 1.204ms; driver.publication.persist-deferred 1.165ms; driver.publication.persist-deferred 1.103ms; driver.publication.persist-deferred 0.953ms |
| 72b0616fc23aa55d0000000000001731 | 172.045 | 29.446 | 58.945 | 1.628 | 0.000 | 0.197 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 81.829 | 90.019 | 0.523 | 81.829 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 2.662ms; driver.expected-state.bind-receipt 1.558ms; driver.publication.persist-deferred 1.204ms; driver.publication.persist-deferred 1.166ms; driver.publication.persist-deferred 1.165ms |
| 72b0616fc23aa55d0000000000001b66 | 171.289 | 49.948 | 20.667 | 3.246 | 0.000 | 0.306 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 97.122 | 73.861 | 0.431 | 97.122 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 3.358ms; driver.publication.persist-deferred 1.784ms; driver.publication.persist-deferred 1.544ms; driver.publication.persist-deferred 1.333ms; driver.publication.persist-deferred 1.262ms |
| 72b0616fc23aa55d0000000000000038 | 149.249 | 133.129 | 0.990 | 5.936 | 0.000 | 2.565 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.628 | 140.055 | 0.938 | 6.628 | node-14/thread-4/worker.gateway-observer.observe | driver.publication.persist-deferred 1.628ms; driver.reader-basis.broadcast 0.059ms; driver.reader-basis.broadcast 0.016ms |
| 72b0616fc23aa55d00000000000018fa | 146.671 | 65.855 | 2.317 | 4.748 | 0.000 | 24.698 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.053 | 72.920 | 0.497 | 49.053 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 2.674ms; driver.publication.persist-deferred 2.139ms; driver.publication.persist-deferred 1.308ms; driver.publication.persist-deferred 1.277ms; driver.publication.persist-deferred 1.153ms |
| 72b0616fc23aa55d00000000000018fd | 146.577 | 120.497 | 0.221 | 9.828 | 0.000 | 0.273 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.758 | 130.546 | 0.891 | 15.758 | node-14/thread-4/client.reach | driver.publication.persist-deferred 2.674ms; driver.publication.persist-deferred 2.139ms; driver.publication.persist-deferred 1.308ms; driver.publication.persist-deferred 1.277ms; driver.publication.persist-deferred 1.153ms |
| 72b0616fc23aa55d00000000000014fa | 145.912 | 37.965 | 59.089 | 5.881 | 0.000 | 0.170 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.807 | 102.935 | 0.705 | 42.807 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.900ms; driver.expected-state.bind-receipt 1.672ms; driver.publication.persist-deferred 1.615ms; driver.publication.persist-deferred 1.396ms; driver.publication.persist-deferred 1.306ms |
| 72b0616fc23aa55d00000000000014df | 143.784 | 33.478 | 21.263 | 3.460 | 0.000 | 2.354 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 83.230 | 58.200 | 0.405 | 83.230 | node-14/thread-4/socket.wait-first-byte | driver.expected-state.add-commit 3.522ms; driver.publication.persist-deferred 2.461ms; driver.publication.persist-deferred 1.666ms; driver.expected-state.bind-receipt 1.613ms; driver.publication.persist-deferred 1.445ms |
| 72b0616fc23aa55d000000000000196d | 143.508 | 65.656 | 54.898 | 6.353 | 0.000 | 0.440 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.161 | 126.907 | 0.884 | 16.161 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.788ms; driver.publication.persist-deferred 1.550ms; driver.publication.persist-deferred 1.378ms; driver.publication.persist-deferred 1.370ms; driver.publication.persist-deferred 1.221ms |
| 72b0616fc23aa55d0000000000001720 | 142.308 | 46.719 | 17.115 | 3.290 | 0.000 | 0.377 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 74.806 | 67.124 | 0.472 | 74.806 | node-14/thread-4/socket.wait-first-byte | driver.expected-state.bind-receipt 1.873ms; driver.expected-state.add-commit 1.625ms; driver.publication.persist-deferred 1.514ms; driver.publication.persist-deferred 1.416ms; driver.expected-state.bind-receipt 1.280ms |
| 72b0616fc23aa55d0000000000000eaa | 134.960 | 29.564 | 14.261 | 2.080 | 0.000 | 0.324 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 88.731 | 45.906 | 0.340 | 88.731 | node-14/thread-4/socket.wait-first-byte | driver.publication.persist-deferred 1.505ms; driver.publication.persist-deferred 1.181ms; driver.publication.persist-deferred 0.991ms; driver.publication.persist-deferred 0.984ms; driver.publication.persist-deferred 0.962ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.788 | 0.421 | 0.000 | 0.597 | 2.103 | n/a | 0.000 | 0.504 | 0.985 | 2.130 | 0.045 | n/a | 0.866 | 7.682 | n/a | n/a | 0.025 | 2.769 | 0.182 | 0.025 |
| p99 | 20.737 | 1.999 | 0.000 | 0.867 | 2.956 | n/a | 0.000 | 0.834 | 1.973 | 4.880 | 0.085 | n/a | 3.439 | 12.092 | n/a | n/a | 0.035 | 3.492 | 0.248 | 0.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d000000000000003d | 20.737 | 2.423 | n/a | 0.000 | 0.207 | 0.795 | 1.729 | 0.023 | n/a | 3.439 | 12.092 | n/a | n/a | 0.029 | 2.630 | 0.127 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms |
| 72b0616fc23aa55d0000000000000062 | 18.100 | 1.841 | n/a | 0.000 | 0.097 | 0.985 | 1.911 | 0.045 | n/a | 1.698 | 11.493 | n/a | n/a | 0.030 | 1.938 | 0.107 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| 72b0616fc23aa55d0000000000000066 | 17.280 | 1.943 | n/a | 0.000 | 0.826 | 1.325 | 2.451 | 0.064 | n/a | 2.061 | 8.586 | n/a | n/a | 0.023 | 2.769 | 0.160 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000005a | 15.240 | 2.281 | n/a | 0.000 | 0.693 | 1.973 | 2.130 | 0.055 | n/a | 0.341 | 7.743 | n/a | n/a | 0.024 | 2.974 | 0.195 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000041 | 14.788 | 2.285 | n/a | 0.000 | 0.504 | 0.789 | 4.880 | 0.057 | n/a | 0.866 | 5.380 | n/a | n/a | 0.026 | 2.789 | 0.189 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000006a | 14.437 | 2.956 | n/a | 0.000 | 0.536 | 1.273 | 1.256 | 0.022 | n/a | 0.686 | 7.682 | n/a | n/a | 0.025 | 3.492 | 0.242 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000046 | 12.496 | 1.792 | n/a | 0.000 | 0.388 | 1.120 | 2.205 | 0.085 | n/a | 0.930 | 5.941 | n/a | n/a | 0.035 | 2.180 | 0.174 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000006e | 11.865 | 2.103 | n/a | 0.000 | 0.834 | 0.712 | 1.082 | 0.020 | n/a | 0.142 | 6.956 | n/a | n/a | 0.017 | 2.937 | 0.248 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000058 | 11.685 | 2.047 | n/a | 0.000 | 0.081 | 0.766 | 2.163 | 0.023 | n/a | 0.161 | 6.424 | n/a | n/a | 0.021 | 2.128 | 0.182 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.024 | 0.186 | 0.000 | 0.525 | 3.751 | n/a | 0.000 | 0.109 | 1.318 | 3.306 | 0.032 | n/a | 0.327 | 14.048 | n/a | n/a | 0.024 | 4.132 | 0.168 | 0.024 |
| p99 | 453.238 | 3.829 | 0.028 | 2.969 | 17.987 | n/a | 0.710 | 10.385 | 6.001 | 17.175 | 0.293 | n/a | 6.617 | 429.981 | n/a | n/a | 0.072 | 18.476 | 0.495 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d0000000000000089 | 453.238 | 17.987 | 0.152 | 0.237 | 0.099 | 0.816 | 3.487 | 0.034 | n/a | 0.409 | 429.981 | n/a | n/a | 0.035 | 18.476 | 0.041 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.099ms; driver.reader-basis.broadcast 0.088ms; driver.reader-basis.broadcast 0.087ms; driver.reader-basis.broadcast 0.056ms; driver.reader-basis.broadcast 0.055ms |
| 72b0616fc23aa55d0000000000000085 | 152.714 | 3.825 | 0.214 | 0.000 | 0.066 | 1.488 | 16.456 | 0.059 | n/a | 0.134 | 130.451 | n/a | n/a | 0.022 | 4.104 | 0.027 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms; driver.reader-basis.broadcast 0.054ms |
| 72b0616fc23aa55d0000000000000093 | 48.505 | 3.153 | n/a | 0.000 | 0.650 | 2.048 | 12.006 | 0.066 | n/a | 0.167 | 30.390 | n/a | n/a | 0.025 | 3.803 | 0.078 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000087 | 47.099 | 4.886 | 0.130 | 0.423 | 0.061 | 1.530 | 12.749 | 0.034 | n/a | 0.485 | 26.779 | n/a | n/a | 0.022 | 5.500 | 0.117 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 72b0616fc23aa55d000000000000008e | 45.913 | 4.512 | 0.136 | 0.387 | 0.064 | 1.703 | 14.985 | 0.031 | n/a | 0.109 | 23.964 | n/a | n/a | 0.022 | 5.100 | 0.111 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.100ms |
| 72b0616fc23aa55d00000000000000b1 | 42.721 | 3.910 | 0.194 | 0.000 | 0.060 | 1.279 | 15.527 | 0.032 | n/a | 0.467 | 21.227 | n/a | n/a | 0.024 | 4.164 | 0.097 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| 72b0616fc23aa55d00000000000000b9 | 41.010 | 5.586 | 0.146 | 0.255 | 0.064 | 1.593 | 10.954 | 0.058 | n/a | 3.590 | 18.741 | n/a | n/a | 0.023 | 6.051 | 0.148 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.078ms |
| 72b0616fc23aa55d0000000000000092 | 37.532 | 3.751 | 0.160 | 0.000 | 0.109 | 1.272 | 15.450 | 0.081 | n/a | 0.327 | 16.346 | n/a | n/a | 0.036 | 4.020 | 0.107 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 72b0616fc23aa55d0000000000000098 | 36.462 | 11.622 | n/a | 0.000 | 0.802 | 1.318 | 3.011 | 0.029 | n/a | 0.567 | 19.084 | n/a | n/a | 0.028 | 12.424 | 0.341 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000bb | 36.314 | 3.438 | 0.136 | 0.000 | 0.067 | 2.962 | 13.462 | 0.047 | n/a | 0.533 | 15.647 | n/a | n/a | 0.021 | 3.641 | 0.100 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.072ms |
| 72b0616fc23aa55d00000000000000a9 | 34.064 | 3.797 | 0.198 | 0.324 | 0.044 | 3.172 | 10.698 | 0.033 | n/a | 0.620 | 15.160 | n/a | n/a | 0.018 | 4.363 | 0.128 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.229ms; driver.reader-basis.broadcast 0.068ms |
| 72b0616fc23aa55d0000000000000097 | 33.692 | 7.387 | 0.163 | 0.000 | 0.073 | 2.021 | 9.656 | 0.051 | n/a | 0.639 | 13.674 | n/a | n/a | 0.028 | 7.623 | 0.226 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms |
| 72b0616fc23aa55d00000000000000c5 | 33.150 | 3.510 | 0.164 | 0.241 | 0.062 | 6.001 | 6.511 | 0.033 | n/a | 0.123 | 16.484 | n/a | n/a | 0.021 | 3.977 | 0.120 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.121ms |
| 72b0616fc23aa55d00000000000000b5 | 31.636 | 3.904 | 0.220 | 0.249 | 0.062 | 1.482 | 17.175 | 0.032 | n/a | 0.112 | 8.375 | n/a | n/a | 0.023 | 4.436 | 0.140 | 0.023 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.080ms |
| 72b0616fc23aa55d00000000000000ac | 30.770 | 3.156 | n/a | 0.000 | 0.976 | 1.013 | 2.091 | 0.026 | n/a | 0.751 | 22.726 | n/a | n/a | 0.030 | 4.132 | 0.134 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000bf | 29.453 | 6.059 | n/a | 0.490 | 0.558 | 0.926 | 2.164 | 0.032 | n/a | 1.557 | 17.613 | n/a | n/a | 0.054 | 7.107 | 0.241 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000007c | 29.118 | 5.370 | 0.142 | 0.000 | 0.057 | 1.636 | 3.154 | 0.032 | n/a | 0.136 | 18.566 | n/a | n/a | 0.025 | 5.568 | 0.191 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 72b0616fc23aa55d00000000000000af | 29.043 | 3.490 | 0.152 | 0.328 | 0.095 | 2.462 | 15.625 | 0.037 | n/a | 0.366 | 6.454 | n/a | n/a | 0.034 | 4.065 | 0.140 | 0.034 | gw-w/thread-43/gateway.admitted-work | none observed |
| 72b0616fc23aa55d0000000000000073 | 26.048 | 4.265 | 0.138 | 0.000 | 0.057 | 3.008 | 4.081 | 0.031 | n/a | 0.146 | 14.301 | n/a | n/a | 0.021 | 4.460 | 0.171 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.074ms |
| 72b0616fc23aa55d000000000000007d | 25.458 | 5.660 | n/a | 0.000 | 0.211 | 2.492 | 4.783 | 0.050 | n/a | 1.345 | 10.888 | n/a | n/a | 0.029 | 5.870 | 0.231 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.353 | 0.117 | 0.000 | 0.553 | 2.471 | n/a | 0.000 | 0.445 | 0.859 | 1.469 | 0.021 | n/a | 0.109 | 9.403 | n/a | n/a | 0.022 | 3.143 | 0.202 | 0.022 |
| p99 | 25.458 | 1.333 | 0.000 | 0.970 | 5.660 | n/a | 0.000 | 10.385 | 3.414 | 4.783 | 0.233 | n/a | 4.053 | 14.557 | n/a | n/a | 0.042 | 11.833 | 0.495 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d000000000000007d | 25.458 | 5.660 | n/a | 0.000 | 0.211 | 2.492 | 4.783 | 0.050 | n/a | 1.345 | 10.888 | n/a | n/a | 0.029 | 5.870 | 0.231 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000b7 | 24.518 | 3.528 | n/a | 0.000 | 0.585 | 1.059 | 4.620 | 0.021 | n/a | 0.105 | 14.557 | n/a | n/a | 0.042 | 4.114 | 0.168 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000c0 | 23.893 | 1.448 | n/a | 0.000 | 10.385 | 0.605 | 1.922 | 0.023 | n/a | 0.091 | 9.403 | n/a | n/a | 0.016 | 11.833 | 0.495 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.307ms |
| 72b0616fc23aa55d000000000000007a | 22.226 | 2.932 | n/a | 0.000 | 0.211 | 1.149 | 1.469 | 0.032 | n/a | 4.053 | 12.357 | n/a | n/a | 0.023 | 3.143 | 0.141 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000009a | 16.353 | 2.471 | n/a | 0.000 | 0.445 | 0.835 | 1.237 | 0.020 | n/a | 0.493 | 10.827 | n/a | n/a | 0.025 | 2.917 | 0.178 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000a5 | 16.045 | 2.430 | n/a | 0.000 | 0.814 | 0.778 | 1.820 | 0.233 | n/a | 2.713 | 7.238 | n/a | n/a | 0.019 | 3.244 | 0.202 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000008f | 14.568 | 2.615 | n/a | 0.000 | 0.342 | 0.859 | 1.272 | 0.020 | n/a | 0.109 | 9.330 | n/a | n/a | 0.022 | 2.957 | 0.203 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000aa | 12.266 | 1.871 | n/a | 0.000 | 0.651 | 3.414 | 0.746 | 0.010 | n/a | 0.062 | 5.498 | n/a | n/a | 0.014 | 2.522 | 0.206 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.855 | 0.279 | 0.000 | 0.578 | 3.877 | 1.199 | 0.000 | 0.142 | 1.447 | 4.004 | 0.038 | n/a | 0.373 | 11.668 | n/a | n/a | 0.027 | 4.430 | 0.183 | 0.027 |
| p99 | 132.945 | 2.572 | 0.007 | 2.216 | 17.798 | n/a | 3.219 | 1.139 | 7.731 | 54.350 | 0.094 | n/a | 4.262 | 102.428 | n/a | n/a | 0.063 | 18.470 | 0.457 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d00000000000000da | 132.945 | 4.220 | 0.236 | 0.000 | 0.079 | 6.443 | 16.190 | 0.045 | n/a | 3.277 | 102.428 | n/a | n/a | 0.025 | 4.536 | 0.034 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 72b0616fc23aa55d00000000000000ef | 79.927 | 6.118 | 0.141 | 3.219 | 0.068 | 2.963 | 54.350 | 0.034 | n/a | 1.375 | 11.632 | n/a | n/a | 0.027 | 9.546 | 0.119 | 0.027 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.085ms |
| 72b0616fc23aa55d00000000000000d0 | 70.987 | 9.830 | 0.167 | 0.000 | 0.111 | 7.731 | 9.201 | 0.071 | n/a | 0.211 | 43.626 | n/a | n/a | 0.038 | 10.109 | 0.142 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 72b0616fc23aa55d00000000000000e5 | 46.475 | 3.877 | 0.138 | 0.000 | 0.069 | 4.184 | 13.955 | 0.054 | n/a | 0.131 | 24.043 | n/a | n/a | 0.025 | 4.083 | 0.088 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 72b0616fc23aa55d00000000000000eb | 42.974 | 6.095 | 0.178 | 0.000 | 0.067 | 1.422 | 13.209 | 0.032 | n/a | 0.106 | 21.840 | n/a | n/a | 0.025 | 6.341 | 0.148 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 72b0616fc23aa55d00000000000000ed | 42.715 | 4.556 | 0.140 | 0.345 | 0.066 | 2.806 | 9.755 | 0.076 | n/a | 4.262 | 20.684 | n/a | n/a | 0.025 | 5.107 | 0.120 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 72b0616fc23aa55d0000000000000115 | 40.410 | 17.798 | 0.182 | 0.425 | 0.064 | 3.689 | 6.697 | 0.058 | n/a | 3.168 | 8.303 | n/a | n/a | 0.025 | 18.470 | 0.457 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000c6 | 38.020 | 1.972 | n/a | 0.000 | 0.222 | 0.783 | 1.129 | 0.021 | n/a | 0.483 | 33.383 | n/a | n/a | 0.028 | 2.194 | 0.058 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000010b | 36.739 | 13.358 | 0.719 | 0.663 | 0.103 | 2.279 | 7.717 | 0.058 | n/a | 0.137 | 11.668 | n/a | n/a | 0.038 | 14.842 | 0.404 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000d8 | 35.260 | 4.154 | 1.199 | 0.000 | 0.078 | 2.058 | 8.208 | 0.038 | n/a | 0.135 | 19.356 | n/a | n/a | 0.034 | 5.431 | 0.154 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 72b0616fc23aa55d00000000000000e0 | 34.390 | 5.002 | 0.179 | 0.000 | 0.064 | 2.156 | 9.094 | 0.053 | n/a | 0.498 | 17.318 | n/a | n/a | 0.025 | 5.246 | 0.153 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.067ms |
| 72b0616fc23aa55d0000000000000103 | 32.921 | 8.941 | 0.237 | 0.314 | 0.069 | 3.223 | 7.102 | 0.040 | n/a | 3.392 | 9.576 | n/a | n/a | 0.027 | 9.561 | 0.290 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000e7 | 31.949 | 4.012 | 0.201 | 0.000 | 0.098 | 1.396 | 13.604 | 0.050 | n/a | 0.119 | 12.430 | n/a | n/a | 0.039 | 4.312 | 0.135 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000f3 | 31.946 | 7.498 | 0.160 | 0.242 | 0.113 | 3.133 | 4.766 | 0.038 | n/a | 0.170 | 15.787 | n/a | n/a | 0.038 | 8.013 | 0.251 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000100 | 31.881 | 8.858 | n/a | 1.034 | 0.222 | 1.325 | 5.752 | 0.025 | n/a | 0.812 | 13.792 | n/a | n/a | 0.062 | 10.114 | 0.317 | 0.062 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.128ms |
| 72b0616fc23aa55d000000000000010c | 30.957 | 5.856 | n/a | 0.000 | 0.581 | 1.512 | 2.615 | 0.064 | n/a | 1.142 | 19.136 | n/a | n/a | 0.051 | 6.437 | 0.208 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000e8 | 29.188 | 2.999 | n/a | 0.452 | 0.673 | 4.269 | 1.722 | 0.022 | n/a | 0.551 | 18.477 | n/a | n/a | 0.024 | 4.124 | 0.141 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 72b0616fc23aa55d00000000000000ff | 27.971 | 6.922 | 0.162 | 0.396 | 0.097 | 2.953 | 6.114 | 0.033 | n/a | 0.135 | 11.122 | n/a | n/a | 0.037 | 7.577 | 0.271 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000c9 | 27.026 | 4.365 | 0.144 | 0.330 | 0.058 | 1.960 | 7.805 | 0.036 | n/a | 0.177 | 12.129 | n/a | n/a | 0.023 | 4.896 | 0.181 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000e1 | 26.855 | 3.944 | n/a | 0.613 | 0.358 | 0.891 | 1.807 | 0.026 | n/a | 0.751 | 18.442 | n/a | n/a | 0.024 | 4.915 | 0.183 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.529 | 0.000 | 0.000 | 0.486 | 2.323 | n/a | 0.000 | 0.362 | 1.091 | 1.162 | 0.021 | n/a | 0.351 | 9.619 | n/a | n/a | 0.028 | 3.297 | 0.165 | 0.028 |
| p99 | 38.020 | 2.572 | 0.000 | 2.216 | 5.714 | n/a | 0.000 | 1.101 | 4.732 | 5.044 | 0.094 | n/a | 2.590 | 33.383 | n/a | n/a | 0.063 | 5.861 | 0.393 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d00000000000000c6 | 38.020 | 1.972 | n/a | 0.000 | 0.222 | 0.783 | 1.129 | 0.021 | n/a | 0.483 | 33.383 | n/a | n/a | 0.028 | 2.194 | 0.058 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000cb | 25.550 | 3.121 | n/a | 0.000 | 1.084 | 0.698 | 5.044 | 0.021 | n/a | 0.094 | 15.443 | n/a | n/a | 0.044 | 4.205 | 0.165 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.095ms |
| 72b0616fc23aa55d00000000000000dd | 18.023 | 2.323 | n/a | 0.000 | 1.101 | 4.732 | 1.511 | 0.036 | n/a | 0.129 | 8.169 | n/a | n/a | 0.020 | 3.425 | 0.190 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000110 | 18.000 | 3.361 | n/a | 0.000 | 0.677 | 1.331 | 1.039 | 0.030 | n/a | 0.113 | 11.406 | n/a | n/a | 0.043 | 4.038 | 0.224 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000108 | 16.677 | 1.909 | n/a | 0.000 | 0.362 | 1.111 | 1.870 | 0.065 | n/a | 2.590 | 8.742 | n/a | n/a | 0.028 | 2.271 | 0.136 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000db | 16.529 | 2.220 | n/a | 0.000 | 0.222 | 1.571 | 1.132 | 0.020 | n/a | 0.585 | 10.756 | n/a | n/a | 0.022 | 2.442 | 0.148 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| 72b0616fc23aa55d00000000000000d5 | 16.431 | 2.752 | n/a | 0.000 | 0.545 | 1.091 | 1.213 | 0.094 | n/a | 0.711 | 9.985 | n/a | n/a | 0.041 | 3.297 | 0.201 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000fa | 15.666 | 2.796 | n/a | 0.000 | 0.897 | 1.008 | 1.162 | 0.020 | n/a | 0.141 | 9.619 | n/a | n/a | 0.023 | 3.693 | 0.236 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000000f0 | 15.215 | 1.804 | n/a | 0.000 | 0.338 | 1.266 | 2.522 | 0.051 | n/a | 0.826 | 8.382 | n/a | n/a | 0.025 | 2.142 | 0.141 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000112 | 14.918 | 5.714 | n/a | 0.000 | 0.146 | 1.027 | 0.959 | 0.021 | n/a | 0.351 | 6.635 | n/a | n/a | 0.063 | 5.861 | 0.393 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.375 | 0.000 | 0.000 | 0.424 | 3.641 | n/a | 0.227 | 0.092 | 1.454 | 4.065 | 0.036 | n/a | 0.424 | 11.390 | n/a | n/a | 0.027 | 4.221 | 0.179 | 0.027 |
| p99 | 128.453 | 1.732 | 0.000 | 2.267 | 10.880 | n/a | 4.067 | 1.072 | 9.617 | 29.884 | 0.172 | n/a | 3.823 | 94.386 | n/a | n/a | 0.077 | 15.207 | 0.442 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d0000000000000125 | 128.453 | 1.776 | n/a | 0.000 | 0.876 | 0.788 | 29.884 | 0.044 | n/a | 0.670 | 94.386 | n/a | n/a | 0.029 | 2.652 | 0.021 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 72b0616fc23aa55d0000000000000166 | 96.485 | 1.904 | n/a | 0.000 | 0.686 | 2.909 | 1.214 | 0.023 | n/a | 1.454 | 88.270 | n/a | n/a | 0.025 | 2.589 | 0.027 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 72b0616fc23aa55d0000000000000143 | 62.593 | 10.795 | 0.157 | 0.208 | 0.094 | 1.467 | 11.527 | 0.039 | n/a | 0.146 | 38.120 | n/a | n/a | 0.040 | 11.254 | 0.180 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 72b0616fc23aa55d0000000000000129 | 61.044 | 3.545 | 0.206 | 0.231 | 0.089 | 2.791 | 13.141 | 0.096 | n/a | 0.180 | 40.728 | n/a | n/a | 0.036 | 4.071 | 0.067 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.101ms |
| 72b0616fc23aa55d0000000000000121 | 58.750 | 6.590 | 1.990 | 0.293 | 0.060 | 1.982 | 9.294 | 0.058 | n/a | 0.129 | 38.330 | n/a | n/a | 0.025 | 8.933 | 0.152 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 72b0616fc23aa55d000000000000013a | 55.568 | 8.438 | n/a | 0.950 | 0.979 | 7.213 | 16.007 | 0.172 | n/a | 1.863 | 19.914 | n/a | n/a | 0.034 | 10.367 | 0.187 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 72b0616fc23aa55d0000000000000156 | 51.900 | 1.705 | n/a | 0.000 | 0.787 | 0.991 | 1.614 | 0.019 | n/a | 0.695 | 46.044 | n/a | n/a | 0.045 | 2.492 | 0.048 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000137 | 41.476 | 10.880 | 0.168 | 4.067 | 0.092 | 9.617 | 6.458 | 0.088 | n/a | 0.873 | 9.193 | n/a | n/a | 0.040 | 15.207 | 0.367 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000124 | 38.653 | 4.543 | 0.933 | 0.260 | 0.069 | 2.234 | 10.522 | 0.051 | n/a | 0.547 | 19.466 | n/a | n/a | 0.027 | 5.805 | 0.150 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000139 | 36.965 | 7.101 | 0.178 | 0.250 | 0.067 | 3.672 | 10.046 | 0.064 | n/a | 1.547 | 14.012 | n/a | n/a | 0.027 | 7.597 | 0.206 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000015b | 36.568 | 4.650 | 0.464 | 0.422 | 0.066 | 6.123 | 10.692 | 0.052 | n/a | 1.452 | 12.616 | n/a | n/a | 0.031 | 5.603 | 0.153 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000145 | 32.550 | 6.433 | 0.143 | 0.241 | 0.064 | 1.559 | 5.801 | 0.033 | n/a | 0.391 | 17.860 | n/a | n/a | 0.024 | 6.881 | 0.211 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000132 | 32.463 | 2.462 | n/a | 0.000 | 0.320 | 4.248 | 1.227 | 0.024 | n/a | 0.142 | 23.963 | n/a | n/a | 0.077 | 2.782 | 0.086 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000146 | 30.833 | 5.029 | n/a | 0.866 | 0.390 | 0.953 | 4.065 | 0.022 | n/a | 0.118 | 19.328 | n/a | n/a | 0.061 | 6.285 | 0.204 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000015e | 29.809 | 3.517 | n/a | 0.000 | 0.577 | 0.667 | 1.226 | 0.021 | n/a | 0.102 | 23.654 | n/a | n/a | 0.045 | 4.094 | 0.137 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 72b0616fc23aa55d000000000000011b | 29.074 | 8.340 | 0.352 | 0.321 | 0.070 | 2.529 | 7.400 | 0.038 | n/a | 0.505 | 9.490 | n/a | n/a | 0.029 | 9.083 | 0.312 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000012d | 28.784 | 4.453 | 0.150 | 0.227 | 0.048 | 2.030 | 6.881 | 0.039 | n/a | 0.116 | 14.823 | n/a | n/a | 0.018 | 4.877 | 0.169 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000012a | 28.683 | 2.922 | n/a | 0.000 | 0.897 | 0.983 | 3.364 | 0.087 | n/a | 0.205 | 20.202 | n/a | n/a | 0.022 | 3.819 | 0.133 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.125ms |
| 72b0616fc23aa55d0000000000000163 | 27.834 | 8.057 | 0.179 | 1.195 | 0.056 | 1.979 | 9.591 | 0.053 | n/a | 0.470 | 6.229 | n/a | n/a | 0.026 | 9.486 | 0.341 | 0.026 | gw-w/thread-47/gateway.admitted-work | none observed |
| 72b0616fc23aa55d0000000000000149 | 26.594 | 3.646 | 0.139 | 0.229 | 0.050 | 1.222 | 12.465 | 0.038 | n/a | 0.378 | 8.404 | n/a | n/a | 0.023 | 4.064 | 0.153 | 0.023 | gw-w/thread-46/gateway.admitted-work | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.640 | 0.433 | 0.000 | 0.482 | 2.049 | n/a | 0.000 | 0.504 | 0.876 | 1.438 | 0.022 | n/a | 0.470 | 11.390 | n/a | n/a | 0.027 | 2.589 | 0.162 | 0.027 |
| p99 | 128.453 | 1.668 | 0.000 | 0.855 | 3.717 | n/a | 0.000 | 1.072 | 4.248 | 29.884 | 0.163 | n/a | 3.823 | 94.386 | n/a | n/a | 0.077 | 4.221 | 0.233 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d0000000000000125 | 128.453 | 1.776 | n/a | 0.000 | 0.876 | 0.788 | 29.884 | 0.044 | n/a | 0.670 | 94.386 | n/a | n/a | 0.029 | 2.652 | 0.021 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 72b0616fc23aa55d0000000000000166 | 96.485 | 1.904 | n/a | 0.000 | 0.686 | 2.909 | 1.214 | 0.023 | n/a | 1.454 | 88.270 | n/a | n/a | 0.025 | 2.589 | 0.027 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 72b0616fc23aa55d0000000000000156 | 51.900 | 1.705 | n/a | 0.000 | 0.787 | 0.991 | 1.614 | 0.019 | n/a | 0.695 | 46.044 | n/a | n/a | 0.045 | 2.492 | 0.048 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000132 | 32.463 | 2.462 | n/a | 0.000 | 0.320 | 4.248 | 1.227 | 0.024 | n/a | 0.142 | 23.963 | n/a | n/a | 0.077 | 2.782 | 0.086 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000130 | 23.515 | 2.049 | n/a | 0.000 | 0.063 | 2.846 | 1.438 | 0.020 | n/a | 0.851 | 16.228 | n/a | n/a | 0.021 | 2.112 | 0.090 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000118 | 22.074 | 2.886 | n/a | 0.000 | 0.956 | 0.664 | 1.408 | 0.022 | n/a | 0.470 | 15.626 | n/a | n/a | 0.041 | 3.842 | 0.174 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000012e | 18.509 | 3.717 | n/a | 0.000 | 0.504 | 0.758 | 1.282 | 0.020 | n/a | 0.103 | 12.104 | n/a | n/a | 0.021 | 4.221 | 0.228 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000014a | 16.640 | 2.313 | n/a | 0.000 | 0.382 | 0.865 | 1.114 | 0.021 | n/a | 3.823 | 8.098 | n/a | n/a | 0.025 | 2.695 | 0.162 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000116 | 15.993 | 1.686 | n/a | 0.000 | 0.516 | 0.773 | 1.382 | 0.023 | n/a | 0.197 | 11.390 | n/a | n/a | 0.027 | 2.201 | 0.138 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000152 | 15.006 | 2.353 | n/a | 0.000 | 0.267 | 0.751 | 1.608 | 0.022 | n/a | 0.113 | 9.868 | n/a | n/a | 0.023 | 2.620 | 0.175 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000134 | 14.493 | 1.896 | n/a | 0.000 | 0.238 | 0.651 | 1.464 | 0.163 | n/a | 0.476 | 9.583 | n/a | n/a | 0.022 | 2.134 | 0.147 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000014e | 13.699 | 2.120 | n/a | 0.000 | 1.072 | 0.916 | 1.654 | 0.023 | n/a | 3.535 | 4.348 | n/a | n/a | 0.031 | 3.192 | 0.233 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000140 | 13.473 | 1.911 | n/a | 0.000 | 0.585 | 0.876 | 1.532 | 0.022 | n/a | 0.424 | 8.069 | n/a | n/a | 0.054 | 2.496 | 0.185 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 72b0616fc23aa55d000000000000015c | 13.362 | 2.266 | n/a | 0.000 | 0.073 | 0.979 | 1.154 | 0.022 | n/a | 0.437 | 8.408 | n/a | n/a | 0.024 | 2.339 | 0.175 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000011c | 13.148 | 1.872 | n/a | 0.000 | 0.486 | 0.935 | 1.505 | 0.028 | n/a | 0.151 | 8.145 | n/a | n/a | 0.027 | 2.358 | 0.179 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.245 | 0.218 | 0.000 | 0.481 | 2.166 | n/a | 0.000 | 0.723 | 0.623 | 0.944 | 0.012 | n/a | 0.098 | 4.916 | n/a | n/a | 0.014 | 3.217 | 0.300 | 0.014 |
| p99 | 43.613 | 2.928 | 0.044 | 3.334 | 6.815 | n/a | 2.416 | 19.302 | 7.670 | 6.641 | 0.057 | n/a | 3.219 | 25.847 | n/a | n/a | 0.050 | 22.587 | 0.724 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d0000000000000182 | 105.470 | 2.356 | n/a | 0.000 | 0.718 | 0.566 | 1.215 | 0.022 | n/a | 0.120 | 100.453 | n/a | n/a | 0.019 | 3.074 | 0.029 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.373ms |
| 72b0616fc23aa55d000000000000110e | 88.421 | 1.871 | n/a | 0.000 | 77.414 | 0.598 | 1.107 | 0.024 | n/a | 0.166 | 7.231 | n/a | n/a | 0.010 | 79.285 | 0.897 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.145ms; driver.expected-state.bind-receipt 2.061ms; driver.publication.persist-deferred 1.564ms; driver.expected-state.bind-receipt 1.306ms; driver.publication.persist-deferred 1.232ms |
| 72b0616fc23aa55d00000000000001b4 | 87.806 | 8.183 | 0.185 | 0.392 | 0.042 | 0.843 | 3.957 | 0.030 | n/a | 0.402 | 73.749 | n/a | n/a | 0.023 | 8.802 | 0.100 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.156ms |
| 72b0616fc23aa55d0000000000000760 | 80.942 | 5.486 | n/a | 0.698 | 56.480 | 4.085 | 1.627 | 0.016 | n/a | 0.071 | 12.468 | n/a | n/a | 0.013 | 62.664 | 0.774 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.389ms; client.encode 2.114ms; driver.publication.persist-deferred 1.394ms; driver.expected-state.bind-receipt 1.308ms; driver.publication.persist-deferred 1.274ms |
| 72b0616fc23aa55d000000000000110d | 78.336 | 3.552 | n/a | 0.000 | 59.073 | 0.625 | 0.963 | 0.012 | n/a | 0.298 | 13.800 | n/a | n/a | 0.014 | 62.625 | 0.799 | 0.014 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.145ms; driver.expected-state.bind-receipt 2.061ms; driver.publication.persist-deferred 1.564ms; driver.expected-state.bind-receipt 1.306ms; driver.publication.persist-deferred 1.232ms |
| 72b0616fc23aa55d00000000000014c9 | 77.080 | 9.502 | n/a | 0.979 | 36.039 | 14.345 | 1.295 | 0.024 | n/a | 0.057 | 14.829 | n/a | n/a | 0.009 | 46.521 | 0.604 | 0.009 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 33.517ms; driver.publication.persist-deferred 1.473ms; driver.publication.persist-deferred 1.328ms; driver.reader-basis.broadcast 0.663ms |
| 72b0616fc23aa55d00000000000014c8 | 72.455 | 6.377 | n/a | 0.000 | 35.845 | 12.686 | 1.788 | 0.018 | n/a | 3.880 | 11.829 | n/a | n/a | 0.032 | 42.223 | 0.583 | 0.032 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 33.517ms; driver.publication.persist-deferred 1.328ms; driver.reader-basis.broadcast 0.663ms |
| 72b0616fc23aa55d00000000000014c6 | 70.824 | 5.262 | n/a | 0.000 | 13.627 | 16.921 | 1.678 | 0.028 | n/a | 0.154 | 33.139 | n/a | n/a | 0.014 | 18.889 | 0.267 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 33.517ms |
| 72b0616fc23aa55d0000000000000193 | 68.045 | 1.496 | n/a | 0.678 | 0.543 | 7.215 | 1.149 | 0.033 | n/a | 0.143 | 56.774 | n/a | n/a | 0.015 | 2.718 | 0.040 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 5.262ms; driver.reader-basis.broadcast 0.048ms |
| 72b0616fc23aa55d0000000000000183 | 67.294 | 6.595 | 0.236 | 0.259 | 0.064 | 1.586 | 26.001 | 0.039 | n/a | 0.120 | 32.364 | n/a | n/a | 0.028 | 7.155 | 0.106 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.496ms; driver.reader-basis.broadcast 0.137ms |
| 72b0616fc23aa55d0000000000000192 | 66.933 | 2.906 | n/a | 0.000 | 0.413 | 0.820 | 1.194 | 0.018 | n/a | 0.102 | 61.429 | n/a | n/a | 0.050 | 3.319 | 0.050 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 72b0616fc23aa55d0000000000000497 | 66.566 | 12.276 | n/a | 6.081 | 0.927 | 8.292 | 10.537 | 0.074 | n/a | 6.001 | 22.357 | n/a | n/a | 0.019 | 19.284 | 0.290 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.171ms; driver.publication.persist-deferred 0.937ms |
| 72b0616fc23aa55d00000000000014d0 | 65.854 | 3.840 | n/a | 0.000 | 41.455 | 0.482 | 1.078 | 0.016 | n/a | 0.260 | 18.708 | n/a | n/a | 0.015 | 45.295 | 0.688 | 0.015 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.116ms; driver.publication.persist-deferred 1.548ms; driver.publication.persist-deferred 1.473ms; driver.publication.persist-deferred 1.427ms; driver.publication.persist-deferred 1.402ms |
| 72b0616fc23aa55d000000000000075e | 62.480 | 1.675 | n/a | 0.000 | 36.217 | 0.574 | 1.466 | 0.027 | n/a | 1.549 | 20.960 | n/a | n/a | 0.012 | 37.891 | 0.606 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.389ms; driver.publication.persist-deferred 1.394ms; driver.expected-state.bind-receipt 1.308ms; driver.publication.persist-deferred 1.274ms; driver.publication.persist-deferred 1.198ms |
| 72b0616fc23aa55d0000000000001115 | 61.854 | 3.132 | n/a | 0.000 | 51.355 | 0.625 | 1.833 | 0.027 | n/a | 0.172 | 4.700 | n/a | n/a | 0.011 | 54.487 | 0.881 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.623ms; driver.publication.persist-deferred 1.564ms; driver.expected-state.bind-receipt 1.306ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.184ms |
| 72b0616fc23aa55d000000000000110c | 61.274 | 6.862 | n/a | 0.000 | 0.551 | 13.078 | 30.251 | 0.048 | n/a | 0.158 | 10.314 | n/a | n/a | 0.012 | 7.413 | 0.121 | 0.012 | gw-w/thread-45/commit.prepare-and-validate | driver.expected-state.bind-receipt 3.145ms; driver.expected-state.bind-receipt 2.061ms; driver.publication.persist-deferred 1.564ms; driver.publication.persist-deferred 1.141ms |
| 72b0616fc23aa55d00000000000001e4 | 59.412 | 5.225 | 0.248 | 0.662 | 0.033 | 1.110 | 3.245 | 0.033 | n/a | 0.100 | 48.737 | n/a | n/a | 0.018 | 6.169 | 0.104 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d000000000000084c | 58.942 | 2.106 | n/a | 0.624 | 38.880 | 0.440 | 1.037 | 0.011 | n/a | 0.079 | 15.754 | n/a | n/a | 0.010 | 41.610 | 0.706 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 8.394ms; driver.publication.persist-deferred 1.152ms; driver.expected-state.bind-receipt 1.112ms; driver.publication.persist-deferred 1.045ms; driver.publication.persist-deferred 0.980ms |
| 72b0616fc23aa55d0000000000001113 | 58.373 | 2.822 | n/a | 0.000 | 46.421 | 0.652 | 0.953 | 0.011 | n/a | 0.241 | 7.256 | n/a | n/a | 0.016 | 49.243 | 0.844 | 0.016 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.061ms; driver.publication.persist-deferred 1.623ms; driver.publication.persist-deferred 1.564ms; driver.expected-state.bind-receipt 1.306ms; driver.publication.persist-deferred 1.232ms |
| 72b0616fc23aa55d0000000000000358 | 58.145 | 1.464 | n/a | 0.000 | 41.319 | 1.036 | 1.191 | 0.020 | n/a | 0.052 | 13.053 | n/a | n/a | 0.010 | 42.783 | 0.736 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.189ms; driver.expected-state.bind-receipt 1.167ms; driver.publication.persist-deferred 1.094ms; driver.publication.persist-deferred 1.010ms; driver.publication.persist-deferred 0.998ms |

## P2 / tail / commit / 5-10 facts (2079 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.780 | 0.000 | 0.000 | 0.384 | 1.671 | n/a | 0.000 | 0.745 | 0.598 | 0.808 | 0.012 | n/a | 0.097 | 4.507 | n/a | n/a | 0.013 | 2.644 | 0.281 | 0.013 |
| p99 | 37.718 | 1.802 | 0.026 | 1.240 | 5.092 | n/a | 1.185 | 17.452 | 7.215 | 5.030 | 0.052 | n/a | 2.879 | 21.276 | n/a | n/a | 0.046 | 18.889 | 0.731 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72b0616fc23aa55d000000000000110e | 88.421 | 1.871 | n/a | 0.000 | 77.414 | 0.598 | 1.107 | 0.024 | n/a | 0.166 | 7.231 | n/a | n/a | 0.010 | 79.285 | 0.897 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.145ms; driver.expected-state.bind-receipt 2.061ms; driver.publication.persist-deferred 1.564ms; driver.expected-state.bind-receipt 1.306ms; driver.publication.persist-deferred 1.232ms |
| 72b0616fc23aa55d00000000000014c6 | 70.824 | 5.262 | n/a | 0.000 | 13.627 | 16.921 | 1.678 | 0.028 | n/a | 0.154 | 33.139 | n/a | n/a | 0.014 | 18.889 | 0.267 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 33.517ms |
| 72b0616fc23aa55d0000000000000193 | 68.045 | 1.496 | n/a | 0.678 | 0.543 | 7.215 | 1.149 | 0.033 | n/a | 0.143 | 56.774 | n/a | n/a | 0.015 | 2.718 | 0.040 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 5.262ms; driver.reader-basis.broadcast 0.048ms |
| 72b0616fc23aa55d000000000000075e | 62.480 | 1.675 | n/a | 0.000 | 36.217 | 0.574 | 1.466 | 0.027 | n/a | 1.549 | 20.960 | n/a | n/a | 0.012 | 37.891 | 0.606 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.389ms; driver.publication.persist-deferred 1.394ms; driver.expected-state.bind-receipt 1.308ms; driver.publication.persist-deferred 1.274ms; driver.publication.persist-deferred 1.198ms |
| 72b0616fc23aa55d000000000000110c | 61.274 | 6.862 | n/a | 0.000 | 0.551 | 13.078 | 30.251 | 0.048 | n/a | 0.158 | 10.314 | n/a | n/a | 0.012 | 7.413 | 0.121 | 0.012 | gw-w/thread-45/commit.prepare-and-validate | driver.expected-state.bind-receipt 3.145ms; driver.expected-state.bind-receipt 2.061ms; driver.publication.persist-deferred 1.564ms; driver.publication.persist-deferred 1.141ms |
| 72b0616fc23aa55d0000000000001113 | 58.373 | 2.822 | n/a | 0.000 | 46.421 | 0.652 | 0.953 | 0.011 | n/a | 0.241 | 7.256 | n/a | n/a | 0.016 | 49.243 | 0.844 | 0.016 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.061ms; driver.publication.persist-deferred 1.623ms; driver.publication.persist-deferred 1.564ms; driver.expected-state.bind-receipt 1.306ms; driver.publication.persist-deferred 1.232ms |
| 72b0616fc23aa55d0000000000000358 | 58.145 | 1.464 | n/a | 0.000 | 41.319 | 1.036 | 1.191 | 0.020 | n/a | 0.052 | 13.053 | n/a | n/a | 0.010 | 42.783 | 0.736 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.189ms; driver.expected-state.bind-receipt 1.167ms; driver.publication.persist-deferred 1.094ms; driver.publication.persist-deferred 1.010ms; driver.publication.persist-deferred 0.998ms |
| 72b0616fc23aa55d000000000000084f | 55.336 | 1.938 | n/a | 0.000 | 44.179 | 0.348 | 1.413 | 0.029 | n/a | 0.139 | 7.278 | n/a | n/a | 0.012 | 46.117 | 0.833 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 8.394ms; driver.publication.persist-deferred 1.164ms; driver.expected-state.bind-receipt 1.112ms; driver.publication.persist-deferred 1.045ms; driver.publication.persist-deferred 0.973ms |
| 72b0616fc23aa55d00000000000014cf | 51.692 | 2.213 | n/a | 0.000 | 25.819 | 14.966 | 1.414 | 0.026 | n/a | 0.508 | 6.737 | n/a | n/a | 0.010 | 28.032 | 0.542 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.116ms; driver.publication.persist-deferred 1.548ms; driver.publication.persist-deferred 1.473ms; driver.publication.persist-deferred 1.328ms; driver.publication.persist-deferred 1.231ms |
| 72b0616fc23aa55d0000000000000ee0 | 43.229 | 2.435 | n/a | 1.117 | 31.764 | 2.430 | 0.871 | 0.015 | n/a | 0.354 | 4.225 | n/a | n/a | 0.017 | 35.316 | 0.817 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.125ms; driver.publication.persist-deferred 1.660ms; driver.publication.persist-deferred 1.410ms; driver.publication.persist-deferred 1.331ms; driver.expected-state.bind-receipt 1.097ms |
| 72b0616fc23aa55d0000000000000357 | 42.496 | 2.132 | n/a | 0.000 | 29.668 | 4.606 | 0.826 | 0.016 | n/a | 0.057 | 5.173 | n/a | n/a | 0.017 | 31.800 | 0.748 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.189ms; driver.expected-state.bind-receipt 1.167ms; driver.publication.persist-deferred 0.998ms; driver.publication.persist-deferred 0.966ms; driver.publication.persist-deferred 0.813ms |
| 72b0616fc23aa55d00000000000001c9 | 42.421 | 1.578 | n/a | 0.000 | 0.890 | 1.134 | 1.395 | 0.026 | n/a | 0.539 | 36.828 | n/a | n/a | 0.031 | 2.467 | 0.058 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d00000000000015b5 | 42.023 | 6.835 | n/a | 0.000 | 0.352 | 27.256 | 1.996 | 0.018 | n/a | 0.071 | 5.471 | n/a | n/a | 0.025 | 7.187 | 0.171 | 0.025 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.927ms; driver.publication.persist-deferred 1.543ms; driver.publication.persist-deferred 1.444ms; driver.publication.persist-deferred 1.271ms; driver.publication.persist-deferred 0.984ms |
| 72b0616fc23aa55d0000000000001a0a | 41.997 | 3.998 | n/a | 0.000 | 32.503 | 1.694 | 1.964 | 0.028 | n/a | 0.332 | 1.467 | n/a | n/a | 0.010 | 36.501 | 0.869 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.339ms; driver.publication.persist-deferred 1.231ms; driver.publication.persist-deferred 1.146ms; driver.publication.persist-deferred 1.131ms; driver.publication.persist-deferred 0.849ms |
| 72b0616fc23aa55d0000000000001a06 | 41.486 | 5.298 | n/a | 0.000 | 0.524 | 2.279 | 0.409 | 0.004 | n/a | 0.009 | 32.957 | n/a | n/a | 0.006 | 5.822 | 0.140 | 0.006 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72b0616fc23aa55d0000000000000c6a | 41.406 | 1.431 | n/a | 0.000 | 3.404 | 3.512 | 0.831 | 0.011 | n/a | 1.631 | 30.578 | n/a | n/a | 0.008 | 4.835 | 0.117 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.913ms; driver.publication.persist-deferred 0.902ms; driver.reader-basis.broadcast 0.201ms |
| 72b0616fc23aa55d0000000000001a07 | 40.337 | 2.095 | n/a | 0.000 | 4.038 | 3.521 | 0.393 | 0.004 | n/a | 0.695 | 29.577 | n/a | n/a | 0.014 | 6.133 | 0.152 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.339ms |
| 72b0616fc23aa55d00000000000014cd | 39.656 | 2.056 | n/a | 0.000 | 10.864 | 6.488 | 1.173 | 0.030 | n/a | 3.192 | 15.831 | n/a | n/a | 0.023 | 12.919 | 0.326 | 0.023 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.548ms; driver.publication.persist-deferred 1.473ms; driver.publication.persist-deferred 1.328ms; driver.expected-state.add-commit 1.067ms; driver.publication.persist-deferred 1.012ms |
| 72b0616fc23aa55d0000000000000edd | 39.343 | 2.464 | n/a | 0.000 | 3.939 | 4.714 | 0.976 | 0.014 | n/a | 1.258 | 25.947 | n/a | n/a | 0.031 | 6.404 | 0.163 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.125ms; driver.publication.persist-deferred 1.331ms; driver.expected-state.bind-receipt 1.097ms |
| 72b0616fc23aa55d00000000000014cc | 38.875 | 1.698 | n/a | 0.000 | 26.488 | 0.417 | 1.226 | 0.021 | n/a | 0.318 | 8.693 | n/a | n/a | 0.013 | 28.186 | 0.725 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.548ms; driver.publication.persist-deferred 1.473ms; driver.publication.persist-deferred 1.328ms; driver.expected-state.add-commit 1.067ms; driver.publication.persist-deferred 0.899ms |

## P1 / warmup / read (2112 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 277.700 | n/a | n/a | n/a | 1.827 | n/a | 0.000 | 277.674 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.235 | 277.699 | 1.000 | 0.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc96e88a9e782a470000000000001de1 | 295.919 | 1.827 | n/a | 0.000 | 294.088 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 295.915 | 1.000 | 0.004 | node-14/thread-7/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c1000000000000117d | 295.103 | 0.362 | n/a | 0.000 | 294.739 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 295.101 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c10000000000001181 | 294.973 | 0.017 | n/a | 0.000 | 294.955 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.972 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c1000000000000117e | 294.965 | 0.044 | n/a | 0.000 | 294.920 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.964 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c10000000000001180 | 294.963 | 0.017 | n/a | 0.000 | 294.945 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.962 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c1000000000000117f | 294.957 | 0.020 | n/a | 0.000 | 294.937 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.956 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc96e88a9e782a470000000000001e0d | 294.942 | 0.019 | n/a | 0.000 | 294.922 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.941 | 1.000 | 0.001 | node-14/thread-7/reader.straddle-await-ack | none observed |
| cc96e88a9e782a470000000000001e0a | 294.927 | 0.048 | n/a | 0.000 | 294.878 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.926 | 1.000 | 0.001 | node-14/thread-7/reader.straddle-await-ack | none observed |
| cc96e88a9e782a470000000000001e0c | 294.923 | 0.017 | n/a | 0.000 | 294.905 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.922 | 1.000 | 0.001 | node-14/thread-7/reader.straddle-await-ack | none observed |
| cc96e88a9e782a470000000000001e0b | 294.914 | 0.018 | n/a | 0.000 | 294.895 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.913 | 1.000 | 0.001 | node-14/thread-7/reader.straddle-await-ack | none observed |
| 241234496615c51e0000000000001278 | 294.824 | 0.479 | n/a | 0.000 | 294.343 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 294.821 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e0000000000001279 | 294.439 | 0.066 | n/a | 0.000 | 294.370 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 294.436 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e000000000000129d | 293.554 | 0.046 | n/a | 0.000 | 293.506 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.552 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e000000000000129e | 293.507 | 0.024 | n/a | 0.000 | 293.481 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.505 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e000000000000129f | 293.493 | 0.021 | n/a | 0.000 | 293.471 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.491 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000000012a0 | 293.482 | 0.020 | n/a | 0.000 | 293.460 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.480 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c1000000000003c625 | 278.147 | 0.088 | n/a | 0.000 | 278.059 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.146 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| 2864f2129ae8e9c1000000000003c624 | 278.116 | 0.194 | n/a | 0.000 | 277.921 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.115 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| 2864f2129ae8e9c1000000000003c623 | 277.952 | 0.022 | n/a | 0.000 | 277.929 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.951 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| 2864f2129ae8e9c1000000000003c622 | 277.931 | 0.038 | n/a | 0.000 | 277.892 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.930 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.022ms |

## P1 / L1 / read (726 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 271.591 | n/a | n/a | n/a | 0.177 | n/a | 0.000 | 271.463 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.086 | 271.589 | 1.000 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 241234496615c51e00000000000f9bb2 | 297.809 | 0.105 | n/a | 0.000 | 297.702 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.807 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000000fbb85 | 283.428 | 0.130 | n/a | 0.000 | 283.295 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.425 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 241234496615c51e0000000000106689 | 280.258 | 0.211 | n/a | 0.000 | 280.043 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 280.254 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001323b8 | 278.549 | 0.125 | n/a | 0.000 | 278.422 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.547 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e000000000012277d | 274.317 | 0.124 | n/a | 0.000 | 274.192 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.315 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000000ee0ce | 273.321 | 0.297 | n/a | 0.000 | 273.020 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 273.317 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000000cc6f8 | 272.658 | 0.184 | n/a | 0.000 | 272.472 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.656 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000000b0107 | 271.591 | 0.126 | n/a | 0.000 | 271.463 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.589 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 241234496615c51e00000000000b1f4a | 270.656 | 0.104 | n/a | 0.000 | 270.549 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.653 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e0000000000101d6d | 268.146 | 0.173 | n/a | 0.000 | 267.971 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.143 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e0000000000102483 | 267.781 | 0.110 | n/a | 0.000 | 267.668 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 267.778 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e0000000000111f2b | 267.161 | 0.133 | n/a | 0.000 | 267.026 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.159 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 241234496615c51e00000000000ffdb8 | 266.013 | 0.134 | n/a | 0.000 | 265.877 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.011 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001302c0 | 265.874 | 0.177 | n/a | 0.000 | 265.694 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 265.871 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e0000000000102489 | 265.024 | 0.245 | n/a | 0.000 | 264.773 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 265.018 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 241234496615c51e00000000000ef2b1 | 263.880 | 0.130 | n/a | 0.000 | 263.748 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 263.878 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 241234496615c51e00000000000ffdc2 | 170.241 | 0.221 | n/a | 0.000 | 170.014 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 170.235 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 241234496615c51e00000000000f9bbf | 80.884 | 34.843 | n/a | 3.417 | 0.000 | 0.824 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.800 | 38.260 | 0.473 | 41.800 | node-14/thread-5/socket.wait-first-byte | replica.apply-delta 0.031ms |
| 241234496615c51e000000000010249c | 43.183 | 0.240 | n/a | 0.000 | 42.938 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 43.177 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 241234496615c51e0000000000102497 | 20.015 | 0.132 | n/a | 0.000 | 19.868 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 20.000 | 0.999 | 0.016 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |

## P1 / L4 / read (1834 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 275.270 | n/a | n/a | n/a | 0.179 | n/a | 0.000 | 275.164 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.115 | 275.268 | 1.000 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 241234496615c51e0000000000141d16 | 288.441 | 0.104 | n/a | 0.000 | 288.334 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 288.438 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e0000000000141d17 | 288.425 | 0.024 | n/a | 0.000 | 288.399 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.423 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c10000000000097108 | 287.744 | 0.106 | n/a | 0.000 | 287.634 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.741 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc96e88a9e782a47000000000009793e | 287.721 | 0.120 | n/a | 0.000 | 287.599 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.719 | 1.000 | 0.002 | node-14/thread-7/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001c1ff1 | 281.892 | 0.024 | n/a | 0.000 | 281.867 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.891 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001c1ff0 | 281.837 | 0.090 | n/a | 0.000 | 281.745 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.835 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c100000000001091cf | 280.756 | 0.179 | n/a | 0.000 | 280.575 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.754 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc96e88a9e782a470000000000105f28 | 280.718 | 0.236 | n/a | 0.000 | 280.480 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.715 | 1.000 | 0.003 | node-14/thread-7/reader.straddle-await-ack | none observed |
| cc96e88a9e782a470000000000118a2f | 279.705 | 0.141 | n/a | 0.000 | 279.561 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.701 | 1.000 | 0.003 | node-14/thread-7/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001d8b39 | 279.149 | 0.023 | n/a | 0.000 | 279.124 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.147 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001d8b38 | 279.137 | 0.119 | n/a | 0.000 | 279.015 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.134 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c1000000000011d330 | 278.712 | 0.140 | n/a | 0.000 | 278.569 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.709 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 241234496615c51e000000000018575f | 278.684 | 0.046 | n/a | 0.000 | 278.637 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.683 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e000000000018575e | 278.679 | 0.291 | n/a | 0.000 | 278.385 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.676 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c100000000000d3bf0 | 277.468 | 0.175 | n/a | 0.000 | 277.291 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.466 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc96e88a9e782a47000000000009fb19 | 275.350 | 0.084 | n/a | 0.000 | 275.263 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.347 | 1.000 | 0.002 | node-14/thread-7/reader.straddle-await-ack | replica.apply-delta 0.063ms |
| 241234496615c51e000000000014b1b5 | 275.310 | 0.022 | n/a | 0.000 | 275.286 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.308 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 241234496615c51e000000000014b1b4 | 275.305 | 0.098 | n/a | 0.000 | 275.203 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.302 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 2864f2129ae8e9c1000000000009f95b | 275.270 | 0.104 | n/a | 0.000 | 275.164 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.268 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| 2864f2129ae8e9c100000000000ef5f3 | 275.225 | 0.112 | n/a | 0.000 | 275.109 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 275.221 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / L16 / read (2148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 345.824 | n/a | n/a | n/a | 0.277 | n/a | 0.000 | 345.773 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.242 | 345.823 | 1.000 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2864f2129ae8e9c10000000000140636 | 378.624 | 0.078 | n/a | 0.000 | 378.546 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.623 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c10000000000140638 | 378.589 | 0.013 | n/a | 0.000 | 378.575 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.588 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c10000000000140637 | 378.583 | 0.014 | n/a | 0.000 | 378.568 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.582 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c10000000000140635 | 378.571 | 0.118 | n/a | 0.000 | 378.451 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 378.569 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c10000000000140646 | 378.405 | 0.059 | n/a | 0.000 | 378.345 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.404 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc96e88a9e782a47000000000013aee7 | 378.033 | 0.013 | n/a | 0.000 | 378.019 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.032 | 1.000 | 0.001 | node-14/thread-7/reader.straddle-await-ack | none observed |
| cc96e88a9e782a47000000000013aee6 | 378.025 | 0.014 | n/a | 0.000 | 378.010 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.024 | 1.000 | 0.001 | node-14/thread-7/reader.straddle-await-ack | none observed |
| cc96e88a9e782a47000000000013aee5 | 378.013 | 0.014 | n/a | 0.000 | 377.999 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.013 | 1.000 | 0.001 | node-14/thread-7/reader.straddle-await-ack | none observed |
| cc96e88a9e782a47000000000013aee4 | 378.001 | 0.020 | n/a | 0.000 | 377.981 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.000 | 1.000 | 0.001 | node-14/thread-7/reader.straddle-await-ack | none observed |
| cc96e88a9e782a47000000000013aee3 | 377.969 | 0.137 | n/a | 0.000 | 377.830 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 377.967 | 1.000 | 0.002 | node-14/thread-7/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001fcdf5 | 377.762 | 0.077 | n/a | 0.000 | 377.684 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.761 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001fcdf7 | 377.740 | 0.014 | n/a | 0.000 | 377.726 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.740 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001fcdf4 | 377.740 | 0.033 | n/a | 0.000 | 377.705 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.739 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001fcdf6 | 377.721 | 0.017 | n/a | 0.000 | 377.703 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.720 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001fcdf3 | 377.695 | 0.277 | n/a | 0.000 | 377.416 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 377.693 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000001fce14 | 377.300 | 0.064 | n/a | 0.000 | 377.235 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.299 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c100000000001b767c | 345.965 | 0.181 | n/a | 0.000 | 345.782 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.963 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2864f2129ae8e9c100000000001b767b | 345.910 | 0.237 | n/a | 0.000 | 345.671 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 345.907 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 241234496615c51e00000000002718ae | 345.851 | 0.014 | n/a | 0.000 | 345.836 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 345.850 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| cc96e88a9e782a4700000000001b0127 | 345.847 | 0.091 | n/a | 0.000 | 345.756 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 345.847 | 1.000 | 0.001 | node-14/thread-7/reader.straddle-await-ack | none observed |

## P1 / tail / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.062 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.062 | 0.000 | 0.000 | 0.062 |
| p99 | 0.125 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc96e88a9e782a4700000000001b4522 | 0.125 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | uncovered | none observed |
| cc96e88a9e782a4700000000001b4525 | 0.086 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | uncovered | none observed |
| 2864f2129ae8e9c100000000001bbc2a | 0.077 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | uncovered | none observed |
| cc96e88a9e782a4700000000001b4523 | 0.062 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.062 | 0.000 | 0.000 | 0.062 | uncovered | none observed |
| 2864f2129ae8e9c100000000001bbc2b | 0.021 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.000 | 0.000 | 0.021 | uncovered | none observed |
| 2864f2129ae8e9c100000000001bbc2c | 0.017 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 | uncovered | none observed |
| cc96e88a9e782a4700000000001b4524 | 0.015 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 | uncovered | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1011.196 | n/a | n/a | n/a | 0.278 | n/a | 0.000 | 0.000 | 4.513 | 1004.540 | 0.027 | n/a | 0.195 | 0.000 | n/a | n/a | 1.091 | 0.278 | 0.000 | 1.091 |
| p99 | 1054.718 | n/a | n/a | n/a | 35.425 | n/a | 0.000 | 0.000 | 5.747 | 1008.522 | 0.126 | n/a | 0.276 | 0.000 | n/a | n/a | 6.187 | 35.425 | 0.034 | 6.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71e367559112f7990000000000000019 | 1054.718 | 35.425 | n/a | 0.000 | 0.000 | 4.513 | 1008.522 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 6.187 | 35.425 | 0.034 | 6.187 | gw-r/thread-47/journal/page | none observed |
| 71e367559112f7990000000000000017 | 1011.196 | 0.278 | n/a | 0.000 | 0.000 | 5.747 | 1004.540 | 0.027 | n/a | 0.276 | 0.000 | n/a | n/a | 0.330 | 0.278 | 0.000 | 0.330 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f7990000000000000018 | 1004.906 | 0.137 | n/a | 0.000 | 0.000 | 1.032 | 1002.324 | 0.126 | n/a | 0.195 | 0.000 | n/a | n/a | 1.091 | 0.137 | 0.000 | 1.091 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 457.578 | n/a | n/a | n/a | 3.277 | n/a | 0.000 | 0.000 | 1.098 | 454.598 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.098 | 3.277 | 0.008 | 0.098 |
| p99 | 1022.046 | n/a | n/a | n/a | 16.084 | n/a | 0.575 | 0.000 | 15.685 | 1003.926 | 0.111 | n/a | 0.196 | 0.000 | n/a | n/a | 3.556 | 16.084 | 0.325 | 3.556 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71e367559112f799000000000000002e | 1022.046 | 2.191 | n/a | 0.000 | 0.000 | 15.685 | 1003.926 | 0.021 | n/a | 0.145 | 0.000 | n/a | n/a | 0.079 | 2.191 | 0.002 | 0.079 | gw-r/thread-63/journal/page | none observed |
| 71e367559112f7990000000000000042 | 1000.829 | 4.886 | n/a | 0.000 | 0.000 | 0.906 | 994.813 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.133 | 4.886 | 0.005 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 71e367559112f7990000000000000028 | 998.968 | 7.239 | n/a | 0.000 | 0.000 | 6.442 | 985.130 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.096 | 7.239 | 0.007 | 0.096 | gw-r/thread-44/journal/page | none observed |
| 71e367559112f7990000000000000022 | 984.094 | 2.526 | n/a | 0.000 | 0.000 | 0.746 | 980.599 | 0.020 | n/a | 0.127 | 0.000 | n/a | n/a | 0.076 | 2.526 | 0.003 | 0.076 | gw-r/thread-43/journal/page | none observed |
| 71e367559112f799000000000000002f | 981.728 | 2.339 | n/a | 0.000 | 0.000 | 1.134 | 978.061 | 0.011 | n/a | 0.109 | 0.000 | n/a | n/a | 0.075 | 2.339 | 0.002 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 71e367559112f799000000000000001c | 878.244 | 6.979 | n/a | 0.000 | 0.000 | 3.018 | 868.000 | 0.010 | n/a | 0.131 | 0.000 | n/a | n/a | 0.106 | 6.979 | 0.008 | 0.106 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f799000000000000001f | 874.169 | 2.233 | n/a | 0.000 | 0.000 | 0.745 | 870.730 | 0.021 | n/a | 0.143 | 0.000 | n/a | n/a | 0.298 | 2.233 | 0.003 | 0.298 | gw-r/thread-44/journal/page | none observed |
| 71e367559112f7990000000000000035 | 857.502 | 9.303 | n/a | 0.575 | 0.000 | 0.632 | 846.756 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.140 | 9.879 | 0.012 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f799000000000000003e | 722.944 | 5.391 | n/a | 0.000 | 0.000 | 1.885 | 715.309 | 0.018 | n/a | 0.125 | 0.000 | n/a | n/a | 0.216 | 5.391 | 0.007 | 0.216 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f7990000000000000027 | 611.173 | 2.238 | n/a | 0.000 | 0.000 | 5.276 | 603.338 | 0.044 | n/a | 0.196 | 0.000 | n/a | n/a | 0.081 | 2.238 | 0.004 | 0.081 | gw-r/thread-40/journal/page | none observed |
| 71e367559112f799000000000000003d | 548.484 | 7.905 | n/a | 0.000 | 0.000 | 2.228 | 538.173 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.083 | 7.905 | 0.014 | 0.083 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f7990000000000000034 | 513.205 | 2.097 | n/a | 0.000 | 0.000 | 0.952 | 509.881 | 0.035 | n/a | 0.155 | 0.000 | n/a | n/a | 0.085 | 2.097 | 0.004 | 0.085 | gw-r/thread-43/journal/page | none observed |
| 71e367559112f7990000000000000038 | 496.902 | 1.939 | n/a | 0.000 | 0.000 | 0.568 | 494.222 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.079 | 1.939 | 0.004 | 0.079 | gw-r/thread-40/journal/page | none observed |
| 71e367559112f7990000000000000039 | 496.609 | 2.302 | n/a | 0.000 | 0.000 | 0.530 | 493.578 | 0.015 | n/a | 0.106 | 0.000 | n/a | n/a | 0.079 | 2.302 | 0.005 | 0.079 | gw-r/thread-57/journal/page | none observed |
| 71e367559112f799000000000000003b | 457.578 | 2.100 | n/a | 0.000 | 0.000 | 0.728 | 454.598 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.079 | 2.100 | 0.005 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f799000000000000002b | 435.761 | 5.694 | n/a | 0.000 | 0.000 | 2.704 | 427.017 | 0.015 | n/a | 0.128 | 0.000 | n/a | n/a | 0.204 | 5.694 | 0.013 | 0.204 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f7990000000000000025 | 309.215 | 5.006 | n/a | 0.000 | 0.000 | 0.960 | 303.052 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.098 | 5.006 | 0.016 | 0.098 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f799000000000000001b | 296.150 | 3.962 | n/a | 0.000 | 0.000 | 1.073 | 290.573 | 0.111 | n/a | 0.133 | 0.000 | n/a | n/a | 0.297 | 3.962 | 0.013 | 0.297 | gw-r/thread-43/journal/page | none observed |
| 71e367559112f7990000000000000029 | 285.640 | 6.105 | n/a | 0.000 | 0.000 | 0.930 | 278.377 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.152 | 6.105 | 0.021 | 0.152 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f799000000000000003f | 263.658 | 2.367 | n/a | 0.000 | 0.000 | 1.973 | 259.145 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.098 | 2.367 | 0.009 | 0.098 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 448.018 | n/a | n/a | n/a | 3.158 | n/a | 0.233 | 0.000 | 0.758 | 444.203 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.102 | 3.529 | 0.009 | 0.102 |
| p99 | 1006.678 | n/a | n/a | n/a | 12.350 | n/a | 1.656 | 0.000 | 3.979 | 1002.417 | 0.076 | n/a | 3.136 | 0.000 | n/a | n/a | 39.212 | 13.118 | 0.360 | 39.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71e367559112f7990000000000000051 | 1006.678 | 0.198 | n/a | 0.000 | 0.000 | 3.979 | 1001.189 | 0.019 | n/a | 0.132 | 0.000 | n/a | n/a | 1.162 | 0.198 | 0.000 | 1.162 | gw-r/thread-63/journal/page | none observed |
| 71e367559112f7990000000000000071 | 1005.405 | 0.136 | n/a | 0.000 | 0.000 | 1.593 | 1002.417 | 0.021 | n/a | 0.135 | 0.000 | n/a | n/a | 1.104 | 0.136 | 0.000 | 1.104 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f799000000000000004c | 1005.053 | 3.002 | n/a | 0.282 | 0.000 | 0.893 | 1000.754 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.071 | 3.284 | 0.003 | 0.071 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f7990000000000000081 | 1002.927 | 0.193 | n/a | 0.000 | 0.000 | 1.022 | 1000.471 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 1.200 | 0.193 | 0.000 | 1.200 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f7990000000000000045 | 1001.582 | 4.988 | n/a | 0.000 | 0.000 | 1.114 | 995.191 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.195 | 4.988 | 0.005 | 0.195 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f7990000000000000079 | 1001.510 | 2.570 | n/a | 0.265 | 0.000 | 0.605 | 997.921 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.062 | 2.835 | 0.003 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 71e367559112f7990000000000000044 | 999.960 | 2.235 | n/a | 0.000 | 0.000 | 0.867 | 996.667 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.082 | 2.235 | 0.002 | 0.082 | gw-r/thread-44/journal/page | none observed |
| 71e367559112f799000000000000004b | 997.313 | 5.019 | n/a | 0.400 | 0.000 | 0.491 | 991.248 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.093 | 5.418 | 0.005 | 0.093 | gw-r/thread-57/journal/page | none observed |
| 71e367559112f7990000000000000074 | 955.387 | 4.004 | n/a | 0.000 | 0.000 | 0.845 | 950.355 | 0.018 | n/a | 0.098 | 0.000 | n/a | n/a | 0.067 | 4.004 | 0.004 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 71e367559112f7990000000000000050 | 881.016 | 2.625 | n/a | 0.315 | 0.000 | 0.663 | 877.213 | 0.009 | n/a | 0.090 | 0.000 | n/a | n/a | 0.102 | 2.940 | 0.003 | 0.102 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f7990000000000000076 | 867.727 | 2.396 | n/a | 0.343 | 0.000 | 0.786 | 863.798 | 0.023 | n/a | 0.076 | 0.000 | n/a | n/a | 0.305 | 2.739 | 0.003 | 0.305 | gw-r/thread-57/journal/page | none observed |
| 71e367559112f7990000000000000058 | 748.566 | 4.108 | n/a | 0.214 | 0.000 | 2.836 | 741.236 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.081 | 4.322 | 0.006 | 0.081 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f799000000000000005d | 671.893 | 2.058 | n/a | 0.000 | 0.000 | 0.833 | 668.869 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.068 | 2.058 | 0.003 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 71e367559112f799000000000000006e | 662.447 | 6.878 | n/a | 0.000 | 0.000 | 0.760 | 654.642 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.076 | 6.878 | 0.010 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f799000000000000004d | 581.190 | 6.695 | n/a | 0.555 | 0.000 | 0.636 | 573.037 | 0.026 | n/a | 0.109 | 0.000 | n/a | n/a | 0.130 | 7.250 | 0.012 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 71e367559112f799000000000000004f | 560.087 | 4.184 | n/a | 0.333 | 0.000 | 1.158 | 554.144 | 0.076 | n/a | 0.115 | 0.000 | n/a | n/a | 0.076 | 4.517 | 0.008 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f7990000000000000059 | 511.214 | 3.429 | n/a | 0.233 | 0.000 | 0.542 | 506.824 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.104 | 3.662 | 0.007 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f7990000000000000046 | 488.584 | 2.708 | n/a | 0.000 | 0.000 | 1.786 | 480.831 | 0.012 | n/a | 3.136 | 0.000 | n/a | n/a | 0.110 | 2.708 | 0.006 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f799000000000000005b | 483.038 | 4.084 | n/a | 0.262 | 0.000 | 0.868 | 477.096 | 0.049 | n/a | 0.134 | 0.000 | n/a | n/a | 0.544 | 4.347 | 0.009 | 0.544 | gw-r/thread-44/journal/page | none observed |
| 71e367559112f7990000000000000053 | 480.461 | 12.350 | n/a | 0.768 | 0.000 | 0.763 | 466.309 | 0.018 | n/a | 0.090 | 0.000 | n/a | n/a | 0.164 | 13.118 | 0.027 | 0.164 | gw-r/thread-57/journal/page | none observed |

## P3 / L4 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 356.449 | n/a | n/a | n/a | 2.536 | n/a | 0.000 | 0.000 | 0.957 | 347.824 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.070 | 2.810 | 0.011 | 0.070 |
| p99 | 1019.772 | n/a | n/a | n/a | 12.575 | n/a | 5.430 | 0.000 | 6.553 | 1016.065 | 1.749 | n/a | 0.115 | 0.000 | n/a | n/a | 46.508 | 13.693 | 0.221 | 46.508 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71e367559112f79900000000000000ae | 1019.772 | 2.619 | n/a | 0.000 | 0.000 | 0.985 | 1016.065 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.056 | 2.619 | 0.003 | 0.056 | gw-r/thread-40/journal/page | none observed |
| 71e367559112f7990000000000000089 | 1005.580 | 0.116 | n/a | 0.000 | 0.000 | 2.572 | 1001.157 | 0.016 | n/a | 0.115 | 0.000 | n/a | n/a | 1.604 | 0.116 | 0.000 | 1.604 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f79900000000000000a1 | 1004.508 | 0.133 | n/a | 0.000 | 0.000 | 0.957 | 1001.430 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 1.883 | 0.133 | 0.000 | 1.883 | gw-r/thread-47/journal/page | none observed |
| 71e367559112f7990000000000000092 | 1004.187 | 0.123 | n/a | 0.000 | 0.000 | 1.817 | 1001.016 | 0.016 | n/a | 0.112 | 0.000 | n/a | n/a | 1.102 | 0.123 | 0.000 | 1.102 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f79900000000000000a0 | 1003.442 | 6.156 | n/a | 0.000 | 0.000 | 0.869 | 996.254 | 0.017 | n/a | 0.076 | 0.000 | n/a | n/a | 0.070 | 6.156 | 0.006 | 0.070 | gw-r/thread-43/journal/page | none observed |
| 71e367559112f799000000000000009c | 981.656 | 2.117 | n/a | 0.000 | 0.000 | 0.853 | 978.476 | 0.045 | n/a | 0.097 | 0.000 | n/a | n/a | 0.069 | 2.117 | 0.002 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f7990000000000000086 | 909.309 | 1.983 | n/a | 0.000 | 0.000 | 0.647 | 906.574 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.057 | 1.983 | 0.002 | 0.057 | gw-r/thread-43/journal/page | none observed |
| 71e367559112f79900000000000000b7 | 899.753 | 4.610 | n/a | 0.000 | 0.000 | 5.045 | 889.924 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.101 | 4.610 | 0.005 | 0.101 | gw-r/thread-63/journal/page | none observed |
| 71e367559112f799000000000000009d | 823.775 | 3.897 | n/a | 0.000 | 0.000 | 3.795 | 815.928 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.071 | 3.897 | 0.005 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f7990000000000000083 | 758.775 | 2.097 | n/a | 0.287 | 0.000 | 0.563 | 755.646 | 0.021 | n/a | 0.102 | 0.000 | n/a | n/a | 0.059 | 2.384 | 0.003 | 0.059 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f79900000000000000ab | 747.283 | 2.334 | n/a | 0.000 | 0.000 | 2.783 | 742.021 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.064 | 2.334 | 0.003 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f7990000000000000094 | 710.102 | 1.985 | n/a | 0.000 | 0.000 | 1.528 | 706.433 | 0.018 | n/a | 0.080 | 0.000 | n/a | n/a | 0.058 | 1.985 | 0.003 | 0.058 | gw-r/thread-40/journal/page | none observed |
| 71e367559112f79900000000000000b8 | 697.821 | 6.131 | n/a | 0.000 | 0.000 | 0.716 | 690.713 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.164 | 6.131 | 0.009 | 0.164 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f79900000000000000be | 687.900 | 2.293 | n/a | 0.000 | 0.000 | 0.720 | 684.787 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.067 | 2.293 | 0.003 | 0.067 | gw-r/thread-57/journal/page | none observed |
| 71e367559112f79900000000000000b4 | 647.377 | 3.066 | n/a | 0.000 | 0.000 | 0.642 | 643.554 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.064 | 3.066 | 0.005 | 0.064 | gw-r/thread-63/journal/page | none observed |
| 71e367559112f79900000000000000aa | 634.104 | 3.622 | n/a | 5.430 | 0.000 | 2.539 | 622.327 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.106 | 9.052 | 0.014 | 0.106 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f79900000000000000af | 622.757 | 12.575 | n/a | 1.117 | 0.000 | 1.348 | 607.563 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 0.089 | 13.693 | 0.022 | 0.089 | gw-r/thread-40/journal/page | none observed |
| 71e367559112f799000000000000009b | 615.288 | 2.504 | n/a | 0.000 | 0.000 | 1.027 | 611.625 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.060 | 2.504 | 0.004 | 0.060 | gw-r/thread-40/journal/page | none observed |
| 71e367559112f79900000000000000a4 | 569.087 | 2.454 | n/a | 0.000 | 0.000 | 6.553 | 559.936 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.068 | 2.454 | 0.004 | 0.068 | gw-r/thread-63/journal/page | none observed |
| 71e367559112f7990000000000000099 | 392.493 | 9.473 | n/a | 0.587 | 0.000 | 1.125 | 381.143 | 0.015 | n/a | 0.082 | 0.000 | n/a | n/a | 0.068 | 10.061 | 0.026 | 0.068 | gw-r/thread-63/journal/page | none observed |

## P3 / L16 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 428.919 | n/a | n/a | n/a | 2.391 | n/a | 0.000 | 0.000 | 1.228 | 426.021 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.065 | 2.426 | 0.006 | 0.065 |
| p99 | 1006.057 | n/a | n/a | n/a | 8.070 | n/a | 2.368 | 0.000 | 19.499 | 1000.983 | 0.198 | n/a | 0.105 | 0.000 | n/a | n/a | 16.424 | 10.427 | 0.557 | 16.424 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71e367559112f79900000000000000fa | 1006.057 | 2.178 | n/a | 0.000 | 0.000 | 2.776 | 1000.983 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.063 | 2.178 | 0.002 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 71e367559112f79900000000000000f3 | 1003.376 | 0.117 | n/a | 0.000 | 0.000 | 1.367 | 1000.718 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 1.114 | 0.117 | 0.000 | 1.114 | gw-r/thread-66/journal/page | none observed |
| 71e367559112f79900000000000000da | 998.390 | 2.186 | n/a | 0.000 | 0.000 | 3.297 | 992.795 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.058 | 2.186 | 0.002 | 0.058 | gw-r/thread-75/journal/page | none observed |
| 71e367559112f79900000000000000ca | 997.198 | 2.532 | n/a | 0.000 | 0.000 | 12.084 | 982.431 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.062 | 2.532 | 0.003 | 0.062 | gw-r/thread-63/journal/page | none observed |
| 71e367559112f79900000000000000fb | 993.506 | 2.125 | n/a | 0.000 | 0.000 | 0.530 | 990.753 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.058 | 2.125 | 0.002 | 0.058 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f79900000000000000e3 | 967.522 | 2.391 | n/a | 0.000 | 0.000 | 1.550 | 963.032 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.496 | 2.391 | 0.002 | 0.496 | gw-r/thread-44/journal/page | none observed |
| 71e367559112f79900000000000000cb | 917.978 | 1.958 | n/a | 0.000 | 0.000 | 2.084 | 913.811 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.063 | 1.958 | 0.002 | 0.063 | gw-r/thread-40/journal/page | none observed |
| 71e367559112f79900000000000000e8 | 883.711 | 2.203 | n/a | 0.000 | 0.000 | 1.228 | 880.170 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 2.203 | 0.002 | 0.062 | gw-r/thread-40/journal/page | none observed |
| 71e367559112f79900000000000000d0 | 768.914 | 2.277 | n/a | 0.403 | 0.000 | 0.772 | 765.330 | 0.020 | n/a | 0.055 | 0.000 | n/a | n/a | 0.056 | 2.680 | 0.003 | 0.056 | gw-r/thread-63/journal/page | none observed |
| 71e367559112f79900000000000000ef | 708.557 | 2.180 | n/a | 0.000 | 0.000 | 0.489 | 705.783 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.066 | 2.180 | 0.003 | 0.066 | gw-r/thread-72/journal/page | none observed |
| 71e367559112f79900000000000000c5 | 640.252 | 1.763 | n/a | 0.000 | 0.000 | 0.685 | 637.673 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.068 | 1.763 | 0.003 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f79900000000000000db | 618.349 | 7.105 | n/a | 0.353 | 0.000 | 0.690 | 610.079 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.070 | 7.458 | 0.012 | 0.070 | gw-r/thread-66/journal/page | none observed |
| 71e367559112f79900000000000000e2 | 603.261 | 3.350 | n/a | 0.000 | 0.000 | 3.563 | 596.234 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.064 | 3.350 | 0.006 | 0.064 | gw-r/thread-40/journal/page | none observed |
| 71e367559112f79900000000000000fc | 576.281 | 3.750 | n/a | 0.000 | 0.000 | 3.909 | 568.434 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.127 | 3.750 | 0.007 | 0.127 | gw-r/thread-68/journal/page | none observed |
| 71e367559112f79900000000000000ec | 546.193 | 3.187 | n/a | 0.000 | 0.000 | 0.968 | 541.930 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.060 | 3.187 | 0.006 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 71e367559112f79900000000000000f8 | 539.885 | 4.890 | n/a | 0.000 | 0.000 | 1.257 | 533.590 | 0.021 | n/a | 0.059 | 0.000 | n/a | n/a | 0.068 | 4.890 | 0.009 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f79900000000000000f0 | 532.174 | 2.497 | n/a | 0.000 | 0.000 | 1.412 | 528.141 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.067 | 2.497 | 0.005 | 0.067 | gw-r/thread-72/journal/page | none observed |
| 71e367559112f79900000000000000e4 | 499.146 | 6.897 | n/a | 2.368 | 0.000 | 0.540 | 489.125 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.172 | 9.265 | 0.019 | 0.172 | gw-r/thread-66/journal/page | none observed |
| 71e367559112f79900000000000000e6 | 498.547 | 2.715 | n/a | 0.000 | 0.000 | 0.965 | 494.753 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.068 | 2.715 | 0.005 | 0.068 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f79900000000000000ea | 483.678 | 1.861 | n/a | 0.000 | 0.000 | 0.689 | 481.023 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.058 | 1.861 | 0.004 | 0.058 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / internal (3104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.494 | n/a | n/a | n/a | 4.168 | n/a | 0.000 | 0.000 | 0.233 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.988 | 4.189 | 0.337 | 5.988 |
| p99 | 850.848 | n/a | n/a | n/a | 18.285 | n/a | 1.326 | 0.000 | 1.674 | 845.323 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 47.133 | 19.122 | 0.846 | 47.133 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 71e367559112f799000000000000018b | 1005.918 | 2.364 | n/a | 0.000 | 0.000 | 0.484 | 1002.952 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.059 | 2.364 | 0.002 | 0.059 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f79900000000000000ff | 1005.737 | 2.154 | n/a | 0.000 | 0.000 | 0.443 | 1003.043 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.057 | 2.154 | 0.002 | 0.057 | gw-r/thread-43/journal/page | none observed |
| 71e367559112f799000000000000015d | 1005.513 | 0.161 | n/a | 0.000 | 0.000 | 3.554 | 1000.638 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 1.125 | 0.161 | 0.000 | 1.125 | gw-r/thread-66/journal/page | none observed |
| 71e367559112f7990000000000000172 | 1004.176 | 2.862 | n/a | 0.000 | 0.000 | 0.425 | 1000.792 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.061 | 2.862 | 0.003 | 0.061 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f7990000000000000198 | 1003.983 | 2.198 | n/a | 0.000 | 0.000 | 0.506 | 1001.169 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.064 | 2.198 | 0.002 | 0.064 | gw-r/thread-69/journal/page | none observed |
| 71e367559112f7990000000000000186 | 1002.824 | 0.189 | n/a | 0.000 | 0.000 | 0.924 | 1000.515 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.149 | 0.189 | 0.000 | 1.149 | gw-r/thread-73/journal/page | none observed |
| 71e367559112f7990000000000000136 | 1002.798 | 0.118 | n/a | 0.000 | 0.000 | 0.543 | 1000.967 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 1.091 | 0.118 | 0.000 | 1.091 | gw-r/thread-63/journal/page | none observed |
| 71e367559112f79900000000000019e8 | 1002.715 | 2.438 | n/a | 0.000 | 0.000 | 0.419 | 999.766 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.057 | 2.438 | 0.002 | 0.057 | gw-r/thread-47/journal/page | none observed |
| 71e367559112f7990000000000001a2f | 1002.535 | 0.104 | n/a | 0.000 | 0.000 | 1.039 | 1000.320 | 0.005 | n/a | 0.013 | 0.000 | n/a | n/a | 1.055 | 0.104 | 0.000 | 1.055 | gw-r/thread-73/journal/page | none observed |
| 71e367559112f79900000000000019e3 | 1002.464 | 0.112 | n/a | 0.000 | 0.000 | 0.307 | 1000.873 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 1.087 | 0.112 | 0.000 | 1.087 | gw-r/thread-68/journal/page | none observed |
| 71e367559112f7990000000000001a2b | 999.964 | 4.478 | n/a | 0.000 | 0.000 | 0.461 | 994.892 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.096 | 4.478 | 0.004 | 0.096 | gw-r/thread-68/journal/page | none observed |
| 71e367559112f7990000000000000185 | 999.100 | 3.039 | n/a | 0.000 | 0.000 | 0.439 | 995.503 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.059 | 3.039 | 0.003 | 0.059 | gw-r/thread-69/journal/page | none observed |
| 71e367559112f7990000000000000119 | 996.846 | 2.524 | n/a | 0.428 | 0.000 | 0.489 | 993.257 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.092 | 2.952 | 0.003 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 71e367559112f799000000000000011a | 995.526 | 2.209 | n/a | 0.000 | 0.000 | 0.653 | 992.552 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.051 | 2.209 | 0.002 | 0.051 | gw-r/thread-42/journal/page | none observed |
| 71e367559112f799000000000000018c | 991.401 | 3.309 | n/a | 0.000 | 0.000 | 0.786 | 987.198 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.059 | 3.309 | 0.003 | 0.059 | gw-r/thread-70/journal/page | none observed |
| 71e367559112f799000000000000010e | 990.543 | 2.124 | n/a | 0.000 | 0.000 | 0.571 | 987.754 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.051 | 2.124 | 0.002 | 0.051 | gw-r/thread-73/journal/page | none observed |
| 71e367559112f7990000000000000110 | 947.280 | 5.220 | n/a | 0.000 | 0.000 | 0.534 | 941.392 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.094 | 5.220 | 0.006 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 71e367559112f799000000000000018d | 941.976 | 1.745 | n/a | 0.000 | 0.000 | 0.439 | 939.710 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.055 | 1.745 | 0.002 | 0.055 | gw-r/thread-66/journal/page | none observed |
| 71e367559112f79900000000000019e5 | 940.484 | 11.885 | n/a | 1.022 | 0.000 | 0.613 | 926.557 | 0.004 | n/a | 0.012 | 0.000 | n/a | n/a | 0.392 | 12.906 | 0.014 | 0.392 | gw-r/thread-46/journal/page | none observed |
| 71e367559112f7990000000000001a05 | 928.045 | 2.203 | n/a | 0.000 | 0.000 | 0.724 | 925.039 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.054 | 2.203 | 0.002 | 0.054 | gw-r/thread-68/journal/page | none observed |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.144 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.713 | 200.581 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 |
| p99 | 206.371 | n/a | n/a | n/a | 19.515 | n/a | 1.611 | 0.000 | 6.921 | 204.191 | 0.050 | n/a | 0.173 | 0.000 | n/a | n/a | 48.350 | 21.126 | 0.380 | 48.350 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cf9fc10b6d45ecef0000000000000007 | 206.371 | 0.000 | n/a | 0.000 | 0.000 | 1.713 | 204.191 | 0.050 | n/a | 0.089 | 0.000 | n/a | n/a | 0.327 | 0.000 | 0.000 | 0.327 | gw-r/thread-42/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000005 | 205.237 | 0.000 | n/a | 0.000 | 0.000 | 3.141 | 201.676 | 0.023 | n/a | 0.173 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000006 | 203.384 | 0.000 | n/a | 0.000 | 0.000 | 1.976 | 201.057 | 0.013 | n/a | 0.126 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-44/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000f24 | 201.336 | 0.000 | n/a | 0.000 | 0.000 | 0.448 | 200.771 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.063 | 0.000 | 0.000 | 0.063 | gw-r/thread-76/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000f23 | 201.312 | 0.000 | n/a | 0.000 | 0.000 | 0.474 | 200.699 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-67/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000f22 | 201.144 | 0.000 | n/a | 0.000 | 0.000 | 0.449 | 200.581 | 0.015 | n/a | 0.031 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | gw-r/thread-46/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000f27 | 81.916 | 16.413 | n/a | 0.000 | 0.000 | 3.102 | 62.142 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.252 | 16.413 | 0.200 | 0.252 | gw-r/thread-72/gateway.admitted-work | none observed |
| cf9fc10b6d45ecef0000000000000f28 | 60.840 | 18.917 | n/a | 0.000 | 0.000 | 6.921 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.002 | 18.917 | 0.311 | 35.002 | node-14/thread-8/socket.wait-first-byte | none observed |
| cf9fc10b6d45ecef0000000000000f29 | 55.639 | 19.515 | n/a | 1.611 | 0.000 | 5.521 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.993 | 21.126 | 0.380 | 28.993 | node-14/thread-8/socket.wait-first-byte | none observed |
| 71e367559112f7990000000000000002 | 49.524 | 0.000 | n/a | 0.000 | 0.000 | 1.174 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.350 | 0.000 | 0.000 | 48.350 | node-14/thread-3/socket.wait-first-byte | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.801 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.376 | 201.029 | 0.014 | n/a | 0.137 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 207.696 | n/a | n/a | n/a | 0.567 | n/a | 0.000 | 0.000 | 8.778 | 206.198 | 5.930 | n/a | 5.059 | 0.000 | n/a | n/a | 0.354 | 0.567 | 0.003 | 0.354 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cf9fc10b6d45ecef0000000000000022 | 207.696 | 0.000 | n/a | 0.000 | 0.000 | 3.510 | 203.859 | 0.024 | n/a | 0.187 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| cf9fc10b6d45ecef000000000000002a | 207.430 | 0.000 | n/a | 0.000 | 0.000 | 0.973 | 206.198 | 0.011 | n/a | 0.137 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000057 | 207.206 | 0.000 | n/a | 0.000 | 0.000 | 1.148 | 200.867 | 0.036 | n/a | 5.059 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000050 | 207.039 | 0.000 | n/a | 0.000 | 0.000 | 5.472 | 201.237 | 0.018 | n/a | 0.164 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000056 | 206.946 | 0.000 | n/a | 0.000 | 0.000 | 1.469 | 205.179 | 0.017 | n/a | 0.159 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef000000000000000b | 206.524 | 0.000 | n/a | 0.000 | 0.000 | 1.066 | 205.215 | 0.014 | n/a | 0.113 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000023 | 206.490 | 0.000 | n/a | 0.000 | 0.000 | 3.869 | 201.264 | 1.065 | n/a | 0.191 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-63/journal/page | none observed |
| cf9fc10b6d45ecef000000000000003b | 206.284 | 0.000 | n/a | 0.000 | 0.000 | 2.513 | 203.525 | 0.021 | n/a | 0.126 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| cf9fc10b6d45ecef000000000000000f | 205.602 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 204.418 | 0.046 | n/a | 0.183 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000012 | 205.349 | 0.000 | n/a | 0.000 | 0.000 | 2.584 | 202.484 | 0.012 | n/a | 0.148 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef000000000000004c | 205.220 | 0.000 | n/a | 0.000 | 0.000 | 3.596 | 201.326 | 0.018 | n/a | 0.182 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef000000000000001a | 205.028 | 0.000 | n/a | 0.000 | 0.000 | 3.837 | 200.887 | 0.013 | n/a | 0.133 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000013 | 204.678 | 0.000 | n/a | 0.000 | 0.000 | 1.827 | 202.602 | 0.011 | n/a | 0.140 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000046 | 204.547 | 0.000 | n/a | 0.000 | 0.000 | 2.944 | 201.314 | 0.025 | n/a | 0.164 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef000000000000000e | 204.313 | 0.000 | n/a | 0.000 | 0.000 | 1.489 | 201.005 | 1.543 | n/a | 0.133 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000047 | 204.236 | 0.000 | n/a | 0.000 | 0.000 | 2.200 | 201.763 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-44/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000058 | 204.062 | 0.000 | n/a | 0.000 | 0.000 | 2.996 | 200.775 | 0.012 | n/a | 0.113 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-63/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000009 | 203.970 | 0.000 | n/a | 0.000 | 0.000 | 2.675 | 200.857 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef000000000000003f | 203.953 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 202.769 | 0.016 | n/a | 0.145 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-42/journal/page | none observed |
| cf9fc10b6d45ecef000000000000002d | 203.657 | 0.000 | n/a | 0.000 | 0.000 | 1.853 | 201.495 | 0.019 | n/a | 0.143 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-40/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.038 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 200.899 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 214.063 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.361 | 212.508 | 26.867 | n/a | 0.352 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cf9fc10b6d45ecef0000000000000079 | 214.063 | 0.000 | n/a | 0.000 | 0.000 | 1.310 | 212.508 | 0.028 | n/a | 0.120 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-63/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000099 | 209.614 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 208.309 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000090 | 208.866 | 0.000 | n/a | 0.000 | 0.000 | 1.148 | 207.412 | 0.073 | n/a | 0.113 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000088 | 208.649 | 0.000 | n/a | 0.000 | 0.000 | 4.361 | 204.012 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000082 | 207.258 | 0.000 | n/a | 0.000 | 0.000 | 0.756 | 206.260 | 0.026 | n/a | 0.111 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef000000000000006c | 206.626 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 205.150 | 0.012 | n/a | 0.124 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-46/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000b0 | 205.378 | 0.000 | n/a | 0.000 | 0.000 | 4.009 | 201.102 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000a8 | 205.239 | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 204.297 | 0.045 | n/a | 0.140 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000bd | 204.957 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 203.864 | 0.020 | n/a | 0.130 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef000000000000005e | 204.951 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 204.058 | 0.013 | n/a | 0.130 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-63/journal/page | none observed |
| cf9fc10b6d45ecef000000000000009a | 204.352 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 203.030 | 0.023 | n/a | 0.212 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000062 | 204.189 | 0.000 | n/a | 0.000 | 0.000 | 3.101 | 200.812 | 0.014 | n/a | 0.114 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-46/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000aa | 204.150 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 201.231 | 2.021 | n/a | 0.040 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000086 | 204.108 | 0.000 | n/a | 0.000 | 0.000 | 2.150 | 201.752 | 0.013 | n/a | 0.097 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef000000000000007a | 204.082 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 202.928 | 0.020 | n/a | 0.153 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-42/journal/page | none observed |
| cf9fc10b6d45ecef000000000000006d | 204.002 | 0.000 | n/a | 0.000 | 0.000 | 2.115 | 201.574 | 0.016 | n/a | 0.140 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000081 | 203.886 | 0.000 | n/a | 0.000 | 0.000 | 1.917 | 201.705 | 0.018 | n/a | 0.155 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000071 | 203.693 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 202.508 | 0.018 | n/a | 0.127 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000b7 | 203.626 | 0.000 | n/a | 0.000 | 0.000 | 2.036 | 201.322 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef000000000000005b | 203.439 | 0.000 | n/a | 0.000 | 0.000 | 0.440 | 202.807 | 0.015 | n/a | 0.082 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-42/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.023 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 200.918 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 |
| p99 | 212.734 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.110 | 208.462 | 25.796 | n/a | 5.934 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cf9fc10b6d45ecef00000000000000f9 | 212.734 | 0.000 | n/a | 0.000 | 0.000 | 3.981 | 208.462 | 0.046 | n/a | 0.148 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-42/journal/page | none observed |
| cf9fc10b6d45ecef000000000000011e | 212.181 | 0.000 | n/a | 0.000 | 0.000 | 4.174 | 207.829 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000d2 | 210.385 | 0.000 | n/a | 0.000 | 0.000 | 9.110 | 201.061 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-63/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000c7 | 209.574 | 0.000 | n/a | 0.000 | 0.000 | 2.205 | 207.043 | 0.020 | n/a | 0.150 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef000000000000012a | 208.066 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 201.130 | 0.004 | n/a | 5.934 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000e0 | 207.541 | 0.000 | n/a | 0.000 | 0.000 | 6.358 | 200.948 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000ca | 206.887 | 0.000 | n/a | 0.000 | 0.000 | 5.861 | 200.808 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000de | 205.482 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 204.622 | 0.016 | n/a | 0.112 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-63/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000fd | 204.778 | 0.000 | n/a | 0.000 | 0.000 | 1.212 | 203.330 | 0.011 | n/a | 0.131 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000d3 | 204.655 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 203.454 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000124 | 204.589 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 203.575 | 0.025 | n/a | 0.102 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef000000000000010d | 204.490 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 203.414 | 0.013 | n/a | 0.128 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-46/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000105 | 204.233 | 0.000 | n/a | 0.000 | 0.000 | 2.698 | 201.307 | 0.015 | n/a | 0.105 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| cf9fc10b6d45ecef000000000000010a | 204.196 | 0.000 | n/a | 0.000 | 0.000 | 2.012 | 201.067 | 0.932 | n/a | 0.084 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-43/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000115 | 203.896 | 0.000 | n/a | 0.000 | 0.000 | 2.547 | 201.094 | 0.007 | n/a | 0.086 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-44/journal/page | none observed |
| cf9fc10b6d45ecef000000000000010b | 203.724 | 0.000 | n/a | 0.000 | 0.000 | 1.335 | 202.105 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000ef | 203.720 | 0.000 | n/a | 0.000 | 0.000 | 1.247 | 201.166 | 0.437 | n/a | 0.758 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000111 | 203.708 | 0.000 | n/a | 0.000 | 0.000 | 2.278 | 201.088 | 0.042 | n/a | 0.131 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-43/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000104 | 203.460 | 0.000 | n/a | 0.000 | 0.000 | 2.311 | 200.977 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef00000000000000f0 | 203.122 | 0.000 | n/a | 0.000 | 0.000 | 1.224 | 201.595 | 0.011 | n/a | 0.157 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-57/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.871 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 200.843 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 209.025 | n/a | n/a | n/a | 0.721 | n/a | 0.000 | 0.000 | 11.987 | 208.130 | 22.559 | n/a | 0.111 | 0.000 | n/a | n/a | 3.593 | 0.721 | 0.008 | 3.593 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cf9fc10b6d45ecef000000000000013d | 209.025 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 208.130 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000164 | 208.457 | 0.000 | n/a | 0.000 | 0.000 | 2.458 | 205.831 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-67/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000157 | 208.179 | 0.000 | n/a | 0.000 | 0.000 | 6.735 | 201.233 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-69/journal/page | none observed |
| cf9fc10b6d45ecef000000000000015a | 205.273 | 0.000 | n/a | 0.000 | 0.000 | 1.033 | 204.005 | 0.006 | n/a | 0.104 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-71/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000165 | 205.270 | 0.000 | n/a | 0.000 | 0.000 | 3.859 | 201.136 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-69/journal/page | none observed |
| cf9fc10b6d45ecef000000000000017d | 205.079 | 0.000 | n/a | 0.000 | 0.000 | 3.626 | 201.228 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-63/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000162 | 205.035 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 204.023 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| cf9fc10b6d45ecef000000000000018a | 204.948 | 0.000 | n/a | 0.000 | 0.000 | 1.320 | 203.438 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-66/journal/page | none observed |
| cf9fc10b6d45ecef000000000000017c | 204.232 | 0.000 | n/a | 0.000 | 0.000 | 3.125 | 200.938 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-75/journal/page | none observed |
| cf9fc10b6d45ecef000000000000013f | 204.020 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 202.816 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-43/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000151 | 204.017 | 0.000 | n/a | 0.000 | 0.000 | 2.384 | 201.394 | 0.049 | n/a | 0.094 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-65/journal/page | none observed |
| cf9fc10b6d45ecef000000000000018d | 203.915 | 0.000 | n/a | 0.000 | 0.000 | 2.931 | 200.774 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-71/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000138 | 203.889 | 0.000 | n/a | 0.000 | 0.000 | 2.242 | 201.466 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-43/journal/page | none observed |
| cf9fc10b6d45ecef000000000000017f | 203.846 | 0.000 | n/a | 0.000 | 0.000 | 2.588 | 201.031 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-69/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000174 | 203.808 | 0.000 | n/a | 0.000 | 0.000 | 2.637 | 200.943 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-73/journal/page | none observed |
| cf9fc10b6d45ecef000000000000016b | 203.537 | 0.000 | n/a | 0.000 | 0.000 | 2.426 | 200.892 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |
| cf9fc10b6d45ecef000000000000012e | 203.524 | 0.000 | n/a | 0.000 | 0.000 | 2.487 | 200.750 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-63/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000176 | 203.289 | 0.000 | n/a | 0.000 | 0.000 | 0.417 | 202.709 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-70/journal/page | none observed |
| cf9fc10b6d45ecef000000000000018c | 202.992 | 0.000 | n/a | 0.000 | 0.000 | 1.559 | 201.212 | 0.019 | n/a | 0.080 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-70/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000130 | 202.780 | 0.000 | n/a | 0.000 | 0.000 | 1.390 | 201.141 | 0.048 | n/a | 0.111 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-57/journal/page | none observed |

## P3 / tail / read (500 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 171.582 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.532 | 170.984 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 205.044 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.549 | 203.952 | 4.178 | n/a | 0.115 | 0.000 | n/a | n/a | 0.308 | 0.000 | 0.000 | 0.308 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cf9fc10b6d45ecef0000000000000ebf | 218.889 | 0.000 | n/a | 0.000 | 0.000 | 18.261 | 200.509 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-42/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000194 | 206.324 | 0.000 | n/a | 0.000 | 0.000 | 3.295 | 202.855 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef000000000000023a | 206.156 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 204.895 | 0.013 | n/a | 0.142 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef00000000000001bd | 206.112 | 0.000 | n/a | 0.000 | 0.000 | 4.779 | 201.123 | 0.006 | n/a | 0.086 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-43/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000f0a | 205.450 | 0.000 | n/a | 0.000 | 0.000 | 0.228 | 205.105 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-40/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000244 | 205.044 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 204.075 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-72/journal/page | none observed |
| cf9fc10b6d45ecef00000000000001ad | 205.036 | 0.000 | n/a | 0.000 | 0.000 | 0.442 | 204.434 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef000000000000022c | 204.804 | 0.000 | n/a | 0.000 | 0.000 | 0.503 | 204.132 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| cf9fc10b6d45ecef00000000000001d4 | 204.778 | 0.000 | n/a | 0.000 | 0.000 | 3.549 | 201.067 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-69/journal/page | none observed |
| cf9fc10b6d45ecef000000000000021e | 204.619 | 0.000 | n/a | 0.000 | 0.000 | 3.552 | 200.893 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-73/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000240 | 204.607 | 0.000 | n/a | 0.000 | 0.000 | 0.694 | 203.627 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-63/journal/page | none observed |
| cf9fc10b6d45ecef00000000000001d7 | 204.575 | 0.000 | n/a | 0.000 | 0.000 | 0.433 | 203.952 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| cf9fc10b6d45ecef00000000000001b0 | 204.224 | 0.000 | n/a | 0.000 | 0.000 | 3.451 | 200.553 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-65/journal/page | none observed |
| cf9fc10b6d45ecef000000000000026e | 203.935 | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 202.712 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000256 | 203.914 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 202.869 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-57/journal/page | none observed |
| cf9fc10b6d45ecef00000000000001d5 | 203.641 | 0.000 | n/a | 0.000 | 0.000 | 1.213 | 202.259 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-73/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000196 | 203.537 | 0.000 | n/a | 0.000 | 0.000 | 2.253 | 201.090 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-74/journal/page | none observed |
| cf9fc10b6d45ecef00000000000001d2 | 203.462 | 0.000 | n/a | 0.000 | 0.000 | 2.669 | 200.661 | 0.013 | n/a | 0.041 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-74/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000210 | 203.117 | 0.000 | n/a | 0.000 | 0.000 | 1.248 | 201.588 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-42/journal/page | none observed |
| cf9fc10b6d45ecef0000000000000223 | 202.959 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 201.805 | 0.011 | n/a | 0.132 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-65/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

## Writer heap, GC and scheduler stalls

Source 033e438673ec231de375d841f8c5a0addd9c9ec6; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 119.126 / 482.949 |
| GC events / total duration / maximum ms | 1943 / 1901.764 / 14.644 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":1925,"4":9,"8":9} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 45.510 / 26 / 1805.249 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
